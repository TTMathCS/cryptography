# SipHash

*A keyed hash for short inputs, fast enough for hash tables and built to
stop hash flooding.*

**Status and standards:** see [MAC](../algorithms/table.md#6-mac) in the main table.

## What it is

A hash table puts each entry in a bucket picked by a hash of its key. If
an attacker can choose keys that all land in one bucket, the table turns
into one long list, and inserting $n$ of them takes about $n^2$ steps. That's
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

## The story

- **Who made it:** Jean-Philippe Aumasson and Daniel J. Bernstein, 2012.
- **What for:** A keyed hash for hash tables, fast on short inputs.
- **What it solved:** Hash flooding: with a secret key the attacker can't choose colliding keys.
- **Where it stands:** The default table hash in Python (since 3.4), Rust, Ruby and Perl, and used in the Linux kernel.
- **Incidents:** The December 2011 talk at 28C3 by Klink and Wälde took down web servers in PHP, Java, ASP.NET, Python and Ruby with a single crafted request, and is why SipHash spread so fast.

## How it works

SipHash-c-d does $c$ rounds per message word and $d$ rounds at the end:

1. Four 64-bit words $v_0$ to $v_3$ start as the key halves $k_0$ and $k_1$ XORed
   with constants (the ASCII of "somepseudorandomlygeneratedbytes").
2. The message is cut into 8-byte little-endian words. The last word
   holds the leftover bytes and, in its top byte, the length $\bmod 256$.
3. For each word $m$: $v_3 \mathrel{\oplus}= m$, $c$ SipRounds, $v_0 \mathrel{\oplus}= m$.
4. Then $v_2 \mathrel{\oplus}= \mathtt{0xff}$, $d$ SipRounds, and the output is $v_0 \oplus v_1 \oplus v_2 \oplus v_3$.

A SipRound is 14 additions, rotations and XORs on the four words, the
same add-rotate-XOR style as ChaCha and BLAKE.

### 2-4 or 1-3

SipHash-2-4 is the default. For $c \ge 2$ and $d \ge 4$ the designers expect the
best PRF security any function with this key and output size can have;
SipHash-4-8 is their conservative pick, at half the speed. SipHash-1-3
does half the work per word. It's outside that claim and shows up where
only hash tables are at stake. Later variants: SipHash-128 has a 128-bit
output, and HalfSipHash uses 32-bit words and a 64-bit key.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 375" role="img" aria-labelledby="sk-c-flood-t"><title id="sk-c-flood-t">Two rows of hash-table buckets: with a known hash, an attacker piles nine keys into one bucket; with a keyed hash the same keys spread out evenly</title><defs><filter id="sk-c-flood-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-flood-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-flood-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-flood-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-flood-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="375" filter="url(#sk-c-flood-paper)"/><g filter="url(#sk-c-flood-pen)"><text x="30" y="44" class="h">Why a hash table needs a secret key</text><text x="30" y="90" class="s">known hash: an attacker picks keys that all collide</text><path class="p room" d="M30 110 L58 110 L58 134 L30 134Z"/><circle cx="44" cy="150" r="7" class="p gold"/><path class="p room" d="M64 110 L92 110 L92 134 L64 134Z"/><path class="p room" d="M98 110 L126 110 L126 134 L98 134Z"/><circle cx="112" cy="150" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="168" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="186" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="204" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="222" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="240" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="258" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="276" r="7" class="p red" style="fill:#a03a2a"/><circle cx="112" cy="294" r="7" class="p red" style="fill:#a03a2a"/><path class="p room" d="M132 110 L160 110 L160 134 L132 134Z"/><circle cx="146" cy="150" r="7" class="p gold"/><path class="p room" d="M166 110 L194 110 L194 134 L166 134Z"/><path class="p room" d="M200 110 L228 110 L228 134 L200 134Z"/><circle cx="214" cy="150" r="7" class="p gold"/><path class="p room" d="M234 110 L262 110 L262 134 L234 134Z"/><path class="p room" d="M268 110 L296 110 L296 134 L268 134Z"/><circle cx="282" cy="150" r="7" class="p gold"/><text x="340" y="90" class="s">secret key: they spread out</text><path class="p room" d="M340 110 L368 110 L368 134 L340 134Z"/><circle cx="354" cy="150" r="7" class="p gold"/><circle cx="354" cy="168" r="7" class="p gold"/><path class="p room" d="M374 110 L402 110 L402 134 L374 134Z"/><circle cx="388" cy="150" r="7" class="p gold"/><path class="p room" d="M408 110 L436 110 L436 134 L408 134Z"/><circle cx="422" cy="150" r="7" class="p gold"/><circle cx="422" cy="168" r="7" class="p gold"/><path class="p room" d="M442 110 L470 110 L470 134 L442 134Z"/><circle cx="456" cy="150" r="7" class="p gold"/><path class="p room" d="M476 110 L504 110 L504 134 L476 134Z"/><circle cx="490" cy="150" r="7" class="p gold"/><circle cx="490" cy="168" r="7" class="p gold"/><path class="p room" d="M510 110 L538 110 L538 134 L510 134Z"/><circle cx="524" cy="150" r="7" class="p gold"/><path class="p room" d="M544 110 L572 110 L572 134 L544 134Z"/><circle cx="558" cy="150" r="7" class="p gold"/><circle cx="558" cy="168" r="7" class="p gold"/><path class="p room" d="M578 110 L606 110 L606 134 L578 134Z"/><circle cx="592" cy="150" r="7" class="p gold"/><circle cx="592" cy="168" r="7" class="p gold"/><text x="30" y="340" class="s">One crafted request full of colliding keys made servers walk one long list over and over</text><text x="30" y="360" class="s">(28C3, 2011). SipHash with a secret per-process key makes such keys impossible to choose.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

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
  64-bit tag is a low bar: $2^s$ blind guesses succeed with probability
  $2^{s-64}$. It has no RFC or NIST standard either, so protocols don't
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
and, with $c = 1$ and $d = 3$, the 64 in Rust's SipHash-1-3 tests. Those files
store outputs as little-endian bytes, so the first value shows up there
as `e5 45 be 49 61 ca 29 a1`.

## Security notes

- The key must be secret and random, read from the OS at startup. A fixed
  or leaked key brings flooding straight back.
- A hash table leaks a little through timing, such as which inputs share a
  bucket. SipHash is built so that even full outputs don't help an
  attacker, so those leaks don't matter.
- Key search costs $2^{128}$; the 64-bit output is the real limit.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: SipHash-2-4's reference vector, recomputed"

    The SipHash paper's reference example: key `00 01 … 0f`, message `00 01 … 0e` (15 bytes). Recomputed with
    a short Python version of the algorithm, matching the paper:

    | Step | Value |
    |---|---|
    | $v_0 = k_0 \oplus \text{"somepseu"}$, $v_1 = k_1 \oplus \text{"dorandom"}$, $v_2 = k_0 \oplus \text{"lygenera"}$, $v_3 = k_1 \oplus \text{"tedbytes"}$ | four 64-bit words |
    | Block 1: bytes `00…07` as a little-endian word | 2 SipRounds |
    | Last block: bytes `08…0e` plus the length 15 in the top byte | 2 SipRounds |
    | Finalize: $v_2 \mathrel{\oplus}= \mathtt{ff}$, then 4 SipRounds | |
    | Output $v_0 \oplus v_1 \oplus v_2 \oplus v_3$ | `a129ca6149be45e5` |

    In a hash table, the bucket is this 64-bit value mod the table size. Without the key, an attacker cannot
    choose inputs that all land in one bucket.

??? abstract "The math, with formulas"

    **One SipRound** (all 64-bit, $\lll$ is rotate left, $+$ is addition $\bmod 2^{64}$):

    $$
    \begin{aligned}
    v_0 &\leftarrow v_0 + v_1, & v_1 &\leftarrow (v_1 \lll 13) \oplus v_0, & v_0 &\leftarrow v_0 \lll 32 \\
    v_2 &\leftarrow v_2 + v_3, & v_3 &\leftarrow (v_3 \lll 16) \oplus v_2 \\
    v_0 &\leftarrow v_0 + v_3, & v_3 &\leftarrow (v_3 \lll 21) \oplus v_0 \\
    v_2 &\leftarrow v_2 + v_1, & v_1 &\leftarrow (v_1 \lll 17) \oplus v_2, & v_2 &\leftarrow v_2 \lll 32
    \end{aligned}
    $$

    **SipHash-c-d:** for each 8-byte word $m$: $v_3 \mathrel{\oplus}= m$, $c$ SipRounds, $v_0 \mathrel{\oplus}= m$. Then $v_2 \mathrel{\oplus}= \mathtt{0xff}$, $d$
    SipRounds, output $v_0 \oplus v_1 \oplus v_2 \oplus v_3$. SipHash-2-4 is the standard; SipHash-1-3 is the faster variant
    Rust and Python use for hash tables.

    **Why it exists: hash flooding.** With a fixed, public hash function an attacker sends many keys that
    collide, turning each table lookup from $O(1)$ into $O(n)$; $n$ inserts cost $O(n^2)$. In 2011 a few
    hundred kilobytes of crafted form data kept a web server's CPU busy for minutes. A keyed PRF with a
    random per-process key makes collisions unpredictable.

    **Security target:** a 64-bit tag, so up to $2^{64}$ work to forge; enough for hash tables and short-lived
    checks, too short for long-term message authentication.

??? tip "Watch it step by step: hashing a short key"

    <div class="mars-steps" markdown>

    1. Mix the 128-bit secret key into four 64-bit words, each XORed with a constant ("somepseudorandomlygeneratedbytes").
    2. Read the message 8 bytes at a time. XOR each word into $v_3$.
    3. Run 2 SipRounds (add, rotate, XOR), then XOR the word into $v_0$.
    4. The last word carries the leftover bytes and the message length in its top byte.
    5. Flip $v_2$ with `0xff` and run 4 more SipRounds.
    6. XOR the four words together: `a129ca6149be45e5`. Mod the table size, that picks the bucket.

    </div>

??? info "The math underneath"

    - **ARX design** (add, rotate, XOR), as in [ChaCha](../04-symmetric-ciphers/ChaCha.md).
    - **Pseudorandom functions** versus plain hash functions: a secret key makes outputs unpredictable.
    - **Hash tables** and algorithmic complexity attacks (Crosby and Wallach, 2003).
    - **The birthday bound** for 64-bit outputs.
    - Compare [HMAC](HMAC.md) and [Universal-hash MACs](Universal-Hash-MACs.md).

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
