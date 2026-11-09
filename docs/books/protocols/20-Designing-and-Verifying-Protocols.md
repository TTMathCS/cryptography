# 20. Designing and verifying protocols

*Nineteen chapters have taken protocols apart. Almost every one carried a
story of a design that looked right, was deployed, and then failed: an export
cipher suite left switched on, a padding error that answered too helpfully, a
nonce used twice, a field nobody bound into a signature. This last chapter
turns those stories into rules, and then asks how anyone can know a protocol
is right before it ships. The answer of the last thirty years is formal
analysis: write the protocol down as precisely as a program, describe the
attacker as a machine, and let a tool search every way the two can interact.
You will run such a search yourself and watch it rediscover, in a fraction of
a second, an attack on a 1978 protocol that took seventeen years to find by
hand. Then the chapter looks forward: what post-quantum algorithms change in
protocol design, how the Bundle Protocol secures messages that may wait hours
in a relay orbiter on their way to Mars, and which problems are still open.*

!!! abstract "In this chapter"
    **You will learn:**

    - ten rules that summarize the failures in this book;
    - why a negotiation must be bound to its transcript, coded;
    - the Dolev-Yao attacker and the symbolic model of a protocol;
    - Lowe's attack on Needham-Schroeder, by hand and found by a model
      checker you write;
    - why a ballot can be secret symbolically and readable computationally;
    - the Otway-Rees type flaw, found by a second checker and fixed by tags;
    - what ProVerif, Tamarin, CryptoVerif and verified code have proved,
      what the analyses of TLS 1.3, Signal and 5G found, and where proofs stop;
    - the Bellare-Rogaway game, and how to read a security bound;
    - a design checklist, applied to a habitat command;
    - how post-quantum algorithms change the shape of protocols;
    - delay-tolerant networking and BPSec, checked against RFC 9173;
    - the open problems this book leaves for its readers.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (what
    protocols guarantee); the TLS chapters
    ([3](03-TLS-1.3-Message-by-Message.md),
    [4](04-Thirty-Years-of-TLS-Attacks.md)) and
    [Chapter 16](16-Signal-and-the-Double-Ratchet.md) for the examples;
    public-key encryption and MACs from book 1.

    **Levels:** 20.1 to 20.3 beginner; 20.4 to 20.8, 20.10 and 20.11
    intermediate; 20.9 and 20.12 advanced; 20.13 expert.

## 20.1 What thirty years of failures teach

*Level: beginner.*

Read the attack sections of this book together and the same few mistakes come
back in new clothes. None of the rules below is new; each is a summary of a
chapter.

1. **Say who you are talking to, inside the protected message.** A message
   that does not name its sender and intended receiver can be replayed into a
   different conversation. Lowe's attack in §20.3 is the classic case; the
   Selfie attack on TLS 1.3 with pre-shared keys (§20.5) is a modern one.
2. **Bind the whole transcript.** Whatever was negotiated must be
   authenticated afterwards by both sides, or an attacker who edits the
   negotiation chooses the weakest option: FREAK, Logjam and the SSL 3.0
   fallbacks of [Chapter 4](04-Thirty-Years-of-TLS-Attacks.md). TLS 1.3 signs
   and MACs a hash of every message.
3. **Authenticate before you process.** Decrypting, decompressing or parsing
   data that has not been authenticated hands the attacker an oracle: padding
   oracles in TLS and SSH, EFAIL's gadgets in
   [Chapter 15](15-Email-OpenPGP-and-SMIME.md). Use an AEAD and reject before
   reading.
4. **One key, one purpose.** Derive separate keys with labels for each
   direction, message type and role (the HKDF labels of TLS 1.3, Signal and
   MLS). A key used both to sign and to decrypt, or in two protocols, lets
   one protocol become an oracle for the other.
5. **Fresh means provably fresh.** Nonces must never repeat under one key
   (KRACK in [Chapter 9](09-Wi-Fi-Security.md), the Android wallets in
   [Chapter 19](19-Ledgers-Bitcoin.md)), and a receiver must be able to tell
   an old message from a new one.
6. **Fail the same way every time.** Different error messages, or different
   times to fail, turn a server into a decryption oracle: Bleichenbacher's
   attack and its many returns.
7. **Fewer options.** Every choice is a downgrade path and a code path that
   is rarely tested. WireGuard has no negotiation at all; JWT's `alg` field
   ([Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md)) shows the opposite.
8. **Plan for compromise.** Assume keys will leak: forward secrecy limits
   what an old key reveals, and post-compromise security, as in the Double
   Ratchet, limits what a stolen state reveals later.
9. **A small, explicit state machine.** Implementations that accept messages
   in the wrong order skip steps without noticing (the SMACK bugs of 2015).
   A protocol whose states fit on a page is a protocol that gets implemented
   correctly.
10. **Keys and people are part of the protocol.** Most real losses in this
    book came from how keys were made, stored, checked and recovered: weak
    random numbers, unchecked fingerprints, lost seed phrases. A design that
    assumes users compare 60-digit numbers will be used without it.

### Code it: a downgrade, and what catches it

Rule 2 is the one most often broken, so here it is in miniature. A client
offers a strong key exchange and a weak one; an attacker deletes the strong
offer; the server, seeing only the weak one, picks it. Three checks are
compared: none, a `Finished` MAC over the transcript keyed by the new session
key (as in TLS 1.2), and a signature over the transcript by the server's
long-term key (TLS 1.3's `CertificateVerify`). The third attacker can break
the weak exchange while the handshake is still running, as the Logjam authors
did for 512-bit Diffie-Hellman with a week of precomputation and about a
minute per connection.

```python
# Rule 2 in code: bind the transcript. A client offers two key exchanges, an
# attacker in the middle deletes the strong one, and the server picks the weak
# one. A MAC over everything said notices, unless the attacker can break the
# weak exchange during the handshake (Logjam). A signature by the server's
# long-term key over the transcript, as in TLS 1.3, still notices.
import hashlib, hmac
mac = lambda k, m: hmac.new(k, m, hashlib.sha256).digest()
server_long_term = hashlib.sha256(b"server's signing key, never sent").digest()   # stands in for a signature key

def handshake(attacker, check):
    offer = ["X25519MLKEM768", "DH-512"]                # strongest first
    seen = offer[1:] if attacker else offer             # the attacker deletes the strong offer
    choice = seen[0]
    key = hashlib.sha256(b"session key via " + choice.encode()).digest()
    transcript = lambda offered: repr((offered, choice)).encode()
    if check == "none": proof, expect = b"", b""
    elif check == "finished":                           # MAC keyed by the new session key
        proof, expect = mac(key, transcript(seen)), mac(key, transcript(offer))
        if attacker == "breaks DH-512" and choice == "DH-512":
            proof = mac(key, transcript(offer))         # it knows the key, so it forges the MAC
    else:                                               # signature over the transcript
        proof, expect = mac(server_long_term, transcript(seen)), mac(server_long_term, transcript(offer))
    verdict = "accepts" if hmac.compare_digest(proof, expect) else "ABORTS"
    return f"server chose {choice:15} client {verdict}"
for attacker in (None, "strips", "breaks DH-512"):
    for check in ("none", "finished", "signature"):
        print(f"attacker {attacker or 'none':13} check {check:9}:", handshake(attacker, check))
```

```text
attacker none          check none     : server chose X25519MLKEM768  client accepts
attacker none          check finished : server chose X25519MLKEM768  client accepts
attacker none          check signature: server chose X25519MLKEM768  client accepts
attacker strips        check none     : server chose DH-512          client accepts
attacker strips        check finished : server chose DH-512          client ABORTS
attacker strips        check signature: server chose DH-512          client ABORTS
attacker breaks DH-512 check none     : server chose DH-512          client accepts
attacker breaks DH-512 check finished : server chose DH-512          client accepts
attacker breaks DH-512 check signature: server chose DH-512          client ABORTS
```

The last line is Logjam's lesson. A MAC keyed by the negotiated secret can
only be as strong as the weakest option the attacker can force, because the
attacker who breaks that option holds the MAC key. The transcript must be
authenticated with something the negotiation cannot weaken (a long-term
signature over a hash of every message, as TLS 1.3 does), or the weak options
must be removed, which TLS 1.3 also did.

## 20.2 Modeling a protocol and its attacker

*Level: beginner.*

A protocol in a standard is prose and diagrams. To analyze it mechanically,
it has to become something more like a program: a set of **roles** (initiator,
responder, server), each a sequence of messages to send and patterns to
receive, and a statement of what should be true at the end, such as "if B
finishes a run believing it spoke to A, then A really ran the protocol with
B" (**authentication**) or "the attacker never learns this key" (**secrecy**).

The attacker gets a precise definition too. In 1983 Danny Dolev and Andrew
Yao proposed the one still used: the attacker **is the network**. It reads
every message, deletes any message, delivers messages to anyone in any order,
and sends any message it can construct. It can also be a legitimate user,
with its own name and keys, because real attackers usually are. What it
cannot do is break the cryptography: it cannot decrypt without the key, forge
a signature, or invert a hash. Messages are treated as **symbolic terms**,
trees built from names, nonces, keys and function symbols like
$\mathrm{enc}(m, \mathit{pk}(B))$, and the attacker's knowledge grows by two
kinds of rules:

- **analysis**: from a pair it learns both halves; from
  $\mathrm{enc}(m, \mathit{pk}(X))$ it learns $m$ only if it knows $X$'s
  private key;
- **synthesis**: it can pair, encrypt, hash and sign anything it knows,
  using keys it knows.

This is the **symbolic** or **Dolev-Yao model**. It throws away bits,
probabilities and running times, so it cannot see a weak cipher or a timing
leak. What it sees very well is the *logic* of a protocol: who sends what to
whom, and whether a message from one run can be used in another. Logic flaws
are the ones humans miss, because they hide in interleavings of several runs
that nobody draws on a whiteboard.

The other model is the **computational** one of cryptographers: messages are
bit strings, the attacker is any probabilistic polynomial-time algorithm, and
security is proved by a reduction (an attacker on the protocol would give an
attacker on, say, the decisional Diffie-Hellman problem). Computational proofs
say more, but are long and written by hand. §20.4 shows tools for both, and
§20.9 plays the computational game by hand.

### Symbolic and computational, on one message

A voter sends a ballot encrypted under the election's public key. In the
symbolic model it is the term $\mathrm{aenc}(\mathit{yes}, \mathit{pk}(E))$,
and the attacker cannot derive $\mathit{yes}$ without $E$'s private key. The
ballot is secret.

Now compute it with real numbers, using textbook RSA and a toy key:
$p = 61$, $q = 53$, $n = 3233$, $e = 17$, and the private exponent
$d = 2753$ (since $17 \cdot 2753 = 46{,}801 = 15 \cdot 3120 + 1$, with
$3120 = 60 \cdot 52$). Encode "no" as 2 and "yes" as 3. Square and multiply
gives the ballot: $3^2 = 9$, $3^4 = 81$, $3^8 = 6561 \equiv 95$,
$3^{16} \equiv 95^2 = 9025 \equiv 2559$, and $3^{17} \equiv 2559 \cdot 3 =
7677 \equiv 1211 \pmod{3233}$. The attacker cannot decrypt 1211, and does
not need to: it encrypts both possible votes and compares. $2^{17} = 131{,}072 \equiv 1752$, which is not the ballot;
$3^{17} \equiv 1211$, which is. The vote is out, and no symbolic rule was
broken.

```python
# One ballot, two models: textbook RSA is deterministic, so a guess can be tested.
import random
n, e, d = 61 * 53, 17, 2753                      # p = 61, q = 53: a toy key
YES, NO = 3, 2
ballot = pow(YES, e, n)
print("ballot on the wire:", ballot)
for name, guess in (("no", NO), ("yes", YES)):
    c = pow(guess, e, n)
    print(f"  attacker encrypts {name!r}: {c}" + ("  <- same as the ballot" if c == ballot else ""))

rng = random.Random(20)
def padded(v): return pow(v + 4 * rng.randrange(1, 800), e, n)    # random padding, then RSA
b1, b2 = padded(YES), padded(YES)
print("two padded ballots for 'yes':", b1, b2)
print("receiver decrypts and reads the vote:", pow(b1, d, n) % 4, pow(b2, d, n) % 4)
print("attacker's guess matches a ballot:", pow(YES, e, n) in (b1, b2))
```

It prints:

```text
ballot on the wire: 1211
  attacker encrypts 'no': 1752
  attacker encrypts 'yes': 1211  <- same as the ballot
two padded ballots for 'yes': 370 1301
receiver decrypts and reads the vote: 3 3
attacker's guess matches a ballot: False
```

The symbolic question was the wrong one. "Cannot derive the term" is **weak
secrecy**; what a ballot needs is **strong secrecy**, that an observer cannot
tell a "yes" ballot from a "no" ballot. Symbolic tools can ask that too, as an
equivalence between two runs of the system (§20.13), and then they find the
guess-and-compare attack on deterministic encryption. With a fresh random
$r$ inside, $\mathrm{aenc}(m, r, \mathit{pk})$, as in the padded version,
the attack goes away in both models. The toy padding has only 799 values, so
a patient attacker could still try all 1,598 encryptions; real padding (OAEP,
or HPKE's KEM plus AEAD) uses at least 128 random bits, and only the
computational model can say why that is enough.

## 20.3 Lowe's attack on Needham-Schroeder

*Level: beginner.*

[Chapter 1](01-What-a-Protocol-Must-Do.md#14-needham-schroeder-and-lowes-attack)
told this story in brief. It returns here in full, because it is the first
example in every course on protocol analysis. In 1978 Roger Needham and
Michael Schroeder published protocols for
authentication in "large networks of computers", one with a trusted server and
symmetric keys (the ancestor of Kerberos, [Chapter 12](12-Kerberos.md)) and
one with public keys. Leaving out the steps that fetch public keys, the
public-key protocol is three messages. A and B each make a fresh random
nonce, and each nonce is sent only under the other's public key:

$$
\begin{aligned}
&1.\quad A \to B:\ \{N_A, A\}_{\mathit{pk}(B)}\\
&2.\quad B \to A:\ \{N_A, N_B\}_{\mathit{pk}(A)}\\
&3.\quad A \to B:\ \{N_B\}_{\mathit{pk}(B)}
\end{aligned}
$$

The reasoning looks airtight. Only B can read message 1, so only B can return
$N_A$ in message 2; only A can read message 2, so only A can return $N_B$ in
message 3. At the end each knows the other is present, and the pair
$(N_A, N_B)$ is a shared secret from which a session key can be derived.

!!! note "Life story: the Needham-Schroeder protocols"
    **Born:** 1978, Roger Needham (University of Cambridge) and Michael
    Schroeder (Xerox PARC) ·
    **Purpose:** authentication and key distribution for networks of
    computers, with a trusted server (symmetric version) or with public keys
    · **Grew by:** the symmetric version became Kerberos, after Dorothy
    Denning and Giovanni Sacco showed in 1981 that an old, compromised
    session key could be replayed, which Kerberos fixed with timestamps ·
    **Status:** the public-key version was broken by Gavin Lowe in 1995 and
    survives as Needham-Schroeder-Lowe, the standard first example of every
    protocol analysis tool

### A worked example by hand: the attack

In 1995 Gavin Lowe found the flaw. Suppose A starts an honest session with
I, who is a registered user and also the attacker. I uses A's messages to
impersonate A to B:

$$
\begin{aligned}
&1.\quad A \to I:\ \{N_A, A\}_{\mathit{pk}(I)}\\
&1'.\quad I(A) \to B:\ \{N_A, A\}_{\mathit{pk}(B)}\\
&2'.\quad B \to A:\ \{N_A, N_B\}_{\mathit{pk}(A)}\\
&2.\quad I \to A:\ \text{the same message, passed on}\\
&3.\quad A \to I:\ \{N_B\}_{\mathit{pk}(I)}\\
&3'.\quad I(A) \to B:\ \{N_B\}_{\mathit{pk}(B)}
\end{aligned}
$$

Follow it step by step. A wants to talk to I, so it encrypts $N_A$ for I.
I decrypts it (it is I's own key) and re-encrypts the same content for B;
"$I(A)$" means I sending while claiming to be A. B believes A is calling and
answers with its nonce under A's key. I cannot read that, but it does not
need to: it forwards the ciphertext to A, who sees its own $N_A$ and thinks
this is I's reply. A dutifully returns the second nonce to its partner,
encrypted for I. Now I knows $N_B$, encrypts it for B, and B finishes. B
believes it shares the secret $(N_A, N_B)$ with A alone; in fact I knows both.
If B is a bank and the session key comes from those nonces, I can now act as
A.

Nothing was broken: every encryption was perfect. The flaw is that message 2
does not say *who* sent it. A cannot tell a reply from B apart from a reply
from I. Lowe's repair adds one name:

$$
2.\quad B \to A:\ \{N_A, N_B, B\}_{\mathit{pk}(A)}
$$

In the attack, A would receive a message naming B while it expected I, and
stop. This repaired version is called **Needham-Schroeder-Lowe** (NSL). The
attack had escaped the authors, the reviewers and the analyses of the 1980s,
which did not consider a legitimate user acting dishonestly. Lowe found it
while encoding the protocol for FDR, a model checker for the process algebra
CSP, and his 1996 paper, "Breaking and fixing the Needham-Schroeder
public-key protocol using FDR", helped start the field of automated protocol
analysis.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Message sequence chart of Lowe's attack: A sends its nonce to the attacker I; I re-encrypts it for B claiming to be A; B's reply goes to A through I; A returns B's nonce to I; I re-encrypts it for B, who finishes believing it spoke to A" fill="currentColor" font-size="12">
<text x="100" y="26" text-anchor="middle" font-weight="bold">A</text>
<text x="100" y="42" text-anchor="middle" font-size="11">honest</text>
<text x="320" y="26" text-anchor="middle" font-weight="bold" class="acc-fill">I</text>
<text x="320" y="42" text-anchor="middle" font-size="11">attacker, also a user</text>
<text x="540" y="26" text-anchor="middle" font-weight="bold">B</text>
<text x="540" y="42" text-anchor="middle" font-size="11">honest</text>
<line x1="100" y1="52" x2="100" y2="262" stroke="currentColor" opacity="0.5"/>
<line x1="320" y1="52" x2="320" y2="262" stroke="currentColor" opacity="0.5" class="acc"/>
<line x1="540" y1="52" x2="540" y2="262" stroke="currentColor" opacity="0.5"/>
<line x1="100" y1="80" x2="308" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="318,80 306,75 306,85"/>
<text x="210" y="73" text-anchor="middle" font-size="11.5">1. {Na, A} for I</text>
<line x1="320" y1="116" x2="528" y2="116" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="538,116 526,111 526,121" class="acc-fill"/>
<text x="430" y="109" text-anchor="middle" font-size="11.5" class="acc-fill">1′. {Na, A} for B, "from A"</text>
<line x1="540" y1="152" x2="112" y2="152" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/><polygon points="102,152 114,147 114,157"/>
<rect x="356" y="132" width="148" height="16" style="fill: var(--md-default-bg-color)"/>
<text x="430" y="145" text-anchor="middle" font-size="11.5">2′. {Na, Nb} for A</text>
<rect x="132" y="156" width="156" height="16" style="fill: var(--md-default-bg-color)"/>
<text x="210" y="168" text-anchor="middle" font-size="11">passed on by I unread</text>
<line x1="100" y1="196" x2="308" y2="196" stroke="currentColor" stroke-width="1.5"/><polygon points="318,196 306,191 306,201"/>
<text x="210" y="189" text-anchor="middle" font-size="11.5">3. {Nb} for I</text>
<line x1="320" y1="232" x2="528" y2="232" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="538,232 526,227 526,237" class="acc-fill"/>
<text x="430" y="225" text-anchor="middle" font-size="11.5" class="acc-fill">3′. {Nb} for B</text>
<text x="100" y="284" text-anchor="middle" font-size="11">thinks: talked to I</text>
<text x="320" y="284" text-anchor="middle" font-size="11" class="acc-fill">knows Na and Nb</text>
<text x="540" y="284" text-anchor="middle" font-size="11">thinks: talked to A</text>
</svg>
<figcaption>Figure 20.1. Lowe's attack. Each encryption is perfect; the flaw is that message 2′ does not name its sender, so A cannot tell B's reply from I's.</figcaption>
</figure>

### The attack as a derivation

A model checker does not see a story; it sees the attacker's knowledge grow by
the analysis and synthesis rules of §20.2. I opens $\{N_A, A\}_{\mathit{pk}(I)}$
with its own key and re-encrypts the contents for B (message 1′). It cannot
open B's reply, so it passes it on, and *honest A* opens it and sends $N_B$
out under I's key. I opens that and builds $\{N_B\}_{\mathit{pk}(B)}$
(message 3′). The middle step is the heart of many logic attacks: an honest
role used as a **decryption oracle**, taking in a ciphertext for itself and
sending some of its contents out under a key the attacker controls. The belief
logics of the 1980s, such as the BAN logic of Michael Burrows, Martín Abadi
and Needham himself (1989), could not express such a step: they reason about
what honest parties come to believe, with no explicit model of the attacker.

### Code it: a model checker finds the attack

The program below is a complete, if tiny, symbolic model checker. Messages
are Python tuples: `("enc", "B", (na, "A"))` is $\{N_A, A\}_{\mathit{pk}(B)}$.
The attacker's knowledge starts with every name, every public key and its own
nonce `Ni`; it learns the contents of anything encrypted for I. Three role
instances run: A starting a session with I, A starting another with B, and B
answering whoever calls. When a role waits for a message, the attacker may
deliver any instance of the expected pattern that it can construct, with the
pattern's variables filled from every name and nonce in the system. A
breadth-first search over all interleavings stops at the first state where B
has finished believing it spoke to A while either the attacker knows $N_B$ or
A never finished a run with B. Then the same search runs on Lowe's repair.

```python
# A model checker in seventy lines: the Needham-Schroeder public-key protocol
# against a Dolev-Yao attacker who controls the network and owns one identity, I.
# Breadth-first search over every interleaving finds the shortest attack.
from collections import deque
from itertools import product

NAMES = ["A", "B", "I"]
def enc(to, *parts): return ("enc", to, parts)          # {parts} under the public key of `to`
def show(t):
    if isinstance(t, str): return t
    if t[0] == "enc": return "{" + ", ".join(show(p) for p in t[2]) + "}" + t[1]
    return "?" + t[1]                                    # a variable
V = lambda name: ("var", name)

def roles(fixed):                                        # fixed=True is Lowe's repair (NSL)
    init = lambda me, peer, na: [("send", enc(peer, na, me)),
        ("recv", enc(me, na, V("nb"), peer) if fixed else enc(me, na, V("nb"))),
        ("send", enc(peer, V("nb"))), ("end", peer)]
    resp = lambda me, nb: [("recv", enc(me, V("na"), V("a"))),
        ("send", enc(V("a"), V("na"), nb, me) if fixed else enc(V("a"), V("na"), nb)),
        ("recv", enc(me, nb)), ("end", V("a"))]
    return [("A", init("A", "I", "Na")), ("A", init("A", "B", "Na2")), ("B", resp("B", "Nb"))]

def subst(t, env):
    if isinstance(t, str): return t
    if t[0] == "var": return env.get(t[1], t)
    return ("enc", subst(t[1], env), tuple(subst(p, env) for p in t[2]))
def analyse(known):                                      # I decrypts whatever is under its own key
    known = set(known)
    for t in list(known):
        if not isinstance(t, str) and t[1] == "I": known |= set(t[2])
    return frozenset(known)
def derivable(t, known):
    if t in known or t in NAMES: return True             # names and public keys are public
    return not isinstance(t, str) and t[0] == "enc" and all(derivable(p, known) for p in t[2])
def variables(t):
    if isinstance(t, str): return set()
    if t[0] == "var": return {t[1]}
    return set().union(variables(t[1]), *(variables(p) for p in t[2]))

def search(fixed):
    threads = roles(fixed)
    atoms = NAMES + ["Na", "Na2", "Nb", "Ni"]
    start = ((0,) * len(threads), (frozenset(),) * len(threads), analyse({"Ni"}), ())
    queue, seen = deque([start]), set()
    while queue:
        pc, envs, known, trace = queue.popleft()
        if (pc, envs, known) in seen: continue
        seen.add((pc, envs, known))
        for i, (who, steps) in enumerate(threads):
            env = dict(envs[i])
            if pc[i] == len(steps) - 1 and who == "B":   # B has finished: check its beliefs
                partner = subst(steps[-1][1], env)
                done_A = pc[1] == len(threads[1][1]) - 1
                if partner == "A" and (derivable("Nb", known) or not done_A):
                    return trace + (f"B finishes, believing it spoke to A; I knows Nb: {derivable('Nb', known)}",), len(seen)
            if pc[i] >= len(steps) - 1: continue
            kind, msg = steps[pc[i]]
            if kind == "send":
                m = subst(msg, env)
                moves = [(env, known | {m}, f"{who} sends {show(m)}")]
            else:                                         # the attacker chooses what arrives
                vs, moves = sorted(variables(subst(msg, env))), []
                for choice in product(atoms, repeat=len(vs)):
                    e = {**env, **dict(zip(vs, choice))}
                    m = subst(msg, e)
                    if derivable(m, known): moves.append((e, known, f"{who} receives {show(m)}"))
            for e, k, line in moves:
                npc = pc[:i] + (pc[i] + 1,) + pc[i + 1:]
                nenv = envs[:i] + (frozenset(e.items()),) + envs[i + 1:]
                queue.append((npc, nenv, analyse(k), trace + (line,)))
    return None, len(seen)

for fixed in (False, True):
    attack, states = search(fixed)
    print("Needham-Schroeder-Lowe" if fixed else "Needham-Schroeder (1978)", f"- {states} states explored")
    for n, line in enumerate(attack or ["no attack in these three sessions: whenever B ends believing A, A really ran with B"], 1):
        print(f"  {n}. {line}" if attack else "  " + line)
```

```text
Needham-Schroeder (1978) - 1349 states explored
  1. A sends {Na, A}I
  2. B receives {Na, A}B
  3. B sends {Na, Nb}A
  4. A receives {Na, Nb}A
  5. A sends {Nb}I
  6. B receives {Nb}B
  7. B finishes, believing it spoke to A; I knows Nb: True
Needham-Schroeder-Lowe - 1406 states explored
  no attack in these three sessions: whenever B ends believing A, A really ran with B
```

Breadth-first search returns the shortest attack, and it is Lowe's, step for
step. On the repaired protocol the search explores every reachable state of
these three sessions and finds none that violates the goal. That is weaker
than a proof: an attack might need four sessions, or a nonce used in two
roles. Real tools close that gap, either by searching much larger bounded
spaces or, as ProVerif and Tamarin do, by reasoning about an unbounded number
of sessions at once.

## 20.4 The tools and what they proved

*Level: intermediate.*

**ProVerif** (Bruno Blanchet, from 2001) takes a protocol written in the
applied pi calculus, a small language of processes that send and receive on
channels, and translates it into logical rules about what the attacker can
know. It then tries to show that a secret is not derivable or that every
"end" event is preceded by a matching "begin" event. It handles an unbounded
number of sessions and is fully automatic, at the price that it may fail to
terminate or report a false attack. In ProVerif's language, the core of the
Needham-Schroeder responder and the authentication query look like this
(abridged):

```text
let responder(skB: skey) =
  in(c, m1: bitstring);
  let (na: nonce, a: host) = adec(m1, skB) in
  new nb: nonce;
  out(c, aenc((na, nb), pkey(a)));            (* NSL adds B's name here *)
  in(c, m3: bitstring);
  if adec(m3, skB) = nb then
  event endB(a, hostB, na, nb).

query a: host, na: nonce, nb: nonce;
  event(endB(a, hostB, na, nb)) ==> event(beginA(a, hostB, na, nb)).
```

The query says: whenever B ends a run with A, A began that same run with B.
For the original protocol ProVerif reports the query false and prints Lowe's
trace; for the repaired one it proves it.

**Tamarin** (Simon Meier, Benedikt Schmidt, Cas Cremers and David Basin,
2012) describes a protocol as multiset rewriting rules and properties in
first-order logic over traces. It can run automatically or interactively,
where a person guides the proof, which lets it handle protocols with loops,
global state and Diffie-Hellman exponentiation that defeat fully automatic
tools.

**CryptoVerif** (Blanchet) works in the computational model: it produces
game-based proofs as sequences of games, each step justified by an
assumption about a primitive. **EasyCrypt** does the same with more human
guidance. Their proofs give concrete bounds on an attacker's advantage, not
just "no attack exists in the model".

The record of these tools is now long:

| Protocol | Analysis | What it found or proved |
| --- | --- | --- |
| TLS 1.3 drafts | Cremers, Horvat, Scott, van der Merwe, Tamarin, 2016 | an attack on draft 10 combining resumption with delayed client authentication, fixed before the RFC |
| TLS 1.3 | Bhargavan, Blanchet, Kobeissi, ProVerif and CryptoVerif, 2017 | proofs for a late draft's handshake, with the weaker guarantees of 0-RTT spelled out |
| TLS 1.2 | Bhargavan et al. (miTLS), 2014 | the triple handshake attack on renegotiation and resumption |
| Signal | Cohn-Gordon, Cremers, Dowling, Garratt, Stebila, 2017 | a computational proof of the key secrecy of Signal's key agreement and ratchet |
| WireGuard | Donenfeld and Milner, Tamarin, 2018; Lipp, Blanchet, Bhargavan, CryptoVerif, 2019 | proofs of the handshake as used |
| 5G AKA | Basin et al., Tamarin, 2018 | properties the standard needed but did not state, and weaknesses where they were missing |
| EMV payment cards | Basin, Sasse, Toro-Pozo, Tamarin, 2021 | a PIN bypass for Visa contactless cards, demonstrated on real terminals |
| e-passports | Arapinis, Chothia, Ritter, Ryan, applied pi calculus, 2010 | a formal account of the traceability attack Chothia and Smirnov found that year: French passports gave themselves away by their error messages |

Two shifts followed. Standards bodies started asking for analysis *before*
publication: TLS 1.3 was the first big IETF protocol designed with academic
analysts in the loop, and MLS ([Chapter 17](17-Group-Messaging-MLS.md)) went
the same way. And verification moved from models to code. Project Everest
produced **HACL\***, verified C code for Curve25519, ChaCha20-Poly1305 and
SHA-2, used in Firefox's NSS library; **fiat-crypto** generates elliptic-curve
field arithmetic together with a proof that it is correct, and that code runs
in BoringSSL (and so in Chrome) and in the Linux kernel; and OpenSSH's ML-KEM
is extracted from **libcrux**, a formally verified library. Verified code
removes a whole class of bugs (carry errors, overflows, wrong reductions) that
tests catch only by luck.

### What the big analyses found

**TLS 1.3: analysis as part of design.** The IETF published draft after draft
from 2014 to 2018 and invited analysts to break them. In 2016 Cas Cremers,
Marko Horvat, Sam Scott and Thyla van der Merwe modeled draft 10 in Tamarin,
with resumption and a client that authenticates later with a certificate.
Tamarin found a run in which an attacker impersonates an honest client: the
client's late signature covered a handshake hash of nonces and other values
copyable from another run. Draft 11 made the signed context include the
Finished messages. In February 2017, modeling draft 18, Cremers reported that
post-handshake client authentication gives the client weaker guarantees: the
server never confirms that it processed the client's certificate. Benjamin
Dowling, Marc Fischlin, Felix Günther and Douglas Stebila meanwhile proved
draft after draft in the computational model, up to their 2021 journal
version. The flaws were found in drafts, which is the point.

**Signal: writing down what was meant.** Signal was deployed for years before
its specifications appeared in 2016. When Katriel Cohn-Gordon, Cremers,
Dowling, Luke Garratt and Stebila proved it secure (2017), the first job was
to say what "secure" means when keys change with every message, building on
the post-compromise security that Cohn-Gordon, Cremers and Garratt had
defined in 2016. PQXDH was analyzed with ProVerif and CryptoVerif *before*
release, and the weaknesses found went into the published revision
([Chapter 16](16-Signal-and-the-Double-Ratchet.md)). MLS went further, with
analysts on every draft; most of what they found concerned members of the
group misbehaving ([Chapter 17](17-Group-Messaging-MLS.md)).

**5G AKA: the assumptions nobody wrote down.** In 2018 David Basin, Jannik
Dreier, Lucca Hirschi, Saša Radomirović, Ralf Sasse and Vincent Stettler
built the first full Tamarin model of 5G's authentication and key agreement.
Several of the standard's security goals held only under assumptions it did
not state, and subscribers could be traced; the industry body GSMA recorded
the report as CVD-2018-0012. In 2019 Cremers and Martin Dehnel-Wild modeled
every party, including the channels between the operator's servers, and
found that an operator could implement the standard "correctly" and still
leave a race condition in which one subscriber's session is confused with
another's. Their fixes make the session binding explicit.

The findings fall into three groups: logic flaws in drafts (TLS 1.3 draft 10,
PQXDH's first draft); assumptions that lived only in designers' heads (5G,
the PSK uses that Selfie broke); and properties nobody asked for until an
analyst had to write the goal down (post-compromise security, MLS's
insiders). Only the first is a bug in the usual sense; the other two are what
a standard gains just by being written down formally.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Timeline from 1975 to 2025: Needham-Schroeder 1978, Denning-Sacco 1981, Dolev-Yao 1983, Otway-Rees 1987, BAN logic 1989, Bellare-Rogaway 1993, Lowe with FDR 1995, ProVerif 2001, Tamarin 2012, TLS 1.3 draft attack 2016, 5G AKA analyzed 2018, PQXDH analyzed 2024" fill="currentColor" font-size="11">
<line x1="30" y1="115" x2="615" y2="115" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="132" text-anchor="middle" font-size="10" fill-opacity=".7">1975</text>
<text x="146" y="132" text-anchor="middle" font-size="10" fill-opacity=".7">1985</text>
<text x="262" y="132" text-anchor="middle" font-size="10" fill-opacity=".7">1995</text>
<text x="378" y="132" text-anchor="middle" font-size="10" fill-opacity=".7">2005</text>
<text x="494" y="132" text-anchor="middle" font-size="10" fill-opacity=".7">2015</text>
<text x="610" y="132" text-anchor="middle" font-size="10" fill-opacity=".7">2025</text>
<g stroke="currentColor" stroke-opacity=".6">
<line x1="65" y1="48" x2="65" y2="115"/><line x1="100" y1="115" x2="100" y2="146"/><line x1="123" y1="88" x2="123" y2="115"/>
<line x1="169" y1="115" x2="169" y2="186"/><line x1="192" y1="48" x2="192" y2="115"/><line x1="239" y1="115" x2="239" y2="146"/>
<line x1="262" y1="88" x2="262" y2="115"/><line x1="332" y1="115" x2="332" y2="186"/><line x1="459" y1="48" x2="459" y2="115"/>
<line x1="506" y1="115" x2="506" y2="146"/><line x1="529" y1="88" x2="529" y2="115"/><line x1="598" y1="115" x2="598" y2="186"/>
</g>
<g fill-opacity=".9">
<circle cx="65" cy="115" r="3.5"/><circle cx="100" cy="115" r="3.5"/><circle cx="123" cy="115" r="3.5"/><circle cx="169" cy="115" r="3.5"/>
<circle cx="192" cy="115" r="3.5"/><circle cx="239" cy="115" r="3.5"/><circle cx="262" cy="115" r="3.5"/><circle cx="332" cy="115" r="3.5"/>
<circle cx="459" cy="115" r="3.5"/><circle cx="506" cy="115" r="3.5"/><circle cx="529" cy="115" r="3.5"/><circle cx="598" cy="115" r="3.5"/>
</g>
<text x="65" y="26" text-anchor="middle" font-weight="bold">1978</text><text x="65" y="40" text-anchor="middle">Needham-Schroeder</text>
<text x="192" y="26" text-anchor="middle" font-weight="bold">1989</text><text x="192" y="40" text-anchor="middle">BAN logic</text>
<text x="459" y="26" text-anchor="middle" font-weight="bold">2012</text><text x="459" y="40" text-anchor="middle">Tamarin</text>
<text x="123" y="66" text-anchor="middle" font-weight="bold">1983</text><text x="123" y="80" text-anchor="middle">Dolev-Yao</text>
<text x="262" y="66" text-anchor="middle" font-weight="bold">1995</text><text x="262" y="80" text-anchor="middle">Lowe, with FDR</text>
<text x="529" y="66" text-anchor="middle" font-weight="bold">2018</text><text x="529" y="80" text-anchor="middle">5G AKA analyzed</text>
<text x="100" y="160" text-anchor="middle" font-weight="bold">1981</text><text x="100" y="174" text-anchor="middle">Denning-Sacco</text>
<text x="239" y="160" text-anchor="middle" font-weight="bold">1993</text><text x="239" y="174" text-anchor="middle">Bellare-Rogaway</text>
<text x="506" y="160" text-anchor="middle" font-weight="bold">2016</text><text x="506" y="174" text-anchor="middle">TLS 1.3 draft attack</text>
<text x="169" y="200" text-anchor="middle" font-weight="bold">1987</text><text x="169" y="214" text-anchor="middle">Otway-Rees</text>
<text x="332" y="200" text-anchor="middle" font-weight="bold">2001</text><text x="332" y="214" text-anchor="middle">ProVerif</text>
<text x="636" y="200" text-anchor="end" font-weight="bold">2024</text><text x="636" y="214" text-anchor="end">PQXDH analyzed</text>
</svg>
<figcaption>Figure 20.2. Forty-six years of protocols, attacks and tools. The first two decades are protocols and paper analyses; since about 2012 the tools have been used on standards while they are still drafts.</figcaption>
</figure>

## 20.5 Where proofs stop

*Level: intermediate.*

A proof says that a *model* has a *property*. Each word is a place to slip.

**The model can be wrong.** The symbolic model has no bits, so it cannot see
padding oracles, timing leaks or a 512-bit group. A computational proof may
assume a primitive the implementation does not provide, or a field the
encoding does not enforce.

**The property can be the wrong one.** TLS 1.3's pre-shared key mode was
analyzed under the assumption that a PSK is shared by exactly two parties.
In 2019 Nir Drucker and Shay Gueron described **Selfie**: when a group of
servers shares one external PSK (a common setup), an attacker can reflect a
client's own message back to it, so the client believes it is talking to
another server while it talks to itself. The proofs were correct; the
deployment did not match their assumption. The fix was to state the
assumption and to bind identities into PSK use.

**The code is not the model.** The 2015 SMACK study found that many TLS
libraries accepted messages out of order, letting attackers skip key
exchange or authentication entirely. The protocol had proofs; the state
machines in the code did not follow them. Parsers are the same: X.509 and
ASN.1 decoding bugs ([Chapter 2](02-Certificates-and-PKI.md)) live entirely
outside any protocol model.

**The world is not the model.** Keys are generated badly, configurations
leave old options on, and people click through warnings. These are the
failures of rule 10.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Five boxes in a row, standard, model, proof, code and deployment, each with a note of what can slip through at that stage; the tools ProVerif, Tamarin, CryptoVerif and EasyCrypt cover model and proof, verified libraries cover code" fill="currentColor" font-size="12">
<text x="256" y="24" text-anchor="middle" font-size="11" class="acc-fill">ProVerif, Tamarin, CryptoVerif, EasyCrypt</text>
<line x1="134" y1="32" x2="378" y2="32" stroke="currentColor" class="acc"/>
<text x="445" y="24" text-anchor="middle" font-size="11" class="acc-fill">HACL*, fiat-crypto, libcrux</text>
<line x1="386" y1="32" x2="504" y2="32" stroke="currentColor" class="acc"/>
<rect x="8" y="44" width="118" height="44" rx="6" class="soft" stroke="currentColor"/><text x="67" y="71" text-anchor="middle">standard</text>
<rect x="134" y="44" width="118" height="44" rx="6" class="soft-acc" stroke="currentColor"/><text x="193" y="71" text-anchor="middle">model</text>
<rect x="260" y="44" width="118" height="44" rx="6" class="soft-acc" stroke="currentColor"/><text x="319" y="71" text-anchor="middle">proof</text>
<rect x="386" y="44" width="118" height="44" rx="6" class="soft-acc" stroke="currentColor"/><text x="445" y="71" text-anchor="middle">code</text>
<rect x="512" y="44" width="118" height="44" rx="6" class="soft" stroke="currentColor"/><text x="571" y="71" text-anchor="middle">deployment</text>
<text x="67" y="112" text-anchor="middle" font-size="11">slips: prose</text><text x="67" y="128" text-anchor="middle" font-size="11">ambiguity</text>
<text x="193" y="112" text-anchor="middle" font-size="11">slips: attacker</text><text x="193" y="128" text-anchor="middle" font-size="11">powers left out</text>
<text x="319" y="112" text-anchor="middle" font-size="11">slips: the property</text><text x="319" y="128" text-anchor="middle" font-size="11">nobody asked for</text>
<text x="445" y="112" text-anchor="middle" font-size="11">slips: parsers, state</text><text x="445" y="128" text-anchor="middle" font-size="11">machines, timing</text>
<text x="571" y="112" text-anchor="middle" font-size="11">slips: settings,</text><text x="571" y="128" text-anchor="middle" font-size="11">keys, people</text>
<text x="67" y="152" text-anchor="middle" font-size="10.5" opacity="0.8">TLS renegotiation</text>
<text x="193" y="152" text-anchor="middle" font-size="10.5" opacity="0.8">Lowe, 1995</text>
<text x="319" y="152" text-anchor="middle" font-size="10.5" opacity="0.8">Selfie, 2019</text>
<text x="445" y="152" text-anchor="middle" font-size="10.5" opacity="0.8">SMACK, 2015</text>
<text x="571" y="152" text-anchor="middle" font-size="10.5" opacity="0.8">Logjam, 2015</text>
<text x="320" y="186" text-anchor="middle" font-size="12">A proof covers the shaded middle; attacks live in every gap.</text>
</svg>
<figcaption>Figure 20.3. From standard to deployment. Each stage can lose what the one before it promised, and each has a famous example in this book.</figcaption>
</figure>

None of this makes proofs less valuable. It says where to spend the remaining
effort: on stating assumptions in the standard itself, on implementations
generated from or checked against the model, and on removing options so that
the deployed protocol is the one that was proved.

## 20.6 Post-quantum lessons for protocol design

*Level: intermediate.*

The story of the migration, which systems moved when and to which hybrid,
belongs to the Post-quantum book's
[Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md). What matters
here is how the new algorithms change the *shape* of protocols. Five lessons
stand out.

**A KEM is not Diffie-Hellman.** Diffie-Hellman is symmetric and
non-interactive: if A and B have published public keys, each can compute a
shared secret with no message at all. Many protocols lean on this. Signal's
X3DH ([Chapter 16](16-Signal-and-the-Double-Ratchet.md)) mixes three or four
DH results between long-term and one-time keys; Noise and WireGuard
([Chapter 8](08-WireGuard-and-Noise.md)) authenticate by DH with static keys.
A KEM is a one-way operation: only the side holding the decapsulation key can
recover the secret, and someone must send a ciphertext. Replacing DH with a
KEM therefore changes message flows, and authentication by static DH must
become either a signature or a second KEM run in the other direction. Signal's
PQXDH keeps X3DH and adds one KEM; post-quantum WireGuard designs (the 2021
PQ-WireGuard paper, and Rosenpass) add KEM exchanges alongside the classical
handshake; KEMTLS proposes authenticating TLS servers with a KEM instead of a
signature.

**Everything gets bigger.** An X25519 key share is 32 bytes. ML-KEM-768's
encapsulation key is 1,184 bytes and its ciphertext 1,088, so TLS's hybrid
`X25519MLKEM768` sends 1,216 bytes from the client and 1,120 back. ML-DSA-44
signatures are 2,420 bytes with 1,312-byte public keys, against 64 and 32 for
Ed25519, and a certificate chain carries several of each. A client hello that
used to fit in one packet now needs two, and some servers and middleboxes
turned out to mishandle a hello split across packets. Protocols with hard size
limits (DNSSEC answers over UDP, IKEv2's first exchange, radio links) need
fragmentation or new message flows: IKEv2's `IKE_INTERMEDIATE` exchange
(RFC 9242) exists so that large key exchanges can follow the first, small one.

**Combine, and combine carefully.** Almost every deployment uses a hybrid,
classical plus post-quantum, so that the result is safe if either holds. The
combiner must hash both secrets together with enough context (the
ciphertexts and public keys) that neither component can be swapped. X-Wing
and the TLS hybrid are worked through in the Post-quantum book.

**Secrecy first, authentication later.** An attacker who records traffic now
can decrypt it once a quantum computer exists ("harvest now, decrypt later"),
so key exchange had to move first. Authentication cannot be attacked
retroactively: a forged signature is only useful while the connection is
open. That is why key exchange went post-quantum years before certificates.

**Agility is a design requirement, not an option list.** Rule 7 says fewer
options, and the migration says algorithms must be replaceable. The two are
reconciled by versioning: a protocol names a whole suite with one identifier,
negotiates that identifier under transcript binding (rule 2), and removes old
suites on a schedule. WireGuard, with no negotiation, needs a new version for
a new algorithm, which is the honest form of the same idea.

## 20.7 Delay-tolerant networking and BPSec

*Level: intermediate.*

Every protocol in Parts I to III assumed a round trip measured in
milliseconds. Between Earth and Mars the one-way light time is 3 to 22
minutes, and there is no path at all for days around solar conjunction, or
whenever an orbiter relaying for a rover is below the horizon. TCP's
handshake, TLS's two messages each way, an OCSP query, a Kerberos ticket
request: all assume the other end answers soon. Over a link like this they
time out, or take an hour to set up a channel that is then idle until the
next pass.

**Delay-tolerant networking** (DTN) replaces the conversation with the
letter. Its **Bundle Protocol**, version 7 (RFC 9171, 2022), carries
**bundles**: self-contained messages with a primary block (source,
destination, creation time, lifetime) and a payload block, plus optional
extension blocks. Each node **stores** a bundle until a contact with the next
node opens, then **forwards** it; a node may take **custody**, promising to
keep retransmitting it. A bundle from a ground station may wait hours in a
relay orbiter before the lander comes over the horizon. NASA has used DTN on
the International Space Station since the mid-2010s, and it is planned as the
network layer for lunar communications.

Security therefore cannot be a channel set up end to end; it has to travel
inside the bundle, exactly like OpenPGP mail
([Chapter 15](15-Email-OpenPGP-and-SMIME.md)) or an age file
([Chapter 18](18-Encrypting-Files-and-Disks.md)). **BPSec** (RFC 9172) adds
two kinds of extension block:

- a **Block Integrity Block** (BIB) carries a MAC or signature over one or
  more target blocks;
- a **Block Confidentiality Block** (BCB) encrypts its target blocks in
  place and carries the authentication tag and parameters.

The algorithms are not fixed by BPSec; a **security context** names them. RFC
9173 defines the two default contexts: BIB-HMAC-SHA2 and BCB-AES-GCM, the
latter optionally carrying its content key wrapped under a key-encryption key
with AES key wrap (RFC 3394). Both can add **scope flags** that pull in the
primary block and block headers, so that a protected payload cannot be cut
out and pasted into another bundle (rule 1, in DTN form).

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="A bundle travels from an Earth ground station to a relay orbiter, where it waits for the next contact, and then to a lander; below, the bundle's blocks: primary block, block confidentiality block naming the payload as its target, and the encrypted payload" fill="currentColor" font-size="12">
<rect x="20" y="30" width="140" height="50" rx="6" class="soft" stroke="currentColor"/><text x="90" y="52" text-anchor="middle" font-weight="bold">Earth station</text><text x="90" y="70" text-anchor="middle" font-size="11">ipn:2.1</text>
<rect x="250" y="30" width="140" height="50" rx="6" class="soft-acc" stroke="currentColor"/><text x="320" y="52" text-anchor="middle" font-weight="bold">relay orbiter</text><text x="320" y="70" text-anchor="middle" font-size="11">stores, then forwards</text>
<rect x="480" y="30" width="140" height="50" rx="6" class="soft" stroke="currentColor"/><text x="550" y="52" text-anchor="middle" font-weight="bold">lander</text><text x="550" y="70" text-anchor="middle" font-size="11">ipn:1.2</text>
<line x1="160" y1="55" x2="240" y2="55" stroke="currentColor" stroke-width="1.5"/><polygon points="248,55 236,50 236,60"/>
<text x="205" y="100" text-anchor="middle" font-size="11">3 to 22 min</text><text x="205" y="114" text-anchor="middle" font-size="11">light time</text>
<line x1="390" y1="55" x2="470" y2="55" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/><polygon points="478,55 466,50 466,60"/>
<text x="435" y="100" text-anchor="middle" font-size="11">next contact:</text><text x="435" y="114" text-anchor="middle" font-size="11">maybe hours later</text>
<rect x="60" y="146" width="150" height="40" rx="4" class="soft" stroke="currentColor"/><text x="135" y="164" text-anchor="middle" font-size="11.5">primary block</text><text x="135" y="179" text-anchor="middle" font-size="10.5">source, dest., time</text>
<rect x="216" y="146" width="190" height="40" rx="4" class="soft-acc" stroke="currentColor"/><text x="311" y="164" text-anchor="middle" font-size="11.5">BCB, block 2</text><text x="311" y="179" text-anchor="middle" font-size="10.5">target 1 · IV · wrapped key · tag</text>
<rect x="412" y="146" width="168" height="40" rx="4" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/><text x="496" y="164" text-anchor="middle" font-size="11.5">payload, block 1</text><text x="496" y="179" text-anchor="middle" font-size="10.5">AES-GCM ciphertext</text>
<text x="320" y="226" text-anchor="middle" font-size="12">Security travels inside the bundle: no handshake, no round trip.</text>
</svg>
<figcaption>Figure 20.4. A bundle on its way to Mars, laid out as in RFC 9173's second example. Every hop may hold it for hours; the BCB lets only the destination read the payload, and lets it detect any change.</figcaption>
</figure>

### Code it: BPSec, checked against RFC 9173

RFC 9173's appendix gives complete examples, down to the bytes of the final
bundle. The program below builds them from scratch: just enough CBOR (the
binary encoding all bundle fields use) to write integers, byte strings and
arrays; the BIB of Example 1, an HMAC-SHA-512 over the integrity-protected
plaintext (the scope flags, then the payload as a CBOR byte string); and the
BCB of Example 2, which wraps a 128-bit content key with AES key wrap and
encrypts the payload with AES-128-GCM, the AAD being only the scope flags.
GCM is written out: counter mode for the ciphertext, then GHASH, a polynomial
evaluated in $\mathrm{GF}(2^{128})$, for the tag.

```python
# BPSec's default security contexts (RFC 9173), checked against the RFC's
# Appendix A: a BIB with HMAC-SHA-512 and a BCB with AES-GCM and AES key wrap.
# AES-128 is the same compact textbook version as in Chapters 15 and 18.
import hashlib, hmac
def xtime(a): return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1
SBOX, p, q = [0] * 256, 1, 1
for _ in range(255):
    p = (p ^ (p << 1) ^ (0x1B if p & 0x80 else 0)) & 0xFF
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xFF
    if q & 0x80: q ^= 0x09
    SBOX[p] = q ^ ((q << 1 | q >> 7) & 0xFF) ^ ((q << 2 | q >> 6) & 0xFF) ^ ((q << 3 | q >> 5) & 0xFF) ^ ((q << 4 | q >> 4) & 0xFF) ^ 0x63
SBOX[0] = 0x63
def expand(key):
    w, rcon = [list(key[i:i + 4]) for i in range(0, 16, 4)], 1
    while len(w) < 44:
        t = w[-1][:]
        if len(w) % 4 == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]; t[0] ^= rcon; rcon = xtime(rcon)
        w.append([a ^ b for a, b in zip(w[-4], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(11)]
def mix(c):
    t = c[0] ^ c[1] ^ c[2] ^ c[3]
    return [c[i] ^ t ^ xtime(c[i] ^ c[(i + 1) % 4]) for i in range(4)]
def aes(key, block):                                     # encryption only: GCM and key wrap need no more
    rk = expand(key)
    s = [a ^ b for a, b in zip(block, rk[0])]
    for r in range(1, 11):
        s = [SBOX[s[(i + 4 * (i % 4)) % 16]] for i in range(16)]
        if r < 10: s = sum((mix(s[c:c + 4]) for c in range(0, 16, 4)), [])
        s = [a ^ b for a, b in zip(s, rk[r])]
    return bytes(s)
h = bytes.fromhex

# Just enough CBOR (RFC 8949): unsigned integers, byte strings, arrays
def head(major, n):
    if n < 24: return bytes([major << 5 | n])
    for ai, size in ((24, 1), (25, 2), (26, 4)):
        if n < 256 ** size: return bytes([major << 5 | ai]) + n.to_bytes(size, "big")
def cbor(x):
    if isinstance(x, int): return head(0, x)
    if isinstance(x, bytes): return head(2, len(x)) + x
    return head(4, len(x)) + b"".join(cbor(i) for i in x)

primary = cbor([7, 0, 0, [2, [1, 2]], [2, [2, 1]], [2, [2, 1]], [0, 40], 1000000])
payload = b"Ready to generate a 32-byte payload"
print("primary block matches A.1.1.1:", primary == h("88070000820282010282028202018202820201820018281a000f4240"))

# Example 1: integrity. IPPT = scope flags, then the target's data, both as CBOR
key = h("1a2b1a2b1a2b1a2b1a2b1a2b1a2b1a2b")
ippt = cbor(0) + cbor(payload)
mac = hmac.new(key, ippt, hashlib.sha512).digest()
asb = cbor([1]) + cbor(1) + cbor(1) + cbor([2, [2, 1]]) + cbor([[1, 7], [3, 0]]) + cbor([[[1, mac]]])
bib = cbor([11, 2, 0, 0, asb])
bundle = b"\x9f" + primary + bib + cbor([1, 1, 0, 0, payload]) + b"\xff"   # indefinite-length array
print("HMAC-SHA-512 matches A.1.3.1:", mac[:8].hex(), mac == h(
    "3bdc69b3a34a2b5d3a8554368bd1e808f606219d2a10a846eae3886ae4ecc83c"
    "4ee550fdfb1cc636b904e2f1a73e303dcd4b6ccece003e95e8164dcc89a156e1"))
final = h("9f88070000820282010282028202018202820201820018281a000f4240850b0200"
          "005856810101018202820201828201078203008181820158403bdc69b3a34a2b5d3a"
          "8554368bd1e808f606219d2a10a846eae3886ae4ecc83c4ee550fdfb1cc636b904e2"
          "f1a73e303dcd4b6ccece003e95e8164dcc89a156e185010100005823526561647920"
          "746f2067656e657261746520612033322d62797465207061796c6f6164ff")
print("whole bundle matches A.1.4:", bundle == final, f"({len(bundle)} bytes)")

# Example 2: confidentiality. AES key wrap (RFC 3394) carries the content key
def wrap(kek, k):
    a, r = b"\xa6" * 8, [k[i:i + 8] for i in range(0, len(k), 8)]
    for j in range(6):
        for i in range(len(r)):
            b = aes(kek, a + r[i])
            t = len(r) * j + i + 1
            a, r[i] = (int.from_bytes(b[:8], "big") ^ t).to_bytes(8, "big"), b[8:]
    return a + b"".join(r)
cek, kek, iv = h("71776572747975696f70617364666768"), h("6162636465666768696a6b6c6d6e6f70"), h("5477656c7665313231323132")
print("AES key wrap matches A.2.3.1:", wrap(kek, cek) == h("69c411276fecddc4780df42c8a2af89296fabf34d7fae700"))

def gmul(x, y):                                          # multiply in GF(2^128), GCM's bit order
    z, R = 0, 0xE1 << 120
    for i in range(127, -1, -1):
        if y >> i & 1: z ^= x
        x = (x >> 1) ^ R if x & 1 else x >> 1
    return z
def gcm(key, iv, pt, aad):
    H = int.from_bytes(aes(key, bytes(16)), "big")
    j0 = iv + b"\x00\x00\x00\x01"
    ct = b""
    for i in range(0, len(pt), 16):
        ctr = j0[:12] + (2 + i // 16).to_bytes(4, "big")
        ct += bytes(a ^ b for a, b in zip(pt[i:i + 16], aes(key, ctr)))
    pad = lambda b: b + bytes(-len(b) % 16)
    data = pad(aad) + pad(ct) + (8 * len(aad)).to_bytes(8, "big") + (8 * len(ct)).to_bytes(8, "big")
    g = 0
    for i in range(0, len(data), 16): g = gmul(g ^ int.from_bytes(data[i:i + 16], "big"), H)
    tag = bytes(a ^ b for a, b in zip(g.to_bytes(16, "big"), aes(key, j0)))
    return ct, tag
ct, tag = gcm(cek, iv, payload, aad=cbor(0))            # AAD = the scope flags alone
print("ciphertext matches A.2.3.1:", ct == h("3a09c1e63fe23a7f66a59c7303837241e070b02619fc59c5214a22f08cd70795e73e9a"))
print("tag matches A.2.3.1:", tag.hex(), tag == h("efa4b5ac0108e3816c5606479801bc04"))

# What the integrity block does and does not protect
moved = cbor(0) + cbor(payload.replace(b"32", b"33"))
print("one changed byte in the payload, MAC still valid:",
      hmac.compare_digest(hmac.new(key, moved, hashlib.sha512).digest(), mac))
print("the same bundle delivered a second time, MAC still valid:",
      hmac.compare_digest(hmac.new(key, ippt, hashlib.sha512).digest(), mac))
```

```text
primary block matches A.1.1.1: True
HMAC-SHA-512 matches A.1.3.1: 3bdc69b3a34a2b5d True
whole bundle matches A.1.4: True (165 bytes)
AES key wrap matches A.2.3.1: True
ciphertext matches A.2.3.1: True
tag matches A.2.3.1: efa4b5ac0108e3816c5606479801bc04 True
one changed byte in the payload, MAC still valid: False
the same bundle delivered a second time, MAC still valid: True
```

Every value matches the RFC, including the 165 bytes of the finished bundle.
The last two lines are the Break it for this section. A changed byte is
caught, but the *same* bundle delivered again verifies perfectly: BPSec
provides integrity and confidentiality, not freshness. Replay protection is
left to policy and to the application, and on a network built on
retransmission and custody, duplicates are normal traffic. A rover that
accepts "drive 10 meters" twice drives 20.

### Fix it

The fixes are the rules again. The command itself must carry a sequence
number or a validity window, inside the protected payload, and the receiver
must keep the highest number it has accepted (rule 5). Security policy must
say which blocks *must* be present, because a relay that strips a BIB leaves
a valid unprotected bundle behind (rule 2, applied to blocks). Integrity scope
flags should cover the primary block, so a protected payload cannot be moved
into a bundle with a different destination or lifetime (rule 1). And every
key needs a purpose and an expiry, because revocation by round trip is not
available (rules 4 and 8).

## 20.8 A second target: Otway-Rees and the type flaw

*Level: intermediate.*

Lowe's attack lives in the logic of who says what to whom. A second family
lives lower down, in how a receiver *parses* bytes, and the checker of §20.3
cannot see it because every field there is a neat symbol of a known kind.

The target is a protocol from 1987 by Dave Otway and Owen Rees, of the same
family as Kerberos ([Chapter 12](12-Kerberos.md)): a trusted server S shares a
long-term key with each user ($K_{AS}$ with A, $K_{BS}$ with B) and hands out
a fresh session key $K_{AB}$. Its selling point was that both users get
assurance of freshness from their own nonces, without clocks. $M$ is a run
identifier, sent in the clear:

$$
\begin{aligned}
&1.\quad A \to B:\ M, A, B, \{N_A, M, A, B\}_{K_{AS}}\\
&2.\quad B \to S:\ M, A, B, \{N_A, M, A, B\}_{K_{AS}}, \{N_B, M, A, B\}_{K_{BS}}\\
&3.\quad S \to B:\ M, \{N_A, K_{AB}\}_{K_{AS}}, \{N_B, K_{AB}\}_{K_{BS}}\\
&4.\quad B \to A:\ M, \{N_A, K_{AB}\}_{K_{AS}}
\end{aligned}
$$

S checks that both ciphertexts name the same run and users, and returns the
session key under each user's key, next to that user's nonce. B forwards A's
half. Each user accepts the key that comes back next to its own nonce.

### A worked example by hand: the bytes

Say the run identifier $M$ is 8 bytes, a name is a 4-byte number, and nonces
and session keys are 16 bytes (AES-128).
Take $M$ = `5f3a9c1e07d2b468`, A = `0000000a`, B = `0000000b`. The plaintext
inside A's ciphertext in message 1 is

$$
\underbrace{N_A}_{16} \,\|\, \underbrace{\texttt{5f3a9c1e07d2b468}}_{8}
\,\|\, \underbrace{\texttt{0000000a}}_{4} \,\|\, \underbrace{\texttt{0000000b}}_{4}
\quad = 32 \text{ bytes},
$$

and A expects message 4's plaintext to be $N_A$ and a 16-byte key: also 32
bytes. The attacker intercepts message 1 and sends back $M$ and A's own
ciphertext as message 4. A decrypts it, finds $N_A$ in the first 16 bytes,
and takes the other 16 as the session key:

$$
K_{AB} = \texttt{5f3a9c1e07d2b468\,0000000a\,0000000b}.
$$

Every byte of that "key" crossed the network in the clear, and even a length
check passes, since $8 + 4 + 4 = 16$. This is a **type flaw**: fields of one
type (a run identifier and two names) accepted as another (a key). John Clark and Jeremy Jacob's 1997 survey of authentication
protocols lists it; a second version works the same way against B.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Top: A sends message 1 to B, intercepted by the attacker I, who returns M and A's own ciphertext to A as message 4. Bottom: two 32-byte bars aligned; message 1's plaintext is Na, M, A, B with sizes 16, 8, 4, 4; message 4's expected plaintext is Na, K with sizes 16, 16; the bytes M, A, B fall exactly where A expects K." fill="currentColor" font-size="12">
<text x="90" y="22" text-anchor="middle" font-weight="bold">A</text>
<text x="550" y="22" text-anchor="middle" font-weight="bold">I, posing as B</text>
<line x1="90" y1="30" x2="90" y2="112" stroke="currentColor" stroke-opacity=".5"/>
<line x1="550" y1="30" x2="550" y2="112" stroke="currentColor" stroke-opacity=".5"/>
<line x1="90" y1="54" x2="538" y2="54" stroke="currentColor" stroke-width="1.5"/><polygon points="548,54 536,49 536,59"/>
<text x="320" y="47" text-anchor="middle" font-size="11.5">1. M, A, B, {Na, M, A, B}Kas</text>
<line x1="550" y1="94" x2="102" y2="94" stroke="currentColor" stroke-width="1.5"/><polygon points="92,94 104,89 104,99"/>
<text x="320" y="87" text-anchor="middle" font-size="11.5">"4." M, {Na, M, A, B}Kas: A's own ciphertext, sent back</text>
<text x="20" y="152" font-size="11.5">sent in 1:</text>
<rect x="110" y="136" width="240" height="24" fill="currentColor" fill-opacity=".12" stroke="currentColor"/><text x="230" y="153" text-anchor="middle">Na (16 bytes)</text>
<rect x="350" y="136" width="120" height="24" fill="currentColor" fill-opacity=".3" stroke="currentColor"/><text x="410" y="153" text-anchor="middle">M (8)</text>
<rect x="470" y="136" width="60" height="24" fill="currentColor" fill-opacity=".3" stroke="currentColor"/><text x="500" y="153" text-anchor="middle">A (4)</text>
<rect x="530" y="136" width="60" height="24" fill="currentColor" fill-opacity=".3" stroke="currentColor"/><text x="560" y="153" text-anchor="middle">B (4)</text>
<text x="20" y="196" font-size="11.5">A reads in 4:</text>
<rect x="110" y="180" width="240" height="24" fill="currentColor" fill-opacity=".12" stroke="currentColor"/><text x="230" y="197" text-anchor="middle">Na (16 bytes): matches</text>
<rect x="350" y="180" width="240" height="24" fill="none" stroke="currentColor" stroke-width="2"/><text x="470" y="197" text-anchor="middle">K (16 bytes) = M, A, B</text>
<line x1="350" y1="160" x2="350" y2="180" stroke="currentColor" stroke-dasharray="3 3"/><line x1="590" y1="160" x2="590" y2="180" stroke="currentColor" stroke-dasharray="3 3"/>
<text x="320" y="236" text-anchor="middle" font-size="12">Same key, same length, same nonce: the parse succeeds and the "key" is public.</text>
</svg>
<figcaption>Figure 20.5. The type flaw in Otway-Rees. The attacker reflects A's own ciphertext; A finds its nonce where it expects it and reads the next 16 bytes, which are the run identifier and two names, as the session key.</figcaption>
</figure>

### Code it: a checker for untyped messages

The new checker differs from the first in three ways. Messages are nested
pairs, as in Tamarin, so $\{N_A, M, A, B\}$ is the nested term
$\langle N_A, \langle M, \langle A, B \rangle\rangle\rangle$ and a pattern
$\langle N_A, K \rangle$ can match it with $K = \langle M, \langle A, B
\rangle\rangle$. A variable can be **typed** (it only ever holds one atom, a
nonce or a key) or **untyped** (it holds whatever bytes arrive). And the
attacker either composes what it delivers from atoms and ciphertexts it
holds, or replays an old term whole. A, B and S run one session each; the
attacker I is a registered user with its own key $K_{IS}$. For each version
the search runs to the end and reports, for A and for B, the shortest run in
which that user accepts a key for the other that I can derive. It also checks
that an honest run is reachable at all, because a model in which nothing can
happen satisfies every security property.

```python
# A second model checker: Otway-Rees (1987) with a trusted server S. Tuples are
# nested pairs, as in Tamarin: {Na, M, A, B} is <Na, <M, <A, B>>>.
from collections import deque

def tup(*xs): return xs[0] if len(xs) == 1 else ("pair", xs[0], tup(*xs[1:]))
def enc(k, *body): return ("senc", k, tup(*body))
def key(x): return ("key", x)                    # the key that x shares with S
def V(n): return ("var", n)
PUBLIC = ["A", "B", "S", "I", "T1", "T2", "T3"]  # names and tags: everyone knows them
def show(t):
    if isinstance(t, str): return t
    if t[0] == "key": return "K" + t[1].lower() + "s"
    if t[0] == "pair": return show(t[1]) + ", " + show(t[2])
    return "{" + show(t[2]) + "}" + show(t[1])

def roles(tags):
    tg = (lambda n: (n,)) if tags else (lambda n: ())
    M, X, Y, K, a, b, na, nb = (V(n) for n in ("M", "X", "Y", "K", "a", "b", "na", "nb"))
    A = [("send", tup("M", "A", "B", enc(key("A"), *tg("T1"), "Na", "M", "A", "B"))),
         ("recv", tup("M", enc(key("A"), *tg("T3"), "Na", K))), ("end", "B")]
    B = [("recv", tup(M, a, "B", X)),
         ("send", tup(M, a, "B", X, enc(key("B"), *tg("T2"), "Nb", M, a, "B"))),
         ("recv", tup(M, Y, enc(key("B"), *tg("T3"), "Nb", K))),
         ("send", tup(M, Y)), ("end", a)]
    S = [("recv", tup(M, a, b, enc(key(a), *tg("T1"), na, M, a, b), enc(key(b), *tg("T2"), nb, M, a, b))),
         ("send", tup(M, enc(key(a), *tg("T3"), na, "Kab"), enc(key(b), *tg("T3"), nb, "Kab"))), ("end", b)]
    return [("A", A), ("B", B), ("S", S)]

def subst(t, env):
    if isinstance(t, str): return t
    if t[0] == "var": return env.get(t[1], t)
    return (t[0],) + tuple(subst(x, env) for x in t[1:])
def analyse(known):                              # split pairs, open what I's key opens
    known, todo = set(known), list(known)
    while todo:
        t = todo.pop()
        parts = [] if isinstance(t, str) else [t[1], t[2]] if t[0] == "pair" else [t[2]] if t[0] == "senc" and t[1] in known else []
        for p in parts:
            if p not in known: known.add(p); todo.append(p)
    return frozenset(known)
def derivable(t, known):
    if t in known or t in PUBLIC: return True
    if isinstance(t, str) or t[0] in ("key", "var"): return False
    return all(derivable(x, known) for x in t[1:])

def fits(var, t, typed):                         # what may a variable stand for?
    if var in "XY": return True                  # a field the receiver cannot open
    if var in "ab": return t in ("A", "B", "I")  # a user's name, looked up
    return isinstance(t, str) or not typed       # typed: one atom; untyped: any bytes
def match(p, t, env, typed):
    if isinstance(p, str): return env if p == t else None
    if p[0] == "var":
        if p[1] in env: return env if env[p[1]] == t else None
        return {**env, p[1]: t} if fits(p[1], t, typed) else None
    if isinstance(t, str) or t[0] != p[0]: return None
    for x, y in zip(p[1:], t[1:]):
        env = match(x, y, env, typed)
        if env is None: return None
    return env

def deliveries(p, env, known, typed):            # every term I can send that fits p
    p = subst(p, env)
    if isinstance(p, str): return [env] if derivable(p, known) else []
    if p[0] == "var":                            # an atom I know, or a ciphertext I hold
        opaque = p[1] in "XY"
        pool = {t for t in known | set(PUBLIC) if isinstance(t, str) != opaque and (not opaque or t[0] == "senc")}
        return [{**env, p[1]: t} for t in sorted(pool, key=repr) if fits(p[1], t, typed)]
    out = [e for t in sorted(known, key=repr) if not isinstance(t, str) and t[0] == p[0]
           for e in [match(p, t, env, typed)] if e is not None]          # replay an old term
    if p[0] == "pair" or (p[0] == "senc" and derivable(p[1], known)):   # or build a new one
        out += [e2 for e1 in deliveries(p[1], env, known, typed) for e2 in deliveries(p[2], e1, known, typed)]
    return list({frozenset(e.items()): e for e in out}.values())                    # drop repeats

def search(tags, typed):                         # explore every state; keep the first trace to each goal
    threads, found = roles(tags), {}
    queue, seen = deque([((0, 0, 0), ({}, {}, {}), analyse({key("I"), "Ni"}), ())]), set()
    while queue:
        pc, envs, known, trace = queue.popleft()
        sig = (pc, tuple(frozenset(e.items()) for e in envs), known)
        if sig in seen: continue
        seen.add(sig)
        ended = {w: (subst(s[-1][1], envs[i]), envs[i].get("K")) for i, (w, s) in enumerate(threads) if pc[i] == len(s) - 1}
        if ended.get("A") == ("B", "Kab") and ended.get("B") == ("A", "Kab"): found.setdefault("honest", trace)
        for who, (peer, k) in ended.items():
            if who != "S" and peer == {"A": "B", "B": "A"}[who] and derivable(k, known):
                found.setdefault(who, trace + (f"{who} accepts the key ({show(k)}) for {peer}, and I knows it",))
        for i, (who, steps) in enumerate(threads):
            if pc[i] >= len(steps) - 1: continue
            kind, msg = steps[pc[i]]
            for e in [envs[i]] if kind == "send" else deliveries(msg, envs[i], known, typed):
                if "a" in e and e["a"] == e.get("b"): continue           # S never pairs a user with itself
                m = subst(msg, e)
                queue.append((pc[:i] + (pc[i] + 1,) + pc[i + 1:], envs[:i] + (e,) + envs[i + 1:],
                              analyse(known | {m}) if kind == "send" else known,
                              trace + (f"{who} {'sends   ' if kind == 'send' else 'receives'} {show(m)}",)))
    return found, len(seen)

for label, tags, typed in (("untyped", False, False), ("typed", False, True), ("untyped, tagged", True, False)):
    found, n = search(tags, typed)
    print(f"Otway-Rees, {label}: {n} states, honest run possible: {'honest' in found}")
    for who in "AB":
        print(f"  attack on {who}:" if who in found else f"  attack on {who}: none")
        for line in found.get(who, ()):
            print("    ", line)
```

It prints:

```text
Otway-Rees, untyped: 3952 states, honest run possible: True
  attack on A:
     A sends    M, A, B, {Na, M, A, B}Kas
     A receives M, {Na, M, A, B}Kas
     A accepts the key (M, A, B) for B, and I knows it
  attack on B:
     A sends    M, A, B, {Na, M, A, B}Kas
     B receives M, A, B, {Na, M, A, B}Kas
     B sends    M, A, B, {Na, M, A, B}Kas, {Nb, M, A, B}Kbs
     B receives M, {Na, M, A, B}Kas, {Nb, M, A, B}Kbs
     B sends    M, {Na, M, A, B}Kas
     B accepts the key (M, A, B) for A, and I knows it
Otway-Rees, typed: 885 states, honest run possible: True
  attack on A: none
  attack on B: none
Otway-Rees, untyped, tagged: 885 states, honest run possible: True
  attack on A: none
  attack on B: none
```

The untyped search finds both attacks. In the second, B's message 3 is forged
from B's *own* ciphertext and A's, and what B forwards is exactly what A
accepts in the first: both users agree on the "key" $M, A, B$ and the
attacker reads everything. S was never involved.

The typed search finds nothing, and that is the trap. A typed model assumes
the receiver can tell a key from a pair of names, which is true of a Python
object and false of 32 bytes off the wire. The third run shows the cure: one
public constant (`T1`, `T2`, `T3`) at the start of each kind of ciphertext, and the
untyped attacker is left with the same 885 states as the typed one and no
attack. James Heather, Lowe and Steve Schneider proved in 2000 that tagging
each field with its intended type prevents type-flaw attacks in general,
which is why tools may assume types once a protocol is tagged.

### The same model, written for a tool

Tamarin writes $\langle a, b, c\rangle$ as $\langle a, \langle b,
c\rangle\rangle$, as the checker does. A's half and the secrecy goal look
like this; it is a sketch, not run here, since neither Tamarin nor ProVerif
is installed where this book's programs run:

```text
theory OtwayRees_A
begin
builtins: symmetric-encryption

rule Register:                       // each user shares a long-term key with S
    [ Fr(~k) ] --> [ !Ltk($X, ~k) ]

rule A_1:
    [ Fr(~m), Fr(~na), !Ltk($A, kas) ]
  -->
    [ Out(<~m, $A, $B, senc(<~na, ~m, $A, $B>, kas)>), A_wait($A, $B, ~m, ~na, kas) ]

rule A_4:
    [ A_wait($A, $B, m, na, kas), In(<m, senc(<na, k>, kas)>) ]
  --[ AcceptA($A, $B, k) ]->
    [ ]

lemma key_secrecy_A:
  "All a b k #i. AcceptA(a, b, k) @ #i ==> not (Ex #j. K(k) @ #j)"
end
```

Because the variable `k` in rule `A_4` is untyped, Tamarin may unify it with
`<~m, $A, $B>`, and the lemma should fail with the checker's two-message
trace. ProVerif's tuples have a fixed length, so a 4-tuple never matches a
2-tuple, and a ProVerif model sees this attack only if messages are written
as explicit concatenations: the message model is itself a modeling decision
(§20.5).

### Fix it

Rule 1 applies inside a ciphertext too. **Tag** every encrypted or signed
structure: TLS 1.3 signs 64 spaces, a context string such as
`TLS 1.3, server CertificateVerify`, a zero byte and then the transcript hash
(RFC 8446, §4.4.3), so a signature made for one purpose cannot be read as
another. **Encode unambiguously**, with length prefixes or a typed format
such as CBOR or ASN.1 DER. **Separate keys** by purpose (rule 4). And analyze
messages as untyped bytes unless types really travel on the wire.

## 20.9 Proofs by games: the Bellare-Rogaway idea

*Level: advanced.*

A symbolic proof has no probabilities in it, so it cannot say how likely an
attack is, nor see the ballot of §20.2. In 1993 Mihir Bellare and Phillip
Rogaway defined secure key exchange in the computational model as a **game**
between a challenger and an attacker, and nearly every key-exchange proof
since, from TLS 1.3 to Signal and MLS, has that shape.

### The game

The challenger runs many honest parties with many sessions each. The attacker
plays the network through **queries**, and its running time and success
probability are measured:

- **Send**$(P, s, m)$ delivers message $m$ to session $s$ of party $P$ and
  returns whatever $P$ answers. This is the whole network.
- **Reveal**$(P, s)$ hands over the key session $s$ accepted. Keys leak in
  practice, and a good protocol keeps every *other* session's key safe.
- **Corrupt**$(P)$ hands over $P$'s long-term key. Later models (Canetti and
  Krawczyk in 2001, eCK in 2007) also leak session state.
- **Test**$(P, s)$, asked once: the challenger flips a secret bit $b$. If
  $b = 0$ it returns the real session key; if $b = 1$, a random string of the
  same length. The attacker must say which.

The Test session must be **fresh**: the attacker may not have revealed its
key or its **partner's** key, nor corrupted the parties before the session
ended. Partners are the two sessions that are meant to share a key; Bellare
and Rogaway defined them by **matching conversations**, sessions that sent
and received the same messages in order. The attacker's **advantage** is

$$
\mathrm{Adv} = \bigl|\,2 \Pr[\text{attacker guesses } b] - 1\,\bigr|,
$$

0 for blind guessing and 1 for always being right. The protocol is secure if
every efficient attacker's advantage is negligible and partners always accept
the same key. One game covers secrecy, independence of sessions and, through
partnering, much of authentication.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="The attacker on the left sends four kinds of query to the challenger on the right: Send, Reveal, Corrupt and Test. The challenger runs honest sessions; for Test it flips a bit b and returns either the real key or a random string. The attacker outputs a guess for b." fill="currentColor" font-size="12">
<rect x="20" y="40" width="150" height="150" rx="8" fill="currentColor" fill-opacity=".12" stroke="currentColor"/>
<text x="95" y="66" text-anchor="middle" font-weight="bold">attacker</text>
<text x="95" y="86" text-anchor="middle" font-size="11">is the network,</text>
<text x="95" y="101" text-anchor="middle" font-size="11">may be a user,</text>
<text x="95" y="116" text-anchor="middle" font-size="11">runs in bounded time</text>
<text x="95" y="172" text-anchor="middle" font-weight="bold">outputs guess b′</text>
<rect x="420" y="40" width="200" height="150" rx="8" fill="none" stroke="currentColor"/>
<text x="520" y="66" text-anchor="middle" font-weight="bold">challenger</text>
<rect x="436" y="80" width="78" height="28" rx="4" fill="none" stroke="currentColor"/><text x="475" y="99" text-anchor="middle" font-size="11">A, session 1</text>
<rect x="526" y="80" width="78" height="28" rx="4" fill="none" stroke="currentColor"/><text x="565" y="99" text-anchor="middle" font-size="11">B, session 1</text>
<rect x="436" y="114" width="78" height="28" rx="4" fill="none" stroke="currentColor"/><text x="475" y="133" text-anchor="middle" font-size="11">A, session 2</text>
<rect x="526" y="114" width="78" height="28" rx="4" fill="none" stroke="currentColor"/><text x="565" y="133" text-anchor="middle" font-size="11">C, session 1</text>
<text x="520" y="168" text-anchor="middle" font-size="11">secret bit b; Test returns</text>
<text x="520" y="182" text-anchor="middle" font-size="11">real key (b = 0) or random (b = 1)</text>
<g stroke="currentColor" stroke-width="1.5">
<line x1="170" y1="62" x2="410" y2="62"/><line x1="170" y1="98" x2="410" y2="98"/><line x1="170" y1="134" x2="410" y2="134"/><line x1="170" y1="170" x2="410" y2="170"/>
</g>
<polygon points="418,62 406,57 406,67"/><polygon points="418,98 406,93 406,103"/><polygon points="418,134 406,129 406,139"/><polygon points="418,170 406,165 406,175"/>
<text x="290" y="56" text-anchor="middle">Send(P, s, m): the network</text>
<text x="290" y="92" text-anchor="middle">Reveal(P, s): a session key leaks</text>
<text x="290" y="128" text-anchor="middle">Corrupt(P): a long-term key leaks</text>
<text x="290" y="164" text-anchor="middle">Test(P, s): once, on a fresh session</text>
<text x="320" y="222" text-anchor="middle">Advantage = |2 Pr[b′ = b] − 1|; secure means negligible for every efficient attacker.</text>
</svg>
<figcaption>Figure 20.6. The Bellare-Rogaway game. Every attack in this book is a strategy for the attacker on the left; the definition asks that none does much better than a coin.</figcaption>
</figure>

### A worked example by hand: misbinding wins the game

[Chapter 1](01-What-a-Protocol-Must-Do.md#17-authenticated-key-exchange-signing-it-right)
showed identity misbinding on naive signed Diffie-Hellman: Eve replaces
Alice's name and signature in the last message with her own, so Bob's session
believes its peer is Eve, Alice's believes its peer is Bob, and both hold the
same key. Eve never learns it. Is that an attack? The game answers:

1. Eve uses **Send** to run the protocol, rewriting message 3 as above.
   Alice's session accepts key $k$ with peer Bob; Bob's session accepts the
   same $k$ with peer Eve.
2. The two sessions are not partners: message 3 differs, and they disagree
   about who is talking. So Bob's session may be revealed.
3. Eve asks **Reveal** on Bob's session and gets $k$.
4. Eve asks **Test** on Alice's session and compares the answer with $k$:
   equal means $b = 0$, different means $b = 1$.

She is right every time, except when a random 128-bit string happens to equal
$k$, with probability $2^{-128}$. So $\Pr[\text{win}] = 1 - 2^{-129}$ and
the advantage is $1 - 2^{-128}$. The game turns "two sessions disagree about
who holds the key" into "the key is not secret", which is what misbinding
means in practice: Bob credits Eve with whatever Alice sends.

Putting the names into the key derivation, $k = H(g^{xy}, g^x, g^y,
\text{initiator}, \text{responder})$, removes the win: Alice derives the key
for (Alice, Bob), Bob for (Eve, Bob), and Eve is back to guessing. SIGMA gets the same
effect with a MAC of the name under the new key.

```python
# The Bellare-Rogaway game against identity misbinding: Eve Reveals Bob's
# session key, then asks Test on Alice's. Real or random?
import hashlib, random
P, G = 2**127 - 1, 3                             # a toy group: fine for a game
rng = random.Random(2026)
def kdf(*parts): return hashlib.sha256(repr(parts).encode()).hexdigest()[:16]

def misbound_sessions(names_in_key):
    x, y = rng.getrandbits(120), rng.getrandbits(120)
    gx, gy = pow(G, x, P), pow(G, y, P)
    z = pow(gy, x, P)                            # Alice and Bob both compute it
    if not names_in_key:
        return kdf(z, gx, gy), kdf(z, gx, gy)
    return kdf(z, gx, gy, "Alice", "Bob"), kdf(z, gx, gy, "Eve", "Bob")   # each side's view of who talks

def play(names_in_key, games=10000):
    wins = 0
    for _ in range(games):
        alice_key, bob_key = misbound_sessions(names_in_key)
        b = rng.getrandbits(1)                   # the challenger's secret coin
        test = alice_key if b == 0 else "%016x" % rng.getrandbits(64)   # Test: real (0) or random (1)
        revealed = bob_key                       # Reveal: allowed, Bob's session is not Alice's partner
        guess = 0 if test == revealed else 1
        wins += guess == b
    return wins, games

for names_in_key in (False, True):
    wins, games = play(names_in_key)
    print(f"names in the key derivation: {names_in_key!s:5}  Eve wins {wins} of {games}, "
          f"advantage {abs(2 * wins / games - 1):.4f}")
```

It prints:

```text
names in the key derivation: False  Eve wins 10000 of 10000, advantage 1.0000
names in the key derivation: True   Eve wins 4981 of 10000, advantage 0.0038
```

With the names in the key, Eve wins about half the games; 0.0038 is noise
(10,000 fair flips have a standard deviation of 50, and 4,981 is 19 below
5,000). A proof would show that *every* strategy does no better.

### Reading a bound, with numbers

A game-based proof ends in an inequality. A typical one for a signed
Diffie-Hellman handshake, with $q_s$ sessions, $n_P$ parties and $\ell$-bit
random nonces, has the shape

$$
\mathrm{Adv} \;\le\; \frac{q_s^2}{2^{\ell}} \;+\; n_P\,\mathrm{Adv}^{\mathrm{sig}}
\;+\; q_s\,\mathrm{Adv}^{\mathrm{ddh}} \;+\; \dots
$$

The first term is the chance that two sessions pick the same nonce. With
$q_s = 2^{40}$ sessions (about $10^{12}$) and the 256-bit random values of
TLS, it is $2^{80}/2^{256} = 2^{-176}$: nothing.
With 64-bit nonces, as some older protocols used, it is $2^{80}/2^{64} =
2^{16}$, a "bound" above 1 that says nothing. The last term is a **loose
reduction**: turning an attacker on the protocol into one on decisional
Diffie-Hellman loses a factor of $q_s$. If the group gives $\mathrm{Adv}^{\mathrm{ddh}} \le 2^{-128}$ for
the attacker's budget, the protocol is promised only $2^{40} \cdot 2^{-128}
= 2^{-88}$, still tiny; for a group at the "80-bit" level the same loss
leaves $2^{-40}$, which is not comfortable. The search for **tight** proofs,
which lose no factor of $q_s$, goes on (§20.13).

## 20.10 A designer's checklist

*Level: intermediate.*

The rules of §20.1 say what went wrong. A designer needs them as questions to
ask of a draft, each with the place in this book where its absence did
damage.

| # | Ask of every message and every key | If the answer is no |
| --- | --- | --- |
| 1 | Does each protected message name its sender, receiver and purpose (a tag or context string)? | Lowe (§20.3); Otway-Rees type flaw (§20.8) |
| 2 | Is every negotiated choice authenticated by something the negotiation cannot weaken? | FREAK, Logjam ([Chapter 4](04-Thirty-Years-of-TLS-Attacks.md)) |
| 3 | Is every field length-prefixed or typed, so there is one way to parse it? | type flaws; canonicalization bugs in signatures |
| 4 | Is anything decrypted, decompressed or parsed before it is authenticated? | padding oracles, EFAIL ([Chapter 15](15-Email-OpenPGP-and-SMIME.md)) |
| 5 | Does each key have one purpose, derived with its own label? | cross-protocol attacks; Selfie (§20.5) |
| 6 | How does a receiver tell a new message from a replay, and what state does that need? | KRACK ([Chapter 9](09-Wi-Fi-Security.md)); the rover of §20.7 |
| 7 | What does each long-term key reveal if it leaks tomorrow? | no forward secrecy in RSA key transport |
| 8 | Does every error look the same, and take the same time? | Bleichenbacher and its returns |
| 9 | Can the state machine be drawn on one page, and does the code reject everything else? | SMACK, 2015 (§20.5) |
| 10 | Can every algorithm be replaced by a new version, without a list of options? | export suites; JWT's `alg` |
| 11 | Is there a model with an executable honest run, and a proof or a bounded search of its goals? | everything the tools found in drafts (§20.4) |

### Worked example: a habitat command, checked

A first draft for sending commands from mission control to Arcadia City's
life-support controllers looks innocent: the command, then
$\mathrm{HMAC}(K, \mathit{command})$ with a key $K$ shared by Earth and the
controllers. Run the list.

Question 1 fails: nothing says who sent the command or which device it is
for, so a command recorded for one airlock verifies on every controller that
shares $K$. Question 6 fails: the same bundle delivered twice is valid twice,
the rover of §20.7. Question 5 fails too: any controller, or anyone who
extracts $K$ from one, can forge commands "from Earth". And there is no
version byte for question 10.

The second draft has a version byte, a tag `"arcadia/command/v1"`, sender
and target identifiers, a sequence number, an expiry time and the command,
encoded in CBOR and signed with ML-DSA or SLH-DSA by mission control. The
controller rejects anything at or below its highest accepted sequence number,
or expired. Question 11 then asks for a model with an
honest command accepted, a replay rejected and a command for device 7
rejected by device 8: an afternoon's work in Tamarin. The 22-minute light
delay changes nothing in the checklist; it only removes every fix that would
need a reply.

## 20.11 Mars: one design, start to finish

*Level: intermediate.*

Put the book together as one design: how should the settlement in Arcadia
and mission control on Earth exchange commands, telemetry and personal
messages?

**Bulk traffic travels as bundles.** Commands and telemetry go as BPv7
bundles with BPSec. Each bundle carries a payload encrypted with a fresh
content key, and that key is encapsulated to the recipient with a hybrid KEM
(X25519 plus ML-KEM-768, as age does in
[Chapter 18](18-Encrypting-Files-and-Disks.md)), so no session is needed and
no secret recorded on the long link today can be read by a quantum computer
later.

**Commands are signed, not only MACed.** A MAC key shared between Earth and a
lander lets either side forge commands from the other. Commands from Earth are
signed by mission control's key, which the settlement holds, and each carries
a sequence number and an expiry time in the signed payload. For keys that must
last a decade, a hash-based signature (SLH-DSA, or a stateful scheme with
careful state management) depends only on the security of hash functions.

**Certificates are issued ahead and expire.** With no fast round trip, OCSP
and live revocation are impossible. Instead, certificates are short-lived and
issued in batches before they are needed: each key is valid for a few weeks,
and its replacements were delivered on the previous supply ship or in an
earlier bundle. A stolen key is useful only until its certificate expires,
which turns revocation into waiting.

**Personal messages use the Double Ratchet over bundles.** Signal's protocol
needs no round trip once the first prekey bundle is fetched, which can be
cached in advance; [Chapter 16](16-Signal-and-the-Double-Ratchet.md) showed
that a 20-minute delay costs only post-compromise speed.

**Clocks are part of the security.** Expiry times and sequence windows depend
on clocks that agree to within minutes. The settlement keeps its own clocks
and checks them against signed time beacons from Earth, adjusted for the
known light time.

**Nothing negotiates.** Each link uses one versioned suite, chosen before
launch. A change of algorithms is a new version delivered with the software
update, never a list of options for an attacker 20 light-minutes away to pick
from.

## 20.12 Open problems

*Level: advanced.*

Protocols are far from finished. A reader who has come this far is equipped
to work on any of these.

**Verified from top to bottom.** Proofs of models, proofs of primitives and
verified code exist separately. Connecting them, so that the deployed binary
is proved to implement the analyzed protocol with constant-time code, has been
done for pieces (miTLS, HACL\*, libcrux, verified parsers such as EverParse)
but not yet for any widely used protocol in full.

**Post-quantum without the cost.** KEM-based authentication, smaller
signatures, and post-quantum versions of the clever tricks built on
Diffie-Hellman and pairings (private set intersection, anonymous credentials,
password-authenticated key exchange, blind signatures) are active research.
Isogenies promised small keys until SIKE fell in 2022; what replaces them for
non-interactive key exchange is open.

**Metadata.** End-to-end encryption hides contents; who talks to whom, when
and how much still leaks. Mixnets and private information retrieval scale
poorly, and popular messengers still learn much of their users' social graph.

**Usable verification.** Key transparency (logs of every key a server hands
out, which clients audit) is replacing safety-number comparison in large
messengers, but its guarantees depend on auditors and gossip that are hard
to deploy.

**Groups and long delays.** MLS assumes a server that orders commits. A group
spread over Earth, Mars and ships in transit, with hours of delay and
partitions lasting weeks, needs decentralized group key agreement that keeps
forward secrecy and post-compromise security without a central order.

**Protocols for machines that outlive their designers.** A Mars habitat's
controller may run for thirty years. Designing protocols whose keys,
algorithms and trust anchors can be replaced safely, remotely and without a
round trip is part engineering and part research, and no standard yet solves
it end to end.

## 20.13 Going deeper

*Level: expert.*

**Computational soundness.** Martín Abadi and Phillip Rogaway showed in 2000
that, for symmetric encryption under strong assumptions (no key cycles, and
encryption that hides message length), two symbolic messages that look the
same to a Dolev-Yao attacker are indistinguishable to any efficient attacker.
Later work extended such soundness results to public-key encryption and
signatures, but always with restrictions, and for Diffie-Hellman and XOR they
are still partial. Many practical analyses therefore do both: a symbolic tool
for the logic, and a computational proof (by hand or with CryptoVerif) for
the core key exchange.

**Composition.** A protocol proved secure alone may not be secure when run
beside others with shared keys. Ran Canetti's **universal composability**
framework (2001) defines security so that it survives composition with any
other protocol, at the price of strong setup assumptions; key exchange
proofs in practice use the weaker Bellare-Rogaway style with explicit
session partnering, and add key separation (rule 4) to keep composition
safe.

**Equivalence properties.** Secrecy and authentication are trace properties:
each run either violates them or not. Privacy properties, such as "an
observer cannot tell whether two sessions involve the same passport", are
**equivalences** between two versions of a system. ProVerif and Tamarin check
a stronger, more automatable notion (diff-equivalence); the e-passport result
in §20.4 and the ballot of §20.2 rely on such reasoning. Deciding
equivalence for an unbounded
number of sessions is undecidable in general, and the tools' approximations
are an active area.

**Bounds that matter.** §20.9 read one bound with numbers. Several protocols
proved "secure" had bounds too loose to say anything at deployed parameters,
and the multi-user setting, where an attacker targets any of billions of
keys, is where the gap usually appears; tight proofs are an active area.

## Check yourself

??? question "1. What can a Dolev-Yao attacker do, and what can it not do?"
    It controls the network: it reads, deletes, reorders and injects
    messages, builds new messages from what it knows, and may be a legitimate
    user. It cannot break primitives: no decryption without the key, no
    forged signatures, no hash inversion.

??? question "2. Why did a Finished MAC not stop Logjam?"
    The MAC was keyed by the session secret from the negotiated exchange. The
    attacker broke the weak 512-bit exchange during the handshake, so it knew
    the MAC key and could forge the MAC over the edited transcript.

??? question "3. In Lowe's attack, which message lacks what, and which honest party does the attacker's decryption for it?"
    Message 2, $\{N_A, N_B\}_{\mathit{pk}(A)}$, does not name its sender B,
    so A cannot tell B's reply from I's. NSL adds B's name. A acts as the
    decryption oracle: it opens B's message and sends $N_B$ out under I's key.

??? question "4. Why is the model checker in §20.3 not a proof for NSL?"
    It explores only three role instances with a fixed set of nonces. An
    attack needing more sessions would be missed. ProVerif and Tamarin reason
    about unbounded sessions.

??? question "5. A ballot is textbook RSA with n = 3233 and e = 17. It reads 1752. How did the voter vote, if 2 is no and 3 is yes, and what does this say about the symbolic model?"
    $2^{17} = 131{,}072 = 40 \cdot 3233 + 1752$, so the vote was no; anyone
    can encrypt both choices and compare. The term is not derivable (weak
    secrecy), but the ballot needs strong secrecy, which deterministic
    encryption cannot give.

??? question "6. In Otway-Rees, what does A accept as the session key in the type-flaw attack, and why does a length check not help?"
    The bytes $M, A, B$ from its own message 1, reflected as message 4. With
    an 8-byte $M$ and 4-byte names they are exactly 16 bytes, an AES-128 key's
    length. Tags or a length-prefixed encoding stop message 1 parsing as 4.

??? question "7. Your typed model of a protocol finds no attack, and your untyped model finds one. Which do you trust, and what do you change?"
    The untyped one, unless types really travel on the wire. Add tags or
    context strings and unambiguous encodings until the untyped model is
    clean too.

??? question "8. Why can't a KEM simply replace Diffie-Hellman in X3DH or Noise?"
    DH lets two parties with published keys compute a shared secret without
    messages; a KEM needs a ciphertext sent to the holder of the
    decapsulation key. Static-key authentication by DH must become a
    signature or an extra KEM exchange, changing message flows.

??? question "9. A rover accepts a valid BPSec-protected command twice. Why, and what fixes it?"
    BPSec gives integrity, not freshness; the duplicate is a valid bundle. A
    sequence number or validity window inside the protected payload, checked
    against the highest accepted value, fixes it. Short-lived keys and
    certificates help too, since revocation by round trip is not available.

??? question "10. In the Bellare-Rogaway game, how does identity misbinding give the attacker advantage close to 1, even though it never learns the key?"
    The misbound sessions share a key but are not partners, so the attacker
    may Reveal Bob's key and Test Alice's session: comparing tells real from
    random every time. Names in the key derivation, or SIGMA's MAC, make the
    two keys unrelated.

## What you learned

- Ten rules summarize this book's failures: name the parties, bind the
  transcript, authenticate before processing, separate keys, prove freshness,
  fail uniformly, keep few options, plan for compromise, keep the state
  machine small, and design for real keys and people.
- A transcript MAC catches a stripped offer, but only a long-term signature
  (or removing weak options) stops an attacker who breaks the weak option
  during the handshake.
- The Dolev-Yao model treats messages as symbols and the attacker as the
  network. Your model checker found Lowe's attack on Needham-Schroeder in a
  search of 1,349 states and none on the repair in these sessions.
- ProVerif, Tamarin, CryptoVerif and EasyCrypt have found real attacks and
  proved TLS 1.3, Signal, WireGuard and others; verified code (HACL\*,
  fiat-crypto, libcrux) runs in browsers, kernels and SSH. Proofs stop at the
  model, the property, the code and the deployment.
- Post-quantum algorithms change protocols' shape: KEMs are not DH, messages
  grow, hybrids need careful combiners, and key exchange moves before
  signatures.
- DTN carries self-protected bundles; BPSec's BIB and BCB, which you matched
  byte for byte against RFC 9173, give integrity and confidentiality but not
  freshness.
- A deterministic ballot is secret symbolically and readable by
  guess-and-compare; strong secrecy needs randomized encryption.
- A second checker, reading messages as untyped pairs, found both Otway-Rees
  type flaws in 3,952 states; typing hid them, and tags removed them.
- The big analyses found logic flaws in drafts, assumptions nobody wrote down
  (5G AKA, Selfie) and properties nobody had asked for (post-compromise
  security, MLS insiders).
- The Bellare-Rogaway game asks "real key or random?"; misbinding wins it
  outright, and a bound means something only once its terms get numbers.
- An eleven-question checklist and a model with a reachable honest run catch
  most of this book's failures before deployment.

## Further reading

- Roger Needham and Michael Schroeder, "Using Encryption for Authentication
  in Large Networks of Computers", *Communications of the ACM*, 1978.
- Danny Dolev and Andrew Yao, "On the Security of Public Key Protocols",
  *IEEE Transactions on Information Theory*, 1983.
- Gavin Lowe, "Breaking and Fixing the Needham-Schroeder Public-Key Protocol
  Using FDR", TACAS 1996.
- Martín Abadi and Roger Needham, "Prudent Engineering Practice for
  Cryptographic Protocols", *IEEE Transactions on Software Engineering*,
  1996, the original list of rules.
- Bruno Blanchet, "Modeling and Verifying Security Protocols with the Applied
  Pi Calculus and ProVerif", *Foundations and Trends in Privacy and
  Security*, 2016.
- Simon Meier, Benedikt Schmidt, Cas Cremers and David Basin, "The TAMARIN
  Prover for the Symbolic Analysis of Security Protocols", CAV 2013.
- Manuel Barbosa et al., "SoK: Computer-Aided Cryptography", IEEE S&P 2021.
- Dave Otway and Owen Rees, "Efficient and Timely Mutual Authentication",
  *ACM SIGOPS Operating Systems Review* 21(1), 1987.
- Michael Burrows, Martín Abadi and Roger Needham, "A Logic of
  Authentication", *Proceedings of the Royal Society of London A*, 1989.
- Mihir Bellare and Phillip Rogaway, "Entity Authentication and Key
  Distribution", CRYPTO 1993.
- John Clark and Jeremy Jacob, "A Survey of Authentication Protocol
  Literature: Version 1.0", University of York, 1997.
- James Heather, Gavin Lowe and Steve Schneider, "How to Prevent Type Flaw
  Attacks on Security Protocols", CSFW 2000; *Journal of Computer Security*,
  2003.
- Cas Cremers, Marko Horvat, Sam Scott and Thyla van der Merwe, "Automated
  Analysis and Verification of TLS 1.3: 0-RTT, Resumption and Delayed
  Authentication", IEEE S&P 2016.
- Cas Cremers, Marko Horvat, Jonathan Hoyland, Sam Scott and Thyla van der
  Merwe, "A Comprehensive Symbolic Analysis of TLS 1.3", CCS 2017.
- Benjamin Dowling, Marc Fischlin, Felix Günther and Douglas Stebila, "A
  Cryptographic Analysis of the TLS 1.3 Handshake Protocol", *Journal of
  Cryptology*, 2021.
- Katriel Cohn-Gordon, Cas Cremers, Benjamin Dowling, Luke Garratt and
  Douglas Stebila, "A Formal Security Analysis of the Signal Messaging
  Protocol", IEEE EuroS&P 2017.
- David Basin, Jannik Dreier, Lucca Hirschi, Saša Radomirović, Ralf Sasse
  and Vincent Stettler, "A Formal Analysis of 5G Authentication", CCS 2018.
- Cas Cremers and Martin Dehnel-Wild, "Component-Based Formal Analysis of
  5G-AKA: Channel Assumptions and Session Confusion", NDSS 2019.
- David Basin, Ralf Sasse and Jorge Toro-Pozo, "The EMV Standard: Break, Fix,
  Verify", IEEE S&P 2021.
- Nir Drucker and Shay Gueron, "Selfie: Reflections on TLS 1.3 with PSK",
  *Journal of Cryptology*, 2021.
- RFC 9171 (Bundle Protocol version 7), RFC 9172 (BPSec) and RFC 9173 (its
  default security contexts), 2022.
- The Post-quantum book's
  [Chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md), for the
  migration this chapter's §20.6 draws on.
