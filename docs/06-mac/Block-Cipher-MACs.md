# Block-cipher MACs

*CMAC and GMAC: MACs built from AES instead of a hash. Why plain CBC-MAC
isn't enough, and where these two run.*

**Status and standards:** see [MAC](../algorithms/table.md#6-mac) in the main table.

## What it is

A MAC can be built from a block cipher instead of a hash, which suits
hardware that has AES and little else: smart cards, payment HSMs, the
radio chip in a phone.

- **CMAC** runs AES in CBC mode and keeps the last block, with a fix that
  makes it safe for any message length.
- **GMAC** is GCM with nothing to encrypt: a polynomial hash over
  $\mathrm{GF}(2^{128})$, masked with AES of a nonce.

## The story

- **Who made it:** CBC-MAC came from banking (ANSI X9.9, 1986, and FIPS 113, 1985). Black and Rogaway's XCBC (2000) and Iwata and Kurosawa's OMAC (2003) fixed it, and NIST standardized OMAC as CMAC (SP 800-38B, 2005). GMAC is McGrew and Viega's GCM without the encryption.
- **What for:** MACs for hardware that has a block cipher and nothing else.
- **What it solved:** Plain CBC-MAC is forgeable when messages vary in length; CMAC is safe for any length.
- **Where it stands:** CMAC is recommended in payment systems, smart cards and 5G; GMAC where GCM hardware exists.
- **Incidents:** Systems that used plain CBC-MAC with variable lengths, or the same key for encrypting and MACing, could be forged; that is why CMAC exists.

## How it works

### CBC-MAC, and why it fails

CBC-MAC encrypts the message in CBC mode with a zero IV and keeps the
last block. The DES version was FIPS 113 (1985, withdrawn 2008).
Bellare, Kilian and Rogaway proved it secure when all messages have the
same number of blocks (CRYPTO 1994).

With mixed lengths it breaks. If $t$ is the tag of a one-block message $m$,
then $m \,\Vert\, (m \oplus t)$ also has tag $t$: the second block reaches the cipher as
$t \oplus m \oplus t = m$, the same input as before. One tag is enough to extend a
message without the key.

### CMAC

Black and Rogaway's XCBC (CRYPTO 2000) fixed CBC-MAC with three keys.
Iwata and Kurosawa cut that to one key with OMAC (FSE 2003), then OMAC1,
which NIST adopted as CMAC in SP 800-38B (2005). RFC 4493 (2006) has
AES-CMAC with test vectors.

- $L = \mathrm{AES}(K, 0^{128})$. $K_1$ is $L$ shifted left one bit, with `0x87` XORed into
  the last byte if a bit fell off. $K_2$ is $K_1$ done the same way.
- Run CBC-MAC over every block but the last.
- XOR $K_1$ into a full last block, or pad a short one with `0x80` and zeros
  and XOR $K_2$. Encrypting it gives the tag.

The secret mask means a tag is no longer the chaining value a longer
message would carry on from, so the trick above stops working.

SP 800-38B says a tag of at least 64 bits suits most uses, and one AES key
should tag no more than $2^{48}$ messages. NIST decided in April 2025 to
revise it, matching CCM's tag-length rules and dropping Triple DES.

### GMAC

SP 800-38D (2007) defines GCM and GMAC, its variant with no plaintext.
The hash key is $H = \mathrm{AES}(K, 0^{128})$. GHASH evaluates the message blocks as a
polynomial at $H$, and the tag is that value XOR $\mathrm{AES}(K, J_0)$, where $J_0$ comes
from the IV. It is the Wegman–Carter idea, like
[Poly1305](Universal-Hash-MACs.md).

The IV must never repeat under one key. Two tags with one IV give an
equation in $H$, and solving it lets you forge anything (Joux, 2006).
SP 800-38D calls this "almost as important as the secrecy of the key".
NIST decided in 2024 to revise SP 800-38D and drop tags under 96 bits.
Its second call for comments (June 2026) adds wGCM, for 256-bit blocks.

## Where they're used

- **4G and 5G:** the integrity algorithms 128-EIA2 and 128-NIA2 are
  AES-CMAC with a 32-bit tag.
- **Smart cards:** GlobalPlatform SCP03, the secure channel for managing
  card applets, MACs each command and response with AES-CMAC cut to 8
  bytes.
- **Banking:** payment HSMs exchange keys in TR-31 / ANSI X9.143 key
  blocks. The AES version (D) binds each block with AES-CMAC.
- **IPsec:** AES-CMAC-96 in AH and ESP (RFC 4494), AES-CMAC-PRF-128 in
  IKE (RFC 4615), and GMAC for integrity-only ESP and AH (RFC 4543).

## When to use it

- **CMAC** when a standard or device calls for it, or AES is all the
  hardware has.
- **GMAC** when GCM hardware is there, nothing needs encrypting, and every
  message can get a fresh IV.
- **Otherwise HMAC-SHA-256,** which needs no nonce and has no $2^{48}$ limit.
  See [HMAC](HMAC.md).
- **If you also encrypt,** use an [AEAD](../05-modes-aead/AEAD.md), not
  CBC plus CMAC.

## Example (Python)

CMAC only runs AES forwards, so a keyed hash stands in, as on the
[Disk encryption](../05-modes-aead/Disk-Encryption.md) page. With a real
AES as `E`, `cmac()` gives the RFC 4493 test vectors.

```python
import hmac

def E(k, b):                             # stand-in for AES: a keyed hash
    return hmac.digest(k, b, "sha256")[:16]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def cbc_mac(k, m):                       # raw CBC-MAC, whole 16-byte blocks
    t = bytes(16)
    for i in range(0, len(m), 16):
        t = E(k, xor(t, m[i:i + 16]))
    return t

def dbl(b):                              # multiply by x in GF(2^128)
    n = int.from_bytes(b, "big") << 1
    if n >> 128:
        n ^= (1 << 128) | 0x87
    return n.to_bytes(16, "big")

def cmac(k, m):                          # RFC 4493, Section 2.4
    k1 = dbl(E(k, bytes(16)))
    k2 = dbl(k1)
    if m and len(m) % 16 == 0:
        head, last = m[:-16], xor(m[-16:], k1)
    else:
        r = len(m) % 16
        head, last = m[:len(m) - r], xor(m[len(m) - r:] + b"\x80" + bytes(15 - r), k2)
    return E(k, xor(cbc_mac(k, head), last))

key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
m = b"pay Bob $100.00!"                  # one block, tagged by the sender

t = cbc_mac(key, m)
print(cbc_mac(key, m + xor(m, t)) == t)  # True
t = cmac(key, m)
print(cmac(key, m + xor(m, t)) == t)     # False
```

Raw CBC-MAC accepts a two-block message nobody tagged. The same trick on
a CMAC tag fails.

In real code, PyCA `cryptography` (`pip install cryptography`) has
`cmac.CMAC(algorithms.AES(key))`, and GMAC is
`AESGCM(key).encrypt(nonce, b"", data)`, which returns only the 16-byte
tag. Run with cryptography 50.0.1 on Python 3.13, CMAC gives the four
RFC 4493 tags, and GMAC matches NIST's GCM test vectors that have no
plaintext.

## Security notes

- Compare tags in constant time, as with HMAC.
- Use a CMAC key only for CMAC, not also for CBC encryption.
- One repeated GMAC IV gives away $H$. Use a counter or another IV scheme
  that can't repeat.
- Short tags, such as 5G's 32 bits, are safe only where the protocol caps
  how many forgeries anyone can try.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RFC 4493's CMAC example 2, recomputed"

    AES-128-CMAC with key `2b7e151628aed2a6abf7158809cf4f3c` over one full block. Recomputed with Python's
    `cryptography`, matching RFC 4493 and SP 800-38B:

    | Step | Value |
    |---|---|
    | $L = \mathrm{AES}_K(0^{128})$ | `7df76b0c1ab899b33e42f047b91b546f` |
    | $K_1 = L \cdot 2$ (shift left; top bit was 0, so no XOR) | `fbeed618357133667c85e08f7236a8de` |
    | Message (one full block) | `6bc1bee22e409f96e93d7e117393172a` |
    | Last block $\oplus K_1$, then AES | |
    | Tag | `070a16b46b4d4144f79bdd9dd04a287c` |

??? abstract "The math, with formulas"

    **CBC-MAC.** $T = C_n$ where $C_0 = 0$, $C_i = E_K(C_{i-1} \oplus M_i)$. Secure only for messages of one fixed length:
    from tags $T$ for $M$ and $T'$ for $M'$, the message $M \,\Vert\, (M'_1 \oplus T) \,\Vert\, M'_2 \cdots$ has tag $T'$.

    **CMAC (OMAC1, SP 800-38B)** fixes this by changing the last block with one of two subkeys:

    $$
    \begin{aligned}
    L &= E_K(0^{128}) \\
    K_1 &= L \cdot x, \quad K_2 = L \cdot x^2 && \text{in } \mathrm{GF}(2^{128})\text{: shift left 1 bit, XOR } \mathtt{0x87} \text{ if a bit fell off} \\
    \text{last block} &= M_n \oplus K_1 && \text{if } M_n \text{ is a full block} \\
    &= (M_n \,\Vert\, 10\ldots0) \oplus K_2 && \text{otherwise} \\
    T &= \text{CBC-MAC}_K(M_1, \ldots, M_{n-1}, \text{last block})
    \end{aligned}
    $$

    **GMAC** is GCM with no plaintext: the tag is GHASH of the data, masked. It needs a unique nonce per
    message.

    **Limits.** With a 128-bit block, the tag forgery chance stays about $q^2/2^{128}$ for $q$ messages, which
    caps CMAC-AES at around $2^{48}$ messages per key in practice.

??? tip "Watch it step by step: CMAC on two blocks"

    <div class="mars-steps" markdown>

    1. Encrypt a block of zeros: $L = \mathrm{AES}_K(0)$. Double it in $\mathrm{GF}(2^{128})$ to get $K_1$, and again for $K_2$.
    2. Block 1: encrypt $M_1$.
    3. Block 2 is the last: XOR it with $K_1$ (or pad it and use $K_2$ if it is short).
    4. XOR that into the previous result and encrypt.
    5. The final 16 bytes are the tag; it may be truncated, but not below 64 bits.
    6. The subkey makes the last block special, so tags cannot be glued together as in plain CBC-MAC.

    </div>

??? info "The math underneath"

    - **CBC-MAC** and its fixed-length security proof (Bellare, Kilian and Rogaway, 1994).
    - **$\mathrm{GF}(2^{128})$ doubling:** the same "multiply by $x$" as in XTS and OCB.
    - **Pseudorandom permutations:** [AES](../04-symmetric-ciphers/AES.md).
    - **The birthday bound** on 128-bit blocks.
    - Compare [HMAC](HMAC.md) (hash-based) and [Universal-hash MACs](Universal-Hash-MACs.md) (faster, need
      nonces).

## See also

- [HMAC](HMAC.md): the hash-based MAC, the usual default
- [Universal hash MACs](Universal-Hash-MACs.md): Poly1305 and UMAC, the same idea as GMAC
- [Classic modes](../05-modes-aead/Classic-Modes.md): CBC, the mode CBC-MAC runs on
- [Format-preserving encryption](../05-modes-aead/Format-Preserving.md): FF1, which runs CBC-MAC in each round
- [AES](../04-symmetric-ciphers/AES.md): the block cipher inside

## References

- [FIPS 113: Computer Data Authentication (1985)](https://csrc.nist.gov/pubs/fips/113/final) / Bellare, Kilian and Rogaway, "The Security of the Cipher Block Chaining Message Authentication Code" (CRYPTO 1994)
- Black and Rogaway, "CBC MACs for Arbitrary-Length Messages: The Three-Key Constructions" (CRYPTO 2000) / Iwata and Kurosawa, "OMAC: One-Key CBC MAC" (FSE 2003)
- [NIST SP 800-38B: CMAC (2005, updated 2016)](https://csrc.nist.gov/pubs/sp/800/38/b/upd1/final) (Section 6, Appendices A, B) / [Decision to revise SP 800-38B and 38C (2025)](https://csrc.nist.gov/news/2025/decision-to-revise-sp-800-38b-and-38c) / [the proposal](https://csrc.nist.gov/news/2025/proposal-to-revise-sp-800-38b-and-sp-800-38c)
- [RFC 4493: AES-CMAC](https://www.rfc-editor.org/rfc/rfc4493) (Sections 2.4, 4) / [RFC 4494: AES-CMAC-96 in IPsec](https://www.rfc-editor.org/rfc/rfc4494) / [RFC 4615: AES-CMAC-PRF-128](https://www.rfc-editor.org/rfc/rfc4615)
- [NIST SP 800-38D: GCM and GMAC (2007)](https://csrc.nist.gov/pubs/sp/800/38/d/final) (Section 8, Appendix A) / [NIST to revise SP 800-38D (2024)](https://csrc.nist.gov/news/2024/nist-to-revise-sp-80038d-gcm-and-gmac-modes) / [second pre-draft call (2026)](https://csrc.nist.gov/pubs/sp/800/38/d/r1/2prd)
- [Joux, "Authentication Failures in NIST version of GCM" (2006)](https://csrc.nist.gov/csrc/media/projects/block-cipher-techniques/documents/bcm/comments/800-38-series-drafts/gcm/joux_comments.pdf) / [RFC 4543: GMAC in IPsec](https://www.rfc-editor.org/rfc/rfc4543)
- 3GPP TS 33.401, Annex B.2.3 (128-EIA2) / 3GPP TS 33.501, Annex D.3.1.3 (128-NIA2)
- [GlobalPlatform Amendment D: SCP03, v1.1.1 (2014)](https://globalplatform.org/wp-content/uploads/2014/07/GPC_2.2_D_SCP03_v1.1.1.pdf) (Sections 6.2.4, 6.2.5)
- [PyCA `cryptography`: CMAC](https://cryptography.io/en/latest/hazmat/primitives/mac/cmac/)

*Weaker sources:* [Kisley, "X9.143 and PCI PIN Compliant Key Blocks" (PCI SSC talk, 2022)](https://www.pcisecuritystandards.org/day-2_track-2_8_x9-143-and-pci-pin-compliant-key-blocks_richard-kisley_approved_8-19-22_v2dm/) for CMAC in version D key blocks; the [iTecSpec](https://itecspec.com/3gpp/33.401/s/b.2.3) mirror of the 3GPP text, read in place of the official files.
