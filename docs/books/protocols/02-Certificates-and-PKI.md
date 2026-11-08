# 2. Certificates and Public-Key Infrastructure

*Chapter 1 ended with a key exchange that is safe once each side knows the
other's public key. This chapter is about how a browser that has never seen a
web site before comes to know its key: a certificate, signed by an authority the
browser already trusts, saying "this key belongs to this name". You will read a
real certificate byte by byte with a parser of your own, write a path validator
that enforces the rules of RFC 5280 and watch it refuse forged and misissued
chains, compute the token a certificate authority checks before it issues, and
build the filter cascade that lets Firefox know every revoked certificate on the
web in a few megabytes. Along the way, the authorities that failed, and what the
web built so that the next failure is caught.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a certificate says and how it is encoded, by parsing one;
    - how a client builds and validates a chain from a leaf to a root, and the
      checks that matter: signatures, dates, CA flags, path length, name
      constraints and the host name;
    - who the certificate authorities are, who polices them, and the incidents
      that shaped the rules (DigiNotar, Symantec and others);
    - how domain validation and ACME work, and how they can be fooled;
    - why revocation mostly failed, and what replaced it: short lifetimes,
      CRLite and CRLSets;
    - Certificate Transparency, and what a public log changes;
    - how a city on Mars could run its own trusted authority while cut off
      from Earth for weeks.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md); signatures and
    the first look at certificates in [Chapter 16 of book 1](../../book/16-PKI-and-Key-Establishment.md);
    hash functions ([Chapter 9](../../book/09-Hash-Functions.md)).

    **Levels:** §2.1 to §2.3 are for beginners, §2.4 to §2.10 are intermediate,
    §2.11 is expert.

## 2.1 The problem

*Level: beginner.*

In 1976 Diffie and Hellman imagined a "public file": a directory, like a phone
book, listing every user's public key. To send Bob a secret, look up Bob. The
idea hides the whole difficulty. Who runs the directory? How does your
computer know that the entry it fetched is the real one, and not one that an
attacker on the network swapped in on the way? A public key carries no name
inside it. It is a number. The man in the middle of Chapter 1 does not need to
break anything if he can hand you his number and say it is Bob's.

Two years later, in 1978, an MIT undergraduate named Loren Kohnfelder wrote a
bachelor's thesis, "Towards a practical public-key cryptosystem", that proposed
a simpler answer. Don't ask a directory each time. Instead, have a trusted
party sign a small record that binds a name to a key, and let anyone pass that
record around. He called the record a **certificate**. Anyone holding the
trusted party's public key can check the signature offline, without asking
anyone. The directory becomes a set of signed statements that can travel with
the key.

The idea went into the international directory standards. In 1988 the CCITT
(today the ITU-T) published X.500, a planned global directory of people and
organizations, and with it **X.509**, the format for certificates that would
authenticate entries in that directory. The global directory never happened.
The certificate format outlived it, because in 1994 and 1995 Netscape needed
something exactly like it for SSL, the protocol it was writing to make
shopping on the web safe. Netscape's browser shipped with the public keys of a
few certificate authorities built in, chief among them a company spun out of
RSA Data Security in 1995 for the purpose: VeriSign. A web site bought a
certificate, the browser checked it, and a padlock appeared.

That arrangement, with many more authorities and many more rules, still
protects almost every connection on the web. It is called a **public-key
infrastructure**, or PKI. It has failed in public several times, and each
failure has added a layer. This chapter goes through the layers in order: the
certificate, the chain, the authorities, validation, revocation and
transparency.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="Timeline of public-key infrastructure from Kohnfelder's thesis in 1978 to 47-day certificates in 2029" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="412" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1978</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Kohnfelder's thesis names the certificate</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">X.509 version 1, for the X.500 directory</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">1995</text>
<circle cx="92" cy="74" r="3.5"/>
<text x="108" y="79">Netscape ships SSL with built-in CAs; VeriSign founded</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">1996</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">X.509 version 3 adds extensions</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="126" r="3.5"/>
<text x="108" y="131">CA/Browser Forum formed</text>
<text x="78" y="157" text-anchor="end" font-weight="bold" class="acc-fill">2008</text>
<circle cx="92" cy="152" r="4.5" class="acc-fill"/>
<text x="108" y="157" class="acc-fill">Rogue CA made with an MD5 collision</text>
<text x="78" y="183" text-anchor="end" font-weight="bold" class="acc-fill">2011</text>
<circle cx="92" cy="178" r="4.5" class="acc-fill"/>
<text x="108" y="183" class="acc-fill">Comodo and DigiNotar breached; DigiNotar dies</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Baseline Requirements bind every public CA</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="230" r="3.5"/>
<text x="108" y="235">Certificate Transparency, RFC 6962</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="256" r="3.5"/>
<text x="108" y="261">Let's Encrypt issues free certificates</text>
<text x="78" y="287" text-anchor="end" font-weight="bold" class="acc-fill">2018</text>
<circle cx="92" cy="282" r="4.5" class="acc-fill"/>
<text x="108" y="287" class="acc-fill">Chrome distrusts Symantec; CT required for all</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="308" r="3.5"/>
<text x="108" y="313">ACME standardized, RFC 8555</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="334" r="3.5"/>
<text x="108" y="339">Chrome ships its own root store</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="360" r="3.5"/>
<text x="108" y="365">Let's Encrypt ends OCSP; ballot SC-081 passes</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2029</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">Public TLS certificates live at most 47 days</text>
</svg>
<figcaption>Figure 2.1. The life of web PKI. Accent marks the failures; each one added a rule or a mechanism to the system.</figcaption>
</figure>

## 2.2 What a certificate says

*Level: beginner.*

Strip away the encoding and an X.509 certificate is a short signed statement.
For a web server it says, in effect:

> I, the authority named *Issuer*, state that the public key *K* belongs to
> whoever controls the names *www.arcadia.example*, from *8 November 2026*
> until *6 February 2027*. This key may be used to sign TLS handshakes, and
> its holder may not issue certificates. My serial number for this statement
> is *2026*. Signed, *Issuer*, with ECDSA over SHA-256.

The parts, by their X.509 names:

| Field | What it holds |
| --- | --- |
| `version` | 3 for every certificate you will meet (encoded as 2) |
| `serialNumber` | a number unique per issuer; the BRs require at least 64 random bits |
| `signature` | the algorithm the issuer used to sign, repeated outside the signed part |
| `issuer` | the authority's name |
| `validity` | `notBefore` and `notAfter` |
| `subject` | the holder's name; for web servers mostly ignored now |
| `subjectPublicKeyInfo` | the algorithm and the public key itself |
| `extensions` | everything that matters in practice (below) |

The extensions carry the rules:

- **subjectAltName (SAN)**: the DNS names (or IP addresses, email addresses)
  the certificate is good for. Browsers look *only* here for the host name;
  the old practice of reading the subject's common name was dropped by RFC 6125
  (2011) and by Chrome in 2017.
- **basicConstraints**: `CA:TRUE` or `CA:FALSE`, and for a CA an optional
  `pathLenConstraint`, the number of CA certificates allowed below it.
- **keyUsage** and **extendedKeyUsage**: what the key may do. A TLS server
  certificate has `digitalSignature` and `serverAuth`; a CA certificate has
  `keyCertSign`.
- **nameConstraints**: on a CA, the names that it and every CA beneath it may
  issue for (§2.3).
- **subjectKeyIdentifier** and **authorityKeyIdentifier**: short hashes that
  help a client find which certificate signed which.
- **authorityInfoAccess**: where to fetch the issuer's certificate (and, until
  recently, where to ask about revocation).
- **CT precertificate SCTs**: proofs that the certificate was logged
  publicly (§2.8).

An extension marked **critical** must be understood by the client; a client
that does not recognize a critical extension must reject the certificate. This
rule lets new restrictions be added safely: an old client that cannot enforce
them refuses the certificate rather than ignoring them.

### Code it: reading the bytes

A certificate is encoded in **DER**, the Distinguished Encoding Rules of ASN.1.
DER is a tree of type-length-value records: one byte for the type (the tag),
then the length, then the contents, which may themselves be a sequence of
records. Reading it takes thirty lines. The certificate below is a real one,
made with OpenSSL for this chapter: a P-256 key for `www.arcadia.example`. It
signs itself (issuer and subject are the same), which keeps it short; a real
site's certificate looks the same, with a CA's name in the issuer field.

```python
# Read a real X.509 certificate with nothing but the standard library.
import base64

PEM = """
MIIBwjCCAWmgAwIBAgICICYwCgYIKoZIzj0EAwIwHjEcMBoGA1UEAwwTd3d3LmFy
Y2FkaWEuZXhhbXBsZTAeFw0yNjExMDgxNDM2MzdaFw0yNzAyMDYxNDM2MzdaMB4x
HDAaBgNVBAMME3d3dy5hcmNhZGlhLmV4YW1wbGUwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAASJBnZ+jwHP34tPFYeEwUYtOtEWReUG0cQQNkVGUX2nNyee8lnO1V9b
M2XtQ1+QmQsy0wgbKv/7SwufW4eR5yjUo4GWMIGTMB0GA1UdDgQWBBRc2+Khzy7k
myLyNBavq77WF730pTAfBgNVHSMEGDAWgBRc2+Khzy7kmyLyNBavq77WF730pTAe
BgNVHREEFzAVghN3d3cuYXJjYWRpYS5leGFtcGxlMAwGA1UdEwEB/wQCMAAwDgYD
VR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUFBwMBMAoGCCqGSM49BAMCA0cA
MEQCIBhF9QO3B1bTAcwR6oXYxe8P9zsjHb/VqGlkxu7Sgi8MAiAPhiur3QL7iGwU
uBtdIjCBkkVuHWI7Mw3tfcU956E4SA=="""
der = base64.b64decode("".join(PEM.split()))

NAMES = {"2.5.4.3": "commonName", "1.2.840.10045.2.1": "ecPublicKey",
         "1.2.840.10045.3.1.7": "P-256", "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
         "2.5.29.14": "subjectKeyIdentifier", "2.5.29.35": "authorityKeyIdentifier",
         "2.5.29.17": "subjectAltName", "2.5.29.19": "basicConstraints",
         "2.5.29.15": "keyUsage", "2.5.29.37": "extKeyUsage",
         "1.3.6.1.5.5.7.3.1": "serverAuth"}
TAGS = {0x01: "BOOLEAN", 0x02: "INTEGER", 0x03: "BIT STRING", 0x04: "OCTET STRING",
        0x06: "OID", 0x0C: "UTF8String", 0x17: "UTCTime", 0x30: "SEQUENCE", 0x31: "SET"}

def read_tlv(buf, i):
    tag, length = buf[i], buf[i + 1]
    i += 2
    if length & 0x80:                       # long form: next n bytes hold the length
        n = length & 0x7F
        length = int.from_bytes(buf[i:i + n], "big")
        i += n
    return tag, buf[i:i + length], i + length

def oid(b):
    parts = [b[0] // 40, b[0] % 40]
    value = 0
    for byte in b[1:]:
        value = (value << 7) | (byte & 0x7F)
        if not byte & 0x80:
            parts.append(value)
            value = 0
    return ".".join(map(str, parts))

def show(buf, depth=0):
    i = 0
    while i < len(buf):
        tag, val, i = read_tlv(buf, i)
        name = TAGS.get(tag, "[%d]" % (tag & 0x1F) if tag & 0x80 else hex(tag))
        pad = "  " * depth
        if tag in (0x30, 0x31) or tag & 0x20:             # constructed: go inside
            print(f"{pad}{name} ({len(val)} bytes)")
            show(val, depth + 1)
        elif tag == 0x06:
            o = oid(val)
            print(f"{pad}OID {o} {NAMES.get(o, '')}")
        elif tag in (0x0C, 0x17, 0x82):        # text, time, dNSName
            print(f"{pad}{name} {val.decode()}")
        elif tag == 0x04 and val[:1] in (b"\x30", b"\x04"):  # extension values hold DER
            print(f"{pad}OCTET STRING, containing:")
            show(val, depth + 1)
        else:
            print(f"{pad}{name} {val.hex()[:32]}{'...' if len(val) > 16 else ''}")

print("certificate:", len(der), "bytes")
show(der)
```

```text
certificate: 454 bytes
SEQUENCE (450 bytes)
  SEQUENCE (361 bytes)
    [0] (3 bytes)
      INTEGER 02
    INTEGER 2026
    SEQUENCE (10 bytes)
      OID 1.2.840.10045.4.3.2 ecdsa-with-SHA256
    SEQUENCE (30 bytes)
      SET (28 bytes)
        SEQUENCE (26 bytes)
          OID 2.5.4.3 commonName
          UTF8String www.arcadia.example
    SEQUENCE (30 bytes)
      UTCTime 261108143637Z
      UTCTime 270206143637Z
    SEQUENCE (30 bytes)
      SET (28 bytes)
        SEQUENCE (26 bytes)
          OID 2.5.4.3 commonName
          UTF8String www.arcadia.example
    SEQUENCE (89 bytes)
      SEQUENCE (19 bytes)
        OID 1.2.840.10045.2.1 ecPublicKey
        OID 1.2.840.10045.3.1.7 P-256
      BIT STRING 00048906767e8f01cfdf8b4f158784c1...
    [3] (150 bytes)
      SEQUENCE (147 bytes)
        SEQUENCE (29 bytes)
          OID 2.5.29.14 subjectKeyIdentifier
          OCTET STRING, containing:
            OCTET STRING 5cdbe2a1cf2ee49b22f23416afabbed6...
        SEQUENCE (31 bytes)
          OID 2.5.29.35 authorityKeyIdentifier
          OCTET STRING, containing:
            SEQUENCE (22 bytes)
              [0] 5cdbe2a1cf2ee49b22f23416afabbed6...
        SEQUENCE (30 bytes)
          OID 2.5.29.17 subjectAltName
          OCTET STRING, containing:
            SEQUENCE (21 bytes)
              [2] www.arcadia.example
        SEQUENCE (12 bytes)
          OID 2.5.29.19 basicConstraints
          BOOLEAN ff
          OCTET STRING, containing:
            SEQUENCE (0 bytes)
        SEQUENCE (14 bytes)
          OID 2.5.29.15 keyUsage
          BOOLEAN ff
          OCTET STRING 03020780
        SEQUENCE (19 bytes)
          OID 2.5.29.37 extKeyUsage
          OCTET STRING, containing:
            SEQUENCE (10 bytes)
              OID 1.3.6.1.5.5.7.3.1 serverAuth
  SEQUENCE (10 bytes)
    OID 1.2.840.10045.4.3.2 ecdsa-with-SHA256
  BIT STRING 00304402201845f503b70756d301cc11...
```

Read it from the top. The outer `SEQUENCE` has three parts: the 361-byte
**to-be-signed** part (`tbsCertificate`), the signature algorithm, and the
signature itself, a `BIT STRING` holding a DER-encoded ECDSA pair $(r, s)$.
The signature covers the exact bytes of the to-be-signed part, which is why
DER, a *distinguished* encoding with exactly one way to write each value,
matters: if two encodings of one certificate were possible, they would hash
differently. Inside, you can find each field of the table above. `[0]` and
`[3]` are context tags: the version (2, meaning version 3) and the extensions.
`basicConstraints` is an empty sequence, which means `CA:FALSE` (the default),
and its `BOOLEAN ff` marks it critical. `keyUsage` is a bit string with the
`digitalSignature` bit set (`0780`). The whole certificate is 454 bytes; a
typical web certificate with longer names, CT proofs and an RSA key runs to
1,200 to 2,000.

Parsing DER by hand is easy, which is why so many programs have done it, and
parsing it *correctly* is hard, which is why so many of them were wrong. §2.10
lists some of the results.

!!! note "Life story: the X.509 certificate"
    **Born:** 1988, CCITT recommendation X.509, for the X.500 directory; the
    idea of a certificate from Loren Kohnfelder's 1978 MIT thesis ·
    **Purpose:** bind a name to a public key with a trusted signature that
    anyone can check offline · **Helped:** SSL and TLS from 1995, S/MIME,
    code signing, smart cards, Wi-Fi Enterprise, passports' chips; version 3
    (1996) added extensions; the Internet profile is RFC 5280 (2008) ·
    **Status:** current everywhere; the directory it was made for never
    existed

## 2.3 Chains and how they are checked

*Level: beginner.*

A browser does not hold the keys of millions of web sites. It holds a hundred
or so **root** certificates in a **trust store**, chosen by the browser or
operating system vendor. A root is a self-signed certificate whose key the
browser has decided to trust; the self-signature proves nothing and is not
checked. Roots are kept offline, in hardware security modules in locked rooms,
and used a few times a year to sign **intermediate** CA certificates. The
intermediates do the daily work of signing the **leaf** certificates that web
servers present.

A server sends its leaf and the intermediates; the client supplies the root
from its own store, because trust cannot come from the network. Here is a real
handshake against a test chain shaped like Let's Encrypt's (an RSA-4096 root,
a P-384 intermediate limited to `pathlen:0`, and a 90-day P-256 leaf), run
with OpenSSL 3.0 (trimmed):

```text
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

Certificate 0 is the leaf, signed by the intermediate's P-384 key with ECDSA.
Certificate 1 is the intermediate, signed by the root's RSA key. `depth=2`, the
root, came from `root.crt` on the client's side. Each link is checked with the
key above it, so an RSA root can sign an ECDSA intermediate. Finally the leaf's
own P-256 key signed this handshake (`Peer signature type: ECDSA`), proving the
server holds its private key ([Chapter 3](03-TLS-1.3-Message-by-Message.md)).

### Path building

The chain a server sends is a hint, not an instruction. RFC 5280 separates two
jobs. **Path building** finds a sequence of certificates from the leaf to some
trusted root, using the certificates the server sent, others the client has
cached, and others it can fetch from the URL in the authorityInfoAccess
extension. Matching uses the issuer name and the authority key identifier of
each certificate. There can be several valid paths, because of
**cross-signing**: one CA key may appear in a self-signed root and also in a
certificate signed by an older, more widely trusted root, so that old devices
can still find a path. Let's Encrypt's own root, ISRG Root X1, was cross-signed
by IdenTrust's DST Root CA X3 when it started in 2015, and that cross-sign kept
old Android phones working until 30 September 2024, three years after the DST
root itself expired (old Android ignores the expiry of trust anchors).

**Path validation** then checks the chosen path, from the root down. RFC 5280
section 6 gives the algorithm; its core is:

<div class="mars-steps" markdown>

1. Start with the trust anchor's public key and name.
2. For each certificate, top down: check the **signature** with the current
   key; check the **dates**; check that the **issuer name** matches the
   previous subject; check that its names fall inside any **name
   constraints** collected so far; and check **revocation** (§2.7).
3. If the certificate is not the leaf: it must say **CA:TRUE**, have the
   **keyCertSign** usage, and its **path length** constraint must allow the
   number of CA certificates still below it. Collect its **name constraints**
   for the certificates below.
4. Move to the next certificate with its key as the current key.
5. At the leaf: check **extended key usage** (`serverAuth`) and the **host
   name** against the subjectAltName.

</div>

Every one of these checks has been skipped by some real program, and every
skip has been exploited. In 2002 Mike Benham showed that Internet Explorer and
Konqueror did not check basicConstraints at all, so any web site's ordinary
leaf certificate could sign a certificate for any other site. In 2014 Apple's
"goto fail" bug skipped the signature check on the server's key exchange
(a different check, but the same family of mistake). The host name check is the
one programmers most often forget when they use a TLS library directly; a 2012
study by Martin Georgiev and colleagues, "The most dangerous code in the world",
found it disabled or broken in payment SDKs, cloud clients and Android apps.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="A three-certificate chain: the root in the client's store signs an intermediate, which signs the leaf; checks at each link listed beside" fill="currentColor" font-size="13.5">
<rect x="20" y="16" width="270" height="80" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="155" y="40" text-anchor="middle" font-weight="bold">Root CA (in the trust store)</text>
<text x="155" y="62" text-anchor="middle">self-signed; offline; RSA-4096</text>
<text x="155" y="82" text-anchor="middle">never sent, never "checked"</text>
<rect x="20" y="126" width="270" height="80" rx="8" class="soft" stroke="currentColor"/>
<text x="155" y="150" text-anchor="middle" font-weight="bold">Intermediate CA</text>
<text x="155" y="172" text-anchor="middle">CA:TRUE, pathlen:0, keyCertSign</text>
<text x="155" y="192" text-anchor="middle">nameConstraints (optional)</text>
<rect x="20" y="236" width="270" height="80" rx="8" class="soft" stroke="currentColor"/>
<text x="155" y="260" text-anchor="middle" font-weight="bold">Leaf: www.example.org</text>
<text x="155" y="282" text-anchor="middle">CA:FALSE, serverAuth</text>
<text x="155" y="302" text-anchor="middle">SAN: www.example.org</text>
<line x1="155" y1="96" x2="155" y2="122" stroke="currentColor" stroke-width="1.6"/>
<polygon points="155,126 150,114 160,114"/>
<line x1="155" y1="206" x2="155" y2="232" stroke="currentColor" stroke-width="1.6"/>
<polygon points="155,236 150,224 160,224"/>
<text x="165" y="115">signs</text>
<text x="165" y="225">signs</text>
<text x="320" y="40" font-weight="bold">at every link, top down</text>
<text x="320" y="66">signature verifies with key above</text>
<text x="320" y="88">issuer = subject above</text>
<text x="320" y="110">notBefore ≤ now ≤ notAfter</text>
<text x="320" y="132">names inside any constraints</text>
<text x="320" y="154">not revoked</text>
<text x="320" y="190" font-weight="bold">at each CA</text>
<text x="320" y="212">CA:TRUE and keyCertSign</text>
<text x="320" y="234">CAs below ≤ pathlen</text>
<text x="320" y="270" font-weight="bold" class="acc-fill">at the leaf</text>
<text x="320" y="292" class="acc-fill">host name matches a SAN entry</text>
<text x="320" y="314" class="acc-fill">extendedKeyUsage has serverAuth</text>
</svg>
<figcaption>Figure 2.2. A chain and its checks. The accent checks at the bottom are the ones most often forgotten by programs that call a TLS library directly.</figcaption>
</figure>

### Code it: a path validator

The validator below follows the steps above on certificates written as
dictionaries and signed with a toy Schnorr signature (the same algebra as
Chapter 1's, over a smaller number so the program is short). The scenario is
a city authority on Mars: a root, `Mars Root`, signs `Arcadia City CA` with
`pathlen:0` and a name constraint that limits it to names under
`arcadia.mars`. The city CA signs a web server's leaf. Then the program tries
everything that should fail.

```python
# A small certificate path validator: signatures, dates, CA flags,
# path length, name constraints and the host name, in the order RFC 5280 uses.
import hashlib, json, secrets

P = 2**255 - 19            # toy Schnorr signatures mod a prime: shows the logic, not for real use
G = 2

def keypair():
    x = secrets.randbelow(P - 2) + 1
    return x, pow(G, x, P)

def digest(obj):
    data = json.dumps(obj, sort_keys=True).encode()
    return int.from_bytes(hashlib.sha256(data).digest(), "big")

def sign(x, obj):
    k = secrets.randbelow(P - 2) + 1
    e = digest([pow(G, k, P), obj])
    return [e, (k + x * e) % (P - 1)]

def verify(X, obj, sig):
    e, s = sig
    r = pow(G, s, P) * pow(X, (P - 1) - e % (P - 1), P) % P
    return digest([r, obj]) == e

def issue(subject, pub, issuer, issuer_key, *, ca=False, pathlen=None,
          names=(), permitted=None, not_after=2027):
    tbs = {"subject": subject, "issuer": issuer, "key": pub, "ca": ca,
           "pathlen": pathlen, "names": list(names), "permitted": permitted,
           "not_after": not_after}
    return {"tbs": tbs, "sig": sign(issuer_key, tbs)}

def name_ok(name, suffix):
    return name == suffix or name.endswith("." + suffix)

def host_ok(host, pattern):
    if pattern.startswith("*."):           # one label only, never "*.com"-style tricks
        head, _, rest = host.partition(".")
        return rest == pattern[2:] and head != ""
    return host == pattern

def validate(chain, anchors, host, year):
    """chain[0] is the leaf; the last one is signed by a trust anchor."""
    anchor = anchors.get(chain[-1]["tbs"]["issuer"])
    if anchor is None:
        return "no trust anchor for " + chain[-1]["tbs"]["issuer"]
    issuer_key, permitted = anchor, None
    for depth, cert in enumerate(reversed(chain)):      # from the top down
        t = cert["tbs"]
        if not verify(issuer_key, t, cert["sig"]):
            return "bad signature on " + t["subject"]
        if year > t["not_after"]:
            return t["subject"] + " expired"
        if permitted and not all(name_ok(n, permitted) for n in t["names"]):
            return t["subject"] + " names outside " + permitted
        is_leaf = depth == len(chain) - 1
        if not is_leaf:
            if not t["ca"]:
                return t["subject"] + " is not a CA"
            cas_below = len(chain) - 2 - depth          # CA certificates under this one
            if t["pathlen"] is not None and cas_below > t["pathlen"]:
                return t["subject"] + " path length exceeded"
            permitted = t["permitted"] or permitted
        issuer_key = t["key"]
    if not any(host_ok(host, n) for n in chain[0]["tbs"]["names"]):
        return "host name " + host + " not in certificate"
    return "OK"

root_x, root_pub = keypair()
city_x, city_pub = keypair()
site_x, site_pub = keypair()
anchors = {"Mars Root": root_pub}

city = issue("Arcadia City CA", city_pub, "Mars Root", root_x, ca=True,
             pathlen=0, permitted="arcadia.mars")
leaf = issue("www.arcadia.mars", site_pub, "Arcadia City CA", city_x,
             names=["www.arcadia.mars", "*.shops.arcadia.mars"])
rogue = issue("bank.earth", site_pub, "Arcadia City CA", city_x,
              names=["bank.earth"])
sub_ca = issue("Sub CA", site_pub, "Arcadia City CA", city_x, ca=True)
under_sub = issue("x.arcadia.mars", root_pub, "Sub CA", site_x, names=["x.arcadia.mars"])
tampered = json.loads(json.dumps(leaf))
tampered["tbs"]["names"].append("bank.earth")

tests = [("good chain", [leaf, city], "www.arcadia.mars", 2026),
         ("wildcard", [leaf, city], "bread.shops.arcadia.mars", 2026),
         ("wildcard too deep", [leaf, city], "a.b.shops.arcadia.mars", 2026),
         ("wrong host", [leaf, city], "arcadia.mars", 2026),
         ("expired", [leaf, city], "www.arcadia.mars", 2028),
         ("name constraint", [rogue, city], "bank.earth", 2026),
         ("pathlen 0", [under_sub, sub_ca, city], "x.arcadia.mars", 2026),
         ("tampered leaf", [tampered, city], "bank.earth", 2026)]
for label, chain, host, year in tests:
    print(f"{label:18s} -> {validate(chain, anchors, host, year)}")
```

```text
good chain         -> OK
wildcard           -> OK
wildcard too deep  -> host name a.b.shops.arcadia.mars not in certificate
wrong host         -> host name arcadia.mars not in certificate
expired            -> Arcadia City CA expired
name constraint    -> bank.earth names outside arcadia.mars
pathlen 0          -> Arcadia City CA path length exceeded
tampered leaf      -> bad signature on www.arcadia.mars
```

Three of the results deserve a word. A **wildcard** like
`*.shops.arcadia.mars` matches exactly one label, so `bread.shops...` passes and
`a.b.shops...` does not; the rules for wildcards are in RFC 6125 and the
Baseline Requirements, and loose matching has caused real bugs. The **name
constraint** is enforced by the client, not trusted to the CA: the city CA's
signature on `bank.earth` is perfectly valid, but the client refuses it because
the root limited the city CA to `arcadia.mars`. That is how an organization can
be given its own CA without being given the power to impersonate the whole
web. And the **tampered** leaf fails on the signature, because the signature
covers every byte of the to-be-signed part, names included.

## 2.4 Who the authorities are, and who watches them

*Level: intermediate.*

A trust store is a list of organizations that your browser lets vouch for any
name on the Internet. In late 2026 the Mozilla store, which Linux distributions
copy into their `ca-certificates` package, held 117 roots. Apple, Microsoft and
Google keep their own stores (Chrome has used its own on every platform since
2022), each with its own policy and its own list. Any one of those roots, or
any intermediate under it, can issue a certificate for `google.com` or your
bank. The system is only as strong as its weakest authority.

**The CA/Browser Forum**, formed in 2005 by CAs and browser makers, writes the
rules every public CA must follow. Its **Baseline Requirements** (BRs), in
force since 1 July 2012, set how a CA must check that an applicant controls a
domain, how keys must be protected, how long certificates may live, which
algorithms are allowed, and how incidents are reported. A CA must pass a yearly
audit against them (WebTrust or ETSI). But the real power sits with the **root
programs**: each browser decides for itself which roots to trust, and can stop
trusting any of them at any time. Every serious enforcement action has come
from a root program, not from the Forum.

### When authorities fail

The incidents fall into three kinds.

**Breached authorities.** In March 2011 an attacker compromised a reseller of
the CA Comodo and issued nine certificates, for Google, Yahoo, Skype, Mozilla's
add-ons site and others. Comodo caught it within hours and revoked them;
browsers blocked them by serial number in updates. In July 2011 an attacker
inside DigiNotar, a Dutch CA that also served the Dutch government, issued more
than 500 rogue certificates, including one for `*.google.com`. That certificate
was used against Gmail users in Iran; the investigation by the security firm
Fox-IT counted around 300,000 unique addresses, mostly Iranian, that checked
it. DigiNotar had not noticed. Chrome caught it, because Chrome had **pinned**
Google's keys (a built-in list of the keys Google's own sites use) and a user
reported the warning. Every browser removed DigiNotar's roots, the Dutch
government took over its operations, and the company was declared bankrupt in
September 2011.

**Mistaken issuance.** In 2012 the Turkish CA TURKTRUST discovered that in
2011 it had accidentally issued two *intermediate* CA certificates to customers
who had asked for ordinary ones; one was later used in a firewall to intercept
traffic and issued a certificate for `*.google.com`. In 2015 the Chinese
registry CNNIC gave an intermediate to an Egyptian company, MCS Holdings, which
put it in a device that intercepted traffic. Google and Mozilla removed CNNIC.

**Lax authorities.** In 2015 Google found that Symantec, then one of the largest
CAs, had issued test certificates for `google.com` without Google's knowledge.
The investigation that followed found a long pattern of misissuance through
Symantec's partners. Google announced a staged distrust in 2017: Chrome 66
(April 2018) stopped trusting Symantec certificates issued before June 2016,
and Chrome 70 (October 2018) stopped trusting the rest. Symantec sold its CA
business to DigiCert. In 2016 Mozilla found that WoSign and StartCom had
backdated certificates to dodge the ban on SHA-1 signatures, and both were
distrusted. In 2024 Chrome and Mozilla announced that they would stop trusting
new certificates from Entrust's roots after a long series of compliance
failures and slow responses, from late 2024.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Who controls trust: browsers' root programs decide which CAs to trust, the CA/Browser Forum writes the baseline rules, auditors check CAs yearly, and CT logs let anyone see what CAs issue" fill="currentColor" font-size="14">
<rect x="230" y="14" width="180" height="56" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="320" y="38" text-anchor="middle" font-weight="bold">root programs</text>
<text x="320" y="58" text-anchor="middle" font-size="12.5">Mozilla · Apple · Microsoft · Chrome</text>
<rect x="20" y="100" width="170" height="56" rx="8" class="soft" stroke="currentColor"/>
<text x="105" y="124" text-anchor="middle" font-weight="bold">CA/B Forum</text>
<text x="105" y="144" text-anchor="middle" font-size="12.5">Baseline Requirements</text>
<rect x="235" y="100" width="170" height="56" rx="8" class="soft" stroke="currentColor"/>
<text x="320" y="124" text-anchor="middle" font-weight="bold">CAs</text>
<text x="320" y="144" text-anchor="middle" font-size="12.5">issue certificates</text>
<rect x="450" y="100" width="170" height="56" rx="8" class="soft" stroke="currentColor"/>
<text x="535" y="124" text-anchor="middle" font-weight="bold">auditors</text>
<text x="535" y="144" text-anchor="middle" font-size="12.5">WebTrust, ETSI, yearly</text>
<rect x="235" y="186" width="170" height="56" rx="8" class="soft" stroke="currentColor"/>
<text x="320" y="210" text-anchor="middle" font-weight="bold">CT logs</text>
<text x="320" y="230" text-anchor="middle" font-size="12.5">anyone can watch</text>
<line x1="320" y1="70" x2="320" y2="96" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,100 315,88 325,88"/>
<text x="330" y="90" font-size="12.5">trust or distrust</text>
<line x1="190" y1="128" x2="231" y2="128" stroke="currentColor" stroke-width="1.5"/>
<polygon points="235,128 223,123 223,133"/>
<line x1="450" y1="128" x2="409" y2="128" stroke="currentColor" stroke-width="1.5"/>
<polygon points="405,128 417,123 417,133"/>
<line x1="320" y1="156" x2="320" y2="182" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,186 315,174 325,174"/>
<text x="330" y="176" font-size="12.5">every certificate logged</text>
</svg>
<figcaption>Figure 2.3. Who governs web PKI. The browsers' root programs hold the real power: they decide, alone, which authorities a billion users trust.</figcaption>
</figure>

!!! note "Life story: DigiNotar"
    **Born:** 1998, a Dutch certificate authority; later issued certificates
    for the Dutch government's PKIoverheid · **Purpose:** commercial and
    government certificates · **Helped:** became, by its failure, the case
    that justified Certificate Transparency and stricter root programs ·
    **Retired:** September 2011, bankrupt, after attackers issued more than
    500 rogue certificates in July 2011, one used against Gmail users in Iran
    · **Replaced by:** other CAs; the lesson is in every root program's
    incident rules

!!! note "Life story: Symantec's certificate authority"
    **Born:** 1995 as VeriSign's certificate business; bought by Symantec in
    2010, along with Thawte, GeoTrust and RapidSSL · **Purpose:** the
    largest commercial CA of its day · **Helped:** secured a large part of
    the commercial web for two decades · **Retired:** distrusted by Chrome in
    two stages in 2018 (Chrome 66 and 70) and by Mozilla, after years of
    misissuance found from 2015 on · **Replaced by:** DigiCert, which bought
    the business in 2017 and reissued the certificates

## 2.5 Proving you own a name: domain validation and ACME

*Level: intermediate.*

Before a CA signs "this key belongs to `www.arcadia.example`", it must check
that the applicant controls `www.arcadia.example`. For almost every web
certificate (called **domain-validated**, or DV) that check is automated, and
since 2019 it has a standard protocol: **ACME**, the Automatic Certificate
Management Environment, RFC 8555. ACME was built for **Let's Encrypt**, a free,
automated CA run by the nonprofit Internet Security Research Group, which
issued its first certificate in September 2015 and opened to the public that
December. Free certificates and automated renewal moved the share of web pages
loaded over HTTPS in Firefox from under half in 2015 to well over 80 percent a
few years later, and Let's Encrypt now issues millions of certificates a day.

An ACME client holds an **account key**, a key pair used only to sign its
requests to the CA. To get a certificate:

<div class="mars-steps" markdown>

1. The client asks for a certificate for `www.arcadia.example`. The CA answers
   with one or more **challenges**, each with a random **token**.
2. The client proves control of the name in one of three ways. **http-01**:
   serve a file at `http://www.arcadia.example/.well-known/acme-challenge/<token>`.
   **dns-01**: put a TXT record at `_acme-challenge.www.arcadia.example`.
   **tls-alpn-01** (RFC 8737): answer a TLS connection on port 443 with a
   special self-signed certificate.
3. The content of the file (or record) is the **key authorization**: the token,
   a dot, and a hash of the account's public key. It ties the proof to *this*
   account: an attacker who sees the token cannot use it for their own
   account.
4. The CA fetches the file, from several places on the Internet (§2.5's
   *Break it*), and checks it.
5. The client sends a certificate signing request with the server's key; the
   CA signs and returns the certificate. Renewal repeats all of this, usually
   every 60 days, from a timer.

</div>

### Code it

The key authorization uses an **RFC 7638 thumbprint**: the account's public key
written as JSON with only its required members, sorted, with no spaces, then
hashed with SHA-256. The precision matters: two clients must compute the same
bytes from the same key.

```python
# ACME http-01: the file a CA fetches to check that you control a domain.
import base64, hashlib, json

def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

account_key = {"kty": "EC", "crv": "P-256",               # your ACME account's public key
               "x": "iQZ2fo8Bz9-LTxWHhMFGLTrRFkXlBtHEEDZFRlF9pzc",
               "y": "J57yWc7VX1szZe1DX5CZCzLTCBsq__tLC59bh5HnKNQ"}

# RFC 7638 thumbprint: required members only, sorted, no spaces, then SHA-256.
required = {k: account_key[k] for k in ("crv", "kty", "x", "y")}
canonical = json.dumps(required, sort_keys=True, separators=(",", ":"))
thumbprint = b64url(hashlib.sha256(canonical.encode()).digest())

token = "evaGxfADs6pSRb2LAv9IZf17Dt3juxGJ-PCt92wr-oA"          # sent by the CA
key_authorization = token + "." + thumbprint

print("serve at: http://www.arcadia.example/.well-known/acme-challenge/" + token)
print("content: ", key_authorization)
# dns-01 instead puts this value in a TXT record at _acme-challenge.<domain>:
print("dns-01 TXT:", b64url(hashlib.sha256(key_authorization.encode()).digest()))
```

```text
serve at: http://www.arcadia.example/.well-known/acme-challenge/evaGxfADs6pSRb2LAv9IZf17Dt3juxGJ-PCt92wr-oA
content:  evaGxfADs6pSRb2LAv9IZf17Dt3juxGJ-PCt92wr-oA.G2yK5wdRPXVs28_JNv7ZrnZ0g7ErnpdzriBpLoK8DQY
dns-01 TXT: DZ2_BKi4nfFGmdlimSRq2PyIYgtRTDUmg0KQEr51SMc
```

Every request the client sends to the CA is itself signed with the account key
as a JSON Web Signature, with a fresh **nonce** from the CA in the protected
header (Chapter 1's freshness, again) and the URL of the request, so that a
request cannot be replayed or sent to a different endpoint. JWS is the same
format as the JSON Web Tokens of Chapter 14.

### Break it: fool the CA's view of the network

Domain validation proves only that *whoever answered the CA* controls the name.
If an attacker can make the CA's query reach the attacker, it gets a
certificate. In 2018 Henry Birge-Lee and colleagues at Princeton showed that a
**BGP hijack** (announcing someone else's addresses to the Internet's routing
system, [networks site](https://networks.akadian.ca/)) aimed at a CA's data
center could do exactly that, and they obtained certificates for domains they
controlled from the major CAs by hijacking their own addresses. Real BGP and
DNS hijacks happen; in April 2018 one redirected Amazon's DNS service for the
cryptocurrency site MyEtherWallet for about two hours.

The fix is **multi-perspective issuance corroboration**: the CA checks the
challenge from several networks in different parts of the world, and issues
only if they agree. A hijack that fools one data center rarely fools all of
them. Let's Encrypt has done this since 2020; the Baseline Requirements made it
mandatory for every public CA from March 2025. DNS records called **CAA**
(RFC 8659) let a domain owner say which CAs may issue for it at all; CAs must
check them.

!!! note "Life story: Let's Encrypt and ACME"
    **Born:** 2013, the Internet Security Research Group (founded by people
    from Mozilla, the EFF and the University of Michigan); first certificate
    September 2015, public beta December 2015; ACME standardized as RFC 8555
    in March 2019 · **Purpose:** free, automated, open certificates for every
    web site · **Helped:** made HTTPS the default on the web; pushed the whole
    industry toward automation and shorter lifetimes · **Status:** current;
    the largest CA by number of certificates

## 2.6 Lifetimes

*Level: intermediate.*

A certificate is a statement that stays signed after it stops being true. The
domain may change owners; the private key may leak; the CA may discover it
checked the wrong thing. Every mechanism in the next section exists to tell
clients that a still-valid signature should no longer be believed. The
simplest such mechanism is the expiry date.

Lifetimes have fallen steadily. In 2012 the BRs allowed 60 months. That fell
to 39 months in 2015, 825 days in 2018 and 398 days in 2020 (Apple forced the
last step by announcing that Safari would refuse anything longer). In April
2025 the CA/Browser Forum passed **ballot SC-081**, which shortens the maximum
lifetime of a public TLS certificate in steps: 200 days from 15 March 2026, 100
days from 15 March 2027, and **47 days** from 15 March 2029. The time a CA may
reuse an earlier domain validation shrinks alongside, to 10 days by 2029.
Let's Encrypt, which started with 90 days, plans 64-day certificates from
February 2027 and 45-day ones from February 2028, and since January 2026 offers
6-day certificates to anyone who asks.

The reasoning: if revocation does not work reliably (next section), then the
lifetime is the real window during which a stolen key or a misissued
certificate can be used. Shorter lives also force automation, and automated
renewal is what lets the whole web change an algorithm or a CA quickly when
it must. A system where certificates are renewed by hand once a year cannot
replace a broken CA in less than a year.

## 2.7 Revocation, and why it mostly failed

*Level: intermediate.*

Before expiry, a CA can **revoke** a certificate: declare that it should no
longer be trusted, because the key leaked, the CA erred, or the holder asked.
The hard part is telling every client in the world.

**Certificate revocation lists (CRLs)**, the original mechanism of RFC 5280,
are signed lists of revoked serial numbers that each CA publishes at a URL
written in its certificates. A client downloads the list and checks the
certificate's serial against it. Lists grow large: after the Heartbleed bug of
April 2014 ([Chapter 4](04-Thirty-Years-of-TLS-Attacks.md)) forced mass
reissuing, some CRLs grew to megabytes. Downloading a CA's whole list during a
page load was too slow.

**OCSP**, the Online Certificate Status Protocol (RFC 2560 in 1999, RFC 6960
today), asks the CA about one certificate at a time and gets back a signed
"good", "revoked" or "unknown". It is small but has three problems. It is
**slow**: another network round trip to a third party before the page loads. It
is a **privacy leak**: the CA learns which sites each user visits. And it
**fails open**: when the OCSP server cannot be reached, browsers proceed
anyway, because a CA outage would otherwise take down every site it serves.
An attacker who can intercept your traffic can usually also block your OCSP
query, so the check fails exactly when it matters. Adam Langley, then on
Chrome's security team, summed it up in 2014: soft-fail revocation checking
is "like a seat-belt that snaps when you crash."

**OCSP stapling** (RFC 6066's `status_request`) lets the web server fetch a
recent signed OCSP answer itself and attach it to the handshake, fixing speed
and privacy. A certificate extension called **OCSP Must-Staple** (RFC 7633,
2015) told browsers to fail closed if the staple is missing. Few servers
stapled reliably and few browsers enforced Must-Staple, so it never caught on.

The end came in steps. Chrome stopped online revocation checks by default in
2012 and uses **CRLSets**, a small list it builds from CA revocation lists and
pushes to browsers, covering revoked intermediates and leaves revoked for
serious reasons (key compromise). The BRs made OCSP optional for CAs in March
2024. Let's Encrypt removed OCSP URLs from its certificates on 7 May 2025 and
shut its OCSP service down on 6 August 2025, citing privacy, and publishes CRLs
instead. Browsers now get revocation by aggregating every CA's CRLs centrally
and pushing compact summaries to clients.

### CRLite: every revocation, in a few megabytes

The most complete of these summaries is **CRLite**, proposed by James Larisch
and colleagues at IEEE Security and Privacy 2017 and used by Firefox. The idea
is that thanks to Certificate Transparency (§2.8), the browser maker can know
*every* unexpired certificate on the public web, not just the revoked ones.
With the whole universe known, a sequence of Bloom filters can answer "is this
certificate revoked?" with no false answers at all.

A **Bloom filter** is a bit array with $k$ hash functions. To add an item, set
the $k$ bits it hashes to. To test an item, check those $k$ bits: if any is 0,
the item is certainly not in the set; if all are 1, it probably is. False
positives happen, at a rate you choose by the array's size; false negatives
never do. Now build a **cascade**:

1. Level 1: a filter containing all revoked certificates. Test every *valid*
   certificate against it; the ones that wrongly pass are level 1's false
   positives.
2. Level 2: a filter containing just those false positives. Test every revoked
   certificate against it; the ones that wrongly pass are level 2's false
   positives.
3. Continue, alternating, until a level has no false positives.

To query, walk down the levels until a filter says "not in". If that happens
at level 1, 3, 5..., the certificate is valid; at 2, 4, 6..., revoked. Each
level is much smaller than the one before, because it holds only the previous
level's mistakes.

```python
# CRLite's idea: a cascade of Bloom filters that answers "is this certificate
# revoked?" with no errors, for every certificate the browser could ever see.
import hashlib, math, random

class Bloom:
    def __init__(self, items, rate, salt):
        n = max(1, len(items))
        self.m = max(8, int(-n * math.log(rate) / math.log(2) ** 2))   # bits
        self.k = max(1, round(self.m / n * math.log(2)))              # hash functions
        self.salt, self.bits = salt, bytearray((self.m + 7) // 8)
        for item in items:
            for pos in self._positions(item):
                self.bits[pos // 8] |= 1 << (pos % 8)
    def _positions(self, item):
        for i in range(self.k):
            h = hashlib.sha256(f"{self.salt}/{i}/{item}".encode()).digest()
            yield int.from_bytes(h[:8], "big") % self.m
    def __contains__(self, item):
        return all(self.bits[p // 8] >> (p % 8) & 1 for p in self._positions(item))

def build_cascade(revoked, valid):
    levels, include, exclude = [], set(revoked), set(valid)
    while include:
        f = Bloom(include, 0.5 if levels else 0.01, len(levels))
        levels.append(f)
        include, exclude = {x for x in exclude if x in f}, include   # false positives next
    return levels

def is_revoked(levels, cert):
    for depth, f in enumerate(levels):
        if cert not in f:
            return depth % 2 == 1          # stopped at an even level: valid; odd: revoked
    return len(levels) % 2 == 1

rng = random.Random(2026)
certs = [f"serial-{rng.getrandbits(64):016x}" for _ in range(200_000)]
revoked = set(rng.sample(certs, 4_000))                    # 2 % revoked
valid = set(certs) - revoked
levels = build_cascade(revoked, valid)

print("levels:", len(levels), "sizes in bytes:", [len(f.bits) for f in levels])
print("total:", sum(len(f.bits) for f in levels), "bytes for", len(certs), "certificates")
print("errors:", sum(is_revoked(levels, c) != (c in revoked) for c in certs))
```

```text
levels: 23 sizes in bytes: [4793, 368, 358, 183, 181, 92, 90, 46, 45, 23, 22, 12, 12, 7, 4, 4, 2, 3, 2, 2, 1, 1, 1]
total: 6252 bytes for 200000 certificates
errors: 0
```

(The code counts `depth` from 0, so "stopped at an even depth" is the text's
level 1, 3, 5.) About 6 KB answers exactly for 200,000 certificates, where a
plain list of the 4,000 revoked serial numbers would take 32 KB and still
would not cover certificates the browser has never heard of. Scaled to the real
web, with hundreds of millions of unexpired certificates, the full cascade is
a few megabytes and daily updates are far smaller. The cascade is exact only
for the certificates it was built from; that is why it depends on Certificate
Transparency to know them all.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="A filter cascade: level 1 holds revoked certificates, level 2 holds valid certificates that falsely matched level 1, level 3 holds revoked ones that falsely matched level 2, each level smaller" fill="currentColor" font-size="13.5">
<rect x="20" y="20" width="600" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="47" text-anchor="middle">level 1: all revoked certificates (1 % false positives)</text>
<rect x="110" y="84" width="420" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="109" text-anchor="middle">level 2: valid ones that wrongly hit level 1</text>
<rect x="190" y="144" width="260" height="36" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="167" text-anchor="middle">level 3: revoked that hit level 2</text>
<rect x="245" y="198" width="150" height="32" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="219" text-anchor="middle">level 4 ... until empty</text>
<text x="20" y="245" font-size="12.5">query: walk down; the first level that says "no" decides (odd level: valid, even: revoked)</text>
</svg>
<figcaption>Figure 2.4. CRLite's cascade. Each level stores only the mistakes of the level above, so the sizes fall quickly and the answers are exact.</figcaption>
</figure>

!!! note "Life story: online revocation (OCSP)"
    **Born:** 1999, RFC 2560; stapling in RFC 6066 (2011), Must-Staple in
    RFC 7633 (2015) · **Purpose:** ask a CA, live, whether one certificate is
    still good · **Helped:** smaller than CRLs, and stapling worked well where
    servers did it · **Retired:** Chrome stopped live checks in 2012; optional
    for CAs since March 2024; Let's Encrypt ended its service on 6 August 2025
    · **Replaced by:** short lifetimes, CRLs aggregated by browser makers,
    CRLite and CRLSets

## 2.8 Certificate Transparency

*Level: intermediate.*

DigiNotar's rogue certificate for Google was found because one browser had
Google's keys pinned and one user in Iran reported a warning. Nobody could have
found it otherwise, because certificates were private: only the CA and the
customer knew one existed. Ben Laurie and Adam Langley at Google proposed in
2011 to change that, and the result, **Certificate Transparency** (CT), was
published as RFC 6962 in June 2013 (version 2.0 is RFC 9162, 2021).

The idea is to make every certificate public. CAs submit each certificate to
several independent **logs**: append-only Merkle trees
([Chapter 9 of book 1](../../book/09-Hash-Functions.md)) run by different
organizations. A log returns a **signed certificate timestamp** (SCT), a
promise to include the certificate within a day. The CA embeds the SCTs in the
certificate, and browsers refuse certificates without enough of them: Chrome
has required CT for every publicly trusted certificate issued after 30 April
2018 (two SCTs, three for certificates valid over 180 days), and Apple and
Firefox require it too.

Three roles keep the logs honest:

- **Monitors** download every new entry and look for certificates of
  interest. Domain owners use free monitoring services to be told within hours
  if any CA issues a certificate for their names.
- **Auditors** check that a log really contains what it promised, using an
  **inclusion proof** (the $\log_2 n$ sibling hashes from a leaf to the root,
  coded in [Chapter 16 of book 1](../../book/16-PKI-and-Key-Establishment.md)).
- Everyone compares the logs' signed **tree heads** using **consistency
  proofs**, which show that a newer tree extends an older one without changing
  anything. A log that shows different histories to different people
  (a "split view") can be caught when two of its signed heads are compared.

CT did not stop a CA from misissuing. It made misissuance visible, which
changed the CAs' behavior. The Symantec investigation of 2015 to 2017 was
largely built from CT data; researchers now routinely find certificates that
break the BRs by scanning the logs, and root programs act on what they find.

## 2.9 A city authority on Mars

*Level: intermediate.*

Suppose Arcadia City wants web services, door badges (Chapter 13)
and device certificates that work every day, including the two weeks every
26 months when the Sun blocks the link to Earth and the hours each day when the
link is busy with other traffic. What would its PKI look like? Every design
choice in this chapter has a Martian answer.

**The root.** The city cannot ask an Earth CA for every certificate: an ACME
exchange with several round trips takes hours at Martian distances, and none at
conjunction. So the city runs its own CA. Its root key is generated on Mars,
in a hardware module, in a vault, offline, and used only to sign intermediates
during a formal ceremony with several officials present, as Earth CAs do.

**Trust from Earth.** Visitors' devices arrive trusting Earth's roots. Two
options: install the Mars root in every device (simple, but a Mars root that
can issue for any name is as dangerous as any Earth CA), or have an Earth root
**cross-sign** the Mars intermediate with a **name constraint**: it may issue
only under `arcadia.mars` (or whatever names the city uses). The constraint is
enforced by every client, as your validator did, so a compromise in the city
cannot produce a certificate for an Earth bank. This is the safer choice.

**Validation.** ACME works well inside the city, where round trips take
milliseconds. Multi-perspective validation means several vantage points inside
the city's networks, not on Earth.

**Lifetimes and revocation.** Short lifetimes are easy when issuance is local
and automated: a few days for web servers, hours for door badges. A compromised
badge simply stops being renewed. Revocation lists are small and pushed to
every door controller daily.

**Transparency, delayed.** The city runs its own CT logs. Their tree heads are
sent to Earth whenever the link is up, and Earth's monitors check consistency
when they arrive. A Mars log that tried to show a split view would be caught,
weeks late but certainly. CT does not require instant checks; it requires that
checks happen eventually and that a log cannot take back what it signed.

**Clocks.** Every validity check compares dates. A device whose clock has
drifted, or been set back by an attacker, accepts expired certificates. The
city's time service needs the same protection as its PKI.

## 2.10 In the real world

*Level: intermediate.*

- **The rogue CA from an MD5 collision** (December 2008). Alexander Sotirov,
  Marc Stevens, Jacob Appelbaum, Arjen Lenstra, David Molnar, Dag Arne Osvik
  and Benne de Weger used a cluster of about 200 PlayStation 3 consoles to
  build an MD5 chosen-prefix collision between an ordinary certificate request
  and an intermediate CA certificate, then got the CA RapidSSL to sign the
  ordinary one. The signature was also valid on their CA certificate. CAs
  stopped using MD5 within weeks. The attack depended on predictable serial
  numbers, which is why the BRs now demand 64 random bits.
- **Flame** (discovered 2012). Espionage malware spread through Windows Update
  using a certificate forged with a new MD5 chosen-prefix collision against a
  Microsoft licensing CA that still used MD5 and could sign code.
- **The null-prefix attack** (2009). Moxie Marlinspike and Dan Kaminsky showed
  that some CAs would validate `thoughtcrime.org` and issue for the name
  `www.paypal.com\0.thoughtcrime.org`, and that browsers written in C read the
  name only up to the zero byte, as `www.paypal.com`.
- **Frankencerts** (2014). Chad Brubaker and colleagues fed TLS libraries
  millions of certificates assembled from random parts of real ones, and found
  validation differences in every library they tested, some of them security
  holes (for example, a library accepting a version 1 certificate as a CA).
- **Expired roots** (2020, 2021). When old roots or cross-signs expired
  (Sectigo's AddTrust root in May 2020, Let's Encrypt's DST Root CA X3 in
  September 2021), clients that could not build an alternative path broke,
  from payment terminals to smart TVs. Path building is not optional.
- **Interception boxes.** Corporate firewalls and antivirus products that
  intercept TLS install their own root on users' machines and re-sign every
  site. A 2017 study by Zakir Durumeric and colleagues found that most such
  products weakened the connections they intercepted, many severely.

## 2.11 Going deeper

*Level: expert.*

**Post-quantum certificates.** A TLS handshake with a typical chain carries a
handshake signature, two certificate signatures, two embedded SCT signatures
and two public keys. With ML-DSA-44 (2,420-byte signatures, 1,312-byte public
keys) that adds up to more than 10 KB, against under 2 KB today, and larger
first flights cost real time on slow links. ML-DSA certificates are
standardized (RFC 9881) and fine for private PKIs. For the public web,
**Merkle Tree Certificates** (an IETF draft) take a different route: the CA
signs one tree head covering a batch of certificates, and a server sends an
inclusion proof of a few hundred bytes instead of a signature, with the trust
in tree heads shipped to browsers ahead of time. Chrome's planned
quantum-resistant root store is to accept only such CAs. KEMTLS (Peter Schwabe,
Douglas Stebila and Thom Wiggers, 2020) goes further and replaces the
handshake signature with a KEM. Book 5 follows this story.

**Formal X.509.** Much of the trouble in this chapter comes from parsing and
validation code. Projects to fix it include formally verified ASN.1 parsers
(EverParse, used in Windows), a 2022 specification of path validation in a
proof assistant, and differential testing frameworks that compare many
validators' answers on the same inputs. Chrome's and Firefox's validators were
rewritten in memory-safe or carefully restricted code in the 2020s.

**Name constraints in practice.** For years name constraints were not
supported by every client, so CAs could not rely on them; constrained
intermediates for organizations were rare. Support is now near universal in
browsers, and the BRs treat a properly constrained intermediate as "technically
constrained", which relaxes some audit requirements.

**Alternatives that did not win.** SPKI/SDSI (1996-1999, Carl Ellison, Ron
Rivest, Butler Lampson and others) proposed local names and authorization
certificates instead of global names. The web of trust (PGP,
Chapter 15) lets users vouch for each other.
DANE (RFC 6698, 2012) puts a server's key in DNSSEC-signed DNS records
([Chapter 10](10-DNSSEC-and-Private-DNS.md)); it is used for email between
servers but no browser enforces it. HTTP Public Key Pinning (RFC 7469, 2015)
let sites pin their own keys in browsers; it locked out sites that lost their
keys, was deprecated in Chrome in 2018 and was removed in 2019. Trust on first use, as SSH does it,
remains the main alternative ([Chapter 6](06-SSH.md)).

## Check yourself

??? question "1. What does a certificate bind together, and who vouches for the binding?"

    A name (a domain name in the subjectAltName) and a public key, for a
    period of time, with permitted uses. The issuer vouches for it by signing
    the to-be-signed part; the client trusts the issuer because of a chain to
    a root in its trust store.

??? question "2. Why is the root certificate not sent by the server, and why is its self-signature never checked?"

    Trust has to come from the client's own store, not from the network: a
    root sent by the server would prove nothing. The self-signature only shows
    that someone holds the root's key, which anyone who made the certificate
    does; the root's trustworthiness comes from being in the store.

??? question "3. An intermediate has `pathLenConstraint` 0. What may it sign?"

    Only end-entity (leaf) certificates. A CA certificate signed by it would
    make the path have one CA below it, exceeding the limit.

??? question "4. Your company's CA is name-constrained to `example.com`. It issues a valid certificate for `bank.com`. What happens?"

    Clients reject it during path validation: the leaf's name falls outside
    the permitted subtree collected from the constrained CA. The signature is
    valid; the constraint is enforced by the client.

??? question "5. Why does the ACME key authorization include a hash of the account key, not just the token?"

    So the proof is tied to one account. An attacker who sees the token (for
    example on a shared host) cannot use the same challenge response to get a
    certificate for their own account, because their thumbprint differs.

??? question "6. Give three reasons OCSP failed as a revocation mechanism on the web."

    It added a round trip to a third party before a page could load; it told
    the CA which sites each user visited; and browsers failed open when the
    responder could not be reached, so an attacker who could block it defeated
    it. (Stapling fixed the first two but was not deployed widely enough.)

??? question "7. In a filter cascade, why must the builder know every valid certificate, not just the revoked ones?"

    Level 2 holds the valid certificates that are false positives of level 1.
    To compute them the builder must test every valid certificate a client
    could ask about; one it never saw might be a false positive and be
    reported as revoked. Certificate Transparency supplies the full list.

??? question "8. What does Certificate Transparency prevent, and what does it not?"

    It does not stop a CA from issuing a bad certificate. It makes every
    publicly trusted certificate visible, so misissuance is detected by
    monitors and domain owners, and a log cannot hide or rewrite entries
    without being caught by consistency checks.

??? question "9. Why do shorter certificate lifetimes improve security even if revocation never worked?"

    A certificate that cannot be effectively revoked stays usable until it
    expires; a shorter life caps the time a stolen key or misissued
    certificate is useful. Short lives also force automated renewal, which
    lets the ecosystem replace algorithms or CAs quickly.

??? question "10. The 2008 rogue CA attack needed a predictable serial number. Why?"

    The colliding certificate request had to match, byte for byte, the
    certificate the CA would produce, including the serial number and
    validity dates, because the chosen-prefix collision was computed in
    advance. Random serial numbers make the signed bytes unpredictable.

## What you learned

- A certificate is a signed binding of a name to a key, encoded in DER, with
  extensions that carry the rules (SAN, basicConstraints, key usages, name
  constraints).
- Clients build a path to a trusted root and validate it top down: signatures,
  dates, CA flags, path lengths, name constraints, then the host name and key
  usage at the leaf. Skipping any of these has been exploited.
- Root programs decide which CAs a browser trusts; the CA/Browser Forum's
  Baseline Requirements set the rules. DigiNotar, Symantec and others were
  removed when they failed.
- ACME automates domain validation; multi-perspective checks and CAA records
  defend it against routing and DNS attacks.
- Online revocation failed; shorter lifetimes (47 days by 2029) and
  browser-pushed summaries such as CRLite replaced it.
- Certificate Transparency makes every public certificate visible in
  append-only logs, so misissuance is found.

**Next:** [Chapter 3](03-TLS-1.3-Message-by-Message.md), where the certificate
is sent, checked and used to sign a TLS 1.3 handshake.

## Further reading

- Loren Kohnfelder, "Towards a practical public-key cryptosystem", bachelor's
  thesis, MIT (1978).
- ITU-T Recommendation X.509 (first edition 1988); RFC 5280, the Internet X.509
  profile (2008); RFC 6125 on checking names (2011); RFC 4158 on path building.
- CA/Browser Forum, Baseline Requirements for TLS server certificates (current
  version), including ballot SC-081 (2025).
- RFC 8555, ACME (2019); RFC 8737, tls-alpn-01; RFC 7638, JWK thumbprints;
  RFC 8659, CAA.
- RFC 6960, OCSP; RFC 6066 (stapling); RFC 7633 (Must-Staple).
- RFC 6962 and RFC 9162, Certificate Transparency (2013, 2021); Ben Laurie,
  "Certificate Transparency", *Communications of the ACM* 57(10) (2014).
- Fox-IT, *DigiNotar Certificate Authority breach: "Operation Black Tulip"*
  (2011).
- Alexander Sotirov, Marc Stevens and others, "MD5 considered harmful today:
  creating a rogue CA certificate" (25C3, 2008).
- Martin Georgiev and others, "The most dangerous code in the world: validating
  SSL certificates in non-browser software" (CCS 2012).
- Chad Brubaker, Suman Jana, Baishakhi Ray, Sarfraz Khurshid and Vitaly
  Shmatikov, "Using Frankencerts for automated adversarial testing of
  certificate validation in SSL/TLS implementations" (IEEE S&P 2014).
- James Larisch, David Choffnes, Dave Levin, Bruce Maggs, Alan Mislove and
  Christo Wilson, "CRLite: a scalable system for pushing all TLS revocations to
  all browsers" (IEEE S&P 2017).
- Henry Birge-Lee, Yixin Sun, Annie Edmundson, Jennifer Rexford and Prateek
  Mittal, "Bamboozling certificate authorities with BGP" (USENIX Security
  2018).
- Zakir Durumeric and others, "The security impact of HTTPS interception"
  (NDSS 2017).
- Let's Encrypt, "Ending OCSP support in 2025" (December 2024) and "OCSP service
  has reached end of life" (August 2025).
- RFC 9881 (ML-DSA in X.509, 2025); the IETF draft on Merkle Tree Certificates;
  Peter Schwabe, Douglas Stebila and Thom Wiggers, "Post-quantum TLS without
  handshake signatures" (CCS 2020).
- Site pages: [X.509 field by field](../../formats/X.509.md),
  [ASN.1 and DER](../../formats/ASN.1-DER.md), [openssl recipes](../../tools/openssl.md).
