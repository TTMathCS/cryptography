# S/MIME (Secure/Multipurpose Internet Mail Extensions)

*Signed and encrypted email, built into Outlook, Apple Mail and Thunderbird.
Keys come in X.509 certificates from a CA, not a web of trust. As in OpenPGP
there is no live connection: the sender must already hold the recipient's
certificate, and picks algorithms from what the recipient last announced in a
signed message.*

**Standard:** S/MIME 4.0, RFC 8551 (messages) and RFC 8550 (certificates),
April 2019, on the Cryptographic Message Syntax (CMS), RFC 5652 (2009); GCM
via AuthEnvelopedData, RFC 5083 and 5084 (2007). Post-quantum: RFC 9629
(KEMs, 2024), RFC 9814 (SLH-DSA) and RFC 9882 (ML-DSA, both 2025), RFC 9936
(ML-KEM, 2026). Public CAs follow the CA/Browser Forum S/MIME Baseline
Requirements, in force since 1 September 2023. **Implementations:** Outlook
and Exchange, Apple Mail, Thunderbird (NSS), GnuPG's `gpgsm`, `openssl cms`,
Bouncy Castle.

## One message, one algorithm per category

Real output from OpenSSL 3.0.13 (Ubuntu 24.04 in a container, Oct 2026). A
throwaway CA gave Alice a P-256 certificate and Bob an RSA-2048 one. Alice
signed a note, then encrypted it to Bob and to herself (output trimmed):

```
$ openssl cms -encrypt -aes-256-gcm -in signed.eml \
    -recip bob.crt -keyopt rsa_padding_mode:oaep -keyopt rsa_oaep_md:sha256 \
    -recip alice.crt -keyopt ecdh_kdf_md:sha256 -out enc.eml
$ openssl cms -cmsout -print -inform SMIME -in enc.eml
  contentType: id-smime-ct-authEnvelopedData (1.2.840.113549.1.9.16.1.23)
      d.ktri:
          algorithm: rsaesOaep (1.2.840.113549.1.1.7)
      d.kari:
          algorithm: dhSinglePass-stdDH-sha256kdf-scheme (1.3.132.1.11.1)
    2:d=1  hl=2 l=   9 prim:  OBJECT            :id-aes256-wrap
        algorithm: aes-256-gcm (2.16.840.1.101.3.4.1.46)
    2:d=1  hl=2 l=  12 prim:  OCTET STRING      [HEX DUMP]:4AC1263A8834DD3D7B71D19D
   16:d=1  hl=2 l=   1 prim:  INTEGER           :10
    mac:
$ openssl cms -decrypt -in enc.eml -recip bob.crt -inkey bob.key | openssl cms -cmsout -print
          algorithm: sha256 (2.16.840.1.101.3.4.2.1)
            object: messageDigest (1.2.840.113549.1.9.4)
            object: S/MIME Capabilities (1.2.840.113549.1.9.15)
          algorithm: ecdsa-with-SHA256 (1.2.840.10045.4.3.2)
```

| CMS name | Category | Algorithm inside |
|---|---|---|
| `ecdsa-with-SHA256` | [Signature](../index.md#2-digital-signatures) | [ECDSA](../02-signatures/ECDSA.md) on P-256 signs a hash of the signed attributes, not of the body |
| `sha256`, `messageDigest` | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md) of the signed MIME part, kept as a signed attribute |
| `rsaesOaep` | [Public-key encryption](../index.md#3-public-key-encryption) | [RSA](../02-signatures/RSA.md)-OAEP with SHA-256 encrypts the content key to Bob's key |
| `dhSinglePass-stdDH-…` | [Key exchange](../index.md#1-key-exchange) | a fresh P-256 key does [ECDH](../01-key-exchange/ECDH.md#ecdh-on-the-nist-curves) with the key in Alice's certificate |
| `…-sha256kdf-scheme` | [KDF](../index.md#8-key-derivation-and-password-hashing) | the [X9.63 KDF](../08-kdf-password-hashing/NIST-KDFs.md#x963-kdf) with SHA-256 turns the ECDH secret into a 256-bit key-encryption key |
| `id-aes256-wrap` | [Mode](../index.md#5-cipher-modes-and-aead) | [AES key wrap](../05-modes-aead/Key-Wrap.md) seals the content key under that key |
| `aes-256-gcm` | [Cipher](../index.md#4-symmetric-ciphers) | [AES](../04-symmetric-ciphers/AES.md)-256 in [GCM](../05-modes-aead/AEAD.md#aes-gcm): a 12-byte nonce, a 16-byte (hex `10`) tag |
| `mac` | [MAC](../index.md#6-mac) | the GCM tag, stored in its own field after the ciphertext |

**Why GCM had to be asked for.** With no cipher named, this OpenSSL wrote
EnvelopedData with 3DES and RSA PKCS#1 v1.5 (OpenSSL 3.5 switched to
AES-256-CBC in April 2025); without the `_md` options, OAEP and the KDF used
SHA-1. Alice's SMIMECapabilities, OpenSSL's own list, offer only CBC ciphers,
down to 40-bit RC2, so a client following RFC 8551 §2.7.1 answers her with
AES-256-CBC: with no handshake, it uses only what she says she reads.

## How a message is sent

1. **Certificates.** Each user needs an X.509 certificate with their address
   in the subjectAltName and the `emailProtection` extended key usage (RFC
   8550; format in [X.509](../formats/X.509.md)). Key usage says if the key signs or receives
   (`keyEncipherment` for RSA, `keyAgreement` for ECDH). A sender can only
   encrypt to a certificate it already has, from a signed mail or a directory.
2. **Signing (SignedData).** The client hashes the MIME part into a
   `messageDigest` attribute, next to `contentType`, `signingTime` and
   `SMIMECapabilities`, and signs the DER of those attributes (RFC 5652 §5.4),
   attaching its certificate chain. As `multipart/signed` the text stays
   readable without S/MIME; the signature rides in `smime.p7s`.
3. **Content key.** To encrypt, it picks a random content key and a cipher:
   the first in the recipient's last SMIMECapabilities that it supports or,
   knowing nothing, AES-256-GCM (RFC 8551 §2.7.1).
4. **One RecipientInfo per recipient.** RSA gets a KeyTransRecipientInfo, the
   key encrypted with OAEP or PKCS#1 v1.5. EC gets a KeyAgreeRecipientInfo:
   ECDH with a fresh key, a KDF (X9.63 for P-256, HKDF for X25519), AES key
   wrap. ML-KEM gets a KEMRecipientInfo: encapsulate, HKDF-SHA256, key wrap.
   The sender SHOULD add itself, to read its own sent mail (RFC 8551 §3.3).
5. **Content.** EnvelopedData uses AES-CBC with no integrity check,
   AuthEnvelopedData AES-GCM; both go out as `smime.p7m`. Signing first hides
   the signer and leaves a signed message to keep (RFC 8551 §3.7). Subject
   and other headers stay in the clear; RFC 9788 (2025) adds protected copies.
6. **Reading.** The recipient finds its RecipientInfo, unwraps and decrypts,
   then checks the digest, the signature, the chain to a trusted CA and that
   the From address is in the certificate (RFC 8550 §3). It keeps the
   sender's certificate and capabilities for replies.

**EFAIL (2018).** CBC is malleable: knowing one plaintext block, an attacker
can edit the ciphertext block before it so that block decrypts to text of
their choice. Mail starts with predictable headers (Alice's signed message
begins `MIME-Version: 1.0`), so EFAIL planted HTML that made the client fetch
a URL holding the decrypted text. A second variant needed no crypto: clients
rendered the decrypted part together with the attacker's HTML. RFC 8551 §6
answered with AES-GCM as a MUST, no acting on content before the integrity
check, and each protected MIME part treated as a separate origin.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange (to a recipient) | ECDH P-256 with X9.63 KDF (MUST), X25519 with HKDF (MUST); P-384, P-521, X448 | RFC 8551 §2.3, RFC 5753, RFC 8418 | finite-field DH (RFC 2631, a MUST in S/MIME v3) |
| Public-key encryption | RSA PKCS#1 v1.5 (MUST-, expected to drop), RSA-OAEP (SHOULD+); 2048–4096-bit keys | RFC 3370, RFC 3560, RFC 8551 §4 | keys under 2048 bits: SHOULD NOT encrypt to them |
| Post-quantum | ML-KEM-512/768/1024 in KEMRecipientInfo; ML-DSA-44/65/87 and SLH-DSA, pure mode | RFC 9629, RFC 9936, RFC 9882, RFC 9814 | — |
| Signature | ECDSA P-256 and Ed25519 (MUST to verify, one of them to sign), RSA PKCS#1 v1.5 (MUST-), RSA-PSS (SHOULD) | RFC 8551 §2.2, RFC 8419, RFC 4056 | DSA (historic), RSA with SHA-1 or MD5 |
| Cipher | AES-128-GCM and AES-256-GCM (MUST), ChaCha20-Poly1305 (SHOULD+), AES-128-CBC (MUST-) | RFC 8551 §2.7, RFC 5084, RFC 8103, RFC 3565 | [3DES](../04-symmetric-ciphers/Retired.md#3des) (historic), [RC2](../04-symmetric-ciphers/Retired.md#rc2)/40, DES |
| MAC | the GCM tag in `mac`, 12 to 16 bytes (12 if unstated) | RFC 5083, RFC 5084 §3.2 | none: EnvelopedData has no integrity check |
| Hash | SHA-256 and SHA-512 (MUST); SHA-512 with Ed25519 and ML-DSA | RFC 8551 §2.1, RFC 5754, RFC 8419, RFC 9882 | [SHA-1](../07-hash/Retired.md#sha-1) (historic), [MD5](../07-hash/Retired.md#md5) (dropped in 4.0) |
| KDF and key wrap | X9.63 KDF with SHA-256; HKDF-SHA256 (X25519, ML-KEM); AES key wrap the size of the content key | RFC 5753, RFC 8418, RFC 9936, RFC 3394 | X9.63 KDF with SHA-1 (a MAY); 3DES key wrap (RFC 3217) |
| Certificates (public CAs) | RSA 2048+, ECDSA P-256/384/521, Ed25519/Ed448; ML-DSA and ML-KEM since v1.0.11 (August 2025); 825 days at most | RFC 8550, CA/B Forum BRs | Legacy profiles: none issued since 15 July 2025; SHA-1 signatures: none from 15 September 2026 |

Each version raised the cipher every client must have: 40-bit RC2 in v2 (RFC
2311, 1998), 3DES in v3 (RFC 2633, 1999), AES-128-CBC in v3.2 (RFC 5751,
2010), AES-GCM in 4.0. Senders lag: Microsoft documents AES-256 (no GCM
choice) and SHA-1 as Outlook on the web's defaults; NSS, Thunderbird's S/MIME
library, reads AuthEnvelopedData since 3.126 (July 2026) but can't write it;
`gpgsm` writes it since 2.5.20 (May 2026). Readers must check the tag length
field; OpenSSL 4.0.1 and GnuPG 2.5.21 fixed forgeries (CVE-2026-34182).

## Post-quantum

Encrypted mail can be stored now and opened by a future quantum computer, so
ML-KEM matters more here than ML-DSA. The sender encapsulates to the
recipient's ML-KEM key, HKDF-SHA256 turns the shared secret into a
key-encryption key, and AES key wrap seals the content key. Unlike OpenPGP's
RFC 9980, CMS uses ML-KEM and ML-DSA alone; pairings with X25519 or ECDH are
still IETF drafts. Public CAs may issue both since August 2025, but an ML-KEM
key may only have `keyEncipherment`, so a user needs a second certificate to
sign. OpenSSL signs CMS with ML-DSA since 3.5 and added ML-KEM recipients in
3.6 (October 2025).

## Seeing it on your machine

```
printf 'Content-Type: text/plain\r\n\r\nHello Bob, lunch at noon?\r\n' > msg.txt
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj /CN=Bob -keyout bob.key -out bob.crt \
  -addext subjectAltName=email:bob@example.org -addext extendedKeyUsage=emailProtection
openssl cms -sign -in msg.txt -signer bob.crt -inkey bob.key -out signed.eml  # multipart/signed
openssl cms -encrypt -in signed.eml -out enc.eml bob.crt                      # default cipher
openssl cms -cmsout -print -inform SMIME -in enc.eml | grep algorithm:        # what it picked
openssl cms -cmsout -print -in signed.eml | awk '/prim: +(OBJECT|INTEGER)/ {printf "%s ", $NF}'
openssl cms -encrypt -aes-256-gcm -in signed.eml -out enc.eml bob.crt         # AuthEnvelopedData
openssl cms -decrypt -in enc.eml -recip bob.crt -inkey bob.key | openssl cms -verify -CAfile bob.crt
```

The `grep` and `awk` lines printed:

```
          algorithm: rsaEncryption (1.2.840.113549.1.1.1)
        algorithm: des-ede3-cbc (1.2.840.113549.3.7)
:aes-256-cbc :aes-192-cbc :aes-128-cbc :des-ede3-cbc :rc2-cbc :80 :rc2-cbc :40 :des-cbc :rc2-cbc :28
```

The first two lines are PKCS#1 v1.5 key transport and 3DES. The third is the
SMIMECapabilities list (RFC 8551 §2.5.2), most preferred first, each RC2 entry
with its key size: hex 80, 40 and 28 for 128, 64 and 40 bits.

## See also

- [OpenPGP](OpenPGP.md): the other way to sign and encrypt mail, with keys people vouch for themselves and ML-KEM paired with X25519
- [X.509](../formats/X.509.md) / [File formats](../formats/File-Formats.md) / [Kerberos](Kerberos.md): the certificates, the PEM, PKCS#7 and PKCS#12 files S/MIME keys travel in, and PKINIT, which signs with CMS too
- [AEAD](../05-modes-aead/AEAD.md) / [Classic modes](../05-modes-aead/Classic-Modes.md#cbc) / [Key wrap](../05-modes-aead/Key-Wrap.md): GCM, the CBC malleability behind EFAIL, and AES key wrap
- [ML-KEM](../01-key-exchange/ML-KEM.md) / [ML-DSA](../02-signatures/ML-DSA.md) / [SLH-DSA](../02-signatures/SLH-DSA.md): the post-quantum algorithms CMS now carries

## References

- [RFC 8551: S/MIME 4.0 Message Specification](https://www.rfc-editor.org/rfc/rfc8551) (Sections 1.5–1.7, 2.1–2.7, 3.3–3.7, 4, 6) / [RFC 8550: S/MIME 4.0 Certificate Handling](https://www.rfc-editor.org/rfc/rfc8550) (Sections 3, 4.4) / [RFC 5751](https://www.rfc-editor.org/rfc/rfc5751) / [RFC 2633](https://www.rfc-editor.org/rfc/rfc2633) / [RFC 2311](https://www.rfc-editor.org/rfc/rfc2311) / [Poddebniak et al., Efail (USENIX Security 2018)](https://www.usenix.org/system/files/conference/usenixsecurity18/sec18-poddebniak.pdf)
- [RFC 5652: CMS](https://www.rfc-editor.org/rfc/rfc5652) (Sections 5.4, 6.2) / [RFC 5083: AuthEnvelopedData](https://www.rfc-editor.org/rfc/rfc5083) / [RFC 5084: AES-CCM and AES-GCM in CMS](https://www.rfc-editor.org/rfc/rfc5084) (Section 3.2) / [RFC 3565: AES in CMS](https://www.rfc-editor.org/rfc/rfc3565) / [RFC 8103: ChaCha20-Poly1305 in CMS](https://www.rfc-editor.org/rfc/rfc8103)
- [RFC 3370: CMS algorithms](https://www.rfc-editor.org/rfc/rfc3370) / [RFC 3560: RSA-OAEP](https://www.rfc-editor.org/rfc/rfc3560) / [RFC 4056: RSA-PSS](https://www.rfc-editor.org/rfc/rfc4056) / [RFC 5753: ECC in CMS](https://www.rfc-editor.org/rfc/rfc5753) (Sections 3.1, 8) / [RFC 8418: X25519 and X448](https://www.rfc-editor.org/rfc/rfc8418) / [RFC 8419: EdDSA](https://www.rfc-editor.org/rfc/rfc8419) / [RFC 5754: SHA-2](https://www.rfc-editor.org/rfc/rfc5754) / [RFC 3217: 3DES key wrap](https://www.rfc-editor.org/rfc/rfc3217)
- [RFC 9629: KEMRecipientInfo](https://www.rfc-editor.org/rfc/rfc9629) / [RFC 9936: ML-KEM in CMS](https://www.rfc-editor.org/rfc/rfc9936) ([source](https://github.com/lamps-wg/cms-kyber)) / [RFC 9882: ML-DSA in CMS](https://www.rfc-editor.org/rfc/rfc9882) ([source](https://github.com/lamps-wg/cms-ml-dsa)) / [RFC 9814: SLH-DSA in CMS](https://www.rfc-editor.org/rfc/rfc9814) / [draft-ietf-lamps-cms-composite-kem](https://datatracker.ietf.org/doc/draft-ietf-lamps-cms-composite-kem/) ([source](https://github.com/lamps-wg/cms-composite-kem)) / [RFC 9788: header protection](https://www.rfc-editor.org/rfc/rfc9788)
- [CA/Browser Forum S/MIME Baseline Requirements](https://github.com/cabforum/smime/blob/main/SBR.md) (v1.0.16, Sections 1.2.1, 6.1.5, 6.3.2, 7.1.2.3, 7.1.3)
- [OpenSSL CHANGES.md](https://github.com/openssl/openssl/blob/master/CHANGES.md) (3.5.0, 3.6.0, 4.0.1) / [GnuPG NEWS](https://github.com/gpg/gnupg/blob/master/NEWS) (2.5.20, 2.5.21) / [NSS `lib/smime`](https://github.com/nss-dev/nss/tree/master/lib/smime) (Bug 2037078) / [Exchange `Set-SmimeConfig`](https://github.com/MicrosoftDocs/office-docs-powershell/blob/main/exchange/exchange-ps/ExchangePowerShell/Set-SmimeConfig.md) / [Bouncy Castle `KEMRecipientInfoGenerator`](https://github.com/bcgit/bc-java/blob/main/pkix/src/main/java/org/bouncycastle/cms/KEMRecipientInfoGenerator.java)

*Weaker sources:* search-engine summaries of the RFC Editor pages for RFC
9629, 9814, 9882, 9936 and 9788 (publication months) and of the EFAIL paper,
which could not be opened here; the page states EFAIL as RFC 8551 §6 does.
