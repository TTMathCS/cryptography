# 18. Hybrids and the Migration

*The standards are written; the hard part is moving the world onto them. This last chapter
follows the migration as it actually happened, protocol by protocol: TLS, where a hybrid of
X25519 and ML-KEM went from an experiment in 2023 to the default for most web traffic; SSH,
which switched earlier; Signal and iMessage; VPNs. It explains why almost every deployment
is a **hybrid** that combines a post-quantum and a classical algorithm, builds one in code,
and measures why signatures, not key exchange, are the slow part of the migration. It ends
with the deadlines governments have set, the practical work of a crypto inventory, and a
migration plan for a settlement on Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - why hybrids, how KEM combiners work, and X-Wing, in code;
    - TLS 1.3's X25519MLKEM768: its timeline, sizes and share of traffic;
    - SSH, Signal, iMessage, IKEv2, WireGuard and Rosenpass;
    - the signature problem: certificate chains, handshake sizes and Merkle Tree Certificates;
    - CNSA 2.0, NIST IR 8547 and other national timelines;
    - crypto inventories and agility, and how to plan a migration.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (KEMs and signatures),
    [Chapter 8](08-ML-KEM.md) (ML-KEM) and [Chapter 9](09-ML-DSA.md) (ML-DSA). Each protocol's
    full design is in the Protocols book: [TLS 1.3](../protocols/03-TLS-1.3-Message-by-Message.md),
    [SSH](../protocols/06-SSH.md), [IKEv2](../protocols/07-IPsec-and-IKEv2.md),
    [WireGuard](../protocols/08-WireGuard-and-Noise.md) and
    [certificates](../protocols/02-Certificates-and-PKI.md).

    **Levels:** §18.1 to §18.3 are for beginners, §18.4 to §18.7 are intermediate, §18.8 to
    §18.10 are expert.

## 18.1 The problem

*Level: beginner.*

Chapter 1 set out the two clocks. **Harvest now, decrypt later**: an adversary can record
encrypted traffic today and decrypt it once a large quantum computer exists, so anything that
must stay secret for ten or twenty years is already at risk. **Forgery later**: signatures
only need to be safe at the moment they are checked, so their migration can wait somewhat
longer, except for keys that live a long time, such as root certificates and firmware signing
keys.

The first clock makes key exchange urgent; the second makes signatures important but less
pressing. That is exactly the order in which the migration has happened: by November 2026,
post-quantum key exchange protects most of the traffic of the large web platforms, while
post-quantum certificates are still in experiments.

The migration has two constraints that the cryptography alone does not address. Nothing can
switch at once: clients and servers are upgraded separately over years, so every protocol
must negotiate. And the new algorithms are young: ML-KEM had been studied, as Kyber, for about
six years when it was standardized, while RSA and elliptic curves had decades. SIKE (Chapter
16) fell weeks after NIST picked it for a fourth round. The answer to both is the hybrid.

## 18.2 Why hybrid

*Level: beginner.*

A **hybrid** key exchange runs a classical one (usually X25519) and a post-quantum one
(usually ML-KEM) side by side and derives the session key from both shared secrets. An
attacker must break both to learn the key:

- if ML-KEM has an undiscovered flaw, as SIKE did, the classical part still protects the
  connection against today's attackers;
- if a quantum computer arrives, ML-KEM still protects against it;
- the extra cost is one X25519 operation and 32 bytes each way, negligible next to ML-KEM's
  kilobyte.

Hybrids also ease compliance: a product certified for its classical algorithm keeps that
certification while adding a post-quantum one. Not everyone agrees hybrids should be permanent.
The NSA's CNSA 2.0 guidance expects pure ML-KEM-1024 for national security systems, and some
argue that a hybrid's extra complexity is itself a risk. But for the transition period, the
large deployments have all chosen hybrids, and SIKE's fall is the usual example of why.

!!! note "Life story: X25519MLKEM768"
    **Born:** 2016 as Google's CECPQ1 experiment (X25519 with NewHope) in Chrome Canary;
    2019 as CECPQ2 and CECPQ2b (with NTRU-HRSS and with SIKE), with Cloudflare; 2023 as
    X25519Kyber768Draft00 · **Purpose:** post-quantum key exchange for TLS without giving up
    X25519 · **Renamed:** X25519MLKEM768 in late 2024, after FIPS 203 changed Kyber's details
    (Chrome 131) · **Status (Nov 2026):** the default key exchange in Chrome, Edge, Firefox and
    Safari, in Go's standard library, and on Cloudflare's network, among others; codepoint
    0x11EC (4588) in the IANA TLS registry.

## 18.3 Combiners and X-Wing

*Level: beginner.*

How exactly should two shared secrets be combined? Concatenating them and hashing is the
obvious answer, and in TLS 1.3 that is what happens: the two secrets are concatenated and fed
into the key schedule, which hashes them along with the entire handshake transcript, including
both public keys and ciphertexts. The transcript is what makes simple concatenation safe there.

A **KEM combiner** used outside such a protocol has to do that binding itself. Giacon, Heuer
and Poettering (PKC 2018) studied which combiners keep the IND-CCA security of the stronger
part. The short answer is: hash both shared secrets together with the ciphertexts, so that an
attacker cannot change one ciphertext and keep the same key.

**X-Wing** (Barbosa, Connolly, Duarte, Kaiser, Schwabe, Varner and Westerbaan, 2024) is a
hybrid KEM of ML-KEM-768 and X25519 designed as a single, general-purpose KEM, specified in an
IETF draft. Its combiner is

$$K = \text{SHA3-256}(ss_M \,\|\, ss_X \,\|\, ct_X \,\|\, pk_X \,\|\, \text{label}).$$

It hashes the X25519 ciphertext and public key, but not ML-KEM's. That saving is justified by
a proof: ML-KEM's own FO transform already binds its shared secret to its ciphertext, so
including the 1,088-byte ML-KEM ciphertext in the hash would add work without adding security.
X25519 has no such binding, so its values must go in.

**Code it.** An X-Wing-style hybrid KEM. First, X25519 from RFC 7748 in pure Python, checked
against the RFC's first test vector:

```python
P = 2**255 - 19
A24 = 121665

def x25519(k, u):
    """X25519 from RFC 7748: scalar k and u-coordinate u, both 32 bytes, little-endian."""
    k = bytearray(k); k[0] &= 248; k[31] &= 127; k[31] |= 64
    k = int.from_bytes(k, "little")
    x1 = int.from_bytes(u, "little") & ((1 << 255) - 1)
    x2, z2, x3, z3, swap = 1, 0, x1, 1, 0
    for t in reversed(range(255)):              # the Montgomery ladder
        kt = (k >> t) & 1
        swap ^= kt
        if swap: x2, x3, z2, z3 = x3, x2, z3, z2
        swap = kt
        a, b = (x2 + z2) % P, (x2 - z2) % P
        c, d = (x3 + z3) % P, (x3 - z3) % P
        aa, bb = a * a % P, b * b % P
        e = (aa - bb) % P
        da, cb = d * a % P, c * b % P
        x3, z3 = (da + cb) ** 2 % P, x1 * (da - cb) ** 2 % P
        x2, z2 = aa * bb % P, e * (aa + A24 * e) % P
    if swap: x2, z2 = x3, z3
    return (x2 * pow(z2, P - 2, P) % P).to_bytes(32, "little")

# RFC 7748, section 5.2, first test vector
k = bytes.fromhex("a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4")
u = bytes.fromhex("e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c")
print(x25519(k, u).hex() == "c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552")
```

It prints:

```
True
```

Then the hybrid, using Chapter 8's ML-KEM listing saved in the same folder as `mlkem.py`. It
follows X-Wing's structure; it is not byte-compatible with the draft (key generation is
simplified), so it would not pass the draft's test vectors.

```python
# Uses x25519() from the listing above, and Chapter 8's ML-KEM listing saved as mlkem.py.
import hashlib, os
exec(open("mlkem.py").read())                 # defines keygen(), encaps(), decaps()
LABEL = b"\\.//^\\"                            # X-Wing's 6-byte domain label
BASE = (9).to_bytes(32, "little")              # the X25519 base point

def hybrid_keygen():
    seed = hashlib.shake_256(os.urandom(32)).digest(96)
    ek_m, dk_m = keygen("ML-KEM-768", seed[:32], seed[32:64])
    sk_x = seed[64:]
    pk_x = x25519(sk_x, BASE)
    return ek_m + pk_x, (dk_m, sk_x, pk_x)

def combine(ss_m, ss_x, ct_x, pk_x):
    return hashlib.sha3_256(ss_m + ss_x + ct_x + pk_x + LABEL).digest()

def hybrid_encaps(pk):
    ek_m, pk_x = pk[:-32], pk[-32:]
    eph = os.urandom(32)
    ct_x, ss_x = x25519(eph, BASE), x25519(eph, pk_x)
    ss_m, ct_m = encaps("ML-KEM-768", ek_m, os.urandom(32))
    return combine(ss_m, ss_x, ct_x, pk_x), ct_m + ct_x

def hybrid_decaps(sk, ct):
    dk_m, sk_x, pk_x = sk
    ct_m, ct_x = ct[:-32], ct[-32:]
    return combine(decaps("ML-KEM-768", dk_m, ct_m), x25519(sk_x, ct_x), ct_x, pk_x)

pk, sk = hybrid_keygen()
key, ct = hybrid_encaps(pk)
print("public key", len(pk), "bytes; ciphertext", len(ct), "bytes")
print("both sides agree:", hybrid_decaps(sk, ct) == key)
```

It prints:

```
public key 1216 bytes; ciphertext 1120 bytes
both sides agree: True
```

The sizes are those of X25519MLKEM768 in TLS as well: a 1,216-byte key share from the client
(1,184 for ML-KEM plus 32 for X25519) and a 1,120-byte one from the server.

## 18.4 TLS: from experiment to default

*Level: intermediate.*

TLS 1.3 was well placed for the change. Its ClientHello carries one or more **key shares**,
each for a named group, and the server picks one. A hybrid is simply a new named group whose
key share is the concatenation of an ML-KEM encapsulation key and an X25519 public key, and
whose shared secret is the concatenation of the two secrets, fed into the usual key schedule.
No other part of the protocol had to change. The details are in the
[Protocols book's TLS 1.3 chapter](../protocols/03-TLS-1.3-Message-by-Message.md).

The timeline, as checked in November 2026:

- **2016 and 2019.** Google's CECPQ1 and CECPQ2 experiments, with Cloudflare in 2019, showed
  that hybrids worked in practice and found the first compatibility problems.
- **August 2023.** Chrome 116 shipped X25519Kyber768Draft00 behind a setting; Cloudflare
  enabled it on its servers.
- **April 2024.** Chrome 124 turned it on by default on desktop. Some servers and middleboxes
  broke, because the ClientHello no longer fit in one packet and their code assumed it would
  (Chapter 8 told this story).
- **November 2024.** Chrome 131 switched to X25519MLKEM768, the final FIPS 203 version, with a
  new codepoint; the old Kyber group was retired.
- **2024-2025.** Firefox (version 132 for HTTPS), Go 1.24's `crypto/tls`, and others enabled
  X25519MLKEM768 by default. Apple's iOS 26 and macOS Tahoe 26 (September 2025) turned it on
  for apps using the system's networking APIs, including Safari.

The effect showed in the traffic. Cloudflare reported that by the end of 2025 about half of
the human (not bot) HTTPS traffic it carried used post-quantum key agreement; the share has
kept growing since, though exact figures for 2026 move month by month and are best read on
Cloudflare Radar. The share of servers that support it is much lower outside the large
platforms: a website behind a content network gets it automatically, while a company's own
older servers usually do not.

The cost was small. ML-KEM-768 is faster than X25519; the extra bytes, 1,216 from the client and
1,120 from the server, add about a kilobyte each way, and the measured effect on handshake
time has been a few percent at most for most users.

## 18.5 SSH, messaging and VPNs

*Level: intermediate.*

**SSH** moved first. OpenSSH 9.0 (April 2022) made `sntrup761x25519-sha512`, a hybrid of
Streamlined NTRU Prime and X25519, its default key exchange, before NIST had chosen anything.
OpenSSH 9.9 (September 2024) added `mlkem768x25519-sha256`, and OpenSSH 10.0 (April 2025) made
it the default. OpenSSH 10.1 began warning users when a connection does not use a post-quantum
key exchange. SSH host and user keys, which are signatures, are still classical in almost all
deployments. See the [Protocols book's SSH chapter](../protocols/06-SSH.md).

**Signal** added **PQXDH** in September 2023: the initial key agreement mixes a Kyber-1024
(now ML-KEM) encapsulation into the X3DH handshake, so a recorded first message cannot be
decrypted later. The double ratchet that follows kept using only Diffie-Hellman until October
2025, when Signal introduced the **Sparse Post-Quantum Ratchet** (SPQR), which runs ML-KEM
alongside the double ratchet in a "triple ratchet" and spreads the large ML-KEM messages over
several ordinary messages to keep each one small.

**iMessage** moved with **PQ3** (announced February 2024, in iOS 17.4): post-quantum key
establishment at the start of a conversation, and periodic post-quantum rekeying during it, so
that a compromised key heals even against a quantum adversary.

**IPsec and IKEv2** gained a general way to add key exchanges in RFC 9370 (May 2023, "Multiple
Key Exchanges in IKEv2"): up to seven additional exchanges after the classical one, each mixed
into the keys. ML-KEM is used through it. See the
[Protocols book's IKEv2 chapter](../protocols/07-IPsec-and-IKEv2.md).

**WireGuard** has no negotiation by design; its handshake is fixed to Curve25519. It does
have a slot for an optional pre-shared symmetric key mixed into every handshake. **Rosenpass**
(2023) fills that slot: it runs its own post-quantum handshake, using Classic McEliece and
Kyber, every two minutes and hands the result to WireGuard as the pre-shared key. Several VPN
providers use this or similar designs. See the
[Protocols book's WireGuard chapter](../protocols/08-WireGuard-and-Noise.md).

## 18.6 The signature problem

*Level: intermediate.*

Key exchange was the easy half: one exchange per connection, one negotiation, about two
kilobytes. Authentication is harder, because a TLS server does not send one signature but
several, and their sizes multiply.

A typical HTTPS server sends its own certificate and an intermediate certificate: two public
keys and two signatures by certificate authorities. The leaf certificate usually carries two
Certificate Transparency timestamps (SCTs), each a signature by a log. Then the server signs
the handshake itself, the CertificateVerify message. That makes two public keys and five
signatures.

**Code it.** The authentication bytes in that handshake, if every key and signature used one
scheme.

```python
# Public keys and signatures in a typical TLS server's handshake:
# leaf and intermediate public keys; the two certificate signatures;
# two Certificate Transparency timestamps (SCTs); the CertificateVerify signature.
schemes = {                          # (public key, signature) in bytes
    "ECDSA P-256":  (65, 72),
    "RSA-2048":     (270, 256),
    "ML-DSA-44":    (1312, 2420),
    "ML-DSA-65":    (1952, 3309),
    "Falcon-512":   (897, 666),
    "SLH-DSA-128s": (32, 7856),
}
for name, (pk, sig) in schemes.items():
    total = 2 * pk + 5 * sig
    print(f"{name:13} {total:7,} bytes  {total / 1460:5.1f} packets of 1,460 bytes")
```

It prints:

```
ECDSA P-256       490 bytes    0.3 packets of 1,460 bytes
RSA-2048        1,820 bytes    1.2 packets of 1,460 bytes
ML-DSA-44      14,724 bytes   10.1 packets of 1,460 bytes
ML-DSA-65      20,449 bytes   14.0 packets of 1,460 bytes
Falcon-512      5,124 bytes    3.5 packets of 1,460 bytes
SLH-DSA-128s   39,344 bytes   26.9 packets of 1,460 bytes
```

With ML-DSA-44 the authentication data alone is about 14.7 kilobytes, ten full packets. A
TCP connection's initial congestion window is usually ten packets (RFC 6928), so a server
sending this much, plus its other handshake messages, has to wait a full round trip for
acknowledgments before it can finish. On a slow or distant link, that is a visible delay,
and measurements by Cloudflare and others confirm it. Falcon-512 is much better, at about 5
kilobytes, but FN-DSA is not yet standardized (Chapter 10), and its floating-point signing is
hard to implement safely. SLH-DSA is out of the question for every signature in the chain.

Several remedies are being pursued:

- **Mix schemes by role.** The signatures that are sent but rarely verified differently could
  use different schemes: a UOV or MAYO signature from a root kept in the browser costs little
  (Chapter 15), and the CertificateVerify signature, made once per connection, needs a fast
  signer.
- **Leave things out.** Proposals such as suppressing intermediate certificates the client
  already has, and compressing certificates (RFC 8879), save some bytes.
- **Merkle Tree Certificates** (an IETF draft, in the PLANTS working group) change the
  structure. A certificate authority signs, not each certificate, but the root of a Merkle tree
  covering many certificates issued in a batch. A browser that has recently fetched the signed
  tree heads needs only the server's public key, its handshake signature, and a short inclusion
  proof of a few hundred bytes; the CA signatures and SCTs disappear from the handshake.
  Cloudflare announced its intent to experiment in October 2025, and an experiment with
  Chrome using real traffic began in early 2026, with a classical certificate kept as a
  fallback.

As of November 2026, no major browser accepts post-quantum certificates from the public web
PKI. Certificate authorities, browsers and the CA/Browser Forum still have to agree on the
algorithms, the formats (IETF specifications for ML-DSA and SLH-DSA in X.509 exist) and the
schedule.

## 18.7 Deadlines

*Level: intermediate.*

Governments have set dates, and the dates largely agree: start now, finish the most important
systems around 2030, finish everything by 2035.

| who | document | key dates |
|---|---|---|
| NSA (US national security systems) | CNSA 2.0 (2022, updated since) | software and firmware signing, and networking equipment: exclusively post-quantum by 2030; browsers, servers, cloud services and operating systems by 2033; all systems by 2035 |
| NIST (US federal) | NIST IR 8547 (final 27 October 2026) | quantum-vulnerable algorithms deprecated after 2030 and disallowed after 2035 |
| UK NCSC | migration timelines (March 2025) | discovery and planning by 2028; highest-priority migrations by 2031; complete by 2035 |
| European Union | coordinated implementation roadmap (June 2025) | first steps by end of 2026; high-risk systems by end of 2030; as many systems as feasible by 2035 |
| Canada | Canadian Centre for Cyber Security roadmap (June 2025) | high-priority systems by end of 2031; the rest by end of 2035 (non-classified federal systems) |

*Table 18.1. National migration timelines as of November 2026. Each document has more detail,
exceptions and categories than one line can show; read the source before planning against it.*

CNSA 2.0 differs in two ways: it asks for the strongest parameter sets (ML-KEM-1024 and
ML-DSA-87, with LMS or XMSS for firmware signing, Chapter 11), and it does not require hybrids.
NIST permits hybrids, and SP 800-227 (September 2025) gives guidance on using KEMs, including
combinations.

## 18.8 Inventories and agility

*Level: expert.*

Every migration guide begins with the same step: **find out what you have**. A cryptographic
inventory lists, for each system, which algorithms it uses, for what (key exchange,
signatures, encryption at rest), where the keys live, how long the protected data must stay
secret, and who can change the code. It sounds clerical; in practice it is the longest step,
because cryptography hides in libraries, appliances, firmware, partners' systems and
protocols nobody remembers configuring.

Sources for an inventory:

- **network scans** of TLS and SSH endpoints, recording the key exchange groups and
  certificate algorithms they offer;
- **software bills of materials** and dependency trees, looking for cryptographic libraries
  and their versions;
- **code search** for algorithm names, key sizes and hard-coded curves;
- **certificate stores and key managers**, listing every key, its algorithm and expiry;
- **vendors**, asked in writing for their post-quantum roadmaps.

Then rank by Mosca's inequality (Chapter 1): data that must stay secret for $x$ years,
systems that take $y$ years to migrate, and an estimate $z$ of when a large quantum computer
arrives. Where $x + y > z$, the system is already late. Long-lived secrets carried over the
network (health records, state secrets, intellectual property) and long-lived roots of trust
(firmware signing keys, root certificates, devices that will be in the field for twenty
years) come first.

**Crypto agility** is the property that makes the next migration cheaper: algorithms chosen by
configuration rather than hard-coded, negotiated in protocols, with key and signature sizes
that are not fixed in data formats, and a tested way to roll keys. TLS 1.3 and SSH were agile
enough to add hybrids with a new identifier. Many embedded protocols, smart card formats and
databases with fixed-width signature columns were not. Agility is not free, since every option
is code that can be wrong, but the lesson of SIKE and Rainbow is that some choice made in 2026
will have to be undone.

## 18.9 Mars: a migration plan for a settlement

*Level: expert.*

Arcadia City is a useful thought experiment because everything about it is at the extremes:
links to Earth with one-way delays of 3 to 22 minutes and long outages when the Sun is between the
planets, equipment that must run for decades without replacement, and lives that depend on
the integrity of control messages. Here is the plan its engineers wrote, using this book's
material, as an example of how to think rather than as a template.

1. **Inventory (year 1).** Every link, device, key and protocol, with the secrecy lifetime of
   its data and the replacement cycle of its hardware. Result: 41 systems use public-key
   cryptography; 9 of them protect data that must stay secret for more than 20 years (medical
   records, the habitat's structural designs, private letters); 6 hold roots of trust that
   cannot be replaced without a supply ship.
2. **Key exchange first (years 1-2).** Every TLS, SSH and VPN link moves to hybrids:
   X25519MLKEM768 for ordinary links; ML-KEM-1024 with HQC-5 alongside it (Chapter 14) on the
   backup links meant to survive a break in lattice cryptography. The Earth relay, which
   records everything, is assumed to be harvesting.
3. **Roots of trust next (years 1-3).** Firmware signing keys move to LMS (Chapter 11), whose
   security needs only a hash function and whose state can be managed in one place, with an
   SLH-DSA key (Chapter 12) held offline as a backup. Devices that cannot be updated get a
   replacement date.
4. **Certificates (years 2-5).** The city's internal PKI issues ML-DSA-65 certificates for
   new devices, keeping classical certificates in parallel until every verifier understands
   both. Radio links too small for ML-DSA wait for the on-ramp (Chapters 15 and 16).
5. **Implementation (throughout).** Only verified or widely reviewed libraries; ACVP vectors
   on every build; hedged signing; masking on devices the public can touch (Chapter 17).
6. **Agility (throughout).** Every new protocol and format carries an algorithm identifier and
   room for larger keys, so that the next migration, whenever it comes, is a configuration
   change.

The plan's deadline is 2033, two years ahead of the latest national dates, because a supply
ship takes two years to bring replacement hardware.

## 18.10 Going deeper

*Level: expert.*

- **Hybrids.** Giacon, Heuer and Poettering, "KEM Combiners" (PKC 2018); Barbosa and others,
  "X-Wing: The Hybrid KEM You've Been Looking For" (2024) and its IETF draft; the IETF TLS
  working group's hybrid design document and the X25519MLKEM768 specification.
- **Deployment.** The Cloudflare blog's series on the state of the post-quantum Internet;
  Chrome's announcements for versions 116, 124 and 131; the OpenSSH post-quantum page.
- **Messaging.** Signal's PQXDH specification (2023) and SPQR announcement (2025); Apple's
  PQ3 security research post (2024).
- **Certificates.** The Merkle Tree Certificates draft (PLANTS working group).
- **Policy.** NSA, CNSA 2.0; NIST IR 8547; NIST SP 800-227; the UK NCSC's migration timelines;
  the EU's coordinated implementation roadmap; the Canadian Centre for Cyber Security's
  roadmap.
- **This shelf.** The Protocols book has each protocol in full; Chapter 20 of
  [the cryptography book](../../book/20-Quantum-Computers.md) gives the gentle introduction to
  the quantum threat.

## Check yourself

??? question "1. Why did key exchange migrate before signatures?"

    Harvest now, decrypt later: recorded key exchanges can be broken later, so they are at
    risk today. A signature only has to resist forgery when it is checked, so it can move
    later, except for long-lived keys.

??? question "2. What does a hybrid key exchange protect against that pure ML-KEM does not?"

    An undiscovered classical flaw in ML-KEM, of the kind that broke SIKE: the classical part
    still protects the connection.

??? question "3. Why does X-Wing hash X25519's ciphertext and public key but not ML-KEM's ciphertext?"

    ML-KEM's FO transform already binds its shared secret to its ciphertext; X25519 has no such
    binding, so its values must go into the combiner's hash.

??? question "4. How big are the key shares of X25519MLKEM768?"

    1,216 bytes from the client (1,184 + 32) and 1,120 from the server (1,088 + 32).

??? question "5. When did Chrome switch from Kyber to ML-KEM in TLS, and why the change?"

    Chrome 131 in November 2024, because FIPS 203 differed from the round 3 Kyber the earlier
    group used, so a new codepoint was needed.

??? question "6. What was OpenSSH's first post-quantum default, and its current one?"

    sntrup761x25519-sha512 from OpenSSH 9.0 (2022); mlkem768x25519-sha256 from OpenSSH 10.0
    (2025).

??? question "7. How many authentication bytes does a TLS handshake carry with ML-DSA-44 everywhere, and why does it matter?"

    About 14.7 kilobytes: two public keys and five signatures. That exceeds a typical initial
    TCP congestion window of ten packets, adding a round trip.

??? question "8. How do Merkle Tree Certificates shrink the handshake?"

    The CA signs a tree head covering a batch of certificates, which the browser fetches in
    advance; the handshake then carries only the server's key, its signature and a short
    inclusion proof, with no CA signatures or SCTs.

??? question "9. What dates do NIST IR 8547 and CNSA 2.0 set?"

    NIST IR 8547: quantum-vulnerable algorithms deprecated after 2030, disallowed after 2035.
    CNSA 2.0: exclusively post-quantum by 2030 for software signing and networking equipment,
    by 2033 for browsers, servers, cloud and operating systems, everything by 2035.

??? question "10. What is the first step of every migration plan?"

    A cryptographic inventory: what algorithms are used where, for what, protecting data that
    must stay secret for how long.

## What you learned

- Almost every deployment uses hybrids; a good combiner hashes both secrets with what is
  needed to bind the ciphertexts.
- X25519MLKEM768 went from experiment (2023) to default in the major browsers, Go and Apple's
  systems by 2025; SSH, Signal and iMessage moved too.
- Signatures are the slow half: chains of ML-DSA signatures add about 15 kilobytes, and Merkle
  Tree Certificates are the leading structural fix.
- Governments converge on starting now, finishing priority systems around 2030 and everything
  by 2035.
- Migration starts with an inventory and ends, if done well, with agility, so that the next
  migration is easier.

This is the last chapter of the book. The [Glossary](Glossary.md) collects its terms.

## Further reading

- Federico Giacon, Felix Heuer and Bertram Poettering, "KEM Combiners" (PKC 2018).
- Manuel Barbosa, Deirdre Connolly, João Diogo Duarte, Aaron Kaiser, Peter Schwabe, Karolin
  Varner and Bas Westerbaan, "X-Wing: The Hybrid KEM You've Been Looking For" (2024).
- NSA, *Commercial National Security Algorithm Suite 2.0* and its FAQ.
- NIST IR 8547, *Transition to Post-Quantum Cryptography Standards* (final, October 2026).
- NIST SP 800-227, *Recommendations for Key-Encapsulation Mechanisms* (September 2025).
- UK National Cyber Security Centre, *Timelines for migration to post-quantum cryptography*
  (March 2025).
- Michele Mosca, "Cybersecurity in an Era with Quantum Computers: Will We Be Ready?" (*IEEE
  Security & Privacy*, 2018).
