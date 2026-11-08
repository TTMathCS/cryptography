# 12. SLH-DSA

*Chapter 11's hash-based signatures are as safe as SHA-256, but only while the signer keeps
perfect count of the one-time keys it has used. SLH-DSA removes the count. It builds a tree of
trees so large that the signer can pick a leaf at random for every message and never worry
about picking one twice, and it puts a "few-time" signature at the bottom so that the rare
repeat does no harm. NIST standardized it as FIPS 205 on 13 August 2024, from the SPHINCS+
submission. The cost is size and speed: the smallest signature is 7,856 bytes, and signing
takes millions of hash calls. This chapter builds it completely. You will see why random
leaves are safe, how FORS signs a digest by revealing a few leaves of several small trees, how
every hash call is made unique by a 32-byte address, run an implementation that matches all
of NIST's test vectors, and measure how slowly security wears down when a FORS key is reused.*

!!! abstract "In this chapter"
    **You will learn:**

    - how a hypertree of XMSS trees lets a signer choose leaves at random, with no state;
    - FORS, the few-time signature at the bottom, and why "few-time" is good enough;
    - tweakable hash functions and the 32-byte address that separates every hash call;
    - the twelve parameter sets: small-but-slow "s" and fast-but-large "f";
    - a complete implementation, checked against NIST's test vectors;
    - how security degrades as signatures accumulate, and what faults can do;
    - where SLH-DSA fits: root keys, firmware and long-term trust.

    **You need:** [Chapter 11](11-Stateful-Hash-Based-Signatures.md) (Winternitz chains,
    Merkle trees, XMSS).

    **Levels:** §12.1 to §12.3 are for beginners, §12.4 to §12.9 are intermediate, §12.10 to
    §12.12 are expert.

## 12.1 The problem

*Level: beginner.*

A stateful hash-based signer must never lose track of its counter. That rules out ordinary
operations like restoring a backup, running two signers for redundancy, or moving a key to a
new server. Most systems that sign things were not built with that in mind, and retrofitting
them is risky. What is wanted is a signature with the same conservative security (nothing but
a hash function) and the same interface as any other signature: a private key that can be
copied and backed up, and signing that needs no memory of the past.

The idea is old. Oded Goldreich observed in 1986 that if a tree of one-time keys is large
enough, the signer can choose a leaf at random for each message, and the chance of choosing
the same leaf twice becomes negligible. The problem was size: the tree must have something
like $2^{256}$ leaves for safety, and authentication paths through it were enormous. SPHINCS
(Bernstein and others, EUROCRYPT 2015) made the idea practical with three tricks: a
*hypertree* of many small trees instead of one huge one; *few-time* signatures at the bottom,
so that a repeated leaf is not a disaster; and leaves generated from a seed, so the tree never
has to be stored. SPHINCS+ (Bernstein, Hülsing, Kölbl, Niederhagen, Rijneveld and Schwabe, CCS
2019) refined it, and became SLH-DSA, the "Stateless Hash-based Digital Signature Algorithm".

!!! note "Life story: SPHINCS+, now SLH-DSA"
    **Born:** 2015 as SPHINCS (Daniel J. Bernstein, Daira Hopwood, Andreas Hülsing, Tanja
    Lange, Ruben Niederhagen, Louiza Papachristodoulou, Michael Schneider, Peter Schwabe and
    Zooko Wilcox-O'Hearn), refined as SPHINCS+ (2017 submission; CCS 2019 paper) · **Purpose:**
    a stateless signature whose security rests only on hash functions · **Helped:** a
    conservative fallback for NIST's portfolio, long-lived root and firmware keys · **Status:**
    standardized as FIPS 205 (SLH-DSA) on 13 August 2024; SP 800-230, whose initial public
    draft appeared in April 2026, proposes additional parameter sets.

## 12.2 Random leaves and the birthday bound

*Level: beginner.*

Why must the tree be so big? If a signer picks one of $L$ leaves at random for each of $q$
signatures, the chance that two signatures pick the same leaf is about $q^2 / (2L)$, the
birthday bound. NIST asks SLH-DSA to stay secure for up to $2^{64}$ signatures per key. With a
one-time signature at each leaf, any repeat could be fatal (Chapter 11), so we would need
$q^2/(2L)$ to be tiny, around $2^{-128}$, which means $L \approx 2^{255}$ leaves.

SLH-DSA avoids that requirement with its few-time layer. Its leaves number $2^{63}$ to $2^{68}$,
so with $2^{64}$ signatures many leaves *are* used more than once. That is fine because the
bottom layer, FORS, is designed to survive several uses with only a gradual loss of security
(§12.8). The total height $h$ is set so that the busiest FORS key, in a realistic worst case,
still has more than the target security.

## 12.3 The structure

*Level: beginner.*

An SLH-DSA signature has three parts:

1. **A randomizer $R$** ($n$ bytes), and from it the message digest $H_{\text{msg}}(R, \mathrm{PK},
   M)$. The digest is split into a part to be signed and an index that picks one FORS key out of
   $2^h$.
2. **A FORS signature** on the digest part, using the chosen FORS key.
3. **A hypertree signature** on the FORS public key: $d$ layers of XMSS trees, each of height
   $h' = h/d$. The bottom tree's WOTS+ key signs the FORS public key; its root is signed by a
   WOTS+ key in a tree one layer up; and so on to the single top tree, whose root is the
   public key.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="SLH-DSA structure: a top XMSS tree whose root is the public key; below it layers of XMSS trees, each leaf a WOTS+ key signing the root of a tree below; at the bottom, a FORS key of k small trees signing the message digest" fill="currentColor" font-size="13">
<polygon points="320,20 250,80 390,80" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="330" y="18">PK.root</text><text x="400" y="62">layer d − 1 (top)</text>
<circle cx="300" cy="80" r="4" class="acc-fill"/>
<line x1="300" y1="84" x2="280" y2="120" stroke="currentColor" stroke-dasharray="4 3"/>
<polygon points="280,120 210,180 350,180" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="360" y="162">layer d − 2</text>
<circle cx="250" cy="180" r="4" class="acc-fill"/>
<text x="20" y="150" fill-opacity=".7">each dot: a WOTS+ key that signs</text>
<text x="20" y="168" fill-opacity=".7">the root of the tree below</text>
<text x="230" y="205">⋮  d layers of height h′</text>
<polygon points="240,215 170,265 310,265" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="320" y="252">layer 0</text>
<circle cx="200" cy="265" r="4" class="acc-fill"/>
<line x1="200" y1="269" x2="200" y2="280" stroke="currentColor"/>
<g class="acc" fill="none" stroke-width="1.6">
<polygon points="430,230 405,270 455,270"/><polygon points="480,230 455,270 505,270"/><polygon points="530,230 505,270 555,270"/><polygon points="600,230 575,270 625,270"/>
</g>
<text x="560" y="255" class="acc-fill">…</text>
<text x="420" y="222" class="acc-fill">FORS: k trees of 2^a leaves</text>
<line x1="204" y1="275" x2="400" y2="275" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="420" y="292">signs the message digest</text>
</svg>
<figcaption>Figure 12.1. The SLH-DSA hypertree. The digest picks one FORS key among 2^h; a chain of d WOTS+ signatures, one per layer, links its public key to the root. Every tree is regenerated from the secret seed when needed, so nothing is stored and nothing is remembered between signatures.</figcaption>
</figure>

Every one-time key, every FORS leaf and every node is derived from a secret seed with a
pseudorandom function, so the "tree" is never stored. Signing recomputes the $d$ XMSS trees
along the chosen path (each a few hundred WOTS+ keys) and the needed parts of the FORS trees.
That is why signing is slow: millions of hashes for the small parameter sets. Verification
only climbs one path and is fast.

Note what is *not* random: the WOTS+ keys in the upper layers sign tree roots, which are fixed.
Each upper WOTS+ key always signs the same root, so it is used for exactly one message no
matter how often the signer passes through it. Only the FORS keys at the bottom see different
messages, which is why they must be few-time.

## 12.4 FORS: a forest of random subsets

*Level: intermediate.*

FORS ("Forest Of Random Subsets") signs a digest of $k \cdot a$ bits. Its key is $k$ Merkle trees,
each with $2^a$ secret leaves. Split the digest into $k$ numbers of $a$ bits each; the $i$-th
number picks one leaf of the $i$-th tree. The signature reveals those $k$ secret leaves, each
with its authentication path of $a$ nodes. The verifier hashes each revealed leaf up its path
to a tree root, then hashes the $k$ roots together into the FORS public key, which the
hypertree then vouches for.

A forger who has seen one FORS signature knows one leaf in each tree. To sign a new digest it
needs, in every tree, a leaf it already knows. Each trial digest (the forger can try as many
messages as it likes) matches in all $k$ trees with probability $(2^{-a})^k$. For SLH-DSA-128s,
$a = 12$ and $k = 14$, so one signature gives a forger a $2^{-168}$ chance per try. After $s$
signatures under the same FORS key, about $s$ leaves of each tree are known and the chance
grows to roughly $(s/2^a)^k$: it wears down slowly, which is what "few-time" means.

FORS replaced HORST, the few-time scheme of the original SPHINCS. HORST used one big tree,
so its signature carried one long authentication path per revealed leaf; FORS's separate small
trees give shorter signatures and a simpler security analysis.

## 12.5 Tweakable hashes and addresses

*Level: intermediate.*

An SLH-DSA key performs billions of distinct hash computations over its lifetime, and an
attacker who sees many signatures sees a great many hash outputs. A generic attack might look
for a second preimage of *any* of them at once, which is easier than attacking one: with
$2^{40}$ targets, a brute-force search is $2^{40}$ times faster. SLH-DSA defends against this
by making every hash call different.

Each call is **tweakable**: it hashes the public seed, a 32-byte **address** ADRS, and the
input. The address says exactly where in the structure the call is: layer, tree, type of call
(WOTS+ chain, WOTS+ public key, tree node, FORS leaf, FORS roots, or a secret-key derivation),
key pair, chain, step, height and index. No two calls anywhere share an address, and the
public seed differs between keys, so a second preimage found for one call is useless for any
other.

FIPS 205 defines two families of hash functions:

- **SHAKE.** Every function is SHAKE256 of seed, address and input, cut to $n$ bytes.
  Simple and uniform.
- **SHA-2.** $F$ and the PRF use SHA-256 of the seed padded to a full 64-byte block (so the
  seed's compression can be computed once and reused), a compressed 22-byte address, and the
  input. At categories 3 and 5, $H$, $T$, the message hash and the message PRF use SHA-512
  instead, after Ray Perlner, John Kelsey and David Cooper found in 2022 that SHA-256's 256-bit
  chaining value left category 5 short against multi-target attacks.

The SHA-2 sets are faster where SHA-256 has hardware support; the SHAKE sets are simpler and
faster where SHA-3 does.

## 12.6 Twelve parameter sets

*Level: intermediate.*

FIPS 205 gives each security category two sets, "s" (small) and "f" (fast), and each comes in
SHA-2 and SHAKE versions: twelve in all. "s" uses few tall XMSS layers (fewer WOTS+ signatures
in the signature, more work to build each tree); "f" uses many short layers (more WOTS+
signatures, much less work). The parameters fix the sizes:

```python
# Signature size and signing work for all six SLH-DSA levels, from the parameters.
#                     n   h  d  h'  a   k
PARAMS = {"128s": (16, 63, 7, 9, 12, 14), "128f": (16, 66, 22, 3, 6, 33),
          "192s": (24, 63, 7, 9, 14, 17), "192f": (24, 66, 22, 3, 8, 33),
          "256s": (32, 64, 8, 8, 14, 22), "256f": (32, 68, 17, 4, 9, 35)}
print("set    signature  FORS part  hypertree part  hash calls to sign (approx.)")
for name, (n, h, d, hp, a, k) in PARAMS.items():
    wots_len = 2 * n + 3
    fors = n * k * (a + 1)
    ht = n * d * (wots_len + hp)
    size = n + fors + ht
    # FORS: k trees of 2^a leaves (each leaf: a PRF and an F) plus internal nodes;
    # hypertree: d trees of 2^h' WOTS+ keys, each len chains of 15 steps plus a PRF per chain.
    work = k * (3 * 2 ** a) + d * 2 ** hp * wots_len * 16
    print(f"{name}  {size:9,d}  {fors:9,d}  {ht:14,d}  {work:14,d}")
```

It prints:

```
set    signature  FORS part  hypertree part  hash calls to sign (approx.)
128s      7,856      2,912           4,928       2,179,072
128f     17,088      3,696          13,376         104,896
192s     16,224      6,120          10,080       3,760,128
192f     35,664      7,128          28,512         168,960
256s     29,792     10,560          19,200       3,276,800
256f     49,856     11,200          38,624         345,344
```

The signatures agree with FIPS 205's Table 2. Public keys are tiny ($2n$ bytes: 32, 48 or
64) and private keys are $4n$ bytes. The trade-off is stark: SLH-DSA-128s signs with about two
million hash calls for a 7,856-byte signature, and SLH-DSA-128f with about a hundred thousand
for 17,088 bytes. Compared with ML-DSA-44 (2,420 bytes, a few tries of lattice arithmetic),
even the small set is three times bigger and hundreds of times slower to sign. Verification,
in contrast, is a few thousand hash calls for every set: fast.

| | n | h | d | h′ | a | k | public key | signature | category |
|---|---|---|---|---|---|---|---|---|---|
| 128s | 16 | 63 | 7 | 9 | 12 | 14 | 32 B | 7,856 B | 1 |
| 128f | 16 | 66 | 22 | 3 | 6 | 33 | 32 B | 17,088 B | 1 |
| 192s | 24 | 63 | 7 | 9 | 14 | 17 | 48 B | 16,224 B | 3 |
| 192f | 24 | 66 | 22 | 3 | 8 | 33 | 48 B | 35,664 B | 3 |
| 256s | 32 | 64 | 8 | 8 | 14 | 22 | 64 B | 29,792 B | 5 |
| 256f | 32 | 68 | 17 | 4 | 9 | 35 | 64 B | 49,856 B | 5 |

*Table 12.1. SLH-DSA parameters (FIPS 205, Table 2). Each row exists in a SHA-2 and a SHAKE
version. Winternitz $w = 16$ throughout.*

## 12.7 The complete code

*Level: intermediate.*

SLH-DSA in full, both hash families, all twelve parameter sets: about 270 lines. It follows
FIPS 205's algorithms closely, with one helper (`climb`) for the path-hashing loop that XMSS
and FORS share. As before, it is for reading and checking, never for real keys.

```python
"""SLH-DSA (FIPS 205) in plain Python, standard library only. For learning, not for use."""
import hashlib, hmac

#                     n   h  d  h'  a   k   m
PARAMS = {"128s": (16, 63, 7, 9, 12, 14, 30), "128f": (16, 66, 22, 3, 6, 33, 34),
          "192s": (24, 63, 7, 9, 14, 17, 39), "192f": (24, 66, 22, 3, 8, 33, 42),
          "256s": (32, 64, 8, 8, 14, 22, 47), "256f": (32, 68, 17, 4, 9, 35, 49)}
W, LGW = 16, 4
WOTS_HASH, WOTS_PK, TREE, FORS_TREE, FORS_ROOTS, WOTS_PRF, FORS_PRF = range(7)

class Adrs:                                   # the 32-byte hash address (FIPS 205, Section 4.2)
    def __init__(self, b=None):  self.b = bytearray(b or 32)
    def copy(self):              return Adrs(self.b)
    def _set(self, i, j, v):     self.b[i:j] = v.to_bytes(j - i, "big")
    def layer(self, v):          self._set(0, 4, v)
    def tree(self, v):           self._set(4, 16, v)
    def kind(self, v):           self._set(16, 20, v); self.b[20:32] = bytes(12)
    def keypair(self, v):        self._set(20, 24, v)
    def chain(self, v):          self._set(24, 28, v)
    def height(self, v):         self._set(24, 28, v)
    def hash(self, v):           self._set(28, 32, v)
    def index(self, v):          self._set(28, 32, v)
    def get_keypair(self):       return int.from_bytes(self.b[20:24], "big")
    def get_index(self):         return int.from_bytes(self.b[28:32], "big")
    def compressed(self):        # the 22-byte form used by the SHA-2 parameter sets
        return bytes(self.b[3:4] + self.b[8:16] + self.b[19:20] + self.b[20:32])

class Scheme:
    def __init__(self, name):
        family, level = name.split("-")[-2:]
        self.n, self.h, self.d, self.hp, self.a, self.k, self.m = PARAMS[level]
        self.len = 2 * self.n + 3                 # WOTS+ chains: 2n message digits + 3 checksum
        self.shake = family == "SHAKE"
        self.big = self.n > 16                    # SHA-2 at categories 3 and 5 uses SHA-512 too

    # --- the tweakable hash functions (Sections 11.1 and 11.2) ---
    def F(self, seed, adrs, msg):
        n = self.n
        if self.shake:
            return hashlib.shake_256(seed + bytes(adrs.b) + msg).digest(n)
        return hashlib.sha256(seed + bytes(64 - n) + adrs.compressed() + msg).digest()[:n]

    def H(self, seed, adrs, msg):                 # also T_l: the same function on longer input
        n = self.n
        if self.shake or not self.big:
            return self.F(seed, adrs, msg)
        return hashlib.sha512(seed + bytes(128 - n) + adrs.compressed() + msg).digest()[:n]

    def PRF(self, seed, sk_seed, adrs):
        return self.F(seed, adrs, sk_seed)

    def PRF_msg(self, sk_prf, opt, msg):
        if self.shake:
            return hashlib.shake_256(sk_prf + opt + msg).digest(self.n)
        h = hashlib.sha512 if self.big else hashlib.sha256
        return hmac.new(sk_prf, opt + msg, h).digest()[:self.n]

    def H_msg(self, r, seed, root, msg):
        if self.shake:
            return hashlib.shake_256(r + seed + root + msg).digest(self.m)
        h = hashlib.sha512 if self.big else hashlib.sha256
        s = r + seed + h(r + seed + root + msg).digest()
        out, c = b"", 0                           # MGF1
        while len(out) < self.m:
            out += h(s + c.to_bytes(4, "big")).digest()
            c += 1
        return out[:self.m]

    # --- WOTS+ (Section 5) ---
    def chain(self, x, start, steps, seed, adrs):
        for j in range(start, start + steps):
            adrs.hash(j)
            x = self.F(seed, adrs, x)
        return x

    def digits(self, msg):
        d = base_2b(msg, LGW, 2 * self.n)
        csum = sum(W - 1 - x for x in d) << 4
        return d + base_2b(csum.to_bytes(2, "big"), LGW, 3)

    def wots_sk(self, sk_seed, seed, adrs, i):
        s = adrs.copy(); s.kind(WOTS_PRF); s.keypair(adrs.get_keypair()); s.chain(i)
        return self.PRF(seed, sk_seed, s)

    def wots_compress(self, seed, adrs, ends):
        p = adrs.copy(); p.kind(WOTS_PK); p.keypair(adrs.get_keypair())
        return self.H(seed, p, b"".join(ends))

    def wots_pk(self, sk_seed, seed, adrs):
        ends = []
        for i in range(self.len):
            adrs.chain(i)
            ends.append(self.chain(self.wots_sk(sk_seed, seed, adrs, i), 0, W - 1, seed, adrs))
        return self.wots_compress(seed, adrs, ends)

    def wots_sign(self, msg, sk_seed, seed, adrs):
        sig = []
        for i, a in enumerate(self.digits(msg)):
            adrs.chain(i)
            sig.append(self.chain(self.wots_sk(sk_seed, seed, adrs, i), 0, a, seed, adrs))
        return sig

    def wots_pk_from_sig(self, sig, msg, seed, adrs):
        ends = []
        for i, a in enumerate(self.digits(msg)):
            adrs.chain(i)
            ends.append(self.chain(sig[i], a, W - 1 - a, seed, adrs))
        return self.wots_compress(seed, adrs, ends)

    # --- XMSS trees (Section 6) ---
    def xmss_node(self, sk_seed, i, z, seed, adrs):
        if z == 0:
            adrs.kind(WOTS_HASH); adrs.keypair(i)
            return self.wots_pk(sk_seed, seed, adrs)
        left = self.xmss_node(sk_seed, 2 * i, z - 1, seed, adrs)
        right = self.xmss_node(sk_seed, 2 * i + 1, z - 1, seed, adrs)
        adrs.kind(TREE); adrs.height(z); adrs.index(i)
        return self.H(seed, adrs, left + right)

    def xmss_sign(self, msg, sk_seed, idx, seed, adrs):
        auth = [self.xmss_node(sk_seed, (idx >> j) ^ 1, j, seed, adrs) for j in range(self.hp)]
        adrs.kind(WOTS_HASH); adrs.keypair(idx)
        return self.wots_sign(msg, sk_seed, seed, adrs), auth

    def climb(self, node, idx, auth, seed, adrs, leaf_index):
        """Hash a leaf up an authentication path (used by XMSS and FORS)."""
        adrs.index(leaf_index)
        for j, sibling in enumerate(auth):
            adrs.height(j + 1)
            if (idx >> j) & 1 == 0:
                adrs.index(adrs.get_index() // 2)
                node = self.H(seed, adrs, node + sibling)
            else:
                adrs.index((adrs.get_index() - 1) // 2)
                node = self.H(seed, adrs, sibling + node)
        return node

    def xmss_pk_from_sig(self, idx, sig, msg, seed, adrs):
        wots_sig, auth = sig
        adrs.kind(WOTS_HASH); adrs.keypair(idx)
        node = self.wots_pk_from_sig(wots_sig, msg, seed, adrs)
        adrs.kind(TREE)
        return self.climb(node, idx, auth, seed, adrs, idx)

    # --- the hypertree (Section 7) ---
    def ht_sign(self, msg, sk_seed, seed, idx_tree, idx_leaf):
        adrs, sigs = Adrs(), []
        for j in range(self.d):
            adrs.layer(j); adrs.tree(idx_tree)
            sig = self.xmss_sign(msg, sk_seed, idx_leaf, seed, adrs)
            sigs.append(sig)
            msg = self.xmss_pk_from_sig(idx_leaf, sig, msg, seed, adrs)
            idx_leaf, idx_tree = idx_tree % (1 << self.hp), idx_tree >> self.hp
        return sigs

    def ht_verify(self, msg, sigs, seed, idx_tree, idx_leaf, root):
        adrs = Adrs()
        for j, sig in enumerate(sigs):
            adrs.layer(j); adrs.tree(idx_tree)
            msg = self.xmss_pk_from_sig(idx_leaf, sig, msg, seed, adrs)
            idx_leaf, idx_tree = idx_tree % (1 << self.hp), idx_tree >> self.hp
        return msg == root

    # --- FORS (Section 8) ---
    def fors_sk(self, sk_seed, seed, adrs, idx):
        s = adrs.copy(); s.kind(FORS_PRF); s.keypair(adrs.get_keypair()); s.index(idx)
        return self.PRF(seed, sk_seed, s)

    def fors_node(self, sk_seed, i, z, seed, adrs):
        if z == 0:
            sk = self.fors_sk(sk_seed, seed, adrs, i)
            adrs.height(0); adrs.index(i)
            return self.F(seed, adrs, sk)
        left = self.fors_node(sk_seed, 2 * i, z - 1, seed, adrs)
        right = self.fors_node(sk_seed, 2 * i + 1, z - 1, seed, adrs)
        adrs.height(z); adrs.index(i)
        return self.H(seed, adrs, left + right)

    def fors_sign(self, md, sk_seed, seed, adrs):
        sig = []
        for i, x in enumerate(base_2b(md, self.a, self.k)):
            sk = self.fors_sk(sk_seed, seed, adrs, (i << self.a) + x)
            auth = [self.fors_node(sk_seed, (i << (self.a - j)) + ((x >> j) ^ 1), j, seed, adrs)
                    for j in range(self.a)]
            sig.append((sk, auth))
        return sig

    def fors_pk_from_sig(self, sig, md, seed, adrs):
        roots = []
        for i, x in enumerate(base_2b(md, self.a, self.k)):
            sk, auth = sig[i]
            adrs.height(0); adrs.index((i << self.a) + x)
            leaf = self.F(seed, adrs, sk)
            roots.append(self.climb(leaf, x, auth, seed, adrs, (i << self.a) + x))
        p = adrs.copy(); p.kind(FORS_ROOTS); p.keypair(adrs.get_keypair())
        return self.H(seed, p, b"".join(roots))

    # --- SLH-DSA (Section 9: the internal functions) ---
    def keygen(self, sk_seed, sk_prf, seed):
        adrs = Adrs(); adrs.layer(self.d - 1)
        root = self.xmss_node(sk_seed, 0, self.hp, seed, adrs)
        return sk_seed + sk_prf + seed + root, seed + root          # (sk, pk)

    def split(self, digest):
        ka = (self.k * self.a + 7) // 8
        tb, lb = (self.h - self.hp + 7) // 8, (self.hp + 7) // 8
        md = digest[:ka]
        idx_tree = int.from_bytes(digest[ka:ka + tb], "big") % (1 << (self.h - self.hp))
        idx_leaf = int.from_bytes(digest[ka + tb:ka + tb + lb], "big") % (1 << self.hp)
        return md, idx_tree, idx_leaf

    def sign_internal(self, msg, sk, addrnd=None):
        n = self.n
        sk_seed, sk_prf, seed, root = sk[:n], sk[n:2 * n], sk[2 * n:3 * n], sk[3 * n:]
        r = self.PRF_msg(sk_prf, addrnd if addrnd is not None else seed, msg)
        md, idx_tree, idx_leaf = self.split(self.H_msg(r, seed, root, msg))
        adrs = Adrs(); adrs.tree(idx_tree); adrs.kind(FORS_TREE); adrs.keypair(idx_leaf)
        fors = self.fors_sign(md, sk_seed, seed, adrs)
        fors_pk = self.fors_pk_from_sig(fors, md, seed, adrs)
        ht = self.ht_sign(fors_pk, sk_seed, seed, idx_tree, idx_leaf)
        return (r + b"".join(sk + b"".join(auth) for sk, auth in fors)
                + b"".join(b"".join(w) + b"".join(auth) for w, auth in ht))

    def verify_internal(self, msg, sig, pk):
        n, a, k, hp = self.n, self.a, self.k, self.hp
        if len(sig) != n * (1 + k * (a + 1) + self.d * (self.len + hp)) or len(pk) != 2 * n:
            return False
        seed, root = pk[:n], pk[n:]
        chunks = [sig[i:i + n] for i in range(0, len(sig), n)]
        r, pos = chunks[0], 1
        fors = []
        for _ in range(k):
            fors.append((chunks[pos], chunks[pos + 1:pos + 1 + a])); pos += 1 + a
        ht = []
        for _ in range(self.d):
            ht.append((chunks[pos:pos + self.len], chunks[pos + self.len:pos + self.len + hp]))
            pos += self.len + hp
        md, idx_tree, idx_leaf = self.split(self.H_msg(r, seed, root, msg))
        adrs = Adrs(); adrs.tree(idx_tree); adrs.kind(FORS_TREE); adrs.keypair(idx_leaf)
        fors_pk = self.fors_pk_from_sig(fors, md, seed, adrs)
        return self.ht_verify(fors_pk, ht, seed, idx_tree, idx_leaf, root)

    # --- the external interface: pure SLH-DSA with a context string (Section 10) ---
    def sign(self, msg, sk, ctx=b"", addrnd=None):
        return self.sign_internal(bytes([0, len(ctx)]) + ctx + msg, sk, addrnd)

    def verify(self, msg, sig, pk, ctx=b""):
        return self.verify_internal(bytes([0, len(ctx)]) + ctx + msg, sig, pk)

def base_2b(x, b, count):                     # Algorithm 4: read x as `count` b-bit digits
    out, total, bits, i = [], 0, 0, 0
    for _ in range(count):
        while bits < b:
            total, bits, i = (total << 8) | x[i], bits + 8, i + 1
        bits -= b
        out.append((total >> bits) & ((1 << b) - 1))
    return out
```

NIST's ACVP test files for FIPS 205 hold 120 key-generation tests, 504 verification tests and
624 signing tests, across all twelve parameter sets, deterministic and randomized
signing, pure and pre-hash forms, and contexts. This code reproduces all of them. The listing
checks two key-generation vectors and signs a message with two parameter sets.

```python
# Uses Scheme() from the listing above.
# NIST ACVP key-generation vectors: three seeds in, the public key's root out.
VECTORS = [
    ("SLH-DSA-SHA2-128s", "173D04C938C1C36BF289C3C022D04B14", "63AE23C41AA546DA589774AC20B745C4",
     "0D794777914C99766827F0F09CA972BE", "0162C10219D422ADBA1359E6AA65299C"),
    ("SLH-DSA-SHAKE-128s", "C151951F3811029239B74ADD24C506AF", "DD30363E156E6FE936EC6ED0231FEB5C",
     "529FFE86200D1F32C2B60D0CD909F190", "0761F9B727AFA724B47223016BB5B2BA"),
]
for name, sk_seed, sk_prf, pk_seed, root in VECTORS:
    S = Scheme(name)
    sk, pk = S.keygen(bytes.fromhex(sk_seed), bytes.fromhex(sk_prf), bytes.fromhex(pk_seed))
    print(name, "public key", len(pk), "bytes, root matches NIST:", pk[16:].hex().upper() == root)

for name in ("SLH-DSA-SHAKE-128s", "SLH-DSA-SHAKE-128f"):
    S = Scheme(name)
    sk, pk = S.keygen(bytes(16), bytes(range(16)), bytes(range(16, 32)))
    sig = S.sign(b"Arcadia City boot loader 1.0", sk, ctx=b"boot")
    print(name, "signature", len(sig), "bytes; verifies:",
          S.verify(b"Arcadia City boot loader 1.0", sig, pk, ctx=b"boot"),
          "; other message:", S.verify(b"Arcadia City boot loader 1.1", sig, pk, ctx=b"boot"))
```

It prints:

```
SLH-DSA-SHA2-128s public key 32 bytes, root matches NIST: True
SLH-DSA-SHAKE-128s public key 32 bytes, root matches NIST: True
SLH-DSA-SHAKE-128s signature 7856 bytes; verifies: True ; other message: False
SLH-DSA-SHAKE-128f signature 17088 bytes; verifies: True ; other message: False
```

Key generation builds only the top XMSS tree: 512 WOTS+ keys for 128s, about 300,000 hash calls.
Signing builds seven trees and fourteen FORS trees, about two million; in this Python it takes
a few seconds for 128s and a fraction of a second for 128f. Optimized C code with hardware
SHA-256 signs 128s in a few tenths of a second and 128f in a few milliseconds.

## 12.8 How security wears down

*Level: intermediate.*

Because FORS keys are chosen at random, some are used more than once. How much does that cost?
The listing estimates the security left against a forger who tries hash after hash, for a FORS
key that has signed $s$ digests.

```python
# FORS is a few-time signature: how fast does it weaken as one FORS key signs more digests?
import math
def bits_after(s, a, k):
    """Security in bits against a forger who hashes trial messages: each trial digest picks
    one leaf in each of k trees of 2^a leaves, and is forgeable only if every chosen leaf
    has already been revealed by one of the s signatures."""
    revealed = 1 - (1 - 2 ** -a) ** s          # chance a given leaf has been revealed
    return -k * math.log2(revealed)
for name, a, k in (("128s", 12, 14), ("128f", 6, 33), ("256s", 14, 22)):
    print(name, " ".join(f"s={s}: {bits_after(s, a, k):5.1f}" for s in (1, 2, 4, 8, 16, 64)))
# With 2^64 signatures spread at random over the 2^h FORS keys of 128s (h = 63),
# the number of signatures on one key is roughly Poisson with mean 2^64 / 2^63 = 2.
mean = 2 ** 64 / 2 ** 63
p_many = 1 - sum(math.exp(-mean) * mean ** j / math.factorial(j) for j in range(9))
print("128s, after 2^64 signatures: share of FORS keys used more than 8 times: %.1e" % p_many)
```

It prints:

```
128s s=1: 168.0 s=2: 154.0 s=4: 140.0 s=8: 126.0 s=16: 112.0 s=64:  84.2
128f s=1: 198.0 s=2: 165.4 s=4: 133.1 s=8: 101.6 s=16:  71.5 s=64:  21.6
256s s=1: 308.0 s=2: 286.0 s=4: 264.0 s=8: 242.0 s=16: 220.0 s=64: 176.1
128s, after 2^64 signatures: share of FORS keys used more than 8 times: 2.4e-04
```

For 128s, eight signatures on one FORS key still leave about 126 bits, and after the maximum
of $2^{64}$ signatures only a tiny share of keys has been used more than eight times. The "f"
sets have smaller FORS trees and wear faster per use, but their larger $h$ spreads the
signatures thinner. This simple estimate ignores that a forger can aim at whichever FORS key
has been used most; the SPHINCS+ security analysis accounts for that, and the parameters were
chosen so that the total stays above the category's target for $2^{64}$ signatures.

**What if a key signs more than $2^{64}$ messages?** Nothing breaks suddenly; security declines
gradually as more FORS keys are reused. But $2^{64}$ is beyond any realistic use: signing a
million messages a second would take more than half a million years. SP 800-230 (initial public
draft, April 2026) goes the other way, proposing parameter sets for applications that sign far
fewer messages, with smaller signatures in return; read the draft for its exact sets and limits.

## 12.9 Break it: faults

*Level: intermediate.*

SLH-DSA's statelessness has a hidden assumption: an upper-layer WOTS+ key always signs the
same tree root. That holds only if the root is computed correctly. Suppose a fault, a glitch
in the power supply or a cosmic-ray bit flip, corrupts the computation of a lower tree's root
during signing. The WOTS+ key one layer up then signs a *wrong* root. The next correct
signature through the same key signs the right one. Now one WOTS+ key has signed two different
messages, which is exactly the reuse of Chapter 11, and the attacker can forge a WOTS+
signature on a root of its own choosing. It then builds its own tree under that root and signs
anything. Castelnovi, Martinelli and Prest called this "grafting trees" (PQCrypto 2018), and
Genêt, Kannwischer, Pelletier and McLauchlan demonstrated it with voltage glitches on a
microcontroller (2018).

**Fix it.** Verify every signature before releasing it (a fault will almost certainly make it
invalid), or compute the vulnerable parts twice and compare. Both cost time, but signing is
already slow, and verification is cheap by comparison. Devices that sign in hostile physical
conditions, like a satellite or anything in reach of an attacker with a soldering iron, should
do both. Randomized signing (the default) also helps, since the attacker cannot replay the
exact same signing path.

## 12.10 Using it

*Level: expert.*

The external interface matches ML-DSA's (Chapter 9): a context string of up to 255 bytes,
a leading byte 0 for pure SLH-DSA, and **HashSLH-DSA** with byte 1 and a hash function's
object identifier for pre-hashing. Signing is randomized by default with an $n$-byte
`addrnd`; with no randomness (deterministic signing) the public seed takes its place in the
message PRF. Each parameter set is a separate algorithm with its own identifier in
certificates.

Which to choose? For most uses where SLH-DSA is chosen at all, the point is conservatism, so
**SLH-DSA-128s or -256s** for long-lived keys that sign rarely (root certificates, firmware
release keys), and an "f" set only where signing speed matters more than size. SHA-2 sets where
SHA-256 is fast in hardware, which is most processors today; SHAKE sets for simplicity or
where SHA-3 hardware exists.

## 12.11 In the real world

*Level: expert.*

**Where it fits.** Signatures of 8 to 50 kilobytes rule SLH-DSA out of TLS handshakes, but not
out of places where a signature is checked rarely and must hold for decades: root certificate
keys, which sign only intermediate certificates; firmware and boot loaders; signed software
releases; and documents meant to stay verifiable for a lifetime. OpenSSL 3.5 (April 2025)
includes SLH-DSA, as do several other major libraries. NSA's CNSA 2.0 does not include it; for
hash-based signatures it uses LMS and XMSS (Chapter 11).

**As insurance.** SLH-DSA's main value in NIST's portfolio is diversity. If a breakthrough
against structured lattices ever weakened ML-DSA and FN-DSA, SLH-DSA would be unaffected, and
systems that already support it would have somewhere to go. A few proposals sign with both ML-DSA
and SLH-DSA for that reason.

**Mars.** Arcadia City's root of trust is a single SLH-DSA-256s key, generated at the founding
and kept offline in a vault. It signs perhaps a dozen things a decade: the keys of the ground
stations, the city's certificate authorities, the first boot loader of each new machine. Its
29,792-byte signatures are irrelevant at that rate, signing takes seconds on the vault's
computer, and its security assumes nothing about lattices, which is the point: whatever
happens to the rest of the city's cryptography, the root can still be trusted to sign the
replacements.

## 12.12 Going deeper

*Level: expert.*

- **The SPHINCS+ submission** (version 3.1, 2022) has the full security analysis and the
  reasoning behind each parameter.
- **Tweakable hash functions.** Bernstein, Hülsing, Kölbl, Niederhagen, Rijneveld and Schwabe,
  "The SPHINCS+ Signature Framework" (CCS 2019), introduces the abstraction and its proofs.
- **The SHA-256 category 5 issue.** Perlner, Kelsey and Cooper, "Breaking Category Five
  SPHINCS+ with SHA-256" (PQCrypto 2022).
- **Faults.** Castelnovi, Martinelli and Prest, "Grafting Trees: a Fault Attack against the
  SPHINCS framework" (PQCrypto 2018); Genêt, Kannwischer, Pelletier and McLauchlan, "Practical
  Fault Injection Attacks on SPHINCS" (2018).
- **Smaller variants.** Work on SPHINCS+C (compressed) and on parameters for limited numbers of
  signatures, which fed into SP 800-230.

## Check yourself

??? question "1. Why does a stateless scheme built from one-time keys alone need about 2^255 leaves?"

    With $q = 2^{64}$ random choices among $L$ leaves, the chance of a repeat is about
    $q^2/(2L)$. A repeat of a one-time key may be fatal, so it must be negligible, around
    $2^{-128}$, which needs $L \approx 2^{128+128-1} = 2^{255}$.

??? question "2. What does FORS reveal when it signs, and how many bytes is a FORS signature for 128s?"

    One secret leaf in each of $k$ trees, each with an authentication path of $a$ nodes:
    $k(a+1)$ values of $n$ bytes, $14 \times 13 \times 16 = 2{,}912$ bytes.

??? question "3. Why can the upper-layer WOTS+ keys be one-time, when the signer chooses leaves at random?"

    Each upper WOTS+ key always signs the same message, the root of the fixed tree below
    it, so it never signs two different messages however often it is used.

??? question "4. What is the purpose of the 32-byte address in every hash call?"

    It makes each hash call unique (with the public seed, unique across keys), so an attacker
    cannot attack many hash outputs at once: a second preimage for one call does not help
    with any other.

??? question "5. Compute the hypertree part of an SLH-DSA-128s signature."

    $d = 7$ layers, each a WOTS+ signature of $2n + 3 = 35$ values plus $h' = 9$ path nodes:
    $7 \times 44 \times 16 = 4{,}928$ bytes.

??? question "6. What is the difference between the s and f parameter sets?"

    "s" uses fewer, taller XMSS layers: smaller signatures, much more work to sign. "f" uses
    many short layers: bigger signatures, much faster signing.

??? question "7. Why do the SHA-2 sets at categories 3 and 5 use SHA-512 for some functions?"

    SHA-256's 256-bit internal state made multi-target attacks on category 5 cheaper than
    intended (Perlner, Kelsey and Cooper, 2022); SHA-512 restores the margin.

??? question "8. How does a fault during signing lead to a forgery?"

    A corrupted lower root gets signed by an upper WOTS+ key that also signs the correct root
    in other signatures: two messages under one one-time key. The attacker forges that WOTS+
    signature on its own root and grafts its own tree below.

??? question "9. Why is SLH-DSA not used in TLS handshakes?"

    Its signatures are 7,856 bytes at the smallest, and a handshake carries several
    signatures; signing is also slow for a busy server. ML-DSA and Falcon fit better.

??? question "10. What does SLH-DSA add to NIST's portfolio that ML-DSA does not?"

    Security that rests only on hash functions, independent of any lattice assumption: a
    fallback if structured lattices are ever weakened.

## What you learned

- SLH-DSA is stateless: a hypertree so large that leaves can be chosen at random.
- FORS at the bottom is a few-time signature whose security wears down slowly with reuse;
  the upper layers are one-time keys that only ever sign fixed roots.
- Tweakable hashes with a 32-byte address make every hash call unique.
- Twelve parameter sets: 128, 192, 256 bits; "s" and "f"; SHA-2 and SHAKE. Signatures run from
  7,856 to 49,856 bytes; public keys are 32 to 64 bytes.
- A complete implementation fits in about 270 lines and matches all of NIST's FIPS 205 test
  vectors.
- Faults can make an upper WOTS+ key sign twice; verifying before release defends against it.
- SLH-DSA's role is conservative, long-lived trust: root keys, firmware, insurance.

**Next:** [Chapter 13](13-Code-Based-Encryption-McEliece.md), code-based encryption and Classic McEliece, the oldest public-key
system still unbroken.

## Further reading

- NIST, FIPS 205, *Stateless Hash-Based Digital Signature Standard* (13 August 2024).
- Daniel J. Bernstein, Daira Hopwood, Andreas Hülsing, Tanja Lange, Ruben Niederhagen, Louiza
  Papachristodoulou, Michael Schneider, Peter Schwabe and Zooko Wilcox-O'Hearn, "SPHINCS:
  practical stateless hash-based signatures" (EUROCRYPT 2015).
- Daniel J. Bernstein, Andreas Hülsing, Stefan Kölbl, Ruben Niederhagen, Joost Rijneveld and
  Peter Schwabe, "The SPHINCS+ Signature Framework" (ACM CCS 2019).
- Jean-Philippe Aumasson and others, *SPHINCS+: Submission to the NIST post-quantum project*,
  version 3.1 (2022).
- Oded Goldreich, "Two Remarks Concerning the Goldwasser-Micali-Rivest Signature Scheme"
  (CRYPTO 1986).
- Ray Perlner, John Kelsey and David Cooper, "Breaking Category Five SPHINCS+ with SHA-256"
  (PQCrypto 2022).
- Laurent Castelnovi, Ange Martinelli and Thomas Prest, "Grafting Trees: a Fault Attack against
  the SPHINCS framework" (PQCrypto 2018).
- NIST SP 800-230 (initial public draft, April 2026), additional SLH-DSA parameter sets.
- The NIST ACVP-Server repository (github.com/usnistgov/ACVP-Server), FIPS 205 test files.
