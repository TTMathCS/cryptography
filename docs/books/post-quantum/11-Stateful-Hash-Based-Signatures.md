# 11. Stateful Hash-Based Signatures: LMS and XMSS

*Every signature scheme in this book so far needs a hard mathematical problem as well as a
hash function. Hash-based signatures need only the hash function. If SHA-256 keeps its
basic properties, they are secure against any computer, quantum or not, and nothing about
lattices, codes or isogenies can change that. The price is a strange rule: each key can sign
only a fixed number of messages, and the signer must remember which one-time keys it has
used. This chapter builds the two standardized stateful schemes. You will see how Winternitz
hash chains shrink Lamport's signature, how a Merkle tree puts thousands of one-time keys
under one public key, rebuild a published LMS public key from its seed byte for byte,
forge a signature on "open all airlocks" after a one-time key is used eight times, and see
why NIST requires these schemes to run inside hardware modules.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Winternitz one-time signatures trade hashing time for size, and why they need a
      checksum;
    - how a Merkle tree turns many one-time keys into one many-time public key;
    - the LMS and HSS schemes of RFC 8554, with code that matches the RFC's test case;
    - why the state is everything, and what happens when it is lost;
    - how XMSS and XMSS^MT differ from LMS and HSS;
    - what NIST SP 800-208 and NSA's CNSA 2.0 require, and where these schemes are used.

    **You need:** [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (Lamport signatures and
    hash functions as a hard problem); the properties of hash functions from Book 1,
    [Chapter 9](../../book/09-Hash-Functions.md). Book 1's
    [Chapter 22](../../book/22-Hash-and-Code-Based.md) is a gentler first look.

    **Levels:** §11.1 to §11.4 are for beginners, §11.5 to §11.8 are intermediate, §11.9 and
    §11.10 are expert.

## 11.1 The problem

*Level: beginner.*

Imagine a device that will be in service for 20 years and accepts software only if it
carries a valid signature from its maker. Its public key is burned into it at the factory and
can never change. If the signature scheme is broken in year 12, by a quantum computer or by a
new mathematical attack, every device can be fed malicious software and there is no fix.
Firmware signing is where the choice of scheme matters most, and where the most conservative
choice wins.

The most conservative assumption in cryptography is that a good hash function is hard to
invert and hard to find collisions in. Grover's algorithm (Chapter 1) only square-roots the
cost of inversion, and even quantum collision search gains little in practice. Lamport showed
in 1979 that a signature can be built from a hash alone (Chapter 4). His signatures are big
and work only once. Two ideas fix that: Winternitz chains for size, and Merkle trees for
number. Combined, they give LMS and XMSS, both standardized and both approved by NIST since
2020.

## 11.2 Winternitz chains

*Level: beginner.*

Lamport signs each bit of a 256-bit digest separately, revealing one of two secrets per bit:
256 secrets of 32 bytes, an 8-kilobyte signature. Robert Winternitz's idea, published by
Merkle in 1989, signs several bits at once with a hash **chain**.

Pick $w$, the number of bits per digit (say $w = 4$, so digits run from 0 to 15). For each
digit position, choose a secret $x$ and publish the end of a chain of 15 hashes:

$$x \;\to\; H(x) \;\to\; H^2(x) \;\to\; \cdots \;\to\; H^{15}(x) = y.$$

To sign a digit $a$, reveal $H^a(x)$. The verifier hashes it $15 - a$ more times and checks
that it reaches $y$. A 256-bit digest has 64 four-bit digits, so the signature is 64 chain
values instead of 256.

There is a catch. Anyone who sees $H^a(x)$ can compute $H^{a+1}(x)$, and so can sign any
*larger* digit in that position. To stop that, the signer also signs a **checksum**: the sum
of $15 - a_i$ over all digits. If a forger increases any message digit, the checksum goes
down, and signing a smaller checksum digit would require going *back* up a chain, which means
inverting the hash. With $w = 4$ the checksum needs three more digits, for 67 chains in all.

<div class="mars-steps" markdown>

**A two-digit Winternitz signature by hand** ($w = 2$, digits 0 to 3).

1. Message digits $(2, 1)$. Checksum $= (3 - 2) + (3 - 1) = 3$, one more digit: $3$.
2. Reveal $H^2(x_1)$, $H^1(x_2)$ and $H^3(x_3)$.
3. A forger wants $(3, 1)$: it can compute $H^3(x_1)$ from $H^2(x_1)$. But the checksum of
   $(3, 1)$ is $0 + 2 = 2$, and it needs $H^2(x_3)$, one step *before* the $H^3(x_3)$ it has.
4. Every increase of a message digit forces a decrease of the checksum, so the forger is stuck.

</div>

| $w$ | chains for SHA-256 (LMS: $p$) | signature (one-time part) | hashes to verify (worst case) |
|---|---|---|---|
| 1 | 265 | 8,516 B | 265 |
| 2 | 133 | 4,292 B | 399 |
| 4 | 67 | 2,180 B | 1,005 |
| 8 | 34 | 1,124 B | 8,670 |

*Table 11.1. The LM-OTS parameter sets of RFC 8554 with $n = 32$: signature = 4-byte type,
32-byte randomizer and $32p$ bytes of chain values. Larger $w$ halves the size and multiplies
the hashing.*

$w = 4$ and $w = 8$ are the usual choices. Verification of $w = 8$ hashes thousands of times,
which is still well under a millisecond in hardware.

## 11.3 Merkle trees: many keys, one root

*Level: beginner.*

A one-time key signs one message. To sign $2^h$ messages, generate $2^h$ one-time keys and hash
their public keys into a binary tree: each parent is the hash of its two children. The root of
the tree, 32 bytes, is the public key. Ralph Merkle proposed this in his 1979 thesis, and it
is the idea behind every hash-based signature since.

To sign message number $q$, use one-time key $q$, and include the **authentication path**: the
$h$ sibling nodes on the way from leaf $q$ to the root. The verifier recomputes the one-time
public key from the signature, hashes up the path, and checks that it arrives at the root.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="A Merkle tree with eight leaves, each the hash of a one-time public key; the root is the public key; the authentication path for leaf 5 is highlighted: its sibling leaf 4, the node over leaves 6 and 7, and the node over leaves 0 to 3" fill="currentColor" font-size="13">
<rect x="280" y="10" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="294" y="29">root T[1]</text>
<g stroke="currentColor"><line x1="320" y1="38" x2="160" y2="72"/><line x1="320" y1="38" x2="480" y2="72"/></g>
<rect x="120" y="72" width="80" height="26" rx="4" class="acc" fill="none" stroke-width="2.2"/><text x="140" y="90" class="acc-fill">T[2]</text>
<rect x="440" y="72" width="80" height="26" rx="4" fill="none" stroke="currentColor"/><text x="460" y="90">T[3]</text>
<g stroke="currentColor"><line x1="160" y1="98" x2="80" y2="132"/><line x1="160" y1="98" x2="240" y2="132"/><line x1="480" y1="98" x2="400" y2="132"/><line x1="480" y1="98" x2="560" y2="132"/></g>
<g fill="none" stroke="currentColor"><rect x="45" y="132" width="70" height="26" rx="4"/><rect x="205" y="132" width="70" height="26" rx="4"/><rect x="365" y="132" width="70" height="26" rx="4"/></g>
<rect x="525" y="132" width="70" height="26" rx="4" class="acc" fill="none" stroke-width="2.2"/>
<text x="62" y="150">T[4]</text><text x="222" y="150">T[5]</text><text x="382" y="150">T[6]</text><text x="542" y="150" class="acc-fill">T[7]</text>
<g stroke="currentColor"><line x1="400" y1="158" x2="360" y2="192"/><line x1="400" y1="158" x2="440" y2="192"/></g>
<g fill="none" stroke="currentColor"><rect x="20" y="192" width="50" height="26" rx="4"/><rect x="95" y="192" width="50" height="26" rx="4"/><rect x="180" y="192" width="50" height="26" rx="4"/><rect x="255" y="192" width="50" height="26" rx="4"/><rect x="415" y="192" width="50" height="26" rx="4" stroke-width="2.4"/><rect x="495" y="192" width="50" height="26" rx="4"/><rect x="570" y="192" width="50" height="26" rx="4"/></g>
<rect x="335" y="192" width="50" height="26" rx="4" class="acc" fill="none" stroke-width="2.2"/>
<text x="30" y="210">key 0</text><text x="105" y="210">key 1</text><text x="190" y="210">key 2</text><text x="265" y="210">key 3</text>
<text x="345" y="210" class="acc-fill">key 4</text><text x="425" y="210" font-weight="bold">key 5</text><text x="505" y="210">key 6</text><text x="580" y="210">key 7</text>
<text x="20" y="248">Signing with key 5 sends its one-time signature and the accent nodes: key 4's leaf, T[7], T[2].</text>
</svg>
<figcaption>Figure 11.1. A Merkle tree of height 3 holds eight one-time keys under one 32-byte root. A signature with leaf 5 carries the three accent nodes, enough for the verifier to hash its way up to the root. Each key may be used once; the signer must remember which.</figcaption>
</figure>

The signature grows by only $32h$ bytes: 320 bytes for $2^{10} = 1{,}024$ signatures, 640
bytes for a million. The cost is at key generation: all $2^h$ one-time public keys must be
computed to find the root. A tree of height 20 means a million one-time keys, each needing
about a thousand hashes with $w = 4$, so about a billion hashes: minutes in hardware.

**HSS**, the Hierarchical Signature System, avoids that by stacking trees. The top tree's
one-time keys sign the roots of lower trees, which sign messages. Only the top tree must exist
at the start; a lower tree is generated when the one above it is used up. Two levels of height
10 give a million signatures with two small trees in memory, at the cost of signatures twice
as long. XMSS^MT does the same for XMSS.

## 11.4 Why "stateful"

*Level: beginner.*

Each one-time key must sign at most one message. So the signer must keep a counter, the
**state**: the index of the next unused key. Signing must read the counter, advance it, and
save it *before* releasing the signature. If the counter is ever rolled back, keys are used
twice.

This is a new kind of risk. Ordinary signing keys are static: copy them, back them up,
restore them, run them on two servers for availability, and nothing bad happens. With a
stateful scheme each of those normal operations can be fatal. Restoring a backup of the key
and counter from last week means reusing a week's worth of keys. Cloning a virtual machine
that holds the key gives two signers with the same counter. A crash between signing and saving
the counter may reuse one key. §11.7 shows how quickly reuse turns into forgery.

That is why these schemes are used where signing is rare and centralized, like firmware
releases, and why their standards insist on hardware that enforces the state.

## 11.5 LMS as specified

*Level: intermediate.*

The Leighton-Micali scheme goes back to a 1995 patent by Tom Leighton and Silvio Micali.
David McGrew, Michael Curcio and Scott Fluhrer specified it for the IETF as RFC 8554 (April
2019), with HSS on top. Its details are few:

- **Hashing with tags.** Every hash call starts with a 16-byte key identifier $I$, the
  leaf number $q$ and a short field saying what is being hashed: a chain step $(i, j)$, a
  public key (`0x8080`), a message (`0x8181`), a leaf (`0x8282`) or an interior node
  (`0x8383`). No two hash calls in the whole system hash the same kind of input, which blocks
  attacks that look for a match among many targets at once.
- **Randomized messages.** The signer hashes a 32-byte randomizer $C$ with the message, so a
  forger cannot choose the digest in advance.
- **Private keys from a seed.** Appendix A of the RFC derives each chain's secret as $x_{q,i} =
  H(I \,\|\, q \,\|\, i \,\|\, \texttt{0xff} \,\|\, \mathit{SEED})$, so a private key is only a seed
  and an identifier.

**Code it.** LM-OTS and LMS with SHA-256, $n = 32$ and $w = 4$, exactly as RFC 8554 writes
them.

```python
# LMS and LM-OTS (RFC 8554, NIST SP 800-208) with SHA-256, n = 32, Winternitz w = 4.
import hashlib
N, W, P, LS = 32, 4, 67, 4                 # LMOTS_SHA256_N32_W4: 67 chains of 15 steps
D_PBLC, D_MESG, D_LEAF, D_INTR = b"\x80\x80", b"\x81\x81", b"\x82\x82", b"\x83\x83"

def H(*parts):
    return hashlib.sha256(b"".join(parts)).digest()

def u32(x): return x.to_bytes(4, "big")
def u16(x): return x.to_bytes(2, "big")

def digits(Q):                             # the message hash in base 16, plus a checksum
    d = [(Q[i // 2] >> (4 * (1 - i % 2))) & 15 for i in range(2 * N)]
    cksm = sum(15 - x for x in d) << LS
    c = u16(cksm)
    return d + [(c[i // 2] >> (4 * (1 - i % 2))) & 15 for i in range(P - 2 * N)]

def chain(I, q, i, x, start, stop):        # apply the hash stop - start times
    for j in range(start, stop):
        x = H(I, u32(q), u16(i), bytes([j]), x)
    return x

def ots_private(I, q, seed):               # RFC 8554, Appendix A
    return [H(I, u32(q), u16(i), b"\xff", seed) for i in range(P)]

def ots_public(I, q, x):
    return H(I, u32(q), D_PBLC, *[chain(I, q, i, xi, 0, 15) for i, xi in enumerate(x)])

def ots_sign(I, q, x, msg, C):
    a = digits(H(I, u32(q), D_MESG, C, msg))
    return C, [chain(I, q, i, x[i], 0, a[i]) for i in range(P)]

def ots_candidate_key(I, q, msg, sig):     # verification recomputes the public key
    C, y = sig
    a = digits(H(I, u32(q), D_MESG, C, msg))
    return H(I, u32(q), D_PBLC, *[chain(I, q, i, y[i], a[i], 15) for i in range(P)])

def lms_keygen(I, seed, h):
    """Build the Merkle tree over 2^h one-time keys; return all nodes (T[1] is the root)."""
    T = {}
    for q in range(2 ** h):
        T[2 ** h + q] = H(I, u32(2 ** h + q), D_LEAF, ots_public(I, q, ots_private(I, q, seed)))
    for r in range(2 ** h - 1, 0, -1):
        T[r] = H(I, u32(r), D_INTR, T[2 * r], T[2 * r + 1])
    return T

def lms_sign(I, seed, T, h, q, msg, C):
    path = [T[(2 ** h + q) >> k ^ 1] for k in range(h)]   # sibling at each level
    return q, ots_sign(I, q, ots_private(I, q, seed), msg, C), path

def lms_verify(I, root, h, msg, sig):
    q, ots_sig, path = sig
    node = H(I, u32(2 ** h + q), D_LEAF, ots_candidate_key(I, q, msg, ots_sig))
    r = 2 ** h + q
    for sibling in path:
        node = H(I, u32(r // 2), D_INTR, *((sibling, node) if r & 1 else (node, sibling)))
        r //= 2
    return node == root
```

RFC 8554's Test Case 2 publishes the seed and identifier of a two-level HSS key, and its
public key. The top tree has height 10 and Winternitz $w = 4$. Rebuilding it from the seed
means computing all 1,024 one-time public keys and the tree above them:

```python
# Uses lms_keygen() from the listing above.
# RFC 8554, Appendix F, Test Case 2: rebuild the top tree (h = 10, 1,024 one-time keys)
# from its published SEED and I, and compare the root with the published public key K.
SEED = bytes.fromhex("558b8966c48ae9cb898b423c83443aae014a72f1b1ab5cc85cf1d892903b5439")
I = bytes.fromhex("d08fabd4a2091ff0a8cb4ed834e74534")
K = bytes.fromhex("32a58885cd9ba0431235466bff9651c6c92124404d45fa53cf161c28f1ad5a8e")
T = lms_keygen(I, SEED, 10)
print("root of the rebuilt tree:", T[1].hex()[:32], "...")
print("matches RFC 8554:", T[1] == K)
print("hash calls used:", 1024 * (67 + 67 * 15 + 2) + 1023)
```

It prints:

```
root of the rebuilt tree: 32a58885cd9ba0431235466bff9651c6 ...
matches RFC 8554: True
hash calls used: 1100799
```

A million hash calls, and the 32-byte root matches the RFC exactly: every tag, every
counter and the checksum must be right for that to happen. On a laptop it takes about a
second in Python, which shows why key generation for large trees is the slow part.

## 11.6 Signing and keeping the state

*Level: intermediate.*

With the tree built, signing is cheap: compute one one-time signature (at most 1,005 hashes)
and copy $h$ nodes from the stored tree. The listing signs three log entries with a tree of
height 5 (32 signatures) and keeps the counter by hand.

```python
# Uses lms_keygen(), lms_sign() and lms_verify() from the listing above.
import hashlib
I, SEED, HEIGHT = hashlib.sha256(b"I").digest()[:16], hashlib.sha256(b"seed").digest(), 5
T = lms_keygen(I, SEED, HEIGHT)
root = T[1]
state = 0                                   # the next unused one-time key: MUST be saved
for msg in (b"log 1", b"log 2", b"log 3"):
    sig = lms_sign(I, SEED, T, HEIGHT, state, msg, hashlib.sha256(msg).digest())
    state += 1
    print(msg.decode(), "signed with key", sig[0], "-> verifies:", lms_verify(I, root, HEIGHT, msg, sig),
          " on 'log 9':", lms_verify(I, root, HEIGHT, b"log 9", sig))
size = 4 + (4 + 32 + 67 * 32) + 4 + 32 * HEIGHT
print("signature size:", size, "bytes; signatures left:", 2 ** HEIGHT - state)
```

It prints:

```
log 1 signed with key 0 -> verifies: True  on 'log 9': False
log 2 signed with key 1 -> verifies: True  on 'log 9': False
log 3 signed with key 2 -> verifies: True  on 'log 9': False
signature size: 2348 bytes; signatures left: 29
```

An LMS signature with $w = 4$ and $h = 5$ is 2,348 bytes: the leaf number, the one-time
signature (2,180 bytes), the tree type and five path nodes. With $h = 10$ it is 2,508 bytes,
with $h = 20$ 2,828. Public keys are 56 bytes: two type codes, $I$ and the root. Nothing in
post-quantum cryptography has a smaller public key.

In real systems the counter is the hard part. A careful signer:

1. reads the counter $q$ and writes $q + 1$ to durable storage, and confirms the write;
2. only then computes and releases the signature with key $q$;
3. never copies the private key and counter to another place that might sign;
4. treats a crash between steps 1 and 2 as having used key $q$ (skipping a key is harmless;
   reusing one is not).

## 11.7 Break it: reusing a one-time key

*Level: intermediate.*

What does an attacker gain from a reused key? Each signature reveals, for every chain, the
value at the step given by that message's digit. From several signatures under the same key,
the attacker knows each chain from the *lowest* step any of them revealed, and can hash
forward from there. It can then sign any message whose every digit, including the checksum
digits, is at least that lowest step. Since the attacker chooses the randomizer $C$, it can
try one $C$ after another until a target message's digits fit.

**Break it.** A signer whose state was restored from a backup signs eight routine reports with
the same one-time key. The attacker forges a signature on a message the signer never saw.

```python
# Uses ots_private(), ots_sign() and chain() from the listing above.
# Break it: one one-time key used for eight messages (say, a state file restored from a
# backup). An attacker who sees the signatures can sign messages the owner never signed.
import hashlib
I, SEED, q = hashlib.sha256(b"I2").digest()[:16], hashlib.sha256(b"seed2").digest(), 7
x = ots_private(I, q, SEED)
public = ots_public(I, q, x)
seen = []
for k in range(8):
    C = hashlib.sha256(b"C%d" % k).digest()
    msg = b"routine report %d" % k
    seen.append((digits(H(I, u32(q), D_MESG, C, msg)), ots_sign(I, q, x, msg, C)[1]))
# For each chain, the attacker knows the value at the lowest step any signature revealed,
# and can hash forward from there to any later step.
low = [min(range(8), key=lambda s: seen[s][0][i]) for i in range(P)]
target = b"open all airlocks"
for tries in range(1, 200001):
    C = hashlib.sha256(b"forge%d" % tries).digest()     # the forger picks C freely
    a = digits(H(I, u32(q), D_MESG, C, target))
    if all(a[i] >= seen[low[i]][0][i] for i in range(P)):
        y = [chain(I, q, i, seen[low[i]][1][i], seen[low[i]][0][i], a[i]) for i in range(P)]
        break
print("forgery found after", tries, "tries")
print("forged signature on \"" + target.decode() + "\" accepted:", ots_candidate_key(I, q, target, (C, y)) == public)
```

It prints:

```
forgery found after 204 tries
forged signature on "open all airlocks" accepted: True
```

Two hundred hash computations of trial digests, a fraction of a second, and a valid signature
on "open all airlocks". With fewer reuses the search is longer: with only two signatures
under one key and $w = 4$, a rough estimate is $2^{34}$ tries, billions of hashes, which is
hours on a laptop, not years.
There is no safety margin. One reuse already weakens a key to far below its claimed level;
several reuses break it outright.

**Fix it.** There is no cryptographic fix: the scheme is secure exactly as long as the state
is kept. The practical fixes are the four rules of §11.6, enforced in hardware, plus two
design habits:

- **Partition the tree.** Give each signing device its own range of leaves (or its own
  lower tree in HSS), so two devices can never pick the same leaf even if they never
  coordinate.
- **Prefer stateless schemes where state cannot be guaranteed.** SLH-DSA (Chapter 12) uses
  the same building blocks with no state, at the cost of signatures several times larger.

## 11.8 XMSS and the differences

*Level: intermediate.*

XMSS (Buchmann, Dahmen and Hülsing, PQCrypto 2011), standardized in RFC 8391 (May 2018),
has the same shape as LMS: Winternitz one-time keys under a Merkle tree, with XMSS^MT as the
multi-tree version. The differences are in how the hashing is done.

- **WOTS+.** XMSS uses Hülsing's WOTS+ (2013), which XORs a pseudorandom **bitmask** into
  each chain step and node hash. The bitmasks let the security proof rely on second-preimage
  resistance of a keyed hash family rather than on collision resistance.
- **L-trees.** The 67 chain ends of a WOTS+ public key are compressed by a small binary tree
  (an L-tree) instead of one hash call.
- **Proofs.** XMSS has tight security proofs in the standard model for a keyed-hash family;
  LMS's analysis is in the random oracle model. In practice both are considered secure with
  SHA-256 and SHAKE256.
- **Sizes and speed.** Very similar. XMSS-SHA2_10_256 has 2,500-byte signatures and 68-byte
  public keys (a type code, the root and a public seed); LMS with the same height and $w$ has
  2,508 and 56. LMS is
  simpler and somewhat faster, because it uses fewer hash calls per step.

| | LMS / HSS | XMSS / XMSS^MT |
|---|---|---|
| specification | RFC 8554 (2019) | RFC 8391 (2018) |
| one-time scheme | LM-OTS | WOTS+ (with bitmasks) |
| multi-tree | HSS (up to 8 levels) | XMSS^MT |
| hashes in SP 800-208 | SHA-256, SHA-256/192, SHAKE256 (32 and 24 bytes) | same |
| signature, $h = 10$, $w = 4$, $n = 32$ | 2,508 B | 2,500 B |
| public key | 56 B | 68 B |

*Table 11.2. LMS and XMSS compared. SP 800-208 approves both, with the hash output truncated
to 24 bytes as an option for smaller signatures.*

## 11.9 Standards and practice

*Level: expert.*

**NIST SP 800-208** (October 2020), *Recommendation for Stateful Hash-Based Signature
Schemes*, approves LMS, HSS, XMSS and XMSS^MT with SHA-256, SHA-256/192 and SHAKE256 at 192 and
256 bits. It adds a rule found nowhere else in NIST's signature standards: key generation and
signing must be done in hardware cryptographic modules that do not allow the private key to
be exported, so that copying the state is impossible by design. It also allows distributing a
multi-tree key across several modules, each with its own subtrees, which is the partitioning
of §11.7. Verification may happen anywhere.

**NSA's CNSA 2.0** (2022) approves LMS and XMSS, with SP 800-208's parameters, for software and
firmware signing, and expects them to be used there first. This is the main reason stateful
schemes are being deployed now, ahead of ML-DSA in some products: firmware signing is done by
a handful of release servers, which can manage state, while verification happens in millions
of devices that can never change their keys.

**Where they are used.** Secure-boot and firmware-update chains in servers, network
equipment and embedded chips; hardware security modules with LMS support; some code-signing
systems. Their verification code is tiny, a hash function and a loop, which suits a boot ROM
that cannot be patched.

**Mars.** The relay satellites between Arcadia City and Earth accept new software only with an
LMS signature from a key that was fixed when they were built. That key is an HSS key in a
hardware module at the ground station; each release uses one leaf; the module's counter is the
only copy of the state. With two levels of height 10, the satellites' key can sign a million
releases, far more than they will ever receive, and their verification needs nothing but
SHA-256, which their radiation-hardened processors already run for checksums.

## 11.10 Going deeper

*Level: expert.*

- **Security proofs.** Katz's "Analysis of a Proposed Hash-Based Signature Standard" (SSR 2016)
  analyzes LMS; Hülsing's "W-OTS+: Shorter Signatures for Hash-Based Signature Schemes"
  (AFRICACRYPT 2013) and the XMSS papers cover XMSS.
- **State management.** McGrew, Kampanakis, Fluhrer, Gazdag, Butin and Buchmann, "State
  Management for Hash-Based Signatures" (SSR 2016), surveys how state goes wrong in real
  systems and how to prevent it.
- **Fast key generation.** Tree traversal algorithms (Szydlo's, and the BDS algorithm of
  Buchmann, Dahmen and Schneider, 2008) compute authentication paths without storing the whole
  tree.
- **Fault attacks.** Faults during signing can make a one-time key sign two different
  digests, which is a reuse. Castelnovi, Martinelli and Prest (2018) show this for the
  stateless SPHINCS family; the same reasoning applies here.
- **Quantum attacks on hashes.** The best quantum collision algorithms give little real
  speed-up once memory and parallel hardware costs are counted (Bernstein, 2009); second
  preimages lose at most a square root to Grover.

## Check yourself

??? question "1. With w = 4, why does a Winternitz signature need a checksum?"

    A signature on digit $a$ reveals $H^a(x)$, from which anyone can compute $H^{a+1}(x)$
    and sign larger digits. The checksum $\sum (15 - a_i)$ decreases when any digit
    increases, and signing a smaller checksum digit would mean inverting the hash.

??? question "2. What is the one-time part of an LM-OTS signature with w = 8 and n = 32?"

    $p = 34$ chains: $4 + 32 + 34 \times 32 = 1{,}124$ bytes.

??? question "3. How many one-time keys does a Merkle tree of height 15 hold, and how long is the authentication path with n = 32?"

    $2^{15} = 32{,}768$ keys; 15 nodes of 32 bytes, 480 bytes.

??? question "4. Which nodes form the authentication path of leaf 5 in a tree of height 3?"

    The sibling leaf (leaf 4), the node over leaves 6 and 7, and the node over leaves 0 to 3:
    T[12], T[7] and T[2] in RFC 8554's numbering.

??? question "5. Why does a signer write the incremented counter before releasing the signature, not after?"

    If it crashes after releasing but before saving, the restarted signer would reuse the
    key. Saving first means a crash at worst skips a key, which is harmless.

??? question "6. An attacker has two signatures from the same LM-OTS key. What can it sign?"

    Any message (with a randomizer of its choosing) whose every digit, including the
    checksum digits, is at least the smaller of the two revealed digits in that position.
    Finding one takes a search, feasible on ordinary hardware.

??? question "7. What does HSS gain over a single tall tree, and what does it cost?"

    Only the top tree must be generated at the start; lower trees are made when needed, so
    key generation is fast and a huge number of signatures is possible. Each signature carries
    one LMS signature per level, so it is longer.

??? question "8. What extra requirement does SP 800-208 impose that FIPS 204 does not?"

    Key generation and signing must happen in hardware cryptographic modules that do not
    export private keys, so the state cannot be copied.

??? question "9. Why are stateful hash-based signatures a good fit for firmware signing?"

    Signing is rare and done by a few controlled servers that can keep state; verification
    happens in many devices with fixed keys for decades; and the security rests only on the
    hash function.

??? question "10. Name one technical difference between XMSS and LMS."

    XMSS's WOTS+ XORs bitmasks into each hash step and compresses the one-time public key
    with an L-tree; LMS uses tagged hash inputs and one hash for the one-time public key.
    XMSS has standard-model proofs; LMS is analyzed in the random oracle model.

## What you learned

- Hash-based signatures need only a secure hash function, the most conservative assumption
  available.
- Winternitz chains sign $w$ bits per chain; a checksum stops forgers from moving digits up.
- A Merkle tree puts $2^h$ one-time keys under one 32-byte root; signatures carry $h$
  path nodes.
- LMS (RFC 8554) and XMSS (RFC 8391) are the standardized forms; HSS and XMSS^MT stack trees.
- The code here rebuilds RFC 8554's published root from its seed.
- Reusing a one-time key quickly leads to forgeries; the state must be kept in hardware that
  cannot be copied.
- SP 800-208 (2020) approves them; CNSA 2.0 uses them for firmware first.

**Next:** [Chapter 12](12-SLH-DSA.md), SLH-DSA, the stateless hash-based signature of FIPS 205.

## Further reading

- NIST SP 800-208, *Recommendation for Stateful Hash-Based Signature Schemes* (October 2020).
- David McGrew, Michael Curcio and Scott Fluhrer, RFC 8554, *Leighton-Micali Hash-Based
  Signatures* (April 2019).
- Andreas Hülsing, Denis Butin, Stefan-Lukas Gazdag, Joost Rijneveld and Aziz Mohaisen, RFC
  8391, *XMSS: eXtended Merkle Signature Scheme* (May 2018).
- Ralph C. Merkle, "A Certified Digital Signature" (CRYPTO 1989; written 1979).
- Leslie Lamport, "Constructing Digital Signatures from a One Way Function" (SRI technical
  report, 1979).
- Johannes Buchmann, Erik Dahmen and Andreas Hülsing, "XMSS: A Practical Forward Secure
  Signature Scheme Based on Minimal Security Assumptions" (PQCrypto 2011).
- Andreas Hülsing, "W-OTS+: Shorter Signatures for Hash-Based Signature Schemes"
  (AFRICACRYPT 2013).
- David McGrew, Panos Kampanakis, Scott Fluhrer, Stefan-Lukas Gazdag, Denis Butin and Johannes
  Buchmann, "State Management for Hash-Based Signatures" (SSR 2016).
- NSA, *Commercial National Security Algorithm Suite 2.0* (2022) and its FAQ.
