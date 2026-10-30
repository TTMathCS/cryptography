# NIST DRBGs (SP 800-90A, B and C)

*HMAC_DRBG, Hash_DRBG and CTR_DRBG: the generators a FIPS module has to use,
the rules for the entropy that seeds them, and Dual_EC_DRBG, the one NIST
pulled.*

**Status and standards:** see [Random number generation](../index.md#9-random-number-generation)
in the main table.

## What it is

A DRBG (deterministic random bit generator) is a cryptographic generator
written down precisely enough to test: feed it a seed with enough entropy,
and it turns a secret internal state into output. NIST's SP 800-90 series
has three parts:

| Part | Covers | Current version |
|---|---|---|
| SP 800-90A | the DRBGs: Hash_DRBG, HMAC_DRBG, CTR_DRBG | Rev. 1 (June 2015); Rev. 2 pre-draft (September 2025) |
| SP 800-90B | entropy sources and how to test them | final (January 2018) |
| SP 800-90C | how to put the two together into a whole generator | final (September 2025) |

The first SP 800-90 came out in June 2006 with four DRBGs, Dual_EC_DRBG
among them. It became SP 800-90A in January 2012, and Rev. 1 dropped
Dual_EC_DRBG. SP 800-90C took 13 years: drafts in 2012, 2016, 2022 and
2024. The Rev. 2 pre-draft of 90A adds a DRBG built on SHAKE.

Windows' `BCryptGenRandom` is a CTR_DRBG, and OpenSSL 3's default generator
is an SP 800-90A DRBG.

## How it works

All three have the same calls: **instantiate** (entropy input, a nonce and
an optional personalization string), **generate** (with optional additional
input), **reseed** and **uninstantiate**.

- **HMAC_DRBG** keeps a key K and a value V. Its update step is
  `K = HMAC(K, V ‖ 0x00 ‖ data)`, `V = HMAC(K, V)`, then the same again with
  `0x01` if there is data. Generate repeats `V = HMAC(K, V)` and outputs the
  V's, then runs the update.
- **Hash_DRBG** keeps a value V and a constant C, each 440 bits for
  SHA-256 (888 for SHA-384 and SHA-512). It outputs `Hash(V)`,
  `Hash(V+1)`, …, then sets `V = V + Hash(0x03 ‖ V) + C + counter`.
- **CTR_DRBG** is [AES in counter mode](../05-modes-aead/Classic-Modes.md#ctr)
  under a key that is replaced after every request. With its derivation
  function it can take any entropy input; without it the seed must be full
  entropy, exactly key length + 128 bits.

The limits are the same for all of them with AES or SHA-2: at most 2¹⁹
bits (64 KiB) per request, and a reseed at least every 2⁴⁸ requests.
Security strength goes up to 256 bits, and the entropy input must carry at
least as many bits of min-entropy as the strength asked for.

### Reseeding and prediction resistance

Every DRBG updates its state after each request, so a state stolen today
can't rebuild yesterday's output. SP 800-90A calls this backtracking
resistance, and all three have it.

Prediction resistance is the other direction: output after a compromise is
safe again. Only fresh entropy gives that. A caller asks for it on a
generate call, and the DRBG then reseeds from its entropy source before
producing anything. A DRBG with no live entropy source can't offer it.

### Entropy sources (SP 800-90B)

An entropy source is a noise source (the process that is actually
unpredictable, such as thermal noise or timing jitter), an optional
conditioning function, and health tests. Validation estimates the
min-entropy per sample, which measures the most likely value rather than
the average. Samples that pass as independent and identically distributed
(the IID track) get a simple estimate. All others go through ten
estimators, and the lowest result counts.

Two health tests run all the time. The repetition count test fails when one
value repeats too many times in a row. The adaptive proportion test fails
when one value turns up too often in a window. A failure stops the output.
Since November 7, 2020 the CMVP has required FIPS 140-2 and 140-3
submissions to show their entropy source meets SP 800-90B.

### Constructions (SP 800-90C)

SP 800-90C names four ways to build the whole thing:

| Construction | What it is | Prediction resistance |
|---|---|---|
| RBG1 | a DRBG seeded once from outside the device, never reseeded | no |
| RBG2(P), RBG2(NP) | a DRBG with its own physical or non-physical entropy source | optional |
| RBG3(XOR), RBG3(RS) | a physical entropy source plus a DRBG, giving full-entropy output | yes |
| RBGC | a tree of DRBGs, each seeding the next | optional |

RBGC fits an operating system: the kernel's DRBG is the root, and
applications seed their own DRBGs from it.

## Dual_EC_DRBG

**How it worked.** The state is a number s, and the standard fixes two
points on a NIST curve: P, the curve's generator, and Q, a constant given
with no word on where it came from. Each step outputs the x-coordinate of
s·Q with the top 16 bits cut off (on P-256), and the next state is the
x-coordinate of s·P.

**The backdoor.** At the CRYPTO 2007 rump session (21 August 2007), Dan
Shumow and Niels Ferguson of Microsoft showed that anyone who knows d with
P = d·Q can predict everything. From one output, try the 2¹⁶ missing bits
to get back s·Q, multiply by d to get s·P, and read off the next state. In
their tests 32 bytes of output always pinned down the state. They said
plainly that they were not accusing NIST, only that nobody knew whether
the designer of Q held d.

**The fall.** On September 5, 2013, news reports based on the Snowden
documents said the NSA had worked to weaken encryption standards, and
pointed to the flaw Shumow and Ferguson had found. NIST told users to stop
using Dual_EC_DRBG that month, removed it from the draft revision on
April 21, 2014, and published Rev. 1 without it in June 2015.

**Juniper.** In December 2015 Juniper found unauthorized code in its
ScreenOS firewalls. Checkoway et al. (2016) showed that someone had swapped
in their own Q, which let whoever held the matching d decrypt the VPN
traffic passively.

## When to use it

- **When FIPS 140-3 is required:** the module must use an SP 800-90A DRBG
  seeded from a validated SP 800-90B entropy source.
- **When a spec or a device you build names one,** such as an HSM or a
  smart card.
- **Everywhere else, just call the [OS generator](OS-RNG.md).** It already
  is a well-seeded generator, and writing your own adds bugs.
- HMAC_DRBG is the easiest to get right. RFC 6979 uses it to make
  deterministic [ECDSA nonces](../02-signatures/ECDSA.md#the-k-problem).

## Example (Python)

HMAC_DRBG with SHA-256 in a few lines. This matches the first SHA-256
no-reseed vector in NIST CAVP's `HMAC_DRBG.rsp` (as copied into OpenSSL's
test suite), checked byte for byte:

```python
import hmac, hashlib

def H(K, data):
    return hmac.new(K, data, hashlib.sha256).digest()

def update(K, V, data=b""):
    K = H(K, V + b"\x00" + data)
    V = H(K, V)
    if data:
        K = H(K, V + b"\x01" + data)
        V = H(K, V)
    return K, V

def instantiate(entropy, nonce, pers=b""):
    return update(bytes(32), b"\x01" * 32, entropy + nonce + pers)

def generate(K, V, n, extra=b""):
    if extra:
        K, V = update(K, V, extra)
    out = b""
    while len(out) < n:
        V = H(K, V)
        out += V
    K, V = update(K, V, extra)           # move on, so old output can't be rebuilt
    return out[:n], K, V

e = bytes.fromhex("ca851911349384bffe89de1cbdc46e6831e44d34a4fb935ee285dd14b71a7488")
nonce = bytes.fromhex("659ba96c601dc69fc902940805ec0ca8")
K, V = instantiate(e, nonce)
_, K, V = generate(K, V, 128)            # the test throws the first call away
out, K, V = generate(K, V, 128)
print(out[:16].hex())                    # e528e9abf2dece54d47c7e75e5fe3021
print(out[-16:].hex())                   # 1f50d476aa0458bdaba806f48be9dcb8
```

A reseed is one more call, `update(K, V, entropy + extra)`. A real DRBG
also counts requests, enforces the length limits and gets its entropy from
the OS. Use this to learn how it works, not in place of the OS generator.

## Security notes

- The seed is everything. A DRBG fed a guessable seed produces guessable
  output that passes every statistical test.
- Without prediction resistance, a copied state (a `fork()`, a cloned VM)
  gives the same output twice. Reseed after either.
- CTR_DRBG without the derivation function needs full-entropy input; raw
  noise samples don't qualify.
- CTR_DRBG with TDEA is still in Rev. 1, with tighter limits (2¹³ bits per
  request, 2³² requests), but [3DES](../04-symmetric-ciphers/Retired.md#3des)
  itself is retired. Use AES.

## See also

- [OS random number generators](OS-RNG.md): what to call in practice
- [Retired generators](Retired.md): Dual_EC_DRBG's entry and other failures
- [HMAC](../06-mac/HMAC.md): HMAC_DRBG's only building block
- [ECDSA](../02-signatures/ECDSA.md#the-k-problem): why nonces need a good
  generator, and RFC 6979's HMAC_DRBG fix

## References

- [NIST SP 800-90A Rev. 1: DRBGs (2015)](https://csrc.nist.gov/pubs/sp/800/90/a/r1/final) / [SP 800-90 (2006, withdrawn)](https://csrc.nist.gov/pubs/sp/800/90/final) / [SP 800-90A Rev. 2 pre-draft call for comments (2025)](https://csrc.nist.gov/pubs/sp/800/90/a/r2/iprd)
- [NIST SP 800-90B: Entropy Sources (2018)](https://csrc.nist.gov/pubs/sp/800/90/b/final) / [NIST SP 800-90C: RBG Constructions (2025)](https://csrc.nist.gov/pubs/sp/800/90/c/final)
- [NIST CAVP DRBG test vectors](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/random-number-generators) / [OpenSSL `evprand.txt`](https://github.com/openssl/openssl/blob/master/test/recipes/30-test_evp_data/evprand.txt)
- [CMVP entropy validations](https://csrc.nist.gov/projects/cryptographic-module-validation-program/entropy-validations)
- [NIST SP 800-90 historical information](https://csrc.nist.gov/projects/random-bit-generation/rbg-archive/nist-sp-800-90-historical-information) / [NIST, "NIST Removes Cryptography Algorithm from Random Number Generator Recommendations" (April 21, 2014)](https://www.nist.gov/news-events/news/2014/04/nist-removes-cryptography-algorithm-random-number-generator-recommendations)
- [Shumow and Ferguson, "On the Possibility of a Back Door in the NIST SP800-90 Dual Ec Prng" (CRYPTO 2007 rump session)](https://rump2007.cr.yp.to/)
- [Checkoway et al., "A Systematic Analysis of the Juniper Dual EC Incident" (CCS 2016)](https://eprint.iacr.org/2016/376)
- [RFC 6979: Deterministic DSA and ECDSA](https://www.rfc-editor.org/rfc/rfc6979) (Section 3.3) / [Microsoft: `BCryptGenRandom`](https://learn.microsoft.com/en-us/windows/win32/api/bcrypt/nf-bcrypt-bcryptgenrandom) / [OpenSSL `RAND(7)`](https://docs.openssl.org/3.0/man7/RAND/)

*Weaker sources:* [Perlroth, Larson and Shane, "Revealed: The NSA's Secret Campaign to Crack, Undermine Internet Security" (ProPublica, with The New York Times and The Guardian, September 5, 2013)](https://www.propublica.org/article/the-nsas-secret-campaign-to-crack-undermine-internet-encryption) for what the 2013 reports said.
