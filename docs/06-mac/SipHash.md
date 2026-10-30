# SipHash

*A keyed hash for short inputs, fast enough for hash tables and built to
stop hash flooding.*

**Status and standards:** see [MAC](../index.md#6-mac) in the main table.

## What it is

A hash table puts each entry in a bucket picked by a hash of its key. If
an attacker can choose keys that all land in one bucket, the table turns
into one long list, and inserting n of them takes about n² steps. That's
hash flooding. Crosby and Wallach described it in 2003. In December 2011,
at 28C3, Alexander Klink and Julian Wälde showed it still worked against
PHP, ASP.NET, Java, Python, Ruby and more. About 500 KB of chosen POST
data kept a PHP 5 server busy for a full minute of CPU time.

Adding a random seed to the old fast hashes wasn't enough. Python's
seeded hash gave away its key from two outputs, and at 29C3 (2012)
Aumasson, Bernstein and Martin Boßlet showed collisions in MurmurHash and
CityHash that work for every seed. SipHash (Aumasson and Bernstein,
INDOCRYPT 2012) is their fix: a pseudorandom function with a 128-bit
secret key and a 64-bit output. Without the key nobody can predict which
inputs collide, and it's still quick on short strings: 141 cycles for 16
bytes in the paper, against 600 for MD5 and 82 for CityHash.

## How it works

SipHash-c-d does c rounds per message word and d rounds at the end:

1. Four 64-bit words v0 to v3 start as the key halves k0 and k1 XORed
   with constants (the ASCII of "somepseudorandomlygeneratedbytes").
2. The message is cut into 8-byte little-endian words. The last word
   holds the leftover bytes and, in its top byte, the length mod 256.
3. For each word m: `v3 ^= m`, c SipRounds, `v0 ^= m`.
4. Then `v2 ^= 0xff`, d SipRounds, and the output is v0 ^ v1 ^ v2 ^ v3.

A SipRound is 14 additions, rotations and XORs on the four words, the
same add-rotate-XOR style as ChaCha and BLAKE.

### 2-4 or 1-3

SipHash-2-4 is the default. For c ≥ 2 and d ≥ 4 the designers expect the
best PRF security any function with this key and output size can have;
SipHash-4-8 is their conservative pick, at half the speed. SipHash-1-3
does half the work per word. It's outside that claim and shows up where
only hash tables are at stake. Later variants: SipHash-128 has a 128-bit
output, and HalfSipHash uses 32-bit words and a 64-bit key.

## Where it's used

- **Python:** `hash()` of str and bytes has used SipHash-2-4 since 3.4
  (PEP 456) and SipHash-1-3 since 3.11, with a random key per process.
- **Rust:** HashMap's default hasher is SipHash-1-3 with a random key.
  The docs say the algorithm may change.
- **Linux:** `siphash` (2-4) arrived in 4.11 (2017) for things like
  sequence numbers and cookies. `hsiphash` (HalfSipHash-1-3, or
  SipHash-1-3 on 64-bit kernels) is only for hash tables; the kernel docs
  call it insecure for anything else.
- **Others:** the designers list Perl, Ruby, Redis, FreeBSD, OpenBSD and
  WireGuard.

## When to use it

- **Hash tables, sets and caches that take untrusted keys.** Your
  language probably does this already; leave its random key alone.
- **A short-input PRF** where 64 bits is enough, like the kernel's
  sequence numbers.
- **Not as a general MAC.** The designers say it's a secure MAC, but a
  64-bit tag is a low bar: 2^s blind guesses succeed with probability
  2^(s−64). It has no RFC or NIST standard either, so protocols don't
  offer it. Use [HMAC](HMAC.md), [KMAC](KMAC.md) or keyed
  [BLAKE2](../07-hash/BLAKE.md).
- **Not as a hash.** Anyone who knows the key can find collisions, so it's
  no checksum or fingerprint.

## Example (Python)

SipHash-2-4 straight from the paper's description. The key is 00 01 … 0f
and the message 00 01 … 0e, the paper's Appendix A test.

```python
M = (1 << 64) - 1

def rotl(x, b):
    return (x << b | x >> (64 - b)) & M

def siphash(key, msg, c=2, d=4):
    k0 = int.from_bytes(key[:8], "little")
    k1 = int.from_bytes(key[8:], "little")
    v = [k0 ^ 0x736f6d6570736575, k1 ^ 0x646f72616e646f6d,
         k0 ^ 0x6c7967656e657261, k1 ^ 0x7465646279746573]

    def sipround():
        v[0] = (v[0] + v[1]) & M; v[1] = rotl(v[1], 13) ^ v[0]; v[0] = rotl(v[0], 32)
        v[2] = (v[2] + v[3]) & M; v[3] = rotl(v[3], 16) ^ v[2]
        v[0] = (v[0] + v[3]) & M; v[3] = rotl(v[3], 21) ^ v[0]
        v[2] = (v[2] + v[1]) & M; v[1] = rotl(v[1], 17) ^ v[2]; v[2] = rotl(v[2], 32)

    msg += bytes(7 - len(msg) % 8) + bytes([len(msg) % 256])
    for i in range(0, len(msg), 8):
        m = int.from_bytes(msg[i:i + 8], "little")
        v[3] ^= m
        for _ in range(c):
            sipround()
        v[0] ^= m
    v[2] ^= 0xff
    for _ in range(d):
        sipround()
    return v[0] ^ v[1] ^ v[2] ^ v[3]

key, msg = bytes(range(16)), bytes(range(15))
print(format(siphash(key, msg), "016x"))
# a129ca6149be45e5 (the paper, Appendix A)
print(format(siphash(key, msg, 1, 3), "016x"))
# d320d86d2a519956 (SipHash-1-3)
```

The function also matches all 64 vectors in the reference `vectors.h`
and, with c=1 and d=3, the 64 in Rust's SipHash-1-3 tests. Those files
store outputs as little-endian bytes, so the first value shows up there
as `e5 45 be 49 61 ca 29 a1`.

## Security notes

- The key must be secret and random, read from the OS at startup. A fixed
  or leaked key brings flooding straight back.
- A hash table leaks a little through timing, such as which inputs share a
  bucket. SipHash is built so that even full outputs don't help an
  attacker, so those leaks don't matter.
- Key search costs 2^128; the 64-bit output is the real limit.

## See also

- [HMAC](HMAC.md): the general-purpose MAC
- [Universal hash MACs](Universal-Hash-MACs.md): the kind of keyed hash Crosby and Wallach first proposed for hash tables
- [BLAKE](../07-hash/BLAKE.md): add-rotate-XOR hashing with a key built in, for long inputs and longer tags

## References

- [Aumasson and Bernstein, "SipHash: a fast short-input PRF" (INDOCRYPT 2012)](https://www.aumasson.jp/siphash/siphash.pdf) (Sections 2, 3, 6, 7, Appendix A)
- [SipHash reference code and test vectors](https://github.com/veorq/SipHash) (README, `vectors.h`)
- Crosby and Wallach, "Denial of Service via Algorithmic Complexity Attacks" (USENIX Security 2003)
- [Klink and Wälde, "Effective Denial of Service attacks against web application platforms" (28C3, 2011)](https://fahrplan.events.ccc.de/congress/2011/Fahrplan/events/4680.en.html) / [oCERT-2011-003](https://ocert.org/advisories/ocert-2011-003.html)
- [Aumasson, Bernstein and Boßlet, "Hash-flooding DoS reloaded: attacks and defenses" (29C3, 2012)](https://fahrplan.events.ccc.de/congress/2012/Fahrplan/events/5152.en.html)
- [PEP 456: Secure and interchangeable hash algorithm](https://peps.python.org/pep-0456/) / [What's New in Python 3.11](https://docs.python.org/3/whatsnew/3.11.html) (bpo-29410)
- [Rust: `std::collections::HashMap`](https://doc.rust-lang.org/std/collections/struct.HashMap.html) / [SipHash tests](https://github.com/rust-lang/rust/blob/master/library/coretests/tests/hash/sip.rs)
- [Linux kernel: SipHash](https://docs.kernel.org/security/siphash.html) / [commit 2c956a6 (Linux 4.11)](https://github.com/torvalds/linux/commit/2c956a60778cbb6a27e0c7a8a52a91378c90e1d1)
