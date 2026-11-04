# ChaCha and Salsa20

*Bernstein's stream ciphers: 20 rounds of add, rotate and XOR turn a key, a
nonce and a counter into keystream. Fast in plain software, with no tables
to leak timing.*

**Status and standards:** see [Symmetric ciphers](../algorithms/table.md#4-symmetric-ciphers)
in the main table.

## What it is

Daniel J. Bernstein designed Salsa20 in 2005 for eSTREAM, the EU stream
cipher project, and its 12-round version, Salsa20/12, is in the final
eSTREAM portfolio (2008). ChaCha (2008) is a variant that mixes more per
round at the same cost. RFC 8439 (2018, replacing RFC 7539 from 2015)
defines the IETF version of ChaCha20. Protocols use it inside
[ChaCha20-Poly1305](../05-modes-aead/AEAD.md), since bare ChaCha20 only
encrypts.

## The story

- **Who made it:** Daniel J. Bernstein: Salsa20 in 2005 for the EU's eSTREAM project, ChaCha in 2008.
- **What for:** A fast cipher in plain software, with nothing that leaks timing.
- **What it solved:** AES is fast with hardware support and slow, or leaky, without it. Phones of 2013 often had no AES instructions, so Google's Adam Langley moved Chrome and Android to ChaCha20-Poly1305 in TLS that year. It also became the replacement for RC4 in OpenBSD (2014) and the Linux random generator (2016).
- **Where it stands:** Recommended, in TLS 1.3, SSH, WireGuard and QUIC.
- **Incidents:** The best attacks reach only 7 of ChaCha20's 20 rounds. Real failures come from reusing a nonce with the same key, which gives away the XOR of two messages, a problem of how it is used, not the cipher.

## How it works

The state is a $4 \times 4$ grid of 32-bit words: four constants ("expand 32-byte k"
in ASCII), eight key words, and four words of counter and nonce. The
quarter-round mixes four of them:

$$
\begin{aligned}
a &\leftarrow a + b, & d &\leftarrow (d \oplus a) \lll 16 \\
c &\leftarrow c + d, & b &\leftarrow (b \oplus c) \lll 12 \\
a &\leftarrow a + b, & d &\leftarrow (d \oplus a) \lll 8 \\
c &\leftarrow c + d, & b &\leftarrow (b \oplus c) \lll 7
\end{aligned}
$$

Rounds alternate between the four columns and the four diagonals, 20 rounds
in all. Then the input is added back, so the rounds can't be run backwards
to the key. The result is a 64-byte keystream block. The counter goes up by
one per block, and the ciphertext is the plaintext XOR the keystream.

Salsa20 is the same idea, but its quarter-round touches each word once
(rotations 7, 9, 13, 18). ChaCha updates each word twice for the same number
of operations, so changes spread faster.

| Version | Key | Nonce | Counter | Data per nonce |
|---|---|---|---|---|
| Salsa20, original ChaCha | 256-bit | 64-bit | 64-bit | $2^{70}$ bytes |
| ChaCha20, RFC 8439 | 256-bit | 96-bit | 32-bit | 256 GB |
| XChaCha20 | 256-bit | 192-bit | 32-bit | 256 GB |

**XChaCha20** stretches the nonce so random nonces are safe: $2^{80}$ messages
before a $2^{-32}$ chance of a repeat. HChaCha20 hashes the key and the first 16
nonce bytes into a new key, and ChaCha20 runs under it with the last 8
bytes. Its CFRG draft expired in 2020 and is marked dead, so there is no
RFC, but libsodium, WireGuard, Tink and Go's x/crypto ship it. NaCl's
secretbox uses XSalsa20, the same trick on Salsa20.

## Why it is fast without AES hardware

- Only 32-bit adds, XORs and fixed rotations: cheap on any CPU, and no
  lookup tables, so no key-dependent timing. Table-based AES in software
  leaks through the cache.
- The quarter-rounds in a round are independent, and so are the blocks, so
  SIMD units (SSE, AVX2, NEON) run several at once.
- RFC 8439 quotes 2014 numbers: on a phone chip (OMAP 4460) ChaCha20-Poly1305
  did 75.3 MB/s and AES-128-GCM 24.1 MB/s. With AES-NI on a Sandy Bridge
  Xeon, AES-GCM won, 900 to 500 MB/s.

## The Linux kernel RNG

Since Linux 4.8 (2016), `/dev/urandom` and `getrandom()` output comes from
ChaCha20. In today's `drivers/char/random.c`, entropy is hashed into an
input pool with BLAKE2s (SHA-1 before Linux 5.17), and the hash becomes the
ChaCha20 key. Each CPU has its own generator, reseeded about once a minute.
Every request first runs one block and overwrites the key with its first 32
bytes ("fast key erasure"), so reading the state later can't recover
earlier output. OpenBSD's `arc4random` moved from [RC4](Retired.md#rc4) to
ChaCha20 in OpenBSD 5.5 (2014).

## When to use it

- **Through an AEAD:** ChaCha20-Poly1305, or XChaCha20-Poly1305 for random
  nonces. See [AEAD](../05-modes-aead/AEAD.md).
- **On CPUs without AES instructions,** such as older phones and small ARM
  chips. It is fine everywhere else too.
- **Salsa20 only** to stay compatible with NaCl-era code.

## Example (Python)

The RFC 8439 block function, checked against the test vector in section
2.3.2, then used as a stream cipher. A teaching copy: slow, and Python makes
no timing promises.

```python
import struct

M = 0xffffffff

def rotl(x, n):
    return (x << n | x >> (32 - n)) & M

def qr(s, a, b, c, d):                    # the quarter-round, RFC 8439 section 2.1
    s[a] = (s[a] + s[b]) & M; s[d] = rotl(s[d] ^ s[a], 16)
    s[c] = (s[c] + s[d]) & M; s[b] = rotl(s[b] ^ s[c], 12)
    s[a] = (s[a] + s[b]) & M; s[d] = rotl(s[d] ^ s[a], 8)
    s[c] = (s[c] + s[d]) & M; s[b] = rotl(s[b] ^ s[c], 7)

def block(key, counter, nonce):           # 32-byte key, 12-byte nonce -> 64 bytes
    init = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]
    init += [*struct.unpack("<8I", key), counter, *struct.unpack("<3I", nonce)]
    s = init[:]
    for _ in range(10):                   # 10 double rounds = 20 rounds
        qr(s, 0, 4, 8, 12); qr(s, 1, 5, 9, 13); qr(s, 2, 6, 10, 14); qr(s, 3, 7, 11, 15)
        qr(s, 0, 5, 10, 15); qr(s, 1, 6, 11, 12); qr(s, 2, 7, 8, 13); qr(s, 3, 4, 9, 14)
    return struct.pack("<16I", *[(x + y) & M for x, y in zip(s, init)])

def chacha20(key, counter, nonce, data):  # encrypting and decrypting are the same
    out = bytearray()
    for i in range(0, len(data), 64):
        ks = block(key, counter + i // 64, nonce)
        out += bytes(a ^ b for a, b in zip(data[i:i + 64], ks))
    return bytes(out)

key = bytes(range(32))                    # RFC 8439 section 2.3.2 test vector
nonce = bytes.fromhex("000000090000004a00000000")
want = ("10f1e7e4d13b5915500fdd1fa32071c4c7d1f4c733c068030422aa9ac3d46c4e"
        "d2826446079faa0914c2d705d98b02a2b5129cd1de164eb9cbd083e8a2503c4e")
print(block(key, 1, nonce).hex() == want)          # True

ct = chacha20(key, 1, nonce, b"see you at noon")
print(ct.hex())                                    # 639482c4a8542c35317bfd71cc4f1f
print(chacha20(key, 1, nonce, ct))                 # b'see you at noon'
```

## Security notes

- **Never reuse a nonce with the same key.** The keystream repeats, and
  XORing two ciphertexts gives the XOR of the plaintexts.
- Random 96-bit nonces are good for about $2^{32}$ messages per key; beyond that
  use a counter or XChaCha20. One nonce covers at most 256 GB in the RFC
  version.
- Alone it is malleable: flip a ciphertext bit and the same plaintext bit
  flips. Always add Poly1305 or another MAC.
- The original (64-bit nonce) and IETF (96-bit nonce) versions give
  different keystreams. Check which one a library means.
- No attack comes near 20 rounds. Bernstein's list of published attacks
  reaches 7 rounds of ChaCha, at about $2^{142}$ operations for the best one
  (2026), and 8 rounds of Salsa20.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: one quarter round, from RFC 8439"

    RFC 8439 §2.1.1 tests the quarter round on four 32-bit words. Each line was recomputed here with Python
    and matches the RFC:

    | Step | Operation | Result |
    |---|---|---|
    | Start | | `a = 11111111`, `b = 01020304`, `c = 9b8d6f43`, `d = 01234567` |
    | 1 | $a \leftarrow a + b,\ d \leftarrow (d \oplus a) \lll 16$ | `a = 12131415`, `d = 51721330` |
    | 2 | $c \leftarrow c + d,\ b \leftarrow (b \oplus c) \lll 12$ | `c = ecff8273`, `b = d8177edf` |
    | 3 | $a \leftarrow a + b,\ d \leftarrow (d \oplus a) \lll 8$ | `a = ea2a92f4`, `d = 5881c4bb` |
    | 4 | $c \leftarrow c + d,\ b \leftarrow (b \oplus c) \lll 7$ | `c = 4581472e`, `b = cb1cf8ce` |

    All numbers are hex; $+$ is addition $\bmod 2^{32}$, $\lll$ is rotate left. ChaCha20 runs 80 of these
    (20 rounds of 4) on its 16-word state.

??? abstract "The math, with formulas"

    **The state** is a $4 \times 4$ grid of 32-bit words (the first row holds the constants):

    $$
    \begin{bmatrix}
    \text{"expa"} & \text{"nd 3"} & \text{"2-by"} & \text{"te k"} \\
    \mathit{key}_0 & \mathit{key}_1 & \mathit{key}_2 & \mathit{key}_3 \\
    \mathit{key}_4 & \mathit{key}_5 & \mathit{key}_6 & \mathit{key}_7 \\
    \mathit{counter} & \mathit{nonce}_0 & \mathit{nonce}_1 & \mathit{nonce}_2
    \end{bmatrix}
    $$

    **A double round** is four quarter rounds down the columns, then four along the diagonals. ChaCha20 does
    10 double rounds, then adds the original state word by word. The 64-byte result is the keystream block
    for that counter value; encryption is $\mathit{ciphertext} = \mathit{plaintext} \oplus \mathit{keystream}$.

    **ARX.** Only Addition $\bmod 2^{32}$, Rotation and XOR: addition mixes bits non-linearly through the carries,
    XOR and rotation spread them. No table lookups, so no cache-timing leaks, and every step runs in a fixed
    time on any CPU.

    **The final addition** makes the block function hard to invert: without it, the 20 rounds could be run
    backwards from the output to the key.

    **XChaCha20** first runs HChaCha20 (the rounds without the final addition) on the key and 16 nonce bytes
    to get a subkey, then ChaCha20 with the remaining 8 nonce bytes: a 24-byte nonce that can be random.

??? tip "Watch it step by step: the quarter round"

    <div class="mars-steps" markdown>

    1. Start with `a = 11111111`, `b = 01020304`, `c = 9b8d6f43`, `d = 01234567`.
    2. Add $b$ into $a$, XOR $a$ into $d$, rotate $d$ by 16: `a = 12131415`, `d = 51721330`.
    3. Add $d$ into $c$, XOR $c$ into $b$, rotate $b$ by 12: `c = ecff8273`, `b = d8177edf`.
    4. Add $b$ into $a$, XOR $a$ into $d$, rotate $d$ by 8: `a = ea2a92f4`, `d = 5881c4bb`.
    5. Add $d$ into $c$, XOR $c$ into $b$, rotate $b$ by 7: `c = 4581472e`, `b = cb1cf8ce`.
    6. One bit changed in the input would now have spread to about half the bits of all four words.

    </div>

??? info "The math underneath"

    - **Modular addition, XOR and rotation** on 32-bit words, and why mixing them is non-linear.
    - **Stream ciphers:** a keystream XORed with the data; never reuse a key and nonce (see [AEAD](../05-modes-aead/AEAD.md)).
    - **Differential cryptanalysis of ARX:** the best attacks reach 7 of ChaCha's 20 rounds.
    - **Poly1305**, the MAC it is paired with: polynomial evaluation $\bmod 2^{130} - 5$; see
      [Universal-hash MACs](../06-mac/Universal-Hash-MACs.md).
    - **Salsa20** (2005), its predecessor, which mixes columns and rows instead of columns and diagonals.

## See also

- [ChaCha20-Poly1305](../05-modes-aead/AEAD.md): the AEAD built on it
- [AES](AES.md): the block cipher it competes with
- [Retired ciphers](Retired.md#rc4): RC4, the stream cipher it replaced

## References

- [Bernstein, "ChaCha, a variant of Salsa20" (2008)](https://cr.yp.to/chacha/chacha-20080128.pdf)
- [Bernstein, "The Salsa20 family of stream ciphers" (2007)](https://cr.yp.to/snuffle/salsafamily-20071225.pdf) / [Salsa20 page with the list of attacks](https://cr.yp.to/snuffle.html)
- [eSTREAM portfolio (archived)](https://web.archive.org/web/2012/http://www.ecrypt.eu.org/stream/)
- [RFC 8439: ChaCha20 and Poly1305 for IETF Protocols](https://www.rfc-editor.org/rfc/rfc8439) (Sections 2.1–2.4, Appendix B) / [RFC 7539](https://www.rfc-editor.org/rfc/rfc7539)
- [draft-irtf-cfrg-xchacha-03: XChaCha](https://datatracker.ietf.org/doc/draft-irtf-cfrg-xchacha/)
- [Linux `drivers/char/random.c`](https://github.com/torvalds/linux/blob/master/drivers/char/random.c) / [ChaCha20 CRNG commit (Linux 4.8)](https://github.com/torvalds/linux/commit/e192be9d9a30555aae2ca1dc3aad37cba484cd4a) / [BLAKE2s commit (Linux 5.17)](https://github.com/torvalds/linux/commit/9f9eff85a008b095eafc5f4ecbaf5aca689271c1)
- [OpenBSD 5.5 release notes](https://www.openbsd.org/55.html)
