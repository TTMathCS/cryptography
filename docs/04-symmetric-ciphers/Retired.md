# Retired ciphers

*DES, 3DES, the 64-bit block ciphers and RC4: what each one was, what broke
it, and where it still turns up. Keep them only to read old data.*

**Status and standards:** see [Symmetric ciphers](../index.md#4-symmetric-ciphers)
in the main table.

A cipher retires when its key can be searched (DES) or its design leaks
whatever the key size (RC4's biases, 64-bit blocks hitting the birthday
bound). For new work use [AES-GCM](AES.md) or
[ChaCha20-Poly1305](../05-modes-aead/AEAD.md).

## DES

**What it was.** IBM's design, published by the US National Bureau of
Standards as FIPS 46 in January 1977: 16 Feistel rounds, a 64-bit block and
a 56-bit key.

**What broke it.** The key. In July 1998 the EFF's DES Cracker ("Deep
Crack"), built for under $250,000, found a challenge key in less than three
days. In January 1999, with about 100,000 PCs on distributed.net, it took
22 hours 15 minutes, and by 2008 hardware under $15,000 averaged less than
a day (RFC 6649). Differential (Biham and Shamir) and linear (Matsui)
cryptanalysis need 2⁴⁷ chosen or 2⁴³ known plaintexts, so brute force was
the real threat. NIST withdrew FIPS 46-3 on May 19, 2005.

**Where you still see it.** Inside 3DES, and in old 13-character Unix
`crypt(3)` password hashes. Kerberos dropped it with RFC 6649 (2012).

## 3DES

**What it was.** DES three times, encrypt-decrypt-encrypt (EDE) with
three keys: 168 key bits, but meet-in-the-middle cuts the strength to 112.
With all three keys equal it is single DES, which eased the move from DES
hardware. It is in ANSI X9.52 (1998), FIPS 46-3 (1999) and NIST SP 800-67
(2004).

**What broke it.** Not the key but the 64-bit block. Sweet32 (Bhargavan and
Leurent, CCS 2016) recovered a secure HTTPS cookie from a long-lived 3DES
connection after capturing about 785 GB of traffic, in under two days.
NIST cut use to 2²⁰ blocks (8 MB) per key in 2017, and SP 800-131A Rev. 2
(2019) disallowed 3DES encryption after December 31, 2023. SP 800-67 was
withdrawn on January 1, 2024. Decrypting old data is still allowed.

**Where you still see it.** Old TLS servers (TLS 1.3 has no 3DES), old
OpenPGP messages (RFC 9580: MUST NOT encrypt with it), Kerberos realms that
RFC 8429 (2018) asked to move off it, and legacy PKCS#12 files, which
encrypt the private key with 3DES.

## 64-bit block ciphers

Blowfish, IDEA, CAST5 and RC2 have no practical attack on the full cipher
at normal key sizes. What retires them is the block. After about 2³² blocks
(32 GB) under one key, two ciphertext blocks are likely to collide, and in
CBC mode a collision reveals the XOR of two plaintext blocks. Sweet32 did
it in practice against Blowfish in OpenVPN as well as 3DES in TLS. OpenSSL
3.0 moved all four, and single DES, to its legacy provider.

### Blowfish

**What it was.** Bruce Schneier's free, unpatented replacement for DES
(1993): 16 Feistel rounds, key-dependent S-boxes, keys of 32 to 448 bits.
OpenVPN used it by default until 2.5 (2020), and OpenSSH removed
`blowfish-cbc` in 7.6 (2017).

**Where you still see it.** In [bcrypt](../08-kdf-password-hashing/bcrypt.md),
which uses its slow key setup as a password hash, where the block size
doesn't matter.

### IDEA

**What it was.** Xuejia Lai and James Massey's cipher (1991): a 128-bit
key, 8.5 rounds that mix XOR, addition mod 2¹⁶ and multiplication mod
2¹⁶ + 1. It was the cipher of PGP 2. The best attack on all 8.5 rounds, a
biclique attack from 2012, is barely faster than brute force at about 2¹²⁶.

**Where you still see it.** Old PGP messages. RFC 9580 lets implementations
decrypt IDEA, with a warning, but never encrypt with it.

### CAST5

**What it was.** Carlisle Adams's CAST-128, RFC 2144 (1997): 12 or 16
rounds, keys of 40 to 128 bits. GnuPG made it the default cipher in 2002
and dropped it from the default preferences in 2.1 (2014). OpenSSH removed
`cast128-cbc` in 7.6.

**Where you still see it.** Old OpenPGP data, which RFC 9580 treats like
IDEA.

### RC2

**What it was.** Ron Rivest's cipher, an RSA Data Security trade secret
until RFC 2268 (1998). Keys are 1 to 128 bytes, cut down by an "effective
key bits" setting. The US approved RC2 at short key sizes for easier export,
so S/MIME v2 (RFC 2311, 1998) made 40-bit RC2 the one cipher every receiver
had to support.

**Where you still see it.** Old `.p12` / `.pfx` files, which often encrypt
the certificates with 40-bit RC2. OpenSSL 3.0 writes AES-256-CBC by
default and needs `-legacy` to read them.

## RC4

**What it was.** Rivest's 1987 stream cipher, a trade secret until its
source was posted anonymously to the cypherpunks list in September 1994.
The key shuffles a 256-byte permutation; after that each output byte costs
one swap. It was small and fast, so it went everywhere: SSL and TLS, WEP
and WPA-TKIP Wi-Fi, SSH (`arcfour`), and Windows Kerberos (RC4-HMAC,
RFC 4757).

**What broke it.** Biased output, worst at the start of the stream.

- Mantin and Shamir (FSE 2001): the second byte is 0 twice as often as it
  should be.
- Fluhrer, Mantin and Shamir (SAC 2001): with related keys, the first
  bytes leak key bytes. WEP built each packet key from a public IV plus the
  secret key, so it fell to this.
- AlFardan et al. (USENIX Security 2013) used the biases in the first 256
  bytes to recover plaintext repeated over many TLS connections. Vanhoef
  and Piessens (2015) got an HTTPS cookie in 75 hours.

**Retired by** RFC 7465 (2015) for TLS, RFC 8429 (2018) for Kerberos and
RFC 8758 (2020) for SSH. OpenBSD's `arc4random` dropped it for
[ChaCha20](ChaCha.md) in 2014.

**Where you still see it.** Active Directory kept RC4-HMAC as a Kerberos
fallback for compatibility. In December 2025 Microsoft said domain
controllers would switch to AES-only defaults by mid-2026.

The cipher fits in a few lines. This checks it against RFC 6229, then
counts how often the second byte is 0 over 100,000 keys (the fixed seed
makes the counts repeat).

```python
import random

def rc4(key, n):
    S, j = list(range(256)), 0
    for i in range(256):                  # key schedule: shuffle S with the key
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    i = j = 0
    out = []
    for _ in range(n):                    # keystream: one swap, one byte out
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(S[(S[i] + S[j]) % 256])
    return bytes(out)

print(rc4(bytes([1, 2, 3, 4, 5]), 8).hex())   # b2396305f03dc027, as in RFC 6229

random.seed(1)
N = 100000
zeros = sum(rc4(random.randbytes(16), 2)[1] == 0 for _ in range(N))
print(zeros, round(N / 256))              # 822 391: about twice what a fair byte gives
```

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RC4, and why 64-bit blocks wear out"

    **RC4 with key "Key" and plaintext "Plaintext"** (the well-known test). After the key schedule shuffles
    `S = [0 … 255]`, each output byte swaps two entries and reads a third. Recomputed with Python:

    | Byte | `i` | `j = j + S[i]` | After swap `S[i] + S[j]` | Keystream `S[t]` | Plaintext | Ciphertext |
    |---|---|---|---|---|---|---|
    | 1 | 1 | 51 | 78 + 51 = 129 | `eb` | `50` (P) | `bb` |
    | 2 | 2 | 183 | 198 + 132 = 330 → 74 | `9f` | `6c` (l) | `f3` |
    | 3 | 3 | 84 | 20 + 157 = 177 | `77` | `61` (a) | `16` |

    The full ciphertext is `bbf316e8d940af0ad3`.

    **Sweet32 in numbers.** A 64-bit block cipher in CBC mode starts repeating ciphertext blocks after about
    `√(2·ln 2) · 2³²` blocks for a 50% chance, which is about 37.7 GiB of data. Each repeat leaks the XOR of
    two plaintext blocks, which is how the attack read a cookie.

??? abstract "The math, with formulas"

    **RC4:**

    ```
    key schedule:  for i in 0..255:  j = (j + S[i] + key[i mod len]) mod 256;  swap S[i], S[j]
    output:        i = i + 1;  j = j + S[i];  swap S[i], S[j];  output S[(S[i] + S[j]) mod 256]
    ```

    **Its biases.** The second output byte is 0 with probability 2/256 instead of 1/256 (Mantin and Shamir,
    2001), and the first bytes leak key bytes when keys share a prefix, which broke WEP (Fluhrer, Mantin and
    Shamir, 2001). Many such biases together recovered TLS plaintexts (AlFardan and others, 2013).

    **DES (Feistel, 16 rounds):** `Lᵢ₊₁ = Rᵢ`, `Rᵢ₊₁ = Lᵢ ⊕ f(Rᵢ, Kᵢ)`, where `f` expands 32 bits to 48, XORs the
    round key, applies eight 6-to-4-bit S-boxes and permutes. Brute force: 2⁵⁶ ≈ 7.2 × 10¹⁶ keys.

    **3DES and meet-in-the-middle.** `C = E_K3(D_K2(E_K1(P)))`. Two-key double encryption would give only 2⁵⁷
    work: encrypt `P` under all `K1`, decrypt `C` under all `K2`, and match in the middle. That is why triple,
    not double, and why 3 keys give 112-bit, not 168-bit, strength.

    **The birthday bound.** With `b`-bit blocks, `q` random blocks collide with probability about
    `q² / 2^(b+1)`. For `b = 64` that is a coin flip at 2³² blocks; for AES's `b = 128`, at 2⁶⁴.

??? tip "Watch it step by step: RC4's first output byte"

    <div class="mars-steps" markdown>

    1. The key schedule has shuffled the 256 numbers in `S` using the key "Key". `S[1] = 51`.
    2. `i` moves to 1; `j` becomes `0 + S[1] = 51`.
    3. Swap `S[1]` and `S[51]`: now `S[1] = 78` and `S[51] = 51`.
    4. Add them: `78 + 51 = 129`. The keystream byte is `S[129] = eb`.
    5. The first plaintext byte "P" (`50`) XOR `eb` is `bb`, the first ciphertext byte.
    6. Repeat for every byte. The state never resets, so a reused key gives the same keystream: never reuse one.

    </div>

??? info "The math underneath"

    - **Feistel networks** (DES, Blowfish, CAST5) and **Lai–Massey** (IDEA).
    - **Exhaustive key search** and Moore's law: why 56 bits fell and 128 bits will not.
    - **Meet-in-the-middle attacks** on double encryption.
    - **The birthday paradox:** why block size, not just key size, limits a cipher.
    - **Statistical biases in stream ciphers**, and the distinguishers built from them.

## See also

- [AES](AES.md): what replaced DES and 3DES
- [ChaCha and Salsa20](ChaCha.md): what replaced RC4
- [National ciphers](National-Ciphers.md): other 128-bit block ciphers
- [bcrypt](../08-kdf-password-hashing/bcrypt.md): where Blowfish lives on

## References

- [FIPS 46: Data Encryption Standard (1977)](https://csrc.nist.gov/pubs/fips/46/final) / [FIPS 46-3 (1999, withdrawn 2005)](https://csrc.nist.gov/pubs/fips/46-3/final)
- EFF, *Cracking DES: Secrets of Encryption Research, Wiretap Politics and Chip Design* (O'Reilly, 1998) / [RFC 6649: Deprecate DES in Kerberos](https://www.rfc-editor.org/rfc/rfc6649) / [FreeBSD `crypt(3)`](https://man.freebsd.org/cgi/man.cgi?query=crypt&sektion=3)
- Biham and Shamir, "Differential Cryptanalysis of the Full 16-round DES" (CRYPTO '92) / Matsui, "The First Experimental Cryptanalysis of the Data Encryption Standard" (CRYPTO '94)
- [NIST SP 800-67 Rev. 2: TDEA (2017, withdrawn 2024)](https://csrc.nist.gov/pubs/sp/800/67/r2/final) / [NIST, "NIST to Withdraw SP 800-67 Rev. 2" (2023)](https://csrc.nist.gov/News/2023/nist-to-withdraw-sp-800-67-rev-2) / [SP 800-131A Rev. 2](https://csrc.nist.gov/pubs/sp/800/131/a/r2/final)
- [Bhargavan and Leurent, "On the Practical (In-)Security of 64-bit Block Ciphers" (CCS 2016)](https://sweet32.info/)
- Schneier, "Description of a New Variable-Length Key, 64-Bit Block Cipher (Blowfish)" (FSE 1993) / [OpenVPN 2.5 changes](https://github.com/OpenVPN/openvpn/blob/release/2.5/Changes.rst) / [OpenSSH 7.6 release notes](https://www.openssh.com/releasenotes.html)
- Lai and Massey, "A Proposal for a New Block Encryption Standard" (EUROCRYPT '90) / Lai, Massey and Murphy, "Markov Ciphers and Differential Cryptanalysis" (EUROCRYPT '91) / Khovratovich, Leurent and Rechberger, "Narrow-Bicliques: Cryptanalysis of Full IDEA" (EUROCRYPT 2012)
- [RFC 2144: CAST-128](https://www.rfc-editor.org/rfc/rfc2144) / [GnuPG NEWS](https://github.com/gpg/gnupg/blob/master/NEWS) (1.0.7, 2.1.0) / [RFC 9580: OpenPGP](https://www.rfc-editor.org/rfc/rfc9580) (Section 9.3)
- [RFC 2268: RC2](https://www.rfc-editor.org/rfc/rfc2268) / [RFC 2311: S/MIME v2](https://www.rfc-editor.org/rfc/rfc2311) (Section 2.6) / [OpenSSL 3.0 `openssl-pkcs12`](https://docs.openssl.org/3.0/man1/openssl-pkcs12/) / [OpenSSL legacy provider](https://docs.openssl.org/3.0/man7/OSSL_PROVIDER-legacy/)
- Mantin and Shamir, "A Practical Attack on Broadcast RC4" (FSE 2001) / Fluhrer, Mantin and Shamir, "Weaknesses in the Key Scheduling Algorithm of RC4" (SAC 2001)
- [AlFardan et al., "On the Security of RC4 in TLS and WPA" (USENIX Security 2013)](https://www.usenix.org/conference/usenixsecurity13/technical-sessions/paper/alFardan) / [Vanhoef and Piessens, RC4 NOMORE (USENIX Security 2015)](https://www.rc4nomore.com/)
- [RFC 7465: Prohibiting RC4 Cipher Suites](https://www.rfc-editor.org/rfc/rfc7465) / [RFC 8429: Deprecate 3DES and RC4 in Kerberos](https://www.rfc-editor.org/rfc/rfc8429) / [RFC 8758: Deprecating RC4 in SSH](https://www.rfc-editor.org/rfc/rfc8758) / [RFC 4757: RC4-HMAC](https://www.rfc-editor.org/rfc/rfc4757) / [RFC 6229: RC4 test vectors](https://www.rfc-editor.org/rfc/rfc6229)

*Weaker sources:* [EFF's DES Cracker page and press releases (1998, 1999)](https://w2.eff.org/Privacy/Crypto/Crypto_misc/DESCracker/) for the cost and timings; the [cypherpunks list (September 1994)](https://cypherpunks.venona.com/date/1994/09/msg00304.html) for the RC4 leak; [heise, "Microsoft Sweeps RC4 Remnants from Kerberos" (December 2025)](https://heise.de/-11118258) for the Active Directory plan; the 1987 date for RC4 is from secondary accounts.
