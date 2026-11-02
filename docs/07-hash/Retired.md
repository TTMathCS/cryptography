# Retired hashes

*SHA-1, MD5, MD4 and RIPEMD-160: what broke each one, and where it still
turns up. Check old data with them if you have to, but never sign with them.*

**Status and standards:** see [Hash functions](../index.md#7-hash-functions)
in the main table.

A hash retires when collisions get cheap: two different inputs with the same
digest, so a signature on one also covers the other. Preimages (going from a
digest back to an input) hold out much longer, which is why HMAC built on
these hashes lasted. For new work use [SHA-256](SHA-2.md), [SHA-3](SHA-3.md)
or [BLAKE2](BLAKE.md).

## SHA-1

**What it was.** The NSA's 160-bit hash, published by NIST as FIPS 180-1 in
1995 and copied into RFC 3174. It is SHA-0 (FIPS 180, 1993) with one extra
bit rotation in its message schedule. For about twenty years it was the
usual hash inside certificate and code signatures.

**What broke it.** A 160-bit hash should take about 2⁸⁰ work to collide.
Wang, Yin and Yu (CRYPTO 2005) found a way in about 2⁶⁹. In February 2017
CWI and Google published SHAttered, the first real collision: two different
PDF files with the same SHA-1, for about 2⁶³ SHA-1 computations (6,500 CPU
years and 100 GPU years). That is the ~63 bits in the main table.

Leurent and Peyrin's "SHA-1 is a Shambles" (USENIX Security 2020) did a
chosen-prefix collision, where the attacker picks two different starting
texts and then finds endings that make them collide. It also cost about 2⁶³,
run on 900 rented GPUs for two months. They built two PGP keys with
different user IDs whose certification signatures collide, so a signature
made for one key also verifies on the other. GnuPG 2.2.18 (November 2019)
treats SHA-1 identity signatures made after January 19, 2019 as invalid.

In December 2022 NIST set December 31, 2030 as the end of its move away from
SHA-1, with a FIPS 180-5 that drops it.

**Where you still see it.**

- **Git.** Object names are SHA-1 by default. Since 2.13 (2017) Git uses
  Marc Stevens and Dan Shumow's SHA-1 that detects inputs built by the known
  collision attacks. SHA-256 repositories arrived in 2.29 (2020), and Git 3.0
  will make SHA-256 the default for new repositories. It has no release date
  yet.
- **Old certificates.** Browsers stopped trusting SHA-1 TLS certificates in
  early 2017, but anything signed before then may still carry a SHA-1
  signature. OpenPGP (RFC 9580, 2024) forbids making new ones.
- **HMAC-SHA-1,** as in TOTP codes. That is still fine: RFC 6194 found no way
  to carry the collision attacks over to HMAC. See [HMAC](../06-mac/HMAC.md).

## MD5

**What it was.** Ron Rivest's 128-bit hash, RFC 1321 (1992), a strengthened
MD4. Through the 1990s it was the default for certificates, file checksums,
`$1$` passwords, and HMAC-MD5 in TLS and IPsec.

**What broke it.** In August 2004 Xiaoyun Wang, Dengguo Feng, Xuejia Lai and
Hongbo Yu posted real collisions for MD5, MD4, HAVAL-128 and the original
RIPEMD. Chosen-prefix collisions followed (Stevens, Lenstra and de Weger,
EUROCRYPT 2007). In December 2008 a team used one, and about 200
PlayStation 3s, to turn an ordinary certificate signed with MD5 by a
commercial CA into a rogue CA certificate that browsers trusted.

Then came Flame, espionage malware found in May 2012. It carried a forged
certificate that chained up to Microsoft's root, made with a new variant of
the chosen-prefix attack (Stevens, CRYPTO 2013). Microsoft revoked the CAs
involved in Security Advisory 2718704. RFC 6151 (2011) had already said MD5
is no longer acceptable where collision resistance is needed.

**Where you still see it.**

- **Checksums, caches and deduplication** where nobody is attacking. Python
  3.9+ lets you say so: `hashlib.md5(data, usedforsecurity=False)` works
  even on builds that block MD5 for security use.
- **RADIUS,** which authenticates server replies with an ad hoc MD5
  construction. Blast-RADIUS (USENIX Security 2024) used a chosen-prefix
  collision to forge an accept for a failed login.
- **`$1$` password hashes:** see
  [MD5-crypt](../08-kdf-password-hashing/Retired.md#md5-crypt).
- **HMAC-MD5** in old protocols. RFC 6151 says removing it is not urgent,
  but new designs should leave it out.

These two 128-byte inputs differ in six bits and have the same MD5. They are
the collision from Wang and Yu's EUROCRYPT 2005 paper.

```python
import hashlib

a = bytes.fromhex(
    "d131dd02c5e6eec4693d9a0698aff95c2fcab58712467eab4004583eb8fb7f89"
    "55ad340609f4b30283e488832571415a085125e8f7cdc99fd91dbdf280373c5b"
    "d8823e3156348f5bae6dacd436c919c6dd53e2b487da03fd02396306d248cda0"
    "e99f33420f577ee8ce54b67080a80d1ec69821bcb6a8839396f9652b6ff72a70")
b = bytearray(a)
for i in (19, 45, 59, 83, 109, 123):    # flip the top bit of six bytes
    b[i] ^= 0x80

print(hashlib.md5(a).hexdigest())
print(hashlib.md5(b).hexdigest())       # the same: 79054025255fb1a26e4bc422aef54eb4
print(hashlib.sha256(a).digest() == hashlib.sha256(b).digest())   # False
```

## MD4

**What it was.** Rivest's 1990 hash (RFC 1186, then RFC 1320 in 1992): 128
bits, three rounds, built for speed on 32-bit machines. MD5 and SHA-1 follow
its design.

**What broke it.** Hans Dobbertin found collisions in 1996 at about 2²⁰ MD4
computations, and Wang et al. (EUROCRYPT 2005) cut that to about 2⁸.
Preimages fell too: Leurent reached 2¹⁰⁰ in 2008, and later work about 2⁷⁸.
RFC 6150 (2011) moved MD4 to Historic.

**Where you still see it.** Windows passwords. The NT hash behind NTLM is MD4
of the UTF-16 password, with no salt and a single pass (MS-NLMP, Section
3.3.1). The RC4-HMAC Kerberos key (RFC 4757) is the same value, and MS-CHAP
uses it too. rsync used MD4 until 3.0.0 (2008).

```python
import hashlib

try:
    print(hashlib.new("md4", "password".encode("utf-16-le")).hexdigest())
    # 8846f7eaee8fb117ad06bdd830b7586c: the NT hash of "password"
except ValueError:                      # OpenSSL 3 keeps MD4 in its legacy provider
    print("no MD4 in this build")
```

Python 3.13 on OpenSSL 3.0.13 prints `no MD4 in this build`. With the
legacy provider turned on in the OpenSSL config, it prints the hash.

## RIPEMD-160

**What it is.** Hans Dobbertin, Antoon Bosselaers and Bart Preneel's 160-bit
hash (FSE 1996), a stronger redo of the 1992 RIPEMD from the European RIPE
project. It runs two different MD4-style lines of 80 steps side by side and
combines them at the end. It is in ISO/IEC 10118-3.

**Why it's legacy.** Nothing has broken it. Collision attacks reach 40 of
its 80 steps (Li, Liu and Wang, 2023), and a 2026 preprint claims 42. The
limit is the size: a 160-bit digest gives at most 80-bit collision
resistance. Bitcoin's Taproot spec calls that low, and a risk whenever an
output holds data from more than one party.

**Where you still see it.** Bitcoin. HASH160, RIPEMD-160 of SHA-256, makes
the 20-byte hashes in P2PKH and P2SH addresses and P2WPKH outputs. Taproot
outputs (BIP 341) hold a 32-byte key instead. In OpenPGP, RFC 9580 forbids
new signatures with it, as with MD5 and SHA-1.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: the old hashes of \"abc\", and the cost of breaking them"

    Outputs recomputed with Python's `hashlib`:

    | Hash | Output for "abc" | Output size | Generic collision cost | Actual collision cost |
    |---|---|---|---|---|
    | MD5 | `900150983cd24fb0d6963f7d28e17f72` | 128 bits | 2⁶⁴ | seconds on a laptop (since 2005–2006) |
    | SHA-1 | `a9993e364706816aba3e25717850c26c9cd0d89d` | 160 bits | 2⁸⁰ | about 2⁶³·¹ (SHAttered, 2017) |
    | SHA-256 | `ba7816bf…f20015ad` | 256 bits | 2¹²⁸ | none known |

    2⁸⁰ / 2⁶³·¹ ≈ 120,000: the SHAttered team found a SHA-1 collision about 120,000 times faster than the
    birthday bound. In 2020 a chosen-prefix collision (two different chosen beginnings) cost about 2⁶³·⁴,
    some US$45,000 of GPU time.

??? abstract "The math, with formulas"

    **The birthday bound.** Among `q` random `n`-bit outputs, the chance of some collision is about
    `1 − e^(−q²/2ⁿ⁺¹)`, so a 50% chance needs `q ≈ 1.18 · 2^(n/2)`. That is why a 128-bit hash gives at most
    64-bit collision security.

    **Differential attacks (Wang and Yu, 2005).** Choose a difference `Δ` between two message blocks and a
    path of differences through the rounds that cancels by the end, so `compress(H, M) = compress(H, M ⊕ Δ)`.
    Each step of the path holds with some probability; message modification forces the early steps,
    leaving the attacker to pay only for the late ones. MD5's path costs about 2³⁹ work in the original paper;
    later work brought it to seconds.

    **Why a collision is enough to hurt.** Merkle–Damgård passes the state along, so if `H(M) = H(M′)` then
    `H(M ‖ S) = H(M′ ‖ S)` for any suffix `S`. Two documents with a shared ending and colliding beginnings can
    carry the same signature (the Flame malware's forged Microsoft certificate, 2012, used an MD5
    chosen-prefix collision).

    **Preimages are still hard.** No practical preimage attack exists on MD5 (best known about 2¹²³·⁴) or
    SHA-1, which is why old HMAC-MD5 and HMAC-SHA-1 tags are not forgeable, even though the hashes are broken
    for signatures.

??? tip "Watch it step by step: the birthday paradox"

    <div class="mars-steps" markdown>

    1. With 23 people in a room, there is a 50% chance two share a birthday, though there are 365 days.
    2. 23 people make 253 pairs; each pair matches with chance 1/365. Pairs, not people, are what count.
    3. For a hash with `2ⁿ` outputs, about `2^(n/2)` random inputs give a 50% chance of a collision.
    4. MD5 (`n = 128`) would need 2⁶⁴ tries; SHA-1 (`n = 160`) 2⁸⁰. That was the design target.
    5. Differential attacks found shortcuts: seconds for MD5, about 2⁶³ for SHA-1.
    6. SHA-256 (`n = 256`) needs 2¹²⁸ tries and no shortcut is known.

    </div>

??? info "The math underneath"

    - **The birthday paradox** and collision probability.
    - **Differential cryptanalysis of hash functions** and message modification.
    - **The Merkle–Damgård structure** and why collisions extend: [SHA-2](SHA-2.md).
    - **Chosen-prefix collisions** and how they forged certificates.
    - **Collision vs. preimage resistance:** why HMAC and old password checks with these hashes are a
      different question from signatures.

## See also

- [SHA-2](SHA-2.md): the usual replacement
- [SHA-3](SHA-3.md): the backup design, unrelated to MD4
- [HMAC](../06-mac/HMAC.md): why HMAC-SHA-1 still holds
- [Retired ciphers](../04-symmetric-ciphers/Retired.md): DES, RC4 and the other ciphers of the same era
- [Retired password hashes](../08-kdf-password-hashing/Retired.md): MD5-crypt and DES-crypt

## References

- [FIPS 180-1: Secure Hash Standard (1995)](https://csrc.nist.gov/pubs/fips/180-1/final) / [RFC 3174: US Secure Hash Algorithm 1](https://www.rfc-editor.org/rfc/rfc3174) / [RFC 6194: Security Considerations for SHA-0 and SHA-1](https://www.rfc-editor.org/rfc/rfc6194) (Sections 3.3, 4)
- Wang, Yin and Yu, "Finding Collisions in the Full SHA-1" (CRYPTO 2005)
- [Stevens, Bursztein, Karpman, Albertini and Markov, "The first collision for full SHA-1" (CRYPTO 2017)](https://eprint.iacr.org/2017/190) / [shattered.io](https://shattered.io/)
- [Leurent and Peyrin, "SHA-1 is a Shambles" (USENIX Security 2020)](https://sha-mbles.github.io/)
- [NIST, "NIST Transitioning Away from SHA-1 for All Applications" (2022)](https://csrc.nist.gov/news/2022/nist-transitioning-away-from-sha-1-for-all-apps)
- Git release notes [2.13.0](https://github.com/git/git/blob/master/Documentation/RelNotes/2.13.0.adoc) and [2.29.0](https://github.com/git/git/blob/master/Documentation/RelNotes/2.29.0.adoc) / [Git BreakingChanges](https://git-scm.com/docs/BreakingChanges)
- [RFC 9580: OpenPGP](https://www.rfc-editor.org/rfc/rfc9580) (Section 9.5)
- [RFC 1321: MD5](https://www.rfc-editor.org/rfc/rfc1321) / [RFC 6151: Updated Security Considerations for MD5 and HMAC-MD5](https://www.rfc-editor.org/rfc/rfc6151)
- [Wang, Feng, Lai and Yu, "Collisions for Hash Functions MD4, MD5, HAVAL-128 and RIPEMD" (2004)](https://eprint.iacr.org/2004/199) / Wang and Yu, "How to Break MD5 and Other Hash Functions" (EUROCRYPT 2005)
- Stevens, Lenstra and de Weger, "Chosen-Prefix Collisions for MD5 and Colliding X.509 Certificates for Different Identities" (EUROCRYPT 2007) / [Stevens, Sotirov, Appelbaum, Lenstra, Molnar, Osvik and de Weger, "Short Chosen-Prefix Collisions for MD5 and the Creation of a Rogue CA Certificate" (CRYPTO 2009)](https://marc-stevens.nl/research/hashclash/rogue-ca/)
- [Stevens, "Counter-Cryptanalysis" (CRYPTO 2013)](https://eprint.iacr.org/2013/358) / [Microsoft Security Advisory 2718704 (2012)](https://learn.microsoft.com/en-us/security-updates/securityadvisories/2012/2718704)
- [Goldberg, Haller, Heninger, Milano, Shumow, Stevens and Suhl, "RADIUS/UDP Considered Harmful" (USENIX Security 2024)](https://www.blastradius.fail/)
- [Python `hashlib`](https://docs.python.org/3/library/hashlib.html) / [OpenSSL legacy provider](https://docs.openssl.org/3.0/man7/OSSL_PROVIDER-legacy/)
- [RFC 1320: MD4](https://www.rfc-editor.org/rfc/rfc1320) / [RFC 6150: MD4 to Historic Status](https://www.rfc-editor.org/rfc/rfc6150) / Dobbertin, "Cryptanalysis of MD4" (FSE 1996) / Wang, Lai, Feng, Chen and Yu, "Cryptanalysis of the Hash Functions MD4 and RIPEMD" (EUROCRYPT 2005)
- [MS-NLMP: NTLM v1 Authentication](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-nlmp/464551a8-9fc4-428e-b3d3-bc5bfb2e73a5) (Section 3.3.1) / [RFC 4757: RC4-HMAC](https://www.rfc-editor.org/rfc/rfc4757)
- Dobbertin, Bosselaers and Preneel, "RIPEMD-160: A Strengthened Version of RIPEMD" (FSE 1996) / ISO/IEC 10118-3
- [Li, Liu and Wang, "Automating Collision Attacks on RIPEMD-160" (ToSC 2023)](https://eprint.iacr.org/2024/350) / [Lu, Yu, Li, Zhang and Lin, "Improved Collision Attack on RIPEMD-160" (2026 preprint)](https://eprint.iacr.org/2026/1744)
- [Bitcoin Core `hash.h`](https://github.com/bitcoin/bitcoin/blob/master/src/hash.h) (`CHash160`) / [BIP 13](https://github.com/bitcoin/bips/blob/master/bip-0013.mediawiki) / [BIP 141](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki) / [BIP 341](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki)

*Weaker sources:* [Peter Selinger's MD5 collision page](https://www.mscs.dal.ca/~selinger/md5collision/) for the colliding bytes and their credit to Wang and Yu; [Mozilla, "The end of SHA-1 on the Public Web" (2017)](https://blog.mozilla.org/security/2017/02/23/the-end-of-sha-1-on-the-public-web/) for the browser date.
