# 17. Defining Security

*Until the 1980s a cipher was called secure when nobody had broken it yet. This
chapter shows how cryptographers learned to say exactly what "secure" means:
as a game between a challenger and an attacker, with a number, the advantage,
that measures how well the attacker plays. You will see the main games for
encryption and signatures, write one in Python, work through a proof by
reduction step by step, and look at the cases where a precise definition found
a real bug that years of testing had missed.*

!!! abstract "In this chapter"
    **You will learn:**

    - why "nobody has broken it" is not a definition, and what a definition must contain
    - the indistinguishability games IND-CPA and IND-CCA, and unforgeability (EUF-CMA)
    - what an attacker's advantage is, and how to compute it for simple attacks
    - how a proof by reduction turns "breaking the scheme" into "solving a hard problem"
    - the random oracle model and the other idealized models, with their limits
    - real bugs in SSL, TLS, SSH and Bitcoin that a definition would have caught

    **You need:** [Chapter 4](04-Randomness-and-Perfect-Secrecy.md) (probability, perfect secrecy),
    [Chapter 8](08-Modes-of-Operation.md) (ECB, CBC, CTR), [Chapter 10](10-Message-Authentication.md)
    (MACs, AEAD) and [Chapter 13](13-RSA.md) (textbook RSA).

    **Levels:** 17.1 to 17.4 are for beginners, 17.5 to 17.9 intermediate, 17.10 and 17.11 expert.

## 17.1 The problem

Suppose you invent a cipher and want to know whether it is any good. The old
answer was to publish it and wait. If clever people attacked it for years and
failed, it was "secure". That is how DES earned trust in the 1970s and 1980s,
and it is still how we trust AES and SHA-256 as building blocks.

But that answer has two holes. First, it never says what the attacker was
trying to do. Recovering the key? Reading one message? Learning only whether a
message says "yes" or "no"? A cipher can resist the first and fail the last.
Second, it gives you nothing when you *combine* parts. AES may be strong, but
is AES in CBC mode with a MAC on the plaintext strong? Waiting twenty years for
every combination is not an option.

Claude Shannon gave the first exact definition in 1949, for the one-time pad
([Chapter 4](04-Randomness-and-Perfect-Secrecy.md)): a cipher has **perfect
secrecy** if the ciphertext tells you nothing at all about the message, even
with unlimited computing power. It is a beautiful definition, and Shannon
proved that it costs a key as long as all the messages you will ever send.
Every practical cipher fails it.

The step that made modern cryptography came thirty years later. In 1982, two
graduate students at the University of California, Berkeley, Shafi Goldwasser
and Silvio Micali, asked a smaller question: what if the attacker is not
all-powerful, just limited to a reasonable amount of computing? Their paper
"Probabilistic Encryption" (STOC 1982, journal version 1984) defined security
as a guessing game the attacker cannot win noticeably better than by flipping a
coin. It also showed that any scheme meeting the definition must be
**randomized**: encrypting the same message twice must give different
ciphertexts. That ruled out textbook RSA ([Chapter 13](13-RSA.md)) and every
deterministic mode at a stroke. In the same year Andrew Yao gave related
definitions built on the idea that a good generator's output
cannot be told apart from true randomness by any efficient test. Goldwasser and
Micali received the Turing Award for this work in 2012; Yao had received it in
2000.

Over the next decade the field filled in the rest. Goldwasser, Micali and Ron
Rivest defined what it means for a signature to be unforgeable (1988). Moni Naor
and Moti Yung (1990), then Charles Rackoff and Daniel Simon (1991), defined
security against attackers who can get ciphertexts decrypted. Mihir Bellare and
Phillip Rogaway turned the asymptotic definitions into concrete numbers that
engineers could use (1990s), and proposed the random oracle model (1993). By
2000 cryptography had become a field where you write the definition first, then
the scheme, then the proof.

## 17.2 What a definition has to say

*A security definition answers three questions.*

1. **What can the attacker do?** This is the **attack model**: what the attacker
   sees and what it may ask for.
2. **What counts as winning?** This is the **goal** the attacker must not reach.
3. **How much can it spend?** Time, memory, and the number of questions it may ask.

The classic attack models, from weakest attacker to strongest:

| Model | The attacker has | A real situation |
|---|---|---|
| Ciphertext only (COA) | ciphertexts | listening to radio traffic |
| Known plaintext (KPA) | some pairs of plaintext and ciphertext | the weather report sent at 6:00 every day |
| Chosen plaintext (CPA) | encryptions of messages it chooses | anyone with a public key; a web page that makes your browser send requests |
| Chosen ciphertext, non-adaptive (CCA1) | decryptions of ciphertexts it chooses, but only before it sees the target | the "lunchtime attack": access to a decryption box while the owner is out |
| Chosen ciphertext, adaptive (CCA2) | decryptions of anything except the target itself, before and after | a server that answers "bad padding" or "MAC error" |

And the goals, from hardest for the attacker to easiest:

| Goal the attacker must not reach | Meaning |
|---|---|
| Key recovery | find the key |
| Total break | decrypt every ciphertext without the key |
| One-wayness | decrypt one random ciphertext |
| Indistinguishability | learn *anything* about the message, even one bit |

The best definitions pair the **strongest attacker** with the **weakest goal**:
an attacker who may ask for almost anything still cannot learn even one bit.
That is what "IND-CCA2" means, and it is the target for modern public-key
encryption.

Why demand so much? Because real systems keep handing attackers more power than
their designers expected. A web page can make your browser encrypt chosen data
(that is a chosen-plaintext attack, and section 17.9 shows it breaking TLS
1.0). A server's error messages decrypt bits for whoever asks. And learning one
bit, "did the vote say yes?", can be the whole secret.

## 17.3 Games and advantage

A modern definition is written as a **game** played between a **challenger**,
who runs the scheme with a secret key, and an **adversary**, the attacker. Here is
the indistinguishability game for encryption under chosen-plaintext attack,
IND-CPA. Press Step to go through it.

<div class="mars-steps" markdown>

1. The challenger picks a random key $k$ and a secret random bit $b$, 0 or 1.
2. The adversary may ask for the encryption of any messages it likes. This is the chosen-plaintext power.
3. The adversary picks two messages $m_0$ and $m_1$ of the same length and sends them.
4. The challenger encrypts one of them, $c = E_k(m_b)$, and sends $c$ back.
5. The adversary may ask for more encryptions, then outputs a guess $b'$.
6. The adversary wins if $b' = b$.

</div>

A coin flip wins half the time, so winning half the time means nothing. What
matters is how far above one half the adversary gets. That distance is its
**advantage**:

$$
\mathrm{Adv}(\mathcal{A}) = 2 \cdot \left\lvert \Pr[b' = b] - \tfrac{1}{2} \right\rvert .
$$

The factor 2 puts the advantage on a scale from 0 (no better than guessing) to 1
(always right). An equivalent form, often easier to compute, compares how often
the adversary says "1" in the two worlds:

$$
\mathrm{Adv}(\mathcal{A}) = \left\lvert \Pr[b' = 1 \mid b = 1] - \Pr[b' = 1 \mid b = 0] \right\rvert .
$$

**By hand: four adversaries.**

1. *The coin flipper.* It ignores $c$ and outputs a random bit. It wins with
   probability exactly $\frac12$, so its advantage is $2 \cdot \lvert \frac12 - \frac12 \rvert = 0$.
2. *The lucky reader.* Suppose some attack is right 3 times in 4. Its advantage is
   $2 \cdot \lvert \frac34 - \frac12 \rvert = \frac12$.
3. *The ECB spotter.* Against AES in ECB mode ([Chapter 8](08-Modes-of-Operation.md)),
   pick $m_0$ = two identical 16-byte blocks and $m_1$ = two different blocks. ECB
   encrypts equal blocks to equal blocks, so if the two halves of $c$ are equal,
   say 0; otherwise say 1. When $b = 0$ it always says 0. When $b = 1$ it says 0
   only if two different blocks happen to encrypt the same, which never happens
   because AES is a permutation. So
   $\Pr[b'=1 \mid b=1] - \Pr[b'=1 \mid b=0] = 1 - 0 = 1$. ECB is completely broken
   under IND-CPA, even though nobody recovers a key.
4. *The re-encryptor.* Against any **deterministic** scheme, ask the encryption
   oracle for $E_k(m_0)$ and compare with $c$. Equal means $b = 0$. Advantage 1.
   This is Goldwasser and Micali's observation: an IND-CPA secure scheme cannot be
   deterministic. It needs a random IV or a nonce that never repeats.

**How small is small enough?** Theory books say the advantage must be
**negligible**: smaller than $1/p(\lambda)$ for every polynomial $p$, as the
security parameter $\lambda$ (roughly, the key length) grows. Practice needs
numbers instead, so Bellare and Rogaway's **concrete security** states results
like this: "any adversary that runs in time $t$ and makes $q$ queries has
advantage at most $\varepsilon(t, q)$". A scheme with "128-bit security" is one
where reaching advantage near 1 needs about $2^{128}$ work, and where, more
generally, $\varepsilon \lesssim t / 2^{128}$.

**Why a game, when we care about privacy?** Goldwasser and Micali also defined
**semantic security**: whatever an efficient attacker can work out about the
message *with* the ciphertext, it could have worked out *without* it. That is
the property we want, but it is awkward to prove anything with. They showed the
two definitions are equivalent, so cryptographers prove the game version and get
semantic security for free.

## 17.4 Code it

The game is short enough to run. This program plays IND-CPA against two schemes
built from a SHA-256 keystream: one with no nonce, so the same message always
gives the same ciphertext, and one with a fresh random nonce each time. The
adversary is the re-encryptor from above. A simulation like this uses a seeded
generator so the run is repeatable; real keys come from `secrets`.

```python
import hashlib, random

rng = random.Random(2026)              # a simulation: seeded so runs repeat; real keys use secrets

def stream(key, nonce, n):             # keystream from SHA-256 in counter mode
    out = b""
    for i in range(0, n, 32):
        out += hashlib.sha256(key + nonce + i.to_bytes(4, "big")).digest()
    return out[:n]

def enc_det(key, m):                   # no nonce: the same m always gives the same c
    return bytes(a ^ b for a, b in zip(m, stream(key, b"", len(m))))

def enc_rand(key, m):                  # fresh random nonce, sent with the ciphertext
    nonce = rng.getrandbits(128).to_bytes(16, "big")
    return nonce + bytes(a ^ b for a, b in zip(m, stream(key, nonce, len(m))))

def game(enc, adversary, trials=20000):
    wins = 0
    for _ in range(trials):
        key, b = rng.getrandbits(128).to_bytes(16, "big"), rng.randrange(2)
        oracle = lambda m: enc(key, m)             # the encryption oracle
        m0, m1 = b"attack at dawn!!", b"retreat at noon!"
        c = oracle([m0, m1][b])                    # the challenge
        wins += adversary(oracle, m0, m1, c) == b
    return 2 * abs(wins / trials - 0.5)

def compare(oracle, m0, m1, c):        # encrypt m0 again and look
    return 0 if oracle(m0) == c else 1

print("deterministic:", round(game(enc_det, compare), 2))
print("randomized:   ", round(game(enc_rand, compare), 2))
```

Output:

```
deterministic: 1.0
randomized:    0.0
```

The measured advantage of 0.0 against the randomized scheme does not *prove*
it secure. It shows only that this one adversary fails. A proof has to cover
every efficient adversary at once, which is what section 17.7 is about. But
writing the game as code is a good habit: it forces you to say exactly what
the attacker gets.

## 17.5 Chosen-ciphertext security

*Level: intermediate.*

Now give the adversary a **decryption oracle** too. In the IND-CCA2 game it may
ask for the decryption of any ciphertext it likes, before and after the
challenge, with one exception: not the challenge $c$ itself (that would make the
game trivial). If it still cannot guess $b$, the scheme is **IND-CCA2 secure**.
In IND-CCA1 the decryption oracle closes when the challenge arrives.

This sounds like a theorist's fantasy. Who would decrypt arbitrary ciphertexts
for an attacker? In practice, almost every server does, a little at a time. A
server that receives a message, decrypts it, and then behaves differently
depending on what it found ("bad padding", "bad MAC", "unknown user", or just a
reply that takes a little longer) is a partial decryption oracle. Daniel
Bleichenbacher's 1998 attack on SSL used nothing but a server's answer to "was
the RSA padding valid?", about a million times, to decrypt a session key
([Chapter 18](18-Side-Channels.md) works through this family of attacks).

**Malleability fails CCA.** A scheme is **malleable** if an attacker can change
a ciphertext so that the plaintext changes in a known way. Textbook RSA is: with
the toy key from [Chapter 13](13-RSA.md), $n = 3233$, $e = 17$, $d = 2753$:

$$
c = 65^{17} \bmod 3233 = 2790, \qquad
c' = c \cdot 2^{17} \bmod 3233, \qquad
c'^{\,d} \bmod 3233 = 130 = 2 \times 65 .
$$

The adversary asks for the decryption of $c'$ (allowed: it is not $c$), gets 130,
halves it, and wins. CTR mode is malleable too: flipping bit $i$ of the
ciphertext flips bit $i$ of the plaintext, so an adversary flips a bit of the
challenge, asks for the decryption, and flips the bit back.

The general lesson is that **non-malleability and CCA security go together**.
Danny Dolev, Cynthia Dwork and Moni Naor defined non-malleability in 1991, and
Bellare, Desai, Pointcheval and Rogaway proved in 1998 that under adaptive
chosen-ciphertext attack the two notions are the same thing.

**For symmetric encryption, CCA security comes from authentication.** Add one
more game, **INT-CTXT** (integrity of ciphertexts): the adversary gets
encryptions of messages of its choice and wins if it produces *any new*
ciphertext that decrypts without an error. A scheme that is IND-CPA and
INT-CTXT is called **authenticated encryption**. Bellare and Chanathip
Namprempre proved in 2000 that authenticated encryption implies IND-CCA2, and
looked at the three ways to combine a cipher with a MAC:

| Composition | What is sent | Generic result |
|---|---|---|
| Encrypt-then-MAC | $c = E(m)$, $t = \mathrm{MAC}(c)$ | always authenticated encryption, if the parts are secure |
| MAC-then-encrypt | $c = E(m \,\Vert\, \mathrm{MAC}(m))$ | not always; depends on the cipher |
| Encrypt-and-MAC | $c = E(m)$, $t = \mathrm{MAC}(m)$ | not even IND-CPA in general: a deterministic MAC of $m$ repeats when $m$ does |

At the time, SSL and TLS used MAC-then-encrypt, IPsec used encrypt-then-MAC, and
SSH used encrypt-and-MAC. Section 17.9 shows what happened to each. The modern
answer is to use an AEAD mode ([Chapter 10](10-Message-Authentication.md)) whose
proof already covers both halves.

## 17.6 Unforgeability

*Level: intermediate.*

For MACs and signatures the attacker's goal is not to read but to **forge**. The
standard game, from Goldwasser, Micali and Rivest (1988), is
**existential unforgeability under chosen-message attack**, EUF-CMA:

1. The challenger makes a key pair and gives the adversary the public key (for a MAC there is nothing public).
2. The adversary asks for signatures (or tags) on any messages it chooses, as many as it likes.
3. It outputs a pair $(m^*, \sigma^*)$.
4. It wins if $\sigma^*$ is valid for $m^*$ **and** $m^*$ was never one of its questions.

"Existential" means the adversary wins with a forgery on *any* message at all,
even a meaningless string. That looks too strict until you remember that
attackers choose what to forge, and a protocol may accept bytes nobody expected.

**Strong unforgeability (SUF-CMA)** also counts a *new signature on an old
message* as a win. The difference sounds academic, and it cost real money.
ECDSA ([Chapter 15](15-Elliptic-Curves.md)) is not strongly unforgeable: if
$(r, s)$ is a valid signature, so is $(r, n - s)$, where $n$ is the group order.
In Bitcoin, the identifier of a transaction was the hash of the whole
transaction, signature included. Anyone relaying a payment could flip $s$ to
$n - s$, get a different but valid transaction with a different identifier, and
confuse software that tracked payments by identifier. In February 2014 the Mt.
Gox exchange blamed this "transaction malleability" for its losses as it
collapsed; later studies found it could explain only a small part of them, but
the flaw was real. Bitcoin fixed it in steps: requiring the "low $s$" form,
then the 2017 Segregated Witness upgrade, which moved signatures out of the
hashed identifier. Ed25519 and Bitcoin's later Schnorr signatures (BIP 340)
check for this and are strongly unforgeable.

## 17.7 Proofs by reduction

*Level: intermediate.*

We cannot prove that AES or factoring is hard; nobody can prove that kind of
statement today (it would settle questions bigger than P versus NP). What we
*can* prove is a **conditional** statement:

> If problem $P$ is hard, then scheme $S$ is secure.

The proof is a **reduction**, and it is really an algorithm. It says: give me
any adversary $\mathcal{A}$ that breaks $S$ with advantage $\varepsilon$ in time
$t$, and I will build an algorithm $\mathcal{B}$ that runs $\mathcal{A}$ as a
subroutine and solves $P$ with advantage about $\varepsilon$ in time about $t$.
Since we believe nobody can solve $P$, no such $\mathcal{A}$ exists. The trick is
that $\mathcal{B}$ must **play the challenger** for $\mathcal{A}$: answer all its
questions convincingly, without knowing the secret that a real challenger has.

### A worked example: a MAC from a PRF

**The pieces.** A **pseudorandom function** (PRF) is a keyed function $F_k$ that
no efficient test can tell apart from a truly random function. The game: a
distinguisher gets an oracle that is either $F_k$ for a random $k$ or a random
function $R$, and must say which. HMAC-SHA256 is believed to be a PRF
([Chapter 10](10-Message-Authentication.md)).

**The scheme.** The MAC is simply $\mathrm{tag}(m) = F_k(m)$, with $n$-bit tags.

**The claim.** If $F$ is a secure PRF, this MAC is EUF-CMA. Concretely, for every
forger $\mathcal{A}$:

$$
\Pr[\mathcal{A} \text{ forges}] \le \mathrm{Adv}^{\mathrm{PRF}}_F(\mathcal{B}) + 2^{-n} .
$$

**The reduction.** $\mathcal{B}$ is given an oracle $O$, either $F_k$ or $R$. It runs
$\mathcal{A}$ and acts as $\mathcal{A}$'s challenger:

<div class="mars-steps" markdown>

1. Whenever $\mathcal{A}$ asks for a tag on $m$, $\mathcal{B}$ asks its own oracle and passes back $O(m)$.
2. $\mathcal{A}$ eventually outputs a forgery attempt $(m^*, t^*)$ with $m^*$ new.
3. $\mathcal{B}$ asks its oracle for $O(m^*)$.
4. If $O(m^*) = t^*$, $\mathcal{B}$ says "PRF"; otherwise it says "random".

</div>

**The analysis.** When $O = F_k$, $\mathcal{A}$ is playing exactly the real MAC
game, so $\mathcal{B}$ says "PRF" with probability $\Pr[\mathcal{A} \text{ forges}]$.
When $O = R$, the value $R(m^*)$ at a point never asked before is uniformly
random and independent of everything $\mathcal{A}$ saw, so $t^*$ matches with
probability exactly $2^{-n}$. Subtracting,

$$
\mathrm{Adv}^{\mathrm{PRF}}_F(\mathcal{B}) = \Pr[\mathcal{A} \text{ forges}] - 2^{-n},
$$

which rearranges to the claim. $\mathcal{B}$ makes one more query than $\mathcal{A}$
and does almost no extra work, so if forging were easy, breaking the PRF would
be just as easy. $\square$

**With numbers.** Take HMAC-SHA256 cut to 64-bit tags. If the best PRF
distinguisher with a year of computing has advantage $2^{-80}$, then no forger
with that budget succeeds with probability above $2^{-80} + 2^{-64} \approx 2^{-64}$.
The $2^{-64}$ is the chance of guessing a tag blindly, which no proof can remove;
that is why tags shorter than 64 bits need a limit on how many tries an attacker gets.

### The reduction in code

A reduction is an algorithm, so it runs. Below, `forger` is a working attack on
the MAC built from a *bad* "PRF", $F_k(m) = k \oplus m$: asking for the tag of 0
reveals $k$. The function `B` is the reduction above, word for word. Against the
bad $F$ it distinguishes perfectly, exactly as the proof predicts. Against
HMAC, the same forger, and so `B`, gets nowhere.

```python
import hashlib, hmac, random

rng = random.Random(7)
N = 16                                   # tags and messages are 16-bit numbers here

def weak_F(k, m):                        # a "PRF" that isn't one: k XOR m
    return k ^ m

def good_F(k, m):                        # HMAC-SHA256 cut to 16 bits
    return int.from_bytes(hmac.new(k.to_bytes(2, "big"), m.to_bytes(2, "big"),
                                   hashlib.sha256).digest()[:2], "big")

def forger(tag):                         # A: one tag query, then a forgery
    k = tag(0)                           # with weak_F, tag(0) = k
    m = 1234
    return m, k ^ m

def B(oracle):                           # the reduction: says 1 for "PRF", 0 for "random"
    asked = set()
    def tag(m):                          # answer A's queries with the oracle
        asked.add(m)
        return oracle(m)
    m, t = forger(tag)
    return int(m not in asked and oracle(m) == t)

def advantage(F, trials=5000):
    hits_prf = hits_rand = 0
    for _ in range(trials):
        k = rng.randrange(2 ** N)
        hits_prf += B(lambda m: F(k, m))
        table = {}                       # a truly random function, built lazily
        hits_rand += B(lambda m: table.setdefault(m, rng.randrange(2 ** N)))
    return (hits_prf - hits_rand) / trials

print("B against weak_F:", advantage(weak_F))
print("B against HMAC:  ", advantage(good_F))
```

Output:

```
B against weak_F: 1.0
B against HMAC:   0.0
```

### Tight and loose reductions

The details of a reduction matter as much as its existence. If $\mathcal{B}$
needs $q$ times as long as $\mathcal{A}$, or succeeds with only $\varepsilon/q$,
the reduction is **loose** by a factor of $q$, and the scheme's guarantee is
$\log_2 q$ bits weaker than the problem's. A reduction that loses a factor of
$2^{40}$ turns a 128-bit assumption into an 88-bit guarantee. The PRF-to-MAC
reduction above is **tight**: it loses nothing. Section 17.11 shows a famous
loose one.

## 17.8 Models: what the proof assumes

*Level: intermediate.*

Every proof lives in a **model** that says what the attacker can and cannot do
with the parts of the scheme.

**The standard model.** The proof uses only the stated assumption, such as "AES
is a pseudorandom permutation" or "the decisional Diffie-Hellman problem is
hard". This is the strongest kind of proof. The first practical public-key
encryption scheme proved IND-CCA2 in the standard model was Ronald Cramer and
Victor Shoup's, in 1998. It is about twice as expensive as ElGamal and is rarely
used, which says something about the price of standard-model proofs.

**The random oracle model (ROM).** Bellare and Rogaway proposed in 1993 to prove
schemes as if the hash function were a **random oracle**: a public, perfectly
random function that everyone, including the attacker, can only query, never
look inside. In a proof, the reduction controls the oracle, which gives it two
powers it would not have with a real hash:

- it **sees every query** the attacker makes (so if the attacker ever hashes a
  secret, the reduction learns it), and
- it can **program** answers, choosing outputs that suit it, as long as they look random.

These powers make proofs possible for RSA-OAEP and RSA-PSS ([Chapter 13](13-RSA.md)),
Schnorr signatures through the Fiat-Shamir transform ([Chapter 14](14-Discrete-Log-Systems.md)),
and the Fujisaki-Okamoto transform (1999) that makes ML-KEM IND-CCA2
([Chapter 21](21-Lattice-Cryptography.md)).

The catch is that no real hash function is a random oracle: SHA-256 is a fixed
program anyone can read. In 1998 Ran Canetti, Oded Goldreich and Shai Halevi
built a signature scheme that is secure in the ROM but **insecure with every
real hash function**. Their scheme is deliberately strange: it checks whether
the hash function's code is embedded in the message and gives up the key if so.
No natural scheme with this problem has been found in the decades since, so the
ROM is trusted in practice as a strong heuristic. A ROM proof rules out every
attack that treats the hash as a black box. It says nothing about attacks that
use the hash's structure, such as length extension on SHA-256 ([Chapter 9](09-Hash-Functions.md)).

**The ideal cipher model** does the same for block ciphers: it treats the
cipher as a random permutation for each key. It is used to analyze designs such
as Davies-Meyer hashing and key-length extension, and like the ROM it is a
heuristic.

**The generic group model** lets the attacker use a group only through its
operations, with no access to how elements are written down. Victor Shoup
proved in 1997 (following Vasily Nechaev, 1994) that in this model computing a
discrete logarithm in a group of prime order $q$ needs about $\sqrt{q}$
operations. That is why a 256-bit elliptic curve is said to give 128-bit
security: on good curves, no attack is known that does better than a generic
one ([Chapter 15](15-Elliptic-Curves.md)).

**The quantum random oracle model (QROM)** lets the attacker query the hash in
superposition, as a quantum computer could. Old ROM proofs often fail in it,
because the reduction can no longer "see" queries. Post-quantum schemes need
QROM proofs, and the exact form of the Fujisaki-Okamoto transform in ML-KEM
was chosen so that one exists.

## 17.9 Break it: when definitions caught real bugs

*Level: intermediate.*

The best argument for definitions is their record. Several protocols that the
whole internet used were broken in ways that a definition would have flagged at
once, often years before an attack was shown. Here are the main cases.

**Predictable IVs in SSL and TLS 1.0 (IND-CPA).** CBC mode ([Chapter 8](08-Modes-of-Operation.md))
is IND-CPA secure only if each IV is **unpredictable** before the message is
chosen. SSL 3.0 and TLS 1.0 used the last ciphertext block of the previous
record as the next IV, so the attacker knew it in advance. That breaks the game
directly: knowing the next IV $v$ and an earlier block $c_{i} = E_k(c_{i-1} \oplus p_i)$,
the attacker submits $v \oplus c_{i-1} \oplus g$ for a guess $g$; the result
equals $c_i$ exactly when $g = p_i$. Gregory Bard described the attack on TLS in
2004, and TLS 1.1 (2006) switched to random IVs, but most software stayed on
TLS 1.0. In 2011 Thai Duong and Juliano Rizzo's **BEAST** made it practical:
script in a web page made the browser send chosen plaintext (the CPA in IND-CPA,
for real) and recovered a cookie one byte at a time.

**SSH's binary packet protocol (IND-CPA).** SSH-2 also chained CBC IVs across
packets and computed its MAC on the plaintext (encrypt-and-MAC). In 2002
Bellare, Tadayoshi Kohno and Namprempre analyzed it against the definitions,
showed it was not IND-CPA, and proposed fixed modes, including the CTR modes
that SSH added in 2006 (RFC 4344). Seven years later Martin Albrecht, Kenneth
Paterson and Gaven Watson recovered plaintext from OpenSSH in CBC mode by
exploiting how the packet length was decrypted before the MAC check.
[Chapter 19](19-Protocols.md) follows SSH's story.

**MAC-then-encrypt in TLS (INT-CTXT, IND-CCA).** Hugo Krawczyk proved in 2001
that MAC-then-encrypt is not secure in general, and that TLS's use of it was
safe only under conditions TLS did not quite meet: decryption errors had to be
indistinguishable. In 2002 Serge Vaudenay showed what happens when they are not:
a **padding oracle** that decrypts CBC traffic byte by byte. The fixes treated
symptoms. The attacks came back as Lucky Thirteen in 2013 (timing) and POODLE in
2014 (SSL 3.0's loose padding), until TLS 1.3 removed CBC entirely.
[Chapter 18](18-Side-Channels.md) runs a padding oracle attack.

**Signature malleability in Bitcoin (SUF-CMA).** As in section 17.6: ECDSA was
EUF-CMA, as the designers assumed, but transaction identifiers silently relied
on SUF-CMA.

**The Triple Handshake (authentication definitions).** In 2014 Karthikeyan
Bhargavan and colleagues at Inria and Microsoft Research were building miTLS, a
TLS implementation with a machine-checked proof. Writing down exactly what TLS
1.2 renegotiation and resumption were supposed to guarantee showed that they
didn't: a malicious server could make two different connections share the same
keys and the same "unique" session identifier, then splice a victim's client
certificate onto its own session. The fix, the "extended master secret" (RFC
7627, 2015), binds the keys to the full handshake transcript, as the definition
demanded.

**A proof with an error (OCB2).** Proofs are written by people and can be wrong.
OCB2, an authenticated encryption mode published with a proof in 2004 and
standardized in ISO/IEC 19772, was broken in 2018 by Akiko Inoue and Kazuhiko
Minematsu; within months, with Tetsu Iwata and Bertram Poettering, the attack
recovered plaintext and forged messages. The proof had a mistake in a corner
case. OCB1 and OCB3, with different proofs, are unaffected. Machine-checked
proofs exist partly because of cases like this.

**Outside every model.** Some breaks do not touch the definition at all:

- *Timing and power.* The games assume the attacker sees only inputs and outputs.
  [Chapter 18](18-Side-Channels.md) is about everything else it can measure.
- *A false assumption.* The post-quantum scheme SIKE had careful proofs
  reducing it to an isogeny problem. In July 2022 Wouter Castryck and Thomas
  Decru broke that problem on a laptop, and the proofs fell with it.
- *Broken preconditions.* Proofs assume nonces never repeat and keys are random.
  The KRACK attack on Wi-Fi made devices reuse nonces ([Chapter 19](19-Protocols.md)),
  and Sony's PlayStation 3 signed with one ECDSA nonce for every signature.

A proof does not replace cryptanalysis. It moves the question from "is this
whole system secure?" to "is this one assumption true, and does the
implementation match the model?", which are questions people know how to attack.

## 17.10 In the real world

*Level: expert.*

**What standards promise.** Modern standards state their goals in the language
of this chapter. ML-KEM (FIPS 203) is designed to be IND-CCA2 secure, and so is
HPKE (RFC 9180). TLS 1.3 (RFC 8446) was the first major protocol designed
alongside academic analysis: several teams analyzed drafts with both
computational proofs and automated tools such as Tamarin and ProVerif, and the
designers changed the protocol in response. In 2016 Cas Cremers and colleagues
found, with Tamarin, a problem in draft 10 in how a client's certificate could
be checked after a resumed handshake; it was fixed before publication. The
signatures in FIPS 186-5 and FIPS 204 are meant to be EUF-CMA (ML-DSA aims for
SUF-CMA).

**Usage limits come from the bounds.** A proof's bound says how much data a key
may protect before the guarantee weakens. AES has 128-bit blocks, and the
standard proof for CTR or GCM loses about $q^2 / 2^{129}$ for $q$ blocks, the
chance that a random function would have repeated a value where a permutation
cannot (the birthday bound, section 17.11). The numbers:

| Block size | Blocks under one key, $q$ | Bound $q^2 / 2^{b+1}$ | In practice |
|---|---|---|---|
| 64 bits (3DES, Blowfish) | $2^{32}$ (32 GiB) | $2^{-1}$ | broken: Sweet32 (2016) |
| 64 bits | $2^{20}$ (8 MiB) | $2^{-25}$ | why short-lived keys were once fine |
| 128 bits (AES) | $2^{32}$ | $2^{-65}$ | no concern |
| 128 bits (AES) | $2^{48}$ (4 PiB) | $2^{-33}$ | the scale where limits start to matter |

In 2016 Karthikeyan Bhargavan and Gaëtan Leurent's **Sweet32** attack turned the
first row into a real attack: a browser kept sending the same cookie through a
long-lived 3DES connection, and after hundreds of gigabytes, colliding blocks
revealed it. The fix was to retire 64-bit block ciphers from TLS. For AES-GCM,
TLS 1.3 tells implementations to change keys after at most $2^{24.5}$ full-size
records (RFC 8446 §5.5), and NIST SP 800-38D limits a key to $2^{32}$ messages
when nonces are random, because two random 96-bit nonces collide with
probability about $q^2 / 2^{97}$, which for $q = 2^{32}$ is $2^{-33}$.

**Reading a security claim.** When a paper or product says "provably secure",
ask the four questions this chapter has taught:

1. Under which **definition** (IND-CPA? IND-CCA2? EUF-CMA?), and does the
   application need more?
2. Under which **assumption**, and how well studied is it?
3. In which **model** (standard, ROM, generic group)?
4. How **tight** is the reduction, and do the parameters account for the loss?

Full details on the definitions and the material on this site:
[Security definitions lesson](../learn/Security-Definitions.md),
[AEAD reference](../05-modes-aead/AEAD.md), [RSA reference](../02-signatures/RSA.md).

## 17.11 Going deeper

*Level: expert.*

### Hybrid arguments and game hopping

Most proofs do not jump from the scheme to the assumption in one step. They
change the game a little at a time: game 0 is the real game; in game 1 the PRF
is replaced by a random function; in game 2 the random function is replaced by
truly random ciphertext; and so on, until the adversary's view is independent
of $b$ and its advantage is exactly 0. The total advantage is at most the sum of
the differences between neighboring games, and each difference is bounded by
one assumption or one bad event. Victor Shoup's tutorial "Sequences of Games"
(2004) and Bellare and Rogaway's "code-based game-playing proofs" (2006) made
this style standard, and it is what tools like EasyCrypt and CryptoVerif check
by machine.

### The PRP/PRF switching lemma

A block cipher is a **permutation**: it never maps two inputs to the same
output. A random function sometimes does. If you prove a mode secure assuming a
random function and then plug in AES, you pay for the difference. The
**switching lemma** bounds it: for any adversary making $q$ queries to an
$n$-bit permutation,

$$
\left\lvert \Pr[\mathcal{A}^{\pi} = 1] - \Pr[\mathcal{A}^{f} = 1] \right\rvert \le \frac{q(q-1)}{2^{n+1}} ,
$$

the probability that $q$ random values contain a repeat. This is the birthday
bound behind the table in 17.10, and the reason 64-bit blocks are obsolete.

??? note "Proof sketch of the switching lemma"

    Run the adversary against a random function $f$, and let BAD be the event that two
    different queries get the same answer. As long as BAD does not happen, the answers
    are distinct uniform values, which is exactly how a random permutation behaves.
    So the two games are identical until BAD, and the "fundamental lemma of game
    playing" gives that the advantage is at most $\Pr[\text{BAD}]$. With $q$ queries
    there are $\binom{q}{2}$ pairs, each colliding with probability $2^{-n}$, so
    $\Pr[\text{BAD}] \le \binom{q}{2} 2^{-n} = q(q-1)/2^{n+1}$.

### A loose reduction: the forking lemma

Schnorr signatures ([Chapter 14](14-Discrete-Log-Systems.md)) are EUF-CMA in the
random oracle model if discrete logarithms are hard. The proof (David
Pointcheval and Jacques Stern, 1996) runs the forger, then **rewinds** it to the
moment it asked the random oracle for the hash $h$ used in its forgery, and
replays from there with a different answer $h'$. Two forgeries $(R, s)$ and
$(R, s')$ with the same $R$ and different hashes give the secret key, as two
signatures with a repeated nonce do. But the replay works only if the forger
forges again on the *same* hash query, and the reduction cannot know which of
the $q_H$ queries that will be. The resulting bound is roughly

$$
\varepsilon_{\text{DL}} \gtrsim \frac{\varepsilon^2}{q_H} ,
$$

a loss that can exceed 60 bits for realistic $q_H$. Nobody knows an attack that
exploits the gap, and later work showed that no simple reduction can do much
better. Alfred Menezes and Neal Koblitz used examples like this in their essays
"Another Look at Provable Security" (2007 onward) to argue that loose proofs say
less than they seem to, and that parameters should account for the loss.

### Relations among the notions

Bellare, Desai, Pointcheval and Rogaway (CRYPTO 1998) mapped how the
public-key notions relate:

$$
\text{IND-CCA2} \iff \text{NM-CCA2} \;\Rightarrow\; \text{IND-CCA1} \;\Rightarrow\; \text{IND-CPA},
$$

and none of the one-way arrows can be reversed. For symmetric encryption,
Bellare and Namprempre's result reads

$$
\text{IND-CPA} \wedge \text{INT-CTXT} \;\Rightarrow\; \text{IND-CCA2} .
$$

### Beyond games: simulation and composition

Games define security for one primitive at a time. For protocols, where many
sessions run at once and pieces are reused, the main alternative is the
**simulation** paradigm: a protocol is secure if anything an attacker can do in
the real world, it could also do in an ideal world where a trusted party
computes the result. Ran Canetti's **universal composability** framework (2001)
adds a guarantee that such protocols stay secure when combined with anything
else. It is the usual framework for the multi-party computation and
zero-knowledge protocols of [Chapter 23](23-Advanced-Protocols.md). Key exchange
has its own game-based models, starting with Bellare and Rogaway's in 1993 and
Canetti and Krawczyk's in 2001, which is what the TLS 1.3 proofs use.

## Check yourself

??? question "1. An adversary in the IND-CPA game is right 60% of the time. What is its advantage?"

    $2 \cdot \lvert 0.6 - 0.5 \rvert = 0.2$.

??? question "2. An adversary always outputs $b' = 1$. What is its advantage, and why?"

    0. It is right exactly when $b = 1$, which happens half the time. In the second form,
    $\Pr[b'=1 \mid b=1] - \Pr[b'=1 \mid b=0] = 1 - 1 = 0$.

??? question "3. Why can't a public-key encryption scheme that is IND-CPA secure be deterministic?"

    Anyone can encrypt with the public key. The adversary computes $E(m_0)$ itself and
    compares it with the challenge, winning every time. Real schemes add randomness
    (OAEP for RSA, an ephemeral key for ElGamal and KEMs).

??? question "4. Does AES-CTR with a random nonce meet IND-CPA? IND-CCA2?"

    IND-CPA yes, if AES is a good pseudorandom permutation and nonces don't repeat (with the
    birthday-bound loss). IND-CCA2 no: flip a bit of the challenge, ask for the decryption
    of the changed ciphertext (allowed, it differs from the challenge), and flip the bit back.
    Adding a MAC over the ciphertext (encrypt-then-MAC) fixes it.

??? question "5. A signature scheme lets anyone turn a valid signature on $m$ into a different valid signature on $m$. Is it EUF-CMA? SUF-CMA?"

    It can still be EUF-CMA, since no signature on a *new* message is produced. It is not
    SUF-CMA, which counts a new signature on an old message as a forgery. ECDSA is the
    standard example: $(r, s)$ and $(r, n - s)$.

??? question "6. Using the bound $q^2 / 2^{b+1}$, after how many blocks does a 64-bit block cipher's bound reach $2^{-20}$? Is that a lot of data?"

    $q^2 = 2^{-20} \cdot 2^{65} = 2^{45}$, so $q = 2^{22.5} \approx 5.9$ million blocks of 8 bytes,
    about 45 MiB. That is a small download, which is why 64-bit block ciphers need
    keys changed very often, or better, should not be used.

??? question "7. In the PRF-to-MAC reduction, where exactly does the proof use the fact that $m^*$ was never queried?"

    In the random world. If $m^*$ had been queried, $\mathcal{A}$ would already know $R(m^*)$ and
    could match it with probability 1, so the "random" case would no longer succeed with only
    $2^{-n}$, and $\mathcal{B}$ could not tell the worlds apart. The EUF-CMA rule "$m^*$ must be new"
    is exactly what makes the reduction work.

??? question "8. A reduction turns a forger with advantage $\varepsilon$ into a discrete-log solver with advantage $\varepsilon^2 / q_H$. With $q_H = 2^{60}$ and a 256-bit curve (128-bit discrete log security), what does the proof guarantee?"

    For the solver's advantage to stay below about $2^{-128}$ (per unit of work), we need
    $\varepsilon^2 / 2^{60} \le 2^{-128}$, so $\varepsilon \le 2^{-34}$. The proof guarantees only about 34 bits
    against forgers making that many hash queries, far below 128. Either use bigger parameters
    or accept that the known attacks, not the proof, justify the 128-bit claim.

??? question "9. Why does a random oracle proof say nothing about the length-extension attack on SHA-256 used as $\mathrm{SHA256}(k \,\Vert\, m)$?"

    A random oracle has no internal structure, so $H(k \,\Vert\, m \,\Vert\, x)$ is unrelated to $H(k \,\Vert\, m)$.
    SHA-256 is a Merkle-Damgård hash whose output is its internal state, so the attacker can
    continue hashing from it. The attack uses exactly the structure the model abstracts away.
    HMAC was designed to be secure without that assumption.

## What you learned

- A security definition fixes three things: what the attacker can do, what
  counts as winning, and how much it may spend.
- IND-CPA, IND-CCA2 and EUF-CMA are games; the attacker's **advantage**
  measures how much better than guessing it plays.
- IND-CPA security needs randomized encryption; IND-CCA2 security needs
  non-malleability, which for symmetric schemes means authenticated encryption.
- A proof by **reduction** is an algorithm that turns any attacker on the scheme
  into a solver for a hard problem; its tightness decides how much security is left.
- The random oracle, ideal cipher and generic group models are useful idealizations,
  not facts about real hash functions or groups.
- Definitions found real bugs (BEAST, SSH's packet format, padding oracles,
  Bitcoin malleability, the Triple Handshake), but proofs say nothing about side
  channels, false assumptions or misuse.

**Next:** [Chapter 18](18-Side-Channels.md), where the attacker measures the
machine instead of playing the game.

## Further reading

- Jonathan Katz and Yehuda Lindell, *Introduction to Modern Cryptography* (3rd
  edition, CRC Press, 2020). The standard textbook for definitions and proofs.
- Dan Boneh and Victor Shoup, *A Graduate Course in Applied Cryptography*, free
  online at [toc.cryptobook.us](https://toc.cryptobook.us/). Concrete, game-based proofs throughout.
- Oded Goldreich, *Foundations of Cryptography* (two volumes, Cambridge, 2001 and 2004).
- Shafi Goldwasser and Silvio Micali, "Probabilistic Encryption", *Journal of
  Computer and System Sciences* 28 (1984).
- Mihir Bellare and Phillip Rogaway, "Random Oracles are Practical", ACM CCS 1993.
- Mihir Bellare and Chanathip Namprempre, "Authenticated Encryption: Relations
  among Notions and Analysis of the Generic Composition Paradigm", ASIACRYPT 2000.
- Victor Shoup, "Sequences of Games: A Tool for Taming Complexity in Security
  Proofs" (2004).
- Neal Koblitz and Alfred Menezes, "Another Look at 'Provable Security'",
  *Journal of Cryptology* 20 (2007).
