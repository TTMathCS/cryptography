# Glossary

*Short definitions of the protocol terms this book uses most, from A to Z, each with a link to the chapter and section that explains it.*

## 0-9

**0-RTT data**
Application data a TLS 1.3 or QUIC client sends with its first message, using a key from an earlier session; fast, but it can be replayed.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#38-resumption-psks-and-0-rtt-data).

## A

**ACME**
The protocol (RFC 8555) by which a server proves it controls a domain name and gets a certificate automatically, as Let's Encrypt does.
See [Chapter 2](02-Certificates-and-PKI.md#25-proving-you-own-a-name-domain-validation-and-acme).

**AEAD**
Authenticated encryption with associated data: one operation that encrypts and authenticates, and also authenticates header data sent in the clear.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#36-the-record-layer).

**age**
A small file-encryption format and tool (2019): one random file key, wrapped once for each recipient, and the file encrypted in authenticated chunks.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#182-age-one-file-key-many-recipients).

**Attestation**
A signed statement from an authenticator about what kind of device made a key, which a relying party may check.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#136-attestation).

**Authenticated key exchange**
A key exchange in which each side also proves its identity, so that a man in the middle cannot sit between them.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#17-authenticated-key-exchange-signing-it-right).

**Authorization code flow**
The OAuth flow in which the browser carries only a short-lived code, and the application exchanges it for tokens directly with the server.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#142-the-authorization-code-flow).

## B

**BPSec**
Security for the Bundle Protocol (RFC 9172): integrity and confidentiality blocks carried inside each bundle, with no handshake.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#207-delay-tolerant-networking-and-bpsec).

**Bundle**
The self-contained message of delay-tolerant networking, stored at each node until the next contact and then forwarded.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#207-delay-tolerant-networking-and-bpsec).

## C

**Certificate**
A signed statement binding a public key to a name, with a validity period and limits on its use.
See [Chapter 2](02-Certificates-and-PKI.md#22-what-a-certificate-says).

**Certificate Transparency**
Public, append-only logs of every certificate issued, so that a wrongly issued certificate can be noticed by the name's owner.
See [Chapter 2](02-Certificates-and-PKI.md#28-certificate-transparency).

**Chain of trust**
The path of certificates from a server's certificate up to a root that the client already trusts.
See [Chapter 2](02-Certificates-and-PKI.md#23-chains-and-how-they-are-checked).

**CMS**
Cryptographic Message Syntax (RFC 5652): the signed and encrypted envelope used by S/MIME and many other formats.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#155-smime-and-cms).

**Commit**
In MLS, the message that applies a set of proposals and moves the whole group to a new epoch with fresh keys.
See [Chapter 17](17-Group-Messaging-MLS.md#175-proposals-commits-epochs).

**Cookie (anti-DoS)**
A value a server hands back before doing expensive work, so that only a client who can receive at its claimed address can make it work.
See [Chapter 8](08-WireGuard-and-Noise.md#87-silence-cookies-and-denial-of-service).

**Cryptokey routing**
WireGuard's rule that each peer's public key is tied to the IP addresses it may use, so routing and authentication are one table.
See [Chapter 8](08-WireGuard-and-Noise.md#86-cryptokey-routing).

## D

**Delay-tolerant networking (DTN)**
Networking for links with long delays and gaps, where messages are stored and forwarded instead of carried over end-to-end connections.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#207-delay-tolerant-networking-and-bpsec).

**DKIM**
DomainKeys Identified Mail: a signature by the sending domain over an email's headers and body, checked with a key published in DNS.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#158-the-transports-own-signatures-spf-dkim-and-dmarc).

**DNSSEC**
Signatures on DNS answers, chained from the root zone down, so that a resolver can tell a real answer from a forged one.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#103-dnssec-signatures-on-answers).

**Dolev-Yao attacker**
The attacker of symbolic protocol analysis: it controls the network and can be a legitimate user, but cannot break the cryptography.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#202-modeling-a-protocol-and-its-attacker).

**Double Ratchet**
Signal's algorithm that derives a new key for every message and mixes in new Diffie-Hellman results as the conversation goes back and forth.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#164-the-double-ratchet).

**Double spending**
Spending the same digital coin twice, the problem a shared ledger such as Bitcoin's exists to prevent.
See [Chapter 19](19-Ledgers-Bitcoin.md#191-the-double-spend-problem).

**Downgrade attack**
An attack that edits a negotiation so that both sides agree on a weaker option than they both support.
See [Chapter 4](04-Thirty-Years-of-TLS-Attacks.md#45-negotiation-and-downgrade).

**DTLS**
TLS adapted to datagrams, with its own retransmission and record numbers, for protocols that cannot use a stream.
See [Chapter 5](05-TLS-in-Practice.md#55-dtls-tls-for-datagrams).

## E

**EFAIL**
The 2018 attacks that made mail clients leak decrypted OpenPGP and S/MIME messages through altered ciphertexts and HTML.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#156-break-it-efail).

**Encrypted Client Hello (ECH)**
A TLS extension that encrypts the client's first message, including the name of the site it wants, under a key published in DNS.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#39-encrypted-client-hello).

**Epoch**
In MLS, one period of a group's life with a fixed membership and key; every commit starts a new one.
See [Chapter 17](17-Group-Messaging-MLS.md#175-proposals-commits-epochs).

**ESP**
Encapsulating Security Payload: the IPsec packet format that encrypts and authenticates IP traffic.
See [Chapter 7](07-IPsec-and-IKEv2.md#74-esp-packets).

## F

**FIDO2**
The standards for passkeys: WebAuthn between site and browser, and CTAP2 between browser and authenticator.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#132-from-u2f-to-passkeys).

**Finished message**
The last handshake message in TLS, a MAC over the whole transcript, which proves that both sides saw the same conversation.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#35-proving-who-you-are-certificate-certificateverify-finished).

**Forward secrecy**
The property that stealing a long-term key later does not reveal the keys of past sessions.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#18-what-a-key-exchange-can-promise).

**Freshness**
The assurance that a message belongs to this run of a protocol and is not a replay, given by nonces, timestamps or counters.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#15-freshness-nonces-timestamps-and-counters).

## H

**Handshake**
The opening messages of a protocol, in which the two sides agree on algorithms and keys and authenticate each other.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#32-the-handshake-at-a-glance).

**HOTP and TOTP**
One-time codes made by an HMAC over a counter (HOTP) or over the current time step (TOTP).
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#112-from-hash-chains-to-hotp).

**HPKE**
Hybrid Public Key Encryption (RFC 9180): a KEM, a key schedule and an AEAD, used by MLS and Encrypted Client Hello.
See [Chapter 17](17-Group-Messaging-MLS.md#174-running-treekem).

**HSTS**
HTTP Strict Transport Security: a site's instruction to browsers to use only HTTPS with it, which defeats SSL stripping.
See [Chapter 5](05-TLS-in-Practice.md#57-https-in-the-browser-stripping-and-strict-transport-security).

**Hybrid key exchange**
A key exchange that combines a classical and a post-quantum method, so the result is safe if either one holds.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#310-post-quantum-key-exchange).

## I

**IKEv2**
The key exchange protocol of IPsec, which authenticates the peers and sets up the security associations ESP uses.
See [Chapter 7](07-IPsec-and-IKEv2.md#73-ikev2-by-hand).

## J

**JWT**
JSON Web Token: a signed (or encrypted) set of claims in JSON, used as an access or identity token.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#145-json-web-tokens-jws-jwe-and-jwk).

## K

**Kerberos**
A login protocol with a trusted key distribution center that issues tickets, so passwords never cross the network.
See [Chapter 12](12-Kerberos.md#122-three-exchanges).

**Key schedule**
The fixed sequence of key derivations that turns a handshake's shared secrets into all the keys a protocol uses.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#34-the-key-schedule).

**Key separation**
Deriving a distinct key, with its own label, for each purpose and direction, so that one use cannot become an oracle for another.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#201-what-thirty-years-of-failures-teach).

**KRACK**
The 2017 key reinstallation attacks on Wi-Fi, which made a device reuse nonces by replaying a handshake message.
See [Chapter 9](09-Wi-Fi-Security.md#96-krack-reinstalling-a-key).

## L

**Lowe's attack**
Gavin Lowe's 1995 attack on the Needham-Schroeder public-key protocol, in which a dishonest user relays one run into another.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#203-lowes-attack-on-needham-schroeder).

**LUKS**
The Linux disk-encryption format: a header with several key slots, each unlocking the same master key.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#186-one-key-many-locks).

## M

**Man in the middle**
An attacker who sits between two parties and runs a separate exchange with each, relaying or changing what they say.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#16-key-exchange-and-the-man-in-the-middle).

**Merkle tree**
A binary tree of hashes whose root commits to every leaf, so any one leaf can be proved with a short path.
See [Chapter 19](19-Ledgers-Bitcoin.md#195-proof-of-work-and-the-chain).

**MLS**
Messaging Layer Security (RFC 9420): end-to-end encrypted group messaging with a tree of keys that scales to large groups.
See [Chapter 17](17-Group-Messaging-MLS.md#172-a-tree-of-keys).

**Model checker**
A program that explores every reachable state of a model to find one that breaks a stated property.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#code-it-a-model-checker-finds-the-attack).

**Mutual TLS**
TLS in which the client also presents a certificate, common between services inside one organization.
See [Chapter 5](05-TLS-in-Practice.md#56-mutual-tls-between-services).

## N

**Noise framework**
A way to describe Diffie-Hellman handshakes as short strings of tokens, from which WireGuard's handshake is built.
See [Chapter 8](08-WireGuard-and-Noise.md#82-noise-key-exchanges-as-strings-of-tokens).

**Nonce**
A number used once: a fresh random value or counter that ties a message to one run, or keeps an encryption key from repeating.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#15-freshness-nonces-timestamps-and-counters).

## O

**OAuth 2.0**
A protocol for delegating limited access: a user lets an application act on an account without giving it the password.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#141-delegation-not-authentication).

**OPAQUE**
A password-authenticated key exchange in which the server never sees the password, even at registration.
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#118-opaque-and-cpace).

**OpenID Connect**
An identity layer on top of OAuth that adds a signed ID token saying who the user is.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#144-openid-connect-adding-identity).

**OpenPGP**
The standard (RFC 9580) for encrypting and signing messages and files with public keys, used by GnuPG.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#152-what-travels-packets-and-certificates).

## P

**Passkey**
A FIDO2 key pair kept by a device or password manager and used instead of a password; its signature is tied to the site's name.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#135-why-a-passkey-cannot-be-phished).

**PKCE**
Proof Key for Code Exchange: a secret made by the OAuth client so that a stolen authorization code is useless to anyone else.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#143-why-the-implicit-flow-died-and-pkce).

**Post-compromise security**
The property that a protocol heals after a key or state is stolen, once fresh randomness is mixed in.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#164-the-double-ratchet).

**Proof of work**
Finding a value whose hash is below a target, which takes many tries and lets anyone check the work with one hash.
See [Chapter 19](19-Ledgers-Bitcoin.md#195-proof-of-work-and-the-chain).

**ProVerif and Tamarin**
Automatic tools that check secrecy and authentication of protocol models for any number of sessions.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#204-the-tools-and-what-they-proved).

**PSK (pre-shared key)**
A symmetric key both sides already hold, used to resume a session or to authenticate without certificates.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#38-resumption-psks-and-0-rtt-data).

## Q

**QUIC**
A transport over UDP that builds TLS 1.3 into its handshake and encrypts almost all of its headers.
See [Chapter 5](05-TLS-in-Practice.md#52-how-quic-uses-tls).

## R

**Replay**
Sending a recorded message again, unchanged, in the hope that it is accepted a second time.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#15-freshness-nonces-timestamps-and-counters).

**Revocation**
Withdrawing a certificate before it expires, by lists or online queries; slow and often skipped, which is why lifetimes keep shrinking.
See [Chapter 2](02-Certificates-and-PKI.md#27-revocation-and-why-it-mostly-failed).

## S

**S/MIME**
Signed and encrypted email with X.509 certificates and CMS, built into most mail clients.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#155-smime-and-cms).

**SAE**
Simultaneous Authentication of Equals, WPA3's password-based key exchange, which stops offline guessing from a captured handshake.
See [Chapter 9](09-Wi-Fi-Security.md#97-wpa3-personal-sae).

**Safety number**
A number made from two Signal users' identity keys, which they compare to rule out a man in the middle.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#166-safety-numbers).

**Sighash**
The hash a Bitcoin signature actually signs, which defines which parts of a transaction the signature covers.
See [Chapter 19](19-Ledgers-Bitcoin.md#193-what-a-signature-covers).

**SSH**
The Secure Shell protocol for remote logins and file transfer: a transport layer, user authentication, and channels.
See [Chapter 6](06-SSH.md#62-three-layers).

**Symbolic model**
Protocol analysis in which messages are terms, not bits, and cryptography is assumed perfect; it finds logic flaws.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#202-modeling-a-protocol-and-its-attacker).

## T

**Taproot**
Bitcoin's 2021 upgrade to Schnorr signatures and hidden spending scripts (BIP-340 to 342).
See [Chapter 19](19-Ledgers-Bitcoin.md#196-schnorr-and-taproot).

**Ticket**
In Kerberos, a message encrypted for a service that carries a session key and the client's identity.
See [Chapter 12](12-Kerberos.md#122-three-exchanges).

**Transcript hash**
A running hash of every handshake message, signed and MACed at the end so that any change by an attacker is detected.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#35-proving-who-you-are-certificate-certificateverify-finished).

**TreeKEM**
MLS's tree of key pairs, in which a member updates the keys on its path to the root and encrypts each new secret to one subtree.
See [Chapter 17](17-Group-Messaging-MLS.md#174-running-treekem).

**Trust on first use**
Accepting a key the first time it is seen and warning if it later changes, as SSH does with host keys.
See [Chapter 6](06-SSH.md#65-trusting-the-server).

## U

**UTXO**
An unspent transaction output: an amount locked by a script, which Bitcoin keeps instead of account balances.
See [Chapter 19](19-Ledgers-Bitcoin.md#192-coins-locked-by-scripts).

## W

**Web of trust**
OpenPGP's model in which users sign each other's keys, instead of relying on certificate authorities.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#154-trusting-a-key).

**WebAuthn**
The W3C browser API through which sites create and use passkeys.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#133-registration-and-login).

**WireGuard**
A VPN protocol with a fixed set of algorithms, a one-round-trip Noise handshake and no negotiation.
See [Chapter 8](08-WireGuard-and-Noise.md#83-the-wireguard-handshake-by-hand).

## X

**X3DH**
Signal's original key agreement, which combines several Diffie-Hellman results with keys left on the server so that the first message can be sent to someone offline.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#163-x3dh-by-hand).

**XTS**
The block-cipher mode used for disk sectors, which encrypts each block with a tweak from its position but cannot add a tag.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#184-why-disks-are-different).
