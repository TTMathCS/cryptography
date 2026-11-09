# 3. Commitments and Coin Flipping

*A commitment is a sealed envelope made of mathematics: you put a value in now,
everyone can see the envelope, nobody can see inside it, and when you open it
later nobody, including you, can pretend it held something else. This chapter
starts with the puzzle that created the idea, Manuel Blum's coin flip over the
telephone (1981), and follows the envelope as it grows: from a single hash, to
Pedersen's commitments that can be added together while still sealed, to Merkle
trees that seal a million values under one 32-byte root, to KZG commitments that
seal a whole polynomial and now carry Ethereum's data. On the way you will run a
trusted-setup ceremony in a group of 23 elements, see how WhatsApp and Apple
use commitments to catch a server that lies about your friends' keys, and flip a
fair coin with Earth across twenty minutes of empty space.*

!!! abstract "In this chapter"
    **You will learn:**

    - what hiding and binding mean, and why no commitment can have both
      perfectly, against unlimited computing power;
    - how Blum's coin flip works, in his number-theory form and with a hash, and
      why one party can always walk away from a coin flip before it ends;
    - how to build a safe hash commitment, and the three ways careless ones fail
      (guessable values, ambiguous encodings, copied commitments);
    - how Pedersen commitments hide perfectly, bind under the discrete logarithm,
      and add up while sealed;
    - how Merkle trees act as vector commitments, with an inclusion proof coded,
      and how the leaf-versus-node confusion breaks careless trees;
    - what KZG polynomial commitments give, why they need a setup ceremony, and
      how the Zcash (2016) and Ethereum (2023) ceremonies worked;
    - how key transparency (CONIKS, WhatsApp, Apple) turns a key server into
      something its users can audit.

    **You need:** [Chapter 2](02-Secret-Sharing.md) (shares and polynomials),
    hash functions from [Chapter 9 of book 1](../../book/09-Hash-Functions.md),
    and the discrete logarithm from
    [Chapter 12 of book 1](../../book/12-Diffie-Hellman.md). The one-section
    version of this chapter is §23.4 of
    [book 1's Chapter 23](../../book/23-Advanced-Protocols.md).

    **Levels:** §3.1 to §3.3 are for beginners, §3.4 to §3.10 are intermediate,
    §3.11 is expert.

## 3.1 The problem

*Level: beginner.*

Two people who have just divorced live in different cities. They agree to settle
who keeps the car by flipping a coin, and they agree to do it over the telephone.
One of them flips and says "heads". The other has no way to know whether a coin
was flipped at all. Manuel Blum, a computer scientist at the University of
California, Berkeley, used this little scene to open a paper he presented at the
CRYPTO conference in Santa Barbara in August 1981, titled "Coin Flipping by
Telephone: A Protocol for Solving Impossible Problems". The subtitle was a joke
with a point. Flipping a fair coin between two people who distrust each other,
over a wire, sounds impossible: whoever speaks second can always choose their
call after hearing the first. Blum showed that it is not impossible, if the first
speaker can say something that fixes their choice without revealing it.

That "something" is a **commitment**. In daily life we use physical versions all
the time. A sealed-bid auction asks every bidder to hand in an envelope before
any envelope is opened. A chess player adjourning a game for the night seals
the next move in an envelope for the referee. In each case two promises are being made at once:

- **Hiding.** Until it is opened, the envelope reveals nothing about what is
  inside.
- **Binding.** Once it is handed over, the envelope can only ever be opened to
  the one thing that was put in it.

A commitment scheme is a pair of procedures that make these two promises with
mathematics instead of paper. To **commit** to a value $m$, you compute a short
string $C$ from $m$ and some fresh randomness $r$, and publish $C$. To **open**,
you reveal $m$ and $r$, and anyone can recompute $C$ and check it.

Commitments sound modest, yet they are among the most used tools in this book.
Every zero-knowledge proof in Part II begins with a commitment
([Chapter 5](05-Zero-Knowledge-Proofs.md)); verifiable secret sharing
([Chapter 2](02-Secret-Sharing.md)) works because the dealer commits to the
polynomial; confidential payments hide every amount in one; transparency logs
commit to huge directories so a server cannot show different people different
truths; and the largest cryptographic ceremonies ever held produced the public
parameters for one commitment scheme. Figure 3.1 shows the line from
Blum's telephone to those ceremonies.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of commitments from Merkle's hash tree in 1979 to Ethereum's KZG blobs in 2024" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="390" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1979</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Merkle describes the hash tree</text>
<text x="78" y="55" text-anchor="end" font-weight="bold">1981</text>
<circle cx="92" cy="50" r="3.5"/>
<text x="108" y="55">Blum: coin flipping by telephone (CRYPTO '81)</text>
<text x="78" y="83" text-anchor="end" font-weight="bold">1986</text>
<circle cx="92" cy="78" r="3.5"/>
<text x="108" y="83">Cleve: one side can always bias a two-party flip</text>
<text x="78" y="111" text-anchor="end" font-weight="bold">1989</text>
<circle cx="92" cy="106" r="3.5"/>
<text x="108" y="111">Naor: bit commitment from any pseudorandom generator</text>
<text x="78" y="139" text-anchor="end" font-weight="bold">1991</text>
<circle cx="92" cy="134" r="3.5"/>
<text x="108" y="139">Pedersen: commitments that add while sealed</text>
<text x="78" y="167" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="162" r="3.5"/>
<text x="108" y="167">Kate, Zaverucha, Goldberg: polynomial commitments</text>
<text x="78" y="195" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="190" r="3.5"/>
<text x="108" y="195">Certificate Transparency, RFC 6962</text>
<text x="78" y="223" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="218" r="3.5"/>
<text x="108" y="223">CONIKS key transparency; Confidential Transactions</text>
<text x="78" y="251" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="246" r="4.5"/>
<text x="108" y="251">Zcash's six-person setup ceremony (October)</text>
<text x="78" y="279" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="274" r="4.5"/>
<text x="108" y="279">Powers of Tau ends with 87 contributions</text>
<text x="78" y="307" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="302" r="4.5"/>
<text x="108" y="307">Ethereum's KZG ceremony: 141,416 contributions</text>
<text x="78" y="335" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="330" r="3.5"/>
<text x="108" y="335">Key transparency at WhatsApp (April) and Apple (December)</text>
<text x="78" y="363" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="358" r="3.5"/>
<text x="108" y="363">Ethereum blobs go live with KZG commitments (March)</text>
</svg>
<figcaption>Figure 3.1. Forty-five years of sealed envelopes. The larger dots are the setup ceremonies, where thousands of strangers jointly made the public parameters for one commitment scheme.</figcaption>
</figure>

Before any of that, the coin.

**Why the obvious protocols fail.** Suppose Alice and Bob each pick a bit and the
coin is the XOR of the two bits: heads if they match, tails if they differ. If
both bits are chosen honestly at random, the XOR is random, and it stays random
as long as *either* bit is random and independent of the other. That last
condition is the whole difficulty. If Alice announces her bit first, Bob can pick
his after hearing it and set the XOR to whatever he likes. Sending at the "same
moment" does not help on a telephone line or a network: there is no same moment,
and whoever waits a fraction of a second longer sees the other's bit first.

Encryption looks like an answer and is not. Alice could send her bit encrypted
under a key she keeps, wait for Bob's bit, then send the key. But with most
ciphers Alice can choose, after the fact, a different key that decrypts the same
ciphertext to the other bit; a one-time pad makes this trivial, since any
ciphertext decrypts to anything under some key. Encryption promises hiding. It
does not promise binding, and a coin flip needs both.

**What a commitment needs to promise, precisely.** Write $\mathrm{Commit}(m; r)$
for the commitment to $m$ with randomness $r$.

- **Hiding:** for any two values $m_0, m_1$, the commitments
  $\mathrm{Commit}(m_0; r)$ and $\mathrm{Commit}(m_1; r')$ with fresh random
  $r, r'$ look the same to the receiver. *Perfectly* hiding means they have
  exactly the same distribution; *computationally* hiding means no efficient
  algorithm can tell them apart better than by guessing.
- **Binding:** nobody can find $(m, r)$ and $(m', r')$ with $m \ne m'$ and
  $\mathrm{Commit}(m; r) = \mathrm{Commit}(m'; r')$. *Perfectly* binding means
  no such pair exists at all; *computationally* binding means it exists but no
  efficient algorithm can find it.

**Neither can be free of assumptions in both directions.** Here is the argument
in two sentences, and it is worth learning by heart because it explains half of
this chapter. If a commitment is perfectly hiding, then the commitment to 0
could equally well be a commitment to 1, so an opening to 1 exists, and someone
with unlimited computing power can find it: binding must rest on a hard problem.
If a commitment is perfectly binding, it determines $m$, so someone with
unlimited computing power can try every $m$ and $r$ until one fits: hiding must
rest on a hard problem. Every scheme in this chapter makes this choice, and you
will see it made again and again.

## 3.2 Coin flipping by telephone

*Level: beginner.*

With an envelope in hand, the coin flip is three messages long (Figure 3.2).

<div class="mars-steps" markdown>

1. **Alice commits.** She picks a random bit $a$ and fresh randomness $r$, and
   sends $C = \mathrm{Commit}(a; r)$.
2. **Bob calls.** He picks a random bit $b$ and sends it in the clear.
3. **Alice opens.** She sends $a$ and $r$. Bob checks that they produce $C$.
   The coin is $a \oplus b$.

</div>

Why is this fair? If Alice is honest, her $a$ is random and Bob learns nothing
about it before he chooses $b$ (hiding), so whatever rule Bob uses to choose $b$,
the result $a \oplus b$ is random. If Bob is honest, his $b$ is random, and Alice
fixed $a$ before she heard it (binding), so whatever rule she used to choose $a$,
the result is random. Either honest party guarantees a fair coin. That is the
property we want from every protocol in this book: correctness should depend only
on *your own* honesty, not on trusting the other side.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Message flow of a coin flip: Alice commits, Bob calls his bit, Alice opens, and the coin is the XOR" fill="currentColor" font-size="14">
<rect x="20" y="10" width="140" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="31" text-anchor="middle" font-weight="bold">Alice</text>
<rect x="480" y="10" width="140" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="31" text-anchor="middle" font-weight="bold">Bob</text>
<line x1="90" y1="42" x2="90" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="550" y1="42" x2="550" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="100" y="68" font-size="13" font-style="italic">picks bit a and randomness r</text>
<line x1="90" y1="100" x2="542" y2="100" stroke="currentColor" stroke-width="2"/>
<polygon points="550,100 540,95 540,105"/>
<text x="320" y="92" text-anchor="middle">1. C = Commit(a; r)</text>
<text x="540" y="128" font-size="13" font-style="italic" text-anchor="end">picks bit b, knowing only C</text>
<line x1="550" y1="160" x2="98" y2="160" stroke="currentColor" stroke-width="2"/>
<polygon points="90,160 100,155 100,165"/>
<text x="320" y="152" text-anchor="middle">2. b, in the clear</text>
<line x1="90" y1="220" x2="542" y2="220" stroke="currentColor" stroke-width="2"/>
<polygon points="550,220 540,215 540,225"/>
<text x="320" y="212" text-anchor="middle">3. open: a and r</text>
<text x="540" y="250" font-size="13" font-style="italic" text-anchor="end">checks Commit(a; r) = C</text>
<text x="320" y="282" text-anchor="middle" font-weight="bold">coin = a XOR b</text>
</svg>
<figcaption>Figure 3.2. Blum's coin flip. Hiding stops Bob from choosing b to match a; binding stops Alice from changing a after hearing b. If either player picks a random bit, the coin is fair.</figcaption>
</figure>

**Blum's own envelope.** Hash functions as we use them today did not exist in
1981, so Blum built his envelope from number theory, from the difficulty of
factoring a product of two large primes. The version usually taught, which keeps
his idea, runs like this. Alice picks two secret primes $p$ and $q$, both of the
form $4k + 3$, and sends their product $n$. A number that is a square modulo
$n$ has exactly four square roots, $\pm x$ and $\pm y$; knowing $p$ and $q$,
Alice can find all four, but without them finding even one is as hard as
factoring $n$. And if anyone holds two "unrelated" roots $x$ and $y$ (with
$y \ne \pm x$), then $\gcd(x - y, n)$ is $p$ or $q$, so they can factor $n$.

1. Bob picks a secret $x$ and sends $a = x^2 \bmod n$.
2. Alice computes the four roots of $a$. She cannot tell which pair, $\pm x$ or
   $\pm y$, Bob started from, because both pairs are equally likely. She picks
   one root and sends it.
3. If Alice happened to send $\pm y$, Bob now has two unrelated roots, factors
   $n$, and proves he won by showing $p$ and $q$. If she sent $\pm x$, Bob
   learns nothing new, and Alice wins; she reveals $p$ and $q$ at the end so Bob
   can check that $n$ was an honest product of two such primes.

Here the commitment is Bob's square $a$: it binds him to his pair of roots,
because he cannot find another pair without factoring, and it hides which pair
from Alice, because the two pairs look the same to her.

**By hand.** Take $p = 7$ and $q = 11$, so $n = 77$. Bob picks $x = 13$ and
sends $a = 169 \bmod 77 = 15$. Alice works modulo each prime. Modulo 7,
$15 \equiv 1$, whose roots are $\pm 1$. Modulo 11, $15 \equiv 4$, whose roots are
$\pm 2$. Combining each pair with the Chinese remainder theorem gives four roots
of 15 modulo 77:

| mod 7 | mod 11 | root mod 77 |
|---|---|---|
| 1 | 2 | 57 |
| 1 | 9 | 64 |
| 6 | 2 | 13 |
| 6 | 9 | 20 |

Check one: $20^2 = 400 = 5 \cdot 77 + 15$. The pairs are $\{13, 64\}$ and
$\{20, 57\}$, since $64 = 77 - 13$ and $57 = 77 - 20$. Alice cannot tell which
pair holds Bob's number. Say she sends 20. Bob computes
$\gcd(13 - 20, 77) = \gcd(7, 77) = 7$, so he has factored 77, and he wins. Had
she sent 13 or 64, Alice would have won. Each outcome has probability exactly
one half, whatever Alice does.

### Code it

The protocol with the toy primes above. Real use would need primes of 1,024 bits
or more each, and Bob would check at the end that $n$ really is a product of two
primes of the form $4k + 3$. The `random` module is fine for a demonstration;
real protocols draw secrets from `secrets`.

```python
import math, random

random.seed(2026)
p, q = 7, 11                        # Alice's secret primes, both 3 mod 4
n = p * q

def four_roots(a):                  # all square roots of a mod n: needs p and q
    rp, rq = pow(a, (p + 1) // 4, p), pow(a, (q + 1) // 4, q)
    out = set()
    for sp in (rp, p - rp):
        for sq in (rq, q - rq):     # Chinese remainder theorem
            out.add((sp * q * pow(q, -1, p) + sq * p * pow(p, -1, q)) % n)
    return sorted(out)

print("roots of 15:", four_roots(15))
wins = {"Alice": 0, "Bob": 0}
for flip in range(10000):
    x = random.choice([v for v in range(2, n) if math.gcd(v, n) == 1])  # Bob's secret
    a = x * x % n                   # Bob -> Alice
    y = random.choice(four_roots(a))   # Alice -> Bob, chosen blind
    if y in (x, n - x):
        wins["Alice"] += 1          # Bob learned nothing new
    else:
        assert math.gcd(x - y, n) in (p, q)   # Bob can factor n: proof he won
        wins["Bob"] += 1
print(wins)
```

```text
roots of 15: [13, 20, 57, 64]
{'Alice': 4958, 'Bob': 5042}
```

Ten thousand flips come out close to even, as they should. The `assert` line is
the heart of the protocol: every time Bob wins, he holds a factor of $n$, and
there is no way for him to claim a win he does not have.

### Someone can always walk away

Look again at the hash version in Figure 3.2. After message 2, Alice knows the
outcome and Bob does not. If she does not like it, she can hang up, claim her
line dropped, or simply never send message 3. Bob is left with nothing.

This is not a flaw of Blum's protocol; it is a theorem about all of them. In 1986
Richard Cleve proved that in any two-party coin-flipping protocol with $k$
rounds, one party can bias the result by roughly $1/k$ by stopping early. At the
start nobody knows the outcome; at the end both do; somewhere in between one
message moves one party closer to knowing than the other, and that party can
refuse to send the next. With three or more parties and an honest majority, the others can
carry on without the quitter (that is what secret sharing in
[Chapter 2](02-Secret-Sharing.md) buys), but with two parties there is no
majority.

What real protocols do about it is social, not mathematical: **an abort counts
as a loss.** If Alice does not open within the agreed time, Bob wins by default.
Then refusing to open is the same as losing, and Alice gains nothing by doing it.
The Mars version in §3.9 uses exactly this rule, with the speed of light setting
the deadline.

!!! note "Life story: coin flipping by telephone"
    **Born:** 1981, Manuel Blum at Berkeley, presented at CRYPTO '81 and
    reprinted in *SIGACT News* in 1983 · **Purpose:** let two people who
    distrust each other produce a fair random bit over a wire · **Helped:**
    named the commitment as a tool; its envelope idea runs through
    zero-knowledge proofs (Blum was among their pioneers), secure computation
    and every commit-reveal scheme since; Blum received the Turing Award in
    1995 · **Status:** current as an idea and a teaching example; real systems
    use hash or Pedersen commitments instead of square roots, and an abort
    rule because of Cleve's 1986 theorem

## 3.3 Hash commitments

*Level: beginner.*

The commitment almost everyone uses in practice is one line long. Take a hash
function $H$ such as SHA-256, pick 32 fresh random bytes $r$, and publish

$$C = H(r \,\Vert\, m).$$

To open, reveal $r$ and $m$; the receiver recomputes the hash and compares.

**Why it binds.** Two different openings $(r, m)$ and $(r', m')$ of the same $C$
would be two different inputs with the same SHA-256 output: a collision. Nobody
has ever found a collision in SHA-256, and the best known generic attack needs
about $2^{128}$ hash evaluations ([Chapter 9 of book 1](../../book/09-Hash-Functions.md)).
So binding holds as long as the hash is collision resistant.

**Why it hides.** If $H$ behaves like a random function, then $H(r \Vert m)$
for a fresh 256-bit $r$ looks like 32 random bytes, whatever $m$ is, and the
only way to learn $m$ is to guess $r$ too, which is hopeless. This argument
needs more than collision resistance: it needs the hash to leak nothing about
its input, which is the "random oracle" view of hashing. It is the usual
assumption for SHA-256 and SHA-3, and §3.11 describes schemes that avoid it.

**By hand.** Take as $r$ the 32 bytes `00 01 02 ... 1f` (a fixed nonce, for
this example only) and as $m$ the five ASCII bytes `heads`. SHA-256 of those 37
bytes begins `7f17e9d505bc6267`. With `tails` it begins `2fe036555bdcda29`;
with `heads` and a trailing space, `c4def88f310cd04e`. The opener must reveal
exactly the same bytes in the same order: that exactness is binding, and, as you
will see, the source of two of the three ways hash commitments go wrong.

### Code it

A small, careful commitment function. Each field is written with its length in
front, so there is never any doubt where one field ends and the next begins, and
a fixed label at the start (a **domain separator**) makes sure these hashes can
never be confused with hashes made for any other purpose.

```python
import hashlib, secrets

LABEL = b"book6-ch3 commitment v1"

def encode(*fields):                       # length-prefixed, so the split is unambiguous
    out = b""
    for f in fields:
        out += len(f).to_bytes(4, "big") + f
    return out

def commit(value, r=None):
    r = r if r is not None else secrets.token_bytes(32)   # fresh 256-bit randomness
    return hashlib.sha256(encode(LABEL, r, value)).hexdigest(), r

def check(c, value, r):
    return hashlib.sha256(encode(LABEL, r, value)).hexdigest() == c

c, r = commit(b"heads")
print("commitment:", len(c) * 4, "bits; secret r:", len(r), "bytes")
print("opens to heads:", check(c, b"heads", r))
print("opens to tails:", check(c, b"tails", r))
c2, r2 = commit(b"heads")
print("same value, new commitment:", c2 != c)
```

```text
commitment: 256 bits; secret r: 32 bytes
opens to heads: True
opens to tails: False
same value, new commitment: True
```

The commitment itself is different on every run, because $r$ is fresh each
time; that is the point of the last line. Two commitments to the same value
are unrelated strings, so nobody can even tell that two people chose the same
thing.

### Break it: a bare hash of a guessable value

The most common mistake is to leave out $r$. Then $C = H(m)$, which is binding
but hides only what cannot be guessed. If $m$ comes from a small set, such as a
bit, a vote, a bid in whole dollars, a phone number or a date of birth, anyone
holding $C$ hashes every candidate and finds the match. A hash function is fast
by design: a laptop computes millions of SHA-256 hashes per second, and a
graphics card billions.

```python
import hashlib

def bare(s):
    return hashlib.sha256(s.encode()).hexdigest()

vote = bare("yes")                                  # a "sealed" vote with no nonce
print([v for v in ("yes", "no", "abstain") if bare(v) == vote])

pin = bare("PIN 4071")                              # a 4-digit secret: 10,000 guesses
print(next(k for k in range(10000) if bare("PIN %04d" % k) == pin))

phone = bare("+1-212-555-0147")                     # 10,000 numbers in one exchange
print(next(n for n in range(10000) if bare("+1-212-555-%04d" % n) == phone))
```

```text
['yes']
4071
147
```

All three fall in well under a second. A whole North American phone exchange
has 10,000 numbers; all ten-digit numbers are $10^{10}$, which a single graphics
card hashes in seconds to minutes.

This exact mistake has been made with real data many times. In 2014 a programmer
named Chris Whong obtained, through a freedom-of-information request, records of
about 173 million New York City taxi trips from 2013. The city's Taxi and
Limousine Commission had replaced each driver's license number and each cab's
medallion number with its MD5 hash, believing that hid them. The software
engineer Vijay Pandurangan pointed out that medallion numbers follow a few short
formats, about 22 million possibilities in all, and that hashing every one of
them took him under two minutes. With the table he could reverse every hash in
the data, which tied trips, fares and tips to individual drivers and cabs. His
recommended fix was the commitment fix: replace each identifier with something
that cannot be recomputed from the identifier alone, such as a random token
assigned once, or an encryption under a secret key. Hashed email addresses and
phone numbers used to match customers between companies fail the same way; the
US Federal Trade Commission warned in a July 2024 blog post that hashing such
data does not make it anonymous.

!!! note "Life story: the New York taxi data"
    **Born:** 2014, when 2013 trip records (about 173 million trips) were
    released under New York's freedom-of-information law with license and
    medallion numbers replaced by unsalted MD5 hashes · **Purpose:** to publish
    useful data while hiding who drove · **Helped:** became the standard
    teaching case for why a hash of a guessable value hides nothing; Vijay
    Pandurangan reversed all the medallion hashes by hashing about 22 million
    candidates in under two minutes · **Status:** a cautionary tale; the fix
    is a fresh random value per identifier (a real commitment) or a keyed
    function, never a bare hash

**Fix it.** Always include fresh randomness of at least 128 bits, and better
256, in every commitment, and never reuse it. If the value must later be
matched across records (the taxi data wanted the same driver to get the same
token in every row), use a keyed function such as HMAC with a secret key that
is then destroyed or kept apart, not a bare hash
([Chapter 10 of book 1](../../book/10-Message-Authentication.md)).

### Break it: an ambiguous encoding

The second mistake is subtler. Suppose a commitment covers two fields, a name
and an amount, and the code simply glues them together:
$C = H(r \,\Vert\, \text{name} \,\Vert\, \text{amount})$. Then the opener can
move the boundary.

```python
import hashlib, secrets

r = secrets.token_bytes(32)
c = hashlib.sha256(r + b"Kim" + b"1500").hexdigest()       # Kim pledges 1500
print(hashlib.sha256(r + b"Kim1" + b"500").hexdigest() == c)  # "Kim1" pledges 500
print(hashlib.sha256(r + b"Kim15" + b"00").hexdigest() == c)  # "Kim15" pledges 0
```

```text
True
True
```

The bytes hashed are the same in all three cases, so the hash is the same: binding
holds for the *byte string* but not for the *pair* of values the protocol cares
about. The same trap has caught signature schemes, API request signing and
Merkle trees (§3.5). The fix is the one used in the `encode` function above:
write each field's length before the field, or use a fixed-length encoding, so
that a given byte string can be read in only one way.

### Break it: copying a commitment

The third mistake needs two committers. Imagine a version of the coin flip in
which both players commit to a bit and then both open, and the coin is the XOR of
the two bits. Bob, who moves second, can skip choosing a bit at all. He takes
Alice's commitment $C$ and sends the same $C$ back as his own. When Alice opens
with $(a, r)$, Bob "opens" with the same $(a, r)$. His commitment checks out, and
the coin is $a \oplus a = 0$: heads, every time.

Copying is the simplest case of **malleability**: building a commitment related
to someone else's without knowing what is inside. In a sealed-bid auction it
lets a bidder submit a copy and match any bid; with Pedersen commitments (§3.4)
a bidder can even turn your commitment to $m$ into a commitment to $m + 1$ and
outbid you by one dollar without knowing your bid. The defenses are to bind each
commitment to its author (put the author's name or public key inside the hash,
and reject a commitment that equals one already received), or to use a
**non-malleable** commitment scheme, a notion Danny Dolev, Cynthia Dwork and Moni
Naor defined in 1991.

### In the real world

Commit-then-reveal with a hash runs under many systems you may not think of as
cryptographic.

- **Sealed bids on blockchains.** Ethereum's Name Service opened in 2017 with
  a sealed-bid auction: each bidder sent a hash of the bid and a secret salt,
  then revealed both after bidding closed.
- **Commit-reveal randomness.** Lotteries and games on blockchains often have
  each participant commit to a random value, then reveal, and combine the
  reveals. Cleve's theorem bites here: the last participant to reveal sees
  everyone else's values and can withhold their own if the result is bad for
  them. Ethereum's beacon chain mixes in values revealed by validators in turn
  (RANDAO), and the "last revealer" can bias it by one bit, at the cost of a lost
  block reward. Randomness beacons built from threshold signatures avoid the
  problem ([Chapter 4](04-Threshold-Cryptography.md)).
- **Inside other protocols.** Bluetooth's "numeric comparison" pairing, in which
  both devices show a six-digit number, and the "short authentication string"
  of ZRTP voice encryption both make one side commit to its key share or nonce
  before seeing the other's, so that an attacker in the middle
  cannot search for key shares that make the displayed numbers match. Without
  the commitment, a six-digit check would fall to a million tries.

## 3.4 Pedersen commitments

*Level: intermediate.*

In 1991 Torben Pryds Pedersen, then at Aarhus University in Denmark, needed a
commitment with an unusual property for a verifiable secret-sharing scheme
(the one in [Chapter 2](02-Secret-Sharing.md)): it had to reveal *nothing at
all* about the value, even to an opponent with unlimited computing power, and it
had to fit the algebra of the shares, so that commitments to shares could be
combined the way shares are. He presented it at CRYPTO '91. Twenty-four years
later the same formula became the way Bitcoin sidechains and Monero hide how
much money each payment moves.

**The scheme.** Work in a group of prime order $q$ in which the discrete
logarithm is hard, such as the squares modulo a safe prime $p = 2q + 1$, or an
elliptic-curve group. Fix two generators $g$ and $h$ such that **nobody knows**
$\log_g h$, the number $x$ with $g^x = h$. To commit to a number $m$ modulo $q$,
pick $r$ uniformly at random modulo $q$ and publish

$$C = g^m h^r.$$

To open, reveal $m$ and $r$.

**By hand, modulo 47.** The prime $47 = 2 \cdot 23 + 1$ is a safe prime, and the
23 squares modulo 47 form a group of prime order $q = 23$. Take $g = 2$ and
$h = 3$ (both are squares: $2 \equiv 7^2$ and $3 \equiv 12^2 \pmod{47}$). Commit
to $m = 5$ with $r = 6$:

$$
\begin{aligned}
g^5 &= 32, \\
h^6 &= 729 = 15 \cdot 47 + 24 \equiv 24, \\
C &= 32 \cdot 24 = 768 = 16 \cdot 47 + 16 \equiv 16.
\end{aligned}
$$

Publish $C = 16$. A second commitment, to $m = 9$ with $r = 11$, works out to
$2^9 \cdot 3^{11} \equiv 42 \cdot 4 \equiv 27$.

**They add while sealed.** Multiply the two commitments:
$16 \cdot 27 = 432 = 9 \cdot 47 + 9 \equiv 9$. Now compute a fresh commitment to
the *sum* $5 + 9 = 14$ with the summed randomness $6 + 11 = 17$:
$2^{14} \cdot 3^{17} \equiv 28 \cdot 2 = 56 \equiv 9$. The same number. In
general

$$g^{m_1} h^{r_1} \cdot g^{m_2} h^{r_2} = g^{m_1 + m_2} h^{r_1 + r_2},$$

so the product of commitments is a commitment to the sum of the values, and
whoever knows the two openings can open the product without revealing either
value. This is called an **additively homomorphic** commitment. Raising a
commitment to a known power $k$ multiplies the value by $k$, so any public linear
combination of committed values can be checked the same way.

**Why it hides perfectly.** Fix $C = 16$ and ask which values it could hold. For
each $m$ from 0 to 22 there is exactly one $r$ with $2^m 3^r \equiv 16$: the
equation is $m + 19 r \equiv \log_2 16 = 4 \pmod{23}$, since $\log_2 3 = 19$ in
this group, and it has one solution $r$ for every $m$. Figure 3.3 lists some of
them. Because $r$ was uniform, each of those 23 openings was equally likely, so
$C$ says nothing whatever about $m$. No amount of computing power changes that:
the information is simply not there.

**Why it binds, and only computationally.** The same figure shows the price.
Every $m$ *has* an opening, so a committer who could find one could cheat. Two
openings of one commitment give the logarithm of $h$:

$$
g^{m} h^{r} = g^{m'} h^{r'}
\;\Longrightarrow\;
g^{m - m'} = h^{r' - r}
\;\Longrightarrow\;
\log_g h = \frac{m - m'}{r' - r} \bmod q.
$$

So anyone who can open a commitment two ways can solve the discrete logarithm
problem for $h$, and as long as that is hard, nobody can. In the toy group it
is not hard: there are only 23 powers to try, and with $\log_2 3 = 19$ in hand
the committer can reopen $C = 16$ as $m = 0$ by taking
$r' = r + (m - m')/19 = 6 + 5 \cdot 19^{-1} \equiv 6 + 5 \cdot 17 \equiv 22 \pmod{23}$.
Check: $3^{22} = 3^{-1} \equiv 16 \pmod{47}$, since $3 \cdot 16 = 48$.

**The opposite choice.** Pedersen sits on one side of the rule from §3.1:
perfect hiding, computational binding. The **ElGamal commitment**
$(g^r, \; g^m h^r)$ sits on the other. Its first part fixes $r$, which with the
second part fixes $m$: only one opening exists, so it is perfectly binding.
But someone who knows $\log_g h$ can decrypt it like an ElGamal ciphertext, and
even without that, hiding rests on the decisional Diffie-Hellman assumption. In
the toy group, committing to 5 with $r = 6$ gives $(17, 16)$, and of the
$23 \times 23$ possible openings only $(5, 6)$ fits.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Two commitments in the group of squares mod 47: Pedersen's value 16 fits all 23 messages; the ElGamal pair (17, 16) fits only one" fill="currentColor" font-size="14">
<rect x="10" y="10" width="300" height="270" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="36" text-anchor="middle" font-weight="bold">Pedersen: C = 16</text>
<text x="160" y="58" text-anchor="middle" font-size="13">openings (m, r) with 2^m · 3^r = 16</text>
<text x="40" y="88" font-size="13">(0, 22)</text><text x="120" y="88" font-size="13">(1, 5)</text><text x="200" y="88" font-size="13">(2, 11)</text>
<text x="40" y="110" font-size="13">(3, 17)</text><text x="120" y="110" font-size="13">(4, 0)</text><text x="200" y="110" font-size="13" font-weight="bold">(5, 6)</text>
<text x="40" y="132" font-size="13">(6, 12)</text><text x="120" y="132" font-size="13">(7, 18)</text><text x="200" y="132" font-size="13">(8, 1)</text>
<text x="160" y="156" text-anchor="middle" font-size="13">... one for every m ...</text>
<text x="40" y="180" font-size="13">(20, 4)</text><text x="120" y="180" font-size="13">(21, 10)</text><text x="200" y="180" font-size="13">(22, 16)</text>
<line x1="30" y1="200" x2="290" y2="200" stroke="currentColor" opacity="0.4"/>
<text x="160" y="224" text-anchor="middle" font-size="13">every m fits: perfectly hiding</text>
<text x="160" y="248" text-anchor="middle" font-size="13">other openings exist: binding</text>
<text x="160" y="268" text-anchor="middle" font-size="13">rests on the discrete log</text>
<rect x="330" y="10" width="300" height="270" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="36" text-anchor="middle" font-weight="bold">ElGamal: (17, 16)</text>
<text x="480" y="58" text-anchor="middle" font-size="13">openings with 2^r = 17, 2^m · 3^r = 16</text>
<text x="480" y="120" text-anchor="middle" font-size="22" font-weight="bold">(5, 6)</text>
<text x="480" y="156" text-anchor="middle" font-size="13">and nothing else</text>
<line x1="350" y1="200" x2="610" y2="200" stroke="currentColor" opacity="0.4"/>
<text x="480" y="224" text-anchor="middle" font-size="13">one opening: perfectly binding</text>
<text x="480" y="248" text-anchor="middle" font-size="13">m is fixed, so hiding rests</text>
<text x="480" y="268" text-anchor="middle" font-size="13">on Diffie-Hellman</text>
</svg>
<figcaption>Figure 3.3. The same value, 5, committed two ways in the group of squares modulo 47. Pedersen's single number could hold any of the 23 values; the ElGamal pair could hold only one. No commitment escapes this trade.</figcaption>
</figure>

**Where $h$ comes from.** The whole of Pedersen's binding rests on nobody knowing
$\log_g h$. If the committer chose $h$, they could have chosen it as $g^x$ for an
$x$ they keep, and then open anything to anything. So $h$ is made by hashing a
public string onto the group, a method anyone can rerun and nobody can steer:
"nothing up my sleeve". The Bulletproofs library used by Monero, for example,
derives its extra generators by hashing, and the elliptic-curve standard
RFC 9380 gives standard ways to hash a string onto a curve.

### Code it

Pedersen commitments in the squares modulo a 63-bit safe prime, with $h$ hashed
onto the group. The example is a budget: three districts each commit to their
spending, and the council checks the total without opening any single figure.
A 63-bit group is a toy: the discrete logarithm in it falls in seconds, and real
systems use 256-bit elliptic-curve groups such as Ristretto255 or secp256k1.

```python
import hashlib, secrets

p = 9223372036854778487             # a safe prime: p = 2q + 1 with q prime
q = (p - 1) // 2
g = 4                               # a square, so g has order q
seed = hashlib.sha256(b"book6 Pedersen h").digest()
h = pow(int.from_bytes(seed, "big") % p, 2, p)   # hashed onto the squares

def commit(m, r):
    return pow(g, m % q, p) * pow(h, r % q, p) % p

budgets = {"District 1": 410, "District 2": 275, "District 3": 515}
rs = {d: secrets.randbelow(q) for d in budgets}
Cs = {d: commit(budgets[d], rs[d]) for d in budgets}   # these are published

product = 1
for d in Cs:
    product = product * Cs[d] % p
r_total = sum(rs.values()) % q      # the districts pool their r's, not their m's
print("sealed total opens to 1200:", product == commit(1200, r_total))
print("sealed total opens to 1201:", product == commit(1201, r_total))

# Toy group mod 47 from the text: hiding and the trapdoor
P, Q = 47, 23
C = pow(2, 5, P) * pow(3, 6, P) % P
fits = [(m, r) for m in range(Q) for r in range(Q) if pow(2, m, P) * pow(3, r, P) % P == C]
print("C =", C, "has", len(fits), "openings, e.g.", fits[:3])
x = next(k for k in range(Q) if pow(2, k, P) == 3)     # brute force: log_2 3
r2 = (6 + (5 - 0) * pow(x, -1, Q)) % Q
print("log_2 3 =", x, "-> C also opens to m = 0 with r =", r2, ":", pow(3, r2, P) == C)
```

```text
sealed total opens to 1200: True
sealed total opens to 1201: False
C = 16 has 23 openings, e.g. [(0, 22), (1, 5), (2, 11)]
log_2 3 = 19 -> C also opens to m = 0 with r = 22 : True
```

### Break it: three ways to misuse Pedersen

**A committer who chose $h$.** Shown in the last line above: whoever knows
$\log_g h$ opens anything to anything. This is not hypothetical. Every
setup-based scheme in the rest of this chapter has the same weak point, a secret
number that must not survive, and the ceremonies of §3.7 exist because of it.

**Values wrap around.** The value $m$ only matters modulo $q$, so a commitment
to $-100$ is a commitment to $q - 100$, and the homomorphism happily adds it.
In a payment system that checks "inputs equal outputs" by comparing products of
commitments, that is a way to print money:

```python
import hashlib, secrets

p = 9223372036854778487
q, g = (p - 1) // 2, 4
h = pow(int.from_bytes(hashlib.sha256(b"book6 Pedersen h").digest(), "big") % p, 2, p)

def commit(m, r):
    return pow(g, m % q, p) * pow(h, r % q, p) % p

r_in = secrets.randbelow(q)
coin_in = commit(1000, r_in)                      # spend a 1000-unit coin
r1 = secrets.randbelow(q)
out1 = commit(1100, r1)                           # pay yourself 1100 ...
out2 = commit(-100, r_in - r1)                    # ... and "-100" to a friend
print("inputs equal outputs:", coin_in == out1 * out2 % p)
print("-100 is really", (-100) % q)
```

```text
inputs equal outputs: True
-100 is really 4611686018427389143
```

The books balance and 100 units have appeared from nowhere. Every system that
adds hidden amounts must therefore attach to each output a **range proof**, a
zero-knowledge proof that the committed value lies between 0 and, say, $2^{64}$.
Bulletproofs, the compact range proofs Monero adopted in 2018, are in
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md). The Zcash counterfeiting
flaw found in 2018 was a different bug with the same possible effect, coins
from nothing, and it is told in [Chapter 7](07-SNARKs.md).

**Reused randomness.** Two commitments with the same $r$ give
$C_1 / C_2 = g^{m_1 - m_2}$: the $h$ part cancels. If the difference is small,
the observer finds it by trying differences, and has learned that, for example,
your second payment was 25 more than your first. Fresh $r$ for every commitment,
from `secrets`, is the only rule.

### In the real world

**Confidential Transactions.** Gregory Maxwell described Confidential
Transactions for Bitcoin-like systems in 2015, building on an idea by Adam Back:
replace each amount with a Pedersen commitment on the secp256k1 curve, add a
range proof to each output, and let every node check that the sum of input
commitments equals the sum of output commitments plus the public fee. Blockstream
deployed it in its Elements sidechains and the Liquid network (2018). Monero
adopted the same idea as RingCT in January 2017, and the Mimblewimble design
(2016), used by Grin and as an extension of Litecoin, builds the entire ledger
out of Pedersen commitments. The privacy coins and their limits are
[Chapter 18](18-Privacy-on-Ledgers.md).

**Inside proofs.** Pedersen commitments are the first message of many
zero-knowledge proofs ([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)), the
building block of Bulletproofs, and the commitments to coefficients in Pedersen
and Feldman verifiable secret sharing ([Chapter 2](02-Secret-Sharing.md)).

!!! note "Life story: the Pedersen commitment"
    **Born:** 1991, Torben Pryds Pedersen at Aarhus University, CRYPTO '91, as
    part of a verifiable secret-sharing scheme · **Purpose:** a commitment that
    reveals nothing even to unlimited power and that adds while sealed ·
    **Helped:** verifiable secret sharing and distributed key generation,
    Sigma protocols, Confidential Transactions (2015), Monero's RingCT (2017),
    Mimblewimble, Bulletproofs · **Status:** current everywhere on elliptic
    curves; a quantum computer could break its binding (by finding
    $\log_g h$) but never its hiding, so old commitments stay secret even then

## 3.5 Merkle trees and vector commitments

*Level: intermediate.*

A hash commitment seals one value. Often we need to seal a long list, such as
every certificate a log has accepted, every transaction in a block, every key
in a directory, and later prove that one particular item is on the list at one
particular position, without sending the whole list. Ralph Merkle solved this
in 1979, in his Stanford doctoral thesis and a patent filed the same year, while
looking for a way to sign many messages with one public key built from nothing
but a hash function (the idea that became the hash-based signatures of
[Chapter 12 of the post-quantum book](../post-quantum/12-SLH-DSA.md)).

**The tree.** Hash each item to get a **leaf**. Hash the leaves in pairs to get
the next level up, hash those in pairs, and continue until one hash remains: the
**root**. Publishing the root commits to the whole list. To prove that item $i$
is in the list, send the item and the **sibling** of each node on the path from
its leaf to the root: one hash per level, $\log_2 n$ hashes in all. The verifier
hashes upward, combining with each sibling on the correct side, and compares the
result with the root (Figure 3.4). For a million items the proof is 20 hashes,
640 bytes; for a billion, 30 hashes.

**Why it binds.** If someone could show a different item at position $i$ with a
proof that still reaches the same root, then somewhere on the path two different
inputs would hash to the same output, a collision in the hash. Notice that the
proof also fixes the *position*: the bits of $i$ decide at each level whether
the running hash goes on the left or the right, so a proof for position 5 does
not verify at position 4. This property, opening one position without being able
to open it to two different values, is called **position binding**, and it is
what makes a Merkle tree a **vector commitment**: a commitment to a list
$(m_0, \dots, m_{n-1})$ that can be opened one position at a time.

**By hand.** Here is an eight-entry log of airlock events, each entry an ASCII
line such as `airlock 3 opened by badge 14`. The code below computes the hashes;
each is shown by its first six hex digits:

| level | hashes |
|---|---|
| leaves (entries 0 to 7) | `e7400e 6b76f5 4a45d7 6b76f5 5e0058 e7400e 87f1f3 4a45d7` |
| level 1 | `d0b230 eaa716 f91115 c8ef77` |
| level 2 | `042f0c 428339` |
| root | `24331a` |

To prove entry 5, the log sends three hashes: entry 4's leaf `5e0058`, the
level-1 node `c8ef77` and the level-2 node `042f0c`. Position 5 is binary
`101`. Reading the bits from the bottom: bit 0 is 1, so entry 5 is a right
child, and the verifier computes $\mathrm{node}(\texttt{5e0058}, \mathrm{leaf}_5)$,
which is `f91115`. Bit 1 is 0, so that is a left child:
$\mathrm{node}(\texttt{f91115}, \texttt{c8ef77}) = \texttt{428339}$. Bit 2 is 1,
a right child: $\mathrm{node}(\texttt{042f0c}, \texttt{428339}) = \texttt{24331a}$,
the root. The entry is in the log.

Look at the leaves again: entries 1 and 3 have the same hash, and so do 0 and 5,
and 2 and 7, because the same badges opened the airlock twice. Anyone holding
the leaf hashes can see which events repeat, and since there are only a few
hundred badges, anyone can recover every entry by hashing all the candidates,
exactly the guessing attack of §3.3. **A Merkle tree binds, but it does not
hide.** When the leaves are sensitive, each leaf is a proper hash commitment
with its own random salt, $\mathrm{leaf}_i = H(0 \,\Vert\, r_i \,\Vert\, m_i)$.
That is how CONIKS hides its users' keys (§3.8) and how the SD-JWT format for
digital identity cards hides each attribute until its holder chooses to show it
([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A Merkle tree over eight log entries; the inclusion proof for entry 5 is three sibling hashes, and the verifier recomputes the path to the root" fill="currentColor" font-size="14">
<line x1="45" y1="200" x2="84" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="123" y1="200" x2="84" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="201" y1="200" x2="240" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="279" y1="200" x2="240" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="357" y1="200" x2="396" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="435" y1="200" x2="396" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="513" y1="200" x2="552" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="591" y1="200" x2="552" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="84" y1="140" x2="162" y2="110" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="240" y1="140" x2="162" y2="110" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="396" y1="140" x2="474" y2="110" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="552" y1="140" x2="474" y2="110" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="162" y1="80" x2="318" y2="50" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="474" y1="80" x2="318" y2="50" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="12" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="45" y="220" text-anchor="middle" font-size="13" font-family="monospace">e7400e</text>
<rect x="90" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="123" y="220" text-anchor="middle" font-size="13" font-family="monospace">6b76f5</text>
<rect x="168" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="201" y="220" text-anchor="middle" font-size="13" font-family="monospace">4a45d7</text>
<rect x="246" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="279" y="220" text-anchor="middle" font-size="13" font-family="monospace">6b76f5</text>
<rect x="324" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
<text x="357" y="220" text-anchor="middle" font-size="13" font-family="monospace" font-weight="bold">5e0058</text>
<rect x="402" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="435" y="220" text-anchor="middle" font-size="13" font-family="monospace">e7400e</text>
<rect x="480" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="513" y="220" text-anchor="middle" font-size="13" font-family="monospace">87f1f3</text>
<rect x="558" y="200" width="66" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="591" y="220" text-anchor="middle" font-size="13" font-family="monospace">4a45d7</text>
<rect x="49" y="140" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="84" y="160" text-anchor="middle" font-size="13" font-family="monospace">d0b230</text>
<rect x="205" y="140" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.8"/>
<text x="240" y="160" text-anchor="middle" font-size="13" font-family="monospace">eaa716</text>
<rect x="361" y="140" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="396" y="160" text-anchor="middle" font-size="13" font-family="monospace">f91115</text>
<rect x="517" y="140" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
<text x="552" y="160" text-anchor="middle" font-size="13" font-family="monospace" font-weight="bold">c8ef77</text>
<rect x="127" y="80" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
<text x="162" y="100" text-anchor="middle" font-size="13" font-family="monospace" font-weight="bold">042f0c</text>
<rect x="439" y="80" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="474" y="100" text-anchor="middle" font-size="13" font-family="monospace">428339</text>
<rect x="283" y="20" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="318" y="40" text-anchor="middle" font-size="13" font-family="monospace">24331a</text>
<text x="45" y="250" text-anchor="middle" font-size="12">entry 0</text>
<text x="123" y="250" text-anchor="middle" font-size="12">entry 1</text>
<text x="201" y="250" text-anchor="middle" font-size="12">entry 2</text>
<text x="279" y="250" text-anchor="middle" font-size="12">entry 3</text>
<text x="357" y="250" text-anchor="middle" font-size="12">entry 4</text>
<text x="435" y="250" text-anchor="middle" font-size="12">entry 5</text>
<text x="513" y="250" text-anchor="middle" font-size="12">entry 6</text>
<text x="591" y="250" text-anchor="middle" font-size="12">entry 7</text>
<text x="430" y="40" font-size="13">root (published)</text>
<text x="320" y="285" text-anchor="middle" font-size="13">bold: the proof for entry 5; dashed: what the verifier recomputes</text>
</svg>
<figcaption>Figure 3.4. The eight-entry log from the text. To prove entry 5, the log sends the three bold sibling hashes; the verifier recomputes the dashed path and compares the result with the published root.</figcaption>
</figure>

### Code it

A Merkle tree over a power-of-two number of entries, with an inclusion proof.
Leaves and inner nodes are hashed with different one-byte prefixes, `00` and
`01`, the convention of Certificate Transparency (RFC 6962); the Break it below
shows why.

```python
import hashlib

def H(b):
    return hashlib.sha256(b).digest()

def leaf(d):
    return H(b"\x00" + d)               # leaves and inner nodes get different prefixes

def node(left, right):
    return H(b"\x01" + left + right)

def build(data):                        # len(data) must be a power of two
    levels = [[leaf(d) for d in data]]
    while len(levels[-1]) > 1:
        lv = levels[-1]
        levels.append([node(lv[i], lv[i + 1]) for i in range(0, len(lv), 2)])
    return levels                       # levels[-1][0] is the root

def prove(levels, i):                   # the sibling at each level, bottom up
    proof = []
    for lv in levels[:-1]:
        proof.append(lv[i ^ 1])
        i //= 2
    return proof

def verify(root, d, i, proof):
    h = leaf(d)
    for sib in proof:                   # bit 0 of i says left or right
        h = node(h, sib) if i % 2 == 0 else node(sib, h)
        i //= 2
    return h == root

log = [b"airlock 3 opened by badge %d" % k for k in (14, 7, 22, 7, 31, 14, 9, 22)]
levels = build(log)
root = levels[-1][0]
for depth, lv in enumerate(levels):
    print(depth, [x.hex()[:6] for x in lv])
proof = prove(levels, 5)
print("proof for entry 5:", [s.hex()[:6] for s in proof])
print("entry 5 included:", verify(root, log[5], 5, proof))
print("forged entry:    ", verify(root, b"airlock 3 opened by badge 1", 5, proof))
print("wrong position:  ", verify(root, log[5], 4, proof))
```

```text
0 ['e7400e', '6b76f5', '4a45d7', '6b76f5', '5e0058', 'e7400e', '87f1f3', '4a45d7']
1 ['d0b230', 'eaa716', 'f91115', 'c8ef77']
2 ['042f0c', '428339']
3 ['24331a']
proof for entry 5: ['5e0058', 'c8ef77', '042f0c']
entry 5 included: True
forged entry:     False
wrong position:   False
```

Real logs are not a power of two long. Certificate Transparency splits a list of
$n$ entries at the largest power of two below $n$ and recurses, and it adds a
second kind of proof, the **consistency proof**, which shows that a newer tree
extends an older one without changing any old entry. Both are coded in
[Chapter 16 of book 1](../../book/16-PKI-and-Key-Establishment.md), and how
browsers use them is in
[Chapter 2 of the protocols book](../protocols/02-Certificates-and-PKI.md).

### Break it: a leaf that is really a node

Take away the prefixes, so that leaves and inner nodes are hashed the same way.
An inner node is the hash of 64 bytes, its two children. Those 64 bytes are a
perfectly good input for a leaf, too. So an attacker can present the
concatenation of two child hashes as if it were a data entry, in a shorter tree,
and it reaches the same root:

```python
import hashlib

def H(b):
    return hashlib.sha256(b).digest()

def root(items, prefixes):
    lv = [H(b"\x00" + x) if prefixes else H(x) for x in items]
    while len(lv) > 1:
        pairs = [lv[i] + lv[i + 1] for i in range(0, len(lv), 2)]
        lv = [H(b"\x01" + pr) if prefixes else H(pr) for pr in pairs]
    return lv[0]

real = [b"pay Ana 5", b"pay Ben 7", b"pay Cy 2", b"pay Dee 9"]
a, b, c, d = [H(x) for x in real]
fake = [a + b, c + d]                    # two 64-byte "entries" nobody ever logged
print("no prefixes:  ", root(fake, False) == root(real, False))
a, b, c, d = [H(b"\x00" + x) for x in real]
fake = [a + b, c + d]
print("with prefixes:", root(fake, True) == root(real, True))
```

```text
no prefixes:   True
with prefixes: False
```

The unprefixed tree "contains" two entries that were never logged, and a
verifier who only checks the root would accept a proof for either. With the
prefixes, a leaf hash always starts from a `00` byte and a node hash from a
`01` byte, so no input can be read both ways. This is the same ambiguous-encoding
mistake as in §3.3, one level up.

Bitcoin's transaction tree has no such prefixes, and it has paid for it twice.
Its builders pair the last hash with itself when a level has an odd number of
hashes, so a block's transaction list $[A, B, C]$ and the invalid list
$[A, B, C, C]$ have the same root; in 2012 this was found to let an attacker
make nodes reject a valid block (the life story below). And because leaves and
nodes are hashed alike, a 64-byte transaction can be mistaken for an inner node,
which can fool lightweight wallets that check Merkle proofs. Both are covered
with Bitcoin itself in
[Chapter 19 of the protocols book](../protocols/19-Ledgers-Bitcoin.md).

!!! note "Life story: Bitcoin's duplicate-transaction tree bug (CVE-2012-2459)"
    **Born:** 2012, found by Forrest Voight in Bitcoin's Merkle tree, which
    duplicates the last hash of an odd-length level · **Purpose:** an attack,
    not a design: send a node a copy of a real block with one transaction
    duplicated, same root and same block hash but invalid, so that the node
    marks that block hash as bad and refuses the real block when it arrives ·
    **Helped:** taught the protocol world that a Merkle root must determine
    its list exactly; fixed in Bitcoin's 2012 releases by rejecting
    duplicate-transaction blocks without marking their hash invalid ·
    **Status:** fixed in the software; the tree format itself could not be
    changed, so every Bitcoin implementation must still detect such mutated
    blocks

### Vector commitments beyond Merkle

A Merkle tree is a vector commitment with proofs of $\log_2 n$ hashes. In 2013
Dario Catalano and Dario Fiore defined vector commitments as a primitive in their
own right and built ones whose openings are a *single* group element, whatever
the length of the vector, from assumptions about RSA and about pairings. The
KZG commitment of the next section is the one that won in practice: put the
vector's entries as the values of a polynomial at fixed points, commit to the
polynomial, and open any position with one 48-byte proof.

In 2018 John Kuszmaul, then a student in MIT's PRIMES program for high-school
students, proposed the **Verkle tree**: a Merkle tree whose nodes are vector
commitments with hundreds of children each, so proofs need only a few short
openings. Ethereum planned for years to move its state into one; from 2024
attention shifted toward a binary hash tree, partly because Verkle's
elliptic-curve commitments would not survive a quantum computer. At the time of
writing neither change has shipped.

A **sparse Merkle tree** is the other variant you will meet. It has a leaf for
every possible key, $2^{256}$ of them, almost all empty. Empty subtrees have
known, precomputed hashes, so the tree can be stored and updated in space
proportional to the number of filled leaves, and it supports a proof that a key
is *absent*: the path to its leaf ends in the hash of an empty subtree. Key
transparency (§3.8) needs exactly that, to prove that a name has no other key.

!!! note "Life story: the Merkle tree"
    **Born:** 1979, Ralph Merkle's Stanford thesis and patent (granted 1982),
    published as "A Certified Digital Signature" at CRYPTO '89 · **Purpose:**
    authenticate many values with one short hash, originally to sign many
    messages with one hash-based public key · **Helped:** Bitcoin blocks
    (2009), Certificate Transparency (2013), Git-style and IPFS content
    addressing, BitTorrent v2, ZFS and other file systems, key transparency,
    STARKs, and the post-quantum signatures XMSS, LMS and SLH-DSA ·
    **Status:** current, and growing; one of the few public-key-era tools that
    survives a quantum computer unchanged

## 3.6 KZG polynomial commitments in practice

*Level: intermediate.*

A **polynomial commitment** seals a whole polynomial $f(x)$ of high degree in one
short value, and later proves the value $f(z)$ at any point $z$ the verifier
names, with one short proof. Since a list of $n$ numbers can be written as the
values of a polynomial of degree $n - 1$ at $n$ fixed points (Lagrange
interpolation, [Chapter 11 of the mathematics book](../mathematics/11-Polynomials-at-Work.md)),
a polynomial commitment is also a vector commitment with constant-size
openings. And since almost every succinct proof system turns a computation into
polynomial identities, polynomial commitments are the engine room of the SNARKs
in [Chapter 7](07-SNARKs.md).

The scheme in use today was published in 2010 by Aniket Kate, Gregory Zaverucha
and Ian Goldberg, then at the University of Waterloo, and is known by their
initials, **KZG**. Its mathematics, the factor theorem and the pairing that
checks it, is worked in §11.8 of the
[mathematics book's Chapter 11](../mathematics/11-Polynomials-at-Work.md) and
§13.7 of its [Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md).
Here is what it does and what it costs.

**The setup.** Someone picks a secret number $s$ and publishes the
**powers of tau** (the secret is traditionally called $\tau$ or $s$):

$$g, \; g^{s}, \; g^{s^2}, \; \dots, \; g^{s^d},$$

in an elliptic-curve group with a pairing, plus $g_2^{s}$ in a second group.
Then $s$ must be forgotten. The published list is called the **structured
reference string**, and $s$ is the **toxic waste**.

**Commit.** For $f(x) = f_0 + f_1 x + \dots + f_d x^d$, the commitment is
$C = g^{f(s)}$. The committer does not know $s$, but does not need to:

$$C = g^{f_0} \cdot (g^{s})^{f_1} \cdot (g^{s^2})^{f_2} \cdots (g^{s^d})^{f_d}.$$

**Open at $z$.** If $f(z) = y$, then $x - z$ divides $f(x) - y$; let
$q(x) = (f(x) - y)/(x - z)$. The proof is $\pi = g^{q(s)}$, computed from the
powers the same way.

**Verify.** The claim is that $f(s) - y = q(s)(s - z)$. The verifier cannot see
$s$, $f(s)$ or $q(s)$, only $C$, $\pi$ and $g_2^{s}$, but a pairing $e$ lets it
multiply exponents once:

$$e\!\left(C \cdot g^{-y}, \; g_2\right) = e\!\left(\pi, \; g_2^{s} \cdot g_2^{-z}\right).$$

The left side carries $f(s) - y$ in the exponent, the right side $q(s)(s - z)$.

**By hand, in the group modulo 47.** No pairing fits in a toy group, so we play
the verifier with $s$ in hand, which shows the algebra but not the secrecy. Take
$g = 2$, $s = 13$, so the powers are $g = 2$, $g^{13} \equiv 14$ and
$g^{13^2} = g^{8} \equiv 21$ (since $169 \equiv 8 \pmod{23}$). Commit to
$f(x) = 3 + 2x + x^2$:

$$C = 2^{3} \cdot 14^{2} \cdot 21^{1} \equiv 8 \cdot 8 \cdot 21 \equiv 28 \pmod{47},$$

and indeed $f(13) = 198 \equiv 14 \pmod{23}$ and $2^{14} \equiv 28$. Open at
$z = 4$: $f(4) = 27 \equiv 4$, so $y = 4$. Divide: $x^2 + 2x - 1 = (x - 4)(x + 6) + 23$,
and $23 \equiv 0$, so $q(x) = x + 6$ and $\pi = 14 \cdot 2^6 \equiv 14 \cdot 17 \equiv 3$.
The check: $C \cdot g^{-y} = 28 \cdot 16^{-1} \equiv 28 \cdot 3 \equiv 37$, and
$\pi^{s - z} = 3^{9} \equiv 37$. They match.

**What it costs.** The commitment and each proof are one group element: 48
bytes on the BLS12-381 curve, whatever the degree. Verifying is two pairings,
a few milliseconds. Committing costs $d$ exponentiations, done with fast
multi-exponentiation. One proof can even open many points at once. Against
these, three costs: a trusted setup (§3.7); security that rests on a strong,
pairing-specific assumption (the $q$-strong Diffie-Hellman family, §3.11); and
no post-quantum security, because a quantum computer finds $s$ from $g^{s}$.

### Code it

The KZG algebra in the 63-bit toy group. The prover never touches $s$; a
`referee` function plays the pairing by using $s$ directly, which no real
verifier can do. The last lines are the break: whoever kept the toxic waste can
open the commitment to any value.

```python
import random

p = 9223372036854778487                 # safe prime p = 2q + 1 (toy; Ethereum uses BLS12-381)
q, g = (p - 1) // 2, 4
rng = random.Random(7)                  # demo only; a ceremony uses real randomness

# Setup: someone picks s, publishes g^(s^i), and is supposed to forget s.
s = rng.randrange(2, q)
powers = [pow(g, pow(s, i, q), p) for i in range(5)]

def commit(f):                          # C = prod (g^(s^i))^(f_i) = g^f(s), without s
    C = 1
    for gi, fi in zip(powers, f):
        C = C * pow(gi, fi % q, p) % p
    return C

def evaluate(f, z):
    return sum(c * pow(z, i, q) for i, c in enumerate(f)) % q

def quotient(f, z):                     # (f(x) - f(z)) / (x - z), synthetic division
    out, acc = [], 0
    for c in reversed(f[1:]):
        acc = (acc * z + c) % q
        out.append(acc)
    return list(reversed(out))

f = [3, 2, 1, 0, 5]                     # 3 + 2x + x^2 + 5x^4
C = commit(f)
z = 4
y = evaluate(f, z)
proof = commit(quotient(f, z))
print("f(4) =", y)

# The verifier's check, done here with s because the standard library has no pairing.
# A pairing checks e(C / g^y, g) == e(proof, g^s / g^z) without anyone knowing s.
def referee(C, z, y, proof):
    return C * pow(g, (q - y) % q, p) % p == pow(proof, (s - z) % q, p)

print("honest opening accepted:", referee(C, z, y, proof))
print("wrong value accepted:   ", referee(C, z, y + 1, proof))

# Whoever kept s can open C to any value at all.
fake_y = 999
fake_proof = pow(C * pow(g, (q - fake_y) % q, p) % p, pow(s - z, -1, q), p)
print("forged opening accepted:", referee(C, z, fake_y, fake_proof))
```

```text
f(4) = 1307
honest opening accepted: True
wrong value accepted:    False
forged opening accepted: True
```

The forgery is one line: with $s$ known, the forger simply computes
$\pi' = (C \cdot g^{-y'})^{1/(s - z)}$ for any $y'$ it likes. That single line is
why the rest of this section and all of the next one exist.

### In the real world: Ethereum's blobs

Ethereum's rollups, the systems that run transactions off the main chain and post
compressed batches back to it ([Chapter 17](17-Consensus-and-Smart-Contracts.md)),
needed somewhere cheap to put that data. The Dencun upgrade of 13 March 2024
introduced **blob transactions** (EIP-4844). A blob is 4,096 numbers of 32 bytes
each, 128 KiB, read as the values of a polynomial of degree 4,095 over the
BLS12-381 scalar field. Each blob travels with its 48-byte KZG commitment, and
the block itself carries only a **versioned hash** of the commitment: one
version byte `01` followed by the last 31 bytes of its SHA-256. The blobs
themselves are kept by the network for about 18 days and then dropped; the
commitment stays forever. A contract that needs to know one value of a blob
calls a built-in "point evaluation" function with the commitment, a point, the
claimed value and a 48-byte proof, and it costs 50,000 gas.

Blob capacity has grown since launch (a target of 3 per block and a maximum of
6), first with the Pectra upgrade of May 2025 (6 and 9), then with the Fusaka
upgrade of December 2025, whose PeerDAS (EIP-7594) extends each blob with a
Reed-Solomon code and gives each cell its own KZG proof, so that a node can check
a random sample of cells instead of downloading every blob.

PLONK (2019) and the many proof systems built on it use KZG to commit to the
polynomials that encode a computation ([Chapter 7](07-SNARKs.md)); Groth16 does
not use KZG but needs a trusted setup of the same kind.

!!! note "Life story: KZG polynomial commitments"
    **Born:** 2010, Aniket Kate, Gregory Zaverucha and Ian Goldberg,
    "Constant-Size Commitments to Polynomials and Their Applications",
    ASIACRYPT 2010 · **Purpose:** commit to a polynomial in one group element
    and open any evaluation with one more · **Helped:** PLONK and most
    pairing-based SNARKs since 2019; Ethereum's blob data since March 2024
    and its data-availability sampling since December 2025; verifiable
    secret sharing and vector commitments · **Status:** current; needs a
    trusted setup and pairings, and is not post-quantum, so hash-based
    commitments (FRI, [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md))
    compete with it

## 3.7 Trusted-setup ceremonies

*Level: intermediate.*

KZG needs a number $s$ that nobody knows. A single trusted party could pick it,
publish the powers and promise to delete it, but then everyone must trust that
promise, and for a payment system the reward for breaking it is unlimited: in
Zcash's original design, whoever kept the toxic waste could forge proofs and
create coins that nobody could detect. The answer is to let many people make
$s$ together, so that it is safe if *any one* of them was honest.

**The update trick.** Suppose the current powers are $g^{s^i}$ for an unknown
$s$. A new participant picks a secret $\tau$ and raises the $i$-th power to
$\tau^i$:

$$\left(g^{s^i}\right)^{\tau^i} = g^{(s\tau)^i}.$$

The result is a valid set of powers for the new secret $s\tau$. The participant
learns nothing about $s$, and nobody else learns anything about $\tau$. After
$N$ participants the secret is $\tau_1 \tau_2 \cdots \tau_N$, and to know it you
would need every single $\tau_i$. If even one participant destroyed theirs, the
product is unknown to everyone, forever. This is the **1-of-$N$ trust model**:
you are safe if you trust that at least one participant out of $N$ was honest,
and if you took part yourself, you can trust yourself.

**By hand.** Work modulo 47 with $g = 2$ and powers up to degree 2. Ana starts
with $\tau = 3$ and publishes $[2, \; 2^{3}, \; 2^{9}] = [2, 8, 42]$. Ben takes
$\tau = 5$: he raises 8 to the 5th power and 42 to the $25$th, getting
$[2, 9, 36]$, which are $[2, 2^{15}, 2^{15^2}]$ since $225 \equiv 18$ and
$2^{18} \equiv 36$. Cy takes $\tau = 7$: $9^7 \equiv 14$ and $36^{49} \equiv 21$,
so the final powers are $[2, 14, 21]$, the powers of $s = 3 \cdot 5 \cdot 7 = 105 \equiv 13 \pmod{23}$:
exactly the setup used in §3.6. Ana knows 3, Ben 5, Cy 7; none of them knows 13
unless all three pool what they know.

**Checking each step.** A ceremony must also stop a participant from replacing
the powers with garbage, or with powers of a secret they chose from scratch.
So each participant publishes $g_2^{\tau}$ alongside the new powers, and anyone
can check with pairings that (a) the new first power is the old one raised to
the $\tau$ behind $g_2^{\tau}$, and (b) the list is still a chain of powers of
one number: $e(P_{i+1}, g_2) = e(P_i, g_2^{s})$ for each $i$. A short proof of
knowledge of $\tau$ (a Schnorr proof, [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md))
stops a participant from building on someone else's contribution as if it were
their own.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A setup ceremony as a chain: each participant raises the powers to their secret, so the final secret is the product of all the secrets" fill="currentColor" font-size="14">
<rect x="10" y="40" width="110" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="65" y="68" text-anchor="middle" font-size="13">start</text>
<text x="65" y="90" text-anchor="middle" font-size="13">g, g, g, ...</text>
<rect x="160" y="40" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="225" y="64" text-anchor="middle" font-size="13" font-weight="bold">Ana: τ₁</text>
<text x="225" y="86" text-anchor="middle" font-size="13">g^(τ₁ⁱ)</text>
<rect x="330" y="40" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="395" y="64" text-anchor="middle" font-size="13" font-weight="bold">Ben: τ₂</text>
<text x="395" y="86" text-anchor="middle" font-size="13">g^((τ₁τ₂)ⁱ)</text>
<rect x="500" y="40" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="565" y="64" text-anchor="middle" font-size="13" font-weight="bold">Cy: τ₃</text>
<text x="565" y="86" text-anchor="middle" font-size="13">g^((τ₁τ₂τ₃)ⁱ)</text>
<line x1="120" y1="75" x2="152" y2="75" stroke="currentColor" stroke-width="2"/>
<polygon points="160,75 150,70 150,80"/>
<line x1="290" y1="75" x2="322" y2="75" stroke="currentColor" stroke-width="2"/>
<polygon points="330,75 320,70 320,80"/>
<line x1="460" y1="75" x2="492" y2="75" stroke="currentColor" stroke-width="2"/>
<polygon points="500,75 490,70 490,80"/>
<text x="225" y="136" text-anchor="middle" font-size="12" font-style="italic">deletes τ₁</text>
<text x="395" y="136" text-anchor="middle" font-size="12" font-style="italic">deletes τ₂</text>
<text x="565" y="136" text-anchor="middle" font-size="12" font-style="italic">deletes τ₃</text>
<line x1="20" y1="160" x2="620" y2="160" stroke="currentColor" opacity="0.4"/>
<text x="320" y="186" text-anchor="middle" font-size="13">anyone checks each step with pairings, using the published g₂^τ</text>
<text x="320" y="210" text-anchor="middle" font-size="13">the secret s = τ₁τ₂τ₃ is unknown if any one participant deleted theirs</text>
</svg>
<figcaption>Figure 3.5. A powers-of-tau ceremony. Each contribution multiplies the hidden secret by a new random factor; the final secret is unknown to everyone unless every participant colludes or leaks.</figcaption>
</figure>

### Code it

Three contributions in the 63-bit toy group. The last two lines show the 1-of-$N$
property: the powers belong to the product of all three secrets, and two
participants pooling their secrets still do not have it.

```python
import random

p = 9223372036854778487                 # toy group: squares mod a safe prime
q, g = (p - 1) // 2, 4
rng = random.Random(2023)               # demo only; a real contribution uses secrets
DEGREE = 4

powers = [g] * (DEGREE + 1)             # start: g^(1^i), a "secret" of 1
taus = []
for name in ("Ana", "Ben", "Cy"):
    tau = rng.randrange(2, q)           # each participant's secret
    taus.append(tau)
    powers = [pow(P, pow(tau, i, q), p) for i, P in enumerate(powers)]
    print(name, "contributed; first power now", powers[1])
    # (a real ceremony also publishes g2^tau and a proof, and checks with pairings)

s = taus[0] * taus[1] * taus[2] % q     # nobody ever holds this unless all three collude
print("powers are g^(s^i) for s = product of the taus:",
      powers == [pow(g, pow(s, i, q), p) for i in range(DEGREE + 1)])
print("Ana and Ben pooling their taus get it:",
      pow(g, taus[0] * taus[1] % q, p) == powers[1])
```

```text
Ana contributed; first power now 4456035985001317844
Ben contributed; first power now 6910847634766160323
Cy contributed; first power now 4469135855187636428
powers are g^(s^i) for s = product of the taus: True
Ana and Ben pooling their taus get it: False
```

### Zcash, October 2016

Zcash launched on 28 October 2016 as the first currency to hide sender, receiver
and amount with zero-knowledge proofs. Its proofs (a SNARK of the Pinocchio family, known as BCTV14)
needed a setup, and the company held a ceremony using a multi-party protocol
published in 2015 by Eli Ben-Sasson, Alessandro Chiesa, Matthew Green, Eran
Tromer and Madars Virza. Six participants, each in a different place with
their own hardware, ran the computation over two days in late October 2016,
each generating a share of the secret, contributing, and then destroying the
machine that held it. The participants included the Bitcoin developer Peter
Todd, the computer scientist Andrew Miller and Peter Van Valkenburgh of the
policy group Coin Center; Todd wrote up his precautions in public. The sixth
took part under the name "John Dobbertin", and in 2022 Edward Snowden said that
he had been that participant. The protocol was 1-of-6: had any participant
destroyed their share, the parameters were safe.

Six is a small number to rest a currency on, and the ceremony required all six
to be online at the same time, so it could not grow much larger. In 2017 Sean
Bowe, Ariel Gabizon and Ian Miers proposed a two-phase design that fixed both
problems. **Phase 1**, the "Powers of Tau", produces generic powers that any
circuit can use; participants take turns one at a time, so anyone can join
whenever their turn comes, and the number of participants is unlimited. **Phase
2** specializes the powers to one circuit. Zcash's Powers of Tau ran from
November 2017 to April 2018 and accepted 87 contributions; the Sapling phase 2
that followed in 2018 accepted more than 90. Since its Orchard upgrade of 2022,
Zcash uses Halo 2, which needs no trusted setup at all
([Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md),
[Chapter 18](18-Privacy-on-Ledgers.md)).

There is a coda that shows why the setup is more than ceremony. In March 2018
Ariel Gabizon found that the parameters generated in 2016 contained extra
elements that should never have been published, and that with them anyone could
have forged proofs and minted coins. The flaw was quietly fixed with the Sapling
upgrade and disclosed in February 2019; nobody is known to have used it. The
story belongs to [Chapter 7](07-SNARKs.md).

!!! note "Life story: the Zcash parameter ceremony"
    **Born:** October 2016, six participants in separate places, using the
    Ben-Sasson, Chiesa, Green, Tromer and Virza protocol (2015) · **Purpose:**
    generate Zcash's SNARK parameters so that nobody holds the secret that
    could forge proofs and coins · **Helped:** launched Zcash on 28 October
    2016, and made the "ceremony" a public ritual of the field, with machines
    destroyed on camera · **Retired:** the Sprout parameters were replaced by
    Sapling's in 2018 (Powers of Tau, 87 contributions, then a phase 2 with
    more than 90) · **Replaced by:** Halo 2, with no trusted setup, in 2022

### Ethereum, 2023

When Ethereum chose KZG for blobs, it needed powers of tau on BLS12-381, and it
set out to make the setup the largest yet. The KZG ceremony opened for public
contributions on 13 January 2023 and collected them for 208 days. Anyone who
signed in with an Ethereum address or a GitHub account could contribute from a
web browser: the page mixed the browser's randomness with text and mouse
movements from the contributor, updated the current powers, and sent them back to a coordinator, which
checked every update with pairings before accepting the next. The ceremony
produced four sets of powers of different sizes; the one Ethereum uses has 4,096
powers in the first group, one for each value in a blob, and 65 in the second.
It finished with **141,416 contributions**, the largest multi-party computation
of its kind so far. Contributions came from client teams, from people who wrote
their own contribution software, and in one case from a satellite
in orbit run by the company Cryptosat. The full transcript is public, so anyone
can recheck every step and, importantly, find their own contribution in it.

!!! note "Life story: Ethereum's KZG ceremony"
    **Born:** January 2023, organized by the Ethereum Foundation for
    EIP-4844 · **Purpose:** produce powers of tau on BLS12-381 that nobody
    can undo, unless all of the more than 141,000 contributions were
    dishonest or leaked · **Helped:** the blob commitments of Dencun (March
    2024) and PeerDAS (December 2025); showed that a ceremony can be open to
    anyone with a browser · **Status:** complete after 208 days with 141,416
    contributions; the output is fixed in every Ethereum client

**What a ceremony does not promise.** The 1-of-$N$ guarantee assumes the
contribution software did what it claimed; a coordinator could also censor
contributions, though it can never learn the secret. With tens of thousands of
participants, many running their own code, believing that every one of them was
compromised is a stretch, which is the point.

## 3.8 Key transparency

*Level: intermediate.*

End-to-end encrypted messengers have a weak point that encryption cannot fix.
When Ana wants to message Bao, her app asks the company's server for Bao's
public key. If the server answers with a key it controls, it can read
everything, re-encrypting to Bao so nobody notices. Apps let users compare
"safety numbers" or scan each other's QR codes, but almost nobody does, and in
a group of 200 nobody could. In November 2018 two officials of the UK's GCHQ,
Ian Levy and Crispin Robinson, wrote openly that a provider could be asked to
add a silent extra participant (a "ghost") to a conversation, by exactly this
route. The question became: can a key server be made to prove that it gives
everyone the same answer?

**Key transparency** does it with the tools of this chapter. The server keeps
the whole directory, every user's current public keys, in a Merkle tree, and at
regular intervals (an **epoch**) it publishes the root, signed. Then:

- **Lookups come with proofs.** When Ana asks for Bao's key, the answer comes
  with an inclusion proof against the current root (§3.5).
- **Everyone checks their own entry.** Bao's app regularly looks itself up and
  checks that the key in the tree is the one on his device. If the server put a
  fake key for Bao in the tree, Bao's app sees it.
- **Everyone must see the same tree.** A server could try to show Ana a tree
  with the fake key and Bao a tree with the real one: a **split view**. So
  apps compare roots, with each other or through independent **auditors**, and
  the root of each epoch must provably extend the root of the previous one.

The same idea, made public for web certificates, is Certificate Transparency
([Chapter 2 of the protocols book](../protocols/02-Certificates-and-PKI.md)).
Key directories add two problems CT does not have. Usernames and phone numbers
are private, so a proof for Bao must not reveal who else is in the tree. And
keys change, so the tree must prove what Bao's key *is*, not merely that some
key for Bao was once logged.

**CONIKS.** The design that answered both was CONIKS, by Marcela Melara, Aaron
Blankstein, Joseph Bonneau, Edward Felten and Michael Freedman (Princeton and
Stanford, USENIX Security 2015). A user's position in the tree is not their
name but the output of a verifiable random function of the name
([Chapter 4](04-Threshold-Cryptography.md), RFC 9381), so positions look
random, yet the server can prove that a position is the right one for a name.
Each leaf holds not the name and key but a salted hash commitment to them
(§3.3), so a proof's sibling hashes reveal nothing about the neighbours. And
each epoch's signed root includes the hash of the previous root, a chain that
makes rewriting history visible.

### Code it

A five-user directory with committed leaves, a lookup proof, and both attacks.
An HMAC under the server's key stands in for the VRF; a real VRF also lets the
client check that the index is correct.

```python
import hashlib, hmac, secrets

VRF_KEY = secrets.token_bytes(32)       # stand-in: real systems use a VRF (RFC 9381)

def H(*parts):                          # length-prefixed hashing (see 3.3)
    return hashlib.sha256(b"".join(len(x).to_bytes(4, "big") + x for x in parts)).digest()

def index(name):                        # a name's place in the tree; hides the name
    return hmac.new(VRF_KEY, name.encode(), hashlib.sha256).digest()

def publish(directory, salts):          # the server's work for one epoch
    leaves = sorted((index(n), H(b"leaf", index(n), H(salts[n], n.encode(), k)))
                    for n, k in directory.items())
    while len(leaves) & (len(leaves) - 1):
        leaves.append((b"\xff" * 32, H(b"empty")))       # pad to a power of two
    order = [ix for ix, _ in leaves]
    levels = [[lf for _, lf in leaves]]
    while len(levels[-1]) > 1:
        lv = levels[-1]
        levels.append([H(b"node", lv[i], lv[i + 1]) for i in range(0, len(lv), 2)])
    return order, levels

def lookup(epoch, name, directory, salts):   # answer: key, salt, position, proof
    order, levels = epoch
    i = order.index(index(name))
    proof, j = [], i
    for lv in levels[:-1]:
        proof.append(lv[j ^ 1])
        j //= 2
    return directory[name], salts[name], i, proof

def check(root, name, key, salt, i, proof):  # what every client runs
    h = H(b"leaf", index(name), H(salt, name.encode(), key))
    for sib in proof:
        h = H(b"node", h, sib) if i % 2 == 0 else H(b"node", sib, h)
        i //= 2
    return h == root

keys = {"ana": b"ana-key", "bao": b"bao-key", "cyd": b"cyd-key", "dev": b"dev-key", "eli": b"eli-key"}
salts = {n: secrets.token_bytes(16) for n in keys}
real = publish(keys, salts)
root = real[1][-1][0]
print("Ana looks up Bao:", check(root, "bao", *lookup(real, "bao", keys, salts)))

# Attack 1: one tree for everyone, with a key for Bao that the server controls.
bad_keys = dict(keys, bao=b"server-key")
bad = publish(bad_keys, salts)
bad_root = bad[1][-1][0]
print("Ana is fooled:   ", check(bad_root, "bao", *lookup(bad, "bao", bad_keys, salts)))
k, salt, i, proof = lookup(bad, "bao", bad_keys, salts)
print("Bao monitors himself and sees his key:", k == keys["bao"])

# Attack 2: a split view. Ana sees bad_root, Bao sees root. Their apps compare roots.
print("Ana's and Bao's roots agree:", bad_root == root)
```

```text
Ana looks up Bao: True
Ana is fooled:    True
Bao monitors himself and sees his key: False
Ana's and Bao's roots agree: False
```

The first fake fools Ana but not Bao: the tree is the same for everyone, so Bao
sees the server's key under his own name the next time his app checks. The
second fake fools Bao's monitoring, because Bao is shown the honest tree, but
the two roots differ, and any comparison of roots catches it. A server that
wants to lie must either lie to the victim, who checks, or lie differently to
different people, which comparison reveals.

### In the real world

**Google** published a key transparency prototype based on CONIKS in 2017; it
became the starting point for later work. Melissa Chase and colleagues at
Microsoft Research made the design efficient for frequent updates in SEEMless
(2019), and researchers at Meta and elsewhere extended it in Parakeet (2023) to
handle billions of users.

**WhatsApp** announced its deployment on 13 April 2023: an open-source library,
the Auditable Key Directory (AKD), built on SEEMless and Parakeet, holding the
keys of all its users, with an append-only proof between each epoch and the
next. In 2024 Cloudflare began
acting as an independent auditor, checking each epoch's proof and publishing the
result. The app is designed to check keys automatically in the background, so that
users who never scan a QR code are still protected.

**Apple** announced iMessage Contact Key Verification in December 2022 and
shipped it with iOS 17.2 in December 2023. Devices check the keys of the people
you message against Apple's key transparency log and warn if something does not
match; users who want more can also compare a short verification code once, in
person or on a call.

**Standards.** The IETF formed a key transparency working group (KEYTRANS) in
2023 to write a common protocol, so that clients and auditors of different
companies can check each other.

!!! note "Life story: CONIKS and key transparency"
    **Born:** 2015, Marcela Melara, Aaron Blankstein, Joseph Bonneau, Edward
    Felten and Michael Freedman, USENIX Security 2015 · **Purpose:** let users
    check that a key server shows everyone the same, correct keys, without
    revealing who is in the directory · **Helped:** Google's Key Transparency
    prototype (2017), SEEMless (2019), Parakeet (2023), WhatsApp's Auditable
    Key Directory (April 2023), Apple's iMessage Contact Key Verification
    (December 2023), the IETF KEYTRANS work · **Status:** current and
    spreading; the "ghost user" proposal of 2018 is the attack it was built
    to catch

## 3.9 A coin flip with Earth

*Level: intermediate.*

Arcadia City and an Earth research consortium share a narrow downlink. Every day
of the coming month, one side's data goes first: the Arcadia clinic's imaging or
the Earth lab's instrument run. They agree to settle each day by a fair coin. The
link is fine; the problem is the distance. Tonight the light time is 20 minutes
each way, so every message costs 20 minutes, and a three-message Blum flip costs
an hour.

**First attempt: Blum's protocol.** Arcadia commits at minute 0; Earth receives
the commitment at minute 20 and sends its bit; Arcadia receives it at minute 40
and opens; Earth learns the result at minute 60. It works, but Arcadia knows the
outcome 20 minutes before Earth does, and could simply never open (§3.2).

**Second attempt: commit both ways, open both ways.** At minute 0 each side sends
a commitment to a random 32-byte seed, with its own name inside the commitment so
that neither can bounce the other's back (§3.3). At minute 20 each has the
other's commitment, and each sends its opening at once. At minute 40 both
openings arrive, both sides check them, and the month's schedule is computed
from the two seeds: day $d$ goes to Arcadia if the first bit of
$H(\text{seed}_M \,\Vert\, \text{seed}_E \,\Vert\, d)$ is 1. Both learn the result
at the same time, in 40 minutes, and one exchange settles all 30 days.

**The deadline the speed of light enforces.** Could Arcadia still cheat, by
waiting until Earth's opening arrives at minute 40, computing the schedule, and
opening only if it likes the result? Its opening would then leave at minute 40
and reach Earth at minute 60. But Earth knows the light time precisely from the
planets' positions, so it knows an honest opening must arrive at minute 40, and
it sets the deadline at minute 45 to allow for relay jitter. Anything later is
a forfeit, counted as a loss for the late side. A party that waits to see the
other's opening *physically cannot* meet the deadline. Figure 3.6 shows the
timing.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timing of a coin flip between Arcadia and Earth over a 20-minute link: commitments cross by minute 20, openings by minute 40, and a late opening arrives at minute 60, after the deadline" fill="currentColor" font-size="14">
<text x="150" y="30" text-anchor="middle" font-weight="bold">Arcadia</text>
<text x="490" y="30" text-anchor="middle" font-weight="bold">Earth</text>
<line x1="150" y1="40" x2="150" y2="390" stroke="currentColor" stroke-width="1.5"/>
<line x1="490" y1="40" x2="490" y2="390" stroke="currentColor" stroke-width="1.5"/>
<text x="40" y="55" font-size="13">min 0</text>
<text x="40" y="155" font-size="13">min 20</text>
<text x="40" y="255" font-size="13">min 40</text>
<text x="40" y="355" font-size="13">min 60</text>
<line x1="150" y1="50" x2="484" y2="148" stroke="currentColor" stroke-width="1.8"/>
<polygon points="490,150 479,151 482,142"/>
<line x1="490" y1="50" x2="156" y2="148" stroke="currentColor" stroke-width="1.8"/>
<polygon points="150,150 158,142 161,151"/>
<text x="320" y="80" text-anchor="middle" font-size="13">commitments cross</text>
<line x1="150" y1="150" x2="484" y2="248" stroke="currentColor" stroke-width="1.8"/>
<polygon points="490,250 479,251 482,242"/>
<line x1="490" y1="150" x2="156" y2="248" stroke="currentColor" stroke-width="1.8"/>
<polygon points="150,250 158,242 161,251"/>
<text x="320" y="180" text-anchor="middle" font-size="13">openings cross</text>
<line x1="490" y1="275" x2="610" y2="275" stroke="currentColor" stroke-dasharray="6 4"/>
<text x="610" y="268" text-anchor="end" font-size="12">deadline, min 45</text>
<line x1="150" y1="250" x2="484" y2="348" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8"/>
<polygon points="490,350 479,351 482,342" opacity="0.8"/>
<text x="300" y="340" text-anchor="middle" font-size="12" font-style="italic">a cheater's opening, sent</text>
<text x="300" y="356" text-anchor="middle" font-size="12" font-style="italic">after seeing Earth's: too late</text>
<text x="500" y="255" font-size="12">both know</text>
<text x="40" y="385" font-size="12">one-way light time: 20 minutes</text>
</svg>
<figcaption>Figure 3.6. A coin flip across a 20-minute link. Both sides commit at minute 0 and open as soon as the other's commitment arrives; both learn the result at minute 40. An opening sent after seeing the other side's arrives at minute 60, after the deadline, and counts as a forfeit.</figcaption>
</figure>

**Why commit at all, then?** If the light delay enforces the deadline, the two
sides could seemingly skip the commitments and send their seeds in the clear at
minute 0: each seed arrives at minute 20, and a seed sent after seeing the
other's would arrive at minute 40, too late. This works only if each side's
message really comes from where it claims. Suppose Arcadia had given its
signing key to an agent at an Earth ground station. The agent sees Earth's seed
leave at minute 0, picks a seed for Arcadia that gives a good result, and holds
it until minute 20 before handing it in at the station, where it looks exactly
like a message that left Mars at minute 0. Timing proves *when* a message left
only if you also know *where* it left from, the same problem that distance-
bounding protocols for contactless cards face. Commitments remove the
assumption: whatever an agent on Earth learns at minute 0, Arcadia's seed was
fixed inside a commitment that left Mars before Earth's seed existed. The deadline
then only has to stop a quitter, not a cheater.

**When the link is not a wire.** Real interplanetary links are store-and-forward:
messages wait at relay orbiters and ground stations for a pass, and can be
delayed by hours. Then a tight deadline is unfair to an honest party, and the
two sides fall back on the abort-means-loss rule with a generous deadline, or
replace the coin by a public randomness beacon that neither controls
([Chapter 4](04-Threshold-Cryptography.md)), committing in advance to *which*
future beacon value they will use.

### Code it

The two-way commit-and-open, with the light-time deadline. Each run either
produces 30 days of schedule (M for Mars first, E for Earth first) or a forfeit.

```python
import hashlib, random

DELAY = 20                       # one-way light time in minutes, from the ephemeris
GRACE = 5                        # allowance for relay jitter
rng = random.Random(2087)        # demo only: real seeds come from secrets.token_bytes(32)

def H(*parts):
    return hashlib.sha256(b"".join(len(x).to_bytes(4, "big") + x for x in parts)).digest()

def commit(who, seed, r):        # the author's name is inside, so copying fails (3.3)
    return H(b"coin v1", who, seed, r)

def new_secret():
    return rng.getrandbits(256).to_bytes(32, "big")

def schedule(seed_mars, seed_earth, days):   # one seed each gives a whole month of flips
    return ["M" if H(b"day", seed_mars, seed_earth, bytes([d]))[0] & 1 else "E"
            for d in range(days)]

def flip(mars_cheats):
    sec = {w: (new_secret(), new_secret()) for w in (b"Mars", b"Earth")}
    C = {w: commit(w, *sec[w]) for w in sec}         # minute 0: both commitments leave
    # Minute 20: each side holds the other's commitment and sends its opening.
    mars_sends = 2 * DELAY if mars_cheats else DELAY  # a cheat waits to see Earth's opening
    arrives = mars_sends + DELAY
    deadline = 2 * DELAY + GRACE
    print("  Mars's opening reaches Earth at minute", arrives, "(deadline", str(deadline) + ")")
    if arrives > deadline or commit(b"Mars", *sec[b"Mars"]) != C[b"Mars"]:
        return "Mars forfeits"
    days = schedule(sec[b"Mars"][0], sec[b"Earth"][0], 30)
    return "".join(days) + "  (Mars first on %d of 30 days)" % days.count("M")

print("honest:  ", flip(False))
print("cheating:", flip(True))
```

```text
  Mars's opening reaches Earth at minute 40 (deadline 45)
honest:   MMEEEEEEMEMEMEEMEMMMEMEEEMMMMM  (Mars first on 15 of 30 days)
  Mars's opening reaches Earth at minute 60 (deadline 45)
cheating: Mars forfeits
```

## 3.10 In the real world

*Level: intermediate.*

| Scheme | Hiding | Binding | Size | Setup | After a quantum computer |
|---|---|---|---|---|---|
| Hash, $H(r \Vert m)$ | computational (random oracle) | computational (collisions) | 32 bytes | none | still safe (larger hashes) |
| Pedersen, $g^m h^r$ | perfect | discrete log | 32 bytes on a curve | hash-to-group, no secret | binding lost, hiding kept |
| ElGamal, $(g^r, g^m h^r)$ | Diffie-Hellman | perfect | 64 bytes | none | hiding lost |
| Merkle root | none unless leaves salted | collisions | 32 bytes; proofs $32 \log_2 n$ | none | still safe |
| KZG | none unless randomized | $q$-SDH, pairings | 48 bytes; proofs 48 | ceremony | broken |
| FRI (hash-based) | with salting | collisions | 32 bytes; proofs tens of KB | none | believed safe |

FRI, the hash-based commitment behind STARKs, is in
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md). The failures in this chapter were almost never in the mathematics of the
commitment. They were a missing nonce (taxi data), an ambiguous encoding
(Bitcoin's tree), a parameter that should not have existed (Zcash 2016), or a
commitment someone could copy.

## 3.11 Going deeper

*Level: expert.*

**Commitments from minimal assumptions.** Commitments exist if and only if
one-way functions exist. One direction follows from Impagliazzo and Luby (1989),
who showed that most of cryptography implies one-way functions. The other is
Moni Naor's construction (CRYPTO '89, *Journal of Cryptology* 1991) from a
pseudorandom generator $G$ stretching $n$ bits to $3n$: the receiver sends a
random $3n$-bit string $R$; to commit to a bit $b$ the sender picks a seed $s$
and sends $G(s)$ if $b = 0$ and $G(s) \oplus R$ if $b = 1$. Hiding follows from
pseudorandomness; binding holds because a cheat needs seeds with
$G(s_0) \oplus G(s_1) = R$, and there are only $2^{2n}$ such XORs among $2^{3n}$
possible $R$. Statistically hiding commitments need more: Halevi and Micali
(1996) built them from any collision-resistant hash, and Damgård, Pedersen and
Pfitzmann (1993) from collision-free families.

**Why one side must be computational, formally.** For a perfectly hiding scheme
the distributions of $\mathrm{Commit}(0)$ and $\mathrm{Commit}(1)$ are equal, so
every commitment string in the support of one is in the support of the other:
an opening to the other bit exists. An unbounded sender finds it. For a perfectly
binding scheme the supports are disjoint, and an unbounded receiver decides
which support $C$ lies in. Quantum mechanics does not escape this: Dominic Mayers
and, independently, Hoi-Kwong Lo and Hoi Fung Chau proved in 1997 that
unconditionally secure quantum bit commitment is impossible, a surprise after
years of proposed protocols.

**Trapdoor commitments.** Pedersen's scheme is **equivocal**: whoever knows
$\log_g h$ can open anything. That is a bug for binding, but a feature in
proofs: simulators in zero-knowledge proofs use exactly this trapdoor to "open"
commitments after seeing the challenge ([Chapter 5](05-Zero-Knowledge-Proofs.md)).
Krawczyk and Rabin (2000) turned the idea into **chameleon hashes**, collision-
resistant hashes with a trapdoor for finding collisions, used in signatures that
only the intended recipient can be convinced by.

**KZG's assumptions.** Evaluation binding of KZG reduces to the $q$-strong
Diffie-Hellman assumption ($q$-SDH, Boneh and Boyen 2004): given
$g, g^{s}, \dots, g^{s^q}$, nobody can output $(c, g^{1/(s + c)})$. Plain KZG is
deterministic, so it is not hiding; a "hiding KZG" adds $h^{r(s)}$ for a random
polynomial $r$, the same trick as Pedersen. Modern SNARK proofs often analyze
KZG in the **algebraic group model**, in which an adversary must explain each
group element it outputs as a combination of elements it was given; this gives
cleaner proofs at the cost of a stronger model.

**Better coin flipping.** Cleve's $\Omega(1/r)$ bias bound for $r$-round
two-party coin flipping is tight: Moran, Naor and Segev (2009) gave a protocol
whose bias is $O(1/r)$, using oblivious transfer. With an honest majority, the
bias can be zero; that is why randomness beacons are threshold protocols.

**After quantum computers.** Hash commitments and Merkle trees survive with
longer outputs. Pedersen keeps perfect hiding, so commitments published today
stay secret, but its binding breaks. Lattice-based commitments, binding under the
short integer solution problem and hiding under learning with errors, are the
replacement for homomorphic uses
([Chapter 5 of the post-quantum book](../post-quantum/05-Lattices-and-Their-Hard-Problems.md)),
and FRI replaces KZG where succinct proofs are needed.

## Check yourself

??? question "1. Why is encrypting a bit with a one-time pad not a commitment?"

    It hides perfectly but does not bind: for any ciphertext $c$ and any bit
    $b'$, the key $k' = c \oplus b'$ opens $c$ to $b'$. The sender can choose
    the opening after seeing the other party's move.

??? question "2. In Blum's coin flip, if Bob is honest and Alice chooses her bit by any strategy at all, why is the coin fair?"

    Alice fixes $a$ before she hears $b$ (binding), and $b$ is uniform and
    independent of $a$. So $a \oplus b$ is uniform whatever rule chose $a$.

??? question "3. A web page publishes SHA-256(\"vote: yes\") as a sealed vote. What is wrong, and what is the fix?"

    The value has two or three possible contents, so anyone hashes each and
    finds the match: binding without hiding. Fix: $H(r \Vert \text{vote})$ with
    a fresh random $r$ of at least 128 bits, revealed only at opening.

??? question "4. With $p = 47$, $g = 2$, $h = 3$, compute the Pedersen commitment to $m = 2$ with $r = 1$, and check that it equals the product of $C(1; 0)$ and $C(1; 1)$."

    $C = 2^2 \cdot 3 = 12$. $C(1; 0) = 2$ and $C(1; 1) = 2 \cdot 3 = 6$, and
    $2 \cdot 6 = 12$. The product commits to $1 + 1 = 2$ with $r = 0 + 1 = 1$.

??? question "5. Two Pedersen commitments were made with the same $r$. What does an observer learn?"

    $C_1 / C_2 = g^{m_1 - m_2}$, a commitment to the difference with no
    randomness. If the difference is small, trying candidates finds it.

??? question "6. Why does a Merkle proof for entry 5 of an 8-entry tree fail when checked at position 4?"

    The bits of the position decide on which side each sibling is combined. At
    position 4 the first step computes $\mathrm{node}(\mathrm{leaf}_5, \text{sibling})$
    instead of $\mathrm{node}(\text{sibling}, \mathrm{leaf}_5)$, a different hash,
    and the path no longer reaches the root.

??? question "7. A Merkle tree hashes leaves and inner nodes the same way. Explain how an attacker 'proves' an entry that was never logged."

    An inner node is $H(L \Vert R)$. The 64-byte string $L \Vert R$ hashed as a
    leaf gives the same value, so in a tree one level shorter it is an "entry"
    whose path reaches the real root. Distinct prefixes for leaves and nodes
    (RFC 6962 uses `00` and `01`) make the two readings different.

??? question "8. A KZG setup's secret $s$ leaked. What can its holder do?"

    Open any commitment at any point to any value:
    $\pi' = (C g^{-y'})^{1/(s - z)}$. Binding is gone, so SNARKs built on the
    setup accept false proofs, which in a payment system means coins from
    nothing.

??? question "9. A ceremony has 141,416 contributions. Under what condition is its secret known to someone?"

    Only if every contributor's secret $\tau_i$ is known to that someone, since
    the secret is the product of all of them (or the software of every
    contributor was compromised). One honest contributor who destroyed their
    $\tau$ is enough.

??? question "10. In the Mars flip of §3.9, the light time is 20 minutes and the deadline 45. Explain why the commitments are still needed, even though a late opening is already rejected."

    The deadline proves when a message left only if you know where it left
    from. An agent on Earth holding Arcadia's signing key could see Earth's seed
    and inject a chosen "Mars" seed at minute 20, matching the expected arrival
    time. With commitments, Arcadia's seed was fixed in a commitment sent from
    Mars at minute 0, before Earth's seed was known anywhere.

## What you learned

- A commitment hides a value until it is opened and binds the committer to it.
  At most one of the two can hold against unlimited power; every scheme chooses
  which one rests on a hard problem.
- Blum's 1981 coin flip is commit, call, open. It is fair if either side is
  honest, but whoever learns the result first can quit (Cleve, 1986), so real
  protocols count an abort as a loss.
- $H(r \Vert m)$ with fresh 256-bit $r$ and unambiguous encoding is the everyday
  commitment. A bare hash of a guessable value hides nothing, and commitments
  must be tied to their authors so they cannot be copied.
- Pedersen's $g^m h^r$ hides perfectly, binds under the discrete logarithm, and
  adds while sealed; it needs an $h$ nobody knows the logarithm of, fresh $r$,
  and range proofs when values must not wrap.
- Merkle trees commit to lists with logarithmic inclusion proofs and are
  position-binding vector commitments. They do not hide without salted leaves,
  and they need distinct leaf and node hashing.
- KZG commits to a polynomial in 48 bytes with 48-byte openings, at the price of
  pairings, a trusted setup and no post-quantum security. Ceremonies make the
  setup safe if one participant of many was honest: six in 2016, 141,416 in 2023.
- Key transparency puts a key directory in a Merkle tree, has users check their
  own entries and compare roots, and so catches a server that substitutes keys.

**Next:** [Chapter 4](04-Threshold-Cryptography.md), where a key is used without
ever being held in one place, and randomness comes from a group that no single
member controls.

## Further reading

- Manuel Blum, "Coin Flipping by Telephone: A Protocol for Solving Impossible
  Problems", CRYPTO '81 (1981); reprinted in *SIGACT News* 15 (1983).
- Richard Cleve, "Limits on the Security of Coin Flips when Half the Processors
  Are Faulty", STOC 1986.
- Ralph Merkle, "A Certified Digital Signature", CRYPTO '89 (written 1979); US
  patent 4,309,569 (1982).
- Moni Naor, "Bit Commitment Using Pseudorandomness", *Journal of Cryptology* 4
  (1991).
- Torben Pryds Pedersen, "Non-Interactive and Information-Theoretic Secure
  Verifiable Secret Sharing", CRYPTO '91 (1991).
- Danny Dolev, Cynthia Dwork and Moni Naor, "Non-Malleable Cryptography", STOC
  1991; *SIAM Journal on Computing* 30 (2000).
- Shai Halevi and Silvio Micali, "Practical and Provably-Secure Commitment
  Schemes from Collision-Free Hashing", CRYPTO '96 (1996).
- Dominic Mayers, "Unconditionally Secure Quantum Bit Commitment is Impossible",
  *Physical Review Letters* 78 (1997); Hoi-Kwong Lo and H. F. Chau, same journal
  and year.
- Aniket Kate, Gregory Zaverucha and Ian Goldberg, "Constant-Size Commitments to
  Polynomials and Their Applications", ASIACRYPT 2010.
- Dario Catalano and Dario Fiore, "Vector Commitments and Their Applications",
  PKC 2013.
- Eli Ben-Sasson, Alessandro Chiesa, Matthew Green, Eran Tromer and Madars Virza,
  "Secure Sampling of Public Parameters for Succinct Zero Knowledge Proofs",
  IEEE Symposium on Security and Privacy 2015.
- Sean Bowe, Ariel Gabizon and Ian Miers, "Scalable Multi-party Computation for
  zk-SNARK Parameters in the Random Beacon Model" (2017).
- Marcela Melara, Aaron Blankstein, Joseph Bonneau, Edward Felten and Michael
  Freedman, "CONIKS: Bringing Key Transparency to End Users", USENIX Security
  2015.
- Melissa Chase, Apoorvaa Deshpande, Esha Ghosh and Harjasleen Malvai,
  "SEEMless: Secure End-to-End Encrypted Messaging with less Trust", CCS 2019;
  Harjasleen Malvai et al., "Parakeet: Practical Key Transparency for End-to-End
  Encrypted Messaging", NDSS 2023.
- Meta Engineering, "Deploying key transparency at WhatsApp" (13 April 2023).
- Ian Levy and Crispin Robinson, "Principles for a More Informed Exceptional
  Access Debate", *Lawfare* (November 2018).
- US Federal Trade Commission, "No, hashing still doesn't make your data
  anonymous", Technology Blog (July 2024).
- Vijay Pandurangan, "On Taxis and Rainbows: Lessons from NYC's improperly
  anonymized taxi logs" (June 2014).
- RFC 6962 (2013) and RFC 9162 (2021), Certificate Transparency; RFC 9380
  (2023), Hashing to Elliptic Curves; RFC 9381 (2023), Verifiable Random
  Functions.
- EIP-4844, "Shard Blob Transactions" (2022 to 2024), and EIP-7594, "PeerDAS".
- Ethereum Foundation, KZG ceremony transcript and announcement (2023).
- John Kuszmaul, "Verkle Trees" (MIT PRIMES, 2018).
- In this shelf: [book 1, §23.4](../../book/23-Advanced-Protocols.md), the
  [Commitments reference page](../../11-advanced/Commitments.md),
  [Mathematics, Chapter 11](../mathematics/11-Polynomials-at-Work.md) and
  [Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md),
  [Protocols, Chapter 2](../protocols/02-Certificates-and-PKI.md).
