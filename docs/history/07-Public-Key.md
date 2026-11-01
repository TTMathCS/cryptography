# Public-key cryptography

*From 1970 to 2000: how strangers learned to agree on a secret in public,
the same discovery made earlier behind GCHQ's fence, the mathematics of
signatures and elliptic curves, and the "crypto wars" over who was
allowed to use any of it.*

Every cipher on the earlier pages had the same problem. Before two people
could talk secretly, they had to share a key, and to share a key they
needed a secure way to talk. Armies solved it with couriers carrying
locked bags of key lists; banks used armoured vans. In the 1970s, a few
people asked whether there was a way round it. Their answer, public-key
cryptography, is the reason a web browser can talk securely to a server
it has never met. It is probably the most important idea in the whole
history of the subject.

| When | Who | What |
|---|---|---|
| 1970 | James Ellis, GCHQ | shows "non-secret encryption" is possible (secret) |
| 1973–1974 | Clifford Cocks, Malcolm Williamson, GCHQ | RSA-like and Diffie–Hellman-like schemes (secret) |
| 1974 | Ralph Merkle, Berkeley | the puzzle idea, in a rejected student project |
| 1976 | Whitfield Diffie and Martin Hellman | "New Directions in Cryptography" |
| 1977 | Rivest, Shamir and Adleman | RSA; Martin Gardner's column and the RSA-129 challenge |
| 1978 | Loren Kohnfelder | certificates |
| 1979 | Lamport; Merkle | one-time signatures; hash trees |
| 1985 | Koblitz and Miller; Taher Elgamal | elliptic-curve cryptography; ElGamal encryption and signatures |
| 1991 | Phil Zimmermann | PGP |
| 1993–1996 | the White House | the Clipper chip and key escrow |
| 1994 | Atkins, Graff, Lenstra, Leyland | RSA-129 factored: "squeamish ossifrage" |
| 1996–2000 | Bernstein, Junger; the US government | court rulings on code as speech; export rules relaxed |
| 1997 | GCHQ | reveals Ellis, Cocks and Williamson's work |

## The key distribution problem

By the 1970s the problem was getting worse. Computer networks connected
banks, companies and universities, and every pair of users who wanted to
talk privately needed their own shared key: a thousand users need
almost half a million keys. Governments managed with huge courier systems
and printed key material by the ton. Nobody else could.

Whitfield Diffie, a young mathematician who had worked at MIT and Stanford's
artificial intelligence lab, became obsessed with two questions. Could two
people who had never met set up a secret over a line anyone could tap?
And could a digital message be "signed", so that anyone could check who
wrote it but nobody could forge it? In 1974, after months travelling the
country to learn what he could, he was pointed to Martin Hellman, a young
professor of electrical engineering at Stanford who was working on the
same subject, and the two met that autumn.

## Merkle's puzzles

Ralph Merkle got there first, as a Berkeley undergraduate. In autumn 1974
he proposed, as a project for Lance Hoffman's computer security course, a
way for two parties to agree on a key over an open channel. Hoffman didn't
understand it and asked for a rewrite, then rejected that too. Merkle
dropped the course but kept going, and his paper "Secure Communications
over Insecure Channels" was eventually published in *Communications of the
ACM* in 1978, after one reviewer had dismissed the idea as outside the
mainstream of cryptographic thinking.

The idea is this. Alice creates a large number of *puzzles*, each a
message locked with a deliberately weak key that takes some effort to
find by trial and error. Inside each puzzle is an ID number and a session
key. She sends all of them to Bob. Bob picks one at random, solves it, and
announces only its ID. Alice looks up which key goes with that ID, and now
both have it. An eavesdropper who heard everything has to solve puzzles
until she hits the right one, and on average that means solving half of
them.

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

Bob did about 2,000 units of work, Eve about 1.7 million. The gap grows
with the square of the effort: make both numbers a million and Bob does
a million units while Eve does half a trillion. That advantage is real
but too small to rely on, since a powerful attacker can simply buy more
computers. What mattered was the proof that it could be done at all.

## Diffie and Hellman

### New directions

Diffie and Hellman, joined for a time by Merkle, worked through 1975 and
1976. In a paper at the National Computer Conference in June 1976 they
described the idea of a *public-key cryptosystem*: each person has two
keys, a public one that anyone can use to encrypt messages to them, and a
private one that only they hold for decrypting. They didn't yet know how
to build one. The hard part is finding a *trapdoor one-way function*, a
calculation that is easy to do, hard to undo, but easy to undo for someone
holding a secret.

In November 1976 the *IEEE Transactions on Information Theory* published
their paper "New Directions in Cryptography". It opens: "We stand today on
the brink of a revolution in cryptography." It contained:

- **A key exchange** that works over a public line, now called
  [Diffie–Hellman](../01-key-exchange/Diffie-Hellman.md). Hellman worked
  out the concrete method in May 1976, building on discussions with Diffie
  and Merkle. Hellman has since suggested it be called Diffie–Hellman–Merkle.
- **The definition of a digital signature**: a value only the private-key
  holder can produce, which anyone can check with the public key. It
  would let contracts, software and money move by computer.
- **The public-key cryptosystem**, as an open problem.

### How the key exchange works

Alice and Bob agree in public on a large prime *p* and a number *g*. Alice
picks a secret *a* and sends *g^a* mod *p*; Bob picks a secret *b* and sends
*g^b* mod *p*. Each raises what they received to their own secret power,
and both get *g^ab* mod *p*. An eavesdropper sees *g^a* and *g^b* but, as far
as anyone knows, can only get *g^ab* by finding *a* or *b*, the *discrete
logarithm problem*. With a 2048-bit prime that is far out of reach. With a
small prime it is easy, as this toy shows.

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

The [Diffie–Hellman page](../01-key-exchange/Diffie-Hellman.md) has the
real-size version, and [Hard problems](../10-math-foundations/Hard-Problems.md#discrete-log-modulo-a-prime)
explains why the discrete logarithm is hard. Stanford patented the method;
the patent (US 4,200,770, Hellman, Diffie and Merkle) expired in 1997.
Diffie and Hellman received the Turing Award, computing's highest honour,
for 2015.

## RSA

### Three people at MIT

At MIT, Ron Rivest, Adi Shamir and Leonard Adleman read the Diffie–Hellman
paper and set out to find the missing trapdoor. Rivest and Shamir proposed
schemes; Adleman, the number theorist, broke them, one after another, for
months. In April 1977, after a Passover evening at a student's home, Rivest
couldn't sleep, worked through the night, and by morning had written up a
scheme based on multiplying two large primes. Adleman couldn't break it.

**RSA** works like this. Pick two large primes *p* and *q* and multiply
them to get *n*. Choose a public exponent *e*, and compute a private
exponent *d* that undoes it, which is easy only if you know *p* and *q*. To
encrypt *m*, compute *m^e* mod *n*; to decrypt, raise the result to *d*.
Reversing the process without *d* seems to require factoring *n*, and
factoring a product of two 300-digit primes is beyond any known method.
The same keys give signatures: raise a message to *d* to sign it, and
anyone can check it by raising the signature to *e*.

```python
from math import gcd

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

# Clifford Cocks's 1973 GCHQ version used the modulus itself as the exponent
print(gcd(n, phi), pow(pow(m, n, n), pow(n, -1, phi), n))
```

Output:

```
public (3233, 17) private 2753
2943 1977
788 True
1 1977
```

Real RSA needs careful padding before the exponentiation, or it leaks;
see the [RSA page](../02-signatures/RSA.md) and the attacks on the
[internet era](08-Internet-Era.md#from-ssl-to-tls-13) page.

### Squeamish ossifrage

The idea reached the public in Martin Gardner's "Mathematical Games"
column in *Scientific American* in August 1977, under the title "A new
kind of cipher that would take millions of years to break". The column
printed a challenge: a message encrypted with a 129-digit modulus, with
$100 from the inventors to whoever read it. The column quoted Rivest's
estimate that factoring a 125-digit number with the best methods of the
day would take 40 quadrillion years; Rivest later said he didn't recall
how that figure was reached. Thousands of readers wrote in for the technical memo, which went
out only months later, after an NSA employee's warning (below) that such
papers might break export law made MIT cautious.

The formal paper, "A Method for Obtaining Digital Signatures and Public-Key
Cryptosystems", appeared in *Communications of the ACM* in February 1978,
with "Alice" and "Bob" as its sender and receiver (they may already
appear in the 1977 memo), the start of a long tradition. MIT patented RSA in 1983; the patent ran until September 2000,
and the inventors' company, RSA Data Security, founded in 1982, licensed
it to almost every security product of the 1980s and 1990s.

RSA-129 fell in April 1994, seventeen years after the column, not forty
quadrillion. Derek Atkins, Michael Graff, Arjen Lenstra and Paul Leyland
coordinated about 600 volunteers and 1,600 computers over eight months,
using the quadratic sieve, a factoring method that didn't exist in 1977.
The message read: THE MAGIC WORDS ARE SQUEAMISH OSSIFRAGE. The lesson was
the same as with DES: estimates of security depend on the best known
attack, and attacks improve. RSA keys have grown from 512 bits to 2048 and
more since.

Rivest, Shamir and Adleman received the Turing Award for 2002.

## GCHQ's secret

### Non-secret encryption

In December 1997 GCHQ announced that its own staff had found the same
ideas years earlier. Clifford Cocks gave the first public talk about it on
18 December 1997. The story, told in documents GCHQ released then, runs
as follows.

- **James Ellis**, a GCHQ engineer, wondered in the late 1960s whether
  secure communication was possible without a shared secret. He
  remembered a wartime Bell Labs report on a telephone scrambler in which
  the receiver added noise to the line and later removed it, so the
  sender never needed a key. In January 1970 he wrote a classified paper,
  "The Possibility of Secure Non-Secret Digital Encryption", proving that
  it was possible in principle. He couldn't find a practical way to do it.
- **Clifford Cocks**, a young Cambridge mathematician, joined GCHQ in
  September 1973. A colleague mentioned Ellis's idea; Cocks thought about
  it one evening and within about half an hour had a scheme using the
  product of two primes. His note of 20 November 1973 describes what is,
  in effect, RSA with the public exponent equal to the modulus, the
  variant at the end of the example above.
- **Malcolm Williamson**, a school friend of Cocks's who had joined GCHQ
  too, found in early 1974 what is essentially Diffie–Hellman key exchange,
  and refined it in 1976.

GCHQ didn't use the ideas. Computers of the early 1970s were too slow for
large exponentiations, and nobody saw a pressing need. When Diffie and
Hellman published, GCHQ decided against revealing its own work. Ellis died
on 25 November 1997, a few weeks before the announcement.

Two qualifications are worth keeping. First, there is no sign that the
GCHQ researchers developed digital signatures, which were Diffie and
Hellman's other big idea. Second, a former NSA director, Bobby Ray Inman, has claimed NSA had
public-key cryptography in the 1960s; no evidence has been published to
support that.

## Building on it

### Signatures, certificates and new mathematics

The late 1970s and 1980s turned the two discoveries into a toolkit.

- **Certificates.** A public key is only useful if you know whose it is. In
  his 1978 MIT bachelor's thesis, Loren Kohnfelder proposed *certificates*:
  a public key and a name, signed by someone trusted. The international
  X.509 standard followed in 1988 and is still how the web proves
  identity; see [PKI](../protocols/PKI.md) and
  [X.509](../formats/X.509.md).
- **Signatures from hashes.** In 1979 Leslie Lamport showed how to make a
  *one-time signature* from nothing but a hash function, and Merkle showed
  how to combine many of them with a tree of hashes. These ideas came
  back in the 2020s as post-quantum signatures; see
  [stateful hash signatures](../02-signatures/Stateful-Hash-Signatures.md)
  and [SLH-DSA](../02-signatures/SLH-DSA.md).
- **Other trapdoors.** Michael Rabin proposed a scheme in 1979 that is
  provably as hard as factoring. Taher Elgamal published encryption and
  signatures based on the discrete logarithm in 1985
  ([ElGamal](../03-public-key-encryption/ElGamal.md)), and Claus-Peter
  Schnorr a shorter, elegant signature in 1989
  ([Schnorr](../02-signatures/Schnorr.md)). NIST proposed the Digital
  Signature Algorithm in 1991, standardized in 1994 as FIPS 186
  ([DSA](../02-signatures/DSA.md)).
- **Lattices and codes.** Robert McEliece proposed a public-key system
  based on error-correcting codes in 1978; its keys were too big for the
  time, but it is now a [post-quantum candidate](../01-key-exchange/Code-Based-KEMs.md).

### Elliptic curves

In 1985 Neal Koblitz at the University of Washington and Victor Miller at
IBM independently proposed doing Diffie–Hellman and similar schemes in the
group of points on an *elliptic curve* over a finite field, instead of in
the numbers mod *p*. Hendrik Lenstra's new factoring method, which used
elliptic curves, had just shown how useful the curves could be.

The point was size. The best attacks on the elliptic-curve discrete
logarithm are much weaker than those on factoring, so a 256-bit curve key
gives about the same security as a 3072-bit RSA key. Adoption took two
decades, slowed by unfamiliar mathematics and by patents, many held by the
Canadian company Certicom. NSA endorsed elliptic curves in its Suite B in
2005, and Daniel J. Bernstein's Curve25519 (2005) and the Ed25519
signature scheme (2011) made them fast and hard to misuse. Today
[X25519](../01-key-exchange/ECDH.md) is the most widely used key exchange
on the internet, now usually paired with ML-KEM, and
[Ed25519](../02-signatures/EdDSA.md) is the default SSH key type. [Elliptic curves](../10-math-foundations/Elliptic-Curves.md)
explains the mathematics.

## The crypto wars

### NSA meets the universities

Public-key cryptography came from universities, and NSA had not been
consulted. The reaction came quickly. In July 1977 an NSA employee, Joseph
Meyer, wrote privately to the IEEE warning that publishing cryptography
papers might break the arms-export laws. In 1978 the government put
secrecy orders on two cryptography patent applications by outside
inventors, then lifted them after protests. NSA's director, Admiral Bobby
Inman, eventually took the argument into the open, and in 1980–81 a study
group of academics and NSA representatives agreed on a voluntary scheme
under which researchers could send papers to NSA for review before
publication.

### Export controls

The longer fight was about exports. American law classed strong encryption
as a munition, on the same list as tanks and missiles. Software with
strong encryption could be sold freely inside the United States but not
exported without a licence, which was rarely granted. From 1992 the
government allowed easy export of products limited to 40-bit keys, and
that is what most of the world got: the international version of Netscape
Navigator, for example, used 40-bit RC4. In August 1995 a French student,
Damien Doligez, broke a 40-bit Netscape session in eight days using
borrowed computers; in January 1997 Ian Goldberg, a Berkeley graduate
student, broke a 40-bit challenge in three and a half hours.

### PGP

In June 1991 Phil Zimmermann, a software engineer in Colorado, released
**PGP** ("Pretty Good Privacy"), free software that let anyone encrypt and
sign e-mail with RSA and a symmetric cipher of his own, BassOmatic. Eli
Biham soon showed BassOmatic was weak, and PGP 2.0 (1992) replaced it with
the IDEA cipher. Zimmermann was prompted by a Senate bill
that year whose language would have pushed makers of secure equipment to
let the government read plaintext. A friend posted it to the internet, and
it spread worldwide within days.

Zimmermann was soon in trouble twice over. RSA Data Security accused him of
infringing its patent, a dispute resolved for non-commercial use when MIT
released a version built on RSA's licensed RSAREF library. And from 1993 a federal grand jury
investigated whether PGP's spread abroad had broken export law. The case
was dropped in January 1996 without charges. In 1995 MIT Press published
PGP's complete source code as a printed book, on the reasoning that books
were protected speech and could be exported; later versions went abroad
the same way and were scanned back in by volunteers. PGP's web of trust, its file formats and its successor
standard, OpenPGP, are on the [OpenPGP page](../protocols/OpenPGP.md).

### The Clipper chip

On 16 April 1993 the White House announced the **Clipper chip**, a
government-designed encryption chip for telephones. It used a classified
NSA cipher, Skipjack, with 80-bit keys. The catch was *key escrow*: each
chip's unique key would be split into two parts, each useless on its
own, held by two government agencies, and every call would carry a *Law Enforcement Access Field*
(LEAF) from which police with a warrant could recover the call's key.
The standard was issued as FIPS 185 in February 1994, and AT&T built a
secure phone with the chip.

Opposition was broad, from civil-liberties groups to the computer industry.
In 1994 Matt Blaze, a researcher at AT&T Bell Labs, showed that the LEAF
was protected by only a 16-bit checksum. With about 65,000 tries, a rogue
user could make a fake LEAF that passed the chip's check but gave the
government nothing, so the escrow could be switched off by anyone who
wanted to. Few people bought Clipper phones, and the scheme was abandoned
within a few years. Skipjack itself was declassified in 1998.

### Code as speech

Two court cases made the export rules hard to defend. In 1995 Daniel J.
Bernstein, then a Berkeley graduate student, backed by the Electronic
Frontier Foundation, sued for the right to publish the source code of his
cipher, Snuffle, without a licence. In 1996 a federal judge ruled that
source code is speech protected by the First Amendment. An appeals court
panel agreed in 1999, but the full court withdrew that opinion to rehear
the case, and it was eventually dismissed without a final ruling. In a separate case, *Junger v. Daley*, the Sixth
Circuit court of appeals ruled in April 2000 that "computer source code
is an expressive means for the exchange of information and ideas about
computer programming" and is protected.

The government gave way in steps. At the end of 1996 control of commercial
encryption moved from the State Department's munitions list to the
Commerce Department, and in January 2000 new rules allowed most
encryption software to be exported after a one-time review. Strong
cryptography became something anyone could build into a product sold
anywhere. The argument about lawful access did not end; it returned in
the 2010s over encrypted phones and messaging, as the
[internet era](08-Internet-Era.md#the-second-crypto-war) page tells.

## Can these be broken today?

Not the ideas, only the sizes. Every public-key method on this page is
still safe against ordinary computers when the numbers are big enough,
and every one of them falls when they are too small. All of the
factoring and discrete-logarithm ones would fall to a large quantum
computer, which is the story of the [last page](10-Quantum-and-Post-Quantum.md).

| Method | Broken today? | The attack in plain words |
|---|---|---|
| Merkle's puzzles | yes, for any practical size | The attacker's work is only the square of the users'. Buy a million times more computers than the users have and you keep up with puzzles a thousand times harder. |
| Diffie–Hellman, 2048 bits and up | no | Taking discrete logarithms modulo a 2048-bit prime is out of reach. The 512-bit "export" size fell in 2015 (Logjam): one big precomputation per prime, then each connection in minutes. |
| RSA, 2048 bits and up | no | Factoring is the known way in, and the record is 829 bits (RSA-250, 2020, about 2,700 core-years). A 512-bit key cost under four hours and about $75 of rented cloud computing in 2015. |
| Cocks's and Williamson's GCHQ versions | the same as RSA and Diffie–Hellman | They are the same mathematics. |
| Elliptic curves, 256 bits | no | The best attack, Pollard's rho, needs about 2¹²⁸ steps. Records stop near 117 bits. |
| BassOmatic (PGP 1.0) | yes | Biham soon showed it weak, and PGP 2.0 replaced it with IDEA. |
| Clipper's escrow | bypassed | Its 16-bit check meant about 65,000 tries made a fake escrow field: Blaze's 1994 attack. Skipjack itself held, apart from reduced-round attacks. |
| Toy keys of any kind | instantly | See below. |

Here is a small RSA key broken by factoring, with Pollard's rho method
(1975). The two primes have 10 digits each, so the key is 64 bits.
Rho finds a factor in roughly the square root of the smaller prime's
size, about 50,000 steps here, and then the private key is one line:

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

The same steps on a 2048-bit key would need about 2⁵¹² rho steps, and
the best real method, the number field sieve, still needs far more than
all the computers on Earth could do. That gap, from instant to
impossible as the numbers grow, is what public-key cryptography rests
on.

## What this era left behind

- **Public-key cryptography**: key exchange and signatures between
  strangers, the foundation of TLS, SSH, software updates and online
  payments.
- **Hard problems as the basis of security**: factoring and discrete
  logarithms. Both fall to a large quantum computer, which is why the
  [post-quantum](10-Quantum-and-Post-Quantum.md) story begins here too.
- **Cryptography as public science**, with open papers, open standards and
  open code, and court rulings, *Junger* above all, that treat source
  code as protected speech.
- **A standing argument** about whether governments should be able to read
  encrypted traffic, which every generation since has had again.

## See also

- [Diffie–Hellman](../01-key-exchange/Diffie-Hellman.md),
  [RSA](../02-signatures/RSA.md), [ECDH](../01-key-exchange/ECDH.md),
  [ECDSA](../02-signatures/ECDSA.md): the algorithms themselves
- [Hard problems](../10-math-foundations/Hard-Problems.md): what each one
  rests on
- [PKI](../protocols/PKI.md): certificates, Kohnfelder's idea grown up
- [From Shannon to DES](06-Shannon-to-DES.md): the symmetric side of the
  same years

## References

- Whitfield Diffie and Martin E. Hellman, "New Directions in Cryptography", *IEEE Transactions on Information Theory* IT-22, no. 6 (November 1976), pp. 644–654 / Diffie and Hellman, "Multiuser Cryptographic Techniques", *AFIPS Conference Proceedings* 45 (1976), pp. 109–112
- Ralph C. Merkle, "Secure Communications over Insecure Channels", *Communications of the ACM* 21, no. 4 (1978), pp. 294–299 / Merkle, CS244 project proposal (1974), scanned at ralphmerkle.com
- R. L. Rivest, A. Shamir and L. Adleman, "A Method for Obtaining Digital Signatures and Public-Key Cryptosystems", *Communications of the ACM* 21, no. 2 (February 1978), pp. 120–126 / Martin Gardner, "Mathematical Games: A New Kind of Cipher That Would Take Millions of Years to Break", *Scientific American* 237, no. 2 (August 1977)
- D. Atkins, M. Graff, A. K. Lenstra and P. C. Leyland, "The Magic Words Are Squeamish Ossifrage" (ASIACRYPT '94)
- J. H. Ellis, "The Possibility of Secure Non-Secret Digital Encryption" (CESG report, January 1970) and "The History of Non-Secret Encryption" (1987; released 1997) / C. C. Cocks, "A Note on 'Non-Secret Encryption'" (CESG, 20 November 1973) / M. J. Williamson, "Non-Secret Encryption Using a Finite Field" (CESG, 1974) and "Thoughts on Cheaper Non-Secret Encryption" (CESG, 1976)
- Loren M. Kohnfelder, *Towards a Practical Public-Key Cryptosystem* (BSc thesis, MIT, 1978) / Leslie Lamport, "Constructing Digital Signatures from a One Way Function" (SRI CSL-98, 1979) / Ralph C. Merkle, *Secrecy, Authentication, and Public Key Systems* (PhD thesis, Stanford, 1979)
- Neal Koblitz, "Elliptic Curve Cryptosystems", *Mathematics of Computation* 48 (1987), pp. 203–209 / Victor S. Miller, "Use of Elliptic Curves in Cryptography" (CRYPTO '85)
- Matt Blaze, "Protocol Failure in the Escrowed Encryption Standard", *Proceedings of the 2nd ACM Conference on Computer and Communications Security* (1994), pp. 59–67 / NIST, FIPS 185, *Escrowed Encryption Standard* (1994)
- Fabrice Boudot et al., "Factorization of RSA-250" (announcement, February 2020) / Luke Valenta et al., "Factoring as a Service" (Financial Cryptography 2016) / David Adrian et al., "Imperfect Forward Secrecy: How Diffie-Hellman Fails in Practice" (Logjam, ACM CCS 2015)
- John M. Pollard, "A Monte Carlo Method for Factorization", *BIT* 15 (1975), pp. 331–334
- *Bernstein v. United States Department of Justice*, 176 F.3d 1132 (9th Cir. 1999), rehearing en banc granted and opinion withdrawn, 192 F.3d 1308 (9th Cir. 1999) / *Junger v. Daley*, 209 F.3d 481 (6th Cir. 2000)
- Steven Levy, *Crypto: How the Code Rebels Beat the Government, Saving Privacy in the Digital Age* (Viking, 2001) / Whitfield Diffie and Susan Landau, *Privacy on the Line: The Politics of Wiretapping and Encryption* (MIT Press, 1998; updated 2007)

*Weaker sources:* search summaries for the date and place of Cocks's December 1997 talk and the wording of Ellis's report title; Merkle's account on his own website of the 1974 course proposal and its rejection; Levy's *Crypto* for the Passover night, NSA's reaction to the Gardner column and Doligez's 1995 break; Zimmermann's own statements about the June 1991 release and the January 1996 end of the investigation; Inman's claim about NSA in the 1960s, which rests on interviews.
