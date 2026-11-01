# X.509 certificates

*A CA's signed statement that a public key belongs to a name, for certain
uses, between two dates. All of it sits in one block, the `tbsCertificate`
("to be signed"); the CA signs the DER bytes of that block, so anyone holding
the CA's public key can check the binding offline.*

**Standard:** ITU-T X.509 (ISO/IEC 9594-8): v1 1988, v2 1993, v3 1996 (1997
edition). Internet profile: RFC 5280 (2008; before it RFC 2459 and 3280),
updated by RFC 6818 (2013) and in 2024 by RFC 9549 and 9598 (international
names and email, replacing RFC 8399 and 8398), 9608 (`noRevAvail`) and 9618
(policy checks). Public TLS certificates also follow the CA/Browser Forum
Baseline Requirements (BRs). **Used by:** [TLS 1.3](../protocols/TLS-1.3.md),
[S/MIME](../protocols/S-MIME.md), [IKEv2](../protocols/IPsec.md),
[Kerberos](../protocols/Kerberos.md) PKINIT, [FIDO2](../protocols/FIDO2.md)
attestation, [JWT](../protocols/JWT.md) `x5c`, code signing. "Certificate"
alone means X.509; [SSH](../protocols/SSH.md) (draft-ietf-sshm-cert) and
[OpenPGP](../protocols/OpenPGP.md) have formats of their own.

## One certificate, field by field

Real output from OpenSSL 3.0.13 (Ubuntu 24.04 in a container, Oct 2026). A
throwaway P-256 CA signed a 90-day leaf for `example.org` with extensions like
a public TLS certificate's; `openssl x509 -noout -text` shows (bytes trimmed):

```
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            02:2f:00:95:0f:00:b2:85:0b:d0:95:ac:bd:70:2c:ad:89:66:fc:a6
        Signature Algorithm: ecdsa-with-SHA256
        Issuer: O = Example CA, CN = Example Root
        Validity
            Not Before: Oct 30 17:37:49 2026 GMT
            Not After : Jan 28 17:37:49 2027 GMT
        Subject: CN = example.org
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub:
                    04:6b:22:0d:a6:d9:cf:24:f1:f9:04:ea:d3:c6:e2: ...
                NIST CURVE: P-256
        X509v3 extensions:
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Key Usage: critical
                Digital Signature
            X509v3 Extended Key Usage:
                TLS Web Server Authentication
            X509v3 Subject Alternative Name:
                DNS:example.org, DNS:www.example.org
            X509v3 Authority Key Identifier:
                57:DF:F2:3C:14:A0:6F:80:AB:1C:7D:E0:B3:92:87:67:FE:09:80:58
            X509v3 Certificate Policies:
                Policy: 2.23.140.1.2.1
            X509v3 CRL Distribution Points:
                Full Name:
                  URI:http://ca.example.org/ca.crl
            Authority Information Access:
                CA Issuers - URI:http://ca.example.org/ca.crt
    Signature Algorithm: ecdsa-with-SHA256
    Signature Value:
        30:44:02:20:2a:f9:48:81:49:77:0d:9f:c9:95:d5:46:3f:98: ...
```

| Printed as | RFC 5280 field | What it holds |
|---|---|---|
| `Data:` | `tbsCertificate` | everything down to the extensions: the bytes the CA signs |
| `Version: 3 (0x2)` | `version` | stored as 0, 1 or 2. v2 added `issuerUniqueID` and `subjectUniqueID`, which RFC 5280 CAs must not use; v3 added extensions |
| `Serial Number` | `serialNumber` | positive, unique per CA, at most 20 octets. OpenSSL drew 159 random bits; public CAs must use at least 64 |
| first `Signature Algorithm` | `signature` | the CA's [signature](../index.md#2-digital-signatures) algorithm, here [ECDSA](../02-signatures/ECDSA.md) with [SHA-256](../07-hash/SHA-2.md) |
| `Issuer` | `issuer` | the CA's distinguished name, equal to the subject of the CA's own certificate |
| `Validity` | `validity` | `notBefore` to `notAfter`, both included; UTCTime through 2049, GeneralizedTime from 2050. Public TLS leaves: 200 days at most since 15 March 2026, 100 from March 2027, 47 from March 2029 (BRs, ballot SC-081) |
| `Subject` | `subject` | a distinguished name; for a server the CN is legacy |
| `Subject Public Key Info` | `subjectPublicKeyInfo` | algorithm OID, parameters (here the curve) and the key: a 65-byte uncompressed P-256 point, `04` then x and y |
| Basic Constraints | extension, critical | `CA:FALSE`; a CA certificate has `CA:TRUE` (must be critical) and maybe a path length |
| Key Usage | extension, critical | what the key may do: `digitalSignature` for TLS, `keyCertSign` and `cRLSign` for a CA, `keyEncipherment` for RSA key transport |
| Extended Key Usage | extension | purposes by OID: `serverAuth` (1.3.6.1.5.5.7.3.1), `clientAuth`, `emailProtection`, `codeSigning` |
| Subject Alternative Name | extension (critical if the subject is empty) | the DNS names, IP or email addresses the key is for. Clients match host names here, not in the CN (RFC 6125 §6.4.4; RFC 9525 drops the CN fallback) |
| Authority Key Identifier | extension | the issuer's key ID: `57:DF:…:58` is the CA certificate's Subject Key Identifier, which finds the issuer when building a chain. CA certificates must have an SKI; the BRs say TLS leaves should not |
| Certificate Policies | extension | policy OIDs; 2.23.140.1.2.1 is the BRs' "domain validated" |
| CRL Distribution Points, Authority Information Access | extension | where to get the CA's revocation list, the issuer's certificate (`caIssuers`) and, optionally, an OCSP responder ([PKI](../protocols/PKI.md) covers revocation) |
| SCT list (not in this leaf) | extension, 1.3.6.1.4.1.11129.2.4.2 | Signed Certificate Timestamps from Certificate Transparency logs (RFC 6962). Chrome wants 2 from distinct logs, 3 if the certificate lives over 180 days |
| second `Signature Algorithm` | `signatureAlgorithm` | the same algorithm again, outside the signed part |
| `Signature Value` | `signatureValue` | over the DER of `tbsCertificate`; for ECDSA a DER `SEQUENCE` of r and s (`30 44 02 20 …`) |

## How it is built

One ASN.1 structure, sent as DER ([ASN.1 and DER](ASN.1-DER.md); PEM and
other files in [File formats](File-Formats.md)):

```
Certificate ::= SEQUENCE {
    tbsCertificate      TBSCertificate,       -- every field above, signed
    signatureAlgorithm  AlgorithmIdentifier,  -- same as tbsCertificate.signature
    signatureValue      BIT STRING }
```

1. **Fill in.** The subject sends its public key and names, usually as a
   PKCS#10 request (RFC 2986; ACME, RFC 8555, automates it for TLS). The CA
   checks the names and builds `tbsCertificate`.
2. **Log.** A public TLS CA first logs a precertificate (the same fields plus
   a critical "poison" extension) and adds the SCTs it gets back (RFC 6962 §3).
3. **Sign.** The CA signs the DER bytes of `tbsCertificate` and wraps the
   three parts in the outer `SEQUENCE`.
4. **Verify.** A client checks the two algorithm fields match, the signature
   (with the issuer's key), dates, SAN, key usage and EKU, and rejects unknown
   critical extensions (RFC 5280 §4.2); then it checks the issuer the same way.

**All three outer fields are required** (RFC 5280 §4.1.1); the signature
algorithm and signature are not optional. Only the unique IDs and
`extensions` may be left out.

**A fingerprint is not a field.** It is a hash of the whole DER certificate
(Windows: thumbprint). `openssl x509 -fingerprint` defaults to SHA-1 and .NET's
`Thumbprint` is always SHA-1; compare SHA-256 when it matters. Non-DER bytes in
the unsigned outer fields could change a fingerprint without breaking the
signature until OpenSSL 1.0.1k rejected them (2015, CVE-2014-8275).

## Algorithms in certificates

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| [Signature](../index.md#2-digital-signatures) (by the CA) | [RSA](../02-signatures/RSA.md) PKCS#1 v1.5 or PSS with SHA-256/384/512; [ECDSA](../02-signatures/ECDSA.md) P-256/384/521 with SHA-256/384/512 | RFC 3279 (2002), RFC 4055 (2005), RFC 5758 (2010) | [MD5](../07-hash/Retired.md#md5) (rogue CA, 2008) and [SHA-1](../07-hash/Retired.md#sha-1) (none in public TLS certificates or CRLs after 15 September 2026); DSA |
| Subject key | RSA 2048+ (`rsaEncryption`), EC P-256/384/521 (`id-ecPublicKey`) | RFC 3279, RFC 5480 (2009) | RSA under 2048 bits |
| Edwards curves | [Ed25519 and Ed448](../02-signatures/EdDSA.md) keys and signatures; [X25519 and X448](../01-key-exchange/ECDH.md#x25519-and-x448) keys | RFC 8410 (2018) | not allowed in public TLS certificates (BRs §6.1.5) |
| Post-quantum | [ML-DSA](../02-signatures/ML-DSA.md), [SLH-DSA](../02-signatures/SLH-DSA.md), [ML-KEM](../01-key-exchange/ML-KEM.md) keys; [HSS and XMSS](../02-signatures/Stateful-Hash-Signatures.md) for roots and firmware; ML-DSA paired with RSA, ECDSA or EdDSA ("composite") | RFC 9881 (2025), RFC 9909 (2025), RFC 9935 (2026), RFC 9802 (2025); composite: IETF draft | not yet in public TLS certificates; S/MIME CAs may issue ML-DSA and ML-KEM |
| [Hash](../index.md#7-hash-functions) | [SHA-2](../07-hash/SHA-2.md) inside signatures; SHA-1 in key IDs (OpenSSL's `57:DF:…` is the SHA-1 of the CA's key) and many tools' fingerprints | FIPS 180-4, RFC 5280 §4.2.1.2 | MD5 and SHA-1 signatures |

## Seeing it on your machine

```
openssl x509 -in /etc/ssl/certs/ISRG_Root_X1.pem -noout -text                  # every field of a real root
openssl x509 -in /etc/ssl/certs/ISRG_Root_X1.pem -noout -fingerprint -sha256   # SHA-256 of the DER bytes
openssl s_client -connect example.org:443 </dev/null | openssl x509 -noout -text   # a server's leaf (SNI is sent)
```

- **More:** a test CA, a whole chain, bundles, PEM and DER on [openssl](../tools/openssl.md).
- **Python:** a fingerprint is just a hash of the DER bytes. Press Enter for
  Let's Encrypt's RSA root in Ubuntu's CA bundle.

```python
import hashlib, ssl

path = input("PEM certificate: ").strip() or "/etc/ssl/certs/ISRG_Root_X1.pem"
der = ssl.PEM_cert_to_DER_cert(open(path).read())  # base64 -> DER bytes
print(len(der), "bytes of DER")
print("SHA-256", hashlib.sha256(der).digest().hex(":").upper())
print("SHA-1  ", hashlib.sha1(der).digest().hex(":").upper())
```

```
1391 bytes of DER
SHA-256 96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6
SHA-1   CA:BD:2A:79:A1:07:6A:31:F2:1D:25:36:35:CB:03:9D:43:29:A5:E8
```

Both match `openssl x509 -fingerprint` and the fingerprints printed above ISRG
Root X1 in Mozilla's root list (NSS `certdata.txt`).

## See also

- [ASN.1 and DER](ASN.1-DER.md) / [File formats](File-Formats.md): how these fields become bytes, and the PEM, PKCS#7 and PKCS#12 files they travel in
- [PKI](../protocols/PKI.md): chains, CAs, trust stores and revocation
- [TLS 1.3](../protocols/TLS-1.3.md) / [S/MIME](../protocols/S-MIME.md): the two biggest users; S/MIME CAs may issue ML-DSA and ML-KEM certificates
- [openssl](../tools/openssl.md): commands to make, read and convert certificates
- [ECDSA](../02-signatures/ECDSA.md) / [RSA](../02-signatures/RSA.md) / [ML-DSA](../02-signatures/ML-DSA.md): the signatures inside

## References

- [RFC 5280: X.509 certificate and CRL profile](https://www.rfc-editor.org/rfc/rfc5280) (Sections 3.1, 4.1, 4.2) / [RFC 6818](https://www.rfc-editor.org/rfc/rfc6818) / [RFC 9549](https://www.rfc-editor.org/rfc/rfc9549) / [RFC 9598](https://www.rfc-editor.org/rfc/rfc9598) / [RFC 9608](https://www.rfc-editor.org/rfc/rfc9608) / [RFC 9618](https://www.rfc-editor.org/rfc/rfc9618) / [RFC 3280](https://www.rfc-editor.org/rfc/rfc3280) / [RFC 2459](https://www.rfc-editor.org/rfc/rfc2459) / [ITU-T X.509](https://www.itu.int/rec/T-REC-X.509)
- [RFC 3279](https://www.rfc-editor.org/rfc/rfc3279) / [RFC 4055](https://www.rfc-editor.org/rfc/rfc4055) / [RFC 5480](https://www.rfc-editor.org/rfc/rfc5480) / [RFC 5758](https://www.rfc-editor.org/rfc/rfc5758) / [RFC 8410](https://www.rfc-editor.org/rfc/rfc8410): algorithm identifiers
- [RFC 9881: ML-DSA](https://www.rfc-editor.org/rfc/rfc9881) ([source](https://github.com/lamps-wg/dilithium-certificates)) / [RFC 9909: SLH-DSA](https://www.rfc-editor.org/rfc/rfc9909) ([source](https://github.com/lamps-wg/x509-slhdsa)) / [RFC 9935: ML-KEM](https://www.rfc-editor.org/rfc/rfc9935) ([source](https://github.com/lamps-wg/kyber-certificates)) / [RFC 9802: HSS and XMSS](https://www.rfc-editor.org/rfc/rfc9802) / [draft-ietf-lamps-pq-composite-sigs](https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/) ([source](https://github.com/lamps-wg/draft-composite-sigs))
- [RFC 6962: Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962) (Sections 3.1, 3.3) / [Chrome CT policy](https://github.com/GoogleChrome/CertificateTransparency/blob/master/ct_policy.md) / [RFC 6125](https://www.rfc-editor.org/rfc/rfc6125) (Section 6.4.4) / [RFC 9525](https://www.rfc-editor.org/rfc/rfc9525) / [RFC 2986: PKCS #10](https://www.rfc-editor.org/rfc/rfc2986) / [RFC 8555: ACME](https://www.rfc-editor.org/rfc/rfc8555)
- [CA/Browser Forum TLS Baseline Requirements](https://github.com/cabforum/servercert/blob/main/docs/BR.md) (v2.3.1, Sections 1.2.2, 6.1.5, 6.3.2, 7.1.2.7, 7.1.3.2) / [draft-ietf-sshm-cert](https://datatracker.ietf.org/doc/draft-ietf-sshm-cert/) (the SSH working group's version of draft-miller-ssh-cert) (named in OpenSSH's [`PROTOCOL`](https://github.com/openssh/openssh-portable/blob/master/PROTOCOL))
- [OpenSSL CHANGES.md](https://github.com/openssl/openssl/blob/master/CHANGES.md) (1.0.1k) / [OpenSSL 3.0 `apps/include/apps.h`](https://github.com/openssl/openssl/blob/openssl-3.0/apps/include/apps.h) (`SERIAL_RAND_BITS`) / [.NET `X509Certificate2.Thumbprint`](https://learn.microsoft.com/dotnet/api/system.security.cryptography.x509certificates.x509certificate2.thumbprint) / [NSS `certdata.txt`](https://github.com/nss-dev/nss/blob/master/lib/ckfw/builtins/certdata.txt)

*Weaker sources:* search-engine summaries of RFC Editor pages that could not be
opened here: RFC 9525, 9549, 9608, 9618, 9802, 9881, 9909, 9935 (months, scope).
