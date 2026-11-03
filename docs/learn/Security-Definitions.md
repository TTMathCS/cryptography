# Security definitions and proofs

*What it means, precisely, for encryption or a signature to be secure: the
games cryptographers play, the proofs by reduction that connect a scheme to a
hard problem, and where those proofs stop.*

Up to the 1980s a cipher was "secure" if nobody had broken it yet. Modern
cryptography asks for more: a written definition of what the attacker may do
and what counts as winning, and a proof that winning is as hard as some
well-studied problem.

## Semantic security: the indistinguishability game

**The story.** Shafi Goldwasser and Silvio Micali, at MIT, defined it in
"Probabilistic Encryption" (1982, journal version 1984). Their insight was that
encryption must be **randomised**: if the same message always encrypts the same
way, an attacker can tell whether two ciphertexts carry the same message, or
check a guess by encrypting it. They won the Turing Award for this work in 2012.

**The game (IND-CPA).** A challenger holds the key. The attacker:

1. may ask for encryptions of any messages it likes (that's the "chosen
   plaintext attack", CPA);
2. picks two messages $m_0, m_1$ of the same length;
3. receives $c = E(m_b)$ for a secret random bit $b$;
4. may ask for more encryptions, then guesses $b$.

The scheme is **IND-CPA secure** if no efficient attacker guesses right with
probability noticeably better than $\frac12$. The **advantage** is
$\left|\Pr[\text{guess} = b] - \frac12\right| \cdot 2$, and it must be
[negligible](Probability-and-Security-Levels.md#negligible).

Goldwasser and Micali showed this is equivalent to **semantic security**:
whatever you can work out about the message from the ciphertext, you could
have worked out without it.

**Textbook RSA loses at once.** It's deterministic, so the attacker encrypts
$m_0$ itself with the public key and compares:

```python
import secrets

def rsa_textbook(m, n=3233, e=17):
    return pow(m, e, n)

m0, m1 = 65, 66
b = secrets.randbelow(2)
c = rsa_textbook([m0, m1][b])
guess = 0 if rsa_textbook(m0) == c else 1
print(b == guess)        # always True
```

So do ECB mode and any cipher used without a fresh nonce or IV. This is why
RSA needs [OAEP](../02-signatures/RSA.md) padding with randomness and why every
modern mode takes a nonce.

## Chosen-ciphertext security (IND-CCA2)

Give the attacker more: in step 1 and step 4 it may also ask for
**decryptions** of any ciphertext except the challenge $c$ itself. If it still
can't guess $b$, the scheme is **IND-CCA2 secure**. This is the standard every
public-key encryption and KEM on this site aims for.

It sounds artificial, but real systems hand out decryption results all the
time: a server that answers "bad padding" or "MAC failed" or just takes a little
longer on some inputs is a partial decryption oracle.

**Malleable schemes fail it.** Textbook RSA lets you multiply a ciphertext by
$2^e$, and the plaintext doubles:

```python
n, e, d = 3233, 17, 2753
c = pow(65, e, n)
c2 = c * pow(2, e, n) % n           # Mallory changes the ciphertext
print(pow(c2, d, n))                # 130 = 2 * 65
```

Ask for the decryption of $c_2$ (allowed, it isn't $c$), divide by 2, done.
**Bleichenbacher's 1998 attack** used only the one-bit answer "is the padding
valid?" from SSL servers, about a million times, to decrypt a session key. CCA
security is what rules out that whole family.

For symmetric encryption the matching goal is **authenticated encryption**:
IND-CPA plus **ciphertext integrity** (the attacker can't make any new ciphertext
that decrypts). Bellare and Namprempre showed in 2000 that this implies IND-CCA2,
and that **encrypt-then-MAC** always achieves it while MAC-then-encrypt may not.
That's the theory behind [AEAD](../05-modes-aead/AEAD.md).

## Unforgeability for signatures and MACs (EUF-CMA)

**The game.** The attacker gets the public key (for signatures) and may ask for
signatures or tags on any messages it chooses: a **chosen message attack**. It
wins if it outputs a valid signature on **any** message it didn't ask about.
A scheme where no efficient attacker wins is **existentially unforgeable under
chosen message attack**, EUF-CMA. The definition is from Goldwasser, Micali and
Rivest (1988).

**SUF-CMA** (strong) also counts a *new* signature on an *old* message as a win.
ECDSA is not strongly unforgeable: if $(r, s)$ is valid, so is $(r, -s)$. That
gap let attackers change Bitcoin transaction IDs ("malleability"), part of the
trouble around the Mt. Gox exchange in 2014. Ed25519 and BIP-340 Schnorr check
for it.

## Proofs by reduction

A security proof is an algorithm. It says: **if** an attacker $\mathcal{A}$ breaks
scheme $S$ with advantage $\varepsilon$ in time $t$, **then** here is an
algorithm $\mathcal{B}$ that uses $\mathcal{A}$ as a subroutine to solve hard
problem $P$ with advantage about $\varepsilon$ in time about $t$. Since we
believe nobody can solve $P$, nobody can break $S$.

A small example. **Claim:** if $F$ is a secure pseudorandom function (PRF), then
the MAC $\mathrm{tag} = F_k(m)$ is EUF-CMA.

**Proof sketch.** Suppose $\mathcal{A}$ forges with probability $\varepsilon$.
Build $\mathcal{B}$, which is given an oracle that is either $F_k$ or a truly
random function, and must say which. $\mathcal{B}$ runs $\mathcal{A}$, answers
its tag requests with the oracle, and checks $\mathcal{A}$'s forgery $(m^*, t^*)$
by querying $m^*$. If the oracle is $F_k$, the forgery is right with probability
$\varepsilon$. If it's random, $t^*$ is right with probability $2^{-n}$, since
$\mathcal{A}$ never saw that value. So $\mathcal{B}$ tells them apart with
advantage $\varepsilon - 2^{-n}$, which contradicts $F$ being a PRF unless
$\varepsilon$ is tiny. $\square$

Most proofs on this site's "Going deeper" boxes have this shape. The details
matter: how many queries, how much time, and how **tight** the reduction is. A
loose reduction that loses a factor of $2^{40}$ means the scheme's guarantee is
40 bits weaker than the problem's.

## Models and what they assume

- **Standard model:** only the stated assumption (factoring is hard, AES is a
  PRP). The strongest kind of proof.
- **Random oracle model:** Mihir Bellare and Phillip Rogaway (1993) proposed
  proving schemes as if the hash function were a perfectly random function
  everybody can query. It made proofs possible for OAEP, PSS, Schnorr
  signatures (via Fiat-Shamir) and most of the post-quantum KEMs. The catch:
  Canetti, Goldreich and Halevi (1998) built a scheme secure in this model but
  insecure with *any* real hash. Such schemes are artificial, and nobody has
  found a natural one, so the model is trusted in practice but known to be a
  heuristic.
- **Generic group model:** the attacker can only use the group operations.
  It's the basis for the $\sqrt{q}$ lower bound on discrete logs that justifies
  256-bit curves.
- **Quantum random oracle model (QROM):** the attacker may query the hash in
  superposition. Needed for post-quantum proofs, and the reason the
  Fujisaki-Okamoto transform in ML-KEM has the exact shape it has.

## Where proofs stop

A proof is about a model, not about a machine. Many real breaks happened to
"provably secure" schemes because something outside the model leaked:

- **Timing and power.** The proof assumes the attacker sees only inputs and
  outputs. [Side channels](Side-Channels.md) break that.
- **Wrong assumption.** A proof is only as good as its problem. SIKE had
  careful proofs; the isogeny problem it assumed was broken in 2022.
- **Wrong definition.** OCB2 had a published proof that turned out to contain an
  error; it was broken in 2018. TLS's MAC-then-encrypt was "proved" in a model
  that didn't include padding errors.
- **Misuse.** Proofs assume nonces never repeat and keys are random. Real
  systems repeat nonces (KRACK, PS3).

So proofs don't replace cryptanalysis. They tell you which part you need to
trust, and attackers then look everywhere else.

## Try it

??? question "1. Does AES in CTR mode with a random nonce meet IND-CPA? Does it meet IND-CCA2?"

    IND-CPA yes (if AES is a PRP and nonces don't repeat). IND-CCA2 no: flip a bit of
    the challenge ciphertext, ask for its decryption (allowed, it's a different
    ciphertext), flip the bit back. Adding a MAC (encrypt-then-MAC) fixes it.

??? question "2. A signature scheme lets anyone turn a valid signature on $m$ into a different valid signature on $m$. Is it EUF-CMA? SUF-CMA?"

    It can still be EUF-CMA: no signature on a *new* message. It isn't SUF-CMA, which
    counts a new signature on an old message as a forgery.

??? question "3. Why can't an IND-CPA secure public-key scheme be deterministic?"

    Anyone can encrypt with the public key. The attacker encrypts $m_0$ itself and
    compares it with the challenge, winning every time.
