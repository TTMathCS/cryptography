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
    - why proofs in the quantum random oracle model lose tightness, what the compressed
      oracle does, and how Fiat-Shamir was proved there;
    - strong unforgeability and the BUFF properties, with the attacks that happen without
      them;
    - the rules NIST's SP 800-227 sets for using a KEM: key derivation, key confirmation,
      proof of possession and combiners, and KEMTLS as a KEM-only handshake;
    - what it means for a KEM's key to be bound to its ciphertext and public key, and why
      ML-KEM private keys are best stored as seeds.

    **You need:** [Chapter 2](02-Security-Levels.md); public-key encryption and the idea of a
    security game from book 1's [Chapter 17](../../book/17-Defining-Security.md); hash
    functions from book 1's [Chapter 9](../../book/09-Hash-Functions.md).

    **Levels:** §3.1 to §3.3 are for beginners, §3.4 to §3.13 are intermediate, §3.14 is
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

```text
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
analyzed by Jan-Pieter D'Anvers and colleagues from 2019, turns a failure probability of
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

```text
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

### Why a classical proof cannot watch the queries

A classical random-oracle proof of the FO transform makes two moves, and both depend on
seeing the adversary's hash queries one at a time.

The first move is **extraction**. The reduction must answer decapsulation queries without
$dk$. It records every query the adversary makes to $G$; when a ciphertext $c$ arrives, it
looks for a recorded $m$ with $\text{Enc}(ek, m; G(m)) = c$ and answers $H(m)$, or a random
key if there is none. An adversary could almost never build a valid ciphertext without
asking for $G(m)$ first, so its own queries tell the reduction which messages it knows.

The second move is **programming**. Given a challenge ciphertext $c^*$ of an unknown
message $m^*$, the reduction hands the adversary a random $K^*$ and quietly decides that
$H(m^*) = K^*$. If the adversary ever asks for $H(m^*)$, the reduction sees the query and
has found $m^*$, breaking one-wayness; if it never asks, $K^*$ is random to it.

A quantum adversary breaks both moves. Its query is a superposition, $\sum_x \alpha_x
|x\rangle|y\rangle$, answered by $\sum_x \alpha_x |x\rangle|y \oplus H(x)\rangle$, which
touches every $x$ with nonzero amplitude at once. There is no list (Figure 3.3). Looking at the query
means measuring it, which collapses the superposition, and an adversary that relies on
interference (Grover's algorithm is the standard example) may then behave quite differently,
so the proof says nothing about the real one. Programming fails too: a quantum query does
not ask about one point, it asks a little about every point, so there is no moment at which
the adversary "asked about $m^*$".

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Classical queries leave a readable list; a quantum superposition query leaves none, only a compressed database in superposition" fill="currentColor" font-size="14">
<text x="160" y="24" text-anchor="middle" font-weight="bold">Random oracle (ROM)</text>
<rect x="20" y="50" width="100" height="120" rx="6" fill="none" stroke="currentColor"/>
<text x="70" y="115" text-anchor="middle">adversary</text>
<rect x="200" y="50" width="100" height="120" rx="6" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="250" y="115" text-anchor="middle">oracle H</text>
<line x1="120" y1="70" x2="196" y2="70" stroke="currentColor" stroke-width="1.6"/>
<polygon points="196,65 200,70 196,75"/>
<text x="158" y="64" text-anchor="middle" font-size="12">x₁</text>
<line x1="120" y1="110" x2="196" y2="110" stroke="currentColor" stroke-width="1.6"/>
<polygon points="196,105 200,110 196,115"/>
<text x="158" y="104" text-anchor="middle" font-size="12">x₂</text>
<line x1="120" y1="150" x2="196" y2="150" stroke="currentColor" stroke-width="1.6"/>
<polygon points="196,145 200,150 196,155"/>
<text x="158" y="144" text-anchor="middle" font-size="12">x₃</text>
<rect x="150" y="190" width="150" height="76" rx="4" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="225" y="210" text-anchor="middle" font-size="12">the proof's list</text>
<text x="225" y="230" text-anchor="middle" font-size="12">x₁ → h₁, x₂ → h₂,</text>
<text x="225" y="250" text-anchor="middle" font-size="12">x₃ → h₃: read freely</text>
<text x="20" y="200" font-size="12">extract: scan the list</text>
<text x="20" y="220" font-size="12">program: change one</text>
<text x="20" y="238" font-size="12">answer, unseen</text>
<line x1="320" y1="20" x2="320" y2="280" stroke="currentColor" stroke-opacity=".3"/>
<text x="480" y="24" text-anchor="middle" font-weight="bold">Quantum random oracle (QROM)</text>
<rect x="340" y="50" width="100" height="120" rx="6" fill="none" stroke="currentColor"/>
<text x="390" y="115" text-anchor="middle">adversary</text>
<rect x="520" y="50" width="100" height="120" rx="6" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="570" y="115" text-anchor="middle">oracle H</text>
<line x1="440" y1="88" x2="516" y2="88" stroke="currentColor" stroke-width="4"/>
<polygon points="514,81 522,88 514,95"/>
<text x="478" y="78" text-anchor="middle" font-size="12">Σ αₓ|x, y⟩</text>
<line x1="520" y1="134" x2="444" y2="134" stroke="currentColor" stroke-width="4"/>
<polygon points="446,127 438,134 446,141"/>
<text x="480" y="158" text-anchor="middle" font-size="12">Σ αₓ|x, y⊕H(x)⟩</text>
<rect x="420" y="190" width="200" height="76" rx="4" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="520" y="210" text-anchor="middle" font-size="12">no list; to look is to measure</text>
<text x="520" y="230" text-anchor="middle" font-size="12">compressed oracle: a database</text>
<text x="520" y="250" text-anchor="middle" font-size="12">of at most q entries, in superposition</text>
<text x="340" y="200" font-size="12">one query</text>
<text x="340" y="218" font-size="12">touches every x</text>
</svg>
<figcaption>Figure 3.3. What a proof can see. In the ROM every query is a single input the proof can record and answer as it likes. In the QROM a query is a superposition over all inputs; the proof cannot read it without disturbing it, and Zhandry's compressed oracle replaces the list with a database kept in superposition.</figcaption>
</figure>

### By hand: what a square root costs

Unruh's one-way to hiding lemma replaces "the adversary asked about $m^*$" with something
that can be measured. Let $H$ and $H'$ be two oracles that differ only on a set $S$ (here,
$S = \{m^*\}$). Stop the adversary at one of its $q$ queries chosen at random, measure that
query, and let $\varepsilon$ be the probability that the measured input lies in $S$. The
lemma says that the adversary's output probabilities with $H$ and with $H'$ differ by at most
$2q\sqrt{\varepsilon}$. The classical counterpart is a union bound: the chance that some
query hits $S$ is at most $q\varepsilon$.

Put in numbers. Suppose that each guess at $m^*$ succeeds with probability $\varepsilon =
2^{-128}$, and the adversary makes $q = 2^{64}$ hash queries.

- The classical bound gives $q\varepsilon = 2^{64} \cdot 2^{-128} = 2^{-64}$.
- The original quantum bound gives $2q\sqrt{\varepsilon} = 2 \cdot 2^{64} \cdot 2^{-64} = 2$,
  which bounds a probability by 2 and says nothing at all.
- A bound of the shape $2\sqrt{q\varepsilon}$, which the semi-classical version of the lemma
  by Ambainis, Hamburg and Unruh (2019) reaches in good cases, gives $2\sqrt{2^{-64}} = 2
  \cdot 2^{-32} = 2^{-31}$: meaningful, but 33 bits weaker than the classical one.

Turn it around: to get $2^{-64}$ from $2q\sqrt{\varepsilon}$ with $q = 2^{64}$ would need
$\varepsilon \le 2^{-258}$. No one sets parameters that way. ML-KEM's numbers come from the
best known attacks on Module-LWE (Chapter 6); the proof is evidence that the construction
has no structural flaw, not a recipe for the key size.

**Code it.** The quantum adversary's extra power is that $q$ quantum queries find a marked
input with probability about $q^2/N$, not $q/N$. The program simulates Grover's algorithm on
the full state of a 1,024-entry table and compares it with classical guessing.

```python
from math import asin, sin, sqrt

N, MARKED = 1024, 700                 # a table of N inputs, one of them "bad"

def grover(q):
    """Simulate q quantum queries (Grover iterations) on the full state vector."""
    a = [1 / sqrt(N)] * N             # a uniform superposition over all inputs
    for _ in range(q):
        a[MARKED] = -a[MARKED]        # one oracle query: flip the sign of the bad input
        mean = sum(a) / N
        a = [2 * mean - x for x in a] # reflect every amplitude about the mean
    return a[MARKED] ** 2             # chance that measuring now finds it

theta = asin(1 / sqrt(N))
print(" q   classical q/N   quantum (simulated)   (2q+1)^2/N")
for q in (1, 2, 4, 8, 16, 25):
    print("%2d   %12.4f   %19.4f   %10.4f"
          % (q, q / N, grover(q), min(1, (2 * q + 1) ** 2 / N)))
print("formula sin^2((2q+1)theta) at q=25: %.4f" % sin(51 * theta) ** 2)
```

It prints:

```text
 q   classical q/N   quantum (simulated)   (2q+1)^2/N
 1         0.0010                0.0088       0.0088
 2         0.0020                0.0242       0.0244
 4         0.0039                0.0771       0.0791
 8         0.0078                0.2567       0.2822
16         0.0156                0.7362       1.0000
25         0.0244                0.9995       1.0000
formula sin^2((2q+1)theta) at q=25: 0.9995
```

With 25 queries the quantum searcher almost surely finds the bad input; the classical one
has a 2.4 percent chance. Quantum success grows like $(2q+1)^2/N$ until it saturates, which
is why QROM bounds on decryption failures carry a term like $q^2\delta$ where classical
ones have $q\delta$ (§3.14). And every query acted on all 1,024 amplitudes: a proof that
wants to "record the query" has nothing to record.

### The compressed oracle in plain words

Classical proofs simulate a random oracle by **lazy sampling**: answer each new query with a
fresh random value and write it down. Mark Zhandry (CRYPTO 2019) found a quantum version of
the table. Treat the random function as a register holding a superposition of all
functions; in the Fourier basis, an input never queried sits in a fixed "untouched" state
that can be compressed away, so the register becomes a database of at most $q$ input-output
pairs, itself in superposition, updated by each query.

This gives back much of the classical toolkit. At the end of a game a proof may measure the
database and argue as if it were a list: an adversary that outputs $(x, H(x))$ for an $x$
not in the database was lucky, with probability about $2^{-n}$ for $n$-bit outputs. Don,
Fehr, Majenz and Schaffner (EUROCRYPT 2022) used it to extract a message from a ciphertext
"online", during the attack, which is what the FO decapsulation simulation needs.

### The FO proofs in order

The QROM proofs behind ML-KEM came in steps. Hofheinz, Hövelmanns and Kiltz (2017) covered
the QROM only for variants with an extra hash in the ciphertext. Saito, Xagawa and Yamakawa
and, separately, Jiang, Zhang, Chen, Wang and Ma (2018) proved implicit rejection without it,
the first tightly for perfectly correct schemes, the second in general with a square-root
loss. Bindel, Hamburg, Hövelmanns, Hülsing and Persichetti (2019) tightened the bounds with
decryption failures; Kuchta, Sakzad, Stehlé, Steinfeld and Sun (2020) removed the square
root when starting from IND-CPA, at the price of a larger factor in $q$; and Hövelmanns,
Hülsing and Majenz ("Failing gracefully", 2022) reworked how failures are counted, without a
Grover-search bound.

### Fiat-Shamir in the QROM

Signatures built with Fiat-Shamir face the same problem from another side. The classical
proof uses the **forking lemma** of David Pointcheval and Jacques Stern (1996): run the
forger until it outputs a forgery, rewind it to the hash query that produced the challenge,
give a different answer, and run it again. Two valid responses to one commitment reveal the
secret key. A quantum forger cannot be rewound in this way, because its state cannot be
copied, and "the hash query that produced the challenge" is not one query.

Three answers appeared. Eike Kiltz, Vadim Lyubashevsky and Christian Schaffner (EUROCRYPT
2018) avoided rewinding with **lossy keys**: swap the public key for one with no secret
behind it, which Module-LWE makes indistinguishable, and forging becomes statistically
hopeless; Dilithium's proof follows this route. Jelle Don, Serge Fehr, Christian Majenz and
Christian Schaffner (CRYPTO 2019) proved a **measure-and-reprogram** lemma: measure one
random query, reprogram the oracle there with a fresh challenge, and the forger still
succeeds with at least its original probability divided by about $q^2$. In the same year
Qipeng Liu and Mark Zhandry found mild conditions under which Fiat-Shamir stays secure and
showed that existing lattice signatures meet them. A factor $q^2$ is $2^{128}$ for $q =
2^{64}$: again the proof rules out structural flaws, and attacks set the numbers.

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

### Strong unforgeability, by hand

The gap between EUF-CMA and SUF-CMA is easiest to see on a toy Schnorr signature. Work in
the group of order $q = 11$ generated by $g = 4$ modulo $p = 23$ (so $4^{11} \equiv 1$). The
signer's secret is $x = 3$ and the public key is $y = 4^3 = 64 \equiv 18 \pmod{23}$.

To sign, pick $k = 5$, so $R = 4^5 = 1024 \equiv 12$. Suppose the hash of $R$, $y$ and the
message gives the challenge $c = 7$. The response is $s = k + cx = 5 + 21 = 26 \equiv 4
\pmod{11}$, and the signature is $(R, s) = (12, 4)$.

To verify, check $g^s = R \cdot y^c$. The left side is $4^4 = 256 \equiv 3$. On the right,
$18 \equiv -5$, and $(-5)^7 = -(5^7)$; since $5^2 \equiv 2$, $5^4 \equiv 4$ and $5^6 \equiv 8$,
$5^7 \equiv 40 \equiv 17$, so $y^7 \equiv -17 \equiv 6$, and $R \cdot y^7 = 12 \cdot 6 = 72
\equiv 3$. The signature verifies.

Now take $s' = s + q = 15$. The exponent of $g$ only matters modulo 11, so $4^{15} = 4^{11}
\cdot 4^4 \equiv 3$, and $(12, 15)$ verifies too. Nobody learned the secret and no new
message was signed, so EUF-CMA is untouched. But a second, different signature on the same
message now exists, made by someone who is not the signer. If a system uses the signature
bytes as an identifier, it has two identifiers for one act. The fix is one line in the
verifier: reject unless $0 \le s < q$.

This is not a classroom curiosity. Ed25519's scalar $S$ must be below the group order $L$;
RFC 8032 (2017) requires the check, but a 2020 survey ("Taming the many EdDSAs" by
Konstantinos Chalkias, François Garillot and Valeria Nikolaenko) found libraries that
differed on it and on other checks. With the check, Ed25519 is SUF-CMA (Brendel, Cremers,
Jackson and Zhao, 2021). In ECDSA, $(r, s)$ and $(r, n - s)$ both verify: the malleability
behind Bitcoin's transaction-ID confusion of 2014, which Bitcoin Core answered by refusing
to relay the "high-$s$" form in 2015 and Segregated Witness (2017) by taking signatures out
of the transaction ID. ML-DSA's verifier rejects any hint not in its one canonical encoding,
a check that exists for strong unforgeability (Chapter 9).

**Code it.** The same toy at a slightly larger size ($p = 2039$, $q = 1019$), with two
verifiers: a lax one that checks only the equation, and a strict one that also checks the
range of $s$ and that the public key is a proper element of the group. The second half of the
program plays a malicious signer who publishes the public key $y = 1$.

```python
import hashlib, random

P, Q, G = 2039, 1019, 4            # P = 2Q + 1; G generates the subgroup of order Q

def h(R, y, msg):
    data = b"%d|%d|" % (R, y) + msg
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % Q

def sign(x, msg, rnd):
    k = rnd.randrange(1, Q)
    R = pow(G, k, P)
    return R, (k + h(R, pow(G, x, P), msg) * x) % Q

def verify(y, msg, sig, strict):
    R, s = sig
    if strict and not (0 <= s < Q and 1 < y < P and pow(y, Q, P) == 1):
        return False                     # range check on s, and a valid, non-trivial key
    return pow(G, s, P) == R * pow(y, h(R, y, msg), P) % P

rnd = random.Random(7)
x = rnd.randrange(1, Q); y = pow(G, x, P)
R, s = sign(x, b"pay 10 credits to habitat B", rnd)
twin = (R, s + Q)                        # same R, s shifted by the group order
for strict in (False, True):
    print("strict" if strict else "lax   ",
          "original:", verify(y, b"pay 10 credits to habitat B", (R, s), strict),
          " twin:", verify(y, b"pay 10 credits to habitat B", twin, strict))

# A malicious signer publishes y = 1 and signs nothing at all.
s_any = 123
sig_any = (pow(G, s_any, P), s_any)
msgs = [b"I owe you 5", b"I owe you 5000", b"open airlock 3", b"close airlock 3"]
print("key y=1, one signature, lax:   ", [verify(1, m, sig_any, False) for m in msgs])
print("key y=1, one signature, strict:", [verify(1, m, sig_any, True) for m in msgs])
```

It prints:

```text
lax    original: True  twin: True
strict original: True  twin: False
key y=1, one signature, lax:    [True, True, True, True]
key y=1, one signature, strict: [False, False, False, False]
```

The second result is a failure of **message binding**. With $y = 1$ the term $y^c$ is 1
whatever the challenge, so $(g^s, s)$ verifies for every message, and the "signer" can later
claim to have signed whichever one suits it: "I owe you 5" in one court, "I owe you 5000" in
another. EUF-CMA says nothing here, because it assumes an honestly generated key. Ed25519 has
the real version of this: a public key of small order makes one signature valid for many
messages, which is why careful verifiers reject such keys.

### What goes wrong without BUFF

**Duplicate signature key selection** has hurt real protocols. In August 2015, before Let's
Encrypt opened to the public, Andrew Ayer showed that its draft ACME protocol could be
subverted: an attacker could compute a new RSA key under which a domain owner's published
signature also verified, and so pass the domain check for a domain it did not control. The
fix bound the account key into the challenge. Exclusive ownership in the signature scheme
would have ruled the attack out whatever the protocol did.

**Non-resignability** matters where a signer signs the hash of something it does not show,
such as a commitment. It is the hardest property to define: in 2024 Jelle Don, Serge Fehr,
Yu-Hsuan Huang and Patrick Struck showed the original definition cannot be met in general,
and refined versions that the BUFF transform does meet followed the same year.

**The BUFF transform** gives all three properties to any scheme: sign $h = H(m, pk)$ and
attach $h$ to the signature. It costs one hash output per signature. Falcon as submitted had
message binding but neither exclusive ownership nor non-resignability; adding the transform
would add 64 bytes, and Samed Düzlü, Rune Fiedler and Marc Fischlin (2024) proposed a way to
get the properties for Falcon without any growth. ML-DSA gets them from hashing $tr = H(pk)$
into $\mu$, as described above; Chapter 9 shows it in code.

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

```text
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

# A toy DH-KEM: a real group would be slow to explain, so use a 127-bit Mersenne prime.
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

```text
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

### KEMTLS, step by step

KEMTLS (Peter Schwabe, Douglas Stebila and Thom Wiggers, 2020) is the one-sided version of
that design, fitted into TLS 1.3. Only the server is authenticated, as on most of the web,
and its certificate carries a static ML-KEM encapsulation key instead of a signature key.
Figure 3.4 shows the flow.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="KEMTLS: ephemeral key from the client, ciphertext and certificate with a static KEM key from the server, a ciphertext to that key from the client, then the server Finished message" fill="currentColor" font-size="14">
<text x="90" y="24" text-anchor="middle" font-weight="bold">Client</text>
<text x="550" y="24" text-anchor="middle" font-weight="bold">Server</text>
<line x1="90" y1="34" x2="90" y2="316" stroke="currentColor"/>
<line x1="550" y1="34" x2="550" y2="316" stroke="currentColor"/>
<line x1="90" y1="60" x2="546" y2="80" stroke="currentColor" stroke-width="1.6"/>
<polygon points="544,74 552,80 544,86"/>
<text x="320" y="62" text-anchor="middle">ClientHello + ephemeral ek_e</text>
<line x1="550" y1="110" x2="94" y2="130" stroke="currentColor" stroke-width="1.6"/>
<polygon points="96,124 88,130 96,136"/>
<text x="320" y="108" text-anchor="middle">ciphertext c_e, certificate with static ek_S</text>
<text x="560" y="104" font-size="12">K_e ← Encaps(ek_e)</text>
<text x="10" y="156" font-size="12">K_e ← Decaps</text>
<text x="10" y="172" font-size="12">K_S ← Encaps(ek_S)</text>
<line x1="90" y1="190" x2="546" y2="210" stroke="currentColor" stroke-width="1.6"/>
<polygon points="544,204 552,210 544,216"/>
<text x="320" y="192" text-anchor="middle">ciphertext c_S, client Finished, first data</text>
<text x="560" y="236" font-size="12">K_S ← Decaps(dk_S)</text>
<line x1="550" y1="250" x2="94" y2="270" stroke="currentColor" stroke-width="1.6"/>
<polygon points="96,264 88,270 96,276"/>
<text x="320" y="248" text-anchor="middle">server Finished: proves it knew K_S</text>
<rect x="100" y="286" width="440" height="30" rx="4" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="320" y="306" text-anchor="middle" font-size="12">server explicitly authenticated only here, one round trip later than in TLS 1.3</text>
</svg>
<figcaption>Figure 3.4. KEMTLS. The ephemeral exchange ($ek_e$, $c_e$) gives forward secrecy; the encapsulation to the certified static key $ek_S$ replaces the server's signature. Only the holder of $dk_S$ can derive keys that make the server's Finished message verify.</figcaption>
</figure>

The client's first application data goes out in its second flight, as in TLS 1.3, under
keys only the real server can derive: the server is *implicitly* authenticated. *Explicit*
authentication comes with the server's Finished message, a full round trip later than in
TLS 1.3, where the signature in the server's first reply does that job. And the server
cannot send data in its first reply, because it does not yet hold $K_S$.

**By hand: the bytes saved.** Count what authenticates the server. In TLS 1.3 with
ML-DSA-44 the certificate carries a 1,312-byte public key and CertificateVerify a 2,420-byte
signature: 3,732 bytes. In KEMTLS with ML-KEM-768 the certificate carries a 1,184-byte
encapsulation key and the client sends a 1,088-byte ciphertext: 2,272 bytes, 1,460 fewer.
Against ML-DSA-65 (1,952 + 3,309 = 5,261 bytes) the saving is 2,989 bytes. The CA's
signature and the ephemeral exchange are the same in both, and a decapsulation costs the
server less than a signature.

**Pre-distributed keys.** A follow-up by the same authors (ESORICS 2021) lets a client that
already holds the server's static key, cached or installed with the software, encapsulate
to it in its very first message, so the server is authenticated a round trip sooner. That
fits the Mars link of this section: Earth knows the habitat's key in advance, and the 6- to
44-minute round trip is paid once, not twice, before Earth has explicit proof that it is
talking to the habitat.

## 3.11 Using a KEM safely: SP 800-227

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

### What is in the document

SP 800-227 explains as well as rules. Section 2 defines KEMs and their security as in §3.2
and §3.3; section 3 covers implementation and validation; section 4 covers KEMs in
applications: key establishment, key confirmation, proof of possession and hybrids; section
5 gives examples. It also notes that NIST had KEMs before the post-quantum standards: ECDH
from SP 800-56A written as in §3.2, and RSA-OAEP key transport.

The examples are the patterns this chapter has built: a KEM with a symmetric cipher (the
KEM/DEM of §3.2); key exchange authenticated by signatures, as in TLS 1.3; and, new in the
final version, authentication with KEMs alone. In the **unilateral** example the client
checks the certificate on the server's static key $ek_A$, encapsulates to it to get $(K_A,
c_A)$, and sends $c_A$ with a fresh ephemeral key $ek_B$; the server decapsulates $K_A$ and
encapsulates to $ek_B$ to get $(K_B, c_B)$; both output $H(K_A, K_B)$. That is KEMTLS in
miniature. The **bilateral** example adds a static client key, the three-encapsulation shape
of §3.10. Both follow the key exchanges of the original 2018 Kyber paper.

### Static keys and proof of possession

The final version draws a sharp line. A key pair is **ephemeral** if it is used for one key
establishment and then destroyed; every other key pair is **static**, and whoever relies on
a static encapsulation key, such as a certificate authority about to certify it, should
have assurance that its owner holds the matching decapsulation key.

With signature keys, **proof of possession** means signing something. A KEM key cannot sign,
so SP 800-227 describes a challenge: the verifier encapsulates to the key, getting $(K,
c_1)$, encrypts a fresh random challenge under $K$ as $c_2$, and sends both; only the holder
of $dk$ can return the challenge. That costs a round trip a signature does not.

### Key confirmation

A KEM leaves each side believing, without proof, that the other has the same key. **Key
confirmation** supplies the proof: one party sends a MAC, under a key derived from the
shared secret, over data naming the parties and the exchanged values; the other recomputes
and compares. As in NIST's older key-establishment standards such as SP 800-56A, the
confirmation key is derived alongside the session keys, used with an approved MAC such as
HMAC or KMAC for nothing else, and then erased. Figure 3.5 shows the composition.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The KEM secret and the context go into a KDF, which outputs a key-confirmation key for a MAC tag and a session key for an authenticated cipher" fill="currentColor" font-size="14">
<rect x="20" y="30" width="130" height="44" rx="6" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="85" y="57" text-anchor="middle">Encaps(ek)</text>
<rect x="20" y="150" width="170" height="64" rx="6" fill="none" stroke="currentColor"/>
<text x="105" y="174" text-anchor="middle" font-size="12">context: labels, ids,</text>
<text x="105" y="192" text-anchor="middle" font-size="12">ek, c, OtherInput</text>
<rect x="240" y="100" width="110" height="70" rx="6" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
<text x="295" y="140" text-anchor="middle" font-weight="bold">KDF</text>
<line x1="85" y1="74" x2="236" y2="118" stroke="currentColor" stroke-width="1.6"/>
<polygon points="232,112 240,119 230,121"/>
<text x="150" y="104" font-size="12">K</text>
<line x1="190" y1="170" x2="236" y2="150" stroke="currentColor" stroke-width="1.6"/>
<polygon points="231,146 240,148 234,155"/>
<rect x="410" y="80" width="210" height="44" rx="6" fill="none" stroke="currentColor"/>
<text x="515" y="107" text-anchor="middle" font-size="13">tag = MAC(kc, label, ids, ek, c)</text>
<rect x="410" y="150" width="210" height="44" rx="6" fill="none" stroke="currentColor"/>
<text x="515" y="177" text-anchor="middle" font-size="13">box = AEAD(session key, M)</text>
<line x1="350" y1="120" x2="406" y2="104" stroke="currentColor" stroke-width="1.6"/>
<polygon points="402,99 410,103 404,109"/>
<text x="372" y="102" font-size="12">kc</text>
<line x1="350" y1="152" x2="406" y2="170" stroke="currentColor" stroke-width="1.6"/>
<polygon points="402,165 410,172 401,175"/>
<text x="356" y="182" font-size="12">session key</text>
<line x1="150" y1="52" x2="560" y2="52" stroke="currentColor" stroke-dasharray="5 4"/>
<polygon points="556,47 564,52 556,57"/>
<text x="580" y="56" font-size="12">c</text>
<rect x="20" y="246" width="600" height="36" rx="4" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="320" y="269" text-anchor="middle" font-size="13">on the wire: c, then the tag (from whoever confirms), then the sealed messages</text>
</svg>
<figcaption>Figure 3.5. A KEM in use. The shared secret never touches data directly: a KDF turns it and the context into a key-confirmation key, used once for a MAC tag and then erased, and a session key for the authenticated cipher.</figcaption>
</figure>

**Code it.** The program reuses the toy DH-KEM of §3.10. The habitat owns the encapsulation
key; Earth encapsulates; both run the same key schedule with an unambiguous encoding of
every input; the habitat sends a confirmation tag. In the second run an attacker flips one
bit of the ciphertext in transit. The first part of the program shows why the encoding
matters, with the combiner rule of the next subsection.

```python
# Uses kem_keygen(), kem_encaps() and kem_decaps() from the listing above.
import hashlib, hmac

def encode(*parts):
    """Unambiguous encoding: each field is preceded by its 4-byte length."""
    out = b""
    for p in parts:
        p = p if isinstance(p, bytes) else str(p).encode()
        out += len(p).to_bytes(4, "big") + p
    return out

def derive(label, *parts, length=64):
    return hashlib.shake_256(encode(label, *parts)).digest(length)

def naive(label, *parts):
    return hashlib.shake_256(label + b"".join(parts)).digest(64)

# 1. Commas, not bare concatenation.
print("naive combiner, different inputs, same key:",
      naive(b"combine", b"ab", b"c") == naive(b"combine", b"a", b"bc"))
print("encoded combiner, different inputs:        ",
      derive(b"combine", b"ab", b"c") == derive(b"combine", b"a", b"bc"))

# 2. Key establishment with key confirmation. The habitat (U) owns ek; Earth (V) encapsulates.
ek, dk = kem_keygen()

def schedule(K, c):
    keys = derive(b"KDF", K, "habitat-7", "earth-ops", ek, c)
    return keys[:32], keys[32:]          # key-confirmation key, session key

def run(tamper):
    K, c = kem_encaps(ek)                # Earth
    kc_v, session_v = schedule(K, c)
    c_seen = c ^ 1 if tamper else c      # what reaches the habitat
    kc_u, session_u = schedule(kem_decaps(dk, c_seen, ek), c_seen)
    tag = hmac.new(kc_u, encode("KC_1_U", "habitat-7", "earth-ops", ek, c_seen),
                   "sha256").digest()    # the habitat's confirmation, sent back to Earth
    expect = hmac.new(kc_v, encode("KC_1_U", "habitat-7", "earth-ops", ek, c),
                      "sha256").digest()
    return hmac.compare_digest(tag, expect), session_u == session_v

print("honest run:  confirmed %s, same session key %s" % run(False))
print("altered ct:  confirmed %s, same session key %s" % run(True))
```

It prints:

```text
naive combiner, different inputs, same key: True
encoded combiner, different inputs:         False
honest run:  confirmed True, same session key True
altered ct:  confirmed False, same session key False
```

Without confirmation, the altered run would have looked fine until the first message failed
to decrypt; with it, Earth knows before sending anything sensitive. On a Mars link the
habitat's tag reaches Earth a full round trip, 6 to 44 minutes, after Earth sent the
ciphertext. Systems that cannot wait rely on **implicit** confirmation: Earth sends its first
sealed message at once, and the habitat's first successful decryption confirms Earth's key;
Earth learns the same about the habitat only from an authenticated reply. Explicit
confirmation is an option in NIST's key-establishment schemes, not a requirement; a protocol
without it should say what it relies on instead.

### Combining two KEMs: commas, not concatenation

For hybrids, SP 800-227 describes running two KEMs side by side, with encapsulation keys
$ek_1, ek_2$, ciphertexts $c_1, c_2$ and shared secrets $K_1, K_2$, and deriving one key with
an approved KDF from all of them:

$$\kappa = \text{KDF}(K_1, K_2, ek_1, ek_2, c_1, c_2, \text{OtherInput}).$$

The draft of January 2025 wrote the input as a concatenation, $K_1 \| K_2 \| ek_1 \| \dots$;
the final version of September 2025 writes commas. The change is deliberate. Concatenation
of variable-length strings is ambiguous: $(\texttt{ab}, \texttt{c})$ and $(\texttt{a},
\texttt{bc})$ both concatenate to $\texttt{abc}$, so two different sets of inputs give the
same key, as the first line of the program showed. ML-KEM's secrets are always 32 bytes,
but encapsulation keys and ciphertexts differ in length between parameter sets and schemes,
and OtherInput can be anything. Commas mean "encode so that the parts can be told apart",
for example with a length before each field.

The rule extends one in SP 800-56C Rev. 2, which already let a key derivation take an
approved shared secret followed by an auxiliary secret from another source. [Chapter
18](18-Hybrids-and-the-Migration.md) shows the details: TLS's hybrid groups concatenate
fixed-length secrets and rely on the transcript hash, and X-Wing hashes in exactly the
values that ML-KEM does not already bind, the subject of the next section.

!!! note "Life story: the Fujisaki-Okamoto transform"
    **Born:** 1999, Eiichiro Fujisaki and Tatsuaki Okamoto, "Secure integration of
    asymmetric and symmetric encryption schemes" (CRYPTO 1999); modular KEM version by
    Dennis Hofheinz, Kathrin Hövelmanns and Eike Kiltz (TCC 2017) · **Purpose:** to turn a
    weakly secure public-key scheme into a chosen-ciphertext secure one by re-encrypting
    and checking · **Helped:** ML-KEM, HQC, BIKE, Classic McEliece, FrodoKEM, NTRU, Saber
    and nearly every other post-quantum KEM; proven in the quantum random oracle model
    after 2017 · **Status:** current; the standard way to get CCA security

## 3.12 Binding: what a KEM's key is tied to

*Level: intermediate.*

IND-CCA security says that an outsider learns nothing about the key, not what the key is
*bound* to. If two different ciphertexts, or one ciphertext under two public keys, can
decapsulate to the same key, a protocol that assumes "same key, same conversation" can be
confused: a malicious party may splice two sessions so that their keys agree although their
transcripts differ, a KEM version of the unknown-key-share attack. In 2024 Cas Cremers,
Alexander Dax and Niklas Medinger named these properties and analyzed the standards;
Sophie Schmieg sharpened the results for ML-KEM the same year.

### The definitions

The properties are written **X-BIND-P-Q**. Read "P binds Q": whenever two decapsulations that
both output a key agree on P, they also agree on Q. P and Q are drawn from the shared key K, the
ciphertext CT and the public key PK, so K-CT says "same key implies same ciphertext" and K-PK
says "same key implies same public key". The prefix X says how strong the adversary is:

- **HON**: key pairs are generated honestly and the private keys stay secret;
- **LEAK**: key pairs are generated honestly, but the adversary sees the private keys;
- **MAL**: the adversary builds the key pairs itself, as arbitrary byte strings, including
  private keys that no honest key generation would produce.

MAL implies LEAK, which implies HON. MAL matters wherever an attacker can choose or tamper
with a key: a malicious peer, a corrupted key file, a hardware module fed a crafted key.

### By reasoning: why ML-KEM binds at the LEAK level

ML-KEM derives $(K, r) = G(m \,\|\, H(ek))$ and, on rejection, $\bar K = J(z \,\|\, c)$. Take
two decapsulations, under honestly generated keys, that output the same $K$, and follow the
cases.

1. **Both accepted.** Then $G(m \,\|\, H(ek)) = G(m' \,\|\, H(ek'))$ in their first halves.
   Short of a hash collision, $m = m'$ and $H(ek) = H(ek')$, so $ek = ek'$. Encryption with
   the FO transform is deterministic in $m$ and $ek$, and both ciphertexts passed the
   re-encryption check, so $c = c'$. Both K-CT and K-PK hold.
2. **Both rejected.** Then $J(z \,\|\, c) = J(z' \,\|\, c')$, which again needs a collision
   unless $z = z'$ and $c = c'$.
3. **One accepted, one rejected.** The key from $G$ would have to equal the key from $J$:
   a collision between two different hash constructions.

So ML-KEM is LEAK-BIND-K-CT and LEAK-BIND-K-PK, as Cremers, Dax and Medinger showed. The
argument silently assumed that decapsulation uses the true $ek$ and its true hash.

### Where MAL fails, and why seeds fix it

FIPS 203's expanded decapsulation key holds the secret vector, a copy of $ek$, the hash
$H(ek)$ and $z$, and decapsulation trusts the stored hash rather than recomputing it. A
malicious key builder can make these parts disagree, for example two private keys with
different public keys but the same stored hash. Schmieg ("Unbindable Kemmy Schmidt", 2024)
showed that such keys defeat both MAL-BIND-K-CT and MAL-BIND-K-PK. Stored as the 64-byte
seed $(d, z)$, every part is recomputed on use and none can disagree with another; ML-KEM
then reaches MAL-BIND-K-CT, with K-PK at the LEAK level. Figure 3.6 sums
up. [Chapter 8](08-ML-KEM.md) covers the seed format and the RFC that recommends it.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Binding properties: ML-KEM with expanded keys has both LEAK properties but no MAL property; with seed keys it adds MAL-BIND-K-CT; DHKEM has all four" fill="currentColor" font-size="14">
<rect x="20" y="20" width="600" height="40" fill="currentColor" fill-opacity=".12"/>
<text x="30" y="45" font-weight="bold">KEM</text>
<text x="300" y="38" text-anchor="middle" font-size="12" font-weight="bold">LEAK-BIND</text>
<text x="300" y="54" text-anchor="middle" font-size="12" font-weight="bold">K-CT</text>
<text x="390" y="38" text-anchor="middle" font-size="12" font-weight="bold">LEAK-BIND</text>
<text x="390" y="54" text-anchor="middle" font-size="12" font-weight="bold">K-PK</text>
<text x="480" y="38" text-anchor="middle" font-size="12" font-weight="bold">MAL-BIND</text>
<text x="480" y="54" text-anchor="middle" font-size="12" font-weight="bold">K-CT</text>
<text x="570" y="38" text-anchor="middle" font-size="12" font-weight="bold">MAL-BIND</text>
<text x="570" y="54" text-anchor="middle" font-size="12" font-weight="bold">K-PK</text>
<text x="30" y="90">ML-KEM, expanded private key</text>
<text x="300" y="90" text-anchor="middle">yes</text><text x="390" y="90" text-anchor="middle">yes</text>
<text x="480" y="90" text-anchor="middle" font-weight="bold">no</text><text x="570" y="90" text-anchor="middle" font-weight="bold">no</text>
<line x1="20" y1="104" x2="620" y2="104" stroke="currentColor" stroke-opacity=".3"/>
<text x="30" y="130">ML-KEM, 64-byte seed</text>
<text x="300" y="130" text-anchor="middle">yes</text><text x="390" y="130" text-anchor="middle">yes</text>
<text x="480" y="130" text-anchor="middle">yes</text><text x="570" y="130" text-anchor="middle" fill-opacity=".7">not shown</text>
<line x1="20" y1="144" x2="620" y2="144" stroke="currentColor" stroke-opacity=".3"/>
<text x="30" y="170">DHKEM (RFC 9180)</text>
<text x="300" y="170" text-anchor="middle">yes</text><text x="390" y="170" text-anchor="middle">yes</text>
<text x="480" y="170" text-anchor="middle">yes</text><text x="570" y="170" text-anchor="middle">yes</text>
<line x1="20" y1="184" x2="620" y2="184" stroke="currentColor" stroke-opacity=".3"/>
<text x="30" y="210" font-size="12" fill-opacity=".7">A bare X25519 output (as in TLS's hybrid input) binds neither ciphertext nor key by itself;</text>
<text x="30" y="230" font-size="12" fill-opacity=".7">TLS gets the binding from its transcript hash, X-Wing from its combiner (Chapter 18).</text>
</svg>
<figcaption>Figure 3.6. Binding properties of ML-KEM in its two key formats and of DHKEM, from Cremers, Dax and Medinger (2024), Schmieg (2024) and the IETF analysis of ML-KEM in HPKE. "Yes" at the MAL level implies yes at the LEAK level. DHKEM gets its strength by hashing the ciphertext and the recipient's public key into every key.</figcaption>
</figure>

### DHKEM and bare X25519

The DHKEM of RFC 9180 hashes the Diffie-Hellman output together with the ciphertext (the
sender's ephemeral public value) and the recipient's public key, so any change to either
changes the key, whatever the adversary did: MAL-BIND-K-CT and MAL-BIND-K-PK. ML-KEM gets
its binding more cheaply, from the re-encryption check instead of hashing a 1,088-byte
ciphertext, but only as strongly as the decapsulation key is honest.

A bare X25519 output, as fed into TLS's hybrid key schedule, binds nothing on its own.
RFC 7748 tells implementations to ignore the top bit of a 32-byte public value, so every
value has two encodings, and to accept non-canonical values $u \ge p = 2^{255} - 19$ and
reduce them, so the nineteen smallest values have more. Different ciphertexts, same shared
secret. Worse, the handful of low-order points give the all-zero output whatever the private
key, so one ciphertext yields the same "key" under every public key; RFC 7748 lets
implementations check for and reject that output. None of this hurts TLS, whose transcript
hash covers every key share, but it is why X-Wing hashes X25519's ciphertext and public key
into its combiner and can leave out ML-KEM's
([Chapter 18](18-Hybrids-and-the-Migration.md)).

**The practical rules** that came out of this work are short: store ML-KEM private keys as
seeds; put the ciphertext and the public keys into the protocol's key derivation anyway,
which TLS 1.3's transcript hash already does; and when a protocol's security argument says
"same key, therefore same conversation", check which binding property that sentence needs
and at which level.

## 3.13 In the real world

*Level: intermediate.*

**TLS.** TLS 1.3 was designed around Diffie-Hellman but fits a KEM well, because the
client already sends its key share first and the server answers. In the hybrid
X25519MLKEM768 group, the client's key share carries an X25519 public value and an ML-KEM
encapsulation key (1,216 bytes in all); the server's share carries its X25519 value and an
ML-KEM ciphertext (1,120 bytes). The handshake's transcript hash covers both, which gives
the binding of §3.12 for free. Authentication still comes from the certificate's
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

## 3.14 Going deeper

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

**Fiat-Shamir with aborts, proved again.** Aborts add a wrinkle to the QROM routes of §3.7,
because the signer's discarded attempts are part of what a proof must simulate. In 2023,
while machine-checking a variant of the Kiltz-Lyubashevsky-Schaffner proof in EasyCrypt,
Manuel Barbosa and nine coauthors found a gap in the step that reduces chosen-message attacks
to attacks without signing queries, shared by several ROM and QROM proofs of Dilithium. They
gave new proofs in both models and showed that Dilithium's claimed security levels still
hold; Devevey, Fallahpour, Passelègue and Stehlé analyzed the transform in concurrent work
(both CRYPTO 2023). The scheme did not change; the lesson is that mechanized checking finds
what referees miss.

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

??? question "2. In the toy Schnorr group of §3.8 (p = 23, q = 11, g = 4), the signature (12, 4) verifies. Which other signature on the same message verifies under a lax verifier, and which security notion does it break?"

    $(12, 15)$, since $15 = 4 + 11$ and $g^{15} = g^{11} g^4 = g^4$. (So do $(12, 26)$ and
    so on.) No new message was signed, so EUF-CMA holds, but a new signature on an old
    message breaks SUF-CMA. Checking $0 \le s < q$ in the verifier removes it.

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

??? question "6. SP 800-227's final version writes the hybrid combiner as KDF(K1, K2, ek1, ek2, c1, c2, OtherInput) with commas, where the draft concatenated. Give two different input lists that plain concatenation would confuse."

    Any split of the same byte string at a different place: $(K_1, K_2) = (\texttt{ab},
    \texttt{c})$ and $(\texttt{a}, \texttt{bc})$ both concatenate to $\texttt{abc}$. With
    real KEMs the shared secrets have fixed lengths, but encapsulation keys, ciphertexts and
    OtherInput vary, so the encoding must mark where each field ends, for example with a
    length prefix.

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

??? question "9. A classical FO proof answers decapsulation queries by searching the list of the adversary's G-queries. Why can't a QROM proof do the same, and what tool restores a version of the list?"

    A quantum query is a superposition over all inputs, so there is no list of individual
    queries; reading one would mean measuring it, which changes the adversary's state and
    can change its behavior. Zhandry's compressed oracle keeps a database of at most $q$
    input-output pairs in superposition, which a proof can measure at the end of the game
    and use much like the classical list (and, with later work, extract from online).

??? question "10. ML-KEM is LEAK-BIND-K-CT but, with expanded private keys, not MAL-BIND-K-CT. What is the difference between the two settings, and why does storing the 64-byte seed close the gap?"

    In LEAK the key pairs are generated honestly (the adversary only sees them); in MAL the
    adversary builds them. The LEAK argument relies on decapsulation using the true $ek$
    and its true hash. An expanded key stores its own copy of $ek$ and $H(ek)$, which a
    malicious builder can make inconsistent, and decapsulation trusts them. A seed
    regenerates every part on use, so no part can disagree with another, and ML-KEM then
    reaches MAL-BIND-K-CT.

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
- The QROM lets the attacker query hash functions in superposition, so proofs can neither
  record nor program queries. One-way to hiding, the compressed oracle and
  measure-and-reprogram made the standards' proofs work there, often with square-root or
  $q^2$ losses; parameters come from attacks, not from the bounds.
- Signatures need unforgeability and often more: strong unforgeability, exclusive
  ownership, message binding. A missing range check makes Schnorr-type signatures
  malleable; a degenerate public key makes one signature valid for every message. Hedged
  signing protects against both bad randomness and faults.
- Lattice Fiat-Shamir signatures hide their key by rejecting and retrying; GPV
  hash-and-sign and hash-based signatures are the other routes.
- SP 800-227 sets the rules for using KEMs: derive keys through a KDF, authenticate
  separately, confirm keys where needed, prove possession of static keys, combine with an
  unambiguous encoding, and validate keys. KEMTLS shows that KEMs alone can authenticate a
  server, saving about 1,500 bytes against ML-DSA-44.
- Binding properties say what a KEM's key commits to. ML-KEM binds at the LEAK level
  through its re-encryption check, and reaches MAL-BIND-K-CT when private keys are stored
  as seeds; DHKEM binds by hashing the ciphertext and public key.

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
- Tsunekazu Saito, Keita Xagawa and Takashi Yamakawa, "Tightly-Secure Key-Encapsulation
  Mechanism in the Quantum Random Oracle Model" (EUROCRYPT 2018); Haodong Jiang, Zhenfeng
  Zhang, Long Chen, Hong Wang and Zhi Ma, "IND-CCA-Secure Key Encapsulation Mechanism in
  the Quantum Random Oracle Model, Revisited" (CRYPTO 2018).
- Nina Bindel, Mike Hamburg, Kathrin Hövelmanns, Andreas Hülsing and Edoardo Persichetti,
  "Tighter Proofs of CCA Security in the Quantum Random Oracle Model" (TCC 2019).
- Veronika Kuchta, Amin Sakzad, Damien Stehlé, Ron Steinfeld and Shi-Feng Sun,
  "Measure-Rewind-Measure: Tighter Quantum Random Oracle Model Proofs for One-Way to Hiding
  and CCA Security" (EUROCRYPT 2020).
- Kathrin Hövelmanns, Andreas Hülsing and Christian Majenz, "Failing Gracefully: Decryption
  Failures and the Fujisaki-Okamoto Transform" (ASIACRYPT 2022).
- Jelle Don, Serge Fehr, Christian Majenz and Christian Schaffner, "Security of the
  Fiat-Shamir Transformation in the Quantum Random-Oracle Model" (CRYPTO 2019) and
  "Online-Extractability in the Quantum Random-Oracle Model" (EUROCRYPT 2022).
- Qipeng Liu and Mark Zhandry, "Revisiting Post-Quantum Fiat-Shamir" (CRYPTO 2019).
- David Pointcheval and Jacques Stern, "Security Proofs for Signature Schemes" (EUROCRYPT
  1996; the forking lemma).
- Manuel Barbosa and others, "Fixing and Mechanizing the Security Proof of Fiat-Shamir with
  Aborts and Dilithium" (CRYPTO 2023); Julien Devevey, Pouria Fallahpour, Alain Passelègue
  and Damien Stehlé, "A Detailed Analysis of Fiat-Shamir with Aborts" (CRYPTO 2023).
- Vadim Lyubashevsky, "Fiat-Shamir with Aborts: Applications to Lattice and
  Factoring-Based Signatures" (ASIACRYPT 2009).
- Craig Gentry, Chris Peikert and Vinod Vaikuntanathan, "Trapdoors for Hard Lattices and
  New Cryptographic Constructions" (STOC 2008).
- Eike Kiltz, Vadim Lyubashevsky and Christian Schaffner, "A Concrete Treatment of
  Fiat-Shamir Signatures in the Quantum Random-Oracle Model" (EUROCRYPT 2018).
- Cas Cremers, Samed Düzlü, Rune Fiedler, Marc Fischlin and Christian Janson, "BUFFing
  signature schemes beyond unforgeability and the case of post-quantum signatures" (IEEE
  S&P 2021).
- Jelle Don, Serge Fehr, Yu-Hsuan Huang and Patrick Struck, "On the (In)Security of the
  BUFF Transform" (CRYPTO 2024); Samed Düzlü, Rune Fiedler and Marc Fischlin, "BUFFing
  FALCON without Increasing the Signature Size" (SAC 2024).
- Konstantinos Chalkias, François Garillot and Valeria Nikolaenko, "Taming the many EdDSAs"
  (SSR 2020); Jacqueline Brendel, Cas Cremers, Dennis Jackson and Mang Zhao, "The Provable
  Security of Ed25519: Theory and Practice" (IEEE S&P 2021).
- Andrew Ayer, "Duplicate Signature Key Selection Attack in Let's Encrypt" (August 2015).
- Cas Cremers, Alexander Dax and Niklas Medinger, "Keeping Up with the KEMs: Stronger
  Security Notions for KEMs and Automated Analysis of KEM-based Protocols" (CCS 2024);
  Sophie Schmieg, "Unbindable Kemmy Schmidt: ML-KEM is neither MAL-BIND-K-CT nor
  MAL-BIND-K-PK" (IACR ePrint 2024/523).
- Deirdre Connolly, "ML-KEM for HPKE" (IETF Internet-Draft draft-connolly-cfrg-hpke-mlkem,
  2024-2025), whose security section summarizes ML-KEM's binding with seed-format keys.
- Peter Schwabe, Douglas Stebila and Thom Wiggers, "Post-Quantum TLS Without Handshake
  Signatures" (CCS 2020), and "More Efficient Post-Quantum KEMTLS with Pre-distributed
  Public Keys" (ESORICS 2021).
- RFC 9180, *Hybrid Public Key Encryption* (2022).
- SP 800-227, *Recommendations for Key-Encapsulation Mechanisms* (September 2025; initial
  public draft January 2025), and Gorjan Alagic's overview of the changes at NIST's Sixth
  PQC Standardization Conference (2025).
- SP 800-56A Rev. 3 (2018) and SP 800-56C Rev. 2 (2020), NIST's key-establishment and key
  derivation recommendations; RFC 7748, *Elliptic Curves for Security* (2016); RFC 8032,
  *Edwards-Curve Digital Signature Algorithm* (2017).
- FIPS 203 and FIPS 204 (August 2024).
