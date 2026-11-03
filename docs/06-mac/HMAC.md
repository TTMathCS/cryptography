# HMAC (Hash-based Message Authentication Code)

*A keyed hash that proves a message came from someone who knows the secret and
wasn't changed on the way.*

## What it is

A plain hash like SHA-256 tells you whether data changed, but anyone can compute
it, so it proves nothing about who sent the data. HMAC mixes a shared secret key
into the hash. Only someone with the key can produce a matching tag, so a correct
tag means two things at once: the message is intact, and it came from a holder of
the key.

It is a MAC (message authentication code), not encryption — it does not hide the
message, it vouches for it.

## The story

- **Who made it:** Mihir Bellare, Ran Canetti and Hugo Krawczyk (IBM), at CRYPTO '96; RFC 2104 (1997) and FIPS 198 (2002).
- **What for:** A MAC built from any hash function, with a security proof.
- **What it solved:** Ad hoc MACs like $H(\text{key} \parallel \text{message})$ fall to length extension: anyone can append data and compute the new tag. HMAC's two nested hashes stop that.
- **Where it stands:** Recommended; in TLS, SSH, IPsec, JWT, TOTP and HKDF.
- **Incidents:** **Flickr (2009):** Duong and Rizzo forged API calls because Flickr signed requests with MD5(secret + data), exactly the mistake HMAC avoids. **Timing:** comparing tags byte by byte leaks where they differ; this broke the Xbox 360's boot check (2007) and Google's Keyczar library (2009). Compare tags in constant time.

## How it works

HMAC wraps an ordinary hash $H$ with the key on both ends:

$$
\mathrm{HMAC}(K, m) = H\big( (K \oplus \mathit{opad}) \,\Vert\, H( (K \oplus \mathit{ipad}) \,\Vert\, m ) \big)
$$

- $\mathit{ipad}$ is the byte `0x36` repeated to the hash's block size, $\mathit{opad}$ is `0x5c`.
- The key is hashed first if it's longer than a block, or zero-padded if shorter.

The nested structure is what makes HMAC safe against length-extension attacks,
which is why you use HMAC instead of just hashing $K \,\Vert\, m$ yourself.

## When to use it

- **Verifying a message between parties that share a secret** — API request
  signing, webhook signatures, session cookies, JWT (the `HS256` algorithm).
- **As a building block** — HKDF key derivation and PBKDF2 are both built on
  HMAC. See [HKDF](../08-kdf-password-hashing/HKDF.md) and [PBKDF2](../08-kdf-password-hashing/PBKDF2.md).
- **Not for passwords.** A password is low-entropy; use a slow password hash
  instead.
- **Not when the two sides don't share a secret.** Use a signature
  ([Ed25519](../02-signatures/EdDSA.md), [ECDSA](../02-signatures/ECDSA.md)) so a public key can verify.

## Example (Python)

```python
import hmac, hashlib, secrets

key = secrets.token_bytes(32)   # a random 32-byte key, shared with the receiver
message = b"transfer $100 to Bob"

tag = hmac.new(key, message, hashlib.sha256).digest()

# The receiver recomputes the tag and compares in constant time.
ok = hmac.compare_digest(tag, hmac.new(key, message, hashlib.sha256).digest())
```

Always compare tags with `compare_digest`, not `==`. A normal compare returns
early on the first wrong byte, and that timing difference can leak the right tag.

## Security notes

- HMAC is only as secret as the key — store and share it like any other secret.
- Strength depends on the key as well as the hash. Use a random key at least as
  long as the hash output: 32 bytes for HMAC-SHA256. RFC 2104 strongly
  discourages shorter keys, and a password or phrase used as the key can be
  guessed. With such a key HMAC-SHA256 is the safe default: the best generic
  forgery needs about $2^{128}$ tagged messages under one key (the birthday bound,
  RFC 2104 section 6), far out of reach. HMAC-SHA1 is still unbroken (the
  SHA-1 collision attacks don't apply to HMAC), but new systems should use
  SHA-256.
- HMAC proves authenticity, not freshness — add a timestamp or nonce if you need
  to stop replay of an old, validly-tagged message.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RFC 4231 test case 2, recomputed"

    HMAC-SHA-256 with the key "Jefe" over "what do ya want for nothing?". Recomputed with Python's `hmac`,
    matching RFC 4231:

    | Step | Value |
    |---|---|
    | Key "Jefe", zero-padded to 64 bytes | `4a656665 00000000 … 00` |
    | Inner key $K \oplus \mathit{ipad}$ ($\mathit{ipad}$ = `36…36`) | `7c535053 36363636 … 36` |
    | Outer key $K \oplus \mathit{opad}$ ($\mathit{opad}$ = `5c…5c`) | `16393a39 5c5c5c5c … 5c` |
    | Inner hash | $\text{SHA-256}(\text{inner key} \,\Vert\, \text{message})$ |
    | Tag | $\text{SHA-256}(\text{outer key} \,\Vert\, \text{inner hash})$ = `5bdcc146 bf60754e 6a042426 089575c7 5a003f08 9d273983 9dec58b9 64ec3843` |

    Changing one letter of the message, or the key, gives an unrelated tag.

??? abstract "The math, with formulas"

    **HMAC (RFC 2104, FIPS 198-1):**

    $$
    \begin{aligned}
    K' &= H(K) \text{ if } K \text{ is longer than the block size, else } K\text{; then pad } K' \text{ with zeros to the block size } B \\
    \mathrm{HMAC}(K, m) &= H\big( (K' \oplus \mathit{opad}) \,\Vert\, H( (K' \oplus \mathit{ipad}) \,\Vert\, m ) \big) \\
    \mathit{ipad} &= \mathtt{0x36} \text{ repeated } B \text{ times}, \quad \mathit{opad} = \mathtt{0x5c} \text{ repeated } B \text{ times} && (B = 64 \text{ bytes for SHA-256})
    \end{aligned}
    $$

    **Why not just $H(K \,\Vert\, m)$?** SHA-256 is a Merkle–Damgård hash: from $H(K \,\Vert\, m)$ and the length of $K \,\Vert\, m$
    anyone can compute $H(K \,\Vert\, m \,\Vert\, \mathit{pad} \,\Vert\, m')$ without knowing $K$ (the length-extension attack). The outer hash
    in HMAC hides the inner state, so extension fails.

    **Security.** HMAC is a pseudorandom function if the hash's compression function is one (Bellare, 2006),
    which holds even for MD5 and SHA-1, whose collisions do not break HMAC. The two different pads make the
    inner and outer keys look independent.

    **Verification** must compare tags in constant time; a byte-by-byte `==` that stops early leaks how many
    bytes matched.

??? tip "Watch it step by step: computing an HMAC"

    <div class="mars-steps" markdown>

    1. Pad the key "Jefe" with zeros to 64 bytes.
    2. XOR it with 64 bytes of `0x36`: the inner key.
    3. Hash the inner key followed by the message.
    4. XOR the padded key with 64 bytes of `0x5c`: the outer key.
    5. Hash the outer key followed by the inner hash.
    6. The 32-byte result `5bdcc146…64ec3843` is the tag. The receiver recomputes it and compares in constant
       time.

    </div>

??? info "The math underneath"

    - **Merkle–Damgård hash functions** and length extension: [SHA-2](../07-hash/SHA-2.md).
    - **Pseudorandom functions (PRFs):** HMAC as a PRF is what [HKDF](../08-kdf-password-hashing/HKDF.md) and
      [PBKDF2](../08-kdf-password-hashing/PBKDF2.md) rely on.
    - **The NMAC proof** (Bellare, Canetti and Krawczyk, 1996), of which HMAC is the practical form.
    - **Existential unforgeability under chosen-message attack** (EUF-CMA): the security goal of a MAC.
    - **Timing side channels** in comparisons.

## See also

- [SHA-2](../07-hash/SHA-2.md) — the hash HMAC is built on
- [HKDF](../08-kdf-password-hashing/HKDF.md) / [PBKDF2](../08-kdf-password-hashing/PBKDF2.md) — both built on HMAC
- [Block-cipher MACs](Block-Cipher-MACs.md) / [Universal hash MACs](Universal-Hash-MACs.md) — CMAC, GMAC, Poly1305 and UMAC, the other MAC families
- [KMAC](KMAC.md) / [SipHash](SipHash.md) — SHA-3's own MAC, which needs no HMAC wrapper, and a keyed hash for hash tables
- [Cryptography FAQ](../FAQ.md) — encrypt vs. sign vs. hash

## References

- [RFC 2104: HMAC: Keyed-Hashing for Message Authentication](https://www.rfc-editor.org/rfc/rfc2104) (1997)
- [FIPS 198-1: The Keyed-Hash Message Authentication Code (HMAC)](https://csrc.nist.gov/pubs/fips/198-1/final) (2008).
  In June 2025 NIST asked for comments, until 23 July 2025, on a plan to withdraw FIPS 198-1 and move its
  content into a new Special Publication, SP 800-224. That changes where HMAC is written down, not HMAC itself.
