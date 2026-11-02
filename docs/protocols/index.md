# Protocols

*The same algorithms from the [main table](../index.md), seen from the other
side: what each popular protocol or tool actually runs.*

Every protocol name opens its own page.

## Standard and implementations

| Protocol | Standard | Implementations |
|---|---|---|
| [SSH](SSH.md) | RFC 4251–4254 (2006) | OpenSSH, PuTTY, libssh, Dropbear |
| [TLS 1.3](TLS-1.3.md) / QUIC | RFC 8446 (2018), RFC 9001 (2021) | OpenSSL, BoringSSL, NSS, rustls, GnuTLS, SChannel |
| [PKI](PKI.md) / [X.509](../formats/X.509.md) | RFC 5280 (2008), CA/B Forum BRs (2012), CT RFC 6962 (2013), ACME RFC 8555 (2019); PEM RFC 7468 (2015), PKCS#12 RFC 7292 (2014) | OpenSSL, Let's Encrypt (Boulder), step-ca, EJBCA, AD CS |
| [OpenPGP](OpenPGP.md) | RFC 9580 (2024), RFC 4880 (2007); post-quantum RFC 9980 (2026) | GnuPG (follows its own LibrePGP draft), Sequoia, OpenPGP.js |
| [S/MIME](S-MIME.md) | RFC 8551 (2019), CMS RFC 5652 (2009); ML-KEM RFC 9936 (2026) | Outlook, Apple Mail, Thunderbird, gpgsm, OpenSSL |
| [WireGuard](WireGuard.md) | whitepaper (2017), Noise framework | Linux kernel 5.6+, wireguard-go, WireGuardNT, BoringTun |
| [IPsec / IKEv2](IPsec.md) | RFC 7296 (2014), RFC 4301 and RFC 4303 (2005) | strongSwan, Libreswan, Linux XFRM, Windows, macOS / iOS |
| [Signal](Signal.md) | PQXDH (2023), Double Ratchet (2016, SPQR added 2025) specs | libsignal (Signal); WhatsApp and Google Messages also use the protocol |
| [MLS](MLS.md) | RFC 9420 (2023), architecture RFC 9750 (2025) | **Libraries:** OpenMLS, mls-rs, MLSpp<br>**Used in:** Discord calls, Webex |
| [JOSE / JWT](JWT.md) | RFC 7515–7519 (2015), RFC 8725 (2020); ML-DSA RFC 9964 (2026) | panva jose, PyJWT, Nimbus JOSE+JWT, go-jose |
| [Kerberos](Kerberos.md) | RFC 4120 (2005); AES-SHA2 RFC 8009 (2016) | MIT Kerberos, Heimdal, Active Directory |
| [Wi-Fi WPA2 / WPA3](Wi-Fi.md) | IEEE 802.11i (2004), now in IEEE 802.11-2024; WPA3 (2018) | hostapd, wpa_supplicant, iwd |
| [DNSSEC](DNSSEC.md) | RFC 4033–4035 (2005); algorithm levels RFC 9904 (2025) | BIND, Knot, Unbound, PowerDNS |
| [Disk encryption](Disk-Encryption.md) | IEEE 1619 (XTS, 2007; now 1619-2025), SP 800-38E (2010); LUKS1 (2005), LUKS2 spec (2018) | cryptsetup / dm-crypt, systemd-cryptenroll, BitLocker, FileVault |
| [age](age.md) | age-encryption.org/v1 (2019); post-quantum in C2SP age v1.1.0 (2025) | age (Go), rage (Rust), typage (TypeScript) |
| [FIDO2 / passkeys](FIDO2.md) | W3C WebAuthn Level 3 (2026; Level 1 2019), FIDO CTAP 2.2 (2025) / 2.3 (2026) | **Browsers:** Chrome, Safari, Firefox, Edge<br>**Passkey stores:** iCloud Keychain, Google Password Manager, Windows Hello<br>**Security keys:** YubiKey<br>**Library:** libfido2 |
| [TOTP / HOTP](TOTP.md) | RFC 6238 (2011), RFC 4226 (2005) | **Apps:** Google Authenticator, Aegis, FreeOTP<br>**Command line and servers:** oathtool, pam_google_authenticator |
| [Bitcoin](Bitcoin.md) | whitepaper (2008); BIPs, e.g. Taproot BIP-340–342 (2021), v2 transport BIP-324 (2023) | Bitcoin Core, libsecp256k1, btcd |

## What each one uses by default

| Protocol | Key exchange | Signature | Cipher / AEAD | MAC | Hash | KDF |
|---|---|---|---|---|---|---|
| [SSH](SSH.md) | ML-KEM-768 + X25519 | Ed25519 | ChaCha20-Poly1305 | in AEAD (else HMAC-SHA-256) | SHA-256 | SSH KDF, bcrypt_pbkdf for key files |
| [TLS 1.3](TLS-1.3.md) / QUIC | X25519 + ML-KEM-768 | ECDSA P-256, RSA-PSS | AES-128-GCM, ChaCha20-Poly1305 | in AEAD | SHA-256 | HKDF |
| [PKI](PKI.md) / [X.509](../formats/X.509.md) | — | RSA PKCS#1 v1.5 (SHA-256), ECDSA P-256 / P-384 | AES-256-CBC (PKCS#8, PKCS#12) | HMAC-SHA-256 (PKCS#12) | SHA-256 (SHA-384 with P-384 keys) | PBKDF2-HMAC-SHA-256; PKCS#12 KDF for the MAC key |
| [OpenPGP](OpenPGP.md) | X25519 | Ed25519 | AES-256-OCB | in AEAD | SHA-256/512 | Argon2, HKDF |
| [S/MIME](S-MIME.md) | RSA (PKCS#1 v1.5, OAEP), ECDH P-256 | RSA, ECDSA P-256 | AES-256-CBC, AES-GCM | in AEAD (none with CBC) | SHA-256 | X9.63 KDF (ECDH) |
| [WireGuard](WireGuard.md) | X25519 (+ optional PSK) | none (pinned keys) | ChaCha20-Poly1305 | in AEAD; keyed BLAKE2s on handshakes | BLAKE2s | HKDF (HMAC-BLAKE2s) |
| [IPsec / IKEv2](IPsec.md) | ECDH P-256 / X25519 (ML-KEM-768 opt-in, RFC 9370) | RSA, ECDSA or PSK | AES-GCM (ESP), AES-CBC (IKE) | in AEAD (ESP); HMAC-SHA-256-128 (IKE) | SHA-256 | prf+ (HMAC-SHA-256) |
| [Signal](Signal.md) | X25519 + Kyber-1024; ML-KEM-768 in SPQR | XEdDSA | AES-256-CBC | HMAC-SHA-256 | SHA-256/512 | HKDF |
| [MLS](MLS.md) | HPKE (X25519) | Ed25519 | AES-128-GCM | in AEAD; HMAC-SHA-256 confirmation tags | SHA-256 | HKDF |
| [JOSE / JWT](JWT.md) | ECDH-ES, RSA-OAEP | RS256, ES256, Ed25519 | A256GCM, A128CBC-HS256 | HS256 | SHA-256 | Concat KDF, PBES2 (PBKDF2) |
| [Kerberos](Kerberos.md) | — (PKINIT: DH, ECDH) | — (PKINIT: RSA, ECDSA certificates) | AES-256-CTS | HMAC-SHA1-96 (HMAC-SHA-384-192 opt-in) | SHA-1 | PBKDF2 (HMAC-SHA-1) |
| [Wi-Fi WPA3](Wi-Fi.md) | SAE (Dragonfly, P-256) | — | AES-128-CCMP (GCMP-256 for Wi-Fi 7) | in AEAD; AES-CMAC (handshake MIC, BIP) | SHA-256 | 802.11 KDF (HMAC-SHA-256); PBKDF2-HMAC-SHA1 (WPA2-PSK) |
| [DNSSEC](DNSSEC.md) | — | ECDSA P-256, RSA-SHA-256, Ed25519 | — | — | SHA-256 (DS), SHA-1 (NSEC3) | — |
| [Disk encryption](Disk-Encryption.md) | — | — | AES-256-XTS (LUKS2), XTS-AES-128 (BitLocker) | none | SHA-256 | Argon2id (LUKS2), PBKDF2 (LUKS1, FileVault 2), iterated SHA-256 (BitLocker) |
| [age](age.md) | X25519 (ML-KEM-768 + X25519 with `-pq`, age 1.3+; or SSH keys) | none | ChaCha20-Poly1305 | HMAC-SHA-256 (header); Poly1305 in AEAD | SHA-256 | HKDF, scrypt |
| [FIDO2 / passkeys](FIDO2.md) | ECDH P-256 (PIN protocol) | ES256 (ECDSA P-256) | AES-256-CBC (PIN protocol) | HMAC-SHA-256 (PIN token, hmac-secret / PRF) | SHA-256 | HKDF-SHA-256 (PIN protocol 2) |
| [TOTP / HOTP](TOTP.md) | — | — | — | HMAC-SHA-1 (SHA-256/512 optional in TOTP) | SHA-1 | — |
| [Bitcoin](Bitcoin.md) | ECDH secp256k1, ElligatorSwift (BIP-324) | ECDSA secp256k1 (default P2WPKH), Schnorr BIP-340 (Taproot) | ChaCha20-Poly1305 (BIP-324) | in AEAD (BIP-324) | SHA-256d, RIPEMD-160 (HASH160) | HKDF-SHA256 (BIP-324); HMAC-SHA512, PBKDF2 (wallets) |

"—" means the protocol doesn't do that job. DNSSEC signs but never encrypts,
and TOTP is nothing more than an HMAC over the clock.
