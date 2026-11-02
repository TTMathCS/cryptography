# BLAKE, BLAKE2 and BLAKE3

*The SHA-3 finalist that lost to Keccak, and the faster hashes built
from it: BLAKE2 in 2012, BLAKE3 in 2020.*

**Status and standards:** see [Hash functions](../index.md#7-hash-functions) in
the main table.

## What it is

BLAKE (Aumasson, Henzen, Meier and Phan, 2008) was one of the five
finalists in NIST's SHA-3 competition. NIST found it had a very large
security margin and ran extremely well in software, but chose Keccak in
October 2012, partly because BLAKE is an add-rotate-XOR design like SHA-2
and Keccak is not. BLAKE itself is rarely used now; its successors are
what people run.

| Function | Output | Use |
|---|---|---|
| BLAKE2b | 1 to 64 bytes | 64-bit CPUs: Argon2, libsodium, b2sum |
| BLAKE2s | 1 to 32 bytes | 8 to 32-bit CPUs: WireGuard, the Linux RNG |
| BLAKE3 | any length, 32 bytes by default | hash, MAC, KDF and XOF in one function |

BLAKE2 (Aumasson, Neves, Wilcox-O'Hearn and Winnerlein, 2012) cut the
rounds, from 16 to 12 in BLAKE2b and from 14 to 10 in BLAKE2s, and built
in keying, personalization and tree hashing. RFC 7693 (2015) specifies
BLAKE2b and BLAKE2s with keys. It's an informational RFC, and the salt,
personalization and tree modes are only in the designers' spec.

BLAKE3 (O'Connor, Aumasson, Neves and Wilcox-O'Hearn, January 2020) takes
BLAKE2s's compression function, cuts it to 7 rounds and runs it over a
tree. It has no variants and no RFC: an Internet-Draft (2024) expired, and
the C2SP project hosts its spec.

## How it works

### BLAKE2

- The state is eight words (64-bit in 2b, 32-bit in 2s). They start as
  SHA-512's or SHA-256's initial values, with the first word XORed with a
  parameter block: digest length, key length and the optional fields.
- Each 128-byte (2b) or 64-byte (2s) block is compressed with a byte
  counter and a last-block flag. The mixing step G is built like
  ChaCha's quarter-round, with two message words added in.
- **Keyed mode:** the key, zero-padded to a full block, goes in as the
  first block. That's the whole MAC. RFC 7693 says BLAKE2 needs no HMAC,
  and prefixing the key is safe because BLAKE2 keeps BLAKE's
  indifferentiability proof.
- The digest length is in the parameter block, so BLAKE2b-256 is not a
  cut-down BLAKE2b-512.

### BLAKE3

- The input is split into 1 KiB chunks. Each chunk is hashed like
  sequential BLAKE2s, 64 bytes at a time, with the chunk's index as the
  counter.
- Chunk results are combined in pairs, level by level, up to a root.
  Chunks don't depend on each other, so from 2 KiB up, SIMD lanes and
  threads can work on several at once.
- Three modes, set by the starting words and flags: `hash` starts from the
  IV, `keyed_hash` puts a 32-byte key in its place, and `derive_key`
  hashes a context string first, then uses the result as the key for
  hashing the key material.
- Output comes from compressing the root again with an output counter, 64
  bytes at a time, for as long as you need. Unlike BLAKE2, a shorter
  output is a prefix of a longer one.

### Speed

By the designers' numbers, BLAKE2b runs at about 3 cycles per byte on a
Core i5-6600, ahead of MD5, SHA-1, SHA-2 and SHA-3 in software. One BLAKE3
thread on an Intel Cascade Lake-SP peaks at 4 times BLAKE2b and 12 times
SHA-256, and more threads add more. Below 1 KiB it behaves like BLAKE2s
with fewer rounds, so the big gains need long inputs.

## Where it's used

- **WireGuard:** BLAKE2s as its hash, keyed BLAKE2s with 16-byte tags as
  its MAC, and HMAC-BLAKE2s inside its key derivation.
- **Argon2:** BLAKE2b hashes the inputs, and the compression function G
  is BLAKE2b's round with multiplications added (RFC 9106).
- **Linux RNG:** BLAKE2s has mixed the entropy pool since 5.17 (2022).
- **libsodium:** `crypto_generichash` is BLAKE2b.
- **b2sum:** in GNU coreutils since 8.26 (2016), 512-bit BLAKE2b by
  default.
- **Zcash:** BLAKE2b inside the Equihash proof of work, and personalized
  BLAKE2b and BLAKE2s across the protocol.
- **BLAKE3:** ccache moved from MD4 to it in 4.0 (2020), and the designers
  list Bazel, Cargo, LLVM and OpenZFS among others. `b3sum` is its
  command-line tool.

## When to use it

- **BLAKE2** when you want a fast software hash with a spec behind it, or
  a keyed hash without HMAC.
- **BLAKE3** for large files, content addressing and build caches, where
  the tree and threads pay off, or when one function for hashing, MACs,
  key derivation and XOF keeps a design simple.
- **SHA-2 or SHA-3** when FIPS or a protocol requires NIST algorithms. No
  BLAKE version is a NIST standard. And on CPUs with SHA-256
  instructions, SHA-256 is often the faster one.
- **Not for passwords.** Use [Argon2](../08-kdf-password-hashing/Argon2.md),
  which runs BLAKE2b inside but is built to be slow.

## Example (Python)

```python
import hashlib

print(hashlib.blake2s(b"abc").hexdigest())
# 508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982

print(hashlib.blake2s(b"abc", digest_size=16).hexdigest())
# aa4938119b1dc7b87cbad0ffd200d0ae

key = bytes(range(32))                        # keyed: BLAKE2s as a MAC
print(hashlib.blake2s(b"", key=key).hexdigest())
# 48a8997da407876b3d79c0d92325ad3b89cbb754d86ab71aee047ad345fd2c49
```

The first is RFC 7693's Appendix B value. The second is not the first
half of the first, since the length is in the parameter block. The third
is the first keyed vector in the BLAKE2 test set. `blake2b` works the
same way, with keys up to 64 bytes. Compare tags with
`hmac.compare_digest`. BLAKE3 needs the third-party `blake3` package, so
it isn't shown or run here.

## Security notes

- BLAKE2b-512 has 256-bit collision resistance and BLAKE2s-256 has 128.
  BLAKE3 targets 128 bits for everything, whatever the output length,
  though its keys are 256 bits.
- BLAKE3 has the thinnest margin, 7 rounds against BLAKE2s's 10. Its
  designers base that on ten years of attacks on BLAKE and BLAKE2.
- Keys must be random and secret. A BLAKE3 key is exactly 32 bytes.
  Salt and personalization aren't secrets; they only make hashes for
  different uses come out different.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: BLAKE2b of \"abc\", three ways"

    Recomputed with Python's `hashlib`; the first matches RFC 7693 Appendix A:

    | Call | First 16 bytes of the output |
    |---|---|
    | BLAKE2b-512("abc") | `ba80a53f 981c4d0d 6a2797b6 9f12f6e9` (64 bytes in all) |
    | BLAKE2b-256("abc") | `bddd813c 63423972 3171ef3f ee98579b` (32 bytes) |
    | BLAKE2b-512("abc", key "secret") | `204c828c 56fbe6df e80f110e fd16649b` |

    BLAKE2b-256 is not the first half of BLAKE2b-512: the digest length goes into the first state word
    (`6a09e667f3bcc908 ⊕ 0x01010040 = 6a09e667f2bdc948` for 64 bytes, unkeyed), so each length is its own
    function. A key changes everything too, and that alone makes it a MAC.

??? abstract "The math, with formulas"

    **The G function (BLAKE2b)** mixes four state words `a, b, c, d` with two message words `x, y`:

    ```
    a = a + b + x;   d = (d ⊕ a) >>> 32
    c = c + d;       b = (b ⊕ c) >>> 24
    a = a + b + y;   d = (d ⊕ a) >>> 16
    c = c + d;       b = (b ⊕ c) >>> 63
    ```

    It is [ChaCha](../04-symmetric-ciphers/ChaCha.md)'s quarter round with the message added in. BLAKE2s uses
    32-bit words and rotations 16, 12, 8, 7.

    **Compression.** Build a 16-word working vector from the 8-word state, the IV, the byte counter `t` and the
    last-block flag `f`: `v = h ‖ IV`, `v₁₂ ⊕= t_low`, `v₁₃ ⊕= t_high`, `v₁₄ ⊕= f`. Run 12 rounds (BLAKE2b) or
    10 (BLAKE2s) of G on columns then diagonals, with the message words permuted by a fixed schedule `σ`. Then
    `h = h ⊕ v[0..7] ⊕ v[8..15]`.

    **BLAKE3** uses BLAKE2s's G with 7 rounds, 1 KiB chunks and a binary Merkle tree: each parent node is
    `compress(left ‖ right)` with a PARENT flag. The tree makes hashing parallel and lets you verify any 1 KiB
    piece of a large file with a short proof.

??? tip "Watch it step by step: one G mix"

    <div class="mars-steps" markdown>

    1. Take four state words `a, b, c, d` and two message words `x, y`.
    2. Add `b` and `x` into `a`; XOR `a` into `d` and rotate it by 32.
    3. Add `d` into `c`; XOR `c` into `b` and rotate it by 24.
    4. Add `b` and `y` into `a`; XOR into `d`, rotate by 16.
    5. Add `d` into `c`; XOR into `b`, rotate by 63.
    6. Each round runs G on the 4 columns, then the 4 diagonals of the 4×4 state; 12 rounds per block.

    </div>

??? info "The math underneath"

    - **ARX** (add, rotate, XOR) on 64 and 32-bit words: [ChaCha](../04-symmetric-ciphers/ChaCha.md).
    - **HAIFA**, a Merkle–Damgård variant with a counter and a final flag, which blocks length extension.
    - **Merkle trees** for BLAKE3's parallel hashing and verified streaming.
    - **Indifferentiability**, the proof that lets the key simply be prefixed.
    - Compare [SHA-2](SHA-2.md) and [SHA-3](SHA-3.md).

## See also

- [SHA-3](SHA-3.md): the finalist that won
- [HMAC](../06-mac/HMAC.md) / [KMAC](../06-mac/KMAC.md): the MAC for hashes with no key input, and SHA-3's own
- [SipHash](../06-mac/SipHash.md): a smaller keyed hash for short inputs
- [Argon2](../08-kdf-password-hashing/Argon2.md): password hashing built on BLAKE2b
- [ChaCha](../04-symmetric-ciphers/ChaCha.md): where BLAKE's mixing step comes from

## References

- [NIST IR 7896: Third-Round Report of the SHA-3 Cryptographic Hash Algorithm Competition (2012)](https://nvlpubs.nist.gov/nistpubs/ir/2012/NIST.IR.7896.pdf) (Sections 3, 4.2.1)
- [Aumasson, Neves, Wilcox-O'Hearn and Winnerlein, "BLAKE2: simpler, smaller, fast as MD5" (ACNS 2013)](https://eprint.iacr.org/2013/322) / [blake2.net](https://www.blake2.net/)
- [RFC 7693: The BLAKE2 Cryptographic Hash and MAC](https://www.rfc-editor.org/rfc/rfc7693) (Sections 2, 3, 4, Appendix B) / [BLAKE2 test vectors](https://github.com/BLAKE2/BLAKE2/tree/master/testvectors)
- [O'Connor, Aumasson, Neves and Wilcox-O'Hearn, "BLAKE3: one function, fast everywhere"](https://github.com/BLAKE3-team/BLAKE3-specs/blob/master/blake3.pdf) (Sections 1–4) / [BLAKE3 repository](https://github.com/BLAKE3-team/BLAKE3) (README, adoption list) / [C2SP](https://c2sp.org/BLAKE3) / [draft-aumasson-blake3](https://datatracker.ietf.org/doc/draft-aumasson-blake3/)
- [Donenfeld, "WireGuard: Next Generation Kernel Network Tunnel" (NDSS 2017)](https://www.wireguard.com/papers/wireguard.pdf) (Section 5.4)
- [RFC 9106: Argon2](https://www.rfc-editor.org/rfc/rfc9106) (Sections 3.2, 3.5, 3.6)
- [Zcash Protocol Specification](https://zips.z.cash/protocol/protocol.pdf) (Sections 5.4.1.2, 5.4.1.11, 7.7.1)
- [BLAKE2s commit (Linux 5.17)](https://github.com/torvalds/linux/commit/9f9eff85a008b095eafc5f4ecbaf5aca689271c1) / [libsodium: generic hashing](https://doc.libsodium.org/hashing/generic_hashing) / [coreutils NEWS, 8.26](https://github.com/coreutils/coreutils/blob/master/NEWS) / [b2sum](https://www.gnu.org/software/coreutils/manual/html_node/b2sum-invocation.html) / [ccache 4.0 release notes](https://ccache.dev/releasenotes.html#_ccache_4_0)
- [Python `hashlib`: BLAKE2](https://docs.python.org/3/library/hashlib.html#blake2)

*Weaker sources:* [Wikipedia, "BLAKE (hash function)"](https://en.wikipedia.org/wiki/BLAKE_%28hash_function%29) for the December 2012 release of BLAKE2.
