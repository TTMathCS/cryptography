# 1. Mathematics for Secrets

*Modern cryptography is mathematics put to work. A cipher is a function, a key is
a choice among a huge number of functions, and security is a statement about how
many steps an attacker would need. This chapter sets up everything the rest of
the book stands on: the notation, the idea of a function and its inverse, what a
proof is and how to read one, how to count the cost of a computation, how big
the numbers in cryptography really are, and the single idea that makes public-key
cryptography possible, the one-way function. You will multiply two primes in a
millionth of a second, then watch your computer take far longer to pull them
apart again, and you will write your first three proofs.*

!!! abstract "In this chapter"
    **You will learn:**

    - why cryptography became a branch of mathematics, and when;
    - the notation used in this book and in research papers, and how to read a
      line of symbols aloud;
    - sets, functions, inverses and permutations, and why a cipher is a family
      of permutations chosen by a key;
    - what a proof is, with three short proofs done in full (direct,
      contradiction, induction);
    - how to measure the cost of an algorithm with $O(\cdot)$ and bits, and why
      "polynomial" means easy and "exponential" means hard;
    - what $2^{128}$ means in seconds, joules and grains of sand;
    - one-way functions and trapdoors, the idea behind every public-key system.

    **You need:** school algebra (powers, logarithms, solving an equation) and
    a little Python. [Chapter 1](../../book/01-What-Cryptography-Is-For.md) of
    *The cryptography book* gives the plain-language goals that this book
    makes precise; reading it first helps but is not required.

    **Levels:** §1.1 to §1.4 are for beginners, §1.5 to §1.9 are intermediate,
    §1.10 is expert.

## 1.1 The problem

*Level: beginner.*

Arcadia City sits on the plains of Arcadia Planitia, and every message it sends
to Earth crosses between 55 million and 400 million kilometers of space. Light
takes about 3 minutes to make the trip when the two planets are closest and
about 22 minutes when they are on opposite sides of the Sun. A question asked
from Arcadia and answered from Earth takes between 6 and 44 minutes to come back.
Anyone with a big enough dish antenna, on Earth, on Mars or on a ship in
between, can hear every word.

So suppose the city's hospital needs to send a patient's records to a specialist
in Toronto. They must stay private. The two sides have never met. They cannot
run a long conversation to agree on a password, because each exchange costs
most of an hour, and anyway every exchange is overheard. What can they possibly
do?

For most of history the honest answer was: nothing. Before the 1970s, two
people who wanted to write secretly had to share a secret first, delivered by a
trusted courier, sewn into a coat lining, or carried in a diplomatic bag. The
methods for using that shared secret were a craft. People invented clever
schemes, other people broke them, and the art moved forward by experience. It
was not mathematics, and the mathematicians of the time said so proudly. The
English number theorist G. H. Hardy wrote in 1940, in *A Mathematician's
Apology*, that nobody had yet found any warlike purpose for the theory of
numbers, and that it seemed unlikely anyone would for many years. He was wrong
within a lifetime, and the mistake is the reason this book exists.

Three things changed between 1945 and 1980.

First, Claude Shannon at Bell Labs wrote a theory of secrecy, finished as a
classified report in 1945 and published in 1949, that defined secrecy with
probability and proved what it would cost (Chapter 17 of this book does his
proof). For the first time one could say, in symbols, what it means for a
cipher to be perfect.

Second, computers made it possible to do arithmetic on numbers hundreds of
digits long in a fraction of a second. Problems that had been curiosities, such
as "is this 300-digit number prime?", became things a machine could answer
before you finished asking.

Third, and most important, in 1976 Whitfield Diffie and Martin Hellman at
Stanford published a paper called "New Directions in Cryptography". It began
with the sentence "We stand today on the brink of a revolution in cryptography",
and it described a way for two people who have never met to agree on a secret
over a line that everyone can hear. The method rests on a mathematical
observation: some calculations are easy to do and very hard to undo. A year
later Ron Rivest, Adi Shamir and Leonard Adleman at MIT found a second such
method, RSA, resting on a different observation of the same kind. It later came
out that James Ellis, Clifford Cocks and Malcolm Williamson at the British
signals agency GCHQ had found both ideas between 1969 and 1974 and kept them
secret.

The hospital in Arcadia City uses exactly these ideas today. The connection
from its computers to Toronto is protected by a key agreement on an elliptic
curve (Chapters 12 and 13), signed with a certificate whose security rests on
the difficulty of a problem about numbers or curves, and the data itself is
encrypted with AES, whose design uses a finite field (Chapter 8) and a carefully
chosen nonlinear function (Chapter 10). Since 2024 the key agreement is
increasingly mixed with a second one based on lattices (Chapters 14 and 15),
because a large quantum computer (Chapter 20) would break the curve.

Every one of those words is mathematics. That is what this book teaches: not
the ciphers themselves, which *The cryptography book* covers, but the
mathematics underneath, done properly, slowly and with proofs, so that you can
read the preliminaries section of any cryptography paper without stopping.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Timeline from Hardy's 1940 remark to post-quantum standards in 2024" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="290" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="29" text-anchor="end" font-weight="bold">1940</text>
<circle cx="92" cy="24" r="3.5"/>
<text x="108" y="29">Hardy: number theory has no warlike use</text>
<text x="78" y="59" text-anchor="end" font-weight="bold">1949</text>
<circle cx="92" cy="54" r="3.5"/>
<text x="108" y="59">Shannon publishes the mathematics of secrecy</text>
<text x="78" y="89" text-anchor="end" font-weight="bold">1973</text>
<circle cx="92" cy="84" r="3.5"/>
<text x="108" y="89">Cocks at GCHQ finds RSA in secret</text>
<text x="78" y="119" text-anchor="end" font-weight="bold" class="acc-fill">1976</text>
<circle cx="92" cy="114" r="4.5" class="acc-fill"/>
<text x="108" y="119" class="acc-fill">Diffie and Hellman: "New Directions in Cryptography"</text>
<text x="78" y="149" text-anchor="end" font-weight="bold" class="acc-fill">1977</text>
<circle cx="92" cy="144" r="4.5" class="acc-fill"/>
<text x="108" y="149" class="acc-fill">Rivest, Shamir and Adleman publish RSA</text>
<text x="78" y="179" text-anchor="end" font-weight="bold">1985</text>
<circle cx="92" cy="174" r="3.5"/>
<text x="108" y="179">Koblitz and Miller propose elliptic curves</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">1994</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Shor: a quantum computer would factor quickly</text>
<text x="78" y="239" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="234" r="3.5"/>
<text x="108" y="239">Regev defines learning with errors</text>
<text x="78" y="269" text-anchor="end" font-weight="bold" class="acc-fill">2024</text>
<circle cx="92" cy="264" r="4.5" class="acc-fill"/>
<text x="108" y="269" class="acc-fill">NIST publishes lattice and hash standards (FIPS 203, 204, 205)</text>
</svg>
<figcaption>Figure 1.1. How cryptography became mathematics. Each line is a chapter of this book: Shannon in Chapter 17, RSA in Chapters 2 to 6, curves in 12 and 13, Shor in 20, lattices in 14 and 15.</figcaption>
</figure>

The rest of this chapter is a toolkit. If you studied mathematics at
university, skim §1.2 to §1.4 and slow down at §1.5. If you did not, read every
line: nothing later will be harder than what is here, only longer.

## 1.2 Reading mathematics

*Level: beginner.*

Mathematics is written in a compressed shorthand, and the shorthand is the main
thing that frightens people away. It is a language, and like any language it
reads easily once you know about forty words. This section gives you those
words. Keep it open in another tab while you read later chapters.

### Numbers

| Symbol | Read it as | Meaning |
|---|---|---|
| $\mathbb{N}$ | "the naturals" | $\{0, 1, 2, 3, \dots\}$ (some books start at 1; this one starts at 0) |
| $\mathbb{Z}$ | "the integers" | $\{\dots, -2, -1, 0, 1, 2, \dots\}$, from the German *Zahlen*, numbers |
| $\mathbb{Q}$ | "the rationals" | fractions $a/b$ with $a, b$ integers and $b \neq 0$ |
| $\mathbb{R}$ | "the reals" | every point on the number line, including $\sqrt 2$ and $\pi$ |
| $\mathbb{C}$ | "the complex numbers" | $a + bi$ with $i^2 = -1$ (needed only in Chapter 20) |
| $\mathbb{Z}_n$ or $\mathbb{Z}/n\mathbb{Z}$ | "Z mod n" | the remainders $\{0, 1, \dots, n-1\}$ with arithmetic that wraps (Chapter 3) |
| $\mathbb{F}_p$, $\mathrm{GF}(q)$ | "F p", "the Galois field of order q" | a finite field (Chapter 8) |

### Operations and relations

| Symbol | Read it as | Example |
|---|---|---|
| $a \mid b$ | "a divides b" | $3 \mid 12$ is true, $5 \mid 12$ is false |
| $a \bmod n$ | "a mod n" | the remainder: $17 \bmod 5 = 2$ |
| $a \equiv b \pmod n$ | "a is congruent to b mod n" | $17 \equiv 2 \pmod 5$, because $5 \mid 17 - 2$ |
| $\gcd(a, b)$ | "the gcd of a and b" | the greatest common divisor: $\gcd(12, 18) = 6$ |
| $\lfloor x \rfloor$, $\lceil x \rceil$ | "floor of x", "ceiling of x" | $\lfloor 3.7 \rfloor = 3$, $\lceil 3.2 \rceil = 4$ |
| $\lvert x \rvert$ | "absolute value of x", or "size of x" | $\lvert -5 \rvert = 5$; for a set $S$, $\lvert S \rvert$ is how many elements it has |
| $\log_2 x$ | "log base 2 of x" | $\log_2 1024 = 10$; roughly, the number of bits in $x$ |
| $\sum_{i=1}^{n} a_i$ | "the sum of a i for i from 1 to n" | $a_1 + a_2 + \dots + a_n$ |
| $\prod_{i=1}^{n} a_i$ | "the product" | $a_1 \cdot a_2 \cdots a_n$ |
| $n!$ | "n factorial" | $1 \cdot 2 \cdots n$, so $5! = 120$ |
| $\binom{n}{k}$ | "n choose k" | the number of ways to pick $k$ things from $n$ |
| $\oplus$ | "XOR" | bitwise exclusive or: $1 \oplus 1 = 0$, $1 \oplus 0 = 1$ |

### Sets and logic

| Symbol | Read it as | Example |
|---|---|---|
| $x \in S$ | "x is in S" | $3 \in \mathbb{Z}$ |
| $S \subseteq T$ | "S is a subset of T" | $\mathbb{N} \subseteq \mathbb{Z}$ |
| $\{x : P(x)\}$ | "the set of x such that P of x" | $\{x \in \mathbb{Z} : x > 0\}$ are the positive integers |
| $S \times T$ | "S cross T" | the set of pairs $(s, t)$ |
| $\{0,1\}^n$ | "bit strings of length n" | $\{0,1\}^2 = \{00, 01, 10, 11\}$ |
| $\{0,1\}^*$ | "all bit strings" | every finite string, of any length |
| $\forall$ | "for all" | $\forall x \in \mathbb{R},\ x^2 \geq 0$ |
| $\exists$ | "there exists" | $\exists x \in \mathbb{Z},\ x^2 = 4$ |
| $\Rightarrow$, $\iff$ | "implies", "if and only if" | $x = 2 \Rightarrow x^2 = 4$; the reverse fails ($x$ could be $-2$) |
| $f: A \to B$ | "f maps A to B" | a function with inputs in $A$ and outputs in $B$ |
| $x \xleftarrow{\$} S$ | "x is drawn at random from S" | pick an element of $S$ uniformly; used for keys |

The last line is particular to cryptography and you will see it on every page
of every paper: $k \xleftarrow{\$} \{0,1\}^{128}$ means "choose a 128-bit key
at random, every key equally likely".

### How to read a line aloud

Take the definition of a congruence and read it slowly:

$$a \equiv b \pmod n \iff n \mid (a - b).$$

Aloud: "*a* is congruent to *b* modulo *n* if and only if *n* divides *a* minus
*b*." Then check it on numbers: $38 \equiv 3 \pmod 7$? The difference is 35,
and $7 \mid 35$, so yes. $38 \equiv 4 \pmod 7$? The difference is 34, and 7 does
not divide 34, so no. **Always check a definition on small numbers before
going on.** That habit, more than any talent, is what separates people who
understand mathematics from people who memorize it. Every section of this book
starts with a worked example for exactly this reason.

Here is a harder line, from the definition of a one-way function in §1.7:

$$\Pr\left[\, x \xleftarrow{\$} \{0,1\}^n;\ x' \leftarrow A(f(x)) \;:\; f(x') = f(x) \,\right] \leq \varepsilon(n).$$

Aloud: "the probability, when *x* is chosen at random from the *n*-bit strings
and *x′* is whatever the attacker *A* outputs when it is given *f* of *x*, that
*f* of *x′* equals *f* of *x*, is at most epsilon of *n*." In plain words: give
an attacker the output of $f$ on a random input, and it almost never finds any
input that produces that output. The notation before the colon describes an
experiment; the part after the colon is the event whose probability we measure.
Chapter 16 makes this precise.

### Letters with jobs

Cryptographers reuse the same letters for the same jobs, and knowing the
convention saves effort:

- $p, q$: primes. $n$ or $N$: a product of primes, or a length in bits.
- $g$: a generator of a group. $x, a, b$: secret exponents. $h$: a hash value
  or a group element.
- $k$ or $K$: a key. $m$ or $M$: a message (plaintext). $c$ or $C$: a
  ciphertext. $\sigma$: a signature. $\lambda$ or $\kappa$: a security
  parameter. $\varepsilon$: a small probability.
- $A$ or $\mathcal{A}$: an adversary (attacker), an algorithm. $B$: a second
  algorithm built from $A$ in a reduction.
- $\mathbb{G}$: a group. $E$: an elliptic curve. $L$ or $\Lambda$: a lattice.
  $C$: also a code, in Chapter 18.

## 1.3 Sets, functions and permutations

*Level: beginner.*

### By hand: a cipher as a table

Take the five letters A, B, C, D, E and encrypt them with this table:

| plaintext | A | B | C | D | E |
|---|---|---|---|---|---|
| ciphertext | C | E | A | B | D |

Encrypting is reading down: A becomes C, B becomes E. Decrypting is reading up:
C came from A. The table works as a cipher for one reason: **no two letters in
the bottom row are the same.** If both A and B became C, then on receiving C you
could not tell which was sent.

That is the whole idea of a cipher, and mathematics has words for each part.

### Sets

A **set** is a collection of things, called its **elements**, with no order
and no repeats. $\{A, B, C, D, E\}$ is a set of five letters; $\{0,1\}^{8}$ is
the set of 256 bytes. The number of elements of a set $S$ is written $\lvert S
\rvert$. The set of all pairs $(s, t)$ with $s \in S$ and $t \in T$ is $S \times
T$, and it has $\lvert S \rvert \cdot \lvert T \rvert$ elements.

### Functions

A **function** $f: A \to B$ assigns to every element $a$ of the set $A$ (the
**domain**) exactly one element $f(a)$ of the set $B$ (the **codomain**). The
set of outputs that actually occur, $\{f(a) : a \in A\}$, is the **image** or
**range**.

Three properties matter in cryptography:

- $f$ is **injective** (one-to-one) if different inputs give different outputs:
  $f(a) = f(a') \Rightarrow a = a'$. An encryption function must be injective,
  or decryption is ambiguous.
- $f$ is **surjective** (onto) if every element of $B$ is an output of
  something.
- $f$ is **bijective** if it is both. Then every $b \in B$ is the output of
  exactly one $a \in A$, and the rule "send $b$ back to that $a$" is a function
  too, the **inverse** $f^{-1}: B \to A$, with $f^{-1}(f(a)) = a$ for every $a$.

A hash function is the opposite case: it maps the infinite set $\{0,1\}^*$ to
the finite set $\{0,1\}^{256}$, so it cannot be injective. Infinitely many
inputs share each output. Its security (Chapter 9 of *The cryptography book*)
is the claim that, even so, nobody can *find* two inputs that share one.

The step "the set of inputs is bigger than the set of outputs, so two inputs
must share an output" has a name: the **pigeonhole principle**. If you put
$n + 1$ pigeons into $n$ holes, some hole holds two. It sounds too obvious to
need a name, and yet it proves things that are not obvious at all, such as the
fact that any compression program that shrinks some files must enlarge others.

### Permutations

A bijection from a set to itself is a **permutation** of the set. The table
above is a permutation of $\{A, B, C, D, E\}$. A **block cipher** such as AES
is, for each key $k$, a permutation $E_k$ of the set $\{0,1\}^{128}$ of
128-bit blocks; decryption is the inverse permutation $E_k^{-1}$. The key does
nothing but choose which permutation.

How many permutations of an $n$-element set are there? The first element can go
to any of $n$ places, the second to any of the $n - 1$ remaining, and so on, so
there are

$$n! = n \cdot (n-1) \cdots 2 \cdot 1$$

of them. For five letters that is 120. For the 26 letters of the alphabet, the
number of simple substitution ciphers is $26! \approx 4 \times 10^{26}$, about
$2^{88}$, which sounds very secure and is not, because frequency analysis
breaks substitution without trying the keys (*The cryptography book*, Chapter
2). A large key space is necessary, never sufficient.

For 128-bit blocks the number of permutations is $(2^{128})!$, a number with
about $10^{40}$ digits. AES has only $2^{128}$ keys, so it can reach only a
vanishingly small fraction of all permutations. Its security claim is that the
permutations it does reach *look like* random ones to anyone who does not know
the key. Making "look like" precise is the job of Chapter 16.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Three kinds of functions drawn as arrows between dots: not injective, injective but not surjective, and bijective" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<ellipse cx="60" cy="115" rx="34" ry="80"/><ellipse cx="160" cy="115" rx="34" ry="80"/>
<ellipse cx="270" cy="115" rx="34" ry="80"/><ellipse cx="370" cy="115" rx="34" ry="80"/>
<ellipse cx="480" cy="115" rx="34" ry="80"/><ellipse cx="580" cy="115" rx="34" ry="80"/>
<line x1="66" y1="65" x2="152" y2="85"/><line x1="66" y1="105" x2="152" y2="85"/>
<line x1="66" y1="145" x2="152" y2="145"/>
<line x1="276" y1="65" x2="362" y2="60"/><line x1="276" y1="115" x2="362" y2="100"/>
<line x1="276" y1="165" x2="362" y2="180"/>
<line x1="486" y1="65" x2="572" y2="115"/><line x1="486" y1="115" x2="572" y2="165"/>
<line x1="486" y1="165" x2="572" y2="65"/>
</g>
<g>
<circle cx="60" cy="65" r="5"/><circle cx="60" cy="105" r="5"/><circle cx="60" cy="145" r="5"/>
<circle cx="160" cy="85" r="5"/><circle cx="160" cy="145" r="5"/>
<circle cx="270" cy="65" r="5"/><circle cx="270" cy="115" r="5"/><circle cx="270" cy="165" r="5"/>
<circle cx="370" cy="60" r="5"/><circle cx="370" cy="100" r="5"/><circle cx="370" cy="140" r="5"/><circle cx="370" cy="180" r="5"/>
<circle cx="480" cy="65" r="5"/><circle cx="480" cy="115" r="5"/><circle cx="480" cy="165" r="5"/>
<circle cx="580" cy="65" r="5"/><circle cx="580" cy="115" r="5"/><circle cx="580" cy="165" r="5"/>
</g>
<text x="110" y="222" text-anchor="middle">not injective (like a hash)</text>
<text x="320" y="222" text-anchor="middle">injective, not onto</text>
<text x="530" y="222" text-anchor="middle" class="acc-fill">bijective (a cipher)</text>
</svg>
<figcaption>Figure 1.2. Three functions. Left: two inputs share an output, so it cannot be undone. Middle: undoable, but some outputs never occur. Right: a bijection; when the two sets are the same set, it is a permutation, the shape of every block cipher.</figcaption>
</figure>

### Composition and inverses

If $f: A \to B$ and $g: B \to C$, the **composition** $g \circ f: A \to C$
means "do $f$, then $g$": $(g \circ f)(a) = g(f(a))$. Note the order: the
function written on the right acts first. A block cipher is a composition of
rounds, $E_k = R_{10} \circ R_9 \circ \cdots \circ R_1$, and its inverse is the
composition of the inverse rounds in the opposite order,

$$E_k^{-1} = R_1^{-1} \circ R_2^{-1} \circ \cdots \circ R_{10}^{-1},$$

just as you take off your shoes before your socks after putting on your socks
before your shoes.

### Code it

A permutation is easy to represent in Python as a list: position $i$ holds the
image of $i$. The inverse swaps positions and values.

```python
import random

def random_permutation(n, rng):
    p = list(range(n))
    for i in range(n - 1, 0, -1):          # Fisher-Yates: every permutation equally likely
        j = rng.randrange(i + 1)
        p[i], p[j] = p[j], p[i]
    return p

def inverse(p):
    inv = [0] * len(p)
    for i, v in enumerate(p):
        inv[v] = i
    return inv

def compose(g, f):                         # g after f
    return [g[f[i]] for i in range(len(f))]

rng = random.Random(2026)                  # fixed seed so the output is repeatable
p = random_permutation(8, rng)
print(p)
print(inverse(p))
print(compose(inverse(p), p))              # the identity
```

The output:

```text
[6, 7, 3, 0, 5, 4, 2, 1]
[3, 7, 6, 2, 5, 4, 0, 1]
[0, 1, 2, 3, 4, 5, 6, 7]
```

The shuffle in `random_permutation` is the **Fisher-Yates shuffle**, published
by Ronald Fisher and Frank Yates in 1938 as a pencil-and-paper method and put
in its computer form by Richard Durstenfeld in 1964. It is worth knowing
because people get it wrong: the tempting version that swaps each position with
*any* position, `rng.randrange(n)` instead of `rng.randrange(i + 1)`, makes
$n^n$ equally likely runs, and since $n^n$ is not a multiple of $n!$ for $n
\geq 3$, some permutations come out more often than others. Exercise 3 asks you
to see the bias. (The `random` module is fine for a shuffle in an example, never
for keys; Chapter 16 explains what to use and why.)

## 1.4 What a proof is

*Level: beginner.*

A **proof** is an argument that leaves no room for doubt: each step follows from
earlier steps, from definitions, or from facts already proved, and the last
step is the statement you wanted. Proofs matter more in cryptography than in
almost any other part of engineering, for a sad reason: testing cannot show
that a cipher is secure. A cipher that passes every statistical test you can
think of may still fall to the one test you did not think of. The history of
the field is full of systems that looked fine and were not (Chapter 17 of *The
cryptography book* tells several such stories). A proof, when we have one, covers
every attack at once.

What we can prove is usually conditional: "if factoring is hard, then this
scheme is secure". Such a proof is called a **reduction**, and Chapter 19 is
devoted to them. But the habits are the same as in every proof, and the best
way to learn them is to do some.

### Proof 1: a proof by induction

**Claim.** The sum of the first $n$ odd numbers is $n^2$.

Check first: $1 = 1$, $1 + 3 = 4$, $1 + 3 + 5 = 9$, $1 + 3 + 5 + 7 = 16$. It
looks true. Now we prove it for every $n$ at once, by **induction**.

Induction works like a row of dominoes. Show that the first domino falls (the
**base case**), and show that whenever one domino falls it knocks over the
next (the **inductive step**). Then they all fall.

*Proof.* Write $S(n) = 1 + 3 + \cdots + (2n - 1)$; the $n$-th odd number is $2n
- 1$.

*Base case.* $S(1) = 1 = 1^2$.

*Inductive step.* Suppose $S(n) = n^2$ for some $n \geq 1$. The next sum adds
the next odd number, $2(n+1) - 1 = 2n + 1$:

$$S(n+1) = S(n) + (2n+1) = n^2 + 2n + 1 = (n+1)^2.$$

So if the claim holds for $n$, it holds for $n + 1$. Since it holds for 1, it
holds for 2, hence for 3, and so for every $n$. $\blacksquare$

The black square $\blacksquare$ (or "QED", *quod erat demonstrandum*, "which
was to be shown") marks the end of a proof.

There is also a picture: arrange $n^2$ dots in a square and peel off L-shaped
layers from the corner. The layers have 1, 3, 5, 7, ... dots (Figure 1.3). A
picture like this is a fine way to *see* why something is true, but it is not
yet a proof for every $n$; the induction is.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="A 5 by 5 square of dots split into L-shaped layers of 1, 3, 5, 7 and 9 dots" fill="currentColor" font-size="14">
<g>
<circle cx="230" cy="170" r="7" class="acc-fill"/>
<circle cx="260" cy="170" r="7"/><circle cx="260" cy="140" r="7"/><circle cx="230" cy="140" r="7"/>
<circle cx="290" cy="170" r="7" class="acc-fill"/><circle cx="290" cy="140" r="7" class="acc-fill"/><circle cx="290" cy="110" r="7" class="acc-fill"/><circle cx="260" cy="110" r="7" class="acc-fill"/><circle cx="230" cy="110" r="7" class="acc-fill"/>
<circle cx="320" cy="170" r="7"/><circle cx="320" cy="140" r="7"/><circle cx="320" cy="110" r="7"/><circle cx="320" cy="80" r="7"/><circle cx="290" cy="80" r="7"/><circle cx="260" cy="80" r="7"/><circle cx="230" cy="80" r="7"/>
<circle cx="350" cy="170" r="7" class="acc-fill"/><circle cx="350" cy="140" r="7" class="acc-fill"/><circle cx="350" cy="110" r="7" class="acc-fill"/><circle cx="350" cy="80" r="7" class="acc-fill"/><circle cx="350" cy="50" r="7" class="acc-fill"/><circle cx="320" cy="50" r="7" class="acc-fill"/><circle cx="290" cy="50" r="7" class="acc-fill"/><circle cx="260" cy="50" r="7" class="acc-fill"/><circle cx="230" cy="50" r="7" class="acc-fill"/>
</g>
<text x="400" y="175">1</text><text x="400" y="145">+ 3</text><text x="400" y="115">+ 5</text><text x="400" y="85">+ 7</text><text x="400" y="55">+ 9 = 25 = 5²</text>
</svg>
<figcaption>Figure 1.3. The odd numbers build squares: each new L-shaped layer has two more dots than the last.</figcaption>
</figure>

### Proof 2: a proof by contradiction

**Claim.** There are infinitely many prime numbers.

A **prime** is a whole number greater than 1 whose only positive divisors are 1
and itself: 2, 3, 5, 7, 11, 13, .... This proof is in Euclid's *Elements*, Book
IX, Proposition 20, written around 300 BC, and it is still the one everyone
learns first.

A **proof by contradiction** assumes the opposite of what you want, and
reasons until something impossible comes out. Then the assumption was wrong.

*Proof.* Suppose there were only finitely many primes, say $p_1, p_2, \dots,
p_k$, all of them. Let

$$N = p_1 p_2 \cdots p_k + 1.$$

$N$ is bigger than 1, so it has at least one prime divisor $q$ (its smallest
divisor greater than 1 must be prime, because any divisor of that divisor would
be a smaller one). By our assumption $q$ is one of the $p_i$. But dividing $N$
by any $p_i$ leaves remainder 1, so no $p_i$ divides $N$. So $q$ is not on the
list, which contradicts the assumption that the list held every prime.
$\blacksquare$

A common misreading is that $N$ itself must be prime. It need not be: $2 \cdot
3 \cdot 5 \cdot 7 \cdot 11 \cdot 13 + 1 = 30031 = 59 \cdot 509$. The proof only
says that $N$ has a prime factor missing from the list, and 59 and 509 are both
missing. **Reading what a proof actually claims, no more and no less, is a
skill;** cryptographic security proofs are misread in exactly this way, and
Chapter 19 shows examples.

Why does a cryptographer care that primes never run out? Because RSA keys are
made from two random primes of 1,024 bits or more. If there were only a few
primes that size, an attacker could list them. Chapter 2 shows there are
more than $2^{1013}$ of them.

### Proof 3: a proof that something is impossible

**Claim.** $\sqrt{2}$ is not a fraction: there are no integers $a, b$ with $(a/b)^2 = 2$.

*Proof.* Suppose $\sqrt 2 = a/b$, and choose the fraction in lowest terms, so
$a$ and $b$ have no common factor. Squaring, $a^2 = 2b^2$. So $a^2$ is even.
The square of an odd number is odd ($(2m+1)^2 = 4m^2 + 4m + 1$), so $a$ itself
must be even: $a = 2c$. Then $4c^2 = 2b^2$, so $b^2 = 2c^2$, and by the same
reasoning $b$ is even. Now $a$ and $b$ are both even, which contradicts "lowest
terms". $\blacksquare$

This proof uses a pattern you will meet again in Chapter 2: a fact about
divisibility ("if 2 divides $a^2$ then 2 divides $a$") carries the whole
argument. That fact is a special case of **Euclid's lemma**, which says that if
a prime divides a product, it divides one of the factors. The lemma is the
reason factorization into primes is unique, and unique factorization is the
foundation of RSA.

### How to read a proof

You will meet many proofs in this book. They are short, but they are dense, and
reading one well is a different activity from reading prose:

1. **Read the statement and test it on a small example** before reading the
   proof. If you cannot say what it means for $n = 5$, you are not ready for
   the proof.
2. **Find the idea.** Most proofs have one trick (multiply all primes and add
   one; peel off an L-shaped layer) and the rest is bookkeeping. Look for it.
3. **Check each step and ask "why?"** If a step says "so $a$ is even", stop and
   say why. If you cannot, look at the previous line again.
4. **Ask where each assumption is used.** If a proof never uses that $p$ is
   prime, either the statement holds for all $n$ or you have misread something.
   In cryptographic proofs this question finds real bugs.
5. **Close the book and redo it.** You understand a proof when you can rebuild
   it from its idea.

!!! note "Life story: proof by reduction"
    **Born:** the idea of reducing one problem to another is old in
    mathematics; in its cryptographic form it began with Michael Rabin's 1979
    report showing that breaking his encryption scheme is as hard as factoring,
    and was made a discipline by Shafi Goldwasser and Silvio Micali's 1982 paper
    "Probabilistic Encryption" · **Purpose:** to prove a scheme secure without
    knowing whether any problem is truly hard, by showing that an attacker on
    the scheme could be turned into a solver for a problem everyone believes is
    hard · **Helped:** every modern security proof, from RSA-OAEP to ML-KEM;
    Goldwasser and Micali received the Turing Award for this work in 2012 ·
    **Status:** the standard way to argue security; Chapter 19 teaches it

## 1.5 Easy and hard: counting steps

*Level: intermediate.*

Cryptography is built on a gap: things that are easy for the people using the
system and hard for the attacker. To talk about that gap we need a way to say
how much work an algorithm does that does not depend on whose computer runs it.

### Count steps, not seconds

The cost of an algorithm is measured by how the number of basic steps grows
with the size of the input. For numbers, the size is the number of **digits**
or **bits**, never the number itself. A 2,048-bit RSA modulus is about $2^{2048}$
in value but only 2,048 in size, and an algorithm whose work grows with the
size is fast while one whose work grows with the value is hopeless.

The number of bits of a positive integer $N$ is $\lfloor \log_2 N \rfloor + 1$.
In Python it is `N.bit_length()`. As a rough rule, one decimal digit is about
3.32 bits, so a 617-digit number has about 2,048 bits.

### Big-O notation

We write $f(n) = O(g(n))$, read "*f* is big-O of *g*", when $f$ grows no faster
than a constant times $g$ for large $n$: there are constants $c$ and $n_0$
such that $f(n) \leq c \cdot g(n)$ for every $n \geq n_0$. The notation throws
away constant factors and small terms, which is what we want: whether a step
takes one nanosecond or three depends on the machine, while how the number of
steps grows does not.

The schoolbook methods for arithmetic on $n$-bit numbers cost:

| Operation | Schoolbook cost | Notes |
|---|---|---|
| addition, subtraction, comparison | $O(n)$ | one pass along the digits |
| multiplication | $O(n^2)$ | each digit times each digit; faster methods exist (Karatsuba 1962, $O(n^{1.585})$) |
| division with remainder | $O(n^2)$ | long division |
| $\gcd$ by Euclid's algorithm | $O(n^2)$ | Chapter 2 proves the number of steps is at most about $1.44\,n$ |
| $a^e \bmod N$ for $n$-bit $e$, $N$ | $O(n^3)$ | about $1.5n$ multiplications (Chapter 4) |
| trial division to factor $N$ | $O(2^{n/2})$ | try every divisor up to $\sqrt N$ |

The first five rows are **polynomial**: the cost is $n$ to some fixed power.
The last row is **exponential**: the cost doubles each time $n$ grows by two
bits. That difference is everything. Doubling the key size makes a
polynomial-time job $2^3 = 8$ times longer at worst, and makes an exponential job
square: if it took a year, it now takes a year multiplied by itself in seconds,
far longer than the universe has existed.

The best known factoring algorithm, the general number field sieve, sits in
between. Its cost is written

$$L_N\!\left[\tfrac13, \sqrt[3]{64/9}\right] = \exp\!\left( (1.923 + o(1)) \, (\ln N)^{1/3} (\ln \ln N)^{2/3} \right),$$

which is called **subexponential**: slower than any polynomial in $n = \log_2
N$, faster than any $2^{cn}$. Chapter 2 says more, and book 2 of this shelf,
[*Cryptanalysis*](../cryptanalysis/11-Factoring.md), runs the sieves. For now the point is only that the attacker's
best method grows much faster than the user's.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Graph of polynomial, subexponential and exponential cost against key size, on a logarithmic scale" fill="currentColor" font-size="13">
<line x1="70" y1="280" x2="610" y2="280" stroke="currentColor" stroke-width="1.4"/>
<line x1="70" y1="280" x2="70" y2="20" stroke="currentColor" stroke-width="1.4"/>
<text x="340" y="312" text-anchor="middle">key size n in bits (0 to 4096)</text>
<text x="22" y="150" transform="rotate(-90 22 150)" text-anchor="middle">log₂ of the number of steps</text>
<text x="64" y="284" text-anchor="end">0</text><text x="64" y="154" text-anchor="end">256</text><text x="64" y="24" text-anchor="end">512</text>
<text x="205" y="296" text-anchor="middle">1024</text><text x="340" y="296" text-anchor="middle">2048</text><text x="475" y="296" text-anchor="middle">3072</text><text x="610" y="296" text-anchor="middle">4096</text>
<polyline fill="none" stroke="currentColor" stroke-width="2" points="70,280 90,262 120,256 160,253 205,251 270,250 340,249 475,248 610,247"/>
<text x="600" y="240" text-anchor="end">user: n³, about 36 at n = 4096</text>
<polyline fill="none" class="acc" stroke-width="2.2" points="70,280 90,255 120,242 160,231 205,220 270,207 340,196 475,180 610,167"/>
<text x="600" y="160" text-anchor="end" class="acc-fill">number field sieve: subexponential</text>
<polyline fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" points="70,280 205,20"/>
<text x="215" y="40">trial division: 2^(n/2)</text>
</svg>
<figcaption>Figure 1.4. The gap. On a logarithmic scale the user's cost (exponentiation, about n³) is nearly flat, trial division climbs off the chart at 1,024 bits, and the number field sieve, the best known attack, climbs slowly but steadily: about 2⁸⁰ at 1,024 bits, 2¹¹² at 2,048, 2¹²⁸ at 3,072 (the estimates in SP 800-57).</figcaption>
</figure>

### Code it: feel the gap

Multiply two primes, then find them again by trial division, and time both.

```python
import time

p, q = 1000003, 998244353                 # two primes, 20 and 30 bits
t = time.perf_counter()
n = p * q
t_mul = time.perf_counter() - t
print(n)

def smallest_factor(n):
    if n % 2 == 0:
        return 2
    d = 3
    while d * d <= n:                       # a factor larger than sqrt(n) has a partner below it
        if n % d == 0:
            return d
        d += 2
    return n

t = time.perf_counter()
f = smallest_factor(n)
t_fac = time.perf_counter() - t
print(f, n // f)
print(t_fac > 1000 * t_mul)               # factoring took over a thousand times longer
```

```text
998247347733059
1000003 998244353
True
```

On a laptop the multiplication takes well under a microsecond and the factoring
a tenth of a second or so (the exact times vary, which is why the code prints
only the comparison). The number has 50 bits. Add 20 bits to the smaller prime
and the factoring would take about a thousand times longer, while the
multiplication would not notice. At RSA sizes, 1,024-bit primes, trial division
would need about $2^{1023}$ steps. That is the gap.

### Bits of security

Cryptographers measure the strength of a system in **bits of security**: a
system has $b$ bits of security if the best known attack needs about $2^b$
steps. AES-128 has 128 bits (the best attack is still essentially to try all
the keys). RSA with a 2,048-bit modulus has about 112, because the number field
sieve is much faster than trying all the keys. The elliptic curve P-256 has
about 128, because the best attack, Pollard's rho, costs about the square root
of the group size, $\sqrt{2^{256}} = 2^{128}$.

The standard comparison table, from NIST SP 800-57 Part 1, is:

| Security (bits) | Symmetric key | RSA or finite-field DH modulus | Elliptic curve |
|---|---|---|---|
| 80 | 2TDEA (retired) | 1,024 | 160 |
| 112 | 3TDEA | 2,048 | 224 |
| 128 | AES-128 | 3,072 | 256 |
| 192 | AES-192 | 7,680 | 384 |
| 256 | AES-256 | 15,360 | 512 |

Notice how unevenly the columns grow: going from 128 to 256 bits of security
doubles the symmetric key and the curve, and multiplies the RSA modulus by five.
This is what "subexponential" costs. It is the main reason elliptic curves
replaced RSA for key agreement, and Chapter 12 explains why curves have no
subexponential attack.

## 1.6 How big is big?

*Level: intermediate.*

Human intuition fails above a few million. Cryptography lives at $2^{128}$ and
beyond. This section builds a feeling for those numbers, because every security
argument eventually ends in a sentence like "this would take $2^{100}$ steps"
and you should know what that means.

### Powers of two

Since $2^{10} = 1024 \approx 10^3$, every ten bits are about three decimal
digits:

| Power | Approximately | Something that size |
|---|---|---|
| $2^{10}$ | $10^3$ | a thousand |
| $2^{20}$ | $10^6$ | a million: the number of seconds in 12 days |
| $2^{30}$ | $10^9$ | a billion: operations per second of one processor core, roughly |
| $2^{40}$ | $10^{12}$ | a trillion: bytes in a terabyte |
| $2^{56}$ | $7 \times 10^{16}$ | DES keys, searched by a \$250,000 machine in days in 1998 |
| $2^{64}$ | $1.8 \times 10^{19}$ | the first SHA-1 collision, in 2017, took about $2^{63}$ hash computations |
| $2^{93}$ | $10^{28}$ | about the hashes the Bitcoin network computes in a year (2025) |
| $2^{128}$ | $3.4 \times 10^{38}$ | AES-128 keys |
| $2^{256}$ | $1.2 \times 10^{77}$ | AES-256 keys; close to the number of atoms in the observable universe ($10^{78}$ to $10^{82}$) |

The Bitcoin row deserves a note, because it is the largest computation humans
have ever run. The network's hash rate was near $10^{21}$ hashes a second in
2025 (about one zettahash per second, according to public mining statistics). A
year has about $3.16 \times 10^7$ seconds, so that is about $3 \times 10^{28}
\approx 2^{95}$ hashes a year. Even this enormous worldwide effort, burning a
measurable fraction of the planet's electricity, is $2^{128 - 95} = 2^{33}$,
eight billion times, too small to search AES-128 keys in a year.

### Code it: time to search

```python
age = 13.8e9 * 365.25 * 86400             # age of the universe in seconds
print(f"{age:.3g}")
guesses = 1e18 * age                       # a billion billion guesses a second, since the Big Bang
print(f"{2**128 / guesses:.0f}")          # how many universe-ages to try every AES-128 key
import math
print(f"{math.log2(guesses):.1f}")        # the work, in bits
```

```text
4.35e+17
781
118.4
```

A computer making $10^{18}$ guesses a second, about the speed of the fastest
supercomputers of 2025, running since the Big Bang, would have covered only
$1/781$ of the AES-128 keys. On average it finds a key after half of them, so it
would need another 390 ages of the universe.

### The thermodynamic limit

There is an argument that does not depend on how good computers become.
Rolf Landauer showed in 1961 that erasing one bit of information costs at least
$kT \ln 2$ joules of energy, where $k = 1.380649 \times 10^{-23}$ J/K is
Boltzmann's constant and $T$ is the temperature. A counter that steps through
$2^{256}$ values must change state that many times. Even run at 3 kelvin, the
temperature of deep space, and paying only the Landauer cost per step, it would
need

$$2^{256} \times kT\ln 2 \approx 1.2 \times 10^{77} \times 2.9 \times 10^{-23} \approx 3.3 \times 10^{54} \ \text{joules}.$$

The Sun puts out about $3.8 \times 10^{26}$ watts, or $1.2 \times 10^{34}$
joules a year. Counting to $2^{256}$ would take all of the Sun's output for
about $3 \times 10^{20}$ years, twenty billion times the age of the universe, and
that is before doing anything useful with each value. Bruce Schneier made this
argument in *Applied Cryptography* (1996). It is why 256-bit keys are thought
safe against any computer built of matter, while 128-bit keys are safe against
any computer we can imagine building (quantum computers change this a little;
Chapter 20 explains why AES-128 still survives).

The same argument does *not* protect 128-bit keys: $2^{128} kT \ln 2$ at 3
kelvin is about $10^{16}$ joules, a few hours of a large power station.
Physics alone does not stop a 128-bit search; engineering does, and the gap is
the $2^{33}$ shown above. That is plenty, but it is a different kind of
argument.

### Probabilities that small

The other side of large numbers is small probabilities. If a key is 128 random
bits, the chance of guessing it in one try is $2^{-128} \approx 3 \times
10^{-39}$. The chance of being struck by lightning this year is around $10^{-6}$,
about $2^{-20}$; the chance of winning a large lottery jackpot is around $3
\times 10^{-9}$, about $2^{-28}$. Winning the lottery four times running is
about $2^{-112}$, still sixty thousand times more likely than one lucky guess of
an AES-128 key.

Cryptographers call a probability **negligible** when it is this kind of small,
and Chapter 16 gives the formal definition. In practice, anything below
$2^{-64}$ for a single event, or $2^{-128}$ when the attacker can repeat the
attempt freely, is treated as never going to happen.

## 1.7 One-way functions and trapdoors

*Level: intermediate.*

Everything so far leads to the idea that makes the Arcadia hospital's problem
solvable.

### By hand: a one-way street

Take the prime $p = 23$ and the number $g = 5$. Compute the powers of 5,
reducing modulo 23 after each multiplication (Chapter 3 explains the
arithmetic; here, just divide by 23 and keep the remainder):

| $x$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| $5^x \bmod 23$ | 5 | 2 | 10 | 4 | 20 | 8 | 17 | 16 | 11 | 9 | 22 |

| $x$ | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| $5^x \bmod 23$ | 18 | 21 | 13 | 19 | 3 | 15 | 6 | 7 | 12 | 14 | 1 |

Going forward is easy: $5^7 \bmod 23$ is 17, and Chapter 4 shows how to find
$5^x \bmod p$ for a 3,000-bit $p$ and $x$ in a few milliseconds. Going backward
means answering "which power of 5 gives 17?". With a table we just look it up.
For a 3,000-bit prime the table would have $2^{3000}$ entries, and the outputs
jump around with no visible pattern (look at the second row: 5, 2, 10, 4, 20,
8, ...). Nobody knows a fast way back. This backward problem is the **discrete
logarithm problem**, and Diffie and Hellman's key agreement rests on it.

Notice that every number from 1 to 22 appears exactly once in the table. So
$x \mapsto 5^x \bmod 23$ is a bijection from $\{1, \dots, 22\}$ to itself, a
permutation, easy to compute and, at real sizes, hard to undo. Such a number $g$
is called a **primitive root** or **generator**; Chapter 4 explains when they
exist and how to find one.

### The definition

A function $f$ is **one-way** if:

1. it is easy to compute: some algorithm computes $f(x)$ in time polynomial in
   the length of $x$; and
2. it is hard to invert: every efficient algorithm $A$, given $f(x)$ for a
   random $x$, finds some $x'$ with $f(x') = f(x)$ only with negligible
   probability.

The formal version is the line we read aloud in §1.2. Three details are worth
noticing:

- The input is **random**. A one-way function may be easy to invert on some
  inputs (multiplication is easy to undo when one factor is 2). Only typical
  inputs need to be hard.
- The attacker only has to find *some* preimage, not the original $x$.
- "Hard" means hard for every algorithm, including ones nobody has invented.
  That is why we cannot prove any particular function is one-way: doing so
  would also prove $\mathrm{P} \neq \mathrm{NP}$, the most famous open problem
  in computer science (§1.10).

The candidates everyone uses are:

| Function | Easy direction | Hard direction | Chapters |
|---|---|---|---|
| $(p, q) \mapsto pq$ for random primes | multiply | factor | 2, 6 |
| $x \mapsto g^x \bmod p$ | exponentiate | discrete logarithm | 4, 7 |
| $k \mapsto kP$ on an elliptic curve | scalar multiply | elliptic-curve discrete logarithm | 12, 13 |
| $(s, e) \mapsto As + e \bmod q$ with small $s, e$ | matrix multiply | learning with errors | 14, 15 |
| $e \mapsto He$ with $e$ of low weight | matrix multiply | syndrome decoding | 18 |
| $x \mapsto \mathrm{SHA\text{-}256}(x)$ | hash | find a preimage | book 1, Chapter 9 |

### Trapdoors

A one-way function lets you prove things and agree on keys, but encryption needs
more: the right person must be able to go backward. A **trapdoor one-way
function** is one that is hard to invert in general but easy to invert for
whoever holds a secret, the **trapdoor**.

RSA is the classic example. Pick primes $p, q$, let $N = pq$, and choose $e$.
The function $x \mapsto x^e \bmod N$ is believed one-way. But whoever knows $p$
and $q$ can compute a number $d$ with $x^{ed} \equiv x \pmod N$ for every $x$,
and undo the function by raising to the power $d$. Chapters 3 and 4 prove that
this works. The trapdoor is the factorization: knowing it, inversion is easy;
without it, the best known way to invert is to factor $N$.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="A one-way function drawn as an easy arrow forward and a blocked arrow back, with a trapdoor key opening the way back" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<rect x="40" y="70" width="150" height="70" rx="8"/>
<rect x="450" y="70" width="150" height="70" rx="8"/>
<path d="M190 90 L450 90" marker-end="url(#ar1)"/>
<path d="M450 125 L190 125" stroke-dasharray="6 5"/>
<path d="M300 112 l20 26 M320 112 l-20 26"/>
<path class="acc" d="M450 140 C 420 205, 220 205, 190 140" marker-end="url(#ar2)"/>
</g>
<defs>
<marker id="ar1" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
<marker id="ar2" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="acc-fill"/></marker>
</defs>
<text x="115" y="110" text-anchor="middle">x</text>
<text x="525" y="110" text-anchor="middle">f(x)</text>
<text x="320" y="80" text-anchor="middle">easy: milliseconds</text>
<text x="320" y="146" text-anchor="middle">hard: no known fast way</text>
<text x="320" y="212" text-anchor="middle" class="acc-fill">easy again, with the trapdoor (for RSA: the primes p and q)</text>
</svg>
<figcaption>Figure 1.5. A trapdoor one-way function. Anyone can go forward; nobody can go back, except the holder of the trapdoor.</figcaption>
</figure>

### Back to Arcadia City

Now the hospital's problem has an answer. The specialist in Toronto publishes
$N$ and $e$; anyone can see them. The hospital encrypts the records (in
practice, a random AES key that encrypts the records) by computing $x^e \bmod N$
and sends the result across the solar system. An eavesdropper sees $N$, $e$ and
$x^e \bmod N$ and is stuck at the hard direction. Toronto, holding $p$ and $q$,
walks back through the trapdoor. No conversation was needed, which suits a
40-minute round trip very well. The hospital does not even need to wait for
Toronto to be awake.

The real system is more careful than this sketch. Raw RSA has weaknesses
(*The cryptography book*, Chapter 13, breaks it several ways), and today the
key would more likely be agreed with elliptic-curve Diffie-Hellman plus ML-KEM.
But each of these is a one-way function with or without a trapdoor, and the
rest of this book teaches the mathematics that makes each one easy forward and
hard backward.

!!! note "Life story: the one-way function"
    **Born:** the phrase appears in Diffie and Hellman's 1976 paper, which
    credits John Gill and also mentions Roger Needham's 1960s idea of storing
    a one-way image of each password instead of the password itself; the
    formal definition with probabilities came from Andrew Yao in 1982 ·
    **Purpose:** to name the property that every public-key system and every
    password file needs: easy one way, hard the other · **Helped:** key
    agreement, public-key encryption, digital signatures, password hashing,
    and the theory linking cryptography to complexity · **Status:** no function
    has been proved one-way; the candidates in the table above are trusted
    because decades of attack have not inverted them, and the ones based on
    factoring and discrete logarithms are known to fall to quantum computers

## 1.8 Code it: the first public-key system

*Level: intermediate.*

Here is Diffie-Hellman key agreement with toy numbers, the same $p = 23$, $g =
5$ as the table. Alice (the hospital) and Bob (Toronto) each pick a secret
exponent, publish $g$ to that power, and raise the other's public number to
their own secret.

```python
p, g = 23, 5
a, b = 6, 15                    # secret exponents, normally random and huge
A = pow(g, a, p)                # Alice publishes A
B = pow(g, b, p)                # Bob publishes B
print(A, B)
print(pow(B, a, p), pow(A, b, p))   # both get g^(ab) mod p

# the eavesdropper sees p, g, A, B; at this size she can just search
x = next(x for x in range(1, p) if pow(g, x, p) == A)
print(x, pow(B, x, p))          # she recovers a and the shared secret
```

```text
8 19
2 2
6 2
```

Both sides arrive at 2 because $(g^b)^a = g^{ab} = (g^a)^b$. The eavesdropper
breaks it by trying all 22 exponents, which is the point of the last two lines:
at this size the backward direction is easy. At a 3,072-bit $p$ there are
about $2^{3072}$ exponents and the best known method, a number field sieve for
discrete logarithms, needs about $2^{128}$ steps. Python's built-in `pow(g, a,
p)` uses the square-and-multiply method of Chapter 4, and handles such sizes in
milliseconds.

## 1.9 In the real world

*Level: intermediate.*

**Hardy's prophecy, reversed.** Number theory, the purest of pure mathematics,
now protects nearly every web page. By 2024 well over 90 percent of page loads
in the Chrome and Firefox browsers used HTTPS, according to the browsers' own
published telemetry, and every one of those connections began with a key
agreement on a finite field or an elliptic curve.

**Secret discovery.** In 1970 James Ellis at GCHQ wrote an internal paper, "The
possibility of secure non-secret digital encryption", showing that public-key
encryption was possible in principle. In 1973 Clifford Cocks, a new recruit with
a mathematics degree from Cambridge, found a practical way to do it, reportedly
in about half an hour: essentially RSA with $e = N$. In 1974 Malcolm Williamson
found the equivalent of Diffie-Hellman. None of it was published until 1997. The
episode shows two things: the mathematics was ripe, and the world lost several
years of public use because it was kept secret.

**The mathematics outlived the machines.** DES (1977), a design with no
number theory in it, was broken by brute force in 1998. RSA, published the same
year, is still in use with longer keys, because its security depends on a
mathematical problem whose best attack has improved only slowly. The price is
size: RSA keys have grown from 512 bits in the early 1990s to 2,048 or 3,072
today. Elliptic curves, proposed in 1985 by Neal Koblitz and Victor Miller,
have needed no such growth: P-256, standardized around 2000, is still at its
original size.

**When mathematics breaks.** Sometimes the mathematics itself turns out to be
weaker than believed. SIKE, a post-quantum key agreement based on maps between
elliptic curves, reached the fourth round of NIST's competition; in July 2022
Wouter Castryck and Thomas Decru broke it in about an hour on a single
laptop core, using a theorem about abelian surfaces proved by Ernst Kani in
1997. Rainbow, a signature scheme based on systems of quadratic equations, fell
to Ward Beullens in a weekend of computing the same year. Both were found by
mathematics, not by computing power, which is why this book exists: you cannot
judge a scheme without the mathematics underneath it.

## 1.10 Going deeper

*Level: expert.*

**One-way functions and P versus NP.** If one-way functions exist, then
$\mathrm{P} \neq \mathrm{NP}$: inverting $f$ is a problem whose answers can be
checked quickly (compute $f(x')$ and compare), so it is in NP, and if P equalled
NP it could also be solved quickly. The converse is not known. $\mathrm{P} \neq
\mathrm{NP}$ says some problems are hard *in the worst case*, while cryptography
needs problems that are hard *on random inputs*, which is a stronger demand.
Chapter 19 develops this.

**Impagliazzo's five worlds.** In a 1995 paper Russell Impagliazzo described
five possible worlds, depending on which of the open questions come out which
way: *Algorithmica* ($\mathrm{P} = \mathrm{NP}$, no cryptography at all),
*Heuristica* (NP is hard in the worst case but easy on average), *Pessiland*
(hard average-case problems exist, but no one-way functions), *Minicrypt*
(one-way functions exist, so we have private-key cryptography, hashes and
signatures, but no public-key encryption), and *Cryptomania* (trapdoor
functions exist, and with them public-key cryptography). Everyone using HTTPS is
betting on Cryptomania. Nobody has proved we live there.

**What follows from one-way functions alone.** A remarkable series of results
showed how much can be built from any one-way function: pseudorandom
generators (Håstad, Impagliazzo, Levin and Luby, 1999, completing work begun in
1989), pseudorandom functions (Goldreich, Goldwasser and Micali, 1986), and
digital signatures (Rompel, 1990). Public-key encryption, by contrast, is
believed to need more structure; Impagliazzo and Rudich showed in 1989 that it
cannot be built from a one-way function used as a black box.

**Concrete numbers.** The asymptotic language of "polynomial" and "negligible"
is how theory states results. Practice needs numbers: "an attacker running $2^{80}$
steps wins with probability at most $2^{-40}$". Bellare and Rogaway pushed this
**concrete security** style from the mid-1990s, and most modern standards state
their claims this way. Chapter 19 shows how to turn a reduction into a key size.

**Further mathematics.** This book uses number theory, abstract algebra,
linear algebra, probability, information theory, coding theory, complexity
theory and a little quantum mechanics. Each is a full university course. The
chapters teach the part cryptography uses, but if one catches your interest,
the Further reading lists of each chapter give the standard textbooks.

## Check yourself

??? question "1. Read aloud, then decide true or false: $\forall n \in \mathbb{N},\ \exists p \text{ prime},\ p > n$."

    "For every natural number *n*, there exists a prime *p* greater than *n*."
    True: it is another way of saying there are infinitely many primes (§1.4).

??? question "2. Is $f(x) = 3x \bmod 10$ a permutation of $\{0, 1, \dots, 9\}$? Is $g(x) = 4x \bmod 10$?"

    $f$ gives 0, 3, 6, 9, 2, 5, 8, 1, 4, 7: every digit once, so yes. $g$ gives
    0, 4, 8, 2, 6, 0, 4, 8, 2, 6: only even digits, each twice, so no. The
    difference is that $\gcd(3, 10) = 1$ while $\gcd(4, 10) = 2$; Chapter 3
    proves that $x \mapsto ax \bmod n$ is a permutation exactly when $\gcd(a, n)
    = 1$.

??? question "3. Why does the 'naive shuffle' (swap each position with any position) give a biased permutation of three items?"

    It makes $3^3 = 27$ equally likely sequences of swaps, and each produces one
    of the $3! = 6$ permutations. Since 27 is not a multiple of 6, the
    permutations cannot all appear equally often. Counting shows three of them
    appear 5 times and the other three 4 times.

??? question "4. Prove by induction that $1 + 2 + \cdots + n = n(n+1)/2$."

    Base case $n = 1$: $1 = 1 \cdot 2 / 2$. Step: if the sum to $n$ is
    $n(n+1)/2$, the sum to $n+1$ is $n(n+1)/2 + (n+1) = (n+1)(n+2)/2$.

??? question "5. In Euclid's proof, why must $N = p_1 \cdots p_k + 1$ have a prime factor?"

    Every integer greater than 1 has a smallest divisor greater than 1. That
    divisor is prime, because any divisor of it greater than 1 would also divide
    $N$ and be smaller. Chapter 2 turns this into the full statement that every
    integer factors into primes.

??? question "6. A 1,024-bit number has about how many decimal digits?"

    $1024 \times \log_{10} 2 \approx 1024 \times 0.301 \approx 308$ digits.

??? question "7. An algorithm takes $n^3$ steps on $n$-bit inputs. Another takes $2^{n/2}$. At what size does the second become slower, and by how much is it slower at $n = 256$?"

    $2^{n/2} > n^3$ first when $n/2 > 3\log_2 n$, which happens at $n = 30$
    ($2^{15} = 32768 > 27000$). At $n = 256$ the first is $2^{24}$ steps, the
    second $2^{128}$: slower by a factor of $2^{104}$.

??? question "8. A computer tests $2^{40}$ keys per second. How long, on average, to find a 64-bit key? An 80-bit key?"

    On average half the keys: $2^{63}/2^{40} = 2^{23}$ seconds, about 97 days.
    For 80 bits: $2^{79}/2^{40} = 2^{39}$ seconds, about 17,400 years.

??? question "9. Using the table in §1.7, find the discrete logarithm of 13 to the base 5 modulo 23, and check it."

    The table shows $5^{14} \bmod 23 = 13$, so the logarithm is 14. Check with
    Python: `pow(5, 14, 23)` returns 13.

??? question "10. Why can no one currently prove that any function is one-way?"

    A proof would show that inverting the function is hard for every efficient
    algorithm. Inverting is an NP problem (a claimed preimage can be checked
    quickly), so such a proof would imply $\mathrm{P} \neq \mathrm{NP}$, which is
    unproved. Worse, one-wayness needs hardness on random inputs, which is
    stronger still.

## What you learned

- Cryptography became mathematics between 1945 and 1980: Shannon's theory of
  secrecy, computers that handle huge numbers, and Diffie and Hellman's
  observation that some calculations are easy forward and hard backward.
- The notation of the book: $\mathbb{Z}$, $\bmod$, $\equiv$, $\gcd$, $\mid$,
  sets, functions, $\xleftarrow{\$}$. Always test a definition on small numbers.
- A cipher is a family of permutations chosen by a key; decryption is the
  inverse permutation. A hash function cannot be injective, by the pigeonhole
  principle.
- A proof leaves no room for doubt. Induction and contradiction cover most of
  what this book needs; reductions, in Chapter 19, are the cryptographic kind.
- Cost is measured in bits of input: polynomial is easy, exponential is hard,
  and the number field sieve is subexponential, which is why RSA keys are long.
- $2^{128}$ is beyond any conceivable search; $2^{256}$ is beyond the energy
  output of the Sun.
- A one-way function is easy to compute and hard to invert on random inputs; a
  trapdoor makes inversion easy for one person. No function has been proved
  one-way.

**Next:** [Chapter 2](02-Divisibility-Primes-and-Factoring.md), the integers,
primes, Euclid's algorithm and why factoring is hard.

## Further reading

- G. H. Hardy, *A Mathematician's Apology* (Cambridge University Press, 1940).
- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949).
- Whitfield Diffie and Martin Hellman, "New Directions in Cryptography", *IEEE
  Transactions on Information Theory* 22 (1976).
- Ronald Rivest, Adi Shamir and Leonard Adleman, "A Method for Obtaining Digital
  Signatures and Public-Key Cryptosystems", *Communications of the ACM* 21 (1978).
- James Ellis, "The History of Non-Secret Encryption" (GCHQ, written 1987,
  released 1997).
- Andrew Yao, "Theory and Applications of Trapdoor Functions" (FOCS 1982).
- Russell Impagliazzo, "A Personal View of Average-Case Complexity" (Structure in
  Complexity Theory, 1995): the five worlds.
- Rolf Landauer, "Irreversibility and Heat Generation in the Computing Process",
  *IBM Journal of Research and Development* 5 (1961).
- Bruce Schneier, *Applied Cryptography*, 2nd edition (Wiley, 1996), §7.1 on the
  thermodynamic limit.
- SP 800-57 Part 1 Revision 5, Recommendation for Key Management (NIST, 2020):
  the security-strength table.
- Daniel Velleman, *How to Prove It*, 3rd edition (Cambridge University Press,
  2019): the best book on reading and writing proofs.
- Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH"
  (EUROCRYPT 2023, posted July 2022).
- In *The cryptography book*: [Chapter 1](../../book/01-What-Cryptography-Is-For.md),
  [Chapter 12](../../book/12-Diffie-Hellman.md) for Diffie-Hellman,
  [Chapter 13](../../book/13-RSA.md) for RSA.
