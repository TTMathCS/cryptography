# 18. The internet era

*In 1993 almost nothing on the web was encrypted. By 2020 almost everything was. This chapter tells how that happened, from the programmers at Netscape who wrote SSL in 1994 and 1995 to the free certificates of Let's Encrypt and the encrypted messages of a billion phones. It is also the story of the public competition that chose AES, of the hash functions that broke one after another, of the bugs and the bad random numbers that did more damage than any cryptanalyst, of what Edward Snowden's documents showed about a standard, and of the second argument over whether governments may demand a way in. You will rebuild the check that makes Certificate Transparency work, run ChaCha's mixing step against its published test vector, watch a hash chain erase the past, and crack a stolen password file with and without a salt. The technical detail of each attack lives in the books that own it, and each section says where.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Netscape's SSL (1995, 1996) became TLS (1999 to 2018), who wrote each version, and what the attacks with names (BEAST to DROWN) show about thirty years of protocol design;
    - how a Finnish student's response to a password-sniffing attack became SSH, and how OpenSSH took it over;
    - why the trust in certificates failed at DigiNotar in 2011 and what Certificate Transparency and Let's Encrypt did about it;
    - how NIST ran the first open competition for a cipher (1997 to 2000), who the fifteen candidates and five finalists were, and why Rijndael won;
    - how stream ciphers, ChaCha and authenticated encryption replaced RC4 and bare CBC;
    - how MD5 and SHA-1 fell, who broke them, what SHA-3 was for, and how password hashing changed;
    - the Debian OpenSSL bug, the shared primes and Heartbleed, one paragraph each;
    - the story of Dual_EC_DRBG, the Snowden documents and what they changed;
    - how end-to-end encryption went from a 2004 research paper to the default on a billion phones, and what the argument over it was about through 2020;
    - what Bitcoin added, in one page.

    **You need:** [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md) (RSA, Diffie-Hellman, PGP and the export rules of the first crypto war) and [chapter 16](16-Feistel-Lucifer-and-DES.md) (DES and why its key fell). Nothing else; the mathematics is kept to birthdays and a greatest common divisor. [Book 1, chapter 7](../../book/07-AES.md) teaches how AES works and [book 1, chapter 9](../../book/09-Hash-Functions.md) how hashes are built; this chapter tells the people and the dates.

    **Levels:** §18.1, §18.2, §18.4, §18.6, §18.7, §18.10, §18.14 and §18.15 are for beginners, §18.3, §18.5, §18.8, §18.9, §18.11 to §18.13 and §18.16 are intermediate, §18.17 is expert.

## 18.1 The problem: a network of strangers

*Level: beginner.*

The internet that existed before 1993 was a network of institutions. The universities, laboratories and military sites that used it had known each other for years, and the passwords that gave a person access to a machine crossed the network in plain text because nobody had thought anyone would be listening. They were listening. In February 1994 the CERT Coordination Center, at Carnegie Mellon University, issued an advisory warning that attackers had installed packet sniffers at many sites and were collecting login names and passwords as they passed. The advice was to stop sending reusable passwords over the network at all.

At the same moment the network opened to everyone else. The European physics laboratory CERN put the code of the World Wide Web into the public domain in April 1993, and in the same year the National Center for Supercomputing Applications in Illinois released Mosaic, the first browser with pictures that ordinary people could install. A company founded in April 1994 by Jim Clark and a former Mosaic programmer, Marc Andreessen, shipped a better browser at the end of that year and went public in August 1995 in one of the most closely watched stock offerings the technology industry had seen up to then. That company was Netscape, and it wanted something none of the earlier internet had needed: strangers who would give their credit-card number to a machine they had never seen.

That asks for three things at once. The first is **secrecy**: nobody on the path between the customer and the shop may read the card number. The second is **identity**: the customer must know the machine really belongs to the shop and not to someone who has set up a copy of it. The third is **integrity**: nobody may change the order from one book to ten. The customer and the shop had never met, so they had no shared secret to start from. This is exactly the situation that public-key cryptography, covered in [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md), was invented for. RSA dated from 1977, and Diffie and Hellman had shown how two strangers could agree on a key in 1976. Between 1977 and 1995 almost nobody outside the banks and the governments had used either one. What the 1990s did was take that mathematics and put it inside software that a person with no training would use every day, without being asked.

It did not happen smoothly. The United States still treated strong cryptography as a munition. Software that left the country could use at most a 40-bit key for its symmetric cipher, a size that a student with a few dozen computers could search (Damien Doligez of the French research institute INRIA broke a challenge session encrypted that way in August 1995, using a few days of spare time on about a hundred workstations, and Ian Goldberg at Berkeley solved RSA's own 40-bit challenge in about three and a half hours in January 1997, as the accounts I have read give it; I have not seen the original postings). The patent on RSA belonged to a company, RSA Data Security, until September 2000. And the people who wrote the first protocols were learning, in public, that a protocol can be wrong even when every cipher inside it is right. This chapter follows the era in the order that the problems arrived, and Figure 18.1 sets the dates side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 498" width="640" role="img" aria-label="Timeline of the internet era from 1993 to 2020" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="490" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1993</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">Mosaic browser; the web opens to the public</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">1994</text>
<circle cx="102" cy="48" r="3.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start">Netscape founded; a first web purchase with encryption</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">1995</text>
<circle cx="102" cy="74" r="3.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start">SSL 2.0 in Navigator; Ylönen writes SSH</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">1996</text>
<circle cx="102" cy="100" r="3.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start">SSL 3.0 (Kocher, Karlton, Freier)</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">1997</text>
<circle cx="102" cy="126" r="3.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start">NIST announces the AES competition</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">1999</text>
<circle cx="102" cy="152" r="3.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start">TLS 1.0; OpenSSH</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">2000</text>
<circle cx="102" cy="178" r="4.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start" font-weight="bold">Rijndael chosen (2 October)</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">2004-05</text>
<circle cx="102" cy="204" r="3.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start">Wang breaks MD5 and weakens SHA-1</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">2008</text>
<circle cx="102" cy="230" r="3.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start">Debian key bug found; Bitcoin paper</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">2011</text>
<circle cx="102" cy="256" r="3.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start">DigiNotar; the CA/Browser Forum's rules</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">2012</text>
<circle cx="102" cy="282" r="4.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start" font-weight="bold">Keccak chosen for SHA-3 (2 October)</text>
<text x="88" y="313" font-size="14" text-anchor="end" font-weight="bold">2013</text>
<circle cx="102" cy="308" r="3.5" fill="currentColor"/>
<text x="118" y="313" font-size="14" text-anchor="start">Snowden documents; Certificate Transparency</text>
<text x="88" y="339" font-size="14" text-anchor="end" font-weight="bold">2014</text>
<circle cx="102" cy="334" r="3.5" fill="currentColor"/>
<text x="118" y="339" font-size="14" text-anchor="start">Heartbleed; POODLE; IETF: monitoring is an attack</text>
<text x="88" y="365" font-size="14" text-anchor="end" font-weight="bold">2015</text>
<circle cx="102" cy="360" r="3.5" fill="currentColor"/>
<text x="118" y="365" font-size="14" text-anchor="start">Let's Encrypt; Argon2 wins; FREAK, Logjam</text>
<text x="88" y="391" font-size="14" text-anchor="end" font-weight="bold">2016</text>
<circle cx="102" cy="386" r="3.5" fill="currentColor"/>
<text x="118" y="391" font-size="14" text-anchor="start">WhatsApp end-to-end; Apple and the FBI</text>
<text x="88" y="417" font-size="14" text-anchor="end" font-weight="bold">2017</text>
<circle cx="102" cy="412" r="3.5" fill="currentColor"/>
<text x="118" y="417" font-size="14" text-anchor="start">SHAttered: the first SHA-1 collision</text>
<text x="88" y="443" font-size="14" text-anchor="end" font-weight="bold">2018</text>
<circle cx="102" cy="438" r="4.5" fill="currentColor"/>
<text x="118" y="443" font-size="14" text-anchor="start" font-weight="bold">TLS 1.3 published (RFC 8446)</text>
<text x="88" y="469" font-size="14" text-anchor="end" font-weight="bold">2020</text>
<circle cx="102" cy="464" r="3.5" fill="currentColor"/>
<text x="118" y="469" font-size="14" text-anchor="start">SHA-1 chosen-prefix collision; EARN IT bill</text>
</svg>
<figcaption>Figure 18.1. The internet era in eighteen dates. Bold marks the two open competitions' results (2000, 2012) and the year TLS 1.3 became a standard (2018).</figcaption>
</figure>

Three things will recur, and they are worth saying now. The first is that the algorithms mostly held. AES, SHA-2, RSA and the elliptic curves of the period have no practical attack that the public knows of; the damage came from the protocol around them, from programs that failed to check a length, from random numbers that were not random, and from the institutions that issued certificates. The second is that open processes beat closed ones. DES was chosen behind closed doors and spent twenty years under suspicion ([chapter 16](16-Feistel-Lucifer-and-DES.md)); AES and SHA-3 were chosen in public competitions and nobody has seriously doubted them. The third is the opposite lesson: Dual_EC_DRBG, a standard with an unexplained constant, was the one place where the suspicion turned out to be justified. The final section of the chapter draws these together.

## 18.2 SSL at Netscape

*Level: beginner.*

Netscape's engineers began on the problem in 1994. The first design for a secure channel between a browser and a server was written by Kipp Hickman, a Netscape programmer, and was called the **Secure Sockets Layer**. The name says where it sits: below the web's own protocol (HTTP) and above the plain network connection (TCP), so that a web page, an e-mail program or anything else could be run through it unchanged. A first version, 1.0, was never released: as the usual account goes it had serious flaws that Netscape's own review found before the public did. Version 2.0 shipped in Navigator in 1995.

Its plan is the one every later version kept. When a browser connects, the two sides first agree on which ciphers they both understand. The server sends a **certificate**, a short signed statement that a given public key belongs to a given web address, so that the browser can check who it is talking to. The browser makes a fresh random secret, encrypts it under the server's RSA key and sends it, and both sides turn that secret into keys for a fast symmetric cipher, which protects all the traffic that follows, together with a check value so that tampering is noticed. The padlock appeared in the corner of the window, and a person who knew nothing about RSA could tell that the page they were looking at had been delivered in private. Netscape shipped two builds: a "domestic" one that used up to 128-bit keys and an "international" one limited by the export rules to 40 bits, with a 512-bit RSA key.

There had been encrypted purchases before. A story told often, and checkable in the press of the time, has it that on 11 August 1994 a man in Philadelphia, Phil Brandenberger, bought a compact disc of Sting's music from a company called NetMarket through a web page, with his card number protected by PGP, and that the sale was reported as the first secure retail transaction on the internet; the date is the one usually given, and I have not seen the sales record. SSL turned that one-off into a feature built into the browser.

SSL 2.0 was not good. Within a year, researchers and Netscape's own reviewers had found the following problems, which later versions had to fix.

- The check value did not cover everything: the length of the padding and parts of the handshake were not protected, so an attacker could change them and the two ends would not notice.
- The list of ciphers the browser offered was not authenticated, so an attacker in the middle could delete the strong ones from the list and push both sides down to the weak export cipher. This is the first **downgrade attack** in the history of the web, and the reason that every later protocol checks a transcript of the whole handshake at the end.
- The same keys were used for encryption and for the check value in some modes.
- A connection could be cut short without either side noticing, so a message could be truncated.

Separately, in the autumn of 1995 two Berkeley students, Ian Goldberg and David Wagner, took apart Netscape's Navigator and found that its random numbers were seeded from the time of day and the process numbers of the program, values an attacker on the same network could guess. They could recover the "secret" session key in minutes. They published their results in *Dr. Dobb's Journal* in January 1996 under the title "Randomness and the Netscape Browser." Netscape fixed the problem and announced, among the first companies to do so, a cash reward for security bugs. [Cryptanalysis, chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md) works the attack in full; the point for this chapter is that it was the first of a long series in which the key was safe in principle and guessable in fact. A related weakness will return in §18.11, in Debian's version of OpenSSL, with the same cause thirteen years later.

!!! note "Life story: SSL 2.0"
    **Born:** 1995 in Netscape Navigator, from the design by Kipp Hickman begun in 1994; version 1.0 was never released · **Purpose:** to encrypt web traffic between a browser and a server, so that credit-card numbers could cross the open internet · **Helped:** the first padlock; the first mass use of public-key cryptography by people who had never heard of it · **Retired:** deprecated by the IETF in 2011 (RFC 6176) · **Replaced by:** SSL 3.0 (1996) and TLS

Netscape's reply to the problems was a full redesign, SSL 3.0, in the second half of 1996. It was written by Alan Freier, Philip Karlton and Paul Kocher. Karlton was a Netscape engineer; Freier worked with him; Kocher was an independent cryptographer, then in his early twenties and already known for the timing attack on RSA that he published in the same year (told in [chapter 19](19-Hardware-Quantum-and-the-Long-View.md)). The authenticated handshake, in which the last messages of both sides carry a hash of everything that came before, was their addition, and so were the separate keys for encryption and for the check value. The public review of the redesign was by outsiders, among them David Wagner and Bruce Schneier, who published an analysis of it in 1996. It reported small weaknesses and, as I read the summary, no fatal one. The new version spread, with a long life: the last browsers and servers still allowed it in 2014, when the attack called POODLE finished it off (§18.3).

The cryptographer most often named as the architect of Netscape's security is Taher Elgamal. Born in Cairo in 1955, he took his doctorate at Stanford under Martin Hellman, and in 1984 and 1985 published the public-key encryption and signature systems that still carry his name (the signature scheme is the ancestor of the US Digital Signature Algorithm). He joined Netscape in 1995 as its chief scientist and led the work on SSL 3.0 there, and he is often called the father of SSL. Kocher's name is on the specification, Hickman's on the first design and Elgamal's on the project. A fair summary is that SSL was a team effort in which Hickman wrote the first draft, Elgamal ran the group, and Kocher and others rebuilt it.

!!! note "Life story: Taher Elgamal"
    **Born:** 1955, Cairo, Egypt; doctorate at Stanford (1984) · **Purpose:** to make public-key cryptography usable in mass software; at Netscape (chief scientist from 1995), to lead the design of SSL 3.0 · **Helped:** ElGamal encryption and the ElGamal signature (1984 to 1985), which are the base of DSA, and the SSL that became TLS · **Status:** later worked in industry on payments and security

!!! note "Life story: Paul Kocher"
    **Born:** 1973 (the year is the one usually given) · **Purpose:** as a student, to attack the way RSA and Diffie-Hellman were implemented, and then to help rebuild the protocol around them · **Helped:** the timing attack (1996), co-author of SSL 3.0 (1996), differential power analysis with Joshua Jaffe and Benjamin Jun (1999) · **Status:** founded Cryptography Research in 1995, which was acquired by Rambus in 2011; one of the people who showed that the key could leak through the hardware (chapter 19)

### In the real world

The sources for SSL are unusually good. Netscape published the SSL 2.0 draft in 1995 and the SSL 3.0 specification in November 1996. In 2011 the IETF published SSL 3.0 as an informational document (RFC 6101), so that the text would not be lost, and the same year prohibited SSL 2.0 (RFC 6176). What the record does not give is the internal story: who argued for what inside Netscape, and how much the export rules shaped the choices. The roles named above come from the author lists of the documents and from later interviews and talks; where they conflict I have given the version that several accounts agree on. The question of who is "the" inventor of SSL has no clean answer, and I have not tried to settle it.

## 18.3 From SSL to TLS 1.3, and the attacks with names

*Level: intermediate.*

Netscape had a rival. In 1995 Microsoft, which had its own browser coming, published a competing protocol called **PCT**, Private Communication Technology, and for a year or so the web faced two incompatible ways to encrypt. A standard was needed, and the Internet Engineering Task Force (IETF), the body that writes the internet's standards as numbered RFCs, took the question up in 1996. The compromise, as the story is usually told, was a new name that belonged to neither company. The IETF's working group took SSL 3.0 as its base, folded in what PCT had done well, and in January 1999 published **TLS 1.0**, *Transport Layer Security*, as RFC 2246. The authors were Tim Dierks and Christopher Allen. TLS 1.0 differs from SSL 3.0 in small ways, a different way to combine the keys and the check value (HMAC in place of an older construction) among them, and the two were deliberately close enough that a TLS 1.0 client could talk to an SSL 3.0 server.

The next three versions each answered attacks on the one before. TLS 1.1 (RFC 4346, April 2006) fixed the way CBC-mode ciphers chained their blocks across records. TLS 1.2 (RFC 5246, August 2008) allowed SHA-256 in place of the MD5 and SHA-1 combination that TLS 1.0 and 1.1 hard-wired, and added authenticated modes of encryption such as AES-GCM (§18.8). TLS 1.3 was a rewrite, told below. Figure 18.2 draws the family; the last browsers dropped TLS 1.0 and 1.1 around 2020, and the IETF deprecated both in RFC 8996 in March 2021.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The family of SSL and TLS versions, 1994 to 2018, with the year each was deprecated" fill="currentColor" font-size="14">
<text x="20" y="24" font-size="14" font-weight="bold">published</text>
<text x="20" y="196" font-size="14" font-weight="bold">deprecated</text>
<rect x="104" y="36" width="76" height="40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="142" y="52" font-size="12" text-anchor="middle">SSL 1.0</text>
<text x="142" y="68" font-size="12" text-anchor="middle" opacity="0.8">never out</text>
<rect x="196" y="36" width="76" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="234" y="52" font-size="12" text-anchor="middle">SSL 2.0</text>
<text x="234" y="68" font-size="12" text-anchor="middle" opacity="0.8">1995</text>
<rect x="288" y="36" width="76" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="326" y="52" font-size="12" text-anchor="middle">SSL 3.0</text>
<text x="326" y="68" font-size="12" text-anchor="middle" opacity="0.8">1996</text>
<rect x="380" y="36" width="76" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="418" y="52" font-size="12" text-anchor="middle">TLS 1.0</text>
<text x="418" y="68" font-size="12" text-anchor="middle" opacity="0.8">1999</text>
<rect x="472" y="36" width="76" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="510" y="52" font-size="12" text-anchor="middle">TLS 1.1</text>
<text x="510" y="68" font-size="12" text-anchor="middle" opacity="0.8">2006</text>
<rect x="564" y="36" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="594" y="52" font-size="12" text-anchor="middle">TLS 1.2</text>
<text x="594" y="68" font-size="12" text-anchor="middle" opacity="0.8">2008</text>
<line x1="180" y1="56" x2="194" y2="56" stroke="currentColor" stroke-width="1.4"/>
<line x1="272" y1="56" x2="286" y2="56" stroke="currentColor" stroke-width="1.4"/>
<line x1="364" y1="56" x2="378" y2="56" stroke="currentColor" stroke-width="1.4"/>
<line x1="456" y1="56" x2="470" y2="56" stroke="currentColor" stroke-width="1.4"/>
<line x1="548" y1="56" x2="562" y2="56" stroke="currentColor" stroke-width="1.4"/>
<rect x="472" y="108" width="152" height="40" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="548" y="124" font-size="12" text-anchor="middle" font-weight="bold">TLS 1.3</text>
<text x="548" y="140" font-size="12" text-anchor="middle" opacity="0.8">2018, RFC 8446</text>
<line x1="594" y1="76" x2="594" y2="108" stroke="currentColor" stroke-width="1.4"/>
<text x="234" y="196" font-size="12" text-anchor="middle">2011</text>
<text x="326" y="196" font-size="12" text-anchor="middle">2015</text>
<text x="418" y="196" font-size="12" text-anchor="middle">2021</text>
<text x="510" y="196" font-size="12" text-anchor="middle">2021</text>
<line x1="234" y1="76" x2="234" y2="182" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity="0.6"/>
<line x1="326" y1="76" x2="326" y2="182" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity="0.6"/>
<line x1="418" y1="76" x2="418" y2="182" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity="0.6"/>
<line x1="510" y1="76" x2="510" y2="108" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity="0.6"/>
<text x="20" y="232" font-size="12" opacity="0.85">RFC 6176 (2011) bans SSL 2.0; RFC 7568 (2015) bans SSL 3.0; RFC 8996 (2021) deprecates TLS 1.0 and 1.1.</text>
</svg>
<figcaption>Figure 18.2. The SSL and TLS family. Each version replaced the one before; the dashed lines run to the year the IETF formally retired it.</figcaption>
</figure>

Between 1998 and 2017 researchers found, one after another, ways to break pieces of the protocol that its designers had thought safe. The attacks have names, and the names are how engineers talk about them: BEAST, CRIME, POODLE, FREAK, Logjam, DROWN, Lucky Thirteen. This chapter does not retell them. The [Protocols book, chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md) tells each in full, grouped by the part of the protocol it hit, and [Cryptanalysis, chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md) explains the mathematics of the padding attacks. What a history can add is the shape of the list, which Figure 18.3 sets out by year, and the names of the people who found them.

<figure class="mars-fig">
<svg viewBox="0 0 640 316" width="640" role="img" aria-label="Timeline of attacks on SSL and TLS from 1998 to 2018" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="308" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1998</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">Bleichenbacher: the RSA padding oracle</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">2002</text>
<circle cx="102" cy="48" r="3.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start">Vaudenay: the CBC padding oracle</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">2009</text>
<circle cx="102" cy="74" r="3.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start">Ray and Dispensa: the renegotiation attack</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">2011</text>
<circle cx="102" cy="100" r="3.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start">BEAST (Duong and Rizzo)</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">2012</text>
<circle cx="102" cy="126" r="3.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start">CRIME (Duong and Rizzo): compression leaks</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">2013</text>
<circle cx="102" cy="152" r="3.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start">Lucky Thirteen (AlFardan, Paterson); RC4 biases</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">2014</text>
<circle cx="102" cy="178" r="3.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start">Heartbleed; POODLE kills SSL 3.0</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">2015</text>
<circle cx="102" cy="204" r="3.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start">FREAK and Logjam: the export rules return</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">2016</text>
<circle cx="102" cy="230" r="3.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start">DROWN (SSL 2 breaks TLS); Sweet32</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">2017</text>
<circle cx="102" cy="256" r="3.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start">ROBOT: Bleichenbacher again, 19 years on</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">2018</text>
<circle cx="102" cy="282" r="4.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start" font-weight="bold">TLS 1.3 removes what these attacks used</text>
</svg>
<figcaption>Figure 18.3. Attacks on SSL and TLS by year of publication. The Protocols book tells each one; the point here is how many were found by outsiders and how long some of them took to come back.</figcaption>
</figure>

Look at who found them. The padding-oracle idea came from outside the protocol's authors: Daniel Bleichenbacher of Bell Labs in 1998 against the RSA padding, Serge Vaudenay of the École Polytechnique Fédérale de Lausanne in 2002 against the CBC padding. Both are told in the Protocols book. The two attacks that fed on the export rules of the first crypto war were found in 2015, long after the rules ended. FREAK was found by a team at INRIA and Microsoft Research (Benjamin Beurdouche and colleagues, among them Karthikeyan Bhargavan) who had written a formal model of TLS and noticed that several servers accepted a downgrade that the model did not allow. Logjam was found by a large team whose first author was David Adrian, with J. Alex Halderman of Michigan, Nadia Heninger and many others. They found that a few popular 1024-bit Diffie-Hellman primes were shared by millions of servers and estimated that a state could precompute the work for the most common one; whether any state has done so is not known from public sources, though the Snowden documents (§18.12) have been read by some as consistent with it. Lucky Thirteen (2013) came from Nadhem AlFardan and Kenneth Paterson at Royal Holloway, University of London. BEAST (2011) and CRIME (2012) came from Thai Duong, a Vietnamese security researcher, and Juliano Rizzo from Argentina. The pattern is a field of researchers from many countries who studied a standard in the open, which was the opposite of how the earlier ciphers of this book were broken.

TLS 1.3 grew out of this list. The IETF working group began on it in 2013 to 2014, and the document, edited by Eric Rescorla (then at Mozilla; he had also co-written the S-HTTP protocol in 1994 and a book on SSL and TLS in 2000), appeared as RFC 8446 in August 2018 after twenty-eight drafts. The group made a decision that is rare in standards work: to remove things. RSA key transport went, so every connection now uses a fresh Diffie-Hellman exchange and a recorded session cannot be decrypted later even if the server's key is stolen (*forward secrecy*). Compression went (CRIME). CBC and RC4 went (BEAST, Lucky Thirteen, POODLE). Renegotiation went, and so did all the options that let an attacker steer the two sides to weak choices. The handshake got shorter, one round trip instead of two, and the certificate is now sent encrypted. Academic teams checked the drafts with formal proof tools while the document was still changing, among them Cas Cremers's group with the Tamarin prover, and the Inria team with the miTLS project. That was the first time a major protocol was analyzed on that scale before it was published and not after.

A fight happened late in the process, and it is worth telling because it shows what the new protocol cost. In 2017 representatives of the financial industry asked the working group to keep a form of static key exchange, so that a company could decrypt its own network traffic for monitoring and regulatory reasons. The group refused: such a key exchange cannot have forward secrecy, and the point of the protocol was to remove it. A separate standards body, ETSI, then published its own specification of an enterprise variant in 2018 under a name that the IETF's participants objected to, since it could be mistaken for TLS. I have the outline of this from the public mailing-list record and the press; I have not checked the ETSI text.

Compare what TLS 1.3 did with the SSL of §18.2. SSL 2.0 was an argument that encryption could be a library call. TLS 1.3 was the result of twenty-three years of finding that it cannot, and a large part of it is a list of things taken out.

!!! note "Life story: TLS 1.3"
    **Born:** 10 August 2018, as RFC 8446, edited by Eric Rescorla after four years of drafts · **Purpose:** to give every connection forward secrecy and a one-round-trip handshake, and to remove every feature that earlier attacks had used · **Helped:** the encrypted web, QUIC (which uses TLS 1.3's handshake), most phones, the mail servers that now encrypt with it · **Status:** the current version; by the end of 2020 it ran a large share of the web's traffic (browser telemetry figures from 2020 put it well over half of the connections to major sites; I give no precise number)

## 18.4 SSH

*Level: beginner.*

At about the time Netscape was writing SSL, a researcher at the Helsinki University of Technology, Tatu Ylönen, found out that someone had installed a password sniffer on his university's network. The attack was one of the wave that the CERT advisory of §18.1 had warned about. Ylönen's answer was to write, in 1995, a replacement for the programs people used to log into other computers (`telnet`, `rlogin`, `rsh`) and to copy files between them. All three sent everything, passwords included, in the clear. His program, which he called **SSH**, for Secure Shell, used a public key to prove the server's identity and a fast cipher to protect the session, and it had a simple way to log in without a password at all: the user generates a key pair and puts the public half in a file on the server. He released it as free software in July 1995 and, as he later told it, had about twenty thousand users in some fifty countries by the end of the year. That number is his, and I have not seen it checked.

The key design choice is the one that made SSH spread so quickly: it did not use certificates. The first time a person connects to a machine, SSH shows the machine's key fingerprint and asks whether to trust it; the answer is stored, and from then on a change is a warning. This is "trust on first use." It is weaker than a certificate in principle, because the first connection can be attacked, and stronger than it looks in practice, because it needs no authority and breaks the way a person can see. Many of the key pairs that guard servers, cloud accounts and the source code of the software industry today are SSH keys. The [Protocols book, chapter 6](../protocols/06-SSH.md) describes the protocol and its keys.

SSH went commercial. In December 1995 Ylönen founded SSH Communications Security, and later releases of the program had restrictive licenses. The OpenBSD project, whose members include Theo de Raadt, Markus Friedl, Niels Provos and Dug Song, took the last free version and rebuilt it, removing the parts that depended on patented or licensed code, and released **OpenSSH** in December 1999 as part of OpenBSD 2.6. It became the default on nearly every Unix-like system. The original SSH protocol, SSH-1, had design flaws, among them a weak integrity check; the IETF working group on the secure shell wrote a second version, SSH-2, published as RFCs 4251 to 4254 in January 2006. OpenSSH dropped SSH-1 in 2017.

!!! note "Life story: SSH and OpenSSH"
    **Born:** July 1995 in Helsinki, written by Tatu Ylönen; OpenSSH released December 1999 by the OpenBSD team · **Purpose:** to log in to a remote computer and copy files without sending passwords in the clear · **Helped:** server administration, cloud services, version control (Git over SSH), tunneling of other protocols; the model of "trust on first use" · **Status:** current; SSH-2 is RFC 4251 to 4254 (2006), and OpenSSH is the standard implementation

### In the real world

The OpenSSH story is a rare case of a piece of security infrastructure built by volunteers and then trusted by corporations; its team has stayed small. The history of SSH-1's weaknesses (a 1998 attack on its integrity check and the 2001 exploit of the "CRC-32 compensation detector" bug, a buffer overflow in the code written to defend against it) is another instance of the lesson of this chapter: the defense is code too. For both I am relying on the security advisories of the time and have not re-read them.

## 18.5 Who vouches for a key: certificates and the trust problem

*Level: intermediate.*

SSL turned a hard problem into a harder one. The browser held a server's public key, but how did it know the key belonged to the shop and not to a man in a coffee shop who had intercepted the connection? The answer, set out in [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md), was the certificate: a statement signed by an authority, saying that this key belongs to that name. Loren Kohnfelder had proposed the idea in his MIT bachelor's thesis in 1978, and the international standard for the format, X.509, dated from 1988. What SSL did in 1995 was to make it a practical business. The browser shipped with a list of authorities it trusted, called **root certificates**, and any certificate signed by one of them (or by someone a root had signed for, down a chain) was accepted. [Book 1, chapter 16](../../book/16-PKI-and-Key-Establishment.md) and the [Protocols book, chapter 2](../protocols/02-Certificates-and-PKI.md) teach how the chain is checked. This section tells what happened to the trust.

The first authority was VeriSign, founded in April 1995 as a spin-off of RSA Data Security, with Jim Bidzos, who ran RSA Data Security, as its chairman. Its certificates cost hundreds of dollars and it had little competition for several years. In South Africa, Mark Shuttleworth founded a rival, Thawte, in 1995 and sold it to VeriSign in 1999 for a sum reported at several hundred million dollars. By the early 2000s the browsers' lists contained dozens of authorities in dozens of countries, and by the 2010s hundreds, run by companies, governments and universities. The structure had a flaw that anyone could see once it was written down, and it took sixteen years for it to be used. Any one root can sign a certificate for any name. If you trust the list, you trust all of it, and the strength of the whole is the strength of the weakest authority on it.

There had been warnings. In January 2001 VeriSign issued two certificates in Microsoft's name to a person who was not from Microsoft; Microsoft had to issue a software patch to blacklist them. In March 2011 an attacker who has since been associated with Iran broke into a registration partner of the authority Comodo and obtained nine fraudulent certificates for the logins of sites including Google's mail, Yahoo and Mozilla's add-ons. Comodo noticed within hours and revoked them, and the incident passed as a security story and not a crisis. The next was a crisis.

### DigiNotar

DigiNotar was a small Dutch authority, a subsidiary of the American company Vasco, and it issued certificates for the Dutch government's own web services. An attacker was inside its network from June 2011. On 28 August 2011 a user in Iran, who posted under a pseudonym, wrote on a Google support forum that Chrome was warning him about a certificate for `google.com`. Chrome could tell because Google had built the list of its own legitimate certificate authorities into the browser, which is called *pinning*, and the certificate for `*.google.com` signed by DigiNotar was not on it. Investigation showed that the attacker had issued at least 500 certificates, for Google, Yahoo, the Tor Project, the CIA and many others. The Dutch security company Fox-IT, hired to examine the network, wrote in its report ("Operation Black Tulip") that the logs it could recover pointed to the fraudulent Google certificate being used against roughly 300,000 distinct internet addresses, nearly all in Iran, and so against users of Gmail whom a government might wish to watch. Who was behind it is not proven in public; a person using the name "Comodohacker" claimed credit for both this and the Comodo break-in and said he acted alone, and many have suspected state involvement.

The reaction was swift. Mozilla, Google, Microsoft and Apple removed DigiNotar's roots from their products; the Dutch government, which had trusted the company for its citizens' services, took control of its systems; DigiNotar went bankrupt on 20 September 2011. That a company could be put out of existence in three weeks by a browser maker's decision showed where the power in the system lay. It lay with the few companies that decided what was on the list.

!!! note "Life story: DigiNotar"
    **Born:** a Dutch authority that issued certificates before 2011, owned by Vasco · **Purpose:** to vouch for web sites, including the Dutch government's · **Helped:** until June 2011, the ordinary business of certificates · **Retired:** its roots removed from browsers in September 2011; bankrupt on 20 September 2011 · **Replaced by:** the other authorities the Dutch government already used, and a new set of rules for all of them

### What changed

Four things followed, and they changed the web's trust in the following decade.

- **Rules for authorities.** The CA/Browser Forum, a group in which authorities and browser makers had met since 2005 to agree on the rules for a special class of "extended validation" certificates, adopted its *Baseline Requirements* in November 2011, to take effect in July 2012. They set minimum standards for how authorities check an applicant, how they protect their keys and what they must log. The browser makers' power to remove a root, shown at DigiNotar, became the enforcement.
- **Pinning and constraints.** Browsers pinned the names of the few sites that were most likely to be attacked, and a DNS record called CAA (RFC 6844, 2013) let a domain owner say which authorities may issue for it. The pinning scheme meant for ordinary sites (HPKP) proved too easy to misuse and was dropped in the following years.
- **A reckoning for the biggest authority.** In 2015 Google found that Symantec, by then the owner of VeriSign's certificate business, had issued test certificates for `google.com` and other domains that it should not have, and a longer investigation in 2016 and 2017 found many more. Chrome and Firefox announced in 2017 that they would stop trusting Symantec's older roots on a schedule ending in 2018. Symantec sold its certificate business to DigiCert in 2017. A company that in 1995 had been the trusted root of the web was in effect removed from it by the browser makers' decision.
- **Certificate Transparency.** Rather than trust that an authority has not misbehaved, make misbehavior visible.

### Certificate Transparency

The idea came from Google, which had been the target in both break-ins. Ben Laurie, Adam Langley and Emilia Kasper (her surname is spelled Käsper in her academic papers; she was then at Google, and was known for a fast software implementation of AES) designed it in 2011 to 2013 and published it as RFC 6962 in June 2013. Every certificate that an authority issues must be written to a public **log**, an append-only list that anyone can read. The log is built as a Merkle tree, a binary tree of hashes in which each leaf is a certificate and each inner node is the hash of its two children. The top hash commits to the whole list. A site owner, or a company that watches for its own names, can then check the log and see every certificate that exists for its domain, including any it never asked for. A browser can demand that every certificate it accepts carries a signed promise that it is in a log. A forged certificate is still possible, but it can no longer be secret.

Merkle trees are named for Ralph Merkle, whose puzzles were in [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md) and who described the tree in his 1979 Stanford thesis. The program below builds a log of five entries, as RFC 6962 specifies (a leaf is hashed with a zero byte in front and an inner node with a one, so that no leaf can pass for a node). It then proves that one entry is in the log by giving only a handful of hashes, and shows that swapping one certificate changes the head.

```python
import hashlib

# Certificate Transparency (RFC 6962) hashes a leaf with a 0x00 prefix and
# an inner node with a 0x01 prefix, so a leaf can never pass for a node.
def leaf(data):
    return hashlib.sha256(b"\x00" + data).digest()

def node(left, right):
    return hashlib.sha256(b"\x01" + left + right).digest()

def split(n):
    # largest power of two strictly below n (RFC 6962 section 2.1)
    k = 1
    while k * 2 < n:
        k *= 2
    return k

def root(leaves):
    if len(leaves) == 1:
        return leaves[0]
    k = split(len(leaves))
    return node(root(leaves[:k]), root(leaves[k:]))

def proof(leaves, m):
    # the sibling hashes needed to rebuild the root from leaf number m
    if len(leaves) == 1:
        return []
    k = split(len(leaves))
    if m < k:
        return proof(leaves[:k], m) + [("R", root(leaves[k:]))]
    return proof(leaves[k:], m - k) + [("L", root(leaves[:k]))]

certs = [b"example.com key A", b"shop.example key B", b"mail.example key C",
         b"google.com key (real)", b"blog.example key D"]
leaves = [leaf(c) for c in certs]
top = root(leaves)
print("log has", len(certs), "entries; tree head", top.hex()[:16])

# A monitor is shown one entry and the proof, and rebuilds the head
m = 3
h = leaves[m]
for side, sib in proof(leaves, m):
    h = node(h, sib) if side == "R" else node(sib, h)
print("proof for entry", m, "rebuilds the head:", h == top)

# A forged certificate for google.com cannot be slipped in without changing the head
forged = leaves[:]
forged[3] = leaf(b"google.com key (fake)")
print("same head after a swap:", root(forged) == top)
```

Output:

```
log has 5 entries; tree head 3a6e93a7cabbb833
proof for entry 3 rebuilds the head: True
same head after a swap: False
```

For five entries the proof is three hashes. For a log with a billion entries it is about thirty, which is why the logs scale. Google's Chrome began to require that certificates for the high-assurance "extended validation" class appear in the logs in January 2015, and in April 2018 it began to require it of every new certificate. The first big catch came earlier than that: in September 2015 the logs showed that Symantec had issued the improper certificates for Google's domains, which started the sequence of §18.5's third bullet.

!!! note "Life story: Certificate Transparency"
    **Born:** designed 2011 to 2013 at Google by Ben Laurie, Adam Langley and Emilia Kasper; RFC 6962, June 2013 · **Purpose:** to make every certificate public, so that a mistake or a break-in at an authority is found by its victims · **Helped:** the detection of improperly issued certificates since 2015; the browsers' enforcement; the end of the age in which an authority could issue a certificate in secret · **Status:** current, required by Chrome and Safari for new certificates; a revised version is RFC 9162 (2021)

### In the real world

The sources for DigiNotar are the Fox-IT report (the final version was published in August and October 2011), the browser makers' own announcements and the Dutch government's. The number of fraudulent certificates (the figure in Fox-IT's list is 531, which I give as "more than 500") and the figure of 300,000 users are the report's estimates from the logs it could recover; it said the true numbers were probably higher. The Comodo and DigiNotar break-ins were both claimed by one person, and neither claim has been proven. The root trust problem is also shown, on a smaller scale, by the DNS system. The root of the domain name system was cryptographically signed on 15 July 2010 (DNSSEC), a ceremony run with a group of volunteer "trusted community representatives" holding smart cards, as told in the [Protocols book, chapter 10](../protocols/10-DNSSEC-and-Private-DNS.md). It has seen far less use than the certificates of the web.

## 18.6 Let's Encrypt and the encrypted web

*Level: beginner.*

By 2014 the padlock still cost something. A site owner who wanted a certificate had to pay an authority, prove a claim to a name, generate a key, submit a request, install the file and remember to renew it each year or two; the first renewal often fell on a day when nobody remembered. Large companies did it. Small sites, blogs and the servers of volunteer groups mostly did not. In 2014 a large share of the pages that people loaded, probably the majority, were still sent in the clear by the browser makers' own telemetry, and the share was lowest for the long tail of small sites (I give no exact figure).

Then Snowden's documents (§18.12) showed how widely traffic had been collected. Two groups had already been working on a free, automatic authority. One was Mozilla, where Josh Aas worked; the other was the Electronic Frontier Foundation, where Peter Eckersley worked, with J. Alex Halderman and a team at the University of Michigan. They joined as a non-profit named the **Internet Security Research Group** (ISRG), founded in 2013, with Aas as its executive director. They announced **Let's Encrypt** on 18 November 2014. The sponsors who paid for the first years included Mozilla, the EFF, Cisco, Akamai and the authority IdenTrust, which signed the first intermediate certificate so that browsers would trust the new root before they had been updated to include it.

The design had two ideas. The first was that the certificate would be free, because the authority's costs would be paid by sponsors and the cost per certificate was close to zero once everything was automatic. The second was the automation: a program on the web server proves to the authority that it controls the domain (by placing a file the authority names at a known address, or by adding a DNS record), fetches a certificate and installs it, with no person involved. The protocol for this was named **ACME**, the Automatic Certificate Management Environment, and the free client most people used was Certbot. Because renewal was automatic, the certificates could be made short-lived, 90 days, which also shrank the damage of a stolen key. The first certificate was issued in September 2015, the public beta opened on 3 December 2015, and the service left beta on 12 April 2016. The IETF published ACME as RFC 8555 in March 2019, with the authority's own engineers among the authors.

The effect was larger than anyone had forecast. The authority's own count reached one billion certificates issued in February 2020, and by then it was the largest in the world by number. Web hosts and content-delivery networks built it into their products, so that millions of sites switched on encryption without the owners doing anything. The browser makers also pushed: Chrome began to mark ordinary pages that did not use HTTPS as "Not secure" in the address bar, starting in 2017 for pages with forms and for all HTTP pages with Chrome 68 in July 2018. The share of page loads over HTTPS, as the browser telemetry shows, passed half in about 2017 and was above four-fifths by 2020 (rounded figures, from press reports of Chrome and Firefox data; I did not check the dashboards).

One limit needs saying. A Let's Encrypt certificate proves that whoever holds the site controls the domain name. It does not prove that the site is honest. Phishing sites, which need a padlock to look credible, were soon among the authority's users, and the authority's position was that it checks the name and not the intent. The padlock means that the page was delivered in private to the address shown, and nothing else.

!!! note "Life story: Let's Encrypt"
    **Born:** announced 18 November 2014 by the Internet Security Research Group (Josh Aas as executive director, with the EFF, Mozilla and the University of Michigan); first certificate September 2015; public beta 3 December 2015; general availability 12 April 2016 · **Purpose:** to make an HTTPS certificate free, automatic and renewed without a person · **Helped:** the move from a minority of encrypted pages to a large majority; the ACME standard (RFC 8555, 2019) · **Status:** current; a non-profit funded by sponsors and donations

## 18.7 AES: a cipher chosen in public

*Level: beginner.*

[Chapter 16](16-Feistel-Lucifer-and-DES.md) ended with DES in trouble. In July 1998 the Electronic Frontier Foundation's Deep Crack machine found a DES key in a few days, for about \$250,000, and in January 1999 a joint effort with the volunteer network distributed.net cut the time to 22 hours and 15 minutes. NIST had already seen it coming. The standard, in force since 1977, had been renewed for five years at a time, and its renewal in 1999 (FIPS 46-3) allowed single DES only in old systems and made Triple DES the standard: three DES operations in a row with two or three keys. That was strong enough but slow, especially in software, and its 64-bit block became a worry as the volumes of data grew. Something new was needed, and the question of how to get it was as important as the answer.

DES had been chosen in a way many cryptographers distrusted: a cipher offered by a single company, adjusted by an intelligence agency whose role was not stated (the story is in [chapter 16](16-Feistel-Lucifer-and-DES.md)). NIST decided to do the opposite. On 2 January 1997 it announced that it would choose an *Advanced Encryption Standard* by open competition, and in September of that year it published the formal call. The requirements were few: a symmetric block cipher with a 128-bit block and key sizes of 128, 192 and 256 bits, free of royalties worldwide, and meant to last for decades. Anyone could enter. Every entry would be published in full. The world's cryptographers would be invited to attack them in public, and NIST would decide in view of the results on security, speed on many kinds of computers (including the 8-bit smart cards of the time) and ease of implementation. NSA took part by analyzing the candidates for NIST and by reporting its results, though the agency did not publish them itself. The NIST team that ran the project, and signed its reports, included James Nechvatal, Elaine Barker, Lawrence Bassham, William Burr, Morris Dworkin, James Foti and Edward Roback.

By the deadline in June 1998 fifteen designs had come in, from teams in twelve countries by NIST's count. Figure 18.4 lists them. Some were by well-known cryptographers: MARS from an IBM team that included Don Coppersmith, whose 1994 paper told the public what IBM's DES designers had known about differential attacks ([chapter 16](16-Feistel-Lucifer-and-DES.md)), and Carolynn Burwick; RC6 from Ronald Rivest, Matt Robshaw, Ray Sidney and Yiqun Lisa Yin of RSA Laboratories; Twofish from Bruce Schneier, John Kelsey, Doug Whiting, David Wagner, Chris Hall and Niels Ferguson; Serpent from Ross Anderson, Eli Biham and Lars Knudsen. Some came from companies or labs few outside their country had heard of: CRYPTON from Future Systems in Korea, E2 from NTT in Japan, FROG from a Costa Rican firm. LOKI97 was the third in a line of ciphers begun in Australia in 1990 with LOKI, by Lawrence Brown, Josef Pieprzyk and Jennifer Seberry. The first candidate conference met in Ventura, California, in August 1998.

<figure class="mars-fig">
<svg viewBox="0 0 640 394" width="640" role="img" aria-label="The fifteen AES candidates of 1998, with team, country and the five finalists marked" fill="currentColor" font-size="14">
<text x="16" y="20" font-size="13" font-weight="bold">candidate</text><text x="170" y="20" font-size="13" font-weight="bold">submitted by</text><text x="390" y="20" font-size="13" font-weight="bold">country</text><text x="560" y="20" font-size="13" font-weight="bold">result</text>
<line x1="10" y1="27" x2="630" y2="27" stroke="currentColor" stroke-width="1.2"/>
<text x="16" y="47" font-size="14">CAST-256</text><text x="170" y="47" font-size="14">Entrust</text><text x="390" y="47" font-size="14">Canada</text>
<text x="560" y="47" font-size="13">out in 1999</text>
<text x="16" y="69" font-size="14">CRYPTON</text><text x="170" y="69" font-size="14">Future Systems</text><text x="390" y="69" font-size="14">Korea</text>
<text x="560" y="69" font-size="13">out in 1999</text>
<text x="16" y="91" font-size="14">DEAL</text><text x="170" y="91" font-size="14">Knudsen, Outerbridge</text><text x="390" y="91" font-size="14">Norway, Canada</text>
<text x="560" y="91" font-size="13">out in 1999</text>
<text x="16" y="113" font-size="14">DFC</text><text x="170" y="113" font-size="14">ENS, CNRS</text><text x="390" y="113" font-size="14">France</text>
<text x="560" y="113" font-size="13">out in 1999</text>
<text x="16" y="135" font-size="14">E2</text><text x="170" y="135" font-size="14">NTT</text><text x="390" y="135" font-size="14">Japan</text>
<text x="560" y="135" font-size="13">out in 1999</text>
<text x="16" y="157" font-size="14">FROG</text><text x="170" y="157" font-size="14">TecApro</text><text x="390" y="157" font-size="14">Costa Rica</text>
<text x="560" y="157" font-size="13">out in 1999</text>
<text x="16" y="179" font-size="14">HPC</text><text x="170" y="179" font-size="14">Schroeppel</text><text x="390" y="179" font-size="14">US</text>
<text x="560" y="179" font-size="13">out in 1999</text>
<text x="16" y="201" font-size="14">LOKI97</text><text x="170" y="201" font-size="14">Brown, Pieprzyk et al.</text><text x="390" y="201" font-size="14">Australia</text>
<text x="560" y="201" font-size="13">out in 1999</text>
<text x="16" y="223" font-size="14">Magenta</text><text x="170" y="223" font-size="14">Deutsche Telekom</text><text x="390" y="223" font-size="14">Germany</text>
<text x="560" y="223" font-size="13">out in 1999</text>
<text x="16" y="245" font-size="14" font-weight="bold">MARS</text><text x="170" y="245" font-size="14">IBM</text><text x="390" y="245" font-size="14">US</text>
<text x="560" y="245" font-size="13" font-weight="bold">finalist</text>
<text x="16" y="267" font-size="14" font-weight="bold">RC6</text><text x="170" y="267" font-size="14">RSA Laboratories</text><text x="390" y="267" font-size="14">US</text>
<text x="560" y="267" font-size="13" font-weight="bold">finalist</text>
<rect x="10" y="273" width="620" height="21" fill="currentColor" opacity="0.12"/>
<text x="16" y="289" font-size="14" font-weight="bold">Rijndael</text><text x="170" y="289" font-size="14">Daemen, Rijmen</text><text x="390" y="289" font-size="14">Belgium</text>
<text x="560" y="289" font-size="13" font-weight="bold">winner, 2000</text>
<text x="16" y="311" font-size="14">SAFER+</text><text x="170" y="311" font-size="14">Cylink</text><text x="390" y="311" font-size="14">US</text>
<text x="560" y="311" font-size="13">out in 1999</text>
<text x="16" y="333" font-size="14" font-weight="bold">Serpent</text><text x="170" y="333" font-size="14">Anderson, Biham, Knudsen</text><text x="390" y="333" font-size="14">UK, Israel, Norway</text>
<text x="560" y="333" font-size="13" font-weight="bold">finalist</text>
<text x="16" y="355" font-size="14" font-weight="bold">Twofish</text><text x="170" y="355" font-size="14">Counterpane</text><text x="390" y="355" font-size="14">US</text>
<text x="560" y="355" font-size="13" font-weight="bold">finalist</text>
<line x1="10" y1="365" x2="630" y2="365" stroke="currentColor" stroke-width="1.2"/>
</svg>
<figcaption>Figure 18.4. The fifteen AES candidates of 1998. NIST named the five finalists in August 1999 and chose Rijndael on 2 October 2000.</figcaption>
</figure>

The public analysis worked as hoped. Several candidates showed serious weaknesses in the first months, Magenta and FROG among them, some at the first conference and more by the second, in Rome in March 1999 (I am relying on the NIST reports for which fell when). On 9 August 1999 NIST announced five finalists: MARS, RC6, Rijndael, Serpent and Twofish. A third conference, in New York in April 2000, ended with a show of hands in which, as the NIST report gives the count and as I recall it, Rijndael had 86 votes, Serpent 59, Twofish 31, RC6 23 and MARS 13. NIST was not bound by the vote, but it chose Rijndael, announcing it on 2 October 2000. Its report gave the reasons plainly. Serpent had the largest security margin, but was the slowest. MARS and RC6 were fast in some settings and less so in others, and RC6 had a thinner margin. Twofish was good all round but not the best at anything. Rijndael was fast in software and hardware, ran on small smart cards, was easy to implement without a mistake, and had a margin of security that the evaluators thought sufficient. The final standard, **FIPS 197**, was published on 26 November 2001, to take effect in May 2002.

The two designers were **Joan Daemen** and **Vincent Rijmen**, both Belgians who trained at the Katholieke Universiteit Leuven. (Joan is a man's given name in Dutch and Flemish; he is not to be confused with Joan Clarke of [chapter 13](13-Bletchley-Park.md).) The name Rijndael, pronounced about like "Rhine-doll", was made from their two family names. They had built the cipher on a cipher of their own, called Square (1997, with Lars Knudsen), and on a design idea that Daemen's 1995 doctoral thesis had worked out: the **wide trail strategy**, which says that if each round mixes bytes so that a change in one spreads to many others, then any four rounds are guaranteed to contain at least 25 active S-boxes, which puts a hard limit on the best differential and linear attacks ([book 1, chapter 7](../../book/07-AES.md) shows how). AES was the first US federal cipher standard designed outside the United States, and the first to come with an argument of that kind built into the design.

!!! note "Life story: the Advanced Encryption Standard"
    **Born:** announced 2 January 1997; formal call September 1997; fifteen candidates June 1998; five finalists 9 August 1999; Rijndael chosen 2 October 2000; FIPS 197 published 26 November 2001 · **Purpose:** to give the world a public, royalty-free successor to DES, chosen in the open · **Helped:** nearly everything encrypted today: web traffic, disk encryption, Wi-Fi, mobile networks and the secret and top-secret traffic of the US government (NSA approved AES-128 for secret and AES-192 and 256 for top secret in 2003, under CNSS Policy No. 15) · **Status:** current; the 128-bit block, 10, 12 or 14 rounds; Intel added AES instructions to its processors in 2010

!!! note "Life story: Joan Daemen and Vincent Rijmen"
    **Born:** both Belgian; Daemen's thesis at KU Leuven 1995, Rijmen's thesis at KU Leuven 1997 · **Purpose:** to design a cipher that is simple, fast and provably resistant to the two known great attacks · **Helped:** Rijndael (AES) and the earlier Square and SHARK; later Daemen's Keccak, the SHA-3 (§18.9) · **Status:** Daemen is a professor at Radboud University in Nijmegen; Rijmen at KU Leuven

The best attacks on AES have not changed the picture. In 2011 Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger found the "biclique" attack, which recovers an AES-128 key in about $2^{126.1}$ operations, a little under four times faster than trying every key; it is no practical threat, since $2^{126}$ is beyond any possible computer. Related-key attacks on AES-192 and AES-256 found by Alex Biryukov and Dmitry Khovratovich in 2009 matter in theory and do not apply when the keys are chosen sensibly. The weakness that did matter was in the implementations. Table-based AES leaks the key through the timing of memory accesses to the cache, as Daniel Bernstein showed in 2005 and Dag Arne Osvik, Adi Shamir and Eran Tromer in 2006; the cure was hardware instructions, and [chapter 19](19-Hardware-Quantum-and-the-Long-View.md) tells that part. A back-of-envelope number helps with the size of the key space: $2^{128} \approx 3.4 \times 10^{38}$ keys. A machine that tested $10^{18}$ keys a second (a billion billion, far beyond any computer built to test AES keys) would need $3.4 \times 10^{20}$ seconds, about $10^{13}$ years, or roughly 800 times the age of the universe.

Triple DES lasted longer than expected but was on its way out: NIST announced in the 2010s that it would disallow it for new uses and set the end of 2023 as the date it would be retired for good. The open competition became the model. NIST used the same method for the hash function SHA-3 (§18.9), for the post-quantum standards that [chapter 19](19-Hardware-Quantum-and-the-Long-View.md) tells, and for lightweight ciphers. Europe's NESSIE project (2000 to 2003) and Japan's CRYPTREC (2000 to 2003) were set up on the same model, to evaluate algorithms for their own regions, and both recommended AES among others.

### In the real world

The competition's documents are public: the submissions, the conference proceedings, the reports of the first and second rounds, and the final report (October 2000) are all on NIST's pages. What is not public is the NSA's internal analysis. The agency has said that it found all five finalists acceptable, and I have not seen the evidence. The vote count of the third conference is from memory of the NIST report and conference notes and should be checked; the dates of the announcements come from NIST's own documents. Whether Rijndael would still have won if the standard had been written by the other four teams' preferred rules is a question without an answer. Cryptographers who disliked the result usually said that Serpent's larger margin made it the safer choice. Serpent was not chosen; 25 years later no one has broken either.

## 18.8 Stream ciphers, authenticated encryption and other nations' ciphers

*Level: intermediate.*

AES settled the block cipher. The stream cipher, which makes a stream of key bytes and XORs it with the message, had a different history, because the most used one of the age was a mistake that took twenty years to remove.

**RC4** was designed by Ronald Rivest in 1987 for RSA Data Security as a trade secret. In September 1994 someone posted its code to the Cypherpunks mailing list, and its secrecy was over. It was very fast and very short, and it was in SSL (the "40-bit export" mode of §18.2 was RC4), in Lotus Notes and in the Wi-Fi security of 1997, WEP. In 2001 Scott Fluhrer, Itsik Mantin and Adi Shamir showed that the way WEP combined RC4 with a counter leaked the key, and within weeks a team of three at Rice University and AT&T (Adam Stubblefield, John Ioannidis and Aviel Rubin) had broken a real WEP network. In TLS the attack was slower. Weaknesses in the stream's first bytes were known since 2001, and in 2013 Nadhem AlFardan, Daniel Bernstein, Kenneth Paterson, Bertram Poettering and Jacob Schuldt showed how to recover cookies from many millions of TLS connections. The IETF prohibited RC4 in TLS in RFC 7465 in February 2015. The technical attacks are in [Cryptanalysis, chapter 8](../cryptanalysis/08-Attacks-on-Stream-Ciphers.md).

The replacement came from a European project and a mathematician in the United States. The EU's ECRYPT network ran **eSTREAM** from 2004 to 2008, an open competition on the AES pattern for stream ciphers; it ended in April 2008 with a portfolio of seven (as I recall it: four for software, among them Salsa20 and Rabbit, and three for hardware, among them Trivium and Grain). Daniel J. Bernstein, who is the same Bernstein as in the lawsuit of the first crypto war ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)), had entered Salsa20 in 2005 and in 2008 published a variant he called **ChaCha**. It mixes a block of sixteen 32-bit numbers with only additions, XORs and rotations, so it runs in constant time on any processor without table lookups, and the timing leaks that afflict table-based AES do not touch it. Its core is a "quarter round" of four steps. The program below runs it on the test vector in RFC 8439.

```python
MASK = 0xFFFFFFFF

def rotl(x, n):
    return ((x << n) | (x >> (32 - n))) & MASK

def quarter_round(a, b, c, d):
    # ChaCha's whole mixing step: add, xor, rotate, four times
    a = (a + b) & MASK; d = rotl(d ^ a, 16)
    c = (c + d) & MASK; b = rotl(b ^ c, 12)
    a = (a + b) & MASK; d = rotl(d ^ a, 8)
    c = (c + d) & MASK; b = rotl(b ^ c, 7)
    return a, b, c, d

# The test vector in RFC 8439, section 2.1.1
out = quarter_round(0x11111111, 0x01020304, 0x9b8d6f43, 0x01234567)
print(" ".join(f"{x:08x}" for x in out))
print("matches the RFC:", out == (0xea2a92f4, 0xcb1cf8ce, 0x4581472e, 0x5881c4bb))
```

Output:

```
ea2a92f4 cb1cf8ce 4581472e 5881c4bb
matches the RFC: True
```

ChaCha20 does twenty rounds of this on a 4 by 4 grid of words, alternating columns and diagonals. Paired with Bernstein's one-time authenticator **Poly1305** (2005), it gave a complete package. Adam Langley and Wan-Teh Chang of Google put it in Chrome and in Google's servers in 2013 and 2014, mainly for Android phones that lacked AES instructions, where it was several times faster. OpenSSH added it in 2014, the IETF published it as RFC 7539 in 2015 (replaced by RFC 8439 in 2018), and the TLS cipher suites that use it are RFC 7905 (2016). It is also the cipher of WireGuard and, since 2016, of the Linux kernel's random-number generator.

### Encryption without authentication

The larger change was in how ciphers are used. The padding oracle attacks of §18.3 had a common cause: the protocol decrypted before it checked that the message was genuine, and the way it answered revealed something. The cure is to make encryption and authentication one operation, **authenticated encryption with associated data** (AEAD): you give it a key, a unique number called a nonce, a message and any plain header that must be protected too, and it gives back a ciphertext with a tag, and on the other side it either returns the message or refuses and says nothing more. Mihir Bellare and Chanathip Namprempre in 2000 and Hugo Krawczyk in 2001 showed which of the ways to combine a cipher and a MAC are safe and which are not (encrypt, then MAC is the safe order); Phillip Rogaway, who with Mihir Bellare, John Black and Ted Krovetz designed OCB in 2001, formalized the "associated data" in 2002. The mode that won in practice was **GCM**, the Galois/Counter Mode, designed by David McGrew and John Viega in 2004 and standardized by NIST as SP 800-38D in 2007. It used a multiplication in a finite field for the tag and a counter for the encryption, ran in parallel, and had hardware support in Intel's processors from 2010. Its one weakness was one that the history of the twentieth century had made familiar: reuse a nonce under the same key and both the key stream and the tag key are exposed. Antoine Joux pointed this out in 2006, and in 2016 a team of researchers found about 180 servers on the public web that did it (I give the figure as I recall it) ([Cryptanalysis, chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)). The block-cipher modes of the early 2000s that did the same job, CCM (SP 800-38C, 2004), were used in WPA2 for Wi-Fi. A new open competition, CAESAR, ran from 2013 to 2019 under Bernstein's coordination and ended with a portfolio of six AEAD designs, among them AEGIS, OCB and Ascon. [Book 1, chapter 8](../../book/08-Modes-of-Operation.md) teaches the modes.

### Ciphers from other nations

The AES competition did not end the national standards, and the reasons are good. A government or a company may not wish to depend on an algorithm chosen by an agency of another country; after 2013 that reasoning looked less eccentric (§18.12). Japan's Camellia (2000, from Mitsubishi Electric and NTT) was recommended by CRYPTREC and NESSIE and is in TLS. Korea has SEED (1998) and ARIA (2003), the second designed by a group of Korean researchers and security agencies. Russia's GOST 28147-89, a Feistel cipher with a 64-bit block that was a Soviet standard from 1989 and was made public in the 1990s, has been joined by the hash Streebog (GOST R 34.11-2012) and the block cipher Kuznyechik (GOST R 34.12-2015). China's State Cryptography Administration published the elliptic-curve scheme SM2 and the hash SM3 in 2010 and the block cipher SM4, which had been kept secret from 2003 as the cipher of its Wi-Fi standard WAPI and published in 2006, as a standard in 2012; the quarrel over WAPI with the international standards bodies in 2004 to 2006 is one of the few cases where a cipher became a trade dispute. I have not found an Indian or an African national block cipher in common use, and I do not know of one; if there is one, I have missed it.

## 18.9 Hash functions break

*Level: intermediate.*

A hash function turns any input into a short fixed-size fingerprint, and it must be infeasible to find two inputs with the same fingerprint, which is called a *collision*. The workhorses of the early 1990s were MD5, designed by Ronald Rivest and published as RFC 1321 in April 1992, and SHA-1, published by NIST as FIPS 180-1 in April 1995 as the repaired successor to the first Secure Hash Algorithm (SHA-0, 1993, which the NSA replaced within two years, saying that it had found a flaw). They signed certificates, checked downloads, named files in version-control systems and sat inside passwords, and for a decade nobody had a better idea of what to use.

The limit on every hash comes from the birthday paradox, which [book 1, chapter 9](../../book/09-Hash-Functions.md) teaches. With an $n$-bit output, a collision is expected after about $2^{n/2}$ tries, not $2^n$: in a room of 23 people, two probably share a birthday. The program below finds collisions in a deliberately short hash, made by cutting SHA-256 down to its first few bits.

```python
import hashlib

def short_hash(data, bits):
    # the first `bits` bits of SHA-256: a deliberately tiny hash
    return int.from_bytes(hashlib.sha256(data).digest(), "big") >> (256 - bits)

for bits in (16, 24, 32, 40):
    seen = {}
    n = 0
    while True:
        h = short_hash(n.to_bytes(8, "big"), bits)
        if h in seen:
            break
        seen[h] = n
        n += 1
    print(f"{bits}-bit hash: inputs {seen[h]} and {n} collide after {n + 1:,} tries;",
          f"2^{bits // 2} = {2 ** (bits // 2):,}")
```

Output:

```
16-bit hash: inputs 296 and 310 collide after 311 tries; 2^8 = 256
24-bit hash: inputs 5506 and 7967 collide after 7,968 tries; 2^12 = 4,096
32-bit hash: inputs 50799 and 58968 collide after 58,969 tries; 2^16 = 65,536
40-bit hash: inputs 98759 and 1179000 collide after 1,179,001 tries; 2^20 = 1,048,576
```

So a 128-bit hash like MD5 could never offer more than about $2^{64}$ collision resistance, and SHA-1's 160 bits give $2^{80}$. Cryptanalysis cut far below those numbers, and Figure 18.5 shows when.

<figure class="mars-fig">
<svg viewBox="0 0 640 350" width="640" role="img" aria-label="Life lines of MD5, SHA-1, SHA-2 and SHA-3 from 1990 to 2020, marking the breaks" fill="currentColor" font-size="14">
<line x1="130" y1="30" x2="130" y2="326" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5" opacity="0.4"/>
<text x="130" y="342" font-size="12" text-anchor="middle">1990</text>
<line x1="290" y1="30" x2="290" y2="326" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5" opacity="0.4"/>
<text x="290" y="342" font-size="12" text-anchor="middle">2000</text>
<line x1="450" y1="30" x2="450" y2="326" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5" opacity="0.4"/>
<text x="450" y="342" font-size="12" text-anchor="middle">2010</text>
<line x1="610" y1="30" x2="610" y2="326" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5" opacity="0.4"/>
<text x="610" y="342" font-size="12" text-anchor="middle">2020</text>
<text x="14" y="75" font-size="14" font-weight="bold">MD5</text>
<line x1="162" y1="70" x2="354" y2="70" stroke="currentColor" stroke-width="4"/>
<line x1="354" y1="70" x2="610" y2="70" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>
<circle cx="162" cy="70" r="5" fill="currentColor"/>

<circle cx="226" cy="70" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="226" y="58" font-size="11" text-anchor="middle">Dobbertin</text>
<circle cx="354" cy="70" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="354" y="92" font-size="11" text-anchor="middle">Wang: collisions</text>
<circle cx="418" cy="70" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="418" y="58" font-size="11" text-anchor="middle">rogue CA</text>
<circle cx="482" cy="70" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="482" y="92" font-size="11" text-anchor="middle">Flame</text>
<text x="14" y="155" font-size="14" font-weight="bold">SHA-1</text>
<line x1="210" y1="150" x2="370" y2="150" stroke="currentColor" stroke-width="4"/>
<line x1="370" y1="150" x2="610" y2="150" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>
<circle cx="210" cy="150" r="5" fill="currentColor"/>

<circle cx="370" cy="150" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="370" y="138" font-size="11" text-anchor="middle">Wang: 2^69</text>
<circle cx="562" cy="150" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="562" y="172" font-size="11" text-anchor="middle">SHAttered</text>
<circle cx="610" cy="150" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="616" y="138" font-size="11" text-anchor="end">chosen prefix</text>
<text x="14" y="235" font-size="14" font-weight="bold">SHA-2</text>
<line x1="322" y1="230" x2="610" y2="230" stroke="currentColor" stroke-width="4"/>
<circle cx="322" cy="230" r="5" fill="currentColor"/>
<text x="322" y="252" font-size="11" text-anchor="middle" opacity="0.85">2002</text>
<text x="14" y="305" font-size="14" font-weight="bold">SHA-3</text>
<line x1="402" y1="300" x2="610" y2="300" stroke="currentColor" stroke-width="4"/>
<circle cx="402" cy="300" r="5" fill="currentColor"/>

<circle cx="482" cy="300" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="482" y="288" font-size="11" text-anchor="middle">Keccak chosen</text>
<circle cx="530" cy="300" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="530" y="322" font-size="11" text-anchor="middle">FIPS 202</text>
<text x="610" y="218" font-size="11" text-anchor="end">no practical attack</text>
<text x="162" y="92" font-size="11" text-anchor="middle" opacity="0.85">1992</text>
<text x="210" y="172" font-size="11" text-anchor="middle" opacity="0.85">1995</text>
<text x="402" y="322" font-size="11" text-anchor="middle" opacity="0.85">2007</text>
</svg>
<figcaption>Figure 18.5. The life lines of four hash functions. A thick line is a function with no known practical break; a dashed one is after the first break. Open circles are the events told in the text.</figcaption>
</figure>

### MD5

MD5 had been under suspicion since 1993, when Bert den Boer and Antoon Bosselaers found a weakness in its compression function, and in 1996 Hans Dobbertin of the German security agency BSI found collisions in that function. Cryptographers advised against MD5 in new designs after that, and it stayed everywhere. Nothing happened to the whole function until August 2004, at the informal evening session of the CRYPTO conference in Santa Barbara, where Wang Xiaoyun of Shandong University presented collisions for MD4, MD5, HAVAL-128 and RIPEMD, found with her colleagues Feng Dengguo, Lai Xuejia and Yu Hongbo. The MD5 collision took, in the published account, about an hour on a cluster of IBM computers. The audience is reported to have applauded standing. Her method was a new way of choosing the message difference and then adjusting the message, a step at a time, so that the differences cancel through the rounds. It is told in [Cryptanalysis, chapter 9](../cryptanalysis/09-Breaking-Hash-Functions.md), which owns the method.

The consequence for the web took four years. A collision between two arbitrary files is a curiosity; a collision you can use against a certificate needs the attacker to choose the start of each file, a *chosen-prefix* collision, which Marc Stevens, a Dutch student, worked out in 2007. On 30 December 2008, at the Chaos Communication Congress in Berlin, a team of seven (Alexander Sotirov, Marc Stevens, Jacob Appelbaum, Arjen Lenstra, David Molnar, Dag Arne Osvik and Benne de Weger) announced that they had used a cluster of about 200 PlayStation 3 consoles to make an ordinary web-site certificate and a certificate for a rogue *certificate authority* that had the same MD5 hash. A real authority, RapidSSL, signed the first, using MD5 and serial numbers that could be predicted, and the signature was then valid for the second. The rogue authority could have issued a certificate for any site, trusted by every browser. The team did not publish the key and set the rogue certificate to expire in 2004, years in the past, so that it could not be used. The authorities moved off MD5 within months. In May 2012 the malware Flame, a surveillance tool aimed at computers in the Middle East, was found to have forged a Microsoft code-signing certificate with a collision of a new variant that, by Stevens's analysis, the published attacks did not cover; Microsoft revoked the chain. Whoever built Flame had a cryptanalyst who went past the published work; most analysts judged it a state project, which is not proven in public.

### SHA-1

Wang Xiaoyun returned to SHA-1 with Yiqun Lisa Yin (also an RC6 designer, §18.7) and Yu Hongbo. In February 2005 they announced a way to find a SHA-1 collision in about $2^{69}$ operations, far under the $2^{80}$ of the birthday bound, and later in 2005 they claimed $2^{63}$ (the second figure is theirs and was not demonstrated). NIST responded with a workshop on hash functions in October 2005, advised federal agencies in 2006 (as I recall) to plan to stop using SHA-1 by 2010, and restricted its use in signatures in 2011. The browsers announced in 2014 that they would stop accepting SHA-1 certificates, and did so in early 2017. Between the theory and the practice lay twelve years.

The first actual collision came on 23 February 2017. A team from CWI, the Dutch national research institute for mathematics and computer science, and from Google (Marc Stevens, Elie Bursztein, Pierre Karpman, Ange Albertini and Yarik Markov) published two different PDF files with the same SHA-1 hash, which they called **SHAttered**. It took about $2^{63}$ SHA-1 computations, which Google put at the equivalent of 6,500 years of one processor and 110 years of one graphics card, done on Google's own cloud. In January 2020 Gaëtan Leurent and Thomas Peyrin of INRIA and Nanyang Technological University in Singapore published a *chosen-prefix* collision for SHA-1, with which they forged a certificate of the kind the PGP system uses to vouch for a person's key. They costed it at about \$75,000 of rented graphics cards and \$45,000 at cheaper rental prices; the figures are the authors' own.

!!! note "Life story: Wang Xiaoyun"
    **Born:** 1966 (the year usually given), in China; professor at Shandong University, later at Tsinghua University · **Purpose:** to find collisions in hash functions by choosing message differences that cancel through the rounds · **Helped:** the first collisions for MD5, MD4, HAVAL and RIPEMD (2004) and the attack on full SHA-1 (2005); it began the end of the older hashes, and drove NIST to run the SHA-3 competition · **Status:** still active; the author of the best-known break in the history of hash functions

!!! note "Life story: SHA-1"
    **Born:** April 1995 as FIPS 180-1 from the NSA's design, a repair of SHA-0 · **Purpose:** a 160-bit hash for signatures, certificates and integrity · **Helped:** SSL and TLS, PGP, Git (from 2005), certificates (until 2017) · **Retired:** theoretical attack 2005, collision 2017, chosen-prefix collision 2020; certificates stopped in 2017 · **Replaced by:** SHA-256 and the rest of SHA-2; NIST announced in 2022 that it would retire SHA-1 by the end of 2030 (I give that date from memory)

### SHA-2 and SHA-3

The NSA had published SHA-2 in August 2002 as FIPS 180-2: SHA-256, SHA-384 and SHA-512, later joined by SHA-224 and others and gathered with SHA-1 in FIPS 180-4 (2012). It follows SHA-1's general design, but the larger size and a more tangled round function have kept it safe, and as of 2020 there was no practical attack on it. Bitcoin's work, the web's certificates and most of the software signed since 2010 use it. A hash function that worked in a quite different way would be insurance against a flaw in the design they shared. NIST announced a competition for it on 2 November 2007. Sixty-four proposals arrived by October 2008; fifty-one were accepted, fourteen went to the second round in 2009, and five finalists were named in December 2010: BLAKE, Grøstl, JH, Keccak and Skein. On 2 October 2012, exactly twelve years to the day after Rijndael, NIST chose **Keccak**, designed by Guido Bertoni, Joan Daemen, Michaël Peeters and Gilles Van Assche, who came from the chip maker STMicroelectronics. Keccak is built on a "sponge": a block of state that absorbs the message and squeezes out the hash, which is immune to length extension, the trick that works on MD5, SHA-1 and SHA-256. It became **FIPS 202** in August 2015. NIST's report on the third round, whose authors included Meltem Sönmez Turan, said that SHA-3 was a complement to SHA-2 and not a replacement. In 2013 and 2014, in the first months after the Snowden documents (§18.12), NIST proposed to cut Keccak's security parameters, the community objected loudly, and NIST dropped the idea; I give the episode from memory of the mailing-list record. The runner-up BLAKE lives on as BLAKE2 (2012) and BLAKE3 (2020), faster than SHA-2 in software; the BLAKE team includes Jean-Philippe Aumasson.

!!! note "Life story: Keccak (SHA-3)"
    **Born:** submitted October 2008; chosen on 2 October 2012 after a five-year NIST competition; FIPS 202 in August 2015 · **Purpose:** a hash built differently from SHA-2, as insurance after the breaks of MD5 and SHA-1 · **Helped:** the sponge construction, the extendable-output functions SHAKE128 and SHAKE256, and later designs · **Status:** current, little used so far in the web's protocols, where SHA-2 is entrenched

## 18.10 Passwords

*Level: beginner.*

A hash has another job that the web turned into a daily problem. A site that stores passwords should not store the passwords, only a hash of each, so that a stolen file does not hand the thief everyone's login. Robert Morris and Ken Thompson had worked this out for Unix in 1979 and added two ideas, a random *salt* in each stored hash, so that the same password gives a different result for each user, and a deliberately slow function, so that guessing costs the thief time. Twenty-five years later most of the web had forgotten both.

The records of the breaches are the history. In December 2009 an attacker used a hole in the site RockYou, a maker of social-network games, to take the details of 32 million users, whose passwords the company had stored in plain text. The list was posted, and for years afterward it was the first list password-crackers used. In June 2012 a file of 6.5 million hashes from LinkedIn, unsalted SHA-1, appeared on a Russian forum, and most were cracked within days (the figure of 6.5 million is what appeared online; a later disclosure in 2016 put the total number of accounts taken at about 117 million). In October 2013 Adobe lost data on some 150 million accounts. The company had encrypted the passwords with Triple DES in ECB mode under a single key, not hashed them, and left the users' password hints in plain text beside them. Two users with the same password had the same ciphertext, and the hints told the rest. The program below plays out the difference on a toy site with four users.

```python
import hashlib

# A site stores one SHA-1 per user, no salt (the way LinkedIn did in 2012).
users = {"ana": "sunshine", "bo": "dragon", "cy": "tr0ub4dor&3", "di": "sunshine"}
unsalted = {u: hashlib.sha1(p.encode()).hexdigest() for u, p in users.items()}

words = ["password", "123456", "sunshine", "dragon", "letmein", "monkey", "qwerty"]

# One pass over the word list cracks every account at once
table = {hashlib.sha1(w.encode()).hexdigest(): w for w in words}
tries = len(words)
for u, h in unsalted.items():
    print(f"{u:3} {'cracked: ' + table[h] if h in table else 'not in the list'}")
print("hashes computed:", tries)

# The same site with a random salt per user and 100,000 rounds of PBKDF2
def slow(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000).hex()

salts = {u: hashlib.sha256(u.encode()).digest()[:8] for u in users}   # stand-in for random salts
salted = {u: slow(p, salts[u]) for u, p in users.items()}
print("ana and di share a password but not a stored value:", salted["ana"] != salted["di"])

# Now the attacker must try every word against every user separately
tries = 0
for u, h in salted.items():
    for w in words:
        tries += 1
        if slow(w, salts[u]) == h:
            print(f"{u:3} cracked: {w}")
            break
print("PBKDF2 computations (each of 100,000 rounds):", tries)
```

Output:

```
ana cracked: sunshine
bo  cracked: dragon
cy  not in the list
di  cracked: sunshine
hashes computed: 7
ana and di share a password but not a stored value: True
ana cracked: sunshine
bo  cracked: dragon
di  cracked: sunshine
PBKDF2 computations (each of 100,000 rounds): 17
```

With only seven words the two defenses look small, but scale it: a thief with a list of a billion passwords and a million users pays a billion hashes against the unsalted file and a quadrillion (a billion times a million) against the salted one, each of them 100,000 times dearer. Neither the salt nor the slowness stops a user who chose a password that is on the list. This is why *cy*, whose password is not on the list, survives both.

The slow functions form their own line of history. Niels Provos and David Mazières designed **bcrypt** for OpenBSD, in the Blowfish cipher's expensive key setup, and described it at USENIX in 1999; it had a cost setting that could be raised as computers sped up. **PBKDF2**, by Burt Kaliski at RSA, appeared as RFC 2898 in 2000 and is the one in the program. Both are slow only in time, and graphics cards, which do thousands of simple operations at once, made short work of them. Colin Percival's **scrypt** (2009) made the function need a large amount of memory as well, which is expensive in a graphics card and in custom chips. In 2013 a group of cryptographers led by Jean-Philippe Aumasson announced the **Password Hashing Competition**, on the AES pattern, and in July 2015 it chose **Argon2**, by Alex Biryukov, Daniel Dinu and Dmitry Khovratovich of the University of Luxembourg. The panel also gave special recognition to other designs (Catena, Lyra2, yescrypt and Makwa among them). The IETF published Argon2 as RFC 9106 in 2021. These are told in [book 1, chapter 11](../../book/11-Passwords-and-Key-Derivation.md).

The advice for users changed too, and with a story worth telling. In 2003 William Burr of NIST, who is also on the AES report of §18.7, wrote the guidance for federal agencies that told people to mix upper- and lower-case letters, digits and symbols and to change their password at regular intervals, such as every ninety days. Studies in the following years, among them Lorrie Cranor's group at Carnegie Mellon on composition rules and Yinqian Zhang, Fabian Monrose and Michael Reiter at the University of North Carolina on expiry, found that the rules gained less than hoped and that people forced to change a password make a small, predictable change to the old one. In 2017 NIST published SP 800-63B, which said to drop forced periodic changes and composition rules, to allow long phrases and to check new passwords against lists of ones already breached. In an interview that year Burr said that he regretted much of what he had written in 2003.

!!! note "Life story: Argon2"
    **Born:** designed 2014 to 2015 by Alex Biryukov, Daniel Dinu and Dmitry Khovratovich at the University of Luxembourg; winner of the Password Hashing Competition, July 2015 · **Purpose:** a password hash that costs the attacker memory as well as time, so that graphics cards and custom chips gain little · **Helped:** the storage of passwords and the making of keys from passwords in many libraries and password managers · **Status:** current; RFC 9106 (2021)

## 18.11 Three famous bugs

*Level: intermediate.*

The era's biggest failures were not breaks of a cipher. They were programs that did the wrong thing with a right algorithm. Three of them, each a story of its own, are told here in one paragraph each, with a pointer to the book that works the technique.

**Debian's OpenSSL, 2006 to 2008.** In September 2006 a maintainer of the Debian GNU/Linux distribution, trying to silence a warning from a memory-checking tool, removed two lines from Debian's copy of OpenSSL. The lines mixed unpredictable data into the pool the random number generator drew from. Without them the only input that varied was the process number of the program, a number below 32,768. For about twenty months every SSH key, every TLS key and every certificate request made on Debian and its derivatives, among them Ubuntu, came from a generator that had at most about 32,000 possible outputs for each key type and size. Luciano Bello found the problem in May 2008 and Debian issued its security advisory (DSA-1571-1) on the 13th; every key made in the period had to be thrown away. HD Moore published the complete list of weak keys, so an attacker had no work to do. [Cryptanalysis, chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md) works the attack, and the [Engineering book, chapter 4](../engineering/04-Randomness-in-Practice.md) shows what a defender should do. The program below plays out the whole attack on a toy.

```python
import hashlib

# Debian's OpenSSL, 2006-2008: the only unpredictable input to key
# generation was the process ID, a number from 1 to 32,767.
def make_key(pid):
    return hashlib.sha256(b"debian" + pid.to_bytes(2, "big")).hexdigest()[:16]

victim = make_key(23456)            # a key made on some server
print("victim's key:", victim)

# The attacker makes every possible key and looks for a match
table = {make_key(pid): pid for pid in range(1, 32768)}
print(len(table), "possible keys; this one came from PID", table[victim])
```

Output:

```
victim's key: a48c5de1c2de00fc
32767 possible keys; this one came from PID 23456
```

**Shared primes, 2012.** An RSA key is the product of two secret primes, and it is safe only if nobody else ever picks the same prime. In February 2012 a team led by Arjen Lenstra (James Hughes, Maxime Augier, Joppe Bos, Thorsten Kleinjung and Christophe Wachter, titled "Ron was wrong, Whit is right" for Rivest and Diffie) reported that when they compared millions of public keys collected from the internet, a small fraction, about one in 500 of them by their count, shared a prime with another key. Within months Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman, who scanned the whole internet for keys, explained why in "Mining Your Ps and Qs": the culprits were routers, firewalls and other small devices that made their keys on first boot, when the random generator had gathered almost nothing, and so two devices of the same model picked the same first prime. They could compute the private keys for about 0.5 percent of the TLS hosts they found, and for more than one in a hundred of the SSH hosts' DSA keys. The step needs no factoring: Euclid's algorithm for the greatest common divisor, 2,300 years old, splits both keys at once, as the program shows with three Mersenne primes. The story is in [Cryptanalysis, chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md).

```python
from math import gcd

# Three primes (all Mersenne primes, so anyone can check them)
p = 2 ** 127 - 1
q1 = 2 ** 89 - 1
q2 = 2 ** 107 - 1

# Two devices made RSA keys with a bad random generator and picked the same p
n1, n2 = p * q1, p * q2
print(n1.bit_length(), n2.bit_length(), "bit moduli")

g = gcd(n1, n2)                     # Euclid's algorithm: instant, no factoring needed
print(g == p, n1 // g == q1, n2 // g == q2)
```

Output:

```
216 234 bit moduli
True True True
```

**Heartbleed, 2014.** On 7 April 2014 the OpenSSL project announced a bug (CVE-2014-0160) in its code for the TLS "heartbeat" extension, found independently by Neel Mehta of Google and by engineers at the Finnish security firm Codenomicon, who named it and gave it a logo. A heartbeat is a message that says "send back these N bytes to show you are alive"; the code trusted the length N in the request and did not check it against the number of bytes actually sent, so a client could send one byte and claim sixty-four thousand, and the server would answer with the one byte followed by 64 kilobytes of whatever lay next to it in memory: passwords, session cookies, sometimes a server's private key. The code had been written by a German developer, Robin Seggelmann, who later said that it was an honest mistake, and added on New Year's Eve 2011; it was released in OpenSSL 1.0.1 in March 2012 and sat there for over two years. Estimates of how many secure web servers were exposed range from the 17 percent that Netcraft counted to the 24 to 55 percent of popular sites that Zakir Durumeric and colleagues measured. The library turned out to be maintained by a handful of volunteers, with around two thousand dollars a year in donations and a single full-time developer, by the account of Steve Marquess, one of its officers. The Linux Foundation started a Core Infrastructure Initiative in April 2014 to pay for such projects; OpenBSD forked the library as LibreSSL that month and Google started BoringSSL in June. The [Protocols book, chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md) works the bug.

Other failures of those years fit the same pattern. In February 2014 Apple's "goto fail" bug, one duplicated line of code, skipped the check of a server's signature in the key-exchange step, so that a man in the middle could pose as a site without the site's private key. In December 2010 a team calling itself fail0verflow showed that Sony had signed the software of the PlayStation 3 with ECDSA using the same random number each time, which revealed the private key through a few lines of algebra ([Cryptanalysis, chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)). The defender's side of each, how to write code so that these mistakes are caught, belongs to the Engineering book; the lesson of the era is that the algorithm held and the line of code around it did not.

## 18.12 Snowden and Dual_EC_DRBG

*Level: intermediate.*

Random numbers also carried the era's worst scandal about a standard. In 2006 NIST published SP 800-90, a standard for generating random bits, with four generators in it. One of them, called **Dual_EC_DRBG**, had been pushed by the NSA. It was strange: it was far slower than the other three, it was built from the arithmetic of an elliptic curve, and it used two fixed points on the curve, called $P$ and $Q$, for which no explanation was given of where they came from. At the CRYPTO conference in August 2007 two Microsoft researchers, Dan Shumow and Niels Ferguson (who had designed Twofish, §18.7), showed in a ten-minute talk that if whoever chose the points knew a secret number $e$ with $P = eQ$, that person could take 32 bytes of the generator's output, work out its internal state and predict every number it would produce thereafter. No one else could. Bruce Schneier wrote about it in *Wired* in November 2007: the attack was a backdoor, and its owner was the author of the constants. The generator was nevertheless kept in the 2012 revision of the standard, renamed SP 800-90A. It is hard to say what to make of this: most experts assumed that nobody would use a standard that visibly could be backdoored, and they were mistaken.

In June 2013 Edward Snowden, an employee of an NSA contractor, gave journalists a vast archive of classified documents. It is worth recalling the first thing he asked of them, which was to use encryption. According to Laura Poitras's film *Citizenfour* (2014) and Glenn Greenwald's book *No Place to Hide* (2014), Greenwald put off installing PGP for months, and Poitras needed the help of a young programmer, Micah Lee, to set it up. The reporting that followed came from Greenwald, Poitras and Ewen MacAskill of *The Guardian*, and Barton Gellman of the *Washington Post*. Snowden said in a live question-and-answer session with *The Guardian* in June 2013 that encryption works, that properly implemented strong cryptography is one of the few things a person can rely on, and that the weak point is the end of the line, the computer that uses it. The documents, as far as published, bear this out.

Three groups of documents concern this chapter. The first, in October 2013, was a *Washington Post* report on a program called MUSCULAR: the NSA and its British partner GCHQ had tapped the private fiber-optic links between the data centers of Google and Yahoo, where the companies' own traffic traveled in the clear. One slide had a drawing of the cloud with a smiley face where "SSL is added and removed here." The second, in September 2013, was a joint report by *The New York Times*, *The Guardian* and *ProPublica* on a decryption program with the code name BULLRUN (its British counterpart was EDGEHILL). The documents said that the NSA's "SIGINT Enabling Project" had a budget of about \$250 million a year and aimed to "insert vulnerabilities into commercial encryption systems." The *Times* wrote that one of the documents appeared to confirm that the NSA had inserted a back door into a 2006 standard, and the standard it meant was Dual_EC_DRBG. The NSA has never acknowledged it. The third, in December 2013, was not a leak but a Reuters report that RSA Security had accepted \$10 million from the NSA to make Dual_EC_DRBG the default in BSAFE; RSA denied that it had knowingly weakened its product.

What the documents do not say matters as much. They do not name an algorithm that the NSA can break. They describe cooperation with companies, pressure on standards, theft of keys, and the use of software flaws, which is what Snowden himself had said. The case for Dual_EC rests on the structure of the generator, on the 2007 analysis, and on the *Times* report of 2013; the point $Q$ was not independently produced. Tanja Lange, Daniel Bernstein and Ruben Niederhagen set out the evidence in a 2015 paper called "Dual EC: A Standardized Back Door", and a team led by Stephen Checkoway showed in 2014 that in real TLS implementations, RSA's BSAFE among them, the attack was fast on an ordinary computer. Both are in the [Cryptanalysis book](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md).

The consequences came in a line.

- NIST advised in September 2013 that no one should use Dual_EC_DRBG, reopened its random-number standards for public comment, and removed the generator in a revision of SP 800-90A whose draft appeared in April 2014 (the final version in 2015). An outside panel set up to review NIST, which as I recall included Ronald Rivest, reported in July 2014 that the institute should strengthen its independence from the NSA.
- In December 2015 the router maker Juniper Networks announced that it had found unauthorized code in its firewalls' operating system. Juniper used Dual_EC with a point $Q$ of its own, and someone had, years earlier, replaced it with another, so that the generator became that someone's backdoor and the traffic of Juniper's customers readable by them. The investigation by Checkoway and others (2016) showed how a back door of this kind, once the structure is in place, can be taken over by someone else. Who did it is not known.
- Google, Yahoo and others encrypted the links between their data centers and turned on forward secrecy. The IETF published RFC 7258 in May 2014, whose title and whose rule is "Pervasive Monitoring Is an Attack." HTTPS spread (§18.6), TLS 1.3 came with only forward-secret key exchange (§18.3), and in September 2014 Apple made the encryption of its phones depend on a key that Apple itself could not read, and the argument of §18.14 began.
- New standards began to explain every constant. The SHA-3 team had done so for Keccak. The elliptic curves that NIST standardized in 2000 (FIPS 186-2), whose coefficients come from a hash of seed values that nobody has explained, came under the same suspicion; Bernstein's Curve25519 (2005), with its constants explained, became the common choice. Whether the NIST curves have a weakness is not known, and no one has found one.

The episode is the modern version of the S-box suspicion of [chapter 16](16-Feistel-Lucifer-and-DES.md), except that the suspicion was this time almost certainly right. The question of whether the NSA's defensive mission can coexist with its offensive one, which began in [chapter 15](15-Shannon-and-the-Agencies.md), was answered by the documents in a way the agency had not intended.

!!! note "Life story: Dual_EC_DRBG"
    **Born:** in SP 800-90, 2006, from a design the NSA pushed; flaw described by Shumow and Ferguson in August 2007 · **Purpose:** a random-bit generator built from elliptic curves · **Helped:** whoever held the secret $e$ with $P = eQ$; nobody else (that is the point of a back door) · **Retired:** NIST advised against it in September 2013 and removed it in the 2014 draft of SP 800-90A Rev. 1, final in 2015 · **Replaced by:** the hash-based and block-cipher generators of the same standard

## 18.13 End-to-end encryption: from OTR to Signal

*Level: intermediate.*

TLS protects a message on its way to a server, and the server reads it. For e-mail, chat and calls, that is a second weak point: the company that runs the server can be hacked, compelled by a court or tempted. Cryptographers wanted *end-to-end* encryption, in which only the people in the conversation hold the keys. PGP ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)) had offered it since 1991, but it did not suit chat, and Alma Whitten and Doug Tygar's 1999 study "Why Johnny Can't Encrypt" had shown, by watching test users, that even careful people could not use PGP 5.0 without mistakes. Worse, a stolen PGP key opened every message ever sent to its owner, and a signed message was proof that the person had written it.

In 2004 Nikita Borisov, Ian Goldberg and Eric Brewer wrote a paper with a pointed title, "Off-the-Record Communication, or, Why Not to Use PGP." Their **Off-the-Record** messaging (OTR) made two changes. It used a fresh Diffie-Hellman exchange again and again during a conversation and threw away each key after use, so that the theft of a key reveals none of the past (*forward secrecy*, the same word as in TLS 1.3). And it authenticated messages with a MAC key that it published after the fact, so that anyone could have forged the messages once the key was public, which gave the speakers *deniability*, the property of an ordinary spoken conversation. OTR ran as a plug-in for chat programs and was used by journalists and activists, but it needed both people to be online at the same time, and it did not catch on beyond them.

The step to billions came from a small team. Moxie Marlinspike (a pseudonym he has used for years) and Stuart Anderson founded Whisper Systems in 2010 and released the encrypted text app **TextSecure** for Android; Twitter bought the company in 2011 and later released the code as open source, and Marlinspike formed Open Whisper Systems in 2013. That year he and Trevor Perrin designed the protocol that TextSecure now used, which they called the **Axolotl ratchet**, after the salamander that regrows lost limbs, and which was renamed the **Double Ratchet** in 2014 to 2016. It drew on OTR's repeated Diffie-Hellman and on a one-way key chain from Adam Langley's chat program Pond. A *ratchet* is a device that turns one way. Figure 18.6 shows the two halves. In the first, each message key is made from a chain key, and then the chain key is replaced with a one-way function of itself and the old one erased; an attacker who steals today's chain key cannot compute yesterday's message keys, because that would mean undoing a hash. In the second, every time the other person replies, a fresh Diffie-Hellman secret is mixed into the root key and a new chain starts, so that a thief who stole a chain key loses access a few messages later (*post-compromise security*, also called self-healing). The two together mean that a stolen device exposes neither the past nor, after a short time, the future. The first half is easy to build and the program below does so.

<figure class="mars-fig">
<svg viewBox="0 0 640 312" width="640" role="img" aria-label="Two chains of the double ratchet: each message advances a hash chain and yields a message key; a new Diffie-Hellman exchange replaces the chain" fill="currentColor" font-size="14">
<defs><marker id="ah18" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="14" y="24" font-size="13" font-weight="bold">chain 1 (made from the first handshake)</text>
<rect x="14" y="36" width="64" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="46.0" y="56" font-size="13" text-anchor="middle" font-weight="bold">root 1</text>
<rect x="130" y="36" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="170.0" y="56" font-size="13" text-anchor="middle">chain key 1</text>
<rect x="130" y="102" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="170.0" y="122" font-size="13" text-anchor="middle">msg key 1</text>
<line x1="170" y1="66" x2="170" y2="100" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<rect x="240" y="36" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="280.0" y="56" font-size="13" text-anchor="middle">chain key 2</text>
<rect x="240" y="102" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="280.0" y="122" font-size="13" text-anchor="middle">msg key 2</text>
<line x1="280" y1="66" x2="280" y2="100" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<rect x="350" y="36" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="390.0" y="56" font-size="13" text-anchor="middle">chain key 3</text>
<rect x="350" y="102" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="390.0" y="122" font-size="13" text-anchor="middle">msg key 3</text>
<line x1="390" y1="66" x2="390" y2="100" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<line x1="78" y1="51" x2="128" y2="51" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<line x1="210" y1="51" x2="238" y2="51" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<line x1="320" y1="51" x2="348" y2="51" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<text x="470" y="44" font-size="12">each step: hash the chain key,</text>
<text x="470" y="60" font-size="12">keep the new one, erase the old</text>
<text x="470" y="124" font-size="12">one key per message,</text>
<text x="470" y="140" font-size="12">used once, then erased</text>
<line x1="46" y1="68" x2="46" y2="210" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<text x="56" y="150" font-size="12">new Diffie-Hellman</text><text x="56" y="166" font-size="12">secret mixed in</text>
<text x="14" y="200" font-size="13" font-weight="bold">chain 2 (after the other side answers with a new key)</text>
<rect x="14" y="212" width="64" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="46.0" y="232" font-size="13" text-anchor="middle" font-weight="bold">root 2</text>
<rect x="130" y="212" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="170.0" y="232" font-size="13" text-anchor="middle">chain key 1</text>
<rect x="130" y="278" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="170.0" y="298" font-size="13" text-anchor="middle">msg key 1</text>
<line x1="170" y1="242" x2="170" y2="276" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<rect x="240" y="212" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="280.0" y="232" font-size="13" text-anchor="middle">chain key 2</text>
<rect x="240" y="278" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="280.0" y="298" font-size="13" text-anchor="middle">msg key 2</text>
<line x1="280" y1="242" x2="280" y2="276" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<rect x="350" y="212" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="390.0" y="232" font-size="13" text-anchor="middle">chain key 3</text>
<rect x="350" y="278" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="390.0" y="298" font-size="13" text-anchor="middle">msg key 3</text>
<line x1="390" y1="242" x2="390" y2="276" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<line x1="78" y1="227" x2="128" y2="227" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<line x1="210" y1="227" x2="238" y2="227" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<line x1="320" y1="227" x2="348" y2="227" stroke="currentColor" stroke-width="1.4" marker-end="url(#ah18)"/>
<text x="470" y="220" font-size="12">chain 1 can no longer be</text>
<text x="470" y="236" font-size="12">computed from chain 2</text>
</svg>
<figcaption>Figure 18.6. The Double Ratchet. Within a chain, each message key comes from a chain key that is then replaced; when a reply brings a new Diffie-Hellman secret, a new chain begins and the old one cannot be derived from it.</figcaption>
</figure>

```python
import hashlib, hmac

# A hash chain: each message key comes from the chain key, then the chain
# key is replaced by a one-way function of itself. The old one is erased.
def step(chain_key):
    message_key = hmac.new(chain_key, b"message", hashlib.sha256).digest()
    next_chain = hmac.new(chain_key, b"chain", hashlib.sha256).digest()
    return message_key, next_chain

chain = hashlib.sha256(b"the shared secret from the first handshake").digest()
keys = []
for i in range(1, 5):
    mk, chain = step(chain)
    keys.append(mk)
    print("message", i, "key", mk.hex()[:12])

# An attacker steals the device after message 4: only `chain` is left on it.
mk5, chain = step(chain)
print("message 5 key (attacker can make this)", mk5.hex()[:12])

# Everything the thief can compute from the stolen key goes forward.
# Going backward would mean inverting HMAC-SHA-256. Try the cheap guess:
guess = hmac.new(chain, b"message", hashlib.sha256).digest()
print("stolen chain key reproduces an old key:", guess in keys)
```

Output:

```
message 1 key 86b4eac62e96
message 2 key dc2f9ddc1320
message 3 key bd1800b1243b
message 4 key c6ecf93cd289
message 5 key (attacker can make this) 388bf1a2a7da
stolen chain key reproduces an old key: False
```

A second problem was the first message. Two people who have never talked must agree on a key even when one of them is asleep. The answer, which Marlinspike and Perrin published as X3DH in 2016, is that each user uploads to the server a bundle of one-time public keys ahead of time, and the sender uses them to start the conversation without the receiver being present. The server learns who talks to whom and when, though not what is said, a limit that every system of this kind has (the "sealed sender" feature of 2018 shrinks it a little). The app, which merged TextSecure and a voice-call program called RedPhone, was renamed **Signal** in 2015. A Signal Foundation formed in 2018 with money from Brian Acton, a co-founder of WhatsApp.

The protocol's adoption was the real event. WhatsApp, owned by Facebook since 2014, began to use the TextSecure protocol for Android text messages in November 2014 and in April 2016 announced that all its messages, calls and files were end-to-end encrypted, for the more than one billion people who used it. Facebook Messenger and Google's Allo added the same protocol as an optional "secret" or "incognito" mode in 2016; Apple's iMessage, which had been end-to-end encrypted since 2011 with its own design, remained a separate system. A team led by Katriel Cohn-Gordon and Cas Cremers, with Benjamin Dowling, Luke Garratt and Douglas Stebila, published a formal security analysis of the protocol in 2017 and found it sound within its model. Large groups were left to a later IETF standard, Messaging Layer Security, completed in 2023.

Two limits belong in the record. The first is that the encryption cannot protect against a phone that has been taken over, a point on which Snowden's remark about the "end of the line" bears (§18.12). The second is the one Whitten and Tygar found: the user must check that the key on the screen is the right one, by comparing a "safety number" with the other person in person or by another channel. Most people do not, so the system relies on trust at first use, as SSH does (§18.4).

!!! note "Life story: the Signal protocol"
    **Born:** 2013 as the Axolotl ratchet of TextSecure, by Moxie Marlinspike and Trevor Perrin; named Double Ratchet in 2014 to 2016; Signal app in 2015 · **Purpose:** to give a conversation forward secrecy and post-compromise security without both people being online · **Helped:** WhatsApp (April 2016, over a billion people), Signal, and optional modes in Messenger and Google's apps · **Status:** current; formally analyzed in 2017; OTR (2004) is its direct ancestor

## 18.14 The second crypto war

*Level: beginner.*

Strong encryption in the phone and in the messaging app brought back the quarrel of the 1990s ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md) tells the first round: the export rules, the Clipper chip, and the argument that ended in 2000 when the US relaxed its rules). The facts through 2020 are these.

In September 2014 Apple released iOS 8, which encrypted the data on an iPhone with a key tied to the user's passcode, so that Apple could not unlock the phone for the police, and Google said Android would follow. In October the FBI director James Comey gave a speech at the Brookings Institution about "going dark": criminals and terrorists were using devices that investigators could not read even with a warrant. In January 2015 the British prime minister David Cameron asked whether the country should allow a means of communication that the government could not read, and said that it should not. In July 2015 fifteen well-known security experts published "Keys Under Doormats" (Harold Abelson, Ross Anderson, Steven Bellovin, Josh Benaloh, Matt Blaze, Whitfield Diffie, John Gilmore, Matthew Green, Susan Landau, Peter Neumann, Ronald Rivest, Jeffrey Schiller, Bruce Schneier, Michael Specter and Daniel Weitzner). Eleven of them had written a similar report in 1997 against key escrow. Their argument was that a built-in way for the government to read what is encrypted is a hole that other parties can find and use, that it adds complexity where complexity is the enemy of security, and that it puts the keys of a society in one place. The comparison with Clipper was explicit.

The case that set the terms was in San Bernardino, California. After a shooting on 2 December 2015 that killed fourteen people, the FBI held the locked iPhone 5c of one of the attackers, Syed Rizwan Farook, and on 16 February 2016 a federal magistrate judge, Sheri Pym, ordered Apple to write special software that would disable the phone's limit on password guesses so that the FBI could try them all. Apple's chief executive, Tim Cook, published an open letter refusing: the software, once written, could be used on any iPhone, and the order, Apple argued, would compel the company to create a weakness. After six weeks of public argument the Justice Department withdrew on 28 March 2016, saying that an outside party had shown it a way into the phone. A later report by the Justice Department's inspector general (2018) criticized how the FBI had handled the case, and I have not read it in full. The question of whether a court can force a company to build a way in was left unanswered.

Other countries wrote it into law. The British Regulation of Investigatory Powers Act (2000) already let a court order a person to give up a key or a decrypted copy, on pain of prison. The **Investigatory Powers Act** of 2016 gave the Home Secretary power to issue "technical capability notices" to communications companies, which, according to the regulations that followed in 2018, can require them to be able to remove electronic protection that they themselves applied. Australia's **Assistance and Access Act** of December 2018 gave the police similar powers to ask for, and in some cases demand, technical help, with strict secrecy about the requests. In the United States the **EARN IT Act**, introduced in the Senate in March 2020 by Lindsey Graham and Richard Blumenthal, did not mention encryption: it would have removed the legal protection of platforms that fail to follow best practices against child sexual-abuse material, set by a commission, and critics said that the way to follow those practices would be to stop offering end-to-end encryption. It did not become law in 2020. In June 2020 three Republican senators introduced a bill that would have required providers to be able to give access to encrypted data under a warrant. In October 2020 the governments of the Five Eyes countries together with Japan and India published a statement asking for ways for law enforcement to gain access to encrypted content, and a resolution of the EU Council of December 2020 took a more balanced line, supporting encryption and asking for lawful access "despite" it. In Britain, GCHQ's Ian Levy and Crispin Robinson proposed in 2018 that a company could add a silent "ghost" participant to an end-to-end encrypted group chat, and an open letter from technologists and civil-society groups in 2019 said it would change the security that makes the chat private.

One more event shows the stakes from the other side. In August 2013 the founder of the encrypted e-mail service Lavabit, Ladar Levison, shut it down rather than hand over the TLS private key that would have given the government access to all of its users' traffic, during an inquiry that was understood to be about Snowden.

**What is still argued.** I will say plainly that this is not a closed question. The two sides disagree on facts as well as values. The law-enforcement side says that encrypted devices and messages have blocked investigations of child abuse, terrorism and organized crime and that the need for lawful access is real; the technical side answers that no known design gives access to the police and not to anyone else, and points to the many countries that would make the same demand. Claims about how often encryption blocks an investigation are hard to check, because the figures come mostly from the agencies and the cases are secret. The proposals of 2021 and after (the EU's draft regulation on child sexual-abuse material, the scanning of messages on the device, the UK's Online Safety Act of 2023, and press reports in 2025 about a UK order concerning one company's cloud encryption) belong to the same argument, but they are outside the years of this chapter and I do not retell them. If this page reaches you after they have been settled, the history after 2020 is not here.

!!! note "Life story: Apple v. FBI (2016)"
    **Born:** 16 February 2016, a court order in the Central District of California (Magistrate Judge Sheri Pym) after the San Bernardino shooting of 2 December 2015 · **Purpose:** to force Apple to help the FBI unlock one iPhone 5c · **Helped:** made the public argue about encryption as the 1990s had; Apple's refusal and Tim Cook's letter set out the company's case · **Status:** ended 28 March 2016 when the FBI withdrew after an outside party got into the phone; the legal question was not decided

## 18.15 Money and other new uses

*Level: beginner.*

Cryptography also found uses no one had planned for. David Chaum's blind signatures (1982) led to his Amsterdam company DigiCash (1990), a system of anonymous electronic cash, which failed commercially and went bankrupt in 1998. The attempts to make money out of mathematics that followed were mostly the work of the "cypherpunks," the mailing list of cryptographers and programmers who thought that strong cryptography should be in everyone's hands ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)). Adam Back's **Hashcash** (1997) made a sender of mail prove that they had spent some computing work. Wei Dai's **b-money** (1998) and Nick Szabo's **bit gold** described money made of such proofs. None was built.

On 31 October 2008, in the middle of a financial crisis, a person or group using the name Satoshi Nakamoto sent a nine-page paper, "Bitcoin: A Peer-to-Peer Electronic Cash System," to the cryptography mailing list. The software was released in January 2009, and the first block, mined on 3 January 2009, carries in its data a headline from *The Times* of that day about the bank bailouts. The first transfer was to the cryptographer Hal Finney, who had built a reusable proof-of-work system in 2004, on 12 January. Nakamoto's real identity is unknown; many people have been named, and none has been shown to be the author. In a ledger shared by everyone, a transaction is a message signed with ECDSA on the curve secp256k1; transactions are collected into blocks, each block carries the SHA-256 hash of the one before, so that a change in history changes every later hash; and the right to add the next block goes to whoever first finds a number that, hashed with the block, gives a result below a target: a proof of work, from Hashcash. The scheme uses no new cipher or hash. Its novelty was the way the parts fit together, so that strangers can agree on one history with no authority. The technical story belongs to the books that own it; the Protocols and Advanced protocols books are the places for it.

The history of what followed is not told here, except for three small facts. In May 2010 a programmer paid 10,000 bitcoins for two pizzas. Miners moved from ordinary processors to graphics cards and then to custom chips (a story in [chapter 19](19-Hardware-Quantum-and-the-Long-View.md)), so that by 2020 the whole network was computing on the order of $10^{20}$ SHA-256 hashes a second, by public estimates. And the word "blockchain" was soon being used for many things that had nothing to do with money.

Several other ideas from academic theory reached practice in the same years. **Tor**, the network that routes a connection through three relays so that none of them knows both ends, grew out of the onion-routing research of the US Naval Research Laboratory in the 1990s (David Goldschlag, Michael Reed and Paul Syverson); Roger Dingledine, Nick Mathewson and Syverson described Tor in 2004. **Zero-knowledge proofs** (Goldwasser, Micali and Rackoff, 1985) entered a working payment system with Zcash in 2016 ([Advanced protocols, chapter 5](../advanced/05-Zero-Knowledge-Proofs.md)). **Secure multi-party computation** (Andrew Yao, 1982) was used in a real auction in January 2008, when Danish sugar-beet farmers fixed contracts without revealing their bids ([chapter 10 of the same book](../advanced/10-Multi-Party-Computation-in-Practice.md)). Craig Gentry's first **fully homomorphic encryption** (2009) showed that a computer can work on data it cannot read ([chapter 12](../advanced/12-Homomorphic-Encryption.md)). Cynthia Dwork, Frank McSherry, Kobbi Nissim and Adam Smith defined **differential privacy** in 2006, and by 2020 it was in use at Apple and Google and in the 2020 US census. None of these started in the internet era. They are older ideas that the era's computers and networks made worth building.

## 18.16 Can these be broken today?

*Level: intermediate.*

The algorithms chosen in public in this era still stand. What broke was everything around them: old versions, short hashes, bad randomness and plain bugs. The table gives the state at the end of the years the chapter covers (2020); later changes are noted only where I am sure.

| What | Broken? | The attack in plain words |
|---|---|---|
| SSL 2.0 and 3.0 | yes | Padding oracles (POODLE, 2014), DROWN (2016) and weak export options. Banned by the IETF (RFC 6176, RFC 7568). |
| TLS 1.0 and 1.1 | retired | No single fatal break, but they depend on MD5 and SHA-1 and on CBC padding. Browsers began dropping them in 2020 and 2021; RFC 8996 deprecated both in 2021. |
| TLS 1.2 set up well, and TLS 1.3 | no | No practical attack on the protocol itself. TLS 1.3 removed the options the old attacks used. |
| RSA encryption with PKCS #1 v1.5 padding | where the server leaks | A server that reveals bad padding is a Bleichenbacher oracle: about a million altered messages decrypt a session (ROBOT, 2017). |
| AES | no | The best attack on the full cipher is only about four times faster than trying every key. |
| AES-GCM, ChaCha20-Poly1305 | no, if nonces never repeat | Reuse a nonce and the keystream and the authentication key leak ([Cryptanalysis, chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)). |
| RC4 | yes, in practice | Biases in the first bytes of its output; banned in TLS in 2015 (RFC 7465). |
| MD5 | yes, in seconds | Collisions on a laptop; chosen-prefix collisions forged a CA certificate in 2008 and Flame's code-signing certificate in 2012. |
| SHA-1 | yes, with money | A first collision in 2017 (SHAttered); a chosen-prefix collision in 2020 that cost the authors about \$45,000 to \$75,000 of rented graphics cards. |
| SHA-2, SHA-3 | no | No practical attack on either. |
| Unsalted fast password hashes | yes | Graphics cards try billions of guesses a second, and one table of guesses works for every account. |
| Debian's broken OpenSSL keys | yes, instantly | Only 32,767 keys of each type and size existed. List them all and look the key up, as the program in §18.11 does. |
| RSA keys that share a prime | yes, instantly | One greatest-common-divisor step between two keys splits both. |
| Dual_EC_DRBG | for whoever holds the secret | With the hidden number behind the two points, about 32 bytes of output predict everything after. Without it, no attack is known. |
| The web's certificate system | by issuance, not by mathematics | A single mistaken or hacked authority could issue a certificate for any name (DigiNotar, 2011); Certificate Transparency makes that visible, not impossible. |
| End-to-end messaging (Signal protocol) | not the cryptography | The attacks are on the phone itself, on the verification of keys and on the metadata. |

## 18.17 Going deeper

*Level: expert.*

**Why the competitions worked.** The AES and SHA-3 competitions were designed so that three things were true at once: every candidate was fully public; the people with the skill to attack it had a reason to (a published break was a paper, and the winner's name would be on a standard); and the decision was made by a body that could be held to explain itself, in a written report. DES lacked all three. The result was not only better ciphers but a body of knowledge. Ten years of hash-function papers, from Wang's attacks to the SHA-3 analyses, taught the field how compression functions fail, and the sponge of Keccak is a design that learned from them. A caution about the record: a competition measures resistance to the attacks known during the contest, and the winner of the speed and security margin is chosen by judgment. The vote of April 2000 shows that the community preferred Rijndael, not that it was safest.

**The arithmetic of the Dual_EC backdoor.** Let $E$ be a curve of prime order with two points $P$ and $Q$. The generator keeps a state $s_i$ and computes
$$s_{i+1} = x(s_i P), \qquad r_{i+1} = \text{trunc}\big(x(s_{i+1} Q)\big),$$
where $x(\cdot)$ is the first coordinate of a point and $\text{trunc}$ drops the top 16 bits of the 256-bit value (that is, 30 bytes are output). Suppose the designer knows $e$ with $P = eQ$. An observer who sees $r_{i+1}$ must guess the 16 dropped bits, at most $2^{16}$ possibilities, and for each solve the curve equation for a point $R$ with $x(R) = $ the guess. For the right guess, $R = s_{i+1}Q$, and then
$$eR = e s_{i+1} Q = s_{i+1}(eQ) = s_{i+1} P,$$
whose first coordinate is the next state $s_{i+2}$. The observer checks the guess by predicting the next output and comparing with the one seen. With the secret $e$ the work is at most $2^{16}$ point multiplications; without it, finding $e$ from $P$ and $Q$ is a discrete-logarithm problem. A second observation, in the Shumow-Ferguson note, is that the output is also slightly biased, because the truncated coordinate is not uniform, a flaw that Berry Schoenmakers and Andrey Sidorenko had pointed out in 2006. The generator was a bad design even without the backdoor.

**Wang's differential attack, in one paragraph.** Her attack on MD5 and SHA-1 works on the compression function's step by step structure. She chooses a *differential path*: a pattern of differences between two messages that, if it holds at each step, produces the same output after the last. The path holds only with a certain probability at each step, so the attack makes the early steps hold by directly choosing message words (message modification), and leaves the later steps to chance. For MD5 the chance is high enough to collide in minutes; for SHA-1 the work that remains after the modification is about $2^{63}$ compression-function calls, which is why the first collision took until 2017, and the chosen-prefix version (Stevens; Leurent and Peyrin) needs extra "near-collision blocks" to cancel the differences between two arbitrary prefixes. [Cryptanalysis, chapter 9](../cryptanalysis/09-Breaking-Hash-Functions.md) works the details.

**Open questions and the state of the evidence.**

- *Who wrote SSL.* The credit for SSL is shared among Hickman, Elgamal, Kocher, Karlton, Freier and others, and the internal record is not public. A careful history of the early web's security would need Netscape's mail and the memories of the people involved.
- *Whether the NSA wrote the Dual_EC constants.* The structure fits a back door, the 2013 reporting says the documents appear to confirm one, and the agency has not said so. A trustworthy statement would need the agency's own records. The $e$ has never been published.
- *What BULLRUN could do.* The published documents give goals, budgets and capabilities in general terms. They do not say which protocols or ciphers could be read. Claims that the NSA broke a specific mainstream cipher (AES, RSA or the elliptic curves) are not supported by the documents. The Logjam paper's estimate for 1024-bit Diffie-Hellman is a calculation of what a state could do, not evidence that one did.
- *The NIST curves.* Their seeds are unexplained, and no weakness has been found. Their critics ask for proof of safety that cannot be given for a negative.
- *How much 0-RTT costs.* TLS 1.3 lets a client that has talked to a server before send data in the very first message. That data can be replayed by an attacker, and the standard puts the burden on applications. Whether that trade was wise is still argued.
- *What the second crypto war will decide.* §18.14 says what is open.

**Sources and their limits.** For TLS, SSH and the certificate incidents the sources are the RFCs, the researchers' papers and the incident reports; they are good. For the AES competition they are NIST's and the candidates', also good, except for the NSA's role. For Snowden they are the journalists' published documents, which are partial and chosen. For the cryptographers' lives I have used their own writing and the standard encyclopedias, and the notes of this chapter mark every figure that I give from memory.

## Check yourself

??? question "1. An export-grade SSL connection used a 40-bit key. About how long does a search of all keys take at a billion keys a second?"
    $2^{40} \approx 1.1 \times 10^{12}$ keys, so a full search takes about $1.1 \times 10^{3}$ seconds, a little over 18 minutes (half that on average). This is why the 40-bit export keys were no protection by 1995 to 1997, as the challenge breaks of Doligez and Goldberg showed with the computers of the day.

??? question "2. Why did the compromise at DigiNotar affect users of Google, though Google itself was not breached?"
    The browser accepted any certificate signed by any root on its list, and DigiNotar's root was on it. An attacker holding a fraudulent certificate for `*.google.com` signed by DigiNotar could pose as Google to any browser that trusted that root. The security of the whole system was that of its weakest authority. Chrome noticed because Google had pinned its own sites.

??? question "3. A log has 1,000,000 entries. About how many hashes are in a Certificate Transparency inclusion proof, and why does that matter?"
    About $\lceil \log_2 10^6 \rceil = 20$ hashes. It matters because a monitor or a browser can check that a certificate is in the log by downloading 20 hashes and not a million entries, so the check is cheap enough to be required.

??? question "4. A hash has 64 output bits. About how many inputs must be tried to find a collision by the birthday method, and about how many for SHA-1's 160 bits? What did Wang's 2005 result change?"
    About $2^{32} \approx 4.3 \times 10^9$ inputs for 64 bits, and $2^{80}$ for SHA-1's 160 bits. Wang, Yin and Yu showed a way to do it in about $2^{69}$ operations, $2^{11} = 2048$ times faster than the birthday bound, and later claimed $2^{63}$. The first actual collision (2017) took about $2^{63}$.

??? question "5. Why did the stronger Serpent not win the AES competition?"
    The criteria were security, speed on many platforms and ease of implementation, weighed by NIST. Serpent had the largest security margin and was the slowest, particularly in software; Rijndael was fast everywhere, easy to implement and thought to have a sufficient margin. NIST preferred the best combination, not the largest margin. Twenty-five years on, no attack on either has come near to practical.

??? question "6. In the chain of §18.13, an attacker steals the chain key after message 4. Which message keys can they compute, and which can they not? What does the second ratchet add?"
    They can compute the keys of messages 5, 6 and so on, since each is derived forward from the stolen key. They cannot compute the keys of messages 1 to 4, because that would mean inverting HMAC-SHA-256. The Diffie-Hellman ratchet adds recovery: when the other side replies with a new secret, a new root key and chain are made that the thief, who does not have the new private key, cannot compute, so the future is closed again after a reply.

??? question "7. A site stores unsalted SHA-1 hashes of its users' passwords. An attacker has a list of $10^9$ common passwords and the file has $10^6$ users. How many hashes does the attack cost? How many if each user has a random salt, and why does a slow function multiply the cost again?"
    Unsalted: $10^9$ hashes, one table serves every user. Salted: $10^9 \times 10^6 = 10^{15}$ hashes, because the table must be rebuilt for each salt. A slow function with $k$ rounds multiplies every one of those by $k$ (100,000 in the program of §18.10). Neither helps a user whose password is on the list, which is why the guidance now also asks sites to reject known-breached passwords.

??? question "8. The Dual_EC output drops the top 16 bits of a 256-bit coordinate. Why does that not protect the generator against someone who knows $e$?"
    The observer can try all $2^{16} = 65{,}536$ values of the missing bits, find the curve point for each, multiply by $e$ and test the result against the next output. That is a small amount of work. The truncation was meant as a safeguard, but it only turns an exact answer into a guess among 65,536.

??? question "9. TLS 1.3 removed RSA key transport. What did that cost some users, and what did it give everyone?"
    A company that wished to decrypt its own recorded traffic with the server's private key could no longer do so, and the financial-industry group that asked to keep that ability was refused. Everyone else gained forward secrecy: each connection's keys come from a fresh Diffie-Hellman exchange, so stealing the server's key later does not reveal past traffic.

??? question "10. Name one thing in this chapter that was broken by mathematics, and one by a mistake in a program, and say what each shows."
    By mathematics: MD5 and SHA-1, broken by Wang's differential attacks. They show that a function can look strong for a decade and then fail when a new method of analysis arrives; they were replaced through public process. By a program: Heartbleed (a missing length check) or Debian's OpenSSL (two deleted lines). They show that the algorithm can be right and the system wrong, which is why implementation is the larger risk.

## What you learned

- SSL began at Netscape in 1994 and 1995 (Hickman's design, Elgamal's team, Kocher's SSL 3.0 of 1996), became TLS in 1999 and was rewritten as TLS 1.3 in 2018, edited by Eric Rescorla. The attacks with names, from Bleichenbacher (1998) to ROBOT (2017), mostly came from outside the authors.
- SSH (Ylönen, 1995) and OpenSSH (1999) replaced the clear-text login with a trust-on-first-use key.
- The web's certificates trusted the weakest authority on the list. DigiNotar fell in 2011; the CA/Browser Forum's rules, Certificate Transparency (RFC 6962, 2013) and Let's Encrypt (2015, 2016) were the response, and by 2020 most page loads were encrypted.
- NIST chose AES in an open contest: fifteen candidates in 1998, five finalists in 1999, Rijndael (Daemen and Rijmen) on 2 October 2000, FIPS 197 on 26 November 2001. The same method chose SHA-3 (Keccak, 2 October 2012, FIPS 202 in 2015).
- RC4 gave way to ChaCha and authenticated encryption (AES-GCM, SP 800-38D; ChaCha20-Poly1305); other nations kept their own ciphers (Camellia, ARIA, GOST, SM4).
- MD5 (Wang, 2004; rogue CA, 2008; Flame, 2012) and SHA-1 (Wang, Yin and Yu, 2005; SHAttered, 2017; chosen-prefix, 2020) fell; passwords moved to salted, slow, memory-hard functions (bcrypt, scrypt, Argon2).
- The worst failures were in programs and random numbers: Debian's OpenSSL (2006 to 2008), shared primes (2012), Heartbleed (2014).
- Dual_EC_DRBG, flagged in 2007 and linked by the Snowden documents in 2013 to the NSA, led to a more open way of writing standards and to an encrypted web; it was removed from NIST's standard in 2015.
- End-to-end encryption went from OTR (2004) to the Double Ratchet and WhatsApp (2016). The second crypto war (Apple and the FBI in 2016, the UK and Australian laws, EARN IT in 2020) was undecided at the end of 2020, and I have said what is still argued.
- Bitcoin (2008, 2009) put old parts, hashes, signatures and proof of work, together in a new way.

**Next:** [Chapter 19](19-Hardware-Quantum-and-the-Long-View.md), where keys move into chips, the side channels get their history and the quantum computer arrives on the scene.

## Further reading

- Kipp E. B. Hickman, "The SSL Protocol" (Netscape, 1995); A. Freier, P. Karlton and P. Kocher, RFC 6101, *The Secure Sockets Layer (SSL) Protocol Version 3.0* (historic, 2011); T. Dierks and C. Allen, RFC 2246, *The TLS Protocol Version 1.0* (1999); E. Rescorla, RFC 8446, *The Transport Layer Security (TLS) Protocol Version 1.3* (2018); David Wagner and Bruce Schneier, "Analysis of the SSL 3.0 Protocol" (1996); Eric Rescorla, *SSL and TLS: Designing and Building Secure Systems* (Addison-Wesley, 2000).
- Ian Goldberg and David Wagner, "Randomness and the Netscape Browser", *Dr. Dobb's Journal* (January 1996).
- Daniel Bleichenbacher, "Chosen Ciphertext Attacks Against Protocols Based on the RSA Encryption Standard PKCS #1" (CRYPTO '98); Serge Vaudenay, "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002); Böck, Somorovsky and Young, "Return Of Bleichenbacher's Oracle Threat (ROBOT)" (USENIX Security 2018); Adrian et al., "Imperfect Forward Secrecy: How Diffie-Hellman Fails in Practice" (CCS 2015); RFC 8996, *Deprecating TLS 1.0 and TLS 1.1* (2021).
- Tatu Ylönen, "SSH: Secure Login Connections over the Internet" (USENIX Security 1996); RFC 4251 to 4254 (2006).
- Fox-IT, *DigiNotar Certificate Authority Breach "Operation Black Tulip"* (2011); B. Laurie, A. Langley and E. Kasper, RFC 6962, *Certificate Transparency* (2013); Aas et al., "Let's Encrypt: An Automated Certificate Authority to Encrypt the Entire Web" (CCS 2019); R. Barnes, J. Hoffman-Andrews, D. McCarney and J. Kasten, RFC 8555, *ACME* (2019); Loren Kohnfelder, *Towards a Practical Public-key Cryptosystem* (MIT bachelor's thesis, 1978).
- NIST, *Report on the Development of the Advanced Encryption Standard (AES)*, by J. Nechvatal, E. Barker, L. Bassham, W. Burr, M. Dworkin, J. Foti and E. Roback (October 2000); FIPS 197 (2001); Joan Daemen and Vincent Rijmen, *The Design of Rijndael* (Springer, 2002); CNSS Policy No. 15, Fact Sheet No. 1 (2003); Bogdanov, Khovratovich and Rechberger, "Biclique Cryptanalysis of the Full AES" (ASIACRYPT 2011).
- RFC 8439, *ChaCha20 and Poly1305 for IETF Protocols* (2018); Daniel J. Bernstein, "ChaCha, a variant of Salsa20" (2008); RFC 7465, *Prohibiting RC4 Cipher Suites* (2015); AlFardan, Bernstein, Paterson, Poettering and Schuldt, "On the Security of RC4 in TLS" (USENIX Security 2013); NIST SP 800-38D (2007) and SP 800-38C (2004); Bellare and Namprempre, "Authenticated Encryption" (ASIACRYPT 2000); Rogaway, "Authenticated-Encryption with Associated-Data" (CCS 2002).
- Wang Xiaoyun and Yu Hongbo, "How to Break MD5 and Other Hash Functions" (EUROCRYPT 2005); Wang, Yin and Yu, "Finding Collisions in the Full SHA-1" (CRYPTO 2005); Stevens et al., "Short Chosen-Prefix Collisions for MD5 and the Creation of a Rogue CA Certificate" (CRYPTO 2009); Stevens et al., "The First Collision for Full SHA-1" (CRYPTO 2017); Leurent and Peyrin, "SHA-1 Is a Shambles" (USENIX Security 2020).
- NIST, *Third-Round Report of the SHA-3 Cryptographic Hash Algorithm Competition* (NIST IR 7896, 2012); FIPS 180-4 and FIPS 202; Bertoni, Daemen, Peeters and Van Assche, *The Keccak reference*.
- Robert Morris and Ken Thompson, "Password Security: A Case History", *Communications of the ACM* 22, no. 11 (1979); Provos and Mazières, "A Future-Adaptable Password Scheme" (USENIX 1999); Biryukov, Dinu and Khovratovich, "Argon2" (2015); NIST SP 800-63B (2017).
- Debian Security Advisory DSA-1571-1 (13 May 2008); Heninger, Durumeric, Wustrow and Halderman, "Mining Your Ps and Qs" (USENIX Security 2012); Lenstra et al., "Ron Was Wrong, Whit Is Right" (IACR ePrint 2012/064); OpenSSL Security Advisory, CVE-2014-0160 (7 April 2014); Durumeric et al., "The Matter of Heartbleed" (IMC 2014).
- Dan Shumow and Niels Ferguson, "On the Possibility of a Back Door in the NIST SP800-90 Dual Ec Prng" (CRYPTO 2007 rump session); Bernstein, Lange and Niederhagen, "Dual EC: A Standardized Back Door" (2015); Checkoway et al., "On the Practical Exploitability of Dual EC in TLS Implementations" (USENIX Security 2014) and "A Systematic Analysis of the Juniper Dual EC Incident" (CCS 2016); NIST SP 800-90A Rev. 1 (2015); S. Farrell and H. Tschofenig, RFC 7258, *Pervasive Monitoring Is an Attack* (2014); Glenn Greenwald, *No Place to Hide* (2014); Laura Poitras, *Citizenfour* (film, 2014); Barton Gellman and Ashkan Soltani on MUSCULAR, *Washington Post* (30 October 2013); Perlroth, Larson and Shane, *The New York Times* (5 September 2013), with the *Guardian* and *ProPublica* reports of that date.
- Borisov, Goldberg and Brewer, "Off-the-Record Communication, or, Why Not To Use PGP" (WPES 2004); Trevor Perrin and Moxie Marlinspike, *The Double Ratchet Algorithm* and *The X3DH Key Agreement Protocol* (Signal, 2016); Cohn-Gordon, Cremers, Dowling, Garratt and Stebila, "A Formal Security Analysis of the Signal Messaging Protocol" (EuroS&P 2017); Alma Whitten and J. D. Tygar, "Why Johnny Can't Encrypt" (USENIX Security 1999).
- Abelson et al., "Keys Under Doormats: Mandating Insecurity by Requiring Government Access to All Data and Communications" (MIT CSAIL Technical Report, July 2015); the Investigatory Powers Act 2016 (UK); the Telecommunications and Other Legislation Amendment (Assistance and Access) Act 2018 (Australia); the EARN IT Act of 2020 (US Senate bill); Ian Levy and Crispin Robinson, "Principles for a More Informed Exceptional Access Debate", *Lawfare* (2018).
- Satoshi Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System" (2008); David Chaum, "Blind Signatures for Untraceable Payments" (CRYPTO '82); Adam Back, "Hashcash" (1997); Dingledine, Mathewson and Syverson, "Tor: The Second-Generation Onion Router" (USENIX Security 2004); Craig Gentry, "Fully Homomorphic Encryption Using Ideal Lattices" (STOC 2009); Dwork, McSherry, Nissim and Smith, "Calibrating Noise to Sensitivity in Private Data Analysis" (TCC 2006).
- *Weaker sources behind particular statements:* news reports for the share of servers hit by Heartbleed, the LinkedIn and Adobe breach numbers, the Reuters report on RSA's \$10 million contract, WhatsApp's April 2016 announcement and the FBI-Apple case; press summaries of browser telemetry for the share of encrypted page loads and the use of TLS 1.3; Wikipedia and the Crypto Museum for the dates of the national ciphers (SM4, ARIA, Kuznyechik); the vote count of the third AES conference, the number of eSTREAM finalists, the NIST 2006 advice on SHA-1 and the dates of Chrome's labels, all given from memory; Steve Marquess's blog for OpenSSL's funding; and the recollection of the interviews with Marlinspike and Burr, which I have not re-read.
