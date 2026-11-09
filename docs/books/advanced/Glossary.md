# Glossary

*Short definitions of the terms this book uses, from A to Z, each with a link to the chapter that teaches it.*

## A

**AACS**
The Advanced Access Content System protecting HD DVD and Blu-ray films with AES-128 and subset-difference revocation. In February 2007 a processing key read from a software player's memory, beginning 09 F9, unlocked every disc pressed until then.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#139-aacs-and-the-2007-key-leak).

**Additive sharing**
Sharing a secret $s$ as $n$ numbers that add up to $s$ modulo $m$, the first $n - 1$ chosen at random. All $n$ shares are needed; XOR sharing is the same idea on bit strings.
See [Chapter 2](02-Secret-Sharing.md#22-everyone-needed-additive-and-xor-sharing).

**Address clustering**
Grouping a public ledger's addresses into probable owners, chiefly with the common-input-ownership heuristic (inputs spent together have one owner) and by spotting which output is change.
See [Chapter 18](18-Privacy-on-Ledgers.md#182-reading-a-public-ledger-address-clustering).

**Algebraic intermediate representation (AIR)**
A program's rules written as polynomial equations on its execution trace: transition constraints between neighboring rows and boundary constraints at fixed positions.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#84-starks-from-a-computation-to-a-polynomial).

**Anonymity set**
The group within which an action cannot be tied to a person. Anonymity is only as strong as this set is large.
See [Chapter 1](01-Computing-With-Secrets.md#17-what-privacy-means).

**Anonymous credential**
A credential whose holder can show any subset of its attributes, or a fact computed from them, while proving the issuer signed the whole set, and nothing more.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#149-anonymous-credentials-idemix-u-prove-and-bbs).

**Apple CSAM detection design**
Apple's 2021 design for detecting known child sexual abuse images in iCloud Photos with perceptual hashes (NeuralHash), private set intersection and threshold secret sharing, revealing nothing below 30 matches. Paused within a month and abandoned in 2022.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#118-apples-csam-detection-design-2021).

**Argument**
An interactive proof whose soundness holds only against provers limited to polynomial time, under an assumption such as the hardness of discrete logarithms. Most deployed proof systems are arguments.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#53-what-a-proof-is-allowed-to-be).

**Arithmetic circuit**
A computation written as a network of addition and multiplication gates over a finite field, the form in which SNARKs prove statements.
See [Chapter 7](07-SNARKs.md#72-from-programs-to-arithmetic-circuits).

**Attribute-based encryption (ABE)**
Encryption to a policy over attributes rather than to a person, such as "medic AND district 3". In ciphertext-policy ABE the sender attaches the policy and keys carry attributes; in key-policy ABE it is the other way round.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#1310-attribute-based-encryption).

**Authenticated garbling**
Wang, Ranellucci and Katz's 2017 method for malicious security with a single garbled circuit, built from shares authenticated with MACs; it replaced cut-and-choose as the fastest approach.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#910-when-the-parties-cheat).

## B

**BBS signature**
A short pairing-based signature on many messages, from Boneh, Boyen and Shacham's 2004 group signature, whose holder can present any subset of the messages with a zero-knowledge proof; two presentations share nothing.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#149-anonymous-credentials-idemix-u-prove-and-bbs).

**Beaver triple**
Shares of random $a$, $b$ and $c = ab$, prepared before the inputs exist. Multiplying shared $x$ and $y$ consumes one triple and needs only the opening of $x - a$ and $y - b$; reusing a triple leaks the inputs. Beaver, 1991.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#105-beaver-triples-and-the-preprocessing-model).

**Benaloh challenge**
Benaloh's 2006 cast-or-audit step: after the device encrypts a ballot, the voter either casts it or makes the device reveal its randomness, spoiling that ballot. A device that cheats risks being caught, and an audited ballot is no receipt.
See [Chapter 16](16-Electronic-Voting.md#167-the-voters-side-cast-or-audit).

**BFV**
Brakerski's and Fan and Vercauteren's 2012 scheme for exact integer arithmetic, with the message scaled into the high bits of the phase so that noise need not be tracked level by level.
See [Chapter 12](12-Homomorphic-Encryption.md#129-the-second-generation-bgv-and-bfv).

**BGV**
Brakerski, Gentry and Vaikuntanathan's 2011 leveled scheme from ring learning with errors, with modulus switching so that noise grows linearly with depth; it computes exactly on integers modulo $t$.
See [Chapter 12](12-Homomorphic-Encryption.md#129-the-second-generation-bgv-and-bfv).

**BGW protocol**
Ben-Or, Goldwasser and Wigderson's 1988 protocol on Shamir shares: additions are local, and after each multiplication the parties reshare to bring the degree back down. It needs no hardness assumption, given private channels and an honest majority (two thirds against active cheaters).
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#104-bgw-honest-majority-and-shamir-shares).

**Binding**
The property that a committer cannot open a commitment to two different values. No commitment can be both perfectly hiding and perfectly binding; one of the two must rest on a hard problem.
See [Chapter 3](03-Commitments.md#31-the-problem).

**BitForge**
Fireblocks' 2023 attacks on GG18, GG20 and Lindell17 implementations: a missing proof about a party's Paillier modulus let one party read another's key share out of normal signing sessions.
See [Chapter 4](04-Threshold-Cryptography.md#48-threshold-ecdsa-and-how-it-broke).

**Blakley's scheme**
George Blakley's 1979 geometric secret sharing, found independently of Shamir: the secret is a point, each share is a hyperplane through it, and $t$ hyperplanes meet in that one point.
See [Chapter 2](02-Secret-Sharing.md#24-blakleys-planes).

**Blind RSA signature**
The user sends $m r^e$ for a random $r$, the signer returns its $d$-th power, and dividing by $r$ leaves an ordinary RSA signature on $m$. Standardized as RFC 9474 in 2023.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#142-blind-rsa-signatures-by-hand).

**Blind signature**
A signature the signer makes without seeing the message; later, anyone can check it, and the signer cannot tell which of its signing sessions produced it. Chaum, 1982.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#141-the-problem).

**BLS signature**
Boneh, Lynn and Shacham's 2001 pairing-based signature $\sigma = H(m)^x$: short, deterministic and unique, so signatures aggregate and threshold signing needs no rounds of coordination.
See [Chapter 4](04-Threshold-Cryptography.md#47-bls-signatures-that-add-up).

**Boneh-Franklin IBE**
Boneh and Franklin's 2001 identity-based encryption from pairings, with short ciphertexts and a security proof; it made identity-based encryption practical.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#135-boneh-franklin-identity-based-encryption-with-pairings).

**Bootstrapping**
Gentry's 2009 idea for removing noise: run the decryption circuit homomorphically on a noisy ciphertext, using an encryption of the secret key (the bootstrapping key), to get a fresh encryption of the same message with less noise.
See [Chapter 12](12-Homomorphic-Encryption.md#128-gentrys-bootstrapping).

**Broadcast encryption**
Encrypting one message, such as a disc or a satellite stream, so that millions of licensed receivers can read it and a chosen few revoked ones cannot. The subset-difference method of Naor, Naor and Lotspiech excludes $r$ revoked players with at most $2r - 1$ key sets.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#138-broadcast-encryption-and-traitor-tracing).

**Bulletproofs**
Short range proofs and circuit proofs with no trusted setup, built on the inner-product argument and the discrete-log assumption (Bünz and colleagues, 2017 to 2018). Monero adopted them in 2018 and Bulletproofs+ in 2022.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#82-the-inner-product-argument).

**Byzantine generals problem**
Lamport, Shostak and Pease's 1982 framing of agreement when some parties lie (Byzantine faults): with oral messages it needs $n \ge 3f + 1$ parties to tolerate $f$ traitors; with signatures and a synchronous network, any number.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#172-the-byzantine-generals).

## C

**Cave of Ali Baba**
Quisquater and colleagues' 1989 story of a ring-shaped cave with a magic door, used to explain completeness, soundness and zero knowledge, and why a recording of the proof convinces nobody else.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#52-the-cave).

**Census Disclosure Avoidance System (2020)**
The US Census Bureau's differentially private system for the 2020 census, whose TopDown algorithm added noise at each geographic level and then made the counts consistent; the largest differentially private release ever made.
See [Chapter 19](19-Differential-Privacy.md#1911-the-2020-united-states-census).

**Chaum-Pedersen proof**
A sigma protocol proving that two discrete logarithms are equal, $\log_g X = \log_h Y$, without revealing them. It proves Diffie-Hellman tuples and ElGamal decryptions correct.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#65-equal-discrete-logs-chaum-pedersen-and-several-secrets-okamoto).

**Chou-Orlandi OT**
"The simplest protocol for oblivious transfer" (2015): a 1-out-of-2 OT as short as a Diffie-Hellman key exchange, widely used for the base OTs of larger protocols.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#93-oblivious-transfer-from-diffie-hellman).

**circomlib MiMC bug**
A 2019 bug in circomlib's MiMC hash template, where one output was assigned but not constrained, leaving Tornado Cash's Merkle-tree hash open to fake membership proofs.
See [Chapter 7](07-SNARKs.md#710-circuit-bugs-when-the-proof-is-right-and-the-program-is-wrong).

**CKKS**
Cheon, Kim, Kim and Song's 2017 scheme for approximate arithmetic on encrypted real and complex numbers, treating noise as rounding error and rescaling after each multiplication.
See [Chapter 12](12-Homomorphic-Encryption.md#1210-ckks-approximate-numbers-and-a-key-in-the-output).

**Cocks IBE**
Clifford Cocks's 2001 identity-based encryption from quadratic residues: a name is hashed to $a$ modulo a Blum integer, its private key is a square root of $a$ or $-a$, and messages are encrypted one bit at a time, so ciphertexts are large.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#134-cockss-identity-based-encryption).

**Coercion resistance**
The property that a voter can vote as they wish even while a coercer actively interferes, demanding abstention, a particular vote or their credentials (Juels, Catalano and Jakobsson, 2005).
See [Chapter 16](16-Electronic-Voting.md#162-what-a-voting-system-must-promise).

**Coin flipping by telephone**
Manuel Blum's 1981 protocol for two distrustful parties to make a fair random bit over a wire: one commits to a bit, the other guesses, then the first opens. One party can always walk away before the end.
See [Chapter 3](03-Commitments.md#32-coin-flipping-by-telephone).

**CoinJoin**
Maxwell's 2013 idea of several owners signing one Bitcoin transaction together, each checking its own output, so that inputs spent together no longer share an owner; usually with equal-sized outputs.
See [Chapter 18](18-Privacy-on-Ledgers.md#184-coinjoin-and-payjoin).

**Commitment**
A short value computed from a message and fresh randomness, published now and opened later by revealing both; a sealed envelope in mathematics. It must be hiding and binding.
See [Chapter 3](03-Commitments.md#31-the-problem).

**Composition**
The rule that publishing results of an $\varepsilon_1$- and an $\varepsilon_2$-private mechanism is $(\varepsilon_1 + \varepsilon_2)$-private, so every answer spends part of a finite privacy budget. Queries on disjoint groups cost only the largest $\varepsilon$ (parallel composition).
See [Chapter 19](19-Differential-Privacy.md#199-composition-the-budget-and-post-processing).

**Confidential transaction**
Maxwell's 2015 design that hides every amount in a Pedersen commitment. Because commitments add, the ledger can check that inputs equal outputs without seeing any amount, provided each output has a range proof.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#83-range-proofs-and-monero).

**Cover traffic**
Dummy messages that look exactly like real ones, sent whether or not there is anything to say, to hide when and whether a user communicates.
See [Chapter 15](15-Anonymous-Communication.md#154-batching-and-the-attacks-on-it).

**Cut-and-choose**
Checking a cheater by having it prepare many copies, opening a random subset to inspect and using the rest, as in maliciously secure garbled circuits; Chaum's ecash used the same idea at withdrawal.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#910-when-the-parties-cheat).

## D

**Dandelion++**
A transaction relay method (Fanti and colleagues, 2018) that passes a new transaction along a random line of peers before broadcasting it, so the first node to broadcast is probably not the origin; Monero adopted it in 2020.
See [Chapter 18](18-Privacy-on-Ledgers.md#1813-what-a-ledger-cannot-hide).

**Differential privacy**
The guarantee (Dwork, McSherry, Nissim and Smith, 2006) that a randomized mechanism's output distribution changes by at most a factor $e^{\varepsilon}$ when one person's data are added, removed or changed, whatever the attacker already knows.
See [Chapter 19](19-Differential-Privacy.md#196-differential-privacy-the-definition).

**Diffie-Hellman PSI**
Meadows' 1986 protocol: each party raises its hashed items to a secret exponent, they swap and raise again, and since $H(x)^{ab} = H(x)^{ba}$ the common items match, at two exponentiations per item.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#113-diffie-hellman-private-set-intersection).

**Dining cryptographers network (DC-net)**
Chaum's 1988 broadcast in which every pair of participants shares random keys, everyone announces the XOR of their keys and the sender also XORs in the message, so nobody can tell who sent it, even with unlimited computing power.
See [Chapter 15](15-Anonymous-Communication.md#156-the-dining-cryptographers).

**Direct anonymous attestation (DAA)**
A protocol by which a hardware chip such as a TPM proves it is genuine without becoming a tracking identifier, using a blind issuer signature and zero-knowledge proofs, with pseudonyms the verifier can choose to link. Brickell, Camenisch and Chen, 2004.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#148-direct-anonymous-attestation-a-chip-that-proves-it-is-genuine).

**Dishonest majority**
The trust model in which up to $n - 1$ parties may be corrupted, so each honest party is protected even if all the others conspire. For two parties it is the only meaningful model.
See [Chapter 1](01-Computing-With-Secrets.md#14-who-are-the-parties-and-what-might-they-do).

**Distributed key generation (DKG)**
A protocol by which $n$ parties create a shared key pair whose secret nobody ever held: each acts as a dealer of a verifiable sharing, and the sharings are added. The 1999 GJKR version fixed a bias in Pedersen's original.
See [Chapter 4](04-Threshold-Cryptography.md#44-distributed-key-generation).

**DP-SGD**
Differentially private stochastic gradient descent (Abadi and colleagues, 2016): clip each example's gradient and add Gaussian noise, so a trained model reveals little about any one training example.
See [Chapter 19](19-Differential-Privacy.md#1913-secure-aggregation-and-federated-learning).

**drand**
A public randomness beacon run since 2019 by the League of Entropy, a group of independent organizations: each value is a threshold BLS signature on the round number, which also makes timelock encryption possible.
See [Chapter 4](04-Threshold-Cryptography.md#410-randomness-beacons-drand-and-algorand).

## E

**Ecash**
Chaum's untraceable digital cash: the bank blind-signs coins at withdrawal, so it cannot link a spent coin to its owner. Offline versions hide the spender's identity in the coin so that spending it twice reveals it.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#143-untraceable-cash-and-the-double-spender).

**ElectionGuard**
Microsoft's open-source toolkit, announced in 2019, that adds end-to-end verifiability to paper-based voting equipment with encrypted records, tracking codes, Benaloh challenges and a public election record.
See [Chapter 16](16-Electronic-Voting.md#1611-paper-with-proofs-scantegrity-star-vote-and-electionguard).

**End-to-end verifiability (E2E-V)**
The property that voters can check their ballots were cast as intended and recorded as cast, and anyone can check they were tallied as recorded, so cheating software or officials are caught in public.
See [Chapter 16](16-Electronic-Voting.md#162-what-a-voting-system-must-promise).

**Estonian i-voting**
Internet voting with the national ID card since 2005, with re-voting as a partial defense against coercion. In 2023 a majority of votes in a parliamentary election were cast online.
See [Chapter 16](16-Electronic-Voting.md#169-voting-over-the-internet-estonia-and-switzerland).

**Extractor**
The efficient algorithm that, given the ability to run and rewind a convincing prover, outputs a valid witness. The probability that a prover convinces without the extractor succeeding is the knowledge error.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#56-proofs-of-knowledge-and-extractors).

## F

**Fairplay**
The 2004 system of Malkhi, Nisan, Pinkas and Sella that first ran Yao's protocol in practice, compiling a simple high-level language into garbled circuits.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#911-in-the-real-world).

**Feldman VSS**
Feldman's 1987 non-interactive verifiable secret sharing: the dealer publishes $g$ raised to each coefficient of the Shamir polynomial, and each holder checks its share against them. It reveals $g^s$, so the secret is only computationally hidden.
See [Chapter 2](02-Secret-Sharing.md#25-catching-a-cheating-dealer-feldmans-checks).

**Fiat-Shamir transform**
Replacing the verifier's random challenge with a hash of everything sent so far, which turns an interactive public-coin proof into a non-interactive proof, or, with a message in the hash, a signature.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#68-fiat-shamir-from-a-conversation-to-a-proof).

**FLP impossibility**
Fischer, Lynch and Paterson's 1985 theorem that in an asynchronous network no deterministic protocol can guarantee consensus terminates if even one process may crash, because a slow process and a dead one look the same.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#173-flp-why-no-protocol-can-always-decide).

**Forking lemma**
Pointcheval and Stern's 1996 tool: rewind a forger to the moment it asked for the challenge, answer differently, and extract the secret from the two forgeries. It proves Fiat-Shamir signatures secure in the random oracle model.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#68-fiat-shamir-from-a-conversation-to-a-proof).

**Free XOR**
Kolesnikov and Schneider's 2008 garbling technique: every wire's two labels differ by one global secret $\Delta$, so an XOR gate needs no table and the evaluator just XORs the labels.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#99-cheaper-gates-from-four-rows-to-one-and-a-half).

**FRI**
The Fast Reed-Solomon Interactive Oracle Proof of Proximity (2017): a test that a committed function is close to a low-degree polynomial, folding it in half with a random challenge each round and spot-checking a few Merkle openings.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#86-fri-folding-a-polynomial-in-half).

**FROST**
Komlo and Goldberg's 2020 threshold Schnorr signature: two rounds, the first done in advance, with two nonces per signer and a binding factor that ties each nonce to the message and every signer's commitments, defeating the ROS attack. Standardized as RFC 9591.
See [Chapter 4](04-Threshold-Cryptography.md#45-threshold-schnorr-and-frost).

**Frozen Heart**
Trail of Bits' 2022 disclosure of implementations of Girault, Bulletproofs and PlonK proofs whose Fiat-Shamir challenges left out public inputs, so attackers could forge proofs.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#69-what-must-go-into-the-hash).

**Fully homomorphic encryption (FHE)**
Encryption that supports both addition and multiplication on ciphertexts without limit, and so can run any program on encrypted data. A partially homomorphic scheme supports one operation; a somewhat homomorphic one supports both a limited number of times. Gentry gave the first FHE scheme in 2009.
See [Chapter 12](12-Homomorphic-Encryption.md#121-the-problem).

**Functional encryption**
Encryption in which an authority issues keys for functions: a key for $f$ and an encryption of $x$ reveal $f(x)$ and nothing else about $x$. Defined in general by Boneh, Sahai and Waters in 2011; inner-product schemes are practical.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#1312-functional-encryption).

## G

**Garbled circuit**
Yao's method for two-party computation: the garbler replaces each wire's 0 and 1 by random labels and each gate by an encrypted table; the evaluator, holding one label per wire, decrypts its way to the output without learning any value in between.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#96-garbled-circuits-one-gate-at-a-time).

**Gaussian mechanism**
Adding normally distributed noise scaled to a query's $L_2$ sensitivity, which gives $(\varepsilon, \delta)$-differential privacy: the $e^{\varepsilon}$ bound may fail with a small probability $\delta$, which must be far below $1/n$.
See [Chapter 19](19-Differential-Privacy.md#198-the-gaussian-mechanism-and).

**Global passive adversary**
An adversary that sees every link in the network at once without interfering; the textbook threat for mixes, which low-latency systems such as Tor do not claim to resist.
See [Chapter 15](15-Anonymous-Communication.md#152-what-anonymity-means).

**GMW protocol**
Goldreich, Micali and Wigderson's 1987 protocol computing any Boolean circuit on XOR shares: XOR gates are local and each AND gate uses oblivious transfer. It is secure even if all but one party conspire.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#103-gmw-boolean-circuits-on-xor-shares).

**Graph isomorphism proof**
Goldreich, Micali and Wigderson's 1986 protocol: the prover sends a randomly relabeled copy of one graph and, asked for either original, shows the relabeling. It is perfect zero knowledge, with soundness error 1/2 per round.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#54-graph-isomorphism-by-hand).

**Groth16**
Groth's 2016 pairing-based SNARK: three group elements per proof, checked with three pairings, with a trusted setup specific to each circuit. Used by Zcash's Sapling, Filecoin and many others.
See [Chapter 7](07-SNARKs.md#77-pinocchio-and-groth16).

**Group signature**
A signature showing that some member of a group signed, without saying which, while a group manager holds an opening key that can identify the signer. Chaum and van Heyst, 1991.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#146-group-signatures-a-manager-who-can-open).

**Guard relay**
The first relay of a Tor circuit, which sees the client's address but not the destination. Each client keeps the same guard for months, to limit how often its entry point is exposed.
See [Chapter 15](15-Anonymous-Communication.md#159-how-tor-builds-a-circuit).

## H

**Half-gates**
Zahur, Rosulek and Evans's 2015 garbling, with two ciphertexts per AND gate and free XOR gates; optimal among linear schemes and the default in modern libraries. Three halves (2021) later reached about 1.5.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#99-cheaper-gates-from-four-rows-to-one-and-a-half).

**Halo**
Bowe, Grigg and Hopwood's 2019 recursive proofs with no trusted setup, which defer the inner-product argument's expensive check and accumulate it. Halo 2 runs Zcash's Orchard pool.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#88-recursion-proofs-that-verify-proofs).

**Hash commitment**
A commitment made by hashing a label, fresh randomness and the message with an unambiguous encoding. Without the randomness, a guessable message is exposed, as the New York taxi data showed.
See [Chapter 3](03-Commitments.md#33-hash-commitments).

**Helios**
Ben Adida's 2008 web-based verifiable voting system, homomorphic since version 2, for elections with low coercion risk; used by the IACR every year since 2010.
See [Chapter 16](16-Electronic-Voting.md#168-helios-verifiable-voting-in-a-browser).

**Hiding**
The property that a commitment reveals nothing about the committed value before it is opened.
See [Chapter 3](03-Commitments.md#31-the-problem).

**Homomorphic encryption**
Encryption that lets anyone compute on ciphertexts so that the result decrypts to the function of the plaintexts, without the key.
See [Chapter 12](12-Homomorphic-Encryption.md#121-the-problem).

**Homomorphic tallying**
Counting votes by multiplying encrypted ballots, so the product decrypts to the total without any single ballot being opened. Made practical by Cramer, Gennaro and Schoenmakers in 1997 with exponential ElGamal.
See [Chapter 16](16-Electronic-Voting.md#163-adding-votes-without-opening-them).

**Honest majority**
The trust model in which fewer than half the parties ($t < n/2$) may be corrupted. It allows protocols with no hardness assumption and with guaranteed output.
See [Chapter 1](01-Computing-With-Secrets.md#14-who-are-the-parties-and-what-might-they-do).

**Honest-verifier zero knowledge (HVZK)**
Zero knowledge that is guaranteed only against a verifier who follows the rules and picks its challenges at random. Full zero knowledge needs a simulator for every efficient verifier.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#59-honest-verifiers-real-verifiers-and-proofs-beyond-np).

## I

**Ideal functionality**
The imaginary trusted party (Trent) who takes everyone's inputs, computes the function and hands back only the outputs. A real protocol is secure if it reveals no more than this ideal world would.
See [Chapter 1](01-Computing-With-Secrets.md#12-the-ideal-world).

**Identity-based encryption (IBE)**
Public-key encryption in which any string, such as an email address, is a public key. A trusted private key generator derives each user's private key from a master secret.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#131-the-problem).

**Identity-based signature**
A signature that verifies against a name instead of a certified key. Shamir gave the first scheme in 1984, from RSA, and asked for identity-based encryption, which took seventeen years.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#132-shamirs-identity-based-signatures).

**Incrementally verifiable computation (IVC)**
Valiant's 2008 notion of a long computation whose proof is extended step by step, each step's proof showing that the previous one verified. Proof-carrying data generalizes it to any graph of computations.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#88-recursion-proofs-that-verify-proofs).

**Indistinguishability obfuscation (iO)**
A way to scramble a program so that obfuscations of any two programs with the same input-output behavior cannot be told apart. First proposed in 2013 and put on standard assumptions in 2020, it is far from practical.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#1313-indistinguishability-obfuscation-the-far-frontier).

**Inner-product argument**
A proof that committed vectors have a given inner product, halving the vectors each round with a random challenge, so the proof has about $2\log_2 n$ group elements. It is the core of Bulletproofs and Halo.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#82-the-inner-product-argument).

**Intel SGX**
Intel's Software Guard Extensions, shipped in 2015: enclaves with remote attestation. Foreshadow (2018), Plundervolt (2019) and SGAxe (2020) showed that their secrets and attestation keys could be extracted.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#109-the-shortcut-trusted-hardware).

**Interactive oracle proof (IOP)**
A proof in which the prover sends long messages that the verifier only samples at a few places. With Merkle trees and a hash, any IOP becomes a non-interactive argument; STARKs are built this way.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#84-starks-from-a-computation-to-a-polynomial).

**Interactive proof system**
A prover and a verifier who exchange messages, the verifier flipping coins and running in polynomial time, such that true statements are accepted (completeness) and false ones rarely are (soundness).
See [Chapter 5](05-Zero-Knowledge-Proofs.md#53-what-a-proof-is-allowed-to-be).

## K

**k-anonymity**
Generalizing and suppressing quasi-identifiers until every record shares its values with at least $k - 1$ others. It fails to homogeneity, background-knowledge and composition attacks; the term is from Samarati and Sweeney (1998).
See [Chapter 19](19-Differential-Privacy.md#193-k-anonymity-and-why-it-is-not-enough).

**Key escrow**
The ability of a third party to decrypt others' messages. In identity-based encryption the key generator can always do so, and designs can only spread or limit that power.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#136-the-key-generator-and-the-key-escrow-it-cannot-avoid).

**Key image**
The value $I = h^{x}$, with $h$ a hash of the signer's public key, that a linkable ring signature publishes. The same key always gives the same image, so two signatures by one key can be linked without naming the signer; Monero uses it to stop double spending.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#147-ring-signatures-how-to-leak-a-secret).

**Key transparency**
Keeping a directory of users' public keys in a Merkle tree whose signed root is published every epoch, so that lookups come with proofs and auditors can detect a server that shows different users different keys (a split view).
See [Chapter 3](03-Commitments.md#38-key-transparency).

**Kilian's completeness theorem**
Kilian's 1988 result that oblivious transfer alone is enough to compute any function securely, even against cheating parties.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#94-oblivious-transfer-is-enough-for-everything).

**KZG commitment**
Kate, Zaverucha and Goldberg's 2010 polynomial commitment: one group element computed from the powers of a secret, opened at any point with one more element and checked with a pairing. Used by PLONK and Ethereum's blobs.
See [Chapter 3](03-Commitments.md#36-kzg-polynomial-commitments-in-practice).

## L

**Lagrange interpolation**
The formula that finds the unique polynomial of degree below $t$ through $t$ points. Applied at zero, it rebuilds a Shamir secret as a weighted sum of shares, the weights being the Lagrange coefficients.
See [Chapter 2](02-Secret-Sharing.md#23-shamirs-scheme-by-hand-over-gf97).

**Laplace mechanism**
Publishing $f(D) + \mathrm{Lap}(\Delta f / \varepsilon)$, a query answer plus Laplace noise scaled to its sensitivity over $\varepsilon$; it is $\varepsilon$-differentially private. Naive floating-point versions leak, which the snapping mechanism and integer noise fix.
See [Chapter 19](19-Differential-Privacy.md#197-the-laplace-mechanism).

**l-diversity**
A 2006 patch to k-anonymity requiring each group of matching records to hold at least $l$ well-represented sensitive values, which stops the homogeneity attack where everyone in a group has the same diagnosis.
See [Chapter 19](19-Differential-Privacy.md#193-k-anonymity-and-why-it-is-not-enough).

**Learning with errors (LWE)**
The problem of solving linear equations modulo $q$ whose right-hand sides carry small random errors. Every homomorphic scheme in use today, and much of post-quantum cryptography, rests on it or its ring version.
See [Chapter 12](12-Homomorphic-Encryption.md#127-noise-computing-until-the-message-drowns).

**Li-Micciancio attack**
Li and Micciancio's 2020 key-recovery attack on CKKS: decrypted results include the noise, which reveals linear equations in the secret key. It led to the IND-CPA-D security notion and to adding noise at decryption.
See [Chapter 12](12-Homomorphic-Encryption.md#1210-ckks-approximate-numbers-and-a-key-in-the-output).

**Live Caller ID Lookup**
Apple's 2024 service for iOS 18 that lets caller-ID apps look up an incoming number in a server database with homomorphic encryption (BFV), so the server does not learn the number.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#1112-lattice-pir-and-live-caller-id-lookup).

**Local differential privacy**
Differential privacy in which each device randomizes its own data before sending it, so the collector never holds anything true about any one person, unlike the central model with a trusted curator. Google's RAPPOR (2014) and Apple's telemetry (2016) use it.
See [Chapter 19](19-Differential-Privacy.md#1910-local-differential-privacy).

**Loopix**
A 2017 mix-net design that resists a global passive observer at latencies of seconds, with exponential delays at each mix, Poisson cover traffic and loop messages; the Nym network is built on it.
See [Chapter 15](15-Anonymous-Communication.md#1514-paying-in-time-and-noise-loopix-and-nym).

## M

**Majority attack (51% attack)**
Rewriting recent history with more than half of a proof-of-work chain's hash rate, typically to double-spend deposits at exchanges, as against Bitcoin Gold in 2018 and Ethereum Classic in 2019 and 2020.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#177-attacking-proof-of-work-selfish-mining-and-51).

**Malicious adversary**
An adversary whose corrupted parties may do anything: send malformed or inconsistent messages, wait to see honest messages first, stop halfway or mix several sessions. Also called active or Byzantine.
See [Chapter 1](01-Computing-With-Secrets.md#14-who-are-the-parties-and-what-might-they-do).

**Maximal extractable value (MEV)**
The profit a block producer can capture by ordering, inserting or censoring transactions, for example by front-running a large trade and selling right after it (a sandwich); named in "Flash Boys 2.0" (2019).
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#1711-mev-and-front-running).

**Merkle tree**
A binary tree of hashes whose root commits to a whole list; any entry can be proved with the sibling hashes on its path to the root, about $\log_2 n$ of them. Ralph Merkle, 1979.
See [Chapter 3](03-Commitments.md#35-merkle-trees-and-vector-commitments).

**Mix**
Chaum's 1981 relay that collects a batch of encrypted messages, decrypts them and sends them out in a new order, so the link between input and output is lost. Chained mixes form a cascade, and one honest mix is enough.
See [Chapter 15](15-Anonymous-Communication.md#153-chaums-mix).

**Mobile driver's license (mDL)**
The ISO/IEC 18013-5 standard (2021) for a government license on a phone that reveals only the data elements a reader asks for and the holder approves.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#1412-in-the-real-world-licenses-wallets-and-age-checks).

**Modulus switching**
Dividing a ciphertext by a factor and rounding, moving to a smaller modulus, which shrinks the noise by the same factor while keeping the message. It makes noise grow linearly rather than exponentially with depth.
See [Chapter 12](12-Homomorphic-Encryption.md#129-the-second-generation-bgv-and-bfv).

**Monero**
The privacy coin launched in 2014 that is private by default: stealth addresses for recipients, ring signatures with key images for senders, and RingCT for amounts. Early rings were traced statistically, and full-chain membership proofs (FCMP++) are planned.
See [Chapter 18](18-Privacy-on-Ledgers.md#187-rings-key-images-and-ringct).

**Multiplicative depth**
The largest number of multiplication gates on any path from an input to an output of a circuit. It sets the number of rounds in share-based MPC and the noise budget in homomorphic encryption.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#102-computing-on-shares-the-one-hard-gate).

**MuSig2**
Nick, Ruffing and Seurin's 2021 two-round Schnorr multisignature: keys are weighted by a hash of the whole key list and each signer commits to two nonces, and the result looks like one ordinary Schnorr signature.
See [Chapter 4](04-Threshold-Cryptography.md#46-multisignatures-rogue-keys-and-musig2).

## N

**Nakamoto consensus**
Bitcoin's 2008 rule: extend the valid chain with the most accumulated proof of work and treat its blocks as history. Votes cost computing work rather than identities, and finality is only probabilistic, growing with each confirmation.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#176-nakamoto-consensus).

**Noise**
The small random error that hides the message in lattice-based ciphertexts and makes them secure. Additions add the errors and multiplications multiply them, until the message is lost.
See [Chapter 12](12-Homomorphic-Encryption.md#127-noise-computing-until-the-message-drowns).

**Nonce reuse**
Signing two messages with the same nonce, which hands anyone two transcripts with one commitment and different challenges, and so the key: $x = (s - s')/(e - e') \bmod q$.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#610-a-repeated-nonce-gives-away-the-key).

**Nova**
Kothapalli, Setty and Tzialla's 2021 folding scheme: each step folds two relaxed R1CS claims into one of the same size, so the step circuit only checks the fold, a few scalar multiplications, and a proof is made only at the end.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#89-folding-nova).

**Nullifier**
A value derived from a note and its owner's secret, revealed when the note is spent. It cannot be linked to the note's commitment, but spending the same note twice would repeat it, so double spends are refused.
See [Chapter 18](18-Privacy-on-Ledgers.md#189-zcash-hiding-the-whole-transaction).

## O

**Oblivious HTTP**
RFC 9458 (2024): a client encrypts an HTTP request to a gateway's key and sends it through a relay run by a different company, so the relay sees who asked but not what, and the gateway what but not who.
See [Chapter 15](15-Anonymous-Communication.md#1515-two-hops-oblivious-http-and-private-relay).

**Oblivious pseudorandom function (OPRF)**
A two-party protocol in which a client learns $F(k, x)$ for a server's secret key $k$ and its own input $x$, the server learning nothing about $x$ or the output. The standard construction is 2HashDH; RFC 9497 specifies it.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#115-oblivious-pseudorandom-functions).

**Oblivious transfer (OT)**
A protocol in which a sender offers two messages and the receiver gets the one it chooses, the sender learning nothing about the choice and the receiver nothing about the other message. Rabin's 1981 original delivered one message with probability one half.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#92-oblivious-transfer).

**Onion routing**
Sending traffic through a chain of relays, wrapped in one layer of encryption per relay, so each relay learns only its neighbors. Designed at the US Naval Research Laboratory in 1996, it is the basis of Tor.
See [Chapter 15](15-Anonymous-Communication.md#157-onions-one-key-per-hop).

**Onion service**
A server reachable only through Tor, whose location is hidden: client and service meet at a rendezvous point, introduced through the service's introduction points, and the .onion address is derived from the service's public key.
See [Chapter 15](15-Anonymous-Communication.md#1511-onion-services).

**OPAQUE**
An asymmetric password-authenticated key exchange (Jarecki, Krawczyk and Xu, 2018) built on an OPRF of the password, so the server never sees the password; standardized as RFC 9807 in 2025.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#116-rfc-9497-and-the-services-built-on-it).

**OR-proof**
A proof that the prover knows a witness for one of two statements without revealing which: it simulates the branch it cannot answer and splits the challenge (Cramer, Damgård and Schoenmakers, 1994). Ballots use it to prove a vote is 0 or 1.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#66-and-and-or).

**OT extension**
Turning a fixed number of expensive public-key OTs, about 128, into millions of cheap ones that need only symmetric operations. The IKNP protocol (2003) does it with one hash per transfer.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#95-ot-extension-millions-of-transfers-from-a-few).

## P

**Paillier encryption**
Paillier's 1999 public-key scheme modulo $N^2$ whose ciphertexts add: multiplying two ciphertexts adds the messages, and raising one to a power $k$ multiplies its message by $k$.
See [Chapter 12](12-Homomorphic-Encryption.md#124-paillier-adding-numbers).

**Paxos**
Lamport's crash-fault consensus protocol (written 1989, published 1998), which keeps replicated logs consistent with $2f + 1$ machines for $f$ crashes, using numbered ballots and overlapping majorities. Raft (2014) is a leader-based version designed to be easier to understand.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#174-crash-faults-paxos-and-raft).

**PayJoin**
A payment in which the recipient adds one of its own inputs, so that the common-input heuristic merges two owners and the real amount paid appears nowhere on the ledger.
See [Chapter 18](18-Privacy-on-Ledgers.md#184-coinjoin-and-payjoin).

**PBFT**
Castro and Liskov's 1999 Practical Byzantine Fault Tolerance: $3f + 1$ replicas survive $f$ that lie, using a primary and three phases (pre-prepare, prepare, commit) with quorums of $2f + 1$, any two of which share an honest replica.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#175-pbft-practical-byzantine-agreement).

**Pedersen commitment**
The commitment $g^m h^r$ in a prime-order group where nobody knows $\log_g h$: perfectly hiding, binding under the discrete-log assumption, and additively homomorphic.
See [Chapter 3](03-Commitments.md#34-pedersen-commitments).

**Pedersen VSS**
Pedersen's 1991 verifiable secret sharing, which publishes Pedersen commitments $g^{a_k} h^{b_k}$ to the coefficients of two random polynomials, so the public data reveal nothing about the secret even to unlimited computing power.
See [Chapter 2](02-Secret-Sharing.md#26-hiding-everything-pedersens-scheme).

**Pinocchio**
Parno, Howell, Gentry and Raykova's 2013 system that compiled C programs into QAP-based proofs of 288 bytes; the first practical SNARK.
See [Chapter 7](07-SNARKs.md#77-pinocchio-and-groth16).

**PLONK**
Gabizon, Williamson and Ciobotaru's 2019 SNARK with a universal, updatable setup that serves every circuit up to a size: gates are rows of a table with selectors, wires are linked by copy constraints checked with a grand product, and polynomials are committed with KZG.
See [Chapter 7](07-SNARKs.md#78-plonk-universal-setups-and-custom-gates).

**Point and permute**
Beaver, Micali and Rogaway's 1990 trick of attaching a color bit to each wire label, masked by a random permute bit, so the evaluator knows which row of a garbled table to decrypt without learning the wire's value.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#96-garbled-circuits-one-gate-at-a-time).

**Polynomial commitment**
A short commitment to a polynomial $f$ that can later prove the value $f(z)$ at any point the verifier names, with one short proof.
See [Chapter 3](03-Commitments.md#36-kzg-polynomial-commitments-in-practice).

**Post-processing**
Any computation on a differentially private output that does not look at the data again, such as rounding or fitting a model; it keeps the same guarantee and costs no budget.
See [Chapter 19](19-Differential-Privacy.md#199-composition-the-budget-and-post-processing).

**Preprocessing model**
Splitting secure computation into an offline phase that makes correlated randomness, such as Beaver triples, before any input exists, and a fast online phase that only adds and opens shares.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#105-beaver-triples-and-the-preprocessing-model).

**Prio**
Corrigan-Gibbs and Boneh's 2017 system for private statistics: each client secret-shares its report between servers with a short proof of validity checked on the shares, and only totals are opened. Privacy holds if any one server is honest.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#108-mpc-in-the-world).

**Privacy Pass**
A protocol in which a client proves it passed a check, such as a CAPTCHA or a device attestation, by showing a token the issuer signed blind, so sites cannot track it. Standardized in 2024 as RFC 9576 to RFC 9578.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#145-blind-signatures-today-rfc-9474-and-privacy-pass).

**Privacy pools**
A 2023 design in which a withdrawal also proves that its deposit lies in a published association set, such as all deposits not traced to known thefts, so honest users can separate themselves from thieves without losing their anonymity. Deployed in 2025.
See [Chapter 18](18-Privacy-on-Ledgers.md#1812-privacy-pools-and-association-sets).

**Private information retrieval (PIR)**
A protocol for fetching record $i$ from a database without the server learning $i$. With one server and privacy against unlimited power, nothing beats downloading everything.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#1110-private-information-retrieval-with-two-servers).

**Private Join and Compute**
Google's protocol, open-sourced in 2019, for computing the size of the intersection of two lists and the sum of values over it without revealing the lists; used to measure advertising conversions.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#108-mpc-in-the-world).

**Private key generator (PKG)**
The trusted center in identity-based cryptography that holds the master secret and issues private keys for names. Because it can derive every key, it can decrypt every message: key escrow is built in.
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#134-cockss-identity-based-encryption).

**Private set intersection (PSI)**
A protocol by which two parties holding sets $X$ and $Y$ learn $X \cap Y$, or only its size, and nothing else about each other's sets.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#111-the-problem).

**Proactive refresh**
Changing all the shares at regular intervals while keeping the secret, by having each holder deal a random sharing of zero that everyone adds in. Shares stolen in different periods then do not fit together, which defeats a mobile adversary.
See [Chapter 2](02-Secret-Sharing.md#27-keeping-shares-healthy-refresh-and-repair).

**Proof of knowledge**
A proof that the prover knows a witness, not merely that one exists: an extractor that can rewind any convincing prover outputs a valid witness.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#56-proofs-of-knowledge-and-extractors).

**Proof of shuffle**
A zero-knowledge proof that a mix's output list is a re-encryption of a permutation of its input list, without revealing the permutation. Sako and Kilian gave the first in 1995.
See [Chapter 16](16-Electronic-Voting.md#166-shuffling-encrypted-ballots-verifiable-mix-nets).

**Proof of stake**
Consensus in which validators lock up coins as a deposit, are chosen to propose and vote in proportion to it, and lose part of it (slashing) if they sign contradictory messages. Ethereum switched to it in 2022.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#178-proof-of-stake-and-finality).

**Public bulletin board**
An append-only list that everyone sees the same way, on which ballots, proofs and results are posted.
See [Chapter 16](16-Electronic-Voting.md#162-what-a-voting-system-must-promise).

**Pwned Passwords**
Troy Hunt's breach-check service. Its range API (2018) has the client send the first five hex characters of the password's SHA-1 hash and receive every matching suffix, so the password hides among many others (k-anonymity).
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#117-password-breach-checks).

## Q

**Quadratic arithmetic program (QAP)**
GGPR's 2013 encoding of an R1CS as polynomials, such that the witness is valid exactly when $A(x)B(x) - C(x)$ is divisible by the target polynomial, which vanishes at every constraint point.
See [Chapter 7](07-SNARKs.md#74-quadratic-arithmetic-programs).

**Quadratic residuosity assumption**
The assumption that, modulo $N = pq$ with secret primes, squares cannot be told from non-squares whose Jacobi symbol is $+1$. It underlies Goldwasser-Micali encryption and Kushilevitz and Ostrovsky's 1997 single-server PIR.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#1111-single-server-pir-from-quadratic-residues).

**Quasi-identifier**
A field such as ZIP code, birth date or sex that does not name anyone alone but does in combination. Joining two data sets on quasi-identifiers is a linkage attack, as when Sweeney found Governor Weld's hospital record.
See [Chapter 19](19-Differential-Privacy.md#192-why-anonymized-data-fails).

## R

**Random oracle model**
A proof model that treats a hash function as a truly random function that every party can only query. Fiat-Shamir signatures are proved secure in it.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#68-fiat-shamir-from-a-conversation-to-a-proof).

**Randomized response**
Warner's 1965 survey technique: each respondent flips a coin in private and answers truthfully or at random, so no single answer is incriminating but the overall rate can be estimated. The two-coin version is $\ln 3$-differentially private.
See [Chapter 19](19-Differential-Privacy.md#195-randomized-response).

**Range proof**
A proof that a committed value lies in a range such as $[0, 2^{64})$. Without it a negative amount, wrapping around the group order, could print coins.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#83-range-proofs-and-monero).

**Rank-1 constraint system (R1CS)**
A list of constraints of the form $(A_i \cdot w)(B_i \cdot w) = C_i \cdot w$ on a witness vector $w$ holding every wire value; the circuit form most SNARKs of the 2010s used.
See [Chapter 7](07-SNARKs.md#73-rank-1-constraint-systems-by-hand).

**Receipt-freeness**
The property that a voter cannot prove to anyone how they voted, even if they want to, so a vote cannot be bought or demanded. Benaloh and Tuinstra, 1994.
See [Chapter 16](16-Electronic-Voting.md#162-what-a-voting-system-must-promise).

**Reconstruction attack**
Rebuilding nearly a whole database from many slightly noisy answers. Dinur and Nissim (2003) showed that answers to about $n \log^2 n$ random counts with error well below $\sqrt{n}$ suffice, the result behind what Dwork called the fundamental law of information recovery.
See [Chapter 19](19-Differential-Privacy.md#194-differencing-and-reconstruction).

**Recursion**
Proving that a previous proof verified, plus one more step of work, so that a long computation is proved in pieces and the final proof stays small.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#88-recursion-proofs-that-verify-proofs).

**Reentrancy**
A contract bug in which an outside call made before the contract updates its own state lets the callee call back in and repeat the action, such as a withdrawal. The checks-effects-interactions rule prevents it.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#1710-when-contracts-break-the-dao-parity-and-the-bridges).

**Relinearization**
Turning the three-part ciphertext produced by a multiplication back into two parts, using a published relinearization key that encrypts $s^2$ under $s$. Its generalization, key switching, moves ciphertexts between keys and makes rotations possible.
See [Chapter 12](12-Homomorphic-Encryption.md#129-the-second-generation-bgv-and-bfv).

**Ring signature**
A signature showing that one of a chosen set of key holders signed, with no setup, no manager and no way to open it; the others need not know they were included. Rivest, Shamir and Tauman, 2001.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#147-ring-signatures-how-to-leak-a-secret).

**RingCT**
Monero's Ring Confidential Transactions (2017): amounts hidden in Pedersen commitments with range proofs, combined with ring signatures whose other members are decoys taken from the chain.
See [Chapter 18](18-Privacy-on-Ledgers.md#187-rings-key-images-and-ringct).

**Risk-limiting audit (RLA)**
Stark's 2008 post-election audit: check a random sample of paper ballots by hand, enough that if the reported winner actually lost, the audit leads to a full hand count with probability at least $1 - \alpha$, the risk limit.
See [Chapter 16](16-Electronic-Voting.md#1612-risk-limiting-audits-checking-the-paper).

**Rogue-key attack**
Publishing a key chosen after seeing another's, such as $X_M = g^m X_A^{-1}$, so the aggregate key is one whose secret the attacker alone holds. Hash-derived key weights, as in MuSig, prevent it.
See [Chapter 4](04-Threshold-Cryptography.md#46-multisignatures-rogue-keys-and-musig2).

**Rollup**
A system that executes transactions off the main chain and posts a new state root and the compressed transaction data to it. Optimistic rollups allow challenges by fraud proof; zero-knowledge rollups post a validity proof with each batch.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#1712-scaling-rollups-and-data-availability).

**ROS attack**
An attack on two-round Schnorr multi-signatures, threshold signatures and blind signatures: open many sessions at once, then combine the honest answers into a signature on a new message by solving the ROS problem. Practical since 2019, polynomial-time since 2021.
See [Chapter 4](04-Threshold-Cryptography.md#45-threshold-schnorr-and-frost).

## S

**Schnorr identification**
Schnorr's 1989 sigma protocol proving knowledge of $x$ with $y = g^x$: send $t = g^k$, receive a challenge $c$, answer $s = k + cx \bmod q$; the verifier checks $g^s = t\,y^c$.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#63-schnorr-identification-by-hand).

**Schnorr signature**
The Fiat-Shamir form of Schnorr identification: the signature is $(R, s)$ with $R = g^k$, $e = H(R, m)$ and $s = k + ex$. Ed25519 and Bitcoin's BIP 340 are Schnorr signatures.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#68-fiat-shamir-from-a-conversation-to-a-proof).

**Schwartz-Zippel lemma**
Two different polynomials of degree at most $d$ agree on at most $d$ points, so an identity that holds at one random point of a large field almost certainly holds everywhere.
See [Chapter 7](07-SNARKs.md#75-one-random-point-is-enough).

**SD-JWT**
Selective Disclosure for JSON Web Tokens (RFC 9901, 2025): the issuer signs salted hashes of each claim, and the holder reveals a claim by sending its salt and value. Verifiers can link presentations of the same token.
See [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md#1410-selective-disclosure-with-salted-hashes-sd-jwt).

**Secret ballot (Australian ballot)**
An official ballot printed by the government with every candidate, marked by the voter alone in a booth and folded before it goes into the box. Victoria and South Australia introduced it in 1856.
See [Chapter 16](16-Electronic-Voting.md#161-the-problem).

**Secure aggregation**
A protocol (Bonawitz and colleagues, Google, 2017) that lets a server learn the sum of many phones' updates in federated learning and nothing else, even when phones drop out. It hides inputs, not the sum, so it is paired with differential privacy.
See [Chapter 19](19-Differential-Privacy.md#1913-secure-aggregation-and-federated-learning).

**Secure multi-party computation (MPC)**
A way for several parties to compute a function of their private inputs so that each learns the output and nothing more than the output implies, with no trusted party ever holding the inputs.
See [Chapter 1](01-Computing-With-Secrets.md#11-the-problem).

**Security with abort**
The guarantee available against a dishonest majority: the adversary may learn the output and then stop the honest parties from getting it, but cannot learn anything else or change the result.
See [Chapter 1](01-Computing-With-Secrets.md#14-who-are-the-parties-and-what-might-they-do).

**Selective failure attack**
A cheating garbler offers, in the OT for one of the evaluator's input bits, a correct label for one value and garbage for the other, then learns the bit from whether the evaluation fails.
See [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md#910-when-the-parties-cheat).

**Selfish mining**
A mining strategy that keeps found blocks secret and releases them strategically so honest miners waste work; it pays above one third of the hash rate even when it never wins a tie.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#177-attacking-proof-of-work-selfish-mining-and-51).

**Semi-honest adversary**
An adversary whose corrupted parties follow the protocol exactly but study everything they saw afterward; also called honest but curious, or passive.
See [Chapter 1](01-Computing-With-Secrets.md#14-who-are-the-parties-and-what-might-they-do).

**Sensitivity**
The most a query's answer can change between neighboring databases, those differing in one person; it sets how much noise a mechanism must add. Sums must first clip each value to bound it.
See [Chapter 19](19-Differential-Privacy.md#197-the-laplace-mechanism).

**Shamir secret sharing**
Shamir's 1979 scheme: hide the secret as the constant term of a random polynomial of degree $t - 1$ over a finite field and give holder $i$ the value at $i$. Any $t$ shares rebuild it by interpolation; fewer reveal nothing.
See [Chapter 2](02-Secret-Sharing.md#23-shamirs-scheme-by-hand-over-gf97).

**Sharemind**
Cybernetica's three-server MPC system on additive shares (2008), used in Estonia's 2015 students-and-taxes study, which joined ten million tax records with over half a million education records.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#108-mpc-in-the-world).

**Sigma protocol**
A three-move proof (commitment, challenge, response) with completeness, special soundness and honest-verifier zero knowledge. Cramer named the family in 1996 after the Σ the three arrows trace.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#62-commit-challenge-response).

**Signal private contact discovery**
Signal's service, previewed in 2017, that tells a phone which of its contacts use Signal by running the lookup inside a remotely attested SGX enclave, so Signal does not see the address book.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#119-signals-private-contact-discovery).

**SimplePIR**
Henzinger and colleagues' 2023 single-server PIR from plain learning with errors: the client downloads a one-time hint, then each query costs the server about one pass over the database. DoublePIR shrinks the hint.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#1112-lattice-pir-and-live-caller-id-lookup).

**Simulator**
A program that, given only a party's input and output, produces fake views that look exactly like real ones. If one exists, the protocol taught that party nothing beyond its output; the same idea defines zero knowledge.
See [Chapter 1](01-Computing-With-Secrets.md#15-ideal-versus-real-what-secure-means).

**SLIP-39**
SatoshiLabs' 2017 standard for backing up a wallet's master secret as Shamir shares written as words, with checksums, two levels of group and member thresholds, and an optional passphrase.
See [Chapter 2](02-Secret-Sharing.md#28-slip-39-seed-shares-on-paper).

**Smart contract**
A program stored on a blockchain that runs automatically when called, holding and moving assets by its code; Ethereum (2015) made them general-purpose.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#179-smart-contracts-and-the-evm).

**SNARK**
A succinct non-interactive argument of knowledge: a proof that is tiny and fast to check whatever the size of the computation, needs no interaction, and shows that the prover knows a witness. A zk-SNARK is also zero knowledge.
See [Chapter 7](07-SNARKs.md#71-the-problem).

**Soundness error**
The probability that a cheating prover convinces the verifier of a false statement. Repeating a protocol drives it down exponentially.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#51-the-problem).

**SPDZ**
Damgård, Pastro, Smart and Zakarias's 2012 protocol, secure against a dishonest majority of malicious parties: triples are made with somewhat homomorphic encryption, and every shared value carries a share of an information-theoretic MAC under a secret shared key, which catches any change.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#106-spdz-catching-cheaters-with-macs).

**Special soundness**
The property that from two accepting transcripts with the same commitment and different challenges, an extractor can compute the witness.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#62-commit-challenge-response).

**STARK**
A proof system needing no setup and only hash functions: the computation becomes an execution trace interpolated as polynomials, committed with Merkle trees and checked with FRI. Plausibly post-quantum, with proofs of tens to hundreds of kilobytes.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#84-starks-from-a-computation-to-a-polynomial).

**State machine replication**
Running the same deterministic program on several machines over the same ordered list of inputs, so that agreeing on the list means agreeing on everything; the consensus problem for a ledger.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#171-the-problem).

**Statistical disclosure attack**
Danezis's 2003 attack: count, over many rounds, how often each recipient appears when the target sends compared with when it does not. Regular correspondents stand out; no mix design defeats it entirely.
See [Chapter 15](15-Anonymous-Communication.md#154-batching-and-the-attacks-on-it).

**Stealth address**
A published address $(A, B)$ from which each payer derives a fresh one-time key by a one-sided Diffie-Hellman exchange, so the ledger shows unrelated keys that only the recipient can recognize, with its view key, and spend, with its spend key.
See [Chapter 18](18-Privacy-on-Ledgers.md#186-stealth-addresses-a-fresh-key-for-every-payment).

**Structured reference string (SRS)**
Public parameters made from a hidden secret, such as encodings of the powers of a point $\tau$, shared by every prover and verifier. Its entries are related by the secret, unlike a string of random bits.
See [Chapter 7](07-SNARKs.md#76-hiding-the-point-reference-strings-and-pairings).

**Sumcheck protocol**
Lund, Fortnow, Karloff and Nisan's interactive protocol by which a prover convinces a verifier of the sum of a polynomial over many points, one variable per round; it lives on inside many modern proof systems.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#59-honest-verifiers-real-verifiers-and-proofs-beyond-np).

## T

**TFHE**
Chillotti, Gama, Georgieva and Izabachène's 2016 scheme over the torus, refining FHEW: a fast bootstrap after every gate, about 13 ms by 2017, and programmable bootstrapping that applies any lookup table to the message while refreshing it.
See [Chapter 12](12-Homomorphic-Encryption.md#1211-the-third-generation-gsw-fhew-and-tfhe).

**The DAO**
A crowd-funded venture fund run by an Ethereum contract in 2016, from which a reentrancy bug let an attacker move about 3.6 million ether on 17 June. A hard fork returned the ether; the unforked chain became Ethereum Classic.
See [Chapter 17](17-Consensus-and-Smart-Contracts.md#1710-when-contracts-break-the-dao-parity-and-the-bridges).

**Three-coloring proof**
A zero-knowledge proof that a graph can be colored with three colors: the prover commits to a randomly permuted coloring, the verifier picks an edge and the prover opens its two ends. Since three-coloring is NP-complete, it gives zero knowledge for all of NP.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#57-three-colors-and-sealed-boxes).

**Threshold cryptography**
Cryptography in which a key is shared among $n$ holders so that any $t$ of them can decrypt or sign, without the key ever being assembled in one place.
See [Chapter 4](04-Threshold-Cryptography.md#41-the-problem).

**Threshold decryption**
Decryption by any $t$ holders of key shares: each publishes a partial decryption, such as $c_1^{x_i}$ for ElGamal, and the parts are combined with Lagrange coefficients in the exponent, so the key is never rebuilt.
See [Chapter 4](04-Threshold-Cryptography.md#42-threshold-decryption-with-elgamal).

**Threshold ECDSA**
ECDSA signing by parties holding key shares. Because the signing equation multiplies secret values, it needs multiplicative-to-additive conversions with Paillier encryption and many zero-knowledge proofs (GG18, GG20, CGGMP).
See [Chapter 4](04-Threshold-Cryptography.md#48-threshold-ecdsa-and-how-it-broke).

**Threshold secret sharing**
Splitting a secret into $n$ shares so that any $t$ of them rebuild it and any $t - 1$ learn nothing at all about it, not even with unlimited computing power (information-theoretic security); a $(t, n)$ scheme.
See [Chapter 2](02-Secret-Sharing.md#21-the-problem).

**Tor**
The largest anonymity network, from 2002: low-latency onion routing over volunteer relays, with three-hop circuits, a consensus published by directory authorities, and onion services.
See [Chapter 15](15-Anonymous-Communication.md#158-from-the-naval-research-laboratory-to-tor).

**Tornado Cash**
An Ethereum mixer of 2019: a deposit adds a commitment to a Merkle tree, and a withdrawal from a fresh address proves with a SNARK that it knows some deposit's secrets, revealing a nullifier hash so the deposit cannot be withdrawn twice. Sanctioned by the US in 2022 and delisted in 2025.
See [Chapter 18](18-Privacy-on-Ledgers.md#1810-tornado-cash-a-mixer-made-of-code).

**Toxic waste**
The secrets used to build a SNARK's setup. Whoever keeps them can make proofs of false statements, such as minting coins in a payment system.
See [Chapter 7](07-SNARKs.md#79-trusted-setup-and-toxic-waste).

**Traffic correlation**
Linking a client to a destination by matching the timing and volume of traffic entering and leaving an anonymity network, without breaking any encryption.
See [Chapter 15](15-Anonymous-Communication.md#1512-traffic-correlation-and-fingerprinting).

**Traitor tracing**
Identifying at least one of the users whose keys went into a pirate decoder, by treating the decoder as a black box (Chor, Fiat and Naor, 1994).
See [Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md#138-broadcast-encryption-and-traitor-tracing).

**Transparent proof system**
A proof system with no secret setup: every shared parameter can be derived publicly, for example by hashing a string, so nobody can know a trapdoor.
See [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md#81-the-problem).

**Trusted execution environment (enclave)**
A region of memory that the processor encrypts and protects so that code outside it, the operating system included, cannot read or change it, as in Intel SGX. Through remote attestation the processor signs a report of which code is running inside.
See [Chapter 10](10-Multi-Party-Computation-in-Practice.md#109-the-shortcut-trusted-hardware).

**Trusted-setup ceremony**
A computation of public parameters, such as the powers of tau, in which each participant in turn mixes in a secret of its own. The result is safe if any one participant destroyed its secret: the 1-of-$N$ trust model.
See [Chapter 3](03-Commitments.md#37-trusted-setup-ceremonies).

**TSSHOCK**
Verichains' 2023 attacks, presented at Black Hat USA, on threshold ECDSA libraries whose weakened discrete-log proofs let one co-signer extract the whole key.
See [Chapter 4](04-Threshold-Cryptography.md#48-threshold-ecdsa-and-how-it-broke).

**tss-lib zero-index bug**
A flaw found by Trail of Bits in 2021 in Binance's tss-lib and its forks: a malicious participant could pick an index equal to zero modulo $q$ and be dealt the secret itself as its share.
See [Chapter 2](02-Secret-Sharing.md#211-where-secret-sharing-quietly-fails).

**Turnstile**
A transaction that moves value between Zcash pools in public. Consensus refuses any transaction that would make a pool's total negative, which bounds what counterfeit notes from a soundness flaw could take out.
See [Chapter 18](18-Privacy-on-Ledgers.md#189-zcash-hiding-the-whole-transaction).

**Two-hash Diffie-Hellman (2HashDH)**
The OPRF $F(k, x) = H_2(x, H_1(x)^k)$: the client blinds $H_1(x)$ with a random exponent $r$, the server raises the result to $k$, and the client removes $r$.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#115-oblivious-pseudorandom-functions).

**Two-server PIR**
Chor, Goldreich, Kushilevitz and Sudan's 1995 scheme: send a random subset of positions to one server and the same subset with position $i$ toggled to another; the XOR of their two answers is record $i$. Private if the servers do not collude.
See [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md#1110-private-information-retrieval-with-two-servers).

## U

**Under-constrained circuit**
A circuit that accepts witnesses its author never intended, usually because a value computed by a hint is not pinned down by constraints. The honest prover's tests all pass.
See [Chapter 7](07-SNARKs.md#710-circuit-bugs-when-the-proof-is-right-and-the-program-is-wrong).

**Universal composability (UC)**
Canetti's 2001 framework that asks for security in any environment, alongside any other protocols running at the same time. Most two-party tasks, commitments included, cannot be UC-secure without some setup.
See [Chapter 1](01-Computing-With-Secrets.md#111-going-deeper).

**Unlinkability**
The property that two actions cannot be tied to the same person, even when neither is tied to a name. Blind signatures and anonymous credentials aim for it.
See [Chapter 1](01-Computing-With-Secrets.md#17-what-privacy-means).

## V

**Vector commitment**
A commitment to a list that can be opened one position at a time, with position binding: no position can be opened to two different values. A Merkle tree is one.
See [Chapter 3](03-Commitments.md#35-merkle-trees-and-vector-commitments).

**Verifiable mix-net**
A chain of servers that each re-encrypt and shuffle the list of encrypted ballots and publish a proof that the output is a permutation of the input, so ballots of any format can be decrypted in public, unlinked from voters. One honest mix keeps them unlinked.
See [Chapter 16](16-Electronic-Voting.md#166-shuffling-encrypted-ballots-verifiable-mix-nets).

**Verifiable random function (VRF)**
A keyed function whose output on any input comes with a proof anyone can check against the public key. For each input only one output verifies, and outputs look random to everyone else. Micali, Rabin and Vadhan, 1999.
See [Chapter 4](04-Threshold-Cryptography.md#49-verifiable-random-functions).

**Verifiable secret sharing (VSS)**
Secret sharing in which every holder can check that its share is consistent with one well-defined secret, without learning the secret, so a cheating dealer is caught.
See [Chapter 2](02-Secret-Sharing.md#25-catching-a-cheating-dealer-feldmans-checks).

**Viewing key**
A Zcash key that shows payments without allowing spending: an incoming viewing key reveals notes received by an address, and a full viewing key also reveals outgoing payments, for an auditor.
See [Chapter 18](18-Privacy-on-Ledgers.md#189-zcash-hiding-the-whole-transaction).

## W

**Weak Fiat-Shamir**
Fiat-Shamir that hashes only the commitments, not the statement. It is unsound whenever the prover can choose the statement after seeing the challenge; strong Fiat-Shamir hashes the statement too.
See [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md#69-what-must-go-into-the-hash).

**Website fingerprinting**
Identifying the website a Tor user visits from the pattern of encrypted cells on the user's own connection, using a classifier trained on recorded visits.
See [Chapter 15](15-Anonymous-Communication.md#1512-traffic-correlation-and-fingerprinting).

**Witness**
A piece of information that makes a statement easy to check, such as the vertex renaming that turns one graph into another. NP is the class of statements that have short witnesses.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#53-what-a-proof-is-allowed-to-be).

**Witness indistinguishability**
The property that, when a statement has several witnesses, the transcript does not reveal which one the prover used (Feige and Shamir, 1990).
See [Chapter 5](05-Zero-Knowledge-Proofs.md#59-honest-verifiers-real-verifiers-and-proofs-beyond-np).

## Y

**Yao's millionaires' problem**
Andrew Yao's 1982 puzzle: two millionaires learn which of them is richer without revealing their fortunes. It started the study of secure two-party computation.
See [Chapter 1](01-Computing-With-Secrets.md#13-naive-protocols-and-what-they-leak).

## Z

**Zcash**
The coin launched in 2016 from the Zerocash design, whose shielded pools hide sender, receiver and amount behind a zero-knowledge proof, with the whole pool as the anonymity set; its Sprout, Sapling and Orchard pools used successively better proof systems.
See [Chapter 18](18-Privacy-on-Ledgers.md#189-zcash-hiding-the-whole-transaction).

**Zcash Sprout counterfeiting flaw**
A flaw in the setup of the SNARK variant used at Zcash's 2016 launch, found by Ariel Gabizon in March 2018: extra elements in the proving key would have let a cheater forge proofs and mint shielded coins unseen.
See [Chapter 7](07-SNARKs.md#79-trusted-setup-and-toxic-waste).

**Zero-knowledge proof**
A proof that convinces a verifier that a statement is true and reveals nothing else. Goldwasser, Micali and Rackoff (1985) defined it by three properties: completeness, soundness and zero knowledge.
See [Chapter 5](05-Zero-Knowledge-Proofs.md#51-the-problem).
