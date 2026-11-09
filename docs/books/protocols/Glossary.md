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

**ACME Renewal Information (ARI)**
An ACME extension (RFC 9773, 2025) by which a CA publishes a suggested renewal window for each certificate, so that a client renews early when asked and a mass revocation becomes a scheduled mass renewal.
See [Chapter 2](02-Certificates-and-PKI.md#26-lifetimes).

**Add hold-down**
The 30-day wait (RFC 5011) before a validator trusts a new root KSK; if the key is still in the root's DNSKEY set and validly signed when the timer ends, it becomes a trust anchor.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#108-rolling-keys-and-algorithms).

**Adiantum**
Google's wide-block disk encryption (2018) for cheap phones without AES instructions, built on the hash, block cipher, stream cipher, hash pattern (HBSH) from XChaCha12, one AES call and a fast hash.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#185-break-it-what-xts-does-not-protect).

**AEAD**
Authenticated encryption with associated data: one operation that encrypts and authenticates, and also authenticates header data sent in the clear.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#36-the-record-layer).

**age**
A small file-encryption format and tool (2019): one random file key, wrapped once for each recipient, and the file encrypted in authenticated chunks.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#182-age-one-file-key-many-recipients).

**Agent restriction**
OpenSSH's limits on a forwarded agent (OpenSSH 8.9, 2022): the agent learns which host each connection leads to and signs logins only for the hops the user allowed, matched by host key.
See [Chapter 6](06-SSH.md#67-channels-forwarding-and-the-agent).

**Anti-clogging token**
A token, bound to the sender's MAC address, that an access point under load returns to an SAE commit; the device must echo it before its costly commit is processed, much like WireGuard's cookie.
See [Chapter 9](09-Wi-Fi-Security.md#97-wpa3-personal-sae).

**ARC**
Authenticated Received Chain (RFC 8617): each intermediary that may change a message, such as a mailing list, signs what it saw on arrival, so that a receiver that trusts it can accept mail whose DMARC check now fails.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#1511-going-deeper).

**Attestation**
A signed statement from an authenticator about what kind of device made a key, which a relying party may check.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#136-attestation).

**Authenticated key exchange**
A key exchange in which each side also proves its identity, so that a man in the middle cannot sit between them.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#17-authenticated-key-exchange-signing-it-right).

**Authorization code flow**
The OAuth flow in which the browser carries only a short-lived code, and the application exchanges it for tokens directly with the server.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#142-the-authorization-code-flow).

**authPolicy**
The policy digest stored with a TPM-sealed object: not a list of rules but a hash chain over the policy commands and their values, such as the expected PCR values, which only a session meeting the same conditions reproduces.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#188-sealing-the-key-to-the-boot-worked-through).

## B

**Beacon protection**
A MIC on each beacon under a beacon integrity group key (IEEE 802.11-2020), so that an associated device can spot a forged beacon; Wi-Fi 7 certification requires it.
See [Chapter 9](09-Wi-Fi-Security.md#911-open-networks-and-management-frames).

**Bellare-Rogaway model**
The 1993 definition of secure key exchange as a game: the attacker runs the network through Send, Reveal, Corrupt and Test queries and must tell a fresh session's real key from a random string.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#209-proofs-by-games-the-bellare-rogaway-idea).

**BIMI**
Brand Indicators for Message Identification: a domain with a strict DMARC policy publishes its logo, usually with a certificate that the logo is its trademark, for mail clients to show. It adds nothing cryptographic.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#1510-in-the-real-world).

**BIP-32**
The standard (2012) that turns one seed into a tree of keys with HMAC-SHA512, each key with a chain code mixed into every derivation; paths such as m/86'/0'/0'/0/5 name the keys.
See [Chapter 19](19-Ledgers-Bitcoin.md#198-wallet-seeds-bip-39-words-and-bip-32-trees).

**BIP-39**
The standard (2013) that writes a wallet's entropy as 12 to 24 words from a list of 2,048, with a checksum, and turns the words and an optional passphrase into a BIP-32 seed with PBKDF2.
See [Chapter 19](19-Ledgers-Bitcoin.md#198-wallet-seeds-bip-39-words-and-bip-32-trees).

**Biscuit**
In Rosenpass, the responder's whole handshake state, encrypted under a key only the responder knows and returned by the initiator, so that the responder keeps nothing between messages; a counter stops an old biscuit being replayed.
See [Chapter 8](08-WireGuard-and-Noise.md#89-post-quantum-wireguard).

**Blast-RADIUS**
A 2024 attack (CVE-2024-3596) that turns a RADIUS Access-Reject into an Access-Accept with an MD5 chosen-prefix collision. The fix is to require the Message-Authenticator attribute, an HMAC over the whole packet, on every packet.
See [Chapter 9](09-Wi-Fi-Security.md#910-enterprise-8021x-and-eap).

**BPSec**
Security for the Bundle Protocol (RFC 9172): integrity and confidentiality blocks carried inside each bundle, with no handshake.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#207-delay-tolerant-networking-and-bpsec).

**Bronze Bit**
A 2020 attack (CVE-2020-17049) in which a compromised service flipped the forwardable flag of a ticket sealed under its own key, outside the signed PAC, to delegate as a protected user; fixed by a ticket signature under the krbtgt key.
See [Chapter 12](12-Kerberos.md#1211-delegation-acting-for-the-user).

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

**Chosen-prefix collision**
A hash collision between two messages that start with different prefixes of the attacker's choice; with SHA-1 it lets a certification of one OpenPGP key be copied onto another.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#154-trusting-a-key).

**Closest encloser**
In an NSEC3 denial, the longest ancestor of the queried name that exists; with the next closer name and the wildcard, it is one of the three facts that prove the name does not exist.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#105-proving-that-a-name-does-not-exist).

**CMS**
Cryptographic Message Syntax (RFC 5652): the signed and encrypted envelope used by S/MIME and many other formats.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#155-smime-and-cms).

**Commit**
In MLS, the message that applies a set of proposals and moves the whole group to a new epoch with fresh keys.
See [Chapter 17](17-Group-Messaging-MLS.md#175-proposals-commits-epochs).

**Commitment transaction**
In a Lightning channel, each side's own signed but unbroadcast transaction that pays out the current balances; whoever broadcasts an old, revoked one can lose their whole balance to the other side.
See [Chapter 19](19-Ledgers-Bitcoin.md#199-payment-channels-lightnings-commitments-and-revocation).

**Compact denial of existence**
An online signer's answer for a non-existent name: a freshly signed NSEC record that covers only that name, so nothing can be walked; the signing key must be on the server.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#105-proving-that-a-name-does-not-exist).

**Control block**
The part of a Taproot script-path spend that holds the leaf version, the parity of the output key, the internal key and the Merkle path from the script to the root.
See [Chapter 19](19-Ledgers-Bitcoin.md#197-taproot-spent-in-full).

**Cookie (anti-DoS)**
A value a server hands back before doing expensive work, so that only a client who can receive at its claimed address can make it work.
See [Chapter 8](08-WireGuard-and-Noise.md#87-silence-cookies-and-denial-of-service).

**Cross-certificate**
A certificate for an existing CA's name and key, signed by another, often older, CA, so that clients that trust only the older root can still build a chain; ISRG Root X1 was cross-signed this way by DST Root CA X3.
See [Chapter 2](02-Certificates-and-PKI.md#210-in-the-real-world).

**Cross-JWT confusion**
Accepting a JWT made for one purpose as another, such as an ID token as an access token; JWT access tokens declare their own type so that an API can refuse anything else.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1410-checking-an-id-token-step-by-step).

**Cryptokey routing**
WireGuard's rule that each peer's public key is tied to the IP addresses it may use, so routing and authentication are one table.
See [Chapter 8](08-WireGuard-and-Noise.md#86-cryptokey-routing).

**CTAP2**
The binary protocol of CBOR-encoded commands between a browser and a hardware authenticator, for making credentials, getting assertions and handling a PIN.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#137-talking-to-the-authenticator-ctap2).

## D

**DANE**
DNS-based Authentication of Named Entities (RFC 6698): a hash of a server's certificate or public key in a DNSSEC-signed TLSA record. Browsers never adopted it; mail servers use it to require TLS and check the receiving server's key.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#109-what-signed-dns-makes-possible).

**Data Protection class**
Apple's per-file setting for when a file's key is available, from Complete Protection, whose key is discarded soon after the device locks, to No Protection, guarded only by the device's hardware key.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#187-keys-in-hardware).

**DDR and DNR**
Two ways for a device to find an encrypted DNS resolver (RFC 9462 and RFC 9463, 2023): DDR asks the resolver it already knows which encrypted endpoints it offers, and DNR puts the encrypted resolver's name into DHCP.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#1011-private-dns-encrypting-the-questions).

**Decryption oracle**
An honest party used to decrypt for the attacker: it takes in a ciphertext meant for itself and sends some of the contents out under a key the attacker controls, as in Lowe's attack.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#203-lowes-attack-on-needham-schroeder).

**Delay-tolerant networking (DTN)**
Networking for links with long delays and gaps, where messages are stored and forwarded instead of carried over end-to-end connections.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#207-delay-tolerant-networking-and-bpsec).

**DKIM**
DomainKeys Identified Mail: a signature by the sending domain over an email's headers and body, checked with a key published in DNS.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#158-the-transports-own-signatures-spf-dkim-and-dmarc).

**DKIM2**
A proposed successor to DKIM, still IETF drafts as of November 2026, in which every hop signs and the signatures cover the envelope recipients, against both forwarding damage and DKIM replay, the resending of one signed message to millions.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#1511-going-deeper).

**DMARC**
A domain's published policy (none, quarantine or reject) for mail that fails its check, which passes only when SPF or DKIM passes for a domain aligned with the visible From address.
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

**DPoP**
Demonstrating Proof of Possession (RFC 9449): with each request the client sends a small JWT signed with its own key, and the access token names that key, so a stolen token is useless without the key.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#147-stolen-tokens-and-sender-constrained-tokens).

**Dragonblood**
Side-channel attacks (2019) on WPA3's first SAE implementations: the number of hunting-and-pecking iterations depended on the password, so timing or cache measurements let an attacker filter a dictionary offline.
See [Chapter 9](09-Wi-Fi-Security.md#98-dragonblood-saes-side-channels).

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

**EncryptedExtensions**
The server's first encrypted TLS 1.3 message, carrying the rest of its answers to the ClientHello, such as the application protocol chosen by ALPN and record size limits.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#32-the-handshake-at-a-glance).

**Epoch**
In MLS, one period of a group's life with a fixed membership and key; every commit starts a new one.
See [Chapter 17](17-Group-Messaging-MLS.md#175-proposals-commits-epochs).

**ESP**
Encapsulating Security Payload: the IPsec packet format that encrypts and authenticates IP traffic.
See [Chapter 7](07-IPsec-and-IKEv2.md#74-esp-packets).

**Extended KDC signature**
A signature over the whole PAC under the krbtgt key, added in November 2022 after an MD5 collision let a service add groups to a PAC while the older KDC signature still verified.
See [Chapter 12](12-Kerberos.md#1212-the-pac-under-attack-2021-to-2022).

**Extended public key (xpub)**
A BIP-32 public key with its chain code, from which anyone can compute every normal child public key, so that a server can hand out fresh addresses without a key that spends.
See [Chapter 19](19-Ledgers-Bitcoin.md#198-wallet-seeds-bip-39-words-and-bip-32-trees).

**External commit**
An MLS commit by which someone joins without a member's help, using the group's published GroupInfo and an HPKE key every member can derive; also the way back in for a device that lost its state.
See [Chapter 17](17-Group-Messaging-MLS.md#178-joining-from-outside-external-commits-and-pre-shared-keys).

## F

**FAST**
Flexible Authentication Secure Tunneling (RFC 6113), which Windows calls Kerberos armoring: the AS exchange runs in a tunnel whose armor key comes from a ticket the machine already has, so an eavesdropper has nothing to guess passwords against.
See [Chapter 12](12-Kerberos.md#1210-fast-a-tunnel-for-the-first-exchange).

**FIDO2**
The standards for passkeys: WebAuthn between site and browser, and CTAP2 between browser and authenticator.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#132-from-u2f-to-passkeys).

**File-based encryption (FBE)**
Android's encryption of files with per-file keys, which splits each user's storage into Device Encrypted storage, available at boot, and Credential Encrypted storage, available only after the first unlock.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#187-keys-in-hardware).

**Finished message**
The last handshake message in TLS, a MAC over the whole transcript, which proves that both sides saw the same conversation.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#35-proving-who-you-are-certificate-certificateverify-finished).

**Forward secrecy**
The property that stealing a long-term key later does not reveal the keys of past sessions.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#18-what-a-key-exchange-can-promise).

**FragAttacks**
A dozen flaws in Wi-Fi fragmentation and frame aggregation (2021), three of them in the 802.11 standard itself; the main one let an attacker flip an unauthenticated aggregation bit and inject packets.
See [Chapter 9](09-Wi-Fi-Security.md#912-frames-queues-and-names-fragattacks-to-airsnitch).

**Freshness**
The assurance that a message belongs to this run of a protocol and is not a replay, given by nonces, timestamps or counters.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#15-freshness-nonces-timestamps-and-counters).

## G

**GroupInfo**
A signed MLS object with the group's context, confirmation tag and external public key, which a member publishes so that outsiders can join by external commit; Welcome messages carry it too.
See [Chapter 17](17-Group-Messaging-MLS.md#178-joining-from-outside-external-commits-and-pre-shared-keys).

## H

**Handshake**
The opening messages of a protocol, in which the two sides agree on algorithms and keys and authenticate each other.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#32-the-handshake-at-a-glance).

**Hardened derivation**
A BIP-32 child derivation, written with a prime, that needs the parent's private key, so that it cannot be computed from an extended public key.
See [Chapter 19](19-Ledgers-Bitcoin.md#198-wallet-seeds-bip-39-words-and-bip-32-trees).

**Harvest now, decrypt later**
Keeping ciphertext today to decrypt it once a large quantum computer exists; it matters most for data stored for years, such as backups, and is why age added a post-quantum recipient.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#182-age-one-file-key-many-recipients).

**Hash-to-element (H2E)**
SAE's replacement for hunting and pecking (IEEE 802.11-2020): the SSID and password are hashed once into a fixed point, the password token, with no loop, and each connection multiplies it by a value from the two MAC addresses.
See [Chapter 9](09-Wi-Fi-Security.md#99-hash-to-element-sae-without-the-loop).

**Header encryption**
A variant of the double ratchet that encrypts each message header under a header key, so that an observer cannot link messages to one session, count them or see each change of direction.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#1610-late-lost-and-hidden-messages).

**hmac-secret**
A CTAP extension by which a credential returns an HMAC of a salt under a random value it keeps, so that the same credential and salt always give the same 32 bytes.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#139-the-prf-extension-a-passkey-that-makes-keys).

**HOTP and TOTP**
One-time codes made by an HMAC over a counter (HOTP) or over the current time step (TOTP).
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#112-from-hash-chains-to-hotp).

**HPKE**
Hybrid Public Key Encryption (RFC 9180): a KEM, a key schedule and an AEAD, used by MLS and Encrypted Client Hello.
See [Chapter 17](17-Group-Messaging-MLS.md#174-running-treekem).

**HSTS**
HTTP Strict Transport Security: a site's instruction to browsers to use only HTTPS with it, which defeats SSL stripping.
See [Chapter 5](05-TLS-in-Practice.md#57-https-in-the-browser-stripping-and-strict-transport-security).

**HTLC**
Hash time-locked contract: an output the payee can claim with the preimage of a hash, or the payer can take back after a time lock expires; it lets Lightning forward one payment across several channels.
See [Chapter 19](19-Ledgers-Bitcoin.md#1910-htlcs-paying-across-a-network-of-channels).

**Hybrid key exchange**
A key exchange that combines a classical and a post-quantum method, so the result is safe if either one holds.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#310-post-quantum-key-exchange).

**Hybrid transport**
The CTAP transport, from Google's caBLE, that lets a phone act as a security key for a nearby computer: a QR code starts it, a Bluetooth broadcast proves the phone is close, and an Internet relay carries the data.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#138-hybrid-a-phone-as-the-key-for-a-laptop).

## I

**Identity hiding**
How well a handshake keeps each side's static public key from observers. The Noise specification grades every pattern; IK, the pattern WireGuard uses, buys one round trip with some of the initiator's privacy.
See [Chapter 8](08-WireGuard-and-Noise.md#82-noise-key-exchanges-as-strings-of-tokens).

**IKE_INTERMEDIATE**
An IKEv2 exchange (RFC 9242) between IKE_SA_INIT and IKE_AUTH that carries an additional key exchange, such as ML-KEM, under the keys so far; each one updates the keys, and RFC 9370 allows up to seven.
See [Chapter 7](07-IPsec-and-IKEv2.md#79-post-quantum-ikev2).

**IKE_SA_INIT and IKE_AUTH**
IKEv2's two exchanges: IKE_SA_INIT agrees on algorithms and exchanges Diffie-Hellman shares and nonces in the clear; IKE_AUTH, encrypted under the resulting keys, carries each side's identity and AUTH value and sets up the first child SA.
See [Chapter 7](07-IPsec-and-IKEv2.md#73-ikev2-by-hand).

**IKEv2**
The key exchange protocol of IPsec, which authenticates the peers and sets up the security associations ESP uses.
See [Chapter 7](07-IPsec-and-IKEv2.md#73-ikev2-by-hand).

**Immediate decryption**
The property that each message can be decrypted the moment it arrives, whatever happened to earlier ones; its price is that keys for missing messages must be held, up to limits such as MAX_SKIP.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#1610-late-lost-and-hidden-messages).

## J

**JAR**
JWT-secured authorization requests (RFC 9101): the authorization parameters, signed by the client in a JWT called the request object, so that the server can tell nobody altered them in the browser.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1411-beyond-the-basic-flow-par-rar-and-token-exchange).

**JWT**
JSON Web Token: a signed (or encrypted) set of claims in JSON, used as an access or identity token.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#145-json-web-tokens-jws-jwe-and-jwk).

## K

**Kerberos**
A login protocol with a trusted key distribution center that issues tickets, so passwords never cross the network.
See [Chapter 12](12-Kerberos.md#122-three-exchanges).

**Key phase bit**
A bit in QUIC's short header, hidden by header protection, that a sender flips when it moves to the next packet keys; QUIC updates keys this way instead of with a KeyUpdate message.
See [Chapter 5](05-TLS-in-Practice.md#53-packet-protection-in-quic).

**Key rollover**
Replacing a DNSSEC key without breaking validation: a new ZSK is pre-published in the DNSKEY set before it signs, and a new KSK needs a new DS in the parent, published beside the old one (double-DS) or after the child signs with both keys (double-KSK).
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#108-rolling-keys-and-algorithms).

**Key schedule**
The fixed sequence of key derivations that turns a handshake's shared secrets into all the keys a protocol uses.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#34-the-key-schedule).

**Key separation**
Deriving a distinct key, with its own label, for each purpose and direction, so that one use cannot become an oracle for another.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#201-what-thirty-years-of-failures-teach).

**Key tag**
A 16-bit number computed from a DNSKEY's data, by which DS and RRSIG records name the key; it is short, so several keys can share one.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#103-dnssec-signatures-on-answers).

**Key-compromise impersonation**
Using a party's stolen private key to impersonate others to that party. OPAQUE's key exchange resists it: a thief with the client's key can pose as the client, not as the server.
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#1113-going-deeper).

**KeyPackage**
A signed, one-time MLS bundle of an HPKE init key, a leaf encryption key, a credential and a signature key, which lets a member add someone who is offline.
See [Chapter 17](17-Group-Messaging-MLS.md#175-proposals-commits-epochs).

**KeyTrap**
A 2024 denial of service on DNSSEC validators (CVE-2023-50387): a zone with many keys sharing one key tag and many signatures per record made a resolver perform millions of signature checks for a single query.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#106-when-validation-fails).

**KRACK**
The 2017 key reinstallation attacks on Wi-Fi, which made a device reuse nonces by replaying a handshake message.
See [Chapter 9](09-Wi-Fi-Security.md#96-krack-reinstalling-a-key).

## L

**Last-resort prekey**
A signed KEM prekey that a Signal user publishes for use once the one-time KEM prekeys run out, so that a PQXDH session can always start.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#168-post-quantum-signal).

**Lowe's attack**
Gavin Lowe's 1995 attack on the Needham-Schroeder public-key protocol, in which a dishonest user relays one run into another.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#203-lowes-attack-on-needham-schroeder).

**LUKS**
The Linux disk-encryption format: a header with several key slots, each unlocking the same master key.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#186-one-key-many-locks).

## M

**MacStealer**
A 2023 tool that defeats client isolation through access points' power-save queues: an insider reconnects with a victim's MAC address and receives frames meant for the victim.
See [Chapter 9](09-Wi-Fi-Security.md#912-frames-queues-and-names-fragattacks-to-airsnitch).

**Man in the middle**
An attacker who sits between two parties and runs a separate exchange with each, relaying or changing what they say.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#16-key-exchange-and-the-man-in-the-middle).

**Matching conversations**
Bellare and Rogaway's definition of partners: two sessions that sent and received the same messages in order, and so should accept the same key.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#209-proofs-by-games-the-bellare-rogaway-idea).

**Membership tag**
An HMAC under the epoch's membership key on an MLS PublicMessage, proving the sender knew this epoch's secrets; it stops a member removed in the last commit from slipping a proposal into the new epoch.
See [Chapter 17](17-Group-Messaging-MLS.md#177-messages-on-the-wire).

**Merkle tree**
A binary tree of hashes whose root commits to every leaf, so any one leaf can be proved with a short path.
See [Chapter 19](19-Ledgers-Bitcoin.md#195-proof-of-work-and-the-chain).

**ML-KEM Braid**
SPQR's key exchange, which splits an ML-KEM encapsulation key and ciphertext into four pieces (a header, the key vector, ct1 and ct2) that can be sent in small chunks.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#169-spqr-the-sparse-post-quantum-ratchet).

**MLS**
Messaging Layer Security (RFC 9420): end-to-end encrypted group messaging with a tree of keys that scales to large groups.
See [Chapter 17](17-Group-Messaging-MLS.md#172-a-tree-of-keys).

**Model checker**
A program that explores every reachable state of a model to find one that breaks a stated property.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#code-it-a-model-checker-finds-the-attack).

**MTA-STS**
A mail domain's policy, announced in DNS and served over HTTPS (RFC 8461), telling senders to deliver only over TLS to the listed MX hosts with valid certificates; it makes DANE's promise without DNSSEC.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#1010-dane-for-mail-worked-through).

**Mutual TLS**
TLS in which the client also presents a certificate, common between services inside one organization.
See [Chapter 5](05-TLS-in-Practice.md#56-mutual-tls-between-services).

## N

**nOAuth**
A 2023 flaw in applications that identified Microsoft Entra ID users by the email claim, which a tenant owner could set to any address, instead of by issuer and subject.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1410-checking-an-id-token-step-by-step).

**Noise framework**
A way to describe Diffie-Hellman handshakes as short strings of tokens, from which WireGuard's handshake is built.
See [Chapter 8](08-WireGuard-and-Noise.md#82-noise-key-exchanges-as-strings-of-tokens).

**Nonce**
A number used once: a fresh random value or counter that ties a message to one run, or keeps an encryption key from repeating.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#15-freshness-nonces-timestamps-and-counters).

**NSEC3**
DNSSEC's hashed proof that a name does not exist (RFC 5155): names are replaced by salted, iterated SHA-1 hashes and the records chain the hashes. Anyone can hash candidate names, so zone walking becomes a dictionary attack.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#105-proving-that-a-name-does-not-exist).

**Number matching**
A defense against push fatigue: the login page shows a two-digit number that the user must type into the approving app, which proves the user is looking at the login being approved.
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#115-how-codes-are-stolen).

## O

**OAuth 2.0**
A protocol for delegating limited access: a user lets an application act on an account without giving it the password.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#141-delegation-not-authentication).

**OAuth 2.1**
A consolidation of OAuth 2.0 and its security advice into one document, still a draft as of November 2026: PKCE is required, redirect URIs must match exactly, and the implicit and password grants are gone.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1412-refresh-tokens-and-oauth-21).

**Oblivious PRF (OPRF)**
A protocol in which a client gets a keyed function of its input, such as a password, without the server learning the input or the client learning the key; it is the core of OPAQUE, and RFC 9497 specifies it with verifiable and partially oblivious modes.
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#119-the-oblivious-prf-by-hand-and-by-the-rfc).

**OPAQUE**
A password-authenticated key exchange in which the server never sees the password, even at registration.
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#118-opaque-and-cpace).

**OpenID Connect**
An identity layer on top of OAuth that adds a signed ID token saying who the user is.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#144-openid-connect-adding-identity).

**OpenPGP**
The standard (RFC 9580) for encrypting and signing messages and files with public keys, used by GnuPG.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#152-what-travels-packets-and-certificates).

**Opt-out**
An NSEC3 flag that lets a record skip unsigned delegations, sparing large registries millions of records at the price that an attacker can slip a fake unsigned delegation into an opt-out gap.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#105-proving-that-a-name-does-not-exist).

**Otway-Rees protocol**
A 1987 key distribution protocol in which a trusted server gives two users a session key and each gets freshness from its own nonce, without clocks; a type flaw lets an attacker pass off fields sent in the clear as the key.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#208-a-second-target-otway-rees-and-the-type-flaw).

**OWE**
Opportunistic Wireless Encryption (RFC 8110), certified as Wi-Fi Enhanced Open: an unauthenticated Diffie-Hellman exchange during association that gives each device on an open network its own key. It stops passive eavesdropping, not a fake access point.
See [Chapter 9](09-Wi-Fi-Security.md#911-open-networks-and-management-frames).

**OWE transition mode**
An open network whose beacons point to a hidden OWE network, so that devices that know OWE move to it while old ones stay open; an attacker who strips the pointer leaves a device no worse off than before OWE.
See [Chapter 9](09-Wi-Fi-Security.md#911-open-networks-and-management-frames).

## P

**PAC (Privilege Attribute Certificate)**
The data Active Directory adds to every Kerberos ticket: the user's security identifier and group memberships, signed by the KDC, which services check against their access lists.
See [Chapter 12](12-Kerberos.md#125-code-it-a-whole-login).

**PAR**
Pushed authorization requests (RFC 9126): the client posts the authorization parameters directly to the server and gives the browser only a short-lived reference, so nothing in the browser can read or change them.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1411-beyond-the-basic-flow-par-rar-and-token-exchange).

**Partitioning oracle**
An attack (2021) built on crafted ciphertexts that decrypt under many keys at once; age guards against it by checking that a sealed file key is exactly 32 bytes, since such ciphertexts are long.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#182-age-one-file-key-many-recipients).

**Passkey**
A FIDO2 key pair kept by a device or password manager and used instead of a password; its signature is tied to the site's name.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#135-why-a-passkey-cannot-be-phished).

**Payment channel**
Two parties lock funds in one output and update who owns how much by exchanging signed but unbroadcast transactions, touching the chain again only to close; Lightning links channels into a network.
See [Chapter 19](19-Ledgers-Bitcoin.md#199-payment-channels-lightnings-commitments-and-revocation).

**PCR (platform configuration register)**
A TPM register into which each boot stage extends a hash of the next before running it. A key sealed to PCRs is released only if they hold the values they had at sealing, so a modified boot loader gets nothing.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#187-keys-in-hardware).

**PKCE**
Proof Key for Code Exchange: a secret made by the OAuth client so that a stolen authorization code is useless to anyone else.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#143-why-the-implicit-flow-died-and-pkce).

**PKINIT**
Kerberos login with a key pair and a certificate instead of a password (RFC 4556), as in smart-card logon and Windows Hello for Business; in its Diffie-Hellman mode a recorded login cannot be attacked offline.
See [Chapter 12](12-Kerberos.md#129-pkinit-a-key-pair-instead-of-a-password).

**Post-compromise security**
The property that a protocol heals after a key or state is stolen, once fresh randomness is mixed in.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#164-the-double-ratchet).

**PQXDH**
Signal's post-quantum version of X3DH (2023): Alice also encapsulates to one of Bob's signed KEM prekeys, and the shared secret is mixed into the key with the Diffie-Hellman results.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#168-post-quantum-signal).

**PRF extension**
The WebAuthn extension that exposes hmac-secret to web pages, so that a passkey can derive keys as well as sign, for example to unlock a password manager's vault or encrypt backups.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#139-the-prf-extension-a-passkey-that-makes-keys).

**Proof of work**
Finding a value whose hash is below a target, which takes many tries and lets anyone check the work with one hash.
See [Chapter 19](19-Ledgers-Bitcoin.md#195-proof-of-work-and-the-chain).

**Protected management frames (PMF)**
Encryption of unicast management frames, such as deauthentication, and authentication of broadcast ones (802.11w, 2009), so that they can no longer be forged; optional in WPA2 and mandatory in WPA3.
See [Chapter 9](09-Wi-Fi-Security.md#911-open-networks-and-management-frames).

**ProVerif and Tamarin**
Automatic tools that check secrecy and authentication of protocol models for any number of sessions.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#204-the-tools-and-what-they-proved).

**PSK (pre-shared key)**
A symmetric key both sides already hold, used to resume a session or to authenticate without certificates.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#38-resumption-psks-and-0-rtt-data).

**PSK binder**
An HMAC, under a key derived from a pre-shared key, over the ClientHello so far; it proves that the client holds the PSK and ties the PSK to this ClientHello.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#38-resumption-psks-and-0-rtt-data).

**PTLC**
Point time-locked contract: a proposed replacement for HTLCs that locks each hop to a different point, opened by an adaptor signature, so that hops of one payment cannot be linked; not deployed in the main implementations as of November 2026.
See [Chapter 19](19-Ledgers-Bitcoin.md#1910-htlcs-paying-across-a-network-of-channels).

**Public key pinning**
A client's list of hashes of the public keys it accepts for a site, any one of which must appear in the chain. Browsers gave up its HTTP header form, HPKP, after sites locked out their own visitors; mobile apps still pin.
See [Chapter 5](05-TLS-in-Practice.md#57-https-in-the-browser-stripping-and-strict-transport-security).

**PublicMessage and PrivateMessage**
MLS's two message formats: a PublicMessage leaves handshake content readable to the server, with a signature and membership tag; a PrivateMessage encrypts the content and signature under the sender's ratchet key and hides who sent it.
See [Chapter 17](17-Group-Messaging-MLS.md#177-messages-on-the-wire).

## Q

**QUIC**
A transport over UDP that builds TLS 1.3 into its handshake and encrypts almost all of its headers.
See [Chapter 5](05-TLS-in-Practice.md#52-how-quic-uses-tls).

## R

**RadSec**
RADIUS carried inside TLS (RFC 6614), so that the PMK no longer crosses the wired network protected only by RADIUS's shared secret, which is often short and rarely changed.
See [Chapter 9](09-Wi-Fi-Security.md#910-enterprise-8021x-and-eap).

**RAR**
Rich authorization requests (RFC 9396): a parameter holding typed JSON objects that grant something specific, such as one payment, where a scope string would grant a whole category.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1411-beyond-the-basic-flow-par-rar-and-token-exchange).

**Refresh-token rotation**
Issuing a new refresh token at every use and retiring the old one; if a retired token is presented again, two parties hold copies, so the server revokes the whole family.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1412-refresh-tokens-and-oauth-21).

**Replay**
Sending a recorded message again, unchanged, in the hope that it is accepted a second time.
See [Chapter 1](01-What-a-Protocol-Must-Do.md#15-freshness-nonces-timestamps-and-counters).

**Resumption PSK**
A secret from an earlier MLS epoch fed into a group's key schedule, proving that its members were in that epoch; it ties a reinitialized group (for example on a new cipher suite) or a branched subgroup to the original.
See [Chapter 17](17-Group-Messaging-MLS.md#178-joining-from-outside-external-commits-and-pre-shared-keys).

**Revocation**
Withdrawing a certificate before it expires, by lists or online queries; slow and often skipped, which is why lifetimes keep shrinking.
See [Chapter 2](02-Certificates-and-PKI.md#27-revocation-and-why-it-mostly-failed).

**Rosenpass**
A post-quantum handshake (2023) that runs beside an unmodified WireGuard, using Classic McEliece and Kyber, and writes a new pre-shared key into WireGuard every two minutes.
See [Chapter 8](08-WireGuard-and-Noise.md#89-post-quantum-wireguard).

## S

**S/MIME**
Signed and encrypted email with X.509 certificates and CMS, built into most mail clients.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#155-smime-and-cms).

**S4U2Self and S4U2Proxy**
Microsoft's Kerberos extensions for delegation: with S4U2Self a service gets a ticket to itself in a user's name, and with S4U2Proxy it presents a user's ticket as evidence to get a ticket to another service in that user's name.
See [Chapter 12](12-Kerberos.md#1211-delegation-acting-for-the-user).

**SAE**
Simultaneous Authentication of Equals, WPA3's password-based key exchange, which stops offline guessing from a captured handshake.
See [Chapter 9](09-Wi-Fi-Security.md#97-wpa3-personal-sae).

**Safety number**
A number made from two Signal users' identity keys, which they compare to rule out a man in the middle.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#166-safety-numbers).

**Sealed sender**
Signal's way (2018) of hiding the sender from its own server: the message and a short-lived sender certificate travel in an envelope encrypted to the recipient, so the server sees only the recipient.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#167-sealed-sender-and-metadata).

**SegWit**
Segregated Witness (BIP-141, 2017): signatures move out of the data hashed for the txid into a separate witness, covered instead by the wtxid, which ends transaction malleability and made payment channels practical.
See [Chapter 19](19-Ledgers-Bitcoin.md#194-malleability-and-segwit).

**Session ticket encryption key (STEK)**
The key, shared by every server in a cluster, that encrypts stateless resumption tickets; whoever steals it opens every ticket issued under it and can impersonate the server to clients holding one.
See [Chapter 5](05-TLS-in-Practice.md#58-configuring-and-testing-a-server).

**Sighash**
The hash a Bitcoin signature actually signs, which defines which parts of a transaction the signature covers.
See [Chapter 19](19-Ledgers-Bitcoin.md#193-what-a-signature-covers).

**Simplified SWU**
The map of RFC 9380 that turns any field element into a curve point in a fixed sequence of operations, with no loop for a timer to measure; OPRFs and Wi-Fi's hash-to-element use it.
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#119-the-oblivious-prf-by-hand-and-by-the-rfc).

**SKEYSEED**
The seed of IKEv2's key schedule: a prf keyed with the two nonces over the Diffie-Hellman secret, from which prf+ expands the keys of the IKE SA.
See [Chapter 7](07-IPsec-and-IKEv2.md#73-ikev2-by-hand).

**SPF**
Sender Policy Framework: a domain's list in DNS of the IP addresses allowed to send its mail. It is not cryptographic, and it breaks when mail is forwarded.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#158-the-transports-own-signatures-spf-dkim-and-dmarc).

**SPIFFE**
A standard for service identity in mutual TLS: each workload has a SPIFFE ID (spiffe://, a trust domain and a path) carried in an X.509-SVID certificate and checked only against its trust domain's bundle. SPIRE is the reference implementation.
See [Chapter 5](05-TLS-in-Practice.md#56-mutual-tls-between-services).

**SPQR**
The Sparse Post-Quantum Ratchet (Signal, 2025): a fresh ML-KEM secret every few dozen messages, paid for in small erasure-coded chunks on ordinary messages. Run beside the double ratchet, it makes the Triple Ratchet.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#169-spqr-the-sparse-post-quantum-ratchet).

**SSH**
The Secure Shell protocol for remote logins and file transfer: a transport layer, user authentication, and channels.
See [Chapter 6](06-SSH.md#62-three-layers).

**SSID confusion**
A 2024 attack (CVE-2023-52424) that relays one network under another's name when the two share credentials, because many Wi-Fi logins do not tie the network name to the keys; hash-to-element resists it.
See [Chapter 9](09-Wi-Fi-Security.md#912-frames-queues-and-names-fragattacks-to-airsnitch).

**STARTTLS downgrade**
Deleting a mail server's plaintext offer of STARTTLS, so that the sending server delivers in the clear; DANE and MTA-STS stop it.
See [Chapter 10](10-DNSSEC-and-Private-DNS.md#1010-dane-for-mail-worked-through).

**Static CT API**
The specification for tiled Certificate Transparency logs, which serve the whole tree as plain, cacheable files (tiles of hashes and a signed checkpoint), so that clients compute the proofs themselves.
See [Chapter 2](02-Certificates-and-PKI.md#28-certificate-transparency).

**Strict key exchange**
OpenSSH's fix for Terrapin (OpenSSH 9.6, December 2023): sequence numbers reset to zero after each NEWKEYS, and any unexpected message during the initial key exchange is fatal. Both sides must support it.
See [Chapter 6](06-SSH.md#610-attacks).

**Symbolic model**
Protocol analysis in which messages are terms, not bits, and cryptography is assumed perfect; it finds logic flaws.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#202-modeling-a-protocol-and-its-attacker).

**Synthetic password**
A random Android value that never changes, protected by the lock-screen credential and a hardware check (Weaver or Gatekeeper); the Credential Encrypted key is wrapped under a secret derived from it, so a new PIN rewraps only the synthetic password.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#187-keys-in-hardware).

## T

**Taproot**
Bitcoin's 2021 upgrade to Schnorr signatures and hidden spending scripts (BIP-340 to 342).
See [Chapter 19](19-Ledgers-Bitcoin.md#196-schnorr-and-taproot).

**Terrapin**
A 2023 attack on SSH (CVE-2023-48795) that inserts one harmless message during the unencrypted handshake and deletes the first encrypted one, because the exchange hash did not cover the packet sequence numbers.
See [Chapter 6](06-SSH.md#610-attacks).

**Ticket**
In Kerberos, a message encrypted for a service that carries a session key and the client's identity.
See [Chapter 12](12-Kerberos.md#122-three-exchanges).

**Tight reduction**
A security proof that loses no factor of the number of sessions when it turns an attacker on the protocol into one on the underlying problem; a loose reduction can leave a much weaker promise.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#209-proofs-by-games-the-bellare-rogaway-idea).

**Token exchange**
An OAuth grant (RFC 8693) by which a service trades a user's token for a new one for another service, narrowed in audience and scope, instead of forwarding the user's token.
See [Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md#1411-beyond-the-basic-flow-par-rar-and-token-exchange).

**Traffic selector**
The part of a child SA request that names the traffic it should carry: an address range, a port range and a protocol. A responder may accept, refuse or narrow the selectors, never widen them.
See [Chapter 7](07-IPsec-and-IKEv2.md#712-child-sas-traffic-selectors-rekeying-and-collisions).

**Transcript hash**
A running hash of every handshake message, signed and MACed at the end so that any change by an attacker is detected.
See [Chapter 3](03-TLS-1.3-Message-by-Message.md#35-proving-who-you-are-certificate-certificateverify-finished).

**TreeKEM**
MLS's tree of key pairs, in which a member updates the keys on its path to the root and encrypts each new secret to one subtree.
See [Chapter 17](17-Group-Messaging-MLS.md#174-running-treekem).

**Trust on first use**
Accepting a key the first time it is seen and warning if it later changes, as SSH does with host keys.
See [Chapter 6](06-SSH.md#65-trusting-the-server).

**Two-for-one guess**
An attack on early versions of SRP in which a fake server tests two passwords in one run by sending the sum of two verifiers; SRP-6 (2002) closed it by changing how the server's value is computed.
See [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md#117-srp).

**Type flaw**
A receiver accepting fields of one type as another, such as a run identifier and two names as a key; tagging fields so that messages are encoded unambiguously fixes it.
See [Chapter 20](20-Designing-and-Verifying-Protocols.md#208-a-second-target-otway-rees-and-the-type-flaw).

## U

**UTXO**
An unspent transaction output: an amount locked by a script, which Bitcoin keeps instead of account balances.
See [Chapter 19](19-Ledgers-Bitcoin.md#192-coins-locked-by-scripts).

## W

**Watchtower**
A service that holds a Lightning node's encrypted penalty transactions and can decrypt and use one only when the matching revoked commitment appears, for nodes that may be offline too long.
See [Chapter 19](19-Ledgers-Bitcoin.md#199-payment-channels-lightnings-commitments-and-revocation).

**Web of trust**
OpenPGP's model in which users sign each other's keys, instead of relying on certificate authorities.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#154-trusting-a-key).

**WebAuthn**
The W3C browser API through which sites create and use passkeys.
See [Chapter 13](13-Passkeys-FIDO2-and-WebAuthn.md#133-registration-and-login).

**Welcome**
The MLS message that brings new members into a group, encrypted with HPKE to the init key in each one's KeyPackage and carrying the joiner secret and the group's state.
See [Chapter 17](17-Group-Messaging-MLS.md#175-proposals-commits-epochs).

**Wide-block encryption**
Disk encryption that treats a whole sector as one block, so that any change anywhere randomizes the whole sector, unlike narrow-block XTS, which works 16 bytes at a time.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#185-break-it-what-xts-does-not-protect).

**WireGuard**
A VPN protocol with a fixed set of algorithms, a one-round-trip Noise handshake and no negotiation.
See [Chapter 8](08-WireGuard-and-Noise.md#83-the-wireguard-handshake-by-hand).

**Witness program**
The form of a SegWit output: a version and a short push, such as a 20-byte key hash (P2WPKH), a 32-byte script hash (P2WSH) or a 32-byte Taproot key.
See [Chapter 19](19-Ledgers-Bitcoin.md#194-malleability-and-segwit).

**WKD**
Web Key Directory: OpenPGP keys published on the domain's own web server, at a URL derived from the hashed local part of the address, so that the domain vouches for its users.
See [Chapter 15](15-Email-OpenPGP-and-SMIME.md#154-trusting-a-key).

## X

**X3DH**
Signal's original key agreement, which combines several Diffie-Hellman results with keys left on the server so that the first message can be sent to someone offline.
See [Chapter 16](16-Signal-and-the-Double-Ratchet.md#163-x3dh-by-hand).

**XTS**
The block-cipher mode used for disk sectors, which encrypts each block with a tweak from its position but cannot add a tag.
See [Chapter 18](18-Encrypting-Files-and-Disks.md#184-why-disks-are-different).
