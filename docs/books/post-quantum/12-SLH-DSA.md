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
of NIST's test vectors, forge a signature on a toy key whose few-time layer is overused, and
measure how slowly security wears down on the real sets and on SP 800-230's 2026 drafts.*

!!! abstract "In this chapter"
    **You will learn:**

    - how a hypertree of XMSS trees lets a signer choose leaves at random, with no state;
    - FORS, the few-time signature at the bottom, worked by hand, and why "few-time" is
      good enough;
    - tweakable hash functions and the 32-byte address that separates every hash call;
    - the twelve parameter sets, "s" and "f", and where every byte comes from;
    - a complete implementation, checked against NIST's test vectors, with pre-hashing and
      context strings;
    - how security degrades as signatures accumulate, and SP 800-230's limited-use sets;
    - where the signing time goes and how real implementations cut it;
    - what faults can do, and the 2022 attack on the SHA-256 parameter sets;
    - where SLH-DSA fits: root keys, firmware and long-term trust.

    **You need:** [Chapter 11](11-Stateful-Hash-Based-Signatures.md) (Winternitz chains,
    Merkle trees, XMSS).

    **Levels:** §12.1 to §12.3 are for beginners, §12.4 to §12.11 are intermediate, §12.12 to
    §12.14 are expert.

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

### From SPHINCS to SPHINCS+ to SLH-DSA

The first SPHINCS, published at EUROCRYPT 2015, came with one concrete instance, SPHINCS-256:
a hypertree of total height 60 in 12 layers of height 5, WOTS+ keys in the trees, and a
few-time scheme called HORST at the bottom. HORST was a tree version of HORS, the "hash to
obtain random subset" signature of Leonid and Natan Reyzin (2002): the message hash picks a
few of many secret values, and the signature reveals them. SPHINCS-256 had keys of about a
kilobyte and signatures of 41 kilobytes, and signed hundreds of messages a second on a
four-core 3.5 GHz Haswell processor. No stateless hash-based signature had been that practical.

When NIST called for post-quantum proposals, a larger team submitted SPHINCS+ in November
2017. It kept the shape and changed nearly every part. FORS replaced HORST (§12.4), with
smaller signatures and a cleaner proof. The leaf index now comes out of the same hash as the
message digest, so the verifier recomputes it and a forger cannot pick a convenient leaf and
a convenient digest independently. And every hash call got a public seed and an address
(§12.5), an idea from Hülsing, Rijneveld and Song's 2016 work on multi-target attacks against
XMSS. The submission came with three hash families (SHAKE256, SHA-256 and Haraka, a fast
AES-based hash) and, from the second round in 2019, two flavors of each: "robust" and "simple".

SPHINCS+ was an alternate candidate in NIST's third round (July 2020), a hedge against
lattices. In July 2022 NIST named it one of the four algorithms to be standardized
(NIST IR 8413), just after the team's version 3.1 (June 2022) had fixed the weakness in its SHA-256
sets that §12.5 describes. NIST published the draft FIPS 205 in August 2023 and the final
standard on 13 August 2024 under the new name SLH-DSA. The standard kept only the "simple"
versions with SHA-2 and SHAKE, dropping Haraka and the robust versions, and its final version
added the context string and the pre-hash form HashSLH-DSA (§12.12).

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
(§12.9). The total height $h$ is set so that the busiest FORS key, in a realistic worst case,
still has more than the target security.

### Counting repeats by hand

How many times does a FORS key get used? Take SLH-DSA-128s, with $h = 63$, at the full
$2^{64}$ signatures. Each signature lands on one of $2^{63}$ keys at random, so the number of
signatures on any one key is close to a Poisson variable with mean
$\lambda = 2^{64} / 2^{63} = 2$, and the chance that a key is used exactly $r$ times is
$e^{-\lambda} \lambda^r / r!$:

| uses $r$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| share of keys | 13.5% | 27.1% | 27.1% | 18.0% | 9.0% | 3.6% | 1.2% |

So at the largest number of signatures the standard allows, about a third of the FORS keys
have signed three or more digests, and a few in ten thousand nine or more. The design question
is how well a FORS key holds up after $r$ uses, for $r$ up to about ten.
At a more realistic million signatures a second for ten years, about $2^{48}$ in all, the mean
falls to $2^{-15}$ and almost no key is used twice.

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

### The hypertree by hand

Take a toy: $h = 6$ in $d = 3$ layers of height $h' = 2$. Every XMSS tree has four leaves; the
layers have 1, 4 and 16 trees; and there are $2^6 = 64$ FORS keys at the bottom. With FORS
trees of $a = 3$ (eight leaves) and $k = 3$ trees per key, the digest needs 2 bytes for FORS
($\lceil 9/8 \rceil$), 1 for the tree index and 1 for the leaf index. §12.8 runs this toy in
code, and for the message "greenhouse lights on" the digest is

$$\texttt{6e 2a 4e c1} = \texttt{01101110}\ \texttt{00101010}\ \texttt{01001110}\ \texttt{11000001}.$$

The first two bytes go to FORS (next section). The third byte, `4e`, gives the tree index:
keep its low $h - h' = 4$ bits, `1110`, so idx_tree $= 14$. The fourth byte, `c1`, gives the
leaf index: keep its low $h' = 2$ bits, `01`, so idx_leaf $= 1$. Together the six bits
`1110 01` $= 57$ name one FORS key out of 64.

Now climb. At layer 0, tree 14's leaf 1 signs FORS key 57's public key. One layer up, peel
the low $h'$ bits off the tree index: leaf $14 \bmod 4 = 2$, tree $\lfloor 14/4 \rfloor = 3$.
So tree 3's leaf 2 at layer 1 signs tree 14's root. Peel again: leaf 3, tree 0, the top tree,
whose leaf 3 signs tree 3's root. Read from the top, the path is the six bits in pairs,
`11 10 01`: leaf 3, then 2, then 1, each tree being whatever bits lie above.

<figure class="mars-fig">
<svg viewBox="0 0 640 410" width="640" role="img" aria-label="The toy hypertree walked by hand: the top tree at layer 2 uses leaf 3, which signs the root of tree 3 at layer 1; its leaf 2 signs the root of tree 14 at layer 0; that tree's leaf 1 signs FORS key 57" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor">
<path d="M80,62 L110,30 L140,62 M65,94 L80,62 L95,94 M125,94 L140,62 L155,94"/>
<circle cx="110" cy="30" r="5"/>
<circle cx="80" cy="62" r="5"/>
<circle cx="140" cy="62" r="5"/>
<circle cx="65" cy="94" r="6"/>
<circle cx="95" cy="94" r="6"/>
<circle cx="125" cy="94" r="6"/>
<path d="M190,187 L220,155 L250,187 M175,219 L190,187 L205,219 M235,219 L250,187 L265,219"/>
<circle cx="220" cy="155" r="5"/>
<circle cx="190" cy="187" r="5"/>
<circle cx="250" cy="187" r="5"/>
<circle cx="175" cy="219" r="6"/>
<circle cx="205" cy="219" r="6"/>
<circle cx="265" cy="219" r="6"/>
<path d="M300,312 L330,280 L360,312 M285,344 L300,312 L315,344 M345,344 L360,312 L375,344"/>
<circle cx="330" cy="280" r="5"/>
<circle cx="300" cy="312" r="5"/>
<circle cx="360" cy="312" r="5"/>
<circle cx="285" cy="344" r="6"/>
<circle cx="345" cy="344" r="6"/>
<circle cx="375" cy="344" r="6"/>
<path d="M155,102 L210,148 M235,227 L320,273" stroke-dasharray="4 3"/>
<path d="M315,372 L315,392"/>
<rect x="430" y="20" width="200" height="130" rx="6"/>
</g>
<circle cx="155" cy="94" r="7"/>
<circle cx="235" cy="219" r="7"/>
<circle cx="315" cy="344" r="7"/>
<g text-anchor="middle" font-size="12" fill-opacity=".7">
<text x="65" y="116">0</text>
<text x="95" y="116">1</text>
<text x="125" y="116">2</text>
<text x="155" y="116">3</text>
<text x="175" y="241">0</text>
<text x="205" y="241">1</text>
<text x="235" y="241">2</text>
<text x="265" y="241">3</text>
<text x="285" y="366">0</text>
<text x="315" y="366">1</text>
<text x="345" y="366">2</text>
<text x="375" y="366">3</text>
</g>
<text x="20" y="22">layer 2, tree 0</text>
<text x="128" y="22" font-size="12" fill-opacity=".7">(root = PK.root)</text>
<text x="186" y="118" font-size="12" fill-opacity=".7">signs root</text>
<text x="290" y="150">layer 1, tree 3</text>
<text x="290" y="168" font-size="12" fill-opacity=".7">(trees 0 to 3 exist)</text>
<text x="400" y="276">layer 0, tree 14</text>
<text x="400" y="294" font-size="12" fill-opacity=".7">(trees 0 to 15 exist)</text>
<text x="325" y="400">signs FORS key 57 of the 64</text>
<text x="442" y="42">idx_tree = 14 = 1110</text>
<text x="442" y="61">idx_leaf = 1 = 01</text>
<text x="442" y="80">path bits: 11 10 01</text>
<text x="442" y="99">layer 2 leaf: 11 = 3</text>
<text x="442" y="118">layer 1 leaf: 10 = 2</text>
<text x="442" y="137">layer 0 leaf: 01 = 1</text>
</svg>
<figcaption>Figure 12.2. The toy hypertree walked by hand (h = 6, d = 3, h′ = 2). The digest picks FORS key 57 = 111001 in binary. Its two lowest bits choose the leaf in layer 0's tree 14; each layer up peels off the next two bits. Only the three drawn trees are computed for this signature; the other 18 trees of the two lower layers exist only in principle.</figcaption>
</figure>

SLH-DSA-128s does the same with $h = 63$ in 7 layers of height 9, computing seven trees of
512 leaves and nothing else of the $2^{63}$-leaf structure.

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

### FORS by hand

Back to the toy of §12.3: $k = 3$ trees of $2^a = 8$ leaves. The first two digest bytes are
`6e 2a` $=$ `01101110 00101010`, and FORS reads the first $k \cdot a = 9$ bits in groups of
three, most significant first: `011`, `011`, `100`, that is, leaves 3, 3 and 4. The trees
are numbered as one row of leaves, tree $i$'s leaf $x$ having the global index
$i \cdot 2^a + x$, so the secrets revealed are numbers 3, $8 + 3 = 11$ and $16 + 4 = 20$; the
global index goes into the address of every hash call on that leaf (§12.5).

Each revealed leaf travels with its authentication path: at height $j$, the sibling of the
node above the leaf, whose index within the tree is $\lfloor x / 2^j \rfloor \oplus 1$. For tree
0, leaf 3:

- height 0: sibling leaf $3 \oplus 1 = 2$;
- height 1: the node above leaf 3 is node $\lfloor 3/2 \rfloor = 1$, sibling node 0 (covering
  leaves 0 and 1);
- height 2: the node above is $\lfloor 3/4 \rfloor = 0$, sibling node 1 (covering leaves 4 to 7).

For tree 2, leaf 4 gives siblings leaf 5, node 3 (leaves 6 and 7) and node 0 (leaves 0 to 3).
The signature is three secrets and nine path nodes, $3 \times (1 + 3) = 12$ values of 16
bytes. The verifier hashes each secret into its leaf, climbs to the tree's root, and
compresses the three roots with one more call, $T_k$, into a FORS public key; only the
hypertree signature above says whether that key is the one the signer committed to.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="FORS on the toy set: three trees of eight leaves; the digest digits 3, 3 and 4 pick one leaf in each tree; the signature carries those three secret leaves and three authentication-path nodes per tree; the verifier rebuilds the three roots and hashes them into the FORS public key" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor">
<rect x="235" y="8" width="170" height="30" rx="5"/>
<path d="M110,74 L280,38 M110,80 L66,115 M110,80 L154,115 M66,115 L44,150 M66,115 L88,150 M154,115 L132,150 M154,115 L176,150 M44,150 L33,190 M44,150 L55,190 M88,150 L77,190 M88,150 L99,190 M132,150 L121,190 M132,150 L143,190 M176,150 L165,190 M176,150 L187,190"/>
<path d="M320,74 L320,38 M320,80 L276,115 M320,80 L364,115 M276,115 L254,150 M276,115 L298,150 M364,115 L342,150 M364,115 L386,150 M254,150 L243,190 M254,150 L265,190 M298,150 L287,190 M298,150 L309,190 M342,150 L331,190 M342,150 L353,190 M386,150 L375,190 M386,150 L397,190"/>
<path d="M530,74 L360,38 M530,80 L486,115 M530,80 L574,115 M486,115 L464,150 M486,115 L508,150 M574,115 L552,150 M574,115 L596,150 M464,150 L453,190 M464,150 L475,190 M508,150 L497,190 M508,150 L519,190 M552,150 L541,190 M552,150 L563,190 M596,150 L585,190 M596,150 L607,190"/>
<circle cx="110" cy="80" r="5"/>
<circle cx="66" cy="115" r="5"/>
<circle cx="88" cy="150" r="5"/>
<circle cx="132" cy="150" r="5"/>
<circle cx="176" cy="150" r="5"/>
<circle cx="33" cy="190" r="5"/>
<circle cx="55" cy="190" r="5"/>
<circle cx="121" cy="190" r="5"/>
<circle cx="143" cy="190" r="5"/>
<circle cx="165" cy="190" r="5"/>
<circle cx="187" cy="190" r="5"/>
<circle cx="320" cy="80" r="5"/>
<circle cx="276" cy="115" r="5"/>
<circle cx="298" cy="150" r="5"/>
<circle cx="342" cy="150" r="5"/>
<circle cx="386" cy="150" r="5"/>
<circle cx="243" cy="190" r="5"/>
<circle cx="265" cy="190" r="5"/>
<circle cx="331" cy="190" r="5"/>
<circle cx="353" cy="190" r="5"/>
<circle cx="375" cy="190" r="5"/>
<circle cx="397" cy="190" r="5"/>
<circle cx="530" cy="80" r="5"/>
<circle cx="574" cy="115" r="5"/>
<circle cx="464" cy="150" r="5"/>
<circle cx="508" cy="150" r="5"/>
<circle cx="552" cy="150" r="5"/>
<circle cx="453" cy="190" r="5"/>
<circle cx="475" cy="190" r="5"/>
<circle cx="497" cy="190" r="5"/>
<circle cx="519" cy="190" r="5"/>
<circle cx="585" cy="190" r="5"/>
<circle cx="607" cy="190" r="5"/>
<circle cx="440" cy="290" r="5"/>
</g>
<g fill-opacity=".4" stroke="currentColor">
<rect x="148" y="109" width="12" height="12"/>
<rect x="38" y="144" width="12" height="12"/>
<rect x="71" y="184" width="12" height="12"/>
<rect x="358" y="109" width="12" height="12"/>
<rect x="248" y="144" width="12" height="12"/>
<rect x="281" y="184" width="12" height="12"/>
<rect x="480" y="109" width="12" height="12"/>
<rect x="590" y="144" width="12" height="12"/>
<rect x="557" y="184" width="12" height="12"/>
<rect x="214" y="284" width="12" height="12"/>
</g>
<circle cx="99" cy="190" r="7"/>
<circle cx="309" cy="190" r="7"/>
<circle cx="541" cy="190" r="7"/>
<circle cx="40" cy="290" r="7"/>
<text x="320" y="28" text-anchor="middle">T_k(roots) = FORS pk</text>
<g text-anchor="middle" font-size="11" fill-opacity=".7">
<text x="33" y="212">0</text>
<text x="55" y="212">1</text>
<text x="77" y="212">2</text>
<text x="99" y="212">3</text>
<text x="121" y="212">4</text>
<text x="143" y="212">5</text>
<text x="165" y="212">6</text>
<text x="187" y="212">7</text>
<text x="243" y="212">8</text>
<text x="265" y="212">9</text>
<text x="287" y="212">10</text>
<text x="309" y="212">11</text>
<text x="331" y="212">12</text>
<text x="353" y="212">13</text>
<text x="375" y="212">14</text>
<text x="397" y="212">15</text>
<text x="453" y="212">16</text>
<text x="475" y="212">17</text>
<text x="497" y="212">18</text>
<text x="519" y="212">19</text>
<text x="541" y="212">20</text>
<text x="563" y="212">21</text>
<text x="585" y="212">22</text>
<text x="607" y="212">23</text>
</g>
<g text-anchor="middle">
<text x="110" y="238">tree 0: bits 011 = leaf 3</text>
<text x="320" y="238">tree 1: bits 011 = leaf 3</text>
<text x="530" y="238">tree 2: bits 100 = leaf 4</text>
</g>
<text x="54" y="295">secret leaf, revealed</text>
<text x="234" y="295">path node, in the signature</text>
<text x="452" y="295">recomputed or unseen</text>
<text x="40" y="320" font-size="12" fill-opacity=".7">Numbers under the leaves are the global indices i·2^a + x used in the addresses.</text>
</svg>
<figcaption>Figure 12.3. FORS on the toy set (k = 3, a = 3). The 9 digest bits 011 011 100 pick leaf 3, 3 and 4 of the three trees. The signature reveals those three secrets (black) and, for each, the three siblings on the way up (shaded squares). The verifier computes everything else on the paths, then the three roots and their hash, the FORS public key.</figcaption>
</figure>

### What one more signature gives a forger

Suppose the same FORS key signs a second digest whose leaves are 5, 3 and 1. The forger now
knows leaves {3, 5} of tree 0, {3} of tree 1 (both signatures chose leaf 3 there) and {4, 1}
of tree 2. A new digest is forgeable if its three digits fall among those sets: the chance is
$\frac{2}{8} \cdot \frac{1}{8} \cdot \frac{2}{8} = \frac{1}{128}$ per try, against
$\frac{1}{512}$ after one. On SLH-DSA-128s two signatures on one FORS key lower the chance
from $2^{-168}$ to about $(2/4096)^{14} = 2^{-154}$, still far beyond reach. §12.8 carries out
the toy forgery in code.

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
  instead, after Sydney Antonov, and then Ray Perlner, John Kelsey and David Cooper, showed in
  2022 that SHA-256's 256-bit chaining value left category 5 short against multi-target
  attacks.

The SHA-2 sets are faster where SHA-256 has hardware support; the SHAKE sets are simpler and
faster where SHA-3 does.

### The address, byte by byte

The address is eight 4-byte words. The first holds the layer, the next three the tree within
the layer (96 bits, of which SLH-DSA uses at most 64), the fifth the type of call, and the last
three mean different things for different types. Figure 12.4 shows the layout and the seven
types.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="The 32-byte SLH-DSA address: 4 bytes layer, 12 bytes tree, 4 bytes type, then three 4-byte words whose meaning depends on the type; below, the 22-byte compressed form used by the SHA-2 parameter sets keeps 1 byte of layer, 8 of tree, 1 of type and all 12 bytes of the three words" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor">
<rect x="20.0" y="32" width="75.0" height="34"/>
<rect x="95.0" y="32" width="225.0" height="34"/>
<rect x="320.0" y="32" width="75.0" height="34"/>
<rect x="395.0" y="32" width="75.0" height="34"/>
<rect x="470.0" y="32" width="75.0" height="34"/>
<rect x="545.0" y="32" width="75.0" height="34"/>
<rect x="20.0" y="140" width="18.8" height="34"/>
<rect x="38.8" y="140" width="150.0" height="34"/>
<rect x="188.8" y="140" width="18.8" height="34"/>
<rect x="207.5" y="140" width="75.0" height="34"/>
<rect x="282.5" y="140" width="75.0" height="34"/>
<rect x="357.5" y="140" width="75.0" height="34"/>
<path d="M85.6,66 L29.4,140 M245.0,66 L113.8,140 M385.6,66 L198.1,140 M507.5,66 L320.0,140" stroke-opacity=".5" stroke-dasharray="3 3"/>
<path d="M30,211 L610,211" stroke-opacity=".5"/>
</g>
<text x="20" y="22">ADRS, 32 bytes (SHAKE sets hash it whole)</text>
<text x="445" y="162">ADRSc, 22 bytes (SHA-2)</text>
<g text-anchor="middle">
<text x="57.5" y="54">layer</text>
<text x="207.5" y="54">tree address</text>
<text x="357.5" y="54">type</text>
<text x="432.5" y="54">word 1</text>
<text x="507.5" y="54">word 2</text>
<text x="582.5" y="54">word 3</text>
<text x="29.4" y="162">L</text>
<text x="113.8" y="162">tree (8)</text>
<text x="198.1" y="162">T</text>
<text x="245.0" y="162">word 1</text>
<text x="320.0" y="162">word 2</text>
<text x="395.0" y="162">word 3</text>
</g>
<g text-anchor="middle" font-size="11" fill-opacity=".7">
<text x="20.0" y="82">0</text>
<text x="95.0" y="82">4</text>
<text x="320.0" y="82">16</text>
<text x="395.0" y="82">20</text>
<text x="470.0" y="82">24</text>
<text x="545.0" y="82">28</text>
<text x="620.0" y="82">32</text>
</g>
<text y="205" fill-opacity=".7"><tspan x="30">type</tspan><tspan x="80">meaning</tspan><tspan x="290">word 1</tspan><tspan x="390">word 2</tspan><tspan x="490">word 3</tspan></text>
<text y="225"><tspan x="30">0</tspan><tspan x="80">WOTS+ chain step</tspan><tspan x="290">key pair</tspan><tspan x="390">chain</tspan><tspan x="490">step</tspan></text>
<text y="245"><tspan x="30">1</tspan><tspan x="80">WOTS+ public key</tspan><tspan x="290">key pair</tspan><tspan x="390">0</tspan><tspan x="490">0</tspan></text>
<text y="265"><tspan x="30">2</tspan><tspan x="80">XMSS tree node</tspan><tspan x="290">0</tspan><tspan x="390">height</tspan><tspan x="490">index</tspan></text>
<text y="285"><tspan x="30">3</tspan><tspan x="80">FORS tree node</tspan><tspan x="290">key pair</tspan><tspan x="390">height</tspan><tspan x="490">index</tspan></text>
<text y="305"><tspan x="30">4</tspan><tspan x="80">FORS roots</tspan><tspan x="290">key pair</tspan><tspan x="390">0</tspan><tspan x="490">0</tspan></text>
<text y="325"><tspan x="30">5</tspan><tspan x="80">WOTS+ secret</tspan><tspan x="290">key pair</tspan><tspan x="390">chain</tspan><tspan x="490">0</tspan></text>
<text y="345"><tspan x="30">6</tspan><tspan x="80">FORS secret</tspan><tspan x="290">key pair</tspan><tspan x="390">0</tspan><tspan x="490">index</tspan></text>
</svg>
<figcaption>Figure 12.4. The SLH-DSA address. The SHAKE sets hash all 32 bytes. The SHA-2 sets hash a 22-byte compressed form that keeps the last byte of the layer, the last 8 bytes of the tree address, the last byte of the type and all three type-specific words, so that seed block, address and a 16-byte input still fit in one SHA-256 compression.</figcaption>
</figure>

Work out two addresses from the toy by hand. The FORS leaf of §12.4 with global index 11 (tree
1, leaf 3) under FORS key 57 is hashed at layer 0, tree 14 (`0e`), type 3 (FORS tree), key
pair 1 (the leaf index within the layer-0 tree), height 0 and index 11 (`0b`). The WOTS+ key
that signs tree 14's root sits at layer 1, tree 3, key pair 2; its eighth chain (chain 7),
hashed at its fifth step (step 4), has the address with words 1, 3, 0, 2, 7, 4. In code:

**Code it.**

```python
# Two addresses from the toy example, in full (32 bytes) and compressed (22 bytes, SHA-2 sets).
def address(layer, tree, kind, keypair, word2, word3):
    return (layer.to_bytes(4, "big") + tree.to_bytes(12, "big") + kind.to_bytes(4, "big")
            + keypair.to_bytes(4, "big") + word2.to_bytes(4, "big") + word3.to_bytes(4, "big"))

def compressed(adrs):                        # layer: 1 byte, tree: 8, type: 1, the rest: 12
    return adrs[3:4] + adrs[8:16] + adrs[19:20] + adrs[20:32]

def show(label, adrs):
    print(label)
    print("  full:      ", " ".join(adrs[i:i + 4].hex() for i in range(0, 32, 4)))
    c = compressed(adrs)
    print("  compressed:", c[:1].hex(), c[1:9].hex(), c[9:10].hex(), c[10:].hex())

show("FORS leaf (type 3): layer 0, tree 14, key pair 1, height 0, index 11",
     address(0, 14, 3, 1, 0, 11))
show("WOTS+ chain step (type 0): layer 1, tree 3, key pair 2, chain 7, step 4",
     address(1, 3, 0, 2, 7, 4))
```

It prints:

```text
FORS leaf (type 3): layer 0, tree 14, key pair 1, height 0, index 11
  full:       00000000 00000000 00000000 0000000e 00000003 00000001 00000000 0000000b
  compressed: 00 000000000000000e 03 00000001000000000000000b
WOTS+ chain step (type 0): layer 1, tree 3, key pair 2, chain 7, step 4
  full:       00000001 00000000 00000000 00000003 00000000 00000002 00000007 00000004
  compressed: 01 0000000000000003 00 000000020000000700000004
```

Changing the type clears the last three words (the `kind` method of §12.7's `Adrs` class zeroes
bytes 20 to 31), so a stale chain number never leaks into a tree-node address; the ACVP vectors
catch an implementation that forgets.

### Simple, robust, and the choice of hash

SPHINCS+ offered two tweakable hashes. The **robust** one XORed a bitmask, derived from seed
and address, into the input before hashing, as XMSS does (Chapter 11, Figure 11.4), and its
proof needed weaker properties of the hash. The **simple** one just hashes seed, address and
input together, with a proof that treats the hash as a random oracle. Simple is faster, and
FIPS 205 kept only it.

The SHA-2 construction is shaped by SHA-256's 64-byte block. The seed padded to a whole block
compresses to the same "midstate" for every call of one key, so it is computed once. What
remains of $F$ is $22 + n = 38$ bytes for $n = 16$, plus 9 bytes of padding and length: one
more compression. So every chain step of SLH-DSA-SHA2-128s costs one SHA-256 compression.
SHAKE256 absorbs $n + 32 + n = 64$ bytes within its 136-byte rate, also one permutation; the
difference in speed is Keccak-f[1600] against the SHA-256 compression function (§12.10).

### Break it: the category 5 attack on SHA-256

The address defense rests on an assumption with a long name, distinct-function multi-target
second-preimage resistance: given many outputs of the hash, each under its own address, it is
as hard to hit one of them as to hit one specific output. In 2022 Sydney Antonov pointed out
that the SHA-256 instantiation of SPHINCS+ at category 5 did not have this property, and Ray
Perlner, John Kelsey and David Cooper of NIST turned the observation into a complete forgery,
presented at PQCrypto 2022.

The flaw is the chaining value. SHA-256 processes its input in 64-byte blocks, carrying only a
256-bit state from one block to the next. The seed and the address are absorbed in the first
blocks; once they have been, everything that distinguishes this call from any other lives in
those 256 bits. The calls that compress a WOTS+ public key into a leaf take long inputs, 67
chain ends of 32 bytes at category 5, so each such call passes through dozens of
intermediate chaining values. A forger who collects the intermediate states of very many such
calls has very many 256-bit targets, and it needs to hit any one of them: once an input of its
own reaches one of those states, it can append the rest of that call's input and get the
same output, whatever address it started from. The search costs about $2^{256}$ divided by the
number of targets, not the $2^{256}$ or more that category 5 promises.

The complete attack is more delicate: the collision yields a WOTS+ public key that matches a
real leaf but can sign only a very limited set of values, and the authors built a hypertree
beneath it that turns the limited key into signatures on arbitrary messages. In their estimate
the classical security of the affected sets dropped by roughly 40 bits: still far beyond any
computer, but below the target.

**Fix it.** SPHINCS+ version 3.1 (June 2022) moved the functions with long inputs at categories
3 and 5 to SHA-512, whose 512-bit chaining value puts the same search out of reach: $H$, $T_\ell$,
the message hash and the message PRF. $F$ and the PRF, whose inputs fit in one block after the
seed, stayed with SHA-256, so the bulk of the work (the chain steps) costs no more. This is the
`self.big` switch in §12.7's code. The SHAKE sets were never affected: SHAKE256 carries a
1,600-bit state between blocks, 512 bits of it never touched by the input.

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

```text
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

### Sizes by hand

Every signature is a whole number of $n$-byte values: one for $R$; $a + 1$ for each of the
$k$ FORS trees (a secret leaf and $a$ path nodes); and for each of the $d$ layers, one WOTS+
signature of len values plus $h'$ path nodes:

$$|\text{sig}| = n \,\bigl(1 + k(a + 1) + d(\text{len} + h')\bigr).$$

The number of WOTS+ chains comes from Chapter 11's rule. With $w = 16$ each chain carries
$\lg w = 4$ bits, so an $n$-byte value needs $\text{len}_1 = 8n/4 = 2n$ message chains. The
checksum is at most $\text{len}_1 (w - 1)$, which for $n = 16$ is $32 \times 15 = 480$, a
9-bit number ($\log_2 480 = 8.9$), needing $\text{len}_2 = \lfloor 8.9 / 4 \rfloor + 1 = 3$
chains. So len $= 35$ for $n = 16$, and by the same sums 51 for $n = 24$ and 67 for $n = 32$.

Now SLH-DSA-128f, by hand: $n = 16$, $k = 33$, $a = 6$, $d = 22$, $h' = 3$:

$$1 + 33 \times 7 + 22 \times (35 + 3) = 1 + 231 + 836 = 1{,}068 \text{ values},\quad
1{,}068 \times 16 = 17{,}088 \text{ bytes}.$$

And SLH-DSA-256s: $n = 32$, $k = 22$, $a = 14$, $d = 8$, $h' = 8$:

$$1 + 22 \times 15 + 8 \times (67 + 8) = 1 + 330 + 600 = 931,\quad 931 \times 32 = 29{,}792.$$

The hypertree part dominates in every set, and most of it is WOTS+ chains: $d \cdot \text{len}$
values against $d \cdot h'$ path nodes. So "f", with 22 layers instead of 7, is more than twice
the size of "s", although its FORS trees are tiny.

The digest length $m$ holds $k \cdot a$ bits for FORS, $h - h'$ of tree index and $h'$ of
leaf index, each rounded up to bytes: for 128s,
$\lceil 168/8 \rceil + \lceil 54/8 \rceil + \lceil 9/8 \rceil = 21 + 7 + 2 = 30$, the `m`
of the code's table.

Why these particular $h$, $d$, $a$ and $k$? The designers searched the whole space: for each
candidate, the security after $2^{64}$ signatures (§12.9) must reach the category's target,
and among those that do, "s" leans toward small signatures and "f" toward fast signing. Many
near-optimal sets differ by a few hundred bytes; the published ones are a judgment, not a
theorem. §12.9 runs such a search for SP 800-230's limited-use sets.

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

```text
SLH-DSA-SHA2-128s public key 32 bytes, root matches NIST: True
SLH-DSA-SHAKE-128s public key 32 bytes, root matches NIST: True
SLH-DSA-SHAKE-128s signature 7856 bytes; verifies: True ; other message: False
SLH-DSA-SHAKE-128f signature 17088 bytes; verifies: True ; other message: False
```

Key generation builds only the top XMSS tree: 512 WOTS+ keys for 128s, about 300,000 hash calls.
Signing builds seven trees and fourteen FORS trees, about two million; in this Python it takes
a few seconds for 128s and a fraction of a second for 128f. Optimized C code with hardware
SHA-256 signs 128s in a few tenths of a second and 128f in a few milliseconds.

### Pre-hash in code

The listing's `sign` and `verify` are pure SLH-DSA. HashSLH-DSA differs only in the bytes
handed to the internal functions: a first byte 1 instead of 0, the context, the DER encoding of
the hash function's object identifier, and the hash of the message (§12.12 works the bytes by
hand). A few lines more:

```python
# Uses Scheme() from the listing above.
# HashSLH-DSA (FIPS 205, Algorithms 23 and 25): sign a hash of the message, named by its OID.
OIDS = {"sha256": bytes.fromhex("0609608648016503040201"),
        "sha512": bytes.fromhex("0609608648016503040203")}

def prehashed(msg, ctx, ph):
    return bytes([1, len(ctx)]) + ctx + OIDS[ph] + hashlib.new(ph, msg).digest()

def hash_sign(S, msg, sk, ctx=b"", ph="sha256", addrnd=None):
    return S.sign_internal(prehashed(msg, ctx, ph), sk, addrnd)

def hash_verify(S, msg, sig, pk, ctx=b"", ph="sha256"):
    return S.verify_internal(prehashed(msg, ctx, ph), sig, pk)

S = Scheme("SLH-DSA-SHA2-128f")
sk, pk = S.keygen(bytes(16), bytes(range(16)), bytes(range(16, 32)))
image = b"Arcadia City boot loader 1.0" * 1000          # stands in for a large file
print("M' starts", prehashed(image, b"boot", "sha256")[:17].hex(), "then 32 hash bytes")
sig = hash_sign(S, image, sk, ctx=b"boot")
print("HashSLH-DSA verifies:", hash_verify(S, image, sig, pk, ctx=b"boot"))
print("as pure SLH-DSA:", S.verify(image, sig, pk, ctx=b"boot"),
      "; other context:", hash_verify(S, image, sig, pk, ctx=b"test"))
```

It prints:

```text
M' starts 0104626f6f740609608648016503040201 then 32 hash bytes
HashSLH-DSA verifies: True
as pure SLH-DSA: False ; other context: False
```

The first byte keeps the two forms apart: a pre-hash signature never verifies as a pure one on
any message, and a context string binds the signature to the purpose it was made for.

## 12.8 A toy SLH-DSA, and a forgery

*Level: intermediate.*

The code of §12.7 does not care how big its parameters are. Give it the toy of §12.3 and
§12.4 and the hand work can be checked: the digest, the FORS leaves, the walk up the tree.

**Code it.**

```python
# Uses Scheme() and base_2b() from the listing above.
# A toy parameter set small enough to follow by hand: n h d h' a k m.
PARAMS["toy"] = (16, 6, 3, 2, 3, 3, 4)     # 64 FORS keys, each 3 trees of 8 leaves
T = Scheme("SLH-DSA-SHAKE-toy")
sk, pk = T.keygen(bytes(16), bytes(range(16)), bytes(range(16, 32)))
seed, root = pk[:16], pk[16:]

msg = b"greenhouse lights on"
m_prime = bytes([0, 0]) + msg                # pure SLH-DSA, empty context
r = T.PRF_msg(sk[16:32], seed, m_prime)       # deterministic signing: opt_rand = PK.seed
digest = T.H_msg(r, seed, root, m_prime)
md, idx_tree, idx_leaf = T.split(digest)
print("digest", digest.hex(), "=", " ".join(f"{b:08b}" for b in digest))
print("FORS leaves", base_2b(md, T.a, T.k), " idx_tree", idx_tree, " idx_leaf", idx_leaf)
tree, leaf = idx_tree, idx_leaf
for layer in range(T.d):
    print(f"  layer {layer}: tree {tree:2d}, leaf {leaf}")
    tree, leaf = tree >> T.hp, tree % (1 << T.hp)
sig = T.sign(msg, sk)
print("signature", len(sig), "bytes; verifies:", T.verify(msg, sig, pk))
```

It prints:

```text
digest 6e2a4ec1 = 01101110 00101010 01001110 11000001
FORS leaves [3, 3, 4]  idx_tree 14  idx_leaf 1
  layer 0: tree 14, leaf 1
  layer 1: tree  3, leaf 2
  layer 2: tree  0, leaf 3
signature 1984 bytes; verifies: True
```

The signature has $16 \times (1 + 3 \times 4 + 3 \times (35 + 2)) = 1{,}984$ bytes, by the
formula of §12.6. It is a real SLH-DSA signature in every respect but the sizes: the WOTS+ keys
are the real 35-chain ones, the addresses are real, and the verifier is the same function that
passes NIST's vectors.

### Break it: forging with a reused FORS key

The toy has only 64 FORS keys of 8-leaf trees, so a few signatures already reuse some keys:
the situation the real parameters are built to avoid. The forger needs no secret. Every part
of a valid signature is a revealed FORS leaf with its path, or a hypertree signature that is
the same every time a given FORS key is used. So it files every piece it sees under its FORS
key, then tries randomizers $R$ for its own message until the digest lands on a FORS key and
leaves that are all on file.

```python
# Uses T, sk and pk from the listing above.
# File the pieces of 16 signatures by FORS key, then search randomizers for a new message.
n, a, k = T.n, T.a, T.k
fors_len = k * (a + 1) * n

def digest_of(r, msg):
    md, t, l = T.split(T.H_msg(r, seed, root, bytes([0, 0]) + msg))
    return base_2b(md, a, k), (t, l)

seen = {}                                    # FORS key -> (revealed pieces, hypertree part)
for j in range(16):
    msg = b"telemetry report %d" % j
    sig = T.sign(msg, sk, addrnd=bytes([j]) * n)
    leaves, key = digest_of(sig[:n], msg)
    pieces, _ = seen.setdefault(key, ({}, sig[n + fors_len:]))
    for i, x in enumerate(leaves):
        pieces[(i, x)] = sig[n + i * (a + 1) * n: n + (i + 1) * (a + 1) * n]
print(len(seen), "FORS keys seen,", sum(len(p) for p, _ in seen.values()), "leaves on file")

target = b"open the north airlock"
for trial in range(1, 10 ** 6):
    r = hashlib.shake_256(b"forger %d" % trial).digest(n)
    leaves, key = digest_of(r, target)
    if key in seen and all((i, x) in seen[key][0] for i, x in enumerate(leaves)):
        pieces, ht = seen[key]
        forged = r + b"".join(pieces[(i, x)] for i, x in enumerate(leaves)) + ht
        print("trial", trial, "lands on FORS key", key, "leaves", leaves)
        print("forged signature verifies:", T.verify(target, forged, pk))
        break
```

It prints:

```text
13 FORS keys seen, 47 leaves on file
trial 1128 lands on FORS key (5, 1) leaves [4, 6, 4]
forged signature verifies: True
```

Sixteen signatures and about a thousand trials give a valid signature on "open the north
airlock" that the owner never made. The arithmetic matches: a trial lands on one of the 13 used
keys about one time in five and then must repeat its three digits ($8^{-3} = 1/512$), and keys
used twice raise the odds. For SLH-DSA-128s the same attack faces $2^{-168}$ per trial.

### Counting the work

Where do the two million hash calls of a 128s signature go? A subclass of `Scheme` that
counts every call by the type byte of its address answers exactly.

```python
# Uses Scheme() from the listing above.
# Count every tweakable-hash call in one signature and one verification, by address type.
KINDS = ["WOTS+ chain", "WOTS+ pk", "XMSS node", "FORS node", "FORS roots", "WOTS+ secret",
         "FORS secret"]

class Counting(Scheme):
    def F(self, seed, adrs, msg):
        self.tally[adrs.b[19]] += 1          # byte 19 holds the address type
        return Scheme.F(self, seed, adrs, msg)
    def H(self, seed, adrs, msg):
        if self.shake or not self.big:       # H is F here, which already counts
            return Scheme.H(self, seed, adrs, msg)
        self.tally[adrs.b[19]] += 1
        return Scheme.H(self, seed, adrs, msg)

for name in ("SLH-DSA-SHA2-128f", "SLH-DSA-SHA2-128s"):
    S = Counting(name)
    S.tally = [0] * 7
    sk, pk = S.keygen(bytes(16), bytes(range(16)), bytes(range(16, 32)))
    S.tally = [0] * 7
    sig = S.sign(b"firmware 2.4", sk)
    signing, S.tally = S.tally, [0] * 7
    S.verify(b"firmware 2.4", sig, pk)
    print(f"{name}: sign {sum(signing):,} calls, verify {sum(S.tally):,}")
    for kind, s, v in zip(KINDS, signing, S.tally):
        print(f"   {kind:13s} {s:>10,} {v:>7,}")
```

It prints:

```text
SLH-DSA-SHA2-128f: sign 105,194 calls, verify 6,005
   WOTS+ chain       92,400   5,685
   WOTS+ pk             176      22
   XMSS node            154      66
   FORS node          4,191     231
   FORS roots             1       1
   WOTS+ secret       6,160       0
   FORS secret        2,112       0
SLH-DSA-SHA2-128s: sign 2,186,220 calls, verify 1,978
   WOTS+ chain    1,881,600   1,725
   WOTS+ pk           3,584       7
   XMSS node          3,577      63
   FORS node        114,674     182
   FORS roots             1       1
   WOTS+ secret     125,440       0
   FORS secret       57,344       0
```

Every number can be checked by hand. For 128s, seven trees of 512 WOTS+ keys with 35 chains
of 15 steps take $7 \times 512 \times 35 \times 15 = 1{,}881{,}600$ calls, 86 percent of the
total; each chain's secret is one PRF call ($125{,}440$), each key's compression one call
($3{,}584$), and each tree has 511 inner nodes ($3{,}577$). The 14 FORS trees of 4,096 leaves
take $14 \times (2 \times 4{,}096 - 1) = 114{,}674$ node calls and 57,344 secrets. Signing is,
to a first approximation, the building of $d$ XMSS trees.

Verification climbs one path and finishes each chain from where the signature left it. Note
that 128f *verifies* three times slower than 128s, 6,005 calls against 1,978, because it has 22
WOTS+ signatures to finish instead of 7. "Fast" refers to signing only; a boot loader, which
verifies far more often than anyone signs, is better served by an "s" set on both counts.

## 12.9 How security wears down

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

```text
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

### The estimate the designers used

The SPHINCS+ analysis combines the two effects. A trial digest lands on a random FORS key,
which after $2^q$ signatures has signed $r$ digests with the Poisson probability of §12.2, mean
$\lambda = 2^{q-h}$; each of the $k$ leaves the trial needs was then revealed with probability
$1 - (1 - 2^{-a})^r$. One trial succeeds with probability

$$p = \sum_{r \ge 1} e^{-\lambda} \frac{\lambda^r}{r!} \Bigl(1 - (1 - 2^{-a})^r\Bigr)^k ,$$

and the security is $-\log_2 p$ bits: the expected number of hash trials for a forgery. (The
hypertree adds nothing to this sum, because its one-time keys are never reused.)

**Code it.**

```python
# The SPHINCS+ estimate: security of the FORS layer after 2^q signatures.
import math
def fors_bits(q, h, a, k):
    """-log2 of the chance that one trial digest is forgeable after 2^q signatures."""
    lam = 2.0 ** (q - h)
    lo, hi = max(1, int(lam - 40 * lam ** 0.5)), int(lam + 40 * lam ** 0.5) + 300
    logs = [r * math.log2(lam) - (lam + math.lgamma(r + 1)) / math.log(2)
            + k * math.log2(1 - (1 - 2.0 ** -a) ** r) for r in range(lo, hi)]
    top = max(logs)
    return -(top + math.log2(sum(2 ** (x - top) for x in logs)))

#                  h   a   k
FIPS205 = {"128s": (63, 12, 14), "128f": (66, 6, 33), "192s": (63, 14, 17),
           "192f": (66, 8, 33), "256s": (64, 14, 22), "256f": (68, 9, 35)}
print("set   " + "".join(f"  2^{q}" for q in (56, 60, 64, 68, 72)))
for name, (h, a, k) in FIPS205.items():
    print(name, "".join(f"{fors_bits(q, h, a, k):6.0f}" for q in (56, 60, 64, 68, 72)))
```

It prints:

```text
set     2^56  2^60  2^64  2^68  2^72
128s    168   156   134    95    43
128f    177   159   131    86    19
192s    234   219   194   148    85
192f    242   223   195   147    65
256s    299   283   256   207   131
256f    297   280   256   218   149
```

At $2^{64}$ signatures every set is at or just above its target (134 and 131 bits at category
1, 194 and 195 at category 3, 256 at category 5): every spare bit costs bytes. Past the limit
the decline steepens: $2^{68}$ signatures leave 95 bits for 128s, $2^{72}$ only 43.

**What if a key signs more than $2^{64}$ messages?** Nothing breaks suddenly; security declines
gradually as more FORS keys are reused. But $2^{64}$ is beyond any realistic use: signing a
million messages a second would take more than half a million years. SP 800-230 (initial public
draft, April 2026) goes the other way, proposing parameter sets for applications that sign far
fewer messages, with smaller signatures in return.

### SP 800-230: fewer signatures, smaller signatures

A root or firmware key signs a few thousand messages, not $2^{64}$. If the parameters only
have to survive $2^{24}$ signatures (about 16.8 million), the pressure on FORS keys almost
disappears, and so does the need for 63 levels. Scott Fluhrer and Quynh Dang explored this
space in "Smaller Sphincs+, or Honey, I Shrunk the Signatures" (2024), and NIST published the
initial public draft of SP 800-230, *Additional SLH-DSA Parameter Sets for Limited Signature
Use Cases*, by Dustin Moody and Quynh Dang, on 13 April 2026.

The draft adds six parameter sets, at categories 1, 3 and 5, each with SHA-2 and SHAKE,
named like SLH-DSA-SHA2-128-24 and SLH-DSA-SHAKE-128-24. Each signing key may produce at most
$2^{24}$ signatures, the sets are not approved for general-purpose use, and the user must
establish that the limit can never be exceeded over the key's life. The public comments
(published in July 2026) describe the shape of the sets: a single XMSS tree, $d = 1$, as tall
as 22 levels, with Winternitz parameter $w = 4$ at categories 1 and 5 and $w = 8$ at category
3, instead of $w = 16$, which shortens the verifier's chains. The smallest signature is
reported as 3,856 bytes, about half of SLH-DSA-128s and close to ML-DSA-65's 3,309. The
comment period closed on 12 June 2026; as of November 2026 the document is still a draft.

The same estimate shows where such sets come from. Fix $d = 1$ and $w = 4$ (68 chains for
$n = 16$, by the rule of §12.6), require 128 bits after $2^{24}$ signatures, and search for the
smallest signature, for three caps on the tree height:

```python
# Uses fors_bits() from the listing above.
# One tree (d = 1), w = 4 (68 chains for n = 16), at most 2^24 signatures, 128 bits wanted:
# the smallest signature for each cap on the tree height h.
for cap in (16, 19, 22):
    best = None
    for h in range(12, cap + 1):
        for a in range(10, 26):
            k = next((k for k in range(1, 80) if fors_bits(24, h, a, k) >= 128), None)
            if k is None:
                continue
            size = 16 * (1 + k * (a + 1) + 68 + h)
            if best is None or size < best[0]:
                best = (size, h, a, k, fors_bits(24, h, a, k))
    print("h <= %d: %d bytes with h = %d, a = %d, k = %d (%.1f bits)" % ((cap,) + best))
```

It prints:

```text
h <= 16: 4688 bytes with h = 16, a = 25, k = 8 (135.8 bits)
h <= 19: 4208 bytes with h = 19, a = 24, k = 7 (132.1 bits)
h <= 22: 3856 bytes with h = 22, a = 24, k = 6 (128.6 bits)
```

With a tree of height 22, the search lands on exactly the 3,856 bytes reported for the draft's
smallest set, with six FORS trees of $2^{24}$ leaves each. (This is our search with a simple
model, not a quotation of the draft's table; read the draft for its exact parameters.) The
shape explains the savings. One tree instead of seven means one WOTS+ signature and one path,
$68 + 22 = 90$ values, against $7 \times (35 + 9) = 308$ for 128s. FORS gets fewer but far
taller trees, $6 \times 25 = 150$ values against $14 \times 13 = 182$. And verification
shrinks to a few hundred hash calls.

The signer pays, twice. First, in work: the single tree has $2^{22}$ WOTS+ keys and the FORS
trees $2^{24}$ leaves each, about 1.5 billion hash calls for an uncached signature (§12.10).
Keeping the tree's $2^{23}$ nodes after key generation, about 134 megabytes, removes most of the
hypertree cost but not the FORS trees. Second, a little state comes back. Nothing breaks at
signature $2^{24} + 1$ (the estimate gives 124 bits at $2^{25}$ and 108 at $2^{28}$), but the
claim holds only under the limit, so someone must count. A count is far easier to keep than
LMS's leaf index (Chapter 11): it can be approximate and enforced with a margin, and a restored
backup that repeats some signatures does no harm. Comments on the draft argued both ways: NSA
wrote that it has no use case for SLH-DSA, since CNSA 2.0 already has ML-DSA and the stateful
schemes, and that the limit carries "risk involving state"; others asked for an even smaller
limit, such as $2^{16}$, for smaller signatures still.

**Mars.** Arcadia City signs its own software releases, and so does the factory on Earth that
builds most of its machines. With LMS (Chapter 11, §11.12) the two sites need separate keys,
because sharing one counter across a 6 to 44 minute round trip invites reuse. A FIPS 205 key
can simply be copied to both, and neither site ever asks the other anything before signing.
An SP 800-230 key can be copied too, but its $2^{24}$ budget must be split in advance, say
$2^{23}$ per site with local counters. A site that overshoots costs the city a few bits of
security, not the key: no error made under a 22-minute light delay should be fatal.

## 12.10 Making signing fast

*Level: intermediate.*

SLH-DSA spends its signing time building $d$ XMSS trees and $k$ FORS trees, nearly all of it
in WOTS+ chains (§12.8). The job is huge but regular and mostly independent in its parts.

**Code it.** The counts of §12.8 follow from a formula, which gives the signing work of every
set, the effect of caching the top tree, and the average verification work:

```python
# Signing work of the §12.7 code (exact), verification work (average) and size, per set.
import math
#                  n   h   d  h'  a   k  lg w
SETS = {"128s": (16, 63, 7, 9, 12, 14, 4), "128f": (16, 66, 22, 3, 6, 33, 4),
        "192s": (24, 63, 7, 9, 14, 17, 4), "192f": (24, 66, 22, 3, 8, 33, 4),
        "256s": (32, 64, 8, 8, 14, 22, 4), "256f": (32, 68, 17, 4, 9, 35, 4),
        "lim-24": (16, 22, 1, 22, 24, 6, 2)}     # the 2^24 search result of §12.9, w = 4

def chains(n, lgw):                          # len = len1 + len2 (FIPS 205, Section 5)
    w, len1 = 2 ** lgw, 8 * n // lgw
    return len1 + math.floor(math.log2(len1 * (w - 1)) / lgw) + 1

print("set      bytes      sign calls  top tree cached  verify calls")
for name, (n, h, d, hp, a, k, lgw) in SETS.items():
    w, L = 2 ** lgw, chains(n, lgw)
    tree = 2 ** hp * (L * w + 1) + 2 ** hp - 1      # one XMSS tree
    fors = k * (3 * 2 ** a - 1)                      # k FORS trees
    sign = d * tree + fors + 1
    cached = sign - tree + L * w                     # top layer: only its WOTS+ signature
    verify = 1 + k * (a + 1) + d * (L * (w - 1) // 2 + 1 + hp)
    size = n * (1 + k * (a + 1) + d * (L + hp))
    print(f"{name:6s} {size:7,d} {sign:15,d} {cached:16,d} {verify:13,d}")
```

It prints:

```text
set      bytes      sign calls  top tree cached  verify calls
128s     7,856       2,186,220        1,899,037         2,087
128f    17,088         105,194          101,259         6,084
192s    16,224       3,767,273        3,349,274         3,000
192f    35,664         169,258          163,531         8,790
256s    29,792       3,280,867        3,006,996         4,419
256f    49,856         345,837          329,726         8,970
lim-24   3,856   1,451,229,178      301,990,155           276
```

The 128s and 128f rows match the counted calls of §12.8 exactly. The verification column is an
average over random messages (each chain needs 7.5 of its 15 steps on average), which is why it
differs a little from the 1,978 and 6,005 counted for one message.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Chart of signature size against hash calls on a log scale: for each SLH-DSA set a filled dot for signing and an open dot for verifying; s sets sign with millions of calls and verify with two to four thousand, f sets sign with one to three hundred thousand and verify with six to nine thousand; a 2^24 limited set signs with about 1.5 billion calls uncached and verifies with under 300" fill="currentColor" font-size="12">
<path d="M80,292.5 L610,292.5 M80,255.0 L610,255.0 M80,217.5 L610,217.5 M80,180.0 L610,180.0 M80,142.5 L610,142.5 M80,105.0 L610,105.0 M80,67.5 L610,67.5 M80,30.0 L610,30.0" stroke="currentColor" stroke-opacity=".12"/>
<path d="M80,30 L80,330 L610,330 M80.0,330 L80.0,335 M181.9,330 L181.9,335 M283.8,330 L283.8,335 M385.8,330 L385.8,335 M487.7,330 L487.7,335 M589.6,330 L589.6,335" fill="none" stroke="currentColor"/>
<path d="M160.1,167.3 L160.1,280.5 M254.2,216.7 L254.2,263.1 M245.4,158.4 L245.4,274.6 M443.5,208.9 L443.5,257.1 M383.6,160.7 L383.6,268.3 M588.1,197.3 L588.1,256.8 M119.3,61.4 L119.3,313.5" stroke="currentColor" stroke-opacity=".35"/>
<g text-anchor="end">
<text x="72" y="334.0">100</text>
<text x="72" y="296.5">1k</text>
<text x="72" y="259.0">10k</text>
<text x="72" y="221.5">100k</text>
<text x="72" y="184.0">1M</text>
<text x="72" y="146.5">10M</text>
<text x="72" y="109.0">100M</text>
<text x="72" y="71.5">1B</text>
<text x="72" y="34.0">10B</text>
</g><g text-anchor="middle">
<text x="80.0" y="350">0</text>
<text x="181.9" y="350">10</text>
<text x="283.8" y="350">20</text>
<text x="385.8" y="350">30</text>
<text x="487.7" y="350">40</text>
<text x="589.6" y="350">50</text>
<text x="345.0" y="372" font-size="13">signature size (kilobytes)</text>
<text x="20" y="180.0" transform="rotate(-90 20 180.0)" font-size="13">hash calls</text>
</g>
<circle cx="160.1" cy="167.3" r="5"/>
<text x="168.1" y="161.3">128s</text>
<circle cx="254.2" cy="216.7" r="5"/>
<text x="262.2" y="210.7">128f</text>
<circle cx="245.4" cy="158.4" r="5"/>
<text x="253.4" y="152.4">192s</text>
<circle cx="443.5" cy="208.9" r="5"/>
<text x="451.5" y="202.9">192f</text>
<circle cx="383.6" cy="160.7" r="5"/>
<text x="391.6" y="154.7">256s</text>
<circle cx="588.1" cy="197.3" r="5"/>
<text x="596.1" y="191.3">256f</text>
<circle cx="119.3" cy="61.4" r="5"/>
<text x="127.3" y="55.4">2^24 set</text>
<circle cx="450" cy="48" r="5"/><text x="460" y="53">sign</text><text x="520" y="53">verify</text>
<g fill="none" stroke="currentColor" stroke-width="1.5">
<circle cx="160.1" cy="280.5" r="5"/>
<circle cx="254.2" cy="263.1" r="5"/>
<circle cx="245.4" cy="274.6" r="5"/>
<circle cx="443.5" cy="257.1" r="5"/>
<circle cx="383.6" cy="268.3" r="5"/>
<circle cx="588.1" cy="256.8" r="5"/>
<circle cx="119.3" cy="313.5" r="5"/>
<circle cx="510" cy="48" r="5"/></g>
</svg>
<figcaption>Figure 12.5. Size against work, from the table above (log scale). Each set has a filled dot for the hash calls to sign and an open dot for the hash calls to verify. The "s" sets sit high and to the left, the "f" sets low and to the right, and verification costs thousands of calls for all of them. The 2^24 limited set found in §12.9 is far left: the smallest signature and the cheapest verification, bought with about a billion and a half calls to sign without caching.</figcaption>
</figure>

**Caching.** The top tree is the same for every signature, so a signer can keep its
$2^{h'+1} - 1$ nodes from key generation, 16 kilobytes for 128s, saving one tree in $d$: 13
percent for 128s, far less for "f". The next layer's 512 possible trees would cost 8 megabytes
and save another seventh. Cached nodes are not secret (authentication paths publish such
nodes all the time), but their integrity matters as much as the key's: a corrupted cached root
would be signed by the WOTS+ key above it, the grafting fault of §12.11 made permanent. A
signer that caches should verify its own signatures.

**Parallel hashing.** Within one tree the 512 WOTS+ keys, and within each key the 35 chains,
are independent. The SPHINCS+ team's AVX2 code computes eight SHA-256 or four Keccak-f[1600]
instances side by side in the 256-bit vector registers, one chain per lane; multicore code
splits a tree's leaves among cores, and GPU code keeps thousands of chains in flight.

**SHA-2 or SHAKE.** In software, one Keccak-f[1600] permutation costs several times a
SHA-256 compression. On a Cortex-M4 microcontroller the pqm4 benchmarks measure
SPHINCS+-SHAKE-128s-simple, which does the same hashing as SLH-DSA-SHAKE-128s, at about 24.6
billion cycles to sign, against 7.7 billion for the SHA-2 version: a factor of 3.2. Most server
and phone processors have SHA-256 instructions (Intel's SHA extensions, the ARMv8 cryptography
extension), which widens the gap; a few have SHA-3 instructions (optional in ARMv8.2-A).

**Hardware.** A small hash unit designed for SLH-DSA changes the picture more than any
software trick. Markku-Juhani Saarinen's 2024 paper "Accelerating SLH-DSA by Two Orders of
Magnitude with a Single Hash Unit" describes SLotH, a prototype with Keccak, SHA-256 and
SHA-512 cores driven by a small RISC-V control core, the arrangement of a typical hardware
root of trust. The unit handles SLH-DSA's padding formats and iterated hashing, Winternitz
chains included, so the processor no longer pays for each hash call, and it computes the PRF
with side-channel protection. The paper reports the SHAKE sets running up to 300 times faster
than unaccelerated microcontroller code, and the SHA-2 sets at about half the SHAKE speed: in
hardware the ranking of the two families reverses.

**Microcontrollers.** On the same Cortex-M4, SPHINCS+-SHA2-128s signs in about 7.7 billion
cycles, over a minute at 100 MHz, and 128f in about 370 million. Verification takes about 7.5
million cycles for 128s (75 milliseconds at 100 MHz) and 22 million for 128f. A small device
can check SLH-DSA signatures comfortably; it should rarely be asked to make them.

## 12.11 Break it: faults

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

## 12.12 Using it

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

### Contexts and pre-hash by hand

The internal functions sign a byte string $M'$ built from the message. For pure SLH-DSA with
the 4-byte context "boot" (`62 6f 6f 74`) and the message $M$,

$$M' = \texttt{00}\ \texttt{04}\ \texttt{62 6f 6f 74}\ \|\ M:$$

a zero byte for "pure", the context's length, the context, then the message itself, however
long. For HashSLH-DSA with SHA-256 the same context gives

$$M' = \texttt{01}\ \texttt{04}\ \texttt{62 6f 6f 74}\ \texttt{06 09 60 86 48 01 65 03 04 02 01}\ \|\ \mathrm{SHA\text{-}256}(M),$$

where the eleven bytes are the DER encoding of SHA-256's object identifier
2.16.840.1.101.3.4.2.1: the 17-byte prefix that §12.7's pre-hash listing printed. FIPS 205
spells out SHA-256, SHA-512, SHAKE128 (256-bit output) and
SHAKE256 (512-bit output), allows other approved hash functions, and asks for a digest at
least as strong as the parameter set against collisions: SHA-256 or SHAKE128 is enough for
category 1, while category 5 needs SHA-512 or SHAKE256.

When should pre-hashing be used? SLH-DSA reads the message twice, in the message PRF and in
$H_{\text{msg}}$, so a signer handed a multi-gigabyte image must keep it or read it twice.
Pre-hashing lets the holder of the message hash it once and a hardware module sign 64 bytes
instead. The price: security now also rests on the pre-hash's collision resistance, and the
verifier must know which form it is checking. The CMS profile (RFC 9814) allows only pure
SLH-DSA with an empty context; the X.509 profile (RFC 9909) defines identifiers for both forms.
The context string separates uses of one key: signatures made with context "boot" never verify
under "conf", at no cost in size.

### Randomized or deterministic

The randomizer $R = \mathrm{PRF}_{\text{msg}}(\mathrm{SK.prf}, \mathit{opt\_rand}, M')$ chooses
the FORS key and the digest. With fresh randomness for *opt_rand* (the default, "hedged"
signing), two signatures on one message differ, and a fault attacker cannot make the signer
repeat a computation exactly. With *opt_rand* set to the public seed, signing is
deterministic, which suits test vectors and devices without a good random source. Either way
the secret SK.prf is in the PRF, so even a constant random source leaves $R$ unpredictable.
Unlike ECDSA, whose nonce failures leak the key
([book 1, Chapter 14](../../book/14-Discrete-Log-Systems.md)), SLH-DSA loses at most its fault
protection to bad randomness.

## 12.13 In the real world

*Level: expert.*

**Where it fits.** Signatures of 8 to 50 kilobytes rule SLH-DSA out of TLS handshakes, but not
out of places where a signature is checked rarely and must hold for decades: root certificate
keys, which sign only intermediate certificates; firmware and boot loaders; signed software
releases; and documents meant to stay verifiable for a lifetime. OpenSSL 3.5 (April 2025)
includes SLH-DSA, as do several other major libraries. NSA's CNSA 2.0 does not include it; for
hash-based signatures it uses LMS and XMSS (Chapter 11).

**Formats.** RFC 9814 (July 2025) defines SLH-DSA in the Cryptographic Message Syntax, the
signed container used for firmware packages and signed email, with pure SLH-DSA and an empty
context only. RFC 9909
(December 2025) defines the algorithm identifiers for X.509 certificates and revocation lists,
in pure and HashSLH-DSA forms. An SLH-DSA-128s root adds about 8 kilobytes to a chain: fine
once at boot, too much on every TLS handshake ([Chapter 18](18-Hybrids-and-the-Migration.md)).

**CNSA 2.0 and NSA's position.** CNSA 2.0 approves ML-DSA-87 for general signatures and LMS and
XMSS under SP 800-208 for software and firmware signing (Chapter 11, §11.12), and nothing else.
NSA's comment on the SP 800-230 draft (June 2026) restated that it has no use case for
SLH-DSA, smaller sets included; commercial firmware programs that dislike state management are
the likelier users.

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

## 12.14 Going deeper

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
  signatures, which fed into SP 800-230; Fluhrer and Dang's 2024 paper is the place to start,
  and the public comments on the draft (July 2026) show what implementers asked for.
- **Speed.** The pqm4 benchmarks for microcontrollers, the SPHINCS+ team's AVX2 code, and
  Saarinen's hash unit (2024) cover the range from small devices to custom hardware.

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

??? question "6. On the toy set (a = 3, k = 3), the digest begins 011 011 100. Which secret values does FORS reveal (global indices), and what is the authentication path of the first?"

    Leaves 3, 3 and 4 of trees 0, 1 and 2, global indices 3, $8 + 3 = 11$ and $16 + 4 = 20$.
    The path of leaf 3 in tree 0 is leaf 2 (height 0), node 0 at height 1 (leaves 0 and 1) and
    node 1 at height 2 (leaves 4 to 7).

??? question "7. Why do the SHA-2 sets at categories 3 and 5 use SHA-512 for some functions?"

    SHA-256's 256-bit internal state made multi-target attacks on category 5 cheaper than
    intended (Perlner, Kelsey and Cooper, 2022): once the address has been absorbed, hitting
    any intermediate chaining value of any call gives that call's output. SHA-512's 512-bit
    state restores the margin.

??? question "8. How does a fault during signing lead to a forgery?"

    A corrupted lower root gets signed by an upper WOTS+ key that also signs the correct root
    in other signatures: two messages under one one-time key. The attacker forges that WOTS+
    signature on its own root and grafts its own tree below.

??? question "9. SP 800-230's draft sets allow at most 2^24 signatures per key. Where do their smaller signatures come from, and what does the signer pay?"

    With few signatures, FORS keys are rarely reused, so the hypertree can be one tree
    ($d = 1$) with one WOTS+ signature and one path, and FORS can use a few tall trees. The
    signer pays with very slow key generation and signing (or a large cache), and with a
    count it must keep.

??? question "10. What does SLH-DSA add to NIST's portfolio that ML-DSA does not?"

    Security that rests only on hash functions, independent of any lattice assumption: a
    fallback if structured lattices are ever weakened.

## What you learned

- SLH-DSA is stateless: a hypertree so large that leaves can be chosen at random.
- FORS at the bottom is a few-time signature whose security wears down slowly with reuse;
  the upper layers are one-time keys that only ever sign fixed roots. On a toy with tiny FORS
  trees, sixteen signatures were enough to forge.
- Tweakable hashes with a 32-byte address make every hash call unique; SHA-256's 256-bit
  chaining value undermined that at category 5 until SHA-512 replaced it there in 2022.
- Twelve parameter sets: 128, 192, 256 bits; "s" and "f"; SHA-2 and SHAKE. Signatures of
  $n(1 + k(a+1) + d(\text{len} + h'))$ bytes run from 7,856 to 49,856; public keys are 32 to 64.
- A complete implementation fits in about 270 lines and matches all of NIST's FIPS 205 test
  vectors; pre-hashing and contexts change only the bytes signed.
- Signing is the building of $d$ XMSS trees, 86 percent of it WOTS+ chains; caching, vector
  hashing and hash hardware cut it, and "f" sets sign fast but verify slower than "s".
- SP 800-230's draft sets trade a limit of $2^{24}$ signatures for signatures as small as
  3,856 bytes.
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
- Leonid Reyzin and Natan Reyzin, "Better than BiBa: Short One-Time Signatures with Fast
  Signing and Verifying" (ACISP 2002), the HORS few-time signature.
- Andreas Hülsing, Joost Rijneveld and Fang Song, "Mitigating Multi-Target Attacks in
  Hash-Based Signatures" (PKC 2016).
- NIST IR 8413, *Status Report on the Third Round of the NIST Post-Quantum Cryptography
  Standardization Process* (July 2022).
- Ray Perlner, John Kelsey and David Cooper, "Breaking Category Five SPHINCS+ with SHA-256"
  (PQCrypto 2022; IACR ePrint 2022/1061).
- Laurent Castelnovi, Ange Martinelli and Thomas Prest, "Grafting Trees: a Fault Attack against
  the SPHINCS framework" (PQCrypto 2018).
- Aymeric Genêt, Matthias J. Kannwischer, Hervé Pelletier and Andrew McLauchlan, "Practical
  Fault Injection Attacks on SPHINCS" (2018).
- Scott Fluhrer and Quynh Dang, "Smaller Sphincs+ or, Honey, I Shrunk the Signatures" (IACR
  ePrint 2024/018).
- NIST SP 800-230 (initial public draft, 13 April 2026), *Additional SLH-DSA Parameter Sets for
  Limited Signature Use Cases*, by Dustin Moody and Quynh Dang; and NIST, *Public Comments on
  the Initial Public Draft of SP 800-230* (July 2026).
- Markku-Juhani O. Saarinen, "Accelerating SLH-DSA by Two Orders of Magnitude with a Single
  Hash Unit" (IACR ePrint 2024/367; NIST Fifth PQC Standardization Conference, 2024).
- Matthias J. Kannwischer, Joost Rijneveld, Peter Schwabe and Ko Stoffelen, "pqm4: Testing and
  Benchmarking NIST PQC on ARM Cortex-M4" (2019), and the pqm4 benchmark tables
  (github.com/mupq/pqm4).
- RFC 9814, *Use of the SLH-DSA Signature Algorithm in the Cryptographic Message Syntax (CMS)*
  (July 2025).
- RFC 9909, *Internet X.509 Public Key Infrastructure -- Algorithm Identifiers for the
  Stateless Hash-Based Digital Signature Algorithm (SLH-DSA)* (December 2025).
- The NIST ACVP-Server repository (github.com/usnistgov/ACVP-Server), FIPS 205 test files.
