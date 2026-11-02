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

## How it works

AES arranges each 16-byte block as a 4×4 byte matrix (the *state*) and runs it
through several rounds of four steps:

- **SubBytes** — replace each byte using a fixed lookup table (the S-box). Adds
  non-linearity.
- **ShiftRows** — rotate the rows by 0, 1, 2, 3 bytes. Spreads bytes across columns.
- **MixColumns** — mix each column with a matrix multiply in GF(2⁸). Spreads
  within columns.
- **AddRoundKey** — XOR in a round key derived from the main key.

Together these give *confusion and diffusion*: one input bit flips changes the
whole block. Decryption runs the inverse steps with the round keys in reverse.

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
    | ShiftRows (row r moves r places left) | `d4 bf 5d 30 · e0 b4 52 ae · b8 41 11 f1 · 1e 27 98 e5` |
    | MixColumns (mix each column) | `04 66 81 e5 · e0 cb 19 9a · 48 f8 d3 7a · 28 06 26 4c` |
    | … 9 more rounds (the last without MixColumns) | |
    | Ciphertext | `39 25 84 1d · 02 dc 09 fb · dc 11 85 97 · 19 6a 0b 32` |

    The first output byte of MixColumns: `02·d4 ⊕ 03·bf ⊕ 5d ⊕ 30 = b3 ⊕ da ⊕ 5d ⊕ 30 = 04`.

??? abstract "The math, with formulas"

    **Bytes are elements of GF(2⁸)**, polynomials of degree below 8 with bits as coefficients, multiplied
    modulo `x⁸ + x⁴ + x³ + x + 1` (`0x11b`). Adding is XOR. Multiplying by `02` is a shift left, then XOR with
    `1b` if a bit fell off: `02·d4 = 1a8 → a8 ⊕ 1b = b3`. FIPS 197's own example: `57 · 83 = c1`.

    **SubBytes:** `S(a) = A·a⁻¹ ⊕ 63`, the inverse in GF(2⁸) (0 maps to 0) followed by a fixed bit-matrix
    `A`. Example: `53⁻¹ = ca`, and the affine step gives `S(53) = ed`. The inverse makes the S-box highly
    non-linear (no input/output correlation above 2⁻³, differential probability at most 2⁻⁶).

    **ShiftRows** moves row `r` left by `r` bytes; **MixColumns** multiplies each column by the matrix

    ```
    [02 03 01 01]
    [01 02 03 01]
    [01 01 02 03]
    [03 01 01 02]
    ```

    Any change to one input byte changes all four output bytes (branch number 5). After two rounds every
    output byte depends on every input byte: the wide-trail design.

    **Key schedule:** each round key is 4 words; `wᵢ = wᵢ₋₄ ⊕ f(wᵢ₋₁)`, where every 4th word goes through a
    rotate, the S-box and a round constant. 10, 12 or 14 rounds for 128, 192 or 256-bit keys.

??? tip "Watch it step by step: one round on one block"

    <div class="mars-steps" markdown>

    1. Start: the block `32 43 f6 a8 …` is written as a 4×4 grid of bytes, column by column.
    2. AddRoundKey: XOR with the key, giving `19 3d e3 be …`.
    3. SubBytes: replace each byte with its S-box value; `19` becomes `d4`, `3d` becomes `27`.
    4. ShiftRows: row 1 moves one place left, row 2 two, row 3 three. The first column becomes `d4 bf 5d 30`.
    5. MixColumns: each column is mixed in GF(2⁸); `d4 bf 5d 30` becomes `04 66 81 e5`.
    6. AddRoundKey with round key 1, and the next round starts. After 10 rounds: `39 25 84 1d …`.

    </div>

??? info "The math underneath"

    - **Finite fields GF(2⁸):** polynomial arithmetic over bits, irreducible polynomials, inverses.
    - **Linear algebra over GF(2) and GF(2⁸):** the S-box's affine map and the MixColumns matrix (an MDS
      matrix, from coding theory).
    - **Substitution–permutation networks:** confusion from the S-box, diffusion from ShiftRows and
      MixColumns.
    - **Differential and linear cryptanalysis**, and the wide-trail strategy that bounds them.
    - **Best known attack:** biclique, about 2¹²⁶·¹ for AES-128, a factor of 4 from brute force; on a quantum
      computer Grover's search makes it about 2⁶⁴, so AES-256 is the long-term choice.

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
