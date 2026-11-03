# 22. Hash-based and code-based schemes

*Lattices carry most of the post-quantum load, but a field that learned from
DES, MD5 and SIKE does not bet everything on one assumption. This chapter
builds the two oldest alternatives, both from 1978 and 1979, the same years as
RSA: signatures that need nothing but a hash function, and encryption hidden in
the errors of an error-correcting code. Along the way it shows why a signing key
that keeps a counter is dangerous, how SLH-DSA got rid of the counter, and what
two broken competition finalists, SIKE and Rainbow, teach about trusting new
mathematics.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Lamport's one-time signature works, by hand, and why using it twice is fatal;
    - how Winternitz chains shrink it and Merkle trees put thousands of one-time keys under one public key;
    - why LMS and XMSS must keep state, and how SLH-DSA (FIPS 205) avoids it;
    - how error-correcting codes work, and how McEliece and HQC turn decoding into encryption;
    - how SIKE and Rainbow were broken in 2022, and what that says about choosing assumptions.

    **You need:** [Chapter 9](09-Hash-Functions.md) (preimage and collision resistance),
    [Chapter 20](20-Quantum-Computers.md) (why these are needed) and
    [Chapter 21](21-Lattice-Cryptography.md) (what they back up). Some comfort with
    bits and XOR helps for the codes.

    **Levels:** 22.1 to 22.4 and 22.8 are intermediate; 22.5 to 22.7 and 22.9 to 22.12 are
    intermediate to advanced; 22.13 is expert.

## 22.1 The problem

ML-KEM and ML-DSA rest on module lattices, studied seriously for about thirty
years. That is a long time, but factoring had centuries, and the competition
that chose them also watched two well-studied candidates collapse in 2022. If a
clever idea ever cuts through lattices, the world needs replacements already
standardized and deployed. NIST's answer was to keep a second family for each
job: **hash-based** signatures next to ML-DSA, and **code-based** encryption next
to ML-KEM.

Both families are old. In October 1979 Leslie Lamport, then at SRI
International, wrote a short technical report showing how to sign a message
with nothing but a one-way function. The same year Ralph Merkle's Stanford
thesis showed how to bind many such one-time keys to a single public key with a
tree of hashes, and credited his colleague Robert Winternitz with a trick to
shrink the signatures. A year earlier, in 1978, Robert McEliece at NASA's Jet
Propulsion Laboratory, where error-correcting codes carried pictures back from
deep-space probes, proposed hiding a message among deliberate errors that only
the key holder could remove. Both were overshadowed by RSA, whose keys and
signatures were tiny by comparison. Both are now standards, because the
problem they rest on has resisted every attack, quantum ones included.

## 22.2 Lamport's one-time signature

*Level: intermediate.* Lamport's idea needs only a hash function $H$ that can't
be inverted: given $y$, nobody can find $x$ with $H(x) = y$.

**By hand, for a 4-bit message.** For each bit position $i$ pick two random
secrets, $x_0[i]$ (for a 0) and $x_1[i]$ (for a 1). The private key is all eight
secrets. The public key is their eight hashes, $y_b[i] = H(x_b[i])$.

To sign the message `1011`, reveal one secret per position, chosen by the bit:
$x_1[0], x_0[1], x_1[2], x_1[3]$. The verifier hashes each revealed value and
checks it matches the public hash in the right slot. A forger who wants to sign
`0011` instead would need $x_0[0]$, whose only trace is its hash: inverting $H$.

**Now sign a second message with the same key**, say `0110`. You reveal
$x_0[0], x_1[1], x_1[2], x_0[3]$. Positions 0, 1 and 3 now have **both** secrets
public. Only position 2 still has a hidden secret ($x_0[2]$). So anyone can sign
every 4-bit message whose bit 2 is 1: eight of the sixteen. That is why it is a
**one-time** signature.

**Code it.** Real keys sign the 256-bit SHA-256 hash of the message, so they
hold 256 pairs of 32-byte secrets:

```python
import hashlib, secrets

H = lambda b: hashlib.sha256(b).digest()

def bits(msg):                          # the 256 bits of the message hash
    d = int.from_bytes(H(msg), "big")
    return [d >> i & 1 for i in range(256)]

def keygen():                           # 256 pairs of secrets, and their hashes
    sk = [(secrets.token_bytes(32), secrets.token_bytes(32)) for _ in range(256)]
    return sk, [(H(a), H(b)) for a, b in sk]

def sign(sk, msg):                      # reveal one secret of each pair
    return [pair[b] for pair, b in zip(sk, bits(msg))]

def verify(pk, msg, sig):
    return all(H(s) == pair[b] for s, pair, b in zip(sig, pk, bits(msg)))

sk, pk = keygen()
s1 = sign(sk, b"firmware v1")
print(verify(pk, b"firmware v1", s1), verify(pk, b"firmware v2", s1))
s2 = sign(sk, b"firmware v2")           # the same key, used a second time
print(sum(a != b for a, b in zip(s1, s2)))
```

Output:

```
True False
132
```

After the second signature, 132 of the 256 pairs are fully known. A forger
needs a message whose hash agrees with the remaining secrets in the other 124
positions, about $2^{124}$ tries: already below the 128-bit target. Each further
reuse roughly halves what is left.

**The cost.** The public key is $2 \times 256$ hashes, 16 KB, and a signature is
256 secrets, 8 KB, for one message. Everything else in this half of the chapter
makes that smaller and makes "one message" into many.

## 22.3 Winternitz chains

*Level: intermediate.* Winternitz's trick signs several bits at once with a
**hash chain**. Take a secret $x$ and hash it repeatedly:
$x \to H(x) \to H(H(x)) \to \cdots$. The last value is public. To sign a digit $d$,
reveal the value after $d$ hashes; the verifier hashes the rest of the way and
checks it reaches the public end.

**By hand.** One chain for base-4 digits (0 to 3), with SHA-256 cut to 8 hex
digits so it fits on the page. Each step hashes the 8-character text of the
previous value:

| Position | Value | Role |
|---|---|---|
| 0 | `secret` | the secret start |
| 1 | `2bb80d53` | |
| 2 | `97eff218` | |
| 3 | `faa88dfc` | the public end |

To sign the digit 2, reveal `97eff218`. The verifier hashes it $3 - 2 = 1$ more
time, gets `faa88dfc`, and accepts. One chain signed 2 bits; Lamport needed two
secrets per bit.

**The catch, and the checksum.** Anyone who sees `97eff218` can hash it once
more and present `faa88dfc` as a signature of the digit 3. Hashing forward is
easy; only backward is hard. So the signer also signs a **checksum**, the sum of
$3 - d$ over all message digits. Raising any message digit lowers the checksum,
and lowering a signed checksum digit would need hashing backward.

For the message digits $(2, 0, 3, 1)$, the checksum is
$1 + 3 + 0 + 2 = 6$, written in base 4 as $(1, 2)$. A forger who wants
$(3, 0, 3, 1)$ can produce the first chain value, but the checksum becomes 5,
or $(1, 1)$, and the second checksum digit must go from 2 down to 1. That is a
preimage of the hash.

With base 16, as XMSS and SLH-DSA use, a 256-bit hash is 64 digits plus a
3-digit checksum: 67 chains of 15 steps instead of Lamport's 512 values. The
signature shrinks from 8 KB to about 2 KB; signing and verifying each cost a
few hundred hashes more. This **Winternitz one-time signature** (WOTS, and its
variant WOTS+ with random masks) is the building block of every scheme below.

## 22.4 Merkle trees: many keys, one public key

*Level: intermediate.* A one-time key per message would mean publishing a new
public key every time. Merkle's answer: make many one-time keys, hash their
public keys in pairs, hash the results in pairs, and so on up to a single
**root**. The root is the public key, and it fits in 32 bytes however many
one-time keys sit under it.

**By hand, with four one-time keys.** Again SHA-256 cut to 8 hex digits; the
leaves are hashes of the strings `pk0` to `pk3`, and each parent is the hash of
its two children's digits written one after the other.

| Node | Calculation | Value |
|---|---|---|
| Leaves 0 to 3 | `H(pk0)` … `H(pk3)` | `dd1d1884`, `6e73bff1`, `11e85b77`, `f7f5f313` |
| Left parent | H(leaf 0, leaf 1) | `171968e6` |
| Right parent | H(leaf 2, leaf 3) | `094f95e5` |
| Root (public key) | H(left, right) | `0720d477` |

To sign with leaf 1, send: the leaf number 1, the one-time signature, and the
**authentication path**, the siblings on the way up: `dd1d1884` and `094f95e5`.
The verifier recovers the one-time public key from the one-time signature,
hashes it with `dd1d1884` (on the left, since leaf 1 is a right child) to get
`171968e6`, then with `094f95e5` to get `0720d477`. That is the root, so the
one-time key belonged to this tree.

A tree of height $h$ holds $2^h$ one-time keys, and each signature carries $h$
sibling hashes. With $h = 20$, a million signatures cost 20 extra hashes each.

## 22.5 Code it: a stateful hash-based signature

*Level: intermediate to advanced.* Put the pieces together: 16 Winternitz keys
(base 16, with a 3-digit checksum) under a Merkle tree of height 4, all made
from one secret seed. This is XMSS and LMS in miniature, without the masks and
domain separation the real ones add.

```python
import hashlib, secrets

N, HT = 16, 4                           # 16-byte hashes, a tree of 2^4 = 16 one-time keys

def h(*xs):
    return hashlib.sha256(b"".join(xs)).digest()[:N]

def chain(x, steps):
    for _ in range(steps):
        x = h(x)
    return x

def digits(msg):                        # 32 base-16 digits of the hash, then a 3-digit checksum
    d = [b >> s & 15 for b in h(msg) for s in (4, 0)]
    c = sum(15 - x for x in d)          # at most 32 * 15 = 480, which fits in 3 digits
    return d + [c >> 8 & 15, c >> 4 & 15, c & 15]

def wots_key(seed, i):                  # one-time key number i, regenerated from the seed
    sk = [h(seed, i.to_bytes(4, "big"), j.to_bytes(4, "big")) for j in range(35)]
    return sk, h(*[chain(x, 15) for x in sk])

def wots_pk_from_sig(sig, msg):         # finish every chain; the ends must give the one-time public key
    return h(*[chain(s, 15 - d) for s, d in zip(sig, digits(msg))])

seed = secrets.token_bytes(32)
tree = [[wots_key(seed, i)[1] for i in range(2 ** HT)]]
while len(tree[-1]) > 1:                # hash pairs upward to the root
    lvl = tree[-1]
    tree.append([h(lvl[i], lvl[i + 1]) for i in range(0, len(lvl), 2)])
root = tree[-1][0]                      # the public key: 16 bytes
state = 0                               # the next unused leaf: the state

def sign(msg):
    global state
    i, state = state, state + 1         # move the state on BEFORE releasing the signature
    sk, _ = wots_key(seed, i)
    ots = [chain(x, d) for x, d in zip(sk, digits(msg))]
    path = [tree[l][(i >> l) ^ 1] for l in range(HT)]        # the sibling at each level
    return i, ots, path

def verify(root, msg, sig):
    i, ots, path = sig
    node = wots_pk_from_sig(ots, msg)
    for l, sib in enumerate(path):
        node = h(node, sib) if (i >> l) & 1 == 0 else h(sib, node)
    return node == root

s1, s2 = sign(b"firmware v1"), sign(b"firmware v2")
print(verify(root, b"firmware v1", s1), verify(root, b"firmware v2", s2), verify(root, b"firmware v3", s1))
print(s2[0], state, 4 + 35 * N + HT * N)
```

Output:

```
True True False
1 2 628
```

The public key is 16 bytes; each signature is 628 bytes (a 4-byte leaf number,
35 chain values and 4 path hashes). After two signatures the state says leaf 2
is next. After 16, the key is spent.

## 22.6 The state problem: LMS and XMSS

*Level: intermediate to advanced.* The variable `state` in that program is the
whole difficulty. If it ever goes backward, a leaf signs twice, and section 22.2
showed what that means. For Winternitz keys it is worse than for Lamport: two
signatures with one WOTS key leave essentially no security (Bruinderink and
Hülsing showed practical forgeries in 2016).

Ordinary operations make the state go backward:

- restoring a backup of the key, or a snapshot of a virtual machine;
- two signing servers holding copies of the key for availability;
- a crash after the signature leaves but before the new counter reaches disk
  (which is why the program updates `state` first).

The standardized schemes are refinements of section 22.5:

- **LMS** (Leighton-Micali Signatures), from a 1995 patent by Frank Leighton and
  Silvio Micali, published as RFC 8554 in 2019. **HSS** stacks up to eight
  LMS trees, each signing the root of the one below, so a key can sign billions
  of messages without building one enormous tree.
- **XMSS**, by Johannes Buchmann, Erik Dahmen and Andreas Hülsing (2011),
  published as RFC 8391 in 2018, with a multi-tree form XMSS^MT. Its proof needs
  weaker properties of the hash.

NIST approved both in SP 800-208 (2020), the first post-quantum signatures it
standardized, but called them "not suitable for general use": key generation and
signing must happen inside a hardware security module that never exports the
key. NSA's CNSA 2.0 requires LMS or XMSS for signing software and firmware,
where one carefully run machine signs a few releases a year and millions of
devices verify them for decades.

| Parameter set | Signatures per key | Signature |
|---|---|---|
| LMS, SHA-256, $h = 10$, $w = 8$ | 1,024 | 1,452 B |
| LMS, SHA-256, $h = 20$, $w = 8$ | about a million | 1,772 B |
| XMSS-SHA2_20_256 | about a million | 2,820 B |

Public keys are under 70 bytes. Full details:
[Stateful hash-based signatures](../02-signatures/Stateful-Hash-Signatures.md).

## 22.7 SLH-DSA: dropping the state

*Level: intermediate to advanced.* Can you have a hash-based signature with no
counter at all? The idea in SPHINCS (Daniel Bernstein and others, 2015) is to
make the tree so large that the signer can **pick a leaf at random** and never
expect to repeat one. With $2^{64}$ leaves, a million signatures collide on a
leaf with probability about $2^{-25}$, and a collision should be survivable
rather than fatal.

Three changes make that work.

1. **A hypertree.** A single tree of height 63 can't be built, so SLH-DSA stacks
   $d$ layers of small Merkle trees (XMSS trees), each of height $h'$. Every tree
   is made from the secret seed only when needed. A tree's WOTS+ keys sign the
   roots of the trees below it; the top root is the public key.
2. **A few-time signature at the bottom.** The bottom trees sign not the message
   but the public key of a **FORS** instance (Forest Of Random Subsets): $k$
   small trees with $2^a$ leaves each. The message digest picks one leaf in
   each tree to reveal. If the same FORS key is reused a few times, security
   drops slowly instead of collapsing, which covers the rare leaf collision.
3. **The leaf comes from the message.** The signer computes a randomizer $R$
   from its secret and the message, hashes $R$ with the message, and uses part of
   the result to choose the hypertree leaf and the rest as the FORS digest.

**The size, by formula.** A signature is the randomizer, the FORS signature
(for each of $k$ trees, one secret plus $a$ path hashes), and for each of $d$
layers a WOTS+ signature ($2n + 3$ chains for $n$-byte hashes) plus $h'$ path
hashes. Counting $n$-byte values:

$$
1 + k(a + 1) + d\,(2n + 3 + h').
$$

For SLH-DSA-SHA2-128s, $n = 16$, $k = 14$, $a = 12$, $d = 7$, $h' = 9$:

$$
16 \times \bigl(1 + 14 \cdot 13 + 7 \cdot (32 + 3 + 9)\bigr) = 16 \times (1 + 182 + 308) = 7{,}856 \text{ bytes}.
$$

The "f" (fast) sets use more, shorter trees: 128f has $d = 22$ layers of height
$h' = 3$ and $k = 33$ FORS trees of height $a = 6$, giving
$16 \times (1 + 33 \cdot 7 + 22 \cdot 38) = 17{,}088$ bytes, but signing builds much
smaller trees.

| Level | Category | Public key | Signature (s) | Signature (f) |
|---|---|---|---|---|
| 128 | 1 | 32 B | 7,856 B | 17,088 B |
| 192 | 3 | 48 B | 16,224 B | 35,664 B |
| 256 | 5 | 64 B | 29,792 B | 49,856 B |

**The cost.** Signatures are 3 to 20 times larger than ML-DSA's, and signing is
slow: SPHINCS+ benchmarks put SHA2-128s at about 650 million cycles, a fifth of a
second, while verifying takes 1 to 2 million. In exchange SLH-DSA's only
assumption is that SHA-2 or SHAKE behaves like a good hash, the most studied
assumption in the field. SPHINCS+, by a large team led by Andreas Hülsing,
entered NIST's process in 2017, was selected in 2022, and became FIPS 205 in
August 2024. Use it for things signed rarely and trusted for decades: root
certificates, firmware, boot loaders, and as a second kind of mathematics next
to ML-DSA. Full details: [SLH-DSA reference](../02-signatures/SLH-DSA.md).

## 22.8 Error-correcting codes

*Level: intermediate.* Now the second family. An **error-correcting code** adds
redundancy so a message survives flipped bits. The **Hamming code** of length 7
(Richard Hamming, Bell Labs, 1950) protects 4 data bits with 3 check bits and
fixes any single error. It is defined by a **parity-check matrix** $H$ whose 7
columns are the 7 nonzero 3-bit vectors:

$$
H = \begin{pmatrix}
1 & 1 & 0 & 1 & 1 & 0 & 0 \\
1 & 0 & 1 & 1 & 0 & 1 & 0 \\
0 & 1 & 1 & 1 & 0 & 0 & 1
\end{pmatrix}.
$$

A 7-bit word $c$ is a **codeword** when $Hc = 0$ (all arithmetic mod 2, so
addition is XOR).

**By hand.** The data `1011` encodes to the codeword `1011010`; check:
each row of $H$ has an even number of 1s in the positions where the codeword
has 1s, so $Hc = (0, 0, 0)$. Now flip bit 3 in transit: the receiver gets
`1001010`. It computes the **syndrome**

$$
H \cdot \texttt{1001010} = (0, 1, 1),
$$

which is the third column of $H$. So bit 3 is wrong; flip it back. In general,
if $y = c + e$, then $Hy = Hc + He = He$: the syndrome depends **only on the
error**, and for the Hamming code it names the error's position directly.

**Why decoding is hard in general.** For a code with a nice structure
(Hamming, Reed-Solomon, Goppa) there are fast decoders. For a **random** code,
finding the low-weight $e$ with a given syndrome $He$ is NP-hard in general
(Berlekamp, McEliece and van Tilborg, 1978). The best attacks, **information-set
decoding**, start from Eugene Prange's 1962 method: guess a set of positions
that are probably error-free, solve the linear equations on the rest, and check
whether the error found is light enough. Sixty years of improvements have
lowered the exponent only modestly.

## 22.9 McEliece: hiding a code

*Level: intermediate to advanced.* McEliece's trapdoor: take a code with a fast
decoder, disguise it as a random-looking code, and publish the disguise. The
key holder decodes with the fast decoder; everyone else faces a random-looking
code. Harald Niederreiter's 1986 dual form, which Classic McEliece uses, is the
simplest to show:

- **Private key:** a code's parity-check matrix $H$ with a fast decoder for $t$
  errors, an invertible scrambling matrix $S$, and a column permutation $P$.
- **Public key:** $H' = S H P$.
- **Encrypt:** pick a secret error vector $e$ with exactly $t$ ones; send the
  syndrome $c = H' e$. In a KEM the shared key is a hash of $e$ and $c$.
- **Decrypt:** $S^{-1} c = H (P e)$ is a syndrome for the real code, so the fast
  decoder finds $Pe$; undo the permutation to get $e$.

**Code it,** with the Hamming code ($t = 1$). The message is the position of the
single error:

```python
# Niederreiter (McEliece's dual form) with the Hamming code of length 7, which fixes one error
H = [[1, 1, 0, 1, 1, 0, 0],             # the secret code: its 7 columns are the 7 nonzero 3-bit vectors
     [1, 0, 1, 1, 0, 1, 0],
     [0, 1, 1, 1, 0, 0, 1]]
S = [[1, 1, 0], [0, 1, 1], [1, 1, 1]]   # secret scrambler: an invertible 3x3 matrix over GF(2)
S_inv = [[0, 1, 1], [1, 1, 1], [1, 0, 1]]
P = [4, 0, 6, 2, 5, 1, 3]               # secret shuffle: public column j is secret column P[j]

def mat_vec(M, v):                      # matrix times vector, mod 2
    return [sum(a & b for a, b in zip(row, v)) % 2 for row in M]

cols = [mat_vec(S, [H[r][P[j]] for r in range(3)]) for j in range(7)]
pub = [[cols[j][r] for j in range(7)] for r in range(3)]      # public key: S * H * P

def encrypt(pos):                       # the message is the position of one error
    e = [int(j == pos) for j in range(7)]
    return mat_vec(pub, e)              # the ciphertext is the syndrome

def decrypt(c):
    s = mat_vec(S_inv, c)               # undo the scrambler: a column of H
    j = [[H[r][k] for r in range(3)] for k in range(7)].index(s)
    return P.index(j)                   # undo the shuffle

print(pub)
print([encrypt(m) for m in range(7)])
print([decrypt(encrypt(m)) for m in range(7)])
```

Output:

```
[[1, 0, 0, 1, 1, 1, 0], [0, 1, 1, 0, 1, 1, 0], [1, 0, 1, 0, 1, 0, 1]]
[[1, 0, 1], [0, 1, 0], [0, 1, 1], [1, 0, 0], [1, 1, 1], [1, 1, 0], [0, 0, 1]]
[0, 1, 2, 3, 4, 5, 6]
```

At this size the disguise is useless: with one error the ciphertext *is* a
column of the public matrix, and anyone can find which. Security comes from
many errors in a long code. Classic McEliece's mceliece6688128 uses a binary
**Goppa code** of length 6,688 that corrects 128 errors. The ciphertext is a
1,664-bit syndrome of an error of weight 128, and an attacker must find which
128 of 6,688 columns add up to it. Trying every choice means
$\binom{6688}{128} \approx 2^{908}$ possibilities; information-set decoding does
enormously better but still costs far beyond $2^{256}$ bit operations, the
category 5 target.

**Why Goppa codes.** Valery Goppa introduced them in 1970. McEliece chose them
because they have a fast decoder (Patterson's algorithm) and, once scrambled,
look random. Other codes did not survive the disguise. Niederreiter's original
proposal used generalized Reed-Solomon codes, and in 1992 Vladimir Sidelnikov and
Sergey Shestakov recovered their structure from the public key in polynomial
time. Goppa codes have resisted structural attacks for over 45 years.

**The price is the key.** The public key is a $1{,}664 \times 6{,}688$ bit matrix,
stored in systematic form as $1{,}664 \times 5{,}024$ bits: 1,044,992 bytes.

| Parameter set | Category | Public key | Ciphertext |
|---|---|---|---|
| mceliece348864 | 1 | 261,120 B | 96 B |
| mceliece460896 | 3 | 524,160 B | 156 B |
| mceliece6688128 | 5 | 1,044,992 B | 208 B |
| mceliece8192128 | 5 | 1,357,824 B | 208 B |

Tiny ciphertexts, enormous keys. That suits a key sent once and used for years,
such as a VPN peer's static key (the WireGuard add-on Rosenpass uses it this
way), and rules out sending a fresh key in every TLS handshake. Full details:
[code-based KEMs](../01-key-exchange/Code-Based-KEMs.md).

## 22.10 HQC and BIKE: smaller keys from structure

*Level: intermediate to advanced.* The way to shrink a code-based key repeats the
lattice story of [Chapter 21](21-Lattice-Cryptography.md): add structure.
**Quasi-cyclic** codes are built from blocks where each row is the previous one
rotated, so a block is described by its first row, a single polynomial mod
$x^n - 1$. **BIKE** and **HQC** (Hamming Quasi-Cyclic, from a French team
around Carlos Aguilar Melchor and Philippe Gaborit, 2017) both work this way.

HQC looks much like the LWE encryption of Chapter 21, with sparse bit vectors
instead of small numbers. The secrets $x, y$ are sparse; the public key is a
random $h$ and $s = x + h y$. To encrypt $m$, pick sparse $r_1, r_2, e$ and send

$$
u = r_1 + h r_2, \qquad v = \mathrm{encode}(m) + s r_2 + e.
$$

Decryption computes $v - u y = \mathrm{encode}(m) + (x r_2 - r_1 y + e)$. The
bracket is a sparse error, and a fixed **public** code (Reed-Muller inside
Reed-Solomon) removes it. Unlike McEliece, the code is not the secret; the
sparse $y$ is. At the lowest level the public key is about 2.2 KB and the
ciphertext about 4.4 KB.

On 11 March 2025 NIST chose HQC over BIKE as its backup KEM, in case a
breakthrough ever hurts ML-KEM. Its standard was still being drafted in 2026.
Classic McEliece went to ISO instead of NIST.

## 22.11 Break it: SIKE and Rainbow

*Level: intermediate to advanced.* The hash-based and code-based families earned
their place by surviving. Two newer families entered NIST's competition with
attractive properties and were broken in the same year.

**Rainbow (multivariate, broken February 2022).** A multivariate scheme's
public key is a system of quadratic equations in many variables over a small
field. Solving random quadratic systems is NP-hard, and the key holder has a
hidden structure that makes its own system easy. The structure goes back to
Jacques Patarin's **Oil and Vinegar** (1997): variables split into "oil" and
"vinegar", and no equation multiplies two oil variables together, so fixing the
vinegar leaves linear equations. Aviad Kipnis and Adi Shamir broke the balanced
version in 1998; the **unbalanced** version (UOV, Kipnis, Patarin and Goubin,
1999) survived. **Rainbow** (Jintai Ding and Dieter Schmidt, 2005) stacked two
UOV layers for smaller signatures and became a NIST finalist in 2020. In 2020
Ward Beullens found new attacks that cut its security margin; in February 2022 he
published "Breaking Rainbow Takes a Weekend on a Laptop", recovering a level-1
key in about 53 hours. The extra layer that made Rainbow efficient gave the
attacker a foothold that plain UOV doesn't have.

**SIKE (isogenies, broken July 2022).** An isogeny is a map between elliptic
curves that respects their addition. SIDH (David Jao and Luca De Feo, 2011)
built a key exchange from secret walks between supersingular curves, with the
smallest keys of any post-quantum candidate: about 330 bytes. To make the two
parties' walks commute, SIDH published the images of some extra points under
the secret map. SIKE, built on it, reached NIST's fourth round in July 2022.
Weeks later Wouter Castryck and Thomas Decru of KU Leuven used a 1997 theorem of
Ernst Kani about curves of genus two, together with those published points, to
recover a SIKEp434 key in about an hour on one core. Follow-up papers made the
attack work in polynomial time for every parameter set. No quantum computer was
involved.

**What the breaks teach.**

- **Age and attention matter.** SIDH lasted 11 years, Rainbow 17. Lamport's
  hashes and McEliece's Goppa codes have lasted over 45 years of attacks;
  lattices about 30. Assumptions earn trust slowly.
- **Extra structure is extra attack surface.** Rainbow's second layer and SIDH's
  published points were added for efficiency, and both were the openings.
  The same caution explains NTRU Prime's plain ring and the interest in
  unstructured FrodoKEM (Chapter 21).
- **Mathematics from elsewhere arrives without warning.** Kani's theorem was
  25 years old and from a different field.
- **Keep backups from different families**, which is exactly what NIST did:
  SLH-DSA beside ML-DSA, HQC beside ML-KEM. Isogenies are not dead either:
  CSIDH and the signature SQIsign publish no extra points and are unaffected;
  UOV and its relative MAYO remain in NIST's search for additional signatures.

**Breaks of the old families, for balance.** Hash-based and code-based schemes
have been attacked too, mostly in parameters and code. McEliece's original 1978
parameters (length 1,024, 50 errors) fell in 2008, when Daniel Bernstein, Tanja
Lange and Christiane Peters decrypted a challenge ciphertext with improved
information-set decoding; larger parameters were already recommended. During
the competition Ray Perlner, John Kelsey and David Cooper (2022) found that the
SHA-256 versions of SPHINCS+ fell short at the higher levels, because SHA-256's
internal state is only 256 bits; FIPS 205 uses SHA-512 there. HQC and BIKE
implementations leaked keys through timing in rejection sampling (2022), later
fixed. A fault during SPHINCS+ signing can make a WOTS key sign two values and
allow forgery (Castelnovi, Martinelli and Prest, 2018), so hardware open to
tampering should sign twice and compare.

## 22.12 In the real world

- **Firmware and boot signing:** LMS and XMSS (SP 800-208, RFC 8554, RFC 8391),
  required by CNSA 2.0, in HSMs and in roots of trust for data-center chips.
  OpenSSL added LMS verification in 2025.
- **Long-lived roots:** SLH-DSA (FIPS 205) for root certificates and code that
  must be checkable for decades, and as a hedge next to ML-DSA.
- **Key exchange backup:** HQC, once standardized, run next to ML-KEM; Classic
  McEliece for static keys in VPNs and similar niches. Germany's BSI and other
  European agencies have recommended Classic McEliece and FrodoKEM as
  conservative options, though in October 2026 the BSI advised against Classic
  McEliece in new systems after new cost estimates for structural attacks
  (no practical attack is known).
- **Status and sizes:** the [algorithm table](../index.md) and the reference
  pages for [SLH-DSA](../02-signatures/SLH-DSA.md),
  [LMS and XMSS](../02-signatures/Stateful-Hash-Signatures.md) and
  [code-based KEMs](../01-key-exchange/Code-Based-KEMs.md).

## 22.13 Going deeper

*Level: expert.*

??? abstract "What a hash-based signature actually needs from the hash"

    Lamport needs only **one-wayness** (preimage resistance). A Merkle tree whose nodes are $H(\mathit{left} \,\Vert\, \mathit{right})$ needs
    **collision resistance**, which costs $2^{n/2}$ classically, so a plain tree needs a $2n$-bit hash. XMSS and
    SPHINCS+ avoid that: each hash call is **tweaked** with a public seed and a unique address (which tree, which
    layer, which chain, which step), and in XMSS also XORed with a pseudorandom mask. Security then rests on
    **second-preimage** resistance of keyed functions, which costs about $2^n$, so $n = 16$ bytes reaches category 1
    even with Grover ($2^{64}$ quantum steps, with all of Grover's practical limits). The tweaks also defeat
    **multi-target attacks**: without them, an attacker who sees $T$ hash outputs across many signatures could
    invert any one of them with $2^n / T$ work.

??? abstract "FORS and the security of a few-time signature"

    A FORS key has $k$ trees of $2^a$ leaves. One signature reveals one leaf per tree. After $q$ signatures with the
    same FORS key, a forger succeeds if, for some new message digest, every one of the $k$ leaves it selects was
    already revealed. Each tree has revealed at most $q$ of its $2^a$ leaves, so the chance is at most
    $(q / 2^a)^k$ for one try. With $k = 14$ and $a = 12$, two uses give $(2/4096)^{14} = 2^{-154}$ per try. Because the
    hypertree leaf is chosen by the message hash among $2^{h}$ (with $h = 63$ for 128s), the number of times any FORS
    key is used grows only slowly with the total number of signatures; FIPS 205's sets are analyzed for up to
    $2^{64}$ signatures per key.

??? abstract "Information-set decoding and Grover"

    To find $e$ of weight $t$ with $He = s$ for an $(n - k) \times n$ matrix $H$: pick $n - k$ columns at random (an
    "information set" complement), hope all $t$ errors lie among them, and solve the square linear system; the
    chance of a good pick is $\binom{n-k}{t} / \binom{n}{t}$. Prange's method repeats until it succeeds. Stern (1989),
    Dumer, May-Meurer-Thomae (2011), Becker-Joux-May-Meurer (2012) and others allow a few errors outside the set
    and use collision search, lowering the exponent step by step. On a quantum computer, Bernstein (2010) showed Grover applies to the
    random choice of columns, roughly halving the exponent: the same square root as for AES. Classic McEliece's
    parameter sets are chosen against these costs, while structural attacks on the Goppa code are counted
    separately; improved estimates of the latter since 2024 are what led to Germany's 2026 caution.

??? abstract "Why the Kani attack needed the torsion points"

    In SIDH, Alice's secret isogeny $\varphi: E_0 \to E_A$ has degree $2^a$, and she publishes $E_A$ together with
    $\varphi(P), \varphi(Q)$ for a basis $P, Q$ of the $3^b$-torsion, so Bob can push his own walk through. Kani's
    reducibility criterion says when a certain isogeny between products of elliptic curves splits. Castryck and
    Decru built a $(3^b, 3^b)$-isogeny of abelian surfaces from the published images; whether it splits reveals,
    digit by digit, the secret path. Robert's version (2022) shows that knowing an isogeny's action on enough
    torsion points determines it in polynomial time for any starting curve. Schemes that publish no torsion images,
    such as CSIDH (group action) and SQIsign (which represents isogenies through quaternion algebras), lie outside
    this attack.

## Check yourself

??? question "1. A 4-bit Lamport key signed 1100. What can a forger sign? What if it then also signed 1010?"

    After one signature: only 1100 (every other message needs a secret not yet revealed). After the second, positions
    1 and 2 have both secrets public (they differ: 1 and 0, then 0 and 1), while positions 0 and 3 do not (both
    messages had 1 and 0 there). So the forger can sign any message of the form 1??0: 1000, 1010, 1100 and 1110.

??? question "2. A Winternitz chain has 15 steps. The signer revealed the value for digit 9. Which digits can a forger sign with that chain, and what stops it?"

    Any digit from 9 to 15, by hashing forward. The checksum stops it: raising a message digit lowers the sum of
    $15 - d$, and lowering a signed checksum digit needs a preimage.

??? question "3. Base-4 message digits (1, 1, 2, 3). What is the checksum, in base 4?"

    $(3 - 1) + (3 - 1) + (3 - 2) + (3 - 3) = 2 + 2 + 1 + 0 = 5$, which is $(1, 1)$ in base 4.

??? question "4. In the 4-leaf tree, which hashes does a signature with leaf 2 carry?"

    Its sibling, leaf 3 (`f7f5f313`), and the other half of the tree, the left parent (`171968e6`). The verifier
    computes H(leaf 2, leaf 3) = `094f95e5`, then H(`171968e6`, `094f95e5`) = `0720d477`, the root.

??? question "5. An LMS key with h = 20 signs one firmware release a day. How long does it last?"

    $2^{20} = 1{,}048{,}576$ signatures, about 2,870 years at one a day. The danger is not running out but reusing a leaf.

??? question "6. Check the SLH-DSA-256s size: n = 32, k = 22, a = 14, d = 8, h' = 8."

    $32 \times (1 + 22 \cdot 15 + 8 \cdot (64 + 3 + 8)) = 32 \times (1 + 330 + 600) = 32 \times 931 = 29{,}792$ bytes.

??? question "7. The Hamming code receives 0110100. Which bit was flipped, and what was sent?"

    The syndrome is $H \cdot \texttt{0110100}$: row 1 has 1s at positions 1, 2, 4, 5, and the word has 1s at 2, 3, 5, so the overlap is 2 and 5:
    even, 0. Row 2 has 1s at 1, 3, 4, 6: overlap 3, odd, 1. Row 3 has 1s at 2, 3, 4, 7: overlap 2 and 3, even, 0. The syndrome
    $(0, 1, 0)$ is column 6, so bit 6 was flipped, and the codeword sent was `0110110`.

??? question "8. Why can't McEliece simply use a code with a small public description, such as a cyclic Reed-Solomon code, to get small keys?"

    Codes with that much visible structure have let attackers recover the hidden code from the public key, as
    Sidelnikov and Shestakov did for generalized Reed-Solomon codes in 1992. Binary Goppa codes, scrambled,
    have resisted for decades. Quasi-cyclic schemes (HQC, BIKE) get small keys by keeping the structure public and
    putting the secret elsewhere, at the cost of a younger assumption.

??? question "9. Why did NIST keep both SLH-DSA and ML-DSA, when ML-DSA is smaller and faster in every way?"

    Different assumptions. ML-DSA rests on module lattices; SLH-DSA rests only on hash functions. If a breakthrough
    ever hits lattices, as one hit isogenies in 2022, systems can move to a signature that is already standardized and
    implemented.

??? question "10. What is the probability that a random leaf choice among 2^63 repeats within a billion signatures, roughly?"

    By the birthday bound, about $\binom{10^9}{2} / 2^{63} \approx 5 \times 10^{17} / 9.2 \times 10^{18} \approx 0.05$. So repeats can happen across
    a heavily used key, which is why SLH-DSA puts a few-time signature (FORS) at the bottom instead of a one-time one.

## What you learned

- **Lamport** signs with nothing but a hash: reveal one of two secrets per bit.
  One key, one message; a second message leaks half the key.
- **Winternitz chains** sign several bits per secret, with a checksum to stop
  hashing forward; **Merkle trees** put $2^h$ one-time keys under one root.
- **LMS and XMSS** are small and well understood but must keep **state**; a
  restored backup or cloned key that reuses a leaf breaks them. They belong in
  HSMs, signing firmware.
- **SLH-DSA** removes the state with a hypertree, random leaves and FORS
  few-time signatures, at the price of 8 to 50 KB signatures and slow signing.
- **McEliece** hides a fast-decodable Goppa code behind a scramble; decoding a
  random-looking code is hard even for quantum computers. Keys are huge,
  ciphertexts tiny. **HQC** uses quasi-cyclic codes for small keys and is NIST's
  backup KEM.
- **Rainbow** and **SIKE** fell in 2022 to classical attacks on the structure
  added for efficiency. Trust grows with years of attack; keep backups from
  different families.

**Next:** [Chapter 23](23-Advanced-Protocols.md) leaves "send a secret message"
behind: sharing secrets among many people, proving things without revealing
them, and computing on data nobody can read.

## Further reading

- Leslie Lamport, "Constructing Digital Signatures from a One Way Function",
  SRI International technical report CSL-98 (1979).
- Ralph C. Merkle, "A Certified Digital Signature", CRYPTO '89 (written in
  1979), and his 1979 Stanford PhD thesis, *Secrecy, Authentication, and Public
  Key Systems*.
- Johannes Buchmann, Erik Dahmen and Andreas Hülsing, "XMSS: A Practical
  Forward Secure Signature Scheme Based on Minimal Security Assumptions",
  PQCrypto 2011.
- Daniel J. Bernstein, Andreas Hülsing, Stefan Kölbl, Ruben Niederhagen, Joost
  Rijneveld and Peter Schwabe, "The SPHINCS+ Signature Framework", CCS 2019.
- FIPS 205 (SLH-DSA, 2024); SP 800-208 (LMS and XMSS, 2020); RFC 8554 and
  RFC 8391.
- Robert J. McEliece, "A Public-Key Cryptosystem Based on Algebraic Coding
  Theory", JPL DSN Progress Report 42-44 (1978).
- Daniel J. Bernstein, Tanja Lange and Christiane Peters, "Attacking and
  Defending the McEliece Cryptosystem", PQCrypto 2008.
- Ward Beullens, "Breaking Rainbow Takes a Weekend on a Laptop", CRYPTO 2022;
  Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH",
  EUROCRYPT 2023.
- NIST IR 8413 (2022) and NIST IR 8545 (2025), the reports explaining NIST's
  choices.
- Daniel J. Bernstein, Johannes Buchmann and Erik Dahmen (eds.),
  *Post-Quantum Cryptography* (Springer, 2009): chapters on hash-based, code-based,
  lattice-based and multivariate cryptography by leading researchers.
