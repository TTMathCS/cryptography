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
ciphertexts, and a removed member left holding keys that open nothing.*

!!! abstract "In this chapter"
    **You will learn:**

    - why pairwise channels and sender keys do not scale securely;
    - what a continuous group key agreement must provide;
    - the ratchet tree, its arithmetic and the idea of TreeKEM;
    - HPKE, the public-key encryption MLS builds on, coded;
    - KeyPackages, proposals, commits, Welcome messages and epochs;
    - the key schedule and the secret tree, coded and checked;
    - how removal, forward secrecy and post-compromise security work in a
      group;
    - what the Delivery Service and Authentication Service must do;
    - where MLS runs (Discord, Webex, Wire, cross-platform RCS);
    - running a group across the Earth-Mars light delay.

    **You need:** [Chapter 16](16-Signal-and-the-Double-Ratchet.md) (the
    two-party ratchet and its goals) and [Chapter 3](03-TLS-1.3-Message-by-Message.md)
    (a labelled HKDF key schedule, which MLS borrows); Diffie-Hellman and
    hash functions from Chapters [12](../../book/12-Diffie-Hellman.md) and
    [9](../../book/09-Hash-Functions.md) of book 1.

    **Levels:** §17.1 and §17.2 are for beginners, §17.3 to §17.10 are
    intermediate, §17.11 is expert.

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
    Discord's encrypted voice and video, Webex, Wire, and the GSMA's
    specification for encrypted RCS between Android and iPhone; post-quantum
    cipher suites in an IETF draft

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
nonce. Every step uses **labelled** HKDF, with the protocol name, version
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
secret, so the server cannot see who in the group sent a message.

## 17.6 Security in a group

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

## 17.7 Mars: one group, two planets

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

## 17.8 In the real world

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
IETF draft (draft-ietf-mls-pq-ciphersuites) defines suites with ML-KEM, with
the X-Wing hybrid of ML-KEM-768 and X25519, and with ML-DSA signatures; the
size cost is real (an ML-KEM-768 ciphertext is 1,088 bytes per copath node
instead of 32), but a commit is rare compared with application messages. The
[ML-KEM](../post-quantum/08-ML-KEM.md) chapter of the Post-quantum book
explains the KEM.

**Deployments.** Discord's DAVE protocol (announced 2024) runs voice and
video calls over MLS, with each participant's media key exported from the
group and frames encrypted with AES-128-GCM. Cisco's Webex uses MLS for its
end-to-end encrypted meetings, and Wire moved its messenger to MLS. The
GSMA's RCS Universal Profile 3.0 (2025) specifies MLS for end-to-end
encrypted RCS between different apps, the basis for encrypted messages between
Android phones and iPhones. Open-source implementations include
OpenMLS and mls-rs in Rust and MLSpp in C++, all tested against the same
interop vectors you used above.

**Federation.** The IETF's MIMI working group (More Instant Messaging
Interoperability) is building on MLS so that different messaging services
can share groups, the kind of interoperability the EU's Digital Markets Act
requires of the largest messengers.

## 17.9 Costs at scale

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

## 17.10 Comparing the designs

*Level: intermediate.*

| | Pairwise ratchets | Sender keys | MLS |
|---|---|---|---|
| Cost per message | $n - 1$ encryptions | 1 | 1 |
| Cost to re-key the group | $n - 1$ | $n - 1$ per sender | about $\log_2 n$ |
| Forward secrecy | per message | per message (hash chain) | per message and per epoch |
| Healing after theft | after each pair's round trip | only when every sender rotates | when the victim commits |
| Membership agreement | none: each pair is separate | none | enforced by the GroupContext |
| Deniability | yes | no (signed) | no (signed) |

## 17.11 Going deeper

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

??? question "2. In a full tree of 8 members, how many HPKE ciphertexts does a commit with an UpdatePath contain, and why?"
    Three: one per copath node (the subtrees of size 1, 2 and 4 next to the
    committer's path), since every member of a subtree knows the private
    key of its top node.

??? question "3. Why does each member need to decrypt only one ciphertext?"
    It decrypts the path secret of the lowest node it shares with the
    committer's path; all higher path secrets are derived from it by
    DeriveSecret(·, "path").

??? question "4. What is the resolution of a node, and when does it matter?"
    The smallest set of non-blank nodes covering the node's subtree. When a
    copath node is blank, the committer must encrypt to every node in its
    resolution, which can mean many ciphertexts.

??? question "5. How does removing a member lock it out?"
    Its leaf and all nodes on its path, whose private keys it knew, are
    blanked; the next commit's path secrets are encrypted only to nodes it
    never knew, and the new epoch secret depends on them.

??? question "6. What does the GroupContext add to the key schedule?"
    The group ID, epoch, cipher suite, tree hash and transcript hash. Members
    who disagree on membership or history derive different secrets, so a
    disagreement cannot go unnoticed.

??? question "7. Why must the compromised member itself update for full healing?"
    The attacker knows the private keys on that member's path. Another
    member's commit replaces only its own path, so the victim's stale keys
    below the point where the paths meet remain known to the attacker.

??? question "8. Why does MLS need a Delivery Service that orders commits?"
    Each epoch must have exactly one commit. Two members committing at once
    would split the group into two forks with different secrets; the
    Delivery Service picks one.

??? question "9. What did HPKE replace, and what makes it safer?"
    Ad hoc ECIES variants. HPKE is a single specified construction with
    labelled key derivation binding every algorithm identifier and context,
    test vectors, and security proofs.

??? question "10. Why do commit windows help an MLS group spanning Earth and Mars?"
    With one Delivery Service, commits from the far planet arrive a light
    delay late and lose to local ones. Alternating windows longer than the
    delay let each planet's committer commit without collisions.

## What you learned

- Pairwise ratchets cost $n - 1$ per message; sender keys cost 1 but do not
  heal. MLS gives a continuous group key agreement with epochs.
- TreeKEM puts members at the leaves of a binary tree of HPKE key pairs. A
  commit derives path secrets by hashing and encrypts one to each copath
  subtree: about $\log_2 n$ ciphertexts. You ran it on eight members.
- HPKE is the labelled KEM-plus-AEAD under the tree; you reproduced RFC
  9180's vector.
- The key schedule chains epochs through the init secret and binds the
  GroupContext; you reproduced the interop test vector for two epochs.
- Removal blanks the leaver's path; healing needs the compromised member's
  own update; the Delivery Service must order commits.
- MLS runs Discord calls, Webex, Wire and cross-platform RCS; post-quantum
  suites are a KEM swap.
- Across planets, commit windows, longer retention of old epochs and
  batches of KeyPackages keep a group working.

## Further reading

- RFC 9420, *The Messaging Layer Security (MLS) Protocol*, 2023, especially
  §7 (the ratchet tree), §8 (key schedule) and Appendix C (tree math);
  RFC 9750, *The Messaging Layer Security (MLS) Architecture*, 2025.
- RFC 9180, *Hybrid Public Key Encryption*, 2022.
- The MLS working group's interop test vectors,
  github.com/mlswg/mls-implementations.
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
- Discord, *DAVE protocol* specification, github.com/discord/dave-protocol.
