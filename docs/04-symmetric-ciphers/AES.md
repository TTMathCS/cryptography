# AES (Advanced Encryption Standard)

*The standard symmetric cipher: one shared key encrypts and decrypts, fast enough
for bulk data. The default for "encrypt this."*

## What it is

AES is a symmetric block cipher, standardized by NIST in 2001 (originally the
Rijndael design by Joan Daemen and Vincent Rijmen). Both sides use the *same*
secret key, which is what makes it fast — but it leaves open the question of how
they got that shared key, usually answered by a key exchange like
[X25519](../01-key-exchange/ECDH.md). It replaced the old DES and is now everywhere: TLS, disk
encryption, VPNs.

It works on fixed 128-bit blocks with a 128-, 192-, or 256-bit key (10, 12, or 14
rounds respectively).

A wider AES may follow. Rijndael was designed with larger blocks too, and in
December 2024 NIST proposed standardizing Rijndael-256: 256-bit blocks with a
single 256-bit key, for systems that encrypt very large amounts of data under
one key. NIST planned to write a draft standard and took comments until 25 June
2025. In June 2026 it asked for feedback on wGCM, a version of GCM for the wider
block (see [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md)). Neither is a
standard yet.

## The story

- **Who made it:** Joan Daemen and Vincent Rijmen, two Belgian cryptographers, under the name Rijndael. NIST ran an open contest from January 1997: 15 designs from 12 countries, five finalists (MARS, RC6, Rijndael, Serpent, Twofish), and Rijndael won on 2 October 2000. FIPS 197 followed in November 2001.
- **What for:** A replacement for DES that the whole world could check and use free.
- **What it solved:** DES's 56-bit key could be searched (the EFF's Deep Crack did it in 56 hours in 1998). AES has 128 to 256-bit keys, a 128-bit block and runs well on everything from 8-bit cards to servers. Because it came from an open contest, people trusted it in a way they never fully trusted DES.
- **Where it stands:** Recommended. The NSA approved it for TOP SECRET in 2003, and most CPUs since about 2010 have AES instructions. 25 years of attacks have taken off only about 2 bits (the biclique attack of 2011, $2^{126}$ for AES-128).
- **Incidents:** No break of the cipher; the trouble has been in implementations. **Cache timing (2005):** Bernstein recovered an AES key across a network from OpenSSL's table lookups, and Osvik, Shamir and Tromer did it from another process on the same machine. This is why constant-time code and AES hardware instructions matter.

## How it works

AES arranges each 16-byte block as a $4 \times 4$ byte matrix (the *state*) and runs it
through several rounds of four steps:

- **SubBytes** — replace each byte using a fixed lookup table (the S-box). Adds
  non-linearity.
- **ShiftRows** — rotate the rows by 0, 1, 2, 3 bytes. Spreads bytes across columns.
- **MixColumns** — mix each column with a matrix multiply in $\mathrm{GF}(2^8)$. Spreads
  within columns.
- **AddRoundKey** — XOR in a round key derived from the main key.

Together these give *confusion and diffusion*: one input bit flips changes the
whole block. Decryption runs the inverse steps with the round keys in reverse.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 365" role="img" aria-labelledby="sk-c-shiftrows-t"><title id="sk-c-shiftrows-t">The AES state as a four by four grid of bytes before and after ShiftRows: row 0 stays, rows 1, 2 and 3 rotate left by 1, 2 and 3 places</title><defs><filter id="sk-c-shiftrows-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-shiftrows-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-shiftrows-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-shiftrows-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-shiftrows-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="365" filter="url(#sk-c-shiftrows-paper)"/><g filter="url(#sk-c-shiftrows-pen)"><text x="30" y="44" class="h">One AES round on the 4 × 4 state</text><path class="p room" d="M40 90 L84 90 L84 134 L40 134Z"/><text x="62.0" y="117.0" text-anchor="middle" class="s">a0</text><path class="p room" d="M84 90 L128 90 L128 134 L84 134Z"/><text x="106.0" y="117.0" text-anchor="middle" class="s">a1</text><path class="p room" d="M128 90 L172 90 L172 134 L128 134Z"/><text x="150.0" y="117.0" text-anchor="middle" class="s">a2</text><path class="p room" d="M172 90 L216 90 L216 134 L172 134Z"/><text x="194.0" y="117.0" text-anchor="middle" class="s">a3</text><path class="p room" d="M40 134 L84 134 L84 178 L40 178Z"/><text x="62.0" y="161.0" text-anchor="middle" class="s">b0</text><path class="p room" d="M84 134 L128 134 L128 178 L84 178Z"/><text x="106.0" y="161.0" text-anchor="middle" class="s">b1</text><path class="p room" d="M128 134 L172 134 L172 178 L128 178Z"/><text x="150.0" y="161.0" text-anchor="middle" class="s">b2</text><path class="p room" d="M172 134 L216 134 L216 178 L172 178Z"/><text x="194.0" y="161.0" text-anchor="middle" class="s">b3</text><path class="p room" d="M40 178 L84 178 L84 222 L40 222Z"/><text x="62.0" y="205.0" text-anchor="middle" class="s">c0</text><path class="p room" d="M84 178 L128 178 L128 222 L84 222Z"/><text x="106.0" y="205.0" text-anchor="middle" class="s">c1</text><path class="p room" d="M128 178 L172 178 L172 222 L128 222Z"/><text x="150.0" y="205.0" text-anchor="middle" class="s">c2</text><path class="p room" d="M172 178 L216 178 L216 222 L172 222Z"/><text x="194.0" y="205.0" text-anchor="middle" class="s">c3</text><path class="p room" d="M40 222 L84 222 L84 266 L40 266Z"/><text x="62.0" y="249.0" text-anchor="middle" class="s">d0</text><path class="p room" d="M84 222 L128 222 L128 266 L84 266Z"/><text x="106.0" y="249.0" text-anchor="middle" class="s">d1</text><path class="p room" d="M128 222 L172 222 L172 266 L128 266Z"/><text x="150.0" y="249.0" text-anchor="middle" class="s">d2</text><path class="p room" d="M172 222 L216 222 L216 266 L172 266Z"/><text x="194.0" y="249.0" text-anchor="middle" class="s">d3</text><path class="p room" d="M330 90 L374 90 L374 134 L330 134Z"/><text x="352.0" y="117.0" text-anchor="middle" class="s">a0</text><path class="p room" d="M374 90 L418 90 L418 134 L374 134Z"/><text x="396.0" y="117.0" text-anchor="middle" class="s">a1</text><path class="p room" d="M418 90 L462 90 L462 134 L418 134Z"/><text x="440.0" y="117.0" text-anchor="middle" class="s">a2</text><path class="p room" d="M462 90 L506 90 L506 134 L462 134Z"/><text x="484.0" y="117.0" text-anchor="middle" class="s">a3</text><path class="p gold" d="M330 134 L374 134 L374 178 L330 178Z"/><text x="352.0" y="161.0" text-anchor="middle" class="s">b1</text><path class="p gold" d="M374 134 L418 134 L418 178 L374 178Z"/><text x="396.0" y="161.0" text-anchor="middle" class="s">b2</text><path class="p gold" d="M418 134 L462 134 L462 178 L418 178Z"/><text x="440.0" y="161.0" text-anchor="middle" class="s">b3</text><path class="p gold" d="M462 134 L506 134 L506 178 L462 178Z"/><text x="484.0" y="161.0" text-anchor="middle" class="s">b0</text><path class="p gold" d="M330 178 L374 178 L374 222 L330 222Z"/><text x="352.0" y="205.0" text-anchor="middle" class="s">c2</text><path class="p gold" d="M374 178 L418 178 L418 222 L374 222Z"/><text x="396.0" y="205.0" text-anchor="middle" class="s">c3</text><path class="p gold" d="M418 178 L462 178 L462 222 L418 222Z"/><text x="440.0" y="205.0" text-anchor="middle" class="s">c0</text><path class="p gold" d="M462 178 L506 178 L506 222 L462 222Z"/><text x="484.0" y="205.0" text-anchor="middle" class="s">c1</text><path class="p gold" d="M330 222 L374 222 L374 266 L330 266Z"/><text x="352.0" y="249.0" text-anchor="middle" class="s">d3</text><path class="p gold" d="M374 222 L418 222 L418 266 L374 266Z"/><text x="396.0" y="249.0" text-anchor="middle" class="s">d0</text><path class="p gold" d="M418 222 L462 222 L462 266 L418 266Z"/><text x="440.0" y="249.0" text-anchor="middle" class="s">d1</text><path class="p gold" d="M462 222 L506 222 L506 266 L462 266Z"/><text x="484.0" y="249.0" text-anchor="middle" class="s">d2</text><path class="p " d="M222 178 L318 178" marker-end="url(#sk-c-shiftrows-ah)"/><text x="270" y="166" text-anchor="middle" class="s">ShiftRows</text><text x="520" y="117" class="s">row 0: 0 left</text><text x="520" y="161" class="s">row 1: 1 left</text><text x="520" y="205" class="s">row 2: 2 left</text><text x="520" y="249" class="s">row 3: 3 left</text><text x="40" y="300" class="s">Each round: SubBytes (swap each byte by a table) → ShiftRows (above) → MixColumns</text><text x="40" y="320" class="s">(blend each column) → AddRoundKey (XOR a round key). 10, 12 or 14 rounds.</text><text x="40" y="350" class="s">After two rounds every output byte depends on every input byte.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## When to use it

- **Default symmetric cipher**, especially where the CPU has AES hardware
  instructions (almost all modern servers and laptops).
- On hardware without that acceleration, [ChaCha20-Poly1305](../05-modes-aead/AEAD.md)
  is the faster, equally safe alternative.
- **Use an authenticated mode (AES-GCM).** A raw block cipher only encrypts one
  block; the mode is what turns it into safe encryption for real messages.

## Modes of operation

| Mode | Notes |
|------|-------|
| **GCM** | Authenticated (AEAD) — encrypts *and* detects tampering. The right default. |
| **CTR** | Turns AES into a stream cipher, parallelizable, but no built-in authentication. |
| **CBC** | Chains blocks with an IV; needs separate authentication and padding. Legacy. |
| **ECB** | Never use. Identical plaintext blocks produce identical ciphertext, leaking patterns. |

## Example (Python)

From-scratch AES means shipping the full S-box and round logic, so the concise
*and* correct approach is a vetted library, here PyCA `cryptography`
(`pip install cryptography`):

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key = AESGCM.generate_key(bit_length=256)   # AES-256
aead = AESGCM(key)

nonce = os.urandom(12)                       # 96-bit, unique per message
header = b"v1|msg-42"                        # associated data: authenticated, not encrypted
ct = aead.encrypt(nonce, b"secret data", header)
pt = aead.decrypt(nonce, ct, header)         # raises if tampered
```

## Security notes

- **Never reuse a nonce/IV with the same key** — with GCM and CTR this is
  catastrophic, exposing plaintext and breaking authentication.
- Prefer AES-256, and always pick an authenticated mode (GCM), not ECB/CBC alone.
- Side-channel safety matters: use the library's hardware-backed, constant-time
  implementation rather than rolling your own.
- AES-256 stays strong even against quantum computers (Grover only halves it) —
  see [Will quantum break this](../FAQ.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: AES-128's first round, from FIPS 197"

    FIPS 197 Appendix B encrypts `3243f6a8885a308d313198a2e0370734` with key
    `2b7e151628aed2a6abf7158809cf4f3c`. Every value below was recomputed here with a small Python AES and
    matches the standard; the full result was checked with the `cryptography` library:

    | Step | State (16 bytes, column by column) |
    |---|---|
    | Input | `32 43 f6 a8 · 88 5a 30 8d · 31 31 98 a2 · e0 37 07 34` |
    | AddRoundKey (XOR with the key) | `19 3d e3 be · a0 f4 e2 2b · 9a c6 8d 2a · e9 f8 48 08` |
    | SubBytes (S-box on each byte) | `d4 27 11 ae · e0 bf 98 f1 · b8 b4 5d e5 · 1e 41 52 30` |
    | ShiftRows (row $r$ moves $r$ places left) | `d4 bf 5d 30 · e0 b4 52 ae · b8 41 11 f1 · 1e 27 98 e5` |
    | MixColumns (mix each column) | `04 66 81 e5 · e0 cb 19 9a · 48 f8 d3 7a · 28 06 26 4c` |
    | … 9 more rounds (the last without MixColumns) | |
    | Ciphertext | `39 25 84 1d · 02 dc 09 fb · dc 11 85 97 · 19 6a 0b 32` |

    The first output byte of MixColumns: $\mathtt{02} \cdot \mathtt{d4} \oplus \mathtt{03} \cdot \mathtt{bf} \oplus \mathtt{5d} \oplus \mathtt{30} = \mathtt{b3} \oplus \mathtt{da} \oplus \mathtt{5d} \oplus \mathtt{30} = \mathtt{04}$.

??? abstract "The math, with formulas"

    **Bytes are elements of $\mathrm{GF}(2^8)$**, polynomials of degree below 8 with bits as coefficients, multiplied
    modulo $x^8 + x^4 + x^3 + x + 1$ (`0x11b`). Adding is XOR. Multiplying by `02` is a shift left, then XOR with
    `1b` if a bit fell off: $\mathtt{02} \cdot \mathtt{d4} = \mathtt{1a8} \to \mathtt{a8} \oplus \mathtt{1b} = \mathtt{b3}$. FIPS 197's own example: $\mathtt{57} \cdot \mathtt{83} = \mathtt{c1}$.

    **SubBytes:** $S(a) = A \cdot a^{-1} \oplus \mathtt{63}$, the inverse in $\mathrm{GF}(2^8)$ ($0$ maps to $0$) followed by a fixed bit-matrix
    $A$. Example: $\mathtt{53}^{-1} = \mathtt{ca}$, and the affine step gives $S(\mathtt{53}) = \mathtt{ed}$. The inverse makes the S-box highly
    non-linear (no input/output correlation above $2^{-3}$, differential probability at most $2^{-6}$).

    **ShiftRows** moves row $r$ left by $r$ bytes; **MixColumns** multiplies each column by the matrix

    $$
    \begin{bmatrix}
    \mathtt{02} & \mathtt{03} & \mathtt{01} & \mathtt{01} \\
    \mathtt{01} & \mathtt{02} & \mathtt{03} & \mathtt{01} \\
    \mathtt{01} & \mathtt{01} & \mathtt{02} & \mathtt{03} \\
    \mathtt{03} & \mathtt{01} & \mathtt{01} & \mathtt{02}
    \end{bmatrix}
    $$

    Any change to one input byte changes all four output bytes (branch number 5). After two rounds every
    output byte depends on every input byte: the wide-trail design.

    **Key schedule:** each round key is 4 words; $w_i = w_{i-4} \oplus f(w_{i-1})$, where every 4th word goes through a
    rotate, the S-box and a round constant. 10, 12 or 14 rounds for 128, 192 or 256-bit keys.

??? tip "Watch it step by step: one round on one block"

    <div class="mars-steps" markdown>

    1. Start: the block `32 43 f6 a8 …` is written as a $4 \times 4$ grid of bytes, column by column.
    2. AddRoundKey: XOR with the key, giving `19 3d e3 be …`.
    3. SubBytes: replace each byte with its S-box value; `19` becomes `d4`, `3d` becomes `27`.
    4. ShiftRows: row 1 moves one place left, row 2 two, row 3 three. The first column becomes `d4 bf 5d 30`.
    5. MixColumns: each column is mixed in $\mathrm{GF}(2^8)$; `d4 bf 5d 30` becomes `04 66 81 e5`.
    6. AddRoundKey with round key 1, and the next round starts. After 10 rounds: `39 25 84 1d …`.

    </div>

??? info "The math underneath"

    - **Finite fields $\mathrm{GF}(2^8)$:** polynomial arithmetic over bits, irreducible polynomials, inverses.
    - **Linear algebra over $\mathrm{GF}(2)$ and $\mathrm{GF}(2^8)$:** the S-box's affine map and the MixColumns matrix (an MDS
      matrix, from coding theory).
    - **Substitution–permutation networks:** confusion from the S-box, diffusion from ShiftRows and
      MixColumns.
    - **Differential and linear cryptanalysis**, and the wide-trail strategy that bounds them.
    - **Best known attack:** biclique, about $2^{126.1}$ for AES-128, a factor of 4 from brute force; on a quantum
      computer Grover's search makes it about $2^{64}$, so AES-256 is the long-term choice.

## See also

- [ChaCha20-Poly1305](../05-modes-aead/AEAD.md) — the software-speed alternative
- [Classic modes](../05-modes-aead/Classic-Modes.md) / [Disk encryption](../05-modes-aead/Disk-Encryption.md) / [Key wrap](../05-modes-aead/Key-Wrap.md) — ECB to CTR, XTS-AES and AES Key Wrap in detail
- [Retired ciphers](Retired.md) / [National ciphers](National-Ciphers.md) — DES and 3DES before AES, and the national ciphers used beside it
- [X25519](../01-key-exchange/ECDH.md) / [HKDF](../08-kdf-password-hashing/HKDF.md) — how both sides get the shared key
- [Cryptography FAQ](../FAQ.md) — symmetric vs. asymmetric

## References

- [FIPS 197: Advanced Encryption Standard (AES)](https://csrc.nist.gov/pubs/fips/197/final) (2001, updated 2023)
- NIST SP 800-38A / 800-38D: Block Cipher Modes (CBC/CTR, GCM)
- [NIST, "NIST Proposes to Standardize a Wider Variant of AES" (24 December 2024)](https://csrc.nist.gov/News/2024/nist-proposes-to-standardize-wider-variant-of-aes)
