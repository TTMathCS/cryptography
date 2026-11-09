# 1. Computing with Secrets

*Most of cryptography protects people who trust each other from someone outside:
encrypt the message, sign it, agree on a key. This book is about people who do
not trust each other but still have to decide, compute or pay together. This
first chapter sets up the problem and the words for it. It opens with a puzzle
from 1982, two millionaires who want to know who is richer without saying how
rich they are, and solves it in an imaginary world with a perfectly honest
friend. You will code that ideal world next to the protocols people naturally
invent instead, measure exactly how much the naive ones leak, write a simulator
that proves a small protocol leaks nothing, and break that protocol when two of
its parties work together. The chapter ends with a map of the whole book.*

!!! abstract "In this chapter"
    **You will learn:**

    - the general problem of secure computation: several parties, private
      inputs, one function, and nobody to trust;
    - how to state what a protocol should achieve by imagining a trusted party
      (the ideal world), and how to measure what a protocol leaks beyond that;
    - the trust models every later chapter uses: semi-honest and malicious
      parties, collusion thresholds, honest majority, trusted setup;
    - the ideal-versus-real definition of security and the simulator, in plain
      words and in code;
    - the different things "privacy" can mean: input privacy, output privacy,
      anonymity, unlinkability, metadata;
    - how the rest of the book is organized.

    **You need:** modular arithmetic ([Chapter 3 of book 1](../../book/03-The-Arithmetic-of-Secrets.md)),
    hash functions ([Chapter 9](../../book/09-Hash-Functions.md)) and a little
    probability. [Chapter 17 of book 1](../../book/17-Defining-Security.md)
    (security games) helps for §1.5 but is not required. Book 1's
    [Chapter 23](../../book/23-Advanced-Protocols.md) is a one-chapter tour of
    this whole book.

    **Levels:** §1.1 to §1.3 and §1.10 are for beginners, §1.4 to §1.9 are
    intermediate, §1.11 is expert.

## 1.1 The problem

*Level: beginner.*

Here is a puzzle. Alice and Bob are both millionaires. They meet at a dinner and
each would like to know which of them is richer. Neither wants to say how much
they own: not to the other, not to the waiter, not to a friend who offers to
hold the numbers and announce the winner. Can they find out who is richer, by
talking, in such a way that at the end each knows the answer and nothing else?

Take a minute before reading on and try to design a way. Most people's first
attempts fall into a few families. Alice could say her fortune, but that is the
thing she will not do. She could say something that "hides" it, such as a hash,
a scrambled version or a rough range; then either Bob cannot compare anything,
or the hiding turns out to be thin and Bob learns her fortune after all. They
could reveal their fortunes a digit at a time, starting from the left, and stop
at the first digit where they differ; that gives the right answer and gives away
the shared leading digits as well. They could each tell a third person; that
works, if there is a third person both trust completely, which is the thing the
puzzle rules out. After a while the puzzle starts to look impossible. To compare
two numbers, surely somebody has to see both.

Andrew Chi-Chih Yao, then a young computer scientist in California, posed this
puzzle in a paper called "Protocols for Secure Computations", presented at the
IEEE Symposium on Foundations of Computer Science in November 1982. His answer
was that it is not impossible. Two people can compute a function of their two
secret inputs, here the single bit "is Alice's fortune at least Bob's?", by
exchanging messages built with public-key cryptography, so that each learns the
bit and nothing more. His 1982 protocol was slow, with a cost that grew with
the range of possible fortunes, but it worked. Four years later he described a
general method for any function, which grew into the garbled circuits of
[Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md), where the
millionaires get their real solution.

Yao was not the only one asking such questions. In 1979 Adi Shamir, Ronald
Rivest and Leonard Adleman, fresh from inventing RSA, wrote about **mental
poker**: how to play a fair game of cards over the telephone, with no cards and
no dealer, so that nobody can see another's hand or deal themselves an ace. In
the same year Shamir and George Blakley each showed how to split a secret among
several people ([Chapter 2](02-Secret-Sharing.md)). In 1981 Manuel Blum asked how
two people who had just divorced could flip a fair coin over the phone
([Chapter 3](03-Commitments.md)), and Michael Rabin introduced a strange
primitive called oblivious transfer. In 1985 Shafi Goldwasser, Silvio Micali and
Charles Rackoff showed how to prove a statement while revealing nothing but its
truth ([Chapter 5](05-Zero-Knowledge-Proofs.md)). Then in 1987 Oded Goldreich,
Silvio Micali and Avi Wigderson published "How to Play Any Mental Game", whose
title nods to mental poker and whose theorem settles the question in general:
for any function at all, any number of parties can compute it on their private
inputs as securely as if a trusted party had done it for them, provided the
usual cryptographic assumptions hold. Yao received the Turing Award in 2000, and
Goldwasser and Micali in 2012, in large part for this body of work.

The millionaires are a puzzle, but the shape of the problem is everywhere:

- **An auction.** Farmers bid sealed prices for contracts. The market price must
  be found, but a bid tells a buyer exactly how badly each farmer needs the
  deal.
- **A salary survey.** Employers want to know the pay gap between men and women
  across a city. None will hand its payroll to the others, or to a survey office
  that could leak it.
- **A dating match.** Two people each say yes or no to a date. If both say yes,
  they should find out. If one says no, the other should not learn that it was
  a no to them rather than a mismatch they caused.
- **A medical study.** Hospitals want to know whether a treatment works across
  all their patients. Each is forbidden by law to share patient records.
- **A vote.** A council wants the tally of a decision. Each member wants the
  tally to be right, and their own vote to stay their own.

In every case there are $n$ parties $P_1, \ldots, P_n$, each holding a private
input $x_i$, and they want to compute an agreed function

$$
y = f(x_1, x_2, \ldots, x_n)
$$

so that everyone (or some agreed subset) learns $y$, and nobody learns anything
else about the others' inputs. For the millionaires, $n = 2$ and
$f(a, b) = [a \ge b]$, a single bit. For the dating match it is the AND of two
bits. For the vote it is the sum of the votes. This is **secure computation**,
also called **secure multi-party computation** or MPC, and in a broad sense it is
the subject of the whole book: secret sharing, commitments, zero-knowledge
proofs, homomorphic encryption, anonymous credentials and voting systems are all
ways of computing something useful while keeping something else hidden.

Before we can say whether any protocol solves the millionaires' problem, we
need to say precisely what "solves" means. That turns out to be the hard part,
and the trick for doing it is to imagine the friend the puzzle forbids.

## 1.2 The ideal world

*Level: beginner.*

Suppose Alice and Bob did have a friend they trusted completely. Call him Trent.
Trent is incorruptible, forgets everything when the dinner ends, and cannot be
bribed, hacked or subpoenaed. With Trent the millionaires' problem is easy:

1. Alice whispers her fortune $a$ to Trent. Bob whispers his fortune $b$.
2. Trent computes the bit $[a \ge b]$ and tells it to both of them.

That is all. Figure 1.1 shows it, with Alice's 7 million against Bob's 5.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="The ideal world for the millionaires: Alice and Bob each send their fortune privately to a trusted party, Trent, who sends back one bit to each; without Trent they must find the bit by talking" fill="currentColor" font-size="14">
<rect x="245" y="16" width="150" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="43" text-anchor="middle" font-weight="bold">Trent (trusted)</text>
<rect x="20" y="150" width="160" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="100" y="177" text-anchor="middle" font-weight="bold">Alice, a = 7</text>
<rect x="460" y="150" width="160" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="540" y="177" text-anchor="middle" font-weight="bold">Bob, b = 5</text>
<line x1="95" y1="150" x2="250" y2="60" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,60 244.2,68.0 240.2,61.0"/>
<line x1="265" y1="60" x2="110" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="110,150 119.8,149.0 115.8,142.0"/>
<line x1="545" y1="150" x2="390" y2="60" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,60 399.8,61.0 395.8,68.0"/>
<line x1="375" y1="60" x2="530" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="530,150 524.2,142.0 520.2,149.0"/>
<text x="150" y="98" text-anchor="end">7</text>
<text x="205" y="122" text-anchor="start">a ≥ b: yes</text>
<text x="490" y="98" text-anchor="start">5</text>
<text x="435" y="122" text-anchor="end">a ≥ b: yes</text>
<line x1="180" y1="172" x2="460" y2="172" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.6"/>
<text x="320" y="164" text-anchor="middle" opacity="0.8">?</text>
<text x="320" y="226" text-anchor="middle">Without Trent: can talking alone give the same bit, and nothing more?</text>
</svg>
<figcaption>Figure 1.1. The millionaires' problem in the ideal world. Each fortune goes privately to Trent, and one bit comes back to each party. The real-world question is whether Alice and Bob can get the same result by exchanging messages along the dashed line.</figcaption>
</figure>

Trent cannot be found at real dinners, but he is enormously useful on paper,
because he defines the target. Whatever Alice learns in this imaginary world is
what she is *entitled* to learn. Whatever she learns in a real protocol beyond
that is a **leak**. Cryptographers call Trent's job the **ideal functionality**
and the imaginary setting the **ideal world**. Every chapter of this book that
builds a protocol starts, sometimes silently, by saying what Trent would do.

### By hand: what the answer itself gives away

Even Trent cannot hide everything, because the answer is information. Say
fortunes are whole millions from 1 to 10, every value equally likely as far as
the other party knows. (Yao's own example used a small range of this kind.)

Alice has $a = 7$ and Trent says yes, $a \ge b$. Before the answer, Bob could
have had any of 10 values. After it, Alice knows $b \in \{1, 2, \ldots, 7\}$:
seven candidates are left. Bob has $b = 5$ and hears the same yes. He now knows
$a \in \{5, 6, \ldots, 10\}$, six candidates.

A natural way to measure what they learned is in bits. Ten equally likely values
take $\log_2 10 \approx 3.32$ bits to describe; seven take
$\log_2 7 \approx 2.81$. So the answer told Alice about $0.51$ bits about Bob's
fortune, and told Bob $\log_2 10 - \log_2 6 \approx 0.74$ bits about hers. Those
numbers depend on the inputs: if Alice had 10 million, the yes would tell her
nothing at all, and if she had 1 million it would tell her that Bob has exactly
1 million too.

This is the first lesson of the chapter, and it returns again and again:
**secure computation protects the inputs, not the output.** If the output itself
gives the inputs away, no protocol can help. Two people who compute the average
of their two salaries each learn the other's salary from the average, however
perfectly the average is computed. Choosing a function whose output is safe to
release is a separate problem, the subject of output privacy (§1.7) and of
differential privacy ([Chapter 19](19-Differential-Privacy.md)).

### Code it

The ideal world in a few lines. Trent is an object that collects inputs and
returns the bit. The two helper functions list every fortune of the other party
that is consistent with what each party saw: that list is exactly that party's
knowledge after the protocol.

```python
# The ideal world: a trusted party answers one question and says nothing else.
class Trent:
    def __init__(self):
        self.inputs = {}

    def send(self, name, fortune):            # each party hands over its input, privately
        self.inputs[name] = fortune

    def answer(self):                          # one bit, sent to both parties
        return self.inputs["Alice"] >= self.inputs["Bob"]

def what_alice_knows(a, bit, fortunes):        # every Bob consistent with Alice's view
    return [b for b in fortunes if (a >= b) == bit]

def what_bob_knows(b, bit, fortunes):
    return [a for a in fortunes if (a >= b) == bit]

fortunes = range(1, 11)                        # whole millions, 1 to 10
trent = Trent()
trent.send("Alice", 7)
trent.send("Bob", 5)
bit = trent.answer()
print("Is Alice at least as rich as Bob?", bit)
print("Alice now knows Bob has one of", what_alice_knows(7, bit, fortunes))
print("Bob now knows Alice has one of  ", what_bob_knows(5, bit, fortunes))
```

It prints:

```
Is Alice at least as rich as Bob? True
Alice now knows Bob has one of [1, 2, 3, 4, 5, 6, 7]
Bob now knows Alice has one of   [5, 6, 7, 8, 9, 10]
```

The idea of a **view** in this code is worth fixing now, because every
definition in the chapter is built on it. A party's view is everything it has at
the end of a run: its own input, its own random choices, and every message it
received. Here Alice's view is just her fortune and the bit. "What Alice knows"
is the set of possible worlds, here the possible values of $b$, that would have
given her the same view.

### What Trent stands for

Trent looks like a cheat, a way of assuming the problem away. He is the
opposite. He is a precise statement of what we want, written as a short program
that everyone can read and agree to before any cryptography is chosen. The rest
of the work is to replace him with a protocol that runs between the parties
alone and provably gives the same guarantees. When that works, the parties get
everything Trent would have given them and nothing more, without having to find
a Trent.

In practice people do use trusted third parties, all the time: a notary, an
auction house, a census office, a cloud server, an election authority. The
trouble is that each one is a single point that can fail. It can be hacked, as
census and health databases regularly are. It can be compelled by a court or a
government. It can be bribed, or simply careless, or it can stop existing. And
for some groups, there is no outsider everyone accepts: two rival companies,
two countries, or a settlement on Mars and a hospital on Earth. Secure
computation is the craft of getting Trent's guarantees without Trent.

## 1.3 Naive protocols, and what they leak

*Level: beginner.*

With Trent as the yardstick we can now test the protocols people invent when
they first meet the puzzle. Each of the three below gives the right answer.
Each fails, and the way to see it is to compare what a party knows at the end
with what it would know in the ideal world.

### Idea 1: send a hash

"Alice sends $H(a)$, the SHA-256 hash of her fortune. A hash is one-way, so Bob
cannot recover $a$." Bob receives a 64-digit hexadecimal string. How does he
compare it with his own fortune? The hash of a bigger number is not a bigger
hash, so the only thing he can do with it is hash candidate fortunes himself
and look for a match. And that is exactly the problem: there are only ten
candidates. Bob hashes 1, 2, ..., 10, finds the one that matches, and knows $a$.

A hash function is one-way only when the input is hard to guess. A fortune, a
salary, a vote, a birth date or a four-digit PIN is not: the set of plausible
values is small enough to try them all. This is the same reason passwords are
stored with slow, salted functions ([Chapter 11 of book 1](../../book/11-Passwords-and-Key-Derivation.md)),
and even those only slow the search down.

**Break it.** Adding a salt does not help here, because Bob needs the salt to
do anything with the hash. Real fortunes are not whole millions, so give Alice a
fortune to the nearest thousand dollars, anywhere up to a billion. That is a
million possibilities:

```python
import hashlib, secrets

def h(salt, fortune):
    return hashlib.sha256(salt + str(fortune).encode()).hexdigest()

# Alice: her fortune in thousands of dollars, up to a billion dollars
alice = 734512
salt = secrets.token_bytes(16)            # a fresh random salt, sent along with the hash
message = (salt, h(salt, alice))

# Bob: tries every possible fortune, a million guesses
salt, digest = message
for guess in range(1, 1000001):
    if h(salt, guess) == digest:
        print("Bob recovers Alice's fortune:", guess, "thousand dollars")
        break
```

```
Bob recovers Alice's fortune: 734512 thousand dollars
```

On an ordinary laptop the loop finishes in well under a second. A fortune
measured to the dollar would take a thousand times longer, a few minutes. The
lesson is general: **any deterministic function of a low-entropy input that the
other side can compute is a leak of the input.** The fix is not a better hash
but a different kind of protocol, one in which Bob never holds anything he can
test guesses against.

### Idea 2: hide the numbers behind a random mask

"Alice picks a large random number $r$ and sends $a + r$ to Bob. That reveals
nothing about $a$, since $r$ could be anything. Bob subtracts his fortune and
sends back $a + r - b$. Alice subtracts $r$ and gets $a - b$, whose sign is the
answer." By hand: $a = 7$, $r = 4{,}812$. Alice sends $4{,}819$. Bob, with
$b = 5$, sends back $4{,}814$. Alice subtracts $4{,}812$ and gets $2$: she is
richer.

She is also informed that Bob is worth exactly $7 - 2 = 5$ million. The
protocol computes the wrong function. It was meant to compute the sign of
$a - b$; it computes $a - b$ itself, and hands it to Alice, who can subtract it
from her own fortune. Masking was the right instinct (it is the heart of the
secret sharing in §1.6 and [Chapter 2](02-Secret-Sharing.md)), but the mask was
removed too early, before the information was cut down to one bit.

There is a second, quieter leak. Masking hides a number only if the mask is
drawn from a range much larger than the number, or the arithmetic wraps around
modulo some $M$ with $r$ uniform in $0, \ldots, M - 1$. If $r$ is "a random
number up to 10,000" in ordinary integers, then a message of $10{,}009$ tells Bob
that $a \ge 9$. Arithmetic modulo $M$ is the clean way: every value of $a + r
\bmod M$ is equally likely whatever $a$ is.

### Idea 3: compare one bit at a time

"Write both fortunes in binary. Starting at the top, each says their next bit
aloud. As long as the bits agree, continue. The first time they differ, whoever
said 1 is richer. If all bits agree, the fortunes are equal." This one is
appealing: it never reveals a whole fortune, and often stops early.

By hand, with four-bit fortunes from 0 to 15, Alice has $7 = 0111$ and Bob has
$5 = 0101$. They both say 0, then both say 1, then Alice says 1 and Bob says 0.
Alice is richer. Figure 1.2 shows the run.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="The bit-by-bit comparison of 7 and 5: three rounds of announced bits, ending when the bits differ, and what each party learns compared with the ideal world" fill="currentColor" font-size="14">
<rect x="20" y="10" width="170" height="36" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="105" y="33" text-anchor="middle" font-weight="bold">Alice, a = 0111</text>
<rect x="450" y="10" width="170" height="36" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="535" y="33" text-anchor="middle" font-weight="bold">Bob, b = 0101</text>
<line x1="105" y1="46" x2="105" y2="262" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="535" y1="46" x2="535" y2="262" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="105" y1="82" x2="527" y2="82" stroke="currentColor" stroke-width="1.4"/>
<polygon points="535,82 527,78 527,86"/>
<text x="320" y="76" text-anchor="middle">top bit: 0</text>
<line x1="535" y1="112" x2="113" y2="112" stroke="currentColor" stroke-width="1.4"/>
<polygon points="105,112 113,108 113,116"/>
<text x="320" y="106" text-anchor="middle">top bit: 0</text>
<line x1="105" y1="148" x2="527" y2="148" stroke="currentColor" stroke-width="1.4"/>
<polygon points="535,148 527,144 527,152"/>
<text x="320" y="142" text-anchor="middle">next bit: 1</text>
<line x1="535" y1="178" x2="113" y2="178" stroke="currentColor" stroke-width="1.4"/>
<polygon points="105,178 113,174 113,182"/>
<text x="320" y="172" text-anchor="middle">next bit: 1</text>
<line x1="105" y1="214" x2="527" y2="214" stroke="currentColor" stroke-width="1.4"/>
<polygon points="535,214 527,210 527,218"/>
<text x="320" y="208" text-anchor="middle">next bit: 1</text>
<line x1="535" y1="244" x2="113" y2="244" stroke="currentColor" stroke-width="1.4"/>
<polygon points="105,244 113,240 113,248"/>
<text x="320" y="238" text-anchor="middle">next bit: 0  (they differ: Alice is richer, stop)</text>
<text x="20" y="292" text-anchor="start">Alice learns b is 0100 or 0101: two values (ideal world: 0 to 7)</text>
<text x="20" y="318" text-anchor="start">Bob learns a is 0110 or 0111: two values (ideal world: 5 to 15)</text>
</svg>
<figcaption>Figure 1.2. The bit-by-bit comparison on 7 and 5. The answer is right, but each announced bit is a piece of a fortune. Each party ends with two candidates for the other's fortune, where the ideal world would leave eight for Alice and eleven for Bob.</figcaption>
</figure>

Count what each learned. Alice heard Bob's bits 0, 1, 0: Bob's fortune is
$010x$, either 4 or 5. In the ideal world, hearing only "Alice is at least as
rich", she would know $b \le 7$, eight candidates. Bob heard 0, 1, 1: Alice's
fortune is 6 or 7, where the ideal world would leave him $a \ge 5$, eleven
candidates. The protocol is correct and leaks, and the leak is worst exactly
when the fortunes are close, which is when the question is most sensitive.

### Code it: measuring the leak

To compare protocols fairly, measure over all inputs. For every pair of
fortunes $(a, b)$ in $0, \ldots, 15$, the program below runs each protocol,
records each party's view, counts how many fortunes of the other party would
have produced that same view, and averages $\log_2$ of that count. The result is
how many of the other party's four bits remain hidden, on average. (For
uniformly random inputs this average is the conditional entropy of
[Mathematics, Chapter 17](../mathematics/17-Information-and-Entropy.md).)

```python
import hashlib
from math import log2

N = 16                                    # fortunes 0..15, four bits each

def ideal(a, b):                          # (Alice's view, Bob's view) beyond own input
    bit = a >= b
    return bit, bit

def hashed(a, b):                         # Alice sends SHA-256 of her fortune, Bob answers
    h = hashlib.sha256(str(a).encode()).hexdigest()
    bit = a >= b
    return bit, (h, bit)

def bit_by_bit(a, b):                     # announce bits from the top until they differ
    said = []
    for i in (3, 2, 1, 0):
        x, y = a >> i & 1, b >> i & 1
        said.append((x, y))
        if x != y:
            break
    return tuple(said), tuple(said)

def hidden_bits(protocol):                # average log2 of what each side still can't rule out
    alice = bob = 0.0
    for a in range(N):
        for b in range(N):
            va, vb = protocol(a, b)
            alice += log2(sum(protocol(a, y)[0] == va for y in range(N)))
            bob += log2(sum(protocol(x, b)[1] == vb for x in range(N)))
    return alice / N**2, bob / N**2

print("protocol     Bob hidden from Alice   Alice hidden from Bob   (of 4 bits)")
for name, p in [("ideal", ideal), ("hashed", hashed), ("bit by bit", bit_by_bit)]:
    ha, hb = hidden_bits(p)
    print(f"{name:12} {ha:10.2f} {hb:23.2f}")
print("bit by bit on 7 and 5:", bit_by_bit(7, 5)[0])
```

```
protocol     Bob hidden from Alice   Alice hidden from Bob   (of 4 bits)
ideal              3.28                    3.28
hashed             3.28                    0.00
bit by bit         2.12                    2.12
bit by bit on 7 and 5: ((0, 0), (1, 1), (1, 0))
```

Read the table row by row. In the ideal world, the one-bit answer costs each
party $4 - 3.28 = 0.72$ bits of its fortune on average. That loss is
unavoidable; it is the price of asking the question at all. The hash protocol
costs Alice nothing extra but costs Bob, who receives the hash, everything: none
of Alice's four bits stays hidden. The bit-by-bit protocol costs each side
$4 - 2.12 = 1.88$ bits, which is $1.16$ bits per party *more* than the answer
itself requires. That excess is the leak, and a secure protocol is one where
the excess is zero.

The table also shows why "it only reveals a little" is a dangerous defense.
Averages hide the bad cases. For the bit-by-bit protocol, two fortunes that
agree in their top three bits are revealed completely, up to the last bit.

### The real solution, later

There are protocols that leave every party with exactly the ideal row of the
table, and they are among the main results of this book. Yao's 1982 protocol
used public-key encryption and a cost proportional to the size of the range;
the method used today encrypts a comparison circuit gate by gate, so that Bob
can evaluate it on scrambled values without seeing any bit along the way, and
uses oblivious transfer so that Bob can collect the scrambled versions of his
own input bits without Alice learning them. A comparison of two 32-bit numbers
is a circuit of about a hundred gates and runs in a fraction of a millisecond. Both pieces, and the
millionaires solved at last, are in
[Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md).

!!! note "Life story: Yao's millionaires' problem"
    **Born:** 1982, in Andrew Yao's paper "Protocols for Secure Computations"
    at the IEEE Symposium on Foundations of Computer Science · **Purpose:** a
    concrete puzzle showing that two parties can compute a function of their
    secrets without revealing them · **Helped:** started the study of secure
    two-party computation; led to garbled circuits and, with GMW (1987), to
    the general theorem that any function can be computed securely; still the
    standard first example and benchmark for comparison protocols · **Status:**
    solved, many times over; secure comparison is a building block of sealed-bid
    auctions, private ranking and private machine learning

## 1.4 Who are the parties, and what might they do?

*Level: intermediate.*

To say a protocol is secure we must say against whom. A protocol that is safe
among colleagues who follow the rules but read their logs may be useless among
competitors who will send false messages to learn something. Cryptographers
describe the threat with an imaginary **adversary** who **corrupts** some of the
parties: it sees everything those parties see and, depending on the model, may
control what they do. The honest parties are the ones it does not control, and
the protocol must protect them.

### Semi-honest and malicious

A **semi-honest** adversary (also called *honest but curious*, or *passive*)
lets its corrupted parties follow the protocol exactly, then studies their views
for anything it can learn. This sounds weak, and it is the weakest model in
common use, but it captures real threats: an insider at one hospital who
reviews logs later, a server operator whose disks are seized or breached a year
after the run, a participant who simply looks at what arrives. It is also the
right model when cheating would be caught later and punished, or when the
parties are themselves audited institutions that follow their software.
Protocols secure against semi-honest parties are much cheaper, and they are the
first version of almost every protocol in this book.

A **malicious** adversary (also *active*, or *Byzantine*, after the generals of
[Chapter 17](17-Consensus-and-Smart-Contracts.md)) may make its parties do
anything at all: send malformed or inconsistent messages, choose its messages
after seeing the honest ones, stop halfway, or run several sessions at once and
mix their messages. Protection against malicious parties needs extra machinery,
usually commitments ([Chapter 3](03-Commitments.md)) to fix values in advance,
zero-knowledge proofs ([Chapter 5](05-Zero-Knowledge-Proofs.md)) that each
message was computed correctly, or message authentication codes on shared
values ([Chapter 10](10-Multi-Party-Computation-in-Practice.md)). In 1987
Goldreich, Micali and Wigderson showed a general **compiler** that turns any
semi-honest protocol into a malicious one by having each party prove, in zero
knowledge, that every message follows the rules. The compiler is a theorem
more than a recipe, because the proofs are expensive, but it shows the gap can
always be closed.

Between the two sits the **covert** adversary of Yonatan Aumann and Yehuda
Lindell (2007): it will cheat, but only if it is unlikely to be caught. A
protocol that catches any cheater with probability one half is useless against
a malicious adversary and very effective against a bank that cannot afford to
be caught even once.

Two things are allowed to every adversary, even in the ideal world, because no
protocol could prevent them. A corrupted party may **choose any input** it
likes: Bob can tell Trent he has 9 million instead of 5, and no cryptography can
tell. And a corrupted party may **refuse to take part**. Security means "no worse
than the ideal world", not "better than it". If lying about your input is a
problem, it is a problem of the function and of the world around it (audits,
signed payrolls, physical checks), not of the protocol.

### How many can be corrupted

In a protocol among $n$ parties, the adversary may corrupt up to $t$ of them,
and they may **collude**: pool their views and coordinate their actions. The
threshold is part of the security claim. The common cases have names:

- **Honest majority:** $t < n/2$. More than half the parties are honest.
- **Two-thirds honest:** $t < n/3$, the classic bound for Byzantine agreement
  ([Chapter 17](17-Consensus-and-Smart-Contracts.md)).
- **Dishonest majority:** any $t \le n - 1$. Each honest party is protected
  even if all the others conspire against it. For two parties this is the only
  model that makes sense: if one party is corrupted, half are.

Corruption can also be **static**, decided before the protocol starts, or
**adaptive**, decided during the run as the adversary sees messages. Adaptive
security is harder to prove and is the right model when servers are broken into
one by one.

### What the network is assumed to be

A protocol also assumes something about the wires. The usual textbook model
gives every pair of parties a **private, authenticated channel**: messages
cannot be read or changed in transit. That is not an assumption about the real
internet; it is a division of labor. Making channels private and authenticated
is the job of TLS and its relatives, analyzed against an attacker who controls
the whole network in [Protocols, Chapter 1](../protocols/01-What-a-Protocol-Must-Do.md).
Some protocols also need a **broadcast channel**, on which a party cannot send
different messages to different people, and some need **synchrony**, a known
bound on how long a message takes. Over a link to Mars, with up to 22 minutes
of light delay one way, a protocol with many rounds is slow even when it is
secure, so the number of rounds matters as much as the number of bits.

### Trusted setup

Sometimes a protocol relies on a small, one-time trusted step instead of a
trusted party for the whole computation:

- a **common reference string**, public random-looking values generated before
  the protocol by someone who then forgets the secret randomness used to make
  them. The zero-knowledge SNARKs of [Chapter 7](07-SNARKs.md) need one, and the
  famous **ceremonies** of [Chapter 3](03-Commitments.md) (Zcash in 2016,
  Ethereum's KZG ceremony in 2023) spread the generation across many
  participants so that one honest participant is enough;
- a **dealer of correlated randomness**: before the inputs exist, someone hands
  out random shares with a useful structure, such as the Beaver triples of
  [Chapter 10](10-Multi-Party-Computation-in-Practice.md). The dealer never sees
  any input, but must not collude with the parties;
- **trusted hardware**, such as a processor enclave that promises to run only
  the agreed code. This replaces trust in a person with trust in a chip
  manufacturer and its attestation keys, and the attacks on such enclaves are
  told in [Chapter 10](10-Multi-Party-Computation-in-Practice.md).

Each is a smaller Trent: trusted for less, for a shorter time, and often
splittable among many so that only one need be honest.

### Fairness and output delivery

In the ideal world Trent sends the answer to both parties at once. A real
protocol sends messages one at a time, so someone learns the answer first, and a
malicious party who learns it first can stop and deny it to the other. In 1986
Richard Cleve proved that this cannot be fixed in general: with a dishonest
majority, not even a coin flip can be made fully fair. Protocols for a
dishonest majority therefore promise **security with abort**: the adversary
can learn the output and then stop the honest parties from getting it, but it
cannot learn anything else or change the result. With an honest majority, a
protocol can guarantee that everyone gets the output.

### What is possible, under which model

The models are not just vocabulary. Each combination has a known answer to the
question "can every function be computed securely?", and those answers are some
of the deepest results in the field.

| Corrupted parties | Adversary | Security achievable for every function | Main result |
|---|---|---|---|
| $t < n/3$ | malicious | perfect, no hardness assumption, output guaranteed | Ben-Or, Goldwasser, Wigderson; Chaum, Crépeau, Damgård (1988) |
| $t < n/2$ | semi-honest | perfect, no hardness assumption | same papers (1988) |
| $t < n/2$ | malicious, with broadcast | statistical, output guaranteed | Rabin and Ben-Or (1989) |
| any $t < n$ | malicious | computational (needs oblivious transfer), with abort | Goldreich, Micali, Wigderson (1987) |

"Perfect" means the views in the real and ideal worlds are exactly equal, with
no assumption about what is hard to compute: such protocols stay secure against
an adversary with unlimited computing power, quantum or not. "Statistical"
allows a tiny probability of failure. "Computational" means the views cannot be
told apart by any efficient algorithm, assuming some problem such as the
discrete logarithm is hard. Figure 1.3 shows the same table as a line.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Three regions of the corruption threshold: below a third, perfect security; below a half, statistical security with broadcast; any number, computational security with abort" fill="currentColor" font-size="14">
<line x1="20" y1="60" x2="620" y2="60" stroke="currentColor" stroke-width="1.6"/>
<line x1="20" y1="52" x2="20" y2="68" stroke="currentColor" stroke-width="1.6"/>
<line x1="220" y1="52" x2="220" y2="68" stroke="currentColor" stroke-width="1.6"/>
<line x1="320" y1="52" x2="320" y2="68" stroke="currentColor" stroke-width="1.6"/>
<line x1="620" y1="52" x2="620" y2="68" stroke="currentColor" stroke-width="1.6"/>
<text x="20" y="40" text-anchor="start">t = 0</text>
<text x="220" y="40" text-anchor="middle">n/3</text>
<text x="320" y="40" text-anchor="middle">n/2</text>
<text x="620" y="40" text-anchor="end">n − 1</text>
<text x="320" y="20" text-anchor="middle" font-weight="bold">number of corrupted parties t</text>
<rect x="20" y="84" width="196" height="150" rx="5" fill="currentColor" opacity="0.12"/>
<text x="118" y="108" text-anchor="middle" font-weight="bold">perfect</text>
<text x="118" y="132" text-anchor="middle">no assumptions</text>
<text x="118" y="154" text-anchor="middle">output guaranteed</text>
<text x="118" y="176" text-anchor="middle">even if malicious</text>
<text x="118" y="210" text-anchor="middle" font-size="13">BGW, CCD 1988</text>
<rect x="222" y="84" width="96" height="150" rx="5" fill="currentColor" opacity="0.07"/>
<text x="270" y="108" text-anchor="middle" font-weight="bold">statistical</text>
<text x="270" y="132" text-anchor="middle">needs a</text>
<text x="270" y="154" text-anchor="middle">broadcast</text>
<text x="270" y="176" text-anchor="middle">channel</text>
<text x="270" y="210" text-anchor="middle" font-size="13">RB 1989</text>
<rect x="324" y="84" width="296" height="150" rx="5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="472" y="108" text-anchor="middle" font-weight="bold">computational, with abort</text>
<text x="472" y="132" text-anchor="middle">needs oblivious transfer</text>
<text x="472" y="154" text-anchor="middle">(a hardness assumption)</text>
<text x="472" y="176" text-anchor="middle">no fairness in general</text>
<text x="472" y="210" text-anchor="middle" font-size="13">GMW 1987, Cleve 1986</text>
</svg>
<figcaption>Figure 1.3. What can be computed securely depends on how many parties may be corrupted. Against malicious parties: below a third, every function can be computed with perfect security; below a half, with statistical security given a broadcast channel; beyond that, only with computational assumptions and with abort.</figcaption>
</figure>

Real systems pick a point on this line on purpose. The Danish sugar beet
auction of 2008 used three servers, held by the buyer, the farmers' association
and a university research group, and assumed that at most one would misbehave
and that it would only be curious: honest majority, semi-honest. Private telemetry
systems built on Prio, such as Mozilla's Firefox trials and the analytics for
Apple and Google's exposure notifications in 2020, split each report between
two servers run by different organizations, and privacy holds if either one is
honest: two parties, dishonest majority for privacy. A threshold wallet that
splits a signing key between a phone and a company's server must survive
either one being fully malicious. None of these choices is right or wrong in
itself. The question is always whether the model matches the people.

## 1.5 Ideal versus real: what "secure" means

*Level: intermediate.*

We now have the pieces for the central definition of this book. In plain words:

> A protocol is secure if whatever an adversary can learn or do by attacking
> the real protocol, it could also learn or do by attacking the ideal world,
> where Trent computes the function and the adversary can only choose the
> corrupted parties' inputs and see their outputs.

The definition never lists what the adversary must not learn. It does not say
"the adversary must not learn Alice's fortune, or its first bit, or whether it
is even". It says that the real world must be no worse than a world we already
understand, and so it covers every leak at once, including ones nobody thought
of.

### The simulator in plain words

How could anyone prove such a thing? The trick, invented for zero-knowledge
proofs by Goldwasser, Micali and Rackoff in 1985 and extended to computation by
Goldreich, Micali and Wigderson in 1987, is a **simulator**.

Think of a party's view, the record of everything it saw during the protocol.
Suppose you could write a program that, given only that party's input and its
output, produces fake views that look exactly like real ones. Then the real
view cannot have taught the party anything beyond its input and output, because
it could have produced an equally convincing view by itself, from just those
two things, without anyone else's help. A diary you could have forged contains
no information you did not already have.

So to prove a protocol private for party $P_i$, we write a simulator $S_i$ that
takes $x_i$ and $y = f(x_1, \ldots, x_n)$ and outputs a fake view, and we show
that the fake views and the real views have the same distribution. For
semi-honest parties the definition reads

$$
S_i\bigl(x_i,\, f(x_1, \ldots, x_n)\bigr) \;\equiv\; \mathrm{view}_i^{\pi}(x_1, \ldots, x_n)
\qquad \text{for all inputs } x_1, \ldots, x_n,
$$

where $\equiv$ means "identically distributed" for perfect security. For
computational security it is replaced by $\approx_c$, "no efficient algorithm
can tell them apart with more than negligible advantage", the same notion of
indistinguishability as in the security games of
[Chapter 17 of book 1](../../book/17-Defining-Security.md). The simulator must
work for every choice of inputs, and the same simulator must work whatever the
other parties' inputs were, because it is never told them.

### By hand: a secure sum among three

Here is a protocol simple enough to prove secure by hand. Three colleagues want
the total of their salaries, to compare it with the industry average, without
revealing their own. Salaries are in thousands, and all arithmetic is modulo
$M = 1000$, so that every number wraps around and a random mask hides perfectly.
The salaries are $x_1 = 30$, $x_2 = 50$, $x_3 = 20$.

<div class="mars-steps" markdown>

1. $P_1$ picks a random mask $r$ in $0, \ldots, 999$, say $r = 637$, and sends $m_1 = r + x_1 = 667$ to $P_2$.
2. $P_2$ adds its salary and sends $m_2 = m_1 + x_2 = 717$ to $P_3$.
3. $P_3$ adds its salary and sends $m_3 = m_2 + x_3 = 737$ to $P_1$.
4. $P_1$ removes the mask and announces $S = m_3 - r = 100$. The average is 33.3 thousand.

</div>

This is the **ring sum**, a protocol old enough to appear in early textbooks on
privacy-preserving data mining. Is it secure against one curious party?

**$P_2$'s view** is its salary 50, the message $m_1 = 667$ and the announced
sum 100. The simulator $S_2$, given only $x_2 = 50$ and $S = 100$, picks a
uniformly random $u$ in $0, \ldots, 999$ and outputs $(50, u, 100)$. In the real
protocol $m_1 = r + x_1 \bmod 1000$, and since $r$ is uniform, so is $m_1$,
whatever $x_1$ is: each of the 1000 values comes from exactly one $r$. So the
fake view and the real view have exactly the same distribution. $P_3$ is the
same, since $m_2 = r + x_1 + x_2$ is also uniform.

**$P_1$'s view** is its salary 30, its own mask 637, the incoming $m_3 = 737$
and the sum 100. Here $m_3$ is not random from $P_1$'s point of view, but it is
determined by things the simulator knows: $m_3 = r + S$. The simulator $S_1$,
given $x_1 = 30$ and $S = 100$, picks a random $u$ and outputs
$(30, u, u + 100, 100)$, which again matches the real distribution exactly.

All three simulators work, so the ring sum is perfectly secure against any one
semi-honest party. It leaks nothing beyond the sum. (The sum itself tells each
party the total of the other two salaries: that is the function, not the
protocol.)

### Code it: checking a simulator

With a small modulus, we can list every possible random choice and compare the
distributions exactly. The program uses $M = 11$, so each distribution has
eleven equally likely outcomes. It then tries the same test on the bit-by-bit
millionaires protocol of §1.3, and shows why no simulator can exist for it.

```python
from collections import Counter

M = 11                                     # tiny modulus, so we can list every random choice

def ring_views(x1, x2, x3, r):             # one run of the ring sum, with P1's mask r
    m1 = (r + x1) % M                      # P1 -> P2
    m2 = (m1 + x2) % M                     # P2 -> P3
    m3 = (m2 + x3) % M                     # P3 -> P1
    s = (m3 - r) % M                       # P1 removes the mask and announces the sum
    return {"P1": (x1, r, m3, s), "P2": (x2, m1, s)}

def simulate(party, own, s, u):            # sees ONLY its own input and the sum
    if party == "P1":
        return (own, u, (u + s) % M, s)
    return (own, u, s)

x = (3, 5, 2)
s = sum(x) % M
for party, own in (("P1", x[0]), ("P2", x[1])):
    real = Counter(ring_views(*x, r)[party] for r in range(M))
    fake = Counter(simulate(party, own, s, u) for u in range(M))
    print(party, "real view == simulated view:", real == fake)

def distance(p, q):                        # statistical distance of two distributions
    keys = set(p) | set(q)
    n, m = sum(p.values()), sum(q.values())
    return sum(abs(p[k] / n - q[k] / m) for k in keys) / 2

def bit_by_bit(a, b):
    said = []
    for i in (3, 2, 1, 0):
        said.append((a >> i & 1, b >> i & 1))
        if said[-1][0] != said[-1][1]:
            break
    return tuple(said)

v4, v0 = Counter([bit_by_bit(7, 4)]), Counter([bit_by_bit(7, 0)])
print("Alice's view, Bob = 4:", bit_by_bit(7, 4))
print("Alice's view, Bob = 0:", bit_by_bit(7, 0))
print("same output, distance between views:", distance(v4, v0))
```

```
P1 real view == simulated view: True
P2 real view == simulated view: True
Alice's view, Bob = 4: ((0, 0), (1, 1), (1, 0))
Alice's view, Bob = 0: ((0, 0), (1, 0))
same output, distance between views: 1.0
```

The second half is the general way to show a protocol is *not* secure. When
Alice holds 7, Bob's fortunes 4 and 0 give the same output, "Alice is at least
as rich". A simulator for Alice receives only her input and that output, so it
must produce the same distribution of fake views in both cases. But the real
views in the two cases have statistical distance 1: they never coincide. A
single distribution cannot be equal to two distributions that are completely
different, so at least one of the two real cases is far from whatever the
simulator produces. No simulator exists, and the protocol leaks. Finding two
input sets with the same output and different views is how most leaks in real
protocols are first demonstrated.

### Against a malicious adversary

For malicious parties the definition keeps the same idea and adds two things.
The corrupted parties no longer have fixed inputs or fixed behavior, so the
simulator must play the adversary's part in the ideal world: it runs the real
adversary $A$ inside itself, feeding it fake honest messages, and from what
$A$ sends it must work out which input $A$ is effectively using, then hand that
input to Trent. This step is called **extraction**, and it is why so many
protocols in this book make each party commit to its input or prove it knows
it ([Chapters 3](03-Commitments.md), [5](05-Zero-Knowledge-Proofs.md) and
[6](06-Sigma-Protocols-and-Fiat-Shamir.md)). Second, what must match is not the
adversary's view alone but the **joint** distribution of the adversary's view
and the honest parties' outputs:

$$
\bigl\{\mathrm{IDEAL}_{f,\,S}(x_1, \ldots, x_n)\bigr\}
\;\approx_c\;
\bigl\{\mathrm{REAL}_{\pi,\,A}(x_1, \ldots, x_n)\bigr\}.
$$

Including the honest outputs means the definition also covers **correctness**:
an adversary who makes the honest parties output a wrong answer has done
something it could not do with Trent, so the two sides would differ. Figure 1.4
shows the two worlds side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The real world, where parties run the protocol and an adversary controls one of them, beside the ideal world, where a trusted party computes the function and a simulator plays the adversary's part; a distinguisher sees the outputs of one world" fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">Real world: the protocol</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">Ideal world: Trent</text>
<rect x="10" y="32" width="300" height="200" rx="6" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>
<rect x="330" y="32" width="300" height="200" rx="6" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>
<rect x="30" y="60" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="82" text-anchor="middle">P1</text>
<rect x="210" y="60" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="250" y="82" text-anchor="middle">P3</text>
<rect x="110" y="160" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/>
<rect x="110" y="160" width="100" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="160" y="185" text-anchor="middle">P2 = A</text>
<line x1="110" y1="77" x2="210" y2="77" stroke="currentColor" stroke-width="1.3"/>
<line x1="80" y1="94" x2="135" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="240" y1="94" x2="185" y2="160" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="70" text-anchor="middle" font-size="13">messages</text>
<rect x="430" y="48" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="480" y="70" text-anchor="middle" font-weight="bold">Trent</text>
<rect x="345" y="120" width="70" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="380" y="142" text-anchor="middle">P1</text>
<rect x="545" y="120" width="70" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="580" y="142" text-anchor="middle">P3</text>
<rect x="420" y="170" width="120" height="44" rx="4" fill="currentColor" opacity="0.12"/>
<rect x="420" y="170" width="120" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="480" y="190" text-anchor="middle">simulator S</text>
<text x="480" y="207" text-anchor="middle" font-size="12">(runs A inside)</text>
<line x1="405" y1="120" x2="450" y2="82" stroke="currentColor" stroke-width="1.3"/>
<line x1="555" y1="120" x2="510" y2="82" stroke="currentColor" stroke-width="1.3"/>
<line x1="480" y1="170" x2="480" y2="82" stroke="currentColor" stroke-width="1.3"/>
<rect x="270" y="256" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="278" text-anchor="middle" font-weight="bold">tester D</text>
<line x1="160" y1="232" x2="280" y2="256" stroke="currentColor" stroke-width="1.2"/>
<line x1="480" y1="232" x2="360" y2="256" stroke="currentColor" stroke-width="1.2"/>
<text x="320" y="318" text-anchor="middle">D sees A's view and the honest outputs. Can it tell which world?</text>
</svg>
<figcaption>Figure 1.4. The ideal-versus-real definition. On the left, the parties run the protocol and the adversary A controls P2. On the right, Trent computes the function and a simulator, which runs A inside itself, can only choose P2's input and see P2's output. The protocol is secure if no tester can tell the two worlds apart.</figcaption>
</figure>

### What the definition buys

The single definition implies a list of properties that would otherwise have to
be stated, and proved, one by one:

- **Privacy:** the adversary learns nothing beyond the corrupted parties'
  outputs.
- **Correctness:** honest parties get the right output for the inputs used.
- **Independence of inputs:** a corrupted party cannot choose its input as a
  function of an honest party's input. In a sealed-bid auction, a protocol in
  which Alice's bid is sent first in a way Bob can test guesses against would
  let Bob bid one dollar more than Alice. In the ideal world Trent collects both
  bids before telling anyone anything, so this is impossible, and a secure
  protocol must prevent it too.
- **Output delivery and fairness,** when the ideal world promises them (§1.4).

It also explains what security does *not* promise. A corrupted party can still
lie about its input, refuse to take part and, in security with abort, stop the
honest parties from getting their output. And the output reveals what it
reveals. These are properties of the ideal world, and a secure protocol is
exactly as good as its ideal world, never better.

!!! note "Life story: the simulation paradigm"
    **Born:** 1985, in Goldwasser, Micali and Rackoff's definition of zero
    knowledge; extended to multi-party computation by Goldreich, Micali and
    Wigderson (1987), and made precise in the early 1990s by Beaver, by Micali
    and Rogaway, and by Goldwasser and Levin · **Purpose:** to define what a
    protocol protects by comparing it with an ideal world, instead of listing
    attacks · **Helped:** the security proofs of essentially every protocol in
    this book; Canetti's sequential composition theorem (2000) and universally
    composable security (2001) built on it · **Status:** the standard
    definition for secure computation, zero-knowledge proofs, and much of
    voting and anonymous credentials

## 1.6 Break it: colluders and latecomers

*Level: intermediate.*

The ring sum of §1.5 is perfectly secure against one curious party. The security
claim, as §1.4 insisted, includes a number: one. This section breaks it with
two, then breaks the obvious fix with a single party that is malicious rather
than curious, and fixes both.

### Two colluders against the ring

Add a fourth colleague, so that the ring runs $P_1 \to P_2 \to P_3 \to P_4 \to
P_1$, with salaries $x = (30, 50, 20, 40)$ and $P_1$'s mask $r = 637$:

| Message | Value |
|---|---|
| $m_1 = r + x_1$, from $P_1$ to $P_2$ | 667 |
| $m_2 = m_1 + x_2$, from $P_2$ to $P_3$ | 717 |
| $m_3 = m_2 + x_3$, from $P_3$ to $P_4$ | 737 |
| $m_4 = m_3 + x_4$, from $P_4$ to $P_1$ | 777 |
| $S = m_4 - r$ | 140 |

Now suppose $P_1$ and $P_3$ are friends who compare notes after the meeting.
$P_1$ knows the message it sent to $P_2$, 667. $P_3$ knows the message it
received from $P_2$, 717. Their difference is $717 - 667 = 50$: exactly $P_2$'s
salary. In the ideal world, $P_1$ and $P_3$ together would know only their own
salaries and the sum, so only $x_2 + x_4 = 140 - 30 - 20 = 90$. The ring sum
leaks $P_2$'s salary to its two neighbors. Each party's privacy rests on its two
neighbors not talking to each other.

### Fix it: give everyone a share

The fix is to split every salary, not just mask one. Each party $P_i$ cuts its
salary into four random **shares** that add up to it modulo 1000, keeps one,
and sends one to each other party. Then each party adds up the four shares it
holds (one from everyone, including itself) and announces that **subtotal**.
The subtotals add up to the sum of all salaries. This is **additive secret
sharing**, the subject of [Chapter 2](02-Secret-Sharing.md). By hand, with rows
for the owner of each salary and columns for who receives each share:

| | to $P_1$ | to $P_2$ | to $P_3$ | to $P_4$ | row sum mod 1000 |
|---|---|---|---|---|---|
| $P_1$, salary 30 | 412 | 903 | 255 | 460 | 30 |
| $P_2$, salary 50 | 781 | 96 | 640 | 533 | 50 |
| $P_3$, salary 20 | 158 | 334 | 709 | 819 | 20 |
| $P_4$, salary 40 | 605 | 287 | 999 | 149 | 40 |
| **subtotal announced** | **956** | **620** | **603** | **961** | **140** |

The first three numbers in each row are random; the fourth is whatever makes
the row add up to the salary. Each column sum is announced, and
$956 + 620 + 603 + 961 = 3140 \equiv 140$.

Now give $P_1$ and $P_3$ everything they see and let them try. From $P_2$ they
have the shares 781 and 640; from $P_2$'s announced subtotal 620 they can
remove their own contributions 903 and 334 and learn that
$96 + 287 \equiv 383$, a sum of $P_2$'s kept share and $P_4$'s share to $P_2$,
two numbers they have never seen. Working the same way on $P_4$'s side, every
equation they can write involves at least one share they lack, except one: the
total of $P_2$'s and $P_4$'s salaries, 90, which the ideal world gives them
anyway. Each honest party's shares to the colluders are uniformly random, and
the one share each honest party keeps is the one-time pad that hides its
salary. Unlike the ring, this protocol stays private even if all but one of the
parties collude, against semi-honest parties.

### Code it: break and fix

The program first runs the colluders' subtraction on the ring three times with
fresh masks. Then, with modulus 7 so that every random choice can be listed, it
compares the colluders' complete view in two worlds with the same sum,
$(x_2, x_4) = (2, 5)$ and $(5, 2)$. If the views have identical distributions,
the colluders cannot tell the worlds apart, which is exactly the ideal-world
guarantee.

```python
import random
from collections import Counter
from itertools import product

random.seed(1)                     # random is fine for a demo; real masks come from secrets

# Break it: P1 and P3 collude against the four-party ring.
M = 1000
x = [30, 50, 20, 40]               # salaries in thousands; P2 earns 50
for run in range(3):
    r = random.randrange(M)
    m1 = (r + x[0]) % M            # P1 -> P2, seen by P1
    m2 = (m1 + x[1]) % M           # P2 -> P3, seen by P3
    print("run", run, "colluders compute m2 - m1 =", (m2 - m1) % M)

# Fix it: additive sharing. Compare the colluders' whole view when
# (x2, x4) = (2, 5) and when (x2, x4) = (5, 2): same sum, so the
# ideal world tells them nothing that separates the two cases.
M = 7
x1, x3 = 1, 4
s1 = [3, 0, 6, (x1 - 9) % M]       # P1's shares for P1..P4 (sum to x1 mod 7)
s3 = [5, 2, 1, (x3 - 8) % M]       # P3's shares

def sharing_view(x2, x4):
    seen = Counter()
    for a, b, c, d, e, f in product(range(M), repeat=6):
        s2 = [a, (x2 - a - b - c) % M, b, c]         # P2's random shares
        s4 = [d, e, f, (x4 - d - e - f) % M]         # P4's random shares
        t2 = (s1[1] + s2[1] + s3[1] + s4[1]) % M     # subtotals P2 and P4 publish
        t4 = (s1[3] + s2[3] + s3[3] + s4[3]) % M
        seen[(s2[0], s4[0], s2[2], s4[2], t2, t4)] += 1
    return seen

def ring_view(x2, x4):
    seen = Counter()
    for r in range(M):
        m1 = (r + x1) % M
        m2 = (m1 + x2) % M
        m4 = (m2 + x3 + x4) % M
        seen[(r, m1, m2, m4)] += 1
    return seen

print("sharing: views identical?", sharing_view(2, 5) == sharing_view(5, 2))
print("ring:    views identical?", ring_view(2, 5) == ring_view(5, 2))
```

```
run 0 colluders compute m2 - m1 = 50
run 1 colluders compute m2 - m1 = 50
run 2 colluders compute m2 - m1 = 50
sharing: views identical? True
ring:    views identical? False
```

The check runs over all $7^6 = 117{,}649$ random choices of $P_2$ and $P_4$, so
"identical" here is exact, not a sampling estimate. Real systems share values
modulo $2^{64}$ or modulo a prime of 61 to 128 bits, so that the arithmetic never
wraps around by accident and fits machine words; the argument is the same.

### The latecomer: a malicious party who announces last

The sharing protocol is secure against any number of curious parties. Now let
one party be malicious instead, and look at the order in which the subtotals are
announced. Suppose $P_1$, $P_2$ and $P_3$ announce 956, 620 and 603, and $P_4$
waits. $P_4$ can now make the total anything it likes: to make the published
total 0, it announces $0 - (956 + 620 + 603) \bmod 1000 = 821$ instead of its true
961.

Is that an attack, or just $P_4$ lying about its salary, which §1.4 said every
adversary may do? It is an attack, and the ideal-versus-real definition says
why. In the ideal world $P_4$ must hand Trent its input before learning anything
about the others, so it can shift the total by a chosen amount but cannot set
the total to a chosen value. Here it set the total exactly. That is a failure of
**independence of inputs**, and an adversary who waits to see the honest
messages of a round before sending its own is called a **rushing** adversary.
The cure is to make everyone fix their announcement before anyone reveals
theirs, with a **commitment**: first each party publishes a hash of its
subtotal together with a random nonce, and only when all the hashes are in does
anyone open theirs.

```python
import hashlib, secrets

M = 1000
subtotals = {"P1": 956, "P2": 620, "P3": 603}          # announced first, as in the table
true_t4 = 961                                           # what P4 should announce

# Break it: P4 announces last and picks its number to force the result.
target = 0
forced = (target - sum(subtotals.values())) % M
print("honest total:", (sum(subtotals.values()) + true_t4) % M)
print("P4 announces", forced, "-> total", (sum(subtotals.values()) + forced) % M)

# Fix it: everyone first commits to a hash of (random nonce, subtotal), then opens.
def commit(value):
    nonce = secrets.token_hex(16)
    return hashlib.sha256((nonce + str(value)).encode()).hexdigest(), nonce

def check(digest, nonce, value):
    return hashlib.sha256((nonce + str(value)).encode()).hexdigest() == digest

c4, n4 = commit(true_t4)                                # P4 commits before seeing anything
print("P4 opens the true subtotal:", check(c4, n4, true_t4))
print("P4 tries to open the forced one:", check(c4, n4, forced))
```

```
honest total: 140
P4 announces 821 -> total 0
P4 opens the true subtotal: True
P4 tries to open the forced one: False
```

The random nonce matters. Without it, a subtotal is a number below 1000, and a
hash of it could be opened by anyone in a thousand guesses, the mistake of
§1.3 again. Why hash commitments hide and bind, and when they do not, is
[Chapter 3](03-Commitments.md).

Commitments fix the rushing attack but not the last kind of misbehavior: after
seeing all the openings, a malicious party can still refuse to open its own,
and nobody gets the total. That is Cleve's fairness limit of §1.4, met in a
protocol a few lines long. The ring, the shares, the latecomer and the refusal are a
small version of the path every protocol in this book follows: semi-honest
first, then collusion, then malicious behavior, each closed with the right
tool.

## 1.7 What "privacy" means

*Level: intermediate.*

So far "privacy" has meant one thing: the other parties learn nothing about my
input beyond the output. That is the most precise meaning, but people use the
word for several different protections, and a system can give one while
failing another completely. An end-to-end encrypted messenger hides what you
say and may reveal to its operator, every minute, whom you say it to. A
perfectly secure computation of an average hides each input and may still
reveal one person's salary. This book uses the following words, which follow
the terminology that Andreas Pfitzmann and Marit Hansen refined over the 2000s.

### Input privacy

**Input privacy** is the guarantee of §1.5: a party's input stays hidden,
except for what the output implies. It is what secure computation
([Chapters 9](09-Oblivious-Transfer-and-Garbled-Circuits.md) and
[10](10-Multi-Party-Computation-in-Practice.md)), homomorphic encryption
([Chapter 12](12-Homomorphic-Encryption.md)), private set intersection
([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)) and zero-knowledge
proofs (where the hidden input is a witness, [Chapter 5](05-Zero-Knowledge-Proofs.md))
provide.

### Output privacy

**Output privacy** asks whether the result itself is safe to release, and no
protocol can answer that, because the protocol's job is to release it. Two
small cases make the point.

```python
# Output privacy: a perfect protocol still hands out its output.

# 1. Two people learn the average of their two salaries.
ana, ben = 61, 47                          # thousands; each knows only their own
average = (ana + ben) / 2                  # what any secure protocol must reveal
print("average:", average)
print("Ana works out Ben's salary:", 2 * average - ana)

# 2. A team publishes its total salary each month, computed securely.
march = {"Ana": 61, "Ben": 47, "Chen": 55, "Dee": 52, "Eli": 58}
april = {k: v for k, v in march.items() if k != "Dee"}     # Dee has left
print("March total:", sum(march.values()), " April total:", sum(april.values()))
print("Anyone can now compute Dee's salary:", sum(march.values()) - sum(april.values()))
```

```
average: 54.0
Ana works out Ben's salary: 47.0
March total: 273  April total: 221
Anyone can now compute Dee's salary: 52
```

The second case is a **differencing attack**: each release is harmless alone,
and two releases that differ by one person give that person away. It does not
need two releases a month apart; two queries over overlapping groups do the
same thing, and statistical agencies have fought this problem since long before
modern cryptography. The real-world versions are larger. In November 2017 the
fitness app Strava published a global heat map of its users' runs and rides,
an aggregate of over a billion activities with no names attached. In January
2018 Nathan Ruser, a university student in Australia, pointed out that it
showed the outlines and patrol routes of military bases in Afghanistan, Syria
and elsewhere, where soldiers were the only people wearing fitness trackers.
Every individual record was hidden. The aggregate was the leak.

!!! note "Life story: the Strava heat map"
    **Born:** November 2017, an update of Strava's Global Heatmap built from
    about a billion uploaded activities · **Purpose:** to show athletes where
    people run and ride · **Helped:** route planning for millions of users, and,
    unintentionally, analysts: in January 2018 it was shown to outline military
    bases and patrol routes in conflict zones · **Status:** still online, with
    more controls to exclude activities; armed forces tightened their rules on
    fitness trackers and location features; the standard example of an
    aggregate that leaks

The defenses for output privacy are different in kind: limit the questions,
round or suppress small counts, or add calibrated noise so that the output
changes little whether or not any one person is included. The last is
**differential privacy**, and it is the closing chapter of the book,
[Chapter 19](19-Differential-Privacy.md).

### Anonymity and pseudonymity

**Anonymity** is about *who*, not *what*: an action cannot be tied to a person
within some group, the **anonymity set**. A vote is anonymous if it cannot be
tied to a voter among all the voters; a message is anonymous if it could have
come from any of the network's users. The size of the set matters. An
"anonymous" survey of a five-person team, with a free-text field and a
question about years of service, is not anonymous in any useful sense.
**Pseudonymity** replaces the name with a stable alias: a user handle, a key, a
cryptocurrency address. It hides the name but lets every action under the alias
be collected, which is why the ledgers of
[Chapter 18](18-Privacy-on-Ledgers.md) are a gift to analysts.

### Unlinkability

**Unlinkability** asks whether two actions can be tied to the same person,
even when neither is tied to a name. Paying a coffee shop anonymously twice
with the same card number is anonymous and linkable: the shop builds a profile
of "card 4417", which a single later slip ties to a name. Blind signatures and
anonymous credentials ([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md))
are designed for unlinkability: the bank that issues a digital coin cannot
recognize it when it is spent, and a person who proves their age to two
websites gives them nothing to match. Rotating identifiers, as in the
Bluetooth exposure-notification systems of 2020, are a cheaper way to make
observations hard to link.

### Metadata and unobservability

**Metadata** is the data about a communication rather than its content: who
talked to whom, when, for how long, from where, how much was sent. Encryption
hides content and leaves metadata in plain view, and metadata is often enough.
Michael Hayden, a former director of both the NSA and the CIA, said in a public
debate in 2014: "We kill people based on metadata." Hiding metadata takes
different tools: mixes, onion routing and cover traffic
([Chapter 15](15-Anonymous-Communication.md)), and messenger features such as
sealed sender ([Protocols, Chapter 16](../protocols/16-Signal-and-the-Double-Ratchet.md)).
The strongest form, **unobservability**, hides even whether a communication
took place.

### The words side by side

| Property | Question it answers | Typical failure | Main chapters |
|---|---|---|---|
| Input privacy | Does anyone learn my input? | a protocol that leaks partial inputs (§1.3) | 2, 9 to 12 |
| Output privacy | Does the result reveal me? | averages of two, differencing, Strava | 19 |
| Anonymity | Can an action be tied to me? | tiny anonymity sets, identifying details | 14, 15, 16 |
| Unlinkability | Can two of my actions be tied together? | stable identifiers, reused addresses | 14, 18 |
| Metadata privacy | Can anyone see whom I talk to and when? | traffic analysis of encrypted links | 15 |
| Correctness, verifiability | Is the result right, and can I check? | a tally nobody can audit | 5 to 8, 16, 17 |

The last row is not a privacy property, but it travels with them. Hiding
everything is easy: output nothing. The hard problems in this book ask for
privacy and correctness at once: a secret ballot *and* a count anyone can check,
a private transaction *and* no money created from nothing, a hidden input *and*
proof that it was valid.

## 1.8 Mars: the council votes in secret

*Level: intermediate.*

Arcadia City, the settlement on the slopes of Erebus Montes in Arcadia
Planitia, is governed by a council of seven: the mayor and the wardens of its
six districts. In the second month of a long dust season the solar farm is
producing a third of its normal power, and the council must decide whether to
lower the night temperature in the residential domes by two degrees to keep the
greenhouses warm. It is the kind of decision that makes enemies. Each warden
answers to a district that will be colder, and the council has agreed that the
tally will be published but individual votes will not.

The obvious Trent is a tally server. On Earth, there is one that would do: the
settlement's sponsor runs a voting service. But the light delay is between 3 and
22 minutes each way, the server is under another government's jurisdiction, and
the city has no way to check what it does. In the city itself, the central
computer's operators report to the mayor, who is one of the voters. So the
council does without Trent. Three **teller** machines, in three different
districts and run by different staff, play the role of the parties that hold
shares. (The full election, with thousands of voters, proofs and audits, is
[Chapter 16](16-Electronic-Voting.md); this is the small version.)

Each member writes their vote as 1 for yes or 0 for no, splits it into three
random shares that add up to the vote modulo 101, and sends one share to each
teller over an encrypted link. Each teller adds the shares it receives and,
after all three tellers have committed to their subtotals as in §1.6, announces
its subtotal. The subtotals add up to the number of yes votes. The modulus only
has to exceed the number of voters, so that the count cannot wrap around.

Here is one run, worked by hand. The mayor votes yes and sends the shares 44, 37
and 21 to tellers A, B and C: $44 + 37 + 21 = 102 \equiv 1 \pmod{101}$. Warden W1
votes no with the shares 8, 0 and 93: $8 + 0 + 93 = 101 \equiv 0$. The other five
members do the same with their own random shares (all seven rows are in the
program's output below). Teller A receives 44, 8, 36, 85, 51, 77 and 100, and
announces $401 \equiv 98 \pmod{101}$; tellers B and C announce 23 and 85. The
three subtotals give $98 + 23 + 85 = 206 \equiv 4$: four yes votes out of seven,
and the proposal passes. Teller A's seven numbers, on their own, say nothing
about who voted how. The program produces exactly this run:

```python
import random

random.seed(2077)                  # random is fine for a demo; real shares come from secrets
M = 101                            # more than the number of voters
members = ["Mayor", "W1", "W2", "W3", "W4", "W5", "W6"]
votes = [1, 0, 1, 1, 0, 1, 0]      # 1 = yes; each member knows only their own

def share(v):                      # three random numbers that add up to v mod M
    a, b = random.randrange(M), random.randrange(M)
    return [a, b, (v - a - b) % M]

tellers = [0, 0, 0]                # one teller machine in each of three districts
for name, v in zip(members, votes):
    s = share(v)
    print(f"{name:6} sends shares {s} to tellers A, B, C")
    for t in range(3):
        tellers[t] = (tellers[t] + s[t]) % M

print("subtotals announced:", tellers)
yes = sum(tellers) % M
print("yes:", yes, " no:", len(members) - yes)
```

```
Mayor  sends shares [44, 37, 21] to tellers A, B, C
W1     sends shares [8, 0, 93] to tellers A, B, C
W2     sends shares [36, 82, 85] to tellers A, B, C
W3     sends shares [85, 4, 13] to tellers A, B, C
W4     sends shares [51, 50, 0] to tellers A, B, C
W5     sends shares [77, 11, 14] to tellers A, B, C
W6     sends shares [100, 41, 61] to tellers A, B, C
subtotals announced: [98, 23, 85]
yes: 4  no: 3
```

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Seven council members each send one share of their vote to each of three teller machines; the tellers announce subtotals that add up to the tally" fill="currentColor" font-size="14">
<text x="320" y="20" text-anchor="middle" font-weight="bold">seven members, each splitting a 0 or 1 into three shares</text>
<rect x="14" y="34" width="76" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="52" y="54" text-anchor="middle" font-size="13">Mayor</text>
<rect x="102" y="34" width="76" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="54" text-anchor="middle" font-size="13">W1</text>
<rect x="190" y="34" width="76" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="228" y="54" text-anchor="middle" font-size="13">W2</text>
<rect x="278" y="34" width="76" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="316" y="54" text-anchor="middle" font-size="13">W3</text>
<rect x="366" y="34" width="76" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="404" y="54" text-anchor="middle" font-size="13">W4</text>
<rect x="454" y="34" width="76" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="492" y="54" text-anchor="middle" font-size="13">W5</text>
<rect x="542" y="34" width="76" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="54" text-anchor="middle" font-size="13">W6</text>
<line x1="52" y1="64" x2="120" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="52" y1="64" x2="320" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="52" y1="64" x2="520" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="316" y1="64" x2="120" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="316" y1="64" x2="320" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="316" y1="64" x2="520" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="580" y1="64" x2="120" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="580" y1="64" x2="320" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="580" y1="64" x2="520" y2="140" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="60" y="140" width="120" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="120" y="160" text-anchor="middle" font-weight="bold">teller A</text>
<text x="120" y="177" text-anchor="middle" font-size="13">subtotal 98</text>
<rect x="260" y="140" width="120" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="160" text-anchor="middle" font-weight="bold">teller B</text>
<text x="320" y="177" text-anchor="middle" font-size="13">subtotal 23</text>
<rect x="460" y="140" width="120" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="520" y="160" text-anchor="middle" font-weight="bold">teller C</text>
<text x="520" y="177" text-anchor="middle" font-size="13">subtotal 85</text>
<line x1="120" y1="184" x2="300" y2="216" stroke="currentColor" stroke-width="1.3"/>
<line x1="320" y1="184" x2="320" y2="216" stroke="currentColor" stroke-width="1.3"/>
<line x1="520" y1="184" x2="340" y2="216" stroke="currentColor" stroke-width="1.3"/>
<rect x="170" y="216" width="300" height="34" rx="5" fill="currentColor" opacity="0.12"/>
<text x="320" y="238" text-anchor="middle" font-weight="bold">98 + 23 + 85 ≡ 4 yes (mod 101)</text>
</svg>
<figcaption>Figure 1.5. The council's secret tally. Every member sends one share to each teller (only three members' lines are drawn). A teller holds one random-looking number per member; only the three subtotals together give the tally, and no teller or pair of tellers learns any single vote.</figcaption>
</figure>

**What it protects.** A teller sees seven numbers, each uniformly random on its
own. Any two tellers together see two of each member's three shares, and the
third share is a one-time pad over the vote, exactly as in §1.6. So the votes
stay secret as long as at least one teller is honest, against curious tellers.
If all three tellers collude, they can add up each member's shares and read
every vote; three machines in three districts is the council's choice of $n$
and $t$.

**What it does not protect,** and each gap is a pointer to a later chapter:

- **The output.** A 7 to 0 result reveals every vote. A 4 to 3 result tells each
  yes-voter that exactly three of the other six said yes. If the council wanted
  only "passed" or "failed", the tellers would have to compute a comparison on
  shares, which is the millionaires' problem again
  ([Chapters 9](09-Oblivious-Transfer-and-Garbled-Circuits.md) and
  [10](10-Multi-Party-Computation-in-Practice.md)).
- **Invalid votes.** A member who sends shares of 5 instead of 0 or 1 casts five
  yes votes, and no teller can tell: each share looks random. The ideal Trent
  would refuse any vote other than 0 or 1, so this protocol is not secure
  against a malicious member. The fix is a zero-knowledge proof, attached to the
  shares or to an encrypted ballot, that the vote is 0 or 1 without saying which
  ([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)'s OR-proof, used in
  [Chapter 16](16-Electronic-Voting.md)).
- **Coercion.** A member under pressure could show the shares they sent to a
  district boss, who could check them against the tellers. Making a vote
  impossible to prove, even willingly, is **receipt-freeness**, a voting
  requirement that [Chapter 16](16-Electronic-Voting.md) treats properly.

## 1.9 In the real world

*Level: intermediate.*

For twenty-five years after Yao's paper, secure computation was considered
beautiful and useless: the general protocols were thousands or millions of times
slower than computing in the clear. That changed in 2008, and the pace since
has been steady. The table lists a few systems that compute on secrets today,
each with the trust model it chose; the chapters tell their stories.

| Year | System | What it computes while hiding the inputs | Trust model | Chapter |
|---|---|---|---|---|
| 2008 | Danish sugar beet auction | the market price from about 1,200 farmers' bids | 3 servers, honest majority, semi-honest | 10 |
| 2015 | Boston gender pay-gap study | city-wide wage statistics from employers' payrolls | shares split between separate servers, semi-honest | 10 |
| 2016 | Zcash | that a hidden payment is valid | a one-time trusted setup ceremony | 7, 18 |
| 2019 | Google Private Join and Compute | sums over the overlap of two companies' lists | two parties, semi-honest | 11 |
| 2020 | Exposure-notification analytics | aggregate statistics from phones | two servers, at least one honest | 10, 19 |
| 2023 | Ethereum's KZG ceremony | public parameters for blob commitments | any one of over 140,000 contributions honest | 3 |
| 2024 | FROST, RFC 9591 | a signature from a threshold of key holders | dishonest majority of signers, malicious | 4 |
| 2024 | Apple Live Caller ID Lookup | a lookup whose query the server cannot read | one server, homomorphic encryption | 12 |

Two lessons run through the incidents in the later chapters. The first is that
the model is part of the product. In 2023 the security firm Verichains described
TSSHOCK, a set of attacks on widely used threshold ECDSA libraries
([Chapter 4](04-Threshold-Cryptography.md)), and Fireblocks described BitForge
on the same family. The protocols had security proofs, but the implementations
left out checks that the proofs relied on against malicious parties, and a
single malicious participant could extract the whole signing key. A protocol
proved secure against curious parties and deployed among parties who may cheat
is not secure.

The second lesson is that cryptography secures the protocol, not the
question. The Strava heat map, the average of two salaries and the 7 to 0
council vote are all failures of the ideal world itself. A team building a
privacy system has to decide what Trent should output before choosing any
protocol, and the answer is a matter of policy as much as of mathematics.

!!! note "Life story: the Danish sugar beet auction"
    **Born:** January 2008, Aarhus University's SIMAP research project with
    Danisco, the only Danish buyer of sugar beets, and DKS, the growers'
    association · **Purpose:** to reallocate the contracts to grow sugar beets
    through a double auction in which no farmer's bid, a price that reveals
    their economic position, is seen by the buyer, the association or anyone
    else · **Helped:** about 1,200 farmers took part; the three servers found
    the market clearing price in about half an hour of computation; the first
    large practical use of secure multi-party computation · **Status:** a
    landmark; the team's work led to MPC companies and to the protocols of
    [Chapter 10](10-Multi-Party-Computation-in-Practice.md)

## 1.10 A map of the book

*Level: beginner.*

The book has four parts. Each chapter starts from a problem people really had,
works the method by hand with small numbers, builds a working toy in Python,
shows how real systems broke, and ends where the idea is used today. The
vocabulary of this chapter (parties, trust models, the ideal world, the
simulator, the kinds of privacy) is used throughout, usually without being
re-explained. Figure 1.6 shows the plan.

<figure class="mars-fig">
<svg viewBox="0 0 640 376" width="640" role="img" aria-label="A map of the book: four parts, Sharing and committing (chapters 1 to 4), Proving without revealing (5 to 8), Computing on hidden data (9 to 13), Privacy for people (14 to 19)" fill="currentColor" font-size="14">
<rect x="10" y="10" width="305" height="150" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="24" y="34" text-anchor="start" font-weight="bold">Part I. Sharing and committing</text>
<line x1="24" y1="44" x2="301" y2="44" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="44" y="64" text-anchor="end" font-size="13" opacity="0.7">1</text>
<text x="54" y="64" text-anchor="start" font-size="12" font-weight="bold">Computing with secrets</text>
<text x="44" y="86" text-anchor="end" font-size="13" opacity="0.7">2</text>
<text x="54" y="86" text-anchor="start" font-size="12">Secret sharing</text>
<text x="44" y="108" text-anchor="end" font-size="13" opacity="0.7">3</text>
<text x="54" y="108" text-anchor="start" font-size="12">Commitments and coin flipping</text>
<text x="44" y="130" text-anchor="end" font-size="13" opacity="0.7">4</text>
<text x="54" y="130" text-anchor="start" font-size="12">Threshold cryptography and randomness</text>
<rect x="325" y="10" width="305" height="150" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="339" y="34" text-anchor="start" font-weight="bold">Part II. Proving without revealing</text>
<line x1="339" y1="44" x2="616" y2="44" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="359" y="64" text-anchor="end" font-size="13" opacity="0.7">5</text>
<text x="369" y="64" text-anchor="start" font-size="12">Zero-knowledge proofs</text>
<text x="359" y="86" text-anchor="end" font-size="13" opacity="0.7">6</text>
<text x="369" y="86" text-anchor="start" font-size="12">Sigma protocols and Fiat-Shamir</text>
<text x="359" y="108" text-anchor="end" font-size="13" opacity="0.7">7</text>
<text x="369" y="108" text-anchor="start" font-size="12">SNARKs</text>
<text x="359" y="130" text-anchor="end" font-size="13" opacity="0.7">8</text>
<text x="369" y="130" text-anchor="start" font-size="12">STARKs, Bulletproofs and recursion</text>
<rect x="10" y="176" width="305" height="190" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="24" y="200" text-anchor="start" font-weight="bold">Part III. Computing on hidden data</text>
<line x1="24" y1="210" x2="301" y2="210" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="44" y="230" text-anchor="end" font-size="13" opacity="0.7">9</text>
<text x="54" y="230" text-anchor="start" font-size="12">Oblivious transfer, garbled circuits</text>
<text x="44" y="252" text-anchor="end" font-size="13" opacity="0.7">10</text>
<text x="54" y="252" text-anchor="start" font-size="12">Multi-party computation in practice</text>
<text x="44" y="274" text-anchor="end" font-size="13" opacity="0.7">11</text>
<text x="54" y="274" text-anchor="start" font-size="12">Set intersection, OPRFs and PIR</text>
<text x="44" y="296" text-anchor="end" font-size="13" opacity="0.7">12</text>
<text x="54" y="296" text-anchor="start" font-size="12">Homomorphic encryption</text>
<text x="44" y="318" text-anchor="end" font-size="13" opacity="0.7">13</text>
<text x="54" y="318" text-anchor="start" font-size="12">Encrypting to names and policies</text>
<rect x="325" y="176" width="305" height="190" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="339" y="200" text-anchor="start" font-weight="bold">Part IV. Privacy for people</text>
<line x1="339" y1="210" x2="616" y2="210" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="359" y="230" text-anchor="end" font-size="13" opacity="0.7">14</text>
<text x="369" y="230" text-anchor="start" font-size="12">Blind signatures and credentials</text>
<text x="359" y="252" text-anchor="end" font-size="13" opacity="0.7">15</text>
<text x="369" y="252" text-anchor="start" font-size="12">Anonymous communication</text>
<text x="359" y="274" text-anchor="end" font-size="13" opacity="0.7">16</text>
<text x="369" y="274" text-anchor="start" font-size="12">Electronic voting</text>
<text x="359" y="296" text-anchor="end" font-size="13" opacity="0.7">17</text>
<text x="369" y="296" text-anchor="start" font-size="12">Consensus and smart contracts</text>
<text x="359" y="318" text-anchor="end" font-size="13" opacity="0.7">18</text>
<text x="369" y="318" text-anchor="start" font-size="12">Privacy on ledgers</text>
<text x="359" y="340" text-anchor="end" font-size="13" opacity="0.7">19</text>
<text x="369" y="340" text-anchor="start" font-size="12">Differential privacy</text>
</svg>
<figcaption>Figure 1.6. The four parts of the book. Part I builds the basic tools for not trusting any one party; Part II proves statements without revealing why they hold; Part III computes on data nobody may see; Part IV protects people: who they are, whom they talk to, how they vote and pay, and what statistics about them reveal.</figcaption>
</figure>

**Part I. Sharing and committing.** The basic tools for removing a single point
of trust.

- [Chapter 1](01-Computing-With-Secrets.md), this chapter: the problem, the
  trust models, the ideal world and the simulator.
- [Chapter 2](02-Secret-Sharing.md), secret sharing: splitting a key so that no
  small group can use it, from additive sharing to Shamir's polynomials and
  verifiable sharing. Mars: the city's master key and its six wardens.
- [Chapter 3](03-Commitments.md), commitments and coin flipping: sealing a
  choice now and opening it later, Merkle trees, polynomial commitments and the
  trusted-setup ceremonies. Mars: a fair coin flip with Earth.
- [Chapter 4](04-Threshold-Cryptography.md), threshold cryptography and shared
  randomness: signing and decrypting with no single key holder, FROST, the
  failures of threshold ECDSA, and randomness beacons. Mars: the housing lottery.

**Part II. Proving without revealing.** Zero knowledge, from the first
interactive proofs to the short proofs that check blockchains.

- [Chapter 5](05-Zero-Knowledge-Proofs.md), zero-knowledge proofs: completeness,
  soundness and the simulator, with graph isomorphism coded in full.
- [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md), sigma protocols and
  Fiat-Shamir: Schnorr's protocol, extractors, AND and OR proofs, and how weak
  hashing broke real systems. Mars: an airlock badge that names nobody.
- [Chapter 7](07-SNARKs.md), SNARKs: turning a program into polynomials,
  Groth16 and PLONK in outline, and the Zcash counterfeiting flaw.
- [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md), STARKs, Bulletproofs and
  recursion: proofs with no trusted setup, and proofs that check proofs.

**Part III. Computing on hidden data.** The general tools for secure
computation, and the special-purpose ones that are fast enough to deploy.

- [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md), oblivious transfer
  and garbled circuits: the two building blocks of two-party computation, and
  the millionaires solved.
- [Chapter 10](10-Multi-Party-Computation-in-Practice.md), multi-party
  computation in practice: BGW, Beaver triples, SPDZ, the auctions and studies
  that use them, and trusted hardware as the shortcut. Mars: clinics on Mars and
  Earth pooling children's health data.
- [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md), private set
  intersection, oblivious PRFs and private information retrieval: password
  breach checks, contact discovery and private lookups.
- [Chapter 12](12-Homomorphic-Encryption.md), homomorphic encryption: computing
  on ciphertexts, from Paillier to fully homomorphic schemes. Mars: an Earth lab
  that analyzes medical data it never sees.
- [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md),
  identity-based, attribute-based and functional encryption: encrypting to a
  name or a policy. Mars: a message for any medic on shift in District 3.

**Part IV. Privacy for people.** The systems that protect individuals:
credentials, anonymous communication, voting, ledgers and statistics.

- [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md), blind
  signatures and anonymous credentials: digital cash, Privacy Pass, group and
  ring signatures, and digital identity wallets.
- [Chapter 15](15-Anonymous-Communication.md), anonymous communication: mixes,
  onion routing, Tor and the attacks on it, and metadata in messengers.
- [Chapter 16](16-Electronic-Voting.md), electronic voting: secret ballots with
  verifiable counts, Helios, Estonia, the Swiss Post flaws. Mars: the council
  election in full.
- [Chapter 17](17-Consensus-and-Smart-Contracts.md), consensus and smart
  contracts: agreeing with strangers, from the Byzantine generals to
  proof of stake.
- [Chapter 18](18-Privacy-on-Ledgers.md), privacy on ledgers, and its limits:
  chain analysis, Monero, Zcash and Tornado Cash.
- [Chapter 19](19-Differential-Privacy.md), differential privacy and private
  statistics: output privacy made precise. Mars: the settlement's privacy
  charter.

The [Glossary](Glossary.md) collects the terms.

**How to read it.** Part I comes first for everyone, because the later parts are
built from its tools. After that, the parts can be read in any order: Part II
for zero knowledge and blockchains, Part III for computing on private data,
Part IV for the systems people use. Each chapter marks its sections beginner,
intermediate or expert. The mathematics behind the protocols, such as finite
fields, polynomials, pairings and lattices, is proved in the
[mathematics book](../mathematics/index.md), and this book links to it instead
of repeating it; the protocols that every internet user runs, such as TLS,
Signal and Bitcoin, are taken apart in the [protocols book](../protocols/index.md).

All the group-based examples in the book use small groups, for instance the
subgroup of prime order $q$ in the integers modulo a prime $p = 2q + 1$, so
that every number can be checked by hand. Real systems use groups of about 256
bits, usually elliptic curves, and all the code here is for learning, never
for protecting anything. Where the examples need randomness, they use Python's
`random` module with a fixed seed so that the printed output can be quoted;
real keys and shares must come from the `secrets` module or the operating
system's generator.

## 1.11 Going deeper

*Level: expert.*

**Why the joint distribution matters.** For a deterministic function, it is
enough to check privacy (a simulator for each corrupted party's view) and
correctness separately. For a randomized function it is not. Let $f$ give $P_1$
a random bit and $P_2$ nothing, and consider the protocol "$P_1$ picks a random
bit $b$, outputs it, and sends it to $P_2$". $P_2$'s view is a uniformly random
bit, and a simulator that receives nothing can produce a uniformly random bit,
so the views alone match. Yet $P_2$ has learned $P_1$'s output, which no
adversary learns in the ideal world. The definition catches this only because
it compares the pair (adversary's view, honest output): in the real world the
pair is $(b, b)$; in the ideal world it is $(b', b)$ for independent $b'$, a
statistical distance of $1/2$. This is why the general definition is always
stated for the joint distribution.

**Composition.** A protocol proved secure when run alone can fail when it runs
alongside others, because an adversary can carry messages between sessions.
Ran Canetti proved in 2000 that the stand-alone definition composes
**sequentially**: inside a larger protocol, a call to an ideal functionality can
be replaced by a secure subprotocol, one call at a time. This is how large
protocols are proved in practice: first in a **hybrid model** where some
subtasks are done by ideal functionalities (for example, an "OT-hybrid" model
with an oblivious-transfer box), then with each box replaced by a real protocol.
His **universal composability** framework (2001) asks for security in any
environment, with any other protocols running concurrently. The price is real:
Canetti and Fischlin (2001) showed that commitments cannot be universally
composable between two parties without some setup, and Canetti, Kushilevitz and
Lindell (2003) extended this to most two-party functions. That is one reason so
many deployed protocols assume a common reference string, a public-key
infrastructure or an honest majority.

**Why the millionaires need an assumption.** With an honest majority, BGW
computes any function with no hardness assumption. With two parties it cannot.
Eyal Kushilevitz (1989) characterized the two-party functions that can be
computed with perfect privacy against semi-honest parties, and the AND of two
bits is not among them. The millionaires' function contains AND: restrict
Alice's fortune to $\{1, 2\}$ and Bob's to $\{2, 3\}$, and $[a \ge b]$ is 1 only
for $a = 2, b = 2$, which is the AND of "$a = 2$" and "$b = 2$". So any
two-party protocol for the millionaires needs either a computational assumption
or outside help. Joe Kilian (1988) showed that oblivious transfer alone is
enough for everything; and if a dealer hands out correlated randomness before
the inputs exist (Beaver's commodity model, 1997), two parties can compute with
information-theoretic security after all. The "trusted setup" of §1.4 is
exactly what buys this.

**Fairness, revisited.** Cleve's 1986 result shows that a coin flip cannot be
made fair against a dishonest majority, and for a long time it was assumed that
no interesting function could be. In 2008 Dov Gordon, Carmit Hazay, Jonathan
Katz and Yehuda Lindell showed otherwise: some non-trivial two-party functions,
including the millionaires' comparison on a domain of polynomial size, can be
computed with complete fairness. Which functions admit fairness is still not
fully understood. In practice, protocols get around the problem with partial
fairness (gradual release of the output, bit by bit), with penalties enforced
by a ledger ([Chapter 17](17-Consensus-and-Smart-Contracts.md)), or with an
honest majority.

**Leakage, stated honestly.** Almost every practical ideal functionality outputs
more than the mathematical function. Encryption reveals lengths. Private set
intersection protocols reveal set sizes. Searchable encryption reveals which
stored records match each query, and its security theorems say "secure up to
the leakage function $\mathcal{L}$". The definition is still sound, but the
leakage has to be judged on its own: Islam, Kuzu and Kantarcioglu (2012) and
Cash, Grubbs, Perry and Ristenpart (2015) recovered queries and documents from
the access patterns such schemes were proved to leak. A proof of security is
always a proof relative to an ideal world, and a generous ideal world is a weak
proof.

**Quantum adversaries.** Information-theoretically secure protocols, such as
BGW with an honest majority and the additive sharing of §1.6, stay secure
against an adversary with a quantum computer, since they assume nothing about
what is hard to compute. Protocols built from discrete-log oblivious transfer
or pairing-based proofs do not, and need post-quantum replacements, mostly from
lattices and hash functions ([Post-quantum, Chapter 4](../post-quantum/04-A-Field-Guide-to-Hard-Problems.md)).
The proofs need care too: simulators often **rewind** the adversary, running it
again from an earlier point, and a quantum adversary's state cannot simply be
copied and rerun. John Watrous showed in 2006 how to rewind in some important
cases, and the question shapes the post-quantum proof systems of
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md).

## Check yourself

??? question "1. Fortunes are whole millions from 1 to 10. Alice has 1 million and Trent says she is at least as rich as Bob. What does she learn?"

    Bob's fortune exactly: $1 \ge b$ forces $b = 1$. The ideal world can reveal
    everything for some inputs. Secure computation only promises that a
    protocol reveals no more than Trent's answer does.

??? question "2. Why does sending the SHA-256 hash of a yes-or-no vote fail to hide it, even with a salt that is sent along?"

    The receiver can hash both possible votes with the salt and see which one
    matches. A hash hides an input only when the input is hard to guess, and a
    vote has two possible values.

??? question "3. In the masked-difference protocol of §1.3 (Alice sends a + r, Bob returns a + r − b), what function is actually computed, and who learns what?"

    It computes $a - b$ and gives it to Alice, who subtracts it from $a$ and
    learns $b$ exactly. Bob learns nothing if $r$ is uniform modulo a large $M$.
    The intended function was only the sign of $a - b$.

??? question "4. Run the bit-by-bit comparison on 4-bit fortunes a = 12 and b = 13. What does each learn, and what would the ideal world allow?"

    $12 = 1100$ and $13 = 1101$ agree in three bits, then Alice says 0 and Bob
    says 1. Each learns the other's fortune exactly. In the ideal world Alice
    (told $a < b$) would know only $b \in \{13, 14, 15\}$, and Bob only
    $a \in \{0, \ldots, 12\}$.

??? question "5. Give a setting where the semi-honest model is a reasonable assumption, and one where it is not."

    Reasonable: three regulated institutions running audited software, where the
    worry is a later breach of logs, as in the sugar beet auction. Not
    reasonable: a threshold wallet where one key holder is a phone that may be
    stolen and loaded with modified software, or any protocol among parties who
    gain from cheating and cannot be caught.

??? question "6. In the three-party ring sum, two colluding parties learn the third salary. Is the ring sum therefore insecure against two colluders?"

    No. With three parties, the sum and two salaries determine the third, so
    the ideal world gives two colluders the third salary too. The leak is in
    the function. With four parties the ring really is insecure against two
    colluders: they learn $x_2$, where the ideal world gives only $x_2 + x_4$.

??? question "7. In the four-party sharing table of §1.6, why do the colluding P1 and P3 not learn P2's kept share 96 from P2's announced subtotal 620?"

    $620 = 96 + 903 + 334 + 287$. They know 903 and 334, which they sent
    themselves, so they learn only $96 + 287 \equiv 383$. The 287 is $P_4$'s
    random share to $P_2$, which they never see, so the sum hides 96 like a
    one-time pad.

??? question "8. A council member sends shares of 5 to the tellers. Which property of the ideal-versus-real definition fails, and how is it fixed?"

    Correctness: Trent would accept only 0 or 1, so a vote counted as five yes
    votes cannot happen in the ideal world, and the real and ideal outputs
    differ. The fix is a zero-knowledge proof that the shared or encrypted value
    is 0 or 1, without revealing which (Chapters 6 and 16).

??? question "9. Why is a rushing adversary able to break independence of inputs in the subtotal protocol, and why does a commitment with a random nonce stop it?"

    It sees the honest subtotals before choosing its own, so it can set the
    total to any value. A commitment fixes each subtotal before any is
    revealed, so the last party can no longer adapt. The nonce makes the
    commitment hiding: without it, a hash of a small number can be opened by
    trying every value.

??? question "10. A protocol gives P1 a random bit and sends the same bit to P2. Show that a simulator for P2's view alone exists, and explain why the protocol is still insecure."

    P2's view is a uniform bit, which a simulator can produce from nothing. But
    jointly with P1's output, the real pair is $(b, b)$ while the ideal pair is
    $(b', b)$ with $b'$ independent: they agree with probability $1/2$, a
    statistical distance of $1/2$. The joint definition detects that P2 learned
    P1's output.

## What you learned

- Secure computation lets parties compute $f(x_1, \ldots, x_n)$ on private
  inputs so that each learns only the output. Yao posed it with two millionaires
  in 1982, and GMW (1987) showed it is possible for any function.
- The ideal world, a trusted party computing $f$, defines the target. A leak is
  anything a party learns beyond what it would learn there, and it can be
  measured, as the bit-by-bit and hash protocols showed.
- Threats are described by trust models: semi-honest or malicious (or covert)
  parties, a threshold of colluders, static or adaptive corruption, channels,
  and any trusted setup. What can be achieved, from perfect security to
  security with abort, depends on the model.
- A protocol is secure if every real attack can be matched in the ideal world.
  The proof is a simulator that produces the corrupted parties' views from
  their inputs and outputs alone; the same definition covers privacy,
  correctness and independence of inputs.
- Colluders break protocols secure against single parties (the ring sum), and
  malicious parties break protocols secure against curious ones (the rushing
  latecomer). Secret sharing and commitments fix those two.
- "Privacy" has several meanings: input privacy, output privacy, anonymity,
  unlinkability and metadata privacy, and a system can provide one while
  failing another. No protocol protects a result that itself gives people away.

**Next:** [Chapter 2](02-Secret-Sharing.md), secret sharing, the tool that
removed Trent from the council's tally, done properly: thresholds, Shamir's
polynomials, and what happens when the dealer cheats.

## Further reading

- Andrew C. Yao, "Protocols for Secure Computations", *23rd IEEE Symposium on
  Foundations of Computer Science* (FOCS 1982): the millionaires' problem.
- Andrew C. Yao, "How to Generate and Exchange Secrets", FOCS 1986.
- Adi Shamir, Ronald Rivest and Leonard Adleman, "Mental Poker", MIT technical
  report (1979), reprinted in *The Mathematical Gardner* (1981).
- Shafi Goldwasser, Silvio Micali and Charles Rackoff, "The Knowledge Complexity
  of Interactive Proof Systems", STOC 1985 (journal version *SIAM Journal on
  Computing* 18, 1989): the first simulator.
- Oded Goldreich, Silvio Micali and Avi Wigderson, "How to Play Any Mental Game",
  STOC 1987.
- Michael Ben-Or, Shafi Goldwasser and Avi Wigderson, "Completeness Theorems for
  Non-Cryptographic Fault-Tolerant Distributed Computation", STOC 1988; and
  David Chaum, Claude Crépeau and Ivan Damgård, "Multiparty Unconditionally
  Secure Protocols", STOC 1988.
- Tal Rabin and Michael Ben-Or, "Verifiable Secret Sharing and Multiparty
  Protocols with Honest Majority", STOC 1989.
- Richard Cleve, "Limits on the Security of Coin Flips when Half the Processors
  Are Faulty", STOC 1986.
- Joe Kilian, "Founding Cryptography on Oblivious Transfer", STOC 1988.
- Eyal Kushilevitz, "Privacy and Communication Complexity", FOCS 1989.
- Ran Canetti, "Security and Composition of Multiparty Cryptographic Protocols",
  *Journal of Cryptology* 13 (2000); "Universally Composable Security", FOCS 2001.
- Yonatan Aumann and Yehuda Lindell, "Security Against Covert Adversaries",
  TCC 2007.
- S. Dov Gordon, Carmit Hazay, Jonathan Katz and Yehuda Lindell, "Complete
  Fairness in Secure Two-Party Computation", STOC 2008.
- Peter Bogetoft and others, "Secure Multiparty Computation Goes Live",
  Financial Cryptography 2009: the sugar beet auction.
- Andreas Pfitzmann and Marit Hansen, "A Terminology for Talking About Privacy
  by Data Minimization: Anonymity, Unlinkability, Undetectability,
  Unobservability, Pseudonymity, and Identity Management", version 0.34 (2010).
- Oded Goldreich, *Foundations of Cryptography, Volume 2: Basic Applications*
  (Cambridge University Press, 2004), chapter 7: the definitions in full.
- Yehuda Lindell, "How to Simulate It: A Tutorial on the Simulation Proof
  Technique", in *Tutorials on the Foundations of Cryptography* (Springer, 2017).
- Ronald Cramer, Ivan Damgård and Jesper Buus Nielsen, *Secure Multiparty
  Computation and Secret Sharing* (Cambridge University Press, 2015).
- David Evans, Vladimir Kolesnikov and Mike Rosulek, *A Pragmatic Introduction
  to Secure Multi-Party Computation* (Now Publishers, 2018).
- Book 1's overview: [Chapter 23, Advanced protocols](../../book/23-Advanced-Protocols.md);
  reference page: [Multi-party computation](../../11-advanced/MPC.md).
