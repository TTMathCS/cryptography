# SHA-2 (SHA-256, SHA-384, SHA-512)

*The everyday hash: any input in, a fixed-size fingerprint out. One-way, and a
different fingerprint for any change to the input.*

**Status and standards:** see [Hash functions](../algorithms/table.md#7-hash-functions) in
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

## The story

- **Who made it:** The NSA; published by NIST in 2001 and finalized in FIPS 180-2 (2002). SHA-224 followed in 2004 and SHA-512/256 in 2012.
- **What for:** A family of hashes stronger than SHA-1, matched to AES key sizes.
- **What it solved:** SHA-1's 160 bits gave only 80-bit collision security, and its design was already being attacked. SHA-256 gives 128 bits.
- **Where it stands:** Recommended: in certificates, TLS, SSH, Bitcoin and Git's newer format. No break after 25 years.
- **Incidents:** Length extension still applies to plain SHA-256 (use HMAC), and it is why SHA-3 was wanted as a backup.

## How it works

SHA-2 uses the Merkle–Damgård construction:

1. Pad the message so its length is a multiple of the block size, ending with
   the original length.
2. Start from a fixed initial state (eight 32-bit words for SHA-256).
3. Feed each block through a compression function that mixes it into the
   state: 64 rounds of add, rotate and XOR for SHA-256, 80 for SHA-512.
4. The final state is the digest.

The digest *is* the internal state, so anyone who knows $\text{SHA-256}(m)$ and the
length of $m$ can keep hashing from there and compute $\text{SHA-256}(m \,\Vert\, \mathit{padding} \,\Vert\, \mathit{more})$
without knowing $m$. That is the **length-extension** weakness, and it is why
$\text{SHA-256}(\mathit{key} \,\Vert\, \mathit{message})$ is not a safe MAC.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 340" role="img" aria-labelledby="sk-c-mdchain-t"><title id="sk-c-mdchain-t">SHA-2 feeds blocks one after another through a compression function from a fixed start; the final state is the digest, so anyone can continue from it</title><defs><filter id="sk-c-mdchain-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-mdchain-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-mdchain-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-mdchain-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-mdchain-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="340" filter="url(#sk-c-mdchain-paper)"/><g filter="url(#sk-c-mdchain-pen)"><text x="30" y="44" class="h">The digest is the last state</text><path class="p gold" d="M20 150 L90 150 L90 190 L20 190Z"/><text x="55.0" y="176.0" text-anchor="middle" class="s">IV</text><path class="p room" d="M120 70 L210 70 L210 104 L120 104Z"/><text x="165.0" y="93.0" text-anchor="middle" class="s">block 1</text><path class="p " d="M165 106 L165 146" marker-end="url(#sk-c-mdchain-ah)"/><path class="p rust" d="M120 148 L210 148 L210 192 L120 192Z"/><text x="165.0" y="176.0" text-anchor="middle" class="s">compress</text><path class="p " d="M92 170 L118 170" marker-end="url(#sk-c-mdchain-ah)"/><path class="p room" d="M260 70 L350 70 L350 104 L260 104Z"/><text x="305.0" y="93.0" text-anchor="middle" class="s">block 2</text><path class="p " d="M305 106 L305 146" marker-end="url(#sk-c-mdchain-ah)"/><path class="p rust" d="M260 148 L350 148 L350 192 L260 192Z"/><text x="305.0" y="176.0" text-anchor="middle" class="s">compress</text><path class="p " d="M232 170 L258 170" marker-end="url(#sk-c-mdchain-ah)"/><path class="p room" d="M400 70 L490 70 L490 104 L400 104Z"/><text x="445.0" y="93.0" text-anchor="middle" class="s">padding</text><path class="p " d="M445 106 L445 146" marker-end="url(#sk-c-mdchain-ah)"/><path class="p rust" d="M400 148 L490 148 L490 192 L400 192Z"/><text x="445.0" y="176.0" text-anchor="middle" class="s">compress</text><path class="p " d="M372 170 L398 170" marker-end="url(#sk-c-mdchain-ah)"/><path class="p " d="M512 170 L548 170" marker-end="url(#sk-c-mdchain-ah)"/><path class="p gold" d="M550 150 L620 150 L620 190 L550 190Z"/><text x="585.0" y="176.0" text-anchor="middle" class="s">digest</text><path class="p dash" d="M585 192 L585 250 L120 250" marker-end="url(#sk-c-mdchain-ah)"/><text x="130" y="240" class="s">an attacker starts from the digest and keeps going: H(m ‖ padding ‖ more)</text><text x="30" y="300" class="s">So H(key ‖ message) is not a safe MAC with SHA-256. Use HMAC, or SHA-512/256,</text><text x="30" y="320" class="s">which does not output its whole state.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## When to use it

- **Integrity and fingerprints:** download checksums, content addressing, the
  digest inside a signature.
- **A message with a shared secret:** don't hash $\mathit{key} \,\Vert\, \mathit{message}$ yourself; use
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
    | Start state $H_0, \ldots, H_7$ (fractional parts of $\sqrt{2}, \sqrt{3}, \sqrt{5}, \ldots, \sqrt{19}$) | `6a09e667 bb67ae85 3c6ef372 a54ff53a 510e527f 9b05688c 1f83d9ab 5be0cd19` |
    | Round 0: $W_0 = \mathtt{61626380}$, $K_0 = \mathtt{428a2f98}$ | $T_1 = \mathtt{54da50e8}$, $T_2 = \mathtt{08909ae5}$ |
    | After round 0 | $a = T_1 + T_2 = \mathtt{5d6aebcd}$, $e = d + T_1 = \mathtt{fa2a4622}$ |
    | After 64 rounds, added to the start state | `ba7816bf 8f01cfea 414140de 5dae2223 b00361a3 96177a9c b410ff61 f20015ad` |

    Changing "abc" to "abd" gives `a52d159f 262b2c6d …`: about half the 256 bits flip.

??? abstract "The math, with formulas"

    **Merkle–Damgård.** Pad the message to a multiple of 512 bits; $H = \mathit{IV}$; for each block,
    $H = \mathrm{compress}(H, \mathit{block})$; output $H$. If the compression function resists collisions, so does the hash.

    **One SHA-256 round** (all 32-bit, $\ggg$ is rotate right):

    $$
    \begin{aligned}
    \Sigma_1(e) &= (e \ggg 6) \oplus (e \ggg 11) \oplus (e \ggg 25) & \mathrm{Ch}(e,f,g) &= (e \land f) \oplus (\lnot e \land g) \\
    \Sigma_0(a) &= (a \ggg 2) \oplus (a \ggg 13) \oplus (a \ggg 22) & \mathrm{Maj}(a,b,c) &= (a \land b) \oplus (a \land c) \oplus (b \land c) \\
    T_1 &= h + \Sigma_1(e) + \mathrm{Ch}(e,f,g) + K_t + W_t \\
    T_2 &= \Sigma_0(a) + \mathrm{Maj}(a,b,c)
    \end{aligned}
    $$

    $$
    h = g,\; g = f,\; f = e,\; e = d + T_1,\; d = c,\; c = b,\; b = a,\; a = T_1 + T_2
    $$

    **Message schedule:** $W_0, \ldots, W_{15}$ are the block's words; for $t \ge 16$,
    $W_t = \sigma_1(W_{t-2}) + W_{t-7} + \sigma_0(W_{t-15}) + W_{t-16}$, with $\sigma_0(x) = (x \ggg 7) \oplus (x \ggg 18) \oplus (x \gg 3)$ and
    $\sigma_1(x) = (x \ggg 17) \oplus (x \ggg 19) \oplus (x \gg 10)$ ($\gg$ is a plain shift). The constants $K_t$ are the fractional parts of the cube roots
    of the first 64 primes ("nothing up my sleeve").

    **Davies–Meyer feed-forward:** after 64 rounds the result is added to the incoming state, so the
    compression function cannot simply be run backwards.

    **Strength:** collisions need about $2^{128}$ work (birthday bound), preimages $2^{256}$. SHA-512 uses 64-bit words,
    80 rounds and 1,024-bit blocks; SHA-512/256 truncates it, which also stops length extension.

??? tip "Watch it step by step: the first round of SHA-256(\"abc\")"

    <div class="mars-steps" markdown>

    1. Pad "abc" into one 64-byte block: `61626380`, zeros, and the length `00000018`.
    2. Load the eight start words: $a = \mathtt{6a09e667}$, …, $e = \mathtt{510e527f}$, …, $h = \mathtt{5be0cd19}$.
    3. Mix the right half: $T_1 = h + \Sigma_1(e) + \mathrm{Ch}(e, f, g) + K_0 + W_0 = \mathtt{54da50e8}$.
    4. Mix the left half: $T_2 = \Sigma_0(a) + \mathrm{Maj}(a, b, c) = \mathtt{08909ae5}$.
    5. Shift the words along; the new $a = T_1 + T_2 = \mathtt{5d6aebcd}$, the new $e = d + T_1 = \mathtt{fa2a4622}$.
    6. 63 more rounds, then add the start words back: `ba7816bf…f20015ad`.

    </div>

??? info "The math underneath"

    - **Modular addition, rotation and Boolean functions** on 32 and 64-bit words.
    - **The Merkle–Damgård construction** and its proof; **length extension**, its weakness (see [HMAC](../06-mac/HMAC.md)).
    - **Davies–Meyer:** building a compression function from a block cipher.
    - **The birthday paradox:** collisions in $2^{n/2}$, not $2^n$.
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
