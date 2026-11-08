# 19. How protocols are broken

*Every attack so far in this book went after a primitive: a cipher, a hash, a
signature, a random number generator. This chapter goes after the rules that
glue the primitives together. A protocol can be broken while every piece of
cryptography in it stays perfect: the attacker reads nothing he is not entitled
to read and forges nothing, he only moves messages from one conversation to
another, sends one back to where it came from, or edits an offer so that both
sides agree to something weak. This chapter is about the method, not the
catalogue. You will learn a vocabulary of nine attack classes, find Lowe's 1995
attack on the Needham-Schroeder protocol by hand the way he reasoned about it,
write a small search program that finds the same attack by itself, read what a
ProVerif or Tamarin model looks like, and then go through the famous cases, from
TLS renegotiation to Matrix, asking of each: which class, how was it found, and
what fixed it.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a protocol attack is, and why it needs no broken primitive;
    - nine classes of protocol attack: man in the middle and interleaving,
      reflection, replay, type confusion, downgrade, cross-protocol,
      state-machine confusion, key-compromise impersonation and unknown key
      share;
    - how to find an attack by hand, with Needham-Schroeder and Lowe's attack
      worked step by step, and how strand spaces and message sequence charts
      make the reasoning exact;
    - how to find attacks by search, with a Python program that explores every
      interleaving of a few sessions against an attacker who owns the network;
    - what the Dolev-Yao model, ProVerif and Tamarin are, what a model in each
      looks like, and what they found in TLS 1.3 and 5G;
    - the limits of symbolic proofs: what they cannot see, and why proven
      protocols still fall;
    - the famous cases (TLS renegotiation, the triple handshake, FREAK, Logjam,
      DROWN, KRACK, Telegram's MTProto, Zoom in 2020, Matrix in 2022), each in
      about a page;
    - what a protocol designed to resist all this does.

    **You need:** what a protocol is and the attacker who owns the network, from
    book 1 [Chapter 19](../../book/19-Protocols.md), which tells TLS, SSH,
    Signal and Wi-Fi; public-key encryption and signatures from book 1
    [Chapter 13](../../book/13-RSA.md) and
    [Chapter 16](../../book/16-PKI-and-Key-Establishment.md); MACs from book 1
    [Chapter 10](../../book/10-Message-Authentication.md). The Protocols book
    ([its contents](../protocols/index.md)) tells the full story of each
    protocol and its attacks; this chapter is the attacker's method and links
    there for the rest. The padding oracle in DROWN is
    [Chapter 13](13-Attacks-on-RSA.md); the number field sieve behind Logjam is
    [Chapter 12](12-Discrete-Logarithms.md); the nonce reuse that KRACK causes
    is [Chapter 10](10-Attacks-on-Modes-and-MACs.md).

    **Levels:** §19.1 to §19.3 and §19.12 are for beginners; §19.4 to §19.6
    and §19.9 to §19.11 are intermediate; §19.7, §19.8 and §19.13 are expert.

## 19.1 The problem

*Level: beginner.*

In 1978 Roger Needham and Michael Schroeder, at Xerox PARC, published a short
paper on how computers on a large network could prove their identities to each
other and agree on secrets. It had two protocols, one with a trusted key server
and shared keys, one with public keys. Both were three to five messages long.
Both used encryption that the authors assumed perfect. Both were wrong. The
shared-key version fell in 1981, when Dorothy Denning and Giovanni Sacco showed
that an old session key, once stolen, could be replayed forever. The public-key
version lasted seventeen years. In 1995 Gavin Lowe, at Oxford, showed that a
dishonest user could impersonate anyone who had ever talked to him, using two
runs of the protocol and no cryptanalysis at all.

That is the shape of this chapter's attacks. The encryption is never broken.
What breaks is an assumption about *which conversation* a message belongs to,
*who* produced it, *when*, or *what kind of thing* it is. The designer reasons
about one run of the protocol between two honest people. The attacker runs it
many times, in parallel, with honest people and as an honest person, and uses
each run as a tool against the others.

### What the attacker can do

The standard attacker, written down by Danny Dolev and Andrew Yao in 1983, owns
the network. He can:

- read every message;
- stop any message, delay it, or deliver it twice or to someone else;
- make new messages out of anything he knows;
- start conversations with anyone, under his own name, because he is also a
  registered user with his own keys;
- decrypt only with keys he has, and sign only with his own key.

The last line is what "perfect cryptography" means in this model. The attacker
cannot do arithmetic on ciphertexts or guess keys. Everything else is allowed.
This is much stronger than an eavesdropper, and it is the right attacker for the
Internet, for Wi-Fi and for a radio link: on all three, whoever sits between the
parties can change what passes.

### What counts as a break

A protocol promises **goals**, and an attack is a run of the protocol, called a
**trace**, in which a goal fails while every honest party followed the rules.
The common goals are:

- **Secrecy**: a value (a key, a nonce, a message) that the protocol meant for
  two parties is learned by the attacker.
- **Authentication**, in increasing strength. *Aliveness*: if Bob finishes,
  Alice ran the protocol at some point. *Weak agreement*: Alice ran it with Bob.
  *Non-injective agreement*: Alice ran it with Bob, in the same roles, and they
  agree on the data (nonces, keys). *Injective agreement*: as before, and each of
  Bob's finished runs matches a different run of Alice's, so nothing can be
  replayed. Lowe gave this hierarchy in 1997, and it is still the vocabulary the
  tools use.
- **Key confirmation**, **forward secrecy**, **identity hiding**, **downgrade
  protection**: what each means is in the Protocols book,
  [Chapter 1](../protocols/01-What-a-Protocol-Must-Do.md).

So a protocol attack is a specific object: a sequence of sends and receives,
each one allowed by the rules, ending in a state where some honest party
believes a statement that is false. To break a protocol is to find that
sequence. The rest of the chapter is about how people and programs find it.

### Why this is cryptanalysis

It is tempting to treat protocol bugs as programming errors, a different trade
from breaking ciphers. They are not. A protocol is a cryptographic object with a
security claim, and the attacker's work is the same as in the rest of this
book: understand the claim exactly, model what the attacker controls, and search
the space of things he can do for one that violates it. The space is different.
For a block cipher it is keys and texts; for a protocol it is **interleavings**:
which messages go to which session in which order. That space is enormous and
discrete, and it rewards the same mixture of insight and brute force as
differential cryptanalysis does. The tools that search it, ProVerif and Tamarin,
are to protocols what SAT solvers are to stream ciphers (Chapter 7).

The record also says this is where real systems fall. Of the famous TLS
breaks between 2009 and 2016, more were protocol-logic breaks (renegotiation,
triple handshake, FREAK, Logjam, DROWN) than breaks of the primitives TLS used.
Book 1 [Chapter 19](../../book/19-Protocols.md) and the Protocols book's
[Chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md) tell those stories;
here they are used to teach how such breaks are found.

## 19.2 Attacks on messages

*Level: beginner.*

The nine classes divide roughly into two kinds. The first four are about single
messages: the attacker relays one, sends one back, sends an old one, or makes one
be read as something it is not. The other five, in §19.3, are about whole
sessions. The classes overlap, and most real attacks combine two or three. A
name is useful because it tells you where to look.

### Man in the middle and interleaving

The **man in the middle** sits between two parties and runs the protocol with
each, so that each believes it talks to the other. Against unauthenticated
Diffie-Hellman it is the whole attack: Alice agrees a key with Mallory, Mallory
agrees a key with Bob, and he relays everything between them, reading as he
goes. The fix there is authentication, which book 1
[Chapter 12](../../book/12-Diffie-Hellman.md) covers.

The subtler form is the **interleaving** attack, where the protocol *does*
authenticate, and the attacker gets around it by running two or more sessions
at once and feeding messages from one into another. The honest parties are used
as **oracles**: one decrypts or signs something for the attacker because, in
the session it thinks it is in, doing so is correct. Lowe's attack on
Needham-Schroeder (§19.4) is the classic. The renegotiation attack on TLS
(§19.9) is an interleaving at a larger scale: two whole handshakes, one the
attacker's and one the victim's, spliced on one connection.

Where to look: any message that an honest party produces in response to a
message it cannot fully check. If Bob will decrypt, sign or MAC something an
attacker chose, ask what else that output could be used for.

### Reflection

A **reflection** attack sends a party its own message back. It works against
symmetric protocols where both sides do the same thing with the same key: the
party cannot tell its own challenge from its peer's.

Here is a small example. A door to an airlock in Arcadia City and every
resident's badge share a key $K$. When a badge approaches, both sides should
prove they know $K$:

$$
\begin{aligned}
1.&\quad \text{Badge} \to \text{Door}:\ N_1\\
2.&\quad \text{Door} \to \text{Badge}:\ \mathrm{MAC}_K(N_1),\ N_2\\
3.&\quad \text{Badge} \to \text{Door}:\ \mathrm{MAC}_K(N_2)
\end{aligned}
$$

The attacker has no key. He opens run 1 with the door and sends any nonce; the
door answers with a MAC he does not need and a challenge $N_2$ he cannot answer.
He opens run 2, and as *its* first message sends $N_2$. The door, being helpful,
answers with $\mathrm{MAC}_K(N_2)$, which is exactly what run 1 is waiting for.
He sends it in run 1, and the airlock opens. Run 2 is left hanging; the door
times it out and forgets it.

```python
# A reflection attack on a shared-key challenge-response.
# The airlock door and every resident's badge share the key K.
import hmac, hashlib, secrets

K = secrets.token_bytes(32)

def tag(key, data):
    return hmac.new(key, data, hashlib.sha256).digest()

class Door:
    def __init__(self, fixed=False):
        self.fixed, self.open_runs = fixed, {}
    def hello(self, run, badge_nonce):
        # Prove "I am the door" by tagging the badge's nonce, and challenge back.
        mine = secrets.token_bytes(16)
        self.open_runs[run] = mine
        label = b"door" if self.fixed else b""
        return tag(K, label + badge_nonce), mine
    def finish(self, run, answer):
        label = b"badge" if self.fixed else b""
        ok = hmac.compare_digest(answer, tag(K, label + self.open_runs.pop(run)))
        return "airlock opens" if ok else "refused"

for fixed in (False, True):
    door = Door(fixed)
    _, challenge = door.hello(1, b"anything")        # run 1: the attacker poses as a badge
    answer, _ = door.hello(2, challenge)              # run 2: hand the door its own challenge
    print("fixed" if fixed else "plain", "->", door.finish(1, answer))
```

```text
plain -> airlock opens
fixed -> refused
```

The fix is one word inside each MAC. The door tags `"door"` and its peer's
nonce; the badge tags `"badge"` and the door's nonce. A tag made by the door
can no longer be accepted as one made by a badge, because the inputs differ.
The general rule: **every authenticated message says who made it and in which
role**. Other fixes work too (separate keys per direction, or refusing to
answer a challenge that equals one you issued), but the label is the one that
does not depend on remembering state.

Reflection is not only a textbook attack. In 2019 Nir Drucker and Shay Gueron
described "Selfie", a reflection attack on TLS 1.3 when a group of machines
share one external pre-shared key: a machine can be made to accept its own
handshake messages, reflected, as coming from a peer, because a PSK alone does
not say which side is which. The fix again is to bind identities to the key.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two small sequence diagrams: a reflection attack on a door using two runs, and a replay of a payment message" fill="currentColor" font-size="13">
<text x="160" y="18" text-anchor="middle" font-weight="bold">Reflection</text>
<text x="60" y="42" text-anchor="middle">Attacker</text>
<text x="260" y="42" text-anchor="middle">Door</text>
<line x1="60" y1="50" x2="60" y2="270" stroke="currentColor"/>
<line x1="260" y1="50" x2="260" y2="270" stroke="currentColor"/>
<line x1="60" y1="75" x2="254" y2="75" stroke="currentColor" stroke-width="1.4"/>
<polygon points="260,75 250,70 250,80"/>
<text x="160" y="69" text-anchor="middle">run 1: X</text>
<line x1="260" y1="110" x2="66" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="60,110 70,105 70,115"/>
<text x="160" y="104" text-anchor="middle">run 1: tag(X), N</text>
<line x1="60" y1="145" x2="254" y2="145" stroke="currentColor" stroke-width="1.4"/>
<polygon points="260,145 250,140 250,150"/>
<text x="160" y="139" text-anchor="middle">run 2: N</text>
<line x1="260" y1="180" x2="66" y2="180" stroke="currentColor" stroke-width="1.4"/>
<polygon points="60,180 70,175 70,185"/>
<text x="160" y="174" text-anchor="middle">run 2: tag(N), N′</text>
<line x1="60" y1="215" x2="254" y2="215" stroke="currentColor" stroke-width="2.4"/>
<polygon points="260,215 250,210 250,220"/>
<text x="160" y="209" text-anchor="middle" font-weight="bold">run 1: tag(N)</text>
<text x="160" y="255" text-anchor="middle">door accepts run 1</text>
<line x1="320" y1="10" x2="320" y2="290" stroke="currentColor" opacity="0.3"/>
<text x="490" y="18" text-anchor="middle" font-weight="bold">Replay</text>
<text x="370" y="42" text-anchor="middle">Alice</text>
<text x="480" y="42" text-anchor="middle">Attacker</text>
<text x="600" y="42" text-anchor="middle">Bank</text>
<line x1="370" y1="50" x2="370" y2="270" stroke="currentColor"/>
<line x1="480" y1="50" x2="480" y2="270" stroke="currentColor"/>
<line x1="600" y1="50" x2="600" y2="270" stroke="currentColor"/>
<line x1="370" y1="85" x2="594" y2="85" stroke="currentColor" stroke-width="1.4"/>
<polygon points="600,85 590,80 590,90"/>
<text x="485" y="79" text-anchor="middle">pay 10, MAC</text>
<line x1="480" y1="85" x2="480" y2="120" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="488" y="110" text-anchor="start">copy</text>
<text x="600" y="140" text-anchor="middle">paid</text>
<text x="420" y="175" text-anchor="middle" opacity="0.7">next day</text>
<line x1="480" y1="200" x2="594" y2="200" stroke="currentColor" stroke-width="2.4"/>
<polygon points="600,200 590,195 590,205"/>
<text x="540" y="194" text-anchor="middle" font-weight="bold">pay 10, MAC</text>
<text x="600" y="240" text-anchor="middle">paid again</text>
</svg>
<figcaption>Figure 19.1. Two message attacks. Left: reflection, where the door answers its own challenge in a second run, and the answer completes the first. Right: replay, where a valid message is valid again. In both the cryptography checks out; what is missing is a role label on the left and freshness on the right.</figcaption>
</figure>

### Replay

A **replay** sends an old, valid message again. If Alice's "pay Bob 10" carries
a correct MAC today, it carries a correct MAC tomorrow. Integrity protection says
the message was made by someone with the key; it says nothing about *when* or
*how many times*. Denning and Sacco's 1981 attack on the shared-key
Needham-Schroeder protocol is a replay with a twist: the attacker replays the
key server's old ticket, holding a session key he had stolen, and Bob accepts
the stale key as fresh. The Protocols book tells it in
[Chapter 1](../protocols/01-What-a-Protocol-Must-Do.md).

The cures are **freshness** mechanisms: a nonce the receiver chose and checks
for in the reply, a timestamp with a window, or a counter the receiver tracks.
Each has a cost. Nonces need a round trip. Timestamps need synchronized clocks
and accept replays within the window. Counters need state that survives
reboots. TLS 1.3's 0-RTT data gives up the round trip and so gives up replay
protection for its first flight; RFC 8446 says so plainly and leaves it to the
application to send only replay-safe requests that way.

Where to look: anything accepted without a value the receiver chose or tracks.
Also look at what a replay *resets*: KRACK (§19.11) is a replay of one
handshake message whose effect was to reset a counter.

### Type confusion

A **type confusion** (or type flaw) gets a message, or part of one, accepted as
a different kind of value. On the wire everything is bytes. If a field that
should hold a key can be filled with something that is not a key, such as a
name plus a nonce the attacker knows, or if a message from step 2 has the same
layout as a message from step 4, the receiver may parse one as the other.

The early protocol literature is full of these. In the Otway-Rees key
distribution protocol, a field built from a run identifier and two names, sent
encrypted under Alice's key in her first message, can have the same length
and layout as the nonce-plus-key block the server later sends her under the
same key. An attacker bounces Alice's first message straight back to her as the
last one, and she accepts the run identifier and the two names, which also
travel in clear, as the session key. The real-world versions are larger. In 2012 Nikos
Mavrogiannopoulos and colleagues showed that a TLS server's signed elliptic
curve parameters could, with some probability, be parsed by a client as valid
finite-field Diffie-Hellman parameters, because the signature in TLS 1.2 covered
the parameters but not *which kind* of key exchange they were for. JSON Web
Tokens had the same disease in 2015, when libraries accepted a token "signed"
with HMAC using the server's public RSA key as the HMAC key (the Protocols book,
[Chapter 14](../protocols/14-OAuth-OpenID-Connect-and-JWT.md)).

The cures are **tagging** (every message and field carries its type, so that
parsing as the wrong type fails) and **unambiguous encoding** (lengths and
types written into the bytes, never inferred). The formal tools must be told
whether to assume types are checked; Tamarin and ProVerif by default assume an
untyped attacker who may send any term anywhere, which is how they find these.

## 19.3 Attacks on sessions

*Level: beginner.*

The next five classes are about a session as a whole: what it agreed to, which
protocol it belongs to, which state it is in, and whose keys it trusts.

### Downgrade

Most protocols **negotiate**: the client offers versions and algorithms, the
server picks one. A **downgrade** attack edits the offer, or the answer, so that
two parties who both support something strong agree on something weak, and then
breaks the weak thing. The negotiation itself becomes the target.

The defense has to be cryptographic, because the attacker owns the network.
Both sides must, at the end of the handshake, authenticate the *whole
negotiation* (everything offered and everything chosen) under a key the
attacker cannot have. SSL 2, the first public version of Netscape's protocol,
did not: its cipher list traveled in clear and nothing checked it afterwards,
so an attacker could strip the strong ciphers and leave 40-bit export ones.
SSL 3.0 (1996) added the Finished message, a MAC over the whole handshake. That
should have ended downgrades, and it did not, for two reasons that recur in
every later case.

First, the MAC is keyed by the session's own key. If the attacker can push the
session onto an algorithm weak enough to break *during* the handshake, he
learns the key, forges both Finished messages, and the check passes. That is
FREAK and Logjam (§19.10). The fix is to authenticate the negotiation with
something long-term that the weak algorithm does not touch: in TLS 1.3 the
server signs a hash of the whole transcript with its certificate key
(RFC 8446).

Second, the parties may negotiate *outside* the protocol. Browsers in the
2000s, faced with broken servers that choked on new versions, retried with an
older version when a connection failed. An attacker who drops the first try
gets the second, at a version of his choosing, and no Finished message covers a
connection that was never made. POODLE (2014) used this "fallback dance" to
force SSL 3.0 and then attacked its padding. The fix was a signal value in the
retry, so a server that supports better knows the client was pushed down, and
then TLS 1.3's sentinel: a server that supports 1.3 but is asked for 1.2 writes
fixed bytes ("DOWNGRD") into the end of its random value, which the client
checks and the server's signature covers.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Downgrade attack: the attacker edits the client's offer to leave only a weak option, breaks the weak key during the handshake, and forges the Finished messages" fill="currentColor" font-size="13">
<text x="80" y="22" text-anchor="middle" font-weight="bold">Client</text>
<text x="320" y="22" text-anchor="middle" font-weight="bold">Attacker</text>
<text x="560" y="22" text-anchor="middle" font-weight="bold">Server</text>
<line x1="80" y1="32" x2="80" y2="280" stroke="currentColor"/>
<line x1="320" y1="32" x2="320" y2="280" stroke="currentColor"/>
<line x1="560" y1="32" x2="560" y2="280" stroke="currentColor"/>
<line x1="80" y1="60" x2="314" y2="60" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320,60 310,55 310,65"/>
<text x="200" y="54" text-anchor="middle">offer: strong, weak</text>
<line x1="320" y1="90" x2="554" y2="90" stroke="currentColor" stroke-width="2.4"/>
<polygon points="560,90 550,85 550,95"/>
<text x="440" y="84" text-anchor="middle" font-weight="bold">offer: weak only</text>
<line x1="560" y1="125" x2="86" y2="125" stroke="currentColor" stroke-width="1.4"/>
<polygon points="80,125 90,120 90,130"/>
<text x="440" y="119" text-anchor="middle">chosen: weak, weak key share</text>
<rect x="250" y="140" width="140" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="162" text-anchor="middle">break weak key</text>
<line x1="80" y1="200" x2="314" y2="200" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320,200 310,195 310,205"/>
<text x="200" y="194" text-anchor="middle">Finished (MAC of transcript)</text>
<line x1="320" y1="230" x2="554" y2="230" stroke="currentColor" stroke-width="2.4"/>
<polygon points="560,230 550,225 550,235"/>
<text x="440" y="224" text-anchor="middle" font-weight="bold">forged Finished</text>
<text x="320" y="268" text-anchor="middle">Fix: authenticate the transcript with a key the weak option never touches</text>
</svg>
<figcaption>Figure 19.2. A downgrade. The attacker edits the offer; if he can break the weak option before the handshake ends, a transcript MAC under the session key protects nothing, because he has that key. A signature over the transcript with a long-term key does protect it.</figcaption>
</figure>

### Cross-protocol

A **cross-protocol** attack uses one protocol to break another, because the two
share something: a key, a certificate, a message format. Each protocol may be
secure alone. Together they give the attacker an oracle: he asks the old,
weak protocol to do something with the shared key, and uses the answer in the
new, strong one.

DROWN (§19.10) is the clearest real case: a server's RSA key used both for
modern TLS and for SSL 2 lets an attacker use SSL 2 as a padding oracle to
decrypt TLS sessions. ALPACA (2021, Marcus Brinkmann and colleagues) is a
quieter one: a certificate valid for several names lets an attacker redirect a
browser's HTTPS connection to an FTP or mail server with the same certificate,
which will cheerfully reflect parts of the request back as a web page. The
Mavrogiannopoulos attack of §19.2 is cross-protocol between two key exchanges
inside TLS.

The rule is **one key, one purpose**: never use the same key in two protocols,
two versions or two roles, unless every message in each is tagged so that no
message from one can be valid in the other. Where reuse cannot be avoided
(TLS certificates are expensive to separate), the signed content must name the
protocol and the context; TLS 1.3 prefixes what it signs with 64 spaces and a
string such as "TLS 1.3, server CertificateVerify" for exactly this reason.

### State-machine confusion

A protocol specification describes a **state machine**: in state X, accept only
messages of type Y, then move to state Z. An implementation also has one,
usually not drawn anywhere, spread across flags and if-statements. A
**state-machine attack** sends messages out of order, skips one, repeats one,
or sends one the current state should not accept, and finds that the
implementation, or the standard, does something it should not.

These are the most common protocol bugs in practice, because each feature adds
paths and nobody tests the forbidden ones. In 2014 Masashi Kikuchi found that
OpenSSL accepted the ChangeCipherSpec message too early, before the master
secret was set, so both sides would switch to keys derived from an empty
secret ("CCS injection"). In 2015 the miTLS team's paper "A Messy State of the
Union" tested TLS libraries with deliberately wrong message sequences and found,
among others, that clients would skip the server's key-exchange message or
certificate check entirely if the server simply did not send it; FREAK came out
of the same work. In 2023 Fabian Bäumer, Marcus Brinkmann and Jörg Schwenk's
Terrapin attack on SSH removed messages at the start of the encrypted channel by
adjusting sequence numbers during the unauthenticated phase (Protocols book,
[Chapter 6](../protocols/06-SSH.md)). And KRACK (§19.11) was a state-machine
flaw in the Wi-Fi standard itself.

The method that finds them is plain: draw the state machine from the standard,
then systematically send every message in every state. When the implementation
is a black box, **protocol state fuzzing** learns its state machine by
experiment (automata learning, as in Joeri de Ruiter and Erik Poll's 2015 study
of TLS implementations) and a person compares the learned machine with the
specified one. Extra states and extra arrows are where the bugs are.

### Key-compromise impersonation

Some goals are about what happens *after* a key leaks. If Mallory steals Alice's
long-term private key, he can of course impersonate Alice to everyone. A
**key-compromise impersonation** (KCI) attack goes further: with Alice's key,
Mallory impersonates *other people to Alice*. A protocol is KCI-resistant if a
stolen key lets you be Alice but not fool her.

Many protocols with static Diffie-Hellman keys are not, because the shared
secret $g^{ab}$ can be computed from either side's private key. If Bob's
identity is proved by knowing $g^{ab}$, then anyone with $a$ can prove it too.
In 2015 Clemens Hlauschek and colleagues showed exactly this in TLS's rarely
used client certificates with fixed Diffie-Hellman keys: a client whose
certificate key was stolen could then be fooled by a fake server for any site.
Where to look: any authentication that rests on a value both sides can compute.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Two panels: an unknown key share, where Alice and Bob share a key but Bob thinks it is shared with Eve; and key-compromise impersonation, where Eve holding Alice's key impersonates Bob to Alice" fill="currentColor" font-size="13">
<text x="160" y="20" text-anchor="middle" font-weight="bold">Unknown key share</text>
<rect x="20" y="40" width="100" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="70" y="65" text-anchor="middle">Alice</text>
<rect x="200" y="40" width="100" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="250" y="65" text-anchor="middle">Bob</text>
<rect x="110" y="140" width="100" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<text x="160" y="165" text-anchor="middle">Eve</text>
<line x1="120" y1="60" x2="200" y2="60" stroke="currentColor" stroke-width="2.4"/>
<text x="160" y="52" text-anchor="middle">key k</text>
<text x="70" y="104" text-anchor="middle">"k is shared</text>
<text x="70" y="120" text-anchor="middle">with Bob"</text>
<text x="250" y="104" text-anchor="middle">"k is shared</text>
<text x="250" y="120" text-anchor="middle">with Eve"</text>
<text x="160" y="210" text-anchor="middle">Eve never learns k, but Bob</text>
<text x="160" y="228" text-anchor="middle">credits Alice's words to Eve</text>
<line x1="320" y1="10" x2="320" y2="250" stroke="currentColor" opacity="0.3"/>
<text x="480" y="20" text-anchor="middle" font-weight="bold">Key-compromise impersonation</text>
<rect x="340" y="40" width="100" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="65" text-anchor="middle">Alice</text>
<rect x="520" y="40" width="100" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<text x="570" y="58" text-anchor="middle">Eve, as</text>
<text x="570" y="74" text-anchor="middle">"Bob"</text>
<line x1="440" y1="60" x2="520" y2="60" stroke="currentColor" stroke-width="2.4"/>
<text x="480" y="52" text-anchor="middle">session</text>
<text x="570" y="110" text-anchor="middle">holds Alice's</text>
<text x="570" y="126" text-anchor="middle">private key a</text>
<text x="480" y="170" text-anchor="middle">shared secret g^ab is computable</text>
<text x="480" y="188" text-anchor="middle">from a alone, so Eve passes</text>
<text x="480" y="206" text-anchor="middle">Alice's check that she is Bob</text>
</svg>
<figcaption>Figure 19.3. Two failures of identity. Left: in an unknown key share, the key is secret, but the two honest parties disagree about whom it is shared with. Right: in key-compromise impersonation, a stolen key lets the thief impersonate others to its owner.</figcaption>
</figure>

### Unknown key share

The last class is the most surprising, because nobody learns anything secret.
In an **unknown key share** (UKS), Alice and Bob end up with the same key, which
the attacker does not know, but they disagree about whom they share it with:
Alice thinks she shares it with Bob, Bob thinks he shares it with Eve.

Why is that an attack? Because Bob will credit what Alice says to Eve. If Bob
is a bank and Alice deposits a cheque over the channel, Bob credits Eve's
account. Whitfield Diffie, Paul van Oorschot and Michael Wiener noted the
problem in 1992 in their station-to-station paper; Simon Blake-Wilson and
Alfred Menezes showed in 1999 that one variant of station-to-station falls to
it when Eve may register Alice's public key as her own with a certificate
authority that does not check she holds the private key. Eve then relabels
Alice's messages to Bob as hers. She cannot read the session, and does not need
to.

The general cause is a key that does not depend on the identities. If the
session key is a function only of nonces and Diffie-Hellman shares, any party
who can get those values into two sessions with different labels gets an
unknown key share. The triple handshake (§19.9) is a UKS on TLS: it gave a
client and a server the same master secret in two connections with different
peers, and then built a full impersonation on top. The fix is to put the
identities, or the whole transcript that contains them, into the key
derivation, so that different views give different keys.

### The table

| Class | What the attacker does | First place to look |
| --- | --- | --- |
| Man in the middle, interleaving | runs sessions with both sides, feeds one into another | responses an honest party computes on attacker-chosen input |
| Reflection | sends a party its own message | symmetric roles under one key |
| Replay | resends an old valid message | anything without a receiver-chosen nonce, counter or time |
| Type confusion | makes a field or message parse as another | fields with the same layout; untagged signatures |
| Downgrade | edits the negotiation | what is negotiated, and what authenticates it |
| Cross-protocol | uses another protocol sharing a key | keys and certificates shared across versions or protocols |
| State machine | sends messages in the wrong order or state | optional messages; retransmissions; error paths |
| Key-compromise impersonation | uses a stolen key to fool its owner | authentication from values both sides can compute |
| Unknown key share | relabels a session's peer | keys that do not depend on identities |

## 19.4 Finding an attack by hand: Lowe and Needham-Schroeder

*Level: intermediate.*

The best way to learn how protocol attacks are found is to find one. This is
the protocol Lowe broke, with the key-server messages left out (each party is
assumed to know the other's public key). The Protocols book walks through it
as a story in [Chapter 1](../protocols/01-What-a-Protocol-Must-Do.md) and
codes the attack; here the question is different: how would you have found it?

$$
\begin{aligned}
1.&\quad A \to B:\ \{N_A,\ A\}_{pk_B}\\
2.&\quad B \to A:\ \{N_A,\ N_B\}_{pk_A}\\
3.&\quad A \to B:\ \{N_B\}_{pk_B}
\end{aligned}
$$

### Step 1: write the claims down

A protocol is only wrong relative to a claim, so first write the claims each
role makes when it finishes. The designers meant:

- **Bob's claim**, at the end of his run: "I have been talking to Alice, she
  has taken part in this run with me, and only she and I know $N_A$ and
  $N_B$."
- **Alice's claim**: "I have been talking to Bob, he has taken part with me,
  and only he and I know $N_A$ and $N_B$."

Notice that the claims are conditional on the peer being honest. If Alice runs
the protocol with Mallory, of course Mallory knows the nonces; nobody promises
otherwise. The claims only bind runs whose named peer is honest.

### Step 2: for each received message, ask who could have made it

The core of hand analysis is one question, asked at every receive: **this
message is well formed; who, other than the intended sender, could have
produced it?** The attacker can produce a message if he can build it from what
he knows, or if he can get an honest party to build it for him.

Take Bob's view.

- *Message 1*, $\{N_A, A\}_{pk_B}$. Anyone can make this: it is encrypted for
  Bob with his public key and contains a name and a number. Bob learns nothing
  from it. He does not think he does; he relies on message 3.
- *Message 3*, $\{N_B\}_{pk_B}$. To make this, you must know $N_B$. Bob sent
  $N_B$ only inside message 2, encrypted for Alice. So whoever made message 3
  either is Alice or got Alice to decrypt message 2. Bob's reasoning stops at
  "is Alice". The attacker's reasoning continues: *when would Alice decrypt
  $\{N_A, N_B\}_{pk_A}$ and send $N_B$ out?*

### Step 3: find a role that does what you need

Alice sends out the second component of a decrypted message 2 in exactly one
place: step 3 of a run she started. She encrypts it for *the peer of that run*.
If the peer of that run is Mallory, she encrypts $N_B$ for Mallory, and he
reads it. So the attacker needs Alice, in a run with Mallory, to receive Bob's
message 2.

Will she accept it? Alice checks only that the first component is the $N_A$
she chose in that run. Bob's message 2 contains whatever $N_A$ Bob received in
message 1. So the attacker needs Bob's run to have been started with *Alice's*
nonce from her run with Mallory. And Mallory has that nonce, because Alice
sent it to him, encrypted with his key, in message 1 of that run.

### Step 4: assemble the trace

Working backwards gave the pieces; written forwards, in Lowe's own notation
($I$ is the intruder, $I(A)$ the intruder posing as $A$, and 1.x and 2.x are
the two runs):

<div class="mars-steps" markdown>

1. **1.1** $A \to I:\ \{N_A, A\}_{pk_I}$. Alice starts an honest run with
   Mallory, because she wants to talk to him.
2. **2.1** $I(A) \to B:\ \{N_A, A\}_{pk_B}$. Mallory decrypts it and
   re-encrypts the same content for Bob.
3. **2.2** $B \to I(A):\ \{N_A, N_B\}_{pk_A}$. Bob answers "Alice"; Mallory
   intercepts the message, unable to read it.
4. **1.2** $I \to A:\ \{N_A, N_B\}_{pk_A}$. Mallory delivers it to Alice as
   message 2 of *her run with him*. Her nonce is in it, so she accepts.
5. **1.3** $A \to I:\ \{N_B\}_{pk_I}$. Alice completes her run, encrypting
   $N_B$ for her peer, Mallory.
6. **2.3** $I(A) \to B:\ \{N_B\}_{pk_B}$. Mallory re-encrypts $N_B$ for Bob,
   who completes his run believing he talked to Alice and that only she
   knows $N_A$ and $N_B$.

</div>

Both of Bob's claims fail. He believes he talked to Alice, but Alice never ran
the protocol with him (agreement fails). He believes only Alice knows $N_B$,
but Mallory knows it (secrecy fails). Alice's claims, in her run with Mallory,
are untouched: she never claimed anything about a run with Bob.

The step that did the work was Step 3, the search for an honest role that
transforms a message the attacker cannot read into one he can. Alice served as
a **decryption oracle** for messages encrypted to her, as long as they fitted
the shape of a message 2 and carried a nonce Mallory could supply. That is the
general shape of an interleaving attack, and the questions in Steps 2 and 3 are
how to find one: for every value an honest party must keep secret or must check,
list every place in every role where an honest party *outputs* something
derived from it, and ask whether the attacker can steer an input there.

### Step 5: fix it, and redo the reasoning

The message that was misused is message 2: it says nothing about who sent it,
so Alice, in a run with Mallory, could not tell it came from Bob. Lowe's fix
adds the responder's name:

$$
2'.\quad B \to A:\ \{N_A,\ N_B,\ B\}_{pk_A}
$$

Redo Step 3. Alice now outputs $N_B$ only after receiving
$\{N_A, N_B, X\}_{pk_A}$ in a run whose peer is $X$. For Mallory to read $N_B$,
the run must be with Mallory, so $X = I$. But Bob writes his own name, $B$, and
Mallory cannot change it inside a ciphertext he cannot open. Alice's run with
Mallory rejects Bob's message. No other role outputs $N_B$, so the attack is
gone, and with a careful version of this argument for every claim (§19.5) the
protocol, known as Needham-Schroeder-Lowe, can be proved correct in the
symbolic model.

### Why it took seventeen years

Needham-Schroeder was not obscure. It was in textbooks, and in 1989 Michael
Burrows, Martín Abadi and Roger Needham analyzed it with their **BAN logic**, a
logic of belief ("$A$ believes $X$", "$B$ once said $X$") that turned protocol
reasoning into short derivations. The BAN analysis did not find the attack, and
the reason teaches something. BAN starts by *idealizing* the protocol: each
message is rewritten as the statement it is meant to convey, and that step
silently assumed that message 2 came from Bob. BAN also assumed every principal
honest; there was no way to express "Alice runs the protocol with a dishonest
insider". Lowe's attack needs both of the things BAN had abstracted away.

Lowe found the attack with a machine. He was building a method for checking
protocols with FDR, a model checker for Tony Hoare's process algebra CSP,
and Needham-Schroeder was a test case. FDR explored all behaviors of a small
system with one initiator, one responder and an intruder, and returned the
trace above. Lowe's 1995 paper in *Information Processing Letters* gave the
attack; his 1996 paper at the TACAS conference, "Breaking and fixing the
Needham-Schroeder public-key protocol using FDR", showed how the tool found it
and proved the fixed protocol correct for the small system, with an argument
that the small system was enough.

!!! note "Life story: Lowe's attack"
    **Born:** 1995, Gavin Lowe at Oxford, in *Information Processing Letters*;
    the model-checking account at TACAS 1996 · **Purpose:** to show that a
    textbook protocol, analyzed with BAN logic, let an insider impersonate
    anyone who talked to him · **Helped:** to turn protocol analysis into a
    search problem, from FDR and Casper to ProVerif, Tamarin and the TLS 1.3
    analyses; gave the field its first example and the rule "name the sender
    inside the message" · **Status:** the standard first exercise of every
    protocol verification course and tool tutorial

## 19.5 Strands and message sequences

*Level: intermediate.*

Lowe's hand analysis was a chain of "who could have made this?" questions. The
**strand space** method, introduced in 1998 by F. Javier Thayer Fábrega,
Jonathan Herzog and Joshua Guttman at MITRE, turns those questions into a
small mathematical theory, in which a proof that a protocol is correct is the
same kind of reasoning that finds attacks.

### Strands, bundles and the penetrator

A **strand** is one participant's view of one run: the sequence of messages it
sends and receives, written with a sign, $+m$ for sending and $-m$ for
receiving. The initiator strand of Needham-Schroeder, for Alice with peer $X$
and nonces $N_A$, $N_B$, is

$$
\langle\, +\{N_A, A\}_{pk_X},\ \ -\{N_A, N_B\}_{pk_A},\ \ +\{N_B\}_{pk_X} \,\rangle,
$$

and the responder strand, for Bob with claimed peer $Y$, is

$$
\langle\, -\{N_A, Y\}_{pk_B},\ \ +\{N_A, N_B\}_{pk_Y},\ \ -\{N_B\}_{pk_B} \,\rangle.
$$

The attacker, called the **penetrator** in this theory, is also made of
strands, very short ones, one for each thing the Dolev-Yao attacker can do:
emit a public value or a key he has; take two messages and send their
concatenation; take a concatenation and send its parts; take a key and a
message and send the encryption; take an encryption and the matching private
key and send the plaintext. Every derivation the attacker makes is a little
tree of these strands.

A **bundle** is a finite set of strands (honest and penetrator) wired together
so that every receive is matched with exactly one send of the same message,
and the wiring has no cycles. A bundle is a possible execution. An attack is a
bundle in which some honest strand is complete and its claim is false.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="Lowe's attack drawn as a strand-space bundle: Alice's initiator strand with the intruder, Bob's responder strand believing it talks to Alice, and two penetrator strands that decrypt and re-encrypt" fill="currentColor" font-size="13">
<text x="110" y="22" text-anchor="middle" font-weight="bold">Alice, init, peer I</text>
<text x="320" y="22" text-anchor="middle" font-weight="bold">penetrator</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">Bob, resp, peer "A"</text>
<circle cx="110" cy="60" r="5"/>
<text x="100" y="64" text-anchor="end">+{Nₐ, A}pk(I)</text>
<circle cx="320" cy="90" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="78" text-anchor="middle">decrypt, re-encrypt</text>
<line x1="115" y1="62" x2="313" y2="88" stroke="currentColor" stroke-width="1.3"/>
<polygon points="315,89 304,83 303,92"/>
<circle cx="530" cy="120" r="5"/>
<text x="540" y="124" text-anchor="start">−{Nₐ, A}pk(B)</text>
<line x1="325" y1="92" x2="523" y2="118" stroke="currentColor" stroke-width="1.3"/>
<polygon points="525,119 514,113 513,122"/>
<circle cx="530" cy="170" r="5"/>
<text x="540" y="174" text-anchor="start">+{Nₐ, N_b}pk(A)</text>
<line x1="530" y1="125" x2="530" y2="163" stroke="currentColor" stroke-width="2.4"/>
<circle cx="110" cy="200" r="5"/>
<text x="100" y="204" text-anchor="end">−{Nₐ, N_b}pk(A)</text>
<line x1="110" y1="65" x2="110" y2="193" stroke="currentColor" stroke-width="2.4"/>
<line x1="525" y1="171" x2="117" y2="199" stroke="currentColor" stroke-width="1.3" stroke-dasharray="6 3"/>
<polygon points="115,199 126,194 126,203"/>
<text x="320" y="178" text-anchor="middle">passed on unread</text>
<circle cx="110" cy="250" r="5"/>
<text x="100" y="254" text-anchor="end">+{N_b}pk(I)</text>
<line x1="110" y1="205" x2="110" y2="243" stroke="currentColor" stroke-width="2.4"/>
<circle cx="320" cy="275" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="263" text-anchor="middle">decrypt, re-encrypt</text>
<line x1="115" y1="252" x2="313" y2="273" stroke="currentColor" stroke-width="1.3"/>
<polygon points="315,274 304,268 303,277"/>
<circle cx="530" cy="300" r="5"/>
<text x="540" y="304" text-anchor="start">−{N_b}pk(B)</text>
<line x1="530" y1="175" x2="530" y2="293" stroke="currentColor" stroke-width="2.4"/>
<line x1="325" y1="277" x2="523" y2="298" stroke="currentColor" stroke-width="1.3"/>
<polygon points="525,299 514,293 513,302"/>
<text x="530" y="338" text-anchor="middle" font-weight="bold">complete; claim "A ran with me" is false</text>
</svg>
<figcaption>Figure 19.4. Lowe's attack as a bundle. Thick vertical lines are the order of events within a strand; thin arrows match a send to a receive. The two penetrator steps each use the intruder's own private key. Bob's strand is complete, and no strand of Alice's has peer B.</figcaption>
</figure>

### Authentication tests

Guttman and Thayer then gave rules, called **authentication tests**, that do
most of the work of a proof. The **outgoing test** says: if a strand sends a
fresh value $N$ only inside an encryption $\{\dots N \dots\}_{K}$ whose
decryption key the penetrator does not have, and later receives $N$ back in a
different form, then some *honest* strand must have received the encryption and
transformed it, because the penetrator alone cannot open it. The test does not
tell you which honest strand, only that one exists; you then look at the roles
to see which strands *can* do that transformation.

Apply it to Bob in the original protocol. Bob sends $N_B$ only inside
$\{N_A, N_B\}_{pk_A}$ and receives it back as $\{N_B\}_{pk_B}$. Alice's private
key is safe (she is honest), so some honest strand opened the encryption and
re-emitted $N_B$. The only role that does this is an initiator, at its third
step, and the only initiator that can open a message for $pk_A$ is Alice. So
there is an initiator strand of Alice with *some* peer $X$ that received
$\{N_A, N_B\}_{pk_A}$ and sent $\{N_B\}_{pk_X}$. That is all the test yields.
Bob wants $X = B$. Nothing forces it, and choosing $X = I$ gives Lowe's attack,
found here as the gap in a failed proof.

In Needham-Schroeder-Lowe the same test yields an initiator strand of Alice that
received $\{N_A, N_B, B\}_{pk_A}$, and the initiator role checks that the name
in message 2 equals its peer. So $X = B$, and Bob's claim of agreement is
proved. Secrecy of $N_B$ follows from a similar argument: every honest
emission of $N_B$ is encrypted for $A$ or $B$, whose keys are safe.

This is the pattern of all good protocol analysis, by hand or by tool: try to
prove the claim, and where the proof needs a fact the protocol does not
provide, that is where the attack is. The tool Scyther, written by Cas
Cremers in 2006 to 2008, and later the Tamarin prover search over exactly
these partial bundles, working backwards from a claim.

### Message sequence charts

The diagrams in this chapter and in the Protocols book are **message sequence
charts**: one vertical line per participant, time going down, one arrow per
message. Telecom engineers standardized them (ITU-T Z.120, first issued in
1992) for describing telephone signaling, and security people adopted them
because an attack is easiest to read as a chart. They are good for showing a
trace and bad for proving there is none: a chart shows one interleaving, and
the attacker's power is in the ones you did not draw. Strands are the same
picture with the honest strands cut apart from the network, so that a proof
can quantify over every way of wiring them together.

## 19.6 Finding attacks by search

*Level: intermediate.*

Hand analysis needs the right question. A machine needs only patience. The
program below plays the role of Lowe's model checker on a small scale. It
models messages as terms: $\{x, y\}_{pk_B}$ is the tuple `("enc", "B", x, y)`.
The attacker's knowledge is a set of terms. He can open any encryption for
`"I"` (his own key), replay any ciphertext he has seen, and build any new
ciphertext for anyone out of atoms he knows. The honest sessions are a fixed
list: Alice starts one run with the intruder and one with Bob, and Bob answers
one run as responder. The search is breadth first over every order in which
the sessions can take steps and every message the attacker can supply at each
receive, and it checks after every step whether Bob has finished a run in which
his claim is false.

```python
# A tiny protocol model checker: breadth-first search over every interleaving
# of a few honest sessions, with an attacker who owns the network (Dolev-Yao).
from collections import deque
from itertools import product

LOWE_FIX = False          # set True to check Needham-Schroeder-Lowe instead

def enc(owner, *items):   # {items} under owner's public key: a plain tuple
    return ("enc", owner) + items

def show(t):
    if isinstance(t, tuple):
        return "{" + ", ".join(show(x) for x in t[2:]) + "}pk(" + t[1] + ")"
    return t

def analyze(known):       # add everything the attacker can open with I's key
    known = set(known)
    for t in list(known):
        if isinstance(t, tuple) and t[1] == "I":
            known.update(t[2:])
    return frozenset(known)

def offers(known, to, size):
    """Every ciphertext for `to` with `size` items the attacker can supply."""
    out = {t for t in known if isinstance(t, tuple) and t[1] == to and len(t) == size + 2}
    atoms = [t for t in known if not isinstance(t, tuple)]
    for items in product(atoms, repeat=size):
        out.add(enc(to, *items))
    return sorted(out, key=show)

# A session is (agent, role, peer, step, na, nb). The initiator knows its peer;
# the responder learns it from message 1.
START = (("A", "init", "I", 0, None, None),     # Alice talks to the attacker,
         ("A", "init", "B", 0, None, None),     # and, separately, to Bob;
         ("B", "resp", None, 0, None, None))    # Bob answers whoever asks.
KNOWN = frozenset({"A", "B", "I", "nI"})

def moves(sessions, known):
    for i, (me, role, peer, step, na, nb) in enumerate(sessions):
        def put(s):
            return sessions[:i] + (s,) + sessions[i + 1:]
        if role == "init" and step == 0:
            na = "n" + me + str(i)
            m = enc(peer, na, me)
            yield put((me, role, peer, 1, na, None)), analyze(known | {m}), me + " sends " + show(m)
        if role == "init" and step == 1:
            for m in offers(known, me, 3 if LOWE_FIX else 2):
                if m[2] != na or (LOWE_FIX and m[4] != peer):
                    continue
                reply = enc(peer, m[3])
                yield (put((me, role, peer, 2, na, m[3])), analyze(known | {reply}),
                       me + " gets " + show(m) + ", sends " + show(reply))
        if role == "resp" and step == 0:
            for m in offers(known, me, 2):
                if m[3] not in ("A", "B", "I") or m[3] == me:
                    continue
                nb = "n" + me + str(i)
                reply = enc(m[3], m[2], nb, me) if LOWE_FIX else enc(m[3], m[2], nb)
                yield (put((me, role, m[3], 1, m[2], nb)), analyze(known | {reply}),
                       me + " gets " + show(m) + ", sends " + show(reply))
        if role == "resp" and step == 1:
            for m in offers(known, me, 1):
                if m[2] == nb:
                    yield put((me, role, peer, 2, na, nb)), known, me + " gets " + show(m) + ", done"

def attack(sessions, known):
    for me, role, peer, step, na, nb in sessions:
        if role == "resp" and step == 2 and peer != "I":
            if nb in known:
                return me + " thinks only " + peer + " knows " + nb + ", but I knows it"
            if not any(s[:4] == (peer, "init", me, 2) and s[4:] == (na, nb) for s in sessions):
                return me + " finished with " + peer + ", who never ran this session with " + me

seen = {(START, KNOWN)}
queue = deque([(START, KNOWN, [])])
while queue:
    sessions, known, trace = queue.popleft()
    found = attack(sessions, known)
    if found:
        break
    for nxt in moves(sessions, known):
        if (nxt[0], nxt[1]) not in seen:
            seen.add((nxt[0], nxt[1]))
            queue.append((nxt[0], nxt[1], trace + [nxt[2]]))
print("states explored:", len(seen))
if found:
    for k, line in enumerate(trace, 1):
        print(k, line)
    print("ATTACK:", found)
else:
    print("no attack with these sessions")
```

```text
states explored: 258
1 A sends {nA0, A}pk(I)
2 B gets {nA0, A}pk(B), sends {nA0, nB2}pk(A)
3 A gets {nA0, nB2}pk(A), sends {nB2}pk(I)
4 B gets {nB2}pk(B), done
ATTACK: B thinks only A knows nB2, but I knows it
```

The program found Lowe's attack by itself, in four steps, after looking at 258
states. Its trace is exactly the one of §19.4: the attacker's moves are
implicit in the "gets" lines. In step 2, Bob gets $\{N_A, A\}_{pk_B}$, which no
honest party sent; the attacker built it from $N_A$, which he opened in step 1.
In step 3, Alice gets a message that Bob addressed to her, but in her session
with `I`. Because the search is breadth first, this is a shortest attack, and
the secrecy check fires as soon as Bob finishes. (The agreement check would
fire on the same state; the program reports the first failure it tests.)

Now set `LOWE_FIX = True`. Alice's message 2 must then carry three items, the
last equal to her peer, and Bob puts his name there.

```text
states explored: 259
no attack with these sessions
```

To make the check less narrow, add two more sessions to `START`, one where Bob
starts a run with Alice and one where Alice answers as responder:

```text
         ("B", "init", "A", 0, None, None),
         ("A", "resp", None, 0, None, None))
```

With the original protocol the search still stops at the same four-step attack
after 5,485 states; with Lowe's fix it explores all 11,623 reachable states in
about three seconds and finds nothing.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Bar chart of states explored by the search: 258 and 5,485 states to find the attack on Needham-Schroeder with three and five sessions; 259 and 11,623 states to exhaust Needham-Schroeder-Lowe with no attack" fill="currentColor" font-size="13">
<text x="200" y="40" text-anchor="end">NS, 3 sessions: attack</text>
<rect x="210" y="28" width="7.7" height="18" fill="currentColor"/>
<text x="225" y="42" text-anchor="start">258</text>
<text x="200" y="80" text-anchor="end">NSL, 3 sessions: none</text>
<rect x="210" y="68" width="7.8" height="18" fill="currentColor" opacity="0.5"/>
<text x="225" y="82" text-anchor="start">259</text>
<text x="200" y="120" text-anchor="end">NS, 5 sessions: attack</text>
<rect x="210" y="108" width="164.6" height="18" fill="currentColor"/>
<text x="382" y="122" text-anchor="start">5,485</text>
<text x="200" y="160" text-anchor="end">NSL, 5 sessions: none</text>
<rect x="210" y="148" width="348.7" height="18" fill="currentColor" opacity="0.5"/>
<text x="566" y="162" text-anchor="start">11,623</text>
<line x1="210" y1="20" x2="210" y2="180" stroke="currentColor"/>
<line x1="210" y1="180" x2="610" y2="180" stroke="currentColor"/>
<text x="210" y="200" text-anchor="middle">0</text>
<text x="360" y="200" text-anchor="middle">5,000</text>
<text x="510" y="200" text-anchor="middle">10,000</text>
<text x="410" y="222" text-anchor="middle">states explored by the search</text>
</svg>
<figcaption>Figure 19.5. What the search costs. Finding an attack stops early; proving that there is none, even for a fixed small set of sessions, means visiting every reachable state, and the count grows quickly with each session added.</figcaption>
</figure>

### What the toy does and does not show

The toy is honest about its limits, and they are the limits of every model
checker.

- **It is bounded.** "No attack with these sessions" says nothing about six
  sessions, or two Bobs, or a Bob who is talking to himself. For secrecy and
  authentication in general, the problem with unboundedly many sessions is
  undecidable (Nancy Durgin, Patrick Lincoln, John Mitchell and Andre Scedrov
  showed this in 1999); with a fixed number of sessions it is decidable and
  NP-complete (Michaël Rusinowitch and Mathieu Turuani, 2001). Lowe's 1996
  paper gave an argument specific to this protocol that small systems suffice,
  and later work found general conditions for such "small model" results. The
  modern tools escape the bound differently: ProVerif by over-approximating,
  Tamarin by induction and human help (§19.7).
- **Its attacker is limited by hand.** Here the attacker builds new
  ciphertexts only from atoms; he cannot nest ciphertexts or pair arbitrary
  terms. For this protocol that does not matter, but a general tool must reason
  about unbounded terms, which is why real tools use symbolic constraint
  solving rather than enumeration.
- **Its cryptography is perfect.** The attacker cannot open an encryption for
  Bob, cannot tell two ciphertexts apart, cannot malleate one. Every attack in
  later chapters that does those things (padding oracles, nonce reuse) is
  invisible here.

Still, the structure is the real one: states, the attacker's knowledge as a
set closed under what he can derive, honest roles as transitions, and claims as
predicates on states. Lowe's FDR models, the 2005 AVISPA tools and the bounded
mode of Scyther are this program made fast.

!!! note "Life story: the Dolev-Yao model"
    **Born:** 1981 as a conference paper, 1983 in *IEEE Transactions on
    Information Theory* ("On the security of public key protocols"), Danny
    Dolev and Andrew Yao · **Purpose:** to define an attacker who controls the
    network but cannot break the cryptography, so that protocols can be
    reasoned about as rewriting of terms · **Helped:** every symbolic tool
    since (FDR and Casper, the NRL Protocol Analyzer, ProVerif, Scyther,
    Tamarin, Maude-NPA); the standard "network attacker" of every protocol
    paper · **Status:** the default model; extended with equational theories
    (Diffie-Hellman, XOR, bilinear pairings) and with compromise of keys and
    session state

## 19.7 The attacker in a tool: ProVerif and Tamarin

*Level: expert.*

Treating formal verification as cryptanalysis is not a figure of speech. A
verification tool is an attack search engine with a precise threat model, and
when the search fails in the right way, the failure is a proof. Two tools carry
most of the published work today. Both use the Dolev-Yao attacker; both handle
an unbounded number of sessions and unbounded message terms; they differ in how
they escape the undecidability of §19.6.

### The symbolic model

In both tools a message is a **term** built from names (fresh values, written
with `new` or `~`), public constants and function symbols. Cryptography is a
set of **equations** or **rewrite rules** on terms. Asymmetric encryption is
two functions and one rule,

$$
\mathrm{adec}(\mathrm{aenc}(m, \mathrm{pk}(k)),\ k) = m,
$$

and nothing else: no rule lets anyone get $m$ from $\mathrm{aenc}(m, \mathrm{pk}(k))$
without $k$. Diffie-Hellman is an equational theory in which
$(g^a)^b = (g^b)^a$; XOR, bilinear pairings and signatures have theories too.
The attacker knows every public term, every term sent on the network, and
everything derivable from those with the function symbols and equations. A
**security property** is a statement about all traces: "the attacker never
derives $N_B$", or "whenever Bob commits to a run with Alice on data $d$, Alice
earlier started a run with Bob on $d$".

### ProVerif

ProVerif, written by Bruno Blanchet at INRIA and first described in 2001, takes
a protocol in a dialect of the applied pi calculus, a small concurrent
programming language with channels, and translates it into **Horn clauses**,
logical rules of the form "if the attacker knows these terms, he knows this
one". It then saturates the clauses, deriving what the attacker can learn,
with a resolution procedure. The translation **over-approximates**: it forgets
how many times things happen and in which order (a replicated process may run
any number of times; a fresh value is identified with the place that makes
it). That is why it handles unbounded sessions, and also why it can report an
attack that is not real, or fail to terminate. When ProVerif says a property
holds, it holds for all sessions; when it reports an attack, it tries to rebuild
a concrete trace, and usually succeeds.

A model of the original Needham-Schroeder protocol fits on one screen.

```text
(* Needham-Schroeder public key, without the key server *)
free c: channel.
type skey.  type pkey.
fun pk(skey): pkey.
fun aenc(bitstring, pkey): bitstring.
reduc forall m: bitstring, k: skey; adec(aenc(m, pk(k)), k) = m.

event beginA(pkey, pkey, bitstring, bitstring).
event endB(pkey, pkey, bitstring, bitstring).
query a: pkey, b: pkey, x: bitstring, y: bitstring;
  inj-event(endB(a, b, x, y)) ==> inj-event(beginA(a, b, x, y)).

let initiator(skA: skey, pkA: pkey) =
  in(c, pkX: pkey);                       (* the attacker chooses Alice's peer *)
  new na: bitstring;
  out(c, aenc((na, pkA), pkX));
  in(c, m: bitstring);
  let (=na, nb: bitstring) = adec(m, skA) in
  event beginA(pkA, pkX, na, nb);
  out(c, aenc(nb, pkX)).

let responder(skB: skey, pkB: pkey, pkA: pkey) =
  in(c, m: bitstring);
  let (na: bitstring, pkY: pkey) = adec(m, skB) in
  new nb: bitstring;
  out(c, aenc((na, nb), pkY));
  in(c, m3: bitstring);
  if adec(m3, skB) = nb then
  if pkY = pkA then event endB(pkA, pkB, na, nb).

process
  new skA: skey; new skB: skey;
  let pkA = pk(skA) in let pkB = pk(skB) in
  out(c, pkA); out(c, pkB);
  ( (!initiator(skA, pkA)) | (!responder(skB, pkB, pkA)) )
```

Three things in it carry the analysis. The `in(c, pkX: pkey)` lets the
attacker choose whom Alice talks to, including any key the attacker made
himself, so the dishonest insider is in the model without being named. The
`!` replicates each role, so there are unboundedly many sessions. And the query
is injective agreement: every `endB` (Bob finished, believing his peer was
Alice) must be matched by a distinct earlier `beginA` with the same keys and
nonces. On this model ProVerif reports that the query is false, in a line of
the form `RESULT inj-event(endB(...)) ==> inj-event(beginA(...)) is false`,
followed by an attack trace that, read carefully, is Lowe's: Alice's `beginA`
event happens with `pkX` set to the attacker's key, not `pkB`. Add the
responder's key to message 2 and the check on it in the initiator, and the
query is proved.

### Tamarin

Tamarin, by Simon Meier, Benedikt Schmidt, Cas Cremers and David Basin at ETH
Zurich (theory 2012, tool paper 2013), takes a different road. A protocol is a
set of **multiset rewriting rules**: each rule consumes some facts (a state, a
received message, a fresh value) and produces others (a new state, a sent
message), and can label the step with **action facts** that properties talk
about. Properties are **lemmas** in a first-order logic over traces with
timepoints. Tamarin proves a lemma by **backward search**: it assumes a trace
violating the lemma exists and works backwards from the violating action,
asking for every premise where it could have come from (exactly the "who could
have made this?" of §19.4, done by a machine). It either finds a complete
trace, which is an attack, or shows that every branch is contradictory, which
is a proof. The search may not terminate on its own; then a person guides it
interactively, or supplies helper lemmas proved by induction. That is the cost
of handling unbounded sessions precisely rather than by over-approximation.

The same protocol, in Tamarin's language:

```text
theory NSPK
begin
builtins: asymmetric-encryption

rule Register_pk:
  [ Fr(~ltk) ] --> [ !Ltk($X, ~ltk), !Pk($X, pk(~ltk)), Out(pk(~ltk)) ]

rule Reveal_ltk:
  [ !Ltk(X, ltk) ] --[ Reveal(X) ]-> [ Out(ltk) ]

rule I_1:
  [ Fr(~ni), !Pk($R, pkR) ]
  --> [ Out(aenc(<~ni, $I>, pkR)), St_I($I, $R, ~ni) ]

rule I_2:
  [ St_I(I, R, ni), !Ltk(I, ltkI), !Pk(R, pkR),
    In(aenc(<ni, nr>, pk(ltkI))) ]
  --[ Running(I, R, <ni, nr>) ]-> [ Out(aenc(nr, pkR)) ]

rule R_1:
  [ Fr(~nr), !Ltk($R, ltkR), !Pk(I, pkI), In(aenc(<ni, I>, pk(ltkR))) ]
  --> [ Out(aenc(<ni, ~nr>, pkI)), St_R($R, I, ni, ~nr) ]

rule R_2:
  [ St_R(R, I, ni, nr), !Ltk(R, ltkR), In(aenc(nr, pk(ltkR))) ]
  --[ Commit(R, I, <ni, nr>), Secret(R, I, nr) ]-> [ ]

lemma nr_secret:
  "All R I nr #i. Secret(R, I, nr) @ i ==>
     not (Ex #j. K(nr) @ j) | (Ex #r. Reveal(I) @ r) | (Ex #r. Reveal(R) @ r)"

lemma agreement:
  "All R I t #i. Commit(R, I, t) @ i ==>
     (Ex #j. Running(I, R, t) @ j) | (Ex #r. Reveal(I) @ r) | (Ex #r. Reveal(R) @ r)"
end
```

The `Reveal_ltk` rule is how the dishonest insider enters: any agent's key may
be given to the attacker, and the lemmas only promise something for runs whose
two named parties were never revealed. In Lowe's attack the revealed agent is
the intruder himself, whom Alice chose to talk to; Bob and Alice are never
revealed, so the lemmas apply and fail. Tamarin reports each lemma as
`falsified - found trace`, and its graphical interface draws the trace as a
graph of rule instances, which looks much like Figure 19.4. With Lowe's fix
(`<ni, nr, $R>` in message 2 and a matching pattern in `I_2`), both lemmas are
`verified`.

### What the tools add to hand analysis

The tools do not think of attacks a person could not; Lowe's attack is short.
They add three things. They do not get tired: a protocol like TLS 1.3 has
dozens of modes and options (full handshake, resumption, 0-RTT, client
authentication during or after the handshake, HelloRetryRequest), and the
dangerous interleavings mix several. They do not forget a case: the attacker
is complete for the model. And when they succeed, they produce a proof that is
checkable and rerunnable, which matters when the specification changes every
month.

They also share a weakness with hand analysis: the answer is only as good as
the model. Every model in this section left something out (the key server,
the encoding of tuples into bytes, timing, the lengths of nonces). The next
section shows what that costs.

!!! note "Life story: ProVerif"
    **Born:** 2001, Bruno Blanchet (then at INRIA and École Normale
    Supérieure), "An efficient cryptographic protocol verifier based on Prolog
    rules", CSFW 2001 · **Purpose:** automatic proofs of secrecy and
    authentication for unbounded sessions, by translating protocols to Horn
    clauses · **Helped:** verified models of TLS 1.3, Signal, Noise and
    WireGuard handshakes, e-voting and many academic protocols; its sibling
    CryptoVerif (2006) gives computational proofs · **Status:** maintained and
    widely used; the first tool most protocol designers try

!!! note "Life story: Tamarin"
    **Born:** 2012 to 2013, Simon Meier, Benedikt Schmidt, Cas Cremers and
    David Basin at ETH Zurich (CSF 2012 for the Diffie-Hellman theory, CAV
    2013 for the tool) · **Purpose:** precise symbolic analysis of protocols
    with Diffie-Hellman, unbounded sessions, mutable state and compromise, by
    backward search with optional human guidance · **Helped:** the TLS 1.3
    analyses of 2016 and 2017, 5G AKA (2018), EMV payment cards, WPA2 after
    KRACK, Noise, MLS drafts · **Status:** maintained as open source; the main
    tool where protocols have state and long-lived keys

## 19.8 Verification at scale: TLS 1.3 and 5G, and the limits

*Level: expert.*

### TLS 1.3

TLS 1.3 is the first major Internet protocol designed with formal analysis in
the loop. The IETF working group began it in 2014, after the run of attacks of
§19.9 and §19.10, and from early on invited academic analysis of drafts before
anything was fixed. A workshop at NDSS 2016, "TLS 1.3 Ready Or Not" (TRON),
brought the analysts and the editors together. Three kinds of work fed in.

**Computational proofs.** Benjamin Dowling, Marc Fischlin, Felix Günther and
Douglas Stebila proved the handshake of early drafts secure as a key exchange
in a Bellare-Rogaway style model (CCS 2015), and revised the proof as the
drafts changed. Hugo Krawczyk and Hoeteck Wee's OPTLS (2016) supplied the
design logic of the semi-static modes that the drafts considered for a time.

**Tamarin.** Cas Cremers, Marko Horvat, Sam Scott and Thyla van der Merwe built
a Tamarin model of draft 10 and its proposed extensions (IEEE S&P 2016). It
covered the full handshake, resumption with pre-shared keys, 0-RTT and a
proposed form of client authentication after the handshake. The tool found an
attack on the combination: a client resuming a session with a malicious server
could be made to sign, during post-handshake authentication, something the
attacker could present to an honest server as the client's authentication
there, because the signed transcript of a resumed session did not bind the
server's certificate. The fix, binding the signature to the original
handshake's transcript, went into the following drafts. In 2017 Cremers, Horvat,
Jonathan Hoyland, Scott and van der Merwe published a much larger model of a
near-final draft (21) covering every handshake mode and their interaction (CCS
2017). It verified the main secrecy and authentication properties and pointed
out a subtle gap in what a client can conclude about its own authentication
after post-handshake authentication, which the authors raised with the working
group as a matter for applications.

**ProVerif, CryptoVerif and miTLS.** Karthikeyan Bhargavan, Bruno Blanchet and
Nadim Kobeissi modeled draft 18 together with TLS 1.2, to catch attacks that
cross versions, in ProVerif, and proved the core handshake computationally in
CryptoVerif (IEEE S&P 2017). Their models also covered older drafts and found
weaknesses in features that were then changed or removed, such as client
authentication with 0-RTT data. The same group's **miTLS** project, a TLS
implementation written to be verified (first in F7, later in F\*), is where the
triple handshake was found in 2014 (§19.9); its successor, Project Everest,
produced verified code for the TLS 1.3 record layer and for cryptographic
primitives now shipped in browsers.

RFC 8446 was published in August 2018. No attack on its core handshake has
been found since. The attacks that did touch TLS 1.3 deployments, such as
Selfie (§19.2) and implementation bugs in state handling, sat outside what the
models assumed: groups sharing one PSK, or code that did not match the
specification.

### 5G authentication

The 5G standard of 2018 (3GPP TS 33.501) specified a new version of the
authentication and key agreement protocol between a phone, the network it
roams on (the serving network) and its home operator: **5G AKA**. David Basin,
Jannik Dreier, Lucca Hirschi, Saša Radomirović, Ralf Sasse and Vincent Stettler
modeled it in Tamarin (CCS 2018). The specification stated its goals loosely,
so the first job was to write them down as lemmas, and several turned out not
to hold. As the authors reported, the phone and the serving network did not
get an explicit guarantee about each other's view of the session from the
protocol alone, and under some assumptions a dishonest serving network could
cause one subscriber's session to be attributed, and billed, to another. A
known privacy weakness from earlier generations, in which a fake base station
uses distinguishable failure messages to tell whether a particular phone is
present, was also still there. Cas Cremers and Martin Dehnel-Wild (NDSS 2019)
then showed that 5G AKA's guarantees depend on assumptions about the channel
between the serving network and the home network that the standard did not
state, and found session confusion when those channels are weaker. Both groups
proposed small fixes, mostly binding identities into the confirmations, and
reported them to 3GPP.

The lesson is the same as for TLS: much of the value of a formal model is
forcing the claims to be written down, after which the gaps are often visible
by hand.

### The limits of symbolic models

Every famous protocol attack after 2005 escaped some model. It is worth listing
how, because each is a place to look.

**The cryptography is too perfect.** A symbolic encryption has no length, no
padding, no malleability and no key-dependent behavior. Padding oracles
(Chapter 10), Bleichenbacher's attack (Chapter 13) and transcript collisions in
MD5 (SLOTH, 2016) are invisible to it. **Computational soundness** results,
starting with Martín Abadi and Phillip Rogaway's "Reconciling two views of
cryptography" (2000), show that symbolic proofs imply computational security
when the primitives meet strong definitions (IND-CCA encryption, no key
cycles, unambiguous parsing), but those conditions are often false of deployed
schemes. Tools that work in the computational model directly (CryptoVerif,
EasyCrypt) close part of the gap at a much higher cost in human effort.

**The model leaves out a feature.** The 4-way handshake of WPA2 was proved
secure in 2005; KRACK attacked when the key is *installed*, which the proof did
not model. Renegotiation was outside early TLS models; the triple handshake
came from putting it back in.

**The model assumes something the world does not.** That every party's key was
registered by its owner (unknown key share), that pre-shared keys belong to two
parties (Selfie), that the server is honest about group membership (Matrix,
§19.11), that the encoding is unambiguous (type confusion).

**The code is not the specification.** A verified protocol says nothing about a
library that accepts messages out of order (FREAK, CCS injection), reads past
a buffer (Heartbleed, 2014) or leaks timing. Verified implementations (miTLS,
HACL\*, the Rust and F\* code of Project Everest) and protocol state fuzzing
attack this gap from opposite sides.

**The claims were never written.** In 5G, and in Matrix, the analysts first had
to decide what the protocol was supposed to guarantee. A protocol whose goals
are vague cannot be proved, and in practice its users will assume more than it
delivers.

## 19.9 The famous cases: binding failures in TLS

*Level: intermediate.*

The next three sections go through the famous breaks quickly, each framed by
the three questions this chapter is about: which class of attack, how it was
found, what fixed it. The full stories, with the protocol details, are in the
Protocols book, [Chapter 4](../protocols/04-Thirty-Years-of-TLS-Attacks.md)
for TLS and [Chapter 9](../protocols/09-Wi-Fi-Security.md) for Wi-Fi.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Table of nine famous protocol breaks from 2009 to 2022 with the attack class and how each was found" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">Year, case</text>
<text x="230" y="22" font-weight="bold">Class</text>
<text x="440" y="22" font-weight="bold">How it was found</text>
<line x1="20" y1="32" x2="620" y2="32" stroke="currentColor"/>
<text x="20" y="58">2009 Renegotiation</text>
<text x="230" y="58">interleaving</text>
<text x="440" y="58">by hand, building a product</text>
<text x="20" y="90">2014 Triple handshake</text>
<text x="230" y="90">unknown key share</text>
<text x="440" y="90">while verifying TLS</text>
<text x="20" y="122">2015 FREAK</text>
<text x="230" y="122">state machine, downgrade</text>
<text x="440" y="122">state-machine testing</text>
<text x="20" y="154">2015 Logjam</text>
<text x="230" y="154">downgrade</text>
<text x="440" y="154">reading the spec, scanning</text>
<text x="20" y="186">2016 DROWN</text>
<text x="230" y="186">cross-protocol</text>
<text x="440" y="186">cryptanalysis by hand</text>
<text x="20" y="218">2017 KRACK</text>
<text x="230" y="218">state machine, replay</text>
<text x="440" y="218">reading code, then standard</text>
<text x="20" y="250">2020 Zoom</text>
<text x="230" y="250">key held by the server</text>
<text x="440" y="250">watching the traffic</text>
<text x="20" y="282">2021 MTProto</text>
<text x="230" y="282">ordering, side channel</text>
<text x="440" y="282">reading clients for a proof</text>
<text x="20" y="314">2022 Matrix</text>
<text x="230" y="314">trusted server, confusion</text>
<text x="440" y="314">reading the client code</text>
<line x1="20" y1="326" x2="620" y2="326" stroke="currentColor" opacity="0.4"/>
</svg>
<figcaption>Figure 19.6. The cases of §19.9 to §19.11. Only one came from a symbolic tool directly; several came from people trying to build or prove something, who were forced to read the specification more carefully than anyone before them.</figcaption>
</figure>

### Renegotiation, 2009

**Class:** interleaving (a prefix injection across two handshakes).
**Found:** by hand. In August 2009 Marsh Ray of PhoneFactor, a company making
two-factor authentication products, was studying how TLS servers ask for client
certificates partway through a connection, which they do by starting a second
handshake, a **renegotiation**, inside the first. Steve Dispensa joined the
work, and Martin Rex found the same problem independently. It became public in
November 2009, earlier than planned, after details leaked.

The flaw: a renegotiated handshake was encrypted under the old session's keys
but not *bound* to the old session. Nothing told the server that the client in
the new handshake was the same as in the old one. So an attacker opens his own
TLS connection to a server, sends the start of an HTTP request, and then splices
the victim's whole handshake into his connection, where the server takes it as
a renegotiation. The victim's later request is appended to the attacker's
prefix, and runs with the victim's cookie or client certificate. Within days,
Anil Kurmus showed it against Twitter, making the site post a victim's request
(credentials included) as a status update.

In this chapter's vocabulary, the attacker interleaved two sessions (his and
the victim's) whose authentication did not cover the boundary between them.
**Fixed** by RFC 5746 (February 2010): each renegotiation carries the Finished
values of the previous handshake on the same connection, so a client that never
had a previous handshake says so, and the server sees the mismatch. Servers
that could not upgrade turned renegotiation off.

!!! note "Life story: the renegotiation attack"
    **Born:** August 2009, Marsh Ray and Steve Dispensa (PhoneFactor), Martin
    Rex independently; public November 2009 · **Purpose:** inject attacker
    chosen data at the start of a victim's TLS session by splicing it into a
    renegotiation · **Helped:** RFC 5746's renegotiation indication extension;
    the habit of binding every handshake to what came before it on a connection
    · **Status:** fixed everywhere maintained; TLS 1.3 has no renegotiation at
    all

### The triple handshake, 2014

**Class:** unknown key share, composed into an impersonation.
**Found:** while formally verifying TLS. Karthikeyan Bhargavan, Antoine
Delignat-Lavaud, Cédric Fournet, Alfredo Pironti and Pierre-Yves Strub, of
INRIA and Microsoft Research, were building miTLS, an implementation whose
security was to be proved, and to state the theorem they had to say exactly
which session properties TLS 1.2 guarantees. The properties people assumed
turned out to be false (IEEE S&P 2014, "Triple Handshakes and Cookie
Cutters").

The attack takes three handshakes, hence the name. In the first, a client
connects to a malicious server, which connects to an honest server and, using
RSA key exchange, passes the client's encrypted secret along, choosing the same
random values on both sides. Both connections now have the **same master
secret**, with different peers: an unknown key share. In the second, both
connections resume the session with an abbreviated handshake, which has no
certificates; now even the Finished values on the two connections are the
same. RFC 5746 binds renegotiation to exactly those Finished values, so in the
third handshake, a renegotiation, the attacker forwards the client's
handshake to the honest server, the binding check passes, and the client
authenticates to the honest server with its certificate, on a connection whose
first part the attacker controls. The renegotiation fix was itself defeated,
because the values it bound to were not unique to one connection. The same
synchronized values also broke "channel bindings" that other protocols used to
tie their authentication to a TLS connection.

**Fixed** by RFC 7627 (September 2015), the *extended master secret*: the
master secret is derived from a hash of the whole handshake transcript,
including the certificates, so two connections with different peers cannot have
the same master secret. Browsers also stopped allowing the server's certificate
to change on renegotiation. TLS 1.3 builds the transcript into every key from
the start.

!!! note "Life story: the triple handshake"
    **Born:** March 2014, Bhargavan, Delignat-Lavaud, Fournet, Pironti and
    Strub (miTLS, INRIA and Microsoft Research), IEEE S&P 2014 ·
    **Purpose:** show that TLS 1.2 sessions with different peers could share
    keys and Finished values, defeating renegotiation binding and channel
    bindings · **Helped:** RFC 7627 (extended master secret); the transcript
    hashing that runs through TLS 1.3's key schedule · **Status:** fixed;
    the textbook case of a fix (RFC 5746) whose assumption a later attack
    broke

## 19.10 The famous cases: downgrades and shared keys

*Level: intermediate.*

### FREAK, 2015

**Class:** state-machine confusion, used for a downgrade.
**Found:** by systematic state-machine testing. The miTLS team, now with
Benjamin Beurdouche and others, wrote FlexTLS, a tool for sending TLS messages
in any order and combination, and ran deviant handshakes against the main
libraries ("A Messy State of the Union", IEEE S&P 2015). Among many findings,
they saw that OpenSSL, Apple's SecureTransport and Microsoft's SChannel clients
would accept a server's temporary 512-bit "export" RSA key in a normal RSA
handshake, though the client had never offered an export cipher suite. The
message belonged to a different path through the state machine, and the code
accepted it anyway.

A man in the middle changes the client's offer to export RSA, receives the
server's 512-bit key (servers that still supported export suites made one key
and reused it for hours or days), factors it, and completes both handshakes
with forged Finished messages. Factoring a 512-bit modulus took about seven
hours on rented cloud machines for around a hundred dollars, the factoring of
[Chapter 11](11-Factoring.md). It was disclosed in March 2015. **Fixed** in the
client libraries by refusing the unexpected message, and by removing export
suites from servers.

!!! note "Life story: FREAK"
    **Born:** March 2015, Benjamin Beurdouche, Karthikeyan Bhargavan and
    colleagues (INRIA, Microsoft Research, IMDEA), found with FlexTLS ·
    **Purpose:** downgrade clients to 512-bit export RSA through a state
    machine bug, then factor the key · **Helped:** the removal of export
    suites; state-machine testing of TLS libraries as a routine practice ·
    **Status:** fixed in maintained clients

### Logjam, 2015

**Class:** downgrade, this time in the protocol itself.
**Found:** by reading the specification and measuring the Internet. David
Adrian and thirteen co-authors (CCS 2015, "Imperfect Forward Secrecy")
noticed that in TLS 1.2 a server's signature over its Diffie-Hellman
parameters does not say which cipher suite they were for. A man in the middle
changes the client's offer to export Diffie-Hellman; the server answers with
512-bit parameters and a valid signature; the client, which never asked for
export, sees ordinary signed parameters, a little small, and accepts. It is a
type confusion inside a downgrade: "parameters for export" and "parameters for
normal use" had the same signed form.

The attacker must then compute a 512-bit discrete logarithm before the
handshake times out. Most servers used one of a few standard primes, and the
number field sieve's expensive stages depend only on the prime (Chapter 12).
After a week of precomputation per prime, each connection's logarithm took
about a minute. The paper also estimated that the same precomputation for a
widely shared 1024-bit prime was within a national agency's budget and argued
it could explain capabilities described in leaked documents; that part is an
inference, not a demonstration, and is still debated. **Fixed** by browsers
rejecting small groups, by named groups for finite-field Diffie-Hellman, and
in TLS 1.3 by signing the whole transcript (RFC 8446), which covers the
negotiation.

!!! note "Life story: Logjam"
    **Born:** May 2015, David Adrian, Karthikeyan Bhargavan, Zakir Durumeric,
    Pierrick Gaudry, Matthew Green, J. Alex Halderman, Nadia Heninger and
    others (CCS 2015) · **Purpose:** downgrade TLS to 512-bit export
    Diffie-Hellman, which signatures did not distinguish, and break it with
    number field sieve precomputation · **Helped:** minimum group sizes in
    browsers; transcript signatures in TLS 1.3 · **Status:** historic for
    export groups; the warning about shared 1024-bit primes stands

### DROWN, 2016

**Class:** cross-protocol.
**Found:** by cryptanalysis by hand. Nimrod Aviram, Sebastian Schinzel, Juraj
Somorovsky, Nadia Heninger and colleagues (USENIX Security 2016) asked what an
attacker could do with SSL 2, which no browser spoke any more but many servers
still accepted, often with the *same RSA key and certificate* as their modern
TLS service.

SSL 2's export cipher suites gave a Bleichenbacher-style padding oracle
(Chapter 13) that was unusually cheap to use. The attacker records about a
thousand modern TLS handshakes that used RSA key exchange, then sends tens of
thousands of crafted SSL 2 connections to any server sharing the key, and uses
the answers to decrypt one of the recorded TLS sessions. The general attack
cost about $2^{50}$ work, around eight hours on rented machines for a few
hundred dollars; with an additional OpenSSL bug it took under a minute on one
computer. At disclosure in March 2016 about a third of HTTPS servers were
vulnerable, many of them only because they shared a key with an SSL 2
service somewhere else, such as a mail server.

The TLS protocol was not at fault, and could not have been fixed from inside:
the oracle was in a different protocol. **Fixed** by turning SSL 2 off
everywhere, which RFC 6176 had required since 2011, and by the rule DROWN made
famous: one key, one protocol. TLS 1.3 removed RSA key transport entirely.

!!! note "Life story: DROWN"
    **Born:** March 2016, Nimrod Aviram, Sebastian Schinzel, Juraj Somorovsky,
    Nadia Heninger and others (USENIX Security 2016) · **Purpose:** decrypt
    modern TLS with an SSL 2 padding oracle on any server sharing the RSA key
    · **Helped:** the end of SSL 2 on the Internet; key separation between
    protocols · **Status:** historic; a standard example of cross-protocol
    attack

### SSL 2 and the general downgrade lesson

FREAK, Logjam, DROWN and POODLE share one root: **old modes left enabled**.
Each attack reached back to something everyone agreed was obsolete (SSL 2,
SSL 3, export suites from the 1990s), still present because removing it might
break a customer. The obsolete mode was weak by design; the protocol's
negotiation, or a shared key, let the attacker reach it.

The lesson has four parts, and TLS 1.3 follows all four. Authenticate the
entire negotiation with a long-term key (a signature over the transcript), not
only with the session key that a weak option could expose. Make the version
negotiation itself resistant to a forced fallback (the downgrade sentinel in
the server random). Remove weak options from the code, not only from the
default configuration. And never share a key between a strong protocol and a
weak one. RFC 6176's flat prohibition of SSL 2 in 2011 was the right shape of
rule; DROWN showed what it cost to apply it slowly.

## 19.11 The famous cases beyond TLS

*Level: intermediate.*

### KRACK, 2017

**Class:** state-machine confusion, triggered by a replay.
**Found:** by reading code, then the standard. Mathy Vanhoef and Frank Piessens
of KU Leuven published the key reinstallation attacks in October 2017 (CCS
2017). As Vanhoef later told it, he was checking OpenBSD's handling of the WPA2
4-way handshake for the final version of another paper when he wondered what
happened if the function that installs the session key were called twice. The
answer was in the IEEE 802.11 standard itself.

In the 4-way handshake the device installs the new key when it receives
message 3, and answers with message 4. If message 4 is lost, the access point
resends message 3, and the standard said the device must accept it and install
the key again. Installing a key resets its packet counter, and the counter is
the nonce of the encryption (CCMP or GCMP). An attacker who holds back message 4
and replays message 3 makes the device reuse nonces under the same key, which
for these modes means keystream reuse and, for GCMP, forgery (the nonce reuse
of [Chapter 10](10-Attacks-on-Modes-and-MACs.md)). On Android 6.0 and Linux's
wpa_supplicant 2.4 and later, a reinstall installed an all-zero key, which was
worse.

The handshake had a security proof (Changhua He, Mukund Sundararajan, Anupam
Datta, Ante Derek and John Mitchell, CCS 2005). The proof was correct and
irrelevant: it modeled the handshake's messages, not the moment a key is handed
to the encryption layer, and the attack lived in that moment. **Fixed** by
patches that refuse to reinstall a key already in use, and by a clarified
standard; in 2018 the same authors found variants that bypassed some patches,
and in 2020 Cremers, Benjamin Kiesl and Niklas Medinger built a Tamarin model of
WPA2 that includes key installation and nonces and proved the patched
handshake. The full story is in the Protocols book,
[Chapter 9](../protocols/09-Wi-Fi-Security.md).

!!! note "Life story: KRACK"
    **Born:** October 2017, Mathy Vanhoef and Frank Piessens (KU Leuven), CCS
    2017 · **Purpose:** force nonce reuse in WPA2 by replaying handshake
    messages so that a key is installed twice · **Helped:** patches in every
    Wi-Fi stack; models that include when keys are installed, not only how
    they are agreed · **Status:** fixed in maintained devices; the standard
    example of a proven protocol attacked through what the proof left out

### Telegram's MTProto, 2021

**Class:** channel-level confusions: message ordering, and a timing side
channel in the clients.
**Found:** by reading the clients' code while trying to prove the protocol
secure. Telegram uses its own protocol, MTProto, for the encrypted channel
between apps and its servers (and, in "secret chats", between users). Earlier
work had shown that version 1.0 did not meet standard definitions of
authenticated encryption (Jakob Jakobsen and Claudio Orlandi, 2016). In 2021
Martin Albrecht, Lenka Mareková, Kenneth Paterson and Igors Stepanovs set out to
model MTProto 2.0 as actually implemented in the official clients and prove
what it achieves ("Four Attacks and a Proof for Telegram", IEEE S&P 2022).

To write the model they had to read the code, and the code had problems. An
attacker on the network could **reorder** messages from client to server,
because the server did not enforce the order the sequence numbers implied, so
a run of short messages could be delivered in an order that changed their
meaning. The clients'
handling of decryption had a **timing side channel** that could leak some
plaintext bits, though only under demanding conditions. The authors also
described an attacker-in-the-middle attack on the initial key exchange that
combined these weaknesses but needed an impractical number of attempts. The
authors and Telegram described all of them as more theoretical than practical
for ordinary users; Telegram changed its clients and servers. After the
changes, the authors proved that MTProto 2.0 gives a secure channel, under
assumptions about its building blocks that are unusual and not well studied.
Telegram's group chats, and its one-to-one chats by default, are encrypted
only between the user and Telegram's servers, which this work did not change.

!!! note "Life story: the MTProto 2.0 analysis"
    **Born:** 2021, Martin Albrecht, Lenka Mareková, Kenneth Paterson and Igors
    Stepanovs (Royal Holloway and ETH Zurich), published at IEEE S&P 2022 ·
    **Purpose:** prove what Telegram's channel achieves, which first required
    finding and fixing four attacks · **Helped:** Telegram's fixes to message
    ordering and client timing; a model of MTProto 2.0 with a proof ·
    **Status:** fixed; the proof rests on non-standard assumptions

### Zoom, 2020

**Class:** not a clever interleaving at all. The key was held, and handed out,
by the server, under a weak mode.
**Found:** by watching the traffic. In March 2020, with the world moving its
meetings online, Zoom's site said meetings were "end-to-end encrypted". On 3
April 2020 Bill Marczak and John Scott-Railton of the Citizen Lab at the
University of Toronto reported what the client actually did: each meeting used
one AES-128 key, generated by Zoom's servers and sent to the participants, and
encrypted audio and video in **ECB mode**, which encrypts equal blocks to equal
ciphertexts and preserves patterns (book 1
[Chapter 8](../../book/08-Modes-of-Operation.md)). They also observed meeting
keys being sent from servers in Beijing for meetings whose participants were
all in North America. Zoom said the routing was a mistake made while adding
capacity.

The lesson for this chapter is about claims. A protocol where the server
generates the key is not end-to-end encrypted, whatever the cipher, because the
server is a party to every session. No analysis of message interleavings was
needed; reading the claim next to the key flow was enough. **Fixed** in stages:
AES-256-GCM in Zoom 5.0 (April 2020); after buying Keybase in May 2020, a
published end-to-end design, with keys generated by the participants, made
available from October 2020. In November 2020 the US Federal Trade Commission
settled with Zoom over its earlier security claims.

!!! note "Life story: Zoom's 2020 encryption"
    **Born:** reported 3 April 2020, Bill Marczak and John Scott-Railton
    (Citizen Lab) · **Purpose:** to show that Zoom's "end-to-end" meetings used
    server-generated AES-128 keys in ECB mode, some distributed through servers
    in China · **Helped:** AES-256-GCM, a public end-to-end design and its
    release in late 2020; a regulator's attention to encryption claims ·
    **Status:** fixed; end-to-end encryption is an option, not the default

### Matrix, 2022

Matrix is an open, federated messaging standard, best known through the
Element client. In September 2022 Martin Albrecht, Sofía Celi, Benjamin Dowling
and Daniel Jones disclosed attacks on Element's and the reference software
development kit's end-to-end encryption (IEEE S&P 2023, "Practically-exploitable
Cryptographic Vulnerabilities in Matrix"). **Class:** mostly trust and
confusion. The homeserver, which the design did not mean to trust, controlled
which devices and members were in a room, and nothing cryptographic bound that
list, so a malicious server could add an eavesdropping device; and several
attacks confused one kind of message or identifier with another, so that keys
forwarded by an unverified device were accepted, or a device could pass
verification in place of a user's cross-signing key. **Found** by reading the
client code against the specification, which was not written as a set of
claims. **Fixed** in the clients after disclosure, with the group-membership
issue requiring longer-term protocol changes. In the vocabulary of §19.3, the
server was given the power to choose who is in a session (an unknown key share
at group scale), and messages were not tagged with their role.

!!! note "Life story: the Matrix attacks"
    **Born:** disclosed September 2022, Martin Albrecht, Sofía Celi, Benjamin
    Dowling and Daniel Jones, IEEE S&P 2023
    · **Purpose:** show that a malicious homeserver could break the
    confidentiality and authentication of Matrix's end-to-end encryption in
    the main clients · **Helped:** client fixes; work on cryptographically
    bound group membership in Matrix · **Status:** the fixable bugs fixed;
    server-controlled membership a longer project

## 19.12 What a good protocol does

*Level: beginner.*

Every class in §19.2 and §19.3 has a design rule that removes it, and the
cases of §19.9 to §19.11 are what happened when one was missing. Five rules
cover nearly all of it.

**1. Explicit identities.** Every message that authenticates something names
who made it and for whom, and in which role. This removes reflection (the role
label), Lowe's attack (the name in message 2), most unknown key shares (both
identities in the key or the signed transcript) and Matrix's confusion of one
identifier for another. Abadi and Needham put it first among their 1994
"prudent engineering practices": if the identity of a principal is essential
to the meaning of a message, name it in the message.

**2. Key confirmation.** At the end of the handshake each side proves it holds
the same key, by a MAC with a key derived from the session key over something
the other side can check. Without it, one side may finish while the other is
in a different session (5G's gaps were of this kind), and a key-exchange flaw
can go unnoticed until data is lost.

**3. Transcript binding.** Keys and final authentication depend on a hash of
*everything* that was sent and received: versions, offers, choices, nonces,
certificates, key shares. This one rule removes downgrades by message editing,
renegotiation and triple-handshake splicing (the transcript is different on
each connection), Logjam's type confusion (the cipher suite is in the signed
transcript) and many type flaws. TLS 1.3, Noise and Signal's X3DH all derive
keys from a running transcript hash. Where the transcript must be compressed,
the hash must be collision resistant (SLOTH broke transcript binding with MD5).

**4. No downgrade.** Remove weak options rather than negotiate around them;
authenticate the negotiation with a long-term key; resist fallback outside the
protocol; and never share a key across protocols or versions, so that a weak
one cannot be used as an oracle against a strong one. DROWN, FREAK, Logjam and
POODLE are what this rule prevents.

**5. One state machine.** Specify the protocol as an explicit state machine,
with every message type tagged and every unexpected message causing an abort,
and implement it as one. Avoid optional messages, retransmission logic that
reinstalls state, and features that reach back into finished sessions
(renegotiation). Make keys and counters move only forward. This is what CCS
injection, FREAK's state bug, Terrapin and KRACK lacked.

Two more habits do not fit in a rule but matter as much. **Write down the
claims**, as lemmas if possible, before the protocol ships; 5G and Matrix were
analyzed only after deployment, and the first step each time was guessing what
was promised. And **analyze the protocol and test the code**: a Tamarin or
ProVerif model of the design, plus state-machine testing of the implementation,
catches both halves of the record above.

## 19.13 Going deeper

*Level: expert.*

**Computational models of key exchange.** The symbolic tools prove properties
in the Dolev-Yao model; computational proofs reduce a protocol's security to
that of its primitives with explicit probability bounds. Mihir Bellare and
Phillip Rogaway's 1993 model for key exchange, Ran Canetti and Hugo Krawczyk's
CK model (2001) with session-state reveal, and the eCK model (LaMacchia, Lauter
and Mityagin, 2007) define what "secure key exchange" means; KCI resistance and
forward secrecy appear as which secrets the attacker may reveal while the
target session must stay secure. Proofs of TLS 1.2 needed a new notion
(authenticated and confidential channel establishment, Jager, Kohlar, Schäge
and Schwenk, 2012), because TLS uses the session key inside the handshake.

**Composition.** A protocol proved secure alone may fail next to another that
shares keys: DROWN and ALPACA are the practical cases. Canetti's universal
composability (2001) asks for security in any context and is strong enough to
rule this out, but few deployed protocols meet it. Joint-state composition
theorems, and in the symbolic world the "disjoint encryption" results of
Guttman and Thayer, give conditions (essentially: tagging, so that messages of
one protocol cannot be valid in the other) under which two protocols can share
a key safely.

**Equational theories and their limits.** Tamarin handles Diffie-Hellman
exponentiation, bilinear pairings and XOR; ProVerif handles many equational
theories but over-approximates. Neither handles full abelian group arithmetic
or the algebra of real signature schemes; Cas Cremers, Dennis Jackson and
colleagues showed in 2019 to 2021 that modeling weaker, more realistic
signature and Diffie-Hellman properties (for example, a signature that verifies
under two keys, or a small-subgroup element that gives a predictable shared
secret) finds attacks on protocols proved secure with perfect primitives.

**Verified implementations.** The gap between model and code is closed from
the code side by languages that produce executable code from verified models:
F\* in Project Everest (miTLS, HACL\*, EverCrypt), hax and libcrux for Rust,
and Coq-based work on verified parsers. A different route extracts a model from
code (the ProVerif models generated from a JavaScript Signal implementation by
Kobeissi, Bhargavan and Blanchet, 2017).

**Post-quantum protocols.** Replacing Diffie-Hellman by a key-encapsulation
mechanism changes the shape of handshakes (a KEM has an encapsulator and a
decapsulator, not two symmetric shares), and with it the analysis. Hybrid key
exchanges in TLS and the post-quantum versions of Signal's handshake (PQXDH,
2023) were modeled in ProVerif and Tamarin before deployment, and the PQXDH
analysis found and fixed a subtle problem with how the KEM public key was
bound. The design questions are in the Protocols book,
[Chapter 20](../protocols/index.md).

**Open problems.** Fully automatic proofs for protocols with unbounded state
and loops, without human guidance; equivalence properties (privacy,
unlinkability, the 5G identity question) at scale, where tools are much weaker
than for reachability; tight computational bounds that do not lose a factor of
the number of sessions; and protocols for long-delay links, where sessions last
days and messages arrive out of order, for which today's models of freshness do
not fit.

## Check yourself

??? question "1. A protocol uses perfect encryption and perfect signatures. Can it still be broken? What does the attacker do instead?"

    Yes. The attacker never breaks a primitive; he moves messages between
    sessions, sends them back, replays them or edits a negotiation, so that
    every honest party follows the rules and some party ends up believing
    something false. An attack is a trace that violates a stated goal.

??? question "2. In the airlock example of §19.2, why does adding the labels 'door' and 'badge' inside the MACs stop the reflection?"

    The attacker needed the door's answer in run 2, $\mathrm{MAC}_K(N_2)$, to
    be accepted as a badge's answer in run 1. With labels, the door produces
    $\mathrm{MAC}_K(\text{door} \Vert N_2)$ and expects
    $\mathrm{MAC}_K(\text{badge} \Vert N_2)$. The inputs differ, so one cannot
    stand in for the other.

??? question "3. Which class is each of these: (a) a stolen client key lets an attacker pose as any server to that client; (b) a server's export parameters are accepted as normal ones; (c) an old signed payment order is sent again?"

    (a) Key-compromise impersonation. (b) A downgrade carried by a type
    confusion (Logjam). (c) Replay.

??? question "4. In Lowe's attack, which honest party acts as an oracle, and what does it do for the attacker?"

    Alice. In her honest run with Mallory, she decrypts Bob's message 2
    (encrypted for her, which Mallory cannot read) and re-encrypts its second
    component, $N_B$, for her peer, Mallory. She is a decryption oracle for
    messages of the right shape that carry a nonce Mallory knows.

??? question "5. Why does Lowe's fix put B's name in message 2 rather than A's name in message 3?"

    Message 2 is the one misused: Alice accepted it in a run with a different
    peer. Her check must be able to reject it, so it must contain something
    that differs between "Bob sent this" and "Mallory's run". Bob's own name,
    inside a ciphertext Mallory cannot change, does that. Message 3 already
    went to the attacker in the attack, so changing it would not help Bob.

??? question "6. The outgoing authentication test on Bob's nonce yields an initiator strand of Alice with some peer X. What extra fact forces X = B in Needham-Schroeder-Lowe?"

    The initiator role checks that the name inside message 2 equals its peer.
    The only message 2 carrying $N_B$ was made by Bob and contains $B$, so any
    initiator strand that accepted it has peer $B$.

??? question "7. The Python search found no attack on Needham-Schroeder-Lowe with five sessions. What exactly has that shown?"

    Only that no attack exists among the interleavings of those five sessions,
    with that attacker's limited message-building ability and perfect
    encryption. It is not a proof for unboundedly many sessions; that needs an
    argument like Lowe's small-system result, or a tool like ProVerif or
    Tamarin that handles unbounded sessions.

??? question "8. The renegotiation fix of RFC 5746 binds a renegotiation to the previous handshake's Finished values. Why did the triple handshake defeat it, and what did RFC 7627 change?"

    The attacker arranged for two connections, with different peers, to have
    the same master secret and, after resumption, the same Finished values. A
    binding to values that are not unique to one connection binds nothing.
    RFC 7627 derives the master secret from a hash of the whole handshake
    transcript, including certificates, so different peers give different
    master secrets and Finished values.

??? question "9. TLS 1.2's Finished message is a MAC over the whole handshake. Why did it not stop FREAK and Logjam?"

    Its key comes from the session's own key exchange. The attacker pushed the
    session onto 512-bit RSA or Diffie-Hellman and broke it during the
    handshake, so he knew the MAC key and forged both Finished messages. Only
    authentication with a key the weak option does not touch, such as a
    long-term signature over the transcript, protects the negotiation.

??? question "10. WPA2's 4-way handshake had a correct security proof in 2005. How did KRACK break it anyway, and what does that say about symbolic proofs?"

    The proof modeled the handshake messages and the agreed key, but not the
    moment the key is installed in the encryption layer with its packet
    counter. Replaying message 3 made devices install the key again and reset
    the counter, reusing nonces. A proof covers only what its model contains;
    attacks live in what was left out.

## What you learned

- A protocol attack is a trace in which honest parties follow the rules and a
  goal (secrecy, agreement, key confirmation) fails; it needs no broken
  primitive.
- Nine classes give a checklist: man in the middle and interleaving,
  reflection, replay, type confusion, downgrade, cross-protocol, state-machine
  confusion, key-compromise impersonation, unknown key share.
- Hand analysis asks, at every receive, who else could have produced this
  message, and looks for honest roles that turn an unreadable message into a
  readable one. That is how Lowe's attack on Needham-Schroeder is found, and
  one name in message 2 fixes it.
- Strand spaces and authentication tests turn the same reasoning into proofs;
  where a proof needs a fact the protocol does not give, that gap is the attack.
- A search over interleavings with a Dolev-Yao attacker finds Lowe's attack
  mechanically; bounded search shows nothing beyond its bound.
- ProVerif (Horn clauses, over-approximation) and Tamarin (multiset rewriting,
  backward search) prove properties for unbounded sessions; they shaped TLS 1.3
  and exposed gaps in 5G AKA.
- Symbolic proofs miss what their models leave out: bit-level cryptography,
  key installation, unstated assumptions and code that differs from the
  specification.
- The famous cases map onto the classes: renegotiation (interleaving), triple
  handshake (unknown key share), FREAK (state machine), Logjam (downgrade),
  DROWN (cross-protocol), KRACK (state machine), Zoom (server-held keys),
  MTProto and Matrix (ordering, trust and confusion).
- Good protocols name identities, confirm keys, bind the transcript, refuse
  downgrades and run one explicit state machine.

**Next:** [Chapter 20](20-Where-Cryptanalysis-Goes.md) looks at what is still
open in cryptanalysis and where the field is going.

## Further reading

- Roger Needham and Michael Schroeder, "Using Encryption for Authentication in
  Large Networks of Computers" (*Communications of the ACM*, 1978).
- Dorothy Denning and Giovanni Sacco, "Timestamps in Key Distribution
  Protocols" (*Communications of the ACM*, 1981).
- Danny Dolev and Andrew Yao, "On the Security of Public Key Protocols" (*IEEE
  Transactions on Information Theory*, 1983).
- Michael Burrows, Martín Abadi and Roger Needham, "A Logic of
  Authentication" (*Proceedings of the Royal Society A*, 1989).
- Martín Abadi and Roger Needham, "Prudent Engineering Practice for
  Cryptographic Protocols" (IEEE S&P 1994; *IEEE Transactions on Software
  Engineering*, 1996).
- Gavin Lowe, "An Attack on the Needham-Schroeder Public-Key Authentication
  Protocol" (*Information Processing Letters*, 1995); "Breaking and Fixing the
  Needham-Schroeder Public-Key Protocol Using FDR" (TACAS 1996); "A Hierarchy
  of Authentication Specifications" (CSFW 1997).
- Whitfield Diffie, Paul van Oorschot and Michael Wiener, "Authentication and
  Authenticated Key Exchanges" (*Designs, Codes and Cryptography*, 1992);
  Simon Blake-Wilson and Alfred Menezes, "Unknown Key-Share Attacks on the
  Station-to-Station (STS) Protocol" (PKC 1999).
- F. Javier Thayer Fábrega, Jonathan Herzog and Joshua Guttman, "Strand
  Spaces: Why Is a Security Protocol Correct?" (IEEE S&P 1998); Joshua Guttman
  and F. Javier Thayer, "Authentication Tests and the Structure of Bundles"
  (*Theoretical Computer Science*, 2002).
- Nancy Durgin, Patrick Lincoln, John Mitchell and Andre Scedrov,
  "Undecidability of Bounded Security Protocols" (FMSP 1999); Michaël
  Rusinowitch and Mathieu Turuani, "Protocol Insecurity with Finite Number of
  Sessions Is NP-Complete" (CSFW 2001).
- Martín Abadi and Phillip Rogaway, "Reconciling Two Views of Cryptography"
  (IFIP TCS 2000).
- Bruno Blanchet, "An Efficient Cryptographic Protocol Verifier Based on
  Prolog Rules" (CSFW 2001), and the ProVerif manual.
- Simon Meier, Benedikt Schmidt, Cas Cremers and David Basin, "The TAMARIN
  Prover for the Symbolic Analysis of Security Protocols" (CAV 2013), and the
  Tamarin manual; Cas Cremers, "The Scyther Tool" (CAV 2008).
- Cas Cremers, Marko Horvat, Sam Scott and Thyla van der Merwe, "Automated
  Analysis and Verification of TLS 1.3: 0-RTT, Resumption and Delayed
  Authentication" (IEEE S&P 2016); Cremers, Horvat, Hoyland, Scott and van der
  Merwe, "A Comprehensive Symbolic Analysis of TLS 1.3" (CCS 2017).
- Karthikeyan Bhargavan, Bruno Blanchet and Nadim Kobeissi, "Verified Models
  and Reference Implementations for the TLS 1.3 Standard Candidate" (IEEE S&P
  2017); Benjamin Dowling, Marc Fischlin, Felix Günther and Douglas Stebila,
  "A Cryptographic Analysis of the TLS 1.3 Handshake Protocol Candidates" (CCS
  2015).
- David Basin, Jannik Dreier, Lucca Hirschi, Saša Radomirović, Ralf Sasse and
  Vincent Stettler, "A Formal Analysis of 5G Authentication" (CCS 2018); Cas
  Cremers and Martin Dehnel-Wild, "Component-Based Formal Analysis of 5G-AKA"
  (NDSS 2019).
- Marsh Ray and Steve Dispensa, "Renegotiating TLS" (PhoneFactor, November
  2009); RFC 5746 (2010).
- Karthikeyan Bhargavan, Antoine Delignat-Lavaud, Cédric Fournet, Alfredo
  Pironti and Pierre-Yves Strub, "Triple Handshakes and Cookie Cutters:
  Breaking and Fixing Authentication over TLS" (IEEE S&P 2014); RFC 7627
  (2015).
- Benjamin Beurdouche and others, "A Messy State of the Union: Taming the
  Composite State Machines of TLS" (IEEE S&P 2015).
- David Adrian and others, "Imperfect Forward Secrecy: How Diffie-Hellman
  Fails in Practice" (CCS 2015).
- Nimrod Aviram and others, "DROWN: Breaking TLS Using SSLv2" (USENIX Security
  2016); RFC 6176 (2011).
- Nikos Mavrogiannopoulos, Frederik Vercauteren, Vesselin Velichkov and Bart
  Preneel, "A Cross-Protocol Attack on the TLS Protocol" (CCS 2012); Marcus
  Brinkmann and others, "ALPACA: Application Layer Protocol Confusion" (USENIX
  Security 2021).
- Clemens Hlauschek, Markus Gruber, Florian Fankhauser and Christian Schanes,
  "Prying Open Pandora's Box: KCI Attacks against TLS" (WOOT 2015).
- Joeri de Ruiter and Erik Poll, "Protocol State Fuzzing of TLS
  Implementations" (USENIX Security 2015).
- Nir Drucker and Shay Gueron, "Selfie: Reflections on TLS 1.3 with PSK"
  (IACR ePrint 2019/347; *Journal of Cryptology*, 2021).
- Mathy Vanhoef and Frank Piessens, "Key Reinstallation Attacks: Forcing Nonce
  Reuse in WPA2" (CCS 2017); Changhua He and others, "A Modular Correctness
  Proof of IEEE 802.11i and TLS" (CCS 2005); Cas Cremers, Benjamin Kiesl and
  Niklas Medinger, "A Formal Analysis of IEEE 802.11's WPA2: Countering the
  Kracks Caused by Cracking the Counters" (USENIX Security 2020).
- Martin Albrecht, Lenka Mareková, Kenneth Paterson and Igors Stepanovs,
  "Four Attacks and a Proof for Telegram" (IEEE S&P 2022).
- Bill Marczak and John Scott-Railton, "Move Fast and Roll Your Own Crypto: A
  Quick Look at the Confidentiality of Zoom Meetings" (Citizen Lab, 3 April
  2020).
- Martin Albrecht, Sofía Celi, Benjamin Dowling and Daniel Jones,
  "Practically-exploitable Cryptographic Vulnerabilities in Matrix" (IEEE S&P
  2023).
- Fabian Bäumer, Marcus Brinkmann and Jörg Schwenk, "Terrapin Attack: Breaking
  SSH Channel Integrity by Sequence Number Manipulation" (USENIX Security
  2024).
- Véronique Cortier and Steve Kremer, "Formal Models and Techniques for
  Analyzing Security Protocols: A Tutorial" (*Foundations and Trends in
  Programming Languages*, 2014). The best single introduction to the symbolic
  methods of §19.7.
- RFC 8446 (TLS 1.3, 2018).
