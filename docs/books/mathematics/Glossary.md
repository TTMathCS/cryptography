# Glossary

*Short definitions of the terms this book puts in bold, from A to Z, each with a link to the chapter and section that teaches it.*

## A

**Abelian group**
A group whose operation is commutative.
See [Chapter 7](07-Groups.md#72-the-axioms).

**Active S-box**
An S-box with a nonzero input difference (or mask) in a trail.
See [Chapter 9](09-Linear-Algebra.md#branch-number).

**Addition chain**
A sequence starting at 1 in which each number is a sum of two earlier ones; short chains give fast exponentiation.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#411-going-deeper).

**Adjugate**
The matrix of cofactors whose product with the original matrix is the determinant times the identity.
See [Chapter 9](09-Linear-Algebra.md#95-the-hill-cipher).

**Advantage**
How much better than guessing an adversary wins a security game, from 0 to 1.
See [Chapter 16](16-Probability.md#169-negligible-functions-games-and-advantage).

**Affine cipher**
The classical cipher x ↦ ax + b mod 26, which needs a to be a unit.
See [Chapter 3](03-Modular-Arithmetic.md#multiplication-by-a-unit-is-a-permutation).

**Affine function**
A Boolean function of degree at most 1, a linear function possibly plus 1.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#102-boolean-functions-and-their-algebraic-normal-form).

**Algebraic group model**
A model of computation (Fuchsbauer, Kiltz and Loss, 2018) in which the adversary sees how group elements are represented but must explain every element it outputs as a combination of those it was given.
See [Chapter 7](07-Groups.md#713-going-deeper).

**Algebraic immunity**
The least degree of a nonzero function that annihilates f or f + 1; low values allow algebraic attacks.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#1010-in-the-real-world-and-going-deeper).

**Algebraic normal form**
A Boolean function written as a XOR of products of variables; its degree is the algebraic degree.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#102-boolean-functions-and-their-algebraic-normal-form).

**Algebraic reduction**
A reduction that builds every group element it outputs from those it was given; for these, the loss in Schnorr's proof is essentially optimal.
See [Chapter 19](19-Complexity-and-Reductions.md#what-the-square-root-costs).

**Almost perfect nonlinear**
An S-box with differential uniformity 2, the best possible.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#108-apn-functions-and-open-problems).

**Ancilla**
An extra qubit onto which a parity of data qubits is computed and then measured, so the check reveals the error without measuring the data.
See [Chapter 20](20-Quantum-Algorithms.md#the-three-qubit-bit-flip-code).

**Anomalous curve**
A curve with exactly p points over F_p, whose discrete logs fall to the Smart attack in linear time.
See [Chapter 13](13-Counting-Points-and-Pairings.md#1310-break-it-anomalous-curves-and-smarts-attack).

**Artin's conjecture**
The open conjecture that 2 (or any non-square other than −1) is a primitive root modulo infinitely many primes.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#411-going-deeper).

**Autocorrelation**
C_f(u) = Σ (−1)^(f(x) ⊕ f(x ⊕ u)), which is 0 exactly when the derivative of f in direction u is balanced.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#bent-means-every-derivative-is-balanced).

**Automorphism**
An isomorphism of a structure with itself.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#88-the-frobenius-map-and-subfields).

**Average-case hardness**
Hardness on random instances, which cryptography needs, as opposed to worst-case hardness.
See [Chapter 19](19-Complexity-and-Reductions.md#194-why-np-hard-is-not-what-cryptography-needs).

## B

**Baby-step giant-step**
A √q-time discrete-log algorithm that matches a table of baby steps g^j against giant steps h·g^(−im).
See [Chapter 7](07-Groups.md#baby-step-giant-step).

**Baillie-PSW test**
Miller-Rabin to base 2 plus a strong Lucas test; no composite is known that passes it.
See [Chapter 6](06-Primality-Testing.md#baillie-psw).

**Balanced**
A Boolean function with as many 0 outputs as 1 outputs.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#104-nonlinearity-and-bent-functions).

**Barycentric weights**
The numbers w_i = 1/∏_{j≠i}(x_i − x_j), computed once so that the interpolating polynomial can be evaluated at a point in linear time.
See [Chapter 11](11-Polynomials-at-Work.md#barycentric-form-and-the-basis-on-roots-of-unity).

**Base-rate fallacy**
Ignoring how rare an event is, so that a test with few false alarms still gives mostly false alarms.
See [Chapter 16](16-Probability.md#163-conditional-probability-independence-and-bayes).

**Basis**
A set of independent vectors whose integer combinations give the lattice; a good basis is short and nearly orthogonal.
See [Chapter 14](14-Lattices.md#142-lattices-and-bases).

**Bayes' rule**
Pr[A | B] = Pr[B | A] Pr[A] / Pr[B].
See [Chapter 16](16-Probability.md#163-conditional-probability-independence-and-bayes).

**BDD**
Bounded-distance decoding: CVP when the target is promised to be unusually close to the lattice.
See [Chapter 14](14-Lattices.md#146-the-shortest-and-closest-vector-problems).

**Bell state**
(|00⟩ + |11⟩)/√2, the simplest entangled state.
See [Chapter 20](20-Quantum-Algorithms.md#by-hand-interference-and-entanglement).

**Bent function**
A Boolean function on an even number of bits with the largest possible nonlinearity; never balanced.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#104-nonlinearity-and-bent-functions).

**Berlekamp-Welch algorithm**
Decodes Reed-Solomon codes by solving linear equations for an error locator polynomial.
See [Chapter 18](18-Error-Correcting-Codes.md#186-reed-solomon-codes-decoding-errors).

**Big APN problem**
The open question whether an APN permutation exists in an even number of bits n ≥ 8 (none exists for 4 bits; one is known for 6).
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#108-apn-functions-and-open-problems).

**Bijective**
Both injective and surjective: a perfect pairing of two sets, which is exactly when an inverse function exists.
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**BIKE**
A code-based key encapsulation using quasi-cyclic moderate-density parity-check codes.
See [Chapter 18](18-Error-Correcting-Codes.md#1810-quasi-cyclic-codes-hqc-and-bike).

**Bilinear**
A pairing is bilinear when e(aP, bQ) = e(P, Q)^ab.
See [Chapter 13](13-Counting-Points-and-Pairings.md#137-pairings).

**Binary gcd**
A gcd algorithm using only subtraction and halving, convenient in hardware and constant-time code.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#211-going-deeper).

**Binary Golay code**
The perfect [23, 12, 7] binary code.
See [Chapter 18](18-Error-Correcting-Codes.md#185-bounds-and-a-perfect-code).

**Bit**
The unit of information, short for binary digit: the entropy of one fair coin flip; Shannon's 1948 paper introduced the word, crediting John Tukey.
See [Chapter 17](17-Information-and-Entropy.md#where-the-formula-comes-from).

**Bit security**
log2 of the time-to-advantage ratio an attack achieves.
See [Chapter 19](19-Complexity-and-Reductions.md#tightness-and-concrete-security).

**Bits of security**
A scheme has k bits of security when the best known attack costs about 2^k operations.
See [Chapter 1](01-Mathematics-for-Secrets.md#bits-of-security).

**BKZ**
Block Korkine-Zolotarev reduction, which solves SVP in blocks of size β; larger β gives shorter vectors at exponential cost.
See [Chapter 14](14-Lattices.md#1410-bkz-enumeration-and-sieving-in-outline).

**Blichfeldt's lemma**
A set of volume larger than the determinant contains two points whose difference is in the lattice; it proves Minkowski's theorem.
See [Chapter 14](14-Lattices.md#145-minkowskis-theorem-and-successive-minima).

**Block cipher**
A keyed family of permutations of fixed-length blocks, such as AES on 128-bit blocks.
See [Chapter 1](01-Mathematics-for-Secrets.md#permutations).

**Block Lanczos**
Montgomery's version (1995) of Lanczos's method for sparse systems over F_2, working on blocks of vectors to avoid the breakdowns of the scalar method.
See [Chapter 9](09-Linear-Algebra.md#block-wiedemann-and-block-lanczos).

**Block Wiedemann**
Coppersmith's version (1994) of Wiedemann's method that handles 64 vectors at once with 64-bit words and a matrix Berlekamp-Massey; its first stage splits into independent pieces.
See [Chapter 9](09-Linear-Algebra.md#block-wiedemann-and-block-lanczos).

**BLS12-381**
The BLS12 curve over a 381-bit prime used by Ethereum and Zcash, designed for close to 128 bits of security after the exTNFS attacks.
See [Chapter 13](13-Counting-Points-and-Pairings.md#139-pairing-friendly-curves).

**BLS12 curves**
Barreto-Lynn-Scott pairing-friendly curves with embedding degree 12.
See [Chapter 13](13-Counting-Points-and-Pairings.md#139-pairing-friendly-curves).

**Blum-Blum-Shub**
A provably secure but slow pseudorandom generator: square repeatedly modulo N and output low bits.
See [Chapter 5](05-Square-Roots-Mod-p.md#511-in-the-real-world).

**BN curves**
Barreto-Naehrig pairing-friendly curves with embedding degree 12.
See [Chapter 13](13-Counting-Points-and-Pairings.md#139-pairing-friendly-curves).

**Boolean function**
A function from n bits to one bit.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#102-boolean-functions-and-their-algebraic-normal-form).

**Bounded-distance decoding**
Finding the lattice point nearest a target that is promised to be close, which is what LWE is in lattice language.
See [Chapter 15](15-Learning-with-Errors.md#156-lwe-and-regevs-encryption).

**Branch number**
The least number of nonzero input plus output bytes of a linear layer over all nonzero inputs.
See [Chapter 9](09-Linear-Algebra.md#branch-number).

**Butterfly**
The basic step of the FFT and NTT, turning a pair (a, b) into (a + ωb, a − ωb).
See [Chapter 11](11-Polynomials-at-Work.md#the-trick).

**Bézout's identity**
gcd(a, b) can be written as ax + by for some integers x, y, which the extended Euclidean algorithm finds.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-theorem).

## C

**Carmichael number**
A composite n that passes the Fermat test for every base coprime to it, such as 561.
See [Chapter 6](06-Primality-Testing.md#64-carmichael-numbers).

**Carmichael's function**
λ(n), the least exponent with a^λ(n) ≡ 1 for every unit a modulo n.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#46-carmichaels-function).

**Carry-less multiplication**
Multiplication of binary polynomials packed in words: like integer multiplication with XOR in place of addition, so there are no carries.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#schoolbook-on-64-bit-words).

**Cauchy's theorem**
If a prime r divides the order of a finite group, the group has an element of order r (1845).
See [Chapter 7](07-Groups.md#sylows-theorems).

**Centered binomial distribution**
The difference of two sums of η random bits; ML-KEM's cheap error distribution.
See [Chapter 15](15-Learning-with-Errors.md#155-small-noise-binomial-and-gaussian).

**Chain**
In Hellman's time-memory trade-off, a sequence from a random start alternating the function f and a reduction function R, of which only the two ends are stored.
See [Chapter 19](19-Complexity-and-Reductions.md#trading-memory-for-time-hellmans-tables).

**Chain rule for entropy**
H(X, Y) = H(Y) + H(X | Y).
See [Chapter 17](17-Information-and-Entropy.md#173-joint-conditional-and-mutual-information).

**Characteristic**
The least n with 1 + 1 + … + 1 (n times) = 0, or 0 if none; a finite field's characteristic is a prime.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#characteristic).

**Character-set meter**
A password meter that reports length times log2 of the alphabet size, ignoring how people actually choose passwords.
See [Chapter 17](17-Information-and-Entropy.md#why-bits-meters-mislead).

**Chebyshev's inequality**
Pr[|X − μ| ≥ a] ≤ Var(X)/a².
See [Chapter 16](16-Probability.md#168-concentration-bounds).

**Chernoff-Hoeffding bound**
The probability that an average of n independent bounded samples is off by δ falls like exp(−2nδ²).
See [Chapter 16](16-Probability.md#168-concentration-bounds).

**Chinese remainder theorem**
For coprime moduli, a system of congruences has exactly one solution modulo their product; Z/mnZ is Z/mZ × Z/nZ.
See [Chapter 3](03-Modular-Arithmetic.md#the-theorem).

**Chord-and-tangent rule**
Three points of the curve on a line add up to O; it defines the elliptic-curve group law.
See [Chapter 12](12-Elliptic-Curve-Group.md#123-the-chord-and-tangent-law).

**Cipolla's algorithm**
A square-root algorithm modulo p that works in the field F_(p²).
See [Chapter 5](05-Square-Roots-Mod-p.md#512-going-deeper).

**Circulant matrix**
A matrix in which each row is the previous one rotated by one place.
See [Chapter 18](18-Error-Correcting-Codes.md#1810-quasi-cyclic-codes-hqc-and-bike).

**Clamping**
Fixing some bits of an X25519 or Ed25519 secret scalar so it is a multiple of the cofactor and has a fixed top bit.
See [Chapter 7](07-Groups.md#711-break-it-cofactors).

**Class group**
The group that measures how far a ring is from having unique factorization.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#211-going-deeper).

**Classic McEliece**
The code-based key encapsulation from McEliece's 1978 binary Goppa scheme; public keys of about 0.26 to 1.4 MB.
See [Chapter 18](18-Error-Correcting-Codes.md#188-mceliece-and-niederreiter).

**Code**
A set of words of fixed length n; with minimum distance d it corrects ⌊(d − 1)/2⌋ errors.
See [Chapter 18](18-Error-Correcting-Codes.md#182-distance-and-decoding).

**Codeword**
An element of a code; the messages a channel is allowed to carry.
See [Chapter 18](18-Error-Correcting-Codes.md#181-the-problem).

**Codomain**
The set a function's outputs are declared to lie in; the outputs actually reached form the image, or range.
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Cofactor**
The ratio h between a curve's (or group's) size and the prime order q of the subgroup used.
See [Chapter 7](07-Groups.md#711-break-it-cofactors).

**Cofactored verification**
Checking the EdDSA equation multiplied by the cofactor, 8SB = 8R + 8kA; it agrees with the plain check on honest signatures but not on crafted ones with small-order parts.
See [Chapter 12](12-Elliptic-Curve-Group.md#eddsa).

**Collision entropy**
H_2 = −log2 Σ p(x)², the Rényi entropy of order 2; 2^(−H_2) is the chance that two independent draws are equal.
See [Chapter 17](17-Information-and-Entropy.md#the-renyi-family).

**Combining generator**
A keystream generator that feeds several LFSRs into a Boolean function.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#105-correlation-immunity-and-the-combining-generator).

**Commutative ring**
A set with addition and multiplication obeying the usual laws, multiplication commutative; Z/nZ is one.
See [Chapter 3](03-Modular-Arithmetic.md#the-ring-mathbbznmathbbz).

**Companion matrix**
The matrix of an LFSR's step; its characteristic polynomial is the feedback polynomial.
See [Chapter 9](09-Linear-Algebra.md#as-a-matrix).

**Complete addition law**
An addition formula that works for every pair of points, doubling included, with no special cases.
See [Chapter 12](12-Elliptic-Curve-Group.md#128-twisted-edwards-curves-and-complete-formulas).

**Complex multiplication method**
Building a curve with a chosen number of points from a small discriminant.
See [Chapter 13](13-Counting-Points-and-Pairings.md#134-counting-points-quickly).

**Component function**
A XOR of some output bits of an S-box, itself a Boolean function.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#106-s-boxes-the-difference-and-linear-tables).

**Composite**
An integer greater than 1 that is not prime.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#primes-properly).

**Composition**
Doing one function after another; the composition of bijections is a bijection.
See [Chapter 1](01-Mathematics-for-Secrets.md#composition-and-inverses).

**Compression**
In ML-KEM, rounding ciphertext coefficients to fewer bits, which shrinks the ciphertext and adds one more error.
See [Chapter 15](15-Learning-with-Errors.md#1511-a-toy-ml-kem-compression-included).

**Computational Diffie-Hellman**
Given g^a and g^b, compute g^ab.
See [Chapter 7](07-Groups.md#77-the-discrete-logarithm-and-diffie-hellman-problems).

**Concrete security**
Security stated with actual numbers of operations and success probabilities, instead of only asymptotically.
See [Chapter 1](01-Mathematics-for-Secrets.md#110-going-deeper).

**Conditional entropy**
H(X | Y), the uncertainty left in X once Y is known.
See [Chapter 17](17-Information-and-Entropy.md#173-joint-conditional-and-mutual-information).

**Conditional probability**
Pr[A | B] = Pr[A and B] / Pr[B], the probability of A once B is known.
See [Chapter 16](16-Probability.md#163-conditional-probability-independence-and-bayes).

**Congruent**
a ≡ b (mod n) when n divides a − b.
See [Chapter 3](03-Modular-Arithmetic.md#the-definition).

**Conjugates**
The images u, u^p, …, u^(p^(n−1)) of an element u of GF(p^n) under the Galois group; their product is the norm and their sum the trace.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#the-galois-group-and-the-general-norm).

**Conjugate subgroups**
Subgroups P and P′ with P′ = gPg⁻¹ for some g in the group; any two Sylow r-subgroups are conjugate.
See [Chapter 7](07-Groups.md#sylows-theorems).

**Connection polynomial**
The polynomial C(x) = 1 + c1x + … + cLx^L of an LFSR, which predicts s_n = c1s_{n−1} + … + cLs_{n−L}; Berlekamp-Massey updates it step by step.
See [Chapter 9](09-Linear-Algebra.md#a-trace-by-hand).

**Constant-time**
Code whose running time and memory access pattern do not depend on secret data.
See [Chapter 3](03-Modular-Arithmetic.md#montgomery-multiplication).

**Continued fraction**
Writing a number as a0 + 1/(a1 + 1/(a2 + …)); its truncations, the convergents, are the best rational approximations.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#28-continued-fractions).

**Controlled-NOT**
The two-qubit gate that flips the target qubit when the control is 1.
See [Chapter 20](20-Quantum-Algorithms.md#202-qubits-registers-and-gates).

**Convergents**
The fractions obtained by cutting a continued fraction short; used in Wiener's attack and in Shor's algorithm.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#convergents).

**Convolution**
The distribution of a sum of independent random variables: Pr[X + Y = z] = Σ_x Pr[X = x] · Pr[Y = z − x].
See [Chapter 15](15-Learning-with-Errors.md#the-noise-of-one-coefficient).

**Cook reduction**
A reduction that solves A by calling an algorithm for B, possibly many times and with randomness; security proofs use this kind.
See [Chapter 19](19-Complexity-and-Reductions.md#what-a-reduction-between-problems-is).

**Cooley-Tukey butterfly**
The forward NTT butterfly (a, b) → (a + ζb, a − ζb).
See [Chapter 15](15-Learning-with-Errors.md#154-the-negacyclic-ntt).

**Coppersmith's method**
Finding small roots of polynomials modulo N with lattice reduction.
See [Chapter 14](14-Lattices.md#in-the-real-world).

**Coprime**
Two integers whose greatest common divisor is 1; also called relatively prime.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#23-the-greatest-common-divisor).

**Core-SVP**
The convention that costs a lattice attack as one SVP call in the BKZ block size, about 2^(0.292β) classically.
See [Chapter 14](14-Lattices.md#1410-bkz-enumeration-and-sieving-in-outline).

**Correlation**
For Boolean functions, the fraction of agreements minus the fraction of disagreements.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#103-the-walsh-hadamard-transform).

**Correlation attack**
Recovering one LFSR of a combining generator at a time through the correlation between its output and the keystream.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#105-correlation-immunity-and-the-combining-generator).

**Correlation immunity**
A Boolean function is correlation-immune of order m when its output is independent of any m inputs; balanced too, it is m-resilient.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#105-correlation-immunity-and-the-combining-generator).

**Coset**
A shifted copy aH of a subgroup H; the cosets split the group into equal pieces.
See [Chapter 7](07-Groups.md#cosets).

**Cube**
For a set S of variables, the 2^|S| points where the bits in S take all values and the others are 0; each ANF coefficient is the XOR of f over one cube.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#coefficients-are-cube-sums).

**Cube attack**
Dinur and Shamir's attack (2009): XOR the output over cubes of chosen IV bits and read off one low-degree, often linear, equation in the key per cube.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#break-it-a-cube-attack-on-a-toy-cipher).

**Curve25519**
Bernstein's 2006 Montgomery curve y² = x³ + 486662x² + x over the prime 2^255 − 19.
See [Chapter 12](12-Elliptic-Curve-Group.md#x25519).

**CVP**
The closest vector problem: find the lattice vector nearest a given target.
See [Chapter 14](14-Lattices.md#146-the-shortest-and-closest-vector-problems).

**Cycle**
In a walk x_{i+1} = f(x_i) on a finite set, the loop of λ values the walk circles forever after its tail; Pollard's rho finds a collision on it.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#pollards-rho-a-walk-that-must-repeat).

**Cyclic group**
A group generated by a single element.
See [Chapter 7](07-Groups.md#73-orders-and-cyclic-groups).

**Cyclotomic coset**
A set {i, 2i, 4i, …} mod r of exponents that squaring permutes among themselves; each irreducible factor of x^r − 1 over GF(2) collects one.
See [Chapter 18](18-Error-Correcting-Codes.md#quasi-cyclic-codes-as-polynomials-modulo-xr-1).

**Cyclotomic polynomial**
Φ_m(x), the polynomial whose roots are the primitive m-th roots of unity; Φ_(2n)(x) = x^n + 1 for n a power of 2.
See [Chapter 15](15-Learning-with-Errors.md#153-cyclotomic-polynomials).

## D

**Decaf**
Hamburg's construction (2015) of a prime-order group from a curve with a cofactor, as a quotient by the small subgroup, with exactly one encoding per element.
See [Chapter 12](12-Elliptic-Curve-Group.md#1213-going-deeper).

**Decisional Diffie-Hellman**
The problem of telling g^ab from a random element given g^a and g^b.
See [Chapter 5](05-Square-Roots-Mod-p.md#511-in-the-real-world).

**Decision-LWE**
The problem of telling LWE samples from uniformly random pairs.
See [Chapter 15](15-Learning-with-Errors.md#156-lwe-and-regevs-encryption).

**Decision problem**
A problem with a yes-or-no answer.
See [Chapter 19](19-Complexity-and-Reductions.md#193-p-np-and-np-completeness).

**Degree**
The highest power of x with a nonzero coefficient in a polynomial.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#83-polynomials-division-and-euclid).

**Delay differential equation**
A differential equation whose rate of change at a point depends on the function's value at an earlier point; Dickman's function satisfies uρ′(u) = −ρ(u − 1).
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#smooth-numbers-and-dickmans-function).

**Density**
n divided by the bit length of the largest number in a subset-sum instance; low-density instances fall to lattices.
See [Chapter 14](14-Lattices.md#1411-break-it-the-knapsack).

**Determinant**
A number attached to a square matrix, nonzero exactly when the matrix is invertible; also the volume of the box its rows span.
See [Chapter 9](09-Linear-Algebra.md#94-inverses-and-determinants).

**Deterministic encryption**
Encryption in which the same message always gives the same ciphertext, which leaks equality.
See [Chapter 5](05-Square-Roots-Mod-p.md#510-goldwasser-micali-encryption).

**Deterministic random bit generator**
An algorithm that expands a seed into a long stream of pseudorandom bits, specified in NIST SP 800-90A.
See [Chapter 17](17-Information-and-Entropy.md#178-how-systems-gather-and-estimate-entropy).

**Difference distribution table**
For each input difference, how many inputs give each output difference through an S-box.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-difference-distribution-table).

**Differential addition**
Computing x(P + Q) from x(P), x(Q) and x(P − Q), with no y-coordinates; the step of the Montgomery ladder.
See [Chapter 12](12-Elliptic-Curve-Group.md#where-the-x-only-formulas-come-from).

**Differential uniformity**
The largest entry of the difference distribution table, apart from the trivial one; AES's S-box has 4.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-difference-distribution-table).

**Diffusion**
A cipher's spreading of each input bit's influence over many output bits.
See [Chapter 9](09-Linear-Algebra.md#98-mds-matrices-and-aes-mixcolumns).

**Digital signature**
A scheme in which only the holder of a secret key can sign and anyone can verify.
See [Chapter 19](19-Complexity-and-Reductions.md#195-one-way-functions).

**Dihedral group**
The symmetries of a regular polygon; its hidden subgroup problem, linked to lattice problems, has no known efficient quantum algorithm.
See [Chapter 20](20-Quantum-Algorithms.md#206-discrete-logarithms-and-the-hidden-subgroup-problem).

**Dirichlet's theorem**
Every progression a, a + n, a + 2n, … with gcd(a, n) = 1 contains infinitely many primes.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#gaps-and-patterns).

**Discrepancy**
In Berlekamp-Massey, the bit d = s_n + c1s_{n−1} + … + cLs_{n−L}, which is 1 exactly when the current register mispredicts the next bit.
See [Chapter 9](09-Linear-Algebra.md#a-trace-by-hand).

**Discrete Gaussian**
The distribution on integers with probability proportional to exp(−πx²/s²).
See [Chapter 15](15-Learning-with-Errors.md#155-small-noise-binomial-and-gaussian).

**Discrete logarithm**
The exponent x with g^x = h.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#48-discrete-logarithms).

**Discrete logarithm problem**
Given g and h = g^x in a group, find x. Hard in well-chosen groups, which is the basis of Diffie-Hellman.
See [Chapter 1](01-Mathematics-for-Secrets.md#by-hand-a-one-way-street).

**Distinguisher**
An algorithm that tries to tell which of two distributions its input came from.
See [Chapter 16](16-Probability.md#166-statistical-distance-and-modulo-bias).

**Distortion map**
A map that moves a point into an independent subgroup, so that a pairing of a point with itself is nontrivial.
See [Chapter 13](13-Counting-Points-and-Pairings.md#the-distortion-map).

**Divided differences**
The table of differences that builds Newton's form of the interpolating polynomial one point at a time.
See [Chapter 11](11-Polynomials-at-Work.md#newtons-form).

**Divides**
a divides b when b = ak for some integer k; then a is a divisor (or factor) of b and b is a multiple of a.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#divisibility).

**Division polynomial**
The polynomial whose roots are the x-coordinates of the points of order ℓ, used by Schoof's algorithm.
See [Chapter 13](13-Counting-Points-and-Pairings.md#134-counting-points-quickly).

**Divstep**
The single step of Bernstein and Yang's safegcd (2019), acting on a counter δ, an odd f and any g; a fixed number of divsteps gives gcds and inverses without data-dependent branches.
See [Chapter 3](03-Modular-Arithmetic.md#inverses-in-practice-fermat-euclid-and-safegcd).

**Domain**
The set a function takes its inputs from.
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Double-and-add**
Scalar multiplication by reading k bit by bit, doubling for each bit and adding for each 1.
See [Chapter 12](12-Elliptic-Curve-Group.md#125-scalar-multiplication-and-the-structure-of-the-group).

**Dragonblood**
Vanhoef and Ronen's attacks (2019) that recovered WPA3 passwords through timing and cache side channels in SAE's try-and-increment loop.
See [Chapter 12](12-Elliptic-Curve-Group.md#try-and-increment-and-why-it-leaks).

**Dual basis**
The basis d_1, …, d_n of the dual lattice with ⟨b_i, d_j⟩ = 1 if i = j and 0 otherwise, the rows of (B⁻¹)ᵀ.
See [Chapter 14](14-Lattices.md#the-dual-lattice).

**Dual code**
The codewords orthogonal to every codeword of a code; its generator matrix is the parity-check matrix.
See [Chapter 18](18-Error-Correcting-Codes.md#184-linear-codes).

**Dual lattice**
The set L* of vectors in the span of L whose inner product with every vector of L is an integer; det L* = 1/det L.
See [Chapter 14](14-Lattices.md#the-dual-lattice).

## E

**ECPP**
Elliptic-curve primality proving, which gives fast-to-check certificates for numbers with thousands of digits.
See [Chapter 6](06-Primality-Testing.md#elliptic-curve-primality-proving).

**Ed25519**
The EdDSA signature scheme on the twisted Edwards form of Curve25519.
See [Chapter 12](12-Elliptic-Curve-Group.md#128-twisted-edwards-curves-and-complete-formulas).

**Eisenstein's criterion**
An integer polynomial is irreducible over the rationals if some prime divides every coefficient except the leading one and its square does not divide the constant term.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#gausss-lemma-and-eisensteins-criterion).

**ElGamal**
Public-key encryption in a group ⟨g⟩ of prime order q: with public key h = g^x, a message m is sent as (g^k, m · h^k) with fresh random k; it is a group homomorphism.
See [Chapter 7](07-Groups.md#encryption-that-is-a-homomorphism).

**Elliptic curve**
The points (x, y) with y² = x³ + ax + b (no repeated roots), plus a point at infinity, with a group law.
See [Chapter 12](12-Elliptic-Curve-Group.md#122-curves-and-the-point-at-infinity).

**Elliptic-curve discrete logarithm problem**
Given P and kP, find k; on a good 256-bit curve the best attack takes about 2^128 steps.
See [Chapter 12](12-Elliptic-Curve-Group.md#125-scalar-multiplication-and-the-structure-of-the-group).

**Embedding degree**
The least k with r dividing p^k − 1; a pairing maps the curve's discrete logs into F_(p^k).
See [Chapter 13](13-Counting-Points-and-Pairings.md#136-the-embedding-degree-and-the-mov-attack).

**Entangled**
A state of several qubits that is not a tensor product of single-qubit states.
See [Chapter 20](20-Quantum-Algorithms.md#by-hand-interference-and-entanglement).

**Entropy loss**
The min-entropy an extractor gives up for its guarantee, 2 log2(1/ε) bits for error ε, unavoidable for any seeded extractor.
See [Chapter 17](17-Information-and-Entropy.md#why-the-lemma-holds).

**Entropy source**
The physical noise that a random number generator measures, assessed in NIST SP 800-90B.
See [Chapter 17](17-Information-and-Entropy.md#178-how-systems-gather-and-estimate-entropy).

**Enumeration**
Exact search for short or close lattice vectors by walking a tree of the lattice points in a ball, coordinate by coordinate, on a reduced basis (Fincke-Pohst, Kannan).
See [Chapter 14](14-Lattices.md#enumeration-kannan-fincke-and-pohst).

**Equivalence relation**
A relation that is reflexive, symmetric and transitive; it splits a set into classes.
See [Chapter 3](03-Modular-Arithmetic.md#an-equivalence-relation).

**Erasure**
A lost symbol whose position is known; Reed-Solomon codes recover from up to n − k of them.
See [Chapter 11](11-Polynomials-at-Work.md#115-reed-solomon-codes).

**Error locator**
A polynomial whose roots mark the error positions.
See [Chapter 18](18-Error-Correcting-Codes.md#186-reed-solomon-codes-decoding-errors).

**Euclidean domain**
A ring with a division with remainder, such as the integers or polynomials over a field, where Euclid's algorithm works.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#211-going-deeper).

**Euclid's lemma**
If a prime divides a product ab, it divides a or b.
See [Chapter 1](01-Mathematics-for-Secrets.md#proof-3-a-proof-that-something-is-impossible).

**Euler's criterion**
a^((p−1)/2) is 1 for quadratic residues and −1 for non-residues modulo an odd prime p.
See [Chapter 5](05-Square-Roots-Mod-p.md#53-eulers-criterion).

**Euler's theorem**
For a coprime to n, a^φ(n) ≡ 1 (mod n); the reason RSA decrypts.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#44-eulers-theorem-and-why-rsa-works).

**Euler's totient function**
φ(n), the number of residues modulo n coprime to n; the size of the group of units.
See [Chapter 3](03-Modular-Arithmetic.md#35-eulers-function).

**Even-Mansour cipher**
The simplest block cipher with a security proof: a fixed public permutation P and two keys, E(x) = P(x ⊕ k1) ⊕ k2.
See [Chapter 20](20-Quantum-Algorithms.md#even-mansour).

**Event**
A set of outcomes.
See [Chapter 16](16-Probability.md#162-events-and-probabilities).

**Exceptional procedure**
A special case of an incomplete addition formula, such as a division by zero; an attacker who triggers one can learn key bits (Izu and Takagi, 2003).
See [Chapter 12](12-Elliptic-Curve-Group.md#why-completeness-matters-for-side-channels).

**expand_message_xmd**
RFC 9380's expander, a hash such as SHA-256 run in a chain under a domain separation tag, which stretches a message for hash_to_field.
See [Chapter 12](12-Elliptic-Curve-Group.md#code-it-hash_to_curve-following-rfc-9380).

**Expectation**
The weighted average of a random variable's values; it adds up over sums even without independence.
See [Chapter 16](16-Probability.md#164-random-variables-and-expectation).

**Exponential time**
Running time that grows like 2 to a constant times the input size; hopeless at cryptographic sizes.
See [Chapter 1](01-Mathematics-for-Secrets.md#big-o-notation).

**Exponent of a group**
The least e with a^e = 1 for every element of the group.
See [Chapter 7](07-Groups.md#76-the-structure-of-finite-abelian-groups).

**Extended tower number field sieve**
The 2016 discrete-log algorithm for F_(p^k) that cut the security of BN254 to about 100 bits.
See [Chapter 13](13-Counting-Points-and-Pairings.md#why-bn254-lost-bits-in-2016).

## F

**Factor base**
The small primes over which sieved numbers must factor; in the quadratic sieve, 2 and the primes p ≤ B modulo which n is a square.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-quadratic-sieve-in-miniature).

**Factor theorem**
a is a root of f exactly when x − a divides f.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#euclids-algorithm).

**False alarm**
A test's error of rejecting a source that is fine (a type I error), such as calling a fair source biased.
See [Chapter 16](16-Probability.md#how-many-samples-an-attack-needs).

**Fast algebraic attack**
Courtois's refinement (2003) of algebraic attacks: the high-degree parts of consecutive equations follow a linear recurrence, found by Berlekamp-Massey, and combining equations along it cancels them.
See [Chapter 9](09-Linear-Algebra.md#filter-generators).

**Fast Fourier transform**
Evaluating a polynomial of degree below n at the n-th roots of unity in about n log n steps.
See [Chapter 11](11-Polynomials-at-Work.md#116-the-fast-fourier-transform).

**Fast Walsh-Hadamard transform**
Computes the whole Walsh spectrum in n2^n steps with butterflies.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-fast-transform).

**Fermat pseudoprime**
A composite n that passes the Fermat test to base a; a is then a Fermat liar.
See [Chapter 6](06-Primality-Testing.md#63-the-fermat-test).

**Fermat's little theorem**
For p prime and a not divisible by p, a^(p−1) ≡ 1 (mod p).
See [Chapter 4](04-Powers-and-Primitive-Roots.md#by-hand_1).

**Fermat test**
Check a^(n−1) ≡ 1 (mod n); a failure is a Fermat witness that n is composite, a pass makes n a probable prime.
See [Chapter 6](06-Primality-Testing.md#63-the-fermat-test).

**Fibonacci numbers**
1, 1, 2, 3, 5, 8, …, each the sum of the two before; consecutive pairs are the worst case for Euclid's algorithm.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-worst-case-fibonacci-numbers).

**Field**
A commutative ring in which every nonzero element has an inverse; Z/pZ for p prime is the field F_p.
See [Chapter 3](03-Modular-Arithmetic.md#when-n-is-prime).

**Fill-in**
The growth in nonzero entries as Gaussian elimination adds sparse rows together, which soon makes a sparse matrix dense.
See [Chapter 9](09-Linear-Algebra.md#why-not-elimination).

**Final exponentiation**
The last step of a pairing, raising Miller's output to (p^k − 1)/r.
See [Chapter 13](13-Counting-Points-and-Pairings.md#millers-algorithm-in-one-paragraph).

**First minimum**
λ1, the length of a shortest nonzero lattice vector; the i-th successive minimum generalizes it.
See [Chapter 14](14-Lattices.md#145-minkowskis-theorem-and-successive-minima).

**Fisher-Yates shuffle**
The standard way to pick a uniformly random permutation: swap each position with a uniformly random earlier-or-equal position.
See [Chapter 1](01-Mathematics-for-Secrets.md#code-it).

**Fixed point**
An input x with S(x) = x; the AES S-box's affine constant 0x63 was chosen so that it has none.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-full-tables-of-the-aes-s-box).

**Fixed window**
Exponentiation that writes the exponent in base 2^w and does w squarings and one table multiplication per digit, reading the whole table each time so nothing depends on the secret digits.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#fix-it-a-fixed-window-that-reads-the-whole-table).

**Fold**
One step of reduction modulo m = x^n + r: split c = h · x^n + l and replace it by h · r + l, which is cheap when r has few terms.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#reduction-by-folding).

**Fork**
To rerun a forger with the same random tape and the same hash answers up to query J, and fresh answers from J on, hoping for a second forgery with the same R.
See [Chapter 19](19-Complexity-and-Reductions.md#what-the-reduction-must-do).

**Free action**
A group action in which every stabilizer is trivial: only the identity fixes any point.
See [Chapter 7](07-Groups.md#diffie-hellman-as-an-action).

**Free variable**
A variable without a pivot; each one doubles (over F_2) the number of solutions.
See [Chapter 9](09-Linear-Algebra.md#93-rank-kernel-and-the-shape-of-the-solutions).

**FRI**
The Fast Reed-Solomon Interactive Oracle Proof of Proximity (Ben-Sasson, Bentov, Horesh and Riabzev, 2018): a test, by repeated folding, that committed values are close to a polynomial of low degree.
See [Chapter 11](11-Polynomials-at-Work.md#fri-testing-low-degree-by-folding).

**Frobenius map**
x ↦ x^p in a field of characteristic p; an automorphism that fixes exactly the base field.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#88-the-frobenius-map-and-subfields).

**FrodoKEM**
A key encapsulation built on plain LWE with no ring structure, larger but conservative.
See [Chapter 15](15-Learning-with-Errors.md#1510-in-the-real-world).

**Fujisaki-Okamoto transform**
A transform that makes a KEM secure against chosen ciphertexts: decapsulation decrypts, encrypts the result again with the derived coins, and rejects any ciphertext that does not match.
See [Chapter 15](15-Learning-with-Errors.md#the-toy).

**Full cost**
Wiener's measure (2004) of an attack: the hardware it occupies multiplied by the time it occupies it.
See [Chapter 19](19-Complexity-and-Reductions.md#memory-is-not-free).

**Function**
A rule that sends each element of one set (the domain) to exactly one element of another (the codomain).
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Fundamental parallelepiped**
The box spanned by a basis; its volume is the determinant of the lattice.
See [Chapter 14](14-Lattices.md#143-the-fundamental-domain-and-the-determinant).

**Fundamental theorem of arithmetic**
Every integer greater than 1 is a product of primes in exactly one way, up to order.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-fundamental-theorem).

## G

**Galois group**
The automorphisms of a field that fix a subfield; for GF(p^n) over F_p it is cyclic of order n, generated by the Frobenius map.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#the-galois-group-and-the-general-norm).

**Garner's algorithm**
An efficient way to rebuild a number from its residues, used in CRT-RSA.
See [Chapter 3](03-Modular-Arithmetic.md#garners-algorithm).

**Gaussian elimination**
Solving linear equations by row operations on the augmented matrix until it reaches reduced row echelon form.
See [Chapter 9](09-Linear-Algebra.md#gaussian-elimination).

**Gaussian heuristic**
The prediction that a random lattice's shortest vector has length about √(n/(2πe)) (det L)^(1/n).
See [Chapter 14](14-Lattices.md#145-minkowskis-theorem-and-successive-minima).

**Gauss's lemma**
(a/p) is −1 to the number of the residues a, 2a, …, ((p−1)/2)a that land in the upper half.
See [Chapter 5](05-Square-Roots-Mod-p.md#gausss-lemma).

**Geffe generator**
A three-LFSR combining generator whose output agrees with two of its inputs 75% of the time.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#105-correlation-immunity-and-the-combining-generator).

**General forking lemma**
Bellare and Neven's purely probabilistic lemma (2006) bounding how often forking gives two successes at the same index, the core of Schnorr security proofs.
See [Chapter 19](19-Complexity-and-Reductions.md#the-forking-lemma-with-its-proof).

**Generalized Mersenne prime**
A prime such as 2^256 − 2^224 + … chosen so that reduction is a few additions; NIST P-256 uses one.
See [Chapter 3](03-Modular-Arithmetic.md#310-in-the-real-world).

**General linear group**
GL_n, the group of invertible n × n matrices.
See [Chapter 7](07-Groups.md#examples).

**Generator**
An element whose powers give every element of a cyclic group.
See [Chapter 1](01-Mathematics-for-Secrets.md#by-hand-a-one-way-street).

**Generator matrix**
A matrix whose rows span a linear code; encoding is mG.
See [Chapter 18](18-Error-Correcting-Codes.md#184-linear-codes).

**Generic algorithm**
An algorithm that uses a group only through its operation and equality tests, with no knowledge of how elements are written.
See [Chapter 7](07-Groups.md#78-the-generic-group-model-and-shoups-bound).

**Gentleman-Sande butterfly**
The inverse NTT butterfly (a, b) → (a + b, (a − b)ζ).
See [Chapter 15](15-Learning-with-Errors.md#154-the-negacyclic-ntt).

**GHASH**
The polynomial hash in GF(2^128) inside AES-GCM; repeating a nonce lets an attacker recover its key H.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#89-mathrmgf2128-the-field-inside-gcm).

**Gilbert-Varshamov bound**
A guarantee that good codes exist; random linear codes meet it, which is why decoding them is hard.
See [Chapter 18](18-Error-Correcting-Codes.md#185-bounds-and-a-perfect-code).

**Gilbert-Varshamov weight**
The weight w_GV at which C(n, w) = 2^(n−k); below it a random syndrome has at most one error of that weight, above it exponentially many.
See [Chapter 18](18-Error-Correcting-Codes.md#why-a-random-code-meets-the-gilbert-varshamov-bound).

**Gold functions**
The power maps x^(2^k + 1), which are APN when gcd(k, n) = 1.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#108-apn-functions-and-open-problems).

**Goldreich-Levin theorem**
The inner product ⟨x, r⟩ is a hard-core predicate for any one-way function f(x) with r public.
See [Chapter 19](19-Complexity-and-Reductions.md#196-hard-core-bits).

**Goppa polynomial**
The polynomial g that defines a binary Goppa code; with degree t the code corrects t errors.
See [Chapter 18](18-Error-Correcting-Codes.md#187-binary-goppa-codes).

**Greatest common divisor**
The largest positive integer dividing both of two numbers, computed by Euclid's algorithm.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#23-the-greatest-common-divisor).

**Group**
A set with an associative operation, an identity, and inverses; defined fully in Chapter 7.
See [Chapter 3](03-Modular-Arithmetic.md#the-group-of-units).

**Group action**
A rule giving a point g · x of a set X for each group element g and x in X, with the identity fixing every point and (gh) · x = g · (h · x).
See [Chapter 7](07-Groups.md#712-group-actions).

**Guessing entropy**
The expected number of guesses needed when guessing values in order of likelihood.
See [Chapter 17](17-Information-and-Entropy.md#176-min-entropy-and-guessing).

**Guess number**
A password's position in the guessing order of a realistic attacker, the honest measure of one password's strength.
See [Chapter 17](17-Information-and-Entropy.md#why-bits-meters-mislead).

## H

**Hadamard gate**
H sends |0⟩ to (|0⟩ + |1⟩)/√2 and |1⟩ to (|0⟩ − |1⟩)/√2.
See [Chapter 20](20-Quantum-Algorithms.md#202-qubits-registers-and-gates).

**Hadamard ratio**
A measure, between 0 and 1, of how orthogonal a basis is.
See [Chapter 14](14-Lattices.md#144-gram-schmidt-orthogonalization).

**Hadamard's inequality**
The determinant is at most the product of the basis vector lengths, with equality for an orthogonal basis.
See [Chapter 14](14-Lattices.md#144-gram-schmidt-orthogonalization).

**Half-gcd**
A divide-and-conquer gcd algorithm that runs in quasi-linear time.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#211-going-deeper).

**Hamming bound**
The sphere-packing limit on how many codewords fit at a given distance; codes that meet it are perfect.
See [Chapter 18](18-Error-Correcting-Codes.md#185-bounds-and-a-perfect-code).

**Hamming distance**
The number of positions in which two words differ.
See [Chapter 18](18-Error-Correcting-Codes.md#182-distance-and-decoding).

**Hard-core predicate**
A bit of x that is hard to guess from f(x) even though f(x) determines x.
See [Chapter 19](19-Complexity-and-Reductions.md#196-hard-core-bits).

**Hartley entropy**
H_0, the logarithm of the number of possible values, the Rényi entropy of order 0; it is all a key length says.
See [Chapter 17](17-Information-and-Entropy.md#the-renyi-family).

**hash_to_curve**
RFC 9380's hash to a curve point: hash to two field elements, map both, add the points and clear the cofactor.
See [Chapter 12](12-Elliptic-Curve-Group.md#code-it-hash_to_curve-following-rfc-9380).

**Hash-to-element**
WPA3's way of computing SAE's password element with the simplified SWU map instead of a try-and-increment loop.
See [Chapter 12](12-Elliptic-Curve-Group.md#code-it-hash_to_curve-following-rfc-9380).

**hash_to_field**
RFC 9380's layer that stretches a message with expand_message_xmd and reduces chunks with 128 extra bits modulo p, avoiding modulo bias.
See [Chapter 12](12-Elliptic-Curve-Group.md#code-it-hash_to_curve-following-rfc-9380).

**Hensel lifting**
Lifting a solution modulo p to one modulo p², p³, ….
See [Chapter 3](03-Modular-Arithmetic.md#311-going-deeper).

**Hermite constant**
γ_n, the best constant with λ1² ≤ γ_n (det L)^(2/n) for every n-dimensional lattice.
See [Chapter 14](14-Lattices.md#145-minkowskis-theorem-and-successive-minima).

**Hidden subgroup problem**
Finding a subgroup H from a function that is constant on its cosets; Shor solves it for abelian groups.
See [Chapter 20](20-Quantum-Algorithms.md#206-discrete-logarithms-and-the-hidden-subgroup-problem).

**Hilbert numbers**
The numbers 1, 5, 9, 13, … (1 mod 4), a world where factorization into "primes" is not unique.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#a-world-where-it-fails).

**HILL entropy**
Computational entropy (Håstad, Impagliazzo, Levin and Luby, 1999): X has HILL entropy at least k if no efficient test can tell it from some distribution with min-entropy at least k.
See [Chapter 17](17-Information-and-Entropy.md#going-deeper).

**HKDF**
Krawczyk's HMAC-based key derivation function (RFC 5869): Extract condenses the input keying material into a pseudorandom key, and Expand stretches it into as many keys as needed.
See [Chapter 17](17-Information-and-Entropy.md#hkdf-extract-then-expand).

**Homomorphic**
An encryption scheme is homomorphic when operations on ciphertexts give the encryption of operations on the plaintexts.
See [Chapter 5](05-Square-Roots-Mod-p.md#510-goldwasser-micali-encryption).

**Homomorphism**
A map between groups that respects the operation, f(ab) = f(a) f(b).
See [Chapter 7](07-Groups.md#75-homomorphisms-and-isomorphisms).

**HQC**
Hamming Quasi-Cyclic, the code-based key encapsulation NIST selected in March 2025.
See [Chapter 18](18-Error-Correcting-Codes.md#1810-quasi-cyclic-codes-hqc-and-bike).

**Hypothesis test**
A decision between a null hypothesis, such as "the source still has its claimed min-entropy", and its failure, run with a chosen false alarm probability α.
See [Chapter 17](17-Information-and-Entropy.md#179-health-tests-watching-a-source-in-the-field).

## I

**Ideal**
A subset of a ring closed under addition and under multiplication by any ring element, such as nZ; quotienting by it gives a ring.
See [Chapter 3](03-Modular-Arithmetic.md#311-going-deeper).

**Image**
The set of outputs a function actually reaches; also called its range.
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Impagliazzo's five worlds**
Russell Impagliazzo's 1995 map of five possible worlds, from Algorithmica (P = NP) to Cryptomania (public-key cryptography exists).
See [Chapter 19](19-Complexity-and-Reductions.md#195-one-way-functions).

**Implicit rejection**
Answering an invalid ciphertext with a key derived from a secret z and the ciphertext instead of an error, as ML-KEM does.
See [Chapter 15](15-Learning-with-Errors.md#the-toy).

**Independent events**
Events with Pr[A and B] = Pr[A] Pr[B].
See [Chapter 16](16-Probability.md#163-conditional-probability-independence-and-bayes).

**Index**
The number of cosets of a subgroup, |G| / |H|.
See [Chapter 7](07-Groups.md#lagranges-theorem).

**Indifferentiability**
Maurer, Renner and Holenstein's notion (2004) of when a hash built from a smaller ideal part can stand in for a random oracle; the sponge qualifies, plain Merkle-Damgård does not.
See [Chapter 19](19-Complexity-and-Reductions.md#why-practice-still-uses-it).

**Induction**
Proving a statement for every natural number by proving a base case and an inductive step from n to n + 1.
See [Chapter 1](01-Mathematics-for-Secrets.md#proof-1-a-proof-by-induction).

**Information-set decoding**
The best generic attack on syndrome decoding: guess k error-free positions and solve linear equations.
See [Chapter 18](18-Error-Correcting-Codes.md#189-syndrome-decoding-and-information-set-decoding).

**Information-theoretic security**
Security that holds against unlimited computing power, as in Shamir sharing and the one-time pad.
See [Chapter 11](11-Polynomials-at-Work.md#fewer-than-k-shares-reveal-nothing).

**Injective**
A function that never sends two different inputs to the same output (one-to-one).
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Invalid-curve attack**
Sending a point not on the agreed curve to make the victim compute in a weak group.
See [Chapter 5](05-Square-Roots-Mod-p.md#511-in-the-real-world).

**Invariant factors**
The numbers d1 | d2 | … | dk with a finite abelian group isomorphic to Z/d1 × … × Z/dk.
See [Chapter 7](07-Groups.md#76-the-structure-of-finite-abelian-groups).

**Inverse function**
The function that undoes a bijection, sending each output back to its one input.
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Irreducible polynomial**
A polynomial that is not a product of two of smaller degree; the polynomial analogue of a prime.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#84-irreducible-polynomials).

**Isogeny**
A rational map between elliptic curves that preserves the group law; RFC 9380 uses one to reach curves with A = 0 such as secp256k1.
See [Chapter 12](12-Elliptic-Curve-Group.md#code-it-hash_to_curve-following-rfc-9380).

**Isomorphism**
A bijective homomorphism; isomorphic groups have the same structure.
See [Chapter 7](07-Groups.md#75-homomorphisms-and-isomorphisms).

**Iterative method**
A linear-algebra method, such as Wiedemann's or Lanczos's, that only multiplies the fixed matrix by vectors, so each step costs the number of nonzero entries.
See [Chapter 9](09-Linear-Algebra.md#why-not-elimination).

## J

**Jacobian coordinates**
Writing a point as (X : Y : Z) with x = X/Z², y = Y/Z³, so additions need no field inversions.
See [Chapter 12](12-Elliptic-Curve-Group.md#126-projective-and-jacobian-coordinates).

**Jacobi symbol**
The extension of the Legendre symbol to odd composite moduli, computable fast without factoring.
See [Chapter 5](05-Square-Roots-Mod-p.md#56-the-jacobi-symbol).

**Joint entropy**
H(X, Y), the entropy of a pair of random variables.
See [Chapter 17](17-Information-and-Entropy.md#173-joint-conditional-and-mutual-information).

## K

**Karp reduction**
A polynomial-time many-one reduction: an efficient map from instances of A to instances of B that sends yes to yes and no to no.
See [Chapter 19](19-Complexity-and-Reductions.md#what-a-reduction-between-problems-is).

**Kernel**
The elements a homomorphism sends to the identity.
See [Chapter 7](07-Groups.md#75-homomorphisms-and-isomorphisms).

**Kloosterman sum**
An exponential sum such as Σ (−1)^Tr(x⁻¹ + λx) over GF(2^n); its values give the Walsh spectrum, and so the nonlinearity, of the inversion S-box.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-nonlinearity-kloosterman-sums).

**Korselt's criterion**
n is a Carmichael number exactly when it is squarefree, composite, and p − 1 divides n − 1 for every prime p dividing n.
See [Chapter 6](06-Primality-Testing.md#korselts-criterion).

**Krawtchouk polynomials**
The sums Σ_i (−1)^i C(w, i) C(n − w, j − i) in the MacWilliams identity, which turn a code's weight distribution into its dual's.
See [Chapter 18](18-Error-Correcting-Codes.md#weight-distribution-and-the-macwilliams-identity).

**KZG commitment**
The Kate-Zaverucha-Goldberg polynomial commitment: one group element, opened with a pairing check.
See [Chapter 11](11-Polynomials-at-Work.md#polynomial-commitments).

## L

**Lagrange's theorem**
In a finite group, the order of every element divides the group's size; proved in Chapter 7.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#the-basic-facts).

**Lamé's theorem**
Euclid's algorithm takes at most about five times as many steps as the smaller number has decimal digits.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-worst-case-fibonacci-numbers).

**Latin square**
A square table in which every row and every column contains each symbol exactly once; a perfectly secret cipher with one key per (message, ciphertext) pair has this shape.
See [Chapter 17](17-Information-and-Entropy.md#shannons-characterization).

**Lattice**
All integer combinations of some independent vectors, its basis.
See [Chapter 14](14-Lattices.md#142-lattices-and-bases).

**Learning with errors**
Recovering s from many pairs (a, ⟨a, s⟩ + e mod q) with small random errors e; Regev's 2005 problem behind ML-KEM and ML-DSA.
See [Chapter 15](15-Learning-with-Errors.md#151-the-problem).

**Learning with rounding**
A variant of LWE (Banerjee, Peikert and Rosen, 2012) that replaces random errors by deterministic rounding, b = ⌈(p/q)⟨a, s⟩⌋ mod p with p < q.
See [Chapter 15](15-Learning-with-Errors.md#1514-learning-with-rounding).

**Leftover hash lemma**
A random universal hash of a source with enough min-entropy gives nearly uniform output; Chapter 17 states it fully.
See [Chapter 15](15-Learning-with-Errors.md#regevs-encryption).

**Legendre's theorem on approximations**
If |x − p/q| < 1/(2q²), then p/q is a convergent of x.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#best-approximations).

**Legendre symbol**
(a/p): 1 if a is a nonzero square mod p, −1 if not, 0 if p divides a.
See [Chapter 5](05-Square-Roots-Mod-p.md#54-the-legendre-symbol).

**Liar**
A base that makes a primality test wrongly report a composite as prime.
See [Chapter 6](06-Primality-Testing.md#61-the-problem).

**Linear approximation table**
For each pair of input and output masks, how well the masks' XORs agree through an S-box.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-linear-approximation-table).

**Linear code**
A code that is a subspace, so the sum of two codewords is a codeword.
See [Chapter 18](18-Error-Correcting-Codes.md#184-linear-codes).

**Linear complexity**
The length of the shortest LFSR that produces a sequence, found by the Berlekamp-Massey algorithm.
See [Chapter 9](09-Linear-Algebra.md#97-berlekamp-massey-linear-means-predictable).

**Linear cryptanalysis**
An attack using linear relations between plaintext, ciphertext and key bits that hold with probability away from 1/2.
See [Chapter 9](09-Linear-Algebra.md#99-break-it-linear-ciphers).

**Linear feedback shift register**
A register shifted each step with a new bit that is a XOR of chosen bits, the taps.
See [Chapter 9](09-Linear-Algebra.md#96-linear-feedback-shift-registers).

**Linearity**
The largest absolute Walsh value over all component functions of an S-box.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-linear-approximation-table).

**Linearization**
Replacing each monomial of a system of polynomial equations by a new variable and solving the linear system.
See [Chapter 9](09-Linear-Algebra.md#99-break-it-linear-ciphers).

**Linear map**
A map that respects addition and scaling, f(x + y) = f(x) + f(y) and f(cx) = c f(x).
See [Chapter 9](09-Linear-Algebra.md#91-the-problem).

**List decoding**
Decoding past half the minimum distance by returning a short list of all codewords within a larger radius, from which a checksum or signature picks the right one.
See [Chapter 18](18-Error-Correcting-Codes.md#1813-list-decoding-and-the-johnson-bound).

**List-decoding capacity**
The limit 1 − R on the fraction of errors any code of rate R can list-decode; folded Reed-Solomon codes reach it.
See [Chapter 18](18-Error-Correcting-Codes.md#sudan-and-guruswami-sudan).

**LLL-reduced**
A basis that is size-reduced and meets the Lovász condition; its first vector is within 2^((n−1)/2) of the shortest.
See [Chapter 14](14-Lattices.md#148-the-lll-algorithm).

**L-notation**
L_N[α, c] = exp((c + o(1)) (ln N)^α (ln ln N)^(1−α)), the scale between polynomial (α = 0) and exponential (α = 1).
See [Chapter 19](19-Complexity-and-Reductions.md#192-running-time).

**Logical qubit**
An error-corrected qubit encoded in many physical qubits.
See [Chapter 20](20-Quantum-Algorithms.md#208-resource-estimates).

**Logjam**
The 2015 attack on TLS that downgraded connections to 512-bit export Diffie-Hellman and broke them with precomputation.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#break-it-logjam).

**Lovász condition**
The LLL test that each Gram-Schmidt length does not drop too fast from one vector to the next.
See [Chapter 14](14-Lattices.md#148-the-lll-algorithm).

**Lucas-Lehmer test**
The fast test for Mersenne numbers 2^p − 1 that finds the record primes.
See [Chapter 6](06-Primality-Testing.md#610-mersenne-primes-and-record-primes).

**Lucas sequence**
Sequences defined by a second-order recurrence, used in the Lucas half of the Baillie-PSW test.
See [Chapter 6](06-Primality-Testing.md#baillie-psw).

## M

**Maiorana-McFarland construction**
A family of bent functions f(x, y) = x · π(y) ⊕ g(y) on the two halves of the input, with π a permutation and g any function.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#where-the-896-come-from).

**Malleability**
The property that anyone can turn a ciphertext into one of a related message without the key, as with textbook RSA and ElGamal; signatures are malleable when a valid one can be altered into another, as ECDSA's (r, s) into (r, n − s).
See [Chapter 7](07-Groups.md#encryption-that-is-a-homomorphism).

**map_to_curve**
RFC 9380's step that maps one field element to a curve point; for the NIST curves it is the simplified SWU map.
See [Chapter 12](12-Elliptic-Curve-Group.md#code-it-hash_to_curve-following-rfc-9380).

**Marginal guesswork**
The number of guesses w_α needed to find a fraction α of many secrets; Pliam (2000) showed that it, guesswork and entropy do not bound one another.
See [Chapter 17](17-Information-and-Entropy.md#guesswork-is-not-entropy).

**Markov's inequality**
For a nonnegative variable, Pr[X ≥ a] ≤ E[X]/a.
See [Chapter 16](16-Probability.md#168-concentration-bounds).

**Mask**
A word of all ones or all zeros made from a condition bit (−1 or −0 in two's complement), used to select between values with bit operations instead of a branch.
See [Chapter 3](03-Modular-Arithmetic.md#fix-it-the-conditional-subtraction-in-constant-time).

**Masking**
A side-channel countermeasure that splits each secret bit into d + 1 random shares whose XOR is the secret, so that any d of them reveal nothing.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#masking-the-algebra-of-shares).

**Massey's theorem**
2L output bits of an LFSR of length L determine it, and Berlekamp-Massey finds it.
See [Chapter 9](09-Linear-Algebra.md#97-berlekamp-massey-linear-means-predictable).

**Matrix**
A rectangular table of numbers representing a linear map.
See [Chapter 9](09-Linear-Algebra.md#92-vectors-matrices-and-elimination).

**MDS matrix**
A maximum distance separable matrix, with the largest possible branch number; AES's MixColumns has branch number 5.
See [Chapter 9](09-Linear-Algebra.md#mds-matrices).

**Miller-Rabin test**
The standard primality test: writes n − 1 = 2^s d and checks the sequence a^d, a^(2d), …; at most a quarter of bases lie.
See [Chapter 6](06-Primality-Testing.md#the-test).

**Min-entropy**
−log2 of the most likely outcome's probability; the right measure for how hard a secret is to guess in one try.
See [Chapter 17](17-Information-and-Entropy.md#176-min-entropy-and-guessing).

**Minimum distance**
The least number of positions in which two different codewords differ.
See [Chapter 11](11-Polynomials-at-Work.md#115-reed-solomon-codes).

**Minkowski's second theorem**
A bound on the product λ1λ2⋯λn of all successive minima of a lattice: between (2^n/n!) · det L/V_n(1) and 2^n det L/V_n(1), with V_n(1) the volume of the unit ball.
See [Chapter 14](14-Lattices.md#the-ball-version-and-a-real-case).

**Miss**
A test's error of passing a source that is faulty, such as calling a biased source fair.
See [Chapter 16](16-Probability.md#how-many-samples-an-attack-needs).

**Mixed addition**
Adding a point in projective coordinates to one with Z = 1, which saves multiplications.
See [Chapter 12](12-Elliptic-Curve-Group.md#126-projective-and-jacobian-coordinates).

**Mixed-radix representation**
Writing a number with digits whose place values are products of different moduli (1, m1, m1m2, …) instead of powers of one base; Garner's algorithm produces it.
See [Chapter 3](03-Modular-Arithmetic.md#garners-numbers-are-digits).

**Modified pairing**
ê(P, Q) = e(P, φ(Q)) with a distortion map φ, a symmetric pairing on supersingular curves.
See [Chapter 13](13-Counting-Points-and-Pairings.md#the-distortion-map).

**Module-LWE**
LWE with small vectors of ring elements; the problem behind ML-KEM and ML-DSA.
See [Chapter 15](15-Learning-with-Errors.md#158-ring-lwe-and-module-lwe).

**Modulo bias**
The unevenness of r mod n when r is uniform on a range that is not a multiple of n; fixed by rejection sampling or by reducing a much longer value.
See [Chapter 16](16-Probability.md#the-fix-rejection-sampling).

**Modulus**
The number n in arithmetic modulo n.
See [Chapter 3](03-Modular-Arithmetic.md#the-definition).

**Monic**
A polynomial whose leading coefficient is 1.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#83-polynomials-division-and-euclid).

**Monier-Rabin bound**
For odd composite n > 9, at most a quarter of bases are strong liars.
See [Chapter 6](06-Primality-Testing.md#how-often-can-it-be-fooled).

**Montgomery form**
Storing a modulo N as aR mod N, so that multiplication needs only REDC, a reduction by shifts instead of division.
See [Chapter 3](03-Modular-Arithmetic.md#montgomery-multiplication).

**Montgomery ladder**
An exponentiation (or scalar multiplication) that does the same operations for every bit, which helps against timing attacks.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#three-ways-to-do-it).

**m-sequence**
The output of an LFSR with a primitive feedback polynomial: period 2^n − 1, the longest possible.
See [Chapter 9](09-Linear-Algebra.md#as-a-matrix).

**Multiplicative complexity**
The least number of AND gates in a circuit for a function, which sets the cost of masking and of zero-knowledge proofs.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#1010-in-the-real-world-and-going-deeper).

**Multiplicative function**
A function f with f(mn) = f(m) f(n) whenever m and n are coprime, such as φ.
See [Chapter 3](03-Modular-Arithmetic.md#computing-varphi).

**Multiplicity**
The order to which a polynomial vanishes at a point; Guruswami-Sudan asks for multiplicity s at each received point, raising the decoding radius to the Johnson bound.
See [Chapter 18](18-Error-Correcting-Codes.md#sudan-and-guruswami-sudan).

**Mutual information**
I(X; Y) = H(X) − H(X | Y), what Y tells about X.
See [Chapter 17](17-Information-and-Entropy.md#173-joint-conditional-and-mutual-information).

## N

**Negacyclic convolution**
Multiplication modulo x^n + 1, where a coefficient that wraps around comes back negated.
See [Chapter 15](15-Learning-with-Errors.md#152-the-ring-mathbbz_qxxn-1).

**Negligible**
A function of the security parameter that shrinks faster than one over any polynomial; a success probability too small to matter.
See [Chapter 1](01-Mathematics-for-Secrets.md#probabilities-that-small).

**No-cloning theorem**
No unitary copies an unknown quantum state: copying |0⟩ and |1⟩ correctly forces the wrong answer on their sum, by linearity.
See [Chapter 20](20-Quantum-Algorithms.md#why-noisy-qubits-need-a-code).

**Non-degenerate**
A pairing is non-degenerate when e(P, Q) ≠ 1 for some P and Q.
See [Chapter 13](13-Counting-Points-and-Pairings.md#137-pairings).

**Nonlinear filter generator**
A keystream generator in which a nonlinear Boolean function of a few cells of one LFSR outputs each keystream bit.
See [Chapter 9](09-Linear-Algebra.md#filter-generators).

**Nonlinearity**
The distance from a Boolean function to the nearest affine function.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#104-nonlinearity-and-bent-functions).

**Non-uniform attack**
An algorithm that may include advice computed in advance at any cost, such as a Hellman table for AES-128; counted this way, many 128-bit claims are false (Bernstein and Lange, 2013).
See [Chapter 19](19-Complexity-and-Reductions.md#free-precomputation-and-other-catches).

**Norm**
In F_{p²}, the map α ↦ α · α^p = α^(p+1) into F_p, which is a0² + a1² for α = a0 + a1·i and is multiplicative; α is a square in F_{p²} exactly when its norm is a square in F_p.
See [Chapter 5](05-Square-Roots-Mod-p.md#square-roots-in-mathbbf_p2).

**Normal form of LWE**
LWE rewritten so that the secret is a vector of the original errors, hence short; it is as hard as LWE with a uniform secret.
See [Chapter 15](15-Learning-with-Errors.md#short-secrets-the-normal-form).

**Normal subgroup**
A subgroup H with gH = Hg for every g, which is what makes coset multiplication well defined; kernels of homomorphisms are always normal.
See [Chapter 7](07-Groups.md#normal-subgroups-and-quotient-groups).

**NP**
The decision problems whose yes answers have certificates checkable in polynomial time.
See [Chapter 6](06-Primality-Testing.md#pocklingtons-theorem).

**NP-complete**
In NP and at least as hard as every problem in NP.
See [Chapter 19](19-Complexity-and-Reductions.md#193-p-np-and-np-completeness).

**Number-theoretic transform**
The FFT over a finite field Z/qZ, used to multiply polynomials in ML-KEM and ML-DSA.
See [Chapter 11](11-Polynomials-at-Work.md#117-the-number-theoretic-transform).

## O

**Offline Simon**
Bonnetain and coauthors' algorithm (2019) combining Simon with Grover in the Q1 model; against Even-Mansour it needs about 2^(n/3) time and classical queries.
See [Chapter 20](20-Quantum-Algorithms.md#why-the-model-matters).

**One-way function**
A function that is easy to compute but hard to invert on a random input.
See [Chapter 1](01-Mathematics-for-Secrets.md#the-definition).

**Opposite fixed point**
An input x with S(x) = x ⊕ 0xFF; the AES S-box has none.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#the-full-tables-of-the-aes-s-box).

**Oracle**
A black box an algorithm may query; Grover's search counts oracle queries.
See [Chapter 20](20-Quantum-Algorithms.md#207-grovers-search).

**Orbit**
The set G · x = {g · x} of every point that a group action can move x to.
See [Chapter 7](07-Groups.md#712-group-actions).

**Order**
The order of a is the least k > 0 with a^k = 1.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#45-the-order-of-an-element).

**Order finding**
Finding the least r with a^r ≡ 1 (mod N); the quantum heart of Shor's algorithm.
See [Chapter 20](20-Quantum-Algorithms.md#205-shors-algorithm).

**Overlap**
Σ_x min(P(x), Q(x)), the probability two distributions share; it equals 1 minus their statistical distance.
See [Chapter 16](16-Probability.md#by-hand-a-distance-between-two-small-distributions).

## P

**P**
The decision problems solvable in polynomial time.
See [Chapter 19](19-Complexity-and-Reductions.md#193-p-np-and-np-completeness).

**P-256**
The NIST prime curve over 2^256 − 2^224 + 2^192 + 2^96 − 1.
See [Chapter 13](13-Counting-Points-and-Pairings.md#in-the-real-world).

**Pairing**
A bilinear map e(aP, bQ) = e(P, Q)^ab between groups; it breaks DDH in the first group. Treated in Chapter 13.
See [Chapter 7](07-Groups.md#where-ddh-fails).

**Parallelization problem**
For a commutative group action, finding (ab) · x0 from a · x0 and b · x0; for exponentiation in a cyclic group it is computational Diffie-Hellman.
See [Chapter 7](07-Groups.md#diffie-hellman-as-an-action).

**Parity-check matrix**
A matrix H with Hc = 0 exactly for codewords.
See [Chapter 18](18-Error-Correcting-Codes.md#184-linear-codes).

**Parseval's identity**
The squares of the Walsh values always sum to 2^(2n), so a function cannot be far from all linear functions at once.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#103-the-walsh-hadamard-transform).

**PCLMULQDQ**
Intel's carry-less multiply instruction (Westmere, 2010), which computes one 64 × 64 → 128-bit carry-less product.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#in-hardware-carry-less-multiply-instructions).

**Pentanomial**
A polynomial with five terms, the next choice of modulus after a trinomial, used by AES for GF(2^8) and by GCM for GF(2^128).
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#why-not-a-trinomial-and-why-five-terms).

**Perfect code**
A code whose balls of radius t fill the space exactly, such as the Hamming and Golay codes.
See [Chapter 18](18-Error-Correcting-Codes.md#185-bounds-and-a-perfect-code).

**Perfect nonlinear**
Nyberg's name for vectorial bent functions, whose nonzero component functions are all bent, so every derivative is balanced.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#bent-means-every-derivative-is-balanced).

**Perfect secrecy**
A cipher is perfectly secret when the ciphertext is independent of the message; Shannon proved the key must then have as much entropy as the message.
See [Chapter 17](17-Information-and-Entropy.md#174-perfect-secrecy-and-shannons-theorem).

**Permutation**
A bijection from a set to itself, a reordering. A block cipher with a fixed key is a permutation of its blocks.
See [Chapter 1](01-Mathematics-for-Secrets.md#permutations).

**Phase estimation**
Kitaev's quantum algorithm (1995) that, given a unitary U and one of its eigenvectors, estimates the eigenvalue's phase with the quantum Fourier transform.
See [Chapter 20](20-Quantum-Algorithms.md#phase-estimation).

**Phase-flip code**
The three-qubit bit-flip code in the Hadamard basis, α|+++⟩ + β|−−−⟩, which corrects one phase flip Z.
See [Chapter 20](20-Quantum-Algorithms.md#the-phase-flip-code).

**Phase gate**
A gate that multiplies |1⟩ by a complex number of absolute value 1.
See [Chapter 20](20-Quantum-Algorithms.md#202-qubits-registers-and-gates).

**Phase oracle**
A gate |x⟩ ↦ (−1)^f(x) |x⟩ that marks inputs by a sign.
See [Chapter 20](20-Quantum-Algorithms.md#203-the-first-speedup-deutsch-jozsa).

**Physical qubit**
A qubit in hardware, with errors; many make one error-corrected logical qubit.
See [Chapter 20](20-Quantum-Algorithms.md#208-resource-estimates).

**Pigeonhole principle**
If more than n objects go into n boxes, some box holds two. It is why a compressing hash function must have collisions.
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Pivot**
The leading nonzero entry of a row during Gaussian elimination.
See [Chapter 9](09-Linear-Algebra.md#gaussian-elimination).

**Pocklington's theorem**
A test that proves n prime from a partial factorization of n − 1.
See [Chapter 6](06-Primality-Testing.md#pocklingtons-theorem).

**Point at infinity**
The extra point O that serves as the identity of an elliptic-curve group.
See [Chapter 12](12-Elliptic-Curve-Group.md#122-curves-and-the-point-at-infinity).

**Point compression**
Sending only x and one bit of y for an elliptic-curve point; the receiver recovers y with a square root.
See [Chapter 5](05-Square-Roots-Mod-p.md#51-the-problem).

**Polynomial commitment**
A short value that binds a prover to a polynomial and later lets them prove its value at any point.
See [Chapter 11](11-Polynomials-at-Work.md#polynomial-commitments).

**Polynomial time**
Running time bounded by a fixed power of the input size in bits; the working definition of "efficient".
See [Chapter 1](01-Mathematics-for-Secrets.md#big-o-notation).

**Potential function**
A quantity that only falls during an algorithm and cannot fall forever, proving that it stops; for LLL it is the product D of the Gram-Schmidt quantities d_i.
See [Chapter 14](14-Lattices.md#why-it-terminates).

**Power of a test**
The probability that a hypothesis test catches a real failure, and how many samples that takes.
See [Chapter 17](17-Information-and-Entropy.md#179-health-tests-watching-a-source-in-the-field).

**Primality certificate**
Extra data that lets anyone check quickly that a number is prime, such as a Pocklington or ECPP certificate.
See [Chapter 6](06-Primality-Testing.md#68-proving-primality).

**Prime**
An integer greater than 1 whose only positive divisors are 1 and itself.
See [Chapter 1](01-Mathematics-for-Secrets.md#proof-2-a-proof-by-contradiction).

**Prime number theorem**
The number of primes up to x is about x / ln x.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-prime-number-theorem).

**Primitive element**
A generator of the multiplicative group of a finite field.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#86-the-multiplicative-group-is-cyclic).

**Primitive polynomial**
An irreducible polynomial whose root x is a primitive element.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#86-the-multiplicative-group-is-cyclic).

**Primitive root**
A number g modulo a prime p whose powers run through every nonzero residue; a generator of the group of units.
See [Chapter 1](01-Mathematics-for-Secrets.md#by-hand-a-one-way-street).

**Principal homogeneous space**
A set with a free and transitive group action, so exactly one group element moves any point to any other; Diffie-Hellman needs nothing more.
See [Chapter 7](07-Groups.md#diffie-hellman-as-an-action).

**Probability**
A weight between 0 and 1 on events, adding up over disjoint events, with the whole space weighing 1.
See [Chapter 16](16-Probability.md#162-events-and-probabilities).

**Probing model**
Ishai, Sahai and Wagner's model (2003) of an attacker who can observe d wires of a circuit; masking with d + 1 shares leaks nothing to it.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#masking-the-algebra-of-shares).

**Product tree**
A binary tree of products of many numbers, the first half of batch gcd.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#210-in-the-real-world).

**Projective coordinates**
Representing points with an extra coordinate Z to avoid inversions.
See [Chapter 12](12-Elliptic-Curve-Group.md#126-projective-and-jacobian-coordinates).

**Proof**
A chain of steps, each justified, that shows a statement is true in every case it claims.
See [Chapter 1](01-Mathematics-for-Secrets.md#14-what-a-proof-is).

**Proof by contradiction**
Assuming a statement is false and deriving something impossible.
See [Chapter 1](01-Mathematics-for-Secrets.md#proof-2-a-proof-by-contradiction).

**Proof of possession**
A signature on one's own public key, which stops rogue-key attacks on aggregated BLS signatures.
See [Chapter 13](13-Counting-Points-and-Pairings.md#fix-it).

**PRP/PRF switching lemma**
A random permutation and a random function on n-bit blocks can be told apart with q queries with advantage at most q²/2^(n+1), the chance of a birthday collision.
See [Chapter 16](16-Probability.md#encrypting-many-messages).

**Pseudo-polynomial time**
Running time polynomial in the numeric values of the input but exponential in its length in bits, such as subset sum by dynamic programming.
See [Chapter 19](19-Complexity-and-Reductions.md#what-the-reduction-says-and-what-it-does-not).

**Pseudorandom function**
A keyed function no efficient test tells from a random function.
See [Chapter 19](19-Complexity-and-Reductions.md#195-one-way-functions).

**Pseudorandom generator**
A deterministic expansion of a short seed into a longer output that no efficient test tells from random.
See [Chapter 19](19-Complexity-and-Reductions.md#195-one-way-functions).

## Q

**Q1 model**
The attack model in which the attacker has a quantum computer but the keyed device answers only classical queries, as deployed systems do.
See [Chapter 20](20-Quantum-Algorithms.md#why-the-model-matters).

**Q2 model**
The attack model in which the attacker may make superposition queries to the keyed device; Simon's algorithm breaks Even-Mansour there with about n queries.
See [Chapter 20](20-Quantum-Algorithms.md#why-the-model-matters).

**q-ary lattice**
A lattice containing qZ^n, defined by equations modulo q; the lattices of LWE and SIS.
See [Chapter 14](14-Lattices.md#142-lattices-and-bases).

**Quadratic reciprocity**
For odd primes p and q, (p/q)(q/p) = (−1)^((p−1)/2 · (q−1)/2).
See [Chapter 5](05-Square-Roots-Mod-p.md#the-law).

**Quadratic residue**
A nonzero a modulo p that is a square; otherwise a quadratic non-residue.
See [Chapter 5](05-Square-Roots-Mod-p.md#by-hand).

**Quadratic residuosity problem**
Deciding whether a number with Jacobi symbol 1 is a square modulo N = pq without the factors.
See [Chapter 5](05-Square-Roots-Mod-p.md#what-the-jacobi-symbol-does-not-say).

**Quadratic sieve**
Pomerance's factoring method (1981): sieve the values Q(x) = x² − n for ones that factor over a factor base, then combine them by linear algebra mod 2 into X² ≡ Y² (mod n).
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-quadratic-sieve-in-miniature).

**Quadratic twist**
The curve dy² = x³ + ax + b with d a non-residue; its size is p + 1 + t.
See [Chapter 13](13-Counting-Points-and-Pairings.md#133-twists).

**Quantum Fourier transform**
The unitary |x⟩ ↦ (1/√Q) Σ e^(2πixy/Q) |y⟩, built from O(t²) gates on t qubits; it turns a period into peaks.
See [Chapter 20](20-Quantum-Algorithms.md#204-the-quantum-fourier-transform).

**Quasi-cyclic code**
A code built from circulant blocks, which makes keys short.
See [Chapter 18](18-Error-Correcting-Codes.md#1810-quasi-cyclic-codes-hqc-and-bike).

**Qubit**
A quantum bit: a unit vector α|0⟩ + β|1⟩, which measures as 0 with probability |α|² and 1 with probability |β|².
See [Chapter 20](20-Quantum-Algorithms.md#202-qubits-registers-and-gates).

**Quotient**
In division with remainder a = qn + r, the number q.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-division-theorem).

**Quotient group**
The group G/H of the cosets of a normal subgroup H, with (aH)(bH) = abH, of order |G|/|H|.
See [Chapter 7](07-Groups.md#normal-subgroups-and-quotient-groups).

**Quotient ring**
A ring of residues, such as F_2[x] modulo an irreducible polynomial, which builds the field GF(2^8).
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#85-building-mathrmgfpn).

## R

**Rabin's theorem**
Computing square roots modulo N is equivalent to factoring N.
See [Chapter 5](05-Square-Roots-Mod-p.md#square-roots-are-as-hard-as-factoring).

**Rainbow table**
Oechslin's version (2003) of Hellman's tables with a different reduction function in every column, so chains merge only when they collide in the same column.
See [Chapter 19](19-Complexity-and-Reductions.md#trading-memory-for-time-hellmans-tables).

**Randomness extractor**
A function that turns a weak random source with enough min-entropy into nearly uniform bits.
See [Chapter 17](17-Information-and-Entropy.md#177-extractors).

**Random oracle**
A function chosen uniformly from all functions that everyone, adversary included, can only query; proofs treat a hash as one, then deploy a real hash.
See [Chapter 19](19-Complexity-and-Reductions.md#1911-the-random-oracle-model-and-its-limits).

**Random self-reducibility**
Turning any instance into a uniformly random one, so a problem hard in the worst case is hard on average; discrete logs have it.
See [Chapter 19](19-Complexity-and-Reductions.md#198-random-self-reducibility).

**Random variable**
A number that depends on the outcome of an experiment.
See [Chapter 16](16-Probability.md#164-random-variables-and-expectation).

**Rank**
The number of independent rows (or columns) of a matrix.
See [Chapter 9](09-Linear-Algebra.md#93-rank-kernel-and-the-shape-of-the-solutions).

**Rank-nullity theorem**
For an m × n matrix, the rank plus the dimension of the kernel equals n.
See [Chapter 9](09-Linear-Algebra.md#93-rank-kernel-and-the-shape-of-the-solutions).

**Rate**
k/n, the fraction of a codeword that carries message.
See [Chapter 18](18-Error-Correcting-Codes.md#182-distance-and-decoding).

**REDC**
Montgomery reduction: computes TR^(−1) mod N with multiplications and a shift.
See [Chapter 3](03-Modular-Arithmetic.md#montgomery-multiplication).

**Reduced row echelon form**
The end form of Gaussian elimination, each pivot 1 and alone in its column.
See [Chapter 9](09-Linear-Algebra.md#gaussian-elimination).

**Reduction**
A proof that turns any solver for one problem into a solver for another, so the first problem is at least as hard as the second.
See [Chapter 1](01-Mathematics-for-Secrets.md#14-what-a-proof-is).

**Redundancy**
How far a language falls short of the maximum entropy per character; about 3.2 bits per letter in English.
See [Chapter 17](17-Information-and-Entropy.md#175-redundancy-and-the-unicity-distance).

**Reed-Muller code**
RM(r, m), the truth tables of all Boolean functions of m variables of degree at most r; its length is 2^m and its minimum distance 2^(m−r).
See [Chapter 18](18-Error-Correcting-Codes.md#1811-reed-muller-codes-and-majority-logic).

**Remainder**
In division with remainder a = qn + r with 0 ≤ r < n, the number r.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-division-theorem).

**Remainder tree**
Reducing a big product down a product tree to get each number's remainder; with a product tree it finds shared RSA primes among millions of keys.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#210-in-the-real-world).

**Repetition code**
Sending each bit several times and taking a majority vote.
See [Chapter 18](18-Error-Correcting-Codes.md#182-distance-and-decoding).

**Residue classes**
The n classes of integers modulo n, the elements of Z/nZ.
See [Chapter 3](03-Modular-Arithmetic.md#an-equivalence-relation).

**Residue number system**
Representing big numbers by their residues modulo several small coprime moduli, so arithmetic runs in parallel.
See [Chapter 3](03-Modular-Arithmetic.md#311-going-deeper).

**Riemann hypothesis**
The unproved conjecture about the zeros of the zeta function that would give the sharpest error term in the prime number theorem.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-prime-number-theorem).

**Ring**
A set with addition and multiplication satisfying the usual laws except, perhaps, commutativity of multiplication and inverses.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#82-rings-and-fields).

**Ring isomorphism**
A bijection between rings that respects both addition and multiplication.
See [Chapter 3](03-Modular-Arithmetic.md#what-the-theorem-really-says).

**Ring-LWE**
LWE with polynomials in Z_q[x]/(x^n + 1) in place of vectors, which shrinks keys by a factor of n.
See [Chapter 15](15-Learning-with-Errors.md#158-ring-lwe-and-module-lwe).

**Ristretto**
The successor of Decaf, a prime-order group built from a curve with a cofactor with one encoding per element; RFC 9496 specifies ristretto255.
See [Chapter 12](12-Elliptic-Curve-Group.md#1213-going-deeper).

**Root Hermite factor**
δ with ‖b1‖ ≈ δ^n (det L)^(1/n); about 1.0219 for LLL, smaller for stronger BKZ.
See [Chapter 14](14-Lattices.md#lll-in-practice).

**Roots of unity**
Elements ω with ω^n = 1; a primitive one has no smaller such power.
See [Chapter 11](11-Polynomials-at-Work.md#the-trick).

## S

**Saber**
A Module-LWR KEM (2018) with power-of-two moduli, so rounding is a shift and no error is sampled; a third-round candidate in NIST's process.
See [Chapter 15](15-Learning-with-Errors.md#1514-learning-with-rounding).

**SafeCurves**
Bernstein and Lange's list of criteria for elliptic curves that are safe in practice as well as in theory.
See [Chapter 13](13-Counting-Points-and-Pairings.md#1311-choosing-a-curve).

**Safe prime**
A prime p = 2q + 1 with q prime (q is then a Sophie Germain prime), so the group of units has a large prime-order subgroup.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#safe-primes).

**Salt**
A random value hashed with each password so that one precomputation, such as a rainbow table, no longer serves all users.
See [Chapter 19](19-Complexity-and-Reductions.md#trading-memory-for-time-hellmans-tables).

**Sample space**
The set of all possible outcomes of an experiment.
See [Chapter 16](16-Probability.md#162-events-and-probabilities).

**Sato-Tate distribution**
The distribution that the normalized traces t/(2√p) follow across primes for curves without complex multiplication.
See [Chapter 13](13-Counting-Points-and-Pairings.md#code-it).

**S-box**
A small nonlinear lookup table, the source of a block cipher's nonlinearity.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#101-the-problem).

**Scalar multiplication**
Computing kP = P + P + … + P (k times), fast by double-and-add.
See [Chapter 12](12-Elliptic-Curve-Group.md#125-scalar-multiplication-and-the-structure-of-the-group).

**Schoof's algorithm**
Counts points on a curve in polynomial time by finding t modulo many small primes.
See [Chapter 13](13-Counting-Points-and-Pairings.md#134-counting-points-quickly).

**Schwartz-Zippel lemma**
A nonzero polynomial of total degree d vanishes at a random point of S^n with probability at most d/|S|.
See [Chapter 11](11-Polynomials-at-Work.md#114-schwartz-zippel-one-random-point-is-enough).

**Search-LWE**
The problem of finding s from LWE samples.
See [Chapter 15](15-Learning-with-Errors.md#156-lwe-and-regevs-encryption).

**secp256k1**
The Koblitz-style curve y² = x³ + 7 used by Bitcoin.
See [Chapter 13](13-Counting-Points-and-Pairings.md#in-the-real-world).

**Security game**
A precise experiment between a challenger and an adversary that defines what breaking a scheme means.
See [Chapter 16](16-Probability.md#169-negligible-functions-games-and-advantage).

**Seed**
The random-looking input from which a standard curve's coefficients were derived.
See [Chapter 13](13-Counting-Points-and-Pairings.md#the-seeds-of-p-256).

**Semiconvergent**
A fraction lying between two consecutive convergents of a continued fraction, built from them as (p + a·p′)/(q + a·q′); it can be the closest fraction with a bounded denominator without being a convergent.
See [Chapter 20](20-Quantum-Algorithms.md#by-hand-the-continued-fraction-step).

**Set**
A collection of distinct objects, its elements, with no order and no repeats.
See [Chapter 1](01-Mathematics-for-Secrets.md#sets).

**Shannon entropy**
H(X) = −Σ p log2 p, the average surprise of a random variable in bits.
See [Chapter 17](17-Information-and-Entropy.md#172-shannon-entropy).

**Share**
One holder's piece of a secret in a secret-sharing scheme.
See [Chapter 11](11-Polynomials-at-Work.md#113-shamir-secret-sharing).

**Share refreshing**
Replacing all shares with new ones of the same secret, by adding shares of zero, so old stolen shares become useless.
See [Chapter 11](11-Polynomials-at-Work.md#fewer-than-k-shares-reveal-nothing).

**Short Weierstrass form**
The equation y² = x³ + ax + b, valid in characteristic other than 2 and 3.
See [Chapter 12](12-Elliptic-Curve-Group.md#122-curves-and-the-point-at-infinity).

**Shoup's theorem**
A generic algorithm needs about √q group operations to solve discrete logs in a group of prime order q.
See [Chapter 7](07-Groups.md#78-the-generic-group-model-and-shoups-bound).

**Siegenthaler's trade-off**
Correlation-immunity order plus algebraic degree is at most n.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#105-correlation-immunity-and-the-combining-generator).

**Signature aggregation**
Combining many BLS signatures into one group element that verifies them all.
See [Chapter 13](13-Counting-Points-and-Pairings.md#138-bls-signatures).

**Simplex code**
The dual of a Hamming code; the [7, 3, 4] simplex code is the zero word and seven words of weight 4.
See [Chapter 18](18-Error-Correcting-Codes.md#weight-distribution-and-the-macwilliams-identity).

**Simplified SWU**
A map from field elements to points of y² = x³ + Ax + B with A, B ≠ 0, named in RFC 9380 and used for the NIST curves.
See [Chapter 12](12-Elliptic-Curve-Group.md#the-simplified-swu-map).

**Singleton bound**
d ≤ n − k + 1; Reed-Solomon codes meet it.
See [Chapter 18](18-Error-Correcting-Codes.md#185-bounds-and-a-perfect-code).

**SIS**
Short integer solution: find a short nonzero x with Ax = 0 mod q; the problem behind hash-and-sign lattice signatures.
See [Chapter 19](19-Complexity-and-Reductions.md#199-the-map-of-assumptions).

**Size-reduced**
A basis whose Gram-Schmidt coefficients are all at most 1/2 in absolute value.
See [Chapter 14](14-Lattices.md#148-the-lll-algorithm).

**Sliding windows**
Exponentiation that handles several exponent bits at a time with a small table of odd powers.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#410-in-the-real-world).

**Small-subgroup attack**
Sending an element of small order to learn a secret exponent modulo that order, piece by piece.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#schnorr-groups).

**Smooth curve**
A curve with no cusps or self-crossings; for y² = x³ + ax + b this means 4a³ + 27b² ≠ 0.
See [Chapter 12](12-Elliptic-Curve-Group.md#122-curves-and-the-point-at-infinity).

**Smooth number**
A number is B-smooth when all its prime factors are at most B; factoring and discrete-log algorithms hunt for smooth numbers.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#211-going-deeper).

**Solovay-Strassen test**
A primality test comparing a^((n−1)/2) with the Jacobi symbol; a mismatch is an Euler witness.
See [Chapter 6](06-Primality-Testing.md#65-the-solovay-strassen-test).

**Sophie Germain prime**
A prime q such that 2q + 1 is also prime.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#safe-primes).

**Special soundness**
The property that two valid Schnorr signatures with the same R and different challenges reveal the secret key.
See [Chapter 19](19-Complexity-and-Reductions.md#the-scheme-and-two-signatures-by-hand).

**Spurious key**
A wrong key whose decryption of a ciphertext still reads as meaningful plaintext; their expected number falls as the ciphertext grows.
See [Chapter 17](17-Information-and-Entropy.md#where-the-formula-comes-from-the-random-cipher).

**Square-and-multiply**
Computing a^e by reading e bit by bit, squaring for each bit and multiplying for each 1.
See [Chapter 4](04-Powers-and-Primitive-Roots.md#by-hand).

**Stabilizer**
The subgroup of group elements that fix a point x under an action; the size of the orbit of x times the order of its stabilizer is |G|.
See [Chapter 7](07-Groups.md#712-group-actions).

**Stabilizer (quantum code)**
An operator, such as Z0Z1, of which every codeword is an eigenvector with eigenvalue +1; measuring the stabilizers gives the syndrome.
See [Chapter 20](20-Quantum-Algorithms.md#the-three-qubit-bit-flip-code).

**Statistical distance**
Half the sum of |P(x) − Q(x)|; the best advantage any distinguisher can have between P and Q.
See [Chapter 16](16-Probability.md#166-statistical-distance-and-modulo-bias).

**Strong prime**
A prime p for which p − 1 and p + 1 each have a large prime factor, once required by standards such as ANSI X9.31 against Pollard's p − 1 method; for random large primes it is no longer needed.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#210-in-the-real-world).

**Strong pseudoprime**
A composite that passes the Miller-Rabin test to a given base, a strong liar.
See [Chapter 6](06-Primality-Testing.md#the-test).

**Strong witness**
A base that proves n composite in the Miller-Rabin test.
See [Chapter 6](06-Primality-Testing.md#the-test).

**Structured Gaussian elimination**
A first stage for huge sparse systems (LaMacchia and Odlyzko, 1990), also called filtering or merging, that drops columns with one nonzero and eliminates those with two or three, shrinking the matrix while it stays sparse.
See [Chapter 9](09-Linear-Algebra.md#why-not-elimination).

**Subcube**
The 2^r points obtained by letting r chosen variables run through all values while the others stay fixed; Reed's decoder sums a codeword over subcubes and takes a majority vote.
See [Chapter 18](18-Error-Correcting-Codes.md#1811-reed-muller-codes-and-majority-logic).

**Subexponential time**
Running time between polynomial and exponential, such as that of the number field sieve.
See [Chapter 1](01-Mathematics-for-Secrets.md#big-o-notation).

**Subgroup**
A subset of a group that is itself a group under the same operation.
See [Chapter 6](06-Primality-Testing.md#the-liars-of-a-composite-form-a-group).

**Subset-sum problem**
Given numbers and a target, find a subset that adds to it; knapsack cryptosystems based on it fell to lattice reduction.
See [Chapter 14](14-Lattices.md#1411-break-it-the-knapsack).

**Succinct proof**
A proof much shorter than the computation it checks, and fast to verify.
See [Chapter 11](11-Polynomials-at-Work.md#why-succinct-proofs-are-polynomial-tricks).

**Superpoly**
In a cube attack, the polynomial in the key alone obtained by XORing the output over all values of a chosen set of IV bits; a large enough cube makes it linear.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#break-it-a-cube-attack-on-a-toy-cipher).

**Superposition queries**
Queries in which the attacker sends a keyed device a superposition of inputs and gets back the superposition of outputs; the Q2 model allows them.
See [Chapter 20](20-Quantum-Algorithms.md#why-the-model-matters).

**Supersingular curve**
A curve whose trace of Frobenius is divisible by p; over F_p with p > 3, trace 0 and p + 1 points.
See [Chapter 13](13-Counting-Points-and-Pairings.md#code-it).

**Support of a Goppa code**
The list of distinct field elements at which a Goppa code is defined.
See [Chapter 18](18-Error-Correcting-Codes.md#187-binary-goppa-codes).

**Surface code**
A quantum error-correcting code on a square grid of qubits with nearest-neighbor couplings, from Kitaev's toric code; it tolerates physical error rates up to about 1%.
See [Chapter 20](20-Quantum-Algorithms.md#the-surface-code).

**Surjective**
A function whose image is the whole codomain (onto).
See [Chapter 1](01-Mathematics-for-Secrets.md#functions).

**Surprise**
−log2 p, the information carried by an outcome of probability p.
See [Chapter 17](17-Information-and-Entropy.md#172-shannon-entropy).

**SVP**
The shortest vector problem: find a shortest nonzero lattice vector.
See [Chapter 14](14-Lattices.md#146-the-shortest-and-closest-vector-problems).

**Sylow subgroup**
For a prime r with |G| = r^a · m and r not dividing m, a subgroup of order r^a; Sylow's theorems say such subgroups exist and are all conjugate.
See [Chapter 7](07-Groups.md#sylows-theorems).

**Symmetric group**
S_n, the group of all permutations of n objects.
See [Chapter 7](07-Groups.md#examples).

**Syndrome**
Hr for a received word r; it is zero for codewords and depends only on the error.
See [Chapter 18](18-Error-Correcting-Codes.md#by-hand).

**Syndrome decoding problem**
Given H and s, find a word e of weight t with He = s; NP-complete in general and the basis of code-based cryptography.
See [Chapter 18](18-Error-Correcting-Codes.md#189-syndrome-decoding-and-information-set-decoding).

## T

**Tail**
In a walk x_{i+1} = f(x_i) on a finite set, the μ steps taken before reaching the first value that recurs; with the cycle it forms the letter ρ.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#pollards-rho-a-walk-that-must-repeat).

**Tensor product**
The way the states of separate qubits combine; n qubits have 2^n amplitudes.
See [Chapter 20](20-Quantum-Algorithms.md#202-qubits-registers-and-gates).

**Textbook RSA**
RSA with no padding, the map x ↦ x^e on (Z/NZ)*; it is a homomorphism, and so malleable.
See [Chapter 7](07-Groups.md#encryption-that-is-a-homomorphism).

**Threshold implementation**
A masking (Nikova, Rechberger and Rijmen, 2006) that shares a function of degree t into at least t + 1 pieces, each output share computed without one input share, needing little or no fresh randomness.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#multiplicative-complexity-sets-the-price).

**Threshold scheme**
A way to split a secret into n shares so that any k recover it and fewer learn nothing; Shamir's scheme uses a polynomial of degree k − 1.
See [Chapter 11](11-Polynomials-at-Work.md#113-shamir-secret-sharing).

**Threshold signature**
A signature that any k of n key holders can produce together without ever assembling the key.
See [Chapter 11](11-Polynomials-at-Work.md#1110-in-the-real-world-and-going-deeper).

**Tight reduction**
A reduction that loses little success probability or time, so the scheme keeps nearly all the problem's bits of security.
See [Chapter 19](19-Complexity-and-Reductions.md#tightness-and-concrete-security).

**Tower law**
For fields F ⊂ K ⊂ L, the degree of L over F is the product of the degrees of L over K and K over F, because products of basis elements form a basis.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#extending-an-extension).

**Tower of fields**
A large field built in steps, each a small extension of the one before, such as F_{p^12} built from F_p in three steps by two-term polynomials, as pairing libraries do.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#810-towers-of-fields).

**Trace**
The sum u + u^p + … + u^(p^(n−1)) of an element's conjugates in GF(p^n), which always lies in F_p.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#the-galois-group-and-the-general-norm).

**Trace of Frobenius**
t = p + 1 − #E(F_p); Hasse's theorem says |t| ≤ 2√p.
See [Chapter 13](13-Counting-Points-and-Pairings.md#132-hasses-theorem).

**Transitive action**
A group action with a single orbit, so every point can be moved to every other.
See [Chapter 7](07-Groups.md#diffie-hellman-as-an-action).

**Trapdoor one-way function**
A one-way function that becomes easy to invert with a secret, the trapdoor; RSA is the standard example.
See [Chapter 1](01-Mathematics-for-Secrets.md#trapdoors).

**Trinomial**
A polynomial with three terms, x^n + x^k + 1, the cheapest reduction modulus; over F_2 none of degree a multiple of 8 is irreducible.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#why-not-a-trinomial-and-why-five-terms).

**Truth table**
The list of a Boolean function's outputs on all 2^n inputs.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#102-boolean-functions-and-their-algebraic-normal-form).

**Try-and-increment**
Hashing to a curve by trying x = H(m), H(m) + 1, … until x³ + ax + b is a square; not constant-time.
See [Chapter 13](13-Counting-Points-and-Pairings.md#code-it_4).

**Twin primes**
Primes that differ by 2, such as 11 and 13; whether there are infinitely many is open.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#gaps-and-patterns).

**Twist**
The curve that shares x-coordinates with a curve's missing points; an x-only implementation must be secure on its twist too.
See [Chapter 12](12-Elliptic-Curve-Group.md#1210-break-it-the-invalid-curve-attack).

**Twisted Edwards curve**
A curve ax² + y² = 1 + dx²y² whose addition formula can be complete.
See [Chapter 12](12-Elliptic-Curve-Group.md#128-twisted-edwards-curves-and-complete-formulas).

**Twist security**
The property that a curve's twist also has a large prime-order subgroup, so x-only code fed a point on the twist leaks nothing useful; Curve25519 has it.
See [Chapter 12](12-Elliptic-Curve-Group.md#every-x-is-on-the-curve-or-on-its-twist).

## U

**Unicity distance**
The ciphertext length at which only one key is expected to give meaningful plaintext: key entropy divided by redundancy.
See [Chapter 17](17-Information-and-Entropy.md#175-redundancy-and-the-unicity-distance).

**Unimodular matrix**
An integer matrix with determinant ±1; two bases of the same lattice differ by one.
See [Chapter 14](14-Lattices.md#142-lattices-and-bases).

**Union bound**
The probability that at least one of several events happens is at most the sum of their probabilities.
See [Chapter 16](16-Probability.md#165-the-union-bound-and-the-birthday-problem).

**Unit**
An element with a multiplicative inverse; modulo n, exactly the residues coprime to n.
See [Chapter 3](03-Modular-Arithmetic.md#34-units-and-inverses).

**Unitary**
A matrix that preserves length, U*U = I; every quantum gate is one.
See [Chapter 20](20-Quantum-Algorithms.md#202-qubits-registers-and-gates).

**Universal gate set**
A set of gates from which any quantum computation can be approximated.
See [Chapter 20](20-Quantum-Algorithms.md#202-qubits-registers-and-gates).

## V

**Vandermonde matrix**
The matrix of powers x_i^j; it is invertible when the x_i are distinct, which is why interpolation has a unique answer.
See [Chapter 11](11-Polynomials-at-Work.md#interpolation-is-linear-algebra).

**Variance**
The expected squared distance of a random variable from its mean.
See [Chapter 16](16-Probability.md#164-random-variables-and-expectation).

**Vector**
An ordered list of numbers from a field; vectors can be added and scaled.
See [Chapter 9](09-Linear-Algebra.md#92-vectors-matrices-and-elimination).

**Vectorization problem**
For a group action, finding the element g with g · x = y; for exponentiation in a cyclic group it is the discrete logarithm.
See [Chapter 7](07-Groups.md#diffie-hellman-as-an-action).

**Verifiable secret sharing**
Secret sharing with public commitments that let each holder check their share is consistent.
See [Chapter 11](11-Polynomials-at-Work.md#119-break-it-careless-secret-sharing).

**Von Neumann extractor**
Read bits in pairs; output 0 for 01, 1 for 10, nothing for 00 or 11. It removes bias from independent bits.
See [Chapter 17](17-Information-and-Entropy.md#177-extractors).

## W

**Walsh spectrum**
The list of correlations of a Boolean function with every linear function.
See [Chapter 10](10-Boolean-Functions-and-S-Boxes.md#103-the-walsh-hadamard-transform).

**Weight**
The number of nonzero positions of a word.
See [Chapter 18](18-Error-Correcting-Codes.md#182-distance-and-decoding).

**Weight distribution**
The numbers A_0, …, A_n of a code's codewords of each Hamming weight.
See [Chapter 18](18-Error-Correcting-Codes.md#weight-distribution-and-the-macwilliams-identity).

**Weight enumerator**
The polynomial W_C(x, y) = Σ A_w x^(n−w) y^w that packs a code's weight distribution; the MacWilliams identity gives the dual code's from it.
See [Chapter 18](18-Error-Correcting-Codes.md#weight-distribution-and-the-macwilliams-identity).

**Well-ordering principle**
Every nonempty set of natural numbers has a least element.
See [Chapter 2](02-Divisibility-Primes-and-Factoring.md#the-division-theorem).

**Wide trail strategy**
AES's design method: bound the number of active S-boxes in any trail with the linear layer's branch number.
See [Chapter 9](09-Linear-Algebra.md#mds-matrices).

**Word**
A machine-sized piece (limb) of a big number, usually 64 bits; big-number arithmetic is costed in word multiplications.
See [Chapter 3](03-Modular-Arithmetic.md#counting-the-cost).

## X

**X25519**
Diffie-Hellman on Curve25519 using x-coordinates only and the Montgomery ladder.
See [Chapter 12](12-Elliptic-Curve-Group.md#x25519).

**XOR period**
A nonzero s with f(x) = f(x′) exactly when x′ = x or x′ = x ⊕ s; Simon's algorithm finds it with about n quantum queries.
See [Chapter 20](20-Quantum-Algorithms.md#simons-problem).

**xtime**
Multiplication by x in AES's field GF(2^8): a shift and a conditional XOR with 0x1B.
See [Chapter 8](08-Rings-Fields-and-Polynomials.md#87-mathrmgf28-the-field-inside-aes).

## Z

**Zero divisor**
A nonzero element a with ab = 0 for some nonzero b, such as 2 · 3 = 0 modulo 6.
See [Chapter 3](03-Modular-Arithmetic.md#multiplication-tables).

**zxcvbn**
Wheeler's password-strength estimator (2016), which approximates the guess number by matching against dictionaries, keyboard patterns, dates and common substitutions.
See [Chapter 17](17-Information-and-Entropy.md#why-bits-meters-mislead).

**Back to:** [the book's contents](index.md).
