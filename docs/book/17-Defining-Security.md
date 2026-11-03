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
graduate students of Manuel Blum at the University of California, Berkeley,
Shafi Goldwasser (born in New York, raised in Israel) and Silvio Micali (from
Palermo, Sicily), were working on an odd problem: how to play poker over the
telephone, so that nobody could learn anything about the other players' cards,
not even one card's color. Textbook RSA fails at once: anyone can encrypt all
52 cards with the public key and compare. So they asked a smaller question: what if the
attacker is not all-powerful, just limited to a reasonable amount of computing?
Their paper "Probabilistic Encryption and How to Play Mental Poker Keeping
Secret All Partial Information" (STOC 1982; journal version, "Probabilistic
Encryption", 1984) defined security as a guessing game the attacker cannot win
noticeably better than by flipping a coin. It also showed that any scheme meeting the definition must be
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

<figure class="mars-fig" id="fig-17-timeline">
<svg viewBox="0 0 640 554" width="640" role="img" aria-label="Timeline of security definitions from Shannon in 1949 to TLS 1.3 in 2018"><line x1="86" y1="16" x2="86" y2="514" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/><text x="70" y="29" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1949</text><circle cx="86" cy="24" r="6" fill="currentColor" stroke="none"/><text x="104" y="25" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Shannon: perfect secrecy</text><text x="104" y="41" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">the one-time pad; unlimited attackers</text><text x="70" y="69" font-size="14" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">1982</text><circle cx="86" cy="64" r="6" class="acc-fill" stroke="none"/><text x="104" y="65" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">Goldwasser and Micali: probabilistic encryption</text><text x="104" y="81" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">semantic security and the first game; Yao the same year</text><text x="70" y="109" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1988</text><circle cx="86" cy="104" r="6" fill="currentColor" stroke="none"/><text x="104" y="105" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Goldwasser, Micali, Rivest: unforgeability</text><text x="104" y="121" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">signatures under chosen-message attack</text><text x="70" y="149" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1990</text><circle cx="86" cy="144" r="6" fill="currentColor" stroke="none"/><text x="104" y="145" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Naor and Yung: chosen-ciphertext (CCA1)</text><text x="104" y="161" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">the lunchtime attack</text><text x="70" y="189" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1991</text><circle cx="86" cy="184" r="6" fill="currentColor" stroke="none"/><text x="104" y="185" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Rackoff and Simon: CCA2; Dolev, Dwork, Naor</text><text x="104" y="201" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">adaptive decryption queries; non-malleability</text><text x="70" y="229" font-size="14" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">1993</text><circle cx="86" cy="224" r="6" class="acc-fill" stroke="none"/><text x="104" y="225" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">Bellare and Rogaway: random oracles</text><text x="104" y="241" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">proofs for practical hash-based schemes</text><text x="70" y="269" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1996</text><circle cx="86" cy="264" r="6" fill="currentColor" stroke="none"/><text x="104" y="265" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Pointcheval and Stern: forking lemma</text><text x="104" y="281" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">Schnorr signatures proved, loosely</text><text x="70" y="309" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1997</text><circle cx="86" cy="304" r="6" fill="currentColor" stroke="none"/><text x="104" y="305" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Shoup: generic group model</text><text x="104" y="321" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">the square-root bound for discrete logs</text><text x="70" y="349" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1998</text><circle cx="86" cy="344" r="6" fill="currentColor" stroke="none"/><text x="104" y="345" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Cramer-Shoup; Canetti, Goldreich, Halevi</text><text x="104" y="361" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">CCA2 without oracles; the ROM's warning</text><text x="70" y="389" font-size="14" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">2000</text><circle cx="86" cy="384" r="6" class="acc-fill" stroke="none"/><text x="104" y="385" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">Bellare and Namprempre: authenticated encryption</text><text x="104" y="401" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">encrypt-then-MAC is the safe order</text><text x="70" y="429" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2001</text><circle cx="86" cy="424" r="6" fill="currentColor" stroke="none"/><text x="104" y="425" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Canetti: universal composability</text><text x="104" y="441" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">security that survives combination</text><text x="70" y="469" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2004</text><circle cx="86" cy="464" r="6" fill="currentColor" stroke="none"/><text x="104" y="465" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Shoup: sequences of games</text><text x="104" y="481" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">the proof style used today</text><text x="70" y="509" font-size="14" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">2018</text><circle cx="86" cy="504" r="6" class="acc-fill" stroke="none"/><text x="104" y="505" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">TLS 1.3 published with proofs</text><text x="104" y="521" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">drafts analyzed by many teams</text></svg>
<figcaption>Figure 17.1. From Shannon to TLS 1.3: the definitions this chapter teaches, in the order they were found. Highlighted: the turning points.</figcaption>
</figure>

!!! note "Life story: semantic security and IND-CPA"
    **Born:** 1982, UC Berkeley (Shafi Goldwasser and Silvio Micali, students of Manuel Blum) · **Purpose:** to
    say exactly when encryption hides *all* partial information, first for mental poker · **Helped:** made
    randomized encryption the norm (random IVs and nonces, OAEP, ElGamal-style ephemeral keys) and started the
    practice of definition, scheme, proof · **Status:** current; IND-CPA is the minimum every encryption scheme
    is held to, and the work earned Goldwasser and Micali the 2012 Turing Award

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

<figure class="mars-fig" id="fig-17-grid">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Grid of attack models against attacker goals; the strongest security is IND-CCA2 in the corner"><text x="375" y="20" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">attacker's power (what it may ask for)</text><text x="195" y="46" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">COA</text><text x="285" y="46" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">KPA</text><text x="375" y="46" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">CPA</text><text x="465" y="46" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">CCA1</text><text x="555" y="46" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">CCA2</text><text x="140" y="84" font-size="13" text-anchor="end" fill="currentColor" stroke="none">key recovery</text><text x="140" y="130" font-size="13" text-anchor="end" fill="currentColor" stroke="none">total break</text><text x="140" y="176" font-size="13" text-anchor="end" fill="currentColor" stroke="none">one-wayness</text><text x="140" y="222" font-size="13" text-anchor="end" fill="currentColor" stroke="none">indistinguish.</text><rect x="152" y="58" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.04"/><rect x="152" y="58" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="152" y="104" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.11"/><rect x="152" y="104" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="152" y="150" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.18"/><rect x="152" y="150" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="152" y="196" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.25"/><rect x="152" y="196" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="242" y="58" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.11"/><rect x="242" y="58" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="242" y="104" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.18"/><rect x="242" y="104" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="242" y="150" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.25"/><rect x="242" y="150" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="242" y="196" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.33"/><rect x="242" y="196" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="332" y="58" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.18"/><rect x="332" y="58" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="332" y="104" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.25"/><rect x="332" y="104" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="332" y="150" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.33"/><rect x="332" y="150" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="332" y="196" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.40"/><rect x="332" y="196" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="422" y="58" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.25"/><rect x="422" y="58" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="422" y="104" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.33"/><rect x="422" y="104" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="422" y="150" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.40"/><rect x="422" y="150" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="422" y="196" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.47"/><rect x="422" y="196" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="512" y="58" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.33"/><rect x="512" y="58" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="512" y="104" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.40"/><rect x="512" y="104" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="512" y="150" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.47"/><rect x="512" y="150" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><rect x="512" y="196" width="86" height="42" class="soft-acc" stroke="none" style="fill-opacity:0.54"/><rect x="512" y="196" width="86" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="0.8"/><text x="555" y="222" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">IND-CCA2</text><text x="375" y="222" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IND-CPA</text><text x="375" y="176" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">OW-CPA</text><rect x="512" y="196" width="86" height="42" rx="4" class="acc" fill="none" stroke-width="3"/><line x1="150" y1="262" x2="600" y2="262" stroke="currentColor" stroke-width="1.5"/><polygon points="600,262 592.7,265.3 592.7,258.7" fill="currentColor" stroke="none"/><text x="375" y="282" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">stronger attacker allowed → stronger guarantee</text><line x1="10" y1="56" x2="10" y2="240" stroke="currentColor" stroke-width="1.5"/><polygon points="10,240 6.7,232.7 13.3,232.7" fill="currentColor" stroke="none"/><text x="24" y="148" font-size="12" text-anchor="middle" fill="currentColor" stroke="none" fill-opacity="0.85" transform="rotate(-90 24 148)">smaller goal denied → stronger</text></svg>
<figcaption>Figure 17.2. Every definition is one cell: an attack model (column) and a goal the attacker must not reach (row). Textbook RSA is one-way under CPA (OW-CPA) but not IND-CPA. The darkest corner, IND-CCA2, is what modern public-key encryption aims for.</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-indcpa">
<svg viewBox="0 0 620 400" width="620" role="img" aria-label="Message sequence of the IND-CPA game between challenger and adversary"><rect x="90" y="12" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="90" y="12" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="150" y="31.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Challenger</text><text x="150" y="58" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">key k, secret bit b</text><line x1="150" y1="64" x2="150" y2="332" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="410" y="12" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="410" y="12" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="470" y="31.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Adversary</text><text x="470" y="58" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">wants to find b</text><line x1="470" y1="64" x2="470" y2="332" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="470" y1="100" x2="150" y2="100" stroke="currentColor" stroke-width="1.5"/><polygon points="150,100 157.3,96.7 157.3,103.3" fill="currentColor" stroke="none"/><text x="310" y="94" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">m  (any message)</text><line x1="150" y1="134" x2="470" y2="134" stroke="currentColor" stroke-width="1.5"/><polygon points="470,134 462.7,137.3 462.7,130.7" fill="currentColor" stroke="none"/><text x="310" y="128" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Eₖ(m)</text><text x="488" y="118" font-size="11" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">repeat as often</text><text x="488" y="132" font-size="11" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">as it likes</text><line x1="470" y1="190" x2="150" y2="190" stroke="currentColor" stroke-width="1.5"/><polygon points="150,190 157.3,186.7 157.3,193.3" fill="currentColor" stroke="none"/><text x="310" y="184" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">m₀, m₁  (same length)</text><line x1="150" y1="234" x2="470" y2="234" class="acc" stroke-width="1.5"/><polygon points="470,234 462.7,237.3 462.7,230.7" class="acc-fill" stroke="none"/><text x="310" y="228" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">challenge  c = Eₖ(m<tspan dy="4" font-size="9">b</tspan><tspan dy="-4">&#8203;</tspan>)</text><line x1="470" y1="278" x2="150" y2="278" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/><polygon points="150,278 157.3,274.7 157.3,281.3" fill="currentColor" stroke="none"/><text x="310" y="272" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">more queries m</text><line x1="150" y1="306" x2="470" y2="306" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/><polygon points="470,306 462.7,309.3 462.7,302.7" fill="currentColor" stroke="none"/><text x="310" y="300" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Eₖ(m)</text><rect x="400" y="340" width="140" height="34" rx="6" class="soft-acc" stroke="none"/><rect x="400" y="340" width="140" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="470" y="361.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">outputs b′</text><rect x="60" y="340" width="180" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="150" y="361.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">wins if b′ = b</text></svg>
<figcaption>Figure 17.3. The IND-CPA game as a conversation. The only thing hidden from the adversary is which of its own two messages was encrypted.</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-ecb">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="ECB encrypts equal blocks to equal blocks, so the adversary tells m0 from m1"><text x="40" y="58" font-size="15" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">m₀</text><rect x="70" y="38" width="64" height="32" rx="6" class="soft" stroke="none"/><rect x="70" y="38" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="102" y="58.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">A</text><rect x="140" y="38" width="64" height="32" rx="6" class="soft" stroke="none"/><rect x="140" y="38" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="172" y="58.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">A</text><line x1="214" y1="54" x2="300" y2="54" stroke="currentColor" stroke-width="1.5"/><polygon points="300,54 292.7,57.3 292.7,50.7" fill="currentColor" stroke="none"/><text x="257" y="46" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">AES-ECB</text><rect x="310" y="38" width="64" height="32" rx="6" class="soft-acc" stroke="none"/><rect x="310" y="38" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="342" y="58.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">X</text><rect x="380" y="38" width="64" height="32" rx="6" class="soft-acc" stroke="none"/><rect x="380" y="38" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="412" y="58.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">X</text><text x="470" y="52" font-size="13" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">halves equal</text><text x="470" y="68" font-size="13" text-anchor="start" fill="currentColor" stroke="none">→ say 0</text><text x="40" y="143" font-size="15" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">m₁</text><rect x="70" y="123" width="64" height="32" rx="6" class="soft" stroke="none"/><rect x="70" y="123" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="102" y="143.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">A</text><rect x="140" y="123" width="64" height="32" rx="6" class="soft" stroke="none"/><rect x="140" y="123" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="172" y="143.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">B</text><line x1="214" y1="139" x2="300" y2="139" stroke="currentColor" stroke-width="1.5"/><polygon points="300,139 292.7,142.3 292.7,135.7" fill="currentColor" stroke="none"/><text x="257" y="131" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">AES-ECB</text><rect x="310" y="123" width="64" height="32" rx="6" class="soft" stroke="none"/><rect x="310" y="123" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="342" y="143.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">X</text><rect x="380" y="123" width="64" height="32" rx="6" class="soft" stroke="none"/><rect x="380" y="123" width="64" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="412" y="143.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">Y</text><text x="470" y="137" font-size="13" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">halves differ</text><text x="470" y="153" font-size="13" text-anchor="start" fill="currentColor" stroke="none">→ say 1</text><text x="320" y="192" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">A block cipher is a permutation, so different blocks never encrypt alike.</text></svg>
<figcaption>Figure 17.4. The ECB spotter. Each 16-byte block is encrypted on its own, so equal plaintext blocks show up as equal ciphertext blocks, and one look at the challenge reveals b.</figcaption>
</figure>

<figure class="mars-fig" id="fig-17-advantage">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Bar chart of win probability and advantage for four adversaries"><line x1="170" y1="34" x2="170" y2="210" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.35"/><text x="170" y="228" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">0</text><line x1="277.5" y1="34" x2="277.5" y2="210" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.35"/><text x="277.5" y="228" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">0.25</text><line x1="385" y1="34" x2="385" y2="210" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.35"/><text x="385" y="228" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">0.5</text><line x1="492.5" y1="34" x2="492.5" y2="210" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.35"/><text x="492.5" y="228" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">0.75</text><line x1="600" y1="34" x2="600" y2="210" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.35"/><text x="600" y="228" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">1</text><text x="385" y="248" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">probability of guessing b correctly</text><line x1="385" y1="26" x2="385" y2="212" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/><text x="385" y="22" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">guessing</text><text x="160" y="62" font-size="13" text-anchor="end" fill="currentColor" stroke="none">coin flipper</text><rect x="170" y="46" width="215" height="26" rx="3" class="soft" stroke="none"/><text x="393" y="64" font-size="12" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Adv = 0</text><text x="160" y="104" font-size="13" text-anchor="end" fill="currentColor" stroke="none">lucky reader</text><rect x="170" y="88" width="215" height="26" rx="3" class="soft" stroke="none"/><rect x="385" y="88" width="107.5" height="26" rx="3" class="soft-acc" stroke="none"/><rect x="385" y="88" width="107.5" height="26" rx="3" class="acc" fill="none" stroke-width="1.5"/><text x="500.5" y="106" font-size="12" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Adv = 0.5</text><text x="160" y="146" font-size="13" text-anchor="end" fill="currentColor" stroke="none">ECB spotter</text><rect x="170" y="130" width="215" height="26" rx="3" class="soft" stroke="none"/><rect x="385" y="130" width="215" height="26" rx="3" class="soft-acc" stroke="none"/><rect x="385" y="130" width="215" height="26" rx="3" class="acc" fill="none" stroke-width="1.5"/><text x="592" y="148" font-size="12" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">Adv = 1</text><text x="160" y="188" font-size="13" text-anchor="end" fill="currentColor" stroke="none">re-encryptor</text><rect x="170" y="172" width="215" height="26" rx="3" class="soft" stroke="none"/><rect x="385" y="172" width="215" height="26" rx="3" class="soft-acc" stroke="none"/><rect x="385" y="172" width="215" height="26" rx="3" class="acc" fill="none" stroke-width="1.5"/><text x="592" y="190" font-size="12" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">Adv = 1</text></svg>
<figcaption>Figure 17.5. Advantage is twice the distance past one half. The coin flipper sits exactly at guessing (advantage 0); the ECB spotter and the re-encryptor are always right (advantage 1).</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-indcca">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="IND-CCA2 game played against textbook RSA with the toy key; the decryption oracle refuses only the challenge"><rect x="90" y="12" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="90" y="12" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="150" y="31.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Challenger</text><text x="150" y="58" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">n = 3233, e = 17, d secret</text><line x1="150" y1="64" x2="150" y2="308" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="430" y="12" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="430" y="12" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="490" y="31.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Adversary</text><text x="490" y="58" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">knows n and e</text><line x1="490" y1="64" x2="490" y2="308" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="490" y1="100" x2="150" y2="100" stroke="currentColor" stroke-width="1.5"/><polygon points="150,100 157.3,96.7 157.3,103.3" fill="currentColor" stroke="none"/><text x="320" y="94" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">m₀ = 65,  m₁ = 100</text><line x1="150" y1="140" x2="490" y2="140" class="acc" stroke-width="1.5"/><polygon points="490,140 482.7,143.3 482.7,136.7" class="acc-fill" stroke="none"/><text x="320" y="134" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">c = 65¹⁷ mod 3233 = 2790</text><text x="500" y="172" font-size="12" text-anchor="start" fill="currentColor" stroke="none">c′ = 2790 · 2¹⁷ mod 3233</text><text x="500" y="188" font-size="12" text-anchor="start" fill="currentColor" stroke="none">    = 2790 · 1752 mod 3233 = 3017</text><line x1="490" y1="222" x2="150" y2="222" stroke="currentColor" stroke-width="1.5"/><polygon points="150,222 157.3,218.7 157.3,225.3" fill="currentColor" stroke="none"/><text x="320" y="216" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">decrypt 3017?  (allowed: 3017 ≠ 2790)</text><line x1="150" y1="262" x2="490" y2="262" stroke="currentColor" stroke-width="1.5"/><polygon points="490,262 482.7,265.3 482.7,258.7" fill="currentColor" stroke="none"/><text x="320" y="256" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">130</text><text x="500" y="296" font-size="12" text-anchor="start" fill="currentColor" stroke="none">130 / 2 = 65 = m₀</text><rect x="420" y="320" width="140" height="34" rx="6" class="soft-acc" stroke="none"/><rect x="420" y="320" width="140" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="490" y="341.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">outputs b′ = 0</text><rect x="40" y="316" width="220" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="150" y="334.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">decryption oracle:</text><text x="150" y="349.7" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">anything except c itself</text><text x="320" y="395" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">Advantage 1: textbook RSA is malleable, so it is not IND-CCA2 (nor even IND-CPA).</text></svg>
<figcaption>Figure 17.6. The IND-CCA2 game with the toy RSA key. The adversary may not ask for the challenge 2790 itself, so it asks for a disguised version, 3017, and undoes the disguise.</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-compose">
<svg viewBox="0 0 660 320" width="660" role="img" aria-label="Block diagrams of encrypt-then-MAC, MAC-then-encrypt and encrypt-and-MAC"><text x="20" y="32" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">Encrypt-then-MAC (IPsec)</text><text x="640" y="32" font-size="12" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">always authenticated encryption</text><rect x="20" y="44" width="50" height="32" rx="6" class="soft" stroke="none"/><rect x="20" y="44" width="50" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="45" y="64.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">m</text><line x1="70" y1="60" x2="110" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="110,60 102.7,63.3 102.7,56.7" fill="currentColor" stroke="none"/><rect x="110" y="44" width="70" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="145" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Enc</text><line x1="180" y1="60" x2="230" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="230,60 222.7,63.3 222.7,56.7" fill="currentColor" stroke="none"/><rect x="230" y="44" width="50" height="32" rx="6" class="soft" stroke="none"/><rect x="230" y="44" width="50" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="255" y="64.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">c</text><line x1="280" y1="60" x2="330" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="330,60 322.7,63.3 322.7,56.7" fill="currentColor" stroke="none"/><rect x="330" y="44" width="70" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="365" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">MAC</text><line x1="400" y1="60" x2="450" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="450,60 442.7,63.3 442.7,56.7" fill="currentColor" stroke="none"/><rect x="450" y="44" width="50" height="32" rx="6" class="soft" stroke="none"/><rect x="450" y="44" width="50" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="475" y="64.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">t</text><text x="520" y="65" font-size="13" text-anchor="start" fill="currentColor" stroke="none">send c, t</text><text x="20" y="132" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">MAC-then-encrypt (SSL, TLS ≤ 1.2)</text><text x="640" y="132" font-size="12" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">depends on the cipher: padding oracles</text><rect x="20" y="144" width="50" height="32" rx="6" class="soft" stroke="none"/><rect x="20" y="144" width="50" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="45" y="164.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">m</text><line x1="70" y1="160" x2="110" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="110,160 102.7,163.3 102.7,156.7" fill="currentColor" stroke="none"/><rect x="110" y="144" width="70" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="145" y="164.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">MAC</text><line x1="180" y1="160" x2="230" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="230,160 222.7,163.3 222.7,156.7" fill="currentColor" stroke="none"/><rect x="230" y="144" width="80" height="32" rx="6" class="soft" stroke="none"/><rect x="230" y="144" width="80" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="270" y="164.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">m ‖ t</text><line x1="310" y1="160" x2="350" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="350,160 342.7,163.3 342.7,156.7" fill="currentColor" stroke="none"/><rect x="350" y="144" width="70" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="385" y="164.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Enc</text><line x1="420" y1="160" x2="460" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="460,160 452.7,163.3 452.7,156.7" fill="currentColor" stroke="none"/><rect x="460" y="144" width="50" height="32" rx="6" class="soft" stroke="none"/><rect x="460" y="144" width="50" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="485" y="164.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">c</text><text x="520" y="165" font-size="13" text-anchor="start" fill="currentColor" stroke="none">send c</text><text x="20" y="232" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Encrypt-and-MAC (SSH)</text><text x="640" y="232" font-size="12" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">not even IND-CPA in general</text><rect x="20" y="244" width="50" height="32" rx="6" class="soft" stroke="none"/><rect x="20" y="244" width="50" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="45" y="264.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">m</text><line x1="70" y1="254" x2="110" y2="254" stroke="currentColor" stroke-width="1.5"/><polygon points="110,254 102.7,257.3 102.7,250.7" fill="currentColor" stroke="none"/><rect x="110" y="238" width="70" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="145" y="256.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Enc</text><line x1="180" y1="252" x2="230" y2="252" stroke="currentColor" stroke-width="1.5"/><polygon points="230,252 222.7,255.3 222.7,248.7" fill="currentColor" stroke="none"/><rect x="230" y="238" width="50" height="28" rx="6" class="soft" stroke="none"/><rect x="230" y="238" width="50" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="255" y="256.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">c</text><path d="M45 276 L45 292 L110 292" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="110,292 102.7,295.3 102.7,288.7" fill="currentColor" stroke="none"/><rect x="110" y="278" width="70" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="145" y="296.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">MAC</text><line x1="180" y1="292" x2="230" y2="292" stroke="currentColor" stroke-width="1.5"/><polygon points="230,292 222.7,295.3 222.7,288.7" fill="currentColor" stroke="none"/><rect x="230" y="278" width="50" height="28" rx="6" class="soft" stroke="none"/><rect x="230" y="278" width="50" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="255" y="296.9" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">t</text><text x="300" y="277" font-size="13" text-anchor="start" fill="currentColor" stroke="none">send c, t</text><text x="390" y="277" font-size="12" text-anchor="start" class="acc-fill" stroke="none">t repeats when m does</text></svg>
<figcaption>Figure 17.7. The three ways to combine a cipher and a MAC, as Bellare and Namprempre classified them in 2000. Only encrypt-then-MAC lets the receiver reject a forgery before decrypting anything.</figcaption>
</figure>

At the time, SSL and TLS used MAC-then-encrypt, IPsec used encrypt-then-MAC, and
SSH used encrypt-and-MAC. Section 17.9 shows what happened to each. The modern
answer is to use an AEAD mode ([Chapter 10](10-Message-Authentication.md)) whose
proof already covers both halves.

!!! note "Life story: chosen-ciphertext security (IND-CCA)"
    **Born:** 1990, Moni Naor and Moti Yung (CCA1, the "lunchtime attack"); 1991, Charles Rackoff and Daniel
    Simon (adaptive CCA2) · **Purpose:** to model attackers who can get some ciphertexts decrypted ·
    **Helped:** looked academic until Bleichenbacher's 1998 attack on SSL; since then it is the target for
    RSA-OAEP, Cramer-Shoup, HPKE and ML-KEM · **Status:** current; IND-CCA2 is the standard requirement for
    public-key encryption and KEMs

!!! note "Life story: authenticated encryption"
    **Born:** 2000, Mihir Bellare and Chanathip Namprempre at UC San Diego, and independently Jonathan Katz and
    Moti Yung · **Purpose:** to settle how a cipher and a MAC should be combined · **Helped:** encrypt-then-MAC
    became the safe default, and one-pass AEAD modes became standards: GCM (NIST SP 800-38D, 2007),
    ChaCha20-Poly1305 (RFC 7539, 2015) · **Status:** current; TLS 1.3, SSH's modern modes, WireGuard and
    Signal all use authenticated encryption

## 17.6 Unforgeability

*Level: intermediate.*

For MACs and signatures the attacker's goal is not to read but to **forge**. The
standard game, from Goldwasser, Micali and Rivest (1988), is
**existential unforgeability under chosen-message attack**, EUF-CMA:

1. The challenger makes a key pair and gives the adversary the public key (for a MAC there is nothing public).
2. The adversary asks for signatures (or tags) on any messages it chooses, as many as it likes.
3. It outputs a pair $(m^*, \sigma^*)$.
4. It wins if $\sigma^*$ is valid for $m^*$ **and** $m^*$ was never one of its questions.

<figure class="mars-fig" id="fig-17-eufcma">
<svg viewBox="0 0 620 330" width="620" role="img" aria-label="The EUF-CMA game: signing queries, then a forgery on a new message"><rect x="90" y="12" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="90" y="12" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="150" y="31.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Challenger</text><text x="150" y="58" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">secret key sk</text><line x1="150" y1="64" x2="150" y2="212" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><rect x="410" y="12" width="120" height="30" rx="6" class="soft" stroke="none"/><rect x="410" y="12" width="120" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="470" y="31.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">Adversary</text><text x="470" y="58" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">public key pk</text><line x1="470" y1="64" x2="470" y2="212" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.6"/><line x1="470" y1="100" x2="150" y2="100" stroke="currentColor" stroke-width="1.5"/><polygon points="150,100 157.3,96.7 157.3,103.3" fill="currentColor" stroke="none"/><text x="310" y="94" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">mᵢ  (any message)</text><line x1="150" y1="134" x2="470" y2="134" stroke="currentColor" stroke-width="1.5"/><polygon points="470,134 462.7,137.3 462.7,130.7" fill="currentColor" stroke="none"/><text x="310" y="128" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">σᵢ = Sign(sk, mᵢ)</text><text x="488" y="120" font-size="11" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">as many as</text><text x="488" y="134" font-size="11" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">it likes</text><line x1="470" y1="190" x2="150" y2="190" class="acc" stroke-width="1.5"/><polygon points="150,190 157.3,186.7 157.3,193.3" class="acc-fill" stroke="none"/><text x="310" y="184" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">forgery (m*, σ*)</text><rect x="30" y="220" width="240" height="64" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="150" y="241.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">wins if Verify(pk, m*, σ*) = ok</text><text x="150" y="256.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">and m* ∉ {m₁, m₂, …}  (EUF)</text><text x="150" y="271.2" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">or (m*, σ*) is new  (SUF)</text></svg>
<figcaption>Figure 17.8. Existential unforgeability under chosen-message attack. Strong unforgeability (SUF) changes only the winning rule: a new signature on an old message also counts.</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-malleable">
<svg viewBox="0 0 660 210" width="660" role="img" aria-label="Flipping s to n minus s gives a second valid ECDSA signature and a different Bitcoin transaction identifier"><rect x="20" y="30" width="240" height="60" rx="6" class="soft" stroke="none"/><rect x="20" y="30" width="240" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="140" y="56.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">payment: A pays B</text><text x="140" y="72.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">signature (r, s)</text><rect x="400" y="30" width="240" height="60" rx="6" class="soft-acc" stroke="none"/><rect x="400" y="30" width="240" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="520" y="56.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">payment: A pays B</text><text x="520" y="72.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">signature (r, n − s)</text><line x1="260" y1="60" x2="400" y2="60" class="acc" stroke-width="1.5"/><polygon points="400,60 392.7,63.3 392.7,56.7" class="acc-fill" stroke="none"/><text x="330" y="50" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">relay flips s</text><text x="140" y="116" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">valid ✓</text><text x="520" y="116" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">valid ✓</text><text x="140" y="146" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">txid = hash(transaction)</text><text x="520" y="146" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">txid′ = hash(transaction′)</text><text x="330" y="182" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">same payment, two identifiers: software that tracked txid got confused</text></svg>
<figcaption>Figure 17.9. ECDSA is EUF-CMA but not SUF-CMA. Before Segregated Witness (2017), Bitcoin hashed the signature into the transaction identifier, so a relay could change the identifier without touching the payment.</figcaption>
</figure>

!!! note "Life story: unforgeability (EUF-CMA)"
    **Born:** 1984 (STOC), journal version 1988, MIT (Shafi Goldwasser, Silvio Micali and Ron Rivest, one of the
    three inventors of RSA) · **Purpose:** to define a signature that resists an attacker who can get anything
    else signed · **Helped:** every signature standard since states its goal this way: RSA-PSS, ECDSA, EdDSA,
    ML-DSA, SLH-DSA · **Status:** current; the stronger SUF-CMA is preferred wherever signatures feed into
    identifiers, as Bitcoin learned

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

<figure class="mars-fig" id="fig-17-reduction">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="The reduction B runs the forger A inside it and answers A's tag queries with its own oracle"><rect x="20" y="30" width="420" height="250" rx="10" class="soft-acc" stroke="none"/><rect x="20" y="30" width="420" height="250" rx="10" class="acc" fill="none" stroke-width="2"/><text x="40" y="54" font-size="14" text-anchor="start" font-weight="700" class="acc-fill" stroke="none">B  (the reduction)</text><rect x="50" y="80" width="160" height="110" rx="6" class="soft" stroke="none"/><rect x="50" y="80" width="160" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="130" y="131.4" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">A</text><text x="130" y="148.4" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">(any forger)</text><rect x="500" y="100" width="140" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="570" y="136.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">oracle O</text><text x="570" y="152.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Fₖ or random R ?</text><line x1="210" y1="105" x2="500" y2="120" stroke="currentColor" stroke-width="1.5"/><polygon points="500,120 492.5,122.9 492.9,116.4" fill="currentColor" stroke="none"/><text x="330" y="100" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">tag query m</text><line x1="500" y1="160" x2="210" y2="150" stroke="currentColor" stroke-width="1.5"/><polygon points="210,150 217.4,147 217.2,153.5" fill="currentColor" stroke="none"/><text x="330" y="168" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">O(m)</text><line x1="130" y1="190" x2="130" y2="225" stroke="currentColor" stroke-width="1.5"/><polygon points="130,225 126.7,217.7 133.3,217.7" fill="currentColor" stroke="none"/><text x="130" y="244" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">A outputs (m*, t*)</text><line x1="250" y1="236" x2="500" y2="175" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/><polygon points="500,175 493.7,179.9 492.1,173.6" fill="currentColor" stroke="none"/><text x="390" y="230" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">ask O(m*)</text><text x="150" y="268" font-size="12" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">O(m*) = t*  →  say "PRF",  else "random"</text><line x1="440" y1="268" x2="560" y2="268" class="acc" stroke-width="1.5"/><polygon points="560,268 552.7,271.3 552.7,264.7" class="acc-fill" stroke="none"/><text x="600" y="272" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">B's guess</text></svg>
<figcaption>Figure 17.10. A reduction is an algorithm. B plays the challenger for A without knowing any key, by forwarding every question to its own oracle. If A forges against the real PRF, B notices.</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-tight">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Bar chart: what a 128-bit assumption guarantees after tight and loose reductions"><text x="240" y="41" font-size="12" text-anchor="end" fill="currentColor" stroke="none">assumption (e.g. AES, discrete log)</text><rect x="250" y="24" width="360" height="26" rx="3" class="soft" stroke="none"/><text x="602" y="42" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">128 bits</text><text x="240" y="85" font-size="12" text-anchor="end" fill="currentColor" stroke="none">tight reduction (PRF → MAC)</text><rect x="250" y="68" width="360" height="26" rx="3" class="soft" stroke="none"/><text x="602" y="86" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">128 bits</text><text x="240" y="129" font-size="12" text-anchor="end" fill="currentColor" stroke="none">reduction losing 2⁴⁰</text><rect x="250" y="112" width="247.5" height="26" rx="3" class="soft-acc" stroke="none"/><text x="489.5" y="130" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">88 bits</text><text x="240" y="173" font-size="12" text-anchor="end" fill="currentColor" stroke="none">forking lemma, q<tspan dy="4" font-size="9">H</tspan><tspan dy="-4">&#8203;</tspan> = 2⁶⁰</text><rect x="250" y="156" width="95.6" height="26" rx="3" class="soft-acc" stroke="none"/><text x="337.6" y="174" font-size="13" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">34 bits</text><text x="250" y="205" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0</text><line x1="250" y1="18" x2="250" y2="192" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="340" y="205" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">32</text><line x1="340" y1="18" x2="340" y2="192" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="430" y="205" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">64</text><line x1="430" y1="18" x2="430" y2="192" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="520" y="205" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">96</text><line x1="520" y1="18" x2="520" y2="192" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="610" y="205" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">128</text><line x1="610" y1="18" x2="610" y2="192" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.3"/><text x="430" y="224" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">proven security level (bits)</text></svg>
<figcaption>Figure 17.11. Tightness decides how much of the assumption survives. The bottom bar is exercise 8: with a quadratic loss and 2⁶⁰ hash queries, the proof alone promises only about 34 bits.</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-rom">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="In the random oracle model the reduction holds the hash table: it sees every query and can program answers"><rect x="20" y="80" width="130" height="70" rx="6" class="soft" stroke="none"/><rect x="20" y="80" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="85" y="111.4" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">adversary</text><text x="85" y="128.4" font-size="14" text-anchor="middle" fill="currentColor" stroke="none">A</text><rect x="230" y="20" width="390" height="200" rx="10" class="acc" fill="none" stroke-width="1.5" stroke-dasharray="6 4"/><text x="425" y="42" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">controlled by the reduction B</text><rect x="260" y="60" width="200" height="140" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="360" y="80" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">random oracle H</text><text x="300" y="106" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">x₁</text><text x="330" y="106" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">→</text><text x="395" y="106" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">7f3a…</text><text x="300" y="136" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">x₂</text><text x="330" y="136" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">→</text><text x="395" y="136" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">c019…</text><text x="300" y="166" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">x₃</text><text x="330" y="166" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">→</text><text x="395" y="166" font-size="13" text-anchor="middle" class="acc-fill" stroke="none">chosen by B</text><line x1="150" y1="105" x2="260" y2="105" stroke="currentColor" stroke-width="1.5"/><polygon points="260,105 252.7,108.3 252.7,101.7" fill="currentColor" stroke="none"/><text x="205" y="98" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">query x</text><line x1="260" y1="130" x2="150" y2="130" stroke="currentColor" stroke-width="1.5"/><polygon points="150,130 157.3,126.7 157.3,133.3" fill="currentColor" stroke="none"/><text x="205" y="146" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">H(x)</text><text x="540" y="110" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">1. sees every</text><text x="540" y="126" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">query</text><text x="540" y="160" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">2. may program</text><text x="540" y="176" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">answers</text></svg>
<figcaption>Figure 17.12. The random oracle model. In the proof nobody, not even the adversary, can compute H; everyone asks. The reduction answers, so it learns every input and can choose outputs, two powers a real SHA-256 never gives it.</figcaption>
</figure>

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

!!! note "Life story: the random oracle model"
    **Born:** 1993, Mihir Bellare and Phillip Rogaway, "Random Oracles are Practical" (ACM CCS) · **Purpose:** to
    give fast, practical hash-based schemes a proof, instead of only slow theoretical ones · **Helped:** proofs
    for RSA-OAEP (1994), RSA-PSS (1996), Schnorr and EdDSA signatures and the Fujisaki-Okamoto transform behind
    ML-KEM · **Challenged:** 1998, Canetti, Goldreich and Halevi showed a contrived scheme secure in the model but
    insecure with every real hash · **Status:** current, as a trusted heuristic; post-quantum proofs use the
    quantum version, the QROM

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

!!! note "Life story: BEAST"
    **Born:** the weakness was known in theory by 2002 and described for TLS by Gregory Bard (2004); the working attack by
    Thai Duong and Juliano Rizzo, shown at the Ekoparty conference in Buenos Aires in September 2011 · **Purpose:**
    to prove that a "theoretical" IND-CPA failure in TLS 1.0 could steal real cookies · **Helped:** pushed browsers
    to split records (the "1/n-1" trick, 2012) and the web to move to TLS 1.1 and 1.2 · **Retired:** TLS 1.0 and
    1.1 were deprecated in 2021 (RFC 8996) · **Replaced by:** random IVs, then AEAD-only TLS 1.3

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

!!! note "Life story: the Triple Handshake"
    **Born:** 2014, Karthikeyan Bhargavan, Antoine Delignat-Lavaud, Cédric Fournet, Alfredo Pironti and
    Pierre-Yves Strub (Inria and Microsoft Research), while proving miTLS correct · **Purpose:** to show what
    TLS 1.2 resumption and renegotiation really guaranteed · **Helped:** the extended master secret (RFC 7627,
    2015), and the transcript-hash design of TLS 1.3 · **Status:** closed in TLS 1.2 by the extension and in
    TLS 1.3 by design

**A proof with an error (OCB2).** Proofs are written by people and can be wrong.
OCB2, an authenticated encryption mode published with a proof in 2004 and
standardized in ISO/IEC 19772, was broken in 2018 by Akiko Inoue and Kazuhiko
Minematsu; within months, with Tetsu Iwata and Bertram Poettering, the attack
recovered plaintext and forged messages. The proof had a mistake in a corner
case. OCB1 and OCB3, with different proofs, are unaffected. Machine-checked
proofs exist partly because of cases like this.

!!! note "Life story: OCB2"
    **Born:** 2004, Phillip Rogaway (ASIACRYPT 2004), as a faster one-pass authenticated encryption mode with a
    proof; standardized in ISO/IEC 19772 (2009) · **Helped:** showed that one pass of a block cipher can give
    both privacy and integrity · **Broken:** 2018 to 2019, Akiko Inoue, Kazuhiko Minematsu, Tetsu Iwata and
    Bertram Poettering, through an error in the proof · **Replaced by:** OCB3 (RFC 7253, 2014), whose proof is
    different and still stands

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

<figure class="mars-fig" id="fig-17-birthday">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Plot of the birthday bound q squared over 2 to the b plus 1 for 64-bit and 128-bit blocks"><line x1="80" y1="30" x2="80" y2="280" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="80" y="298" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">1</text><line x1="210" y1="30" x2="210" y2="280" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="210" y="298" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2¹⁶</text><line x1="340" y1="30" x2="340" y2="280" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="340" y="298" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2³²</text><line x1="470" y1="30" x2="470" y2="280" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="470" y="298" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2⁴⁸</text><line x1="600" y1="30" x2="600" y2="280" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="600" y="298" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">2⁶⁴</text><line x1="80" y1="30" x2="600" y2="30" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="72" y="34" font-size="12" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">1</text><line x1="80" y1="91.5" x2="600" y2="91.5" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="72" y="95.5" font-size="12" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">2⁻³²</text><line x1="80" y1="153.1" x2="600" y2="153.1" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="72" y="157.1" font-size="12" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">2⁻⁶⁴</text><line x1="80" y1="214.6" x2="600" y2="214.6" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="72" y="218.6" font-size="12" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">2⁻⁹⁶</text><line x1="80" y1="276.2" x2="600" y2="276.2" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.25"/><text x="72" y="280.2" font-size="12" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">2⁻¹²⁸</text><text x="340" y="320" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">blocks encrypted under one key, q</text><text x="18" y="155" font-size="12" text-anchor="middle" fill="currentColor" stroke="none" fill-opacity="0.85" transform="rotate(-90 18 155)">bound on attacker advantage</text><rect x="80" y="30" width="520" height="250" rx="0" fill="none" stroke="currentColor" stroke-width="1"/><path d="M80.0 155.0 L88.1 151.2 L96.2 147.3 L104.4 143.5 L112.5 139.6 L120.6 135.8 L128.8 131.9 L136.9 128.1 L145.0 124.2 L153.1 120.4 L161.2 116.5 L169.4 112.7 L177.5 108.8 L185.6 105.0 L193.8 101.2 L201.9 97.3 L210.0 93.5 L218.1 89.6 L226.2 85.8 L234.4 81.9 L242.5 78.1 L250.6 74.2 L258.8 70.4 L266.9 66.5 L275.0 62.7 L283.1 58.8 L291.2 55.0 L299.4 51.2 L307.5 47.3 L315.6 43.5 L323.8 39.6 L331.9 35.8 L340.0 31.9 L348.1 30.0 L356.2 30.0 L364.4 30.0 L372.5 30.0 L380.6 30.0 L388.8 30.0 L396.9 30.0 L405.0 30.0 L413.1 30.0 L421.2 30.0 L429.4 30.0 L437.5 30.0 L445.6 30.0 L453.8 30.0 L461.9 30.0 L470.0 30.0 L478.1 30.0 L486.2 30.0 L494.4 30.0 L502.5 30.0 L510.6 30.0 L518.8 30.0 L526.9 30.0 L535.0 30.0 L543.1 30.0 L551.2 30.0 L559.4 30.0 L567.5 30.0 L575.6 30.0 L583.8 30.0 L591.9 30.0 L600.0 30.0" class="acc" fill="none" stroke-width="2.5"/><path d="M80.0 278.1 L88.1 274.2 L96.2 270.4 L104.4 266.5 L112.5 262.7 L120.6 258.8 L128.8 255.0 L136.9 251.2 L145.0 247.3 L153.1 243.5 L161.2 239.6 L169.4 235.8 L177.5 231.9 L185.6 228.1 L193.8 224.2 L201.9 220.4 L210.0 216.5 L218.1 212.7 L226.2 208.8 L234.4 205.0 L242.5 201.2 L250.6 197.3 L258.8 193.5 L266.9 189.6 L275.0 185.8 L283.1 181.9 L291.2 178.1 L299.4 174.2 L307.5 170.4 L315.6 166.5 L323.8 162.7 L331.9 158.8 L340.0 155.0 L348.1 151.2 L356.2 147.3 L364.4 143.5 L372.5 139.6 L380.6 135.8 L388.8 131.9 L396.9 128.1 L405.0 124.2 L413.1 120.4 L421.2 116.5 L429.4 112.7 L437.5 108.8 L445.6 105.0 L453.8 101.2 L461.9 97.3 L470.0 93.5 L478.1 89.6 L486.2 85.8 L494.4 81.9 L502.5 78.1 L510.6 74.2 L518.8 70.4 L526.9 66.5 L535.0 62.7 L543.1 58.8 L551.2 55.0 L559.4 51.2 L567.5 47.3 L575.6 43.5 L583.8 39.6 L591.9 35.8 L600.0 31.9" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="405" y="49.2" font-size="12" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">64-bit block (3DES)</text><text x="486.2" y="116.5" font-size="12" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">128-bit block (AES)</text><circle cx="340" cy="31.9" r="4.5" fill="currentColor" stroke="none"/><text x="332" y="25.9" font-size="12" text-anchor="end" fill="currentColor" stroke="none">Sweet32: 32 GiB</text><circle cx="242.5" cy="78.1" r="4.5" fill="currentColor" stroke="none"/><text x="234.5" y="72.1" font-size="12" text-anchor="end" fill="currentColor" stroke="none">8 MiB</text><circle cx="340" cy="155" r="4.5" fill="currentColor" stroke="none"/><text x="348" y="169" font-size="12" text-anchor="start" fill="currentColor" stroke="none">AES, 2³²</text><circle cx="470" cy="93.5" r="4.5" fill="currentColor" stroke="none"/><text x="462" y="87.5" font-size="12" text-anchor="end" fill="currentColor" stroke="none">AES, 4 PiB</text></svg>
<figcaption>Figure 17.13. The birthday bound from the table above, on logarithmic axes. Each doubling of the data quadruples the bound; a 64-bit block reaches a coin flip after 2³² blocks (32 GiB), where AES still has a margin of 2⁶⁵.</figcaption>
</figure>

In 2016 Karthikeyan Bhargavan and Gaëtan Leurent's **Sweet32** attack turned the
first row into a real attack: a browser kept sending the same cookie through a
long-lived 3DES connection, and after hundreds of gigabytes, colliding blocks
revealed it. The fix was to retire 64-bit block ciphers from TLS. For AES-GCM,
TLS 1.3 tells implementations to change keys after at most $2^{24.5}$ full-size
records (RFC 8446 §5.5), and NIST SP 800-38D limits a key to $2^{32}$ messages
when nonces are random, because two random 96-bit nonces collide with
probability about $q^2 / 2^{97}$, which for $q = 2^{32}$ is $2^{-33}$.

!!! note "Life story: Sweet32"
    **Born:** 2016, Karthikeyan Bhargavan and Gaëtan Leurent at Inria, Paris (ACM CCS 2016) · **Purpose:** to show
    that the birthday bound of a 64-bit block is a practical attack, not a footnote · **Helped:** 3DES and Blowfish
    were demoted in OpenSSL and dropped from browsers; NIST disallowed 3DES for encryption after 2023
    (SP 800-131A Rev. 2) · **Status:** the attack is a closed chapter wherever 64-bit block ciphers are gone;
    128-bit blocks and per-key data limits replaced them

**Reading a security claim.** When a paper or product says "provably secure",
ask the four questions this chapter has taught:

1. Under which **definition** (IND-CPA? IND-CCA2? EUF-CMA?), and does the
   application need more?
2. Under which **assumption**, and how well studied is it?
3. In which **model** (standard, ROM, generic group)?
4. How **tight** is the reduction, and do the parameters account for the loss?

Full details on the definitions and the material on this site:
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

<figure class="mars-fig" id="fig-17-hops">
<svg viewBox="0 0 660 190" width="660" role="img" aria-label="Game hopping: from the real game through small changes to a game the adversary cannot win"><rect x="10" y="40" width="145" height="80" rx="6" class="soft" stroke="none"/><rect x="10" y="40" width="145" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="82.5" y="68.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Game 0</text><text x="82.5" y="84.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">real scheme</text><text x="82.5" y="100.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">PRF Fₖ</text><line x1="155" y1="80" x2="175" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="175,80 167.7,83.3 167.7,76.7" fill="currentColor" stroke="none"/><rect x="175" y="40" width="145" height="80" rx="6" class="soft" stroke="none"/><rect x="175" y="40" width="145" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="247.5" y="68.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Game 1</text><text x="247.5" y="84.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Fₖ replaced by</text><text x="247.5" y="100.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">random function</text><line x1="320" y1="80" x2="340" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="340,80 332.7,83.3 332.7,76.7" fill="currentColor" stroke="none"/><rect x="340" y="40" width="145" height="80" rx="6" class="soft" stroke="none"/><rect x="340" y="40" width="145" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="412.5" y="68.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Game 2</text><text x="412.5" y="84.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">output replaced by</text><text x="412.5" y="100.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">random bits</text><line x1="485" y1="80" x2="505" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="505,80 497.7,83.3 497.7,76.7" fill="currentColor" stroke="none"/><rect x="505" y="40" width="145" height="80" rx="6" class="soft-acc" stroke="none"/><rect x="505" y="40" width="145" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="577.5" y="68.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">Game 3</text><text x="577.5" y="84.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">view independent</text><text x="577.5" y="100.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">of b: Adv = 0</text><text x="165" y="150" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">≤ PRF advantage</text><text x="330" y="150" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">≤ Pr[BAD]</text><text x="495" y="150" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">= 0</text><text x="330" y="180" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">total advantage ≤ sum of the gaps between neighbors</text></svg>
<figcaption>Figure 17.14. A proof as a sequence of games. Each hop changes one thing and costs at most one small, bounded difference; the last game is one nobody can win.</figcaption>
</figure>

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

<figure class="mars-fig" id="fig-17-relations">
<svg viewBox="0 0 660 210" width="660" role="img" aria-label="Implications among IND-CCA2, NM-CCA2, IND-CCA1, IND-CPA and INT-CTXT"><text x="20" y="24" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">public-key encryption (Bellare, Desai, Pointcheval, Rogaway 1998)</text><rect x="20" y="40" width="130" height="40" rx="6" class="soft-acc" stroke="none"/><rect x="20" y="40" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="85" y="64.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IND-CCA2</text><rect x="180" y="40" width="130" height="40" rx="6" class="soft" stroke="none"/><rect x="180" y="40" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="245" y="64.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">NM-CCA2</text><rect x="340" y="40" width="130" height="40" rx="6" class="soft" stroke="none"/><rect x="340" y="40" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="405" y="64.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IND-CCA1</text><rect x="500" y="40" width="130" height="40" rx="6" class="soft" stroke="none"/><rect x="500" y="40" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="565" y="64.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IND-CPA</text><line x1="150" y1="60" x2="180" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="180,60 172.7,63.3 172.7,56.7" fill="currentColor" stroke="none"/><polygon points="150,60 157.3,56.7 157.3,63.3" fill="currentColor" stroke="none"/><line x1="310" y1="60" x2="340" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="340,60 332.7,63.3 332.7,56.7" fill="currentColor" stroke="none"/><line x1="470" y1="60" x2="500" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="500,60 492.7,63.3 492.7,56.7" fill="currentColor" stroke="none"/><text x="405" y="104" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">one-way arrows: none can be reversed</text><text x="20" y="136" font-size="12" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">symmetric encryption (Bellare, Namprempre 2000)</text><rect x="20" y="150" width="130" height="40" rx="6" class="soft" stroke="none"/><rect x="20" y="150" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="85" y="174.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IND-CPA</text><text x="170" y="176" font-size="18" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">+</text><rect x="190" y="150" width="130" height="40" rx="6" class="soft" stroke="none"/><rect x="190" y="150" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="255" y="174.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">INT-CTXT</text><line x1="330" y1="170" x2="400" y2="170" class="acc" stroke-width="1.5"/><polygon points="400,170 392.7,173.3 392.7,166.7" class="acc-fill" stroke="none"/><rect x="410" y="150" width="130" height="40" rx="6" class="soft-acc" stroke="none"/><rect x="410" y="150" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="475" y="174.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">IND-CCA2</text></svg>
<figcaption>Figure 17.15. How the notions relate. For public keys, chosen-ciphertext security and non-malleability are the same thing; for symmetric keys, privacy plus ciphertext integrity gives chosen-ciphertext security.</figcaption>
</figure>

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
