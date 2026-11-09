# 18. Hybrids and the Migration

*The standards are written; the hard part is moving the world onto them. This last chapter
follows the migration as it actually happened, protocol by protocol: TLS, where a hybrid of
X25519 and ML-KEM went from an experiment in 2023 to the default for most web traffic; SSH,
which switched earlier; Signal and iMessage; VPNs. It explains why almost every deployment
is a **hybrid** that combines a post-quantum and a classical algorithm, builds one in code,
and measures why signatures, not key exchange, are the slow part of the migration. It ends
with the deadlines governments have set, the practical work of a crypto inventory (with a
small scanner that ranks what it finds), the way post-quantum keys are written into X.509
certificates, Merkle Tree Certificates, and a migration plan for a settlement on Mars, where
every round trip of a handshake costs up to 44 minutes.*

!!! abstract "In this chapter"
    **You will learn:**

    - why hybrids, how KEM combiners work, why concatenation is safe inside TLS, and X-Wing,
      in code;
    - TLS 1.3's X25519MLKEM768: its timeline, sizes, byte order and share of traffic;
    - SSH, Signal, iMessage, IKEv2, WireGuard and Rosenpass;
    - the signature problem: certificate chains, handshake sizes, ML-DSA and SLH-DSA in X.509,
      composite signatures;
    - Merkle Tree Certificates: how they work and what the first experiment measured;
    - CNSA 2.0, NIST IR 8547 and other national timelines;
    - crypto inventories, cryptographic bills of materials and agility, and how to rank a
      migration with Mosca's inequality.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (KEMs and signatures),
    [Chapter 8](08-ML-KEM.md) (ML-KEM) and [Chapter 9](09-ML-DSA.md) (ML-DSA). Each protocol's
    full design, including its own hybrid details, is in the Protocols book:
    [TLS 1.3](../protocols/03-TLS-1.3-Message-by-Message.md) (chapter 3),
    [SSH](../protocols/06-SSH.md) (chapter 6), [IKEv2](../protocols/07-IPsec-and-IKEv2.md),
    [WireGuard](../protocols/08-WireGuard-and-Noise.md),
    [Signal](../protocols/16-Signal-and-the-Double-Ratchet.md) (chapter 16) and
    [certificates](../protocols/02-Certificates-and-PKI.md).

    **Levels:** §18.1 to §18.3 are for beginners, §18.4 to §18.7 are intermediate, §18.8 to
    §18.11 are expert.

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

Figure 18.1 puts the whole story on one line. The top half is what had happened by November
2026: ten years of experiments, then three years in which post-quantum key exchange went from
an option to the default. The bottom half is what governments have scheduled. The gap between
the two halves is the subject of this chapter. Key exchange is mostly done for the large
platforms and barely started for everyone else; signatures are barely started anywhere; and
the dates at the bottom apply to everyone.

<figure class="mars-fig">
<svg viewBox="0 0 640 452" width="640" role="img" aria-label="Timeline of the post-quantum migration from Google's 2016 experiment to the 2035 deadlines, with the past above a line for November 2026 and the scheduled deadlines below it" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="444" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="22" r="4"/>
<text x="108" y="27">Google's CECPQ1: NewHope beside X25519 in Chrome Canary</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="48" r="4"/>
<text x="108" y="53">CECPQ2 with Cloudflare: NTRU-HRSS and SIKE hybrids</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="74" r="4"/>
<text x="108" y="79">OpenSSH 9.0 makes sntrup761x25519 its default</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="100" r="4"/>
<text x="108" y="105">Chrome 116 offers X25519Kyber768; Signal ships PQXDH</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="126" r="4"/>
<text x="108" y="131">iMessage PQ3; Chrome 124 turns the hybrid on by default</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="152" r="4"/>
<text x="108" y="157">FIPS 203, 204, 205 (Aug.); X25519MLKEM768 in Chrome 131</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="178" r="4"/>
<text x="108" y="183">OpenSSL 3.5 and OpenSSH 10.0 default to ML-KEM hybrids</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="204" r="4"/>
<text x="108" y="209">iOS 26 and macOS 26 (Sept.); Signal's SPQR ratchet (Oct.)</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="230" r="4"/>
<text x="108" y="235">RFC 9881: ML-DSA in X.509 certificates (Oct.)</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="256" r="4"/>
<text x="108" y="261">Chrome plans a root store for Merkle Tree Certificates (Feb.)</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="282" r="4"/>
<text x="108" y="287">Over 65% of human traffic to Cloudflare is hybrid (Apr.)</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="308" r="4"/>
<text x="108" y="313">RFC 10024 (Aug.); NIST IR 8547 final (Oct.)</text>
<line x1="20" y1="326" x2="620" y2="326" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="620" y="342" text-anchor="end" font-size="12" fill-opacity=".7">November 2026: above, done; below, scheduled</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2027</text>
<circle cx="92" cy="360" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="365">New US national security purchases must meet CNSA 2.0</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2030</text>
<circle cx="92" cy="386" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="391">NIST deprecates RSA and elliptic curves; CNSA 2.0 signing</text>
<text x="78" y="417" text-anchor="end" font-weight="bold">2033</text>
<circle cx="92" cy="412" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="417">CNSA 2.0: browsers, servers, cloud and operating systems</text>
<text x="78" y="443" text-anchor="end" font-weight="bold">2035</text>
<circle cx="92" cy="438" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="443">NIST disallows them; most national plans complete</text>
</svg>
<figcaption>Figure 18.1. The migration on one line. Filled dots are events that happened; open dots are deadlines that governments have set (§18.7). Key exchange moved in three years; certificates are still at the stage of plans and experiments.</figcaption>
</figure>

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
National agencies differ here too: Germany's BSI and France's ANSSI have recommended hybrids
for the transition, while the NSA accepts pure post-quantum algorithms for the systems it
oversees.

### Three kinds of hybrid

The word "hybrid" covers three different constructions, and it helps to keep them apart.

- **Hybrid key exchange.** Two key exchanges, or two KEMs, run in parallel and their secrets
  are combined into one key. This is what TLS, SSH, Signal and iMessage deploy today. It is
  cheap, it is invisible to users, and the security argument is simple: a key derived from two
  secrets is safe if either secret is.
- **Composite signatures.** One key pair that is really two (say ML-DSA-65 and ECDSA P-256)
  and one signature that is really two, both over the same message. A verifier accepts only if
  both verify, so a forger must break both schemes. This is harder to deploy than a hybrid
  key exchange because it changes certificates, which every verifier in the world must
  understand (§18.6).
- **Parallel credentials.** Two complete certificates or keys, one classical and one
  post-quantum, and a protocol that chooses one. This is not a hybrid in the security sense,
  since a verifier that accepts either can be fooled by breaking the weaker; it is a
  transition tool, letting new clients use the new chain while old ones keep the old.

The asymmetry between the first and the other two is the main theme of this chapter. A key
exchange is negotiated between two parties who are both online and both upgraded; a
signature in a certificate is read by every client that ever connects, including ones that
will not be updated for years.

!!! note "Life story: X25519MLKEM768"
    **Born:** 2016 as Google's CECPQ1 experiment (X25519 with NewHope) in Chrome Canary;
    2019 as CECPQ2 and CECPQ2b (with NTRU-HRSS and with SIKE), with Cloudflare; 2023 as
    X25519Kyber768Draft00 · **Purpose:** post-quantum key exchange for TLS without giving up
    X25519 · **Renamed:** X25519MLKEM768 in late 2024, after FIPS 203 changed Kyber's details
    (Chrome 131) · **Status (Nov 2026):** the default key exchange in Chrome, Edge, Firefox and
    Safari, in Go's standard library, and on Cloudflare's network, among others; codepoint
    0x11EC (4588) in the IANA TLS registry, specified in RFC 10024 (August 2026).

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
IETF draft, draft-connolly-cfrg-xwing-kem (still an individual draft, version 11 in September
2026). Its combiner is

$$K = \text{SHA3-256}(ss_M \,\|\, ss_X \,\|\, ct_X \,\|\, pk_X \,\|\, \text{label}).$$

It hashes the X25519 ciphertext and public key, but not ML-KEM's. That saving is justified by
a proof: ML-KEM's own FO transform already binds its shared secret to its ciphertext, so
including the 1,088-byte ML-KEM ciphertext in the hash would add work without adding security.
X25519 has no such binding, so its values must go in. Figure 18.2 shows what goes into the
hash and what stays out.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The X-Wing combiner: the ML-KEM and X25519 shared secrets, the X25519 ciphertext and public key and a label go into SHA3-256 to give the 32-byte key; the ML-KEM ciphertext is sent but not hashed" fill="currentColor" font-size="14">
<defs><marker id="arr18x" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<rect x="20" y="50" width="180" height="56" rx="6" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="110" y="74" text-anchor="middle" font-weight="bold">ML-KEM-768</text>
<text x="110" y="94" text-anchor="middle" font-size="12">Encaps(ek_M)</text>
<rect x="20" y="170" width="180" height="56" rx="6" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="110" y="194" text-anchor="middle" font-weight="bold">X25519</text>
<text x="110" y="214" text-anchor="middle" font-size="12">ephemeral key e</text>
<line x1="200" y1="62" x2="612" y2="62" stroke="currentColor" stroke-dasharray="6 4" marker-end="url(#arr18x)"/>
<text x="330" y="40" font-size="12">ct_M, 1,088 bytes: sent, not hashed</text>
<text x="330" y="55" font-size="12" fill-opacity=".7">(FO already binds it to ss_M)</text>
<line x1="200" y1="96" x2="398" y2="128" stroke="currentColor" marker-end="url(#arr18x)"/>
<text x="232" y="96" font-size="12">ss_M, 32 bytes</text>
<line x1="200" y1="184" x2="398" y2="146" stroke="currentColor" marker-end="url(#arr18x)"/>
<text x="232" y="160" font-size="12">ss_X, 32 bytes</text>
<line x1="200" y1="210" x2="398" y2="160" stroke="currentColor" marker-end="url(#arr18x)"/>
<text x="232" y="232" font-size="12">ct_X = eG, 32 bytes (also sent)</text>
<line x1="380" y1="262" x2="410" y2="174" stroke="currentColor" marker-end="url(#arr18x)"/>
<text x="300" y="280" font-size="12">pk_X, receiver's key, 32 bytes</text>
<line x1="480" y1="232" x2="470" y2="176" stroke="currentColor" marker-end="url(#arr18x)"/>
<text x="450" y="250" font-size="12">6-byte label</text>
<rect x="400" y="112" width="120" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="460" y="140" text-anchor="middle" font-weight="bold">SHA3-256</text>
<text x="460" y="158" text-anchor="middle" font-size="12">combiner</text>
<line x1="520" y1="143" x2="608" y2="143" stroke="currentColor" stroke-width="2" marker-end="url(#arr18x)"/>
<text x="566" y="134" text-anchor="middle" font-weight="bold">K</text>
<text x="566" y="164" text-anchor="middle" font-size="12">32 bytes</text>
</svg>
<figcaption>Figure 18.2. The X-Wing combiner. Both secrets go into the hash with everything that identifies the X25519 exchange; ML-KEM's 1,088-byte ciphertext travels to the receiver but stays out of the hash, because ML-KEM's own transform already ties its secret to it.</figcaption>
</figure>

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

```text
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

```text
public key 1216 bytes; ciphertext 1120 bytes
both sides agree: True
```

The sizes are those of X25519MLKEM768 in TLS as well: a 1,216-byte key share from the client
(1,184 for ML-KEM plus 32 for X25519) and a 1,120-byte one from the server.

### Why plain concatenation is safe inside TLS

TLS does not use X-Wing. Its hybrid groups simply concatenate the two shared secrets and hand
the 64 bytes to the key schedule in the place where a single X25519 secret used to go. That
looks careless next to X-Wing's careful hash, so it is worth seeing why it is not.

In TLS 1.3 the key exchange secret enters the key schedule through one call:
$\text{handshake\_secret} = \text{HKDF-Extract}(\text{salt}, ss)$, where the salt is derived
from the (usually empty) pre-shared key and $ss$ is the shared secret. HKDF-Extract is
$\text{HMAC}(\text{salt}, ss)$, so the concatenated secret $ss_M \,\|\, ss_X$ is the message
that HMAC compresses. If HMAC behaves like a random function of its message (the formal
version is that it is a "dual PRF", a PRF in either input), then its output is unpredictable
as long as any part of the message is unpredictable. An attacker who knows $ss_X$, because
they have a quantum computer, still faces 32 unknown bytes of $ss_M$; one who has broken
ML-KEM still faces $ss_X$.

That handles the secrets. The ciphertexts and public keys are handled by the transcript:
every traffic key in TLS 1.3 is derived with a hash of all handshake messages so far, which
include both key shares in full, and the Finished messages are MACs over the whole transcript.
An attacker who changes a byte of either ciphertext changes the transcript hash, so the two
sides derive different keys and the handshake fails. This is the binding that X-Wing has to
do inside its own hash, and that TLS gets for free. Bindel, Brendel, Fischlin, Goncalves and
Stebila analyzed hybrid key exchange in this setting in 2019, and the IETF's general design
document for hybrids in TLS, published as RFC 9954 in July 2026, rests on that argument. RFC
10024, which defines the groups, warns that the analysis depends on the TLS 1.3 message
transcript: the same concatenation dropped into another protocol, without a transcript, may
not be safe.

### The general recipe

Outside a protocol with a transcript, the combiner must do the binding. The CFRG's draft on
hybrid KEMs, draft-irtf-cfrg-hybrid-kems (version 12, July 2026), turns the theory into two
reusable shapes:

- the **universal combiner** hashes both secrets, both ciphertexts, both encapsulation keys
  and a label: $K = \text{KDF}(ss_{PQ} \| ss_T \| ct_{PQ} \| ct_T \| ek_{PQ} \| ek_T \|
  \text{label})$. It is safe whatever the components are, at the cost of hashing a few
  kilobytes;
- the **C2PRI combiner** leaves out the post-quantum ciphertext and key:
  $K = \text{KDF}(ss_{PQ} \| ss_T \| ct_T \| ek_T \| \text{label})$. It is safe when the
  post-quantum KEM has **ciphertext second-preimage resistance** (C2PRI): it is hard to find
  a second ciphertext that decapsulates to the same secret. ML-KEM has this property because
  its decapsulation re-encrypts and compares (Chapter 8), so a changed ciphertext is caught
  and answered with the implicit-rejection key instead.

X-Wing has exactly the C2PRI shape, with ML-KEM-768, X25519 and SHA3-256. A companion draft,
draft-irtf-cfrg-concrete-hybrid-kems, fixes concrete instances, including ones with the NIST
curves. The traditional half is always hashed with its ciphertext and key, because
Diffie-Hellman gives no such guarantee on its own: the analysis needs the hash to see exactly
which exchange produced $ss_X$.

### Which secret goes first

RFC 10024 (August 2026) defines three hybrid groups for TLS, and they do not all put the
secrets in the same order. In X25519MLKEM768 the ML-KEM part comes first, in the key shares
and in the shared secret; in SecP256r1MLKEM768 and SecP384r1MLKEM1024 the elliptic-curve part
comes first. The reason is a rule about certification, not security. SP 800-56C Rev. 2, NIST's
recommendation for key derivation, allows a key derivation function to take two shared
secrets only if the first was produced by a NIST-approved scheme. X25519 is not a NIST-approved
key agreement, so for a FIPS-validated product the approved ML-KEM secret must lead. P-256 and
P-384 are approved, and certified implementations of them are far more common than certified
ML-KEM, so in those groups the curve leads and the ML-KEM half need not be certified. The name
X25519MLKEM768 breaks its own family's naming convention (the first-named part should come
first), as RFC 10024 notes, for this historical reason.

**By hand.** The bytes on the wire for each of RFC 10024's groups, from the sizes in FIPS 203
(Chapter 8) and the curve encodings (32 bytes for an X25519 point, 65 for an uncompressed P-256
point, 97 for an uncompressed P-384 point):

| group | client key share | server key share | shared secret into HKDF |
|---|---|---|---|
| X25519MLKEM768 | 1,184 + 32 = 1,216 | 1,088 + 32 = 1,120 | 32 + 32 = 64 |
| SecP256r1MLKEM768 | 65 + 1,184 = 1,249 | 65 + 1,088 = 1,153 | 32 + 32 = 64 |
| SecP384r1MLKEM1024 | 97 + 1,568 = 1,665 | 97 + 1,568 = 1,665 | 48 + 32 = 80 |

*Table 18.1. Key share sizes in bytes for the three hybrid groups of RFC 10024 (codepoints
4588, 4587 and 4589). The first term is the part that comes first on the wire.*

Only X25519MLKEM768 is marked "Recommended" in the IANA registry; the other two exist for
deployments that must use NIST curves, and SecP384r1MLKEM1024 is the one that matches CNSA
2.0's call for ML-KEM-1024 (§18.7).

## 18.4 TLS: from experiment to default

*Level: intermediate.*

TLS 1.3 was well placed for the change. Its ClientHello carries one or more **key shares**,
each for a named group, and the server picks one. A hybrid is simply a new named group whose
key share is the concatenation of an ML-KEM encapsulation key and an X25519 public key, and
whose shared secret is the concatenation of the two secrets, fed into the usual key schedule.
No other part of the protocol had to change. The details are in the
[Protocols book's TLS 1.3 chapter](../protocols/03-TLS-1.3-Message-by-Message.md#310-post-quantum-key-exchange),
which owns the message-level story; this section follows the deployment.

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
  for apps using the system's networking APIs, including Safari. OpenSSL 3.5 (April 2025)
  offers X25519MLKEM768 and X25519 key shares by default, so two up-to-date OpenSSL programs
  agree on a hybrid without any configuration.
- **July and August 2026.** The IETF published the general hybrid design as RFC 9954 and the
  three ML-KEM groups as RFC 10024, ending a run of drafts that browsers had shipped from for
  more than two years.

The effect showed in the traffic. Cloudflare reported that by late 2025 about half of the
human (not bot) HTTPS traffic it carried used post-quantum key agreement, and on 7 April 2026
that the share had passed 65%. The figure moves month by month and Cloudflare Radar publishes
it live, so read it there rather than from any book. The share of servers that support it is
much lower outside the large platforms: a website behind a content network gets it
automatically, while a company's own older servers usually do not.

The same spring, two of the largest operators moved their own deadlines forward. Google said
on 25 March 2026 that it aims to complete its post-quantum migration by 2029, and named
authentication, not key exchange, as the part to hurry. Cloudflare followed on 7 April with
the same year for its whole network, starting with ML-DSA on its connections to origin servers
in 2026 and Merkle Tree Certificates (§18.9) for visitors after that. Both cited progress in
quantum hardware and in resource estimates (Chapter 1), not a known machine.

The cost was small. ML-KEM-768 is faster than X25519; the extra bytes, 1,216 from the client and
1,120 from the server, add about a kilobyte each way, and the measured effect on handshake
time has been a few percent at most for most users.

### When the ClientHello grew

The kilobyte did cause trouble, but not where cryptographers expected. A classical TLS 1.3
ClientHello is a few hundred bytes and fits in one packet. With a 1,216-byte hybrid key share
added to the usual extensions, it grows past the roughly 1,460 bytes that one TCP segment
carries on an Ethernet path, so it is split across two segments. Some servers, load balancers and firewalls had code that read the first
segment and parsed it as the whole ClientHello. They failed, and the connections with them.
A site called tldr.fail was set up in 2024 to list the affected products and their fixes. The
lesson is old: a protocol's flexibility is only as good as the implementations that have
actually exercised it. TLS had allowed large ClientHellos for decades; nobody had sent one
routinely.

Two smaller costs come from negotiation itself:

- **A wrong guess costs a round trip.** A client sends key shares for the groups it guesses
  the server will pick. If it sends only X25519 while the server insists on the hybrid, or
  the other way around, the server answers with a HelloRetryRequest and the handshake takes an
  extra round trip. Browsers therefore send both an X25519MLKEM768 share and a plain X25519
  share, about 1,250 bytes together, so that old and new servers can both answer at once.
- **QUIC counts bytes before it trusts an address.** QUIC's Initial packets are at least 1,200
  bytes, and until the client's address is confirmed a server may send no more than three
  times what it has received (RFC 9000). A hybrid ClientHello takes two Initial packets, which
  raises that limit, but large certificate chains still hit it, as §18.6 shows.

A server operator who wants the hybrid has little to do: a recent OpenSSL, BoringSSL, Go,
rustls or the platform's TLS stack offers it by default. The work is in finding the old
servers, appliances and middleboxes that do not, which is the inventory of §18.8.

## 18.5 SSH, messaging and VPNs

*Level: intermediate.*

**SSH** moved first. OpenSSH 9.0 (April 2022) made `sntrup761x25519-sha512`, a hybrid of
Streamlined NTRU Prime and X25519, its default key exchange, before NIST had chosen anything.
OpenSSH 9.9 (September 2024) added `mlkem768x25519-sha256`, and OpenSSH 10.0 (April 2025) made
it the default. OpenSSH 10.1 began warning users when a connection does not use a post-quantum
key exchange. SSH host and user keys, which are signatures, are still classical in almost all
deployments. See the [Protocols book's SSH chapter](../protocols/06-SSH.md#68-post-quantum-ssh).

**Signal** added **PQXDH** in September 2023: the initial key agreement mixes a Kyber-1024
(now ML-KEM) encapsulation into the X3DH handshake, so a recorded first message cannot be
decrypted later. The double ratchet that follows kept using only Diffie-Hellman until October
2025, when Signal introduced the **Sparse Post-Quantum Ratchet** (SPQR), which runs ML-KEM
alongside the double ratchet in a "triple ratchet" and spreads the large ML-KEM messages over
several ordinary messages to keep each one small. The messages and their keys are taken apart
in the [Protocols book's Signal chapter](../protocols/16-Signal-and-the-Double-Ratchet.md#168-post-quantum-signal).

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

```text
ECDSA P-256       490 bytes    0.3 packets of 1,460 bytes
RSA-2048        1,820 bytes    1.2 packets of 1,460 bytes
ML-DSA-44      14,724 bytes   10.1 packets of 1,460 bytes
ML-DSA-65      20,449 bytes   14.0 packets of 1,460 bytes
Falcon-512      5,124 bytes    3.5 packets of 1,460 bytes
SLH-DSA-128s   39,344 bytes   26.9 packets of 1,460 bytes
```

<figure class="mars-fig">
<svg viewBox="0 0 640 312" width="640" role="img" aria-label="Bar chart of authentication bytes in a TLS handshake: ECDSA P-256 490, RSA-2048 1,820, Falcon-512 5,124, ML-DSA-44 14,724, ML-DSA-65 20,449, SLH-DSA-128s 39,344, with the initial TCP window of 14,600 bytes marked" fill="currentColor" font-size="14">
<line x1="150" y1="16" x2="150" y2="270" stroke="currentColor"/>
<text x="140" y="47" text-anchor="end">ECDSA P-256</text>
<rect x="150" y="30" width="5.5" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="162" y="47" font-size="12">490</text>
<text x="140" y="87" text-anchor="end">RSA-2048</text>
<rect x="150" y="70" width="20.5" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="177" y="87" font-size="12">1,820</text>
<text x="140" y="127" text-anchor="end">Falcon-512</text>
<rect x="150" y="110" width="57.6" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="214" y="127" font-size="12">5,124</text>
<text x="140" y="167" text-anchor="end">ML-DSA-44</text>
<rect x="150" y="150" width="165.6" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="322" y="167" font-size="12">14,724</text>
<text x="140" y="207" text-anchor="end">ML-DSA-65</text>
<rect x="150" y="190" width="230.1" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="387" y="207" font-size="12">20,449</text>
<text x="140" y="247" text-anchor="end">SLH-DSA-128s</text>
<rect x="150" y="230" width="442.6" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="586" y="247" font-size="12" text-anchor="end" fill-opacity=".9">39,344</text>
<line x1="314" y1="16" x2="314" y2="270" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4"/>
<text x="320" y="26" font-size="12">initial TCP window, 10 × 1,460 = 14,600</text>
<line x1="150" y1="270" x2="600" y2="270" stroke="currentColor"/>
<line x1="262.5" y1="270" x2="262.5" y2="275" stroke="currentColor"/>
<line x1="375" y1="270" x2="375" y2="275" stroke="currentColor"/>
<line x1="487.5" y1="270" x2="487.5" y2="275" stroke="currentColor"/>
<line x1="600" y1="270" x2="600" y2="275" stroke="currentColor"/>
<text x="150" y="290" text-anchor="middle" font-size="12">0</text>
<text x="262.5" y="290" text-anchor="middle" font-size="12">10,000</text>
<text x="375" y="290" text-anchor="middle" font-size="12">20,000</text>
<text x="487.5" y="290" text-anchor="middle" font-size="12">30,000</text>
<text x="600" y="290" text-anchor="middle" font-size="12">40,000</text>
<text x="375" y="308" text-anchor="middle" font-size="12" fill-opacity=".7">bytes of public keys and signatures per handshake (2 keys, 5 signatures)</text>
</svg>
<figcaption>Figure 18.3. The certificate chain's weight. Every scheme here carries the same two public keys and five signatures as a typical HTTPS handshake. ML-DSA-44 alone fills the whole initial TCP window; the classical schemes fit in one or two packets.</figcaption>
</figure>

With ML-DSA-44 the authentication data alone is about 14.7 kilobytes, ten full packets
(Figure 18.3). A
TCP connection's initial congestion window is usually ten packets (RFC 6928), so a server
sending this much, plus its other handshake messages, has to wait a full round trip for
acknowledgments before it can finish. On a slow or distant link, that is a visible delay,
and measurements by Cloudflare and others confirm it. Falcon-512 is much better, at about 5
kilobytes, but FN-DSA is not yet standardized (Chapter 10), and its floating-point signing is
hard to implement safely. SLH-DSA is out of the question for every signature in the chain.

Several remedies are being pursued:

- **Mix schemes by role.** The signatures in a chain do different jobs, so they could use
  different schemes. The root's public key never travels (it is already in the browser), so
  the signature it makes on the intermediate could come from a scheme with a huge public key
  and a tiny signature, such as UOV or MAYO (Chapter 15). The CertificateVerify signature is
  made once per connection and needs a fast signer; ML-DSA suits it.
- **Leave things out.** The client usually has the intermediate certificates already, so
  proposals such as abridged certificates (an IETF draft) let the server send a short
  reference instead. Certificate compression (RFC 8879) helps less than it used to: it works
  well on names and extensions, but post-quantum keys and signatures look random and do not
  compress at all.
- **Change the structure.** Merkle Tree Certificates remove the CA signatures and the
  Certificate Transparency timestamps from the handshake altogether, by having the CA sign one
  tree root for a batch of certificates that the browser fetches ahead of time. They are the
  subject of §18.9.

The first two save some bytes; only the third saves most of them, which is why the browsers
have put their weight behind it.

### Post-quantum keys in X.509

Whatever happens in the web PKI, certificates with post-quantum keys are needed now inside
companies, in code signing, in device identities and in government PKIs. The IETF's LAMPS
working group has written the rules for putting each new algorithm into the X.509 format:

- **RFC 9881** (October 2025): ML-DSA. Three object identifiers, one per parameter set; the
  parameters field of the AlgorithmIdentifier must be absent; the public key goes into the
  BIT STRING of the SubjectPublicKeyInfo as the raw FIPS 204 encoding. Only "pure" ML-DSA is
  allowed in certificates and CRLs: HashML-DSA, the pre-hash variant (Chapter 9), must not be
  used there. A private key may be stored as the 32-byte seed (recommended), as the expanded
  key, or as both.
- **RFC 9909** (December 2025): SLH-DSA. Twelve identifiers for the twelve parameter sets of
  FIPS 205 (Chapter 12), and twelve more for the pre-hash HashSLH-DSA, which is allowed here
  because a CA signing a large CRL may not want to hold the whole CRL in a hardware module.
  The RFC notes that SLH-DSA and the older SPHINCS+ are not compatible.
- **RFC 9935** (March 2026): ML-KEM. A KEM key cannot sign, so an ML-KEM certificate can only
  identify an end entity that others encrypt to, for example in CMS mail. Using one to
  authenticate a TLS server, an idea called KEMTLS (Schwabe, Stebila and Wiggers, 2020), would
  need changes to TLS itself.

The identifiers all hang under NIST's arc for algorithms, 2.16.840.1.101.3.4. ML-DSA-44 is
2.16.840.1.101.3.4.3.17, ML-DSA-65 is .18 and ML-DSA-87 is .19; SLH-DSA takes .20 to .31 on the
same branch (SHA-2 sets first, then SHAKE); ML-KEM-512, -768 and -1024 are
2.16.840.1.101.3.4.4.1 to .3.

**By hand.** How does "2.16.840.1.101.3.4.3.17" become bytes in a certificate? DER encodes an
object identifier as tag 06, a length, and then the arcs in base 128, with the top bit of each
byte set when more bytes of the same arc follow. The first two arcs are merged into one number,
$40 \times 2 + 16 = 96$ = 0x60. Then 840 is too big for seven bits: $840 = 6 \times 128 + 72$,
so it becomes two bytes, $0x80 + 6$ = 0x86 and $72$ = 0x48. The arcs 1, 101, 3, 4, 3 and 17 are
all below 128 and take one byte each: 01, 65, 03, 04, 03, 11. That is nine bytes of body, so
the whole identifier is

$$\texttt{06 09 60 86 48 01 65 03 04 03 11}.$$

Every ML-DSA certificate carries these eleven bytes twice for each ML-DSA signature it holds:
once in the signature algorithm inside the signed part and once outside it. Against a
2,420-byte signature they are nothing, which is the point: the format was never the problem.

**Code it.** The same encoding in code, for the new identifiers and an old one for comparison.

```python
def der_oid(dotted):
    """DER encoding of an object identifier: tag 06, length, then base-128 arcs."""
    arcs = [int(a) for a in dotted.split(".")]
    values = [40 * arcs[0] + arcs[1]] + arcs[2:]      # the first two arcs share a byte
    body = b""
    for v in values:
        chunk = [v & 0x7F]
        v >>= 7
        while v:
            chunk.append(0x80 | (v & 0x7F))           # high bit set: more bytes follow
            v >>= 7
        body += bytes(reversed(chunk))
    return bytes([0x06, len(body)]) + body

oids = {
    "ML-DSA-44":           "2.16.840.1.101.3.4.3.17",
    "ML-DSA-65":           "2.16.840.1.101.3.4.3.18",
    "ML-DSA-87":           "2.16.840.1.101.3.4.3.19",
    "SLH-DSA-SHA2-128s":   "2.16.840.1.101.3.4.3.20",
    "ML-KEM-768":          "2.16.840.1.101.3.4.4.2",
    "ECDSA with SHA-256":  "1.2.840.10045.4.3.2",
}
for name, dotted in oids.items():
    print(f"{name:19} {dotted:24} {der_oid(dotted).hex(' ')}")
```

It prints:

```text
ML-DSA-44           2.16.840.1.101.3.4.3.17  06 09 60 86 48 01 65 03 04 03 11
ML-DSA-65           2.16.840.1.101.3.4.3.18  06 09 60 86 48 01 65 03 04 03 12
ML-DSA-87           2.16.840.1.101.3.4.3.19  06 09 60 86 48 01 65 03 04 03 13
SLH-DSA-SHA2-128s   2.16.840.1.101.3.4.3.20  06 09 60 86 48 01 65 03 04 03 14
ML-KEM-768          2.16.840.1.101.3.4.4.2   06 09 60 86 48 01 65 03 04 04 02
ECDSA with SHA-256  1.2.840.10045.4.3.2      06 08 2a 86 48 ce 3d 04 03 02
```

The key and signature fields around those identifiers are where the size goes. A
SubjectPublicKeyInfo is a SEQUENCE of the AlgorithmIdentifier (itself a SEQUENCE holding the
identifier) and a BIT STRING whose first byte counts unused bits. Each element costs a tag and
a length, and lengths of 128 or more take extra bytes.

```python
# Uses der_oid() from the listing above.
def tlv(tag, body):
    """One DER element: tag byte, length (short or long form), body."""
    n = len(body)
    if n < 128:
        length = bytes([n])
    else:
        raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
        length = bytes([0x80 | len(raw)]) + raw
    return bytes([tag]) + length + body

def spki(oid, public_key):                  # SubjectPublicKeyInfo
    alg = tlv(0x30, der_oid(oid))           # AlgorithmIdentifier, parameters absent
    return tlv(0x30, alg + tlv(0x03, b"\x00" + public_key))

def signature_field(signature):             # the BIT STRING at the end of a certificate
    return tlv(0x03, b"\x00" + signature)

for name, oid, pk, sig in [("ML-DSA-44", "2.16.840.1.101.3.4.3.17", 1312, 2420),
                           ("ML-DSA-65", "2.16.840.1.101.3.4.3.18", 1952, 3309),
                           ("SLH-DSA-SHA2-128s", "2.16.840.1.101.3.4.3.20", 32, 7856)]:
    a, b = len(spki(oid, bytes(pk))), len(signature_field(bytes(sig)))
    print(f"{name:18} key field {a:5} bytes, signature field {b:5} bytes")
```

It prints:

```text
ML-DSA-44          key field  1334 bytes, signature field  2425 bytes
ML-DSA-65          key field  1974 bytes, signature field  3314 bytes
SLH-DSA-SHA2-128s  key field    50 bytes, signature field  7861 bytes
```

Check the SLH-DSA line by hand: the AlgorithmIdentifier is 2 + 11 = 13 bytes, the BIT STRING
is 2 + 1 + 32 = 35, and the outer SEQUENCE adds 2 to their 48, giving 50. DER's overhead is a
few dozen bytes per certificate; the rest of a certificate (names, validity, extensions) adds
a few hundred more. An ML-DSA-44 leaf certificate signed by an ML-DSA-44 intermediate
therefore comes to about 1,334 + 2,425 + a few hundred, roughly 4 kilobytes before any SCTs,
against about 1 kilobyte for ECDSA.

### Composite signatures

During the transition, a relying party may not trust ML-DSA alone, or may not yet understand
it. LAMPS has a draft for **composite ML-DSA** (draft-ietf-lamps-pq-composite-sigs, waiting at
the RFC Editor as of mid-2026) that pairs ML-DSA-44, -65 or -87 with RSA, ECDSA, Ed25519 or
Ed448 under a single object identifier. The public key is the two public keys side by side;
the signature is the two signatures; a verifier accepts only if both are valid. The message
each component signs is prefixed with a label naming the combination, so that the ML-DSA half
cannot be cut out and presented as a plain ML-DSA signature, a "stripping" attack.

Composites suit closed systems that control both ends: a company's own PKI, a government's
smart cards, a vendor's firmware. They do not solve the size problem; an ML-DSA-65 plus ECDSA
signature is 3,309 + 64 bytes, a little bigger than ML-DSA alone. Two alternatives exist for
open systems: issue two certificates per server (one classical, one post-quantum) and let the
TLS handshake pick, or use the alternative-key extensions that the 2019 edition of ITU-T X.509
added (a second public key and a second signature carried in extensions that old verifiers
ignore). Both keep old clients working; neither gives old clients any post-quantum protection.

### Where the browsers stand

An IETF TLS draft assigns ML-DSA its signature-scheme codepoints (0x0904 to 0x0906 for
ML-DSA-44, -65 and -87), so the CertificateVerify message can carry one. Libraries such as
OpenSSL 3.5 can already build an all-ML-DSA chain and complete a handshake with it, and
Cloudflare's 2026 plan starts with exactly that on its own links to origin servers, where both
ends are under its control.

The public web is different. On 27 February 2026 Google said that Chrome had no immediate plan
to add X.509 certificates with post-quantum keys to the Chrome Root Store, and that it would
instead build a separate root store accepting only Merkle Tree Certificates, in phases through
2027 (§18.9). As of November 2026, no major browser accepts post-quantum certificates from the
public web PKI, and the CA/Browser Forum has not yet set the rules a public CA would issue
them under. The signature half of the migration is where the key exchange half was in 2019.

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

*Table 18.2. National migration timelines as of November 2026. Each document has more detail,
exceptions and categories than one line can show; read the source before planning against it.*

CNSA 2.0 differs in two ways: it asks for the strongest parameter sets (ML-KEM-1024 and
ML-DSA-87, with LMS or XMSS for firmware signing, Chapter 11), and it does not require hybrids.
NIST permits hybrids, and SP 800-227 (September 2025) gives guidance on using KEMs, including
combinations.

### CNSA 2.0, category by category

The NSA's schedule is the most detailed of the official ones, because it covers equipment that
the US government buys rather than only what it runs. Each category has two dates: one by
which products should support and prefer the new algorithms, and one after which they must use
them exclusively.

| category | support and prefer by | exclusively by |
|---|---|---|
| software and firmware signing | 2025 | 2030 |
| web browsers, servers and cloud services | 2025 | 2033 |
| traditional networking equipment (VPNs, routers) | 2026 | 2030 |
| operating systems | 2027 | 2033 |
| niche equipment | 2030 | 2033 |
| custom applications and legacy equipment | update or replace by 2033 | |

*Table 18.3. CNSA 2.0's transition dates by category (NSA, 2022, with later FAQ updates). The
overall goal for national security systems is 2035.*

A separate date matters more to vendors than any of these: from 1 January 2027, new
acquisitions for national security systems are expected to be CNSA 2.0 compliant unless the
NSA says otherwise. A product that will not support ML-KEM-1024 and ML-DSA-87 by then may
simply not be bought. Firmware signing comes first in the table for the reason given in
§18.1: a device shipped with a classical signing key in 2027 may still be checking updates
with it in 2045, and a forged update is a complete compromise.

### What "deprecated" and "disallowed" mean

NIST uses these words in a precise sense, set out in SP 800-131A. A **deprecated** algorithm
may still be used, but the user must accept the risk of doing so; a **disallowed** one may no
longer be used for the purpose at all in systems that follow NIST's rules, which in practice
means every product that wants FIPS 140 validation and every US federal agency. NIST IR 8547
applies these words to the quantum-vulnerable public-key algorithms: RSA, finite-field and
elliptic-curve Diffie-Hellman, ECDSA, EdDSA and DSA. It leaves the approved symmetric
algorithms in place, AES-128 included, because Grover's algorithm only halves their bit
security on paper (Chapter 2) and is far weaker than that in practice.

The draft of November 2024 treated strengths differently: algorithms at the 112-bit security
level, such as RSA-2048, were to be deprecated after 2030 and disallowed after 2035, while
128-bit and stronger ones, such as P-256 and RSA-3072, ran to 2035 with no deprecation step.
Several summaries of the final report of 27 October 2026 say that this distinction was
removed and every strength is deprecated after 2030; read the final text itself before
relying on either version. Both keep the two dates that matter, 2030 and 2035.

Industry has been setting itself earlier dates. Google and Cloudflare both announced in spring
2026 that they intend to finish by 2029 (§18.4). Those are internal goals, not rules, but they
set the pace for everyone who connects to them: when the largest platforms require ML-DSA on
their links, their partners follow.

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

### Three places to look

Each source sees part of the picture, and each has a blind spot.

**Certificates** are the easiest. Every certificate names its key's algorithm and size and the
algorithm that signed it, in the object identifiers of §18.6, so a script can read a whole
certificate store, a key manager's export or a CA's issuance records and list them. Public
certificates are also in the Certificate Transparency logs, which let anyone list every
certificate ever issued for their own domains, including the ones a forgotten team ordered for
a forgotten server. The blind spot is keys that are not in certificates: SSH host keys,
pre-shared keys, keys wrapped inside applications and databases.

**Code** is harder. A search for "RSA", "ECDSA" or "secp256r1" finds direct uses; a better
scanner follows calls into the cryptographic libraries (OpenSSL's EVP functions, Java's JCA,
Go's `crypto` packages) and records which algorithm and key size each call site requests. It
must also read configuration files, since a TLS library's cipher and group lists are usually
set there and not in the code. The blind spot is binaries without source: appliances, vendor
software and firmware, where the only clues are the library versions linked in.

**Traffic** shows what systems actually do, not what their configuration says. A passive tap
on a network sees each TLS ClientHello and ServerHello in the clear, including the key share
group the server selected, so it can count how many connections use X25519MLKEM768 and which
servers never do. But TLS 1.3 encrypts the certificates, so a passive tap cannot see the
signature algorithms: the inventory needs an active scanner that connects to each endpoint
and reads its chain. (TLS 1.2 sent certificates in the clear, which made passive inventories
easy; its replacement removed that, for good privacy reasons.) SSH, IKEv2 and other protocols
need their own parsers. The blind spot is everything that does not cross the tapped link.

### A cryptographic bill of materials

The result needs a format, so that tools can produce it and other tools can read it. The
common choice is a **cryptographic bill of materials** (CBOM), an extension of the software
bill of materials that lists cryptographic assets beside software components. CycloneDX 1.6,
released by OWASP in April 2024, added a component type `cryptographic-asset` with four kinds
of asset: algorithms, certificates, protocols and related material such as keys. An algorithm
entry records its primitive, its parameters and two security levels: the classical one in bits
and the NIST quantum security category from Chapter 2, where 0 means that a quantum computer
breaks it. A simplified entry for the key agreement of a records server looks like this:

```json
{
  "type": "cryptographic-asset",
  "name": "ECDH P-256",
  "bom-ref": "records-server/key-agreement",
  "cryptoProperties": {
    "assetType": "algorithm",
    "algorithmProperties": {
      "primitive": "key-agree",
      "parameterSetIdentifier": "secp256r1",
      "classicalSecurityLevel": 128,
      "nistQuantumSecurityLevel": 0
    }
  }
}
```

A CBOM is useful beyond the migration: it says where every key is, which is the first thing an
incident responder needs when a library has a flaw. Its weakness is the same as any inventory's:
it is only as current as its last scan, so the scans must run on a schedule and the CBOM must
live with the build, not in a report.

### Ranking with Mosca's inequality

Then rank by Mosca's inequality (Chapter 1): data that must stay secret for $x$ years,
systems that take $y$ years to migrate, and an estimate $z$ of when a large quantum computer
arrives. Where $x + y > z$, the system is already late. Long-lived secrets carried over the
network (health records, state secrets, intellectual property) and long-lived roots of trust
(firmware signing keys, root certificates, devices that will be in the field for twenty
years) come first.

For a signature, $x$ is not a secrecy time but a trust time: how long after signing must a
forgery still be impossible? For a TLS certificate that is the certificate's lifetime, a few
months; for a firmware signing key it is as long as any device will accept updates signed by
it; for a signed contract or a land record it may be decades.

**By hand.** Take $z = 12$ years as a planning estimate (Chapter 1 explains why any single
number is uncertain; a careful planner also tries 8 and 20). Four systems from one inventory:

- patient records sent between clinics, secret for $x = 50$ years, with a $y = 4$ year
  migration: $50 + 4 = 54 > 12$, late by 42 years. Every record sent today over a classical
  key exchange is already exposed to a future decryption.
- firmware signing with RSA-3072 for devices in the field $x = 20$ years, $y = 5$:
  $25 > 12$, late by 13 years.
- a VPN to a supply depot, traffic secret for $x = 10$ years, $y = 3$: $13 > 12$, late by one
  year, the marginal case that a different $z$ would flip.
- the web front end's ECDSA certificate, trusted for $x = 1$ year, $y = 3$: $4 < 12$, eight
  years of slack.

Figure 18.4 draws the same four. The order matters more than the exact numbers: the patient
records come first even if $z$ is 30, and the certificate comes last even if $z$ is 6.

<figure class="mars-fig">
<svg viewBox="0 0 640 268" width="640" role="img" aria-label="Mosca planning chart: for four systems, a migration bar followed by a secrecy or trust bar, compared with a vertical line at twelve years; patient records, firmware signing and the VPN cross the line, the web certificate does not" fill="currentColor" font-size="14">
<rect x="180" y="12" width="18" height="12" fill="none" stroke="currentColor"/>
<text x="204" y="23" font-size="12">y: years to migrate</text>
<rect x="340" y="12" width="18" height="12" fill="currentColor" fill-opacity=".45"/>
<text x="364" y="23" font-size="12">x: years the data or signature must hold</text>
<text x="160" y="67" text-anchor="end">patient records</text>
<rect x="170" y="50" width="28" height="26" fill="none" stroke="currentColor"/>
<rect x="198" y="50" width="350" height="26" fill="currentColor" fill-opacity=".45"/>
<text x="554" y="67" font-size="12">54</text>
<text x="160" y="117" text-anchor="end">firmware signing</text>
<rect x="170" y="100" width="35" height="26" fill="none" stroke="currentColor"/>
<rect x="205" y="100" width="140" height="26" fill="currentColor" fill-opacity=".45"/>
<text x="351" y="117" font-size="12">25</text>
<text x="160" y="167" text-anchor="end">VPN to depot</text>
<rect x="170" y="150" width="21" height="26" fill="none" stroke="currentColor"/>
<rect x="191" y="150" width="70" height="26" fill="currentColor" fill-opacity=".45"/>
<text x="267" y="167" font-size="12">13</text>
<text x="160" y="217" text-anchor="end">web certificate</text>
<rect x="170" y="200" width="21" height="26" fill="none" stroke="currentColor"/>
<rect x="191" y="200" width="7" height="26" fill="currentColor" fill-opacity=".45"/>
<text x="204" y="217" font-size="12">4</text>
<line x1="254" y1="40" x2="254" y2="240" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="254" y="258" text-anchor="middle" font-size="12">z = 12 years: a large quantum computer (estimate)</text>
<line x1="170" y1="40" x2="170" y2="240" stroke="currentColor"/>
<text x="170" y="258" text-anchor="middle" font-size="12" fill-opacity=".7">now</text>
</svg>
<figcaption>Figure 18.4. Mosca's inequality as a planning chart. Each bar is the migration time followed by the time the protection must last. Whatever reaches past the dashed line is exposed; the further past, the more urgent. Scale: 7 pixels per year.</figcaption>
</figure>

**Code it.** A small classifier for an inventory. It reads algorithm names as a scanner would
report them, sorts them into risk classes, and for the ones Shor's algorithm breaks computes
Mosca's slack $z - (x + y)$, so that the most overdue come first.

```python
SHOR = {"RSA", "DH", "DSA", "ECDH", "ECDSA", "X25519", "X448", "Ed25519", "Ed448"}
PQ = {"ML-KEM", "ML-DSA", "SLH-DSA", "LMS", "XMSS", "HQC"}
WEAK = {"3DES", "SHA-1", "MD5", "RC4", "RSA-1024"}

def family(part):
    """'ECDH-P256' -> 'ECDH', 'ML-KEM-768' -> 'ML-KEM', 'AES-256' -> 'AES-256'."""
    for name in sorted(SHOR | PQ, key=len, reverse=True):
        if part == name or part.startswith(name + "-"):
            return name
    return part

def classify(alg):
    """Quantum risk of an algorithm string such as 'RSA-2048' or 'X25519+ML-KEM-768'."""
    parts = alg.split("+")
    families = [family(p) for p in parts]
    if alg in WEAK:
        return "broken today"
    if any(f in PQ for f in families):
        return "hybrid" if len(parts) > 1 else "post-quantum"
    if any(f in SHOR for f in families):
        return "Shor"
    if alg == "AES-128":
        return "Grover, minor"
    return "fine"

def priority(risk, x, y, z):
    """Lower is more urgent. For Shor-breakable uses, Mosca's slack z - (x + y)."""
    if risk == "broken today":
        return -99
    if risk == "Shor":
        return z - (x + y)
    return 99

inventory = [   # system, use, algorithm, secrecy or trust years x, migration years y
    ("web front end",    "key exchange", "X25519+ML-KEM-768", 1, 1),
    ("web front end",    "certificate",  "ECDSA-P256",        1, 3),
    ("patient records",  "key exchange", "ECDH-P256",        50, 4),
    ("backup tapes",     "encryption",   "AES-256",          50, 2),
    ("VPN to depot",     "key exchange", "DH-2048",          10, 3),
    ("firmware signing", "signature",    "RSA-3072",         20, 5),
    ("old badge reader", "encryption",   "3DES",              5, 2),
    ("log server",       "signature",    "Ed25519",           1, 2),
]
Z = 12                         # a planning estimate: a large quantum computer in 12 years
rows = sorted((priority(classify(a), x, y, Z), s, u, a, classify(a))
              for s, u, a, x, y in inventory)
for p, system, use, alg, risk in rows:
    when = "now" if p == -99 else ("" if p == 99 else f"slack {p:+d} y")
    print(f"{system:16} {use:12} {alg:18} {risk:13} {when}".rstrip())
```

It prints:

```text
old badge reader encryption   3DES               broken today  now
patient records  key exchange ECDH-P256          Shor          slack -42 y
firmware signing signature    RSA-3072           Shor          slack -13 y
VPN to depot     key exchange DH-2048            Shor          slack -1 y
web front end    certificate  ECDSA-P256         Shor          slack +8 y
log server       signature    Ed25519            Shor          slack +9 y
backup tapes     encryption   AES-256            fine
web front end    key exchange X25519+ML-KEM-768  hybrid
```

Three things in the output are worth noticing. The 3DES badge reader comes first although it
has nothing to do with quantum computers: every inventory finds classical problems too, and
they should be fixed on the way. The backup tapes, secret for fifty years, are fine, because
they are encrypted with AES-256 and their keys are not sent over a network; what matters is how
the key travels, not how long the data lives. And the hybrid front end needs nothing, which is
the payoff of the defaults described in §18.4. A real scanner adds the location of each use,
its owner and the library version, and writes the rows out as a CBOM.

### Agility

**Crypto agility** is the property that makes the next migration cheaper: algorithms chosen by
configuration rather than hard-coded, negotiated in protocols, with key and signature sizes
that are not fixed in data formats, and a tested way to roll keys. TLS 1.3 and SSH were agile
enough to add hybrids with a new identifier. Many embedded protocols, smart card formats and
databases with fixed-width signature columns were not. Agility is not free, since every option
is code that can be wrong, but the lesson of SIKE and Rainbow is that some choice made in 2026
will have to be undone.

## 18.9 Merkle Tree Certificates

*Level: expert.*

Section 18.6 ended with a chain of two public keys and five signatures. Look at who those
signatures are for. The CA's signature on the leaf says "this key belongs to this name". The
two SCTs say "this certificate has been logged where anyone can see it". The CA's signature on
the intermediate says "this intermediate speaks for the root". Only the CertificateVerify
signature is about this connection. Four of the five are statements about the certificate,
made once and then sent again in every handshake, billions of times a day.

**Merkle Tree Certificates** (MTCs) replace those four statements with one. The CA keeps an
append-only log of everything it issues, a Merkle tree like the ones in Certificate
Transparency and in hash-based signatures (Chapter 11). Every so often it signs the tree's
current head. A certificate then needs no signature of its own: it is the entry in the log,
plus an **inclusion proof** showing that the entry is under a head the browser already trusts.
The proof is a list of sibling hashes, one per level of the tree, so its size grows with the
logarithm of the number of certificates, not with the size of any post-quantum signature.

### How the draft works

The IETF's PLANTS working group (the name stands for PKI, Logs, And Tree Signatures) took up
the design, and its draft, draft-ietf-plants-merkle-tree-certs, was at version 05 in July
2026. Its main pieces:

- **The issuance log.** Each CA runs one or more logs, and only the CA appends to them. An
  entry holds what a certificate would say (names, validity, extensions) and a hash of the
  subject's public key rather than the key itself, so entries stay small.
- **Checkpoints and cosigners.** The CA periodically signs a checkpoint, a statement of the
  tree's size and root hash. Other parties, called cosigners (witnesses or mirrors that
  check the log grows only by appending), add their own signatures. Their signatures take over
  the job the SCTs did: a CA cannot show one tree to a browser and another to the world.
- **Standalone certificates.** An inclusion proof up to a signed subtree, plus the cosignatures
  on that subtree. A standalone certificate is usable at once, by any client, but carries
  signatures and so is still large with post-quantum algorithms.
- **Landmark-relative certificates.** Some tree sizes are declared **landmarks**, a few times
  a day, and the browser vendor's update service sends every client the landmark subtree
  hashes in advance. A certificate relative to a landmark is just the entry and an inclusion
  proof up to that landmark, with no signatures at all. The browser checks the proof against a
  hash it already holds.

A server holds both kinds. In the handshake the client says which landmarks it has, using a
mechanism the TLS working group is defining for naming trust anchors, and the server sends
the landmark-relative certificate if the client is up to date and the standalone one if not.
A client that has been offline for a week, or a new install, still connects, only with more
bytes.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A Merkle tree over eight certificate entries; the browser holds the root in advance; the proof for entry c5 is the three shaded sibling hashes c4, n3 and m0" fill="currentColor" font-size="14">
<rect x="286" y="14" width="56" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>
<text x="314" y="34" text-anchor="middle">root</text>
<text x="352" y="26" font-size="12">landmark: the browser has this hash</text>
<text x="352" y="41" font-size="12" fill-opacity=".7">before the handshake begins</text>
<line x1="162" y1="80" x2="314" y2="44" stroke="currentColor"/>
<line x1="466" y1="80" x2="314" y2="44" stroke="currentColor" stroke-width="2.5"/>
<rect x="134" y="80" width="56" height="30" rx="4" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<text x="162" y="100" text-anchor="middle">m0</text>
<rect x="438" y="80" width="56" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>
<text x="466" y="100" text-anchor="middle">m1</text>
<line x1="86" y1="145" x2="162" y2="110" stroke="currentColor"/>
<line x1="238" y1="145" x2="162" y2="110" stroke="currentColor"/>
<line x1="390" y1="145" x2="466" y2="110" stroke="currentColor" stroke-width="2.5"/>
<line x1="542" y1="145" x2="466" y2="110" stroke="currentColor"/>
<rect x="58" y="145" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="86" y="165" text-anchor="middle">n0</text>
<rect x="210" y="145" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="238" y="165" text-anchor="middle">n1</text>
<rect x="362" y="145" width="56" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>
<text x="390" y="165" text-anchor="middle">n2</text>
<rect x="514" y="145" width="56" height="30" rx="4" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<text x="542" y="165" text-anchor="middle">n3</text>
<line x1="48" y1="210" x2="86" y2="175" stroke="currentColor"/>
<line x1="124" y1="210" x2="86" y2="175" stroke="currentColor"/>
<line x1="200" y1="210" x2="238" y2="175" stroke="currentColor"/>
<line x1="276" y1="210" x2="238" y2="175" stroke="currentColor"/>
<line x1="352" y1="210" x2="390" y2="175" stroke="currentColor"/>
<line x1="428" y1="210" x2="390" y2="175" stroke="currentColor" stroke-width="2.5"/>
<line x1="504" y1="210" x2="542" y2="175" stroke="currentColor"/>
<line x1="580" y1="210" x2="542" y2="175" stroke="currentColor"/>
<rect x="20" y="210" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="48" y="230" text-anchor="middle">c0</text>
<rect x="96" y="210" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="124" y="230" text-anchor="middle">c1</text>
<rect x="172" y="210" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="200" y="230" text-anchor="middle">c2</text>
<rect x="248" y="210" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="276" y="230" text-anchor="middle">c3</text>
<rect x="324" y="210" width="56" height="30" rx="4" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<text x="352" y="230" text-anchor="middle">c4</text>
<rect x="400" y="210" width="56" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>
<text x="428" y="230" text-anchor="middle" font-weight="bold">c5</text>
<rect x="476" y="210" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="504" y="230" text-anchor="middle">c6</text>
<rect x="552" y="210" width="56" height="30" rx="4" fill="none" stroke="currentColor"/>
<text x="580" y="230" text-anchor="middle">c7</text>
<text x="320" y="268" text-anchor="middle" font-size="12">c5 = the server's entry: its names, validity and a hash of its public key</text>
<text x="320" y="288" text-anchor="middle" font-size="12">proof = the shaded hashes c4, n3, m0: 3 × 32 = 96 bytes, and no signature</text>
</svg>
<figcaption>Figure 18.5. A landmark-relative certificate. The server sends its entry c5 and the three shaded sibling hashes; the browser hashes its way up the bold path and compares the result with the landmark root it fetched earlier. With eight entries the proof is three hashes; with four million it is 22.</figcaption>
</figure>

**By hand.** In Figure 18.5 the browser receives entry c5 and the proof: the leaf hash $h_4$
of its neighbor c4, and the inner hashes $n_3$ and $m_0$. It computes $h_5 = H(\texttt{00} \| c_5)$ for the leaf, then
$n_2 = H(\texttt{01} \| h_4 \| h_5)$, since c5 is a right child and its sibling goes on the
left; then $m_1 = H(\texttt{01} \| n_2 \| n_3)$, since n2 is a left child; then
$\text{root} = H(\texttt{01} \| m_0 \| m_1)$. Three hashes received, four computed, and one
comparison with the landmark. The prefixes 00 and 01 keep a leaf from ever being confused
with an inner node, a convention taken from Certificate Transparency (RFC 6962 and RFC 9162).

For the sizes, the number of hashes in the proof is the number of levels, $\lceil \log_2 N
\rceil$ for $N$ entries. With $N = 4{,}000{,}000$ certificates under one landmark, $2^{21} =
2{,}097{,}152 < N \le 2^{22} = 4{,}194{,}304$, so the proof has 22 hashes of 32 bytes: 704
bytes. A whole landmark-relative handshake with ML-DSA-44 then carries the server's public key
(1,312 bytes), its CertificateVerify signature (2,420 bytes) and the proof (704 bytes), plus
the entry's few hundred bytes of names and extensions: about 4.4 kilobytes plus the entry,
against 14.7 kilobytes for the classical structure with the same algorithm. It fits inside the
initial TCP window with room to spare.

**Code it.** A Merkle tree over a batch of 1,024 certificate entries, an inclusion proof for
one of them, and the proof sizes at larger scales.

```python
import hashlib

def leaf_hash(entry):  return hashlib.sha256(b"\x00" + entry).digest()
def node_hash(l, r):   return hashlib.sha256(b"\x01" + l + r).digest()

def root_and_proof(leaves, index):
    """Merkle root over leaf hashes (count a power of two) and the path for one leaf."""
    level, proof = leaves, []
    while len(level) > 1:
        proof.append(level[index ^ 1])                # the sibling at this level
        level = [node_hash(level[i], level[i + 1]) for i in range(0, len(level), 2)]
        index //= 2
    return level[0], proof

def verify(entry, index, proof, root):
    h = leaf_hash(entry)
    for sibling in proof:
        h = node_hash(h, sibling) if index % 2 == 0 else node_hash(sibling, h)
        index //= 2
    return h == root

# A batch of 1,024 certificate entries; the CA signs only the root (a landmark).
entries = [f"example-{i}.mars: key hash {i:04d}".encode() for i in range(1024)]
root, proof = root_and_proof([leaf_hash(e) for e in entries], 700)
print("proof for entry 700:", len(proof), "hashes,", 32 * len(proof), "bytes")
print("verifies:", verify(entries[700], 700, proof, root))
print("forged entry verifies:", verify(b"evil.mars: attacker key", 700, proof, root))
for n in (1_000_000, 4_000_000, 30_000_000):
    print(f"{n:>10,} certificates: proof of {32 * (n - 1).bit_length()} bytes")
```

It prints:

```text
proof for entry 700: 10 hashes, 320 bytes
verifies: True
forged entry verifies: False
 1,000,000 certificates: proof of 640 bytes
 4,000,000 certificates: proof of 704 bytes
30,000,000 certificates: proof of 800 bytes
```

To forge, an attacker would need a different entry whose path hashes to the same root: a
second preimage of SHA-256, which no quantum algorithm makes practical (Grover's square root
still leaves $2^{128}$ work). The security of a landmark-relative certificate therefore rests
on a hash function alone, like SLH-DSA, and the post-quantum signatures are needed only where
a fresh statement must be made: the checkpoint signatures, which browsers check once per
landmark, and the CertificateVerify, once per connection.

### The first experiment

Cloudflare and Chrome ran the first test on real traffic in early 2026, and Cloudflare's Luke
Valenta reported the early results to the PLANTS working group at IETF 125 in March. Cloudflare
ran a "bootstrap" MTC CA that re-issued existing certificates for about 1,000 of its customers'
domains as MTCs, each backed by an ordinary certificate chain, with 7-day validity and a
landmark every hour. The client was 50% of Chrome Beta from version 146. The largest proof
seen was 512 bytes (16 hashes), and the team expected 700 to 800 bytes at the scale of the whole
web, which matches the arithmetic above. A client's stored landmarks took about 10 kilobytes.

The experiment used classical signatures throughout, so it measured structure, not
post-quantum sizes, and it still found the MTC handshakes faster: a median of 105 ms against
116 ms for the control group, about 9%, and 348 ms against 380 ms at the 90th percentile.
Most clients picked up a new landmark within two to three hours, and in the steady state about
0.5 to 1.5% were stale and needed the fallback. Middleboxes did not interfere, because TLS
1.3 encrypts the certificate message, so nothing on the path can see that it changed shape.

### The costs

MTCs are not free, and their costs fall in new places:

- **Freshness.** A landmark-relative certificate works only for clients that have the
  landmark. Browsers with an update service can do this; a command-line tool, an embedded
  device or a client on a ship cannot easily, and they fall back to standalone certificates
  with all their signatures.
- **Delay at issuance.** A new certificate becomes landmark-relative only after the next
  landmark, and then only once clients have fetched it. The draft therefore expects the CA to
  issue a standalone certificate at the same time, for immediate use.
- **Short lives instead of revocation.** The experiment's certificates lived 7 days. MTCs fit
  a web PKI where certificates are short-lived and revocation is mostly replaced by expiry,
  which is the direction the CA/Browser Forum's lifetimes have been moving anyway
  ([Protocols book, certificates](../protocols/02-Certificates-and-PKI.md)).
- **A new trust store.** Browsers must trust CAs to run logs properly, which is a new kind of
  audit. Chrome's plan, announced on 27 February 2026, is a separate Chrome Quantum-resistant
  Root Store that accepts only MTCs, built in phases: the feasibility test with Cloudflare
  first, then inviting log operators and CAs in 2027. Reported target dates for the later
  phases (the first and third quarters of 2027) are plans, not commitments.

!!! note "Life story: Merkle Tree Certificates"
    **Born:** 2023, as an individual IETF draft by David Benjamin, Devon O'Brien and Bas
    Westerbaan · **Purpose:** take CA signatures and transparency timestamps out of the TLS
    handshake, so that post-quantum signatures are needed only once per connection ·
    **Helped:** a 2026 experiment by Cloudflare and Chrome on live traffic, about 9% faster
    handshakes even with classical signatures · **Status (Nov 2026):** IETF PLANTS working
    group draft (version 05, July 2026); Chrome plans a root store that accepts only MTCs;
    Cloudflare plans them for its visitors' connections.

## 18.10 Mars: a migration plan for a settlement

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

### Handshakes across the light delay

The plan's second step says "every TLS, SSH and VPN link moves to hybrids", and inside the city
that is the whole story: the links are short and the handshakes of §18.4 cost microseconds.
The link to Earth is different. A radio signal takes between about 3 and 22 minutes each way,
depending on where the two planets are in their orbits, so a round trip costs 6 to 44 minutes,
and every round trip that a protocol spends before it can send data is paid at that price.

**By hand.** Count round trips before the first byte of a reply. TCP spends one on its own
handshake (SYN, SYN-ACK). TLS 1.3 spends one more (ClientHello out, ServerHello through
Finished back). The request then goes out and the reply comes back: a third. With an ML-DSA
chain larger than the initial congestion window, the server must stop partway through its
flight and wait for acknowledgments: a fourth. At the worst-case one-way delay of 22 minutes,
a round trip is 44 minutes, so

$$4 \times 44 = 176 \text{ minutes}$$

before the first byte of the reply, nearly three hours. QUIC folds the transport and TLS
handshakes into one round trip, but its anti-amplification limit adds one back for a large
chain. The alternative is to send no handshake at all. If the Earth server's ML-KEM key (or
X-Wing key, §18.3) is known in advance, the client encapsulates to it and sends the
ciphertext in the same transmission as the encrypted request: one trip out, one back, 44
minutes. Figure 18.6 compares the designs.

**Code it.** The same count for the three distances that bound the problem.

```python
# Round trips before the first byte of a reply, and what they cost at Mars distances.
designs = {
    "TCP + TLS 1.3, small chain":       3,   # SYN; ClientHello..Finished; request/reply
    "TCP + TLS 1.3, ML-DSA chain":      4,   # one more: the chain overflows initcwnd
    "QUIC, small chain":                2,
    "QUIC, ML-DSA chain":               3,   # 3x amplification limit before validation
    "one-pass hybrid KEM to known key": 1,   # ciphertext travels with the request
}
for one_way in (3, 12.5, 22):                 # minutes, Earth to Mars
    rtt = 2 * one_way
    print(f"one-way delay {one_way} min (round trip {rtt:g} min)")
    for name, trips in designs.items():
        print(f"  {name:33} {trips * rtt:6.0f} min")
```

It prints:

```text
one-way delay 3 min (round trip 6 min)
  TCP + TLS 1.3, small chain            18 min
  TCP + TLS 1.3, ML-DSA chain           24 min
  QUIC, small chain                     12 min
  QUIC, ML-DSA chain                    18 min
  one-pass hybrid KEM to known key       6 min
one-way delay 12.5 min (round trip 25 min)
  TCP + TLS 1.3, small chain            75 min
  TCP + TLS 1.3, ML-DSA chain          100 min
  QUIC, small chain                     50 min
  QUIC, ML-DSA chain                    75 min
  one-pass hybrid KEM to known key      25 min
one-way delay 22 min (round trip 44 min)
  TCP + TLS 1.3, small chain           132 min
  TCP + TLS 1.3, ML-DSA chain          176 min
  QUIC, small chain                     88 min
  QUIC, ML-DSA chain                   132 min
  one-pass hybrid KEM to known key      44 min
```

<figure class="mars-fig">
<svg viewBox="0 0 640 262" width="640" role="img" aria-label="Bar chart of minutes before the first reply byte at a 22-minute one-way delay: TCP and TLS with an ML-DSA chain 176, TCP and TLS with a small chain 132, QUIC with an ML-DSA chain 132, QUIC with a small chain 88, one-pass hybrid KEM 44" fill="currentColor" font-size="14">
<line x1="260" y1="12" x2="260" y2="216" stroke="currentColor"/>
<text x="250" y="37" text-anchor="end">TCP + TLS, ML-DSA chain</text>
<rect x="260" y="20" width="352" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="604" y="37" text-anchor="end" font-size="12" font-weight="bold" fill-opacity=".9">176</text>
<text x="250" y="77" text-anchor="end">TCP + TLS, small chain</text>
<rect x="260" y="60" width="264" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="530" y="77" font-size="12">132</text>
<text x="250" y="117" text-anchor="end">QUIC, ML-DSA chain</text>
<rect x="260" y="100" width="264" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="530" y="117" font-size="12">132</text>
<text x="250" y="157" text-anchor="end">QUIC, small chain</text>
<rect x="260" y="140" width="176" height="24" fill="currentColor" fill-opacity=".55"/>
<text x="442" y="157" font-size="12">88</text>
<text x="250" y="197" text-anchor="end">one-pass hybrid KEM</text>
<rect x="260" y="180" width="88" height="24" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="354" y="197" font-size="12">44</text>
<line x1="260" y1="216" x2="620" y2="216" stroke="currentColor"/>
<line x1="348" y1="216" x2="348" y2="221" stroke="currentColor"/>
<line x1="436" y1="216" x2="436" y2="221" stroke="currentColor"/>
<line x1="524" y1="216" x2="524" y2="221" stroke="currentColor"/>
<line x1="612" y1="216" x2="612" y2="221" stroke="currentColor"/>
<text x="260" y="236" text-anchor="middle" font-size="12">0</text>
<text x="348" y="236" text-anchor="middle" font-size="12">44</text>
<text x="436" y="236" text-anchor="middle" font-size="12">88</text>
<text x="524" y="236" text-anchor="middle" font-size="12">132</text>
<text x="612" y="236" text-anchor="middle" font-size="12">176</text>
<text x="436" y="256" text-anchor="middle" font-size="12" fill-opacity=".7">minutes before the first byte of a reply, Mars far side (22 minutes one way)</text>
</svg>
<figcaption>Figure 18.6. What a handshake costs at Mars's greatest distance. Each tick is one 44-minute round trip. A post-quantum certificate chain adds a whole round trip to TCP and QUIC alike; a one-pass KEM to a key known in advance needs only the trip out and the trip back.</figcaption>
</figure>

In practice nobody runs TCP across this link; its timers give up long before 44 minutes. The
deep-space networks use delay-tolerant networking, the Bundle Protocol (RFC 9171), in which
each message is a self-contained bundle stored and forwarded hop by hop, and its security
layer BPSec (RFC 9172). The cryptographic consequence is the same either way: an interactive
handshake is too expensive, so the link uses **one-pass** key establishment. Each side
publishes an ML-KEM or X-Wing public key in advance, signed, and every bundle carries a KEM
ciphertext to the receiver's current key, just as HPKE does for a single message on Earth.
The extra 1,120 bytes of an X-Wing ciphertext are nothing on a link that sends megabytes per
bundle.

One-pass KEMs lose one thing that interactive handshakes give: **forward secrecy**. If the
receiver's long-term decapsulation key is ever stolen, every recorded bundle sent to it can be
opened. The city's answer is to make the key short-lived instead of the handshake. Each side
generates a new KEM key pair every day, signs the next week's public keys in advance (so a
key is never needed before it has arrived, even at 22 minutes), and destroys each
decapsulation key a few days after its day ends, once late bundles have stopped arriving. A
thief then gets at most a few days of traffic. The signing key that vouches for these daily
keys is the long-lived secret, and it is an LMS key held in the city's hardware module
(step 3 of the plan).

### Certificates without asking Earth

A certificate check that needs an answer from Earth would stall for up to 44 minutes, and
for about two weeks around each solar conjunction, roughly every 26 months, it would get no
answer at all. So the city runs its own certificate authority for everything inside it, as
the [Protocols book's city authority](../protocols/02-Certificates-and-PKI.md#29-a-city-authority-on-mars)
describes, and treats Earth's PKI as a source of updates, not something to consult.

The post-quantum choices follow from that:

- **No online revocation.** OCSP and its relatives are useless at this distance. The city's
  certificates are short-lived instead, renewed automatically, and an Earth certificate is
  accepted only if it outlives the next expected outage: before a conjunction, every
  certificate used on the Earth link is renewed to last the full blackout plus a margin.
- **Merkle Tree Certificates suit the city well.** The daily uplink already carries software
  updates; it can carry the day's landmark hashes too, a few kilobytes. Every client in the
  city then holds the landmarks, so every handshake inside the city can use landmark-relative
  certificates (§18.9) with no signatures but the CertificateVerify, and the small radio links
  of step 4 can use ML-DSA after all.
- **Clocks are part of the security.** Certificate validity, daily KEM keys and landmark ages
  all depend on time. A message stamped on Earth arrives 3 to 22 minutes later, so the city
  checks validity with a margin of at least the current one-way delay, and keeps its own
  clocks from its own time source rather than trusting a time signal that an attacker on the
  link could delay.

None of this needed new cryptography. It needed the same algorithms arranged around a
constraint that Earth's protocols never had to face, which is a fair summary of the migration
as a whole.

## 18.11 Going deeper

*Level: expert.*

Four questions are open as this book closes, and each is a good place to start reading.

**When does the classical half go?** Hybrids were adopted as insurance against a flaw in the
new algorithms. If ML-KEM survives another decade of attack, the X25519 half will protect
against nothing a quantum computer cannot break, and it will still cost code and review. Some
agencies already accept pure ML-KEM; others want hybrids for as long as they can get them.
The decision will probably be made per protocol, and the combiner analyses above say what each
choice gives up.

**Can authentication be done with KEMs?** KEMTLS (Schwabe, Stebila and Wiggers, 2020) has the
server prove its identity by decapsulating, not signing, which replaces a 2,420-byte ML-DSA
signature by a 1,088-byte ML-KEM ciphertext. The price is a change to the order of TLS
messages and a little more latency before the client knows who it is talking to. It has not
been adopted, but it shows that the signature problem of §18.6 is partly a choice of protocol.

**Which small signature arrives first?** Falcon, as FN-DSA, would roughly halve the chain;
the schemes in NIST's on-ramp (Chapter 15) and SQIsign (Chapter 16) promise much smaller
signatures with other costs. Merkle Tree Certificates reduce how much any of this matters for
the web, but not for DNSSEC, code signing or certificates on smart cards, where drafts for
ML-DSA and for Merkle-tree modes of signing already exist.

**How is an inventory kept true?** Every migration guide asks for one, and few organizations
have one that stays current. Tools that build CBOMs from builds and network scans are young;
the [Engineering book](../engineering/18-Running-Cryptography-for-Years.md) treats the
inventory and key management as ongoing operations rather than a one-time project.

- **Hybrids.** Giacon, Heuer and Poettering, "KEM Combiners" (PKC 2018); Bindel, Brendel,
  Fischlin, Goncalves and Stebila, "Hybrid Key Encapsulation Mechanisms and Authenticated Key
  Exchange" (PQCrypto 2019); Barbosa and others, "X-Wing: The Hybrid KEM You've Been Looking
  For" (2024) and its IETF draft; draft-irtf-cfrg-hybrid-kems; RFC 9954 and RFC 10024.
- **Deployment.** The Cloudflare blog's series on the state of the post-quantum Internet;
  Chrome's announcements for versions 116, 124 and 131; the OpenSSH post-quantum page.
- **Messaging.** Signal's PQXDH specification (2023) and SPQR announcement (2025); Apple's
  PQ3 security research post (2024).
- **Certificates.** RFC 9881, RFC 9909 and RFC 9935; the composite ML-DSA draft
  (draft-ietf-lamps-pq-composite-sigs); the Merkle Tree Certificates draft
  (draft-ietf-plants-merkle-tree-certs) and the early results from IETF 125; Sikeridis,
  Kampanakis and Devetsikiotis on the cost of post-quantum authentication in TLS (NDSS 2020).
- **Inventories.** The CycloneDX 1.6 specification's cryptographic asset type.
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
    later, except for long-lived keys such as roots and firmware signing keys.

??? question "2. What does a hybrid key exchange protect against that pure ML-KEM does not?"

    An undiscovered classical flaw in ML-KEM, of the kind that broke SIKE: the classical part
    still protects the connection against today's attackers.

??? question "3. Why does X-Wing hash X25519's ciphertext and public key but not ML-KEM's ciphertext?"

    ML-KEM has ciphertext second-preimage resistance: its FO transform re-encrypts and
    compares, so no second ciphertext gives the same secret. X25519 has no such binding, so
    its values must go into the combiner's hash.

??? question "4. TLS just concatenates the two secrets. Why is that safe there, and why does RFC 10024 put ML-KEM's secret first in X25519MLKEM768?"

    The 64 bytes go into HKDF-Extract (HMAC), which stays unpredictable if either half is,
    and the transcript hash covers both key shares, so a changed ciphertext changes every key.
    ML-KEM comes first because SP 800-56C Rev. 2 lets a validated product combine two secrets
    only if the first comes from an approved scheme, and X25519 is not one; in the P-256 and
    P-384 groups the curve comes first for the same reason.

??? question "5. How many authentication bytes does a TLS handshake carry with ML-DSA-44 everywhere, and why does it matter?"

    About 14.7 kilobytes: two public keys (2 × 1,312) and five signatures (5 × 2,420). That
    fills a typical initial TCP congestion window of ten 1,460-byte packets on its own, so the
    server waits a round trip for acknowledgments.

??? question "6. Encode the object identifier of ML-DSA-65, 2.16.840.1.101.3.4.3.18, in DER."

    $40 \times 2 + 16 = 96$ = 0x60; $840 = 6 \times 128 + 72$ gives 0x86 0x48; then 01, 65,
    03, 04, 03 and 18 = 0x12. Nine bytes of body, so: 06 09 60 86 48 01 65 03 04 03 12.

??? question "7. A passive tap on a network sees every TLS 1.3 handshake. What can it add to a cryptographic inventory, and what can it not?"

    It sees the ClientHello and ServerHello in the clear, so it can record which key exchange
    group each connection used (for example X25519MLKEM768 or plain X25519). It cannot see the
    certificates, which TLS 1.3 encrypts, so the signature algorithms need an active scan.

??? question "8. How do Merkle Tree Certificates shrink the handshake, and how big is the proof for 4 million certificates?"

    The CA logs certificates in a Merkle tree, and browsers fetch landmark tree hashes in
    advance; the server sends its entry and an inclusion proof, with no CA signatures or SCTs.
    $\lceil \log_2 4{,}000{,}000 \rceil = 22$ hashes of 32 bytes: 704 bytes.

??? question "9. What dates do NIST IR 8547 and CNSA 2.0 set?"

    NIST IR 8547: quantum-vulnerable algorithms deprecated after 2030, disallowed after 2035.
    CNSA 2.0: new national security purchases compliant from 1 January 2027; exclusively
    post-quantum by 2030 for software signing and networking equipment, by 2033 for browsers,
    servers, cloud and operating systems; everything by 2035.

??? question "10. At 22 minutes one way, how long does a TCP and TLS 1.3 request with an ML-DSA chain take to get its first reply byte, and what does Arcadia City do instead?"

    Four round trips of 44 minutes: 176 minutes. The city sends one-pass bundles, each with a
    KEM ciphertext to the receiver's published key (44 minutes for request and reply), and
    restores forward secrecy by rotating the KEM keys daily and deleting old ones.

## What you learned

- Almost every deployment uses hybrids. Inside TLS, concatenating the secrets is safe because
  of HKDF and the transcript; outside, a combiner must hash in the ciphertexts, and X-Wing
  can leave out ML-KEM's because ML-KEM binds its own.
- X25519MLKEM768 went from experiment (2023) to default in the major browsers, Go, OpenSSL
  and Apple's systems by 2025, and to RFC 10024 in 2026; by April 2026 over 65% of human
  traffic to Cloudflare used it. SSH, Signal and iMessage moved too.
- Signatures are the slow half: chains of ML-DSA signatures add about 15 kilobytes. The X.509
  formats exist (RFC 9881, RFC 9909, RFC 9935), composite signatures are close, and the
  browsers are betting on Merkle Tree Certificates, which cut the chain to a key, one
  signature and a proof of a few hundred bytes.
- Governments converge on starting now, finishing priority systems around 2030 and everything
  by 2035; CNSA 2.0 adds a purchasing gate on 1 January 2027.
- Migration starts with an inventory of certificates, code and traffic, written down as a CBOM
  and ranked with Mosca's inequality, and ends, if done well, with agility.
- Distance changes the design, not the algorithms: across a 44-minute round trip, one-pass
  KEMs with short-lived keys replace handshakes, and certificates must be checkable without
  asking anyone.

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
- Nina Bindel, Jacqueline Brendel, Marc Fischlin, Brian Goncalves and Douglas Stebila,
  "Hybrid Key Encapsulation Mechanisms and Authenticated Key Exchange" (PQCrypto 2019).
- RFC 9954, *Hybrid Key Exchange in TLS 1.3* (July 2026), and RFC 10024, *Post-Quantum
  Traditional (PQ/T) Hybrid Key Agreement Mechanisms for TLS 1.3* (August 2026).
- IRTF CFRG, draft-irtf-cfrg-hybrid-kems (version 12, July 2026) and
  draft-irtf-cfrg-concrete-hybrid-kems.
- RFC 9881, *Algorithm Identifiers for ML-DSA* (October 2025); RFC 9909, *SLH-DSA for X.509*
  (December 2025); RFC 9935, *ML-KEM in X.509* (March 2026).
- IETF LAMPS, draft-ietf-lamps-pq-composite-sigs (composite ML-DSA for X.509).
- David Benjamin, Devon O'Brien, Bas Westerbaan, Luke Valenta and Filippo Valsorda,
  draft-ietf-plants-merkle-tree-certs (version 05, July 2026).
- Luke Valenta, "MTC experiment early results", slides to the PLANTS working group, IETF 125
  (March 2026).
- Google Chrome Security, "Cultivating a robust and efficient quantum-safe HTTPS" (27 February
  2026).
- Cloudflare, the post-quantum roadmap (7 April 2026), and Cloudflare Radar's post-quantum
  adoption pages.
- Dimitrios Sikeridis, Panos Kampanakis and Michael Devetsikiotis, "Post-Quantum
  Authentication in TLS 1.3: A Performance Study" (NDSS 2020).
- Peter Schwabe, Douglas Stebila and Thom Wiggers, "Post-Quantum TLS Without Handshake
  Signatures" (KEMTLS, ACM CCS 2020).
- OWASP, *CycloneDX 1.6* (April 2024), with its cryptographic bill of materials.
- NIST SP 800-56C Rev. 2, *Recommendation for Key-Derivation Methods in Key-Establishment
  Schemes* (2020), and NIST SP 800-131A Rev. 2, *Transitioning the Use of Cryptographic
  Algorithms and Key Lengths* (2019).
- RFC 9000, *QUIC* (2021); RFC 6928, *Increasing TCP's Initial Window* (2013); RFC 8879, *TLS
  Certificate Compression* (2020).
- RFC 9171, *Bundle Protocol Version 7*, and RFC 9172, *Bundle Protocol Security* (2022).
