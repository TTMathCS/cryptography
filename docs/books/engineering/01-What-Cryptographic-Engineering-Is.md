# 1. What Cryptographic Engineering Is

*AES has never been broken in practice, and neither has SHA-256, X25519 or
HMAC. Systems that use them are broken every week. This chapter is about that
gap: the distance between an algorithm that is correct on paper and a program
that is safe in the hands of real people, on real machines, for years. It opens
the book by measuring where cryptography actually fails, using the studies that
counted the failures, sorts the failures into the layers where they happen,
sets out what an implementer's attacker can see and do, and states the handful
of principles that the rest of the book keeps returning to. You will write five
classic mistakes in a few lines of Python each, break every one of them, and
then fix them, ending with a small sealed-message format that has none of them.*

!!! abstract "In this chapter"
    **You will learn:**

    - what cryptographic engineering is, and how this book relates to the
      cryptography book, Cryptanalysis, Protocols and Post-quantum
      cryptography;
    - what the misuse studies of 2012 to 2021 counted, and what their numbers
      do and do not mean;
    - three failures at three depths, as a preview: Heartbleed, the
      PlayStation 3 signing key, and the Storm-0558 token-signing key;
    - the seven layers where cryptography fails (primitive, implementation,
      library, API, protocol, keys, operations), who gets each wrong, and
      which chapter of this book covers each;
    - threat models for implementers: what an attacker of your code can
      observe and touch, beyond the network;
    - the principles: misuse resistance, boring cryptography, one right way,
      fail closed, versioning instead of negotiation;
    - five classic mistakes (ECB, a fixed nonce, `random` for keys, `==` on
      MACs, encryption without authentication), each broken and fixed in code.

    **You need:** the four jobs of cryptography and the attack models from
    [Chapter 1 of the cryptography book](../../book/01-What-Cryptography-Is-For.md),
    and a first look at block cipher modes and MACs
    ([Chapter 8](../../book/08-Modes-of-Operation.md) and
    [Chapter 10](../../book/10-Message-Authentication.md) there). You should be
    able to read short Python programs.

    **Levels:** §1.1 to §1.4 are for beginners, §1.5 to §1.10 are
    intermediate, §1.11 is expert.

## 1.1 The problem

*Level: beginner.*

On Friday 21 February 2014 Apple shipped iOS 7.0.6, an update with a one-line
description: it fixed a problem in which "an attacker with a privileged
network position may capture or modify data in sessions protected by SSL/TLS".
Within hours people had compared the published source of Apple's TLS library
with the previous version and found the problem. In a function called
`SSLVerifySignedServerKeyExchange`, which checks that the server really signed
its half of the key exchange, a line had been duplicated:

```text
    if ((err = SSLHashSHA1.update(&hashCtx, &signedParams)) != 0)
        goto fail;
        goto fail;
    if ((err = SSLHashSHA1.final(&hashCtx, &hashOut)) != 0)
        goto fail;
    ...
    err = sslRawVerify(...);    /* the signature check: never reached */
fail:
    ...
    return err;
```

The second `goto fail;` is not inside the `if`. It always runs. It jumps past
the signature check to the cleanup code, and at that moment `err` is still 0,
which means "success". For about eighteen months every iPhone and iPad (and,
from October 2013, every Mac running OS X 10.9) that used ephemeral key exchange
accepted a server's key without checking its
signature, so anyone on the same café network could pretend to be any
website. The ciphers were AES and the hash was SHA-1 or SHA-256, all fine. The
certificates were checked properly. One line of control flow, which a compiler
warning for unreachable code would have flagged, made the whole construction
worthless.

Six weeks later, on 7 April, OpenSSL announced Heartbleed: a missing length
check that let anyone on the internet read up to 64 KB of a server's memory per
request, again and again, including private keys (§1.4 tells it briefly and
[Chapter 8](08-Hostile-Input.md) fully). In June, at a workshop in Beijing, four
researchers at MIT published a short paper with a blunt question for a title:
"Why does cryptographic software fail?" They had read every vulnerability in
the public CVE database from January 2011 to May 2014 that was tagged as a
cryptographic issue, 269 of them, and sorted them by cause. Only 17% were bugs
in cryptographic libraries. The other 83% were applications using correct
libraries wrongly (§1.3).

That year did not reveal anything new. It made visible what practitioners
already knew. The mathematics of modern cryptography almost never fails. What
fails is everything around it: the code that implements the mathematics, the
library that packages it, the interface that hands it to a programmer, the
protocol that strings it together, the keys it depends on, and the people and
machines that run it. Figure 1.1 shows thirty years of such failures. Almost
none of them is a cryptanalytic break.

<figure class="mars-fig">
<svg viewBox="0 0 640 410" width="640" role="img" aria-label="Timeline of cryptographic engineering failures from 1995 to 2024" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="402" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1995</text>
<circle cx="92" cy="22" r="3.5" fill="currentColor"/>
<text x="108" y="27">Netscape seeds its SSL keys from the time and process IDs</text>
<text x="78" y="55" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="50" r="3.5" fill="currentColor"/>
<text x="108" y="55">Debian's OpenSSL makes only 32,768 keys per type</text>
<text x="78" y="83" text-anchor="end" font-weight="bold">2009</text>
<circle cx="92" cy="78" r="3.5" fill="currentColor"/>
<text x="108" y="83">Keyczar compares MACs with a leaky equality test</text>
<text x="78" y="111" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="106" r="3.5" fill="currentColor"/>
<text x="108" y="111">PlayStation 3 signs every file with the same ECDSA nonce</text>
<text x="78" y="139" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="134" r="3.5" fill="currentColor"/>
<text x="108" y="139">Studies find certificate checks broken in apps and SDKs</text>
<text x="78" y="167" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="162" r="3.5" fill="currentColor"/>
<text x="108" y="167">88% of Android apps using crypto APIs make a mistake</text>
<text x="78" y="195" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="190" r="3.5" fill="currentColor"/>
<text x="108" y="195">goto fail; Heartbleed; 83% of crypto CVEs are misuse</text>
<text x="78" y="223" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="218" r="3.5" fill="currentColor"/>
<text x="108" y="223">184 HTTPS servers found repeating AES-GCM nonces</text>
<text x="78" y="251" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="246" r="3.5" fill="currentColor"/>
<text x="108" y="251">EFAIL: unauthenticated CBC and CFB in encrypted email</text>
<text x="78" y="279" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="274" r="3.5" fill="currentColor"/>
<text x="108" y="279">Zoom found encrypting meetings with AES in ECB mode</text>
<text x="78" y="307" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="302" r="3.5" fill="currentColor"/>
<text x="108" y="307">Study: memory bugs outnumber crypto bugs in crypto libraries</text>
<text x="78" y="335" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="330" r="3.5" fill="currentColor"/>
<text x="108" y="335">Storm-0558 forges tokens with a stolen signing key; Milk Sad</text>
<text x="78" y="363" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="358" r="3.5" fill="currentColor"/>
<text x="108" y="363">Review board report on Storm-0558; the xz backdoor</text>
<text x="108" y="395" opacity="0.7">Not one of these needed a new attack on an algorithm.</text>
</svg>
<figcaption>Figure 1.1. Thirty years of cryptographic engineering failures. Each is told in this chapter or in a later one. The algorithms involved (RSA, ECDSA, AES, HMAC, SHA-2) were sound in every case.</figcaption>
</figure>

**Cryptographic engineering** is the discipline of closing that gap. It takes
algorithms that are correct and makes systems that are safe: code that does
not leak through its timing or its memory, libraries whose defaults are right,
interfaces that are hard to use wrongly, formats that cannot be misread, keys
that are generated, stored, rotated and destroyed with care, and operations
that keep all of it working after the people who built it have moved on. It
borrows from software engineering (testing, review, fuzzing), from systems
(memory, processes, operating systems), from hardware (power, faults, secure
chips), and from operations (secrets, certificates, incidents). Its unit of
work is not the theorem but the program that a tired person deploys on a
Friday afternoon.

The goto fail bug shows the field's three habits of mind in one example. First,
**the attacker gets to choose the input**: the bug mattered only because a man
in the middle could send a key exchange signed with the wrong key, and an
honest server never would. Second, **a security check that fails silently is
worse than none**: the code's structure made "error" and "success" the same
value at the moment of the jump. Third, **most of the fix is process**: a
compiler warning, a test that sends a bad signature, a code review rule that
every `if` has braces. Apple's fix removed one line. The lesson took years to
spread.

!!! note "Life story: goto fail"
    **Born:** a duplicated `goto fail;` in Apple's Secure Transport TLS code,
    shipped with iOS 6 in 2012 and later in OS X 10.9 · **Purpose:** none; the
    second line skipped the check of the server's signature on its key
    exchange while leaving the error code at "success" · **Helped:** the case
    for compiler warnings as errors, mandatory braces, and tests that feed
    TLS code deliberately bad messages; with Heartbleed it made 2014 the year
    implementation bugs became front-page news · **Status:** fixed in iOS
    7.0.6 (21 February 2014) and OS X 10.9.2 (25 February 2014),
    CVE-2014-1266

## 1.2 This book and the shelf

*Level: beginner.*

This is the builder's and the defender's book. It is for the people who write
cryptographic code, choose and call libraries, design file formats and APIs,
look after keys and certificates, and answer the phone when something breaks:
application programmers, library authors, security engineers, site reliability
engineers, auditors and students who want to know how the subject is practiced
rather than only how it is proved.

It sits on a shelf of books, and it leans on the others rather than repeating
them:

| Book | What it does | How this book uses it |
| --- | --- | --- |
| [The cryptography book](../../book/index.md) | builds each primitive: ciphers, hashes, MACs, public-key systems, post-quantum schemes | every algorithm here is taken from there; chapters link back to it and never re-derive it |
| [Cryptanalysis](../cryptanalysis/index.md) | the attacker's book: how each kind of cipher and system is broken | the attacks are told there; this book is the defender's side of the same failures, and links to the attack for each one |
| [Protocols](../protocols/index.md) | how primitives become TLS, SSH, WireGuard, Kerberos, OAuth, passkeys | the protocols and their messages are there; this book configures, deploys and operates them |
| [Post-quantum cryptography](../post-quantum/index.md) | the new schemes, their security, their implementation traps and the migration | its chapter 17 owns post-quantum implementation bugs and chapter 18 the migration; this book teaches the engineering they rest on |
| [The mathematics of cryptography](../mathematics/index.md) | the number theory and algebra | chapter 6 here writes big-number arithmetic as code and links there for the theory |
| [Advanced protocols and privacy](../advanced/index.md) | multiparty computation, zero knowledge, threshold signatures, differential privacy | mentioned only where hardware keys meet threshold schemes (chapter 11) |

So when chapter 5 here writes constant-time code, it links to
[chapter 17 of Cryptanalysis](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)
for how an attacker measures the leak; when chapter 3 here parses a certificate's
bytes, it links to [chapter 2 of Protocols](../protocols/02-Certificates-and-PKI.md)
for what the fields mean; when chapter 4 here makes random numbers safely, the
famous generator failures (Netscape, Debian, Dual_EC, the Android wallets) are
told in full in
[chapter 18 of Cryptanalysis](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md)
and in one paragraph each here. You can read this book on its own, but it is
written to be read beside the others.

The book has four parts. **Part I, Bytes and randomness** (chapters 1 to 4),
is the ground floor: what goes wrong, how bytes and text are encoded and
misread, the ASN.1 and key file formats every library speaks, and where random
numbers really come from. **Part II, Writing it safely** (chapters 5 to 9),
is code: constant time, big numbers, masking against power analysis and
faults, hostile input and memory, and APIs that resist misuse. **Part III,
Keys and secrets** (chapters 10 to 13), follows a key from birth to
destruction, puts keys in hardware, keeps secrets out of repositories and
logs, and stores passwords on a server. **Part IV, Building and running
systems** (chapters 14 to 18), encrypts application data, explains the
command-line tools, signs software, chooses and tests libraries, and runs all
of it for years. §1.5 maps each chapter to the layer of a system it protects.

Every chapter follows the same pattern. It starts from a failure that
happened, with its date and its cost. It builds the safe version in short
Python using only the standard library, and shows the broken version beside
it, as **Break it** and **Fix it** pairs. Where the standard library lacks a
primitive (Python has no AES), the chapter uses a small stand-in built from
`hashlib` and `hmac` and says so plainly; the stand-ins show how a construction
behaves, never how to build a product. Each main section ends with a short
list of what to do the next working day. The last section of each chapter,
**Going deeper**, is for experts and can be skipped.

A word on the code. It is written to teach, not to ship. Python is a poor
language for production cryptography: it cannot promise constant time, cannot
reliably wipe memory, and its integers leak their size. The point of writing
the mistakes in Python is that they are short enough to see whole. The point
of writing the fixes is to see what a good library does on your behalf, so that
you can tell a good one from a bad one (chapter 17).

## 1.3 Where cryptography fails: the misuse studies

*Level: beginner.*

For a long time the claim that "crypto fails in the implementation, not the
math" was folklore, supported by famous cases. Between 2012 and 2021 a series
of studies counted. Their numbers are the best evidence the field has, and
each has limits worth knowing before you quote it.

**Certificate checks, 2012.** Two papers at the ACM CCS conference in October
2012 looked at TLS outside web browsers. Martin Georgiev and five colleagues at
the University of Texas at Austin and Stanford, under the title "The most
dangerous code in the world", tested libraries and applications that make TLS
connections (cloud SDKs, payment SDKs, middleware) and found certificate
validation broken in many of them, usually because the library's interface
made it easy to turn checking off or to forget the host name check. Sascha
Fahl and colleagues at Leibniz University Hannover and Philipps University
Marburg analyzed 13,500 popular free Android apps and found 1,074 (about 8%)
with TLS code that could accept a man in the middle; when they attacked 100
apps by hand, 41 gave up credentials or other data. In both studies the
cryptography was standard and the libraries were correct. The programmers had
wanted the connection to work, and the easiest way to make it work was to
accept every certificate.

**Android, 2013.** At CCS in November 2013, Manuel Egele, David Brumley, Yanick
Fratantonio and Christopher Kruegel published "An empirical study of
cryptographic misuse in Android applications". They wrote a static analyzer,
CryptoLint, that reads an app's compiled code and follows the values passed to
the Java cryptography APIs. It checked six rules:

1. do not use ECB mode for encryption;
2. do not use a non-random IV for CBC encryption;
3. do not use constant encryption keys;
4. do not use constant salts for password-based encryption;
5. do not use fewer than 1,000 iterations for password-based encryption;
6. do not seed `SecureRandom` with a static value.

Of the 11,748 apps from Google Play that used those APIs, 10,327, which is
88%, broke at least one rule. ECB was the commonest single mistake, largely
because in Java the call `Cipher.getInstance("AES")`, which names no mode at
all, gives you AES in ECB mode with PKCS#5 padding. A programmer who asked for
"AES" received the one mode that leaks patterns (§1.8). This is the most
quoted number in the field, and it is a fair one, with one caution: a static
analyzer cannot always tell whether a mistake matters. A constant key used to
obscure a cached image is a different thing from a constant key protecting
passwords, and CryptoLint counted both.

**The CVE database, 2014.** David Lazar, Haogang Chen, Xi Wang and Nickolai
Zeldovich of MIT took a different approach for "Why does cryptographic
software fail? A case study and open problems" (APSys 2014). They started with
the 337 entries in the CVE database from January 2011 to May 2014 tagged
"Cryptographic Issues" (CWE-310). They dropped 68: denial-of-service bugs that
did not break any cryptographic goal, file permission errors, user interface
problems, and entries with too little information to classify. Of the 269 that
remained, 17% were in cryptographic libraries such as OpenSSL, GnuTLS and NSS,
and 83% were in applications that misused them: data that should have been
encrypted and was not, certificates not checked, keys hard-coded or too short,
randomness from the wrong source.

That 83% is the headline, and it needs two footnotes. The first is about
weight: a library bug is fixed once and affects everyone, so 17% of the bugs is
a much larger share of the harm. The second is about the label. Heartbleed is
not in the 269. It was a buffer over-read, tagged as a memory error, not as a
cryptographic issue, so it was outside the study's net. A count that uses the
CWE-310 tag sees misuse of cryptography; it does not see ordinary bugs in
cryptographic code.

**Inside the libraries, 2021.** That second gap was measured by Jenny
Blessing, Michael Specter and Daniel Weitzner, also at MIT, in "You really
shouldn't roll your own crypto: an empirical study of vulnerabilities in
cryptographic libraries" (2021). They took every vulnerability recorded for a
set of widely used libraries, OpenSSL among them, and classified them by cause,
whatever the tag. About 27% were cryptographic issues in the narrow sense: a
wrong algorithm, a timing leak, a bad check. About 37% were memory-safety
bugs: buffer overflows, over-reads, use after free. The libraries' worst enemy
was not cryptanalysis but C. They also found a strong correlation between a
library's size and complexity and the number of vulnerabilities it
accumulated, and argued that much of the risk lies in the systems code around
the cryptography: parsers, protocol state, certificate handling.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Bar chart of the main figures from four misuse studies" fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold">What the studies counted (share of the cases each study looked at)</text>
<line x1="250" y1="40" x2="250" y2="292" stroke="currentColor" stroke-width="1.2"/>
<text x="240" y="66" text-anchor="end">Android apps using crypto</text>
<text x="240" y="83" text-anchor="end" opacity="0.7">at least one mistake, 2013</text>
<rect x="250" y="56" width="330" height="26" fill="currentColor" opacity="0.6"/>
<text x="586" y="74">88%</text>
<text x="240" y="126" text-anchor="end">Crypto CVEs, 2011-2014</text>
<text x="240" y="143" text-anchor="end" opacity="0.7">application misuse</text>
<rect x="250" y="116" width="311" height="26" fill="currentColor" opacity="0.6"/>
<text x="567" y="134">83%</text>
<text x="240" y="176" text-anchor="end" opacity="0.7">bug in the library</text>
<rect x="250" y="162" width="64" height="26" fill="currentColor" opacity="0.3"/>
<text x="320" y="180">17%</text>
<text x="240" y="222" text-anchor="end">Crypto library flaws</text>
<text x="240" y="239" text-anchor="end" opacity="0.7">memory safety, 2021</text>
<rect x="250" y="212" width="139" height="26" fill="currentColor" opacity="0.6"/>
<text x="395" y="230">37%</text>
<text x="240" y="272" text-anchor="end" opacity="0.7">cryptographic issue</text>
<rect x="250" y="258" width="102" height="26" fill="currentColor" opacity="0.3"/>
<text x="358" y="276">27%</text>
<text x="250" y="318" opacity="0.7">Egele et al. 2013; Lazar et al. 2014; Blessing et al. 2021</text>
</svg>
<figcaption>Figure 1.2. The headline numbers of three studies. They count different things (apps, CVE entries, library vulnerabilities), so the bars are not comparable with each other; each says the same thing in its own way. The mathematics is rarely where it breaks.</figcaption>
</figure>

**Why programmers get it wrong.** Later studies asked people rather than code.
Sarah Nadi and colleagues (ICSE 2016) read Stack Overflow questions and
surveyed Java developers, and found that most thought the Java cryptography
APIs were too low-level: they had to choose a mode, a padding, an IV and a key
size, when what they wanted was "encrypt this". Yasemin Acar and colleagues
(IEEE Symposium on Security and Privacy, 2017) asked 256 Python developers to
do small cryptographic tasks with one of five libraries, and found that the
libraries with simpler interfaces produced more secure code, but that
documentation and examples mattered as much as the interface: people copied
the first example that worked. Chapter 9 tells both studies and what they
taught the designers of NaCl, libsodium and Tink. The conclusion that matters
here is that the misuse in the counts above is not stupidity. It is what
happens when an interface asks a busy person a question they cannot answer and
accepts any reply.

!!! note "Life story: the misuse studies"
    **Born:** 2012 to 2014, at CCS 2012 (Georgiev et al.; Fahl et al.), CCS
    2013 (Egele, Brumley, Fratantonio and Kruegel, with the CryptoLint
    analyzer) and APSys 2014 (Lazar, Chen, Wang and Zeldovich) ·
    **Purpose:** to count where cryptography fails in deployed software,
    instead of arguing from famous cases · **Helped:** the design of
    misuse-resistant libraries (libsodium's growth, Google's Tink in 2018),
    static checkers such as CogniCrypt and CryptoGuard, safer defaults in
    Android and in TLS libraries, and the habit of measuring before claiming ·
    **Status:** still the standard citations; later studies, such as Blessing,
    Specter and Weitzner (2021) on the libraries themselves, refine rather
    than overturn them

What to do with this:

- Assume your own bugs will be in the 83%: in how you call a library, not in
  the library. Review the calls, not only the code around them.
- Choose libraries whose interface has no mode, no IV and no padding to choose
  (chapter 9). If you must use a low-level API, wrap it once, correctly, and
  forbid direct calls.
- Never disable certificate verification, even in test code; test code is
  copied into production.
- Treat parsers, length fields and memory in cryptographic code as the main
  risk, not the cipher.

## 1.4 Three failures at three depths

*Level: beginner.*

Three incidents recur through this book, because between them they cover most
of the ways a correct algorithm ends up protecting nothing. Each is told fully
in a later chapter; here is one paragraph each, to fix them in mind.

**Heartbleed (2014): the code around the cryptography.** TLS has a small
"heartbeat" extension: one side sends a payload with a two-byte length, and the
other echoes it back. OpenSSL's code, written at the end of 2011 and released in
OpenSSL 1.0.1 in March 2012, believed the length field and copied that many
bytes back, whether or not the request contained them. Ask for 64 KB while
sending one byte, and the server answered with 64 KB of whatever lay next to
the request in memory: session cookies, passwords and sometimes the server's
private key. Neel Mehta of Google and a team at Codenomicon in Finland found it
independently; it was disclosed on 7 April 2014 as CVE-2014-0160, when
measurements later put between a quarter and a half of the most popular HTTPS
sites at risk. Nothing about TLS's cryptography was wrong; a bounds check was
missing. [Chapter 8](08-Hostile-Input.md) tells it fully, builds a toy version,
and finds it again with a twenty-line fuzzer. The protocol view is in
[Protocols chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md).

!!! note "Life story: Heartbleed"
    **Born:** a missing length check in OpenSSL's TLS heartbeat code, written
    in December 2011 and released in OpenSSL 1.0.1 in March 2012 ·
    **Purpose:** none; a bug · **Helped:** the mass revocation and reissue of
    certificates in 2014, the Linux Foundation's Core Infrastructure
    Initiative, the LibreSSL and BoringSSL forks, and fuzzing of TLS libraries
    as routine · **Status:** fixed in OpenSSL 1.0.1g on 7 April 2014;
    [Chapter 8](08-Hostile-Input.md)

**The PlayStation 3 key (2010): one constant where a random number belonged.**
Sony signed every piece of PS3 software with ECDSA, and the console refused to
run anything unsigned. ECDSA needs a fresh secret random number, the nonce
$k$, for every signature; if two signatures share $k$, anyone can solve two
linear equations for the private key. At the Chaos Communication Congress in
Berlin on 29 December 2010, the group fail0verflow showed that Sony's signing
tool used the same $k$ every time; the talk made the point with the xkcd
cartoon of a random-number function that always returns 4. Within days a root signing key had been computed and
published, and every console already sold trusted code signed with it forever,
because the public keys that check the first boot stages could not be
changed. The equations were implemented correctly; one value that the standard
says must be random was a constant. The attack is told in
[Cryptanalysis chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md);
[Chapter 4](04-Randomness-in-Practice.md) here covers nonces in practice and
[Chapter 6](06-Big-Numbers-and-Public-Key-Code.md) the defenses in signing code,
including deterministic nonces (RFC 6979), which make this mistake impossible.

!!! note "Life story: the PlayStation 3 signing key"
    **Born:** Sony's code-signing tool for the PlayStation 3 (on sale November
    2006), which used a fixed ECDSA nonce · **Purpose:** to let only
    Sony-signed software run on the console · **Helped:** fail0verflow's
    "Console Hacking 2010" talk (29 December 2010) and the root key published
    on 2 January 2011; it became the standard example of nonce reuse and of
    keys that cannot be replaced in the field · **Status:** the leaked keys
    remain valid on every console that shipped with them;
    [Cryptanalysis chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)

**Storm-0558 (2023): a key in the wrong place, accepted in the wrong place.**
In June 2023 the US State Department noticed unusual mail access in its logs.
Microsoft found that an espionage group it calls Storm-0558 had been reading
the email of about 25 organizations, including US government agencies, with
access tokens it had forged. The tokens were signed with a real Microsoft key:
a signing key for consumer Microsoft accounts, created in 2016 and still
trusted in 2023. Two failures combined. The key had left the system that was
meant to hold it: Microsoft first said, in September 2023, that it had been
copied into a crash dump in April 2021 and later stolen from a debugging
environment, and then in March 2024 that it had found no crash dump containing
the key, so how the key escaped is still not known publicly. And enterprise mail
servers accepted tokens signed by a consumer key, because the validation code
did not check which keys may sign for which issuer. The US Cyber Safety Review
Board's report of April 2024 called the intrusion preventable and the result of
"a cascade of security failures" at Microsoft. [Chapter 12](12-Secrets-in-Operations.md)
tells it fully, as the central case of secrets in operations; the token format
is in [Protocols chapter 14](../protocols/14-OAuth-OpenID-Connect-and-JWT.md).

!!! note "Life story: the Storm-0558 signing key"
    **Born:** a Microsoft consumer-account (MSA) token-signing key created in
    2016 · **Purpose:** to sign access tokens for consumer Microsoft
    services · **Helped:** an espionage group to forge tokens and read the
    mail of about 25 organizations in May and June 2023; afterward, a US Cyber
    Safety Review Board report (April 2024) and Microsoft's commitments to
    move signing keys into hardware and rotate them automatically ·
    **Status:** revoked in 2023; how it was stolen is not publicly known;
    [Chapter 12](12-Secrets-in-Operations.md)

Line the three up and they sit at three different depths. Heartbleed was a
bug in the code of a library. The PS3 was a correct implementation of the
equations with one wrong input, a failure of how the key's use was engineered.
Storm-0558 was a failure of key storage, key scope and operations, in a
company with some of the best cryptographers in the world. None of them
needed a cryptanalyst. All three would have been stopped by something this
book teaches: a bounds check and a fuzzer, a nonce from the right source (or
none at all), a key kept in hardware and checked against its issuer. The next
section turns those depths into a map.

What to do with this:

- For every secret value your code uses (a nonce, an IV, a salt, a key), write
  down where it comes from. If the answer is "a constant", "the time" or "I
  don't know", stop.
- Keep signing keys in hardware that cannot export them (chapter 11), and
  scope every key to one purpose and one issuer (chapter 10).
- Fuzz every parser that reads attacker-supplied bytes, especially length
  fields (chapter 8).

## 1.5 The layers, and the map of this book

*Level: intermediate.*

A deployed cryptographic system is a stack. At the bottom is an algorithm on
paper; at the top is a service run by people. Each layer is built by different
people, with different skills, who usually cannot see the layers below them.
An attacker needs only one layer to fail. Figure 1.3 shows the seven layers
this book uses, with a real failure at each and the chapters that defend it.

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="The seven layers of a cryptographic system, from primitive to operations, with a failure and the chapters for each" fill="currentColor" font-size="14">
<text x="20" y="20" font-weight="bold">layer</text>
<text x="160" y="20" font-weight="bold">a failure that happened</text>
<text x="530" y="20" font-weight="bold">chapters</text>
<rect x="10" y="30" width="620" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="56" font-weight="bold">7 operations</text>
<text x="160" y="56">certificates expire; keys sit in crash dumps</text>
<text x="530" y="56">12, 15, 16, 18</text>
<rect x="10" y="78" width="620" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="104" font-weight="bold">6 keys</text>
<text x="160" y="104">a 2016 signing key still trusted in 2023</text>
<text x="530" y="104">10, 11, 13, 14</text>
<rect x="10" y="126" width="620" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="152" font-weight="bold">5 protocol</text>
<text x="160" y="152">a negotiated downgrade to export keys</text>
<text x="518" y="152" font-size="13">12; Protocols 4</text>
<rect x="10" y="174" width="620" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="200" font-weight="bold">4 API</text>
<text x="160" y="200">asking for "AES" returns ECB mode</text>
<text x="530" y="200">9, 14</text>
<rect x="10" y="222" width="620" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="248" font-weight="bold">3 library</text>
<text x="160" y="248">a parser trusts a length field</text>
<text x="530" y="248">2, 3, 4, 8, 17</text>
<rect x="10" y="270" width="620" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="296" font-weight="bold">2 implementation</text>
<text x="160" y="296">a comparison or exponent leaks through time</text>
<text x="530" y="296">5, 6, 7</text>
<rect x="10" y="318" width="620" height="42" rx="4" fill="currentColor" opacity="0.12"/>
<rect x="10" y="318" width="620" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="344" font-weight="bold">1 primitive</text>
<text x="160" y="344">DES's 56-bit key; MD5 collisions</text>
<text x="530" y="344">book 1; 17, 18</text>
</svg>
<figcaption>Figure 1.3. The seven layers. The shaded bottom layer is where the cryptography book and Cryptanalysis spend most of their time; this book is about the six above it, which is where the misuse studies found almost every failure.</figcaption>
</figure>

**1. Primitive.** The algorithm itself: AES, SHA-256, X25519, ML-KEM. It fails
when it is too weak (DES's 56-bit key), broken (MD5 and SHA-1 collisions) or
designed to fail (Dual_EC_DRBG). Designers, cryptanalysts and standards bodies
own this layer, and the cryptography book and Cryptanalysis cover it. For an
engineer the job here is narrow but real: choose primitives that are standard
and current, and be ready to replace them (chapters 17 and 18).

**2. Implementation.** The code of one primitive, written by library authors.
It fails by leaking: through time (a comparison or an exponentiation that
takes longer for some secrets), through the cache, through power and
electromagnetic emissions, and through faults that make it compute wrongly. It
also fails by being subtly wrong: a carry that is dropped once in $2^{64}$
inputs, a curve point that is not checked. Chapters 5, 6 and 7 are this layer.

**3. Library.** The package that gathers implementations and wraps them with
everything else: parsers for keys and certificates, encodings, random number
plumbing, memory management, error handling, defaults. This is where Heartbleed
lived, and where the 2021 study found the memory bugs. Chapters 2 and 3 (bytes,
encodings, ASN.1 and key files), 4 (randomness), 8 (hostile input) and 17
(choosing and testing libraries) are this layer.

**4. API.** The surface a programmer touches: the functions, their names,
their parameters, their defaults, their errors. A good API asks only questions
the caller can answer. A bad one asks for a mode, an IV and a padding scheme,
and quietly accepts wrong answers, which is how 88% of the Android apps went
wrong. Chapter 9 is this layer, and chapter 14 applies it to application data.

**5. Protocol.** How messages and primitives are put together on the wire or on
disk: TLS, SSH, JWT, a file format. Protocols are the subject of their own
book. This book takes the engineer's side: designing your own small formats
safely (chapter 9's versioned envelopes), and configuring the standard ones on
servers you run (chapter 12, linking to
[Protocols chapter 5](../protocols/05-TLS-in-Practice.md)).

**6. Keys.** Everything about the secrets the system depends on: how they are
generated, where they are stored, who can use them, how they are rotated and
destroyed. A perfect implementation of a perfect protocol protects nothing
once its key is in a source repository. Chapters 10 (the life of a key), 11
(hardware for keys), 13 (passwords on the server) and 14 (data keys) are this
layer.

**7. Operations.** The running system and the people around it: deployment,
configuration, certificates that expire, logs and crash dumps that capture
secrets, software updates, incident response, and the slow work of retiring
old algorithms. Chapters 12, 15, 16 and 18 are this layer.

The layers are a way of asking, about any system, "who could get this wrong,
and would anyone notice?" The table puts the same map in that form.

| Layer | Who builds it | How it typically fails | Who notices |
| --- | --- | --- | --- |
| primitive | designers, standards bodies | weak or broken design | cryptanalysts, years later |
| implementation | library authors | leaks; rare wrong answers | side-channel researchers; test vectors, if they cover the case |
| library | library maintainers | parsers, memory, bad defaults | fuzzers; attackers |
| API | library designers | wrong use is easy and silent | static analyzers; auditors |
| protocol | protocol and format designers | composition, downgrade, ambiguity | formal analysis; protocol researchers |
| keys | application and platform teams | stored, scoped or rotated wrongly | often nobody, until a breach |
| operations | operations and security teams | expiry, leaks into logs, slow response | customers, when it breaks |

Two things follow from the table. First, the further up the stack a mistake
is made, the less likely anyone is to notice it before an attacker does: a
broken primitive is found by people who are paid to look for it; a key left in
a log file is found by whoever reads the log. Second, each layer trusts the
ones below it without being able to check them. An application programmer
cannot see that the library's MAC comparison leaks time; a library author
cannot see that the application stores the key next to the data. Good
engineering at each layer therefore includes making the layer **hard to misuse
from above** (the API, the defaults, the error behavior) and **robust to
failure below** (checking what can be checked, limiting what one failure can
reach).

The map of this book follows from Figure 1.3. Part I is the ground under
layers 2 and 3 (bytes, formats, randomness). Part II climbs from
implementation to API. Part III is keys. Part IV is the protocol and
operations layers of real systems. Each chapter names its layer in its first
section.

What to do with this:

- For the system you are responsible for, write the seven layers down and
  name who owns each one. A layer with no owner is a layer with no defense.
- For each layer, ask what would tell you it had failed. If the answer is
  "an attacker", add a test, a check or a monitor.
- Do not let an upper layer depend on a property a lower layer does not
  promise (for example, that a library's errors are indistinguishable, or that
  its memory is wiped).

## 1.6 Threat models for implementers

*Level: intermediate.*

A threat model is a written answer to three questions: what are we protecting,
from whom, and what can they do? Book 1 answers the third question for an
algorithm, with the classical attack models (ciphertext only, known plaintext,
chosen plaintext, chosen ciphertext; see
[Chapter 1 there](../../book/01-What-Cryptography-Is-For.md)). Those models
treat the algorithm as a sealed box: the attacker sends inputs and sees
outputs. A program is not sealed. It runs on a machine, takes time, uses
memory, writes logs, crashes, is built from dependencies, and is updated. An
implementer's threat model has to include all of that.

Start from Kerckhoffs's principle and take it one step further. Kerckhoffs said
the security of a system must not depend on the secrecy of its design. For an
implementer that means: **assume the attacker has your source code, your
binary and your dependencies**, and can run them on a machine of their own as
often as they like. Whatever your program does differently for different
secrets, they can measure at leisure in their own laboratory before they ever
touch yours.

Then list the attacker's positions. Figure 1.4 shows six, each with what it can
observe and the chapters that defend against it.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Six attacker positions around a running program, with what each can observe" fill="currentColor" font-size="14">
<rect x="230" y="160" width="180" height="80" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="230" y="160" width="180" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="194" text-anchor="middle" font-weight="bold">your program</text>
<text x="320" y="216" text-anchor="middle">keys, secrets, data</text>
<rect x="10" y="20" width="200" height="74" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="20" y="42" font-weight="bold">network</text>
<text x="20" y="62">inputs, outputs, errors,</text>
<text x="20" y="80">response time (ch 5, 8, 9)</text>
<rect x="430" y="20" width="200" height="74" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="440" y="42" font-weight="bold">same machine</text>
<text x="440" y="62">cache, branch predictor,</text>
<text x="440" y="80">shared CPU (ch 5, 6)</text>
<rect x="10" y="163" width="200" height="74" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="20" y="185" font-weight="bold">physical</text>
<text x="20" y="205">power, radiation,</text>
<text x="20" y="223">faults (ch 7, 11)</text>
<rect x="430" y="163" width="200" height="74" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="440" y="185" font-weight="bold">insider and operator</text>
<text x="440" y="205">logs, backups, dumps,</text>
<text x="440" y="223">config (ch 10, 12, 18)</text>
<rect x="10" y="306" width="200" height="74" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="20" y="328" font-weight="bold">supply chain</text>
<text x="20" y="348">dependencies, builds,</text>
<text x="20" y="366">updates (ch 16, 17)</text>
<rect x="430" y="306" width="200" height="74" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="440" y="328" font-weight="bold">the future</text>
<text x="440" y="348">stored ciphertext, new</text>
<text x="440" y="366">attacks (ch 17, 18)</text>
<line x1="210" y1="80" x2="250" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="430" y1="80" x2="390" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="210" y1="200" x2="230" y2="200" stroke="currentColor" stroke-width="1.2"/>
<line x1="430" y1="200" x2="410" y2="200" stroke="currentColor" stroke-width="1.2"/>
<line x1="210" y1="320" x2="250" y2="240" stroke="currentColor" stroke-width="1.2"/>
<line x1="430" y1="320" x2="390" y2="240" stroke="currentColor" stroke-width="1.2"/>
</svg>
<figcaption>Figure 1.4. An implementer's attackers. The classical attack models of book 1 cover only part of the top-left box (inputs and outputs). Everything else in the figure is a channel the algorithm's proof never considered.</figcaption>
</figure>

**The network attacker** sends any bytes it likes and sees what comes back:
the output, the error message, the length of the response, and how long it
took. Most attacks on deployed cryptography start here, because it needs no
access at all. With enough repetitions, Scott Crosby, Dan Wallach and Rudolf
Riedi (2009) could measure differences of tens of microseconds across the
internet and of about 100 nanoseconds across a local network; chapter 5
measures them. Different error messages for "bad
padding" and "bad MAC" have been enough to decrypt traffic (the padding
oracles of
[Cryptanalysis chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)).

**The neighbor on the same machine** shares a CPU, its caches and its branch
predictor: another process, another user, another virtual machine in the same
cloud host, or JavaScript in a browser tab. It can learn which memory
addresses your code touched and which branches it took. Table lookups indexed
by secrets and branches on secrets are what it reads (chapters 5 and 6, and
the attacks in
[Cryptanalysis chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)).

**The physical attacker** holds the device: a smart card, a phone, a car key,
a payment terminal. It can measure power and electromagnetic emissions, and
it can cause faults with voltage glitches, clock glitches or lasers. Chapter 7
is the defense, and chapter 11 is the hardware built to resist it.

**The insider and the operator** are not always hostile, but they see things
an outsider cannot: logs, backups, crash dumps, configuration files,
environment variables, monitoring systems, and the debugging environment
where an engineer opens a dump. Storm-0558's key was in this box. So are most
leaked API keys. Chapters 10, 12 and 18.

**The supply chain** reaches you through what you did not write: libraries,
compilers, build servers, package registries and update channels. The xz
backdoor of 2024 was placed in a compression library by a maintainer who had
spent about two years earning trust, and it hooked the RSA code that the SSH
daemon uses to check a client's key. Chapters 16 and 17.

**The future** is the attacker who records your ciphertext today and reads it
when a new attack or a quantum computer arrives, or who exploits an algorithm
you could not retire in time. Chapters 17 and 18 cover agility and
deprecation; the post-quantum migration is in
[Post-quantum chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md).

### A worked example: a password-reset token

Here is a threat model done by hand for a small, common feature. A web service
lets users reset a forgotten password. It emails a link containing a token;
whoever presents the token may set a new password.

**The asset.** The token is worth exactly one account. Anyone who can produce a
valid token for an account owns it. So the property we need is that nobody but
the email's recipient can produce or obtain a valid token.

**Attempt 1: a six-digit code.** Six digits give $10^6$ possibilities. A network
attacker who can submit guesses for one account at 1,000 per second, with no
limit, needs on average $10^6 / 2 / 1000 = 500$ seconds: about eight minutes.
So we add a limit of 5 guesses per code. Now each code is guessed with
probability $5/10^6 = 1/200{,}000$. But the attacker can also ask for new codes.
If the service sends 1,000 codes a day to one account, the attacker gets
$5{,}000$ guesses a day, a probability of about $0.5\%$ per day, and better than
even odds in about $\ln 2 / 0.005 \approx 139$ days. A threat model has to count
the requests that issue secrets as well as the requests that test them.

**Attempt 2: a 128-bit random token.** There are $2^{128} \approx 3.4 \times
10^{38}$ tokens. Suppose a million tokens are valid at once and the attacker
makes $10^9$ guesses a second for a year, $3.15 \times 10^{16}$ guesses. The
chance that any guess hits any valid token is about

$$
\frac{3.15 \times 10^{16} \times 10^{6}}{3.4 \times 10^{38}} \approx 9 \times 10^{-17}.
$$

Guessing is over. The threat model now moves to the other boxes of Figure 1.4,
which is where the real risk always was:

- *Where does the token come from?* If it comes from a predictable generator,
  the attacker does not guess, they compute (§1.8 shows this with Python's
  `random`). Requirement: the operating system's generator, through `secrets`
  (chapter 4).
- *How is it checked?* If the server compares the presented token with the
  stored one using an early-exit comparison, the time taken leaks how many
  leading bytes match (§1.9). Requirement: store a hash of the token, look it
  up by hash, and compare in constant time (chapter 5).
- *Where else does it appear?* The full reset URL lands in the web server's
  access log, in the email provider's logs, and in any analytics script on the
  reset page that records the address bar. Requirement: tokens never logged;
  the reset page loads no third-party scripts; the token is used once and
  expires in minutes (chapters 9 and 12).
- *What if the database leaks?* If tokens are stored as they are, a copy of the
  database is a set of live keys to accounts. Requirement: store only
  $\mathrm{SHA\text{-}256}(\text{token})$; a 128-bit random token needs no slow
  hash, because there is nothing to guess (chapter 13 explains why passwords
  are different).

Written down, the threat model is short:

```text
Asset:        the ability to set any account's password.
Attackers:    network (guesses, timing, errors); insiders and log readers;
              anyone with a copy of the database.
Out of scope: an attacker who controls the user's email account.
Requirements: 128-bit token from secrets; stored as SHA-256 only;
              constant-time comparison; single use; expires in 15 minutes;
              never logged; no third-party scripts on the reset page;
              rate limit on issuing as well as on checking.
```

Each line of the requirements maps to a test someone can write. That is the
point of the exercise. A threat model that does not end in requirements is an
essay.

What to do with this:

- Write a threat model for each feature that handles a secret, in the form
  above: asset, attackers, out of scope, requirements.
- Include the insider, the log reader and the database copy in every model;
  most real leaks come through them.
- Count the operations that create secrets as well as those that check them.
- Assume the attacker has your source code and can run it.

## 1.7 Principles

*Level: intermediate.*

The rest of the book applies a small number of principles again and again.
None is new; each was learned from failures like those of Figure 1.1. They are
stated here once, with the failure that taught each.

### Misuse resistance

A cryptographic interface is **misuse-resistant** when the easy way to use it
is the safe way, and the unsafe ways are either impossible or loud. The Java
call `Cipher.getInstance("AES")` is the opposite: the shortest code gives the
worst mode. NaCl, published by Daniel Bernstein, Tanja Lange and Peter Schwabe
in 2012, took the other path. Its `crypto_box` function takes a message, a
nonce, the sender's secret key and the receiver's public key, and returns an
authenticated ciphertext. There is no mode to choose, no padding, no separate
MAC step that a programmer could forget, and the algorithms (X25519,
XSalsa20, Poly1305) were chosen to be fast and constant-time everywhere.

Misuse resistance also has a narrower technical meaning. A
**nonce-misuse-resistant** encryption scheme, such as AES-GCM-SIV (RFC 8452),
loses as little as possible when a nonce is repeated: it reveals only whether
the same message was encrypted twice, instead of handing over the
authentication key as AES-GCM does. Extended-nonce schemes such as XChaCha20
make random nonces safe by making them long (192 bits). Chapter 9 covers all
three.

### Boring cryptography

Choose the algorithm, the parameters and the library that the most careful
people have already examined, and do nothing clever with them. Daniel Bernstein
used the phrase "boring crypto" in a 2015 talk for exactly this: cryptography
that is conservative, constant-time, and so well studied that nothing about it
is interesting. Google's fork of OpenSSL, announced by Adam Langley in June
2014, was named BoringSSL for the same reason: fewer features, fewer options,
less code. Every interesting choice is a choice that someone has to analyze,
and the person who makes it in an application is rarely the person best placed
to analyze it. "Don't roll your own crypto" is a narrow version of this rule;
the broad version is "don't be interesting". A home-made mode of operation, an
unusual curve, a hash truncated to save bytes, a key derivation that "adds
some extra mixing": each is a small research project shipped without review.

### One right way

An interface should offer one way to do each job, and that way should be
correct. Options multiply the cases that must be tested and the ways a caller
can choose wrongly. libsodium's `crypto_secretbox_easy` has no parameters
beyond the message, the nonce and the key. Google's Tink (2018) lets the
caller choose a key template, but the templates are a short list of safe
combinations, and the algorithm is stored with the key, so the code that
encrypts never names a cipher at all. Compare the JOSE standards behind JWT,
which offer dozens of algorithm combinations, some of them unsafe in ordinary
use (chapter 9). When a format offers many ways, the attacker gets to choose
which one your code runs.

### Fail closed

When anything is in doubt, refuse. A check that cannot be completed is a check
that failed. goto fail is the textbook case of failing open: the error path
returned the "success" value. GnuTLS had the mirror-image bug in March 2014,
when a certificate-checking function's error path returned a value that
callers read as "valid". Failing closed has three parts:

- **Structure the code so that success is explicit.** Initialize the result
  to "reject", and set it to "accept" in exactly one place, after every check.
- **Give every failure the same outcome.** A decryption that fails because of
  a bad MAC, a bad padding, a bad length or an unknown version should return
  the same error, at the same speed, with the same log line. Different errors
  are an oracle (chapter 9).
- **Never offer an "off" switch for verification.** Certificate checking,
  signature checking and MAC checking should not have a parameter that turns
  them off. The 2012 studies found that every such switch is eventually
  flipped in production.

### Versioning instead of negotiation

Formats and protocols change: algorithms are retired, parameters grow. There
are two ways to allow for that. **Negotiation** lets each message or each
connection say which algorithm it uses, from a list. **Versioning** fixes
everything about a format under a version number, so that version 1 means one
cipher, one MAC, one key derivation, one encoding, and changing anything means
version 2.

Negotiation sounds flexible and has a long record of attacks. In TLS, the
ability to negotiate weak "export" ciphers outlived the export rules by
fifteen years and was exploited in 2015 as FREAK and Logjam, which tricked
servers and clients into using 512-bit keys
([Protocols chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md)). In
JWT, the token itself names the algorithm used to sign it, so for years some
libraries accepted `"alg": "none"`, an unsigned token, or verified an RSA-signed
token as if it were HMAC-signed, with the public key as the HMAC key (chapter 9
and [Protocols chapter 14](../protocols/14-OAuth-OpenID-Connect-and-JWT.md)).
In both cases the attacker chose the algorithm.

Adam Langley, in a 2016 essay on cryptographic agility, argued that each
option is a joint in the system, and that a protocol is better off with one
joint kept well oiled than with many that rust. Later designs took the advice.
WireGuard (2017) has no negotiation at all: one set of algorithms, and a new
protocol version if they ever need changing. PASETO (2018), a replacement for
JWT, puts a version and a purpose at the start of every token (`v4.local.`,
`v4.public.`), and each version fixes its algorithms. The reader checks the
version against the short list it accepts and rejects everything else. §1.9
builds a sealed format in that style.

Versioning still needs agility: the ability to move from version 1 to version
2 across a whole system without breaking old data. That is a property of key
management and operations (chapters 10, 17 and 18), not of the bytes on the
wire.

### Three habits

Three habits run underneath the principles and recur in every part of the book:

- **One key, one purpose.** Never use the same key for encryption and
  authentication, or for two protocols, or for two tenants. Derive separate
  keys from one master with labels (HKDF's `info` field; chapter 10). §1.9
  does this in two lines.
- **Secrets out of logs, errors and dumps.** Anything that prints, logs or
  serializes objects will one day print a key. Mark secret types so they
  refuse to print (chapter 9), scrub logs (chapter 12), and keep keys out of
  processes that can dump memory (chapter 11).
- **Test with hostile input.** A test that sends only valid data proves only
  that the code works for friends. Send bad signatures, wrong lengths,
  truncated messages, unknown versions and random bytes (chapters 8 and 17).

What to do with this:

- Use a library whose high-level interface needs no choice of mode, nonce
  length or padding (libsodium, Tink, or your platform's equivalent); use
  low-level primitives only inside a wrapper you write once and review.
- Put a version at the start of every ciphertext, token and key file you
  define, and accept only the versions you list.
- Initialize every verification result to "reject".
- Return one error for every cryptographic failure.

## 1.8 Code it: three mistakes with the cipher

*Level: intermediate.*

This section and the next write five classic mistakes, each in about twenty
lines, break each one, and fix it. The first three are about how a cipher is
used to encrypt; the last two, in §1.9, are about what surrounds it.

Python's standard library has no AES, so the examples use two stand-ins built
from `hmac` and `hashlib`, and they are **teaching stand-ins only**:

- `toy_block` is a block cipher: four Feistel rounds on 16-byte blocks with
  HMAC-SHA256 as the round function. A Feistel network is a permutation
  whatever its round function
  ([Chapter 6 of the cryptography book](../../book/06-Block-Ciphers.md)), so
  this really is a keyed permutation of 16-byte blocks; four rounds of a
  strong round function give a good theoretical bound, but nobody has
  analyzed this particular cipher and it is slow. It shows ECB's behavior,
  which would be the same with any deterministic block function, AES
  included.
- `keystream` is a stream cipher: HMAC-SHA256 of the nonce and a counter,
  which is a pseudorandom function in counter mode. It behaves like AES in CTR
  mode, the core of AES-GCM.

In real code, use AES-GCM or ChaCha20-Poly1305 from a maintained library, or
better, a high-level interface such as libsodium's `crypto_secretbox` or
Tink's AEAD (chapter 9).

### Mistake 1: ECB

**Break it.** Electronic codebook mode encrypts each 16-byte block on its own,
with the same key. Equal plaintext blocks give equal ciphertext blocks, so the
ciphertext shows the structure of the plaintext, however strong the cipher.
Here is a message of four 16-byte records, three of them the same:

```python
import hashlib, hmac

# A teaching stand-in for AES: four Feistel rounds on 16-byte blocks, with
# HMAC-SHA256 as the round function. It is a real permutation of 16-byte
# blocks, but nobody has analyzed it. It is here only to show what a mode does.
def toy_block(key, block):
    L, R = block[:8], block[8:]
    for i in range(4):
        f = hmac.new(key, bytes([i]) + R, hashlib.sha256).digest()[:8]
        L, R = R, bytes(a ^ b for a, b in zip(L, f))
    return L + R

def ecb_encrypt(key, data):              # BROKEN: every block on its own
    assert len(data) % 16 == 0
    return b"".join(toy_block(key, data[i:i + 16]) for i in range(0, len(data), 16))

key = bytes(range(32))
msg = b"status=approved;status=approved;status=rejected;status=approved;"
ct = ecb_encrypt(key, msg)
names = {}
for i in range(0, len(ct), 16):
    block = ct[i:i + 16]
    names.setdefault(block, "ABCDEFGH"[len(names)])
    print(names[block], block.hex())
```

```text
A 86fe816e34dbebad555f129974fd920e
A 86fe816e34dbebad555f129974fd920e
B 2eb18b78f543ee685e8e0a9000d466bb
A 86fe816e34dbebad555f129974fd920e
```

The attacker who sees this does not know the key or the cipher. They do know
that records 1, 2 and 4 are the same and record 3 is different. If they learn
what any one block says (because it is the commonest, or because they can get
a record of their own encrypted), they can read every copy of it. That is how
the Adobe password database of 2013 was read without a key: equal passwords
gave equal ciphertexts, and the commonest ciphertext was "123456"
([Chapter 8 of the cryptography book](../../book/08-Modes-of-Operation.md)
shows the famous penguin picture and the Adobe case). ECB is also
malleable: blocks can be cut, copied and reordered, and each still decrypts.

<figure class="mars-fig">
<svg viewBox="0 0 640 190" width="640" role="img" aria-label="Four 16-byte records encrypted with ECB and with counter mode" fill="currentColor" font-size="14">
<text x="20" y="36" font-weight="bold">plaintext</text>
<text x="20" y="96" font-weight="bold">ECB</text>
<text x="20" y="156" font-weight="bold">CTR, random nonce</text>
<rect x="170" y="16" width="110" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="225" y="37" text-anchor="middle">approved</text>
<rect x="290" y="16" width="110" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="345" y="37" text-anchor="middle">approved</text>
<rect x="410" y="16" width="110" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="465" y="37" text-anchor="middle">rejected</text>
<rect x="530" y="16" width="100" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="580" y="37" text-anchor="middle">approved</text>
<rect x="170" y="76" width="110" height="32" rx="3" fill="currentColor" opacity="0.45"/>
<text x="225" y="97" text-anchor="middle" font-weight="bold">A</text>
<rect x="290" y="76" width="110" height="32" rx="3" fill="currentColor" opacity="0.45"/>
<text x="345" y="97" text-anchor="middle" font-weight="bold">A</text>
<rect x="410" y="76" width="110" height="32" rx="3" fill="currentColor" opacity="0.15"/>
<text x="465" y="97" text-anchor="middle" font-weight="bold">B</text>
<rect x="530" y="76" width="100" height="32" rx="3" fill="currentColor" opacity="0.45"/>
<text x="580" y="97" text-anchor="middle" font-weight="bold">A</text>
<rect x="170" y="136" width="110" height="32" rx="3" fill="currentColor" opacity="0.15"/>
<text x="225" y="157" text-anchor="middle" font-weight="bold">C</text>
<rect x="290" y="136" width="110" height="32" rx="3" fill="currentColor" opacity="0.35"/>
<text x="345" y="157" text-anchor="middle" font-weight="bold">D</text>
<rect x="410" y="136" width="110" height="32" rx="3" fill="currentColor" opacity="0.55"/>
<text x="465" y="157" text-anchor="middle" font-weight="bold">E</text>
<rect x="530" y="136" width="100" height="32" rx="3" fill="currentColor" opacity="0.25"/>
<text x="580" y="157" text-anchor="middle" font-weight="bold">F</text>
<text x="170" y="186" opacity="0.7">equal letters: equal 16-byte ciphertext blocks</text>
</svg>
<figcaption>Figure 1.5. The code's four records. ECB gives the three equal records one ciphertext block (A) and the different one another (B); the pattern of the plaintext survives. Counter mode with a fresh nonce gives four unrelated blocks, and a different four every time.</figcaption>
</figure>

**Fix it.** Use a mode in which each block's encryption depends on a
per-message value and its position. Counter mode with a random nonce does
this: block $i$ is XORed with $F_K(\text{nonce} \,\|\, i)$, so no two blocks
anywhere use the same keystream.

```python
import hashlib, hmac, secrets

def keystream(key, nonce, n):        # HMAC-SHA256 in counter mode: a stand-in for AES-CTR
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def ctr_encrypt(key, data):          # FIXED: a fresh random nonce for every message
    nonce = secrets.token_bytes(16)
    return nonce + bytes(a ^ b for a, b in zip(data, keystream(key, nonce, len(data))))

key = secrets.token_bytes(32)
msg = b"status=approved;status=approved;status=rejected;status=approved;"
ct = ctr_encrypt(key, msg)[16:]
blocks = [ct[i:i + 16] for i in range(0, len(ct), 16)]
print(len(set(blocks)), "different blocks out of", len(blocks))
print("same message twice, same ciphertext?", ctr_encrypt(key, msg) == ctr_encrypt(key, msg))
```

```text
4 different blocks out of 4
same message twice, same ciphertext? False
```

Every block now differs, and encrypting the same message twice gives
different ciphertexts, which is what the security notion IND-CPA requires
(§1.11). Counter mode alone is still not enough, as mistakes 2 and 5 show.

### Mistake 2: a fixed nonce

**Break it.** Counter mode is safe only while every (key, nonce) pair is used
once. A common mistake is to put the nonce in the code as a constant, or to
derive it from something that repeats (a record number that restarts, a
timestamp in seconds, a counter that resets on reboot). Then two messages are
encrypted with the same keystream $S$:

$$
C_1 = P_1 \oplus S, \qquad C_2 = P_2 \oplus S \quad\Longrightarrow\quad C_1 \oplus C_2 = P_1 \oplus P_2 .
$$

The key and the keystream cancel. By hand, with one byte: let the first
plaintext byte be `M` (0x4D), the second `T` (0x54), and the keystream byte
0x9C. The ciphertext bytes are `0x4D ⊕ 0x9C = 0xD1` and `0x54 ⊕ 0x9C = 0xC8`.
Their XOR is `0xD1 ⊕ 0xC8 = 0x19`, which is exactly `0x4D ⊕ 0x54`: the
keystream has gone. Anyone who
knows or guesses one message reads the other:

```python
import hashlib, hmac, secrets

def keystream(key, nonce, n):
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

NONCE = bytes(16)                    # BROKEN: one nonce, written into the code
def encrypt(key, data):
    return bytes(a ^ b for a, b in zip(data, keystream(key, NONCE, len(data))))

key = secrets.token_bytes(32)
c1 = encrypt(key, b"Meet at the north gate at 9pm.")
c2 = encrypt(key, b"The password is: tangerine-42!")

# The attacker never sees the key. She guesses (or knows) the first message,
# and the same keystream hides both, so XOR undoes the second one too.
known = b"Meet at the north gate at 9pm."
print(bytes(a ^ b ^ k for a, b, k in zip(c1, c2, known)))
```

```text
b'The password is: tangerine-42!'
```

Even without a known message, two English texts XORed together can usually be
pulled apart by guessing common words and seeing what they produce in the
other text ("crib dragging"); this is how the Venona project read Soviet
one-time pads that had been printed twice
([Chapter 4 of the cryptography book](../../book/04-Randomness-and-Perfect-Secrecy.md)).
With AES-GCM the damage is worse: a repeated nonce also reveals the
authentication key, and the attacker can forge messages
([Cryptanalysis chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)).

**Fix it.** Make a new nonce for every message and send it with the
ciphertext. Nonces are not secret; they only must not repeat.

```python
import hashlib, hmac, secrets

def keystream(key, nonce, n):
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def encrypt(key, data):              # FIXED: a new nonce each time, sent with the ciphertext
    nonce = secrets.token_bytes(16)
    return nonce, bytes(a ^ b for a, b in zip(data, keystream(key, nonce, len(data))))

key = secrets.token_bytes(32)
n1, c1 = encrypt(key, b"Meet at the north gate at 9pm.")
n2, c2 = encrypt(key, b"The password is: tangerine-42!")
known = b"Meet at the north gate at 9pm."
guess = bytes(a ^ b ^ k for a, b, k in zip(c1, c2, known))
print("recovered the second message?", guess == b"The password is: tangerine-42!")
```

```text
recovered the second message? False
```

A random nonce needs enough bits that two messages are unlikely ever to draw
the same one. With $q$ messages under one key and $n$-bit random nonces, the
chance of any repeat is about $q^2 / 2^{n+1}$ (the birthday bound). For the
96-bit nonces of AES-GCM, $2^{32}$ messages give about $2^{64}/2^{97} =
2^{-33}$, which is why SP 800-38D limits a key to $2^{32}$ messages with
random nonces. The 128-bit nonce here, or the 192-bit nonce of XChaCha20, puts
the limit out of reach. Chapter 4 compares random and counter nonces.

### Mistake 3: `random` for keys

**Break it.** Python's `random` module, like the default generator of most
languages, is the Mersenne Twister, MT19937. It is fast and statistically
excellent, and it is not a cryptographic generator: its whole state is 624
32-bit words, and each output is a fixed, invertible scrambling (the
"tempering") of one state word. An attacker who sees 624 consecutive 32-bit
outputs can undo the tempering, rebuild the state, and compute every future
output. It does not matter that the generator was seeded from the operating
system; seeding hides the start, not the rest.

Here a server hands out 624 random session identifiers, then makes an API key
with the same generator:

```python
import random

def undo(y, shift, mask, left):      # invert y ^= (y << shift) & mask, or the right-shift form
    t = y
    for _ in range(32 // shift + 1):
        t = y ^ (((t << shift) if left else (t >> shift)) & mask)
    return t & 0xFFFFFFFF

def untemper(y):                     # Mersenne Twister output -> one word of its state
    y = undo(y, 18, 0xFFFFFFFF, False)
    y = undo(y, 15, 0xEFC60000, True)
    y = undo(y, 7, 0x9D2C5680, True)
    return undo(y, 11, 0xFFFFFFFF, False)

server = random.Random()             # seeded from the OS, so it looks safe
session_ids = [server.getrandbits(32) for _ in range(624)]  # handed out to visitors
api_key = server.getrandbits(128)    # BROKEN: a key from the same generator

state = [untemper(v) for v in session_ids]
clone = random.Random()
clone.setstate((3, tuple(state + [624]), None))
print("attacker's guess is the key:", clone.getrandbits(128) == api_key)
```

```text
attacker's guess is the key: True
```

The attacker never guessed anything. The four `undo` calls reverse the four
shift-and-XOR steps of the tempering, each of which is a linear map on 32 bits
that is easy to invert (§1.11 explains why). Seeing outputs of a non-cryptographic
generator is the same as seeing its state. Real attacks need fewer than 624
outputs when the outputs are truncated or when the seed is small; a 32-bit
seed, as in the Milk Sad wallets of §1.10, can simply be searched.

**Fix it.** Use the operating system's generator for anything an attacker
must not predict: keys, tokens, salts, nonces, session identifiers, password
reset codes. In Python that is the `secrets` module (added in Python 3.6 by
PEP 506 for exactly this reason), or `os.urandom`.

```python
import secrets

api_key = secrets.token_bytes(32)    # FIXED: the operating system's generator
token = secrets.token_urlsafe(32)    # for keys, tokens, salts and nonces alike
print(len(api_key), "bytes;", len(token), "characters")
```

```text
32 bytes; 43 characters
```

Keep `random` for simulations, games and shuffling test data. A good rule for
code review is that `import random` in a file that also mentions keys, tokens
or passwords needs an explanation. Chapter 4 explains what the operating
system's generator does and where it can still go wrong (early boot, virtual
machine snapshots, fork).

!!! note "Life story: the Mersenne Twister"
    **Born:** 1997, Makoto Matsumoto and Takuji Nishimura, published in *ACM
    Transactions on Modeling and Computer Simulation* in 1998 ·
    **Purpose:** a fast generator with an enormous period ($2^{19937} - 1$)
    and good statistical behavior, for simulations · **Helped:** became the
    default generator of Python, Ruby, PHP, MATLAB, R and many others; its
    designers also published a cryptographic variant, CryptMT, separately ·
    **Status:** still the default in many languages; never for secrets, and
    Python's documentation says so: use `secrets`

What to do with this:

- Search your code for ECB (and for any API call that names "AES" with no
  mode); replace it with an AEAD.
- Check where every nonce and IV comes from. A constant, a timestamp or a
  counter that can reset is a bug.
- Search for `random`, `Math.random`, `rand()` and `mt_rand` near anything
  secret, and replace them with the operating system's generator.

## 1.9 Code it: two mistakes around the cipher

*Level: intermediate.*

The last two mistakes are not about the cipher at all. One is in how a MAC
is checked; the other is in leaving the MAC out.

### Mistake 4: `==` on MACs

**Break it.** A server receives a message and a tag and checks the tag by
recomputing it and comparing. The natural way to compare in most languages,
`==` or `memcmp`, stops at the first byte that differs. That is good for
speed and bad for secrets: a tag whose first byte is right takes slightly
longer to reject than one whose first byte is wrong. An attacker who can time
the rejection can find the tag one byte at a time, trying 256 values for the
first byte, keeping the slowest, and moving on.

Measuring real nanoseconds from Python is noisy, and chapter 5 does it
properly with statistics. Here the time is modeled by a counter, `work`,
which counts the bytes the comparison looked at, so that the attack is easy to
see and its output is the same on every machine:

```python
import hashlib, hmac

KEY = b"a secret only the server knows"
def tag(msg):
    return hmac.new(KEY, msg, hashlib.sha256).digest()

work = 0                             # stands in for the time the comparison takes
def leaky_equal(a, b):               # BROKEN: stops at the first byte that differs, like ==
    global work
    for x, y in zip(a, b):
        work += 1
        if x != y:
            return False
    return len(a) == len(b)

def verify(msg, t):
    return leaky_equal(tag(msg), t)

msg = b"user=mallory;role=admin"     # a message the attacker wants accepted
guess = bytearray(32)
tries = 0
for i in range(32):
    slowest, best = -1, 0
    for b in range(256):
        guess[i] = b
        work = 0
        tries += 1
        if verify(msg, bytes(guess)):
            best = b
            break
        if work > slowest:
            slowest, best = work, b
    guess[i] = best
print("forged tag accepted:", verify(msg, bytes(guess)), "after", tries, "tries")
```

```text
forged tag accepted: True after 7979 tries
```

The attacker produced a valid HMAC-SHA256 tag for a message of their choice,
without the key, in 7,979 tries: 256 for each of the first 31 bytes, and 43
for the last, where the comparison itself said yes. Guessing the whole tag
would have needed about $2^{255}$ tries on average. The early exit turned a
256-bit search into 32 searches of 8 bits each:

$$
2^{256} \;\longrightarrow\; 32 \times 2^{8} = 2^{13}.
$$

A real attack needs many timing samples per guess, because the difference per
byte is a few nanoseconds or less, and more samples the further the attacker
is from the server; but the work grows linearly with the tag length, not
exponentially, which is why such attacks have succeeded against real systems
(§1.10).

**Fix it.** Compare in a way whose time does not depend on where the inputs
differ: look at every byte, accumulate the differences with OR, and decide at
the end. The model shows that every guess now costs the same:

```python
import hashlib, hmac

KEY = b"a secret only the server knows"
def tag(msg):
    return hmac.new(KEY, msg, hashlib.sha256).digest()

work = 0
def flat_equal(a, b):                # FIXED in shape: always looks at every byte
    global work
    diff = len(a) ^ len(b)
    for x, y in zip(a, b):
        work += 1
        diff |= x ^ y
    return diff == 0

msg = b"user=mallory;role=admin"
seen = set()
for b in range(256):
    work = 0
    flat_equal(tag(msg), bytes([b]) + bytes(31))
    seen.add(work)
print("work values seen:", seen)      # one value: nothing to learn from it
print(hmac.compare_digest(tag(msg), tag(msg)), hmac.compare_digest(tag(msg), bytes(32)))
```

```text
work values seen: {32}
True False
```

The loop in `flat_equal` shows the idea; do not use it. Python gives no
guarantee that a loop over bytes takes the same time for every input, and
neither does C after an optimizing compiler has seen it (chapter 5). Use the
library's function, `hmac.compare_digest` in Python, `crypto_verify_32` in
libsodium, `CRYPTO_memcmp` in OpenSSL, `subtle.ConstantTimeCompare` in Go,
whose authors have taken care of the details.

### Mistake 5: encryption without authentication

**Break it.** Encryption hides a message; it does not stop anyone changing it.
With counter mode, flipping a bit of the ciphertext flips the same bit of the
plaintext, and the receiver decrypts the changed message without noticing.
An attacker who knows the message format can make precise edits:

```python
import hashlib, hmac, secrets

def keystream(key, nonce, n):
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def encrypt(key, data):              # BROKEN: secret, but nothing stops changes
    nonce = secrets.token_bytes(16)
    return nonce + xor(data, keystream(key, nonce, len(data)))

def decrypt(key, blob):
    nonce, body = blob[:16], blob[16:]
    return xor(body, keystream(key, nonce, len(body)))

key = secrets.token_bytes(32)
blob = encrypt(key, b"pay=0000100;to=bob")

# The attacker knows the format, not the key. XOR the change she wants into
# the bytes where the amount sits (offset 16 + 4, after the nonce and "pay=").
change = xor(b"0000100", b"9000100")
evil = blob[:20] + xor(blob[20:27], change) + blob[27:]
print(decrypt(key, evil))
```

```text
b'pay=9000100;to=bob'
```

The attacker turned a payment of 100 into one of 9,000,100, without the key,
by XORing `"0000100" ⊕ "9000100"` into the right bytes. CBC mode is malleable
too, in a slightly different way. Unauthenticated encryption has also been
the root of the padding-oracle attacks, where the receiver's reaction to a
tampered ciphertext leaks the plaintext
([Cryptanalysis chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)),
and of EFAIL (§1.10).

**Fix it.** Authenticate every ciphertext and check the tag before doing
anything else with it: encrypt, then compute a MAC over the nonce and the
ciphertext, and on receipt verify the MAC first, in constant time, and
decrypt only if it is valid. Use separate keys for the two jobs, derived from
one master key with different labels:

```python
import hashlib, hmac, secrets

def keystream(key, nonce, n):
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def subkeys(master):                 # two keys from one, each for one job
    enc = hmac.new(master, b"encrypt", hashlib.sha256).digest()
    mac = hmac.new(master, b"authenticate", hashlib.sha256).digest()
    return enc, mac

def seal(master, data):              # FIXED: encrypt, then MAC everything sent
    enc, mac = subkeys(master)
    nonce = secrets.token_bytes(16)
    body = nonce + xor(data, keystream(enc, nonce, len(data)))
    return body + hmac.new(mac, body, hashlib.sha256).digest()

def open_(master, blob):
    enc, mac = subkeys(master)
    body, t = blob[:-32], blob[-32:]
    if len(blob) < 48 or not hmac.compare_digest(t, hmac.new(mac, body, hashlib.sha256).digest()):
        raise ValueError("message rejected")     # check first, decrypt after
    return xor(body[16:], keystream(enc, body[:16], len(body) - 16))

key = secrets.token_bytes(32)
blob = seal(key, b"pay=0000100;to=bob")
print(open_(key, blob))
evil = blob[:20] + xor(blob[20:27], xor(b"0000100", b"9000100")) + blob[27:]
try:
    open_(key, evil)
except ValueError as e:
    print(e)
```

```text
b'pay=0000100;to=bob'
message rejected
```

This is **encrypt-then-MAC**, and it is the composition that is secure in
general (§1.11). In practice you do not assemble it yourself: an AEAD
(AES-GCM, ChaCha20-Poly1305) does both jobs in one call, with one key, and
returns one error when the tag is wrong
([Chapter 10 of the cryptography book](../../book/10-Message-Authentication.md)).
The code here is what an AEAD does on your behalf.

### Putting it together: a versioned sealed message

The five fixes, together with the principles of §1.7, give a small format for
encrypting a record. It has a version byte, a random nonce, the ciphertext and
a tag (Figure 1.6). The tag covers the version and the nonce as well as the
ciphertext, and also a **context**: the place the record belongs, such as a
database row or a user ID, which is not stored with it but must match when it
is opened. That stops an attacker who can write to the database from moving a
valid ciphertext from one row to another. The context is length-prefixed, so
that no two different (context, ciphertext) pairs can produce the same bytes
under the MAC (chapter 2 explains why that matters).

<figure class="mars-fig">
<svg viewBox="0 0 640 170" width="640" role="img" aria-label="Layout of the sealed message: version, nonce, ciphertext, tag, with the tag covering the context and the other fields" fill="currentColor" font-size="14">
<rect x="20" y="40" width="70" height="40" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="20" y="40" width="70" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="55" y="65" text-anchor="middle" font-weight="bold">0x01</text>
<rect x="90" y="40" width="160" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="170" y="65" text-anchor="middle">nonce</text>
<rect x="250" y="40" width="200" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="350" y="65" text-anchor="middle">ciphertext</text>
<rect x="450" y="40" width="170" height="40" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="450" y="40" width="170" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="535" y="65" text-anchor="middle" font-weight="bold">tag</text>
<text x="55" y="30" text-anchor="middle" opacity="0.7">1 byte</text>
<text x="170" y="30" text-anchor="middle" opacity="0.7">16 bytes</text>
<text x="350" y="30" text-anchor="middle" opacity="0.7">same length as plaintext</text>
<text x="535" y="30" text-anchor="middle" opacity="0.7">32 bytes</text>
<line x1="20" y1="96" x2="450" y2="96" stroke="currentColor" stroke-width="1.2"/>
<line x1="20" y1="90" x2="20" y2="102" stroke="currentColor" stroke-width="1.2"/>
<line x1="450" y1="90" x2="450" y2="102" stroke="currentColor" stroke-width="1.2"/>
<text x="235" y="120" text-anchor="middle">HMAC over: length of context, context, these bytes</text>
<text x="235" y="142" text-anchor="middle" opacity="0.7">(the context, such as a row ID, is not stored)</text>
<line x1="450" y1="110" x2="535" y2="84" stroke="currentColor" stroke-width="1.2"/>
<polygon points="535,84 527,85 531,91" fill="currentColor"/>
</svg>
<figcaption>Figure 1.6. The sealed-message format. A reader checks the version against the one it knows, recomputes the tag over the context and the first three fields, and decrypts only if the tag matches. Every failure gives the same error.</figcaption>
</figure>

```python
import hashlib, hmac, secrets

VERSION = b"\x01"                    # version 1 means exactly these choices, nothing else

def keystream(key, nonce, n):        # stand-in for the cipher of a real AEAD
    out = b""
    for ctr in range((n + 31) // 32):
        out += hmac.new(key, nonce + ctr.to_bytes(4, "big"), hashlib.sha256).digest()
    return out[:n]

def subkey(master, label):           # one key per job, and per version
    return hmac.new(master, b"v1 " + label, hashlib.sha256).digest()

def tag(master, context, head, body):  # the context is length-prefixed: no ambiguity
    data = len(context).to_bytes(2, "big") + context + head + body
    return hmac.new(subkey(master, b"mac"), data, hashlib.sha256).digest()

def seal(master, plaintext, context):
    head = VERSION + secrets.token_bytes(16)
    ks = keystream(subkey(master, b"enc"), head[1:], len(plaintext))
    body = bytes(a ^ b for a, b in zip(plaintext, ks))
    return head + body + tag(master, context, head, body)

def open_(master, blob, context):
    if len(blob) < 1 + 16 + 32 or blob[:1] != VERSION:
        raise ValueError("cannot open")      # the same error for every failure
    head, body, t = blob[:17], blob[17:-32], blob[-32:]
    if not hmac.compare_digest(t, tag(master, context, head, body)):
        raise ValueError("cannot open")
    ks = keystream(subkey(master, b"enc"), head[1:], len(body))
    return bytes(a ^ b for a, b in zip(body, ks))

key = secrets.token_bytes(32)
blob = seal(key, b"balance=120", b"account 7")
print(len(blob), open_(key, blob, b"account 7"))
for name, bad, ctx in [("other row", blob, b"account 8"),
                       ("version 0", b"\x00" + blob[1:], b"account 7"),
                       ("cut short", blob[:30], b"account 7")]:
    try:
        open_(key, bad, ctx)
    except ValueError as e:
        print(name + ":", e)
```

```text
60 b'balance=120'
other row: cannot open
version 0: cannot open
cut short: cannot open
```

The 60 bytes are 1 for the version, 16 for the nonce, 11 for the ciphertext
and 32 for the tag. Each property of the format traces back to a principle.
The version byte means that version 2, when it comes, can change every choice
at once, and a reader that knows only version 1 refuses version 2 instead of
guessing (versioning instead of negotiation). All three failures raise the
same error, and the checks run before any decryption (fail closed). The two
subkeys are derived from one master with labels that include the version
(one key, one purpose). The caller supplies only a key, a message and a
context; there is no mode, no nonce and no MAC for them to get wrong (one
right way). Chapter 9 grows this into a full format with key identifiers and
rotation, and chapter 14 uses it for database fields.

What to do with this:

- Search for `==`, `equals` and `memcmp` applied to MACs, tags, tokens,
  password hashes or signatures; replace each with the library's
  constant-time comparison.
- Never decrypt data that has not been authenticated. Use an AEAD, and treat
  "encryption" without one as a bug report.
- Bind each ciphertext to where it belongs with associated data (a row ID, a
  user ID, a file name).
- Start every format you define with a version, and reject the versions you
  do not know.

## 1.10 In the real world

*Level: intermediate.*

Each of the five mistakes of §1.8 and §1.9 has been made in large, carefully
built products, after it was well known.

**ECB.** Adobe's 2013 breach exposed about 153 million password records
encrypted with triple DES in ECB mode, and they were read through their
patterns and the password hints stored beside them. In April 2020, as video
calls replaced offices, Bill Marczak and John Scott-Railton of the Citizen Lab
at the University of Toronto reported that Zoom encrypted meeting audio and
video with a single AES-128 key per meeting, in ECB mode
(CVE-2020-11500). Zoom moved to AES-256-GCM with version 5.0 of its software
that spring and later added end-to-end encryption.

**Repeated nonces.** In 2016 Hanno Böck, Aaron Zauner, Sean Devlin, Juraj
Somorovsky and Philipp Jovanovic scanned the internet for HTTPS servers using
AES-GCM and looked at the nonces they sent. They found 184 servers that
repeated nonces, among them sites of large companies and financial
institutions, which let anyone in the middle forge content inside the
encrypted connection; in each case the server's TLS implementation generated
the nonce wrongly. They also found more than 70,000 servers
that chose 64-bit nonces at random, which is safe only while a connection
carries far fewer than $2^{32}$ records.

!!! note "Life story: the nonce-disrespecting adversaries"
    **Born:** 2016, Böck, Zauner, Devlin, Somorovsky and Jovanovic, at the
    USENIX WOOT workshop and Black Hat USA · **Purpose:** to measure how often
    real TLS servers repeat AES-GCM nonces, and to show the forgery that
    results · **Helped:** fixes from the affected vendors; it strengthened the
    case for TLS 1.3's rule that the nonce is derived from a sequence number,
    never chosen by the implementation, and for nonce-misuse-resistant modes
    · **Status:** the standard real-world citation for GCM nonce reuse; the
    attack itself is in
    [Cryptanalysis chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)

**Non-cryptographic generators.** In July 2023 a group of researchers
investigating thefts from Bitcoin wallets traced them to Libbitcoin Explorer,
whose `bx seed` command (versions 3.0.0 to 3.6.0) produced wallet seeds from
the Mersenne Twister seeded with 32 bits of the system time. With only $2^{32}$
possible seeds, an attacker could generate every wallet the tool could ever
make and empty those that held money. They named it **Milk Sad**, after the
first two words of the recovery phrase that the seed 0 produces. Attackers had
found it first: the thefts were in June and July 2023. It is the same mistake
as §1.8's, with the search even easier because the seed was small.
[Cryptanalysis chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md)
tells it with the rest of the generator failures.

!!! note "Life story: Milk Sad"
    **Born:** Libbitcoin Explorer's `bx seed` command, which from version
    3.0.0 seeded the Mersenne Twister with a 32-bit time value · **Purpose:**
    to generate the entropy for new cryptocurrency wallets · **Helped:**
    thieves who emptied wallets in June and July 2023; then the researchers'
    disclosure in August 2023 (CVE-2023-39910), which named it · **Status:**
    every wallet made this way must be considered compromised; the project
    disputed that `bx seed` was meant for production use, a reminder that a
    tool's documentation is not its threat model

**Leaky comparisons.** In 2009 Nate Lawson reported that Google's Keyczar
library, written specifically to make cryptography easy to use correctly,
checked HMAC tags in its Python and Java versions with an ordinary
comparison that returned at the first differing byte. The same year Java's
own `MessageDigest.isEqual`, the obvious standard function for comparing
digests, was changed to compare in constant time; it too had returned early.
The fix in each case was a few lines. Every serious library now has a
constant-time comparison, and the bug still appears in application code that
compares tokens, API keys or password reset codes with `==`.

**Unauthenticated encryption.** In May 2018 Damian Poddebniak and colleagues
from Münster University of Applied Sciences, Ruhr University Bochum and KU
Leuven published **EFAIL**. Encrypted email in the S/MIME standard used CBC
with no authentication at all; OpenPGP used CFB with an optional integrity
check that many mail clients ignored when it failed. An attacker who had
captured an encrypted email could edit its ciphertext so that, when the victim
opened it, the decrypted text was wrapped in an HTML image tag whose address
pointed at the attacker's server. The victim's own mail client decrypted the
message and sent the plaintext to the attacker in the image request. Two
mistakes together: encryption without authentication, and a check that failed
open.

!!! note "Life story: EFAIL"
    **Born:** May 2018, Damian Poddebniak, Christian Dresen, Jens Müller,
    Fabian Ising, Sebastian Schinzel, Simon Friedberger, Juraj Somorovsky and
    Jörg Schwenk; published at USENIX Security 2018 · **Purpose:** to show
    that encrypted email's malleable modes let an attacker turn a victim's
    mail client into a decryption oracle · **Helped:** mail clients stopped
    showing OpenPGP messages whose integrity check failed; S/MIME 4.0
    (RFC 8551, 2019) added AES-GCM; the case for authenticated encryption
    everywhere · **Status:** fixed in the main clients; old S/MIME
    implementations remain exposed. Email is in
    [Protocols](../protocols/index.md)

The pattern across all five is the same. Each mistake was documented, with
an attack, years before it was made in that product. None of the products was
built by careless people. Each mistake was easy to make with the interface
the programmers had, and invisible in normal use: ECB, a repeated nonce,
`random`, `==` and an unauthenticated mode all work perfectly when nobody is
attacking. That is why the fix is mostly in the tools: interfaces that cannot
express the mistake, analyzers that look for it, and tests that attack.

What to do with this:

- Add the five mistakes to your code review checklist, with the search
  strings of §1.8 and §1.9.
- Run a static checker for cryptographic misuse on your codebase (chapter 17
  lists some), and treat its findings as bugs until shown otherwise.
- For each product decision that touches cryptography, ask what happens when
  someone is attacking, not only whether it works.

## 1.11 Going deeper

*Level: expert.*

**Why deterministic encryption cannot be secure.** The standard notion for an
encryption scheme is indistinguishability under chosen-plaintext attack
(IND-CPA): an attacker who can ask for encryptions of messages of its choice
submits two equal-length messages $M_0, M_1$, receives the encryption of
$M_b$ for a random bit $b$, and must guess $b$. If encryption is deterministic,
the attacker asks for the encryption of $M_0$ first and compares; it wins with
certainty. ECB fails this before any question of patterns arises, and so does
any scheme with a fixed nonce. A randomized or nonce-based scheme passes,
provided the nonce never repeats. The definitions, and the proofs that CTR
mode meets them when the block function is a pseudorandom function, are in
[Chapter 17 of the cryptography book](../../book/17-Defining-Security.md).

**Why encrypt-then-MAC.** In 2000 Mihir Bellare and Chanathip Namprempre
compared the three ways of combining a cipher with a MAC. If the encryption is
IND-CPA and the MAC is strongly unforgeable, encrypt-then-MAC gives both
integrity of ciphertexts (INT-CTXT) and security against chosen-ciphertext
attack (IND-CCA). MAC-then-encrypt and encrypt-and-MAC do not in general:
there are IND-CPA ciphers and secure MACs for which each fails, and TLS's
MAC-then-encrypt with CBC became the source of a decade of padding oracles.
Hugo Krawczyk reached similar conclusions in 2001. The proof idea for
encrypt-then-MAC is short: because forged ciphertexts are rejected before
decryption, a decryption oracle answers only on ciphertexts the attacker
already got from the encryption oracle, so it gives the attacker nothing
new, and IND-CCA reduces to IND-CPA. That is also the formal reason for the
rule "verify before you decrypt": the reduction needs the decryption code to
be unreachable for forgeries.

**Nonce misuse, formally.** Phillip Rogaway and Thomas Shrimpton (2006)
defined *deterministic authenticated encryption* and the SIV construction:
the IV is a MAC (a pseudorandom function) of the key, the associated data and
the message, so a repeated nonce, or no nonce at all, reveals only whether
the same (associated data, message) pair was encrypted before. This is the
best possible for any scheme that is deterministic in its inputs, and it is
the precise meaning of "nonce-misuse resistant" in chapter 9. AES-GCM-SIV
(RFC 8452, 2019) is the standardized version.

**The Mersenne Twister is linear.** Work over $\mathbb{F}_2$, where XOR is
addition. Each tempering step has the form $y \mapsto y \oplus ((y \gg s) \wedge
m)$ or $y \mapsto y \oplus ((y \ll s) \wedge m)$: in matrix form $y \mapsto (I +
N) y$, where $N$ shifts and masks. Because a shift by $s$ applied $\lceil
32/s \rceil$ times moves every bit out of a 32-bit word, $N$ is nilpotent, so
$(I + N)^{-1} = I + N + N^2 + \cdots + N^{k-1}$ for $k = \lceil 32/s \rceil$.
The `undo` function of §1.8 computes exactly this sum by iterating $t
\leftarrow y \oplus N t$; after $k$ steps $t$ is the inverse image. The state
update is linear too, so every output bit is a fixed linear function of the
19,937 bits of the initial state. Any 19,937 linearly independent output bits
determine the state by Gaussian elimination, even if they are not consecutive
or are truncated outputs; 624 consecutive full words, 19,968 bits, are just the
easiest case. A cryptographic generator is designed so that no such structure
exists: predicting its next output is as hard as breaking the underlying
primitive.

**The cost of a leaky comparison.** Write a tag of $n$ bytes. A comparison that
exits at the first difference lets an attacker search each byte separately, so
the number of guesses falls from about $2^{8n-1}$ on average to at most $256n$.
With noise, each guess needs $s$ timing samples to distinguish a time
difference $\delta$ from a noise of standard deviation $\sigma$, and by the
usual statistics $s$ grows like $(\sigma/\delta)^2$; the total is about $256
\, n \, s$. The attack becomes impractical only when $s$ is enormous, which is
why the remedy is to remove $\delta$, not to hope the noise is large.
Crosby, Wallach and Riedi (2009) measured what $\delta$ an attacker can resolve
in practice; chapter 5 builds the statistical test.

**Measuring misuse.** The static analyzers behind the misuse studies have
grown into tools. CogniCrypt (2017) and its rule language CrySL (Krüger and
colleagues, ECOOP 2018) describe the correct use of each Java cryptography
class as a specification and check code against it; CryptoGuard (Rahaman and
colleagues, CCS 2019) scaled such checks to millions of lines with few false
positives. Their limit is the one CryptoLint had: a tool sees that a constant
key is used, not whether it protects anything of value. The research question
the 2014 paper ended with, how to make misuse impossible rather than
detectable, is the subject of chapter 9; the complementary question, how to
make the library itself correct, has answers in formal verification (HACL\*,
Fiat-Crypto, and others), which chapter 17 surveys.

## Check yourself

??? question "1. The misuse study of 2014 found that 17% of cryptographic CVEs were in libraries and 83% in applications. Give two reasons the 17% understates the libraries' share of the harm."

    A library bug affects every application that uses the library, so one
    entry can mean thousands of vulnerable deployments. And the study counted
    only CVEs tagged as cryptographic issues (CWE-310); memory-safety bugs in
    libraries, such as Heartbleed, were tagged otherwise and fell outside it.

??? question "2. A Java programmer calls `Cipher.getInstance` with the bare name AES, naming no mode. What do they get, and what should they ask for instead?"

    With the standard provider they get AES in ECB mode with PKCS#5 padding:
    no IV, equal blocks give equal ciphertexts, and nothing detects tampering.
    They should use an AEAD, such as `"AES/GCM/NoPadding"` with a fresh 96-bit
    nonce per message, or better a high-level library such as Tink that does
    not ask for a mode at all.

??? question "3. Name the layer (§1.5) of each failure: Heartbleed, the PS3 signing key, Storm-0558, goto fail."

    Heartbleed: library (a parser trusted a length field). PS3: keys, or the
    implementation of signing; the equations were right, the nonce came from
    the wrong place. Storm-0558: keys and operations (a key outside its
    system, accepted outside its scope). goto fail: implementation of the
    protocol inside a library (a check skipped by control flow).

??? question "4. Two messages are encrypted in CTR mode with the same key and nonce. The ciphertext bytes at one position are 0x3A and 0x7E. The first message has the letter `e` (0x65) there. What is the second message's byte?"

    `0x3A ⊕ 0x7E = 0x44`, and `0x44 ⊕ 0x65 = 0x21`, which is `!`.

??? question "5. A service draws 96-bit random nonces for AES-GCM under one key. Roughly how many messages can it encrypt before the chance of a repeated nonce reaches $2^{-32}$?"

    The chance is about $q^2/2^{97}$. Setting $q^2/2^{97} = 2^{-32}$ gives
    $q^2 = 2^{65}$, so $q \approx 2^{32.5}$, about six billion messages.
    SP 800-38D's limit of $2^{32}$ messages keeps the chance below about
    $2^{-33}$.

??? question "6. Why does seeding Python's `random` from the operating system not make it safe for keys?"

    The seed only sets the starting state. Each output is an invertible
    function of one state word, and the state evolves linearly, so 624
    outputs (or any 19,937 independent output bits) reveal the state and
    every later output, however it was seeded.

??? question "7. In §1.9's timing attack, the tag is 32 bytes and the attacker needs 7,979 tries. How many would it need for a 16-byte tag, and why is making tags longer not a fix?"

    At most $16 \times 256 = 4{,}096$ tries. The work grows linearly with the
    tag length under an early-exit comparison, so doubling the tag only
    doubles the attack. The fix is to remove the timing difference with a
    constant-time comparison.

??? question "8. A format puts the algorithm name in its header, and the reader uses whatever algorithm the header names. What principle does this break, and what attack does it invite?"

    Versioning instead of negotiation: the attacker chooses the algorithm.
    It invites downgrade and confusion attacks, such as JWT's `alg: none`
    and verifying an RSA-signed token as HMAC with the public key as the
    secret. The reader should accept only a fixed list of versions, each of
    which fixes the algorithms.

??? question "9. Spot the mistakes. This code issues and checks login tokens."

    ```text
    import random, hashlib
    KEY = b"0123456789abcdef"
    def make_token(user):
        r = str(random.getrandbits(32))
        return user + ":" + r + ":" + hashlib.sha256(KEY + user.encode() + r.encode()).hexdigest()
    def check(token):
        user, r, t = token.split(":")
        return hashlib.sha256(KEY + user.encode() + r.encode()).hexdigest() == t
    ```

    At least six. (1) The key is a constant in the source code, so anyone with
    the code can make tokens. (2) The tag is SHA-256 of key and message joined
    together, not HMAC: SHA-256 allows length-extension forgeries. (3) The
    user name and `r` are concatenated without a separator or length, so
    `user="alice1", r="23"` has the same tag as `user="alice", r="123"`: a
    token for one user is a token for another. (4) The comparison is `==`, which
    leaks timing. (5) `random` and a 32-bit value make `r` predictable and
    short. (6) There is no expiry and no version, so a token works forever and
    the format cannot be changed. A fix: a random 256-bit key from `secrets`
    kept outside the code, HMAC-SHA256 over a length-prefixed encoding of
    version, user and expiry, and `hmac.compare_digest`.

??? question "10. Bellare and Namprempre showed that encrypt-then-MAC gives IND-CCA security from an IND-CPA cipher and a strongly unforgeable MAC. Why does the proof need the MAC to be checked before decryption, and what goes wrong in MAC-then-encrypt?"

    In the proof, the decryption oracle is useless to the attacker because
    every ciphertext it did not get from the encryption oracle is rejected
    before decryption, so the decryption code never runs on attacker-made
    input. In MAC-then-encrypt the receiver must decrypt first and check the
    MAC afterwards, so decryption (and padding removal) runs on forged
    ciphertexts, and any difference in how it fails (an error message, a
    timing difference) becomes an oracle. That is the padding-oracle family.

## What you learned

- Cryptographic engineering turns correct algorithms into safe systems.
  Almost all real failures are in code, interfaces, keys and operations, not
  in the mathematics.
- The misuse studies measured it: 88% of Android apps that used cryptography
  APIs made at least one mistake (2013), 83% of cryptographic CVEs from 2011
  to 2014 were application misuse (2014), and inside the libraries
  memory-safety bugs outnumbered cryptographic ones (2021).
- Heartbleed (a missing bounds check), the PS3 key (a constant nonce) and
  Storm-0558 (a key outside its system and accepted outside its scope) show
  failures at three depths, none of them cryptanalytic.
- A system has seven layers: primitive, implementation, library, API,
  protocol, keys, operations. The higher the layer, the less likely anyone but
  an attacker is to notice a failure.
- An implementer's threat model goes beyond inputs and outputs: timing, the
  same machine, physical access, insiders and logs, the supply chain and the
  future. A threat model should end in testable requirements.
- The principles: misuse resistance, boring cryptography, one right way, fail
  closed, versioning instead of negotiation; with one key per purpose,
  secrets out of logs, and tests with hostile input.
- The five classic mistakes and their fixes: ECB (use an AEAD), a fixed nonce
  (a fresh nonce per message), `random` (use `secrets`), `==` on MACs
  (`hmac.compare_digest`), and unauthenticated encryption (encrypt then MAC,
  verify first).

**Next:** [Chapter 2](02-Bytes-Encodings-and-Text.md), the bytes underneath it
all: integers, hex, Base64 and its cousins, Unicode, and why an encoding that
can be read two ways is a security bug.

## Further reading

- David Lazar, Haogang Chen, Xi Wang and Nickolai Zeldovich, "Why does
  cryptographic software fail? A case study and open problems", APSys 2014.
- Manuel Egele, David Brumley, Yanick Fratantonio and Christopher Kruegel,
  "An empirical study of cryptographic misuse in Android applications", ACM
  CCS 2013.
- Martin Georgiev, Subodh Iyengar, Suman Jana, Rishita Anubhai, Dan Boneh and
  Vitaly Shmatikov, "The most dangerous code in the world: validating SSL
  certificates in non-browser software", ACM CCS 2012.
- Sascha Fahl, Marian Harbach, Thomas Muders, Lars Baumgärtner, Bernd
  Freisleben and Matthew Smith, "Why Eve and Mallory love Android: an analysis
  of Android SSL (in)security", ACM CCS 2012.
- Sarah Nadi, Stefan Krüger, Mira Mezini and Eric Bodden, "Jumping through
  hoops: why do Java developers struggle with cryptography APIs?", ICSE 2016.
- Yasemin Acar, Michael Backes, Sascha Fahl, Simson Garfinkel, Doowon Kim,
  Michelle Mazurek and Christian Stransky, "Comparing the usability of
  cryptographic APIs", IEEE Symposium on Security and Privacy 2017.
- Jenny Blessing, Michael A. Specter and Daniel J. Weitzner, "You really
  shouldn't roll your own crypto: an empirical study of vulnerabilities in
  cryptographic libraries", arXiv 2107.04940 (2021).
- Adam Langley, "Apple's SSL/TLS bug", ImperialViolet (22 February 2014);
  Apple security update for CVE-2014-1266 (February 2014).
- Zakir Durumeric and colleagues, "The matter of Heartbleed", IMC 2014.
- fail0verflow, "Console Hacking 2010: PS3 Epic Fail", 27th Chaos
  Communication Congress (29 December 2010).
- Microsoft Security Response Center, "Results of major technical
  investigations for Storm-0558 key acquisition" (6 September 2023, updated
  12 March 2024).
- Cyber Safety Review Board, *Review of the Summer 2023 Microsoft Exchange
  Online Intrusion* (published 2 April 2024).
- Daniel J. Bernstein, Tanja Lange and Peter Schwabe, "The security impact of
  a new cryptographic library", LATINCRYPT 2012 (NaCl).
- Adam Langley, "Cryptographic agility", ImperialViolet (16 May 2016).
- Scott Crosby, Dan Wallach and Rudolf Riedi, "Opportunities and limits of
  remote timing attacks", *ACM Transactions on Information and System
  Security* 12 (2009).
- Hanno Böck, Aaron Zauner, Sean Devlin, Juraj Somorovsky and Philipp
  Jovanovic, "Nonce-disrespecting adversaries: practical forgery attacks on
  GCM in TLS", USENIX WOOT 2016.
- Damian Poddebniak and colleagues, "Efail: breaking S/MIME and OpenPGP email
  encryption using exfiltration channels", USENIX Security 2018.
- Bill Marczak and John Scott-Railton, "Move fast and roll your own crypto: a
  quick look at the confidentiality of Zoom meetings", Citizen Lab (3 April
  2020).
- The Milk Sad disclosure (August 2023) and CVE-2023-39910.
- Makoto Matsumoto and Takuji Nishimura, "Mersenne Twister: a
  623-dimensionally equidistributed uniform pseudo-random number generator",
  *ACM Transactions on Modeling and Computer Simulation* 8 (1998).
- PEP 506, "Adding a secrets module to the standard library" (2015).
- Mihir Bellare and Chanathip Namprempre, "Authenticated encryption: relations
  among notions and analysis of the generic composition paradigm", ASIACRYPT
  2000.
- Phillip Rogaway and Thomas Shrimpton, "A provable-security treatment of the
  key-wrap problem", EUROCRYPT 2006 (deterministic authenticated encryption
  and SIV).
- Stefan Krüger and colleagues, "CrySL: an extensible approach to validating
  the correct usage of cryptographic APIs", ECOOP 2018; Sazzadur Rahaman and
  colleagues, "CryptoGuard: high precision detection of cryptographic
  vulnerabilities in massive-sized Java projects", ACM CCS 2019.
- SP 800-38D (2007), the GCM specification and its nonce limits; RFC 8452
  (2019), AES-GCM-SIV; RFC 6979 (2013), deterministic DSA and ECDSA nonces.
- Reference pages: [AEAD](../../05-modes-aead/AEAD.md),
  [the operating system's generator](../../09-random/OS-RNG.md), and
  [HMAC](../../06-mac/HMAC.md).
