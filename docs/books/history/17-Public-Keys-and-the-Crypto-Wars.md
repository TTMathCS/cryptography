# 17. Public keys and the crypto wars

*Until 1976 every secret message had a secret that had to travel first: a key, carried by a courier, a diplomat or an armored van. This chapter covers the thirty years from 1970 to 2000, in which a student with a rejected term paper, two Stanford researchers, three MIT colleagues and, unknown to all of them, three British civil servants worked out how two strangers can agree on a secret in public; in which the United States government then tried, for twenty years and with every legal and technical tool it had, to stop the world from using what they found; and in which a banned movement in South Africa carried its messages past a police state on a laptop and a cassette tape. You will run Merkle's puzzles, decrypt the 129-digit message that Martin Gardner printed in 1977, break a small RSA key the way the 1994 volunteers broke a large one, forge a Clipper escrow field, and see why the question "who does this key belong to?" turned out to be harder than the mathematics.*

!!! abstract "In this chapter"
    **You will learn:**

    - why distributing keys was the great unsolved problem of the 1970s, and how many keys a network of a thousand people needs when every pair must share one;
    - who Ralph Merkle, Whitfield Diffie, Martin Hellman, Ron Rivest, Adi Shamir and Leonard Adleman were, what each did, and what the record shows about who thought of what first;
    - what James Ellis, Clifford Cocks and Malcolm Williamson found at GCHQ between 1969 and 1974, why it stayed secret until December 1997, and what the sources do and do not show about the NSA's own claims;
    - how the RSA-129 challenge of 1977 was met by about 600 volunteers in 1994, and what that said about the estimates of the people who set it;
    - how the NSA reacted to open research from 1977 on, through a letter, secrecy orders on patents and a voluntary review scheme;
    - how certificates, signatures and elliptic curves grew out of the first ideas, who the women were who shaped the field (Dorothy Denning, Shafi Goldwasser, Lenore Blum, Susan Landau, Cindy Cohn and Judge Marilyn Hall Patel), and what the patents did to all of it;
    - the crypto wars: the Munitions List, the 40-bit export limit, Phil Zimmermann and PGP, the Clipper chip and Matt Blaze's break of its escrow field, the cases of Bernstein, Karn and Junger, and the relaxations of 1996 and 2000;
    - how Operation Vula moved encrypted messages for the African National Congress between 1988 and 1990.

    **You need:** [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) (the one-time pad and the problem of carrying keys), [chapter 15](15-Shannon-and-the-Agencies.md) (the agencies as the public of the 1970s did not know them) and [chapter 16](16-Feistel-Lucifer-and-DES.md) (DES, the cipher whose users needed keys). The mathematics is taught in [book 1, chapter 12](../../book/12-Diffie-Hellman.md) (Diffie-Hellman), [chapter 13](../../book/13-RSA.md) (RSA), [chapter 14](../../book/14-Discrete-Log-Systems.md) (ElGamal, Schnorr, DSA) and [chapter 15](../../book/15-Elliptic-Curves.md) (elliptic curves). The attacks are in [Cryptanalysis, chapter 11](../cryptanalysis/11-Factoring.md) (factoring), [chapter 12](../cryptanalysis/12-Discrete-Logarithms.md) (discrete logarithms) and [chapter 13](../cryptanalysis/13-Attacks-on-RSA.md) (attacks on RSA). The protocols that put these tools to work are in the Protocols book, whose [chapter 2](../protocols/02-Certificates-and-PKI.md) is about certificates; its chapter on email, OpenPGP and S/MIME is where PGP's design belongs. This chapter tells the story and gives each idea in a few lines.

    **Levels:** §17.1, §17.2, §17.4, §17.10 to §17.14 are for beginners, §17.3, §17.5 to §17.9 and §17.15 are intermediate, §17.16 is expert.

## 17.1 The problem: keys have to travel

*Level: beginner.*

In the early 1970s a bank clerk in London, New York or Brussels was beginning to send money as a message. The first cash machines went into service in 1967 and 1969. In 1973 a group of banks founded the Society for Worldwide Interbank Financial Telecommunication (SWIFT) in Brussels, and it carried its first messages in 1977. Behind each of these systems was the same worry that the telegraph had raised a century before ([chapter 10](10-The-Telegraph.md)): the wire passes through other people's hands. In 1973 the National Bureau of Standards in Washington asked for a cipher that any business could use, and in 1977 it published the Data Encryption Standard ([chapter 16](16-Feistel-Lucifer-and-DES.md)). A good cipher in the open was a great step. It left one problem exactly where it had been since the Babylonians: both ends needed the same key, and the key had to get there first, secretly.

Governments paid for this with couriers. The National Security Agency's key lists were printed by the ton and delivered to embassies and ships ([chapter 15](15-Shannon-and-the-Agencies.md)), and a bank could do the same on a smaller scale with armored vans and signed receipts. The cost grows quickly with the number of people. If every pair of users needs a key of its own, then $n$ users need $n(n-1)/2$ keys. The short program below prints the count.

```python
# How many secret keys does a network need if every pair of users shares one?
for users in (2, 10, 100, 1000, 1000000):
    pairs = users * (users - 1) // 2
    print(f"{users:>8} users need {pairs:>14,} pair keys; with public keys they need {2 * users:>9,} keys in all")
```

Output:

```
       2 users need              1 pair keys; with public keys they need         4 keys in all
      10 users need             45 pair keys; with public keys they need        20 keys in all
     100 users need          4,950 pair keys; with public keys they need       200 keys in all
    1000 users need        499,500 pair keys; with public keys they need     2,000 keys in all
 1000000 users need 499,999,500,000 pair keys; with public keys they need 2,000,000 keys in all
```

A thousand users need almost half a million keys, and a million users need half a trillion. The last column belongs to the answer this chapter is about: if each person has one public key and one private key, a million users need two million keys, and nobody has to meet anybody. A cheaper way to keep the keys, such as a central server that shares one key with each user, moves the problem and does not remove it. The server must be trusted completely, and it holds every secret.

A second problem sat beside the first, and it was newer. Business needed *signatures*. A handwritten signature is something you can check and cannot easily copy. An encrypted message with a shared key proves nothing about who wrote it, because both ends can make it. When a bank received an instruction to move money, who could prove, later, in a dispute, that the customer had sent it and that the bank had not made it up? The question was not about secrecy at all.

Whitfield Diffie had both problems on his mind. He was born in 1944, grew up in Queens, took a degree in mathematics at MIT in 1965, and by the early 1970s was working in John McCarthy's Artificial Intelligence Laboratory at Stanford. By his own later account two things pulled him toward cryptography. One was David Kahn's *The Codebreakers* (1967), which showed him that the subject existed and that governments kept it to themselves ([chapter 15](15-Shannon-and-the-Agencies.md) tells how the NSA tried to stop that book). The other was McCarthy's picture of a world in which people bought and sold by computer terminal, and so needed an electronic equivalent of a signature. In the early 1970s he gave up other work to study the problem, and in 1974 he went from one researcher to another across the United States, looking for anyone who knew anything. §17.3 tells where that led.

At about the same time, in the same field and on the other side of the Atlantic, people who could not publish had already been through the whole of this, which §17.6 tells. And in Berkeley a student in his early twenties was about to hand in a term paper. Figure 17.1 sets the dates of the chapter on one line.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="Timeline from 1969 to 2000 of public-key cryptography and the crypto wars" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="412" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1970</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">Ellis at GCHQ: "non-secret encryption" is possible (secret)</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">1973-74</text>
<circle cx="102" cy="48" r="3.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start">Cocks and Williamson at GCHQ (secret)</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">1974</text>
<circle cx="102" cy="74" r="4.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start" font-weight="bold">Merkle's puzzles, a rejected term paper</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">1976</text>
<circle cx="102" cy="100" r="4.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start" font-weight="bold">Diffie and Hellman, "New Directions in Cryptography"</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">1977</text>
<circle cx="102" cy="126" r="4.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start" font-weight="bold">RSA; Gardner's column; Meyer's letter</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">1978</text>
<circle cx="102" cy="152" r="3.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start">Kohnfelder's certificates; secrecy orders on patents</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">1981</text>
<circle cx="102" cy="178" r="3.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start">Denning and Sacco on stale keys; voluntary review begins</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">1985</text>
<circle cx="102" cy="204" r="3.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start">ElGamal; Koblitz and Miller propose elliptic curves</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">1991</text>
<circle cx="102" cy="230" r="4.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start" font-weight="bold">PGP released; DSA proposed</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">1993</text>
<circle cx="102" cy="256" r="4.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start" font-weight="bold">Clipper announced (16 April); the PGP inquiry opens</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">1994</text>
<circle cx="102" cy="282" r="3.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start">Blaze breaks the LEAF; RSA-129 factored</text>
<text x="88" y="313" font-size="14" text-anchor="end" font-weight="bold">1996</text>
<circle cx="102" cy="308" r="3.5" fill="currentColor"/>
<text x="118" y="313" font-size="14" text-anchor="start">PGP inquiry dropped; encryption moves to Commerce</text>
<text x="88" y="339" font-size="14" text-anchor="end" font-weight="bold">1997</text>
<circle cx="102" cy="334" r="4.5" fill="currentColor"/>
<text x="118" y="339" font-size="14" text-anchor="start" font-weight="bold">GCHQ tells its story; the Diffie-Hellman patent expires</text>
<text x="88" y="365" font-size="14" text-anchor="end" font-weight="bold">2000</text>
<circle cx="102" cy="360" r="3.5" fill="currentColor"/>
<text x="118" y="365" font-size="14" text-anchor="start">New export rules (January); RSA patent ends (September)</text>
<text x="88" y="391" font-size="14" text-anchor="end" font-weight="bold">1988-90</text>
<circle cx="102" cy="386" r="3.5" fill="currentColor"/>
<text x="118" y="391" font-size="14" text-anchor="start">Operation Vula's messages (a thread of its own, §17.14)</text>
</svg>
<figcaption>Figure 17.1. From a secret note at GCHQ to the end of the export rules. The bold dates are the ones this chapter dwells on. The Vula line is out of order because its thread runs alongside the others.</figcaption>
</figure>

## 17.2 Merkle's puzzles: a rejected term paper

*Level: beginner.*

In the autumn quarter of 1974 Ralph Merkle, a computer science student at Berkeley in his early twenties, took Lance Hoffman's course on computer security, CS 244. A term project was due, and Merkle proposed to solve what the course's own reading list described as an unsolved problem: how two parties who share no secret can agree on a key over a channel that an enemy can hear. Hoffman did not follow the proposal and asked for a rewrite. The second version he turned down as well. Merkle dropped the course and went on working on the idea by himself. He sent a paper, "Secure Communications over Insecure Channels", to the *Communications of the ACM*, where, on his own account, a referee wrote that it was outside the mainstream of cryptographic thinking. It was received in August 1975 and appeared in April 1978, after revisions in 1977.

It would be easy to tell this as a story of dull teachers. The record is a little kinder. Nobody in the open literature of 1974 had a reason to believe the problem could be solved, and every textbook said the key must travel by a safe channel. A twenty-two-year-old who says otherwise and writes it up unclearly is, in the usual run of things, wrong. What makes Merkle's case instructive is that he was right, and that the scheme in the paper is nothing like the ones that came after. It is a puzzle.

Suppose Alice wants to agree a key with Bob. She makes $N$ puzzles. Each puzzle is a small locked box, and the lock is weak on purpose: it can be opened by trying keys one after another, and about $N$ tries are enough. Inside each box she puts an identifier and a fresh session key, and she keeps a private table of identifiers and keys. She sends all $N$ boxes to Bob. Bob picks one at random, opens it by brute force, and says the identifier aloud, on the open line. Alice looks the identifier up in her table and has the same key.

What does Eve, who listened to everything, know? She has $N$ locked boxes and one identifier. The identifier tells her which box Bob opened, but only after she opens it, so she has to open boxes until she finds the one with that identifier, which takes $N/2$ of them on average, each of which costs her $N/2$ tries. Take $N = 1{,}000$. Alice makes 1,000 puzzles. Bob opens one at a cost of about 500 tries. Eve opens about 500 puzzles at about 500 tries each, which is about 250,000 tries. If $N$ is a million, Bob does about 500,000 tries and Eve about $2.5 \times 10^{11}$. The gap is the square of the honest work, as Figure 17.2 shows.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Alice sends many locked puzzles to Bob, who opens one and announces its identifier; Eve must open about half of them" fill="currentColor" font-size="14">
<text x="30" y="30" font-size="14" font-weight="bold" text-anchor="start">Alice sends N locked puzzles over the open line</text>
<rect x="30" y="48" width="70" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65" y="72" font-size="13" text-anchor="middle">Alice</text>
<text x="65" y="90" font-size="12" text-anchor="middle">keeps a table</text>
<g fill="none" stroke="currentColor" stroke-width="1.2">
<rect x="150" y="50" width="22" height="22"/><rect x="178" y="50" width="22" height="22"/><rect x="206" y="50" width="22" height="22"/><rect x="234" y="50" width="22" height="22"/><rect x="262" y="50" width="22" height="22"/><rect x="290" y="50" width="22" height="22"/><rect x="318" y="50" width="22" height="22"/><rect x="346" y="50" width="22" height="22"/>
<rect x="150" y="80" width="22" height="22"/><rect x="178" y="80" width="22" height="22"/><rect x="206" y="80" width="22" height="22"/><rect x="234" y="80" width="22" height="22" stroke-width="3"/><rect x="262" y="80" width="22" height="22"/><rect x="290" y="80" width="22" height="22"/><rect x="318" y="80" width="22" height="22"/><rect x="346" y="80" width="22" height="22"/>
</g>
<line x1="100" y1="76" x2="146" y2="76" stroke="currentColor" stroke-width="1.3"/>
<polygon points="146,76 139.6,78.7 139.6,73.3" fill="currentColor"/>
<line x1="372" y1="76" x2="470" y2="76" stroke="currentColor" stroke-width="1.3"/>
<polygon points="470,76 463.6,78.7 463.6,73.3" fill="currentColor"/>
<rect x="472" y="48" width="140" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="542" y="72" font-size="13" text-anchor="middle">Bob</text>
<text x="542" y="90" font-size="12" text-anchor="middle">picks one, opens it</text>
<text x="30" y="150" font-size="14" font-weight="bold" text-anchor="start">Bob says only the identifier; Alice looks up the key</text>
<rect x="30" y="164" width="270" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="165" y="191" font-size="13" text-anchor="middle">Bob: about N/2 tries, one puzzle</text>
<rect x="340" y="164" width="270" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="475" y="191" font-size="13" text-anchor="middle">Eve: N/2 puzzles at N/2 tries each</text>
<text x="30" y="246" font-size="13" text-anchor="start">With N = 1,000 the work is 500 for Bob and 250,000 for Eve.</text>
<text x="30" y="268" font-size="13" text-anchor="start">With N = 1,000,000 it is 500,000 and 250,000,000,000. A quadratic gap, and no better.</text>
</svg>
<figcaption>Figure 17.2. Merkle's puzzles. The thick box is the puzzle Bob happens to open. Eve hears its identifier and still has to find it.</figcaption>
</figure>

**Code it.** The program below builds 2,000 puzzles, each locked with a number below 2,000 (the "weak key"), lets Bob open one, and counts Eve's work. The lock is a hash of the secret used as a pad, so a wrong guess gives gibberish and the right one gives the word "PUZZLE" at the front.

```python
import hashlib, random

rng = random.Random(1974)          # fixed seed so the run repeats; real use needs secrets
N = 2000                           # number of puzzles
HARD = 2000                        # each puzzle hides its key among this many guesses

def lock(secret, data):
    pad = hashlib.sha256(secret.to_bytes(4, "big")).digest()
    return bytes(a ^ b for a, b in zip(data, pad))

# Alice makes N puzzles. Each holds an ID and a session key, locked with a
# small random secret that takes about HARD tries to find.
puzzles, table = [], {}
for i in range(N):
    pid, key = rng.getrandbits(32), rng.getrandbits(64)
    body = b"PUZZLE" + pid.to_bytes(4, "big") + key.to_bytes(8, "big")
    puzzles.append(lock(rng.randrange(HARD), body))
    table[pid] = key

def solve(puzzle):
    for guess in range(HARD):                        # brute force one puzzle
        body = lock(guess, puzzle)
        if body.startswith(b"PUZZLE"):
            return int.from_bytes(body[6:10], "big"), int.from_bytes(body[10:], "big"), guess + 1

# Bob picks one at random, solves it and announces only its ID
pid, bob_key, tries = solve(rng.choice(puzzles))
print("Bob tried", tries, "secrets and sent ID", pid)
print("Alice looks up the ID:", table[pid] == bob_key)

# Eve hears the ID but must solve puzzles until she finds that one
eve = 0
for p in puzzles:
    found, key, t = solve(p)
    eve += t
    if found == pid:
        break
print("Eve tried", eve, "secrets")
```

Output:

```
Bob tried 1752 secrets and sent ID 1279578275
Alice looks up the ID: True
Eve tried 1654764 secrets
```

Bob did about 1,800 tries and Eve about 1.7 million, a ratio of roughly 900. That is the quadratic gap in a run. It is also why nobody used the scheme. A cost that grows only as the square can be matched by an enemy who buys a million times more computers than the honest parties have, and Alice must send all $N$ puzzles through a channel that in 1974 ran at 300 bits a second on a good telephone line. What mattered was a proof of possibility. Before Merkle, serious people thought two strangers could not agree on a secret in public. After him, the question was only how large the gap could be made, and the answer was to look for a calculation with an exponential gap: easy one way and hopeless the other.

Merkle's later work went far beyond the puzzles. He moved to Stanford to work with Martin Hellman and took his doctorate in 1979. His thesis introduced the *hash tree* that carries his name, which was later used for signatures built from hashes alone (§17.9), for Certificate Transparency ([Protocols, chapter 2](../protocols/02-Certificates-and-PKI.md)) and for blockchains. In 1978 he and Hellman published a public-key scheme built on the knapsack problem, a scheme that did not last (§17.9). He later worked at Xerox PARC, and then in nanotechnology.

!!! note "Life story: Ralph Merkle"
    **Born:** 1952 · **Purpose:** to show that two people can agree on a key over a channel an enemy can hear · **Helped:** Diffie and Hellman, who cite his work; his own puzzles (1974, published 1978), the hash tree (1979) and, with Hellman and Diffie, the patent on key exchange · **Status:** puzzles never used, because the attacker's work grows only as the square of the users'; the hash tree is in daily use in Certificate Transparency and in blockchains

!!! note "Life story: Merkle's puzzles"
    **Born:** autumn 1974 as a term-project proposal for CS 244 at Berkeley; published 1978 · **Purpose:** agree on a key over a line everyone can hear · **Helped:** the first open demonstration that it can be done · **Retired:** never put into service, since an attacker needs only the square of the users' effort · **Replaced by:** Diffie-Hellman key exchange (1976), where the gap is exponential

## 17.3 Diffie and Hellman: "New Directions"

*Level: intermediate.*

When Diffie went looking in 1974, the usual story runs, he was sent from one researcher to another until someone told him that a young professor at Stanford named Martin Hellman was working on the same questions. Diffie went to see him, the two talked for hours, and from then on they worked together. The details of the meeting differ between the two men's accounts, and I give the season (the second half of 1974) and nothing more precise. Hellman was born in 1945, took his doctorate at Stanford in 1969, worked at IBM's Watson Research Center and taught at MIT, and returned to Stanford in 1971. Hellman, a specialist in information theory, had turned to cryptography in the early 1970s. Colleagues told him he was wasting his time, since the NSA had a huge budget and a long head start and anything he found would be either old or classified. He had a research grant, and in 1975 Diffie worked under it. Diffie, who did not take a doctorate, has an honorary one from the Swiss Federal Institute of Technology in Zurich (1992).

Merkle joined their conversations by 1975, and for a time the three worked together. They also fought a public argument in those years, with Diffie and Hellman telling the National Bureau of Standards that the key of DES was too short and that a machine could search it ([chapter 16](16-Feistel-Lucifer-and-DES.md)). The warning did not stop him, and the NSA's possible head start was a question that returned in 1977 (§17.7) and again in 1997 (§17.6).

The two men worked toward three ideas, and they were clear about what they did not have. The ideas came together in a paper presented, in an earlier form, at the National Computer Conference in June 1976 as "Multi-user cryptographic techniques", and published in the *IEEE Transactions on Information Theory* in November 1976 as "New Directions in Cryptography". The first sentence reads "We stand today on the brink of a revolution in cryptography." The paper claimed three things.

**A key exchange.** The method that now carries both their names lets two people who share no secret agree on one over an open line. Hellman has described the moment in May 1976 when the thing fell into place, building on conversations with Diffie and Merkle. It rests on a one-way operation: raising a number to a power modulo a prime is easy, and recovering the power from the result, the *discrete logarithm*, is believed to be hard. Alice and Bob agree in public on a large prime $p$ and a number $g$. Alice picks a secret $a$ and sends $g^a \bmod p$; Bob picks a secret $b$ and sends $g^b \bmod p$. Each raises what they received to their own secret, and both arrive at $g^{ab} \bmod p$, which an eavesdropper cannot make without finding $a$ or $b$. [Book 1, chapter 12](../../book/12-Diffie-Hellman.md) teaches why it is correct and how hard the logarithm is. Here is the smallest working version, with a prime small enough for Eve to break.

```python
p, g = 2039, 7                     # a small public prime and base, for show only

a, b = 1234, 567                   # Alice's and Bob's secrets, never sent
A, B = pow(g, a, p), pow(g, b, p)  # sent in the open
print("Alice sends", A, "Bob sends", B)
print("shared:", pow(B, a, p), pow(A, b, p))

# Eve sees p, g, A and B. With a prime this small she can try every exponent:
x = next(x for x in range(p) if pow(g, x, p) == A)
print("Eve finds an exponent", x, "and the secret", pow(B, x, p))
```

Output:

```
Alice sends 24 Bob sends 302
shared: 938 938
Eve finds an exponent 1234 and the secret 938
```

**A definition of a digital signature.** The paper described a value that only the holder of a private key can produce and that anyone can check with the matching public key. It was a definition, and not yet a scheme. It would, the authors wrote, let contracts, orders and money move by computer, and it answered the bank's question: if a message checks against Alice's public key, only Alice could have made it, so she cannot say later that she did not.

**A public-key cryptosystem, as an open problem.** Each person would hold two keys, a public one that anyone can use to encrypt to them and a private one that only they can use to decrypt. The authors could not build one. What they needed they named: a *trapdoor one-way function*, easy to compute, hard to invert, and easy to invert for a person who holds a secret. They asked their readers to find one. §17.4 tells who did.

The paper was careful about its sources. It cited Merkle's work, then still unpublished, and it cited the operating-system practice of storing a one-way image of each password rather than the password itself, an early use of the one-way idea that Diffie, by his own account, had learned about from the Cambridge computer scientist Roger Needham. In later years Hellman asked that the key exchange be called Diffie-Hellman-Merkle, since the idea grew from the three men's conversations and Merkle's puzzles were the first to show it could be done. The name has not caught on. Stanford applied for a patent in September 1977 in the names of Hellman, Diffie and Merkle; US patent 4,200,770 was granted in April 1980 and expired in April 1997. Diffie and Hellman received the Association for Computing Machinery's Turing Award for 2015.

Key exchange alone does not say who is on the other end. A man in the middle can answer both Alice and Bob and exchange a key with each of them separately, and neither would know. This is the seed of the second half of the chapter: signatures and certificates are what turn a key exchange into a conversation between two named parties (§17.8).

!!! note "Life story: Whitfield Diffie"
    **Born:** 1944, Washington, D.C.; grew up in Queens, New York · **Purpose:** to find a way for strangers to share a secret and for a message to carry a signature · **Helped:** the key exchange (1976, with Hellman), the definition of a digital signature, and the public case against the short key of DES; he co-wrote *Privacy on the Line* (1998) with Susan Landau · **Status:** Turing Award 2015; worked at Northern Telecom and then at Sun Microsystems, where he was chief security officer

!!! note "Life story: Martin Hellman"
    **Born:** 1945 · **Purpose:** the same questions, from the side of information theory · **Helped:** the key exchange, the exponentiation-based work with his students (Stephen Pohlig, Ralph Merkle, later Taher Elgamal), the knapsack scheme with Merkle, and the 1977 estimate, with Diffie, of what a machine to search the DES key would cost · **Status:** Stanford professor from 1971, emeritus from 1996; Turing Award 2015; in later years he has worked on the risks of nuclear war

## 17.4 Rivest, Shamir and Adleman: the lock that opens one way

*Level: beginner.*

A preprint of "New Directions" reached the Massachusetts Institute of Technology in the fall of 1976, to a laboratory where three young people were looking for a problem. Ronald Rivest (born 1947) and Adi Shamir (born 1952 in Tel Aviv) were computer scientists. Leonard Adleman (born 1945) was a mathematician with a talent for finding the flaw in an argument. They read the paper and took up Diffie and Hellman's challenge, the trapdoor. For months, as Adleman recalled it, Rivest and Shamir proposed one scheme after another and Adleman broke each one.

Then, in April 1977, after a Passover supper at a student's home, Rivest could not sleep. He lay on a couch with a headache, thought about the problem, and by morning had written down a scheme. Adleman could not break it. The MIT technical memo that describes it is dated 4 April 1977 and is called "On digital signatures and public-key cryptosystems". Adleman has said that he thought the paper the least interesting of his work, and asked that his name go last, which is why the authors are "R, S, A" and not "A, R, S". Whether the story of the sleepless night is exact, it is the one the three tell.

The scheme rests on an observation every number theorist knew: multiplying two large primes is easy, and splitting the product back into them is, as far as anyone knew, very hard. Pick two large primes $p$ and $q$, keep them secret, and publish $n = pq$ with a number $e$. To encrypt $m$, compute $m^e \bmod n$. To decrypt, raise the result to $d$, where $d$ is the inverse of $e$ in the exponent arithmetic modulo $(p-1)(q-1)$. That number can be found only by someone who knows $p$ and $q$. The same keys give signatures: raise a message to $d$ to sign, and anyone can raise the signature to $e$ and compare. The same operation locks in one direction and unlocks in the other, and that is why one scheme served for both of Diffie and Hellman's goals. [Book 1, chapter 13](../../book/13-RSA.md) teaches the arithmetic, its padding and its attacks. Here is the toy that appears in every account.

```python
p, q = 61, 53                      # the secret primes (real ones have ~300 digits)
n, phi = p * q, (p - 1) * (q - 1)
e = 17                             # public exponent
d = pow(e, -1, phi)                # private exponent: e * d = 1 mod phi
print("public", (n, e), "private", d)

m = 1977
c = pow(m, e, n)                   # anyone can encrypt with (n, e)
print(c, pow(c, d, n))             # only the holder of d decrypts

s = pow(m, d, n)                   # a signature: only the holder of d can make it
print(s, pow(s, e, n) == m)        # anyone can check it with e
```

Output:

```
public (3233, 17) private 2753
2943 1977
788 True
```

Two things made the scheme possible in 1977 that would not have helped in 1970. The first was that a computer could now multiply large numbers and find large primes fast. Probabilistic primality tests had appeared in the previous two years (Solovay and Strassen in 1977, Gary Miller in 1976, Michael Rabin after them; [the Mathematics book, chapter 6](../mathematics/06-Primality-Testing.md)), and the inventors used one to find their primes. The second was a public that had been told the problem was open: Diffie and Hellman had stated it and had already made a market for the answer.

The three kept the memo within MIT for a few months. Then it reached the public, through a column in a magazine. Martin Gardner wrote "Mathematical Games" for *Scientific American* for about a quarter of a century, and in the August 1977 issue he devoted it to the new cipher, under the title "A New Kind of Cipher That Would Take Millions of Years to Break". The column explained the scheme in plain language and printed a challenge. It gave a public key with a 129-digit modulus and $e = 9007$, and a message enciphered with it. The inventors offered \$100 to the first person to read the message. The column quoted an estimate that factoring a number of that size with the best method then known would take about 40 quadrillion years. Rivest later said he could not recall how that figure was worked out. The readers were not discouraged. Thousands of them wrote in to ask for the technical memo, which MIT sent out only months later. By one account the delay came after an NSA employee warned that sending it abroad might break the export laws (§17.7). The formal paper, "A Method for Obtaining Digital Signatures and Public-Key Cryptosystems", appeared in the *Communications of the ACM* in February 1978. Its two characters, Alice and Bob, may already have appeared in the memo, and have been in every account of cryptography since.

The patent (US 4,405,829) was assigned to MIT, filed in December 1977 and granted on 20 September 1983. Because the scheme had been described in print before the application, rights outside the United States are usually said to have been lost, and the patent applied in the United States alone. The three founded RSA Data Security in 1982 to sell licenses, and §17.9 comes back to what that firm did. Rivest, Shamir and Adleman received the Turing Award for 2002.

**Try it.** The 1977 challenge has been answered, and you can check the answer yourself. The message in Gardner's column was a single number $c$, below the 129-digit modulus $n$. The factors of $n$ are known (§17.5); with them you can compute the private exponent and decrypt. The numbers below are the ones printed in 1977 and the two factors found in 1994.

```python
n = 114381625757888867669235779976146612010218296721242362562561842935706935245733897830597123563958705058989075147599290026879543541
e = 9007
c = 96869613754622061477140922254355882905759991124574319874695120930816298225145708356931476622883989628013391990551829945157815154
p = 3490529510847650949147849619903898133417764638493387843990820577
q = 32769132993266709549961988190834461413177642967992942539798288533
print(len(str(n)), n.bit_length(), p*q == n)
d = pow(e, -1, (p-1)*(q-1))
m = pow(c, d, n)
s = str(m)
if len(s) % 2: s = "0" + s
print(s)
alpha = " ABCDEFGHIJKLMNOPQRSTUVWXYZ"
print("".join(alpha[int(s[i:i+2])] for i in range(0, len(s), 2)))
```

Output:

```
129 426 True
200805001301070903002315180419000118050019172105011309190800151919090618010705
THE MAGIC WORDS ARE SQUEAMISH OSSIFRAGE
```

The first line checks that the two factors really multiply to $n$ and that the modulus is 129 digits, 426 bits. The plaintext is a long number, and the way it is read is simple: take it two digits at a time, with 00 for a space and 01 to 26 for A to Z. The first pairs are 20, 08, 05, 00, 13, 01, 07, 09, 03, which are T, H, E, a space, M, A, G, I, C. A *squeamish ossifrage* is a fastidious bone-breaker: *ossifrage* is an old word, from the Latin for "bone-breaker", for the lammergeier, the bearded vulture that drops bones from a height to crack them. The phrase is better known than the cipher.

!!! note "Life story: Ron Rivest, Adi Shamir and Leonard Adleman"
    **Born:** Rivest 1947; Shamir 1952, Tel Aviv; Adleman 1945 · **Purpose:** to build the trapdoor function that Diffie and Hellman had asked for · **Helped:** RSA (1977), the first practical public-key encryption and signature scheme; later work includes Rivest's RC4, RC5 and MD5, Shamir's attack on the knapsack scheme (1982) and his differential cryptanalysis with Eli Biham, and Adleman's work on number-theoretic algorithms · **Status:** Turing Award 2002; Rivest and Adleman have stayed in universities, Shamir at the Weizmann Institute

!!! note "Life story: RSA"
    **Born:** April 1977 at MIT; published in *Scientific American* in August 1977 and in the *Communications of the ACM* in February 1978 · **Purpose:** public-key encryption and digital signatures from the difficulty of factoring · **Helped:** the padlock of the web, the signature on software and certificates, and PGP · **Status:** still in wide use; the patent ran out in September 2000; keys of 2048 bits and more are the norm, and a large quantum computer would break it (§17.15)

## 17.5 The squeamish ossifrage: a 129-digit number falls

*Level: intermediate.*

The challenge of 1977 had a lifetime. Gardner's column quoted an estimate of tens of quadrillions of years for a number of about this size, and the estimate was believable in 1977 because of what was then known about factoring. The best general method of the day was the continued-fraction method of Michael Morrison and John Brillhart (1975), whose running time grew faster than any power of the number of digits, and a 129-digit number was far out of reach. Three things changed that, each of them a new idea, not a faster computer. In 1981 Carl Pomerance invented the *quadratic sieve*. Peter Montgomery turned it into a form that could be run in many small independent pieces. And in 1988 and 1989 Arjen Lenstra and Mark Manasse showed that those pieces could be handed out by electronic mail to volunteers, whose spare computer time did the work. [Cryptanalysis, chapter 11](../cryptanalysis/11-Factoring.md) teaches how the sieve works and why splitting it up is possible. This section is about the people.

The organizers of the RSA-129 effort were Derek Atkins, Michael Graff, Arjen Lenstra and Paul Leyland. They began in the fall of 1993. They sent out the sieving program, and volunteers on the Internet (the figure given is about 600 people on about 1,600 machines in 24 countries) ran it in the background on workstations in university labs and offices and mailed back their results, which were pieces called *relations*. The relations were gathered at a central point and fed into a final stage of linear algebra, which had to be done on one large machine. In April 1994 the group announced the two prime factors, of 64 and 65 digits. Eight months of volunteer time had done what the quadrillion-year estimate said would take longer than the age of the universe. The message was decrypted, as you did above, and read THE MAGIC WORDS ARE SQUEAMISH OSSIFRAGE. The prize, \$100, is said to have gone to the Free Software Foundation.

Seventeen years is a long time, and the lesson is not that Rivest was foolish. He took the best method he knew and extended its running time, and his answer was exactly as good as that method. What moved was the method. The same thing happened to the key sizes that followed. The company's own *factoring challenge* of 1991 listed numbers of increasing size, and each fell in turn: RSA-130 in 1996, RSA-155 (512 bits) in August 1999 to a team at the Dutch national research institute CWI led by Herman te Riele, using the number field sieve, a successor to the quadratic sieve that Lenstra, Lenstra, Manasse and Pollard had developed between 1988 and 1990. RSA-768 fell in December 2009 to an international team, and RSA-250 (829 bits) in February 2020, at a cost the authors put at about 2,700 core-years. In 1977 the authors of RSA suggested moduli of about 200 digits (roughly 660 bits) for lasting security, and by the early 1990s most products used 512 bits or 1024 bits. The 512-bit size was where the export rules sat (§17.10), and the 1999 break meant that every product that still used it was weak. Some servers were still using 512-bit export keys in 2015, which is the reason for the FREAK attack that [Protocols, chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md) tells, and by then a 512-bit key could be factored on rented machines in hours.

**Break it.** You can feel the whole story in a small case. The key below has 64 bits, the product of two 10-digit primes. The method is Pollard's rho, published in 1975, two years before the Gardner column. It finds a factor $p$ in about $\sqrt{p}$ steps, which here is on the order of fifty thousand, and then the private key is one line.

```python
from math import gcd

def rho(n, c=1):                           # Pollard's rho, 1975: finds a factor in about sqrt(p) steps
    x = y = 2
    while True:
        x = (x * x + c) % n
        y = (y * y + c) % n
        y = (y * y + c) % n
        g = gcd(abs(x - y), n)
        if 1 < g < n:
            return g
        if g == n:                         # unlucky start: change the constant
            return rho(n, c + 1)

n, e = 12000000097000000133, 65537         # a 64-bit public key
c = 11160206631264991268                   # an intercepted message

p = rho(n)
q = n // p
d = pow(e, -1, (p - 1) * (q - 1))          # with p and q, the private key is one line
print(p, q)
print(pow(c, d, n).to_bytes(8, "big"))
```

Output:

```
4000000007 3000000019
b'OSSIFRAG'
```

The same steps on a 2048-bit modulus would need about $2^{512}$ rho steps, and even the number field sieve, the best known method, needs more than all the computers on Earth could provide. The gap between the instant and the impossible, as the numbers grow, is what public-key cryptography rests on.

!!! note "Life story: RSA-129"
    **Born:** 1977, as the challenge number in Martin Gardner's column (426 bits) · **Purpose:** to show that RSA was safe, and to give the world a number to attack · **Helped:** the first large, public, distributed computation, and the first practical test of what the community's factoring methods could do · **Retired:** factored on 26 April 1994 by Atkins, Graff, Lenstra and Leyland with about 600 volunteers · **Replaced by:** the RSA factoring challenges of 1991 on (RSA-130 to RSA-250, and larger numbers still open)

## 17.6 The secret that was found twice

*Level: intermediate.*

In December 1997 the British government announced that three of its civil servants had discovered the ideas of public-key cryptography years before the Americans, and had been forbidden to say so. The announcement came from GCHQ, the successor of Bletchley Park ([chapter 13](13-Bletchley-Park.md)), and it was accompanied by a set of papers released from the files of its communications-security arm, the Communications-Electronics Security Group, or CESG ([chapter 15](15-Shannon-and-the-Agencies.md) describes how the group came to be). What follows rests on those papers and on the accounts of the three men, and where the record is thin I say so. Figure 17.3 shows the two threads side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Two lanes in time from 1969 to 1998: secret GCHQ discoveries in 1970, 1973 and 1974 above, public discoveries in 1974, 1976 and 1977 below, and GCHQ's announcement in 1997" fill="currentColor" font-size="14">
<text x="30" y="26" font-size="13" font-weight="bold" text-anchor="start">Secret lane (GCHQ)</text>
<line x1="50" y1="110" x2="610" y2="110" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4"/>
<line x1="50" y1="165" x2="610" y2="165" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="69" y="183" font-size="12" text-anchor="middle">1970</text>
<text x="262" y="183" font-size="12" text-anchor="middle">1980</text>
<text x="455" y="183" font-size="12" text-anchor="middle">1990</text>
<text x="590" y="183" font-size="12" text-anchor="middle">1997</text>
<line x1="69" y1="161" x2="69" y2="169" stroke="currentColor" stroke-width="1"/>
<line x1="262" y1="161" x2="262" y2="169" stroke="currentColor" stroke-width="1"/>
<line x1="455" y1="161" x2="455" y2="169" stroke="currentColor" stroke-width="1"/>
<line x1="590" y1="161" x2="590" y2="169" stroke="currentColor" stroke-width="1"/>
<line x1="69" y1="110" x2="69" y2="46" stroke="currentColor" stroke-width="1" opacity="0.6"/>
<circle cx="69" cy="110" r="5" fill="currentColor"/>
<text x="75" y="52" font-size="13" text-anchor="start">Ellis 1970: it is possible</text>
<line x1="127" y1="110" x2="127" y2="68" stroke="currentColor" stroke-width="1" opacity="0.6"/>
<circle cx="127" cy="110" r="5" fill="currentColor"/>
<text x="133" y="74" font-size="13" text-anchor="start">Cocks 1973: RSA-like</text>
<line x1="146" y1="110" x2="146" y2="90" stroke="currentColor" stroke-width="1" opacity="0.6"/>
<circle cx="146" cy="110" r="5" fill="currentColor"/>
<text x="152" y="96" font-size="13" text-anchor="start">Williamson 1974: DH-like</text>
<circle cx="590" cy="110" r="6" fill="currentColor"/>
<text x="584" y="96" font-size="13" text-anchor="end" font-weight="bold">GCHQ tells, 1997</text>
<text x="30" y="204" font-size="13" font-weight="bold" text-anchor="start">Public lane</text>
<line x1="50" y1="224" x2="610" y2="224" stroke="currentColor" stroke-width="1.6"/>
<line x1="146" y1="224" x2="146" y2="252" stroke="currentColor" stroke-width="1" opacity="0.6"/>
<circle cx="146" cy="224" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="152" y="258" font-size="13" text-anchor="start">Merkle 1974: puzzles</text>
<line x1="185" y1="224" x2="185" y2="276" stroke="currentColor" stroke-width="1" opacity="0.6"/>
<circle cx="185" cy="224" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="191" y="282" font-size="13" text-anchor="start">Diffie and Hellman 1976</text>
<line x1="204" y1="224" x2="204" y2="302" stroke="currentColor" stroke-width="1" opacity="0.6"/>
<circle cx="204" cy="224" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="210" y="308" font-size="13" text-anchor="start">Rivest, Shamir, Adleman 1977</text>
</svg>
<figcaption>Figure 17.3. Found twice. Above the dashed line, the secret work at GCHQ; below the solid line, the papers the world read. The secret versions waited in a drawer for more than twenty years. The axis between the lanes is in years, not to the day.</figcaption>
</figure>

**James Ellis.** Ellis was a GCHQ physicist (he had joined in 1952) who in 1969 was at CESG, looking at the problem that this chapter began with: distributing keys. By his own account, written in 1987 and released in 1997, he started from a different question, whether a secure message could be sent without any shared secret at all. He remembered a wartime Bell Telephone Laboratories report on a speech scrambler in which the *receiver* added noise to the line, which the sender did not know, and then removed it again. The enemy could not take the noise off, and the sender had needed no key at all. That, Ellis saw, was an existence proof of the idea in miniature: a secret that belongs to the receiver and is never shared. Could the same be done for digital messages? In January 1970 he wrote a CESG paper, "The Possibility of Secure Non-Secret Digital Encryption", arguing that it could, in principle. He called it *non-secret encryption* because the enciphering information would not be secret. He had no way to build it. He tried several ideas and none worked. He had shown that the thing was not impossible, and that was the most anyone at GCHQ could do for three years.

**Clifford Cocks.** Cocks, born in 1950 and fresh from university in mathematics, joined GCHQ in September 1973. A colleague mentioned Ellis's idea to him, and Cocks, who has said he thought of it as a pleasing piece of number theory and not as something world-shaking, thought about it that evening. Within about half an hour, in his own account, he had a scheme. His note of 20 November 1973 has the title "A Note on 'Non-Secret Encryption'". The scheme is, in effect, RSA with the public exponent set equal to the modulus. Take two primes $p$ and $q$, chosen so that neither divides one less than the other, and publish $n = pq$. To encrypt $m$, compute $m^n \bmod n$. The receiver, who knows $p$ and $q$, can invert the exponent $n$ in the arithmetic modulo $(p-1)(q-1)$ and recover $m$. The condition on the primes is what makes the inverse exist. Here it is in a few lines, with the same small primes as the RSA toy and a second pair that fails the condition.

```python
from math import gcd

# Cocks, November 1973: the public exponent is the modulus itself.
# That only works when n and (p-1)(q-1) have no common factor.
for p, q in ((61, 53), (7, 29)):
    n, phi = p * q, (p - 1) * (q - 1)
    print(p, q, "gcd(n, phi) =", gcd(n, phi), "-> usable" if gcd(n, phi) == 1 else "-> not usable")

p, q = 61, 53
n, phi = p * q, (p - 1) * (q - 1)
d = pow(n, -1, phi)                # only the holder of p and q can find this
m = 1977
c = pow(m, n, n)                   # anyone can do this with n alone
print("ciphertext", c, "decrypts to", pow(c, d, n))
```

Output:

```
61 53 gcd(n, phi) = 1 -> usable
7 29 gcd(n, phi) = 7 -> not usable
ciphertext 1520 decrypts to 1977
```

**Malcolm Williamson.** Williamson was an old friend of Cocks's who had also joined GCHQ. Cocks told him about the scheme, and Williamson, by his own telling, did not believe it could be true, and set out to find the flaw. He did not find one, and in January 1974 he wrote "Non-Secret Encryption Using a Finite Field", which describes a method of agreeing a secret by exponentiation in a finite field. In August 1976, "Thoughts on Cheaper Non-Secret Encryption" refined it, and the refined form is the Diffie-Hellman exchange of §17.3 in all but name. The two men worked in the same building, thought about the same problem, and found the two halves of what the world then learned in 1976 and 1977.

GCHQ did not use the ideas. The papers and the later accounts give several reasons, and the first is the one that matters most: the computers of the early 1970s were too slow for exponentiation with large numbers, and there was no tactical radio or handset on which it could be done. A second, as I read the accounts, is that the ideas were a solution to a problem that nobody yet had in a form that justified the effort. A third was habit: the agency kept its own work to itself, as it had for thirty years. When Diffie and Hellman published in 1976 and the RSA authors in 1977, GCHQ decided to keep its own work secret, and it did. Ellis died on 25 November 1997, a few weeks before the announcement. Cocks gave a first public talk about the work in December 1997 (18 December is the date usually given; I did not check the place), and Ellis's 1987 account of the story, "The History of Non-Secret Encryption", was released with the papers.

**What the papers do not show.** There are two qualifications that the sources force. The first is that nothing in the GCHQ papers describes digital signatures, the other half of Diffie and Hellman's paper. The British work is about encryption and key agreement. The second is about the NSA. Bobby Ray Inman, who directed the agency from 1977 to 1981, has been reported as saying that the NSA had known of public-key ideas well before the academics, and in some accounts as early as the 1960s. I have found no document that supports the claim, and the NSA has not published one. It may be true, and it may be an agency's reflex to say that it was there first. The evidence for the British claim is a set of dated, signed papers. The evidence for the American one is an assertion in interviews, and the honest position is that it is unproved.

There is no sign that anyone at Stanford, MIT or Berkeley knew of the British work. Whether the secrecy delayed public-key cryptography by years, by making the British unable to publish or to join the debate, or hastened it by leaving the field to those who would, the record does not say.

!!! note "Life story: James Ellis"
    **Born:** 1924 · **Purpose:** to show that a message can be sent securely with no shared secret · **Helped:** the existence proof of "non-secret encryption" (CESG, January 1970), which led to Cocks's and Williamson's schemes; his 1987 history of the work · **Status:** died 25 November 1997, weeks before GCHQ announced the discovery, so he did not see his work recognized

!!! note "Life story: Clifford Cocks"
    **Born:** 1950 · **Purpose:** to find a one-way function with a trapdoor, for Ellis's idea · **Helped:** the first RSA-like scheme (20 November 1973), found in a single evening; later a long career at GCHQ, and in 2001 an identity-based encryption scheme in the open literature · **Status:** the scheme was never used by GCHQ; made public in December 1997

!!! note "Life story: Malcolm Williamson"
    **Born:** 1950 · **Purpose:** to show that Cocks's idea could not be true, and then to find the other half of it · **Helped:** an exponentiation key agreement (January 1974) and its refinement (1976), which is Diffie-Hellman in all but name · **Status:** secret until 1997

## 17.7 The NSA meets the universities

*Level: intermediate.*

By 1977 the National Security Agency had been, for a quarter of a century, the only place in the free world where cryptology was done at scale ([chapter 15](15-Shannon-and-the-Agencies.md)). Thousands of people worked inside its fence. The universities had almost no cryptographers. Within three years, a student's term paper, a pair of Stanford researchers, a magazine column and a design competition for a standard cipher had broken the monopoly. The agency's response is best told in the dates.

In July 1977, as the RSA memo was spreading and the Gardner column had just appeared, Joseph A. Meyer, an NSA employee, wrote a letter to the IEEE. He warned that publishing and presenting cryptographic research abroad might violate the arms-export laws, the International Traffic in Arms Regulations (ITAR, §17.10), which treat the export of technical data as an export of arms. The letter was read as aimed at the IEEE's international symposium on information theory, to be held at Cornell in October 1977, where Hellman and his students had papers. By the accounts I know, Meyer wrote as a private citizen and the NSA later said that he did not speak for it; the effect was the same. Hellman has told the story many times. He took advice from Stanford's lawyers, who told him that the First Amendment protected publication and that the university would stand behind him, and his graduate students read the papers at Cornell. Nothing happened. The episode brought the question of publication into the open.

The agency used other tools. Under a law of 1951 (the Invention Secrecy Act) the Patent Office can, at an agency's request, put a *secrecy order* on a patent application, which forbids the inventor to disclose or even to discuss the invention. In 1977 and 1978 orders of this kind were placed on cryptographic applications from outside inventors, including one from George Davida of the University of Wisconsin-Milwaukee, who had filed an application for a cipher device; the orders were lifted after protests. The episodes show how the agency saw the matter. An invention, to it, could be born secret, whatever the inventor thought.

Bobby Ray Inman, a Navy admiral who became director of the NSA in July 1977, took the argument into the open. He gave public talks in 1978 and 1979 (the speech of January 1979 is in the journal *Cryptologia*) to say that unrestricted publication of cryptographic research was a danger to national security and to ask for the scientific community's cooperation, and said that legislation might follow if it did not come. In response, the American Council on Education, at the NSA's suggestion, set up a Public Cryptography Study Group in 1980, with academics and one representative from the agency. It reported in early 1981, and its main recommendation was a *voluntary* scheme: authors who wished could send their cryptographic papers to the NSA for review before submitting them to a journal, and the agency would say within a short time whether it objected. Inman accepted, and the scheme ran through the 1980s. The first CRYPTO conference was held at the University of California, Santa Barbara, in August 1981, in the very year the scheme began. [Chapter 16](16-Feistel-Lucifer-and-DES.md) tells of the first conferences and journals as part of the story of DES.

A House committee looked at the matter in 1980. Its subcommittee on government information held hearings with the title "The Government's Classification of Private Ideas", at which the NSA, the academics and the inventors with secrecy orders all testified. The hearings did not change the law but they put the agency's methods on the record. A later Reagan directive (NSDD-189, 1985) set the policy that the results of fundamental research should remain unrestricted unless classified, which for the universities was close to the end of the matter.

The struggle then moved from the universities to the market. In 1984 another directive (NSDD-145) gave the NSA authority over the security of civilian computer systems. Congress objected, and the Computer Security Act of 1987 gave the responsibility for civilian systems to the National Bureau of Standards (renamed NIST in 1988). In practice a memorandum of understanding of 1989 had NIST and the NSA coordinate their standards work, and critics said it left the NSA with the last word. The Digital Signature Algorithm of the early 1990s (§17.9) was made under it, and critics pointed to that.

The agency never lost the habit of its dual mission, protecting and breaking, which [chapter 15](15-Shannon-and-the-Agencies.md) explains. What had changed by the early 1980s was that the argument was now being conducted in public, before a Congress, a press and a technical community that had its own cryptographers, and that it had begun to lose some of the rounds.

## 17.8 Whose key is this? Certificates and the first protocol bugs

*Level: intermediate.*

A public key solves the problem of carrying a secret, and it raises another one at once. If Alice looks up Bob's public key in a directory, how does she know that the key in the directory is Bob's? An attacker who can slip his own key into the directory under Bob's name will read Bob's mail and sign in his name, and nothing in the mathematics will object. Diffie and Hellman had pictured a public file kept by a trusted party. The question was what the trusted party should put in it.

Loren Kohnfelder, an undergraduate at MIT working under Leonard Adleman, gave the answer in his bachelor's thesis of May 1978, "Towards a Practical Public-Key Cryptosystem". Instead of making Alice trust a directory that is consulted live, let the authority sign each entry once. A *certificate* is a name and a public key, signed by the authority. Alice, who holds the authority's public key, can check a certificate with no connection to the authority at all, and the certificate can travel with the key, through any channel, safely. The only thing she has to know in advance is one public key, the authority's. The program below makes a certificate with the toy RSA of §17.4 and shows both the check and the failure of a forgery. (It uses two known prime numbers that are not secret, so it is a toy and nothing more.)

```python
import hashlib

def make_key(p, q, e=65537):             # toy RSA key from two known primes (never do this for real)
    n = p * q
    return (n, e), pow(e, -1, (p - 1) * (q - 1))

def digest(text, n):                      # hash the certificate text down to a number below n
    return int.from_bytes(hashlib.sha256(text.encode()).digest(), "big") % n

def sign(text, priv, pub):
    return pow(digest(text, pub[0]), priv, pub[0])

def verify(text, sig, pub):
    return pow(sig, pub[1], pub[0]) == digest(text, pub[0])

ca_pub, ca_priv = make_key(2**127 - 1, 2**107 - 1)       # the authority everyone trusts
bob_pub, bob_priv = make_key(2**61 - 1, 2**89 - 1)       # Bob's own key pair
mal_pub = (2**31 - 1) * (2**19 - 1), 65537               # Mallory's public key

# Kohnfelder's idea: a name and a public key, signed by the authority
text = "name=Bob;n=%d;e=%d" % bob_pub
cert = (text, sign(text, ca_priv, ca_pub))

# Alice knows only the authority's public key. She checks Bob's certificate:
print("Bob's certificate checks out:", verify(cert[0], cert[1], ca_pub))

# Mallory swaps his key into Bob's certificate and keeps the old signature:
fake = "name=Bob;n=%d;e=%d" % mal_pub
print("Mallory's swapped key checks out:", verify(fake, cert[1], ca_pub))
```

Output:

```
Bob's certificate checks out: True
Mallory's swapped key checks out: False
```

The idea moved quickly from thesis to standard. The international telephone standards body, then called the CCITT, published the X.509 certificate format in 1988 as part of its X.500 directory standard, and it is the format of the certificates on the web today. A set of Internet standards for *Privacy-Enhanced Mail* (RFC 1421 to 1424, 1993) tried to build a worldwide hierarchy of authorities on it. In 1995 a company named VeriSign, spun out of RSA Data Security, began to sell certificates to web sites, because the browser that had just appeared needed someone to sign them (§17.10). The company in effect became the first large commercial authority. [Protocols, chapter 2](../protocols/02-Certificates-and-PKI.md) tells how certificates are checked and how the authorities were later watched, and [book 1, chapter 16](../../book/16-PKI-and-Key-Establishment.md) teaches the mechanism. PGP, which appeared in 1991, chose a different answer, a web of people who vouch for each other's keys (§17.11). The two models, a hierarchy and a web, are still the two poles of the argument about who should be trusted to say whose key is whose.

Kohnfelder went on to be a software engineer at Microsoft and Google, and he is also known as one of the people behind the STRIDE method of threat modeling.

**A protocol can be wrong even when its cipher is right.** The second lesson of these years came from the people who tried to build working systems. In 1978 Roger Needham of Cambridge University and Michael Schroeder, then at Xerox PARC, published "Using Encryption for Authentication in Large Networks of Computers", with two protocols for two parties to find each other and agree a key with the help of a trusted server, one using shared secret keys and one using public keys. The protocols were short and clever. In 1981 Dorothy Denning, then at Purdue University, and Giovanni Sacco published a two-page note in the *Communications of the ACM*, "Timestamps in Key Distribution Protocols", that found a hole in the first. In the protocol, the server gives Alice a *ticket* for Bob, sealed under the key that Bob shares with the server, which contains the new session key and Alice's name. Nothing in the ticket says when it was made. If an enemy ever learns an old session key (by cryptanalysis, by theft, by an employee's carelessness), she can replay the old ticket to Bob, who will accept it as new and agree to use the old key, which the enemy knows. The fix that Denning and Sacco proposed was a timestamp that the server seals inside the ticket and that Bob checks against his own clock. The program below shows the attack and the fix with a toy cipher.

```python
import hashlib, hmac

def seal(key, data):                       # toy authenticated encryption: xor with a hash stream + tag
    stream = hashlib.sha256(key + b"stream").digest() * 4
    body = bytes(a ^ b for a, b in zip(data, stream))
    return body + hmac.new(key, body, "sha256").digest()[:8]

def unseal(key, box):
    body, tag = box[:-8], box[-8:]
    if not hmac.compare_digest(tag, hmac.new(key, body, "sha256").digest()[:8]):
        raise ValueError("bad tag")
    stream = hashlib.sha256(key + b"stream").digest() * 4
    return bytes(a ^ b for a, b in zip(body, stream))

K_bs = b"key shared by Bob and the server"
old_Kab = b"session-key-1981"               # a session key from day 1; Mallory later steals it

# Day 1: the server made Alice a ticket for Bob: the key, the day, and Alice's name
ticket = seal(K_bs, old_Kab + b"01" + b"Alice")

def bob(box, today, max_age=None):
    data = unseal(K_bs, box)
    key, day, who = data[:16], int(data[16:18]), data[18:].decode()
    if max_age is not None and today - day > max_age:
        return "refused: ticket is too old"
    return "accepted: key %s, peer %s" % (key.decode(), who)

# Needham and Schroeder, 1978: nothing tells Bob a ticket is old
print("day 5, Mallory replays the ticket:", bob(ticket, today=5))
# Denning and Sacco, 1981: the server stamps the ticket, and Bob checks the stamp
print("day 5, with a 2-day limit:        ", bob(ticket, today=5, max_age=2))
print("day 2, with a 2-day limit:        ", bob(ticket, today=2, max_age=2))
```

Output:

```
day 5, Mallory replays the ticket: accepted: key session-key-1981, peer Alice
day 5, with a 2-day limit:         refused: ticket is too old
day 2, with a 2-day limit:         accepted: key session-key-1981, peer Alice
```

(In the toy the day is already inside the ticket for both runs, and the first call simply declines to look at it. That is the point: the data existed but the check did not.) The timestamp went into Kerberos, the system built at MIT's Project Athena in the 1980s, and Kerberos is still in use ([Protocols, chapter 12](../protocols/12-Kerberos.md)). The public-key protocol in Needham and Schroeder's paper fared worse. It stood for seventeen years, until in 1995 the British computer scientist Gavin Lowe, using a program that tries every interleaving of messages (a model checker), found that a dishonest member of the network could use one honest run to impersonate the first party to the second. The lesson was that a protocol needs to be checked as carefully as a cipher, and that people who had read it carefully for seventeen years had not found a flaw that a machine found. [Cryptanalysis, chapter 19](../cryptanalysis/19-Protocol-Breaks.md) takes up such breaks.

Dorothy Denning was a leading figure in these years. She took her doctorate at Purdue in 1975 and wrote the textbook *Cryptography and Data Security* (1982). Her research ranged more widely than cryptography: a model of intrusion detection (1987), worked out at SRI International, was an early step toward the intrusion detection systems that followed. In the 1990s she became one of the best known public supporters of the government's key-escrow proposals, which §17.12 tells, and for that she was criticized by many of her colleagues. She reviewed the Skipjack cipher as one of five outside experts in 1993. Whatever one thinks of her side of the argument, she argued it in public and under her own name, which was not true of everyone.

!!! note "Life story: the certificate"
    **Born:** May 1978, in Loren Kohnfelder's MIT bachelor's thesis · **Purpose:** to bind a name to a public key so that the binding can be checked without asking anyone · **Helped:** X.509 (1988), Privacy-Enhanced Mail (1993), SSL and the web's padlock (1995), code signing, and the hierarchy of authorities · **Status:** in daily use, with the weaknesses of its authorities well known ([Protocols, chapter 2](../protocols/02-Certificates-and-PKI.md))

!!! note "Life story: Dorothy Denning"
    **Born:** 1945 · **Purpose:** to make secure computing a matter of mathematics and measurement · **Helped:** the Denning-Sacco timestamp attack and fix (1981), the book *Cryptography and Data Security* (1982), an early model of intrusion detection (1987), and a long public role in the escrow debate (1993 on) · **Status:** professor at Georgetown University and later at the Naval Postgraduate School; her support for key escrow cost her the agreement of many colleagues, but not their respect for the rest of her work

## 17.9 More trapdoors, a curve and a wall of patents

*Level: intermediate.*

Once the first two schemes were out, everyone wanted to know whether there were others, and whether they were better. The years from 1978 to 1991 were a time of proposals and failures, and a few of the proposals lasted.

**The knapsack and its fall.** In 1978 Merkle and Hellman published a scheme built on the *knapsack problem*, in which one is given a set of numbers and a total and must find the subset that adds up to it. The scheme was faster than RSA and widely admired. Merkle offered \$100 to anyone who could break a version of it and \$1,000 for a stronger one. Adi Shamir broke the first version in 1982 and Ernest Brickell the stronger one in 1984, and by the end of the decade nearly all the knapsack schemes had gone. The lesson was one that would come back: a mathematical problem that is hard in general may be easy for the special cases that a cipher uses. In the same year as the knapsack, 1978, Robert McEliece of the Jet Propulsion Laboratory proposed a scheme based on error-correcting codes. Its keys were too large for the computers of the time, and it was forgotten for a long time. It is now one of the candidates for the post-quantum age ([Post-quantum cryptography, chapter 13](../post-quantum/13-Code-Based-Encryption-McEliece.md)).

**Signatures from nothing but hashes.** In 1979 Leslie Lamport at SRI showed how to build a one-time signature from a hash function alone, and Merkle showed in his thesis how a tree of hashes could turn many one-time signatures into a signature scheme with one public key. These looked like curiosities beside RSA. In the 2010s, when quantum computers began to look possible, they became the basis of the signature standards that do not depend on factoring ([Post-quantum cryptography, chapter 11](../post-quantum/11-Stateful-Hash-Based-Signatures.md)). Michael Rabin proposed in 1979 an encryption and signature scheme as hard to break as factoring itself, which RSA was not known to be.

**What it means to be secure.** Until the early 1980s nobody could say what it meant for a public-key system to be secure, beyond the statement that nobody had broken it. In 1982 Shafi Goldwasser and Silvio Micali, of Berkeley and MIT, gave a precise answer in a paper on *probabilistic encryption* (the journal version is from 1984). A good encryption scheme must not reveal even a single bit of information about the message to an attacker who has bounded time, and for that the encryption has to be randomized, so that the same message does not always give the same ciphertext. Their definition, *semantic security*, is the base of the modern theory ([book 1, chapter 17](../../book/17-Defining-Security.md)). Goldwasser, Micali and Charles Rackoff followed it in 1985 with the zero-knowledge proof, a way to prove that you know a secret without revealing it, and Amos Fiat and Adi Shamir in 1986 turned such a proof into a signature ([Advanced protocols and privacy, chapter 6](../advanced/06-Sigma-Protocols-and-Fiat-Shamir.md)). Lenore Blum, Manuel Blum and Michael Shub in 1986 gave a random-number generator that is as hard to predict as factoring is ([Cryptanalysis, chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md) tells how generators fail). Goldwasser and Micali received the Turing Award for 2012.

**ElGamal, Schnorr and the DSA.** Taher Elgamal, a Cairo-born student of Hellman's, published in 1985 a public-key encryption scheme and a signature scheme based on the discrete logarithm. His signature is the ancestor of most that followed. Claus-Peter Schnorr of Frankfurt published in 1989 a shorter and more elegant signature, intended for smart cards, and patented it in the United States. In August 1991 the National Institute of Standards and Technology proposed a *Digital Signature Standard* built on the same family, designed at the NSA by David Kravitz. It was issued as FIPS 186 in May 1994. The proposal was criticized from the first: the NSA's hand in a civilian standard (§17.7), a fixed 512-bit key size that was soon enlarged, and no encryption with it. And the patents would not stay out of it. A company named Public Key Partners, formed about 1990 by RSA Data Security and Cylink to hold and license the Stanford and MIT patents together, claimed that the standard infringed. In 1993 NIST proposed to give PKP an exclusive license, which brought protests, and it withdrew the proposal; in 1994 it announced that the algorithm would be available without royalty. The standard took almost three years from proposal to issue. [Book 1, chapter 14](../../book/14-Discrete-Log-Systems.md) teaches ElGamal, DSA and Schnorr, and [Cryptanalysis, chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md) the way they fail.

**Elliptic curves.** In 1985 Neal Koblitz at the University of Washington and Victor Miller at IBM, independently, suggested doing Diffie-Hellman and similar schemes in the group of points on an *elliptic curve* over a finite field, in place of the numbers modulo a prime. The curves were in the air: Hendrik Lenstra's new method of factoring, which used elliptic curves, had just shown how rich they were ([Cryptanalysis, chapter 11](../cryptanalysis/11-Factoring.md)). The point of using them was size. The best attacks on the elliptic-curve discrete logarithm are much weaker than those on factoring, so a 256-bit curve key gives about the security of a 3072-bit RSA key ([book 1, chapter 15](../../book/15-Elliptic-Curves.md) and [the Mathematics book, chapter 12](../mathematics/12-Elliptic-Curve-Group.md) teach why). It took two decades for the idea to catch on, slowed by unfamiliar mathematics and by patents, many held by the Canadian firm Certicom. The first national standards came at the end of the 1990s, and in January 2000 the update of the Digital Signature Standard (FIPS 186-2) added the elliptic-curve version, ECDSA, with a set of NIST curves. Koblitz and his wife, the historian of science Ann Hibner Koblitz, founded in 1985 the Kovalevskaia Fund, which supports women scientists in developing countries.

**A wall of patents.** Every one of these schemes met a patent. The Diffie-Hellman patent (US 4,200,770) belonged to Stanford. The RSA patent belonged to MIT. RSA Data Security, founded in 1982 and run from 1986 by Jim Bidzos, held the right to license RSA, and through Public Key Partners the Stanford patents as well, one of which its holders read as covering all public-key encryption. For ten years that meant a business that wished to use public-key cryptography in the United States needed licenses from a single firm. Security Dynamics bought RSA Data Security in 1996, and in 2000 the combined company took the name RSA Security. The Diffie-Hellman patent expired in April 1997. On 6 September 2000, two weeks before the RSA patent was due to end, RSA Security released the algorithm to the public domain, and the patent lapsed on 20 or 21 September (sources differ on the day). Most accounts agree that the patents slowed the spread of public-key cryptography in the United States, and shaped it: PGP's trouble with RSA (§17.11), the DSA's dispute, and the interest in elliptic curves and in the unpatented Diffie-Hellman all follow from them.

!!! note "Life story: Shafi Goldwasser"
    **Born:** 1958, New York · **Purpose:** to say exactly what it means for encryption to be secure · **Helped:** probabilistic encryption and semantic security (1982 and 1984, with Silvio Micali), zero-knowledge proofs (1985, with Micali and Charles Rackoff), and the theory of interactive proofs · **Status:** professor at MIT and at the Weizmann Institute; Turing Award for 2012, shared with Micali

!!! note "Life story: Taher Elgamal"
    **Born:** 1955, Cairo · **Purpose:** to build encryption and signatures on the discrete logarithm · **Helped:** the ElGamal scheme (1985), from which the DSA and Schnorr signatures descend; later the chief scientist of Netscape, where the security of the first web browsers was shaped (§17.10) · **Status:** his encryption scheme is in OpenPGP, his signature in the history of every discrete-log scheme

!!! note "Life story: Neal Koblitz and Victor Miller"
    **Born:** Koblitz 1948; Miller 1947 · **Purpose:** to make Diffie-Hellman and signatures smaller and faster, using elliptic curves · **Helped:** elliptic-curve cryptography (1985, independently), which now protects most key exchanges and many signatures on the Internet · **Status:** curves of 256 bits do the work of RSA keys of 3072 bits; the patents ran out, and curves like Curve25519 followed

!!! note "Life story: Public Key Partners"
    **Born:** about 1990, by RSA Data Security and Cylink · **Purpose:** to license the Stanford and MIT patents together · **Helped:** made licensing public-key cryptography in the United States a single negotiation, for better and for worse; it threatened the DSA and PGP · **Retired:** with the expiry of the Stanford patents in 1997 and of the RSA patent in 2000

## 17.10 Cryptography as a munition: the export rules

*Level: beginner.*

The tools of §17.4 to §17.9 were published, taught in universities and sold by a few small companies. They also belonged, in law, to a category that had nothing to do with universities. Since the Second World War the United States had treated cryptographic equipment as a weapon of war. The Arms Export Control Act of 1976 gave the President power to control the export of "defense articles", and the International Traffic in Arms Regulations (ITAR), administered by the State Department, listed them in the United States Munitions List. Cryptographic devices, software and "technical data" about them sat in Category XIII, with the auxiliary military equipment, near tanks and missiles. To export any of it you needed a license from the State Department, which on cryptography took the advice of the NSA, and that advice carried the day. The same rules reached the technical data: to send the source of a cipher abroad was, on the face of the text, to export a weapon.

For most of the 1970s and 1980s this was a rule that applied to a few makers of cipher machines and to the banks, which got licenses for DES. Then, in the early 1990s, software began to cross borders by itself. A program on a diskette, or later a file on a server, was easier to export than a tank; it was also easier to sell. The software makers asked what they could sell. After talks with the State Department and the NSA, the Software Publishers Association reached an agreement in 1992 under which products using the two ciphers RC2 and RC4, with keys limited to 40 bits, would get quick approval. The rule became the standard. Almost every program sold abroad in the following years used 40-bit keys, whatever it used at home.

Forty bits was weak even by the standards of 1992. The key space is $2^{40}$, about $10^{12}$ keys, and at a million keys a second a single machine searches it in about two weeks, a thousand machines in a few minutes. The program below tries a toy version of the search and prints how the work doubles with each bit, so that you can see why 40 was a deliberate choice.

```python
import hashlib

def keystream(key, n):
    return hashlib.sha256(key.to_bytes(8, "big")).digest()[:n]

def crypt(key, data):
    return bytes(a ^ b for a, b in zip(data, keystream(key, len(data))))

# A toy "export grade" cipher with a 20-bit key. Every web request started alike,
# so the attacker knows the first bytes and tests each key against them.
secret = 777777
sealed = crypt(secret, b"GET / HTTP/1.0")
tries = 0
for guess in range(2**20):
    tries += 1
    if crypt(guess, sealed).startswith(b"GET /"):
        break
print("found key", guess, "after", f"{tries:,}", "tries")

def nice(s):                                   # seconds in words
    if s < 1:
        return "under a second"
    if s < 2:
        return "about a second"
    for unit, size in (("years", 31_557_600), ("days", 86_400), ("hours", 3600), ("minutes", 60)):
        if s >= size:
            years = s / size
            return f"{years:.1e} {unit}" if years >= 1e6 else f"{years:,.1f} {unit}"
    return f"{s:,.0f} seconds"

# Each extra bit doubles the work. Assume 1,000,000 keys a second per machine:
print("bits   one machine          1,000 machines")
for bits in (20, 40, 56, 64, 80, 128):
    secs = 2**bits / 1_000_000
    print(f"{bits:>4}   {nice(secs):<20} {nice(secs / 1000)}")
```

Output:

```
found key 777777 after 777,778 tries
bits   one machine          1,000 machines
  20   about a second       under a second
  40   12.7 days            18.3 minutes
  56   2,283.4 years        2.3 years
  64   584,542.0 years      584.5 years
  80   3.8e+10 years        3.8e+07 years
 128   1.1e+25 years        1.1e+22 years
```

The numbers are an assumption (a million keys a second, a thousand machines), but the shape is not. A key of 40 bits falls to a lab, 56 to a government or a large company, and 128 to nobody. In January 1996 seven cryptographers, among them Diffie, Rivest and Blaze, put prices on this in a report that recommended at least 75 bits for any new system ([Cryptanalysis, chapter 4](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md) gives the detail). The searches themselves were run, and the results made the point (Figure 17.4 sets the three key lengths side by side). In August 1995 a French student at INRIA, Damien Doligez, broke a session of the international version of Netscape's browser, encrypted with a 40-bit RC4 key, using, by the usual account, spare time on about 120 workstations over eight days; the challenge had been posted on the cypherpunks mailing list. In January 1997 Ian Goldberg, a Berkeley student, solved a 40-bit challenge set by RSA Data Security in three and a half hours on a cluster of a few hundred workstations. The 56-bit DES key fell in 1998 to a machine built by the Electronic Frontier Foundation ([chapter 16](16-Feistel-Lucifer-and-DES.md)).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bars for key lengths of 40, 56 and 128 bits with the dates and times at which the short ones were broken" fill="currentColor" font-size="14">
<text x="30" y="26" font-size="14" font-weight="bold" text-anchor="start">Key length in bits, and what it bought</text>
<text x="86" y="68" font-size="13" text-anchor="end">40 bits</text>
<rect x="94" y="50" width="80" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="184" y="60" font-size="12" text-anchor="start">export limit from 1992 (RC2, RC4)</text>
<text x="184" y="76" font-size="12" text-anchor="start">1995: 8 days (Doligez). 1997: 3.5 hours (Goldberg)</text>
<text x="86" y="138" font-size="13" text-anchor="end">56 bits</text>
<rect x="94" y="120" width="112" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="216" y="130" font-size="12" text-anchor="start">DES; allowed with key recovery from 1996</text>
<text x="216" y="146" font-size="12" text-anchor="start">1998: 56 hours (EFF's machine, chapter 16)</text>
<text x="86" y="208" font-size="13" text-anchor="end">128 bits</text>
<rect x="94" y="190" width="256" height="26" rx="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.5"/>
<text x="360" y="200" font-size="12" text-anchor="start">United States domestic version of the browsers</text>
<text x="360" y="216" font-size="12" text-anchor="start">no one has searched a space this size</text>
<text x="30" y="256" font-size="13" text-anchor="start">1996: encryption moves to the Commerce Department. January 2000: strong</text>
<text x="30" y="276" font-size="13" text-anchor="start">retail products allowed almost everywhere. Bar length is proportional to the key length.</text>
</svg>
<figcaption>Figure 17.4. What the export limit allowed and what happened to it. The 128-bit bar is more than three times the length of the 40-bit bar, and the space it describes is $2^{88}$ times larger.</figcaption>
</figure>

**What Netscape and others did.** The company that mattered most was Netscape. Its browser, with the Secure Sockets Layer (SSL) that it had designed, appeared in 1994 and 1995 and put RSA and a symmetric cipher into the hands of millions of people for the first time. Each of its two versions had to meet a different rule. The American edition used a 128-bit key. The international edition, by the rules of the day, used 40 bits. In the SSL 2.0 protocol the export edition did something odd: it generated a 128-bit key, sent 88 of its bits in the clear and kept only the remaining 40 secret, which satisfied the letter of the rule and left the protocol the same for both editions. For the web, the result was two classes of user, and for banks and shops in other countries a standing risk. The story of how the export grades came back to bite in 2015, long after they had been abolished, is the story of the FREAK and Logjam attacks ([Protocols, chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md); [Cryptanalysis, chapter 12](../cryptanalysis/12-Discrete-Logarithms.md)). In September 1995, a few weeks after Doligez, Ian Goldberg and David Wagner showed that Netscape's random-number generator for the keys was so predictable that a session could be broken in minutes, whatever the nominal key length ([Cryptanalysis, chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md)). The export rules had made the weak keys; carelessness made the strong keys weak.

Other firms found other bargains. The Lotus Notes groupware, among the first mass-market products to use RSA, shipped from 1989. According to later reports, the exportable edition of Notes in the late 1990s used a 64-bit key of which 24 bits were enciphered under a public key of the NSA and attached to every message, so that the NSA could recover them and had to search only 40. The arrangement became public in 1997, and Lotus and IBM defended it as the price of an export license. Outside the United States the answer was simply to build the programs somewhere else. An Australian programmer, Eric Young, wrote SSLeay, a free SSL library, in the mid-1990s; it was developed beyond the reach of the ITAR and became the base of OpenSSL in 1998. Thawte, a South African firm founded by Mark Shuttleworth, sold certificates for web servers from 1995 without any of the American limits. In 1999 a researcher found in a Windows file a variable named `_NSAKEY`, next to a second key used to check code signatures. Microsoft said that the name reflected the NSA's review of its cryptographic modules for export and that nothing was hidden. The doubt that the incident raised did not go away.

By the mid-1990s other governments had their own rules. France required a license to use any encryption until the late 1990s, and relaxed its law only in stages, and Britain, Russia and others had controls of various kinds. In July 1996 about thirty-three countries, the United States among them, concluded the Wassenaar Arrangement, a voluntary pact to control the export of conventional arms and "dual-use" goods, with cryptography in its list, and revised the terms for mass-market encryption in 1998. The Arrangement replaced COCOM, the Cold War committee that had done the same job against the Soviet bloc.

## 17.11 Pretty Good Privacy

*Level: beginner.*

While the companies bargained, an individual gave the thing away. Philip Zimmermann was a software engineer in Boulder, Colorado, who had worked on the nuclear freeze campaign in the 1980s. By his own account he had followed public-key cryptography since the Gardner column and had written an RSA implementation as early as 1984. In January 1991 the Senate considered a bill against violent crime, S. 266, which contained a "sense of Congress" provision that makers of communications systems should design them so that the government could obtain the plain text of voice and data when authorized by law. The provision was dropped, but it alarmed Zimmermann, who thought that private mail would soon need protection from the state as well as from thieves. He finished a program he had been working on and released it in June 1991, as free software.

He called it Pretty Good Privacy, PGP, after Ralph's Pretty Good Grocery in Garrison Keillor's radio show. It encrypted a message with a fast symmetric cipher, a cipher of his own design named BassOmatic after a comedy sketch, wrapped the key with RSA, and signed with RSA as well. A friend posted it to the Internet and it spread worldwide within days. Eli Biham showed in 1992 that BassOmatic was weak, and an international team of volunteers, among them Hal Finney, produced PGP 2.0 in the same year with the IDEA cipher of Xuejia Lai and James Massey in its place. (IDEA was patented too, in Europe, by the Swiss firm Ascom, which made one more patent in the story.) The authentication of keys followed an idea of Zimmermann's, the *web of trust*: people sign each other's keys, and you decide how far to trust a stranger's key from the signatures on it, with no authority above you. PGP became the method by which activists, journalists and dissidents, and a great number of technical people, protected their mail. [The Protocols book's chapter on email, OpenPGP and S/MIME](../protocols/index.md) is where the design is taught; this chapter keeps to the story.

Zimmermann was soon in trouble twice. RSA Data Security said that PGP used the RSA algorithm without a license, and its president, Jim Bidzos, did not hide his anger. A commercial version licensed from Public Key Partners appeared in 1993, and in 1994 an MIT version used RSA's own free library for non-commercial use, which settled the matter for most users. The second trouble was more serious. In 1993 the US Customs Service, acting for the Justice Department, began a criminal investigation in San Jose, California, into whether PGP's spread beyond the American border was an unlicensed export of munitions. A federal grand jury heard witnesses. Zimmermann was never charged. The case was dropped in January 1996 without explanation, while the Bernstein suit (§17.13) was pending. During those years his legal defense was paid for by a fund that supporters contributed to.

His other answer was a book. In 1995 MIT Press published the complete source code of PGP in print, in a typeface made to be scanned, as *PGP Source Code and Internals*. The government had never tried to stop the export of books, and a book was protected by the First Amendment. Volunteers in Europe scanned the pages and typed back a working program, which was thus not an export of software at all. The trick showed that the rule could not be applied consistently, and it is an early example of the argument made in court in §17.13: that code is speech. Zimmermann went on to found PGP Inc. in 1996; Network Associates bought it in 1997; the OpenPGP standard followed in 1998 (RFC 2440); and the free GnuPG, begun by Werner Koch, appeared in 1999. The tools were free to all by the end of the decade.

PGP's rise coincided with a community of volunteers who called themselves *cypherpunks*. A mailing list founded in 1992 by Eric Hughes, Timothy May and John Gilmore, in the San Francisco Bay Area, gathered programmers, mathematicians and activists to write code for privacy and to give it away. Hughes's "A Cypherpunk's Manifesto" (1993) opens with "Privacy is necessary for an open society in the electronic age", and the list's members wrote anonymous remailers, challenged the export rules, and posted the 40-bit challenge that Doligez answered. The cypherpunk position was that law followed code, and that if the code was already free, no law could take it back. It was not the whole of what the courts decided. It did describe the outcome.

!!! note "Life story: Phil Zimmermann and PGP"
    **Born:** Zimmermann in 1954; PGP released in June 1991 · **Purpose:** to give anyone a tool for private email, and to make a political point about who may have one · **Helped:** the first widely used public-key program, the web of trust, the OpenPGP standard (1998), and a three-year test of the export rules, which ended with no charge in January 1996 · **Status:** PGP's descendants (GnuPG and others) are in use, though email encryption has never been widely adopted; Zimmermann later co-founded Silent Circle and the ZRTP voice standard

## 17.12 Clipper: the government's answer

*Level: beginner.*

The government's counter-proposal came on 16 April 1993, in the third month of a new administration. The White House announced a plan for a *Clipper chip*, a tamper-resistant device that any manufacturer could build into telephones and that would give users strong encryption, with a catch: the government would be able to listen. Behind the plan lay a worry that had been growing at the FBI. In 1992 the Bureau had asked Congress for a law, the "Digital Telephony" proposal, requiring telephone companies to make their networks easy to tap, and Congress passed a version, the Communications Assistance for Law Enforcement Act, in 1994. Encryption was the part of the problem that a law about switches could not reach.

The design was clever. The chip used a classified NSA cipher named **Skipjack**, with an 80-bit key and 32 rounds. Every chip had a unique unit identifier and a unique 80-bit *unit key*. That key was split into two shares by an exclusive-or, and each share was handed to a separate *escrow agent*, one at the National Institute of Standards and Technology and one at the Treasury Department. When two chips talked, they agreed a session key by a method of their own, and each transmitted, along with its speech, a *Law Enforcement Access Field*, or LEAF: the unit identifier, the session key enciphered under the unit key, and a 16-bit check, all enciphered once more under a *family key* that was the same in every chip. An officer with a warrant could take the LEAF from the wire, decrypt it with the family key, and read the unit identifier; he would then ask both agents for their halves, reconstruct the unit key, open the session key and listen. Figure 17.5 shows the pieces. The standard was issued as FIPS 185, the Escrowed Encryption Standard, in February 1994, and AT&T made a Clipper telephone.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The Clipper chip: the unit key is split between two escrow agents, and the LEAF holds a 32-bit unit ID, an 80-bit encrypted session key and a 16-bit check" fill="currentColor" font-size="14">
<rect x="30" y="20" width="200" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="130" y="46" font-size="13" text-anchor="middle" font-weight="bold">Clipper chip</text>
<text x="130" y="64" font-size="12" text-anchor="middle">unit ID, unit key U (80 bits)</text>
<text x="130" y="80" font-size="12" text-anchor="middle">Skipjack, family key</text>
<line x1="230" y1="40" x2="300" y2="40" stroke="currentColor" stroke-width="1.3"/>
<polygon points="300,40 293.6,42.7 293.6,37.3" fill="currentColor"/>
<line x1="230" y1="72" x2="300" y2="72" stroke="currentColor" stroke-width="1.3"/>
<polygon points="300,72 293.6,74.7 293.6,69.3" fill="currentColor"/>
<rect x="302" y="22" width="150" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="377" y="44" font-size="12" text-anchor="middle">escrow agent 1: U1</text>
<rect x="302" y="58" width="150" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="377" y="80" font-size="12" text-anchor="middle">escrow agent 2: U2</text>
<text x="470" y="62" font-size="12" text-anchor="start">U = U1 xor U2</text>
<text x="30" y="132" font-size="13" font-weight="bold" text-anchor="start">The LEAF sent with every call (128 bits)</text>
<rect x="30" y="146" width="128" height="44" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="94" y="173" font-size="12" text-anchor="middle">unit ID: 32 bits</text>
<rect x="158" y="146" width="320" height="44" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="318" y="173" font-size="12" text-anchor="middle">session key enciphered under U: 80 bits</text>
<rect x="478" y="146" width="64" height="44" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.6"/>
<text x="510" y="173" font-size="12" text-anchor="middle">check: 16</text>
<text x="30" y="214" font-size="13" text-anchor="start">The whole 128 bits is enciphered once more under the family key.</text>
<text x="30" y="246" font-size="13" font-weight="bold" text-anchor="start">Blaze, 1994: only the shaded 16-bit check stops a forged LEAF.</text>
<text x="30" y="268" font-size="13" text-anchor="start">A sender who tries random 128-bit strings passes it once in 65,536 tries.</text>
<text x="30" y="290" font-size="13" text-anchor="start">The call is protected; the escrow is not.</text>
</svg>
<figcaption>Figure 17.5. The Clipper escrow system. The chip's own receiver checks the LEAF before it will decrypt, and that check is 16 bits long.</figcaption>
</figure>

The reaction was loud and broad. The Electronic Frontier Foundation (founded in 1990 by John Gilmore, Mitch Kapor and John Perry Barlow), Computer Professionals for Social Responsibility and the American Civil Liberties Union were against it, and so were most of the computer and telephone industries. The objections were several. The cipher was secret, so no one outside the NSA could inspect it, against Kerckhoffs's rule ([chapter 10](10-The-Telegraph.md)). The scheme was said to be voluntary, though the government was the largest buyer and the export rules could be used to steer the market. Criminals could use other products. And the escrow agents, being parts of the government, could not be wholly trusted. The government's reply was that nothing was taken from anyone who did not want it, and that the privacy of the law-abiding was protected by warrants. It asked five outside experts to review Skipjack, among them Dorothy Denning, who reported in the summer of 1993 that they could find no shortcut and that exhaustive search would not be a danger for decades. Denning came in for harsh criticism from colleagues for the support she gave the plan in public; she answered, publicly, that the case for letting the police read a criminal's phone was a strong one and had to be argued.

Susan Landau stood on the other side of the same debate. A mathematician at the University of Massachusetts Amherst at the time (she joined Sun Microsystems in 1999), she was the lead author of a 1994 report for the Association for Computing Machinery on cryptography policy, "Codes, Keys and Conflicts", and with Diffie she wrote *Privacy on the Line* (1998, updated 2007), which set the history of wiretapping and encryption in print and has been the standard account since. She has gone on writing on the same questions for thirty years. Landau and Denning stood on different sides of the question, and each argued it in public and by name.

**Matt Blaze breaks the escrow.** In the spring of 1994 Matt Blaze, a researcher at AT&T Bell Laboratories, took a Tessera card (a version of the Clipper idea for data, with a chip called Capstone) and looked at how the LEAF was checked. Before it decrypted a call, the receiving chip took the LEAF, deciphered it with the family key, and tested the 16-bit check. If the check failed, it would not decrypt. The check was 16 bits long, so a random string would pass it one time in 65,536. Blaze reasoned that a rogue sender could make up a LEAF, any 128-bit string, and try again until the receiving chip accepted it: about 65,000 tries on average, which in his experiment took about 42 minutes. The call would then go through with a LEAF that told the police nothing. The user got the strong cipher and the government got an escrow field with garbage in it. The finding was reported on the front page of the *New York Times* on 2 June 1994, and Blaze published the paper, "Protocol Failure in the Escrowed Encryption Standard", at the ACM Conference on Computer and Communications Security that November. The NSA acknowledged the flaw and said that it was not serious, since the attack needed a card and some time. The point was not whether the attack was convenient. It was that the escrow could be turned off by any user who knew how, and that the whole scheme depended on that 16-bit check. The program below builds a toy of it and runs the forgery.

```python
import hashlib, random

rng = random.Random(1994)

def rand_bytes(n):                            # n random bytes from the seeded generator
    return rng.getrandbits(8 * n).to_bytes(n, "big")

family_key = b"family key burned into every chip"

def stream(n):
    return hashlib.sha256(family_key).digest()[:n]

def check16(session_key, iv):                 # the 16-bit escrow check
    return hashlib.sha256(session_key + iv).digest()[:2]

def make_leaf(unit_id, wrapped_key, session_key, iv):
    plain = unit_id + wrapped_key + check16(session_key, iv)      # 4 + 10 + 2 = 16 bytes
    return bytes(a ^ b for a, b in zip(plain, stream(16)))

def chip_accepts(leaf, session_key, iv):      # the receiving chip decrypts the LEAF and tests the check
    plain = bytes(a ^ b for a, b in zip(leaf, stream(16)))
    return plain[-2:] == check16(session_key, iv)

session_key, iv = rand_bytes(10), rand_bytes(8)
good = make_leaf(b"UNIT", b"x" * 10, session_key, iv)
print("an honest LEAF is accepted:", chip_accepts(good, session_key, iv))

# Blaze, 1994: a rogue sender tries random 16-byte strings until one passes the check
def rogue():
    tries = 0
    while True:
        tries += 1
        fake = rand_bytes(16)
        if chip_accepts(fake, session_key, iv):
            return tries

counts = [rogue() for _ in range(30)]
print("tries needed in 30 runs: smallest", min(counts), "largest", max(counts))
print("average:", sum(counts) // len(counts), " (2**16 is", 2**16, ")")
```

Output:

```
an honest LEAF is accepted: True
tries needed in 30 runs: smallest 3092 largest 167977
average: 68209  (2**16 is 65536 )
```

(The toy leaves out Skipjack and the real LEAF format, and keeps the one thing that mattered: a 16-bit test. Run it with a different seed and the numbers change, but the average stays near 65,536.) The scheme did not recover. Few buyers wanted a Clipper phone, and those who did were mostly government offices. In 1996 the administration turned to a wider idea it called *key recovery*, and a committee of the National Research Council, chaired by the former deputy secretary of state Kenneth Dam, reported in May 1996 that the country would be better served by broader use of cryptography and by relaxed export rules. A group of eleven cryptographers, among them Diffie, Rivest, Blaze and Bruce Schneier, wrote in 1997 a report on the risks of key recovery and trusted third parties, and Skipjack itself was declassified in June 1998. It held up better than the escrow around it: the best published attack, by Biham, Biryukov and Shamir in 1999, broke 31 of its 32 rounds but not the cipher ([Cryptanalysis, chapter 5](../cryptanalysis/05-Differential-Cryptanalysis.md)). The question of whether the state should be able to read what its citizens say was not settled, only suspended. [Chapter 18](18-The-Internet-Era.md) tells how it came back.

!!! note "Life story: the Clipper chip and Skipjack"
    **Born:** announced on 16 April 1993; FIPS 185 in February 1994 · **Purpose:** to give the public strong telephone encryption that the police could open with a warrant · **Helped:** nothing much was sold; it focused the argument and united its opponents · **Retired:** abandoned in the mid-1990s after Blaze's break of the LEAF (1994) and the public rejection; Skipjack declassified in June 1998 · **Replaced by:** the "key recovery" proposals of 1996, themselves dropped by 2000

!!! note "Life story: Matt Blaze"
    **Born:** in the 1960s · **Purpose:** to test the escrow system as an engineer would · **Helped:** the 1994 attack on the LEAF check, which showed that the government's scheme could be defeated by an ordinary user; co-author of the 1996 report on key lengths and the 1997 report on key recovery · **Status:** a professor of computer science; he has gone on to study the weaknesses of lock systems, voting machines and wiretap interfaces

!!! note "Life story: Susan Landau"
    **Born:** 1954 · **Purpose:** to explain, for lawmakers and the public, what wiretapping and encryption policy do to security · **Helped:** the 1994 ACM report on cryptography policy; *Privacy on the Line* (1998) with Whitfield Diffie; later *Surveillance or Security?* (2010) and *Listening In* (2017) · **Status:** a professor of cyber security and policy; she has testified to Congress and written on the "going dark" argument ever since

## 17.13 Code as speech: the courts and the end of the export rules

*Level: beginner.*

By 1994 the government was holding two positions that were hard to hold together. It said that a book on cryptography was free to go anywhere. It also said that the same text on a disk was a weapon. Philip Karn, an engineer at Qualcomm and a radio amateur, put the two side by side. In 1994 he asked the State Department for rulings on Bruce Schneier's *Applied Cryptography*, a book that printed the source code of dozens of ciphers, and on a floppy disk that held the same source code in a file. The answer was that the book could be exported, and the disk could not. Karn sued in 1995, and his case went back and forth in the federal courts in Washington until the rules changed under it. As a joke that made a point, and as the basis for a lawsuit, it proved the rule's central weakness: if the text was the same, the only difference was the medium.

The case that mattered more was brought by a graduate student. Daniel J. Bernstein, who was finishing a doctorate in mathematics at Berkeley under Hendrik Lenstra, had written a cipher he called Snuffle, built from a hash function. He asked the State Department whether he could publish it, and after some back and forth the Department ruled that Snuffle was a munition and that he would need a license to post his paper and his program online. In February 1995, with the help of the Electronic Frontier Foundation, he sued. The lead lawyer was **Cindy Cohn**, who argued the case for the Foundation at every stage for almost a decade; she joined its staff in 2000 and became its executive director in 2015. The judge in the Northern District of California was **Marilyn Hall Patel**. In April 1996 she held that source code was speech for the purposes of the First Amendment; in December 1996 she found that the licensing rules were an unconstitutional prior restraint on that speech. By then the government had begun to move the rules, and when the regulation of commercial encryption passed to the Commerce Department at the end of 1996 she was asked to consider the new regime too, and in 1997 ruled against that as well.

The government appealed. In May 1999 a panel of the Ninth Circuit Court of Appeals agreed with Patel in an opinion that said that source code, being the language in which programmers speak to each other and to machines, was expressive. (The opinion was written, as I recall, by Judge Betty Fletcher.) In September 1999 the court voted to rehear the case before all its judges and withdrew the opinion. Then the rules changed, and the case went into a long wait; it wound down without a final ruling and was closed in 2003. A different court had reached the same conclusion in the meantime. In *Junger v. Daley*, brought by Peter Junger, a law professor at Case Western Reserve University who wished to teach his students about cryptography without a license, the Sixth Circuit ruled in April 2000 that "computer source code is an expressive means for the exchange of information and ideas about computer programming" and is protected by the First Amendment. (The opinion was written, I believe, by Judge Martha Daughtrey.) Two federal appeals courts had held, in one form or another, that the export rules reached into speech. No Supreme Court ever decided the point, and whether code is speech, and how much, remains argued in other contexts.

Daniel Bernstein himself went on to a second career as a cryptographer. He wrote the qmail mail server in the 1990s, introduced the Curve25519 key exchange in 2005 and the Ed25519 signature in 2011, and he shaped the post-quantum standards of the 2020s. Few legal plaintiffs have gone on to affect the subject they sued about as he has. The government's side of the case is less often told, and it is fair to do so. The people who defended the rules were not trying to prevent the use of ciphers by the public, which was impossible. They wanted to keep the commercial products of the world just weak enough for the agencies to read, and they had, in the 1990s, good reason to think that most ciphers sold with the default settings would stay at the default settings. To a degree, they were right. The 40-bit and 512-bit keys of the export grades stayed on servers for twenty years after the rules ended, and the FREAK attack of 2015 came out of them.

The government gave way in steps. In November 1996 the President signed an executive order (13026) that moved the control of commercial encryption from the State Department's Munitions List to the Commerce Department, whose rules are less strict; the change took effect at the end of December 1996. In the same year the new rules allowed 56-bit DES to go abroad on condition that the maker promised a plan for key recovery. In September 1999 the White House announced a further relaxation. In January 2000 the Commerce Department issued rules that allowed most encryption products, of any strength, to be exported to almost every country after a single review, and that allowed the posting of open-source code on the Internet with a notice to the government. Seven countries on the list of states supporting terrorism remained excluded. The export regime that had defined the 1990s was, in the form it had taken since 1992, over. In the same period Europe and other countries relaxed their own rules, the Wassenaar Arrangement was revised in 1998, and France in 1999 allowed 128-bit keys. The National Research Council's report of May 1996 had said that this was where policy ought to go.

What did the wars decide? Strong cryptography became something anyone could write, publish, use and sell anywhere, and the programs that people now use every day (the browser's padlock, the secure shell, the encrypted messenger) could be built in the open. The governments learned that they could not stop mathematics at a border. What they did not give up was the aim of lawful access, which returned in the 2010s over encrypted phones and messaging, as [chapter 18](18-The-Internet-Era.md) tells. The crypto wars were not won once and for all. They were won for a generation.

!!! note "Life story: Bernstein v. United States"
    **Born:** filed in February 1995 in the Northern District of California · **Purpose:** to publish the source code of a cipher without a license, and to test whether the export rules could constrain it · **Helped:** the 1996 ruling that source code is speech and that the licensing scheme was a prior restraint; the case was the weight on the other side from the government's view of the rules, and it shaped the 1996 and 2000 changes · **Retired:** closed in 2003 without a final ruling by the Ninth Circuit, after the rules had been relaxed · **Replaced by:** later cases on code and speech in other fields

!!! note "Life story: Cindy Cohn"
    **Born:** a lawyer in private practice in the San Francisco Bay Area when she took the Bernstein case in 1995 (her birth year is not given here) · **Purpose:** to argue that the First Amendment protects the writing of code · **Helped:** led the legal team in *Bernstein v. United States* from 1995, the case that did most to end the export rules; she later worked on cases against mass surveillance · **Status:** legal director of the Electronic Frontier Foundation from 2000 and its executive director from 2015

!!! note "Life story: Marilyn Hall Patel"
    **Born:** 1938 · **Purpose:** the judge who first held that source code is speech · **Helped:** her rulings of April and December 1996 and her later opinion shaped how the rules were rewritten · **Status:** she took the bench in 1980, served as chief judge of the Northern District of California, and later presided over the Napster case; she took senior status in 2006

## 17.14 Operation Vula: the laptop, the tape and the telephone

*Level: beginner.*

While Washington argued over who might use a cipher, a political movement without a state used one to stay alive. The African National Congress had been banned in South Africa since 1960. Its leaders were in prison, like Nelson Mandela on Robben Island and then in Pollsmoor, or in exile, with a headquarters in Lusaka, Zambia. In the mid-1980s, with the country in a state of emergency and the movement inside it in revolt, the leadership decided to send senior people back to organize from inside, in secret. The plan was called **Operation Vula**, from the Zulu *Vul'indlela*, "open the road". It ran from about 1988 and was broken up in 1990, when the police arrested some of its leaders, at the time when the ANC had been unbanned and was already negotiating with the government. Its leaders included Mac Maharaj and Siphiwe Nyanda, and Ronnie Kasrils took part in it and later wrote about it in his memoir, *Armed and Dangerous*.

The operation's difficulty was the one this chapter began with. The people inside South Africa had to speak with the leadership in Lusaka, and every route was watched. Letters were opened, calls were listened to, and a courier crossing a border was a courier who could be caught. By the accounts of the people involved, a message that went by hand through couriers took about a month to reach Lusaka. Vula needed a way to send long messages, fast and often, over lines that the police controlled.

The man who built it was **Tim Jenkin**, born in 1948, a white South African who had joined the ANC's underground in the 1970s, was arrested in 1978 for distributing ANC leaflets with devices that scattered them in the street, and was sentenced to twelve years. In December 1979 Jenkin and two fellow prisoners, Stephen Lee and Alex Moumbaris, walked out of Pretoria Central Prison with keys that Jenkin had carved from wood, copying the originals from what he could see. He went to London and, by the sources I have, worked on the ANC's communications. With a small team in London, which according to Jenkin's own account included a technician named Ronnie Press, he designed a system that used no commercial cipher product, which they did not trust, and nothing that the South African security police could recognize as a data line.

The system, as it is described, worked like this. A member in South Africa wrote a message on a personal computer, a Toshiba laptop in the accounts, using a program that Jenkin had written. The program enciphered the text with a long random key taken from a floppy disk; the disks, filled with random numbers, had been carried into the country by hand. As the accounts describe it, each part of the key was used once and then destroyed, which makes the scheme a one-time pad of the kind that [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) describes, with all of its demands on the handling of keys. The program then turned the ciphertext into a series of sounds, like the shrieks of a modem. The sounds were recorded on a cassette tape. To send the message the operative went to a public telephone, dialed a number in London, and played the tape into the mouthpiece. An answering machine on the other end recorded it, a computer decoded the sounds, and the message went on to Lusaka. A pager signal confirmed that the call had arrived. The call lasted seconds, not minutes; no modem was connected to the line to be recognized; and the equipment in South Africa was an innocent-looking laptop and a tape recorder. Messages went the other way by a similar route, I understand. According to some accounts Nelson Mandela, who was then being held in a house at Victor Verster prison and was beginning talks with the government, was able to exchange long messages with the ANC's leadership through Vula channels, without the government knowing; I have this from published accounts and not from a document I could check.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="The Vula chain: laptop and key disk, tones on tape, public telephone, answering machine in London, decoding, and the message on to Lusaka" fill="currentColor" font-size="14">
<rect x="20" y="30" width="170" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="56" font-size="13" text-anchor="middle" font-weight="bold">Laptop in Durban</text>
<text x="105" y="74" font-size="12" text-anchor="middle">message + key from disk</text>
<line x1="190" y1="62" x2="235" y2="62" stroke="currentColor" stroke-width="1.3"/>
<polygon points="235,62 228.6,64.7 228.6,59.3" fill="currentColor"/>
<rect x="235" y="30" width="170" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="56" font-size="13" text-anchor="middle" font-weight="bold">Tones on a cassette</text>
<text x="320" y="74" font-size="12" text-anchor="middle">ciphertext as sound</text>
<line x1="405" y1="62" x2="450" y2="62" stroke="currentColor" stroke-width="1.3"/>
<polygon points="450,62 443.6,64.7 443.6,59.3" fill="currentColor"/>
<rect x="450" y="30" width="170" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="535" y="56" font-size="13" text-anchor="middle" font-weight="bold">Public telephone</text>
<text x="535" y="74" font-size="12" text-anchor="middle">tape played into the handset</text>
<line x1="535" y1="94" x2="535" y2="150" stroke="currentColor" stroke-width="1.3"/>
<polygon points="535,150 532.3,143.6 537.7,143.6" fill="currentColor"/>
<rect x="450" y="150" width="170" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="535" y="176" font-size="13" text-anchor="middle" font-weight="bold">Answering machine</text>
<text x="535" y="194" font-size="12" text-anchor="middle">in London</text>
<line x1="450" y1="182" x2="405" y2="182" stroke="currentColor" stroke-width="1.3"/>
<polygon points="405,182 411.4,179.3 411.4,184.7" fill="currentColor"/>
<rect x="235" y="150" width="170" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="176" font-size="13" text-anchor="middle" font-weight="bold">Computer decodes</text>
<text x="320" y="194" font-size="12" text-anchor="middle">tones to ciphertext to text</text>
<line x1="235" y1="182" x2="190" y2="182" stroke="currentColor" stroke-width="1.3"/>
<polygon points="190,182 196.4,179.3 196.4,184.7" fill="currentColor"/>
<rect x="20" y="150" width="170" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="176" font-size="13" text-anchor="middle" font-weight="bold">Lusaka</text>
<text x="105" y="194" font-size="12" text-anchor="middle">the ANC's leadership</text>
<text x="20" y="252" font-size="13" text-anchor="start">The key disks were carried in by hand: the courier problem of §17.1, kept small.</text>
</svg>
<figcaption>Figure 17.6. The path of a Vula message, as the accounts describe it. The secret was in the key disk. The tones, the tape and the telephone were there so that nothing looked like a data line.</figcaption>
</figure>

The system is worth putting beside the quarrel in Washington. It used no public-key cryptography at all, and it solved the key-distribution problem in the old way, by carrying keys in by hand, on disks, because the movement had trusted people who could travel. It needed no export license, and it shows what the licenses were for: a determined group that could carry a few floppy disks did not need an American product. On the other hand it could scale to a few hundred messages and not to a million users; the problem of §17.1 had not gone away, only been made small. Vula was not found through its cryptography. The operation was uncovered in 1990 by arrests, and when the ANC was unbanned the need for it ended. Nothing in the sources that I know suggests that the ciphertext was ever broken.

The best primary source is Jenkin's own account, "Talking to Vula", published in the ANC's journal *Mayibuye* in 1995, together with later interviews (a recent one is in the University of Cape Town's news service of January 2024). I have used the published accounts and cannot check some details, such as the make of the laptop, the length of the key disks and the exact dates, against documents.

!!! note "Life story: Operation Vula"
    **Born:** about 1986 to 1988, authorized by the ANC leadership under Oliver Tambo · **Purpose:** to put senior leaders back inside South Africa and to keep them in touch with Lusaka · **Helped:** secure messages by laptop, tape and telephone, between the underground and the leadership in exile, during the years of negotiation · **Retired:** uncovered in 1990, by arrests, when the ANC had been unbanned and talks had begun

!!! note "Life story: Tim Jenkin"
    **Born:** 1948 · **Purpose:** to build a communications system the security police could neither read nor recognize · **Helped:** the design and software of the Vula system; before it, a prison escape in December 1979 with wooden keys · **Status:** wrote his account of Vula in 1995; lives in South Africa

## 17.15 Can these be broken today?

*Level: intermediate.*

Not the ideas, only the sizes and the details. Every public-key method in this chapter is still safe against ordinary computers when the numbers are big enough, and falls when they are too small. The factoring and discrete-logarithm methods would all fall to a large quantum computer ([chapter 19](19-Hardware-Quantum-and-the-Long-View.md) tells where that stands, and the [Post-quantum book](../post-quantum/01-The-Quantum-Threat-Measured.md) measures the threat). The table goes through the chapter's systems and projects.

| Method or system | Broken today? | The attack in plain words |
|---|---|---|
| Merkle's puzzles | yes, at any practical size | The attacker's work is only the square of the users'. Buy a million times more computers than the users have and you keep up with puzzles a thousand times harder. |
| Diffie-Hellman, 2048 bits and up | no | Taking discrete logarithms modulo a 2048-bit prime is out of reach. The 512-bit "export" size fell in 2015 (Logjam): one big precomputation per prime, then each connection in minutes. |
| RSA, 2048 bits and up | no | Factoring is the known way in, and the record is 829 bits (RSA-250, 2020, about 2,700 core-years). A 512-bit key cost under four hours and about \$75 of rented cloud computing in 2015. |
| RSA-129 (426 bits) | yes, since 1994 | The quadratic sieve, run by about 600 volunteers over eight months. Today a laptop could do it far faster. |
| Cocks's and Williamson's GCHQ versions | the same as RSA and Diffie-Hellman | They are the same mathematics. |
| Elliptic curves, 256 bits | no | The best attack, Pollard's rho, needs about $2^{128}$ steps. Records stop near 117 bits. |
| Merkle-Hellman knapsack | yes, since 1982 and 1984 | Shamir's attack (1982) broke the first version and Brickell's (1984) the strengthened one; lattice methods later broke the low-density knapsacks in general ([Cryptanalysis, chapter 15](../cryptanalysis/15-Lattices-as-a-Weapon.md)). |
| 40-bit export keys (RC2, RC4) | yes, within hours | See §17.10. A weekend in 1995, an afternoon in 1997, minutes today. |
| 512-bit export RSA | yes | Factored in 1999 for the first time; hours on rented machines by 2015. Servers that still offered it were attackable by FREAK. |
| BassOmatic (PGP 1.0) | yes | Biham soon showed it weak, and PGP 2.0 replaced it with IDEA. |
| The Needham-Schroeder public-key protocol | yes, since 1995 | Lowe's attack: a dishonest member of the network reuses an honest run to impersonate its first party. A one-line fix (put the responder's name in the message) closes it. |
| Clipper's escrow field | bypassed since 1994 | A 16-bit check meant about 65,000 tries made a fake escrow field: Blaze's attack. Skipjack itself held, apart from reduced-round attacks. |
| Operation Vula's laptop system | not known to have been broken | It used long random keys carried on floppy disks. Like any one-time pad, it was as safe as the handling of those disks. |
| Toy keys of any kind | instantly | See §17.5. |

The lesson that runs through the table is not that the mathematics failed. It almost never did. Where a row says "yes", the cause was a key that was too short, a number that was too small, a check that was too short, or a protocol with a missing line: choices made by people, for reasons of law, speed or haste. The 512-bit and 40-bit rows were chosen by a rule, and the rule outlived its purpose by twenty years.

## 17.16 Going deeper

*Level: expert.*

### Why Cocks's exponent works

In Cocks's scheme the public exponent is the modulus, $e = n = pq$, and encryption is $c = m^n \bmod n$. Decryption needs $d$ with $nd \equiv 1 \pmod{\varphi(n)}$, where $\varphi(n) = (p-1)(q-1)$, and such a $d$ exists exactly when $\gcd(n, \varphi(n)) = 1$. For distinct odd primes that condition is equivalent to "$p \nmid q-1$ and $q \nmid p-1$", because $p$ cannot divide $p-1$, so the only way $p$ can divide $\varphi(n)$ is by dividing $q-1$, and likewise for $q$. When $d$ exists, $c^d = m^{nd} = m^{1 + k\varphi(n)}$ for some $k$, and this is $m$ modulo $p$ and modulo $q$ whether or not $p$ or $q$ divides $m$: if $p \mid m$ both sides are 0, and if not, Fermat's little theorem gives $m^{p-1} \equiv 1$. By the Chinese remainder theorem it is $m$ modulo $n$. The program below checks the equivalence for all pairs of odd primes below 300, and checks that for three pairs every message from 0 to $n-1$ is recovered.

```python
from math import gcd

def primes(limit):                       # odd primes below limit
    return [k for k in range(3, limit) if all(k % j for j in range(2, int(k ** 0.5) + 1))]

P = primes(300)
agree = usable = pairs = 0
for p in P:
    for q in P:
        if p < q:
            pairs += 1
            works = gcd(p * q, (p - 1) * (q - 1)) == 1
            rule = (q - 1) % p != 0 and (p - 1) % q != 0     # neither prime divides one less than the other
            agree += works == rule
            usable += works
print(pairs, "pairs;", usable, "usable;", "rule matches in", agree, "cases")

# and for small usable pairs, every message from 0 to n-1 comes back, even ones sharing a factor with n
for p, q in ((5, 7), (11, 13), (61, 53)):
    n, phi = p * q, (p - 1) * (q - 1)
    d = pow(n, -1, phi)
    print(p, q, all(pow(pow(m, n, n), d, n) == m for m in range(n)))
```

Output:

```
1830 pairs; 1748 usable; rule matches in 1830 cases
5 7 True
11 13 True
61 53 True
```

Almost all pairs are usable, so the condition costs nothing in practice. Cocks's version has two drawbacks that RSA's standard form avoids. A 2048-bit exponent makes encryption about a hundred times slower than $e = 65537$, which in 1973 would have mattered more than it would now; and the scheme as noted is deterministic, so equal messages give equal ciphertexts. That GCHQ never published it means we have no way to know what improvements its authors would have made. Nothing in Cocks's note, as far as I have seen, uses the private exponent to sign, though the algebra allows it. The step from an encryption scheme to a signature scheme was not obvious in 1973: it needed the Diffie-Hellman idea that the two keys could be used in either order.

### The one-way idea before 1976

Diffie and Hellman did not invent the one-way function. Roger Needham, working on the Cambridge Titan time-sharing system in the 1960s, is credited by Maurice Wilkes (1968) and by Diffie himself with the practice of storing not the password but a one-way image of it, so that a stolen file does not reveal the passwords. Evans, Kantrowitz and Weiss (1974) and George Purdy (1974) wrote it up for the community, Purdy using a polynomial over a field of $2^{64} - 59$ elements. These are the one-way functions that "New Directions" cites. What was new in 1976 was to ask for a *trapdoor*: a one-way function that the owner of a secret could invert. Hellman's key exchange needs only the one-way part, since both parties compute the same value in different ways, and that is why it came first.

### Priority

It helps to split "invention" into its steps, because the claims do not compete for the same one. The *concept* of encryption without a shared secret is Ellis's, in January 1970, and he published nothing. A working *public-key encryption* is Cocks's of November 1973, followed by RSA in April 1977. A working *public key agreement* is Williamson's of January 1974, Merkle's puzzles of autumn 1974 (not an exponential scheme but the first public one), and Diffie and Hellman's of May 1976. The *definition of a signature* is Diffie and Hellman's, and the first *working signature scheme* is RSA's. The first *publication* of any of it is Merkle's submission in August 1975, then Diffie and Hellman's paper of November 1976. The 1997 release makes the GCHQ papers earliest on the first three steps. It does not make them influential on any, for they influenced nobody: the field that grew in the next twenty years drew on the published papers alone. A historian can fairly credit Ellis with the idea and the Americans with the discovery in the sense that counts for a science, which is the one that others could build on. Hellman's proposal to call the exchange Diffie-Hellman-Merkle is a plea to credit all three of the men whose conversations produced it, and it is not a contest with GCHQ.

How good is the evidence for the British dates? The papers are numbered CESG reports, and Ellis's 1987 account is a recollection written seventeen years after the fact. The dated notes are the primary documents, and nobody outside GCHQ could check their dates in 1997. Singh's popular account in *The Code Book* (1999), the best known telling, and Levy's account in *Crypto* (2001), agree on the broad outline and differ on small details, such as who first mentioned Ellis's idea to Cocks. The sources for the NSA's claim are weaker still: interviews, not documents. The agency's own history of the period, Johnson's *American Cryptology during the Cold War*, says little on the point, and the question of whether the NSA had public-key ideas before 1976 remains open for want of a document.

### What was proved, and what was not

No one has proved that breaking RSA is as hard as factoring. Breaking RSA means computing $e$-th roots modulo $n$ without being told the factors, and Boneh and Venkatesan showed in 1998 that for small public exponents such a method, if it were found, would not be a method to factor $n$ in the ordinary sense. Rabin's scheme of 1979 is provably equivalent to factoring, at the price of decrypting to four possible messages. The discrete logarithm and Diffie-Hellman problems are known to be equivalent only in special groups. The security of the whole field rests on assumptions that are checked by experience and by attack, which is what the records of §17.5 are. Goldwasser and Micali's contribution in 1982 was to say exactly which assumption a given scheme needs, and a good deal of the work since has been to reduce the assumptions needed.

### The legal doctrine, and what happened next

The courts that said code is speech did not say that code is only speech. In *Universal City Studios v. Corley* (Second Circuit, 2001), which concerned a program to decrypt DVDs, the court agreed that code is speech and held that its functional power to decrypt could be regulated all the same. The distinction between expressive and functional parts of code was not resolved by the crypto cases. The same words that protected Bernstein's paper do not protect every program, and that remains an open question in American law.

### Open questions

Several questions remain open for want of a document. What did the NSA know about public keys, and when? What did the export rules cost American makers? Studies of the 1990s put the lost sales in the billions of dollars, but the estimates differ widely and rest on assumptions about what would have been sold. How many Clipper telephones were made? Reports give figures in the thousands, mostly for government use. And what did the cryptography of Operation Vula look like in full? Jenkin's account is the best we have, and an independent study of the surviving software and disks would settle the questions of §17.14. The gaps share a feature: they all concern secrets that the secret keepers have not yet released.

## Check yourself

??? question "1. How many pair keys do 1,000 users need if every pair shares a secret key, and how many keys do they need if each has a public and a private key?"
    $1000 \cdot 999 / 2 = 499{,}500$ pair keys. With public keys each user has two keys, so 2,000 in all, and the public ones can be published without any secret meeting.

??? question "2. In Merkle's scheme with $N = 1{,}000$ puzzles, each needing about 500 tries on average, how much work do Bob and Eve do, and why did nobody use the scheme?"
    Bob opens one puzzle: about 500 tries. Eve opens about 500 puzzles at about 500 tries each: about 250,000, a ratio of 500. The gap is only quadratic, so an enemy who buys a thousand times as much computing keeps up with puzzles ten times as hard, and Alice has to send all $N$ puzzles over the line. The value of the scheme was the proof that the problem could be solved.

??? question "3. Why does Diffie-Hellman key exchange alone not protect against a man in the middle, and what fixes it?"
    Mallory can run one exchange with Alice and another with Bob, and neither knows. The exchange gives a shared secret but not the identity of the other party. The fix is authentication: each side signs its half of the exchange, and the other side checks the signature against a public key that it has reason to trust. That is the work that certificates do (§17.8).

??? question "4. Take $p = 5$, $q = 11$, $e = 3$. Find $n$, $d$, the ciphertext for $m = 9$, and check that it decrypts."
    $n = 55$, $\varphi = 40$, $d = 27$ because $3 \cdot 27 = 81 = 2 \cdot 40 + 1$. The ciphertext is $9^3 \bmod 55 = 729 - 715 = 14$. Decrypting, $14^{27} \bmod 55 = 9$.

??? question "5. Cocks's scheme uses the public exponent $n = pq$. Why can it not use $p = 7$ and $q = 29$?"
    Here $q - 1 = 28$, which 7 divides, so $\gcd(n, \varphi(n)) = \gcd(203, 168) = 7$ and the exponent $n$ has no inverse modulo $\varphi(n)$. Decryption would be impossible. The primes must be chosen so that neither divides one less than the other.

??? question "6. RSA-129 has 129 digits. About how many bits is that, and why is the exact figure 426 and not the 429 you get by multiplying 129 by $\log_2 10$?"
    $129 \times 3.32 \approx 428.5$, which is the largest a 129-digit number can be. RSA-129 is about $1.14 \times 10^{128}$, so it begins low in its range: $128 \log_2 10 + \log_2 1.14 \approx 425.4$, which rounds up to 426 bits.

??? question "7. A 40-bit key falls in 18 minutes on 1,000 machines at a million keys a second each. How long would 56 bits take on the same machines, and what does that say about the choice of 40 as the export limit?"
    $2^{16} = 65{,}536$ times longer, which is about 2.3 years. On the reading most accounts give, the limit was set so that a government could break the keys quickly while a thief or a business rival could not easily do so. As computers got faster, the same 40 bits fell to a lab, then to a student, then to a laptop.

??? question "8. A rogue Clipper user tries random LEAFs against a 16-bit check. What is the chance that 65,536 tries find a passing one, and how many tries give 99 percent?"
    Each try passes with probability $2^{-16}$, so the chance of at least one pass in 65,536 tries is $1 - (1 - 2^{-16})^{65536} \approx 0.63$. For 99 percent solve $(1 - 2^{-16})^k = 0.01$, which gives $k \approx 65{,}536 \cdot \ln 100 \approx 301{,}800$ tries.

??? question "9. Explain the Denning-Sacco attack on the Needham-Schroeder shared-key protocol and its fix. What does the fix cost?"
    The ticket for Bob has no sign of age. An enemy who learns an old session key can replay the old ticket, and Bob will accept it and use the old key. The fix is a timestamp, sealed in the ticket and checked against Bob's clock. The cost is that clocks must be kept roughly in step, and a clock that an enemy can set back brings the attack back. Challenge-response with a fresh nonce from Bob avoids the clock at the price of an extra message.

??? question "10. GCHQ's papers show three men in 1970 to 1974 with the main ideas of encryption and key agreement. Why does that not establish that GCHQ also had digital signatures, and what evidence would?"
    No released paper describes a signature scheme, and Cocks's note speaks only of encryption. A signature is a different goal: a value only the owner of a private key can make and anyone can check, which Diffie and Hellman defined in 1976. Evidence would be a dated, registered GCHQ document that states the goal or a scheme for it, or a record of its use. Absence from the released papers is not proof that it did not exist, only a reason not to say that it did.

## What you learned

- Before 1976 every secret message needed a secret that had to travel, and a network of $n$ users needed $n(n-1)/2$ keys. Public keys cut that to two per user and made the distribution a matter of publishing.
- Ralph Merkle's puzzles (1974, rejected by his course and by a referee, published in 1978) showed that two strangers can agree on a key in public, with a quadratic gap. Diffie and Hellman's "New Directions" (1976) gave the exponential-gap key exchange, defined the digital signature, and asked for a trapdoor function. Rivest, Shamir and Adleman supplied it in 1977 and Martin Gardner's column printed the RSA-129 challenge, which was factored in 1994 by about 600 volunteers: THE MAGIC WORDS ARE SQUEAMISH OSSIFRAGE.
- At GCHQ, James Ellis (1970), Clifford Cocks (1973) and Malcolm Williamson (1974) had found non-secret encryption, an RSA-like scheme and an exponential key agreement. They were silent until December 1997. Nothing released shows signatures, and the NSA's claim of earlier knowledge is not documented.
- The NSA met the new research with a letter (Meyer, 1977), secrecy orders on patents, speeches by its director Bobby Inman and a voluntary review scheme (1980 to 1981), then settled into a long quarrel over standards.
- Certificates (Kohnfelder, 1978; X.509, 1988) bind keys to names; protocols such as Needham and Schroeder's need checking as much as ciphers do (Denning and Sacco, 1981; Lowe, 1995). ElGamal, Schnorr and DSA built signatures on discrete logarithms, Koblitz and Miller put them on elliptic curves, and Goldwasser and Micali defined what security means.
- Patents (Stanford's Diffie-Hellman patent to April 1997, MIT's RSA patent to September 2000) and Public Key Partners shaped what could be built and sold.
- The crypto wars: the Munitions List and the 40-bit rule of 1992, Netscape's international edition, PGP and the grand jury (1993 to January 1996), Clipper (April 1993) and Blaze's 1994 break of its 16-bit check, the cases of Karn, Bernstein and Junger, the move to Commerce (1996), the new rules of January 2000, and the Wassenaar Arrangement.
- Operation Vula moved encrypted messages between the ANC's underground and Lusaka by laptop, tape and public telephone from 1988 to 1990, with random keys carried on floppy disks.
- The women who shaped these years included Dorothy Denning, Shafi Goldwasser, Lenore Blum, Susan Landau, Cindy Cohn and Judge Marilyn Hall Patel; the record of their work is better than the older histories suggest.

**Next:** [Chapter 18](18-The-Internet-Era.md), when the tools of this chapter go into every browser, and the questions of this chapter return.

## Further reading

- Whitfield Diffie and Martin E. Hellman, "New Directions in Cryptography", *IEEE Transactions on Information Theory* IT-22, no. 6 (November 1976), pp. 644 to 654; and "Multiuser Cryptographic Techniques", *AFIPS Conference Proceedings* 45 (1976), pp. 109 to 112.
- Ralph C. Merkle, "Secure Communications over Insecure Channels", *Communications of the ACM* 21, no. 4 (April 1978), pp. 294 to 299; and his CS 244 proposal of 1974, scanned on ralphmerkle.com.
- R. L. Rivest, A. Shamir and L. Adleman, "A Method for Obtaining Digital Signatures and Public-Key Cryptosystems", *Communications of the ACM* 21, no. 2 (February 1978), pp. 120 to 126; Martin Gardner, "Mathematical Games: A New Kind of Cipher That Would Take Millions of Years to Break", *Scientific American* 237, no. 2 (August 1977), pp. 120 to 124.
- Derek Atkins, Michael Graff, Arjen K. Lenstra and Paul C. Leyland, "The Magic Words Are Squeamish Ossifrage", *ASIACRYPT '94* (1995).
- J. H. Ellis, "The Possibility of Secure Non-Secret Digital Encryption" (CESG, January 1970) and "The Story of Non-Secret Encryption" (1987; released 1997); C. C. Cocks, "A Note on 'Non-Secret Encryption'" (CESG, 20 November 1973); M. J. Williamson, "Non-Secret Encryption Using a Finite Field" (CESG, January 1974) and "Thoughts on Cheaper Non-Secret Encryption" (CESG, 1976).
- Loren M. Kohnfelder, *Towards a Practical Public-Key Cryptosystem* (BSc thesis, MIT, May 1978); Roger M. Needham and Michael D. Schroeder, "Using Encryption for Authentication in Large Networks of Computers", *Communications of the ACM* 21, no. 12 (1978), pp. 993 to 999; Dorothy E. Denning and Giovanni Maria Sacco, "Timestamps in Key Distribution Protocols", *Communications of the ACM* 24, no. 8 (1981), pp. 533 to 536; Gavin Lowe, "An Attack on the Needham-Schroeder Public-Key Authentication Protocol", *Information Processing Letters* 56 (1995), pp. 131 to 133.
- Shafi Goldwasser and Silvio Micali, "Probabilistic Encryption", *Journal of Computer and System Sciences* 28 (1984), pp. 270 to 299; Taher Elgamal, "A Public Key Cryptosystem and a Signature Scheme Based on Discrete Logarithms", *IEEE Transactions on Information Theory* 31 (1985), pp. 469 to 472; Neal Koblitz, "Elliptic Curve Cryptosystems", *Mathematics of Computation* 48 (1987), pp. 203 to 209; Victor S. Miller, "Use of Elliptic Curves in Cryptography", *CRYPTO '85* (1986); Claus-Peter Schnorr, "Efficient Signature Generation by Smart Cards", *Journal of Cryptology* 4 (1991), pp. 161 to 174; NIST, FIPS 186, *Digital Signature Standard* (1994), and FIPS 186-2 (2000).
- Matt Blaze, "Protocol Failure in the Escrowed Encryption Standard", *Proceedings of the 2nd ACM Conference on Computer and Communications Security* (1994), pp. 59 to 67; NIST, FIPS 185, *Escrowed Encryption Standard* (1994); Matt Blaze, Whitfield Diffie, Ronald Rivest, Bruce Schneier, Tsutomu Shimomura, Eric Thompson and Michael Wiener, "Minimal Key Lengths for Symmetric Ciphers to Provide Adequate Commercial Security" (1996); Hal Abelson and ten others, "The Risks of Key Recovery, Key Escrow, and Trusted Third-Party Encryption" (1997).
- Kenneth W. Dam and Herbert S. Lin (eds.), *Cryptography's Role in Securing the Information Society* (National Research Council, 1996); Susan Landau and others, "Codes, Keys and Conflicts: Issues in U.S. Crypto Policy" (Association for Computing Machinery, 1994).
- *Bernstein v. United States Department of Justice*, 176 F.3d 1132 (9th Cir. 1999), rehearing en banc granted and opinion withdrawn, 192 F.3d 1308 (9th Cir. 1999); *Junger v. Daley*, 209 F.3d 481 (6th Cir. 2000); *Universal City Studios v. Corley*, 273 F.3d 429 (2d Cir. 2001).
- Whitfield Diffie, "The First Ten Years of Public-Key Cryptography", *Proceedings of the IEEE* 76, no. 5 (1988), pp. 560 to 577; Martin E. Hellman, "An Overview of Public Key Cryptography", *IEEE Communications Magazine* (May 2002).
- Steven Levy, *Crypto: How the Code Rebels Beat the Government, Saving Privacy in the Digital Age* (Viking, 2001); Whitfield Diffie and Susan Landau, *Privacy on the Line: The Politics of Wiretapping and Encryption* (MIT Press, 1998; updated edition 2007); Simon Singh, *The Code Book* (Fourth Estate, 1999); David Kahn, *The Codebreakers* (Macmillan, 1967).
- Tim Jenkin, "Talking to Vula", *Mayibuye* (the journal of the African National Congress), 1995; Ronnie Kasrils, *Armed and Dangerous* (Heinemann, 1993; later editions); Niémah Davids, "The secret communications network that helped end apartheid", *UCT News*, University of Cape Town (22 January 2024).
- Eli Biham, Alex Biryukov and Adi Shamir, "Cryptanalysis of Skipjack Reduced to 31 Rounds Using Impossible Differentials" (1999); Dan Boneh and Ramarathnam Venkatesan, "Breaking RSA May Not Be Equivalent to Factoring", *EUROCRYPT '98* (1998); Fabrice Boudot and others, "Factorization of RSA-250" (announcement, February 2020); Luke Valenta and others, "Factoring as a Service" (2016); David Adrian and others, "Imperfect Forward Secrecy: How Diffie-Hellman Fails in Practice" (2015).
- *Weaker sources behind particular statements:* the hackcur.io and vula.codeberg.page accounts of Operation Vula (the floppy-disk keys, the reasons for not using commercial systems, Ronnie Press) and the Wikipedia article on the operation; search summaries and memory for the date and place of Cocks's December 1997 talk and the wording of Ellis's report title; Merkle's account on his own website of the 1974 course proposal and its rejection; Levy's *Crypto* for the Passover night, NSA's reaction to the Gardner column and Doligez's 1995 break; Zimmermann's own statements about the June 1991 release and the January 1996 end of the investigation; Inman's claim about NSA in the 1960s, which rests on interviews; my own recollection, unchecked against a source, for the judges who wrote the *Bernstein* and *Junger* opinions, the 42 minutes of Blaze's attack, the front-page report of 2 June 1994, the 24-bit field in Lotus Notes, the date of NSDD-189 and the title of the 1980 House hearing, and the day on which the RSA patent lapsed.
