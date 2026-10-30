# Format-preserving encryption

*FF1 and FF3: encrypt a card number into another card number, same
length, same digits. Why small domains are its weak spot.*

**Status and standards:** see [Cipher modes and AEAD](../index.md#5-cipher-modes-and-aead)
in the main table.

## What it is

AES turns 16 bytes into 16 random-looking bytes. That won't fit a column
that holds nine digits. Format-preserving encryption (FPE) maps a string
over an alphabet to a string of the same length over the same alphabet:
nine digits in, nine digits out.

It is deterministic, so an encrypted column can still be searched and
joined. A public tweak, such as the card digits left in the clear, picks
a different permutation without a new key.

NIST SP 800-38G (2016) approved two methods, both Feistel networks over
AES. FF1 is FFX[Radix] by Bellare, Rogaway and Spies (2010). FF3 is the
core of BPS by Brier, Peyrin and Stern (2010). A third, FF2, was dropped
from the draft after the NSA said it fell short of 128-bit security.

## How it works

FF1, for a string of n digits in base `radix`:

- Split it into halves A (⌊n/2⌋ digits) and B.
- Ten rounds: run AES as a CBC-MAC over a header block (radix, n, tweak
  length) and then the tweak, the round number and B. Read the result as
  a number y, set A = (A + y) mod radixᵐ for A's length m, and swap.
- Decryption runs the rounds backwards, subtracting. AES only runs
  forwards.
- Radix is 2 to 2¹⁶. The 2016 text requires at least 100 possible inputs
  and recommends 1,000,000; the Rev. 1 drafts require 1,000,000.

FF3 has 8 rounds and a fixed 64-bit tweak whose two halves take turns.

## The attacks

All need many encryptions under one key, and all get cheap on small
domains.

- **FF3, 2017.** Durak and Vaudenay broke FF3 over small domains with a
  slide attack on two tweaks (CRYPTO 2017). In April 2017 NIST said FF3
  was "no longer suitable as a general-purpose FPE method". Hoang, Miller
  and Trieu (EUROCRYPT 2019) cut recovering a 6-digit PIN from about 2⁵⁰
  operations to 2³⁰.
- **FF3-1.** The 2019 draft of SP 800-38G Rev. 1 cut FF3's tweak to 56
  bits. Beyne (CRYPTO 2021) broke that too: on 10⁶ values, about 2²⁴
  encryptions give a fair chance of recovering the left half of a
  message. The second draft (February 2025) drops FF3 and keeps only FF1.
- **FF1 on small domains.** Bellare, Hoang and Tessaro (CCS 2016)
  recovered 4-bit messages from 2²⁵ FF1 encryptions, three per tweak.
  Hoang, Tessaro and Trieu (CRYPTO 2018) did better. Hence the
  1,000,000 rule.

Rev. 1 is still a draft; comments closed in April 2025. Until it's final,
the 2016 text, FF3 included, is the published standard.

## Where it's used

- **Card numbers.** SP 800-38G's own example encrypts the middle six
  digits of a card and uses the first six and last four as the tweak.
- **Tokenization.** Google Cloud's Sensitive Data Protection has FPE-FFX
  for same-format surrogates, though its docs suggest AES-SIV unless the
  format must be kept.
- **Libraries.** Bouncy Castle (Java) has FF1 and FF3-1. PyCA
  `cryptography` has no FPE.

## When to use it

- **Only when the format can't change,** such as a fixed-width field.
- **FF1, not FF3 or FF3-1,** on at least a million values, with a tweak
  that varies per record where it can.
- **If a few more bytes fit,** use an [AEAD](AEAD.md), or AES-SIV when
  equal values must match.

## Example (Python)

FF1 only runs AES forwards, so a keyed hash stands in for it, as on the
[Disk encryption](Disk-Encryption.md) page. This version takes 2 to 56
decimal digits. With a real AES as `E` it gives NIST's decimal FF1
samples, such as 0123456789 → 2433477484 under this key and an empty tweak.

```python
import hmac

def E(k, b):                                # stand-in for AES: a keyed hash
    return hmac.digest(k, b, "sha256")[:16]

def prf(k, x):                              # CBC-MAC over whole 16-byte blocks
    y = bytes(16)
    for i in range(0, len(x), 16):
        y = E(k, bytes(a ^ b for a, b in zip(y, x[i:i + 16])))
    return y

def ff1(k, t, x, dec=False):                # SP 800-38G FF1, radix 10
    n = len(x)
    u, v = n // 2, n - n // 2
    a, b = x[:u], x[u:]
    nb = ((10 ** v - 1).bit_length() + 7) // 8
    d = 4 * ((nb + 3) // 4) + 4
    p = bytes([1, 2, 1, 0, 0, 10, 10, u % 256]) + n.to_bytes(4, "big") + len(t).to_bytes(4, "big")
    for i in (range(9, -1, -1) if dec else range(10)):
        m = v if i % 2 else u
        q = t + bytes((-len(t) - nb - 1) % 16) + bytes([i]) + int(a if dec else b).to_bytes(nb, "big")
        y = int.from_bytes(prf(k, p + q)[:d], "big")
        if dec:
            a, b = str((int(b) - y) % 10 ** m).zfill(m), a
        else:
            a, b = b, str((int(a) + y) % 10 ** m).zfill(m)
    return a + b

key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
card = "4111111111111111"
head, mid, tail = card[:6], card[6:12], card[12:]
tweak = (head + tail).encode()

enc = head + ff1(key, tweak, mid) + tail
print(enc)                                                          # 4111117237341111
print(head + ff1(key, tweak, enc[6:12], dec=True) + tail == card)   # True
```

## Security notes

- Equal values under one tweak encrypt alike, so a column shows which
  records match.
- No integrity: any digit string decrypts to a valid-looking number.
- Six digits is the smallest domain Rev. 1 allows. One guess in a million
  hits, so limit who can call encrypt, and vary the tweak.

## See also

- [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md): CBC-MAC, the round function inside FF1
- [Disk encryption](Disk-Encryption.md): the other tweakable mode that keeps data its size
- [Key wrap](Key-Wrap.md): deterministic encryption for keys, and SIV
- [AES](../04-symmetric-ciphers/AES.md): the block cipher inside

## References

- [NIST SP 800-38G (2016)](https://csrc.nist.gov/pubs/sp/800/38/g/upd1/final) (Sections 5.1, 5.2, Appendices A, C) / [FF1 samples](https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/FF1samples.pdf)
- [SP 800-38G Rev. 1, initial public draft (2019)](https://csrc.nist.gov/pubs/sp/800/38/g/r1/ipd) / [second public draft (2025)](https://csrc.nist.gov/pubs/sp/800/38/g/r1/2pd) (Section 4, Appendix G)
- [NIST, "Recent Cryptanalysis of FF3" (12 April 2017)](https://csrc.nist.gov/news/2017/recent-cryptanalysis-of-ff3)
- Bellare, Rogaway and Spies, "The FFX Mode of Operation for Format-Preserving Encryption" and Addendum (2010) / Brier, Peyrin and Stern, "BPS: a Format-Preserving Encryption Proposal" (2010)
- [Durak and Vaudenay (CRYPTO 2017)](https://eprint.iacr.org/2017/521) / [Hoang, Miller and Trieu (EUROCRYPT 2019)](https://eprint.iacr.org/2019/244) / [Beyne (CRYPTO 2021)](https://eprint.iacr.org/2021/815)
- [Bellare, Hoang and Tessaro (CCS 2016)](https://eprint.iacr.org/2016/794) / [Hoang, Tessaro and Trieu (CRYPTO 2018)](https://eprint.iacr.org/2018/556)
- [Google Cloud, Pseudonymization](https://docs.cloud.google.com/sensitive-data-protection/docs/pseudonymization) / [Bouncy Castle `crypto.fpe`](https://downloads.bouncycastle.org/java/docs/bcprov-jdk18on-javadoc/org/bouncycastle/crypto/fpe/package-summary.html)
