# KMAC (KECCAK Message Authentication Code)

*SHA-3's own MAC. The key goes in front of the message and the sponge
does the rest, with no HMAC-style second pass.*

**Status and standards:** see [MAC](../index.md#6-mac) in the main table.

## What it is

NIST published KMAC in SP 800-185 (December 2016), along with three other
functions derived from SHA-3. It comes in two strengths, KMAC128 and
KMAC256, built on cSHAKE128 and cSHAKE256. You pick the tag length, and a
tag of another length is a new value, not a longer or shorter copy of the
old one. KMACXOF gives open-ended output. KMAC is also a PRF, so NIST
lets it drive key derivation too.

A first revision is on the way. On 8 October 2026 NIST published the draft
of SP 800-185 Revision 1 for public comment until 7 December 2026. It adds
a streaming way to call these functions (INIT, then ABSORB as many times
as needed, then SQUEEZE for output), for when the full input or output
length isn't known in advance. Called in one go, every function gives the
same result as in the 2016 version.

## How it works

cSHAKE is SHAKE with two extra inputs: a function name N, which only NIST
sets, and a customization string S, which is yours. KMAC is cSHAKE with
N = "KMAC" and the key in front:

```
cSHAKE128(X, L, N, S) =
    KECCAK[256](bytepad(encode_string(N) ‖ encode_string(S), 168) ‖ X ‖ 00, L)

KMAC128(K, X, L, S) =
    cSHAKE128(bytepad(encode_string(K), 168) ‖ X ‖ right_encode(L), L, "KMAC", S)
```

- `encode_string` puts a string's length in front of it, and `bytepad`
  zero-fills to a multiple of 168 bytes, the rate. So N and S fill whole
  blocks, the key fills blocks of its own, and then the message follows.
- The output length L goes last, which is why each length gives an
  unrelated tag. KMACXOF writes 0 there instead.
- `00` is two domain bits that keep cSHAKE apart from SHAKE, which puts
  `1111` there. (With N and S both empty, cSHAKE is defined as SHAKE.)
- KMAC256 is the same with cSHAKE256 and 136-byte blocks.

With a fixed key and S, those first blocks can be absorbed once, and after
that KMAC costs the same as SHAKE. Python's hashlib has SHAKE but no
cSHAKE, and it always appends SHAKE's `1111`, so KMAC can't be built on
it. That's why this page has no Python example.

### Why Keccak needs no HMAC wrapper

HMAC nests two hashes because SHA-2 outputs its whole internal state.
From SHA-256(K ‖ m), anyone can keep hashing and get the hash of K ‖ m ‖
padding ‖ more without knowing K. A sponge never outputs its capacity
bits, so that length extension fails, and the Keccak team says prefixing
the key is enough for a MAC. KMAC is that idea plus encodings that keep
key, message, length and purpose apart. HMAC-SHA3 is allowed too (FIPS
198-1 takes any approved hash), but it pays for a second pass it doesn't
need.

### TupleHash and ParallelHash

SP 800-185 builds two more functions on cSHAKE, each in 128 and 256-bit
strengths, with XOF forms:

- **TupleHash** hashes a list of strings, each length-encoded, so
  ("abc", "d") and ("ab", "cd") hash differently.
- **ParallelHash** cuts a long input into B-byte blocks, hashes each on
  its own so cores or SIMD lanes can share the work, then hashes the list
  of results.

## When to use it

KMAC is rare in practice. TLS 1.3, SSH and WireGuard don't offer it.
Where it does appear:

- **NIST key derivation:** the one-step KDF in SP 800-56C Rev. 2 (2020)
  and the KMAC-based KDF in SP 800-108 Rev. 1 (2022).
- **CMS:** as a MAC in RFC 8702 (2020) and as a KDF in RFC 9688 (2024).
  An IPsecME draft would add it to IKEv2, ESP and AH; it isn't an RFC yet.
- **Libraries:** OpenSSL 3 has `KMAC-128` and `KMAC-256` through EVP_MAC.

Use it when a NIST profile or one of those specs calls for it, or a design
already runs everything on Keccak. Otherwise HMAC-SHA-256 does the same
job and every library and protocol has it.

## Security notes

- The key length caps security: with a few tags, finding K takes at most
  2^len(K) work. SP 800-185 forbids keys shorter than the security
  strength you need.
- The tag length sets the forgery odds, about one success per 2^L
  guesses. SP 800-185 forbids tags under 32 bits and allows under 64 only
  after a careful risk analysis.
- KMAC128's collision and preimage bounds stop at 2^128 however long the
  output. SP 800-185 pairs AES-CMAC with KMAC128 and a 128-bit tag, and
  HMAC-SHA-256 with KMAC256 and a 256-bit tag.
- Compare tags in constant time, as with HMAC.

## See also

- [HMAC](HMAC.md): the nested MAC that SHA-2 needs and KMAC doesn't
- [SHA-3](../07-hash/SHA-3.md): Keccak, the sponge and SHAKE
- [BLAKE](../07-hash/BLAKE.md): BLAKE2 and BLAKE3, which also take a key directly
- [HKDF](../08-kdf-password-hashing/HKDF.md): the HMAC-based KDF most protocols use instead

## References

- [NIST SP 800-185: SHA-3 Derived Functions: cSHAKE, KMAC, TupleHash and ParallelHash (2016)](https://csrc.nist.gov/pubs/sp/800/185/final) (Sections 3–8, Table 1)
- [NIST SP 800-185 Rev. 1, initial public draft (8 October 2026; comments until 7 December 2026)](https://csrc.nist.gov/pubs/sp/800/185/r1/ipd)
- [FIPS 202: SHA-3 Standard](https://csrc.nist.gov/pubs/fips/202/final) / [FIPS 198-1: HMAC](https://csrc.nist.gov/pubs/fips/198-1/final)
- [The Keccak team, "Keccak strengths"](https://keccak.team/keccak_strengths.html)
- [NIST SP 800-56C Rev. 2 (2020)](https://csrc.nist.gov/pubs/sp/800/56/c/r2/final) (Sections 4.1, 4.2) / [NIST SP 800-108 Rev. 1 (2022)](https://csrc.nist.gov/pubs/sp/800/108/r1/upd1/final) (Section 4.4)
- [RFC 8702: SHAKE in CMS](https://www.rfc-editor.org/rfc/rfc8702) (Section 3.4) / [RFC 9688: SHA3 in CMS](https://www.rfc-editor.org/rfc/rfc9688) (Section 5.2)
- [draft-ietf-ipsecme-sha3: KMAC and SHAKE in IKEv2 and IPsec](https://datatracker.ietf.org/doc/draft-ietf-ipsecme-sha3/) (revision 02, 2026)
- [OpenSSL 3.0: EVP_MAC-KMAC](https://docs.openssl.org/3.0/man7/EVP_MAC-KMAC/)
