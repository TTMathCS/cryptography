# Key and certificate files (PEM, DER, PKCS#7, PKCS#12, JKS)

*How keys and certificates sit on disk and move between tools. DER is one
ASN.1 object in binary; PEM is that DER in base64 between BEGIN and END
lines; PKCS#7 carries a chain; PKCS#12 and Java's key stores carry a private
key and its chain under a password. The only crypto is that password-based
encryption, and it is where old files are weak.*

**Standard:** DER is ITU-T X.690 ([ASN.1 and DER](ASN.1-DER.md)). PEM, named
after Privacy-Enhanced Mail (RFC 1421, 1993): RFC 7468 (2015). Keys: PKCS#1
(RFC 8017, 2016), ECPrivateKey (RFC 5915, 2010), PKCS#8 (RFC 5208, 2008; RFC
5958, 2010), encrypted with PBES2 (RFC 8018, 2017). PKCS#7 v1.5 (RFC 2315,
1998), now CMS (RFC 5652, 2009). PKCS#12 v1.1 (RFC 7292, 2014), from
Microsoft's PFX (1997); PBMAC1 for it in RFC 9579 (2024), now RFC 9879 (2025).
**Used by:** OpenSSL and the [TLS](../protocols/TLS-1.3.md) servers built on
it (PEM), [PKI](../protocols/PKI.md) and [S/MIME](../protocols/S-MIME.md)
(`.p7c`, `.p12`), Java's `keytool` (PKCS#12, JKS), Windows (`.cer`, `.pfx`),
the macOS keychain and Firefox (PKCS#12).

## One key and certificate, file by file

Real output from OpenSSL 3.0.13 and `keytool` from OpenJDK 21.0.12 (Ubuntu
24.04 in a container, Oct 2026). A throwaway P-256 CA signed a leaf; its key
was saved with `openssl pkey -aes256` (`-traditional` for `leaf.trad.key`),
`legacy.p12` with `pkcs12 -export -legacy`, `demo.jks` with `keytool
-importkeystore` (passwords left out):

```
$ head -2 leaf.crt
-----BEGIN CERTIFICATE-----
MIIBhTCCASygAwIBAgIUWWrVcKXxaWilYBROV9/rTwLc7GkwCgYIKoZIzj0EAwIw
$ xxd leaf.der | head -1
00000000: 3082 0185 3082 012c a003 0201 0202 1459  0...0..,.......Y
$ head -3 leaf.trad.key
-----BEGIN EC PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-256-CBC,649FAE94C61E22AF690657DB3C78A89A
$ openssl asn1parse -in leaf.enc.key | grep -E 'OBJECT|INTEGER'
    5:d=2  hl=2 l=   9 prim: OBJECT            :PBES2
   20:d=4  hl=2 l=   9 prim: OBJECT            :PBKDF2
   43:d=5  hl=2 l=   2 prim: INTEGER           :0800
   49:d=6  hl=2 l=   8 prim: OBJECT            :hmacWithSHA256
   63:d=4  hl=2 l=   9 prim: OBJECT            :aes-256-cbc
$ openssl pkcs12 -info -nokeys -in demo.p12 | grep -E 'MAC:|Enc|Keybag'
MAC: sha256, Iteration 2048
PKCS7 Encrypted data: PBES2, PBKDF2, AES-256-CBC, Iteration 2048, PRF hmacWithSHA256
Shrouded Keybag: PBES2, PBKDF2, AES-256-CBC, Iteration 2048, PRF hmacWithSHA256
$ openssl pkcs12 -info -nokeys -legacy -in legacy.p12 | grep -E 'MAC:|Enc|Keybag'
MAC: sha1, Iteration 2048
PKCS7 Encrypted data: pbeWithSHA1And40BitRC2-CBC, Iteration 2048
Shrouded Keybag: pbeWithSHA1And3-KeyTripleDES-CBC, Iteration 2048
$ xxd demo.jks | head -1
00000000: feed feed 0000 0002 0000 0001 0000 0001  ................
```

| What the output shows | Category | Algorithm inside |
|---|---|---|
| `BEGIN CERTIFICATE`, `3082 0185` | none: encoding | one 393-byte DER SEQUENCE (`30`, length `0185`), and PEM is it in base64. The certificate inside is signed with [ECDSA](../02-signatures/ECDSA.md) P-256 ([X.509](X.509.md)) |
| `Proc-Type`, `DEK-Info` | [KDF](../index.md#8-key-derivation-and-password-hashing) | OpenSSL's legacy scheme: the AES key comes from [MD5](../07-hash/Retired.md#md5) over the passphrase and the IV's first 8 bytes, run once |
| `PBES2`, `PBKDF2`, `hmacWithSHA256`, `0800` | [KDF](../index.md#8-key-derivation-and-password-hashing) | [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)-[HMAC](../06-mac/HMAC.md)-[SHA-256](../07-hash/SHA-2.md), 2,048 (hex 0800) iterations, 8-byte salt; the same for both PKCS#12 bags (`Shrouded Keybag`: the key; `PKCS7 Encrypted data`: the certificates) |
| `aes-256-cbc` | [Cipher](../index.md#4-symmetric-ciphers) | [AES](../04-symmetric-ciphers/AES.md)-256 in [CBC](../05-modes-aead/Classic-Modes.md#cbc), no MAC: a wrong passphrase shows only as bad padding or bad DER |
| `MAC: sha256` | [MAC](../index.md#6-mac) | HMAC-SHA-256 over the contents, keyed by the PKCS#12 KDF (RFC 7292 App. B) with SHA-256 |
| `pbeWithSHA1And40BitRC2-CBC`, `…3-KeyTripleDES-CBC` | [Cipher](../index.md#4-symmetric-ciphers) | 40-bit [RC2](../04-symmetric-ciphers/Retired.md#rc2) on the certificates, [3DES](../04-symmetric-ciphers/Retired.md#3des) on the key, keys from the PKCS#12 KDF with [SHA-1](../07-hash/Retired.md#sha-1) |
| `feed feed` | [Hash](../index.md#7-hash-functions) | JKS magic, version 2, one entry. The key is XORed with a SHA-1 keystream; the file ends in a SHA-1 of password and contents |

**Why AES-256 doesn't make a key file strong.** The password step is the weak
part: OpenSSL's 2,048 PBKDF2 iterations (10,000 in keytool's PKCS#12) are far
below OWASP's 600,000 (see [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)), and
legacy PEM and JKS cost a few hash calls per guess. Use a long random
password, or `openssl pkcs8 -topk8` with `-iter` or `-scrypt` (RFC 7914 §7).
OpenSSL 1.x wrote `legacy.p12`'s algorithms; 3.0 (2021) moved to AES and
PBKDF2 and needs `-legacy` to read RC2; keytool moved in JDK 16 (March 2021)
and 11.0.12. Windows' `Export-PfxCertificate` still defaults to 3DES-SHA1.

## How it is built

1. **One ASN.1 object, in DER.** [X.509](X.509.md) says what a certificate
   holds, ASN.1 its structure, DER the bytes (BER, PER, XER and other rules:
   [ASN.1 and DER](ASN.1-DER.md)). A DER file is one object, nearly always
   `30` (SEQUENCE) and a length: a certificate, request, CRL, key or PKCS#12.
2. **PEM: base64 between two lines.** `-----BEGIN <label>-----`, base64 at 64
   characters a line, `-----END <label>-----` (RFC 7468 §2). Labels (§4):
   `CERTIFICATE`, `X509 CRL`, `CERTIFICATE REQUEST` (PKCS#10), `PKCS7`, `CMS`,
   `PRIVATE KEY`, `ENCRYPTED PRIVATE KEY`, `PUBLIC KEY`. One file can hold a
   chain, leaf first as TLS sends it (RFC 8446 §4.4.2). RFC 7468 allows no
   headers; `Proc-Type` and `DEK-Info` are RFC 1421's, still written by OpenSSL.
3. **Private keys.** OpenSSL's "traditional" files hold one algorithm's own
   structure: PKCS#1 `RSA PRIVATE KEY` (RFC 8017 App. A.1.2) or SEC1 `EC
   PRIVATE KEY` (RFC 5915 §3). PKCS#8 (`PRIVATE KEY`) wraps any key with an
   algorithm identifier: the only form for Ed25519 (RFC 8410 §7), OpenSSL's
   default since 3.0, and, encrypted, it names its KDF and cipher in PBES2.
   OpenSSH 7.8 (2018) and later write `OPENSSH PRIVATE KEY` with
   [bcrypt_pbkdf](../08-kdf-password-hashing/bcrypt.md) and AES-256-CTR ([SSH](../protocols/SSH.md)).
4. **Chains: PKCS#7.** A `.p7b`/`.p7c` file is a SignedData with no content
   and no signers, only certificates and maybe CRLs (RFC 2315 §9's degenerate
   case, RFC 8551 §3.8's certs-only message): nothing signed, never a key. It
   is PEM (`PKCS7`) or DER; Windows exports chains as P7B and `keytool
   -importcert` reads them.
5. **Key with chain: PKCS#12.** The outer `PFX` ("Personal Information
   Exchange") is version 3, the contents and an optional `MacData` (RFC 7292
   §4). The contents hold SafeBags, plain or encrypted: `keyBag`,
   `pkcs8ShroudedKeyBag`, `certBag`, `crlBag`, `secretBag`, `safeContentsBag`.
   A `friendlyName` gives the alias; a `localKeyID` pairs key and certificate.
6. **Java key stores.** JKS (`fe ed fe ed`, JDK 1.2) and JCEKS (`ce ce ce
   ce`) are Sun formats, specified only by OpenJDK's code. JKS XORs each key
   with chained SHA-1 hashes of the password and a 20-byte salt, ends with
   SHA-1(password ‖ "Mighty Aphrodite" ‖ contents), and keeps certificates in
   the clear; JCEKS adds secret keys under PBEWithMD5AndTripleDES. JDK 9 made
   PKCS#12 the default (JEP 229). keytool warns on JKS: `-importkeystore
   -srckeystore a.jks -destkeystore a.jks -deststoretype pkcs12` converts one,
   keeping `a.jks.old`.

**Key store or trust store?** Roles, not formats. A key store holds your
private keys, each with its chain (your certificate, then the CAs), to prove
who you are; a trust store holds only certificates you trust, usually
self-signed roots, to check others. Java reads `javax.net.ssl.keyStore` and
`javax.net.ssl.trustStore`, else `jssecacerts`, then `cacerts` (password
`changeit`): password-less PKCS#12 in OpenJDK since JDK 18, still JKS on
Ubuntu 24.04. OpenSSL takes a PEM file or directory (`-CAfile`).

**Since 2024.** RFC 9579 (2024) let the PKCS#12 MAC use PBMAC1, an HMAC keyed
by PBKDF2 (RFC 8018 §7.1) instead of the old KDF; RFC 9879 (September 2025)
replaced it, chiefly to pass the password as UTF-8. OpenSSL writes it with
`pkcs12 -pbmac1_pbkdf2` since 3.4 (October 2024); Java reads and writes it
since JDK 26 (March 2026) and 25.0.5, opt-in; JDK 28's source tree makes it
the default. JDK 26's keytool also says JKS and JCEKS "will be removed in a
future release".

## File extensions

| Extension | Usually holds | Encoding |
|---|---|---|
| `.pem` | anything with a PEM label: certificates, chains, keys | PEM |
| `.crt` | a certificate or a chain | PEM, as RFC 7468 §5.3 asks; not always |
| `.cer` | one certificate | DER per RFC 2585 and Windows' `Export-Certificate`; PEM from many tools |
| `.der` | one certificate, sometimes a key | DER |
| `.key` | a private key: PKCS#8, PKCS#1 or SEC1, maybe encrypted | usually PEM |
| `.csr` | a PKCS#10 certificate request | usually PEM |
| `.p7b`, `.p7c` | a chain as certs-only PKCS#7, never a key | DER or PEM |
| `.p12`, `.pfx` | PKCS#12: a private key, its certificate and chain | DER |
| `.jks` | a Java KeyStore | JKS, or PKCS#12 under the old name |
| `.keystore` | whatever keytool wrote; `~/.keystore` is its default file | PKCS#12 since JDK 9, JKS before |

The extension proves nothing (RFC 5280 §4.2.2.1: a file name is only a hint).
The first bytes do: `-----BEGIN` is PEM, `30` DER, `fe ed fe ed` JKS.

## Seeing it on your machine

```
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
  -subj /CN=Demo-CA -keyout ca.key -out ca.crt                  # throwaway CA
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj /CN=demo \
  -keyout leaf.key | openssl x509 -req -CA ca.crt -CAkey ca.key -out leaf.crt
openssl x509 -in leaf.crt -outform DER -out leaf.der            # PEM to DER
grep -v -- ----- leaf.crt | base64 -d | cmp - leaf.der          # silent: same bytes
openssl crl2pkcs7 -nocrl -certfile leaf.crt -certfile ca.crt -out chain.p7b
openssl pkcs12 -export -in leaf.crt -inkey leaf.key -certfile ca.crt -out demo.p12
openssl pkcs12 -info -nokeys -legacy -in old.pfx                # RC2-40 needs -legacy
keytool -list -keystore demo.p12 | head -1                      # Keystore type: PKCS12
```

`cmp` prints nothing: PEM is the DER in base64, so the fingerprints match.
More commands: [openssl](../tools/openssl.md), [keytool](../tools/keytool.md).

## See also

- [X.509](X.509.md) / [ASN.1 and DER](ASN.1-DER.md): what a certificate holds, and the bytes under every format here
- [PKI](../protocols/PKI.md) / [S/MIME](../protocols/S-MIME.md): chains, CAs and trust stores; the `.p12` a mail user imports
- [openssl](../tools/openssl.md) / [keytool](../tools/keytool.md): commands to convert, import and inspect these files
- [PBKDF2](../08-kdf-password-hashing/PBKDF2.md) / [Retired ciphers](../04-symmetric-ciphers/Retired.md#rc2) / [SSH](../protocols/SSH.md): the KDF in new files, the RC2 and 3DES in old ones, OpenSSH's own format

## References

- [RFC 7468: Textual Encodings of PKIX, PKCS, and CMS Structures](https://www.rfc-editor.org/rfc/rfc7468) (Sections 2, 4, 5.3) / [RFC 1421: Privacy-Enhanced Mail](https://www.rfc-editor.org/rfc/rfc1421) / [RFC 2585](https://www.rfc-editor.org/rfc/rfc2585) (Section 3) / [RFC 5280](https://www.rfc-editor.org/rfc/rfc5280) (Section 4.2.2.1) / [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) (Section 4.4.2)
- [RFC 8017: PKCS #1 v2.2](https://www.rfc-editor.org/rfc/rfc8017) (Appendix A.1.2) / [RFC 5915: EC private keys](https://www.rfc-editor.org/rfc/rfc5915) / [RFC 5208: PKCS #8](https://www.rfc-editor.org/rfc/rfc5208) / [RFC 5958: Asymmetric Key Packages](https://www.rfc-editor.org/rfc/rfc5958) / [RFC 8410](https://www.rfc-editor.org/rfc/rfc8410) (Section 7) / [RFC 8018: PKCS #5 v2.1](https://www.rfc-editor.org/rfc/rfc8018) (Sections 6.2, 7.1) / [RFC 7914: scrypt](https://www.rfc-editor.org/rfc/rfc7914) (Section 7) / [RFC 2986: PKCS #10](https://www.rfc-editor.org/rfc/rfc2986)
- [RFC 2315: PKCS #7 v1.5](https://www.rfc-editor.org/rfc/rfc2315) (Section 9) / [RFC 5652: CMS](https://www.rfc-editor.org/rfc/rfc5652) / [RFC 8551: S/MIME 4.0](https://www.rfc-editor.org/rfc/rfc8551) (Section 3.8) / [RFC 7292: PKCS #12 v1.1](https://www.rfc-editor.org/rfc/rfc7292) (Section 4, Appendix B) / [RFC 9579](https://www.rfc-editor.org/rfc/rfc9579) / [RFC 9879: PBMAC1 in PKCS #12](https://www.rfc-editor.org/rfc/rfc9879)
- OpenSSL: [`openssl-pkcs12` 3.0](https://github.com/openssl/openssl/blob/openssl-3.0/doc/man1/openssl-pkcs12.pod.in) and [1.1.1](https://github.com/openssl/openssl/blob/OpenSSL_1_1_1-stable/doc/man1/pkcs12.pod) / [CHANGES.md](https://github.com/openssl/openssl/blob/master/CHANGES.md) (3.0.0, 3.4.0) / [`crypto/pem/pem_lib.c`](https://github.com/openssl/openssl/blob/openssl-3.0/crypto/pem/pem_lib.c)
- OpenJDK: [`JavaKeyStore.java`, `KeyProtector.java`](https://github.com/openjdk/jdk/tree/master/src/java.base/share/classes/sun/security/provider) / [JCEKS `JceKeyStore.java`, `KeyProtector.java`](https://github.com/openjdk/jdk/tree/master/src/java.base/share/classes/com/sun/crypto/provider) / [`java.security`](https://github.com/openjdk/jdk/blob/master/src/java.base/share/conf/security/java.security) (also at `jdk-15-ga`, `jdk-16-ga`, `jdk-27-ga`) / [`MacData.java` (JDK 26)](https://github.com/openjdk/jdk/blob/jdk-26-ga/src/java.base/share/classes/sun/security/pkcs12/MacData.java) / [`GenerateCacerts.java` (JDK 18)](https://github.com/openjdk/jdk/blob/jdk-18-ga/make/jdk/src/classes/build/tools/generatecacerts/GenerateCacerts.java) / [`keytool.properties` (JDK 26)](https://github.com/openjdk/jdk/blob/jdk-26-ga/src/java.base/share/classes/sun/security/tools/keytool/resources/keytool.properties) / [`TrustStoreManager.java`](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/sun/security/ssl/TrustStoreManager.java) / [JEP 229](https://openjdk.org/jeps/229) / keytool(1)
- [OpenSSH `PROTOCOL.key`](https://github.com/openssh/openssh-portable/blob/master/PROTOCOL.key) / Microsoft [Export-Certificate](https://github.com/MicrosoftDocs/windows-powershell-docs/blob/main/docset/winserver2025-ps/pki/Export-Certificate.md) and [Export-PfxCertificate](https://github.com/MicrosoftDocs/windows-powershell-docs/blob/main/docset/winserver2025-ps/pki/Export-PfxCertificate.md) / Apple [security(1)](https://github.com/apple-oss-distributions/Security/blob/main/SecurityTool/macOS/security.1) / Firefox [`certManager.ftl`](https://github.com/mozilla-firefox/firefox/blob/main/security/manager/locales/en-US/security/certificates/certManager.ftl)

*Weaker sources:* search summaries of the RFC Editor pages for RFC 9579 and
9879 (dates, the UTF-8 password change), which could not be opened here.
