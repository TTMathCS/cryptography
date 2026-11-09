# 12. Homomorphic Encryption

*Ordinary encryption locks data away: to do anything with it, you must first
unlock it. Homomorphic encryption lets a stranger compute on the locked data
and hand back a locked answer that only you can open. This chapter follows the
idea from a question asked in 1978 to features in phones sold in 2024. You will
see why textbook RSA and ElGamal already multiply under encryption, work
Paillier's scheme by hand with $n = 77$ and code it into a vote tally, double
someone's encrypted salary without the key, watch the noise in a lattice
ciphertext grow with every multiplication until the answer comes out wrong,
recover a CKKS secret key from shared decryptions, and see how Gentry's
bootstrapping and the schemes that followed it (BGV, BFV, CKKS, GSW, FHEW and
TFHE) turned an open problem into working software.*

!!! abstract "In this chapter"
    **You will learn:**

    - what it means for encryption to be homomorphic, and the problem it
      solves: outsourcing a computation on data you may not show;
    - why textbook RSA and ElGamal multiply under encryption, how exponential
      ElGamal adds, and why every homomorphic scheme is malleable;
    - Goldwasser-Micali bit encryption, and Paillier's additive scheme worked
      by hand, with its proof of correctness, a vote tally and a scalar
      multiplication;
    - how an attacker with no key changes an encrypted number, and what stops
      it;
    - Boneh-Goh-Nissim's single multiplication, and why lattice schemes carry
      noise that grows until decryption fails;
    - Gentry's 2009 bootstrapping, squashing and circular security, in plain
      words;
    - the LWE-based generations: BGV and BFV with modulus switching and
      relinearization, CKKS for approximate numbers and the 2021 key-recovery
      attack on it, and GSW, FHEW and TFHE with a bootstrap after every gate;
    - how fast all this is, the standards, the libraries, and where it runs
      today, including Apple's Live Caller ID Lookup.

    **You need:** [Chapter 1](01-Computing-With-Secrets.md) (trust models and
    what "privacy" means); book 1's [RSA](../../book/13-RSA.md) and
    [discrete-log systems](../../book/14-Discrete-Log-Systems.md) chapters for
    textbook RSA and ElGamal; modular arithmetic. For the lattice sections,
    [Learning with errors](../mathematics/15-Learning-with-Errors.md) in the
    mathematics book helps; this chapter uses the idea and links there for the
    proofs. Book 1's [overview of homomorphic encryption](../../book/23-Advanced-Protocols.md)
    is the short version of this chapter.

    **Levels:** §12.1 and §12.2 are for beginners; §12.3 to §12.8, §12.12 and
    §12.13 are intermediate; §12.9 to §12.11 and §12.14 are expert.

## 12.1 The problem

*Level: beginner.*

A hospital wants a risk model run on its patients' records. The model belongs
to a company that will not hand it over, and the records belong to patients
whom the law protects. A phone wants to know who is calling from an unknown
number, but asking a server "who owns 555-0142?" tells the server who is
calling you. A bank wants a cloud provider to run fraud checks on transactions
the provider is not allowed to read. In each case one party has the data and
another has the computation, the computing power or the database, and the data
owner does not trust the other side with the data.

Ordinary encryption does not help. It protects data while it is stored and
while it travels, but the moment someone needs to compute on it, it must be
decrypted, and whoever decrypts it can read it. The data owner can keep the
data at home, which means giving up the service, or send it in the clear and
hope the other side behaves, which is what happens almost everywhere today.

What the data owner wants is shown in Figure 12.1. She encrypts her input $x$
and sends $\mathrm{Enc}(x)$. The server, which never holds the key, runs some
procedure on the ciphertext and returns a new ciphertext. She decrypts it and
gets $f(x)$, the result she would have got by running $f$ herself. The server
saw only ciphertexts, so it learned nothing about $x$ or about $f(x)$.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The client encrypts x and sends Enc(x); the server computes on the ciphertext and returns Enc(f(x)); only the client can decrypt it" fill="currentColor" font-size="14">
<rect x="10" y="50" width="170" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="76" text-anchor="middle" font-weight="bold">data owner</text>
<text x="95" y="100" text-anchor="middle" font-size="13">holds the key</text>
<text x="95" y="122" text-anchor="middle" font-size="13">encrypts x</text>
<text x="95" y="144" text-anchor="middle" font-size="13">decrypts f(x)</text>
<rect x="430" y="50" width="200" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="76" text-anchor="middle" font-weight="bold">server</text>
<text x="530" y="100" text-anchor="middle" font-size="13">no key</text>
<text x="530" y="122" text-anchor="middle" font-size="13">evaluates f</text>
<text x="530" y="144" text-anchor="middle" font-size="13">on ciphertexts only</text>
<line x1="182" y1="80" x2="420" y2="80" stroke="currentColor" stroke-width="1.5"/>
<polygon points="428,80 419,76 419,84"/>
<text x="305" y="70" text-anchor="middle" font-size="13">Enc(x)</text>
<line x1="428" y1="130" x2="190" y2="130" stroke="currentColor" stroke-width="1.5"/>
<polygon points="182,130 191,126 191,134"/>
<text x="305" y="150" text-anchor="middle" font-size="13">Enc(f(x))</text>
<text x="320" y="200" text-anchor="middle" font-size="13">Dec(Eval(f, Enc(x))) = f(x), and the server learns nothing about x or f(x)</text>
</svg>
<figcaption>Figure 12.1. Outsourcing a computation on data you may not show. The server evaluates f on the ciphertext; only the key holder can read the answer.</figcaption>
</figure>

The word for this comes from algebra. A **homomorphism** is a map between two
structures that respects their operations: if $\phi$ is a homomorphism, then
$\phi(a \cdot b) = \phi(a) \cdot \phi(b)$, where the two "$\cdot$" may be
different operations in the two structures. An encryption scheme is
**homomorphic** for an operation if combining ciphertexts in some public way
gives a ciphertext of the combined messages:

$$
\mathrm{Dec}\big(\mathrm{Enc}(a) \otimes \mathrm{Enc}(b)\big) = a \circ b .
$$

If the scheme supports one operation, say addition, as often as you like, it is
**partially homomorphic**. If it supports both addition and multiplication a
limited number of times, it is **somewhat homomorphic**, or **leveled** when the
limit is fixed in advance by the parameters. If it supports both without limit,
it is **fully homomorphic** (FHE). Addition and multiplication are enough for
everything: on bits, addition mod 2 is XOR and multiplication is AND, and XOR
and AND together build any Boolean circuit, so a scheme that does both on
encrypted bits can run any program, given time.

The question was first asked in 1978. Ronald Rivest and Leonard Adleman, two of
the three inventors of RSA, wrote with Michael Dertouzos, the director of MIT's
Laboratory for Computer Science, a paper called "On Data Banks and Privacy
Homomorphisms". Their example was a loan company that keeps its customer
records on a time-sharing computer run by someone else. They noticed that RSA,
published a few months earlier, could multiply encrypted numbers, and asked
whether some encryption could support the whole range of operations a data bank
needs, so the computer could do the work without reading the data. They offered
several candidate "privacy homomorphisms"; all were insecure, some against an
attacker who knew just a few plaintexts. The general question stayed open for
thirty-one years.

The first answer, Craig Gentry's in 2009, is the turning point of this chapter.
Before it came a run of schemes that do one operation well (§12.2 to §12.6), and
after it a run of schemes that made the impossible merely slow and then, for
some jobs, practical (§12.7 to §12.11). Figure 12.2 shows the whole road.

<figure class="mars-fig">
<svg viewBox="0 0 640 500" width="640" role="img" aria-label="Timeline of homomorphic encryption from the 1978 privacy homomorphisms paper to the 2026 ISO ballots" fill="currentColor" font-size="14">
<line x1="78" y1="10" x2="78" y2="492" stroke="currentColor" stroke-width="1.5"/>
<text x="64" y="27" text-anchor="end" font-weight="bold">1978</text>
<circle cx="78" cy="22" r="3.5"/>
<text x="92" y="27">Rivest, Adleman, Dertouzos ask for privacy homomorphisms</text>
<text x="64" y="53" text-anchor="end" font-weight="bold">1982</text>
<circle cx="78" cy="48" r="3.5"/>
<text x="92" y="53">Goldwasser-Micali: encrypted bits that XOR</text>
<text x="64" y="79" text-anchor="end" font-weight="bold">1985</text>
<circle cx="78" cy="74" r="3.5"/>
<text x="92" y="79">ElGamal: ciphertexts multiply</text>
<text x="64" y="105" text-anchor="end" font-weight="bold">1999</text>
<circle cx="78" cy="100" r="3.5"/>
<text x="92" y="105">Paillier: ciphertexts add, as often as you like</text>
<text x="64" y="131" text-anchor="end" font-weight="bold">2005</text>
<circle cx="78" cy="126" r="3.5"/>
<text x="92" y="131">Boneh-Goh-Nissim: many additions and one multiplication</text>
<text x="64" y="157" text-anchor="end" font-weight="bold">2009</text>
<circle cx="78" cy="152" r="5"/>
<text x="92" y="157" font-weight="bold">Gentry: the first fully homomorphic scheme, bootstrapping</text>
<text x="64" y="183" text-anchor="end" font-weight="bold">2010</text>
<circle cx="78" cy="178" r="3.5"/>
<text x="92" y="183">van Dijk, Gentry, Halevi, Vaikuntanathan: FHE over the integers</text>
<text x="64" y="209" text-anchor="end" font-weight="bold">2011</text>
<circle cx="78" cy="204" r="3.5"/>
<text x="92" y="209">Gentry-Halevi: 30 minutes per bootstrap; BGV from LWE</text>
<text x="64" y="235" text-anchor="end" font-weight="bold">2012</text>
<circle cx="78" cy="230" r="3.5"/>
<text x="92" y="235">BFV: Brakerski, then Fan and Vercauteren</text>
<text x="64" y="261" text-anchor="end" font-weight="bold">2013</text>
<circle cx="78" cy="256" r="3.5"/>
<text x="92" y="261">GSW: ciphertexts as matrices; IBM releases HElib</text>
<text x="64" y="287" text-anchor="end" font-weight="bold">2015</text>
<circle cx="78" cy="282" r="3.5"/>
<text x="92" y="287">FHEW: one gate bootstrapped in under a second</text>
<text x="64" y="313" text-anchor="end" font-weight="bold">2016</text>
<circle cx="78" cy="308" r="3.5"/>
<text x="92" y="313">TFHE: under 0.1 s per gate, later about 13 ms</text>
<text x="64" y="339" text-anchor="end" font-weight="bold">2017</text>
<circle cx="78" cy="334" r="3.5"/>
<text x="92" y="339">CKKS: approximate arithmetic on real numbers</text>
<text x="64" y="365" text-anchor="end" font-weight="bold">2018</text>
<circle cx="78" cy="360" r="3.5"/>
<text x="92" y="365">HomomorphicEncryption.org security standard; SEAL open source</text>
<text x="64" y="391" text-anchor="end" font-weight="bold">2019</text>
<circle cx="78" cy="386" r="3.5"/>
<text x="92" y="391">ISO/IEC 18033-6: Paillier and exponential ElGamal</text>
<text x="64" y="417" text-anchor="end" font-weight="bold">2021</text>
<circle cx="78" cy="412" r="3.5"/>
<text x="92" y="417">Li-Micciancio key recovery from CKKS; Google's transpiler</text>
<text x="64" y="443" text-anchor="end" font-weight="bold">2022</text>
<circle cx="78" cy="438" r="3.5"/>
<text x="92" y="443">OpenFHE succeeds PALISADE; Gödel Prize for BV and BGV</text>
<text x="64" y="469" text-anchor="end" font-weight="bold">2024</text>
<circle cx="78" cy="464" r="5"/>
<text x="92" y="469" font-weight="bold">Apple ships BFV in Live Caller ID Lookup and Photos</text>
<text x="64" y="495" text-anchor="end" font-weight="bold">2026</text>
<circle cx="78" cy="490" r="3.5"/>
<text x="92" y="495">ISO/IEC 28033 parts 3 and 4 at final ballot</text>
</svg>
<figcaption>Figure 12.2. Forty-eight years of computing on ciphertexts. Partially homomorphic schemes came first; Gentry's 2009 construction opened the fully homomorphic era, and fifteen years later it shipped in phones.</figcaption>
</figure>

Before any scheme, two warnings that run through the whole chapter.

First, **a homomorphic scheme is malleable by design.** If the server can turn
$\mathrm{Enc}(a)$ into $\mathrm{Enc}(f(a))$ for the function you asked for, it
can do the same for a function you did not ask for. Nothing in the ciphertext
says which computation was run. Book 1's
[Defining security](../../book/17-Defining-Security.md) chapter calls the
strongest goal for encryption IND-CCA2: an attacker who may ask for decryptions
of any ciphertext except the target learns nothing about the target. A
homomorphic scheme can never meet it, because the attacker can turn the target
into a related ciphertext, ask for that one to be decrypted, and undo the
change. The best a homomorphic scheme offers is IND-CPA: secure against an
attacker who sees ciphertexts and can encrypt, but never sees a decryption.
§12.5 shows what that means for a payroll, and §12.10 shows that even showing
decrypted results can be too much.

Second, **the server works blind.** It cannot branch on the data, since it does
not know which way the branch goes; it must compute both sides. It cannot stop a
loop early when the answer is found. It does not know whether the answer is
right, and neither do you, unless something else proves it. Homomorphic
encryption hides data from the computer; it does not make the computer honest.

## 12.2 Homomorphisms by accident: RSA and ElGamal

*Level: beginner.*

Rivest, Adleman and Dertouzos started from a property of RSA that its inventors
had not designed in. Textbook RSA encrypts by raising to a public power:
$c = m^e \bmod n$. Multiply two ciphertexts and the powers combine:

$$
c_1 \cdot c_2 = m_1^e \cdot m_2^e = (m_1 m_2)^e \pmod n ,
$$

which is the encryption of $m_1 m_2$. Anyone holding the public key, or just
two ciphertexts, can multiply hidden numbers.

**By hand.** Take the tiny RSA key $p = 5$, $q = 11$, $n = 55$, $e = 3$, $d = 27$
(check: $3 \cdot 27 = 81 = 2 \cdot 40 + 1$, and $\varphi(55) = 40$). Encrypt 2 and
3:

$$
2^3 = 8, \qquad 3^3 = 27 .
$$

Multiply the ciphertexts: $8 \cdot 27 = 216 = 3 \cdot 55 + 51$, so the product is
51. Decrypt it: $51^{27} \bmod 55 = 6$. And indeed $6^3 = 216 \equiv 51$: the
product of the ciphertexts is exactly the encryption of $2 \cdot 3$. The person
who multiplied 8 by 27 learned nothing about 2, 3 or 6, assuming RSA hides them,
which brings us to the catch. Textbook RSA is deterministic, so it does not hide
small or guessable messages at all: anyone can encrypt 2 and compare. Real RSA
encryption adds random padding (OAEP, in book 1's
[RSA chapter](../../book/13-RSA.md)), and the padding destroys the
homomorphism, on purpose. Multiplying two OAEP ciphertexts gives a number that
does not decrypt to anything valid.

**ElGamal multiplies too, and stays randomized.** Book 1's
[discrete-log chapter](../../book/14-Discrete-Log-Systems.md) describes Taher
ElGamal's 1985 scheme. In a group of prime order $q$ with generator $g$, the
private key is $x$ and the public key $h = g^x$. To encrypt $m$ (a group
element), pick a fresh random $r$ and send

$$
(c_1, c_2) = (g^r,\; m \cdot h^r) .
$$

To decrypt, compute $c_2 / c_1^x = m h^r / g^{rx} = m$. Multiply two
ciphertexts component by component:

$$
(g^{r_1} g^{r_2},\; m_1 h^{r_1} \cdot m_2 h^{r_2}) = (g^{r_1 + r_2},\; m_1 m_2 \cdot h^{r_1 + r_2}) ,
$$

an encryption of $m_1 m_2$ under the randomness $r_1 + r_2$. Unlike textbook
RSA, ElGamal is IND-CPA secure when the decisional Diffie-Hellman problem is
hard in the group, so this is a genuinely secure multiplicative homomorphism.

**Exponential ElGamal adds.** Multiplying group elements is rarely what anyone
wants. Put the message in the exponent instead: encrypt the number $m$ as the
group element $g^m$,

$$
\mathrm{Enc}(m) = (g^r,\; g^m h^r) .
$$

Now multiplying ciphertexts multiplies $g^{m_1} g^{m_2} = g^{m_1 + m_2}$: the
hidden numbers add. Decryption gives back $g^m$, not $m$, and getting $m$ from
$g^m$ is a discrete logarithm. That sounds fatal, but if $m$ is known to be
small, say a vote count below a million, the decryptor just tries
$g^0, g^1, g^2, \dots$ until one matches, or uses the baby-step giant-step method
of book 1's [discrete-log chapter](../../book/14-Discrete-Log-Systems.md) for a
square root of the work. Exponential ElGamal is the workhorse of verifiable
elections; Chapter 16 builds a whole election on it.

**By hand.** Work in the group of order $q = 11$ inside $\mathbb{Z}_{23}^*$,
generated by $g = 4$. Its elements are the powers

$$
4^0, 4^1, \dots, 4^{10} = 1, 4, 16, 18, 3, 12, 2, 8, 9, 13, 6 .
$$

Let the private key be $x = 7$, so $h = 4^7 = 8$. Encrypt $m = 2$ with $r = 3$:
$c_1 = 4^3 = 18$ and $c_2 = 4^2 \cdot 8^3 = 16 \cdot 6 = 96 \equiv 4$, so the
ciphertext is $(18, 4)$. Encrypt $m = 3$ with $r = 5$: $c_1 = 4^5 = 12$ and
$c_2 = 4^3 \cdot 8^5 = 18 \cdot 16 = 288 \equiv 12$, giving $(12, 12)$. Multiply
component by component: $(18 \cdot 12, 4 \cdot 12) = (216, 48) \equiv (9, 2)$.
Decrypt: $9^7 \equiv 4$, and $4^{-1} \equiv 6$ (since $4 \cdot 6 = 24 \equiv 1$), so
$g^m = 2 \cdot 6 = 12$. In the list of powers, $12 = 4^5$, so $m = 5 = 2 + 3$.

### Code it

The block checks both hand calculations and tallies five yes/no ballots with
exponential ElGamal. The groups are toys; real systems use elliptic curves with
256-bit group orders, and RSA moduli of 3072 bits.

```python
# Textbook RSA multiplies; ElGamal multiplies; exponential ElGamal adds.
# Toy sizes: real RSA moduli have 3072 bits, real ElGamal uses 256-bit curves.

n, e, d = 55, 3, 27                    # RSA with p = 5, q = 11
c2, c3 = pow(2, e, n), pow(3, e, n)
print("RSA:", c2, "*", c3, "=", c2 * c3 % n, "decrypts to", pow(c2 * c3 % n, d, n))

p, q, g = 23, 11, 4                    # g = 4 has order 11 mod 23
x = 7                                  # private key
h = pow(g, x, p)                       # public key

def enc(m, r):                         # exponential ElGamal: the message goes in the exponent
    return pow(g, r, p), pow(g, m, p) * pow(h, r, p) % p

def mul(c, k):                         # componentwise product of two ciphertexts
    return c[0] * k[0] % p, c[1] * k[1] % p

def dec(c):
    gm = c[1] * pow(c[0], q - x, p) % p                 # c2 / c1^x = g^m
    return next(m for m in range(q) if pow(g, m, p) == gm)   # small discrete log by search

a, b = enc(2, 3), enc(3, 5)
print("ElGamal:", a, "*", b, "=", mul(a, b), "decrypts to", dec(mul(a, b)))

ballots = [enc(v, r) for v, r in [(1, 2), (0, 9), (1, 4), (1, 6), (0, 3)]]
total = (1, 1)
for c in ballots:
    total = mul(total, c)
print("five ballots, tally:", total, "->", dec(total), "yes")
```

```text
RSA: 8 * 27 = 51 decrypts to 6
ElGamal: (18, 4) * (12, 12) = (9, 2) decrypts to 5
five ballots, tally: (16, 2) -> 3 yes
```

The tally is a single ciphertext; whoever holds $x$ learns that three voted yes,
and nothing about who. In a real election nobody holds $x$ alone: it is shared
among trustees who decrypt only the final tally, the threshold decryption of
[Chapter 4](04-Threshold-Cryptography.md). The `range(q)` search is the
small-message limit in action: with a group of order 11, totals above 10 wrap
around and come out wrong.

### Malleability is the price

Each of these homomorphisms is also a way to tamper. Given an RSA ciphertext
$c$ of an unknown $m$, anyone can compute $c \cdot 2^e$, an encryption of $2m$.
Given an exponential-ElGamal ciphertext $(c_1, c_2)$ of $m$, anyone can compute
$(c_1, c_2 \cdot g)$, an encryption of $m + 1$, or raise both parts to the power
$k$ to get an encryption of $km$. The attacker needs no key and learns nothing
about $m$, but changes it in a controlled way. A scheme where that is possible
is called **malleable**, and the formal statement is the one from §12.1: no
scheme that is homomorphic in this public way can be IND-CCA2 secure.

Daniel Bleichenbacher's 1998 attack on RSA PKCS #1 v1.5 padding, told in the
cryptanalysis book's [attacks on RSA](../cryptanalysis/13-Attacks-on-RSA.md)
chapter, is a practical example of how far RSA's multiplicative structure goes:
the attacker multiplies the target ciphertext by $s^e$ for chosen $s$, sends
each result to a server, and learns from the server's error messages whether
$s \cdot m$ is well padded. A million or so queries recover the message. The
homomorphism there was the weapon. In the schemes of this chapter it is the
feature, and the rest of the system must be built so that nobody can use it as a
weapon: inputs are signed or proved well formed, and decryption is done only on
the ciphertexts the protocol says should be decrypted.

!!! note "Life story: privacy homomorphisms"
    **Born:** 1978, Ronald Rivest, Leonard Adleman and Michael Dertouzos at
    MIT, "On Data Banks and Privacy Homomorphisms", in the volume
    *Foundations of Secure Computation* · **Purpose:** to let a computer
    service operate on a customer's data without being able to read it ·
    **Helped:** named the problem and noticed RSA's multiplicative property;
    every scheme in this chapter answers their question · **Status:** their
    own candidate schemes were broken quickly; the question was answered in
    full by Gentry in 2009

## 12.3 Goldwasser-Micali: encrypted bits that add

*Level: intermediate.*

In 1982 Shafi Goldwasser and Silvio Micali, two graduate students at Berkeley,
published "Probabilistic Encryption and How to Play Mental Poker Keeping Secret
All Partial Information". The paper is famous for its definitions: it was the
first to say precisely what it means for encryption to hide *everything* about
a message (semantic security, today's IND-CPA), and it argued that any scheme
meeting the definition must be randomized, so that encrypting the same message
twice gives different ciphertexts. Its scheme encrypts one bit at a time, and it
happens to be homomorphic for XOR. Goldwasser and Micali received the Turing
Award for this line of work in 2012.

The scheme uses **quadratic residues**. A number $a$ coprime to $n = pq$ is a
quadratic residue (a "square") mod $n$ if $a \equiv y^2$ for some $y$. Knowing
$p$ and $q$, it is easy to tell: $a$ is a square mod $n$ exactly when it is a
square mod $p$ and mod $q$, and Euler's criterion
$a^{(p-1)/2} \equiv \pm 1 \pmod p$ answers each (the mathematics book's
[square roots chapter](../mathematics/05-Square-Roots-Mod-p.md) has the
details). Without the factors, nobody knows a fast way to tell squares from the
non-squares whose Jacobi symbol is $+1$; that is the **quadratic residuosity
assumption**.

- **Key:** primes $p, q$; $n = pq$ is public, together with a number $x$ that is
  a non-square mod $p$ and mod $q$ (so its Jacobi symbol is $+1$ and it looks
  like a square to anyone without the factors).
- **Encrypt a bit $b$:** pick a random $r$ coprime to $n$ and send
  $c = x^b r^2 \bmod n$. A 0 becomes a random square, a 1 a random non-square.
- **Decrypt:** $b = 0$ if $c$ is a square mod $p$, otherwise $b = 1$.

**Why it adds bits.** Multiply two ciphertexts:
$x^{b_1} r_1^2 \cdot x^{b_2} r_2^2 = x^{b_1 + b_2} (r_1 r_2)^2$. If both bits are
1, the factor $x^2$ is itself a square, so the product is a square, an
encryption of 0. The product encrypts $b_1 \oplus b_2$.

**By hand.** Take $p = 7$ and $q = 11$, so $n = 77$. The squares mod 7 are
$\{1, 2, 4\}$ and mod 11 are $\{1, 3, 4, 5, 9\}$. The number $x = 13$ is $6$ mod
7 and $2$ mod 11, a non-square in both. Encrypt the bit 1 twice, with $r = 4$
and $r = 10$:

$$
13 \cdot 4^2 = 208 \equiv 54, \qquad 13 \cdot 10^2 = 1300 \equiv 68 \pmod{77} .
$$

Decrypt 54: it is $5$ mod 7, not a square, so the bit is 1. Multiply the
ciphertexts: $54 \cdot 68 = 3672 \equiv 53 \pmod{77}$. Now $53 \equiv 4 \pmod 7$
and $53 \equiv 9 \pmod{11}$, squares in both, so 53 decrypts to $0 = 1 \oplus 1$.

The scheme was never practical: every bit of the message becomes a number the
size of an RSA modulus, an expansion of thousands of times. Its place in this
chapter is as the first scheme that was both provably secure (under a stated
assumption) and homomorphic. It also showed the shape of what was to come: a
homomorphism over a small message space (bits), from a hard problem about
hiding membership in a subgroup. Paillier's scheme, Boneh-Goh-Nissim, and in a
sense all of the lattice schemes follow that pattern.

!!! note "Life story: Goldwasser-Micali encryption"
    **Born:** 1982, Shafi Goldwasser and Silvio Micali, STOC; journal version
    1984 · **Purpose:** the first encryption scheme with a proof that it hides
    all partial information about the message · **Helped:** defined semantic
    security and probabilistic encryption; XOR-homomorphic, it served in
    early voting and private-information-retrieval designs · **Status:**
    retired from practice (one modulus-sized ciphertext per bit); its
    definitions are used every day

## 12.4 Paillier: adding numbers

*Level: intermediate.*

The scheme most people mean by "additively homomorphic encryption" was
presented by Pascal Paillier, a French cryptographer then working at Gemplus,
at EUROCRYPT 1999 in Prague. It encrypts numbers modulo $n$, a 3072-bit RSA
modulus in today's terms, and multiplying two ciphertexts adds the numbers.
Raising a ciphertext to a known power $k$ multiplies its number by $k$. There
is no limit on how many times either can be done.

The arithmetic lives modulo $n^2$. Here is the version used in practice, with
the generator fixed to $g = n + 1$, a simplification Ivan Damgård and Mads
Jurik suggested in 2001:

- **Key generation:** pick primes $p, q$ of the same size, and set
  $n = pq$, $\lambda = \operatorname{lcm}(p - 1, q - 1)$ and
  $\mu = \lambda^{-1} \bmod n$. The public key is $n$; the private key is
  $(\lambda, \mu)$.
- **Encrypt** $m \in \{0, \dots, n - 1\}$: pick a fresh random $r$ coprime to
  $n$ and compute
  $$
  c = (n + 1)^m \cdot r^n \bmod n^2 .
  $$
- **Decrypt:** with $L(u) = (u - 1)/n$ (an exact integer division),
  $$
  m = L\big(c^\lambda \bmod n^2\big) \cdot \mu \bmod n .
  $$

### By hand: three votes with $n = 77$

Take $p = 7$ and $q = 11$. Then $n = 77$, $n^2 = 5929$,
$\lambda = \operatorname{lcm}(6, 10) = 30$, and $\mu = 30^{-1} \bmod 77 = 18$,
because $30 \cdot 18 = 540 = 7 \cdot 77 + 1$.

Three committee members vote on a motion: Ana yes (1), Ben no (0), Cy yes (1).
Each encrypts with a random $r$ of their own:

| Voter | $m$ | $r$ | $(78)^m \bmod 5929$ | $r^{77} \bmod 5929$ | ciphertext |
|---|---|---|---|---|---|
| Ana | 1 | 2 | 78 | 3791 | $78 \cdot 3791 \equiv 5177$ |
| Ben | 0 | 3 | 1 | 3155 | $3155$ |
| Cy | 1 | 5 | 78 | 1697 | $78 \cdot 1697 \equiv 1928$ |

The counter multiplies the three ciphertexts mod 5929:
$5177 \cdot 3155 \equiv 4969$, then $4969 \cdot 1928 \equiv 4897$. The key holder
decrypts the one number 4897:

$$
4897^{30} \bmod 5929 = 4621, \qquad L(4621) = \frac{4621 - 1}{77} = 60, \qquad
60 \cdot 18 = 1080 \equiv 2 \pmod{77} .
$$

Two votes for the motion. Notice that 4897 is exactly what an encryption of 2
with $r = 2 \cdot 3 \cdot 5 = 30$ would be: $78^2 \cdot 30^{77} \equiv 4897$. The
product of the ciphertexts is an honest ciphertext of the sum, with the
product of the randomness.

To see a **scalar multiplication**, raise Ana's ciphertext to the fifth power:
$5177^5 \bmod 5929 = 2760$, which decrypts to $5 = 5 \cdot 1$. A known weight can
be applied to a hidden number; two hidden numbers cannot be multiplied
together.

### Why it works

Two facts carry the whole scheme.

**The message sits in an exponent of $n + 1$, and that exponent is easy to
read.** By the binomial theorem,

$$
(1 + n)^m = 1 + mn + \binom{m}{2} n^2 + \cdots \equiv 1 + mn \pmod{n^2} ,
$$

because every later term contains $n^2$. Check it on the numbers above:
$78^3 \bmod 5929 = 232 = 1 + 3 \cdot 77$. So a power of $n + 1$ is a number of
the form $1 + (\text{something}) \cdot n$, and $L$ reads off the something.
Multiplying $(1+n)^{m_1}$ by $(1+n)^{m_2}$ adds the exponents, and since
$(1+n)^n \equiv 1 + n \cdot n \equiv 1$, the exponents add modulo $n$.

**Raising to $\lambda$ wipes out the randomness.** The numbers coprime to $n$ mod
$n^2$ form a group of size $n \varphi(n)$, and every element raised to the power
$n\lambda$ gives 1 (this is Carmichael's theorem: the exponent $n\lambda$ is a
multiple of the order of every element). So $(r^n)^\lambda = r^{n\lambda} \equiv 1$.
Putting the two facts together,

$$
c^\lambda = (1 + n)^{m\lambda} \cdot r^{n\lambda} \equiv 1 + m\lambda n \pmod{n^2} ,
$$

so $L(c^\lambda) = m\lambda \bmod n$, and multiplying by $\mu = \lambda^{-1}$ gives
$m$. In the hand example $L = 60 = 2 \cdot 30$: the vote total times $\lambda$.

The homomorphism is now one line:

$$
\mathrm{Enc}(m_1; r_1) \cdot \mathrm{Enc}(m_2; r_2) = (1 + n)^{m_1 + m_2} (r_1 r_2)^n
= \mathrm{Enc}(m_1 + m_2;\, r_1 r_2) ,
$$

and $\mathrm{Enc}(m; r)^k = \mathrm{Enc}(km;\, r^k)$.

**Why it is secure.** An encryption of 0 is $r^n$, a random $n$-th power mod
$n^2$. Paillier's scheme is IND-CPA secure exactly when random $n$-th powers
cannot be told apart from random numbers mod $n^2$: the **decisional composite
residuosity** (DCR) assumption. Whoever factors $n$ can compute $\lambda$ and
decrypt, so Paillier is never stronger than factoring; a quantum computer
running Shor's algorithm would break it. Multiplying a ciphertext by a fresh
encryption of 0 gives a new-looking ciphertext of the same message, called
**rerandomizing**; a server should do it before returning a result, so the
result does not reveal how it was computed.

Negative numbers and fixed-point values are handled by encoding: a number
$-k$ is stored as $n - k$, and anything above $n/2$ is read back as negative.
Sums must stay below $n/2$ in absolute value, which with a 3072-bit $n$ is never
a practical limit. Damgård and Jurik's 2001 generalization works modulo
$n^{s+1}$ to encrypt larger messages with less expansion. The ciphertext is
twice the size of the modulus, so a 3072-bit key turns each number into 768
bytes.

### Code it

A complete Paillier: Miller-Rabin prime generation, key generation, encryption,
decryption, and a tally of 25 yes/no votes. The modulus has 1024 bits so the
block runs in a fraction of a second; real deployments use 3072. The `random`
module is seeded so the output below repeats; real keys and real $r$ values
must come from `secrets`.

```python
import random
from math import gcd

random.seed(2026)        # random is for the demo; real keys must come from secrets

def is_prime(n, rounds=40):            # Miller-Rabin
    if n < 2:
        return False
    for small in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29):
        if n % small == 0:
            return n == small
    d, r = n - 1, 0
    while d % 2 == 0:
        d, r = d // 2, r + 1
    for _ in range(rounds):
        x = pow(random.randrange(2, n - 1), d, n)
        if x in (1, n - 1):
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

def random_prime(bits):
    while True:
        c = random.getrandbits(bits) | (3 << (bits - 2)) | 1   # top two bits set
        if is_prime(c):
            return c

def keygen(bits):
    while True:
        p, q = random_prime(bits // 2), random_prime(bits // 2)
        if p != q and gcd(p * q, (p - 1) * (q - 1)) == 1:
            break
    n = p * q
    lam = (p - 1) * (q - 1) // gcd(p - 1, q - 1)
    return n, (lam, pow(lam, -1, n))   # public n; private (lambda, mu)

def encrypt(n, m):
    while True:
        r = random.randrange(1, n)
        if gcd(r, n) == 1:
            break
    return pow(n + 1, m, n * n) * pow(r, n, n * n) % (n * n)

def decrypt(n, key, c):
    lam, mu = key
    return (pow(c, lam, n * n) - 1) // n * mu % n

def add(n, c1, c2):                    # Enc(a) * Enc(b) = Enc(a + b)
    return c1 * c2 % (n * n)

def scale(n, c, k):                    # Enc(a) ^ k = Enc(k * a)
    return pow(c, k, n * n)

n, key = keygen(1024)                  # toy: real deployments use n of 3072 bits
print("n has", n.bit_length(), "bits; ciphertexts are numbers mod n squared,", (n * n).bit_length(), "bits")
print("Enc(1) twice equal?", encrypt(n, 1) == encrypt(n, 1))

votes = [random.choice((0, 1)) for _ in range(25)]
ballots = [encrypt(n, v) for v in votes]
tally = encrypt(n, 0)
for c in ballots:                      # the counter never sees a vote
    tally = add(n, tally, c)
yes = decrypt(n, key, tally)
print("yes:", yes, "no:", 25 - yes, "(check:", sum(votes), ")")
print("three times the tally:", decrypt(n, key, scale(n, tally, 3)))
```

```text
n has 1024 bits; ciphertexts are numbers mod n squared, 2047 bits
Enc(1) twice equal? False
yes: 11 no: 14 (check: 11 )
three times the tally: 33
```

Starting the tally from a fresh encryption of 0 rerandomizes it, so the final
ciphertext does not reveal which ballots went into it. Two encryptions of the
same vote differ, which is what IND-CPA demands: an observer who sees Ana's
ciphertext cannot test it against an encryption of 1.

What the tally does **not** check is that each ballot encrypts 0 or 1. A voter
who encrypts 5, or $n - 3$ (which decrypts as $-3$), adds or removes several
votes at once, and the counter cannot see it. Real systems attach a
zero-knowledge proof to each ballot that it encrypts 0 or 1, the OR-proof of
[Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md), and the election of
Chapter 16 does exactly that.

**Where Paillier is used.** Inside threshold ECDSA (the GG18, GG20 and CGGMP
protocols of [Chapter 4](04-Threshold-Cryptography.md)), Paillier encryption
lets two parties multiply their secret shares: one sends its share encrypted,
the other scales it by its own share and adds a mask. The 2023
threshold-wallet breaks lived right next to it: BitForge exploited Paillier
moduli whose well-formedness was never proved, and TSSHOCK exploited weak
zero-knowledge proofs in the same protocols. Paillier also appears in
private statistics, in some electronic voting systems, in private set
intersection protocols and in federated-learning aggregation. ISO/IEC 18033-6
(2019) standardizes it together with exponential ElGamal as the two
partially homomorphic encryption mechanisms.

!!! note "Life story: Paillier encryption"
    **Born:** 1999, Pascal Paillier, "Public-Key Cryptosystems Based on
    Composite Degree Residuosity Classes", EUROCRYPT, Prague ·
    **Purpose:** public-key encryption whose ciphertexts add without limit ·
    **Helped:** vote tallies, private statistics, private set intersection and
    the multiplication step of threshold ECDSA; standardized in ISO/IEC
    18033-6 (2019) · **Status:** current; rests on factoring-type assumptions,
    so a large quantum computer would break it

## 12.5 Break it: the doubled salary

*Level: intermediate.*

A company keeps its payroll table in a cloud database. Each salary is stored
Paillier-encrypted under the payroll office's public key, so the cloud
provider, the database administrators and anyone who steals a backup see only
ciphertexts. The design even lets the provider compute totals for the finance
department without decrypting anything: it multiplies the ciphertexts and hands
back an encrypted sum. Everyone is pleased.

Mallory is a database administrator. He cannot read any salary, his own
included. But he can write to the table, and the public key is public. He
squares his own ciphertext, which doubles the hidden number, and multiplies in
a fresh encryption of 5,000 for good measure. At the end of the month the
payroll office decrypts the table and pays what it finds. The same trick works
on textbook RSA, where multiplying by $2^e$ doubles the message.

```python
import hashlib, hmac, secrets
from math import gcd

# Paillier with two fixed Mersenne primes (toy: a real n has 3072 bits).
p, q = 2**107 - 1, 2**127 - 1
n, n2 = p * q, (p * q) ** 2
lam = (p - 1) * (q - 1) // gcd(p - 1, q - 1)
mu = pow(lam, -1, n)

def enc(m):
    return pow(n + 1, m, n2) * pow(secrets.randbelow(n - 2) + 2, n, n2) % n2

def dec(c):
    return (pow(c, lam, n2) - 1) // n * mu % n

# The payroll table stores salaries encrypted to the payroll office's key.
table = {"ana": enc(61_000), "mallory": enc(48_000)}

# Mallory can write to the table but has no key. He uses only the public n.
table["mallory"] = pow(table["mallory"], 2, n2)          # Enc(m)^2 = Enc(2m)
table["mallory"] = table["mallory"] * enc(5_000) % n2    # times Enc(5000): add 5000
print("payroll pays mallory:", dec(table["mallory"]))

# RSA is no better: multiply by 2^e and the hidden number doubles.
N, e, d = 3233, 17, 2753               # textbook RSA, p = 61, q = 53
c = pow(1500, e, N)
print("RSA salary 1500 becomes:", pow(c * pow(2, e, N) % N, d, N))

# Fix it: the payroll office tags each stored ciphertext with a MAC.
mac_key = secrets.token_bytes(32)
def tag(name, c):
    return hmac.new(mac_key, name.encode() + c.to_bytes(64, "big"), hashlib.sha256).digest()

c = enc(48_000)
table = {"mallory": (c, tag("mallory", c))}
c, t = table["mallory"]
table["mallory"] = (pow(c, 2, n2), t)                     # same tampering
c, t = table["mallory"]
print("tag still valid?", hmac.compare_digest(t, tag("mallory", c)))
```

```text
payroll pays mallory: 101000
RSA salary 1500 becomes: 3000
tag still valid? False
```

Mallory never learned a single salary. Confidentiality held perfectly, and the
system was still broken, because the payroll office trusted that a ciphertext
which decrypts must be a ciphertext it wrote. Encryption, homomorphic or not,
says nothing about who produced a ciphertext.

**The decryption oracle.** The same malleability turns any careless decryption
service into a key-free reader. Suppose the payroll office will decrypt any
ciphertext an employee submits, "to check your own salary". Mallory takes Ana's
ciphertext $c_A$, multiplies it by $\mathrm{Enc}(1)$ so that it no longer looks
like hers, and submits it. The office decrypts and tells him $61{,}001$. He
subtracts 1. This is the chosen-ciphertext attack that IND-CCA2 rules out, and
the reason a homomorphic scheme can never meet IND-CCA2.

### Fix it

The fixes come from outside the encryption scheme, because inside it the
malleability is the point.

- **Authenticate what is stored.** The payroll office attaches a MAC (book 1's
  [message authentication chapter](../../book/10-Message-Authentication.md)) or
  a signature to each ciphertext it writes, binding it to the employee's name,
  as in the last lines of the code. A tampered ciphertext fails the check. The
  catch is that a *computed* ciphertext, such as the provider's encrypted total,
  carries no valid tag, since nobody with the MAC key made it. Checking
  computed results needs a different tool: either the data owner recomputes
  what it can, or the server proves that it ran the agreed function, which is
  verifiable computation (§12.14).
- **Prove inputs are well formed.** When many parties contribute ciphertexts,
  as voters do, each attaches a zero-knowledge proof that its ciphertext
  encrypts an allowed value ([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)),
  and a signature that binds it to the contributor.
- **Decrypt only what the protocol says.** Nobody should run a decryption
  service for arbitrary ciphertexts. In an election only the final tally is
  decrypted, and only by a quorum of trustees.
- **Use non-malleable encryption where no computation is needed.** Data that is
  only stored and fetched should be encrypted with an authenticated scheme
  (AES-GCM, or HPKE for public-key encryption), and converted only where a
  computation actually needs it.

## 12.6 One multiplication: Boneh-Goh-Nissim

*Level: intermediate.*

By 2005 there were good schemes for adding and good schemes for multiplying,
but none for both. Dan Boneh, Eu-Jin Goh and Kobbi Nissim found the first
scheme that does both, if only a little: any number of additions, then **one**
multiplication, then any number of additions again. Their paper at the Theory
of Cryptography Conference that year was called "Evaluating 2-DNF Formulas on
Ciphertexts", after the kind of formula one multiplication allows.

The tool that supplies the multiplication is a **pairing**: a map
$e: G \times G \to G_T$ between two groups that satisfies
$e(g^a, g^b) = e(g, g)^{ab}$. The mathematics book's
[pairings chapter](../mathematics/13-Counting-Points-and-Pairings.md) builds it
from elliptic curves. A pairing multiplies exponents, and in an
exponential-ElGamal-like scheme the exponents are the messages. BGN works in a
group $G$ whose order is a composite $n = q_1 q_2$, the product of two secret
primes:

- **Encrypt** a small number $m$ as $c = g^m h^r$, where $g$ generates $G$, $r$ is
  random, and $h$ is a public element of order $q_1$.
- **Decrypt** by raising to the secret $q_1$: $c^{q_1} = (g^{q_1})^m$, because
  $h^{q_1} = 1$. The random part is gone, and $m$ is found by a small discrete
  logarithm, as in exponential ElGamal.
- **Add** by multiplying ciphertexts, as usual.
- **Multiply once** by pairing two ciphertexts: $e(c_1, c_2)$ expands into
  $e(g, g)^{m_1 m_2}$ times factors that all involve $h$, so it is an encryption
  of $m_1 m_2$ in the target group $G_T$. There ciphertexts still add, but there
  is no pairing on $G_T$, so no second multiplication.

Security rests on the **subgroup decision** assumption: without the factors of
$n$, a random element of the order-$q_1$ subgroup looks like a random element of
$G$. Like exponential ElGamal, BGN only decrypts small results.

One multiplication sounds like little, but it reaches further than additions
alone. It computes inner products of two encrypted vectors, checks whether an
encrypted pair of bits are both set, and evaluates any formula that is an OR of
ANDs of two literals each, which is what "2-DNF" means. Boneh, Goh and Nissim
used it to cut the communication of private information retrieval
([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)) and of an
electronic-voting protocol. As a step towards full homomorphism it mostly showed
how hard the next step was: no one could see how to get two multiplications from
pairings, and multilinear maps, which would give more, are a story of broken
candidates.

!!! note "Life story: Boneh-Goh-Nissim encryption"
    **Born:** 2005, Dan Boneh, Eu-Jin Goh and Kobbi Nissim, Theory of
    Cryptography Conference · **Purpose:** unlimited additions plus one
    multiplication on encrypted data, using pairings on a composite-order
    group · **Helped:** inner products and 2-DNF formulas on ciphertexts,
    cheaper private information retrieval and voting protocols; a model for
    later pairing-based designs · **Status:** a landmark rather than a tool;
    overtaken by lattice schemes, and broken by quantum computers like every
    pairing scheme

## 12.7 Noise: computing until the message drowns

*Level: intermediate.*

Every scheme so far is built on a group, and a group has only one operation.
To get both addition and multiplication you need something with two
operations, a ring, and the encryption schemes that compute in rings all carry
**noise**: each ciphertext hides its message under a small random error, and the
error is what makes the scheme secure. Adding ciphertexts adds their errors.
Multiplying them multiplies their errors. Once the error grows past a
threshold, the message is lost.

### By hand: encryption over the integers

The simplest scheme with noise uses nothing but whole numbers. It was
published in 2010 by Marten van Dijk, Craig Gentry, Shai Halevi and Vinod
Vaikuntanathan (and is named DGHV after them), as a version of Gentry's ideas
that a reader could follow with a pencil. In its secret-key form:

- **Key:** a secret odd number $p$.
- **Encrypt a bit $m$:** pick a large random $k$ and a small random $r$, and send
  $c = pk + 2r + m$. The **noise** is $2r + m$, which must stay small next to
  $p$.
- **Decrypt:** reduce $c$ modulo $p$ to the number between $-p/2$ and $p/2$, and
  take that number mod 2.

Take $p = 101$ and encrypt three 1-bits:

| Ciphertext | $k$ | $r$ | $c = 101k + 2r + 1$ | noise |
|---|---|---|---|---|
| $c_1$ | 5 | 3 | 512 | 7 |
| $c_2$ | 7 | 2 | 712 | 5 |
| $c_3$ | 4 | 1 | 407 | 3 |

Decrypt $c_1$: $512 = 5 \cdot 101 + 7$, and 7 is odd, so the bit is 1.

**Add:** $c_1 + c_2 = 1224 = 12 \cdot 101 + 12$. The noise is $7 + 5 = 12$, even,
so the result decrypts to 0, which is $1 \oplus 1$. Adding ciphertexts adds
noises.

**Multiply:** $c_1 c_2 = 512 \cdot 712 = 364{,}544 = 3609 \cdot 101 + 35$. Every
term of the product is a multiple of 101 except noise times noise, $7 \cdot 5 =
35$, which is odd, so the result decrypts to $1 = 1 \cdot 1$. Multiplying
ciphertexts multiplies noises.

**Multiply again:** $c_1 c_2 c_3 = 364{,}544 \cdot 407 = 148{,}369{,}408$. The
noise should be $35 \cdot 3 = 105$, but 105 is larger than $p/2 = 50.5$. Reduced
mod 101 it becomes 4, which is even, so the result decrypts to 0. The right
answer was $1 \cdot 1 \cdot 1 = 1$. Two multiplications were one too many for this
key. A bigger $p$ allows more multiplications, but the noise grows
exponentially with the number of multiplications in a row (the
**multiplicative depth**), so for a fixed key there is always a computation that
is too deep.

The scheme's security rests on the **approximate GCD problem**: given many
numbers $p k_i + (\text{small})$, find $p$. Without the small noises, the GCD of
two of them would reveal $p$ at once; with them, the problem is believed hard if
the sizes are chosen well (real parameters used numbers of millions of bits).
DGHV also has a public-key form, in which the public key is a list of
encryptions of 0 and a sender adds a random subset of them to her bit.

### The same thing with learning with errors

The schemes in use today are built on **learning with errors** (LWE), which the
mathematics book develops in
[Learning with errors](../mathematics/15-Learning-with-Errors.md) and the
post-quantum book places among the lattice problems in
[Lattices and their hard problems](../post-quantum/05-Lattices-and-Their-Hard-Problems.md).
The short version: for a secret vector $s$ of $n$ small numbers mod $q$, pairs
$(a, \langle a, s \rangle + e)$ with random $a$ and small error $e$ look random.
To encrypt a message $m \in \{0, \dots, t - 1\}$, scale it up by
$\Delta = q / t$ and hide it in such a pair:

$$
c = (a,\; b) \quad\text{with}\quad b = \langle a, s \rangle + e + \Delta m \pmod q .
$$

The key holder computes the **phase** $b - \langle a, s \rangle = \Delta m + e$, and
rounds it to the nearest multiple of $\Delta$ to remove $e$. This works while
$|e| < \Delta / 2$.

Adding two ciphertexts adds the phases: $\Delta(m_1 + m_2) + (e_1 + e_2)$. To
multiply, notice that the phase is a linear function of the secret,
$\varphi(s) = b - \sum a_i s_i$. The product of two phases is a quadratic function
of $s$, with one coefficient for every product $s_i s_j$. So the product
ciphertext is the list of those coefficients, scaled by $t/q$ so the message
stays at the scale $\Delta$:

$$
\frac{t}{q}\,\varphi_1 \varphi_2 = \frac{t}{q}\,(\Delta m_1 + e_1)(\Delta m_2 + e_2)
\approx \Delta m_1 m_2 + m_1 e_2 + m_2 e_1 + \cdots
$$

The noise is now roughly the old noise times the message and times the size of
the secret, and the ciphertext has grown from $n + 1$ numbers to about $n^2/2$.
This is the first-generation shape of BFV (§12.9), written over plain integers
instead of polynomials.

### Code it: watching the noise

The block encrypts 3 and 5 with $n = 8$, $t = 16$ and $q = 2^{32}$, adds them,
multiplies them, and then keeps multiplying by fresh encryptions of 3, printing
the noise and the number of terms in the ciphertext after each step until the
answer comes out wrong. The secret has 8 entries instead of the thousands real
schemes use, so it is a picture of the noise, not a secure scheme.

```python
import random
random.seed(12)                      # random is for the demo; real keys use secrets

n, t, q = 8, 16, 2**32               # toy sizes: real schemes use n = 4096 or more
D = q // t                           # Delta: where the message sits
s = [random.choice((-1, 0, 1)) for _ in range(n)]

def centered(x):                     # x mod q as a number between -q/2 and q/2
    x %= q
    return x - q if x > q // 2 else x

def encrypt(m):
    a = [random.randrange(q) for _ in range(n)]
    e = random.randint(-3, 3)
    b = (sum(ai * si for ai, si in zip(a, s)) + e + D * m) % q
    c = {(): b}                      # a ciphertext is a polynomial in the key
    for i in range(n):
        c[(i,)] = -a[i] % q
    return c

def phase(c):                        # evaluate the polynomial at the secret key
    total = 0
    for mono, coef in c.items():
        term = coef
        for i in mono:
            term *= s[i]
        total += term
    return total % q

def decrypt(c):
    return round(t * phase(c) / q) % t

def noise(c, m):
    return centered(phase(c) - D * m)

def add(c1, c2):
    out = dict(c1)
    for mono, coef in c2.items():
        out[mono] = (out.get(mono, 0) + coef) % q
    return out

def mul(c1, c2):                     # multiply the polynomials, then scale by t/q
    prod = {}
    for m1, x in c1.items():
        for m2, y in c2.items():
            mono = tuple(sorted(m1 + m2))
            prod[mono] = prod.get(mono, 0) + centered(x) * centered(y)
    return {mono: round(t * v / q) % q for mono, v in prod.items()}

x, y = encrypt(3), encrypt(5)
print("decryption works while |noise| <", D // 2)
print("fresh 3      noise", noise(x, 3), " decrypts to", decrypt(x))
print("fresh 5      noise", noise(y, 5), " decrypts to", decrypt(y))
z = add(x, y)
print("3 + 5        noise", noise(z, 8), " decrypts to", decrypt(z))
c, m = mul(x, y), 15
print("3 * 5        noise", noise(c, m), " decrypts to", decrypt(c), " terms", len(c))
for k in range(2, 20):               # keep multiplying by fresh encryptions of 3
    c, m = mul(c, encrypt(3)), m * 3 % t
    got = decrypt(c)
    flag = "" if got == m else "  <- FAILED"
    print(f"times 3 ({k})  noise {noise(c, m):>11}  expect {m:2} got {got:2}  terms {len(c)}{flag}")
    if got != m:
        break
```

```text
decryption works while |noise| < 134217728
fresh 3      noise -3  decrypts to 3
fresh 5      noise 1  decrypts to 5
3 + 5        noise -2  decrypts to 8
3 * 5        noise 35  decrypts to 15  terms 45
times 3 (2)  noise         106  expect 13 got 13  terms 165
times 3 (3)  noise         376  expect  7 got  7  terms 495
times 3 (4)  noise       -4926  expect  5 got  5  terms 1287
times 3 (5)  noise       64118  expect 15 got 15  terms 3003
times 3 (6)  noise     -833537  expect 13 got 13  terms 6435
times 3 (7)  noise    -2500695  expect  7 got  7  terms 12870
times 3 (8)  noise    32509122  expect  5 got  5  terms 24310
times 3 (9)  noise  -422618574  expect 15 got 13  terms 43758  <- FAILED
```

Read the output as two stories. The **noise** column grows by a factor of
roughly 3 to 13 with each multiplication (the addition barely moved it), until
the ninth multiplication pushes it past $2^{27}$ and the answer is wrong. The
**terms** column grows too: the ciphertext of a product of $d$ encryptions is a
polynomial of degree $d$ in the 8 secret numbers, with 43,758 coefficients after
nine. With a secret of 4,096 numbers, a single multiplication would already
produce over eight million. Both problems need solving before anything deep can
be computed: the noise by **modulus switching** or **bootstrapping**, the size by
**relinearization**. Figure 12.3 plots the noise on a log scale.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bar chart of the bits of noise after each operation in the toy LWE scheme: about 2 bits fresh, then growing by several bits per multiplication, crossing the 27-bit limit at the ninth multiplication" fill="currentColor" font-size="14">
<line x1="60" y1="250" x2="630" y2="250" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="40" x2="60" y2="250" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="61" x2="630" y2="61" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<text x="625" y="54" text-anchor="end" font-size="13" font-weight="bold">limit: 27 bits (decryption fails above)</text>
<text x="52" y="254" text-anchor="end" font-size="12">0</text>
<text x="52" y="184" text-anchor="end" font-size="12">10</text>
<text x="52" y="114" text-anchor="end" font-size="12">20</text>
<text x="52" y="44" text-anchor="end" font-size="12">30</text>
<rect x="72" y="238.9" width="36" height="11.1" opacity="0.5"/>
<rect x="122" y="243" width="36" height="7" opacity="0.5"/>
<rect x="172" y="214.1" width="36" height="35.9" opacity="0.5"/>
<rect x="222" y="202.9" width="36" height="47.1" opacity="0.5"/>
<rect x="272" y="190.1" width="36" height="59.9" opacity="0.5"/>
<rect x="322" y="164.1" width="36" height="85.9" opacity="0.5"/>
<rect x="372" y="138.2" width="36" height="111.8" opacity="0.5"/>
<rect x="422" y="112.3" width="36" height="137.7" opacity="0.5"/>
<rect x="472" y="101.2" width="36" height="148.8" opacity="0.5"/>
<rect x="522" y="75.3" width="36" height="174.7" opacity="0.5"/>
<rect x="572" y="49.4" width="36" height="200.6" opacity="0.9"/>
<text x="90" y="268" text-anchor="middle" font-size="12">fresh</text>
<text x="140" y="268" text-anchor="middle" font-size="12">add</text>
<text x="190" y="268" text-anchor="middle" font-size="12">1</text>
<text x="240" y="268" text-anchor="middle" font-size="12">2</text>
<text x="290" y="268" text-anchor="middle" font-size="12">3</text>
<text x="340" y="268" text-anchor="middle" font-size="12">4</text>
<text x="390" y="268" text-anchor="middle" font-size="12">5</text>
<text x="440" y="268" text-anchor="middle" font-size="12">6</text>
<text x="490" y="268" text-anchor="middle" font-size="12">7</text>
<text x="540" y="268" text-anchor="middle" font-size="12">8</text>
<text x="590" y="268" text-anchor="middle" font-size="12">9</text>
<text x="390" y="292" text-anchor="middle" font-size="13">multiplications in a row</text>
<text x="20" y="150" text-anchor="middle" font-size="13" transform="rotate(-90 20 150)">bits of noise</text>
</svg>
<figcaption>Figure 12.3. Measured, from the code above: the size of the noise in bits after each operation. The addition costs almost nothing; each multiplication adds several bits, and the ninth crosses the limit set by Δ/2 = 2²⁷.</figcaption>
</figure>

!!! note "Life story: DGHV, fully homomorphic encryption over the integers"
    **Born:** 2010, Marten van Dijk, Craig Gentry, Shai Halevi and Vinod
    Vaikuntanathan, EUROCRYPT · **Purpose:** Gentry's construction redone with
    integers instead of ideal lattices, simple enough to teach · **Helped:**
    made noise and bootstrapping understandable; based on the approximate GCD
    problem; improved by Coron, Naccache, Tibouchi and others to smaller keys ·
    **Status:** a teaching scheme and a research line; the LWE schemes are
    what is deployed

## 12.8 Gentry's bootstrapping

*Level: intermediate.*

By 2008 the situation looked like Figure 12.3 for every candidate: schemes could
add and multiply for a while, then the noise won. Nobody knew how to remove
noise without the secret key, and many researchers suspected fully homomorphic
encryption might be impossible.

Craig Gentry had practiced law before he turned to computer science. As a PhD
student of Dan Boneh at Stanford, he presented the first fully homomorphic
scheme at the Symposium on Theory of Computing in 2009 ("Fully Homomorphic
Encryption Using Ideal Lattices") and wrote it up in full as his thesis that
September. The scheme itself was a somewhat homomorphic one over ideal lattices,
with noise much like DGHV's. The new idea was a way to refresh a noisy
ciphertext without decrypting it, which he called **bootstrapping**.

### The idea in plain words

Decryption is itself a computation: take the secret key and a ciphertext, do
some arithmetic, get a bit. Like any computation, it can be written as a circuit
of additions and multiplications. Now suppose that:

1. the scheme can homomorphically evaluate its **own decryption circuit**, plus
   one more operation, before its noise runs out; and
2. the server holds an encryption of the secret key, bit by bit, under a public
   key. This is the **bootstrapping key**, published once by the key owner.

Take a ciphertext $c$ whose noise is close to the limit. The server cannot
decrypt it. But it can *encrypt* $c$ (trivially: a known value encrypted with no
noise), and then run the decryption circuit homomorphically, feeding in the
encrypted bits of the secret key. The output is an encryption of
$\mathrm{Dec}(sk, c) = m$: the same message, inside a new ciphertext. The old noise
is gone, because the old ciphertext was decrypted, just inside the encryption.
What remains is only the noise of running the decryption circuit, which is fixed
and, by condition 1, small enough to leave room for at least one more operation.
Then bootstrap again. Figure 12.4 shows the step.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Bootstrapping: a noisy ciphertext and the encrypted secret key go into a homomorphic evaluation of the decryption circuit, which outputs a fresh ciphertext of the same message with small noise" fill="currentColor" font-size="14">
<rect x="10" y="30" width="170" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="56" text-anchor="middle" font-weight="bold">noisy ciphertext</text>
<text x="95" y="78" text-anchor="middle" font-size="13">Enc(m), noise near limit</text>
<rect x="10" y="150" width="170" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="176" text-anchor="middle" font-weight="bold">bootstrapping key</text>
<text x="95" y="198" text-anchor="middle" font-size="13">Enc(bits of sk)</text>
<rect x="225" y="80" width="200" height="90" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="325" y="108" text-anchor="middle" font-weight="bold">evaluate Dec(sk, c)</text>
<text x="325" y="130" text-anchor="middle" font-size="13">homomorphically,</text>
<text x="325" y="150" text-anchor="middle" font-size="13">never seeing sk or m</text>
<rect x="465" y="90" width="165" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="547" y="116" text-anchor="middle" font-weight="bold">fresh ciphertext</text>
<text x="547" y="138" text-anchor="middle" font-size="13">Enc(m), small noise</text>
<line x1="180" y1="70" x2="218" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="225,105 214,103 219,96"/>
<line x1="180" y1="180" x2="218" y2="150" stroke="currentColor" stroke-width="1.5"/>
<polygon points="225,145 219,154 214,147"/>
<line x1="425" y1="125" x2="457" y2="125" stroke="currentColor" stroke-width="1.5"/>
<polygon points="465,125 456,121 456,129"/>
<text x="320" y="245" text-anchor="middle" font-size="13">the old noise is removed by decryption; only the circuit's own noise remains</text>
</svg>
<figcaption>Figure 12.4. Bootstrapping. The server runs the decryption circuit on the noisy ciphertext under encryption, using an encrypted copy of the secret key, and gets a fresh encryption of the same message.</figcaption>
</figure>

Gentry explained it with a story about a jeweler. The owner of a jewelry shop
does not trust her workers, so she gives them raw materials locked inside
transparent glove boxes: a worker can reach in through the gloves and work on the
pieces but cannot take them out, and only the owner has the key. The trouble is
that the gloves stiffen with use and a box works only for a few minutes. So each
box also has a one-way slot, through which a box can be dropped into another
box. The owner puts the key to box 1 inside box 2. When box 1's gloves are
about to fail, a worker drops box 1 into box 2, uses box 2's gloves to unlock
box 1 with its key, takes the half-finished piece out, and carries on in box 2.
Box 2 holds the key to box 3, and so on. The work never leaves a locked box, and
no box has to last longer than the time it takes to open one other box and do a
little more.

### Two obstacles: depth and circularity

**Squashing.** Gentry's somewhat homomorphic scheme could not, as built,
evaluate its own decryption circuit: decryption was too deep, needing more
multiplications than the noise allowed. His fix was to **squash** the circuit.
The key owner publishes, as part of the public key, a large set of numbers with a
hidden sparse subset whose sum is related to the secret key. A ciphertext is
post-processed against those numbers, so that decryption becomes a sum of a few
products, a much shallower circuit. The price was an extra assumption, that
nobody can find the hidden subset (a **sparse subset sum** problem), and
enormous public keys. Later schemes removed the need: BGV and BFV have
decryption circuits shallow enough to bootstrap directly, and GSW-based
schemes (§12.11) made the noise growth of decryption small.

**Circular security.** The bootstrapping key is the secret key encrypted under
its own public key. Ordinary IND-CPA says nothing about that case: the proof
assumes messages chosen without knowledge of the key. So bootstrapping needs an
extra assumption, **circular security**: that the scheme remains secure even
when it encrypts its own secret key. Nobody has proved it for the lattice
schemes in use; nobody has found an attack either, and it is widely assumed.
There is a way around it if the computation's depth is known in advance: use a
chain of keys, encrypting key 1 under key 2, key 2 under key 3, and so on, with
one bootstrap per key. This **leveled** FHE needs only standard assumptions, but
its keys grow with the depth of the computation.

### The cost, at first

The first implementation was not fast. Gentry and Halevi's 2011
implementation of a variant of the scheme took about 30 minutes per bootstrap at
its largest setting, with a public key of about 2.3 GB. Each bootstrap
refreshed a single encrypted bit. Computing anything interesting needed
millions of them. It worked, and it was useless, which is how many good ideas
begin.

!!! note "Life story: Gentry's fully homomorphic encryption"
    **Born:** 2009, Craig Gentry, STOC ("Fully Homomorphic Encryption Using
    Ideal Lattices") and his Stanford PhD thesis, supervised by Dan Boneh;
    asked for since 1978 · **Purpose:** compute any function on encrypted data
    · **Helped:** proved FHE possible; bootstrapping is still the core idea of
    every FHE scheme; Gentry received a MacArthur Fellowship in 2014 ·
    **Status:** the ideal-lattice scheme itself is retired; its descendants
    (BGV, BFV, CKKS, TFHE) are in use

## 12.9 The second generation: BGV and BFV

*Level: expert.*

Gentry's scheme rested on unusual assumptions about ideal lattices plus sparse
subset sum. In 2011 Zvika Brakerski and Vinod Vaikuntanathan showed how to build
FHE from plain LWE and its ring version, and later that year Brakerski, Gentry
and Vaikuntanathan published the scheme now called **BGV** ("(Leveled) Fully
Homomorphic Encryption without Bootstrapping", ITCS 2012). In 2012 Brakerski
gave a "scale-invariant" variant, which Junfeng Fan and Frederik Vercauteren
adapted to rings the same year; that is **BFV**. The two papers by Brakerski and
Vaikuntanathan, and by all three, won the Gödel Prize in 2022.

Both schemes work in the ring $R_q = \mathbb{Z}_q[x]/(x^N + 1)$, with $N$ a power of
two from 4,096 to 32,768 or more, the same kind of ring as ML-KEM but with a
much larger modulus $q$ (hundreds or thousands of bits instead of 12). The
post-quantum book explains these rings and the number-theoretic transform that
multiplies in them in
[Rings, modules and the NTT](../post-quantum/07-Rings-Modules-and-the-NTT.md).
A ciphertext is a pair of ring elements $(c_0, c_1)$, and the secret is a ring
element $s$ with small coefficients; decryption computes the phase
$c_0 + c_1 s$. The schemes differ in where the message sits inside the phase, as
Figure 12.5 shows.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Where the message sits inside one coefficient of the phase: BGV puts the message in the low part with the noise multiplied by t above it; BFV puts the scaled message in the high bits and the noise in the low bits; CKKS puts a scaled real value in the middle with the noise in its lowest bits" fill="currentColor" font-size="14">
<text x="140" y="24" font-size="13">high bits</text>
<text x="620" y="24" font-size="13" text-anchor="end">low bits</text>
<text x="120" y="68" text-anchor="end" font-weight="bold">BGV</text>
<rect x="140" y="48" width="480" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="420" y="48" width="160" height="30" opacity="0.25"/>
<rect x="580" y="48" width="40" height="30" opacity="0.6"/>
<text x="280" y="68" text-anchor="middle" font-size="13">room to grow</text>
<text x="500" y="68" text-anchor="middle" font-size="13">t · e</text>
<text x="600" y="68" text-anchor="middle" font-size="13">m</text>
<text x="380" y="96" text-anchor="middle" font-size="12">read the message as phase mod t</text>
<text x="120" y="138" text-anchor="end" font-weight="bold">BFV</text>
<rect x="140" y="118" width="480" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="140" y="118" width="70" height="30" opacity="0.6"/>
<rect x="500" y="118" width="120" height="30" opacity="0.25"/>
<text x="175" y="138" text-anchor="middle" font-size="13">Δ · m</text>
<text x="355" y="138" text-anchor="middle" font-size="13">room to grow</text>
<text x="560" y="138" text-anchor="middle" font-size="13">e</text>
<text x="380" y="166" text-anchor="middle" font-size="12">read the message by rounding phase · t / q</text>
<text x="120" y="208" text-anchor="end" font-weight="bold">CKKS</text>
<rect x="140" y="188" width="480" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="300" y="188" width="320" height="30" opacity="0.6"/>
<rect x="560" y="188" width="60" height="30" opacity="0.35"/>
<text x="220" y="208" text-anchor="middle" font-size="13">room</text>
<text x="430" y="208" text-anchor="middle" font-size="13">Δ · x (a real value)</text>
<text x="590" y="208" text-anchor="middle" font-size="13">e</text>
<text x="380" y="236" text-anchor="middle" font-size="12">the noise sits in the value's lowest bits: decryption returns Δx + e</text>
<text x="380" y="260" text-anchor="middle" font-size="12">(not to scale; q has hundreds of bits)</text>
</svg>
<figcaption>Figure 12.5. One coefficient of the phase c₀ + c₁s, from its high bits to its low bits. Noise grows upwards with each operation; decryption fails when it reaches the message (BGV, BFV) or eats too much of the value's precision (CKKS).</figcaption>
</figure>

In **BGV** the phase is $m + t e$ for a plaintext modulus $t$: the message is
recovered as the phase mod $t$, and the noise is a multiple of $t$ sitting above
it. In **BFV** the phase is $\Delta m + e$ with $\Delta = \lfloor q/t \rfloor$, as in
the toy of §12.7: the message is in the high bits and the noise in the low bits.
The two are close relatives and can be converted into each other. Two
techniques make them practical: one controls the noise, the other the size.

### Modulus switching: noise that grows linearly

In §12.7 the noise was multiplied at every step, so after $d$ multiplications a
fresh noise of $B$ had become about $B^{2^d}$ when both inputs had gone
through the same number of steps: exponential growth in the depth, needing a
modulus with about $2^d \log_2 B$ bits. BGV's key observation was that you can
divide the whole ciphertext by a number, rounding carefully, and the noise
shrinks by the same factor while the message survives.

Pick a chain of moduli $q_L > q_{L-1} > \dots > q_1$, each smaller than the last
by a factor of about $B$. A fresh ciphertext lives mod $q_L$. After each
multiplication, the noise has grown from about $B$ to about $B^2$; multiply
every coefficient of the ciphertext by $q_{L-1}/q_L$ and round (in BGV, round to
the right residue mod $t$ so the message is untouched). The ciphertext now
lives mod $q_{L-1}$ and its noise is back to about $B$. Each multiplication spends
one level. With fresh noise around $2^{10}$, say, and each level costing about
that many bits, a 200-bit modulus allows not 4 multiplications in a row but
about 19. The required modulus now grows **linearly** with the depth instead of
exponentially, and for circuits of known depth, such as evaluating a
fixed-degree polynomial or a small neural network, BGV can avoid bootstrapping
entirely. That was the point of the paper's title. BFV gets the same effect
without explicit switching, because its scaling by $t/q$ after each
multiplication keeps the noise proportional; libraries still switch moduli
inside BFV for efficiency.

### Relinearization: ciphertexts that stay small

The product of two ciphertexts $(c_0, c_1)$ and $(c_0', c_1')$ decrypts with the
quadratic $(c_0 + c_1 s)(c_0' + c_1' s) = d_0 + d_1 s + d_2 s^2$, so it is a
three-part ciphertext $(d_0, d_1, d_2)$, the ring version of the growing term
list in §12.7. **Relinearization**, from Brakerski and Vaikuntanathan's 2011
paper, turns it back into two parts. The key owner publishes a
**relinearization key**: encryptions of $s^2$ (more exactly, of $s^2$ times
powers of a base, so that the noise stays small) under $s$. The server breaks
$d_2$ into small digits, multiplies each digit by the matching part of the
relinearization key, and adds the results to $(d_0, d_1)$. The term $d_2 s^2$ is
replaced by something that decrypts to the same value with a linear function of
$s$. The cost is a little noise and a large public key; the assumption that
encrypting $s^2$ under $s$ is safe is another circular-security assumption.
The same technique, called **key switching**, moves a ciphertext from one key
to another, and it is how rotations work.

### Batching: thousands of numbers per ciphertext

When the plaintext modulus $t$ is a prime with $t \equiv 1 \pmod{2N}$, the
polynomial $x^N + 1$ splits into $N$ linear factors mod $t$, and by the Chinese
remainder theorem one plaintext polynomial holds $N$ independent numbers mod
$t$, called **slots**. Nigel Smart and Frederik Vercauteren pointed this out in
2011. Adding or multiplying two ciphertexts then adds or multiplies all $N$
slots at once, like a vector processor. Rotating the slots uses the ring's
automorphisms $x \mapsto x^k$ and a key-switching key for each rotation amount
(the **Galois keys**). With $N = 8192$ and $t = 65537$, one ciphertext holds
8,192 numbers below 65,537, and one homomorphic multiplication multiplies them
all. Batching is why BGV and BFV are measured in amortized cost per slot, and
why Apple's private lookups (§12.13) can compare one encrypted query with many
database entries at once.

**Sizes.** The 2018 HomomorphicEncryption.org security standard lists, for 128-bit
classical security with a ternary secret, a modulus of at most 109 bits for
$N = 4096$, 218 bits for $N = 8192$, 438 bits for $N = 16384$ and 881 bits for
$N = 32768$. A BFV ciphertext at $N = 8192$ with a 218-bit modulus is two
polynomials of 8,192 coefficients of 218 bits each, about 450 KB. A
relinearization key or a full set of Galois keys runs to megabytes or tens of
megabytes. These numbers are why FHE is used where the data is small or the
query is valuable.

!!! note "Life story: BGV"
    **Born:** 2011 (preprint) and ITCS 2012, Zvika Brakerski, Craig Gentry and
    Vinod Vaikuntanathan, after Brakerski and Vaikuntanathan's FOCS 2011 paper
    on FHE from standard LWE · **Purpose:** leveled FHE from (ring) LWE, with
    modulus switching so that noise grows linearly with depth · **Helped:**
    IBM's HElib (2013), the first widely used FHE library; batching with
    thousands of slots; the 2022 Gödel Prize · **Status:** current; in HElib,
    OpenFHE, SEAL and Lattigo, and in the ISO/IEC 28033-2 drafts

!!! note "Life story: BFV"
    **Born:** 2012, Zvika Brakerski ("scale-invariant" FHE, CRYPTO 2012) and
    Junfeng Fan and Frederik Vercauteren (the ring version, IACR ePrint
    2012/144) · **Purpose:** exact integer arithmetic on encrypted data
    without tracking noise levels by hand · **Helped:** Microsoft SEAL's first
    scheme; Apple's Live Caller ID Lookup and Enhanced Visual Search (2024)
    · **Status:** current; the scheme most deployments of exact arithmetic
    use

## 12.10 CKKS: approximate numbers, and a key in the output

*Level: expert.*

Exact schemes compute modulo $t$. Real data, such as blood pressure, a
probability or the weights of a neural network, is made of real numbers, and
encoding them as integers mod $t$ means fixing a scale and watching every
product double the number of digits. In 2017 Jung Hee Cheon of Seoul National
University, with Andrey Kim, Miran Kim and Yongsoo Song, proposed giving up
exactness on purpose ("Homomorphic Encryption for Arithmetic of Approximate
Numbers", ASIACRYPT 2017). Their scheme, called **CKKS** after them (and HEAAN
after its library), treats the encryption noise the way floating-point
arithmetic treats rounding error.

A real number $x$ is encoded as $\Delta x$ rounded, for a scale such as
$\Delta = 2^{40}$, and encrypted so that the phase is $\Delta x + e$. Decryption
returns $\Delta x + e$, and dividing by $\Delta$ gives $x$ plus an error of about
$e / \Delta$, perhaps $2^{-30}$: the last few bits are wrong, as they would be in
any computation with finite precision. Multiplying two ciphertexts gives a phase
of about $\Delta^2 x_1 x_2$, at twice the scale, so CKKS **rescales**: it divides the
ciphertext by $\Delta$ and moves to the next smaller modulus, the BGV modulus
switch put to a new use. Rescaling drops the low digits, like keeping a fixed
number of significant figures. One slot holds a complex number, and with
$N = 2^{16}$ a ciphertext holds $2^{15}$ of them. Bootstrapping for CKKS
followed in 2018 (Cheon, Han, Kim, Kim and Song), and refreshes the levels
without refreshing the precision lost so far.

CKKS fits statistics and machine learning, where nobody needs the fifteenth
digit. It is the usual choice for encrypted inference with a neural network or
encrypted training of a regression model, with polynomials standing in for
functions such as the sigmoid that are not polynomials.

### Break it: decryptions that leak the key

In ordinary encryption, showing someone a decrypted message is harmless: the
message is what it is. In CKKS the "message" that comes out of decryption is
$\Delta x + e$, and $e$ is part of the secret machinery. Baiyu Li and Daniele
Micciancio pointed out at EUROCRYPT 2021 what follows. Suppose the party that
computed a ciphertext $(c_0, c_1)$ also sees the decrypted result, as happens
whenever a client shares a result with the server, or publishes it. Then that
party knows $c_0$, $c_1$ and $c_0 + c_1 s = \Delta x + e$, exactly. That is a linear
equation in the secret $s$ with no unknown noise left. In the ring setting one
decryption gives $N$ such equations, enough to solve for $s$. Li and Micciancio
recovered keys this way against the CKKS implementations in HEAAN, SEAL, HElib
and PALISADE.

The toy below uses plain LWE with $n = 8$: the server computes on eight
ciphertexts, the client shares the eight decrypted results, and the server
solves the linear system mod $q$. Then the client adds random noise to each
result before releasing it ("noise flooding"), and the same attack returns
garbage.

```python
import random
random.seed(5)            # random is for the demo; real noise comes from secrets

n, q = 8, 2**31 - 1        # toy: CKKS uses rings of dimension 2^15 or more
scale = 2**20              # a real number x is stored as about x * scale
s = [random.randint(-1, 1) for _ in range(n)]

def encrypt(x):
    a = [random.randrange(q) for _ in range(n)]
    e = random.randint(-8, 8)
    b = (sum(i * j for i, j in zip(a, s)) + round(x * scale) + e) % q
    return a, b

def decrypt(c, flood=0):   # CKKS-style: the noise is part of the answer
    a, b = c
    v = (b - sum(i * j for i, j in zip(a, s))) % q
    v = v - q if v > q // 2 else v
    return (v + random.randint(-flood, flood)) / scale

def solve_mod(rows, rhs):  # Gaussian elimination mod the prime q
    m = [r[:] + [y] for r, y in zip(rows, rhs)]
    for col in range(n):
        piv = next(i for i in range(col, n) if m[i][col] % q)
        m[col], m[piv] = m[piv], m[col]
        inv = pow(m[col][col], q - 2, q)
        m[col] = [v * inv % q for v in m[col]]
        for i in range(n):
            if i != col and m[i][col]:
                f = m[i][col]
                m[i] = [(v - f * w) % q for v, w in zip(m[i], m[col])]
    return [r[n] if r[n] <= q // 2 else r[n] - q for r in m]

def attack(flood):
    rows, rhs = [], []
    for _ in range(n):     # the server computes on n ciphertexts, sees n results
        c = encrypt(random.uniform(30, 40))       # say, body temperatures
        out = decrypt(c, flood)                   # the client shares the result
        rows.append(c[0])
        rhs.append((c[1] - round(out * scale)) % q)   # b - (m + e) = <a, s>
    return solve_mod(rows, rhs)

print("secret key      ", s)
print("plain decryption", attack(0))
print("flooded by 2^12 ", attack(2**12)[:4], "...")
c = encrypt(36.6)
print("36.6 decrypts to", decrypt(c), "plain, and", round(decrypt(c, 2**12), 3), "flooded")
```

```text
secret key       [1, 0, 1, 0, 1, 1, 1, 1]
plain decryption [1, 0, 1, 0, 1, 1, 1, 1]
flooded by 2^12  [-862205473, 317926324, -365424960, 717910096] ...
36.6 decrypts to 36.60000133514404 plain, and 36.603 flooded
```

The unflooded decryption of 36.6 shows the leak in plain sight: the trailing
digits `0000133514404` are the noise $e$ divided by the scale. Flooding costs
precision (36.603 instead of 36.600001) and must be sized carefully: the added
noise has to be large enough to hide $e$ statistically, typically by 30 to 60
extra bits in real parameters, which is far more than the toy's $2^{12}$. Li and
Micciancio proposed a new security notion to capture the problem,
**IND-CPA-D**: IND-CPA where the attacker may also ask for decryptions of
ciphertexts that were honestly computed from ciphertexts it was given. CKKS as
originally specified is not IND-CPA-D secure. Libraries responded with modes
that add calibrated noise at decryption (OpenFHE has one), and follow-up work by
Li, Micciancio, Schultz and Sorrell in 2022 used differential privacy to size
that noise.

Li and Micciancio believed the exact schemes were immune, since their
decryption returns $m$ and nothing else. In 2024 two groups showed otherwise
(Cheon, Choe, Passelègue, Stehlé and Suvanto at CCS; Checri, Sirdey, Boudguiga
and Bultel at CRYPTO): when the parameters accept a small probability of
decryption failure, as many libraries' defaults did, an attacker who can steer
computations towards failures and see which decryptions come out wrong learns
about the noise, and from it the key. They demonstrated attacks on the default
BFV and BGV in OpenFHE and SEAL and on TFHE-rs. The fix is parameters with a
negligible failure probability, and the lesson is §12.1's: FHE is IND-CPA
secure, and every decryption that leaves the key holder is a channel to watch.

!!! note "Life story: CKKS"
    **Born:** 2017, Jung Hee Cheon, Andrey Kim, Miran Kim and Yongsoo Song,
    ASIACRYPT (preprint 2016), with the HEAAN library · **Purpose:**
    approximate arithmetic on encrypted real and complex numbers, with the
    noise treated as rounding error · **Helped:** encrypted statistics and
    machine-learning inference and training; bootstrapping since 2018;
    in SEAL, OpenFHE, HElib and Lattigo · **Status:** current, in the ISO/IEC
    28033-3 draft; decrypted results must be protected (Li-Micciancio, 2021)

!!! note "Life story: the Li-Micciancio key-recovery attack"
    **Born:** 2020 (preprint) and EUROCRYPT 2021, Baiyu Li and Daniele
    Micciancio · **Purpose:** to show that CKKS decryptions, which include the
    noise, reveal linear equations in the secret key · **Helped:** recovered
    keys from the CKKS implementations in HEAAN, SEAL, HElib and PALISADE;
    defined IND-CPA-D; led to noise-flooding decryption modes · **Status:**
    the attack is still valid against unprotected decryption; extended in 2024
    to exact schemes run with non-negligible failure probability

## 12.11 The third generation: GSW, FHEW and TFHE

*Level: expert.*

In 2013 Craig Gentry, Amit Sahai and Brent Waters published a scheme with a
different shape (CRYPTO 2013). In **GSW**, a ciphertext is a square matrix $C$,
and the secret key is a vector $v$ that is *almost* an eigenvector of it:

$$
C v = m v + e
$$

for a small error vector $e$. Adding two ciphertexts adds their eigenvalues.
Multiplying two matrices multiplies their eigenvalues:
$C_1 C_2 v = C_1(m_2 v + e_2) = m_1 m_2 v + m_2 e_1 + C_1 e_2$. To keep $C_1 e_2$
small, $C_1$ is written in binary digits (a **gadget decomposition**), so its
entries are 0 or 1. Then the new noise is $m_2 e_1$ plus something small times
$e_2$. Two things follow. There is no relinearization key, because the product
of two matrices is still a matrix of the same size. And the noise grows
**asymmetrically**: if one factor is always fresh, a long chain of
multiplications grows the noise only additively, step by step, instead of
multiplying it. Brakerski and Vaikuntanathan used that asymmetry in 2014 to
bootstrap with noise that grows only polynomially, giving FHE from essentially
the same LWE assumption as ordinary lattice encryption (plus circular
security).

### FHEW: one gate, then bootstrap

Léo Ducas and Daniele Micciancio turned the asymmetry into speed. Their
**FHEW** (EUROCRYPT 2015, "FHEW: Bootstrapping Homomorphic Encryption in Less
Than a Second") encrypts single bits with plain LWE, and evaluates a NAND gate
without any homomorphic multiplication at all:

1. Encode each bit $b$ as a phase near $b \cdot q/4$. Add the two input
   ciphertexts. The sum's phase is near 0, $q/4$ or $q/2$ for inputs 00, one 1,
   or 11.
2. NAND is 0 exactly when the sum is near $q/2$. Deciding which range the phase
   is in is a non-linear step, and it is done by bootstrapping: the decryption
   circuit is evaluated homomorphically, but with its final rounding replaced by
   the gate's threshold.

The bootstrap uses GSW-style ring ciphertexts as an **accumulator**: it computes
$X^{\text{phase}}$ in the ring $\mathbb{Z}_q[X]/(X^N + 1)$ one key bit at a time, so
the phase becomes a rotation of a polynomial, and the coefficient that lands at
the front gives the answer. Every gate is followed by a bootstrap, so the noise
never accumulates and circuits of any depth run without planning levels. FHEW
took about 0.69 seconds per bootstrapped gate on one core, with a bootstrapping
key of about 1 GB.

### TFHE: under a tenth of a second, then milliseconds

Ilaria Chillotti, Nicolas Gama, Mariya Georgieva and Malika Izabachène
reformulated FHEW over the real **torus** (numbers mod 1) and replaced its
accumulator with a faster "external product" between a GSW-style ciphertext and
an LWE-style one. Their **TFHE** paper won the best paper award at ASIACRYPT
2016 under the title "Faster Fully Homomorphic Encryption: Bootstrapping in Less
than 0.1 Seconds". Improvements published in 2017 brought a bootstrapped binary
gate to about 13 ms on one core, with a bootstrapping key of about 16 MB instead
of 1 GB. The scheme is also known as **CGGI** after its authors, and that is the
name in the standards drafts.

TFHE's most useful trick is the **programmable bootstrap**. The polynomial that
the accumulator rotates (the "test polynomial") can hold any table of values, so
the bootstrap that refreshes a ciphertext of a small integer $m$ can at the same
time output an encryption of $f(m)$ for any function $f$ given as a table. A
comparison, a ReLU, a rounding or a lookup in an S-box costs one bootstrap, the
same as a refresh. ISO/IEC 28033-4 is titled after this idea: "mechanisms for
arithmetic based on look-up table evaluation". Zama's TFHE-rs library uses it
to offer encrypted 8-, 16-, 32- and 64-bit integers built from many small
blocks, each refreshed by a programmable bootstrap.

**Which scheme for which job.** BGV and BFV give the highest throughput for
exact arithmetic on many values at once (batching), CKKS for approximate
arithmetic on many real values at once, and TFHE the lowest latency for
non-linear functions on small values and for circuits of unknown depth. Many
applications need both arithmetic and comparisons, so work on **scheme
switching** converts ciphertexts between CKKS or BFV and TFHE in the middle of a
computation; it is the subject of a further ISO/IEC 28033 part, still at
working-draft stage as of November 2026.

!!! note "Life story: GSW"
    **Born:** 2013, Craig Gentry, Amit Sahai and Brent Waters, CRYPTO
    ("Homomorphic Encryption from Learning with Errors: Conceptually-Simpler,
    Asymptotically-Faster, Attribute-Based") · **Purpose:** FHE with matrix
    ciphertexts and an approximate eigenvector as the key, needing no
    relinearization key · **Helped:** asymmetric noise growth, bootstrapping
    from LWE with polynomial noise (Brakerski-Vaikuntanathan 2014), and the
    accumulators inside FHEW and TFHE · **Status:** rarely used on its own;
    lives on as the engine of every fast bootstrap

!!! note "Life story: FHEW"
    **Born:** 2015, Léo Ducas and Daniele Micciancio, EUROCRYPT · **Purpose:**
    evaluate one Boolean gate per bootstrap, with the bootstrap doing the
    non-linear work · **Helped:** bootstrapping in about 0.69 s per gate,
    hundreds of times faster than before; the design TFHE refined; kept in
    OpenFHE's Boolean-circuit module alongside CGGI · **Status:** current, as a member of the
    FHEW/TFHE family

!!! note "Life story: TFHE (CGGI)"
    **Born:** 2016, Ilaria Chillotti, Nicolas Gama, Mariya Georgieva and Malika
    Izabachène, ASIACRYPT (best paper); faster bootstrapping in 2017; journal
    version in the *Journal of Cryptology* (2020) · **Purpose:** fast
    bootstrapping after every gate, and later any lookup table during the
    bootstrap · **Helped:** about 13 ms per bootstrapped gate on one core by
    2017; Google's 2021 transpiler; Zama's TFHE-rs and Concrete · **Status:**
    current; in the ISO/IEC 28033-4 draft

## 12.12 Mars: an Earth laboratory that never sees the data

*Level: intermediate.*

Arcadia City's clinic follows every settler's bones. In Mars's 0.38 g, bone
density falls, and the clinic measures each adult's hip once a year. A
laboratory on Earth has spent decades building a risk model for bone loss in
low gravity, and the city's medical board wants every settler scored with it.
The lab will not send its model to Mars: the weights are its life's work, and its
certification covers only computations it runs itself. The clinic will not send
medical records to Earth: the settlement's charter forbids it, and the link
passes through relays that nobody in Arcadia controls.

[Chapter 10](10-Multi-Party-Computation-in-Practice.md) solved a related problem,
pooling children's growth data across several clinics, with secret sharing
and many rounds of messages. Here there are only two parties, and the obstacle
is the light delay: 4 to 24 minutes each way, so every round of an interactive
protocol costs up to 48 minutes. Homomorphic encryption needs one message
there and one back.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The Arcadia City clinic sends encrypted measurements to an Earth laboratory, 4 to 24 light-minutes away; the lab computes risk scores and statistics on ciphertexts and sends one encrypted reply, which only the clinic can decrypt" fill="currentColor" font-size="14">
<rect x="10" y="40" width="190" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="66" text-anchor="middle" font-weight="bold">Arcadia City clinic</text>
<text x="105" y="90" text-anchor="middle" font-size="13">holds the Paillier key</text>
<text x="105" y="112" text-anchor="middle" font-size="13">encrypts x, x², minutes</text>
<text x="105" y="134" text-anchor="middle" font-size="13">decrypts the reply</text>
<rect x="440" y="40" width="190" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="66" text-anchor="middle" font-weight="bold">Earth laboratory</text>
<text x="535" y="90" text-anchor="middle" font-size="13">holds the model weights</text>
<text x="535" y="112" text-anchor="middle" font-size="13">multiplies, raises to</text>
<text x="535" y="134" text-anchor="middle" font-size="13">powers: no key</text>
<line x1="202" y1="75" x2="430" y2="75" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="438,75 429,71 429,79"/>
<text x="320" y="66" text-anchor="middle" font-size="13">18 ciphertexts</text>
<line x1="438" y1="125" x2="210" y2="125" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="202,125 211,121 211,129"/>
<text x="320" y="145" text-anchor="middle" font-size="13">8 ciphertexts</text>
<text x="320" y="100" text-anchor="middle" font-size="12" opacity="0.8">4 to 24 light-minutes</text>
<text x="320" y="200" text-anchor="middle" font-size="13">one round trip; the lab never sees a measurement, a score or a total</text>
</svg>
<figcaption>Figure 12.6. One round trip between Mars and Earth. The clinic sends encrypted measurements; the lab applies its weights to ciphertexts and returns encrypted scores and sums.</figcaption>
</figure>

The model is linear, so Paillier is enough: each settler's risk score is
$5 \cdot \text{loss} - 2 \cdot \text{minutes} + 400$, where loss is the hip
density lost over the year in hundredths of a percent and minutes is weekly
resistance exercise. The lab computes it with scalar multiplications
($\mathrm{Enc}(x)^5$, $\mathrm{Enc}(m)^{-2}$) and one addition of an encrypted
constant. For the board's report the lab also returns the encrypted sum of the
losses and the encrypted sum of their squares, from which the clinic gets the
mean and standard deviation. Paillier cannot square a hidden number, so the
clinic encrypts $x^2$ itself and sends it along. The six settlers and their
numbers are invented.

```python
import secrets
from math import gcd

# The clinic's Paillier key (toy primes; a real n has 3072 bits).
p, q = 2**107 - 1, 2**127 - 1
n, n2 = p * q, (p * q) ** 2
lam = (p - 1) * (q - 1) // gcd(p - 1, q - 1)
mu = pow(lam, -1, n)
enc = lambda m: pow(n + 1, m % n, n2) * pow(secrets.randbelow(n - 2) + 2, n, n2) % n2
def dec(c):
    m = (pow(c, lam, n2) - 1) // n * mu % n
    return m - n if m > n // 2 else m          # negative numbers live near n

# Arcadia City clinic: hip bone loss over a year (hundredths of a percent)
# and weekly resistance-exercise minutes, for six settlers.
loss = [212, 145, 301, 98, 176, 260]
exercise = [150, 240, 60, 300, 180, 90]
upload = [(enc(x), enc(x * x), enc(m)) for x, m in zip(loss, exercise)]

# Earth lab: sees only ciphertexts. Its model weights stay on Earth.
w_loss, w_ex, bias = 5, -2, 400                # risk = 5*loss - 2*minutes + 400
sum_x, sum_x2, scores = enc(0), enc(0), []
for cx, cx2, cm in upload:
    sum_x = sum_x * cx % n2
    sum_x2 = sum_x2 * cx2 % n2
    scores.append(pow(cx, w_loss, n2) * pow(cm, w_ex % n, n2) * enc(bias) % n2)
reply = (sum_x, sum_x2, scores)                # one message back to Mars

# Clinic decrypts.
k = len(loss)
s1, s2 = dec(reply[0]), dec(reply[1])
mean = s1 / k
var = (s2 - s1 * s1 / k) / (k - 1)
print(f"mean loss {mean / 100:.2f}%  standard deviation {var ** 0.5 / 100:.2f}%")
print("risk scores:", [dec(c) for c in reply[2]])
```

```text
mean loss 1.99%  standard deviation 0.75%
risk scores: [1160, 645, 1785, 290, 920, 1520]
```

The negative weight works because $-2$ is the exponent $n - 2$, and an
encrypted $-2m$ is stored as $n - 2m$; `dec` reads anything above $n/2$ as
negative. Every ciphertext the lab returns is a product that includes a fresh
encryption (of 0 or of the bias), so it is rerandomized and does not show which
inputs went into it.

The design hides the data from the lab and nothing more, and the medical board
should be told what it does not do:

- **The lab is trusted to compute honestly.** It could return scores from a
  different model, and the clinic would not know. A spot check helps: the clinic
  can slip in an encrypted test patient whose correct score it has agreed with
  the lab in advance.
- **The clinic learns the model, slowly.** A linear model with three numbers is
  revealed by any three independent scores the clinic can check against its own
  data. Real deployments limit the number of queries or add noise to the
  outputs; here the lab accepts the risk because the weights are published in its
  certification anyway.
- **Anything non-linear needs more.** If the board wanted the number of settlers
  whose score exceeds 1,500, that is a comparison, which Paillier cannot do. The
  lab would switch to TFHE, with one programmable bootstrap per comparison
  (§12.11), or to CKKS with a polynomial approximation of the threshold.

## 12.13 In the real world

*Level: intermediate.*

### Performance, then and now

All figures below are approximate, depend heavily on parameters and hardware,
and are meant as orders of magnitude.

| Operation | Then | Now (approximate) |
|---|---|---|
| One bootstrap, Gentry-Halevi | 2011: about 30 minutes, 2.3 GB public key | no longer used |
| One bootstrapped gate, FHEW / TFHE | 2015: about 0.7 s; 2017: about 13 ms (one core) | milliseconds on one CPU core; well under a millisecond per gate on a GPU |
| Bootstrapping a CKKS ciphertext with thousands of slots | 2018: tens of seconds or more | seconds on a CPU; a fraction of a second on a GPU |
| One BFV multiplication with relinearization, $N = 8192$ | | a few milliseconds on one core |
| Ciphertext size | Paillier, 3072-bit $n$: 768 bytes per number | BFV, $N = 8192$: about 450 KB for 8,192 numbers |

Against computing in the clear, a single bootstrapped gate is still millions of
times slower than a gate in a CPU, which takes well under a nanosecond. Batched
arithmetic in BFV or CKKS narrows the gap, to thousands or tens of thousands of
times for well-suited workloads, and specialized hardware aims to narrow it
further: the US research agency DARPA started a program called DPRIVE in 2020 to
build FHE accelerators, and several companies have announced chips. Whether
those will reach products, and at what speed, was not settled as of November
2026.

### Standards

- **The HomomorphicEncryption.org security standard** (November 2018), written by
  a group of academic, industry and government researchers after workshops in
  2017 and 2018, fixed the lattice parameters that give 128, 192 and 256 bits of
  security for BGV and BFV, listed CKKS and others for future work, and is the
  reference every library cites. Its parameter tables come from the lattice
  estimator described in the post-quantum book's
  [Lattice reduction and the estimator](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md).
- **ISO/IEC 18033-6** (2019) standardizes the two partially homomorphic schemes
  of §12.2 and §12.4: exponential ElGamal and Paillier.
- **ISO/IEC 18033-8** was started in SC 27 in 2021 as a single part covering fully
  homomorphic encryption. In 2023 the committee cancelled it as too long for one
  document and restarted the work as a new multi-part standard, **ISO/IEC 28033**:
  part 1 (general), part 2 (BGV and BFV), part 3 (CKKS, "arithmetic on
  approximate numbers") and part 4 (CGGI, "look-up table evaluation"), with a
  scheme-switching part at an early stage. As of November 2026, parts 3 and 4 had
  entered their final (FDIS) ballots in September 2026 and parts 1 and 2 were
  still drafts; none had been published as far as could be confirmed.

There is no NIST standard for homomorphic encryption.

### Libraries

- **Microsoft SEAL** (C++), from Kristin Lauter's group at Microsoft Research:
  BFV and CKKS, BGV added in 2022. First released in 2015, open source under the
  MIT license since late 2018.
- **HElib** (C++), by Shai Halevi and Victor Shoup at IBM, 2013: the first
  widely used library, BGV with batching and later CKKS.
- **OpenFHE** (C++), released in 2022 as the successor of PALISADE, by Duality
  Technologies with academic partners: BGV, BFV, CKKS, FHEW and TFHE, scheme
  switching, threshold FHE, and the noise-flooding decryption mode of §12.10.
- **TFHE-rs** (Rust), by the French company Zama, 2022, with its Concrete
  compiler: TFHE with programmable bootstrapping and encrypted integer types.
- **Lattigo** (Go), started at EPFL around 2019 and now maintained by Tune
  Insight: BGV, BFV and CKKS, with multiparty (threshold) variants.
- **swift-homomorphic-encryption** (Swift), Apple, 2024: BFV and private
  information retrieval, released with an example server for Live Caller ID
  Lookup.

Choosing and integrating such a library is an engineering problem in its own
right; the engineering book covers library choice in general.

### Deployments

**Google's FHE transpiler (June 2021).** Google released, under the Apache 2.0
license, a tool that takes a C++ function and produces a C++ function that runs
on TFHE-encrypted inputs, by compiling it into a Boolean circuit through Google's
XLS hardware toolchain. It was explicitly experimental, did not support loops
with variable bounds or floating point, and showed both how far tooling had
come and how slow gate-by-gate evaluation was. Google later moved its compiler
work to a newer project, HEIR.

**Microsoft Edge's Password Monitor (2021).** The browser checks saved
passwords against a server's list of breached credentials without telling the
server which passwords it holds, using homomorphic encryption from SEAL for a
private set intersection, with an OPRF in front
([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)).

**Apple's Live Caller ID Lookup (iOS 18, 2024).** When an unknown number calls,
the phone asks a caller-ID or spam-blocking service about it without revealing
the number. The query is a **keyword private information retrieval** request:
the phone encrypts the number under BFV with post-quantum 128-bit parameters, the
server evaluates a function over its whole database (shard) on the ciphertext,
and the encrypted answer contains only the entry for that number. The server
learns neither the number nor the answer. Apple published the library and an
example server so that third-party caller-ID apps can run their own.

**Apple's Enhanced Visual Search (iOS 18, 2024).** When Photos sees what might
be a landmark, the phone computes a vector embedding of that region, encrypts it
under BFV, and sends it through an Oblivious HTTP relay run by a third party, so
that Apple's server sees neither the content nor the phone's IP address. The
server computes encrypted similarity scores against its landmark database (a
**private nearest-neighbor search**) and returns them; the phone decrypts and
picks the best match. Apple also adds fake queries so that the pattern of
traffic satisfies differential privacy
(Chapter 19), with a stated
$\varepsilon = 0.8$ and $\delta = 10^{-6}$. The feature was switched on by default,
and when people noticed in December 2024 it caused a public argument: the
cryptography protected the photos well, but users had not been asked. A sound
design does not replace consent.

**Paillier in production.** Google's Private Join and Compute (2019), told in
[Chapter 10](10-Multi-Party-Computation-in-Practice.md), uses a Diffie-Hellman
intersection and then Paillier to add up values attached to the matching
records, so that the two companies learn only a total. Threshold-ECDSA wallets
use Paillier inside every signature ([Chapter 4](04-Threshold-Cryptography.md)).

!!! note "Life story: Apple's homomorphic lookups"
    **Born:** 2024, Apple, in iOS 18: Live Caller ID Lookup and Enhanced Visual
    Search, with the open-source swift-homomorphic-encryption library ·
    **Purpose:** look up a phone number or match a photo region against a server
    database without the server learning the query · **Helped:** the first
    fully homomorphic (lattice) encryption in a mass-market phone feature,
    with BFV, PIR, nearest-neighbor search, OHTTP and differential privacy
    working together · **Status:** current; the default-on setting of
    Enhanced Visual Search drew criticism in late 2024

!!! note "Life story: the Homomorphic Encryption Security Standard"
    **Born:** November 2018, HomomorphicEncryption.org, an open group of
    researchers from universities, companies and government · **Purpose:**
    agreed parameters and security levels for BGV and BFV, so that libraries
    and users compare like with like · **Helped:** every major library's
    default parameters; the starting point for the ISO/IEC 18033-8 work and
    then ISO/IEC 28033 · **Status:** current as a community standard; the
    ISO/IEC 28033 parts are on their way to replacing it as the formal
    reference

## 12.14 Going deeper

*Level: expert.*

**IND-CPA-D, precisely.** In the IND-CPA-D game the attacker submits pairs of
messages and receives encryptions of one side of each pair (as in left-or-right
IND-CPA), asks for homomorphic evaluations of functions of its choice on those
ciphertexts, and may ask for the decryption of any resulting ciphertext *whose
two sides decrypt to the same value*, so that the decryption cannot trivially
reveal the hidden bit. For an exact scheme with perfect correctness, decryption
then tells the attacker only what it already knew, and IND-CPA implies
IND-CPA-D. CKKS fails because decryption returns noise; exact schemes with a
non-negligible failure probability fail because a failure is itself
information. IND-CPA-D sits strictly between IND-CPA and IND-CCA1.

**Chosen-ciphertext attacks.** IND-CCA2 is impossible for any scheme with a
public homomorphism. Even IND-CCA1, where decryption queries are allowed only
before the challenge, fails for the deployed lattice schemes: Loftus, May, Smart
and Vercauteren showed in 2011 that a few hundred well-chosen decryption queries
recover the key of Gentry-style somewhat homomorphic schemes, and later papers
did the same for the LWE schemes, by submitting ciphertexts with chosen noise
and watching where decryption flips. A key owner must never decrypt
ciphertexts from someone who could have crafted them.

**Circuit privacy.** IND-CPA protects the inputs from the server. It does not
protect the server's function from the key owner: the noise in the returned
ciphertext depends on what was computed, and with care the key owner can learn
about the function from it. A scheme is **circuit private** if the result
reveals only $f(x)$. Paillier's rerandomization achieves it; lattice schemes need
**noise flooding** (adding large fresh noise before returning) or
**sanitization** by repeated bootstrapping and rerandomization (Ducas and Stehlé,
2016). In the Mars example, circuit privacy is what protects the lab's weights
beyond what the outputs reveal.

**Integrity.** FHE says nothing about whether the server ran the agreed
function. Combining FHE with succinct proofs of correct computation
([Chapter 7](07-SNARKs.md)) gives verifiable FHE, but proving that a bootstrap
was done correctly costs far more than doing it, and as of 2026 this is research,
not practice. Some systems instead run the computation on two non-colluding
servers and compare.

**Threshold and multi-key FHE.** The key need not belong to one party. In
threshold FHE (Asharov, Jain, López-Alt, Tromer, Vaikuntanathan and Wichs,
EUROCRYPT 2012) several parties generate a joint public key and share the
secret, everyone encrypts under the joint key, the server computes, and
decryption needs a quorum, as in [Chapter 4](04-Threshold-Cryptography.md). In
multi-key FHE (López-Alt, Tromer and Vaikuntanathan, STOC 2012) each party
encrypts under its own key and the server computes across them. Both turn FHE
into a multi-party computation protocol with very few rounds, which matters
whenever rounds are expensive, as they are between Mars and Earth. The partial
decryptions must be flooded with noise for the same reason as in §12.10.

**What is post-quantum.** Paillier, Goldwasser-Micali, ElGamal and BGN all fall
to Shor's algorithm. BGV, BFV, CKKS, GSW, FHEW and TFHE rest on (ring) LWE and
are believed to resist quantum computers, with the caveat that their moduli are
far larger than ML-KEM's and their security is set by the same estimator. Their
circular-security assumption has no quantum attack known either. An FHE
deployment built today is one of the few advanced protocols in this book that
needs no post-quantum migration.

**What the noise really costs.** In BGV and BFV the noise budget is measured
in bits: a fresh ciphertext at $N = 8192$ with a 218-bit modulus has roughly 150
to 190 bits of budget depending on $t$, and each multiplication spends tens of
bits. Libraries such as SEAL report the remaining budget. Planning a computation
means choosing $N$ and $q$ for its multiplicative depth, which is why compilers
(Concrete, HEIR and others) that do this automatically have become as important
as the schemes.

## Check yourself

??? question "1. Textbook RSA with $n = 55$, $e = 3$: the ciphertexts of 2 and 4 are 8 and 9. Without decrypting, what is the ciphertext of 8?"

    Multiply the ciphertexts: $8 \cdot 9 = 72 \equiv 17 \pmod{55}$. Check:
    $8^3 = 512 = 9 \cdot 55 + 17$. RSA's multiplicative homomorphism gives the
    encryption of $2 \cdot 4$ from the two ciphertexts alone.

??? question "2. Why does real RSA encryption (with OAEP padding) lose the homomorphism, and why is that a good thing?"

    OAEP encodes the message with random padding and a hash-based structure
    before exponentiation. The product of two padded values is not a valid
    padded value, so it decrypts to an error. That loss is deliberate: it makes
    RSA-OAEP non-malleable and IND-CCA2 secure, which a homomorphic scheme can
    never be.

??? question "3. In exponential ElGamal, why can only small totals be decrypted, and why is that acceptable for an election?"

    Decryption yields $g^m$, and recovering $m$ is a discrete logarithm, which
    is only feasible when $m$ is known to lie in a small range (by search or
    baby-step giant-step). An election tally is at most the number of voters, a
    few million at most, so a search of about $\sqrt{10^7}$ steps suffices.

??? question "4. With Paillier keys $n = 77$, $\lambda = 30$, $\mu = 18$, decrypt $c = 1928$ (Cy's ballot from §12.4)."

    $1928^{30} \bmod 5929 = 2311 = 1 + 30 \cdot 77$. Then $L = (2311 - 1)/77 = 30$ and $30 \cdot 18 = 540 \equiv 1 \pmod{77}$. The
    vote is 1. (The same value, 2311, appears for Ana's ballot, because
    $c^\lambda$ does not depend on $r$.)

??? question "5. A voter submits a Paillier encryption of 77 − 1 = 76 instead of 0 or 1. What happens to the tally of §12.4, and what prevents it in practice?"

    $76 \equiv -1 \pmod{77}$, so the ballot subtracts one vote from the total, and
    the counter cannot see it. Real systems require each ballot to carry a
    zero-knowledge proof that it encrypts 0 or 1 (an OR-proof, Chapter 6), and
    reject ballots without a valid proof.

??? question "6. In the DGHV example with $p = 101$, a ciphertext with noise 9 is multiplied by one with noise 7. Does the product decrypt correctly? What about adding six ciphertexts with noise 9?"

    The product's noise is $9 \cdot 7 = 63 > 50.5$, so it wraps around and
    decrypts wrongly (63 mod 101 centered is $-38$, even, but $1 \cdot 1 = 1$).
    Six additions give noise $54 > 50.5$, also too much: additions grow noise
    slowly, but they do grow it.

??? question "7. Bootstrapping needs the scheme to evaluate its own decryption circuit. Why does it also need circular security, and how can leveled FHE avoid it?"

    The bootstrapping key is the secret key encrypted under its own public key,
    a message that depends on the key, which the IND-CPA proof does not cover.
    Leveled FHE uses a chain of keys, each encrypted under the next, so no key
    is ever encrypted under itself; the cost is one key per level, so the depth
    must be fixed in advance.

??? question "8. Explain in two sentences why BGV's modulus switching makes the needed modulus grow linearly rather than exponentially with depth."

    Dividing the ciphertext by a factor about the size of the fresh noise $B$
    brings the noise after a multiplication from about $B^2$ back to about $B$.
    So each level costs a fixed number of bits of modulus, about $\log_2 B$,
    instead of doubling the noise's bit length at every level.

??? question "9. Why does showing a decrypted CKKS result to the server that computed it leak the key, and why does the same not happen with exact BFV run with negligible failure probability?"

    CKKS decryption returns $\Delta x + e$ exactly, so the server knows $c_0$, $c_1$
    and $c_0 + c_1 s$: a noise-free linear equation (in the ring, $N$ of them) in
    $s$. Exact BFV decryption rounds the noise away and returns only $m$, which
    the server could not use to learn $e$, unless decryption sometimes fails,
    in which case the failures leak information about the noise.

??? question "10. In the Mars example, the clinic wants the lab to compute the variance itself rather than just $\sum x$ and $\sum x^2$. Can the lab do it with Paillier alone?"

    The variance is $\frac{1}{k-1}\left(\sum x^2 - (\sum x)^2 / k\right)$. The lab
    can compute $\mathrm{Enc}(\sum x^2)$ and $\mathrm{Enc}(\sum x)$, but not
    $\mathrm{Enc}((\sum x)^2)$, since Paillier cannot multiply two encrypted
    values. It would need a scheme with a multiplication (BGN for one
    multiplication, or BFV/CKKS), or the clinic finishes the last step after
    decryption, as in §12.12.

## What you learned

- Homomorphic encryption lets a party without the key compute on ciphertexts;
  the key holder decrypts the result. Partially homomorphic schemes do one
  operation, leveled schemes a bounded number, fully homomorphic schemes any
  circuit.
- Textbook RSA and ElGamal multiply under encryption; exponential ElGamal adds,
  with small results. Goldwasser-Micali adds bits; Paillier adds numbers mod $n$
  and multiplies them by known constants, because $(1 + n)^m \equiv 1 + mn \pmod{n^2}$.
- Every homomorphic scheme is malleable and at best IND-CPA. Inputs must be
  authenticated or proved well formed, and decryption offered only for the
  ciphertexts a protocol intends.
- Lattice-based schemes carry noise that addition grows slowly and
  multiplication fast. Gentry's 2009 bootstrapping refreshes a ciphertext by
  evaluating decryption homomorphically, at the price of a circular-security
  assumption.
- BGV and BFV (exact, batched), CKKS (approximate) and TFHE (a bootstrap per
  gate, with lookup tables) are the schemes in use. Modulus switching keeps
  noise in check, relinearization keeps ciphertexts small, and CKKS decryptions
  must be noise-flooded before they are shared.
- FHE is millions of times slower per gate than computing in the clear, but fast
  enough for lookups and small models: Apple has used BFV in iOS since 2024, and
  ISO/IEC 28033 is close to its first published parts.

**Next:** [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md),
encryption to a name or a policy, and functional encryption, which lets a key
reveal one function of the data and nothing else.

## Further reading

- Ronald Rivest, Leonard Adleman and Michael Dertouzos, "On Data Banks and
  Privacy Homomorphisms", in *Foundations of Secure Computation* (Academic
  Press, 1978).
- Shafi Goldwasser and Silvio Micali, "Probabilistic Encryption and How to Play
  Mental Poker Keeping Secret All Partial Information" (STOC 1982); journal
  version "Probabilistic Encryption", *Journal of Computer and System Sciences*
  28 (1984).
- Taher ElGamal, "A Public Key Cryptosystem and a Signature Scheme Based on
  Discrete Logarithms", *IEEE Transactions on Information Theory* 31 (1985).
- Pascal Paillier, "Public-Key Cryptosystems Based on Composite Degree
  Residuosity Classes" (EUROCRYPT 1999).
- Ivan Damgård and Mads Jurik, "A Generalisation, a Simplification and Some
  Applications of Paillier's Probabilistic Public-Key System" (PKC 2001).
- Dan Boneh, Eu-Jin Goh and Kobbi Nissim, "Evaluating 2-DNF Formulas on
  Ciphertexts" (TCC 2005).
- Craig Gentry, "Fully Homomorphic Encryption Using Ideal Lattices" (STOC 2009),
  and *A Fully Homomorphic Encryption Scheme* (PhD thesis, Stanford University,
  2009).
- Craig Gentry, "Computing Arbitrary Functions of Encrypted Data",
  *Communications of the ACM* 53 (2010): the glove-box story.
- Marten van Dijk, Craig Gentry, Shai Halevi and Vinod Vaikuntanathan, "Fully
  Homomorphic Encryption over the Integers" (EUROCRYPT 2010).
- Craig Gentry and Shai Halevi, "Implementing Gentry's Fully-Homomorphic
  Encryption Scheme" (EUROCRYPT 2011).
- Zvika Brakerski and Vinod Vaikuntanathan, "Efficient Fully Homomorphic
  Encryption from (Standard) LWE" (FOCS 2011).
- Zvika Brakerski, Craig Gentry and Vinod Vaikuntanathan, "(Leveled) Fully
  Homomorphic Encryption without Bootstrapping" (ITCS 2012).
- Zvika Brakerski, "Fully Homomorphic Encryption without Modulus Switching from
  Classical GapSVP" (CRYPTO 2012); Junfeng Fan and Frederik Vercauteren,
  "Somewhat Practical Fully Homomorphic Encryption" (IACR ePrint 2012/144).
- Nigel Smart and Frederik Vercauteren, "Fully Homomorphic SIMD Operations"
  (IACR ePrint 2011/133; *Designs, Codes and Cryptography*, 2014).
- Loftus, May, Smart and Vercauteren, "On CCA-Secure Somewhat Homomorphic
  Encryption" (SAC 2011).
- Craig Gentry, Amit Sahai and Brent Waters, "Homomorphic Encryption from
  Learning with Errors: Conceptually-Simpler, Asymptotically-Faster,
  Attribute-Based" (CRYPTO 2013).
- Léo Ducas and Daniele Micciancio, "FHEW: Bootstrapping Homomorphic Encryption
  in Less Than a Second" (EUROCRYPT 2015).
- Ilaria Chillotti, Nicolas Gama, Mariya Georgieva and Malika Izabachène,
  "Faster Fully Homomorphic Encryption: Bootstrapping in Less than 0.1 Seconds"
  (ASIACRYPT 2016); "TFHE: Fast Fully Homomorphic Encryption over the Torus",
  *Journal of Cryptology* 33 (2020).
- Léo Ducas and Damien Stehlé, "Sanitization of FHE Ciphertexts" (EUROCRYPT
  2016).
- Jung Hee Cheon, Andrey Kim, Miran Kim and Yongsoo Song, "Homomorphic
  Encryption for Arithmetic of Approximate Numbers" (ASIACRYPT 2017).
- Martin Albrecht et al., *Homomorphic Encryption Security Standard*
  (HomomorphicEncryption.org, November 2018).
- Baiyu Li and Daniele Micciancio, "On the Security of Homomorphic Encryption on
  Approximate Numbers" (EUROCRYPT 2021).
- Baiyu Li, Daniele Micciancio, Mark Schultz and Jessica Sorrell, "Securing
  Approximate Homomorphic Encryption Using Differential Privacy" (CRYPTO 2022).
- Jung Hee Cheon, Hyeongmin Choe, Alain Passelègue, Damien Stehlé and Elias
  Suvanto, "Attacks Against the IND-CPA-D Security of Exact FHE Schemes" (CCS
  2024); Marina Checri, Renaud Sirdey, Aymen Boudguiga and Jean-Paul Bultel,
  "On the Practical CPA-D Security of 'Exact' and Threshold FHE Schemes and
  Libraries" (CRYPTO 2024).
- Shruthi Gorantala et al., "A General Purpose Transpiler for Fully Homomorphic
  Encryption" (Google, 2021).
- Apple, "Combining Machine Learning and Homomorphic Encryption in the Apple
  Ecosystem" (Apple Machine Learning Research, 2024), and "Announcing Swift
  Homomorphic Encryption" (Swift.org, 2024).
- ISO/IEC 18033-6:2019, *Encryption algorithms, Part 6: Homomorphic encryption*;
  ISO/IEC 28033 parts 1 to 4, *Fully homomorphic encryption* (drafts, 2024 to
  2026).
- Reference page: [Homomorphic encryption](../../11-advanced/Homomorphic-Encryption.md).
  Book 1's short version: [Advanced protocols](../../book/23-Advanced-Protocols.md).
