# PKI (Public Key Infrastructure)

*How a stranger's public key comes to be trusted. A certificate authority (CA)
signs a statement binding a name to a key, and a client follows such signatures
from a server's certificate up to a root key it already holds.*

**Standard:** X.509, profiled by RFC 5280 (2008; Section 6 is path validation);
CRLs (RFC 5280 §5), OCSP (RFC 6960, 2013); Certificate Transparency, RFC 6962
(2013; CT 2.0 is RFC 9162, 2021); ACME, RFC 8555 (2019). Public TLS CAs follow
the CA/Browser Forum Baseline Requirements (BRs, since July 2012; v2.3.1,
October 2026) and the root programs of Mozilla (NSS), Apple, Microsoft and
Chrome (own root store since 2022). **Implementations:** OpenSSL, Let's
Encrypt's Boulder, step-ca, EJBCA, AD CS; Chrome verifies with BoringSSL, Firefox with NSS.

A certificate's fields are in [X.509](../formats/X.509.md), its notation and
bytes in [ASN.1 and DER](../formats/ASN.1-DER.md), its files (PEM, PKCS#7,
PKCS#12, Java stores) in [File formats](../formats/File-Formats.md), and command
recipes in [openssl](../tools/openssl.md) and [keytool](../tools/keytool.md).

## The goal: bind names to public keys

A signature proves possession of a private key, not whose key it is. In PKI,
someone the client already trusts vouches for that, in these terms:

| Term | Meaning |
|---|---|
| Entity | anything that can hold a key: a person, a server, a device, a CA |
| Identity | the set of facts by which an entity is known |
| Identifier, name | a value that picks out one identity: a DNS name, an email or IP address, a distinguished name |
| Claim | a statement about an entity, such as "this key belongs to `www.example.org`"; a certificate is a signed set of claims |
| Subscriber (end entity) | the one a certificate is issued to, holding its private key: here, a web server |
| Certificate authority (issuer) | checks the claims and signs certificates; one certificate's issuer is the subject of the next one up |
| Leaf certificate | the subscriber's certificate, `CA:FALSE`: it can't sign other certificates |
| Intermediate certificate | a CA certificate signed by a root or another intermediate; it signs the leaves day to day |
| Root certificate | a self-signed CA certificate whose key sits in a trust store: the trust anchor |
| Relying party | whoever checks a certificate and acts on it: a browser, a mail client, an API client |

**MACs and signatures both authenticate data**, but a [MAC](../06-mac/HMAC.md)
makes and checks its tag with one shared key: every browser would share a key
with every CA and could forge certificates. A [signature](../index.md#2-digital-signatures)
([ECDSA](../02-signatures/ECDSA.md), [RSA](../02-signatures/RSA.md), [ML-DSA](../02-signatures/ML-DSA.md))
is checked with a public key, so anyone can verify a CA's work and only the CA can do it.

**What can key pairs do?** Encrypt to a public key for the private key to
decrypt, and sign with the private key for anyone to verify. Encrypting with
[RSA](../02-signatures/RSA.md) is fading: TLS 1.3 dropped RSA key transport
(RFC 8446 §1.2) for [ECDH](../01-key-exchange/ECDH.md), and post-quantum designs
use a KEM, [ML-KEM](../01-key-exchange/ML-KEM.md), so certificates mostly carry signing keys.

## One connection, one chain

Real output from OpenSSL 3.0.13 (Ubuntu 24.04 in a container, Oct 2026). A
throwaway root (RSA-4096) signed an intermediate (P-384, `CA:TRUE, pathlen:0`)
that signed a 90-day leaf for `www.example.org` (P-256, name in the SAN), the
shape of Let's Encrypt's 2024 chain ISRG Root X1 → E5 → leaf (recipe in
[openssl](../tools/openssl.md#a-test-ca-and-chain)). `openssl s_server` sent the
leaf and intermediate; the client held only the root (trimmed):

```
$ openssl s_client -connect localhost:8443 -servername www.example.org \
    -verify_hostname www.example.org -CAfile root.crt </dev/null
depth=2 O = Demo, CN = Demo Root CA
Certificate chain
 0 s:CN = www.example.org
   i:O = Demo, CN = Demo Issuing CA
   a:PKEY: id-ecPublicKey, 256 (bit); sigalg: ecdsa-with-SHA384
 1 s:O = Demo, CN = Demo Issuing CA
   i:O = Demo, CN = Demo Root CA
   a:PKEY: id-ecPublicKey, 384 (bit); sigalg: RSA-SHA256
Peer signature type: ECDSA
SSL handshake has read 1838 bytes and written 397 bytes
Verification: OK
Verified peername: www.example.org
```

| In the output | Category | Algorithm inside |
|---|---|---|
| `ecdsa-with-SHA384` (link 0) | [Signature](../index.md#2-digital-signatures) | the intermediate's [ECDSA](../02-signatures/ECDSA.md) P-384 key signed the leaf; the BRs pair P-384 with SHA-384 |
| `RSA-SHA256` (link 1) | [Signature](../index.md#2-digital-signatures) | the root's [RSA](../02-signatures/RSA.md)-4096 key signed the intermediate, PKCS#1 v1.5: 512 bytes |
| `SHA384`, `SHA256` | [Hash](../index.md#7-hash-functions) | [SHA-2](../07-hash/SHA-2.md) of each certificate's to-be-signed DER, inside those signatures |
| `256 (bit)`, `Peer signature type` | [Signature](../index.md#2-digital-signatures) | the leaf's P-256 key signed this handshake (TLS 1.3 CertificateVerify), proving the server holds it |

**Why the root isn't sent.** The server sent certificates 0 and 1; `depth=2`,
the root, came from the client's own store, since trust can't come from the
wire (RFC 8446 §4.4.2 lets servers omit it). Each link is checked with the key
above it, so an RSA root can sign an ECDSA intermediate.

## How a certificate is issued and checked

1. **Issuance.** The subscriber proves it controls the name, usually over ACME:
   `http-01` serves a token under `/.well-known/acme-challenge/`, `dns-01` puts
   one in a TXT record at `_acme-challenge` (RFC 8555 §8.3–8.4), `tls-alpn-01`
   returns it in a TLS certificate (RFC 8737). Since March 2025 the CA must see
   the same answer from several networks (BRs §3.2.2.9).
2. **Leaf first.** The server sends its leaf, then intermediates (RFC 8446
   §4.4.2). The name dialed must be in the SAN (the CN is only a fallback, RFC
   6125 §6.4.4) and the EKU must allow `serverAuth`; Chrome is phasing out
   roots whose CAs issue for other uses, so Let's Encrypt ended client-auth
   certificates in 2026.
3. **Build a path.** Match each certificate's issuer and Authority Key
   Identifier to the subject and Subject Key Identifier of one sent, cached or
   trusted; cross-signs allow several paths (RFC 4158). Chrome fetches missing
   intermediates from the AIA `caIssuers` URL and Firefox preloads them; OpenSSL
   doesn't, so without `-untrusted int.crt` its `verify` fails with `error 20`.
4. **Check each link** (RFC 5280 §6.1.3–6.1.4): signature, dates, issuer name;
   for a CA also `CA:TRUE`, path length (`pathlen:0`: no CA below) and
   `keyCertSign`. `nameConstraints` and policies bind all below it.
5. **Revocation.** CAs publish signed CRLs; the BRs made OCSP optional in March
   2024. OCSP shows the CA every site a user visits, so Let's Encrypt dropped
   OCSP URLs on 7 May 2025 and its responders on 6 August 2025; Must-Staple (RFC
   7633) never caught on. Browsers use their own lists: Firefox's CRLite holds
   all revocations on desktop (OCSP only for EV), Chrome's CRLSet revoked CAs
   and leaves revoked for `keyCompromise` or `privilegeWithdrawn`.
6. **Transparency.** Chrome rejects public certificates issued after 30 April
   2018 without Signed Certificate Timestamps from CT logs (two, three if valid
   over 180 days; see [X.509](../formats/X.509.md)); Firefox enforces CT too.
   Domain owners can watch the logs for certificates they never asked for.
7. **Trust anchor.** The path must end at a key in the client's store; the
   root's self-signature is never checked (RFC 8446 §4.2.3).

**Cross-signing.** One CA key can sit in a self-signed root and in a
certificate from an older root, so old stores still find a path. DST Root CA
X3's cross-sign of ISRG Root X1 kept old Android working until 30 September
2024, three years past that root's own expiry (Android ignores anchors' dates);
a 2026 Let's Encrypt chain is leaf ← YE1 ← Root YE ← ISRG Root X2 ← ISRG Root
X1. **Roots stay offline**, signing little but intermediates (BRs §6.1.7), and
Chrome retires a root once its key is 15 years old (ISRG Root X1: 2030).

**Short lives instead of revocation.** Ballot SC-081 (April 2025) cut a public
TLS certificate's life from 398 days to 200 from 15 March 2026, 100 from 15
March 2027 and 47 from 15 March 2029, so a stolen key or a misissued
certificate soon expires, revoked or not. Let's Encrypt moves from 90 to 64
days on 10 February 2027 and 45 in February 2028; its 6-day certificates are
open to all since January 2026.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Signature (on certificates, CRLs, OCSP) | RSA PKCS#1 v1.5 or PSS with SHA-256/384/512; ECDSA P-256 with SHA-256, P-384 with SHA-384 (P-521 allowed, rare) | RFC 5280, RFC 4055, RFC 5758; BRs §7.1.3.2 | [SHA-1](../07-hash/Retired.md#sha-1) (none in certificates or CRLs after 15 September 2026), [MD5](../07-hash/Retired.md#md5), DSA |
| Subject keys | RSA 2048+, EC P-256/384; roots mostly RSA-4096 and P-384 | BRs §6.1.5, RFC 5480 | RSA under 2048 bits; [Ed25519](../02-signatures/EdDSA.md) not allowed for TLS (BRs §6.1.5) |
| Hash | SHA-256, SHA-384 in signatures; SHA-256 in CT trees | FIPS 180-4, RFC 6962 | SHA-1 signatures; SHA-1 still names keys (SKI, AKI) |
| CT and OCSP signatures | SCTs: ECDSA P-256 or RSA-2048+ with SHA-256; OCSP: the CA or a delegated responder | RFC 6962 §2.1.4, RFC 6960 | SHA-1 OCSP signatures (BRs, 2022) |
| Post-quantum | [ML-DSA](../02-signatures/ML-DSA.md) in private PKIs (Chrome 150+); Merkle Tree Certificates, ML-DSA-44 cosigners (planned) | RFC 9881 (2025), draft-ietf-plants-merkle-tree-certs | — |

**Post-quantum.** A web handshake carries five signatures and two public keys:
in ML-DSA-44 (2,420-byte signatures, 1,312-byte keys) over 10 KB, against 1,838
bytes above. Chrome said in February 2026 it won't add post-quantum X.509 roots;
its Quantum-resistant Root Store (target Q3 2027) will take only Merkle Tree
Certificate CAs, which sign one tree head for many certificates, so a server
sends an inclusion proof (736 bytes in the draft's example). Chrome and
Cloudflare are testing them and Let's Encrypt plans to issue them in 2027.
KEMTLS (2020) would also swap the handshake signature for a KEM.

## Seeing it on your machine

```
sudo cp my-root.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates   # into /etc/ssl/certs
openssl verify -show_chain -CAfile root.crt -untrusted int.crt leaf.crt   # the chain above
openssl storeutl -certs -noout -text /etc/ssl/certs/ca-certificates.crt \
  | grep -E 'Public Key Algorithm|Public-Key:' | paste - - | sort | uniq -c | sort -rn | tr -s ' \t' ' '
security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain   # macOS
certutil -verify -urlfetch leaf.cer                     # Windows: build the chain, fetch AIA and CRLs
```

On the 117 Mozilla roots in Ubuntu 24.04's ca-certificates 20260816, `storeutl` printed:

```
 59 Public Key Algorithm: rsaEncryption Public-Key: (4096 bit)
 35 Public Key Algorithm: id-ecPublicKey Public-Key: (384 bit)
 19 Public Key Algorithm: rsaEncryption Public-Key: (2048 bit)
 3 Public Key Algorithm: id-ecPublicKey Public-Key: (256 bit)
 1 Public Key Algorithm: id-ecPublicKey Public-Key: (521 bit)
```

All RSA or NIST curves, as in the table. Three of these roots are still
self-signed with SHA-1, harmless since no one checks a trust anchor's own signature.

## See also

- [TLS 1.3](TLS-1.3.md) / [S/MIME](S-MIME.md): where the chain is sent and the leaf's key signs the handshake; the same PKI for mail
- [X.509](../formats/X.509.md) / [ASN.1 and DER](../formats/ASN.1-DER.md) / [File formats](../formats/File-Formats.md): the certificate field by field, its bytes, and its files
- [openssl](../tools/openssl.md) / [keytool](../tools/keytool.md): building a chain, Java key and trust stores, viewing certificates and remote servers
- [DNSSEC](DNSSEC.md): a separate chain of trust from the DNS root, which DANE uses to pin TLS keys
- [ECDSA](../02-signatures/ECDSA.md) / [RSA](../02-signatures/RSA.md) / [ML-DSA](../02-signatures/ML-DSA.md): the signatures in a chain, and their post-quantum successor

## References

- [RFC 5280: X.509 certificate and CRL profile](https://www.rfc-editor.org/rfc/rfc5280) (Sections 5, 6.1.3, 6.1.4) / [RFC 4158: path building](https://www.rfc-editor.org/rfc/rfc4158) / [RFC 4949: glossary](https://www.rfc-editor.org/rfc/rfc4949) / [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446) (Sections 1.2, 4.2.3, 4.4.2) / [RFC 6125](https://www.rfc-editor.org/rfc/rfc6125) (Section 6.4.4)
- [RFC 6960: OCSP](https://www.rfc-editor.org/rfc/rfc6960) / [RFC 7633: Must-Staple](https://www.rfc-editor.org/rfc/rfc7633) / [RFC 6962: CT](https://www.rfc-editor.org/rfc/rfc6962) (Section 2.1.4) / [RFC 9162: CT 2.0](https://www.rfc-editor.org/rfc/rfc9162) / [RFC 8555: ACME](https://www.rfc-editor.org/rfc/rfc8555) (Sections 8.3, 8.4) / [RFC 8737: tls-alpn-01](https://www.rfc-editor.org/rfc/rfc8737)
- [CA/Browser Forum TLS Baseline Requirements](https://github.com/cabforum/servercert/blob/main/docs/BR.md) (v2.3.1, Sections 1.2.1, 1.2.2, 3.2.2.9, 4.2.1, 6.1.5, 6.1.7, 6.3.2, 7.1.3) / [Mozilla Root Store Policy](https://github.com/mozilla/pkipolicy/blob/master/rootstore/policy.md) (3.1, Section 5.1)
- [Chrome Root Program Policy](https://github.com/GoogleChrome/chromerootprogram/blob/main/content/crp/policy.md) (1.8, Sections 1.3.1.2, 1.3.1.3, 1.3.2) / [Chrome Root Store FAQ](https://github.com/chromium/chromium/blob/main/net/data/ssl/chrome_root_store/faq.md) / [Chrome CT policy](https://github.com/GoogleChrome/CertificateTransparency/blob/master/ct_policy.md) / [Chromium `cert_issuer_source_aia.h`](https://github.com/chromium/chromium/blob/main/net/cert/internal/cert_issuer_source_aia.h) / Firefox [`StaticPrefList.yaml`](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/StaticPrefList.yaml) (`security.pki.crlite_mode`, `security.pki.certificate_transparency.mode`) and [`all.js`](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/all.js) (`security.remote_settings.intermediates.enabled`)
- [Chrome Quantum-resistant Root Program draft policy](https://github.com/GoogleChrome/chromerootprogram/blob/main/content/cqrp/draft-policy.md) (0.4.0) and [FAQ](https://github.com/GoogleChrome/chromerootprogram/blob/main/content/cqrp/faq.md) / [draft-ietf-plants-merkle-tree-certs](https://datatracker.ietf.org/doc/draft-ietf-plants-merkle-tree-certs/) ([source](https://github.com/ietf-plants-wg/merkle-tree-certs), -07) / [RFC 9881: ML-DSA in X.509](https://www.rfc-editor.org/rfc/rfc9881) / [Schwabe, Stebila, Wiggers: KEMTLS](https://eprint.iacr.org/2020/534)
- Let's Encrypt ([site source](https://github.com/letsencrypt/website)): [Ending OCSP](https://letsencrypt.org/2024/12/05/ending-ocsp/) / [OCSP end of life](https://letsencrypt.org/2025/08/06/ocsp-service-has-reached-end-of-life/) / [Android compatibility](https://letsencrypt.org/2020/12/21/extending-android-compatibility/) / [Shortening the chain](https://letsencrypt.org/2023/07/10/cross-sign-expiration/) / [New intermediates](https://letsencrypt.org/2024/03/19/new-intermediate-certificates/) / [Chains of Trust](https://letsencrypt.org/certificates/) / [Ending client auth](https://letsencrypt.org/2025/05/14/ending-tls-client-authentication/) / [45 days](https://letsencrypt.org/2025/12/02/from-90-to-45/) / [64 days](https://letsencrypt.org/2026/10/07/64-day-certs/) / [6-day certificates](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability/) / [Post-quantum plans](https://letsencrypt.org/2026/06/03/pq-certs/) / [Boulder](https://github.com/letsencrypt/boulder); [step-ca](https://github.com/smallstep/certificates) / [EJBCA](https://github.com/Keyfactor/ejbca-ce)

*Weaker sources:* a search-engine summary of the RFC Editor page for RFC 9881 (published October 2025), which could not be opened here.
