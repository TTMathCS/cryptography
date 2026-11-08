# 1. What a Protocol Must Do

*A cipher keeps a message secret and a signature proves who wrote it. Neither,
on its own, gets two strangers on a hostile network to a shared key they can
trust. That takes a protocol: a short, fixed conversation in which each message
uses the primitives of book 1 in a careful order. This chapter is about what
such a conversation has to achieve and how easily it goes wrong. You will run
the most famous broken protocol in the field, Needham and Schroeder's of 1978,
watch Gavin Lowe break it seventeen years later with three lines on a page, fix
it, and then build the pattern almost every modern protocol uses: Diffie-Hellman,
signed, with the transcript bound in. You will break that too before you fix it.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a cryptographic protocol is, and the goals one can promise:
      authentication, key agreement, confidentiality, integrity, freshness,
      forward secrecy, identity hiding and protection from downgrades;
    - the attacker who owns the network (the Dolev-Yao model) and why every
      protocol in this book is analyzed against it;
    - Needham-Schroeder, Lowe's attack on it and Lowe's fix, by hand and in code;
    - replay, freshness, nonces, timestamps and counters;
    - why plain Diffie-Hellman falls to a man in the middle, why signing it is
      not quite enough, and how the SIGMA design closes the gap;
    - what a long light-time link, like the one from Earth to Mars, does to a
      handshake.

    **You need:** public-key encryption and signatures
    ([Chapter 13 of book 1](../../book/13-RSA.md)), Diffie-Hellman
    ([Chapter 12](../../book/12-Diffie-Hellman.md)), message authentication codes
    ([Chapter 10](../../book/10-Message-Authentication.md)). Book 1's
    [Chapter 19](../../book/19-Protocols.md) is a short tour of the protocols
    this book takes apart one by one; reading it first helps but is not required.

    **Levels:** §1.1 to §1.4 are for beginners, §1.5 to §1.10 are intermediate,
    §1.11 is expert.

## 1.1 The problem

*Level: beginner.*

In the summer of 1978 two computer scientists at the Xerox Palo Alto Research
Center published a short paper in *Communications of the ACM* with a modest
title: "Using encryption for authentication in large networks of computers".
Roger Needham was visiting from the University of Cambridge, where he had helped
build some of the first time-sharing systems; Michael Schroeder was at Xerox,
where the Alto computers sat on one of the first local networks, the Ethernet.
Their question was new because the networks were new. When hundreds of
computers share one wire, any of them can read what passes and any of them can
send a packet that claims to come from somewhere else. How does a file server
know that a request really comes from the user it names? How do two machines
that have never met agree on a key that nobody else knows?

Needham and Schroeder knew the pieces they had to work with. Secret-key ciphers
existed, DES among them. Public-key cryptography was two years old: Diffie and
Hellman had published "New directions in cryptography" in 1976, and Rivest,
Shamir and Adleman's RSA paper appeared in the same journal a few months before.
Nobody yet knew how to *use* these things on a network. The paper proposed two
protocols, one with a trusted key server handing out secret keys and one with
public keys, and it ended with a warning that later became famous in its own
right: "protocols such as those developed here are prone to extremely subtle
errors that are unlikely to be detected in normal operation."

They were right, and about their own work. The secret-key protocol had a flaw
found three years later by Dorothy Denning and Giovanni Sacco. The public-key
protocol, which takes three messages and fits on an index card, was believed
correct for seventeen years. It was taught, analyzed with formal logics and
cited as an example of good design. In 1995 Gavin Lowe, then at the University
of Oxford, wrote it into a model checker built for concurrent hardware and asked
the machine whether an attacker could ever make one side believe something
false. The machine found an attack. It needed no broken cipher, no guessed key
and no clever mathematics: only an ordinary user of the network who chose to
relay messages in a particular order.

That is the subject of this book. The primitives in book 1 can be perfect and
the system built from them still fails, because the failure is in the
conversation: who says what, in which order, inside which envelope. The rest of
this chapter builds up what a conversation must achieve, the attacker it must
withstand and the small set of patterns that have survived. The other nineteen
chapters take the protocols that run the Internet, one family at a time, and
show the same lessons being learned, sometimes more than once.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of protocol design from Needham and Schroeder's 1978 paper to the post-quantum migration" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="392" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1976</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Diffie and Hellman: public-key key agreement</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1978</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">Needham and Schroeder publish two protocols</text>
<text x="78" y="79" text-anchor="end" font-weight="bold" class="acc-fill">1981</text>
<circle cx="92" cy="74" r="4.5" class="acc-fill"/>
<text x="108" y="79" class="acc-fill">Denning and Sacco: replay of an old session key</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">1983</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">Dolev and Yao define the network attacker</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="126" r="3.5"/>
<text x="108" y="131">Kerberos version 4 at MIT, a Needham-Schroeder heir</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">1989</text>
<circle cx="92" cy="152" r="3.5"/>
<text x="108" y="157">BAN logic: reasoning about belief</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">1992</text>
<circle cx="92" cy="178" r="3.5"/>
<text x="108" y="183">Station-to-Station protocol; identity misbinding named</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">1993</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Bellare and Rogaway: proofs for key exchange</text>
<text x="78" y="235" text-anchor="end" font-weight="bold" class="acc-fill">1995</text>
<circle cx="92" cy="230" r="4.5" class="acc-fill"/>
<text x="108" y="235" class="acc-fill">Lowe's attack on Needham-Schroeder public key; SSL 2 fails</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="256" r="3.5"/>
<text x="108" y="261">TLS 1.0, the first IETF version of SSL</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2003</text>
<circle cx="92" cy="282" r="3.5"/>
<text x="108" y="287">SIGMA: sign the keys, MAC the names (IKE, TLS 1.3)</text>
<text x="78" y="313" text-anchor="end" font-weight="bold" class="acc-fill">2014</text>
<circle cx="92" cy="308" r="4.5" class="acc-fill"/>
<text x="108" y="313" class="acc-fill">Heartbleed, POODLE, triple handshake: TLS's bad year</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="334" r="3.5"/>
<text x="108" y="339">TLS 1.3, designed alongside formal proofs</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="360" r="3.5"/>
<text x="108" y="365">MLS for groups; PQXDH: Signal goes post-quantum</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">Hybrid post-quantum key exchange is the default on the web</text>
</svg>
<figcaption>Figure 1.1. Half a century of protocols. Accent marks the breaks that changed how protocols are designed.</figcaption>
</figure>

## 1.2 What a protocol is

*Level: beginner.*

A **protocol** is a set of rules for a conversation: who may speak, what each
message contains, what each side checks when a message arrives and what it does
if the check fails. A **cryptographic protocol** is one whose messages use
cryptography to reach a goal that could not be reached by honest behavior alone,
because somebody on the network is not honest.

The people in a protocol are its **roles**. Most protocols have two: the
**initiator**, who speaks first (a browser, an SSH client, a phone sending a
message), and the **responder**, who answers (a web server, an SSH server, the
phone at the other end). Some have a third role, a **trusted server** that both
sides already know: a Kerberos key distribution center, a certificate authority,
a Signal server holding prekeys. A **run** (or **session**) is one execution of
the protocol by one initiator and one responder. A real server takes part in
millions of runs at once, with many different initiators, and that fact turns
out to matter a great deal: Lowe's attack works by mixing two runs together.

Papers write protocols in a compact notation that this book uses too:

$$
A \to B:\ \{N_A, A\}_{pk_B}
$$

means "$A$ sends $B$ a message containing the nonce $N_A$ and the name $A$,
encrypted under $B$'s public key." $\{X\}_K$ is $X$ encrypted under key $K$;
$\mathrm{sig}_A(X)$ is $A$'s signature on $X$; $\mathrm{MAC}_K(X)$ is a message
authentication code; $g^x$ is a Diffie-Hellman share. The arrow is a
convenient lie. Nothing on a network guarantees that a message sent "to $B$"
reaches $B$, that it reaches only $B$, or that the message $B$ receives was
sent by $A$. The arrow says what an honest sender intended, nothing more.

### The goals

Each protocol in this book promises some of the following. Most of the failures
in later chapters are a protocol that promised one of these and delivered
something slightly weaker.

<div class="mars-steps" markdown>

1. **Entity authentication.** At the end of a run, $A$ knows that $B$ took part
   in *this* run, just now. Not "a message signed by $B$ exists somewhere", but
   "$B$ is alive and talking to me." Gavin Lowe later split this into a ladder
   of strengths (aliveness, weak agreement, non-injective agreement, injective
   agreement); the strongest says that every run $A$ completes with $B$ matches
   exactly one run $B$ took part in with $A$, with the same data.
2. **Key agreement** (or **key establishment**). At the end, the two sides hold
   the same fresh secret key. **Key secrecy**: nobody else can know it.
   **Key freshness**: it was never used before. **Key confirmation**: each side
   knows the other really holds it.
3. **Confidentiality and integrity of the data** that follows, which a secure
   channel gives by encrypting and authenticating every record with the agreed
   key (an AEAD, [Chapter 8 of book 1](../../book/08-Modes-of-Operation.md)).
4. **Freshness and replay protection.** An old message, recorded and sent again,
   is noticed and refused.
5. **Forward secrecy.** If a long-term key (a server's certificate key, a user's
   password) is stolen tomorrow, the traffic recorded today stays secret.
6. **Post-compromise security** (or **healing**). If a session's state is stolen
   today, later traffic becomes secret again once the attacker stops watching.
   Signal's ratchet (Chapter 16) is the
   famous example.
7. **Identity hiding.** A passive listener cannot learn who is talking to whom.
   TLS 1.3 encrypts the server's certificate; Encrypted Client Hello hides the
   site name too.
8. **Downgrade protection.** If both sides support a strong option, an attacker
   cannot trick them into using a weak one that they also support.
9. **Deniability, unlinkability, anonymity.** Some protocols want messages that
   could not later prove to a judge who sent them, or runs that cannot be linked
   to each other. These are the subject of book 6.

</div>

A protocol does not have to provide all of these, but it must say which it
provides, against which attacker, under which assumptions. A protocol whose
designers cannot answer that question has not been designed yet.

### The building blocks

Almost every protocol in this book is assembled from the same short list of
parts from book 1:

| Part | What it gives a protocol | Book 1 |
| --- | --- | --- |
| AEAD (AES-GCM, ChaCha20-Poly1305) | encrypted, authenticated records | [Ch. 8](../../book/08-Modes-of-Operation.md) |
| Hash (SHA-256, SHA-3) | transcript hashes, commitments | [Ch. 9](../../book/09-Hash-Functions.md) |
| MAC (HMAC) | proof of holding a key; Finished messages | [Ch. 10](../../book/10-Message-Authentication.md) |
| KDF (HKDF) | many keys from one shared secret | [Ch. 11](../../book/11-Passwords-and-Key-Derivation.md) |
| Diffie-Hellman (X25519) or a KEM (ML-KEM) | a shared secret from public values | [Ch. 12](../../book/12-Diffie-Hellman.md), [Ch. 21](../../book/21-Lattice-Cryptography.md) |
| Signature (Ed25519, ECDSA, RSA-PSS, ML-DSA) | proof of identity tied to a long-term key | [Ch. 13](../../book/13-RSA.md), [Ch. 15](../../book/15-Elliptic-Curves.md) |
| Certificate | a public key bound to a name by someone trusted | [Ch. 16](../../book/16-PKI-and-Key-Establishment.md) |
| Random numbers | nonces and ephemeral keys nobody can predict | [Ch. 4](../../book/04-Randomness-and-Perfect-Secrecy.md) |

The skill this book teaches is putting these parts together so that the whole
keeps the promises of each part. It is harder than it looks, and the next two
sections show why.

## 1.3 The attacker who owns the network

*Level: beginner.*

Before you can say whether a protocol is secure you have to say who it is secure
*against*. In 1983 Danny Dolev and Andrew Yao, then at Stanford, wrote down the
attacker that the field still uses. In the **Dolev-Yao model** the attacker *is*
the network. Every message any honest party sends goes to the attacker, and
every message any honest party receives comes from the attacker. In between,
the attacker can:

- read every message;
- drop, delay or reorder any message;
- send any message it can construct, to anyone, claiming to be anyone;
- start as many runs as it likes, with as many parties as it likes, at the same
  time;
- be a legitimate user itself, with its own name, keys and certificate, and
  take part in runs honestly when that suits it.

What the attacker *cannot* do is break the cryptography. It cannot decrypt
$\{X\}_K$ without $K$, cannot forge $\mathrm{sig}_A(X)$ without $A$'s private
key, cannot find $x$ from $g^x$ and cannot guess a fresh random nonce. The
model treats every primitive as a perfect black box. That is a strong
assumption, and later sections relax it, but it has one great merit: if a
protocol falls to a Dolev-Yao attacker, the flaw is in the protocol, not in the
math. Every attack in §1.4 to §1.7 is of this kind.

The last ability on the list is easy to forget and is the one that matters most
often. The attacker is not only an outsider tapping a wire. It can be the
company that runs a server you also log into, a user of the same chat service,
a web site you visit. Needham and Schroeder assumed, as most people did in
1978, that a principal who completes a run honestly is honest. Lowe's attacker
is a registered user of the system.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Alice and Bob each believe they talk directly to each other; in the Dolev-Yao model every message passes through the attacker, who can read, drop, change, replay and inject" fill="currentColor" font-size="14">
<rect x="20" y="40" width="130" height="60" rx="8" class="soft" stroke="currentColor"/>
<text x="85" y="76" text-anchor="middle" font-weight="bold">Alice</text>
<rect x="490" y="40" width="130" height="60" rx="8" class="soft" stroke="currentColor"/>
<text x="555" y="76" text-anchor="middle" font-weight="bold">Bob</text>
<line x1="150" y1="58" x2="490" y2="58" stroke="currentColor" stroke-dasharray="5 5"/>
<text x="320" y="50" text-anchor="middle">what Alice and Bob picture</text>
<rect x="220" y="150" width="200" height="80" rx="10" class="soft-acc" stroke="currentColor"/>
<text x="320" y="180" text-anchor="middle" font-weight="bold" class="acc-fill">the attacker = the network</text>
<text x="320" y="202" text-anchor="middle">read · drop · delay · reorder</text>
<text x="320" y="220" text-anchor="middle">replay · inject · be a user</text>
<line x1="110" y1="100" x2="220" y2="170" stroke="currentColor" stroke-width="1.6" class="acc"/>
<polygon points="220,170 206,168 212,159" class="acc-fill"/>
<line x1="420" y1="170" x2="530" y2="100" stroke="currentColor" stroke-width="1.6" class="acc"/>
<polygon points="530,100 518,108 524,98" class="acc-fill"/>
<line x1="510" y1="100" x2="420" y2="200" stroke="currentColor" stroke-width="1.6" class="acc"/>
<polygon points="420,200 423,186 431,193" class="acc-fill"/>
<line x1="220" y1="200" x2="90" y2="100" stroke="currentColor" stroke-width="1.6" class="acc"/>
<polygon points="90,100 102,106 96,114" class="acc-fill"/>
<text x="140" y="150" text-anchor="middle">every message in</text>
<text x="500" y="150" text-anchor="middle">every message out</text>
</svg>
<figcaption>Figure 1.2. The Dolev-Yao attacker. The dashed line is what the protocol designer pictures; the solid arrows are what the network does.</figcaption>
</figure>

Is this attacker too strong? On the open Internet, no. Your packets cross
networks run by strangers: the café's Wi-Fi, your Internet provider, transit
providers, the cloud host of the server. Any of them can do all of the above,
and some have. Routing hijacks, where a network announces that it is the best
path to addresses it does not own, have pulled traffic for banks and
cryptocurrency services through foreign networks for minutes or hours at a time.
On a habitat network on Mars, with a few hundred devices all within reach of
one radio, the attacker is a neighbor's compromised laptop. A protocol that is
safe against Dolev-Yao is safe in all of these places, so that is the bar.

### Two other attackers

Two more attacker models appear in this book.

The **computational attacker** of the cryptographers' proofs (§1.11) does not
treat primitives as black boxes. It is any efficient algorithm, and the proof
shows that breaking the protocol would let it break one of the primitives, with
a precise loss in the bound. It is a sharper tool, and it found problems that the
symbolic model missed; the TLS 1.3 design was checked both ways.

The **compromising attacker** steals keys. It can learn a party's long-term
private key, or the state of one session, or the random numbers a device
generated, at some chosen moment. Forward secrecy, post-compromise security and
key-compromise impersonation (§1.8) are statements about what this attacker
gets, and when.

## 1.4 Needham-Schroeder and Lowe's attack

*Level: beginner.*

Here is the public-key protocol of 1978, cut to the three messages that matter.
(The full version also fetches the public keys from a key server; leave that out
and assume each side already has the other's public key.) Alice wants to talk to
Bob. Each picks a fresh random **nonce**, a number used once, which the other
must send back to prove it read the message.

$$
\begin{aligned}
1.&\quad A \to B:\ \{N_A,\ A\}_{pk_B}\\
2.&\quad B \to A:\ \{N_A,\ N_B\}_{pk_A}\\
3.&\quad A \to B:\ \{N_B\}_{pk_B}
\end{aligned}
$$

The reasoning seems airtight. In message 1, Alice sends her nonce where only Bob
can read it. When message 2 comes back with $N_A$ inside, Alice knows Bob
decrypted message 1: nobody else could have read $N_A$. Bob's nonce $N_B$ is
encrypted for Alice, so only she can read it; when it comes back in message 3,
Bob knows Alice is there. At the end both know $N_A$ and $N_B$, nobody else does,
and they can hash the two nonces into a session key. The protocol was used as a
textbook example for years, and the BAN logic of 1989 "proved" it achieved its
goals.

### By hand: the attack

Lowe's attack needs Alice to start a run with someone who is not honest. Call
him Mallory. He is a normal user, with a public key that Alice has, and Alice
has a good reason to talk to him: perhaps he runs a web service she uses.

<div class="mars-steps" markdown>

1. Alice starts a run with Mallory: $A \to M:\ \{N_A, A\}_{pk_M}$. This is
   exactly what the protocol tells her to do.
2. Mallory decrypts it with his own private key. He now knows $N_A$. He
   re-encrypts the same contents for Bob, and sends it to Bob, claiming to be
   Alice: $M(A) \to B:\ \{N_A, A\}_{pk_B}$.
3. Bob sees a perfectly formed first message from "Alice". He replies to Alice,
   as the protocol says: $B \to A:\ \{N_A, N_B\}_{pk_A}$. Mallory cannot read
   this, and doesn't need to. He forwards it to Alice unchanged.
4. Alice receives message 2. It contains her nonce $N_A$, so as far as she can
   tell it comes from Mallory, who she is talking to. She replies to Mallory,
   as the protocol says: $A \to M:\ \{N_B\}_{pk_M}$. She has just decrypted
   Bob's challenge for Mallory.
5. Mallory decrypts $N_B$ and sends it to Bob: $M(A) \to B:\ \{N_B\}_{pk_B}$.
6. Bob's run is complete. He believes he has authenticated Alice and shares the
   secrets $N_A, N_B$ with her alone. Both are known to Mallory.

</div>

Nothing was decrypted that the attacker was not entitled to decrypt; nothing was
forged. Alice behaved correctly in a run with Mallory, and that run was all
Mallory needed to impersonate her to Bob. Lowe's 1995 paper gave the attack a
memorable consequence: if Bob is a bank and the nonces are the session key,
Mallory can now send "Alice"'s instructions to transfer money.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Message sequence of Lowe's attack: Alice runs the protocol with Mallory, who relays her first message to Bob and uses Alice to decrypt Bob's challenge" fill="currentColor" font-size="14">
<text x="90" y="24" text-anchor="middle" font-weight="bold">Alice</text>
<text x="320" y="24" text-anchor="middle" font-weight="bold" class="acc-fill">Mallory</text>
<text x="550" y="24" text-anchor="middle" font-weight="bold">Bob</text>
<line x1="90" y1="34" x2="90" y2="320" stroke="currentColor"/>
<line x1="320" y1="34" x2="320" y2="320" stroke="currentColor" class="acc"/>
<line x1="550" y1="34" x2="550" y2="320" stroke="currentColor"/>
<line x1="90" y1="70" x2="316" y2="70" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,70 308,65 308,75"/>
<text x="205" y="62" text-anchor="middle">1. {Nₐ, A} for M</text>
<line x1="320" y1="115" x2="546" y2="115" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="550,115 538,110 538,120" class="acc-fill"/>
<text x="435" y="107" text-anchor="middle" class="acc-fill">2. {Nₐ, A} for B, "from A"</text>
<line x1="550" y1="160" x2="94" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="90,160 102,155 102,165"/>
<text x="320" y="152" text-anchor="middle">3. {Nₐ, N_b} for A  (Mallory just forwards it)</text>
<line x1="90" y1="205" x2="316" y2="205" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,205 308,200 308,210"/>
<text x="205" y="197" text-anchor="middle">4. {N_b} for M</text>
<line x1="320" y1="250" x2="546" y2="250" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="550,250 538,245 538,255" class="acc-fill"/>
<text x="435" y="242" text-anchor="middle" class="acc-fill">5. {N_b} for B</text>
<text x="550" y="295" text-anchor="middle">Bob: "done with Alice"</text>
<text x="90" y="295" text-anchor="middle">Alice: "done with Mallory"</text>
</svg>
<figcaption>Figure 1.3. Lowe's attack interleaves two runs. Alice's honest run with Mallory (black) feeds Mallory's fake run with Bob (accent). Message 3 is the hinge: Bob addressed it to Alice, but nothing in it says it came from Bob.</figcaption>
</figure>

### The fix

Look at message 3 of the attack again, the one Bob sent. It is
$\{N_A, N_B\}_{pk_A}$. Nothing inside it says who sent it. Alice, who is in a
run with Mallory, has no way to notice that it came from Bob. Lowe's fix is one
name:

$$
2'.\quad B \to A:\ \{N_A,\ N_B,\ B\}_{pk_A}
$$

Now when Alice decrypts message 2 she finds Bob's name in a run she believes is
with Mallory, and stops. This repaired protocol is known as
**Needham-Schroeder-Lowe**, and Lowe used his model checker (FDR, built for the
process algebra CSP) to show that no attack on it exists for a small number of
runs, then proved that the small case covers all cases.

The general rule that falls out is one of Martín Abadi and Roger Needham's
"prudent engineering practices" of 1994: *if the identity of a principal is
essential to the meaning of a message, it is prudent to mention the principal's
name explicitly in the message.* Notice the irony of the second author's name.
The rule was learned from his own protocol.

### Code it

The program below plays the protocol with "sealed envelopes" instead of real
encryption. A `Sealed` object can be opened only by its owner, which is exactly
the Dolev-Yao view of public-key encryption: perfect, but no more than that.
Alice and Bob follow the protocol to the letter; the lines at the bottom are
Mallory.

```python
# Needham-Schroeder public-key protocol, played with sealed envelopes.
# enc(owner, *items) is a message only `owner` can open.
import random
rng = random.Random(1978)    # fixed seed so the run repeats; real nonces come from `secrets`

class Sealed:
    def __init__(self, owner, items):
        self.owner, self.items = owner, items
    def open(self, who):
        if who != self.owner:
            raise ValueError(who + " cannot open a message for " + self.owner)
        return self.items

def enc(owner, *items):
    return Sealed(owner, items)

def nonce():
    return format(rng.getrandbits(32), "08x")

class Alice:                      # the initiator; she starts a run with `peer`
    def start(self, peer):
        self.peer, self.na = peer, nonce()
        return enc(peer, self.na, "Alice")              # message 1
    def reply(self, msg2):
        na, nb = msg2.open("Alice")                     # message 2 (original form)
        assert na == self.na, "not my nonce"
        print("Alice: finished a run with", self.peer)
        return enc(self.peer, nb)                       # message 3

class Bob:                        # the responder
    def answer(self, msg1):
        self.na, self.claimed = msg1.open("Bob")
        self.nb = nonce()
        return enc(self.claimed, self.na, self.nb)      # message 2
    def finish(self, msg3):
        (nb,) = msg3.open("Bob")
        assert nb == self.nb, "not my nonce"
        print("Bob: finished a run with", self.claimed,
              "and believes the shared secrets are", self.na, self.nb)

# Lowe's attack. Alice really does talk to Mallory, who is an ordinary user.
alice, bob = Alice(), Bob()
m1 = alice.start("Mallory")            # Alice -> Mallory
na, who = m1.open("Mallory")           # Mallory reads it ...
m1b = enc("Bob", na, who)              # ... and re-seals it for Bob, still saying "Alice"
m2 = bob.answer(m1b)                   # Bob -> "Alice" (Mallory passes it on untouched)
m3 = alice.reply(m2)                   # Alice decrypts it for Mallory: it contains nb
(nb,) = m3.open("Mallory")
bob.finish(enc("Bob", nb))             # Mallory finishes the run with Bob as "Alice"
print("Mallory knows", na, nb)
```

```text
Alice: finished a run with Mallory
Bob: finished a run with Alice and believes the shared secrets are 105751bc 63bcc050
Mallory knows 105751bc 63bcc050
```

Now apply Lowe's fix. Keep the classes and helper functions above, and replace
the attack at the bottom with this:

```python
# Lowe's fix: Bob puts his own name inside message 2, and Alice checks it.
class FixedBob(Bob):
    def answer(self, msg1):
        self.na, self.claimed = msg1.open("Bob")
        self.nb = nonce()
        return enc(self.claimed, self.na, self.nb, "Bob")

class FixedAlice(Alice):
    def reply(self, msg2):
        na, nb, sender = msg2.open("Alice")
        assert na == self.na, "not my nonce"
        if sender != self.peer:
            print("Alice: message 2 names", sender, "but I am talking to",
                  self.peer, "- run aborted")
            return None
        return enc(self.peer, nb)

alice, bob = FixedAlice(), FixedBob()
m1 = alice.start("Mallory")
na, who = m1.open("Mallory")
m2 = bob.answer(enc("Bob", na, who))
m3 = alice.reply(m2)
print("Mallory got message 3?", m3 is not None)
```

```text
Alice: message 2 names Bob but I am talking to Mallory - run aborted
Mallory got message 3? False
```

Try to find another attack on the fixed version with the same toy: reorder the
messages, start extra runs, have Mallory start runs as himself. Lowe's machine
did this exhaustively and found nothing. That kind of search, made fast and
general, is how protocols are checked today (Chapter 20).

!!! note "Life story: the Needham-Schroeder public-key protocol"
    **Born:** 1978, Roger Needham and Michael Schroeder at Xerox PARC, in
    *Communications of the ACM* · **Purpose:** mutual authentication and a
    shared secret between two parties who know each other's public keys ·
    **Helped:** set the shape of every challenge-response protocol after it;
    its secret-key sibling became Kerberos ([Chapter 12](12-Kerberos.md)) ·
    **Retired:** 1995, when Gavin Lowe found the man-in-the-middle attack with
    the FDR model checker · **Replaced by:** Needham-Schroeder-Lowe in
    teaching; in practice by signed Diffie-Hellman designs (§1.7)

!!! note "Life story: Lowe's attack"
    **Born:** 1995, Gavin Lowe at Oxford, in *Information Processing Letters*;
    the follow-up paper at TACAS 1996 showed how the model checker found it ·
    **Purpose:** show that a protocol "proved" correct for years had a simple
    flaw · **Helped:** launched the use of model checkers on protocols, which
    led to ProVerif, Tamarin and the analyses behind TLS 1.3, Signal and 5G
    authentication · **Status:** the standard first example in every course on
    protocol analysis

## 1.5 Freshness: nonces, timestamps and counters

*Level: intermediate.*

The secret-key protocol in Needham and Schroeder's paper fell to a different and
more common kind of attack: **replay**. In that protocol a trusted server $S$
shares a long-term key with each user ($K_{AS}$ with Alice, $K_{BS}$ with Bob)
and hands out session keys:

$$
\begin{aligned}
1.&\quad A \to S:\ A,\ B,\ N_A\\
2.&\quad S \to A:\ \{N_A,\ B,\ K_{AB},\ \{K_{AB},\ A\}_{K_{BS}}\}_{K_{AS}}\\
3.&\quad A \to B:\ \{K_{AB},\ A\}_{K_{BS}}\\
4.&\quad B \to A:\ \{N_B\}_{K_{AB}}\\
5.&\quad A \to B:\ \{N_B - 1\}_{K_{AB}}
\end{aligned}
$$

Message 3 is a **ticket**: a session key sealed for Bob by the server Bob trusts.
Alice checks the freshness of message 2 through her nonce $N_A$. But Bob has no
nonce in the ticket. In 1981 Dorothy Denning and Giovanni Sacco pointed out
what follows. Suppose an attacker records one run and, weeks later, learns the
old session key $K_{AB}$: it was in memory on a machine that was later stolen,
or it was weak. The attacker replays the old message 3 to Bob. Bob cannot tell
it is old; he answers with a fresh $N_B$ under $K_{AB}$; the attacker, who knows
$K_{AB}$, answers correctly; and Bob now believes he shares a new session with
Alice. One leaked session key becomes a permanent ability to impersonate Alice.

The lesson is that **every party must be able to check the freshness of every
message it relies on**, with a value it has some control over. There are three
ways to get freshness, and every protocol in this book uses one of them.

**Nonces.** The checker picks a random value and requires it to come back,
bound into the reply. Only the checker needs a good random generator, and no
clocks are involved. The cost is a round trip: you can't challenge someone
without first sending them the challenge. Nonces must be unpredictable, not just
unique; a predictable nonce lets an attacker precompute the answer.

**Timestamps.** The sender includes the current time, and the receiver refuses
messages outside a window, say five minutes. Denning and Sacco's own fix was to
add timestamps to the ticket, and Kerberos took it up. Timestamps save a round
trip, which matters enormously on long links (§1.9). The costs: everyone needs a
clock that agrees with everyone else's, and an attacker who can move a victim's
clock (by attacking its time protocol) can make old messages look new. Within
the window, a message can still be replayed, so the receiver must remember what
it accepted during the window.

**Counters.** The sender numbers its messages and the receiver refuses any
number it has already seen. TLS records, IPsec packets and WireGuard packets all
carry counters. They need state on both sides and break if the state is lost:
a device that restarts and starts counting from zero again is replaying its own
numbers. Over unreliable transports the receiver keeps a **sliding window** of
recently seen numbers rather than demanding strict order; you code one in
[Chapter 7](07-IPsec-and-IKEv2.md).

!!! note "Life story: the Denning-Sacco attack"
    **Born:** 1981, Dorothy Denning and Giovanni Sacco, "Timestamps in key
    distribution protocols", *Communications of the ACM* · **Purpose:** show
    that Needham and Schroeder's secret-key protocol lets one leaked session key
    be replayed forever · **Helped:** timestamps in Kerberos tickets; the
    general rule that each party must check freshness itself · **Status:** the
    classic example of a replay; Needham and Schroeder published a corrected
    protocol with a nonce from Bob in 1987

### What exactly is signed, MACed or encrypted

Freshness is one instance of a more general rule: a check only means what it
covers. Over and over, attacks in this book come from a signature or MAC that
covers less than the designers thought.

- A signature on a Diffie-Hellman share, but not on the nonces, can be replayed
  in another session.
- A MAC on a message, but not on its type, lets one kind of message be accepted
  as another. (Several TLS attacks in [Chapter 4](04-Thirty-Years-of-TLS-Attacks.md)
  are of this kind.)
- Encryption without authentication lets the attacker change ciphertexts in
  predictable ways; WEP ([Chapter 9](09-Wi-Fi-Security.md)) and early SSH
  modes both suffered.
- A negotiation whose offers are not authenticated lets the attacker delete the
  strong offers: the **downgrade attack**.

The modern answer, used by TLS 1.3, SSH, WireGuard, Noise and MLS, is the
**transcript hash**. Each side keeps a running hash of every message sent and
received, byte for byte, and the authentication at the end (a signature, a MAC,
or both) covers that hash. If the attacker changed, deleted, reordered or
injected anything at all, the two sides' transcripts differ and the check
fails. It does not matter that the designers didn't think of a particular
field: it's covered anyway.

## 1.6 Key exchange and the man in the middle

*Level: intermediate.*

The Needham-Schroeder protocols moved secrets inside encrypted envelopes. Almost
nothing does that any more. Modern protocols *create* the session key with
Diffie-Hellman ([Chapter 12 of book 1](../../book/12-Diffie-Hellman.md)) or a
key-encapsulation mechanism (KEM), so that the key never travels at all, and
then authenticate the result. The reason is forward secrecy (§1.8): if a session
key is sent encrypted under Bob's long-term public key, anyone who records the
traffic and later gets Bob's private key can open it. With Diffie-Hellman, the
secret exponents are thrown away when the session ends, and there is nothing
left to steal.

Recall the exchange. With a public prime $p$ and generator $g$, Alice picks a
secret $a$ and sends $A = g^a \bmod p$; Bob picks $b$ and sends $B = g^b \bmod p$;
both compute $g^{ab} \bmod p$. A passive listener sees $A$ and $B$ and, if the
group is well chosen, cannot compute $g^{ab}$.

An *active* attacker does not need to. Mallory sits on the wire, catches $A$
and sends Bob her own $M = g^m$ instead; catches $B$ and sends Alice $M$ instead.
Alice computes $M^a = g^{am}$ and believes it is shared with Bob. Bob computes
$M^b = g^{bm}$ and believes it is shared with Alice. Mallory can compute both,
from $A^m$ and $B^m$. She decrypts everything Alice sends, reads or changes it,
re-encrypts it for Bob, and so on, for as long as the session lasts. Neither
side sees anything wrong.

### Code it

With numbers small enough to check by hand ($p = 2039$, $g = 7$):

```python
# Unauthenticated Diffie-Hellman, and the man in the middle (tiny numbers).
p, g = 2039, 7                     # 2039 is prime; 7 generates the whole group

a, b, m = 1234, 567, 999           # secret exponents: Alice, Bob, Mallory
A, B, M = pow(g, a, p), pow(g, b, p), pow(g, m, p)

# Mallory sits on the wire and swaps both public values for her own.
alice_key = pow(M, a, p)           # Alice thinks M came from Bob
bob_key = pow(M, b, p)             # Bob thinks M came from Alice
mallory_with_alice = pow(A, m, p)
mallory_with_bob = pow(B, m, p)

print("Alice's key:", alice_key, " Mallory's copy:", mallory_with_alice)
print("Bob's key:  ", bob_key, " Mallory's copy:", mallory_with_bob)
print("Alice and Bob share a key?", alice_key == bob_key)
```

```text
Alice's key: 1003  Mallory's copy: 1003
Bob's key:   1545  Mallory's copy: 1545
Alice and Bob share a key? False
```

Diffie-Hellman gives **secrecy against a passive listener** and nothing else.
To get secrecy against Dolev-Yao, the two shares must be **authenticated**: each
side needs to know that the share it received came from the party it means to
talk to, in this run. The rest of the book is, in large part, a catalog of ways
to do that.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Man in the middle on Diffie-Hellman: Mallory replaces both shares and ends up with one key shared with Alice and another shared with Bob" fill="currentColor" font-size="14">
<rect x="20" y="20" width="140" height="190" rx="8" class="soft" stroke="currentColor"/>
<text x="90" y="44" text-anchor="middle" font-weight="bold">Alice</text>
<text x="90" y="70" text-anchor="middle">secret a</text>
<text x="90" y="180" text-anchor="middle">key = M^a</text>
<rect x="250" y="20" width="140" height="190" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="320" y="44" text-anchor="middle" font-weight="bold" class="acc-fill">Mallory</text>
<text x="320" y="70" text-anchor="middle">secret m</text>
<text x="320" y="170" text-anchor="middle">A^m with Alice</text>
<text x="320" y="190" text-anchor="middle">B^m with Bob</text>
<rect x="480" y="20" width="140" height="190" rx="8" class="soft" stroke="currentColor"/>
<text x="550" y="44" text-anchor="middle" font-weight="bold">Bob</text>
<text x="550" y="70" text-anchor="middle">secret b</text>
<text x="550" y="180" text-anchor="middle">key = M^b</text>
<line x1="160" y1="100" x2="246" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,100 238,95 238,105"/>
<text x="205" y="92" text-anchor="middle">A</text>
<line x1="390" y1="100" x2="476" y2="100" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="480,100 468,95 468,105" class="acc-fill"/>
<text x="435" y="92" text-anchor="middle" class="acc-fill">M</text>
<line x1="480" y1="135" x2="394" y2="135" stroke="currentColor" stroke-width="1.5"/>
<polygon points="390,135 402,130 402,140"/>
<text x="435" y="127" text-anchor="middle">B</text>
<line x1="250" y1="135" x2="164" y2="135" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="160,135 172,130 172,140" class="acc-fill"/>
<text x="205" y="127" text-anchor="middle" class="acc-fill">M</text>
</svg>
<figcaption>Figure 1.4. A man in the middle turns one Diffie-Hellman exchange into two, one with each victim, and relays between them.</figcaption>
</figure>

### Ways to authenticate a key exchange

There are four families, and they recur through the book.

1. **Signatures with certificates.** Each side (or just the server) signs its
   share with a long-term key, and a certificate from a trusted authority ties
   that key to a name. TLS, IKEv2 and most of the web work this way
   ([Chapters 2](02-Certificates-and-PKI.md) and [3](03-TLS-1.3-Message-by-Message.md)).
2. **Known static keys.** Each side already knows the other's long-term public
   key, from configuration or from a first contact it chose to trust, and mixes
   it into the key derivation. SSH's `known_hosts`, WireGuard's configured peer
   keys and Signal's identity keys work this way
   ([Chapters 6](06-SSH.md), [8](08-WireGuard-and-Noise.md), 16).
3. **Pre-shared symmetric keys.** Both sides already share a secret, and MAC
   the exchange with it. TLS resumption, WPA2-Personal and Kerberos tickets work
   this way.
4. **Passwords.** Both sides know a low-entropy password, and a special
   protocol (a PAKE) lets them use it without exposing it to offline guessing
   ([Chapter 11](11-One-Time-Codes-and-Password-Protocols.md)).

## 1.7 Authenticated key exchange: signing it right

*Level: intermediate.*

The obvious fix for the man in the middle is for each side to sign its share.
That alone fails in a quieter way, and the story of how is worth telling,
because the pattern that fixes it is the one inside TLS 1.3 and IKEv2.

### Signed Diffie-Hellman, naively

Try this:

$$
\begin{aligned}
1.&\quad A \to B:\ g^x\\
2.&\quad B \to A:\ g^y,\ B,\ \mathrm{sig}_B(g^x, g^y)\\
3.&\quad A \to B:\ A,\ \mathrm{sig}_A(g^y, g^x)
\end{aligned}
$$

Each side signs both shares, so a man in the middle who replaces $g^x$ with $g^m$
is caught: Bob's signature covers the $g^x$ Bob saw, which is not the one Alice
sent. Signing both shares also gives freshness for free, because each side's
own fresh share is inside the other's signature. Mallory cannot learn the key.

But look at what an attacker *can* do. Eve, a legitimate user with her own
certificate, sits on the path. When message 3 comes past she strips Alice's name
and signature and puts in her own: $E,\ \mathrm{sig}_E(g^y, g^x)$. Eve can
compute that signature; she has her own key, and both shares were sent in the
clear. Bob checks it, it verifies, and Bob concludes that he shares a key with
**Eve**. Alice concludes that she shares a key with Bob. Both are half right: the
key really is shared between Alice and Bob, and Eve does not know it. But Bob has
the wrong idea of who is at the other end.

This is the **identity misbinding** (or **unknown key-share**) attack, named by
Whitfield Diffie, Paul van Oorschot and Michael Wiener in 1992. It sounds
harmless because Eve learns no secret. It isn't. Their example: Bob is a bank,
and every deposit message arriving on this channel is credited to the account of
the party Bob believes is at the other end. Alice deposits money; it goes into
Eve's account. Every protocol whose application acts on *who* sent a message,
which is most of them, needs the names bound to the key.

### SIGMA: sign the shares, MAC the name

The fix proposed by Diffie, van Oorschot and Wiener, in their **Station-to-Station**
(STS) protocol, was to encrypt the signatures under the new key, so only someone
who knows the key can produce the last message. Hugo Krawczyk showed in 2003
that STS still had subtle problems with identity binding in some variants, and
proposed a cleaner rule, which he called **SIGMA**, for "SIGn-and-MAc":

- each side **signs** the two shares (to show the shares are fresh and its own),
- each side **MACs its own identity** under a key derived from the
  Diffie-Hellman result (to show that the party who knows the key is the one
  claiming that name).

$$
\begin{aligned}
1.&\quad A \to B:\ g^x\\
2.&\quad B \to A:\ g^y,\ B,\ \mathrm{sig}_B(g^x, g^y),\ \mathrm{MAC}_{K_m}(B)\\
3.&\quad A \to B:\ A,\ \mathrm{sig}_A(g^y, g^x),\ \mathrm{MAC}_{K_m}(A)
\end{aligned}
$$

where $K_m$ is derived from $g^{xy}$. Eve can still sign the shares, but she
cannot compute $\mathrm{MAC}_{K_m}(E)$, because she doesn't know $g^{xy}$. The
MAC is what binds the name to the key. Krawczyk's paper proved SIGMA secure in
the Canetti-Krawczyk model (§1.11). SIGMA is the basis of IKEv2's
authentication and of the TLS 1.3 handshake, where the "signature" is the
`CertificateVerify` message and the "MAC" is the `Finished` message, both over
the transcript hash, so they cover the names and everything else at once
([Chapter 3](03-TLS-1.3-Message-by-Message.md)).

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Identity misbinding: Eve replaces Alice's name and signature with her own on naive signed Diffie-Hellman; under SIGMA Eve also needs a MAC under the shared key, which she cannot compute" fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">naive signed DH</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">SIGMA</text>
<line x1="320" y1="10" x2="320" y2="262" stroke="currentColor" stroke-dasharray="4 4"/>
<rect x="20" y="40" width="280" height="64" rx="6" class="soft" stroke="currentColor"/>
<text x="160" y="64" text-anchor="middle">Alice sends: A, sig_A(gʸ, gˣ)</text>
<text x="160" y="88" text-anchor="middle">Eve swaps in: E, sig_E(gʸ, gˣ)</text>
<rect x="20" y="124" width="280" height="64" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="160" y="148" text-anchor="middle">Bob checks Eve's signature: valid</text>
<text x="160" y="172" text-anchor="middle" class="acc-fill" font-weight="bold">Bob: "my peer is Eve"</text>
<text x="160" y="214" text-anchor="middle">key is really shared with Alice;</text>
<text x="160" y="234" text-anchor="middle">Alice's deposits are credited to Eve</text>
<rect x="340" y="40" width="280" height="64" rx="6" class="soft" stroke="currentColor"/>
<text x="480" y="64" text-anchor="middle">Alice sends: A, sig_A(...), MAC_Km(A)</text>
<text x="480" y="88" text-anchor="middle">Eve needs MAC_Km(E): no Km</text>
<rect x="340" y="124" width="280" height="64" rx="6" class="soft" stroke="currentColor"/>
<text x="480" y="148" text-anchor="middle">Bob checks the MAC on "E"</text>
<text x="480" y="172" text-anchor="middle" font-weight="bold">fails: run aborted</text>
<text x="480" y="214" text-anchor="middle">the MAC binds the name</text>
<text x="480" y="234" text-anchor="middle">to whoever knows the key</text>
</svg>
<figcaption>Figure 1.5. Signing proves the shares are fresh; the MAC under the new key proves the name belongs to the party who has the key. SIGMA needs both.</figcaption>
</figure>

### Code it

This program does real public-key cryptography: Schnorr signatures and
Diffie-Hellman in the 2048-bit group 14 of RFC 3526, using only Python's built-in
`pow`. It runs the naive protocol and SIGMA, each with Eve swapping the last
message, and reports what Bob concludes.

```python
# Signed Diffie-Hellman with Schnorr signatures, the identity-misbinding
# attack on the naive version, and the SIGMA fix.
import hashlib, hmac, secrets

P = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74"
        "020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED"
        "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB"
        "9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF695581718"
        "3995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
Q, G = (P - 1) // 2, 2               # RFC 3526 group 14; 2 has order Q

def h(*parts):
    data = "|".join(str(x) for x in parts).encode()
    return int.from_bytes(hashlib.sha256(data).digest(), "big")

def keypair():
    x = secrets.randbelow(Q - 1) + 1
    return x, pow(G, x, P)

def sign(x, *msg):                   # Schnorr signature (e, s)
    k = secrets.randbelow(Q - 1) + 1
    e = h(pow(G, k, P), *msg) % Q
    return e, (k + x * e) % Q

def verify(X, sig, *msg):
    e, s = sig
    r = pow(G, s, P) * pow(X, Q - e, P) % P    # g^s * X^(-e) = g^k
    return h(r, *msg) % Q == e

def mac(key, name):
    return hmac.new(key, name.encode(), hashlib.sha256).hexdigest()[:16]

long_term = {name: keypair() for name in ("Alice", "Bob", "Eve")}
pub = {name: kp[1] for name, kp in long_term.items()}   # everyone knows these

def run(sigma):
    x, gx = keypair()                         # Alice's ephemeral key
    y, gy = keypair()                         # Bob's ephemeral key
    k_alice = pow(gy, x, P).to_bytes(256, "big")
    k_bob = pow(gx, y, P).to_bytes(256, "big")
    km_alice = hashlib.sha256(b"mac" + k_alice).digest()
    km_bob = hashlib.sha256(b"mac" + k_bob).digest()
    # Message 3 from Alice: her name, her signature, and (SIGMA only) a MAC.
    msg3 = {"name": "Alice", "sig": sign(long_term["Alice"][0], gy, gx)}
    if sigma:
        msg3["mac"] = mac(km_alice, "Alice")
    # Eve, on the path, swaps in her own name and signs the same values.
    msg3 = dict(msg3, name="Eve", sig=sign(long_term["Eve"][0], gy, gx))
    if sigma:
        msg3["mac"] = "0" * 16    # Eve cannot compute the MAC: she lacks the key
    # Bob's checks.
    ok = verify(pub[msg3["name"]], msg3["sig"], gy, gx)
    if sigma:
        ok = ok and hmac.compare_digest(msg3["mac"], mac(km_bob, msg3["name"]))
    print("SIGMA" if sigma else "naive", "-> Bob accepts:", ok,
          "| Bob thinks his peer is", msg3["name"],
          "| key really shared with Alice:", k_alice == k_bob)

run(sigma=False)
run(sigma=True)
```

```text
naive -> Bob accepts: True | Bob thinks his peer is Eve | key really shared with Alice: True
SIGMA -> Bob accepts: False | Bob thinks his peer is Eve | key really shared with Alice: True
```

The program skips message 2 (Bob's half) to stay short; it has the same shape.
Two details are worth noticing. The signature's hash input joins its parts with
a separator, so that the pair `(12, 345)` cannot be confused with `(123, 45)`;
real protocols do the same with length prefixes or a fixed encoding. And the
MAC is checked with `hmac.compare_digest`, which takes the same time whether
the first byte or the last one differs ([Chapter 18 of book 1](../../book/18-Side-Channels.md)).

!!! note "Life story: the Station-to-Station protocol"
    **Born:** 1992, Whitfield Diffie, Paul van Oorschot and Michael Wiener, in
    *Designs, Codes and Cryptography* · **Purpose:** authenticated
    Diffie-Hellman with signatures encrypted under the new key; the paper also
    named the identity-misbinding attack · **Helped:** the design of IKE and
    later of SIGMA · **Status:** historic; its ideas live on in SIGMA

!!! note "Life story: SIGMA"
    **Born:** 2003, Hugo Krawczyk (IBM), CRYPTO 2003, written up from the
    design he contributed to IKE in the 1990s · **Purpose:** a signed
    Diffie-Hellman with a security proof, identity protection and no
    misbinding · **Helped:** IKEv1 and IKEv2 signature authentication, the TLS
    1.3 handshake, and many proofs that build on it · **Status:** current;
    the default pattern for signature-based key exchange

## 1.8 What a key exchange can promise

*Level: intermediate.*

Once a protocol stops man-in-the-middle and misbinding attacks, there are finer
properties to ask about. Each is a statement about the compromising attacker of
§1.3: what it learns, when, and what that gives it.

**Forward secrecy.** The attacker records a session, and *later* steals a
long-term key (Bob's certificate key, or Alice's). Can it decrypt the recorded
session? With RSA key transport, as in TLS 1.2's old `RSA` key exchange, yes:
the session key was sent encrypted under the server's RSA key, so stealing that
key opens every session ever recorded. With ephemeral Diffie-Hellman, no: the
ephemeral exponents were erased. The phrase "perfect forward secrecy" is common
too; "perfect" adds nothing. After the documents Edward Snowden released in 2013
showed large-scale recording of traffic, forward secrecy went from a nice
option to a requirement, and TLS 1.3 removed every key exchange without it.
Forward secrecy is only as good as the erasure: a server that caches session
tickets encrypted under one long-lived key for months has, in effect, turned
forward secrecy off for those months ([Chapter 5](05-TLS-in-Practice.md)).

**Harvest now, decrypt later.** A large enough quantum computer would solve the
discrete-log problems behind today's Diffie-Hellman
([Chapter 20 of book 1](../../book/20-Quantum-Computers.md)). Traffic recorded
today could then be decrypted, forward secrecy notwithstanding, because the
attacker would compute the ephemeral secret from the public shares. This is why
key exchange, unlike signatures, had to become post-quantum *before* such a
machine exists, and why from 2023 to 2025 TLS, SSH, Signal and iMessage all
added hybrid key exchanges that combine X25519 with ML-KEM
([Chapter 3](03-TLS-1.3-Message-by-Message.md) and book 5).

**Key-compromise impersonation (KCI).** The attacker steals *Alice's* long-term
key. Obviously it can now pretend to be Alice. Can it also pretend to be
*anyone else* to Alice? In some protocols, yes: if authentication is through a
static Diffie-Hellman value $g^{ab}$ that both sides can compute, knowing $a$
lets the attacker compute it for any $b$, and so impersonate Bob to Alice. A good
protocol limits the damage to the key that was stolen.

**Post-compromise security.** The attacker steals the *session state* at one
moment, all current keys, but then loses access. Does the session stay broken
forever? In TLS, yes, until the session ends. In Signal, no: each new
Diffie-Hellman ratchet step mixes in fresh secrets the attacker didn't see, and
the conversation heals. This property was named and defined by Katriel
Cohn-Gordon, Cas Cremers and Luke Garratt in 2016.

**Identity hiding.** A passive attacker should not learn who is talking. In
SIGMA, Alice's name travels in message 3 and can be encrypted under the new key,
so only Bob learns it. Which side gets protection against an *active* attacker
is a design choice: an active attacker can always start a run with Bob and see
Bob's name before revealing anything itself. TLS protects the client's
certificate against active attackers and the server's against passive ones.

**Downgrade resistance.** If Alice offers {strong, weak} and Bob supports both,
they should end up with strong even if an attacker deletes "strong" from the
offer. The transcript hash (§1.5) gives this, provided the authentication at the
end uses only strong algorithms. FREAK and Logjam ([Chapter 4](04-Thirty-Years-of-TLS-Attacks.md))
showed what happens otherwise: the authentication itself used the weak option.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Table of what each attacker steals, when, and which property protects the past or future traffic" fill="currentColor" font-size="13.5">
<rect x="10" y="10" width="620" height="34" class="soft" stroke="currentColor"/>
<text x="20" y="32" font-weight="bold">the attacker steals ...</text>
<text x="300" y="32" font-weight="bold">... and the property that limits the damage</text>
<rect x="10" y="44" width="620" height="50" fill="none" stroke="currentColor"/>
<text x="20" y="66">a long-term key, later</text>
<text x="20" y="84" font-size="12">(after recording traffic)</text>
<text x="300" y="66" class="acc-fill" font-weight="bold">forward secrecy</text>
<text x="300" y="84" font-size="12">old sessions stay secret: ephemeral keys are gone</text>
<rect x="10" y="94" width="620" height="50" fill="none" stroke="currentColor"/>
<text x="20" y="116">a quantum computer, later</text>
<text x="20" y="134" font-size="12">(harvest now, decrypt later)</text>
<text x="300" y="116" class="acc-fill" font-weight="bold">post-quantum key exchange</text>
<text x="300" y="134" font-size="12">ML-KEM in the handshake, hybrid with X25519</text>
<rect x="10" y="144" width="620" height="50" fill="none" stroke="currentColor"/>
<text x="20" y="166">Alice's long-term key</text>
<text x="20" y="184" font-size="12">(now)</text>
<text x="300" y="166" class="acc-fill" font-weight="bold">KCI resistance</text>
<text x="300" y="184" font-size="12">attacker can be Alice, but not Bob to Alice</text>
<rect x="10" y="194" width="620" height="50" fill="none" stroke="currentColor"/>
<text x="20" y="216">a session's current state</text>
<text x="20" y="234" font-size="12">(now, then loses access)</text>
<text x="300" y="216" class="acc-fill" font-weight="bold">post-compromise security</text>
<text x="300" y="234" font-size="12">future messages heal through fresh DH</text>
<rect x="10" y="244" width="620" height="50" fill="none" stroke="currentColor"/>
<text x="20" y="266">nothing; just watches</text>
<text x="20" y="284" font-size="12">(passive)</text>
<text x="300" y="266" class="acc-fill" font-weight="bold">identity hiding</text>
<text x="300" y="284" font-size="12">names travel encrypted under the new key</text>
</svg>
<figcaption>Figure 1.6. Each finer property of a key exchange answers one question: what does the attacker take, and when?</figcaption>
</figure>

## 1.9 A handshake over a twenty-minute link

*Level: intermediate.*

Every protocol in this book was designed on a planet where a round trip takes
somewhere between a millisecond (the next room) and a third of a second (the
other side of the world by satellite). Arcadia City, on Mars, is between about
3 and 22 light-minutes from Earth, depending on where the two planets are in
their orbits. That single number changes which protocols make sense.

Count the one-way trips before the first byte of real data arrives. A protocol
that needs no handshake at all, where the sender can encrypt to a key it already
has, costs one trip. TLS 1.3 needs one round trip before the client sends data,
so three one-way trips before that data reaches the server. TCP followed by TLS
1.2 needs seven.

```python
# How long does a handshake take between Earth and Mars?
C = 299_792.458                       # speed of light, km per second
distances = {"closest (2003)": 55.76e6, "average": 225e6, "farthest": 401e6}
flights = {"one-way message, no handshake": 1,
           "1-RTT handshake, then data": 3,
           "2-RTT handshake, then data": 5,
           "TCP + TLS 1.2, then data": 7}

for place, km in distances.items():
    one_way = km / C / 60             # minutes
    print(f"{place}: light time {one_way:.1f} min")
    for name, legs in flights.items():
        print(f"   {name:32s} {legs * one_way:6.1f} min")
```

```text
closest (2003): light time 3.1 min
   one-way message, no handshake       3.1 min
   1-RTT handshake, then data          9.3 min
   2-RTT handshake, then data         15.5 min
   TCP + TLS 1.2, then data           21.7 min
average: light time 12.5 min
   one-way message, no handshake      12.5 min
   1-RTT handshake, then data         37.5 min
   2-RTT handshake, then data         62.5 min
   TCP + TLS 1.2, then data           87.6 min
farthest: light time 22.3 min
   one-way message, no handshake      22.3 min
   1-RTT handshake, then data         66.9 min
   2-RTT handshake, then data        111.5 min
   TCP + TLS 1.2, then data          156.1 min
```

A two-and-a-half-hour wait to open a web page is not a protocol anyone would
use. In practice the interplanetary link would carry data between gateways, one
on each planet, and the people on Mars would use web pages cached locally; the
cryptography between the gateways has to be designed for the delay. The
lessons of this chapter say which tools fit.

- **Nonces cost a round trip, timestamps don't.** A challenge-response
  needs two crossings before anything is proved. Timestamps prove freshness in
  one, if both clocks agree to within a window. The two planets' clocks can be
  kept in agreement by the same physics that puts navigation satellites in
  agreement, but the window has to allow for the light time being known only
  approximately, and the receiver has to remember the messages it has accepted
  in the window.
- **Forward secrecy wants fresh shares from both sides.** A fresh
  Diffie-Hellman needs one share from each, which is a round trip. Signal's
  answer to the same problem on phones that are offline (prekeys: shares
  published in advance, used once, Chapter 16)
  works over light-minutes just as well as over hours of a phone being off.
- **Zero round-trip modes are tempting and dangerous.** TLS 1.3's 0-RTT data
  ([Chapter 3](03-TLS-1.3-Message-by-Message.md)) can be replayed, because it
  comes before the server's fresh contribution. On a link where every round
  trip costs forty minutes, the pull to use it is strong. The fix is the same as
  on Earth: only for requests that are safe to repeat.
- **Store and forward.** During solar conjunction, roughly every 26 months, the
  Sun sits between the planets and the link goes quiet for about two weeks.
  Messages wait in storage, and a protocol that expects an answer within
  minutes will time out. NASA and the space agencies' Consultative Committee for
  Space Data Systems (CCSDS) built **Delay-Tolerant Networking** for this, and
  its Bundle Protocol (RFC 9171) has its own security layer, Bundle Protocol
  Security (RFC 9172), which signs and encrypts each bundle on its own rather
  than relying on a live session. Chapter 20
  looks at it closely.

The general lesson for Earth too: count the round trips. Every protocol in this
book was redesigned at some point to save one, and each saving had a security
cost that had to be paid somewhere else.

## 1.10 In the real world

*Level: intermediate.*

A short tour of failures that follow the patterns of this chapter. Each has its
own place later in the book.

- **Kerberos replay windows** (1988 onward). Kerberos took Denning and Sacco's
  timestamps and has needed clock agreement within five minutes ever since; an
  attacker who can shift a server's clock gets a longer replay window
  ([Chapter 12](12-Kerberos.md)).
- **SSL 2.0 downgrade** (1995). SSL 2's negotiation was not covered by its
  final MAC, so an attacker could delete the strong cipher suites from the
  client's offer and force 40-bit export encryption. SSL 3.0 (1996) added a MAC
  over the handshake: an early transcript hash.
- **The TLS renegotiation attack** (2009, Marsh Ray and Steve Dispensa). TLS
  1.2 could renegotiate a new handshake inside an old connection, but the new
  handshake was not bound to the old one. An attacker could splice their own
  request in front of a victim's: a misbinding between two handshakes
  ([Chapter 4](04-Thirty-Years-of-TLS-Attacks.md)).
- **Triple handshake** (2014, Karthikeyan Bhargavan and colleagues). A
  misbinding across three TLS handshakes, found partly with formal tools, which
  pushed TLS 1.3's design to bind every key to the full transcript.
- **KRACK** (2017, Mathy Vanhoef and Frank Piessens). The WPA2 handshake had
  been proved secure; the proof didn't model *when* keys were installed, and
  replaying one handshake message made clients reinstall a key and reuse
  nonces ([Chapter 9](09-Wi-Fi-Security.md)).
- **5G authentication** (2018). A Tamarin analysis of the 3GPP 5G
  authentication protocol by David Basin, Cas Cremers and colleagues found that
  some of its security goals were not stated precisely and some properties were
  not achieved without extra assumptions. The standard was clarified as a
  result.

The pattern is steady. Almost no protocol has fallen because AES or SHA-256
broke. Protocols fall because a message is not bound to its context: to its
sender, its session, its time, its place in the conversation or the options
that were offered.

## 1.11 Going deeper

*Level: expert.*

**Symbolic and computational models.** The Dolev-Yao model is *symbolic*:
messages are terms, cryptography is a set of rewrite rules ("decrypting
$\{X\}_K$ with $K$ gives $X$"), and the question is whether the attacker can
derive a secret term. Symbolic analysis can be automated: ProVerif (Bruno
Blanchet, 2001), Tamarin (2012, Simon Meier, Benedikt Schmidt, Cas Cremers and
David Basin) and their relatives search for attacks over unbounded numbers of
sessions and either find one or prove there are none. The *computational*
model treats the attacker as a probabilistic polynomial-time algorithm and
proves a reduction: an attacker that wins against the protocol with advantage
$\varepsilon$ yields one that breaks a primitive with advantage about
$\varepsilon / (\text{number of sessions})$. Mihir Bellare and Phillip Rogaway
gave the first such definition for key exchange in 1993; Ran Canetti and Hugo
Krawczyk's 2001 model (CK) added session-state compromise; Brian LaMacchia,
Kristin Lauter and Anton Mityagin's eCK (2007) added more compromise patterns.
Canetti's universal composability (2001) asks for more again: that the protocol
stay secure when run alongside arbitrary other protocols.

**Why both models.** Symbolic tools are fast and find logical flaws, but cannot
see a problem that lives in the bits (a nonce reused across two keys, a
signature scheme that lets one signature verify under two keys). Computational
proofs see those, but are long, written by hand, and model a simplified
protocol. The TLS 1.3 design process used both, plus a verified implementation
(miTLS, in F\*), and found real problems with each.

**Authenticated and confidential channels.** A key exchange is only half a
protocol; the record layer that uses the key is the other. Tibor Jager, Florian
Kohlar, Sven Schäge and Jörg Schwenk's 2012 notion of an *authenticated and
confidential channel establishment* (ACCE) was created because TLS 1.2 used the
handshake key in the handshake (in the encrypted `Finished` message), which
breaks the clean separation that Bellare-Rogaway style proofs assume. TLS 1.3's
key schedule was designed to keep the keys apart.

**Channel binding.** An application running on top of a secure channel can ask
the channel for a value that identifies this channel uniquely (in TLS 1.3, the
`tls-exporter` value of RFC 9266), and mix it into its own authentication. This
stops a man in the middle who terminates two separate channels from relaying the
application's authentication between them. SCRAM and OAuth's bound tokens
([Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md)) use it.

**Open problems.** Proofs of post-quantum key exchange in the quantum random
oracle model; tight reductions for many-session security, so that parameters do
not have to absorb a factor of the number of sessions; protocols that remain
secure when the parties' randomness is weak; and models for delay-tolerant
settings where sessions last days and messages may arrive out of order.

## Check yourself

??? question "1. In the Dolev-Yao model, can the attacker learn $X$ from $\{X\}_{pk_B}$?"

    Only if it knows $B$'s private key, which it does when $B$ is the attacker
    itself (or a party it has compromised). Otherwise encryption is perfect.
    Lowe's attack uses exactly this: Alice encrypts for Mallory, who is the
    attacker, so Mallory can read it.

??? question "2. What single change fixes Needham-Schroeder, and what general rule does it illustrate?"

    Bob's name goes inside message 2: $\{N_A, N_B, B\}_{pk_A}$. The rule (Abadi
    and Needham): if a principal's identity matters to the meaning of a message,
    put the name in the message.

??? question "3. Why did the Denning-Sacco attack need a leaked session key, while Lowe's attack needed nothing leaked?"

    Denning-Sacco is a replay: the old ticket is valid, but Bob can't tell it is
    old, so anyone who learns that old session key can use it again. Lowe's
    attack is an interleaving of two runs; every key stays secret, and the flaw
    is purely in what the messages say.

??? question "4. Give one advantage and one disadvantage of timestamps over nonces."

    Advantage: no round trip is needed to prove freshness. Disadvantage: the
    parties need synchronized clocks, the receiver must remember messages
    within the window to stop replays, and an attacker who controls a clock can
    widen the window.

??? question "5. Plain Diffie-Hellman resists a passive listener. What exactly does an active attacker do, and what does it get?"

    It replaces each side's share with its own, so it runs one exchange with
    Alice and another with Bob, and relays (and can read and change) all the
    traffic between them.

??? question "6. In naive signed Diffie-Hellman, Eve swaps Alice's name and signature for her own. Does Eve learn the key? What harm is done?"

    No, the key is $g^{xy}$ and Eve knows neither exponent. The harm is that Bob
    believes his peer is Eve, so anything Alice sends is attributed to Eve, for
    example deposits credited to Eve's account.

??? question "7. In SIGMA, which part proves freshness and which part binds the name to the key?"

    The signature over both Diffie-Hellman shares proves the signer is live in
    this run (the other side's fresh share is inside). The MAC of the signer's
    own name under a key derived from $g^{xy}$ proves that the party who knows
    the key is the one claiming that name.

??? question "8. TLS 1.2 with the `RSA` key exchange is not forward secret. Explain why in one sentence."

    The client encrypts the premaster secret under the server's long-term RSA
    key, so anyone who records the session and later obtains that key can
    decrypt the premaster secret and every key derived from it.

??? question "9. A protocol authenticates with static Diffie-Hellman keys: the session key includes $g^{ab}$ from Alice's and Bob's long-term keys. Show that it is vulnerable to key-compromise impersonation."

    An attacker who steals Alice's private $a$ can compute $g^{ab} = B^a$ for
    Bob's public $B$, so it can produce everything Bob would produce and
    impersonate Bob *to Alice*. Mixing in ephemeral keys and signatures, or
    using a pattern like Noise's that includes ephemeral-static terms, limits
    this.

??? question "10. Between Earth and Mars at the average distance, how long after a client starts does its first data arrive with TLS 1.3, and with TCP plus TLS 1.2?"

    About 12.5 minutes one way. TLS 1.3 (one round trip, then data): 3 × 12.5 ≈
    37.5 minutes. TCP + TLS 1.2: 7 × 12.5 ≈ 87.6 minutes.

## What you learned

- A cryptographic protocol is a fixed conversation that uses primitives to reach
  goals against an attacker. Its goals have to be stated: authentication, key
  secrecy and freshness, forward secrecy, post-compromise security, identity
  hiding, downgrade protection.
- The standard attacker owns the network and may be a legitimate user. Most
  real breaks need nothing more.
- Needham-Schroeder fell to Lowe's interleaving attack because a message did
  not name its sender; one name fixed it.
- Freshness comes from nonces, timestamps or counters, each with costs. Every
  party must check freshness itself.
- Plain Diffie-Hellman needs authentication. Signing the shares stops the man in
  the middle but not identity misbinding; SIGMA's MAC of the name under the new
  key stops both.
- Transcript hashes make a final signature or MAC cover everything that was
  said, which is how modern protocols get downgrade protection.
- Long light-time links make round trips expensive and push designs toward
  timestamps, prekeys and store-and-forward security.

**Next:** [Chapter 2](02-Certificates-and-PKI.md), the system that tells a
browser whose public key it is looking at.

## Further reading

- Roger Needham and Michael Schroeder, "Using encryption for authentication in
  large networks of computers", *Communications of the ACM* 21(12) (1978).
- Dorothy Denning and Giovanni Sacco, "Timestamps in key distribution
  protocols", *Communications of the ACM* 24(8) (1981).
- Danny Dolev and Andrew Yao, "On the security of public key protocols", *IEEE
  Transactions on Information Theory* 29(2) (1983).
- Michael Burrows, Martín Abadi and Roger Needham, "A logic of authentication",
  *Proceedings of the Royal Society A* 426 (1989).
- Whitfield Diffie, Paul van Oorschot and Michael Wiener, "Authentication and
  authenticated key exchanges", *Designs, Codes and Cryptography* 2 (1992).
- Mihir Bellare and Phillip Rogaway, "Entity authentication and key
  distribution" (CRYPTO 1993).
- Gavin Lowe, "An attack on the Needham-Schroeder public-key authentication
  protocol", *Information Processing Letters* 56(3) (1995), and "Breaking and
  fixing the Needham-Schroeder public-key protocol using FDR" (TACAS 1996).
- Martín Abadi and Roger Needham, "Prudent engineering practice for
  cryptographic protocols", *IEEE Transactions on Software Engineering* 22(1)
  (1996).
- Ran Canetti and Hugo Krawczyk, "Analysis of key-exchange protocols and their
  use for building secure channels" (EUROCRYPT 2001).
- Hugo Krawczyk, "SIGMA: the 'SIGn-and-MAc' approach to authenticated
  Diffie-Hellman and its use in the IKE protocols" (CRYPTO 2003).
- Colin Boyd, Anish Mathuria and Douglas Stebila, *Protocols for
  Authentication and Key Establishment*, 2nd edition (Springer, 2020): the
  standard reference book.
- Katriel Cohn-Gordon, Cas Cremers and Luke Garratt, "On post-compromise
  security" (CSF 2016).
- David Basin, Jannik Dreier, Lucca Hirschi, Saša Radomirović, Ralf Sasse and
  Vincent Stettler, "A formal analysis of 5G authentication" (CCS 2018).
- RFC 3526 (the Diffie-Hellman groups used in §1.7), RFC 9171 and RFC 9172
  (the Bundle Protocol and its security).
- In book 1: [Chapter 19, Protocols](../../book/19-Protocols.md), the short
  tour.
