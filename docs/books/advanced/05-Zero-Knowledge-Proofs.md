# 5. Zero-Knowledge Proofs

*A proof usually teaches you something: read a proof that a number is composite
and you can see its factors. A zero-knowledge proof convinces you that a
statement is true and teaches you nothing else, not even enough to convince a
third person. This chapter builds the idea from its first definition in 1985:
the cave story told to children, the graph isomorphism proof worked by hand on
a four-vertex graph, the simulator that makes "nothing learned" precise, the
extractor that makes "the prover knows" precise, and the 1986 theorem that
every statement with a checkable witness has such a proof. You will code the
protocol, a simulator whose fake transcripts match the real ones exactly, a
cheating prover caught about half the time per round, and a round of the
three-coloring proof with hash commitments on a map of Arcadia City's
districts.*

!!! abstract "In this chapter"
    **You will learn:**

    - what Goldwasser, Micali and Rackoff defined in 1985: interactive proofs,
      and the three properties of completeness, soundness and zero knowledge;
    - how the cave story works, and why a video of it proves nothing;
    - the graph isomorphism proof, by hand and in code, with its 1/2 error per
      round and how repetition drives the error down;
    - how a simulator shows that a verifier learns nothing, by counting
      transcripts, and how rewinding handles a verifier who cheats;
    - what a proof of knowledge is, and how an extractor pulls the secret out
      of any prover who can answer both challenges;
    - the Goldreich-Micali-Wigderson theorem: a zero-knowledge proof for every
      NP statement, through three-coloring and commitments;
    - honest-verifier versus full zero knowledge, interactive proofs beyond NP
      (IP = PSPACE), and where zero knowledge is used today.

    **You need:** [Chapter 3](03-Commitments.md) (hash commitments, hiding and
    binding) and [Chapter 1](01-Computing-With-Secrets.md) (the simulator idea
    in plain words); permutations and a little probability. Book 1's
    [overview of zero-knowledge proofs](../../book/23-Advanced-Protocols.md) is
    the short version of this chapter.

    **Levels:** §5.1 to §5.3 are for beginners, §5.4 to §5.8 and §5.10 to
    §5.11 are intermediate, §5.9 and §5.12 are expert.

## 5.1 The problem

*Level: beginner.*

You hold a secret that would let you do something: the password for a server,
the key behind a public key, the solution of a puzzle someone else set, the
private record that shows you qualify for a benefit. Someone wants to be sure
that you hold it. The obvious way to convince them is to show it. That is how
most logins on the internet still work: you type your password, the server
compares it with what it stored, and now the server, and anyone who broke into
the server, has seen your password.

Showing the secret is a bad proof for three reasons. The verifier learns it and
can use it. Anyone listening learns it. And the verifier can show the secret to
a third party, so a proof given to one person becomes a proof given to
everybody. What you want is a way to convince the verifier that you hold the
secret while giving away nothing at all, not one bit, beyond the fact that the
statement is true.

Put that way it sounds impossible, because to most people a proof is a piece
of writing that anyone can check, and if the writing does not contain the
secret, how can it show you have it? The way out is to give up the idea of a
proof as a piece of writing. In 1985 Shafi Goldwasser and Silvio Micali at MIT
and Charles Rackoff at the University of Toronto published "The Knowledge
Complexity of Interactive Proof-Systems" at STOC, the main theory conference of
the year. They made two changes to what a proof is.

First, a proof becomes a **conversation**. A **prover** and a **verifier**
exchange messages, and at the end the verifier says accept or reject. The
verifier may ask questions the prover could not predict.

Second, a proof is allowed to be **probabilistic**. The verifier flips coins,
and a cheating prover may get lucky. What is demanded is that the chance of
getting lucky is tiny, say $2^{-40}$, and that the verifier can push it as low
as it likes by asking more questions. Mathematicians had never accepted a proof
that is "almost certainly" correct. Computer scientists had already accepted
probabilistic primality tests (Solovay and Strassen, 1977; Rabin, 1980), and
GMR argued that a proof which convinces with error $2^{-100}$ is in practice as
good as any other.

With those two changes the paper could ask a new question: how much
**knowledge** does a proof give away? It measured this "knowledge complexity"
and defined a proof with knowledge complexity zero: the verifier ends the
conversation knowing that the statement is true and nothing it could not have
worked out alone. That is a **zero-knowledge proof**, and the rest of this
chapter makes each word of the definition precise.

The paper had a difficult start. The usual account is that versions were
rejected by FOCS in 1983 and by STOC and FOCS in 1984 before STOC accepted it in
1985; drafts are said to date from 1982. This is told by people who were there,
but the reviews themselves are not public, so treat the exact count as oral
history. What is certain is what came after. A full version appeared in the
*SIAM Journal on Computing* in 1989. In 1993 the paper shared the first Gödel
Prize with László Babai and Shlomo Moran's paper on Arthur-Merlin games, which
had defined a closely related kind of interactive proof at the same time. In
2013 Goldwasser and Micali received the 2012 Turing Award, for work that
included this paper and their 1982 definition of probabilistic encryption.

The ideas then moved fast, as Figure 5.1 shows. Within a year Oded Goldreich,
Micali and Avi Wigderson showed that every statement with a short checkable
witness has a zero-knowledge proof, and Amos Fiat and Adi Shamir showed how to
turn such proofs into identification schemes and signatures for smart cards.
Today zero-knowledge proofs secure payments and blockchain transactions
worth billions of dollars.

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="Timeline of zero-knowledge proofs from 1985 to the 2020s" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="364" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1985</text>
<circle cx="92" cy="22" r="4"/>
<text x="108" y="27">Goldwasser, Micali, Rackoff define zero knowledge</text>
<text x="78" y="55" text-anchor="end" font-weight="bold">1986</text>
<circle cx="92" cy="50" r="4"/>
<text x="108" y="55">GMW: every NP statement; Fiat-Shamir signatures</text>
<text x="78" y="83" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="78" r="4"/>
<text x="108" y="83">Feige-Fiat-Shamir proofs of identity; non-interactive ZK</text>
<text x="78" y="111" text-anchor="end" font-weight="bold">1989</text>
<circle cx="92" cy="106" r="4"/>
<text x="108" y="111">The cave paper (CRYPTO '89); Schnorr identification</text>
<text x="78" y="139" text-anchor="end" font-weight="bold">1990</text>
<circle cx="92" cy="134" r="4"/>
<text x="108" y="139">IP = PSPACE: interactive proofs reach far beyond NP</text>
<text x="78" y="167" text-anchor="end" font-weight="bold">1992</text>
<circle cx="92" cy="162" r="4"/>
<text x="108" y="167">Kilian: short arguments built from PCPs</text>
<text x="78" y="195" text-anchor="end" font-weight="bold">1993</text>
<circle cx="92" cy="190" r="4"/>
<text x="108" y="195">The first Gödel Prize goes to interactive proofs</text>
<text x="78" y="223" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="218" r="4"/>
<text x="108" y="223">Turing Award to Goldwasser and Micali; Pinocchio</text>
<text x="78" y="251" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="246" r="4"/>
<text x="108" y="251">A zero-knowledge test for nuclear warheads (Nature)</text>
<text x="78" y="279" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="274" r="4"/>
<text x="108" y="279">Zcash launches; Groth16 proofs of 192 bytes</text>
<text x="78" y="307" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="302" r="4"/>
<text x="108" y="307">STARKs and Bulletproofs: no trusted setup</text>
<text x="78" y="335" text-anchor="end" font-weight="bold">2020s</text>
<circle cx="92" cy="330" r="4"/>
<text x="108" y="335">zk-rollups and zkVMs prove whole blocks of transactions</text>
</svg>
<figcaption>Figure 5.1. Zero knowledge from definition to deployment. The theory was essentially complete by 1993; practical proofs of whole computations took another twenty years.</figcaption>
</figure>

Three words in the definition will do all the work, and it helps to have them
in plain language before the formal versions:

- **Completeness:** if the statement is true and both sides follow the
  protocol, the verifier accepts.
- **Soundness:** if the statement is false, no prover, however clever and
  however much computing power it has, makes the verifier accept except with a
  small probability, the **soundness error**.
- **Zero knowledge:** whatever the verifier sees during the conversation, it
  could have produced by itself, without the prover, in about the same time.
  So seeing it taught the verifier nothing.

The third property is the new one, and it is stated in a clever way. Nobody
tries to list what the verifier "learned". Instead the definition says: there
is a program, the **simulator**, that produces fake conversations which look
exactly like real ones, using only the statement and no secret. If fakes are
indistinguishable from the real thing, then the real thing contains no
information the verifier did not already have. [Chapter 1](01-Computing-With-Secrets.md)
introduced this ideal-versus-real way of thinking for secure computation in
general; zero knowledge is where it was born.

!!! note "Life story: zero-knowledge proofs (GMR)"
    **Born:** drafts from about 1982; published at STOC 1985 by Shafi
    Goldwasser, Silvio Micali (MIT) and Charles Rackoff (Toronto); journal
    version in *SIAM Journal on Computing* 1989 · **Purpose:** to measure how
    much knowledge a proof gives away, and to define proofs that give away
    none · **Helped:** identification and signature schemes (Fiat-Shamir,
    Schnorr), the simulation paradigm used across all of cryptography, secure
    computation, anonymous credentials, SNARKs and STARKs · **Status:**
    current; the first Gödel Prize (1993) and part of the 2012 Turing Award

## 5.2 The cave

*Level: beginner.*

The best-known explanation of zero knowledge was written for children. At
CRYPTO '89, Jean-Jacques Quisquater and Louis Guillou, with members of their
families and Thomas Berson, presented "How to Explain Zero-Knowledge Protocols
to Your Children". It retells a version of the tale of Ali Baba and the forty
thieves, set in a cave with a strange shape, and it named the two players
**Peggy** (the prover) and **Victor** (the verifier), names that are still used.

The cave is a ring, shown in Figure 5.2. From the entrance a short corridor
leads to a fork. The left passage, A, and the right passage, B, curve around
and meet at the far side, where a door blocks the way. The door opens only for
someone who says the secret word. Peggy claims she knows the word. Victor wants
to be convinced, and Peggy does not want to tell him the word.

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="The ring-shaped cave: passages A and B meet at a door with a secret word; Peggy is inside, Victor waits at the entrance" fill="currentColor" font-size="14">
<path d="M 300 288.3 A 120 120 0 1 1 340 288.3" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="320" cy="170" r="80" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/>
<line x1="300" y1="288.3" x2="300" y2="332" stroke="currentColor" stroke-width="2"/>
<line x1="340" y1="288.3" x2="340" y2="332" stroke="currentColor" stroke-width="2"/>
<rect x="313" y="50" width="14" height="40" rx="2" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="38" text-anchor="middle" font-weight="bold">door: opens to the secret word</text>
<text x="220" y="176" text-anchor="middle" font-weight="bold" font-size="18">A</text>
<text x="420" y="176" text-anchor="middle" font-weight="bold" font-size="18">B</text>
<circle cx="232" cy="232" r="7"/>
<text x="210" y="262" text-anchor="end" font-weight="bold">Peggy</text>
<circle cx="320" cy="348" r="7"/>
<text x="336" y="353">Victor shouts: "come out of B!"</text>
<text x="320" y="152" text-anchor="middle" font-size="13">a bluffer survives</text>
<text x="320" y="170" text-anchor="middle" font-size="13">one round with 1/2,</text>
<text x="320" y="188" text-anchor="middle" font-size="13">twenty rounds with</text>
<text x="320" y="206" text-anchor="middle" font-size="13">about 1 in a million</text>
<text x="452" y="250">1. Peggy walks into</text>
<text x="452" y="268">A or B, unseen.</text>
<text x="452" y="292">2. Victor names a side.</text>
<text x="452" y="316">3. Peggy comes out</text>
<text x="452" y="334">that side, if she can.</text>
</svg>
<figcaption>Figure 5.2. The cave of "How to Explain Zero-Knowledge Protocols to Your Children" (CRYPTO '89). Peggy enters A or B while Victor waits outside the fork. Knowing the word, she can always come out of the side he names; without it she must have guessed his choice in advance.</figcaption>
</figure>

One round goes like this.

<div class="mars-steps" markdown>

1. Victor waits outside. Peggy walks in and takes passage A or B, choosing at random. Victor cannot see which.
2. Victor walks to the fork and shouts a side, A or B, chosen by a coin flip.
3. Peggy comes out of the passage he named. If she is already on that side she walks back. If she is on the other side she opens the door with the word, walks through, and comes out of the named side.
4. Victor accepts the round if she comes out where he asked.

</div>

Check the three properties on this story.

**Completeness.** If Peggy knows the word, she comes out of the named side
every time, whatever Victor shouts. Victor always accepts.

**Soundness.** If Peggy does not know the word, she can only come out of the
side she went in. She must pick a side before Victor shouts, and his coin is
fair, so she matches him with probability exactly $1/2$. Victor repeats the
round. Each round uses fresh coins on both sides, so a bluffer survives $k$
rounds with probability $2^{-k}$: about one in a thousand after 10 rounds, one
in a million after 20, one in a trillion after 40. Victor chooses $k$ to suit
how sure he must be.

**Zero knowledge.** What does Victor see? A sequence of shouts and a Peggy who
always comes out where he asked. He could have predicted that without going to
the cave. He learns nothing about the word: not its first letter, not its
length.

The story has a second scene, and it is the important one. A television crew
films the whole thing, twenty rounds, and broadcasts it. Does the film prove to
viewers that Peggy knows the word? It does not. Peggy and Victor could have
agreed in advance on the sequence of shouts, and Peggy could have walked into
the right passage every time. Or they could have filmed a hundred rounds of an
honest bluffer and cut out the rounds she failed. Either way the film would
look exactly like the real one. The real film is worth no more than a fake
anyone could make.

That observation is the definition of zero knowledge in miniature. A video of
the real protocol is **indistinguishable** from one made without the secret,
so it carries no information about the secret. The verifier is convinced
because he flipped the coins himself, live, after Peggy had committed to a
side. Nobody else saw that happen, so nobody else is convinced. The proof
convinces the person who takes part and nobody else. This property is often
called **deniability**: Peggy can later deny she ever proved anything, since
any transcript could be a fake.

Order matters. Peggy must choose her side **before** Victor shouts. If Victor
shouted first, a bluffer would simply walk into the named passage. Every
protocol in this chapter has the same three moves: the prover **commits** to
something, the verifier sends a random **challenge**, the prover **responds**.
The commitment fixes the prover's position before the challenge, and the
challenge is what a cheater cannot predict.

### Code it

The cave in a few lines. A bluffer is caught whenever Peggy's side and Victor's
shout differ.

```python
import random
random.seed(5)                          # random is fine for a demo; real protocols use secrets

def cave_round(knows_word):
    side = random.choice("AB")          # Peggy walks in, unseen
    shout = random.choice("AB")         # Victor shouts a side
    if side == shout:
        return True                     # she just walks back out
    return knows_word                   # only the word opens the door

def run(knows_word, rounds):
    return all(cave_round(knows_word) for _ in range(rounds))

for rounds in (1, 5, 10, 20):
    wins = sum(run(False, rounds) for _ in range(100000))
    print(f"{rounds:2d} rounds: bluffer passes {wins:6d} of 100000 times, expected {100000 / 2**rounds:9.1f}")
print("honest Peggy, 20 rounds:", run(True, 20))
```

Output:

```
 1 rounds: bluffer passes  50034 of 100000 times, expected   50000.0
 5 rounds: bluffer passes   3164 of 100000 times, expected    3125.0
10 rounds: bluffer passes    110 of 100000 times, expected      97.7
20 rounds: bluffer passes      1 of 100000 times, expected       0.1
honest Peggy, 20 rounds: True
```

The counts follow $100000 \cdot 2^{-k}$, as they should. Here and in the rest
of the chapter the `random` module is used so that the output can be printed
and checked; it is predictable, and a real prover or verifier draws its coins
from `secrets` (§5.10 shows what happens when the verifier's coins can be
guessed).

### A second story: the two balls

A shorter story makes the same point with no cave. Your friend is red-green
color-blind. You hold two balls, one red and one green, identical otherwise,
and you want to convince the friend that they differ in color without saying
which is which. The friend takes the balls, hides them behind their back, and
either swaps them or does not, by a coin flip. They show you the balls and ask:
did I swap? If the colors differ you can see the answer every time. If they
were the same color you would be guessing, right half the time. After twenty
rounds the friend is convinced the balls differ, and has learned nothing about
which one is red. Notice that this time the **verifier** hides a random choice
and the prover reveals it; §5.9 meets this pattern again as the proof that two
graphs are **not** the same.

!!! note "Life story: the cave of Ali Baba"
    **Born:** 1989, Jean-Jacques Quisquater, Louis Guillou, Thomas Berson and
    their co-authors, "How to Explain Zero-Knowledge Protocols to Your
    Children", CRYPTO '89 (proceedings 1990) · **Purpose:** to explain
    completeness, soundness and zero knowledge without mathematics, including
    why a recording proves nothing · **Helped:** almost every course and
    textbook since; the names Peggy and Victor · **Status:** current; Quisquater
    and Guillou were also the designers of the Guillou-Quisquater
    identification scheme (EUROCRYPT '88), a zero-knowledge proof designed for
    smart cards

## 5.3 What a proof is allowed to be

*Level: beginner.*

Before the graph protocols, it pays to be exact about what a proof system is,
since the definitions of soundness and zero knowledge depend on it.

### Statements and witnesses

A **statement** is a claim such as "these two graphs are isomorphic", "this
map can be colored with three colors so that neighbors differ", or "I know a
number $x$ with $\text{SHA-256}(x) = $ this value". Many statements come with a
**witness**: a piece of information that makes the statement easy to check.
For the graphs, the witness is the renaming of vertices that turns one graph
into the other. For the map, it is the coloring. For the hash, it is $x$.

The class **NP** is exactly the set of statements that have short witnesses
which can be checked quickly (in polynomial time). An ordinary proof of an NP
statement is a single message: the prover sends the witness and the verifier
checks it. That proof is complete and perfectly sound, and it gives away
everything. Zero-knowledge proofs keep the first two properties and drop the
third. [Mathematics, chapter 19](../mathematics/index.md)
covers P, NP and reductions properly; here only the idea of a witness is needed.

### The interactive proof

An **interactive proof system** for a set of true statements $L$ is a pair of
programs:

- the **prover** $P$, which may be unbounded in computing power (for a proof)
  or limited to polynomial time and given the witness (for the protocols that
  matter in practice);
- the **verifier** $V$, a probabilistic program that runs in polynomial time
  and flips private coins.

On a common input $x$ they exchange messages, and at the end $V$ outputs
accept or reject. The pair must satisfy:

$$
\begin{aligned}
&\textbf{Completeness:} && x \in L \Rightarrow \Pr[\,V \text{ accepts after talking to } P\,] \ge 1 - \varepsilon_c, \\
&\textbf{Soundness:} && x \notin L \Rightarrow \Pr[\,V \text{ accepts after talking to } P^*\,] \le \varepsilon_s \text{ for every } P^*.
\end{aligned}
$$

The probabilities are over the verifier's coins (and the prover's).
$\varepsilon_c$ is the **completeness error**, usually 0 in this chapter, and
$\varepsilon_s$ is the **soundness error**. The phrase "for every $P^*$" is
the strong part: soundness holds against any cheating strategy, not just the
ones the designer thought of. When it holds only against provers limited to
polynomial time, under an assumption such as "discrete logarithms are hard",
the system is called an **argument** rather than a proof. Arguments are what
most deployed systems are (§5.12).

### Why the verifier must flip coins

Suppose the verifier were deterministic. Then the prover could compute every
question in advance, and the whole conversation could be written down as one
message. Interaction without randomness adds nothing to what a one-message
proof can do. The power of interactive proofs comes from questions the prover
cannot predict, which is why the verifier's coins must be private and truly
unpredictable. §5.10 breaks a protocol by making them predictable.

### Driving the error down

A soundness error of $1/2$ is useless by itself; a coin would do as well.
What makes it useful is **repetition**. Run the protocol $k$ times in sequence
with fresh coins each time, and accept only if every run accepts. A false
statement passes each run with probability at most $1/2$, and the runs are
independent, so

$$
\Pr[\text{a cheater passes } k \text{ runs}] \le \left(\tfrac{1}{2}\right)^{k} = 2^{-k}.
$$

The same argument works for any per-round error $\varepsilon$: $k$ rounds give
$\varepsilon^k$. For the three-coloring proof of §5.7 a round has error
$1 - 1/m$ on a graph with $m$ edges, which is much closer to 1, and the number
of rounds grows to match. Since $1 - 1/m \le e^{-1/m}$,

$$
\left(1 - \tfrac{1}{m}\right)^{k} \le e^{-k/m},
$$

so $k = m \cdot t$ rounds give error at most $e^{-t}$.

| Per-round error | Rounds for $2^{-40}$ | Rounds for $2^{-80}$ |
|---|---|---|
| $1/2$ (cave, graph isomorphism) | 40 | 80 |
| $8/9$ (three-coloring, 9 edges) | 236 | 471 |
| $1/q$, $q \approx 2^{256}$ (Schnorr, [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)) | 1 | 1 |

The last row explains why the protocols used in practice do not look like the
cave: a single round of Schnorr's protocol has a challenge drawn from $2^{256}$
values instead of 2, so one round already has negligible error. The graph
protocols in this chapter are the clearest way to see the ideas; the
efficient protocols reuse the same ideas with large challenges.

Running the rounds **in parallel** (all the commitments at once, then all the
challenges as one $k$-bit string, then all the responses) also reduces the
soundness error to $2^{-k}$ for these protocols, and it saves round trips. But
it does something unexpected to zero knowledge, which §5.5 and §5.9 explain.
Sequential repetition is the safe default.

### Three kinds of zero knowledge

The definition of zero knowledge compares two distributions: the real
transcripts and the simulator's fakes. How close must they be?

- **Perfect zero knowledge:** the two distributions are identical. The graph
  isomorphism proof is perfect; §5.5 proves it by counting.
- **Statistical zero knowledge:** the two distributions differ by a negligible
  amount (their statistical distance is tiny), so even an unbounded observer
  can barely tell them apart.
- **Computational zero knowledge:** no program running in polynomial time can
  tell the two apart with more than negligible advantage. The three-coloring
  proof with hash commitments is computational: an observer with unlimited
  time could open the commitments by trying every nonce.

The difference is the same as between a one-time pad and a block cipher in
[Book 1, chapter 17](../../book/17-Defining-Security.md): information-theoretic
versus computational security. The words "negligible" and "statistical
distance" are made precise in [Mathematics, chapter 16](../mathematics/index.md).

## 5.4 Graph isomorphism, by hand

*Level: intermediate.*

The cave needs a cave. To get a proof that can be sent over a wire, GMR and,
in its cleanest form, Goldreich, Micali and Wigderson (1986) used graphs.

A **graph** is a set of vertices and a set of edges, each edge joining two
vertices. Two graphs $G_0$ and $G_1$ on the same vertices $\{0, 1, \dots, n-1\}$
are **isomorphic** if some renaming of the vertices turns one into the other.
A renaming is a **permutation** $\sigma$ of the vertices, and we write
$\sigma(G)$ for the graph you get by replacing every edge $\{u, v\}$ of $G$
with $\{\sigma(u), \sigma(v)\}$. The statement is "$G_0$ and $G_1$ are
isomorphic", and the witness is a $\sigma$ with $\sigma(G_0) = G_1$.

Finding $\sigma$ can be hard when the graphs are large. No polynomial-time
algorithm is known, though László Babai showed in 2015 that it can be done in
quasi-polynomial time, $\exp((\log n)^{O(1)})$, and in practice most graphs
are easy. So graph isomorphism is a fine teaching example and a poor basis for
real security. Its value here is that the protocol is short and every step can
be checked by eye.

### The protocol

Peggy knows $\sigma$ with $\sigma(G_0) = G_1$. Both know $G_0$ and $G_1$. One
round:

<div class="mars-steps" markdown>

1. **Commit.** Peggy picks a fresh random permutation $\pi$ and sends $H = \pi(G_1)$, a scrambled copy of $G_1$.
2. **Challenge.** Victor flips a coin and sends $b \in \{0, 1\}$: "show me how $H$ relates to $G_b$".
3. **Respond.** If $b = 1$, Peggy sends $\rho = \pi$. If $b = 0$, she sends $\rho = \pi \circ \sigma$, meaning "first apply $\sigma$, then $\pi$".
4. **Check.** Victor accepts if $\rho(G_b) = H$.

</div>

**Why it is complete.** For $b = 1$ the check is $\pi(G_1) = H$, true by
construction. For $b = 0$ it is $\pi(\sigma(G_0)) = \pi(G_1) = H$, true because
$\sigma(G_0) = G_1$.

**Why it is sound.** Suppose $G_0$ and $G_1$ are not isomorphic. Whatever graph
$H$ a cheater sends, $H$ can be isomorphic to at most one of $G_0$ and $G_1$,
because if it were isomorphic to both, then $G_0$ and $G_1$ would be isomorphic
to each other. So at most one of the two challenges has a valid answer, and
Victor picks the other one with probability $1/2$. The soundness error per
round is $1/2$, exactly as in the cave, and $k$ rounds give $2^{-k}$.

The cave maps onto the protocol one-to-one. $H$ is the passage Peggy walks
into. The challenge is Victor's shout. The secret $\sigma$ is the door: it
lets Peggy move between the $G_0$ side and the $G_1$ side, so she can answer
either question.

### A round with real numbers

Take four vertices. $G_0$ is a triangle with a tail, often called the paw:

$$
G_0 = \{01,\ 12,\ 13,\ 23\},
$$

where $01$ means the edge between vertices 0 and 1. Peggy's secret is the
permutation $\sigma = [2, 0, 3, 1]$, written as a list: vertex 0 goes to 2,
vertex 1 to 0, vertex 2 to 3, vertex 3 to 1. Apply it edge by edge:

$$
\begin{aligned}
01 &\mapsto \{2, 0\} = 02, & 12 &\mapsto \{0, 3\} = 03, \\
23 &\mapsto \{3, 1\} = 13, & 13 &\mapsto \{0, 1\} = 01,
\end{aligned}
$$

so $G_1 = \{01,\ 02,\ 03,\ 13\}$. It is again a triangle (0, 1, 3) with a tail
(0 to 2), drawn with different labels. Victor sees $G_0$ and $G_1$ but not
$\sigma$.

<div class="mars-steps" markdown>

1. Peggy picks $\pi = [3, 2, 1, 0]$ (vertex 0 goes to 3, 1 to 2, 2 to 1, 3 to 0) and computes $H = \pi(G_1)$: $01 \mapsto 23$, $02 \mapsto 13$, $03 \mapsto 03$, $13 \mapsto 02$. She sends $H = \{02,\ 03,\ 13,\ 23\}$.
2. Victor flips his coin and sends $b = 0$.
3. Peggy computes $\rho = \pi \circ \sigma$, vertex by vertex: $\rho(v) = \pi(\sigma(v))$. Vertex 0: $\sigma(0) = 2$, $\pi(2) = 1$. Vertex 1: $\sigma(1) = 0$, $\pi(0) = 3$. Vertex 2: $\sigma(2) = 3$, $\pi(3) = 0$. Vertex 3: $\sigma(3) = 1$, $\pi(1) = 2$. She sends $\rho = [1, 3, 0, 2]$.
4. Victor applies $\rho$ to $G_0$: $01 \mapsto 13$, $12 \mapsto 03$, $13 \mapsto 32 = 23$, $23 \mapsto 02$. That is $\{02, 03, 13, 23\} = H$. He accepts.
5. Had Victor sent $b = 1$, Peggy would have sent $\pi = [3, 2, 1, 0]$ itself, and $\pi(G_1) = H$ by step 1.

</div>

Look at what Victor received: a random-looking copy $H$ of the paw and a
random-looking permutation $\rho$. The permutation $[1, 3, 0, 2]$ is
$\pi \circ \sigma$ for a $\pi$ he never saw, so it tells him nothing about
$\sigma$. Every permutation of four vertices is equally likely to appear there,
whatever $\sigma$ is. That is the heart of the zero-knowledge argument in
§5.5. Figure 5.3 shows the same round as messages.

<figure class="mars-fig">
<svg viewBox="0 0 640 352" width="640" role="img" aria-label="One round of the graph isomorphism protocol between Peggy and Victor, with the numbers worked by hand" fill="currentColor" font-size="14">
<text x="320" y="20" text-anchor="middle">public: G0 = {01, 12, 13, 23}, G1 = {01, 02, 03, 13}</text>
<rect x="20" y="34" width="150" height="32" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="55" text-anchor="middle" font-weight="bold">Peggy</text>
<rect x="470" y="34" width="150" height="32" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="55" text-anchor="middle" font-weight="bold">Victor</text>
<line x1="95" y1="66" x2="95" y2="340" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="545" y1="66" x2="545" y2="340" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="105" y="92" font-style="italic">knows σ = [2, 0, 3, 1]</text>
<text x="105" y="112" font-style="italic">picks π = [3, 2, 1, 0]</text>
<line x1="95" y1="150" x2="537" y2="150" stroke="currentColor" stroke-width="2"/>
<polygon points="545,150 537,146 537,154"/>
<text x="320" y="142" text-anchor="middle">1. commit: H = π(G1)</text>
<text x="320" y="170" text-anchor="middle" font-weight="bold">H = {02, 03, 13, 23}</text>
<line x1="545" y1="208" x2="103" y2="208" stroke="currentColor" stroke-width="2"/>
<polygon points="95,208 103,204 103,212"/>
<text x="320" y="200" text-anchor="middle">2. challenge: a fair coin</text>
<text x="320" y="228" text-anchor="middle" font-weight="bold">b = 0</text>
<line x1="95" y1="266" x2="537" y2="266" stroke="currentColor" stroke-width="2"/>
<polygon points="545,266 537,262 537,270"/>
<text x="320" y="258" text-anchor="middle">3. respond: ρ = π after σ</text>
<text x="320" y="286" text-anchor="middle" font-weight="bold">ρ = [1, 3, 0, 2]</text>
<text x="535" y="320" text-anchor="end" font-style="italic">4. checks ρ(G0) = {02, 03, 13, 23} = H</text>
</svg>
<figcaption>Figure 5.3. One round of the graph isomorphism proof with the numbers above. Had the coin given b = 1, Peggy would have sent π itself. Either answer is a uniformly random permutation from Victor's point of view.</figcaption>
</figure>

### A cheater's round

Now let Mallory try, without $\sigma$. She must send $H$ before she sees $b$.
She guesses that Victor will send 0, picks $\pi' = [1, 2, 3, 0]$, and sends
$H' = \pi'(G_0) = \{02, 03, 12, 23\}$. If Victor sends 0, she answers $\pi'$
and passes. If Victor sends 1, she needs a $\rho$ with $\rho(G_1) = H'$. But
then $\pi'^{-1} \circ \rho$ would carry $G_1$ onto $G_0$, so finding $\rho$ is
exactly as hard as finding an isomorphism between $G_0$ and $G_1$, which is
what she lacks. On a four-vertex graph she could find one by trying all 24
permutations; on a graph with a few hundred carefully chosen vertices she
could not. She is caught whenever her guess is wrong.

### Code it

Graphs are sets of edges, each edge a two-element `frozenset`, so that
$\{0, 1\}$ and $\{1, 0\}$ are the same edge and two graphs can be compared with
`==`. A permutation is a list `p` with vertex `v` going to `p[v]`. The honest
prover keeps $\pi$ between its two moves; the cheater guesses the challenge.

```python
import random
random.seed(1985)                       # demo only: real provers draw from secrets

def apply(p, G):                        # rename every vertex v of G to p[v]
    return frozenset(frozenset(p[v] for v in e) for e in G)

def compose(p, s):                      # (p after s)[v] = p[s[v]]
    return [p[s[v]] for v in range(len(s))]

def graph(*pairs):
    return frozenset(frozenset(e) for e in pairs)

def show(G):
    return " ".join("".join(map(str, sorted(e))) for e in sorted(sorted(e) for e in G))

G0 = graph((0, 1), (1, 2), (2, 3), (1, 3))
sigma = [2, 0, 3, 1]                    # Peggy's secret
G1 = apply(sigma, G0)
print("G0:", show(G0), "  G1:", show(G1))

class Prover:                           # honest Peggy: knows sigma
    def commit(self):
        self.pi = random.sample(range(4), 4)
        return apply(self.pi, G1)
    def answer(self, b):
        return self.pi if b == 1 else compose(self.pi, sigma)

class Cheater:                          # does not know sigma: guesses the challenge
    def commit(self):
        self.guess = random.randrange(2)
        self.pi = random.sample(range(4), 4)
        return apply(self.pi, G1 if self.guess == 1 else G0)
    def answer(self, b):
        return self.pi                  # right only if b == guess

def verify(prover, rounds):
    for _ in range(rounds):
        H = prover.commit()
        b = random.randrange(2)         # Victor's coin
        rho = prover.answer(b)
        if apply(rho, G1 if b == 1 else G0) != H:
            return False
    return True

print("honest, 40 rounds:", verify(Prover(), 40))
caught = sum(not verify(Cheater(), 1) for _ in range(10000))
print("cheater caught in", caught, "of 10000 single rounds")
passed = sum(verify(Cheater(), 10) for _ in range(100000))
print("cheater passed 10 rounds in", passed, "of 100000 tries (expected about 97.7)")
```

Output:

```
G0: 01 12 13 23   G1: 01 02 03 13
honest, 40 rounds: True
cheater caught in 5036 of 10000 single rounds
cheater passed 10 rounds in 100 of 100000 tries (expected about 97.7)
```

The cheater is caught in about half the single rounds and survives ten rounds
about once in $2^{10} = 1024$ tries, as the soundness argument predicts. Real
uses of this protocol would need graphs with hundreds of vertices and a
witness that is hard to find, and nobody knows how to generate such hard
instances reliably. That, and Babai's algorithm, is why it stays in textbooks.

!!! note "Life story: the graph isomorphism protocol"
    **Born:** 1986, Oded Goldreich, Silvio Micali and Avi Wigderson (FOCS
    1986; *Journal of the ACM* 1991), building on the 1985 definitions ·
    **Purpose:** a perfect zero-knowledge proof for a natural problem not known
    to be easy, with nothing assumed · **Helped:** became the standard first
    example of zero knowledge, and the template (commit to a random relabeling,
    open one of two views) for many later protocols · **Status:** a teaching
    protocol; graph isomorphism is too easy in practice to protect anything
    (Babai's quasi-polynomial algorithm, 2015)

## 5.5 Zero knowledge, made precise: the simulator

*Level: intermediate.*

Completeness and soundness protect Victor. Zero knowledge protects Peggy, and
it is the hardest of the three to state. "Victor learns nothing about
$\sigma$" is not a mathematical statement until we say what learning is.

### The definition

Write $\text{view}_V(x)$ for everything Victor sees in a run of the protocol on
input $x$: the messages he receives and his own coin flips. It is a random
variable, because both sides flip coins.

**Definition (GMR, simplified).** A proof system $(P, V)$ is **zero
knowledge** if for every efficient verifier $V^*$, honest or not, there is an
efficient algorithm $S$, the **simulator**, such that for every true statement
$x$, the output $S(x)$ is indistinguishable from $\text{view}_{V^*}(x)$ in a
real run with the honest prover.

The simulator is given $x$ and nothing else: no witness. If it can produce
views that look exactly like real ones, then anything $V^*$ could compute from
a real view, it could have computed from a simulated one, which needs no
prover. So talking to the prover gave it nothing beyond the fact that $x$ is
true. "Indistinguishable" is perfect, statistical or computational, as listed
in §5.3.

Figure 5.4 shows the two worlds. The definition says no judge, given a
transcript, can tell which world it came from.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The real world, where Peggy with the secret talks to Victor, beside the simulated world, where a simulator with no secret produces transcripts; a judge cannot tell their outputs apart" fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">real world</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">simulated world</text>
<line x1="320" y1="10" x2="320" y2="200" stroke="currentColor" stroke-dasharray="5 5" opacity="0.5"/>
<rect x="20" y="40" width="110" height="56" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.5"/>
<text x="75" y="64" text-anchor="middle" font-weight="bold">Peggy</text>
<text x="75" y="84" text-anchor="middle">knows σ</text>
<rect x="190" y="40" width="110" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="245" y="64" text-anchor="middle" font-weight="bold">Victor</text>
<text x="245" y="84" text-anchor="middle">flips b</text>
<line x1="130" y1="60" x2="182" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="190,60 182,56 182,64"/>
<line x1="190" y1="76" x2="138" y2="76" stroke="currentColor" stroke-width="1.5"/>
<polygon points="130,76 138,72 138,80"/>
<rect x="360" y="40" width="240" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="62" text-anchor="middle" font-weight="bold">simulator: no σ</text>
<text x="480" y="84" text-anchor="middle">pick b, pick ρ, set H = ρ(Gb)</text>
<line x1="160" y1="96" x2="160" y2="132" stroke="currentColor" stroke-width="1.5"/>
<polygon points="160,140 156,132 164,132"/>
<line x1="480" y1="96" x2="480" y2="132" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,140 476,132 484,132"/>
<rect x="60" y="140" width="200" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="163" text-anchor="middle">transcript (H, b, ρ)</text>
<rect x="380" y="140" width="200" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="163" text-anchor="middle">transcript (H, b, ρ)</text>
<line x1="160" y1="176" x2="300" y2="226" stroke="currentColor" stroke-width="1.5"/>
<line x1="480" y1="176" x2="340" y2="226" stroke="currentColor" stroke-width="1.5"/>
<rect x="170" y="226" width="300" height="56" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="250" text-anchor="middle" font-weight="bold">judge: which world?</text>
<text x="320" y="270" text-anchor="middle">48 transcripts, each 1/48 in both</text>
</svg>
<figcaption>Figure 5.4. The simulation paradigm. If a program with no secret produces transcripts with the same distribution as the real conversation, the real conversation cannot contain anything about the secret.</figcaption>
</figure>

### The simulator for graph isomorphism

Start with the honest Victor, who sends a fair coin. A real transcript is a
triple $(H, b, \rho)$ with $\rho(G_b) = H$. Here is a simulator that knows no
$\sigma$:

<div class="mars-steps" markdown>

1. Pick a bit $b$ at random.
2. Pick a permutation $\rho$ uniformly at random.
3. Set $H = \rho(G_b)$ and output $(H, b, \rho)$.

</div>

It works backwards: it chooses the answer first and builds the question to
fit, which a real prover cannot do because the question comes from Victor
after $H$ is fixed. The simulated triples pass Victor's check by construction.

By hand, with the graphs of §5.4: the simulator picks $b = 1$ and
$\rho = [0, 2, 1, 3]$, and computes $H = \rho(G_1)$: $01 \mapsto 02$,
$02 \mapsto 01$, $03 \mapsto 03$, $13 \mapsto 23$. It outputs
$(\{01, 02, 03, 23\},\ 1,\ [0, 2, 1, 3])$, a valid transcript made without
$\sigma$.

**Why the distributions are equal.** In a real run, $b$ is uniform. Given $b$,
the response $\rho$ is $\pi$ (if $b = 1$) or $\pi \circ \sigma$ (if $b = 0$).
Since $\pi$ is uniform over all $n!$ permutations and $\sigma$ is fixed, the map
$\pi \mapsto \pi \circ \sigma$ is a one-to-one shuffle of the permutations, so
$\pi \circ \sigma$ is uniform too. So in both cases $\rho$ is uniform and
independent of $b$, and $H = \rho(G_b)$ is determined by $b$ and $\rho$. The
simulator draws $b$ and $\rho$ the same way and computes $H$ the same way.
The two distributions are identical: the proof is **perfect** zero knowledge.

### Code it: proof by counting

With four vertices there are $4! = 24$ permutations and 2 challenges, so both
distributions can be listed in full. The real side runs over every $\pi$ and
every $b$, each pair having probability $1/48$. The simulated side runs over
every $b$ and every $\rho$, also $1/48$ each. If the two lists of transcripts
are the same, with the same multiplicities, the distributions are equal.

```python
from itertools import permutations
from collections import Counter

def apply(p, G):
    return frozenset(frozenset(p[v] for v in e) for e in G)

def compose(p, s):
    return tuple(p[s[v]] for v in range(len(s)))

G0 = frozenset(map(frozenset, [(0, 1), (1, 2), (2, 3), (1, 3)]))
sigma = (2, 0, 3, 1)
G1 = apply(sigma, G0)
perms = list(permutations(range(4)))     # all 24 ways to rename 4 vertices

real = Counter()                         # Peggy (knows sigma) with an honest Victor
for pi in perms:                         # each pi has probability 1/24
    H = apply(pi, G1)
    for b in (0, 1):                     # each b has probability 1/2
        rho = pi if b == 1 else compose(pi, sigma)
        real[(H, b, rho)] += 1

fake = Counter()                         # the simulator: no sigma anywhere
for b in (0, 1):
    for rho in perms:
        fake[(apply(rho, G1 if b else G0), b, rho)] += 1

print("transcripts:", len(real), "real,", len(fake), "simulated")
print("every real transcript appears", set(real.values()), "time(s) in 48")
print("same distribution:", real == fake)
print("distinct first messages H:", len({t[0] for t in real}))
```

Output:

```
transcripts: 48 real, 48 simulated
every real transcript appears {1} time(s) in 48
same distribution: True
distinct first messages H: 12
```

All 48 real transcripts are distinct, each has probability exactly $1/48$, and
the simulator produces the same 48. There are only 12 distinct graphs $H$,
because the paw has two symmetries (swapping vertices 2 and 3 of $G_0$ leaves
it unchanged), so $24 / 2 = 12$ different labeled copies exist, each appearing
in 4 transcripts. None of this depends on which $\sigma$ Peggy holds: any
isomorphism gives the same 48 transcripts.

### A verifier who cheats

The simulator above handles an honest Victor. But Peggy needs protection from
a dishonest one most of all. Suppose $V^*$ chooses $b$ not by a coin but by
looking at $H$: say $b = 1$ if $H$ contains the edge $01$, and $b = 0$
otherwise. Could such a verifier learn something? The backwards simulator no
longer works as it stands, because it picks $b$ before $H$, and $V^*$ insists
on choosing $b$ after seeing $H$.

The answer is **rewinding**. The simulator runs $V^*$ as a subroutine, which
it may restart at will:

<div class="mars-steps" markdown>

1. Guess a bit $b'$ at random and pick $\rho$ at random. Set $H = \rho(G_{b'})$.
2. Give $H$ to $V^*$ and see which challenge $b$ it sends.
3. If $b = b'$, output $(H, b, \rho)$: it is a valid transcript and the simulator can answer it.
4. If not, throw the attempt away, rewind $V^*$ to its starting state, and go back to step 1.

</div>

$H$ is a uniformly random copy of $G_1$ whichever $b'$ was used (since
$G_0$ and $G_1$ are isomorphic), so $H$ reveals nothing about $b'$, and
whatever rule $V^*$ applies, its answer matches the guess with probability
exactly $1/2$. On average the simulator needs 2 attempts per round, so it runs
in expected polynomial time. And conditioned on success, the output has the
same distribution as a real conversation with $V^*$. Rewinding is something a
simulator can do and a real Victor cannot: in the real world, Peggy's $H$ is
fixed before Victor speaks and there is no going back. The cave film made the
same point, where failed takes were cut.

```python
import random
from itertools import permutations
from collections import Counter
random.seed(7)                           # demo only

def apply(p, G):
    return frozenset(frozenset(p[v] for v in e) for e in G)

def compose(p, s):
    return tuple(p[s[v]] for v in range(len(s)))

G0 = frozenset(map(frozenset, [(0, 1), (1, 2), (2, 3), (1, 3)]))
sigma = (2, 0, 3, 1)
G1 = apply(sigma, G0)
perms = list(permutations(range(4)))

def victor_star(H):                      # a devious verifier: the challenge depends on H
    return 1 if frozenset((0, 1)) in H else 0

real = Counter()                         # Peggy with this verifier: 24 equally likely pi
for pi in perms:
    H = apply(pi, G1)
    b = victor_star(H)
    real[(H, b, pi if b else compose(pi, sigma))] += 1

def simulate():                          # guess b, build H, ask victor_star, rewind if wrong
    tries = 0
    while True:
        tries += 1
        b = random.randrange(2)
        rho = random.choice(perms)
        H = apply(rho, G1 if b else G0)
        if victor_star(H) == b:          # guessed right: keep this transcript
            return (H, b, rho), tries

exact = Counter()                        # what simulate() outputs, counted exactly
for b in (0, 1):
    for rho in perms:
        H = apply(rho, G1 if b else G0)
        if victor_star(H) == b:
            exact[(H, b, rho)] += 1
print("real:", len(real), "transcripts; simulator keeps", len(exact))
print("same distribution:", real == exact)
runs = [simulate()[1] for _ in range(100000)]
print("average tries per transcript:", sum(runs) / len(runs))
```

Output:

```
real: 24 transcripts; simulator keeps 24
same distribution: True
average tries per transcript: 1.99292
```

The real conversation with this verifier has 24 equally likely transcripts
(one per $\pi$; the challenge is now determined by $H$). The simulator's kept
attempts are the same 24, each equally likely, and it needs about two attempts
for each. The same argument works for any verifier strategy, including ones
that remember earlier rounds, which is why the proof stays zero knowledge when
the rounds are run one after another: the simulator rewinds round by round.

### What zero knowledge does not promise

The definition is strong but narrow, and three limits are worth stating.

- **It is about the conversation, not the statement.** Victor learns that the
  statement is true. If the statement itself leaks something ("my salary is
  above \$100,000"), zero knowledge does not hide that.
- **It does not stop relaying.** Mallory can stand between Peggy and Victor,
  passing each message along, and convince Victor that she is Peggy. Zero
  knowledge says Mallory learns nothing she can use later; it says nothing
  about her using Peggy live. Yvo Desmedt, Claude Goutier and Samy Bengio
  described this "mafia fraud" against identification protocols at CRYPTO '87.
  Defenses tie the proof to its context (a session, a channel, a distance).
- **Parallel repetition may lose it.** Run 40 rounds at once and the
  rewinding simulator must guess all 40 challenge bits together, succeeding
  with probability $2^{-40}$. The simulation argument fails, and §5.9 explains
  that this is not just a failure of the proof technique.

## 5.6 Proofs of knowledge and extractors

*Level: intermediate.*

Soundness, as defined so far, says a false statement is rejected. For graph
isomorphism that is the right guarantee when the question is "are these graphs
isomorphic?". It is the wrong guarantee for identification. There the
statement is often trivially true: every public key $A = g^a$ has some secret
$a$ behind it, and every hash value has preimages. What Victor wants to know is
not "does a witness exist?" but "does **this prover know** one?".

### Defining "knows"

"Knowing" sounds like psychology, so cryptography defines it by an algorithm.
A prover knows a witness if the witness can be **pulled out of it**. A proof
is a **proof of knowledge** if there is an efficient algorithm $E$, the
**extractor**, such that whenever a prover $P^*$ convinces Victor with
noticeable probability, $E$, given the ability to run $P^*$ and rewind it,
outputs a valid witness. The probability that $P^*$ convinces Victor without
$E$ succeeding is the **knowledge error**. Uriel Feige, Amos Fiat and Adi Shamir
introduced proofs of knowledge for identification in 1987-1988 ("Zero-knowledge
proofs of identity", *Journal of Cryptology* 1988), and Mihir Bellare and Oded
Goldreich gave the definition its standard form in "On Defining Proofs of
Knowledge" (CRYPTO '92).

The reasoning behind it: if a prover could pass without knowing the witness,
then the extractor, a program that only runs the prover, would compute the
witness from nothing. If finding the witness is hard, no such prover exists.
And if the prover really does know the witness, the extractor merely reveals
what was inside all along.

### The extractor for graph isomorphism

The extractor treats the prover as a black box with a fixed random tape. It
runs the prover to get the first message $H$, asks challenge 0 and records the
answer $\rho_0$. Then it **rewinds** the prover to just after $H$, with the
same random tape so that the prover is in exactly the same state, asks
challenge 1 and records $\rho_1$. If both answers are valid,

$$
\rho_0(G_0) = H = \rho_1(G_1),
$$

so $\rho_1^{-1}(\rho_0(G_0)) = G_1$, and

$$
\sigma' = \rho_1^{-1} \circ \rho_0
$$

is an isomorphism from $G_0$ to $G_1$. This is the soundness argument of §5.4
turned into a procedure: a prover that can answer both challenges for the same
$H$ holds an isomorphism, and here is how to compute it.

By hand, with the round of §5.4: $\rho_0 = [1, 3, 0, 2]$ and
$\rho_1 = \pi = [3, 2, 1, 0]$. The inverse of $[3, 2, 1, 0]$ is itself
(it swaps 0 with 3 and 1 with 2). Then $\sigma'(v) = \rho_1^{-1}(\rho_0(v))$:
vertex 0 goes to $\rho_1^{-1}(1) = 2$, vertex 1 to $\rho_1^{-1}(3) = 0$,
vertex 2 to $\rho_1^{-1}(0) = 3$, vertex 3 to $\rho_1^{-1}(2) = 1$. So
$\sigma' = [2, 0, 3, 1]$, which is Peggy's $\sigma$. Figure 5.5 draws the same
fork.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The extractor runs the prover to get H, asks challenge 0 and, after rewinding, challenge 1, and combines the two answers into the secret permutation" fill="currentColor" font-size="14">
<rect x="20" y="96" width="150" height="50" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="117" text-anchor="middle" font-weight="bold">same H</text>
<text x="95" y="136" text-anchor="middle">{02, 03, 13, 23}</text>
<line x1="170" y1="112" x2="244" y2="62" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,58 241,58 246,66"/>
<line x1="170" y1="130" x2="244" y2="180" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,184 246,176 241,184"/>
<text x="190" y="72" text-anchor="middle">b = 0</text>
<text x="196" y="186" text-anchor="middle">b = 1</text>
<text x="196" y="204" text-anchor="middle" font-size="12" font-style="italic">(after rewinding)</text>
<rect x="250" y="34" width="150" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="62" text-anchor="middle">ρ0 = [1, 3, 0, 2]</text>
<rect x="250" y="162" width="150" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="190" text-anchor="middle">ρ1 = [3, 2, 1, 0]</text>
<line x1="400" y1="57" x2="454" y2="108" stroke="currentColor" stroke-width="1.5"/>
<line x1="400" y1="185" x2="454" y2="134" stroke="currentColor" stroke-width="1.5"/>
<rect x="454" y="92" width="170" height="58" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.5"/>
<text x="539" y="116" text-anchor="middle">σ = ρ1⁻¹ after ρ0</text>
<text x="539" y="138" text-anchor="middle" font-weight="bold">= [2, 0, 3, 1]</text>
</svg>
<figcaption>Figure 5.5. Extraction by rewinding. One commitment H answered for both challenges gives away the secret. A prover that can do this knows σ; an honest prover never does it, because each H is used for one challenge only.</figcaption>
</figure>

### Code it

The prover is a box built from a seed, its random tape. The extractor never
reads the box's secret; it only calls `commit` and `answer`, and rewinds by
building the box again from the same seed.

```python
import random

def apply(p, G):
    return frozenset(frozenset(p[v] for v in e) for e in G)

def compose(p, s):
    return [p[s[v]] for v in range(len(s))]

def inverse(p):
    inv = [0] * len(p)
    for v, w in enumerate(p):
        inv[w] = v
    return inv

G0 = frozenset(map(frozenset, [(0, 1), (1, 2), (2, 3), (1, 3)]))
G1 = apply([2, 0, 3, 1], G0)

class Box:                               # some prover we can only run, not read
    def __init__(self, coins):
        self.rng = random.Random(coins)  # its random tape: same coins, same behavior
        self._secret = [2, 0, 3, 1]      # hidden inside; the extractor never looks
    def commit(self):
        self.pi = self.rng.sample(range(4), 4)
        return apply(self.pi, G1)
    def answer(self, b):
        return self.pi if b == 1 else compose(self.pi, self._secret)

def extract(coins):
    box = Box(coins);  H = box.commit();  rho0 = box.answer(0)
    box = Box(coins);  H2 = box.commit(); rho1 = box.answer(1)   # rewind: same coins
    assert H == H2                       # same first message both times
    assert apply(rho0, G0) == H and apply(rho1, G1) == H         # both answers valid
    return compose(inverse(rho1), rho0)  # rho1^-1 after rho0 maps G0 onto G1

s = extract(coins=2024)
print("extracted:", s, " maps G0 onto G1:", apply(s, G0) == G1)
```

Output:

```
extracted: [2, 0, 3, 1]  maps G0 onto G1: True
```

### Why the extractor works on any good prover

A real cheating prover is not always successful, so the extractor needs a
counting argument. Fix the prover's random tape. For that tape, the prover
answers challenge 0, challenge 1, both, or neither. Call the tape "good" if it
answers both. If the prover convinces Victor with probability $p > 1/2$, then
good tapes must make up at least a fraction $2p - 1$ of all tapes (a tape that
answers only one challenge contributes at most $1/2$ to the success
probability). The extractor picks random tapes until it finds a good one, which
takes about $1/(2p - 1)$ tries. So the knowledge error of one round is $1/2$:
any prover that beats $1/2$ can be turned into an isomorphism. For $k$
sequential rounds, a prover that beats $2^{-k}$ by a noticeable margin has some
round where it answers both challenges for the same commitment, and the
extractor finds it.

### Zero knowledge and knowledge soundness together

The two properties seem to contradict each other, and the contradiction is
worth resolving. The simulator produces convincing transcripts without the
witness. The extractor says that anyone who produces convincing transcripts
knows the witness. Why does the simulator not know it?

Because they do different things. The simulator produces transcripts in which
**it chose the challenge**, or rewound until the challenge suited it. It never
answers two different challenges for the same $H$. The extractor requires
exactly that: two answers to one commitment. A real prover facing a live
verifier who flips fresh coins after the commitment must be ready for both
challenges, so it must hold what both answers together reveal. The simulator
escapes because it controls the order of events, and the extractor succeeds
because it controls the prover's random tape. Both are powers no real party
has, which is why neither one contradicts the security of the other.

!!! note "Life story: Feige-Fiat-Shamir identification"
    **Born:** 1986 to 1988; Amos Fiat and Adi Shamir, "How to Prove Yourself"
    (CRYPTO '86), then Uriel Feige, Fiat and Shamir, "Zero-knowledge proofs of
    identity" (STOC 1987; *Journal of Cryptology* 1988), all at the Weizmann
    Institute · **Purpose:** smart-card identification based on square roots
    modulo a composite, where the card proves knowledge of its secret without
    revealing it · **Helped:** defined proofs of knowledge; led to
    Guillou-Quisquater (1988) and Schnorr (1989) identification, and, through
    the hash trick of the 1986 paper, to Schnorr signatures and the
    Fiat-Shamir transform of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) ·
    **Status:** the interactive scheme is mostly historical; its descendants
    are everywhere

## 5.7 Three colors and sealed boxes

*Level: intermediate.*

Graph isomorphism had a special property that made its proof possible: a
random relabeling of the graph hides the witness completely, and each of the
two views can be opened alone. Most statements have no such structure. To
prove arbitrary statements, GMW chose one problem that every NP statement can
be translated into, and gave it a zero-knowledge proof using a new tool:
**commitments**.

### The problem: three-coloring a map

A graph is **3-colorable** if each vertex can be given one of three colors so
that the two ends of every edge have different colors. Think of a map, with
countries as vertices and shared borders as edges: no two neighbors may share
a color. Deciding whether a graph is 3-colorable is **NP-complete**: Larry
Stockmeyer showed in 1973 that it stays hard even for planar graphs, after
Richard Karp's 1972 list of NP-complete problems had included graph coloring
in general. "NP-complete" means every NP statement can be turned, in
polynomial time, into a graph that is 3-colorable exactly when the statement
is true, with a witness for one giving a witness for the other (§5.8).

### A Mars example: the generator map

Arcadia City, the settlement on Mars that appears through this book, has six
districts. Emergency power comes from three generators, A, B and C. The rule
is that no two neighboring districts may hang on the same generator, so that
one generator failing never leaves two adjacent districts dark at once and
their people can always shelter next door. The districts' borders form the
graph in Figure 5.6: District 1 borders 2 and 3; 2 borders 3 and 4; 3 borders
4 and 5; 4 borders 5 and 6; 5 borders 6. That is 9 borders.

The utility has a wiring plan that satisfies the rule: districts 1 and 4 on A,
2 and 5 on B, 3 and 6 on C. The city's insurer, on Earth, wants proof that
such a plan exists and is in place before renewing the policy. The utility
will not send the plan: a list of which generator feeds which district is also
a list of which single cable to cut to darken a chosen neighborhood. This is a
3-coloring statement, and the coloring is the witness.

### The protocol

Peggy (the utility) knows a valid coloring. Each color is a number 0, 1 or 2.
One round:

<div class="mars-steps" markdown>

1. **Shuffle.** Peggy picks a random permutation of the three colors and recolors the whole map with it. Any renaming of the colors keeps a valid coloring valid.
2. **Commit.** For each district she seals its new color in a commitment: $c_v = \text{SHA-256}(r_v \,\|\, \text{color}_v)$ with a fresh 16-byte random nonce $r_v$. She sends all six commitments.
3. **Challenge.** Victor (the insurer) picks one border $\{u, v\}$ at random.
4. **Open.** Peggy reveals $\text{color}_u, r_u$ and $\text{color}_v, r_v$.
5. **Check.** Victor recomputes the two hashes, checks that they match $c_u$ and $c_v$, and checks that the two colors are different and both in $\{0, 1, 2\}$.

</div>

The commitments are the sealed boxes of [Chapter 3](03-Commitments.md). They
must be **binding**, so that Peggy cannot change a color after hearing which
border Victor picked, and **hiding**, so that the four unopened boxes tell
Victor nothing. With SHA-256 and a random 16-byte nonce they are both, under
the usual assumptions about the hash.

**Completeness.** With a valid coloring, every border has two different
colors before the shuffle and after it. Victor always accepts.

**Soundness.** If the map has no valid 3-coloring, then whatever six colors
Peggy commits to, at least one of the 9 borders has two equal colors (or a
color outside $\{0, 1, 2\}$). Binding means she cannot change them after the
challenge. Victor picks that border with probability at least $1/9$. So the
soundness error per round is at most $8/9$, and by §5.3 Victor needs
$k = 236$ rounds to push it below $2^{-40}$. In general, on a graph with $m$
edges the error per round is $1 - 1/m$ and about $m \cdot t$ rounds bring it
to $e^{-t}$.

**Zero knowledge.** Victor sees two different colors on one border, and
because Peggy shuffled the colors, the pair he sees is a uniformly random pair
of distinct colors, whatever the real plan is. The other boxes stay sealed. A
simulator can produce this without the coloring: guess the border Victor will
ask for, commit to two random distinct colors at its ends and to anything at
all (say color 0) everywhere else, and rewind if Victor asks for a different
border, which takes about 9 attempts on average. The fake transcripts differ
from real ones only inside the unopened commitments, and hiding says no
efficient observer can see inside. This makes the proof **computational** zero
knowledge, resting on the commitment.

### By hand

Take Peggy's plan as colors: A = 0, B = 1, C = 2, so districts 1 to 6 have
colors $0, 1, 2, 0, 1, 2$. She draws the shuffle $[2, 0, 1]$ (color 0 becomes
2, 1 becomes 0, 2 becomes 1), so the shuffled colors are $2, 0, 1, 2, 0, 1$.
For each district she draws a nonce and commits. With the nonces in the table
(16 bytes each, shown in hex; real nonces come from `secrets`), the
commitments begin:

| District | Shuffled color | Nonce (16 bytes) | $\text{SHA-256}(r \Vert c)$, first 16 hex digits |
|---|---|---|---|
| 1 | 2 | `c59a3880d25b9d316eb54dac1299ca95` | `ac53e3ecdfc18068` |
| 2 | 0 | `55378f41184275ebc9b832d8f129ae2f` | `1f64ce4e25bf7dfb` |
| 3 | 1 | `45f9244f1a66db5134d24a6cc9afc13a` | `e2c68bda78607e09` |
| 4 | 2 | `b58a9bff3f7199838d179521f6aec13a` | `6bc1157efe359330` |
| 5 | 0 | `3e9e8f0d51798e1a8dac9491f8d983d9` | `11a5f7352e20adcc` |
| 6 | 1 | `a3464c812b7c46189cd8f049ea8273be` | `c62d5298b2a61642` |

Victor receives only the last column (the full 64 digits). He picks the
border between districts 3 and 4. Peggy opens box 3 (color 1 and its nonce)
and box 4 (color 2 and its nonce). Victor hashes the 16 nonce bytes followed by
the color byte, gets `e2c68bda...` and `6bc1157e...`, matching the boxes, and
sees colors 1 and 2: different. He accepts the round. What did he learn?
That districts 3 and 4 are on different generators, which the rule already
told him, and two color numbers that were scrambled by a shuffle he never saw.
In the next round Peggy shuffles again with fresh nonces, so nothing carries
over.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The six districts of the generator map as a strip of triangles; all boxes sealed except districts 3 and 4, whose border was challenged and opened" fill="currentColor" font-size="14">
<line x1="70" y1="230" x2="170" y2="90" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="230" x2="270" y2="230" stroke="currentColor" stroke-width="1.5"/>
<line x1="170" y1="90" x2="270" y2="230" stroke="currentColor" stroke-width="1.5"/>
<line x1="170" y1="90" x2="370" y2="90" stroke="currentColor" stroke-width="1.5"/>
<line x1="270" y1="230" x2="370" y2="90" stroke="currentColor" stroke-width="4"/>
<line x1="270" y1="230" x2="470" y2="230" stroke="currentColor" stroke-width="1.5"/>
<line x1="370" y1="90" x2="470" y2="230" stroke="currentColor" stroke-width="1.5"/>
<line x1="370" y1="90" x2="570" y2="90" stroke="currentColor" stroke-width="1.5"/>
<line x1="470" y1="230" x2="570" y2="90" stroke="currentColor" stroke-width="1.5"/>
<rect x="35" y="210" width="70" height="40" rx="4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="235" text-anchor="middle" font-weight="bold">D1 ?</text>
<rect x="135" y="70" width="70" height="40" rx="4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5"/>
<text x="170" y="95" text-anchor="middle" font-weight="bold">D2 ?</text>
<rect x="235" y="210" width="70" height="40" rx="4" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="2"/>
<text x="270" y="235" text-anchor="middle" font-weight="bold">D3 = 1</text>
<rect x="335" y="70" width="70" height="40" rx="4" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="2"/>
<text x="370" y="95" text-anchor="middle" font-weight="bold">D4 = 2</text>
<rect x="435" y="210" width="70" height="40" rx="4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5"/>
<text x="470" y="235" text-anchor="middle" font-weight="bold">D5 ?</text>
<rect x="535" y="70" width="70" height="40" rx="4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5"/>
<text x="570" y="95" text-anchor="middle" font-weight="bold">D6 ?</text>
<text x="170" y="58" text-anchor="middle" font-size="12">1f64ce4e…</text>
<text x="370" y="58" text-anchor="middle" font-size="12">6bc1157e…</text>
<text x="570" y="58" text-anchor="middle" font-size="12">c62d5298…</text>
<text x="70" y="270" text-anchor="middle" font-size="12">ac53e3ec…</text>
<text x="270" y="270" text-anchor="middle" font-size="12">e2c68bda…</text>
<text x="470" y="270" text-anchor="middle" font-size="12">11a5f735…</text>
<text x="320" y="310" text-anchor="middle">Victor asked for the border D3-D4: two boxes opened, four stay sealed</text>
</svg>
<figcaption>Figure 5.6. One round of the three-coloring proof on Arcadia City's generator map. Every district's shuffled color is sealed in a hash commitment; Victor names one border and sees only its two ends.</figcaption>
</figure>

### Code it

One round with hash commitments, run once with output shown, then 300 times
with an honest prover, then 90,000 times with a prover whose plan puts
districts 5 and 6 on the same generator.

```python
import hashlib, math, random
random.seed(2061)                        # demo only: real nonces come from secrets.token_bytes(16)

EDGES = [(1, 2), (1, 3), (2, 3), (2, 4), (3, 4), (3, 5), (4, 5), (4, 6), (5, 6)]
GOOD = {1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2}     # generator A=0, B=1, C=2 per district
BAD = {1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 1}      # D5 and D6 share a generator

def commit(color):
    nonce = random.getrandbits(128).to_bytes(16, "big")
    return hashlib.sha256(nonce + bytes([color])).hexdigest(), nonce

def prover_round(coloring):
    shuffle = random.sample(range(3), 3)        # fresh renaming of the three colors
    colors = {d: shuffle[c] for d, c in coloring.items()}
    boxes = {d: commit(c) for d, c in colors.items()}
    return {d: h for d, (h, n) in boxes.items()}, colors, boxes

def victor_round(coloring, show=False):
    sealed, colors, boxes = prover_round(coloring)   # move 1: six sealed boxes
    u, v = random.choice(EDGES)                      # move 2: one border
    openings = {d: (colors[d], boxes[d][1]) for d in (u, v)}   # move 3: open two boxes
    ok = all(hashlib.sha256(n + bytes([c])).hexdigest() == sealed[d]
             for d, (c, n) in openings.items())
    ok = ok and openings[u][0] != openings[v][0] and openings[u][0] in (0, 1, 2)
    if show:
        for d in sorted(sealed):
            print(f"  D{d}: {sealed[d][:16]}...")
        print(f"  Victor asks for D{u}-D{v}; opened colors {openings[u][0]} and {openings[v][0]}:", ok)
    return ok

victor_round(GOOD, show=True)
print("honest prover, 300 rounds:", all(victor_round(GOOD) for _ in range(300)))
caught = sum(not victor_round(BAD) for _ in range(90000))
print("bad coloring caught in", caught, "of 90000 rounds (expected 10000)")
k = math.ceil(40 * math.log(2) / math.log(9 / 8))
print("rounds for a cheating chance below 2^-40:", k)
```

Output:

```
  D1: b4f874e0efca72dd...
  D2: c84b48430165d18e...
  D3: d4f928e7c6a50cd3...
  D4: 7933ef71cb328516...
  D5: 37dc683fa697b92d...
  D6: f0ecc9b977f0ad6f...
  Victor asks for D1-D2; opened colors 1 and 2: True
honest prover, 300 rounds: True
bad coloring caught in 10110 of 90000 rounds (expected 10000)
rounds for a cheating chance below 2^-40: 236
```

The bad plan has exactly one bad border out of nine, so it is caught in about
one round in nine, and only 236 rounds push its chance of passing below
$2^{-40}$.

### The cost of talking to Earth

Now count the time. Mars is between about 4 and 24 minutes of light travel
from Earth, depending on where the two planets are in their orbits. Take 20
minutes one way. Each round has three moves, so it costs at least an hour of
light travel, and 236 rounds in sequence take ten days of nothing but waiting.
The insurer could run the rounds in parallel instead: all 236 sets of
commitments in one message, all 236 challenges in the reply, all the openings
in a third message, about an hour in total. Soundness survives that change.
But §5.5 warned that the simulator's rewinding argument does not, and with it
goes the guarantee that the insurer learns nothing.

The way out is to remove the insurer's live coins altogether: let the
challenges be computed by a hash of the commitments, so Peggy can send one
message that anyone can check. That is the Fiat-Shamir transform, the subject
of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md). It costs deniability:
such a proof convinces everyone who reads it, as a signature does.

## 5.8 Every NP statement has a zero-knowledge proof

*Level: intermediate.*

The three-coloring protocol is more than one more example. Goldreich, Micali
and Wigderson presented it at FOCS 1986 under the title "Proofs that Yield
Nothing but their Validity and a Methodology of Cryptographic Protocol
Design", with the journal version in 1991. Its main theorem:

> If secure commitment schemes exist, then every statement in NP has a
> computational zero-knowledge proof.

### How any statement becomes a map

The argument is a chain of translations, each of which carries witnesses
along.

1. **Start with any NP statement.** "I know $x$ with $\text{SHA-256}(x) = y$",
   "this ballot is an encryption of 0 or 1", "this transaction spends coins I
   own and creates no new money". Each has a verification program that takes the
   witness and checks it in polynomial time.
2. **Write the check as a circuit.** Any polynomial-time check can be unrolled
   into a Boolean circuit of AND, OR and NOT gates with polynomially many gates.
   The statement becomes "this circuit has an input that makes it output 1",
   circuit satisfiability. (This is the content of the Cook-Levin theorem:
   Stephen Cook 1971, Leonid Levin 1973.)
3. **Turn the circuit into a graph.** A standard gadget construction turns a
   circuit into a graph that is 3-colorable exactly when the circuit is
   satisfiable: a triangle fixes the meaning of the three colors (true, false
   and a "base" color), each wire becomes a vertex that must be true or false,
   and each gate becomes a small subgraph that can be colored only if its
   output wire's color is right for its inputs. A satisfying input gives a
   coloring directly, and a coloring gives back a satisfying input.
4. **Run the three-coloring proof** on the resulting graph, with the coloring
   that the prover computes from its witness.

Each step runs in polynomial time and maps true statements to colorable graphs
and false ones to uncolorable graphs, so soundness carries through, and the
simulator for the three-coloring proof works on the final graph without
knowing any witness, so zero knowledge carries through.

Commitments, in turn, can be built from any one-way function. Moni Naor gave
a bit commitment from any pseudorandom generator (CRYPTO '89, *Journal of
Cryptology* 1991), and Håstad, Impagliazzo, Levin and Luby (1999) built a
pseudorandom generator from any one-way function. Put together: **if one-way
functions exist, every NP statement has a zero-knowledge proof.** Rafail
Ostrovsky and Avi Wigderson showed in 1993 that something like one-way
functions is also needed, for zero-knowledge proofs of statements that are
hard on average. So zero knowledge for NP and one-way functions stand and fall
together.

### Why this mattered

Before 1986 each zero-knowledge protocol was a clever trick for one problem:
quadratic residues, graph isomorphism, discrete logs. GMW turned zero
knowledge into a general tool. Any time a protocol needs a party to prove that
it did what it was supposed to do (that a message was computed correctly from
its secret inputs), there is a zero-knowledge proof for it, because "I
computed this correctly" is an NP statement whose witness is the secret input.

That was the "methodology" in the paper's title. A protocol can first be
designed for parties who follow the rules (semi-honest), and then each party
can be made to prove, in zero knowledge, that every message it sends follows
the rules. The result is secure against parties who cheat. This **GMW
compiler** is the root of the theory of secure multi-party computation in
Chapter 10.

### Why nobody proves real statements this way

The theorem is a statement of possibility, not a recipe. Turning
"$\text{SHA-256}(x) = y$" into a circuit gives more than a hundred thousand
gates, the graph has hundreds of thousands of vertices, and every round of the
proof commits to all of them. The soundness error is $1 - 1/m$ per round on a graph
with $m$ edges, so the number of rounds must be a multiple of $m$: a proof of
millions of rounds, each sending hundreds of thousands of commitments. In the
1990s and 2000s, efficient zero knowledge meant Sigma protocols for algebraic
statements ([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)). Proving
general computations efficiently required new ideas: arithmetic circuits over
large fields instead of Boolean gates, polynomials instead of colorings, and
probabilistically checkable proofs, which make the soundness error tiny in one
round. Those are [Chapter 7](07-SNARKs.md) and
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md). The idea, though, is
the same one GMW proved: translate the statement into a standard form, commit,
and let the verifier spot-check at random.

!!! note "Life story: zero knowledge for all of NP (GMW)"
    **Born:** 1986, Oded Goldreich, Silvio Micali and Avi Wigderson (FOCS
    1986; *Journal of the ACM* 38, 1991) · **Purpose:** to show that
    zero-knowledge proofs exist for every NP statement, assuming only secure
    commitments, through the NP-complete three-coloring problem · **Helped:**
    made zero knowledge a general-purpose tool; gave the compiler from
    semi-honest to malicious security behind secure computation; set the
    pattern (encode, commit, spot-check) that SNARKs and STARKs follow ·
    **Status:** a foundation; the generic protocol itself is far too slow to
    use, and its descendants replaced it

## 5.9 Honest verifiers, real verifiers, and proofs beyond NP

*Level: expert.*

### Honest-verifier zero knowledge

The first simulator of §5.5 worked only for a Victor who flips a fair coin.
A protocol with such a simulator is **honest-verifier zero knowledge** (HVZK):
it leaks nothing to a verifier who follows the rules, but makes no promise
about one who does not. **Full** zero knowledge, the GMR definition, asks for
a simulator for every efficient $V^*$. The graph isomorphism proof has both,
because rewinding costs only a factor of 2. Many protocols have only the
first.

The gap is not academic. The clearest example is the protocol for the
opposite statement, "$G_0$ and $G_1$ are **not** isomorphic", the graph
version of the two balls of §5.2, from the same 1986 GMW paper. No short
witness for non-isomorphism is known, so this statement is not known to be in
NP at all. The protocol reverses the roles:

<div class="mars-steps" markdown>

1. Victor picks a secret bit $b$ and a random permutation $\pi$, and sends $H = \pi(G_b)$.
2. Peggy, who has unlimited computing power, works out which of $G_0$, $G_1$ is isomorphic to $H$, and sends that index $b'$.
3. Victor accepts if $b' = b$.

</div>

If the graphs are not isomorphic, $H$ is isomorphic to exactly one of them and
Peggy always answers correctly. If they are isomorphic, $H$ is a random copy
of both and carries no information about $b$, so Peggy is right with
probability $1/2$. Completeness and soundness hold, with error $1/2$ per round.

```python
import random
from itertools import permutations
random.seed(1986)

def apply(p, G):
    return frozenset(frozenset(p[v] for v in e) for e in G)

def graph(*pairs):
    return frozenset(map(frozenset, pairs))

PERMS = list(permutations(range(4)))
PAW = graph((0, 1), (1, 2), (2, 3), (1, 3))        # a triangle with a tail
SQUARE = graph((0, 1), (1, 2), (2, 3), (3, 0))     # also four edges, but no triangle
PAW2 = apply((2, 0, 3, 1), PAW)                    # the same shape, relabeled

def merlin(A, H):                        # all-powerful prover: tries every relabeling
    return 0 if any(apply(p, A) == H for p in PERMS) else 1

def rounds_right(A, B, rounds):          # counts rounds in which the prover named b correctly
    right = 0
    for _ in range(rounds):
        b = random.randrange(2)          # Victor's secret coin
        H = apply(random.choice(PERMS), (A, B)[b])
        right += merlin(A, H) == b
    return right

print("paw vs square (not isomorphic):", rounds_right(PAW, SQUARE, 1000), "of 1000 right")
print("paw vs paw2   (isomorphic):    ", rounds_right(PAW, PAW2, 1000), "of 1000 right")
```

Output:

```
paw vs square (not isomorphic): 1000 of 1000 right
paw vs paw2   (isomorphic):     493 of 1000 right
```

Against an honest Victor this is zero knowledge: he already knows $b$, so
Peggy's answer tells him nothing new, and a simulator just outputs $b$. But a
dishonest Victor can send a graph $H$ he found somewhere else, not one he
built from $G_0$ or $G_1$, and Peggy's answer tells him whether $H$ is
isomorphic to $G_0$: a fact he could not compute himself. GMW fixed this by
making Victor first prove, in a small zero-knowledge proof of his own, that he
knows how $H$ was built. Then a simulator can extract $b$ from Victor and
answer without Peggy's power.

The same gap matters in practice. Schnorr's protocol and the other Sigma
protocols of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) have
challenges drawn from about $2^{256}$ values. Their simulator works backwards,
as in §5.5, so they are HVZK. But rewinding a dishonest verifier would mean
guessing its 256-bit challenge, which never succeeds, so nobody knows how to
prove them fully zero knowledge. They are proved to have a weaker property,
**witness indistinguishability** (Feige and Shamir, 1990), which still keeps
the secret safe for identification. In Fiat-Shamir proofs the question goes
away, because no verifier chooses a challenge at all.

### From honest-verifier to full zero knowledge

There are general ways to close the gap.

- **The verifier commits first.** Victor commits to his challenge before
  seeing Peggy's first message, then opens it. He can no longer choose the
  challenge as a function of $H$, so he behaves like an honest verifier.
  Goldreich and Kahan (1996) used this, with care over the commitment's hiding
  and binding properties, to build constant-round zero-knowledge proofs for NP.
- **Toss coins together.** The challenge is produced by a coin-flipping
  protocol ([Chapter 3](03-Commitments.md)), so neither side controls it.
- **For statistical zero knowledge, it comes free.** Goldreich, Sahai and
  Vadhan (1998) proved that any statement with an honest-verifier statistical
  zero-knowledge proof also has a full one.

### Why parallel repetition is different

§5.5 noted that rewinding fails when 40 rounds run in parallel. That is not
only a weakness of one proof technique. Oded Goldreich and Hugo Krawczyk
showed (ICALP 1990; *SIAM Journal on Computing* 1996) that only easy problems,
those in BPP, have three-round interactive proofs that are zero knowledge with
a black-box simulator, one that only runs the verifier. The parallel version
of the graph isomorphism proof is three rounds, so it cannot be shown zero
knowledge that way unless graph isomorphism is easy. Some simulator that
reads the verifier's code might still exist; Boaz Barak showed in 2001 that
such non-black-box simulators can do things black-box ones cannot. The
practical answer has been either more rounds, or the commitment-first trick
above, or Fiat-Shamir in the random-oracle model.

### Proofs beyond NP

The non-isomorphism protocol proves a statement that is not known to be in
NP. How far does interaction reach? The class of statements with interactive
proofs is called **IP**. In late 1989 Carsten Lund, Lance Fortnow, Howard
Karloff and Noam Nisan showed that IP contains every statement about counting
solutions (the class #P, and so all of coNP), using a new trick: write the
problem as a polynomial over a finite field and let the verifier check it at
random points, round by round. Within weeks Adi Shamir extended the method to
show **IP = PSPACE**: anything that can be decided with a polynomial amount of
memory, however long it takes, can be proved to a polynomial-time verifier by
interaction. Both results appeared at FOCS 1990 and in the *Journal of the
ACM* in 1992. Earlier, Ben-Or, Goldreich, Goldwasser, Håstad, Kilian, Micali
and Rogaway had shown ("Everything Provable is Provable in Zero-Knowledge",
CRYPTO '88) that if one-way functions exist, every statement with an
interactive proof has a zero-knowledge one. Together, these say zero knowledge
reaches all of PSPACE. The polynomial-checking trick of Lund, Fortnow, Karloff
and Nisan, the **sumcheck protocol**, lives on inside many modern proof
systems.

!!! note "Life story: IP = PSPACE"
    **Born:** December 1989 to January 1990; Carsten Lund, Lance Fortnow,
    Howard Karloff and Noam Nisan (the sumcheck protocol, coNP in IP), then
    Adi Shamir (IP = PSPACE), both at FOCS 1990 and in *Journal of the ACM*
    1992 · **Purpose:** to find out how much a polynomial-time verifier can be
    convinced of by an all-powerful prover · **Helped:** the PCP theorem and
    the multi-prover results that followed; the sumcheck protocol used in
    modern SNARKs and zkVMs · **Status:** a landmark of complexity theory;
    the result is famous for being proved by a fast-moving exchange of email
    drafts among researchers

## 5.10 Break it

*Level: intermediate.*

Zero-knowledge proofs fail in practice for the same reason most
cryptography fails: the mathematics is fine and the implementation leaves out
one of its assumptions. Each of the assumptions in this chapter can be broken
on purpose.

### Commitments that do not hide

The three-coloring proof needs commitments that hide. A programmer who
"commits" by hashing the color alone, with no nonce, has made a seal with only
three possible values:

```python
import hashlib, random
random.seed(9)

GOOD = {1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2}

def lazy_commit(color):                  # no nonce: the "seal" is a fixed function of the color
    return hashlib.sha256(bytes([color])).hexdigest()

shuffle = random.sample(range(3), 3)
sealed = {d: lazy_commit(shuffle[c]) for d, c in GOOD.items()}

table = {lazy_commit(c): c for c in range(3)}   # Victor hashes the three possible colors
print("Victor reads every box:", {d: table[h] for d, h in sealed.items()})
```

Output:

```
Victor reads every box: {1: 1, 2: 2, 3: 0, 4: 1, 5: 2, 6: 0}
```

Victor hashes 0, 1 and 2 and reads all six boxes in the first round. The
shuffle does not help: he has the whole coloring up to renaming of the
colors, which is all of the utility's wiring plan. **Fix it:** a fresh random
nonce of at least 128 bits in every commitment, as in §5.7, so that the
commitment hides even when the message has only a few possible values.

### Reusing one round's randomness

If Peggy reuses the same color shuffle and nonces in every round, each round
opens two more boxes of the **same** sealed map. After Victor has asked for
enough borders he has seen every district's color. In the graph isomorphism
proof the equivalent mistake is answering two challenges for one $H$, which
is exactly what the extractor of §5.6 exploits: a prover whose software
"retries" a round after a dropped connection by resending the same $H$ and
accepting a new challenge hands Victor $\sigma$. The real-world form of this
bug is nonce reuse in Schnorr-style signatures, where two signatures with one
nonce give away the key; Sony's PlayStation 3 signing key fell to it with
ECDSA in 2010 ([Cryptanalysis, chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)
tells that story, and [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) does
the algebra). **Fix it:** fresh randomness for every commitment, and never
answer a second challenge for a commitment already answered.

### Challenges a cheater can predict

Soundness rests on the verifier's coins being unpredictable to the prover.
Here Victor draws his challenges from Python's `random`, seeded with the date,
and Mallory, who knows no isomorphism, runs the same generator:

```python
import random

def apply(p, G):
    return frozenset(frozenset(p[v] for v in e) for e in G)

G0 = frozenset(map(frozenset, [(0, 1), (1, 2), (2, 3), (1, 3)]))
G1 = apply([2, 0, 3, 1], G0)

class Victor:                            # draws challenges from a seed anyone can guess
    def __init__(self, day):
        self.rng = random.Random(day)
    def challenge(self):
        return self.rng.randrange(2)

class Mallory:                           # knows no isomorphism, but knows the seed
    def __init__(self, day):
        self.spy = random.Random(day)    # the same generator Victor will run
    def commit(self):
        self.b = self.spy.randrange(2)   # Victor's next challenge, before he sends it
        self.pi = random.sample(range(4), 4)
        return apply(self.pi, G1 if self.b else G0)
    def answer(self, b):
        return self.pi

day = 20261108
victor, mallory = Victor(day), Mallory(day)
ok = True
for _ in range(100):
    H = mallory.commit()
    b = victor.challenge()
    ok = ok and apply(mallory.answer(b), G1 if b else G0) == H
print("Mallory passes 100 rounds:", ok)
```

Output:

```
Mallory passes 100 rounds: True
```

A soundness error of $2^{-100}$ on paper becomes certainty in practice.
Mallory never touched $\sigma$; she only knew what Victor would ask. **Fix
it:** challenges from `secrets` (or the operating system's generator), drawn
only after the commitment has arrived. The non-interactive version of this
mistake is a Fiat-Shamir hash that leaves out part of the statement, so the
prover can choose the statement after seeing the challenge. That is the Frozen
Heart family of bugs found by Trail of Bits in 2022, in
[Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md).

### Proving the wrong statement

The last failure is the one that has cost the most in deployed systems. A
proof shows that the statement as written is true. If the statement is not
the one the designer meant (a circuit with a missing constraint, a range check
that allows negative numbers), the proof is perfectly sound and perfectly
useless. The Zcash counterfeiting flaw found in 2018 and the circuit bugs of
recent years are of this kind; [Chapter 7](07-SNARKs.md) tells them.

## 5.11 In the real world

*Level: intermediate.*

The protocols in this chapter are rarely deployed as they stand; their
descendants are deployed everywhere. The table maps each use to the kind of
proof behind it and the chapter that covers it.

| Use | What is proved | Proof behind it | Chapter |
|---|---|---|---|
| Smart-card and device login | "I know the secret behind this public key" | Fiat-Shamir, Guillou-Quisquater, Schnorr identification | [6](06-Sigma-Protocols-and-Fiat-Shamir.md) |
| Schnorr, EdDSA and BIP 340 signatures | the same, bound to a message | Schnorr's protocol plus Fiat-Shamir | [6](06-Sigma-Protocols-and-Fiat-Shamir.md) |
| Private payments (Zcash, since 2016) | a valid spend, with hidden amounts and parties | SNARKs | [7](07-SNARKs.md), 18 |
| Confidential amounts (Monero, since 2018) | a hidden amount is not negative | Bulletproofs range proofs | [8](08-STARKs-Bulletproofs-and-Recursion.md) |
| zk-rollups and zkVMs | a batch of transactions was executed correctly | SNARKs, STARKs, recursion | [8](08-STARKs-Bulletproofs-and-Recursion.md), 17 |
| Anonymous credentials | "I hold a valid credential with this property" | Sigma protocols on signatures | 14 |
| Electronic voting | "this ballot encrypts 0 or 1"; "the shuffle was honest" | OR-proofs, shuffle proofs | 16 |
| Threshold key generation | "my share is consistent with my commitment" | Schnorr proofs of knowledge | [4](04-Threshold-Cryptography.md) |

**Identification, 1986 to now.** The first practical target was the smart
card, which in the late 1980s had little memory and a slow processor and could
not run RSA comfortably. Fiat and Shamir's 1986 scheme, Feige-Fiat-Shamir,
Guillou-Quisquater (1988) and Schnorr (1989) were all designed for it: the card
proves knowledge of its secret in a few multiplications. Guillou-Quisquater and
Schnorr-style mechanisms were written into ISO/IEC standards for entity
authentication and for signatures. Every Schnorr signature verified today,
including those in Bitcoin's Taproot upgrade (BIP 340, activated in November
2021), is a zero-knowledge identification protocol with the verifier replaced
by a hash.

**Proofs about whole computations.** The general GMW theorem became practical
after 2010. Zcash launched on 28 October 2016 with SNARKs proving that hidden
payments balance. Since then rollups on Ethereum have used SNARKs and STARKs to
prove the correct execution of many thousands of transactions in one proof, and
general-purpose "zkVMs" prove the execution of ordinary programs. The pattern
is GMW's: translate the statement into a standard form, commit, let the
verifier spot-check. The forms and the checks are new.

**Proofs with physical objects.** Zero knowledge does not need computers. In
1999 Moni Naor, Yael Naor and Omer Reingold described how to prove you have
found Waldo in a *Where's Waldo?* picture without showing where: cover the
picture with a large sheet of cardboard with a small Waldo-sized hole, and
slide the picture underneath until Waldo shows through. Gradwohl, Naor, Pinkas
and Rothblum (2007) gave card-based zero-knowledge proofs for Sudoku. The most
serious physical use is arms control. In 2014 Alexander Glaser, Boaz Barak and
Robert Goldston of Princeton proposed in *Nature* a way for an inspector to
check that a warhead offered for dismantlement matches a genuine template
without measuring anything secret about its design. The host preloads neutron
detectors with the complement of the expected signal, so a genuine warhead
brings every detector to the same total count, and the inspector sees only
flat counts that would look the same for any genuine design. Experiments with
non-nuclear test objects followed; as far as is public, the method has not been
used in a real treaty.

**Standards.** There is no single standard for zero-knowledge proofs in
general. Specific uses are standardized: RFC 8235 (2017) specifies the
non-interactive Schnorr proof, and RFC 9591 (2024) uses Schnorr proofs of
knowledge in FROST key generation. A community effort, ZKProof, has met since
2018 to write shared terminology and security guidance.

!!! note "Life story: zero-knowledge warhead verification"
    **Born:** 2014, Alexander Glaser, Boaz Barak and Robert Goldston,
    Princeton University, "A zero-knowledge protocol for nuclear warhead
    verification", *Nature* 510 · **Purpose:** let an inspector confirm that
    an object is a genuine warhead of an agreed type without learning its
    classified design · **Helped:** showed that the idea of zero knowledge
    applies to physical measurements; led to laboratory tests with
    non-nuclear objects and to a wider research program on verification of
    disarmament · **Status:** experimental; not part of any treaty so far as
    is publicly known

## 5.12 Going deeper

*Level: expert.*

**Auxiliary input and composition.** The definition in §5.5 lets the
simulator see only the statement. For zero knowledge to survive sequential
composition, the verifier must be allowed extra input (what it learned in
earlier runs) and the simulator must handle every such input. Goldreich and
Oren ("Definitions and Properties of Zero-Knowledge Proof Systems", *Journal
of Cryptology* 1994) showed that this **auxiliary-input** zero knowledge is
closed under sequential composition, while the original definition is not.
Every modern definition includes it.

**Concurrent zero knowledge.** On the internet a verifier may run many
sessions with many provers at once, interleaving messages so that rewinding
one session disturbs another. Dwork, Naor and Sahai (STOC 1998) named the
problem. Black-box simulators then need a number of rounds that grows with the
security parameter (Canetti, Kilian, Petrank and Rosen gave a lower bound of
about $\log n / \log \log n$ rounds in 2001), and protocols with about
$\log n$ rounds achieve it. Barak's non-black-box technique (FOCS 2001) gave
constant-round protocols secure against a bounded number of concurrent
sessions.

**Proofs and arguments.** A proof is sound against unbounded provers; an
argument only against efficient ones. Brassard, Chaum and Crépeau
("Minimum Disclosure Proofs of Knowledge", 1988) used perfectly hiding,
computationally binding commitments to get **perfect zero-knowledge
arguments** for NP: the verifier learns nothing even with unlimited computing
power, and a cheating prover must break the binding to win. The choice
between hiding and binding guarantees is the one in
[Chapter 3](03-Commitments.md): a commitment cannot be perfectly both.
Kilian (STOC 1992) built arguments whose communication is only polylogarithmic
in the size of the statement, by committing to a probabilistically checkable
proof with a Merkle tree and opening a few positions; Micali's "CS proofs"
(2000) made them non-interactive with a hash. This line of work leads straight
to SNARKs and STARKs.

**Non-interactive zero knowledge.** Blum, Feldman and Micali (STOC 1988)
showed that if prover and verifier share a random string set up in advance (a
**common reference string**), proofs can be a single message with no random
oracle. Feige, Lapidot and Shamir (FOCS 1990) gave such proofs for all of NP
from trapdoor permutations. Without a shared string or a random oracle,
non-interactive zero knowledge exists only for easy languages, so every
deployed non-interactive proof relies on one or the other: a setup ceremony
(Groth16, PLONK) or a hash modeled as a random oracle (Fiat-Shamir, STARKs).

**Statistical zero knowledge as a class.** The statements with statistical
zero-knowledge proofs form a class, SZK, with a rich structure. Fortnow
(STOC 1987) and Aiello and Håstad (1991) showed SZK lies inside AM ∩ coAM, so
an NP-complete problem with a statistical zero-knowledge proof would collapse
the polynomial hierarchy. That is why GMW's proof for all of NP is
computational: perfect or statistical zero knowledge for 3-coloring is not
expected. Graph isomorphism, quadratic residuosity and approximate lattice
problems are in SZK.

**More provers.** With two provers who cannot talk to each other, the verifier
can cross-examine them. Ben-Or, Goldwasser, Kilian and Wigderson (1988) showed
such proofs are zero knowledge without any assumption, and Babai, Fortnow and
Lund (1991) showed MIP = NEXP: two provers can convince a verifier of
statements far beyond PSPACE. That work led to the PCP theorem (Arora and
Safra; Arora, Lund, Motwani, Sudan and Szegedy; 1992, journal versions 1998):
every NP statement has a proof that can be checked by reading a constant
number of its bits. In 2020 Ji, Natarajan, Vidick, Wright and Yuen announced
MIP* = RE: two provers sharing quantum entanglement can convince a verifier of
any statement a computer can eventually confirm, including whether a program
halts.

**Quantum provers and verifiers.** Rewinding is a problem when the verifier is
a quantum computer, because its state cannot be copied. Watrous (2006,
*SIAM Journal on Computing* 2009) showed that the graph isomorphism and
three-coloring proofs remain zero knowledge against quantum verifiers, with a
quantum rewinding technique. The hardness assumptions matter too: commitments
from hash functions survive quantum computers; those from discrete logarithms
do not ([Post-quantum, chapter 4](../post-quantum/04-A-Field-Guide-to-Hard-Problems.md)).

## Check yourself

??? question "1. In the cave, why must Peggy go in before Victor shouts?"

    If Victor shouted first, a bluffer would walk into the passage he named and
    walk back out, passing every round. The commitment (her choice of passage)
    must be fixed before the challenge, so that only someone who can open the
    door can answer both possible challenges.

??? question "2. How many rounds of the graph isomorphism proof push a cheater's chance below one in a billion?"

    Each round has error $1/2$, so $k$ rounds give $2^{-k}$. Since
    $2^{30} \approx 1.07 \times 10^9$, 30 rounds suffice.

??? question "3. Victor receives ρ = π∘σ when he sends b = 0. Why can't he learn anything about σ from it?"

    Peggy draws $\pi$ uniformly from all permutations. For a fixed $\sigma$, the
    map $\pi \mapsto \pi \circ \sigma$ is a one-to-one shuffle of the
    permutations, so $\pi \circ \sigma$ is also uniform. Victor sees a
    uniformly random permutation whatever $\sigma$ is, the same as he would for
    any other $\sigma$.

??? question "4. A prover answered both challenges for one H: ρ0 = [3, 1, 2, 0] and ρ1 = [1, 0, 3, 2]. Using the graphs of §5.4, find the isomorphism."

    $\sigma = \rho_1^{-1} \circ \rho_0$. The inverse of $[1, 0, 3, 2]$ is
    itself. Then vertex 0 goes to $\rho_1^{-1}(3) = 2$, vertex 1 to
    $\rho_1^{-1}(1) = 0$, vertex 2 to $\rho_1^{-1}(2) = 3$, vertex 3 to
    $\rho_1^{-1}(0) = 1$: $\sigma = [2, 0, 3, 1]$, Peggy's secret again (here
    $\pi = [1, 0, 3, 2]$).

??? question "5. A map has 12 borders. How many rounds of the three-coloring proof give a cheating chance below 2^-20?"

    A cheater is caught with probability at least $1/12$ per round, so the
    error is $(11/12)^k$. We need $k \ge 20 \ln 2 / \ln(12/11) \approx 159.3$,
    so 160 rounds.

??? question "6. Why does Peggy shuffle the colors in every round of the three-coloring proof?"

    Without the shuffle, the colors Victor sees on each border would be the
    real ones, and over many rounds he would assemble the whole coloring. With
    a fresh random renaming each round, the two colors he sees are a uniformly
    random pair of different colors, which he could have produced himself.

??? question "7. The graph isomorphism proof is perfect zero knowledge. Why is the three-coloring proof with hash commitments only computational?"

    The simulator for three-coloring commits to dummy colors at the unopened
    vertices. Real and simulated transcripts differ inside those commitments,
    and only the commitment's hiding property, which an unbounded observer
    could break by trying every nonce, keeps them apart. The graph isomorphism
    simulator produces exactly the same distribution, with nothing hidden.

??? question "8. In the graph non-isomorphism protocol, what can a dishonest verifier learn, and how is that prevented?"

    He can send a graph $H$ that he did not build from $G_0$ or $G_1$ and learn
    from Peggy's answer whether $H$ is isomorphic to $G_0$, which he could not
    compute himself. GMW prevent it by having the verifier first prove, in
    zero knowledge, that he knows a $b$ and $\pi$ with $H = \pi(G_b)$, so the
    simulator can extract $b$ and answer without Peggy's power.

??? question "9. A cheating prover passes one round of the graph isomorphism proof with probability 0.6. What does the extractor argument of §5.6 guarantee?"

    At least a fraction $2(0.6) - 1 = 0.2$ of the prover's random tapes answer
    both challenges. The extractor tries random tapes, rewinding each to ask
    both challenges, and finds a good one after about $1/0.2 = 5$ tries on
    average, then computes $\sigma = \rho_1^{-1} \circ \rho_0$. A prover that
    beats $1/2$ by any noticeable amount knows an isomorphism.

??? question "10. Why does the rewinding simulator fail when 40 rounds run in parallel, and is that just a weakness of the proof?"

    The simulator must guess all 40 challenge bits before sending the 40
    commitments, and a verifier who chooses its challenges as a function of
    the commitments matches a random guess with probability $2^{-40}$, so the
    expected running time is exponential. Goldreich and Krawczyk (1990)
    showed this is a real barrier: only languages in BPP have three-round
    proofs that are zero knowledge with a black-box simulator. Soundness, on
    the other hand, survives parallel repetition.

## What you learned

- A zero-knowledge proof is a conversation, not a document: the verifier asks
  random questions, and the proof convinces only the person who asked them. A
  recording proves nothing, because anyone can fake one.
- Goldwasser, Micali and Rackoff (1985) defined the three properties:
  completeness (honest provers pass), soundness (false statements fail except
  with small error, reduced to $2^{-k}$ by $k$ repetitions) and zero knowledge
  (a simulator with no secret produces the same transcripts).
- In the graph isomorphism proof the prover sends a scrambled copy and opens
  one of two views. Its simulator works backwards, and counting the 48
  transcripts shows the real and simulated distributions are identical.
  Rewinding extends it to verifiers who cheat.
- A proof of knowledge has an extractor: rewind the prover and ask both
  challenges for one commitment, and the secret falls out. Answering twice is
  therefore a bug, and fresh randomness in every round is a requirement.
- With commitments, three-coloring has a zero-knowledge proof, and because
  three-coloring is NP-complete, so does every NP statement (GMW 1986). The
  generic proof is slow; Sigma protocols, SNARKs and STARKs are the efficient
  descendants.
- Honest-verifier zero knowledge is weaker than full zero knowledge, parallel
  repetition can lose zero knowledge, and interactive proofs reach all of
  PSPACE.

**Next:** [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md), where the
challenge grows from one bit to 256, one round is enough, and a hash replaces
the verifier.

## Further reading

- Shafi Goldwasser, Silvio Micali and Charles Rackoff, "The Knowledge
  Complexity of Interactive Proof-Systems", STOC 1985; *SIAM Journal on
  Computing* 18 (1989).
- László Babai, "Trading Group Theory for Randomness", STOC 1985, and László
  Babai and Shlomo Moran, "Arthur-Merlin Games", *Journal of Computer and
  System Sciences* 36 (1988).
- Oded Goldreich, Silvio Micali and Avi Wigderson, "Proofs that Yield Nothing
  but their Validity or All Languages in NP Have Zero-Knowledge Proof
  Systems", *Journal of the ACM* 38 (1991); FOCS 1986.
- Jean-Jacques Quisquater, Louis Guillou, Thomas Berson et al., "How to
  Explain Zero-Knowledge Protocols to Your Children", CRYPTO '89 (Springer,
  1990).
- Amos Fiat and Adi Shamir, "How to Prove Yourself: Practical Solutions to
  Identification and Signature Problems", CRYPTO '86.
- Uriel Feige, Amos Fiat and Adi Shamir, "Zero-Knowledge Proofs of Identity",
  *Journal of Cryptology* 1 (1988).
- Mihir Bellare and Oded Goldreich, "On Defining Proofs of Knowledge",
  CRYPTO '92.
- Moni Naor, "Bit Commitment Using Pseudorandomness", *Journal of Cryptology*
  4 (1991).
- Gilles Brassard, David Chaum and Claude Crépeau, "Minimum Disclosure Proofs
  of Knowledge", *Journal of Computer and System Sciences* 37 (1988).
- Manuel Blum, Paul Feldman and Silvio Micali, "Non-Interactive Zero-Knowledge
  and Its Applications", STOC 1988.
- Oded Goldreich and Hugo Krawczyk, "On the Composition of Zero-Knowledge
  Proof Systems", *SIAM Journal on Computing* 25 (1996); ICALP 1990.
- Oded Goldreich and Yair Oren, "Definitions and Properties of Zero-Knowledge
  Proof Systems", *Journal of Cryptology* 7 (1994).
- Carsten Lund, Lance Fortnow, Howard Karloff and Noam Nisan, "Algebraic
  Methods for Interactive Proof Systems", and Adi Shamir, "IP = PSPACE", both
  *Journal of the ACM* 39 (1992).
- Joe Kilian, "A Note on Efficient Zero-Knowledge Proofs and Arguments",
  STOC 1992.
- Boaz Barak, "How to Go Beyond the Black-Box Simulation Barrier", FOCS 2001.
- Alexander Glaser, Boaz Barak and Robert Goldston, "A Zero-Knowledge Protocol
  for Nuclear Warhead Verification", *Nature* 510 (2014).
- Moni Naor, Yael Naor and Omer Reingold, "Applied Kid Cryptography, or How to
  Convince Your Children You Are Not Cheating" (1999).
- Oded Goldreich, *Foundations of Cryptography, Volume 1: Basic Tools*
  (Cambridge University Press, 2001), chapter 4: the standard full treatment.
- RFC 8235, Schnorr Non-interactive Zero-Knowledge Proof (2017).
- Reference page: [Zero-knowledge proofs](../../11-advanced/Zero-Knowledge.md),
  and book 1's tour in [Advanced protocols](../../book/23-Advanced-Protocols.md).
