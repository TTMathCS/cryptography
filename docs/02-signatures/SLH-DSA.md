# SLH-DSA (SPHINCS+)

*A signature built from nothing but a hash function. Signatures are big and
signing is slow, but if lattices ever fall, this one still stands.*

**Status and standards:** see [Digital signatures](../algorithms/table.md#2-digital-signatures)
in the main table.

## What it is

SLH-DSA, the Stateless Hash-Based Digital Signature Algorithm, is FIPS 205,
published in August 2024 next to [ML-DSA](ML-DSA.md). It is SPHINCS+,
submitted to NIST in 2017 by a team led by Andreas Hülsing, which built on
SPHINCS (Bernstein and others, 2015).

Its only assumption is that the hash function (SHA-2 or SHAKE) holds up.
NIST took it "in order to not rely entirely on the security of lattices"
(NIST IR 8413), so one breakthrough can't leave it with no signature at all.

"Stateless" is the point. LMS and XMSS (SP 800-208) use each one-time key
once, and the signer must remember which ones are spent; restore a backup and
a key gets reused, which breaks security. SLH-DSA picks its one-time key from
the message hash, out of $2^{63}$ or more, so repeats are rare, and the bottom
layer can take a few.

There are 12 parameter sets: SHA2 or SHAKE, three levels, and **s** (small
signature) or **f** (fast signing), named like `SLH-DSA-SHA2-128s`. Sizes
don't depend on the hash.

| Level | Security | Public key | Signature, s | Signature, f |
|---|---|---|---|---|
| 128 | category 1 | 32 B | 7,856 B | 17,088 B |
| 192 | category 3 | 48 B | 16,224 B | 35,664 B |
| 256 | category 5 | 64 B | 29,792 B | 49,856 B |

Private keys are twice the public key. An ML-DSA-44 signature, for
comparison, is 2,420 bytes.

Signing is slow. In the SPHINCS+ round-3 benchmarks (AVX2 desktop) it took
about 650 million cycles with SHA2-128s, a fifth of a second at 3 GHz, and 34
million with SHA2-128f. Verifying took 1 to 2 million.

## The story

- **Who made it:** Andreas Hülsing and a large team (SPHINCS+, 2017), building on SPHINCS (Bernstein and others, 2015), which builds on Ralph Merkle's hash trees (1979) and Leslie Lamport's one-time signatures (1979).
- **What for:** A quantum-safe signature that relies on nothing but a hash function.
- **What it solved:** If lattices ever fall, SLH-DSA still stands: a hash function is the most studied tool in the field. It also needs no counter to keep, unlike LMS and XMSS.
- **Where it stands:** Approved as FIPS 205 (August 2024). Its large signatures (8 to 50 KB) and slow signing make it a backup or for things signed rarely, such as root certificates and firmware.
- **Incidents:** During the competition, Perlner, Kelsey and Cooper (2022) found that the SHA-256 versions fell short at the higher security levels, because SHA-256's internal state is only 256 bits. FIPS 205 switched those levels to SHA-512.

## How it works

Three hash-based parts, all regenerated from a secret seed when needed:

- **WOTS+ one-time signatures:** the public key comes from hashing each of
  many random strings 15 times. To sign, reveal each chain partway, as far as
  the message's base-16 digits say. A checksum stops anyone from hashing
  forward to sign something else.
- **A hypertree:** Merkle trees of $2^{h'}$ WOTS+ keys each, stacked $d$ layers
  deep. Each tree signs the roots of the trees below; the top root is the
  public key.
- **FORS** at the bottom: $k$ small Merkle trees of $2^a$ leaves. The message
  digest picks one leaf in each tree to reveal.

The signature is a randomizer $R$, the FORS signature, and one WOTS+ signature
plus Merkle path per layer. Counting $n$-byte values:
$1 + k(a + 1) + d(2n + 3 + h')$. For 128s ($n = 16$, $k = 14$, $a = 12$, $d = 7$, $h' = 9$) that is
$16 \times (1 + 182 + 308) = 7{,}856$ bytes. The f sets use many short trees (128f has
22 layers of height 3), so signing is faster and signatures longer.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 375" role="img" aria-labelledby="sk-c-hypertree-t"><title id="sk-c-hypertree-t">A stack of hash trees: the top tree's root is the public key, each tree signs the roots of the trees below, and small trees at the bottom sign the message</title><defs><filter id="sk-c-hypertree-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-hypertree-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-hypertree-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-hypertree-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-hypertree-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="375" filter="url(#sk-c-hypertree-paper)"/><g filter="url(#sk-c-hypertree-pen)"><text x="30" y="44" class="h">Trees signing trees</text><path class="p room" d="M320 80 L260.0 130 L380.0 130Z"/><circle cx="320" cy="80" r="5" class="p gold"/><text x="390" y="90" class="s">top root = the public key</text><path class="p dash" d="M260 130 L200 160"/><path class="p room" d="M200 160 L150.0 210 L250.0 210Z"/><circle cx="200" cy="160" r="5" class="p gold"/><path class="p dash" d="M320 130 L320 160"/><path class="p room" d="M320 160 L270.0 210 L370.0 210Z"/><circle cx="320" cy="160" r="5" class="p gold"/><path class="p dash" d="M380 130 L440 160"/><path class="p room" d="M440 160 L390.0 210 L490.0 210Z"/><circle cx="440" cy="160" r="5" class="p gold"/><path class="p room" d="M150 240 L122.0 290 L178.0 290Z"/><circle cx="150" cy="240" r="5" class="p gold"/><path class="p room" d="M230 240 L202.0 290 L258.0 290Z"/><circle cx="230" cy="240" r="5" class="p gold"/><path class="p room" d="M290 240 L262.0 290 L318.0 290Z"/><circle cx="290" cy="240" r="5" class="p gold"/><path class="p rust" d="M350 240 L322.0 290 L378.0 290Z"/><circle cx="350" cy="240" r="5" class="p gold"/><path class="p room" d="M410 240 L382.0 290 L438.0 290Z"/><circle cx="410" cy="240" r="5" class="p gold"/><path class="p room" d="M490 240 L462.0 290 L518.0 290Z"/><circle cx="490" cy="240" r="5" class="p gold"/><path class="p dash" d="M200 210 L150 240 M200 210 L230 240 M320 210 L290 240 M320 210 L350 240 M440 210 L410 240 M440 210 L490 240"/><text x="40" y="320" class="s">Each layer's one-time keys sign the roots of the trees below (SLH-DSA stacks up to 22).</text><text x="40" y="340" class="s">At the bottom, FORS trees (red) sign the message. Only hashes, nothing a quantum</text><text x="40" y="360" class="s">computer is known to break.</text></g></svg><figcaption>Sketched for this page. Three layers drawn; real parameters use 7 to 22.</figcaption></figure>

## When to use it

- **Long-lived roots of trust:** firmware, boot loaders, root CAs. Few
  signatures, many checks, decades of life. NIST's draft SP 800-230 (April
  2026) adds smaller sets for keys that sign at most $2^{24}$ times.
- **A second kind of math** next to ML-DSA, so one broken assumption can't
  take everything down.
- **Not** for TLS handshakes or anything that signs constantly.
- If the signer can track state reliably (an HSM), LMS or XMSS give smaller
  signatures.

## Example (Python)

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing) with liboqs 0.15
or later. Older versions only have SPHINCS+, whose signatures differ from
FIPS 205. liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

```python
import oqs

message = b"firmware v4.0"

with oqs.Signature("SLH_DSA_PURE_SHA2_128S") as signer:
    public_key = signer.generate_keypair()
    signature = signer.sign(message)      # slow on purpose: this is an "s" set

with oqs.Signature("SLH_DSA_PURE_SHA2_128S") as verifier:
    print(len(public_key), len(signature), verifier.verify(message, signature, public_key))   # 32 7856 True
```

## Security notes

- Hash functions have no algebraic structure for a new attack to grab.
  Quantum search only takes a square root off hash attacks, and the
  parameters allow for it.
- The FIPS 205 sets stay secure for up to $2^{64}$ signatures per key.
- A glitch while signing can make a WOTS+ key sign two values, enough to
  forge (Castelnovi, Martinelli and Prest, 2018). The bad signature still
  verifies, so on hardware open to tampering, sign twice and compare.
- FIPS 205 also defines HashSLH-DSA (signs a hash of the message); use it
  only when a protocol needs pre-hashing.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: one hash chain"

    SLH-DSA is built from hash chains. Here is one chain with SHA-256 cut to 8 hex digits (real SLH-DSA uses
    16 to 32 bytes), for base-4 digits 0 to 3. Checked with Python's `hashlib`:

    | Position | Value | Role |
    |---|---|---|
    | 0 | `secret` | secret start of the chain |
    | 1 | `H(secret) = 2bb80d53` | |
    | 2 | `H(2bb80d53) = 97eff218` | |
    | 3 | `H(97eff218) = faa88dfc` | public end of the chain |

    To sign the digit 2, reveal position 2, `97eff218`. The verifier hashes it once more and checks it gets
    the public `faa88dfc`. Anyone can hash forward (turn a 2 into a 3), nobody can hash backward (turn a 2
    into a 1). A checksum digit, signed the same way, catches forward moves: raising a message digit lowers
    the checksum.

??? abstract "The math, with formulas"

    **WOTS+ (FIPS 205 §5).** With $w = 16$, an $n$-byte message digest becomes $\mathit{len}_1 = 2n$ base-16 digits plus
    $\mathit{len}_2 = 3$ checksum digits, $\mathit{checksum} = \sum_i (15 - \mathit{digit}_i)$. Each digit $a_i$ is signed with
    $\sigma_i = \mathrm{chain}(\mathit{sk}_i, 0, a_i)$; the verifier computes $\mathrm{chain}(\sigma_i, a_i, 15 - a_i)$ and compresses the chain ends
    into the public key.

    **Merkle trees (XMSS layer).** $2^{h'}$ WOTS+ public keys are hashed pairwise up to one root. A signature
    gives the leaf's WOTS+ signature and $h'$ sibling hashes.

    **FORS (few-time signatures).** $k$ trees with $2^a$ leaves each; $a$ bits of the digest choose one
    leaf per tree to reveal. Reusing FORS a few times only weakens it slowly, which is why SLH-DSA needs no
    state.

    **Hypertree.** $d$ layers of XMSS trees; each tree signs the root of the one below; the bottom ones sign
    FORS public keys. The message hash picks one bottom leaf out of $2^h$ ($h = d \cdot h'$, 63 for 128s), so
    the same FORS key is rarely used twice.

    **Signature size** (in $n$-byte values): $1 + k(a + 1) + d(2n + 3 + h')$.

    | | $n$ | $h$ | $d$ | $a$ | $k$ | Public key | Signature |
    |---|---|---|---|---|---|---|---|
    | SLH-DSA-…-128s | 16 | 63 | 7 | 12 | 14 | 32 B | 7,856 B |
    | SLH-DSA-…-128f | 16 | 66 | 22 | 6 | 33 | 32 B | 17,088 B |
    | SLH-DSA-…-256s | 32 | 64 | 8 | 14 | 22 | 64 B | 29,792 B |

??? tip "Watch it step by step: signing one digit with a hash chain"

    <div class="mars-steps" markdown>

    1. The signer keeps the secret `secret` and publishes the end of its chain: `H(H(H(secret))) = faa88dfc`.
    2. The message digest's digit is 2.
    3. The signer reveals the value after 2 hashes: `97eff218`.
    4. The verifier hashes it $3 - 2 = 1$ more time: `H(97eff218) = faa88dfc`.
    5. That matches the public end, so the digit 2 is signed.
    6. A forger could hash on to sign a 3, but the signed checksum would then need a smaller digit, which
       means hashing backward: impossible.

    </div>

??? info "The math underneath"

    - **Hash functions** and their one-wayness and second-preimage resistance: the only assumption SLH-DSA
      needs ([SHA-2](../07-hash/SHA-2.md), [SHA-3](../07-hash/SHA-3.md)).
    - **Merkle trees** (Merkle, 1979) and authentication paths.
    - **Lamport and Winternitz one-time signatures**: see [Stateful hash-based signatures](Stateful-Hash-Signatures.md).
    - **Grover's algorithm:** quantum search halves the security of a hash in bits, which is why category 1
      uses 16-byte values, the same quantum margin as AES-128.
    - **Few-time signatures (HORS, FORS):** security falls slowly as one key signs more messages.

## See also

- [ML-DSA](ML-DSA.md): the main post-quantum signature, which this backs up
- [FN-DSA](FN-DSA.md): the compact lattice signature
- [LMS and XMSS](Stateful-Hash-Signatures.md): the stateful hash-based signatures
- [SHA-2](../07-hash/SHA-2.md) / [SHA-3](../07-hash/SHA-3.md): the hashes it is
  built from

## References

- [FIPS 205: SLH-DSA](https://csrc.nist.gov/pubs/fips/205/final)
- [NIST IR 8413: status report on round 3](https://nvlpubs.nist.gov/nistpubs/ir/2022/NIST.IR.8413-upd1.pdf)
- [Bernstein, Hülsing, Kölbl, Niederhagen, Rijneveld, Schwabe, "The SPHINCS+ Signature Framework" (CCS 2019)](https://eprint.iacr.org/2019/1086)
- [SPHINCS+ site and round-3 specification](https://sphincs.org/)
- [Bernstein et al., "SPHINCS: practical stateless hash-based signatures" (Eurocrypt 2015)](https://eprint.iacr.org/2014/795)
- [NIST SP 800-208: stateful hash-based signatures](https://csrc.nist.gov/pubs/sp/800/208/final) / [SP 800-230 (draft): limited-use SLH-DSA sets](https://csrc.nist.gov/pubs/sp/800/230/ipd)
- [Castelnovi, Martinelli, Prest, "Grafting Trees: a Fault Attack against the SPHINCS framework" (PQCrypto 2018)](https://eprint.iacr.org/2018/102)
