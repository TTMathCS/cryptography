# Disk encryption

*XTS-AES and Adiantum: encryption that keeps a sector exactly its size,
with no room for a nonce or a tag. What that costs, and where each runs.*

**Status and standards:** see [Cipher modes and AEAD](../index.md#5-cipher-modes-and-aead)
in the main table.

## What it is

A disk reads and writes fixed sectors, usually 512 or 4096 bytes, by
number. Encryption has to fit that: a sector encrypts to the same size,
any sector decrypts on its own, and there is nowhere to keep a fresh nonce
or a 16-byte tag for each write. As Adiantum's authors put it, nonce reuse
is unavoidable and a MAC has no space, so AES-GCM is out.

What's left is a tweakable cipher. The sector number goes in as a tweak, so
the same data in two sectors encrypts differently. Writing the same data to
the same sector again gives the same ciphertext; a mode that keeps the
size can't avoid that.

The older answer was CBC with an IV made from the sector number. Its
problem, as Niels Ferguson wrote when designing BitLocker for Vista, is
that an attacker can flip chosen bits in one block at the cost of garbling
the block before. BitLocker added a diffuser on top; later systems moved to
XTS.

## XTS-AES

**Where it came from.** Liskov, Rivest and Wagner defined tweakable block
ciphers (CRYPTO 2002). Rogaway's XEX (ASIACRYPT 2004) builds one from a
block cipher: C = E(K, P ⊕ Δ) ⊕ Δ, where Δ comes from encrypting the tweak.
The IEEE P1619 group started with LRW, then switched to XEX because of
worries about key material being swapped to disk. It used two keys instead
of XEX's one and added ciphertext stealing: XTS, the "XEX-based tweaked
codebook mode with ciphertext stealing". IEEE 1619-2007 standardized it,
NIST approved it in SP 800-38E (2010), and IEEE has since revised it as
1619-2018 and 1619-2025.

**How it works.**

- Two AES keys: K1 for the data and K2 for the tweak. XTS-AES-128 takes 256
  key bits and XTS-AES-256 takes 512. FIPS validation requires K1 ≠ K2.
- For block j of sector i: T = E(K2, i) · αʲ, and C = E(K1, P ⊕ T) ⊕ T.
  Multiplying by α in GF(2¹²⁸) is a 1-bit shift and, on overflow, an XOR
  with 0x87.
- A short last block uses ciphertext stealing. Sectors are whole blocks, so
  disks rarely need it.
- SP 800-38E caps one data unit at 2²⁰ blocks (16 MiB). IEEE 1619-2018 made
  that a requirement too, and 1619-2025 adds a cap on how much data one key
  may cover. NIST's draft SP 800-38E Rev. 1 (September 2026) moves to
  IEEE 1619-2025.

**Where it's used.**

- **BitLocker:** XTS-AES since Windows 10 version 1511 (2015), and
  XTS-AES-128 is the default. Vista and 7 defaulted to AES-CBC with
  Ferguson's "Elephant" diffuser.
- **FileVault:** AES-XTS for whole volumes, per Apple's platform security
  guide.
- **LUKS / dm-crypt:** cryptsetup made `aes-xts-plain64` the default in 1.6
  (2013). Since 2.1 (2019) the default key is 512 bits, so AES-256-XTS.
- **Android:** file-based encryption uses XTS for file contents.

**What it doesn't do.** XTS has no integrity. A changed ciphertext block
decrypts to 16 random-looking bytes rather than a chosen bit flip, but
nothing reports it, and an old copy of a block can be put back unnoticed.
An attacker who sees the disk at two times learns which 16-byte blocks
changed. NIST still calls it better against tampering than the other
confidentiality-only modes. IEEE chose a narrow (16-byte) mode over a
sector-wide one mostly because of patents, according to NIST IR 8459.

## Adiantum

Paul Crowley and Eric Biggers at Google designed Adiantum (2018) for cheap
phones whose CPUs lack AES instructions, where AES-XTS is slow. It is a
wide-block mode: the whole sector is one block, so changing any bit changes
the whole sector's ciphertext. The paper calls the structure HBSH (hash,
block cipher, stream cipher, hash). For a sector split into P_L and its
last 16 bytes P_R, with tweak T:

1. P_M = P_R + H(T, P_L), where H is NH plus Poly1305 and + is mod 2¹²⁸
2. C_M = AES-256(K_E, P_M)
3. C_L = P_L ⊕ XChaCha12(K_S, nonce from C_M)
4. C_R = C_M − H(T, C_L)

The user key is the 256-bit XChaCha12 key K_S, and K_E and the hash keys
come from its keystream. On an ARM Cortex-A7 it decrypts 4096-byte sectors
at 10.6 cycles per byte, over five times faster than AES-256-XTS. Linux
5.0 (2019) added it, and Android 9 and later can use it on devices without
AES instructions. Android's docs say not to use it where ARMv8 Crypto
Extensions or AES-NI exist. There is no NIST or IETF standard for it.

## When to use it

- **Full-disk or block-layer encryption:** XTS-AES, which is what
  BitLocker, FileVault and LUKS already do.
- **CPUs without AES instructions:** Adiantum.
- **Anywhere a nonce and tag fit** (files, backups, databases, network):
  an [AEAD](AEAD.md), not a disk mode.

## Example (Python)

XTS needs AES, which Python's standard library doesn't have, so a keyed
hash stands in. That is enough to encrypt (it can't decrypt) and to see
what XTS leaks. With a real AES in place of `E`, `xts()` matches the
IEEE 1619 test vectors for whole blocks.

```python
import hmac, os

def E(k, b):                        # stand-in for AES: a keyed hash
    return hmac.digest(k, b, "sha256")[:16]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def double(t):                      # multiply by x in GF(2^128), IEEE 1619 byte order
    n = int.from_bytes(t, "little") << 1
    if n >> 128:
        n ^= (1 << 128) | 0x87
    return n.to_bytes(16, "little")

def xts(k1, k2, sector, data):      # whole 16-byte blocks only, no ciphertext stealing
    t = E(k2, sector.to_bytes(16, "little"))
    out = b""
    for i in range(0, len(data), 16):
        out += xor(E(k1, xor(data[i:i + 16], t)), t)
        t = double(t)
    return out

def blocks(s):
    return [s[i:i + 16] for i in range(0, len(s), 16)]

k1, k2 = os.urandom(16), os.urandom(16)
old = bytes(4096)                                 # a 4 KB sector of zeros
new = old[:1000] + b"!" + old[1001:]              # change byte 1000

a = xts(k1, k2, 7, old)
print(len(set(blocks(a))))                                  # 256: equal blocks don't show
print(a == xts(k1, k2, 7, old), a == xts(k1, k2, 8, old))   # True False
b = xts(k1, k2, 7, new)
print([i for i, (x, y) in enumerate(zip(blocks(a), blocks(b))) if x != y])   # [62]
```

The zeros don't repeat in the ciphertext, and the same data in sector 8
looks different. But writing the same sector twice gives the same bytes,
and one changed byte shows up as one changed block, number 62. Under
Adiantum that last line would list all 256 blocks.

## Security notes

- XTS protects a powered-off, stolen disk. It does not stop someone who can
  watch and write the disk over time, such as a host holding a VM image.
- Generate K1 and K2 independently. A 512-bit XTS key is AES-256 strength,
  not 512.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: the same data in two sectors"

    32 bytes of `A` written to sector 0 and to sector 1 of a disk, with AES-XTS and the 32-byte key
    `00 01 … 1f` (two AES-128 keys). Computed with Python's `cryptography`:

    | Sector | Ciphertext |
    |---|---|
    | 0 | `56acd179 41534308 5af0d1cd c3616b10 8298837d 89f9803e d68df446 c75f964b` |
    | 1 | `47e56812 6b3dd416 3d7fc2f7 8936c9ca 493ff953 9b56d788 a6d6e317 cac8a8d8` |

    Same data, same key, different sectors: different ciphertext, and the two 16-byte blocks inside each
    sector differ too. What XTS cannot hide: writing the same data to the *same* sector again gives the same
    ciphertext, so someone with two snapshots of the disk sees which blocks changed.

??? abstract "The math, with formulas"

    **XTS-AES (IEEE 1619, SP 800-38E)** with keys `K₁`, `K₂`, sector number `i`, block `j` inside the sector:

    ```
    T  = AES_K₂(i) ⊗ αʲ          α = x in GF(2¹²⁸), i.e. multiply by 2
    Cⱼ = AES_K₁(Pⱼ ⊕ T) ⊕ T
    ```

    Multiplying by `α` is a 1-bit shift left with a conditional XOR of `0x87`, so each next tweak is nearly
    free. A last partial block is handled by ciphertext stealing, so the sector size never grows. There is
    no room for a tag: XTS gives confidentiality only, and a changed ciphertext block decrypts to 16 random
    bytes instead of raising an error.

    **Adiantum (Crowley and Biggers, 2018)** encrypts a whole 4 KiB sector as one wide block
    (hash-encrypt-hash):

    ```
    P = (P_L, P_R)                      P_R is 16 bytes, P_L the rest
    P_M = P_R + H(T, P_L)               H = NH then Poly1305 (an ε-universal hash)
    C_M = AES-256(P_M)                  one block cipher call
    C_L = P_L ⊕ XChaCha12(C_M)
    C_R = C_M − H(T, C_L)
    ```

    Change one bit anywhere and the whole sector changes, which is stronger than XTS's 16-byte granularity.

??? tip "Watch it step by step: XTS on one block"

    <div class="mars-steps" markdown>

    1. The sector number `i` is encrypted with the second key: `AES_K₂(i)`.
    2. For block `j` inside the sector, multiply by 2 in GF(2¹²⁸) `j` times: that is the tweak `T`.
    3. XOR the plaintext block with `T`.
    4. Encrypt it with the first key.
    5. XOR with `T` again: that is the ciphertext block, the same size as the plaintext.
    6. The same data in another sector, or another position, gets a different `T` and so looks different.

    </div>

??? info "The math underneath"

    - **Tweakable block ciphers** (Liskov, Rivest and Wagner, 2002) and Rogaway's XEX construction, which XTS
      is built on.
    - **GF(2¹²⁸) multiplication by `x`:** the doubling used for the tweaks (also in CMAC and OCB).
    - **Wide-block encryption** and universal hashing ([Universal-hash MACs](../06-mac/Universal-Hash-MACs.md)).
    - **Why there is no tag:** length-preserving encryption cannot detect tampering; file systems that need
      it add integrity separately (dm-integrity, APFS's per-file keys).
    - [AES](../04-symmetric-ciphers/AES.md), [ChaCha](../04-symmetric-ciphers/ChaCha.md).

## See also

- [Classic modes](Classic-Modes.md): CBC and its bit flipping, why disks moved on
- [AES](../04-symmetric-ciphers/AES.md): the cipher inside XTS
- [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md): XChaCha, the stream cipher inside Adiantum
- [Argon2](../08-kdf-password-hashing/Argon2.md): how LUKS2 turns a passphrase into a key

## References

- Liskov, Rivest and Wagner, "Tweakable Block Ciphers" (CRYPTO 2002) / Rogaway, "Efficient Instantiations of Tweakable Blockciphers and Refinements to Modes OCB and PMAC" (ASIACRYPT 2004)
- [IEEE 1619-2007](https://standards.ieee.org/ieee/1619/4205/) (superseded by 1619-2018 and 1619-2025)
- [NIST SP 800-38E: XTS-AES (2010)](https://csrc.nist.gov/pubs/sp/800/38/e/final) / [SP 800-38E Rev. 1, initial public draft (2026)](https://csrc.nist.gov/pubs/sp/800/38/e/r1/ipd) / [NIST IR 8459 (2024)](https://csrc.nist.gov/pubs/ir/8459/final) (Section 8)
- Ferguson, "AES-CBC + Elephant diffuser: A Disk Encryption Algorithm for Windows Vista" (Microsoft, 2006)
- [Brož and Sedláček, "XTS mode revisited: high hopes for key scopes?" (2025)](https://arxiv.org/abs/2502.18631)
- [Crowley and Biggers, "Adiantum: length-preserving encryption for entry-level processors" (IACR ToSC 2018, issue 4)](https://eprint.iacr.org/2018/720) / [paper source and reference code](https://github.com/google/adiantum) / [Linux `crypto/adiantum.c`](https://github.com/torvalds/linux/blob/master/crypto/adiantum.c) / [Android: Adiantum](https://source.android.com/docs/security/features/encryption/adiantum)
- [Microsoft, BitLocker strength in Windows 7](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-7/ee706531%28v=ws.10%29) / [Configure BitLocker](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/configure) / [What's new in Windows 10, versions 1507 and 1511](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/whats-new/whats-new-windows-10-version-1507-and-1511) / [Apple Platform Security: FileVault](https://support.apple.com/guide/security/volume-encryption-with-filevault-sec4c6dc1b6e/web)
- [cryptsetup 1.6.0](https://gitlab.com/cryptsetup/cryptsetup/-/blob/main/docs/v1.6.0-ReleaseNotes) and [2.1.0](https://gitlab.com/cryptsetup/cryptsetup/-/blob/main/docs/v2.1.0-ReleaseNotes) release notes
- IEEE 1619 test vectors as carried in [Linux `crypto/testmgr.h`](https://github.com/torvalds/linux/blob/master/crypto/testmgr.h)

*Weaker sources:* [KernelNewbies, Linux 5.0](https://kernelnewbies.org/Linux_5.0) for the kernel version that added Adiantum.
