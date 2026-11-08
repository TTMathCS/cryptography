# 20. Where Cryptanalysis Goes

*Nineteen chapters have taken ciphers apart one family at a time. This last
chapter looks forward and outward. It says what is still unknown about the
algorithms the world now depends on (AES, SHA-2 and SHA-3, the lattice schemes,
the isogeny schemes that survived SIKE), how much margin each has, and what
would have to happen for that margin to shrink. It explains how breaks reach the
public without hurting the people who rely on the broken thing: coordinated
disclosure, CVE numbers, embargoes, the open competitions that chose AES, SHA-3
and Ascon, and the mailing list where post-quantum schemes are attacked in
public. It gives an honest account of what machine learning has and has not done
for cryptanalysis, of the solvers and provers that now find attacks by machine,
and of the money on both sides. It ends with how to read a headline that says
something is "broken", and how to become someone who writes such papers. You will
build a small distinguisher for the cipher Speck that counts biased bits, see
where counting stops working and a neural network took over, and print a table of
security margins for the primitives in use today.*

!!! abstract "In this chapter"
    **You will learn:**

    - how to read a headline about a break, using the measures of
      [Chapter 1](01-What-Cryptanalysis-Is.md);
    - how breaks of products are disclosed (coordinated disclosure, CVEs,
      embargoes) and how breaks of algorithms are found in open competitions:
      AES, eSTREAM, SHA-3, CAESAR, the NIST post-quantum process and the
      lightweight competition that chose Ascon;
    - what Gohr's 2019 neural distinguisher for Speck did, what it did not do,
      and what machine learning has added to cryptanalysis since;
    - how SAT and MILP solvers search for differential and linear trails, how
      Tamarin and ProVerif search for protocol attacks, and how lattice
      estimators turn attacks into parameters;
    - what attacks cost and who pays: bug bounties, exploit prices, national
      budgets, and what the Snowden documents did and did not show;
    - the open problems: AES's margin, SHA-2's and SHA-3's, the dual attack on
      lattices, isogenies after SIKE, the gap between proofs and attacks, and
      quantum timelines with the harvest-now, decrypt-later risk;
    - how to become a cryptanalyst: a reading list by level, the classic papers,
      the conferences and the challenges you can try.

    **You need:** [Chapter 1](01-What-Cryptanalysis-Is.md) (attack models, the
    three costs, academic and practical breaks). The rest of this book helps but
    is not required; each topic links back to the chapter that teaches it.

    **Levels:** §20.1 and §20.2 are for beginners, §20.3 to §20.7 are
    intermediate, §20.8 to §20.10 are expert, §20.11 and §20.12 are for
    everyone, and §20.13 is expert.

## 20.1 The problem

*Level: beginner.*

Every chapter of this book has told the same kind of story. Someone built a
cipher, a hash, a signature scheme or a protocol and said it was secure. Someone
else looked at it from the attacker's side, found the structure that leaked, and
measured how much the leak was worth. Sometimes the leak was fatal at once, as
for Enigma's missing self-encryptions
([Chapter 3](03-Machines-and-the-War.md)) or WEP's keys
([Chapter 8](08-Attacks-on-Stream-Ciphers.md)). Sometimes it took decades to go
from a crack on paper to a forged certificate, as for MD5 and SHA-1
([Chapter 9](09-Breaking-Hash-Functions.md)). Sometimes the leak was never in
the mathematics at all but in a padding check
([Chapter 10](10-Attacks-on-Modes-and-MACs.md)), a nonce
([Chapter 14](14-Attacks-on-Signatures-and-Nonces.md)), a power trace
([Chapter 17](17-Side-Channels-the-Attackers-View.md)) or a random number
generator ([Chapter 18](18-Random-Numbers-Gone-Wrong.md)).

That leaves three questions this chapter tries to answer.

The first is **what is left to break**. The algorithms the world uses in 2026
are few: AES, ChaCha20, SHA-2, SHA-3, Ascon, X25519 and the NIST curves, RSA, and
the new post-quantum standards ML-KEM, ML-DSA and SLH-DSA (FIPS 203, FIPS 204 and
FIPS 205). Each has survived years of public attack. But "survived" is a
statement about the attacks that have been found so far, not a proof. For each
algorithm there is a measurable **security margin**, the distance between the
best attack and the full algorithm, and an honest list of the results that would
shrink it. Those lists are the open problems of the field.

The second is **how breaks reach the world**. A break of a public algorithm is
published as a paper. A break of a product is a weapon until it is fixed, and
the research community has built rules for handling it: private reports to the
vendor, deadlines, identification numbers, embargoes. For algorithms not yet
deployed, the community has built something better: open competitions in which
designers submit and everyone else attacks, so that the breaking happens before
the algorithm is in billions of devices. The competitions are why the
cryptography of 2026 is much stronger than the cryptography of 1996.

The third is **where the craft itself is going**. New tools have arrived. SAT
and integer-programming solvers now search for the differential and linear
trails of [Chapter 5](05-Differential-Cryptanalysis.md) and
[Chapter 6](06-Linear-Cryptanalysis.md) faster and more completely than people
can. Protocol provers find the interleaving attacks of
[Chapter 19](19-Protocol-Breaks.md) mechanically. Lattice estimators turn
[Chapter 15](15-Lattices-as-a-Weapon.md)'s attacks into the parameters of the
post-quantum standards. And machine learning has arrived with large claims and,
so far, smaller results that this chapter tries to state exactly.

Along the way there is a fourth, practical question: what should you, a reader of
headlines or a builder of systems, do with all this? The short answer, which the
rest of the chapter earns, is that breaks of good modern algorithms are rare and
usually academic, that breaks of implementations and protocols are common and
usually practical, and that the most valuable habit is reading a claim as an
attacker would, by asking for the model, the cost and the evidence.

## 20.2 How to read a headline

*Level: beginner.*

Every few months a newspaper, a press release or a social media post says that
some piece of cryptography has been "broken" or "cracked". Some of these stories
are true and urgent. Most are true but not urgent. A few are false. The tools to
tell them apart were all set out in [Chapter 1](01-What-Cryptanalysis-Is.md): the
attack model (§1.3), the three costs of time, data and memory (§1.4), and the
difference between academic and practical breaks (§1.5). This section turns them
into a checklist.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="A checklist for reading a headline about a cryptographic break: six questions in boxes, from what was attacked to what a user should do, with arrows between them" fill="currentColor" font-size="14">
<rect x="20" y="20" width="280" height="50" fill="none" stroke="currentColor"/>
<text x="160" y="42" text-anchor="middle">1. What was attacked?</text>
<text x="160" y="60" text-anchor="middle" font-size="12">algorithm, parameters, code, protocol, deployment</text>
<rect x="340" y="20" width="280" height="50" fill="none" stroke="currentColor"/>
<text x="480" y="42" text-anchor="middle">2. Full or reduced?</text>
<text x="480" y="60" text-anchor="middle" font-size="12">all rounds, all steps, real parameter set</text>
<rect x="20" y="120" width="280" height="50" fill="none" stroke="currentColor"/>
<text x="160" y="142" text-anchor="middle">3. Which attack model?</text>
<text x="160" y="160" text-anchor="middle" font-size="12">known, chosen, related key, side channel</text>
<rect x="340" y="120" width="280" height="50" fill="none" stroke="currentColor"/>
<text x="480" y="142" text-anchor="middle">4. What does it cost?</text>
<text x="480" y="160" text-anchor="middle" font-size="12">time, data, memory, against the generic attack</text>
<rect x="20" y="220" width="280" height="50" fill="none" stroke="currentColor"/>
<text x="160" y="242" text-anchor="middle">5. Where is the evidence?</text>
<text x="160" y="260" text-anchor="middle" font-size="12">a key, a collision, code; who has checked it</text>
<rect x="340" y="220" width="280" height="50" fill="none" stroke="currentColor"/>
<text x="480" y="242" text-anchor="middle">6. What should a user do?</text>
<text x="480" y="260" text-anchor="middle" font-size="12">nothing, patch, plan, or migrate now</text>
<line x1="300" y1="45" x2="335" y2="45" stroke="currentColor"/>
<polygon points="335,40 340,45 335,50"/>
<line x1="480" y1="70" x2="160" y2="115" stroke="currentColor"/>
<polygon points="163,110 160,118 168,116"/>
<line x1="300" y1="145" x2="335" y2="145" stroke="currentColor"/>
<polygon points="335,140 340,145 335,150"/>
<line x1="480" y1="170" x2="160" y2="215" stroke="currentColor"/>
<polygon points="163,210 160,218 168,216"/>
<line x1="300" y1="245" x2="335" y2="245" stroke="currentColor"/>
<polygon points="335,240 340,245 335,250"/>
<text x="320" y="310" text-anchor="middle" font-size="12" opacity="0.7">Most headlines are answered by question 1 or question 4.</text>
</svg>
<figcaption>Figure 20.1. Six questions to ask of any "broken" headline. Each one comes from a section of Chapter 1.</figcaption>
</figure>

### Question 1: what was attacked?

A cryptographic system has layers, and a break of one layer is not a break of
the others. The **algorithm** (AES, RSA, ML-KEM) is the mathematics. A
**parameter set** is one size of it (AES-128, RSA-1024, Kyber-512). An
**implementation** is the code or the chip, and it can leak through timing, power
or faults. A **protocol** (TLS, Signal, WPA2) puts algorithms together, and can
be broken while every algorithm in it is sound. A **deployment** is a protocol as
one company ran it, with its own keys, configuration and mistakes.

Headlines blur these layers all the time. "Kyber broken" in 2024 meant KyberSlash,
a timing leak in several implementations' division instruction
([Chapter 16](16-Breaking-Post-Quantum-Candidates.md)), fixed by changing a few
lines of code; the algorithm was untouched. "WPA2 broken" in 2017 meant KRACK, a
flaw in the protocol's handshake state machine
([Chapter 19](19-Protocol-Breaks.md)); AES was untouched. The first question
almost always shrinks the story.

### Question 2: full or reduced?

Academic papers on symmetric ciphers and hashes usually attack **reduced-round
versions**: AES with 7 of its 10 rounds, SHA-256 with 31 of its 64 steps. That is
not a trick; reduced versions are how the field measures margins (§20.8). But a
headline that says "researchers break AES" about a 7-round attack has dropped the
most important word. Ask whether the attack is on the cipher as it is used.

### Question 3: which model?

An attack that needs related keys, as the attacks on full AES-192 and AES-256 do
([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)), applies only
where an attacker can make a system encrypt under keys with chosen differences.
Proper protocols never do that. An attack that needs a power probe on the chip
applies to smart cards, not to a server in a locked building. The model tells you
who could actually run the attack.

### Question 4: what does it cost?

Every attack has a time, a data and a memory cost, and a success probability.
Compare them with the generic attack for the same goal: exhaustive search for a
key, the birthday bound for a collision
([Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)). In 2011 the biclique
attack "broke" full AES-128 at a cost of about $2^{126.1}$ operations, about four
times faster than brute force. That is a real result and a real break in the
academic sense, and it changes nothing for any user: $2^{126}$ is as far out of
reach as $2^{128}$. In 2005, Wang, Yin and Yu's attack put a SHA-1 collision at
about $2^{69}$ operations instead of $2^{80}$. That was academic too, but it was
a warning, because $2^{69}$ was within reach of a determined, well-funded team and
attacks only improve. The collision arrived in 2017 at about $2^{63.1}$
(SHAttered), and a chosen-prefix collision in 2020 for about \$45,000 of rented
computing. The lesson from §1.5 holds: academic breaks matter as measurements of
the margin, and a margin that has started shrinking keeps shrinking.

### Question 5: where is the evidence?

A recovered key, two colliding files or a forged signature settles a claim. An
estimate does not, until others check it. Three cases show the range.

In March 2021 Claus Peter Schnorr posted a factoring method whose abstract said
that it "destroys the RSA cryptosystem". People who ran the method found that it
did nothing of the kind, as [Chapter 1](01-What-Cryptanalysis-Is.md) tells.
In December 2022 a group of researchers in China posted a paper suggesting that
a combination of Schnorr's lattice method and a quantum optimization algorithm
could factor RSA-2048 with 372 qubits. Its experiments had factored a 48-bit
number; the paper itself did not estimate the running time for 2048 bits, and
other researchers argued that the method would not scale at all. In April 2024
Yilei Chen posted a quantum algorithm for the learning-with-errors problem that,
if correct, would have threatened lattice cryptography; within about nine days
he found a bug himself, with help from other researchers, and withdrew the
claim. All three were serious people, all three claims were checked in public,
and the checking worked.

The opposite case is the claim that arrives with evidence. On 30 July 2022
Wouter Castryck and Thomas Decru posted their attack on SIKE to the Cryptology
ePrint Archive together with code that recovered a SIKEp434 key in about an
hour. Within days others had reproduced it and rewritten it in other languages.
No one needed to take anything on trust.

### Question 6: what should a user do?

Usually nothing, or "keep patching". For a practical break of an implementation
or a protocol, update the software. For a practical break of an algorithm (MD5
and SHA-1 collisions, RC4 biases, DES key search) stop using it, as fast as the
system allows. For an academic break that has started a trend, plan the
migration before it is urgent. For quantum computing headlines the answer is
§20.10: the risk to long-lived secrets is real now, whatever any one machine can
do.

!!! tip "Two quick tests"
    If the article does not name the paper, find it on the Cryptology ePrint
    Archive or the conference program and read the abstract and the complexity
    table; it usually takes five minutes. If the claimed cost is stated as a
    number of qubits, operations or dollars, compare it with the generic attack and
    with the best previous attack. A break that is a thousand times better than
    last year's is news; a break that is four times better than brute force is a
    result for specialists.

## 20.3 How breaks are disclosed

*Level: intermediate.*

[Chapter 1](01-What-Cryptanalysis-Is.md) (§1.9) described where attacks are
published and what a good attack paper contains. This section follows a break
of a deployed product from discovery to publication, because that path is where
most of the harm, or most of the protection, happens.

### Two kinds of break, two kinds of disclosure

A break of a **public algorithm** has no single owner to warn. SIKE's designers
did not run SIKE anywhere; Rainbow was a candidate, not a product. Such attacks
go straight to a preprint server, a mailing list or a conference, and that is
the right thing to do: the faster the community knows, the less likely anyone is
to deploy the broken scheme. The same is true of most reduced-round and
theoretical results.

A break of a **product or a deployed protocol** is different. If a researcher
publishes a working attack on a version of OpenSSL that half the Internet runs,
criminals can use it before administrators can patch. The practice that grew up
in the 2000s and 2010s is **coordinated disclosure** (the older name is
"responsible disclosure"): tell the vendor privately, give them time to fix the
problem, and publish when the fix is out or the deadline passes.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A timeline of coordinated disclosure: discovery, private report to the vendor, CVE number reserved, embargoed fixes shared with distributors, patch released, public paper and talk, usually within about 90 days" fill="currentColor" font-size="14">
<line x1="40" y1="110" x2="610" y2="110" stroke="currentColor"/>
<polygon points="610,105 620,110 610,115"/>
<circle cx="60" cy="110" r="6"/>
<text x="60" y="90" text-anchor="middle">find</text>
<circle cx="150" cy="110" r="6"/>
<text x="150" y="90" text-anchor="middle">report</text>
<text x="150" y="140" text-anchor="middle" font-size="12">to vendor</text>
<circle cx="250" cy="110" r="6"/>
<text x="250" y="90" text-anchor="middle">CVE</text>
<text x="250" y="140" text-anchor="middle" font-size="12">number reserved</text>
<rect x="290" y="95" width="200" height="30" fill="currentColor" opacity="0.15"/>
<text x="390" y="90" text-anchor="middle">embargo</text>
<text x="390" y="140" text-anchor="middle" font-size="12">fixes shared quietly</text>
<circle cx="500" cy="110" r="6"/>
<text x="500" y="90" text-anchor="middle">patch</text>
<circle cx="580" cy="110" r="6"/>
<text x="580" y="90" text-anchor="middle">paper</text>
<text x="580" y="140" text-anchor="middle" font-size="12">name, talk</text>
<line x1="150" y1="170" x2="580" y2="170" stroke="currentColor"/>
<line x1="150" y1="164" x2="150" y2="176" stroke="currentColor"/>
<line x1="580" y1="164" x2="580" y2="176" stroke="currentColor"/>
<text x="365" y="195" text-anchor="middle">commonly about 90 days; longer for hardware and standards</text>
</svg>
<figcaption>Figure 20.2. Coordinated disclosure. The researcher reports privately, the vendor fixes under an embargo, and the paper comes out with or after the patch.</figcaption>
</figure>

### Deadlines

The deadline is what keeps vendors honest. Before deadlines were common,
researchers reported flaws and waited for years, or were threatened with
lawsuits. Google's Project Zero team, formed in 2014, made a fixed 90-day
deadline its public policy, and 90 days has since become the usual default:
long enough for most software fixes, short enough that a vendor cannot sit on a
flaw. Hardware and standards take longer. A flaw in a chip cannot be patched,
only worked around in firmware and software; a flaw in a protocol standard needs
every implementer to agree on a fix. The ROCA flaw in Infineon's RSA key
generation ([Chapter 18](18-Random-Numbers-Gone-Wrong.md)) was reported in
February 2017 and published in October, about eight months later, because
smart cards, security chips in laptops and Estonia's national identity card all
needed new keys or new firmware.

### CVE numbers

A **CVE** (Common Vulnerabilities and Exposures) identifier is a name for one
flaw, such as CVE-2017-15361 for ROCA or CVE-2008-0166 for the Debian OpenSSL
random number bug. The list was started by the MITRE Corporation in 1999 so
that different vendors, scanners and advisories would mean the same thing when
they spoke of a flaw. A researcher or vendor reserves a number early, before
anything is public, so that on disclosure day every patch and advisory can cite
it. A CVE number says nothing about severity by itself; a separate score (the
Common Vulnerability Scoring System, CVSS) tries to, and is often argued over.

Cryptographic flaws have produced some of the most cited CVEs.
CVE-2014-0160 was Heartbleed, an OpenSSL buffer over-read that leaked private
keys from server memory. CVE-2016-0800 was DROWN, a cross-protocol attack that
used SSLv2 servers as Bleichenbacher oracles
([Chapter 13](13-Attacks-on-RSA.md)). CVE-2020-0601 was "CurveBall", a flaw in
how Windows checked elliptic curve certificates, which let an attacker supply
their own curve parameters and so forge a certificate chain; it was reported by
the NSA in January 2020, a rare public disclosure by an intelligence agency.
CVE-2022-21449 was the "psychic signatures" bug in Java 15 to 18, found by Neil
Madden: the ECDSA verifier accepted a signature with $r = s = 0$ for any message
and any key, because it never checked that $r$ and $s$ were in the range 1 to
$n - 1$. The check is two lines of code; its absence broke every ECDSA
signature check in those versions of Java.

!!! note "Life story: the CVE list"
    **Born:** 1999, at the MITRE Corporation, with US government funding, as a
    dictionary of publicly known flaws · **Purpose:** one name per
    vulnerability, so that patches, scanners and advisories can refer to the
    same thing · **Helped:** made coordinated disclosure manageable at scale;
    Heartbleed, ROCA, DROWN, CurveBall and tens of thousands of other flaws are
    known by their numbers · **Status:** current, with hundreds of organizations
    allowed to assign numbers and well over 200,000 entries; a brief funding
    scare in April 2025, when MITRE's contract nearly lapsed, showed how much of
    the world depends on it

### Embargoes and how they fail

During an **embargo** a fix is shared with a closed group (operating system
distributors, cloud providers, major vendors) under a promise not to release it
before an agreed date. Embargoes leak. The KRACK attack on Wi-Fi was reported in
July 2017 and disclosed on 16 October 2017. Because the embargo was long,
Mathy Vanhoef agreed to let OpenBSD release a quiet fix in August, and said
afterwards that he would use shorter embargoes in future. Meltdown and Spectre
were held for about six months and still broke a week early, in January 2018,
when people noticed unusual changes to the Linux kernel's memory handling and
guessed what they were for. The more parties an embargo includes, the more
likely it is to leak; the fewer it includes, the more users are left unpatched
on disclosure day. There is no perfect size.

### When the vendor says no

Some vendors respond with lawyers. In 2008 NXP tried and failed to stop the
publication of the Radboud University break of MIFARE Classic transit cards; in
2013 Volkswagen delayed a paper on the Megamos Crypto car immobilizer for two
years ([Chapter 1](01-What-Cryptanalysis-Is.md), §1.9). Researchers in many
countries also face laws against circumventing copy protection or accessing
computers without permission. Several governments and companies have since
published **vulnerability disclosure policies** that promise not to sue
researchers who follow their rules, and most large security conferences now ask
authors how they handled disclosure. The trend is toward protection, but it is
not complete, and anyone who plans to test a real system should read the
vendor's policy and the local law first.

### Disclosure of algorithms: the mailing list as a referee

For algorithms under standardization, the disclosure channel is a public
mailing list. NIST's **pqc-forum**, a Google group opened for the post-quantum
process, is where submitters announced fixes, attackers posted breaks (often
within days of the round-one submissions in December 2017), and long arguments
about cost models happened in the open. The 2022 dual attack report and its
critics ([Chapter 15](15-Lattices-as-a-Weapon.md)), the 2023 dispute over how
NIST had computed Kyber-512's security, and the April 2024 quantum LWE claim all
played out there. The forum is noisy and sometimes bad-tempered. It is also the
best record any standardization has ever had of who attacked what, when, and why
the answer was accepted.

## 20.4 Competitions: breaking before deploying

*Level: intermediate.*

Until the late 1990s most ciphers were chosen by a committee, a company or a
government and attacked afterwards, in the field. DES was designed by IBM and
revised with the NSA behind closed doors; the GSM ciphers A5/1 and A5/2 were
kept secret and fell within months of being reverse-engineered
([Chapter 8](08-Attacks-on-Stream-Ciphers.md)); WEP was written by a standards
committee with no cryptanalyst checking it. The alternative that has replaced
this is the **open competition**: anyone may submit a design with a full
specification and code, anyone may attack it, the attacks are published, and
the survivors are winnowed in rounds over several years. A competition is a
cryptanalysis project that runs before deployment, when breaking costs nothing.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Timeline bars of six open competitions from 1997 to 2025: AES 1997 to 2001, eSTREAM 2004 to 2008, SHA-3 2007 to 2015, CAESAR 2013 to 2019, NIST post-quantum 2016 to 2024, NIST lightweight 2018 to 2023, each with its result" fill="currentColor" font-size="14">
<line x1="140" y1="260" x2="620" y2="260" stroke="currentColor"/>
<text x="140" y="280" text-anchor="middle" font-size="12">1997</text>
<text x="257" y="280" text-anchor="middle" font-size="12">2004</text>
<text x="373" y="280" text-anchor="middle" font-size="12">2011</text>
<text x="490" y="280" text-anchor="middle" font-size="12">2018</text>
<text x="607" y="280" text-anchor="middle" font-size="12">2025</text>
<text x="10" y="40">AES</text>
<rect x="140" y="27" width="73" height="18" opacity="0.35"/>
<text x="220" y="41" font-size="12">Rijndael, FIPS 197</text>
<text x="10" y="80">eSTREAM</text>
<rect x="257" y="67" width="67" height="18" opacity="0.35"/>
<text x="330" y="81" font-size="12">portfolio of 7 (then 8)</text>
<text x="10" y="120">SHA-3</text>
<rect x="307" y="107" width="133" height="18" opacity="0.35"/>
<text x="446" y="121" font-size="12">Keccak, FIPS 202</text>
<text x="10" y="160">CAESAR</text>
<rect x="407" y="147" width="100" height="18" opacity="0.35"/>
<text x="512" y="161" font-size="12">portfolio of 6 AEADs</text>
<text x="10" y="200">Post-quantum</text>
<rect x="473" y="187" width="133" height="18" opacity="0.35"/>
<text x="473" y="222" font-size="12">FIPS 203, 204, 205 (2024)</text>
<text x="10" y="245">Lightweight</text>
<rect x="490" y="232" width="83" height="18" opacity="0.35"/>
<text x="578" y="246" font-size="12">Ascon</text>
</svg>
<figcaption>Figure 20.3. The open competitions, 1997 to 2025. Each bar runs from the call to the final decision or standard; the attacks published during each bar are why the winners are trusted.</figcaption>
</figure>

### AES, 1997 to 2001

NIST announced in January 1997 that it would replace DES by open competition,
and published the formal call in September. Fifteen candidates arrived by
August 1998 from twelve countries. Several fell or were wounded early: an
attack on the key schedule of one, differential properties of another, a
related-key attack on a third. In August 1999 NIST chose five finalists, MARS,
RC6, Rijndael, Serpent and Twofish, all of them unbroken; the choice among them
came down to margin, speed on everything from smart cards to servers, and
simplicity. On 2 October 2000 NIST chose Rijndael, by Joan Daemen and Vincent
Rijmen of Belgium, and published it as FIPS 197 in November 2001.

The AES process set the pattern that every later competition copied: public
calls, public submissions with reference code, public conferences, and NIST
reports explaining each cut. The attacks published during it, among them the
first impossible-differential and integral results on Rijndael's reduced rounds
([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)), are the reason
its round counts were believed then and are still believed now.

!!! note "Life story: the AES competition"
    **Born:** January 1997, announced by NIST; formal call September 1997;
    15 candidates in August 1998 · **Purpose:** replace DES with a public,
    royalty-free 128-bit block cipher chosen in the open · **Helped:** produced
    Rijndael (October 2000, FIPS 197 in 2001) and, just as important, a
    community of block cipher cryptanalysts and a habit of public evaluation ·
    **Status:** finished; AES is the most used cipher in the world, and the
    competition is the model for all that followed

### eSTREAM, 2004 to 2008

The European network of excellence ECRYPT ran eSTREAM after an earlier
European project, NESSIE (2000 to 2003), had failed to recommend any of its
stream ciphers: every one submitted had been attacked. eSTREAM received 34
designs in 2005 and published its portfolio in April 2008 in two profiles. For
software it chose HC-128, Rabbit, Salsa20/12 and SOSEMANUK; for hardware,
Grain v1, MICKEY 2.0, Trivium and F-FCSR-H. F-FCSR-H was removed in September
2008 after Martin Hell and Thomas Johansson broke it, a reminder that a
portfolio is a judgment, not a proof. Salsa20 became ChaCha20 and is now in TLS
and WireGuard; Trivium became the standard target for cube attacks
([Chapter 8](08-Attacks-on-Stream-Ciphers.md)).

!!! note "Life story: eSTREAM"
    **Born:** 2004, the ECRYPT network's call for stream ciphers; 34
    submissions in 2005 · **Purpose:** find stream ciphers faster than AES in
    software or smaller than AES in hardware, after NESSIE found none it could
    recommend · **Helped:** Salsa20 (and so ChaCha20), Trivium and Grain; years
    of correlation, cube and guess-and-determine attacks on the candidates ·
    **Status:** portfolio published April 2008, revised September 2008 and
    reviewed again in later years; Grain's descendant Grain-128AEAD was a
    finalist of the NIST lightweight process

### SHA-3, 2007 to 2015

The SHA-3 competition was a direct reply to Wang's attacks on MD5 and SHA-1
([Chapter 9](09-Breaking-Hash-Functions.md)): in 2005 nobody knew whether
SHA-2, built on the same plan, would follow. NIST called for designs in
November 2007, received 64 submissions in October 2008 and accepted 51 for the
first round. Fourteen went to the second round in July 2009 and five, BLAKE,
Grøstl, JH, Keccak and Skein, to the final in December 2010. Keccak, by Guido
Bertoni, Joan Daemen, Michaël Peeters and Gilles Van Assche, won on 2 October
2012, chosen partly because its sponge design was the most different from
SHA-2. It became FIPS 202 in August 2015.

The competition was also a large cryptanalysis effort: rebound attacks,
zero-sum distinguishers, cube-like attacks and differential paths on all five
finalists, every one on reduced rounds. Meanwhile SHA-2 held, and still does
(§20.8). That outcome is a result too: SHA-3 is a second, unrelated design
waiting in case SHA-2 falls, not a replacement for a broken one.

!!! note "Life story: the SHA-3 competition"
    **Born:** November 2007, NIST's call, after the 2004 and 2005 collisions in
    MD5 and SHA-1; 64 submissions in October 2008 · **Purpose:** a hash function
    of a different design from SHA-2, in case SHA-2 fell the way SHA-1 had ·
    **Helped:** Keccak and the sponge construction (FIPS 202, 2015), SHAKE and
    the extendable-output functions now used inside ML-KEM and ML-DSA; BLAKE's
    descendants BLAKE2 and BLAKE3 · **Status:** finished; SHA-2 is still the
    everyday hash and SHA-3 the insurance

### CAESAR, 2013 to 2019

CAESAR (the Competition for Authenticated Encryption: Security,
Applicability, and Robustness) was not run by a government. Daniel J. Bernstein
organized it with a committee of academic cryptographers, announced it in
January 2013, and received 57 submissions in March 2014. It aimed at the
problem of [Chapter 10](10-Attacks-on-Modes-and-MACs.md): authenticated
encryption that is hard to misuse. In February 2019 it named a final portfolio
in three use cases: for lightweight use, Ascon (first choice) and ACORN; for
high performance, AEGIS-128 and OCB; for defense in depth, Deoxys-II (first
choice) and COLM. Many submissions were broken or seriously weakened along
the way, often by forgeries in exactly the cases CAESAR had asked designers to
consider: repeated nonces and plaintext released before verification.

### The NIST post-quantum process, 2016 to 2024 and beyond

[Chapter 16](16-Breaking-Post-Quantum-Candidates.md) told this competition as a
cryptanalysis tournament in full. In short: a call in December 2016, 69
complete submissions in December 2017, rounds in 2019 and 2020, the first
selections in July 2022 (Kyber, Dilithium, Falcon and SPHINCS+), FIPS 203,
FIPS 204 and FIPS 205 in August 2024, and HQC chosen as a backup key
encapsulation mechanism in March 2025. About half the original submissions
were broken, two of them (SIKE and Rainbow) after reaching the late rounds. A
second call, for additional signature schemes, was opened in 2022 and is
still running; its round-two candidates in 2025 included UOV, MAYO, SQIsign and
several code-based and MPC-in-the-head designs, each under the same public
attack.

### The lightweight competition and Ascon, 2018 to 2025

NIST's lightweight cryptography process aimed at devices too small for AES-GCM:
sensors, RFID tags, implants. The call was published in August 2018; 56
submissions were accepted for the first round in April 2019, 32 for the second
in August 2019, and ten finalists were named in March 2021. On 7 February 2023
NIST chose **Ascon**, by Christoph Dobraunig, Maria Eichlseder, Florian
Mendel and Martin Schläffer of Graz University of Technology, the same design
that had headed CAESAR's lightweight list in 2019. It is a 320-bit permutation
used in a sponge-like duplex mode. SP 800-232, published in August 2025,
standardizes Ascon-AEAD128, the hash Ascon-Hash256 and the extendable-output
functions Ascon-XOF128 and Ascon-CXOF128.

Ascon is a good example of what years of competition buy. Its permutation runs
12 rounds in initialization and finalization, and the best key-recovery attacks
on that initialization, mostly cube and conditional cube attacks
([Chapter 8](08-Attacks-on-Stream-Ciphers.md)), reach 7 of the 12 rounds at
costs close to brute force. That margin was measured in public, over about ten
years, before the first standard was written.

!!! note "Life story: the NIST lightweight competition"
    **Born:** August 2018, NIST's call for authenticated encryption and hashing
    for constrained devices; 56 first-round candidates in April 2019 ·
    **Purpose:** a standard for devices too small for AES-GCM and SHA-2 ·
    **Helped:** chose Ascon in February 2023 from ten finalists; the standard is
    SP 800-232 (August 2025) · **Status:** finished; Ascon now has about a decade
    of public cryptanalysis behind it, from CAESAR through NIST

### What competitions teach

Three lessons repeat across all six. First, **most designs fall**, and the
fall is cheap when it happens during a competition. Second, **the winner is
rarely the fastest or the cleverest**; it is the one whose margin was measured
best and whose design was easiest to analyze. Rijndael, Keccak and Ascon all won
partly because they were simple enough to attack thoroughly. Third, a
competition **creates cryptanalysts**: many people who now design and attack
ciphers learned the craft by breaking a candidate. That is perhaps the most
lasting result.

## 20.5 Automated tools

*Level: intermediate.*

For most of the history in this book, attacks were found by hand: Rejewski with
permutation theory, Biham and Shamir with tables of differences, Wang with pages
of bit conditions. Since about 2010 more and more of the search has been handed
to general-purpose solvers. This has not replaced the cryptanalyst, who still
chooses the model, the question and the shortcut, but it has changed what a
single researcher can check in a week.

### Trails as integer programs

A differential or linear trail ([Chapter 5](05-Differential-Cryptanalysis.md),
[Chapter 6](06-Linear-Cryptanalysis.md)) is a choice of difference or mask at
every point of the cipher, subject to rules: a difference passes an XOR with the
key unchanged, a linear layer maps it in a fixed way, and an S-box can map a
difference $a$ to a difference $b$ only if the difference distribution table
has a nonzero entry at $(a, b)$. The quality of a trail is the product of its
S-box probabilities. Searching for the best trail is therefore an optimization
problem, and it can be written as one.

In 2011 Nicky Mouha, Qingju Wang, Dawu Gu and Bart Preneel wrote the problem
of bounding the number of active S-boxes as a **mixed integer linear program**
(MILP): a binary variable for "this byte has a nonzero difference", linear
inequalities for each operation, and an objective that counts active S-boxes.
A standard solver then proved the bounds that designers had argued by hand,
such as AES's 25 active S-boxes over four rounds. In 2014 Siwei Sun and
colleagues extended the method to bit-level ciphers, describing an S-box's
allowed transitions as the inequalities of a convex hull, so that the solver
could find actual trails and their probabilities rather than just counts. In
2016 Zejun Xiang and colleagues modeled the **division property**, the modern
form of the integral attacks of
[Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md), the same way, and
in 2017 Yosuke Todo and colleagues used it to find the cube attacks on Trivium
and other stream ciphers of [Chapter 8](08-Attacks-on-Stream-Ciphers.md).

### Trails as SAT problems

A **SAT solver** decides whether a Boolean formula can be made true, and modern
ones handle millions of clauses. Addition modulo $2^n$, which defeats simple
MILP models, has a compact exact description of its differential behavior (due
to Helger Lipmaa and Shiho Moriai in 2001), and that description becomes a
handful of clauses per bit. Nicky Mouha and Bart Preneel used the STP solver in
2013 to search for differential characteristics of the ARX cipher Salsa20;
Stefan Kölbl, Gregor Leander and Tyge Tiessen built the CryptoSMT tool in 2015
and used it to find better trails for the NSA-designed cipher SIMON. SAT and
its cousins (SMT, constraint programming) are now the usual first tool for
ARX designs and for searching boomerang, impossible-differential and
meet-in-the-middle configurations, which are combinatorial rather than
numerical.

Solvers also attack directly. [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)
showed that a SAT solver breaks small and heavily reduced ciphers from their
equations; [Chapter 9](09-Breaking-Hash-Functions.md)'s differential paths for
SHA-1 and SHA-2 are now partly found and checked by solvers too. What solvers
have not done is break a full modern cipher. Their power is in search within a
model the cryptanalyst has already chosen.

### Protocols: Tamarin and ProVerif

[Chapter 19](19-Protocol-Breaks.md) showed protocol attacks found by hand and
then by machine, with small models run on the page; this is the short version,
as a part of the larger shift to tools. The mechanical approach models the protocol as a set of roles, each a sequence of
sends and receives; models the attacker as able to read, block, replay and
compose any message, but not to break the cryptography (the Dolev-Yao model of
1983); and asks a tool to prove a property, such as "if Alice completes a run
with Bob, Bob ran with Alice", or to produce a trace that violates it.

**ProVerif**, by Bruno Blanchet (first released in 2001), works on an
over-approximation of the protocol written in the applied pi calculus and can
prove properties for an unbounded number of sessions automatically, at the cost
that it occasionally reports an attack that does not exist. **Tamarin**,
developed from 2012 by Benedikt Schmidt, Simon Meier, Cas Cremers and David
Basin, works with multiset rewriting rules and is interactive when it needs to
be, which lets it handle Diffie-Hellman exponentiation and stateful protocols
exactly. Between them they have analyzed TLS 1.3 before it was finalized (and
found a flaw in a draft's handling of client authentication after resumption),
the 5G authentication protocol (Basin and colleagues, 2018, showing that one
security goal was not met as specified), the Signal protocol, WPA2's handshake
after KRACK, and EMV payment cards, where in 2021 Basin, Ralf Sasse and Jorge
Toro-Pozo found that a Visa contactless transaction could be made to skip the
PIN, and demonstrated it on real cards.

!!! note "Life story: Tamarin and ProVerif"
    **Born:** ProVerif in 2001 (Bruno Blanchet, INRIA); Tamarin in 2012 (Schmidt,
    Meier, Cremers, Basin, ETH Zurich), both from a line of protocol analysis
    going back to Dolev and Yao (1983) and Lowe's FDR analysis of
    Needham-Schroeder (1995) · **Purpose:** prove a protocol's security goals
    against an attacker who controls the network, or produce the attack trace ·
    **Helped:** TLS 1.3's design, 5G AKA, EMV's PIN bypass, Signal, Noise and
    WireGuard analyses · **Status:** current; a protocol paper without a
    machine-checked model is now unusual at the top venues

### Lattice estimators

For lattice cryptography the attack is known (BKZ reduction followed by a
primal or dual step, [Chapter 15](15-Lattices-as-a-Weapon.md)); the question is
what it costs for given parameters. The cost depends on dozens of choices:
block size, sieving or enumeration, quantum or classical models, how many
samples to use, how to guess part of the secret. In 2015 Martin Albrecht, Rachel
Player and Sam Scott collected the attacks in one survey and one piece of
software, the **LWE estimator**, which takes a parameter set and returns the
cost of each known attack. Its successor, the lattice estimator, is the tool
every lattice submission to NIST was measured with, and the tool attackers
update when they improve an attack: a better sieving cost, a hybrid with a
meet-in-the-middle guess, or a new dual attack becomes a pull request, and every
scheme's number moves at once.

!!! note "Life story: the lattice estimator"
    **Born:** 2015, Martin Albrecht, Rachel Player and Sam Scott, "On the
    concrete hardness of Learning with Errors", with open-source code ·
    **Purpose:** one place where every known attack on LWE-type problems is
    costed for any parameter set · **Helped:** set or checked the parameters of
    Kyber (ML-KEM), Dilithium (ML-DSA), Falcon, FrodoKEM, NTRU and most
    homomorphic encryption libraries · **Status:** current and maintained in
    the open; its numbers are estimates under stated heuristics, which is
    exactly what the dual attack debate (§20.9) was about

### What the tools change

Tools turn a question a person can state into an answer a person could not
compute. They made it routine for a designer to prove a bound on trails before
publishing, which is why most ciphers designed after 2015 come with a table of
proven active S-box counts. They made it routine for a protocol to be modeled
before it is standardized. And they shifted the valuable skill from executing
a search to choosing what to search for. The best attacks of the last decade
still began with a person noticing something the models did not contain.

## 20.6 Machine learning in cryptanalysis

*Level: intermediate.*

Machine learning finds patterns in data, and cryptanalysis is the search for
patterns in data that should have none. The match is obvious, and claims that
neural networks will "break encryption" appear regularly. Most of them come from
outside the field. One result from inside it is worth studying in detail,
because it is real, because it is small, and because it shows exactly where the
limits are.

### Gohr and Speck

**Speck** is a family of lightweight block ciphers published by the NSA in 2013
together with its sister SIMON. It is an ARX design: each round uses only
modular addition, rotation and XOR. Speck32/64, the smallest member, has a
32-bit block made of two 16-bit words $x$ and $y$, a 64-bit key, and 22 rounds.
One round with round key $k$ is

$$x \leftarrow ((x \ggg 7) \boxplus y) \oplus k, \qquad y \leftarrow (y \lll 2) \oplus x,$$

where $\boxplus$ is addition modulo $2^{16}$, and $\ggg$ and $\lll$ are
rotations. The only nonlinear part is the addition's carries.

At CRYPTO 2019 Aron Gohr of the German Federal Office for Information Security
asked a narrow question: given a pair of ciphertexts, can a neural network tell
whether they came from two plaintexts with a fixed difference, encrypted for $r$
rounds under the same random key, or from random data? He used the plaintext
difference $(\Delta x, \Delta y) = (\texttt{0x0040}, \texttt{0x0000})$, trained
a residual network on millions of labeled pairs, and measured its accuracy on
fresh pairs. The networks were right about 93% of the time for 5 rounds, about
79% for 6 rounds and about 62% for 7 rounds, against 50% for guessing. For 8
rounds, using a trick that combined the network with a one-round extension, he
obtained a weak but measurable distinguisher.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="A neural distinguisher: a plaintext pair with a fixed difference is encrypted for r rounds under one random key; the ciphertext pair, or a random pair, goes to a trained classifier that outputs a score between 0 and 1 for cipher or random" fill="currentColor" font-size="14">
<rect x="20" y="40" width="130" height="60" fill="none" stroke="currentColor"/>
<text x="85" y="65" text-anchor="middle">P, P ⊕ Δ</text>
<text x="85" y="85" text-anchor="middle" font-size="12">Δ = (0040, 0000)</text>
<line x1="150" y1="70" x2="195" y2="70" stroke="currentColor"/>
<polygon points="195,65 205,70 195,75"/>
<rect x="205" y="40" width="130" height="60" fill="none" stroke="currentColor"/>
<text x="270" y="65" text-anchor="middle">Speck, r rounds</text>
<text x="270" y="85" text-anchor="middle" font-size="12">one random key</text>
<rect x="205" y="140" width="130" height="50" fill="none" stroke="currentColor"/>
<text x="270" y="170" text-anchor="middle">random pair</text>
<line x1="335" y1="70" x2="410" y2="100" stroke="currentColor"/>
<line x1="335" y1="165" x2="410" y2="125" stroke="currentColor"/>
<polygon points="404,94 412,101 402,103"/>
<polygon points="402,121 412,124 405,131"/>
<rect x="415" y="80" width="110" height="60" fill="none" stroke="currentColor"/>
<text x="470" y="105" text-anchor="middle">classifier</text>
<text x="470" y="125" text-anchor="middle" font-size="12">counts or network</text>
<line x1="525" y1="110" x2="565" y2="110" stroke="currentColor"/>
<polygon points="565,105 575,110 565,115"/>
<text x="580" y="105" font-size="12">score</text>
<text x="580" y="122" font-size="12">0 to 1</text>
</svg>
<figcaption>Figure 20.4. A distinguisher's experiment. The classifier sees a ciphertext pair and must say whether it came from the cipher or from random data; Gohr's was a neural network, the one below just counts bits.</figcaption>
</figure>

Then he turned the distinguisher into a **key recovery attack**, in the way
[Chapter 5](05-Differential-Cryptanalysis.md) turns a differential into a
last-round attack: guess the last round key, decrypt one round, and ask the
network whether the result looks like the cipher. Right guesses score high,
wrong ones look random. Combined with a classical differential for the first
rounds and a careful search strategy, this broke 11 rounds of Speck32/64 at a
cost lower than the best published attack on 11 rounds at the time (Itai
Dinur's 2014 differential attack). It is a practical attack, run on a
workstation, on a version of the cipher with half its rounds.

### What the network learned

The most interesting part of Gohr's paper was a comparison he made himself.
For Speck32/64 the full table of output differences for a given input
difference can be computed exactly, at large but feasible cost, and Gohr did so
for up to 8 rounds. A distinguisher that uses this table is the best possible
distinguisher that looks only at the ciphertext **difference**. The neural
network beat it. So the network was using information in the ciphertext pair
beyond its XOR difference: properties of the actual values, which the last
rounds' additions make correlate with the difference.

In 2021 Adrien Benamira, David Gerault, Thomas Peyrin and Quan Quan Tan took the
trained networks apart. They found that the networks largely compute
differential-linear features of the kind described in
[Chapter 6](06-Linear-Cryptanalysis.md), plus information about the values in
the penultimate and last rounds, and they built a distinguisher with no neural
network at all, from tables of such features, that came within about a
percentage point of the network's accuracy. The network had found something a
cryptanalyst could have found, faster than one did, and could then explain.

### Code it: a distinguisher that counts

The simplest possible distinguisher counts. For many pairs with Gohr's input
difference, record how often each of the 32 bits of the output difference is 1.
For random data each bit is 1 half the time, and the sum of squared deviations
(a chi-square statistic with 32 degrees of freedom) is about 32. For the cipher,
some bits are badly biased after few rounds. The code below implements
Speck32/64, checks it against the published test vector, and then measures the
statistic for 3 to 7 rounds with 4,096 pairs each.

```python
import random

MASK = 0xFFFF

def ror(x, r):
    return ((x >> r) | (x << (16 - r))) & MASK

def rol(x, r):
    return ((x << r) | (x >> (16 - r))) & MASK

def round_keys(key, rounds):
    # key = (k0, l0, l1, l2) as four 16-bit words
    k, l = [key[0]], list(key[1:])
    for i in range(rounds - 1):
        l.append(((k[i] + ror(l[i], 7)) & MASK) ^ i)
        k.append(rol(k[i], 2) ^ l[-1])
    return k

def speck(x, y, ks):
    for k in ks:
        x = ((ror(x, 7) + y) & MASK) ^ k
        y = rol(y, 2) ^ x
    return x, y

# The published test vector for Speck32/64 (22 rounds)
ks = round_keys((0x0100, 0x0908, 0x1110, 0x1918), 22)
print("test vector:", "%04x %04x" % speck(0x6574, 0x694c, ks))

def score(rounds, n, real=True):
    # Count how often each of the 32 difference bits is 1, then add up
    # the squared distances from n/2 (a chi-square statistic with 32 bits).
    ones = [0] * 32
    for _ in range(n):
        x, y = random.getrandbits(16), random.getrandbits(16)
        if real:
            ks = round_keys([random.getrandbits(16) for _ in range(4)], rounds)
            a = speck(x, y, ks)
            b = speck(x ^ 0x0040, y, ks)  # Gohr's input difference
            d = (a[0] ^ b[0]) << 16 | (a[1] ^ b[1])
        else:
            d = random.getrandbits(32)
        for i in range(32):
            ones[i] += d >> i & 1
    return sum((c - n / 2) ** 2 / (n / 4) for c in ones)

random.seed(2019)
n = 4096
print("rounds  Speck   random   (random is about 32)")
for r in range(3, 8):
    print("%5d %8.0f %8.0f" % (r, score(r, n), score(r, n, real=False)))
```

It prints:

```text
test vector: a868 42f2
rounds  Speck   random   (random is about 32)
    3    65231       35
    4    29082       40
    5     7337       29
    6      668       23
    7       31       34
```

For 3 to 6 rounds the cipher is unmistakable: the statistic is hundreds or
thousands of times what random data gives. At 7 rounds the single-bit biases
have vanished into the noise; running the same count with $2^{18}$ pairs still
gives a value near 32. Yet Gohr's network, looking at one pair at a time, was
right 62% of the time at 7 rounds. The difference is what the network adds:
it combines bits, and it looks at values, not only differences. A cryptanalyst
would add the same things by hand, with differential-linear masks and
conditions on the last round, and Benamira and colleagues showed that this
recovers most of the network's power.

### The honest assessment

Since 2019 there have been many papers on neural distinguishers: for SIMON,
PRESENT, Gimli, ChaCha and others, with improved network shapes, multiple
pairs at once and better key-recovery searches. They share a pattern. They work
on ciphers with small blocks and reduced rounds, where training data is cheap and
the signal is strong. They have pushed a few attacks a round or so further, or
made them cheaper. None has broken a full-round modern cipher, and none has
gone beyond the reach of classical distinguishers by more than a little. The
reasons are structural. A 128-bit block offers no small table to learn from;
the signal a distinguisher needs decays exponentially with rounds, and a
network cannot learn a signal that is not in its training data; and a
distinguisher with accuracy $\tfrac12 + \varepsilon$ still needs about
$1/\varepsilon^2$ samples, whatever computes it.

Where machine learning has made a large practical difference is **side-channel
analysis** ([Chapter 17](17-Side-Channels-the-Attackers-View.md)). Power and
electromagnetic traces are noisy, misaligned and high-dimensional, which is
what neural networks are good at, and since about 2016 deep-learning profiled
attacks, trained on a copy of the target device, have matched or beaten
classical template attacks, especially against traces with jitter or simple
masking. Public datasets such as ASCAD (2018) made the results comparable.

There have also been attempts on lattice problems. In 2022 researchers at Meta
AI presented SALSA, which trains a transformer on LWE samples and recovers
secrets in small dimensions when the secret is sparse and binary. Later versions
reached larger dimensions under the same restrictions. They are interesting
experiments and have not come near the parameters of ML-KEM or ML-DSA.

As for large language models: they write attack code, summarize papers and
help with the routine parts of the work, much as solvers do with search. That
is useful, and it changes who can attempt an attack. It has not yet produced a
new attack on a modern primitive, and a headline that says it has should get
the six questions of §20.2.

!!! note "Life story: Gohr's neural distinguisher"
    **Born:** 2019, Aron Gohr, "Improving attacks on round-reduced Speck32/64
    using deep learning", CRYPTO 2019 · **Purpose:** test whether a neural
    network can beat classical differential distinguishers on a real cipher ·
    **Helped:** distinguishers for 5 to 8 rounds that beat the full difference
    table, and a practical 11-round key recovery cheaper than the previous best;
    started the field of neural cryptanalysis; dissected in 2021 by Benamira,
    Gerault, Peyrin and Tan · **Status:** a landmark for reduced-round
    lightweight ciphers; no neural method has yet threatened a full modern
    cipher

## 20.7 The economics of attacks

*Level: intermediate.*

Every attack in this book had a cost in time, data and memory. Behind those
costs is money: who pays to find attacks, who pays to use them, and what they
are worth. The numbers below are uneven in quality. Some are published prices;
some come from leaked documents; some are estimates. Each is labeled.

### Bounties and prizes

A **bug bounty** pays researchers who report flaws to the vendor. Google,
Microsoft, Apple and most large software companies run programs, and platforms
such as HackerOne and Bugcrowd run them for others. Typical payments for serious
web and application flaws are in the thousands to tens of thousands of dollars;
the top published categories, for a remote, no-click compromise of a phone,
reached \$1 million at Apple from 2019. Cryptographic flaws are paid like any
other: by impact, not elegance. A beautiful attack on a mode that needs a
billion chosen ciphertexts earns less than a dull missing check that lets anyone
forge a token.

Cryptography also has a tradition of **challenge prizes** for the mathematics
itself. RSA Laboratories' factoring challenge (1991 to 2007) offered prizes
from \$10,000 to \$200,000 for factoring published moduli and was withdrawn in
2007, though people kept factoring the numbers; RSA-250 fell in 2020
([Chapter 11](11-Factoring.md)). Certicom's elliptic curve challenges of 1997
set discrete logarithm problems of increasing size, and the 109-bit ones fell
to distributed computation in 2002 and 2004
([Chapter 12](12-Discrete-Logarithms.md)). In 2013 Peter Todd placed bitcoin
bounties in scripts that could be spent by anyone who showed a collision for
SHA-1, SHA-256 and other hashes; the SHA-1 bounty, about 2.5 bitcoin, was
claimed within a day of SHAttered's announcement in February 2017, by someone
who used SHAttered's two PDFs. The public record of who claimed it is a
blockchain transaction, which is the most verifiable bounty receipt in the
history of the field.

### The price of exploits

On the other side of the market, exploit brokers buy working attacks and
resell them, mostly to governments. Their prices are not audited, but several
have published price lists. In 2019 one broker advertised up to \$2.5 million
for a no-click exploit chain on Android and \$2 million for one on iOS, and
later lists from other brokers advertised higher figures for the same
categories. These are prices for complete chains that compromise a device,
mostly through memory-safety bugs, not for cryptanalysis. Cryptography appears
in such chains as something to get around: an attacker who owns the phone reads
the messages before they are encrypted. That is the economic reason why
end-to-end encryption pushed state attackers toward endpoints rather than
toward cryptanalysis.

### Nation-state budgets

The largest buyers of cryptanalysis are governments, and their budgets are
secret. The one detailed glimpse came from the documents Edward Snowden took
from the NSA and released to journalists from June 2013. The US intelligence
"black budget" for fiscal year 2013, published by the *Washington Post* in
August 2013, totaled about \$52.6 billion, of which about \$10.8 billion went to
the NSA's Consolidated Cryptologic Program. A program called **Bullrun**,
described in documents published by the *Guardian*, the *New York Times* and
ProPublica in September 2013, aimed to defeat encryption in commercial
products, with a budget line of about \$255 million for 2013 for its
"SIGINT Enabling" part, much of it spent on working with or influencing
companies and standards. GCHQ had a matching program named Edgehill.

### What the Snowden documents showed, and what they did not

The documents showed that the NSA collected encrypted traffic on a vast scale;
that it worked to weaken standards, with Dual_EC_DRBG
([Chapter 18](18-Random-Numbers-Gone-Wrong.md)) as the confirmed case; that it
obtained keys and plaintext from companies, by agreement, by compulsion or by
theft; that it exploited endpoints and implementations; and that it budgeted
for "cryptanalytic capabilities" it described in one document as
groundbreaking, without saying what they were.

They did not show a mathematical break of AES, of properly used RSA, or of
elliptic curve cryptography. One document, as reported, complained that a
particular secure messaging setup was a major problem for the agency. The 2015
Logjam paper argued that the precomputation for a few widely shared 1024-bit
Diffie-Hellman primes ([Chapter 12](12-Discrete-Logarithms.md)) cost a few
hundred million dollars of hardware, well within such a budget, and that this
could explain some of the leaked claims. That is an informed and widely
accepted guess, not a documented fact. The honest summary is that the largest
known cryptanalytic budget in the world appeared to get most of its results by
going around good cryptography, not through it, and that the documents are
twelve years old.

!!! note "Life story: Bullrun"
    **Born:** about 2010 or earlier, as described in NSA documents; revealed in
    September 2013 from Edward Snowden's material by the *Guardian*, the *New
    York Times* and ProPublica · **Purpose:** to make encrypted
    communications readable, by influencing standards and products, obtaining
    keys, and cryptanalysis · **Helped:** explained Dual_EC_DRBG; led to NIST's
    withdrawal of it in 2014, a review of NIST's processes, and a large move by
    companies to encrypt their internal traffic and adopt forward secrecy ·
    **Status:** the program's present form is secret; its revelation changed
    how cryptographers treat government-supplied constants

### What this means for a defender

The economics suggest a simple order of worry. Money buys the cheapest attack
that works. Against a system with sound algorithms, that is almost always an
implementation flaw, a protocol mistake, a stolen key or a compromised
endpoint, in roughly that order. Budgets large enough for new cryptanalysis
exist only in a few governments and are spent on targets worth it. That is why
the advice of this book has been the same in every part: use standard
algorithms with large margins, and spend the effort on everything around them.

## 20.8 Open problems: AES, SHA-2 and SHA-3

*Level: expert.*

The symmetric primitives the world uses are not proven secure and will not be.
What can be measured is their **security margin**: how much of the algorithm
remains after the best known attack. The usual measure is in rounds. If the best
attack faster than the generic one reaches $r$ of $R$ rounds, the margin is
$R - r$ rounds, or $1 - r/R$ as a fraction. It is a crude measure: a round of
one design is not a round of another, an attack on $r$ rounds may cost nearly as
much as brute force, and attacks that reach more rounds in weaker models
(related keys, known keys, distinguishers on the permutation) are left out by
convention. But it is the measure designers and standard-setters use, and it has
a clear history: the margins of DES, MD5 and SHA-1 shrank year by year before
those algorithms fell.

### Code it: a margin table

The code prints the margins of six primitives in use today. The attacked-round
counts are the best published attacks faster than the generic one in the
standard (single-key, or ordinary hash) model, as of 2026; they are explained
below.

```python
# Security margins: rounds in the full primitive against the most rounds
# reached by any published attack faster than the generic one.
rows = [
    # name,            rounds, attacked, what the best attack does
    ("AES-128",           10,  7, "key recovery, single key"),
    ("AES-256",           14,  9, "key recovery, single key"),
    ("ChaCha20",          20,  7, "key recovery"),
    ("SHA-256",           64, 31, "collision"),
    ("SHA3-256",          24,  6, "collision"),
    ("Ascon (init.)",     12,  7, "key recovery"),
]

print("%-14s %6s %8s %7s  %s" % ("primitive", "rounds", "attacked", "margin", "best attack"))
for name, total, broken, what in rows:
    margin = 1 - broken / total
    print("%-14s %6d %8d %6.0f%%  %s" % (name, total, broken, 100 * margin, what))

# A rough rule some designers use: at least a third of the rounds unbroken.
thin = [name for name, total, broken, _ in rows if broken / total > 2 / 3]
print("margin under a third:", ", ".join(thin) or "none")
```

It prints:

```text
primitive      rounds attacked  margin  best attack
AES-128            10        7     30%  key recovery, single key
AES-256            14        9     36%  key recovery, single key
ChaCha20           20        7     65%  key recovery
SHA-256            64       31     52%  collision
SHA3-256           24        6     75%  collision
Ascon (init.)      12        7     42%  key recovery
margin under a third: AES-128
```

The "third" is an illustration, not a standard; no rule says how much margin is
enough. But the table shows something true. AES-128 has the thinnest margin of
the six, by a measure that has not changed since about 2008, and the others have
more.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Bar chart of security margins: for each of AES-128, AES-256, ChaCha20, SHA-256, SHA3-256 and Ascon, a full bar for all rounds with the part reached by the best attack shaded darker" fill="currentColor" font-size="14">
<text x="20" y="45">AES-128</text>
<rect x="140" y="30" width="460" height="22" fill="none" stroke="currentColor"/>
<rect x="140" y="30" width="322" height="22" opacity="0.45"/>
<text x="470" y="46" font-size="12">7 / 10</text>
<text x="20" y="85">AES-256</text>
<rect x="140" y="70" width="460" height="22" fill="none" stroke="currentColor"/>
<rect x="140" y="70" width="296" height="22" opacity="0.45"/>
<text x="444" y="86" font-size="12">9 / 14</text>
<text x="20" y="125">ChaCha20</text>
<rect x="140" y="110" width="460" height="22" fill="none" stroke="currentColor"/>
<rect x="140" y="110" width="161" height="22" opacity="0.45"/>
<text x="309" y="126" font-size="12">7 / 20</text>
<text x="20" y="165">SHA-256</text>
<rect x="140" y="150" width="460" height="22" fill="none" stroke="currentColor"/>
<rect x="140" y="150" width="223" height="22" opacity="0.45"/>
<text x="371" y="166" font-size="12">31 / 64</text>
<text x="20" y="205">SHA3-256</text>
<rect x="140" y="190" width="460" height="22" fill="none" stroke="currentColor"/>
<rect x="140" y="190" width="115" height="22" opacity="0.45"/>
<text x="263" y="206" font-size="12">6 / 24</text>
<text x="20" y="245">Ascon init.</text>
<rect x="140" y="230" width="460" height="22" fill="none" stroke="currentColor"/>
<rect x="140" y="230" width="268" height="22" opacity="0.45"/>
<text x="416" y="246" font-size="12">7 / 12</text>
<text x="370" y="280" text-anchor="middle" font-size="12" opacity="0.7">shaded: rounds reached by the best attack faster than generic; white: the margin</text>
</svg>
<figcaption>Figure 20.5. Security margins in rounds, 2026. AES-128's is the thinnest; SHA-3's, the widest. A margin says how far attacks would have to advance, not how likely they are to.</figcaption>
</figure>

### AES

The best single-key attacks on AES-128 that beat exhaustive search reach 7 of
its 10 rounds, using impossible differentials, meet-in-the-middle with
precomputed tables (the Demirci-Selçuk line) and related techniques
([Chapter 5](05-Differential-Cryptanalysis.md),
[Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)). Their costs are
close to $2^{100}$ or more and their data needs are enormous. The biclique attack
covers all 10 rounds, but at $2^{126.1}$, a gain of about four, and it is
usually counted separately because its gain does not grow with understanding.
For AES-256, single-key attacks reach about 9 of 14 rounds; related-key attacks
reach all 14, in a model proper protocols never offer.

The open questions about AES are these. Can any single-key attack reach 8 rounds
of AES-128 faster than brute force, with a real gain? The 8-round attacks
published so far are biclique-style or have marginal gains. Could a fundamentally
new technique, of the kind differential cryptanalysis was in 1990, appear? Nobody
can rule it out. Is there an algebraic structure in the AES S-box, inversion in
$\mathrm{GF}(2^8)$, that a future method could exploit, as some feared after the
XSL claim of 2002? Twenty-five years of trying have found none. And what would
change the picture? A 7-round attack becoming practical would be alarming,
because it would leave three rounds of a margin that took the designers' best
estimates to set; an 8-round attack with a real gain would start a migration to
AES-256 or to a new cipher. Nothing of the kind is in sight in 2026. The
practical failures of AES remain where
[Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md) left them: in
implementations, keys and modes.

### SHA-2

SHA-256 has 64 steps. Collision attacks with a real gain reached 31 steps in
2013 (Florian Mendel, Tomislav Nad and Martin Schläffer, at a theoretical cost
of about $2^{65.5}$), and an actual 31-step collision was computed and published
in 2024. Semi-free-start collisions, where the attacker also chooses the
starting state, reach further, to about 39 steps. Preimage attacks reach fewer
steps with smaller gains. SHA-512 is in a similar position on its 80 steps. The
step function's nonlinear message expansion and faster mixing, compared with
SHA-1 ([Chapter 9](09-Breaking-Hash-Functions.md)), are why the Wang-style path
techniques stop at about half the steps.

The open question is whether that half is a wall or a slope. For SHA-1, the
first full collision path took 11 years from MD5's fall and 12 more to become
SHAttered. For SHA-256 progress since 2013 has been a few steps, mostly through
better solvers and computing. A credible attack on, say, 45 steps would start the
conversations that preceded SHA-1's retirement.

### SHA-3 and Keccak

The Keccak-f[1600] permutation in SHA-3 has 24 rounds. Actual collisions have
been found for 5-round versions of several SHA-3 and SHAKE instances, and
theoretical collision attacks reach 6 rounds; preimage attacks reach about 4
rounds for the standard capacities. Distinguishers on the bare permutation
reach all 24 rounds, using the zero-sum property of
[Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)'s integral
attacks, but at costs far above anything a hash of 256 or 512 bits promises,
and with no effect on the hash. The open question for SHA-3 is less whether it
will fall than whether its margin is wasteful: its designers proposed
KangarooTwelve with 12 rounds, and the Keccak team itself has argued that fewer
rounds would be safe. A smaller margin is a performance choice, and the
cryptanalysis of 5 and 6 rounds is what that choice would rest on.

### What would change the picture

For all three, the useful thing to watch is not a headline but a trend: the
number of rounds reached by attacks with a real gain, year by year, and whether
the gain at that number grows. A margin that has not moved in a decade, as
AES-128's has not, is evidence of strength. A margin that moves a round every
few years, as SHA-1's did between 1998 and 2005, is the signal to prepare. The
lattice estimator's job for post-quantum schemes, below, is the same job done
with a different unit.

## 20.9 Open problems: lattices, isogenies and codes

*Level: expert.*

The post-quantum standards rest on problems with much less history than AES or
factoring. Learning with errors was defined in 2005; module lattices in their
standardized form are about a decade old. The open problems here are about
whether the cost models are right, as much as about new attacks.

### Lattices and the dual attack question

[Chapter 15](15-Lattices-as-a-Weapon.md) explained how estimators set lattice
parameters. The **primal attack** embeds the LWE secret as an unusually short
vector and reduces the lattice with BKZ; its cost is well understood and its
predictions have matched experiments in small dimensions. The **dual attack**
finds many short vectors in the dual lattice and uses them to distinguish LWE
samples from random, then guesses part of the secret. In 2022 a report by the
Israeli government's MATZOV group combined the dual attack with fast Fourier
methods for the guessing step and claimed costs a few bits below the primal
attack for Kyber, enough to put Kyber-512 slightly under NIST's category 1 target
in some cost models.

In 2023 Léo Ducas and Ludo Pulles showed that these dual attacks rested on an
independence heuristic that was contradicted by experiment: the scores of wrong
guesses were not distributed as assumed, so the claimed gains were not
established. Later work produced dual attacks with proven or better-justified
analyses (among them Yixin Shen and Amaury Pouly's in 2024), and those give
smaller gains. The state of the question in 2026 is that the primal attack
remains the reference for parameters, the dual attack's best version is not
settled, and the security levels of ML-KEM rest on estimates whose last few bits
are argued over. ML-KEM-768, the default in most deployments, has enough margin
that none of this matters to it; the arguments about Kyber-512 were about the
smallest parameter set and about whether NIST had computed its memory cost
fairly.

The deeper open problems are older. Is there a classical or quantum algorithm
that solves module-LWE substantially faster than for unstructured LWE, by
exploiting the ring? None is known for the parameters used, though such
structure has been exploited for other problems (short generators in principal
ideals, from 2014 to 2016). Can sieving's exponent, about $0.292\beta$
classically, be lowered? It has not moved since 2016. And can a quantum algorithm
do to lattices what Shor does to factoring? Chen's April 2024 claim was the most
serious recent attempt, and it failed; no one has a proof that it cannot be done.

### Isogenies after SIKE

The SIKE break of 2022 ([Chapter 16](16-Breaking-Post-Quantum-Candidates.md))
used the extra information SIDH published: the images of torsion points under
the secret isogeny. Schemes that publish no such points survived: **CSIDH**,
based on the action of a class group on supersingular curves, and **SQIsign**, a
signature scheme based on the quaternion algebra behind those curves.

Their open problems are different. CSIDH has a quantum subexponential attack
(Kuperberg's algorithm for the hidden shift problem), and from 2020 Chris
Peikert and others argued that its smallest parameter set, CSIDH-512, gives
much less quantum security than first claimed; how large the parameters must be
is still argued, and the answer makes CSIDH slow. For SQIsign the core problem is
computing the endomorphism ring of a supersingular curve, which Benjamin
Wesolowski proved in 2021 to be equivalent to finding isogeny paths. That gives
it a clean foundation, and the problem has been studied since the 1990s in
number theory, but it is young as a cryptographic assumption. The irony of the
field is that the higher-dimensional isogenies that broke SIKE are now used to
build faster versions of SQIsign; the attack became a tool.

### Codes and multivariate schemes

Code-based encryption is the oldest post-quantum family: McEliece's 1978
system with binary Goppa codes has kept its security against decoding attacks,
which have improved steadily but slowly, from Eugene Prange's information-set
decoding of 1962 through Jacques Stern's of 1989 to the work of Becker, Joux,
May and Meurer in 2012 and later refinements. Classic McEliece's public keys are
large, but its margin is the best-documented in post-quantum cryptography. HQC,
chosen by NIST in March 2025, rests on decoding random quasi-cyclic codes, whose
structure has been studied for less time. For multivariate signatures the lesson
of Rainbow and GeMSS is that added structure is where the attacks come in;
UOV with its original simple structure has stood since 1999, and the open
question is whether the compact variants such as MAYO keep that record.

### Provable security and real attacks

Every modern scheme comes with a security proof, and every attack in this book
on a proved scheme found a gap between the proof and the system. The gaps fall
into a few kinds. The proof may reduce to a problem in a **model** that the real
system does not satisfy: the random oracle model treats a hash as a perfect
random function, and Ran Canetti, Oded Goldreich and Shai Halevi showed in 1998
that schemes exist which are secure in that model and insecure with any real
hash. The proof may be **loose**: a reduction that loses a factor of $2^{40}$
means the scheme's security is the problem's minus 40 bits, and Neal Koblitz and
Alfred Menezes, in their "Another look" papers from 2004, showed several
standard schemes whose proofs said much less than readers assumed. The proof
may be **wrong**: Victor Shoup found in 2001 that the original proof of OAEP did
not prove what it claimed, and in 2012 Tetsu Iwata, Keisuke Ohashi and Kazuhiko
Minematsu found a flaw in GCM's proof that mattered for nonces other than 96
bits. Or the proof may be **about the wrong thing**: the SSH and TLS record
layers were proved secure in models that did not include the attacker seeing
error messages or timing, and the padding oracle and Lucky Thirteen attacks of
[Chapter 10](10-Attacks-on-Modes-and-MACs.md) used exactly those.

The open problem is to close these gaps: tight proofs, proofs in the standard
model where they are possible, machine-checked proofs (EasyCrypt, CryptoVerif),
and models that include what implementations leak. Progress is real; TLS 1.3 and
ML-KEM have more careful proofs than anything before them. But a proof always
ends where its model ends, and the attacker does not read the model.

## 20.10 Quantum timelines and harvest now, decrypt later

*Level: expert.*

[Chapter 11](11-Factoring.md) and [Chapter 16](16-Breaking-Post-Quantum-Candidates.md)
priced Shor's and Grover's algorithms on real hardware. This section asks the
question those prices raise: when, and what to do before then.

### The estimates

The cost of breaking RSA-2048 with Shor's algorithm has fallen as fast as the
hardware has grown. In 2012 estimates ran to about a billion physical qubits.
In 2019 Craig Gidney and Martin Ekerå estimated about 20 million noisy qubits
for about eight hours. In 2025 Gidney published an estimate of under a million
noisy qubits for under a week. Elliptic curve keys of 256 bits need fewer
logical qubits than RSA-2048, and published estimates put them within the same
order of hardware or less. Against that, the largest machines in 2025 had
hundreds to a few thousand physical qubits, with error rates near the
thresholds that error correction needs, and the first demonstrations of logical
qubits that improve as the code grows.

Nobody knows when the curves cross. The Global Risk Institute's yearly survey of
quantum computing experts, run by Michele Mosca and Marco Piani, asks for the
probability of a machine able to break RSA-2048 within 24 hours, at horizons
from 5 to 30 years. Answers have spread widely in every edition, with a
substantial minority of experts putting the chance within 10 years at even or
better, and most putting it high within 20 or 30. A survey of opinion is not a
measurement, and the book has no better one to offer.

### Harvest now, decrypt later

The timing question matters for confidentiality in a way it does not for
signatures. A signature only has to resist forgery until it is checked or until
the key is replaced; when a quantum computer arrives, the signatures it can
forge are new ones. But a ciphertext recorded today can be decrypted whenever a
quantum computer exists. An attacker who stores today's TLS sessions,
encrypted under keys agreed by X25519 or RSA, can read them in the year the
machine arrives. This is **harvest now, decrypt later**, and it is not
speculation about method: storing traffic is cheap, and the Snowden documents
showed that large-scale collection and retention of encrypted traffic was
already routine in 2013.

Michele Mosca put the arithmetic in one inequality in 2015. Let $x$ be how many
years the data must stay secret, $y$ how many years it takes to migrate the
system to quantum-safe cryptography, and $z$ how many years until a
cryptographically relevant quantum computer exists. If

$$x + y > z,$$

then some data that is secret today will be readable while it still matters.
Medical records, state secrets, identity documents and long-lived industrial
designs have $x$ of decades. Large migrations, judging by the move away from
SHA-1, take $y$ of five to fifteen years. So even a $z$ of twenty years can be too
short.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Mosca's inequality drawn as bars: shelf life x plus migration time y stacked, compared with time to a quantum computer z; when x plus y extends past z, the overlap is data exposed" fill="currentColor" font-size="14">
<text x="20" y="55">secret for x</text>
<rect x="160" y="40" width="200" height="24" opacity="0.25"/>
<text x="260" y="57" text-anchor="middle" font-size="12">x: shelf life</text>
<rect x="360" y="40" width="160" height="24" opacity="0.45"/>
<text x="440" y="57" text-anchor="middle" font-size="12">y: migration</text>
<text x="20" y="115">quantum at z</text>
<rect x="160" y="100" width="290" height="24" fill="none" stroke="currentColor"/>
<text x="305" y="117" text-anchor="middle" font-size="12">z: years until a large quantum computer</text>
<line x1="450" y1="30" x2="450" y2="160" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="450" y1="150" x2="520" y2="150" stroke="currentColor"/>
<polygon points="450,145 450,155 444,150"/>
<polygon points="520,145 520,155 526,150"/>
<text x="485" y="175" text-anchor="middle" font-size="12">exposed</text>
<line x1="160" y1="200" x2="600" y2="200" stroke="currentColor"/>
<text x="160" y="220" text-anchor="middle" font-size="12">today</text>
<text x="600" y="220" text-anchor="middle" font-size="12">years</text>
</svg>
<figcaption>Figure 20.6. Mosca's inequality. Data recorded during the migration and still secret after a quantum computer exists is exposed. The answer is to make y start now.</figcaption>
</figure>

### What has been done

The response has been fast by the standards of cryptographic migrations. Chrome
and Cloudflare turned on hybrid post-quantum key exchange (X25519 with Kyber,
later with ML-KEM) in TLS in 2023 and 2024; Apple's iMessage moved to its PQ3
protocol in 2024, and Signal added post-quantum key agreement in 2023. By 2025 a
large share of browser traffic to major sites used hybrid key exchange.
Signatures and certificates are moving more slowly, because they are larger,
because the harvest risk does not apply to them, and because the whole public
key infrastructure must move together. The US NSA's CNSA 2.0 guidance (2022)
and NIST's 2024 transition plan both set dates in the early to mid 2030s for
retiring RSA and elliptic curve cryptography in the systems they govern.

### The open problems

Three remain. The **timeline** itself: the engineering problems of error
correction at scale are being solved faster than many expected, and estimates of
the resources needed keep falling; neither trend can be extrapolated with
confidence. The **security of the replacements**, discussed in §20.9: ML-KEM has
had about a decade of focused attack, RSA had forty. That is why hybrids, which
stay secure if either component holds, are the norm for now. And the
**inventory problem**: most organizations do not know where their public-key
cryptography is, in which libraries, devices and protocols, and finding it is the
slow part of $y$. That last problem is not cryptanalysis, but it is where most of
the risk now sits.

## 20.11 How to become a cryptanalyst

*Level: beginner.*

Every attack in this book was found by someone who decided to try. Most of them
were not famous when they did it. Xiaoyun Wang was a mathematics professor
little known outside China before 2004; Thomas Decru was a doctoral graduate;
Aron Gohr worked in a government agency's technical branch, not a university.
What they had in common was a method: learn the target thoroughly, break small
versions first, measure everything, and publish what was found with the
evidence.

### Start by breaking things

The best way in is the one this book has used: break toy versions of real
systems with your own code.

- **The cryptopals challenges**, published from 2013 by the security firm
  Matasano (Thomas Ptacek, Sean Devlin and colleagues), are eight sets of
  exercises that start with hex encoding and end with attacks on real
  constructions: CBC padding oracles, Bleichenbacher's RSA attack, DSA nonce
  recovery, GCM's forbidden attack. Doing them in order is the closest thing to
  an apprenticeship the field has.
- **CryptoHack**, a free site started in 2020, does the same with a gentler
  slope and more public-key mathematics, and keeps score.
- **Capture the flag** competitions (CTFs), from the beginner-friendly picoCTF
  to the hardest qualifiers of DEF CON's CTF, almost always have a cryptography
  category: a broken scheme, a flawed implementation, a key to recover under a
  time limit.
- **The toy ciphers** of this book's chapters, extended: write the Toy16 of
  [Chapter 5](05-Differential-Cryptanalysis.md) with a new S-box and attack it;
  break 4-round AES with the Square attack of
  [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md); factor your own
  moduli with the quadratic sieve of [Chapter 11](11-Factoring.md).

!!! note "Life story: the cryptopals challenges"
    **Born:** 2013, Matasano Security (Thomas Ptacek, Sean Devlin, Alex
    Balducci, Marcin Wielgoszewski), first sent by email in sets of eight ·
    **Purpose:** teach programmers to break real cryptographic constructions by
    doing it · **Helped:** trained a generation of security engineers and
    cryptographers; many CTF and job interview problems descend from them ·
    **Status:** current and free; the eighth set, on harder public-key and
    polynomial attacks, came later than the first seven

### A reading list by level

**Beginner.** Simon Singh, *The Code Book* (1999), for the history and the
spirit; David Kahn, *The Codebreakers* (1967, revised 1996), for the full
history before computers; book 1 of this shelf,
[The cryptography book](../../book/index.md), for how each system is built.

**Intermediate.** Jean-Philippe Aumasson, *Serious Cryptography* (2017, second
edition 2024), for modern primitives with their attacks; Jonathan Katz and
Yehuda Lindell, *Introduction to Modern Cryptography* (third edition 2020), for
definitions and proofs; Dan Boneh and Victor Shoup, *A Graduate Course in
Applied Cryptography* (free online, versions since 2015), for both; Douglas
Stinson and Maura Paterson, *Cryptography: Theory and Practice* (fourth edition
2018); Howard Heys's *Tutorial on Linear and Differential Cryptanalysis* (2002),
the source of most toy SPN exercises including this book's.

**Expert.** Lars Knudsen and Matthew Robshaw, *The Block Cipher Companion*
(2011); Antoine Joux, *Algorithmic Cryptanalysis* (2009); Steven Galbraith,
*Mathematics of Public Key Cryptography* (2012); Joan Daemen and Vincent Rijmen,
*The Design of Rijndael* (2002, second edition 2020); Eli Biham and Adi Shamir,
*Differential Cryptanalysis of the Data Encryption Standard* (1993); and the
*Handbook of Applied Cryptography* by Alfred Menezes, Paul van Oorschot and
Scott Vanstone (1996), free online and still the best reference for
classical algorithms.

### The classic papers

A cryptanalyst should read a dozen originals, not summaries. A starting dozen,
each taught in this book: C. E. Shannon, "Communication theory of secrecy
systems" (1949); Whitfield Diffie and Martin Hellman, "New directions in
cryptography" (1976); Martin Hellman, "A cryptanalytic time-memory trade-off"
(1980) ([Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)); Arjen Lenstra,
Hendrik Lenstra and László Lovász, "Factoring polynomials with rational
coefficients" (1982), the LLL paper; Eli Biham and Adi Shamir, "Differential
cryptanalysis of DES-like cryptosystems" (1991); Mitsuru Matsui, "Linear
cryptanalysis method for DES cipher" (1993); Paul Kocher, "Timing attacks on
implementations of Diffie-Hellman, RSA, DSS, and other systems" (1996); Don
Coppersmith, "Small solutions to polynomial equations, and low exponent RSA
vulnerabilities" (1997); Daniel Bleichenbacher, "Chosen ciphertext attacks
against protocols based on the RSA encryption standard PKCS #1" (1998); Xiaoyun
Wang and Hongbo Yu, "How to break MD5 and other hash functions" (2005); Serge
Vaudenay, "Security flaws induced by CBC padding" (2002); and Wouter Castryck
and Thomas Decru, "An efficient key recovery attack on SIDH" (2023).

### Where the work happens

The IACR's conferences are the center: CRYPTO, EUROCRYPT and ASIACRYPT for
everything; Fast Software Encryption (whose papers now appear in the journal
*IACR Transactions on Symmetric Cryptology*) for ciphers and hashes; CHES (with
*Transactions on Cryptographic Hardware and Embedded Systems*) for side
channels; PKC for public-key systems; PQCrypto for post-quantum. Real World
Crypto, held each year since 2012, is where academic attacks meet deployed
systems, and its talks are recorded and free. The **Cryptology ePrint Archive**
(eprint.iacr.org) is where new results appear first; reading its new listings
once a week is the habit that keeps a cryptanalyst current. Most of these
conferences hold summer schools and accept student volunteers, and their rump
sessions are where to watch the field have fun.

### What to try first

Pick a cipher submitted to a competition that is small, documented and less
studied than the winners, read its specification, and attack a reduced version
with the methods of Part II: a difference distribution table, a trail search, a
square property, a slide. Most attempts find nothing. Some find a property
the designers missed, and a short paper describing it, with code, is how most
cryptanalysts started.

## 20.12 Where this book ends and the shelf goes on

*Level: beginner.*

### The book in one page

Part I set the rules. [Chapter 1](01-What-Cryptanalysis-Is.md) defined attacks
by model and cost and measured them against the generic attack.
[Chapter 2](02-Breaking-Classical-Ciphers.md) broke classical ciphers by
counting, [Chapter 3](03-Machines-and-the-War.md) broke the war's machines by
their structure and their operators, and
[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md) priced the attacks that
ignore structure: exhaustive search, birthdays, meet in the middle and
trade-offs.

Part II looked inside secret-key cryptography.
[Chapter 5](05-Differential-Cryptanalysis.md) followed differences and
[Chapter 6](06-Linear-Cryptanalysis.md) followed linear approximations through
S-boxes; [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md) added
integral, algebraic, slide, related-key and biclique attacks, and said what
"AES is unbroken" means. [Chapter 8](08-Attacks-on-Stream-Ciphers.md) broke
stream ciphers from LFSRs to RC4 and A5/1, [Chapter 9](09-Breaking-Hash-Functions.md)
broke MD5 and SHA-1, and [Chapter 10](10-Attacks-on-Modes-and-MACs.md) broke the
modes and MACs around sound ciphers.

Part III attacked the problems under public keys:
[Chapter 11](11-Factoring.md) factoring, [Chapter 12](12-Discrete-Logarithms.md)
discrete logarithms, [Chapter 13](13-Attacks-on-RSA.md) RSA as it is used,
[Chapter 14](14-Attacks-on-Signatures-and-Nonces.md) signatures through their
nonces, [Chapter 15](15-Lattices-as-a-Weapon.md) lattices as the tool behind
many of them, and [Chapter 16](16-Breaking-Post-Quantum-Candidates.md) the
post-quantum candidates that fell.

Part IV left the mathematics for the machines and the systems:
[Chapter 17](17-Side-Channels-the-Attackers-View.md) side channels,
[Chapter 18](18-Random-Numbers-Gone-Wrong.md) random numbers,
[Chapter 19](19-Protocol-Breaks.md) protocols, and this chapter the future.

If the book has one lesson, it is the one from
[Chapter 3](03-Machines-and-the-War.md): structure leaks, operators leak more.
The mathematics of good modern algorithms has held for decades, and the breaks
that cost real people real secrets have come almost entirely from the
structure around it, written and run by people.

### The rest of the shelf

This book is the second of a shelf. [The cryptography book](../../book/index.md),
book 1, builds every system this book attacks, and is the place to go when an
attack makes sense only once you know what it is attacking. *The mathematics of
cryptography* ([../mathematics/index.md](../mathematics/index.md)) teaches the
number theory, algebra, probability and lattice reduction that the attacks of
Parts II and III use, with LLL and BKZ in full. *Protocols*
([../protocols/index.md](../protocols/index.md)) tells the full stories of the
protocol breaks of [Chapter 19](19-Protocol-Breaks.md), from Needham-Schroeder
to TLS and KRACK, and how the protocols were rebuilt.
*Post-quantum cryptography* ([../post-quantum/index.md](../post-quantum/index.md))
builds the lattice, code, hash-based, multivariate and isogeny schemes whose
open problems §20.9 listed, and tells the SIKE and Rainbow breaks from the
inside. Later books on advanced protocols and privacy, cryptographic
engineering, and the history of cryptography follow.

### A settlement 3 to 22 light-minutes away

Picture what a settlement on Mars asks of all this. Its link to Earth has a
one-way delay of 3 to 22 minutes, depending on where the two planets are in
their orbits, and is cut off entirely for about two weeks around solar
conjunction. Interactive handshakes that take several round trips cost the
better part of an hour; certificate checks against a server on Earth may not be
possible at all. Patches arrive late, and the settlement cannot count on a
vendor's 90-day embargo reaching it in time. Its records, from medical files
to the designs of its habitats, must stay secret for the lifetime of the
settlement, which puts it squarely on the wrong side of Mosca's inequality
unless it starts with quantum-safe key exchange. What such a place needs is the
conservative choice at every layer: algorithms with wide, measured margins
(AES-256, SHA-3 or SHA-2 at 384 bits and up, ML-KEM-1024 in a hybrid with a
classical exchange); hash-based signatures for software updates, because they
rest on the fewest assumptions; protocols that complete in one message and
tolerate delay; local copies of everything needed to verify; and, sooner or
later, people on site who can read a paper on the ePrint archive and judge for
themselves whether it matters. Cryptanalysis does not stay on Earth; neither
can the cryptanalysts.

## 20.13 Going deeper

*Level: expert.*

**Margins in better units.** Counting rounds is crude. Researchers have proposed
measuring margins by the number of rounds needed for full diffusion, by the
proven bound on the best trail at each round count, or by the fraction of the
design's own claimed security that remains. For AES, the wide trail bound of
[Chapter 5](05-Differential-Cryptanalysis.md) gives at least 25 active S-boxes in
four rounds and so at most $2^{-150}$ for any four-round characteristic; the
best actual attacks need 7 rounds because they use differentials, structures and
key guessing that trail bounds do not capture. The open question in this
direction is a lower bound for whole differentials and linear hulls, not single
trails, over many rounds of AES; the best known results bound the expected
probability over keys, which is not the same as the probability for a given key.

**The dual attack, precisely.** A dual attack on LWE with secret $\mathbf s$
finds short vectors $\mathbf w$ with $\mathbf w^\top A \equiv \mathbf 0$ on the
part of the secret not being guessed, and computes $\mathbf w^\top \mathbf b$.
For a correct guess this is $\mathbf w^\top \mathbf e$ plus a known term, small
and biased toward 0; for a wrong guess the MATZOV-style analysis treated it as
uniform and independent across guesses, which is what Ducas and Pulles showed to
be false in their experiments: with many short vectors from one sieve, wrong
guesses can score as high as the right one because the vectors are themselves
correlated. Provable versions repair this by using fewer vectors or by changing
the statistical test, and lose part of the gain. Whether the remaining gap
between the dual and primal attacks can be closed, in either direction, is open.

**Quantum cryptanalysis of symmetric primitives.** Grover's square-root speedup
is the generic quantum attack, but it is not the only one. In the "Q2" model,
where the attacker can query the keyed primitive in quantum superposition,
Simon's algorithm breaks the Even-Mansour construction, the three-round Feistel
distinguisher and several MAC and authenticated encryption modes in polynomial
time (Kaplan, Leurent, Leverrier and Naya-Plasencia, 2016). The model is
unrealistic for most systems, since a server does not answer quantum queries,
but it shows that classical security proofs do not transfer automatically, and
"offline" versions that need only classical queries have since been found with
smaller gains. Whether any standard primitive or mode loses more than Grover's
factor in a realistic quantum model is open.

**Machine learning beyond distinguishers.** The more promising uses of learning
in cryptanalysis may be indirect: choosing which trails or cubes a solver should
explore, ranking key guesses in side-channel attacks, or learning the
distribution of wrong-key scores that statistical attacks assume. Each of these
replaces a heuristic with a fitted model, and each needs the same scrutiny as the
heuristic: is the model's error accounted for in the claimed success probability?

**The gap between estimates and experiments.** For lattices, codes and
multivariate systems, the cost estimates that set parameters extrapolate from
experiments at small sizes, typically up to dimensions of about 180 for SVP
records, to cryptographic sizes of 400 to 900. The extrapolations have so far
been confirmed whenever records advanced. A sustained deviation, in either
direction, would be the most important result the field could produce, and
nobody knows whether to expect one.

**A closing problem.** Every competition in §20.4 ended with an algorithm whose
security rests on the failure of public cryptanalysis. That failure is
evidence, and over decades it has been very good evidence. But it is evidence
only to the extent that people keep trying. The single most important open
problem is not mathematical: it is keeping enough skilled people attacking the
algorithms the world depends on, and publishing what they find.

## Check yourself

??? question "1. A headline says that researchers have broken AES. The paper attacks 7 rounds of AES-128 with $2^{100}$ chosen plaintexts. What should a user do, and why?"

    Nothing. AES-128 has 10 rounds, so the full cipher is not attacked; the data
    and time are far out of reach; and 7-round attacks have existed since about
    2008. The result measures the margin (three rounds), which is unchanged.

??? question "2. Why is a break of a public algorithm published at once, while a break of a product waits for a patch?"

    Nobody runs an algorithm that is still a candidate, and the community gains
    from knowing at once. A product break is usable immediately against real users,
    so publishing before a fix hands it to criminals; coordinated disclosure gives
    the vendor time, with a deadline (commonly 90 days) so the users are not left
    exposed forever.

??? question "3. What does a CVE number tell you, and what does it not?"

    It is a unique name for one flaw, so that patches, scanners and advisories
    refer to the same thing. It says nothing by itself about severity, which a
    separate score (CVSS) estimates, or about whether the flaw is in an algorithm,
    an implementation or a configuration.

??? question "4. Name two lessons that the AES, SHA-3 and lightweight competitions share."

    Most designs fall, and cheaply, during the competition; the winner is the
    design whose margin was measured best, usually a simple one (Rijndael, Keccak,
    Ascon); and competitions train cryptanalysts. Any two.

??? question "5. In the code of §20.6, why does the statistic for 7 rounds look random even though Gohr's network distinguishes 7 rounds with 62% accuracy?"

    The code only looks at single bits of the output difference. After 7 rounds
    each bit is nearly unbiased, but combinations of bits and the actual ciphertext
    values (not just their XOR) still carry signal. The network learns those
    combinations; a cryptanalyst can add them by hand as differential-linear masks
    and last-round conditions.

??? question "6. A distinguisher has accuracy $0.5 + \varepsilon$ per sample with $\varepsilon = 2^{-10}$. Roughly how many samples does it need, whether or not it is a neural network?"

    About $1/\varepsilon^2 = 2^{20}$ samples, times a small constant for the
    desired success probability. The cost is set by the statistics of the signal,
    not by how the classifier is built.

??? question "7. Why do SAT solvers suit ARX ciphers better than plain MILP models?"

    Modular addition's differential behavior has an exact bitwise description
    (Lipmaa and Moriai) that becomes a few clauses per bit, while its carries are
    awkward to express as linear inequalities. SAT handles that combinatorial
    structure naturally.

??? question "8. Data must stay secret for 25 years and migration takes 8 years. Mosca's inequality says the data is at risk if a quantum computer arrives within how many years?"

    $x + y = 25 + 8 = 33$. If $z < 33$, data recorded now, or during the migration,
    will still matter when it can be decrypted. That is why key exchange is
    moving to hybrid post-quantum schemes before signatures.

??? question "9. The MATZOV dual attack claimed Kyber-512 lost a few bits. What did Ducas and Pulles object to, and what is the status now?"

    The analysis assumed that the scores of wrong guesses were independent and
    distributed like random values. Their experiments showed that the many short
    dual vectors make the scores correlated, so wrong guesses can look right and
    the claimed gain was not established. Later dual attacks with proofs or better
    heuristics gain less; the primal attack remains the reference, and the exact
    standing of the dual attack is open.

??? question "10. Give four distinct ways a security proof can fail to protect a real system, with one example of each."

    Wrong model (random oracle schemes that are insecure with any real hash,
    Canetti-Goldreich-Halevi); loose reduction (the losses Koblitz and Menezes
    pointed out); wrong proof (OAEP's original proof, found by Shoup, or GCM's for
    non-96-bit nonces); the attack is outside the model (padding oracles and
    Lucky Thirteen against proved record layers, side channels in general).

## What you learned

- A headline is read with six questions: what was attacked, full or reduced,
  which model, what cost against the generic attack, what evidence, and what a
  user should do. Most stories shrink at the first or the fourth
  ([Chapter 1](01-What-Cryptanalysis-Is.md)).
- Breaks of products go through coordinated disclosure: a private report, a CVE
  number, an embargo, a patch and a paper, usually within about 90 days; breaks
  of algorithms go straight to the ePrint archive and, for standards in
  progress, to public lists such as the pqc-forum.
- Open competitions (AES, eSTREAM, SHA-3, CAESAR, NIST post-quantum,
  NIST lightweight) move the breaking to before deployment. Their winners,
  Rijndael, Keccak, ML-KEM and its siblings, Ascon (FIPS 197, FIPS 202,
  FIPS 203 to FIPS 205, SP 800-232), are trusted because of the attacks published
  during them.
- Solvers now search for trails (MILP, SAT), protocol provers for attack traces
  (ProVerif, Tamarin), and estimators for lattice costs; the cryptanalyst still
  chooses the model and the question.
- Gohr's 2019 neural distinguisher broke 11 rounds of Speck32/64 and beat the
  full difference table by using more than differences; it was later explained
  by hand-made features. Machine learning has transformed side-channel
  analysis but has not threatened a full modern cipher.
- Money buys the cheapest attack that works: bounties and exploit prices are for
  implementation flaws, and the Snowden documents showed a vast budget spent
  mostly around cryptography, not through it.
- Security margins in rounds: AES-128 7 of 10, AES-256 about 9 of 14, SHA-256 31
  of 64, SHA-3 about 6 of 24, ChaCha20 7 of 20, Ascon's initialization 7 of 12.
  Watch the trend, not the headline.
- The open public-key problems are the dual attack's true cost, structured
  lattices, CSIDH's quantum parameters and SQIsign's young assumption; the open
  quantum problem is the timeline, and harvest now, decrypt later makes it
  urgent for confidentiality already.
- Proofs fail through their model, their tightness, their errors or what they
  leave out; attackers work in the gaps.
- The way in is breaking things: cryptopals, CryptoHack, CTFs, the toy ciphers of
  this book, the classic papers and the ePrint archive. The full road is in
  [Chapters 2 to 19](02-Breaking-Classical-Ciphers.md), from counting letters to
  [protocol breaks](19-Protocol-Breaks.md).

**Next:** the shelf goes on with [The mathematics of cryptography](../mathematics/index.md),
[Protocols](../protocols/index.md) and [Post-quantum cryptography](../post-quantum/index.md);
[the glossary](Glossary.md) collects the terms of this book.

## Further reading

- Aron Gohr, "Improving attacks on round-reduced Speck32/64 using deep
  learning", CRYPTO 2019.
- Adrien Benamira, David Gerault, Thomas Peyrin and Quan Quan Tan, "A deeper
  look at machine learning-based cryptanalysis", EUROCRYPT 2021.
- Ray Beaulieu, Douglas Shors, Jason Smith, Stefan Treatman-Clark, Bryan Weeks
  and Louis Wingers, "The SIMON and SPECK families of lightweight block
  ciphers", IACR ePrint 2013/404 (the Speck32/64 test vector).
- Nicky Mouha, Qingju Wang, Dawu Gu and Bart Preneel, "Differential and linear
  cryptanalysis using mixed-integer linear programming", Inscrypt 2011.
- Siwei Sun, Lei Hu, Peng Wang, Kexin Qiao, Xiaoshuang Ma and Ling Song,
  "Automatic security evaluation and (related-key) differential characteristic
  search", ASIACRYPT 2014.
- Stefan Kölbl, Gregor Leander and Tyge Tiessen, "Observations on the SIMON
  block cipher family", CRYPTO 2015.
- Bruno Blanchet, "An efficient cryptographic protocol verifier based on Prolog
  rules", CSFW 2001 (ProVerif); Simon Meier, Benedikt Schmidt, Cas Cremers and
  David Basin, "The TAMARIN prover for the symbolic analysis of security
  protocols", CAV 2013.
- David Basin, Ralf Sasse and Jorge Toro-Pozo, "The EMV standard: break, fix,
  verify", IEEE Symposium on Security and Privacy 2021.
- Martin Albrecht, Rachel Player and Sam Scott, "On the concrete hardness of
  Learning with Errors", Journal of Mathematical Cryptology, 2015.
- MATZOV, "Report on the security of LWE: improved dual lattice attack", 2022;
  Léo Ducas and Ludo Pulles, "Does the dual-sieve attack on learning with errors
  even work?", CRYPTO 2023.
- Benjamin Wesolowski, "The supersingular isogeny path and endomorphism ring
  problems are equivalent", FOCS 2021.
- Florian Mendel, Tomislav Nad and Martin Schläffer, "Improving local collisions:
  new attacks on reduced SHA-256", EUROCRYPT 2013.
- Michele Mosca, "Cybersecurity in an era with quantum computers: will we be
  ready?", IEEE Security & Privacy, 2018 (first circulated 2015); Michele Mosca
  and Marco Piani, *Quantum Threat Timeline Report*, Global Risk Institute,
  yearly since 2019.
- Craig Gidney and Martin Ekerå, "How to factor 2048 bit RSA integers in 8 hours
  using 20 million noisy qubits", Quantum, 2021 (preprint 2019); Craig Gidney,
  "How to factor 2048 bit RSA integers with less than a million noisy qubits",
  2025.
- Neal Koblitz and Alfred Menezes, "Another look at 'provable security'",
  Journal of Cryptology, 2007; Ran Canetti, Oded Goldreich and Shai Halevi, "The
  random oracle methodology, revisited", STOC 1998.
- Tetsu Iwata, Keisuke Ohashi and Kazuhiko Minematsu, "Breaking and repairing
  GCM security proofs", CRYPTO 2012.
- Marc Kaplan, Gaëtan Leurent, Anthony Leverrier and María Naya-Plasencia,
  "Breaking symmetric cryptosystems using quantum period finding", CRYPTO 2016.
- NIST, FIPS 197 (AES, 2001), FIPS 202 (SHA-3, 2015), FIPS 203, FIPS 204 and
  FIPS 205 (2024), SP 800-232 (Ascon, 2025), and the reports for each round of
  the AES, SHA-3, post-quantum and lightweight processes.
- James Ball, Julian Borger and Glenn Greenwald, "Revealed: how US and UK spy
  agencies defeat internet privacy and security", *The Guardian*, 5 September
  2013; Barton Gellman and Greg Miller, "U.S. spy network's successes, failures
  and objectives detailed in 'black budget' summary", *Washington Post*, 29
  August 2013.
- The cryptopals crypto challenges (cryptopals.com), CryptoHack
  (cryptohack.org), and the IACR Cryptology ePrint Archive (eprint.iacr.org).
