# National ciphers

*Block ciphers that governments standardized for their own systems:
Camellia in Japan, ARIA in Korea, SM4 in China, Kuznyechik in Russia. Each
has AES's 128-bit block, and none has a known practical attack.*

**Status and standards:** see [Symmetric ciphers](../index.md#4-symmetric-ciphers)
in the main table.

## What it is

[AES](AES.md) is a US federal standard. A government that certifies crypto
for its own agencies and banks often wants a cipher it evaluated itself,
in its own national standard, under its own certification scheme. Japan,
Korea, China and Russia each have one. All four have a 128-bit block, so
they fit the usual modes (GCM, CCM, CBC, CTR) without the birthday-bound
trouble of the [old 64-bit ciphers](Retired.md#64-bit-block-ciphers).

## How it works

| Cipher | Country | Public since | Key (bits) | Structure | Rounds |
|---|---|---|---|---|---|
| Camellia | Japan | 2000 | 128 / 192 / 256 | Feistel with FL layers | 18 / 24 / 24 |
| ARIA | Korea | 2003 | 128 / 192 / 256 | substitution-permutation | 12 / 14 / 16 |
| SM4 | China | 2006 | 128 | unbalanced Feistel | 32 |
| Kuznyechik | Russia | 2015 | 256 | substitution-permutation | 9 + final key |

**Camellia** was designed by NTT and Mitsubishi Electric in 2000, with the
same interface as AES. It is a Feistel cipher, and every six rounds it
inserts key-dependent FL and FL⁻¹ layers. The EU's NESSIE project picked
it, it went on Japan's CRYPTREC list for e-government in 2003, and RFC 3713
(2004) describes it. OpenPGP has it, and so does TLS up to 1.2 (RFC 5932).

**ARIA** came from Korean researchers in 2003 and became the Korean
standard KS X 1213 in 2004. Like AES it alternates byte substitution with a
linear mixing layer, and two of its four S-boxes are the AES S-box and its
inverse. RFC 5794 (2010) says it is widely used in Korea, especially in
government services. TLS suites (up to 1.2) are in RFC 6209.

**SM4** was written for WAPI, China's wireless LAN security standard. The
cipher was published as SMS4 in 2006, renamed SM4 in GM/T 0002-2012,
became the national standard GB/T 32907-2016, and was added to ISO/IEC
18033-3 in 2021. Each of its 32 rounds makes one new 32-bit word: XOR the
last three words with a round key, put each byte through the S-box, mix
with rotations, and XOR into the word before them. Decryption is the same
with the round keys reversed. It is the block cipher of China's SM suite,
next to SM2 (elliptic curves) and SM3 (hash). RFC 8998 (2021) adds TLS 1.3
suites and notes that the SM algorithms "are becoming mandatory in China".

**Kuznyechik** ("grasshopper") is the 128-bit cipher in GOST R 34.12-2015,
approved in June 2015. The FSB's information protection center developed
it with InfoTeCS. It runs 9 rounds of key XOR, an S-box layer and a linear
layer over GF(2⁸), then a last key XOR. The same standard also has Magma,
a revised version of the old 64-bit GOST 28147-89 cipher (RFC 8891).
Kuznyechik is RFC 7801 (2016), and RFC 9367 (2023) defines GOST suites for
TLS 1.3.

## When to use it

- **When a regulator, a government customer or a partner's system
  requires it.**
- **Otherwise use AES-GCM or [ChaCha20-Poly1305](../05-modes-aead/AEAD.md),**
  which have more support, review and tested code.
- None is in the IETF's TLS 1.3 set. The SM4 and Kuznyechik suites come
  from Independent Submission RFCs marked not recommended in the IANA
  registry, and Camellia and ARIA have no TLS 1.3 suites.

## Example (Python)

SM4 from the GB/T 32907-2016 description, checked against the standard's
first example (key and plaintext are the same 16 bytes). A teaching copy,
not constant time.

```python
S = bytes.fromhex(                        # the SM4 S-box, GB/T 32907-2016
    "d690e9fecce13db716b614c228fb2c052b679a762abe04c3aa44132649860699"
    "9c4250f491ef987a33540b43edcfac62e4b31ca9c908e89580df94fa758f3fa6"
    "4707a7fcf37317ba83593c19e6854fa8686b81b27164da8bf8eb0f4b70569d35"
    "1e240e5e6358d1a225227c3b01217887d40046579fd327524c3602e7a0c4c89e"
    "eabf8ad240c738b5a3f7f2cef96115a1e0ae5da49b341a55ad933230f58cb1e3"
    "1df6e22e8266ca60c02923ab0d534e6fd5db3745defd8e2f03ff6a726d6c5b51"
    "8d1baf92bbddbc7f11d95c411f105ad80ac13188a5cd7bbd2d74d012b8e5b4b0"
    "8969974a0c96777e65b9f109c56ec68418f07dec3adc4d2079ee5f3ed7cb3948")
FK = [0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc]
CK = [int.from_bytes(bytes((4 * i + j) * 7 % 256 for j in range(4)), "big") for i in range(32)]

def rotl(x, n):
    return (x << n | x >> (32 - n)) & 0xffffffff

def tau(x):                               # S-box on each of the 4 bytes
    return int.from_bytes(bytes(S[b] for b in x.to_bytes(4, "big")), "big")

def words(b):
    return [int.from_bytes(b[i:i + 4], "big") for i in range(0, 16, 4)]

def round_keys(key):
    k = [w ^ f for w, f in zip(words(key), FK)]
    for i in range(32):
        t = tau(k[i + 1] ^ k[i + 2] ^ k[i + 3] ^ CK[i])
        k.append(k[i] ^ t ^ rotl(t, 13) ^ rotl(t, 23))
    return k[4:]

def crypt(rk, block):                     # 32 rounds, each makes one new word
    x = words(block)
    for r in rk:
        t = tau(x[-3] ^ x[-2] ^ x[-1] ^ r)
        x.append(x[-4] ^ t ^ rotl(t, 2) ^ rotl(t, 10) ^ rotl(t, 18) ^ rotl(t, 24))
    return b"".join(w.to_bytes(4, "big") for w in x[:-5:-1])

key = bytes.fromhex("0123456789abcdeffedcba9876543210")
rk = round_keys(key)
ct = crypt(rk, key)
print(ct.hex())                           # 681edf34d206965e86b3e94f536e4246
print(crypt(rk[::-1], ct) == key)         # True: decrypt with the keys reversed
```

## Security notes

- No published attack breaks any of the four at full rounds, only
  reduced-round versions.
- Like AES they are built on S-box lookups, and table-based code leaks key
  bits through cache timing. Use a constant-time implementation.
- Kuznyechik's S-box, shared with the Streebog hash, was published with no
  design rationale. Biryukov, Perrin and Udovenko (2016), then Perrin
  (2019), found hidden algebraic structure in it. No attack on the cipher
  has come from it so far.
- Fewer implementations means less testing, and support outside the home
  country is thin.

## See also

- [AES](AES.md): the international default these sit beside
- [Retired ciphers](Retired.md#64-bit-block-ciphers): the 64-bit ciphers several of them replaced
- [AEAD](../05-modes-aead/AEAD.md): GCM and CCM, the modes they are used in

## References

- [RFC 3713: The Camellia Encryption Algorithm](https://www.rfc-editor.org/rfc/rfc3713) / [RFC 5932: Camellia Cipher Suites for TLS](https://www.rfc-editor.org/rfc/rfc5932)
- [RFC 5794: The ARIA Encryption Algorithm](https://www.rfc-editor.org/rfc/rfc5794) / [RFC 6209: ARIA Cipher Suites for TLS](https://www.rfc-editor.org/rfc/rfc6209)
- [draft-ribose-cfrg-sm4-10: The SM4 Blockcipher Algorithm](https://datatracker.ietf.org/doc/draft-ribose-cfrg-sm4/) (English text of GB/T 32907-2016, history in Section 1.2, test vectors in Appendix A.1)
- [ISO/IEC 18033-3:2010/Amd 1:2021: SM4](https://www.iso.org/standard/81564.html)
- [RFC 8998: ShangMi (SM) Cipher Suites for TLS 1.3](https://www.rfc-editor.org/rfc/rfc8998)
- [RFC 7801: GOST R 34.12-2015: Block Cipher "Kuznyechik"](https://www.rfc-editor.org/rfc/rfc7801) / [RFC 8891: Magma](https://www.rfc-editor.org/rfc/rfc8891) / [RFC 9367: GOST Cipher Suites for TLS 1.3](https://www.rfc-editor.org/rfc/rfc9367)
- [Biryukov, Perrin, Udovenko, "Reverse-Engineering the S-Box of Streebog, Kuznyechik and STRIBOBr1" (EUROCRYPT 2016)](https://eprint.iacr.org/2016/071) / [Perrin, "Partitions in the S-Box of Streebog and Kuznyechik" (ToSC 2019)](https://eprint.iacr.org/2019/092)
