# National ciphers

*Block ciphers that governments standardized for their own systems:
Camellia in Japan, ARIA in Korea, SM4 in China, Kuznyechik in Russia. Each
has AES's 128-bit block, and none has a known practical attack.*

**Status and standards:** see [Symmetric ciphers](../algorithms/table.md#4-symmetric-ciphers)
in the main table.

## What it is

[AES](AES.md) is a US federal standard. A government that certifies crypto
for its own agencies and banks often wants a cipher it evaluated itself,
in its own national standard, under its own certification scheme. Japan,
Korea, China and Russia each have one. All four have a 128-bit block, so
they fit the usual modes (GCM, CCM, CBC, CTR) without the birthday-bound
trouble of the [old 64-bit ciphers](Retired.md#64-bit-block-ciphers).

## The story

### Camellia {#story-camellia}

- **Who made it:** NTT and Mitsubishi Electric, Japan, 2000.
- **What for:** A Japanese cipher of AES quality, listed by Japan's CRYPTREC and the EU's NESSIE project.
- **What it solved:** It gave Japanese government and industry a choice evaluated at home, and is in TLS and IPsec as an alternative.
- **Where it stands:** Acceptable and unbroken; little used outside Japan.
- **Incidents:** None known.
### ARIA and SEED {#story-aria-and-seed}

- **Who made it:** Korean researchers led by the National Security Research Institute, 2003; Korea's earlier cipher SEED came from KISA in 1998.
- **What for:** A national cipher for Korea's government and banks.
- **What it solved:** In the late 1990s US export rules limited the browsers Koreans could get to weak 40-bit encryption, so Korea wrote SEED and required it for online banking.
- **Where it stands:** ARIA is the Korean standard (KS X 1213) and in TLS. The SEED requirement came at a cost: for years Korean banking needed Internet Explorer and ActiveX plug-ins, until the rules eased after 2014.
- **Incidents:** None in the ciphers. The plug-ins required to run SEED in browsers were themselves a long-running security problem.
### SM4 {#story-sm4}

- **Who made it:** China's State Cryptography Administration; published in 2006 for WAPI, standardized as GB/T 32907-2016 and ISO/IEC 18033-3 in 2021.
- **What for:** A national block cipher for Chinese wireless networks and, later, all commercial use in China.
- **What it solved:** It gave China a cipher under its own standards. China proposed WAPI to ISO as a rival to Wi-Fi's security, but ISO chose the IEEE design in 2006.
- **Where it stands:** Required in China alongside SM2 (signatures) and SM3 (hash); supported by OpenSSL, Linux and Arm and Intel chips.
- **Incidents:** None known in the cipher.
### Kuznyechik {#story-kuznyechik}

- **Who made it:** Russia's FSB and the Technical Committee for Standardization; GOST R 34.12-2015. Its 64-bit predecessor Magma goes back to the Soviet GOST 28147-89.
- **What for:** A Russian national cipher for government and banking.
- **What it solved:** It replaced the old 64-bit GOST cipher with a modern 128-bit design.
- **Where it stands:** Used in Russia; not adopted widely elsewhere.
- **Incidents:** In 2016 Biryukov, Perrin and Udovenko found that its S-box, said to be random, has a hidden mathematical structure; Léo Perrin later described it in full. No attack follows from it, but nobody has explained why it is there.

## How it works

| Cipher | Country | Public since | Key (bits) | Structure | Rounds |
|---|---|---|---|---|---|
| Camellia | Japan | 2000 | 128 / 192 / 256 | Feistel with FL layers | 18 / 24 / 24 |
| ARIA | Korea | 2003 | 128 / 192 / 256 | substitution-permutation | 12 / 14 / 16 |
| SM4 | China | 2006 | 128 | unbalanced Feistel | 32 |
| Kuznyechik | Russia | 2015 | 256 | substitution-permutation | 9 + final key |

**Camellia** was designed by NTT and Mitsubishi Electric in 2000, with the
same interface as AES. It is a Feistel cipher, and every six rounds it
inserts key-dependent $FL$ and $FL^{-1}$ layers. The EU's NESSIE project picked
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
layer over $\mathrm{GF}(2^8)$, then a last key XOR. The same standard also has Magma,
a revised version of the old 64-bit GOST 28147-89 cipher (RFC 8891).
Kuznyechik is RFC 7801 (2016), and RFC 9367 (2023) defines GOST suites for
TLS 1.3.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 415" role="img" aria-labelledby="sk-c-feistel-t"><title id="sk-c-feistel-t">One Feistel round: the right half goes through a function F with the round key and is XORed into the left half, then the halves swap</title><defs><filter id="sk-c-feistel-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-feistel-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-feistel-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-feistel-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-feistel-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="415" filter="url(#sk-c-feistel-paper)"/><g filter="url(#sk-c-feistel-pen)"><text x="30" y="44" class="h">A Feistel round: half mixes the other half</text><path class="p room" d="M140 80 L280 80 L280 124 L140 124Z"/><text x="210.0" y="108.0" text-anchor="middle" class="s">left half</text><path class="p room" d="M360 80 L500 80 L500 124 L360 124Z"/><text x="430.0" y="108.0" text-anchor="middle" class="s">right half</text><path class="p" d="M430 126 L430 330"/><path class="p" d="M430 190 L366 190" marker-end="url(#sk-c-feistel-ah)"/><path class="p gold" d="M270 166 L364 166 L364 214 L270 214Z"/><text x="317.0" y="190.0" text-anchor="middle" class="s">F</text><text x="317.0" y="208.0" text-anchor="middle" class="s">round key</text><path class="p" d="M268 190 L224 190" marker-end="url(#sk-c-feistel-ah)"/><circle cx="210" cy="190" r="12" class="p"/><path class="p" d="M198 190 L222 190 M210 178 L210 202"/><path class="p" d="M210 126 L210 176"/><path class="p" d="M210 202 L210 250 L430 300" marker-end="url(#sk-c-feistel-ah)"/><path class="p" d="M430 250 L210 300" marker-end="url(#sk-c-feistel-ah)"/><path class="p room" d="M140 304 L280 304 L280 344 L140 344Z"/><text x="210.0" y="330.0" text-anchor="middle" class="s">new left</text><path class="p room" d="M360 304 L500 304 L500 344 L360 344Z"/><text x="430.0" y="330.0" text-anchor="middle" class="s">new right</text><text x="30" y="380" class="s">F never has to be undone: running the rounds backwards XORs the same value off again.</text><text x="30" y="400" class="s">Camellia and SM4 are built this way; ARIA and Kuznyechik, like AES, are not.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: the standard test vectors, recomputed"

    Both ciphers' official examples use key and plaintext `0123456789abcdeffedcba9876543210`. Recomputed here
    with Python's `cryptography` library; both match their standards:

    | Cipher | Standard | Ciphertext |
    |---|---|---|
    | SM4 | GB/T 32907-2016, Appendix A | `681edf34d206965e86b3e94f536e4246` |
    | Camellia-128 | RFC 3713, Appendix A | `67673138549669730857065648eabe43` |

    For comparison, the same key and plaintext under AES-128 give a completely different block: each cipher is
    its own fixed but random-looking permutation of the $2^{128}$ possible blocks.

??? abstract "The math, with formulas"

    **Feistel networks (Camellia).** Split the block into halves $L$, $R$; each round
    $L_{i+1} = R_i$, $R_{i+1} = L_i \oplus F(R_i, k_i)$. Decryption runs the same rounds with the keys reversed, whether or not
    $F$ is invertible. Camellia's $F$ is an S-box layer and a byte-mixing layer (the "P-function"); every 6
    rounds the key-dependent $FL$/$FL^{-1}$ layers break up regular structure.

    **Unbalanced Feistel (SM4).** The state is four 32-bit words $X_0, \ldots, X_3$. Each of 32 rounds computes

    $$
    \begin{aligned}
    X_{i+4} &= X_i \oplus T(X_{i+1} \oplus X_{i+2} \oplus X_{i+3} \oplus rk_i) \\
    T(x) &= L(\tau(x)), && \tau = \text{the S-box on each byte} \\
    L(B) &= B \oplus (B \lll 2) \oplus (B \lll 10) \oplus (B \lll 18) \oplus (B \lll 24)
    \end{aligned}
    $$

    The output is $(X_{35}, X_{34}, X_{33}, X_{32})$. The key schedule uses the same shape with a different linear map.

    **SPN (ARIA, Kuznyechik).** Like AES: key XOR, S-boxes, then a linear layer. ARIA's linear layer is a
    $16 \times 16$ binary matrix (branch number 8); Kuznyechik's is a 16-byte LFSR-like transform over $\mathrm{GF}(2^8)$ with the
    polynomial $x^8 + x^7 + x^6 + x + 1$.

    **S-boxes.** SM4's and ARIA's S-boxes, like AES's, are built from the inverse in $\mathrm{GF}(2^8)$ with affine maps.
    Kuznyechik's S-box (shared with the Streebog hash) was presented as random, but Perrin (2019) showed a
    hidden structure in it; no attack follows from it so far.

??? tip "Watch it step by step: one SM4 round"

    <div class="mars-steps" markdown>

    1. The 128-bit block is four 32-bit words $X_0, X_1, X_2, X_3$.
    2. XOR the last three words with the round key: $X_1 \oplus X_2 \oplus X_3 \oplus rk_0$.
    3. Send each of the 4 bytes of that word through the S-box.
    4. Mix with rotations: $B \oplus (B \lll 2) \oplus (B \lll 10) \oplus (B \lll 18) \oplus (B \lll 24)$.
    5. XOR the result into $X_0$ to make the new word $X_4$. The window slides: now $X_1, X_2, X_3, X_4$.
    6. After 32 rounds, output the last four words in reverse order. Decryption is the same with the round
       keys reversed.

    </div>

??? info "The math underneath"

    - **Feistel and substitution–permutation networks:** the two ways to build a block cipher.
    - **Finite fields $\mathrm{GF}(2^8)$** for the S-boxes and linear layers, as in [AES](AES.md).
    - **Branch numbers and MDS matrices:** how linear layers guarantee diffusion.
    - **Differential and linear cryptanalysis**, which every one of these was designed to resist.
    - **Luby–Rackoff (1988):** four Feistel rounds with random functions give a strong pseudorandom
      permutation.

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
