# Glossary

*Short definitions of the terms this book uses, from A to Z, each with a link to the section that teaches it. Dates and statuses are as of November 2026.*

## A

**ACVP (Automated Cryptographic Validation Protocol)**
NIST's system for testing implementations of approved algorithms against published test vectors. Its JSON vectors for ML-KEM, ML-DSA and SLH-DSA were used to check this book's code.
See [Chapter 17, §17.8](17-Implementing-Post-Quantum-Safely.md#178-failures-oracles-and-checks).

**Address**
A 32-byte value naming the exact place of a hash call in XMSS: which one-time key, which chain, which step. A fresh key and bitmask are derived from it for every call, so a forger's guess can match only one target; SLH-DSA uses addresses the same way.
See [Chapter 11, §11.8](11-Stateful-Hash-Based-Signatures.md#118-xmss-and-the-differences).

## B

**Ball-collision decoding**
An information-set decoding method (Bernstein, Lange and Peters, 2011) that improves on Stern's algorithm by letting a few errors fall into the window Stern assumes error-free.
See [Chapter 13, §13.7](13-Code-Based-Encryption-McEliece.md#bjmm-and-the-exponents).

**Beneš network**
A fixed layout of conditional swaps that applies a permutation whose control bits are the secret. Constant-time Classic McEliece code uses one to apply the secret order of the Goppa code's support, and the private key stores its control bits.
See [Chapter 13, §13.6](13-Code-Based-Encryption-McEliece.md#decoding-in-constant-time).

**BIKE**
A code-based KEM built on quasi-cyclic moderate-density parity-check (QC-MDPC) codes and decoded by bit flipping. A fourth-round candidate that NIST did not select in March 2025.
See [Chapter 14, §14.3](14-HQC-and-BIKE.md#143-bike-qc-mdpc-codes).

**Bit flipping**
The iterative decoder of BIKE and other low- and moderate-density parity-check codes: count the unsatisfied checks touching each bit, flip the bits with the most, repeat. Invented by Robert Gallager in 1962.
See [Chapter 14, §14.3](14-HQC-and-BIKE.md#143-bike-qc-mdpc-codes).

**Bitslicing**
Packing the same bit position of many independent computations into one machine word, so that every step is a fixed sequence of bit operations. McBits uses it to decode Goppa codes in constant time.
See [Chapter 13, §13.6](13-Code-Based-Encryption-McEliece.md#decoding-in-constant-time).

**BJMM**
The information-set decoding algorithm of Becker, Joux, May and Meurer (2012). It lets the two halves of the error overlap, with positions where both are 1 and cancel, which gives more representations of the error and stronger filtering in a three-level tree of merges.
See [Chapter 13, §13.7](13-Code-Based-Encryption-McEliece.md#bjmm-and-the-exponents).

**BKZ**
Block Korkine-Zolotarev reduction: lattice reduction that improves a basis block by block, using an exact shortest-vector search inside each block. Its block size $\beta$ is the main measure of an attack's cost.
See [Chapter 6, §6.5](06-Lattice-Reduction-and-the-Estimator.md#65-bkz-reduction-block-by-block).

**Black-Gray-Flip (BGF)**
The bit-flipping decoder BIKE specifies (Drucker, Gueron and Kostic, 2020). Its first iteration remembers the bits it flipped (black) and those just below the threshold (gray) and gives both a second look; an implementation always runs all five iterations, which made a constant-time BIKE affordable.
See [Chapter 14, §14.8](14-HQC-and-BIKE.md#black-gray-flip).

**Boolean shares**
Shares of a value that combine by XOR, as opposed to arithmetic shares that add modulo $q$. Masked lattice decryption converts arithmetic shares into Boolean shares to round each coefficient to a bit, and each AND on Boolean shares needs fresh randomness.
See [Chapter 17, §17.5](17-Implementing-Post-Quantum-Safely.md#masking-decryption-by-hand).

**BUFF transform**
Signing $h = H(m, pk)$ and attaching $h$ to the signature, which gives any scheme the "beyond unforgeability" properties: exclusive ownership, message binding and non-resignability. It costs one hash output per signature; ML-DSA gets the same properties by hashing its public key into every signature.
See [Chapter 3, §3.8](03-KEMs-and-Signatures.md#what-goes-wrong-without-buff).

**ByteEncode and ByteDecode**
FIPS 203's rule for turning lists of 256 numbers of $d$ bits into $32d$ bytes and back, least significant bit first. ByteDecode$_{12}$ reduces each field modulo $q$, so some byte strings are not canonical, which is why encapsulation keys need the modulus check.
See [Chapter 8, §8.4](08-ML-KEM.md#packing-coefficients-into-bytes).

## C

**C2PRI combiner**
A hybrid KEM combiner that hashes both shared secrets with only the traditional component's ciphertext and encapsulation key, leaving out the post-quantum ones. It is safe when the post-quantum KEM has ciphertext second-preimage resistance, as ML-KEM does; X-Wing has this shape.
See [Chapter 18, §18.3](18-Hybrids-and-the-Migration.md#the-general-recipe).

**Caliptra**
An open-source silicon root of trust for data-center processors, developed in the CHIPS Alliance. Its ROM checks each firmware image with an ECDSA P-384 signature together with an LMS signature or, in newer versions, ML-DSA-87.
See [Chapter 11, §11.12](11-Stateful-Hash-Based-Signatures.md#1112-standards-and-where-they-are-used).

**Checksum**
The extra digits a Winternitz signature also signs: the sum of how far each message digit is from the end of its chain. A forger who raises a message digit by hashing forward must also lower a checksum digit, which means walking a chain backward, so every real Winternitz scheme carries one.
See [Chapter 4, §4.4](04-A-Field-Guide-to-Hard-Problems.md#winternitz-fewer-secrets-longer-chains).

**Ciphertext second-preimage resistance (C2PRI)**
The property of a KEM that it is hard to find a second ciphertext that decapsulates to the same shared secret. ML-KEM has it because decapsulation re-encrypts and compares, and it lets a hybrid combiner leave the post-quantum ciphertext out of its hash.
See [Chapter 18, §18.3](18-Hybrids-and-the-Migration.md#the-general-recipe).

**Circulant matrix**
A square matrix whose rows are cyclic shifts of its first row. Multiplying by it is the same as multiplying polynomials modulo $x^r - 1$, so BIKE and HQC store and send each circulant block as one polynomial.
See [Chapter 14, §14.1](14-HQC-and-BIKE.md#circulants-by-hand).

**Clangover**
A timing leak in ML-KEM code, CVE-2024-37880, reported by Antoon Purnal in June 2024: some versions of the Clang compiler turned branch-free masking code back into a branch on the decrypted message. With a plaintext-checking oracle it recovered an ML-KEM-512 key in minutes.
See [Chapter 17, §17.4](17-Implementing-Post-Quantum-Safely.md#174-clangover-when-the-compiler-adds-a-branch).

**Class group**
In CSIDH, the commutative group formed by the isogeny steps, which acts on the supersingular curves: steps can be taken in any order without changing the end curve. That commutativity is what lets Diffie-Hellman work with curves.
See [Chapter 16, §16.8](16-Isogenies.md#168-csidh-a-group-action-in-code).

**Classic McEliece**
A KEM based on Niederreiter encryption with binary Goppa codes: no practical break since 1978 in its original form, with tiny ciphertexts and public keys of hundreds of kilobytes to over a megabyte. Not selected by NIST; standardized by ISO in 2026 (ISO/IEC 18033-2 Amd 2). After new structural attacks on Goppa codes in 2026, Germany's BSI advised in early October 2026 against using it in new systems (as of November 2026).
See [Chapter 13, §13.9](13-Code-Based-Encryption-McEliece.md#139-classic-mceliece-in-the-world) and [§13.10](13-Code-Based-Encryption-McEliece.md#1310-standards-and-the-attacks-of-2026).

**CNSA 2.0**
The NSA's Commercial National Security Algorithm Suite 2.0 (2022): ML-KEM-1024, ML-DSA-87, and LMS or XMSS for firmware, with exclusive use required between 2030 and 2033 depending on the system, and all systems by 2035.
See [Chapter 18, §18.7](18-Hybrids-and-the-Migration.md#187-deadlines).

**Composite ML-DSA**
An IETF LAMPS draft that pairs ML-DSA with RSA, ECDSA, Ed25519 or Ed448 under a single object identifier; a verifier accepts only if both signatures are valid. A label in each signed message stops the ML-DSA half from being stripped off and used alone. Waiting at the RFC Editor as of mid-2026.
See [Chapter 18, §18.6](18-Hybrids-and-the-Migration.md#composite-signatures).

**Concatenated code**
An inner code that turns a very noisy bit channel into a mildly noisy byte channel, wrapped in an outer code that corrects the bytes (Forney, 1966). HQC uses a duplicated Reed-Muller inner code and a Reed-Solomon outer code.
See [Chapter 14, §14.5](14-HQC-and-BIKE.md#145-the-concatenated-code-reed-muller-inside-reed-solomon-outside).

**Confirmation code**
A proposed one-byte value for HQC-KEM that makes an implementation skipping the re-encryption check fail ordinary known-answer tests, so the dangerous shortcut is caught in testing. One of NIST's open questions for FIPS 207 in September 2025.
See [Chapter 14, §14.7](14-HQC-and-BIKE.md#what-fips-207-may-change).

**Constant time**
Code whose instructions, memory accesses and instruction operands do not depend on secret values, so that its running time reveals nothing about them. It must be checked on the compiled code.
See [Chapter 17, §17.2](17-Implementing-Post-Quantum-Safely.md#172-constant-time-really).

**Contradictory regime**
Ducas and Pulles's name (2023) for parameters where a dual attack's analysis predicts success although so many wrong guesses lie as close to the lattice as the right one that, by the Gaussian heuristic, no score could tell them apart. The claimed dual-attack gains against Kyber sat in it.
See [Chapter 6, §6.9](06-Lattice-Reduction-and-the-Estimator.md#the-count-that-went-wrong).

**Core-SVP**
A conservative measure of a lattice attack's cost: the cost of a single shortest-vector search in the block size BKZ needs, about $2^{0.292\beta}$ classically.
See [Chapter 2, §2.5](02-Security-Levels.md#25-measuring-a-lattice-scheme-block-size-and-core-svp).

**CROSS**
A code-based signature built on a Fiat-Shamir identification protocol for restricted syndrome decoding. A round 2 candidate in NIST's on-ramp that did not advance to round 3.
See [Chapter 15, §15.10](15-Multivariate-Signatures-and-the-On-Ramp.md#1510-proofs-aes-and-isogenies-the-rest-of-the-on-ramp).

**Cryptographic bill of materials (CBOM)**
An inventory format that lists cryptographic assets (algorithms, certificates, protocols and keys) beside software components. CycloneDX 1.6 (OWASP, April 2024) supports it, recording for each algorithm its classical security in bits and its NIST quantum security category.
See [Chapter 18, §18.8](18-Hybrids-and-the-Migration.md#a-cryptographic-bill-of-materials).

**CSIDH**
An isogeny-based Diffie-Hellman scheme (2018) using a commutative class group action on supersingular curves over $\mathbb{F}_p$. Unaffected by the SIDH attacks, but slow, and its quantum security is debated.
See [Chapter 16, §16.6](16-Isogenies.md#166-fix-it-what-the-community-kept).

**Curse of re-encryption**
A side-channel attack (Ueno and others, 2022) on the re-encryption step of FO-protected KEMs: power or electromagnetic traces of hashing the decrypted message reveal whether it equals a guessed value, which is all a plaintext-checking attack needs. It worked against Kyber and most other round 3 KEMs.
See [Chapter 8, §8.12](08-ML-KEM.md#side-channels-in-decapsulation).

## D

**Decryption failure**
A correctly formed ciphertext that a probabilistic decoder fails to decrypt. Lattice and some code-based KEMs fail with tiny probability; failures that depend on the secret key can leak it.
See [Chapter 3, §3.6](03-KEMs-and-Signatures.md#36-decryption-failures-as-a-security-property).

**Deprecated and disallowed**
NIST's terms from SP 800-131A: a deprecated algorithm may still be used if the user accepts the risk, and a disallowed one may no longer be used for that purpose. NIST IR 8547 applies them to RSA, Diffie-Hellman, ECDSA, EdDSA and DSA.
See [Chapter 18, §18.7](18-Hybrids-and-the-Migration.md#what-deprecated-and-disallowed-mean).

**Distributed multi-tree key**
SP 800-208's substitute for backing up a stateful key: one hardware module makes the top tree of an HSS or XMSS^MT key and other modules make their own bottom trees, whose roots the top tree signs. Each module signs only with its own trees, and the others carry on if one fails.
See [Chapter 11, §11.11](11-Stateful-Hash-Based-Signatures.md#what-sp-800-208-demands).

**Dual isogeny**
For an isogeny $\varphi : E \to E'$ of degree $d$, the isogeny $\hat\varphi : E' \to E$ going back, with $\hat\varphi \circ \varphi = [d]$. Kani's theorem, behind the attacks on SIDH, is written with duals.
See [Chapter 16, §16.2](16-Isogenies.md#162-isogenies).

**Duplicate signature key selection**
An attack that computes a new public key under which someone else's signature also verifies. In 2015 it broke a draft of Let's Encrypt's ACME protocol; exclusive ownership in the signature scheme rules it out.
See [Chapter 3, §3.8](03-KEMs-and-Signatures.md#what-goes-wrong-without-buff).

## E

**Endomorphism ring**
The ring of all isogenies from an elliptic curve to itself. Computing it for a supersingular curve is as hard as finding an isogeny path, and a SQIsign signature proves knowledge of the public curve's endomorphism ring.
See [Chapter 16, §16.7](16-Isogenies.md#what-a-signature-proves).

**Expander graph**
A graph in which a short random walk lands almost anywhere. The supersingular isogeny graph is an excellent expander, which makes a secret walk of a few hundred steps hard to retrace.
See [Chapter 4, §4.6](04-A-Field-Guide-to-Hard-Problems.md#a-walk-on-a-toy-graph).

**External $\mu$**
A way of using ML-DSA in which the caller computes $\mu = H(tr \,\|\, M')$ next to the message and sends only its 64 bytes to the signer. The signature is an ordinary pure ML-DSA signature, so verifiers need nothing new; it suits hardware modules and cloud key services.
See [Chapter 9, §9.9](09-ML-DSA.md#99-hashml-dsa-and-pre-hashing).

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

**Forking lemma**
The classical proof technique for Fiat-Shamir signatures (Pointcheval and Stern, 1996): rewind the forger to the hash query that produced the challenge, answer differently, and extract the key from two responses. A quantum forger cannot be rewound that way, so QROM proofs need other tools.
See [Chapter 3, §3.7](03-KEMs-and-Signatures.md#fiat-shamir-in-the-qrom).

**FORS**
Forest of Random Subsets: the few-time signature at the bottom of SLH-DSA, which signs the message digest by revealing one leaf from each of $k$ small hash trees.
See [Chapter 12, §12.4](12-SLH-DSA.md#124-fors-a-forest-of-random-subsets).

**Forward secrecy**
The property that stealing a long-term key later does not expose sessions recorded earlier. One-pass KEM encryption loses it, and short-lived KEM key pairs destroyed on schedule limit the loss to a few days of traffic.
See [Chapter 18, §18.10](18-Hybrids-and-the-Migration.md#handshakes-across-the-light-delay).

**Fujisaki-Okamoto transform (FO)**
The construction that turns a passively secure public-key encryption scheme into an IND-CCA2 KEM by re-encrypting during decapsulation and rejecting any ciphertext that does not match.
See [Chapter 3, §3.5](03-KEMs-and-Signatures.md#35-the-fujisaki-okamoto-transform).

**Full cost**
Michael Wiener's measure (2004) of an attack's price: the hardware it needs times the time that hardware is tied up. It separates attacks with little state, such as key search, from memory-hungry ones such as lattice sieves.
See [Chapter 2, §2.7](02-Security-Levels.md#area-time-cost-by-hand).

## G

**Gadget**
In masking, a small algorithm that computes on shares, such as turning arithmetic shares of a coefficient into Boolean shares of a bit, without any intermediate value that depends on the secret alone. The nonlinear steps of masked ML-KEM need gadgets, and they are where the cost is.
See [Chapter 17, §17.5](17-Implementing-Post-Quantum-Safely.md#masking-decryption-by-hand).

**Grinding**
Making the signer find a counter that makes the challenge hash start with $w$ zero bits. It costs the signer about $2^w$ hashes once but a forger the same for every try, so $w$ bits of grinding replace $w$ bits of soundness in MPC-in-the-head signatures.
See [Chapter 15, §15.10](15-Multivariate-Signatures-and-the-On-Ramp.md#1510-proofs-aes-and-isogenies-the-rest-of-the-on-ramp).

**Grover's algorithm**
A quantum search algorithm that finds one marked item among $N$ in about $\sqrt{N}$ steps. It halves the effective bits of a symmetric key in theory, and much less in practice.
See [Chapter 1, §1.4](01-The-Quantum-Threat-Measured.md#14-grovers-algorithm-and-why-aes-survives).

**Gröbner basis**
A canonical generating set for a system of polynomial equations; algorithms that compute one (Buchberger, F4, F5) are the main general tool for solving MQ systems.
See [Chapter 15, §15.2](15-Multivariate-Signatures-and-the-On-Ramp.md#152-many-equations-many-unknowns).

## H

**Hamming code**
The code of 1950 that corrects one error in seven bits: its parity-check matrix has the numbers 1 to 7 in binary as columns, so the syndrome of a single error spells out its position. The smallest example of a code that is easy to decode for whoever knows its structure.
See [Chapter 4, §4.3](04-A-Field-Guide-to-Hard-Problems.md#a-structured-code-decodes-itself).

**Harvest now, decrypt later**
Recording encrypted traffic today to decrypt it once a large quantum computer exists. It makes post-quantum key exchange urgent before such a computer is built.
See [Chapter 1, §1.9](01-The-Quantum-Threat-Measured.md#19-harvest-now-decrypt-later-and-the-signature-problem).

**Hash check**
The FIPS 203 check that recomputes $H(\mathrm{ek})$ from the copy of the encapsulation key inside an ML-KEM decapsulation key and compares it with the stored hash, catching a corrupted or swapped key file.
See [Chapter 8, §8.10](08-ML-KEM.md#810-input-checks-and-key-formats).

**Hash-and-sign (GPV framework)**
Gentry, Peikert and Vaikuntanathan's signature framework (2008): a signature is a short preimage of $H(m)$ under a public function, sampled with a trapdoor so that it reveals nothing about the secret basis. Falcon is built on it, and a forgery yields a short lattice vector.
See [Chapter 10, §10.5](10-NTRU-Falcon-and-FN-DSA.md#the-gpv-framework).

**HashML-DSA**
The pre-hash variant of ML-DSA in FIPS 204: the signer signs a digest of the message together with the hash function's object identifier. Its signatures are not valid pure ML-DSA signatures, and RFC 9881 forbids it in certificates.
See [Chapter 9, §9.9](09-ML-DSA.md#99-hashml-dsa-and-pre-hashing).

**HAWK**
A lattice signature built on the lattice isomorphism problem and designed as a simpler Falcon (Ducas, Postlethwaite, Pulles and van Woerden, 2022). A round 3 candidate in NIST's on-ramp, withdrawn in July 2026 after an attack reduced key recovery to a shortest-vector problem in about half the dimension; it does not affect ML-DSA or Falcon.
See [Chapter 15, §15.10](15-Multivariate-Signatures-and-the-On-Ramp.md#1510-proofs-aes-and-isogenies-the-rest-of-the-on-ramp).

**Hedged signing**
Signing in which the per-signature randomness is derived from the key, the message and fresh random bytes, so that it is safe if either the random generator works or no faults occur. The default in FIPS 204.
See [Chapter 17, §17.7](17-Implementing-Post-Quantum-Safely.md#177-fix-it-hedged-signing).

**Hermite normal form**
A canonical triangular basis of a lattice. For the q-ary lattice of an LWE matrix it has an identity block, a block found by linear algebra modulo $q$, and $q$ on the rest of the diagonal.
See [Chapter 5, §5.4](05-Lattices-and-Their-Hard-Problems.md#by-hand-the-3-3-bases-of-an-lwe-matrix).

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

**Ideal lattice**
A lattice that is also an ideal of a ring of integers, such as $\mathbb{Z}[x]/(x^n + 1)$. Schemes whose secret was a short generator of a principal ideal fell to quantum attacks from 2014 on; the attacks do not affect Module-LWE, ML-KEM or ML-DSA.
See [Chapter 5, §5.10](05-Lattices-and-Their-Hard-Problems.md#510-break-it-when-structure-bit-back-ideal-lattices-2014-to-2021).

**Inclusion proof**
The list of sibling hashes, one per tree level, that shows an entry lies under a given Merkle tree head. In Merkle Tree Certificates it replaces most of a certificate's signatures, and its size grows only with the logarithm of the number of certificates.
See [Chapter 18, §18.9](18-Hybrids-and-the-Migration.md#189-merkle-tree-certificates).

**IND-CCA2**
Indistinguishability under adaptive chosen-ciphertext attack: the standard security goal for a KEM, in which the attacker may ask for decapsulation of any ciphertext except the challenge.
See [Chapter 3, §3.3](03-KEMs-and-Signatures.md#33-what-a-secure-kem-must-resist).

**Independence heuristic**
The assumption, in analyses of the dual attack, that the scores of different wrong guesses behave as independent random variables. Ducas and Pulles showed in 2023 that it fails in the regime the improved attacks used.
See [Chapter 6, §6.9](06-Lattice-Reduction-and-the-Estimator.md#the-count-that-went-wrong).

**Information-set decoding (ISD)**
The best known attack on decoding random linear codes: guess a set of positions free of errors and solve a linear system, repeating until the guess is right. Prange's 1962 version and its many descendants.
See [Chapter 13, §13.7](13-Code-Based-Encryption-McEliece.md#137-break-it-information-set-decoding).

**Interpolation**
Describing an isogeny by a curve and the images of a basis of torsion points, which pin it down and let a verifier rebuild it with a chain of 2-dimensional steps. Since 2024 SQIsign signatures use it, the same tool that broke SIDH.
See [Chapter 16, §16.7](16-Isogenies.md#why-the-signature-is-so-small).

**Intersection attack**
Beullens's attack (2020) that looks for a vector lying in the oil spaces of several combinations of the public maps at once. It applies to UOV and Rainbow and forced their parameters up somewhat.
See [Chapter 15, §15.7](15-Multivariate-Signatures-and-the-On-Ramp.md#beullens-2020-the-rectangular-minrank-attack) and [§15.5](15-Multivariate-Signatures-and-the-On-Ramp.md#155-fix-it-unbalance-the-oil).

**Isogeny**
A map between elliptic curves given by rational functions that respects the group law. It is determined by its kernel, and Vélu's formulas compute it.
See [Chapter 16, §16.2](16-Isogenies.md#162-isogenies).

## J

**$j$-invariant**
An element of $\mathbb{F}_{p^2}$ that names a supersingular elliptic curve up to isomorphism. Two curves are joined by a 2-isogeny exactly when their $j$-invariants are roots of the modular polynomial $\Phi_2$.
See [Chapter 4, §4.6](04-A-Field-Guide-to-Hard-Problems.md#a-walk-on-a-toy-graph).

## K

**Kannan's embedding**
Ravi Kannan's 1987 construction that turns a closest-vector problem into a shortest-vector one by adding the target to the basis with one extra coordinate. Almost every lattice attack on LWE, including the primal attack that sets ML-KEM's parameters, is a version of it.
See [Chapter 5, §5.7](05-Lattices-and-Their-Hard-Problems.md#57-kannans-embedding-lwe-as-a-unique-shortest-vector).

**Kipnis-Shamir attack**
The 1998 attack on balanced Oil and Vinegar that finds the oil space as an invariant subspace of matrices built from the public key.
See [Chapter 15, §15.4](15-Multivariate-Signatures-and-the-On-Ramp.md#154-break-it-balanced-oil-and-vinegar).

**KyberSlash**
Timing leaks from divisions by $q$ on secret values in ML-KEM implementations, reported in 2023-2024 and fixed by replacing each division with a multiplication and a shift.
See [Chapter 17, §17.3](17-Implementing-Post-Quantum-Safely.md#173-kyberslash-a-division-by-q).

## L

**Landmark**
In the Merkle Tree Certificates draft, a tree size declared a few times a day whose subtree hashes browsers receive in advance. A certificate relative to a landmark is just a log entry and an inclusion proof, with no signatures at all.
See [Chapter 18, §18.9](18-Hybrids-and-the-Migration.md#how-the-draft-works).

**Lazy sampling**
Simulating a random oracle by answering each new query with a fresh random value and writing it down. Mark Zhandry's compressed oracle (2019) is its quantum version, a table in superposition that gives QROM proofs, including those of the FO transform, much of the classical toolkit back.
See [Chapter 3, §3.7](03-KEMs-and-Signatures.md#the-compressed-oracle-in-plain-words).

**Learning with errors (LWE)**
The problem of recovering a secret vector $s$ from many noisy inner products $\langle a, s\rangle + e \bmod q$. Its ring and module versions underlie ML-KEM and ML-DSA.
See [Chapter 5, §5.6](05-Lattices-and-Their-Hard-Problems.md#56-lwe-in-its-several-forms).

**Lee-Brickell algorithm**
The 1988 refinement of Prange's information-set decoding that allows a few errors outside the guessed information set, so each elimination succeeds far more often at the price of many cheap tests.
See [Chapter 13, §13.7](13-Code-Based-Encryption-McEliece.md#lee-brickell-and-stern-let-a-few-errors-out).

**LESS**
A code-based signature built on a Fiat-Shamir identification protocol for linear code equivalence. A round 2 candidate in NIST's on-ramp that did not advance to round 3.
See [Chapter 15, §15.10](15-Multivariate-Signatures-and-the-On-Ramp.md#1510-proofs-aes-and-isogenies-the-rest-of-the-on-ramp).

**LLL**
The Lenstra-Lenstra-Lovász algorithm (1982): polynomial-time lattice reduction that finds a basis of fairly short, fairly orthogonal vectors.
See [Chapter 6, §6.2](06-Lattice-Reduction-and-the-Estimator.md#62-lll).

**LMS**
Leighton-Micali Signatures (RFC 8554): a stateful hash-based signature built from Winternitz one-time keys and a Merkle tree, approved in NIST SP 800-208.
See [Chapter 11, §11.5](11-Stateful-Hash-Based-Signatures.md#115-lms-as-specified).

**Log-unit lattice**
The lattice formed by the logarithms of the embeddings of a ring's units. Rounding to it shortens a long generator of a principal ideal to the short secret one, the second step of the attacks on Soliloquy-type schemes.
See [Chapter 5, §5.10](05-Lattices-and-Their-Hard-Problems.md#510-break-it-when-structure-bit-back-ideal-lattices-2014-to-2021).

**Lossy keys**
A proof technique for Fiat-Shamir signatures in the QROM (Kiltz, Lyubashevsky and Schaffner, 2018): replace the public key with one that has no secret behind it, indistinguishable under Module-LWE, so that forging becomes statistically hopeless. Dilithium's proof uses it.
See [Chapter 3, §3.7](03-KEMs-and-Signatures.md#fiat-shamir-in-the-qrom).

## M

**Masking**
A side-channel countermeasure that splits each secret into random shares and computes on them separately, so that no single intermediate value depends on the secret.
See [Chapter 17, §17.5](17-Implementing-Post-Quantum-Safely.md#175-power-electromagnetic-leaks-and-masking).

**Maximum likelihood decoding**
Decoding to the codeword closest to the received word, beyond half the minimum distance. HQC needs it for its Reed-Muller inner code and does it in one sweep with the fast Hadamard transform.
See [Chapter 14, §14.5](14-HQC-and-BIKE.md#the-inner-code-reed-muller-rm17).

**MAYO**
A multivariate signature (Beullens, 2021) that uses an Oil and Vinegar map with a small oil space and "whips" it over several inputs, giving public keys of about 1.5 kilobytes. A round 3 candidate in NIST's on-ramp.
See [Chapter 15, §15.6](15-Multivariate-Signatures-and-the-On-Ramp.md#156-mayo-whipping-a-small-oil-space).

**McTiny**
A protocol (Bernstein and Lange, 2020) that sends a megabyte McEliece public key to a server in small pieces without per-client server state, so even a tiny server can accept fresh keys and get forward secrecy.
See [Chapter 13, §13.9](13-Code-Based-Encryption-McEliece.md#where-it-is-deployed).

**Measure-and-reprogram**
A QROM lemma (Don, Fehr, Majenz and Schaffner, 2019): measure one random query of a forger, reprogram the oracle there with a fresh challenge, and the forger still succeeds with at least its original probability divided by about $q^2$.
See [Chapter 3, §3.7](03-KEMs-and-Signatures.md#fiat-shamir-in-the-qrom).

**Merkle Tree Certificates**
A proposed certificate structure in which a certificate authority signs the root of a Merkle tree covering a batch of certificates, removing most signatures from the TLS handshake. An IETF draft, in experiments with Chrome and Cloudflare in 2026.
See [Chapter 18, §18.9](18-Hybrids-and-the-Migration.md#189-merkle-tree-certificates).

**Message binding**
The property that a signature verifies for only one message, even under an adversarially chosen public key. EUF-CMA does not give it; it is one of the BUFF properties.
See [Chapter 3, §3.8](03-KEMs-and-Signatures.md#strong-unforgeability-by-hand).

**MinRank problem**
Given a set of matrices, find a linear combination of them whose rank is at most a given bound. The vectors of Rainbow's second oil space solve a rectangular MinRank problem built from its public key.
See [Chapter 15, §15.7](15-Multivariate-Signatures-and-the-On-Ramp.md#beullens-2020-the-rectangular-minrank-attack).

**Mirath**
An MPC-in-the-head signature based on the MinRank problem, a merger of MIRA and MiRitH. A round 2 candidate in NIST's on-ramp that did not advance to round 3.
See [Chapter 15, §15.10](15-Multivariate-Signatures-and-the-On-Ramp.md#1510-proofs-aes-and-isogenies-the-rest-of-the-on-ramp).

**ML-DSA**
Module-Lattice-Based Digital Signature Algorithm, FIPS 204: the standardized form of CRYSTALS-Dilithium.
See [Chapter 9, §9.4](09-ML-DSA.md#94-the-scheme).

**ML-KEM**
Module-Lattice-Based Key-Encapsulation Mechanism, FIPS 203: the standardized form of CRYSTALS-Kyber.
See [Chapter 8, §8.2](08-ML-KEM.md#82-the-plan-in-one-picture).

**Module-LWE**
LWE in which the secrets and samples are short vectors of polynomials over a ring such as $\mathbb{Z}_q[X]/(X^{256}+1)$. The hard problem behind ML-KEM and ML-DSA.
See [Chapter 7, §7.3](07-Rings-Modules-and-the-NTT.md#73-ring-lwe-and-module-lwe).

**Modulus check**
The FIPS 203 check that decodes and re-encodes an ML-KEM encapsulation key and requires the same bytes back, rejecting 12-bit fields of $q$ or more. Without it, one key has many byte strings and two honest implementations can disagree about a key's identity.
See [Chapter 8, §8.10](08-ML-KEM.md#810-input-checks-and-key-formats).

**Mosca's inequality**
If data must stay secret for $x$ years and migration takes $y$ years, and a quantum computer arrives in $z$ years, then $x + y > z$ means the data is already at risk.
See [Chapter 1, §1.8](01-The-Quantum-Threat-Measured.md#18-moscas-inequality-worked).

**MPC-in-the-head**
A way to build zero-knowledge proofs, and from them signatures, by simulating a multiparty computation and opening all but one party's view. Used by MQOM and SDitH.
See [Chapter 15, §15.8](15-Multivariate-Signatures-and-the-On-Ramp.md#158-the-on-ramp-round-by-round).

**MQ problem**
Solving a system of multivariate quadratic equations over a finite field. NP-hard in general and the basis of multivariate signatures.
See [Chapter 15, §15.2](15-Multivariate-Signatures-and-the-On-Ramp.md#152-many-equations-many-unknowns).

**Multi-target attack**
An attack that wins by hitting any one of many public hash outputs, such as the $2^{30}$ in a large hash-based signature key, instead of one specific output. LMS and XMSS defeat it by tagging every hash call with its position, which is why they can use 24-byte hashes.
See [Chapter 11, §11.2](11-Stateful-Hash-Based-Signatures.md#how-strong-is-one-chain).

## N

**Near-codeword**
A low-weight error pattern that satisfies almost all parity checks. Iterative decoders such as BIKE's can get stuck near one, which causes an error floor in the failure rate.
See [Chapter 14, §14.8](14-HQC-and-BIKE.md#the-failure-rate-story).

**Niederreiter encryption**
The parity-check form of McEliece: the message is encoded as an error vector and the ciphertext is its syndrome. Classic McEliece uses it.
See [Chapter 13, §13.3](13-Code-Based-Encryption-McEliece.md#133-mceliece-and-niederreiter).

**NIST security categories**
NIST's five post-quantum security levels, defined by comparison with key search on AES-128, AES-192 and AES-256 (categories 1, 3, 5) and collision search on SHA-256 and SHA-384 (2, 4).
See [Chapter 2, §2.3](02-Security-Levels.md#23-nists-five-categories).

**Non-resignability**
The property that seeing a signature on the hash of an unknown message does not let anyone else sign that same message. One of the BUFF properties; its original definition was shown unachievable in general in 2024, and refined versions followed.
See [Chapter 3, §3.8](03-KEMs-and-Signatures.md#what-goes-wrong-without-buff).

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

**One-pass key establishment**
Key establishment in which the sender encapsulates to the receiver's published KEM key and sends the ciphertext with the message, with no reply needed, as HPKE does. It suits links with long delays but gives up forward secrecy unless the keys are short-lived.
See [Chapter 18, §18.10](18-Hybrids-and-the-Migration.md#handshakes-across-the-light-delay).

## P

**PERK**
An MPC-in-the-head signature based on the permuted kernel problem. A round 2 candidate in NIST's on-ramp that did not advance to round 3.
See [Chapter 15, §15.10](15-Multivariate-Signatures-and-the-On-Ramp.md#1510-proofs-aes-and-isogenies-the-rest-of-the-on-ramp).

**Plaintext-checking oracle**
Any way for an attacker to learn whether a ciphertext decrypts to a guessed message. Against an unprotected lattice KEM it recovers the key from a few ciphertexts.
See [Chapter 8, §8.8](08-ML-KEM.md#88-break-it-k-pke-alone).

**Polar form**
For a quadratic map $P$, the map $P'(x, y) = P(x + y) - P(x) - P(y)$, which is linear in each argument. Every attack and signing algorithm for Oil and Vinegar schemes is built from it.
See [Chapter 15, §15.3](15-Multivariate-Signatures-and-the-On-Ramp.md#153-oil-and-vinegar).

**Proof of possession**
Assurance that the owner of a static public key holds the matching private key. A KEM key cannot sign, so SP 800-227 describes a challenge: encapsulate to the key, encrypt a random challenge under the result, and ask for it back.
See [Chapter 3, §3.11](03-KEMs-and-Signatures.md#static-keys-and-proof-of-possession).

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

**Rectangular MinRank attack**
Beullens's 2020 attack on Rainbow, which finds a vector of the second oil space as a solution to a MinRank problem with rectangular matrices. It applies to Rainbow only; Beullens's 53-hour key recovery followed in 2022.
See [Chapter 15, §15.7](15-Multivariate-Signatures-and-the-On-Ramp.md#beullens-2020-the-rectangular-minrank-attack).

**Reed-Solomon code**
An evaluation code (Reed and Solomon, 1960): $k$ symbols define a polynomial of degree below $k$, and its values at $n$ points form the codeword, which corrects up to $(n - k)/2$ wrong symbols. HQC uses a shortened Reed-Solomon code over $\mathbb{F}_{256}$ as its outer code.
See [Chapter 14, §14.5](14-HQC-and-BIKE.md#the-outer-code-reed-solomon-over-gf28).

**RFC 9881**
The October 2025 specification of ML-DSA in X.509 certificates: one object identifier per parameter set, and only pure ML-DSA, not HashML-DSA. It recommends storing private keys as the 32-byte seed.
See [Chapter 18, §18.6](18-Hybrids-and-the-Migration.md#post-quantum-keys-in-x509).

**RFC 9909**
The December 2025 specification of SLH-DSA in X.509: twelve object identifiers for the twelve parameter sets of FIPS 205 and twelve more for the pre-hash HashSLH-DSA.
See [Chapter 18, §18.6](18-Hybrids-and-the-Migration.md#post-quantum-keys-in-x509).

**RFC 9935**
The March 2026 specification of ML-KEM in X.509. An ML-KEM certificate can only identify an end entity that others encrypt to, such as a mail recipient, since a KEM key cannot sign.
See [Chapter 18, §18.6](18-Hybrids-and-the-Migration.md#post-quantum-keys-in-x509).

**Rosenpass**
A post-quantum key exchange (2023) that runs beside an unmodified WireGuard and feeds it a pre-shared key, using Classic McEliece for static keys and a lattice KEM for ephemeral ones.
See [Chapter 13, §13.9](13-Code-Based-Encryption-McEliece.md#where-it-is-deployed).

**RYDE**
An MPC-in-the-head signature based on rank-metric syndrome decoding. A round 2 candidate in NIST's on-ramp that did not advance to round 3.
See [Chapter 15, §15.10](15-Multivariate-Signatures-and-the-On-Ramp.md#1510-proofs-aes-and-isogenies-the-rest-of-the-on-ramp).

## S

**Shor's algorithm**
A quantum algorithm that factors integers and computes discrete logarithms in polynomial time, breaking RSA, Diffie-Hellman and elliptic-curve cryptography.
See [Chapter 1, §1.3](01-The-Quantum-Threat-Measured.md#13-shors-algorithm-in-one-page).

**SIKE**
Supersingular Isogeny Key Encapsulation, based on SIDH. Announced for NIST's fourth round on 5 July 2022 and broken by Castryck and Decru's classical attack, posted 30 July 2022.
See [Chapter 16, §16.4](16-Isogenies.md#164-sidh-and-sike).

**Simple and robust**
The two tweakable hashes of SPHINCS+. Robust XORed a bitmask derived from the seed and address into the input before hashing, with a proof needing weaker hash properties; simple hashes seed, address and input together and is faster. FIPS 205 kept only simple.
See [Chapter 12, §12.5](12-SLH-DSA.md#simple-robust-and-the-choice-of-hash).

**SLH-DSA**
Stateless Hash-Based Digital Signature Algorithm, FIPS 205: the standardized form of SPHINCS+, whose security rests only on hash functions.
See [Chapter 12, §12.3](12-SLH-DSA.md#123-the-structure).

**SQIsign**
An isogeny-based signature using the Deuring correspondence between supersingular curves and quaternion orders. It has the smallest signatures and keys of any post-quantum candidate; in round 3 of NIST's on-ramp.
See [Chapter 16, §16.7](16-Isogenies.md#167-sqisign-the-smallest-signatures).

**Stateful signature**
A hash-based signature, such as LMS or XMSS, whose signer must record which one-time keys have been used; reusing one can allow forgeries.
See [Chapter 11, §11.4](11-Stateful-Hash-Based-Signatures.md#114-why-stateful).

**Statistical distance**
The largest difference between the probabilities two distributions give to any set, and so the most any test can gain from one sample. Rejection sampling in ML-DSA brings the distance between the kept responses for different secrets to zero.
See [Chapter 9, §9.3](09-ML-DSA.md#why-the-kept-values-say-nothing-exactly).

**Stern's algorithm**
The 1989 information-set decoding method that splits the remaining columns into two halves and bets that a window of rows is error-free, so the error is found as a collision between two lists. The base of most later improvements, such as ball-collision decoding and BJMM.
See [Chapter 13, §13.7](13-Code-Based-Encryption-McEliece.md#lee-brickell-and-stern-let-a-few-errors-out).

**Strong unforgeability (SUF-CMA)**
A signature security goal stronger than EUF-CMA: the attacker also wins by producing a new signature on a message already signed. It requires each signature to have exactly one valid encoding, which is why ML-DSA rejects noncanonical hint encodings.
See [Chapter 3, §3.8](03-KEMs-and-Signatures.md#38-what-a-signature-must-provide) and [Chapter 9, §9.10](09-ML-DSA.md#the-proof-in-outline).

**Syndrome decoding**
Finding a low-weight error vector with a given syndrome $He$. Hard for random codes; the problem behind code-based cryptography.
See [Chapter 13, §13.2](13-Code-Based-Encryption-McEliece.md#132-codes-in-one-page).

**Syzygy distinguisher**
Hugues Randriambololona's 2024 distinguisher for Goppa codes, the first whose cost grows only subexponentially in the number of errors and which applies to the codes Classic McEliece uses. Far too slow to matter at real sizes, it showed that Goppa codes' quadratic relations carry more information than had been thought.
See [Chapter 13, §13.10](13-Code-Based-Encryption-McEliece.md#the-summer-of-2026).

## U

**Unbalanced Oil and Vinegar (UOV)**
Oil and Vinegar with more vinegar than oil variables (Kipnis, Patarin and Goubin, 1999), which defeats the Kipnis-Shamir attack. Signatures of about 135 bytes at level 1; a round 3 on-ramp candidate.
See [Chapter 15, §15.5](15-Multivariate-Signatures-and-the-On-Ramp.md#155-fix-it-unbalance-the-oil).

**Unique shortest vector problem (uSVP)**
Finding the shortest vector of a lattice when it is shorter than all others by a gap $\gamma = \lambda_2/\lambda_1$; it gets easier as the gap grows. Kannan's embedding turns LWE into a uSVP instance.
See [Chapter 5, §5.7](05-Lattices-and-Their-Hard-Problems.md#57-kannans-embedding-lwe-as-a-unique-shortest-vector).

**Universal combiner**
A hybrid KEM combiner that hashes both shared secrets, both ciphertexts, both encapsulation keys and a label. It is safe whatever the component KEMs are, at the cost of hashing a few kilobytes.
See [Chapter 18, §18.3](18-Hybrids-and-the-Migration.md#the-general-recipe).

## V

**Verify before release**
A defense against fault attacks on signing: check each signature with the public key before releasing it, which catches faults that produce a wrong signature for the cost of one verification.
See [Chapter 17, §17.6](17-Implementing-Post-Quantum-Safely.md#other-faults-on-lattice-schemes).

**Vélu's formulas**
Explicit formulas (1971) for the isogeny with a given finite kernel and its target curve.
See [Chapter 16, §16.2](16-Isogenies.md#162-isogenies).

## W

**Wedge attack**
An attack on Oil and Vinegar schemes over fields of characteristic 2 (Lars Ran, EUROCRYPT 2026, first posted in 2025) that studies the oil space in the exterior algebra.
See [Chapter 15, §15.5](15-Multivariate-Signatures-and-the-On-Ramp.md#155-fix-it-unbalance-the-oil).

**Winternitz one-time signature**
A hash-based one-time signature that signs digits of the message by walking hash chains; the building block of LMS, XMSS and SLH-DSA.
See [Chapter 11, §11.2](11-Stateful-Hash-Based-Signatures.md#112-winternitz-chains).

## X

**X-BIND-P-Q**
The notation for a KEM binding property: whenever two decapsulations agree on P (key, ciphertext or public key), they also agree on Q. The prefix X is HON, LEAK or MAL, from honestly generated secret keys to keys built by the adversary; ML-KEM stored as a seed reaches MAL-BIND-K-CT.
See [Chapter 3, §3.12](03-KEMs-and-Signatures.md#the-definitions).

**X-Wing**
A hybrid KEM of ML-KEM-768 and X25519 (2024) whose combiner hashes both shared secrets with the X25519 ciphertext and public key, specified in an IETF draft.
See [Chapter 18, §18.3](18-Hybrids-and-the-Migration.md#183-combiners-and-x-wing).

**X25519MLKEM768**
The hybrid TLS 1.3 key exchange group combining X25519 and ML-KEM-768, codepoint 0x11EC. The default in the major browsers as of November 2026.
See [Chapter 18, §18.4](18-Hybrids-and-the-Migration.md#184-tls-from-experiment-to-default).

**XL**
Extended linearization: a method for solving polynomial systems that multiplies the equations by monomials until there are enough to linearize, like Gröbner basis algorithms. The degree it needs, and so its cost, falls as the ratio of equations to unknowns grows.
See [Chapter 15, §15.2](15-Multivariate-Signatures-and-the-On-Ramp.md#the-shape-of-a-system-decides-its-cost).

**XMSS**
eXtended Merkle Signature Scheme (RFC 8391): a stateful hash-based signature like LMS, with bitmasks in its hashing, also approved in SP 800-208.
See [Chapter 11, §11.8](11-Stateful-Hash-Based-Signatures.md#118-xmss-and-the-differences).
