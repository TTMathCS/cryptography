# Cryptography

*Every algorithm family SSH, TLS and PKI use, in 11 categories, with its
standard, release year and where it stands today.*

When SSH or TLS connects, it picks one algorithm for each job: a key exchange,
a signature, a cipher, a MAC and a hash. The tables below list the algorithms
themselves. [Protocols](protocols/index.md) shows the other side: what SSH,
TLS, WireGuard, Signal and others actually run.

**Columns:** *Released* is the year the algorithm first appeared. *Standard* is
the RFC, FIPS or other document that defines it. *Deprecated* says when and by
whom it was retired. *Status* is one of Recommended, Acceptable, Legacy, Broken
or Draft (standard not final). **PQ** marks post-quantum families.

NIST IR 8547 is NIST's plan to deprecate RSA and elliptic-curve algorithms at
112-bit security (RSA-2048, P-256) in 2030 and to disallow all of them in 2035.

Families with a link have their own page. The rest get theirs in later updates.

## 1. Key exchange

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [Diffie-Hellman (finite field)](01-key-exchange/Diffie-Hellman.md) | 2048-bit and larger groups | RFC 3526 (2003), RFC 7919 (2016) | 1976 | — | Acceptable |
| | 1024-bit and smaller groups | RFC 2409 (1998) | 1998 | Logjam (2015); RFC 9142 (2022) for SSH | Broken |
| [Diffie-Hellman (elliptic curve)](01-key-exchange/ECDH.md) | X25519 | RFC 7748 (2016) | 2006 | — | Recommended |
| | X448 | RFC 7748 (2016) | 2015 | — | Acceptable |
| | ECDH P-256/384/521 | SP 800-56A (2006), RFC 8422 (2018) | 1999 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | ECDH Brainpool | RFC 5639 (2010) | 2005 | — | Acceptable |
| [ML-KEM](01-key-exchange/ML-KEM.md) (PQ, lattice) | ML-KEM-512/768/1024 | FIPS 203 (2024) | 2017 | — | Recommended |
| | X25519 + ML-KEM-768 hybrid | IETF drafts (TLS, SSH) | 2024 | — | Recommended |
| NTRU Prime (PQ, lattice) | sntrup761 + X25519 hybrid | IETF draft | 2016 | — | Acceptable |
| Code-based (PQ) | HQC | NIST pick 2025, standard due ~2027 | 2017 | — | Draft |
| | Classic McEliece | ISO draft | 1978 | — | Acceptable |
| [RSA key transport](02-signatures/RSA.md) | RSA-encrypted session key | RFC 5246 (TLS 1.2) | 1977 | dropped in TLS 1.3, RFC 8446 (2018) | Legacy |
| PAKE (password-based) | SAE / Dragonfly | RFC 7664 (2015), IEEE 802.11 (WPA3) | 2008 | — | Recommended |
| | OPAQUE | RFC 9807 (2025) | 2018 | — | Recommended |
| | SPAKE2 | RFC 9382 (2023) | 2005 | — | Acceptable |
| | CPace | IETF draft | 2019 | — | Draft |
| | SRP | RFC 2945 (2000), RFC 5054 (2007) | 1998 | — | Legacy |

The current SSH and TLS defaults run X25519 and ML-KEM-768 side by side and
combine the two secrets, so the session stays safe if either one breaks.

## 2. Digital signatures

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [RSA](02-signatures/RSA.md) | RSA-PSS | RFC 3447 (2003), RFC 8017 (2016) | 1996 | NIST IR 8547: 2030 / 2035 | Recommended |
| | PKCS#1 v1.5 | RFC 2313 (1998), RFC 8017 (2016) | 1993 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | RSA with SHA-1 | RFC 3279 (2002) | 1995 | NIST SP 800-131A (after 2013); OpenSSH 8.8 (2021) | Broken |
| | keys under 2048 bits | — | — | NIST SP 800-131A (after 2013) | Broken |
| [DSA](02-signatures/DSA.md) | DSA | FIPS 186 (1994) | 1991 | FIPS 186-5 (2023); OpenSSH 10 (2025) | Legacy |
| [ECDSA](02-signatures/ECDSA.md) | P-256/384/521 | ANSI X9.62 (1999), FIPS 186-2 (2000) | 1992 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | deterministic ECDSA | RFC 6979 (2013) | 2013 | — | Recommended |
| | secp256k1 | SEC 2 (2000) | 2000 | — | Acceptable |
| Schnorr | BIP-340 | BIP-340 (2020) | 1989 | — | Acceptable |
| [EdDSA](02-signatures/EdDSA.md) | Ed25519 | RFC 8032 (2017), FIPS 186-5 (2023) | 2011 | — | Recommended |
| | Ed448 | RFC 8032 (2017) | 2015 | — | Acceptable |
| [ML-DSA](02-signatures/ML-DSA.md) (PQ, lattice) | ML-DSA-44/65/87 | FIPS 204 (2024) | 2017 | — | Recommended |
| FN-DSA (PQ, lattice) | Falcon-512/1024 | FIPS 206 (draft) | 2017 | — | Draft |
| SLH-DSA (PQ, hash) | SLH-DSA | FIPS 205 (2024) | 2015 | — | Acceptable |
| Stateful hash-based (PQ) | LMS / HSS | RFC 8554 (2019), SP 800-208 (2020) | 1995 | — | Recommended |
| | XMSS | RFC 8391 (2018), SP 800-208 (2020) | 2011 | — | Acceptable |
| Blind signatures | RSA blind signatures | RFC 9474 (2023) | 1982 | — | Acceptable |

## 3. Public-key encryption

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [RSA](02-signatures/RSA.md) | RSA-OAEP | RFC 2437 (1998), RFC 8017 (2016) | 1994 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | PKCS#1 v1.5 encryption | RFC 2313 (1998) | 1993 | Bleichenbacher (1998), ROBOT (2017); NIST SP 800-131A (after 2023) | Broken |
| | textbook RSA (no padding) | — | 1977 | never safe | Broken |
| ElGamal | ElGamal | RFC 4880 (OpenPGP, 2007) | 1985 | — | Legacy |
| ECIES | ECIES | SEC 1 (2000), ISO 18033-2 (2006) | 2001 | — | Acceptable |
| HPKE | DHKEM + HKDF + AEAD | RFC 9180 (2022) | 2022 | — | Recommended |
| | HPKE with ML-KEM / X-Wing | IETF drafts | 2024 | — | Draft |

## 4. Symmetric ciphers

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [AES](04-symmetric-ciphers/AES.md) | AES-128/192/256 | FIPS 197 (2001) | 1998 | — | Recommended |
| | Serpent, Twofish (AES finalists) | — | 1998 | — | Acceptable |
| ChaCha / Salsa | ChaCha20 | RFC 8439 (2018) | 2008 | — | Recommended |
| | Salsa20 | eSTREAM (2008) | 2005 | — | Acceptable |
| National ciphers | Camellia | RFC 3713 (2004) | 2000 | — | Acceptable |
| | ARIA | RFC 5794 (2010) | 2003 | — | Acceptable |
| | SM4 | GB/T 32907 (2016), RFC 8998 (2021) | 2006 | — | Acceptable |
| DES | DES | FIPS 46 (1977) | 1977 | withdrawn 2005 | Broken |
| | 3DES | ANSI X9.52 (1998), SP 800-67 | 1998 | Sweet32 (2016); NIST: disallowed after 2023 | Legacy |
| 64-bit block ciphers | Blowfish | — | 1993 | Sweet32 (2016) | Legacy |
| | IDEA, CAST5, RC2 | RFC 2144 (1997), RFC 2268 (1998) | 1987–1996 | Sweet32 (2016) | Legacy |
| RC4 | RC4 | — | 1987 | RFC 7465 (TLS, 2015), RFC 8758 (SSH, 2020) | Broken |

## 5. Cipher modes and AEAD

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [AEAD](05-modes-aead/AEAD.md) | AES-GCM | SP 800-38D (2007), RFC 5116 (2008) | 2004 | — | Recommended |
| | ChaCha20-Poly1305 | RFC 8439 (2018) | 2013 | — | Recommended |
| | AES-GCM-SIV | RFC 8452 (2019) | 2015 | — | Recommended |
| | AES-CCM | RFC 3610 (2003), SP 800-38C (2004) | 2002 | — | Acceptable |
| | AES-OCB | RFC 7253 (2014) | 2001 | — | Acceptable |
| | Ascon-AEAD128 | SP 800-232 (2025) | 2014 | — | Recommended |
| | AEGIS-128L/256 | IETF draft | 2013 | — | Draft |
| Classic modes | CTR | SP 800-38A (2001) | 1979 | — | Acceptable (needs a MAC) |
| | CBC | FIPS 81 (1980), SP 800-38A (2001) | 1976 | dropped in TLS 1.3 (2018) | Legacy |
| | CFB, OFB | FIPS 81 (1980) | 1980 | — | Legacy |
| | ECB | FIPS 81 (1980) | 1980 | — | Broken |
| Disk encryption | XTS-AES | IEEE 1619 (2007), SP 800-38E (2010) | 2004 | — | Recommended |
| | Adiantum | — | 2018 | — | Acceptable |
| Key wrap | AES-KW / KWP | RFC 3394 (2002), RFC 5649 (2009) | 2001 | — | Recommended |
| Format-preserving | FF1 | SP 800-38G (2016) | 2010 | — | Acceptable |
| | FF3 | SP 800-38G (2016) | 2010 | broken in 2017 | Broken |

## 6. MAC

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [HMAC](06-mac/HMAC.md) | HMAC-SHA-256/384/512 | RFC 2104 (1997), FIPS 198-1 (2008) | 1996 | — | Recommended |
| | HMAC-SHA-1 | RFC 2104 (1997) | 1996 | — | Legacy |
| | HMAC-MD5 | RFC 2104 (1997) | 1996 | RFC 6151 (2011) | Legacy |
| Block-cipher MAC | CMAC | SP 800-38B (2005), RFC 4493 (2006) | 2003 | — | Acceptable |
| | GMAC | SP 800-38D (2007) | 2004 | — | Acceptable |
| Universal hash | Poly1305 | RFC 8439 (2018) | 2005 | — | Recommended |
| | UMAC | RFC 4418 (2006) | 1999 | — | Acceptable |
| KMAC | KMAC128/256 | SP 800-185 (2016) | 2016 | — | Acceptable |
| SipHash | SipHash | — | 2012 | — | Acceptable |

Keyed BLAKE2 and BLAKE3 also work as MACs; see BLAKE under hash functions.

## 7. Hash functions

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [SHA-2](07-hash/SHA-2.md) | SHA-256/384/512 | FIPS 180-4 (2015), RFC 6234 (2011) | 2001 | — | Recommended |
| | SHA-224, SHA-512/256 | FIPS 180-4 (2015) | 2004 / 2012 | — | Acceptable |
| [SHA-3](07-hash/SHA-3.md) | SHA3-256/384/512 | FIPS 202 (2015) | 2008 | — | Recommended |
| | SHAKE128/256 | FIPS 202 (2015) | 2015 | — | Recommended |
| | Keccak-256 | — | 2008 | — | Acceptable |
| BLAKE | BLAKE2b / BLAKE2s | RFC 7693 (2015) | 2012 | — | Recommended |
| | BLAKE3 | — | 2020 | — | Recommended |
| Ascon | Ascon-Hash256 / XOF128 | SP 800-232 (2025) | 2014 | — | Acceptable |
| SHA-1 | SHA-1 | FIPS 180-1 (1995), RFC 3174 (2001) | 1995 | SHAttered (2017); NIST retires it by 2030 | Broken |
| MD | MD5 | RFC 1321 (1992) | 1992 | collisions (2004); RFC 6151 (2011) | Broken |
| | MD4 | RFC 1320 (1992) | 1990 | RFC 6150 (2011) | Broken |
| RIPEMD | RIPEMD-160 | ISO/IEC 10118-3 | 1996 | — | Legacy |

## 8. Key derivation and password hashing

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| [HKDF](08-kdf-password-hashing/HKDF.md) | HKDF | RFC 5869 (2010) | 2010 | — | Recommended |
| NIST KDFs | KBKDF | SP 800-108 (2009) | 2009 | — | Acceptable |
| | one-step KDF (ConcatKDF) | SP 800-56A (2006) | 2006 | — | Acceptable |
| | X9.63 KDF | ANSI X9.63 (2001) | 2001 | — | Acceptable |
| [Argon2](08-kdf-password-hashing/Argon2.md) | Argon2id | RFC 9106 (2021) | 2015 | — | Recommended |
| | Argon2i / Argon2d | RFC 9106 (2021) | 2015 | — | Acceptable |
| [scrypt](08-kdf-password-hashing/scrypt.md) | scrypt | RFC 7914 (2016) | 2009 | — | Recommended |
| | yescrypt | — | 2015 | — | Acceptable |
| [bcrypt](08-kdf-password-hashing/bcrypt.md) | bcrypt | — | 1999 | — | Acceptable |
| [PBKDF](08-kdf-password-hashing/PBKDF2.md) | PBKDF2 | RFC 2898 (2000), RFC 8018 (2017), SP 800-132 (2010) | 2000 | — | Acceptable |
| | PBKDF1 | RFC 2898 (2000) | 1993 | RFC 8018 (2017) | Legacy |
| Unix crypt | sha256crypt / sha512crypt | — | 2007 | — | Legacy |
| | DES-crypt, MD5-crypt | — | 1979 / 1994 | MD5-crypt retired by its author (2012) | Broken |

## 9. Random number generation

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| OS RNG | Linux `getrandom` / `/dev/urandom`, Windows `BCryptGenRandom`, macOS | — | 1994 | — | Recommended |
| | ChaCha20-based OS RNG (Linux 4.8+, OpenBSD `arc4random`) | — | 2013 | — | Recommended |
| | RC4-based `arc4random` | — | 1997 | replaced 2013–2014 | Broken |
| NIST DRBG | HMAC_DRBG, Hash_DRBG, CTR_DRBG | SP 800-90A (2006, Rev 1 2015) | 2006 | — | Recommended |
| | Dual_EC_DRBG | SP 800-90A (2006) | 2006 | withdrawn 2014 (backdoor) | Broken |
| Entropy sources | entropy source testing | SP 800-90B (2018) | 2018 | — | Recommended |
| Non-crypto PRNGs | Mersenne Twister, `rand()` | — | 1997 | never safe for crypto | Broken |

## 10. Math foundations

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| Primality | [Sieve of Eratosthenes](10-math-foundations/Sieve-of-Eratosthenes.md) | — | ~240 BC | — | Recommended (small primes) |
| | Fermat test | — | 1640 | fooled by Carmichael numbers | Broken |
| | [Miller-Rabin](10-math-foundations/Miller-Rabin-Primality-Test.md) | used in FIPS 186-5 | 1976 / 1980 | — | Recommended |
| | [Baillie-PSW](10-math-foundations/Baillie-PSW-Primality-Test.md) | — | 1980 | — | Recommended |
| | [Pocklington](10-math-foundations/Pocklington-Primality-Test.md) | — | 1914 | — | Acceptable (proofs) |
| Special primes | [Mersenne](10-math-foundations/Mersenne-Primes.md), [Fermat primes](10-math-foundations/Fermat-Primes.md) | — | 1644 / 1640 | — | Theory |
| Hard problems | factoring (RSA) | — | 1977 | Shor's algorithm (1994) | Quantum-vulnerable |
| | discrete log (DH, DSA) | — | 1976 | Shor's algorithm (1994) | Quantum-vulnerable |
| | elliptic-curve discrete log | — | 1985 | Shor's algorithm (1994) | Quantum-vulnerable |
| | lattices (LWE, Module-LWE) | — | 2005 | — | Recommended (PQ) |
| | hash-based | — | 1979 | — | Recommended (PQ) |
| | codes (McEliece, HQC) | — | 1978 | — | Acceptable (PQ) |
| | isogenies (SIKE) | — | 2011 | broken 2022 | Broken |
| | multivariate (Rainbow) | — | 2005 | broken 2022 | Broken |
| Elliptic curves | Curve25519 | RFC 7748 (2016) | 2006 | — | Recommended |
| | Curve448 | RFC 7748 (2016) | 2015 | — | Acceptable |
| | P-256 / P-384 / P-521 | FIPS 186-2 (2000), SP 800-186 (2023) | 1999 | NIST IR 8547: 2030 / 2035 | Acceptable |
| | P-192 / P-224 | FIPS 186-2 (2000) | 1999 | SP 800-186 (2023): legacy only | Legacy |
| | secp256k1 | SEC 2 (2000) | 2000 | — | Acceptable |
| | Brainpool | RFC 5639 (2010) | 2005 | — | Acceptable |

## 11. Advanced primitives

| Family | Algorithm | Standard | Released | Deprecated | Status |
|---|---|---|---|---|---|
| Secret sharing | Shamir's secret sharing | — | 1979 | — | Recommended |
| | Feldman / Pedersen verifiable secret sharing | — | 1987 / 1991 | — | Acceptable |
| Threshold signatures | FROST | RFC 9591 (2024) | 2020 | — | Recommended |
| | threshold ECDSA (GG18, CGGMP) | — | 2018 | — | Acceptable |
| | BLS (aggregate signatures) | IETF draft | 2001 | — | Acceptable |
| Zero-knowledge proofs | Schnorr proof | RFC 8235 (2017) | 1989 | — | Recommended |
| | zk-SNARKs (Groth16, PLONK) | — | 2016 / 2019 | — | Acceptable |
| | zk-STARKs | — | 2018 | — | Acceptable (PQ) |
| | Bulletproofs | — | 2017 | — | Acceptable |
| Homomorphic encryption | Paillier | ISO/IEC 18033-6 (2019) | 1999 | — | Acceptable |
| | BGV / BFV / CKKS | HomomorphicEncryption.org (2018) | 2011–2017 | — | Acceptable |
| | TFHE | — | 2016 | — | Acceptable |
| Multi-party computation | garbled circuits (Yao), SPDZ | — | 1986 / 2012 | — | Acceptable |
| OPRF | OPRF / VOPRF / POPRF | RFC 9497 (2023) | 2005 | — | Recommended |
| VRF | ECVRF | RFC 9381 (2023) | 1999 | — | Acceptable |
| Commitments | Pedersen commitment | — | 1991 | — | Acceptable |

## Also here

- [FAQ](FAQ.md): brute force, precomputation, rainbow tables, and why they fail.
