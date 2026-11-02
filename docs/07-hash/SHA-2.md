# SHA-2 (SHA-256, SHA-384, SHA-512)

*The everyday hash: any input in, a fixed-size fingerprint out. One-way, and a
different fingerprint for any change to the input.*

**Status and standards:** see [Hash functions](../index.md#7-hash-functions) in
the main table.

## What it is

A cryptographic hash maps data of any length to a fixed-size digest, with no
key. A good one is:

- **One-way:** you can't get the input back from the digest.
- **Collision-resistant:** you can't find two inputs with the same digest.
- **Avalanche:** flipping one input bit changes about half the output bits.

SHA-2 was designed by the NSA and published by NIST in 2001. It is what
certificates, TLS, SSH, Git's SHA-256 mode and Bitcoin all lean on.

The standard that defines it, FIPS 180-4, is due for a rewrite. In 2023 NIST
decided to revise it: take SHA-1 out, fold in the hash guidance from SP
800-107, tidy the text and update the references. SHA-2 itself stays as it
is. Work on the draft had not started when NIST announced the decision.
Separately, the October 2024 draft of SP 800-131A Rev. 3 proposes a schedule
for retiring the 224-bit hashes, SHA-224 among them, as NIST moves from 112-bit
to 128-bit security; it is still a draft.

| Variant | Digest | Block | Notes |
|---|---|---|---|
| SHA-256 | 256-bit | 512-bit | the default almost everywhere |
| SHA-384 | 384-bit | 1024-bit | SHA-512 cut short; TLS `AES_256_GCM_SHA384` |
| SHA-512 | 512-bit | 1024-bit | faster than SHA-256 on 64-bit CPUs |
| SHA-224, SHA-512/256 | 224 / 256-bit | — | truncated variants; 512/256 resists length extension |

SHA-1 (160-bit) came before it and is broken; see the main table.

## How it works

SHA-2 uses the Merkle–Damgård construction:

1. Pad the message so its length is a multiple of the block size, ending with
   the original length.
2. Start from a fixed initial state (eight 32-bit words for SHA-256).
3. Feed each block through a compression function that mixes it into the
   state: 64 rounds of add, rotate and XOR for SHA-256, 80 for SHA-512.
4. The final state is the digest.

The digest *is* the internal state, so anyone who knows `SHA-256(m)` and the
length of `m` can keep hashing from there and compute `SHA-256(m ‖ padding ‖ more)`
without knowing `m`. That is the **length-extension** weakness, and it is why
`SHA-256(key ‖ message)` is not a safe MAC.

## When to use it

- **Integrity and fingerprints:** download checksums, content addressing, the
  digest inside a signature.
- **A message with a shared secret:** don't hash `key ‖ message` yourself; use
  [HMAC](../06-mac/HMAC.md).
- **Passwords:** never plain SHA-2. Passwords need a slow, salted function such
  as [Argon2](../08-kdf-password-hashing/Argon2.md).

## Example (Python)

```python
import hashlib

digest = hashlib.sha256(b"hello world").hexdigest()
print(digest)   # b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9

# same result fed in pieces, for large files
h = hashlib.sha256()
h.update(b"hello ")
h.update(b"world")
print(h.hexdigest() == digest)   # True
```

## Security notes

- SHA-256 gives ~128-bit collision resistance and ~256-bit preimage resistance.
  A quantum computer (Grover) halves the preimage figure, which still leaves
  plenty.
- Length extension is real; use HMAC, SHA-512/256 or [SHA-3](SHA-3.md) when
  the digest of secret data is exposed.
- A hash proves *integrity*, not *origin*: anyone can recompute it. For origin
  you need a key ([HMAC](../06-mac/HMAC.md)) or a signature
  ([Ed25519](../02-signatures/EdDSA.md)).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: SHA-256 of \"abc\""

    The standard example from NIST's SHA-256 test. Recomputed with Python (`hashlib` and a hand-written first
    round):

    | Step | Value |
    |---|---|
    | Message "abc" | `61 62 63` (24 bits) |
    | Padding: a `1` bit, zeros, then the length as 64 bits | `61626380 00000000 … 00000000 00000018` (one 64-byte block) |
    | Start state `H₀ … H₇` (fractional parts of √2, √3, √5, … √19) | `6a09e667 bb67ae85 3c6ef372 a54ff53a 510e527f 9b05688c 1f83d9ab 5be0cd19` |
    | Round 0: `W₀ = 61626380`, `K₀ = 428a2f98` | `T₁ = 54da50e8`, `T₂ = 08909ae5` |
    | After round 0 | `a = T₁ + T₂ = 5d6aebcd`, `e = d + T₁ = fa2a4622` |
    | After 64 rounds, added to the start state | `ba7816bf 8f01cfea 414140de 5dae2223 b00361a3 96177a9c b410ff61 f20015ad` |

    Changing "abc" to "abd" gives `a52d159f 262b2c6d …`: about half the 256 bits flip.

??? abstract "The math, with formulas"

    **Merkle–Damgård.** Pad the message to a multiple of 512 bits; `H = IV`; for each block,
    `H = compress(H, block)`; output `H`. If the compression function resists collisions, so does the hash.

    **One SHA-256 round** (all 32-bit, `>>>` is rotate right):

    ```
    Σ₁(e) = (e >>> 6) ⊕ (e >>> 11) ⊕ (e >>> 25)      Ch(e,f,g)  = (e ∧ f) ⊕ (¬e ∧ g)
    Σ₀(a) = (a >>> 2) ⊕ (a >>> 13) ⊕ (a >>> 22)      Maj(a,b,c) = (a ∧ b) ⊕ (a ∧ c) ⊕ (b ∧ c)
    T₁ = h + Σ₁(e) + Ch(e,f,g) + Kₜ + Wₜ
    T₂ = Σ₀(a) + Maj(a,b,c)
    h = g, g = f, f = e, e = d + T₁, d = c, c = b, b = a, a = T₁ + T₂
    ```

    **Message schedule:** `W₀ … W₁₅` are the block's words; for `t ≥ 16`,
    `Wₜ = σ₁(Wₜ₋₂) + Wₜ₋₇ + σ₀(Wₜ₋₁₅) + Wₜ₋₁₆`, with `σ₀(x) = (x >>> 7) ⊕ (x >>> 18) ⊕ (x >> 3)` and
    `σ₁(x) = (x >>> 17) ⊕ (x >>> 19) ⊕ (x >> 10)`. The constants `Kₜ` are the fractional parts of the cube roots
    of the first 64 primes ("nothing up my sleeve").

    **Davies–Meyer feed-forward:** after 64 rounds the result is added to the incoming state, so the
    compression function cannot simply be run backwards.

    **Strength:** collisions need about 2¹²⁸ work (birthday bound), preimages 2²⁵⁶. SHA-512 uses 64-bit words,
    80 rounds and 1,024-bit blocks; SHA-512/256 truncates it, which also stops length extension.

??? tip "Watch it step by step: the first round of SHA-256(\"abc\")"

    <div class="mars-steps" markdown>

    1. Pad "abc" into one 64-byte block: `61626380`, zeros, and the length `00000018`.
    2. Load the eight start words: `a = 6a09e667`, …, `e = 510e527f`, …, `h = 5be0cd19`.
    3. Mix the right half: `T₁ = h + Σ₁(e) + Ch(e, f, g) + K₀ + W₀ = 54da50e8`.
    4. Mix the left half: `T₂ = Σ₀(a) + Maj(a, b, c) = 08909ae5`.
    5. Shift the words along; the new `a = T₁ + T₂ = 5d6aebcd`, the new `e = d + T₁ = fa2a4622`.
    6. 63 more rounds, then add the start words back: `ba7816bf…f20015ad`.

    </div>

??? info "The math underneath"

    - **Modular addition, rotation and Boolean functions** on 32 and 64-bit words.
    - **The Merkle–Damgård construction** and its proof; **length extension**, its weakness (see [HMAC](../06-mac/HMAC.md)).
    - **Davies–Meyer:** building a compression function from a block cipher.
    - **The birthday paradox:** collisions in `2^(n/2)`, not `2ⁿ`.
    - **Differential cryptanalysis of hashes:** what broke [MD5 and SHA-1](Retired.md), and why SHA-2's
      extra message expansion and rounds have held.

## See also

- [SHA-3](SHA-3.md): the backup design, built differently
- [HMAC](../06-mac/HMAC.md): keyed authentication on top of SHA-2
- [Retired hashes](Retired.md): SHA-1, MD5, MD4 and RIPEMD-160
- [Cryptography FAQ](../FAQ.md): encrypt vs. sign vs. hash

## References

- [FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) / [NIST, "Decision to Revise FIPS 180-4" (2023)](https://csrc.nist.gov/news/2023/decision-to-revise-fips-180-4)
- [NIST SP 800-131A Rev. 3, initial public draft (2024)](https://csrc.nist.gov/pubs/sp/800/131/a/r3/ipd)
- [RFC 6234: SHA-2 in C, with test vectors](https://www.rfc-editor.org/rfc/rfc6234)
