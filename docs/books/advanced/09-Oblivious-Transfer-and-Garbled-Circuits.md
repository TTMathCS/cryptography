# 9. Oblivious Transfer and Garbled Circuits

*Chapter 1 left Yao's two millionaires in an imaginary world, comparing their
fortunes through a perfectly honest friend. This chapter removes the friend. It
builds the two tools that make secure two-party computation real: oblivious
transfer, in which one party hands over one of two messages without knowing
which, and garbled circuits, in which a whole computation is encrypted gate by
gate so that the other party can run it without seeing a single bit along the
way. You will work oblivious transfer by hand from Diffie-Hellman, stretch 128
of them into a thousand with nothing but hashing, garble an AND gate and then a
complete comparison circuit, and finally solve a small millionaires' problem
with no trusted party at all. Then you will break the garbling twice, and
follow the tricks that shrank an AND gate from four ciphertexts to one and a
half.*

!!! abstract "In this chapter"
    **You will learn:**

    - what oblivious transfer is, in Rabin's 1981 form and in the 1-out-of-2
      form of Even, Goldreich and Lempel, and why the two are equivalent;
    - how to build oblivious transfer from Diffie-Hellman (Bellare-Micali 1989,
      Chou-Orlandi 2015), what each version assumes, and what went wrong with
      the security proof of the second;
    - why oblivious transfer alone is enough for any secure computation
      (Kilian 1988), and how OT extension (2003) made it cheap;
    - how Yao's garbled circuits work, wire label by wire label, and how they
      solve the millionaires' problem;
    - point-and-permute, free-XOR, half-gates and the 2021 three-halves scheme,
      and what each one saves;
    - what changes when a party cheats: cut-and-choose and authenticated
      garbling, in outline;
    - what secure two-party computation costs today, in gates, bytes and
      gigabits per second.

    **You need:** [Chapter 1](01-Computing-With-Secrets.md) (the ideal world,
    semi-honest and malicious parties, simulators), Diffie-Hellman
    ([Chapter 12 of book 1](../../book/12-Diffie-Hellman.md)), hash functions
    and HMAC ([Chapters 9](../../book/09-Hash-Functions.md) and
    [10 of book 1](../../book/10-Message-Authentication.md)), and XOR. Book 1's
    [Chapter 23](../../book/23-Advanced-Protocols.md) has a short version of
    this chapter in one section.

    **Levels:** §9.1 and §9.2 are for beginners, §9.3 to §9.11 are
    intermediate, §9.12 is expert.

## 9.1 The problem

*Level: beginner.*

Alice and Bob want to know which of them is richer, and neither will say how
rich they are. [Chapter 1](01-Computing-With-Secrets.md) showed what a good
answer must look like: at the end, each of them should know exactly what a
trusted friend, Trent, would have told them, and nothing more. It also showed
that the obvious protocols fail. Sending a hash leaks the fortune to anyone
who can guess it; masking with a random number hands over the difference;
comparing bit by bit gives away the leading bits. Chapter 1 ended with a
promise: there is a way, it uses two tools, and both are in this chapter.

Start with the second tool's shape, because it explains why the first one is
needed. Any computation a computer does can be written as a **Boolean
circuit**: a network of AND and XOR gates (NOT is an XOR with 1) wired from
input bits to output bits. Comparing two 2-bit numbers takes six gates;
comparing two 32-bit numbers takes a little over a hundred; one AES encryption takes
about 35,000. If Alice and Bob could evaluate such a circuit together, with
every wire value hidden from both of them, they could compute anything.

Here is the idea Andrew Yao described in talks in the mid-1980s. Alice takes
the circuit and replaces every wire's two possible values, 0 and 1, by two long
random strings, called **labels**. Only she knows which label means which bit.
For each gate she writes an encrypted table that turns labels on the input
wires into the right label on the output wire. She sends Bob all the tables,
plus the labels for her own input bits. Bob runs the circuit gate by gate,
holding one meaningless random string per wire, and at the end Alice tells him
how to read the last label as a bit. This is a **garbled circuit**.

There is a hole in the plan, and it is exactly the shape of the millionaires'
problem in miniature. Bob needs the labels for *his* input bits too. Only
Alice has them. If Bob tells Alice his bits so she can pick the labels, he has
given away his fortune. If Alice sends him both labels for each of his wires,
he can run the circuit on every possible input of his own and learn far more
than one comparison. What Bob needs is a strange kind of delivery:

> Alice holds two messages. Bob gets exactly one of them, the one he chooses.
> Alice does not learn which one he took, and Bob learns nothing about the
> other.

That is **oblivious transfer**, OT for short. It sounds like a riddle: how can
Alice send something without knowing what she sent? Yet it can be done with
the same Diffie-Hellman arithmetic that agrees on keys over the internet, and
it turns out to be one of the most powerful primitives in cryptography. With
OT and nothing else, two parties can compute any function securely. With OT
and garbled circuits, they can do it fast.

The chapter follows the order in which the pieces fit together:

- §9.2: what oblivious transfer is, its two classic forms, and why they are
  the same thing in different clothes;
- §9.3: oblivious transfer from Diffie-Hellman, by hand and in code;
- §9.4: why OT is enough for everything, and a first, slow solution to the
  millionaires that uses nothing but OT;
- §9.5: OT extension, the 2003 trick that made millions of OTs cheap;
- §9.6 and §9.7: garbled circuits, one gate and then a whole comparator,
  ending with the millionaires solved;
- §9.8: two ways the garbling breaks when it is built carelessly;
- §9.9: the tricks that made garbling small: free XOR gates, half-gates and
  three halves;
- §9.10: what changes when the parties cheat;
- §9.11 and §9.12: real costs, real systems, and the research frontier.

Everything in this chapter is two-party. Computing with three, ten or a
thousand parties, with secret sharing and Beaver triples, is
[Chapter 10](10-Multi-Party-Computation-in-Practice.md).

## 9.2 Oblivious transfer

*Level: beginner.*

### Rabin's version: a message that arrives half the time

The first oblivious transfer was a coin toss in disguise. In May 1981 Michael
Rabin, at Harvard, circulated a technical report called "How to Exchange
Secrets with Oblivious Transfer". He was working on a practical problem: two
parties who each hold a secret, such as a password or a signed promise, want
to swap them, but neither wants to hand theirs over first. Rabin's building
block was a channel with a strange property. Alice sends a message $m$ into
it. With probability exactly one half, Bob receives $m$; otherwise he receives
nothing. Bob knows which happened. Alice does not.

That last line is the whole point. If Alice knew whether the message had
arrived, the channel would be an unreliable phone line and nothing more.
Because she does not know, she cannot adapt: she must behave the same way
whether Bob has her secret or not, and that uncertainty can be used to build
fair exchanges.

Rabin built the channel from the arithmetic of his 1979 encryption scheme,
squaring modulo $n = pq$. Taking square roots modulo $n$ is as hard as
factoring $n$, but Alice, who knows $p$ and $q$, can do it easily, and every
square has four square roots. The protocol:

1. Alice picks primes $p$ and $q$ and sends $n = pq$. Her message $m$ is
   encrypted so that anyone who can factor $n$ can read it.
2. Bob picks a random $x$ and sends $a = x^2 \bmod n$.
3. Alice computes the four square roots of $a$ and sends one of them, $y$, at
   random.
4. If $y = \pm x$, Bob has learned nothing new. If $y \neq \pm x$, then
   $x^2 \equiv y^2$, so $n$ divides $(x - y)(x + y)$ without dividing either
   factor, and $\gcd(x - y, n)$ is $p$ or $q$. Bob factors $n$ and reads $m$.

**By hand.** Take $n = 21 = 3 \cdot 7$. Bob picks $x = 5$ and sends
$a = 25 \bmod 21 = 4$. The square roots of 4 modulo 21 are 2, 5, 16 and 19
(check: $16^2 = 256 = 12 \cdot 21 + 4$). Alice sends one of the four at random.
If she sends 5 or 16 ($= -5$), Bob already knew it. If she sends 2, Bob
computes $\gcd(5 - 2, 21) = 3$; if she sends 19, $\gcd(5 - 19, 21) =
\gcd(14, 21) = 7$. Either way he now has the factors. Since $a = 4$ is the same
whatever root Bob started from, Alice has no idea whether her choice helped
him. The chance that it did is exactly $2/4 = 1/2$.

!!! note "Life story: Rabin's oblivious transfer"
    **Born:** May 1981, Michael Rabin's Harvard technical report TR-81, "How to
    Exchange Secrets with Oblivious Transfer", typed and circulated but not
    formally published until the IACR archive reprinted it in 2005 ·
    **Purpose:** a message that arrives with probability one half, without the
    sender knowing whether it arrived, as a tool for exchanging secrets fairly
    · **Helped:** named the primitive and started its study; Crépeau showed in
    1987 that it is equivalent to the 1-out-of-2 form, and Kilian in 1988 that
    it is enough for all of secure computation · **Status:** historical; the
    1-out-of-2 form is the one used today, but "Rabin OT" is still the name of
    the erasure version in theory papers

### The 1-out-of-2 version: Bob chooses

Four years later Shimon Even, Oded Goldreich and Abraham Lempel, working on
fair contract signing, defined the form everyone uses now. In a
**1-out-of-2 oblivious transfer**:

- the **sender** holds two messages $m_0$ and $m_1$;
- the **receiver** holds a choice bit $c$;
- the receiver gets $m_c$ and learns nothing about $m_{1-c}$;
- the sender learns nothing about $c$.

Figure 9.1 shows both forms as ideal boxes, in the style of Chapter 1's
trusted party: each is what a perfectly honest go-between would do.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Two ideal boxes. Rabin OT: the sender puts in m, the receiver gets m or nothing with probability one half each, the sender learns nothing. 1-out-of-2 OT: the sender puts in m0 and m1, the receiver puts in a bit c and gets m sub c, the sender learns nothing." fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">Rabin OT (1981)</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">1-out-of-2 OT (1985)</text>
<rect x="20" y="44" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="66" text-anchor="middle">sender</text>
<rect x="220" y="44" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="260" y="66" text-anchor="middle">receiver</text>
<rect x="110" y="110" width="100" height="60" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="137" text-anchor="middle">ideal box</text>
<text x="160" y="157" text-anchor="middle">flips a coin</text>
<line x1="60" y1="78" x2="125" y2="108" stroke="currentColor" stroke-width="1.4"/>
<polygon points="128,110 117,108 122,101"/>
<text x="62" y="104" text-anchor="middle">m</text>
<line x1="195" y1="108" x2="258" y2="80" stroke="currentColor" stroke-width="1.4"/>
<polygon points="260,79 250,87 247,80"/>
<text x="262" y="104" text-anchor="start">m or ⊥</text>
<text x="160" y="200" text-anchor="middle">receiver gets m with probability 1/2</text>
<text x="160" y="222" text-anchor="middle">and knows whether it did</text>
<text x="160" y="244" text-anchor="middle">sender learns nothing</text>
<line x1="320" y1="40" x2="320" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
<rect x="340" y="44" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="380" y="66" text-anchor="middle">sender</text>
<rect x="540" y="44" width="80" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="580" y="66" text-anchor="middle">receiver</text>
<rect x="430" y="110" width="100" height="60" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="137" text-anchor="middle">ideal box</text>
<text x="480" y="157" text-anchor="middle">picks m_c</text>
<line x1="380" y1="78" x2="445" y2="108" stroke="currentColor" stroke-width="1.4"/>
<polygon points="448,110 437,108 442,101"/>
<text x="372" y="104" text-anchor="middle">m₀, m₁</text>
<line x1="572" y1="80" x2="518" y2="106" stroke="currentColor" stroke-width="1.4"/>
<polygon points="515,108 522,99 525,106"/>
<text x="560" y="112" text-anchor="start">c</text>
<line x1="520" y1="170" x2="590" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="593,191 582,192 584,185"/>
<text x="598" y="196" text-anchor="start">m_c</text>
<text x="480" y="222" text-anchor="middle">receiver learns nothing about m₁₋c</text>
<text x="480" y="244" text-anchor="middle">sender learns nothing about c</text>
</svg>
<figcaption>Figure 9.1. The two classic forms of oblivious transfer as ideal boxes. In Rabin's form chance decides whether the message arrives; in the 1-out-of-2 form the receiver decides which message arrives. Either can be built from the other.</figcaption>
</figure>

Even, Goldreich and Lempel built their version from any public-key encryption
in which a random-looking string can be "decrypted" by the key owner. With
RSA it goes like this. Alice, the sender, has an RSA key $(N, e)$ with secret
exponent $d$.

1. Alice sends two random numbers $x_0$ and $x_1$.
2. Bob, with choice $c$, picks a random $k$ and sends
   $v = x_c + k^e \bmod N$.
3. Alice computes $k_0 = (v - x_0)^d$ and $k_1 = (v - x_1)^d$, both modulo
   $N$. One of them is Bob's $k$; the other is a random-looking number nobody
   but Alice can compute. She sends $m_0 + k_0$ and $m_1 + k_1$.
4. Bob subtracts $k$ from the $c$-th one.

**By hand.** Use the toy key $N = 33$, $e = 3$, $d = 7$ (since
$3 \cdot 7 = 21 \equiv 1 \pmod{20}$). Alice's messages are $m_0 = 8$ and
$m_1 = 20$; she sends $x_0 = 5$ and $x_1 = 17$. Bob wants $m_1$, picks
$k = 4$, and sends $v = 17 + 4^3 = 17 + 64 \equiv 17 + 31 = 48 \equiv 15$.
Alice computes

$$
\begin{aligned}
k_0 &= (15 - 5)^7 = 10^7 \equiv 10 \pmod{33} \quad (\text{since } 10^2 = 100 \equiv 1),\\
k_1 &= (15 - 17)^7 = (-2)^7 = -128 \equiv 4 \pmod{33},
\end{aligned}
$$

and sends $8 + 10 = 18$ and $20 + 4 = 24$. Bob computes $24 - 4 = 20 = m_1$.
To read $m_0$ he would need $k_0 = 10$, which is an RSA decryption of
$15 - 5$; at real sizes he cannot compute it. And $v = 15$ is a uniformly
random number modulo 33 whichever $x$ Bob added his $k^e$ to, so Alice cannot
tell which message he wanted.

Two remarks. First, this protocol only protects a sender against a receiver
who follows the rules: a cheating Bob could pick $v$ in some cleverer way.
Second, the idea is older than either Rabin or Even, Goldreich and Lempel. In
a paper written around 1970 and published only in 1983, "Conjugate Coding",
Stephen Wiesner described a **multiplexing channel** built from polarized
photons: two messages are sent at once, and reading either one destroys the
other. That is a 1-out-of-2 transfer made of physics rather than number
theory, and the same paper planted the seed of quantum key distribution.

!!! note "Life story: 1-out-of-2 oblivious transfer"
    **Born:** 1982 to 1985, Shimon Even, Oded Goldreich and Abraham Lempel, "A
    Randomized Protocol for Signing Contracts" (CRYPTO '82;
    *Communications of the ACM*, 1985); foreshadowed by Wiesner's quantum
    "multiplexing" around 1970 · **Purpose:** let a receiver take one of two
    messages of its choice, unseen by the sender, as a step in exchanging
    signatures fairly · **Helped:** became the standard form of OT; generalized
    to 1-out-of-$n$ by Brassard, Crépeau and Robert (1986); the building block
    of GMW (1987), of Yao's protocol as implemented, of private set
    intersection and of OT-based threshold ECDSA · **Status:** current; every
    garbled-circuit system runs millions of them per second

### Why the two are the same

At first sight Rabin's OT looks weaker: the receiver does not even get to
choose. In 1987 Claude Crépeau showed that it is not weaker at all, in a short
paper called "Equivalence Between Two Flavours of Oblivious Transfers".

One direction is easy. Given a 1-out-of-2 box, Alice can make a Rabin channel
for message $m$: she flips a secret coin $s$, puts $m$ in slot $s$ and junk in
the other slot. Bob picks a slot $c$ at random. Afterwards Alice announces $s$.
Bob has $m$ exactly when $c = s$, which happens with probability one half,
and Alice never learns $c$.

The other direction is the clever one. Given only a Rabin channel, Alice sends
many random bits $r_1, \ldots, r_{3k}$ through it. Bob receives about half of
them and knows which. He then builds two sets of $k$ indices each: one, $I_c$,
made only of bits he received, and one, $I_{1-c}$, made only of bits he did
not, and sends the pair $(I_0, I_1)$ to Alice. She cannot tell which set is
which, because she does not know which bits arrived. She replies with

$$
e_0 = m_0 \oplus \bigoplus_{i \in I_0} r_i, \qquad
e_1 = m_1 \oplus \bigoplus_{i \in I_1} r_i .
$$

Bob knows every bit in $I_c$, so he can remove the mask from $e_c$. The mask
on the other message contains bits he never received, each of them a fair
coin, so it is a one-time pad. A Bob who cheats would want both sets made of
bits he received; that needs at least $2k$ received bits out of $3k$, which
becomes exponentially unlikely as $k$ grows.

**Code it.** Here is Crépeau's reduction with a simulated Rabin box. Python's
`random` module stands in for the box's coin and is seeded so that the output
below is repeatable; real protocols draw randomness from `secrets`.

```python
import random

random.seed(9)                       # random is for the demo; real protocols use secrets

def rabin_ot(bit):                   # the ideal box: delivers the bit half the time
    return bit if random.random() < 0.5 else None

def ot_from_rabin(m0, m1, c, k=20):
    # Sender: push 3k random bits through the Rabin box.
    r = [random.randrange(2) for _ in range(3 * k)]
    got = [rabin_ot(x) for x in r]             # what the receiver ends up with
    # Receiver: k indices it received, k it did not; order the two sets by c.
    known = [i for i, x in enumerate(got) if x is not None]
    unknown = [i for i, x in enumerate(got) if x is None]
    if len(known) < k or len(unknown) < k:
        return "retry"                         # rare: start again with fresh bits
    sets = [None, None]
    sets[c], sets[1 - c] = known[:k], unknown[:k]
    # Sender: mask each message with the XOR of the bits in its set.
    pad = [sum(r[i] for i in s) % 2 for s in sets]
    e0, e1 = m0 ^ pad[0], m1 ^ pad[1]
    # Receiver: knows every bit in sets[c], so it can unmask message c only.
    return (e0, e1)[c] ^ sum(got[i] for i in sets[c]) % 2

print([ot_from_rabin(m0, m1, c) for m0, m1 in [(0, 1), (1, 0)] for c in (0, 1)])
runs = [ot_from_rabin(1, 0, 1) for _ in range(10000)]
print("retries in 10,000 runs:", runs.count("retry"))
```

```
[0, 1, 1, 0]
retries in 10,000 runs: 59
```

The first line is the 1-out-of-2 behavior: with messages $(0, 1)$ the receiver
gets 0 or 1 as it chooses, and with $(1, 0)$ the reverse. The second line
counts the runs in which Bob received fewer than 20 or more than 40 of the 60
bits and had to start again: 59 in 10,000, close to the exact probability,
about 0.62%. The chance that a cheating Bob receives 40 or more bits, enough
to fill both sets with known bits, is about 0.67% at $k = 20$; real
reductions take $k$ in the hundreds, which pushes it below $2^{-40}$.

The equivalence matters because it says oblivious transfer is one thing, not
a family of tricks. A box that randomly erases messages, a box that lets you
pick one of two, a box that lets you pick one of $n$, and a noisy channel
whose noise the sender cannot see all turn out to be interchangeable, with
modest overhead. (Crépeau and Kilian showed in 1988 that even a binary
symmetric channel, a wire that flips each bit with some fixed probability,
gives oblivious transfer.) From now on, "OT" means 1-out-of-2 OT.

## 9.3 Oblivious transfer from Diffie-Hellman

*Level: intermediate.*

Rabin's protocol needs factoring and Even, Goldreich and Lempel's needs RSA.
Both are slow at real sizes and both protect the sender only against a
receiver who follows the rules. The versions used today come from
Diffie-Hellman, and they rest on one observation: in a group where discrete
logarithms are hard, a receiver can make two public keys whose product (or
ratio) is fixed, yet know the secret key of only one of them. The sender
encrypts one message to each key. The receiver can open only the one whose
secret it knows, and the two keys look exactly alike to the sender.

All the examples use the subgroup of order $q = 11$ in the integers modulo
$p = 23$, generated by $g = 4$. Its eleven elements are the squares modulo 23:
1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18. Real systems use elliptic curves or
groups of about $2^{256}$ elements (book 1,
[Chapter 15](../../book/15-Elliptic-Curves.md)); the steps are identical.

### Bellare and Micali (1989): a key pair with a fixed product

Mihir Bellare and Silvio Micali published the first Diffie-Hellman OT in
1989, in a paper on non-interactive oblivious transfer. Their protocol needs a
public group element $C$ whose discrete logarithm nobody knows. (In practice
$C$ is made by hashing a public string into the group, so that nobody could
have chosen it with a known logarithm.)

1. **Receiver**, with choice $c$: pick a secret $k$, set $PK_c = g^k$ and
   $PK_{1-c} = C / g^k$, and send $PK_0$. (The sender computes
   $PK_1 = C / PK_0$ itself, so the product is guaranteed to be $C$.)
2. **Sender:** encrypt $m_0$ to $PK_0$ and $m_1$ to $PK_1$ with hashed
   ElGamal: for each $i$ pick a fresh $r_i$ and send
   $\big(g^{r_i},\ m_i \oplus H(PK_i^{\,r_i})\big)$.
3. **Receiver:** compute $(g^{r_c})^k = PK_c^{\,r_c}$ and unmask $m_c$.

**By hand.** Let $C = 13$ (a square modulo 23, so it is in the group). The
receiver wants $m_0$ and picks $k = 7$:

$$
PK_0 = 4^7 \bmod 23 = 8, \qquad PK_1 = 13 \cdot 8^{-1} = 13 \cdot 3 = 39 \equiv 16 .
$$

(Check: $8 \cdot 16 = 128 = 5 \cdot 23 + 13$.) The sender picks $r_0 = 2$ and
$r_1 = 6$ and computes the two shared values:

$$
\begin{aligned}
g^{r_0} &= 4^2 = 16, & PK_0^{\,r_0} &= 8^2 = 64 \equiv 18,\\
g^{r_1} &= 4^6 \equiv 2, & PK_1^{\,r_1} &= 16^6 \equiv 4 .
\end{aligned}
$$

It sends $(16,\ m_0 \oplus H(18))$ and $(2,\ m_1 \oplus H(4))$. The receiver
computes $16^7 \bmod 23 = 18$ and unmasks $m_0$. To unmask $m_1$ it would need
$2^{x}$ where $x$ is the logarithm of $PK_1 = 16$; it does not know $x$,
because it made $PK_1$ as $C / g^k$ rather than as a power of $g$. If it
could find logarithms of both keys, their sum would be the logarithm of $C$.
(In a group of eleven elements the receiver could of course just try every
$x$, here $x = 2$. That is why real groups are enormous.)

**What it assumes.** The receiver's privacy is perfect: $PK_0$ is a uniformly
random group element whatever $c$ is, because $g^k$ is uniform and so is
$C / g^k$. The sender's privacy rests on the **computational Diffie-Hellman**
(CDH) assumption, that $g^{xr}$ cannot be computed from $g^x$ and $g^r$, with
the hash $H$ treated as a random function (the **random oracle model** of
[Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)). It also assumes the
setup is honest: whoever knows $\log_g C$ can read both messages. Against a
receiver who departs from the protocol the argument needs more care, since
such a receiver need not know the logarithm of either key.

### Chou and Orlandi (2015): the simplest OT

In 2015 Tung Chou and Claudio Orlandi removed the setup element by letting the
sender supply it, in a paper called "The Simplest Protocol for Oblivious
Transfer". It has three moves, and Figure 9.2 shows them with numbers.

1. **Sender:** pick a secret $a$ and send $A = g^a$.
2. **Receiver**, with choice $c$: pick a secret $b$ and send
   $B = g^b$ if $c = 0$, or $B = A \cdot g^b$ if $c = 1$.
3. **Sender:** compute $k_0 = B^a$ and $k_1 = (B / A)^a$, and send
   $e_0 = m_0 \oplus H(A, B, k_0)$ and $e_1 = m_1 \oplus H(A, B, k_1)$.
4. **Receiver:** compute $k_c = A^b$ and unmask $e_c$.

**Why it is correct.** If $c = 0$, then $k_0 = B^a = g^{ab} = A^b$. If $c = 1$,
then $B / A = g^b$, so $k_1 = (B/A)^a = g^{ab} = A^b$. Either way the receiver's
$A^b$ is the key for the message it chose. The pair $(B, B/A)$ plays the role
of Bellare and Micali's $(PK_0, PK_1)$, with their ratio fixed at $A$ instead of
their product fixed at $C$; the receiver knows the logarithm of one of them
and not of $A$.

**By hand.** The sender picks $a = 3$: $A = 4^3 = 64 \equiv 18$. The receiver
wants $m_1$ and picks $b = 5$: $g^b = 4^5 = 1024 \equiv 12$, so
$B = 18 \cdot 12 = 216 \equiv 9$. The sender needs $A^{-1}$: $18 \cdot 9 = 162
= 7 \cdot 23 + 1$, so $A^{-1} = 9$ and $B / A = 9 \cdot 9 = 81 \equiv 12$. Then

$$
k_0 = 9^3 = 729 \equiv 16, \qquad k_1 = 12^3 = 1728 \equiv 3 .
$$

The receiver computes $A^b = 18^5$: $18^2 = 324 \equiv 2$, $18^4 \equiv 4$,
$18^5 \equiv 4 \cdot 18 = 72 \equiv 3$. It holds $k_1 = 3$, the key to
$e_1$, and has no way to make $16$.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The simplest oblivious transfer with p = 23 and g = 4: the sender sends A = 18, the receiver with choice 1 sends B = 9, the sender derives keys 16 and 3 and sends two masked messages, and the receiver computes A to the b = 3 and opens the second." fill="currentColor" font-size="14">
<rect x="20" y="10" width="200" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="120" y="33" text-anchor="middle" font-weight="bold">Sender</text>
<text x="120" y="54" text-anchor="middle">m₀, m₁; secret a = 3</text>
<rect x="420" y="10" width="200" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="520" y="33" text-anchor="middle" font-weight="bold">Receiver</text>
<text x="520" y="54" text-anchor="middle">choice c = 1; secret b = 5</text>
<line x1="120" y1="66" x2="120" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="520" y1="66" x2="520" y2="310" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="120" y1="100" x2="512" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,100 512,96 512,104"/>
<text x="320" y="92" text-anchor="middle">A = 4³ mod 23 = 18</text>
<text x="520" y="132" text-anchor="middle">B = A · 4⁵ = 18 · 12 = 9</text>
<line x1="520" y1="150" x2="128" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="120,150 128,146 128,154"/>
<text x="320" y="142" text-anchor="middle">B = 9 (looks the same for c = 0 or 1)</text>
<text x="120" y="182" text-anchor="middle">k₀ = B³ = 16</text>
<text x="120" y="204" text-anchor="middle">k₁ = (B/A)³ = 12³ = 3</text>
<line x1="120" y1="236" x2="512" y2="236" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,236 512,232 512,240"/>
<text x="320" y="228" text-anchor="middle">e₀ = m₀ ⊕ H(16),  e₁ = m₁ ⊕ H(3)</text>
<text x="520" y="270" text-anchor="middle">A⁵ = 18⁵ mod 23 = 3</text>
<text x="520" y="294" text-anchor="middle">opens e₁ only</text>
</svg>
<figcaption>Figure 9.2. The simplest oblivious transfer with the numbers of the hand example (the hash also takes A and B as input; they are left out to save room). The receiver can compute only one of the two keys, and the sender cannot tell which one, because B is a uniformly random group element either way.</figcaption>
</figure>

**Why the receiver is hidden.** $B$ is $g^b$ or $A g^b$ with $b$ uniform, and
multiplying a uniform group element by a fixed $A$ gives another uniform group
element. So the sender sees the same distribution whatever $c$ is. This is
perfect privacy: it holds against a sender with unlimited computing power.

**Why the sender is protected.** To read both messages, the receiver would
need both $B^a$ and $(B/A)^a$. Their ratio is $A^a = g^{a^2}$. Computing
$g^{a^2}$ from $g^a$ alone is the "square Diffie-Hellman" problem, which is
known to be as hard as CDH. So a receiver who could open both messages could
solve CDH, provided the hash behaves like a random oracle.

**Code it.** The program runs the hand example exactly, then checks the
receiver's privacy by listing every value $B$ can take for each choice, then
runs both choices in a slightly larger toy group. It needs Python 3.8 or
later for `pow(A, -1, p)`, the modular inverse.

```python
import hashlib, random

random.seed(2015)          # random is for the demo; real keys come from secrets
p, q, g = 23, 11, 4        # the hand example; then a bigger toy group below

def H(*xs):                # hash group elements to a 16-byte pad
    return hashlib.sha256(repr(xs).encode()).digest()[:16]

def xor(x, y):
    return bytes(i ^ j for i, j in zip(x, y))

def sender_1(a):                         # move 1: A = g^a
    return pow(g, a, p)

def receiver_1(A, c, b):                 # move 2: B = g^b, or A * g^b if c = 1
    return pow(g, b, p) * (A if c else 1) % p

def sender_2(a, A, B, m0, m1):           # move 3: pads from B^a and (B/A)^a
    k0 = pow(B, a, p)
    k1 = pow(B * pow(A, -1, p) % p, a, p)
    return k0, k1, xor(m0, H(A, B, k0)), xor(m1, H(A, B, k1))

def receiver_2(A, B, b, c, e0, e1):      # the receiver can make only A^b
    kc = pow(A, b, p)
    return kc, xor((e0, e1)[c], H(A, B, kc))

m0, m1 = b"sixteen bytes #0", b"sixteen bytes #1"
A = sender_1(3)
B = receiver_1(A, 1, 5)
k0, k1, e0, e1 = sender_2(3, A, B, m0, m1)
kc, m = receiver_2(A, B, 5, 1, e0, e1)
print("A =", A, " B =", B, " k0 =", k0, " k1 =", k1, " receiver's key =", kc)
print("receiver gets:", m)

# The sender sees only B. Over all b, is B distributed the same for c = 0 and c = 1?
for c in (0, 1):
    print("c =", c, "B takes values", sorted(receiver_1(A, c, b) for b in range(q)))

p, q = 2039, 1019                         # still tiny: real systems use 256-bit curves
for c in (0, 1):
    a, b = random.randrange(1, q), random.randrange(1, q)
    A = sender_1(a)
    B = receiver_1(A, c, b)
    _, _, e0, e1 = sender_2(a, A, B, m0, m1)
    print("c =", c, "->", receiver_2(A, B, b, c, e0, e1)[1])
```

```
A = 18  B = 9  k0 = 16  k1 = 3  receiver's key = 3
receiver gets: b'sixteen bytes #1'
c = 0 B takes values [1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18]
c = 1 B takes values [1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18]
c = 0 -> b'sixteen bytes #0'
c = 1 -> b'sixteen bytes #1'
```

The two middle lines are the privacy argument in miniature: as $b$ runs over
all eleven exponents, $B$ runs over all eleven group elements, once each, for
either choice. The sender's view is the same list.

### What went wrong with the proof

Chou and Orlandi claimed more than the argument above. Their paper said the
protocol was secure in Canetti's **universal composability** (UC) framework,
the strongest standard notion ([Chapter 1](01-Computing-With-Secrets.md),
§1.11), against malicious parties, in the random oracle model. Because the
protocol is so short and fast (about three exponentiations per side, and the
sender's $A$ can be reused for a whole batch of transfers), it was widely
adopted as the "base OT" inside larger systems, and the UC claim was part of
the appeal: a UC-secure piece can be dropped into any protocol.

The claim did not survive. In 2017 Ziya Alper Genç, Vincenzo Iovino and
Alfredo Rial found a flaw in the proof for the case of a corrupted sender, and
showed that a correct proof would need groups in which a certain decisional
problem is easy, which ordinary CDH groups need not satisfy. Megha Byali,
Arpita Patra, Divya Ravi and Pratik Sarkar, and separately Jack Doerner, Yashvanth
Kondi, Eysa Lee and abhi shelat, found further gaps for a corrupted receiver:
roughly, a simulator cannot always extract which message a cheating receiver
is after, and UC proofs need that extraction. Eduard Hauck and Julian Loss
(2017) patched the proof for static corruptions under the stronger **gap
Diffie-Hellman** assumption (CDH stays hard even with an oracle that answers
decisional Diffie-Hellman questions) and gave a modified protocol that is UC
secure under plain CDH. Chou and Orlandi acknowledged the problems, and the UC
claim was withdrawn.

None of this produced a practical attack that reads both messages. What it
means is narrower and still important: the simplest OT is a good semi-honest
OT under CDH in the random oracle model, and its stronger guarantees depend
on which later analysis you rely on and which variant you implement. Two
practical lessons came with it. The receiver must check that $A$ is a valid
group element and the sender that $B$ is (on an elliptic curve, a point on
the curve and in the right subgroup), or an attacker can push the
computation into a small subgroup where logarithms are easy. And the hash
must include the transcript and, when $A$ is reused for many transfers, an
index for each one.

| | Setup | Receiver's privacy | Sender's privacy | Messages |
|---|---|---|---|---|
| Even, Goldreich, Lempel (1985) | RSA key | perfect | RSA, semi-honest receiver | 3 |
| Bellare, Micali (1989) | public $C$, unknown log | perfect | CDH, random oracle | 2 |
| Naor, Pinkas (2001) | public $C$ | perfect | CDH, random oracle | 2 |
| Chou, Orlandi (2015) | none | perfect | CDH, random oracle (semi-honest); stronger claims disputed | 3 |
| Hauck, Loss (2017) | none | perfect | CDH, random oracle, UC against static corruption | 3 |

!!! note "Life story: the simplest OT"
    **Born:** 2015, Tung Chou and Claudio Orlandi, "The Simplest Protocol for
    Oblivious Transfer" (LATINCRYPT 2015), building on Bellare and Micali
    (1989) · **Purpose:** an oblivious transfer as short as a Diffie-Hellman
    key exchange, with no setup, to serve as the base OTs of larger protocols
    · **Helped:** became a popular base OT in garbled-circuit and OT-extension
    libraries; its proof troubles (2017 onward) taught the field how hard
    UC proofs of "obviously secure" protocols can be, and led to repaired
    variants · **Status:** in use as a semi-honest base OT; UC claim
    withdrawn; Hauck-Loss and later "endemic OT" protocols (Masny and Rindal,
    2019) are the analyzed alternatives

## 9.4 Oblivious transfer is enough for everything

*Level: intermediate.*

### One OT computes one AND

Oblivious transfer looks like a delivery service, but it is really a tiny
computer. Suppose Alice holds a bit $x$ and Bob a bit $y$, and they want the
AND of the two. Alice offers the messages $(0, x)$ and Bob chooses with $y$.
If $y = 0$ he receives 0; if $y = 1$ he receives $x$. Either way he receives
$x \wedge y$, and Alice learns nothing about $y$. Bob learns $x$ only when
$y = 1$, and then $x$ is the answer anyway.

Usually neither party should see the AND in the middle of a computation, only
its effect on the final output. Alice then picks a random bit $r$ and offers
$(r, r \oplus x)$. Bob receives $r \oplus (x \wedge y)$. Now Alice holds $r$
and Bob holds $r \oplus (x \wedge y)$: two random-looking bits whose XOR is the
AND. These are XOR **shares** of the result ([Chapter 2](02-Secret-Sharing.md)),
and shares can be fed into the next gate. XOR gates need no communication
at all, since each party XORs its own shares. Repeat gate by gate and any
circuit can be computed, with one OT per AND gate (two, if both parties hold
parts of both inputs). This is the two-party version of the protocol of
Goldreich, Micali and Wigderson (1987), and it is the starting point of
[Chapter 10](10-Multi-Party-Computation-in-Practice.md).

### Kilian's theorem

GMW used OT, but also relied on other assumptions to deal with cheaters. In
1988 Joe Kilian, then a graduate student at MIT, proved the strongest possible
statement in a paper titled "Founding Cryptography on Oblivious Transfer":
given an ideal OT box, two parties can compute any function securely against
malicious parties, with no other assumption at all. Not one-way functions,
not commitments, not zero-knowledge proofs: those can all be built from OT
too. In the language of Chapter 1, OT is **complete** for secure computation.

The theorem changes how to think about the subject. Every two-party secure
computation protocol is, underneath, a way of producing and using oblivious
transfers, and the question "how fast can secure computation be" becomes
largely "how fast can we make OTs, and how few do we need". It also explains
why OT cannot come cheaply. Two parties who can do OT can agree on a secret
key (Alice offers two random strings, Bob takes one and says openly which;
the string he took is now known to both of them, and the transfer's privacy
keeps it from an eavesdropper), so OT is at least as hard as key exchange. Russell Impagliazzo and Steven Rudich
showed in 1989 that key exchange cannot be built from one-way functions alone
in the usual black-box way. So every OT protocol needs public-key
mathematics somewhere: Diffie-Hellman, RSA, lattices, or physics.

!!! note "Life story: Kilian's completeness theorem"
    **Born:** 1988, Joe Kilian, "Founding Cryptography on Oblivious Transfer"
    (STOC 1988) · **Purpose:** show that one primitive, oblivious transfer, is
    enough to compute any function securely, even against parties who cheat
    · **Helped:** made OT the central object of two-party computation;
    motivated OT from noisy channels (Crépeau and Kilian, 1988), OT
    precomputation (Beaver, 1995) and OT extension (1996, 2003); its later
    efficient form, "IPS" (Ishai, Prabhakaran and Sahai, 2008), underlies
    modern malicious-secure protocols · **Status:** a foundational theorem;
    the practical protocols of this chapter and the next are its descendants

### The millionaires with nothing but OT

For small inputs there is a direct way to use OT for the millionaires, with no
circuit at all. Let fortunes be whole millions from 0 to 15, four bits each.
Alice writes a table with one entry for every possible fortune $i$ of Bob's:
the bit $[a \ge i]$. If Bob could fetch entry $b$ and nothing else, without
Alice seeing which, he would have exactly the answer. That is a
**1-out-of-16 OT**, and Gilles Brassard, Claude Crépeau and Jean-Marc Robert
showed in 1986 how to build 1-out-of-$n$ from 1-out-of-2 (the efficient
version below is from Moni Naor and Benny Pinkas, 1999):

1. Alice picks a pair of random keys $(K_j^0, K_j^1)$ for each of the four bit
   positions $j$.
2. She masks entry $i$ with $H(K_0^{i_0}, K_1^{i_1}, K_2^{i_2}, K_3^{i_3})$, where
   $i_j$ is bit $j$ of $i$, and sends Bob the whole masked table.
3. Bob runs four 1-out-of-2 OTs, choosing with the bits of $b$, and receives
   one key from each pair.
4. He can compute the mask for entry $b$, and for no other entry, since every
   other entry needs at least one key he did not take.

**By hand, with two bits.** Fortunes 0 to 3 need four entries and two key
pairs. If Alice has 2 million, her table is $[2 \ge 0], [2 \ge 1], [2 \ge 2],
[2 \ge 3] = 1, 1, 1, 0$, masked with $H(K_0^0, K_1^0)$, $H(K_0^1, K_1^0)$,
$H(K_0^0, K_1^1)$ and $H(K_0^1, K_1^1)$. Bob has $b = 3 = 11_2$ and takes $K_0^1$
and $K_1^1$. He unmasks entry 3 and reads 0: Alice is not at least as rich.
He holds no $K_0^0$ and no $K_1^0$, so the other three entries stay masked.

```python
import hashlib, secrets

p, q, g = 2039, 1019, 4           # toy group; real systems use 256-bit curves

def H(*xs):
    return hashlib.sha256(repr(xs).encode()).digest()[:16]

def xor(x, y):
    return bytes(i ^ j for i, j in zip(x, y))

def ot(m0, m1, c):                # one 1-out-of-2 OT, both sides (simplest OT, section 9.3)
    a, b = secrets.randbelow(q - 1) + 1, secrets.randbelow(q - 1) + 1
    A = pow(g, a, p)                                   # sender
    B = pow(g, b, p) * (A if c else 1) % p             # receiver
    k0, k1 = pow(B, a, p), pow(B * pow(A, -1, p) % p, a, p)
    e0, e1 = xor(m0, H(A, B, k0)), xor(m1, H(A, B, k1))
    return xor((e0, e1)[c], H(A, B, pow(A, b, p)))     # receiver opens one

def millionaires(alice, bob, bits=4):
    # Alice: a key pair per bit position, and a table with one entry per possible b.
    K = [[secrets.token_bytes(16) for _ in (0, 1)] for _ in range(bits)]
    def pad(i):
        return H(*[K[j][i >> j & 1] for j in range(bits)])
    table = [xor(bytes([alice >= i]) + bytes(15), pad(i)) for i in range(2 ** bits)]
    # Bob: one OT per bit of his fortune; he ends with one key from each pair.
    mine = [ot(K[j][0], K[j][1], bob >> j & 1) for j in range(bits)]
    entry = xor(table[bob], H(*mine))
    return entry[0]

print("Alice 7, Bob 5: is Alice at least as rich?", millionaires(7, 5))
print("all 256 pairs right:",
      all(millionaires(a, b) == (a >= b) for a in range(16) for b in range(16)))
```

```
Alice 7, Bob 5: is Alice at least as rich? 1
all 256 pairs right: True
```

That is a real solution to Chapter 1's instance, with Alice's 7 million and
Bob's 5: Bob learns one bit, Alice learns nothing, and no Trent was involved.
(Only Bob learns the answer here; he tells Alice, and in the semi-honest model
we trust him to tell the truth.) Its weakness is the table. It has one entry
per possible value of Bob's input, so fortunes measured to the dollar, up to
a billion, would need a table of $2^{30}$ entries, sixteen gigabytes. The cost
grows exponentially with the input length, much as Yao's own 1982 protocol
did. To handle 32-bit or 64-bit inputs, the computation must be broken into
small steps that each cost a constant amount, and that means circuits. The
OTs, too, must become cheap, because a circuit with 64 input bits for Bob
needs 64 of them, and big applications need millions.

## 9.5 OT extension: millions of transfers from a few

*Level: intermediate.*

### The cost problem

Every OT in §9.3 costs a few public-key operations. On an elliptic curve a
scalar multiplication takes tens of microseconds on a modern core, so a
Diffie-Hellman OT costs very roughly a hundred microseconds of computing, and
a core can do on the order of ten thousand per second (an approximation; it
depends on the curve and the code). That is fine for an AES key's 128 bits. It
is not fine for a private set intersection over a million items, or a
machine-learning inference with millions of comparisons, or the GMW protocol
of §9.4 with one OT per AND gate.

Impagliazzo and Rudich's result says public-key operations cannot be avoided
altogether. In 1996 Donald Beaver showed something surprising: they only have
to be paid for a fixed number of times. From a small number of "real" OTs,
say $k = 128$, and a one-way function, two parties can make as many further
OTs as they like. Beaver's construction was a theoretical one, running a
pseudorandom generator inside a secure computation. In 2003 Yuval Ishai, Joe
Kilian, Kobbi Nissim and Erez Petrank found a way to do it with nothing more
than a hash per transfer. Their protocol, known by their initials as **IKNP**,
is behind almost every fast secure computation system built since.

### The IKNP trick

The trick is to run the base OTs with the roles reversed, on columns of a
matrix, and then use the matrix by rows. Call the parties as they will be in
the final OTs: the **sender** has $m$ pairs of messages $(x_i^0, x_i^1)$ and the
**receiver** has $m$ choice bits $r_1, \ldots, r_m$, collected into a column
$r$.

1. The receiver picks a random $m \times k$ bit matrix $T$. Write $t^j$ for its
   columns and $t_i$ for its rows.
2. The sender picks a random $k$-bit string $s$.
3. They run $k$ base OTs, with the *sender* choosing: in OT number $j$, the
   receiver offers the two columns $(t^j,\ t^j \oplus r)$ and the sender
   chooses with bit $s_j$. So the sender receives the column
   $q^j = t^j \oplus s_j \cdot r$.
4. Read the sender's new matrix $Q$ by rows instead. Row $i$ is
   $q_i = t_i \oplus r_i \cdot s$: equal to $t_i$ if $r_i = 0$, and to
   $t_i \oplus s$ if $r_i = 1$.
5. For each $i$, the sender sends
   $y_i^0 = x_i^0 \oplus H(i, q_i)$ and $y_i^1 = x_i^1 \oplus H(i, q_i \oplus s)$.
6. The receiver unmasks $y_i^{r_i}$ with $H(i, t_i)$.

**Why it is correct.** If $r_i = 0$, then $q_i = t_i$, and the receiver's
$H(i, t_i)$ is the mask on $x_i^0$. If $r_i = 1$, then $q_i \oplus s = t_i$,
and $H(i, t_i)$ is the mask on $x_i^1$. Either way the receiver opens exactly
the message it chose.

**Why it is private.** The sender's view consists of columns $q^j$, each of
which is either $t^j$ or $t^j \oplus r$, and $t^j$ is uniformly random, so the
columns hide $r$ completely. The receiver, to open the other message of pair
$i$, would need $H(i, t_i \oplus s)$, which means knowing $s$, the string of
choices the sender made in the base OTs. The base OTs hide $s$, and the hash
hides it a second time: the receiver sees many values $t_i$ and $t_i \oplus s$
only through $H$. For this to be sound, $H$ must be **correlation robust**:
hashing many inputs that all differ from known values by the same secret $s$
must still give random-looking outputs. A random oracle has this property, and
so, under analysis, do well-built hashes from fixed-key AES.

**By hand, with $k = 3$ and $m = 4$.** The receiver's choices are
$r = (1, 0, 1, 1)$ and the sender's string is $s = 101$. The receiver's rows
are $t_1 = 010$, $t_2 = 111$, $t_3 = 001$, $t_4 = 100$. In base OT 1 the sender
chooses $s_1 = 1$ and so receives column 1 of $T$ XORed with $r$:
$(0,1,0,1) \oplus (1,0,1,1) = (1,1,1,0)$. In base OT 2 it chooses $s_2 = 0$ and
receives column 2 unchanged, $(1,1,0,0)$. In base OT 3 it receives
$(0,1,1,0) \oplus (1,0,1,1) = (1,1,0,1)$. Reading these three columns across
gives the rows of $Q$:

$$
q_1 = 111,\quad q_2 = 111,\quad q_3 = 100,\quad q_4 = 001 .
$$

Check against the formula: $q_1 = t_1 \oplus s = 010 \oplus 101 = 111$, since
$r_1 = 1$; $q_2 = t_2 = 111$, since $r_2 = 0$. For transfer 1 the sender masks
$x_1^0$ with $H(1, 111)$ and $x_1^1$ with $H(1, 111 \oplus 101) = H(1, 010)$.
The receiver holds $t_1 = 010$, so it opens $x_1^1$, as it chose. Figure 9.3
draws the same matrices.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="IKNP with three base OTs and four extended OTs: the receiver's matrix T and choice column r, the sender's string s = 101, and the sender's matrix Q whose columns come from base OTs and whose rows are t_i or t_i XOR s." fill="currentColor" font-size="14">
<text x="120" y="22" text-anchor="middle" font-weight="bold">Receiver: T and r</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">Sender: Q (s = 101)</text>
<text x="62" y="52" text-anchor="middle" font-size="12">col 1</text>
<text x="102" y="52" text-anchor="middle" font-size="12">col 2</text>
<text x="142" y="52" text-anchor="middle" font-size="12">col 3</text>
<text x="200" y="52" text-anchor="middle" font-size="12">r</text>
<rect x="44" y="60" width="116" height="128" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="186" y="60" width="28" height="128" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="85" text-anchor="end">t₁</text><text x="62" y="85" text-anchor="middle">0</text><text x="102" y="85" text-anchor="middle">1</text><text x="142" y="85" text-anchor="middle">0</text><text x="200" y="85" text-anchor="middle">1</text>
<text x="30" y="117" text-anchor="end">t₂</text><text x="62" y="117" text-anchor="middle">1</text><text x="102" y="117" text-anchor="middle">1</text><text x="142" y="117" text-anchor="middle">1</text><text x="200" y="117" text-anchor="middle">0</text>
<text x="30" y="149" text-anchor="end">t₃</text><text x="62" y="149" text-anchor="middle">0</text><text x="102" y="149" text-anchor="middle">0</text><text x="142" y="149" text-anchor="middle">1</text><text x="200" y="149" text-anchor="middle">1</text>
<text x="30" y="181" text-anchor="end">t₄</text><text x="62" y="181" text-anchor="middle">1</text><text x="102" y="181" text-anchor="middle">0</text><text x="142" y="181" text-anchor="middle">0</text><text x="200" y="181" text-anchor="middle">1</text>
<text x="404" y="52" text-anchor="middle" font-size="12">s₁ = 1</text>
<text x="454" y="52" text-anchor="middle" font-size="12">s₂ = 0</text>
<text x="504" y="52" text-anchor="middle" font-size="12">s₃ = 1</text>
<rect x="380" y="60" width="148" height="128" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="404" y="85" text-anchor="middle">1</text><text x="454" y="85" text-anchor="middle">1</text><text x="504" y="85" text-anchor="middle">1</text><text x="536" y="85" text-anchor="start">q₁ = t₁ ⊕ s</text>
<text x="404" y="117" text-anchor="middle">1</text><text x="454" y="117" text-anchor="middle">1</text><text x="504" y="117" text-anchor="middle">1</text><text x="536" y="117" text-anchor="start">q₂ = t₂</text>
<text x="404" y="149" text-anchor="middle">1</text><text x="454" y="149" text-anchor="middle">0</text><text x="504" y="149" text-anchor="middle">0</text><text x="536" y="149" text-anchor="start">q₃ = t₃ ⊕ s</text>
<text x="404" y="181" text-anchor="middle">0</text><text x="454" y="181" text-anchor="middle">0</text><text x="504" y="181" text-anchor="middle">1</text><text x="536" y="181" text-anchor="start">q₄ = t₄ ⊕ s</text>
<line x1="230" y1="124" x2="370" y2="124" stroke="currentColor" stroke-width="1.4"/>
<polygon points="378,124 370,120 370,128"/>
<text x="300" y="110" text-anchor="middle">3 base OTs, by column:</text>
<text x="300" y="146" text-anchor="middle">offer (tʲ, tʲ ⊕ r);</text>
<text x="300" y="166" text-anchor="middle">sender picks sⱼ</text>
<text x="320" y="226" text-anchor="middle">columns: each qʲ is tʲ or tʲ ⊕ r, so the sender learns nothing about r</text>
<text x="320" y="250" text-anchor="middle">rows: qᵢ is tᵢ or tᵢ ⊕ s, so key H(i, tᵢ) opens only message rᵢ</text>
<text x="320" y="274" text-anchor="middle">k base OTs (here 3; really 128) give any number m of OTs</text>
</svg>
<figcaption>Figure 9.3. OT extension in the IKNP way, with the hand example's numbers. The base OTs move columns; the extended OTs use rows. The receiver knows every row of T, the sender knows every row of Q and the string s, and the two matrices differ exactly where r is 1.</figcaption>
</figure>

**Code it.** In a real implementation the base OTs carry short seeds rather
than whole columns: the receiver offers two 16-byte seeds per base OT,
stretches each with a pseudorandom generator into an $m$-bit column, and sends
the XOR of the two stretched columns with $r$, so that the sender can rebuild
$t^j \oplus s_j r$ from its one seed. The program does that with SHAKE-256 as
the generator, and the simplest OT of §9.3 as the base OT.

```python
import hashlib, secrets

p, q, g = 2039, 1019, 4           # toy group for the base OTs; real ones use curves
k, m = 128, 1000                  # 128 base OTs stretched into 1000 OTs

def H(*xs):
    return hashlib.sha256(repr(xs).encode()).digest()[:16]

def xor(x, y):
    return bytes(i ^ j for i, j in zip(x, y))

def G(seed):                      # a PRG: 16-byte seed -> m-bit integer
    return int.from_bytes(hashlib.shake_256(seed).digest(m // 8 + 1), "big") >> (8 - m % 8)

def ot(m0, m1, c):                # base OT: the simplest OT of section 9.3
    a, b = secrets.randbelow(q - 1) + 1, secrets.randbelow(q - 1) + 1
    A = pow(g, a, p)
    B = pow(g, b, p) * (A if c else 1) % p
    k0, k1 = pow(B, a, p), pow(B * pow(A, -1, p) % p, a, p)
    e0, e1 = xor(m0, H(A, B, k0)), xor(m1, H(A, B, k1))
    return xor((e0, e1)[c], H(A, B, pow(A, b, p)))

# The sender has m pairs of messages; the receiver has m choice bits.
X = [(secrets.token_bytes(16), secrets.token_bytes(16)) for _ in range(m)]
r = [secrets.randbelow(2) for _ in range(m)]
R = sum(bit << i for i, bit in enumerate(r))              # choice bits as one integer

# Step 1: k base OTs with the roles reversed. The sender picks s and learns one seed per pair.
s = [secrets.randbelow(2) for _ in range(k)]
seeds = [(secrets.token_bytes(16), secrets.token_bytes(16)) for _ in range(k)]
got = [ot(seeds[j][0], seeds[j][1], s[j]) for j in range(k)]

# Step 2: receiver stretches seeds into columns t_j and sends u_j = G(k0) ^ G(k1) ^ R.
t = [G(seeds[j][0]) for j in range(k)]
u = [G(seeds[j][0]) ^ G(seeds[j][1]) ^ R for j in range(k)]

# Step 3: sender gets columns q_j = t_j ^ (s_j * R), without learning R.
qcol = [G(got[j]) ^ (u[j] if s[j] else 0) for j in range(k)]

# Step 4: read the matrices by rows: q_i = t_i ^ (r_i * s), a k-bit row per OT.
S = sum(bit << j for j, bit in enumerate(s))
def row(cols, i):
    return sum((cols[j] >> i & 1) << j for j in range(k))
Y = []
for i in range(m):
    qi = row(qcol, i)
    Y.append((xor(X[i][0], H(i, qi)), xor(X[i][1], H(i, qi ^ S))))

# Step 5: receiver unmasks the chosen message of each pair with its own row t_i.
out = [xor(Y[i][r[i]], H(i, row(t, i))) for i in range(m)]
print("all", m, "chosen messages right:", all(out[i] == X[i][r[i]] for i in range(m)))
print("can the receiver open the other one? ",
      any(xor(Y[i][1 - r[i]], H(i, row(t, i))) == X[i][1 - r[i]] for i in range(m)))
print("public-key OTs used:", k, " OTs delivered:", m)
```

```
all 1000 chosen messages right: True
can the receiver open the other one?  False
public-key OTs used: 128  OTs delivered: 1000
```

Change `m` to 100000 and the public-key work stays the same: 128 base OTs.
Everything else is hashing and XOR. In a fast implementation, with fixed-key
AES as the hash and the matrix transposed with vector instructions, each extra
OT costs a few hashes and $k = 128$ bits of communication from the receiver
plus the two masked messages from the sender.

**Precomputed OT.** One more idea from Beaver (1995) completes the picture.
OTs can be run in advance on random messages and random choices, before
anybody knows their inputs, and "derandomized" later for the price of one bit
and two XORs. Suppose the sender holds random $(\rho_0, \rho_1)$ and the
receiver holds a random bit $d$ and $\rho_d$. When the real choice $c$ is
known, the receiver sends $e = c \oplus d$. The sender replies
$y_0 = m_0 \oplus \rho_e$ and $y_1 = m_1 \oplus \rho_{1 \oplus e}$. The
receiver computes $y_c \oplus \rho_d$, which is $m_c$ because $c \oplus e = d$.
Since $d$ is random, $e$ tells the sender nothing about $c$. Most systems
today produce floods of random OTs ahead of time, with OT extension, and spend
them like this.

### After IKNP

IKNP is secure against a cheating sender as it stands, but a cheating
receiver can offer inconsistent columns and learn bits of $s$. Marcel Keller,
Emmanuela Orsini and Peter Scholl (2015) added a cheap consistency check that
makes it secure against malicious receivers at almost no extra cost. Gilad
Asharov, Yehuda Lindell, Thomas Schneider and Michael Zohner (2013) trimmed
its communication. A newer family, **silent OT**, goes further: from short
correlated seeds and a coding-theory assumption (learning parity with
noise), the two parties expand millions of random OTs locally, with
communication that grows far more slowly than the number of OTs (Elette
Boyle, Geoffroy Couteau, Niv Gilboa, Yuval Ishai, Lisa Kohl and Peter Scholl,
2019). Implementations such as Ferret (Kang Yang, Chenkai Weng, Xiao Lan,
Jiang Zhang and Xiao Wang, 2020) report around 20 nanoseconds per random OT
on ordinary networks, which is tens of millions of OTs per second
(approximate; the figures depend on hardware and bandwidth). Lawrence Roy's
SoftSpokenOT (2022) stays with symmetric-key assumptions only, like IKNP, and
trades a little extra computation for several times less communication. An OT that cost a public-key operation in 1985 now costs about
as much as a few AES calls.

!!! note "Life story: OT extension"
    **Born:** 1996 in principle (Donald Beaver, "Correlated Pseudorandomness
    and the Complexity of Private Computations"); 2003 in practice (Yuval
    Ishai, Joe Kilian, Kobbi Nissim and Erez Petrank, "Extending Oblivious
    Transfers Efficiently", CRYPTO 2003) · **Purpose:** turn a fixed number of
    expensive public-key OTs into as many cheap ones as needed, using only
    hashing · **Helped:** made garbled circuits with large inputs, GMW-style
    protocols, OT-based private set intersection and SPDZ-style triple
    generation practical; the basis of every fast two-party library ·
    **Status:** current; IKNP with the 2015 consistency check, silent OT and
    SoftSpokenOT are the variants in use

## 9.6 Garbled circuits, one gate at a time

*Level: intermediate.*

### Yao's idea

Andrew Yao gave the general solution to two-party computation in a talk at the
1986 Symposium on Foundations of Computer Science, whose proceedings carry his
paper "How to Generate and Exchange Secrets". The construction now called
Yao's garbled circuit is not spelled out in that paper; it came from his
lectures, and the written descriptions came later and from others. Donald
Beaver, Silvio Micali and Phillip Rogaway gave it its name in 1990, together
with the point-and-permute trick below. A complete proof that the protocol is
secure against semi-honest parties took until Yehuda Lindell and Benny Pinkas
posted one in 2004, published in the *Journal of Cryptology* in 2009, and
Mihir Bellare, Viet Tung Hoang and Phillip Rogaway turned "garbling" into a
primitive with its own definitions in 2012. For a protocol taught in every
course on the subject, it has an unusually oral history.

The idea is easiest to see on one gate. Take an AND gate with input wires $a$
and $b$ and output wire $c$. Alice, the **garbler**, picks two random labels
for each wire, say 128-bit strings:

$$
a: A_0, A_1 \qquad b: B_0, B_1 \qquad c: C_0, C_1 ,
$$

where $A_0$ stands for "$a = 0$" and $A_1$ for "$a = 1$". Only Alice knows
which is which. Then she encrypts the gate's truth table, row by row, using
the two input labels of each row as a double key:

| $a$ | $b$ | $a \wedge b$ | garbled row |
|---|---|---|---|
| 0 | 0 | 0 | $\mathrm{Enc}_{A_0, B_0}(C_0)$ |
| 0 | 1 | 0 | $\mathrm{Enc}_{A_0, B_1}(C_0)$ |
| 1 | 0 | 0 | $\mathrm{Enc}_{A_1, B_0}(C_0)$ |
| 1 | 1 | 1 | $\mathrm{Enc}_{A_1, B_1}(C_1)$ |

She sends Bob only the last column, in a scrambled order. Bob, the
**evaluator**, holds one label for $a$ and one for $b$, and he can decrypt
exactly one row: the one encrypted under the pair he holds. What comes out is
one label for $c$, the right one, but to Bob it is another random string.
Three ciphertexts stay closed, because each needs a label he does not have.
In a circuit, $C_0$ or $C_1$ becomes a key for the next gate, and so on to the
output wire, where Alice finally says which label means 0 and which means 1.

Three properties make this work, and each needs care:

1. **Bob must know which row he decrypted correctly.** Yao's original method
   padded each plaintext with a block of zeros and shuffled the rows. Bob
   tried all four; only one gave the zero block.
2. **The row order must reveal nothing.** If the rows stayed in truth-table
   order, the position of the row Bob opened would tell him both input bits.
3. **A label must reveal nothing about its bit.** Labels are random, so they
   do, provided Bob never holds both labels of the same wire.

### Point and permute

Trying all four rows wastes work, and the zero padding doubles the size of
every row. In 1990 Beaver, Micali and Rogaway proposed a neater way. Alice
picks a random **permute bit** $\pi_w$ for each wire $w$, and attaches to each
label a one-bit **color**: the label for value $v$ gets color $v \oplus \pi_w$.
So on each wire one label is colored 0 and the other 1, but which one is
colored 0 is a coin flip that only Alice knows. She files the four rows of
each gate by the colors of the input labels: the row for input labels with
colors $(\sigma, \tau)$ goes in position $2\sigma + \tau$. Bob looks at the
colors of the two labels he holds and decrypts the one row at that position.
No trial decryption, no zero padding, and the position tells Bob nothing,
because the colors are independent of the values.

**By hand.** To see the mechanics with numbers small enough to add in your
head, use a toy in place of real encryption. Labels are two-digit numbers, a
label's color is its parity (odd is 1, even is 0), the "pad" for a pair of
labels is $H(x, y) = xy \bmod 100$, and a row is
$(\text{output label} + H) \bmod 100$. (This toy is utterly insecure; the code
below uses HMAC-SHA256.) Alice chooses

$$
\begin{aligned}
a&: A_0 = 31 \ (\text{color } 1), & A_1 &= 56 \ (\text{color } 0),\\
b&: B_0 = 74 \ (\text{color } 0), & B_1 &= 27 \ (\text{color } 1),\\
c&: C_0 = 45 \ (\text{color } 1), & C_1 &= 68 \ (\text{color } 0).
\end{aligned}
$$

So $\pi_a = 1$, $\pi_b = 0$, $\pi_c = 1$. She computes the four rows:

- $a = 0, b = 0$: colors $(1, 0)$, position 2. $H(31, 74) = 2294 \bmod 100 =
  94$; row $= 45 + 94 = 139 \equiv 39$.
- $a = 0, b = 1$: colors $(1, 1)$, position 3. $H(31, 27) = 37$; row
  $= 45 + 37 = 82$.
- $a = 1, b = 0$: colors $(0, 0)$, position 0. $H(56, 74) = 44$; row
  $= 45 + 44 = 89$.
- $a = 1, b = 1$: colors $(0, 1)$, position 1. $H(56, 27) = 12$; row
  $= 68 + 12 = 80$.

The garbled table Bob receives is $[89, 80, 39, 82]$. Now suppose Alice's bit
is 1 and Bob's is 1, so Bob holds 56 and 27. Their colors are 0 and 1, so he
opens position $2 \cdot 0 + 1 = 1$: $80 - H(56, 27) = 80 - 12 = 68$. To read
the result, Alice tells him $\pi_c = 1$; the color of 68 is 0, and
$0 \oplus 1 = 1$. The AND is 1. With Alice's bit 0 instead, Bob holds 31 and
27, colors $(1, 1)$, opens position 3: $82 - 37 = 45$, color 1, value
$1 \oplus 1 = 0$. In neither case did Bob see a value of $a$ or $b$: he saw two
numbers and a parity. Figure 9.4 lays out the whole gate.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A garbled AND gate in the toy example: two labels per wire with colors, the four rows filed by color, and the one row Bob opens with labels 56 and 27." fill="currentColor" font-size="14">
<text x="150" y="22" text-anchor="middle" font-weight="bold">Alice's secret labels</text>
<text x="40" y="54">wire a:</text><text x="120" y="54">A₀ = 31 (color 1)</text><text x="260" y="54">A₁ = 56 (color 0)</text>
<text x="40" y="82">wire b:</text><text x="120" y="82">B₀ = 74 (color 0)</text><text x="260" y="82">B₁ = 27 (color 1)</text>
<text x="40" y="110">wire c:</text><text x="120" y="110">C₀ = 45 (color 1)</text><text x="260" y="110">C₁ = 68 (color 0)</text>
<line x1="20" y1="128" x2="620" y2="128" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="54" y="152" text-anchor="middle" font-weight="bold">position</text>
<text x="200" y="152" text-anchor="middle" font-weight="bold">made from</text>
<text x="390" y="152" text-anchor="middle" font-weight="bold">row sent</text>
<text x="540" y="152" text-anchor="middle" font-weight="bold">meaning</text>
<text x="54" y="180" text-anchor="middle">0 (colors 0,0)</text><text x="200" y="180" text-anchor="middle">45 + H(56, 74)</text><text x="390" y="180" text-anchor="middle">89</text><text x="540" y="180" text-anchor="middle">1 AND 0 = 0</text>
<rect x="20" y="192" width="600" height="28" rx="4" fill="currentColor" opacity="0.12"/>
<text x="54" y="211" text-anchor="middle">1 (colors 0,1)</text><text x="200" y="211" text-anchor="middle">68 + H(56, 27)</text><text x="390" y="211" text-anchor="middle">80</text><text x="540" y="211" text-anchor="middle">1 AND 1 = 1</text>
<text x="54" y="242" text-anchor="middle">2 (colors 1,0)</text><text x="200" y="242" text-anchor="middle">45 + H(31, 74)</text><text x="390" y="242" text-anchor="middle">39</text><text x="540" y="242" text-anchor="middle">0 AND 0 = 0</text>
<text x="54" y="270" text-anchor="middle">3 (colors 1,1)</text><text x="200" y="270" text-anchor="middle">45 + H(31, 27)</text><text x="390" y="270" text-anchor="middle">82</text><text x="540" y="270" text-anchor="middle">0 AND 1 = 0</text>
<text x="320" y="294" text-anchor="middle">Bob holds 56 and 27, opens row 1 only: 80 − 12 = 68</text>
</svg>
<figcaption>Figure 9.4. A garbled AND gate with point and permute, in the toy arithmetic of the hand example (H(x, y) = xy mod 100). Bob receives only the "row sent" column. The colors of his two labels pick one row; the other three need labels he does not hold, and the row positions say nothing because the colors were assigned by coin flips.</figcaption>
</figure>

**Code it.** The same gate with real labels: 16 random bytes each, and the
pad for a row is HMAC-SHA256 keyed with the two input labels, applied to the
gate's number. (The gate number matters in a circuit: without it, two gates
fed by the same pair of labels would use the same pad.) The program builds
both versions: Yao's original, with zero padding and shuffled rows, and point
and permute, where the color is the last bit of the label.

```python
import hmac, hashlib, secrets

def E(ka, kb, gate):              # the pad for one row: HMAC-SHA256 keyed by both labels
    return hmac.new(ka + kb, gate.to_bytes(4, "big"), hashlib.sha256).digest()

def xor(x, y):
    return bytes(i ^ j for i, j in zip(x, y))

def labels():                     # two random 16-byte labels: index 0 means 0, 1 means 1
    return [secrets.token_bytes(16), secrets.token_bytes(16)]

# Version 1, Yao as first written down: 16 zero bytes mark the right row; rows shuffled.
def garble_yao(gate=1):
    A, B, C = labels(), labels(), labels()
    rows = [xor(E(A[x], B[y], gate), C[x & y] + bytes(16)) for x in (0, 1) for y in (0, 1)]
    secrets.SystemRandom().shuffle(rows)
    return A, B, C, rows

def eval_yao(rows, la, lb, gate=1):
    tries = 0
    for row in rows:              # try every row until one opens with the zero tail
        tries += 1
        out = xor(row, E(la, lb, gate))
        if out[16:] == bytes(16):
            return out[:16], tries

# Version 2, point and permute: each wire has a random permute bit; a label's last
# bit (its "color") is the value XOR that permute bit, and rows are filed by color.
def colored_labels():
    W = labels()
    pbit = secrets.randbelow(2)
    for v in (0, 1):              # force the last bit of label v to v ^ pbit
        W[v] = W[v][:15] + bytes([W[v][15] & 0xFE | (v ^ pbit)])
    return W

def color(label):
    return label[15] & 1

def garble_pp(gate=1):
    A, B, C = colored_labels(), colored_labels(), colored_labels()
    rows = [None] * 4
    for x in (0, 1):
        for y in (0, 1):
            rows[2 * color(A[x]) + color(B[y])] = xor(E(A[x], B[y], gate)[:16], C[x & y])
    return A, B, C, rows          # 16 bytes per row, no zero tail needed

def eval_pp(rows, la, lb, gate=1):  # one decryption, at the row named by the colors
    return xor(rows[2 * color(la) + color(lb)], E(la, lb, gate)[:16])

for x in (0, 1):
    for y in (0, 1):
        A, B, C, rows = garble_yao()
        out, tries = eval_yao(rows, A[x], B[y])
        A2, B2, C2, rows2 = garble_pp()
        out2 = eval_pp(rows2, A2[x], B2[y])
        print(x, "AND", y, "=", C.index(out), f"(Yao: opened at try {tries} of 4)",
              "|", C2.index(out2), "(point and permute: one decryption)")
print("table bytes: Yao", 4 * 32, "| point and permute", 4 * 16)
```

Each of the first four lines gives the right AND for both versions, and says
at which try Yao's version found the row that opens. The try counts change
from run to run, since the rows are shuffled afresh each time; on average Bob
tries 2.5 rows. The last line is
always `table bytes: Yao 128 | point and permute 64`: point and permute halves
the table, because the 16 bytes of zeros are no longer needed.

### Why Bob learns nothing from one gate

Bob's view of the gate is four 16-byte rows, two labels, and the output label
he decrypted. The two labels and the output label are uniformly random
strings. Three of the rows are encryptions under keys involving a label Bob
does not have, so with a good pseudorandom function they look random. The one
row he opens is, by construction, his own output label XORed with a pad he can
compute. And the position of that row is the pair of colors of his labels,
which are random bits independent of the values. So everything Bob sees could
have been produced by someone who knew nothing about the input values: pick
random labels, put the output label in the row at the colors' position and
random strings elsewhere. That "someone" is the **simulator** of Chapter 1,
and the same argument, applied gate by gate, proves the whole circuit secure.
Lindell and Pinkas's proof is that argument done carefully, with a hybrid
over the gates and attention to the last step, where Alice's decoding
information meets the simulated output.

!!! note "Life story: Yao's garbled circuits"
    **Born:** 1986, in Andrew Yao's lectures around his FOCS 1986 paper "How
    to Generate and Exchange Secrets"; named and given point and permute by
    Beaver, Micali and Rogaway (1990); proved secure by Lindell and Pinkas
    (posted 2004, *Journal of Cryptology* 2009) · **Purpose:** let two
    parties compute any function in a constant number of rounds, by
    encrypting a Boolean circuit so that it can be run on hidden values ·
    **Helped:** Fairplay (2004), the first working two-party system; private
    auctions, comparisons and set operations; garbled circuits inside
    zero-knowledge proofs and private machine learning · **Status:** current; the
    standard two-party protocol, with free-XOR and half-gates or three-halves
    garbling, and authenticated garbling against cheaters

## 9.7 The millionaires, solved

*Level: intermediate.*

### A comparison circuit

Now a whole circuit. Let fortunes be whole millions from 0 to 3, two bits
each: Alice's $x = x_1 x_0$ and Bob's $y = y_1 y_0$. The circuit should output
1 when $x > y$. (For "at least as rich", Chapter 1's question, swap the inputs
and negate: $[x \ge y] = 1 - [y > x]$.)

A comparator can be built like the carry chain of a subtraction, one bit at a
time from the least significant end. Let $c_i$ be "$x > y$ when you look only
at the lowest $i$ bits", with $c_0 = 0$. Moving to bit $i$, the answer changes
only if $x_i \neq y_i$, in which case it becomes $x_i$. A formula with a single
AND gate per bit does exactly that (Vladimir Kolesnikov, Ahmad-Reza Sadeghi
and Thomas Schneider, 2009):

$$
c_{i+1} = x_i \oplus \big( (x_i \oplus c_i) \wedge (y_i \oplus c_i) \big).
$$

Check the cases. If $x_i = y_i$, both brackets equal $x_i \oplus c_i$, their
AND is $x_i \oplus c_i$, and $c_{i+1} = c_i$: no change. If $x_i = 1$ and
$y_i = 0$, the brackets are $\bar c_i$ and $c_i$, whose AND is 0, so
$c_{i+1} = 1$. If $x_i = 0$ and $y_i = 1$, the AND is again 0 and
$c_{i+1} = 0$. For bit 0, with $c_0 = 0$, the formula shrinks to
$c_1 = x_0 \oplus (x_0 \wedge y_0)$, which is "$x_0 = 1$ and $y_0 = 0$".

For two bits that gives six gates, two of them AND. Number the wires: 0 and 1
are Alice's bits $x_0, x_1$; 2 and 3 are Bob's bits $y_0, y_1$; then

| Wire | Gate | Meaning |
|---|---|---|
| 4 | AND(0, 2) | $x_0 \wedge y_0$ |
| 5 | XOR(0, 4) | $c_1$ |
| 6 | XOR(1, 5) | $x_1 \oplus c_1$ |
| 7 | XOR(3, 5) | $y_1 \oplus c_1$ |
| 8 | AND(6, 7) | the bracket product |
| 9 | XOR(1, 8) | $c_2 = [x > y]$ |

**By hand, on the bits.** Alice has 2 million ($x_1 x_0 = 10$) and Bob has 1
million ($y_1 y_0 = 01$). Wire 4 $= 0 \wedge 1 = 0$; wire 5 $= 0 \oplus 0 = 0$;
wire 6 $= 1 \oplus 0 = 1$; wire 7 $= 0 \oplus 0 = 0$; wire 8 $= 1 \wedge 0 = 0$;
wire 9 $= 1 \oplus 0 = 1$. Alice is richer. In the garbled run, Bob computes
exactly this chain, but on labels: at each wire he holds a random 16-byte
string, and the bits above exist only in Alice's head. Figure 9.5 shows the
circuit with these values.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="The 2-bit greater-than circuit: inputs x0, y0, x1, y1, two AND gates and four XOR gates, with the wire values for Alice = 2 and Bob = 1, ending in output 1." fill="currentColor" font-size="14">
<text x="20" y="64">x₀ = 0</text>
<text x="20" y="114">y₀ = 1</text>
<text x="20" y="194">x₁ = 1</text>
<text x="20" y="254">y₁ = 0</text>
<rect x="110" y="68" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="145" y="90" text-anchor="middle" font-weight="bold">AND 4</text>
<rect x="220" y="40" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="62" text-anchor="middle">XOR 5</text>
<rect x="330" y="150" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="365" y="172" text-anchor="middle">XOR 6</text>
<rect x="330" y="220" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="365" y="242" text-anchor="middle">XOR 7</text>
<rect x="440" y="185" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="475" y="207" text-anchor="middle" font-weight="bold">AND 8</text>
<rect x="530" y="110" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="565" y="132" text-anchor="middle">XOR 9</text>
<line x1="70" y1="60" x2="110" y2="78" stroke="currentColor" stroke-width="1.3"/>
<line x1="70" y1="60" x2="220" y2="50" stroke="currentColor" stroke-width="1.3"/>
<line x1="70" y1="110" x2="110" y2="94" stroke="currentColor" stroke-width="1.3"/>
<line x1="180" y1="85" x2="220" y2="64" stroke="currentColor" stroke-width="1.3"/>
<text x="196" y="92">0</text>
<line x1="70" y1="190" x2="330" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="70" y1="190" x2="530" y2="120" stroke="currentColor" stroke-width="1.3"/>
<line x1="70" y1="250" x2="330" y2="244" stroke="currentColor" stroke-width="1.3"/>
<line x1="290" y1="57" x2="330" y2="174" stroke="currentColor" stroke-width="1.3"/>
<line x1="290" y1="57" x2="330" y2="230" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="112">0</text>
<line x1="400" y1="167" x2="440" y2="195" stroke="currentColor" stroke-width="1.3"/>
<text x="414" y="172">1</text>
<line x1="400" y1="237" x2="440" y2="209" stroke="currentColor" stroke-width="1.3"/>
<text x="414" y="238">0</text>
<line x1="510" y1="202" x2="530" y2="136" stroke="currentColor" stroke-width="1.3"/>
<text x="524" y="182">0</text>
<line x1="565" y1="110" x2="565" y2="84" stroke="currentColor" stroke-width="1.3"/>
<polygon points="565,78 561,86 569,86"/>
<text x="565" y="70" text-anchor="middle" font-weight="bold">x &gt; y: 1</text>
<text x="320" y="290" text-anchor="middle">Alice = 2 (x₁x₀ = 10), Bob = 1 (y₁y₀ = 01): two AND gates, four XOR gates</text>
</svg>
<figcaption>Figure 9.5. The 2-bit comparator of the code, with the wire values for Alice's 2 million and Bob's 1 million. In the garbled run Bob holds one random label on every line of this picture; the bits written beside the lines are what those labels mean, known only to Alice, and Bob learns only the final 1.</figcaption>
</figure>

### The protocol

Put the pieces together. Alice garbles; Bob evaluates.

<div class="mars-steps" markdown>

1. **Alice garbles.** She picks two colored labels for each of the ten wires
   and a garbled table of four rows for each of the six gates.
2. **Alice sends** the six tables, the labels for her own input bits (wire 0
   gets the label for $x_0$, wire 1 the label for $x_1$), and the permute bit
   of the output wire, so that Bob can read the result.
3. **Bob fetches his labels by OT.** For each of his input wires, Alice is the
   OT sender with messages (label for 0, label for 1), and Bob chooses with
   his bit. He gets one label per wire; Alice learns nothing.
4. **Bob evaluates** gate by gate, one decryption each, and reads the output
   bit from the color of the last label and the permute bit.
5. **Bob tells Alice the answer.** (Or, if Alice should learn it and Bob
   should not, Alice keeps the output decoding to herself and Bob sends her
   the final label.)

</div>

The protocol has a fixed number of rounds whatever the circuit: the OTs (two
or three messages, and they can run alongside the tables) and the answer.
This is a large practical advantage, as §9.11 shows for a link to Mars.

**Code it.** The program garbles the comparator with point and permute and
HMAC-SHA256, runs the OTs with the simplest OT of §9.3 for Bob's two input
labels, evaluates, and decodes. It prints the labels Bob holds on each wire,
then checks all sixteen pairs of 2-bit fortunes, then builds the same circuit
for four bits and settles Chapter 1's instance, Alice's 7 million against
Bob's 5.

```python
import hmac, hashlib, secrets

p, q, g = 2039, 1019, 4                   # toy OT group; real systems use 256-bit curves

def E(ka, kb, gate):
    return hmac.new(ka + kb, gate.to_bytes(4, "big"), hashlib.sha256).digest()[:16]

def H(*xs):
    return hashlib.sha256(repr(xs).encode()).digest()[:16]

def xor(x, y):
    return bytes(i ^ j for i, j in zip(x, y))

def color(label):
    return label[15] & 1

def ot(m0, m1, c):                        # the simplest OT of section 9.3, both sides
    a, b = secrets.randbelow(q - 1) + 1, secrets.randbelow(q - 1) + 1
    A = pow(g, a, p)
    B = pow(g, b, p) * (A if c else 1) % p
    k0, k1 = pow(B, a, p), pow(B * pow(A, -1, p) % p, a, p)
    e0, e1 = xor(m0, H(A, B, k0)), xor(m1, H(A, B, k1))
    return xor((e0, e1)[c], H(A, B, pow(A, b, p)))

def comparator(n):
    # Wires 0..n-1: Alice's bits x_i; n..2n-1: Bob's bits y_i (least significant first).
    # Gates (out, op, left, right) compute c_{i+1} = x_i ^ ((x_i ^ c_i) & (y_i ^ c_i)).
    gates, w = [], 2 * n
    gates += [(w, "AND", 0, n), (w + 1, "XOR", 0, w)]       # c_1 = x_0 & not y_0
    c, w = w + 1, w + 2
    for i in range(1, n):
        gates += [(w, "XOR", i, c), (w + 1, "XOR", n + i, c),
                  (w + 2, "AND", w, w + 1), (w + 3, "XOR", i, w + 2)]
        c, w = w + 3, w + 4
    return gates, w, c                    # gate list, number of wires, output wire

OPS = {"AND": lambda u, v: u & v, "XOR": lambda u, v: u ^ v}

def garble(gates, nwires):
    W, perm = [], []
    for _ in range(nwires):               # two labels per wire, colored by a permute bit
        pb, L = secrets.randbelow(2), [secrets.token_bytes(16) for _ in (0, 1)]
        W.append([L[v][:15] + bytes([L[v][15] & 0xFE | (v ^ pb)]) for v in (0, 1)])
        perm.append(pb)
    tables = {}
    for out, op, i, j in gates:
        rows = [None] * 4
        for u in (0, 1):
            for v in (0, 1):
                la, lb = W[i][u], W[j][v]
                rows[2 * color(la) + color(lb)] = xor(E(la, lb, out), W[out][OPS[op](u, v)])
        tables[out] = rows
    return W, perm, tables

def evaluate(gates, tables, labels):
    for out, op, i, j in gates:          # one row per gate; op is never used
        la, lb = labels[i], labels[j]
        labels[out] = xor(tables[out][2 * color(la) + color(lb)], E(la, lb, out))
    return labels

def millionaires(alice, bob, n=2, show=False):
    gates, nwires, outw = comparator(n)
    W, perm, tables = garble(gates, nwires)                    # Alice garbles
    labels = {i: W[i][alice >> i & 1] for i in range(n)}       # Alice sends her labels
    for i in range(n):                                         # Bob fetches his by OT
        labels[n + i] = ot(W[n + i][0], W[n + i][1], bob >> i & 1)
    labels = evaluate(gates, tables, labels)                   # Bob evaluates
    result = color(labels[outw]) ^ perm[outw]                  # Alice sent perm[outw]
    if show:
        for w in sorted(labels):
            print(f"  wire {w}: {labels[w].hex()[:12]}...  color {color(labels[w])}")
    return result

print("Alice has 2 million, Bob has 1 million. Bob sees only these labels:")
print("Is Alice richer?", millionaires(2, 1, show=True))
print("all 16 pairs of 2-bit fortunes right:",
      all(millionaires(a, b) == (a > b) for a in range(4) for b in range(4)))
print("chapter 1's 4-bit fortunes, Alice 7 and Bob 5:", millionaires(7, 5, n=4))
print("gates in the 2-bit circuit:", [op for _, op, _, _ in comparator(2)[0]])
```

The ten label lines differ on every run, since the labels are fresh random
strings each time; they look like `wire 4: ba2042742a86...  color 0`, and the
colors are a random mix of 0s and 1s. The last four lines are always:

```
Is Alice richer? 1
all 16 pairs of 2-bit fortunes right: True
chapter 1's 4-bit fortunes, Alice 7 and Bob 5: 1
gates in the 2-bit circuit: ['AND', 'XOR', 'XOR', 'XOR', 'AND', 'XOR']
```

That is the millionaires' problem solved in the real world. Bob learned one
bit, the same bit Trent would have told him. Alice learned nothing, since all
she saw was two OT runs, in which Bob's messages are uniformly random group
elements. No third party was involved, and the only assumptions are those of
the OT (CDH, with the hash modeled as a random oracle) and of the garbling
(HMAC-SHA256 behaving as a pseudorandom function).

### What exactly is proved

Lindell and Pinkas's theorem says: if the encryption is secure in a suitable
sense and the OT is secure against semi-honest parties, then Yao's protocol
securely computes any function against a **semi-honest** adversary
corrupting either party. The two halves of the proof are different in kind.

- **Corrupted Bob.** Bob's view is the garbled circuit, Alice's input labels,
  and his OT outputs. The simulator, given only Bob's input and the output
  bit, builds a *fake* garbled circuit: random labels, and every row of every
  table encrypting the same label, so that the circuit outputs the known
  answer whatever goes in. Because Bob can open only one row per gate, he
  cannot tell the fake from the real one.
- **Corrupted Alice.** Alice's view is her own garbling plus her side of the
  OTs. The OT's receiver privacy makes the second part independent of Bob's
  input, so the simulator just runs the OTs with arbitrary choices.

The theorem says nothing about a party who departs from the protocol. A
dishonest Alice could garble a different circuit, for example one that
outputs Bob's lowest bit, and Bob would evaluate it without noticing. That is
the subject of §9.10.

## 9.8 Break it: colors that tell, and labels used twice

*Level: intermediate.*

Garbled circuits are simple enough to implement in an afternoon, and that is
their danger: small slips leak everything. Here are two slips that are easy to
make, and what each one gives away.

### Break 1: the color is the value

Point and permute needs a *random* permute bit per wire. Suppose an
implementation skips it and sets $\pi_w = 0$ everywhere, so that a label's
color is simply its value. The garbled tables are still correct and the
circuit still computes the right answer. But Bob, who sees the color of every
label he holds, now reads every wire value in the circuit, including Alice's
input bits on wires 0 and 1.

The same leak appears without point and permute if the garbler forgets to
shuffle the rows: the position of the one row that decrypts properly then
tells Bob which row of the truth table he is in, and so both input bits of
every gate.

### Break 2: the same labels in two runs

Suppose Alice and Bob compare fortunes twice, perhaps because the first
session was interrupted, and Alice, to save work, reuses the labels from the
first run (or resends the same garbled circuit). In each run Bob fetches the
labels for his input bits by OT, and he is free to choose differently. If he
asks for 1 million the first time and 2 million the second, he now holds
*both* labels of both of his input wires. Neither OT was broken; each gave
him exactly what it should. But now he can evaluate the circuit on any input
of his own, against Alice's fixed input labels, and learn
$[x > y]$ for every $y$. For a comparator that reveals $x$ itself.

```python
import hmac, hashlib, secrets

def E(ka, kb, gate):
    return hmac.new(ka + kb, gate.to_bytes(4, "big"), hashlib.sha256).digest()[:16]

def xor(x, y):
    return bytes(i ^ j for i, j in zip(x, y))

def color(label):
    return label[15] & 1

# The 2-bit comparator of section 9.7: wires 0,1 = Alice's bits, 2,3 = Bob's, 9 = output.
GATES = [(4, "AND", 0, 2), (5, "XOR", 0, 4), (6, "XOR", 1, 5),
         (7, "XOR", 3, 5), (8, "AND", 6, 7), (9, "XOR", 1, 8)]
OPS = {"AND": lambda u, v: u & v, "XOR": lambda u, v: u ^ v}

def make_labels(random_permute=True):
    W, perm = [], []
    for _ in range(10):
        pb = secrets.randbelow(2) if random_permute else 0     # the mistake: pb = 0
        L = [secrets.token_bytes(16) for _ in (0, 1)]
        W.append([L[v][:15] + bytes([L[v][15] & 0xFE | (v ^ pb)]) for v in (0, 1)])
        perm.append(pb)
    return W, perm

def garble(W):
    tables = {}
    for out, op, i, j in GATES:
        rows = [None] * 4
        for u in (0, 1):
            for v in (0, 1):
                rows[2 * color(W[i][u]) + color(W[j][v])] = xor(
                    E(W[i][u], W[j][v], out), W[out][OPS[op](u, v)])
        tables[out] = rows
    return tables

def evaluate(tables, labels):
    labels = dict(labels)
    for out, op, i, j in GATES:
        la, lb = labels[i], labels[j]
        labels[out] = xor(tables[out][2 * color(la) + color(lb)], E(la, lb, out))
    return labels

alice, bob = 2, 1

# Break 1: the permute bits are left at 0, so a label's color IS its value.
W, perm = make_labels(random_permute=False)
mine = {i: W[i][alice >> i & 1] for i in (0, 1)}
mine.update({2 + i: W[2 + i][bob >> i & 1] for i in (0, 1)})     # by OT, really
seen = evaluate(garble(W), mine)
bits = [color(seen[w]) for w in range(10)]
print("Break 1: Bob reads every wire:", bits, "-> Alice's fortune is", bits[0] + 2 * bits[1])

# Break 2: Alice garbles twice with the same labels. Bob asks for 1 in run one and
# 2 in run two, so by OT he legitimately receives both labels of each of his wires.
W, perm = make_labels()
tables = garble(W)                               # the same labels in both runs
alice_labels = {i: W[i][alice >> i & 1] for i in (0, 1)}
both = {2 + i: {v: W[2 + i][v] for v in (0, 1)} for i in (0, 1)}
answers = []
for guess in range(4):                           # evaluate on every fortune of his own
    labels = dict(alice_labels)
    labels.update({2 + i: both[2 + i][guess >> i & 1] for i in (0, 1)})
    answers.append(color(evaluate(tables, labels)[9]) ^ perm[9])
print("Break 2: [Alice > y] for y = 0..3:", answers, "-> Alice's fortune is", sum(answers))
```

```
Break 1: Bob reads every wire: [0, 1, 1, 0, 0, 0, 1, 0, 0, 1] -> Alice's fortune is 2
Break 2: [Alice > y] for y = 0..3: [1, 1, 0, 0] -> Alice's fortune is 2
```

In the first break the list is the value of every wire, 0 to 9, exactly the
hand trace of §9.7. In the second, the four answers 1, 1, 0, 0 say that
Alice is richer than 0 and 1 but not than 2 or 3, so she has exactly 2
million. One comparison was supposed to leak one bit; the reused labels leaked
the whole fortune.

**Fix it.**

- Draw a fresh, uniformly random permute bit for every wire, with a
  cryptographic generator (`secrets`, not `random`), and file the rows by
  color. Never let a label carry its value.
- Garble a fresh circuit with fresh labels for every evaluation. A garbled
  circuit is a one-time object, like a one-time pad: it may be evaluated on
  one set of inputs only. If the same function must be computed many times,
  garble many copies (they can be prepared in advance, before the inputs
  exist; that is the "offline phase" of most real systems).
- More generally, make sure Bob can never hold both labels of any wire. With
  the free-XOR technique of the next section the stakes rise further: there
  both labels of every wire differ by one global secret $\Delta$, so learning
  both labels of a single wire reveals $\Delta$ and with it both labels of
  every wire in the circuit.

Yao's protocol has one more built-in limit worth stating as a "break", though
it is not a bug: the output. If Alice and Bob compute the average of their two
salaries, the protocol hides their inputs perfectly and each still works out
the other's salary from the average and their own. Secure computation hides
everything *except* what the output implies; choosing a function whose output
is safe to reveal is the parties' job, not the protocol's
([Chapter 1](01-Computing-With-Secrets.md), §1.7).

## 9.9 Cheaper gates: from four rows to one and a half

*Level: intermediate.*

A garbled circuit is big. With point and permute every gate costs four
ciphertexts of $\kappa = 128$ bits, 64 bytes, and an AES circuit has about
35,000 gates, so one garbled AES is over two megabytes. Since the tables are
almost all of the communication, and communication is usually what limits
speed, thirty years of work went into shrinking them. Figure 9.6 summarizes
the result.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bytes sent per AND gate and per XOR gate for six garbling schemes, from 128 bytes for Yao with zero padding down to about 24.6 bytes for an AND gate with three halves; XOR gates cost nothing from free-XOR on." fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold">bytes per AND gate (bar) and per XOR gate (right)</text>
<text x="20" y="54">Yao, zero padding</text>
<rect x="210" y="40" width="320" height="20" fill="currentColor" opacity="0.55"/>
<text x="536" y="55">128</text><text x="630" y="55" text-anchor="end">128</text>
<text x="20" y="92">point and permute, 1990</text>
<rect x="210" y="78" width="160" height="20" fill="currentColor" opacity="0.55"/>
<text x="376" y="93">64</text><text x="630" y="93" text-anchor="end">64</text>
<text x="20" y="130">row reduction, 1999</text>
<rect x="210" y="116" width="120" height="20" fill="currentColor" opacity="0.55"/>
<text x="336" y="131">48</text><text x="630" y="131" text-anchor="end">48</text>
<text x="20" y="168">free-XOR, 2008</text>
<rect x="210" y="154" width="120" height="20" fill="currentColor" opacity="0.55"/>
<text x="336" y="169">48</text><text x="630" y="169" text-anchor="end">0</text>
<text x="20" y="206">half-gates, 2015</text>
<rect x="210" y="192" width="80" height="20" fill="currentColor" opacity="0.55"/>
<text x="296" y="207">32</text><text x="630" y="207" text-anchor="end">0</text>
<text x="20" y="244">three halves, 2021</text>
<rect x="210" y="230" width="61.6" height="20" fill="currentColor" opacity="0.55"/>
<text x="278" y="245">24.6</text><text x="630" y="245" text-anchor="end">0</text>
<line x1="210" y1="34" x2="210" y2="258" stroke="currentColor" stroke-width="1.2"/>
<text x="320" y="286" text-anchor="middle">κ = 128-bit labels; one ciphertext = 16 bytes</text>
</svg>
<figcaption>Figure 9.6. What one gate costs to send, scheme by scheme. Row reduction removes one of four rows; free-XOR makes XOR gates cost nothing; half-gates bring an AND gate to two ciphertexts, which was proved optimal for a broad class of schemes; three halves gets under that bound with 1.5 ciphertexts plus 5 bits.</figcaption>
</figure>

### Row reduction (1999)

Moni Naor, Benny Pinkas and Reuban Sumner noticed that Alice is free to choose
the output labels. Instead of picking them at random and encrypting, she can
choose the output label of one row so that the row encrypts to all zeros: if
the row at position 0 would be $\mathrm{pad} \oplus C_v$, set $C_v = \mathrm{pad}$,
and derive the other output label from it. A row of zeros need not be sent;
Bob, landing on position 0, just takes the pad itself as his output label.
Three rows per gate, a 25% saving. This is called **garbled row reduction**,
GRR3.

### Free XOR (2008)

Vladimir Kolesnikov and Thomas Schneider made a far bigger cut. Alice picks one
secret, random string $\Delta$ for the whole circuit, with last bit 1, and
insists that on *every* wire the two labels differ by it:

$$
W^1 = W^0 \oplus \Delta .
$$

Now an XOR gate needs no table at all. Alice sets the output's 0-label to
$C^0 = A^0 \oplus B^0$, and Bob simply XORs the labels he holds. If he holds
$A^u = A^0 \oplus u\Delta$ and $B^v = B^0 \oplus v\Delta$, then

$$
A^u \oplus B^v = A^0 \oplus B^0 \oplus (u \oplus v)\Delta = C^{u \oplus v},
$$

exactly the right output label. Because $\Delta$ ends in 1, the two labels of
every wire have opposite last bits, so the last bit still serves as the
point-and-permute color. NOT gates are free too: Alice just swaps the
meanings of a wire's two labels.

**By hand, with 4-bit labels.** Let $\Delta = 1011$, $A^0 = 0110$ (so
$A^1 = 1101$) and $B^0 = 0011$ (so $B^1 = 1000$). The XOR gate's 0-label is
$C^0 = 0110 \oplus 0011 = 0101$, and $C^1 = 0101 \oplus 1011 = 1110$. Check one
case: inputs $u = 1, v = 0$ give $A^1 \oplus B^0 = 1101 \oplus 0011 = 1110 =
C^1$, correct since $1 \oplus 0 = 1$. Inputs $u = 1, v = 1$ give
$1101 \oplus 1000 = 0101 = C^0$, correct since $1 \oplus 1 = 0$.

Most real circuits are dominated by XOR gates (AES has more than four XORs for
every AND), so free XOR cut garbled-circuit sizes by large factors. It has a
price in assumptions. The hash used for AND gates now sees inputs like $A$ and
$A \oplus \Delta$ that are related by a secret, and the output labels contain
$\Delta$ too, so ordinary pseudorandomness is no longer enough. Seung Geol
Choi, Jonathan Katz, Ranjit Kumaresan and Hong-Sheng Zhou showed in 2012 that
a property they called **circular correlation robustness** suffices, and that
something like it is needed. It also raises the stakes of Break 2 in §9.8: one
wire's two labels, XORed, give $\Delta$, and $\Delta$ unlocks every wire.

For a while the cheapest AND gate was not compatible with free XOR: Benny
Pinkas, Thomas Schneider, Nigel Smart and Stephen Williams (2009) brought AND
gates down to two rows (GRR2) with polynomial interpolation, but that needs
independent labels on every wire. Implementers had to choose.

### Half-gates (2015)

Samee Zahur, Mike Rosulek and David Evans ended the choice with a paper whose
title is its own summary: "Two Halves Make a Whole". The idea is to split an
AND gate into two simpler gates, each of which one party half-knows.

Alice knows a random bit $r$: take it to be the permute bit of wire $b$. And
Bob knows the bit $r \oplus b$, because that is the color of the label he
holds for $b$. Write

$$
a \wedge b = (a \wedge r) \oplus \big(a \wedge (r \oplus b)\big).
$$

- The first term, $a \wedge r$, is an AND gate where the **garbler** knows one
  input. If $r = 0$ the output is always 0, and if $r = 1$ it equals $a$. Alice
  needs only a two-row table indexed by the color of $a$, and row reduction
  removes one of the two rows: **one ciphertext**.
- The second term, $a \wedge (r \oplus b)$, is an AND gate where the
  **evaluator** knows one input in the clear. If Bob's bit is 0 he should
  output the 0-label; if it is 1 he should output a label equal to his
  label for $a$, shifted. One ciphertext, which lets him convert between the
  two, does it: **one ciphertext**.
- The XOR of the two halves is free.

So an AND gate costs two ciphertexts, 32 bytes, and XOR gates still cost
nothing. In formulas, with $H$ a hash, $j$ and $j'$ two tweaks for the gate,
$p_a$ and $p_b$ the colors of the 0-labels $A_0$ and $B_0$, Alice computes

$$
\begin{aligned}
T_G &= H(A_0, j) \oplus H(A_0 \oplus \Delta, j) \oplus p_b \Delta, &
W_G &= H(A_0, j) \oplus p_a T_G,\\
T_E &= H(B_0, j') \oplus H(B_0 \oplus \Delta, j') \oplus A_0, &
W_E &= H(B_0, j') \oplus p_b (T_E \oplus A_0),
\end{aligned}
$$

sends the two strings $T_G, T_E$, and takes $C_0 = W_G \oplus W_E$ as the
output's 0-label. Bob, with labels $A$ and $B$ whose colors are $s_a$ and
$s_b$, computes

$$
C = \big(H(A, j) \oplus s_a T_G\big) \oplus \big(H(B, j') \oplus s_b (T_E \oplus A)\big).
$$

You can check the four cases by hand: each $H$ term Bob computes cancels
against the one Alice used, and the leftover multiples of $\Delta$ add up to
$(a \wedge b)\Delta$. The program checks them by running.

```python
import hmac, hashlib, secrets

def H(label, tweak):              # labels are 128-bit integers here
    d = hmac.new(label.to_bytes(16, "big"), tweak.to_bytes(4, "big"), hashlib.sha256)
    return int.from_bytes(d.digest()[:16], "big")

delta = secrets.randbits(128) | 1        # free-XOR: one global offset, last bit 1
def new_wire():                           # returns the 0-label; the 1-label is W0 ^ delta
    return secrets.randbits(128)

def garble_and(A0, B0, gate):             # half-gates: two 16-byte rows per AND gate
    pa, pb = A0 & 1, B0 & 1
    j, k = 2 * gate, 2 * gate + 1
    TG = H(A0, j) ^ H(A0 ^ delta, j) ^ (delta if pb else 0)          # garbler's half
    WG = H(A0, j) ^ (TG if pa else 0)
    TE = H(B0, k) ^ H(B0 ^ delta, k) ^ A0                           # evaluator's half
    WE = H(B0, k) ^ ((TE ^ A0) if pb else 0)
    return WG ^ WE, (TG, TE)              # output 0-label, the table

def eval_and(A, B, table, gate):
    TG, TE = table
    j, k = 2 * gate, 2 * gate + 1
    WG = H(A, j) ^ (TG if A & 1 else 0)
    WE = H(B, k) ^ ((TE ^ A) if B & 1 else 0)
    return WG ^ WE

# Garble out = (x AND y) XOR z: one AND gate (32 bytes), one XOR gate (nothing).
X0, Y0, Z0 = new_wire(), new_wire(), new_wire()
C0, table = garble_and(X0, Y0, gate=1)
OUT0 = C0 ^ Z0                            # XOR gate: the garbler just XORs 0-labels

for x in (0, 1):
    line = []
    for y in (0, 1):
        for z in (0, 1):
            X, Y, Z = (L ^ (delta if v else 0) for L, v in ((X0, x), (Y0, y), (Z0, z)))
            out = eval_and(X, Y, table, gate=1) ^ Z    # evaluator XORs labels too
            assert out in (OUT0, OUT0 ^ delta)         # always a real label of the output
            line.append(f"({x} AND {y}) XOR {z} = {int(out != OUT0)}")
    print("   ".join(line))
print("bytes sent for the whole circuit:", 2 * 16)
```

```
(0 AND 0) XOR 0 = 0   (0 AND 0) XOR 1 = 1   (0 AND 1) XOR 0 = 0   (0 AND 1) XOR 1 = 1
(1 AND 0) XOR 0 = 0   (1 AND 0) XOR 1 = 1   (1 AND 1) XOR 0 = 1   (1 AND 1) XOR 1 = 0
bytes sent for the whole circuit: 32
```

Every output is right, and the circuit, with one AND gate and one XOR gate,
cost 32 bytes to send. Half-gates is the default garbling scheme in
essentially every modern library.

Zahur, Rosulek and Evans also proved a lower bound: in any garbling scheme of
a broad "linear" kind, where labels and ciphertexts are combined only by XOR
and the evaluator's actions are fixed by the colors, an AND gate needs at
least $2\kappa$ bits. Half-gates is optimal in that class.

### Three halves (2021)

Six years later Mike Rosulek and Lawrence Roy got under the bound by stepping
outside the class. In "Three Halves Make a Whole? Beating the Half-Gates
Lower Bound for Garbled Circuits" (CRYPTO 2021), they split every label into
two halves, garble the halves with different linear combinations, and let a
few extra random **control bits**, themselves encrypted, decide which
combination the evaluator uses. The result is $1.5\kappa + 5$ bits per AND
gate, about 24.6 bytes at $\kappa = 128$, still with free XOR. The
computation is a little heavier than half-gates, and the scheme is newer and
less widely deployed. Its security rests on the same kind of assumption as
free XOR, a circular correlation-robust hash. Whether $1.5\kappa$ bits is the
true limit for an AND gate is not known.

### Hashing with AES

All of these schemes call a hash function a few times per AND gate, so its
speed matters. Since 2013, following Mihir Bellare, Viet Tung Hoang,
Sriram Keelveedhi and Phillip Rogaway's **JustGarble**, implementations build
it from AES with a *fixed*, public key: the key schedule is computed once, and
each hash is a single AES call with hardware instructions, a few nanoseconds.
This needs care, because a fixed-key cipher is a public permutation, not a
keyed one. In 2020 Chun Guo, Jonathan Katz, Xiao Wang and Yu Yu showed that
some earlier ways of turning fixed-key AES into the hash did not have the
properties the security proofs assumed, and gave constructions, analyzed in
the random-permutation model, that do. In this chapter's code HMAC-SHA256
plays the role of the hash: slower by a large factor, but with no such
subtleties.

!!! note "Life story: half-gates"
    **Born:** 2015, Samee Zahur, Mike Rosulek and David Evans, "Two Halves
    Make a Whole: Reducing Data Transfer in Garbled Circuits Using Half
    Gates" (EUROCRYPT 2015), building on free XOR (Kolesnikov and Schneider,
    2008) and row reduction (Naor, Pinkas and Sumner, 1999) · **Purpose:**
    two ciphertexts per AND gate while keeping XOR gates free · **Helped:**
    cut garbled-circuit traffic by about a third against the best earlier
    free-XOR scheme; adopted by EMP-toolkit and most other libraries; its
    lower bound framed the question that three halves (2021) answered ·
    **Status:** current; the default garbling scheme, with three halves as
    the newer, smaller alternative

## 9.10 When the parties cheat

*Level: intermediate.*

Yao's protocol as described is secure only against semi-honest parties. Each
party can cheat in its own way.

**A cheating evaluator.** Bob's options are limited. He can choose any input
he likes, but so can a party in the ideal world. He can lie about the output,
which is solved by having him return the final label instead of the bit (he
cannot produce the other output label without holding it). His real attack
surface is the OT, so the OTs must be secure against a malicious receiver,
and with OT extension that means the consistency check of §9.5.

**A cheating garbler.** Alice's options are far worse for Bob.

- She can garble the wrong circuit, for example one that outputs Bob's input
  bits. Bob cannot tell: garbled tables of different circuits look alike.
- She can mount a **selective failure** attack (Mehmet Kiraz and Berry
  Schoenmakers, and Payman Mohassel and Matthew Franklin, both 2006). In the
  OT for one of Bob's input wires she offers a correct label for 0 and a
  garbage string for 1. If Bob's bit is 0 the protocol runs normally; if it
  is 1 the evaluation fails and Bob complains. Whether he complains tells
  Alice his bit, even though the OT itself leaked nothing.
- She can give inconsistent inputs to different parts of the protocol.

### Cut-and-choose

The classic defense is to make Alice garble many copies and check most of
them. Alice garbles $s$ independent copies of the circuit and commits to them
([Chapter 3](03-Commitments.md)). Bob picks a random subset to be **opened**:
for those, Alice reveals all the randomness, and Bob checks that each one
really is a correct garbling of the agreed circuit. Bob evaluates the
remaining copies and takes the majority output (or, in later versions, uses
any disagreement to recover Alice's input as a penalty). To pass, Alice must
cheat only in copies that happen not to be checked, and a few cheating copies
cannot outvote the honest majority.

Lindell and Pinkas (2007) gave the first full proof of a cut-and-choose
protocol, but their analysis needed several hundred copies for a cheating
chance of $2^{-40}$. Sharper analyses in 2011 (Lindell and Pinkas again, and
abhi shelat and Chih-hao Shen) brought that to about 125, and Yehuda Lindell
(2013) to $s = 40$ copies for error $2^{-40}$, by letting a cheating Alice's
inconsistency hand Bob her input.
When the same function is computed many times, the copies can be shared out
across executions, and the cost per execution falls to a handful of
circuits (Lindell and Ben Riva, 2014; Peter Rindal and Mike Rosulek, 2016).
Two side problems need their own fixes: making sure Alice uses the same
input in every evaluated copy, and defeating selective failure, usually by
encoding each of Bob's input bits as the XOR of several random bits, so that
a failure on any one of them reveals nothing.

A cheaper middle road is **dual execution** (Mohassel and Franklin, 2006;
Yan Huang, Jonathan Katz and David Evans, 2012): each party garbles once and
evaluates the other's circuit, and a secure equality test checks that the
two outputs agree. A cheater is caught unless its cheating did not change
the output, and the price is that it can learn one extra bit of the honest
party's input, chosen by the cheater. For some applications one bit is an
acceptable leak; for a 2-bit millionaires instance it is not.

### Authenticated garbling

The method that now dominates is **authenticated garbling** (Xiao Wang,
Samuel Ranellucci and Jonathan Katz, 2017). It replaces "many copies, mostly
checked" with "one copy, built jointly". In a preprocessing phase, the
parties use OT extension to create shared random bits that carry
information-theoretic MACs (the "TinyOT" style of correlation from
[Chapter 10](10-Multi-Party-Computation-in-Practice.md)). Alice then garbles
a single circuit whose wire masks are shared between the two parties and
authenticated, so that Bob can verify, as he evaluates, that each row he
opens is consistent with the authenticated bits. A wrong row is detected,
and the protocol aborts without leaking anything that depends on Bob's
input.

In their paper, Wang, Ranellucci and Katz report evaluating an AES circuit
with malicious security in about 37 ms in total, of which about 1 ms is the
online phase once inputs are known; amortized over 1,024 executions, about
6.7 ms each. Jonathan Katz, Samuel Ranellucci, Mike Rosulek and Xiao Wang
(2018) made it compatible with half-gates and cut its communication by up to
2.6 times. The general lesson is the one Chapter 1 drew: malicious security
costs a constant factor over semi-honest, and that factor fell from hundreds
in the 2000s to a small number by the late 2010s.

!!! note "Life story: authenticated garbling"
    **Born:** 2017, Xiao Wang, Samuel Ranellucci and Jonathan Katz,
    "Authenticated Garbling and Efficient Maliciously Secure Two-Party
    Computation" (ACM CCS 2017, best paper award), with a multi-party version
    the same year · **Purpose:** malicious security for garbled circuits with
    a single garbled copy instead of dozens, by building the garbling jointly
    from MAC-authenticated shares · **Helped:** replaced cut-and-choose as the
    fastest approach; malicious AES in tens of milliseconds; the basis of
    EMP-toolkit's malicious protocols · **Status:** current, with later
    optimizations (2018 onward)

## 9.11 In the real world

*Level: intermediate.*

### What it costs, in real numbers

The standard benchmark is one AES-128 encryption, with Alice holding the key
and Bob the plaintext (or the reverse). The circuits used in research are
public, in the "Bristol" formats maintained by Nigel Smart and colleagues.
The older Bristol AES-128 circuit, generated by Stefan Tillich, has 6,800 AND
gates, 25,124 XOR gates and 1,692 inverters; the newer "Bristol Fashion" one
has 6,400 AND gates, 28,176 XOR gates and 2,087 inverters. (The difference in
ANDs comes from the S-box: 200 S-boxes, 160 for the rounds and 40 for the key
schedule, at 34 or at 32 AND gates each.)

With free XOR, only the AND gates cost anything to send. For the Bristol
Fashion circuit:

| Scheme | Bytes per AND | Tables for one AES |
|---|---|---|
| Point and permute, no free XOR (64 bytes for every gate) | 64 | about 2.2 MB |
| Free XOR with row reduction | 48 | 307 KB |
| Half-gates | 32 | 205 KB |
| Three halves | about 24.6 | about 158 KB |

On top come Alice's 128 input labels (2 KB) and 128 OTs for Bob's input bits,
which with OT extension are a few kilobytes more.

How fast is that? Count the network first. A half-gates AND gate is 256 bits.
A 1 Gbit/s link carries $10^9 / 256 \approx 3.9$ million AND gates per second,
which is about 610 AES evaluations per second; a 10 Gbit/s link, about 6,100.
With three halves (197 bits per AND gate) the same 1 Gbit/s link carries
about 5.1 million AND gates per second. These are ceilings that ignore all
other overhead. On the computing side, half-gates garbling costs four
fixed-key AES calls per AND gate and evaluation two, and a modern core with
AES instructions garbles on the order of tens of millions of AND gates per
second (approximate; it depends heavily on the implementation and the
processor). So below about 10 Gbit/s the wire, not the processor, is usually
the bottleneck, which is why the field counts bytes per gate so carefully.

Compare with the past. Fairplay, the first implementation, took on the order
of a second or more even for small functions in 2004. In 2011 Yan Huang, David Evans, Jonathan Katz
and Lior Malka's FastGC evaluated AES in a fraction of a second with
semi-honest security; by the late 2010s semi-honest AES took around a
millisecond on a fast local network and malicious AES tens of milliseconds
(these are the figures reported in papers of the time, on their hardware, and
should be read as orders of magnitude).

### A comparison over a 20-minute link

Arcadia City's water office wants to know whether an Earth contractor's
sealed price for a desalination pump is below the city's budget ceiling,
without either side showing its number. One-way light time to Earth is 20
minutes that month, so every round trip costs 40 minutes. A GMW-style
protocol (§9.4, and [Chapter 10](10-Multi-Party-Computation-in-Practice.md))
needs one round trip for every layer of AND gates: a 64-bit comparison has
about 64 layers in the simple carry-chain circuit of §9.7, which is over 42
hours of waiting, and an AES-based step would add dozens more layers. Yao's
protocol needs a fixed number of messages whatever the circuit. With a
two-message OT in which the receiver speaks first, such as Bellare and
Micali's, the city sends its OT messages for its 64 input bits; the contractor
replies with the garbled tables, its own input labels and the OT answers; the
city evaluates. That is two one-way trips, 40 minutes, plus a third if the
contractor is to learn the result, and a few kilobytes of transfer (64 AND
gates at 32 bytes each, plus labels). On a high-latency link, constant
rounds matter more than anything else, and this is where garbled circuits
win.

### Systems and uses

!!! note "Life story: Fairplay"
    **Born:** 2004, Dahlia Malkhi, Noam Nisan, Benny Pinkas and Yaron Sella,
    "Fairplay: A Secure Two-Party Computation System" (USENIX Security 2004)
    · **Purpose:** show that Yao's protocol could actually run: a compiler
    from a simple high-level language (SFDL) to circuits, and a runtime that
    garbled and evaluated them over a network · **Helped:** turned two-party
    computation from theory into an experimental science; spawned FairplayMP
    for many parties (2008) and a line of compilers and libraries (FastGC,
    TASTY, Obliv-C, ABY, EMP-toolkit, MP-SPDZ) · **Retired:** superseded by
    faster systems within a few years · **Replaced by:** libraries with free
    XOR, half-gates, OT extension and pipelining

Garbled circuits and OT rarely appear as products with their own names. They
are components:

- **Libraries.** EMP-toolkit (Wang, Malozemoff and Katz, from 2016), ABY
  (Daniel Demmler, Thomas Schneider and Michael Zohner, 2015), which mixes
  garbled circuits with arithmetic and Boolean sharing and converts between
  them, and MP-SPDZ (Marcel Keller, 2020), which implements dozens of
  protocols behind one compiler.
- **Threshold signatures.** OT-based multiplication is the core of the
  threshold ECDSA protocols of Doerner, Kondi, Lee and shelat (2018, 2019),
  the ones whose proof work uncovered the issues with the simplest OT
  ([Chapter 4](04-Threshold-Cryptography.md)).
- **Private set intersection.** The fastest two-party PSI protocols since
  2016 (Kolesnikov, Kumaresan, Rosulek and Trieu) are built on OT extension
  ([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)).
- **Multi-party preprocessing.** MASCOT (Keller, Orsini and Scholl, 2016)
  makes the Beaver triples of SPDZ from OT extension
  ([Chapter 10](10-Multi-Party-Computation-in-Practice.md)).
- **Zero-knowledge proofs.** A garbled circuit that the prover evaluates is
  itself a zero-knowledge proof (Marek Jawurek, Florian Kerschbaum and Claudio
  Orlandi, 2013), and the fast "VOLE-based" proofs of 2021 (Wolverine,
  QuickSilver) use correlations produced by OT-extension-style techniques
  ([Chapter 5](05-Zero-Knowledge-Proofs.md)).
- **Private machine learning.** Systems such as Gazelle (Chiraag Juvekar,
  Vinod Vaikuntanathan and Anantha Chandrakasan, 2018) use homomorphic
  encryption for the linear layers of a neural network and garbled circuits
  for the comparisons inside activation functions, which homomorphic
  encryption handles badly ([Chapter 12](12-Homomorphic-Encryption.md)).
- **Standards.** ISO/IEC 4922 covers secure multi-party computation; its
  part 2 (2024) specifies protocols on secret sharing, and a part 3 on
  garbled circuits was still a draft in 2026.

## 9.12 Going deeper

*Level: expert.*

**Where OT sits among assumptions.** OT implies key agreement, and key
agreement cannot be built from one-way functions in a black-box way
(Impagliazzo and Rudich, 1989), so OT lives in "public-key land". Within it,
OT can be built from almost every public-key assumption: trapdoor
permutations (Even, Goldreich and Lempel), DDH and CDH, quadratic residuosity,
LWE, codes and isogenies. Chris Peikert, Vinod Vaikuntanathan and Brent Waters
(2008) gave a single framework that yields UC-secure OT, in the common
reference string model, from DDH, quadratic residuosity or LWE.

**What survives a quantum computer.** The Diffie-Hellman OTs of §9.3 fall to
Shor's algorithm. Everything after the base OTs does not: OT extension and
garbling use only hashing and AES, which a quantum attacker weakens by at most
a square root (Grover), handled by longer labels. So a post-quantum two-party
computation needs only post-quantum base OTs, for example from LWE or from
the ML-KEM-style key encapsulation of
[Post-quantum, Chapter 8](../post-quantum/08-ML-KEM.md), with care about the
security model; the hard problems are surveyed in
[Post-quantum, Chapter 4](../post-quantum/04-A-Field-Guide-to-Hard-Problems.md).
Secure computation also feeds back into post-quantum signatures: the
"MPC-in-the-head" technique of Yuval Ishai, Eyal Kushilevitz, Rafail Ostrovsky
and Amit Sahai (2007) turns a simulated multi-party protocol into a
zero-knowledge proof, and several post-quantum signature candidates are built
on it ([Post-quantum, Chapter 15](../post-quantum/15-Multivariate-Signatures-and-the-On-Ramp.md)).

**Garbling as a primitive.** Bellare, Hoang and Rogaway (2012) separated the
garbling scheme from the protocol and defined three properties: **privacy**
(the garbled circuit, input labels and decoding information reveal only the
output), **obliviousness** (without the decoding information they reveal
nothing at all) and **authenticity** (the evaluator cannot produce a valid
output label other than the one it computed). Authenticity is what lets Bob
return a label instead of a bit in §9.10. Seen this way, a garbled circuit is
a **randomized encoding** of the function (Benny Applebaum, Yuval Ishai and
Eyal Kushilevitz, 2004): a simpler, randomized function whose output reveals
$f(x)$ and nothing else, and randomized encodings are a tool across
complexity theory and cryptography.

**One-time, adaptive and reusable.** A Yao garbled circuit may be evaluated
once (§9.8). If the circuit is sent before the inputs are chosen, as in the
offline phase of real systems, the security proof needs **adaptive**
security, which the simplest proofs do not give; it holds in the random
oracle model, and without it only with extra work or larger garbled inputs.
Shafi Goldwasser, Yael Tauman Kalai, Raluca Ada Popa, Vinod Vaikuntanathan and
Nickolai Zeldovich (2013) built **reusable** garbled circuits, evaluable on
many inputs, from fully homomorphic and attribute-based encryption, at a cost
far beyond practice ([Chapters 12](12-Homomorphic-Encryption.md) and
[13](13-Identity-Attribute-and-Functional-Encryption.md)). With secure
hardware tokens, a garbled circuit becomes a **one-time program**
(Goldwasser, Kalai and Guy Rothblum, 2008).

**Beyond Boolean gates.** Circuits are a poor fit for some programs. Marshall
Ball, Tal Malkin and Mike Rosulek (2016) garbled arithmetic circuits over
large rings directly. David Heath and Vladimir Kolesnikov's **stacked
garbling** (2020) lets a program with branches pay communication only for the
largest branch, not for all of them. Steve Lu and Rafail Ostrovsky's
**garbled RAM** (2013) garbles programs with memory access, so that a
computation over a large database need not be unrolled into a circuit the
size of the database.

**From two parties to many.** Beaver, Micali and Rogaway's 1990 paper, the
one that introduced point and permute, was about many parties: the BMR
protocol has all parties jointly garble one circuit, with each wire's labels
made from every party's contribution, giving secure computation for any
number of parties in a constant number of rounds. Its modern descendants,
including the multi-party version of authenticated garbling, are part of
[Chapter 10](10-Multi-Party-Computation-in-Practice.md).

**Fairness and output delivery.** Yao's protocol gives the output to Bob
first. A malicious Bob can learn it and refuse to pass it on. Cleve's 1986
result ([Chapter 1](01-Computing-With-Secrets.md), §1.11) says this cannot be
fully fixed for two parties in general; protocols settle for **security with
abort**, or for gradual release, or for penalties enforced by a ledger.

## Check yourself

??? question "1. In Rabin's oblivious transfer, why can Alice not tell whether the square root she sent helped Bob factor $n$?"

    Bob sends only $a = x^2 \bmod n$, and each of the four square roots of $a$
    is equally likely to be his $x$. Whichever root Alice sends, from her side
    it is $\pm x$ with probability 1/2 and one of the other two roots with
    probability 1/2. Her view is the same in both cases.

??? question "2. You have a 1-out-of-2 OT box. How do you make Rabin's OT from it?"

    The sender flips a secret coin $s$ and offers $m$ in slot $s$ and junk (or
    a marker meaning "nothing") in slot $1 - s$. The receiver chooses a slot
    $c$ at random. Afterwards the sender reveals $s$. The receiver has $m$
    exactly when $c = s$, with probability 1/2, and the sender never learns $c$.

??? question "3. In the simplest OT with $p = 23$, $g = 4$ and the sender's $a = 3$ (so $A = 18$), the receiver chooses $c = 0$ and $b = 2$. Compute $B$, both keys and the receiver's key."

    $B = g^b = 16$. The sender computes $k_0 = 16^3 = 4096 \equiv 2$ and
    $B/A = 16 \cdot 9 = 144 \equiv 6$, so $k_1 = 6^3 = 216 \equiv 9$. The
    receiver computes $A^b = 18^2 = 324 \equiv 2 = k_0$, the key to $m_0$, as
    chosen.

??? question "4. Alice holds a bit $x$, Bob a bit $y$. Using one OT, how do they end up with XOR shares of $x \wedge y$, neither learning it?"

    Alice picks a random bit $r$ and offers $(r,\ r \oplus x)$; Bob chooses
    with $y$ and receives $r \oplus (x \wedge y)$. Alice's share is $r$, Bob's
    is $r \oplus (x \wedge y)$; their XOR is $x \wedge y$. Each share alone is
    a uniformly random bit, and the OT hides $y$ from Alice.

??? question "5. In the toy garbled AND gate of §9.6 (table $[89, 80, 39, 82]$), Bob holds labels 31 and 74. Which row does he open, what label does he get, and what does it mean?"

    31 is odd (color 1) and 74 is even (color 0), so he opens position
    $2 \cdot 1 + 0 = 2$, the row 39. He subtracts $H(31, 74) = 94$:
    $39 - 94 \equiv 45 \pmod{100}$. That is $C_0$, color 1; with $\pi_c = 1$ the
    value is $1 \oplus 1 = 0$. Indeed $0 \wedge 0 = 0$.

??? question "6. In Yao's original scheme, with zero padding and trial decryption, what does Bob learn if Alice forgets to shuffle the rows?"

    The rows stay in truth-table order, so the position of the row that opens
    with the zero block tells Bob which row of the truth table he is in: both
    input bits of every gate, including Alice's input bits at the first layer.

??? question "7. With free XOR, Bob somehow learns both labels of one internal wire. What can he do?"

    Their XOR is the global offset $\Delta$. With $\Delta$ he can turn any label
    he holds into the other label of the same wire. In particular he gets
    both labels of his own input wires, so he can evaluate the circuit on
    every input of his own, exactly as in Break 2 of §9.8; for the comparator
    that reveals Alice's fortune.

??? question "8. A 32-bit millionaires comparison uses the comparator of §9.7 with half-gates. How many bytes of garbled tables are sent? With three halves?"

    The comparator has one AND gate per bit, so 32 AND gates; XOR gates are
    free. Half-gates: $32 \times 32 = 1{,}024$ bytes. Three halves:
    $32 \times (1.5 \cdot 128 + 5) = 32 \times 197 = 6{,}304$ bits, about 788
    bytes. Alice also sends 32 labels of 16 bytes (512 bytes), and Bob runs
    32 OTs.

??? question "9. In IKNP, suppose the hash $H$ were the identity, so the sender sends $y_i^0 = x_i^0 \oplus q_i$ and $y_i^1 = x_i^1 \oplus q_i \oplus s$. Show that a receiver who knows both messages of a single pair learns everything."

    For pair $i$ the receiver knows $t_i$ and, with $r_i = 0$ say, $q_i = t_i$.
    If it knows $x_i^1$ too, it computes $s = y_i^1 \oplus x_i^1 \oplus t_i$.
    With $s$, it can unmask $y_j^{1 - r_j}$ with $t_j \oplus s$ for every other
    pair $j$. A real hash prevents this: the masks $H(j, t_j \oplus s)$ stay
    random-looking even to someone who knows many $t_j$, which is the
    correlation-robustness property.

??? question "10. Explain the selective failure attack on Yao's protocol and one way to stop it."

    A malicious Alice offers, in the OT for one of Bob's input wires, a correct
    0-label and a garbage 1-label. If Bob's bit is 1, evaluation fails and Bob
    aborts or complains; if it is 0, all goes well. Alice learns the bit from
    Bob's behavior. A standard fix encodes each of Bob's input bits $y$ as the
    XOR of several random bits $y^{(1)} \oplus \cdots \oplus y^{(k)}$, with the
    XOR computed inside the circuit and the OTs run on the random bits. A
    failure triggered by any one of them reveals a random bit independent of
    $y$. To learn $y$ Alice would have to attack all $k$ wires, and then the
    evaluation fails unless every one of Bob's random bits happens to be 0,
    which has probability $2^{-k}$.

## What you learned

- Oblivious transfer lets a receiver take one of two messages without the
  sender learning which, and without learning the other. Rabin's 1981 version
  (a message that arrives half the time) and the 1-out-of-2 version of Even,
  Goldreich and Lempel (1985) are equivalent (Crépeau, 1987).
- OT can be built from Diffie-Hellman in a few exponentiations. Bellare and
  Micali (1989) need a public element of unknown logarithm; Chou and Orlandi's
  simplest OT (2015) needs none. Both give perfect receiver privacy and
  sender privacy under CDH in the random oracle model; the simplest OT's
  universal-composability claim was found to be flawed and withdrawn.
- OT is complete: with OT alone, any function can be computed securely, even
  against cheaters (Kilian, 1988). One OT computes XOR shares of one AND.
- OT extension (IKNP, 2003) turns 128 public-key OTs into millions using only
  hashing, by running the base OTs on the columns of a matrix and using its
  rows; silent OT and its relatives now produce tens of millions of OTs per
  second.
- Yao's garbled circuits encrypt a circuit gate by gate: two random labels
  per wire, an encrypted truth table per gate, one row opened per gate. With
  the evaluator's input labels fetched by OT, they solve the millionaires'
  problem, and any other two-party function, in a constant number of rounds.
- Point and permute (1990) lets the evaluator open the right row directly;
  free XOR (2008) makes XOR gates cost nothing; half-gates (2015) bring an
  AND gate to 32 bytes; three halves (2021) to about 24.6.
- Careless garbling leaks: permute bits must be random, and a garbled
  circuit and its labels must never be used twice.
- Against cheating parties, cut-and-choose checks many garbled copies, dual
  execution leaks at most one bit, and authenticated garbling (2017) builds
  one checked copy jointly; malicious AES takes tens of milliseconds.
- A garbled AES-128 is about 205 KB with half-gates. Communication, not
  computation, usually limits speed: a 1 Gbit/s link carries about 3.9
  million half-gates AND gates per second.

**Next:** [Chapter 10](10-Multi-Party-Computation-in-Practice.md), secure
computation among many parties: secret sharing, Beaver triples, SPDZ, and the
auctions, salary studies and hospital collaborations that run on them.

## Further reading

- Michael O. Rabin, "How to Exchange Secrets with Oblivious Transfer",
  Technical Report TR-81, Aiken Computation Laboratory, Harvard University
  (1981); reprinted as IACR ePrint 2005/187.
- Stephen Wiesner, "Conjugate Coding", *SIGACT News* 15 (1983), written
  around 1970.
- Shimon Even, Oded Goldreich and Abraham Lempel, "A Randomized Protocol for
  Signing Contracts", *Communications of the ACM* 28 (1985); CRYPTO '82.
- Gilles Brassard, Claude Crépeau and Jean-Marc Robert, "All-or-Nothing
  Disclosure of Secrets", CRYPTO '86.
- Claude Crépeau, "Equivalence Between Two Flavours of Oblivious Transfers",
  CRYPTO '87.
- Joe Kilian, "Founding Cryptography on Oblivious Transfer", STOC 1988.
- Andrew C. Yao, "Protocols for Secure Computations", FOCS 1982, and "How to
  Generate and Exchange Secrets", FOCS 1986.
- Oded Goldreich, Silvio Micali and Avi Wigderson, "How to Play Any Mental
  Game", STOC 1987.
- Mihir Bellare and Silvio Micali, "Non-Interactive Oblivious Transfer and
  Applications", CRYPTO '89.
- Russell Impagliazzo and Steven Rudich, "Limits on the Provable Consequences
  of One-Way Permutations", STOC 1989.
- Donald Beaver, Silvio Micali and Phillip Rogaway, "The Round Complexity of
  Secure Protocols", STOC 1990.
- Donald Beaver, "Precomputing Oblivious Transfer", CRYPTO '95, and
  "Correlated Pseudorandomness and the Complexity of Private Computations",
  STOC 1996.
- Moni Naor, Benny Pinkas and Reuban Sumner, "Privacy Preserving Auctions and
  Mechanism Design", ACM EC 1999; Moni Naor and Benny Pinkas, "Oblivious
  Transfer and Polynomial Evaluation", STOC 1999, and "Efficient Oblivious
  Transfer Protocols", SODA 2001.
- Yuval Ishai, Joe Kilian, Kobbi Nissim and Erez Petrank, "Extending
  Oblivious Transfers Efficiently", CRYPTO 2003.
- Dahlia Malkhi, Noam Nisan, Benny Pinkas and Yaron Sella, "Fairplay: A
  Secure Two-Party Computation System", USENIX Security 2004.
- Yehuda Lindell and Benny Pinkas, "A Proof of Security of Yao's Protocol for
  Two-Party Computation", *Journal of Cryptology* 22 (2009); IACR ePrint
  2004/175.
- Yehuda Lindell and Benny Pinkas, "An Efficient Protocol for Secure
  Two-Party Computation in the Presence of Malicious Adversaries",
  EUROCRYPT 2007; Yehuda Lindell, "Fast Cut-and-Choose Based Protocols for
  Malicious and Covert Adversaries", CRYPTO 2013.
- Vladimir Kolesnikov and Thomas Schneider, "Improved Garbled Circuit: Free
  XOR Gates and Applications", ICALP 2008.
- Vladimir Kolesnikov, Ahmad-Reza Sadeghi and Thomas Schneider, "Improved
  Garbled Circuit Building Blocks and Applications to Auctions and Computing
  Minima", CANS 2009.
- Benny Pinkas, Thomas Schneider, Nigel Smart and Stephen Williams, "Secure
  Two-Party Computation Is Practical", ASIACRYPT 2009.
- Seung Geol Choi, Jonathan Katz, Ranjit Kumaresan and Hong-Sheng Zhou, "On
  the Security of the 'Free-XOR' Technique", TCC 2012.
- Mihir Bellare, Viet Tung Hoang and Phillip Rogaway, "Foundations of Garbled
  Circuits", ACM CCS 2012; with Sriram Keelveedhi, "Efficient Garbling from a
  Fixed-Key Blockcipher", IEEE S&P 2013.
- Samee Zahur, Mike Rosulek and David Evans, "Two Halves Make a Whole:
  Reducing Data Transfer in Garbled Circuits Using Half Gates", EUROCRYPT
  2015.
- Tung Chou and Claudio Orlandi, "The Simplest Protocol for Oblivious
  Transfer", LATINCRYPT 2015; IACR ePrint 2015/267.
- Ziya Alper Genç, Vincenzo Iovino and Alfredo Rial, "'The Simplest Protocol
  for Oblivious Transfer' Revisited", IACR ePrint 2017/370 (2017, revised
  2020).
- Eduard Hauck and Julian Loss, "Efficient and Universally Composable
  Protocols for Oblivious Transfer from the CDH Assumption", PKC 2018; IACR
  ePrint 2017/1011.
- Marcel Keller, Emmanuela Orsini and Peter Scholl, "Actively Secure OT
  Extension with Optimal Overhead", CRYPTO 2015.
- Xiao Wang, Samuel Ranellucci and Jonathan Katz, "Authenticated Garbling and
  Efficient Maliciously Secure Two-Party Computation", ACM CCS 2017; IACR
  ePrint 2017/030.
- Elette Boyle, Geoffroy Couteau, Niv Gilboa, Yuval Ishai, Lisa Kohl and Peter
  Scholl, "Efficient Pseudorandom Correlation Generators: Silent OT Extension
  and More", CRYPTO 2019.
- Chun Guo, Jonathan Katz, Xiao Wang and Yu Yu, "Efficient and Secure
  Multiparty Computation from Fixed-Key Block Ciphers", IEEE S&P 2020.
- Kang Yang, Chenkai Weng, Xiao Lan, Jiang Zhang and Xiao Wang, "Ferret: Fast
  Extension for Correlated OT with Small Communication", ACM CCS 2020.
- Mike Rosulek and Lawrence Roy, "Three Halves Make a Whole? Beating the
  Half-Gates Lower Bound for Garbled Circuits", CRYPTO 2021.
- David Evans, Vladimir Kolesnikov and Mike Rosulek, *A Pragmatic
  Introduction to Secure Multi-Party Computation* (Now Publishers, 2018): a
  book-length introduction to everything in this chapter.
- Nigel Smart et al., "'Bristol Fashion' MPC Circuits" (the AES and
  comparison circuits used as benchmarks).
- Book 1's short version: [Chapter 23](../../book/23-Advanced-Protocols.md),
  §23.6, and the reference page [Multi-party computation](../../11-advanced/MPC.md).
