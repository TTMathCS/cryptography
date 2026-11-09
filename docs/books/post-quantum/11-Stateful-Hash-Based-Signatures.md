# 11. Stateful Hash-Based Signatures: LMS and XMSS

*Every signature scheme in this book so far needs a hard mathematical problem as well as a
hash function. Hash-based signatures need only the hash function. If SHA-256 keeps its
basic properties, they are secure against any computer, quantum or not, and nothing about
lattices, codes or isogenies can change that. The price is a strange rule: each key can sign
only a fixed number of messages, and the signer must remember which one-time keys it has
used. This chapter builds the two standardized stateful schemes. You will see how Winternitz
hash chains shrink Lamport's signature, how a Merkle tree puts thousands of one-time keys
under one public key, rebuild a published LMS public key from its seed byte for byte,
forge a signature on "open all airlocks" after a one-time key is used eight times, write
XMSS with its bitmasks and L-tree and check it against a signature from the reference
implementation, work out the sizes and costs of the real parameter sets, and watch a virtual
machine snapshot turn a careful signer into a broken one. The last sections follow the state
into real hardware: what SP 800-208 demands, how firmware vendors and NSA's CNSA 2.0 use these
schemes, and why a probe orbiting Mars needs more than one signing key on two planets.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Winternitz one-time signatures trade hashing time for size, and why they need a
      checksum;
    - how a Merkle tree turns many one-time keys into one many-time public key;
    - the LMS and HSS schemes of RFC 8554, with code that matches the RFC's test case;
    - why the state is everything, and what happens when it is lost;
    - how XMSS and XMSS^MT differ from LMS and HSS, with WOTS+, the L-tree and a toy XMSS
      key in code;
    - how big and how slow the real parameter sets are, and how many signatures a key gives;
    - how state goes wrong in practice (crashes, backups, snapshots, clones) and how
      reservation, hardware counters and partitioned trees prevent it;
    - what NIST SP 800-208 and NSA's CNSA 2.0 require, and where these schemes are used.

    **You need:** [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (Lamport signatures and
    hash functions as a hard problem); the properties of hash functions from Book 1,
    [Chapter 9](../../book/09-Hash-Functions.md). Book 1's
    [Chapter 22](../../book/22-Hash-and-Code-Based.md) is a gentler first look.

    **Levels:** §11.1 to §11.4 are for beginners, §11.5 to §11.10 are intermediate, §11.11 to
    §11.13 are expert.

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

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Three Winternitz chains of four values each, from the secret x on the left to the public end H cubed of x on the right. The signature on digits 2 and 1 with checksum 3 reveals the third value of the first chain, the second value of the second chain and the last value of the checksum chain." fill="currentColor" font-size="14">
<g text-anchor="middle" font-size="13" fill-opacity=".7"><text x="200" y="26">step 0 (secret)</text><text x="300" y="26">step 1</text><text x="400" y="26">step 2</text><text x="500" y="26">step 3 (public)</text></g>
<text x="8" y="65">digit 2</text><text x="8" y="125">digit 1</text><text x="8" y="185">checksum 3</text>
<g fill="currentColor" fill-opacity=".18"><rect x="360" y="45" width="80" height="30" rx="4"/><rect x="260" y="105" width="80" height="30" rx="4"/><rect x="460" y="165" width="80" height="30" rx="4"/></g>
<g fill="none" stroke="currentColor"><rect x="160" y="45" width="80" height="30" rx="4"/><rect x="260" y="45" width="80" height="30" rx="4"/><rect x="360" y="45" width="80" height="30" rx="4"/><rect x="160" y="105" width="80" height="30" rx="4"/><rect x="260" y="105" width="80" height="30" rx="4"/><rect x="360" y="105" width="80" height="30" rx="4"/><rect x="160" y="165" width="80" height="30" rx="4"/><rect x="260" y="165" width="80" height="30" rx="4"/><rect x="360" y="165" width="80" height="30" rx="4"/></g>
<g fill="none" stroke="currentColor" stroke-width="2.4"><rect x="460" y="45" width="80" height="30" rx="4"/><rect x="460" y="105" width="80" height="30" rx="4"/><rect x="460" y="165" width="80" height="30" rx="4"/></g>
<g text-anchor="middle"><text x="200" y="65">x₁</text><text x="300" y="65">H(x₁)</text><text x="400" y="65">H²(x₁)</text><text x="500" y="65">H³(x₁)</text><text x="200" y="125">x₂</text><text x="300" y="125">H(x₂)</text><text x="400" y="125">H²(x₂)</text><text x="500" y="125">H³(x₂)</text><text x="200" y="185">x₃</text><text x="300" y="185">H(x₃)</text><text x="400" y="185">H²(x₃)</text><text x="500" y="185">H³(x₃)</text></g>
<g stroke="currentColor"><line x1="240" y1="60" x2="258" y2="60"/><line x1="340" y1="60" x2="358" y2="60"/><line x1="440" y1="60" x2="458" y2="60"/><line x1="240" y1="120" x2="258" y2="120"/><line x1="340" y1="120" x2="358" y2="120"/><line x1="440" y1="120" x2="458" y2="120"/><line x1="240" y1="180" x2="258" y2="180"/><line x1="340" y1="180" x2="358" y2="180"/><line x1="440" y1="180" x2="458" y2="180"/></g>
<g><polygon points="260,60 252,56 252,64"/><polygon points="360,60 352,56 352,64"/><polygon points="460,60 452,56 452,64"/><polygon points="260,120 252,116 252,124"/><polygon points="360,120 352,116 352,124"/><polygon points="460,120 452,116 452,124"/><polygon points="260,180 252,176 252,184"/><polygon points="360,180 352,176 352,184"/><polygon points="460,180 452,176 452,184"/></g>
<g font-size="13"><text x="552" y="65">1 more</text><text x="552" y="125">2 more</text><text x="552" y="185">0 more</text></g>
<text x="8" y="232" font-size="13">Shaded: revealed in the signature. Anyone can hash to the right; nobody can go left.</text>
</svg>
<figcaption>Figure 11.1. The two-digit example with w = 2. Each chain runs from a secret on the left to a public end on the right. The signature reveals one value per chain, at the step given by the digit; the verifier hashes each one the remaining number of steps and compares with the public ends. Raising a message digit is free, but it lowers the checksum, and the checksum chain cannot be walked backward.</figcaption>
</figure>

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

### Where 67 comes from

The number of chains is not a design whim; it falls out of two roundings. RFC 8554's
Appendix B gives the rule for an $n$-byte hash and $w$-bit digits:

$$u = \left\lceil \frac{8n}{w} \right\rceil, \qquad
v = \left\lceil \frac{\lfloor \log_2\big((2^w - 1)\,u\big) \rfloor + 1}{w} \right\rceil, \qquad
p = u + v.$$

Here $u$ counts the message digits and $v$ the checksum digits. Work it for SHA-256 and
$w = 4$ by hand. The digest has $8 \times 32 = 256$ bits, so $u = 64$ digits. The checksum is
largest when every digit is 0: $15 \times 64 = 960$. Since $2^9 = 512 \le 960 < 1024 = 2^{10}$,
the checksum needs $\lfloor \log_2 960 \rfloor + 1 = 10$ bits, which is $v = \lceil 10/4
\rceil = 3$ digits. So $p = 64 + 3 = 67$. The checksum is stored as a 16-bit number shifted
left by $ls = 16 - v w = 4$ bits, so that its three digits are the top 12 bits of the field.

The same steps give the other rows of Table 11.1. For $w = 8$: $u = 32$, the largest checksum
is $255 \times 32 = 8{,}160$, which needs 13 bits, so $v = 2$ and $p = 34$, with $ls = 0$. For
the 24-byte hash (SHA-256/192, which SP 800-208 added) and $w = 4$: $u = 48$, the largest
checksum is $15 \times 48 = 720$, again 10 bits, so $v = 3$ and $p = 51$. Its one-time
signature is $4 + 24 + 51 \times 24 = 1{,}252$ bytes, 928 bytes less than the 32-byte version.

Now a checksum on a real digest. SHA-256 of `abc` is

```text
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

Its 64 hex digits add up to 430 (the first eight, `ba7816bf`, give $11 + 10 + 7 + 8 + 1 + 6 +
11 + 15 = 69$; the rest add 361). The checksum is $960 - 430 = 530$, which is `0x212`; shifted
left by 4 it is `0x2120`, and its top three hex digits $(2, 1, 2)$ are the three checksum
digits. The signer walks $430 + 5 = 435$ steps along the 67 chains; the verifier walks the
remaining $67 \times 15 - 435 = 570$. Signer and verifier together always walk exactly
$1{,}005$ steps, so a message that is cheap to sign is expensive to verify and the reverse.
(Real LMS hashes the message together with $I$, $q$ and the randomizer $C$ first, so these are
not the digits LMS would sign for `abc`; the arithmetic is the same.)

### How strong is one chain?

A forger who never sees a reused key has two ways in: find a preimage, walking a chain
backward, or find a **second preimage**, another input with the same hash at some step of
some chain or tree node. Both cost about $2^{8n}$ hash calls classically and, with Grover,
about $2^{4n}$ quantum steps in the idealized model (Chapter 2 explains why the real quantum
cost is much higher). For $n = 32$ that is $2^{256}$ and $2^{128}$; for $n = 24$, $2^{192}$ and
$2^{96}$. Collisions matter less than you might expect: the randomizer $C$ is chosen by the
signer after the message is fixed, so a forger cannot prepare two colliding messages in
advance.

The subtle danger is **multiple targets**. A key with $2^{20}$ leaves, 67 chains and 15 steps
per chain contains about $2^{30}$ hash outputs, all public once enough signatures are out. If
every hash call used the same function on bare 32-byte inputs, a forger trying random inputs
would win when it hit *any* of the $2^{30}$ outputs, a $2^{30}$ speed-up. LMS removes it with
the tags of §11.5: every call starts with the key identifier $I$, the leaf $q$, the chain $i$
and the step $j$, so a guess can only ever match one specific target. XMSS does the same with
its addresses and bitmasks (§11.8). This is why both schemes can use a 24-byte hash at all.

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
<figcaption>Figure 11.2. A Merkle tree of height 3 holds eight one-time keys under one 32-byte root. A signature with leaf 5 carries the three accent nodes, enough for the verifier to hash its way up to the root. Each key may be used once; the signer must remember which.</figcaption>
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

### How many signatures a key gives

Figure 11.3 shows the two-level case. The public key is the root of the top tree and never
changes. Each leaf of the top tree is a one-time key that signs exactly one thing: the root of
one bottom tree. A full HSS signature is the chain of evidence from the message up to the top
root: the bottom tree's LMS signature on the message, the bottom tree's public key, and the top
tree's LMS signature on that public key, plus a 4-byte count of levels.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A two-level HSS key. The top tree's root is the public key. One leaf of the top tree signs the root of bottom tree i; a leaf of bottom tree i signs the message. Bottom trees to the left are used up; trees to the right are not made yet." fill="currentColor" font-size="14">
<text x="320" y="20" text-anchor="middle">public key: root of the top tree</text>
<polygon points="320,30 190,125 450,125" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="320" y="100" text-anchor="middle" font-size="13">top tree, height h₁</text>
<g fill="none" stroke="currentColor"><circle cx="210" cy="125" r="4"/><circle cx="230" cy="125" r="4"/><circle cx="250" cy="125" r="4"/><circle cx="270" cy="125" r="4"/><circle cx="290" cy="125" r="4"/><circle cx="310" cy="125" r="4"/><circle cx="330" cy="125" r="4"/><circle cx="350" cy="125" r="4"/><circle cx="390" cy="125" r="4"/><circle cx="410" cy="125" r="4"/><circle cx="430" cy="125" r="4"/></g>
<circle cx="370" cy="125" r="6"/>
<line x1="370" y1="131" x2="360" y2="165" stroke="currentColor" stroke-width="2"/>
<text x="380" y="152" font-size="12">signs the root of tree i</text>
<polygon points="140,165 70,245 210,245" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-dasharray="4 3"/>
<polygon points="360,165 280,245 440,245" fill="none" stroke="currentColor" stroke-width="2"/>
<polygon points="560,165 490,245 630,245" fill="none" stroke="currentColor" stroke-dasharray="4 3" stroke-opacity=".6"/>
<g text-anchor="middle" font-size="12"><text x="140" y="232">used up</text><text x="360" y="225">bottom tree i</text><text x="560" y="232" fill-opacity=".7">not made yet</text></g>
<circle cx="400" cy="245" r="6"/>
<line x1="400" y1="251" x2="400" y2="263" stroke="currentColor" stroke-width="2"/>
<text x="400" y="280" text-anchor="middle" font-size="13">message</text>
<text x="20" y="60" font-size="12" fill-opacity=".7">made at key generation</text>
<text x="20" y="280" font-size="12" fill-opacity=".7">made one at a time, when needed</text>
</svg>
<figcaption>Figure 11.3. A two-level HSS (or XMSS^MT) key. The top tree is built once, at key generation; each of its one-time keys signs the root of one bottom tree, and the bottom tree's one-time keys sign messages. A signature carries one LMS signature per level and the public key of every tree below the top. The same picture with many more layers and no state is SLH-DSA's hypertree (Chapter 12).</figcaption>
</figure>

The number of signatures is the product of the tree sizes: with heights $h_1, \dots, h_L$, an
HSS key signs $2^{h_1 + \cdots + h_L}$ messages. RFC 8554 allows up to $L = 8$ levels and tree
heights 5, 10, 15, 20 and 25, so the theoretical ceiling is far beyond any use.
The practical question is how many you need. Work three cases by hand.

- **A firmware release key** signs at most 20 builds a day for 30 years: $20 \times 365
  \times 30 = 219{,}000$ signatures. $2^{17} = 131{,}072$ is too few and $2^{18} = 262{,}144$
  is enough, so a single LMS tree of height 20 (1,048,576 leaves) has a margin of almost five.
- **A code-signing service** that signs one object per second uses $86{,}400$ leaves a day.
  A height-20 tree lasts $2^{20} / 86{,}400 = 12.1$ days; a height-25 tree, the tallest LMS
  allows, lasts $2^{25}/86{,}400 = 388$ days. Two levels of height 20 give $2^{40}$
  signatures, $2^{40} / 86{,}400 / 365.25 \approx 34{,}800$ years at that rate, or about 35
  years at a thousand signatures a second.
- **A certificate authority** issuing millions of certificates a day is the case where a
  stateful scheme stops making sense: the state would have to be shared across a cluster, and
  every reservation, failover and restore becomes a reuse risk. That is a job for ML-DSA
  (Chapter 9) or SLH-DSA (Chapter 12).

The cost of a deeper hierarchy is signature size and one extra one-time verification per
level. §11.10 puts numbers on both.

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

### Why not pick a leaf at random?

A tempting shortcut is to skip the counter and choose each leaf at random. With $2^{20}$
leaves, surely two signatures will never land on the same one? The birthday bound says
otherwise. After $k$ random choices among $N$ leaves, the chance that two coincide is about
$k^2 / 2N$ while that is small, and exactly

$$1 - \prod_{i=0}^{k-1} \left(1 - \frac{i}{N}\right).$$

By hand for $N = 2^{20} = 1{,}048{,}576$: a 1% chance needs $k^2 \approx 0.02 N \approx
20{,}972$, so $k \approx 145$. The exact product gives 0.99% at $k = 145$. A thousand
signatures give $k^2/2N = 999{,}000 / 2{,}097{,}152 \approx 0.48$ by the rough formula and
37.9% exactly; at $k = 1{,}206$ the chance passes one half. A key that promises a million
signatures would, with random leaves, be unsafe after a hundred or so.

SLH-DSA (Chapter 12) does choose its leaves at random, which is how it gets rid of the state,
but it pays for it twice: its trees have $2^{63}$ to $2^{68}$ leaves so that birthday
coincidences stay rare across $2^{64}$ signatures, and its bottom layer is a few-time
signature (FORS) that survives an occasional coincidence. Both are why its signatures are 8
to 50 kilobytes rather than 1 to 3.

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

```text
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

```text
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

```text
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

Figure 11.4 shows the two XMSS pieces that LMS does not have. A WOTS+ chain step does not
hash its input directly. It first derives a fresh key and a fresh bitmask from the public
seed and a 32-byte **address** that names the exact position (which one-time key, which
chain, which step), XORs the bitmask into the value and only then hashes it under the key.
The L-tree then folds the 67 chain ends into one leaf by pairing them like a Merkle tree; when
a level has an odd number of nodes, the last one moves up unchanged.

<figure class="mars-fig">
<svg viewBox="0 0 640 275" width="640" role="img" aria-label="Left: one WOTS+ chain step. The value x j is XORed with a bitmask from PRF of the seed and address, then hashed with F under a key also from PRF of the seed and address, giving x j plus 1. Right: an L-tree over five chain ends, where the odd fifth end moves up unchanged until the last level." fill="currentColor" font-size="14">
<text x="20" y="20" font-size="13" fill-opacity=".7">one WOTS+ chain step</text>
<rect x="30" y="32" width="90" height="30" rx="4" fill="none" stroke="currentColor"/><text x="75" y="52" text-anchor="middle">xⱼ</text>
<line x1="75" y1="62" x2="75" y2="96" stroke="currentColor"/>
<circle cx="75" cy="110" r="14" fill="none" stroke="currentColor"/><text x="75" y="115" text-anchor="middle">⊕</text>
<rect x="150" y="92" width="140" height="36" rx="4" fill="none" stroke="currentColor"/><text x="220" y="108" text-anchor="middle" font-size="13">bitmask</text><text x="220" y="123" text-anchor="middle" font-size="11" fill-opacity=".7">PRF(SEED, addr, 1)</text>
<line x1="150" y1="110" x2="89" y2="110" stroke="currentColor"/>
<line x1="75" y1="124" x2="75" y2="160" stroke="currentColor"/>
<rect x="30" y="160" width="90" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="75" y="182" text-anchor="middle">F(key, ·)</text>
<rect x="150" y="159" width="140" height="36" rx="4" fill="none" stroke="currentColor"/><text x="220" y="175" text-anchor="middle" font-size="13">key</text><text x="220" y="190" text-anchor="middle" font-size="11" fill-opacity=".7">PRF(SEED, addr, 0)</text>
<line x1="150" y1="177" x2="120" y2="177" stroke="currentColor"/>
<line x1="75" y1="194" x2="75" y2="225" stroke="currentColor"/>
<rect x="30" y="225" width="90" height="30" rx="4" fill="none" stroke="currentColor"/><text x="75" y="245" text-anchor="middle">xⱼ₊₁</text>
<line x1="315" y1="20" x2="315" y2="260" stroke="currentColor" stroke-opacity=".3"/>
<text x="340" y="20" font-size="13" fill-opacity=".7">L-tree over 5 chain ends</text>
<g stroke="currentColor"><line x1="360" y1="220" x2="390" y2="170"/><line x1="420" y1="220" x2="390" y2="170"/><line x1="480" y1="220" x2="510" y2="170"/><line x1="540" y1="220" x2="510" y2="170"/><line x1="390" y1="160" x2="450" y2="110"/><line x1="510" y1="160" x2="450" y2="110"/><line x1="450" y1="100" x2="525" y2="58"/><line x1="600" y1="100" x2="525" y2="58"/></g>
<g stroke="currentColor" stroke-dasharray="4 3"><line x1="600" y1="220" x2="600" y2="170"/><line x1="600" y1="160" x2="600" y2="110"/></g>
<g fill="none" stroke="currentColor"><circle cx="360" cy="230" r="10"/><circle cx="420" cy="230" r="10"/><circle cx="480" cy="230" r="10"/><circle cx="540" cy="230" r="10"/><circle cx="600" cy="230" r="10"/><circle cx="390" cy="165" r="7"/><circle cx="510" cy="165" r="7"/><circle cx="600" cy="165" r="7"/><circle cx="450" cy="105" r="7"/><circle cx="600" cy="105" r="7"/></g>
<circle cx="525" cy="52" r="8"/>
<text x="540" y="45" font-size="13">leaf of the</text><text x="540" y="62" font-size="13">Merkle tree</text>
<text x="340" y="265" font-size="12" fill-opacity=".7">chain ends; the odd one moves up (dashed)</text>
</svg>
<figcaption>Figure 11.4. What XMSS adds. Left: every chain step XORs a bitmask into the value and hashes it under a key, both derived from the public seed and the position's address. Right: the L-tree compresses the chain ends of one WOTS+ public key (67 in a real key, five here) into the leaf that goes into the Merkle tree. Each node of the L-tree and of the Merkle tree is also hashed with its own key and two bitmasks.</figcaption>
</figure>

Why go to this trouble? The bitmasks change what the proof needs. Without them, a forgery
implies a collision somewhere, so the scheme needs a collision-resistant hash. With them, the
proof (Hülsing, 2013, and the XMSS papers) reduces forgery to finding a second preimage in a
keyed hash family, a weaker and better-understood assumption with no birthday attack. The
price is hashing: one F call per step becomes three calls (key, bitmask, F), each on a 96-byte input.
SLH-DSA kept the addresses but dropped the bitmasks in its final form (the "simple"
tweakable hash of [Chapter 12, §12.5](12-SLH-DSA.md#125-tweakable-hashes-and-addresses)), trading the tighter proof for speed.

## 11.9 XMSS in code

*Level: intermediate.*

The LMS code of §11.5 is short because every hash call is one SHA-256 over a tagged input.
XMSS needs a little more machinery: a 32-byte address for every hash call, a pseudorandom
function that turns the public seed and an address into a key or a bitmask, the L-tree, and
four separate hash functions told apart by a 32-byte prefix (0 for the chain function F, 1 for
tree nodes H, 2 for the message digest, 3 for the PRF). RFC 8391 writes all of them as SHA-256
over `toByte(prefix, 32) || KEY || M`. The listing follows the RFC's names and order and counts
every SHA-256 call.

**Code it.** WOTS+ with its chaining and bitmasks, the L-tree, the climb up the Merkle tree,
and XMSS verification, for the SHA-256 parameter sets with $n = 32$ and $w = 16$ (XMSS's
notation for 4-bit digits, which LMS calls $w = 4$).

```python
# XMSS (RFC 8391) with SHA-256, n = 32, w = 16: WOTS+, the L-tree and the Merkle tree.
import hashlib
N, W, LEN1, LEN2 = 32, 16, 64, 3
LEN = LEN1 + LEN2                                 # 67 chains, as in LMS
calls = [0]                                       # count SHA-256 calls

def h256(prefix, key, m):
    calls[0] += 1
    return hashlib.sha256(prefix.to_bytes(32, "big") + key + m).digest()

def F(key, m): return h256(0, key, m)             # chain step
def H(key, m): return h256(1, key, m)             # tree node
def H_msg(key, m): return h256(2, key, m)         # message digest
def PRF(key, m): return h256(3, key, m)           # keys and bitmasks
def PRF_keygen(key, m): return h256(4, key, m)    # private keys from a seed

def adrs(layer=0, tree=0, typ=0, a=0, b=0, c=0, km=0):
    """The 32-byte address: layer, tree, type, then three type-specific words and keyAndMask."""
    return (layer.to_bytes(4, "big") + tree.to_bytes(8, "big") +
            b"".join(x.to_bytes(4, "big") for x in (typ, a, b, c, km)))

def xor(x, y): return bytes(i ^ j for i, j in zip(x, y))

def xmss_chain(x, start, steps, seed, ots, i):
    for j in range(start, start + steps):          # each step: a fresh key and a fresh bitmask
        key = PRF(seed, adrs(0, 0, 0, ots, i, j, 0))
        mask = PRF(seed, adrs(0, 0, 0, ots, i, j, 1))
        x = F(key, xor(x, mask))
    return x

def rand_hash(left, right, seed, typ, a, height, index):
    key = PRF(seed, adrs(0, 0, typ, a, height, index, 0))
    m0 = PRF(seed, adrs(0, 0, typ, a, height, index, 1))
    m1 = PRF(seed, adrs(0, 0, typ, a, height, index, 2))
    return H(key, xor(left, m0) + xor(right, m1))

def ltree(pk, seed, leaf):                         # 67 chain ends -> one leaf
    pk, height = list(pk), 0
    while len(pk) > 1:
        nxt = [rand_hash(pk[2 * i], pk[2 * i + 1], seed, 1, leaf, height, i) for i in range(len(pk) // 2)]
        if len(pk) % 2:
            nxt.append(pk[-1])                     # an odd node moves up unchanged
        pk, height = nxt, height + 1
    return pk[0]

def base_w(msg):                                   # message digits plus checksum digits
    d = [x for b in msg for x in (b >> 4, b & 15)]
    csum = sum(W - 1 - x for x in d) << 4
    return d + [(csum >> 8) >> 4, (csum >> 8) & 15, (csum & 255) >> 4]

def wots_sk(sk_seed, pub_seed, ots):
    return [PRF_keygen(sk_seed, pub_seed + adrs(0, 0, 0, ots, i, 0, 0)) for i in range(LEN)]

def wots_pk_from_sig(sig, digest, seed, ots):
    d = base_w(digest)
    return [xmss_chain(sig[i], d[i], W - 1 - d[i], seed, ots, i) for i in range(LEN)]

def root_from_sig(idx, sig_ots, auth, digest, seed):
    node = ltree(wots_pk_from_sig(sig_ots, digest, seed, idx), seed, idx)
    for k, sib in enumerate(auth):                 # climb the tree, sibling on the correct side
        parent = idx >> (k + 1)
        node = rand_hash(sib, node, seed, 2, 0, k, parent) if (idx >> k) & 1 else \
               rand_hash(node, sib, seed, 2, 0, k, parent)
    return node

def xmss_verify(pk, msg, sig, h):
    root, seed = pk[4:36], pk[36:68]
    idx, r = int.from_bytes(sig[:4], "big"), sig[4:36]
    body = sig[36:]
    ots = [body[32 * i: 32 * i + 32] for i in range(LEN)]
    auth = [body[32 * (LEN + k): 32 * (LEN + k) + 32] for k in range(h)]
    digest = H_msg(r + root + idx.to_bytes(32, "big"), msg)
    return root_from_sig(idx, ots, auth, digest, seed) == root
```

The address is the heart of it. For a chain step it holds the one-time key's index, the chain
number and the step; for an L-tree node, the leaf, the height and the position; for a Merkle
node, the height and the position. The last word, `keyAndMask`, is 0 when deriving a key and 1
or 2 when deriving a bitmask, so no two PRF calls anywhere in the key ever see the same input.

These few functions are enough to check a real signature. wolfSSL's test suite carries an
XMSS-SHA2_10_256 public key and the fifth signature produced by the reference implementation
(github.com/XMSS/xmss-reference), 68 and 2,500 bytes. Fed to `xmss_verify` with $h = 10$, the
signature is accepted, with 1,880 SHA-256 calls, and rejected when one bit of the message is
flipped. The vector is too long to print here, but that check is what makes the listing more
than a sketch: every address word, every prefix and the checksum must be right for a real
signature to verify.

Now a whole key. The private key here is three seeds: one for the WOTS+ secrets (derived with
a fifth hash, `PRF_keygen` with prefix 4, in the style of SP 800-208), one for the
per-signature randomizer $r$, and the public seed. The tree is small, $h = 4$, so it holds 16 one-time keys.

```python
# Uses xmss_chain(), ltree(), rand_hash(), wots_sk(), base_w() and xmss_verify() from the listing above.
# A toy XMSS key with h = 4 (16 signatures): key generation, signing, verification.
import hashlib

def leaf(sk_seed, seed, i):
    sk = wots_sk(sk_seed, seed, i)
    return ltree([xmss_chain(x, 0, W - 1, seed, i, c) for c, x in enumerate(sk)], seed, i)

def tree(sk_seed, seed, h):
    """All nodes, level by level: levels[0] are the 2^h leaves, levels[h] = [root]."""
    levels = [[leaf(sk_seed, seed, i) for i in range(2 ** h)]]
    for k in range(h):
        below = levels[-1]
        levels.append([rand_hash(below[2 * j], below[2 * j + 1], seed, 2, 0, k, j)
                       for j in range(len(below) // 2)])
    return levels

def xmss_sign(sk_seed, sk_prf, seed, levels, idx, msg):
    h, root = len(levels) - 1, levels[-1][0]
    r = PRF(sk_prf, idx.to_bytes(32, "big"))
    d = base_w(H_msg(r + root + idx.to_bytes(32, "big"), msg))
    sk = wots_sk(sk_seed, seed, idx)
    ots = [xmss_chain(sk[i], 0, d[i], seed, idx, i) for i in range(LEN)]
    auth = [levels[k][(idx >> k) ^ 1] for k in range(h)]
    return idx.to_bytes(4, "big") + r + b"".join(ots + auth)

SK_SEED, SK_PRF, SEED = (hashlib.sha256(t).digest() for t in (b"sk", b"prf", b"pub"))
calls[0] = 0
levels = tree(SK_SEED, SEED, 4)
pk = (1).to_bytes(4, "big") + levels[-1][0] + SEED
print("key generation, h = 4:", calls[0], "SHA-256 calls; public key", len(pk), "bytes")
for idx, msg in enumerate((b"burn 1", b"burn 2", b"burn 3")):
    sig = xmss_sign(SK_SEED, SK_PRF, SEED, levels, idx, msg)
    calls[0] = 0
    ok = xmss_verify(pk, msg, sig, 4)
    print(msg.decode(), "idx", idx, "verifies:", ok, "(" + str(calls[0]), "calls),",
          "tampered:", xmss_verify(pk, msg + b"!", sig, 4))
print("signature:", len(sig), "bytes")
```

It prints:

```text
key generation, h = 4: 53596 SHA-256 calls; public key 68 bytes
burn 1 idx 0 verifies: True (1721 calls), tampered: False
burn 2 idx 1 verifies: True (1811 calls), tampered: False
burn 3 idx 2 verifies: True (1766 calls), tampered: False
signature: 2308 bytes
```

A signature is $4 + 32 + 67 \times 32 + 4 \times 32 = 2{,}308$ bytes: the index, $r$, the
WOTS+ signature and four path nodes. Each further level of tree adds 32 bytes, which gives the
2,500 bytes of XMSS-SHA2_10_256 and the 2,820 of XMSS-SHA2_20_256.

Compare the work with LMS by counting. Generating one LMS leaf costs $67 + 67 \times 15 + 2 =
1{,}074$ hash calls (the 1,100,799 calls for 1,024 leaves in §11.5). One XMSS leaf costs
$53{,}596 / 16 \approx 3{,}350$: 67 private-key calls, $67 \times 15 \times 3 = 3{,}015$ for
the chains and $66 \times 4 = 264$ for the L-tree. Verification is about 1,800 calls for XMSS
against about 520 on average for LMS. The calls are not the same size, either. An LMS chain
step hashes $16 + 4 + 2 + 1 + 32 = 55$ bytes, the most that fits into a single SHA-256
compression, so every LMS chain step costs exactly one. An XMSS PRF or F call hashes 96
bytes, two compressions. So one XMSS chain step costs six compressions against LMS's one, or
four if the implementation caches the fixed first block of the PRF (the prefix and the public
seed, exactly 64 bytes). Kampanakis and Fluhrer (2017) compared the two for adopters, and
Fluhrer has summarized the result as LMS running three to five times faster than XMSS for
equivalent parameters; Campos and coauthors (2020) made the same comparison on an ARM
Cortex-M4 microcontroller. The sizes, as Table 11.2 showed, are within a few bytes of each
other.

## 11.10 Sizes and speeds of the real parameter sets

*Level: intermediate.*

SP 800-208 approves a long menu: LMS trees of height 5, 10, 15, 20 and 25; LM-OTS with
$w = 1, 2, 4, 8$; XMSS trees of height 10, 16 and 20; XMSS^MT with total heights 20, 40 and 60
split into 2 to 12 layers; and all of them with SHA-256, SHA-256/192, SHAKE256/256 or
SHAKE256/192. Choosing among them is arithmetic, and the arithmetic is simple enough to write
down once.

**Code it.** The size formulas of RFC 8554 and RFC 8391, and the number of hash calls needed
to produce the public key.

```python
# Sizes and key-generation work for parameter sets approved in SP 800-208.
def ots_chains(n, lgw):                     # RFC 8554 Appendix B: p, the number of chains
    u = -(-8 * n // lgw)                    # message digits, rounded up
    v = -(-((u * (2 ** lgw - 1)).bit_length()) // lgw)   # checksum digits
    return u + v

def lms_sig(n, lgw, h):                     # q, OTS type, C, chains, LMS type, path
    return 4 + 4 + n + ots_chains(n, lgw) * n + 4 + h * n

def lms_keygen(n, lgw, h):                  # every leaf's chains and leaf hash, then the tree
    p = ots_chains(n, lgw)
    return 2 ** h * (p + p * (2 ** lgw - 1) + 2) + 2 ** h - 1

def hss_sig(n, lgw, hs):                    # Nspk, one LMS signature per level, signed keys
    return 4 + sum(lms_sig(n, lgw, h) for h in hs) + (len(hs) - 1) * (24 + n)

def xmss_sig(n, h, d=1):                    # index, r, d WOTS+ signatures, h path nodes
    return (4 if d == 1 else -(-h // 8)) + n + d * ots_chains(n, 4) * n + h * n

def xmss_keygen(n, h):                      # private keys, chains (3 calls a step), L-tree, tree
    p = ots_chains(n, 4)
    return 2 ** h * (p + p * 15 * 3 + (p - 1) * 4) + (2 ** h - 1) * 4

rows = [("LMS n=32 w=4 h=10", 2 ** 10, lms_sig(32, 4, 10), lms_keygen(32, 4, 10)),
        ("LMS n=32 w=4 h=20", 2 ** 20, lms_sig(32, 4, 20), lms_keygen(32, 4, 20)),
        ("LMS n=32 w=8 h=15", 2 ** 15, lms_sig(32, 8, 15), lms_keygen(32, 8, 15)),
        ("LMS n=24 w=4 h=15", 2 ** 15, lms_sig(24, 4, 15), lms_keygen(24, 4, 15)),
        ("LMS n=24 w=8 h=20", 2 ** 20, lms_sig(24, 8, 20), lms_keygen(24, 8, 20)),
        ("HSS n=32 w=4 10/10", 2 ** 20, hss_sig(32, 4, (10, 10)), lms_keygen(32, 4, 10)),
        ("HSS n=32 w=4 20/20", 2 ** 40, hss_sig(32, 4, (20, 20)), lms_keygen(32, 4, 20)),
        ("XMSS-SHA2_10_256", 2 ** 10, xmss_sig(32, 10), xmss_keygen(32, 10)),
        ("XMSS-SHA2_20_256", 2 ** 20, xmss_sig(32, 20), xmss_keygen(32, 20)),
        ("XMSSMT-SHA2_20/2_256", 2 ** 20, xmss_sig(32, 20, 2), xmss_keygen(32, 10)),
        ("XMSSMT-SHA2_60/6_256", 2 ** 60, xmss_sig(32, 60, 6), xmss_keygen(32, 10))]
print(f"{'parameter set':22}{'signatures':>11}{'sig bytes':>11}{'keygen hashes':>16}")
for name, count, sig, kg in rows:
    print(f"{name:22}{'2^%d' % (count.bit_length() - 1):>11}{sig:>11,}{kg:>16,}")
```

It prints:

```text
parameter set          signatures  sig bytes   keygen hashes
LMS n=32 w=4 h=10            2^10      2,508       1,100,799
LMS n=32 w=4 h=20            2^20      2,828   1,127,219,199
LMS n=32 w=8 h=15            2^15      1,612     285,310,975
LMS n=24 w=4 h=15            2^15      1,620      26,836,991
LMS n=24 w=8 h=20            2^20      1,140   6,982,467,583
HSS n=32 w=4 10/10           2^20      5,076       1,100,799
HSS n=32 w=4 20/20           2^40      5,716   1,127,219,199
XMSS-SHA2_10_256             2^10      2,500       3,430,396
XMSS-SHA2_20_256             2^20      2,820   3,512,729,596
XMSSMT-SHA2_20/2_256         2^20      4,963       3,430,396
XMSSMT-SHA2_60/6_256         2^60     14,824       3,430,396
```

The last column is the cost of making the public key: for a single tree, every leaf; for
HSS and XMSS^MT, only the top tree, because the lower trees are made later, one at a time.
Several lessons come out of the table.

- **Height costs little in size and a lot in key generation.** From $h = 10$ to $h = 20$, the
  LMS signature grows by 320 bytes (2,508 to 2,828), but key generation grows a thousandfold,
  from a million to over a billion hash calls. A modern CPU core with SHA instructions computes
  on the order of ten to twenty million single-block SHA-256 compressions a second, so the
  billion takes a minute or two; a hardware module with a slower core may take far longer.
- **$w = 8$ halves the signature and multiplies the work.** LMS with $n = 24$, $w = 8$ and
  $h = 20$ has 1,140-byte signatures, the smallest in the table, but key generation needs
  seven billion hashes and verification up to $26 \times 255 = 6{,}630$ chain steps.
- **The 24-byte hash saves almost 40 percent.** $n = 24$ shortens every chain value and path
  node and needs 16 fewer chains: 1,620 bytes against 2,668 for the same $w = 4$, $h = 15$
  with $n = 32$. NSA recommends exactly this hash for CNSA 2.0 (§11.12).
- **Multi-tree keys double the signature or more.** HSS 20/20 gives $2^{40}$ signatures in
  5,716 bytes; XMSS^MT 60/6 gives $2^{60}$ in 14,824 bytes, already in SLH-DSA's range.

Work one real signature by hand to see the formula is right. The open-source Caliptra root of
trust (§11.12) verifies firmware with LMS type 12 and LM-OTS type 7, which are
`LMS_SHA256_M24_H15` and `LMOTS_SHA256_N24_W4`. Its signature is the 4-byte leaf number $q$,
the one-time signature ($4 + 24 + 51 \times 24 = 1{,}252$ bytes, from §11.2), the 4-byte tree
type and 15 path nodes of 24 bytes (360 bytes): $4 + 1{,}252 + 4 + 360 = 1{,}620$ bytes. Its
public key is $4 + 4 + 16 + 24 = 48$ bytes. Both match the field sizes in Caliptra's ROM
specification. The key signs $2^{15} = 32{,}768$ firmware images.

| scheme | public key | signature | signatures per key | state |
|---|---|---|---|---|
| LMS SHA-256/192, $h = 15$, $w = 4$ | 48 B | 1,620 B | 32,768 | yes |
| LMS SHA-256, $h = 20$, $w = 8$ | 56 B | 1,772 B | 1,048,576 | yes |
| XMSS-SHA2_20_256 | 68 B | 2,820 B | 1,048,576 | yes |
| ML-DSA-44 (FIPS 204) | 1,312 B | 2,420 B | no limit in practice | no |
| SLH-DSA-SHA2-128s (FIPS 205) | 32 B | 7,856 B | $2^{64}$ | no |

*Table 11.3. Stateful schemes beside the two NIST signature standards they compete with for
firmware signing. The stateful schemes have public keys almost as small as SLH-DSA's and, with
a 24-byte hash, the smallest signatures; they pay with the state.*

Speed is lopsided by design. Signing with a stored tree costs one one-time signature, at most
$p \times (2^w - 1)$ chain steps and about half that on average, plus copying $h$ path nodes:
a fraction of a millisecond. Verification is the same order of work and needs no memory beyond
the signature, which is why a boot ROM can do it. The slow and memory-hungry part is key
generation and, for tall trees, keeping the authentication paths ready: storing every node of
a height-20 tree takes $2^{21} \times 32$ bytes, 64 MiB, more than many hardware modules have.
Traversal algorithms (Szydlo's of 2004 and BDS of 2008, see §11.13) keep a number of nodes
proportional to $h$, dozens rather than millions, and spread the recomputation across signatures, and HSS and XMSS^MT sidestep the problem
by keeping every tree small.

## 11.11 State in real hardware

*Level: expert.*

The four rules of §11.6 fit on an index card. Keeping them for twenty years, across hardware
failures, operating-system upgrades, staff turnover and disaster-recovery drills, is the real
engineering problem of stateful signatures. This section follows a key through its life and
names the places where state goes wrong.

### What SP 800-208 demands

SP 800-208 approaches the problem bluntly. To use LMS, HSS, XMSS or XMSS^MT as a NIST-approved
signature:

- key generation and signing must happen inside a hardware cryptographic module validated to
  FIPS 140 Level 3 or higher, with a non-modifiable or limited operational environment;
- the module must not allow the private key to be exported, **even in encrypted form** (NIST
  said so explicitly when answering comments on the draft), so no copy of key and counter can
  ever exist outside it;
- verification has no such limit and can run in software anywhere. This is why OpenSSL 3.6
  (October 2025) added LMS *verification* only, and why its documentation cites SP 800-208 for
  the restriction.

The no-export rule takes away the usual answer to hardware failure, a backup. SP 800-208 offers
two substitutes. The first is several independent keys in several modules, all trusted by the
verifiers. The second is a **distributed multi-tree key**: one module makes the top tree of an
HSS or XMSS^MT key, and other modules each make their own bottom trees, whose roots the top
tree signs at setup. Each module then signs with its own trees and can never touch another's
leaves, and if one module dies the others carry on under the same public key. It is the
partitioning of §11.7, done in hardware.

The no-export rule is the standard's most criticized feature. A key that cannot be backed up makes
a vendor depend on one box, or on a careful setup ceremony with several. As of November 2026,
NIST's hash-based signature project page says it is working on a revision of SP 800-208 that
would allow key export while mitigating the risks; John Kelsey outlined the plans in a
November 2024 NIST presentation. Until a revision appears, the 2020 text applies.

### The life of a key, and how it goes wrong

Figure 11.5 draws a key's life. It begins with key generation, which sets the counter to 0. The
signer then alternates between reserving leaves and using them, until the last leaf is used
and the key is retired. Every arrow out of that loop is a failure, and they differ sharply in
how bad they are.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Lifecycle of a stateful key: generate with q equal to 0, reserve a block by writing the new limit to durable storage, sign with q and advance, repeat until all leaves are used and the key is retired. Below, three failures: a crash skips reserved leaves and is safe; a restored backup or snapshot moves q back and reuses leaves; a copied key gives two signers the same q and reuses leaves." fill="currentColor" font-size="14">
<g fill="none" stroke="currentColor"><rect x="10" y="40" width="130" height="50" rx="5"/><rect x="165" y="40" width="140" height="50" rx="5"/><rect x="330" y="40" width="130" height="50" rx="5" stroke-width="2"/><rect x="485" y="40" width="145" height="50" rx="5"/></g>
<g text-anchor="middle" font-size="13"><text x="75" y="61">generate key</text><text x="75" y="79">q = 0</text><text x="235" y="61">reserve a block</text><text x="235" y="79">write limit first</text><text x="395" y="61">sign with q,</text><text x="395" y="79">then q + 1</text><text x="557" y="61">all leaves used:</text><text x="557" y="79">retire the key</text></g>
<g stroke="currentColor"><line x1="140" y1="65" x2="161" y2="65"/><line x1="305" y1="65" x2="326" y2="65"/><line x1="460" y1="65" x2="481" y2="65"/></g>
<g><polygon points="165,65 157,61 157,69"/><polygon points="330,65 322,61 322,69"/><polygon points="485,65 477,61 477,69"/></g>
<polyline points="395,40 395,22 235,22 235,36" fill="none" stroke="currentColor"/><polygon points="235,40 231,32 239,32"/>
<text x="250" y="16" font-size="12" fill-opacity=".7">block used up: reserve the next</text>
<g stroke="currentColor" stroke-dasharray="4 3"><line x1="395" y1="90" x2="105" y2="168"/><line x1="395" y1="90" x2="320" y2="168"/><line x1="395" y1="90" x2="535" y2="168"/></g>
<rect x="10" y="170" width="190" height="60" rx="5" fill="none" stroke="currentColor"/>
<g fill="currentColor" fill-opacity=".12"><rect x="225" y="170" width="190" height="60" rx="5"/><rect x="440" y="170" width="190" height="60" rx="5"/></g>
<g fill="none" stroke="currentColor" stroke-width="2.4"><rect x="225" y="170" width="190" height="60" rx="5"/><rect x="440" y="170" width="190" height="60" rx="5"/></g>
<g text-anchor="middle" font-size="13"><text x="105" y="193">crash or power loss</text><text x="105" y="214" fill-opacity=".7">leaves skipped: safe</text><text x="320" y="193">old snapshot restored</text><text x="320" y="214" font-weight="bold">q goes back: reuse</text><text x="535" y="193">key copied elsewhere</text><text x="535" y="214" font-weight="bold">same q twice: reuse</text></g>
<text x="10" y="262" font-size="13">Only a counter outside whatever gets copied or rolled back (a hardware module,</text>
<text x="10" y="282" font-size="13">a monotonic counter, a partitioned tree) turns the bold failures into impossible ones.</text>
</svg>
<figcaption>Figure 11.5. The life of a stateful key. Signing loops between reserving a block of leaves (writing the new limit to durable storage first) and using them. A crash only wastes reserved leaves. Restoring old state or running a copy reuses leaves, and §11.7 showed what reuse gives an attacker.</figcaption>
</figure>

The failure modes, roughly from most to least common:

- **Virtual machine snapshots.** A snapshot captures memory and disk together. Restoring one,
  after a failed upgrade, a ransomware drill or by an automated tool, puts the counter back to
  where it was, with no trace inside the machine that anything happened. RFC 10033 (below)
  names VM cloning and snapshots as a specific risk.
- **Backups and restores.** The same thing on a slower scale: last week's backup of a key file
  carries last week's counter. Every leaf used since is used again.
- **Clones and high-availability pairs.** Two servers behind a load balancer, or a hot spare
  that takes over, each hold the key and their own counter. Unless they share one counter
  atomically, they will sign with the same leaf.
- **Crashes between signing and saving.** If the signature leaves before the counter is
  durable, a crash reuses that leaf. The order of §11.6 makes this a skipped leaf instead.
- **Storage that lies.** Flash memory wears out, and some disks acknowledge writes that are
  still in a cache. A counter "written" to such storage may silently revert after a power
  cut. Good hardware modules keep counters in storage they check on every write.
- **Faults.** A glitch during signing can make the chain computation run on a corrupted digest
  and release a second, different one-time signature for the same leaf. Signing twice and
  comparing, or verifying before releasing, catches this.

**Reservation.** Writing to durable storage before every signature is slow, and flash wears
out. The fix proposed by McGrew and coauthors (2016) is to reserve leaves in blocks: write
"next free leaf = $q + 100$" once, then sign up to 100 times from memory. A crash loses at most
the rest of the block, which is harmless; it costs only leaves. Figure 11.5 shows the loop.

**Code it.** A signer that keeps its counter in a virtual machine, with block reservation, a
crash, a snapshot and a restore. A log of every signature the verifiers see flags a leaf used
for two different messages.

```python
# The state counter in practice: block reservation, a crash, and a virtual-machine snapshot.
# A log of every signature the verifiers have seen flags any leaf used for two messages.
import copy

class VMSigner:                       # the counter lives in the VM's disk and memory
    def __init__(self, disk, block):
        self.disk, self.block = disk, block
        self.next = self.limit = disk["q"]
    def sign(self, msg):
        if self.next == self.limit:   # reserve a block: write the new limit first, use it after
            self.limit = self.next + self.block
            self.disk["q"] = self.limit
        q, self.next = self.next, self.next + 1
        return q, msg

log = {}
def publish(signer_name, q, msg):
    reused = q in log and log[q] != msg
    log.setdefault(q, msg)
    print(f"{signer_name:9} leaf {q:2}  {msg}" + ("   <- LEAF USED TWICE" if reused else ""))

disk = {"q": 0}
vm = VMSigner(disk, 10)
for m in ("release 1.0", "release 1.1"):
    publish("vm", *vm.sign(m))
vm = VMSigner(disk, 10)               # crash and restart: the reserved leaves 2..9 are skipped
publish("vm", *vm.sign("release 1.2"))
snapshot = copy.deepcopy(vm)          # an operator snapshots the whole VM, memory and disk
publish("vm", *vm.sign("release 1.3"))
vm = snapshot                         # ... and later restores it after a failed upgrade
publish("restored", *vm.sign("emergency patch"))

hsm = {"q": 12}                       # the fix: the counter lives in a module the snapshot
                                      # cannot touch; it already stands at 12
def hsm_sign(msg):
    q = hsm["q"]; hsm["q"] = q + 1    # advanced inside the module before the signature leaves
    return q, msg
publish("hsm", *hsm_sign("emergency patch"))
print("distinct leaves used:", len(log), "  highest leaf:", max(log))
```

It prints:

```text
vm        leaf  0  release 1.0
vm        leaf  1  release 1.1
vm        leaf 10  release 1.2
vm        leaf 11  release 1.3
restored  leaf 11  emergency patch   <- LEAF USED TWICE
hsm       leaf 12  emergency patch
distinct leaves used: 5   highest leaf: 12
```

The crash costs eight leaves (2 to 9), and nothing else: the restarted signer reads the limit
of 10 from disk and starts there. The snapshot is the disaster. The restored machine has the
same disk and the same memory as before release 1.3, so it believes leaf 11 is free and signs
the emergency patch with it. Nothing inside the virtual machine can notice, because everything
inside it has been put back. Only the log, kept somewhere else, sees two messages on leaf 11,
and by then an attacker has what §11.7 needs.

The `hsm` line shows the fix. A counter kept in a separate hardware module is not part of
any snapshot: the module's counter already stands at 12, so the restored machine's request
gets leaf 12, whatever the machine believes. That is SP 800-208's rule in one line of code.

### Fix it: defenses in layers

No one defense covers every failure, so careful deployments stack them.

1. **Keep the counter in the module.** The module that holds the key advances the counter
   before the signature leaves, in storage it controls. Snapshots, restores and clones of the
   host cannot touch it.
2. **Partition.** Give each module its own tree (separate keys) or its own bottom trees
   (a distributed HSS key). Two modules can then never collide, even if they never talk.
3. **Watch the signatures.** Every signature carries its leaf index in the clear. A release
   pipeline that logs each $(q, \text{message hash})$ pair, or a public transparency log in the
   style of Certificate Transparency, turns reuse from silent to obvious. RFC 10033 suggests
   exactly this kind of monitoring.
4. **Make devices refuse old leaves.** Firmware releases are sequential, so a device can store
   the highest leaf index it has accepted and refuse any signature with a lower or equal one,
   like the anti-rollback version counters many boot loaders already keep. A forgery from a
   reused leaf $q$ then fails on every device that saw the first signature on $q$. Devices
   that skipped that release are not protected, so this backs up the other layers rather than
   replacing them.
5. **Plan for exhaustion.** Alert well before the last leaf (RFC 10033 recommends a
   configurable warning threshold), and have the next key trusted by devices before the
   current one runs out.

**Backups without copies.** RFC 10033, *Hash-Based Signatures: State and Backup Management*
(Informational, September 2026), collects the options. Beyond SP 800-208's distributed
multi-tree setup, it describes generating spare bottom trees from fresh seeds, having the top
tree sign their roots, and exporting each spare seed with its signed root to an offline
backup; the module deletes its own copy at once, so no seed exists in two places. Recovery
imports one seed into a new module and deletes it from the backup medium. The RFC also
discusses pre-assigning leaves to known future messages (leaf 7 for version 7.0), transferring
a key between devices with the source copy destroyed, and why letting a tree endorse a
replacement tree at variable depth is a bad fit for secure boot, where verification time must
be fixed.

## 11.12 Standards and where they are used

*Level: expert.*

**NIST SP 800-208** (October 2020), *Recommendation for Stateful Hash-Based Signature
Schemes*, approves LMS, HSS, XMSS and XMSS^MT with SHA-256, SHA-256/192 and SHAKE256 at 192 and
256 bits. Its hardware rule, described in §11.11, is found nowhere else in NIST's signature
standards. It approves a subset of the RFCs' parameter sets (no SHA-512 or SHAKE128 versions
of XMSS) and adds the 24-byte ones.

**The IETF documents** around the two schemes have grown since the RFCs of 2018 and 2019:

- RFC 8554 (LMS and HSS, April 2019) and RFC 8391 (XMSS and XMSS^MT, May 2018), the
  specifications;
- RFC 9858 (October 2025, an IRTF document by Fluhrer and Dang), the SHA-256/192, SHAKE256/256
  and SHAKE256/192 parameter sets for LMS, as SP 800-208 had already defined them;
- RFC 9708 (January 2025), HSS/LMS in the Cryptographic Message Syntax (CMS), the signed
  container used among other things for firmware packages, replacing RFC 8708 (2020);
- RFC 9802 (June 2025), HSS, XMSS and XMSS^MT in X.509 certificates and revocation lists;
- RFC 10033 (September 2026), the state and backup management guide of §11.11.

**NSA's CNSA 2.0** (announced September 2022; FAQ version 2.1, December 2024) approves LMS and
XMSS from SP 800-208 for software and firmware signing, at all classification levels and with
all of SP 800-208's parameters, and recommends LMS with SHA-256/192. Its timeline for this
category is the earliest in the suite: vendors should support and prefer CNSA 2.0 signing by
2025 and use it exclusively by 2030. Two details matter in practice. First, NSA's guidance
(as of November 2026) does not allow the multi-tree forms HSS and XMSS^MT in national security
systems, so a vendor needing redundancy uses several separate single-tree keys. Second, a
signing workflow that needs more signatures than one tree gives, or must run on many machines
at once, is better served by ML-DSA, which CNSA 2.0 also approves. Stateful schemes are being deployed now, ahead of ML-DSA in some
products, for the reason this chapter opened with: firmware signing is done by a handful of
release servers, which can manage state, while verification happens in millions of devices
that can never change their keys.

**Where they are used.** Secure-boot and firmware-update chains in servers, network
equipment and embedded chips; hardware security modules with LMS and XMSS support; some
code-signing systems. Their verification code is tiny, a hash function and a loop, which suits
a boot ROM that cannot be patched. One public example is **Caliptra**, an open-source silicon
root of trust developed in the CHIPS Alliance for data-center processors. Its ROM checks each
firmware image with an ECDSA P-384 signature together with either an LMS signature (SHA-256/192,
height 15, $w = 4$: the 1,620-byte signature of §11.10) or, in newer versions, ML-DSA-87. The
manufacturer's key descriptor lists up to 32 LMS public keys, and a fuse bit can revoke each
one. That is the CNSA-friendly pattern: many independent single trees instead of one
hierarchy, each giving 32,768 signatures, with revocation burned into the chip.

**Mars.** The relay satellites between Arcadia City and Earth accept new software only with an
LMS signature from a key that was fixed when they were built. That key is an HSS key in a
hardware module at the ground station; each release uses one leaf; the module's counter is the
only copy of the state. With two levels of height 10, the satellites' key can sign a million
releases, far more than they will ever receive, and their verification needs nothing but
SHA-256, which their radiation-hardened processors already run for checksums.

### Mars: a probe's firmware key on a long mission

A harder case is a survey probe that Arcadia City sends into Mars orbit for a 25-year mission.
Its boot ROM holds the hashes of three LMS public keys (SHA-256/192, $h = 15$), burned in
before launch, and it accepts a firmware image signed by any one that has not been revoked.
Key A lives in a hardware module at the mission's Earth ground station, key B in a module at
Arcadia City, and key C in a module sealed in a vault on Earth, never switched on unless both
others are lost.

Why not one key with one counter shared between the two ground stations? Because the
stations are 3 to 22 light-minutes apart, one way. A shared counter means asking the other
planet "which leaf is next?" and waiting for the answer before signing: a round trip of 6 to
44 minutes, and no answer at all while the Sun is between the planets, which cuts the link for
about two weeks near every solar conjunction. Worse, if the link drops after one station has
reserved a leaf but before the other has heard, both may sign with it. Partitioning removes the
question. Each module owns its own key, and no signature ever waits for the other planet.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Key A in a hardware module on Earth and key B in a module at Arcadia City each sign firmware for a probe in Mars orbit. The probe trusts keys A, B and spare key C and remembers the highest leaf it has accepted under each. The two stations share no counter, because a round trip between the planets takes 6 to 44 minutes." fill="currentColor" font-size="14">
<rect x="20" y="30" width="180" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
<g text-anchor="middle"><text x="110" y="56">Earth station</text><text x="110" y="78" font-size="13">module: key A</text></g>
<rect x="440" y="30" width="180" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
<g text-anchor="middle"><text x="530" y="56">Arcadia City</text><text x="530" y="78" font-size="13">module: key B</text></g>
<line x1="200" y1="65" x2="440" y2="65" stroke="currentColor" stroke-dasharray="5 4" stroke-opacity=".6"/>
<text x="320" y="56" text-anchor="middle" font-size="12" fill-opacity=".7">no shared counter</text>
<text x="320" y="82" text-anchor="middle" font-size="12" fill-opacity=".7">round trip 6 to 44 min</text>
<rect x="20" y="200" width="170" height="34" rx="5" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="105" y="222" text-anchor="middle" font-size="13">Earth vault: spare key C</text>
<rect x="230" y="170" width="180" height="78" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
<g text-anchor="middle"><text x="320" y="193">probe in Mars orbit</text><text x="320" y="214" font-size="12">trusts A, B, C (revocable)</text><text x="320" y="233" font-size="12">highest leaf seen per key</text></g>
<g stroke="currentColor"><line x1="140" y1="100" x2="290" y2="166"/><line x1="500" y1="100" x2="350" y2="166"/></g>
<polygon points="293,168 283,167 287,159"/><polygon points="347,168 353,159 357,167"/>
<text x="30" y="145" font-size="12" fill-opacity=".7">3 to 22 light-min</text>
<text x="450" y="190" font-size="12" fill-opacity=".7">local relay</text>
</svg>
<figcaption>Figure 11.6. A probe's firmware keys split across two planets. Each station signs only with its own key and counter, so no signature waits for a 6 to 44 minute round trip. The probe trusts three keys, can be told to revoke one, and refuses any leaf index at or below the highest it has already accepted under that key.</figcaption>
</figure>

State loss is more dangerous here than on Earth for three reasons.

- **Every signature is public.** Commands and firmware go up by radio, and anyone with a dish
  can record them. A reused leaf hands an eavesdropper the material of §11.7, and with a few
  reuses it can sign a command to fire the thrusters until the tanks are dry, or a firmware
  image that turns off the safe-mode watchdog.
- **The fix travels at light speed and needs a key.** If Arcadia City's module is the one that
  loses its state, the revocation of key B must come from Earth, signed with key A or C. It
  takes 3 to 22 minutes to arrive and as long again to be confirmed, and during a conjunction
  blackout it cannot be sent at all; all that time the probe still trusts B. If the operators
  had only one key, a lost or broken state would leave them no trusted way to send even the
  revocation.
- **Nobody can visit.** On Earth, a device whose keys are compromised can be recalled or
  reflashed by hand. A probe cannot, so its boot ROM's rules are final for 25 years.

The probe's own defenses follow §11.11. It keeps, in radiation-tolerant memory, the highest
leaf it has accepted under each key, and rejects anything at or below it; firmware for a
single probe is strictly sequential, so this costs nothing. Each module reserves leaves in
small blocks and alerts at 90 percent use. And because each tree has 32,768 leaves, a release
a week for 25 years (1,300 signatures) uses 4 percent of key A, leaving almost all of it as
margin for emergency patches. The probe verifies with SHA-256 alone, which its processor
already runs to check memory, so there is no lattice code on board that a future attack could
make obsolete.

## 11.13 Going deeper

*Level: expert.*

- **Security proofs.** Katz's "Analysis of a Proposed Hash-Based Signature Standard" (SSR 2016)
  analyzes LMS; Hülsing's "W-OTS+: Shorter Signatures for Hash-Based Signature Schemes"
  (AFRICACRYPT 2013) and the XMSS papers cover XMSS. Hülsing, Rijneveld and Song, "Mitigating
  Multi-Target Attacks in Hash-Based Signatures" (PKC 2016), explains why the tags of §11.5 and
  the addresses of §11.9 are needed once there are billions of targets.
- **State management.** McGrew, Kampanakis, Fluhrer, Gazdag, Butin and Buchmann, "State
  Management for Hash-Based Signatures" (SSR 2016), surveys how state goes wrong in real
  systems and proposes the reservation strategy; RFC 10033 (2026) brings it up to date with
  backups, transfer and monitoring.
- **Fast key generation and traversal.** Tree traversal algorithms (Szydlo's of 2004, and the
  BDS algorithm of Buchmann, Dahmen and Schneider, 2008) compute authentication paths without
  storing the whole tree. Key generation parallelizes perfectly across leaves, which is how
  hardware modules make tall trees in reasonable time.
- **Comparisons.** Kampanakis and Fluhrer (2017) compare LMS and XMSS for adopters; Campos,
  Kohlstadt, Reith and Stöttinger (AFRICACRYPT 2020) measure both on an ARM Cortex-M4.
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

??? question "2. Why does a signer write the incremented counter before releasing the signature, not after?"

    If it crashes after releasing but before saving, the restarted signer would reuse the
    key. Saving first means a crash at worst skips a key, which is harmless.

??? question "3. What does HSS gain over a single tall tree, and what does it cost?"

    Only the top tree must be generated at the start; lower trees are made when needed, so
    key generation is fast and a huge number of signatures is possible. Each signature carries
    one LMS signature per level, so it is longer.

??? question "4. Using RFC 8554's rule, how many chains does LM-OTS need with a 24-byte hash and w = 4, and how long is an LMS signature with h = 15?"

    $u = 48$ message digits; the largest checksum is $15 \times 48 = 720$, which needs 10 bits,
    so $v = 3$ and $p = 51$. The signature is $4 + (4 + 24 + 51 \times 24) + 4 + 15 \times 24 =
    1{,}620$ bytes, the size Caliptra's ROM expects.

??? question "5. A team picks LMS leaves at random from a tree of height 20 instead of keeping a counter. Roughly when does a reuse become a 1% risk?"

    By the birthday bound, after about $\sqrt{0.02 \times 2^{20}} \approx 145$ signatures. By a
    thousand signatures the chance is about 38%.

??? question "6. An attacker has two signatures from the same LM-OTS key. What can it sign?"

    Any message (with a randomizer of its choosing) whose every digit, including the
    checksum digits, is at least the smaller of the two revealed digits in that position.
    Finding one takes a search, feasible on ordinary hardware.

??? question "7. Name two technical differences between XMSS and LMS, and say which is faster."

    XMSS's WOTS+ XORs a bitmask into each hash step and hashes under a per-step key, both
    derived from the public seed and an address; it compresses the one-time public key with an
    L-tree. LMS uses tagged inputs and one hash for the one-time public key. An LMS chain step
    is one 55-byte hash (one SHA-256 compression); an XMSS step is three 96-byte hashes, so
    LMS is several times faster. XMSS has the tighter proof from second-preimage resistance.

??? question "8. What extra requirement does SP 800-208 impose that FIPS 204 does not?"

    Key generation and signing must happen in hardware cryptographic modules (FIPS 140
    Level 3 or higher) that do not export private keys, even encrypted, so the state cannot be
    copied. Verification may happen anywhere.

??? question "9. A signer reserves leaves in blocks of 100 and writes the limit to disk first. Why does that make crashes safe but not virtual machine snapshots?"

    After a crash, the restarted signer reads the limit from disk and starts after the
    reserved block, so it only skips leaves. A snapshot restores the disk and the memory
    together, so the machine is back in a state where leaves it has already used look free,
    and nothing inside it can tell. Only a counter outside the snapshot, such as one in a
    hardware module, prevents the reuse.

??? question "10. Why does a probe in Mars orbit trust several single-tree keys held on two planets, rather than one key with a shared counter?"

    A shared counter would need a 6 to 44 minute round trip (and fails during conjunction)
    before every signature, and a dropped link could let both stations use the same leaf.
    Separate keys partition the leaves so the stations never need to agree, give a spare if
    one module is lost, and let a surviving key sign the revocation of a compromised one. It
    also fits CNSA 2.0, which does not allow HSS or XMSS^MT.

## What you learned

- Hash-based signatures need only a secure hash function, the most conservative assumption
  available.
- Winternitz chains sign $w$ bits per chain; a checksum stops forgers from moving digits up.
- A Merkle tree puts $2^h$ one-time keys under one 32-byte root; signatures carry $h$
  path nodes.
- LMS (RFC 8554) and XMSS (RFC 8391) are the standardized forms; HSS and XMSS^MT stack trees.
- The code here rebuilds RFC 8554's published root from its seed, and the XMSS code verifies a
  signature from the XMSS reference implementation.
- The number of chains, $p = 67$ for SHA-256 and $w = 4$, follows from rounding the digits
  and the checksum; a 24-byte hash needs 51 and saves almost 40 percent of the signature.
- XMSS adds bitmasks, keys per step and the L-tree for a tighter proof, at several times the
  hashing of LMS; sizes are nearly the same.
- Tree height costs little in signature size and a lot in key generation; HSS and XMSS^MT
  trade larger signatures for small trees.
- Reusing a one-time key quickly leads to forgeries. Crashes are harmless if the counter is
  written first; snapshots, restores and clones are not, so the state must be kept in hardware
  that cannot be copied, partitioned between signers and watched in a log.
- SP 800-208 (2020) approves them, with signing only in hardware modules; CNSA 2.0 uses them,
  single-tree only, for software and firmware signing, exclusively by 2030.

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
- NSA, *Announcing the Commercial National Security Algorithm Suite 2.0* (September 2022)
  and *The Commercial National Security Algorithm Suite 2.0 and Quantum Computing FAQ*,
  version 2.1 (December 2024).
- Jonathan Katz, "Analysis of a Proposed Hash-Based Signature Standard" (SSR 2016).
- Panos Kampanakis and Scott Fluhrer, "LMS vs XMSS: A Comparison of the Stateful Hash-Based
  Signature Proposed Standards" (IACR ePrint 2017/349, 2017).
- Fernando Campos, Tim Kohlstadt, Steffen Reith and Marc Stöttinger, "LMS vs XMSS: Comparison
  of Stateful Hash-Based Signature Schemes on ARM Cortex-M4" (AFRICACRYPT 2020).
- Andreas Hülsing, Joost Rijneveld and Fang Song, "Mitigating Multi-Target Attacks in
  Hash-Based Signatures" (PKC 2016).
- Michael Szydlo, "Merkle Tree Traversal in Log Space and Time" (EUROCRYPT 2004).
- Johannes Buchmann, Erik Dahmen and Michael Schneider, "Merkle Tree Traversal Revisited"
  (PQCrypto 2008).
- Russ Housley, RFC 9708, *Use of the HSS/LMS Hash-Based Signature Algorithm in the
  Cryptographic Message Syntax (CMS)* (January 2025).
- Daniel Van Geest, Kaveh Bashiri, Scott Fluhrer, Stefan-Lukas Gazdag and Stavros Kousidis,
  RFC 9802, *Use of the HSS and XMSS Hash-Based Signature Algorithms in Internet X.509 Public
  Key Infrastructure* (June 2025).
- Scott Fluhrer and Quynh Dang, RFC 9858, *Additional Parameter Sets for HSS/LMS Hash-Based
  Signatures* (October 2025).
- Thom Wiggers, Kaveh Bashiri, Stefan Kölbl, Jim Goodman and Stavros Kousidis, RFC 10033,
  *Hash-Based Signatures: State and Backup Management* (September 2026).
- John Kelsey, "Stateful HBS Backups: Revising 208" (NIST presentation, 12 November 2024).
- CHIPS Alliance, *Caliptra ROM Specification* (caliptra-sw repository, read November 2026).
- OpenSSL 3.6 release notes and the EVP_SIGNATURE-LMS manual page (October 2025).
