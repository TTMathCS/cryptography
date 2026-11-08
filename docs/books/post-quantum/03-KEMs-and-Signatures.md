# 3. KEMs, Signatures and What "Secure" Means Now

*Diffie-Hellman gave the world a beautiful symmetric trick: two people each publish a
number, and both compute the same secret. No post-quantum scheme in the standards does
that. What they offer instead is a key-encapsulation mechanism, a KEM: one side
publishes a key, the other wraps a fresh secret for it. This chapter explains why the
standards are KEMs and signatures, what security each must have, and how the
Fujisaki-Okamoto transform turns a fragile encryption scheme into a robust KEM. You will
break a toy lattice KEM that lacks the transform, using 32 crafted messages to a server
that reuses its key, then watch the same attack fail once the transform is added. You
will also see why lattice signatures must sometimes throw away a signature and start
again.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a KEM is, how it differs from Diffie-Hellman and from public-key encryption, and
      how a KEM becomes encryption of any length;
    - the security notions IND-CPA and IND-CCA for KEMs, and why CCA security is what real
      protocols need;
    - how the Fujisaki-Okamoto transform works, why it re-encrypts, and what implicit
      rejection is for;
    - why decryption failures are a security property, not just a nuisance;
    - what the quantum random oracle model is and why proofs in it are harder;
    - what signatures must provide beyond unforgeability, and how Fiat-Shamir with aborts
      keeps a lattice signature from leaking its key;
    - the rules NIST's SP 800-227 sets for using a KEM.

    **You need:** [Chapter 2](02-Security-Levels.md); public-key encryption and the idea of a
    security game from book 1's [Chapter 17](../../book/17-Defining-Security.md); hash
    functions from book 1's [Chapter 9](../../book/09-Hash-Functions.md).

    **Levels:** §3.1 to §3.3 are for beginners, §3.4 to §3.12 are intermediate, §3.13 is
    expert.

## 3.1 The problem

*Level: beginner.*

In 1976 Whitfield Diffie and Martin Hellman showed how two strangers could agree on a key
in public. Alice picks a secret $a$ and sends $g^a$; Bob picks $b$ and sends $g^b$; each
raises what they received to their own secret and gets $g^{ab}$. The exchange is
**symmetric**: neither side has to wait for the other before sending, and the same
public value can be reused with many partners. It is **non-interactive** in the sense
that if Alice's $g^a$ is already published, Bob can compute the shared key without
hearing from her again. These properties made Diffie-Hellman the Swiss army knife of
protocols, used in TLS, SSH, IPsec, Signal, WireGuard and many more.

When the post-quantum search began, people looked for a quantum-safe Diffie-Hellman.
They found only one family with the same shape, the isogeny-based group action CSIDH
(Chapter 16), and it is slow, its quantum security is debated, and it was never put
forward as a NIST standard. The schemes that survived the competition, built on lattices
and codes, do something different. They are naturally public-key **encryption** schemes:
Bob encrypts something under Alice's public key, and only Alice can decrypt it. From
encryption the step to key exchange is easy: Bob picks a random secret, encrypts it, and
both sides use it. That pattern has a name, the **key-encapsulation mechanism**, and it
is what FIPS 203's ML-KEM provides.

The change looks small. It is not. A KEM is asymmetric: Alice must publish (or send) her
key first, and Bob responds. Protocols built on Diffie-Hellman's symmetry need redesign.
And encryption schemes built on noisy lattice problems have a fragility that
Diffie-Hellman does not: if the same key is reused and an attacker can send it crafted
ciphertexts, a naive design leaks the key. The fix, a transform invented by Eiichiro
Fujisaki and Tatsuaki Okamoto in 1999, sits at the heart of ML-KEM, HQC and Classic
McEliece. This chapter builds it from the ground up.

Signatures have their own new problems. Lattice signatures built like Schnorr's leak
their key through the statistics of their output unless they reject and retry; hash-based
signatures can be used only a limited number of times unless built carefully; and the
security notion everyone used for decades, unforgeability, turns out not to cover some
attacks that matter in practice. The second half of the chapter takes those in turn.

## 3.2 What a KEM is

*Level: beginner.*

A **key-encapsulation mechanism** is three algorithms:

- **KeyGen()** outputs a public **encapsulation key** $ek$ and a private **decapsulation
  key** $dk$.
- **Encaps($ek$)** outputs a shared secret $K$ and a **ciphertext** $c$.
- **Decaps($dk$, $c$)** outputs a shared secret $K'$.

**Correctness** says that $K' = K$, always or with overwhelming probability. In use, Alice
runs KeyGen and sends $ek$ to Bob; Bob runs Encaps, keeps $K$ and sends $c$; Alice runs
Decaps and gets the same $K$. Figure 3.1 shows the flow beside Diffie-Hellman's.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Two message flows side by side: Diffie-Hellman with two public values crossing, and a KEM where Alice sends an encapsulation key and Bob answers with a ciphertext" fill="currentColor" font-size="14">
<text x="160" y="24" text-anchor="middle" font-weight="bold">Diffie-Hellman</text>
<text x="40" y="54">Alice</text><text x="250" y="54">Bob</text>
<line x1="60" y1="64" x2="60" y2="250" stroke="currentColor"/>
<line x1="270" y1="64" x2="270" y2="250" stroke="currentColor"/>
<line x1="60" y1="100" x2="266" y2="130" stroke="currentColor" stroke-width="1.6"/>
<text x="150" y="104" text-anchor="middle">g^a</text>
<line x1="270" y1="100" x2="64" y2="130" stroke="currentColor" stroke-width="1.6"/>
<text x="190" y="140" text-anchor="middle">g^b</text>
<text x="60" y="190" text-anchor="middle">K = (g^b)^a</text>
<text x="270" y="190" text-anchor="middle">K = (g^a)^b</text>
<text x="165" y="236" text-anchor="middle" font-size="12">either side may send first</text>
<text x="480" y="24" text-anchor="middle" font-weight="bold" class="acc-fill">KEM</text>
<text x="360" y="54">Alice</text><text x="570" y="54">Bob</text>
<line x1="380" y1="64" x2="380" y2="250" stroke="currentColor"/>
<line x1="590" y1="64" x2="590" y2="250" stroke="currentColor"/>
<text x="380" y="88" text-anchor="middle" font-size="12">KeyGen → ek, dk</text>
<line x1="380" y1="104" x2="586" y2="124" class="acc" stroke-width="1.8"/>
<text x="480" y="106" text-anchor="middle">ek</text>
<text x="590" y="148" text-anchor="middle" font-size="12">Encaps(ek) → K, c</text>
<line x1="590" y1="164" x2="384" y2="184" class="acc" stroke-width="1.8"/>
<text x="480" y="166" text-anchor="middle">c</text>
<text x="380" y="212" text-anchor="middle" font-size="12">Decaps(dk, c) → K</text>
<text x="485" y="250" text-anchor="middle" font-size="12">Bob must see ek before he answers</text>
</svg>
<figcaption>Figure 3.1. Diffie-Hellman and a KEM. Both end with a shared key $K$, but the KEM has a fixed order: Alice's key first, Bob's ciphertext second. TLS 1.3 fits this naturally (the client sends a key share, the server answers); some other protocols do not.</figcaption>
</figure>

**Diffie-Hellman is a KEM too.** Let $ek = g^a$. Encaps picks $b$, sets $c = g^b$ and
$K = \text{KDF}(g^{ab})$; Decaps computes $K = \text{KDF}(c^a)$. This "DHKEM" is exactly
what the Hybrid Public Key Encryption standard, RFC 9180 (2022), uses, so the same
protocol code can switch between X25519 and ML-KEM by swapping the KEM.

**A KEM encrypts anything, with help.** A KEM produces a random key, not a ciphertext of
your choosing. To encrypt a message $M$, combine it with a symmetric scheme: $(K, c)
\leftarrow \text{Encaps}(ek)$, then send $c$ and $\text{AEAD}_K(M)$. This is the
**KEM/DEM** paradigm (DEM for data-encapsulation mechanism), formalized by Victor Shoup and
by Ronald Cramer and Shoup around 2001 to 2003 and used by HPKE. It is how every
post-quantum encryption is done in practice: the public-key part only ever carries 32
bytes of key.

**Why not just encrypt the key?** Public-key encryption of a random key works, and
historically that is how RSA was used in TLS. But a KEM is simpler to define and to make
secure, because the sender never chooses the plaintext. Many attacks on RSA encryption,
including Bleichenbacher's padding oracle of 1998, exploited the structure of a
sender-chosen plaintext; a KEM gives the attacker nothing to choose.

## 3.3 What a secure KEM must resist

*Level: beginner.*

Security is defined by a game between a challenger and an adversary, as in book 1's
Chapter 17.

**IND-CPA (indistinguishability under chosen-plaintext attack)** for a KEM: the challenger
runs KeyGen and gives the adversary $ek$. It runs Encaps to get $(K_0, c)$, picks a random
key $K_1$ of the same length and a random bit $b$, and gives the adversary $(c, K_b)$. The
adversary wins if it guesses $b$. The KEM is IND-CPA secure if no efficient adversary wins
with probability noticeably better than one half. In words: the ciphertext reveals nothing
about the key it carries.

**IND-CCA (indistinguishability under chosen-ciphertext attack)** adds a **decapsulation
oracle**: the adversary may submit any ciphertext $c' \ne c$ and receive
$\text{Decaps}(dk, c')$. It still wins only by guessing $b$. IND-CCA security means that
even an attacker who can get any other ciphertext decapsulated learns nothing about this
one.

**Why CCA matters.** It can seem a strange power to grant: who would decapsulate an
attacker's ciphertexts for them? In practice, almost anyone. A TLS server receives a
ciphertext from whoever connects, decapsulates it, derives keys and responds; whether the
response decrypts correctly tells the client something about the decapsulated key. If the
server reuses its key pair for many connections, as servers with static keys do, every
connection is a query to a decapsulation oracle. Even with fresh keys per connection, a
protocol may reuse a key for a short window, and implementations make mistakes. The
standards therefore require IND-CCA security, and the lattice and code-based schemes get
it through the transform of §3.5.

**By hand: why noisy encryption is fragile.** Lattice encryption works by hiding a message
bit inside noise. Recall the one-coefficient example from book 1's Chapter 21: Bob's
public key holds $t = as + e$ for a small secret $s$; to decrypt a ciphertext $(u, v)$,
Alice computes $w = v - su \bmod q$ and decides the bit by whether $w$ is near 0 or near
$q/2$. Alice's decision depends on the secret $s$. If an attacker can choose $u$ and $v$,
then $w = v - su$ is a quantity the attacker shapes, and Alice's answer, 0 or 1, says on
which side of a threshold $v - su$ falls. Choose $u$ and $v$ well and each answer narrows
down $s$.

With $q = 3329$, decryption returns 1 when $w$ lies between $q/4 \approx 832$ and $3q/4
\approx 2497$. Suppose a coefficient $s_i$ of the secret is $-1$, 0 or 1. The attacker sends
$u$ with 1000 in position $i$ and zeros elsewhere, so $w = v - 1000\,s_i$:

- With $v = 1664$: $s_i = -1$ gives $w = 2664$, decoded 0; $s_i = 0$ gives 1664, decoded 1;
  $s_i = 1$ gives 664, decoded 0.
- With $v = 2400$: $s_i = -1$ gives $3400 \bmod 3329 = 71$, decoded 0; $s_i = 0$ gives 2400,
  decoded 1; $s_i = 1$ gives 1400, decoded 1.

The pair of answers, (0, 0), (1, 1) or (0, 1), identifies $s_i$ exactly. Two queries per
coefficient recover the whole secret. Nothing about the lattice problem was hard here: the
attacker never solved LWE. It simply asked the key to describe itself.

## 3.4 Break it: the key-mismatch attack

*Level: intermediate.*

Scott Fluhrer of Cisco described exactly this kind of attack in 2016 against ring-LWE key
exchanges whose parties reused their keys, and it was adapted to several NIST submissions
in their CPA-secure forms. The attacker does not even need to see the decrypted bits: it is
enough to learn whether the shared key the victim derived matches the attacker's guess, a
"key mismatch" oracle that any protocol provides when the victim responds using the key.

**Code it.** The program builds a small LWE encryption scheme (dimension 16, modulus 3329,
eight message bits, coefficients in $\{-1, 0, 1\}$), turns it into a CPA-only KEM whose
shared key is a hash of a random message, and puts it behind a server that reuses its key
and answers each ciphertext with a tag computed under the shared key. The attacker sends
crafted ciphertexts, tries all 256 possible messages against each tag to learn what the
server decrypted, and reads off the secret. The same program also builds the
Fujisaki-Okamoto version of the KEM, explained in the next section, and runs the same
attack against it.

```python
import hashlib, hmac, random

Q, N, L = 3329, 16, 8               # modulus, dimension, message bits

def small(rnd, k):
    return [rnd.choice((-1, 0, 1)) for _ in range(k)]

def keygen(seed):
    rnd = random.Random(seed)
    A = [[rnd.randrange(Q) for _ in range(N)] for _ in range(N)]
    S = [small(rnd, L) for _ in range(N)]                  # N x L secret
    E = [small(rnd, L) for _ in range(N)]
    B = [[(sum(A[i][k] * S[k][j] for k in range(N)) + E[i][j]) % Q
          for j in range(L)] for i in range(N)]
    return (A, B), S

def encrypt(pk, m, coins):
    A, B = pk
    rnd = random.Random(coins)
    r, e1, e2 = small(rnd, N), small(rnd, N), small(rnd, L)
    u = [(sum(A[i][k] * r[i] for i in range(N)) + e1[k]) % Q for k in range(N)]
    v = [(sum(B[i][j] * r[i] for i in range(N)) + e2[j] + m[j] * (Q // 2)) % Q
         for j in range(L)]
    return u, v

def decrypt(S, ct):
    u, v = ct
    w = [(v[j] - sum(S[k][j] * u[k] for k in range(N))) % Q for j in range(L)]
    return [1 if Q // 4 < x < 3 * Q // 4 else 0 for x in w]

def H(*parts):
    return hashlib.sha3_256(repr(parts).encode()).digest()

# A CPA-only KEM: the shared key is a hash of a random message.
def cpa_decaps(S, ct):
    return H("K", decrypt(S, ct))

# The same with the Fujisaki-Okamoto transform and implicit rejection.
def fo_encaps(pk, rnd):
    m = [rnd.randrange(2) for _ in range(L)]
    ct = encrypt(pk, m, H("coins", m, pk))                 # coins come from m
    return ct, H("K", m)

def fo_decaps(pk, S, z, ct):
    m = decrypt(S, ct)
    if encrypt(pk, m, H("coins", m, pk)) == ct:            # re-encrypt and compare
        return H("K", m)
    return H("reject", z, ct)                              # a key unrelated to m

def server(decaps):
    """A server that reuses its key and answers with a tag under the shared key."""
    return lambda ct: hmac.new(decaps(ct), b"ok", "sha256").digest()

def learn_message(oracle, ct):
    """The attacker tries all 2^L messages against the server's tag."""
    tag = oracle(ct)
    for x in range(1 << L):
        m = [(x >> j) & 1 for j in range(L)]
        if hmac.new(H("K", m), b"ok", "sha256").digest() == tag:
            return m
    return None

def attack(oracle):
    """Key-mismatch attack: two crafted ciphertexts per row of S."""
    table = {(0, 0): -1, (1, 1): 0, (0, 1): 1}
    S = []
    for i in range(N):
        u = [1000 if k == i else 0 for k in range(N)]
        a = learn_message(oracle, (u, [1664] * L))
        b = learn_message(oracle, (u, [2400] * L))
        if a is None or b is None:
            return None
        S.append([table[(a[j], b[j])] for j in range(L)])
    return S

pk, S = keygen(2026)
z = b"implicit-rejection-secret"
print("FO KEM works:", all(fo_decaps(pk, S, z, c) == k for c, k in
      (fo_encaps(pk, random.Random(t)) for t in range(50))))
found = attack(server(lambda ct: cpa_decaps(S, ct)))
print("CPA KEM, secret recovered:", found == S, "with", 2 * N, "queries")
found = attack(server(lambda ct: fo_decaps(pk, S, z, ct)))
print("FO KEM, secret recovered:", found)
```

Running it prints:

```
FO KEM works: True
CPA KEM, secret recovered: True with 32 queries
FO KEM, secret recovered: None
```

The toy lets the attacker try all 256 messages against each tag. With a real 256-bit
message that is impossible, but it is not needed: Fluhrer's attack and its successors
craft ciphertexts in which all but one bit decrypt to values the attacker already knows,
so a single yes-or-no answer from the server, "my key matched" or "it did not", reveals
one fact about the secret.

Thirty-two connections recover a secret that a lattice attack could never find at real
sizes, because the attacker never attacked the lattice. Against the FO version the
attacker's crafted ciphertexts fail the re-encryption check, the server answers with a key
derived from its private value $z$ and the ciphertext, and no guess matches. The attacker
learns nothing at all, not even that its ciphertext was rejected, because the rejection
key looks like any other key.

!!! note "Life story: the key-reuse attack on lattice key exchange"
    **Born:** 2016, Scott Fluhrer, "Cryptanalysis of ring-LWE based key exchange with key
    share reuse" (IACR ePrint 2016/085) · **Purpose:** to show that LWE-based key exchange
    without CCA protection leaks its secret when a key is reused · **Helped:** made the case
    for CCA-secure KEMs in the NIST process; later papers adapted it to NewHope, Kyber's
    CPA core and others in their CPA forms · **Status:** a standard warning; it does not
    apply to ML-KEM, which uses the Fujisaki-Okamoto transform

## 3.5 The Fujisaki-Okamoto transform

*Level: intermediate.*

The attack of §3.4 worked because the server decrypted whatever it was sent and acted on
the result. The fix is to make the server check that a ciphertext is one an honest sender
could have produced, and to refuse, invisibly, if it is not. Eiichiro Fujisaki and
Tatsuaki Okamoto of NTT gave a general way to do this at CRYPTO 1999, and Dennis Hofheinz,
Kathrin Hövelmanns and Eike Kiltz rebuilt it in 2017 as a set of small, separately proven
steps suited to KEMs with decryption failures. Almost every post-quantum KEM uses a version
of their construction.

**Ingredients.** A public-key encryption scheme $\text{PKE} = (\text{KeyGen},
\text{Enc}, \text{Dec})$ that is only IND-CPA secure; hash functions $G$ and $H$, modeled as
random oracles.

**Step 1: derandomize (the "T" transform).** Encryption normally uses fresh random coins.
Replace them with coins derived from the message: $\text{Enc}^T(ek, m) =
\text{Enc}(ek, m; G(m))$. Now encryption is a deterministic function of $m$, and anyone who
knows $m$ can recompute the exact ciphertext.

**Step 2: re-encrypt to check.** On receiving $c$, decrypt to $m' = \text{Dec}(dk, c)$,
then recompute $c' = \text{Enc}(ek, m'; G(m'))$. If $c' = c$, the ciphertext is honest:
someone who knew $m'$ made it. If not, it was crafted or corrupted.

**Step 3: derive the key and reject implicitly (the "U" transform).** If the check passes,
output $K = H(m')$ (often with the ciphertext or public key mixed in). If it fails, output
$K = H(z, c)$, where $z$ is a random secret stored with the private key. This is
**implicit rejection**: the decapsulator never says "invalid"; it returns a key that looks
random and that the attacker cannot predict, so a protocol built on it simply fails to
agree, exactly as it would after a network error. The alternative, **explicit rejection**,
returns an error symbol, and its proofs are weaker and its implementations more prone to
leaking which check failed.

**Why it works.** An attacker who wants information from the decapsulation oracle must
submit ciphertexts. If it submits an honest encryption of some $m$, the oracle returns
$H(m)$, but the attacker knew $m$ (it had to, to make the ciphertext), so it learns
nothing. If it submits anything else, the oracle returns $H(z, c)$, which is random to
anyone without $z$. Either way the answers carry no information about $dk$. That argument,
made rigorous, reduces IND-CCA security of the KEM to IND-CPA security (in fact, the weaker
one-wayness) of the PKE, in the random oracle model.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Decapsulation with the Fujisaki-Okamoto transform: decrypt, re-encrypt with coins from G of m, compare; equal gives K = H(m), different gives K = H(z, c)" fill="currentColor" font-size="14">
<rect x="20" y="30" width="110" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="75" y="57" text-anchor="middle">ciphertext c</text>
<rect x="170" y="30" width="130" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="235" y="57" text-anchor="middle">m′ = Dec(dk, c)</text>
<rect x="340" y="30" width="270" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="475" y="57" text-anchor="middle">c′ = Enc(ek, m′; G(m′))</text>
<line x1="130" y1="52" x2="166" y2="52" stroke="currentColor" stroke-width="1.6"/>
<polygon points="166,47 170,52 166,57"/>
<line x1="300" y1="52" x2="336" y2="52" stroke="currentColor" stroke-width="1.6"/>
<polygon points="336,47 340,52 336,57"/>
<polygon points="475,110 545,150 475,190 405,150" class="soft-acc" stroke="currentColor"/>
<text x="475" y="155" text-anchor="middle">c′ = c ?</text>
<line x1="475" y1="74" x2="475" y2="106" stroke="currentColor" stroke-width="1.6"/>
<polygon points="470,102 475,108 480,102"/>
<rect x="250" y="226" width="150" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="325" y="253" text-anchor="middle">K = H(m′, …)</text>
<rect x="470" y="226" width="150" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="545" y="253" text-anchor="middle">K = H(z, c)</text>
<line x1="420" y1="170" x2="340" y2="222" stroke="currentColor" stroke-width="1.6"/>
<text x="360" y="194">yes</text>
<line x1="520" y1="176" x2="545" y2="222" stroke="currentColor" stroke-width="1.6"/>
<text x="548" y="200">no</text>
<text x="20" y="130" font-size="12">z: a random secret</text>
<text x="20" y="148" font-size="12">kept with dk</text>
<text x="20" y="180" font-size="12">Both branches return</text>
<text x="20" y="198" font-size="12">a key; the caller</text>
<text x="20" y="216" font-size="12">cannot tell which ran.</text>
</svg>
<figcaption>Figure 3.2. Decapsulation with the Fujisaki-Okamoto transform and implicit rejection. The re-encryption check catches every crafted ciphertext; the rejection key, in accent, is indistinguishable from a real one.</figcaption>
</figure>

**The cost.** Decapsulation now includes a full encryption, roughly doubling its cost. For
ML-KEM that is a few tens of microseconds on a laptop, a price everyone accepts. More
serious is the implementation risk: the comparison $c' = c$ and the choice between the two
keys must run in constant time, or a timing side channel reveals which branch ran and
rebuilds the oracle the transform was meant to remove. Chapter 17 shows how such leaks
have been found in practice.

**In ML-KEM.** FIPS 203 follows this pattern with details of its own: the message $m$ is
32 random bytes; the coins and the key come together from one hash, $(K, r) = G(m \,\|\,
H(ek))$, so that the key depends on the public key (the multi-target defense of Chapter
2); and the rejection key is $\bar K = J(z \,\|\, c)$ with $J$ built from SHAKE256.
Chapter 8 goes through every line.

## 3.6 Decryption failures as a security property

*Level: intermediate.*

Lattice and code-based encryption have a small chance of decrypting wrongly even when
everyone is honest: the noise added for security occasionally pushes a coefficient across
the decision threshold. The designers choose parameters so that this is rare, and the
question is: how rare must it be?

**Why failures leak.** A decryption failure is an event that depends on the secret key: it
happens when the secret and the ciphertext's noise line up badly. An attacker who can
detect failures learns something each time one happens. With the FO transform, the
attacker cannot craft ciphertexts freely, but it can still search: generate many honest
ciphertexts offline (it knows their messages), keep those whose noise is unusually large
in a chosen direction, submit them, and watch for failures. This **failure boosting**,
analysed by Jan-Pieter D'Anvers and colleagues from 2019, turns a failure probability of
$2^{-100}$ into an attack whose cost depends on how much work buys each "weak" ciphertext.

**The rule.** The failure probability $\delta$ must be small enough that this whole
process costs more than the security level. In the FO proofs $\delta$ appears directly in
the advantage bound, roughly as $q \cdot \delta$ for $q$ queries. ML-KEM sets $\delta$ at
$2^{-139}$, $2^{-164}$ and $2^{-174}$ for its three parameter sets, far below any number of
decapsulations an attacker could observe. HQC's are around $2^{-128}$ and below; BIKE's
were harder to pin down, which counted against it (Chapter 14).

**Code it.** The failure probability of an LWE scheme can be estimated by convolving the
distributions of the noise terms. The program below does that for a single coefficient of
a scaled-down scheme with centered binomial noise, and checks it against a direct
simulation.

```python
import random
from math import comb, log2

def cbd(eta):
    """Centered binomial distribution: the difference of two sums of eta coin flips."""
    return {k: comb(2 * eta, eta + k) / 4 ** eta for k in range(-eta, eta + 1)}

def convolve(p, r):
    out = {}
    for a, pa in p.items():
        for b, pb in r.items():
            out[a + b] = out.get(a + b, 0.0) + pa * pb
    return out

def product(p, r):
    out = {}
    for a, pa in p.items():
        for b, pb in r.items():
            out[a * b] = out.get(a * b, 0.0) + pa * pb
    return out

def noise(n, eta):
    """Distribution of e.r - s.e1 + e2 for vectors of length n, one coefficient."""
    term = product(cbd(eta), cbd(eta))
    total = cbd(eta)
    for _ in range(2 * n):
        total = convolve(total, term)
    return total

def failure(n, eta, q):
    d = noise(n, eta)
    return sum(p for x, p in d.items() if abs(x) >= q // 4)

def simulate(n, eta, trials, seed=5):
    """Draw the same noise directly, many times."""
    rnd = random.Random(seed)
    def c():
        return sum(rnd.randrange(2) for _ in range(eta)) - sum(rnd.randrange(2) for _ in range(eta))
    return [sum(c() * c() for _ in range(2 * n)) + c() for _ in range(trials)]

n, eta = 64, 2
samples = simulate(n, eta, 20000)
for q in (97, 129, 193, 257):
    seen = sum(abs(x) >= q // 4 for x in samples) / len(samples)
    print("n=%d eta=%d q=%3d  exact 2^%6.1f  simulated %.4f"
          % (n, eta, q, log2(failure(n, eta, q)), seen))
```

Running it prints:

```
n=64 eta=2 q= 97  exact 2^  -4.7  simulated 0.0398
n=64 eta=2 q=129  exact 2^  -7.4  simulated 0.0056
n=64 eta=2 q=193  exact 2^ -14.7  simulated 0.0000
n=64 eta=2 q=257  exact 2^ -24.3  simulated 0.0000
```

Raising $q$ from 97 to 257 cuts the failure rate from about one in 26 to about one in
twenty million, and the rate keeps falling faster than exponentially as $q$ grows, which
is why real schemes can push it below $2^{-128}$ with moderate moduli. The simulation matches where it
can see anything at all, and goes silent exactly where the exact calculation becomes the
only tool. ML-KEM's designers published such calculations, with compression errors
included, as a script alongside their specification.

## 3.7 The quantum random oracle model

*Level: intermediate.*

The FO proof treats $G$ and $H$ as **random oracles**: idealized functions that return an
independent random answer to every new input, which an adversary can only query. Real
schemes instantiate them with SHA-3 or SHAKE. The random oracle model, introduced by Mihir
Bellare and Phillip Rogaway in 1993, is a heuristic: no real hash function is a random
oracle, but schemes proven secure in the model have, with a few contrived exceptions, held
up when instantiated sensibly.

A quantum attacker adds a twist. It can run the hash function on a quantum computer, on a
**superposition** of inputs, because $H$ is public code. In the **quantum random oracle
model** (QROM), introduced by Dan Boneh and colleagues in 2011, the adversary may query
the oracle in superposition. Classical proof techniques break: a classical proof often
"watches" which inputs the adversary queries, or "programs" the oracle's answer on a
chosen input, and neither is possible when a query is a superposition of all inputs at
once. Measuring the query would disturb the adversary's state.

New tools were built for the QROM over the following decade. Dominique Unruh's
**one-way to hiding lemma** (2015) bounds how much an adversary's behavior can change when
the oracle is changed on a set of inputs it is unlikely to find. Mark Zhandry's
**compressed oracle** technique (2019) lets a proof record, in a quantum-compatible way,
what the adversary has learned about the oracle. With them, Hofheinz-Hövelmanns-Kiltz-style
FO transforms were proven secure in the QROM, with security losses that later work, by
Bindel, Hamburg, Hövelmanns, Hülsing and Persichetti (2019) among others, steadily reduced.
The FO variant in ML-KEM, with implicit rejection, has a QROM proof.

What should a practitioner take from this? Two things. First, the post-quantum standards
are proven secure in the model that matches their threat, which was not a given in 2017.
Second, the proofs are less tight than classical ones, sometimes losing a square root in
the advantage, so parameters are chosen from attacks with margin, not from proofs.

## 3.8 What a signature must provide

*Level: intermediate.*

**Unforgeability.** The classic definition, EUF-CMA (existential unforgeability under
chosen-message attack), gives the adversary the public key and a signing oracle for any
messages it likes; it wins if it outputs a valid signature on a message it never asked to
be signed. **Strong** unforgeability, SUF-CMA, also counts as a win a new signature on an
old message. SUF-CMA matters where signatures act as identifiers, such as transaction IDs in
cryptocurrencies, where a malleable signature changed a transaction's ID and confused
Bitcoin exchanges in 2014.

**Beyond unforgeability.** In 2021 Cas Cremers, Samed Düzlü, Rune Fiedler, Marc Fischlin and
Christian Janson listed properties that real systems silently assume and that EUF-CMA does
not give, calling the combination "BUFF" (beyond unforgeability features):

- **Exclusive ownership:** a signature verifies under only one public key. Without it, an
  attacker can make a new key under which someone else's signature verifies, and claim to
  have signed their document ("duplicate signature key selection", which broke
  certificate-based protocols in the past).
- **Message-bound signatures:** a signature verifies for only one message, even with an
  adversarially chosen public key.
- **Non-resignability:** seeing a signature on a hash of an unknown message does not let
  someone else sign that same unknown message.

They checked the NIST finalists and found that some had all three and some needed small
changes. ML-DSA hashes the public key into every signature (a value FIPS 204 calls
$tr$), which gives exclusive ownership and message binding; SLH-DSA mixes its public seed
and root into every hash. Falcon in its original form did not have all three, and the
FN-DSA standard is expected to address that, though as of November 2026 no draft is public.

**Determinism, hedging and randomness.** A signature scheme may be **deterministic** (the
same message and key always give the same signature, as in Ed25519) or **randomized**.
Deterministic signing removes the danger of a bad random number generator, which leaked
ECDSA keys from Sony's PlayStation 3 and many Bitcoin wallets. It also makes fault attacks
easier, because an attacker who can glitch one of two identical computations gets two
different signatures on the same input. FIPS 204 therefore makes **hedged** signing the
default: fresh randomness is mixed with a value derived from the key and message, so a
broken generator degrades to deterministic signing and a good one defeats fault
attacks. FIPS 205 offers the same choice.

## 3.9 Fiat-Shamir with aborts

*Level: intermediate.*

The most common way to build a signature is the **Fiat-Shamir** transform (Amos Fiat and
Adi Shamir, 1986): take an interactive identification protocol in which a prover convinces
a verifier it knows a secret, and replace the verifier's random challenge by a hash of the
commitment and the message. Schnorr signatures, and so EdDSA, are built this way (book 1,
[Chapter 14](../../book/14-Discrete-Log-Systems.md)). The pattern is:

1. **Commit:** the signer picks a random mask $y$ and publishes a commitment $w = f(y)$.
2. **Challenge:** $c = H(w, \text{message})$.
3. **Respond:** $z = y + c \cdot s$, where $s$ is the secret key.
4. **Verify:** check that $f(z) = w + c \cdot (\text{public key})$, which holds because $f$
   is linear.

In Schnorr's scheme the mask $y$ is uniform modulo the group order, so $z = y + cs$ is
uniform too, and reveals nothing about $s$. In a lattice version the secret $s$ must be
*small*, because that is what makes the lattice problem hard, and $z$ must also be small,
or anyone could produce a valid one. So $y$ is drawn from a bounded range, $[-\gamma,
\gamma]$ in each coefficient, and $z = y + cs$ lands in a range shifted by $cs$. Over many
signatures, the shift shows: the average of $c \cdot z$ is exactly $s$.

Vadim Lyubashevsky's fix (ASIACRYPT 2009) is **rejection sampling**: if any coefficient of
$z$ falls outside a slightly smaller range, $[-(\gamma - \beta), \gamma - \beta]$ where
$\beta$ bounds $|cs|$, throw it away and start again with a new $y$. Every $z$ that survives
is uniformly distributed in the smaller range, whatever $s$ is. The signer pays with
repeated attempts; the secret stays hidden.

**Code it.** A one-coefficient version: a secret $s$, masks from $[-1000, 1000]$, challenges
$\pm 1$, and an attacker who averages $c \cdot z$ over 20,000 signatures.

```python
import random

GAMMA, BETA = 1000, 60          # y is drawn from [-GAMMA, GAMMA]; |c*s| <= BETA

def sign_once(s, rnd, abort):
    while True:
        y = rnd.randint(-GAMMA, GAMMA)
        c = rnd.choice((-1, 1))                # the challenge, from a hash in real life
        z = y + c * s
        if not abort or abs(z) <= GAMMA - BETA:
            return c, z

def guess_secret(s, abort, n=20000, seed=3):
    """The attacker averages c*z over many signatures; E[c*z] = s without aborts."""
    rnd = random.Random(seed)
    total = 0
    for _ in range(n):
        c, z = sign_once(s, rnd, abort)
        total += c * z
    return total / n

for s in (-50, 17, 42):
    print("secret %4d: without aborts the attacker estimates %7.1f, with aborts %5.1f"
          % (s, guess_secret(s, False), guess_secret(s, True)))
```

Running it prints:

```
secret  -50: without aborts the attacker estimates   -52.5, with aborts  -1.7
secret   17: without aborts the attacker estimates    14.5, with aborts  -1.3
secret   42: without aborts the attacker estimates    39.5, with aborts  -2.6
```

Without aborts the attacker reads the secret off to within a few units after a few
thousand signatures. With aborts the average is zero up to sampling noise, whatever the
secret. In ML-DSA the same idea runs over 256 coefficients at once with several
additional checks, and the expected number of attempts per signature is about 4.25 for
ML-DSA-44, 5.1 for ML-DSA-65 and 3.85 for ML-DSA-87 (Chapter 9).

**The other main route** is **hash-and-sign**: hash the message to a point and use a
trapdoor to find a short preimage. RSA signatures work this way; for lattices, Craig
Gentry, Chris Peikert and Vinod Vaikuntanathan (GPV, 2008) showed how to do it safely by
sampling preimages from a discrete Gaussian distribution so that signatures reveal nothing
about the trapdoor. Falcon is a GPV signature (Chapter 10). Hash-based signatures (Chapters
11 and 12) are a third route, needing nothing but a hash function.

## 3.10 Building with KEMs: one-pass encryption and authenticated key exchange

*Level: intermediate.*

Two patterns cover most uses of a KEM, and both are worth seeing in miniature before the
standards' details arrive.

**One-pass encryption.** When the receiver's public key is known in advance, a sender can
encrypt with no round trip at all: encapsulate, derive a key, seal the message with an
authenticated cipher, and send the KEM ciphertext and the sealed message together. That is
HPKE's base mode, and it is the natural fit for links where a round trip is expensive. A
habitat on Mars, 3 to 22 light-minutes from Earth, cannot wait 40 minutes for a handshake
before every message. It publishes its encapsulation key once, through a channel Earth
trusts, and Earth sends sealed messages whenever it likes.

**Code it.** The program uses Diffie-Hellman as the KEM, over a group far too small for
real use, and a toy authenticated cipher built from SHAKE256 and HMAC, because Python's
standard library has no AES. Swap in ML-KEM and AES-GCM and the structure is exactly that of
HPKE with a post-quantum KEM.

```python
import hashlib, hmac, secrets

# A toy DH-KEM over a 2048-bit-style group would be slow to explain; use a small safe prime.
P = 2 ** 127 - 1          # a Mersenne prime; fine for a toy, far too small for real use
G = 3

def kem_keygen():
    dk = secrets.randbelow(P - 2) + 1
    return pow(G, dk, P), dk

def kem_encaps(ek):
    b = secrets.randbelow(P - 2) + 1
    c = pow(G, b, P)
    return kdf(pow(ek, b, P), c, ek), c

def kem_decaps(dk, c, ek):
    return kdf(pow(c, dk, P), c, ek)

def kdf(shared, c, ek):
    return hashlib.sha3_256(b"toy-dhkem" + b"%d|%d|%d" % (shared, c, ek)).digest()

def seal(key, msg):
    """A toy AEAD: SHAKE keystream plus HMAC tag. Use AES-GCM or ChaCha20-Poly1305 in practice."""
    nonce = secrets.token_bytes(16)
    stream = hashlib.shake_256(key + nonce).digest(len(msg))
    body = bytes(a ^ b for a, b in zip(msg, stream))
    tag = hmac.new(key, nonce + body, "sha256").digest()
    return nonce + body + tag

def open_(key, box):
    nonce, body, tag = box[:16], box[16:-32], box[-32:]
    if not hmac.compare_digest(tag, hmac.new(key, nonce + body, "sha256").digest()):
        raise ValueError("forged or corrupted")
    stream = hashlib.shake_256(key + nonce).digest(len(body))
    return bytes(a ^ b for a, b in zip(body, stream))

# The habitat publishes ek once; Earth sends sealed messages with no round trip.
ek, dk = kem_keygen()
K, c = kem_encaps(ek)
box = seal(K, b"Sol 412: new insulin doses for three patients attached.")
print("KEM ciphertext bytes:", (P.bit_length() + 7) // 8, "+ sealed message", len(box))
print("habitat reads:", open_(kem_decaps(dk, c, ek), box).decode())
tampered = box[:20] + bytes([box[20] ^ 1]) + box[21:]
try:
    open_(kem_decaps(dk, c, ek), tampered)
except ValueError as err:
    print("tampered copy:", err)
```

Running it prints:

```
KEM ciphertext bytes: 16 + sealed message 103
habitat reads: Sol 412: new insulin doses for three patients attached.
tampered copy: forged or corrupted
```

Notice what the one-pass pattern does not give. It has no forward secrecy against the
habitat's long-term key: anyone who later steals `dk` can open every recorded message. And it
does not authenticate the sender: anyone can encrypt to a public key. HPKE's other modes add
sender authentication with a pre-shared key or a sender KEM key; forward secrecy needs fresh
keys, which needs the round trip the pattern was avoiding. Delay-tolerant systems usually
compromise by rotating the receiver's key on a schedule and announcing the new key in
advance, so that a stolen key exposes only one period.

**Authenticated key exchange from KEMs.** When both sides are online, a KEM can do the job of
both Diffie-Hellman and the signature. Suppose Alice and Bob each have a long-term KEM key
pair. One way to get mutual authentication and forward secrecy is three encapsulations:

<div class="mars-steps" markdown>

1. Alice makes a fresh ephemeral KEM key pair and sends its public key $ek_e$, together with
   an encapsulation $c_B$ to Bob's long-term key (only Bob can decapsulate it).
2. Bob decapsulates $c_B$ to get $K_B$, encapsulates to the ephemeral key ($c_e$, giving
   $K_e$) and to Alice's long-term key ($c_A$, giving $K_A$), and sends $c_e$ and $c_A$.
3. Alice decapsulates both. Each side now holds $K_A$, $K_B$ and $K_e$ and derives the session
   key as $\text{KDF}(K_A, K_B, K_e, \text{transcript})$.
4. Only the real Bob could know $K_B$; only the real Alice could know $K_A$; and $K_e$, from a
   key pair deleted after the session, gives forward secrecy.

</div>

This is the shape of several published designs, among them the post-quantum variants of
Noise and the KEM-based handshakes studied for WireGuard (Rosenpass). Its cost is three
encapsulations and three decapsulations per session and a larger second message, against
the signature-based design's one encapsulation plus a signature and a certificate. Which is
cheaper depends on the scheme sizes: with ML-KEM and ML-DSA, the KEM-only design usually
sends fewer bytes, which is the case KEMTLS made for TLS.

## 3.11 Using a KEM safely: SP 800-227 and binding

*Level: intermediate.*

NIST's SP 800-227, *Recommendations for Key-Encapsulation Mechanisms*, published in
September 2025, collects the rules for using a KEM in a protocol. In plain terms:

- **Use the shared secret only through a key derivation function.** Feed $K$ and the
  protocol's transcript into an approved KDF and use its outputs; never use $K$ directly
  as several keys.
- **Know what the KEM does not do.** A KEM authenticates nobody. Bob knows that only the
  holder of $dk$ can recover $K$; Alice knows nothing about who sent $c$. Authentication
  comes from signatures, from a static KEM key of Bob's, or from a pre-shared key.
- **Treat key pairs according to their use.** Ephemeral keys, used once, are the safe
  default; static keys are allowed but make the KEM's CCA security essential.
- **Combine with care.** When two KEMs (or a KEM and Diffie-Hellman) are combined, as in
  the hybrids of Chapter 18, the combined secret must be derived so that it stays secret if
  either part is secure. SP 800-227 describes approved ways to do this, and SP 800-56C's
  key derivation methods accept the combined input.
- **Keep the private key's integrity.** Validate keys on input where the standard says to,
  as FIPS 203 does with its encapsulation-key and decapsulation-key checks.

**Binding.** A newer question is what a KEM's shared key is *bound* to. If two different
ciphertexts, or the same ciphertext under two different public keys, can decapsulate to the
same key, a protocol that assumes "same key, same conversation" can be confused. In 2024
Cas Cremers, Alexander Dax and Niklas Medinger defined a family of binding properties for
KEMs and analysed the standards; around the same time Sophie Schmieg showed that ML-KEM
with private keys stored in the expanded format does not bind the key to the ciphertext
against an adversary who can tamper with the stored private key, while storing only the
64-byte seed avoids the problem. FIPS 203 allows both formats; the practical advice that
emerged, and that many libraries now follow, is to store ML-KEM private keys as seeds, and
to put the ciphertext and public key into the protocol's key derivation anyway, which TLS
1.3's transcript hash already does.

!!! note "Life story: the Fujisaki-Okamoto transform"
    **Born:** 1999, Eiichiro Fujisaki and Tatsuaki Okamoto, "Secure integration of
    asymmetric and symmetric encryption schemes" (CRYPTO 1999); modular KEM version by
    Dennis Hofheinz, Kathrin Hövelmanns and Eike Kiltz (TCC 2017) · **Purpose:** to turn a
    weakly secure public-key scheme into a chosen-ciphertext secure one by re-encrypting
    and checking · **Helped:** ML-KEM, HQC, BIKE, Classic McEliece, FrodoKEM, NTRU, Saber
    and nearly every other post-quantum KEM; proven in the quantum random oracle model
    after 2017 · **Status:** current; the standard way to get CCA security

## 3.12 In the real world

*Level: intermediate.*

**TLS.** TLS 1.3 was designed around Diffie-Hellman but fits a KEM well, because the
client already sends its key share first and the server answers. In the hybrid
X25519MLKEM768 group, the client's key share carries an X25519 public value and an ML-KEM
encapsulation key (1,216 bytes in all); the server's share carries its X25519 value and an
ML-KEM ciphertext (1,120 bytes). The handshake's transcript hash covers both, which gives
the binding of §3.11 for free. Authentication still comes from the certificate's
signature, and that part of TLS was, as of November 2026, still mostly classical
(Chapter 18).

**Protocols that needed redesign.** Signal's X3DH handshake used several Diffie-Hellman
operations between long-term and one-time keys, relying on DH's symmetry to authenticate
implicitly. Its post-quantum version PQXDH (2023) keeps those and adds one KEM
encapsulation to a one-time Kyber key published by the recipient. WireGuard's Noise-based
handshake likewise relies on Diffie-Hellman between static keys; the post-quantum
extension Rosenpass (2023) rebuilds it around KEMs. KEMTLS, proposed by Peter Schwabe,
Douglas Stebila and Thom Wiggers in 2020, goes further and authenticates the TLS server
with a static KEM key instead of a signature, saving bytes and time; it has been studied
widely but not deployed at scale.

**Changes made during standardization.** The move from the third-round Kyber to FIPS 203
changed several details that this chapter explains: the key derivation no longer hashes the
ciphertext into $K$ (the transcript is expected to do that), implicit rejection derives the
rejection key with a separate function $J$, and key generation was given a domain
separator so that keys for different parameter sets made from the same seed are unrelated.
Implementations of the round-3 Kyber and of ML-KEM are not interoperable, which is why
TLS moved from the codepoint X25519Kyber768Draft00 to X25519MLKEM768 in 2024.

## 3.13 Going deeper

*Level: expert.*

**The FO family.** Hofheinz, Hövelmanns and Kiltz split FO into $T$ (derandomize and
re-encrypt, giving a one-way-secure deterministic PKE from an IND-CPA PKE) and four
variants of $U$: $U^{\not\perp}$ (implicit rejection, key $H(m, c)$), $U^{\perp}$
(explicit), and $U_m^{\not\perp}$, $U_m^{\perp}$ (key from $m$ alone). ML-KEM is closest to
$FO^{\not\perp}_m$ with the public-key hash added. The QROM proofs of these, by Jiang,
Zhang, Chen, Wang and Ma (2018), Saito, Xagawa and Yamakawa (2018), Bindel and others
(2019) and Don, Fehr, Majenz and Schaffner (2022), progressively removed the square-root
losses for some variants. A 2022 line of work showed that the QROM bound for
$FO^{\not\perp}$ can be made nearly tight in the failure probability term.

**Decryption failures in the QROM.** With failures, a quantum adversary can use Grover's
algorithm to search for ciphertexts that fail, and the bound picks up a term like
$q^2\delta$ for $q$ quantum queries. For $\delta = 2^{-164}$ and $q = 2^{64}$ that is still
negligible, which is part of why ML-KEM's failure rates sit so far below $2^{-128}$.

**Fiat-Shamir in the QROM.** Proofs of Fiat-Shamir signatures classically use "rewinding":
run the forger twice with different challenges to extract the secret. Rewinding a quantum
adversary is delicate, because copying its state is impossible. Liu and Zhandry (2019) and
Don, Fehr, Majenz and Schaffner (2019) gave QROM proofs for Fiat-Shamir under conditions
that Dilithium satisfies; Kiltz, Lyubashevsky and Schaffner (EUROCRYPT 2018) gave a
proof for Fiat-Shamir with aborts based on a "lossy" key argument that avoids rewinding
altogether.

**Non-interactive key exchange.** Diffie-Hellman's non-interactive form, where both public
keys are published and each party computes the shared key alone, has no efficient
post-quantum replacement among the standards. Lattice-based NIKE exists in theory but needs
very large parameters. CSIDH provides it and remains the subject of research on its
quantum cost (Chapter 16). Protocols that depend on NIKE, such as some anonymous
credentials and some group messaging designs, are among the hardest to migrate.

## Check yourself

??? question "1. Write Diffie-Hellman as a KEM: what are ek, dk, Encaps and Decaps?"

    $dk = a$, $ek = g^a$. Encaps picks a random $b$, outputs $c = g^b$ and $K =
    \text{KDF}(g^{ab})$ computed as $(g^a)^b$. Decaps outputs $\text{KDF}(c^a)$.

??? question "2. Why does a KEM need a symmetric cipher to encrypt a long message, and what is the combination called?"

    A KEM produces a random key, not an encryption of a chosen message. The key is used with
    an authenticated symmetric cipher (a DEM) to encrypt the message: the KEM/DEM paradigm,
    used in HPKE.

??? question "3. In the by-hand attack of §3.3, what answers would the attacker get if s_i = 0, and why does the pair (1, 0) never occur?"

    $(1, 1)$: with $s_i = 0$, $w = v$, and both 1664 and 2400 lie between 832 and 2497. The
    pair $(1, 0)$ would need the first query to decode 1 and the second 0; looking at the
    three cases, no value of $s_i \in \{-1, 0, 1\}$ produces it.

??? question "4. In the FO transform, why must encryption be made deterministic before the re-encryption check?"

    Because the check recomputes the ciphertext from the decrypted message. With random coins,
    an honest ciphertext could not be recomputed and every check would fail. Deriving the
    coins from the message, $G(m)$, lets the decapsulator rebuild the exact ciphertext.

??? question "5. What would an attacker learn if the FO decapsulation returned an error symbol on failure but took 10 microseconds longer to do so?"

    It would learn which ciphertexts were rejected, rebuilding a check oracle from which the
    attacker may again extract information about the key, especially when combined with
    decryption-failure searches. Implicit rejection and constant-time code together make the
    two branches indistinguishable.

??? question "6. Why does ML-KEM mix H(ek) into the derivation of K?"

    To bind the key to the public key and prevent multi-target attacks: a ciphertext made for
    one public key gives an unrelated key under another, so work against many keys at once
    gains nothing.

??? question "7. A KEM has failure probability 2^-80. Why is that unacceptable for a category 1 scheme even though nobody will observe 2^80 decapsulations?"

    Because an attacker can search offline for ciphertexts that are much more likely than
    average to fail (failure boosting) and submit only those. Each observed failure leaks
    information about the key, and the total cost of the attack can fall well below
    $2^{128}$. The failure rate must be below the security level with margin.

??? question "8. Why does a lattice Fiat-Shamir signature need rejection sampling while Schnorr's does not?"

    In Schnorr's scheme the mask is uniform modulo the group order, so $z = y + cs$ is uniform
    and independent of $s$. A lattice scheme needs small $z$, so the mask is bounded and $z$ is
    shifted by $cs$, leaking $s$ statistically. Rejecting $z$ outside a smaller range makes the
    output distribution independent of $s$.

??? question "9. Give one practical attack that EUF-CMA security does not rule out but exclusive ownership does."

    Duplicate signature key selection: given Alice's signature $\sigma$ on a message, an
    attacker constructs a new public key under which $\sigma$ also verifies, then claims
    authorship. Exclusive ownership means a signature verifies under only one key.

??? question "10. Why is storing an ML-KEM private key as a 64-byte seed recommended over the expanded format?"

    The expanded key contains several components (including the public key and its hash)
    that could be inconsistent if tampered with or corrupted, which weakens binding properties
    and opens fault-style attacks. A seed regenerates everything consistently, is small, and is
    the format many libraries and protocols now prefer.

## What you learned

- The post-quantum standards are KEMs and signatures, not Diffie-Hellman replacements. A
  KEM has a fixed order, key first and ciphertext second, and protocols have adapted to it.
- IND-CCA security is what real protocols need, because servers decapsulate whatever they
  are sent. A CPA-only lattice KEM with a reused key leaks its secret to crafted
  ciphertexts in a few dozen queries.
- The Fujisaki-Okamoto transform derandomizes encryption, re-encrypts to check every
  ciphertext and rejects implicitly with a key derived from a secret value, giving IND-CCA
  security in the quantum random oracle model.
- Decryption failures leak information and must be far rarer than the security level;
  ML-KEM's are $2^{-139}$ to $2^{-174}$.
- The QROM lets the attacker query hash functions in superposition; new proof techniques
  made the standards' proofs work there, with some loss of tightness.
- Signatures need unforgeability and often more: strong unforgeability, exclusive
  ownership, message binding. Hedged signing protects against both bad randomness and
  faults.
- Lattice Fiat-Shamir signatures hide their key by rejecting and retrying; GPV
  hash-and-sign and hash-based signatures are the other routes.
- SP 800-227 sets the rules for using KEMs: derive keys through a KDF, authenticate
  separately, combine carefully, validate keys, and prefer seeds for private keys.

**Next:** [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md), a field guide to the six
families of hard problems behind the new schemes.

## Further reading

- Whitfield Diffie and Martin Hellman, "New Directions in Cryptography", *IEEE
  Transactions on Information Theory* 22 (1976).
- Ronald Cramer and Victor Shoup, "Design and analysis of practical public-key encryption
  schemes secure against adaptive chosen ciphertext attack", *SIAM Journal on Computing*
  33 (2003).
- Eiichiro Fujisaki and Tatsuaki Okamoto, "Secure Integration of Asymmetric and Symmetric
  Encryption Schemes" (CRYPTO 1999).
- Dennis Hofheinz, Kathrin Hövelmanns and Eike Kiltz, "A Modular Analysis of the
  Fujisaki-Okamoto Transformation" (TCC 2017).
- Scott Fluhrer, "Cryptanalysis of ring-LWE based key exchange with key share reuse"
  (IACR ePrint 2016/085).
- Jan-Pieter D'Anvers, Qian Guo, Thomas Johansson, Alexander Nilsson, Frederik Vercauteren
  and Ingrid Verbauwhede, "Decryption failure attacks on IND-CCA secure lattice-based
  schemes" (PKC 2019).
- Mihir Bellare and Phillip Rogaway, "Random Oracles are Practical" (CCS 1993).
- Dan Boneh, Özgür Dagdelen, Marc Fischlin, Anja Lehmann, Christian Schaffner and Mark
  Zhandry, "Random Oracles in a Quantum World" (ASIACRYPT 2011).
- Dominique Unruh, "Revocable quantum timed-release encryption" (EUROCRYPT 2014; the
  one-way to hiding lemma), and Andris Ambainis, Mike Hamburg and Dominique Unruh, "Quantum
  security proofs using semi-classical oracles" (CRYPTO 2019).
- Mark Zhandry, "How to Record Quantum Queries, and Applications to Quantum
  Indifferentiability" (CRYPTO 2019).
- Vadim Lyubashevsky, "Fiat-Shamir with Aborts: Applications to Lattice and
  Factoring-Based Signatures" (ASIACRYPT 2009).
- Craig Gentry, Chris Peikert and Vinod Vaikuntanathan, "Trapdoors for Hard Lattices and
  New Cryptographic Constructions" (STOC 2008).
- Eike Kiltz, Vadim Lyubashevsky and Christian Schaffner, "A Concrete Treatment of
  Fiat-Shamir Signatures in the Quantum Random-Oracle Model" (EUROCRYPT 2018).
- Cas Cremers, Samed Düzlü, Rune Fiedler, Marc Fischlin and Christian Janson, "BUFFing
  signature schemes beyond unforgeability and the case of post-quantum signatures" (IEEE
  S&P 2021).
- Cas Cremers, Alexander Dax and Niklas Medinger, "Keeping Up with the KEMs: Stronger
  Security Notions for KEMs and Automated Analysis of KEM-based Protocols" (CCS 2024);
  Sophie Schmieg, "Unbindable Kemmy Schmidt: ML-KEM is neither MAL-BIND-K-CT nor
  MAL-BIND-K-PK" (IACR ePrint 2024/523).
- Peter Schwabe, Douglas Stebila and Thom Wiggers, "Post-Quantum TLS Without Handshake
  Signatures" (CCS 2020).
- RFC 9180, *Hybrid Public Key Encryption* (2022).
- SP 800-227, *Recommendations for Key-Encapsulation Mechanisms* (September 2025).
- FIPS 203 and FIPS 204 (August 2024).
