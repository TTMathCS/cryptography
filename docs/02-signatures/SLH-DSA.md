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

Needs `liboqs-python` with liboqs 0.15 or later. Older versions only have
SPHINCS+, whose signatures differ from FIPS 205.

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
