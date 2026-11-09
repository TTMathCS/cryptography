# 16. Signal and the double ratchet

*Chapter 15 ended with a list of what encrypted mail cannot do: no forward
secrecy, no recovery after a stolen key, no deniability, and keys that people
must manage by hand. The Signal protocol, written by Trevor Perrin and Moxie
Marlinspike between 2013 and 2016, does all of those things for chat, and
does them for people who never see a key. It now protects the messages of
billions of people, in Signal, WhatsApp, Google Messages and Facebook
Messenger. This chapter builds it piece by piece: X3DH, a handshake with a
recipient who is offline; the double ratchet, which gives every message its
own key and heals after a theft; safety numbers; sealed sender; and the
post-quantum additions of 2023 and 2025. You will code the handshake with
XEdDSA, the whole double ratchet, checked against libsignal's own test
vector, and Signal's safety number, and watch a thief lose access to a
conversation one round trip after stealing a phone, and then watch how much
longer that takes when the round trip is to Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a messaging protocol must protect: forward secrecy,
      post-compromise security, asynchrony, deniability;
    - X3DH, the handshake against prekeys left on a server, coded;
    - XEdDSA: how one X25519 key can also sign;
    - the double ratchet: a symmetric ratchet for every message and a
      Diffie-Hellman ratchet for every turn of the conversation, coded;
    - safety numbers, and what they catch;
    - sealed sender, and what the server still learns;
    - PQXDH (2023) and the post-quantum ratchet SPQR (2025);
    - how WhatsApp, Messenger and others use the same design;
    - what a 20-minute light delay does to the ratchet.

    **You need:** [Chapter 15](15-Email-OpenPGP-and-SMIME.md) (why mail
    cannot do this) and [Chapter 8](08-WireGuard-and-Noise.md) (handshakes
    built from several Diffie-Hellman results); Diffie-Hellman, elliptic
    curves and message authentication from Chapters
    [12](../../book/12-Diffie-Hellman.md), [15](../../book/15-Elliptic-Curves.md)
    and [10](../../book/10-Message-Authentication.md) of book 1.

    **Levels:** §16.1 and §16.2 are for beginners, §16.3 to §16.10 are
    intermediate, §16.11 is expert.

## 16.1 What a messenger must protect

*Level: beginner.*

A chat looks like email in short bursts, but people use it differently, and
that changes what the protocol can do. Messages are short and frequent. The
two sides take turns. Both run the same app, from the same company, which can
choose the cryptography for everyone. And phones are lost, stolen, seized and
backed up all the time.

The goals Signal set out to meet:

1. **Confidentiality and authenticity end to end.** The server relays
   messages but cannot read or forge them.
2. **Asynchrony.** Alice must be able to start a conversation, with full
   security, while Bob's phone is switched off. TLS-style handshakes need both
   sides online; mail-style encryption to a long-term key gives up forward
   secrecy.
3. **Forward secrecy.** Stealing a phone today must not reveal yesterday's
   messages, even if the thief also recorded all the ciphertext. Every
   message key is deleted after use.
4. **Post-compromise security** (also called future secrecy or healing).
   If an attacker copies the phone's keys once and then leaves, they must
   lose access soon after: new key material that the attacker never saw must
   keep entering the conversation.
5. **Deniability.** A transcript should not prove to a third party who wrote
   what. Messages are authenticated with MACs under keys both sides know,
   not signed.
6. **Minimal metadata.** The server should learn as little as possible about
   who talks to whom.

Goals 3 and 4 together are the heart of the design. Forward secrecy looks
back: old keys are gone. Post-compromise security looks forward: future keys
will contain secrets made after the theft. Figure 16.3 shows both.

!!! note "Life story: the Signal protocol"
    **Born:** 2013, as the "Axolotl ratchet" in TextSecure, an encrypted SMS
    app from Open Whisper Systems; designed by Trevor Perrin and Moxie
    Marlinspike, building on Off-the-Record Messaging (Borisov, Goldberg and
    Brewer, 2004) and the SCIMP ratchet; renamed the Double Ratchet when its
    specification was published in 2016 · **Purpose:** forward-secret,
    self-healing, asynchronous messaging for ordinary phones · **Spread:**
    WhatsApp completed its switch to the protocol for all messages in April
    2016; Facebook Messenger, Skype, Google Messages and others followed;
    the Signal app (2014 on) is run by the non-profit Signal Foundation,
    founded in 2018 · **Status:** the most widely deployed end-to-end
    encryption protocol; extended with PQXDH in 2023 and the SPQR
    post-quantum ratchet in 2025

## 16.2 Keys left on the server

*Level: beginner.*

How can Alice run a Diffie-Hellman exchange with Bob while he is asleep? Bob
does his half in advance. When he installs the app, his phone makes:

- an **identity key** IK<sub>B</sub>, an X25519 key pair kept for as long as
  he keeps his account;
- a **signed prekey** SPK<sub>B</sub>, an X25519 key pair replaced every
  week or month, signed by the identity key;
- a batch of **one-time prekeys** OPK<sub>B</sub>, each used for one
  conversation and then deleted.

He uploads the public halves to the server. When Alice wants to talk, the
server gives her Bob's **prekey bundle**: his identity key, his current
signed prekey and its signature, and one one-time prekey (which the server
then deletes). Alice now has everything she needs to finish a key agreement
alone, and send her first message at once. That handshake is **X3DH**,
"Extended Triple Diffie-Hellman".

Signal's server also stores, for each account, the identity key it last
saw, and tells the app when it changes, so that the phone can warn "your
safety number with Bob has changed". The server is trusted to relay
messages, not to read them; §16.6 shows how users check that it has not
substituted keys.

## 16.3 X3DH by hand

*Level: intermediate.*

Alice makes a fresh **ephemeral key** EK<sub>A</sub> and computes up to four
Diffie-Hellman results:

$$
\begin{aligned}
DH_1 &= DH(IK_A,\ SPK_B)\\
DH_2 &= DH(EK_A,\ IK_B)\\
DH_3 &= DH(EK_A,\ SPK_B)\\
DH_4 &= DH(EK_A,\ OPK_B)
\end{aligned}
$$

(the last only if Bob left a one-time prekey), and the shared key

$$
\begin{aligned}
SK = \mathrm{HKDF}\bigl(&F \,\|\, DH_1 \,\|\, DH_2\\
&\|\, DH_3 \,\|\, DH_4\bigr),
\end{aligned}
$$

where $F$ is 32 bytes of 0xFF (so the input can never be mistaken for an
X25519 output used elsewhere), with a zero salt and an application name as
the HKDF info.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="X3DH: Alice's identity key and ephemeral key on the left, Bob's identity key, signed prekey and one-time prekey on the right, joined by four Diffie-Hellman lines DH1 to DH4, all fed into HKDF to give the shared key" fill="currentColor" font-size="13">
<text x="100" y="26" text-anchor="middle" font-weight="bold">Alice (online)</text>
<text x="530" y="26" text-anchor="middle" font-weight="bold">Bob (offline: from the server)</text>
<rect x="40" y="56" width="120" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="100" y="81" text-anchor="middle">IK_A identity</text>
<rect x="40" y="170" width="120" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="100" y="195" text-anchor="middle">EK_A ephemeral</text>
<rect x="460" y="46" width="140" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="530" y="71" text-anchor="middle">IK_B identity</text>
<rect x="460" y="116" width="140" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="530" y="141" text-anchor="middle">SPK_B signed prekey</text>
<rect x="460" y="186" width="140" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="530" y="211" text-anchor="middle">OPK_B one-time</text>
<line x1="160" y1="76" x2="460" y2="136" stroke="currentColor" stroke-width="1.5"/>
<text x="212" y="78" font-size="12">DH1</text>
<line x1="160" y1="184" x2="460" y2="66" stroke="currentColor" stroke-width="1.5"/>
<text x="428" y="100" font-size="12">DH2</text>
<line x1="160" y1="190" x2="460" y2="136" stroke="currentColor" stroke-width="1.5" class="acc"/>
<text x="250" y="160" font-size="12" class="acc-fill">DH3</text>
<line x1="160" y1="196" x2="460" y2="206" stroke="currentColor" stroke-width="1.5" class="acc"/>
<text x="300" y="216" font-size="12" class="acc-fill">DH4</text>
<rect x="160" y="248" width="320" height="40" rx="6" stroke="currentColor" fill="none"/>
<text x="320" y="273" text-anchor="middle" font-size="12.5">SK = HKDF(0xFF…FF ‖ DH1 ‖ DH2 ‖ DH3 ‖ DH4)</text>
</svg>
<figcaption>Figure 16.1. The four Diffie-Hellman results of X3DH. DH1 and DH2 tie in both identities; DH3 and DH4 use Alice's fresh key, so stealing the identity keys later does not reveal SK.</figcaption>
</figure>

Why four? Each pair does one job.

- **DH<sub>1</sub>** uses Alice's identity key: only the real Alice could
  compute it, so Bob knows who he is talking to.
- **DH<sub>2</sub>** uses Bob's identity key: only the real Bob can compute
  it, so Alice knows that only Bob can read her message.
- **DH<sub>3</sub>** and **DH<sub>4</sub>** use only short-lived keys on
  Bob's side. When Bob deletes the signed prekey after its rotation, and the
  one-time prekey after first use, no one, Bob included, can recompute SK.
  That is forward secrecy, even for the very first message. Without a
  one-time prekey (the server ran out), the first messages are forward
  secret only from the time the signed prekey is deleted.

Notice what is *not* there: no signature by Alice and no signature over the
handshake. Bob is convinced Alice took part because only she could compute
DH<sub>1</sub>. But Bob could have computed the same SK himself from Alice's
public keys and his private ones, so a transcript proves nothing to a third
party. That is X3DH's **deniability**.

The only signature is Bob's signature on his signed prekey. Without it a
malicious server could hand Alice a prekey of its own. It still could not
read the conversation, since DH<sub>2</sub> needs Bob's identity key, but it
would hold the private half of the prekey that DH<sub>3</sub> depends on, so
the forward secrecy of the session would rest on the server deleting it. The
signature lets Alice reject any prekey Bob did not make.

Alice's first message carries her identity key, her ephemeral public key,
which prekeys she used, and a ciphertext under a key derived from SK, with
both identity keys as **associated data**. Bob repeats the computation,
checks the message, and deletes the one-time prekey.

### XEdDSA: signing with a Diffie-Hellman key

Bob's identity key is an X25519 key, used for DH<sub>2</sub>, yet it must
also sign his prekey. X25519 uses the Montgomery form of Curve25519, Ed25519
the twisted Edwards form; the two are birationally equivalent, and a
Montgomery $u$ coordinate converts to an Edwards $y$ coordinate as

$$
y = \frac{u - 1}{u + 1} \bmod p.
$$

The Montgomery form forgets the sign of $x$. Perrin's **XEdDSA** (2016) fixes
this by always using the key whose Edwards point has $x$ even: if the
private scalar $k$ gives an odd $x$, the signer uses $-k$ instead, which
gives the same $y$ and the even $x$. Then it signs like Ed25519, except that
the nonce is derived from the private key, the message and 64 fresh random
bytes, for protection against fault attacks. A verifier converts Bob's
X25519 public key to Edwards form with the sign bit 0 and runs the ordinary
Ed25519 check.

### Code it: X3DH and XEdDSA

The program writes X25519 (RFC 7748) and the Edwards arithmetic for XEdDSA,
has Bob publish a bundle, has Alice verify it and derive SK alone, has Bob
derive the same key later, and shows that a prekey substituted by the server
fails the signature check. The keys come from a seeded generator so that the
output repeats; a real client uses the operating system's random numbers.

```python
# X3DH (Signal, 2016) by hand: X25519 for the key agreement, XEdDSA so that one
# X25519 identity key can also sign, HKDF to combine the results.
import hashlib, hmac, random

P = 2**255 - 19
Q = 2**252 + 27742317777372353535851937790883648493       # the group order
def x25519(k, u=(9).to_bytes(32, "little")):           # RFC 7748; u = 9 is the base point
    k = bytearray(k); k[0] &= 248; k[31] = (k[31] & 127) | 64
    k, x1 = int.from_bytes(k, "little"), int.from_bytes(u, "little") & (2**255 - 1)
    x2, z2, x3, z3, swap = 1, 0, x1, 1, 0
    for t in range(254, -1, -1):
        bit = (k >> t) & 1
        if swap ^ bit: x2, x3, z2, z3 = x3, x2, z3, z2
        swap = bit
        A, B, C, D = x2 + z2, x2 - z2, x3 + z3, x3 - z3
        AA, BB, DA, CB = A * A, B * B, D * A, C * B
        x3, z3 = (DA + CB) ** 2 % P, x1 * (DA - CB) ** 2 % P
        x2, z2 = AA * BB % P, (AA - BB) * (AA + 121665 * (AA - BB)) % P
    if swap: x2, z2 = x3, z3
    return (x2 * pow(z2, P - 2, P) % P).to_bytes(32, "little")

# --- Edwards form of the same curve, for XEdDSA signatures --------------------
d = -121665 * pow(121666, -1, P) % P
def edadd(p1, p2):
    (x1, y1), (x2, y2) = p1, p2
    t = d * x1 * x2 * y1 * y2 % P
    return ((x1 * y2 + x2 * y1) * pow(1 + t, -1, P) % P, (y1 * y2 + x1 * x2) * pow(1 - t, -1, P) % P)
def edmul(k, pt):
    R = (0, 1)
    for bit in bin(k)[2:]:
        R = edadd(R, R)
        if bit == "1": R = edadd(R, pt)
    return R
def xrecover(y, sign):
    x2 = (y * y - 1) * pow(d * y * y + 1, -1, P) % P
    x = pow(x2, (P + 3) // 8, P)
    if (x * x - x2) % P: x = x * pow(2, (P - 1) // 4, P) % P
    return P - x if x & 1 != sign else x
By = 4 * pow(5, -1, P) % P
B = (xrecover(By, 0), By)
enc = lambda pt: (pt[1] | (pt[0] & 1) << 255).to_bytes(32, "little")
H = lambda *parts: int.from_bytes(hashlib.sha512(b"".join(parts)).digest(), "little")

def clamp(k):
    k = bytearray(k); k[0] &= 248; k[31] = (k[31] & 127) | 64
    return int.from_bytes(k, "little")
def xeddsa_sign(k, msg, Z):                    # XEdDSA spec section 2.3
    E = edmul(clamp(k), B)
    a = Q - clamp(k) % Q if E[0] & 1 else clamp(k) % Q     # force the sign bit to 0
    A = enc((P - E[0] if E[0] & 1 else E[0], E[1]))
    r = H(b"\xfe" + b"\xff" * 31, a.to_bytes(32, "little"), msg, Z) % Q
    R = enc(edmul(r, B))
    h = H(R, A, msg) % Q
    return R + ((r + h * a) % Q).to_bytes(32, "little")
def xeddsa_verify(u, msg, sig):                # Montgomery u -> Edwards y, then Ed25519
    u = int.from_bytes(u, "little")
    y = (u - 1) * pow(u + 1, -1, P) % P
    A = (xrecover(y, 0), y)
    yR = int.from_bytes(sig[:32], "little") & (2**255 - 1)
    R = (xrecover(yR, sig[31] >> 7), yR)
    s = int.from_bytes(sig[32:], "little")
    h = H(sig[:32], enc(A), msg) % Q
    return s < Q and edmul(s, B) == edadd(R, edmul(h, A))

def hkdf(ikm, salt, info, n):
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest(); out += t; i += 1
    return out[:n]

rng = random.Random(2026)                       # seeded so the output repeats;
def randbytes(n): return bytes(rng.getrandbits(8) for _ in range(n))
def keypair():                                  # real code uses os.urandom
    sk = randbytes(32)
    return sk, x25519(sk)

# Bob, once: identity key, signed prekey, a batch of one-time prekeys -> server
IKb, IKb_pub = keypair()
SPKb, SPKb_pub = keypair()
OPKs = [keypair() for _ in range(3)]
bundle = {"IK": IKb_pub, "SPK": SPKb_pub, "sig": xeddsa_sign(IKb, SPKb_pub, randbytes(64)),
          "OPK": OPKs[0][1]}                    # the server hands out each OPK once
print("Bob's prekey signature verifies:", xeddsa_verify(bundle["IK"], bundle["SPK"], bundle["sig"]))

# Alice, later, while Bob is offline
IKa, IKa_pub = keypair()
EKa, EKa_pub = keypair()
assert xeddsa_verify(bundle["IK"], bundle["SPK"], bundle["sig"])
DH1 = x25519(IKa, bundle["SPK"])                # her identity  x  his signed prekey
DH2 = x25519(EKa, bundle["IK"])                 # her ephemeral x  his identity
DH3 = x25519(EKa, bundle["SPK"])                # her ephemeral x  his signed prekey
DH4 = x25519(EKa, bundle["OPK"])                # her ephemeral x  his one-time prekey
F, info = b"\xff" * 32, b"ArcadiaChat_X25519_SHA-256"
SK_alice = hkdf(F + DH1 + DH2 + DH3 + DH4, bytes(32), info, 32)
AD = IKa_pub + IKb_pub                          # both identities, bound to every message
first = {"IK": IKa_pub, "EK": EKa_pub, "OPK used": 0}

# Bob, when he comes online
OPKb = OPKs[first["OPK used"]][0]
SK_bob = hkdf(F + x25519(SPKb, first["IK"]) + x25519(IKb, first["EK"]) + x25519(SPKb, first["EK"])
              + x25519(OPKb, first["EK"]), bytes(32), info, 32)
print("same secret key:", SK_alice == SK_bob, SK_alice.hex()[:16] + "...")

# A server that swaps in its own signed prekey is caught by the signature
evil_SPK, evil_pub = keypair()
print("server's substituted prekey verifies:", xeddsa_verify(bundle["IK"], evil_pub, bundle["sig"]))
```

```text
Bob's prekey signature verifies: True
same secret key: True a2cad8ec0d5058c5...
server's substituted prekey verifies: False
```

## 16.4 The double ratchet

*Level: intermediate.*

X3DH gives one shared key. If Alice and Bob used it, or one key derived from
it, for the whole conversation, a single theft would expose everything. The
double ratchet derives a new key for every message, from two interlocking
mechanisms.

**The symmetric ratchet** is a **KDF chain**. A chain key $CK$ produces a
message key and the next chain key:

$$
\begin{aligned}
MK &= \mathrm{HMAC\text{-}SHA256}(CK,\ \texttt{0x01}),\\
CK' &= \mathrm{HMAC\text{-}SHA256}(CK,\ \texttt{0x02}).
\end{aligned}
$$

After sending, the phone keeps $CK'$ and deletes $CK$ and $MK$. Since HMAC
is one-way, $CK'$ reveals nothing about $CK$ or about earlier message keys:
forward secrecy per message. But the chain alone cannot heal: whoever steals
$CK'$ can compute every key after it.

**The Diffie-Hellman ratchet** supplies the healing. Each party has a
**ratchet key pair** and puts its current public half in the header of every
message. When Alice receives a message with a ratchet key from Bob that she
has not seen before, she

1. computes a DH between her current ratchet private key and Bob's new
   public key, and feeds it with the **root key** into HKDF, giving a new
   root key and a new **receiving chain** (Bob used the same DH to start his
   sending chain);
2. makes a fresh ratchet key pair of her own, computes a DH with Bob's new
   key, and feeds that into HKDF, giving another new root key and her new
   **sending chain**.

So every time the conversation changes direction, a new Diffie-Hellman
result, made from a key just generated, enters the root chain. A thief who
copied Alice's state has her old ratchet private key, but not the new one,
so after the next round trip the chains are out of their reach.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="The double ratchet: a vertical root chain in the middle; each DH ratchet step feeds a new Diffie-Hellman result into the root chain, which outputs a new sending or receiving chain; each chain steps once per message and outputs one message key" fill="currentColor" font-size="13">
<text x="320" y="22" text-anchor="middle" font-weight="bold">root chain</text>
<text x="110" y="22" text-anchor="middle" font-weight="bold">new DH results</text>
<text x="520" y="22" text-anchor="middle" font-weight="bold">message chains</text>
<g font-size="12">
<rect x="270" y="36" width="100" height="32" rx="6" class="soft" stroke="currentColor"/><text x="320" y="57" text-anchor="middle">RK₀ = SK</text>
<rect x="270" y="126" width="100" height="32" rx="6" class="soft" stroke="currentColor"/><text x="320" y="147" text-anchor="middle">RK₁</text>
<rect x="270" y="216" width="100" height="32" rx="6" class="soft" stroke="currentColor"/><text x="320" y="237" text-anchor="middle">RK₂</text>
<rect x="270" y="306" width="100" height="32" rx="6" class="soft" stroke="currentColor"/><text x="320" y="327" text-anchor="middle">RK₃</text>
<line x1="320" y1="70" x2="320" y2="122" stroke="currentColor" stroke-width="1.5"/><polygon points="320,124 315,112 325,112"/>
<line x1="320" y1="160" x2="320" y2="212" stroke="currentColor" stroke-width="1.5"/><polygon points="320,214 315,202 325,202"/>
<line x1="320" y1="250" x2="320" y2="302" stroke="currentColor" stroke-width="1.5"/><polygon points="320,304 315,292 325,292"/>
<rect x="30" y="80" width="160" height="32" rx="6" class="soft-acc" stroke="currentColor"/><text x="110" y="101" text-anchor="middle">DH(A₁, B₀)</text>
<rect x="30" y="170" width="160" height="32" rx="6" class="soft-acc" stroke="currentColor"/><text x="110" y="191" text-anchor="middle">DH(A₁, B₁)</text>
<rect x="30" y="260" width="160" height="32" rx="6" class="soft-acc" stroke="currentColor"/><text x="110" y="281" text-anchor="middle">DH(A₂, B₁)</text>
<line x1="190" y1="96" x2="316" y2="96" stroke="currentColor"/><line x1="190" y1="186" x2="316" y2="186" stroke="currentColor"/><line x1="190" y1="276" x2="316" y2="276" stroke="currentColor"/>
<line x1="324" y1="100" x2="440" y2="100" stroke="currentColor" class="acc"/><polygon points="444,100 432,95 432,105" class="acc-fill"/>
<line x1="324" y1="190" x2="440" y2="190" stroke="currentColor" class="acc"/><polygon points="444,190 432,185 432,195" class="acc-fill"/>
<line x1="324" y1="280" x2="440" y2="280" stroke="currentColor" class="acc"/><polygon points="444,280 432,275 432,285" class="acc-fill"/>
<text x="450" y="94">Alice → Bob chain</text><text x="450" y="112" font-size="11.5">MK₀ MK₁ MK₂ …</text>
<text x="450" y="184">Bob → Alice chain</text><text x="450" y="202" font-size="11.5">MK₀ MK₁ …</text>
<text x="450" y="274">Alice → Bob chain</text><text x="450" y="292" font-size="11.5">MK₀ …</text>
</g>
</svg>
<figcaption>Figure 16.2. The two ratchets. A₁, A₂ are Alice's successive ratchet keys and B₀, B₁ Bob's (B₀ is his signed prekey). Each turn of the conversation adds a fresh DH result to the root chain; each message steps a chain.</figcaption>
</figure>

**Message keys in libsignal.** Signal turns each 32-byte message key into
an AES-256 key, an HMAC-SHA256 key and a 16-byte IV with HKDF and the label
`WhisperMessageKeys`. The message is encrypted with AES-256-CBC and
authenticated with HMAC-SHA256 over the version, both identity keys and the
ciphertext, truncated to 8 bytes. The root chain uses HKDF with the root key
as salt and the label `WhisperRatchet`.

**Out-of-order messages.** Mobile networks deliver late and out of order.
Each header carries the message's number $n$ in its chain and the length
$PN$ of the sender's previous chain. A receiver who sees message 5 while
expecting 3 steps its chain forward, keeps the keys for 3 and 4 in a
**skipped-keys** table, and uses them if those messages arrive. A limit
(MAX_SKIP, here 1,000) stops a forged header from making the receiver
compute millions of keys.

### Code it: the double ratchet

This is the algorithm of the Double Ratchet specification, with libsignal's
KDF labels, starting from the X3DH key above, with Bob's signed prekey as his
first ratchet key. The program first checks the symmetric step against
libsignal's own test vector. To keep it short, the message cipher is a
stream from HMAC-SHA256 in counter mode instead of AES-256-CBC; the key
schedule around it is Signal's.

```python
# The Double Ratchet (Signal spec, 2016), with libsignal's key derivations.
# Uses x25519, hkdf, keypair and SK_alice/SK_bob, SPKb from above.
import copy

def kdf_rk(rk, dh_out):                         # DH ratchet step: new root key, new chain key
    out = hkdf(dh_out, rk, b"WhisperRatchet", 64)
    return out[:32], out[32:]
def kdf_ck(ck):                                 # symmetric ratchet step
    mac = lambda b: hmac.new(ck, b, hashlib.sha256).digest()
    return mac(b"\x02"), mac(b"\x01")           # next chain key, message key
def message_keys(mk):                           # AES key, HMAC key, IV
    out = hkdf(mk, bytes(32), b"WhisperMessageKeys", 80)
    return out[:32], out[32:64], out[64:]

# libsignal's own test (ratchet/keys.rs, test_chain_key_derivation)
seed = bytes.fromhex("8ab72d6f4cc5ac0d387eaf463378ddb28edd07385b1cb01250c715982e7ad48f")
nxt, mk = kdf_ck(seed)
ek, mac_key, iv = message_keys(mk)
print("libsignal vector:", ek.hex().startswith("bf51e9d75e0e3103"), mac_key.hex().startswith("c6c77d6a73a35433"),
      nxt.hex().startswith("28e8f8fee54b801e"))

def seal(mk, ad, header, text):                 # stand-in for AES-256-CBC + HMAC-SHA256
    ek, mk2, iv = message_keys(mk)
    stream = b"".join(hmac.new(ek, iv + i.to_bytes(4, "big"), hashlib.sha256).digest()
                      for i in range(len(text) // 32 + 1))
    ct = bytes(a ^ b for a, b in zip(text, stream))
    return ct + hmac.new(mk2, ad + header + ct, hashlib.sha256).digest()[:8]
def unseal(mk, ad, header, data):
    ct, tag = data[:-8], data[-8:]
    ek, mk2, iv = message_keys(mk)
    if not hmac.compare_digest(tag, hmac.new(mk2, ad + header + ct, hashlib.sha256).digest()[:8]):
        raise ValueError("bad MAC")
    stream = b"".join(hmac.new(ek, iv + i.to_bytes(4, "big"), hashlib.sha256).digest()
                      for i in range(len(ct) // 32 + 1))
    return bytes(a ^ b for a, b in zip(ct, stream))

class Ratchet:
    def __init__(self, sk, ad, their_pub=None, my_pair=None):
        self.ad, self.skipped, self.Ns, self.Nr, self.PN = ad, {}, 0, 0, 0
        if their_pub:                           # Alice: sends first, ratchets at once
            self.DHs, self.DHr = keypair(), their_pub
            self.RK, self.CKs = kdf_rk(sk, x25519(self.DHs[0], their_pub))
            self.CKr = None
        else:                                   # Bob: his signed prekey is his first ratchet key
            self.DHs, self.DHr, self.RK, self.CKs, self.CKr = my_pair, None, sk, None, None
    def send(self, text):
        self.CKs, mk = kdf_ck(self.CKs)
        header = self.DHs[1] + self.PN.to_bytes(4, "big") + self.Ns.to_bytes(4, "big")
        self.Ns += 1
        return header, seal(mk, self.ad, header, text.encode())
    def receive(self, header, data):
        dh, pn, n = header[:32], int.from_bytes(header[32:36], "big"), int.from_bytes(header[36:], "big")
        if (dh, n) in self.skipped:             # a late message: its key was kept
            return unseal(self.skipped.pop((dh, n)), self.ad, header, data).decode()
        if dh != self.DHr:                      # the other side has a new ratchet key
            self.skip(pn)
            self.PN, self.Ns, self.Nr, self.DHr = self.Ns, 0, 0, dh
            self.RK, self.CKr = kdf_rk(self.RK, x25519(self.DHs[0], dh))
            self.DHs = keypair()                # fresh key for our next reply...
            self.RK, self.CKs = kdf_rk(self.RK, x25519(self.DHs[0], dh))
        self.skip(n)
        self.CKr, mk = kdf_ck(self.CKr)
        self.Nr += 1
        return unseal(mk, self.ad, header, data).decode()
    def skip(self, until):                      # keep keys for messages not yet arrived
        if self.CKr is None: return
        assert until - self.Nr <= 1000, "too many skipped messages"
        while self.Nr < until:
            self.CKr, mk = kdf_ck(self.CKr)
            self.skipped[(self.DHr, self.Nr)] = mk; self.Nr += 1

alice = Ratchet(SK_alice, AD, their_pub=SPKb_pub)
bob = Ratchet(SK_bob, AD, my_pair=(SPKb, SPKb_pub))

m1, m2, m3 = alice.send("Rover 2 is charged."), alice.send("Leaving at 09:00."), alice.send("Bring the drill.")
print("Bob reads 1:", bob.receive(*m1))
print("Bob reads 3 before 2:", bob.receive(*m3), "|", bob.receive(*m2))
print("Alice's ratchet key so far:", alice.DHs[1].hex()[:8], " Bob's:", bob.DHs[1].hex()[:8])

r1 = bob.send("Drill packed.")
print("Alice reads:", alice.receive(*r1), "  her new ratchet key:", alice.DHs[1].hex()[:8])

# Mallory records everything, then steals Bob's whole state at this moment
stolen = copy.deepcopy(bob)
m4 = alice.send("Code for airlock B is 4417.")
print("thief reads the next message:", stolen.receive(*m4))
bob.receive(*m4)
try: stolen.receive(*m1)
except Exception as e: print("thief tries an old message: refused, its key is gone")

# Healing: Bob replies (new ratchet key the thief never saw), Alice answers
r2 = bob.send("Got it.")
alice.receive(*r2)
m5 = alice.send("Meet at the hab at noon.")
print("Bob reads:", bob.receive(*m5))
try: print(stolen.receive(*m5))
except Exception as e: print("thief after one round trip:", e)
```

```text
libsignal vector: True True True
Bob reads 1: Rover 2 is charged.
Bob reads 3 before 2: Bring the drill. | Leaving at 09:00.
Alice's ratchet key so far: 39f7f9a7  Bob's: f717efa9
Alice reads: Drill packed.   her new ratchet key: 9a745d5d
thief reads the next message: Code for airlock B is 4417.
thief tries an old message: refused, its key is gone
Bob reads: Meet at the hab at noon.
thief after one round trip: bad MAC
```

Everything the chapter promised is in that output. The keys from
libsignal's test match. Message 3 arrives before message 2 and both decrypt.
The thief who copies Bob's state reads the next message in the current
chain, but not an old one, whose key Bob deleted: forward secrecy. Then Bob
replies with a ratchet key the thief has never seen, Alice ratchets, and the
thief's copy fails the MAC: post-compromise security, after one round trip.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A timeline of a conversation: before the theft, messages are protected by forward secrecy; at the theft the attacker copies the state; until the next round trip the attacker can read messages; after both sides ratchet, the conversation heals" fill="currentColor" font-size="13">
<line x1="30" y1="110" x2="610" y2="110" stroke="currentColor" stroke-width="1.5"/><polygon points="614,110 602,105 602,115"/>
<text x="600" y="134" text-anchor="end" font-size="12">time</text>
<rect x="30" y="70" width="250" height="30" rx="4" class="soft" stroke="currentColor"/>
<text x="155" y="90" text-anchor="middle" font-size="12">past messages: keys deleted</text>
<rect x="280" y="70" width="140" height="30" rx="4" class="acc-fill" fill-opacity="0.3" stroke="currentColor"/>
<text x="350" y="90" text-anchor="middle" font-size="12">readable by thief</text>
<rect x="420" y="70" width="190" height="30" rx="4" class="soft" stroke="currentColor"/>
<text x="515" y="90" text-anchor="middle" font-size="12">healed: new DH secrets</text>
<line x1="280" y1="40" x2="280" y2="150" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="280" y="34" text-anchor="middle" font-size="12" class="acc-fill">state stolen</text>
<line x1="420" y1="40" x2="420" y2="150" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="420" y="34" text-anchor="middle" font-size="12">round trip done</text>
<text x="155" y="170" text-anchor="middle" font-size="12">forward secrecy</text>
<text x="155" y="188" text-anchor="middle" font-size="11.5">(the symmetric ratchet)</text>
<text x="515" y="170" text-anchor="middle" font-size="12">post-compromise security</text>
<text x="515" y="188" text-anchor="middle" font-size="11.5">(the DH ratchet)</text>
<text x="350" y="214" text-anchor="middle" font-size="12">The window lasts one round trip of the conversation, not of the network.</text>
</svg>
<figcaption>Figure 16.3. What a single theft of a phone's state exposes. A thief who keeps control of the phone (malware) is not covered: no protocol heals while the attacker is still inside.</figcaption>
</figure>

## 16.5 Break it: what the ratchet does not cover

*Level: intermediate.*

The double ratchet is strong against the attacker it was designed for, one
who records traffic and, at some moment, copies the keys. Real attacks on
Signal users mostly go around it.

- **Malware on the phone.** A thief who stays in control of the device reads
  messages as the user does. Commercial spyware sold to governments, such as
  NSO Group's Pegasus, works this way; it defeats every messenger equally.
- **Backups.** Messages and keys copied to a cloud backup are protected only
  by the backup's encryption. WhatsApp added end-to-end encrypted backups in
  2021, as an option.
- **Linked devices.** Each linked computer or tablet has its own keys and
  sessions. An attacker who briefly gets a phone, or tricks the user into
  scanning a QR code, can link a device of their own and receive every
  future message. In 2025 Google's threat intelligence group reported
  Russian-aligned groups doing exactly this against Ukrainian Signal users,
  with fake group-invite QR codes.
- **Key substitution by the server.** If the server hands Alice a key that
  is not Bob's, the cryptography protects her conversation with the server.
  Only comparing safety numbers (§16.6) catches it.
- **The wrong recipient.** In March 2025 the editor of The Atlantic, Jeffrey
  Goldberg, was added by mistake to a Signal group in which senior US
  officials discussed planned strikes in Yemen. The protocol did its job; the
  wrong person was in the group.
- **Modified clients.** Later that spring a modified Signal client used for
  government record keeping, which copied messages in plain text to an
  archive server, was breached. Encryption end to end is worth only as much
  as what happens at the ends.

### Fix it

The fixes are mostly outside the protocol: keep phones updated, review the
list of linked devices, enable registration lock (a PIN that stops someone
re-registering your number), compare safety numbers with the people who
matter, and use disappearing messages so that a seized phone holds less.
Inside the protocol, the ratchet's lesson is that **time limits damage**:
the more often fresh randomness enters, the shorter a theft lasts.

## 16.6 Safety numbers

*Level: intermediate.*

Signal shows, for each conversation, a **safety number**: 60 digits that
both phones compute from both identity keys. If Alice and Bob see the same
digits, no one has substituted a key. For each person, the phone hashes a
version number, the identity key and the person's stable identifier (their
phone number in the version used here) with SHA-512, then hashes the result
together with the key again, 5,200 times in all, to make guessing a
matching key expensive. The first 30 bytes become six 5-digit groups. The
two halves are sorted, so both phones show the same number.

### A worked example by hand

For libsignal's test identity "Alice" (+14152222222), the hash after 5,200
rounds begins with the bytes 1e 30 1a 03 53. Read as a big-endian number,
that is

$$
\texttt{0x1e301a0353} = 129{,}656{,}030{,}035,
$$

and $129{,}656{,}030{,}035 \bmod 100{,}000 = 30{,}035$, the first group. The
next five bytes give 44776, and so on. The same 32 bytes also go into the QR
code that the phones scan instead of reading digits.

### Code it: a safety number

```python
# Signal's safety number: 5,200 rounds of SHA-512 over each person's identity
# key and phone number, 30 digits each. The keys and numbers are libsignal's test vector.
import hashlib

def half(stable_id, key):
    h = hashlib.sha512(b"\x00\x00" + key + stable_id + key).digest()
    for _ in range(5199):
        h = hashlib.sha512(h + key).digest()
    return "".join(f"{int.from_bytes(h[i:i + 5], 'big') % 100000:05}" for i in range(0, 30, 5))

alice_key = bytes.fromhex("0506863bc66d02b40d27b8d49ca7c09e9239236f9d7d25d6fcca5ce13c7064d868")
bob_key = bytes.fromhex("05f781b6fb32fed9ba1cf2de978d4d5da28dc34046ae814402b5c0dbd96fda907b")
a, b = half(b"+14152222222", alice_key), half(b"+14153333333", bob_key)
number = min(a, b) + max(a, b)                  # same order on both phones
print(" ".join(number[i:i + 5] for i in range(0, 60, 5)))
print("matches libsignal:", number == "300354477692869396892869876765458257569162576843440918079131")

# A server that swaps in its own key for Bob changes Bob's half completely
fake = bytes([5]) + hashlib.sha256(b"server key").digest()
c = half(b"+14153333333", fake)
print(" ".join((min(a, c) + max(a, c))[i:i + 5] for i in range(0, 60, 5)))
```

```text
30035 44776 92869 39689 28698 76765 45825 75691 62576 84344 09180 79131
matches libsignal: True
21890 69640 58688 26651 76682 87187 30035 44776 92869 39689 28698 76765
```

The first line equals libsignal's test value. In the second, a server has
replaced Bob's key: his 30 digits are new, and Alice's half, which did not
change, has moved to the second position because the halves are sorted.
Users comparing "the first few groups" would miss half of all attacks of
this kind, which is why the app compares the whole number, or the QR code.

Few people ever compare safety numbers, and studies of the "safety number
changed" warning found most users click past it, since the usual cause is a
new phone. Key transparency, a public log of every account's identity key
that clients audit automatically, is the scalable answer; WhatsApp announced
its deployment in 2023.

## 16.7 Sealed sender and metadata

*Level: intermediate.*

End-to-end encryption hides what is said, not who says it to whom. Signal's
server must know the recipient to deliver a message; in 2018 it stopped
needing to know the **sender**. With **sealed sender**, the client wraps the
whole Signal message, together with a short-lived **sender certificate**
issued by the server (the sender's account and identity key, signed), in an
outer envelope encrypted to the recipient's identity key with an ephemeral
X25519 key. The server sees only the recipient. To stop abuse, the sender
must show a **delivery token** derived from the recipient's profile key,
which only the recipient's contacts have.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Sealed sender: the outer envelope shows only the recipient; inside, encrypted to the recipient's identity key, are the sender certificate and the ordinary Signal message" fill="currentColor" font-size="13">
<rect x="20" y="20" width="600" height="190" rx="8" stroke="currentColor" fill="none"/>
<text x="36" y="44" font-weight="bold">what the server sees</text>
<text x="36" y="66" font-size="12.5">to: Bob's account · delivery token · time of arrival · sender's IP address</text>
<rect x="40" y="82" width="560" height="112" rx="6" class="soft" stroke="currentColor"/>
<text x="56" y="104" font-size="12.5">encrypted to Bob's identity key (ephemeral X25519, then AES and HMAC)</text>
<rect x="56" y="116" width="230" height="64" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="171" y="142" text-anchor="middle" font-size="12">sender certificate</text>
<text x="171" y="160" text-anchor="middle" font-size="11.5">Alice's account + key, signed</text>
<rect x="300" y="116" width="284" height="64" rx="6" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/>
<text x="442" y="142" text-anchor="middle" font-size="12">the double-ratchet message</text>
<text x="442" y="160" text-anchor="middle" font-size="11.5">header + ciphertext + MAC</text>
</svg>
<figcaption>Figure 16.4. Sealed sender. The server learns who receives, not who sends, but still sees network addresses and timing.</figcaption>
</figure>

That is a real gain, but it is not anonymity. The server still sees the
sender's IP address and the times of every message. In "Improving Signal's
Sealed Sender" (NDSS 2021), Ian Martiny and colleagues showed that the
automatic delivery receipts, which flow back immediately, let the server link
senders and recipients statistically after a handful of messages, and
proposed fixes. Signal also keeps little by design: in response to US
subpoenas it has published what it could hand over, which was the account's
creation date and the last time it connected.

Groups add their own metadata. Signal's **private groups** (2019 on) keep the
membership list on the server encrypted, and members prove they belong with
anonymous credentials (Chase, Perrin and Zaverucha, "The Signal Private Group
System", ACM CCS 2020), so the server stores the group without learning who
is in it.

## 16.8 Post-quantum Signal

*Level: intermediate.*

A quantum computer able to run Shor's algorithm would break every X25519
exchange above. Recorded conversations would then be readable: the "harvest
now, decrypt later" problem. Signal addressed it in two steps.

**PQXDH (September 2023)** adds a key encapsulation mechanism to the
handshake. Bob also uploads signed **Kyber prekeys**, one-time and
last-resort. Alice encapsulates to one of them, getting a shared secret SS
and a ciphertext CT, and the key becomes

$$
\begin{aligned}
SK = \mathrm{HKDF}\bigl(&F \,\|\, DH_1 \,\|\, DH_2\\
&\|\, DH_3 \,\|\, DH_4 \,\|\, SS\bigr).
\end{aligned}
$$

An attacker must break both X25519 and Kyber to learn SK. libsignal's label
for it is `WhisperText_X25519_SHA-256_CRYSTALS-KYBER-1024`: Signal shipped
the round-3 Kyber-1024, a year before NIST published the final ML-KEM (FIPS
203, August 2024), whose sizes match but whose internal hashing differs. Before
release, Karthikeyan Bhargavan, Charlie Jacomme, Franziskus Kiefer and Rolfe
Schmidt analyzed PQXDH with ProVerif and CryptoVerif (USENIX Security 2024)
and found weaknesses in the first draft, including a possible confusion
between the Kyber and X25519 public keys, fixed in the published revision.

**SPQR (October 2025)** puts post-quantum secrets into the ratchet itself.
PQXDH protects the start of a conversation, but every later DH ratchet step
was still X25519 only, so a quantum attacker who broke one could follow the
conversation from there. A KEM exchange in every message would be too big:
an ML-KEM-768 key and ciphertext are 1,184 and 1,088 bytes, against 32 for
X25519. SPQR, the "Sparse Post-Quantum Ratchet", runs an ML-KEM-768 exchange
in the background instead, cut into erasure-coded pieces that ride on
ordinary messages, so that a new post-quantum secret arrives every so often
without any one message growing much. Its output is mixed into each message
key as the HKDF salt (the `None` you see in libsignal's test). Signal calls
the combination the **Triple Ratchet**; libsignal made it mandatory in 2026.
The [KEMs and signatures](../post-quantum/03-KEMs-and-Signatures.md) chapter
of the Post-quantum book explains ML-KEM.

Identity keys are still X25519. A quantum attacker could therefore
impersonate someone in a *new* session, an active attack at the time, but
could not read recorded ones. Authentication can wait for the quantum
computer to exist; confidentiality of today's messages cannot.

Apple's iMessage took a similar path with **PQ3** (February 2024): Kyber in
the initial key exchange and a periodic post-quantum rekey in the ratchet.

## 16.9 Mars: a ratchet across 20 minutes

*Level: intermediate.*

The double ratchet makes no assumption about timing. Messages can arrive
late, out of order, or after hours, and the skipped-keys table takes care of
it. So it works between Earth and Arcadia City without change. What changes
is how fast it heals: a DH ratchet step needs the other side's new key to
arrive and a reply to come back, so the healing time is the conversation's
round trip, and between the planets that is at least the light round trip,
6 to 44 minutes.

### Code it: healing across the gap

The simulation runs the ratchet above with two parties that each send a
message every 10 minutes, Earth on the hour and ten-minute marks, Mars five
minutes later. At minute 62 a thief copies the Mars phone's state and then
reads along with every message Earth sends to Mars.

```python
# Mars: the same ratchet over a light delay. Earth and Arcadia City each send a
# message every 10 minutes; at minute 62 a thief copies the Mars phone's state.
# Which later Earth messages can the thief read? Uses Ratchet from above.
import heapq

def run(delay, steal_at=62, until=240):
    pair = keypair()
    earth = Ratchet(SK_alice, AD, their_pub=pair[1])
    mars = Ratchet(SK_alice, AD, my_pair=pair)
    events, thief, read, ratchets = [], None, [], 0
    for t in range(0, until, 10):
        heapq.heappush(events, (t, 0, "earth sends"))
        heapq.heappush(events, (t + 5, 0, "mars sends"))
    heapq.heappush(events, (steal_at, 0, "steal"))
    seq = 1
    while events:
        t, _, what = heapq.heappop(events)
        if what == "steal":
            thief = copy.deepcopy(mars)
        elif what == "earth sends":
            heapq.heappush(events, (t + delay, seq, ("to mars", t, earth.send(f"Earth at minute {t}")))); seq += 1
        elif what == "mars sends":
            if mars.CKs:
                heapq.heappush(events, (t + delay, seq, ("to earth", t, mars.send(f"Mars at minute {t}")))); seq += 1
        elif what[0] == "to earth":
            earth.receive(*what[2])
        else:
            key_before = mars.DHs[1]
            mars.receive(*what[2])
            ratchets += mars.DHs[1] != key_before
            if thief:
                try: thief.receive(*what[2]); read.append(what[1])
                except Exception: pass
    return read, ratchets

for name, delay in [("Earth to Earth, 1 second", 1 / 60), ("Earth to Mars, 20 minutes", 20)]:
    read, ratchets = run(delay)
    print(f"{name}: Mars made {ratchets} new ratchet keys in 4 hours;")
    print(f"   the thief read Earth's messages sent at minutes {read}")
```

```text
Earth to Earth, 1 second: Mars made 24 new ratchet keys in 4 hours;
   the thief read Earth's messages sent at minutes [70]
Earth to Mars, 20 minutes: Mars made 5 new ratchet keys in 4 hours;
   the thief read Earth's messages sent at minutes [50, 60, 70, 80, 90]
```

With a one-second delay, the thief reads the single Earth message already on
its way, and the next Mars reply heals the conversation. With a 20-minute
delay, Mars makes only five new ratchet keys in four hours instead of
twenty-four, and the thief reads five Earth messages, everything Earth sent
from minute 50 to 90, because Earth keeps using the chain it started before
Mars's new key could reach it.

Three things help. **Keep talking**: an automatic, empty "heartbeat" message
from each side, every few minutes, carries a fresh ratchet key and keeps the
healing time near the light round trip instead of the human one. **Protect
the device** harder than on Earth, since each theft is worth more: keys in a
secure element, short disappearing-message timers. And **plan for
conjunction**: during the two-week blackout no keys move at all, so each
side should treat the first messages after it as the start of a new
session, with a fresh X3DH against prekeys uploaded in advance to a server
on each planet. Prekey servers themselves need copies on both sides, since
fetching a bundle across the gap costs a round trip.

## 16.10 In the real world

*Level: intermediate.*

| | Signal | WhatsApp |
|---|---|---|
| Handshake | PQXDH: X25519 + Kyber-1024 | X3DH-style, X25519 |
| Ratchet | double ratchet + SPQR | double ratchet |
| Message cipher | AES-256-CBC + HMAC-SHA256 | AES-256-CBC + HMAC-SHA256 |
| Groups | sender keys, private groups | sender keys |
| Key transparency | not described in its documents | deployed from 2023 |

The table states what each project documents (libsignal's source, WhatsApp's
white paper of February 2026, which describes no post-quantum step);
implementation details change. WhatsApp, with over two billion users, has
used the protocol for all chats since 2016. Facebook Messenger made
end-to-end encryption, also built on the Signal protocol, the default for
personal chats in December 2023, and Google Messages uses it for chats
between its own users. Cross-platform RCS between Android and iPhone uses MLS
instead (GSMA Universal Profile 3.0, 2025), the subject of Chapter 17.

**Groups.** Signal-style pairwise sessions make a message to a group of $n$
cost $n - 1$ encryptions. **Sender keys** fix the cost: each member sends
every other member, once, over the pairwise sessions, a symmetric chain key
of its own and a signing key; then each group message is encrypted once with
the sender's chain and signed. It loses post-compromise security for the
group (a stolen sender key works until the sender rotates it) and is why
groups were the motivation for MLS.

**Multiple devices.** Each device is a separate identity in the protocol;
Signal's **Sesame** algorithm keeps one session per pair of devices and
settles on the most recently used. A message to Bob is encrypted separately
to each of his devices.

**Formal analysis.** Katriel Cohn-Gordon, Cas Cremers, Benjamin Dowling,
Luke Garratt and Douglas Stebila gave the first formal security analysis of
the Signal protocol (IEEE EuroS&P 2017), proving that its key exchange and
ratchet give the claimed secrecy, forward secrecy and post-compromise
security under standard assumptions. Joël Alwen, Sandro Coretti and Yevgeniy
Dodis defined the double ratchet's security notions formally and gave a
modular proof (EUROCRYPT 2019).

## 16.11 Going deeper

*Level: expert.*

**Healing is bounded by the conversation.** Post-compromise security needs
the victim to send a new ratchet key and receive a reply; a phone that only
receives (a broadcast channel, a quiet contact) never heals. Cohn-Gordon,
Cremers and Garratt formalized post-compromise security (CSF 2016) and
showed that it needs per-session state that the attacker loses track of;
no stateless protocol can provide it.

**Optimal ratchets.** Researchers have asked how much security a ratchet
can provide at all. Jaeger and Stepanovs (CRYPTO 2018) and Poettering and
Rösler (CRYPTO 2018) defined "optimally secure" ratcheting, where even an
attacker who knows one party's state at some moment cannot impersonate it
after the next message, and showed that it requires heavier tools such as
key-updatable public-key encryption; Signal's double ratchet deliberately
stays at a cheaper point.

**Deniability under scrutiny.** X3DH is deniable against a judge who sees
only a transcript. But Signal's server could, in principle, see which
accounts exchanged prekey messages, and a party who keeps a signed sender
certificate (sealed sender, §16.7) holds a server signature naming the
sender. Deniability is a property of the cryptography, not of everything
around it, as DKIM showed for mail in Chapter 15.

**Post-quantum authentication.** Replacing X25519 identity keys with a
post-quantum signature or KEM-based authentication is the open step. A
KEM-only design, as in the "K-Waay" and related proposals, keeps deniability
better than signatures do; the size of prekey bundles and the absence of a
standard post-quantum non-interactive key exchange make the move hard.

## Check yourself

??? question "1. What is the difference between forward secrecy and post-compromise security?"
    Forward secrecy: a theft today does not reveal past messages, because
    their keys were deleted. Post-compromise security: a one-time theft
    stops working soon, because new secrets the attacker never saw keep
    entering the key schedule.

??? question "2. How can Alice start an X3DH session while Bob is offline?"
    Bob uploads in advance an identity key, a signed prekey and one-time
    prekeys. Alice fetches a bundle and does all four DH computations
    herself, then sends her first message with her public keys.

??? question "3. What does each of the four DH results in X3DH contribute?"
    DH1 (IK_A, SPK_B) authenticates Alice; DH2 (EK_A, IK_B) authenticates
    Bob; DH3 (EK_A, SPK_B) and DH4 (EK_A, OPK_B) involve only short-lived
    keys on Bob's side and give forward secrecy.

??? question "4. Why is X3DH deniable?"
    No one signs the handshake or the messages. Bob could compute the same
    shared key from Alice's public keys and his private ones, so a transcript
    proves nothing to a third party about Alice's participation.

??? question "5. Why does XEdDSA negate the private key sometimes?"
    An X25519 public key determines the Edwards y coordinate but not the
    sign of x. XEdDSA always uses the point with x even, so a verifier can
    rebuild the Edwards key from the X25519 key with sign bit 0; if the
    signer's point has x odd, the signer uses −k, which gives that point.

??? question "6. Why can't the symmetric ratchet alone provide post-compromise security?"
    Each chain key is a deterministic function of the previous one, so a
    thief who copies a chain key can compute all later keys. Only new
    Diffie-Hellman (or KEM) secrets end that.

??? question "7. How does the double ratchet handle messages that arrive out of order?"
    The header carries the message number and the length of the previous
    chain. The receiver steps its chain forward and stores the skipped
    message keys, up to a limit, to decrypt late messages.

??? question "8. Two safety numbers share their first 30 digits. Can you conclude there is no attack?"
    No. The halves are sorted, so an attacker who replaces Bob's key changes
    only Bob's half, which may appear second. Compare all 60 digits or scan
    the QR code.

??? question "9. What does sealed sender hide from the server, and what not?"
    It hides the sender's identity in the message. The server still sees the
    recipient, timing and the sender's network address, and delivery
    receipts allowed statistical linking until fixed.

??? question "10. Why does the ratchet heal more slowly between Earth and Mars, and what helps?"
    Healing needs the other side's new ratchet key to arrive and a reply to
    return, which takes at least a light round trip. Frequent automatic
    messages carrying new ratchet keys keep the window near that minimum.

## What you learned

- A messenger can promise more than mail: asynchronous start, forward
  secrecy per message, healing after a theft, and deniability.
- X3DH combines three or four X25519 results between identity keys, a signed
  prekey, a one-time prekey and an ephemeral key; XEdDSA lets the X25519
  identity key sign. You derived the same key on both sides.
- The double ratchet chains HMAC for every message and adds a new DH result
  at every change of direction. You coded it, matched libsignal's test
  vector, and saw a thief lose access after one round trip.
- Safety numbers detect key substitution, but only if compared; key
  transparency aims to do it automatically.
- Sealed sender hides the sender from the server, not the traffic pattern.
- PQXDH adds Kyber to the handshake and SPQR adds ML-KEM to the ratchet;
  authentication is still classical.
- Between planets the ratchet works unchanged but heals only once per light
  round trip, so automatic messages and device protection matter more.

## Further reading

- Moxie Marlinspike and Trevor Perrin, *The X3DH Key Agreement Protocol* and
  Trevor Perrin and Moxie Marlinspike, *The Double Ratchet Algorithm*, Signal,
  2016 (revision 4, 2025).
- Trevor Perrin, *The XEdDSA and VXEdDSA Signature Schemes*, 2016.
- Ehren Kret and Rolfe Schmidt, *The PQXDH Key Agreement Protocol*, Signal,
  2023; Signal's *ML-KEM Braid* specification and the blog post "Signal
  Protocol and Post-Quantum Ratchets", October 2025.
- Katriel Cohn-Gordon, Cas Cremers, Benjamin Dowling, Luke Garratt and
  Douglas Stebila, "A Formal Security Analysis of the Signal Messaging
  Protocol", IEEE EuroS&P 2017.
- Joël Alwen, Sandro Coretti and Yevgeniy Dodis, "The Double Ratchet:
  Security Notions, Proofs, and Modularization for the Signal Protocol",
  EUROCRYPT 2019.
- Karthikeyan Bhargavan, Charlie Jacomme, Franziskus Kiefer and Rolfe
  Schmidt, "Formal verification of the PQXDH Post-Quantum key agreement
  protocol for end-to-end secure messaging", USENIX Security 2024.
- Ian Martiny et al., "Improving Signal's Sealed Sender", NDSS 2021.
- Melissa Chase, Trevor Perrin and Greg Zaverucha, "The Signal Private Group
  System and Anonymous Credentials Supporting Efficient Verifiable
  Encryption", ACM CCS 2020.
- WhatsApp, *WhatsApp Encryption Overview* (technical white paper).
- libsignal, github.com/signalapp/libsignal: `rust/protocol/src/ratchet/`,
  `fingerprint.rs`, `pqxdh.rs`.
