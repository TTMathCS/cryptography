# 6. Sigma Protocols and Fiat-Shamir

*Almost every zero-knowledge proof that runs in a real product today has the
same skeleton: three messages, commit, challenge, response. Cryptographers call
it a sigma protocol, after the zigzag the three arrows draw. This chapter takes
the skeleton apart on Schnorr's 1989 identification protocol, worked by hand in
a group of 29 elements, and shows why it convinces, why it hides, and how a
machine can compute the secret from two answers. Then it builds with it: a
proof that two discrete logs are equal, which proves a decryption honest; a
proof that you know one of several secrets without saying which, which opens
an airlock in Arcadia City; and the Fiat-Shamir transform, which turns any of
them into a non-interactive proof or a signature. You will forge proofs where
the transform hashes too little, as real systems did in 2012 and 2022, and
recover a signing key from two signatures that shared a nonce.*

!!! abstract "In this chapter"
    **You will learn:**

    - the three-move pattern (commit, challenge, response) and why its order
      is the whole security argument;
    - Schnorr's identification protocol, by hand in the order-29 subgroup of
      the numbers mod 59;
    - the three properties every sigma protocol must have: completeness,
      special soundness (with an extractor that computes the secret from two
      answers) and honest-verifier zero knowledge (with a simulator that
      writes the conversation backwards);
    - the Chaum-Pedersen proof that two discrete logs are equal, and how it
      proves a Diffie-Hellman tuple or a decryption correct; Okamoto's proof
      for several secrets at once;
    - AND and OR compositions, and an OR-proof that an encrypted vote is 0 or 1;
    - the Fiat-Shamir transform, what must go into its hash, and how hashing
      too little broke Helios (2012) and the "Frozen Heart" implementations
      (2022);
    - why a repeated nonce gives away the key, and where sigma protocols run
      today: EdDSA, Bitcoin's Taproot, threshold signing, credentials, voting.

    **You need:** [Chapter 5](05-Zero-Knowledge-Proofs.md) (what zero knowledge,
    soundness, simulators and extractors mean), Schnorr groups and the nonce
    problem from book 1, [Chapter 14](../../book/14-Discrete-Log-Systems.md),
    and Diffie-Hellman from book 1, [Chapter 12](../../book/12-Diffie-Hellman.md).
    Pedersen commitments ([Chapter 3](03-Commitments.md)) help in §6.5.

    **Levels:** §6.1 to §6.3 are for beginners, §6.4 to §6.11 are
    intermediate, §6.12 is expert.

## 6.1 The problem

*Level: beginner.*

A password proves who you are by giving away the thing that proves it. The
server you log in to sees the password, so a dishonest server, or anyone who
steals its database, or anyone who can watch the line, can log in as you
afterwards. Public-key signatures fix part of this: you sign a fresh random
challenge, and the server checks the signature with your public key, so it never
holds anything it could use to sign for you. But a signature is a lasting,
transferable object. The server can show it to a third party as evidence that
you were there.

In the mid-1980s Amos Fiat and Adi Shamir, at the Weizmann Institute in Israel,
asked for something sharper. They wanted a smart card to prove its identity to
a terminal so that the terminal, even a malicious one built to collect data,
learned nothing it could use to impersonate the card later, and nothing it could
show anyone else. The year before, Shafi Goldwasser, Silvio Micali and Charles
Rackoff had defined exactly that property, **zero knowledge**
([Chapter 5](05-Zero-Knowledge-Proofs.md)), and Goldreich, Micali and Wigderson
had just shown that every NP statement has such a proof. Those general proofs
were far too slow for a card with a few hundred bytes of memory and an 8-bit
processor. Fiat and Shamir's 1986 scheme, based on square roots modulo a
composite, was fast enough. And in the same paper they made a remark that
turned out to matter more than the scheme: if the terminal's random challenge
is replaced by a hash of the card's first message, the conversation becomes a
**signature** that anyone can check later.

Three years later Claus-Peter Schnorr, at Goethe University Frankfurt, gave the
discrete-log version, with shorter numbers and less work for the card than
anything before. His protocol is the one this chapter is built on. It is three
messages long. The prover sends a commitment, the verifier sends a random
challenge, the prover sends a response, and the verifier checks one equation.
That shape turned out to be general. Within five years David Chaum and Torben
Pryds Pedersen had used it to prove two discrete logs equal, Tatsuaki Okamoto to
prove knowledge of several secrets at once, and Ronald Cramer, Ivan Damgård and
Berry Schoenmakers to prove "this OR that" without saying which. Cramer's 1996
PhD thesis gave the family its name: **Σ-protocols**, sigma protocols, because
the three arrows going right, left and right again trace the letter Σ on its
side.

Today the same shape sits inside Ed25519 signatures in SSH and Signal, inside
Bitcoin's Taproot upgrade, inside the threshold signing of
[Chapter 4](04-Threshold-Cryptography.md), inside verifiable random functions
and privacy tokens, inside anonymous credentials
([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)) and inside the
ballot proofs of verifiable elections
([Chapter 16](16-Electronic-Voting.md)). Its mistakes are just as widespread.
Figure 6.1 lays out the history.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of sigma protocols and the Fiat-Shamir transform from 1985 to 2024" fill="currentColor" font-size="14">
<line x1="78" y1="10" x2="78" y2="390" stroke="currentColor" stroke-width="1.6"/>
<text x="64" y="27" text-anchor="end" font-weight="bold">1985</text>
<circle cx="78" cy="22" r="3.5"/>
<text x="92" y="27">Goldwasser, Micali, Rackoff define zero knowledge</text>
<text x="64" y="53" text-anchor="end" font-weight="bold">1986</text>
<circle cx="78" cy="48" r="3.5"/>
<text x="92" y="53">Fiat and Shamir: hash the challenge, get a signature</text>
<text x="64" y="79" text-anchor="end" font-weight="bold">1989</text>
<circle cx="78" cy="74" r="3.5"/>
<text x="92" y="79">Schnorr: identification and signatures for smart cards</text>
<text x="64" y="105" text-anchor="end" font-weight="bold">1991</text>
<circle cx="78" cy="100" r="3.5"/>
<text x="92" y="105">Schnorr's US patent granted; NIST proposes DSA instead</text>
<text x="64" y="131" text-anchor="end" font-weight="bold">1992</text>
<circle cx="78" cy="126" r="3.5"/>
<text x="92" y="131">Chaum-Pedersen (equal logs), Okamoto (representations)</text>
<text x="64" y="157" text-anchor="end" font-weight="bold">1994</text>
<circle cx="78" cy="152" r="3.5"/>
<text x="92" y="157">Cramer, Damgård, Schoenmakers: AND and OR proofs</text>
<text x="64" y="183" text-anchor="end" font-weight="bold">1996</text>
<circle cx="78" cy="178" r="3.5"/>
<text x="92" y="183">Cramer names Σ-protocols; Pointcheval-Stern forking lemma</text>
<text x="64" y="209" text-anchor="end" font-weight="bold">2008</text>
<circle cx="78" cy="204" r="3.5"/>
<text x="92" y="209">The Schnorr patent expires</text>
<text x="64" y="235" text-anchor="end" font-weight="bold">2011</text>
<circle cx="78" cy="230" r="3.5"/>
<text x="92" y="235">Ed25519: a Schnorr signature on an Edwards curve</text>
<text x="64" y="261" text-anchor="end" font-weight="bold">2012</text>
<circle cx="78" cy="256" r="5"/>
<text x="92" y="261" font-weight="bold">Weak Fiat-Shamir makes Helios's proofs unsound</text>
<text x="64" y="287" text-anchor="end" font-weight="bold">2017</text>
<circle cx="78" cy="282" r="3.5"/>
<text x="92" y="287">RFC 8235 (Schnorr proof) and RFC 8032 (EdDSA)</text>
<text x="64" y="313" text-anchor="end" font-weight="bold">2021</text>
<circle cx="78" cy="308" r="3.5"/>
<text x="92" y="313">Bitcoin's Taproot switches on BIP 340 Schnorr signatures</text>
<text x="64" y="339" text-anchor="end" font-weight="bold">2022</text>
<circle cx="78" cy="334" r="5"/>
<text x="92" y="339" font-weight="bold">Frozen Heart: weak Fiat-Shamir in PlonK, Bulletproofs</text>
<text x="64" y="365" text-anchor="end" font-weight="bold">2024</text>
<circle cx="78" cy="360" r="3.5"/>
<text x="92" y="365">FROST threshold Schnorr published as RFC 9591</text>
</svg>
<figcaption>Figure 6.1. Forty years of sigma protocols. The bold entries are failures, and both are the same failure: a Fiat-Shamir hash that left out part of the statement.</figcaption>
</figure>

Book 1 has met Schnorr's protocol twice already: as the road to Schnorr
signatures in [Chapter 14](../../book/14-Discrete-Log-Systems.md) and as the
example of zero knowledge in
[Chapter 23](../../book/23-Advanced-Protocols.md). Both stop at "it checks,
it is sound because of two answers, it is zero knowledge because of a fake
transcript". This chapter goes behind each of those claims, codes them, and
then uses the protocol as a building block, which is how it is used in
practice. The goal is that you can look at a new sigma protocol, in a paper or
a code review, and check its three properties yourself, and that you know what
its Fiat-Shamir hash has to contain.

## 6.2 Commit, challenge, response

*Level: beginner.*

Start from what the two parties have. There is a public **statement**, written
$y$, and a secret **witness**, written $x$, that makes the statement true. For
Schnorr's protocol the statement is a group element $y$ and the witness is its
discrete logarithm: the number $x$ with $g^x = y$. In general the link between
them is a **relation** $R$, a rule anyone can check, and "$(y, x) \in R$" says
that $x$ is a witness for $y$. The prover knows both; the verifier knows only
$y$. The prover wants to convince the verifier that it knows some $x$ with
$(y, x) \in R$, and wants to show nothing else.

A sigma protocol does it in three messages (Figure 6.2):

1. **Commitment.** The prover picks fresh randomness and sends a first message
   $t$ computed from it. This message is chosen before the prover sees
   anything from the verifier, and it ties the prover down.
2. **Challenge.** The verifier sends a random $c$ from a large set, chosen
   after seeing $t$.
3. **Response.** The prover sends $s$, computed from the randomness, the
   witness and $c$.

The verifier then runs a public check on $(y, t, c, s)$ and accepts or rejects.
The triple $(t, c, s)$ is called the **transcript**.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The three moves of a sigma protocol: commitment from prover to verifier, challenge back, response, then the verifier's check" fill="currentColor" font-size="14">
<rect x="20" y="10" width="170" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="29" text-anchor="middle" font-weight="bold">Prover</text>
<text x="105" y="46" text-anchor="middle">knows y and x</text>
<rect x="450" y="10" width="170" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="29" text-anchor="middle" font-weight="bold">Verifier</text>
<text x="535" y="46" text-anchor="middle">knows only y</text>
<line x1="105" y1="54" x2="105" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="535" y1="54" x2="535" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="115" y="84">fresh randomness k</text>
<line x1="105" y1="110" x2="527" y2="110" stroke="currentColor" stroke-width="2"/>
<polygon points="535,110 525,105 525,115"/>
<text x="320" y="102" text-anchor="middle">1. commitment t (fixed before any challenge)</text>
<line x1="535" y1="160" x2="113" y2="160" stroke="currentColor" stroke-width="2"/>
<polygon points="105,160 115,155 115,165"/>
<text x="320" y="152" text-anchor="middle">2. random challenge c</text>
<line x1="105" y1="210" x2="527" y2="210" stroke="currentColor" stroke-width="2"/>
<polygon points="535,210 525,205 525,215"/>
<text x="320" y="202" text-anchor="middle">3. response s, from k, x and c</text>
<text x="525" y="250" text-anchor="end">accept if check(y, t, c, s) holds</text>
<text x="320" y="282" text-anchor="middle" opacity="0.8">right, left, right: the zigzag that gives the name Σ</text>
</svg>
<figcaption>Figure 6.2. The shape of every sigma protocol. Everything rests on the order: the prover is bound by t before it sees c.</figcaption>
</figure>

Why this shape, and not simply "the prover sends a proof"? Because the order
does the work. Think of a student who claims to know every answer in a
textbook. The teacher does not ask for the whole book recited. She asks one
question at random. A student who knows everything answers it; a bluffer who
prepared a few answers is caught unless the question happens to be one of
them. The commitment is the student sitting down before the question is read
out: a bluffer can prepare an answer to one question, but must decide which
before hearing the question, and the question is drawn from so many that the
guess almost never pays off. The response must be one the honest prover can
always give, and the commitment must hide the witness while still pinning the
prover down.

Three properties make this precise. They are stated here in words and proved
for Schnorr's protocol in §6.4:

- **Completeness.** If the prover knows a witness and both follow the
  protocol, the verifier always accepts.
- **Special soundness.** From any two accepting transcripts with the *same*
  commitment and *different* challenges, $(t, c, s)$ and $(t, c', s')$, a
  machine called the **extractor** can compute a witness. So a prover who
  could answer two challenges for one commitment must "know" the witness, in
  the strongest sense: it is sitting in its answers. A prover who does not
  know it can answer at most one challenge per commitment, and gets through
  only if the verifier happens to ask that one: with probability $1/q$ when the
  challenges are drawn from $q$ values.
- **Honest-verifier zero knowledge (HVZK).** There is a machine called the
  **simulator** that, given only the statement $y$, produces transcripts
  $(t, c, s)$ with exactly the same distribution as real conversations with an
  honest verifier. Whatever the verifier could learn from a real transcript, it
  could have learned from one it made itself, so it learns nothing.

[Chapter 5](05-Zero-Knowledge-Proofs.md) defined soundness and zero knowledge
for proofs in general, where the extractor and simulator may run the parties
many times and rewind them. Sigma protocols are the case where both machines
are almost embarrassingly simple: the extractor is one line of algebra, and the
simulator just writes the transcript in the wrong order. That simplicity is
the reason the shape spread. Each property can be checked by hand on a new
protocol, and §6.6 shows that sigma protocols snap together into bigger ones
without losing any of the three.

A note on words. The commitment here is not quite a commitment in the sense of
[Chapter 3](03-Commitments.md): it is an ordinary message, and its job is to
fix the prover's randomness before the challenge. In Schnorr's protocol it is
literally $g^k$, which is a hiding and binding commitment to $k$ in the
discrete-log setting. Different papers name the three messages
$(a, e, z)$, $(R, e, s)$ or $(t, c, s)$. This chapter uses $t$, $c$, $s$
throughout and keeps $k$ for the prover's fresh randomness, which in a
signature is called the nonce.

## 6.3 Schnorr identification by hand

*Level: beginner.*

The protocol needs a group in which discrete logarithms are hard and whose
order is a prime $q$. Book 1's [Chapter 14](../../book/14-Discrete-Log-Systems.md)
explains why a **Schnorr group**, a subgroup of prime order $q$ inside the
numbers mod a larger prime $p$, is the right home, and why $q$ must be prime
(§6.4 shows the extractor needs to divide by a difference of challenges mod
$q$). This chapter uses one small enough to compute by hand:

$$
p = 59, \qquad q = 29, \qquad g = 4 .
$$

Since $59 = 2 \cdot 29 + 1$, the squares mod 59 form a subgroup of 29
elements, and $4 = 2^2$ generates it: $4^{29} \equiv 1 \pmod{59}$, and no
smaller positive power of 4 is 1. Real systems use the same structure with a
256-bit $q$, almost always on an elliptic curve; nothing in the protocol
changes except the size of the numbers. In a group of 29 elements, a
cheater's chance of guessing a challenge is $1/29$; with a 256-bit $q$ it is
about $2^{-256}$.

Here is every power of $g$, which turns each hand computation in this chapter
into a lookup. (In a real group such a table is exactly what nobody can build:
reading it backwards is solving the discrete-log problem. The verifier in the
protocol never needs it.)

| $i$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| $4^i \bmod 59$ | 1 | 4 | 16 | 5 | 20 | 21 | 25 | 41 | 46 | 7 | 28 | 53 | 35 | 22 | 29 |

| $i$ | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| $4^i \bmod 59$ | 57 | 51 | 27 | 49 | 19 | 17 | 9 | 36 | 26 | 45 | 3 | 12 | 48 | 15 |

Exponents live mod 29, because $g^{29} = 1$: so $g^{55} = g^{55 - 29} = g^{26}$,
and multiplying two powers of $g$ adds their exponents.

### The protocol

The prover's secret is a number $x$ between 1 and $q - 1$; its public key is
$y = g^x \bmod p$.

1. **Commit.** Pick a fresh random $k$ in $[0, q)$, send $t = g^k \bmod p$.
2. **Challenge.** The verifier sends a random $c$ in $[0, q)$.
3. **Respond.** Send $s = k + c\,x \bmod q$.
4. **Check.** Accept if $g^s \equiv t \cdot y^c \pmod p$.

### By hand

The prover's secret is $x = 11$, so its public key is $y = 4^{11} \bmod 59 = 53$
(column 11 of the table).

<div class="mars-steps" markdown>

1. **Commit.** The prover picks $k = 7$ and sends $t = 4^7 \bmod 59 = 41$.
   From now on it cannot change $k$.
2. **Challenge.** The verifier picks $c = 5$ and sends it.
3. **Respond.** The prover computes $s = 7 + 5 \cdot 11 = 62 \equiv 4 \pmod{29}$
   and sends $s = 4$.
4. **Left side of the check.** $g^s = 4^4 \bmod 59 = 20$.
5. **Right side.** $y^c = 53^5$. Since $53 = 4^{11}$, this is
   $4^{55} = 4^{26} = 12$. Then $t \cdot y^c = 41 \cdot 12 = 492$, and
   $492 - 8 \cdot 59 = 20$.
6. Both sides are 20. The verifier accepts.

</div>

The verifier in step 5 did not need the table: it can compute $53^5 \bmod 59$
by repeated multiplication ($53^2 = 2809 \equiv 36$, $53^4 \equiv 36^2 = 1296
\equiv 57$, $53^5 \equiv 57 \cdot 53 = 3021 \equiv 12$). The table is for you,
to see that the exponents line up: the left side is $g^{7 + 55}$ and the right
side is $g^7 \cdot g^{55}$.

That is the whole reason the check works for an honest prover, and it is one
line of algebra:

$$
g^{s} = g^{k + c x} = g^{k} \cdot \left(g^{x}\right)^{c} = t \cdot y^{c}.
$$

(The exponent $k + cx$ is reduced mod $q$, which is allowed because
$g^q = 1$.)

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Schnorr identification worked by hand mod 59: commitment 41, challenge 5, response 4, both sides of the check equal 20" fill="currentColor" font-size="14">
<rect x="20" y="10" width="170" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="29" text-anchor="middle" font-weight="bold">Prover</text>
<text x="105" y="46" text-anchor="middle">secret x = 11</text>
<rect x="450" y="10" width="170" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="29" text-anchor="middle" font-weight="bold">Verifier</text>
<text x="535" y="46" text-anchor="middle">public key y = 53</text>
<line x1="105" y1="54" x2="105" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="535" y1="54" x2="535" y2="290" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="115" y="82" font-style="italic">picks k = 7</text>
<line x1="105" y1="110" x2="527" y2="110" stroke="currentColor" stroke-width="2"/>
<polygon points="535,110 525,105 525,115"/>
<text x="320" y="102" text-anchor="middle">t = 4⁷ mod 59 = 41</text>
<text x="525" y="140" text-anchor="end" font-style="italic">picks c = 5</text>
<line x1="535" y1="160" x2="113" y2="160" stroke="currentColor" stroke-width="2"/>
<polygon points="105,160 115,155 115,165"/>
<text x="320" y="152" text-anchor="middle">c = 5</text>
<line x1="105" y1="210" x2="527" y2="210" stroke="currentColor" stroke-width="2"/>
<polygon points="535,210 525,205 525,215"/>
<text x="320" y="202" text-anchor="middle">s = 7 + 5 · 11 mod 29 = 4</text>
<text x="525" y="245" text-anchor="end">4⁴ mod 59 = 20</text>
<text x="525" y="268" text-anchor="end">41 · 53⁵ = 41 · 12 mod 59 = 20  ✓</text>
</svg>
<figcaption>Figure 6.3. One run of Schnorr's protocol with the numbers of the text. The response 4 on its own says nothing about 11: for every possible secret there is a nonce that gives the same response.</figcaption>
</figure>

### What the verifier saw

The verifier saw $t = 41$, $c = 5$ and $s = 4$. Does $s = 4$ reveal anything
about $x$? For each of the 29 possible secrets $x'$ there is exactly one nonce
$k' = s - c\,x' \bmod 29$ that would have produced the response 4, and the
nonce was uniformly random. So the response alone is a uniformly random number
mod 29, whatever the secret. This is the same reason a one-time pad hides its
message: $k$ is used once, as a mask over $c\,x$. It is also why the nonce must
be fresh, secret and uniform, and §6.10 shows what happens when it is not.

### What a cheater can do

Suppose someone knows $y = 53$ but not $x$. It must send $t$ first. If it
somehow knew the challenge would be $c = 5$, it could pick any response, say
$s = 4$, and work backwards to the commitment that makes the check pass:
$t = g^s \cdot y^{-c}$. That gives $t = 20 \cdot 12^{-1} \bmod 59 = 41$, our
commitment again. But it has to send $t$ before learning $c$, so it is
betting: it wins if the verifier picks the one challenge it prepared for, which
happens 1 time in 29. Repeating the protocol $n$ times with fresh commitments
cuts that to $29^{-n}$. In a real group one run is enough.

Can it do better by preparing for two challenges at once? That would mean
having $s$ and $s'$ that both pass for the same $t$ with $c \ne c'$. §6.4 shows
that from such a pair anyone can compute $x$. So "able to answer two
challenges" and "knows $x$" are the same thing, and that is the soundness of
the protocol.

### Code it

The program runs a thousand honest rounds and a thousand rounds by a cheater
who bets on the challenge, then counts how often the cheater survives three
rounds in a row. The module `random` is used so the output can be quoted
exactly; real keys and nonces come from `secrets`. The `pow(y, -guess, p)` form
for a modular inverse needs Python 3.8.

```python
import random
random.seed(6)                      # random is for the demo; real keys use secrets

p, q, g = 59, 29, 4                 # g has prime order q = 29 mod p = 59 (real: 256-bit)

x = 11                              # the prover's secret
y = pow(g, x, p)                    # the public key, 53

def honest_round():
    k = random.randrange(q)         # 1. commit to a fresh nonce
    t = pow(g, k, p)
    c = random.randrange(q)         # 2. the verifier's challenge
    s = (k + c * x) % q             # 3. the response
    return pow(g, s, p) == t * pow(y, c, p) % p

def cheating_round():               # does not know x: bets on the challenge
    guess, s = random.randrange(q), random.randrange(q)
    t = pow(g, s, p) * pow(y, -guess, p) % p    # fits only if c == guess
    c = random.randrange(q)
    return pow(g, s, p) == t * pow(y, c, p) % p

print("honest prover accepted:", sum(honest_round() for _ in range(1000)), "of 1000")
print("cheater accepted:      ", sum(cheating_round() for _ in range(1000)), "of 1000")
print("cheater passes 3 rounds in a row:",
      sum(all(cheating_round() for _ in range(3)) for _ in range(100000)), "of 100000")
```

Output:

```
honest prover accepted: 1000 of 1000
cheater accepted:       36 of 1000
cheater passes 3 rounds in a row: 7 of 100000
```

The expected numbers are $1000/29 \approx 34$ and $100000/29^3 \approx 4$; the
counts are close, as random counts should be.

### Schnorr's design choices

Schnorr's 1989 paper, "Efficient Identification and Signatures for Smart
Cards" (CRYPTO 1989, with a journal version in 1991), was about speed on a
weak device. Three choices made it fast. The prover's expensive step, the
exponentiation $g^k$, does not depend on the challenge, so the card can compute
commitments in advance, while idle, and store them. The response is a single
multiplication and addition mod $q$, cheap even for an 8-bit chip. And working
in a subgroup of prime order $q$, much smaller than $p$, makes exponents and
responses short: 140 to 160 bits then, against 512 or more for $p$. The
verifier's check costs two exponentiations, but the verifier was a terminal,
not a card.

Schnorr's own notation differs from this chapter's: he published $v = g^{-x}$
as the key and had the card send $y = k + x c$, checked as $g^y v^c = t$. Every
textbook since has reshuffled the signs. The structure is identical.

!!! note "Life story: Schnorr identification"
    **Born:** 1989, Claus-Peter Schnorr, Goethe University Frankfurt
    (CRYPTO 1989; *Journal of Cryptology*, 1991) · **Purpose:** let a smart
    card prove it knows a discrete log, with almost all the card's work done
    before the conversation starts · **Helped:** became the model sigma
    protocol and, through Fiat-Shamir, the Schnorr signature, EdDSA and
    BIP 340; its key-proof form is specified in RFC 8235 (2017) and is used
    in key generation for threshold signing · **Status:** current; the
    standard first example of a proof of knowledge

## 6.4 Why it works: three properties, coded

*Level: intermediate.*

This section proves the three properties for Schnorr's protocol, codes the
extractor and the simulator, and then says carefully what the properties do and
do not promise.

### Completeness

Shown in §6.3: $g^{k + cx} = g^k (g^x)^c$. An honest prover always passes.

### Special soundness and the extractor

Suppose a prover, honest or not, has produced two accepting transcripts with
the same commitment $t$ and different challenges $c \ne c'$:

$$
g^{s} = t\,y^{c}, \qquad g^{s'} = t\,y^{c'} .
$$

Divide the first equation by the second. The unknown $t$ cancels:

$$
g^{s - s'} = y^{c - c'} .
$$

Since $c \ne c'$ and $q$ is prime, $c - c'$ has an inverse mod $q$. Raise both
sides to that inverse:

$$
y = g^{(s - s')(c - c')^{-1}}, \qquad\text{so}\qquad
x = (s - s')\,(c - c')^{-1} \bmod q .
$$

That formula is the **extractor**. It needs no secret at all, only the two
transcripts. It is also the reason $q$ must be prime: in a group of composite
order, $c - c'$ might share a factor with the order and have no inverse, and
the formula would give only partial information.

**By hand.** Take the prover of §6.3, with $k = 7$ and $t = 41$. With challenge
$c = 5$ it answered $s = 4$. Rewind it to just after it sent $t$ and ask
$c' = 12$ instead. It answers $s' = 7 + 12 \cdot 11 = 139 \equiv 23 \pmod{29}$.
Now:

$$
x = \frac{4 - 23}{5 - 12} = \frac{-19}{-7} = \frac{19}{7} \pmod{29}.
$$

The inverse of 7 mod 29 is 25, since $7 \cdot 25 = 175 = 6 \cdot 29 + 1$. So
$x = 19 \cdot 25 = 475 = 16 \cdot 29 + 11 \equiv 11$. The secret.

"Rewind" is the word that makes this a proof about *knowledge*. Think of the
prover as a program. A program that convinces the verifier with good
probability can be run, stopped after it sends $t$, and restarted from that
point with a different challenge, as many times as needed. If it succeeds often
enough, two successes with the same $t$ appear quickly, and the extractor turns
them into $x$. So anything that convinces the verifier more often than the
$1/q$ guessing rate can be turned, by running it twice, into something that
outputs $x$. That is the formal meaning of "the prover knows $x$", and the
probability $1/q$ is called the **knowledge error**. The result that turns
"succeeds with probability $\varepsilon$" into "two successes with the same
$t$ after about $2/\varepsilon$ runs" is a short counting argument (Bellare and
Goldreich, 1992, made it precise); [Chapter 5](05-Zero-Knowledge-Proofs.md)
has the general definition.

### Honest-verifier zero knowledge and the simulator

The simulator is given only $y$. It cannot compute a real response, because
that needs $x$. Instead it writes the transcript backwards:

1. pick the challenge $c$ uniformly in $[0, q)$;
2. pick the response $s$ uniformly in $[0, q)$;
3. set the commitment to whatever makes the check pass:
   $t = g^{s} \cdot y^{-c}$.

The result passes the check by construction. The claim is stronger: it has
exactly the same distribution as a real transcript with an honest verifier. In a
real run, $c$ is uniform (the honest verifier chooses it so), and for each $c$
the nonce $k$ is uniform, so $s = k + cx$ is uniform and independent of $c$;
then $t$ is determined by $(c, s)$ through the check. In a simulated run, $c$
and $s$ are uniform and independent by construction, and again $t$ is
determined by them. Two procedures that produce the same uniform pair
$(c, s)$ and the same function of it produce identical distributions.

**By hand.** The simulator picks $c = 9$ and $s = 15$. It needs
$t = g^{15} \cdot y^{-9}$. In exponents: $y^{-9} = g^{-99}$, and
$-99 \equiv -99 + 4 \cdot 29 = 17 \pmod{29}$, so $t = g^{15 + 17} = g^{32} =
g^{3} = 5$. Check: $g^{15} = 57$ from the table, and
$t \cdot y^{9} = 5 \cdot g^{99} = 5 \cdot g^{12} = 5 \cdot 35 = 175 \equiv 57$.
The triple $(5, 9, 15)$ is an accepting transcript, made by someone who never
knew $x$. (The simulator here used the table to get $t$; a simulator in a real
group computes $g^{15} \cdot y^{-9}$ directly by exponentiation and inversion,
which needs no discrete logs.)

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Two columns: a real prover computes k, t, then receives c, then computes s; the simulator picks c and s first, then computes t; both give the same distribution of transcripts" fill="currentColor" font-size="14">
<text x="160" y="24" text-anchor="middle" font-weight="bold">Real prover (knows x)</text>
<text x="480" y="24" text-anchor="middle" font-weight="bold">Simulator (only y)</text>
<rect x="60" y="40" width="200" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="65" text-anchor="middle">1. k random, t = gᵏ</text>
<rect x="60" y="120" width="200" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="145" text-anchor="middle">2. c from the verifier</text>
<rect x="60" y="200" width="200" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="225" text-anchor="middle">3. s = k + c·x mod q</text>
<line x1="160" y1="80" x2="160" y2="112" stroke="currentColor" stroke-width="1.6"/>
<polygon points="160,120 155,110 165,110"/>
<line x1="160" y1="160" x2="160" y2="192" stroke="currentColor" stroke-width="1.6"/>
<polygon points="160,200 155,190 165,190"/>
<rect x="380" y="40" width="200" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="65" text-anchor="middle">1. c random</text>
<rect x="380" y="120" width="200" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="145" text-anchor="middle">2. s random</text>
<rect x="380" y="200" width="200" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="225" text-anchor="middle">3. t = gˢ · y⁻ᶜ</text>
<line x1="480" y1="80" x2="480" y2="112" stroke="currentColor" stroke-width="1.6"/>
<polygon points="480,120 475,110 485,110"/>
<line x1="480" y1="160" x2="480" y2="192" stroke="currentColor" stroke-width="1.6"/>
<polygon points="480,200 475,190 485,190"/>
<text x="320" y="278" text-anchor="middle">both give (t, c, s) with c, s uniform and t fixed by the check:</text>
<text x="320" y="300" text-anchor="middle" font-weight="bold">the same 841 transcripts, each equally likely</text>
</svg>
<figcaption>Figure 6.4. Forwards and backwards. The real prover needs x because it must answer a challenge that arrives after its commitment; the simulator avoids that by choosing the challenge itself. Only someone who saw the order of events can tell the two apart.</figcaption>
</figure>

### Code it: the extractor and the simulator

In a group of 29 elements we can do better than argue: we can list every real
transcript (all 29 nonces times all 29 challenges) and every simulated one (all
29 challenges times all 29 responses) and compare the two lists.

```python
from collections import Counter

p, q, g = 59, 29, 4
x = 11
y = pow(g, x, p)

def accepts(t, c, s):
    return pow(g, s, p) == t * pow(y, c, p) % p

def extract(t1, c1, s1, t2, c2, s2):
    """Two accepting transcripts with the same commitment give the secret."""
    assert t1 == t2 and c1 != c2 and accepts(t1, c1, s1) and accepts(t2, c2, s2)
    return (s1 - s2) * pow(c1 - c2, -1, q) % q

def simulate(c, s):
    """A transcript made without x: challenge and response first, commitment last."""
    return pow(g, s, p) * pow(y, -c, p) % p, c, s

# The worked example: nonce 7, challenges 5 and 12.
k = 7
t = pow(g, k, p)
print("transcripts:", (t, 5, (k + 5 * x) % q), (t, 12, (k + 12 * x) % q))
print("extracted secret:", extract(t, 5, (k + 5 * x) % q, t, 12, (k + 12 * x) % q))

print("simulated:", simulate(9, 15), "accepted:", accepts(*simulate(9, 15)))

# Every real transcript (all nonces k, all challenges c) against every simulated
# one (all challenges c, all responses s): the same 841 triples, each once.
real = Counter((pow(g, k, p), c, (k + c * x) % q) for k in range(q) for c in range(q))
fake = Counter(simulate(c, s) for c in range(q) for s in range(q))
print("distinct real:", len(real), " distinct simulated:", len(fake), " identical:", real == fake)
```

Output:

```
transcripts: (41, 5, 4) (41, 12, 23)
extracted secret: 11
simulated: (5, 9, 15) accepted: True
distinct real: 841  distinct simulated: 841  identical: True
```

The last line is the zero-knowledge property in its purest form: the set of
conversations the honest prover can have is the set of all $29 \cdot 29 = 841$
accepting triples, each with probability $1/841$, and the simulator produces
exactly that set with exactly those probabilities. A verifier holding a
transcript holds a uniformly random accepting triple, which it could have drawn
itself.

### What the properties do not promise

Three limits matter in practice.

**Honest verifier only.** The simulator works because it picks $c$ uniformly,
which is what an honest verifier does. A dishonest verifier might choose $c$
as some clever function of $t$, for instance a hash of it. Then the simulator,
which needs to know $c$ before it can make $t$, cannot simply pick $c$ first.
With a small challenge set it can still guess $c$, make $t$, and start again if
the verifier's actual choice differs; for challenges from $\{0, 1\}$ this
"guess and rewind" simulator succeeds half the time and gives full zero
knowledge, at the cost of running the protocol many times to get soundness.
With challenges from a set of $2^{256}$ values the guess never lands, and
nobody knows how to prove Schnorr's protocol zero-knowledge against an
arbitrary verifier. Nobody knows an attack either: it is not known to leak
anything useful. The standard fixes are to let the verifier commit to its
challenge first (a five-move protocol) or, much more often, to remove the
verifier entirely with Fiat-Shamir (§6.8), where the challenge comes from a
hash and the question disappears into the random-oracle model.

**Witness hiding, not only zero knowledge.** For most uses the property that
matters is weaker and easier: after any number of runs, even with a dishonest
verifier, the verifier cannot compute $x$. Feige and Shamir (1990) called this
**witness hiding**, and showed it follows from a third property,
**witness indistinguishability**: when a statement has several witnesses, the
transcripts do not reveal which one the prover used. Schnorr's statement has
only one witness, so the property is trivial there; Okamoto's protocol (§6.5)
and the OR-proofs of §6.6 were designed so that it is not, and they get
security against dishonest verifiers that way.

**Soundness against an online cheater, not against theft.** Special soundness
says a prover without $x$ fails. It says nothing about a prover who stole $x$,
or who learned it because the honest prover reused a nonce (§6.10), or about a
man in the middle who relays a real prover's messages to another verifier in
real time. Relaying is a real attack on identification protocols; distance
bounding and binding the proof to a session (the context in the Fiat-Shamir
hash, §6.9) are the defenses.

## 6.5 Equal discrete logs: Chaum-Pedersen, and several secrets: Okamoto

*Level: intermediate.*

Schnorr's protocol proves "I know the discrete log of $y$". Many protocols need
a statement about two group elements at once: "the discrete log of $X$ to base
$g$ equals the discrete log of $Y$ to base $h$", without revealing the common
value. Written as a formula,

$$
\log_g X = \log_h Y, \qquad\text{that is, there is an } x \text{ with } X = g^x \text{ and } Y = h^x .
$$

Where does that come up? Everywhere a party must show it used the same secret
in two places.

- **Diffie-Hellman tuples.** A tuple $(g, A, B, C)$ is a DH tuple if
  $A = g^a$, $B = g^b$ and $C = g^{ab}$. Whoever knows $a$ can prove it is one
  without revealing $a$: it is the statement $\log_g A = \log_B C$. Deciding
  this without help is the decisional Diffie-Hellman problem, believed hard; the
  proof makes it easy for one party to convince everyone.
- **Verifiable decryption.** An ElGamal ciphertext is $(A, B) = (g^r, m \cdot
  X^r)$ for a key $X = g^x$. The key holder decrypts by computing $D = A^x$ and
  $m = B / D$. To prove it decrypted honestly without giving away $x$, it
  proves $\log_g X = \log_A D$. This is how the trustees of a verifiable
  election show that the announced tally is the true decryption
  ([Chapter 16](16-Electronic-Voting.md)), and how each share of a threshold
  decryption is checked ([Chapter 4](04-Threshold-Cryptography.md)).
- **Verifiable random functions and oblivious PRFs.** The elliptic-curve VRF
  of RFC 9381 outputs $\Gamma = H(m)^x$ and attaches exactly this proof that
  $\Gamma$ used the same $x$ as the public key; the verifiable OPRF of RFC 9497,
  behind Privacy Pass tokens, does the same for its blinded evaluations
  ([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)).

### The protocol

David Chaum and Torben Pryds Pedersen published it at CRYPTO 1992 in "Wallet
Databases with Observers", a design for electronic cash in which the bank
places a small tamper-resistant chip, the observer, inside each customer's
wallet. It is Schnorr's protocol run twice with the same nonce and the same
challenge:

1. **Commit.** Pick a random $w$; send $a = g^w$ and $b = h^w$.
2. **Challenge.** The verifier sends a random $c$.
3. **Respond.** Send $z = w + c\,x \bmod q$.
4. **Check.** Accept if $g^z = a \cdot X^c$ and $h^z = b \cdot Y^c$.

Completeness is the Schnorr computation twice. The interesting part is that a
single response $z$ must satisfy both equations, and a single $z$ can only do
that if the two exponents are the same.

### By hand

Take a second generator $h = 9$. In the table of §6.3, $9 = g^{21}$, but in
real use nobody may know that relation: $h$ is derived by hashing so that its
discrete log to base $g$ is unknown. Let the secret be $x = 11$ again.

<div class="mars-steps" markdown>

1. **Statement.** $X = 4^{11} = 53$ and $Y = 9^{11} \bmod 59$. In exponents,
   $9^{11} = g^{21 \cdot 11} = g^{231}$, and $231 = 7 \cdot 29 + 28$, so
   $Y = g^{28} = 15$.
2. **Commit.** The prover picks $w = 6$: $a = 4^6 = 25$ and
   $b = 9^6 = g^{126} = g^{10} = 28$.
3. **Challenge.** The verifier sends $c = 7$.
4. **Respond.** $z = 6 + 7 \cdot 11 = 83 \equiv 25 \pmod{29}$.
5. **First check.** $g^{25} = 3$, and $a \cdot X^7 = 25 \cdot g^{77} = 25 \cdot
   g^{19} = 25 \cdot 19 = 475 \equiv 3$. Passes.
6. **Second check.** $h^{25} = g^{525} = g^{3} = 5$, and $b \cdot Y^7 = 28 \cdot
   g^{196} = 28 \cdot g^{22} = 28 \cdot 36 = 1008 \equiv 5$. Passes.

</div>

Now suppose someone claims a different $Y$, say $Y = 16$, which is
$g^{2}$, not $h^{11}$. The first check does not involve $Y$ and still
passes, but the second becomes $b \cdot 16^7 = 28 \cdot g^{14} = 28 \cdot 29 =
812 \equiv 45$, not 5. The proof fails.

### Why it is sound and zero knowledge

**Special soundness.** Two accepting transcripts $(a, b, c, z)$ and
$(a, b, c', z')$ with the same commitments give, from the first equation,
$X = g^{(z - z')/(c - c')}$ and, from the second, $Y = h^{(z - z')/(c - c')}$.
The same number $x = (z - z')/(c - c') \bmod q$ is the log in both. So the
extractor outputs a common logarithm, and in particular one exists: the
statement is true. Note what this proves. Schnorr's statement "$y$ has a
discrete log" is always true in a cyclic group, so its proof is only about
knowledge. The Chaum-Pedersen statement can be false (most pairs $(X, Y)$ have
different logs), so the proof is also a proof that a fact holds, which is what
verifiable decryption needs.

**HVZK.** Pick $c$ and $z$ at random, then set $a = g^z X^{-c}$ and
$b = h^z Y^{-c}$. As for Schnorr, these simulated transcripts have the real
distribution.

**What the verifier must check first.** All of these arguments assume $X$,
$Y$ and $h$ are elements of the prime-order group. If an attacker can pass
in a $Y$ outside it, for instance a number mod $p$ of order 2, the algebra of
the extractor no longer applies. Real verifiers check group membership: on
the mod-$p$ group, $Y^q = 1$; on an elliptic curve, that the point is on the
curve and in the right subgroup.

### Code it: Chaum-Pedersen and an honest decryption

```python
import random
random.seed(3)                      # random is for the demo; real keys use secrets

p, q, g = 59, 29, 4

def cp_prove(x, h, w, c):           # one run, with the verifier's challenge c passed in
    return pow(g, w, p), pow(h, w, p), (w + c * x) % q

def cp_check(h, X, Y, a, b, c, z):  # is log_g X = log_h Y ?
    return pow(g, z, p) == a * pow(X, c, p) % p and pow(h, z, p) == b * pow(Y, c, p) % p

# The worked example: x = 11, h = 9, nonce w = 6, challenge c = 7.
h, x = 9, 11
X, Y = pow(g, x, p), pow(h, x, p)
a, b, z = cp_prove(x, h, 6, 7)
print("X, Y =", X, Y, " a, b, z =", a, b, z, " accepted:", cp_check(h, X, Y, a, b, 7, z))
print("same proof for a wrong Y = 16:", cp_check(h, X, 16, a, b, 7, z))

# Verifiable decryption. The trustee's key is x, published as X = g^x.
m = 26                              # a message, encoded as a group element
r = random.randrange(1, q)
A, B = pow(g, r, p), m * pow(X, r, p) % p        # ElGamal ciphertext
D = pow(A, x, p)                                 # the trustee's decryption factor
w, c = random.randrange(q), random.randrange(q)  # nonce; the verifier's challenge
a, b, z = cp_prove(x, A, w, c)                   # proves log_g X = log_A D
print("ciphertext", (A, B), " announced plaintext", B * pow(D, -1, p) % p,
      " proof accepted:", cp_check(A, X, D, a, b, c, z))
lie = B                                          # a factor that would "decrypt" to 1
print("lying trustee, plaintext", B * pow(lie, -1, p) % p, " proof accepted:", cp_check(A, X, lie, a, b, c, z))
```

Output:

```
X, Y = 53 15  a, b, z = 25 28 25  accepted: True
same proof for a wrong Y = 16: False
ciphertext (46, 45)  announced plaintext 26  proof accepted: True
lying trustee, plaintext 1  proof accepted: False
```

The lying trustee here reused the honest proof, which of course fails. A
cleverer liar would build a fresh proof for its false $D$. In this interactive
protocol it cannot: the extractor argument says that any proof that passes for
two challenges proves a true statement. Hold on to that sentence, because
§6.9 shows a non-interactive version where the liar wins, and the only
difference is what went into a hash.

!!! note "Life story: the Chaum-Pedersen proof"
    **Born:** 1992, David Chaum and Torben Pryds Pedersen, "Wallet Databases
    with Observers" (CRYPTO 1992), for electronic cash with a bank chip inside
    the customer's wallet · **Purpose:** prove that two discrete logs are equal
    without revealing them · **Helped:** verifiable ElGamal decryption in
    Helios, ElectionGuard and other verifiable elections; threshold decryption
    shares; the proofs inside the ECVRF of RFC 9381 and the verifiable OPRF of
    RFC 9497 (Privacy Pass) · **Status:** current; often called a DLEQ proof

### Several secrets at once: Okamoto

Tatsuaki Okamoto, at NTT, published a variant at the same conference in 1992.
His public key is a product of two powers,

$$
C = g^{m} h^{r},
$$

and the prover shows it knows a pair $(m, r)$ that **represents** $C$ in the
bases $g$ and $h$. Readers of [Chapter 3](03-Commitments.md) will recognize a
Pedersen commitment to $m$ with randomness $r$: Okamoto's protocol is a proof
that you can open a commitment, without opening it.

1. **Commit.** Pick random $k_1, k_2$; send $t = g^{k_1} h^{k_2}$.
2. **Challenge.** Random $c$.
3. **Respond.** $s_1 = k_1 + c\,m$ and $s_2 = k_2 + c\,r$, both mod $q$.
4. **Check.** $g^{s_1} h^{s_2} = t \cdot C^{c}$.

**By hand,** with $g = 4$, $h = 9 = g^{21}$, $m = 20$, $r = 13$:
$C = g^{20 + 21 \cdot 13} = g^{293} = g^{3} = 5$. The prover picks $k_1 = 3$,
$k_2 = 17$, so $t = g^{3 + 21 \cdot 17} = g^{360} = g^{12} = 35$. The
challenge is $c = 4$. The responses are $s_1 = 3 + 80 = 83 \equiv 25$ and
$s_2 = 17 + 52 = 69 \equiv 11$. Check: $g^{25} h^{11} = g^{25 + 231} = g^{256}
= g^{24} = 45$, and $t \cdot C^4 = g^{12} \cdot g^{12} = g^{24} = 45$. Passes.

```python
p, q, g, h = 59, 29, 4, 9           # in real use nobody may know log_g h

m, r = 20, 13                       # the opening of a Pedersen commitment
C = pow(g, m, p) * pow(h, r, p) % p

def respond(k1, k2, c):             # nonces k1, k2; challenge c
    return (k1 + c * m) % q, (k2 + c * r) % q

def accepts(t, c, s1, s2):
    return pow(g, s1, p) * pow(h, s2, p) % p == t * pow(C, c, p) % p

k1, k2 = 3, 17
t = pow(g, k1, p) * pow(h, k2, p) % p
for c in (4, 22):
    s1, s2 = respond(k1, k2, c)
    print("C =", C, " t =", t, " c =", c, " s =", (s1, s2), " accepted:", accepts(t, c, s1, s2))

# Two challenges, same t: the extractor gets both halves of the opening.
(a1, a2), (b1, b2) = respond(k1, k2, 4), respond(k1, k2, 22)
inv = pow(4 - 22, -1, q)
print("extracted m, r =", (a1 - b1) * inv % q, (a2 - b2) * inv % q)
```

Output:

```
C = 5  t = 35  c = 4  s = (25, 11)  accepted: True
C = 5  t = 35  c = 22  s = (8, 13)  accepted: True
extracted m, r = 20 13
```

Why did Okamoto want two secrets when one works? Because $C$ has 29
different representations here (one for every $m$, with the matching $r$),
and $2^{256}$ in a real group, and the protocol is witness indistinguishable:
the transcripts look the same whichever representation the prover holds. That
let Okamoto prove his scheme secure against impersonation even by an attacker
who first plays verifier to the real prover as often as it likes, assuming
only that discrete logs are hard. For Schnorr's protocol the same guarantee
was proved only in 2002, by Mihir Bellare and Adriana Palacio, and only under
a stronger assumption (the "one-more discrete log" problem). In practice
Schnorr won on cost, and Okamoto's idea lives on in proofs about Pedersen
commitments, in anonymous credentials, where a user proves facts about
several hidden attributes at once
([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)), and in the
general recipe of §6.12.

## 6.6 AND and OR

*Level: intermediate.*

Sigma protocols compose. Given proofs for two statements, you can build a proof
for "both" and, less obviously, a proof for "at least one, and I won't say
which". The second is the most useful trick in the chapter.

### AND: one challenge for both

To prove knowledge of $x_1$ with $y_1 = g^{x_1}$ **and** $x_2$ with
$y_2 = g^{x_2}$, run the two Schnorr protocols side by side with one challenge:
send $t_1, t_2$; receive $c$; send $s_1 = k_1 + c x_1$ and
$s_2 = k_2 + c x_2$. Two transcripts with the same $(t_1, t_2)$ and different
challenges give both secrets, and the simulator makes both branches with the
same $c$. Chaum-Pedersen is an AND in disguise: two Schnorr proofs that share
the witness and therefore also the nonce and the response. Running two
protocols with *independent* challenges would also be sound, but sharing the
challenge is what makes the result a single sigma protocol that can be
composed again.

### OR: the prover picks the challenges, with one constraint

The question that Ronald Cramer, Ivan Damgård and Berry Schoenmakers answered
in "Proofs of Partial Knowledge and Simplified Design of Witness Hiding
Protocols" (CRYPTO 1994) is this: the prover knows $x_1$ for $y_1$, or $x_2$
for $y_2$, but not both; how can it prove it knows one without saying which?

The simulator already gives half the answer. Without $x_2$ the prover cannot
answer a challenge for $y_2$ that it did not choose, but it can produce an
accepting transcript for $y_2$ for any challenge it picks in advance. The
trick is to let the prover choose the two branch challenges $c_1$ and $c_2$
itself, under one rule the verifier enforces: they must add up to the
verifier's challenge, $c_1 + c_2 \equiv c \pmod q$. The prover fixes the
challenge of the branch it cannot do before it commits, and puts the rest on
the branch it can.

For a prover who knows $x_1$:

1. **Commit.** Simulate branch 2: pick $c_2$ and $s_2$ at random and set
   $t_2 = g^{s_2} y_2^{-c_2}$. Run branch 1 honestly: pick $k_1$ and set
   $t_1 = g^{k_1}$. Send $(t_1, t_2)$.
2. **Challenge.** The verifier sends $c$.
3. **Respond.** Set $c_1 = c - c_2 \bmod q$ and $s_1 = k_1 + c_1 x_1$. Send
   $(c_1, c_2, s_1, s_2)$.
4. **Check.** $c_1 + c_2 \equiv c$, and $g^{s_1} = t_1 y_1^{c_1}$, and
   $g^{s_2} = t_2 y_2^{c_2}$.

A prover who knows only $x_2$ does the mirror image. The verifier sees the same
kind of message either way.

### By hand

Let $y_1 = 53$ (the prover knows $x_1 = 11$) and $y_2 = 7$, whose log the prover
does not know. (From the table, $7 = g^9$; the prover is not allowed to look.)

<div class="mars-steps" markdown>

1. **Fake branch 2.** The prover picks $c_2 = 10$ and $s_2 = 17$, and computes
   $t_2 = g^{17} \cdot 7^{-10}$. In exponents that is
   $g^{17 - 90} = g^{-73} = g^{14} = 29$. (A real prover computes
   $7^{-10} \bmod 59$ directly; it needs no logs.)
2. **Real branch 1.** It picks $k_1 = 8$: $t_1 = g^8 = 46$. It sends
   $(t_1, t_2) = (46, 29)$.
3. **Challenge.** The verifier sends $c = 21$.
4. **Respond.** $c_1 = 21 - 10 = 11$ and $s_1 = 8 + 11 \cdot 11 = 129 \equiv 13$.
   The prover sends $(c_1, c_2, s_1, s_2) = (11, 10, 13, 17)$.
5. **Check the split.** $11 + 10 = 21 = c$.
6. **Check branch 1.** $g^{13} = 22$; $t_1 \cdot y_1^{11} = 46 \cdot g^{121} =
   46 \cdot g^{5} = 46 \cdot 21 = 966 \equiv 22$.
7. **Check branch 2.** $g^{17} = 27$; $t_2 \cdot y_2^{10} = 29 \cdot g^{90} =
   29 \cdot g^{3} = 29 \cdot 5 = 145 \equiv 27$.

</div>

Both branches pass, the challenges add up, and nothing in
$(46, 29; 21; 11, 10, 13, 17)$ says which branch was real.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="OR-proof by hand: branch 1 is run honestly, branch 2 is simulated with its challenge chosen first; the verifier's challenge 21 is split as 11 plus 10" fill="currentColor" font-size="14">
<rect x="20" y="10" width="200" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="29" text-anchor="middle" font-weight="bold">Prover</text>
<text x="120" y="46" text-anchor="middle">knows x₁ = 11, not x₂</text>
<rect x="440" y="10" width="180" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="29" text-anchor="middle" font-weight="bold">Verifier</text>
<text x="530" y="46" text-anchor="middle">y₁ = 53, y₂ = 7</text>
<line x1="120" y1="54" x2="120" y2="350" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="530" y1="54" x2="530" y2="350" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="20" y="82">branch 2 (fake): c₂ = 10, s₂ = 17 first,</text>
<text x="20" y="100">  t₂ = g¹⁷ · 7⁻¹⁰ = 29</text>
<text x="20" y="122">branch 1 (real): k₁ = 8, t₁ = g⁸ = 46</text>
<line x1="120" y1="150" x2="522" y2="150" stroke="currentColor" stroke-width="2"/>
<polygon points="530,150 520,145 520,155"/>
<text x="325" y="142" text-anchor="middle">t₁ = 46, t₂ = 29</text>
<line x1="530" y1="195" x2="128" y2="195" stroke="currentColor" stroke-width="2"/>
<polygon points="120,195 130,190 130,200"/>
<text x="325" y="187" text-anchor="middle">c = 21</text>
<text x="20" y="225">c₁ = 21 − 10 = 11, s₁ = 8 + 11·11 mod 29 = 13</text>
<line x1="120" y1="255" x2="522" y2="255" stroke="currentColor" stroke-width="2"/>
<polygon points="530,255 520,250 520,260"/>
<text x="325" y="247" text-anchor="middle">c₁ = 11, c₂ = 10, s₁ = 13, s₂ = 17</text>
<text x="620" y="285" text-anchor="end">11 + 10 = 21 ✓</text>
<text x="620" y="307" text-anchor="end">g¹³ = 22 = 46 · 53¹¹ ✓</text>
<text x="620" y="329" text-anchor="end">g¹⁷ = 27 = 29 · 7¹⁰ ✓</text>
</svg>
<figcaption>Figure 6.5. A proof of "x₁ or x₂" with the numbers of the text. The prover chooses one branch's challenge before committing and lets the verifier's challenge decide the other. A cheater who knows neither secret would have to fix both branch challenges in advance, and their sum would then have to hit c by luck.</figcaption>
</figure>

### Why it works

**Special soundness.** Take two accepting transcripts with the same
$(t_1, t_2)$ and different verifier challenges $c \ne c'$. Since
$c_1 + c_2 = c$ and $c_1' + c_2' = c'$, the pairs $(c_1, c_2)$ and
$(c_1', c_2')$ cannot be equal. So in at least one branch the two challenges
differ, and Schnorr's extractor on that branch gives its secret. A prover who
convinces the verifier therefore knows $x_1$ or $x_2$, which is the statement.
A prover who knows neither must fix both $c_1$ and $c_2$ before it sees $c$,
and passes only if $c_1 + c_2$ happens to equal $c$: probability $1/q$.

**HVZK.** The simulator fakes both branches: it picks $c_1, c_2, s_1, s_2$ at
random, computes both commitments backwards, and declares the verifier's
challenge to be $c_1 + c_2$.

**Witness indistinguishability.** In a real proof by someone who knows $x_1$,
the values $c_2$, $s_2$ and $k_1$ are uniform, so $c_1 = c - c_2$ and
$s_1$ are uniform too, and the commitments are fixed by the checks. A prover
who knows $x_2$ produces the same distribution with the roles swapped. The
verifier, even a dishonest one choosing $c$ as it likes, cannot tell which
witness was used: the distribution of $(c_1, c_2, s_1, s_2)$ given its $c$ is
the same either way. This is the property Cramer, Damgård and Schoenmakers
were after, as the title of their paper says, and it is what makes OR-proofs
useful for privacy: they are anonymous among the branches.

**More branches.** For "one of $n$", the prover fakes $n - 1$ branches and
requires $c_1 + \dots + c_n = c$. For "at least $k$ of $n$", the 1994 paper
replaces the sum with secret sharing ([Chapter 2](02-Secret-Sharing.md)): the
branch challenges must be shares of $c$ under a threshold scheme in which any
$n - k$ shares, plus the secret $c$, determine the rest; the prover fakes the
$n - k$ branches it cannot do and gets the other $k$ challenges from the shares.
The cost grows linearly with $n$, which matters for big sets
(§6.7 and [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)'s ring
signatures).

### Code it: a vote that is 0 or 1

The OR-proof's most important job is in voting
([Chapter 16](16-Electronic-Voting.md)). Votes are encrypted with **exponential
ElGamal**, which puts the vote $v$ in the exponent: $(A, B) = (g^r,
g^v X^r)$. Multiplying ciphertexts adds the votes inside them, so the
trustees can decrypt only the total. The danger is a voter who encrypts
$v = 5$, or $v = -3$, which the sum would silently absorb. Each ballot must
carry a proof that $v \in \{0, 1\}$, without revealing which.

Each case is a Chaum-Pedersen statement. The ciphertext encrypts 0 exactly
when $\log_g A = \log_X B$ (both are $r$), and it encrypts 1 exactly when
$\log_g A = \log_X (B/g)$. So the proof is an OR of two Chaum-Pedersen proofs,
with the true branch run honestly and the other simulated, exactly as above.
A cheater who encrypts 2 can only fake both branches, and wins only if its
two pre-chosen challenges happen to sum to the verifier's.

```python
import random
random.seed(3)                      # random is for the demo; real keys use secrets

p, q, g = 59, 29, 4
X = pow(g, 11, p)                   # the election key (its secret, 11, is not used below)

def encrypt(v, r):                  # exponential ElGamal: the vote v sits in the exponent
    return pow(g, r, p), pow(g, v, p) * pow(X, r, p) % p

def branch_ok(A, B, j, a, b, c, z):  # Chaum-Pedersen: log_g A = log_X (B / g^j)
    Bj = B * pow(g, -j, p) % p
    return pow(g, z, p) == a * pow(A, c, p) % p and pow(X, z, p) == b * pow(Bj, c, p) % p

def commit(A, B, v, r):             # move 1: real commitment for branch v, simulated for 1 - v
    o = 1 - v
    co, zo = random.randrange(q), random.randrange(q)       # the fake branch: c and z first
    Bo = B * pow(g, -o, p) % p
    fake = (pow(g, zo, p) * pow(A, -co, p) % p, pow(X, zo, p) * pow(Bo, -co, p) % p)
    w = random.randrange(q)
    real = (pow(g, w, p), pow(X, w, p))
    msgs = {v: real, o: fake}
    return (msgs[0], msgs[1]), (w, co, zo)

def respond(v, r, state, c):        # move 3: the real branch gets what is left of c
    w, co, zo = state
    cv = (c - co) % q
    cs, zs = {v: cv, 1 - v: co}, {v: (w + cv * r) % q, 1 - v: zo}
    return cs[0], cs[1], zs[0], zs[1]

def verify(A, B, msgs, c, c0, c1, z0, z1):
    (a0, b0), (a1, b1) = msgs
    return ((c0 + c1) % q == c and branch_ok(A, B, 0, a0, b0, c0, z0)
            and branch_ok(A, B, 1, a1, b1, c1, z1))

for v in (0, 1):
    r = random.randrange(1, q)
    A, B = encrypt(v, r)
    msgs, state = commit(A, B, v, r)
    c = random.randrange(q)                     # move 2: the verifier's challenge
    ans = respond(v, r, state, c)
    print("vote", v, "ciphertext", (A, B), "c =", c, "c0, c1, z0, z1 =", ans,
          "accepted:", verify(A, B, msgs, c, *ans))

# A cheater encrypts 2. Neither branch is true, so both must be faked in advance,
# and the faked c0 + c1 has to hit the verifier's c: one chance in 29.
wins = 0
for _ in range(10000):
    A, B = encrypt(2, random.randrange(1, q))
    c0, c1, z0, z1 = (random.randrange(q) for _ in range(4))
    msgs = []
    for j, cj, zj in ((0, c0, z0), (1, c1, z1)):
        Bj = B * pow(g, -j, p) % p
        msgs.append((pow(g, zj, p) * pow(A, -cj, p) % p, pow(X, zj, p) * pow(Bj, -cj, p) % p))
    wins += verify(A, B, msgs, random.randrange(q), c0, c1, z0, z1)
print("ballots of 2 accepted:", wins, "of 10000")
```

Output:

```
vote 0 ciphertext (46, 4) c = 11 c0, c1, z0, z1 = (22, 18, 6, 17) accepted: True
vote 1 ciphertext (17, 49) c = 2 c0, c1, z0, z1 = (15, 16, 20, 19) accepted: True
ballots of 2 accepted: 367 of 10000
```

For the vote of 0, $22 + 18 = 40 \equiv 11$, the verifier's challenge; for the
vote of 1, $15 + 16 = 31 \equiv 2$. The cheater's 367 in 10,000 is the
expected $1/29$ (about 345); with a 256-bit $q$ it would be zero for as long as
anyone cares to run it. Helios, ElectionGuard and almost every homomorphic
voting system since the late 1990s use this proof, made non-interactive with
Fiat-Shamir, on every ballot.

!!! note "Life story: proofs of partial knowledge (AND and OR)"
    **Born:** 1994, Ronald Cramer, Ivan Damgård and Berry Schoenmakers, CWI
    Amsterdam and Aarhus (CRYPTO 1994) · **Purpose:** prove that you know
    some subset of several secrets (one of two, $k$ of $n$) without revealing
    which, and get witness hiding against dishonest verifiers for free ·
    **Helped:** 0-or-1 ballot proofs in homomorphic voting (Cramer, Gennaro
    and Schoenmakers, 1997, and every system after), ring signatures, the
    "one of these keys" proofs in anonymous credentials and in privacy coins;
    Cramer's 1996 thesis built the general theory and the name Σ-protocol ·
    **Status:** current; the standard construction, taught as "the OR trick"

## 6.7 Mars: the airlock that does not ask your name

*Level: intermediate.*

Arcadia City lives inside walls. Every passage to the surface goes through an
airlock, and an airlock opened by the wrong person, or cycled carelessly, can
kill. So the outer locks open only for residents the security office has
cleared for surface work: trained, medically fit, current on their suit
checks. Airlock 7, on the north side, has a few dozen names on its list.

The obvious design gives every resident a badge that announces their identity,
and the door looks the name up. It works, and it produces something the city's
privacy rules say it should not keep: a timestamped record of every named
person's every trip outside. In a town of a few thousand people, a log of who
went out with whom and when is a detailed map of private lives, and it is
exactly the kind of record that leaks or is misused years later. The door does
not need a name. It needs one bit: is this person on the list?

An OR-proof gives the door that bit and nothing more.

- The security office publishes the list for Airlock 7 as public keys
  $y_1, \dots, y_n$, one per cleared resident. Each resident's badge holds
  their secret $x_i$. Clearing someone adds a key to the list; revoking
  someone removes it.
- At the door, the badge runs a 1-of-$n$ OR-proof: it fakes the $n - 1$
  branches it cannot do, runs its own honestly, and sends $n$ commitments.
- The door sends a fresh random challenge. Because the door chooses it on the
  spot, a recording of yesterday's proof is worthless today.
- The badge splits the challenge as $c = c_1 + \dots + c_n$, answers, and the
  door checks all $n$ branches and the sum.

The door learns "a cleared resident is here" and, by witness
indistinguishability, nothing about which one. Even if the door's software is
compromised, or its log is copied, the log says "airlock 7 cycled at 06:40 by
someone cleared", which is what the safety record needs.

```python
import random
random.seed(9)                      # random is for the demo; real keys use secrets

p, q, g = 59, 29, 4

# The security office publishes the badge keys of everyone cleared for Airlock 7.
secrets_of = {"Adeyemi": 5, "Brandt": 12, "Castillo": 19, "Dubois": 23, "Endo": 26}
cleared = [pow(g, x, p) for x in secrets_of.values()]

def badge_commit(keys, me, x):      # move 1: one commitment per cleared key
    n = len(keys)
    c = [random.randrange(q) for _ in range(n)]     # challenges for the faked branches
    s = [random.randrange(q) for _ in range(n)]
    t = [pow(g, s[i], p) * pow(keys[i], -c[i], p) % p for i in range(n)]
    k = random.randrange(q)
    t[me] = pow(g, k, p)                            # the one real commitment
    return t, (c, s, k)

def badge_respond(me, x, state, ch):  # move 3: the real branch takes what is left
    c, s, k = state
    c[me] = (ch - sum(c) + c[me]) % q
    s[me] = (k + c[me] * x) % q
    return c, s

def door_check(keys, t, ch, c, s):
    return sum(c) % q == ch and all(
        pow(g, s[i], p) == t[i] * pow(keys[i], c[i], p) % p for i in range(len(keys)))

me, x = 3, secrets_of["Dubois"]                     # Dubois walks up to the door
t, state = badge_commit(cleared, me, x)
ch = random.randrange(q)                            # move 2: the door's fresh challenge
c, s = badge_respond(me, x, state, ch)
print("keys      ", cleared)
print("commits t ", t)
print("door's challenge", ch, " split c =", c, " sum mod 29 =", sum(c) % q)
print("responses s", s)
print("door opens:", door_check(cleared, t, ch, c, s))

# Someone not on the list must fake all five branches before seeing the challenge.
opened = 0
for _ in range(10000):
    c = [random.randrange(q) for _ in cleared]
    s = [random.randrange(q) for _ in cleared]
    t = [pow(g, s[i], p) * pow(cleared[i], -c[i], p) % p for i in range(len(cleared))]
    opened += door_check(cleared, t, random.randrange(q), c, s)
print("impostor got through", opened, "times in 10000 (about 1 in 29; real groups: 1 in 2^256)")
```

Output:

```
keys       [21, 35, 19, 26, 12]
commits t  [36, 16, 57, 51, 36]
door's challenge 14  split c = [14, 19, 11, 24, 4]  sum mod 29 = 14
responses s [5, 27, 21, 17, 10]
door opens: True
impostor got through 324 times in 10000 (about 1 in 29; real groups: 1 in 2^256)
```

The split $14 + 19 + 11 + 24 + 4 = 72 = 2 \cdot 29 + 14$ matches the door's
challenge. Four of the five pairs $(c_i, s_i)$ were chosen before the door
spoke and one was computed after, and nothing on the screen says which.

**What the design does not do.** The proof costs three numbers per cleared
resident ($t_i$, $c_i$, $s_i$): for a list of 60 keys on a 256-bit curve, under
6 KB, and about 120 exponentiations at the door, well within a door
controller's means. For a list
of thousands, the linear cost hurts, and the better tools are ring signatures
with logarithmic size or anonymous credentials, where the office signs a
"cleared for surface work" attribute once and the badge proves it holds such a
signature ([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)).
The proof also does nothing against a stolen badge (a PIN or a fingerprint on
the badge is the answer to that), and nothing against someone who relays the
door's challenge to a cleared resident's badge elsewhere in the city (a short
time limit on the response, or a distance-bounding radio, is). And sometimes
the city will need to know who went out, for instance after an accident. The
privacy-respecting way is not to log names but to have the badge also encrypt
its holder's identity to a key split among several council members
([Chapter 4](04-Threshold-Cryptography.md)) with a proof that the encryption is
correct; the name can then be recovered only when enough of them agree that the
case warrants it.

## 6.8 Fiat-Shamir: from a conversation to a proof

*Level: intermediate.*

Everything so far needs a live verifier who picks a fresh challenge. That is
fine at an airlock door. It is not fine for a proof that must be checked by many
people, or later, or far away. A ballot proof must convince every observer of
an election, not only the server that received it. A proof that the airlock
log is genuine must convince an auditor next year. And a conversation between
Arcadia City and Earth, at up to 22 minutes of light delay each way, takes up
to 66 minutes for the three moves, for every single proof.

Fiat and Shamir's 1986 answer: let a hash function choose the challenge. The
prover computes

$$
c = H(\text{group}, \ \text{statement}, \ t, \ \text{context})
$$

itself, and sends $(t, s)$. Anyone can recompute $c$ and run the usual check.
The conversation has become a string, a **non-interactive proof**, that can be
posted, stored and forwarded.

Why should this be sound? The cheater's strategy in the interactive protocol
was to guess $c$, build $t$ to fit it, and hope. With Fiat-Shamir the
challenge is a hash of $t$, so the cheater must find a $t$ whose hash equals
the $c$ it prepared for. If the hash behaves like a random function, every
attempt is a fresh $1/q$ lottery ticket. With $q \approx 2^{256}$ that is
hopeless; with this chapter's $q = 29$ it takes a few dozen tries, and the
program below does it. The hash plays the part of an honest verifier who
cannot be predicted and cannot be influenced except by changing $t$, and
changing $t$ changes the challenge to something new and random.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Top: the interactive protocol with a verifier choosing c. Bottom: Fiat-Shamir, where the prover computes c as a hash of the group, the statement, t and the context, and sends t and s to anyone" fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold">Interactive: the verifier must be there</text>
<rect x="20" y="36" width="130" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="58" text-anchor="middle">Prover</text>
<rect x="490" y="36" width="130" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="555" y="58" text-anchor="middle">Verifier</text>
<line x1="150" y1="84" x2="482" y2="84" stroke="currentColor" stroke-width="1.8"/>
<polygon points="490,84 480,79 480,89"/>
<text x="320" y="78" text-anchor="middle">t</text>
<line x1="490" y1="110" x2="158" y2="110" stroke="currentColor" stroke-width="1.8"/>
<polygon points="150,110 160,105 160,115"/>
<text x="320" y="104" text-anchor="middle">random c</text>
<line x1="150" y1="136" x2="482" y2="136" stroke="currentColor" stroke-width="1.8"/>
<polygon points="490,136 480,131 480,141"/>
<text x="320" y="130" text-anchor="middle">s</text>
<line x1="20" y1="160" x2="620" y2="160" stroke="currentColor" opacity="0.4"/>
<text x="20" y="186" font-weight="bold">Fiat-Shamir: a hash plays the verifier</text>
<rect x="20" y="200" width="130" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="222" text-anchor="middle">Prover</text>
<rect x="175" y="196" width="290" height="42" rx="5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="320" y="214" text-anchor="middle">c = H(group, statement, t, context)</text>
<text x="320" y="231" text-anchor="middle">computed by the prover itself</text>
<rect x="490" y="200" width="130" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="555" y="222" text-anchor="middle">anyone, any time</text>
<line x1="85" y1="234" x2="85" y2="280" stroke="currentColor" stroke-width="1.8"/>
<line x1="85" y1="280" x2="547" y2="280" stroke="currentColor" stroke-width="1.8"/>
<line x1="555" y1="280" x2="555" y2="242" stroke="currentColor" stroke-width="1.8"/>
<polygon points="555,234 550,244 560,244"/>
<text x="320" y="274" text-anchor="middle">proof (t, s)</text>
<text x="320" y="310" text-anchor="middle">the verifier recomputes c from the same inputs and checks gˢ = t · yᶜ</text>
</svg>
<figcaption>Figure 6.6. The Fiat-Shamir transform. The challenge becomes a function of everything the prover has committed to, so the prover cannot pick t after c. What goes into the hash is the subject of §6.9.</figcaption>
</figure>

### By hand

The hash in this chapter's code is SHA-256 over the length-prefixed inputs,
read as a number and reduced mod $q$. The prover of §6.3 ($x = 11$, $y = 53$)
proves knowledge of $x$ for the context "airlock-7 log".

<div class="mars-steps" markdown>

1. **Commit.** $k = 7$, $t = 41$, as before.
2. **Challenge from the hash.** $c = H(59, 4, 53, 41, \text{"airlock-7 log"})
   \bmod 29 = 16$. (You cannot compute SHA-256 by hand; take this value from
   the code, which prints the inputs.)
3. **Respond.** $s = 7 + 16 \cdot 11 = 183 = 6 \cdot 29 + 9 \equiv 9$.
4. **The proof** is $(t, s) = (41, 9)$.
5. **Verify.** Recompute $c = 16$ from the same inputs. Then $g^9 = 7$, and
   $t \cdot y^{16} = 41 \cdot g^{176} = 41 \cdot g^{2} = 41 \cdot 16 = 656
   \equiv 7$. Accepted.
6. **Another context.** For "airlock-8 log" the hash gives $c = 2$, the check
   becomes $g^9 \overset{?}{=} 41 \cdot 53^2$, that is $7$ against
   $41 \cdot 36 = 1476 \equiv 1$, and the proof fails. It cannot be moved to
   another log.

</div>

### Code it: interactive becomes non-interactive

```python
import hashlib, random
random.seed(1986)                   # random is for the demo; real keys use secrets

def H(q, *parts):                   # the challenge: a hash of everything, length-prefixed
    data = b""
    for part in parts:
        b = part if isinstance(part, bytes) else str(part).encode()
        data += len(b).to_bytes(4, "big") + b
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

def prove(p, q, g, x, context):
    y = pow(g, x, p)
    k = random.randrange(1, q)
    t = pow(g, k, p)
    c = H(q, p, g, y, t, context)   # the hash plays the verifier
    return t, (k + c * x) % q

def verify(p, q, g, y, proof, context):
    t, s = proof
    if pow(y, q, p) != 1:           # y must lie in the group
        return False
    return pow(g, s, p) == t * pow(y, H(q, p, g, y, t, context), p) % p

# The toy group of this chapter.
p, q, g = 59, 29, 4
y = pow(g, 11, p)
proof = prove(p, q, g, 11, b"airlock-7 log")
print("toy proof (t, s):", proof, verify(p, q, g, y, proof, b"airlock-7 log"),
      verify(p, q, g, y, proof, b"airlock-8 log"))

# Without x, guess a challenge, build t to fit it, and hope the hash agrees.
tries = 0
while True:
    tries += 1
    c, s = random.randrange(q), random.randrange(q)
    t = pow(g, s, p) * pow(y, -c, p) % p
    if H(q, p, g, y, t, b"airlock-7 log") == c:
        break
print("forged a toy proof after", tries, "tries:", verify(p, q, g, y, (t, s), b"airlock-7 log"))

# A 256-bit safe prime: now a guess hits with probability about 2^-255.
p = 2**256 - 36113
q, g = (p - 1) // 2, 4
x = random.randrange(1, q)
proof = prove(p, q, g, x, b"airlock-7 log")
print("256-bit proof accepted:", verify(p, q, g, pow(g, x, p), proof, b"airlock-7 log"))
```

Output:

```
toy proof (t, s): (48, 3) True False
forged a toy proof after 25 tries: True
256-bit proof accepted: True
```

The random nonce gave a different proof, $(48, 3)$, from the hand example's
$(41, 9)$; both are valid. The forgery in the toy group is the whole case for
large groups in one line: Fiat-Shamir removes the verifier's live randomness,
so the attacker can try challenges offline as fast as it can hash, and the
only protection is that there are too many to try. An interactive protocol
with a 40-bit challenge can be fine (a cheater gets one guess per
conversation); a non-interactive one needs a challenge space of at least
$2^{128}$, and in practice $q$ itself, about $2^{256}$. The modulus
$2^{256} - 36113$ is a safe prime, so $g = 4$ has prime order
$q = (p-1)/2$; a mod-$p$ group of that size is still far too weak against
index-calculus attacks, and is used here only to show a full-size challenge.
Real systems use a 256-bit elliptic curve.

### Proofs and signatures are the same thing

Put a message into the hash and the non-interactive proof of knowledge of $x$
becomes a signature on that message under the public key $y$: the Schnorr
signature, $e = H(R, y, m)$, $s = k + e x$, with $R$ playing the role of $t$.
Book 1 [Chapter 14](../../book/14-Discrete-Log-Systems.md) builds it, runs it
by hand and codes it; nothing changes here except the point of view. A
signature is a proof that the signer knows the secret key, bound to a message
by the hash. The same transform applied to any sigma protocol gives a
signature scheme: applied to the OR-proof of §6.7 it gives a signature that
says "one of these $n$ people signed", which is the ring signature of
[Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md); applied to
Fiat and Shamir's own square-root protocol it gave the first scheme of the
family; applied to a lattice-based identification protocol it gives ML-DSA
(§6.12).

Two encodings of the proof are common. One sends the commitment and the
response, $(t, s)$, as RFC 8235 and BIP 340 do; the verifier hashes $t$ to get
$c$. The other sends the challenge and the response, $(c, s)$; the verifier
recomputes $t = g^{s} y^{-c}$ and checks that $H(\dots, t, \dots) = c$. The
second is shorter when a group element is longer than a hash, as in mod-$p$
groups; the first allows checking many signatures at once in a batch, which is
why BIP 340 chose it.

### Why it is secure, and in what model

The intuition, "the hash acts as an honest verifier", is made precise in the
**random-oracle model**, where the hash is treated as a truly random function
that every party can only query. In that model, David Pointcheval and Jacques
Stern proved in 1996 that a Fiat-Shamir signature from a sigma protocol is
secure. Their tool, the **forking lemma**, is the extractor of §6.4 in a new
setting: run the forger, and when it outputs a proof, rewind it to the moment
it asked the oracle for the challenge, answer that query differently, and let
it run again. With fair probability it forges again on the same commitment,
and two answers to two challenges give the secret. Book 1's
[Chapter 14](../../book/14-Discrete-Log-Systems.md) sketches the argument. Its
price is tightness: the reduction loses a factor of roughly the number of hash
queries the forger makes, which is why parameters carry some margin.

Zero knowledge also carries over in the model: a simulator that controls the
random oracle can pick $c$ and $s$, compute $t$ backwards, and then "program"
the oracle so that $H(\dots, t, \dots) = c$. The verifier, who only sees the
oracle's answers, cannot tell. And the honest-verifier restriction of §6.4
disappears: no verifier chooses the challenge any more, so no dishonest one
can choose it badly.

The model is a heuristic. Real hash functions are fixed public programs, and
in 2003 Shafi Goldwasser and Yael Tauman Kalai built a (contrived) sigma-style
protocol that is secure interactively but becomes forgeable under Fiat-Shamir
with *any* concrete hash function. No such failure is known for the
protocols in this chapter, and Fiat-Shamir with a good hash is trusted
throughout the industry. What does fail, repeatedly, is feeding the hash the
wrong inputs.

!!! note "Life story: the Fiat-Shamir transform"
    **Born:** 1986, Amos Fiat and Adi Shamir, Weizmann Institute of Science,
    "How to Prove Yourself: Practical Solutions to Identification and
    Signature Problems" (CRYPTO 1986). Their US patent application was
    placed under a government secrecy order in January 1987, reportedly at
    the Army's request, and the order was lifted within two days · **Purpose:** remove the live verifier
    by deriving the challenge from a hash, giving signatures and
    non-interactive proofs · **Helped:** Schnorr signatures, EdDSA, BIP 340,
    ML-DSA, and nearly every deployed zero-knowledge proof system, SNARKs and
    STARKs included · **Status:** current; secure in the random-oracle model,
    and only as good as the inputs to its hash

## 6.9 What must go into the hash

*Level: intermediate.*

The verifier of an interactive protocol picks its challenge after it knows
everything: the statement it wants proved and the prover's commitment. The
Fiat-Shamir hash must stand in for that verifier, so it must see everything
that verifier saw. The rule is short:

$$
c = H(\text{protocol and group}, \ \text{the full statement}, \ \text{every commitment}, \ \text{context}).
$$

- **The protocol and the group:** a label naming the protocol and its version
  (domain separation), and the parameters ($p$, $q$, $g$, $h$, or the curve
  and its base point), unless they are fixed constants of the protocol.
- **The full statement:** every public value the check uses: for Schnorr,
  $y$; for Chaum-Pedersen, $X$, $h$ and $Y$; for verifiable decryption, the
  key, the ciphertext and the claimed result; for an OR-proof, every branch.
- **Every commitment** the prover sent before the challenge.
- **Context:** the message for a signature; a session ID, a voter ID, an
  election ID or a purpose string for a proof, so that a proof cannot be
  replayed somewhere else.
- **An unambiguous encoding:** the inputs are joined so that two different
  lists can never produce the same bytes. Plain concatenation fails:
  "12" + "3" and "1" + "23" are the same string. This chapter's code puts a
  4-byte length before each item, as RFC 8235 does.

David Bernhard, Olivier Pereira and Bogdan Warinschi named the two common
versions in 2012. **Strong Fiat-Shamir** hashes the statement together with
the commitments. **Weak Fiat-Shamir** hashes only the commitments (and the
message, if there is one). Fiat and Shamir's original paper, and many
textbooks after it, wrote the weak version, because for signatures under a
fixed key it was enough. The difference matters as soon as the prover can
choose any part of the statement after seeing the challenge.

### Break it: a lying trustee under weak Fiat-Shamir

Go back to verifiable decryption (§6.5). The trustee holds $x$, with public
key $X = g^x$, and publishes the decryption factor $D$ for a ciphertext
$(A, B)$, with a Chaum-Pedersen proof that $\log_g X = \log_A D$. Suppose the
challenge is weak: $c = H(a, b)$, the two commitments only.

The trustee wants to publish a false $D$. It does three things in an order the
interactive protocol would never allow:

1. Commit with two *different* nonces: $a = g^{w_1}$ and $b = A^{w_2}$, with
   $w_1 \ne w_2$.
2. Compute the challenge $c = H(a, b)$. It does not depend on $D$, because
   $D$ is not in the hash and has not been chosen yet.
3. Answer the first equation honestly, $z = w_1 + c\,x$, so that
   $g^z = a X^c$. Then choose $D$ to make the second equation true:

$$
A^{z} = b \cdot D^{c}
\quad\Longleftrightarrow\quad
D = A^{(z - w_2)\,c^{-1}} .
$$

The exponent of $D$ to base $A$ is $(w_1 + cx - w_2)/c = x + (w_1 - w_2)/c$,
which is not $x$. So $D$ is not the true decryption factor, $B/D$ is not the
true plaintext, and the proof checks. The forger needs nothing but $x$, which a
trustee has, and an ordinary hash; the attack works in any group, whatever its
size. In the interactive protocol it fails because the verifier's $c$ arrives
after $D$ is announced, and $D$ is part of the statement.

```python
import hashlib, random
random.seed(2012)                   # random is for the demo; real keys use secrets

p = 2**256 - 36113                  # a safe prime; g = 4 has prime order q
q, g = (p - 1) // 2, 4

def H(*parts):
    data = b"".join(len(str(v)).to_bytes(4, "big") + str(v).encode() for v in parts)
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

def weak(X, A, D, a, b):   return H(a, b)                 # commitments only
def strong(X, A, D, a, b): return H(g, X, A, D, a, b)     # the whole statement too

def check(chal, X, A, D, proof):    # Chaum-Pedersen: log_g X = log_A D
    a, b, z = proof
    c = chal(X, A, D, a, b)
    return pow(g, z, p) == a * pow(X, c, p) % p and pow(A, z, p) == b * pow(D, c, p) % p

x = random.randrange(1, q)          # the trustee's key
X = pow(g, x, p)
m = pow(g, 3, p)                    # the true plaintext: g^3, "three votes"
r = random.randrange(1, q)
A, B = pow(g, r, p), m * pow(X, r, p) % p

# A lying trustee. Under weak Fiat-Shamir the challenge does not depend on D,
# so the trustee commits first, learns c, and only then chooses D to fit.
w1, w2 = random.randrange(q), random.randrange(q)
a, b = pow(g, w1, p), pow(A, w2, p)
c = H(a, b)
z = (w1 + c * x) % q
D = pow(A, (z - w2) * pow(c, -1, q) % q, p)   # solves A^z = b * D^c
fake = B * pow(D, -1, p) % p
print("announced plaintext is g^3:", fake == m)
print("forged proof, weak check:  ", check(weak, X, A, D, (a, b, z)))
print("forged proof, strong check:", check(strong, X, A, D, (a, b, z)))

# An honest strong proof still works.
w = random.randrange(q)
a, b = pow(g, w, p), pow(A, w, p)
D = pow(A, x, p)
z = (w + strong(X, A, D, a, b) * x) % q
print("honest proof, strong check:", check(strong, X, A, D, (a, b, z)),
      " plaintext is g^3:", B * pow(D, -1, p) % p == m)
```

Output:

```
announced plaintext is g^3: False
forged proof, weak check:   True
forged proof, strong check: False
honest proof, strong check: True  plaintext is g^3: True
```

The forger here cannot choose *which* false plaintext comes out; it gets a
random wrong one. That is already enough to stop a tally from being checked,
and in variants of the attack where more of the statement is free (the key,
or the ciphertext), the attacker has far more control.

**Fix it.** Hash the statement. In the code, `strong` adds $g$, $X$, $A$ and
$D$, and the forgery fails: changing $D$ after the fact changes $c$, and the
trustee is back in the interactive situation, with $D$ fixed before the
challenge. Nothing else in the protocol changes, and the cost is a few more
bytes into a hash.

### Helios, 2012

Helios, an open-source web voting system written by Ben Adida and released
in 2008, was the first verifiable voting system that ordinary organizations
used: the Université catholique de Louvain elected its president with it in
2009, and the International Association for Cryptologic Research has used it
for its elections. Its ballots carried 0-or-1 OR-proofs (§6.6) and its
trustees published Chaum-Pedersen decryption proofs (§6.5), all made
non-interactive with the weak Fiat-Shamir transform.

Bernhard, Pereira and Warinschi's paper, "How Not to Prove Yourself: Pitfalls
of the Fiat-Shamir Heuristic and Applications to Helios" (ASIACRYPT 2012),
showed that weak Fiat-Shamir proofs are not sound when the statement can be
chosen adaptively, and that in Helios this let a dishonest participant produce
proofs that verified for statements that were false. They described how it
could break the verifiability of a Helios election, letting a corrupt
authority announce a result that did not match the ballots while every proof
still checked, and they showed related problems for ballot privacy. The
Helios code was changed to hash the full statement. No real election is known
to have been attacked this way.

The same mistake kept returning in voting. In 2019 researchers examining the
Scytl system that Swiss Post had opened for public scrutiny found, among
other problems, proofs that hashed too little; Thomas Haines, Sarah Jamie
Lewis, Olivier Pereira and Vanessa Teague published the analysis as "How Not
to Prove Your Election Outcome" (IEEE Symposium on Security and Privacy,
2020). [Chapter 16](16-Electronic-Voting.md) tells that story.

!!! note "Life story: weak Fiat-Shamir in Helios"
    **Born:** found 2012 by David Bernhard, Olivier Pereira and Bogdan
    Warinschi (ASIACRYPT 2012) in Helios, Ben Adida's web voting system of
    2008 · **Purpose:** an analysis, not an attack: to show that hashing only
    the commitments makes proofs unsound when the statement can be chosen
    after the challenge · **Helped:** gave the field the words "weak" and
    "strong" Fiat-Shamir; Helios moved to strong Fiat-Shamir · **Status:**
    the standard citation for "hash the statement"

### Frozen Heart, 2022

Ten years later the lesson had not reached the newer, larger proof systems. In
April 2022 Jim Miller and colleagues at Trail of Bits disclosed a family of
bugs they called **Frozen Heart** (from "FORging Of ZEro kNowledge proofs",
and because Fiat-Shamir sits at the heart of these systems). They found
weak Fiat-Shamir implementations of three protocols:

- **Girault's proof of knowledge,** a sigma protocol for discrete logs in a
  group of unknown order, in ZenGo's threshold-signing library;
- **Bulletproofs** ([Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)),
  where the original 2018 paper itself had described an insecure way to
  compute a challenge, copied by several implementations;
- **PlonK** ([Chapter 7](07-SNARKs.md)), where implementations from Dusk
  Network, Iden3 (SnarkJS) and ConsenSys (gnark) left the public inputs out of
  the transcript hash.

In each case an attacker could produce a proof that verified for a false
statement. In a system where a SNARK attests that a batch of transactions is
valid, that means proving invalid transactions valid. The projects were fixed
in coordination with the disclosure, and no exploitation in the wild was
reported. A follow-up academic study in 2023 by Quang Dao, Jim Miller, Opal
Wright and Paul Grubbs searched open-source proof systems systematically and
found 36 weak Fiat-Shamir implementations across 12 proof systems. The pattern behind all
of them is the one this section started with: a paper writes the challenge as
"$H(\text{transcript})$" without listing every public value, and an
implementer hashes the messages and forgets the statement.

!!! note "Life story: Frozen Heart"
    **Born:** disclosed April 2022 by Trail of Bits (Jim Miller and
    colleagues) · **Purpose:** to show that Fiat-Shamir challenges computed
    without the public inputs let attackers forge proofs in Girault, Bulletproofs
    and PlonK implementations · **Helped:** fixes in ZenGo's library, several
    Bulletproofs libraries, Dusk Network's plonk, SnarkJS and gnark; transcript
    hashing is now a standard audit item for proof systems · **Status:** fixed
    where found; the class of bug is still being found

### Other ways to feed the hash badly

- **No domain separation.** A proof made for one purpose ("I know the key of
  this account") is accepted for another that uses the same equations ("I
  approve this transfer"). A fixed label per protocol and purpose in the hash
  stops it.
- **Ambiguous encoding.** If inputs are concatenated without lengths or fixed
  widths, two different statements can give the same hash input.
- **A short or biased challenge.** A 64-bit hash reduced mod a 256-bit $q$
  gives a 64-bit challenge space, which an offline attacker can search
  (§6.8). A 256-bit hash reduced mod a $q$ just below $2^{256}$ is fine;
  reducing a 256-bit hash mod a much smaller $q$ is fine too; a hash shorter
  than $q$ is not.
- **The parameters left out.** If the verifier accepts a generator or a group
  chosen by the prover and the hash does not include it, the prover can pick
  parameters after the challenge.

Modern libraries avoid these by giving the prover and verifier a shared
**transcript** object: each message and each public value is absorbed with a
label, in order, and challenges are squeezed out of it. The Merlin library in
Rust and the transcript layers of most SNARK frameworks work this way. The
point is not the specific tool but the habit: the verifier's view goes into
the hash, all of it, in a fixed, labeled order.

## 6.10 A repeated nonce gives away the key

*Level: intermediate.*

The extractor of §6.4 needs two transcripts with the same commitment and
different challenges. In the proof of soundness, someone has to rewind a
prover to get them. In real life, a prover who reuses its nonce hands them
over for free.

**By hand.** Take the toy signer with $x = 11$, and suppose its random number
generator gives the same $k = 7$ for two messages, so both signatures have
$R = 41$. Say the hashes of the two messages come out as $e = 5$ and
$e' = 12$. The signatures are $s = 4$ and $s' = 23$: exactly the two
transcripts of §6.4. Anyone who sees the same $R$ twice computes
$x = (4 - 23)/(5 - 12) \equiv 11$. The extractor, which was a thought
experiment in the proof of soundness, is now an attack. It works on Schnorr
identification, on Schnorr signatures, on EdDSA, on DSA and ECDSA (with
slightly different algebra), and on every sigma protocol: special soundness is
precisely the statement that two answers to one commitment reveal the secret.

The most famous case is Sony's PlayStation 3, whose code-signing tool used the
same ECDSA nonce for every signature; the fail0verflow group showed the
consequence at the end of 2010, and the console's root signing key became
public. [Cryptanalysis, Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)
tells the story and works the ECDSA algebra, along with Android's Bitcoin
wallets in 2013 and the subtler attacks in which a nonce is not repeated but
only slightly biased. Here is the Schnorr version.

```python
import hashlib, random
random.seed(2010)                   # random is for the demo; real keys use secrets

p = 2**256 - 36113
q, g = (p - 1) // 2, 4

def H(*parts):
    data = b"".join(len(str(v)).to_bytes(4, "big") + str(v).encode() for v in parts)
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

def sign(x, msg, k):                # Schnorr: e = H(R, y, msg), s = k + e*x
    R, y = pow(g, k, p), pow(g, x, p)
    e = H(R, y, msg)
    return R, (k + e * x) % q

def verify(y, msg, sig):
    R, s = sig
    return pow(g, s, p) == R * pow(y, H(R, y, msg), p) % p

x = random.randrange(1, q)
y = pow(g, x, p)
k = random.randrange(1, q)          # the bug: one nonce for two signatures
m1, m2 = b"open airlock 7", b"close airlock 7"
(R1, s1), (R2, s2) = sign(x, m1, k), sign(x, m2, k)

print("same R in both signatures:", R1 == R2)   # what an attacker looks for
e1, e2 = H(R1, y, m1), H(R2, y, m2)
x_found = (s1 - s2) * pow(e1 - e2, -1, q) % q   # the extractor, used as an attack
print("recovered the key:", x_found == x)
forged = sign(x_found, b"vent all air", random.randrange(1, q))
print("forgery verifies:", verify(y, b"vent all air", forged))

# The fix used by EdDSA: derive the nonce from the key and the message.
def det_nonce(x, msg):
    return H("nonce", x, msg) % (q - 1) + 1
print("deterministic nonces differ:", det_nonce(x, m1) != det_nonce(x, m2))
```

Output:

```
same R in both signatures: True
recovered the key: True
forgery verifies: True
deterministic nonces differ: True
```

The forged signature on "vent all air" verifies under the victim's real public
key: once $x$ is out, the attacker is the signer.

### Fix it: where the nonce comes from

- **Deterministic nonces.** EdDSA (RFC 8032) computes the nonce as a hash of
  a secret value derived from the key and of the message. Two different
  messages get unrelated nonces; signing the same message twice gives the same
  signature twice, which reveals nothing new. A broken random number generator
  can no longer leak the key. RFC 6979 does the same for DSA and ECDSA.
  The last lines of the program show the idea.
- **Hedged nonces.** A purely deterministic signer can be attacked by faults:
  glitch one of two signings of the same message, and the two outputs share a
  nonce but not a challenge ([Cryptanalysis, Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)
  has the details). So BIP 340 recommends hashing the key, the message *and*
  fresh randomness together. If the randomness is good, it protects against
  faults and side channels; if it is bad, the result is still as safe as a
  deterministic nonce.
- **Commitments used once.** Schnorr's smart card computed commitments in
  advance. Each precomputed pair $(k, t)$ must be erased after one use; a card
  that answers two terminals with the same stored $t$ gives away its key to
  anyone who sees both conversations.
- **Fresh random nonces in multi-party signing.** In two-party and threshold
  Schnorr (MuSig2, FROST; [Chapter 4](04-Threshold-Cryptography.md)), the
  challenge depends on the other signers' nonces too. If your nonce were
  deterministic, a dishonest co-signer could run the same signing session
  twice with a different nonce of its own: your $k$ stays the same, the
  combined commitment and hence the challenge change, and your two responses
  give away your key. So these protocols demand fresh randomness for every
  session and never reuse nonce state, the opposite of the single-signer
  advice.
- **Uniform, not just distinct.** A nonce that never repeats but is slightly
  biased, short by a few bits or leaking its length through timing, still
  gives the key away over many signatures, through lattice methods.
  [Cryptanalysis, Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)
  works through them.

## 6.11 In the real world

*Level: intermediate.*

### The patent, and why its expiry mattered

Schnorr patented his scheme. US patent 4,995,082 was granted on 19 February
1991, with a European counterpart. Six months later, in August 1991, NIST
proposed the Digital Signature Algorithm, which uses an ElGamal-style
equation, $s = k^{-1}(H(m) + x r)$, instead of Schnorr's $s = k + e x$. The
choice was widely understood as a way to obtain a royalty-free federal
standard around Schnorr's patent (and RSA's). Schnorr held that DSA still fell
within his claims, and the question was never settled in court. Either way, the
world standardized DSA and, from 1999 on (ANSI X9.62, then FIPS 186-2 in
2000), its elliptic-curve version ECDSA, and for two decades the most used discrete-log signatures were the ones
with the awkward inverse, no clean security proof and no natural way to
combine signers.

The patent expired in February 2008. The effects took a decade to show and
are still arriving:

- **Ed25519** (Bernstein, Duif, Lange, Schwabe and Yang, 2011) is a Schnorr
  signature on an Edwards curve, with the deterministic nonce of §6.10 and a
  challenge that hashes the commitment, the public key and the message. It
  became the default modern signature: in OpenSSH since 2014, in TLS 1.3, in
  Signal's XEdDSA variant, in many package-signing systems. RFC 8032
  specified EdDSA in 2017, and NIST approved it in FIPS 186-5 in 2023.
- **BIP 340** brought Schnorr signatures to Bitcoin, switched on with the
  Taproot upgrade at block 709,632 on 14 November 2021. Bitcoin's original
  2009 design had used ECDSA.
- **Threshold and multi-party signing.** Schnorr's response is linear in the
  nonce and the key, so several signers can add their contributions into one
  ordinary signature. MuSig2 (BIP 327) and FROST (RFC 9591, 2024) do exactly
  that ([Chapter 4](04-Threshold-Cryptography.md)). Doing the same for ECDSA
  needs heavy machinery, and those protocols are where the TSSHOCK and
  BitForge breaks of 2023 were found.

### EdDSA and BIP 340, read as sigma protocols

Both are Schnorr's protocol plus Fiat-Shamir, and both made choices this
chapter can now explain.

- **What they hash.** Ed25519's challenge is $H(R \,\Vert\, A \,\Vert\, M)$,
  the commitment, the public key and the message. BIP 340's is a tagged hash
  $H_{\text{BIP0340/challenge}}(R \,\Vert\, P \,\Vert\, m)$, the tag being a
  domain separator. Putting the public key in the hash ("key prefixing") is
  strong Fiat-Shamir applied to signatures: it stops an attacker from
  transferring a signature between related keys, which matters in Bitcoin,
  where wallets derive many keys from one by adding known offsets.
- **Where the nonce comes from.** Ed25519: deterministic. BIP 340: hedged,
  mixing in auxiliary randomness.
- **Encoding.** BIP 340 keys are 32 bytes (only the $x$-coordinate) and
  signatures 64 bytes $(R, s)$; sending $R$ rather than $e$ allows batch
  verification of a whole block's signatures at once.

!!! note "Life story: EdDSA and Ed25519"
    **Born:** 2011, Daniel J. Bernstein, Niels Duif, Tanja Lange, Peter
    Schwabe and Bo-Yin Yang, "High-speed high-security signatures" ·
    **Purpose:** a fast Schnorr signature on Curve25519's Edwards form, with
    deterministic nonces and constant-time code from the start · **Helped:**
    SSH keys, TLS 1.3, Signal (XEdDSA), software signing; RFC 8032 (2017) and
    FIPS 186-5 (2023) · **Status:** current; the default choice for new
    elliptic-curve signatures

!!! note "Life story: BIP 340, Schnorr signatures in Bitcoin"
    **Born:** specified by Pieter Wuille, Jonas Nick and Tim Ruffing;
    activated with Taproot (BIP 341) at block 709,632, 14 November 2021 ·
    **Purpose:** replace ECDSA for new Bitcoin outputs with a signature that
    has a security proof, batch verification and linearity · **Helped:**
    multi-party spending that looks like a single signature on the chain
    (MuSig2, BIP 327; FROST), smaller and more private multisig wallets ·
    **Status:** current, alongside ECDSA for older outputs

### Where sigma protocols run

| Use | Sigma protocol inside | Deployed in | More |
|---|---|---|---|
| Signatures | Schnorr + Fiat-Shamir | Ed25519 (SSH, TLS, Signal), BIP 340 | book 1 ch. 14, 15 |
| Proving you hold a key | Schnorr proof, RFC 8235 | J-PAKE, key registration, distributed key generation | ch. 4 |
| Threshold and multi-signatures | Schnorr, linear | FROST (RFC 9591), MuSig2 (BIP 327) | ch. 4 |
| Verifiable random functions | Chaum-Pedersen | ECVRF (RFC 9381), leader election | ch. 4 |
| Privacy tokens | batched Chaum-Pedersen | VOPRF (RFC 9497), Privacy Pass | ch. 11, 14 |
| Voting | OR of Chaum-Pedersen; decryption proofs | Helios, ElectionGuard | ch. 16 |
| Anonymous credentials | representation proofs, AND, OR | Idemix, U-Prove, BBS, Signal's group credentials | ch. 14 |
| Post-quantum signatures | Fiat-Shamir with aborts on a lattice | ML-DSA (FIPS 204) | §6.12 |

Anonymous credentials are where the composition rules of §6.6 do the most
work: a user proves, in one Fiat-Shamir proof, that it holds a signature from
an issuer on a set of hidden attributes, AND that one attribute (a birth date)
is before some date, AND that its credential is not on a revocation list,
revealing nothing else ([Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md)).
Voting is where the OR-proof and the decryption proof run in public, on every
ballot, before observers whose job is to check them
([Chapter 16](16-Electronic-Voting.md)).

## 6.12 Going deeper

*Level: expert.*

**One recipe for all of them.** Schnorr, Chaum-Pedersen and Okamoto are one
protocol. Let $\varphi$ be a group homomorphism from exponents to group
elements: $\varphi(x) = g^x$ for Schnorr, $\varphi(x) = (g^x, h^x)$ for
Chaum-Pedersen, $\varphi(m, r) = g^m h^r$ for Okamoto. The statement is
$y = \varphi(w)$. The prover sends $t = \varphi(k)$, receives $c$, and answers
$s = k + c\,w$; the verifier checks $\varphi(s) = t \cdot y^c$. Completeness is
the homomorphism property; the extractor computes $(s - s')/(c - c')$; the
simulator sets $t = \varphi(s) \cdot y^{-c}$. Ueli Maurer set this out in 2009
as a unified theory of such proofs. The conditions to watch are that challenge
differences must be invertible, which is automatic in a group of prime order
and is the reason protocols over RSA groups, of unknown order (Guillou-Quisquater
1988, Girault 1991), restrict their challenges or need extra care.

**Compressed sigma protocols.** A proof about a vector of $n$ secrets costs
$n$ responses in the recipe above. Thomas Attema and Ronald Cramer (2020)
showed how to fold the response vector in half repeatedly, the same idea as
Bulletproofs' inner-product argument
([Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)), giving proofs of size
$O(\log n)$ while keeping the sigma-protocol theory intact. This is a direct
line from Schnorr's three moves to modern succinct arguments.

**Fiat-Shamir on many rounds.** Bulletproofs, PlonK and STARKs have many rounds,
each with its own challenge, and Fiat-Shamir derives every challenge from the
whole transcript so far. Soundness then depends on the round structure, not
just the challenge size. If a protocol has several rounds and a cheater gets a
fresh chance to grind in each, the security of the non-interactive version
can be far below the interactive one's. Daniel Kales and Greg Zaverucha (2020)
broke the claimed security level of MQDSS, a post-quantum signature built by
applying Fiat-Shamir to a five-move protocol, exactly this way, by attacking
the two challenge rounds separately. The fix is larger parameters; the lesson
is that "secure interactive protocol + hash" is a theorem only under
conditions the designer must check.

**Fiat-Shamir without random oracles.** Goldwasser and Kalai (2003) showed
that Fiat-Shamir cannot be secure for every protocol under every concrete hash.
A line of work since then asks which hash properties suffice for which
protocols. "Correlation intractability", studied by Canetti, Chen, Holmgren,
Lombardi, Rothblum, Rothblum and Wichs (2019), led to non-interactive zero
knowledge for all of NP from the learning-with-errors problem (Peikert and
Shiehian, 2019). None of this changes practice yet, but it explains why
cryptographers call Fiat-Shamir a heuristic and still use it everywhere.

**Quantum adversaries.** Shor's algorithm computes discrete logs, so every
protocol in this chapter falls to a large quantum computer; the structure does
not. Lattice-based identification protocols have the same three moves, and
Fiat-Shamir turns them into signatures. The twist, found by Vadim Lyubashevsky
(2009), is that a lattice response $z = y + c\,s$ with a short secret $s$
would leak $s$ statistically unless responses outside a safe range are thrown
away and the prover starts again: **Fiat-Shamir with aborts**. That is the
design of Dilithium, standardized in 2024 as ML-DSA in FIPS 204
([Post-quantum, Chapter 9](../post-quantum/09-ML-DSA.md)). The security proof
also has to change: rewinding a quantum adversary, as the forking lemma does,
is not generally possible. Don, Fehr, Majenz and Schaffner (2019) and Liu and
Zhandry (2019) proved Fiat-Shamir sound in the quantum random-oracle model
for sigma protocols with suitable properties.

**Blind Schnorr signatures and ROS.** A Schnorr signer can be made blind: the
user perturbs the commitment and the challenge so that the signer never sees
the message or the final signature. The scheme looked secure for decades, but
if the signer runs many sessions concurrently, a user can combine them to get
one more signature than the number of sessions. The attack solves the "ROS"
problem, which Benhamouda, Lepoint, Loss, Orrù and Raykova showed in 2021 can be
done in polynomial time once a few hundred sessions are open at once. It is the
sharpest reminder that a sigma protocol's guarantees are about one
conversation, and that running many conversations at once is a different
setting. [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md) takes it
up.

## Check yourself

??? question "1. In the group of this chapter ($p = 59$, $q = 29$, $g = 4$, $x = 11$, $y = 53$), the prover picks $k = 2$ and the verifier sends $c = 3$. Compute $t$ and $s$, and check."

    $t = 4^2 = 16$ and $s = 2 + 3 \cdot 11 = 35 \equiv 6 \pmod{29}$. Check:
    $g^6 = 25$, and $t \cdot y^3 = 16 \cdot g^{33} = 16 \cdot g^{4} = 16 \cdot 20
    = 320 \equiv 25 \pmod{59}$. Both sides are 25.

??? question "2. Why must the prover send its commitment before it sees the challenge? What could a prover without $x$ do if the order were reversed?"

    If the prover knew $c$ first, it could pick any $s$ and set
    $t = g^s y^{-c}$, which passes the check without $x$. That is exactly the
    simulator. The commitment-first order is what separates a proof from a
    transcript anyone can write.

??? question "3. A prover with public key $y = 53$ answers challenges 1 and 3 for the same commitment with responses 20 and 13. Find its secret."

    $x = (20 - 13)/(1 - 3) = 7/(-2) \pmod{29}$. The inverse of 2 is 15, so
    the inverse of $-2$ is $-15 \equiv 14$, and $x = 7 \cdot 14 = 98 \equiv 11$.
    Check: $4^{11} = 53$.

??? question "4. Simulate a transcript for $y = 53$ with challenge $c = 2$ and response $s = 0$. Is it accepted?"

    $t = g^0 \cdot y^{-2} = g^{-22} = g^{7} = 41$. Check: $g^0 = 1$ and
    $t \cdot y^2 = 41 \cdot 36 = 1476 = 25 \cdot 59 + 1 \equiv 1$. Accepted, and
    made without $x$.

??? question "5. Why does the simulator not prove Schnorr's protocol zero knowledge against a dishonest verifier who picks $c$ from $2^{256}$ values?"

    The simulator must know $c$ before it makes $t$. A dishonest verifier may
    choose $c$ as a function of $t$ (say, a hash of it), so the simulator
    cannot fix $c$ first; guessing $c$ and rewinding on a miss succeeds with
    probability $2^{-256}$ per try. With 1-bit challenges guessing works half
    the time, which is why the binary-challenge version is fully zero
    knowledge. For large challenges the protocol is only known to be
    honest-verifier zero knowledge (and witness hiding).

??? question "6. In the OR-proof, a prover knows neither $x_1$ nor $x_2$. Why does it pass with probability only $1/q$?"

    For each branch it can only produce an accepting response for a challenge
    it fixed before sending the commitments. So both $c_1$ and $c_2$ are fixed
    before the verifier speaks, and the check $c_1 + c_2 = c$ holds only if
    the verifier's random $c$ equals their sum: probability $1/q$. Formally,
    two accepting transcripts with different $c$ would give one of the
    secrets.

??? question "7. A trustee publishes a decryption factor $D$ for the ElGamal ciphertext $(A, B)$ with a Fiat-Shamir Chaum-Pedersen proof. List what the hash must contain."

    A protocol label and the group (or curve) with $g$; the statement: the
    trustee's key $X$, the ciphertext component $A$ (and, to bind the claim,
    $B$), and the factor $D$; both commitments $a$ and $b$; and context such
    as the election and trustee IDs. Leaving out $D$ is the forgery of §6.9.

??? question "8. A Schnorr signer uses a counter: nonce $k$ for one message and $k + 1$ for the next. Can the key be recovered?"

    Yes. $s_1 = k + e_1 x$ and $s_2 = k + 1 + e_2 x$, so
    $s_1 - s_2 + 1 = (e_1 - e_2) x$ and $x = (s_1 - s_2 + 1)(e_1 - e_2)^{-1}
    \bmod q$. Any known relation between nonces gives one linear equation too
    many. Nonces must be unpredictable, not merely distinct.

??? question "9. Why is a deterministic nonce safe for Ed25519 but dangerous for one signer in a two-party Schnorr multisignature?"

    For a single signer the challenge depends only on the signer's own
    commitment, the key and the message, so the same message gives the same
    $k$ and the same challenge: nothing new leaks. In a multisignature the
    challenge also depends on the co-signer's nonce. A dishonest co-signer can
    rerun the session with a different nonce; your $k$, derived from the same
    key and message, repeats, but the combined challenge changes, and your two
    responses reveal your key. MuSig2 and FROST therefore require fresh
    random nonces per session.

??? question "10. An identification protocol has challenges in $\{0, 1\}$ and is run 40 times in parallel, interactively; a cheater passes with probability $2^{-40}$. Someone makes it non-interactive with Fiat-Shamir, keeping 40 repetitions. Why is that unsafe, and what is the fix?"

    Interactively, the cheater gets one try per conversation. Non-interactively
    it can grind offline: prepare commitments for a guessed 40-bit challenge,
    hash, and retry until the hash matches. That takes about $2^{40}$ hashes,
    minutes on ordinary hardware. A non-interactive proof needs soundness
    error below about $2^{-128}$ against offline work, so at least 128
    repetitions, or a protocol with a large challenge space.

## What you learned

- A sigma protocol has three moves: commitment, random challenge, response.
  The prover is bound by its commitment before the challenge arrives, and that
  order is the security argument.
- Schnorr's protocol proves knowledge of a discrete log with $t = g^k$,
  $s = k + cx$ and the check $g^s = t\,y^c$. It is complete, specially sound
  (two answers to one commitment give $x = (s - s')/(c - c')$) and
  honest-verifier zero knowledge (a simulator picks $c$ and $s$ first and
  computes $t$).
- Chaum-Pedersen proves two discrete logs equal, which proves DH tuples and
  decryptions correct; Okamoto proves knowledge of a representation, such as
  the opening of a Pedersen commitment. Both are the same recipe with a
  different homomorphism.
- AND shares one challenge; OR lets the prover split the challenge and
  simulate the branch it cannot do. OR-proofs hide which witness was used,
  which gives 0-or-1 ballot proofs and anonymous airlock badges.
- Fiat-Shamir replaces the challenge with a hash of the group, the full
  statement, the commitments and the context. Hashing less (weak
  Fiat-Shamir) broke Helios's proofs in theory in 2012 and many proof-system
  implementations in practice in 2022.
- A repeated or related nonce turns the extractor into an attack. Single
  signers derive nonces deterministically or hedge them; multi-party signers
  must use fresh randomness every session.
- Schnorr's patent kept the world on DSA and ECDSA until 2008; since then
  Ed25519, BIP 340, FROST and MuSig2 have made Schnorr the preferred
  discrete-log signature.

**Next:** [Chapter 7](07-SNARKs.md), proofs that stay short however large the
computation, where Fiat-Shamir is applied to protocols of many rounds.

## Further reading

- Shafi Goldwasser, Silvio Micali and Charles Rackoff, "The Knowledge
  Complexity of Interactive Proof-Systems" (STOC 1985; *SIAM Journal on
  Computing* 18, 1989).
- Amos Fiat and Adi Shamir, "How to Prove Yourself: Practical Solutions to
  Identification and Signature Problems" (CRYPTO 1986).
- Claus-Peter Schnorr, "Efficient Identification and Signatures for Smart
  Cards" (CRYPTO 1989); "Efficient Signature Generation by Smart Cards",
  *Journal of Cryptology* 4 (1991). US patent 4,995,082 (1991).
- Uriel Feige and Adi Shamir, "Witness Indistinguishable and Witness Hiding
  Protocols" (STOC 1990).
- David Chaum and Torben Pryds Pedersen, "Wallet Databases with Observers"
  (CRYPTO 1992).
- Tatsuaki Okamoto, "Provably Secure and Practical Identification Schemes and
  Corresponding Signature Schemes" (CRYPTO 1992).
- Mihir Bellare and Oded Goldreich, "On Defining Proofs of Knowledge"
  (CRYPTO 1992).
- Ronald Cramer, Ivan Damgård and Berry Schoenmakers, "Proofs of Partial
  Knowledge and Simplified Design of Witness Hiding Protocols" (CRYPTO 1994).
- Ronald Cramer, *Modular Design of Secure yet Practical Cryptographic
  Protocols*, PhD thesis, University of Amsterdam (1996).
- David Pointcheval and Jacques Stern, "Security Proofs for Signature Schemes"
  (EUROCRYPT 1996; *Journal of Cryptology* 13, 2000).
- Ronald Cramer, Rosario Gennaro and Berry Schoenmakers, "A Secure and
  Optimally Efficient Multi-Authority Election Scheme" (EUROCRYPT 1997).
- Mihir Bellare and Adriana Palacio, "GQ and Schnorr Identification Schemes:
  Proofs of Security against Impersonation under Active and Concurrent
  Attacks" (CRYPTO 2002).
- Shafi Goldwasser and Yael Tauman Kalai, "On the (In)security of the
  Fiat-Shamir Paradigm" (FOCS 2003).
- Ivan Damgård, "On Σ-protocols", lecture notes, Aarhus University (2002,
  revised 2010).
- Ueli Maurer, "Unifying Zero-Knowledge Proofs of Knowledge" (AFRICACRYPT
  2009).
- Vadim Lyubashevsky, "Fiat-Shamir with Aborts" (ASIACRYPT 2009).
- Daniel J. Bernstein, Niels Duif, Tanja Lange, Peter Schwabe and Bo-Yin
  Yang, "High-Speed High-Security Signatures" (CHES 2011).
- David Bernhard, Olivier Pereira and Bogdan Warinschi, "How Not to Prove
  Yourself: Pitfalls of the Fiat-Shamir Heuristic and Applications to Helios"
  (ASIACRYPT 2012).
- RFC 8235, Schnorr Non-interactive Zero-Knowledge Proof (2017); RFC 8032,
  Edwards-Curve Digital Signature Algorithm (2017); RFC 9381, Verifiable
  Random Functions (2023); RFC 9497, Oblivious Pseudorandom Functions (2023);
  RFC 9591, FROST (2024).
- Pieter Wuille, Jonas Nick and Tim Ruffing, BIP 340, "Schnorr Signatures for
  secp256k1" (2020; active on Bitcoin since November 2021).
- FIPS 186-5, Digital Signature Standard (2023); FIPS 204, Module-Lattice-Based
  Digital Signature Standard (2024).
- Jelle Don, Serge Fehr, Christian Majenz and Christian Schaffner, "Security
  of the Fiat-Shamir Transformation in the Quantum Random-Oracle Model"
  (CRYPTO 2019).
- Thomas Attema and Ronald Cramer, "Compressed Σ-Protocol Theory and Practical
  Application to Plug & Play Secure Algorithmics" (CRYPTO 2020).
- Daniel Kales and Greg Zaverucha, "An Attack on Some Signature Schemes
  Constructed from Five-Pass Identification Schemes" (2020).
- Thomas Haines, Sarah Jamie Lewis, Olivier Pereira and Vanessa Teague, "How
  Not to Prove Your Election Outcome" (IEEE S&P 2020).
- Fabrice Benhamouda, Tancrède Lepoint, Julian Loss, Michele Orrù and Mariana
  Raykova, "On the (in)Security of ROS" (EUROCRYPT 2021).
- Jim Miller (Trail of Bits), "Coordinated disclosure of vulnerabilities
  affecting Girault, Bulletproofs, and PlonK" (blog series, April 2022).
- Quang Dao, Jim Miller, Opal Wright and Paul Grubbs, "Weak Fiat-Shamir
  Attacks on Modern Proof Systems" (IEEE S&P 2023).
- Dan Boneh and Victor Shoup, *A Graduate Course in Applied Cryptography*,
  chapters on sigma protocols and Fiat-Shamir (online, version 0.6, 2023).
- Reference pages and book 1: [Zero-knowledge proofs](../../11-advanced/Zero-Knowledge.md),
  [Schnorr signatures](../../02-signatures/Schnorr.md),
  [EdDSA](../../02-signatures/EdDSA.md), book 1
  [Chapter 14](../../book/14-Discrete-Log-Systems.md) and
  [Chapter 23](../../book/23-Advanced-Protocols.md).
