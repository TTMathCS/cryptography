# 17. Group messaging: MLS

*The double ratchet of Chapter 16 protects a conversation between two
devices. Real conversations are groups: a family of five, each with a phone
and a laptop; a company channel of three thousand; a video call with fifty
people joining and leaving. Running a pairwise ratchet with every other
device makes each message cost as many encryptions as there are devices, and
the shortcut most messengers took, "sender keys", gives up the healing that
made the ratchet worth having. Messaging Layer Security (MLS, RFC 9420, 2023)
is the IETF's answer: a group key that changes with every membership change
and every update, kept in a binary tree so that one member can re-key a group
of $n$ with about $\log_2 n$ public-key encryptions. In this chapter you will
compute the MLS key schedule and match the official interop test vectors,
write HPKE from scratch and match RFC 9180, and run TreeKEM on a group of
eight: one commit, seven members agreeing on a new secret from three
ciphertexts, and a removed member left holding keys that open nothing.
Then you will derive message keys down the secret tree, open a real
encrypted message from the interop vectors, let an outsider join by external
commit, and count what commits cost.*

!!! abstract "In this chapter"
    **You will learn:**

    - why pairwise channels and sender keys do not scale securely;
    - what a continuous group key agreement must provide;
    - the ratchet tree, its arithmetic and the idea of TreeKEM;
    - HPKE, the public-key encryption MLS builds on, coded;
    - KeyPackages, proposals, commits, Welcome messages and epochs;
    - the key schedule and the secret tree, coded and checked;
    - PublicMessage and PrivateMessage framing, with a real message opened;
    - external commits, pre-shared keys, branching and reinitialization;
    - how removal, forward secrecy and post-compromise security work in a
      group;
    - what the Delivery Service and Authentication Service must do;
    - what the formal analyses of 2020 to 2026 proved and found;
    - where MLS runs (Discord, Webex, Wire, cross-platform RCS);
    - running a group across the Earth-Mars light delay and a conjunction;
    - what a commit costs against pairwise fan-out, counted in code.

    **You need:** [Chapter 16](16-Signal-and-the-Double-Ratchet.md) (the
    two-party ratchet and its goals) and [Chapter 3](03-TLS-1.3-Message-by-Message.md)
    (a labeled HKDF key schedule, which MLS borrows); Diffie-Hellman and
    hash functions from Chapters [12](../../book/12-Diffie-Hellman.md) and
    [9](../../book/09-Hash-Functions.md) of book 1.

    **Levels:** §17.1 and §17.2 are for beginners, §17.3 to §17.13 are
    intermediate, §17.14 is expert.

## 17.1 Why groups are hard

*Level: beginner.*

Suppose Alice is in a group with seven other people, each of whom has one
device. There are three obvious ways to send a message to the group.

**Pairwise channels.** Alice keeps a double-ratchet session with each of the
seven and encrypts every message seven times. Everything from Chapter 16
carries over: forward secrecy, healing, deniability. But the cost grows with
the group: a message to a 1,000-device group is 999 encryptions and 999
ciphertexts to upload, and the server must store them all. It is fine for a
family, painful for a company.

**Sender keys.** Alice makes a symmetric chain key of her own and sends it,
once, over each pairwise channel. From then on she encrypts each message once
with the next key of her chain and signs it, and everyone who has her chain
key can decrypt. WhatsApp's white paper describes this for groups,
and libsignal implements it. A message costs one
encryption, but healing is lost: an attacker who steals Bob's phone gets
every member's sender chain and reads the group until each member rotates
their own sender key, which usually happens only when someone leaves.

**A single group key** that all members share and that changes often. If
"often" means "whenever anyone joins, leaves, or just wants to heal", the
question becomes how to give a new key to $n - 1$ other people cheaply,
without a trusted server that knows it. That is what MLS does.

The goal has a name: **continuous group key agreement** (CGKA). A CGKA
protocol keeps a sequence of group secrets, one per **epoch**, such that

- only the current members can compute the current epoch's secret;
- a member who leaves cannot compute any later one (that is what removal
  means);
- a member who joins cannot compute earlier ones;
- forward secrecy: secrets of past epochs are deleted, so a later theft does
  not reveal them;
- post-compromise security: if an attacker steals a member's state, the
  member's next **update** gives the group a secret the attacker cannot
  compute.

!!! note "Life story: MLS"
    **Born:** 2018, when an IETF working group formed around a proposal by
    engineers from Cisco, Facebook, Google, Mozilla, Twitter, Wire and
    universities, building on research on asynchronous ratcheting trees
    (Cohn-Gordon, Cremers, Garratt, Millican and Milner, ACM CCS 2018) and
    TreeKEM (Bhargavan, Barnes and Rescorla, 2018) · **Purpose:** one
    standard for end-to-end encrypted groups, from two to many thousands of
    members, that different apps can interoperate on · **Standardized:**
    RFC 9420, July 2023, after formal analyses changed the design several
    times; the architecture document is RFC 9750 (2025) · **Status:** in
    Discord's encrypted voice and video (required for all calls since March
    2026), Webex, Wire, and the GSMA's encrypted RCS between Android and
    iPhone (rolling out since May 2026); post-quantum cipher suites in an
    IETF draft, as of November 2026

## 17.2 A tree of keys

*Level: beginner.*

The trick is a binary tree. Put the members at the leaves. Give every node a
public-key key pair. Arrange things so that **each member knows the private
keys of exactly the nodes on its path to the root**, and nothing else. Then
the root's private key is known to every member and to no one else: it is
the group secret.

Now Alice wants to change the group secret. She makes new key pairs for every
node on her path, leaf to root, and must tell each other member the new
private keys that lie on *their* path. Here is the point: the members split
into subtrees hanging off Alice's path. Her sibling's subtree (one member in
an 8-leaf tree), then the subtree next to her parent (two members), then
the one next to her grandparent (four members). Every member of a subtree
already knows the private key of that subtree's top node. So Alice encrypts
the new secrets once **per subtree**, to that node's public key: three
encryptions for eight members, ten for a thousand, about $\log_2 n$ in
general.

One more idea keeps the message small. Alice does not pick the new secrets
on her path independently. She picks one random **path secret** for her
leaf and derives each next one by hashing:

$$
\mathit{path}_{i+1} = \mathrm{DeriveSecret}(\mathit{path}_i,\ \texttt{"path"}).
$$

Each node's key pair is derived from its path secret. A member who decrypts
the path secret of the lowest node it shares with Alice's path can hash its
way up and compute all the rest, up to the root. Hashing only goes up: a
member who learns a high path secret learns nothing about the lower ones.
That is **TreeKEM**, the heart of MLS.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="A ratchet tree for eight members A to H, nodes numbered 0 to 14 with leaves even; H updates its path, nodes 14, 13, 11 and 7; it encrypts path secrets to the copath nodes 12, 9 and 3, one ciphertext per subtree" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<path d="M320 40 L160 100 M320 40 L480 100 M160 100 L80 160 M160 100 L240 160 M480 100 L400 160 M480 100 L560 160"/>
<path d="M80 160 L40 220 M80 160 L120 220 M240 160 L200 220 M240 160 L280 220 M400 160 L360 220 M400 160 L440 220 M560 160 L520 220 M560 160 L600 220"/>
</g>
<g stroke="currentColor" stroke-width="3" class="acc"><path d="M320 40 L480 100 L560 160 L600 220" fill="none"/></g>
<g stroke="none"><circle style="fill: var(--md-default-bg-color)" cx="320" cy="40" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="160" cy="100" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="480" cy="100" r="16"/>
<circle style="fill: var(--md-default-bg-color)" cx="80" cy="160" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="240" cy="160" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="400" cy="160" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="560" cy="160" r="16"/>
<circle style="fill: var(--md-default-bg-color)" cx="40" cy="220" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="120" cy="220" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="200" cy="220" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="280" cy="220" r="16"/>
<circle style="fill: var(--md-default-bg-color)" cx="360" cy="220" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="440" cy="220" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="520" cy="220" r="16"/><circle style="fill: var(--md-default-bg-color)" cx="600" cy="220" r="16"/>
</g>
<g class="soft" stroke="currentColor"><circle cx="320" cy="40" r="16"/><circle cx="160" cy="100" r="16"/><circle cx="480" cy="100" r="16"/>
<circle cx="80" cy="160" r="16"/><circle cx="240" cy="160" r="16"/><circle cx="400" cy="160" r="16"/><circle cx="560" cy="160" r="16"/>
<circle cx="40" cy="220" r="16"/><circle cx="120" cy="220" r="16"/><circle cx="200" cy="220" r="16"/><circle cx="280" cy="220" r="16"/>
<circle cx="360" cy="220" r="16"/><circle cx="440" cy="220" r="16"/><circle cx="520" cy="220" r="16"/><circle cx="600" cy="220" r="16"/>
</g>
<g class="acc-fill" fill-opacity="0.3" stroke="currentColor"><circle cx="160" cy="100" r="16"/><circle cx="400" cy="160" r="16"/><circle cx="520" cy="220" r="16"/></g>
<g text-anchor="middle">
<text x="320" y="44">7</text><text x="160" y="104">3</text><text x="480" y="104">11</text>
<text x="80" y="164">1</text><text x="240" y="164">5</text><text x="400" y="164">9</text><text x="560" y="164">13</text>
<text x="40" y="224">0</text><text x="120" y="224">2</text><text x="200" y="224">4</text><text x="280" y="224">6</text>
<text x="360" y="224">8</text><text x="440" y="224">10</text><text x="520" y="224">12</text><text x="600" y="224">14</text>
<text x="40" y="256">A</text><text x="120" y="256">B</text><text x="200" y="256">C</text><text x="280" y="256">D</text>
<text x="360" y="256">E</text><text x="440" y="256">F</text><text x="520" y="256">G</text><text x="600" y="256">H</text>
</g>
<text x="20" y="30" font-size="12.5" class="acc-fill">H's new path: 14 → 13 → 11 → 7</text>
<text x="20" y="48" font-size="12.5">shaded: the copath, one ciphertext each</text>
<text x="20" y="272" font-size="11.5">leaves are even, parents odd; a node's level is its number of trailing 1 bits</text>
</svg>
<figcaption>Figure 17.1. TreeKEM in a group of eight. H's commit encrypts the path secret of node 13 to G (node 12), of node 11 to the E-F subtree (node 9), and of the root to the A-D subtree (node 3).</figcaption>
</figure>

## 17.3 The tree in detail

*Level: intermediate.*

MLS stores the tree in an array. Leaves sit at the even indices, $2i$ for
member $i$, and the parents at the odd indices in between. The **level** of a
node is the number of trailing 1 bits of its index: leaves are level 0, nodes
1, 5, 9, 13 level 1, nodes 3 and 11 level 2, node 7 level 3. A node $x$ at
level $k$ has children $x \oplus 2^{k-1}$ and $x \oplus 3 \cdot 2^{k-1}$.
With this layout, the arithmetic of RFC 9420 Appendix C is a few lines of
bit twiddling, and a tree for any number of members is "left-balanced": as
full as possible on the left.

Three words come up constantly.

- The **direct path** of a node is its ancestors up to the root: for H
  (node 14), nodes 13, 11 and 7.
- The **copath** is the sibling of each node on the way up: for H, nodes
  12, 9 and 3.
- A node can be **blank**: it has no key pair, for instance after the member
  below it left. The **resolution** of a node is the smallest set of
  non-blank nodes that covers its subtree: the node itself if it has a key;
  otherwise the resolutions of its two children. A blank node with four
  members below may need four ciphertexts instead of one.

A commit's **UpdatePath** lists, for each node of the committer's direct
path, its new public key and the path secret encrypted to every node in the
resolution of the corresponding copath node. Encryption uses HPKE.

### HPKE, the encryption under the tree

**Hybrid Public Key Encryption** (RFC 9180, 2022) is the modern, analyzed
form of "Diffie-Hellman with an ephemeral key, then a symmetric cipher". Its
KEM step encapsulates: the sender makes an ephemeral key pair, does
Diffie-Hellman with the recipient's public key, and turns the result, with
both public keys, into a shared secret through HKDF. Its key schedule turns
that secret and an application-chosen `info` string into an AEAD key and
nonce. Every step uses **labeled** HKDF, with the protocol name, version
and algorithm identifiers mixed in, so that keys from different uses can
never coincide. HPKE also encrypts the inner ClientHello in TLS's Encrypted
Client Hello (Chapter 5).

### Code it: HPKE from scratch

The program implements HPKE for MLS cipher suite 3: DHKEM(X25519,
HKDF-SHA256), HKDF-SHA256 and ChaCha20-Poly1305 (written out from RFC
8439), and reproduces RFC 9180's own test vector, A.2.1, byte for byte. (The
quotation in the vector is Keats's; the info string is "Ode on a Grecian
Urn".)

```python
# HPKE (RFC 9180), the public-key encryption inside every MLS tree update:
# DHKEM(X25519, HKDF-SHA256), HKDF-SHA256 and ChaCha20-Poly1305, MLS cipher
# suite 3. Checked against RFC 9180 Appendix A.2.1.
import hashlib, hmac, struct
h = bytes.fromhex
def extract(salt, ikm): return hmac.new(salt, ikm, hashlib.sha256).digest()

P = 2**255 - 19
def x25519(k, u=(9).to_bytes(32, "little")):           # RFC 7748
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

def chacha20_block(key, counter, nonce):                # RFC 8439 section 2.3
    def rotl(v, c): return ((v << c) & 0xffffffff) | (v >> (32 - c))
    def qr(s, a, b, c, d):
        s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 16)
        s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 12)
        s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 8)
        s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 7)
    init = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574, *struct.unpack("<8I", key),
            counter, *struct.unpack("<3I", nonce)]
    s = init[:]
    for _ in range(10):
        for a, b, c, d in [(0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15),
                           (0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14)]:
            qr(s, a, b, c, d)
    return struct.pack("<16I", *[(x + y) & 0xffffffff for x, y in zip(s, init)])
def chacha20(key, counter, nonce, data):
    stream = b"".join(chacha20_block(key, counter + i, nonce) for i in range(len(data) // 64 + 1))
    return bytes(a ^ b for a, b in zip(data, stream))
def poly1305(key, msg):                                 # RFC 8439 section 2.5
    r = int.from_bytes(key[:16], "little") & 0x0ffffffc0ffffffc0ffffffc0fffffff
    s, acc = int.from_bytes(key[16:], "little"), 0
    for i in range(0, len(msg), 16):
        acc = (acc + int.from_bytes(msg[i:i + 16] + b"\x01", "little")) * r % (2**130 - 5)
    return ((acc + s) % 2**128).to_bytes(16, "little")
def aead_tag(key, nonce, aad, ct):
    pad = lambda b: b + bytes(-len(b) % 16)
    otk = chacha20_block(key, 0, nonce)[:32]
    return poly1305(otk, pad(aad) + pad(ct) + struct.pack("<QQ", len(aad), len(ct)))
def seal_aead(key, nonce, aad, pt):
    ct = chacha20(key, 1, nonce, pt)
    return ct + aead_tag(key, nonce, aad, ct)
def open_aead(key, nonce, aad, data):
    ct, tag = data[:-16], data[-16:]
    if not hmac.compare_digest(tag, aead_tag(key, nonce, aad, ct)): return None
    return chacha20(key, 1, nonce, ct)

def expand(prk, info, n):
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest(); out += t; i += 1
    return out[:n]
KEM_ID, HPKE_ID = b"KEM\x00\x20", b"HPKE\x00\x20\x00\x01\x00\x03"
def labeled_extract(suite, salt, label, ikm): return extract(salt, b"HPKE-v1" + suite + label + ikm)
def labeled_expand(suite, prk, label, info, n):
    return expand(prk, n.to_bytes(2, "big") + b"HPKE-v1" + suite + label + info, n)

def derive_key_pair(ikm):                               # RFC 9180 section 7.1.3
    prk = labeled_extract(KEM_ID, b"", b"dkp_prk", ikm)
    sk = labeled_expand(KEM_ID, prk, b"sk", b"", 32)
    return sk, x25519(sk)
def kem_shared(dh, enc, pkR):
    prk = labeled_extract(KEM_ID, b"", b"eae_prk", dh)
    return labeled_expand(KEM_ID, prk, b"shared_secret", enc + pkR, 32)
def key_schedule(shared, info):                         # base mode: no PSK, no sender key
    ctx = (b"\x00" + labeled_extract(HPKE_ID, b"", b"psk_id_hash", b"")
           + labeled_extract(HPKE_ID, b"", b"info_hash", info))
    secret = labeled_extract(HPKE_ID, shared, b"secret", b"")
    return labeled_expand(HPKE_ID, secret, b"key", ctx, 32), labeled_expand(HPKE_ID, secret, b"base_nonce", ctx, 12)
def hpke_seal(pkR, info, aad, pt, ikmE):                # one-shot SealBase, sequence number 0
    skE, enc = derive_key_pair(ikmE)
    key, nonce = key_schedule(kem_shared(x25519(skE, pkR), enc, pkR), info)
    return enc, seal_aead(key, nonce, aad, pt)
def hpke_open(skR, info, aad, enc, ct):
    pkR = x25519(skR)
    key, nonce = key_schedule(kem_shared(x25519(skR, enc), enc, pkR), info)
    return open_aead(key, nonce, aad, ct)

# RFC 9180 A.2.1: the sender's ephemeral key and the recipient's key come from fixed seeds
skR, pkR = derive_key_pair(h("1ac01f181fdf9f352797655161c58b75c656a6cc2716dcb66372da835542e1df"))
info, pt = h("4f6465206f6e2061204772656369616e2055726e"), b"Beauty is truth, truth beauty"
enc, ct = hpke_seal(pkR, info, b"Count-0", pt, h("909a9b35d3dc4713a5e72a4da274b55d3d3821a37e5d099e74a647db583a904b"))
print("info:", info.decode())
print("recipient key matches:", pkR.hex().startswith("4310ee97d88cc1f0"))
print("enc matches:          ", enc.hex().startswith("1afa08d3dec047a6"))
print("ciphertext matches:   ", ct.hex() == "1c5250d8034ec2b784ba2cfd69dbdb8af406cfe3ff938e131f0def8c8b60b4db"
                                            "21993c62ce81883d2dd1b51a28")
print("recipient decrypts:   ", hpke_open(skR, info, b"Count-0", enc, ct).decode())
```

```text
info: Ode on a Grecian Urn
recipient key matches: True
enc matches:           True
ciphertext matches:    True
recipient decrypts:    Beauty is truth, truth beauty
```

## 17.4 Running TreeKEM

*Level: intermediate.*

Now the tree. The program below builds an eight-member group whose leaves
have HPKE key pairs and whose parents start blank. Four commits, from A, C,
E and G, fill every parent node; then H commits, and each other member opens
exactly one ciphertext and hashes up to the same commit secret. Then C is
removed, and A commits again.

```python
# TreeKEM on eight members (RFC 9420 sections 4, 7 and Appendix C): the tree
# arithmetic, path secrets, HPKE to the copath, a commit, and a removal.
# Uses derive_key_pair, hpke_seal and hpke_open from above.
import random

def vec(b): return bytes([len(b)]) + b           # short vectors only
def derive_secret(secret, label):                # RFC 9420 section 8, 32 bytes
    info = (32).to_bytes(2, "big") + vec(b"MLS 1.0 " + label) + vec(b"")
    return hmac.new(secret, info + b"\x01", hashlib.sha256).digest()

def level(x):                                    # leaves are the even nodes
    k = 0
    while (x >> k) & 1: k += 1
    return k
def root(n): return (1 << (2 * n - 1).bit_length() - 1) - 1
def left(x): return x ^ (1 << (level(x) - 1))
def right(x): return x ^ (3 << (level(x) - 1))
def parent(x, n):
    if x == root(n): return None
    k = level(x)
    return (x | (1 << k)) ^ (((x >> (k + 1)) & 1) << (k + 1))
def sibling(x, n):
    p = parent(x, n)
    return None if p is None else (right(p) if x < p else left(p))
def direct_path(x, n):
    out = []
    while parent(x, n) is not None: x = parent(x, n); out.append(x)
    return out
def copath(x, n): return [sibling(y, n) for y in [x] + direct_path(x, n)[:-1]]

N = 8
print("tree math matches the vector:",
      [parent(x, N) for x in range(15)] == [1, 3, 1, 7, 5, 3, 5, None, 9, 11, 9, 7, 13, 11, 13] and
      [sibling(x, N) for x in range(15)] == [2, 5, 0, 11, 6, 1, 4, None, 10, 13, 8, 3, 14, 9, 12])

rng = random.Random(9420)
def rand32(): return bytes(rng.getrandbits(8) for _ in range(32))
names = "ABCDEFGH"
tree = {2 * i: derive_key_pair(rand32()) for i in range(N)}      # leaf keys; parents blank
known = {m: {2 * i: tree[2 * i][0]} for i, m in enumerate(names)}  # private keys each member holds

def resolution(x):                               # the non-blank nodes that cover x's subtree
    if x in tree: return [x]
    if level(x) == 0: return []
    return resolution(left(x)) + resolution(right(x))

def commit(sender, ctx=b"epoch"):
    leaf = 2 * names.index(sender)
    path = [leaf] + direct_path(leaf, N)
    secret, secrets = rand32(), {}
    for x in path:                               # each path secret is a hash of the one below
        secrets[x] = secret
        tree[x] = derive_key_pair(derive_secret(secret, b"node"))
        known[sender][x] = tree[x][0]
        secret = derive_secret(secret, b"path")
    commit_secret = secret
    cts = []                                     # path secret of each parent, to the subtree beside it
    for x, c in zip(path[1:], copath(leaf, N)):
        for r in resolution(c):
            cts.append((x, r, hpke_seal(tree[r][1], b"MLS 1.0 UpdatePathNode", ctx, secrets[x], rand32())))
    return commit_secret, cts

def receive(member, sender, cts):
    for x, r, (enc, ct) in cts:                  # find the one ciphertext this member can open
        if r in known[member]:
            secret = hpke_open(known[member][r], b"MLS 1.0 UpdatePathNode", b"epoch", enc, ct)
            for y in [x] + direct_path(x, N):   # hash up to the root, learning those keys
                known[member][y] = derive_key_pair(derive_secret(secret, b"node"))[0]
                secret = derive_secret(secret, b"path")
            return secret, r
    return None, None

for s in "ACEG":                                 # four commits fill every parent node
    cs, cts = commit(s)
    ok = all(receive(m, s, cts)[0] == cs for m in names if m != s)
    print(f"{s} commits: {len(cts)} HPKE ciphertexts; everyone agrees: {ok}")
cs, cts = commit("H")
print(f"H commits: {len(cts)} HPKE ciphertexts, to nodes {[r for _, r, _ in cts]}")
for m in "ABCDEFG":
    got, via = receive(m, "H", cts)
    print(f"  {m} opens the one for node {via:2}  -> same commit secret: {got == cs}")

# Remove C: blank its leaf and its path, then A commits.
leafC = 2 * names.index("C")
for x in [leafC] + direct_path(leafC, N): tree.pop(x, None)
cs, cts = commit("A")
print(f"C removed; A commits: {len(cts)} ciphertexts, to nodes {[r for _, r, _ in cts]}")
print("  C, with every key it ever held, finds a ciphertext for it:", receive("C", "A", cts)[0] is not None)
print("  D:", receive("D", "A", cts)[0] == cs, " H:", receive("H", "A", cts)[0] == cs)
```

```text
tree math matches the vector: True
A commits: 7 HPKE ciphertexts; everyone agrees: True
C commits: 6 HPKE ciphertexts; everyone agrees: True
E commits: 4 HPKE ciphertexts; everyone agrees: True
G commits: 3 HPKE ciphertexts; everyone agrees: True
H commits: 3 HPKE ciphertexts, to nodes [12, 9, 3]
  A opens the one for node  3  -> same commit secret: True
  B opens the one for node  3  -> same commit secret: True
  C opens the one for node  3  -> same commit secret: True
  D opens the one for node  3  -> same commit secret: True
  E opens the one for node  9  -> same commit secret: True
  F opens the one for node  9  -> same commit secret: True
  G opens the one for node 12  -> same commit secret: True
C removed; A commits: 3 ciphertexts, to nodes [2, 6, 11]
  C, with every key it ever held, finds a ciphertext for it: False
  D: True  H: True
```

Read the numbers. A's first commit needs seven ciphertexts, because every
parent is blank and the resolutions fall all the way down to the leaves: as
expensive as pairwise. Each commit fills more of the tree, and by G's commit
the cost is down to $\log_2 8 = 3$. H's commit goes to nodes 12 (G alone), 9
(E and F, who share that node's key) and 3 (A to D). E and F open the same
ciphertext.

**Removal.** Removing C blanks C's leaf and every node on C's path, 5, 3 and
7, since C knew their private keys. When A commits, A's copath is node 2 (B),
node 5 (now blank; its resolution is D's leaf, node 6, because C's leaf is
blank too) and node 11 (E to H). C holds old keys for nodes 4, 5, 3 and 7,
and no ciphertext is addressed to any of them. C is out.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Removing member C: C's leaf and its path nodes 5, 3 and 7 are blanked; A's commit encrypts to B, to D directly because node 5 is blank, and to node 11 for E to H" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<path d="M320 30 L160 90 M320 30 L480 90 M160 90 L80 150 M160 90 L240 150 M480 90 L400 150 M480 90 L560 150"/>
<path d="M80 150 L40 210 M80 150 L120 210 M240 150 L200 210 M240 150 L280 210 M400 150 L360 210 M400 150 L440 210 M560 150 L520 210 M560 150 L600 210"/>
</g>
<g stroke="currentColor" stroke-width="3" class="acc"><path d="M40 210 L80 150 L160 90 L320 30" fill="none"/></g>
<g stroke="none"><circle style="fill: var(--md-default-bg-color)" cx="320" cy="30" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="160" cy="90" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="480" cy="90" r="15"/>
<circle style="fill: var(--md-default-bg-color)" cx="80" cy="150" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="400" cy="150" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="560" cy="150" r="15"/>
<circle style="fill: var(--md-default-bg-color)" cx="40" cy="210" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="120" cy="210" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="280" cy="210" r="15"/>
<circle style="fill: var(--md-default-bg-color)" cx="360" cy="210" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="440" cy="210" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="520" cy="210" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="600" cy="210" r="15"/>
</g>
<g class="soft" stroke="currentColor"><circle cx="320" cy="30" r="15"/><circle cx="160" cy="90" r="15"/><circle cx="480" cy="90" r="15"/>
<circle cx="80" cy="150" r="15"/><circle cx="400" cy="150" r="15"/><circle cx="560" cy="150" r="15"/>
<circle cx="40" cy="210" r="15"/><circle cx="120" cy="210" r="15"/><circle cx="280" cy="210" r="15"/>
<circle cx="360" cy="210" r="15"/><circle cx="440" cy="210" r="15"/><circle cx="520" cy="210" r="15"/><circle cx="600" cy="210" r="15"/>
</g>
<g stroke="none"><circle style="fill: var(--md-default-bg-color)" cx="240" cy="150" r="15"/><circle style="fill: var(--md-default-bg-color)" cx="200" cy="210" r="15"/></g>
<g stroke="currentColor" stroke-dasharray="3 3" fill="none"><circle cx="240" cy="150" r="15"/><circle cx="200" cy="210" r="15"/></g>
<g class="acc-fill" fill-opacity="0.3" stroke="currentColor"><circle cx="120" cy="210" r="15"/><circle cx="280" cy="210" r="15"/><circle cx="480" cy="90" r="15"/></g>
<g text-anchor="middle">
<text x="320" y="34">7</text><text x="160" y="94">3</text><text x="480" y="94">11</text>
<text x="80" y="154">1</text><text x="240" y="154">5</text><text x="400" y="154">9</text><text x="560" y="154">13</text>
<text x="40" y="214">0</text><text x="120" y="214">2</text><text x="200" y="214">4</text><text x="280" y="214">6</text>
<text x="360" y="214">8</text><text x="440" y="214">10</text><text x="520" y="214">12</text><text x="600" y="214">14</text>
<text x="40" y="242">A</text><text x="120" y="242">B</text><text x="200" y="242">C, removed</text><text x="280" y="242">D</text>
<text x="360" y="242">E</text><text x="440" y="242">F</text><text x="520" y="242">G</text><text x="600" y="242">H</text>
</g>
<text x="420" y="30" font-size="12">dashed: blank nodes</text>
<text x="420" y="48" font-size="12" class="acc-fill">shaded: A's three recipients</text>
</svg>
<figcaption>Figure 17.2. Removing C. Every key C knew is blank or replaced, and A's new path secrets go to B, to D's leaf (since node 5 is blank) and to node 11.</figcaption>
</figure>

Blanks are the price of membership changes: a tree with many blanks has
large resolutions, and commits get more expensive until updates fill the
path again. MLS also lets a newly added member's leaf be listed as
**unmerged** at its ancestors until someone commits over them, for the same
reason: the new member does not know those nodes' private keys yet.

## 17.5 Proposals, commits, epochs

*Level: intermediate.*

Everything that changes the group goes through two kinds of message.

- A **proposal** suggests a change: Add (with the new member's
  KeyPackage), Remove (a leaf index), Update (a new leaf key for oneself),
  PreSharedKey, ReInit, and a few more. Anyone can propose; proposals do not
  change the group by themselves.
- A **commit** applies a list of proposals (by reference, or inline) and,
  usually, an UpdatePath with fresh path secrets. It moves the group from
  epoch $e$ to epoch $e + 1$.

Each new member receives a **Welcome** message, encrypted with HPKE to the
**init key** in the KeyPackage it published, which contains the joiner
secret and the group's state (the GroupInfo, signed by the committer). Like
Signal's prekeys, **KeyPackages** let a member add someone who is offline:
each is a signed, one-time bundle of an HPKE init key, a leaf encryption
key, a credential (who this is) and a signature key.

Every member signs its handshake messages with its signature key, so that
commits are attributable within the group; application messages are signed
too, and then encrypted. That costs MLS the deniability that Signal has, and
is one of its design trade-offs: in large groups, being able to tell which
member sent something matters more.

**The key schedule.** Each epoch's secrets come from the previous epoch's
`init_secret`, the commit secret from the UpdatePath (all zeros if the commit
had none) and any pre-shared keys:

$$
\begin{aligned}
\mathit{joiner} = \mathrm{EWL}\bigl(&\mathrm{Extract}(\mathit{init}, \mathit{commit}),\\
&\texttt{"joiner"},\ \mathit{GC}\bigr),\\
\mathit{epoch} = \mathrm{EWL}\bigl(&\mathrm{Extract}(\mathit{joiner}, \mathit{psk}),\\
&\texttt{"epoch"},\ \mathit{GC}\bigr),
\end{aligned}
$$

where EWL is ExpandWithLabel and GC the GroupContext. The
**GroupContext** binds the group ID, epoch number, cipher suite, a hash
of the whole tree and a hash of the transcript of commits. Two members who
disagree about anything, who is in the group, which commits happened, end
up with different secrets and cannot talk, which turns a silent fork into a
visible failure. From the epoch secret, DeriveSecret makes the encryption
secret, the sender-data secret, the exporter secret, the confirmation and
membership keys, the **epoch authenticator** and the next init secret.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="The MLS key schedule: the previous init secret and the commit secret are extracted, expanded with the GroupContext into the joiner secret, combined with the PSK secret, expanded into the epoch secret, which derives the encryption, sender data, exporter, confirmation, membership, authenticator and next init secrets" fill="currentColor" font-size="12.5">
<rect x="20" y="20" width="150" height="34" rx="6" class="soft" stroke="currentColor"/><text x="95" y="42" text-anchor="middle">init_secret (e−1)</text>
<rect x="250" y="20" width="150" height="34" rx="6" class="soft-acc" stroke="currentColor"/><text x="325" y="42" text-anchor="middle">commit_secret</text>
<rect x="135" y="80" width="150" height="34" rx="6" stroke="currentColor" fill="none"/><text x="210" y="102" text-anchor="middle">Extract</text>
<line x1="95" y1="56" x2="180" y2="78" stroke="currentColor"/><line x1="325" y1="56" x2="240" y2="78" stroke="currentColor"/>
<rect x="135" y="140" width="150" height="34" rx="6" class="soft" stroke="currentColor"/><text x="210" y="162" text-anchor="middle">joiner_secret</text>
<line x1="210" y1="116" x2="210" y2="136" stroke="currentColor"/><polygon points="210,138 205,128 215,128"/>
<rect x="440" y="80" width="180" height="94" rx="6" stroke="currentColor" fill="none"/>
<text x="530" y="100" text-anchor="middle" font-weight="bold" font-size="12">GroupContext</text>
<text x="456" y="120" font-size="11.5">group ID, epoch, suite</text>
<text x="456" y="138" font-size="11.5">tree hash (who is in)</text>
<text x="456" y="156" font-size="11.5">transcript hash (history)</text>
<line x1="438" y1="128" x2="290" y2="128" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="438" y1="150" x2="380" y2="150" stroke="currentColor" stroke-dasharray="4 3"/><line x1="380" y1="150" x2="380" y2="218" stroke="currentColor" stroke-dasharray="4 3"/><line x1="380" y1="218" x2="290" y2="218" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="40" y="208" font-size="12">psk_secret →</text>
<rect x="135" y="200" width="150" height="34" rx="6" class="soft-acc" stroke="currentColor"/><text x="210" y="222" text-anchor="middle">epoch_secret</text>
<line x1="210" y1="176" x2="210" y2="196" stroke="currentColor"/><polygon points="210,198 205,188 215,188"/>
<line x1="210" y1="236" x2="210" y2="256" stroke="currentColor"/><polygon points="210,258 205,248 215,248"/>
<rect x="20" y="262" width="600" height="46" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="281" text-anchor="middle" font-size="12">encryption · sender data · exporter · external · confirmation key · membership key</text>
<text x="320" y="299" text-anchor="middle" font-size="12">resumption PSK · epoch authenticator · init_secret for epoch e+1 (all by DeriveSecret)</text>
<text x="300" y="102" font-size="11.5">"joiner"</text>
<text x="300" y="208" font-size="11.5">"epoch"</text>
</svg>
<figcaption>Figure 17.3. One epoch of the MLS key schedule. Only the init secret is carried forward; everything else of the old epoch can be deleted.</figcaption>
</figure>

The **epoch authenticator** is a value all members share and can compare out
of band, like Signal's safety number but for the whole group. Discord's
encrypted calls show it as a 30-digit code, five bytes at a time modulo
100,000, the same rule as Signal's.

### Code it: the key schedule

MLS cipher suite 1 uses X25519, AES-128-GCM, SHA-256 and Ed25519; its key
schedule, RFC 9420 §8, is pure HKDF with SHA-256, every label prefixed with
"MLS 1.0 ". The program runs two epochs of the working group's interop test
vector `key-schedule.json`, which every implementation must reproduce, and
prints each epoch authenticator the way Discord shows it.

```python
# The MLS key schedule (RFC 9420 section 8) for two epochs of the official
# interop test vector key-schedule.json, cipher suite 1 (X25519, AES-128-GCM,
# SHA-256, Ed25519).
import hashlib, hmac
h = bytes.fromhex

def extract(salt, ikm): return hmac.new(salt, ikm, hashlib.sha256).digest()
def vec(b):                                     # variable-length vector, RFC 9420 2.1.2
    return (bytes([len(b)]) if len(b) < 64 else (0x4000 | len(b)).to_bytes(2, "big")) + b
def expand_with_label(secret, label, context=b"", n=32):
    info = n.to_bytes(2, "big") + vec(b"MLS 1.0 " + label) + vec(context)
    return hmac.new(secret, info + b"\x01", hashlib.sha256).digest()[:n]
def derive_secret(secret, label): return expand_with_label(secret, label)

def group_context(group_id, epoch, tree_hash, transcript):
    return (h("0001" "0001") + vec(group_id) + epoch.to_bytes(8, "big")
            + vec(tree_hash) + vec(transcript) + vec(b""))      # mls10, suite 1, no extensions

def key_schedule(init_secret, commit_secret, psk_secret, ctx):
    joiner = expand_with_label(extract(init_secret, commit_secret), b"joiner", ctx)
    member = extract(joiner, psk_secret)
    epoch = expand_with_label(member, b"epoch", ctx)
    out = {"joiner_secret": joiner, "welcome_secret": derive_secret(member, b"welcome")}
    for name, label in [("sender_data_secret", b"sender data"), ("encryption_secret", b"encryption"),
                        ("exporter_secret", b"exporter"), ("confirmation_key", b"confirm"),
                        ("membership_key", b"membership"), ("resumption_psk", b"resumption"),
                        ("epoch_authenticator", b"authentication"), ("init_secret", b"init")]:
        out[name] = derive_secret(epoch, label)
    return out

group_id = h("a897b53575b4dd35fed4466e4e714bfa949eaa72e616a9c68a47b39cb7a60d2e")
init = h("a897b53575b4dd35fed4466e4e714bfa949eaa72e616a9c68a47b39cb7a60d2e")   # initial_init_secret
epochs = [  # from the vector: what the group agreed on (commit, PSKs, tree and transcript hashes)
    {"commit": "a22606222e350fd7f0937168fe7548fb06626ab143cba7611d641693b1447509",
     "psk": "e871b247379522395689182736cb3d1e7b108d6ae934b802223975de8dc3f80b",
     "tree": "9769e302a99c457350a8e636009b12a2fee068664004606d6318eb3a1977d818",
     "transcript": "5e57c9364dc71f0f71b19ffe561ab77257c490708a47e29f8f73f2b318201d2f",
     "expect": {"joiner_secret": "4fb996ba", "encryption_secret": "01588615", "init_secret": "505be2ce",
                "epoch_authenticator": "7375d449", "membership_key": "970744ba"}},
    {"commit": "7b3027aa5d2224aab7e2a18660bbf57930e2e21d95e02b849c704d970e3e28c5",
     "psk": "ca7a68f2a8a52147d70f1eb7195de968d2e182b93596bc5a61393861e91180e4",
     "tree": "826a4d3b0956277ce5e272e4d18fdca023ffb63ea4cea636e34cc837ae7c5c5d",
     "transcript": "14a2985ea47db0685924a74d47ac8a08ec241f843b536dd1348e3ffb2d78184e",
     "expect": {"joiner_secret": "7ba2c5ee", "encryption_secret": "c607312f", "init_secret": "88586b22",
                "epoch_authenticator": "4bdbe624", "membership_key": "1eb0202e"}}]

for n, e in enumerate(epochs):
    ctx = group_context(group_id, n, h(e["tree"]), h(e["transcript"]))
    s = key_schedule(init, h(e["commit"]), h(e["psk"]), ctx)
    ok = all(s[k].hex().startswith(v) for k, v in e["expect"].items())
    auth = s["epoch_authenticator"]
    code = " ".join(f"{int.from_bytes(auth[i:i + 5], 'big') % 100000:05}" for i in range(0, 30, 5))
    print(f"epoch {n}: encryption_secret {s['encryption_secret'].hex()[:16]}...  matches vector: {ok}")
    print(f"         epoch_authenticator as a 30-digit code: {code}")
    init = s["init_secret"]                      # the only secret carried to the next epoch
```

```text
epoch 0: encryption_secret 01588615c93d02c8...  matches vector: True
         epoch_authenticator as a 30-digit code: 85837 52705 75734 54030 30527 66754
epoch 1: encryption_secret c607312fab6423cd...  matches vector: True
         epoch_authenticator as a 30-digit code: 40002 40789 44507 61941 02549 54039
```

**Per-message keys.** The encryption secret is split down a second tree of
the same shape, the **secret tree**, giving each member a leaf secret, from
which two hash ratchets run, one for handshake messages and one for
application messages. Message $j$ from member $i$ uses the $j$-th key of
member $i$'s chain, and keys are deleted after use. The sender's leaf index
and generation are themselves encrypted, under a key from the sender-data
secret, so the server cannot see who in the group sent a message. Section
17.6 works the secret tree through, and §17.7 opens a real message.

## 17.6 From epoch secret to message keys

*Level: intermediate.*

An MLS group keeps two trees of the same shape, and secrets move through them
in opposite directions. In the ratchet tree of §17.4 secrets move **up**, from
a committer's leaf to the commit secret. In the **secret tree** they move
**down**: the epoch's encryption secret splits, level by level, into one
secret per leaf, from which each member's sending keys grow. The first tree
makes the group agree on one secret; the second gives every sender its own
keys, so that no two members ever encrypt under the same key and nonce.

### TreeKEM by hand on four members

Take four members A, B, C and D at nodes 0, 2, 4 and 6, with parent 1 over
A and B, parent 5 over C and D, and the root 3, every node holding a key.
D commits. It draws a random 32-byte path secret $\mathit{ps}_0$ for its own
leaf and hashes upward:
$\mathit{ps}_1 = \mathrm{DeriveSecret}(\mathit{ps}_0, \texttt{"path"})$
belongs to node 5,
$\mathit{ps}_2 = \mathrm{DeriveSecret}(\mathit{ps}_1, \texttt{"path"})$
to the root, and one more hash gives the commit secret. Each node's new key pair is derived from
$\mathrm{DeriveSecret}(\mathit{ps}, \texttt{"node"})$, so D publishes three
new public keys, for nodes 6, 5 and 3.

D's copath is node 4 (C) and node 1 (A and B), so the commit carries two
HPKE ciphertexts: $\mathit{ps}_1$ to C's leaf key, $\mathit{ps}_2$ to node
1's key. C opens the first and hashes twice; A and B, who both hold node 1's
private key, open the second and hash once. With X25519 a ciphertext is 32
bytes of KEM output, the 32-byte path secret and a 16-byte tag, 80 bytes, so
the commit's key material is $3 \times 32 + 2 \times 80 = 256$ bytes. A and
B never see $\mathit{ps}_1$, since DeriveSecret runs only one way: a thief
who later takes A's phone learns nothing of C and D's half of the tree.

<figure class="mars-fig">
<svg viewBox="0 0 640 344" width="640" role="img" aria-label="A ratchet tree for four members A to D. D commits: a random path secret ps0 at D's leaf hashes up to ps1 at node 5, ps2 at the root, node 3, and then to the commit secret. ps1 is encrypted to C's leaf key and ps2 to node 1, whose key A and B both hold" fill="currentColor" font-size="12.5">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<path d="M320 94 L180 136 M320 94 L460 136 M180 164 L110 216 M180 164 L250 216 M460 164 L390 216"/>
</g>
<path d="M530 216 L460 164 M460 136 L320 94" stroke="currentColor" stroke-width="3" fill="none"/>
<path d="M320 66 L320 44" stroke="currentColor" stroke-width="3" fill="none"/>
<polygon points="320,38 315,48 325,48"/>
<g stroke="currentColor" fill="none">
<rect x="300" y="66" width="40" height="28" rx="5"/><rect x="440" y="136" width="40" height="28" rx="5"/><rect x="510" y="216" width="40" height="28" rx="5"/><rect x="90" y="216" width="40" height="28" rx="5"/><rect x="230" y="216" width="40" height="28" rx="5"/>
</g>
<g stroke="currentColor" fill-opacity=".2">
<rect x="160" y="136" width="40" height="28" rx="5"/><rect x="370" y="216" width="40" height="28" rx="5"/>
</g>
<g text-anchor="middle">
<text x="320" y="85">3</text><text x="180" y="155">1</text><text x="460" y="155">5</text>
<text x="110" y="235">0</text><text x="250" y="235">2</text><text x="390" y="235">4</text><text x="530" y="235">6</text>
<text x="110" y="262">A</text><text x="250" y="262">B</text><text x="390" y="262">C</text><text x="530" y="262">D</text>
<text x="320" y="30">commit_secret = DS(ps2, "path")</text>
</g>
<text x="350" y="78">ps2 = DS(ps1, "path")</text>
<text x="490" y="146">ps1 = DS(ps0, "path")</text>
<text x="560" y="228">ps0:</text><text x="560" y="244">random</text>
<text x="40" y="128" font-size="12">HPKE(ps2) to node 1:</text><text x="40" y="144" font-size="12">A and B open it</text>
<text x="300" y="196" font-size="12">HPKE(ps1) to C</text>
<text x="20" y="292" font-size="12" fill-opacity=".7">DS is DeriveSecret. Each node's key pair is DeriveKeyPair(DS(ps, "node")).</text>
<text x="20" y="310" font-size="12" fill-opacity=".7">C hashes ps1 up to ps2 and the commit secret; A and B start from ps2.</text>
<text x="20" y="328" font-size="12" fill-opacity=".7">No one can hash down: A and B never learn ps1 or ps0.</text>
</svg>
<figcaption>Figure 17.4. Path secrets in a group of four. D's commit hashes a random leaf secret up its path; two ciphertexts, one per copath subtree, let everyone else join the chain at the lowest point they share with D.</figcaption>
</figure>

### The secret tree

After the key schedule every member holds the epoch's encryption secret.
RFC 9420 §9 puts it at the root of a tree with the same shape as the
ratchet tree and splits each node into two children with ExpandWithLabel
(EWL):

$$
\begin{aligned}
\mathit{left} &= \mathrm{EWL}(\mathit{node}, \texttt{"tree"}, \texttt{"left"}),\\
\mathit{right} &= \mathrm{EWL}(\mathit{node}, \texttt{"tree"}, \texttt{"right"}).
\end{aligned}
$$

Each leaf secret starts two hash ratchets, one labeled "handshake" for
proposals and commits sent encrypted, one labeled "application" for
everything else. Generation $j$ of a ratchet, with $j$ written as a 4-byte
integer, gives a key, a nonce and the next ratchet secret:

$$
\begin{aligned}
\mathit{key}_j &= \mathrm{EWL}(s_j, \texttt{"key"}, j, N_k),\\
\mathit{nonce}_j &= \mathrm{EWL}(s_j, \texttt{"nonce"}, j, N_n),\\
s_{j+1} &= \mathrm{EWL}(s_j, \texttt{"secret"}, j, N_h).
\end{aligned}
$$

Deletion gives forward secrecy inside an epoch: a node's secret goes as soon
as both children exist, a ratchet secret once the next one does, a key once
its message is read. A member who receives B's message 5 before message 3
derives keys 3 and 4 on the way and keeps them for a while; RFC 9420 leaves
that window to the application, and every key kept is one a thief could use.
Why not one key for the whole group? An AEAD nonce must never repeat under
one key, and $n$ members cannot share a counter without talking first. Per
sender chains remove the need, and cost a receiver only the $\log_2 n$ nodes
between the root and the sender's leaf.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The secret tree for four members: the epoch's encryption secret at the root splits by ExpandWithLabel tree left and right into node 1 and node 5, then into one leaf secret per member, each of which starts an application ratchet whose generation 0 and 1 keys are shown" fill="currentColor" font-size="12">
<g stroke="currentColor" fill="none">
<rect x="225" y="20" width="190" height="30" rx="5"/>
<rect x="105" y="90" width="150" height="30" rx="5"/><rect x="385" y="90" width="150" height="30" rx="5"/>
<rect x="22" y="160" width="136" height="30" rx="5"/><rect x="177" y="160" width="136" height="30" rx="5"/><rect x="327" y="160" width="136" height="30" rx="5"/><rect x="482" y="160" width="136" height="30" rx="5"/>
<path d="M290 50 L190 90 M350 50 L450 90 M150 120 L90 160 M210 120 L245 160 M430 120 L395 160 M490 120 L550 160"/>
<path d="M90 190 L90 214 M245 190 L245 214 M395 190 L395 214 M550 190 L550 214" stroke-dasharray="3 3"/>
</g>
<g text-anchor="middle">
<text x="320" y="40">root (node 3): 5db6ecab…</text>
<text x="180" y="110">node 1: 785b1db0…</text><text x="460" y="110">node 5: 8db3e545…</text>
<text x="90" y="180">A, node 0: 737ca97d</text><text x="245" y="180">B, node 2: 4e6dbf6d</text><text x="395" y="180">C, node 4: eda9adc9</text><text x="550" y="180">D, node 6: 42ed37e5</text>
<text x="90" y="230">key 0: aadf9572</text><text x="90" y="248">key 1: bb67ebbc</text>
<text x="245" y="230">key 0: 7c6d1142</text><text x="245" y="248">key 1: a681786d</text>
<text x="395" y="230">key 0: a7615491</text><text x="395" y="248">key 1: fe852d01</text>
<text x="550" y="230">key 0: c992577d</text><text x="550" y="248">key 1: 3426a8d7</text>
</g>
<text x="205" y="72" font-size="11" fill-opacity=".7">"tree", "left"</text><text x="380" y="72" font-size="11" fill-opacity=".7">"tree", "right"</text>
<text x="20" y="284" fill-opacity=".7">Secrets flow down: each parent is deleted once its two children exist. Under each leaf an</text>
<text x="20" y="302" fill-opacity=".7">"application" ratchet (and a "handshake" one, not shown) gives one key and nonce per generation;</text>
<text x="20" y="320" fill-opacity=".7">the encryption secret here is SHA-256("Arcadia epoch 9"), as in the program below.</text>
</svg>
<figcaption>Figure 17.5. The secret tree of a four-member epoch, with real values from the program below (first four bytes of each). The same epoch gives each member a different chain of keys.</figcaption>
</figure>

### Code it: the secret tree

The program builds the secret tree, checks it against the working group's
`secret-tree.json` vector for eight members in cipher suite 1 (AES-128-GCM,
so keys are 16 bytes; they are HKDF outputs, so no AES is needed to check
them), and then prints the four-member tree of Figure 17.5.

```python
# The secret tree and its hash ratchets (RFC 9420 section 9), checked against
# the interop vector secret-tree.json (8 leaves, suite 1), then worked for 4.
# Uses expand_with_label from the key-schedule listing above.
def tree_secrets(encryption_secret, n):         # node index -> secret; leaf i is node 2i
    root = (1 << (2 * n - 1).bit_length() - 1) - 1
    out, todo = {root: encryption_secret}, [root]
    while todo:
        x = todo.pop()
        k = (x ^ (x + 1)).bit_length() - 1     # level = trailing 1 bits
        if k == 0: continue
        for child, side in ((x - (1 << k - 1), b"left"), (x + (1 << k - 1), b"right")):
            if child < 2 * n - 1:
                out[child] = expand_with_label(out[x], b"tree", side)
                todo.append(child)
        del out[x]                              # a used parent secret is deleted at once
    return out

def ratchet(leaf_secret, kind, generation, nk=16):   # kind: b"application" or b"handshake"
    s = expand_with_label(leaf_secret, kind)
    for j in range(generation):                 # each step deletes the one before
        s = expand_with_label(s, b"secret", j.to_bytes(4, "big"))
    g = generation.to_bytes(4, "big")
    return expand_with_label(s, b"key", g, nk), expand_with_label(s, b"nonce", g, 12)

enc = h("9d4ecb550dc4fbcbaae66d120a2215cbeca20d45d66791df5b4349eace30fd3f")
expect = {0: ("dd3fbd3f", "3eddbdfc"), 3: ("95378bea", "fd92f221"), 7: ("a5c06098", "d8280394")}
leaves = tree_secrets(enc, 8)
for i, (k0, k15) in expect.items():
    a0, a15 = ratchet(leaves[2 * i], b"application", 0), ratchet(leaves[2 * i], b"application", 15)
    print(f"leaf {i}: app key gen 0 {a0[0].hex()[:8]} gen 15 {a15[0].hex()[:8]}  matches vector:",
          a0[0].hex().startswith(k0) and a15[0].hex().startswith(k15))
print("handshake nonce, leaf 0, gen 0 matches:", ratchet(leaves[0], b"handshake", 0)[1].hex() == "18f6c449223678070da1a24b")

print("A group of four, encryption_secret = SHA-256('Arcadia epoch 9'):")
enc4 = hashlib.sha256(b"Arcadia epoch 9").digest()
t = tree_secrets(enc4, 4)
for i, m in enumerate("ABCD"):
    k0, n0 = ratchet(t[2 * i], b"application", 0)
    k1, _ = ratchet(t[2 * i], b"application", 1)
    print(f"  {m} leaf node {2 * i}: secret {t[2 * i].hex()[:8]}  key0 {k0.hex()[:8]}  key1 {k1.hex()[:8]}  nonce0 {n0.hex()[:8]}")
```

It prints:

```text
         epoch_authenticator as a 30-digit code: 40002 40789 44507 61941 02549 54039
leaf 0: app key gen 0 dd3fbd3f gen 15 3eddbdfc  matches vector: True
leaf 3: app key gen 0 95378bea gen 15 fd92f221  matches vector: True
leaf 7: app key gen 0 a5c06098 gen 15 d8280394  matches vector: True
handshake nonce, leaf 0, gen 0 matches: True
A group of four, encryption_secret = SHA-256('Arcadia epoch 9'):
  A leaf node 0: secret 737ca97d  key0 aadf9572  key1 bb67ebbc  nonce0 ff679d86
  B leaf node 2: secret 4e6dbf6d  key0 7c6d1142  key1 a681786d  nonce0 7f62b1c8
  C leaf node 4: secret eda9adc9  key0 a7615491  key1 fe852d01  nonce0 c80296c6
  D leaf node 6: secret 42ed37e5  key0 c992577d  key1 3426a8d7  nonce0 58deded5
```

The generation-15 keys show the ratchet at work: the program hashes fifteen
times down each chain and lands on the same bytes as every implementation
that passed the interop tests.

## 17.7 Messages on the wire

*Level: intermediate.*

Keys are half of protecting a message; the other half is the framing around
the ciphertext. Every message, handshake or application, starts as a **FramedContent**: group ID,
epoch, sender, an `authenticated_data` field the application may fill, a
content type, and the body. The sender signs it, together with the
GroupContext, with the signature key in its leaf. Then it goes out in one of
two wrappers.

**PublicMessage** leaves the content readable and adds a **membership tag**:
an HMAC under the epoch's membership key over the content, the GroupContext
and the signature. The signature says which credential sent the message; the
tag says the sender knew this epoch's secrets. A member removed in the last
commit still has a valid signature key, but not the new membership key, so
the tag stops it from slipping a proposal into the new epoch. A server that
sees a PublicMessage commit can check it and refuse a malformed one before it
forks the group; the price is that the server sees who is added and removed.
Only handshake messages may travel this way: RFC 9420 forbids application
data in a PublicMessage. Senders outside the group (§17.8) send
PublicMessages without a tag, since they hold no epoch secret.

**PrivateMessage** seals the content and its signature with the AEAD, under
the key and nonce of the sender's ratchet at the current generation, after
XORing a random 4-byte **reuse guard** into the nonce's first four bytes.
The additional data is the clear header: group ID, epoch, content type and
`authenticated_data`, so a ciphertext copied to another group or epoch fails.

A receiver needs the sender and generation to pick the key; the server
should learn neither. So leaf index, generation and reuse guard travel in a
second, 12-byte AEAD box, the **sender data**, keyed from the epoch's
sender-data secret $\mathit{sds}$ and the first 32 bytes of the message's
own ciphertext:

$$
\mathit{key}_{sd} = \mathrm{EWL}(\mathit{sds}, \texttt{"key"}, \mathit{ct}[0{:}32]).
$$

Each message gets a fresh sender-data key with no counter, the trick QUIC
uses for [header protection](05-TLS-in-Practice.md#header-protection). The
server learns group, epoch, type and size, not which member wrote it.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="Two MLS message formats side by side. PublicMessage: a clear header, the framed content in the clear, a signature and a membership tag. PrivateMessage: a clear header with group, epoch, content type and authenticated data; encrypted sender data holding leaf index, generation and reuse guard; and an AEAD ciphertext holding the content, signature and padding" fill="currentColor" font-size="12">
<text x="160" y="22" text-anchor="middle" font-weight="bold">PublicMessage</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">PrivateMessage</text>
<text x="160" y="40" text-anchor="middle" fill-opacity=".7">handshake only (proposals, commits)</text>
<text x="480" y="40" text-anchor="middle" fill-opacity=".7">every application message</text>
<g stroke="currentColor" fill="none">
<rect x="20" y="54" width="280" height="30" rx="4"/><rect x="20" y="88" width="280" height="84" rx="4"/>
<rect x="20" y="176" width="280" height="40" rx="4"/><rect x="20" y="220" width="280" height="56" rx="4"/>
<rect x="340" y="54" width="280" height="30" rx="4"/><rect x="340" y="88" width="280" height="56" rx="4"/>
</g>
<g stroke="currentColor" fill-opacity=".15">
<rect x="340" y="148" width="280" height="62" rx="4"/><rect x="340" y="214" width="280" height="84" rx="4"/>
</g>
<text x="30" y="74">version 1, wire format 1</text>
<text x="30" y="106">FramedContent, in the clear:</text>
<text x="30" y="124">group_id, epoch, sender (leaf 1),</text>
<text x="30" y="142">authenticated_data, content type,</text>
<text x="30" y="160">body: the proposal or commit</text>
<text x="30" y="194">signature: Ed25519 over the content</text>
<text x="30" y="209" fill-opacity=".7">and the GroupContext (who sent it)</text>
<text x="30" y="238">membership tag: HMAC(membership_key,</text>
<text x="30" y="254">content + GroupContext + signature)</text>
<text x="30" y="270" fill-opacity=".7">(proves a member of this epoch sent it)</text>
<text x="350" y="74" font-size="11.5">version 1, wire format 2</text>
<text x="350" y="106" font-size="11.5">clear header, the AAD of both seals:</text>
<text x="350" y="124" font-size="11.5">group_id, epoch, content type,</text>
<text x="350" y="140" font-size="11.5">authenticated_data</text>
<text x="350" y="166" font-size="11.5">sender data: leaf, generation, reuse guard</text>
<text x="350" y="184" font-size="11.5" fill-opacity=".7">key and nonce from sender_data_secret</text>
<text x="350" y="200" font-size="11.5" fill-opacity=".7">and the first 32 bytes of the ciphertext</text>
<text x="350" y="232" font-size="11.5">ciphertext (AEAD):</text>
<text x="350" y="250" font-size="11.5">body + signature + zero padding</text>
<text x="350" y="268" font-size="11.5" fill-opacity=".7">key and nonce from the secret tree:</text>
<text x="350" y="284" font-size="11.5" fill-opacity=".7">leaf's ratchet at that generation</text>
<text x="20" y="318" fill-opacity=".7">Shaded: encrypted. The Delivery Service reads all of a PublicMessage and can check commits;</text>
<text x="20" y="336" fill-opacity=".7">of a PrivateMessage it sees only the group, the epoch, the type and the length.</text>
</svg>
<figcaption>Figure 17.6. The two wrappers. A PublicMessage protects integrity twice, by signature and membership tag; a PrivateMessage hides the content and, in a separate small box, who sent it.</figcaption>
</figure>

### A PrivateMessage read by hand

The working group's `message-protection.json` vector for cipher suite 3
holds an application message of 203 bytes. Its header reads, in hex:

```text
00 01 | 00 02 | 20 fd ba da 2d ... (32 bytes) | 00 00 00 00 00 12 12 12 | 01 | 00 | 1c 22 d2 86 ...
```

Take the fields in order. `00 01` is the protocol version, mls10. `00 02` is
the wire format, mls_private_message. MLS writes the length of each
variable-length field in a prefix whose top two bits say how long the prefix
is: `0x20` is binary 00100000, a 1-byte prefix with value 32, so a 32-byte
group ID follows. The next eight bytes are the epoch:
$\mathtt{0x121212} = 18 \cdot 65{,}536 + 18 \cdot 256 + 18 = 1{,}184{,}274$.
`01` is the content type, application. `00` is an empty `authenticated_data`. Then `0x1c` = 28 bytes of
sender data: 12 bytes of plaintext (leaf, generation, reuse guard, 4 bytes
each) and a 16-byte Poly1305 tag. Last comes the ciphertext with the prefix
`40 7d`: top bits 01 mean a 2-byte prefix, value $\mathtt{0x007d} = 125$. Add
it up: $4 + 33 + 8 + 1 + 1 + 29 + 2 + 125 = 203$ bytes. Inside the 125 bytes
the program below finds 1 + 42 bytes of application data, 2 + 64 bytes of
Ed25519 signature, no padding and the 16-byte tag, again exactly 125.

### Code it: opening a PrivateMessage

The program does what a receiving member does. It first checks the
membership tag on a PublicMessage from the same vector (a Remove proposal for
leaf 2), then opens the PrivateMessage: header, sender data, the key from the
secret tree, the content. Cipher suite 3 uses ChaCha20-Poly1305, which the
HPKE listing of §17.3 wrote out from RFC 8439; it is repeated here in compact
form so that this listing needs only the key-schedule and secret-tree ones.

```python
# Message framing (RFC 9420 section 6): check a PublicMessage's membership tag
# and open a PrivateMessage, on the interop vector message-protection.json,
# cipher suite 3 (ChaCha20-Poly1305). Uses expand_with_label, vec, tree_secrets
# and ratchet from the listings above; ChaCha20-Poly1305 is written out again
# (RFC 8439) so that this listing does not depend on the HPKE one.
import struct
def chacha_block(key, ctr, nonce):
    s = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574, *struct.unpack("<8I", key), ctr, *struct.unpack("<3I", nonce)]
    x = s[:]
    def qr(a, b, c, d):
        for p, q, r, n in ((a, b, d, 16), (c, d, b, 12), (a, b, d, 8), (c, d, b, 7)):
            x[p] = (x[p] + x[q]) & 0xffffffff; x[r] ^= x[p]; x[r] = ((x[r] << n) | (x[r] >> 32 - n)) & 0xffffffff
    for _ in range(10):
        for a, b, c, d in ((0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15),
                           (0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14)): qr(a, b, c, d)
    return struct.pack("<16I", *[(u + v) & 0xffffffff for u, v in zip(x, s)])
def aead_open(key, nonce, aad, data):         # ChaCha20-Poly1305, None if the tag is wrong
    ct, tag, pad = data[:-16], data[-16:], lambda b: b + bytes(-len(b) % 16)
    r = int.from_bytes(chacha_block(key, 0, nonce)[:16], "little") & 0x0ffffffc0ffffffc0ffffffc0fffffff
    m, acc = pad(aad) + pad(ct) + struct.pack("<QQ", len(aad), len(ct)), 0
    for i in range(0, len(m), 16):
        acc = (acc + int.from_bytes(m[i:i + 16] + b"\x01", "little")) * r % (2**130 - 5)
    s = int.from_bytes(chacha_block(key, 0, nonce)[16:32], "little")
    if not hmac.compare_digest(((acc + s) % 2**128).to_bytes(16, "little"), tag): return None
    stream = b"".join(chacha_block(key, 1 + i, nonce) for i in range(len(ct) // 64 + 1))
    return bytes(a ^ b for a, b in zip(ct, stream))

def read_vec(b, i):                             # variable-length vector: 1, 2 or 4 length bytes
    n = 1 << (b[i] >> 6)
    ln = int.from_bytes(b[i:i + n], "big") & ((1 << 8 * n - 2) - 1)
    return b[i + n:i + n + ln], i + n + ln

V = {"group_id": "fdbada2ddce02e7493673caab793308bdeb5cdb0558f151f647ab6e2ca0c63cf", "epoch": 1184274,
     "tree_hash": "5ae6ee5f282786b753d55f15938248f6212c69b2f677319e5fcdb2ce0bfbf48a",
     "transcript": "0ba35f0d36007bc44df41db074b9d98a1314e3c690cb345ceeae152fbe5b6afe",
     "encryption_secret": "ce02c4dd80a8ed57503e3a50ec11b926a549d65e840417c0635427a838b3cf29",
     "sender_data_secret": "85fc31fac878dbe2850e30a8fa88bdc63dacd890756aade03433791b50a510f5",
     "membership_key": "82f73c829938c5d1a19e19de2b2c109214455ee6671cf918af426f364162678e",
     "proposal_pub": "0001000120fdbada2ddce02e7493673caab793308bdeb5cdb0558f151f647ab6e2ca0c63cf0000000000121212"
        "0100000001000200030000000240402aef68e55e2092800105a0a963c84afb2039093f5431f9c59fce19d3f2bca2"
        "0689a617deb8fa59085f21b609649b0373e62c0c099e9bfc66f939e623a851d3022048451581d2796c68ca95ddbf"
        "06fe4cc69f5b1360f12dce5947e095ab26c259a3",
     "application_priv": "0001000220fdbada2ddce02e7493673caab793308bdeb5cdb0558f151f647ab6e2ca0c63cf000000"
        "000012121201001c22d286c12043af1e8093bd213bf707b9b675ee98a171d0eeb206de91407d9d099e17b2aa1de3"
        "7065098feb8efa598721128ec5bada3a6a07e06123eb61ced1dd265a0e7468f05f39b549ede80606f4795425de91"
        "acaee0b0bd840d0eabd284ae30adf04a5bf97027180836adee1203636c2cfd36f477747e9f0549dc99f5b3ef3a3d"
        "b4f4def426625757365cf871061383a6dbd516127a11f83cc4"}
gid, epoch = h(V["group_id"]), V["epoch"].to_bytes(8, "big")
ctx = h("0001" "0003") + vec(gid) + epoch + vec(h(V["tree_hash"])) + vec(h(V["transcript"])) + vec(b"")

# 1. PublicMessage: the body is in the clear; the membership tag is an HMAC over
#    the framed content, the GroupContext and the signature.
pub = h(V["proposal_pub"])
tag_vec_at = len(pub) - 33                      # the tag is the last field: 0x20 + 32 bytes
content_and_sig, tag = pub[4:tag_vec_at], pub[tag_vec_at + 1:]
tbm = pub[:4] + content_and_sig[:-66] + ctx + content_and_sig[-66:]   # signature<V> is 66 bytes
print("PublicMessage body (a Remove proposal):", content_and_sig[48:54].hex())
print("membership tag matches:", hmac.new(h(V["membership_key"]), tbm, hashlib.sha256).digest() == tag)

# 2. PrivateMessage: parse the header, which is all the server sees.
msg = h(V["application_priv"])
assert msg[2:4] == b"\x00\x02"                  # wire format 2 = mls_private_message
g, i = read_vec(msg, 4)
ep, ctype, i = msg[i:i + 8], msg[i + 8], i + 9
ad, i = read_vec(msg, i)
enc_sender, i = read_vec(msg, i)
ciphertext, i = read_vec(msg, i)
print(f"header: epoch {int.from_bytes(ep, 'big')}, content type {ctype} (application), "
      f"sender data {len(enc_sender)} bytes, ciphertext {len(ciphertext)} bytes")

# 3. Sender data: keyed by the sender-data secret and the first 32 bytes of the ciphertext.
sample, sds = ciphertext[:32], h(V["sender_data_secret"])
sd_key, sd_nonce = expand_with_label(sds, b"key", sample), expand_with_label(sds, b"nonce", sample, 12)
sd = aead_open(sd_key, sd_nonce, vec(g) + ep + bytes([ctype]), enc_sender)
leaf, gen, guard = int.from_bytes(sd[:4], "big"), int.from_bytes(sd[4:8], "big"), sd[8:]
print(f"sender data: leaf {leaf}, generation {gen}, reuse guard {guard.hex()}")

# 4. Content: key and nonce from the sender's application ratchet in a 2-leaf secret tree.
key, nonce = ratchet(tree_secrets(h(V["encryption_secret"]), 2)[2 * leaf], b"application", gen, 32)
nonce = bytes(a ^ b for a, b in zip(guard, nonce[:4])) + nonce[4:]
aad = vec(g) + ep + bytes([ctype]) + vec(ad)
pt = aead_open(key, nonce, aad, ciphertext)
app, j = read_vec(pt, 0)
sig, j = read_vec(pt, j)
print("application data:", app.hex()[:24] + "...", len(app), "bytes; signature", len(sig), "bytes; padding", len(pt) - j)
print("matches the vector:", app.hex() == "725b6517ff1e5ed74224de23777a9b5f4a2dd74fe4a816d19ea71baa069d74c0975b7f10e61b7c3ef339")

# 5. Tamper: change the epoch in the header, or one ciphertext bit.
print("epoch changed in the header ->", aead_open(key, nonce, vec(g) + (epoch[:7] + b"\x13") + bytes([ctype]) + vec(ad), ciphertext))
print("one ciphertext bit flipped   ->", aead_open(key, nonce, aad, bytes([ciphertext[0] ^ 1]) + ciphertext[1:]))
```

It prints:

```text
  D leaf node 6: secret 42ed37e5  key0 c992577d  key1 3426a8d7  nonce0 58deded5
PublicMessage body (a Remove proposal): 000300000002
membership tag matches: True
header: epoch 1184274, content type 1 (application), sender data 28 bytes, ciphertext 125 bytes
sender data: leaf 1, generation 0, reuse guard 5ce4b461
application data: 725b6517ff1e5ed74224de23... 42 bytes; signature 64 bytes; padding 0
matches the vector: True
epoch changed in the header -> None
one ciphertext bit flipped   -> None
```

### Break it: what the layers do not stop

The last two lines show the AEAD at work: a message moved to another epoch,
or altered by one bit, does not open. What the AEAD cannot say is *which
member* sealed it. Every member knows the encryption secret, hence every
member's ratchet keys. If Mallory, a member, encrypts under Alice's chain and
writes Alice's leaf index into the sender data, every phone decrypts it. Only
the signature inside, made with Alice's key, stops her. That is why MLS
cannot simply drop signatures to regain Signal's deniability (§17.5).

Replays fail for free: a receiver deletes a generation's key once it has
opened that message, so a copy replayed by the server finds no key. The
reuse guard covers a sender that repeats a generation after a restore from
backup, but only as well as its random numbers; the safer rule is never to
restore ratchet state at all, and to rejoin instead (§17.8).

## 17.8 Joining from outside: external commits and pre-shared keys

*Level: intermediate.*

So far the group changed only from the inside: a member committed an Add
and sent the newcomer a Welcome. That needs a member online and willing. A
public channel wants people to join without asking anyone; a phone that lost
its MLS state needs a way back in; a long-lived group must move to a new
cipher suite; a few members want a side group provably tied to the main one.
MLS has two tools for these jobs: **external commits** and **pre-shared
keys**.

### External commits

Each epoch derives an `external_secret`, and from it an HPKE key pair
(`external_priv`, `external_pub`) that every member can compute and no
outsider can. A member publishes a **GroupInfo**: the GroupContext, the
confirmation tag and `external_pub`, signed with its signature key. A joiner
fetches the GroupInfo and the public ratchet tree, and then:

<div class="mars-steps" markdown>

1. checks the signature, and the tree against the GroupContext's tree hash;
2. runs HPKE to `external_pub` and exports "MLS 1.0 external init secret"
   from the HPKE context as its init secret;
3. builds a commit with exactly one **ExternalInit** proposal carrying the
   KEM output, optionally a Remove of its own old leaf and PreSharedKey
   proposals, all inline, never by reference;
4. takes a free leaf and adds a full UpdatePath, so the commit secret is
   fresh;
5. signs it and sends it as a PublicMessage from sender type
   `new_member_commit`, with no membership tag.

</div>

Members decapsulate with `external_priv`, get the same init secret, and run
the key schedule with it in place of the one carried from the previous
epoch. The joiner never sees the old init secret, and must not: it would
open the epoch before it arrived. No member needs to be online first.

Anyone holding the GroupInfo can build an external commit, so access control
lives in who may fetch it, in the Authentication Service's check of the
credential and in the Delivery Service's right to refuse the commit. A phone
that lost its state uses the same path: it joins at a new leaf and removes
its own old leaf in the same commit, which RFC 9420 allows only when the new
credential is acceptable as the same participant.

There is a price, made precise by the analysis in §17.9. An attacker who
stole a member's state, signature key included, can wait for the group to
heal and then "resync" as that member by external commit, removing the real
leaf. Healing assumes the signature key was not stolen, or was replaced.

### Pre-shared keys

A PreSharedKey proposal feeds a secret from outside the tree into the
`psk_secret` input of Figure 17.3. An **external** PSK is shared by other
means and named by an ID, for instance a post-quantum secret agreed
separately. A **resumption** PSK is the `resumption_psk` of an earlier epoch
of this group or another, named by usage, group ID and epoch. Each carries a
fresh nonce, and several are folded in one at a time:

$$
\begin{aligned}
x_i &= \mathrm{Extract}(0, \mathit{psk}_i),\\
\mathit{in}_i &= \mathrm{EWL}(x_i, \texttt{"derived psk"}, \mathit{label}_i),\\
s_{i+1} &= \mathrm{Extract}(\mathit{in}_i, s_i),
\end{aligned}
$$

where $s_0$ is 32 zero bytes, the last $s$ is the psk_secret, and
$\mathit{label}_i$ (a PSKLabel) binds the PSK's ID, its position $i$ and the
total count. The same PSKs in another order give
another secret, and no PSK can be moved to a different slot.

The usage field says what a resumption PSK is for:

- **application** (1): the application's own purposes.
- **reinit** (2): a group's version and cipher suite are fixed for life. To
  change them, a member commits a **ReInit** proposal naming the new group
  ID, version and suite, which freezes the old group. The new group's first
  commit includes a resumption PSK from the old group's last epoch, which
  only its members can compute, so the new group provably continues the old.
  This is how a group moves to a post-quantum suite (§17.11).
- **branch** (3): some members start a new group with a resumption PSK from
  the parent's current epoch, proving they were in the parent at that
  moment. Arcadia City's Mars-only side channel is a branch of the mission
  group.

### Code it: the PSK secret

The program folds PSKs into a secret and checks the result against the
working group's `psk_secret.json` vector for three external PSKs, then builds
the resumption PSK ID for a branch from epoch 1 of the group whose key
schedule you computed in §17.5.

```python
# The PSK secret (RFC 9420 section 8.4), checked against psk_secret.json, and a
# resumption PSK for a branch. Uses extract, vec and expand_with_label from the
# key-schedule listing above.
def psk_id(kind, *fields):                      # PreSharedKeyID: 1 external, 2 resumption
    return bytes([kind]) + b"".join(fields)
def psk_secret(psks):                           # psks: list of (PreSharedKeyID, psk value)
    secret = bytes(32)
    for index, (pid, psk) in enumerate(psks):
        label = pid + index.to_bytes(2, "big") + len(psks).to_bytes(2, "big")    # PSKLabel
        psk_input = expand_with_label(extract(bytes(32), psk), b"derived psk", label)
        secret = extract(psk_input, secret)
    return secret

# Three external PSKs from the vector: (psk_id, psk, psk_nonce).
ext = [("42aacc1afc76b1ada7a60114dd51aa740301ae8d4686f17560fffd29bc713e2f",
        "013bdae5ca37feb2e7cfa41a9fe09fc3f3d0784f32db2e7f0c065a0d4aefa963",
        "1be1e330144602b77c4205b139ca8b35e380a1f961efdbeb16a9516133c6dab9"),
       ("b4f3ad1afea819ec085d03d2f6c09ad5223df36ae3c04b4b309b3f86f0718708",
        "3781c20fec9b8df596b485aa0f7ba9107347a0fe14ff3d90a91379938ceb2682",
        "86ed1b2cccf4d67c588dc9b820eb701372215829bb5836f1d76e997030f48be6"),
       ("f8b94054d4ddd4040ac8e842b9a1cc88060ae0d0434b2543be14d0e9143d3b08",
        "6ff21d47faeb5ebe292ee8edd7a85e8650b8e0af483eff99c0c3e44fa3e459a1",
        "f3ae63a6abc2730c1620716bc47ce230da09da55839116d2ac7d9723167a36a9")]
psks = [(psk_id(1, vec(h(i)), vec(h(nonce))), h(v)) for i, v, nonce in ext]
print("no PSK:   ", psk_secret([]).hex()[:16])
print("three PSKs:", psk_secret(psks).hex()[:16], " matches vector:",
      psk_secret(psks).hex() == "f53ae4e49385c8655baba15eee503cc6a62898e459275a4f809aa07e9276dcdf")
print("same PSKs in another order:", psk_secret(psks[::-1]).hex()[:16])

# A resumption PSK for a branch (usage 3) from epoch 1 of the group above: only
# members who held that epoch know s["resumption_psk"].
bnonce = hashlib.sha256(b"branch: the Mars-only group").digest()
branch = psk_id(2, b"\x03", vec(group_id), (1).to_bytes(8, "big"), vec(bnonce))
print("resumption PreSharedKeyID:", branch[:3].hex(), "...", len(branch), "bytes")
print("branch psk_secret:", psk_secret([(branch, s["resumption_psk"])]).hex()[:16])
```

It prints:

```text
no PSK:    0000000000000000
three PSKs: f53ae4e49385c865  matches vector: True
same PSKs in another order: 7504d215936cd489
resumption PreSharedKeyID: 020320 ... 76 bytes
branch psk_secret: 3ae3d84083628fdf
```

The resumption ID's first bytes are the type (`02`, resumption), the usage
(`03`, branch) and the length prefix `20` of the parent's 32-byte group ID; its 76
bytes are $1 + 1 + 33 + 8 + 33$: type, usage, group ID, epoch and nonce.

## 17.9 Security in a group

*Level: intermediate.*

**Forward secrecy** comes from deletion: old epoch secrets, used message
keys and replaced private keys in the tree are deleted. A theft today reveals
the current epoch at most.

**Post-compromise security** comes from updates: when a member whose state
was stolen commits with a fresh UpdatePath, the new path secrets come from
fresh randomness the attacker never saw, encrypted to keys the attacker may
know, but only for nodes the victim itself replaces. A subtle point that the
Cremers, Hale and Kohbrok paper "The Complexities of Healing in Secure Group
Messaging" (USENIX Security 2021) made precise: an attacker who stole Bob's
state knows the private keys of Bob's path, and those keys stay in the tree
until someone replaces them. If Alice commits, she replaces her own path,
but where her path and Bob's diverge, Bob's stale keys remain usable to the
attacker. Full healing for a group therefore needs the **compromised member
itself** to update; MLS applications are told to have every member update
periodically.

**Insiders.** In a group, the attacker might be a member. MLS signs
everything, and a **parent hash** chains each node's public key to the node
above, signed in the leaf of whoever set it, so that a malicious member
cannot insert keys into the tree that others did not set. Joël Alwen, Sandro
Coretti, Yevgeniy Dodis and Yiannis Tselekounis ("Security Analysis and
Improvements for the IETF MLS Standard for Group Messaging", CRYPTO 2020)
showed that TreeKEM's forward secrecy was weaker than expected, because
private keys on other members' paths stay in use until those members update,
and proposed a variant built on updatable public-key encryption; Théophile Wallez, Jonathan Protzenko,
Benjamin Beurdouche and Karthikeyan Bhargavan verified the tree's integrity
properties mechanically ("TreeSync", USENIX Security 2023). Several such
findings changed the RFC before publication.

### What the analyses found, 2020 to 2026

MLS was analyzed while it was written, which is why the drafts changed so
often, and the work went on after the RFC:

| Year | Who and where | Proved or found | What changed |
|---|---|---|---|
| 2020 | Alwen, Coretti, Dodis, Tselekounis, CRYPTO | TreeKEM's forward secrecy weaker than hoped | a variant with updatable public-key encryption |
| 2021 | Cremers, Hale, Kohbrok, USENIX Security | healing needs the victim's own update | periodic updates recommended |
| 2022 | Alwen, Jost, Mularczyk, CRYPTO | insider security defined; three practical attacks on drafts | fixes adopted |
| 2022 | Brzuska, Cornelissen, Kohbrok, IEEE S&P | the key schedule is a sound key derivation | none needed |
| 2023 | Wallez, Protzenko, Beurdouche, Bhargavan, USENIX Security | TreeSync: the tree's integrity and authentication machine-checked in F\*; a new attack | signatures disambiguated, tree hash in the parent hash, a stronger parent-hash link |
| 2025 | Wallez, Protzenko, Bhargavan, IEEE S&P | TreeKEM's confidentiality machine-checked on a byte-exact executable specification | with TreeSync, a proof for RFC 9420 |
| 2026 | Cremers, Günsay, Wesselkamp, Zhao, EUROCRYPT | ETK: external commits and proposals included | see below |

The **insider** results deserve a word. A malicious member can do more than a
thief: sign a commit that gives different members different path secrets, or
hand a joiner a tree the others never agreed on. Alwen, Jost and Mularczyk
defined security against such a member, found three practical attacks by
one on the drafts of the time, and saw their fixes adopted; their warning is
that simplifying a security notion for tractability can hide real attacks.

The **ETK** analysis covers the parts of RFC 9420 that earlier proofs left
out. It finds that the core of TreeKEM as published is secure when used with
a signature scheme that is strongly unforgeable (SUF-CMA), such as Ed25519,
but not with one that is only existentially unforgeable (EUF-CMA), such as
ECDSA. One reason this matters: ECDSA signatures are malleable, since if
$(r, s)$ verifies, so does $(r, n - s)$, and MLS hashes signed messages,
signatures included, into proposal references and the transcript hash. A
second valid copy of a message can then be one the protocol treats as
different. The paper
also finds that external commits and proposals weaken post-compromise
security below what earlier analyses suggested, and proposes a variant that
uses PSKs to heal anyway. The lessons: prefer the Ed25519 suites, or accept
only one form of each ECDSA signature, and enable external joins only where
they are needed.

**Bugs in deployments.** The proofs cover the protocol, not the code that
decides who belongs. Trail of Bits' two 2024 reviews of Discord's DAVE
reported 11 and 15 issues, among them removed participants who could still
decrypt media and commit leaf nodes the MLS library did not validate. A 2026
advisory said Discord's libdave before 1.2.0 accepted a Welcome whose roster
held a participant the application did not recognize. MLS computed the right
keys for whatever group it was given.

### Break it: agreeing on the order

MLS has a requirement that a cryptographic protocol cannot meet by itself:
**every member must apply the same commit for each epoch**. If Alice and
Bob both commit for epoch 5 at the same moment, half the group might apply
Alice's and half Bob's; the groups would fork, with different secrets, and
messages from one side would be unreadable on the other. The **Delivery
Service** must therefore order commits: typically the server accepts the
first valid commit for an epoch and rejects the rest, whose senders retry on
the new epoch. RFC 9750 spells out what the Delivery Service (ordering,
delivery, no access to keys) and the **Authentication Service** (which binds
credentials to identities, the role a CA plays in TLS) must do, and what an
attacker controlling either can achieve. A malicious Delivery Service can
deny service and see metadata; a malicious Authentication Service can add a
fake member. As with Signal, the server must be trusted with something.

### Fix it

The fixes are operational. Pin and verify credentials, ideally with key
transparency for the Authentication Service. Show the epoch authenticator to
users who need to check. Require periodic updates from every member, and
remove members whose devices have not updated in a long time: a device that
never updates is a hole in post-compromise security for the whole group.

## 17.10 Mars: one group, two planets

*Level: intermediate.*

Arcadia City's mission team has members on Mars and in mission control on
Earth, one MLS group. Two parts of MLS meet the light delay head on.

**Commit ordering.** If the Delivery Service runs on Earth, every commit from
Mars takes at least the one-way delay to arrive. Any Earth member who commits
in that window wins the epoch, and the Mars commit is rejected, retried, and
may lose again. Members on Mars would rarely get their updates accepted, and
since healing needs the compromised member's own update, a stolen phone on
Mars would stay a hole in the group for hours. Workable rules:

- **One committer per planet, alternating windows.** Members only propose;
  a designated device on each planet commits, Earth in even 30-minute
  windows, Mars in odd ones, each window longer than the light delay so
  that commits never cross.
- **Two groups, linked.** A Mars group and an Earth group, each with its own
  Delivery Service, and a relay member in both. Commits are local and fast;
  the relay forwards application messages, at the cost of seeing them.

**Old epochs in flight.** A message sent in epoch 7 may arrive after the
receiver has moved to epoch 8. RFC 9420 lets clients keep an old epoch's
message secrets for a while to read late messages. Across the gap that
"while" must be at least the light delay plus the commit window, so forward
secrecy is measured in tens of minutes instead of seconds: an acceptable
trade, since the alternative is losing messages.

**Joining.** A new colonist's KeyPackages must be on the Delivery Service
before anyone can add them. KeyPackages are one-time, so a member should
upload a batch, as Signal users upload prekeys, sized for a conjunction
blackout of two weeks during which no new ones can arrive from Earth.

### After a conjunction

About every 26 months Mars passes behind the Sun and the link goes quiet for
roughly two weeks. Earth members keep working: they update, add a flight
controller, remove one who left. When the link returns, a Mars phone finds,
say, 300 commits and 20,000 messages waiting. It has two ways back.

**Replay in order.** Each epoch's init secret comes from the one before, and
each commit's path secrets are encrypted to the tree of its own epoch, so a
member cannot skip ahead: it processes all 300 commits, oldest first, about
one HPKE decryption and a few dozen hashes each. Read in the Delivery
Service's order, each message opens while its epoch is current and each
epoch is deleted as the replay passes, so forward secrecy survives. The
server must keep everything since the blackout began.

**Rejoin by external commit.** One message removes the phone's old leaf and
adds a fresh one (§17.8). It skips the 300 commits but cannot read anything
sent during the blackout, and it must still cross the light delay and win
the epoch race, the problem the alternating windows solve. Replay suits
people who need the record; the external commit suits a wiped phone.

## 17.11 In the real world

*Level: intermediate.*

| Cipher suite | KEM | AEAD | Hash | Signature |
|---|---|---|---|---|
| 1 (mandatory) | DHKEM(X25519) | AES-128-GCM | SHA-256 | Ed25519 |
| 2 | DHKEM(P-256) | AES-128-GCM | SHA-256 | ECDSA P-256 |
| 3 | DHKEM(X25519) | ChaCha20-Poly1305 | SHA-256 | Ed25519 |
| 4 to 7 | X448, P-521, P-384 | AES-256-GCM or ChaCha20-Poly1305 | SHA-512 or SHA-384 | Ed448 or ECDSA |

A group's cipher suite is fixed at creation and enters every epoch's
GroupContext. Changing it, for instance to a post-quantum suite, means a
**ReInit**: a new group with the same members, linked to the old one by a
resumption PSK so the new group's secrets depend on the old.

**Post-quantum.** MLS needs only a KEM, so post-quantum suites drop in. An
IETF draft (draft-ietf-mls-pq-ciphersuites, revision 06 of July 2026, on the
Standards Track but not yet an RFC as of November 2026) defines suites with
ML-KEM-768 and ML-KEM-1024, alone or as hybrids with X25519 or NIST curves,
some with ML-DSA signatures. Suites that keep classical signatures give
post-quantum confidentiality but not post-quantum authentication. An existing
group moves to such a suite by ReInit with a resumption PSK (§17.8). The
size cost is real (an ML-KEM-768 ciphertext is 1,088 bytes per copath node
instead of 32), but a commit is rare compared with application messages. The
[ML-KEM](../post-quantum/08-ML-KEM.md) chapter of the Post-quantum book
explains the KEM.

**Deployments.** Discord's DAVE protocol (announced 2024) runs voice and
video calls over MLS, with each participant's media key exported from the
group and frames encrypted with AES-128-GCM. Since the start of March 2026,
clients without DAVE can no longer join Discord calls, and in May 2026
Discord said every voice and video call except those in Stage channels is
end-to-end encrypted; text chat is not. Cisco's Webex uses MLS for its
end-to-end encrypted meetings. Wire made MLS generally available on
24 April 2025 and moved its group conversations over from its older Proteus
protocol. The GSMA's RCS Universal Profile 3.0 (March 2025) specifies MLS for
end-to-end encrypted RCS between different apps; Google and Apple began
switching it on for conversations between Android phones and iPhones on
11 May 2026, with iOS 26.5 and Google Messages, still labeled beta and
dependent on carrier support. Open-source implementations include
OpenMLS and mls-rs in Rust and MLSpp in C++, all tested against the same
interop vectors you used above.

**Federation.** The IETF's MIMI working group (More Instant Messaging
Interoperability) is building on MLS so that different messaging services
can share groups, the kind of interoperability the EU's Digital Markets Act
requires of the largest messengers. As of November 2026 its documents are
still drafts (the MIMI protocol draft reached revision 06 in April 2026).

## 17.12 Costs at scale

*Level: intermediate.*

For a full tree of $n$ members, a commit with an UpdatePath carries $\log_2 n$
public keys and $\log_2 n$ HPKE ciphertexts, and each member does one HPKE
decryption and $\log_2 n$ hashes and key derivations. For 10,000 members
that is 14 ciphertexts of about 80 bytes each with X25519, instead of 9,999
pairwise messages. Adds and removes leave blanks; a tree in which half the
nodes are blank can cost close to $n$ ciphertexts per commit until members
update. Application messages cost one AEAD encryption whatever the group
size, as with sender keys.

The other cost is the tree itself: a new member needs the public tree (all
public keys and leaf credentials) to compute the tree hash and verify the
parent hashes. For tens of thousands of members that is megabytes;
"partial MLS" proposals let members hold only their own path.

**By hand, sixteen members.** A full tree of 16 has four levels above the
leaves. A commit carries 4 new parent public keys ($4 \times 32 = 128$
bytes) and 4 HPKE ciphertexts ($4 \times 80 = 320$ bytes): 448 bytes of key
material. Re-keying by pairwise fan-out sends one new 32-byte secret to each
of the other 15 members, $15 \times 80 = 1{,}200$ bytes, and the gap widens
with every doubling. Sender keys are worse after a removal: each of the 15
remaining members must send a new chain key to the other 14, which is
$15 \times 14 = 210$ pairwise messages to heal one departure.

### Code it: counting commits

The program counts HPKE ciphertexts for groups from 2 to 16,384 members in
three states of the tree: full; after a quarter of the members were removed
with no updates since, so their paths are blank; and after every remaining
member has committed once.

```python
# The cost of re-keying a group of n = 2^k members: HPKE ciphertexts in an MLS
# commit (full tree; a quarter removed with no updates since; then refilled
# after every member committed once) against pairwise fan-out. Bytes count
# k parent public keys of 32 bytes and 80 bytes per ciphertext (X25519 suites),
# leaving out the leaf node and signature.
import random

def level(x):
    k = 0
    while (x >> k) & 1: k += 1
    return k
def kids(x): k = level(x); return x ^ (1 << k - 1), x ^ (3 << k - 1)
def path_and_copath(leaf, root):            # walk down from the root to the leaf
    path, copath, x = [], [], root
    while x != leaf:
        path.append(x)
        a, b = kids(x)
        x, other = (a, b) if leaf < x else (b, a)
        copath.append(other)
    return path, copath
def resolution(x, blank):
    if x not in blank: return 1
    return 0 if level(x) == 0 else sum(resolution(c, blank) for c in kids(x))

def commit_cost(n, blank, committer):
    path, copath = path_and_copath(2 * committer, n - 1)
    return sum(resolution(c, blank) for c in copath)

rng = random.Random(9420)
print(f"{'n':>6} | {'full tree':>9} {'bytes':>5} | {'25% removed':>11} {'refilled':>8} | {'pairwise':>8} {'bytes':>9}")
for k in (1, 2, 3, 4, 6, 8, 10, 12, 14):
    n = 2 ** k
    full = commit_cost(n, set(), 0)
    gone = set(rng.sample(range(n), n // 4))
    blank = set()
    for m in gone:                          # removing m blanks its leaf and its whole path
        blank.add(2 * m); blank.update(path_and_copath(2 * m, n - 1)[0])
    stay = [m for m in range(n) if m not in gone]
    sample = rng.sample(stay, min(64, len(stay)))
    holes = sum(commit_cost(n, blank, m) for m in sample) / len(sample)
    for m in stay:                          # every remaining member commits once
        blank -= set(path_and_copath(2 * m, n - 1)[0])
    refilled = sum(commit_cost(n, blank, m) for m in sample) / len(sample)
    print(f"{n:>6} | {full:>9} {32 * k + 80 * full:>5} | {holes:>11.1f} {refilled:>8.1f} | {n - 1:>8} {80 * (n - 1):>9}")
```

It prints:

```text
     n | full tree bytes | 25% removed refilled | pairwise     bytes
     2 |         1   112 |         1.0      1.0 |        1        80
     4 |         2   224 |         1.7      1.7 |        3       240
     8 |         3   336 |         3.7      2.7 |        7       560
    16 |         4   448 |         7.0      3.7 |       15      1200
    64 |         6   672 |        18.2      5.8 |       63      5040
   256 |         8   896 |        98.2      7.7 |      255     20400
  1024 |        10  1120 |       380.2      9.5 |     1023     81840
  4096 |        12  1344 |      1562.3     11.7 |     4095    327600
 16384 |        14  1568 |      6183.3     13.8 |    16383   1310640
```

The full tree costs exactly $k = \log_2 n$. Blanks hurt: with a quarter of
the members gone and no updates, a commit in a group of 16,384 averages over
6,000 ciphertexts. Once everyone has committed, every parent with a member
below holds a key again and the cost falls to about $k$, slightly under it
since empty leaves need no ciphertext. Regular updates heal compromises and
keep the tree cheap.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Bar chart on a logarithmic scale of HPKE ciphertexts needed to re-key a group, for 16 to 16,384 members: a full MLS tree needs 4 to 14, a tree with a quarter of members removed needs 7 to about 6,200, pairwise fan-out needs 15 to 16,383" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-opacity=".18">
<line x1="70" y1="270" x2="620" y2="270"/>
<line x1="70" y1="226" x2="620" y2="226"/>
<line x1="70" y1="182" x2="620" y2="182"/>
<line x1="70" y1="138" x2="620" y2="138"/>
<line x1="70" y1="94" x2="620" y2="94"/>
<line x1="70" y1="50" x2="620" y2="50"/>
</g>
<g text-anchor="end" fill-opacity=".7">
<text x="64" y="274">1</text>
<text x="64" y="230">10</text>
<text x="64" y="186">100</text>
<text x="64" y="142">1,000</text>
<text x="64" y="98">10,000</text>
<text x="64" y="54">100,000</text>
</g>
<g fill-opacity=".9" stroke="currentColor"><rect x="82" y="244" width="20" height="26"/><rect x="174" y="236" width="20" height="34"/><rect x="265" y="230" width="20" height="40"/><rect x="357" y="226" width="20" height="44"/><rect x="449" y="223" width="20" height="47"/><rect x="540" y="220" width="20" height="50"/></g>
<g fill-opacity=".45" stroke="currentColor"><rect x="106" y="233" width="20" height="37"/><rect x="198" y="215" width="20" height="55"/><rect x="289" y="182" width="20" height="88"/><rect x="381" y="156" width="20" height="114"/><rect x="473" y="129" width="20" height="141"/><rect x="564" y="103" width="20" height="167"/></g>
<g fill-opacity=".15" stroke="currentColor"><rect x="130" y="218" width="20" height="52"/><rect x="222" y="191" width="20" height="79"/><rect x="313" y="164" width="20" height="106"/><rect x="405" y="138" width="20" height="132"/><rect x="497" y="111" width="20" height="159"/><rect x="588" y="85" width="20" height="185"/></g>
<text x="114" y="288" text-anchor="middle">16</text>
<text x="206" y="288" text-anchor="middle">64</text>
<text x="297" y="288" text-anchor="middle">256</text>
<text x="389" y="288" text-anchor="middle">1,024</text>
<text x="481" y="288" text-anchor="middle">4,096</text>
<text x="572" y="288" text-anchor="middle">16,384</text>
<text x="550" y="214" text-anchor="middle" font-size="11">14</text>
<text x="345" y="308" text-anchor="middle" fill-opacity=".7">group size n (each step is 4 times larger)</text>
<text x="14" y="150" transform="rotate(-90 14 150)" text-anchor="middle" fill-opacity=".7">HPKE ciphertexts per re-key</text>
<rect x="86" y="14" width="12" height="12" rx="2" fill-opacity=".9" stroke="currentColor"/><text x="104" y="24">MLS, full tree</text>
<rect x="214" y="14" width="12" height="12" rx="2" fill-opacity=".45" stroke="currentColor"/><text x="232" y="24">MLS, 25% removed</text>
<rect x="362" y="14" width="12" height="12" rx="2" fill-opacity=".15" stroke="currentColor"/><text x="380" y="24">pairwise (n − 1)</text>
</svg>
<figcaption>Figure 17.7. HPKE ciphertexts per re-key, on a logarithmic scale, from the program above. A full tree grows by one per doubling; a tree full of blanks drifts toward the pairwise line until members update.</figcaption>
</figure>

## 17.13 Comparing the designs

*Level: intermediate.*

| | Pairwise ratchets | Sender keys | MLS |
|---|---|---|---|
| Cost per message | $n - 1$ encryptions | 1 | 1 |
| Cost to re-key the group | $n - 1$ | $n - 1$ per sender | about $\log_2 n$ |
| Forward secrecy | per message | per message (hash chain) | per message and per epoch |
| Healing after theft | after each pair's round trip | only when every sender rotates | when the victim commits |
| Membership agreement | none: each pair is separate | none | enforced by the GroupContext |
| Deniability | yes | no (signed) | no (signed) |

## 17.14 Going deeper

*Level: expert.*

**Concurrency and forks.** MLS assumes a total order of commits, supplied by
the Delivery Service. Research on decentralized CGKA asks what to do without
one: Alwen, Auerbach, Cueto Noval, Klein, Pascual-Perez, Pietrzak and Walter
studied concurrent updates ("CoCoA", EUROCRYPT 2022), and Alwen, Mularczyk and
Tselekounis studied fork resilience ("Fork-Resilient Continuous Group Key
Agreement", CRYPTO 2023), where a server that shows different members
different histories can do only limited harm.

**Post-compromise security against an active insider** is harder than
against a passive thief: an attacker who controls a member's device can
commit garbage that some members accept and others reject. MLS's signed,
parent-hashed tree and confirmation tags make every commit verifiable by
every member, but recovery from a malicious committer still needs the
application to remove it.

**Metadata.** MLS encrypts the sender inside PrivateMessage, but the server
sees the group, the sizes and timing of messages, and every member's
KeyPackage uploads. Hiding group membership from the server, as Signal's
private groups do with anonymous credentials (Chapter 16), is not part of
MLS.

**Beyond messaging.** The same CGKA gives a group a shared exporter secret
for anything: Discord uses it for media keys, and proposals use MLS to key
encrypted video conferencing, shared documents and even the "group" of
devices that make up one person's account.

## Check yourself

??? question "1. Why don't sender keys provide post-compromise security?"
    A stolen device holds every member's sender chain key. Each chain only
    hashes forward, so the attacker can follow all of them until each sender
    picks a new chain key, which typically happens only on membership
    changes.

??? question "2. In a full tree of 8 members, how many HPKE ciphertexts does a commit with an UpdatePath contain, and why does each member open only one?"
    Three: one per copath node (the subtrees of size 1, 2 and 4 next to the
    committer's path), since every member of a subtree knows the private
    key of its top node. A member opens the path secret of the lowest node
    it shares with the committer's path and derives all higher ones with
    DeriveSecret(·, "path").

??? question "3. How does removing a member lock it out?"
    Its leaf and all nodes on its path, whose private keys it knew, are
    blanked; the next commit's path secrets are encrypted only to nodes it
    never knew, and the new epoch secret depends on them.

??? question "4. What does the GroupContext add to the key schedule?"
    The group ID, epoch, cipher suite, tree hash and transcript hash. Members
    who disagree on membership or history derive different secrets, so a
    disagreement cannot go unnoticed.

??? question "5. A PublicMessage carries a signature. What does the membership tag add?"
    The signature shows which credential sent it; the tag, an HMAC under the
    epoch's membership key, shows the sender knew this epoch's secrets. A
    member removed in the last commit can still sign but cannot make a valid
    tag for the new epoch.

??? question "6. Why must the compromised member itself update for full healing?"
    The attacker knows the private keys on that member's path. Another
    member's commit replaces only its own path, so the victim's stale keys
    below the point where the paths meet remain known to the attacker.

??? question "7. Why does MLS need a Delivery Service that orders commits?"
    Each epoch must have exactly one commit. Two members committing at once
    would split the group into two forks with different secrets; the
    Delivery Service picks one.

??? question "8. Why is the sender-data key derived from a sample of the ciphertext, and why does a PrivateMessage still need a signature inside?"
    The sample differs for every message, so each gets a fresh sender-data
    key and nonce with no counter. The signature is needed because every
    member can derive every other member's ratchet keys: the AEAD alone
    cannot stop one member posing as another.

??? question "9. What does an external commit replace, and why can't the joiner use the previous init secret?"
    The previous epoch's init secret: the joiner runs HPKE to external_pub
    and exports a new one, which members recover with external_priv. With
    the old one the joiner could compute the epoch before it joined.

??? question "10. A Mars member returns from a two-week conjunction to 300 waiting commits. What are its options and their costs?"
    Replay all 300 in order (each epoch depends on the one before): cheap,
    keeps forward secrecy and the blackout's messages, but the server keeps
    everything. Or rejoin by external commit removing its old leaf: one
    message, but the blackout's messages are lost and the commit must win
    the epoch race across the light delay.

## What you learned

- Pairwise ratchets cost $n - 1$ per message; sender keys cost 1 but do not
  heal. MLS gives a continuous group key agreement with epochs.
- TreeKEM puts members at the leaves of a binary tree of HPKE key pairs. A
  commit derives path secrets by hashing and encrypts one to each copath
  subtree: about $\log_2 n$ ciphertexts. You ran it on eight members.
- HPKE is the labeled KEM-plus-AEAD under the tree; you reproduced RFC
  9180's vector.
- The key schedule chains epochs through the init secret and binds the
  GroupContext; you reproduced the interop test vector for two epochs.
- Removal blanks the leaver's path; healing needs the compromised member's
  own update; the Delivery Service must order commits.
- The secret tree gives each sender its own ratchet; you matched the vector.
- A PrivateMessage hides the sender in sender data keyed by a ciphertext
  sample; its inner signature stops members posing as each other. You opened
  one and checked a membership tag.
- External commits let outsiders and members that lost state join without a
  Welcome; PSKs link epochs and groups for ReInit and branching.
- Analyses from 2020 to 2026 shaped the drafts and proved TreeSync and
  TreeKEM, and found ECDSA suites and external joins weaker.
- Commits cost $\log_2 n$ ciphertexts in a full tree, drifting toward $n$
  with blanks until members update.
- MLS runs Discord calls, Webex, Wire and cross-platform RCS; post-quantum
  suites are a KEM swap and a ReInit away.
- Across planets, commit windows, longer retention of old epochs,
  batches of KeyPackages and an ordered replay after conjunction keep a
  group working.

## Further reading

- RFC 9420, *The Messaging Layer Security (MLS) Protocol*, 2023, especially
  §7 (the ratchet tree), §8 (key schedule) and Appendix C (tree math);
  RFC 9750, *The Messaging Layer Security (MLS) Architecture*, 2025.
- RFC 9180, *Hybrid Public Key Encryption*, 2022.
- The MLS working group's interop test vectors,
  github.com/mlswg/mls-implementations (`key-schedule.json`,
  `secret-tree.json`, `message-protection.json`, `psk_secret.json`).
- RFC 8439, *ChaCha20 and Poly1305 for IETF Protocols*, 2018.
- Katriel Cohn-Gordon, Cas Cremers, Luke Garratt, Jon Millican and Kevin
  Milner, "On Ends-to-Ends Encryption: Asynchronous Group Messaging with
  Strong Security Guarantees", ACM CCS 2018.
- Karthikeyan Bhargavan, Richard Barnes and Eric Rescorla, "TreeKEM:
  Asynchronous Decentralized Key Management for Large Dynamic Groups", 2018.
- Joël Alwen, Sandro Coretti, Yevgeniy Dodis and Yiannis Tselekounis,
  "Security Analysis and Improvements for the IETF MLS Standard for Group
  Messaging", CRYPTO 2020.
- Cas Cremers, Britta Hale and Konrad Kohbrok, "The Complexities of Healing
  in Secure Group Messaging", USENIX Security 2021.
- Théophile Wallez, Jonathan Protzenko, Benjamin Beurdouche and Karthikeyan
  Bhargavan, "TreeSync: Authenticated Group Management for Messaging Layer
  Security", USENIX Security 2023.
- Joël Alwen, Daniel Jost and Marta Mularczyk, "On the Insider Security of
  MLS", CRYPTO 2022 (ePrint 2020/1327).
- Chris Brzuska, Eric Cornelissen and Konrad Kohbrok, "Security Analysis of
  the MLS Key Derivation", IEEE Symposium on Security and Privacy 2022.
- Théophile Wallez, Jonathan Protzenko and Karthikeyan Bhargavan, "TreeKEM:
  A Modular Machine-Checked Symbolic Security Analysis of Group Key
  Agreement in Messaging Layer Security", IEEE Symposium on Security and
  Privacy 2025 (ePrint 2025/410).
- Cas Cremers, Esra Günsay, Vincent Wesselkamp and Mang Zhao, "ETK:
  External-Operations TreeKEM and the Security of MLS in RFC 9420",
  EUROCRYPT 2026.
- Joël Alwen, Marta Mularczyk and Yiannis Tselekounis, "Fork-Resilient
  Continuous Group Key Agreement", CRYPTO 2023.
- Discord, *DAVE protocol* specification, github.com/discord/dave-protocol;
  Trail of Bits, security reviews of DAVE, August and September 2024.
- GSMA, *RCS Universal Profile 3.0*, March 2025.
- *MLS Cipher Suites with ML-KEM*, Internet-Draft
  draft-ietf-mls-pq-ciphersuites-06, July 2026 (work in progress).
