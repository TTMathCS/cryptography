# SHA-2 (SHA-256, SHA-384, SHA-512)

*The everyday hash: any input in, a fixed-size fingerprint out. One-way, and a
different fingerprint for any change to the input.*

**Status and standards:** see [Hash functions](../index.md#7-hash-functions) in
the main table.

## What it is

A cryptographic hash maps data of any length to a fixed-size digest, with no
key. A good one is:

- **One-way:** you can't get the input back from the digest.
- **Collision-resistant:** you can't find two inputs with the same digest.
- **Avalanche:** flipping one input bit changes about half the output bits.

SHA-2 was designed by the NSA and published by NIST in 2001. It is what
certificates, TLS, SSH, Git's SHA-256 mode and Bitcoin all lean on.

The standard that defines it, FIPS 180-4, is due for a rewrite. In 2023 NIST
decided to revise it: take SHA-1 out, fold in the hash guidance from SP
800-107, tidy the text and update the references. SHA-2 itself stays as it
is. Work on the draft had not started when NIST announced the decision.
Separately, the October 2024 draft of SP 800-131A Rev. 3 proposes a schedule
for retiring the 224-bit hashes, SHA-224 among them, as NIST moves from 112-bit
to 128-bit security; it is still a draft.

| Variant | Digest | Block | Notes |
|---|---|---|---|
| SHA-256 | 256-bit | 512-bit | the default almost everywhere |
| SHA-384 | 384-bit | 1024-bit | SHA-512 cut short; TLS `AES_256_GCM_SHA384` |
| SHA-512 | 512-bit | 1024-bit | faster than SHA-256 on 64-bit CPUs |
| SHA-224, SHA-512/256 | 224 / 256-bit | — | truncated variants; 512/256 resists length extension |

SHA-1 (160-bit) came before it and is broken; see the main table.

## How it works

SHA-2 uses the Merkle–Damgård construction:

1. Pad the message so its length is a multiple of the block size, ending with
   the original length.
2. Start from a fixed initial state (eight 32-bit words for SHA-256).
3. Feed each block through a compression function that mixes it into the
   state: 64 rounds of add, rotate and XOR for SHA-256, 80 for SHA-512.
4. The final state is the digest.

The digest *is* the internal state, so anyone who knows `SHA-256(m)` and the
length of `m` can keep hashing from there and compute `SHA-256(m ‖ padding ‖ more)`
without knowing `m`. That is the **length-extension** weakness, and it is why
`SHA-256(key ‖ message)` is not a safe MAC.

## When to use it

- **Integrity and fingerprints:** download checksums, content addressing, the
  digest inside a signature.
- **A message with a shared secret:** don't hash `key ‖ message` yourself; use
  [HMAC](../06-mac/HMAC.md).
- **Passwords:** never plain SHA-2. Passwords need a slow, salted function such
  as [Argon2](../08-kdf-password-hashing/Argon2.md).

## Example (Python)

```python
import hashlib

digest = hashlib.sha256(b"hello world").hexdigest()
print(digest)   # b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9

# same result fed in pieces, for large files
h = hashlib.sha256()
h.update(b"hello ")
h.update(b"world")
print(h.hexdigest() == digest)   # True
```

## Security notes

- SHA-256 gives ~128-bit collision resistance and ~256-bit preimage resistance.
  A quantum computer (Grover) halves the preimage figure, which still leaves
  plenty.
- Length extension is real; use HMAC, SHA-512/256 or [SHA-3](SHA-3.md) when
  the digest of secret data is exposed.
- A hash proves *integrity*, not *origin*: anyone can recompute it. For origin
  you need a key ([HMAC](../06-mac/HMAC.md)) or a signature
  ([Ed25519](../02-signatures/EdDSA.md)).

## See also

- [SHA-3](SHA-3.md): the backup design, built differently
- [HMAC](../06-mac/HMAC.md): keyed authentication on top of SHA-2
- [Retired hashes](Retired.md): SHA-1, MD5, MD4 and RIPEMD-160
- [Cryptography FAQ](../FAQ.md): encrypt vs. sign vs. hash

## References

- [FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) / [NIST, "Decision to Revise FIPS 180-4" (2023)](https://csrc.nist.gov/news/2023/decision-to-revise-fips-180-4)
- [NIST SP 800-131A Rev. 3, initial public draft (2024)](https://csrc.nist.gov/pubs/sp/800/131/a/r3/ipd)
- [RFC 6234: SHA-2 in C, with test vectors](https://www.rfc-editor.org/rfc/rfc6234)
