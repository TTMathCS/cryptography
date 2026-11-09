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
vector, Signal's safety number, PQXDH as its specification describes it, and
the erasure code that lets the post-quantum ratchet spread a 1,152-byte key
over dozens of messages. You will watch a thief lose access to a
conversation one round trip after stealing a phone, and then watch how much
longer that takes, and how many keys a phone must hold for late messages,
when the round trip is to Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a messaging protocol must protect: forward secrecy,
      post-compromise security, asynchrony, deniability;
    - X3DH, the handshake against prekeys left on a server, coded;
    - XEdDSA: how one X25519 key can also sign;
    - the double ratchet: a symmetric ratchet for every message and a
      Diffie-Hellman ratchet for every turn of the conversation, coded;
    - safety numbers, and what they catch;
    - sealed sender: its certificates, its envelope, and what the server
      still learns;
    - PQXDH (2023), coded against its specification, and the sparse
      post-quantum ratchet SPQR (2025) with its erasure-coded chunks;
    - skipped message keys, their limits, and header encryption;
    - how WhatsApp, Messenger and others use the same design, and what ten
      years of formal analysis proved and found;
    - what a light delay of 3 to 22 minutes does to the ratchet.

    **You need:** [Chapter 15](15-Email-OpenPGP-and-SMIME.md) (why mail
    cannot do this) and [Chapter 8](08-WireGuard-and-Noise.md) (handshakes
    built from several Diffie-Hellman results); Diffie-Hellman, elliptic
    curves and message authentication from Chapters
    [12](../../book/12-Diffie-Hellman.md), [15](../../book/15-Elliptic-Curves.md)
    and [10](../../book/10-Message-Authentication.md) of book 1.

    **Levels:** §16.1 and §16.2 are for beginners, §16.3 to §16.12 are
    intermediate, §16.13 is expert.

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
compute millions of keys. §16.10 looks at what those kept keys cost.

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
# Uses keypair from the first listing, for the key a dishonest server swaps in.
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
fake = bytes([5]) + keypair()[1]                # the server makes a key pair of its own
c = half(b"+14153333333", fake)
print(" ".join((min(a, c) + max(a, c))[i:i + 5] for i in range(0, 60, 5)))
```

```text
30035 44776 92869 39689 28698 76765 45825 75691 62576 84344 09180 79131
matches libsignal: True
30035 44776 92869 39689 28698 76765 43573 63691 19914 31458 28514 01631
```

The first line equals libsignal's test value. In the second, a server has
replaced Bob's key: his 30 digits are new, but Alice's half, which did not
change, still sorts first, so the first six groups are exactly as before.
Users who compare "the first few groups" see a match and miss the attack.
With another fake key Bob's new half could sort first and push Alice's half
to the second position instead; either way only one half changes, which is
why the app compares the whole number, or the QR code.

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

### Inside the envelope, field by field

libsignal's sealed sender, version 1 (version byte 0x11), is a small one-way
handshake of its own, much like the Noise pattern X of
[Chapter 8](08-WireGuard-and-Noise.md). Alice makes an ephemeral X25519 key
$e$ and runs HKDF on $DH(e, IK_B)$, with the salt `UnidentifiedDelivery` ‖
IK<sub>B</sub> ‖ $e_{pub}$, to get a chain key, a cipher key and a MAC key.
Under those she encrypts her own identity public key (AES-256 in counter
mode, HMAC-SHA256 cut to 10 bytes). She then runs HKDF on $DH(IK_A, IK_B)$,
salted with the chain key and that ciphertext, and encrypts the message
content under the result. The first layer hides the sender from everyone
but Bob; the second proves to Bob that the sender holds Alice's identity
private key, without a signature, so the deniability of X3DH is kept.

The content holds the message type, the **sender certificate**, the
double-ratchet message, a content hint (whether the sender will retry) and,
for groups, the group id. The certificate holds the sender's account UUID,
optionally a phone number, the device id, an expiry time in milliseconds,
the sender's identity key, and the **server certificate** that signed it:
a key id and the server's signing key, itself signed by a **trust root**
whose public key is built into every copy of the app (Figure 16.5). Signal's
announcement of October 2018 called the sender certificate short-lived; the
app fetches a fresh one from time to time.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="A sealed sender message: version byte, ephemeral key, encrypted sender key, encrypted content holding the sender certificate, which a server certificate signs, which a built-in trust root signs" fill="currentColor" font-size="12">
<text font-size="13" x="20" y="20" font-weight="bold">sealed sender v1, as the server receives it</text>
<rect x="20" y="32" width="50" height="40" rx="4" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
<text x="45" y="57" text-anchor="middle">0x11</text>
<rect x="70" y="32" width="120" height="40" rx="4" fill="none" stroke="currentColor"/>
<text x="130" y="50" text-anchor="middle">ephemeral key</text>
<text x="130" y="65" text-anchor="middle" font-size="11" fill-opacity=".7">33 bytes, in clear</text>
<rect x="190" y="32" width="170" height="40" rx="4" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
<text x="275" y="50" text-anchor="middle">sender's identity key</text>
<text x="275" y="65" text-anchor="middle" font-size="11" fill-opacity=".7">AES-CTR + 10-byte MAC</text>
<rect x="360" y="32" width="260" height="40" rx="4" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<text x="490" y="50" text-anchor="middle">encrypted message</text>
<text x="490" y="65" text-anchor="middle" font-size="11" fill-opacity=".7">AES-CTR + 10-byte MAC</text>
<text x="275" y="90" text-anchor="middle" font-size="11">key from DH(e, IK_B)</text>
<text x="490" y="90" text-anchor="middle" font-size="11">key from DH(IK_A, IK_B) and the first step</text>
<line x1="360" y1="72" x2="330" y2="112" stroke="currentColor" stroke-dasharray="3 3"/>
<line x1="620" y1="72" x2="620" y2="112" stroke="currentColor" stroke-dasharray="3 3"/>
<rect x="330" y="112" width="290" height="160" rx="6" fill="none" stroke="currentColor"/>
<text x="345" y="134" font-weight="bold" font-size="12.5">inside: the sender's message content</text>
<text x="345" y="158">type: prekey, message, sender key, plain</text>
<rect x="340" y="168" width="270" height="24" rx="4" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
<text x="350" y="185">sender certificate</text>
<text x="345" y="212">content: the double-ratchet message</text>
<text x="345" y="236">content hint: resend, show an error, or not</text>
<text x="345" y="260">group id (for group messages)</text>
<rect x="20" y="112" width="270" height="40" rx="6" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<text x="155" y="137" text-anchor="middle">trust root public key, built into the app</text>
<line x1="155" y1="152" x2="155" y2="176" stroke="currentColor" stroke-width="1.5"/><polygon points="155,180 150,170 160,170"/>
<text x="165" y="171" font-size="11">signs</text>
<rect x="20" y="182" width="270" height="44" rx="6" fill="none" stroke="currentColor"/>
<text x="155" y="200" text-anchor="middle">server certificate</text>
<text x="155" y="217" text-anchor="middle" font-size="11.5">key id, server's signing key</text>
<line x1="155" y1="226" x2="155" y2="250" stroke="currentColor" stroke-width="1.5"/><polygon points="155,254 150,244 160,244"/>
<text x="165" y="245" font-size="11">signs</text>
<rect x="20" y="256" width="270" height="130" rx="6" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
<text x="155" y="276" text-anchor="middle" font-weight="bold">sender certificate</text>
<text x="35" y="298" font-size="11.5">sender's account UUID</text>
<text x="35" y="316" font-size="11.5">phone number (optional)</text>
<text x="35" y="334" font-size="11.5">device id</text>
<text x="35" y="352" font-size="11.5">expires (milliseconds since 1970)</text>
<text x="35" y="370" font-size="11.5">identity key; signer (the server cert)</text>
<line x1="340" y1="180" x2="296" y2="290" stroke="currentColor" stroke-dasharray="4 3"/><polygon points="292,298 293,286 302,291"/>
</svg>
<figcaption>Figure 16.5. A sealed-sender message, field by field (libsignal's format). The server sees the version byte, an ephemeral key and two ciphertexts. Inside, the sender certificate names the sender, and a chain of two signatures ties it to a key built into every Signal app.</figcaption>
</figure>

### What the recipient checks

Bob's phone opens both layers with its identity private key, then checks
the server certificate against the trust root (and that its key id is not
revoked), the sender certificate against the server key, the expiry time,
and that the identity key in the certificate is the key the inner layer
proved. Only then does it run the double ratchet on the content. The last
check matters: a sender certificate is not secret, since every contact who
gets a sealed message from Alice sees hers, and without the check Mallory
could attach it to a message sealed with Mallory's own key. The server
signs at all because on a first message Bob does not know Alice's key yet,
and only the server can vouch that a key belongs to an account and a
device; the price is that Bob holds a server signature naming the sender
(§16.13).

To limit abuse, a sender must present the recipient's **unidentified
access key**, 16 bytes derived from the recipient's profile key, which only
contacts have, unless the recipient accepts sealed messages from anyone. A
second version (version bytes 0x22 and 0x23) encrypts the content once with
AES-256-GCM-SIV and wraps a 32-byte key per recipient, so that a group
message is uploaded once and fanned out by the server.

For Arcadia City the expiry check is where sealed sender meets the light
delay. Twenty-two minutes matter only for very short lifetimes; a two-week
conjunction matters for any, since certificates issued only on Earth would
expire mid-blackout. A city server with its own server certificate, signed
in advance by the trust root, keeps sealed sender working on both sides.

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

### PQXDH step by step

The PQXDH specification (Ehren Kret and Rolfe Schmidt, revision 3, January
2024) is X3DH with one more ingredient at every stage. It fixes a curve, a
hash, an info string naming the application, a KEM, and two encodings,
EncodeEC and EncodeKEM, each a one-byte type followed by the public key, so
that no byte string reads both as a curve key and as a KEM key.

1. **Bob publishes** IK<sub>B</sub>; SPK<sub>B</sub> with
   $Sig(IK_B, EncodeEC(SPK_B))$; a signed **last-resort KEM prekey**
   PQSPK<sub>B</sub>; a batch of signed **one-time KEM prekeys**; and a
   batch of one-time curve prekeys. Every key has an id.
2. **Alice fetches** IK<sub>B</sub>, SPK<sub>B</sub>, one KEM prekey
   PQPK<sub>B</sub> (one-time if any are left, else the last-resort one),
   both signatures, and perhaps one OPK<sub>B</sub>, and verifies the
   signatures.
3. **Alice computes** a fresh EK<sub>A</sub>, $(CT, SS) = Encaps(PQPK_B)$,
   DH<sub>1</sub> to DH<sub>4</sub> as in X3DH, and
   $$
   \begin{aligned}
   SK = \mathrm{HKDF}\bigl(&0^{n},\ F \,\|\, DH_1 \,\|\, DH_2\\
   &\|\, DH_3 \,\|\, DH_4 \,\|\, SS,\ info\bigr).
   \end{aligned}
   $$
   She deletes the private ephemeral key, the DH values and SS, and sends
   IK<sub>A</sub>, EK<sub>A</sub>, CT, the prekey ids and a first
   ciphertext with $AD = EncodeEC(IK_A) \,\|\, EncodeEC(IK_B)$.
4. **Bob** decapsulates, computes the same SK, decrypts, and deletes the
   one-time prekeys used; the last-resort KEM prekey waits for its
   scheduled rotation.

libsignal takes 96 bytes from that HKDF and splits them into the first root
key, the first chain key and an authentication key for the post-quantum
ratchet of §16.9.

Two details came out of the analyses. The type bytes exist because the
first draft let one signature be read over keys of two kinds (Bhargavan and
colleagues); the published revision rules it out. And SK depends on SS but
not directly on CT or PQPK<sub>B</sub>, so the KEM must bind its secret to
its key; Kyber and ML-KEM both hash the public key into the secret, and
Rune Fiedler and Felix Günther's proof (PKC 2025) states the property
needed.

### A worked example by hand: what the handshake costs

With libsignal's sizes (Figure 16.6), each key carries its one-byte type. An X3DH bundle
is IK<sub>B</sub> (33 bytes), SPK<sub>B</sub> (33) and its signature (64),
and OPK<sub>B</sub> (33):

$$
33 + 33 + 64 + 33 = 163 \text{ bytes.}
$$

PQXDH adds a Kyber-1024 prekey of $1 + 1{,}568 = 1{,}569$ bytes and its
64-byte signature, so the bundle grows to

$$
163 + 1{,}569 + 64 = 1{,}796 \text{ bytes},
$$

about eleven times as much. Alice's first message carries IK<sub>A</sub>,
EK<sub>A</sub> and the ciphertext (1,569 bytes with its type byte):
$33 + 33 + 1{,}569 = 1{,}635$ bytes of keys. The HKDF input is
$32 + 4 \times 32 + 32 = 192$ bytes. None of this adds a round trip: the
handshake is still one message, whether Bob is across town or 22
light-minutes away.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="PQXDH: Bob's bundle with its sizes, Alice's four DH results and one KEM encapsulation, her first message with its sizes, and the HKDF over all five secrets" fill="currentColor" font-size="12">
<text font-size="13" x="120" y="20" text-anchor="middle" font-weight="bold">Bob's bundle (server)</text>
<text font-size="13" x="320" y="20" text-anchor="middle" font-weight="bold">Alice computes</text>
<text font-size="13" x="530" y="20" text-anchor="middle" font-weight="bold">her first message</text>
<rect x="20" y="34" width="200" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="30" y="54">IK_B identity</text><text x="210" y="54" text-anchor="end">33 B</text>
<rect x="20" y="70" width="200" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="30" y="90">SPK_B + signature</text><text x="210" y="90" text-anchor="end">33 + 64 B</text>
<rect x="20" y="106" width="200" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="30" y="126">OPK_B one-time</text><text x="210" y="126" text-anchor="end">33 B</text>
<rect x="20" y="142" width="200" height="110" rx="4" fill="currentColor" fill-opacity=".2" stroke="currentColor"/>
<text x="30" y="164">PQPK_B KEM prekey</text>
<text x="30" y="182" font-size="11.5">one-time, or last-resort</text>
<text x="30" y="200" font-size="11.5">+ signature</text>
<text x="210" y="240" text-anchor="end">1,569 + 64 B</text>
<text x="120" y="272" text-anchor="middle">total 1,796 B (X3DH: 163 B)</text>
<g font-size="12">
<text font-size="13" x="250" y="58">DH1 = DH(IK_A, SPK_B)</text>
<text font-size="13" x="250" y="80">DH2 = DH(EK_A, IK_B)</text>
<text font-size="13" x="250" y="102">DH3 = DH(EK_A, SPK_B)</text>
<text font-size="13" x="250" y="124">DH4 = DH(EK_A, OPK_B)</text>
</g>
<rect x="245" y="160" width="160" height="50" rx="6" fill="currentColor" fill-opacity=".2" stroke="currentColor"/>
<text x="325" y="181" text-anchor="middle">Encaps(PQPK_B)</text>
<text x="325" y="199" text-anchor="middle">→ CT, SS</text>
<line x1="220" y1="185" x2="241" y2="185" stroke="currentColor" stroke-width="1.5"/><polygon points="245,185 235,180 235,190"/>
<line x1="405" y1="185" x2="426" y2="185" stroke="currentColor" stroke-width="1.5"/><polygon points="430,185 420,180 420,190"/>
<rect x="430" y="34" width="200" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="440" y="54">IK_A identity</text><text x="620" y="54" text-anchor="end">33 B</text>
<rect x="430" y="70" width="200" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="440" y="90">EK_A ephemeral</text><text x="620" y="90" text-anchor="end">33 B</text>
<rect x="430" y="142" width="200" height="110" rx="4" fill="currentColor" fill-opacity=".2" stroke="currentColor"/>
<text x="440" y="164">CT KEM ciphertext</text>
<text x="620" y="240" text-anchor="end">1,569 B</text>
<text x="530" y="272" text-anchor="middle">+ prekey ids + ciphertext</text>
<rect x="60" y="296" width="520" height="66" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="320" text-anchor="middle" font-size="12.5">SK = HKDF(salt = 0, 0xFF×32 ‖ DH1 ‖ DH2 ‖ DH3 ‖ DH4 ‖ SS, info)</text>
<text x="320" y="344" text-anchor="middle">32 + 4 × 32 + 32 = 192 bytes in; break X25519 and the KEM, or learn nothing</text>
<line x1="325" y1="210" x2="325" y2="292" stroke="currentColor" stroke-dasharray="4 3"/><polygon points="325,296 320,286 330,286"/>
</svg>
<figcaption>Figure 16.6. PQXDH with Signal's sizes (keys carry a one-byte type). The handshake is X3DH plus one KEM encapsulation to a signed KEM prekey; the KEM adds about 1.6 kB each way and no round trip.</figcaption>
</figure>

### Code it: PQXDH against the specification

The program follows the four steps, after checking the X25519 function of
§16.3 against RFC 7748 (section 6.1). The KEM is a labeled **stand-in** with
ML-KEM-1024's interface and sizes but X25519 inside, so it gives no
protection against a quantum computer; the Post-quantum book's
[ML-KEM chapter](../post-quantum/08-ML-KEM.md) builds the real FIPS 203
algorithm. The info string and type bytes 0x05 and 0x08 are libsignal's.

```python
# PQXDH (Signal, 2023): X3DH's four X25519 results plus one KEM secret, into one HKDF.
# Uses x25519, hkdf, keypair, randbytes, xeddsa_sign and xeddsa_verify from the first listing.

# X25519 against the test vector of RFC 7748, section 6.1
a = bytes.fromhex("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
b = bytes.fromhex("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb")
print("RFC 7748 public keys:", x25519(a).hex()[:16], x25519(b).hex()[:16])
print("RFC 7748 shared K matches:", x25519(a, x25519(b)) == x25519(b, x25519(a)) ==
      bytes.fromhex("4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742"))

# A STAND-IN for the KEM with ML-KEM-1024's sizes. Inside it is X25519, so it is
# NOT post-quantum; it only lets the protocol run. (Post-quantum book, ch. 8: ML-KEM.)
EK_LEN = CT_LEN = 1568
pad = lambda b, label: b + hashlib.shake_256(label + b).digest(EK_LEN - 32)
def kem_keygen():
    dk, pk = keypair()
    return dk, pad(pk, b"ek")
def kem_encaps(ek):
    e, E = keypair()
    ct = pad(E, b"ct")
    return ct, hashlib.sha3_256(x25519(e, ek[:32]) + ct + ek).digest()
def kem_decaps(dk, ct):
    ek = pad(x25519(dk), b"ek")
    return hashlib.sha3_256(x25519(dk, ct[:32]) + ct + ek).digest()

enc_ec = lambda pk: b"\x05" + pk                # EncodeEC: type byte, then the key
enc_kem = lambda ek: b"\x08" + ek               # EncodeKEM: libsignal's byte for Kyber-1024

# Bob publishes his keys and two signatures
IKb, IKb_pub = keypair()
SPKb, SPKb_pub = keypair()
PQb, PQb_pub = kem_keygen()
OPKb, OPKb_pub = keypair()
bundle = {"IK": IKb_pub, "SPK": SPKb_pub, "SPK sig": xeddsa_sign(IKb, enc_ec(SPKb_pub), randbytes(64)),
          "PQPK": PQb_pub, "PQPK sig": xeddsa_sign(IKb, enc_kem(PQb_pub), randbytes(64)), "OPK": OPKb_pub}

# Alice: both signatures, four DH results, one encapsulation
IKa, IKa_pub = keypair()
assert xeddsa_verify(bundle["IK"], enc_ec(bundle["SPK"]), bundle["SPK sig"])
assert xeddsa_verify(bundle["IK"], enc_kem(bundle["PQPK"]), bundle["PQPK sig"])
EKa, EKa_pub = keypair()
CT, SS = kem_encaps(bundle["PQPK"])
DH1, DH2 = x25519(IKa, bundle["SPK"]), x25519(EKa, bundle["IK"])
DH3, DH4 = x25519(EKa, bundle["SPK"]), x25519(EKa, bundle["OPK"])
F, info = b"\xff" * 32, b"WhisperText_X25519_SHA-256_CRYSTALS-KYBER-1024"
km = F + DH1 + DH2 + DH3 + DH4 + SS
SK_a = hkdf(km, bytes(32), info, 32)
first = {"IK": IKa_pub, "EK": EKa_pub, "CT": CT}  # plus the ids of the prekeys used
size = 3 + len(IKa_pub + EKa_pub + CT)          # with a type byte on each, as libsignal sends them
print("KDF input:", len(km), "bytes; first message adds", size, "bytes of keys")

# Bob, later: decapsulate, the same DH results, the same key
SS_b = kem_decaps(PQb, first["CT"])
SK_b = hkdf(F + x25519(SPKb, first["IK"]) + x25519(IKb, first["EK"]) + x25519(SPKb, first["EK"])
            + x25519(OPKb, first["EK"]) + SS_b, bytes(32), info, 32)
print("Bob derives the same SK:", SK_a == SK_b)

# A future attacker who can solve X25519 learns DH1..DH4 but not SS
print("SK without SS:", hkdf(F + DH1 + DH2 + DH3 + DH4 + bytes(32), bytes(32), info, 32) == SK_a)
# A server that hands out its own KEM key is caught by Bob's signature
print("server's KEM key verifies:", xeddsa_verify(bundle["IK"], enc_kem(kem_keygen()[1]), bundle["PQPK sig"]))
```

It prints:

```text
RFC 7748 public keys: 8520f0098930a754 de9edb7d7b7dc1b4
RFC 7748 shared K matches: True
KDF input: 192 bytes; first message adds 1635 bytes of keys
Bob derives the same SK: True
SK without SS: False
server's KEM key verifies: False
```

The public keys and the shared value match RFC 7748. Bob derives the same
SK from the first message alone. The third line from the end is the point
of PQXDH: a future attacker who solves X25519 recovers all four DH values,
but without SS the key is out of reach. The last line is X3DH's check again,
now on the KEM prekey.

Identity keys are still X25519. A quantum attacker could therefore
impersonate someone in a *new* session, an active attack at the time, but
could not read recorded ones. Authentication can wait for the quantum
computer to exist; confidentiality of today's messages cannot.

Apple's iMessage took a similar path with **PQ3** (February 2024): Kyber in
the initial key exchange and a periodic post-quantum rekey in the ratchet.

PQXDH protects the start of a conversation; the next section follows the
post-quantum secrets into the ratchet. How these steps fit the wider move of
TLS, SSH and other protocols to hybrid key exchange is told in the
Post-quantum book's [chapter 18](../post-quantum/18-Hybrids-and-the-Migration.md).

## 16.9 SPQR: the sparse post-quantum ratchet

*Level: intermediate.*

PQXDH already stops the attacker who only records: every root key descends
from SK, which contains the KEM secret. What it cannot give is **healing**
against a quantum attacker. After a theft of the phone's state, the next DH
ratchet step locks out an ordinary thief, but a thief with a quantum
computer can compute the new DH result from the two public ratchet keys in
the headers, so for them the conversation never heals.

A KEM exchange at every turn would fix that at 2,272 bytes per round trip
(an ML-KEM-768 key of 1,184 bytes and a ciphertext of 1,088), against 32
bytes for an X25519 ratchet key, while most chat messages are under 100
bytes. Signal's answer, as described by Signal in October 2025, is the
**Sparse Post-Quantum Ratchet**, SPQR: a fresh post-quantum secret every
few dozen messages, paid for in small pieces that ride on ordinary
messages. The double ratchet with SPQR beside it is the **Triple Ratchet**.

### The ML-KEM Braid

SPQR's key exchange, the **ML-KEM Braid** (specified by Graeme Connell and
Rolfe Schmidt), uses ML-KEM's internals. An ML-KEM-768 encapsulation key is
a 1,152-byte vector $t$ and a 32-byte seed $\rho$. Encapsulation makes two
ciphertext parts: $u$ (960 bytes), which needs only $\rho$ and a hash of the
key, and $v$ (128 bytes), which needs $t$. So one exchange becomes four
pieces: a 64-byte **header** (seed and hash), the **key vector**, **ct1**
and **ct2**. In each epoch (Figure 16.7):

1. Alice makes an ML-KEM-768 key pair and sends the header with a 32-byte
   MAC, then the key vector, one chunk per message;
2. Bob encapsulates as soon as he has the header and sends ct1, while Alice
   is still sending the key;
3. with the whole key vector, Bob finishes and sends ct2 with a MAC;
4. Alice decapsulates; both derive the **epoch secret** with HKDF (label
   `Signal_PQCKA_V1_MLKEM768:SCKA Key`). Next epoch the roles swap.

The MAC key starts from the 32 bytes PQXDH set aside (§16.8) and is updated
with every epoch secret, so a man in the middle cannot slip in a KEM key of
their own.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="One SPQR epoch: Alice's messages carry header and key chunks, Bob's carry ciphertext chunks; lost chunks are replaced by extra coded ones; the epoch secret salts the message keys" fill="currentColor" font-size="12">
<text font-size="13" x="20" y="18" font-weight="bold">one SPQR epoch: one 32-byte chunk rides on each message</text>
<text x="20" y="61">Alice</text>
<rect x="70" y="48" width="34" height="18" fill="currentColor" fill-opacity=".55" stroke="currentColor" stroke-width=".7"/>
<rect x="106" y="48" width="430" height="18" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width=".7"/>
<rect x="538" y="48" width="46" height="18" fill="none" stroke="currentColor" stroke-dasharray="2 2"/>
<path d="M81,48v18M93,48v18M117,48v18M129,48v18M141,48v18M153,48v18M165,48v18M177,48v18M189,48v18M201,48v18M213,48v18M225,48v18M237,48v18M249,48v18M261,48v18M273,48v18M285,48v18M297,48v18M309,48v18M321,48v18M333,48v18M345,48v18M357,48v18M369,48v18M381,48v18M393,48v18M405,48v18M417,48v18M429,48v18M441,48v18M453,48v18M465,48v18M477,48v18M489,48v18M501,48v18M513,48v18M525,48v18M549,48v18M561,48v18M573,48v18" stroke="currentColor" stroke-width=".7" fill="none"/>
<path d="M177,46l12,22M273,46l12,22M429,46l12,22" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="70" y="42" font-size="11">header + MAC: 96 B = 3 chunks</text>
<text x="250" y="84" font-size="11.5">encapsulation key: 1,152 B = 36 chunks; any 36 rebuild it</text>
<text x="540" y="42" font-size="11" fill-opacity=".7">extra coded</text>
<text x="20" y="143">Bob</text>
<rect x="130" y="130" width="358" height="18" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width=".7"/>
<rect x="514" y="130" width="58" height="18" fill="currentColor" fill-opacity=".55" stroke="currentColor" stroke-width=".7"/>
<rect x="574" y="130" width="22" height="18" fill="none" stroke="currentColor" stroke-dasharray="2 2"/>
<path d="M141,130v18M153,130v18M165,130v18M177,130v18M189,130v18M201,130v18M213,130v18M225,130v18M237,130v18M249,130v18M261,130v18M273,130v18M285,130v18M297,130v18M309,130v18M321,130v18M333,130v18M345,130v18M357,130v18M369,130v18M381,130v18M393,130v18M405,130v18M417,130v18M429,130v18M441,130v18M453,130v18M465,130v18M477,130v18M525,130v18M537,130v18M549,130v18M561,130v18M585,130v18" stroke="currentColor" stroke-width=".7" fill="none"/>
<path d="M273,128l12,22" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="130" y="166" font-size="11.5">ct1: 960 B = 30 chunks, from the header alone</text>
<text x="470" y="166" font-size="11.5">ct2 + MAC: 160 B</text>
<text x="470" y="182" font-size="11.5">= 5 chunks, needs all of ek</text>
<path d="M106,68L128,126M538,68L545,126" stroke="currentColor" stroke-dasharray="3 3" fill="none"/><path d="M130,130l-7,-9l9,-2zM546,130l-6,-10l9,-1z"/>
<rect x="20" y="210" width="130" height="46" rx="6" fill="none" stroke="currentColor"/>
<text x="85" y="229" text-anchor="middle">epoch secret</text>
<text x="85" y="246" text-anchor="middle" font-size="11">HKDF of ML-KEM's SS</text>
<rect x="180" y="210" width="130" height="46" rx="6" fill="none" stroke="currentColor"/>
<text x="245" y="229" text-anchor="middle">SPQR chain</text>
<text x="245" y="246" text-anchor="middle" font-size="11">one key per message</text>
<rect x="340" y="210" width="130" height="46" rx="6" fill="none" stroke="currentColor"/>
<text x="405" y="229" text-anchor="middle">salt of HKDF</text>
<text x="405" y="246" text-anchor="middle" font-size="11">for each message key</text>
<rect x="500" y="210" width="130" height="46" rx="6" fill="none" stroke="currentColor"/>
<text x="565" y="229" text-anchor="middle">then roles swap</text>
<text x="565" y="246" text-anchor="middle" font-size="11">Bob sends a key next</text>
<path d="M150,233h26M310,233h26M470,233h26" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M180,233l-10,-5v10zM340,233l-10,-5v10zM500,233l-10,-5v10z"/>
<text x="320" y="290" text-anchor="middle">Each message grows by one 32-byte chunk and its index; a whole ML-KEM-768 exchange is 2,272 bytes.</text>
<text x="320" y="310" text-anchor="middle" fill-opacity=".7">Crossed squares: messages lost on the way. Dashed: extra coded chunks that replace them.</text>
</svg>
<figcaption>Figure 16.7. One epoch of SPQR's ML-KEM Braid, with the sizes in Signal's code. Bob starts his first ciphertext part as soon as the 64-byte header arrives, while Alice is still sending the key; erasure coding means no particular chunk has to arrive.</figcaption>
</figure>

### Erasure-coded chunks

Each chunk is 32 bytes with a 16-bit index. Messages get lost, and an
attacker can choose which ones. Plain chunks sent in turn and repeated
would make a lost chunk wait a whole cycle. SPQR instead uses a
**systematic Reed-Solomon code** over $GF(2^{16})$: the first $N$ chunks are
the data, every later chunk a new combination, and **any** $N$ chunks
rebuild the message.

The idea is Shamir's secret sharing again. Split each chunk into sixteen
16-bit symbols. For symbol position $s$, the $N$ data chunks give points
$(j, y_j)$ for $j < N$, and one polynomial $f_s$ of degree below $N$ passes
through them; chunk $i$ carries $f_s(i)$ for every $s$. Any $N$ values fix
the polynomial, by Lagrange interpolation,

$$
f(x) = \sum_{j} y_j \prod_{m \ne j} \frac{x - x_m}{x_j - x_m},
$$

so any $N$ chunks give back the missing ones. In $GF(2^{16})$ adding and
subtracting are both XOR, and multiplying is of bit polynomials modulo
$x^{16} + x^{12} + x^3 + x + 1$ (0x1100B in Signal's code).

### A worked example by hand: one epoch

With 32-byte chunks the counts are:

$$
\begin{aligned}
\text{Alice: } & \tfrac{64 + 32}{32} + \tfrac{1{,}152}{32} = 3 + 36 = 39 \text{ chunks},\\
\text{Bob: } & \tfrac{960}{32} + \tfrac{128 + 32}{32} = 30 + 5 = 35 \text{ chunks}.
\end{aligned}
$$

At about 34 bytes per chunk with its index, the 74 chunks cost some 2,500
bytes, a little more than one bare ML-KEM exchange, but no message grows by
more than a few dozen bytes. The epoch cannot end before Alice has sent 39
messages and Bob 5 more after the last key chunk reached him: at a message
a minute each way, a new post-quantum secret every 45 minutes or so.

Between Earth and Arcadia City, at a message every 5 minutes each way and a
22-minute delay, Alice's 39th message leaves at minute 190 and arrives at
212; Bob's next five, at minutes 215 to 235, carry ct2, and the last lands
at minute 257. A post-quantum epoch takes over four hours, against one
light round trip for the classical ratchet.

### Code it: SPQR's erasure code

The program builds the code with SPQR's field and chunk size, sends a
1,152-byte key vector (random bytes standing in for an ML-KEM-768 key) over
a link that drops 30% of messages, rebuilds it, and then counts, over 1,000
runs, the messages needed with coded chunks and with plain chunks repeated.

```python
# SPQR's erasure code: systematic Reed-Solomon over GF(2^16), 32-byte chunks;
# any N chunks rebuild an N-chunk message. Uses randbytes from the first listing.
import random

POLY = 0x1100B                                  # x^16 + x^12 + x^3 + x + 1, as in SPQR
def gmul(a, b):                                 # multiply in GF(2^16); adding is XOR
    r = 0
    while b:
        if b & 1: r ^= a
        b, a = b >> 1, a << 1
        if a >> 16: a ^= POLY
    return r
def ginv(a):                                    # a^(2^16 - 2) = 1/a
    r, e = 1, 65534
    while e:
        if e & 1: r = gmul(r, a)
        a, e = gmul(a, a), e >> 1
    return r
def at(points, x):                              # Lagrange: the polynomial through points, at x
    out = [0] * 16
    for j, (xj, yj) in enumerate(points):
        num = den = 1
        for m, (xm, _) in enumerate(points):
            if m != j: num, den = gmul(num, x ^ xm), gmul(den, xj ^ xm)
        w = gmul(num, ginv(den))
        out = [o ^ gmul(w, y) for o, y in zip(out, yj)]
    return out

symbols = lambda c: [int.from_bytes(c[i:i + 2], "big") for i in range(0, 32, 2)]
def chunk(msg, i):                              # chunk i: the data itself for i < N, then parity
    data = [(j, symbols(msg[32 * j:32 * j + 32])) for j in range(len(msg) // 32)]
    return (i, data[i][1]) if i < len(data) else (i, at(data, i))
def decode(got, n):                             # any n distinct chunks -> the message
    pts = got[:n]
    have = dict(pts)
    return b"".join(b"".join(s.to_bytes(2, "big") for s in (have[j] if j in have else at(pts, j)))
                    for j in range(n))

ek = randbytes(1152)                            # ML-KEM-768's key vector is 1,152 bytes
N = len(ek) // 32
lossy = random.Random(16)
got, sent = [], 0
while len(got) < N:                             # one chunk rides on each message
    c = chunk(ek, sent); sent += 1
    if lossy.random() > 0.3: got.append(c)      # 30% of messages never arrive
print(f"{N} chunks needed; {sent} messages sent, {sent - N} lost; rebuilt key matches:", decode(got, N) == ek)

def messages_needed(loss, coded, rnd):          # count only: how many messages until done?
    have, sent = set(), 0
    while len(have) < N:
        i = sent if coded else sent % N         # coded: always a new index; plain: repeat 0..N-1
        if rnd.random() > loss: have.add(i)
        sent += 1
    return sent
rnd = random.Random(2025)
for loss in (0.1, 0.3, 0.5):
    rs = sum(messages_needed(loss, True, rnd) for _ in range(1000)) / 1000
    rr = sum(messages_needed(loss, False, rnd) for _ in range(1000)) / 1000
    print(f"{loss:.0%} lost: erasure code {rs:5.1f} messages, plain chunks repeated {rr:5.1f}")
```

It prints:

```text
36 chunks needed; 50 messages sent, 14 lost; rebuilt key matches: True
10% lost: erasure code  40.0 messages, plain chunks repeated  71.6
30% lost: erasure code  51.3 messages, plain chunks repeated 128.4
50% lost: erasure code  71.9 messages, plain chunks repeated 221.0
```

With the code every message that arrives counts, so the receiver needs on
average $36 / (1 - p)$ messages at loss rate $p$: 40, 51.4 and 72, as the
runs show. Plain repeated chunks need two to three times as many, and an
attacker who drops chosen messages gains nothing against the code.

### Into the message keys, and the rollout

SPQR keeps its own symmetric chain in each direction; each epoch secret is
mixed in, and each message takes the next 32-byte key from it. libsignal
uses that key as the HKDF **salt** when the double ratchet's message key is
expanded into the AES key, HMAC key and IV (the `WhisperMessageKeys` step of
§16.4). An attacker must know both keys: breaking X25519 alone, or ML-KEM
alone, is not enough.

SPQR negotiates a version in its first messages, so during the rollout it
could fall back to the plain double ratchet; libsignal made it mandatory in
2026. Signal's Rust code is translated into F\* with the hax tool and proved
free of panics, with its field arithmetic proved correct, and the repository
includes ProVerif models of the Braid and the chain. The design rests on
"Triple Ratchet: A Bandwidth Efficient Hybrid-Secure Signal Protocol" by
Yevgeniy Dodis, Daniel Jost, Shuichi Katsumata, Thomas Prest and Rolfe
Schmidt (EUROCRYPT 2025), which also proposes Katana, a smaller
lattice-based ratcheting KEM that Signal did not adopt. The Post-quantum
book explains [KEMs](../post-quantum/03-KEMs-and-Signatures.md) and builds
[ML-KEM](../post-quantum/08-ML-KEM.md).

## 16.10 Late, lost and hidden messages

*Level: intermediate.*

The double ratchet decrypts each message the moment it arrives, whatever
happened to the ones before it. Joël Alwen, Sandro Coretti and Yevgeniy
Dodis called this **immediate decryption** and made it part of their
definition of the double ratchet's security (EUROCRYPT 2019). It has a
price: if message 5 can be read before message 3 arrives, the key for
message 3 must still exist somewhere.

### A worked example by hand

Bob has read message 0 on Alice's chain A₁, so he expects $N_r = 1$. Four
messages arrive in this order (Figure 16.8):

1. **(A₁, n = 4).** Bob steps the chain past 1, 2 and 3, keeping their keys
   under (A₁, 1), (A₁, 2), (A₁, 3), and decrypts with MK₄; now $N_r = 5$.
2. **(A₂, PN = 6, n = 1).** A new ratchet key. The header says chain A₁ had
   six messages, so Bob first keeps (A₁, 5), then does the DH ratchet step,
   keeps (A₂, 0) and decrypts with the next key. He now holds five keys.
3. **(A₁, n = 2)** turns up late, finds its key, uses it and deletes it,
   leaving four.

Each held key is a gift to a thief: if the phone is copied while (A₁, 3)
waits, and the thief has recorded message 3, or is the one delaying it, the
thief reads it. Held keys suspend forward secrecy for exactly the missing
messages, and an attacker who can drop messages can make the phone hold
keys on purpose.

### The limits

The specification leaves the numbers to the application. **MAX_SKIP**, the
most keys one header may make the receiver compute, must cover ordinary
loss yet stop a forged header from costing millions of HMACs (the listing in
§16.4 uses 1,000), and held keys should be deleted after a time or a number
of ratchet steps even if their message never comes. libsignal's constants
(`consts.rs`) allow at most 25,000 steps forward in a chain for one message
(`MAX_FORWARD_JUMPS`), 2,000 held keys per receiving chain
(`MAX_MESSAGE_KEYS`) and 5 receiving chains per session
(`MAX_RECEIVER_CHAINS`); a session with no answer for 30 days is no longer
used for sending. SPQR's chain applies the same two key limits. A message
outside the limits cannot be read; the app shows an error or, if the
content hint says the sender will resend, waits.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Skipped message keys: Bob's two receiving chains, which keys he read, which he holds, and his table of held keys" fill="currentColor" font-size="12">
<text font-size="13" x="20" y="20" font-weight="bold">Bob's receiving chains after four arrivals (order: 1st to 4th)</text>
<text x="20" y="74" font-size="12.5">chain A₁</text>
<rect x="110" y="52" width="52" height="34" rx="4" fill="currentColor" fill-opacity=".35" stroke="currentColor"/>
<text x="136" y="74" text-anchor="middle">MK0</text>
<text x="136" y="46" text-anchor="middle" font-size="11.5">1st</text>
<text x="208" y="74" text-anchor="middle">MK1</text>
<rect x="254" y="52" width="52" height="34" rx="4" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
<text x="280" y="74" text-anchor="middle">MK2</text>
<text x="280" y="46" text-anchor="middle" font-size="11.5">4th: late</text>
<text x="352" y="74" text-anchor="middle">MK3</text>
<rect x="398" y="52" width="52" height="34" rx="4" fill="currentColor" fill-opacity=".35" stroke="currentColor"/>
<text x="424" y="74" text-anchor="middle">MK4</text>
<text x="424" y="46" text-anchor="middle" font-size="11.5">2nd</text>
<text x="496" y="74" text-anchor="middle">MK5</text>
<text x="20" y="164" font-size="12.5">chain A₂</text>
<text x="136" y="164" text-anchor="middle">MK0</text>
<rect x="182" y="142" width="52" height="34" rx="4" fill="currentColor" fill-opacity=".35" stroke="currentColor"/>
<text x="208" y="164" text-anchor="middle">MK1</text>
<text x="208" y="136" text-anchor="middle" font-size="11.5">3rd (PN = 6)</text>
<text x="20" y="190" font-size="11" fill-opacity=".7">Alice's next ratchet key</text>
<rect x="290" y="146" width="16" height="12" fill="currentColor" fill-opacity=".35" stroke="currentColor"/><text x="312" y="157" font-size="11.5">read on arrival</text>
<text x="442" y="157" font-size="11.5">stepped past: key held</text>
<rect x="290" y="166" width="16" height="12" fill="currentColor" fill-opacity=".15" stroke="currentColor"/><text x="312" y="177" font-size="11.5">held, then used when the message came</text>
<rect x="20" y="206" width="600" height="108" rx="6" fill="none" stroke="currentColor"/>
<text x="36" y="228" font-weight="bold" font-size="12.5">Bob's held keys, indexed by (ratchet key, n)</text>
<text x="88" y="260" text-anchor="middle">(A₁, 1) → MK</text>
<text x="88" y="288" text-anchor="middle" font-size="11.5" fill-opacity=".7">held</text>
<text x="204" y="260" text-anchor="middle">(A₁, 2) → MK</text>
<text x="204" y="288" text-anchor="middle" font-size="11.5" fill-opacity=".7">used, deleted</text>
<text x="320" y="260" text-anchor="middle">(A₁, 3) → MK</text>
<text x="320" y="288" text-anchor="middle" font-size="11.5" fill-opacity=".7">held</text>
<text x="436" y="260" text-anchor="middle">(A₁, 5) → MK</text>
<text x="436" y="288" text-anchor="middle" font-size="11.5" fill-opacity=".7">held</text>
<text x="552" y="260" text-anchor="middle">(A₂, 0) → MK</text>
<text x="552" y="288" text-anchor="middle" font-size="11.5" fill-opacity=".7">held</text>
<path d="M182,52h52v34h-52zM326,52h52v34h-52zM470,52h52v34h-52zM110,142h52v34h-52zM420,146h16v12h-16zM36,240h104v30h-104zM268,240h104v30h-104zM384,240h104v30h-104zM500,240h104v30h-104z" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<path d="M152,240h104v30h-104zM156,255h96M162,69h14M234,69h14M306,69h14M378,69h14M450,69h14M162,159h14" fill="none" stroke="currentColor"/><path d="M181,69l-8,-4v8zM253,69l-8,-4v8zM325,69l-8,-4v8zM397,69l-8,-4v8zM469,69l-8,-4v8zM181,159l-8,-4v8z"/>
<text x="36" y="306" font-size="11.5">Each held key reads one message if the phone is stolen before that message arrives.</text>
</svg>
<figcaption>Figure 16.8. The worked example of §16.10. Messages 4 on chain A₁ and 1 on chain A₂ arrive early, so Bob steps his chains past the keys for the missing messages and keeps them; message 2 finds its key later. The held keys are the price of reading messages in any order.</figcaption>
</figure>

### Header encryption

Each header carries the sender's ratchet public key, PN and the message
number in clear: enough for an observer to link messages to one session,
count them and see each change of direction. The specification's variant
with **header encryption** gives each side a **header key** HK for the
current chain and a **next header key** NHK for the one after; the root step
yields three outputs, $(RK', CK, NHK) = \mathrm{KDF_{RK}}(RK, DH)$. The
sender encrypts each header under HK<sub>s</sub>. The receiver tries the
header keys stored with its held message keys, then HK<sub>r</sub> (same
chain), then NHK<sub>r</sub> (a new chain, so it ratchets); if none works,
it rejects the message. It learns that the other side ratcheted only
because the next header key worked.

The costs are trial decryptions and a header key that encrypts many
headers, so the header cipher needs fresh nonces. Signal's app does not use
the variant: libsignal sends the ratchet key and counters in clear inside
the message, and sealed sender (§16.7) encrypts the whole message, header
included, to the recipient, so the server sees neither. Header encryption
matters where no such outer layer exists.

## 16.11 Mars: a ratchet across 20 minutes

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
session, with a fresh PQXDH against prekeys uploaded in advance to a server
on each planet. Prekey servers themselves need copies on both sides, since
fetching a bundle across the gap costs a round trip.

### Out of order across the gap

The light delay alone keeps messages in order: every message takes the
same 3 to 22 minutes. Disorder comes from the network. Traffic to Mars
travels as bundles of the Delay-Tolerant Networking Bundle Protocol (RFC
9171), stored at each hop until the next link opens, and a surface station
reaches Earth through relay orbiters that are overhead only part of the
time. A message that misses a relay pass waits, and later ones overtake it.
The simulation has both sides send every 5 minutes for 10 hours; in some
runs one message in five also waits up to two hours for a relay.

```python
# Out of order across the gap: each side sends every 5 minutes; some messages also wait
# up to 2 hours for a relay. Count late messages, those from a chain 5+ steps old
# (libsignal keeps 5), and the keys Mars holds. Uses Ratchet, keypair, SK_alice, AD from above.
import heapq, random

def chat(light, missed, hours=10, seed=7):
    rnd = random.Random(seed)
    pair = keypair()
    earth = Ratchet(SK_alice, AD, their_pub=pair[1])
    mars = Ratchet(SK_alice, AD, my_pair=pair)
    q, n = [], 0
    for t in range(0, 60 * hours, 5):
        heapq.heappush(q, (t, 0, "earth")); heapq.heappush(q, (t + 2, 0, "mars"))
    chains, born = [], {}                       # Earth's ratchet keys, in order; when each key was kept
    late = most = too_old = longest = 0
    while q:
        t, _, ev = heapq.heappop(q)
        if ev == "earth" or (ev == "mars" and mars.CKs):
            sender, to = (earth, "to mars") if ev == "earth" else (mars, "to earth")
            hold = rnd.uniform(0, 120) if rnd.random() < missed else 0
            n += 1; heapq.heappush(q, (t + light + hold, n, (to, sender.send("status"))))
        elif ev != "mars" and ev[0] == "to earth":
            earth.receive(*ev[1])
        elif ev != "mars":
            dh = ev[1][0][:32]
            if dh not in chains: chains.append(dh)
            too_old += len(chains) - 1 - chains.index(dh) >= 5
            key = (dh, int.from_bytes(ev[1][0][36:], "big"))
            if key in mars.skipped:
                late += 1; longest = max(longest, t - born.pop(key))
            mars.receive(*ev[1])
            for k in mars.skipped: born.setdefault(k, t)
            most = max(most, len(mars.skipped))
    return late, too_old, most, longest

for light, missed in [(22, 0), (1, 0.2), (3, 0.2), (22, 0.2)]:
    late, too_old, most, longest = chat(light, missed)
    print(f"{light:2} min, {missed:.0%} wait: {late:2} late ({too_old:2} from a chain 5+ steps old),"
          f" {most} keys held at once, longest {longest:3.0f} min")
```

It prints:

```text
22 min, 0% wait:  0 late ( 0 from a chain 5+ steps old), 0 keys held at once, longest   0 min
 1 min, 20% wait: 21 late (15 from a chain 5+ steps old), 4 keys held at once, longest 103 min
 3 min, 20% wait: 20 late ( 6 from a chain 5+ steps old), 5 keys held at once, longest 104 min
22 min, 20% wait: 22 late ( 0 from a chain 5+ steps old), 7 keys held at once, longest 104 min
```

Without relay waits there is no disorder, even at 22 minutes. With them,
every row has about twenty late messages, each read from a key held for up
to 104 minutes, and readable by anyone who copied the phone in that window.
The surprise is the chain count. On a short link the conversation turns
over every few minutes, so a message held for two hours belongs to a chain
many steps old: 15 of 21 late messages at a one-minute delay, and 6 at
three minutes, fall outside libsignal's five chains. At 22 minutes chains
last a light round trip, and none does. What matters is the relay wait
divided by the conversation's round trip.

For Arcadia City that suggests keeping receiving chains by age, not count,
expiring held keys after a time tied to the network (a relay cycle or two),
and remembering that forward secrecy for a late message starts only when it
arrives.

## 16.12 In the real world

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

### Formal analyses, 2016 to 2025

The analyses found real gaps alongside the proofs.

- **2016.** Katriel Cohn-Gordon, Cas Cremers and Luke Garratt defined
  post-compromise security (IEEE CSF 2016). Cohn-Gordon, Cremers, Benjamin
  Dowling, Garratt and Douglas Stebila posted the first formal analysis of
  the Signal protocol (IEEE EuroS&P 2017; *Journal of Cryptology*, 2020):
  Signal as a multi-stage key exchange, each message key a stage, with
  secrecy, forward secrecy and post-compromise security proved under the
  gap Diffie-Hellman assumption, the key derivations as random oracles.
- **2017.** Nadim Kobeissi, Karthikeyan Bhargavan and Bruno Blanchet
  (IEEE EuroS&P 2017) checked models taken from a Signal-style protocol's
  JavaScript code with ProVerif and CryptoVerif.
- **2018.** Paul Rösler, Christian Mainka and Jörg Schwenk ("More is
  Less", IEEE EuroS&P 2018) found that group membership was the weak point:
  in WhatsApp the server could add members to a group
  ([Chapter 17](17-Group-Messaging-MLS.md)).
- **2019.** Alwen, Coretti and Dodis (EUROCRYPT 2019) defined the double
  ratchet's security and gave a modular proof.
- **2020.** Nihal Vatandas, Rosario Gennaro, Bertrand Ithurburn and Hugo
  Krawczyk (ACNS 2020) showed that X3DH's deniability holds only under
  unusual "knowledge" assumptions, and needs them. Cremers, Jaiden Fairoze,
  Benjamin Kiesl and Aurora Naska (ACM CCS 2020) showed that in the real
  apps an attacker who clones a phone's state could keep talking as the
  victim, because the apps tolerate desynchronized sessions.
- **2023.** Cremers, Charlie Jacomme and Naska (USENIX Security 2023)
  showed that Signal's session handling across devices can lose the
  post-compromise security proved for one session.
- **2024 and 2025.** PQXDH was analyzed before release (USENIX Security
  2024), its deniability by Fiedler and Christian Janson (PoPETs 2024), its
  key security with concrete bounds by Fiedler and Günther (PKC 2025), and
  the Triple Ratchet paper proved the design behind SPQR.

The pattern is the one [Chapter 20](20-Designing-and-Verifying-Protocols.md)
draws: the core protocol held, and the trouble came from the parts around
it (groups, devices, session management) that the first proofs left out.

## 16.13 Going deeper

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

**How sparse is sparse enough?** SPQR trades healing time for bandwidth.
Benedikt Auerbach, Dodis, Jost, Katsumata and Schmidt (2025) proposed a common way
to compare such bandwidth-limited protocols; Katana attacks the trade-off
from the other side, with smaller keys and ciphertexts.

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

??? question "2. What does each of the four DH results in X3DH contribute?"
    DH1 (IK_A, SPK_B) authenticates Alice; DH2 (EK_A, IK_B) authenticates
    Bob; DH3 (EK_A, SPK_B) and DH4 (EK_A, OPK_B) involve only short-lived
    keys on Bob's side and give forward secrecy.

??? question "3. Why does XEdDSA negate the private key sometimes?"
    An X25519 public key determines the Edwards y coordinate but not the
    sign of x. XEdDSA always uses the point with x even, so a verifier can
    rebuild the Edwards key from the X25519 key with sign bit 0; if the
    signer's point has x odd, the signer uses −k, which gives that point.

??? question "4. Why can't the symmetric ratchet alone provide post-compromise security?"
    Each chain key is a deterministic function of the previous one, so a
    thief who copies a chain key can compute all later keys. Only new
    Diffie-Hellman (or KEM) secrets end that.

??? question "5. Bob holds the key for message (A₁, 3) because message 4 arrived first. What does that cost, and what limits does libsignal set?"
    Until message 3 arrives or the key expires, its forward secrecy is
    suspended: a thief who copies the phone and recorded message 3 can read
    it. libsignal allows 25,000 steps forward for one message, 2,000 held
    keys per receiving chain and 5 receiving chains.

??? question "6. Two safety numbers share their first 30 digits. Can you conclude there is no attack?"
    No. The halves are sorted, so an attacker who replaces Bob's key changes
    only Bob's half, and that half may sort second, leaving the first 30
    digits exactly as before. Compare all 60 digits or scan the QR code.

??? question "7. A sealed-sender message carries Alice's sender certificate. Why must Bob check that the identity key in it equals the key the envelope's inner layer proved?"
    Sender certificates are not secret: every contact Alice writes to sees
    hers. Without the check, Mallory could attach it to a message sealed
    with Mallory's own key. The inner layer uses DH(IK_A, IK_B), so only the
    holder of the certified key could have made it.

??? question "8. A quantum attacker has recorded a PQXDH handshake and the whole conversation after it, and can solve X25519. What stops them, and what could they still do?"
    SK mixes the four DH values with the KEM secret SS, and every later
    root key descends from SK, so without breaking the KEM they cannot
    start the chain. Identity keys are still X25519, so they could
    impersonate someone in a new session, an active attack at that time,
    and without SPQR a quantum thief of a phone's state would never be
    locked out by later DH ratchet steps.

??? question "9. Why does SPQR send its ML-KEM-768 key in erasure-coded chunks, rather than whole or as plain chunks repeated in turn?"
    A whole exchange is 2,272 bytes, far more than a typical message. With
    a Reed-Solomon code any 36 chunks rebuild the 36-chunk key, so every
    chunk that arrives counts: about 36 / (1 − p) messages at loss rate p.
    Plain repeated chunks make each lost chunk wait a full cycle (two to
    three times as many messages) and let an attacker stall the exchange.

??? question "10. Why does the ratchet heal more slowly between Earth and Mars, yet late messages there come from fewer old chains than on a short link?"
    Healing needs the other side's new ratchet key to arrive and a reply to
    return, at least a light round trip; automatic messages keep the window
    near that minimum. A late message spans as many chains as there were
    ratchet steps while it waited, roughly the wait divided by the
    conversation's round trip. A long round trip means few steps, so a
    two-hour relay wait at 22 minutes stays within a handful of chains,
    while the same wait on a one-minute link spans a dozen or more.

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
- Sealed sender hides the sender from the server, not the traffic pattern;
  its certificate is checked against a built-in trust root, an expiry time
  and the key the envelope proved.
- PQXDH adds one KEM encapsulation to X3DH: five secrets in one HKDF, a
  1,796-byte bundle instead of 163, no extra round trip. You coded it with
  X25519 checked against RFC 7748 and a labeled stand-in KEM.
- SPQR adds ML-KEM-768 to the ratchet in erasure-coded 32-byte chunks, any
  36 of which rebuild the key; its secrets salt every message key.
  Authentication is still classical.
- Reading messages in any order means holding keys for missing ones, which
  suspends their forward secrecy; clients cap the keys and chains they keep.
- Formal analysis proved the core protocol and found the weak points around
  it: groups, devices and session handling.
- Between planets the ratchet heals only once per light round trip, and
  relay waits make phones hold keys for hours.

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
  Protocol", IEEE EuroS&P 2017; full version in the *Journal of Cryptology*
  33, 2020.
- Joël Alwen, Sandro Coretti and Yevgeniy Dodis, "The Double Ratchet:
  Security Notions, Proofs, and Modularization for the Signal Protocol",
  EUROCRYPT 2019.
- Karthikeyan Bhargavan, Charlie Jacomme, Franziskus Kiefer and Rolfe
  Schmidt, "Formal verification of the PQXDH Post-Quantum key agreement
  protocol for end-to-end secure messaging", USENIX Security 2024.
- Ian Martiny et al., "Improving Signal's Sealed Sender", NDSS 2021.
- Signal, "Technology preview: Sealed sender for Signal", October 2018;
  libsignal `sealed_sender.rs` and `sealed_sender.proto` for the formats.
- Yevgeniy Dodis, Daniel Jost, Shuichi Katsumata, Thomas Prest and Rolfe
  Schmidt, "Triple Ratchet: A Bandwidth Efficient Hybrid-Secure Signal
  Protocol", EUROCRYPT 2025.
- Graeme Connell and Rolfe Schmidt, Signal's Triple Ratchet and *ML-KEM
  Braid* specifications, 2025; github.com/signalapp/SparsePostQuantumRatchet
  (`encoding/polynomial.rs`, `incremental_mlkem768.rs`).
- Benedikt Auerbach, Yevgeniy Dodis, Daniel Jost, Shuichi Katsumata and
  Rolfe Schmidt, "How to Compare Bandwidth Constrained Two-Party Secure
  Messaging Protocols", IACR ePrint 2025.
- Rune Fiedler and Felix Günther, "Security Analysis of Signal's PQXDH
  Handshake", PKC 2025; Rune Fiedler and Christian Janson, "A Deniability
  Analysis of Signal's Initial Handshake PQXDH", PoPETs 2024.
- Katriel Cohn-Gordon, Cas Cremers and Luke Garratt, "On Post-Compromise
  Security", IEEE CSF 2016.
- Nadim Kobeissi, Karthikeyan Bhargavan and Bruno Blanchet, "Automated
  Verification for Secure Messaging Protocols and Their Implementations: A
  Symbolic and Computational Approach", IEEE EuroS&P 2017.
- Paul Rösler, Christian Mainka and Jörg Schwenk, "More is Less: On the
  End-to-End Security of Group Chats in Signal, WhatsApp, and Threema",
  IEEE EuroS&P 2018.
- Nihal Vatandas, Rosario Gennaro, Bertrand Ithurburn and Hugo Krawczyk,
  "On the Cryptographic Deniability of the Signal Protocol", ACNS 2020.
- Cas Cremers, Jaiden Fairoze, Benjamin Kiesl and Aurora Naska, "Clone
  Detection in Secure Messaging: Improving Post-Compromise Security in
  Practice", ACM CCS 2020.
- Jacqueline Brendel, Marc Fischlin, Felix Günther, Christian Janson and
  Douglas Stebila, "Towards Post-Quantum Security for Signal's X3DH
  Handshake", SAC 2020.
- Cas Cremers, Charlie Jacomme and Aurora Naska, "Formal Analysis of
  Session-Handling in Secure Messaging: Lifting Security from Sessions to
  Conversations", USENIX Security 2023.
- RFC 7748 (2016), *Elliptic Curves for Security*, section 6.1 for the
  X25519 test vector.
- Melissa Chase, Trevor Perrin and Greg Zaverucha, "The Signal Private Group
  System and Anonymous Credentials Supporting Efficient Verifiable
  Encryption", ACM CCS 2020.
- WhatsApp, *WhatsApp Encryption Overview* (technical white paper).
- libsignal, github.com/signalapp/libsignal: `rust/protocol/src/ratchet/`,
  `fingerprint.rs`, `pqxdh.rs`, `consts.rs` (the skipped-key limits),
  `kem.rs`.
