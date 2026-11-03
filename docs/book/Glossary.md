# Glossary

*Short definitions of the terms this book uses, from A to Z, each with a link to the chapter that teaches it.*

## A

**Advanced Encryption Standard (AES)**
The block cipher used almost everywhere today: 128-bit blocks, keys of 128, 192 or 256 bits, and 10, 12 or 14 rounds. It was designed by Joan Daemen and Vincent Rijmen under the name Rijndael and published by NIST as FIPS 197 in 2001.
See [Chapter 7](07-AES.md#72-the-plan-of-aes). Full details: [AES reference](../04-symmetric-ciphers/AES.md).

**AddRoundKey**
The AES step that XORs the 16-byte state with a round key. It is the only step that uses the key.
See [Chapter 7](07-AES.md#76-addroundkey-and-the-key-schedule).

**Advantage**
How much better than blind guessing an attacker does in a security game. In this book, for a guess-the-bit game, it is $2 \cdot \lvert \Pr[b' = b] - \tfrac{1}{2} \rvert$, a number from 0 (no better than a coin flip) to 1 (always right).
See [Chapter 17](17-Defining-Security.md#173-games-and-advantage).

**AEAD (authenticated encryption with associated data)**
An encryption interface that keeps a message secret and detects any change to it, and also protects extra data (the associated data, such as a packet header) that is sent in the clear. AES-GCM and ChaCha20-Poly1305 are the common examples.
See [Chapter 10](10-Message-Authentication.md#108-aead-authenticated-encryption-with-associated-data). Full details: [AEAD reference](../05-modes-aead/AEAD.md).

**AES-GCM-SIV**
An AEAD mode that stays secure, apart from revealing that two messages are equal, if a nonce is repeated. It is specified in RFC 8452.
See [Chapter 10](10-Message-Authentication.md#1010-surviving-nonce-misuse).

**Affine cipher**
A classical cipher that maps each letter number $x$ to $ax + b \bmod 26$. The multiplier $a$ must have $\gcd(a, 26) = 1$ so that decryption is possible.
See [Chapter 2](02-Classical-Ciphers.md#24-the-affine-cipher).

**Alice and Bob**
The usual names for two people who want to communicate securely. Eve is a passive eavesdropper, and Mallory is an active attacker who can change messages.
See [Chapter 1](01-What-Cryptography-Is-For.md#13-the-cast).

**Argon2**
A memory-hard password hashing function that won the Password Hashing Competition in 2015 and is specified in RFC 9106. Its Argon2id variant is the usual recommendation for storing passwords.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#117-argon2). Full details: [Argon2 reference](../08-kdf-password-hashing/Argon2.md).

**Associated data**
Data that an AEAD scheme authenticates but does not encrypt, such as a header or a sequence number. Changing it makes decryption fail.
See [Chapter 10](10-Message-Authentication.md#108-aead-authenticated-encryption-with-associated-data).

**Asymmetric cryptography**
Another name for public-key cryptography: each party has a key pair, one public and one private.
See [Chapter 1](01-What-Cryptography-Is-For.md#14-two-kinds-of-keys).

**Atbash**
An ancient Hebrew cipher that replaces each letter with its mirror in the alphabet (A with Z, B with Y, and so on). It has no key.
See [Chapter 2](02-Classical-Ciphers.md#23-shift-ciphers-caesar-and-atbash).

**Authenticated encryption**
Encryption that gives both confidentiality and integrity, so a changed ciphertext is rejected instead of decrypted.
See [Chapter 10](10-Message-Authentication.md#107-putting-encryption-and-a-mac-together).

**Authenticity**
The assurance that a message really comes from the party it claims to come from. It is one of the four jobs of cryptography.
See [Chapter 1](01-What-Cryptography-Is-For.md#12-four-jobs).

**Avalanche effect**
The property that changing one input bit changes about half of the output bits, in a pattern that looks random. Good block ciphers and hash functions have it.
See [Chapter 6](06-Block-Ciphers.md#62-confusion-and-diffusion).

## B

**bcrypt**
A password hashing function from 1999 by Niels Provos and David Mazières, built on the expensive key setup of the Blowfish cipher. A cost parameter sets how slow each guess is.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#115-bcrypt). Full details: [bcrypt reference](../08-kdf-password-hashing/bcrypt.md).

**BIKE**
A code-based key encapsulation mechanism built on quasi-cyclic codes. It was a fourth-round candidate in the NIST post-quantum process, where HQC was chosen instead.
See [Chapter 22](22-Hash-and-Code-Based.md#2210-hqc-and-bike-smaller-keys-from-structure).

**Birthday bound**
Among random values drawn from $N$ possibilities, a repeat is expected after about $\sqrt{N}$ draws. This is why an $n$-bit hash gives only about $n/2$ bits of collision resistance.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#44-the-birthday-bound) and [Chapter 9](09-Hash-Functions.md#93-the-birthday-bound).

**BLAKE2 and BLAKE3**
Fast hash functions descended from BLAKE, a SHA-3 finalist. BLAKE2 can also take a key and act as a MAC; BLAKE3 is built on a tree so it can use many cores.
See [Chapter 9](09-Hash-Functions.md#910-blake2-blake3-and-hashes-around-the-world). Full details: [BLAKE reference](../07-hash/BLAKE.md).

**Bleichenbacher attack**
Daniel Bleichenbacher's 1998 chosen-ciphertext attack on RSA with PKCS #1 v1.5 padding. A server that only says whether padding was correct leaks enough to decrypt a message.
See [Chapter 1](01-What-Cryptography-Is-For.md#16-how-attackers-come-at-you) and [Chapter 18](18-Side-Channels.md#188-error-messages-as-oracles).

**Block cipher**
A keyed permutation on fixed-size blocks: for each key it maps every $n$-bit block to a different $n$-bit block, and the key holder can reverse it. DES and AES are block ciphers.
See [Chapter 6](06-Block-Ciphers.md#61-the-problem).

**Block size**
The number of bits a block cipher processes at once. A 64-bit block wears out after about $2^{32}$ blocks under one key because of the birthday bound.
See [Chapter 6](06-Block-Ciphers.md#67-the-block-size-matters-too).

**Bootstrapping**
In fully homomorphic encryption, the step that evaluates the decryption circuit homomorphically to reduce the noise in a ciphertext, so that computation can continue.
See [Chapter 23](23-Advanced-Protocols.md#239-homomorphic-encryption).

**Brute force**
Trying every possible key until one works. A key of $n$ random bits takes $2^n$ trials at worst and $2^{n-1}$ on average.
See [Chapter 1](01-What-Cryptography-Is-For.md#17-how-strong-is-strong).

## C

**Cache attack**
A side-channel attack that learns secret data from which memory lines a victim loaded into a shared processor cache, measured through timing.
See [Chapter 18](18-Side-Channels.md#185-cache-attacks).

**Caesar cipher**
A cipher that shifts every letter by the same fixed amount (Caesar used 3). With only 25 useful keys, it falls to brute force.
See [Chapter 2](02-Classical-Ciphers.md#23-shift-ciphers-caesar-and-atbash).

**Carmichael number**
A composite number $n$ with $a^{n-1} \equiv 1 \pmod{n}$ for every $a$ coprime to $n$, so it fools the Fermat primality test. The smallest is 561.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#39-primality-testing).

**CBC (cipher block chaining)**
A mode of operation that XORs each plaintext block with the previous ciphertext block before encrypting it. It needs an unpredictable IV and padding.
See [Chapter 8](08-Modes-of-Operation.md#84-cbc-cipher-block-chaining). Full details: [Classic modes reference](../05-modes-aead/Classic-Modes.md).

**CBC-MAC**
A MAC that encrypts a message in CBC mode with a zero IV and keeps the last block. It is secure only for messages of one fixed length; CMAC fixes that.
See [Chapter 10](10-Message-Authentication.md#104-macs-from-a-block-cipher-cbc-mac-and-cmac).

**Certificate**
A signed statement that binds a public key to a name, issued by a certificate authority. On the web, certificates use the X.509 format.
See [Chapter 16](16-PKI-and-Key-Establishment.md). Full details: [X.509 reference](../formats/X.509.md).

**Certificate authority (CA)**
An organization trusted to check identities and sign certificates. Browsers and operating systems ship a list of root CAs they trust.
See [Chapter 16](16-PKI-and-Key-Establishment.md).

**Certificate Transparency**
A system of public, append-only logs of issued certificates, so that a wrongly issued certificate can be spotted. It is specified in RFC 6962 and uses Merkle trees.
See [Chapter 16](16-PKI-and-Key-Establishment.md).

**ChaCha20**
A stream cipher by Daniel J. Bernstein, a variant of Salsa20, built only from 32-bit additions, rotations and XORs. It is fast in software and naturally constant-time.
See [Chapter 5](05-Stream-Ciphers.md#57-chacha20-a-modern-stream-cipher). Full details: [ChaCha reference](../04-symmetric-ciphers/ChaCha.md).

**ChaCha20-Poly1305**
An AEAD scheme that encrypts with ChaCha20 and authenticates with Poly1305, specified in RFC 8439. It is one of the cipher suites of TLS 1.3.
See [Chapter 10](10-Message-Authentication.md#108-aead-authenticated-encryption-with-associated-data).

**Chinese remainder theorem (CRT)**
If $m$ and $n$ are coprime, then knowing $x \bmod m$ and $x \bmod n$ fixes $x \bmod mn$. RSA uses it to make decryption about four times faster.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#38-the-chinese-remainder-theorem).

**Chosen-ciphertext attack (CCA)**
An attack in which the attacker can get ciphertexts of its choice decrypted, or just learn whether decryption succeeded. IND-CCA security is the definition that rules it out.
See [Chapter 1](01-What-Cryptography-Is-For.md#16-how-attackers-come-at-you) and [Chapter 17](17-Defining-Security.md#175-chosen-ciphertext-security).

**Chosen-plaintext attack (CPA)**
An attack in which the attacker can get messages of its choice encrypted. Public-key encryption always allows it, since anyone can encrypt.
See [Chapter 1](01-What-Cryptography-Is-For.md#16-how-attackers-come-at-you).

**Chosen-prefix collision**
A collision attack in which the attacker picks two different starting prefixes and then finds suffixes that make the two whole messages hash the same. It was used against MD5 to forge certificates.
See [Chapter 9](09-Hash-Functions.md#98-how-md5-and-sha-1-fell).

**Cipher**
An algorithm for encryption and decryption.
See [Chapter 1](01-What-Cryptography-Is-For.md#11-the-problem).

**Ciphertext**
The scrambled form of a message after encryption.
See [Chapter 1](01-What-Cryptography-Is-For.md#11-the-problem).

**Ciphertext-only attack**
An attack in which the attacker has only intercepted ciphertexts. Frequency analysis of a substitution cipher is the classic example.
See [Chapter 1](01-What-Cryptography-Is-For.md#16-how-attackers-come-at-you).

**CMAC**
A MAC built from a block cipher, a fixed version of CBC-MAC that is safe for messages of any length. It is specified in NIST SP 800-38B.
See [Chapter 10](10-Message-Authentication.md#104-macs-from-a-block-cipher-cbc-mac-and-cmac). Full details: [Block cipher MACs reference](../06-mac/Block-Cipher-MACs.md).

**Code-based cryptography**
Public-key cryptography whose security rests on the hardness of decoding a random-looking error-correcting code. McEliece and HQC are examples.
See [Chapter 22](22-Hash-and-Code-Based.md#228-error-correcting-codes).

**Collision**
Two different inputs with the same hash output.
See [Chapter 9](09-Hash-Functions.md#92-what-a-hash-must-do).

**Collision resistance**
The property that nobody can feasibly find any collision. For an $n$-bit hash, the birthday attack finds one in about $2^{n/2}$ work.
See [Chapter 9](09-Hash-Functions.md#92-what-a-hash-must-do).

**Commitment scheme**
A way to fix a value now and reveal it later, like a sealed envelope. It must be hiding (the commitment reveals nothing) and binding (it cannot be opened to a different value).
See [Chapter 23](23-Advanced-Protocols.md#234-commitments).

**Confidentiality**
Keeping the content of a message secret from everyone except its intended readers.
See [Chapter 1](01-What-Cryptography-Is-For.md#12-four-jobs).

**Confusion and diffusion**
Claude Shannon's two design goals from 1949. Confusion makes the relation between key and ciphertext complex; diffusion spreads the effect of each plaintext bit over many ciphertext bits.
See [Chapter 6](06-Block-Ciphers.md#62-confusion-and-diffusion).

**Constant-time code**
Code whose running time, memory access pattern and branches do not depend on secret values, so that timing reveals nothing about them.
See [Chapter 18](18-Side-Channels.md#189-writing-constant-time-code).

**CRQC (cryptographically relevant quantum computer)**
A quantum computer large and reliable enough to break RSA or elliptic-curve cryptography with Shor's algorithm. None exists as of this writing.
See [Chapter 20](20-Quantum-Computers.md#208-how-big-a-machine).

**CSPRNG (cryptographically secure pseudorandom number generator)**
A generator whose output nobody can predict or tell apart from true randomness without knowing its seed. The operating system's generator is the one to use.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#49-where-random-numbers-come-from). Full details: [OS random number generators](../09-random/OS-RNG.md).

**CTR (counter mode)**
A mode of operation that encrypts a counter and XORs the result with the plaintext, turning a block cipher into a stream cipher. Each nonce and counter value must be used only once per key.
See [Chapter 8](08-Modes-of-Operation.md#85-ctr-a-block-cipher-as-a-stream-cipher).

## D

**Davies-Meyer**
A way to build a hash compression function from a block cipher: $h_i = E_{m_i}(h_{i-1}) \oplus h_{i-1}$, where the message block is used as the key. SHA-1 and SHA-2 use this pattern, with addition in place of the XOR.
See [Chapter 9](09-Hash-Functions.md#94-building-a-hash-merkle-damgard).

**Decryption**
Turning ciphertext back into plaintext with the right key.
See [Chapter 1](01-What-Cryptography-Is-For.md#11-the-problem).

**DES (Data Encryption Standard)**
The US standard block cipher from 1977 (FIPS 46): a 16-round Feistel network on 64-bit blocks with a 56-bit key. Its key is now far too short: public brute-force efforts found DES keys in 1997 and 1998.
See [Chapter 6](06-Block-Ciphers.md#64-des). Full details: [Retired ciphers](../04-symmetric-ciphers/Retired.md).

**Differential cryptanalysis**
An attack that studies how differences between pairs of plaintexts spread through a cipher's rounds, published by Eli Biham and Adi Shamir around 1990.
See [Chapter 6](06-Block-Ciphers.md#68-differential-cryptanalysis).

**Differential power analysis (DPA)**
A side-channel attack, published by Paul Kocher, Joshua Jaffe and Benjamin Jun in 1999, that recovers keys by statistics over many power traces of a device.
See [Chapter 18](18-Side-Channels.md#184-power-and-electromagnetic-analysis).

**Diffie-Hellman key exchange**
A method, published by Whitfield Diffie and Martin Hellman in 1976, by which two parties who share nothing agree on a secret over a public channel. Each sends $g^x$; both compute $g^{xy}$.
See [Chapter 12](12-Diffie-Hellman.md). Full details: [Diffie-Hellman reference](../01-key-exchange/Diffie-Hellman.md).

**Digital signature**
A value made with a private key that anyone can check with the matching public key. It proves who signed a message and that it has not changed, and gives non-repudiation.
See [Chapter 1](01-What-Cryptography-Is-For.md#12-four-jobs) and [Chapter 13](13-RSA.md).

**Discrete logarithm**
Given $g$ and $h = g^x$ in a group, the problem of finding $x$. Diffie-Hellman, DSA and elliptic-curve cryptography rely on it being hard.
See [Chapter 12](12-Diffie-Hellman.md).

**Double Ratchet**
The algorithm in the Signal protocol that derives a fresh key for every message, combining a Diffie-Hellman ratchet with a hash ratchet. It gives forward secrecy and recovery after a key is stolen.
See [Chapter 19](19-Protocols.md#196-signal-encryption-that-heals). Full details: [Signal reference](../protocols/Signal.md).

**DRBG (deterministic random bit generator)**
NIST's name for a cryptographic pseudorandom generator. SP 800-90A defines Hash_DRBG, HMAC_DRBG and CTR_DRBG.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#49-where-random-numbers-come-from). Full details: [NIST DRBG reference](../09-random/NIST-DRBG.md).

**DSA (Digital Signature Algorithm)**
A discrete-log signature scheme standardized by NIST in FIPS 186. Each signature needs a fresh secret nonce; a repeated or biased nonce reveals the private key.
See [Chapter 14](14-Discrete-Log-Systems.md). Full details: [DSA reference](../02-signatures/DSA.md).

**Dual_EC_DRBG**
An elliptic-curve random generator in NIST SP 800-90A that could hide a backdoor in its constants. NIST withdrew it after the 2013 Snowden documents.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#410-famous-failures).

## E

**ECB (electronic codebook)**
The simplest mode: each block is encrypted on its own. Equal plaintext blocks give equal ciphertext blocks, so patterns show through, as in the famous penguin picture.
See [Chapter 8](08-Modes-of-Operation.md#82-ecb-and-the-penguin).

**ECDH (elliptic-curve Diffie-Hellman)**
Diffie-Hellman on an elliptic-curve group. X25519 is the most widely used form.
See [Chapter 15](15-Elliptic-Curves.md). Full details: [ECDH reference](../01-key-exchange/ECDH.md).

**ECDSA**
The elliptic-curve version of DSA. Like DSA, it fails completely if a nonce is ever repeated, as in the 2010 break of Sony's PlayStation 3 signing key.
See [Chapter 15](15-Elliptic-Curves.md). Full details: [ECDSA reference](../02-signatures/ECDSA.md).

**EdDSA and Ed25519**
A Schnorr-style signature scheme on Edwards curves that derives its nonce from the key and message, so no random number is needed at signing. Ed25519 is its version on Curve25519.
See [Chapter 15](15-Elliptic-Curves.md). Full details: [EdDSA reference](../02-signatures/EdDSA.md).

**ElGamal**
Public-key encryption and signature schemes based on the discrete logarithm, published by Taher Elgamal in 1985. Encryption is randomized: the same message encrypts differently each time.
See [Chapter 14](14-Discrete-Log-Systems.md). Full details: [ElGamal reference](../03-public-key-encryption/ElGamal.md).

**Elliptic curve**
The set of points $(x, y)$ satisfying an equation such as $y^2 = x^3 + ax + b$, plus a point at infinity, with a rule for adding points. Over a finite field these points form a group in which discrete logs are hard.
See [Chapter 15](15-Elliptic-Curves.md).

**Encrypt-then-MAC**
Encrypting first and then computing a MAC over the ciphertext. It is the order that is secure in general; the receiver checks the MAC before decrypting anything.
See [Chapter 10](10-Message-Authentication.md#107-putting-encryption-and-a-mac-together).

**Encryption**
Turning plaintext into ciphertext with a key so that only someone with the right key can read it.
See [Chapter 1](01-What-Cryptography-Is-For.md#11-the-problem).

**Enigma**
The German rotor cipher machine of the Second World War. Polish and then British codebreakers broke it, using cribs, the machine's rule that no letter encrypts to itself, and electromechanical bombes.
See [Chapter 2](02-Classical-Ciphers.md#29-machines-enigma).

**Entropy**
A measure of uncertainty, in bits. A value chosen uniformly from $N$ possibilities has $\log_2 N$ bits of entropy.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#43-entropy-measuring-uncertainty).

**Euler's theorem**
If $\gcd(a, n) = 1$, then $a^{\varphi(n)} \equiv 1 \pmod{n}$. It is the reason RSA decryption works.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#37-fermats-little-theorem-and-eulers-theorem).

**Euler's totient function**
$\varphi(n)$, the count of numbers from 1 to $n$ that are coprime to $n$. For distinct primes $p$ and $q$, $\varphi(pq) = (p-1)(q-1)$.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#37-fermats-little-theorem-and-eulers-theorem).

**EUF-CMA**
Existential unforgeability under chosen-message attack: even after seeing tags or signatures on messages of its choice, the attacker cannot produce a valid one on any new message. It is the standard goal for MACs and signatures.
See [Chapter 17](17-Defining-Security.md#176-unforgeability).

**Exhaustive search**
Another name for brute force.
See [Chapter 1](01-What-Cryptography-Is-For.md#17-how-strong-is-strong).

**Extended Euclidean algorithm**
Euclid's algorithm run with bookkeeping so that it also finds $x$ and $y$ with $ax + by = \gcd(a, b)$. It is how modular inverses are computed.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#35-inverses-and-the-extended-euclid-algorithm).

## F

**Fault attack**
An attack that makes a device compute wrongly, by voltage glitches, lasers or Rowhammer, and learns the key from the faulty output. One faulty RSA-CRT signature can reveal a factor of the modulus.
See [Chapter 18](18-Side-Channels.md#187-fault-attacks).

**Feistel network**
A block cipher structure that splits the block into two halves and in each round XORs one half with a function of the other half and a round key. It can be decrypted even when the round function cannot be inverted. DES is a Feistel network.
See [Chapter 6](06-Block-Ciphers.md#63-two-ways-to-build-a-round).

**Fermat's little theorem**
If $p$ is prime and $p$ does not divide $a$, then $a^{p-1} \equiv 1 \pmod{p}$.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#37-fermats-little-theorem-and-eulers-theorem).

**Fiat-Shamir transform**
A way to turn an interactive proof into a non-interactive one, or a signature, by replacing the verifier's random challenge with a hash of the transcript. Schnorr signatures and ML-DSA are built this way.
See [Chapter 23](23-Advanced-Protocols.md#235-zero-knowledge-proofs) and [Chapter 21](21-Lattice-Cryptography.md#219-ml-dsa-fiat-shamir-with-aborts).

**Finite field**
A finite set with addition, subtraction, multiplication and division (except by zero). Examples are the integers modulo a prime $p$, $\mathbb{F}_p$, and the 256-element field $\mathrm{GF}(2^8)$ used by AES.
See [Chapter 7](07-AES.md#73-arithmetic-on-bytes-the-field-mathrmgf28).

**FN-DSA**
NIST's name for the Falcon lattice signature scheme, built on NTRU lattices. Its signatures are small, but signing needs careful floating-point Gaussian sampling.
See [Chapter 21](21-Lattice-Cryptography.md#2110-ntru-and-fn-dsa). Full details: [FN-DSA reference](../02-signatures/FN-DSA.md).

**Format-preserving encryption (FPE)**
Encryption whose output has the same format as its input, for example a 16-digit card number to another 16-digit number. FF1, specified in NIST SP 800-38G, is the standard example.
See [Chapter 8](08-Modes-of-Operation.md#89-fixed-formats-format-preserving-encryption). Full details: [Format-preserving reference](../05-modes-aead/Format-Preserving.md).

**Forward secrecy**
The property that stealing a long-term key later does not expose past sessions, because each session used temporary keys that were then deleted. Ephemeral Diffie-Hellman gives it.
See [Chapter 19](19-Protocols.md#191-the-problem).

**Frequency analysis**
Breaking a substitution cipher by matching how often each ciphertext letter appears with how often letters appear in the language. It was first described by al-Kindi in the ninth century.
See [Chapter 2](02-Classical-Ciphers.md#25-simple-substitution-and-frequency-analysis).

**Fully homomorphic encryption (FHE)**
Encryption that allows any computation, both additions and multiplications, on ciphertexts without decrypting them. Craig Gentry gave the first construction in 2009.
See [Chapter 23](23-Advanced-Protocols.md#239-homomorphic-encryption).

## G

**Galois/Counter Mode (GCM)**
An AEAD mode that encrypts with CTR mode and authenticates with GHASH, a polynomial MAC over $\mathrm{GF}(2^{128})$. AES-GCM is the most widely used AEAD; a repeated nonce breaks both its secrecy and its authentication.
See [Chapter 10](10-Message-Authentication.md#108-aead-authenticated-encryption-with-associated-data) and [Chapter 10](10-Message-Authentication.md#109-break-it-one-repeated-nonce).

**Game (security game)**
A precise definition of security written as a contest between a challenger and an attacker, with a stated winning condition. IND-CPA and EUF-CMA are games.
See [Chapter 17](17-Defining-Security.md#173-games-and-advantage).

**Garbled circuit**
Andrew Yao's technique for two-party computation: one party encrypts a Boolean circuit gate by gate, and the other evaluates it on encrypted inputs without learning the intermediate values.
See [Chapter 23](23-Advanced-Protocols.md#236-multi-party-computation).

**Generator**
An element $g$ of a group whose powers $g, g^2, g^3, \ldots$ run through the whole group (or a chosen subgroup).
See [Chapter 12](12-Diffie-Hellman.md).

**GHASH**
The universal hash in GCM: it treats the data as coefficients of a polynomial over $\mathrm{GF}(2^{128})$ and evaluates it at a secret point $H$.
See [Chapter 10](10-Message-Authentication.md#105-universal-hashing-wegman-carter-and-poly1305).

**Goppa code**
A family of error-correcting codes introduced by Valery Goppa in 1970, used by the McEliece cryptosystem. It has a fast decoder for whoever knows its hidden structure.
See [Chapter 22](22-Hash-and-Code-Based.md#229-mceliece-hiding-a-code).

**Greatest common divisor (gcd)**
The largest number that divides both of two integers. Euclid's algorithm computes it quickly.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#34-the-greatest-common-divisor-and-euclids-algorithm).

**Group**
A set with one operation that is associative, has an identity, and has an inverse for every element. Diffie-Hellman works in a group where discrete logs are hard.
See [Chapter 12](12-Diffie-Hellman.md).

**Grover's algorithm**
A quantum search algorithm that finds a marked item among $N$ in about $\sqrt{N}$ steps. Against a $k$-bit key it gives a square-root speedup at best, which is why 256-bit keys are advised for long-term secrets.
See [Chapter 20](20-Quantum-Computers.md#206-grovers-algorithm-search-in-a-square-root).

## H

**Harvest now, decrypt later**
Recording encrypted traffic today in the hope of decrypting it once a large quantum computer exists. It is the reason key exchange is moving to post-quantum algorithms first.
See [Chapter 20](20-Quantum-Computers.md#209-harvest-now-decrypt-later).

**Hash function**
A public function that maps input of any length to a short fixed-length output, the digest, in a way that is hard to invert or to collide. SHA-256 and SHA-3 are examples.
See [Chapter 9](09-Hash-Functions.md#91-the-problem-a-fingerprint-for-data).

**Hash-based signature**
A signature scheme whose security rests only on a hash function, such as Lamport, XMSS, LMS and SLH-DSA. They are considered safe against quantum computers.
See [Chapter 22](22-Hash-and-Code-Based.md#222-lamports-one-time-signature).

**HKDF**
A key derivation function built from HMAC, in two steps: extract (concentrate the input into a uniform key) and expand (stretch it into as many keys as needed). It is specified in RFC 5869 and used throughout TLS 1.3.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#1110-keys-from-strong-secrets-hkdf). Full details: [HKDF reference](../08-kdf-password-hashing/HKDF.md).

**HMAC**
A MAC built from a hash function: $\mathrm{HMAC}(K, m) = H((K \oplus \mathit{opad}) \,\Vert\, H((K \oplus \mathit{ipad}) \,\Vert\, m))$. It is safe even with Merkle-Damgård hashes that allow length extension.
See [Chapter 10](10-Message-Authentication.md#103-hmac). Full details: [HMAC reference](../06-mac/HMAC.md).

**Homomorphic encryption**
Encryption that allows computing on ciphertexts: combining encrypted values gives an encryption of the combined plaintexts. Paillier allows addition; fully homomorphic schemes allow anything.
See [Chapter 23](23-Advanced-Protocols.md#239-homomorphic-encryption).

**HQC**
A code-based key encapsulation mechanism that NIST selected in 2025 as a backup to ML-KEM, so that not every post-quantum key exchange relies on lattices.
See [Chapter 22](22-Hash-and-Code-Based.md#2210-hqc-and-bike-smaller-keys-from-structure).

**Hybrid key exchange**
Running a classical key exchange (such as X25519) and a post-quantum one (such as ML-KEM) together and combining both secrets, so the result is safe if either one holds.
See [Chapter 20](20-Quantum-Computers.md#2011-migrating-hybrids).

## I

**Ideal cipher model**
A proof model that treats a block cipher as a random permutation for each key, available to everyone as an oracle.
See [Chapter 17](17-Defining-Security.md#178-models-what-the-proof-assumes).

**IND-CCA**
Indistinguishability under chosen-ciphertext attack: the attacker cannot tell which of two messages was encrypted even with access to a decryption oracle (except on the challenge itself). It is the standard goal for public-key encryption and KEMs.
See [Chapter 17](17-Defining-Security.md#175-chosen-ciphertext-security).

**IND-CPA**
Indistinguishability under chosen-plaintext attack: given an encryption of one of two messages it picked, the attacker cannot tell which, even with an encryption oracle. Any deterministic scheme fails it.
See [Chapter 17](17-Defining-Security.md#173-games-and-advantage).

**Index of coincidence**
The probability that two letters picked at random from a text are the same. It is about 0.066 for English and about $1/26 \approx 0.038$ for random letters, which lets an analyst estimate a Vigenère key length.
See [Chapter 2](02-Classical-Ciphers.md#27-breaking-vigenere-kasiski-and-friedman).

**Information-theoretic security**
Security that holds against an attacker with unlimited computing power, as with the one-time pad.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#47-perfect-secrecy).

**Integrity**
The assurance that a message has not been changed. Encryption alone does not give it; a MAC or signature does.
See [Chapter 1](01-What-Cryptography-Is-For.md#12-four-jobs) and [Chapter 10](10-Message-Authentication.md#101-the-problem-encryption-is-not-integrity).

**IV (initialization vector)**
A per-message input to a mode of operation that makes the same plaintext encrypt differently each time. CBC needs it to be unpredictable; other modes only need it to be unique (a nonce).
See [Chapter 8](08-Modes-of-Operation.md#83-what-a-mode-must-achieve).

## K

**Kasiski examination**
A method for finding the key length of a Vigenère cipher by measuring the distances between repeated strings in the ciphertext. Friedrich Kasiski published it in 1863.
See [Chapter 2](02-Classical-Ciphers.md#27-breaking-vigenere-kasiski-and-friedman).

**KDF (key derivation function)**
A function that turns a secret, such as a shared Diffie-Hellman value or a master key, into one or more keys of the right length. HKDF is the common example; password-based KDFs are a separate, deliberately slow kind.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#1110-keys-from-strong-secrets-hkdf).

**KEM (key encapsulation mechanism)**
A public-key scheme whose only job is to set up a shared random key: encapsulation outputs a key and a ciphertext, and decapsulation with the private key recovers the key. ML-KEM is a KEM.
See [Chapter 21](21-Lattice-Cryptography.md#218-ml-kem) and [Chapter 16](16-PKI-and-Key-Establishment.md).

**Kerckhoffs's principle**
A cipher should stay secure even if everything about it except the key is public. Auguste Kerckhoffs stated it in 1883.
See [Chapter 1](01-What-Cryptography-Is-For.md#15-the-method-is-not-the-secret).

**Key**
The secret value that controls a cipher, MAC or signature. Security should depend on the key alone.
See [Chapter 1](01-What-Cryptography-Is-For.md#14-two-kinds-of-keys).

**Key commitment**
The property that a ciphertext can be decrypted successfully under only one key. AES-GCM and ChaCha20-Poly1305 do not have it.
See [Chapter 10](10-Message-Authentication.md#1010-surviving-nonce-misuse).

**Key exchange**
A protocol by which two parties agree on a shared secret key over an open channel.
See [Chapter 12](12-Diffie-Hellman.md) and [Chapter 16](16-PKI-and-Key-Establishment.md).

**Key schedule**
The part of a cipher that expands the main key into the round keys used by each round.
See [Chapter 6](06-Block-Ciphers.md#62-confusion-and-diffusion) and [Chapter 7](07-AES.md#76-addroundkey-and-the-key-schedule).

**Key stretching**
Making each password guess deliberately expensive, for example by iterating a hash many times, so that an attacker's guesses cost as much as the defender's single check.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#114-make-each-guess-slow-key-stretching-and-pbkdf2).

**Key wrap**
A deterministic authenticated encryption mode for encrypting keys with other keys, such as AES Key Wrap in RFC 3394 and NIST SP 800-38F.
See [Chapter 8](08-Modes-of-Operation.md#88-keys-aes-key-wrap). Full details: [Key wrap reference](../05-modes-aead/Key-Wrap.md).

**Keystream**
The long pseudorandom bit string a stream cipher produces from a key and nonce, XORed with the plaintext to encrypt it.
See [Chapter 5](05-Stream-Ciphers.md#52-the-idea-a-keystream-generator).

**KMAC**
A MAC built on the Keccak sponge (SHA-3), specified in NIST SP 800-185. Because a sponge does not allow length extension, it can simply hash the key followed by the message, with careful encoding.
See [Chapter 10](10-Message-Authentication.md#106-more-macs-kmac-keyed-blake2-and-siphash). Full details: [KMAC reference](../06-mac/KMAC.md).

**Known-plaintext attack**
An attack in which the attacker has some plaintexts together with their ciphertexts. Bletchley Park's cribs are the classic example.
See [Chapter 1](01-What-Cryptography-Is-For.md#16-how-attackers-come-at-you).

**KRACK**
The 2017 key reinstallation attacks on WPA2 by Mathy Vanhoef and Frank Piessens: replaying a handshake message made a device reuse a nonce with the same key.
See [Chapter 5](05-Stream-Ciphers.md#58-break-it-nonce-reuse-and-malleability) and [Chapter 19](19-Protocols.md#197-wi-fi-from-wep-to-wpa3).

## L

**Lamport signature**
A one-time signature by Leslie Lamport (1979) built from a hash function: the private key is pairs of random values, and signing reveals one value of each pair according to the bits of the message hash.
See [Chapter 22](22-Hash-and-Code-Based.md#222-lamports-one-time-signature).

**Lattice**
All integer combinations of a set of basis vectors: a regular grid of points in $n$-dimensional space. The same lattice has many bases, some good (short, nearly orthogonal) and some bad.
See [Chapter 21](21-Lattice-Cryptography.md#212-lattices).

**Lattice reduction**
Algorithms that turn a bad lattice basis into one with shorter, more orthogonal vectors. LLL (1982) runs in polynomial time but finds only approximately short vectors; BKZ trades more time for better results.
See [Chapter 21](21-Lattice-Cryptography.md#214-lattice-reduction-turning-bad-bases-into-good).

**Length-extension attack**
With a Merkle-Damgård hash such as SHA-256, knowing $H(m)$ and the length of $m$ is enough to compute the hash of $m$ followed by padding and any extra data. It breaks the naive MAC $H(K \,\Vert\, m)$.
See [Chapter 9](09-Hash-Functions.md#97-break-it-length-extension).

**LFSR (linear feedback shift register)**
A register that shifts one step at a time and feeds back an XOR of chosen bits. Its output is long and well balanced but linear, so it is easy to predict without a nonlinear part.
See [Chapter 5](05-Stream-Ciphers.md#53-linear-feedback-shift-registers).

**Linear cryptanalysis**
An attack that finds linear equations relating plaintext, ciphertext and key bits that hold slightly more or less than half the time. Mitsuru Matsui published it in 1993 and used it against DES.
See [Chapter 6](06-Block-Ciphers.md#69-linear-cryptanalysis).

**LMS and XMSS**
Stateful hash-based signature schemes that sign with many one-time keys joined by a Merkle tree. The signer must never reuse a one-time key, so it must keep its state safely.
See [Chapter 22](22-Hash-and-Code-Based.md#226-the-state-problem-lms-and-xmss). Full details: [Stateful hash signatures reference](../02-signatures/Stateful-Hash-Signatures.md).

**LWE (learning with errors)**
The problem of finding a secret vector $s$ from many noisy equations $b = A s + e \bmod q$, where $e$ is small random noise. Oded Regev introduced it in 2005, and it underlies ML-KEM and ML-DSA.
See [Chapter 21](21-Lattice-Cryptography.md#215-learning-with-errors-by-hand).

## M

**MAC (message authentication code)**
A short tag computed from a message and a shared secret key, letting the receiver check that the message came from someone with the key and was not changed.
See [Chapter 10](10-Message-Authentication.md#102-what-a-mac-is).

**MAC-then-encrypt**
Computing a MAC on the plaintext and encrypting both together, as SSL and TLS up to 1.2 did. It is not secure in general and led to padding oracle attacks such as Lucky Thirteen.
See [Chapter 10](10-Message-Authentication.md#107-putting-encryption-and-a-mac-together).

**Malleability**
The property that an attacker can change a ciphertext so that it decrypts to a related plaintext. Stream ciphers without a MAC are malleable: flipping a ciphertext bit flips the same plaintext bit.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#48-break-it-the-two-time-pad-and-malleability) and [Chapter 17](17-Defining-Security.md#175-chosen-ciphertext-security).

**Man-in-the-middle attack**
An active attacker who sits between two parties, relaying and changing messages while each side thinks it talks to the other. Unauthenticated Diffie-Hellman is open to it.
See [Chapter 12](12-Diffie-Hellman.md).

**Masking**
A side-channel defense that splits each secret value into random shares and computes on the shares, so that no single measurement depends on the secret.
See [Chapter 18](18-Side-Channels.md#184-power-and-electromagnetic-analysis).

**McEliece cryptosystem**
Robert McEliece's 1978 public-key scheme: the public key is a scrambled generator matrix of a Goppa code, and encryption adds random errors that only the key owner can remove. Its public keys are very large, but it has resisted attack for over 45 years.
See [Chapter 22](22-Hash-and-Code-Based.md#229-mceliece-hiding-a-code). Full details: [Code-based KEMs reference](../01-key-exchange/Code-Based-KEMs.md).

**MD5**
A 128-bit hash by Ron Rivest (1992). Practical collisions were found in 2004, and it must not be used where collisions matter.
See [Chapter 9](09-Hash-Functions.md#98-how-md5-and-sha-1-fell). Full details: [Retired hashes](../07-hash/Retired.md).

**Meet-in-the-middle attack**
An attack on double encryption that encrypts forward from the plaintext and decrypts backward from the ciphertext and looks for a match in the middle. It is why double DES gives almost no more security than single DES.
See [Chapter 6](06-Block-Ciphers.md#66-double-des-triple-des-and-the-meet-in-the-middle).

**Memory-hard function**
A function that needs a lot of memory to compute quickly, so that custom hardware gains little over an ordinary computer. scrypt and Argon2 are memory-hard password hashes.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#116-memory-hardness-and-scrypt).

**Merkle-Damgård construction**
A way to build a hash from a compression function: pad the message, split it into blocks, and feed each block with the running state into the compression function. MD5, SHA-1 and SHA-2 use it.
See [Chapter 9](09-Hash-Functions.md#94-building-a-hash-merkle-damgard).

**Merkle tree**
A binary tree of hashes in which each node is the hash of its two children. The root commits to all the leaves, and one leaf can be proved with only $\log_2 n$ hashes.
See [Chapter 22](22-Hash-and-Code-Based.md#224-merkle-trees-many-keys-one-public-key).

**Merkle's puzzles**
Ralph Merkle's early public key agreement: one side sends many puzzles, the other solves one at random, and an eavesdropper has to solve about all of them. It gives only a quadratic gap between honest work and attack work.
See [Chapter 12](12-Diffie-Hellman.md).

**Miller-Rabin test**
A fast probabilistic primality test. Each random base catches a composite with probability at least $3/4$, so $k$ rounds wrongly pass a composite with probability at most $4^{-k}$.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#39-primality-testing). Full details: [Miller-Rabin reference](../10-math-foundations/Miller-Rabin-Primality-Test.md).

**Min-entropy**
The entropy measure that counts only the attacker's best single guess: $-\log_2$ of the probability of the most likely value. It is the right measure for keys and passwords.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#43-entropy-measuring-uncertainty).

**MixColumns**
The AES step that multiplies each column of the state by a fixed matrix over $\mathrm{GF}(2^8)$, so that every input byte of a column affects every output byte.
See [Chapter 7](07-AES.md#75-shiftrows-and-mixcolumns).

**ML-DSA**
The lattice signature scheme standardized by NIST in FIPS 204 (formerly CRYSTALS-Dilithium), built with Fiat-Shamir with aborts over module lattices.
See [Chapter 21](21-Lattice-Cryptography.md#219-ml-dsa-fiat-shamir-with-aborts). Full details: [ML-DSA reference](../02-signatures/ML-DSA.md).

**ML-KEM**
The lattice key encapsulation mechanism standardized by NIST in FIPS 203 (formerly CRYSTALS-Kyber), based on module-LWE. It is now used in hybrid key exchange in TLS and SSH.
See [Chapter 21](21-Lattice-Cryptography.md#218-ml-kem). Full details: [ML-KEM reference](../01-key-exchange/ML-KEM.md).

**Mode of operation**
A recipe for using a block cipher on messages longer than one block, such as CBC, CTR or GCM.
See [Chapter 8](08-Modes-of-Operation.md#81-the-problem-one-block-to-many).

**Modular arithmetic**
Arithmetic with remainders: numbers are equal modulo $n$ when they differ by a multiple of $n$, written $a \equiv b \pmod{n}$.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#32-remainders-and-congruences).

**Modular inverse**
A number $a^{-1}$ with $a \cdot a^{-1} \equiv 1 \pmod{n}$. It exists exactly when $\gcd(a, n) = 1$.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#35-inverses-and-the-extended-euclid-algorithm).

**Module-LWE**
A form of LWE in which the entries are polynomials from a ring and the secret is a short vector of them. It sits between plain LWE and ring-LWE, and ML-KEM and ML-DSA use it.
See [Chapter 21](21-Lattice-Cryptography.md#217-rings-and-modules-small-and-fast).

**Montgomery ladder**
A way to compute $x^d$ (or a multiple of a curve point) that does the same operations for every bit of $d$, so its timing does not reveal the bits.
See [Chapter 18](18-Side-Channels.md#183-timing-in-exponentiation).

**Multi-party computation (MPC)**
Protocols that let several parties compute a function of their private inputs while learning nothing beyond the output.
See [Chapter 23](23-Advanced-Protocols.md#236-multi-party-computation).

## N

**Negligible**
In theory, a function that shrinks faster than one over any polynomial in the security parameter. In practice, a probability small enough to ignore, such as $2^{-128}$.
See [Chapter 17](17-Defining-Security.md#173-games-and-advantage).

**Nonce**
A "number used once": a public per-message value that must never repeat under the same key. CTR mode, GCM and ChaCha20 all need one.
See [Chapter 5](05-Stream-Ciphers.md#52-the-idea-a-keystream-generator) and [Chapter 8](08-Modes-of-Operation.md#83-what-a-mode-must-achieve).

**Nonce reuse**
Using the same nonce twice with the same key. In a stream cipher or CTR mode it reveals the XOR of the two plaintexts; in GCM it also lets an attacker forge messages.
See [Chapter 10](10-Message-Authentication.md#109-break-it-one-repeated-nonce).

**Nonce-misuse resistance**
The property that repeating a nonce reveals only whether two messages were equal and nothing more. SIV and AES-GCM-SIV have it.
See [Chapter 10](10-Message-Authentication.md#1010-surviving-nonce-misuse).

**Non-repudiation**
The property that a signer cannot later deny having signed. Digital signatures give it; MACs do not, because both sides hold the same key.
See [Chapter 1](01-What-Cryptography-Is-For.md#12-four-jobs).

**NTRU**
A lattice-based public-key system by Jeffrey Hoffstein, Jill Pipher and Joseph Silverman, presented in 1996 and published in 1998, working with polynomials. FN-DSA (Falcon) uses NTRU lattices.
See [Chapter 21](21-Lattice-Cryptography.md#2110-ntru-and-fn-dsa). Full details: [NTRU Prime reference](../01-key-exchange/NTRU-Prime.md).

## O

**OAEP (optimal asymmetric encryption padding)**
The randomized padding for RSA encryption by Mihir Bellare and Phillip Rogaway (1994), used to make RSA encryption secure against chosen-ciphertext attacks. It replaced PKCS #1 v1.5 padding for encryption.
See [Chapter 13](13-RSA.md). Full details: [RSA reference](../02-signatures/RSA.md).

**Oblivious PRF (OPRF)**
A protocol in which a client learns $F_k(x)$ for a server's key $k$ while the server learns nothing about $x$. It is used in password protocols such as OPAQUE and in private set intersection.
See [Chapter 23](23-Advanced-Protocols.md#237-oblivious-prfs).

**Oblivious transfer**
A protocol in which a sender has two messages and a receiver gets exactly one of its choice, without the sender learning which. It is a building block of multi-party computation.
See [Chapter 23](23-Advanced-Protocols.md#236-multi-party-computation).

**One-time pad**
Encryption by XORing the message with a truly random key as long as the message, used only once. It has perfect secrecy, but the key is as long as all the traffic.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#46-bits-xor-and-the-one-time-pad).

**One-way function**
A function that is easy to compute but hard to invert on random inputs. Hash functions are treated as one-way functions.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#111-the-problem-storing-passwords) and [Chapter 22](22-Hash-and-Code-Based.md#221-the-problem).

**Oracle**
In a security definition, a box the attacker may query, such as an encryption, decryption or signing oracle. In attacks, any system that answers questions about secret data, such as a server that reports padding errors.
See [Chapter 17](17-Defining-Security.md#173-games-and-advantage).

## P

**Padding**
Extra bytes added to bring a message to a whole number of blocks. PKCS#7 padding adds $n$ bytes each of value $n$.
See [Chapter 8](08-Modes-of-Operation.md#84-cbc-cipher-block-chaining).

**Padding oracle attack**
An attack that decrypts CBC ciphertexts byte by byte using only whether the receiver accepts the padding. Serge Vaudenay described it in 2002; POODLE and Lucky Thirteen are later forms.
See [Chapter 8](08-Modes-of-Operation.md#86-break-it-changing-and-reading-cbc-without-the-key) and [Chapter 18](18-Side-Channels.md#188-error-messages-as-oracles).

**Paillier cryptosystem**
A public-key scheme by Pascal Paillier (1999) in which multiplying ciphertexts adds the plaintexts. It is additively homomorphic.
See [Chapter 23](23-Advanced-Protocols.md#239-homomorphic-encryption).

**PBKDF2**
A password-based key derivation function that applies HMAC many times, specified in RFC 8018. It is slow per guess but not memory-hard, so GPUs attack it well.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#114-make-each-guess-slow-key-stretching-and-pbkdf2). Full details: [PBKDF2 reference](../08-kdf-password-hashing/PBKDF2.md).

**Pepper**
A secret key mixed into password hashes and stored apart from the database, so that a stolen database alone is not enough to test guesses.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#118-code-it-a-password-store).

**Perfect secrecy**
Shannon's notion that the ciphertext gives no information at all about the plaintext: every plaintext is equally likely given the ciphertext as before. It requires a key at least as long as the message.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#47-perfect-secrecy).

**PKI (public key infrastructure)**
The certificates, certificate authorities, policies and software that bind public keys to identities at scale.
See [Chapter 16](16-PKI-and-Key-Establishment.md). Full details: [PKI reference](../protocols/PKI.md).

**Plaintext**
The readable message before encryption.
See [Chapter 1](01-What-Cryptography-Is-For.md#11-the-problem).

**Poly1305**
A one-time MAC by Daniel J. Bernstein that evaluates a polynomial modulo the prime $2^{130} - 5$. Its key must be used for only one message, so it is paired with a cipher that makes a fresh key each time.
See [Chapter 10](10-Message-Authentication.md#105-universal-hashing-wegman-carter-and-poly1305). Full details: [Universal hash MACs reference](../06-mac/Universal-Hash-MACs.md).

**Post-quantum cryptography**
Classical algorithms, run on ordinary computers, that are believed to resist attack by quantum computers, such as lattice, hash-based and code-based schemes.
See [Chapter 20](20-Quantum-Computers.md#2010-the-nist-competition).

**Power analysis**
A side-channel attack that reads secrets from a device's power use. Simple power analysis reads one trace; differential power analysis uses statistics over many.
See [Chapter 18](18-Side-Channels.md#184-power-and-electromagnetic-analysis).

**Preimage resistance**
The property that given a hash output $y$, nobody can feasibly find any $x$ with $H(x) = y$. For an $n$-bit hash, brute force takes about $2^n$ work.
See [Chapter 9](09-Hash-Functions.md#92-what-a-hash-must-do).

**PRF (pseudorandom function)**
A keyed function that, for a random secret key, cannot be told apart from a truly random function by an attacker who queries it. HMAC and AES are modeled as PRFs.
See [Chapter 17](17-Defining-Security.md#177-proofs-by-reduction).

**PRG (pseudorandom generator)**
A deterministic algorithm that stretches a short random seed into a longer output that no efficient test can tell apart from random. A stream cipher is a PRG.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#49-where-random-numbers-come-from) and [Chapter 5](05-Stream-Ciphers.md#52-the-idea-a-keystream-generator).

**Primality test**
An algorithm that decides whether a number is prime without factoring it, such as the Fermat test or Miller-Rabin.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#39-primality-testing).

**Prime number**
A whole number greater than 1 whose only divisors are 1 and itself.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#33-primes).

**Private key**
The half of a key pair that its owner keeps secret, used to decrypt or sign.
See [Chapter 1](01-What-Cryptography-Is-For.md#14-two-kinds-of-keys).

**PRP (pseudorandom permutation)**
A keyed permutation that cannot be told apart from a truly random permutation by an attacker who queries it. It is the formal goal for a block cipher.
See [Chapter 6](06-Block-Ciphers.md#611-going-deeper).

**Public key**
The half of a key pair that can be published, used to encrypt to its owner or to verify the owner's signatures.
See [Chapter 1](01-What-Cryptography-Is-For.md#14-two-kinds-of-keys).

**Public-key cryptography**
Cryptography with key pairs, where the encrypting or verifying key can be public. It lets strangers set up secure communication without meeting first.
See [Chapter 1](01-What-Cryptography-Is-For.md#14-two-kinds-of-keys) and [Chapter 12](12-Diffie-Hellman.md).

## Q

**Quantum random oracle model (QROM)**
A version of the random oracle model in which the attacker may query the hash on quantum superpositions of inputs. Post-quantum schemes are proved secure in it.
See [Chapter 17](17-Defining-Security.md#178-models-what-the-proof-assumes).

**Qubit**
The basic unit of a quantum computer. Unlike a bit, it can be in a superposition of 0 and 1, and measuring it gives 0 or 1 with probabilities set by its state.
See [Chapter 20](20-Quantum-Computers.md#202-qubits-plainly).

## R

**Rainbow (signature scheme)**
A multivariate signature scheme that was a NIST finalist. Ward Beullens broke its proposed parameters in 2022 with a key-recovery attack that ran over a weekend on a laptop.
See [Chapter 22](22-Hash-and-Code-Based.md#2211-break-it-sike-and-rainbow).

**Rainbow table**
A precomputed table of hash chains that trades storage for time when inverting unsalted password hashes. Salting makes it useless.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#112-first-try-hash-the-password).

**Random oracle model (ROM)**
A proof model, proposed by Mihir Bellare and Phillip Rogaway in 1993, that treats a hash function as a truly random function everyone can query. Proofs in it are useful but not a guarantee for a real hash.
See [Chapter 17](17-Defining-Security.md#178-models-what-the-proof-assumes).

**RC4**
A simple, fast stream cipher by Ron Rivest (1987). Its output has biases that broke WEP and later its use in TLS, and RFC 7465 banned it from TLS in 2015.
See [Chapter 5](05-Stream-Ciphers.md#55-rc4-fast-simple-and-biased).

**Reduction**
A proof that turns any successful attacker on a scheme into an algorithm that solves a problem assumed to be hard, so breaking the scheme is at least as hard as that problem.
See [Chapter 17](17-Defining-Security.md#177-proofs-by-reduction).

**Rejection sampling (aborts)**
In lattice signatures such as ML-DSA, throwing away a candidate signature and trying again whenever it might leak information about the secret key.
See [Chapter 21](21-Lattice-Cryptography.md#219-ml-dsa-fiat-shamir-with-aborts).

**Replay attack**
Sending a valid, captured message again later. Sequence numbers, timestamps or nonces stop it.
See [Chapter 1](01-What-Cryptography-Is-For.md#13-the-cast).

**Ring-LWE**
A form of LWE in which the entries are polynomials modulo a fixed polynomial, which makes keys much smaller and computation faster.
See [Chapter 21](21-Lattice-Cryptography.md#217-rings-and-modules-small-and-fast).

**Rotor machine**
A cipher machine, such as Enigma, whose wired rotating wheels change the substitution alphabet after each letter.
See [Chapter 2](02-Classical-Ciphers.md#29-machines-enigma).

**Round**
One repetition of the basic step of an iterated cipher or hash. Many simple rounds together give strength.
See [Chapter 6](06-Block-Ciphers.md#63-two-ways-to-build-a-round).

**Round key**
The key used in one round of a cipher, made from the main key by the key schedule.
See [Chapter 6](06-Block-Ciphers.md#62-confusion-and-diffusion).

**RSA**
The public-key system of Ron Rivest, Adi Shamir and Leonard Adleman (1977): encryption is $c = m^e \bmod n$ and decryption is $m = c^d \bmod n$, where $n$ is a product of two large primes. Its security rests on the hardness of factoring $n$.
See [Chapter 13](13-RSA.md). Full details: [RSA reference](../02-signatures/RSA.md).

## S

**S-box (substitution box)**
A small lookup table that replaces an input of a few bits with an output, chosen to be highly nonlinear. It is the main source of confusion in a block cipher.
See [Chapter 6](06-Block-Ciphers.md#62-confusion-and-diffusion) and [Chapter 7](07-AES.md#74-subbytes-the-s-box).

**Salt**
A random value, unique for each password and stored with its hash, that makes equal passwords hash differently and makes precomputed tables useless.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#113-salt).

**Schnorr signature**
A discrete-log signature scheme by Claus-Peter Schnorr: simple, provably secure in the random oracle model, and the basis of EdDSA and Bitcoin's Taproot signatures.
See [Chapter 14](14-Discrete-Log-Systems.md). Full details: [Schnorr reference](../02-signatures/Schnorr.md).

**scrypt**
A memory-hard password-based key derivation function by Colin Percival (2009), specified in RFC 7914.
See [Chapter 11](11-Passwords-and-Key-Derivation.md#116-memory-hardness-and-scrypt). Full details: [scrypt reference](../08-kdf-password-hashing/scrypt.md).

**Second-preimage resistance**
The property that, given an input $x$, nobody can feasibly find a different $x'$ with $H(x') = H(x)$.
See [Chapter 9](09-Hash-Functions.md#92-what-a-hash-must-do).

**Secret sharing**
Splitting a secret into shares so that any $t$ of $n$ shares rebuild it and fewer reveal nothing. Adi Shamir's 1979 scheme uses a random polynomial of degree $t - 1$.
See [Chapter 23](23-Advanced-Protocols.md#232-secret-sharing).

**Security level**
The approximate number of operations, written as a power of 2, that the best known attack needs. "128-bit security" means about $2^{128}$ operations.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#45-security-levels) and [Chapter 1](01-What-Cryptography-Is-For.md#17-how-strong-is-strong).

**Semantic security**
The notion, from Shafi Goldwasser and Silvio Micali, that whatever an efficient attacker can learn about a message from its ciphertext, it could learn without the ciphertext. It is equivalent to IND-CPA.
See [Chapter 17](17-Defining-Security.md#173-games-and-advantage).

**SHA-1**
A 160-bit hash from NSA, published by NIST in 1995. The first practical collision (SHAttered) was announced in 2017, and it is being retired.
See [Chapter 9](09-Hash-Functions.md#98-how-md5-and-sha-1-fell). Full details: [Retired hashes](../07-hash/Retired.md).

**SHA-2**
The hash family of SHA-224, SHA-256, SHA-384 and SHA-512, a Merkle-Damgård design published in FIPS 180. It remains secure and is the most widely used hash.
See [Chapter 9](09-Hash-Functions.md#95-inside-sha-256). Full details: [SHA-2 reference](../07-hash/SHA-2.md).

**SHA-3**
The hash standard based on Keccak, the winner of NIST's hash competition, published in FIPS 202 in 2015. It uses the sponge construction, so it has no length extension; SHAKE128 and SHAKE256 give output of any length.
See [Chapter 9](09-Hash-Functions.md#99-a-different-design-the-sponge-and-sha-3). Full details: [SHA-3 reference](../07-hash/SHA-3.md).

**Shamir secret sharing**
See **Secret sharing**.
See [Chapter 23](23-Advanced-Protocols.md#232-secret-sharing).

**Shift cipher**
A cipher that moves each letter a fixed number of places along the alphabet. The Caesar cipher is one.
See [Chapter 2](02-Classical-Ciphers.md#23-shift-ciphers-caesar-and-atbash).

**Shor's algorithm**
Peter Shor's 1994 quantum algorithm that factors integers and computes discrete logarithms in polynomial time by finding the period of a function. A large enough quantum computer would break RSA, Diffie-Hellman and elliptic-curve cryptography with it.
See [Chapter 20](20-Quantum-Computers.md#203-shors-algorithm-factoring-is-finding-a-period).

**ShiftRows**
The AES step that rotates row $i$ of the state left by $i$ bytes, so that bytes of one column move to different columns.
See [Chapter 7](07-AES.md#75-shiftrows-and-mixcolumns).

**Side channel**
Information leaked by how a computation runs, such as its time, power use, electromagnetic emissions, sound or error messages, rather than by its output.
See [Chapter 18](18-Side-Channels.md#181-the-problem).

**Signal protocol**
The end-to-end encryption protocol used by Signal, WhatsApp and others: X3DH (now PQXDH) to start a session and the Double Ratchet for every message.
See [Chapter 19](19-Protocols.md#196-signal-encryption-that-heals). Full details: [Signal reference](../protocols/Signal.md).

**SIKE**
A post-quantum KEM based on isogenies between supersingular elliptic curves. In 2022 Wouter Castryck and Thomas Decru broke it with a classical attack that took about an hour on one core for the smallest parameters.
See [Chapter 22](22-Hash-and-Code-Based.md#2211-break-it-sike-and-rainbow).

**SipHash**
A fast keyed hash by Jean-Philippe Aumasson and Daniel J. Bernstein (2012) for short inputs, designed to protect hash tables against flooding attacks.
See [Chapter 10](10-Message-Authentication.md#106-more-macs-kmac-keyed-blake2-and-siphash). Full details: [SipHash reference](../06-mac/SipHash.md).

**SIV (synthetic IV)**
A mode by Phillip Rogaway and Thomas Shrimpton that computes the IV as a MAC of the message, making encryption deterministic and nonce-misuse resistant.
See [Chapter 10](10-Message-Authentication.md#1010-surviving-nonce-misuse).

**SLH-DSA**
The stateless hash-based signature scheme standardized by NIST in FIPS 205 (formerly SPHINCS+). It needs no state but has large signatures.
See [Chapter 22](22-Hash-and-Code-Based.md#227-slh-dsa-dropping-the-state). Full details: [SLH-DSA reference](../02-signatures/SLH-DSA.md).

**Spectre and Meltdown**
Attacks published in 2018 that use a processor's speculative execution to read memory a program should not be able to see, leaking the result through the cache.
See [Chapter 18](18-Side-Channels.md#186-speculative-execution-spectre-and-meltdown).

**Sponge construction**
A hash design that absorbs input blocks into part of a large state, applies a fixed permutation, and then squeezes out as much output as needed. SHA-3 is a sponge.
See [Chapter 9](09-Hash-Functions.md#99-a-different-design-the-sponge-and-sha-3).

**SPN (substitution-permutation network)**
A block cipher structure in which each round substitutes small pieces through S-boxes, permutes or mixes the bits, and adds a round key. AES is an SPN.
See [Chapter 6](06-Block-Ciphers.md#63-two-ways-to-build-a-round).

**Square-and-multiply**
The fast way to compute $a^e \bmod n$: square for each bit of $e$ and multiply when the bit is 1, so it takes about $\log_2 e$ steps.
See [Chapter 3](03-The-Arithmetic-of-Secrets.md#36-fast-powers-square-and-multiply).

**SSH**
The Secure Shell protocol for remote login and file transfer, by Tatu Ylönen (1995). It authenticates servers by their host keys, usually trusted on first use.
See [Chapter 19](19-Protocols.md#195-ssh). Full details: [SSH reference](../protocols/SSH.md).

**Stream cipher**
A cipher that produces a keystream from a key and nonce and XORs it with the message. RC4 and ChaCha20 are stream ciphers.
See [Chapter 5](05-Stream-Ciphers.md#51-the-problem).

**Strong unforgeability (SUF-CMA)**
A stronger form of EUF-CMA in which the attacker also fails if it makes a new valid signature on a message that was already signed.
See [Chapter 17](17-Defining-Security.md#176-unforgeability).

**Substitution cipher**
A cipher that replaces each letter with another according to a fixed table, the key. It has $26! \approx 4 \times 10^{26}$ keys but falls to frequency analysis.
See [Chapter 2](02-Classical-Ciphers.md#25-simple-substitution-and-frequency-analysis).

**SubBytes**
The AES step that replaces every byte of the state through the S-box, built from inversion in $\mathrm{GF}(2^8)$ followed by an affine map.
See [Chapter 7](07-AES.md#74-subbytes-the-s-box).

**Sweet32**
The 2016 attack by Karthikeyan Bhargavan and Gaëtan Leurent that used birthday collisions to recover data from 64-bit block ciphers such as Triple DES and Blowfish in long-lived connections.
See [Chapter 6](06-Block-Ciphers.md#67-the-block-size-matters-too).

**Symmetric-key cryptography**
Cryptography in which the same secret key is used to encrypt and decrypt, or to make and check a MAC. AES and HMAC are symmetric.
See [Chapter 1](01-What-Cryptography-Is-For.md#14-two-kinds-of-keys).

**Syndrome decoding**
The problem of finding a low-weight error vector $e$ with $He = s$ for a given parity-check matrix $H$ and syndrome $s$. It is hard for random codes and underlies code-based cryptography.
See [Chapter 22](22-Hash-and-Code-Based.md#228-error-correcting-codes).

## T

**Tag**
The short output of a MAC that is sent with the message and checked by the receiver.
See [Chapter 10](10-Message-Authentication.md#102-what-a-mac-is).

**Threshold signature**
A scheme in which any $t$ of $n$ parties can produce one ordinary-looking signature together, while no smaller group can, and the full private key never exists in one place.
See [Chapter 23](23-Advanced-Protocols.md#233-threshold-signatures).

**Timing attack**
A side-channel attack that learns secrets from how long operations take. Paul Kocher showed in 1996 that it can recover RSA and Diffie-Hellman keys.
See [Chapter 18](18-Side-Channels.md#182-timing-the-simplest-leak).

**TLS (Transport Layer Security)**
The protocol that secures web traffic and much else, the successor to SSL. TLS 1.3 (RFC 8446, 2018) removed the old weak options and uses only ephemeral key exchange and AEAD.
See [Chapter 19](19-Protocols.md#192-tls-thirty-years-of-lessons) and [Chapter 19](19-Protocols.md#193-the-tls-13-handshake-step-by-step). Full details: [TLS 1.3 reference](../protocols/TLS-1.3.md).

**Transposition cipher**
A cipher that rearranges the letters of the message without changing them, such as the columnar transposition or the Spartan scytale.
See [Chapter 2](02-Classical-Ciphers.md#28-transposition).

**Trapdoor one-way function**
A function that is easy to compute and hard to invert, except for whoever knows a secret (the trapdoor). RSA is the classic example.
See [Chapter 12](12-Diffie-Hellman.md) and [Chapter 13](13-RSA.md).

**Triple DES (3DES)**
DES applied three times with two or three keys (encrypt, decrypt, encrypt). Because of meet-in-the-middle, three keys give about 112 bits of security; NIST disallowed it for encryption after 2023.
See [Chapter 6](06-Block-Ciphers.md#66-double-des-triple-des-and-the-meet-in-the-middle).

**Two-time pad**
A one-time pad key used twice. XORing the two ciphertexts cancels the key and gives the XOR of the two plaintexts, which can often be unraveled.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#48-break-it-the-two-time-pad-and-malleability).

## U

**Unicity distance**
Shannon's estimate of how much ciphertext is needed before only one key gives a meaningful plaintext. Beyond it, a ciphertext-only attack has a unique answer in principle.
See [Chapter 2](02-Classical-Ciphers.md#212-going-deeper).

**Universal hash function**
A keyed hash family in which any two distinct messages collide with small probability over a random key. Combined with one-time masking it gives a fast MAC, as in Poly1305 and GHASH.
See [Chapter 10](10-Message-Authentication.md#105-universal-hashing-wegman-carter-and-poly1305).

## V

**Verifiable random function (VRF)**
A function whose output looks random but comes with a proof, checkable with a public key, that it was computed correctly. Algorand and Cardano use VRFs to pick leaders and committees fairly.
See [Chapter 23](23-Advanced-Protocols.md#238-verifiable-random-functions).

**Vigenère cipher**
A polyalphabetic cipher that shifts each letter by an amount set by a repeating keyword. It was long called unbreakable until Kasiski and others showed how to find the key length.
See [Chapter 2](02-Classical-Ciphers.md#26-many-alphabets-the-vigenere-cipher).

## W

**Wegman-Carter MAC**
A MAC made by applying a universal hash to the message and adding a one-time pseudorandom mask. Mark Wegman and Larry Carter proposed it in 1981; Poly1305 and GCM follow it.
See [Chapter 10](10-Message-Authentication.md#105-universal-hashing-wegman-carter-and-poly1305).

**WEP (Wired Equivalent Privacy)**
The first Wi-Fi security protocol (1997). It used RC4 with short 24-bit IVs and a CRC instead of a MAC, and it was broken in several ways from 2001 on.
See [Chapter 5](05-Stream-Ciphers.md#56-how-rc4-failed-wep-and-tls) and [Chapter 19](19-Protocols.md#197-wi-fi-from-wep-to-wpa3).

**Winternitz signature**
A hash-based one-time signature that signs several bits at a time by walking hash chains, making signatures much smaller than Lamport's.
See [Chapter 22](22-Hash-and-Code-Based.md#223-winternitz-chains).

**WPA2 and WPA3**
The Wi-Fi security protocols that replaced WEP. WPA2 uses AES-CCMP with a four-way handshake; WPA3 adds the SAE password exchange so that captured handshakes cannot be cracked offline.
See [Chapter 19](19-Protocols.md#197-wi-fi-from-wep-to-wpa3). Full details: [Wi-Fi reference](../protocols/Wi-Fi.md).

## X

**X.509**
The standard format for public-key certificates, encoded in ASN.1 DER. It holds the subject, the public key, the issuer, validity dates, extensions and the issuer's signature.
See [Chapter 16](16-PKI-and-Key-Establishment.md). Full details: [X.509 reference](../formats/X.509.md).

**X25519**
Elliptic-curve Diffie-Hellman on Curve25519, by Daniel J. Bernstein, specified in RFC 7748. It is one of the most common key exchanges in TLS 1.3.
See [Chapter 15](15-Elliptic-Curves.md). Full details: [ECDH reference](../01-key-exchange/ECDH.md).

**XOR (exclusive or)**
The bit operation that outputs 1 when its two inputs differ, written $\oplus$. XORing with the same value twice gives back the original, which is why it is the core of the one-time pad and stream ciphers.
See [Chapter 4](04-Randomness-and-Perfect-Secrecy.md#46-bits-xor-and-the-one-time-pad).

**XTS**
The standard mode for disk encryption (IEEE 1619, NIST SP 800-38E), a tweakable block cipher mode in which each sector position encrypts differently and no extra space is needed.
See [Chapter 8](08-Modes-of-Operation.md#87-disks-xts). Full details: [Disk encryption reference](../05-modes-aead/Disk-Encryption.md).

## Z

**Zero-knowledge proof**
A proof that convinces a verifier that a statement is true while revealing nothing else, for example that the prover knows a discrete logarithm without revealing it. Schnorr's identification protocol is a simple example.
See [Chapter 23](23-Advanced-Protocols.md#235-zero-knowledge-proofs).

**zk-SNARK**
A zero-knowledge succinct non-interactive argument of knowledge: a very short proof that is fast to verify, such as Groth16 (2016). Zcash and zk-rollups use them.
See [Chapter 23](23-Advanced-Protocols.md#235-zero-knowledge-proofs).
