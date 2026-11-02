# SLH-DSA (SPHINCS+)

*A signature built from nothing but a hash function. Signatures are big and
signing is slow, but if lattices ever fall, this one still stands.*

**Status and standards:** see [Digital signatures](../index.md#2-digital-signatures)
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
the message hash, out of 2⁶³ or more, so repeats are rare, and the bottom
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

## How it works

Three hash-based parts, all regenerated from a secret seed when needed:

- **WOTS+ one-time signatures:** the public key comes from hashing each of
  many random strings 15 times. To sign, reveal each chain partway, as far as
  the message's base-16 digits say. A checksum stops anyone from hashing
  forward to sign something else.
- **A hypertree:** Merkle trees of 2^h′ WOTS+ keys each, stacked d layers
  deep. Each tree signs the roots of the trees below; the top root is the
  public key.
- **FORS** at the bottom: k small Merkle trees of 2^a leaves. The message
  digest picks one leaf in each tree to reveal.

The signature is a randomizer R, the FORS signature, and one WOTS+ signature
plus Merkle path per layer. Counting n-byte values: 1 + k(a + 1) +
d(2n + 3 + h′). For 128s (n = 16, k = 14, a = 12, d = 7, h′ = 9) that is
16 × (1 + 182 + 308) = 7,856 bytes. The f sets use many short trees (128f has
22 layers of height 3), so signing is faster and signatures longer.

## When to use it

- **Long-lived roots of trust:** firmware, boot loaders, root CAs. Few
  signatures, many checks, decades of life. NIST's draft SP 800-230 (April
  2026) adds smaller sets for keys that sign at most 2²⁴ times.
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
- The FIPS 205 sets stay secure for up to 2⁶⁴ signatures per key.
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

    **WOTS+ (FIPS 205 §5).** With `w = 16`, an `n`-byte message digest becomes `len₁ = 2n` base-16 digits plus
    `len₂ = 3` checksum digits, `checksum = Σ (15 − digitᵢ)`. Each digit `aᵢ` is signed with
    `σᵢ = chain(skᵢ, 0, aᵢ)`; the verifier computes `chain(σᵢ, aᵢ, 15 − aᵢ)` and compresses the chain ends
    into the public key.

    **Merkle trees (XMSS layer).** `2^h′` WOTS+ public keys are hashed pairwise up to one root. A signature
    gives the leaf's WOTS+ signature and `h′` sibling hashes.

    **FORS (few-time signatures).** `k` trees with `2^a` leaves each; `a` bits of the digest choose one
    leaf per tree to reveal. Reusing FORS a few times only weakens it slowly, which is why SLH-DSA needs no
    state.

    **Hypertree.** `d` layers of XMSS trees; each tree signs the root of the one below; the bottom ones sign
    FORS public keys. The message hash picks one bottom leaf out of `2^h` (`h = d·h′`, 63 for 128s), so
    the same FORS key is rarely used twice.

    **Signature size** (in `n`-byte values): `1 + k(a + 1) + d(2n + 3 + h′)`.

    | | n | h | d | a | k | Public key | Signature |
    |---|---|---|---|---|---|---|---|
    | SLH-DSA-…-128s | 16 | 63 | 7 | 12 | 14 | 32 B | 7,856 B |
    | SLH-DSA-…-128f | 16 | 66 | 22 | 6 | 33 | 32 B | 17,088 B |
    | SLH-DSA-…-256s | 32 | 64 | 8 | 14 | 22 | 64 B | 29,792 B |

??? tip "Watch it step by step: signing one digit with a hash chain"

    <div class="mars-steps" markdown>

    1. The signer keeps the secret `secret` and publishes the end of its chain: `H(H(H(secret))) = faa88dfc`.
    2. The message digest's digit is 2.
    3. The signer reveals the value after 2 hashes: `97eff218`.
    4. The verifier hashes it 3 − 2 = 1 more time: `H(97eff218) = faa88dfc`.
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
