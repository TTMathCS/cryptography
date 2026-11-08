# Glossary

*Short definitions of the terms this book uses, from A to Z, each with a link to the chapter that teaches it.*

## A

**Academic break**
An attack faster than the generic attack but still far too expensive to run, such as the biclique attack on AES-128. It matters as a measure of the margin, not as a danger to users.
See [Chapter 1](01-What-Cryptanalysis-Is.md#15-academic-and-practical-breaks).

**Active S-box**
An S-box whose input difference (or output mask) is nonzero in a trail. Counting active S-boxes gives a bound on how good any trail can be.
See [Chapter 5](05-Differential-Cryptanalysis.md#52-differences-through-a-cipher).

**Adaptive chosen-ciphertext attack**
An attack in which the attacker may ask for decryptions of ciphertexts of their choice, each chosen after seeing earlier answers. Padding oracles and Bleichenbacher's attack work in this model.
See [Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models).

**Advantage**
How much better than guessing an attacker does at telling two things apart, from 0 (no better than a coin) to 1 (always right).
See [Chapter 1](01-What-Cryptanalysis-Is.md#110-going-deeper).

**AES (Advanced Encryption Standard)**
The 128-bit block cipher Rijndael, with 10, 12 or 14 rounds for 128-, 192- and 256-bit keys, standardized as FIPS 197 in 2001. No practical attack on the full cipher is known.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#710-what-aes-is-unbroken-means).

**Al-Kindi's method**
The first written description of frequency analysis, from ninth-century Baghdad: rank the ciphertext's symbols by frequency against a sample of the language, then correct with letter combinations.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#23-al-kindis-method).

**Algebraic attack**
An attack that writes the cipher as a system of polynomial equations in the key bits and tries to solve it, by linearization, Gröbner bases or SAT solvers.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#75-algebraic-attacks-the-cipher-as-equations).

**Algebraic immunity**
The smallest degree of a nonzero function that annihilates a Boolean function or its complement. Low algebraic immunity lets an algebraic attack write a stream cipher's output as low-degree equations.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#86-algebraic-attacks-and-algebraic-immunity).

**Annihilator**
A nonzero Boolean function $g$ with $f \cdot g = 0$. If a filter function has a low-degree annihilator, each keystream bit gives a low-degree equation in the state.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#86-algebraic-attacks-and-algebraic-immunity).

**Anomalous curve**
An elliptic curve over $\mathbb F_p$ with exactly $p$ points. Smart's attack solves its discrete logarithms in polynomial time.
See [Chapter 12](12-Discrete-Logarithms.md#1211-weak-curves-mov-frey-ruck-and-anomalous-curves).

**Ascon**
A lightweight family of authenticated encryption, hash and extendable-output functions built on a 320-bit permutation; chosen by NIST in 2023 and standardized in SP 800-232.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#204-competitions-breaking-before-deploying).

**Attack model**
What the attacker can see and do: ciphertext only, known plaintext, chosen plaintext, chosen ciphertext, related keys, side channels or faults.
See [Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models).

## B

**Baby-step giant-step**
Shanks's meet-in-the-middle method for discrete logarithms, using about $\sqrt q$ time and a table of $\sqrt q$ group elements.
See [Chapter 12](12-Discrete-Logarithms.md#122-baby-step-giant-step).

**Banburismus**
Turing's statistical method for reducing the bombe work on naval Enigma, scoring the overlap of message pairs in units called bans and decibans.
See [Chapter 3](03-Machines-and-the-War.md#313-going-deeper).

**Batch GCD**
A method that computes the greatest common divisor of each of many RSA moduli with the product of all the others at once, exposing any that share a prime.
See [Chapter 18](18-Random-Numbers-Gone-Wrong.md#186-batch-gcd-millions-of-keys-at-once).

**BEAST**
A 2011 attack on TLS 1.0 that used CBC's predictable initialization vectors and a chosen boundary to recover a cookie one byte at a time.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#105-beast-a-predictable-iv).

**Berlekamp-Massey algorithm**
An algorithm that finds the shortest LFSR producing a given sequence; it needs only $2L$ bits for an LFSR of length $L$.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#82-linear-complexity-why-a-bare-lfsr-is-useless).

**Bias**
For a linear approximation that holds with probability $p$, the distance $\varepsilon = p - \tfrac12$. Linear attacks need about $1/\varepsilon^2$ known plaintexts.
See [Chapter 6](06-Linear-Cryptanalysis.md#63-bias-correlation-and-the-piling-up-lemma).

**Biclique attack**
A meet-in-the-middle attack that covers the first rounds with a structure of keys and states (a biclique). It breaks full AES-128 at about $2^{126.1}$, a gain of about four.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#78-bicliques-the-21261-attack-on-full-aes).

**Birthday bound**
The fact that about $\sqrt N$ random draws from $N$ values are enough for a likely repeat. It sets the cost of generic collision attacks.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#44-the-birthday-bound-derived).

**Bit security**
The base-2 logarithm of the cost of the best attack; a cipher with "128-bit security" should need about $2^{128}$ operations to break.
See [Chapter 1](01-What-Cryptanalysis-Is.md#110-going-deeper).

**BKZ**
Block Korkine-Zolotarev reduction, the lattice reduction algorithm used in practice. Larger block sizes $\beta$ give shorter vectors at a cost exponential in $\beta$.
See [Chapter 15](15-Lattices-as-a-Weapon.md#153-what-lll-and-bkz-deliver).

**Bleichenbacher's attack**
The 1998 "million message" attack that decrypts RSA PKCS #1 v1.5 ciphertexts by asking a server whether trial ciphertexts have valid padding.
See [Chapter 13](13-Attacks-on-RSA.md#138-bleichenbachers-million-message-attack).

**Bleichenbacher's signature forgery**
The 2006 attack on RSA signature verifiers that parse instead of compare; with $e = 3$ an integer cube root gives a signature they accept.
See [Chapter 13](13-Attacks-on-RSA.md#1310-bleichenbachers-2006-signature-forgery).

**Bombe**
The electromechanical machine designed by Turing and improved by Welchman that tested Enigma rotor settings against a crib's menu.
See [Chapter 3](03-Machines-and-the-War.md#34-cribs-menus-and-the-turing-welchman-bombe).

**Boomerang attack**
An attack that joins two short differentials, one for each half of a cipher, using adaptive chosen plaintexts and ciphertexts. The rectangle attack is its chosen-plaintext form.
See [Chapter 5](05-Differential-Cryptanalysis.md#57-truncated-impossible-and-boomerang-differentials).

**Branch number**
The smallest number of active input and output bytes of a linear layer over all nonzero inputs. MDS matrices such as AES's MixColumns reach the maximum.
See [Chapter 5](05-Differential-Cryptanalysis.md#58-the-wide-trail-why-aes-resists).

**BREACH**
A 2013 compression-oracle attack on HTTP response bodies, reading secrets from the size of compressed, encrypted pages.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#109-compression-oracles-crime-and-breach).

**Break**
Any attack on a cryptographic system that is faster than the generic attack for the same goal. A break need not be practical.
See [Chapter 1](01-What-Cryptanalysis-Is.md#14-the-three-costs).

**Brute force**
Another name for exhaustive key search.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#42-exhaustive-key-search).

**Bug bounty**
A payment from a vendor to a researcher who reports a flaw privately.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#207-the-economics-of-attacks).

**Bullrun**
The NSA program, revealed in 2013 from the Snowden documents, to make encrypted communications readable by influencing standards and products, obtaining keys and cryptanalysis.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#207-the-economics-of-attacks).

## C

**Cache attack**
A side-channel attack that learns which memory addresses a victim used from the state of a shared cache. Prime+Probe and Flush+Reload are the two main methods.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#174-cache-attacks-primeprobe-and-flushreload).

**CAESAR**
An academic competition for authenticated encryption, 2013 to 2019, organized by Daniel J. Bernstein; its final portfolio included Ascon, ACORN, AEGIS-128, OCB, Deoxys-II and COLM.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#204-competitions-breaking-before-deploying).

**Capacity (linear)**
The sum of the squared correlations of several linear approximations used together; it sets the data a multiple-approximation attack needs.
See [Chapter 6](06-Linear-Cryptanalysis.md#610-many-approximations-at-once).

**Capacity (sponge)**
The part of a sponge's state that input and output never touch directly. Generic attacks on a sponge cost about $2^{c/2}$ for capacity $c$.
See [Chapter 9](09-Breaking-Hash-Functions.md#911-the-sponge-and-sha-3).

**Characteristic (differential)**
A choice of difference at every round of a cipher, with the probability that a pair follows it. Also called a trail.
See [Chapter 5](05-Differential-Cryptanalysis.md#53-characteristics-and-differentials).

**Chosen-ciphertext attack**
An attack in which the attacker may have ciphertexts of their choice decrypted.
See [Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models).

**Chosen-plaintext attack**
An attack in which the attacker may have plaintexts of their choice encrypted.
See [Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models).

**Chosen-prefix collision**
Two messages with different prefixes chosen by the attacker, extended by computed suffixes so that their hashes are equal. It made forged certificates for MD5 and SHA-1 possible.
See [Chapter 9](09-Breaking-Hash-Functions.md#98-chosen-prefix-collisions-the-rogue-ca-and-flame).

**Ciphertext-only attack**
An attack that uses only intercepted ciphertexts, with at most a model of the plaintext's language.
See [Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models).

**Clustering**
The effect of many characteristics with the same input and output differences adding to the probability of one differential.
See [Chapter 5](05-Differential-Cryptanalysis.md#53-characteristics-and-differentials).

**Colossus**
The programmable electronic machines built at Bletchley Park from 1943 to 1944 to count statistics on Lorenz ciphertexts for Tutte's method.
See [Chapter 3](03-Machines-and-the-War.md#37-the-double-delta-and-colossus).

**Compression oracle**
An attack that learns a secret from the length of compressed and then encrypted data containing it and attacker-chosen text, as in CRIME and BREACH.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#109-compression-oracles-crime-and-breach).

**Coordinated disclosure**
Reporting a flaw privately to the vendor and publishing after a fix or an agreed deadline, commonly 90 days. Also called responsible disclosure.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#203-how-breaks-are-disclosed).

**Coppersmith's method**
A lattice method that finds small roots of a polynomial modulo $N$ or modulo an unknown factor of $N$. It underlies attacks on stereotyped messages, partial key exposure and ROCA.
See [Chapter 13](13-Attacks-on-RSA.md#136-coppersmiths-method-small-roots-through-lattices).

**Correlation (linear)**
For a linear approximation, $c = 2p - 1$, twice the bias; correlations multiply along a trail.
See [Chapter 6](06-Linear-Cryptanalysis.md#63-bias-correlation-and-the-piling-up-lemma).

**Correlation attack**
An attack on a combination generator that recovers one LFSR at a time from the correlation between its output and the keystream (Siegenthaler).
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#84-siegenthalers-correlation-attack).

**Correlation immunity**
A Boolean function is correlation immune of order $m$ if its output is independent of every set of $m$ inputs. It stops correlation attacks of that order.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#83-nonlinear-combiners-and-filters).

**Correlation power analysis**
A power analysis that correlates measured power with a model of an intermediate value, such as the Hamming weight of an S-box output, for each key guess.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#177-the-correlation-power-attack).

**Crib**
A piece of plaintext the attacker guesses, such as a routine phrase, used to find the key.
See [Chapter 3](03-Machines-and-the-War.md#34-cribs-menus-and-the-turing-welchman-bombe).

**CRIME**
A 2012 compression-oracle attack on TLS and SPDY that read cookies from compressed request headers.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#109-compression-oracles-crime-and-breach).

**CRT fault attack**
An attack on RSA signatures computed with the Chinese remainder theorem: one faulty signature reveals a prime factor by a gcd (the Bellcore attack).
See [Chapter 13](13-Attacks-on-RSA.md#1312-the-crt-fault-attack).

**Cryptanalysis**
The study of how to break cryptographic systems: recover keys or plaintexts, forge, or distinguish, without being given the key.
See [Chapter 1](01-What-Cryptanalysis-Is.md#11-the-problem).

**Cryptology ePrint Archive**
The IACR's preprint server, where most new cryptanalytic results appear first.
See [Chapter 1](01-What-Cryptanalysis-Is.md#19-how-breaks-are-published).

**Cryptopals**
A set of programming challenges, first published by Matasano Security in 2013, that teach breaking real cryptographic constructions.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#2011-how-to-become-a-cryptanalyst).

**Cube attack**
An attack that sums a cipher's output over all values of chosen input bits (a cube) to obtain simple equations (superpolys) in the key.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#813-cube-attacks-on-reduced-trivium).

**CVE**
Common Vulnerabilities and Exposures, a list of identifiers for known flaws begun by MITRE in 1999, such as CVE-2017-15361 for ROCA.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#203-how-breaks-are-disclosed).

**CVP (closest vector problem)**
Given a lattice and a target point, find the lattice vector closest to it.
See [Chapter 15](15-Lattices-as-a-Weapon.md#152-lattices-svp-and-cvp-in-brief).

## D

**Data complexity**
The number of plaintexts, ciphertexts or other samples an attack needs.
See [Chapter 1](01-What-Cryptanalysis-Is.md#14-the-three-costs).

**Debian OpenSSL bug**
A 2006 change to Debian's OpenSSL package that left the process ID as the only entropy in keys, so only 32,768 keys per type and size existed; found in 2008.
See [Chapter 18](18-Random-Numbers-Gone-Wrong.md#183-debian-2006-to-2008-a-seed-with-nothing-in-it).

**Decibans**
Turing's unit of evidence, a tenth of a ban (a factor of 10 in the odds), used to score Banburismus.
See [Chapter 3](03-Machines-and-the-War.md#313-going-deeper).

**Deep Crack**
The Electronic Frontier Foundation's \$250,000 DES key search machine of 1998, which found a key in 56 hours.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#43-the-price-of-a-key-search-1977-to-today).

**Difference distribution table (DDT)**
A table counting, for each input difference $a$ and output difference $b$, how many inputs $x$ of an S-box satisfy $S(x) \oplus S(x \oplus a) = b$.
See [Chapter 5](05-Differential-Cryptanalysis.md#52-differences-through-a-cipher).

**Differential**
An input difference and an output difference with the probability that one leads to the other, summed over all characteristics between them.
See [Chapter 5](05-Differential-Cryptanalysis.md#53-characteristics-and-differentials).

**Differential cryptanalysis**
Biham and Shamir's attack (1990) that follows how input differences propagate to output differences with useful probability, then guesses last-round key bits.
See [Chapter 5](05-Differential-Cryptanalysis.md#51-the-problem).

**Differential fault analysis**
An attack that compares correct and faulty outputs of a cipher to deduce key bits.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#172-the-attackers-recipe).

**Differential power analysis**
Kocher, Jaffe and Jun's 1999 attack that splits many power traces by a predicted key-dependent bit and averages each group; the difference reveals the right key guess.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#176-power-from-one-trace-to-differential-power-analysis).

**Differential uniformity**
The largest entry of an S-box's difference distribution table outside row 0; the smaller, the better.
See [Chapter 5](05-Differential-Cryptanalysis.md#52-differences-through-a-cipher).

**Differential-linear attack**
An attack that combines a short differential and a short linear approximation into one distinguisher.
See [Chapter 6](06-Linear-Cryptanalysis.md#612-differential-linear-attacks).

**Discrete logarithm problem**
Given $g$ and $h = g^x$ in a group, find $x$.
See [Chapter 12](12-Discrete-Logarithms.md#121-the-problem).

**Distinguished point**
A value with an easily recognized property (such as leading zero bits) used to end chains in trade-offs and parallel collision searches.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#47-hellmans-time-memory-trade-off).

**Distinguisher**
An algorithm that tells a cipher's output from random with useful advantage. It is the weakest kind of break and often the first step to key recovery.
See [Chapter 1](01-What-Cryptanalysis-Is.md#11-the-problem).

**Division property**
A generalization of integral properties that tracks which monomials can appear in a sum; it is searched with MILP and used for cube attacks.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#711-going-deeper).

**Dolev-Yao model**
The model of a protocol attacker who controls the network, reading, blocking, replaying and composing messages, but cannot break the cryptography.
See [Chapter 19](19-Protocol-Breaks.md#191-the-problem).

**Doom principle**
Moxie Marlinspike's rule that doing any cryptographic operation on a ciphertext before checking its authentication tag will eventually lead to doom.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#1010-the-doom-principle-and-encrypt-then-mac).

**Double delta**
Tutte's statistical method against the Lorenz cipher: adding consecutive characters cancels most of the key stream's motor-driven wheels and exposes the chi wheels.
See [Chapter 3](03-Machines-and-the-War.md#37-the-double-delta-and-colossus).

**Downgrade attack**
An attack that makes two parties agree on a weaker option, such as export-grade keys, than both support.
See [Chapter 19](19-Protocol-Breaks.md#1910-the-famous-cases-downgrades-and-shared-keys).

**DROWN**
A 2016 attack that used servers still supporting SSLv2 as Bleichenbacher oracles to decrypt TLS sessions under the same RSA key.
See [Chapter 13](13-Attacks-on-RSA.md#139-the-oracle-returns-robot-drown-and-marvin).

**Dual attack**
A lattice attack on LWE that finds short vectors in the dual lattice and uses them to distinguish samples from random, usually with a guess of part of the secret.
See [Chapter 15](15-Lattices-as-a-Weapon.md#1511-the-dual-attack-controversy).

**Dual_EC_DRBG**
A random bit generator standardized by NIST in 2006 whose constants allow whoever chose them to predict its output; withdrawn in 2014 after the Snowden documents.
See [Chapter 18](18-Random-Numbers-Gone-Wrong.md#181-the-problem).

## E

**E0**
The stream cipher of Bluetooth Classic, broken by conditional correlation attacks.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#812-bluetooths-e0-and-conditional-correlation).

**Electromagnetic analysis**
A side-channel attack that measures the electromagnetic field around a chip, often with a small probe placed over one part of it.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#178-electromagnetic-leakage).

**Elliptic curve method (ECM)**
Lenstra's factoring method, which works in the group of an elliptic curve modulo $n$ and finds a factor whose curve group order is smooth.
See [Chapter 11](11-Factoring.md#116-the-elliptic-curve-method).

**Embargo**
The period during which a fix is shared privately with a closed group before public disclosure.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#203-how-breaks-are-disclosed).

**Enigma**
The German rotor cipher machine of the Second World War, broken by Polish and then British codebreakers.
See [Chapter 3](03-Machines-and-the-War.md#32-enigma-as-a-product-of-permutations).

**Exhaustive key search**
Trying every key until one decrypts correctly; on average $2^{k-1}$ trials for a $k$-bit key.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#42-exhaustive-key-search).

**Exploit broker**
A company that buys working attacks on software and resells them, mostly to governments.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#207-the-economics-of-attacks).

## F

**Fast correlation attack**
A correlation attack that decodes the LFSR sequence from the keystream using parity checks, instead of guessing whole registers.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#85-fast-correlation-attacks).

**Fault attack**
An attack that disturbs a device (voltage, clock, laser, Rowhammer) so that it computes wrongly, and learns the key from the wrong results.
See [Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models).

**FEAL**
A fast Japanese block cipher of 1987 that was the first major victim of differential cryptanalysis.
See [Chapter 5](05-Differential-Cryptanalysis.md#55-feals-fall).

**Fermat's method**
A factoring method that writes $n = a^2 - b^2$; it is instant when the two primes are close together.
See [Chapter 11](11-Factoring.md#113-fermats-method-and-close-primes).

**Flame**
Espionage malware found in 2012 that spread through Windows Update using a certificate forged with a new MD5 chosen-prefix collision.
See [Chapter 9](09-Breaking-Hash-Functions.md#98-chosen-prefix-collisions-the-rogue-ca-and-flame).

**Flush+Reload**
A cache attack in which the attacker flushes a shared memory line, waits, and times a reload to see whether the victim touched it.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#174-cache-attacks-primeprobe-and-flushreload).

**FMS attack**
Fluhrer, Mantin and Shamir's 2001 attack recovering the RC4 key from the first output bytes when the IV is prepended to the key, as in WEP.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#89-the-wep-break-fms-klein-and-ptw).

**Forbidden attack**
Recovering GCM's authentication key from two messages encrypted with the same nonce, by finding a root of a polynomial over $\mathrm{GF}(2^{128})$.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#107-the-forbidden-attack-gcms-key-as-a-root).

**Forgery**
Producing a valid tag or signature on a message without the key.
See [Chapter 1](01-What-Cryptanalysis-Is.md#11-the-problem).

**Franklin-Reiter attack**
Recovering two RSA plaintexts that are related by a known polynomial and encrypted under the same small exponent, by a polynomial gcd.
See [Chapter 13](13-Attacks-on-RSA.md#134-related-messages-franklin-and-reiter).

**Frequency analysis**
Breaking a substitution cipher by matching the frequencies of ciphertext symbols with those of the language.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#22-counting-letters).

**Frey-Rück attack**
Using a pairing to move an elliptic curve discrete logarithm into a finite field, where index calculus applies; works when the embedding degree is small.
See [Chapter 12](12-Discrete-Logarithms.md#1211-weak-curves-mov-frey-ruck-and-anomalous-curves).

## G

**Gaussian heuristic**
The estimate that the shortest vector of a random lattice of dimension $n$ and volume $V$ has length about $\sqrt{n/(2\pi e)}\,V^{1/n}$.
See [Chapter 15](15-Lattices-as-a-Weapon.md#152-lattices-svp-and-cvp-in-brief).

**GeMSS**
A multivariate signature candidate in NIST's post-quantum process, based on HFEv-, broken by MinRank attacks.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#167-gemss-and-the-minrank-attacks).

**Generic attack**
An attack that works against any system of a given shape and size, such as exhaustive search or a birthday collision search; a break must beat it.
See [Chapter 1](01-What-Cryptanalysis-Is.md#14-the-three-costs).

**Gohr's distinguisher**
The 2019 neural-network distinguisher for round-reduced Speck32/64 that beat the best classical distinguisher on the output difference.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#206-machine-learning-in-cryptanalysis).

**Grover's algorithm**
A quantum search algorithm that finds a key among $N$ in about $\sqrt N$ steps; it halves the exponent of exhaustive search, at a large practical cost.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#411-the-generic-floor-and-what-grover-changes).

**Guess-and-determine attack**
An attack that guesses part of a cipher's state and derives the rest from the output.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#87-guess-and-determine-and-distinguishing-attacks).

## H

**Harvest now, decrypt later**
Recording encrypted traffic today to decrypt it once a quantum computer can break the key exchange.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#2010-quantum-timelines-and-harvest-now-decrypt-later).

**Herding attack**
An attack that commits to a hash value first and later finds a message with a chosen prefix that reaches it, using a diamond structure of collisions (the Nostradamus attack).
See [Chapter 9](09-Breaking-Hash-Functions.md#95-second-preimages-herding-and-nostradamus).

**Hidden number problem**
Recovering a secret from approximations of its multiples modulo a prime. Partial-nonce attacks on DSA and ECDSA are instances of it.
See [Chapter 15](15-Lattices-as-a-Weapon.md#158-the-hidden-number-problem).

**Hill climbing**
A search that changes a key a little at a time and keeps changes that improve a score, with restarts to escape local maxima.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#26-hill-climbing-a-substitution).

**Hybrid key exchange**
A key exchange that combines a classical scheme (such as X25519) and a post-quantum one (such as ML-KEM), so that it stays secure if either holds.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#2010-quantum-timelines-and-harvest-now-decrypt-later).

**Håstad's broadcast attack**
Recovering a message sent with RSA exponent $e$ to $e$ recipients, by the Chinese remainder theorem and an integer $e$-th root.
See [Chapter 13](13-Attacks-on-RSA.md#133-one-message-many-keys-hastads-broadcast-attack).

## I

**Impossible differential**
A differential with probability zero; keys that would make it happen are wrong and can be discarded.
See [Chapter 5](05-Differential-Cryptanalysis.md#57-truncated-impossible-and-boomerang-differentials).

**Index calculus**
A discrete logarithm method that finds logarithms of small primes from smooth relations and then descends to the target.
See [Chapter 12](12-Discrete-Logarithms.md#126-index-calculus).

**Index of coincidence**
The probability that two letters taken at random from a text are equal; about 0.066 for English and 0.038 for random letters. Friedman used it to find a Vigenère key's length.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#25-friedmans-index-of-coincidence).

**Integral attack**
An attack that follows the sum of a set of texts through the cipher rather than pairs; the Square attack on AES is the first example.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#72-sets-instead-of-pairs-the-integral-property-of-aes).

**Interpolation attack**
An attack that treats a cipher as a low-degree polynomial and recovers it from enough known plaintexts.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#74-interpolation-when-the-cipher-is-a-small-polynomial).

**Invalid-curve attack**
Sending points that are not on the victim's curve so that its computation happens on a weaker curve that leaks the key piece by piece.
See [Chapter 12](12-Discrete-Logarithms.md#129-small-subgroups-and-invalid-curves).

**Isogeny**
A map between elliptic curves that preserves the group structure. SIDH, SIKE, CSIDH and SQIsign build on the difficulty of finding them.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#164-sike-what-the-key-exchange-gave-away).

## J

**JN-25**
The main Japanese naval code of the Second World War, an enciphered code broken by depth and check-digit analysis before Midway.
See [Chapter 3](03-Machines-and-the-War.md#39-jn-25-and-midway).

**Joux multicollision**
Joux's 2004 observation that $2^t$ messages with the same Merkle-Damgård hash cost only $t$ times one collision.
See [Chapter 9](09-Breaking-Hash-Functions.md#94-multicollisions).

## K

**Kangaroo method**
Pollard's method for a discrete logarithm known to lie in an interval of width $w$, in about $2\sqrt w$ steps.
See [Chapter 12](12-Discrete-Logarithms.md#124-the-kangaroo-logarithms-in-an-interval).

**Kasiski examination**
Finding the length of a Vigenère key from the distances between repeated strings in the ciphertext.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#24-kasiskis-repeats).

**Kerckhoffs's principle**
A system should stay secure when everything except the key is known to the enemy.
See [Chapter 1](01-What-Cryptanalysis-Is.md#12-kerckhoffs-from-the-attackers-side).

**Key recovery**
An attack that finds the secret key.
See [Chapter 1](01-What-Cryptanalysis-Is.md#11-the-problem).

**Key schedule**
The algorithm that turns a cipher's key into round keys. Weak key schedules enable related-key and slide attacks.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#77-related-key-attacks-on-aes-192-and-aes-256).

**Known-plaintext attack**
An attack that uses plaintexts and their ciphertexts, not chosen by the attacker.
See [Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models).

**KRACK**
Key reinstallation attacks on WPA2 (2017), which made devices reinstall a key and reuse nonces.
See [Chapter 19](19-Protocol-Breaks.md#1911-the-famous-cases-beyond-tls).

**KyberSlash**
A 2024 timing leak in several Kyber (ML-KEM) implementations, from a division whose time depended on secret data.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#169-implementations-side-channels-and-faults-on-ml-kem).

## L

**LadderLeak**
A 2020 attack that recovered ECDSA keys in OpenSSL from less than one bit of nonce leaked per signature.
See [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md#147-leaks-in-the-wild-minerva-tpm-fail-and-ladderleak).

**Lagarias-Odlyzko attack**
A lattice attack that solves low-density knapsack (subset sum) problems as a shortest vector problem.
See [Chapter 15](15-Lattices-as-a-Weapon.md#156-the-lagarias-odlyzko-attack-subset-sum-as-a-short-vector).

**Last-round attack**
Guessing the key bits of a cipher's last round, partly decrypting, and counting how often a differential or linear property holds; the right guess stands out.
See [Chapter 5](05-Differential-Cryptanalysis.md#54-the-last-round-attack).

**Lattice**
The set of all integer combinations of a set of linearly independent vectors.
See [Chapter 15](15-Lattices-as-a-Weapon.md#152-lattices-svp-and-cvp-in-brief).

**Lattice estimator**
Software that computes the cost of every known attack on LWE-type problems for given parameters; begun by Albrecht, Player and Scott in 2015.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#205-automated-tools).

**Length extension**
For a Merkle-Damgård hash, computing $H(m \parallel \text{pad} \parallel s)$ from $H(m)$ without knowing $m$.
See [Chapter 9](09-Breaking-Hash-Functions.md#93-length-extension).

**LFSR (linear feedback shift register)**
A register that shifts each step and feeds back a linear combination (XOR) of its bits; a common building block of stream ciphers.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#82-linear-complexity-why-a-bare-lfsr-is-useless).

**Linear approximation**
A relation between parity bits of a cipher's plaintext, ciphertext and key that holds with probability different from one half.
See [Chapter 6](06-Linear-Cryptanalysis.md#62-linear-approximations-of-an-s-box).

**Linear complexity**
The length of the shortest LFSR that produces a sequence.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#82-linear-complexity-why-a-bare-lfsr-is-useless).

**Linear cryptanalysis**
Matsui's attack (1993) that uses biased linear approximations of a cipher to recover key bits from known plaintexts.
See [Chapter 6](06-Linear-Cryptanalysis.md#61-the-problem).

**Linear hull**
The set of all linear trails with the same input and output masks; the correlation of an approximation is a signed sum over its hull.
See [Chapter 6](06-Linear-Cryptanalysis.md#69-linear-hulls).

**LLL**
The Lenstra-Lenstra-Lovász lattice reduction algorithm of 1982, which finds a short vector in polynomial time.
See [Chapter 15](15-Lattices-as-a-Weapon.md#153-what-lll-and-bkz-deliver).

**Logjam**
A 2015 attack that downgraded TLS to 512-bit export Diffie-Hellman and solved discrete logarithms in those groups using precomputation.
See [Chapter 12](12-Discrete-Logarithms.md#128-logjam).

**Lowe's attack**
Gavin Lowe's 1995 man-in-the-middle attack on the Needham-Schroeder public-key protocol, found with a model checker.
See [Chapter 19](19-Protocol-Breaks.md#194-finding-an-attack-by-hand-lowe-and-needham-schroeder).

**Lucky Thirteen**
A 2013 timing attack on TLS's CBC mode that read plaintext from small differences in MAC computation time.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#104-lucky-thirteen-an-oracle-made-of-time).

## M

**Machine learning cryptanalysis**
The use of trained models, mostly neural networks, to build distinguishers or to analyze side-channel traces.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#206-machine-learning-in-cryptanalysis).

**Malleability**
The property that a valid signature or ciphertext can be changed into another valid one without the key, as $(r, s)$ to $(r, n - s)$ in ECDSA.
See [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md#149-signature-malleability).

**Manger's attack**
A chosen-ciphertext attack on RSA-OAEP that uses an oracle revealing whether the decrypted value's top byte is zero.
See [Chapter 13](13-Attacks-on-RSA.md#1311-mangers-attack-on-oaep).

**Margin**
See security margin.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#208-open-problems-aes-sha-2-and-sha-3).

**Markov cipher**
A cipher in which the probability of a round's differential does not depend on the input value, given a random round key; it justifies multiplying round probabilities.
See [Chapter 5](05-Differential-Cryptanalysis.md#53-characteristics-and-differentials).

**Matsui's Algorithm 1**
Linear cryptanalysis that reads one key parity bit from a full-cipher approximation.
See [Chapter 6](06-Linear-Cryptanalysis.md#65-matsuis-algorithm-1).

**Matsui's Algorithm 2**
Linear cryptanalysis that guesses outer-round key bits and ranks them by how strongly the approximation holds.
See [Chapter 6](06-Linear-Cryptanalysis.md#66-matsuis-algorithm-2).

**Meet-in-the-middle attack**
An attack that computes forward from the plaintext and backward from the ciphertext and matches in the middle, as against double encryption.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#46-meet-in-the-middle).

**Menu**
A diagram of the letters linked by a crib on Enigma, whose loops let the bombe test settings.
See [Chapter 3](03-Machines-and-the-War.md#34-cribs-menus-and-the-turing-welchman-bombe).

**Merkle-Hellman knapsack**
A 1978 public-key system based on subset sum, broken by Shamir in 1982 and by lattice attacks.
See [Chapter 15](15-Lattices-as-a-Weapon.md#154-the-knapsack-that-was-supposed-to-be-hard).

**Message modification**
Wang's technique for satisfying the conditions of a hash differential path in the early rounds by solving for message words.
See [Chapter 9](09-Breaking-Hash-Functions.md#96-the-differential-path-method).

**MILP model**
A mixed integer linear program describing how differences or masks pass through a cipher, solved to bound or find trails.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#205-automated-tools).

**Minerva**
A 2019 group of timing leaks of ECDSA nonce lengths in certified smart cards and libraries, exploited with lattices.
See [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md#147-leaks-in-the-wild-minerva-tpm-fail-and-ladderleak).

**MinRank**
The problem of finding a low-rank combination of given matrices; MinRank attacks broke GeMSS and helped break Rainbow.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#167-gemss-and-the-minrank-attacks).

**ML-KEM**
The lattice-based key encapsulation mechanism standardized in FIPS 203 (2024), from the Kyber submission.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#168-lattices-attacks-that-moved-the-parameters).

**Mosca's inequality**
If data must stay secret for $x$ years and migration takes $y$ years, it is at risk when a quantum computer arrives within $z < x + y$ years.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#2010-quantum-timelines-and-harvest-now-decrypt-later).

**MOV attack**
Menezes, Okamoto and Vanstone's 1993 attack that maps an elliptic curve discrete logarithm to a finite field with the Weil pairing.
See [Chapter 12](12-Discrete-Logarithms.md#1211-weak-curves-mov-frey-ruck-and-anomalous-curves).

**Multi-target attack**
An attack against many keys or hashes at once, which divides the cost per target by the number of targets.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#410-multi-target-attacks-and-why-128-became-256).

**Multidimensional linear cryptanalysis**
Using a whole linear space of approximations at once, which needs no assumption that they are independent.
See [Chapter 6](06-Linear-Cryptanalysis.md#610-many-approximations-at-once).

## N

**Needham-Schroeder public-key protocol**
A 1978 authentication protocol in which Lowe found a man-in-the-middle attack in 1995, fixed by adding an identity to one message.
See [Chapter 19](19-Protocol-Breaks.md#194-finding-an-attack-by-hand-lowe-and-needham-schroeder).

**Netscape seed bug**
The 1995 flaw in Netscape's SSL, whose random seed came from the time and process IDs and could be guessed in seconds.
See [Chapter 18](18-Random-Numbers-Gone-Wrong.md#182-netscape-1995-a-seed-you-could-guess).

**Neural distinguisher**
A neural network trained to tell a cipher's outputs from random.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#206-machine-learning-in-cryptanalysis).

**Nonce reuse**
Using the same nonce twice under one key. In CTR it gives a two-time pad; in GCM it leaks the authentication key; in DSA and ECDSA it leaks the signing key.
See [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md#142-one-nonce-two-signatures).

**Number field sieve**
The fastest known classical algorithm for factoring large integers and for discrete logarithms in large prime fields, in $L[1/3, 1.923]$.
See [Chapter 11](11-Factoring.md#119-the-number-field-sieve).

## O

**One-time pad reuse**
Using a pad's key material twice, so that the XOR of two ciphertexts is the XOR of two plaintexts; the cause of the Venona break.
See [Chapter 3](03-Machines-and-the-War.md#310-venona-the-one-time-pad-used-twice).

## P

**Padding oracle**
Any system that reveals whether a decrypted message had valid padding. It lets an attacker decrypt CBC ciphertexts byte by byte.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#102-the-padding-oracle-by-hand).

**Piling-up lemma**
For independent binary events with biases $\varepsilon_i$, the bias of their XOR is $2^{n-1}\prod \varepsilon_i$.
See [Chapter 6](06-Linear-Cryptanalysis.md#63-bias-correlation-and-the-piling-up-lemma).

**Playfair cipher**
A digraph substitution cipher on a 5 by 5 square, breakable from known plaintext.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#28-playfair-by-known-plaintext).

**Pohlig-Hellman algorithm**
Reduces a discrete logarithm in a group of composite order to logarithms in its prime-order subgroups.
See [Chapter 12](12-Discrete-Logarithms.md#125-pohlig-hellman-and-why-prime-order-matters).

**Pollard's p−1 method**
A factoring method that finds a prime $p$ when $p - 1$ is smooth.
See [Chapter 11](11-Factoring.md#115-smooth-numbers-and-pollards-p1).

**Pollard's rho**
A random-walk method with constant memory that finds collisions; used to factor (in about $\sqrt p$ steps) and to compute discrete logarithms (in about $\sqrt q$).
See [Chapter 11](11-Factoring.md#114-pollards-rho).

**POODLE**
A 2014 padding oracle attack on SSL 3.0, whose padding bytes were not checked.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#103-poodle-ssl-30s-loose-padding).

**Practical break**
An attack that can actually be run with available resources, such as SHAttered or the WEP key recovery.
See [Chapter 1](01-What-Cryptanalysis-Is.md#15-academic-and-practical-breaks).

**Precomputation**
Work done once before any target is seen, such as building rainbow tables or Logjam's sieving for a prime.
See [Chapter 1](01-What-Cryptanalysis-Is.md#14-the-three-costs).

**Preimage attack**
Finding an input with a given hash; the generic cost is $2^n$ for an $n$-bit hash.
See [Chapter 9](09-Breaking-Hash-Functions.md#92-generic-prices-on-a-short-hash).

**Primal attack**
A lattice attack on LWE that embeds the secret and error as an unusually short vector and finds it with BKZ.
See [Chapter 15](15-Lattices-as-a-Weapon.md#1510-how-estimators-set-post-quantum-parameters).

**Prime+Probe**
A cache attack in which the attacker fills cache sets with its own data and later times its accesses to see which sets the victim evicted.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#174-cache-attacks-primeprobe-and-flushreload).

**Provable security**
Security argued by a reduction from a hard problem. A proof covers only its model, and its tightness sets how much it says.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#209-open-problems-lattices-isogenies-and-codes).

**ProVerif**
Blanchet's automated protocol verifier (2001), which proves properties for unbounded sessions in the applied pi calculus or reports possible attacks.
See [Chapter 19](19-Protocol-Breaks.md#197-the-attacker-in-a-tool-proverif-and-tamarin).

**Purple**
The Japanese diplomatic cipher machine of 1939, reconstructed by William Friedman's team without ever seeing one.
See [Chapter 3](03-Machines-and-the-War.md#38-purple-and-the-american-codebreakers).

## Q

**Quadratic sieve**
Pomerance's factoring method that finds smooth values of $x^2 - n$ with a sieve and combines them into congruent squares.
See [Chapter 11](11-Factoring.md#117-congruent-squares-and-the-quadratic-sieve-by-hand).

## R

**Rainbow**
A multivariate signature finalist in NIST's post-quantum process, broken by Beullens in 2022 in about 53 hours on a laptop.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#166-rainbow-a-weekend-on-a-laptop).

**Rainbow table**
A time-memory trade-off table whose chains use a different reduction function in each column, which reduces merging.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#48-rainbow-tables).

**RC4**
A byte-oriented stream cipher of 1987 whose output and key schedule biases broke WEP and its use in TLS; banned in TLS by RFC 7465.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#88-rc4s-key-schedule-the-roos-biases).

**Reduced-round attack**
An attack on a version of a cipher or hash with fewer rounds than the full one; it measures the security margin.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#202-how-to-read-a-headline).

**Reduction**
A proof that turns any attacker on a scheme into a solver for a hard problem. Its loss is the factor by which the solver is slower or less successful.
See [Chapter 1](01-What-Cryptanalysis-Is.md#110-going-deeper).

**Reflection attack**
A protocol attack that sends a party's own message back to it, or to another session of it, so that it answers its own challenge.
See [Chapter 19](19-Protocol-Breaks.md#192-attacks-on-messages).

**Rejewski's theorem**
The result that the cycle structure of the products of Enigma's paired message-key permutations depends only on the rotor settings, not the plugboard.
See [Chapter 3](03-Machines-and-the-War.md#33-rejewskis-theorem-and-the-polish-break).

**Related-key attack**
An attack in which the attacker obtains encryptions under several keys with a known relation, such as a chosen difference.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#77-related-key-attacks-on-aes-192-and-aes-256).

**Right pair**
A pair of plaintexts that follows the characteristic an attacker is using.
See [Chapter 5](05-Differential-Cryptanalysis.md#53-characteristics-and-differentials).

**ROBOT**
The 2017 "Return of Bleichenbacher's Oracle Threat", finding padding oracles in TLS servers of many major vendors.
See [Chapter 13](13-Attacks-on-RSA.md#139-the-oracle-returns-robot-drown-and-marvin).

**ROCA**
A 2017 flaw in Infineon's RSA key generation that made primes of a special form, factorable by Coppersmith's method.
See [Chapter 18](18-Random-Numbers-Gone-Wrong.md#188-roca-primes-with-a-fingerprint).

**Rowhammer**
A hardware flaw in which repeated access to memory rows flips bits in neighboring rows; used for fault attacks across process boundaries.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#172-the-attackers-recipe).

**Rump session**
An evening of short, informal talks at a conference, where very new results are announced.
See [Chapter 1](01-What-Cryptanalysis-Is.md#19-how-breaks-are-published).

## S

**Salt**
A random value stored with a password hash so that one precomputed table cannot serve all users.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#48-rainbow-tables).

**SAT solver**
A program that decides whether a Boolean formula can be satisfied; used to search for trails and to solve small ciphers' equations.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#75-algebraic-attacks-the-cipher-as-equations).

**Second preimage attack**
Given an input, finding a different one with the same hash.
See [Chapter 9](09-Breaking-Hash-Functions.md#92-generic-prices-on-a-short-hash).

**Security margin**
The distance between the best attack and the full algorithm, usually counted in rounds not reached by any attack faster than the generic one.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#208-open-problems-aes-sha-2-and-sha-3).

**SHAttered**
The first SHA-1 collision, two different PDF files with the same SHA-1 hash, published in 2017 by CWI Amsterdam and Google.
See [Chapter 9](09-Breaking-Hash-Functions.md#99-sha-1).

**Side-channel attack**
An attack that uses measurements of an implementation, such as time, power, electromagnetic emissions or cache state, rather than only inputs and outputs.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#171-the-problem).

**Signal-to-noise ratio**
For a last-round differential attack, the ratio of right-key counts to wrong-key counts; it decides how much data an attack needs.
See [Chapter 5](05-Differential-Cryptanalysis.md#54-the-last-round-attack).

**SIKE**
Supersingular Isogeny Key Encapsulation, a NIST post-quantum candidate broken in 2022 by Castryck and Decru in about an hour on one core.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#165-sike-an-hour-on-one-core).

**Simulated annealing**
A search that, like hill climbing, changes the key a little at a time but sometimes accepts worse keys, less often as it goes on.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#212-going-deeper).

**Slide attack**
An attack on a cipher with identical rounds that finds pairs offset by one round; its cost does not depend on the number of rounds.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#76-slide-attacks-when-every-round-is-the-same).

**Small-subgroup attack**
Making a victim compute with an element of small order so that the result reveals the private key modulo that order.
See [Chapter 12](12-Discrete-Logarithms.md#129-small-subgroups-and-invalid-curves).

**Smooth number**
An integer whose prime factors are all below a bound. Most fast factoring and discrete logarithm methods search for smooth numbers.
See [Chapter 11](11-Factoring.md#115-smooth-numbers-and-pollards-p1).

**Speck**
A family of ARX lightweight block ciphers published by the NSA in 2013; reduced-round Speck32/64 is the standard target of neural cryptanalysis.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#206-machine-learning-in-cryptanalysis).

**Sponge**
A hash construction that absorbs input into part of a large permutation's state and squeezes output from it; SHA-3 and Ascon are sponges.
See [Chapter 9](09-Breaking-Hash-Functions.md#911-the-sponge-and-sha-3).

**Square attack**
The first integral attack, on the cipher Square and on reduced AES, using sets of 256 texts that take every value in one byte.
See [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md#73-the-square-attack-on-4-round-aes-and-beyond).

**Superpoly**
In a cube attack, the polynomial in the key that the sum over a cube equals.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#813-cube-attacks-on-reduced-trivium).

**SVP (shortest vector problem)**
Finding the shortest nonzero vector of a lattice.
See [Chapter 15](15-Lattices-as-a-Weapon.md#152-lattices-svp-and-cvp-in-brief).

**Sweet32**
A 2016 birthday attack on 64-bit block ciphers in CBC mode, recovering secrets after about 32 GB of traffic under one key.
See [Chapter 10](10-Attacks-on-Modes-and-MACs.md#108-sweet32-and-the-birthday-bound-in-modes).

## T

**T-tables**
Precomputed tables that implement AES rounds with table lookups; their secret-dependent indexes leak through the cache.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#175-aes-t-tables-the-index-leak).

**Tamarin**
A protocol prover developed from 2012 at ETH Zurich that uses multiset rewriting and handles Diffie-Hellman and stateful protocols.
See [Chapter 19](19-Protocol-Breaks.md#197-the-attacker-in-a-tool-proverif-and-tamarin).

**Tight reduction**
A reduction that loses little, so that the scheme's security is close to the problem's.
See [Chapter 1](01-What-Cryptanalysis-Is.md#110-going-deeper).

**Time-memory trade-off**
Hellman's method of precomputing chains of key guesses so that later searches take less time in exchange for stored memory.
See [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md#47-hellmans-time-memory-trade-off).

**Timing attack**
A side-channel attack that recovers secrets from how long operations take; Kocher's 1996 attack on modular exponentiation was the first.
See [Chapter 17](17-Side-Channels-the-Attackers-View.md#173-kochers-timing-attack).

**Torsion points**
Points of an elliptic curve whose multiples by a given integer are zero. SIDH published their images under the secret isogeny, which the SIKE break used.
See [Chapter 16](16-Breaking-Post-Quantum-Candidates.md#164-sike-what-the-key-exchange-gave-away).

**Trail**
See characteristic. For linear cryptanalysis, a choice of mask at every round.
See [Chapter 6](06-Linear-Cryptanalysis.md#64-a-linear-trail-through-the-toy-cipher).

**Triple handshake attack**
A 2014 attack on TLS that synchronized two sessions through a malicious server so that renegotiation and resumption authenticated the wrong peer.
See [Chapter 19](19-Protocol-Breaks.md#199-the-famous-cases-binding-failures-in-tls).

**Truncated differential**
A differential that predicts only part of the difference, such as which bytes are zero.
See [Chapter 5](05-Differential-Cryptanalysis.md#57-truncated-impossible-and-boomerang-differentials).

**Tutte's reconstruction**
William Tutte's 1942 reconstruction of the Lorenz cipher machine's logical structure from one key stream, without seeing the machine.
See [Chapter 3](03-Machines-and-the-War.md#36-lorenz-and-tuttes-reconstruction).

## U

**Unicity distance**
The amount of ciphertext at which only one key is likely to give sensible plaintext: $U = H(K)/D$.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#210-unicity-distance).

## V

**Venona**
The US and British project that read Soviet messages from the 1940s because one-time pad pages had been duplicated.
See [Chapter 3](03-Machines-and-the-War.md#310-venona-the-one-time-pad-used-twice).

**Vigenère cipher**
A polyalphabetic cipher that adds a repeating key word to the plaintext, broken by Kasiski's repeats and Friedman's index of coincidence.
See [Chapter 2](02-Breaking-Classical-Ciphers.md#24-kasiskis-repeats).

## W

**Wang's attack**
The 2004 to 2005 differential path attacks by Xiaoyun Wang and colleagues that found collisions in MD4, MD5 and SHA-0 and showed SHA-1 weaker than its bound.
See [Chapter 9](09-Breaking-Hash-Functions.md#97-how-md4-and-md5-were-broken).

**WEP**
Wired Equivalent Privacy, the first Wi-Fi encryption, which prepended a 24-bit IV to an RC4 key and fell to the FMS, Klein and PTW attacks.
See [Chapter 8](08-Attacks-on-Stream-Ciphers.md#89-the-wep-break-fms-klein-and-ptw).

**Wide trail strategy**
Daemen and Rijmen's design method that guarantees many active S-boxes in any trail by using linear layers of high branch number.
See [Chapter 5](05-Differential-Cryptanalysis.md#58-the-wide-trail-why-aes-resists).

**Wiener's attack**
Recovering an RSA private exponent smaller than about $N^{1/4}$ from the continued fraction of $e/N$.
See [Chapter 13](13-Attacks-on-RSA.md#135-wieners-attack-a-private-exponent-too-small).

## Z

**Zero-correlation attack**
An attack that uses linear approximations with correlation exactly zero, found by miss in the middle.
See [Chapter 6](06-Linear-Cryptanalysis.md#611-zero-correlation-attacks).

**Zero-sum distinguisher**
A set of inputs to a permutation whose outputs XOR to zero, found from low algebraic degree; it reaches all 24 rounds of Keccak-f at impractical cost.
See [Chapter 20](20-Where-Cryptanalysis-Goes.md#208-open-problems-aes-sha-2-and-sha-3).
