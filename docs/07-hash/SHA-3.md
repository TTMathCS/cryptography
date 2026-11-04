# SHA-3 (Keccak)

*NIST's second hash standard, built on a completely different design from SHA-2
so that one break doesn't take out both.*

**Status and standards:** see [Hash functions](../algorithms/table.md#7-hash-functions) in
the main table.

## What it is

After the attacks on MD5 and SHA-1, NIST ran an open competition (2007–2012)
for a hash that didn't share SHA-2's structure. Keccak won and became FIPS 202
in 2015. SHA-2 is still fine, so SHA-3 is mostly the safety net, but it has
become the hash inside the new post-quantum standards
([ML-KEM](../01-key-exchange/ML-KEM.md), [ML-DSA](../02-signatures/ML-DSA.md)).

In March 2025 NIST decided to update FIPS 202. The update improves the text and
reflects that SHA-1 and Triple DES have been withdrawn; the SHA-3 functions
themselves don't change. The streaming interface for SHAKE goes into the
revision of SP 800-185, whose draft came out in October 2026 (see
[KMAC](../06-mac/KMAC.md)). The October 2024 draft of SP 800-131A Rev. 3 also
proposes retiring the 224-bit hashes, SHA3-224 included; it is still a draft.

| Function | Output | Use |
|---|---|---|
| SHA3-224 / 256 / 384 / 512 | fixed | drop-in for the SHA-2 sizes |
| SHAKE128 / SHAKE256 | any length you ask for | XOFs: stream out as many bytes as needed |
| Keccak-256 | 256-bit | Ethereum: the pre-standard padding, so it differs from SHA3-256 |

## The story

- **Who made it:** The Keccak team: Guido Bertoni, Joan Daemen (also co-designer of AES), Michaël Peeters and Gilles Van Assche. NIST's competition ran from 2007, with 64 entries; Keccak won on 2 October 2012. FIPS 202 (2015).
- **What for:** A backup hash built on a different idea from SHA-2.
- **What it solved:** After MD5 and SHA-1 fell, it gave the world a hash that wouldn't fall the same way. Its sponge also gives variable-length output (SHAKE).
- **Where it stands:** Recommended; inside ML-KEM and ML-DSA.
- **Incidents:** **2013:** NIST proposed lowering Keccak's capacity for speed. Coming just after the Snowden revelations, the change met fierce objections, and NIST kept the original. **CVE-2022-37454:** Nicky Mouha found a buffer overflow in the reference code (XKCP), which Python and PHP used.

## How it works

SHA-3 is a **sponge** over a 1600-bit state, split into a *rate* part and a
*capacity* part:

1. **Absorb:** XOR a rate-sized chunk of the message into the state, then run
   the Keccak-f permutation (24 rounds). Repeat for every chunk.
2. **Squeeze:** read rate-sized output from the state, permute, read again,
   until you have enough bytes.

The capacity part is never output directly, and that is where the security
comes from (SHA3-256 uses 512 bits of capacity). Because the digest is not the
whole internal state, **length extension doesn't work**, unlike SHA-2.

## When to use it

- **When a standard asks for it** (FIPS 202, ML-KEM/ML-DSA internals) or you
  want a hash unrelated to SHA-2.
- **SHAKE** when you need a variable-length output, such as deriving a stream of
  bytes from a seed.
- **Otherwise** SHA-256 is still the common, fastest choice in most software,
  and both are safe.

## Example (Python)

```python
import hashlib

print(hashlib.sha3_256(b"hello world").hexdigest())
# 644bcc7e564373040999aac89e7622f3ca71fba1d972fd94a31c3bfbf24e3938

print(hashlib.shake_128(b"hello world").hexdigest(16))   # 16 bytes out
# 3a9159f071e4dd1c8c4f968607c30942
```

## Security notes

- SHA3-256 has the same collision and preimage strength as SHA-256.
- Keccak-256 (Ethereum) and SHA3-256 give different digests for the same input;
  check which one a system means.
- Plain SHA-3 is a safe MAC as $\mathrm{SHA3}(\mathit{key} \,\Vert\, \mathit{message})$ thanks to the sponge, but
  KMAC is the standard keyed form.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: SHA3-256 of \"abc\""

    Recomputed with Python's `hashlib` (and with a hand-written Keccak on the [KMAC](../06-mac/KMAC.md) page):

    | Step | Value |
    |---|---|
    | Message "abc" | `61 62 63` |
    | Rate for SHA3-256 | 136 bytes (1,088 bits); capacity 512 bits |
    | Padding: `06`, zeros, `80` in the last byte | `61 62 63 06 00 … 00 80` (136 bytes) |
    | Absorb: XOR into the first 136 bytes of the 200-byte state, then Keccak-f[1600] | 24 rounds |
    | Squeeze: the first 32 bytes | `3a985da7 4fe225b2 045c172d 6bd390bd 855f086e 3e9d525b 46bfe245 11431532` |

    Same input, completely different output from SHA-256's `ba7816bf…`: the two are unrelated designs.

??? abstract "The math, with formulas"

    **The sponge.** A state of $b = 1{,}600$ bits split into rate $r$ and capacity $c = b - r$.

    $$
    \begin{aligned}
    &\text{absorb:} && \text{for each } r\text{-bit block } P_i\text{:}\quad S = f(S \oplus (P_i \,\Vert\, 0^c)) \\
    &\text{squeeze:} && \text{output the first } r \text{ bits of } S\text{;}\quad S = f(S)\text{; repeat until enough}
    \end{aligned}
    $$

    Security against generic attacks is $c/2$ bits, so SHA3-256 ($c = 512$) gives 256-bit preimage resistance and
    128-bit collision resistance plus margin.

    **Keccak-f[1600]**, 24 rounds on a $5 \times 5$ array of 64-bit lanes $A[x][y]$:

    $$
    \begin{aligned}
    &\theta: && C[x] = \textstyle\bigoplus_y A[x][y];\quad A[x][y] \mathrel{\oplus}= C[x-1] \oplus (C[x+1] \lll 1) && \text{column parity mixing} \\
    &\rho: && \text{rotate each lane by a fixed offset} && \text{spread bits within lanes} \\
    &\pi: && A[y][2x+3y] = A[x][y] && \text{move lanes around} \\
    &\chi: && A[x][y] \mathrel{\oplus}= (\lnot A[x+1][y]) \land A[x+2][y] && \text{the only non-linear step} \\
    &\iota: && A[0][0] \mathrel{\oplus}= RC[\mathit{round}] && \text{break symmetry}
    \end{aligned}
    $$

    $\chi$ has algebraic degree 2, which keeps hardware cheap; the 24 rounds give a wide margin (the best
    practical collision attacks reach 6 rounds).

    **Domain bits:** SHA-3 appends `01`, SHAKE `1111`, cSHAKE `00` before the `10…01` padding, so the
    functions never share outputs.

??? tip "Watch it step by step: a sponge hashing \"abc\""

    <div class="mars-steps" markdown>

    1. Start with 1,600 bits of zeros.
    2. Pad "abc" to a 136-byte block: `61 62 63 06 00 … 80`.
    3. XOR the block into the first 136 bytes of the state; the last 64 bytes (the capacity) are untouched.
    4. Scramble the whole state with 24 rounds of $\theta$, $\rho$, $\pi$, $\chi$, $\iota$.
    5. Read out the first 32 bytes: `3a985da7…11431532`.
    6. The capacity is never output, so there is nothing to extend: SHA-3 has no length-extension attack.

    </div>

??? info "The math underneath"

    - **Permutation-based cryptography:** sponges and duplexes (Bertoni, Daemen, Peeters and Van Assche).
    - **Indifferentiability** (Maurer, Renner and Holenstein): a sponge with a random permutation behaves like
      a random oracle up to $2^{c/2}$ queries.
    - **Boolean functions and algebraic degree** ($\chi$), and **linear diffusion** ($\theta$).
    - **Extendable-output functions (XOFs):** SHAKE128 and SHAKE256, used by [ML-KEM](../01-key-exchange/ML-KEM.md)
      and [ML-DSA](../02-signatures/ML-DSA.md).
    - [KMAC](../06-mac/KMAC.md), the keyed version.

## See also

- [SHA-2](SHA-2.md): the Merkle–Damgård design SHA-3 backs up
- [HMAC](../06-mac/HMAC.md): the keyed construction for SHA-2
- [KMAC](../06-mac/KMAC.md): the standard keyed form of SHA-3

## References

- [FIPS 202: SHA-3 Standard](https://csrc.nist.gov/pubs/fips/202/final) / [NIST, "Decision to Update FIPS 202 and Revise SP 800-185" (2025)](https://csrc.nist.gov/news/2025/decision-to-update-fips-202-and-revise-sp-800-185)
- [NIST SP 800-131A Rev. 3, initial public draft (2024)](https://csrc.nist.gov/pubs/sp/800/131/a/r3/ipd)
- [The Keccak team](https://keccak.team/keccak.html)
