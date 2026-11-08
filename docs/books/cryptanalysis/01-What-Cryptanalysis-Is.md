# 1. What Cryptanalysis Is

*Cryptanalysis is the work of reading what you were not meant to read: finding
the plaintext, the key, or a forged message, with no more than an attacker
really has. This chapter sets up the trade. It looks at Kerckhoffs's principle
from the other side of the table, sorts attacks by what the attacker can see
and do, and measures every attack in three currencies (time, data and memory)
against the plain baseline of trying every key. It separates the breaks that
end a cipher's life from the ones that only end its reputation, tells the
history of breaking from ninth-century Baghdad to a laptop in 2022, and shows
how a break reaches the world. You will time a brute-force search on your own
machine and break a shift cipher from its ciphertext alone.*

!!! abstract "In this chapter"
    **You will learn:**

    - what an attacker is trying to win, from a whole key down to one bit of a message;
    - Kerckhoffs's principle as the attacker uses it, and how attackers get hold
      of a secret method;
    - the attack models: ciphertext only, known plaintext, chosen plaintext,
      chosen ciphertext and related key, with what each looks like in practice;
    - the three costs of an attack, and how a break is measured against brute force;
    - why some "breaks" change nothing in practice, and why they still matter;
    - the history of breaking, from al-Kindi to the fall of SIKE in 2022;
    - how attacks are published, disclosed and checked.

    **You need:** [Chapter 1](../../book/01-What-Cryptography-Is-For.md) of the
    cryptography book (the attack models, bits of security) and
    [Chapter 2](../../book/02-Classical-Ciphers.md) (shift and substitution
    ciphers, frequency analysis). Nothing else.

    **Levels:** §1.1 to §1.4 and §1.6 to §1.8 are for beginners, §1.5 and §1.9
    are intermediate, §1.10 is expert.

## 1.1 The problem

*Level: beginner.*

In the summer of 1586 Mary, Queen of Scots, had been a prisoner in England for
eighteen years. Her letters went in and out of Chartley Hall hidden in the
stoppers of beer barrels, and they were written in a **nomenclator**: a cipher
alphabet of symbols for the letters, plus extra symbols for common words and
names. A young Catholic gentleman, Anthony Babington, wrote to her about a plan
to free her and to kill Queen Elizabeth. On 17 July Mary answered, in cipher,
and approved it.

She did not know that the brewer was working for Sir Francis Walsingham,
Elizabeth's secretary of state, and that every letter was copied before it
reached her. The copies went to Thomas Phelippes, a linguist who had taught
himself to read ciphers. Phelippes had no key. He had the ciphertexts, a good
guess at their language, and patience. He counted symbols, guessed the commonest
ones as the commonest letters, tried short words, and rebuilt the nomenclator.
When Mary's reply came through he read it, drew a gallows on the copy, and then
did something no cipher clerk would have expected: he added a forged postscript
in the same cipher, asking Babington for the names of the six men who would do
the killing. Babington and his friends were arrested in August. Mary was tried
on the evidence of her own deciphered letters and executed in February 1587.

That story holds most of this book in small.

- **The attacker had only ciphertext.** Phelippes never saw a key. He worked
  from intercepted messages and his knowledge of the language inside them.
- **He knew the kind of system.** Nomenclators were common; he knew roughly how
  one was built. Only the particular key was secret.
- **He recovered the key, not just one message.** Once the nomenclator was
  rebuilt, every later letter was open.
- **He forged.** Knowing the key let him write a message the recipient trusted.
  Breaking secrecy also broke authenticity.
- **The weak point was not only the cipher.** The courier was turned before the
  cipher was attacked. Real breaks almost always combine mathematics with
  access.

The story did not end in 1587. In 2023 George Lasry, Norbert Biermann and
Satoshi Tomokiyo found more than fifty of Mary's ciphered letters, written
between 1578 and 1584 and filed in the French national library as unidentified
Italian documents, and read them with a computer search descended from
Phelippes's method ([book 1, §2.11](../../book/02-Classical-Ciphers.md)).

**Cryptanalysis** is the name for this work: recovering information protected by
cryptography without being given the key. The word was coined in 1920 by William
Friedman, the American codebreaker, to replace older words like "deciphering"
that did not separate the legitimate reader, who has the key, from the attacker,
who does not. **Cryptography** builds the systems, cryptanalysis attacks them,
and **cryptology** is the name for both.

### What an attacker wants

"Breaking a cipher" covers a range of wins. From the biggest to the smallest:

1. **Key recovery.** The attacker learns the key and can do everything the key
   holder can. Phelippes won this.
2. **Plaintext recovery.** The attacker reads one message, or many, without the
   key. A **codebook** attack that collects plaintext and ciphertext pairs until
   it can look up new ciphertexts is one way.
3. **Forgery.** The attacker makes a message, signature or tag that the receiver
   accepts as genuine. For a MAC or a signature scheme this is the main goal.
4. **Partial information.** One bit of a message, its length, whether two
   messages are the same, which of two candidates was sent.
5. **Distinguishing.** The attacker can tell the cipher's output from random
   bytes with better than even odds, and nothing more.

The list is the same as Lars Knudsen's ladder of breaks in
[book 1, §1.11](../../book/01-What-Cryptography-Is-For.md), with forgery added,
because some systems exist only to stop forgeries. It matters for how a result is
read. A distinguisher on a block cipher sounds harmless: no key, no message. But
the security proofs of the modes that use the cipher assume there is no
distinguisher at all, and history shows that distinguishers grow. RC4's first
published biases in 1995 and 2001 were distinguishers; by 2013 they had become
plaintext recovery of cookies sent over TLS ([Chapter 8](08-Attacks-on-Stream-Ciphers.md)).

### What this book does

Each chapter of this book takes a family of attacks and does them for real. The
pattern is always the same: the problem the attacker faces, the idea that solves
it, a small example worked by hand, the attack in Python on a toy version you can
run in seconds, then the attack as it happened in the world, with dates, costs and
names. Every chapter links to the chapter of the
[cryptography book](../../book/index.md) that builds the system under attack.

This first chapter has no single attack. It sets out the rules of the game: what
the attacker is allowed to know (§1.2), what they can see and do (§1.3), how
their work is counted (§1.4), when a result counts as a break (§1.5), and how
breaks have been made and made public over twelve centuries (§1.7 to §1.9). The
one attack it does in full, in §1.6, is the oldest: reading a shift cipher by
counting letters.

!!! note "Life story: the Babington plot decipherment"
    **Born:** 1586, Thomas Phelippes working for Sir Francis Walsingham, on Mary,
    Queen of Scots' nomenclator · **Purpose:** read the correspondence of a
    prisoner suspected of plotting against Elizabeth I · **Helped:** convict
    Babington's circle and Mary herself; Phelippes's forged postscript is one of
    the first recorded uses of a broken key to forge a message · **Status:**
    closed history; Mary was executed on 8 February 1587, and in 2023 a computer
    search read more of her letters

## 1.2 Kerckhoffs from the attacker's side

*Level: beginner.*

Book 1 states Kerckhoffs's principle as a rule for designers: a system must stay
secure when everything about it except the key is known
([book 1, §1.5](../../book/01-What-Cryptography-Is-For.md)). For the attacker the
same sentence is a working assumption, and a promise. It says: you may assume
you know the algorithm, the protocol, the formats and the software, and a design
that needs you not to know them is already weak.

Cryptanalysts take this literally. A published attack always starts by stating
what the attacker knows, and the method is always on the known side.
Figure 1.1 shows the usual setting.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Alice sends ciphertext to Bob over a channel the attacker watches; the attacker knows the algorithm, the formats and the ciphertext, and lacks only the key" fill="currentColor" font-size="14">
<rect x="20" y="40" width="130" height="50" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="62" text-anchor="middle" font-weight="bold">Alice</text>
<text x="85" y="80" text-anchor="middle" font-size="12">has the key K</text>
<rect x="490" y="40" width="130" height="50" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="555" y="62" text-anchor="middle" font-weight="bold">Bob</text>
<text x="555" y="80" text-anchor="middle" font-size="12">has the key K</text>
<line x1="150" y1="65" x2="482" y2="65" stroke="currentColor" stroke-width="1.6"/>
<polygon points="490,65 481,69 481,61"/>
<text x="320" y="56" text-anchor="middle" font-size="13">ciphertext C = E(K, P)</text>
<line x1="320" y1="68" x2="320" y2="128" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<polygon points="320,136 316,127 324,127"/>
<rect x="170" y="138" width="300" height="140" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="320" y="160" text-anchor="middle" font-weight="bold">The attacker</text>
<text x="190" y="186" font-size="13">knows: the algorithm E and D</text>
<text x="190" y="206" font-size="13">knows: the protocol, formats, software</text>
<text x="190" y="226" font-size="13">sees: C, and maybe some P (§1.3)</text>
<rect x="184" y="236" width="272" height="24" rx="4" fill="currentColor" fill-opacity="0.1"/>
<text x="190" y="252" font-size="13" font-weight="bold">lacks: only the key K</text>
</svg>
<figcaption>Figure 1.1. The attacker's position under Kerckhoffs's principle. Everything is public except the key; the attacker's whole job is to make up for that one missing piece.</figcaption>
</figure>

### Getting the method

The principle is not just a convention. Attackers do get the method, and the
ways they get it are worth knowing, because a defender who keeps a design secret
is betting against all of them.

- **Capture.** In August 1914 the German cruiser *Magdeburg* ran aground in the
  Baltic, and the Russian navy recovered its signal book and passed a copy to
  the British Admiralty, where it helped the new codebreaking office, Room 40,
  read German naval traffic for the rest of the war. In the Second World War the
  Royal Navy boarded sinking U-boats and weather ships to seize Enigma settings.
  The Americans who broke Japan's Purple machine in 1940 never saw one; they
  rebuilt it from its output, and found later that their copy matched the real
  machine closely.
- **Insiders.** In 1931 and 1932 Hans-Thilo Schmidt, a German cipher office
  employee, sold Enigma manuals and key lists to French intelligence. The
  documents reached Marian Rejewski in Warsaw and gave him the extra equations he
  needed to solve for the machine's wiring ([Chapter 3](03-Machines-and-the-War.md)).
- **Reverse engineering.** The GSM phone ciphers A5/1 and A5/2 were kept secret
  until 1999, when Marc Briceno, Ian Goldberg and David Wagner published them,
  recovered from a phone. A5/2 was broken within a month. In 2008 Karsten Nohl
  and Henryk Plötz recovered the Crypto-1 cipher of MIFARE Classic transit cards
  by photographing the chip's layers under a microscope and rebuilding its
  circuit gate by gate; the cipher fell within weeks.
- **Software.** Any algorithm that runs on a computer the attacker can buy is
  public in practice. The DVD's Content Scramble System was taken from a
  software player in 1999.
- **Standards and patents.** Most real systems use published algorithms. The
  attacker reads the standard, like everyone else.

!!! note "Life story: the MIFARE Classic reverse engineering"
    **Born:** December 2007 and 2008, Karsten Nohl and Henryk Plötz (with Starbug)
    in Germany, and a team at Radboud University Nijmegen in the Netherlands,
    against NXP's Crypto-1 cipher · **Purpose:** find out what protected hundreds
    of millions of contactless cards used for transit and building access ·
    **Helped:** showed that the 48-bit cipher had weak structure and a weak random
    number generator; cards could be cloned in seconds to minutes; NXP tried to stop
    the Nijmegen paper in a Dutch court in 2008 and lost · **Status:** a standard
    example of why secret designs fail; the cards' successors use AES

### What the principle gives the attacker

Assuming the method is known does three things for the attacker.

**It turns breaking into search.** If everything but the key is known, then the
plaintext is a function of the ciphertext and the key, and the attacker's
question is "which key?". Every attack in this book can be read as a cleverer
way of searching the key space than trying every key: cutting it into pieces
that can be searched one at a time (divide and conquer), ranking candidates by
how likely they are (statistical attacks), or writing the key as the solution of
equations (algebraic attacks).

**It makes attacks repeatable.** A break that depends on a known algorithm works
against every user of that algorithm. That is why one result about MD5 or RC4
mattered to millions of systems at once, and why cryptanalysts work on public
standards rather than on any one company's product.

**It shows where secrets really leak.** If the algorithm is known and still
strong, the attacker turns to the things Kerckhoffs did not cover: the key
itself (how it was generated, stored, reused), the implementation (timing,
power, error messages), and the people. Most breaks of deployed systems are of
this kind, and Part IV of this book is about them.

A secret design does not stop the attacker. It delays them by the time it takes
to get the design, and that is often short. Worse, a secret design has usually
been examined by few people, so once it is out it tends to fall quickly.
A5/2, CSS and Crypto-1 all lasted less than a year after publication.
Governments still classify some military algorithms, but they design them on
the assumption that they will be captured, and the attacker plans the same way.

### The attacker's own Kerckhoffs

The principle cuts the other way too. A cryptanalyst writing up an attack is
expected to state every assumption: what is known, what is measured, which
oracle is available, how many texts are needed and of what kind. An attack that
needs a secret or unrealistic assumption is judged by that assumption. "We
recover the key from a single ciphertext, given that the first 32 bytes of the
plaintext are known" is a strong result if the format puts a fixed header there,
and an empty one if it does not. Reading an attack starts with finding that
sentence.

## 1.3 Attack models

*Level: beginner.*

An **attack model** says what the attacker can see and what they can make the
system do. Book 1 introduced the four classic models with one historical case
each ([book 1, §1.6](../../book/01-What-Cryptography-Is-For.md)). Here they are
from the working attacker's side: what each one gives, where it comes from in
real systems, and what it does to the simplest cipher there is. Figure 1.2 draws
each model as a box the attacker can talk to.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Five attack models as boxes: ciphertext only, known plaintext, chosen plaintext, chosen ciphertext, related key, with arrows showing what the attacker sends and receives" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">Ciphertext only</text>
<rect x="260" y="10" width="120" height="30" rx="5" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="30" text-anchor="middle" font-size="13">E with key K</text>
<line x1="380" y1="25" x2="472" y2="25" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,25 471,29 471,21"/>
<text x="490" y="30" font-size="13">C₁, C₂, … (seen)</text>
<text x="20" y="98" font-weight="bold">Known plaintext</text>
<rect x="260" y="80" width="120" height="30" rx="5" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="100" text-anchor="middle" font-size="13">E with key K</text>
<line x1="380" y1="95" x2="472" y2="95" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,95 471,99 471,91"/>
<text x="490" y="100" font-size="13">(Pᵢ, Cᵢ) pairs, not chosen</text>
<text x="20" y="168" font-weight="bold">Chosen plaintext</text>
<line x1="180" y1="165" x2="252" y2="165" stroke="currentColor" stroke-width="1.5"/>
<polygon points="260,165 251,169 251,161"/>
<text x="250" y="156" font-size="13" text-anchor="end">P of my choice</text>
<rect x="260" y="150" width="120" height="30" rx="5" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="170" text-anchor="middle" font-size="13">E with key K</text>
<line x1="380" y1="165" x2="472" y2="165" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,165 471,169 471,161"/>
<text x="490" y="170" font-size="13">C = E(K, P)</text>
<text x="20" y="238" font-weight="bold">Chosen ciphertext</text>
<line x1="180" y1="235" x2="252" y2="235" stroke="currentColor" stroke-width="1.5"/>
<polygon points="260,235 251,239 251,231"/>
<text x="250" y="226" font-size="13" text-anchor="end">C of my choice</text>
<rect x="260" y="220" width="120" height="30" rx="5" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="240" text-anchor="middle" font-size="13">D with key K</text>
<line x1="380" y1="235" x2="472" y2="235" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,235 471,239 471,231"/>
<text x="490" y="240" font-size="13">P, or just "valid?"</text>
<text x="20" y="308" font-weight="bold">Related key</text>
<line x1="180" y1="305" x2="252" y2="305" stroke="currentColor" stroke-width="1.5"/>
<polygon points="260,305 251,309 251,301"/>
<text x="250" y="296" font-size="13" text-anchor="end">P and a change Δ</text>
<rect x="260" y="290" width="120" height="30" rx="5" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="310" text-anchor="middle" font-size="13">E with key K ⊕ Δ</text>
<line x1="380" y1="305" x2="472" y2="305" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,305 471,309 471,301"/>
<text x="490" y="310" font-size="13">C = E(K ⊕ Δ, P)</text>
<line x1="20" y1="345" x2="610" y2="345" stroke="currentColor" stroke-width="1" stroke-opacity="0.5"/>
<text x="320" y="370" text-anchor="middle" font-size="13" font-style="italic">the key K stays inside the box in every model; only what crosses the edges changes</text>
</svg>
<figcaption>Figure 1.2. The attack models as boxes the attacker can talk to. Going down, the attacker gains control: first over nothing, then over the inputs, then over the direction, and last over the key itself (but never its value).</figcaption>
</figure>

### The models on a shift cipher

The shift cipher of [book 1, §2.3](../../book/02-Classical-Ciphers.md) moves
every letter $k$ places along the alphabet, with letters numbered A = 0 to
Z = 25:

$$
c = (p + k) \bmod 26 .
$$

It has 26 keys, so it falls to anything. That is the point: the models differ in
how little work they leave.

**Ciphertext only.** The attacker has `HAAHJRHAKHDUMYVTAOLUVYAOZPKL` and nothing
else. They must try keys and judge which output looks like English. That needs a
model of English, a scoring rule and enough letters; §1.6 does it and measures
how many letters are enough.

**Known plaintext.** The attacker knows that the message starts with `ATTACK`.
One letter is enough: the first plaintext letter is A = 0, the first ciphertext
letter is H = 7, so

$$
k = (c - p) \bmod 26 = (7 - 0) \bmod 26 = 7 .
$$

No scoring, no search, no doubt. The second pair (T = 19, A = 0) checks it:
$(0 - 19) \bmod 26 = 7$.

**Chosen plaintext.** The attacker gets the system to encrypt `A`. Whatever
comes out is the key, read directly as a letter.

**Chosen ciphertext.** The attacker gets the system to decrypt `A`. Out comes
$(0 - k) \bmod 26$, and the key is 26 minus that.

**Related key.** The attacker cannot see $k$, but can ask for encryptions under
$k + \delta$ for a $\delta$ they choose. On the shift cipher this gives nothing
new, since the attacker can add $\delta$ to the output themselves. On ciphers
with a structured key schedule it can give a great deal (below).

On a cipher this weak the models all win. On a good cipher none of them wins,
and the interesting question is how much each one lowers the cost. Here the
shift cipher hides one more lesson: the stronger models did not just make the
attack cheaper, they made it **certain**. Ciphertext only gave a ranking of
candidates; one known letter gave the answer.

### Where each model comes from

Students often think the stronger models are unrealistic. They are the everyday
case, because real protocols are full of predictable text and of machines that
answer questions.

**Ciphertext only** is what a passive eavesdropper has: radio intercepts, a
captured disk, a recorded network session. It is the weakest model, but it is
never quite "only ciphertext". The attacker almost always knows the language,
the file format, the protocol, or the fact that the text is compressed, and an
attack that uses such knowledge is still counted as ciphertext only.

**Known plaintext** comes from structure. Bletchley Park's **cribs** were words
the codebreakers expected, such as the daily weather report's *WETTER* and the
sign-off *HEIL HITLER*. Today the cribs are protocol headers: every HTTP request
starts with `GET` or `POST`, every ZIP file starts with `PK`, every TLS record
has a known type. When a 2001 attack on WEP Wi-Fi needed the first plaintext byte
of each packet, it used the fact that almost every packet started with the same
link-layer header byte, 0xAA.

**Chosen plaintext** comes from any system that encrypts what an outsider
supplies. A web page that runs the attacker's script makes the victim's browser
send requests the attacker chose, under the victim's TLS keys; that is how the
BEAST (2011) and CRIME (2012) attacks worked ([Chapter 10](10-Attacks-on-Modes-and-MACs.md)).
In 1942 the US Navy made Midway radio a false water shortage so the Japanese
would encrypt it. In public-key encryption it is free: anyone can encrypt
anything under the public key.

**Chosen ciphertext** comes from any system that decrypts what an outsider sends
and reacts. The reaction need not be the plaintext. Daniel Bleichenbacher's 1998
attack on RSA in SSL used only whether the server reported a padding error, and
Serge Vaudenay's 2002 padding oracle on CBC mode used the same kind of yes/no
answer. A server, a smart card, a hardware security module and a mail client
that opens encrypted mail can all be decryption oracles.

The models also come in **adaptive** forms: the attacker sees each answer before
choosing the next question. Bleichenbacher's and Vaudenay's attacks are
adaptive; each query is built from the answers so far. Adaptive models are
stronger, and they are the usual case on a network.

**Related key** is the least obvious. The attacker cannot learn the key, but can
make the system use several keys that differ in a way the attacker knows. That
sounds artificial, and for a well-designed protocol it is. But it happens. WEP
built each packet's RC4 key by putting a 24-bit counter, sent in the clear, in
front of the secret key, so every packet used a related key with a known
difference; Scott Fluhrer, Itsik Mantin and Adi Shamir's 2001 attack used
exactly that ([Chapter 8](08-Attacks-on-Stream-Ciphers.md)). Hash functions built
from block ciphers feed message blocks into the key input, so a related-key
weakness in the cipher can become a collision in the hash. That is why the 2009
related-key attacks on AES-256 were taken seriously even though no sane protocol
gives an attacker AES-256 under four related keys
([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)).

!!! note "Life story: the related-key attack"
    **Born:** 1993, Eli Biham's "New types of cryptanalytic attacks using related
    keys"; Lars Knudsen had found related-key properties of LOKI in 1992 ·
    **Purpose:** attack a cipher through its key schedule, by watching it work
    under keys with a known relation · **Helped:** break WEP (2001), show the
    key-schedule weakness of AES-192 and AES-256 (Biryukov and Khovratovich,
    2009), and make designers of hash functions and tweakable ciphers check key
    schedules as hard as rounds · **Status:** current as a model; most protocols
    never derive related keys, so most results in it are academic (§1.5)

### Two models outside the table

Two more ways in do not fit the boxes of Figure 1.2.

**Side channels.** The attacker measures the device instead of asking it
questions: its running time, power draw, electromagnetic noise, cache behavior,
even sound. The model is "known or chosen plaintext, plus a measurement". Paul
Kocher's 1996 timing attack and his 1998 power analysis made this a field of its
own, and Chapter 17 is about it.

**Faults.** The attacker makes the device miscompute, with a voltage glitch, a
laser flash or a Rowhammer bit flip, and compares the wrong output with the
right one. A single faulty RSA signature computed with the Chinese remainder
theorem can reveal the factorization of the modulus (Boneh, DeMillo and Lipton,
1997; Chapter 13).

### Which model should a cipher survive?

All of them, at once, and with margin. A modern block cipher is expected to look
like a random permutation to an attacker with adaptive chosen-plaintext and
chosen-ciphertext access ([book 1, §6.11](../../book/06-Block-Ciphers.md)); a
modern encryption scheme is expected to meet IND-CCA2, which gives the attacker a
decryption oracle for everything except the challenge
([book 1, Chapter 17](../../book/17-Defining-Security.md)). The reason is not that
every attacker has every power. It is that nobody can predict which protocol will
hand an attacker which oracle, and a cipher that is safe only under the weaker
models makes every protocol designer responsible for not leaking. History says
they will leak.

For the attacker the ordering runs the other way. An attack in a weak model is
worth more than the same attack in a strong one. A ciphertext-only attack works
on anything you can record; a chosen-ciphertext attack works only where there is
an oracle. When you read an attack, the model is the first thing to check, and
the first thing to argue about.

## 1.4 The three costs

*Level: beginner.*

Every attack has a bill, and it is paid in three currencies.

- **Time:** how much computing the attack takes.
- **Data:** how many plaintexts, ciphertexts or oracle answers it needs, and of
  which kind (known, chosen, adaptive).
- **Memory:** how much it must store at once.

Two more items appear on the bill when they matter: the **success probability**
(an attack that works one time in a thousand is not the same as one that always
works), and **precomputation**, work done once before any target is seen and
reused against many targets. Rainbow tables for password hashes are pure
precomputation.

### Counting time

Time is counted in operations, not seconds, so that results do not go stale when
computers get faster. The unit is usually "one encryption with the cipher under
attack", or "one evaluation of the hash function". An attack on AES that costs
$2^{100}$ "AES encryptions" means the same thing in 2026 as in 2006; how many
years that is depends on the year.

The baseline is **exhaustive key search**. With a $k$-bit key chosen uniformly at
random, an attacker who tries keys in any order finds the right one after

$$
\frac{2^k + 1}{2} \approx 2^{k-1}
$$

trials on average, and $2^k$ at worst. A trial needs something to check against,
usually one known plaintext-ciphertext pair. One pair is not always enough to
single out the key: with a $b$-bit block and a $k$-bit key, a wrong key matches a
given pair by chance with probability about $2^{-b}$, so about $2^{k-b}$ wrong
keys survive the first pair. For DES ($k = 56$, $b = 64$) one pair almost always
pins the key. For AES-256 ($k = 256$, $b = 128$) about $2^{128}$ keys survive the
first pair, and a second pair is needed to remove them. In ciphertext-only search
the check is a score, as in §1.6, and it needs enough ciphertext for the right key
to stand out.

Exhaustive search is **generic**: it never looks inside the cipher, so it works on
every cipher with that key length. That makes it the yardstick. A cipher with a
$k$-bit key is meant to offer $k$-bit security, and a **break**, in the academic
sense, is any attack that does better than $2^k$ in its model.

### Code it: what brute force costs on your machine

How fast is one trial? The script below plays an attacker who knows a SHA-256
hash of a 16-byte key and searches for the key, counting up from zero. SHA-256
stands in for a cipher: one hash costs about as much as one encryption with a
software cipher. It measures this machine's rate, then turns key sizes into years
of average search time, for this machine and for two far bigger attackers.

```python
import hashlib
import math
import time

# One "key trial" here is one SHA-256 of a 16-byte candidate key: about the
# work of one cipher call, which is what an attacker repeats.
secret = 2_000_000
target = hashlib.sha256(secret.to_bytes(16, "big")).digest()

start = time.perf_counter()
key = 0
while hashlib.sha256(key.to_bytes(16, "big")).digest() != target:
    key += 1
seconds = time.perf_counter() - start
rate = (key + 1) / seconds
print(f"found key {key} after {key + 1:,} trials in {seconds:.2f} s")
print(f"this machine: {rate:,.0f} keys per second")

YEAR = 365.25 * 24 * 3600
print("bits   this machine    1e12 keys/s     1e18 keys/s   (years, on average)")
for bits in (32, 40, 56, 64, 80, 100, 128):
    average = 2 ** (bits - 1)              # the key turns up halfway, on average
    row = [average / r / YEAR for r in (rate, 1e12, 1e18)]
    print(f"{bits:4}  " + "  ".join(f"{y:14.3g}" for y in row))

for name, r in (("this machine", rate), ("1e12 keys/s", 1e12), ("1e18 keys/s", 1e18)):
    print(f"{name}: a full search of {math.log2(r * YEAR):.1f} bits takes a year")
```

On the machine this chapter was written on, one Python process printed:

```
found key 2000000 after 2,000,001 trials in 0.65 s
this machine: 3,061,969 keys per second
bits   this machine    1e12 keys/s     1e18 keys/s   (years, on average)
  32        2.22e-05         6.8e-11         6.8e-17
  40         0.00569        1.74e-08        1.74e-14
  56             373         0.00114        1.14e-09
  64        9.55e+04           0.292        2.92e-07
  80        6.26e+09        1.92e+04          0.0192
 100        6.56e+15        2.01e+10        2.01e+04
 128        1.76e+24        5.39e+18        5.39e+12
this machine: a full search of 46.5 bits takes a year
1e12 keys/s: a full search of 64.8 bits takes a year
1e18 keys/s: a full search of 84.7 bits takes a year
```

Your first two lines, your first column and the "this machine" line will
differ; the rest is pure arithmetic and will match. Read the table by rows.

- **32 bits** is nothing: about twelve minutes on average even in slow Python,
  on one core.
- **40 bits** was the key size the US allowed for exported software until 1999.
  Python on one core does it in two days; the middle column does it in half a
  second. In 1995 a French student, Damien Doligez, broke a 40-bit SSL
  session from Netscape's export version in eight days on about 120 machines.
- **56 bits** is DES. Almost four centuries of one-core Python; ten hours at
  $10^{12}$ keys a second, about ten times the speed of Deep Crack, whose 1,856
  chips tried about $9 \times 10^{10}$ keys a second in 1998.
- **80 bits** separates the columns. Hopeless for one machine, twenty thousand
  years for the middle column, a week for the last.
- **128 bits** is out of reach of all three. Even the last column needs more
  than five trillion years, about 400 times the age of the universe.

The last three lines turn the same numbers around: each attacker has a "bits per
year" figure, $\log_2(\text{rate} \times \text{seconds per year})$. Every doubling
of the rate adds one bit. A thousand times more hardware adds ten bits. The gap
between one laptop core and the largest computation on Earth (below) is about
50 bits, and 128-bit keys leave more than 30 bits of room above even that.

**How fast are the big attackers?** A single high-end graphics card computes on
the order of $10^{10}$ to $10^{11}$ fast hashes such as MD5 a second, and far
fewer of a slow password hash; a cluster of a thousand such cards runs ten to a
hundred times faster than the middle column. The rightmost column is the scale of the whole Bitcoin network,
which in 2025 computed close to $10^{21}$ SHA-256 hashes a second on special
chips built for nothing else. No secret agency is known to have a key-search
machine of that size, and none would need one for a 56-bit key.

### Counting data

Data is the attacker's hardest currency to raise, because it comes from the
victim. An attack that needs $2^{43}$ known plaintexts encrypted under one key
needs 64 terabytes of text that someone else encrypted with that key and that the
attacker can read in both forms. Some limits are absolute:

- An $n$-bit block cipher under one key has only $2^n$ plaintext-ciphertext pairs.
  The full set is the **codebook**, and an attack that needs all of it has learned
  the cipher by heart and needs no key. So every attack must use fewer than $2^n$
  texts, and attacks that need close to $2^n$ are called "full codebook" attacks,
  a sign of weakness in the attack rather than the cipher.
- Protocols change keys. TLS 1.3 limits how much data one AES-GCM key may protect
  (RFC 8446 sets limits in the order of $2^{24.5}$ full records), and an attack
  that needs more data under one key than the protocol ever allows is blocked in
  practice even if it is cheap in time.
- Chosen data is rarer than known data, and adaptive chosen data rarer still. An
  attack's model sets which kind of data it counts.

### Counting memory

Memory is the currency people forget. An attack that stores $2^{56}$ entries of 8
bytes needs 512 petabytes. Memory also has a time cost that a simple count misses:
looking something up in a huge table is far slower than a cipher call, and a large
memory must be built and powered. Michael Wiener argued in 2004 that the honest
measure is the **full cost**: the hardware an attack needs, times how long it is
used. By that measure an attack with $2^{60}$ time and $2^{60}$ memory can be
worse than one with $2^{70}$ time and almost no memory, because the second runs
on a million small chips in parallel and the first needs a single huge machine
whose parts wait for each other.

### The bill for DES

Here are the main published attacks on full 16-round DES, each against the 56-bit
baseline. They were the results that made public cryptanalysis a science, and they
show the three currencies pulling against each other.

| Attack | Year | Data | Time | Memory |
|---|---|---|---|---|
| Exhaustive search | | 1 to 2 known pairs | $2^{55}$ on average | almost none |
| Differential (Biham, Shamir) | 1992 | $2^{47}$ chosen plaintexts | $2^{37}$ | small |
| Linear (Matsui) | 1994 | $2^{43}$ known plaintexts | $2^{43}$ | small |
| Davies' attack (Biham, Biryukov) | 1997 | $2^{50}$ known plaintexts | $2^{50}$ | small |

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bars of log2 data and log2 time for four attacks on DES: exhaustive search, differential, linear and Davies" fill="currentColor" font-size="14">
<line x1="200" y1="250" x2="620" y2="250" stroke="currentColor" stroke-width="1.4"/>
<line x1="200" y1="20" x2="200" y2="250" stroke="currentColor" stroke-width="1.4"/>
<text x="200" y="270" font-size="12" text-anchor="middle">2⁰</text>
<line x1="275" y1="250" x2="275" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="275" y="270" font-size="12" text-anchor="middle">2¹⁰</text>
<line x1="350" y1="250" x2="350" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="350" y="270" font-size="12" text-anchor="middle">2²⁰</text>
<line x1="425" y1="250" x2="425" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="425" y="270" font-size="12" text-anchor="middle">2³⁰</text>
<line x1="500" y1="250" x2="500" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="500" y="270" font-size="12" text-anchor="middle">2⁴⁰</text>
<line x1="575" y1="250" x2="575" y2="255" stroke="currentColor" stroke-width="1.2"/>
<text x="575" y="270" font-size="12" text-anchor="middle">2⁵⁰</text>
<line x1="612.5" y1="20" x2="612.5" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<text x="612" y="16" font-size="12" text-anchor="end">2⁵⁵: brute force</text>
<text x="190" y="52" text-anchor="end">Exhaustive search</text>
<rect x="200" y="36" width="1" height="14" fill="currentColor" fill-opacity="0.35"/>
<text x="206" y="48" font-size="12">data: 1 pair</text>
<rect x="200" y="52" width="412.5" height="14" fill="currentColor" fill-opacity="0.8"/>
<text x="190" y="107" text-anchor="end">Differential, 1992</text>
<rect x="200" y="91" width="352.5" height="14" fill="currentColor" fill-opacity="0.35"/>
<rect x="200" y="107" width="277.5" height="14" fill="currentColor" fill-opacity="0.8"/>
<text x="190" y="162" text-anchor="end">Linear, 1994</text>
<rect x="200" y="146" width="322.5" height="14" fill="currentColor" fill-opacity="0.35"/>
<rect x="200" y="162" width="322.5" height="14" fill="currentColor" fill-opacity="0.8"/>
<text x="190" y="217" text-anchor="end">Davies, 1997</text>
<rect x="200" y="201" width="375" height="14" fill="currentColor" fill-opacity="0.35"/>
<rect x="200" y="217" width="375" height="14" fill="currentColor" fill-opacity="0.8"/>
<rect x="210" y="282" width="14" height="12" fill="currentColor" fill-opacity="0.35"/>
<text x="230" y="292" font-size="12">data (texts)</text>
<rect x="340" y="282" width="14" height="12" fill="currentColor" fill-opacity="0.8"/>
<text x="360" y="292" font-size="12">time (DES operations)</text>
</svg>
<figcaption>Figure 1.3. The bill for four attacks on DES, on a log scale. Every clever attack beats brute force on time, and every one pays for it in data that no real victim would ever supply under one key.</figcaption>
</figure>

Every row below the first is a break: each finds the key with less time than
$2^{55}$. Differential cryptanalysis needs only $2^{37}$ DES operations, a
quarter of a million times less. Yet nobody ever recovered a real DES key this
way, because the data column is impossible: $2^{47}$ chosen plaintexts is a
petabyte of text that the victim must encrypt on the attacker's request, under
one key. Matsui did run his attack, in 1994, on twelve workstations: it took
about 40 days to generate the $2^{43}$ known plaintexts and 10 days to find the
key. That made it the first experimental cryptanalysis of the full DES, and it
still needed a quantity of data that no real victim would supply. Brute force,
which needs one pair, is what killed DES in practice.

### Comparing attacks

Three rules of thumb cover most comparisons.

1. **Compare like with like.** An attack is measured against the best **generic**
   attack for the same goal in the same model: exhaustive search for key recovery,
   the birthday bound of about $2^{n/2}$ for collisions on an $n$-bit hash, the
   codebook for plaintext recovery. A collision attack on a 160-bit hash that costs
   $2^{69}$ is a break, because the generic attack costs $2^{80}$; the same
   $2^{69}$ for finding a preimage would be a stunning break, because the generic
   attack there costs $2^{160}$.
2. **Report all three costs.** "Time $2^{100}$" alone means little. An attack with
   $2^{100}$ time, $2^{120}$ data and a 64-bit block is not an attack, since there
   are only $2^{64}$ texts. Good papers give time, data, memory and success
   probability, and say what unit "time" is in.
3. **The headline is the maximum.** The cost of an attack is roughly the largest
   of its three costs, since you must pay all of them. An attack that needs
   $2^{40}$ time and $2^{90}$ memory costs about $2^{90}$.

The comparison is always against the best attack known **for that goal**. For
public-key systems the generic attack is not key search at all: nobody breaks RSA
by trying private keys, but by factoring the modulus, and the yardstick is the
best factoring algorithm (Chapter 11). That is why a 3072-bit
RSA key and a 128-bit AES key are rated alike at 128 bits of security
(SP 800-57).

## 1.5 Academic and practical breaks

*Level: intermediate.*

By the definition of §1.4, AES-128 is broken. In 2011 Andrey Bogdanov, Dmitry
Khovratovich and Christian Rechberger published an attack that recovers an
AES-128 key in about $2^{126.1}$ operations, using $2^{88}$ chosen plaintexts,
instead of the $2^{127}$ average of exhaustive search. It is faster than brute
force, so by the strict definition it is a break. It is also the reason AES is
still everywhere: after more than twenty years of the world's best attackers
working on it, the best they can do against the full cipher is shave less than
two bits off a number nobody will ever reach.

So there are two words in use, and both are used loosely.

- An **academic break** (also **certificational** or **theoretical** break) is an
  attack faster than the generic one, in some model, that nobody can or would run.
  It shows the cipher is not as strong as its designers claimed. It does not show
  that anyone's data is at risk today.
- A **practical break** is one that has been run, or could be run with resources
  someone has, against the cipher as it is really used.

The gap between them is measured in all three costs of §1.4 and in the model. An
attack can be academic because its time is huge ($2^{126}$), because its data is
impossible ($2^{88}$ chosen texts, or more than the protocol allows under one
key), because its memory is absurd, or because its model never occurs (four
related keys of AES-256).

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Two timelines: MD5 from 1993 to 2012 and SHA-1 from 1995 to 2020, each going from a first theoretical weakness to practical forged certificates" fill="currentColor" font-size="14">
<line x1="60" y1="210" x2="620" y2="210" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="230" font-size="12" text-anchor="middle">1990</text>
<line x1="60" y1="210" x2="60" y2="215" stroke="currentColor"/>
<text x="246.7" y="230" font-size="12" text-anchor="middle">2000</text>
<line x1="246.7" y1="210" x2="246.7" y2="215" stroke="currentColor"/>
<text x="433.3" y="230" font-size="12" text-anchor="middle">2010</text>
<line x1="433.3" y1="210" x2="433.3" y2="215" stroke="currentColor"/>
<text x="620" y="230" font-size="12" text-anchor="middle">2020</text>
<line x1="620" y1="210" x2="620" y2="215" stroke="currentColor"/>
<text x="20" y="40" font-weight="bold">MD5</text>
<line x1="116" y1="60" x2="470.7" y2="60" stroke="currentColor" stroke-width="3" stroke-opacity="0.35"/>
<circle cx="116" cy="60" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="116" y="84" font-size="12" text-anchor="middle">1993</text>
<circle cx="172" cy="60" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="172" y="84" font-size="12" text-anchor="middle">1996</text>
<circle cx="321" cy="60" r="5"/>
<text x="321" y="84" font-size="12" text-anchor="middle">2004</text>
<circle cx="396" cy="60" r="5"/>
<text x="396" y="84" font-size="12" text-anchor="middle">2008</text>
<circle cx="470.7" cy="60" r="5"/>
<text x="470.7" y="84" font-size="12" text-anchor="middle">2012</text>
<text x="20" y="130" font-weight="bold">SHA-1</text>
<line x1="340" y1="150" x2="620" y2="150" stroke="currentColor" stroke-width="3" stroke-opacity="0.35"/>
<circle cx="340" cy="150" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="174" font-size="12" text-anchor="middle">2005</text>
<circle cx="526.7" cy="150" r="5"/>
<text x="526.7" y="174" font-size="12" text-anchor="middle">2015</text>
<circle cx="564" cy="150" r="5"/>
<text x="564" y="174" font-size="12" text-anchor="middle">2017</text>
<circle cx="615" cy="150" r="5"/>
<text x="615" y="174" font-size="12" text-anchor="end">2020</text>
<circle cx="300" cy="250" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="310" y="254" font-size="12">academic</text>
<circle cx="400" cy="250" r="5"/>
<text x="410" y="254" font-size="12">practical</text>
</svg>
<figcaption>Figure 1.4. From academic to practical. MD5: compression-function weaknesses (1993, 1996), real collisions (2004), a rogue certificate authority (2008), the Flame malware's forged certificate (2012). SHA-1: a 2⁶⁹ attack on paper (2005), a freestart collision (2015), the first collision (2017), chosen-prefix collisions (2020).</figcaption>
</figure>

### Why academic breaks matter

If academic breaks change nothing, why does anyone publish them, and why do
standards bodies act on them? Three reasons.

**Attacks only get better.** The phrase is an old saying inside the NSA that
Bruce Schneier made public, and the history of hash functions is its proof
(Figure 1.4). In 1993 Bert den Boer and Antoon Bosselaers found a weakness in
MD5's compression function; in 1996 Hans Dobbertin found collisions in that
function, and cryptographers advised moving away from MD5. Most systems did not.
In August 2004 Xiaoyun Wang and her colleagues showed real MD5 collisions, found
in about an hour on a cluster. In December 2008 a team led by Alexander Sotirov
and Marc Stevens used a cluster of 200 PlayStation 3 consoles to make a rogue
certificate authority certificate that browsers trusted. In 2012 the Flame
malware, believed to have been built by a state, spread through Windows Update
using a certificate forged by an MD5 collision. From the first academic warning
to a weapon took nineteen years, and every step was predictable from the one
before.

SHA-1 went the same way, faster at the end. In February 2005 Wang, Yiqun Lisa
Yin and Hongbo Yu announced a collision attack costing about $2^{69}$, below the
$2^{80}$ birthday bound: an academic break. NIST told agencies to move off SHA-1
for signatures. The first actual collision came in February 2017 (SHAttered,
below), and in 2020 Gaëtan Leurent and Thomas Peyrin made chosen-prefix collisions
practical, the kind that forges certificates, for about \$45,000 of rented
graphics cards.

**The margin is the real product.** A cipher's strength is not one number but a
margin: how far the best attack is from the full cipher. Designers measure it in
rounds. AES-128 has 10 rounds, and the best attacks that do clearly better than
brute force reach about 7 of them. An attack that adds one round to that count is
academic, but it eats a tenth of the margin. A cipher whose margin keeps
shrinking is retired before the margin is gone, not after.

**It tells you where to look.** The biclique attack on AES is slow, but it
showed that AES's key schedule mixes slowly; the related-key attacks on AES-256
showed the same from another side. Neither threatens anyone, and both are the
reason later designs pay more attention to key schedules.

!!! note "Life story: the biclique attack on AES"
    **Born:** 2011, Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger
    (ASIACRYPT 2011) · **Purpose:** the first key-recovery attack on the full
    AES faster than exhaustive search, built from meet-in-the-middle and a
    structure called a biclique · **Helped:** measure AES's margin: about
    $2^{126.1}$ for AES-128, $2^{189.7}$ for AES-192 and $2^{254.4}$ for
    AES-256, with up to $2^{88}$ chosen texts; it changed no recommendation ·
    **Status:** the best known key recovery on full AES, refined since by
    fractions of a bit; the textbook example of an academic break

### Why practical breaks are rarer than headlines

The opposite mistake is common too. A headline that says "researchers break
encryption X" can mean any rung of the ladder in §1.1, in any model, at any cost.
Read the paper's abstract for four things:

1. **What is won:** key, plaintext, forgery, a bit, a distinguisher?
2. **Against what:** the full cipher, or a version with fewer rounds? Many
   papers attack "7-round AES" or "SHA-1 reduced to 58 steps". These are
   progress, and they say so in the title, but they break nothing in use.
3. **In which model:** known plaintext, adaptive chosen ciphertext, related keys,
   a side channel on one chip?
4. **At what cost:** time, data, memory, probability, and whether it was run.

A practical break of a deployed system needs all four to land well at once. Most
results land well on one or two.

### When an academic break forces action

Standards act on academic breaks when the margin is gone or nearly gone, not
when the system is about to fall. NIST deprecated SHA-1 for digital signatures
years before SHAttered, and announced in 2022 that SHA-1 would be withdrawn from
all its standards by the end of 2030. It retired DES after Deep Crack, but had
already standardized triple DES in 1999. For the attacker this means the
interesting targets are usually systems that did not follow the advice: the
devices, certificates and protocols still using MD5, SHA-1, RC4, 64-bit blocks or
1024-bit RSA long after the academic warning. Much of Part IV of this book is
about them.

!!! note "Life story: SHAttered"
    **Born:** 23 February 2017, Marc Stevens, Pierre Karpman (CWI Amsterdam) and
    Elie Bursztein, Ange Albertini, Yarik Markov (Google) · **Purpose:** turn
    the 2005 academic attack on SHA-1 into a real collision, to end the
    argument about whether it mattered · **Helped:** produced two different PDF
    files with the same SHA-1 hash, at a cost of about $2^{63.1}$ SHA-1
    computations (roughly 6,500 CPU-years and 110 GPU-years); browsers and
    certificate authorities had already been told to stop using SHA-1, and Git
    began its move to SHA-256 · **Status:** the classic example of an academic
    break becoming practical; chosen-prefix collisions followed in 2020

## 1.6 Code it: a ciphertext-only attack

*Level: beginner.*

The shift cipher has 26 keys, so the time cost of breaking it is nothing. What
makes the ciphertext-only attack interesting is the other two parts of the job:
deciding which of the 26 candidate plaintexts is the right one, and knowing how
much ciphertext it takes to decide. Those two questions, **how to score** and
**how much data**, come back in every statistical attack in this book, from
Vigenère to linear cryptanalysis of DES.

### Scoring a candidate

Book 1 scored candidates with the chi-squared distance between the letter counts
and English ([book 1, §2.3](../../book/02-Classical-Ciphers.md)). An attacker can
also ask a slightly different question: if this candidate were English, how
likely would English be to produce it? Treat English as a machine that writes
each letter independently with its usual frequency $p_x$ (E about 12.7%, T about
9.1%, and so on down to Z about 0.07%). The chance that it writes the text
$x_1 x_2 \dots x_n$ is $p_{x_1} p_{x_2} \cdots p_{x_n}$. Those products get tiny
fast, so take logarithms and add:

$$
S(x_1 \dots x_n) = \sum_{i=1}^{n} \ln p_{x_i} .
$$

The score is negative, and the closer to zero, the more English the text looks.
This is the **log-likelihood**, and choosing the candidate with the highest
log-likelihood is the **maximum likelihood** rule. When every key is equally
likely beforehand, it is also the rule that picks the most probable key given the
ciphertext, which is the best any attacker can do with this model of English.

### By hand

Take the four-letter ciphertext `WKHP`. Here are four of the 26 candidates, with
the natural logarithm of each letter's frequency:

| Key | Candidate | Letter scores | Total $S$ |
|---|---|---|---|
| 22 | AOLT | $-2.50 - 2.59 - 3.22 - 2.40$ | $-10.71$ |
| 3 | THEM | $-2.40 - 2.80 - 2.06 - 3.73$ | $-10.99$ |
| 7 | PDAI | $-3.96 - 3.15 - 2.50 - 2.66$ | $-12.27$ |
| 19 | DROW | $-3.15 - 2.81 - 2.59 - 3.73$ | $-12.28$ |

To check one entry: T has frequency 9.1%, and $\ln 0.091 = -2.40$; H, 6.1%,
gives $\ln 0.061 = -2.80$; E, 12.7%, gives $-2.06$; M, 2.4%, gives $-3.73$. They
add to $-10.99$.

The true plaintext is THEM, under key 3, and the scorer ranks it **second**.
AOLT is made of common letters too, and four letters are not enough for the
counts to tell English from noise that happens to use common letters. A human
glancing at the list would pick THEM at once, because a human scores words, not
letters. That is the lesson of the example: a statistical attack is only as good
as its model of the plaintext and the amount of data it is fed. Better models
(letter pairs, words) need less data; more data rescues a weak model.

### The code

The script below encrypts a sentence, breaks it with the log-likelihood score,
and then measures the data cost: how often the attack finds the key from $n$
letters of English, for $n$ from 1 to 30, over 2,000 random trials each.

```python
import math
import random

# English letter frequencies in percent, A to Z (from large text counts)
FREQ = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
        6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074]
LOGP = [math.log(f / 100) for f in FREQ]
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def shift(text, k):
    return "".join(A[(A.index(c) + k) % 26] for c in text)

def score(text):                     # log of the chance English would produce text
    return sum(LOGP[A.index(c)] for c in text)

def attack(cipher):                  # try all 26 keys, keep the most English-looking
    return max(range(26), key=lambda k: score(shift(cipher, -k)))

c = shift("ATTACKATDAWNFROMTHENORTHSIDE", 7)
print(c)
ranked = sorted(range(26), key=lambda k: -score(shift(c, -k)))
for k in ranked[:4]:
    print(k, shift(c, -k), round(score(shift(c, -k)), 1))

# How much ciphertext does the attack need? Take random pieces of an English
# text, encrypt each under a random key, and count how often the attack wins.
TEXT = ("It was the best of times it was the worst of times it was the age of "
        "wisdom it was the age of foolishness it was the epoch of belief it was "
        "the epoch of incredulity it was the season of light it was the season "
        "of darkness it was the spring of hope it was the winter of despair we "
        "had everything before us we had nothing before us we were all going "
        "direct to heaven we were all going direct the other way")
TEXT = "".join(ch for ch in TEXT.upper() if ch in A)
random.seed(1)
for n in (1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30):
    wins = 0
    for _ in range(2000):
        i = random.randrange(len(TEXT) - n)
        k = random.randrange(26)
        wins += attack(shift(TEXT[i:i + n], k)) == k
    print(f"{n:3} letters: key found {wins / 20:5.1f}% of the time")
```

It prints:

```
HAAHJRHAKHDUMYVTAOLUVYAOZPKL
7 ATTACKATDAWNFROMTHENORTHSIDE -79.4
19 OHHOQYOHROKBTFCAHVSBCFHVGWRS -96.2
18 PIIPRZPISPLCUGDBIWTCDGIWHXST -98.5
6 BUUBDLBUEBXOGSPNUIFOPSUITJEF -98.8
  1 letters: key found  16.4% of the time
  2 letters: key found  19.9% of the time
  3 letters: key found  26.9% of the time
  4 letters: key found  39.4% of the time
  5 letters: key found  45.6% of the time
  6 letters: key found  56.2% of the time
  8 letters: key found  79.2% of the time
 10 letters: key found  92.8% of the time
 15 letters: key found  99.6% of the time
 20 letters: key found 100.0% of the time
 30 letters: key found 100.0% of the time
```

With 28 letters the right key wins clearly. Its score, $-79.4$, beats the
runner-up by 16.8; since the scores are natural logarithms, the model rates the
right plaintext about $e^{16.8} \approx 2 \times 10^7$ times more likely than the
next. The bottom half of the output is the data cost (Figure 1.5).

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Bar chart: success rate of the letter-frequency attack on a shift cipher rises from 16 percent with one letter to 93 percent with 10 letters and 100 percent with 20" fill="currentColor" font-size="14">
<line x1="60" y1="230" x2="620" y2="230" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="230" x2="60" y2="20" stroke="currentColor" stroke-width="1.4"/>
<text x="52" y="234" font-size="12" text-anchor="end">0%</text>
<text x="52" y="134" font-size="12" text-anchor="end">50%</text>
<line x1="60" y1="130" x2="620" y2="130" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.5"/>
<text x="52" y="34" font-size="12" text-anchor="end">100%</text>
<line x1="60" y1="30" x2="620" y2="30" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.5"/>
<line x1="60" y1="222.3" x2="620" y2="222.3" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<text x="616" y="217" font-size="11" text-anchor="end">blind guess: 3.8%</text>
<rect x="72" y="197.2" width="36" height="32.8" fill="currentColor" fill-opacity="0.45"/>
<text x="90" y="192" font-size="12" text-anchor="middle">16</text>
<text x="90" y="248" font-size="12" text-anchor="middle">1</text>
<rect x="122" y="190.2" width="36" height="39.8" fill="currentColor" fill-opacity="0.45"/>
<text x="140" y="185" font-size="12" text-anchor="middle">20</text>
<text x="140" y="248" font-size="12" text-anchor="middle">2</text>
<rect x="172" y="176.2" width="36" height="53.8" fill="currentColor" fill-opacity="0.45"/>
<text x="190" y="171" font-size="12" text-anchor="middle">27</text>
<text x="190" y="248" font-size="12" text-anchor="middle">3</text>
<rect x="222" y="151.2" width="36" height="78.8" fill="currentColor" fill-opacity="0.45"/>
<text x="240" y="146" font-size="12" text-anchor="middle">39</text>
<text x="240" y="248" font-size="12" text-anchor="middle">4</text>
<rect x="272" y="138.8" width="36" height="91.2" fill="currentColor" fill-opacity="0.45"/>
<text x="290" y="134" font-size="12" text-anchor="middle">46</text>
<text x="290" y="248" font-size="12" text-anchor="middle">5</text>
<rect x="322" y="117.6" width="36" height="112.4" fill="currentColor" fill-opacity="0.45"/>
<text x="340" y="112" font-size="12" text-anchor="middle">56</text>
<text x="340" y="248" font-size="12" text-anchor="middle">6</text>
<rect x="372" y="71.6" width="36" height="158.4" fill="currentColor" fill-opacity="0.45"/>
<text x="390" y="66" font-size="12" text-anchor="middle">79</text>
<text x="390" y="248" font-size="12" text-anchor="middle">8</text>
<rect x="422" y="44.4" width="36" height="185.6" fill="currentColor" fill-opacity="0.75"/>
<text x="440" y="40" font-size="12" text-anchor="middle">93</text>
<text x="440" y="248" font-size="12" text-anchor="middle">10</text>
<rect x="472" y="30.8" width="36" height="199.2" fill="currentColor" fill-opacity="0.75"/>
<text x="490" y="25" font-size="12" text-anchor="middle">99.6</text>
<text x="490" y="248" font-size="12" text-anchor="middle">15</text>
<rect x="522" y="30" width="36" height="200" fill="currentColor" fill-opacity="0.75"/>
<text x="540" y="25" font-size="12" text-anchor="middle">100</text>
<text x="540" y="248" font-size="12" text-anchor="middle">20</text>
<rect x="572" y="30" width="36" height="200" fill="currentColor" fill-opacity="0.75"/>
<text x="590" y="25" font-size="12" text-anchor="middle">100</text>
<text x="590" y="248" font-size="12" text-anchor="middle">30</text>
<text x="340" y="276" font-size="13" text-anchor="middle">letters of ciphertext</text>
</svg>
<figcaption>Figure 1.5. The data cost of a ciphertext-only attack on the shift cipher, from the code above: the share of 2,000 trials in which letter frequencies alone found the key. Ten letters are enough nine times in ten; twenty are enough every time.</figcaption>
</figure>

### Reading the result

Three things show in the numbers.

**Even one letter helps.** With a single ciphertext letter the attack is right
16.4% of the time, against 3.8% (1 in 26) for a blind guess. It simply guesses
that the letter was E, and in this text that is often true. Partial information
leaks from the first letter of ciphertext; this is a distinguisher, the bottom
rung of §1.1.

**The curve has a knee.** Success climbs slowly up to about six letters, then
fast, and is near certain by fifteen. That shape, a probability that rises from
almost nothing to almost one over a short range of data, is typical of
statistical attacks. Differential and linear cryptanalysis have the same curve,
with "letters" replaced by millions or billions of plaintext pairs, and attack
papers give the data needed for a stated success rate, such as "$2^{43}$ texts
for 85%".

**The model sets the price.** Shannon's **unicity distance**
([book 1, §2.12](../../book/02-Classical-Ciphers.md)) says how much ciphertext an
ideal attacker needs before only one key gives sensible plaintext: the key's
entropy divided by the redundancy of the language per letter. English carries
about 3.2 bits of redundancy per letter, and the shift cipher's key has
$\log_2 26 \approx 4.7$ bits, so the unicity distance is about $4.7/3.2 \approx 1.5$
letters. Our scorer needs far more, because it uses only single-letter
frequencies. Measured with only those, English has about 4.18 bits of entropy per
letter instead of $\log_2 26 = 4.70$, so the redundancy the scorer can see is only
about 0.52 bits per letter, and its own unicity distance is about
$4.7 / 0.52 \approx 9$ letters. That is just where the measured curve passes 85%.
A scorer that knew letter pairs or words would move the curve left, toward
Shannon's limit, which is why the hill-climbing solvers of
[Chapter 2](02-Breaking-Classical-Ciphers.md) score with groups of four letters.

The concern with how much text an attack needs is old. Al-Kindi's ninth-century
treatise already warned that a short text may not follow the usual letter counts,
and the thirteenth-century Arab cryptologist Ibn ʿAdlān wrote down rules for how
long a ciphertext must be before counting can be trusted. The data cost has been
part of cryptanalysis from the start.

## 1.7 Breaking before computers

*Level: beginner.*

Cryptanalysis has a history as long as cryptography's, but it is a different
story, told by different people. Codebreakers were usually secret, often
anonymous, and only rarely published. What follows is the short version, from
the first known description of a method to the end of the Second World War.
Book 1's [history of secret writing](../../history/index.md) tells the long one,
and [Chapter 2](02-Breaking-Classical-Ciphers.md) and
[Chapter 3](03-Machines-and-the-War.md) of this book redo the attacks.

### Baghdad, ninth century

The oldest surviving description of a method for breaking ciphers was written in
Baghdad in the ninth century by Abu Yusuf Yaʿqub ibn Ishaq al-Kindi, a
philosopher, mathematician and physician of the Abbasid court, who died around
873. His *Risāla fī istikhrāj al-muʿammā* (A treatise on extracting obscured
messages) explains that each language uses its letters in characteristic
proportions, and that to read a substitution cipher one should count the symbols
in the ciphertext, count the letters in a long sample of ordinary text in the
same language, and match the commonest to the commonest. He also discussed which
letters go together and which never do. The manuscript was found in the
Süleymaniye library in Istanbul and published in the late 1980s.

The method came out of scholarship, not espionage. Arabic grammarians and
scholars of the Qur'an counted letters and studied word structure, and the
administration of a large empire used ciphers. Later writers in the same
tradition, among them Ibn ʿAdlān in the thirteenth century and Ibn ad-Durayhim in
the fourteenth, extended al-Kindi's rules; al-Qalqashandi's encyclopedia of 1412
preserved many of them. Frequency analysis did not reach Europe in print until
centuries later.

!!! note "Life story: al-Kindi's frequency analysis"
    **Born:** ninth century, Baghdad, in al-Kindi's treatise on deciphering ·
    **Purpose:** read substitution ciphers from the ciphertext alone, by
    matching symbol counts with letter counts of the language · **Helped:** Arab
    cryptologists for centuries, then (rediscovered independently or not, the
    record is unclear) European cipher secretaries from the Renaissance on;
    it broke every simple substitution ever used · **Status:** still the
    first step against any classical cipher, and the ancestor of every
    statistical attack in this book

### Cipher secretaries and black chambers

From the fifteenth century the city states of Italy and then the courts of Europe
kept professional cipher secretaries who read intercepted diplomatic mail.
Venice named Giovanni Soro its official cipher secretary in 1506; he was said to
read ciphers in Latin, Italian, French and Spanish, and the Pope sent him
ciphers to test. Thomas Phelippes, in §1.1, was one of this profession. In France
Antoine Rossignol and his son served Louis XIII and Louis XIV in the seventeenth
century; their own "Great Cipher", a nomenclator of hundreds of numbers for
syllables, resisted readers until Étienne Bazeries broke it in the 1890s.
Through the eighteenth century the larger states ran **black chambers**
(*cabinets noirs*): offices that opened foreign mail, copied it, resealed it and
sent it on, often within hours. Vienna's was famous for its speed.

The defenders' answer was the nomenclator and, slowly, the polyalphabetic cipher.
Leon Battista Alberti described a cipher disk with a changing alphabet around
1467, and Giovan Battista Bellaso published the keyword form in 1553 that came to
be called the Vigenère cipher. For three centuries it had a reputation as *le
chiffre indéchiffrable*, the indecipherable cipher.

### Babbage and Kasiski

The reputation fell in the middle of the nineteenth century, twice. Charles
Babbage, the English mathematician who designed the first programmable computing
engines, solved a Vigenère-type cipher around 1854 after a public challenge, but
did not publish his method. In 1863 Friedrich Kasiski, a retired Prussian
infantry major, published *Die Geheimschriften und die Dechiffrir-Kunst*
(Secret writing and the art of deciphering), which explained it to everyone:
repeated groups of letters in the ciphertext usually come from the same plaintext
falling under the same part of the key, so the distances between repeats are
multiples of the key length. Once the key length is known, the cipher splits
into simple shift ciphers, and each falls to the scorer of §1.6.

!!! note "Life story: the Kasiski examination"
    **Born:** 1863, Friedrich Kasiski's book in Berlin (Babbage had the idea
    around 1854 and kept it to himself) · **Purpose:** find the key length of
    a periodic polyalphabetic cipher from repeats in the ciphertext ·
    **Helped:** end the Vigenère cipher's three centuries of reputation;
    with Friedman's index of coincidence (1920s) it made periodic ciphers
    routine to break · **Status:** a textbook method; the idea of finding a
    period first and then attacking each part alone runs through machine
    cryptanalysis ([Chapter 2](02-Breaking-Classical-Ciphers.md))

### The telegraph and the First World War

Radio made interception free. Anyone with a receiver could copy an army's
messages, so the codebreaker no longer needed a turned courier: the enemy
delivered the ciphertext. Every major power set up a codebreaking office, and the
British Admiralty's, known by its room number in the Old Building as **Room 40**,
became the most famous. It began in late 1914 with schoolmasters and linguists,
the captured *Magdeburg* signal book (§1.2) and two other captured German
codebooks.

Its best-known success came in January 1917. The German foreign minister, Arthur
Zimmermann, sent his ambassador in Mexico an enciphered telegram proposing that
if the United States entered the war, Mexico should join Germany and be offered
Texas, New Mexico and Arizona. Room 40's Nigel de Grey and the Reverend William
Montgomery read enough of it within a day or two. The hard part was not the
mathematics but the politics: Britain could not reveal that it read American
cable traffic, through which the telegram had partly travelled. A copy was
obtained in Mexico, the Americans were shown it, and it was published in March
1917. The United States declared war on Germany on 6 April.

!!! note "Life story: the Zimmermann telegram"
    **Born:** 16 January 1917, Berlin; read by Room 40 (Nigel de Grey and William
    Montgomery) in the following days · **Purpose:** Germany's offer of an
    alliance to Mexico, and Britain's chance to bring the United States into
    the war · **Helped:** published in the United States on 1 March 1917, it
    turned American opinion; war was declared on 6 April · **Status:** closed
    history; the classic lesson that a codebreaker must hide how a message
    was read, and that the cover story can be as hard as the break

### Machines

After the war, ciphers were mechanized. Rotor machines, with wired wheels that
stepped after every letter, gave each letter its own alphabet over a period of
thousands of letters. The German armed forces adopted a commercial rotor machine,
Enigma, in the late 1920s. In Poland the Cipher Bureau hired mathematicians, not
only linguists, and in December 1932 Marian Rejewski worked out the wiring of the
military Enigma's rotors with permutation theory, helped by the documents bought
from Hans-Thilo Schmidt. With Jerzy Różycki and Henryk Zygalski he read Enigma
traffic for most of the 1930s, building machines (the "bomby") and perforated
sheets to find daily keys. In July 1939, weeks before the German invasion, the
Poles gave their methods and replica machines to the British and French at Pyry,
near Warsaw.

At Bletchley Park in England, Alan Turing and Gordon Welchman designed a new,
more general machine, the British **Bombe**, which searched for Enigma settings
consistent with a crib; the first was working in 1940, and more than two hundred
were built. In 1942 William Tutte, a young chemist turned mathematician, worked
out the structure of the German army's Lorenz teleprinter cipher from a single
long message that an operator had sent twice with the same key, without ever
seeing the machine; Tommy Flowers's Colossus, the first large programmable
electronic computer, ran from early 1944 to break it. In the United States,
William Friedman's Signal Intelligence Service, with Frank Rowlett and Genevieve
Grotjan, broke Japan's Purple diplomatic machine in 1940, and the Navy's
codebreakers read enough of the JN-25 naval code to anticipate the attack on
Midway in June 1942.

How much this changed the war is disputed. The official historian of British
intelligence, Harry Hinsley, judged that Bletchley's work shortened the war in
Europe by about two years; others think the figure too precise to defend. What
is not disputed is what the codebreakers exploited: the machines were sound in
design but used carelessly. Repeated message keys, predictable openings, a key
sent twice, a reflector that never let a letter encrypt to itself: structure
leaked, and operators leaked more. [Chapter 3](03-Machines-and-the-War.md) does
these breaks in detail.

!!! note "Life story: the breaking of Enigma"
    **Born:** December 1932, Marian Rejewski at the Polish Cipher Bureau, then
    with Jerzy Różycki and Henryk Zygalski; handed to Britain and France at Pyry
    in July 1939; continued at Bletchley Park by Alan Turing, Gordon Welchman
    and thousands of others · **Purpose:** read German military traffic
    enciphered on Enigma · **Helped:** the Battle of the Atlantic, North
    Africa, the Normandy landings; the intelligence was code-named Ultra ·
    **Status:** kept secret until 1974; the first great break by mathematicians
    rather than linguists, and the start of machine-assisted cryptanalysis

## 1.8 Breaking in the open

*Level: beginner.*

After 1945 cryptanalysis went silent. The wartime codebreaking offices became
the US National Security Agency (founded in 1952) and Britain's GCHQ, and
everything they learned stayed classified. The Enigma story itself was secret
until 1974. Outside government almost nothing was published: Shannon's 1949
paper on secrecy systems, David Kahn's history *The Codebreakers* (1967), and
little else. For thirty years a student who wanted to learn how ciphers are
broken had nowhere to go.

Figure 1.6 shows what changed. In the 1970s cryptography itself became public:
DES in 1977, public-key cryptography in 1976 and 1977. A public cipher can be
attacked by anyone, and from then on the important breaks were made in
universities and companies and published under the authors' names.

<figure class="mars-fig">
<svg viewBox="0 0 640 430" width="640" role="img" aria-label="Timeline of cryptanalysis from al-Kindi in the ninth century to the breaks of Rainbow and SIKE in 2022" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="420" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">800s</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">al-Kindi describes frequency analysis</text>
<text x="78" y="55" text-anchor="end" font-weight="bold">1586</text>
<circle cx="92" cy="50" r="3.5"/>
<text x="108" y="55">Phelippes reads Mary, Queen of Scots</text>
<text x="78" y="83" text-anchor="end" font-weight="bold">1863</text>
<circle cx="92" cy="78" r="3.5"/>
<text x="108" y="83">Kasiski publishes the attack on Vigenère</text>
<text x="78" y="111" text-anchor="end" font-weight="bold">1917</text>
<circle cx="92" cy="106" r="3.5"/>
<text x="108" y="111">Room 40 reads the Zimmermann telegram</text>
<text x="78" y="139" text-anchor="end" font-weight="bold">1932</text>
<circle cx="92" cy="134" r="3.5"/>
<text x="108" y="139">Rejewski solves the Enigma wiring</text>
<text x="78" y="167" text-anchor="end" font-weight="bold">1940–44</text>
<circle cx="92" cy="162" r="3.5"/>
<text x="108" y="167">Bombe, Purple, Tutte and Colossus</text>
<line x1="20" y1="185" x2="620" y2="185" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.6"/>
<text x="620" y="200" text-anchor="end" font-size="12" font-style="italic">above: secret work; below: public papers</text>
<text x="78" y="227" text-anchor="end" font-weight="bold">1982</text>
<circle cx="92" cy="222" r="3.5"/>
<text x="108" y="227">Shamir breaks the Merkle-Hellman knapsack</text>
<text x="78" y="255" text-anchor="end" font-weight="bold">1990</text>
<circle cx="92" cy="250" r="4.5"/>
<text x="108" y="255" font-weight="bold">Biham and Shamir: differential cryptanalysis</text>
<text x="78" y="283" text-anchor="end" font-weight="bold">1993</text>
<circle cx="92" cy="278" r="3.5"/>
<text x="108" y="283">Matsui: linear cryptanalysis</text>
<text x="78" y="311" text-anchor="end" font-weight="bold">1994</text>
<circle cx="92" cy="306" r="3.5"/>
<text x="108" y="311">RSA-129 factored by 600 volunteers</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2004–05</text>
<circle cx="92" cy="334" r="4.5"/>
<text x="108" y="339" font-weight="bold">Wang's collisions in MD5 and SHA-1</text>
<text x="78" y="367" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="362" r="3.5"/>
<text x="108" y="367">SHAttered: the first SHA-1 collision</text>
<text x="78" y="395" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="390" r="4.5"/>
<text x="108" y="395" font-weight="bold">Rainbow and SIKE broken on laptops</text>
</svg>
<figcaption>Figure 1.6. Twelve centuries of breaking, much compressed. Above the dashed line the work was secret, and most of it was published only decades later; below it, breaks are papers with the authors' names on them.</figcaption>
</figure>

### The first public breaks

Public-key cryptography gave the new field its first targets. In 1977 Martin
Gardner's column in *Scientific American* described RSA and printed a challenge
from its inventors: a message encrypted under a 129-digit modulus, which Ron
Rivest estimated would take 40 quadrillion years to factor. It took seventeen.
In April 1994 Derek Atkins, Michael Graff, Arjen Lenstra and Paul Leyland,
coordinating about 600 volunteers' computers over the internet with the
quadratic sieve, factored RSA-129 and read the message: "The magic words are
squeamish ossifrage." Rivest's estimate had been honest; what changed was the
algorithms, not just the hardware (Chapter 11).

Another public-key system fell much faster. Ralph Merkle and Martin Hellman's
knapsack cryptosystem of 1978 hid an easy subset-sum problem inside a hard-looking
one. In 1982 Adi Shamir showed how to undo the disguise in polynomial time, and
over the next decade almost every knapsack variant was broken the same way, with
lattice methods (Chapter 15).

!!! note "Life story: RSA-129"
    **Born:** August 1977, the RSA challenge in Martin Gardner's "Mathematical
    Games" column; a \$100 prize · **Purpose:** show how hard factoring a
    129-digit number was thought to be · **Helped:** factored in April 1994 by
    Atkins, Graff, Lenstra and Leyland with about 600 volunteers, it showed the
    power of better algorithms and of the internet as a computer; it led to the
    RSA Factoring Challenge (1991 to 2007) and its numbered records ·
    **Status:** closed; the record today is RSA-250, factored in 2020
    (Chapter 11)

### Differential and linear cryptanalysis

DES was the field's great teacher. It was public, standard and everywhere, and it
resisted. In 1990 Eli Biham and Adi Shamir, at the Weizmann Institute in Israel,
published **differential cryptanalysis**: follow how a difference between two
plaintexts travels through the rounds, and use the pairs that behave as predicted
to vote for key bits. It broke FEAL and many other ciphers of the day, and in
1992 they extended it to the full 16-round DES, with the $2^{47}$ chosen
plaintexts of §1.4. DES itself survived better than almost anything else they
tried, and the reason came out in 1994. Don Coppersmith of IBM published the
design criteria of the DES S-boxes and revealed that IBM's team had found the
technique, which they called the "T attack", in 1974, and had chosen the S-boxes
to resist it. At the NSA's request they had kept it secret for twenty years.

In 1993 Mitsuru Matsui of Mitsubishi Electric published **linear
cryptanalysis**, which finds linear equations between plaintext, ciphertext and
key bits that hold slightly more or less often than half the time, and in 1994 he
ran it against DES (§1.4). DES had not been designed against it as carefully, and
it is the best known attack on DES that uses only known plaintext. Together the
two methods became the test every new block cipher must pass, and AES was built
around a proof that it passes them ([Chapter 5](05-Differential-Cryptanalysis.md),
[Chapter 6](06-Linear-Cryptanalysis.md)).

!!! note "Life story: differential cryptanalysis"
    **Born:** 1990, Eli Biham and Adi Shamir (CRYPTO 1990); known in secret at
    IBM as the "T attack" since 1974, and presumably to the NSA · **Purpose:**
    recover a block cipher's key from pairs of plaintexts with a chosen
    difference · **Helped:** break FEAL, Khafre, REDOC-II, LOKI89 and others;
    the first attack on full DES faster than brute force (1992); every cipher
    since, including AES, is designed with a bound against it · **Status:**
    current, with many descendants (truncated, impossible, boomerang
    differentials); the subject of [Chapter 5](05-Differential-Cryptanalysis.md)

### Competitions as tournaments

From the late 1990s the main standards were chosen in public contests, and the
contests were cryptanalysis tournaments. NIST's AES competition (1997 to 2000)
took fifteen candidates; several were attacked in the first round, and the
winner, Rijndael, was chosen partly because it had survived three years of
open attack with its margin intact. The European NESSIE project (2000 to 2003),
the eSTREAM stream-cipher portfolio (2004 to 2008), SHA-3 (2007 to 2012) and the
CAESAR competition for authenticated encryption (2013 to 2019) worked the same
way. A design that cannot survive months of public attack by people who want to
make their names by breaking it is not chosen.

### Hash functions fall

The biggest shock of the 2000s came from China. At the CRYPTO conference in
August 2004, Xiaoyun Wang of Shandong University presented collisions for MD4,
MD5, HAVAL-128 and RIPEMD in a short evening talk, written with Dengguo Feng,
Xuejia Lai and Hongbo Yu. MD5 was everywhere: in certificates, software
distribution, password storage. Her method was differential, but with a new
level of control: she chose the differences through each step by hand and used
**message modification** to force the early conditions to hold, rather than
waiting for luck. Six months later she, Yiqun Lisa Yin and Hongbo Yu announced
the $2^{69}$ attack on SHA-1 (§1.5). The academic-to-practical path of Figure 1.4
ran from there.

!!! note "Life story: Wang's collision attacks"
    **Born:** 2004 and 2005, Xiaoyun Wang (Shandong University, later Tsinghua)
    with Hongbo Yu, Yiqun Lisa Yin, Dengguo Feng and Xuejia Lai · **Purpose:**
    find collisions in the MD4 family of hash functions by carefully built
    differential paths and message modification · **Helped:** real MD5
    collisions in hours, then seconds; the $2^{69}$ SHA-1 attack; rogue
    certificates (2008), Flame (2012) and SHAttered (2017) built on her
    method; NIST's SHA-3 competition (2007) was a direct response · **Status:**
    MD5 and SHA-1 are retired for signatures everywhere that follows advice; the
    subject of [Chapter 9](09-Breaking-Hash-Functions.md)

### The post-quantum tournament

The largest tournament began in 2016. NIST asked for public-key algorithms that
would survive quantum computers, and in late 2017 it accepted 69 complete
submissions for the first round. Many fell within weeks, some to a few lines of
code posted by other submitters. The survivors were attacked for six more years,
and two of the most prominent finalists and alternates fell in 2022.

In February 2022 Ward Beullens, then at IBM Research Zurich, published an attack
on **Rainbow**, a multivariate signature scheme that was a finalist, titled
"Breaking Rainbow takes a weekend on a laptop": his attack recovered a key for
the lowest security level in about 53 hours. In July 2022 NIST announced its first
choices and moved **SIKE**, an encryption scheme based on isogenies between
elliptic curves, into a fourth round for further study. Before the month was out
Wouter Castryck and Thomas Decru of KU Leuven posted a paper that recovered
SIKE's secret key on a single computer core, about an hour for the smallest
parameter set. Their attack used a 1997 theorem of Ernst Kani about products of
elliptic curves, a piece of pure mathematics that nobody had connected to SIKE.
Ten years of analysis had found no weakness, and the scheme fell in one paper.
Chapter 16 tells both stories.

!!! note "Life story: the fall of SIKE"
    **Born:** late July 2022, Wouter Castryck and Thomas Decru (KU Leuven), with
    a related attack by Luciano Maino and Chloe Martindale and a generalization
    by Damien Robert soon after · **Purpose:** recover the secret isogeny in SIDH
    and SIKE from the extra torsion-point information the protocol publishes ·
    **Helped:** broke every SIKE parameter set on ordinary hardware (about an hour
    for SIKEp434 on one core, in their first report) weeks after NIST had
    advanced it; Microsoft's \$50,000 challenge on a smaller instance fell too;
    the SIKE team declared it insecure · **Status:** SIKE and SIDH are dead;
    isogeny-based signatures that do not publish torsion points (SQIsign) live on

The SIKE break is the best modern reminder of how cryptanalysis works. It was
not the result of more computing power, nor of the attack models above being
stretched. It was an idea, from outside the community that had studied the
scheme, published openly, checked within days by other teams who reimplemented
it, and accepted by the designers. That is how breaks reach the world now, and
§1.9 is about how.

## 1.9 How breaks are published

*Level: intermediate.*

A break is a claim, and a claim is worth what its evidence is worth. The way
attacks are published, checked and disclosed has grown into a set of habits that
a reader of attack papers should know.

### Where attacks appear

Academic cryptanalysis is published mostly at conferences, not in journals.
The International Association for Cryptologic Research (IACR), founded in 1982,
runs the main ones: CRYPTO (held every August in Santa Barbara, California,
since 1981), EUROCRYPT (since 1982), ASIACRYPT, Fast Software Encryption (FSE,
since 1993, for symmetric ciphers and hashes), CHES (since 1999, for hardware and
side channels), and others. Attacks on deployed systems also appear at the big
security conferences: USENIX Security, IEEE Symposium on Security and Privacy,
ACM CCS, and at Real World Crypto, a meeting started in 2012 to bring academic
and industrial cryptographers together.

Most new results appear first on the **IACR Cryptology ePrint Archive**, a
preprint server with light screening and no peer review. The SIKE break, the
Rainbow break and most hash-function results were posted there days or weeks
before any conference. CRYPTO also has a **rump session**: an evening of short,
informal talks where results too new for the program are announced. Wang's MD5
collisions were first shown at the CRYPTO 2004 rump session.

### What a good attack paper contains

1. **The model**, stated precisely: what is known, chosen, or measured, and how
   many keys are involved (§1.3).
2. **The complexity**: time in a named unit, data, memory and success
   probability (§1.4), against the generic attack.
3. **The target**: full cipher or reduced rounds, which parameter set, which
   version of the protocol or product.
4. **Evidence.** For attacks within reach: the actual output, such as two
   colliding files, a recovered key, a forged signature. For attacks out of reach:
   experiments on reduced versions that confirm the predicted probabilities, and
   ideally code.

The evidence matters because cryptanalysis is easy to get wrong. A probability
that was assumed independent may not be; a step that was costed at one unit may
cost a thousand. In 2009 a paper claiming a SHA-1 collision attack costing about
$2^{52}$ was withdrawn by its authors after the analysis it relied on was found
to be too optimistic. In 2021 Claus Peter Schnorr, a respected cryptographer,
posted a factoring method whose abstract claimed that it "destroys the RSA
cryptosystem"; others ran it and found it did nothing of the kind. Colliding
files, recovered keys and running code settle such questions, which is why
SHAttered published two PDFs and the SIKE paper published Magma code.

!!! note "Life story: the CRYPTO conference"
    **Born:** August 1981, Santa Barbara, California, organized by Allen Gersho,
    at a time when open cryptographic research was new and contested; the IACR
    followed in 1982 · **Purpose:** a public meeting where cryptographers present
    designs and attacks · **Helped:** Biham and Shamir's differential cryptanalysis
    (1990), Wang's MD5 collisions (rump session, 2004), SHAttered (2017) and
    hundreds of other results first reached the community there · **Status:**
    current, every August; its rump session is still where surprises are
    announced

### Disclosure

Attacks on public algorithms are published openly; there is nobody to warn
first, and the users need to know. Attacks on **products** and **deployments** are
different. Publishing a working attack on software that millions of people run,
before it is fixed, hands it to criminals. The usual practice is **coordinated
disclosure**: the researchers tell the vendor privately, agree on a date, and
publish when fixes are available or the deadline passes, commonly 90 days. The
ROCA flaw in Infineon's RSA key generation was reported to Infineon in February
2017 and made public in October, after updates for smart cards, security chips and
Estonia's national ID card. SHAttered announced its collision at once but held
back the code that made new collisions for 90 days.

Since about 2014 serious flaws have had names and logos: FREAK, Logjam, DROWN,
ROBOT, KRACK. The names are marketing, and some people dislike them, but they
make a flaw easy to talk about and to check for, and administrators patch what
they have heard of.

Not every vendor welcomes the news. In 2008 NXP went to a Dutch court to stop
publication of the Radboud University work on MIFARE Classic (§1.2) and lost. In
2013 Volkswagen won an injunction in the English High Court that delayed for two
years a paper by Flavio Garcia, Roel Verdult and Baris Ege on the Megamos Crypto
car immobilizer; it was published in 2015 with one sentence removed. Researchers
also face laws on circumventing copy protection and on computer misuse; most
large conferences now ask authors how they handled disclosure.

### The secret side

Published cryptanalysis is only part of all cryptanalysis. Governments employ
mathematicians, publish nothing, and do not say what they can do. The one case
where the gap can be measured is differential cryptanalysis: IBM and, by
implication, the NSA knew it in 1974, sixteen years before Biham and Shamir.
Whether the gap is still that wide is unknown and disputed. Documents leaked by
Edward Snowden in 2013 showed that the NSA had worked to weaken a standard random
number generator (Dual_EC_DRBG, Chapter 18) and
budgeted for cryptanalytic capabilities without saying what they were. The 2015
Logjam paper argued that a state-level attacker could break a few widely shared
1024-bit Diffie-Hellman groups by precomputation, and that this could explain
some of the leaked claims; this was an informed guess, not a known fact.

The practical stance for a defender is to assume the secret side is ahead by some
years, and to keep margins large enough that a few years do not matter. The
practical stance for a student is to remember that every attack in this book was
first found by someone who decided to try.

## 1.10 Going deeper

*Level: expert.*

Three ideas that turn the counting of §1.4 into exact statements: the security
level in bits, the attacker's advantage, and the reading of a reduction.
[Book 1, Chapter 17](../../book/17-Defining-Security.md) builds the definitions;
here they are as tools an attacker uses.

### Security levels in bits

An attack is described by its running time $t$ and its success probability
$\varepsilon$. A scheme is **$(t, \varepsilon)$-secure** if no attacker running
in time at most $t$ succeeds with probability more than $\varepsilon$. The
**bit security** is the smallest value of

$$
\log_2 \frac{t}{\varepsilon}
$$

over all known attacks. Dividing by $\varepsilon$ makes cheap, unlikely attacks
and expensive, certain ones comparable, since an attack with probability
$\varepsilon$ can be repeated about $1/\varepsilon$ times to succeed with
probability near one. Exhaustive search on a $k$-bit key shows the formula is
consistent: trying $t$ keys succeeds with probability $\varepsilon = t / 2^k$, so
$t / \varepsilon = 2^k$ for every $t$, from guessing one key ($t = 1$,
$\varepsilon = 2^{-k}$) to trying all of them.

For **decision** problems, where the attacker outputs one bit (real or random?)
and the measure is the advantage below, the right formula is less obvious. An
advantage of $\varepsilon$ needs about $1/\varepsilon^2$ repetitions to amplify to
a reliable answer, not $1/\varepsilon$, and Daniele Micciancio and Michael Walter
argued in 2018 that bit security for such problems should be measured in a way
that reflects this. The common, rougher convention is still $\log_2(t/\varepsilon)$,
and papers that quote bit security for distinguishers should say which they use.

Security levels are a ladder of standard rungs. SP 800-57 lists 80 (no longer
acceptable), 112, 128, 192 and 256 bits, and matches them to key sizes: for
example 3072-bit RSA and a 256-bit elliptic curve for 128 bits, 15,360-bit RSA
and a 512-bit curve for 256 bits. The match comes from the best known attacks on
each, the number field sieve and Pollard's rho, and moves when they improve.

Two effects lower the level below the key length, and both are counted in later
chapters. A **multi-target** attacker who wants any one of $M$ keys, each used on
the same known plaintext, finds one in about $2^k / M$ trials, so a billion users
of a 64-bit key give up about 30 bits ([Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)).
And a quantum attacker running Grover's algorithm searches $2^k$ keys in about
$2^{k/2}$ sequential steps, though the steps are slow and do not parallelize well
(Chapter 16).

### The attacker's advantage

For a block cipher $E$ with $n$-bit blocks, the attacker's goal is often just to
tell $E_K$ (random key $K$) from a truly random permutation $\pi$, given an
oracle that answers queries. The **advantage** of an attacker $\mathcal{A}$ is

$$
\mathrm{Adv}^{\mathrm{prp}}_E(\mathcal{A}) = \left| \Pr\left[\mathcal{A}^{E_K} = 1\right] - \Pr\left[\mathcal{A}^{\pi} = 1\right] \right| ,
$$

the difference between how often it says "real" when talking to the cipher and
when talking to the random permutation. Every attack of this book can be turned
into a distinguisher, and its advantage measured this way.

Two calculations show the scale. **Key guessing:** take one known pair
$(P, C)$; try $t$ keys; say "real" if one of them maps $P$ to $C$. Against $E_K$
this succeeds with probability about $t/2^k$; against $\pi$, a wrong key matches
only by chance, about $t/2^n$. The advantage is about $t/2^k$: tiny until $t$ is
near the whole key space. **Collisions in a random function:** if the oracle is a
random **function** instead of a permutation, $q$ queries on distinct inputs
show a repeated output with probability about $q^2/2^{n+1}$, which a permutation
never does. So permutations and functions are distinguishable with advantage
about $q^2/2^{n+1}$, the **PRP/PRF switching** term. For a 64-bit block and
$q = 2^{32}$ that is $2^{64}/2^{65} = 1/2$: the Sweet32 attack of 2016
([book 1, §6.7](../../book/06-Block-Ciphers.md)). For AES and $q = 2^{48}$ it is
$2^{96}/2^{129} = 2^{-33}$.

### How to read a reduction

A security proof is a **reduction**: a theorem saying that if an attacker
$\mathcal{A}$ breaks scheme $S$, then an algorithm $\mathcal{B}$ built from it
solves problem $P$ ([book 1, §17.7](../../book/17-Defining-Security.md)). In
concrete form a theorem typically reads:

$$
\mathrm{Adv}_S(\mathcal{A}) \le L \cdot \mathrm{Adv}_P(\mathcal{B}) + \delta ,
\qquad \mathcal{B} \text{ runs in time about } t + t_{\text{sim}} .
$$

A cryptanalyst reads it as a map of where attacks can and cannot be.

1. **The assumption $P$.** Usually "AES is a PRP", "the hash behaves as a random
   oracle", "the discrete logarithm problem is hard in this group". An attack on
   $S$ must either break $P$ or step outside the theorem.
2. **The loss $L$.** If $L = 1$ the reduction is **tight**. If $L = q$, the
   number of queries, or $L = N$, the number of users, the guarantee is weaker by
   $\log_2 L$ bits: a 128-bit assumption and a loss of $2^{40}$ guarantee only 88
   bits. A loose reduction does not mean an attack exists, but the gap is where
   to look. Multi-user attacks on schemes proven secure only for one user live in
   that gap.
3. **The additive term $\delta$.** Usually a birthday term like $q^2/2^n$. It is
   not slack in the proof; it is often a real attack. The $q^2/2^{n+1}$ term in
   every proof about CBC and CTR mode with 64-bit blocks is exactly Sweet32.
4. **The model.** The theorem holds for attackers in its model: given these
   oracles, measured by these resources, in the random-oracle or ideal-cipher
   model if it says so. Timing, power, faults, error messages the model did not
   include, and implementations that differ from the specification are outside
   it. Lucky Thirteen (2013) recovered plaintext from TLS implementations whose
   mode had a proof, by measuring the time the padding check took.

Neal Koblitz and Alfred Menezes collected cases, in a series of papers from the
mid-2000s under the title "Another look at provable security", where a proof was
correct and the scheme still failed, because of a loose reduction, an unrealistic
model or a theorem that did not say what users thought it said. Their point is
the attacker's point too: a proof moves the attack, it does not remove it. The
rest of this book is about the places it moves to.

## Check yourself

??? question "1. A cipher's designers keep its algorithm secret and say this makes it stronger. What does Kerckhoffs's principle say an attacker should assume, and what has usually happened to such designs?"

    The attacker assumes the algorithm is known and only the key is secret. In
    practice secret designs have been recovered by capture, insiders, reverse
    engineering of chips or software, and then broken quickly, because few people
    had examined them: A5/2, CSS and MIFARE Classic's Crypto-1 all fell within
    months of becoming known.

??? question "2. A shift-cipher ciphertext begins `QEB`. You know the plaintext begins `THE`. What is the key, and which attack model is this?"

    Q = 16 and T = 19, so $k = (16 - 19) \bmod 26 = 23$. Check with E = 4 and
    B = 1: $(1 - 4) \bmod 26 = 23$. This is known plaintext: the attacker knows
    some plaintext but did not choose it.

??? question "3. Give a real-world source for each of known plaintext, chosen plaintext and chosen ciphertext."

    Known plaintext: fixed protocol headers or file signatures (an HTTP request
    starting `GET`, a ZIP file starting `PK`, Bletchley's weather reports).
    Chosen plaintext: attacker-supplied script in a victim's browser making it
    send chosen requests over TLS (BEAST, CRIME), or any public-key encryption.
    Chosen ciphertext: a server that decrypts what it receives and reports
    errors, as in Bleichenbacher's 1998 attack and padding oracles.

??? question "4. An attacker can try $10^{12}$ keys a second. About how many bits of key can they search completely in a year?"

    A year is about $3.16 \times 10^7$ seconds, so they try about
    $3.16 \times 10^{19}$ keys, and $\log_2(3.16 \times 10^{19}) \approx 64.8$.
    About 65 bits, matching the script in §1.4.

??? question "5. Why did differential cryptanalysis, which needs only $2^{37}$ DES operations, never recover a real DES key, while brute force at $2^{55}$ did?"

    Its data cost: it needs $2^{47}$ chosen plaintexts encrypted under one key,
    which no real victim would supply. Brute force needs a single known pair. The
    cost of an attack is the largest of its costs, and here that is the data.

??? question "6. A collision attack on a 160-bit hash costs $2^{69}$ hash computations. Is that a break? Would a preimage attack of the same cost be one?"

    Yes to both, but of very different size. The generic collision attack costs
    about $2^{80}$ (the birthday bound), so $2^{69}$ is $2^{11}$ times faster. The
    generic preimage attack costs $2^{160}$, so a $2^{69}$ preimage attack would be
    a catastrophic break.

??? question "7. In §1.6 the four-letter ciphertext `WKHP` was decrypted by the log-likelihood scorer to `AOLT` instead of `THEM`. Give two ways to make the attack pick the right answer."

    Feed it more ciphertext, so that letter counts of the true plaintext pull
    away from chance (the measured success rate reaches 93% at 10 letters), or
    give it a better model of English, such as scores for letter pairs, triples
    or whole words, which recognize THEM as a word and AOLT as not.

??? question "8. Why do standards bodies act on academic breaks that nobody can run?"

    Because attacks only get better and the margin is what a cipher really
    offers. MD5 went from a compression-function weakness (1993 and 1996) to
    forged certificates (2008, 2012); SHA-1 from a $2^{69}$ paper attack (2005)
    to a real collision (2017) and chosen-prefix collisions (2020). Retiring an
    algorithm takes years, so it must start while the attack is still academic.

??? question "9. A theorem says $\mathrm{Adv}_S(\mathcal{A}) \le q \cdot \mathrm{Adv}_P(\mathcal{B}) + q^2/2^{128}$. If $P$ offers 128-bit security and the attacker makes $q = 2^{50}$ queries, roughly how many bits does the theorem guarantee?"

    The loss $L = q = 2^{50}$ costs 50 bits: an attacker with time $t$ gets at
    most about $2^{50} \cdot t/2^{128} = t/2^{78}$ from the first term, so about
    78 bits. The second term is $2^{100}/2^{128} = 2^{-28}$, and an attacker who
    spends about $2^{50}$ queries to get that much advantage is also at
    $\log_2(2^{50}/2^{-28}) = 78$ bits. So the theorem guarantees only about 78
    bits at this query count. It does not say an attack exists, only that the
    proof cannot rule one out.

??? question "10. Exhaustive search on a $k$-bit key that tries $t$ keys has success probability $t/2^k$. Show that its bit security, $\log_2(t/\varepsilon)$, is $k$ for every $t$, and explain why that is the right behavior for the measure."

    $t/\varepsilon = t / (t/2^k) = 2^k$, so $\log_2(t/\varepsilon) = k$ for every
    $t$. The measure should not reward an attacker for running a cheap, unlikely
    attack (guessing one key) or an expensive, certain one (trying all keys)
    differently when they are the same strategy at different scales. Dividing by
    $\varepsilon$ charges for repeating the cheap attack until it succeeds.

## What you learned

- Cryptanalysis recovers keys, plaintexts or forgeries, or just distinguishes
  ciphertext from random, without being given the key. Even the smallest win
  counts, because small wins grow.
- Kerckhoffs's principle is the attacker's starting point: the method is known,
  and if it is not, it can usually be captured, bought or reverse-engineered.
- Attack models (ciphertext only, known plaintext, chosen plaintext, chosen
  ciphertext, related key, plus side channels and faults) say what the attacker
  can see and do. Real systems hand attackers the strong models more often than
  people expect.
- Every attack is paid for in time, data and memory, with a success probability,
  and is measured against the generic attack for the same goal: exhaustive
  search, the birthday bound, or the best known algorithm for the hard problem.
- A break faster than the generic attack is a break, but most are academic. They
  matter because they measure the margin, and margins only shrink: MD5 and SHA-1
  went from paper to forged certificates.
- Statistical attacks need enough data, and their success rises steeply past a
  threshold that depends on how good the attacker's model of the plaintext is.
- Breaking went from secret offices (al-Kindi's Baghdad, Room 40, Bletchley) to
  public papers (Biham and Shamir, Matsui, Wang, Castryck and Decru), and is now
  done in open competitions, conferences and preprints, with disclosure to
  vendors when users are at risk.
- Security proofs say where attacks cannot be; the loss, the additive terms and
  the model say where they still might be.

**Next:** [Chapter 2](02-Breaking-Classical-Ciphers.md), where the scorer of
§1.6 grows into the full toolkit for classical ciphers: Kasiski, Friedman, hill
climbing, and the unicity distance.

## Further reading

- Auguste Kerckhoffs, "La cryptographie militaire", *Journal des sciences
  militaires* 9 (1883).
- M. Mrayati, Y. Meer Alam and M. H. at-Tayyan (eds.), *Arabic Origins of
  Cryptology*, vol. 1: al-Kindi's treatise on cryptanalysis (King Faisal Center,
  2003), and the later volumes on Ibn ʿAdlān and Ibn ad-Durayhim.
- David Kahn, *The Codebreakers* (Macmillan, 1967; revised 1996): the standard
  history, from antiquity to the Cold War.
- Simon Singh, *The Code Book* (1999): the Babington plot, Babbage and Kasiski,
  Enigma, told for general readers.
- Friedrich W. Kasiski, *Die Geheimschriften und die Dechiffrir-Kunst* (Berlin,
  1863).
- F. H. Hinsley and others, *British Intelligence in the Second World War*
  (HMSO, 1979 to 1990).
- George Lasry, Norbert Biermann and Satoshi Tomokiyo, "Deciphering Mary Stuart's
  lost letters from 1578-1584", *Cryptologia* 47 (2023).
- Eli Biham and Adi Shamir, *Differential Cryptanalysis of the Data Encryption
  Standard* (Springer, 1993).
- Mitsuru Matsui, "Linear Cryptanalysis Method for DES Cipher" (EUROCRYPT 1993),
  and "The First Experimental Cryptanalysis of the Data Encryption Standard"
  (CRYPTO 1994).
- Don Coppersmith, "The Data Encryption Standard (DES) and its strength against
  attacks", *IBM Journal of Research and Development* 38 (1994).
- Eli Biham, "New types of cryptanalytic attacks using related keys",
  *Journal of Cryptology* 7 (1994).
- Michael Wiener, "The full cost of cryptanalytic attacks", *Journal of
  Cryptology* 17 (2004).
- Xiaoyun Wang and Hongbo Yu, "How to Break MD5 and Other Hash Functions"
  (EUROCRYPT 2005); Xiaoyun Wang, Yiqun Lisa Yin and Hongbo Yu, "Finding
  Collisions in the Full SHA-1" (CRYPTO 2005).
- Marc Stevens, Elie Bursztein, Pierre Karpman, Ange Albertini and Yarik Markov,
  "The First Collision for Full SHA-1" (CRYPTO 2017).
- Gaëtan Leurent and Thomas Peyrin, "SHA-1 is a Shambles" (USENIX Security 2020).
- Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger, "Biclique
  Cryptanalysis of the Full AES" (ASIACRYPT 2011).
- Alex Biryukov and Dmitry Khovratovich, "Related-Key Cryptanalysis of the Full
  AES-192 and AES-256" (ASIACRYPT 2009).
- Ward Beullens, "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022).
- Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH"
  (IACR ePrint 2022/975; EUROCRYPT 2023).
- Flavio Garcia and others, "Dismantling MIFARE Classic" (ESORICS 2008); Karsten
  Nohl, David Evans, Starbug and Henryk Plötz, "Reverse-Engineering a
  Cryptographic RFID Tag" (USENIX Security 2008).
- Daniele Micciancio and Michael Walter, "On the Bit Security of Cryptographic
  Primitives" (EUROCRYPT 2018).
- Neal Koblitz and Alfred Menezes, "Another Look at 'Provable Security'",
  *Journal of Cryptology* 20 (2007).
- SP 800-57 Part 1 Rev. 5, Recommendation for Key Management (NIST, 2020): the
  table of comparable security strengths.
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3 (2018): the
  data limits per key in §5.5.
- In the cryptography book: [Chapter 1](../../book/01-What-Cryptography-Is-For.md)
  (attack models, bits of security), [Chapter 2](../../book/02-Classical-Ciphers.md)
  (classical ciphers), [Chapter 6](../../book/06-Block-Ciphers.md) (DES and its
  attacks), [Chapter 17](../../book/17-Defining-Security.md) (games and
  reductions), and the [history of secret writing](../../history/index.md).
