# AEAD (authenticated encryption)

*One call that encrypts and also proves nothing was changed: a key, a nonce
that never repeats, and a tag. AES-GCM and ChaCha20-Poly1305 carry most of
today's traffic.*

**Status and standards:** see [Cipher modes and AEAD](../index.md#5-cipher-modes-and-aead)
in the main table.

## What it is

Plain encryption hides data but doesn't stop changes: flip a bit of a CTR or
ChaCha20 ciphertext and the same bit flips in the plaintext. Protocols used
to glue a cipher to a MAC themselves and often got it wrong; the CBC
padding oracles in TLS came from that (see [Classic modes](Classic-Modes.md)).
An AEAD, authenticated encryption with associated data, does both jobs in
one algorithm. RFC 5116 (2008) fixed the interface protocols code against:

- **encrypt(K, N, P, A)** returns the ciphertext with a tag on the end, and
  **decrypt(K, N, A, C)** returns the plaintext or FAIL, nothing else.
- **K**, the key: random and secret.
- **N**, the nonce: not secret, but it must never repeat under one key.
  RFC 5116 recommends 12 bytes, a fixed part plus a counter.
- **A**, the associated data: headers, sequence numbers, a file name. It
  stays readable but the tag covers it, so changing one byte of it makes
  decryption fail.
- **The tag**, usually 16 bytes. Without the key nobody can make a valid one.

| Algorithm | Key | Nonce | Tag | Built from | If a nonce repeats | Where |
|---|---|---|---|---|---|---|
| AES-GCM | 128 / 256 | 96 | 128 | AES-CTR + GHASH | XOR of plaintexts leaks; forgeries under the whole key | TLS, IPsec, SSH |
| ChaCha20-Poly1305 | 256 | 96 | 128 | ChaCha20 + Poly1305 | XOR of plaintexts leaks; forgeries under that nonce | TLS, WireGuard, SSH |
| AES-GCM-SIV | 128 / 256 | 96 | 128 | AES-CTR + POLYVAL, keys per nonce | only shows two messages were equal | nonces you can't trust |
| AES-CCM | 128 / 256 | 56–104 | 32–128 | AES-CTR + CBC-MAC | XOR of plaintexts leaks | Wi-Fi, Bluetooth LE, Zigbee |
| AES-OCB | 128 / 256 | up to 120 | up to 128 | one AES call per block | confidentiality and authenticity lost | OpenPGP, Mosh |
| Ascon-AEAD128 | 128 | 128 | 128 | 320-bit permutation | plaintexts exposed; integrity holds | small devices |
| AEGIS-128L / 256 | 128 / 256 | 128 / 256 | 128 or 256 | AES round function | XOR of plaintexts leaks | libsodium |

Sizes are in bits.

## How it works

### AES-GCM

McGrew and Viega (2004); NIST SP 800-38D (2007). AES in counter mode
encrypts. GHASH evaluates the associated data, the ciphertext and their
lengths as a polynomial at H = AES(K, 0¹²⁸) in GF(2¹²⁸), and AES of the
first counter block masks the result into the tag. With AES and carry-less
multiply instructions it is very fast, and TLS 1.3 makes
`TLS_AES_128_GCM_SHA256` mandatory to implement.

- **A repeated nonce is fatal.** The XOR of the two plaintexts leaks, and
  the two tags give an equation in H, which lets the attacker forge under
  that key (Joux, 2006). In 2016 Böck and others found 184 HTTPS servers
  repeating GCM nonces.
- **Random nonces wear out.** SP 800-38D allows at most 2³² messages per
  key with random 96-bit nonces, which keeps the chance of a repeat near
  2⁻³³. A counter has no such limit; TLS 1.3 XORs the record number into a
  fixed IV.
- Up to 2³⁹ − 256 bits, about 64 GB, per message.
- **A revision is coming.** In March 2024 NIST decided to revise SP 800-38D:
  drop tags shorter than 96 bits, confirm that TLS 1.3's nonce
  construction is approved, and clarify the other nonce rules. A second
  call for early comments (June 2026) adds wGCM for 256-bit blocks; there
  is no draft text yet.

### ChaCha20-Poly1305

Bernstein's ChaCha20 stream cipher with his Poly1305 one-time
authenticator. Adam Langley's 2013 draft brought it to TLS; RFC 7539 (2015),
now RFC 8439 (2018), is the spec. ChaCha20 block 0 for the key and nonce
gives a fresh Poly1305 key, the plaintext is XORed with the keystream from
block 1 on, and Poly1305 tags the padded associated data, the padded
ciphertext and the two lengths. Up to about 256 GB per message.

It exists because AES is only fast when the CPU has AES instructions.
ChaCha20 is fast in plain software and naturally constant-time, so it wins
on phones, embedded devices and older servers. TLS 1.3, WireGuard and
OpenSSH all offer it; OpenSSH's `chacha20-poly1305@openssh.com` (2014) is
its own variant that also encrypts the packet length. A repeated nonce
gives away the Poly1305 key for that nonce, as the
[Universal hash MACs](../06-mac/Universal-Hash-MACs.md) page shows.
XChaCha20-Poly1305 has a 192-bit nonce, so random nonces never collide in
practice; see [ChaCha](../04-symmetric-ciphers/ChaCha.md).

### AES-GCM-SIV

Gueron and Lindell (CCS 2015); RFC 8452 (2019). Each nonce first derives
its own authentication and encryption keys. POLYVAL, a little-endian twin
of GHASH, runs over the associated data and the *plaintext*; AES of that
value, with the nonce mixed in, is the tag, and the tag is also the
starting counter for AES-CTR. So a repeated nonce only shows whether two
messages were equal. The price is two passes: encryption can't start until
the whole message is in. RFC 8452 allows 2³² random-nonce messages of up to
8 GB per key, or 2⁴⁸ of up to 32 MB.

### AES-CCM

Whiting, Housley and Ferguson wrote it for Wi-Fi in 2002; RFC 3610 (2003)
and SP 800-38C (2004). A CBC-MAC over the nonce, the length, the
associated data and the plaintext, then AES-CTR over the plaintext and the
MAC, all under one key. Two AES calls per block, the length must be known
up front, and it only ever runs AES forwards, which keeps chips small. The
nonce is 7 to 13 bytes, the tag 4 to 16. WPA2 and WPA3 (CCMP), Bluetooth LE
and IEEE 802.15.4 (Zigbee, Thread) use it, and TLS 1.3 defines two CCM
suites.
NIST decided in April 2025 to revise SP 800-38C, together with CMAC's
SP 800-38B; no draft has appeared yet.

### AES-OCB

Rogaway, Bellare, Black and Krovetz (CCS 2001); RFC 7253 (2014) has OCB3
from 2011. Each block is XORed with a secret offset, encrypted and XORed
again, and an encrypted checksum of the plaintext gives the tag: about one
AES call per block, parallel and in one pass. OCB was patented and licensed
for years; Rogaway has since put it in the public domain and let the
patents lapse. OCB2 (2004) was broken in 2018; OCB3 is a different design
and isn't affected. OpenPGP (RFC 9580, 2024) makes OCB mandatory, and Mosh
encrypts with AES-128-OCB3.

### AEGIS

Wu and Preneel (SAC 2013). AEGIS-128 shared the high-performance slot of
the CAESAR final portfolio (2019) with OCB, and RFC 10032 (September 2026)
specifies AEGIS-128L, AEGIS-256 and the multi-lane 128X and 256X. The state
is eight (128L) or six (256) AES blocks, and each message block goes in
with one AES round per state block. There is no key schedule. It beats
AES-GCM by a wide margin on CPUs with AES instructions. AEGIS-128L takes
2⁴⁸ random-nonce messages per key and AEGIS-256 has no practical limit.
RFC 10032 expects it to commit to the key (2⁶⁴ work with a 128-bit tag,
2¹²⁸ with 256) as long as the attacker can't choose the associated data.
libsodium ships it.

## Ascon

Dobraunig, Eichlseder, Mendel and Schläffer submitted Ascon to CAESAR in
2014; it was the first choice for lightweight use in the final portfolio
(2019). NIST picked it in February 2023 at the end of its lightweight
cryptography project, and SP 800-232 (August 2025) is the standard, aimed
at sensors and embedded chips where AES is too big or too slow.

| Function | Job | Sizes | Security |
|---|---|---|---|
| Ascon-AEAD128 | AEAD | 128-bit key, nonce and tag | 128 |
| Ascon-Hash256 | hash | 256-bit output | 128 |
| Ascon-XOF128 | extendable output | any length | up to 128 |
| Ascon-CXOF128 | XOF with a customization string | any length | up to 128 |

- One 320-bit permutation runs everything: five 64-bit words, a 5-bit
  S-box and XOR-and-rotate mixing.
- **AEAD** is a duplex: load a constant, the key and the nonce, run 12
  rounds and XOR the key in again. Absorb associated data and plaintext
  128 bits at a time with 8 rounds in between. At the end mix the key in,
  run 12 rounds, and the tag is the last 128 bits XOR the key.
- **Hash and XOF** are a plain sponge with a 64-bit rate and 12 rounds.
- SP 800-232 starts from the submission's Ascon-128a but switched to
  little-endian byte order and new initial values, so old test vectors
  don't match.
- At most 2⁵⁴ bytes per key. Tags may be cut to 32 bits, below 64 only
  after a risk analysis. An optional nonce-masking mode XORs a second
  128-bit key into the nonce, for better security across many keys.
- A repeated nonce exposes the plaintexts, but integrity holds as long as
  no nonce and associated data pair repeats more than 2⁸ times.

## When to use it

- **AES-GCM** where the CPU has AES instructions (most servers, laptops and
  phones), with counter nonces the way TLS does it. See
  [AES](../04-symmetric-ciphers/AES.md) for the block-cipher side.
- **ChaCha20-Poly1305** in pure software or when you want simpler
  constant-time code. The two are interchangeable in TLS 1.3.
- **Random or untrusted nonces,** such as many machines sharing a key or
  VMs restored from snapshots: AES-GCM-SIV, XChaCha20-Poly1305 or AEGIS-256.
- **Small hardware:** Ascon-AEAD128, or AES-CCM where Wi-Fi, Bluetooth or
  Zigbee call for it.
- **Use the AEAD interface, never raw ChaCha20 or AES-CTR alone.**
  Encryption without the tag leaves you open to tampering.

## Example (Python)

With PyCA `cryptography` (`pip install cryptography`):

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

key = ChaCha20Poly1305.generate_key()   # 32 bytes
aead = ChaCha20Poly1305(key)

nonce = os.urandom(12)                   # 96-bit, unique for every message
header = b"v1|message-id-42"             # associated data: authenticated, not encrypted

ct = aead.encrypt(nonce, b"secret data", header)
pt = aead.decrypt(nonce, ct, header)     # raises if the tag or header don't match
```

`AESGCM`, `AESGCMSIV`, `AESCCM` and `AESOCB3` take the same
`encrypt(nonce, data, associated_data)` calls. Run with cryptography 50.0.1
on Python 3.13, these four and `ChaCha20Poly1305` each turn
`b"secret data"` into 27 bytes (the data plus a 16-byte tag) and give it
back, and a changed header or ciphertext byte raises `InvalidTag`. The
two halves of ChaCha20-Poly1305 run from the standard library on the
[ChaCha](../04-symmetric-ciphers/ChaCha.md) and
[Universal hash MACs](../06-mac/Universal-Hash-MACs.md) pages.

## Security notes

- **Never reuse a nonce with the same key.** GCM-SIV survives it, but don't
  plan on that. Use a counter, or random nonces within the limits above. See
  [Why does randomness matter](../FAQ.md).
- **Never use unverified plaintext.** Decryption either returns the
  plaintext or fails. APIs that stream out plaintext before the tag is
  checked lose the protection; RFC 8452 and RFC 10032 forbid it.
- **Rekey before the limits.** TLS 1.3 asks for a new key after about 2²⁴·⁵
  full records with AES-GCM.
- **Most AEADs don't commit to the key.** With GCM or ChaCha20-Poly1305 one
  ciphertext can be built to decrypt under two keys. Dodis and others used
  that in 2018 to get abusive images past Facebook Messenger's abuse
  reporting, and it lets an attacker test many passwords at once against
  password-derived keys (partitioning oracles, 2021).
- **Short tags are forgeable.** 32- or 64-bit tags only where the protocol
  caps failed attempts.
- **Lengths leak.** Pad if the length gives something away.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: AES-GCM, and what a reused nonce gives away"

    Two messages sealed with AES-128-GCM under the same key (`00 01 … 0f`) **and the same nonce** (12 zero
    bytes), the mistake GCM cannot survive. Computed with Python's `cryptography`:

    | | Plaintext | Ciphertext (first 13 bytes) |
    |---|---|---|
    | Message 1 | `pay alice $10` | `39b7fe73 f8f7cfef 86a95e59 50` |
    | Message 2 | `pay steve $99` | `39b7fe73 eaefc3fa 86a95e51 59` |
    | XOR of the two | `00000000 12180c15 00000008 09` | `00000000 12180c15 00000008 09` |

    The XOR of the ciphertexts equals the XOR of the plaintexts, because both used the same keystream. Anyone
    who knows or guesses one message reads the other, and with two tags under one nonce the authentication
    key `H` can be solved for too, so forgeries follow (Joux's "forbidden attack", 2006). Each message also
    carries a 16-byte tag; with distinct nonces none of this works.

??? abstract "The math, with formulas"

    **GCM (NIST SP 800-38D):**

    ```
    H   = AES_K(0¹²⁸)                         hash key
    J₀  = nonce ‖ 0³¹ ‖ 1                      for a 96-bit nonce
    Cᵢ  = Pᵢ ⊕ AES_K(J₀ + i)                   counter mode, i = 1, 2, …
    S   = GHASH_H(A ‖ pad ‖ C ‖ pad ‖ len(A) ‖ len(C))
    Tag = AES_K(J₀) ⊕ S
    ```

    **GHASH** treats each 16-byte block `Xᵢ` as an element of GF(2¹²⁸) (modulo
    `x¹²⁸ + x⁷ + x² + x + 1`) and evaluates a polynomial at `H`:
    `S = X₁·Hᵐ ⊕ X₂·Hᵐ⁻¹ ⊕ … ⊕ Xₘ·H`. Two different inputs collide with probability at most `m/2¹²⁸`, which
    is why the tag is unforgeable as long as `H` stays secret.

    **ChaCha20-Poly1305 (RFC 8439):** block 0 of ChaCha20 gives the one-time Poly1305 key `(r, s)`; blocks 1, 2, …
    encrypt; the tag is `(Σ cᵢ·r^(q−i+1) mod 2¹³⁰ − 5) + s mod 2¹²⁸` over the AAD, the ciphertext and the
    lengths.

    **Limits.** With random 96-bit nonces, NIST caps one GCM key at 2³² messages (collision chance about
    2⁻³³). AES-GCM-SIV (RFC 8452) derives the nonce-dependent keys and a synthetic IV from the message, so a
    repeated nonce only reveals that two messages were identical.

??? tip "Watch it step by step: sealing a message with AES-GCM"

    <div class="mars-steps" markdown>

    1. From the key, compute the hash key `H = AES(K, 0)`.
    2. Build the first counter block `J₀` from the 12-byte nonce and a counter of 1.
    3. Encrypt counters `J₀ + 1`, `J₀ + 2`, … and XOR them into the plaintext: that is the ciphertext.
    4. Feed the associated data, the ciphertext and their lengths through GHASH: multiply and add in
       GF(2¹²⁸) with `H`.
    5. Encrypt `J₀` and XOR it into the GHASH result: that is the 16-byte tag.
    6. The receiver recomputes the tag first and refuses to decrypt anything whose tag doesn't match.

    </div>

??? info "The math underneath"

    - **Finite fields GF(2¹²⁸)** and polynomial evaluation (GHASH); the prime field mod `2¹³⁰ − 5` (Poly1305).
    - **Universal hashing** (Carter and Wegman, 1979): a keyed hash with provably small collision
      probability, turned into a MAC by a one-time mask. See [Universal-hash MACs](../06-mac/Universal-Hash-MACs.md).
    - **Counter mode** and **pseudorandom permutations**: [Classic modes](Classic-Modes.md), [AES](../04-symmetric-ciphers/AES.md).
    - **The birthday bound**, which sets nonce and data limits.
    - **Security notions:** IND-CPA for privacy plus INT-CTXT for integrity give IND-CCA (Bellare and
      Namprempre, 2000).

## See also

- [Classic modes](Classic-Modes.md): CTR and CBC, what AEAD replaced
- [AES](../04-symmetric-ciphers/AES.md) / [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md): the ciphers inside, and XChaCha20
- [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md) / [Universal hash MACs](../06-mac/Universal-Hash-MACs.md): GMAC, CBC-MAC and Poly1305 on their own
- [Disk encryption](Disk-Encryption.md) / [Key wrap](Key-Wrap.md): modes with no room for a nonce or a tag
- [X25519](../01-key-exchange/ECDH.md) / [HPKE](../03-public-key-encryption/HPKE.md): how the two sides get the key
- [TLS 1.3](../protocols/TLS-1.3.md): the AEAD suites in use

## References

- [RFC 5116: An Interface and Algorithms for Authenticated Encryption](https://www.rfc-editor.org/rfc/rfc5116) (Sections 2, 3.2, 5)
- [NIST SP 800-38D: GCM and GMAC (2007)](https://csrc.nist.gov/pubs/sp/800/38/d/final) (Sections 5.2.1, 8) / [NIST to revise SP 800-38D (2024)](https://csrc.nist.gov/news/2024/nist-to-revise-sp-80038d-gcm-and-gmac-modes) / [second pre-draft call (2026)](https://csrc.nist.gov/pubs/sp/800/38/d/r1/2prd) / McGrew and Viega, "The Security and Performance of the Galois/Counter Mode (GCM) of Operation" (INDOCRYPT 2004)
- [Böck, Zauner, Devlin, Somorovsky and Jovanovic, "Nonce-Disrespecting Adversaries" (WOOT 2016)](https://eprint.iacr.org/2016/475)
- [RFC 8439: ChaCha20 and Poly1305 for IETF Protocols](https://www.rfc-editor.org/rfc/rfc8439) (Sections 2.8, 4) / [Bernstein, "ChaCha, a variant of Salsa20" (2008)](https://cr.yp.to/chacha/chacha-20080128.pdf)
- [RFC 8452: AES-GCM-SIV](https://www.rfc-editor.org/rfc/rfc8452) (Sections 4, 9) / Gueron and Lindell, "GCM-SIV: Full Nonce Misuse-Resistant Authenticated Encryption at Under One Cycle per Byte" (CCS 2015)
- [RFC 3610: CCM](https://www.rfc-editor.org/rfc/rfc3610) / [NIST SP 800-38C](https://csrc.nist.gov/pubs/sp/800/38/c/upd1/final) ([decision to revise, 2025](https://csrc.nist.gov/news/2025/decision-to-revise-sp-800-38b-and-38c)) / IEEE 802.11 (CCMP)
- [RFC 7253: OCB](https://www.rfc-editor.org/rfc/rfc7253) / Rogaway, Bellare, Black and Krovetz (CCS 2001) / Inoue, Iwata, Minematsu and Poettering, "Cryptanalysis of OCB2" (CRYPTO 2019) / [Rogaway, OCB licensing](https://web.cs.ucdavis.edu/~rogaway/ocb/license.htm) / [RFC 9580: OpenPGP](https://www.rfc-editor.org/rfc/rfc9580) (Section 9.6) / [Mosh](https://mosh.org/)
- [RFC 10032: The AEGIS Authenticated Encryption Algorithms (2026)](https://www.rfc-editor.org/rfc/rfc10032) (Sections 1, 9) / Wu and Preneel, "AEGIS: A Fast Authenticated Encryption Algorithm" (SAC 2013) / [CAESAR final portfolio](https://competitions.cr.yp.to/caesar-submissions.html)
- [NIST SP 800-232: Ascon-Based Lightweight Cryptography Standards (August 2025)](https://csrc.nist.gov/pubs/sp/800/232/final) (Sections 1, 4.2–4.4, 5) / [Ascon home page](https://ascon.isec.tugraz.at/)
- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446) (Sections 5.3, 5.5, 9.1)
- Dodis, Grubbs, Ristenpart and Woodage, "Fast Message Franking: From Invisible Salamanders to Encryptment" (CRYPTO 2018) / Len, Grubbs and Ristenpart, "Partitioning Oracle Attacks" (USENIX Security 2021)
- [PyCA `cryptography`: AEAD](https://cryptography.io/en/latest/hazmat/primitives/aead/)

*Weaker sources:* [libsodium documentation](https://doc.libsodium.org/secret-key_cryptography/aead/aegis-256)
for AEGIS in libsodium (since version 1.0.19).
