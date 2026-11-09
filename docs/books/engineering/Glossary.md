# Glossary

*Short definitions of the terms this book uses, from A to Z, each with a link to the chapter that teaches it.*

## A

**ACME**
The protocol (RFC 8555) by which clients prove control of a domain and obtain certificates automatically, as from Let's Encrypt. With public lifetimes falling to 47 days by 2029, renewal at about two thirds of the lifetime must be automated.
See [Chapter 12](12-Secrets-in-Operations.md#127-certificate-operations).

**ACME Renewal Information (ARI)**
The ACME extension (RFC 9773) that lets a CA tell each client when to renew, so a CA that must revoke many certificates can ask for early renewal.
See [Chapter 12](12-Secrets-in-Operations.md#127-certificate-operations) and [Chapter 18](18-Running-Cryptography-for-Years.md#187-when-the-authority-is-the-problem-lets-encrypt-2020-and-entrust-2024).

**AddressSanitizer (ASan)**
The 2012 sanitizer that surrounds every allocation with poisoned red zones and stops the program on any access to them, so Heartbleed's silent over-read becomes an immediate crash. MemorySanitizer, UndefinedBehaviorSanitizer and ThreadSanitizer catch other classes of bug.
See [Chapter 8](08-Hostile-Input.md#89-finding-the-bugs-fuzzing-and-sanitizers).

**AEAD (authenticated encryption with associated data)**
An encryption scheme, such as AES-GCM or ChaCha20-Poly1305, that encrypts and authenticates in one call with one key, also authenticates unencrypted associated data, and returns one error when the tag is wrong. It is the fix for ECB and for unauthenticated encryption.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#18-code-it-three-mistakes-with-the-cipher) and [Chapter 9](09-APIs-That-Resist-Misuse.md#94-nacl-libsodium-tink-and-go).

**AES-GCM-SIV**
The nonce-misuse-resistant AEAD of RFC 8452 (2019), which builds the SIV structure from GCM's fast parts.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#95-nonces-the-caller-never-sees).

**AES Key Wrap (AES-KW)**
The NIST key-wrap mode of RFC 3394 (2002), approved with its padded variant KWP (RFC 5649) in SP 800-38F. It is deterministic and starts its register at `A6A6A6A6A6A6A6A6`, which serves as a 64-bit integrity check on unwrap.
See [Chapter 10](10-The-Life-of-a-Key.md#105-key-wrap).

**age**
A small file-encryption tool and format designed in 2019 by Filippo Valsorda and Ben Cartwright-Cox, with explicit keys, no configuration and authenticated encryption always, to X25519 keys, SSH keys or a passphrase.
See [Chapter 15](15-The-Command-Line-Tools.md#158-age-and-keytool).

**Algorithm confusion (JWT)**
The attack in which a JWT verifier accepts the algorithm named in the token, so an RSA public key is used as an HMAC secret, or `"alg": "none"` is accepted as a valid unsigned token.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#97-versioned-envelopes-instead-of-negotiation).

**Algorithm deprecation**
The stages in which an algorithm dies: first attacks, warnings, deadlines set by those with leverage, removal, and a long tail. It usually takes six to fifteen years, as with MD5, SHA-1, Triple DES, RSA-1024 and TLS 1.0.
See [Chapter 18](18-Running-Cryptography-for-Years.md#184-how-algorithms-die).

**Algorithm negotiation**
Letting each message or connection say which algorithm it uses, from a list. It has a long record of attacks in which the attacker chose the algorithm, from TLS export ciphers (FREAK, Logjam) to JWT's `alg: none`.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles) and [Chapter 9](09-APIs-That-Resist-Misuse.md#97-versioned-envelopes-instead-of-negotiation).

**Application-level encryption**
Encrypting records or fields in the application before they reach the database, so SQL injection, administrators, replicas and backups see only ciphertext.
See [Chapter 14](14-Encrypting-Application-Data.md#142-where-to-encrypt).

**Argon2id**
The memory-hard variant of Argon2, the winner of the Password Hashing Competition, and the first choice for storing passwords. OWASP's floor is 19 MiB of memory, $t = 2$ iterations and $p = 1$.
See [Chapter 13](13-Passwords-on-the-Server.md#132-choosing-parameters-today).

**ASN.1 (Abstract Syntax Notation One)**
The notation, dating from the X.400 and X.500 standards and now ITU-T X.680, for describing data structures independently of machines. Its encoding rules are under every certificate and key file.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#31-the-problem).

**Associated data (AAD)**
Data an AEAD authenticates but does not encrypt. Naming the tenant, table, column and row in it binds a ciphertext to its place, stopping cut-and-paste but not rollback or deletion.
See [Chapter 14](14-Encrypting-Application-Data.md#144-associated-data-binding-a-ciphertext-to-its-place).

**Attestation**
A signed statement, rooted in a manufacturer, that a key was generated in a certain device or that a device booted in a measured state. It trusts the maker completely and says nothing about whether what was measured is good.
See [Chapter 11](11-Hardware-for-Keys.md#1112-attestation-and-its-limits).

**Authenticode**
Microsoft's code-signing format since 1996: a PKCS#7 signature embedded in a Windows executable, with a timestamp countersignature so it stays valid after the certificate expires.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#163-code-signing-on-the-platforms).

## B

**Backtracking resistance**
The property that someone who steals a generator's state cannot compute its earlier output. Every SP 800-90A DRBG has it because the update after each request is one-way.
See [Chapter 4](04-Randomness-in-Practice.md#46-hmac_drbg-as-a-component).

**Base64**
The RFC 4648 encoding that writes each 6 bits as one of 64 characters, with `=` padding to a whole 4-character block. A strict decoder rejects nonzero spare bits, wrong padding and characters outside the alphabet.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#23-hex-base64-and-base64url).

**base64url**
The variant of Base64 that replaces `+` and `/` with `-` and `_` so the output is safe in URLs and file names. JWT and the rest of JOSE use it with the padding left off.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#23-hex-base64-and-base64url).

**bcrypt**
The 1999 password hash based on Blowfish's key setup, with a cost parameter. It is acceptable where already deployed, at cost 10 or more, but reads only the first 72 bytes of the password.
See [Chapter 13](13-Passwords-on-the-Server.md#132-choosing-parameters-today).

**Bech32**
The 2017 address encoding of BIP 173: 32 lower-case characters, a human-readable part, and a 6-character BCH-code checksum guaranteed to detect any error that changes up to 4 characters.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#26-bech32-and-bech32m).

**Bech32m**
The 2020 repair of Bech32 (BIP 350), which changes only the checksum's final constant to close the `q`-insertion weakness. Version 0 segwit addresses use Bech32; version 1 and later must use Bech32m.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#26-bech32-and-bech32m).

**BER (Basic Encoding Rules)**
The X.690 encoding rules for ASN.1, which allow several encodings of one value, such as long or indefinite lengths. The choice is a problem wherever bytes are signed or hashed.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#33-ber-der-and-why-one-encoding).

**BitLocker bus sniffing**
Reading BitLocker's volume master key off the LPC or SPI bus as a discrete TPM returns it in TPM-only mode, shown in 2019 and in 2024 with a few-dollar board in 43 seconds. A PIN or parameter encryption fixes it.
See [Chapter 11](11-Hardware-for-Keys.md#119-sealing-quotes-and-bitlocker-on-the-bus).

**Bitslicing**
Storing one bit position of many values per machine word, so that an S-box becomes a Boolean circuit of whole-word ANDs and XORs with no table lookups. Eli Biham introduced it for DES in 1997.
See [Chapter 5](05-Constant-Time-Programming.md#56-computing-instead-of-looking-up-a-lookup-free-s-box).

**Blast-RADIUS**
The 2024 attack (CVE-2024-3596) that used an MD5 chosen-prefix collision to forge RADIUS responses, decades after MD5 was known to be broken.
See [Chapter 18](18-Running-Cryptography-for-Years.md#184-how-algorithms-die).

**Bleichenbacher's 2006 signature forgery**
A forgery, computed with an ordinary cube root, of RSA PKCS#1 v1.5 signatures with public exponent 3 against verifiers that stopped reading after the hash. It returned in 2014 as BERserk in Mozilla's NSS, hidden inside loosely parsed length bytes.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#310-the-signature-that-a-parser-forged).

**Blind index**
A keyed hash (such as a truncated HMAC) of a value, stored beside its ciphertext so the database can look rows up by exact value. It needs its own key and still leaks some frequency information.
See [Chapter 14](14-Encrypting-Application-Data.md#147-searching-encrypted-data-blind-indexes).

**Boolean masking**
Splitting each secret value into random shares that XOR to it, $(x \oplus m, m)$ with a fresh mask $m$ on every run, so no single intermediate value depends on the secret. Linear steps work share by share, and AES's S-box uses a masked table rebuilt for each encryption.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#73-boolean-masking-of-aess-first-round).

**Boring cryptography**
The principle of choosing the algorithm, parameters and library that the most careful people have already examined, and doing nothing clever with them. BoringSSL was named for the same idea.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles).

**Bounds check**
Checking a length or offset a parser reads against a fact, such as the bytes actually received or the size of the enclosing structure. It should be a wall (`p < end`), not a landing point (`p == end`), written so that it cannot overflow.
See [Chapter 8](08-Hostile-Input.md#84-cloudbleed-a-parser-that-stepped-past-the-end).

## C

**CA distrust**
Browsers' removal of trust from a certificate authority, as with Entrust in 2024, which leaves its customers months to move. Be able to replace every certificate within days and keep a second CA ready.
See [Chapter 18](18-Running-Cryptography-for-Years.md#187-when-the-authority-is-the-problem-lets-encrypt-2020-and-entrust-2024).

**CAA record**
A DNS record (RFC 8659) that names the CAs allowed to issue for a domain. Every CA must check it before issuing; a CT monitor's allowlist catches a CA that ignores it.
See [Chapter 18](18-Running-Cryptography-for-Years.md#183-watching-certificate-transparency-for-your-names).

**Canary record**
A made-up record with a value that appears nowhere else, sent through the real system and then searched for in every store, to find copies (logs, caches, analytics, backups) that encryption forgot.
See [Chapter 14](14-Encrypting-Application-Data.md#1410-the-forgotten-copies).

**Canonical encoding**
An encoding with exactly one accepted form for each value. The cheapest way to make a decoder canonical is to decode, re-encode and compare the result with the input.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#29-canonical-encoding-when-two-messages-are-one).

**CAVP and ACVP**
NIST's Cryptographic Algorithm Validation Program, which publishes test vectors for approved algorithms, and the Automated Cryptographic Validation Protocol through which labs have fetched and answered test cases since 2019.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#173-known-answer-tests-and-where-vectors-come-from).

**CBOM (cryptography bill of materials)**
An extension of an SBOM to cryptographic assets (algorithms, keys, certificates, protocols), recording where each occurs, with evidence. CycloneDX 1.6 (2024) and ECMA-424 define it.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#1710-crypto-inventories-and-agility).

**Certificate fingerprint**
A hash of a certificate's DER bytes, used to identify it exactly. Any different encoding of the same content gives a different fingerprint.
See [Chapter 15](15-The-Command-Line-Tools.md#153-reading-openssl-a-certificate-dump-against-its-bytes).

**Certificate pinning**
Telling a client to accept only certain public keys for a site. Web pinning (HPKP) was removed from browsers because sites locked out their own users; mobile apps may still pin, to at least two keys, with an expiry.
See [Chapter 12](12-Secrets-in-Operations.md#128-configuring-tls-on-a-server-you-run).

**Certificate Transparency (CT)**
The system of public, append-only logs into which CAs must submit every publicly trusted certificate, so misissued certificates become visible.
See [Chapter 18](18-Running-Cryptography-for-Years.md#183-watching-certificate-transparency-for-your-names).

**Checking a download**
Verifying a file against a signature by a key you already had, kept offline by the publisher. A checksum fetched from the same server proves nothing against that server's attacker.
See [Chapter 15](15-The-Command-Line-Tools.md#159-checking-a-download).

**Clamping**
Setting and clearing fixed bits of an X25519 scalar: the low three bits cleared to make it a multiple of the cofactor 8, and bit 255 cleared and bit 254 set so the ladder always runs the same number of steps.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#66-x25519-from-the-rfc).

**Client-side encryption**
Encryption done on the user's device, so the key never reaches the server, as in password managers and end-to-end messaging. The server becomes the adversary, so the scheme must cover metadata and authenticate everything.
See [Chapter 14](14-Encrypting-Application-Data.md#1412-client-side-and-end-to-end-encryption).

**Cloud KMS**
A cloud provider's key management service: non-exportable keys behind an API with quotas and audit logs, built for envelope encryption. The provider still sees metadata and handles plaintext at its front end.
See [Chapter 11](11-Hardware-for-Keys.md#117-cloud-kms-and-cloud-hsms) and [Chapter 14](14-Encrypting-Application-Data.md#143-envelope-encryption).

**Cloudbleed**
The 2017 Cloudflare bug in which an HTML parser generated by Ragel checked for the buffer's end with an equality test, stepped past it, and served fragments of other sites' requests, cookies and messages in pages.
See [Chapter 8](08-Hostile-Input.md#84-cloudbleed-a-parser-that-stepped-past-the-end).

**Code signing**
Signing software, as Authenticode, Apple's code signatures with notarization, and Android's APK schemes do, so a platform can check who released it and that it has not changed. A signature proves that a key signed some bytes, not that the code is good, current, built from its source or meant for you.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#162-what-a-signature-on-software-proves).

**Cofactor**
The number $h$ of points on an elliptic curve divided by the large prime order $\ell$. NIST curves have $h = 1$; Curve25519 and Ed25519's curve have $h = 8$, so each point has eight encodings that differ by a small-order point.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#69-cofactors-and-the-key-image-bug).

**Common Criteria**
The international security evaluation framework (ISO/IEC 15408), in which an assurance level sets how much design evidence the lab examines and the AVA_VAN component sets how hard it attacks. AVA_VAN.5, against attackers with high attack potential, is the evaluation that actually attacks smart card hardware.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#710-evaluation-tvla-isoiec-17825-common-criteria-and-fips-140-3).

**Complete addition formulas**
Point addition formulas that give the right answer for every pair of points on the curve, including doubling and the identity, with no special cases for code to forget.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#610-complete-addition-formulas).

**Consistency proof**
A set of hashes showing that a log's larger tree extends its smaller tree without changing any of the earlier entries.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#166-transparency-logs).

**Constant-time code**
Code whose control flow, memory addresses and operands of variable-time instructions do not depend on secrets. Lengths and other public values may still change its time.
See [Chapter 5](05-Constant-Time-Programming.md#52-the-leak-model).

**Constant-time comparison**
Comparing two secrets by OR-ing together the XOR of every byte pair and testing the result once at the end, so the time does not depend on where they first differ. Python's `hmac.compare_digest`, added after the 2009 Keyczar timing bug, does this in C.
See [Chapter 5](05-Constant-Time-Programming.md#53-comparing-secrets).

**Constant-time select and swap**
Choosing between two values, or exchanging them, with AND, OR and XOR against a mask (a word of all ones or all zeros made from a comparison) instead of an `if`. Ladders and correction steps rely on them.
See [Chapter 5](05-Constant-Time-Programming.md#54-masks-from-comparisons-select-and-swap) and [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#65-exponents-and-the-montgomery-ladder).

**Content Security Policy (CSP)**
A response header that decides which scripts may run in a page. A strict policy uses a per-response nonce or script hashes; an allowlist of hosts is weaker, as the polyfill.io takeover of 2024 showed.
See [Chapter 12](12-Secrets-in-Operations.md#129-headers-hsts-and-csp).

**Credential stuffing**
Trying username and password pairs leaked from other sites, each once, from thousands of addresses. Rate limits do not stop it; second factors, breach checks at login and site-wide signals do.
See [Chapter 13](13-Passwords-on-the-Server.md#139-online-guessing-rate-limits-lockouts-and-credential-stuffing).

**Crypto agility**
The ability to change algorithms at low cost: choose them in one place, label stored data with what protected it, and roll changes out behind flags with a way back.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#1710-crypto-inventories-and-agility) and [Chapter 18](18-Running-Cryptography-for-Years.md#189-crypto-agility-in-deployment).

**Crypto-shredding**
Erasing data by destroying the key that encrypted it, such as a per-user key. It works only as far as no copy of the key or the plaintext survives.
See [Chapter 14](14-Encrypting-Application-Data.md#1411-crypto-shredding-and-erasure).

**Cryptofuzz**
A differential fuzzer that runs the same operations on many cryptographic libraries with fuzzed inputs and compares the answers. It has found wrong results and memory errors in mature libraries nearly two hundred times.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#176-differential-fuzzing-cryptofuzz).

**Cryptographic engineering**
The work of turning correct algorithms into systems that stay safe in the hands of real people, on real machines, for years. Almost all real failures are in code, interfaces, keys and operations, not in the mathematics.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#11-the-problem).

**Cryptoperiod**
The time a key is authorized for use. SP 800-57 splits it into the originator-usage period, when the key may protect new data, and the recipient-usage period, when it may still process old data; it suggests up to two years of protecting use for most symmetric keys.
See [Chapter 10](10-The-Life-of-a-Key.md#102-the-life-cycle-and-the-cryptoperiod).

**CT monitor**
A service that reads every new certificate in CT logs, matches every Subject Alternative Name against your names, and alerts on an unexpected issuer or shape. Google's own monitoring caught Symantec's unrequested `google.com` precertificate this way in 2015.
See [Chapter 18](18-Running-Cryptography-for-Years.md#183-watching-certificate-transparency-for-your-names).

**ct-verif**
A 2016 tool that proves constant-time behavior on LLVM code by building a product program of two copies run on inputs that agree on public data, and proving they always branch and access memory alike.
See [Chapter 5](05-Constant-Time-Programming.md#512-checking-the-timing-and-proving-it).

**Cut-and-paste attack**
Copying a valid ciphertext from one row, field or tenant into another so the application decrypts and shows it to the wrong reader. Associated data that names the location stops it.
See [Chapter 14](14-Encrypting-Application-Data.md#144-associated-data-binding-a-ciphertext-to-its-place).

**CVE triage**
Deciding what a vulnerability in a dependency means for you, in order: do we have it, which version, is it reachable, by whom, what does it give, how do we fix it, and what did we learn.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#1711-triaging-a-cve-in-a-cryptographic-dependency).

## D

**Data-encryption key (DEK)**
A key that encrypts data, typically one per record, file or object, stored wrapped under a KEK right next to the data it encrypts. Also called a data key.
See [Chapter 10](10-The-Life-of-a-Key.md#104-hierarchies-keys-that-protect-keys) and [Chapter 14](14-Encrypting-Application-Data.md#143-envelope-encryption).

**Dead store elimination**
The compiler optimization that removes a write nobody reads afterward. It deletes a plain `memset` that wipes a key just before the buffer goes out of scope.
See [Chapter 8](08-Hostile-Input.md#85-wiping-secrets).

**Debian OpenSSL bug**
The 2006 to 2008 Debian change that reduced OpenSSL's random seed to the process ID, leaving 32,767 possible keys of each type; every key it had made had to be found and replaced.
See [Chapter 4](04-Randomness-in-Practice.md#42-how-randomness-fails-the-stories-in-brief) and [Chapter 18](18-Running-Cryptography-for-Years.md#186-when-keys-leak-by-the-thousand-debian-and-heartbleed).

**Decompression bomb**
A small compressed input that expands to an enormous output, such as a 42 kB zip that expands to 5.5 GB. Untrusted input must be decompressed with limits on output size, ratio and depth.
See [Chapter 8](08-Hostile-Input.md#811-decompression-bombs-and-resource-limits).

**Deprecation in stages**
Retiring an old API or format by making the new version the default for writing, then stopping writes of the old one, counting its reads, and removing the reader only when no data needs it.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#910-deprecating-an-api-without-breaking-users).

**DER (Distinguished Encoding Rules)**
BER with every choice removed: minimal lengths, minimal integers, `ff` for true, sorted sets, no indefinite lengths. Each value has exactly one encoding, which is the point when signatures cover bytes.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#33-ber-der-and-why-one-encoding).

**Deterministic encryption**
Encryption in which equal plaintexts give equal ciphertexts, so a database can index and compare them. It leaks equality and frequencies, which frequency analysis turns into values.
See [Chapter 14](14-Encrypting-Application-Data.md#146-deterministic-encryption-and-what-it-leaks).

**Differential testing**
Comparing an implementation's outputs with an independent implementation on generated inputs, at edge lengths and with random chunking of streamed input. It finds padding and buffering bugs that vectors never reach.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#174-differential-testing-sha-256-against-hashlib).

**DIT (Data Independent Timing)**
The Arm feature, from Armv8.4-A, that guarantees the timing of a listed set of instructions does not depend on their data while a processor state bit is set.
See [Chapter 5](05-Constant-Time-Programming.md#510-help-from-the-processor-arm-dit-and-intel-doit).

**DOIT (Data Operand Independent Timing)**
Intel's 2022 guidance listing instructions whose timing does not depend on their data operands; on newer processors the guarantee holds only when the operating system sets the DOITM bit.
See [Chapter 5](05-Constant-Time-Programming.md#510-help-from-the-processor-arm-dit-and-intel-doit).

**Domain separation**
Putting a label, such as the message type and version, into what is hashed, MACed or derived, so that a value made for one purpose cannot be replayed as another.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#29-canonical-encoding-when-two-messages-are-one) and [Chapter 10](10-The-Life-of-a-Key.md#106-one-key-one-purpose).

**DRBG (deterministic random bit generator)**
SP 800-90A's name for a cryptographic generator: a state machine around a small core (HMAC, a hash or a block cipher in counter mode), with instantiate, generate, reseed and uninstantiate functions and limits on use.
See [Chapter 4](04-Randomness-in-Practice.md#46-hmac_drbg-as-a-component).

**DROWN**
The 2016 attack that decrypted modern TLS sessions using SSL 2.0 as an oracle on any server sharing the same RSA key, often a mail server with the web server's certificate. About a third of HTTPS servers were exposed.
See [Chapter 10](10-The-Life-of-a-Key.md#106-one-key-one-purpose).

**Dual-running**
Running old and new algorithms side by side, such as two certificates, two signatures or a hybrid key exchange, so clients can move at their own pace.
See [Chapter 18](18-Running-Cryptography-for-Years.md#189-crypto-agility-in-deployment).

**dudect**
A statistical timing test that runs code on two classes of inputs, interleaved at random, and compares the distributions with Welch's $t$-statistic; $|t|$ above 4.5 signals a leak.
See [Chapter 5](05-Constant-Time-Programming.md#512-checking-the-timing-and-proving-it).

**Dynamic secrets**
Credentials that a secret store creates on demand for each client, such as a new database user with a random password, attached to a lease that deletes them when it ends.
See [Chapter 12](12-Secrets-in-Operations.md#125-secret-stores-and-short-lived-credentials).

## E

**ECB (Electronic Codebook)**
The mode that encrypts each block on its own, so equal plaintext blocks give equal ciphertext blocks and patterns show through. It is the first of the book's five classic mistakes; the fix is an AEAD.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#18-code-it-three-mistakes-with-the-cipher).

**ECDSA signature formats**
The two encodings of an ECDSA signature: a DER SEQUENCE of two INTEGERs, of variable length, and the raw fixed-length concatenation $r \Vert s$ used by JOSE and COSE. They must be converted by a tested function, never by fixed offsets.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#39-without-asn1-jwk-and-cose-keys).

**EFAIL**
The 2018 attacks on encrypted email in which gpg, after a failed integrity check, still wrote out the plaintext, and mail clients could be made to send it to the attacker.
See [Chapter 15](15-The-Command-Line-Tools.md#157-gpg-packets-defaults-and-trust).

**Encode and compare**
Verifying a signature by building the exact expected encoded block and comparing it byte for byte with what the signature gives, instead of parsing what came back. It beats even a strict parser.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#310-the-signature-that-a-parser-forged).

**Encrypt-then-MAC**
The composition that encrypts first and then computes a MAC over the ciphertext (and nonce), with the receiver verifying the MAC before decrypting. It is secure in general, and an AEAD does it for you in one call.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#19-code-it-two-mistakes-around-the-cipher).

**Encryption context**
Non-secret key-value pairs that a KMS binds to a data key's encryption, so the wrapped key can be unwrapped only with the same context. It is the KMS's form of associated data.
See [Chapter 14](14-Encrypting-Application-Data.md#143-envelope-encryption).

**Endianness**
The order in which a multi-byte integer's bytes are stored. Big-endian (network byte order) puts the most significant byte first; little-endian, used by x86 and almost all Arm processors, puts it last.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#22-integers-and-byte-order).

**Envelope encryption**
Encrypting data locally with a data key and storing that key wrapped under a key-encryption key that stays in a KMS; AWS KMS's `GenerateDataKey` returns the data key both in plaintext and wrapped. AWS KMS, Cloud KMS, the AWS Encryption SDK and Tink all work this way.
See [Chapter 14](14-Encrypting-Application-Data.md#143-envelope-encryption).

**EUCLEAK**
The 2024 attack by NinjaLab that took the ECDSA key out of a YubiKey 5 with an electromagnetic probe, because Infineon's library inverted the nonce with a variable-time extended Euclidean algorithm. The flaw had gone unnoticed for about fourteen years and some eighty top-level Common Criteria evaluations.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#71-the-problem) and [Chapter 11](11-Hardware-for-Keys.md#1111-security-keys-and-smart-cards).

**EVP_BytesToKey**
OpenSSL's old password-to-key function, which hashes the password once (with MD5 before OpenSSL 1.1.0, SHA-256 since), so a stolen file can be attacked at the speed of one hash per guess.
See [Chapter 15](15-The-Command-Line-Tools.md#154-openssl-enc-and-evp_bytestokey).

## F

**Fail closed**
To refuse whenever anything is in doubt: a check that cannot be completed counts as failed. Apple's goto fail is the textbook case of the opposite, an error path that returned "success".
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles).

**Fault injection**
Disturbing a computation with a voltage or clock glitch, a laser, an electromagnetic pulse or a particle, so a wrong output or a skipped check reveals the key.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#78-faults-what-a-defender-has-to-assume).

**Fernet**
A token format whose version byte `0x80` means exactly one set of algorithms: a timestamp, an IV, AES-128-CBC and an HMAC-SHA256 tag over everything before it.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#97-versioned-envelopes-instead-of-negotiation).

**Fiat-Crypto**
A tool that generates field arithmetic for elliptic curves, with a proof of correctness, from a description of the prime. Its code runs in BoringSSL and other libraries.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#177-formal-verification-in-production).

**FIPS 140-3**
The US and Canadian standard for cryptographic modules (2019), built on ISO/IEC 19790 and run through NIST's CMVP. Its four levels run from approved algorithms (Level 1) through tamper evidence and then tamper response with side-channel tests to a full envelope (Level 4); a certificate covers one version, one boundary and the approved mode only.
See [Chapter 11](11-Hardware-for-Keys.md#116-fips-140-3-and-its-four-levels) and [Chapter 17](17-Choosing-Testing-and-Verifying.md#179-fips-140-3-validation-in-practice).

**FIPS 140-3 validation**
The process of having a module tested by an accredited lab and certified by the CMVP. It takes a year or more and six figures, freezes the module's version, and brings traps such as fixes that are not yet validated.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#179-fips-140-3-validation-in-practice).

**Fork safety**
Making sure a child process does not reuse its parent's random generator state. The defenses are fork handlers, memory the kernel wipes in the child (`MADV_WIPEONFORK`), or keeping no user-space state at all.
See [Chapter 4](04-Randomness-in-Practice.md#45-copies-of-the-state-fork-snapshots-and-clones).

**Formal verification**
Proving with a machine-checked proof that code meets a specification. A proof covers the proved code; the specification, glue code, hardware model and caller remain trusted.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#177-formal-verification-in-production).

**Format-preserving encryption (FPE)**
Encryption that maps a string of digits to another of the same length and alphabet, nine digits in and nine out. FF1 is the approved mode; it is for fields whose format cannot change, on large domains.
See [Chapter 14](14-Encrypting-Application-Data.md#149-tokenization-and-format-preserving-encryption).

**Forward secrecy**
The property that recording a session and later stealing the server's long-term key does not reveal the session. TLS 1.3 suites all have it; for TLS 1.2 it means ECDHE key exchange only.
See [Chapter 12](12-Secrets-in-Operations.md#128-configuring-tls-on-a-server-you-run).

**Freeze attack**
Serving the same old, validly signed metadata forever, so a client never learns of a new version. Signed expiry times stop it.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#169-update-frameworks-tuf-and-uptane).

**Fuzz target**
The function a fuzzer calls with each input, such as `LLVMFuzzerTestOneInput(data, size)`; writing small, fast targets, one feature each, is most of the work. A target is only as good as the code it reaches.
See [Chapter 8](08-Hostile-Input.md#89-finding-the-bugs-fuzzing-and-sanitizers).

**Fuzzing**
Testing a program with large numbers of generated or mutated inputs to find those that crash it or misbehave. Coverage-guided fuzzers (AFL, libFuzzer) keep inputs that reach new code, and Google's OSS-Fuzz has run them on open-source projects continuously since 2016.
See [Chapter 8](08-Hostile-Input.md#89-finding-the-bugs-fuzzing-and-sanitizers).

## G

**getrandom()**
The Linux system call that returns random bytes from the kernel generator, waiting only once, at boot, until it is seeded. Its counterparts are `getentropy()` and `arc4random_buf()` on the BSDs and macOS, `BCryptGenRandom` or `ProcessPrng` on Windows, and `secrets` in Python; never write a fallback.
See [Chapter 4](04-Randomness-in-Practice.md#43-ask-the-operating-system).

**GoFetch**
The 2024 attack that used the data memory-dependent prefetcher of Apple M-series processors, which acts on values that look like pointers, to extract keys from constant-time code. On the M3, setting DIT disables the prefetcher.
See [Chapter 5](05-Constant-Time-Programming.md#510-help-from-the-processor-arm-dit-and-intel-doit).

**Good signature (gpg)**
gpg's message that a signature verified against some key in the keyring. It and exit status 0 do not mean the signer is the right person; pin the expected fingerprint.
See [Chapter 15](15-The-Command-Line-Tools.md#157-gpg-packets-defaults-and-trust).

## H

**HACL\***
A formally verified library of primitives from Project Everest, proved correct, memory-safe and secret-independent and compiled to readable C. Since Python 3.12, CPython's own SHA-2 code is generated from it.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#177-formal-verification-in-production).

**Hamming weight and distance models**
The two usual leakage models: power proportional to the number of 1 bits in the value handled (Hamming weight, for precharged buses and memories), or to the number of bits that change when a register is overwritten (Hamming distance).
See [Chapter 7](07-Masking-and-Fault-Resistance.md#72-what-the-chip-gives-away-power-models).

**Handle**
A number that names a key inside a session of a token or HSM, valid only for that session. The caller uses the key through it without ever seeing the key.
See [Chapter 11](11-Hardware-for-Keys.md#114-pkcs11-slots-sessions-handles-and-attributes).

**Hardware security module (HSM)**
A tamper-responding device that generates, stores and uses keys behind an API with no operation that returns them in the clear, holding master keys inside its boundary and other keys as wrapped blobs. Quorums of named people control its most sensitive operations.
See [Chapter 11](11-Hardware-for-Keys.md#113-hardware-security-modules).

**Hash flooding**
A denial-of-service attack that sends many keys colliding in one hash-table bucket, turning parsing into quadratic work. Keyed hashes such as SipHash stop it.
See [Chapter 8](08-Hostile-Input.md#810-hash-flooding).

**Hash shucking**
Attacking a wrapped hash such as `bcrypt(md5(password))` by feeding it unsalted MD5 hashes leaked from other sites; a match reveals the inner hash, which is then cracked fast. A peppered HMAC between the layers stops it.
See [Chapter 13](13-Passwords-on-the-Server.md#136-upgrading-legacy-hashes-without-a-reset).

**Health tests**
The SP 800-90B checks on an entropy source's raw samples: start-up tests on at least 1,024 samples and two continuous tests, the repetition count test (a source that sticks) and the adaptive proportion test (a source drifting toward one value). They catch dead sources, not weak ones.
See [Chapter 4](04-Randomness-in-Practice.md#47-entropy-sources-and-health-tests).

**Heartbleed**
The 2014 OpenSSL bug (versions 1.0.1 to 1.0.1f) in which the TLS heartbeat handler believed the length in the request and returned up to 64 KB of server memory, including private keys.
See [Chapter 8](08-Hostile-Input.md#82-heartbleed-told-fully) and [Chapter 18](18-Running-Cryptography-for-Years.md#186-when-keys-leak-by-the-thousand-debian-and-heartbleed).

**Hedged signing**
Deterministic nonce generation with fresh randomness mixed in as well, so signing the same message twice with a fault in one run does not leak the key. RFC 6979 permits it.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#612-nonces-you-cannot-get-wrong-rfc-6979-and-a-signer-put-together) and [Chapter 7](07-Masking-and-Fault-Resistance.md#79-fault-countermeasures-that-hold).

**Hertzbleed**
The 2022 attack in which a processor's power-dependent clock frequency made the running time of constant-time code depend on the data, enough to recover keys remotely.
See [Chapter 5](05-Constant-Time-Programming.md#510-help-from-the-processor-arm-dit-and-intel-doit).

**Hiding**
Countermeasures that lower the signal in a measurement, raise its noise or move the target in time: shuffling, random delays, dummy operations and on-chip noise generators. Hiding multiplies the work of masking and never replaces it.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#76-shuffling-and-hiding).

**HKDF**
The HMAC-based key derivation function, used to derive many independent keys from one full-strength key, each with its own `info` label. The labels should be versioned and length-prefixed.
See [Chapter 10](10-The-Life-of-a-Key.md#106-one-key-one-purpose).

**HMAC_DRBG**
The SP 800-90A generator built from HMAC: a key $K$ and value $V$, output by repeated HMAC, and an update of both after every request. RFC 6979's deterministic nonces are built on it.
See [Chapter 4](04-Randomness-in-Practice.md#46-hmac_drbg-as-a-component).

**HSTS**
HTTP Strict Transport Security: a response header that makes the browser use only HTTPS for the host until `max-age` runs out. It should be rolled out in steps, with `includeSubDomains` and `preload` last.
See [Chapter 12](12-Secrets-in-Operations.md#129-headers-hsts-and-csp).

## I

**Incident playbook**
A numbered, written procedure for one kind of incident, with owners and time limits, kept as a checklist that produces a status and rehearsed before it is needed.
See [Chapter 18](18-Running-Cryptography-for-Years.md#188-a-written-incident-playbook).

**Inclusion proof**
The sibling hashes on the path from an entry's leaf to the root of a transparency log, showing that the entry is in the tree of a given signed size.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#166-transparency-logs).

**Infective computation**
A fault countermeasure that mixes the difference between a result and its check into the output through a random value, so a faulty result comes out as noise. It removes the decision but needs uniform randomness.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#79-fault-countermeasures-that-hold).

**Injective encoding**
An encoding in which two different inputs never give the same bytes. Concatenation without lengths is not injective and lets an attacker move bytes between fields.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#29-canonical-encoding-when-two-messages-are-one).

**Invalid-curve attack**
An attack that sends a point not on the intended curve, so the victim computes on a curve with a small subgroup and leaks its secret modulo small orders. The Chinese remainder theorem then gives the whole key.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#68-points-from-strangers-validation-and-invalid-curves).

## J

**JWK (JSON Web Key)**
The JSON format of RFC 7517 for keys: `kty` for the key type and the parameters as base64url strings without padding. It carries the same keys as the ASN.1 files without ASN.1.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#39-without-asn1-jwk-and-cose-keys).

## K

**k-anonymity range query**
Checking a password against a breach list such as Pwned Passwords by sending only the first 20 bits (five hex characters) of its SHA-1 hash and receiving every matching suffix. The service learns only a prefix shared by many passwords, and padding hides the bucket size.
See [Chapter 13](13-Passwords-on-the-Server.md#137-breached-password-checks-with-k-anonymity).

**Key ceremony**
A written, witnessed procedure for a rare operation on root keys, such as generating, backing up or restoring them, performed step by step with custodians and records.
See [Chapter 11](11-Hardware-for-Keys.md#113-hardware-security-modules) and [Chapter 18](18-Running-Cryptography-for-Years.md#1810-people-and-process).

**Key check value (KCV)**
A short MAC or hash of a key under a fixed label, stored beside the key and checked before use, so a corrupted or wrong key is caught. It identifies a key without revealing it.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#712-mars-radiation-as-a-fault-injector) and [Chapter 10](10-The-Life-of-a-Key.md#1010-destruction-backups-and-escrow).

**Key-encryption key (KEK)**
A key used only to wrap other keys, typically one per service, tenant or table, itself stored wrapped under the root. In envelope encryption it stays in the KMS.
See [Chapter 10](10-The-Life-of-a-Key.md#104-hierarchies-keys-that-protect-keys) and [Chapter 14](14-Encrypting-Application-Data.md#143-envelope-encryption).

**Key escrow**
A copy of a key kept by a third party so that someone other than the owner can decrypt; it adds a copy and a target. The 1993 Clipper chip showed that an escrow field the endpoints cannot fully verify can be forged.
See [Chapter 10](10-The-Life-of-a-Key.md#1010-destruction-backups-and-escrow).

**Key hierarchy**
Keys that protect keys: a non-exportable root (master) key in hardware, key-encryption keys under it, and data-encryption keys beside the data. It makes rotation cheap, contains compromise and makes crypto-shredding possible.
See [Chapter 10](10-The-Life-of-a-Key.md#104-hierarchies-keys-that-protect-keys).

**Key ID**
A short public identifier stored with each ciphertext, signature or token, naming the key that made it. It indexes a fixed keyring and is what makes rotation possible.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#96-typed-keys-and-key-ids) and [Chapter 10](10-The-Life-of-a-Key.md#108-rotation).

**Key-image bug**
The 2017 CryptoNote flaw in which adding a small-order point to a key image gave a different encoding of the same key image, letting the same coin be spent more than once. The fix checks that $\ell \cdot I$ is the identity.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#69-cofactors-and-the-key-image-bug).

**Key inventory**
The record of every key's ID, algorithm, purpose, owner, state, dates, parent, copies and check value, never the key itself. A key that is not in the inventory is not rotated, revoked or destroyed.
See [Chapter 10](10-The-Life-of-a-Key.md#103-generation-registration-and-inventory) and [Chapter 17](17-Choosing-Testing-and-Verifying.md#1710-crypto-inventories-and-agility).

**Key life cycle**
The stages a key passes through (generation, registration, storage, distribution, use, rotation, revocation, destruction) and its states (pre-activation, active, suspended, deactivated, compromised, destroyed). Most failures happen in the stages, not in the cipher.
See [Chapter 10](10-The-Life-of-a-Key.md#102-the-life-cycle-and-the-cryptoperiod).

**Key rotation**
Replacing a key with a new version for new data, with versioned key IDs in every ciphertext so readers can find the right key. Lazy rotation limits new exposure; only eager re-encryption helps after a compromise.
See [Chapter 10](10-The-Life-of-a-Key.md#108-rotation) and [Chapter 12](12-Secrets-in-Operations.md#126-scanning-push-protection-and-rotation).

**Key separation**
One key, one purpose: never use the same key to encrypt and authenticate, to wrap and decrypt, to sign and decrypt, or in two protocols or services. Derive purpose keys with HKDF and distinct labels.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles) and [Chapter 10](10-The-Life-of-a-Key.md#106-one-key-one-purpose).

**Key wrap**
Encrypting one key under another for storage or transport. A dedicated key-wrap mode is deterministic and carries an integrity check, so no nonce is needed.
See [Chapter 10](10-The-Life-of-a-Key.md#105-key-wrap).

**Keyserver flooding**
The 2019 attack that loaded tens of thousands of bogus certifications onto two OpenPGP developers' keys on the SKS keyserver network, which never deleted anything, making those keys unusable in GnuPG.
See [Chapter 15](15-The-Command-Line-Tools.md#157-gpg-packets-defaults-and-trust).

**Keyset**
Tink's list of keys, each with an ID, a status and its template, one marked primary. The primary encrypts, any enabled key decrypts, and each ciphertext starts with a five-byte prefix naming its key.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#94-nacl-libsodium-tink-and-go).

**Known-answer test (KAT)**
A test that compares an implementation's outputs with published values, from RFC appendices, NIST's validation programs or other implementations. A runner must count the cases it runs and be seen to fail.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#173-known-answer-tests-and-where-vectors-come-from).

**KyberSlash**
The 2023 timing leak in Kyber's reference code, where a division of secret coefficients by $q$ compiled to a real division instruction on some targets and recovered keys in minutes.
See [Chapter 5](05-Constant-Time-Programming.md#57-variable-time-instructions).

## L

**Leak model**
The three things a timing observer is assumed to learn: which branches and loop counts run, which addresses are touched (at least to a cache line), and the operands of variable-time instructions.
See [Chapter 5](05-Constant-Time-Programming.md#52-the-leak-model).

**libsodium**
The portable, packaged descendant of NaCl, with the same task-level interface, functions such as `crypto_secretbox_easy` and `crypto_aead_xchacha20poly1305_ietf_encrypt`, and secure memory helpers.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#94-nacl-libsodium-tink-and-go).

**Logging names, not values**
Recording key IDs and versions, algorithm, operation, outcome, caller, request ID and time, never keys, plaintexts or tokens, through a function that accepts only listed fields.
See [Chapter 18](18-Running-Cryptography-for-Years.md#182-logging-without-leaking).

**Lookalike characters (confusables)**
Different characters that look the same, such as Latin `a` and Cyrillic `а`. Normalization does not merge them, so they need a separate defense such as a confusables check or a restricted character set.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#28-same-text-different-bytes-normalization-precis-and-lookalikes).

## M

**MADV_DONTDUMP**
The Linux `madvise` flag that leaves pages out of core dumps. With `MADV_WIPEONFORK` and a zero core-file limit, it keeps keys out of crash files and child processes.
See [Chapter 8](08-Hostile-Input.md#87-swap-core-dumps-and-crash-reports).

**Mass key replacement**
Replacing keys across many systems after a widespread flaw, in order: patch, new key, deploy, revoke, rotate neighbors, verify. After Heartbleed most sites never finished it.
See [Chapter 18](18-Running-Cryptography-for-Years.md#186-when-keys-leak-by-the-thousand-debian-and-heartbleed).

**Measured boot**
A boot in which each stage hashes the next before running it, extends the hash into a PCR and writes an entry to the event log. A verifier replays the log against PCR values the TPM signed in a quote.
See [Chapter 11](11-Hardware-for-Keys.md#118-tpm-20-and-measured-boot).

**Memory-safe language**
A language, such as Rust, Go, Java or Python, that checks bounds and turns over-reads into panics or exceptions. It fixes a large class of bugs but not logic errors, timing leaks or denial of service.
See [Chapter 8](08-Hostile-Input.md#88-memory-safe-languages-and-what-they-do-not-fix).

**Merkle tree hash (RFC 9162)**
The tree hash of Certificate Transparency 2.0, which hashes leaves as $H(\mathtt{0x00} \Vert d)$ and interior nodes as $H(\mathtt{0x01} \Vert l \Vert r)$, so a leaf can never be passed off as a node.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#166-transparency-logs).

**Minerva**
The 2019 attack that timed ECDSA signing in a certified smart card and five libraries, whose scalar multiplication time leaked the nonce's bit length, and recovered keys with a lattice. The fix is a fixed-length scalar: add $n$ or $2n$ to the nonce before the loop.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#611-scalar-length-leaks-minerva-and-tpm-fail).

**Misuse resistance**
The property of an interface whose easy way to use it is the safe way, and whose unsafe ways are impossible or loud. NaCl's `crypto_box`, with no mode, padding or separate MAC step to choose, is the model.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles) and [Chapter 9](09-APIs-That-Resist-Misuse.md#94-nacl-libsodium-tink-and-go).

**Mix-and-match attack**
Combining metadata from different moments, so the client sees a set of versions that never existed together. TUF's snapshot role stops it.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#169-update-frameworks-tuf-and-uptane).

**mlock**
The system call that keeps a range of pages in RAM so they are never swapped to disk. It does not prevent hibernation from writing them out.
See [Chapter 8](08-Hostile-Input.md#87-swap-core-dumps-and-crash-reports).

**Montgomery ladder**
An exponentiation or scalar multiplication that does the same operations for every bit, whatever its value, selecting operands by mask. It replaces square-and-multiply, whose power trace spells out the exponent; X25519 is built on it.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#65-exponents-and-the-montgomery-ladder).

**Montgomery reduction**
Modular reduction without division, one limb at a time with one precomputed limb, on numbers kept in Montgomery form $aR \bmod N$; Barrett reduction does the same job with a precomputed reciprocal. Both end in a correction that must always be done and selected by mask.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#64-reducing-without-dividing-montgomery-and-barrett).

## N

**NaCl**
Bernstein, Lange and Schwabe's 2012 library, which names operations (`crypto_box`, `crypto_secretbox`, `crypto_sign`) instead of algorithms and leaves the caller no modes, padding or MAC steps to choose.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles) and [Chapter 9](09-APIs-That-Resist-Misuse.md#94-nacl-libsodium-tink-and-go).

**Non-exportable key**
A key generated or imported into hardware and used only through a handle, with no operation that returns it. Theft, which is permanent and invisible, becomes misuse, which is bounded, logged and ends when the attacker is evicted.
See [Chapter 11](11-Hardware-for-Keys.md#112-keys-that-cannot-leave).

**Nonce**
A value that must never repeat under one key. Different from an IV, which must also be unpredictable, and from a signature nonce, which must be secret and uniform.
See [Chapter 4](04-Randomness-in-Practice.md#48-nonces-ivs-and-unique-ids).

**Nonce-misuse resistance**
The narrower property of an encryption scheme, such as AES-GCM-SIV or SIV, that loses as little as possible when a nonce repeats: it reveals only whether the same message was encrypted twice.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles) and [Chapter 9](09-APIs-That-Resist-Misuse.md#95-nonces-the-caller-never-sees).

**Null-prefix certificate**
A certificate whose name contained a zero byte, such as `www.paypal.com\0.thoughtcrime.org`, which a CA validated for the attacker's domain and C-based clients read as the victim's. Moxie Marlinspike showed it in 2009.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#311-names-loops-and-the-rest-of-the-parser-zoo).

## O

**Object identifier (OID)**
A path in one global tree that names an algorithm, attribute or extension, such as 1.2.840.113549.1.1.11 for sha256WithRSAEncryption. It is encoded with the first two arcs merged and each arc in base 128.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#35-object-identifiers).

**OCSP stapling**
A server's fetching a signed "still good" answer from its CA and sending it in the TLS handshake. Let's Encrypt ended OCSP in 2025, so it no longer applies to its certificates.
See [Chapter 12](12-Secrets-in-Operations.md#128-configuring-tls-on-a-server-you-run).

**OIDC federation**
Replacing a stored cloud access key with an exchange: a CI job presents a signed OpenID Connect token from its platform and receives short-lived cloud credentials. GitHub Actions has offered it since 2021.
See [Chapter 12](12-Secrets-in-Operations.md#125-secret-stores-and-short-lived-credentials).

**One error path**
The rule that every decryption or verification failure takes the same path: authenticate first, raise one exception, compare in constant time, and behave identically outward, including in timing.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#98-errors-that-do-not-leak).

**Onion hashing**
Wrapping every weak legacy hash at once in a peppered slow hash, then replacing it with a direct hash at each user's next login. Facebook described the approach in 2014.
See [Chapter 13](13-Passwords-on-the-Server.md#136-upgrading-legacy-hashes-without-a-reset).

**OpenPGP packets**
The structure of every OpenPGP file: packets with a tag and a length, some containing further packets. `gpg --list-packets` shows what a file really contains.
See [Chapter 15](15-The-Command-Line-Tools.md#157-gpg-packets-defaults-and-trust).

**OpenSSL**
The general-purpose cryptographic library and command-line tool that grew from SSLeay (1995) in 1998. Version 3.0 (2021) moved algorithms into loadable providers, including a FIPS provider.
See [Chapter 15](15-The-Command-Line-Tools.md#152-five-tools-and-where-they-came-from).

**openssl enc**
OpenSSL's file-encryption command. It derives the key with `EVP_BytesToKey`, stores only `Salted__` and a salt, and has no authentication; `-pbkdf2 -iter` fixes only the derivation, and age replaces it.
See [Chapter 15](15-The-Command-Line-Tools.md#154-openssl-enc-and-evp_bytestokey).

**Order-preserving encryption (OPE)**
Encryption whose ciphertexts sort in the same order as the plaintexts, so a database can run range queries. It leaks the order and about half the bits of each value.
See [Chapter 14](14-Encrypting-Application-Data.md#148-order-preserving-encryption).

## P

**Padding oracle**
A receiver that reveals whether a CBC ciphertext's padding is valid, which lets an attacker decrypt any ciphertext byte by byte without the key (Vaudenay, 2002). It broke ASP.NET in 2010.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#91-the-problem).

**Password reset token**
A one-time secret sent for account recovery. It must be random, stored hashed, single-use, short-lived and revoked when the password changes.
See [Chapter 13](13-Passwords-on-the-Server.md#1310-account-recovery-the-weak-door).

**Password spraying**
Trying one or a few common passwords against many accounts, so that no account sees more than a failure or two and per-account limits never trigger.
See [Chapter 13](13-Passwords-on-the-Server.md#139-online-guessing-rate-limits-lockouts-and-credential-stuffing).

**Passwords on the command line**
Secrets given as arguments, which leak through `ps`, `/proc/<pid>/cmdline`, audit logs and shell history. Pass them by file, descriptor, environment or prompt instead.
See [Chapter 15](15-The-Command-Line-Tools.md#155-what-openssl-enc-does-not-protect).

**PBKDF2**
The password-based key derivation function of PKCS#5, which iterates HMAC. It is not memory-hard; use PBKDF2-HMAC-SHA256 at 600,000 iterations or more only where FIPS 140-3 requires it.
See [Chapter 13](13-Passwords-on-the-Server.md#132-choosing-parameters-today).

**PCR (platform configuration register)**
A TPM register, 32 bytes in the SHA-256 bank, that is zero at reset and can only be extended, $\mathrm{PCR} \leftarrow H(\mathrm{PCR} \Vert \mathrm{measurement})$, so its value commits to the whole ordered sequence of measurements.
See [Chapter 11](11-Hardware-for-Keys.md#118-tpm-20-and-measured-boot).

**PEM**
The text wrapping, from 1993's Privacy-Enhanced Mail, that puts Base64 of DER bytes between a `-----BEGIN` line and an `-----END` line. The label on those lines says what structure is inside.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#36-pem-and-the-key-files).

**Pepper**
A secret key shared by all password hashes and kept outside the database, ideally in an HSM or KMS, usually applied as an HMAC. It protects a stolen database only if it lives elsewhere, and it needs a key ID to be rotated.
See [Chapter 13](13-Passwords-on-the-Server.md#135-peppers-and-where-to-keep-them).

**PHC string format**
The self-describing stored-password format from the Password Hashing Competition, such as `$argon2id$v=19$m=65536,t=2,p=1$` followed by the salt and hash, which carries the algorithm, version, parameters, salt and hash so that every hash can be upgraded.
See [Chapter 13](13-Passwords-on-the-Server.md#134-the-stored-string).

**PKCS#1**
RSA's own key formats, RSAPrivateKey and RSAPublicKey, and its padding schemes. As a key file it holds one algorithm's key with no algorithm identifier.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#36-pem-and-the-key-files).

**PKCS#11**
The standard C interface to cryptographic tokens and HSMs (Cryptoki): a token sits in a slot, the application works in sessions, and keys are named by handles and restricted by attributes. Its API attacks showed that the combination of allowed operations is what must be safe.
See [Chapter 11](11-Hardware-for-Keys.md#114-pkcs11-slots-sessions-handles-and-attributes).

**PKCS#11 attributes**
Flags on a key object, such as `CKA_SENSITIVE`, `CKA_EXTRACTABLE`, `CKA_WRAP` and `CKA_DECRYPT`, that restrict what it may be used for. Defaults differ by vendor, so every security attribute should be set explicitly and read back.
See [Chapter 11](11-Hardware-for-Keys.md#114-pkcs11-slots-sessions-handles-and-attributes).

**PKCS#12 (PFX)**
The `.p12` or `.pfx` file that carries a private key and its certificate chain under a password, authenticated by an HMAC keyed from the password. Older files use weak protection such as 40-bit RC2.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#37-chains-and-bundles-pkcs7-cms-and-pkcs12).

**PKCS#7 and CMS**
RSA's PKCS#7, which became the IETF's Cryptographic Message Syntax (RFC 5652): ContentInfo structures for signed and enveloped data, behind S/MIME, Authenticode and timestamping. A `.p7b` file is often just a certificate chain.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#37-chains-and-bundles-pkcs7-cms-and-pkcs12).

**PKCS#8**
The generic private key wrapper (PrivateKeyInfo): an algorithm identifier and the algorithm's own key structure inside an OCTET STRING. Its encrypted form names a password-based scheme, such as PBES2 with PBKDF2, and new private keys should be written this way.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#36-pem-and-the-key-files).

**Point validation**
Checking every received elliptic-curve point: not the identity, coordinates in range, on the curve, and in the right subgroup.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#68-points-from-strangers-validation-and-invalid-curves).

**Power analysis**
Recovering a key from a device's power consumption or electromagnetic field while it computes. Simple power analysis reads operations from one trace; differential and correlation power analysis compare many traces with predictions.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#72-what-the-chip-gives-away-power-models).

**PRECIS**
The IETF framework (RFC 8264 and RFC 8265, 2017) for preparing and comparing internationalized strings, which replaced stringprep. Its UsernameCaseMapped profile is for user names and OpaqueString for passwords.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#28-same-text-different-bytes-normalization-precis-and-lookalikes).

**Prediction resistance**
The property that someone who stole an earlier state cannot compute later output. Only a reseed from a live entropy source gives it.
See [Chapter 4](04-Randomness-in-Practice.md#46-hmac_drbg-as-a-component).

**Produce and accept flags**
Separate switches for whether a service creates outputs with an algorithm and whether it accepts them, so readers can be moved before writers and a change can be rolled back.
See [Chapter 18](18-Running-Cryptography-for-Years.md#189-crypto-agility-in-deployment).

**Project Wycheproof**
Google's 2016 collection of test vectors that encode known attacks (invalid points, malformed signatures, edge-case values) as JSON, now maintained by C2SP. Its ECDSA cases with $r = 0$, $s = 0$ would have caught psychic signatures.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#175-project-wycheproof-the-inputs-attackers-choose).

**Provenance**
A signed record of how an artifact was built: from which repository and commit, by which builder, with which steps and inputs. npm provenance and PyPI attestations use the in-toto format.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#168-reproducible-builds-and-provenance).

**Psychic signatures**
The 2022 Java bug (CVE-2022-21449) in which Java 15 to 18 accepted an ECDSA signature with $r = 0$ and $s = 0$ as valid for any message and key.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#171-the-problem).

**Push protection**
A code host's refusal of a push that contains a recognized secret. GitHub turned it on by default for public repositories in 2024; a bypass needs a recorded reason.
See [Chapter 12](12-Secrets-in-Operations.md#126-scanning-push-protection-and-rotation).

## Q

**Quote**
A TPM's signature over selected PCR values and a fresh nonce from the verifier. Replayed against the event log and judged against a reference list, it attests a boot.
See [Chapter 11](11-Hardware-for-Keys.md#119-sealing-quotes-and-bitlocker-on-the-bus).

## R

**Random nonce limit**
The rule of SP 800-38D that random 96-bit AES-GCM nonces allow at most $2^{32}$ messages under one key, so that the chance of a repeat stays negligible. Busy services reach it in weeks.
See [Chapter 4](04-Randomness-in-Practice.md#48-nonces-ivs-and-unique-ids).

**Re-encryption job**
A background job that moves stored data to a new data key or format. It must be versioned, idempotent, checkpointed and resumable, and must verify each new ciphertext before replacing the old.
See [Chapter 14](14-Encrypting-Application-Data.md#145-rotating-keys-over-billions-of-rows).

**Redundant computation**
Computing a result twice, or computing and inverting it, and comparing before release, with the decision hardened (multi-bit PASS and FAIL constants, tested twice) and failures counted until the device locks. The two computations must differ so that one fault cannot corrupt both the same way.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#79-fault-countermeasures-that-hold).

**Rehash on login**
Upgrading a stored password hash to the current algorithm or parameters at the moment the user logs in, when the server holds the password.
See [Chapter 13](13-Passwords-on-the-Server.md#136-upgrading-legacy-hashes-without-a-reset).

**Reproducible build**
A build that gives bit-for-bit identical output from the same source, so anyone can rebuild a release and check that a binary came from that source.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#168-reproducible-builds-and-provenance).

**Revocation**
Declaring a key or certificate no longer trusted. It cannot recall data already protected, reach parties that do not check, or survive the loss of the root.
See [Chapter 10](10-The-Life-of-a-Key.md#109-revocation-and-compromise) and [Chapter 18](18-Running-Cryptography-for-Years.md#186-when-keys-leak-by-the-thousand-debian-and-heartbleed).

**RFC 6979**
The 2013 standard for deterministic ECDSA and DSA nonces, derived with HMAC_DRBG from the private key and the message hash, so there is no generator at signing time to fail.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#612-nonces-you-cannot-get-wrong-rfc-6979-and-a-signer-put-together).

**ristretto255**
The encoding of RFC 9496 (2023), from Hamburg's Decaf, that turns Curve25519 into a prime-order group: each element has exactly one encoding and no small-order points exist, so subgroup checks disappear.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#69-cofactors-and-the-key-image-bug).

**ROCA**
The 2017 flaw in Infineon's RSA key generation, used in YubiKey 4 PIV, TPMs and Estonian identity cards, which made primes of a special form so that the public keys could be factored. Affected hardware had to be replaced.
See [Chapter 11](11-Hardware-for-Keys.md#1111-security-keys-and-smart-cards).

**Rollback attack**
Serving older, validly signed metadata or software to bring back a version with a known hole. Version numbers that may only increase stop it.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#169-update-frameworks-tuf-and-uptane).

**Rotation with overlap**
Changing a secret without an outage in three steps: publish the new one alongside the old, switch users to it, then retire the old one once nothing still depends on it.
See [Chapter 12](12-Secrets-in-Operations.md#126-scanning-push-protection-and-rotation).

**RSA blinding**
Multiplying the input by $r^e$ for a fresh random $r$ before the private-key operation and removing $r$ afterward, so timing does not depend on the attacker's input. Exponent blinding adds a random multiple of $p - 1$ to the exponent.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#67-rsa-private-key-code-blinding-and-the-fault-check).

**RSA SecurID breach**
The 2011 intrusion at RSA Security in which attackers took the seed data behind SecurID tokens, after which RSA admitted the data had been used and offered to replace around 40 million tokens. The failure was in a key's storage, not its cipher.
See [Chapter 10](10-The-Life-of-a-Key.md#101-the-problem).

## S

**Salt**
A random, public value stored with each password hash and mixed into it, so equal passwords give different hashes and one guess cannot be tested against every account at once.
See [Chapter 13](13-Passwords-on-the-Server.md#134-the-stored-string).

**SBOM (software bill of materials)**
A list of the components in a product. It records what is there but proves nothing about it.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#1612-going-deeper) and [Chapter 17](17-Choosing-Testing-and-Verifying.md#1710-crypto-inventories-and-agility).

**scrypt**
The memory-hard password hash and key derivation function of 2009, the choice where Argon2id is missing, at $N = 2^{17}$ or more. It is in OpenSSL and Python's `hashlib`.
See [Chapter 13](13-Passwords-on-the-Server.md#132-choosing-parameters-today).

**Sealing**
Binding a secret to a machine state: the TPM releases it only when chosen PCRs hold the expected values, as checked through a policy digest. BitLocker seals its volume master key this way.
See [Chapter 11](11-Hardware-for-Keys.md#119-sealing-quotes-and-bitlocker-on-the-bus).

**Searchable encryption**
Schemes that let a server answer queries over encrypted data. They leak access patterns (which documents each query returns) and search patterns, which attacks have turned into most of the protected values.
See [Chapter 14](14-Encrypting-Application-Data.md#147-searching-encrypted-data-blind-indexes).

**Second-order attack**
An attack on first-order masking that combines two samples, one for each share, into one value that depends on the secret, usually by their centered product, and then attacks that. It costs about $4(2 + \sigma^2)$ times as many traces, so masking multiplies noise and needs noise to work.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#75-the-second-order-attack-and-what-masking-really-buys).

**Secret scanning**
Searching code, history, images and logs for credentials, with pattern rules for known shapes (such as `AKIA` keys or `ghp_` tokens) and entropy rules for random-looking strings. Context, allowlists, checksummed token formats and verification with the issuer cut the false alarms.
See [Chapter 12](12-Secrets-in-Operations.md#123-code-it-a-secret-scanner).

**Secret sprawl**
Secrets copied along the whole path from laptop to production: repositories, CI environments, container image layers, logs and crash dumps. The Codecov (2021) and CircleCI (2023) breaches showed how much one CI environment holds.
See [Chapter 12](12-Secrets-in-Operations.md#122-where-secrets-leak).

**Secret store**
A service that holds secrets and hands each one only to the identities a policy names, logging every read, such as HashiCorp Vault or a cloud provider's secrets manager.
See [Chapter 12](12-Secrets-in-Operations.md#125-secret-stores-and-short-lived-credentials).

**secrets (Python module)**
Python's module for security-sensitive random values, reading from the operating system and impossible to seed. Use it, never `random`, for keys, tokens, salts and nonces.
See [Chapter 4](04-Randomness-in-Practice.md#44-in-python-secrets-not-random).

**Secure element**
A smart card chip, with masked coprocessors, a true random generator, sensors and hardened firmware, packaged into another device: a phone's payment chip, a security key, a hardware wallet, a TPM or an embedded SIM.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#711-smart-cards-and-secure-elements).

**Secure enclave**
A protected part of a main processor that runs code and holds keys apart from the operating system, such as Apple's Secure Enclave, Arm TrustZone, Intel SGX and TDX and AMD SEV. Enclaves share enough with attackers that most recent attacks have landed on them.
See [Chapter 11](11-Hardware-for-Keys.md#1110-secure-enclaves-phones-and-servers).

**Security audit**
An outside review of a library or product by specialists. A report is read from its commit, scope, effort and severity scale before its findings; "no significant findings" is evidence, not a certificate.
See [Chapter 17](17-Choosing-Testing-and-Verifying.md#178-audits-and-how-to-read-one).

**Seven layers**
The book's map of where cryptography fails: primitive, implementation, library, API, protocol, keys and operations. The higher the layer, the less likely anyone but an attacker is to notice a failure.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#15-the-layers-and-the-map-of-this-book).

**Short-lived credentials**
Credentials that expire on their own within minutes or hours, so that a stolen one is soon useless. They replace long-lived keys stored in CI systems and configuration.
See [Chapter 12](12-Secrets-in-Operations.md#125-secret-stores-and-short-lived-credentials).

**Shuffling**
Running independent operations, such as the 16 S-box lookups of an AES round, in a random order each time. Over $n$ positions it costs an integrating attacker a factor of about $n$.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#76-shuffling-and-hiding).

**SIFA (statistical ineffective fault analysis)**
A 2018 fault attack that uses only the runs where the fault did not change the result, whose inputs are biased. Detection and infection do not stop it; it needs masking as well.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#79-fault-countermeasures-that-hold).

**signify and minisign**
Small release-signing tools using Ed25519: OpenBSD's signify and Frank Denis's minisign. They replace OpenPGP's complexity with one key, and each release can carry the key for the next.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#165-release-signing-gpg-signify-and-minisign).

**SigSpoof**
A 2018 gpg bug (CVE-2018-12020) in which a file name inside a message was written unescaped into gpg's status output, letting an attacker forge "good signature" lines for programs that read them.
See [Chapter 15](15-The-Command-Line-Tools.md#157-gpg-packets-defaults-and-trust).

**Sigstore**
The free signing service, launched in 2021, that replaces long-lived keys with identities: Fulcio issues ten-minute certificates bound to an OpenID Connect identity and Rekor logs every signature. Verifiers must check the identity.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#167-sigstore-signing-without-keeping-a-key).

**SipHash**
A fast keyed hash with a 128-bit key and 64-bit output, designed in 2012 for hash tables fed untrusted keys, so an attacker cannot predict collisions.
See [Chapter 8](08-Hostile-Input.md#810-hash-flooding).

**SIV (synthetic IV)**
The mode, from Rogaway and Shrimpton (2006), that computes a MAC over the associated data, nonce and plaintext and uses it as the IV for counter-mode encryption, so a repeated nonce reveals only repeated messages.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#95-nonces-the-caller-never-sees).

**SLSA**
Supply-chain Levels for Software Artifacts, the OpenSSF framework that grades how far a provenance statement can be trusted, in levels of a Build track.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#168-reproducible-builds-and-provenance).

**SolarWinds compromise**
The attack found in December 2020 in which intruders on SolarWinds' build server changed a source file between checkout and compilation, so the backdoored Orion update was signed with the company's own certificate. Signing could not catch a compromised build.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#1610-when-the-chain-broke-the-incidents).

**SP 800-63B**
NIST's digital identity guideline for authentication. Revision 4 asks for at least 15 characters for password-only accounts (8 with another factor), at least 64 allowed, a blocklist, and no composition rules, forced rotation or security questions.
See [Chapter 13](13-Passwords-on-the-Server.md#138-the-rules-sp-800-63b).

**SSH key fingerprint**
A hash of an SSH public key blob, shown by `ssh-keygen -l` as `SHA256:` and the unpadded Base64 of a SHA-256 hash. It can be computed by hand from the key file.
See [Chapter 15](15-The-Command-Line-Tools.md#156-ssh-keygen-fingerprints-by-hand).

**Storm-0558**
The 2023 intrusion in which a Microsoft consumer signing key, created in 2016 and never rotated, was used to forge tokens for enterprise mailboxes, because the token validation never checked the key's scope. How the key left its protection is still unknown.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#14-three-failures-at-three-depths) and [Chapter 12](12-Secrets-in-Operations.md#124-storm-0558-told-fully).

**SubjectPublicKeyInfo (SPKI)**
The generic public key wrapper used in certificates and public key files: an algorithm identifier and the key as a BIT STRING.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#36-pem-and-the-key-files).

**Sweet32**
The 2016 attack that recovered an HTTP cookie from a long Triple DES connection by waiting for a collision in its 64-bit block. NIST then limited a 3DES key to $2^{20}$ blocks.
See [Chapter 18](18-Running-Cryptography-for-Years.md#184-how-algorithms-die).

## T

**Taint tracking**
Checking constant-time code by marking secrets and watching, as the code runs, whether any branch or memory address depends on them. ctgrind and TIMECOP use Valgrind's memcheck for this.
See [Chapter 5](05-Constant-Time-Programming.md#511-checking-the-code-taint-tracking).

**Threat model (implementer's)**
A statement of what an attacker of your code can observe and touch: the network, timing, a neighbor on the same machine, physical access, insiders and logs, the supply chain and the future. It should end in requirements that can be tested.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#16-threat-models-for-implementers).

**Threshold implementation**
A glitch-robust masking scheme for hardware that uses at least three shares and computes each output share from a function that never sees all the shares of any input (non-completeness). It is needed because the probing-secure ISW gadgets can leak through glitches in hardware.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#77-masking-with-proofs-isw-and-threshold-implementations).

**Threshold secret sharing**
Splitting a key into $n$ shares so that any $k$ rebuild it and $k - 1$ reveal nothing, as in Shamir's scheme. It survives a lost share or a departed custodian, which XOR splitting does not.
See [Chapter 10](10-The-Life-of-a-Key.md#1010-destruction-backups-and-escrow).

**Timing side channel**
A leak of secret information through how long code takes. Remote attacks across networks have recovered RSA keys and forged MACs through early-exit comparisons.
See [Chapter 5](05-Constant-Time-Programming.md#51-the-problem) and [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#61-the-problem).

**Tink**
Google's cryptographic library, published in 2018, which names security properties (`Aead`, `Mac`, `PublicKeySign`) and stores the algorithm with the key in a keyset, so the code that encrypts never names a cipher.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#94-nacl-libsodium-tink-and-go).

**TLV (tag, length, value)**
The shape of every BER and DER value: a tag saying what the value is, a length saying how many bytes follow, then the value itself, which may be more TLV records.
See [Chapter 3](03-ASN1-DER-and-Key-Files.md#32-tag-length-value).

**Tokenization**
Replacing a sensitive value, such as a card number, with a random token and keeping the mapping in a separate vault, so systems that hold only tokens fall out of PCI DSS scope.
See [Chapter 14](14-Encrypting-Application-Data.md#149-tokenization-and-format-preserving-encryption).

**TPM-Fail**
The 2019 timing attack on TPMs (Intel's firmware TPM and an STMicroelectronics chip) whose ECDSA signing leaked the nonce length; keys were recovered, one of them from a VPN server over the network.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#611-scalar-length-leaks-minerva-and-tpm-fail) and [Chapter 11](11-Hardware-for-Keys.md#118-tpm-20-and-measured-boot).

**TPM (Trusted Platform Module)**
A small security chip, or firmware in the processor (Intel PTT, AMD fTPM), that holds a few keys bound to the machine and records what it booted in PCRs. Its endorsement key, certified by the manufacturer, says it is a genuine TPM.
See [Chapter 11](11-Hardware-for-Keys.md#118-tpm-20-and-measured-boot).

**Transparency log**
An append-only public log, built on a Merkle tree, of certificates or signatures, so that a key used in secret is caught. It publishes signed tree heads (checkpoints), which witnesses cosign so it cannot show different views to different clients.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#166-transparency-logs).

**Transparent data encryption (TDE)**
A database's own encryption of its data files, logs and backups. Like disk encryption, it stops thieves of disks and backups, not anyone who reads through the database.
See [Chapter 14](14-Encrypting-Application-Data.md#142-where-to-encrypt).

**Trust policy**
The rule that says which federated identities may receive a role's credentials. All the security of OIDC federation sits in it; a policy with no condition on the subject trusts every job on the platform.
See [Chapter 12](12-Secrets-in-Operations.md#125-secret-stores-and-short-lived-credentials).

**TUF (The Update Framework)**
A framework for secure software updates with separate root, targets, snapshot and timestamp roles, thresholds, versions and expiry. It stops rollback, freeze and mix-and-match attacks and survives the theft of online keys; Uptane adapts it to cars.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#169-update-frameworks-tuf-and-uptane).

**TupleHash**
The SP 800-185 function, built on cSHAKE, that hashes a list of byte strings with each item's length encoded, so the hash of a tuple is unambiguous by construction.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#210-tuplehash-and-other-standard-answers).

**TVLA**
The fixed-versus-random leakage test of 2011: collect traces with one fixed input and with random inputs, compute Welch's $t$ at every sample, and fail the device if $|t| > 4.5$ anywhere.
See [Chapter 7](07-Masking-and-Fault-Resistance.md#710-evaluation-tvla-isoiec-17825-common-criteria-and-fips-140-3).

**Two people for every rare task**
The practice of keeping at least two people able to perform every rare procedure, such as a ceremony or a restore, with the newer one leading, so the knowledge never lives in one head.
See [Chapter 18](18-Running-Cryptography-for-Years.md#1810-people-and-process).

**Typed key**
A key object that carries its purpose and a public key ID, refuses to be used for another purpose, and cannot be printed, compared with `==` or serialized by accident.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#96-typed-keys-and-key-ids).

## U

**Unicode normalization**
Converting text to one standard form so that strings that look the same have the same code points: NFC decomposes and recomposes, and NFKC also replaces compatibility characters such as ligatures and fullwidth letters. Text must be normalized, usually to NFC, before it is compared or hashed.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#28-same-text-different-bytes-normalization-precis-and-lookalikes).

**UTF-8**
The variable-length encoding of Unicode code points as 1 to 4 bytes. It must be decoded strictly, rejecting overlong forms, surrogates and invalid sequences, or two byte strings can mean one character.
See [Chapter 2](02-Bytes-Encodings-and-Text.md#27-text-is-not-bytes-unicode-and-utf-8).

**UUID**
A 128-bit identifier from RFC 9562: version 4 has 122 random bits, while versions 1 and 7 contain timestamps and are guessable. A UUID is not a secret and must never stand in for one.
See [Chapter 4](04-Randomness-in-Practice.md#48-nonces-ivs-and-unique-ids).

## V

**Value barrier**
A construct, often an empty inline assembly statement, that hides a value from the optimizer so that it cannot turn masked code back into a branch. A value barrier fixed clangover (CVE-2024-37880), in which Clang had turned a mask in ML-KEM's reference code back into a branch.
See [Chapter 5](05-Constant-Time-Programming.md#58-the-compiler-as-adversary).

**Variable-time instruction**
An instruction whose duration depends on its operands: division almost everywhere, multiplication on some small cores, floating point on subnormal numbers.
See [Chapter 5](05-Constant-Time-Programming.md#57-variable-time-instructions).

**Verify-before-release**
Checking an RSA-CRT signature with the public key before releasing it, so a fault in one CRT half cannot hand out a signature that factors the modulus. It costs a few percent of signing time.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#67-rsa-private-key-code-blinding-and-the-fault-check) and [Chapter 7](07-Masking-and-Fault-Resistance.md#79-fault-countermeasures-that-hold).

**Versioned envelope**
A ciphertext or token format that starts with a version that fixes every algorithm, plus a key ID, all under the authentication tag. Fernet and PASETO work this way.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#97-versioned-envelopes-instead-of-negotiation).

**Versioning**
Fixing everything about a format (cipher, MAC, key derivation, encoding) under one version number, so that changing anything means a new version. The book prefers it to negotiation; WireGuard and PASETO work this way.
See [Chapter 1](01-What-Cryptographic-Engineering-Is.md#17-principles) and [Chapter 9](09-APIs-That-Resist-Misuse.md#97-versioned-envelopes-instead-of-negotiation).

**VM generation ID**
A 128-bit value in the firmware tables that the hypervisor changes whenever a virtual machine is started from a snapshot, restored or cloned. Since Linux 5.18 the kernel reseeds its generator the moment it changes.
See [Chapter 4](04-Randomness-in-Practice.md#45-copies-of-the-state-fork-snapshots-and-clones).

## W

**Wiping secrets**
Overwriting a key's memory when you are done with it, using a function the compiler may not remove: `explicit_bzero`, `memset_explicit` (C23), `SecureZeroMemory` or `OPENSSL_cleanse`. A wipe clears only the buffer you pass.
See [Chapter 8](08-Hostile-Input.md#85-wiping-secrets).

**Wrap-and-decrypt attack**
Clulow's 2003 attack on PKCS#11: wrap a sensitive key under a key that may also decrypt, then decrypt the blob and read the key. The fix is role separation, sticky attributes that can only tighten, and wrapped keys that carry their attributes; the Tookan tool (2010) found such attacks on real tokens.
See [Chapter 11](11-Hardware-for-Keys.md#115-break-it-fix-it-the-pkcs11-api-attacks).

## X

**X25519**
The Diffie-Hellman function on Curve25519 fixed by RFC 7748: an $x$-only Montgomery ladder over $2^{255} - 19$ that accepts every 32-byte string as a public key, with a clamped scalar.
See [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md#66-x25519-from-the-rfc).

**XChaCha20-Poly1305**
The AEAD with a 192-bit nonce, built by deriving a subkey with HChaCha20 from the key and the first 16 nonce bytes. Random nonces are safe with it because collisions are negligible.
See [Chapter 9](09-APIs-That-Resist-Misuse.md#95-nonces-the-caller-never-sees).

**xz backdoor**
The 2024 backdoor in xz Utils 5.6.0 and 5.6.1, planted by a maintainer who had gained trust over years, and found by chance by Andres Freund. It showed that a compromised maintainer needs people, not cryptography, to stop.
See [Chapter 16](16-Signing-Software-and-the-Supply-Chain.md#161-the-problem).
