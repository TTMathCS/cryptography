# Algorithm reference

*One page for every algorithm family: its sizes, standards, status and closed "Going deeper" boxes. The [book](../book/index.md) teaches them in order; these pages are where you look things up. For everything on one screen, see the [full table](table.md).*


## Key exchange

- [Diffie-Hellman Key Exchange](../01-key-exchange/Diffie-Hellman.md)
- [ECDH (elliptic-curve Diffie-Hellman)](../01-key-exchange/ECDH.md)
- [ML-KEM (Kyber)](../01-key-exchange/ML-KEM.md)
- [NTRU Prime (sntrup761)](../01-key-exchange/NTRU-Prime.md)
- [Code-Based KEMs (HQC, Classic McEliece)](../01-key-exchange/Code-Based-KEMs.md)
- [PAKE (Password-Authenticated Key Exchange)](../01-key-exchange/PAKE.md)

## Signatures

- [RSA (Rivest–Shamir–Adleman)](../02-signatures/RSA.md)
- [DSA (Digital Signature Algorithm)](../02-signatures/DSA.md)
- [ECDSA (Elliptic Curve Digital Signature Algorithm)](../02-signatures/ECDSA.md)
- [Schnorr signatures](../02-signatures/Schnorr.md)
- [EdDSA (Ed25519 and Ed448)](../02-signatures/EdDSA.md)
- [ML-DSA (Dilithium)](../02-signatures/ML-DSA.md)
- [FN-DSA (Falcon)](../02-signatures/FN-DSA.md)
- [SLH-DSA (SPHINCS+)](../02-signatures/SLH-DSA.md)
- [Stateful hash-based signatures (LMS, XMSS)](../02-signatures/Stateful-Hash-Signatures.md)
- [Blind signatures](../02-signatures/Blind-Signatures.md)

## Public-key encryption

- [ElGamal encryption](../03-public-key-encryption/ElGamal.md)
- [ECIES (Elliptic Curve Integrated Encryption Scheme)](../03-public-key-encryption/ECIES.md)
- [HPKE (Hybrid Public Key Encryption)](../03-public-key-encryption/HPKE.md)

## Symmetric ciphers

- [AES (Advanced Encryption Standard)](../04-symmetric-ciphers/AES.md)
- [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md)
- [National ciphers](../04-symmetric-ciphers/National-Ciphers.md)
- [Retired ciphers](../04-symmetric-ciphers/Retired.md)

## Modes and AEAD

- [AEAD (authenticated encryption)](../05-modes-aead/AEAD.md)
- [Classic modes](../05-modes-aead/Classic-Modes.md)
- [Disk encryption](../05-modes-aead/Disk-Encryption.md)
- [Key wrap](../05-modes-aead/Key-Wrap.md)
- [Format-preserving encryption](../05-modes-aead/Format-Preserving.md)

## MACs

- [HMAC (Hash-based Message Authentication Code)](../06-mac/HMAC.md)
- [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md)
- [Universal hash MACs](../06-mac/Universal-Hash-MACs.md)
- [KMAC (KECCAK Message Authentication Code)](../06-mac/KMAC.md)
- [SipHash](../06-mac/SipHash.md)

## Hash functions

- [SHA-2 (SHA-256, SHA-384, SHA-512)](../07-hash/SHA-2.md)
- [SHA-3 (Keccak)](../07-hash/SHA-3.md)
- [BLAKE, BLAKE2 and BLAKE3](../07-hash/BLAKE.md)
- [Retired hashes](../07-hash/Retired.md)

## KDF and password hashing

- [HKDF (HMAC-based Key Derivation)](../08-kdf-password-hashing/HKDF.md)
- [NIST KDFs (KBKDF, one-step and X9.63)](../08-kdf-password-hashing/NIST-KDFs.md)
- [Argon2](../08-kdf-password-hashing/Argon2.md)
- [scrypt](../08-kdf-password-hashing/scrypt.md)
- [bcrypt](../08-kdf-password-hashing/bcrypt.md)
- [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)
- [Retired password hashes](../08-kdf-password-hashing/Retired.md)

## Random numbers

- [OS random number generators](../09-random/OS-RNG.md)
- [NIST DRBGs (SP 800-90A, B and C)](../09-random/NIST-DRBG.md)
- [Retired random generators](../09-random/Retired.md)

## Math foundations

- [Sieve of Eratosthenes](../10-math-foundations/Sieve-of-Eratosthenes.md)
- [Miller-Rabin Primality Test](../10-math-foundations/Miller-Rabin-Primality-Test.md)
- [Baillie-PSW Primality Test](../10-math-foundations/Baillie-PSW-Primality-Test.md)
- [Pocklington Primality Test](../10-math-foundations/Pocklington-Primality-Test.md)
- [Mersenne Primes](../10-math-foundations/Mersenne-Primes.md)
- [Fermat Primes](../10-math-foundations/Fermat-Primes.md)
- [Hard Problems](../10-math-foundations/Hard-Problems.md)
- [Elliptic Curves](../10-math-foundations/Elliptic-Curves.md)

## Advanced primitives

- [Secret sharing](../11-advanced/Secret-Sharing.md)
- [Threshold signatures](../11-advanced/Threshold-Signatures.md)
- [Zero-knowledge proofs](../11-advanced/Zero-Knowledge.md)
- [Homomorphic encryption](../11-advanced/Homomorphic-Encryption.md)
- [Multi-party computation](../11-advanced/MPC.md)
- [OPRF (oblivious pseudorandom function)](../11-advanced/OPRF.md)
- [VRF (verifiable random function)](../11-advanced/VRF.md)
- [Commitments](../11-advanced/Commitments.md)
