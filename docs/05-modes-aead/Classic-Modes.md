# Classic modes

*ECB, CBC, CFB, OFB and CTR: the older ways to run a block cipher over a
long message. They hide data but don't protect it, and that gap fed years
of attacks on TLS.*

**Status and standards:** see [Cipher modes and AEAD](../index.md#5-cipher-modes-and-aead)
in the main table.

[AES](../04-symmetric-ciphers/AES.md) encrypts one 16-byte block; a mode
says how to use it on a whole message. FIPS 81 (1980) defined ECB, CBC,
CFB and OFB for DES and was withdrawn in 2005. SP 800-38A (2001) has the
same four for AES, plus CTR. None of them notices a changed ciphertext. In
2023 NIST decided to revise SP 800-38A, limit ECB to uses other NIST
standards name, and push authentication. For new work use an
[AEAD](AEAD.md).

| Mode | IV | Parallel | One flipped ciphertext bit |
|---|---|---|---|
| ECB | none | both ways | garbles its block |
| CBC | unpredictable | decryption only | garbles its block, flips that bit in the next |
| CFB | unpredictable | decryption only | flips that bit, garbles the next 16 bytes |
| OFB | unique | no (keystream can be made ahead) | flips that bit |
| CTR | unique counter blocks | both ways | flips that bit |

## ECB

**How it works.** Each block is encrypted alone: Cᵢ = E(K, Pᵢ).

**What goes wrong.** Equal plaintext blocks give equal ciphertext blocks.
The famous picture is the "ECB penguin": a bitmap of Tux, the Linux
mascot, encrypted in ECB, and the penguin is still plain to see. Blocks can
also be cut, swapped or replayed. Zoom's client up to 4.6.9 encrypted
meeting audio and video this way (CVE-2020-11500). NIST still allows ECB
for one-block jobs such as the PIV card challenge in SP 800-73-4.

## CBC

**How it works.** XOR each plaintext block with the previous ciphertext
block, then encrypt: Cᵢ = E(K, Pᵢ ⊕ Cᵢ₋₁), with C₀ the IV. The IV must be
unpredictable. The message is padded to whole blocks; PKCS#7 adds n bytes
of value n.

**What goes wrong.**

- **Predictable IVs.** TLS 1.0 used the last ciphertext block of one record
  as the next IV, and BEAST (Duong and Rizzo, 2011) used that to read
  cookies. TLS 1.1 already had a fresh IV per record.
- **Padding oracles.** Vaudenay (EUROCRYPT 2002): if the receiver lets
  slip whether the padding was valid, by an error or by timing, an attacker
  can decrypt any block by editing the one before it, at most 256 tries per
  byte. TLS 1.2 sends one alert for every error and always checks the MAC,
  and RFC 5246 says "a small timing channel" is left but too small to use.
- **Lucky 13.** AlFardan and Paterson (IEEE S&P 2013) used it: the MAC
  takes longer or shorter depending on how much the padding strips off.
  The name is for the 13 header bytes in the TLS MAC. OpenSSL's fix later
  opened a new padding oracle (CVE-2016-2107).
- **POODLE.** Möller, Duong and Kotowicz (Google, 2014): SSL 3.0 checks
  only the last padding byte, and the MAC doesn't cover the padding. After
  forcing a fallback to SSL 3.0, an attacker learns about one cookie byte
  per 256 requests. RFC 7568 (2015) deprecated SSL 3.0.

## CFB

**How it works.** The previous ciphertext goes through the cipher to make
keystream: Cᵢ = Pᵢ ⊕ E(K, Cᵢ₋₁). SP 800-38A also allows s-bit segments
(CFB1, CFB8, CFB128). Only the forward cipher is used, and decryption gets
back in step by itself after a damaged segment. OpenPGP uses a variant
(RFC 4880, Section 13.9).

**What goes wrong.** The first block is P₁ ⊕ E(K, IV), so a repeated IV
leaks P₁ ⊕ P₁′. Zerologon (CVE-2020-1472) shows how bad a fixed IV gets:
Netlogon ran AES-CFB8 with an all-zero IV. For one key in 256 the first
byte of E(K, 0) is zero, and then all-zero plaintext encrypts to all
zeros. An attacker sending zeros got in after about 256 tries.

## OFB

**How it works.** Encrypt the IV, encrypt that, and so on; XOR the
keystream with the plaintext. It never depends on the data, so a bit error
in transit damages only that bit.

**What goes wrong.** The usual stream cipher trouble: a repeated IV
repeats the keystream, and flipped ciphertext bits flip the same plaintext
bits. The IV must also not equal an earlier output block, or the keystream
restarts partway. FIPS 81 allowed feeding back fewer than 64 bits, which
Davies and Parkin (1982) showed cuts the average cycle from 2⁶³ steps to
about 2³². SP 800-38A keeps only full-block feedback.

## CTR

**How it works.** Encrypt a counter block and XOR it in: Cᵢ = Pᵢ ⊕ E(K, Tᵢ),
with Tᵢ going up by one each block. Diffie and Hellman suggested it in
1979, but it waited until SP 800-38A for a NIST standard. It runs in
parallel, any block decrypts alone, and there is no padding. GCM and CCM
are CTR plus a MAC.

**What goes wrong.** A counter block must never repeat under one key,
across all messages. If one does, C ⊕ C′ = P ⊕ P′, and one known plaintext
gives the other. With random 64-bit nonces a repeat is expected after about
2³² messages. KRACK (Vanhoef and Piessens, CCS 2017) made WPA2 devices
reinstall a key and reset the packet number, so CCMP reused keystream and
packets could be decrypted.

## Encrypt-then-MAC or MAC-then-encrypt

These modes need a MAC, and the order matters. Three old protocols picked
one order each:

- **MAC-then-encrypt:** MAC the plaintext, encrypt both. SSL and TLS up to
  1.2.
- **Encrypt-and-MAC:** encrypt, and MAC the plaintext alongside. SSH
  (RFC 4253).
- **Encrypt-then-MAC:** encrypt, then MAC the ciphertext. IPsec ESP.

Bellare and Namprempre (ASIACRYPT 2000) proved encrypt-then-MAC secure for
any secure cipher and MAC, and the other two not secure in general;
Krawczyk (CRYPTO 2001) went through the three protocols. With
encrypt-then-MAC the receiver checks the tag first and drops a forgery
unread, so there is no padding check to probe. RFC 7366 (2014) added it to
TLS as an extension. An AEAD does the same job in one algorithm.

## Why TLS 1.3 dropped CBC

From SSL 3.0 to TLS 1.2, CBC ran MAC-then-encrypt, and each fix patched the
same design: fresh IVs for BEAST, one alert and a MAC check every time for
padding oracles, constant-time code for Lucky 13, then a bug in that code.
RFC 7457 (2015) puts the padding oracles down to MAC-then-encrypt itself.
TLS 1.3 (RFC 8446, 2018) kept only AEAD ciphers: AES-GCM,
ChaCha20-Poly1305 and AES-CCM.

## When to use them

- **Not for new designs.** Use AES-GCM or ChaCha20-Poly1305.
- **CTR** inside a bigger construction, or with an encrypt-then-MAC tag.
- **CBC, CFB, OFB** only to read old data or talk to old systems. **ECB**
  only for one block.

## Example (Python)

Python's standard library has no AES, so a toy 16-byte block cipher, four
Feistel rounds over HMAC-SHA256, stands in. It is only there so the modes
have something to call. First ECB against CBC on three equal blocks, then a
padding oracle attack that reads a CBC block from the server's yes or no
about the padding.

```python
import hmac, os

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def F(k, r, x):                    # round function: HMAC-SHA256 cut to 8 bytes
    return hmac.digest(k, bytes([r]) + x, "sha256")[:8]

def E(k, b):                       # toy 16-byte block cipher in place of AES
    L, R = b[:8], b[8:]
    for r in range(4):
        L, R = R, xor(L, F(k, r, R))
    return L + R

def D(k, b):
    L, R = b[:8], b[8:]
    for r in (3, 2, 1, 0):
        L, R = xor(R, F(k, r, L)), L
    return L + R

def cbc(k, iv, p):
    c = b""
    for i in range(0, len(p), 16):
        iv = E(k, xor(p[i:i + 16], iv))
        c += iv
    return c

key = os.urandom(16)
msg = b"YELLOW SUBMARINE" * 3                         # three equal blocks
c = cbc(key, os.urandom(16), msg)
print(len({E(key, msg[i:i + 16]) for i in range(0, 48, 16)}),   # ECB: 1 distinct block
      len({c[i:i + 16] for i in range(0, 48, 16)}))             # CBC: 3

def oracle(iv, c):                 # the server: is the padding good?
    p = xor(D(key, c), iv)
    return 1 <= p[-1] <= 16 and p[-p[-1]:] == bytes([p[-1]]) * p[-1]

def attack(prev, c):               # recover block c from the oracle alone
    mid = bytearray(16)            # becomes D(key, c), last byte first
    for i in range(15, -1, -1):
        n = 16 - i                 # aim for n padding bytes of value n
        f = bytearray(m ^ n for m in mid)
        for g in range(256):
            f[i] = g
            if oracle(bytes(f), c):
                if i == 15:        # rule out a lucky ...02 02 ending
                    f[14] ^= 1
                    if not oracle(bytes(f), c):
                        continue
                break
        mid[i] = g ^ n
    return xor(mid, prev)

iv = os.urandom(16)
c = cbc(key, iv, b"PIN=4417;user=jo" + bytes([16]) * 16)   # PKCS#7: a full padding block
print(attack(iv, c[:16]))          # b'PIN=4417;user=jo'
```

The attacker sends the block with a fake IV. When the padding is good, the
last byte came out as 01, which gives the last byte of D(key, c). Then it
aims for 02 02, and so on back to the first byte. XOR with the real IV
gives the plaintext.

## Security notes

- CBC and CFB need an unpredictable IV; OFB and CTR need values that never
  repeat under the key.
- Change keys long before 2⁶⁴ blocks with AES. With 64-bit blocks the limit
  is close enough to hit: see [Sweet32](../04-symmetric-ciphers/Retired.md#64-bit-block-ciphers).
- To decrypt CBC at all, check a MAC over the ciphertext first, and never
  let errors or timing depend on the padding.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: ECB shows the pattern, CBC hides it"

    The 32-byte plaintext `YELLOW SUBMARINEYELLOW SUBMARINE` is the same 16-byte block twice. Encrypted with
    AES-128 (key all zeros; CBC IV `00 01 … 0f`), computed with Python's `cryptography`:

    | Mode | Block 1 | Block 2 |
    |---|---|---|
    | ECB | `9f966ace ece847cd 3333bb0f d5306172` | `9f966ace ece847cd 3333bb0f d5306172` |
    | CBC | `e73b6f01 735b3920 86885f75 3cd2eca6` | `7cb33a72 35464909 f9c9847c 0c7bd12d` |

    ECB turns equal blocks into equal ciphertext, which is how the famous "ECB penguin" stays visible. CBC
    XORs each block with the previous ciphertext first, so the repeat disappears.

??? abstract "The math, with formulas"

    | Mode | Encrypt | Decrypt | Notes |
    |---|---|---|---|
    | ECB | `Cᵢ = E(Pᵢ)` | `Pᵢ = D(Cᵢ)` | equal blocks leak |
    | CBC | `Cᵢ = E(Pᵢ ⊕ Cᵢ₋₁)`, `C₀ = IV` | `Pᵢ = D(Cᵢ) ⊕ Cᵢ₋₁` | IV must be unpredictable; needs padding |
    | CFB | `Cᵢ = Pᵢ ⊕ E(Cᵢ₋₁)` | `Pᵢ = Cᵢ ⊕ E(Cᵢ₋₁)` | self-synchronizing stream |
    | OFB | `Oᵢ = E(Oᵢ₋₁)`, `Cᵢ = Pᵢ ⊕ Oᵢ` | same | keystream independent of data |
    | CTR | `Cᵢ = Pᵢ ⊕ E(nonce ‖ i)` | same | parallel; nonce must never repeat |

    **The padding oracle (Vaudenay, 2002).** In CBC, `Pᵢ = D(Cᵢ) ⊕ Cᵢ₋₁`. An attacker who changes the last byte
    of `Cᵢ₋₁` to `g` and learns only "padding OK" (last byte `01`) knows `D(Cᵢ)` ends in `g ⊕ 01`; XOR with the
    real `Cᵢ₋₁` byte gives the plaintext byte. At most 256 tries per byte, so a 16-byte block falls in at most
    4,096 queries. That is why CBC must be paired with a MAC checked first (encrypt-then-MAC), or replaced by
    an AEAD.

    **CTR keystream reuse.** With a repeated nonce, `C ⊕ C′ = P ⊕ P′`, the same failure as a reused one-time
    pad.

??? tip "Watch it step by step: CBC encryption"

    <div class="mars-steps" markdown>

    1. Split the message into 16-byte blocks and pad the last one.
    2. XOR block 1 with a random IV, then encrypt: that is `C₁`.
    3. XOR block 2 with `C₁`, then encrypt: that is `C₂`.
    4. Continue: every block depends on all blocks before it.
    5. Decryption reverses it: decrypt `Cᵢ`, then XOR with `Cᵢ₋₁`.
    6. Equal plaintext blocks now give different ciphertext blocks, unlike ECB.

    </div>

??? info "The math underneath"

    - **Block ciphers as pseudorandom permutations:** [AES](../04-symmetric-ciphers/AES.md).
    - **XOR and the one-time pad:** why reusing a keystream is fatal.
    - **IND-CPA security:** CBC with a random IV and CTR with unique nonces are secure against eavesdroppers,
      ECB is not.
    - **Chosen-ciphertext attacks:** padding oracles and why integrity comes first ([AEAD](AEAD.md)).
    - **The birthday bound:** CBC and CTR wear out after about 2⁶⁴ blocks with AES (2³² with 64-bit ciphers).

## See also

- [ChaCha20-Poly1305](AEAD.md): an AEAD, what to use instead
- [AES](../04-symmetric-ciphers/AES.md): the block cipher these modes usually run
- [Disk encryption](Disk-Encryption.md): XTS, a mode built for sectors
- [Key wrap](Key-Wrap.md): a mode built for encrypting keys
- [TLS 1.3](../protocols/TLS-1.3.md): the protocol that went AEAD-only

## References

- [FIPS 81: DES Modes of Operation (1980, withdrawn 2005)](https://csrc.nist.gov/pubs/fips/81/final) / [NIST SP 800-38A (2001)](https://csrc.nist.gov/pubs/sp/800/38/a/final) / [NIST, "Decision to Revise SP 800-38A" (2023)](https://csrc.nist.gov/News/2023/decision-to-revise-nist-sp-800-38a)
- [Mouha and Dworkin, NIST IR 8459: Report on the Block Cipher Modes of Operation in the NIST SP 800-38 Series (2024)](https://csrc.nist.gov/pubs/ir/8459/final) (Section 4)
- Diffie and Hellman, "Privacy and Authentication: An Introduction to Cryptography", Proc. IEEE 67 (1979) / Davies and Parkin, "The Average Cycle Size of the Key Stream in Output Feedback Encipherment" (CRYPTO '82)
- [Vaudenay, "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002)](https://iacr.org/archive/eurocrypt2002/23320530/cbc02_e02d.pdf) / [RFC 5246: TLS 1.2](https://www.rfc-editor.org/rfc/rfc5246) (Section 6.2.3.2)
- [AlFardan and Paterson, "Lucky Thirteen: Breaking the TLS and DTLS Record Protocols" (IEEE S&P 2013)](http://www.isg.rhul.ac.uk/tls/Lucky13.html) / [CVE-2016-2107](https://nvd.nist.gov/vuln/detail/CVE-2016-2107)
- [Möller, Duong and Kotowicz, "This POODLE Bites: Exploiting the SSL 3.0 Fallback" (2014)](https://openssl-library.org/files/ssl-poodle.pdf) / [RFC 7568: Deprecating SSL 3.0](https://www.rfc-editor.org/rfc/rfc7568)
- [RFC 7457: Summarizing Known Attacks on TLS and DTLS](https://www.rfc-editor.org/rfc/rfc7457) / [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446) (Section 1.2)
- Bellare and Namprempre, "Authenticated Encryption: Relations among Notions and Analysis of the Generic Composition Paradigm" (ASIACRYPT 2000) / Krawczyk, "The Order of Encryption and Authentication for Protecting Communications (or: How Secure Is SSL?)" (CRYPTO 2001)
- [RFC 7366: Encrypt-then-MAC for TLS and DTLS](https://www.rfc-editor.org/rfc/rfc7366) / [RFC 4253: SSH Transport Layer](https://www.rfc-editor.org/rfc/rfc4253) (Section 6.4) / [RFC 4880: OpenPGP](https://www.rfc-editor.org/rfc/rfc4880) (Section 13.9)
- [Vanhoef and Piessens, "Key Reinstallation Attacks: Forcing Nonce Reuse in WPA2" (CCS 2017)](https://www.krackattacks.com/)
- [CVE-2020-11500 (Zoom)](https://nvd.nist.gov/vuln/detail/CVE-2020-11500) / [CVE-2020-1472 (Zerologon)](https://nvd.nist.gov/vuln/detail/CVE-2020-1472)

*Weaker sources:* [Wikimedia Commons, "Tux_ecb.jpg"](https://commons.wikimedia.org/wiki/File:Tux_ecb.jpg) for the ECB penguin; [Tervoort, "Zerologon" whitepaper (Secura, 2020)](https://www.secura.com/uploads/factsheets/Zerologon.pdf) for the CFB8 details.
