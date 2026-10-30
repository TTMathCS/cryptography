---
template: home.html
title: Cryptography
---

# Algorithms by the job they do

When SSH or TLS connects, it picks one algorithm for each job: a key exchange,
a signature, a cipher, a MAC and a hash. The tables below list the algorithms
themselves. [Protocols](protocols/index.md) shows the other side: what SSH,
TLS, WireGuard, Signal and others actually run.

**Columns:** *Size* is the key, output or group size (B means bytes).
*Security* is the classical strength in bits: about 2ⁿ work to break it, so
RSA-2048 at 112 is weaker than X25519 at 128. For post-quantum rows it is the
AES-equivalent of the NIST category. *Released* is the year the algorithm first
appeared. *Standard* is the RFC, FIPS or other document that defines it.
*Deprecated* says when and by whom it was retired. *Status* is one of
Recommended or Acceptable (green), Legacy (amber), Draft (grey, standard not
final) and Broken (red, struck through). **PQ** marks post-quantum families.

NIST IR 8547 is NIST's plan to deprecate RSA and elliptic-curve algorithms at
112-bit security (RSA-2048, P-256) in 2030 and to disallow all of them in 2035.

Families with a link have their own page. The rest get theirs in later updates.

## 1. Key exchange

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [Diffie-Hellman (finite field)](01-key-exchange/Diffie-Hellman.md) | 2048-bit and larger groups | 2048–8192-bit group | 112–200 | RFC 3526 (2003), RFC 7919 (2016) | 1976 | — | Acceptable |
| | 1024-bit and smaller groups | ≤1024-bit group | ≤80 | RFC 2409 (1998) | 1998 | Logjam (2015); RFC 9142 (2022) for SSH | Broken |
| [Diffie-Hellman (elliptic curve)](01-key-exchange/ECDH.md) | X25519 | 255-bit key | 128 | RFC 7748 (2016) | 2006 | — | Recommended |
| | X448 | 448-bit key | 224 | RFC 7748 (2016) | 2015 | — | Acceptable |
| | ECDH P-256/384/521 | 256 / 384 / 521-bit key | 128 / 192 / 256 | SP 800-56A (2006), RFC 8422 (2018) | 1999 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | ECDH Brainpool | 256 / 384 / 512-bit key | 128 / 192 / 256 | RFC 5639 (2010) | 2005 | — | Acceptable |
| [ML-KEM](01-key-exchange/ML-KEM.md) (PQ, lattice) | ML-KEM-512/768/1024 | 800 / 1,184 / 1,568 B public key | 128 / 192 / 256 | FIPS 203 (2024) | 2017 | — | Recommended |
| | X25519 + ML-KEM-768 hybrid | 1,216 B key share | 192 | IETF drafts (TLS, SSH) | 2024 | — | Recommended |
| [NTRU Prime](01-key-exchange/NTRU-Prime.md) (PQ, lattice) | sntrup761 + X25519 hybrid | 1,190 B key share | 128 | RFC 9941 (2026) | 2016 | — | Acceptable |
| [Code-based](01-key-exchange/Code-Based-KEMs.md) (PQ) | HQC | 2,241 – 7,237 B public key | 128 / 192 / 256 | NIST pick 2025, standard due ~2027 | 2017 | — | Draft |
| | Classic McEliece | 261 KB – 1.36 MB public key | 128 – 256 | ISO/IEC 18033-2 Amd 2 (2026) | 1978 | BSI advises against new use (2026) | Acceptable |
| [RSA key transport](02-signatures/RSA.md) | RSA-encrypted session key | 2048–4096-bit key | 112–140 | RFC 5246 (TLS 1.2) | 1977 | dropped in TLS 1.3, RFC 8446 (2018) | Legacy |
| [PAKE](01-key-exchange/PAKE.md) (password-based) | SAE / Dragonfly | 256-bit group (P-256) | 128 | RFC 7664 (2015), IEEE 802.11 (WPA3) | 2008 | — | Recommended |
| | OPAQUE | 256-bit group | 128 | RFC 9807 (2025) | 2018 | — | Recommended |
| | SPAKE2 | 256-bit group | 128 | RFC 9382 (2023) | 2005 | — | Acceptable |
| | CPace | 256-bit group | 128 | IRTF CFRG draft | 2019 | — | Draft |
| | SRP | 2048-bit and larger group | 112+ | RFC 2945 (2000), RFC 5054 (2007) | 1998 | — | Legacy |

The current SSH and TLS defaults run X25519 and ML-KEM-768 side by side and
combine the two secrets, so the session stays safe if either one breaks.

## 2. Digital signatures

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [RSA](02-signatures/RSA.md) | RSA-PSS | 2048–4096-bit key | 112–140 | RFC 3447 (2003), RFC 8017 (2016) | 1996 | NIST IR 8547: 2030 / 2035 | Recommended |
| | PKCS#1 v1.5 | 2048–4096-bit key | 112–140 | RFC 2313 (1998), RFC 8017 (2016) | 1993 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | RSA with SHA-1 | 160-bit digest | ~63 | RFC 3279 (2002) | 1995 | NIST SP 800-131A (after 2013); OpenSSH 8.8 (2021) | Broken |
| | keys under 2048 bits | 1024-bit key | 80 | — | — | NIST SP 800-131A (after 2013) | Broken |
| [DSA](02-signatures/DSA.md) | DSA | 2048–3072-bit p | 112–128 | FIPS 186 (1994) | 1991 | FIPS 186-5 (2023); OpenSSH 10 (2025) | Legacy |
| [ECDSA](02-signatures/ECDSA.md) | P-256/384/521 | 256 / 384 / 521-bit key | 128 / 192 / 256 | ANSI X9.62 (1999), FIPS 186-2 (2000) | 1992 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | deterministic ECDSA | 256 / 384 / 521-bit key | 128 / 192 / 256 | RFC 6979 (2013) | 2013 | — | Recommended |
| | secp256k1 | 256-bit key | 128 | SEC 2 (2000) | 2000 | — | Acceptable |
| [Schnorr](02-signatures/Schnorr.md) | BIP-340 | 256-bit key | 128 | BIP-340 (2020) | 1989 | — | Acceptable |
| [EdDSA](02-signatures/EdDSA.md) | Ed25519 | 256-bit key, 512-bit signature | 128 | RFC 8032 (2017), FIPS 186-5 (2023) | 2011 | — | Recommended |
| | Ed448 | 456-bit key, 912-bit signature | 224 | RFC 8032 (2017) | 2015 | — | Acceptable |
| [ML-DSA](02-signatures/ML-DSA.md) (PQ, lattice) | ML-DSA-44/65/87 | 1,312 / 1,952 / 2,592 B public key | 128 / 192 / 256 | FIPS 204 (2024) | 2017 | — | Recommended |
| [FN-DSA](02-signatures/FN-DSA.md) (PQ, lattice) | Falcon-512/1024 | 897 / 1,793 B public key | 128 / 256 | FIPS 206 (in development) | 2017 | — | Draft |
| [SLH-DSA](02-signatures/SLH-DSA.md) (PQ, hash) | SLH-DSA | 7.8 – 49.9 KB signature | 128 / 192 / 256 | FIPS 205 (2024) | 2015 | — | Acceptable |
| [Stateful hash-based](02-signatures/Stateful-Hash-Signatures.md) (PQ) | LMS / HSS | 192 / 256-bit hash | 192 / 256 | RFC 8554 (2019), SP 800-208 (2020) | 1995 | — | Recommended |
| | XMSS | 192 / 256-bit hash | 192 / 256 | RFC 8391 (2018), SP 800-208 (2020) | 2011 | — | Acceptable |
| [Blind signatures](02-signatures/Blind-Signatures.md) | RSA blind signatures | 2048–4096-bit key | 112–140 | RFC 9474 (2023) | 1982 | — | Acceptable |

## 3. Public-key encryption

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [RSA](02-signatures/RSA.md) | RSA-OAEP | 2048–4096-bit key | 112–140 | RFC 2437 (1998), RFC 8017 (2016) | 1994 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | PKCS#1 v1.5 encryption | 2048–4096-bit key | — | RFC 2313 (1998) | 1993 | Bleichenbacher (1998), ROBOT (2017); NIST SP 800-131A (after 2023) | Broken |
| | textbook RSA (no padding) | any key | — | — | 1977 | never safe | Broken |
| [ElGamal](03-public-key-encryption/ElGamal.md) | ElGamal | 2048-bit and larger group | 112+ | RFC 2440 (1998), RFC 9580 (2024) | 1985 | RFC 9580 (2024): no new keys, no encrypting to old ones | Legacy |
| [ECIES](03-public-key-encryption/ECIES.md) | ECIES | 256-bit curve | 128 | SEC 1 (2000), ISO 18033-2 (2006) | 1999 | — | Acceptable |
| [HPKE](03-public-key-encryption/HPKE.md) | DHKEM + HKDF + AEAD | 256-bit curve (X25519, P-256) | 128 | RFC 9180 (2022) | 2019 | — | Recommended |
| | HPKE with ML-KEM / X-Wing | 1,216 B public key (X-Wing) | 192 | IETF HPKE and CFRG drafts | 2024 | — | Draft |

## 4. Symmetric ciphers

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [AES](04-symmetric-ciphers/AES.md) | AES-128/192/256 | 128 / 192 / 256-bit key, 128-bit block | 128 / 192 / 256 | FIPS 197 (2001) | 1998 | — | Recommended |
| | Serpent, Twofish (AES finalists) | 128–256-bit key, 128-bit block | 128–256 | — | 1998 | — | Acceptable |
| ChaCha / Salsa | ChaCha20 | 256-bit key | 256 | RFC 8439 (2018) | 2008 | — | Recommended |
| | Salsa20 | 256-bit key | 256 | eSTREAM (2008) | 2005 | — | Acceptable |
| National ciphers | Camellia | 128–256-bit key, 128-bit block | 128–256 | RFC 3713 (2004) | 2000 | — | Acceptable |
| | ARIA | 128–256-bit key, 128-bit block | 128–256 | RFC 5794 (2010) | 2003 | — | Acceptable |
| | SM4 | 128-bit key, 128-bit block | 128 | GB/T 32907 (2016), RFC 8998 (2021) | 2006 | — | Acceptable |
| DES | DES | 56-bit key, 64-bit block | 56 | FIPS 46 (1977) | 1977 | withdrawn 2005 | Broken |
| | 3DES | 168-bit key, 64-bit block | 112 | ANSI X9.52 (1998), SP 800-67 | 1998 | Sweet32 (2016); NIST: disallowed after 2023 | Legacy |
| 64-bit block ciphers | Blowfish | 32–448-bit key, 64-bit block | — | — | 1993 | Sweet32 (2016) | Legacy |
| | IDEA, CAST5, RC2 | 40–128-bit key, 64-bit block | — | RFC 2144 (1997), RFC 2268 (1998) | 1987–1996 | Sweet32 (2016) | Legacy |
| RC4 | RC4 | 40–2048-bit key | — | — | 1987 | RFC 7465 (TLS, 2015), RFC 8758 (SSH, 2020) | Broken |

## 5. Cipher modes and AEAD

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [AEAD](05-modes-aead/AEAD.md) | AES-GCM | 128 / 256-bit key, 128-bit tag | 128 / 256 | SP 800-38D (2007), RFC 5116 (2008) | 2004 | — | Recommended |
| | ChaCha20-Poly1305 | 256-bit key, 128-bit tag | 256 | RFC 8439 (2018) | 2013 | — | Recommended |
| | AES-GCM-SIV | 128 / 256-bit key, 128-bit tag | 128 / 256 | RFC 8452 (2019) | 2015 | — | Recommended |
| | AES-CCM | 128 / 256-bit key | 128 / 256 | RFC 3610 (2003), SP 800-38C (2004) | 2002 | — | Acceptable |
| | AES-OCB | 128 / 256-bit key | 128 / 256 | RFC 7253 (2014) | 2001 | — | Acceptable |
| | Ascon-AEAD128 | 128-bit key, 128-bit tag | 128 | SP 800-232 (2025) | 2014 | — | Recommended |
| | AEGIS-128L/256 | 128 / 256-bit key | 128 / 256 | IETF draft | 2013 | — | Draft |
| Classic modes | CTR | — | — | SP 800-38A (2001) | 1979 | — | Acceptable (needs a MAC) |
| | CBC | — | — | FIPS 81 (1980), SP 800-38A (2001) | 1976 | dropped in TLS 1.3 (2018) | Legacy |
| | CFB, OFB | — | — | FIPS 81 (1980) | 1980 | — | Legacy |
| | ECB | — | — | FIPS 81 (1980) | 1980 | — | Broken |
| Disk encryption | XTS-AES | 256 / 512-bit key (two AES keys) | 128 / 256 | IEEE 1619 (2007), SP 800-38E (2010) | 2004 | — | Recommended |
| | Adiantum | 256-bit key | 256 | — | 2018 | — | Acceptable |
| Key wrap | AES-KW / KWP | 128 / 256-bit key | 128 / 256 | RFC 3394 (2002), RFC 5649 (2009) | 2001 | — | Recommended |
| Format-preserving | FF1 | 128 / 256-bit AES key | — | SP 800-38G (2016) | 2010 | — | Acceptable |
| | FF3 | 128 / 256-bit AES key | — | SP 800-38G (2016) | 2010 | broken in 2017 | Broken |

## 6. MAC

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [HMAC](06-mac/HMAC.md) | HMAC-SHA-256/384/512 | 256 / 384 / 512-bit tag | 256 | RFC 2104 (1997), FIPS 198-1 (2008) | 1996 | — | Recommended |
| | HMAC-SHA-1 | 160-bit tag | 160 | RFC 2104 (1997) | 1996 | — | Legacy |
| | HMAC-MD5 | 128-bit tag | 128 | RFC 2104 (1997) | 1996 | RFC 6151 (2011) | Legacy |
| Block-cipher MAC | CMAC | 128-bit tag | 128 | SP 800-38B (2005), RFC 4493 (2006) | 2003 | — | Acceptable |
| | GMAC | 128-bit tag | 128 | SP 800-38D (2007) | 2004 | — | Acceptable |
| Universal hash | Poly1305 | 128-bit tag | ~100 | RFC 8439 (2018) | 2005 | — | Recommended |
| | UMAC | 64 / 128-bit tag | ~64 / ~128 | RFC 4418 (2006) | 1999 | — | Acceptable |
| KMAC | KMAC128/256 | any tag length | 128 / 256 | SP 800-185 (2016) | 2016 | — | Acceptable |
| SipHash | SipHash | 128-bit key, 64-bit tag | 64 | — | 2012 | — | Acceptable |

Keyed BLAKE2 and BLAKE3 also work as MACs; see BLAKE under hash functions.

## 7. Hash functions

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [SHA-2](07-hash/SHA-2.md) | SHA-256/384/512 | 256 / 384 / 512-bit output | 128 / 192 / 256 | FIPS 180-4 (2015), RFC 6234 (2011) | 2001 | — | Recommended |
| | SHA-224, SHA-512/256 | 224 / 256-bit output | 112 / 128 | FIPS 180-4 (2015) | 2004 / 2012 | — | Acceptable |
| [SHA-3](07-hash/SHA-3.md) | SHA3-256/384/512 | 256 / 384 / 512-bit output | 128 / 192 / 256 | FIPS 202 (2015) | 2008 | — | Recommended |
| | SHAKE128/256 | any output length | 128 / 256 | FIPS 202 (2015) | 2015 | — | Recommended |
| | Keccak-256 | 256-bit output | 128 | — | 2008 | — | Acceptable |
| BLAKE | BLAKE2b / BLAKE2s | up to 512 / 256-bit output | 256 / 128 | RFC 7693 (2015) | 2012 | — | Recommended |
| | BLAKE3 | 256-bit output (extendable) | 128 | — | 2020 | — | Recommended |
| Ascon | Ascon-Hash256 / XOF128 | 256-bit / any output | 128 | SP 800-232 (2025) | 2014 | — | Acceptable |
| SHA-1 | SHA-1 | 160-bit output | ~63 | FIPS 180-1 (1995), RFC 3174 (2001) | 1995 | SHAttered (2017); NIST retires it by 2030 | Broken |
| MD | MD5 | 128-bit output | — | RFC 1321 (1992) | 1992 | collisions (2004); RFC 6151 (2011) | Broken |
| | MD4 | 128-bit output | — | RFC 1320 (1992) | 1990 | RFC 6150 (2011) | Broken |
| RIPEMD | RIPEMD-160 | 160-bit output | 80 | ISO/IEC 10118-3 | 1996 | — | Legacy |

## 8. Key derivation and password hashing

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| [HKDF](08-kdf-password-hashing/HKDF.md) | HKDF | up to 255 × hash output | — | RFC 5869 (2010) | 2010 | — | Recommended |
| NIST KDFs | KBKDF | any output length | — | SP 800-108 (2009) | 2009 | — | Acceptable |
| | one-step KDF (ConcatKDF) | any output length | — | SP 800-56A (2006) | 2006 | — | Acceptable |
| | X9.63 KDF | any output length | — | ANSI X9.63 (2001) | 2001 | — | Acceptable |
| [Argon2](08-kdf-password-hashing/Argon2.md) | Argon2id | any output, 19 MiB+ memory | — | RFC 9106 (2021) | 2015 | — | Recommended |
| | Argon2i / Argon2d | any output, set memory | — | RFC 9106 (2021) | 2015 | — | Acceptable |
| [scrypt](08-kdf-password-hashing/scrypt.md) | scrypt | any output, 128·N·r B memory | — | RFC 7914 (2016) | 2009 | — | Recommended |
| | yescrypt | 256-bit output | — | — | 2015 | — | Acceptable |
| [bcrypt](08-kdf-password-hashing/bcrypt.md) | bcrypt | 184-bit hash, 72 B input max | — | — | 1999 | — | Acceptable |
| [PBKDF](08-kdf-password-hashing/PBKDF2.md) | PBKDF2 | any output (keep ≤ hash size) | — | RFC 2898 (2000), RFC 8018 (2017), SP 800-132 (2010) | 2000 | — | Acceptable |
| | PBKDF1 | ≤160-bit output | — | RFC 2898 (2000) | 1993 | RFC 8018 (2017) | Legacy |
| Unix crypt | sha256crypt / sha512crypt | 256 / 512-bit output | — | — | 2007 | — | Legacy |
| | DES-crypt, MD5-crypt | 8-char password / 128-bit output | — | — | 1979 / 1994 | MD5-crypt retired by its author (2012) | Broken |

## 9. Random number generation

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| OS RNG | Linux `getrandom` / `/dev/urandom`, Windows `BCryptGenRandom`, macOS | — | — | — | 1994 | — | Recommended |
| | ChaCha20-based OS RNG (Linux 4.8+, OpenBSD `arc4random`) | 256-bit key | 256 | — | 2013 | — | Recommended |
| | RC4-based `arc4random` | — | — | — | 1997 | replaced 2013–2014 | Broken |
| NIST DRBG | HMAC_DRBG, Hash_DRBG, CTR_DRBG | 112–256-bit strength | 112–256 | SP 800-90A (2006, Rev 1 2015) | 2006 | — | Recommended |
| | Dual_EC_DRBG | 256-bit curve | — | SP 800-90A (2006) | 2006 | withdrawn 2014 (backdoor) | Broken |
| Entropy sources | entropy source testing | — | — | SP 800-90B (2018) | 2018 | — | Recommended |
| Non-crypto PRNGs | Mersenne Twister, `rand()` | 19,937-bit state | none | — | 1997 | never safe for crypto | Broken |

## 10. Math foundations

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| Primality | [Sieve of Eratosthenes](10-math-foundations/Sieve-of-Eratosthenes.md) | — | — | — | ~240 BC | — | Recommended (small primes) |
| | Fermat test | — | — | — | 1640 | fooled by Carmichael numbers | Broken |
| | [Miller-Rabin](10-math-foundations/Miller-Rabin-Primality-Test.md) | — | — | used in FIPS 186-5 | 1976 / 1980 | — | Recommended |
| | [Baillie-PSW](10-math-foundations/Baillie-PSW-Primality-Test.md) | — | — | — | 1980 | — | Recommended |
| | [Pocklington](10-math-foundations/Pocklington-Primality-Test.md) | — | — | — | 1914 | — | Acceptable (proofs) |
| Special primes | [Mersenne](10-math-foundations/Mersenne-Primes.md), [Fermat primes](10-math-foundations/Fermat-Primes.md) | — | — | — | 1644 / 1640 | — | Theory |
| Hard problems | factoring (RSA) | — | — | — | 1977 | Shor's algorithm (1994) | Quantum-vulnerable |
| | discrete log (DH, DSA) | — | — | — | 1976 | Shor's algorithm (1994) | Quantum-vulnerable |
| | elliptic-curve discrete log | — | — | — | 1985 | Shor's algorithm (1994) | Quantum-vulnerable |
| | lattices (LWE, Module-LWE) | — | — | — | 2005 | — | Recommended (PQ) |
| | hash-based | — | — | — | 1979 | — | Recommended (PQ) |
| | codes (McEliece, HQC) | — | — | — | 1978 | — | Acceptable (PQ) |
| | isogenies (SIKE) | — | — | — | 2011 | broken 2022 | Broken |
| | multivariate (Rainbow) | — | — | — | 2005 | broken 2022 | Broken |
| Elliptic curves | Curve25519 | 255-bit | 128 | RFC 7748 (2016) | 2006 | — | Recommended |
| | Curve448 | 448-bit | 224 | RFC 7748 (2016) | 2015 | — | Acceptable |
| | P-256 / P-384 / P-521 | 256 / 384 / 521-bit | 128 / 192 / 256 | FIPS 186-2 (2000), SP 800-186 (2023) | 1999 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | P-192 / P-224 | 192 / 224-bit | 96 / 112 | FIPS 186-2 (2000) | 1999 | SP 800-186 (2023): legacy only | Legacy |
| | secp256k1 | 256-bit | 128 | SEC 2 (2000) | 2000 | — | Acceptable |
| | Brainpool | 160–512-bit | 80–256 | RFC 5639 (2010) | 2005 | — | Acceptable |

## 11. Advanced primitives

| Family | Algorithm | Size | Security (bits) | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|---|---|
| Secret sharing | Shamir's secret sharing | — | — | — | 1979 | — | Recommended |
| | Feldman / Pedersen verifiable secret sharing | — | — | — | 1987 / 1991 | — | Acceptable |
| Threshold signatures | FROST | 256-bit group | 128 | RFC 9591 (2024) | 2020 | — | Recommended |
| | threshold ECDSA (GG18, CGGMP) | — | — | — | 2018 | — | Acceptable |
| | BLS (aggregate signatures) | 381-bit curve (BLS12-381) | ~120 | IETF draft | 2001 | — | Acceptable |
| Zero-knowledge proofs | Schnorr proof | 256-bit group | 128 | RFC 8235 (2017) | 1989 | — | Recommended |
| | zk-SNARKs (Groth16, PLONK) | — | — | — | 2016 / 2019 | — | Acceptable |
| | zk-STARKs | — | — | — | 2018 | — | Acceptable (PQ) |
| | Bulletproofs | — | — | — | 2017 | — | Acceptable |
| Homomorphic encryption | Paillier | 2048-bit and larger modulus | 112+ | ISO/IEC 18033-6 (2019) | 1999 | — | Acceptable |
| | BGV / BFV / CKKS | — | — | HomomorphicEncryption.org (2018) | 2011–2017 | — | Acceptable |
| | TFHE | — | — | — | 2016 | — | Acceptable |
| Multi-party computation | garbled circuits (Yao), SPDZ | — | — | — | 1986 / 2012 | — | Acceptable |
| OPRF | OPRF / VOPRF / POPRF | 256-bit group | 128 | RFC 9497 (2023) | 2005 | — | Recommended |
| VRF | ECVRF | 256-bit curve | 128 | RFC 9381 (2023) | 1999 | — | Acceptable |
| Commitments | Pedersen commitment | 256-bit group | 128 | — | 1991 | — | Acceptable |

## Also here

- [FAQ](FAQ.md): brute force, precomputation, rainbow tables, and why they fail.
