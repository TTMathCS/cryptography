# Glossary

*Short definitions of the terms this book uses, from A to Z, each with a link to the section that teaches it. Dates and statuses are as of November 2026.*

## A

**ACVP (Automated Cryptographic Validation Protocol)**
NIST's system for testing implementations of approved algorithms against published test vectors. Its JSON vectors for ML-KEM, ML-DSA and SLH-DSA were used to check this book's code.
See [Chapter 17, §17.8](17-Implementing-Post-Quantum-Safely.md#178-failures-oracles-and-checks).

## B

**BIKE**
A code-based KEM built on quasi-cyclic moderate-density parity-check (QC-MDPC) codes and decoded by bit flipping. A fourth-round candidate that NIST did not select in March 2025.
See [Chapter 14, §14.3](14-HQC-and-BIKE.md#143-bike-qc-mdpc-codes).

**Bit flipping**
The iterative decoder of BIKE and other low- and moderate-density parity-check codes: count the unsatisfied checks touching each bit, flip the bits with the most, repeat. Invented by Robert Gallager in 1962.
See [Chapter 14, §14.3](14-HQC-and-BIKE.md#143-bike-qc-mdpc-codes).

**BKZ**
Block Korkine-Zolotarev reduction: lattice reduction that improves a basis block by block, using an exact shortest-vector search inside each block. Its block size $\beta$ is the main measure of an attack's cost.
See [Chapter 6, §6.5](06-Lattice-Reduction-and-the-Estimator.md#65-bkz-reduction-block-by-block).

## C

**Classic McEliece**
A KEM based on Niederreiter encryption with binary Goppa codes: no practical break since 1978 in its original form, with tiny ciphertexts and public keys of hundreds of kilobytes to over a megabyte. Not selected by NIST; standardized by ISO in 2026 (ISO/IEC 18033-2 Amd 2). After new structural attacks on Goppa codes in 2026, Germany's BSI advised in early October 2026 against using it in new systems (as of November 2026).
See [Chapter 13, §13.9](13-Code-Based-Encryption-McEliece.md#139-classic-mceliece-in-the-world) and [§13.10](13-Code-Based-Encryption-McEliece.md#1310-standards-and-the-attacks-of-2026).

**CNSA 2.0**
The NSA's Commercial National Security Algorithm Suite 2.0 (2022): ML-KEM-1024, ML-DSA-87, and LMS or XMSS for firmware, with exclusive use required between 2030 and 2033 depending on the system, and all systems by 2035.
See [Chapter 18, §18.7](18-Hybrids-and-the-Migration.md#187-deadlines).

**Constant time**
Code whose instructions, memory accesses and instruction operands do not depend on secret values, so that its running time reveals nothing about them. It must be checked on the compiled code.
See [Chapter 17, §17.2](17-Implementing-Post-Quantum-Safely.md#172-constant-time-really).

**Core-SVP**
A conservative measure of a lattice attack's cost: the cost of a single shortest-vector search in the block size BKZ needs, about $2^{0.292\beta}$ classically.
See [Chapter 2, §2.5](02-Security-Levels.md#25-measuring-a-lattice-scheme-block-size-and-core-svp).

**CSIDH**
An isogeny-based Diffie-Hellman scheme (2018) using a commutative class group action on supersingular curves over $\mathbb{F}_p$. Unaffected by the SIDH attacks, but slow, and its quantum security is debated.
See [Chapter 16, §16.6](16-Isogenies.md#166-fix-it-what-the-community-kept).

## D

**Decryption failure**
A correctly formed ciphertext that a probabilistic decoder fails to decrypt. Lattice and some code-based KEMs fail with tiny probability; failures that depend on the secret key can leak it.
See [Chapter 3, §3.6](03-KEMs-and-Signatures.md#36-decryption-failures-as-a-security-property).

## F

**Fiat-Shamir with aborts**
Lyubashevsky's way to turn a lattice identification scheme into a signature: the signer restarts whenever the response would reveal information about the key. The basis of ML-DSA.
See [Chapter 3, §3.9](03-KEMs-and-Signatures.md#39-fiat-shamir-with-aborts).

**FIPS 203**
The NIST standard for ML-KEM, published August 2024.
See [Chapter 8, §8.1](08-ML-KEM.md#81-the-problem).

**FIPS 204**
The NIST standard for ML-DSA, published August 2024.
See [Chapter 9, §9.1](09-ML-DSA.md#91-the-problem).

**FIPS 205**
The NIST standard for SLH-DSA, published August 2024.
See [Chapter 12, §12.1](12-SLH-DSA.md#121-the-problem).

**FN-DSA**
The name NIST gave to its coming standard based on Falcon, FIPS 206. As of November 2026, no public draft had been released.
See [Chapter 10, §10.10](10-NTRU-Falcon-and-FN-DSA.md#1010-fn-dsa-and-the-real-world).

**FORS**
Forest of Random Subsets: the few-time signature at the bottom of SLH-DSA, which signs the message digest by revealing one leaf from each of $k$ small hash trees.
See [Chapter 12, §12.4](12-SLH-DSA.md#124-fors-a-forest-of-random-subsets).

**Fujisaki-Okamoto transform (FO)**
The construction that turns a passively secure public-key encryption scheme into an IND-CCA2 KEM by re-encrypting during decapsulation and rejecting any ciphertext that does not match.
See [Chapter 3, §3.5](03-KEMs-and-Signatures.md#35-the-fujisaki-okamoto-transform).

## G

**Grover's algorithm**
A quantum search algorithm that finds one marked item among $N$ in about $\sqrt{N}$ steps. It halves the effective bits of a symmetric key in theory, and much less in practice.
See [Chapter 1, §1.4](01-The-Quantum-Threat-Measured.md#14-grovers-algorithm-and-why-aes-survives).

**Gröbner basis**
A canonical generating set for a system of polynomial equations; algorithms that compute one (Buchberger, F4, F5) are the main general tool for solving MQ systems.
See [Chapter 15, §15.2](15-Multivariate-Signatures-and-the-On-Ramp.md#152-many-equations-many-unknowns).

## H

**Harvest now, decrypt later**
Recording encrypted traffic today to decrypt it once a large quantum computer exists. It makes post-quantum key exchange urgent before such a computer is built.
See [Chapter 1, §1.9](01-The-Quantum-Threat-Measured.md#19-harvest-now-decrypt-later-and-the-signature-problem).

**Hedged signing**
Signing in which the per-signature randomness is derived from the key, the message and fresh random bytes, so that it is safe if either the random generator works or no faults occur. The default in FIPS 204.
See [Chapter 17, §17.7](17-Implementing-Post-Quantum-Safely.md#177-fix-it-hedged-signing).

**HQC**
Hamming Quasi-Cyclic: a code-based KEM whose decryption decodes a noisy codeword with a public concatenated code. Selected by NIST in March 2025 as a backup to ML-KEM; it will become FIPS 207.
See [Chapter 14, §14.2](14-HQC-and-BIKE.md#142-hqc-noisy-codewords).

**Hybrid**
A key exchange (or signature) that combines a classical and a post-quantum algorithm so that breaking it requires breaking both. X25519MLKEM768 is the most widely used.
See [Chapter 18, §18.2](18-Hybrids-and-the-Migration.md#182-why-hybrid).

**Hypertree**
The layered structure of SLH-DSA: XMSS trees whose leaves are one-time keys signing the roots of trees in the layer below.
See [Chapter 12, §12.3](12-SLH-DSA.md#123-the-structure).

## I

**IND-CCA2**
Indistinguishability under adaptive chosen-ciphertext attack: the standard security goal for a KEM, in which the attacker may ask for decapsulation of any ciphertext except the challenge.
See [Chapter 3, §3.3](03-KEMs-and-Signatures.md#33-what-a-secure-kem-must-resist).

**Information-set decoding (ISD)**
The best known attack on decoding random linear codes: guess a set of positions free of errors and solve a linear system, repeating until the guess is right. Prange's 1962 version and its many descendants.
See [Chapter 13, §13.7](13-Code-Based-Encryption-McEliece.md#137-break-it-information-set-decoding).

**Isogeny**
A map between elliptic curves given by rational functions that respects the group law. It is determined by its kernel, and Vélu's formulas compute it.
See [Chapter 16, §16.2](16-Isogenies.md#162-isogenies).

## K

**Kipnis-Shamir attack**
The 1998 attack on balanced Oil and Vinegar that finds the oil space as an invariant subspace of matrices built from the public key.
See [Chapter 15, §15.4](15-Multivariate-Signatures-and-the-On-Ramp.md#154-break-it-balanced-oil-and-vinegar).

**KyberSlash**
Timing leaks from divisions by $q$ on secret values in ML-KEM implementations, reported in 2023-2024 and fixed by replacing each division with a multiplication and a shift.
See [Chapter 17, §17.3](17-Implementing-Post-Quantum-Safely.md#173-kyberslash-a-division-by-q).

## L

**Learning with errors (LWE)**
The problem of recovering a secret vector $s$ from many noisy inner products $\langle a, s\rangle + e \bmod q$. Its ring and module versions underlie ML-KEM and ML-DSA.
See [Chapter 5, §5.6](05-Lattices-and-Their-Hard-Problems.md#56-lwe-in-its-several-forms).

**LLL**
The Lenstra-Lenstra-Lovász algorithm (1982): polynomial-time lattice reduction that finds a basis of fairly short, fairly orthogonal vectors.
See [Chapter 6, §6.2](06-Lattice-Reduction-and-the-Estimator.md#62-lll).

**LMS**
Leighton-Micali Signatures (RFC 8554): a stateful hash-based signature built from Winternitz one-time keys and a Merkle tree, approved in NIST SP 800-208.
See [Chapter 11, §11.5](11-Stateful-Hash-Based-Signatures.md#115-lms-as-specified).

## M

**Masking**
A side-channel countermeasure that splits each secret into random shares and computes on them separately, so that no single intermediate value depends on the secret.
See [Chapter 17, §17.5](17-Implementing-Post-Quantum-Safely.md#175-power-electromagnetic-leaks-and-masking).

**MAYO**
A multivariate signature (Beullens, 2021) that uses an Oil and Vinegar map with a small oil space and "whips" it over several inputs, giving public keys of about 1.5 kilobytes. A round 3 candidate in NIST's on-ramp.
See [Chapter 15, §15.6](15-Multivariate-Signatures-and-the-On-Ramp.md#156-mayo-whipping-a-small-oil-space).

**Merkle Tree Certificates**
A proposed certificate structure in which a certificate authority signs the root of a Merkle tree covering a batch of certificates, removing most signatures from the TLS handshake. An IETF draft, in experiments with Chrome and Cloudflare in 2026.
See [Chapter 18, §18.6](18-Hybrids-and-the-Migration.md#186-the-signature-problem).

**ML-DSA**
Module-Lattice-Based Digital Signature Algorithm, FIPS 204: the standardized form of CRYSTALS-Dilithium.
See [Chapter 9, §9.4](09-ML-DSA.md#94-the-scheme).

**ML-KEM**
Module-Lattice-Based Key-Encapsulation Mechanism, FIPS 203: the standardized form of CRYSTALS-Kyber.
See [Chapter 8, §8.2](08-ML-KEM.md#82-the-plan-in-one-picture).

**Module-LWE**
LWE in which the secrets and samples are short vectors of polynomials over a ring such as $\mathbb{Z}_q[X]/(X^{256}+1)$. The hard problem behind ML-KEM and ML-DSA.
See [Chapter 7, §7.3](07-Rings-Modules-and-the-NTT.md#73-ring-lwe-and-module-lwe).

**Mosca's inequality**
If data must stay secret for $x$ years and migration takes $y$ years, and a quantum computer arrives in $z$ years, then $x + y > z$ means the data is already at risk.
See [Chapter 1, §1.8](01-The-Quantum-Threat-Measured.md#18-moscas-inequality-worked).

**MPC-in-the-head**
A way to build zero-knowledge proofs, and from them signatures, by simulating a multiparty computation and opening all but one party's view. Used by MQOM and SDitH.
See [Chapter 15, §15.8](15-Multivariate-Signatures-and-the-On-Ramp.md#158-the-on-ramp-round-by-round).

**MQ problem**
Solving a system of multivariate quadratic equations over a finite field. NP-hard in general and the basis of multivariate signatures.
See [Chapter 15, §15.2](15-Multivariate-Signatures-and-the-On-Ramp.md#152-many-equations-many-unknowns).

## N

**Niederreiter encryption**
The parity-check form of McEliece: the message is encoded as an error vector and the ciphertext is its syndrome. Classic McEliece uses it.
See [Chapter 13, §13.3](13-Code-Based-Encryption-McEliece.md#133-mceliece-and-niederreiter).

**NIST security categories**
NIST's five post-quantum security levels, defined by comparison with key search on AES-128, AES-192 and AES-256 (categories 1, 3, 5) and collision search on SHA-256 and SHA-384 (2, 4).
See [Chapter 2, §2.3](02-Security-Levels.md#23-nists-five-categories).

**NTRU**
A lattice cryptosystem (Hoffstein, Pipher and Silverman, 1996) over polynomial rings; its lattice is the trapdoor behind Falcon.
See [Chapter 10, §10.2](10-NTRU-Falcon-and-FN-DSA.md#102-textbook-ntru).

**NTT (number-theoretic transform)**
The finite-field analogue of the fast Fourier transform. It turns polynomial multiplication in ML-KEM's and ML-DSA's rings into coefficient-wise multiplication.
See [Chapter 7, §7.5](07-Rings-Modules-and-the-NTT.md#75-the-ntt-one-layer-at-a-time).

## O

**Oil and Vinegar**
A multivariate signature design whose central map has no oil-times-oil terms, so that fixing the vinegar variables leaves a linear system. Its secret is a subspace on which the public map vanishes.
See [Chapter 15, §15.3](15-Multivariate-Signatures-and-the-On-Ramp.md#153-oil-and-vinegar).

**On-ramp**
NIST's process for additional post-quantum signatures, opened in 2022. As of November 2026, eight candidates remain in its third round.
See [Chapter 15, §15.8](15-Multivariate-Signatures-and-the-On-Ramp.md#158-the-on-ramp-round-by-round).

## P

**Plaintext-checking oracle**
Any way for an attacker to learn whether a ciphertext decrypts to a guessed message. Against an unprotected lattice KEM it recovers the key from a few ciphertexts.
See [Chapter 8, §8.8](08-ML-KEM.md#88-break-it-k-pke-alone).

## Q

**Quasi-cyclic code**
A code whose parity-check matrix is made of circulant blocks, each defined by one row. It shrinks the public keys of BIKE and HQC to a few kilobytes.
See [Chapter 14, §14.1](14-HQC-and-BIKE.md#141-the-problem).

## R

**Rainbow**
A layered multivariate signature, a NIST third-round finalist, whose level-1 key was recovered in about 53 hours on a laptop by Ward Beullens in 2022.
See [Chapter 15, §15.7](15-Multivariate-Signatures-and-the-On-Ramp.md#157-how-rainbow-and-gemss-fell).

**Reaction attack**
An attack that sends chosen ciphertexts to a static key and learns the key from which ones fail to decrypt. It forced code-based schemes to make failures negligible.
See [Chapter 14, §14.4](14-HQC-and-BIKE.md#144-why-failures-matter).

## S

**Shor's algorithm**
A quantum algorithm that factors integers and computes discrete logarithms in polynomial time, breaking RSA, Diffie-Hellman and elliptic-curve cryptography.
See [Chapter 1, §1.3](01-The-Quantum-Threat-Measured.md#13-shors-algorithm-in-one-page).

**SIKE**
Supersingular Isogeny Key Encapsulation, based on SIDH. Announced for NIST's fourth round on 5 July 2022 and broken by Castryck and Decru's classical attack, posted 30 July 2022.
See [Chapter 16, §16.4](16-Isogenies.md#164-sidh-and-sike).

**SLH-DSA**
Stateless Hash-Based Digital Signature Algorithm, FIPS 205: the standardized form of SPHINCS+, whose security rests only on hash functions.
See [Chapter 12, §12.3](12-SLH-DSA.md#123-the-structure).

**SQIsign**
An isogeny-based signature using the Deuring correspondence between supersingular curves and quaternion orders. It has the smallest signatures and keys of any post-quantum candidate; in round 3 of NIST's on-ramp.
See [Chapter 16, §16.7](16-Isogenies.md#167-sqisign-the-smallest-signatures).

**Stateful signature**
A hash-based signature, such as LMS or XMSS, whose signer must record which one-time keys have been used; reusing one can allow forgeries.
See [Chapter 11, §11.4](11-Stateful-Hash-Based-Signatures.md#114-why-stateful).

**Syndrome decoding**
Finding a low-weight error vector with a given syndrome $He$. Hard for random codes; the problem behind code-based cryptography.
See [Chapter 13, §13.2](13-Code-Based-Encryption-McEliece.md#132-codes-in-one-page).

## U

**Unbalanced Oil and Vinegar (UOV)**
Oil and Vinegar with more vinegar than oil variables (Kipnis, Patarin and Goubin, 1999), which defeats the Kipnis-Shamir attack. Signatures of about 135 bytes at level 1; a round 3 on-ramp candidate.
See [Chapter 15, §15.5](15-Multivariate-Signatures-and-the-On-Ramp.md#155-fix-it-unbalance-the-oil).

## V

**Vélu's formulas**
Explicit formulas (1971) for the isogeny with a given finite kernel and its target curve.
See [Chapter 16, §16.2](16-Isogenies.md#162-isogenies).

## W

**Winternitz one-time signature**
A hash-based one-time signature that signs digits of the message by walking hash chains; the building block of LMS, XMSS and SLH-DSA.
See [Chapter 11, §11.2](11-Stateful-Hash-Based-Signatures.md#112-winternitz-chains).

## X

**X-Wing**
A hybrid KEM of ML-KEM-768 and X25519 (2024) whose combiner hashes both shared secrets with the X25519 ciphertext and public key, specified in an IETF draft.
See [Chapter 18, §18.3](18-Hybrids-and-the-Migration.md#183-combiners-and-x-wing).

**X25519MLKEM768**
The hybrid TLS 1.3 key exchange group combining X25519 and ML-KEM-768, codepoint 0x11EC. The default in the major browsers as of November 2026.
See [Chapter 18, §18.4](18-Hybrids-and-the-Migration.md#184-tls-from-experiment-to-default).

**XMSS**
eXtended Merkle Signature Scheme (RFC 8391): a stateful hash-based signature like LMS, with bitmasks in its hashing, also approved in SP 800-208.
See [Chapter 11, §11.8](11-Stateful-Hash-Based-Signatures.md#118-xmss-and-the-differences).
