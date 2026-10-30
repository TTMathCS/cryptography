# ASN.1 and DER (Abstract Syntax Notation One, Distinguished Encoding Rules)

*The schema language and byte format under certificates, keys and signed
messages. ASN.1 says which fields a structure has; encoding rules turn values
into bytes. A signature covers bytes, so cryptography uses DER, the rules that
give every value exactly one encoding.*

**Standard:** ITU-T X.680 (notation) and X.690 (BER, CER, DER), so numbered
since 1994, current editions 2021, also ISO/IEC 8824-1 and 8825-1; first CCITT
X.409 (1984), then X.208/X.209 (1988). X.509's modules: RFC 5280 Appendix A
(1988 syntax), RFC 5912 (2010, 2002 syntax). **Used by:** [X.509](X.509.md),
[key files, PKCS#7, PKCS#12](File-Formats.md), OCSP, [TLS](../protocols/TLS-1.3.md),
[S/MIME](../protocols/S-MIME.md), [Kerberos](../protocols/Kerberos.md), ECDSA
signatures in [FIDO2](../protocols/FIDO2.md) and [Bitcoin](../protocols/Bitcoin.md).

## One certificate, byte by byte

OpenSSL 3.0.13 and `xxd` on Ubuntu 24.04 in a container, Oct 2026, on ISRG
Root X1, Let's Encrypt's root (trimmed; `hl` is tag plus length bytes):

```
$ openssl x509 -in /etc/ssl/certs/ISRG_Root_X1.pem -outform DER | xxd -l 48
00000000: 3082 056b 3082 0353 a003 0201 0202 1100  0..k0..S........
00000010: 8210 cfb0 d240 e359 4463 e0bb 6382 8b00  .....@.YDc..c...
00000020: 300d 0609 2a86 4886 f70d 0101 0b05 0030  0...*.H........0
$ openssl asn1parse -in /etc/ssl/certs/ISRG_Root_X1.pem -i
    0:d=0  hl=4 l=1387 cons: SEQUENCE
    4:d=1  hl=4 l= 851 cons:  SEQUENCE
    8:d=2  hl=2 l=   3 cons:   cont [ 0 ]
   10:d=3  hl=2 l=   1 prim:    INTEGER           :02
   13:d=2  hl=2 l=  17 prim:   INTEGER           :8210CFB0D240E3594463E0BB63828B00
…
  802:d=5  hl=2 l=   1 prim:      BOOLEAN           :255
```

| Bytes | ASN.1 | What it is |
|---|---|---|
| `30 82 05 6b`, `30 82 03 53` | SEQUENCE, SEQUENCE | the Certificate: `30` is SEQUENCE (16) plus the constructed bit, `82` puts the length in the next two bytes, `05 6b` = 1,387 (1,391 with the header). Inside it, tbsCertificate (851 bytes): exactly what the signature covers (RFC 5280 §4.1.1.3) |
| `a0 03 02 01 02` | `[0] EXPLICIT` INTEGER | version: `a0` is context-specific tag 0, constructed; 2 means v3. A v1 certificate leaves it out (`DEFAULT v1`) |
| `02 11 00 82 10 … 8b 00` | INTEGER | serial: 16 bytes plus a `00`, as `82` has its top bit set and would read as negative. RFC 5280 §4.1.2.2: positive, at most 20 bytes |
| `30 0d 06 09 2a 86 … 05 00` | AlgorithmIdentifier | 1.2.840.113549.1.1.11 and NULL parameters: a [signature](../index.md#2-digital-signatures) by [RSA](../02-signatures/RSA.md) PKCS#1 v1.5 over a [SHA-256](../07-hash/SHA-2.md) [hash](../index.md#7-hash-functions) |
| `30 4f 31 0b 30 09 06 03 55 04 06 13 02 55 53`, `30 1e 17 0d …` | Name, Validity | issuer, a SEQUENCE of SETs starting with countryName (2.5.4.6) = PrintableString "US"; then two UTCTimes, 2015-06-04 and 2035-06-04 (from 2050: GeneralizedTime, RFC 5280 §4.1.2.5) |
| `30 82 02 22` … `03 82 02 0f 00` | SubjectPublicKeyInfo | rsaEncryption (1.2.840.113549.1.1.1) and a BIT STRING (`00`: no unused bits) holding more DER: the 4096-bit modulus as a 513-byte INTEGER, and 65537 |
| `a3 42` … `01 01 ff` | `[3]` Extensions | key usage and basic constraints, both critical (BOOLEAN `ff`), and a key identifier; see [X.509](X.509.md) |
| `03 82 02 01 00 …` | BIT STRING | the signature: an unused-bits byte, then 512 bytes of RSA-4096 |

**"DER" twice.** DER is the encoding; a `.der` (often `.cer`) file is called
DER because it holds exactly these bytes. PEM is the same bytes in Base64, and
the SHA-256 fingerprint is their hash. Files are on [File formats](File-Formats.md).

## How it is built

ASN.1 is a schema language, nearer Protocol Buffers, Thrift or SQL DDL than
JSON: RFC 5280 §4.1 declares a `Certificate` as a `SEQUENCE` of tbsCertificate,
signatureAlgorithm and signatureValue, and says nothing about bytes. BER, CER
and DER write each value as tag, length, value (TLV):

1. **Tag.** One byte up to tag 30: bits 8-7 the class (`00` universal, `01`
   application, `10` context-specific, `11` private), bit 6 set if it holds more
   TLVs (constructed), bits 5-1 the number. Universal: BOOLEAN 1, INTEGER 2,
   BIT STRING 3, OCTET STRING 4, NULL 5, OID 6, UTF8String 12, SEQUENCE 16
   (`30`), SET 17 (`31`), PrintableString 19, UTCTime 23, GeneralizedTime 24.
   `[0] EXPLICIT` wraps the inner TLV in `a0`; `[0] IMPLICIT` replaces its tag.
2. **Length.** 0 to 127 in one byte; else `81` to `84` give the number of
   length bytes. `80` alone is indefinite, ended by `00 00`: BER only.
3. **Value.** INTEGER is two's complement in the fewest bytes, so 127 is
   `02 01 7f` and 128 is `02 02 00 80`. RSA-4096 moduli take 513 bytes, and
   ECDSA's r and s each gain a `00` half the time, so 400 P-256 signatures
   here ran from 69 to 72 bytes, mostly 71.
   [JWT](../protocols/JWT.md) and [DNSSEC](../protocols/DNSSEC.md) send r and s raw, 64 bytes.
4. **OIDs** name algorithms, attributes and extensions in one global tree. The
   first two arcs share a byte, 40·X + Y; later arcs are base 128, top bit set
   on all but the last byte: `2a 86 48 86 f7 0d …` is 1.2 (42), 840 (6·128 + 72), …

| OID | Bytes after `06 len` | Name | Defined in |
|---|---|---|---|
| 1.2.840.113549.1.1.11 | `2a 86 48 86 f7 0d 01 01 0b` | sha256WithRSAEncryption: [RSA](../02-signatures/RSA.md) PKCS#1 v1.5, SHA-256 | RFC 4055, RFC 8017 |
| 1.2.840.10045.4.3.2 | `2a 86 48 ce 3d 04 03 02` | ecdsa-with-SHA256: [ECDSA](../02-signatures/ECDSA.md) | RFC 5758 |
| 1.3.101.112 | `2b 65 70` | id-Ed25519: [EdDSA](../02-signatures/EdDSA.md) | RFC 8410 |
| 2.16.840.1.101.3.4.3.17 | `60 86 48 01 65 03 04 03 11` | id-ml-dsa-44: [ML-DSA](../02-signatures/ML-DSA.md); OpenSSL names it from 3.5 (2025), 3.0 prints the number | NIST arc; RFC 9881 (2025) |

## BER, DER and the other rules

DER is BER with the choices removed (X.690 §10-11): definite lengths in the
fewest bytes (`30 0d`, never `30 81 0d` or `30 80 … 00 00`), strings in one
primitive piece, BOOLEAN true only as `ff`, DEFAULT values left out, SET OF
sorted by encoding. Fewest-byte INTEGERs and OID arcs are already BER rules.

**Why one encoding.** A verifier that accepts several byte strings for one
value gives an attacker room to hide things. In 2006 Bleichenbacher forged RSA
signatures with a cube root (e = 3) against verifiers that ignored bytes after
the hash (CVE-2006-4339, fixed in OpenSSL 0.9.8c). In 2014 "BERserk" hid such
bytes in over-long lengths in NSS; NSS 3.17.1 now builds the expected DER and
compares bytes, as RFC 8017 §8.2.2 does, and 3.17.3 rejects padded lengths
(CVE-2014-1569). OpenSSL 1.0.1k (2015) rejects ECDSA signatures that do not
re-encode to the same bytes (CVE-2014-8275), which split Bitcoin nodes and led
to strict DER (BIP-66).

| Rules | Standard | Bytes | Where you meet them |
|---|---|---|---|
| BER | X.690 | TLV, several encodings per value | CMS and PKCS#12, built for streaming (RFC 5652 §2, RFC 7292 §4): `openssl cms -sign -stream` and NSS's `pk12util` wrote `30 80` here, `openssl pkcs12` and `keytool` did not; LDAP (RFC 4511 §5.1), SNMP |
| CER | X.690 | canonical: indefinite lengths, strings in 1,000-byte pieces | rarely |
| DER | X.690 | canonical: definite lengths | X.509, keys, OCSP, Kerberos, CMS signed attributes, ECDSA signatures |
| PER: aligned, unaligned (UPER), canonical (CPER) | X.691 | packed bits, no tags | 4G and 5G signalling: RRC unaligned, S1AP and NGAP aligned |
| OER, canonical OER (COER) | X.696 (2014) | whole bytes, lengths only where sizes vary | IEEE 1609.2 / ETSI TS 103 097 vehicle (V2X) certificates |
| XER, canonical (CXER), extended (E-XER); JER; GSER | X.693; X.697 (2017); RFC 3641 (2003) | XML; JSON; text | rarely; GSER in LDAP |

## Seeing it on your machine

```
openssl x509 -in /etc/ssl/certs/ISRG_Root_X1.pem -outform DER -out isrg.der  # PEM to DER
openssl asn1parse -genstr INTEGER:128 -noout -out - | xxd -p     # 02020080
openssl asn1parse -genconf <(printf 'asn1=OID:1.3.101.112\n') -noout -out - | xxd -p  # 06032b6570
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out ec.key
echo hi | openssl dgst -sha256 -sign ec.key | openssl asn1parse -inform DER  # SEQUENCE { r, s }
```

- **Python:** a mini `asn1parse`. Press Enter for ISRG Root X1, or give another
  PEM file or Base64 (`MA0GCSqGSIb3DQEBCwUA` is the AlgorithmIdentifier above).

```python
import base64, os, re

src = input("PEM file or base64: ").strip() or "/etc/ssl/certs/ISRG_Root_X1.pem"
text = open(src).read() if os.path.exists(src) else src
m = re.search(r"-----BEGIN [^-]+-----(.+?)-----END", text, re.S)      # first PEM block, if any
der = base64.b64decode("".join((m.group(1) if m else text).split()))
NAMES = {1: "BOOLEAN", 2: "INTEGER", 3: "BIT STRING", 4: "OCTET STRING", 5: "NULL", 6: "OBJECT",
         12: "UTF8String", 16: "SEQUENCE", 17: "SET", 19: "PrintableString", 23: "UTCTime"}

def oid(body):                     # base-128 arcs, high bit = more to come; first arc = 40*X + Y
    arcs, n = [], 0
    for b in body:
        n = n << 7 | b & 0x7F
        if b < 0x80:
            arcs.append(n); n = 0
    x = min(arcs[0] // 40, 2)
    return ".".join(map(str, [x, arcs[0] - 40 * x] + arcs[1:]))

def walk(start, end, depth, max_depth=2):
    while start < end:
        tag, n, hl = der[start], der[start + 1], 2
        if n == 0x80:
            raise ValueError("indefinite length: BER, not DER")
        if n > 0x80:               # long form: low 7 bits say how many length octets follow
            hl += n & 0x7F
            n = int.from_bytes(der[start + 2:start + hl], "big")
        body = der[start + hl:start + hl + n]
        name = NAMES.get(tag & 0x1F, "?") if tag < 0x40 else f"[{tag & 0x1F}]"  # not universal
        value = oid(body) if tag == 6 else body.hex() if tag in (1, 2) else ""
        print(f"{start:4} {tag:02x} l={n:<4} {'  ' * depth}{name} {value}".rstrip())
        if tag & 0x20 and depth < max_depth:                    # constructed: walk its contents
            walk(start + hl, start + hl + n, depth + 1)
        start += hl + n

walk(0, len(der), 0)
```

```
   0 30 l=1387 SEQUENCE
   4 30 l=851    SEQUENCE
   8 a0 l=3        [0]
  13 02 l=17       INTEGER 008210cfb0d240e3594463e0bb63828b00
  32 30 l=13       SEQUENCE
  47 30 l=79       SEQUENCE
 128 30 l=30       SEQUENCE
 160 30 l=79       SEQUENCE
 241 30 l=546      SEQUENCE
 791 a3 l=66       [3]
 859 30 l=13     SEQUENCE
 861 06 l=9        OBJECT 1.2.840.113549.1.1.11
 872 05 l=0        NULL
 874 03 l=513    BIT STRING
```

Depth 2 is tbsCertificate's fields, at `asn1parse`'s offsets. With `max_depth=9`
all 12 OIDs sit where OpenSSL prints their names (2.5.4.6 countryName, …);
streamed CMS stops it at `80`. More commands: [openssl](../tools/openssl.md).

## See also

- [X.509](X.509.md): what each certificate field means
- [File formats](File-Formats.md): DER and PEM files, PKCS#7, PKCS#12 and Java key stores
- [PKI](../protocols/PKI.md): chains, CAs and trust stores
- [RSA](../02-signatures/RSA.md) / [ECDSA](../02-signatures/ECDSA.md): the signatures whose bytes DER pins down

## References

- [ITU-T X.680](https://www.itu.int/rec/T-REC-X.680) / [X.690](https://www.itu.int/rec/T-REC-X.690) / [X.691](https://www.itu.int/rec/T-REC-X.691) / [X.693](https://www.itu.int/rec/T-REC-X.693) / [X.696](https://www.itu.int/rec/T-REC-X.696) / [X.697](https://www.itu.int/rec/T-REC-X.697) / [RFC 3641: GSER](https://www.rfc-editor.org/rfc/rfc3641) / [RFC 1028](https://www.rfc-editor.org/rfc/rfc1028) (cites X.409, 1984) / [RFC 2560](https://www.rfc-editor.org/rfc/rfc2560) (cites X.690, 1994)
- [RFC 5280: X.509 profile](https://www.rfc-editor.org/rfc/rfc5280) (Sections 4.1, 4.1.1.3, 4.1.2.2, 4.1.2.5, Appendix A) / [RFC 5912: 2002-syntax modules](https://www.rfc-editor.org/rfc/rfc5912) / [RFC 4055](https://www.rfc-editor.org/rfc/rfc4055) / [RFC 5758](https://www.rfc-editor.org/rfc/rfc5758) / [RFC 8410](https://www.rfc-editor.org/rfc/rfc8410) / [RFC 9881: ML-DSA in X.509](https://www.rfc-editor.org/rfc/rfc9881) ([source](https://github.com/lamps-wg/dilithium-certificates), `X509-ML-DSA-2025.asn`)
- [RFC 8017: PKCS #1](https://www.rfc-editor.org/rfc/rfc8017) (Sections 8.2.2, 9.2) / [RFC 5652: CMS](https://www.rfc-editor.org/rfc/rfc5652) (Section 2) / [RFC 7292: PKCS #12](https://www.rfc-editor.org/rfc/rfc7292) (Section 4) / [RFC 4120: Kerberos](https://www.rfc-editor.org/rfc/rfc4120) (Section 5.1.1) / [RFC 4511: LDAP](https://www.rfc-editor.org/rfc/rfc4511) (Section 5.1) / [RFC 3417: SNMP](https://www.rfc-editor.org/rfc/rfc3417) (Section 8) / [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) (Section 4.2.3)
- [OpenSSL `CHANGES.md`](https://github.com/openssl/openssl/blob/master/CHANGES.md) (0.9.8c: CVE-2006-4339; 1.0.1k: CVE-2014-8275; 3.5.0: ML-DSA) / NSS fixes for [bug 1064636](https://github.com/nss-dev/nss/commit/14c1a63f12140ae3570634694598505305f5c072) (`lib/util/pkcs1sig.c`, 23 Sep 2014) and [CVE-2014-1569](https://github.com/nss-dev/nss/commit/0f7a81d11384829d0636e736ce4716507a7f3eef) (`lib/util/quickder.c`) / [Hal Finney on Bleichenbacher's forgery](https://mailarchive.ietf.org/arch/msg/openpgp/5rnE9ZRN1AokBVj3VqblGlP63QE/) / [BIP-66](https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki)
- [Go `encoding/asn1`](https://github.com/golang/go/blob/go1.24.7/src/encoding/asn1/asn1.go), [`cryptobyte`](https://github.com/golang/crypto/blob/master/cryptobyte/asn1.go) (quote X.690 §8.1, 8.19, 10.1, 11.1, 11.6) / [pyasn1 CER encoder](https://github.com/pyasn1/pyasn1/blob/main/pyasn1/codec/cer/encoder.py) / Wireshark's [`lte-rrc.cnf`](https://github.com/wireshark/wireshark/blob/master/epan/dissectors/asn1/lte-rrc/lte-rrc.cnf), [`nr-rrc.cnf`](https://github.com/wireshark/wireshark/blob/master/epan/dissectors/asn1/nr-rrc/nr-rrc.cnf), [`s1ap.cnf`](https://github.com/wireshark/wireshark/blob/master/epan/dissectors/asn1/s1ap/s1ap.cnf), [`ngap.cnf`](https://github.com/wireshark/wireshark/blob/master/epan/dissectors/asn1/ngap/ngap.cnf) / [Vanetza](https://github.com/riebl/vanetza) (`vanetza/security/v3/certificate.cpp`) / [Let's Encrypt: A Warm Welcome to ASN.1 and DER](https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/)

*Weaker sources:* search-engine summaries of ITU-T's pages (07/1994 and 02/2021
editions, ISO/IEC 8824-1/8825-1:2021, X.696 08/2014, X.697 10/2017), RFC 9881's
date, CERT/CC and SecurityWeek on BERserk (CVE-2014-1568), IEEE 1609.2's COER.
