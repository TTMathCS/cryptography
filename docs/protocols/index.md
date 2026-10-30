# Protocols

*The same algorithms from the [main table](../index.md), seen from the other
side: what each popular protocol or tool actually runs.*

Protocols with a link have their own page.

## Standard and implementations

| Protocol | Standard | Implementations |
|---|---|---|
| [SSH](SSH.md) | RFC 4251–4254 (2006) | OpenSSH, PuTTY, libssh, Dropbear |
| [TLS 1.3](TLS-1.3.md) / QUIC | RFC 8446 (2018), RFC 9001 (2021) | OpenSSL, BoringSSL, NSS, rustls, GnuTLS, SChannel |
| [PKI / X.509](PKI.md) | RFC 5280 (2008), ACME RFC 8555 (2019) | OpenSSL, Let's Encrypt, step-ca, AD CS |
| [OpenPGP](OpenPGP.md) | RFC 9580 (2024), RFC 4880 (2007); post-quantum RFC 9980 (2026) | GnuPG (follows its own LibrePGP draft), Sequoia, OpenPGP.js |
| S/MIME | RFC 8551 (2019), CMS RFC 5652 (2009) | Outlook, Apple Mail, Thunderbird |
| [WireGuard](WireGuard.md) | whitepaper (2017), Noise framework | Linux kernel 5.6+, wireguard-go, WireGuardNT, BoringTun |
| IPsec / IKEv2 | RFC 7296 (2014), RFC 4303 (2005) | strongSwan, Libreswan, Windows |
| [Signal](Signal.md) | PQXDH (2023), Double Ratchet (2016, SPQR added 2025) specs | libsignal (Signal); WhatsApp and Google Messages also use the protocol |
| MLS | RFC 9420 (2023) | OpenMLS, Webex, Discord |
| JOSE / JWT | RFC 7515–7519 (2015) | jose, PyJWT, Nimbus |
| Kerberos | RFC 4120 (2005) | MIT Kerberos, Heimdal, Active Directory |
| Wi-Fi WPA2 / WPA3 | IEEE 802.11i (2004), WPA3 (2018) | hostapd, wpa_supplicant |
| DNSSEC | RFC 4033–4035 (2005) | BIND, Knot, Unbound, PowerDNS |
| Disk encryption | IEEE 1619 (XTS), LUKS2 spec (2018) | cryptsetup, BitLocker, FileVault |
| age | age-encryption.org/v1 (2019) | age, rage |
| FIDO2 / passkeys | W3C WebAuthn (2019), FIDO CTAP2 | browsers, Apple / Google / Windows, YubiKey |
| TOTP / HOTP | RFC 6238 (2011), RFC 4226 (2005) | Google Authenticator, oathtool |
| Bitcoin | whitepaper (2008), BIPs | Bitcoin Core |

## What each one uses by default

| Protocol | Key exchange | Signature | Cipher / AEAD | MAC | Hash | KDF |
|---|---|---|---|---|---|---|
| [SSH](SSH.md) | ML-KEM-768 + X25519 | Ed25519 | ChaCha20-Poly1305 | in AEAD (else HMAC-SHA-256) | SHA-256 | SSH KDF, bcrypt_pbkdf for key files |
| [TLS 1.3](TLS-1.3.md) / QUIC | X25519 + ML-KEM-768 | ECDSA P-256, RSA-PSS | AES-128-GCM, ChaCha20-Poly1305 | in AEAD | SHA-256 | HKDF |
| [PKI / X.509](PKI.md) | — | RSA PKCS#1 v1.5, ECDSA P-256 | AES-256-CBC (key files) | HMAC-SHA-256 (PKCS#12) | SHA-256 | PBKDF2 |
| [OpenPGP](OpenPGP.md) | X25519 | Ed25519 | AES-256-OCB | in AEAD | SHA-256/512 | Argon2, HKDF |
| S/MIME | RSA-OAEP, ECDH | RSA, ECDSA | AES-GCM, AES-CBC | in AEAD | SHA-256 | X9.63 KDF |
| [WireGuard](WireGuard.md) | X25519 (+ optional PSK) | none (pinned keys) | ChaCha20-Poly1305 | in AEAD; keyed BLAKE2s on handshakes | BLAKE2s | HKDF (HMAC-BLAKE2s) |
| IPsec / IKEv2 | ECDH P-256 / X25519 (+ ML-KEM, RFC 9370) | RSA, ECDSA or PSK | AES-GCM | HMAC-SHA-256 | SHA-256 | prf+ (HMAC-SHA-256) |
| [Signal](Signal.md) | X25519 + Kyber-1024; ML-KEM-768 in SPQR | XEdDSA | AES-256-CBC | HMAC-SHA-256 | SHA-256/512 | HKDF |
| MLS | HPKE (X25519) | Ed25519 | AES-128-GCM | in AEAD | SHA-256 | HKDF |
| JOSE / JWT | ECDH-ES, RSA-OAEP | ES256, RS256, EdDSA | A256GCM | HS256 | SHA-256 | ConcatKDF, PBES2 |
| Kerberos | — (PKINIT: DH) | — (PKINIT: certificates) | AES-256-CTS | HMAC-SHA1-96 / SHA-384-192 | SHA-1 / SHA-384 | PBKDF2 |
| Wi-Fi WPA3 | SAE (Dragonfly) | — | AES-CCMP, GCMP-256 | CMAC (management frames) | SHA-256 | 802.11 KDF, PBKDF2 (WPA2) |
| DNSSEC | — | ECDSA P-256, RSA-SHA-256, Ed25519 | — | — | SHA-256 | — |
| Disk encryption | — | — | AES-XTS | none | SHA-256 | Argon2id (LUKS2), PBKDF2 |
| age | X25519 (or SSH keys) | none | ChaCha20-Poly1305 | HMAC-SHA-256 | SHA-256 | HKDF, scrypt |
| FIDO2 / passkeys | ECDH P-256 (PIN protocol) | ES256 (ECDSA P-256) | AES-256-CBC (PIN protocol) | HMAC-SHA-256 | SHA-256 | HKDF |
| TOTP / HOTP | — | — | — | HMAC-SHA-1 | SHA-1 | — |
| Bitcoin | ECDH secp256k1 (BIP-324) | ECDSA secp256k1, Schnorr | ChaCha20-Poly1305 (BIP-324) | — | SHA-256, RIPEMD-160 | HMAC-SHA512, PBKDF2 |

"—" means the protocol doesn't do that job. DNSSEC signs but never encrypts,
and TOTP is nothing more than an HMAC over the clock.
