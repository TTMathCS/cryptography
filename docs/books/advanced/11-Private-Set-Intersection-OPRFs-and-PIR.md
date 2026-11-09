# 11. Private Set Intersection, OPRFs and Private Information Retrieval

*A messenger wants to tell you which of your contacts already use it. An
advertiser wants to know how many people who saw an ad later bought the
product. A password manager wants to warn you that your password is in a
breach. Each time, two parties hold data the other must not see, and the
obvious shortcut, hashing everything and comparing hashes, fails. This chapter
shows why it fails by brute-forcing a million hashed phone numbers in a few
seconds, and then builds what works: private set intersection from
Diffie-Hellman, worked by hand in a group of 83 elements; oblivious
pseudorandom functions, the small primitive standardized as RFC 9497 that sits
under OPAQUE, Privacy Pass and Google's and Apple's breach checks; and private
information retrieval, where a server hands you one record without learning
which one. Along the way you will read the k-anonymity trick behind Have I
Been Pwned, the design Apple proposed in 2021 for detecting known abuse images
and then withdrew, and the enclave Signal uses to look up contacts.*

!!! abstract "In this chapter"
    **You will learn:**

    - why hashing a phone number, an email address or a password hides
      nothing when the set of possible values is small enough to list;
    - Diffie-Hellman private set intersection (Meadows 1986; Huberman,
      Franklin and Hogg 1999), by hand and in code, why it is correct, and
      what its semi-honest assumption leaves open;
    - what an oblivious pseudorandom function is, the 2HashDH construction,
      the three modes of RFC 9497 (OPRF, VOPRF, POPRF), and what goes wrong
      when the hash onto the group is done carelessly;
    - how Privacy Pass (RFC 9576, RFC 9577, RFC 9578) and OPAQUE use OPRFs;
    - how Have I Been Pwned's range API (2018) and Google's Password Checkup
      (2019) check a password against billions of leaked ones, and what each
      still leaks;
    - how Apple's 2021 design for detecting known child sexual abuse material
      combined a perceptual hash, private set intersection and threshold
      secret sharing, why it drew the objections it did, and why it was
      dropped;
    - how Signal answers contact queries inside an SGX enclave, and what that
      trusts;
    - private information retrieval from the trivial download through
      two-server XOR PIR (Chor, Goldreich, Kushilevitz and Sudan, 1995),
      quadratic-residue PIR (Kushilevitz and Ostrovsky, 1997) and lattice PIR
      (SealPIR 2018, SimplePIR and DoublePIR 2023), with their real costs,
      and Apple's Live Caller ID Lookup (2024).

    **You need:** Diffie-Hellman and prime-order groups from book 1,
    [Chapter 12](../../book/12-Diffie-Hellman.md) and
    [Chapter 14](../../book/14-Discrete-Log-Systems.md); hash functions from
    book 1, [Chapter 9](../../book/09-Hash-Functions.md); the trust models of
    [Chapter 1](01-Computing-With-Secrets.md); the Chaum-Pedersen proof of
    [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) for §11.6; Shamir
    sharing from [Chapter 2](02-Secret-Sharing.md) for §11.8. Book 1's
    [Chapter 23](../../book/23-Advanced-Protocols.md) gives a one-page
    version of the OPRF if you want the short road first.

    **Levels:** §11.1 and §11.2 are for beginners, §11.3 to §11.13 are
    intermediate, §11.14 is expert.

## 11.1 The problem

*Level: beginner.*

In January 2014 Moxie Marlinspike, who led the project that became Signal,
published a short essay with an unhappy title: "The Difficulty of Private
Contact Discovery." Every messenger has the same first-run screen. You install
the app, and it shows you which of the people in your phone's address book
already use it. To do that, something has to compare your address book with
the list of registered users. The simplest way is to upload your address book
to the server, and that is what most messengers did and many still do. The
server then learns the phone number of everyone you know, including all the
people who never installed the app and never agreed to anything.

Marlinspike's essay walked through the fixes people usually propose and showed
why each fails or costs too much. Hashing the numbers fails, for a reason we
will code in the next section. Sending every user the full list of registered
users, compressed into a Bloom filter, works for a small service but not a
large one: for ten million users he estimated a filter of about 40 MB, which
every phone would have to download again and again as the list changed. The
cryptographic answers he knew of, private set intersection and private
information retrieval, were too slow at the time for a service with millions
of users. He ended the essay without a solution and asked readers for ideas.

The same shape of problem turns up in very different places.

- **Contact discovery.** You hold a small set (your contacts), the server
  holds a huge set (its users). You should learn which of yours are in it;
  the server should learn nothing about your contacts.
- **Advertising measurement.** An ad network knows who saw an ad; a shop
  knows who bought something. Both want the number of buyers who saw the
  ad, or the total they spent, and neither is supposed to hand the other its
  customer list. This is a set intersection where only a count or a sum
  should come out.
- **Breach checks.** You hold one password; a service holds billions of
  leaked ones. You want to know if yours is among them, without sending your
  password, and the service may not want to publish its whole list either.
- **Matching known images.** A cloud provider holds a list of fingerprints of
  known illegal images; a phone holds the user's photos. The question is
  whether any of the photos match, and the provider is supposed to learn
  nothing about the ones that do not.
- **Looking something up.** You want one record from a public database (is
  this incoming phone number a known scammer? what is the entry for this
  drug?), and the lookup itself reveals what you are interested in.

Three tools answer these questions, and they are the three parts of this
chapter. **Private set intersection** (PSI) lets two parties holding sets $X$
and $Y$ learn $X \cap Y$, or only its size, and nothing else. An **oblivious
pseudorandom function** (OPRF) lets a client apply a server's secret key to an
input the server never sees; it is the small piece from which most practical
PSI and many breach checks are built. **Private information retrieval** (PIR)
lets a client fetch item $i$ from a server's database without the server
learning $i$. Figure 11.1 puts the three side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three problems: private set intersection between two lists, an oblivious PRF between a client and a key holder, and private information retrieval of one row from a database" fill="currentColor" font-size="14">
<text x="105" y="22" text-anchor="middle" font-weight="bold">PSI</text>
<rect x="15" y="40" width="80" height="120" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="55" y="62" text-anchor="middle">Alice</text>
<text x="55" y="88" text-anchor="middle">Ana</text>
<text x="55" y="108" text-anchor="middle">Ben</text>
<text x="55" y="128" text-anchor="middle">Cal</text>
<rect x="115" y="40" width="80" height="120" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155" y="62" text-anchor="middle">Bob</text>
<text x="155" y="88" text-anchor="middle">Ben</text>
<text x="155" y="108" text-anchor="middle">Cal</text>
<text x="155" y="128" text-anchor="middle">Dee, Eve</text>
<text x="105" y="190" text-anchor="middle">Alice learns {Ben, Cal}</text>
<text x="105" y="210" text-anchor="middle">and nothing about</text>
<text x="105" y="230" text-anchor="middle">Dee or Eve</text>
<text x="320" y="22" text-anchor="middle" font-weight="bold">OPRF</text>
<rect x="235" y="40" width="75" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="272" y="62" text-anchor="middle">client</text>
<text x="272" y="80" text-anchor="middle">input x</text>
<rect x="335" y="40" width="75" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="372" y="62" text-anchor="middle">server</text>
<text x="372" y="80" text-anchor="middle">key k</text>
<line x1="310" y1="105" x2="333" y2="105" stroke="currentColor" stroke-width="1.4"/>
<polygon points="335,105 327,101 327,109"/>
<line x1="335" y1="125" x2="312" y2="125" stroke="currentColor" stroke-width="1.4"/>
<polygon points="310,125 318,121 318,129"/>
<text x="322" y="190" text-anchor="middle">client learns F(k, x)</text>
<text x="322" y="210" text-anchor="middle">server learns nothing</text>
<text x="322" y="230" text-anchor="middle">about x</text>
<text x="535" y="22" text-anchor="middle" font-weight="bold">PIR</text>
<rect x="455" y="40" width="70" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="490" y="62" text-anchor="middle">client</text>
<text x="490" y="80" text-anchor="middle">wants i</text>
<rect x="550" y="40" width="80" height="120" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="550" y1="64" x2="630" y2="64" stroke="currentColor" opacity="0.5"/>
<line x1="550" y1="88" x2="630" y2="88" stroke="currentColor" opacity="0.5"/>
<rect x="550" y="88" width="80" height="24" fill="currentColor" opacity="0.15"/>
<line x1="550" y1="112" x2="630" y2="112" stroke="currentColor" opacity="0.5"/>
<line x1="550" y1="136" x2="630" y2="136" stroke="currentColor" opacity="0.5"/>
<text x="590" y="105" text-anchor="middle">row i</text>
<text x="540" y="190" text-anchor="middle">client gets row i;</text>
<text x="540" y="210" text-anchor="middle">server cannot tell</text>
<text x="540" y="230" text-anchor="middle">which row it was</text>
<line x1="20" y1="260" x2="620" y2="260" stroke="currentColor" opacity="0.4"/>
<text x="320" y="285" text-anchor="middle">Each hides the question from the party that holds the data.</text>
</svg>
<figcaption>Figure 11.1. The three tools of this chapter. PSI compares two sets; an OPRF applies a secret key to a hidden input; PIR fetches one record without saying which.</figcaption>
</figure>

None of these is new as an idea. Catherine Meadows, at the US Naval Research
Laboratory, described a set-intersection protocol from Diffie-Hellman in 1986,
for what she called cryptographic matchmaking. Benny Chor, Oded Goldreich,
Eyal Kushilevitz and Madhu Sudan defined private information retrieval in
1995. What changed in the 2010s and 2020s was cost. Elliptic curves made each
exponentiation cheap, oblivious transfer extension (Chapter 9) made bulk PSI
fast, lattice cryptography made single-server PIR approach the speed of
reading memory, and at the same time the questions became pressing: billions
of people with phones full of contacts, billions of leaked passwords, and
regulators asking advertisers what they do with customer lists.

There is one limit to keep in mind from the start, and it will come back in
almost every section. These tools hide everything *except the answer*. If you
are allowed to ask whether 10 million phone numbers are in a set, the
intersection tells you exactly which of them are, however perfect the
cryptography. A PSI protocol stops the server from learning your address book.
It does not stop a client with a fake address book from enumerating the
server's users. That has to be stopped by limits on how much anyone may ask.

## 11.2 Why hashing is not enough

*Level: beginner.*

The first fix almost everyone proposes is to hash. Instead of uploading
`+15550142917`, the app uploads $\text{SHA-256}(\texttt{+15550142917})$, the
server compares it with the hashes of its users' numbers, and, the argument
goes, the server sees only meaningless 64-character strings. Several
messengers and many contact-matching services worked this way, and companies
still describe hashed email addresses and phone numbers as anonymized when
they share them with advertisers.

A hash function is one-way only when the input is hard to guess. Its job, as
book 1's [Chapter 9](../../book/09-Hash-Functions.md) explains, is to make
finding an input for a given output infeasible when the input could be
anything. A phone number cannot be anything. In the North American numbering
plan a number is ten digits, so there are at most $10^{10}$ of them, and far
fewer are actually in service. Worldwide the count of possible mobile numbers
is in the tens of billions. That sounds large, but a modern graphics card
computes SHA-256 at a rate of billions of hashes per second, so the whole
North American space is minutes of work, and a dictionary from every possible
number to its hash can be built once and reused forever. Email addresses are
harder to list exhaustively, but the ones that matter (those in any leaked
database or marketing list) can be hashed in bulk just as easily.

### Code it: undoing a million hashed phone numbers

The program plays the server. It receives three hashed numbers from someone's
address book, all in one made-up exchange of a million numbers, and recovers
them by hashing every number in the exchange. Plain Python on one core does
about a million SHA-256 hashes a second; your rate will differ.

```python
import hashlib, time

def h(number):                          # what the naive app uploads
    return hashlib.sha256(number.encode()).hexdigest()

# The server's view: hashes of three address-book entries, all in one
# made-up exchange of a million numbers, +1 555 0XX XXXX.
uploaded = [h("+15550142917"), h("+15550170003"), h("+15550188421")]

start = time.perf_counter()
table = {}
for n in range(10**6):                  # every number in the exchange
    number = "+15550" + str(n).zfill(6)
    table[h(number)] = number
seconds = time.perf_counter() - start

for d in uploaded:
    print(d[:16], "...", "->", table.get(d))
rate = 10**6 / seconds
print("hashes per second here: about %.1f million" % (rate / 1e6))
print("all 10^10 North American numbers: about %.0f hours" % (1e10 / rate / 3600))
```

One run printed:

```
7a5954bc5de8f9bd ... -> +15550142917
3004587ddb38c4fa ... -> +15550170003
fbb1cc7a3e7e02f5 ... -> +15550188421
hashes per second here: about 1.0 million
all 10^10 North American numbers: about 3 hours
```

The first three lines are the point: every hashed number comes back. The last
two lines depend on the machine. Three hours of interpreted Python on one core
becomes seconds on a graphics card, and the work is done once, not once per
user.

### Why salt and slow hashes do not save it

The usual defenses for stored passwords (book 1,
[Chapter 11](../../book/11-Passwords-and-Key-Derivation.md)) do not transfer.

- **A per-user salt** stops one precomputed table from serving every victim.
  But for matching to work, both sides must hash the same number to the same
  value, so the salt must be shared by everyone, which makes it part of the
  hash function, not a secret. The server, or anyone who copies the uploaded
  hashes, rebuilds the table with the salt included.
- **A slow hash** such as Argon2 multiplies the work. If one hash takes a
  tenth of a second, $10^{10}$ numbers take 30 years of one core, which
  sounds like protection. But the attacker does not need all numbers: one
  country, one area code, or the numbers of people in one organization is a
  few million, and every honest phone must pay the same slow hash for every
  contact on every sync. The margin between honest cost and attack cost is
  the size of the space, and the space is small.
- **A secret pepper**, a key mixed into the hash, does work against an
  outsider, but whoever holds the key can brute-force again, and the client
  must hold it to compute the hash, so every installed copy of the app holds
  it.

What would work is a keyed hash where the key lives only at the server, and
the client can still compute the keyed hash of its own numbers without
showing them. Then brute force requires asking the server once per guess, and
the server can count and limit the asking. That is exactly what an oblivious
PRF provides (§11.5). Alternatively, the two parties can exchange keyed
values under *both* their keys so that neither can test guesses alone. That
is Diffie-Hellman PSI (§11.3).

### Break it: when every query is allowed

Hiding the query is only half the problem. In 2020 a team from the University
of Würzburg and TU Darmstadt (Christoph Hagen, Christian Weinert, Christoph
Sendner, Alexandra Dmitrienko and Thomas Schneider) measured how far an
attacker could get through the front door, by registering ordinary accounts
and asking each messenger's contact-discovery service about huge synthetic
address books. Their paper, "All the Numbers are US" (NDSS 2021), reports
that with a handful of accounts and little money they queried 10 percent of
all US mobile numbers on WhatsApp and all of them on Signal, learning which
numbers had accounts. For WhatsApp they found that about half of the US users
had a public profile picture and about 90 percent a public "About" text, so
an attacker could attach a face and a sentence to a number. They reported the
findings, and both services tightened their rate limits.

No cryptography was broken. Signal's service at the time already hid each
user's address book from Signal itself (§11.9). The attack used the service
exactly as designed, asking honest questions and getting honest answers. Any
contact-discovery system, however private, must also bound how many numbers
one account may ask about, how fast, and how often the set may change. The
same lesson holds for breach checks and OPRF services: the server should
refuse to be an unlimited oracle.

!!! note "Life story: hashed contact matching"
    **Born:** in the early smartphone years, around 2010, when messengers and
    social apps began uploading address books; hashing was the common
    privacy fig leaf · **Purpose:** compare phone numbers or email addresses
    without "sending" them · **Helped:** nothing that matters: a space of
    about $10^{10}$ numbers is listed in hours on one core and seconds on a
    graphics card · **Status:** still common in advertising, where hashed
    emails and phone numbers are routinely uploaded for audience matching;
    for messaging, replaced by PSI, OPRF-based matching and enclaves
    (Signal, 2017)

## 11.3 Diffie-Hellman private set intersection

*Level: intermediate.*

In 1986 Catherine Meadows presented a paper at the IEEE Symposium on Security
and Privacy with a long title, "A More Efficient Cryptographic Matchmaking
Protocol for Use in the Absence of a Continuously Available Third Party." Her
matchmaking problem was this: two parties each hold a secret credential or
interest, and they want to find out whether they match without either one
revealing its secret if they do not. Her protocol raised hashed values to
secret exponents and compared the results. Thirteen years later Bernardo
Huberman, Matt Franklin and Tad Hogg, at Xerox PARC, used the same idea for
whole sets in "Enhancing Privacy and Trust in Electronic Communities" (ACM
Conference on Electronic Commerce, 1999): two people could find the interests
or contacts they had in common without revealing the rest. Rakesh Agrawal,
Alexandre Evfimievski and Ramakrishnan Srikant at IBM applied it to databases
in 2003, calling it commutative encryption. Today it is called
**Diffie-Hellman PSI**, and it is still the simplest PSI there is.

### The idea

Diffie-Hellman key exchange works because exponents commute: Alice computes
$(g^b)^a$, Bob computes $(g^a)^b$, and both get $g^{ab}$. PSI applies the same
fact to every item. Let $H$ hash any item onto a group of prime order $q$
(book 1, [Chapter 14](../../book/14-Discrete-Log-Systems.md)). Alice picks a
secret exponent $a$ and Bob a secret exponent $b$. For any item $x$,

$$
\left(H(x)^a\right)^b = H(x)^{ab} = \left(H(x)^b\right)^a .
$$

So if Alice's values pass through Bob's key and Bob's values pass through
Alice's key, an item they both hold ends as the same group element, $H(x)^{ab}$,
on both sides. An item only one of them holds ends as an element the other
cannot connect to any item, because doing so would need the missing exponent.

### The protocol

Alice holds $X = \{x_1, \dots, x_m\}$, Bob holds $Y = \{y_1, \dots, y_n\}$, and
Alice is to learn $X \cap Y$.

<div class="mars-steps" markdown>

1. Alice sends $u_i = H(x_i)^a$ for each of her items, in her own order.
2. Bob sends back $v_i = u_i^b = H(x_i)^{ab}$, **in the same order**, so
   Alice knows which $v_i$ belongs to which of her items.
3. Bob also sends $w_j = H(y_j)^b$ for each of his items, shuffled.
4. Alice computes $w_j^a = H(y_j)^{ab}$ for each $j$ and checks which of
   her $v_i$ appear among them. Item $x_i$ is in the intersection exactly
   when $v_i$ does.

</div>

Alice learns the intersection; Bob learns $m$, the size of Alice's set.
Alice also learns $n$, the size of Bob's.

### By hand, in a group of 83 elements

Take $p = 167 = 2 \cdot 83 + 1$. The squares mod 167 form a group of prime
order $q = 83$, so exponents work mod 83. Instead of a real hash, suppose the
five names hash to five squares:

| Item | Ana | Ben | Cal | Dee | Eve |
|---|---|---|---|---|---|
| $H(\text{item})$ | $9 = 3^2$ | $25 = 5^2$ | $36 = 6^2$ | $49 = 7^2$ | $64 = 8^2$ |

Alice holds {Ana, Ben, Cal} and picks $a = 13$. Bob holds {Ben, Dee, Cal,
Eve} and picks $b = 29$.

**Step 1.** Alice computes $H(x)^{13} \bmod 167$ for her three items. For Ben,
by repeated squaring: $25^2 = 625 \equiv 124$, $25^4 \equiv 124^2 = 15376
\equiv 12$, $25^8 \equiv 144$; then $13 = 8 + 4 + 1$ gives $25^{13} \equiv 144
\cdot 12 \cdot 25$. Now $144 \cdot 12 = 1728 \equiv 58$ and $58 \cdot 25 =
1450 \equiv 114$. The other two work the same way:

$$
9^{13} \equiv 8, \qquad 25^{13} \equiv 114, \qquad 36^{13} \equiv 147 \pmod{167}.
$$

Alice sends $(8, 114, 147)$.

**Step 2.** Bob raises each to $b = 29$ and returns them in order:

$$
8^{29} \equiv 16, \qquad 114^{29} \equiv 31, \qquad 147^{29} \equiv 44 .
$$

**Step 3.** Bob raises his own items to 29: Ben $25^{29} \equiv 19$, Dee
$49^{29} \equiv 127$, Cal $36^{29} \equiv 150$, Eve $64^{29} \equiv 89$. He
sends $\{19, 127, 150, 89\}$ in random order.

**Step 4.** Alice raises Bob's four values to 13:

$$
19^{13} \equiv 31, \qquad 127^{13} \equiv 66, \qquad 150^{13} \equiv 44, \qquad 89^{13} \equiv 133 .
$$

Her doubly keyed values were $(16, 31, 44)$, for (Ana, Ben, Cal). The set
$\{31, 66, 44, 133\}$ contains 31 and 44, so the intersection is {Ben, Cal}.
Alice does not know which of Bob's four values was Dee or Eve, and the values
66 and 133 tell her nothing she can test without $b$. Figure 11.2 shows the
exchange.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Diffie-Hellman PSI message flow with the numbers mod 167: Alice sends 8, 114, 147; Bob returns 16, 31, 44 and his own 19, 127, 150, 89; Alice finds 31 and 44 in common" fill="currentColor" font-size="14">
<rect x="10" y="10" width="170" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="30" text-anchor="middle" font-weight="bold">Alice, a = 13</text>
<text x="95" y="47" text-anchor="middle">Ana, Ben, Cal</text>
<rect x="460" y="10" width="170" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="30" text-anchor="middle" font-weight="bold">Bob, b = 29</text>
<text x="545" y="47" text-anchor="middle">Ben, Dee, Cal, Eve</text>
<line x1="95" y1="54" x2="95" y2="370" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="545" y1="54" x2="545" y2="370" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="95" y1="100" x2="537" y2="100" stroke="currentColor" stroke-width="1.6"/>
<polygon points="545,100 537,96 537,104"/>
<text x="320" y="92" text-anchor="middle">1. H(x)^a: (8, 114, 147)</text>
<line x1="545" y1="160" x2="103" y2="160" stroke="currentColor" stroke-width="1.6"/>
<polygon points="95,160 103,156 103,164"/>
<text x="320" y="152" text-anchor="middle">2. same order, ^b: (16, 31, 44)</text>
<line x1="545" y1="220" x2="103" y2="220" stroke="currentColor" stroke-width="1.6"/>
<polygon points="95,220 103,216 103,224"/>
<text x="320" y="212" text-anchor="middle">3. H(y)^b, shuffled: {19, 127, 150, 89}</text>
<text x="105" y="262">4. Alice computes ^a: {31, 66, 44, 133}</text>
<text x="105" y="290">31 and 44 appear in (16, 31, 44): Ben and Cal</text>
<text x="105" y="318">66 and 133 are Dee and Eve, but she cannot tell which</text>
<text x="535" y="350" text-anchor="end">Bob learns only that Alice has 3 items</text>
</svg>
<figcaption>Figure 11.2. Diffie-Hellman PSI with the numbers worked above. Items both parties hold meet at H(x)^ab; the rest stay unlinkable.</figcaption>
</figure>

### Why it is correct, and why it hides

**Correctness** is the line above: $(H(x)^a)^b = (H(x)^b)^a$ because
multiplying exponents is commutative. If $x$ is in both sets, the two sides
produce the same element. If an item of Alice's and an item of Bob's are
different, their keyed values differ unless $H$ itself collides, since
$z \mapsto z^{ab}$ is a one-to-one map on a group of prime order. In the toy
group with 83 elements, two different real names would collide with
probability $1/83$, which is why the hand example chose distinct hash values
and real systems use groups of about $2^{256}$ elements.

**Privacy** rests on the decisional Diffie-Hellman assumption (DDH), with $H$
modeled as a random oracle. Bob sees $H(x_i)^a$. If $H$ behaves like a random
function, $H(x_i) = g^{h_i}$ for an unknown random $h_i$, and $H(x_i)^a =
g^{h_i a}$. Telling whether this equals the key-raised hash of some guess $x'$
means recognizing a Diffie-Hellman tuple $(g, g^{h'}, g^{a}, g^{h' a})$ with
$g^a$ never published, which DDH says cannot be done. The same argument
covers what Alice sees of Bob's items. Formal proofs in the semi-honest model
followed the protocol by many years (Emiliano De Cristofaro and Gene Tsudik
gave one in 2010, together with improved versions); the protocol was in use
long before.

**Cost.** Alice does $2m$ exponentiations, Bob $m + n$. They exchange
$2m + n$ group elements. With a 256-bit curve each element is 32 bytes and an
exponentiation takes tens of microseconds, so sets of a million items on each
side take seconds of computing and about 100 MB of traffic. The $n$ term is
the catch for contact discovery: a service with a billion users cannot send
every phone a billion keyed values. §11.4 and §11.5 come back to that.

### Code it: DH-PSI

The program first replays the hand example, then runs the same protocol with a
real hash in a 127-bit group. The 127-bit group keeps the numbers short enough
to print and is far too small for real use; deployed DH-PSI uses a 256-bit
elliptic curve.

```python
import hashlib, random

# By hand first: the group of squares mod 167, of prime order 83.
p, q = 167, 83
H = {"Ana": 9, "Ben": 25, "Cal": 36, "Dee": 49, "Eve": 64}   # pretend hash values
a, b = 13, 29
m1 = [pow(H[x], a, p) for x in ["Ana", "Ben", "Cal"]]
m2 = [pow(v, b, p) for v in m1]
m3 = [pow(H[y], b, p) for y in ["Ben", "Dee", "Cal", "Eve"]]
print("by hand:", m1, m2, m3, [pow(v, a, p) for v in m3])

# The same protocol with a real hash in a 127-bit group (still a toy:
# real systems use a 256-bit elliptic curve such as P-256 or Curve25519).
P = 2**127 - 2721                      # a safe prime: P = 2Q + 1, Q prime
Q = (P - 1) // 2

def to_group(item):                    # hash, then square into the order-Q subgroup
    d = hashlib.sha256(b"PSI demo|" + item.encode()).digest()
    return pow(int.from_bytes(d, "big"), 2, P)

random.seed(2026)                      # random is for the demo; use secrets for real keys
a = random.randrange(1, Q)             # Alice's secret exponent
b = random.randrange(1, Q)             # Bob's secret exponent
alice = ["Ana", "Ben", "Cal"]
bob = ["Ben", "Dee", "Cal", "Eve"]

msg1 = [pow(to_group(x), a, P) for x in alice]          # Alice -> Bob
msg2 = [pow(v, b, P) for v in msg1]                     # Bob -> Alice, same order
msg3 = [pow(to_group(y), b, P) for y in bob]            # Bob -> Alice
random.shuffle(msg3)                                    # order says nothing
bob_double = {pow(v, a, P) for v in msg3}               # Alice adds her key
print("Alice learns:", [x for x, v in zip(alice, msg2) if v in bob_double])
print("Bob learns: Alice has", len(msg1), "items")
```

Output:

```
by hand: [8, 114, 147] [16, 31, 44] [19, 127, 150, 89] [31, 66, 44, 133]
Alice learns: ['Ben', 'Cal']
Bob learns: Alice has 3 items
```

Squaring a hash value mod a safe prime is a simple way to land in the
prime-order subgroup, and it is fine for a demonstration. On a real curve the
hash onto the group is a careful construction, RFC 9380's hash-to-curve, for
reasons §11.5 makes concrete.

### Break it: the semi-honest assumption

The privacy argument above assumed both parties follow the steps and only try
to learn from what they see. That is the **semi-honest** (honest-but-curious)
model of [Chapter 1](01-Computing-With-Secrets.md). A party who deviates
can do damage the argument never considered. The simplest deviation is in
step 2: Bob is trusted to return Alice's values in her order, and nothing
checks that he did. If he swaps two of them, Alice reaches a wrong answer and
has no way to notice.

```python
import hashlib, random

P = 2**127 - 2721
Q = (P - 1) // 2

def to_group(item):
    d = hashlib.sha256(b"PSI demo|" + item.encode()).digest()
    return pow(int.from_bytes(d, "big"), 2, P)

def run(bob_cheats):
    random.seed(7)                     # demo randomness only
    a, b = random.randrange(1, Q), random.randrange(1, Q)
    alice = ["Ana", "Ben", "Cal"]
    bob = ["Ben", "Dee", "Cal", "Eve"]
    msg1 = [pow(to_group(x), a, P) for x in alice]
    msg2 = [pow(v, b, P) for v in msg1]
    if bob_cheats:                     # swap the answers for Ana and Ben
        msg2[0], msg2[1] = msg2[1], msg2[0]
    msg3 = [pow(to_group(y), b, P) for y in bob]
    bob_double = {pow(v, a, P) for v in msg3}
    return [x for x, v in zip(alice, msg2) if v in bob_double]

print("honest Bob:  ", run(False))
print("cheating Bob:", run(True))
```

Output:

```
honest Bob:   ['Ben', 'Cal']
cheating Bob: ['Ana', 'Cal']
```

Bob could equally raise some of Alice's values to a different exponent, so
that items they share appear not to match, or use one exponent in step 2 and
another in step 3, so that nothing matches. Each breaks correctness, not
privacy: Bob still learns nothing new about Alice's items. In contact
discovery that is a nuisance; in a protocol where the result triggers a
payment or an accusation it is serious.

There is a second deviation that no protocol can stop, because it is allowed
in the ideal world too: **choosing your input**. Bob can add any item he
likes to his set, and Alice can put any items she likes in hers. If Alice's
"address book" is every number in an area code, the intersection is every user
in that area code. PSI promises that you learn the intersection and nothing
more; it says nothing about what a dishonest party puts in.

**Fix it.** Against the first kind of cheating there are maliciously secure
versions. Bob publishes a commitment to his key, $g^b$, and with his answers
adds a zero-knowledge proof that each $v_i$ is $u_i$ raised to that same $b$:
a batched Chaum-Pedersen proof of equal discrete logs from
[Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md). Stanisław Jarecki and
Xiaomin Liu built PSI with security against malicious parties along these
lines (2009, 2010). Against the second kind, only policy helps: caps on set
size, rate limits per account, and charging for registration, as §11.2
showed.

!!! note "Life story: Diffie-Hellman PSI"
    **Born:** 1986, Catherine Meadows, US Naval Research Laboratory, as
    "cryptographic matchmaking" (IEEE Symposium on Security and Privacy);
    for whole sets, Huberman, Franklin and Hogg at Xerox PARC (ACM EC 1999)
    · **Purpose:** let two parties learn the items they hold in common and
    nothing else, with two exponentiations per item · **Helped:** Google's
    Private Join and Compute (2019) and its ad-conversion measurement, the
    blinded matching inside Google's Password Checkup (2019), and the
    reference point every newer PSI protocol is measured against ·
    **Status:** current; still the best choice for small sets and simple
    deployments; secure against semi-honest parties under DDH in the
    random-oracle model, malicious security needs proofs added

## 11.4 PSI after Diffie-Hellman, and advertising

*Level: intermediate.*

Diffie-Hellman PSI costs a public-key operation per item. That is fine for a
thousand contacts and slow for a billion rows. Twenty years of research has
produced PSI protocols that trade structure for speed, and a few variants
that output less than the intersection.

**Polynomials.** Michael Freedman, Kobbi Nissim and Benny Pinkas (EUROCRYPT
2004) encoded Alice's set as the roots of a polynomial
$P(z) = \prod_i (z - x_i)$, encrypted its coefficients with an additively
homomorphic scheme (Paillier, [Chapter 12](12-Homomorphic-Encryption.md)), and
let Bob evaluate $r \cdot P(y) + y$ on encrypted coefficients for each of his
items. Where $y$ is a root, the result decrypts to $y$; elsewhere to random
junk. This was the first PSI with a clean security proof, and the start of the
academic line.

**Oblivious transfer.** Benny Pinkas, Thomas Schneider and Michael Zohner
(USENIX Security 2014) and then Vladimir Kolesnikov, Ranjit Kumaresan, Mike
Rosulek and Ni Trieu (KKRT, CCS 2016) built PSI from oblivious transfer
extension ([Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md)). A few
hundred public-key operations set up millions of OTs, which cost only
symmetric-key work, and each item is hashed into a table where it meets the
other side's items in a small batch. KKRT intersects two sets of a million
items in a few seconds on a fast network. In effect, these protocols compute
an OPRF on each of Alice's items with symmetric cryptography, and compare.

**Unbalanced sets.** Contact discovery is lopsided: a client with a few hundred
numbers against a server with hundreds of millions. Hao Chen, Kim Laine and
Peter Rindal (CCS 2017) used lattice homomorphic encryption so that the
client's encrypted items travel to the server and the server's work is large
but its reply is small; the client never downloads the big set. A 2018
sequel added **labeled** PSI, which returns a value attached to each matching
item, which is a kind of keyword PIR (§11.12).

**Less than the intersection.** Often nobody should learn which items match,
only how many, or a total over them.

- **PSI cardinality** outputs $|X \cap Y|$. In DH-PSI it is one change: Bob
  shuffles his step-2 answers too, so Alice can count matches but not say
  which of her items they belong to.
- **PSI sum** outputs the sum of values attached to matching items, such as
  money spent by buyers who saw an ad.
- **Circuit PSI** keeps the intersection secret-shared between the parties,
  so any further computation (a sum, a threshold, a statistic) runs on it in
  MPC ([Chapter 10](10-Multi-Party-Computation-in-Practice.md)) before
  anything is revealed.

### Code it: counting without naming

The ad network (Alice) has six people who saw an ad; the shop (Bob) has five
who bought. With Bob shuffling his step-2 answers, Alice learns only the
count.

```python
import hashlib, random

P = 2**127 - 2721
Q = (P - 1) // 2

def to_group(item):
    d = hashlib.sha256(b"PSI demo|" + item.encode()).digest()
    return pow(int.from_bytes(d, "big"), 2, P)

random.seed(3)                         # demo randomness only
a, b = random.randrange(1, Q), random.randrange(1, Q)
viewers = ["Ana", "Ben", "Cal", "Dee", "Fay", "Gus"]   # saw the ad (ad network)
buyers = ["Cal", "Eve", "Fay", "Hal", "Ben"]           # bought (shop)

msg1 = [pow(to_group(x), a, P) for x in viewers]
msg2 = [pow(v, b, P) for v in msg1]
random.shuffle(msg2)                   # the one change: Bob shuffles these too
msg3 = [pow(to_group(y), b, P) for y in buyers]
bob_double = {pow(v, a, P) for v in msg3}
print("viewers who bought:", sum(v in bob_double for v in msg2))
```

Output:

```
viewers who bought: 3
```

### In the real world: advertising measurement

Advertising is where PSI has run at the largest scale, mostly out of sight. In
June 2019 Google released **Private Join and Compute**, an open-source
protocol for exactly the count-and-sum question above. Its paper (Mihaela Ion
and colleagues, "On Deploying Secure Computing: Private
Intersection-Sum-with-Cardinality", IEEE EuroS&P 2020) describes DH-PSI on
identifiers with Paillier encryption carrying the spend values, so that the
advertiser learns the number of matched customers and their total spend, and
reports that Google had used it to compute aggregate ad-conversion
statistics for advertisers. Meta (then Facebook) built its own toolkit from
about 2020, with a "Private Lift" product measuring how much an ad campaign
changed purchases using MPC between Meta and an advertiser, and an
open-source matching protocol, Private-ID. In 2022 Meta and Mozilla proposed
Interoperable Private Attribution to the W3C's Private Advertising
Technology Community Group, combining MPC and differential privacy
([Chapter 19](19-Differential-Privacy.md)). Google's browser-side Privacy
Sandbox took a different road, with attribution reports computed in the
browser and aggregated by servers in trusted hardware; in 2025 Google said
it would retire most of those interfaces. The exact deployment scale of these
systems is not public. What can be said is that the counting question at the
heart of advertising is a set intersection, and that by the early 2020s the
largest advertising companies answered it, at least in part, with PSI and MPC
rather than by swapping customer lists.

## 11.5 Oblivious pseudorandom functions

*Level: intermediate.*

Section 11.2 ended with a wish: a keyed hash whose key lives only at the
server, which a client can still compute on its own inputs without showing
them. With such a thing, hashing phone numbers would work. Anyone who wanted
to brute-force the space would have to ask the server once per guess, and the
server could notice and refuse. That wish has a name.

A **pseudorandom function** (PRF) is a keyed function $F(k, x)$ whose outputs
look random to anyone who does not know $k$, even after seeing many of them
(book 1, [Chapter 10](../../book/10-Message-Authentication.md), where HMAC is
the standard example). An **oblivious PRF** is a two-party protocol for
computing it. The server holds $k$; the client holds $x$. At the end:

- the client learns $F(k, x)$ and nothing else about $k$;
- the server learns nothing about $x$, and nothing about the output.

Michael Freedman, Yuval Ishai, Benny Pinkas and Omer Reingold gave the
definition at the Theory of Cryptography Conference in 2005, for keyword
search, building on a PRF by Moni Naor and Omer Reingold (1997) that could be
evaluated obliviously. The construction that is used today is simpler. Its
form appears in work by Stanisław Jarecki and Xiaomin Liu (2009, 2010) on set
intersection, and it was named and analyzed as **2HashDH** by Jarecki, Aggelos
Kiayias and Hugo Krawczyk (ASIACRYPT 2014), for password-protected secret
sharing:

$$
F(k, x) = H_2\!\left(x,\ H_1(x)^k\right),
$$

where $H_1$ hashes onto a group of prime order $q$ and $H_2$ is an ordinary
hash. The client cannot compute $H_1(x)^k$ alone, and the server must not see
$H_1(x)$. Blinding solves both.

### The protocol

<div class="mars-steps" markdown>

1. **Blind.** The client picks a random $r$ with $1 \le r < q$ and sends
   $B = H_1(x)^r$.
2. **Evaluate.** The server sends back $Z = B^k$.
3. **Unblind.** The client computes $N = Z^{r^{-1} \bmod q}$, which is
   $H_1(x)^k$, and outputs $H_2(x, N)$.

</div>

Unblinding works because exponents count mod $q$:

$$
Z^{r^{-1}} = H_1(x)^{r k r^{-1}} = H_1(x)^{k} .
$$

### By hand, in the same group

Stay mod $p = 167$, where the squares form a group of order $q = 83$. Suppose
the client's input, say the password `olympus`, hashes to $H_1(x) = 81 = 9^2$.
The server's key is $k = 37$. The client picks $r = 10$.

| Step | Who | Calculation | Value |
|---|---|---|---|
| Blind | client | $81^{10} = 81^8 \cdot 81^2 \equiv 154 \cdot 48 = 7392 \equiv 44$ | $B = 44$ |
| Evaluate | server | $44^{37} \bmod 167$ | $Z = 152$ |
| Inverse | client | $10^{-1} \bmod 83$: $10 \cdot 25 = 250 = 3 \cdot 83 + 1$ | 25 |
| Unblind | client | $152^{25} \bmod 167$ | $N = 6$ |
| Check | anyone with $k$ | $81^{37} \bmod 167$ | 6 |

Now the client asks again with $r = 51$. It sends $B = 81^{51} \equiv 42$, gets
$Z = 42^{37} \equiv 11$, finds $51^{-1} \equiv 70 \pmod{83}$ (since $51 \cdot 70
= 3570 = 43 \cdot 83 + 1$), and unblinds $11^{70} \equiv 6$. Same output. The
server saw 44 the first time and 42 the second, two elements with no visible
relation to each other or to 81. Figure 11.3 shows the first run.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The 2HashDH oblivious PRF mod 167: the client blinds 81 with r equal to 10 and sends 44, the server returns 152, the client unblinds to 6" fill="currentColor" font-size="14">
<rect x="10" y="10" width="190" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="30" text-anchor="middle" font-weight="bold">Client</text>
<text x="105" y="47" text-anchor="middle">H1(x) = 81, r = 10</text>
<rect x="440" y="10" width="190" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="30" text-anchor="middle" font-weight="bold">Server</text>
<text x="535" y="47" text-anchor="middle">key k = 37</text>
<line x1="105" y1="54" x2="105" y2="320" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="535" y1="54" x2="535" y2="320" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="105" y1="110" x2="527" y2="110" stroke="currentColor" stroke-width="1.6"/>
<polygon points="535,110 527,106 527,114"/>
<text x="320" y="100" text-anchor="middle">blind: B = 81^10 mod 167 = 44</text>
<text x="320" y="130" text-anchor="middle" opacity="0.8">looks like any element of the group</text>
<line x1="535" y1="180" x2="113" y2="180" stroke="currentColor" stroke-width="1.6"/>
<polygon points="105,180 113,176 113,184"/>
<text x="320" y="170" text-anchor="middle">evaluate: Z = 44^37 mod 167 = 152</text>
<text x="115" y="225">unblind: 10^-1 mod 83 = 25,  152^25 mod 167 = 6</text>
<text x="115" y="250">6 = 81^37: the server's key on the hidden input</text>
<text x="115" y="275">output F(k, x) = H2(x, 6)</text>
<text x="115" y="305" opacity="0.8">with r = 51 the server would see 42, and the result is still 6</text>
</svg>
<figcaption>Figure 11.3. One 2HashDH evaluation with the numbers above. The server applies its key to a blinded value; the client removes the blinding.</figcaption>
</figure>

### Why it is secure

**The server learns nothing, unconditionally.** In a group of prime order $q$,
every element except 1 generates the whole group. For a fixed $H_1(x) \neq
1$, the map $r \mapsto H_1(x)^r$ is a one-to-one correspondence between the
exponents $1, \dots, q - 1$ and the elements other than 1. If $r$ is uniform,
so is $B$, whatever $x$ was. The server's view is a uniformly random element,
and no amount of computing power changes that. RFC 9497 calls this
unconditional input secrecy.

**The client learns only what it asked for.** This half is computational. A
client that has made $Q$ queries should not be able to produce $Q + 1$
different input-output pairs. That is the **one-more Diffie-Hellman**
assumption, in a "gap" form that also lets the attacker check Diffie-Hellman
tuples: given $g$, $g^k$ and an oracle that raises any element to $k$, you
cannot raise $Q + 1$ chosen hash outputs to $k$ with only $Q$ calls. Jarecki,
Kiayias, Krawczyk and Xu proved 2HashDH a secure OPRF under this assumption
with both hashes as random oracles (2016).

**Why the outer hash.** Without $H_2$ the output would be the group element
$H_1(x)^k$, which carries algebraic structure: anyone can multiply two outputs
or raise one to a power. Hashing it, with $x$ included, gives an output that
behaves like a random string and binds it to its input.

### Code it: a 2HashDH OPRF, and contact discovery from it

The program replays the hand example, runs 2HashDH with a real hash in the
127-bit group of §11.3 (still a toy: RFC 9497 uses 256-bit or larger curves),
and then uses it for contact discovery. The server publishes the OPRF outputs
of its users' numbers; a client obtains the outputs for its own contacts, one
blinded query each, and compares locally. Brute-forcing the published list now
needs the server's key, and every guess costs a query the server can count.

```python
import hashlib, random

# By hand first: mod 167, order 83, H1(x) = 81, server key k = 37.
p, q, k = 167, 83, 37
for r in (10, 51):
    B = pow(81, r, p)                  # client blinds
    Z = pow(B, k, p)                   # server evaluates
    N = pow(Z, pow(r, -1, q), p)       # client unblinds
    print("r =", r, " B =", B, " Z =", Z, " N =", N)

# 2HashDH in a 127-bit group (a toy; RFC 9497 uses ristretto255, P-256 and others).
P = 2**127 - 2721
Q = (P - 1) // 2

def H1(x):                             # hash onto the group (toy: hash, then square)
    d = hashlib.sha256(b"H1|" + x).digest()
    return pow(int.from_bytes(d, "big"), 2, P)

def H2(x, N):                          # the outer hash: F(k, x) = H2(x, H1(x)^k)
    return hashlib.sha256(b"H2|" + x + b"|" + N.to_bytes(16, "big")).hexdigest()[:16]

def blind(x):
    r = random.randrange(1, Q)
    return r, pow(H1(x), r, P)

def evaluate(key, B):                  # the only thing the server does
    return pow(B, key, P)

def finalize(x, r, Z):
    return H2(x, pow(Z, pow(r, -1, Q), P))

random.seed(11)                        # random is for the demo; use secrets for real keys
key = random.randrange(1, Q)           # the server's OPRF key

r1, B1 = blind(b"+15550142917")
r2, B2 = blind(b"+15550142917")
print("two requests for one input look unrelated:", B1 != B2)
y1 = finalize(b"+15550142917", r1, evaluate(key, B1))
y2 = finalize(b"+15550142917", r2, evaluate(key, B2))
print("but give the same output:", y1, y1 == y2)
print("which is F(k, x):", y1 == H2(b"+15550142917", pow(H1(b"+15550142917"), key, P)))

# Contact discovery from an OPRF: the server publishes F(k, y) for its users,
# the client obtains F(k, x) for its contacts one blinded query at a time.
users = [b"+15550142917", b"+15550188421", b"+15550111111"]
published = {H2(y, pow(H1(y), key, P)) for y in users}
contacts = [b"+15550142917", b"+15550170003", b"+15550188421"]
found = []
for x in contacts:
    r, B = blind(x)
    if finalize(x, r, evaluate(key, B)) in published:
        found.append(x.decode())
print("contacts who are users:", found)
```

Output:

```
r = 10  B = 44  Z = 152  N = 6
r = 51  B = 42  Z = 11  N = 6
two requests for one input look unrelated: True
but give the same output: fed05a7f09976a96 True
which is F(k, x): True
contacts who are users: ['+15550142917', '+15550188421']
```

This is PSI built from an OPRF, and it is the form most deployed PSI takes.
Compared with DH-PSI, the server's set is keyed once and can be cached or
published; each client query costs one exponentiation at the server, however
large its set. The price is that the server's published list still has to
reach the client, which for a billion users is again the problem of §11.1.
Unbalanced PSI (§11.4) and PIR (§11.10) are the ways around that.

### Break it: a hash onto the group with a known logarithm

The toy hashes onto the group by hashing to an integer and squaring. A
tempting shortcut is to hash to an exponent instead, $H_1(x) = g^{h(x)}$,
which is just as easy to compute and lands in the group too. It destroys the
OPRF. If $H_1(x) = g^{h(x)}$, then

$$
H_1(x)^k = g^{h(x)\,k} = \left(g^k\right)^{h(x)},
$$

and $g^k$ is either the server's published key (it is published in the
verifiable mode of §11.6) or the answer to a single query on any input with a
known logarithm. From then on the client computes $F(k, x)$ for every $x$ it
likes, offline, with no queries.

```python
import hashlib, random

P = 2**127 - 2721
Q = (P - 1) // 2
g = 4                                  # generates the order-Q subgroup

def h(x):                              # an ordinary hash to an exponent
    return int.from_bytes(hashlib.sha256(x).digest(), "big") % Q

def H1_bad(x):                         # WRONG: a group element whose log is known
    return pow(g, h(x), P)

random.seed(5)                         # demo randomness only
key = random.randrange(1, Q)           # server's secret
pk = pow(g, key, P)                    # published, as in verifiable mode

def server(B):
    return pow(B, key, P)

# Honest use: blind, evaluate, unblind.
r = random.randrange(1, Q)
honest = pow(server(pow(H1_bad(b"123456"), r, P)), pow(r, -1, Q), P)

# The attack: no queries at all. H1_bad(x)^key = (g^key)^h(x) = pk^h(x).
guesses = [b"password", b"123456", b"qwerty", b"letmein"]
offline = {x: pow(pk, h(x), P) for x in guesses}
print("offline value for 123456 matches the server's:", offline[b"123456"] == honest)
print("so every guess is tested without asking the server:", len(offline), "done")
```

Output:

```
offline value for 123456 matches the server's: True
so every guess is tested without asking the server: 4 done
```

**Fix it.** Hash onto the group so that nobody knows the discrete logarithm
of the result. On elliptic curves that is RFC 9380 (2023), "Hashing to
Elliptic Curves", which RFC 9497 requires; it maps a string to a curve point
through a field element and a fixed map, with no exponent anywhere in sight.
Squaring a hash mod a safe prime, as the toy does, has the same property in
that group.

!!! note "Life story: oblivious PRFs and 2HashDH"
    **Born:** 2005, Freedman, Ishai, Pinkas and Reingold (TCC 2005), on
    Naor and Reingold's 1997 PRF; the hashed Diffie-Hellman form in
    Jarecki and Liu's set-intersection papers (2009, 2010), named 2HashDH by
    Jarecki, Kiayias and Krawczyk (ASIACRYPT 2014) · **Purpose:** let a
    client apply a server's secret key to an input the server never sees ·
    **Helped:** OPAQUE (RFC 9807, 2025), Privacy Pass (RFC 9578, 2024),
    WhatsApp's end-to-end encrypted backups (2021), password breach checks
    at Google, Apple and Microsoft, OPRF-based PSI · **Status:** current;
    standardized as RFC 9497 (December 2023); not post-quantum: a quantum
    computer could recover the key, though blinded inputs stay hidden

## 11.6 RFC 9497 and the services built on it

*Level: intermediate.*

The IRTF's Crypto Forum Research Group spent several years turning 2HashDH
into a specification. RFC 9497, "Oblivious Pseudorandom Functions (OPRFs)
Using Prime-Order Groups," by Alex Davidson, Armando Faz-Hernández, Nick
Sullivan and Christopher Wood, was published in December 2023. It fixes the
groups (ristretto255 with SHA-512, decaf448 with SHAKE256, P-256 with
SHA-256, P-384 with SHA-384, P-521 with SHA-512), the hash-to-group maps, the
encodings and the test vectors, and it defines three modes.

- **OPRF** (mode 0x00) is the protocol of §11.5.
- **VOPRF** (mode 0x01), verifiable. The server publishes a public key
  $\mathit{pk} = g^k$, and with each answer it attaches a proof that
  $\log_g \mathit{pk} = \log_B Z$, that is, that it used the published key.
  The proof is the Chaum-Pedersen proof of equal discrete logarithms from
  [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md), made non-interactive
  with Fiat-Shamir. One proof can cover a whole batch of answers.
- **POPRF** (mode 0x02), partially oblivious. Client and server also share a
  public input, `info`, such as a date, a token type or a purpose label, and
  the output depends on it. The construction is by Nirvan Tyagi, Sofía
  Celi, Thomas Ristenpart, Nick Sullivan, Stefano Tessaro and Christopher
  Wood (EUROCRYPT 2022): the server hashes `info` to a scalar $m$ and uses
  $t = k + m$, returning $B^{1/t}$; the client checks against
  $\mathit{pk} \cdot g^m$. One key pair serves every value of `info`, so a
  service can rotate outputs daily without rotating keys.

### Why verifiability matters: the tagging server

Plain OPRF mode gives the client no way to know which key the server used. A
server that wants to track people can keep a separate key for each user, or
for one user it is interested in. Later, when an output reaches it (a
Privacy Pass token being redeemed, say), it tries each key and learns who
the output came from. The blinding is still perfect; the server has attacked
around it. In VOPRF mode the client checks every answer against the one public
key, so a tagging key is caught at once, provided everyone sees the same
public key. That last condition is a key-distribution problem, which is why
Privacy Pass deployments publish issuer keys in well-known places and rotate
them rarely.

The program below shows the check. The proof is the Chaum-Pedersen proof that
[Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) works by hand in a group of
29 elements; here it runs in the 127-bit toy group. The server answers two
users, using its published key for Ana and a second, secret key for Ben.

```python
import hashlib, random

P = 2**127 - 2721
Q = (P - 1) // 2
g = 4

def H1(x):
    d = hashlib.sha256(b"H1|" + x).digest()
    return pow(int.from_bytes(d, "big"), 2, P)

def challenge(*elems):                 # Fiat-Shamir challenge from the whole statement
    data = b"|".join(e.to_bytes(16, "big") for e in elems)
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % Q

def prove(key, B, Z):                  # Chaum-Pedersen: log_g(pk) = log_B(Z)
    t = random.randrange(1, Q)
    A1, A2 = pow(g, t, P), pow(B, t, P)
    c = challenge(g, pow(g, key, P), B, Z, A1, A2)
    return c, (t - c * key) % Q

def verify(pk, B, Z, proof):
    c, s = proof
    A1 = pow(g, s, P) * pow(pk, c, P) % P
    A2 = pow(B, s, P) * pow(Z, c, P) % P
    return c == challenge(g, pk, B, Z, A1, A2)

random.seed(8)                         # demo randomness only
key = random.randrange(1, Q)
pk = pow(g, key, P)                    # the one public key everyone should see
tag_key = random.randrange(1, Q)       # a second key the server uses to mark one user

for user, k_used in (("Ana", key), ("Ben", tag_key)):
    r = random.randrange(1, Q)
    B = pow(H1(b"some token"), r, P)
    Z = pow(B, k_used, P)
    print(user, "accepts the answer:", verify(pk, B, Z, prove(k_used, B, Z)))
```

Output:

```
Ana accepts the answer: True
Ben accepts the answer: False
```

### Every answer is a Diffie-Hellman sample

An OPRF server raises whatever it receives to its key. A client may send
anything, not only blinded hashes, so the server is a **static Diffie-Hellman
oracle**. Daniel Brown and Robert Gallant (2004) and Jung Hee Cheon (2006)
showed that such an oracle helps compute the key: with $Q$ queries the
effective security drops by up to about $\frac{1}{2}\log_2 Q$ bits, depending
on the factors of $q - 1$. A million queries cost about 10 bits. RFC 9497
discusses this, and recommends rate limits and key rotation, or a larger
group (decaf448, P-384, P-521) where the margin matters. It is also why every
OPRF service must rate-limit: online guessing is the one attack the protocol
cannot prevent, and the server's key is a static DH key in constant use.

### OPAQUE: the password never leaves the device

The best-known OPRF user is **OPAQUE**, the asymmetric password-authenticated
key exchange of Stanisław Jarecki, Hugo Krawczyk and Jiayu Xu (EUROCRYPT
2018), standardized as RFC 9807 in July 2025. The client runs the OPRF on its
password under a per-user server key, stretches the output with a slow hash,
and uses the result to open an envelope that holds its long-term key. The
server never sees the password, and a stolen server database gives an
attacker nothing to guess against offline without the OPRF key. Book 4 tells
the whole protocol and codes it: see
[Protocols, Chapter 11](../protocols/11-One-Time-Codes-and-Password-Protocols.md).
WhatsApp's end-to-end encrypted backups, launched in October 2021, use
OPAQUE with a key vault in hardware security modules to protect the backup
key.

### Privacy Pass: proving you passed a test, without saying when

In 2016 and 2017 people using Tor kept running into CAPTCHAs on sites behind
Cloudflare, because Tor exit addresses carry a lot of abusive traffic. Solve
one, move to the next site, solve another. Alex Davidson, Ian Goldberg, Nick
Sullivan, George Tankersley and Filippo Valsorda designed **Privacy Pass**
(published at PETS 2018; a browser extension from Cloudflare appeared in late
2017). After you solve one challenge, your browser obtains a batch of
tokens: it blinds random values, the issuer evaluates them with a VOPRF, and
the browser unblinds and stores them. Later, at another site, the browser
spends a token instead of solving a challenge. The issuer can check that the
token is valid, but because it never saw the unblinded value, it cannot link
the redemption to the moment of issuance. The VOPRF proof is what stops the
issuer from tagging users with per-user keys.

The IETF took the design up in 2020, separated the roles, and published three
RFCs in June 2024:

- **RFC 9576**, the architecture: a client, an *attester* that vouches for
  it (by a CAPTCHA, a device check, an account), an *issuer* that issues
  tokens, and an *origin* that accepts them, with rules on which of them
  may be the same party;
- **RFC 9577**, the HTTP authentication scheme: an origin sends a
  `PrivateToken` challenge in a `WWW-Authenticate` header and the client
  answers with a token in `Authorization`;
- **RFC 9578**, the issuance protocols: token type 0x0001 is a VOPRF on P-384
  with SHA-384 (the issuer, holding the private key, is the only one who can
  verify the token), and type 0x0002 is a blind RSA signature (RFC 9474), which
  anyone holding the public key can verify. Blind signatures are
  [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)'s subject.

The largest deployment so far uses the second type: Apple's Private Access
Tokens (iOS 16 and macOS Ventura, 2022), where the device attests that it is
a genuine Apple device in good standing and Cloudflare or Fastly issue
tokens, so sites can skip CAPTCHAs for those users. Google's Private State
Tokens in Chrome use a closely related VOPRF-based issuance. Apple's Live Caller ID Lookup
(§11.12) uses Privacy Pass tokens to authenticate its anonymous queries.

!!! note "Life story: Privacy Pass"
    **Born:** 2017, Alex Davidson, Ian Goldberg, Nick Sullivan, George
    Tankersley and Filippo Valsorda (Cloudflare extension 2017; PETS 2018) ·
    **Purpose:** let someone who passed a check once prove it later without
    being linked to the first time; first used to spare Tor users endless
    CAPTCHAs · **Helped:** Apple's Private Access Tokens (2022), Chrome's
    Private State Tokens, anonymous authentication for Apple's Live Caller
    ID Lookup · **Status:** current; standardized in June 2024 as RFC 9576
    (architecture), RFC 9577 (HTTP scheme) and RFC 9578 (issuance, VOPRF
    and blind RSA token types)

## 11.7 Password breach checks

*Level: intermediate.*

Credential stuffing is the most common way accounts are taken over:
attackers take username and password pairs from one breach and try them on
every other service, because people reuse passwords. The defense is to tell a
user that their password is in a breach before an attacker uses it. That
needs a lookup in a list of billions of leaked passwords, and the list is
held by someone else. Sending the password, or its unsalted hash, to that
someone is exactly the mistake §11.2 showed. Two designs from 2018 and 2019
show two levels of answer.

### Have I Been Pwned: k-anonymity by prefix

Troy Hunt, an Australian security researcher, started Have I Been Pwned in
December 2013 as a site where you could type an email address and see which
breaches contained it. In August 2017 he added **Pwned Passwords**: a
downloadable list of SHA-1 hashes of passwords from breaches, more than 300
million at first. Organizations could check new passwords against it, as
NIST's then-new guidance on passwords (SP 800-63B, June 2017) recommended. An
online API existed too, but it took a whole hash, which brought back the
problem of trusting the receiver.

Version 2 arrived on 21 February 2018 with 501,636,842 passwords and a new
API designed with Junade Ali at Cloudflare. The client computes the SHA-1 of
the password, a 40-hex-digit string, and sends only the first **five** hex
digits to the `range` endpoint. The server returns every suffix in its list
that starts with those five digits, with a count for each. The client looks
for its own 35-digit suffix in the reply. The server sees the prefix and
nothing else.

Five hex digits give $16^5 = 1{,}048{,}576$ possible prefixes. With 501.6
million hashes spread evenly, each prefix covers about $501{,}636{,}842 /
1{,}048{,}576 \approx 478$ passwords. Whatever password you checked, the
server knows only that it is one of about 478 leaked passwords, or one of the
astronomically many unleaked passwords that share the prefix. That is
**k-anonymity**, a term from Pierangela Samarati and Latanya Sweeney's 1998
work on anonymizing records: each query hides among at least $k$ others. The
idea is simple enough that it spread fast: password managers such as
1Password, Firefox's breach alerts and many sign-up pages call the range API,
and Cloudflare serves it from cache. In 2020 an optional padding mode was
added that fills each reply with random fake entries, so the size of the
response no longer hints at the prefix. The list has grown with every
update since, toward a billion distinct passwords; in 2021 the FBI began
contributing passwords it recovers in investigations. Figure 11.4 shows one
query.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A k-anonymity range query: the client hashes its password with SHA-1, sends the first five hex digits, receives about 478 suffixes and checks its own suffix locally" fill="currentColor" font-size="14">
<rect x="10" y="10" width="230" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="125" y="32" text-anchor="middle" font-weight="bold">Client</text>
<text x="125" y="52" text-anchor="middle">SHA-1(password) =</text>
<text x="125" y="68" text-anchor="middle">5BAA6 | 1E4C9B93F3F...</text>
<rect x="400" y="10" width="230" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="515" y="32" text-anchor="middle" font-weight="bold">Range server</text>
<text x="515" y="52" text-anchor="middle">about a billion SHA-1</text>
<text x="515" y="68" text-anchor="middle">hashes, by prefix</text>
<line x1="125" y1="74" x2="125" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="515" y1="74" x2="515" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="125" y1="120" x2="507" y2="120" stroke="currentColor" stroke-width="1.6"/>
<polygon points="515,120 507,116 507,124"/>
<text x="320" y="110" text-anchor="middle">GET /range/5BAA6</text>
<line x1="515" y1="175" x2="133" y2="175" stroke="currentColor" stroke-width="1.6"/>
<polygon points="125,175 133,171 133,179"/>
<text x="320" y="165" text-anchor="middle">every suffix with that prefix (about 478 in 2018)</text>
<text x="135" y="215">client looks for 1E4C9B93F3F... in the list</text>
<text x="135" y="240">found, with a count: the password is in a breach</text>
<text x="135" y="275" opacity="0.8">the server saw 5 of 40 hex digits: 20 bits of the hash</text>
</svg>
<figcaption>Figure 11.4. A range query in the style of Have I Been Pwned. The prefix shown is the real SHA-1 prefix of "password"; the server returns its whole bucket and the match happens on the client.</figcaption>
</figure>

### Code it: a range query on a made-up list

The program builds a made-up corpus of 6,000 "leaked" passwords and a range
server over it. With 6,000 entries a five-digit prefix would leave most
buckets empty, so the demo sends two hex digits (256 buckets of about 23
each), which gives about the same bucket size relative to the list as the
real service's five digits gave in 2018.

```python
import hashlib, random

def sha1(pw):
    return hashlib.sha1(pw.encode()).hexdigest().upper()

# A made-up "breach corpus" of 6,000 passwords (real: about a billion).
random.seed(1)                         # demo data only
words = ["sun", "moon", "red", "dust", "mars", "rover", "crater", "dome",
         "olympus", "arcadia", "valley", "ice", "storm", "rocket", "orbit"]
leaked = {"password", "123456", "qwerty", "letmein", "sunshine1"}
while len(leaked) < 6000:
    leaked.add(random.choice(words) + random.choice(words) + str(random.randrange(1000)))

PREFIX = 2                             # hex digits sent (HIBP sends 5 of 40)
server = {}
for pw in leaked:
    d = sha1(pw)
    server.setdefault(d[:PREFIX], []).append(d[PREFIX:])

def range_query(prefix):               # all the server ever sees is the prefix
    return server.get(prefix, [])

def is_pwned(pw):
    d = sha1(pw)
    bucket = range_query(d[:PREFIX])
    return d[PREFIX:] in bucket, d[:PREFIX], len(bucket)

for pw in ["sunshine1", "roverarcadia219", "correct horse battery staple"]:
    hit, prefix, size = is_pwned(pw)
    print("%-30s prefix %s  bucket of %2d  pwned: %s" % (pw, prefix, size, hit))
```

Output:

```
sunshine1                      prefix 08  bucket of 24  pwned: True
roverarcadia219                prefix FA  bucket of 23  pwned: True
correct horse battery staple   prefix AB  bucket of 21  pwned: False
```

### Break it: what the prefix gives away

Twenty bits of a hash is not nothing. Against a random password it is
harmless, but people do not choose random passwords, and the server, or anyone
who watches its traffic, may know something about the person asking. Lucy Li,
Bijeeta Pal, Junade Ali, Nick Sullivan, Rahul Chatterjee and Thomas Ristenpart
studied this in "Protocols for Checking Compromised Credentials" (ACM CCS
2019). They showed that a hash prefix, combined with a guessing attack that
uses the victim's other leaked passwords, makes targeted guessing markedly
more successful, and they proposed bucketing schemes that leak less.

The program shows the core of the problem. A curious server sees one range
query. It has a dictionary of 1,620 guesses built from what it knows about the
user's habits (pet names and years). The prefix leaves one.

```python
import hashlib

def sha1(pw):
    return hashlib.sha1(pw.encode()).hexdigest().upper()

# What a curious server can do with one range query: it saw the prefix,
# and it knows the victim's habits (pets, places, years).
seen_prefix = sha1("biscuit2019")[:5]          # the victim's real query, 5 hex digits as in HIBP
dictionary = [pet + str(year) for pet in
              ["biscuit", "rex", "luna", "max", "bella", "coco", "milo", "daisy"]
              for year in range(1900, 2100)]
dictionary += [w + s for w in ["password", "letmein", "dragon", "monkey"]
               for s in ["", "1", "123", "!", "2024"]]
candidates = [g for g in dictionary if sha1(g)[:5] == seen_prefix]
print("guesses before the query:", len(dictionary))
print("guesses that fit the prefix:", candidates)
```

Output:

```
guesses before the query: 1620
guesses that fit the prefix: ['biscuit2019']
```

A 20-bit prefix divides any dictionary by about a million. For a dictionary
of the world's leaked passwords that still leaves hundreds; for a dictionary
tailored to one person it usually leaves one. HIBP's design is honest about
this: it protects the user from a server that wants to collect passwords in
bulk, not from a targeted attacker who already knows who is asking. The
answer to that is to stop sending anything derived from the password alone.

### Google Password Checkup: blinded, and keyed to the username

Google's design, launched as a Chrome extension called Password Checkup on 5
February 2019 and described by Kurt Thomas, Jennifer Pullman, Kevin Yeo and
colleagues at Google with Dan Boneh and Elie Bursztein of Stanford in
"Protecting accounts from credential stuffing with password breach alerting"
(USENIX Security 2019), changes three things.

1. **It checks pairs, not passwords.** A password alone is weak evidence:
   `123456` is in every breach. Google checks whether this *username and
   password together* appeared in a breach, against a list of about 4
   billion such pairs.
2. **The bucket comes from the username only.** The client sends a short
   prefix (two bytes in the paper) of a hash of the username. The server
   learns nothing that depends on the password. Two bytes give 65,536
   buckets, so on average a bucket holds about $4 \times 10^9 / 65{,}536
   \approx 61{,}000$ leaked pairs.
3. **The comparison is blinded, as in DH-PSI.** The client computes a
   deliberately slow, memory-hard hash $h$ of the username and password,
   picks a secret exponent $a$, and sends $h^a$. The server holds its own
   key $b$. It returns $h^{ab}$, and it returns its bucket as the values
   $h_j^{\,b}$ for every leaked pair $j$ whose username falls in that
   bucket. The client removes its exponent, $(h^{ab})^{1/a} = h^b$, and
   checks whether $h^b$ is in the bucket.

The server never sees the password, the pair or even its hash; the client
never sees the leaked pairs, only their keyed hashes, which it cannot test
guesses against without $b$; the slow hash makes even online guessing
expensive. In the first month, roughly 670,000 people installed the
extension; it checked 21 million logins and flagged about 316,000 of them,
1.5 percent, as matching a breach, and about a quarter of the warnings led
users to change the password. Later in 2019 the check moved into Chrome
itself and into the password tools of Google accounts. A 2023 paper by Andrew
Kwong and colleagues (USENIX Security 2023) found a cache side channel in
Chrome's implementation of the client's hash that could leak information
about the password to a local attacker; Google said it would change the hash.
The protocol held; an implementation detail did not.

Apple's Password Monitoring (iOS 14, 2020) and Microsoft Edge's Password
Monitor (2021) use the same family of ideas. Apple's device sends a 15-bit
prefix of a hash for bucketing plus a blinded value, and compares on its own
side; Edge runs the credential through an OPRF so a client cannot use the
service as a dictionary oracle, then fetches the answer with homomorphic
encryption.

!!! note "Life story: Pwned Passwords"
    **Born:** August 2017 as a downloadable hash list, Troy Hunt; the
    k-anonymity range API on 21 February 2018, with Junade Ali of Cloudflare
    (501,636,842 passwords) · **Purpose:** let anyone check a password
    against breach data without sending the password or its full hash ·
    **Helped:** password managers, browser breach alerts, sign-up pages
    following SP 800-63B's advice to refuse known-breached passwords ·
    **Status:** current, free and open source; padded responses since 2020;
    leaks a 20-bit hash prefix, which matters against targeted guessing

!!! note "Life story: Google Password Checkup"
    **Born:** 5 February 2019, a Chrome extension from Google, with the
    protocol by Thomas, Pullman, Yeo and others with Boneh and Bursztein
    (USENIX Security 2019) · **Purpose:** warn when a username and password
    pair appears among about 4 billion leaked pairs, without Google learning
    the password · **Helped:** built into Chrome and Google accounts later in
    2019 · **Status:**
    current; username-only bucketing plus blinded DH matching; a 2023 side
    channel in Chrome's client hash was reported to Google in 2023

## 11.8 Apple's CSAM detection design (2021)

*Level: intermediate.*

On 5 August 2021 Apple announced three child-safety features for iOS 15. Two
were uncontroversial or mildly so: warnings in Siri and Search, and an opt-in
"communication safety" feature in Messages that blurs sexually explicit images
on children's accounts, using on-device classification (it later shipped).
The third was a system to detect known child sexual abuse material (CSAM) in
photos being uploaded to iCloud Photos, and it is the most elaborate public
deployment design for PSI there has been. It is also one that was never
deployed, and it is worth telling carefully, because both its designers and its
critics were serious people making serious arguments.

### What it was meant to do

US law requires providers that become aware of CSAM on their services to
report it to the National Center for Missing and Exploited Children (NCMEC).
Most large cloud services find it by scanning stored images on their servers
against databases of fingerprints of known material, using perceptual hashes
such as Microsoft's PhotoDNA. Apple's servers could not scan photos it
intended to protect with end-to-end encryption, and Apple said it did not want
to scan every photo in the cloud in the clear. It wanted a system with three
properties:

- Apple learns nothing about images that do not match the known database;
- Apple learns nothing even about matching images until an account crosses a
  threshold number of matches;
- the device does not learn whether any of its images matched, so the
  database cannot be probed from a phone.

### How it worked

The design, set out in Apple's technical summary and in "The Apple PSI
System" (Abhishek Bhowmick, Dan Boneh, Steve Myers, Kunal Talwar and Karl
Tarbe, July 2021), had four layers.

1. **NeuralHash.** A neural network turns each photo into a 96-bit
   perceptual hash, designed so that resized, recompressed or slightly
   cropped copies of an image get the same hash. Unlike a cryptographic hash,
   similar inputs are *meant* to collide.
2. **A blinded database on every device.** Apple took the hashes of known
   images supplied by child-safety organizations, mapped each to an
   elliptic-curve point $H(u)$, multiplied it by a secret server key
   $\alpha$, and arranged the blinded points $\alpha H(u)$ in a table whose
   positions were set by another hash of $u$. That table shipped inside the
   operating system. The device could not read it: without $\alpha$ the
   entries are random-looking points.
3. **Safety vouchers.** For each photo uploaded, the device computed the
   photo's NeuralHash $u'$, found the table position for $u'$, read the
   blinded point $P$ there, picked a random $\beta$, and sent $Q = \beta
   H(u')$ together with a payload encrypted under a key derived from
   $\beta P$. On the server, Apple computed $\alpha Q = \alpha\beta H(u')$.
   If $u'$ was the database entry at that position, then $P = \alpha
   H(u')$ and $\alpha Q = \beta P$: the server derived the same key and
   could open the outer layer. If not, the two keys were unrelated and the
   payload stayed sealed. This is the commutativity of §11.3 again, now on a
   curve and used to protect a payload rather than to compare.
4. **Threshold secret sharing.** Inside each outer layer was one Shamir
   share ([Chapter 2](02-Secret-Sharing.md)) of a per-account key, and an
   inner layer, encrypted under that account key, holding a low-resolution
   "visual derivative" of the photo. Only when the server had opened at
   least $t$ outer layers could it rebuild the account key and see anything.
   Apple later said the threshold would start at 30 matches. To keep the
   server from counting matches below the threshold, devices also sent
   **synthetic vouchers**, which opened at the outer layer but carried
   meaningless shares.

Past the threshold, a second, independent perceptual hash on Apple's servers
was to check the derivatives, then human reviewers, and only then a report to
NCMEC. Apple estimated the chance of an account being wrongly flagged at less
than one in a trillion per year. Figure 11.5 shows the pipeline.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Apple's 2021 CSAM detection pipeline: on the device a photo is hashed with NeuralHash and wrapped in a safety voucher using a blinded database; on the server vouchers open only on a match, and only past a threshold of 30 can the inner layer be read, followed by human review" fill="currentColor" font-size="14">
<text x="160" y="20" text-anchor="middle" font-weight="bold">On the phone</text>
<text x="480" y="20" text-anchor="middle" font-weight="bold">At Apple</text>
<line x1="320" y1="10" x2="320" y2="320" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<rect x="20" y="40" width="270" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155" y="63" text-anchor="middle">photo to upload: NeuralHash u'</text>
<rect x="20" y="100" width="270" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155" y="123" text-anchor="middle">look up blinded table: P</text>
<rect x="20" y="160" width="270" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155" y="183" text-anchor="middle">voucher: Q = βH(u'), payload</text>
<text x="155" y="205" text-anchor="middle">under key from βP</text>
<line x1="155" y1="76" x2="155" y2="98" stroke="currentColor" stroke-width="1.4"/>
<polygon points="155,100 151,92 159,92"/>
<line x1="155" y1="136" x2="155" y2="158" stroke="currentColor" stroke-width="1.4"/>
<polygon points="155,160 151,152 159,152"/>
<line x1="290" y1="190" x2="348" y2="190" stroke="currentColor" stroke-width="1.6"/>
<polygon points="350,190 342,186 342,194"/>
<rect x="350" y="160" width="270" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="485" y="183" text-anchor="middle">αQ equals βP only on a match:</text>
<text x="485" y="205" text-anchor="middle">outer layer opens, one share</text>
<rect x="350" y="240" width="270" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="485" y="263" text-anchor="middle">30 shares: inner layers open</text>
<line x1="485" y1="220" x2="485" y2="238" stroke="currentColor" stroke-width="1.4"/>
<polygon points="485,240 481,232 489,232"/>
<text x="485" y="305" text-anchor="middle">second hash, human review, report</text>
<line x1="485" y1="276" x2="485" y2="290" stroke="currentColor" stroke-width="1.4"/>
<text x="155" y="260" text-anchor="middle" opacity="0.8">synthetic vouchers hide</text>
<text x="155" y="280" text-anchor="middle" opacity="0.8">how many real matches</text>
<text x="155" y="300" text-anchor="middle" opacity="0.8">exist below the threshold</text>
</svg>
<figcaption>Figure 11.5. The 2021 design in outline. The cryptography (blinded matching, threshold sharing, synthetic vouchers) did what it promised; the debate was about NeuralHash, the database and the precedent.</figcaption>
</figure>

### The objections

Within days, cryptographers, security researchers and civil-liberties groups
raised objections, which fell into three groups.

**The hash.** On about 17 to 18 August 2021, a developer extracted an
earlier version of the NeuralHash model from iOS 14.3, where it had been
present since late 2020, converted it to a standard format and published it.
Within hours others had produced **collisions**: pairs of unrelated images
with the same hash, and, soon after, innocent-looking images crafted to
collide with any target hash. A perceptual hash has to tolerate small
changes, and a neural network can be pushed by small, invisible changes;
this is the adversarial-example problem well known from machine learning.
The worry was twofold. Someone could flood the system with harmless images
that collide with database entries, or plant colliding images in a target's
library to push them over the threshold. Apple replied that the extracted
model was a generic earlier version, that the server-side second hash
(which an attacker could not run) would discard such false matches, and that
human review would catch anything that got through. Those answers are
reasonable, and they also concede the point: the on-device hash on its own
was not robust against deliberate attack.

**The database.** Nobody outside Apple and the child-safety organizations
could see what the hashes stood for; that is inherent, since the images are
illegal to possess. The cryptography ensured that users learned nothing
about the database, which also meant they could not check it. Apple's
answers were procedural: the database would be the intersection of lists
from at least two organizations in different countries, the same for all
users, built into the operating system, with a published root hash that
auditors could compare.

**The precedent.** The deepest objection had nothing to do with the
cryptography. Once a phone checks its owner's files against a list supplied
from outside, the list can change. A government could demand that images of
a protest, a banned symbol or a leaked document be added, and the system
would report them as faithfully as it reported abuse material. Apple said it
would refuse such demands. In October 2021 fourteen prominent security
researchers, among them Hal Abelson, Ross Anderson, Steven Bellovin, Josh
Benaloh, Matt Blaze, Whitfield Diffie, Susan Landau, Ronald Rivest, Bruce
Schneier and Carmela Troncoso, published "Bugs in Our Pockets: The Risks of
Client-Side Scanning," arguing that any client-side scanning system creates
these risks whatever its cryptography, because the scanning moves onto the
device that people rely on to keep their secrets.

### What happened

On 3 September 2021 Apple said it would take more time to collect input and
make improvements before releasing the feature. On 7 December 2022, alongside
the launch of Advanced Data Protection (optional end-to-end encryption for
most iCloud data, including Photos), Apple said it would not go ahead with
the CSAM detection tool and would focus on communication safety features
instead. In 2023, answering a child-safety group that asked it to revive the
plan, Apple wrote that scanning every user's privately stored iCloud data
would create new avenues for data thieves and could lead to bulk surveillance.
The debate it started has continued elsewhere, notably in the European
Union's proposed regulation on child sexual abuse, which has been argued over
since 2022.

Two things are true at once. The cryptographic core worked as specified:
blinded matching, threshold secret sharing and synthetic vouchers gave the
server no information below the threshold and gave the device no information
at all, and independent reviews of the protocol, by Mihir Bellare, Benny
Pinkas and others, found it sound. And the system as a whole failed in
public on the parts the cryptography could not cover: an on-device
perceptual hash that could be attacked, a list nobody could inspect, and a
capability whose limits rested on a company's promise. PSI hides everything
except the answer. Whoever writes the question decides what the answer
reveals.

!!! note "Life story: Apple's CSAM detection design"
    **Born:** announced 5 August 2021 by Apple for iOS 15; protocol in "The
    Apple PSI System" (Bhowmick, Boneh, Myers, Talwar, Tarbe, 2021) ·
    **Purpose:** detect known child sexual abuse images uploaded to iCloud
    Photos while learning nothing about other images, or about matches below
    a threshold of 30 · **Helped:** never deployed; its design (PSI with
    associated data, threshold sharing, synthetic vouchers) remains the
    most detailed public proposal for private matching at scale, and its
    reception shaped the client-side scanning debate · **Retired:** paused 3
    September 2021, abandoned 7 December 2022 · **Replaced by:** nothing
    equivalent; Apple shipped communication safety in Messages and
    end-to-end encrypted iCloud Photos (Advanced Data Protection)

## 11.9 Signal's private contact discovery

*Level: intermediate.*

Signal returned to Marlinspike's 2014 problem three years later with a
different tool. On 26 September 2017 it announced a technology preview of
private contact discovery built on **Intel SGX** (Software Guard
Extensions), a processor feature that runs code in an *enclave*: a region of
memory encrypted by the CPU, which even the operating system and the machine's
owner cannot read or alter. The argument went: if the cryptographic answers
were too slow for a billion-row set, let the server's own hardware keep the
server from looking.

### How it works

<div class="mars-steps" markdown>

1. Signal publishes the source of the enclave program, built reproducibly,
   so anyone can compute its expected measurement (a hash of the code).
2. The phone connects to the contact discovery service and asks the enclave
   for a **remote attestation**: a statement signed with a key rooted in
   Intel's hardware, saying "this exact code, with this measurement, is
   running in a genuine SGX enclave."
3. The phone checks the measurement against the published one and sets up an
   encrypted channel that terminates *inside* the enclave. The operating
   system and Signal's administrators see only ciphertext.
4. The phone sends its contacts' numbers (hashed, which here is only an
   encoding) over that channel. The enclave compares them with the list of
   registered users and returns the matches, then forgets the request.

</div>

The hard part was a property SGX does not give: **access-pattern privacy**.
The enclave's memory is encrypted, but the host sees which memory pages, and
with care which cache lines, the enclave touches. A hash-table lookup for a
number touches a location that depends on the number, so the host can learn
the query from the pattern even though it cannot read the data. Signal's 2017
design made the enclave **oblivious**: for a batch of requests from many
users, it scanned the whole registered-user list in a fixed order with
branch-free comparisons, so the memory trace was the same whatever was asked.
That is a linear scan per batch, which is affordable because many users'
requests share one scan. In the early 2020s Signal rebuilt the service, now
called CDSI, on newer server processors with much larger enclave memory,
replacing the linear scan with an oblivious hash-table design that scales
better.

### What it trusts

The privacy now rests on Intel: on the hardware keeping enclave memory
encrypted and isolated, on the attestation keys staying secret, and on
microcode updates arriving when flaws are found. They have been found
repeatedly. Foreshadow (2018) read enclave memory through speculative
execution, Plundervolt (2019) faulted enclave computations by undervolting,
and SGAxe (2020) extracted attestation keys; each was patched, and
[Chapter 10](10-Multi-Party-Computation-in-Practice.md) tells those stories.
The enclave program itself can have bugs: researchers at the security firm
V12 later reported two concurrency flaws in CDSI's enclave code, a race and
a time-of-check-to-time-of-use error, that a malicious host could have used
to extract the enclave's channel key; Signal fixed them on the server side.
An enclave turns "trust Signal" into "trust Intel's hardware and Signal's
published code," which is a real improvement over uploading address books in
the clear, and is not the same as trusting mathematics.

Signal also had to deal with the front-door attack of §11.2. After the
NDSS 2021 study it tightened its rate limits on contact queries. In February
2024 it added usernames and an option under which nobody can find you by your
phone number at all, which removes that number from the set being matched.

!!! note "Life story: Signal's private contact discovery"
    **Born:** essay on the problem January 2014 (Moxie Marlinspike);
    SGX-based service previewed 26 September 2017 · **Purpose:** let a phone
    learn which contacts use Signal without Signal learning the address
    book · **Helped:** the first large public deployment of
    remote-attested enclaves for user privacy; an influence on later
    enclave services elsewhere · **Status:** current, rebuilt as CDSI for
    newer processors; rate-limited after the 2021 enumeration study; since
    2024 users can opt out of being discoverable by number

## 11.10 Private information retrieval with two servers

*Level: intermediate.*

PSI and OPRFs compare sets. Sometimes there is nothing to compare: you want
one record from a database, the database is not secret, and the only secret is
which record you want. A patent examiner's searches reveal what a company is
about to file. A query to a medical reference reveals a diagnosis. A lookup of
an incoming phone number reveals who is calling you. **Private information
retrieval** asks the server for record $i$ without telling it $i$.

There is always a trivial answer: **download everything**. If the database
has $n$ records, fetch all $n$ and look up record $i$ locally. The server
learns nothing. For a static list of a few megabytes this is the right
answer, and many systems should simply do it. It stops working when the
database is large, changes often, or belongs to someone who will not hand it
over whole.

In 1995 Benny Chor, Oded Goldreich, Eyal Kushilevitz and Madhu Sudan defined
the problem formally (FOCS 1995; *Journal of the ACM*, 1998) and proved a
discouraging fact: with one server and privacy against an all-powerful
server, nothing beats the trivial download. Any such scheme must send at
least $n$ bits. Then they showed a way out. If the same database is held by
two servers that do not talk to each other, the client can do much better,
with privacy that needs no assumption at all.

### The XOR trick, by hand

Treat the database as $n$ bits $D_1, \dots, D_n$. The client wants $D_i$.

<div class="mars-steps" markdown>

1. The client picks a uniformly random subset $S$ of the positions
   $\{1, \dots, n\}$, and forms $S' = S \oplus \{i\}$: the same subset with
   position $i$ added if it was missing, removed if it was there.
2. It sends $S$ to server 1 and $S'$ to server 2.
3. Each server returns the XOR of the bits at the positions it was given.
4. The client XORs the two answers.

</div>

Take $n = 8$ and $D = 1\,0\,1\,1\,0\,0\,1\,0$ (positions 1 to 8). The client
wants $D_3$. It picks $S = \{1, 4, 5, 7\}$, so $S' = \{1, 3, 4, 5, 7\}$.

- Server 1: $D_1 \oplus D_4 \oplus D_5 \oplus D_7 = 1 \oplus 1 \oplus 0 \oplus
  1 = 1$.
- Server 2: $D_1 \oplus D_3 \oplus D_4 \oplus D_5 \oplus D_7 = 1 \oplus 1
  \oplus 1 \oplus 0 \oplus 1 = 0$.
- Client: $1 \oplus 0 = 1$, and indeed $D_3 = 1$.

**Why it is correct.** Every position other than $i$ is in both sets or in
neither, so it appears in the two answers an even number of times in total
and cancels. Position $i$ is in exactly one set, so it survives:

$$
\bigoplus_{j \in S} D_j \;\oplus\; \bigoplus_{j \in S'} D_j = D_i .
$$

**Why it is private.** $S$ is a uniformly random subset, so server 1 sees a
uniformly random subset. $S'$ is a uniformly random subset XORed with a fixed
one, which is again a uniformly random subset, so server 2 also sees a
uniformly random subset. Neither server's view depends on $i$ at all. This is
the one-time pad of book 1's
[Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) wearing a
different coat, and like the one-time pad its privacy is perfect, against any
amount of computing.

Figure 11.6 draws the exchange.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two-server XOR PIR: the client sends a random subset to server 1 and the same subset with position 3 flipped to server 2; the XOR of their one-bit answers is record 3" fill="currentColor" font-size="14">
<rect x="235" y="10" width="170" height="54" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="32" text-anchor="middle" font-weight="bold">Client</text>
<text x="320" y="52" text-anchor="middle">wants D3</text>
<rect x="20" y="200" width="200" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="222" text-anchor="middle" font-weight="bold">Server 1</text>
<text x="120" y="242" text-anchor="middle">D = 1 0 1 1 0 0 1 0</text>
<rect x="420" y="200" width="200" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="222" text-anchor="middle" font-weight="bold">Server 2</text>
<text x="520" y="242" text-anchor="middle">D = 1 0 1 1 0 0 1 0</text>
<line x1="270" y1="64" x2="128" y2="196" stroke="currentColor" stroke-width="1.6"/>
<polygon points="124,200 128,191 134,197"/>
<text x="110" y="110" text-anchor="middle">S = {1, 4, 5, 7}</text>
<text x="110" y="160" text-anchor="middle">answer: 1</text>
<line x1="370" y1="64" x2="512" y2="196" stroke="currentColor" stroke-width="1.6"/>
<polygon points="516,200 506,197 512,191"/>
<text x="530" y="110" text-anchor="middle">S' = {1, 3, 4, 5, 7}</text>
<text x="530" y="160" text-anchor="middle">answer: 0</text>
<text x="320" y="110" text-anchor="middle">1 XOR 0 = 1 = D3</text>
<text x="320" y="292" text-anchor="middle" opacity="0.8">each server alone sees a uniformly random subset; together they see position 3</text>
</svg>
<figcaption>Figure 11.6. Two-server XOR PIR with the numbers worked above. Privacy holds as long as the two servers do not compare queries.</figcaption>
</figure>

### Code it: two-server XOR PIR

The program replays the hand example and then retrieves an 8-byte record from
a 16-record registry. Records of many bytes work the same way: XOR whole
records instead of bits.

```python
import random

# By hand first: 8 one-bit records, the client wants record 3.
D = [1, 0, 1, 1, 0, 0, 1, 0]           # positions 1..8
S1 = {1, 4, 5, 7}                      # random subset, sent to server 1
S2 = S1 ^ {3}                          # same subset with 3 flipped, sent to server 2
a1 = a2 = 0
for i in S1: a1 ^= D[i - 1]
for i in S2: a2 ^= D[i - 1]
print("by hand: S2 =", sorted(S2), " answers", a1, a2, " record 3 =", a1 ^ a2)

# Now records of 8 bytes: a made-up registry of 16 drug entries.
names = ["aspirin", "insulin", "heparin", "codeine", "digoxin", "warfarin",
         "lithium", "atropine", "morphine", "naloxone", "ketamine", "propofol",
         "lidocaine", "diazepam", "albuterol", "ibuprofen"]
db = [n.ljust(8)[:8].encode() for n in names]

def answer(db, bits):                  # what each server does: XOR the chosen records
    out = bytes(8)
    for rec, b in zip(db, bits):
        if b:
            out = bytes(x ^ y for x, y in zip(out, rec))
    return out

random.seed(4)                         # demo randomness only
want = 9                               # 0-based: "naloxone"
q1 = [random.randrange(2) for _ in db] # uniformly random bit vector
q2 = q1[:]
q2[want] ^= 1                          # differs from q1 only at the wanted index
r = bytes(x ^ y for x, y in zip(answer(db, q1), answer(db, q2)))
print("query to server 1:", "".join(map(str, q1)))
print("query to server 2:", "".join(map(str, q2)))
print("record:", r.decode())
```

Output:

```
by hand: S2 = [1, 3, 4, 5, 7]  answers 1 0  record 3 = 1
query to server 1: 0101100001100110
query to server 2: 0101100000100110
record: naloxone
```

### Break it: servers that talk

Everything rests on the two servers not comparing notes. If they do, the
queries differ in exactly one position, and that position is the record.

```python
q1 = "0101100001100110"                # what server 1 saw
q2 = "0101100000100110"                # what server 2 saw
# If the two servers compare notes, the queries differ in exactly one place.
print("colluding servers learn the index:", [i for i in range(16) if q1[i] != q2[i]])
```

Output:

```
colluding servers learn the index: [9]
```

The non-collusion assumption is the price of perfect privacy. It is
reasonable when the servers belong to organizations with different
interests, in different jurisdictions, and it is the same kind of assumption
that two-party MPC with a helper, or a mix network, makes. Schemes for $k$
servers tolerate up to $t < k$ colluding ones, at higher cost.

**The cost.** The query is $n$ bits to each server and the answer is one
record from each, so communication is about $2n$ bits, which for one-bit
records is no better than downloading. Arranging the database as a
$\sqrt{n} \times \sqrt{n}$ square and fetching a whole column cuts the query
to $\sqrt{n}$ bits per server. Chor and colleagues gave a two-server scheme
with $O(n^{1/3})$ communication, and later work (Zeev Dvir and Sivakanth
Gopi, 2015, building on Sergey Yekhanin's locally decodable codes) brought it
below any fixed power of $n$. Computation is another matter: each server
still touches every record for every query.

That last point is not an accident of these schemes. Amos Beimel, Yuval Ishai
and Tal Malkin (2000) proved that in any PIR scheme without preprocessing,
the servers together must read essentially the whole database for each query:
a record the server does not touch is a record it knows was not requested.
PIR costs at least a full pass over the data, and the art is in making that
pass cheap.

### Mars: a pharmacology lookup across the gap

The clinic in Arcadia City consults Earth's drug-interaction registry, which
updates daily. Which drugs a settlement of a few thousand people asks about
says a great deal about who is ill and with what. The first answer is the
trivial one: mirror the registry in Arcadia and look up locally, which is
perfect privacy and also the only way to get answers without a round trip of
8 to 48 minutes. When the registry is too large or changes too fast to
mirror, the clinic can query two copies, one held by the registry on Earth
and one at a relay operated by a different authority, with two-server PIR;
each sees a random-looking subset and the clinic gets its row. The
assumption it makes is political rather than mathematical: that the two
operators will not pool their logs.

!!! note "Life story: private information retrieval"
    **Born:** 1995, Benny Chor, Oded Goldreich, Eyal Kushilevitz and Madhu
    Sudan (FOCS 1995; *Journal of the ACM* 1998), with the two-server XOR
    scheme and the proof that one information-theoretic server must send
    everything · **Purpose:** fetch a record without revealing which ·
    **Helped:** a large theory of multi-server PIR and locally decodable
    codes; the single-server line from 1997 on; deployed lookups for
    caller ID, password checks and certificate status in the 2020s ·
    **Status:** current; multi-server PIR is used where independent
    operators exist, single-server lattice PIR where they do not

## 11.11 Single-server PIR from quadratic residues

*Level: intermediate.*

One server cannot beat the trivial download if it has unlimited power. But a
server limited to feasible computation can be fooled with encryption. In 1997
Eyal Kushilevitz and Rafail Ostrovsky showed how, in a paper whose title made
the point: "Replication is not needed: single database,
computationally-private information retrieval" (FOCS 1997).

### Quadratic residues, by hand

Their scheme uses the **quadratic residuosity** assumption: for $N = pq$, a
product of two secret primes, it is believed hard to tell squares mod $N$
from those non-squares whose Jacobi symbol is $+1$ (non-squares mod both $p$
and $q$), unless you know $p$ and $q$. With $p$ and $q$, Euler's criterion
decides it at once: $z$ is a square mod $p$ exactly when $z^{(p-1)/2} \equiv 1
\pmod p$.

Lay the database out as a table of bits with $s$ rows and $t$ columns. The
client, which knows $p$ and $q$, wants a bit in column $j$. It sends one
number per column: a random **non-square** $y_j$ for column $j$ and random
**squares** for all the others. For each row, the server multiplies one
factor per column, $y_c$ where the bit is 1 and $y_c^2$ where it is 0:

$$
z_r = \prod_{c = 1}^{t} \begin{cases} y_c & \text{if } M_{r,c} = 1 \\ y_c^2 & \text{if } M_{r,c} = 0 \end{cases}
$$

Every factor is a square except possibly the one from column $j$, which is a
non-square exactly when $M_{r,j} = 1$. So $z_r$ is a square if and only if
$M_{r,j} = 0$. The client tests each $z_r$ and reads off column $j$. The
server, unable to tell squares from non-squares, cannot tell which column
held the non-square.

Take $N = 77 = 7 \cdot 11$ and the table

$$
M = \begin{pmatrix} 1 & 0 & 1 \\ 0 & 1 & 1 \end{pmatrix},
$$

and let the client want column 1. It needs a number that is a non-square mod
7 and mod 11: the non-squares mod 7 are 3, 5, 6 and mod 11 are 2, 6, 7, 8,
10, and 24 is 3 mod 7 and 2 mod 11, so $y_1 = 24$. For the other columns it
sends squares: $y_2 = 71$ (which is $15^2 \bmod 77$) and $y_3 = 4$.

- Row 1, bits $1, 0, 1$: $z_1 = 24 \cdot 71^2 \cdot 4$. Since $71^2 \equiv 36$,
  this is $24 \cdot 36 \cdot 4$; $24 \cdot 36 = 864 \equiv 17$ and $17
  \cdot 4 = 68$. So $z_1 = 68$.
- Row 2, bits $0, 1, 1$: $z_2 = 24^2 \cdot 71 \cdot 4 \equiv 37 \cdot 71
  \cdot 4$; $37 \cdot 71 = 2627 \equiv 9$ and $9 \cdot 4 = 36$. So $z_2 = 36$.

The client checks mod 7: $68 \equiv 5$ and $5^3 = 125 \equiv 6 \equiv -1$, a
non-square, so $M_{1,1} = 1$; $36 \equiv 1$, a square, so $M_{2,1} = 0$. That
is column 1, $(1, 0)$.

```python
import random

# By hand first: N = 77 = 7 * 11, a 2 x 3 table of bits, the client wants column 1.
N, M = 77, [[1, 0, 1], [0, 1, 1]]
y = [24, 71, 4]                        # 24 is a non-square mod 7 and mod 11; 71, 4 are squares
for row in M:
    z = 1
    for yc, bit in zip(y, row):
        z = z * (yc if bit else yc * yc) % N
    print("row", row, "z =", z, " square mod 7:", pow(z, 3, 7) == 1, "-> bit", 0 if pow(z, 3, 7) == 1 else 1)

# Kushilevitz-Ostrovsky with toy primes (real: a 2048-bit or larger N).
p, q = 1000003, 1000033
N = p * q
def is_square(z):                      # only the client can do this: it knows p
    return pow(z, (p - 1) // 2, p) == 1

random.seed(6)                         # demo randomness only
rows, cols = 8, 8
table = [[random.randrange(2) for _ in range(cols)] for _ in range(rows)]

def rand_square():
    return pow(random.randrange(2, N), 2, N)

def rand_nonsquare():                  # a non-square mod p and mod q (Jacobi symbol +1)
    while True:
        z = random.randrange(2, N)
        if pow(z, (p - 1) // 2, p) == p - 1 and pow(z, (q - 1) // 2, q) == q - 1:
            return z

want_r, want_c = 5, 2
query = [rand_nonsquare() if c == want_c else rand_square() for c in range(cols)]

reply = []                             # server: one product per row, over every bit
for row in table:
    z = 1
    for yc, bit in zip(query, row):
        z = z * (yc if bit else yc * yc) % N
    reply.append(z)

print("column", want_c, "from the reply:", [0 if is_square(z) else 1 for z in reply])
print("column", want_c, "in the table:  ", [table[r][want_c] for r in range(rows)])
print("so the wanted bit is", 0 if is_square(reply[want_r]) else 1)
```

Output:

```
row [1, 0, 1] z = 68  square mod 7: False -> bit 1
row [0, 1, 1] z = 36  square mod 7: True -> bit 0
column 2 from the reply: [1, 1, 1, 0, 0, 0, 0, 1]
column 2 in the table:   [1, 1, 1, 0, 0, 0, 0, 1]
so the wanted bit is 0
```

With a square table, the query is $\sqrt{n}$ numbers and so is the reply.
For a million-bit (125 KB) database and a 2048-bit modulus that is 1,000
numbers, about 256 KB each way, more than the database itself; because
$\sqrt{n}$ grows much more slowly than $n$, the scheme wins only for far
larger databases. By
applying the idea recursively, Kushilevitz and Ostrovsky brought the
communication below $n^{\varepsilon}$ for any $\varepsilon > 0$. Christian
Cachin, Silvio Micali and Markus Stadler (1999) reached polylogarithmic
communication under a different assumption, and Craig Gentry and Zulfikar
Ramzan (2005) constant-rate.

### Ten years of "just download it"

Communication was solved on paper; computation was not. The server performs
one modular multiplication per bit of the database, each costing far more
than sending the bit. In 2007 Radu Sion and Bogdan Carbunar published "On the
Computational Practicality of Private Information Retrieval" (NDSS 2007),
which compared these schemes with the trivial download on the networks and
processors of the day and found the download faster, by orders of magnitude.
For the next decade the practical advice was blunt: single-server PIR was
slower than sending the whole database.

## 11.12 Lattice PIR and Live Caller ID Lookup

*Level: intermediate.*

### Lattices change the arithmetic

Lattice-based encryption (book 1,
[Chapter 21](../../book/21-Lattice-Cryptography.md); the hard problem is
[Learning with Errors](../mathematics/15-Learning-with-Errors.md) in book 3)
changed that. Its operations are additions and multiplications of small
integers, vectorized and cache-friendly, and some schemes allow many
additions and some multiplications on ciphertexts
([Chapter 12](12-Homomorphic-Encryption.md)). The client encrypts the unit
vector that selects record $i$; the server multiplies the database by the
encrypted vector, which homomorphically selects record $i$; the client
decrypts.

- **XPIR** (Carlos Aguilar-Melchor and colleagues, PETS 2016) showed that
  lattice PIR could beat the download on fast networks, though its queries
  were large.
- **SealPIR** (Sebastian Angel, Hao Chen, Kim Laine and Srinath Setty, IEEE
  S&P 2018), built on Microsoft's SEAL library and the BFV scheme,
  compressed the query: the client sends one ciphertext and the server
  expands it into the full encrypted selection vector. Queries became about
  270 times smaller than XPIR's, down to tens of kilobytes, with
  roughly similar answer sizes and server time; the same paper used batch
  codes to answer many queries at once more cheaply.
- **SimplePIR and DoublePIR** (Alexandra Henzinger, Matthew Hong, Henry
  Corrigan-Gibbs, Sarah Meiklejohn and Vinod Vaikuntanathan, "One Server for
  the Price of Two," USENIX Security 2023) went back to plain LWE, with no
  ring structure, and moved most of the work into a one-time **hint**.

### SimplePIR, by hand

Arrange the database as a matrix $D$ with entries mod a small $p$. Fix a
public random matrix $A$ (one row per database column) and an LWE modulus $q$
much larger than $p$, with $\Delta = q/p$. To read column $j$:

$$
\begin{aligned}
\text{client sends} \quad & \mathbf{qu} = A\mathbf{s} + \mathbf{e} + \Delta\,\mathbf{u}_j \pmod q,\\
\text{server returns} \quad & \mathbf{ans} = D\,\mathbf{qu} \pmod q,\\
\text{client computes} \quad & \mathbf{ans} - H\mathbf{s} = \Delta\,D\mathbf{u}_j + D\mathbf{e} \pmod q,
\end{aligned}
$$

where $\mathbf{s}$ is the client's secret, $\mathbf{e}$ small noise,
$\mathbf{u}_j$ the unit vector for column $j$, and $H = DA$ the **hint**,
which depends only on the database and the public $A$, so the server computes
it once and every client downloads it once. The query is an LWE ciphertext,
so the server cannot tell $j$. The result is $\Delta$ times column $j$ plus the
small noise $D\mathbf{e}$; dividing by $\Delta$ and rounding gives column $j$,
as long as the noise stays below $\Delta/2$.

Take $q = 256$, $p = 4$ (so $\Delta = 64$), one secret coordinate $s = 5$,
public $A = (37, 101)^{\top}$, noise $\mathbf{e} = (1, -1)$, the database

$$
D = \begin{pmatrix} 1 & 3 \\ 2 & 0 \end{pmatrix},
$$

and the client wants column 2.

- Query: $\mathbf{qu} = (37 \cdot 5 + 1,\ 101 \cdot 5 - 1 + 64) = (186,\ 568)
  \equiv (186, 56) \pmod{256}$.
- Answer: $\mathbf{ans} = (1 \cdot 186 + 3 \cdot 56,\ 2 \cdot 186 + 0) = (354,
  372) \equiv (98, 116)$.
- Hint: $H = DA = (37 + 303,\ 74) = (340, 74) \equiv (84, 74)$.
- Client: $\mathbf{ans} - 5H = (98 - 420,\ 116 - 370) \equiv (190, 2)$. Divide
  by 64 and round: $190/64 \approx 2.97 \to 3$ and $2/64 \approx 0.03 \to 0$.
  Column 2 is $(3, 0)$, correct. The leftovers $-2$ and $+2$ are exactly
  $D\mathbf{e}$.

```python
import random

def simplepir(D, A, s, e, j, q, p):
    rows, cols = len(D), len(D[0])
    delta = q // p
    n = len(s)
    # Client: an LWE encryption of the unit vector for column j.
    qu = [(sum(A[c][t] * s[t] for t in range(n)) + e[c] + (delta if c == j else 0)) % q
          for c in range(cols)]
    # Server, once: the hint H = D * A.  Per query: the answer D * qu.
    H = [[sum(D[r][c] * A[c][t] for c in range(cols)) % q for t in range(n)] for r in range(rows)]
    ans = [sum(D[r][c] * qu[c] for c in range(cols)) % q for r in range(rows)]
    # Client: subtract H * s, then round away the noise.
    raw = [(ans[r] - sum(H[r][t] * s[t] for t in range(n))) % q for r in range(rows)]
    return qu, ans, H, raw, [round(v / delta) % p for v in raw]

# By hand first: q = 256, p = 4, n = 1, a 2 x 2 database, column 2 wanted.
qu, ans, H, raw, col = simplepir([[1, 3], [2, 0]], [[37], [101]], [5], [1, -1], 1, 256, 4)
print("by hand: query", qu, "answer", ans, "hint", H, "after -H*s", raw, "column", col)

# A larger toy: 32 x 32 records of 4 bits, LWE dimension 64, q = 2^32
# (SimplePIR uses n = 1024 and q = 2^32; this n is far too small to be secure).
random.seed(9)                         # demo randomness only
q, p, n, size = 2**32, 16, 64, 32
D = [[random.randrange(p) for _ in range(size)] for _ in range(size)]
A = [[random.randrange(q) for _ in range(n)] for _ in range(size)]   # public, shared
s = [random.randrange(q) for _ in range(n)]                           # client's secret
e = [random.randrange(-3, 4) for _ in range(size)]                    # small noise
j = 17
col = simplepir(D, A, s, e, j, q, p)[4]
print("recovered column 17 correctly:", col == [D[r][j] for r in range(size)])
```

Output:

```
by hand: query [186, 56] answer [98, 116] hint [[84], [74]] after -H*s [190, 2] column [3, 0]
recovered column 17 correctly: True
```

The server's per-query work is one pass of multiply-and-add over the
database, with 32-bit integers that wrap around for free, which is why it runs
near the speed of memory. The measured costs, from the paper, for a 1 GB
database on one core:

| Scheme | One-time hint | Per query (up and down) | Server speed |
|---|---|---|---|
| Trivial download | none | 1 GB | none |
| SimplePIR | 121 MB | 242 KB | about 10 GB/s |
| DoublePIR | 16 MB | 345 KB | about 7.4 GB/s |

DoublePIR applies SimplePIR a second time to the hint itself, shrinking it at
the cost of somewhat larger queries. The hint must be downloaded again when
the database changes, which suits large, slowly changing databases. Later
schemes (Spiral 2022, FrodoPIR 2023, YPIR and HintlessPIR in 2024) trade
these costs differently: smaller or no hints, different server speeds.

!!! note "Life story: SimplePIR and DoublePIR"
    **Born:** 2022 preprint, USENIX Security 2023, Henzinger, Hong,
    Corrigan-Gibbs, Meiklejohn and Vaikuntanathan (MIT and Google) ·
    **Purpose:** single-server PIR whose server runs at nearly the speed of
    reading memory, using plain LWE and a one-time hint · **Helped:** showed
    single-server PIR can be cheaper than the download for large databases;
    the base for later hint-based schemes and for Tiptoe, a private web
    search prototype from the same group (SOSP 2023) · **Status:** current research and prototypes; plausibly
    post-quantum, since it rests on LWE

### Apple's Live Caller ID Lookup (2024)

When a call comes in from an unknown number, a phone would like to ask a
caller-ID service who it is and whether it is a known scam, but that query
tells the service who is calling you, every time. With iOS 18 (2024), Apple
added **Live Caller ID Lookup**, an interface through which a caller-ID app's
server answers such questions by PIR. In July 2024 Apple open-sourced Swift
Homomorphic Encryption, implementing the BFV scheme with parameters chosen
for 128-bit post-quantum security, and an example PIR server for this
feature. The phone encrypts the incoming number, the server evaluates the
lookup homomorphically over its database, and the phone decrypts the answer;
the server never sees the number. This is **keyword PIR**: the database is
indexed by phone number, not by position, so numbers are hashed into buckets
first. The database is split into shards chosen from a hash of the number,
and the server sees which shard is queried, a small leak of the kind HIBP's
prefix makes. Queries also carry Privacy Pass tokens (§11.6) so the server
can limit abuse without identifying the user, and travel through a relay so
the server does not see the phone's address. Apple used related machinery
for Enhanced Visual Search in Photos the same year, a private nearest-neighbor
search over encrypted image embeddings. Homomorphic encryption itself, and
BFV, are [Chapter 12](12-Homomorphic-Encryption.md)'s subject.

!!! note "Life story: Live Caller ID Lookup"
    **Born:** 2024, Apple, for iOS 18; Swift Homomorphic Encryption
    open-sourced July 2024 · **Purpose:** let caller-ID and spam-blocking
    apps answer "who is calling" without learning the incoming number ·
    **Helped:** one of the first single-server PIR systems built into a
    mass-market operating system; put BFV homomorphic encryption into everyday phone use ·
    **Status:** current; keyword PIR over BFV with sharding, Privacy Pass
    tokens for authentication, and a relay to hide the client's address

## 11.13 In the real world

*Level: intermediate.*

The tools of this chapter run, mostly unseen, in some of the most used
software in the world. The table collects the deployments told above, with the
tool each uses and what it still reveals.

| System | Year | Tool | Who learns what |
|---|---|---|---|
| Hashed contact upload (many apps) | 2010s, still common | plain hash | server recovers every number by brute force |
| Signal contact discovery | 2017; CDSI later | SGX enclave, oblivious code | trusts Intel hardware and published enclave code |
| Pwned Passwords range API | 2018 | k-anonymity by hash prefix | server sees 20 bits of the password's SHA-1 |
| Google Password Checkup | 2019 | username prefix + blinded DH matching | server sees a username-hash prefix |
| Google Private Join and Compute | 2019 | DH-PSI + Paillier sums | parties learn a count and a total |
| Apple Password Monitoring | 2020 | 15-bit prefix + OPRF-style blinding | server sees a 15-bit prefix |
| Microsoft Edge Password Monitor | 2021 | OPRF + homomorphic lookup | server sees an encrypted query |
| Apple CSAM detection | 2021, never deployed | PSI with threshold sharing | nothing below 30 matches, by design |
| Privacy Pass (RFC 9576 to 9578) | 2017; RFCs 2024 | VOPRF or blind RSA tokens | issuer cannot link issuance to redemption |
| OPAQUE (RFC 9807) | 2018; RFC 2025 | OPRF on the password | server never sees the password |
| Apple Live Caller ID Lookup | 2024 | BFV keyword PIR | server sees the shard, not the number |

Three patterns stand out. First, the deployed systems almost never use the
most private design on paper. They use a prefix that leaks a few bits, an
enclave that moves trust to a chip maker, or a single server where two would
give perfect privacy, because each of those cuts cost or complexity by an
order of magnitude. That is a reasonable engineering choice as long as it is
stated plainly, as HIBP's documentation does.

Second, every one of these systems answers questions, and none of them can
decide which questions are legitimate. Enumeration attacks on contact
discovery, dictionary queries against breach checks and online guessing
against OPRF servers are all stopped, where they are stopped, by rate limits,
account costs and monitoring, not by the cryptography.

Third, the largest controversy in the area, Apple's 2021 design, was not
about whether the cryptography worked. It did. It was about who supplies the
set being matched and what the system would be used for later. A private
matching protocol is a precise instrument, and the precision cuts both ways.

## 11.14 Going deeper

*Level: expert.*

**PSI from OT and the OPRF view.** Fast PSI protocols (KKRT 2016 and its
successors, such as the vector-OLE-based protocols of Rindal, Raghuraman and
others around 2021 to 2022) are best understood as batched OPRFs. Oblivious
transfer extension gives the receiver $F(k, x_i)$ for each of its items under
a key the sender holds, computed with symmetric primitives, and the sender
then sends $F(k, y_j)$ for its items, hashed into a cuckoo table so each
comparison touches a few bins. Sets of $2^{20}$ items on each side intersect
in about a second on a fast network. Malicious security costs relatively
little in these designs, unlike DH-PSI, where it needs zero-knowledge proofs.

**Unbalanced, labeled and updatable PSI.** When the server's set is huge and
changes, both the OPRF approach (publish keyed values) and DH-PSI (send keyed
values) need the client to download something proportional to the server's
set. Homomorphic PSI in the style of Chen, Laine and Rindal keeps the client's
download small at the cost of heavy server computation; Microsoft's APSI
library implements it. Updatable PSI (Badrinarayanan, Miao and Rindal, 2022)
handles sets that change by small amounts between runs, which is the common
case for contact discovery and ad measurement.

**PIR with preprocessing.** Beimel, Ishai and Malkin's lower bound says a
server must read the whole database per query unless it preprocesses. Two
ways around it have been found. In **offline/online PIR** (Henry
Corrigan-Gibbs and Dmitry Kogan, EUROCRYPT 2020), the client downloads a hint
in an offline phase, and online queries cost the servers only about $\sqrt{n}$
work; single-server versions followed. In **doubly efficient PIR** (Wei-Kai
Lin, Ethan Mook and Daniel Wichs, STOC 2023), the server encodes the database
once, using ring LWE and fast polynomial evaluation, after which every query
from any client costs polylogarithmic server work. The construction is far
from practical today, with an encoded database many times the original
size, but it settled a question open since the 1990s.

**What is post-quantum here.** DH-PSI, 2HashDH and every OPRF suite in RFC
9497 rest on discrete logarithms, which a large quantum computer would break
([Post-quantum, Chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md)).
The damage is uneven. Blinding is information-theoretic, so past OPRF
queries stay hidden; but a quantum attacker who recorded a DH-PSI exchange
could recover the exponents and test guesses against the transcript, and one
who recovers an OPRF server's key from its public key can brute-force every
published output. Lattice-based OPRFs exist (Albrecht, Davidson, Deo and
Smart, PKC 2021, among others) but are much more expensive, and isogeny-based
designs have had a rough history. Lattice PIR (SealPIR, SimplePIR, Apple's
BFV lookups) is plausibly post-quantum already, resting on the LWE problems
of [Post-quantum, Chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md).

**Formal definitions.** The security of PSI, OPRFs and PIR is stated in the
ideal-versus-real paradigm of [Chapter 1](01-Computing-With-Secrets.md): an
ideal functionality takes both inputs and hands out only the intersection, or
$F(k, x)$, or record $i$; a protocol is secure if anything an attacker sees
in the real run can be simulated from what the ideal functionality gives it.
For OPRFs the cleanest definition is in the universal-composability framework
(Jarecki, Kiayias, Krawczyk and Xu, 2016), which counts evaluations through a
ticket mechanism to capture "one output per query." PIR is usually defined
more simply, by requiring that the server's view for any two indices be
indistinguishable, perfectly in the multi-server case and computationally in
the single-server case.

## Check yourself

??? question "1. Why does hashing a phone number with SHA-256 not hide it, when SHA-256 is one-way?"

    One-wayness protects inputs drawn from a huge space. Phone numbers come
    from a space of about $10^{10}$ per country plan, so an attacker hashes
    every possible number and looks the hash up. Plain Python does it in
    hours; a graphics card in seconds; and the table is built once for all
    victims.

??? question "2. A shared salt is added to every phone number before hashing. Why does this not help?"

    For matching to work, every client must hash a number to the same value,
    so the salt is the same for everyone and is shipped in every copy of the
    app. It is part of the hash function, not a secret, and the attacker
    simply includes it when building the table.

??? question "3. In the group of §11.3 ($p = 167$, $q = 83$), Alice has $H(x) = 25$ and $a = 13$; Bob has $b = 29$. Verify that $(25^{13})^{29} = (25^{29})^{13} \bmod 167$ using the values in the chapter."

    $25^{13} \equiv 114$ and $114^{29} \equiv 31$. Also $25^{29} \equiv 19$ and
    $19^{13} \equiv 31$. Both give 31, as commutativity of exponents
    requires: both equal $25^{13 \cdot 29} = 25^{377}$, and $377 \equiv 45
    \pmod{83}$.

??? question "4. In DH-PSI, what does Bob learn, and what dishonest behavior by Bob does the semi-honest proof not cover?"

    Bob learns the size of Alice's set. The proof assumes he follows the
    steps; a dishonest Bob can return Alice's values in the wrong order or
    under a different exponent, making her compute a wrong intersection
    without noticing. He can also put any items he likes in his own set,
    which no protocol prevents.

??? question "5. In the OPRF of §11.5 ($p = 167$, $q = 83$, $k = 37$, $H_1(x) = 81$), the client picks $r = 2$. What does it send, and what is $r^{-1} \bmod 83$?"

    It sends $B = 81^2 \bmod 167 = 6561 \bmod 167 = 48$ (since $167 \cdot 39 =
    6513$). The inverse of 2 mod 83 is 42, since $2 \cdot 42 = 84 \equiv 1$.
    Whatever the server returns as $Z = 48^{37}$, raising it to 42 gives
    $81^{37} \equiv 6$, the same $N$ as in the chapter.

??? question "6. Why does the server in 2HashDH learn nothing about the client's input, even with unlimited computing power?"

    In a group of prime order every element other than 1 generates the
    group, so for a uniformly random $r$ the value $H_1(x)^r$ is a uniformly
    random element other than 1, whatever $x$ is. The server's view has the
    same distribution for every input; no computation can extract what is
    not there.

??? question "7. A developer implements $H_1(x) = g^{\text{SHA-256}(x)}$. What breaks, and how is it fixed?"

    Then $H_1(x)^k = (g^k)^{\text{SHA-256}(x)}$. Anyone who knows $g^k$
    (the published key in VOPRF mode, or one query's answer on an input
    with a known logarithm) computes every output offline, so rate limits
    are useless. The fix is a hash onto the group whose outputs have no
    known logarithm, such as RFC 9380 hash-to-curve.

??? question "8. Pwned Passwords had 501,636,842 hashes in 2018 and the client sends five hex digits. About how many hashes come back, and what does the prefix still leak?"

    $16^5 = 1{,}048{,}576$ prefixes, so about $501{,}636{,}842 / 1{,}048{,}576
    \approx 478$ suffixes per reply. The prefix is 20 bits of the
    password's SHA-1; against a dictionary tailored to the person asking it
    cuts the candidates by a factor of about a million, often to one.

??? question "9. In two-server XOR PIR with $D = 0\,1\,1\,0\,1\,0\,0\,1$, the client wants $D_5$ and picks $S = \{2, 5, 6\}$. What does each server receive and return?"

    Server 1 gets $S = \{2, 5, 6\}$ and returns $D_2 \oplus D_5 \oplus D_6 =
    1 \oplus 1 \oplus 0 = 0$. Server 2 gets $S' = S \oplus \{5\} = \{2, 6\}$
    and returns $D_2 \oplus D_6 = 1 \oplus 0 = 1$. The client computes $0
    \oplus 1 = 1 = D_5$. If the servers compared $\{2, 5, 6\}$ and $\{2, 6\}$
    they would see the difference is position 5.

??? question "10. Why must any PIR scheme without preprocessing read the whole database for each query, and how do SimplePIR and doubly efficient PIR live with this?"

    If the server skipped a record, it would know that record was not the
    one requested, which leaks information about the index (Beimel, Ishai
    and Malkin, 2000). SimplePIR accepts the full pass and makes it as cheap
    as reading memory, with 32-bit multiply-and-add and the expensive
    structure moved into a one-time hint. Doubly efficient PIR escapes the
    bound by preprocessing: the server encodes the database once so that
    each later query touches only a polylogarithmic part of the encoding.

## What you learned

- Hashing a phone number, email or password hides nothing when the input
  space can be listed; a million numbers fall in seconds, all North American
  numbers in hours of Python. Salts and slow hashes do not change this when
  both sides must compute the same value.
- Diffie-Hellman PSI (Meadows 1986; Huberman, Franklin and Hogg 1999)
  intersects two sets by raising hashed items to both parties' secret
  exponents; it is correct because exponents commute and private under DDH,
  for semi-honest parties. Malicious parties can corrupt the result unless
  proofs are added, and nobody can be stopped from choosing their input.
- An OPRF lets a client compute $F(k, x)$ under a server's key without the
  server seeing $x$. 2HashDH, $F(k, x) = H_2(x, H_1(x)^k)$, blinds with a
  random exponent and unblinds with its inverse; input privacy is perfect,
  and the hash onto the group must have no known logarithm.
- RFC 9497 (2023) standardizes OPRF, VOPRF (with a Chaum-Pedersen proof that
  the published key was used, which stops tagging) and POPRF (with a public
  input). OPAQUE and Privacy Pass (RFC 9576, RFC 9577, RFC 9578) are built on
  it; every OPRF server must rate-limit.
- Breach checks range from k-anonymity by hash prefix (Pwned Passwords,
  2018: about 478 answers per query, 20 bits leaked) to blinded matching
  keyed to the username (Google Password Checkup, 2019: nothing about the
  password leaked).
- Apple's 2021 CSAM detection design combined NeuralHash, blinded PSI,
  threshold secret sharing and synthetic vouchers; the cryptography held,
  while NeuralHash collisions, an unauditable list and the precedent of
  on-device scanning led Apple to pause it in September 2021 and abandon it
  in December 2022.
- Signal's contact discovery uses an attested SGX enclave with oblivious
  code, trading trust in Signal for trust in Intel and in published code;
  rate limits are still needed against enumeration.
- PIR fetches a record without revealing which: two non-colluding servers
  give perfect privacy with XOR (Chor, Goldreich, Kushilevitz, Sudan 1995);
  one server needs computational assumptions, from quadratic residues
  (Kushilevitz and Ostrovsky 1997) to LWE (SealPIR 2018; SimplePIR and
  DoublePIR 2023, near memory speed with a one-time hint). Apple's Live
  Caller ID Lookup (2024) runs keyword PIR over BFV.

**Next:** [Chapter 12](12-Homomorphic-Encryption.md), computing on
ciphertexts in general: Paillier by hand, Gentry's bootstrapping, and the
lattice schemes (BGV, BFV, CKKS, TFHE) that make the lattice PIR of this
chapter possible.

## Further reading

- Catherine Meadows, "A More Efficient Cryptographic Matchmaking Protocol
  for Use in the Absence of a Continuously Available Third Party" (IEEE
  Symposium on Security and Privacy, 1986).
- Bernardo Huberman, Matt Franklin and Tad Hogg, "Enhancing Privacy and
  Trust in Electronic Communities" (ACM Conference on Electronic Commerce,
  1999).
- Rakesh Agrawal, Alexandre Evfimievski and Ramakrishnan Srikant,
  "Information Sharing Across Private Databases" (SIGMOD 2003).
- Michael Freedman, Kobbi Nissim and Benny Pinkas, "Efficient Private
  Matching and Set Intersection" (EUROCRYPT 2004).
- Michael Freedman, Yuval Ishai, Benny Pinkas and Omer Reingold, "Keyword
  Search and Oblivious Pseudorandom Functions" (TCC 2005).
- Moni Naor and Omer Reingold, "Number-Theoretic Constructions of Efficient
  Pseudo-Random Functions" (FOCS 1997).
- Stanisław Jarecki and Xiaomin Liu, "Efficient Oblivious Pseudorandom
  Function with Applications to Adaptive OT and Secure Computation of Set
  Intersection" (TCC 2009); "Fast Secure Computation of Set Intersection"
  (SCN 2010).
- Emiliano De Cristofaro and Gene Tsudik, "Practical Private Set
  Intersection Protocols with Linear Complexity" (Financial Cryptography
  2010).
- Stanisław Jarecki, Aggelos Kiayias and Hugo Krawczyk, "Round-Optimal
  Password-Protected Secret Sharing and T-PAKE in the Password-Only Model"
  (ASIACRYPT 2014); with Jiayu Xu, "Highly-Efficient and Composable
  Password-Protected Secret Sharing" (EuroS&P 2016).
- Stanisław Jarecki, Hugo Krawczyk and Jiayu Xu, "OPAQUE: An Asymmetric PAKE
  Protocol Secure Against Pre-Computation Attacks" (EUROCRYPT 2018).
- Daniel Brown and Robert Gallant, "The Static Diffie-Hellman Problem"
  (IACR ePrint 2004/306); Jung Hee Cheon, "Security Analysis of the Strong
  Diffie-Hellman Problem" (EUROCRYPT 2006).
- Benny Pinkas, Thomas Schneider and Michael Zohner, "Faster Private Set
  Intersection Based on OT Extension" (USENIX Security 2014).
- Vladimir Kolesnikov, Ranjit Kumaresan, Mike Rosulek and Ni Trieu,
  "Efficient Batched Oblivious PRF with Applications to Private Set
  Intersection" (ACM CCS 2016).
- Hao Chen, Kim Laine and Peter Rindal, "Fast Private Set Intersection from
  Homomorphic Encryption" (ACM CCS 2017); Hao Chen, Zhicong Huang, Kim Laine
  and Peter Rindal, "Labeled PSI from Fully Homomorphic Encryption with
  Malicious Security" (ACM CCS 2018).
- Mihaela Ion, Ben Kreuter, Ahmet Erhan Nergiz, Sarvar Patel, Shobhit Saxena,
  Karn Seth, Mariana Raykova, David Shanahan and Moti Yung, "On Deploying
  Secure Computing: Private Intersection-Sum-with-Cardinality" (IEEE
  EuroS&P 2020).
- Alex Davidson, Ian Goldberg, Nick Sullivan, George Tankersley and Filippo
  Valsorda, "Privacy Pass: Bypassing Internet Challenges Anonymously"
  (PoPETs 2018).
- Nirvan Tyagi, Sofía Celi, Thomas Ristenpart, Nick Sullivan, Stefano
  Tessaro and Christopher Wood, "A Fast and Simple Partially Oblivious PRF,
  with Applications" (EUROCRYPT 2022).
- RFC 9380, Hashing to Elliptic Curves (2023); RFC 9497, Oblivious
  Pseudorandom Functions (OPRFs) Using Prime-Order Groups (2023); RFC 9474,
  RSA Blind Signatures (2023); RFC 9576, The Privacy Pass Architecture
  (2024); RFC 9577, The Privacy Pass HTTP Authentication Scheme (2024);
  RFC 9578, Privacy Pass Issuance Protocols (2024); RFC 9807, The OPAQUE
  Augmented PAKE Protocol (2025).
- SP 800-63B, Digital Identity Guidelines: Authentication and Lifecycle
  Management (2017; revised since).
- Pierangela Samarati and Latanya Sweeney, "Protecting Privacy when
  Disclosing Information: k-Anonymity and Its Enforcement through
  Generalization and Suppression" (SRI technical report, 1998).
- Troy Hunt, "I've Just Launched Pwned Passwords Version 2" (blog, 22
  February 2018); Junade Ali, "Validating Leaked Passwords with
  k-Anonymity" (Cloudflare blog, 21 February 2018).
- Lucy Li, Bijeeta Pal, Junade Ali, Nick Sullivan, Rahul Chatterjee and
  Thomas Ristenpart, "Protocols for Checking Compromised Credentials" (ACM
  CCS 2019).
- Kurt Thomas, Jennifer Pullman, Kevin Yeo, Ananth Raghunathan, Patrick
  Gage Kelley, Luca Invernizzi, Borbala Benko, Tadek Pietraszek, Sarvar
  Patel, Dan Boneh and Elie Bursztein, "Protecting Accounts from Credential
  Stuffing with Password Breach Alerting" (USENIX Security 2019).
- Andrew Kwong and colleagues, "A Side Channel Analysis of Chrome's Password
  Leak Detection" (USENIX Security 2023).
- Moxie Marlinspike, "The Difficulty of Private Contact Discovery" (Signal
  blog, January 2014); Signal, "Technology Preview: Private Contact
  Discovery for Signal" (Signal blog, 26 September 2017).
- Christoph Hagen, Christian Weinert, Christoph Sendner, Alexandra
  Dmitrienko and Thomas Schneider, "All the Numbers are US: Large-scale
  Abuse of Contact Discovery in Mobile Messengers" (NDSS 2021).
- Apple, "CSAM Detection: Technical Summary" (August 2021); Abhishek
  Bhowmick, Dan Boneh, Steve Myers, Kunal Talwar and Karl Tarbe, "The Apple
  PSI System" (July 2021).
- Harold Abelson, Ross Anderson, Steven Bellovin, Josh Benaloh, Matt Blaze,
  Jon Callas, Whitfield Diffie, Susan Landau, Peter Neumann, Ronald Rivest,
  Jeffrey Schiller, Bruce Schneier, Vanessa Teague and Carmela Troncoso,
  "Bugs in Our Pockets: The Risks of Client-Side Scanning" (2021; *Journal
  of Cybersecurity*, 2024).
- Benny Chor, Oded Goldreich, Eyal Kushilevitz and Madhu Sudan, "Private
  Information Retrieval" (FOCS 1995; *Journal of the ACM* 45, 1998).
- Eyal Kushilevitz and Rafail Ostrovsky, "Replication Is Not Needed: Single
  Database, Computationally-Private Information Retrieval" (FOCS 1997).
- Christian Cachin, Silvio Micali and Markus Stadler, "Computationally
  Private Information Retrieval with Polylogarithmic Communication"
  (EUROCRYPT 1999); Craig Gentry and Zulfikar Ramzan, "Single-Database
  Private Information Retrieval with Constant Communication Rate" (ICALP
  2005).
- Amos Beimel, Yuval Ishai and Tal Malkin, "Reducing the Servers'
  Computation in Private Information Retrieval: PIR with Preprocessing"
  (CRYPTO 2000).
- Radu Sion and Bogdan Carbunar, "On the Computational Practicality of
  Private Information Retrieval" (NDSS 2007).
- Zeev Dvir and Sivakanth Gopi, "2-Server PIR with Sub-Polynomial
  Communication" (STOC 2015).
- Carlos Aguilar-Melchor, Joris Barrier, Laurent Fousse and Marc-Olivier
  Killijian, "XPIR: Private Information Retrieval for Everyone" (PoPETs
  2016).
- Sebastian Angel, Hao Chen, Kim Laine and Srinath Setty, "PIR with
  Compressed Queries and Amortized Query Processing" (IEEE S&P 2018).
- Henry Corrigan-Gibbs and Dmitry Kogan, "Private Information Retrieval
  with Sublinear Online Time" (EUROCRYPT 2020).
- Alexandra Henzinger, Matthew Hong, Henry Corrigan-Gibbs, Sarah Meiklejohn
  and Vinod Vaikuntanathan, "One Server for the Price of Two: Simple and Fast
  Single-Server Private Information Retrieval" (USENIX Security 2023).
- Wei-Kai Lin, Ethan Mook and Daniel Wichs, "Doubly Efficient Private
  Information Retrieval and Fully Homomorphic RAM Computation from Ring LWE"
  (STOC 2023).
- Martin Albrecht, Alex Davidson, Amit Deo and Nigel Smart, "Round-Optimal
  Verifiable Oblivious Pseudorandom Functions from Ideal Lattices" (PKC
  2021).
- Apple, "Announcing Swift Homomorphic Encryption" (Swift.org blog, July
  2024); Apple Machine Learning Research, "Combining Machine Learning and
  Homomorphic Encryption in the Apple Ecosystem" (October 2024).
