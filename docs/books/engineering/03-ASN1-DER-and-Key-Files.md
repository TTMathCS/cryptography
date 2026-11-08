# 3. ASN.1, DER and Key Files

*Every certificate, private key file, signed e-mail and PKCS#12 bundle on your
machine is the same kind of thing underneath: a tree of tag, length and value
records written in DER, the strict form of ASN.1's encoding rules. A signature
covers those exact bytes, so the parser that reads them stands between an
attacker and every check that comes after. This chapter takes the bytes apart
by hand, builds a strict DER reader of about eighty lines and walks a real root
certificate with it, then goes through the files that keys live in (PEM,
PKCS#1, PKCS#8, SubjectPublicKeyInfo, PKCS#7, PKCS#12, Java key stores, JWK and
COSE). It ends with the parser bugs that let people forge signatures, borrow
other people's names and hang servers, and the strict checks that stop each.*

!!! abstract "In this chapter"
    **You will learn:**

    - how tag, length and value work, byte by byte, and how integers and
      object identifiers are written;
    - why DER allows exactly one encoding of each value, and what goes wrong
      when a reader accepts more (BER);
    - how to write a strict DER reader and walk a real certificate with it;
    - what is inside each common key and certificate file, how to tell them
      apart by their first bytes, and why old key stores are weak;
    - how JSON Web Keys and COSE keys carry the same keys without ASN.1;
    - how parsers became attack surface: the 2006 RSA signature forgery seen
      as a parser bug, the null-prefix names of 2009, BERserk in 2014 and the
      certificate that put OpenSSL into an endless loop in 2022.

    **You need:** [Chapter 2](02-Bytes-Encodings-and-Text.md) (bytes, byte
    order, Base64 and why ambiguous encodings are bugs), and what a
    certificate is for: book 1 [Chapter 16](../../book/16-PKI-and-Key-Establishment.md).
    What each certificate field means is told in Protocols
    [§2.2](../protocols/02-Certificates-and-PKI.md#22-what-a-certificate-says);
    this chapter keeps to the bytes.

    **Levels:** §3.1 and §3.2 are for beginners, §3.3 to §3.11 are
    intermediate, §3.12 is expert.

## 3.1 The problem

*Level: beginner.*

A signature never covers a certificate. It covers bytes. When a certificate
authority signs, it hashes a run of bytes it has just produced and signs the
hash; when your browser checks the signature, it hashes the run of bytes it
received and checks against that. Everything the certificate says (the name,
the key, the dates, whether its holder may issue certificates of its own) is
carried in those bytes, and the browser learns it by **parsing** them. If the
signer and the reader can disagree about what a run of bytes means, an
attacker can get one meaning signed and have the other one believed.

That is not a hypothetical. In August 2006 Daniel Bleichenbacher stood up at
the rump session of the CRYPTO conference in Santa Barbara and showed how to
forge RSA signatures with nothing but a cube root, against any key whose
public exponent was 3. The mathematics is told in Cryptanalysis
[§13.10](../cryptanalysis/13-Attacks-on-RSA.md#1310-bleichenbachers-2006-signature-forgery).
The cause was not in the mathematics at all. The verifiers, OpenSSL among
them, read the signed block with a parser that took the hash it was looking
for and then stopped reading, so anything after the hash was ignored, and
"anything" was room for the forger to work. Three years later Moxie
Marlinspike got a certificate authority to sign a name that browsers read as
`www.paypal.com`, because the name contained a zero byte. Five years after that
the 2006 forgery came back in Firefox's library, hidden this time inside the
bytes that say how long a field is. Each time the cryptography was sound and
the reading of the bytes was not.

The bytes in question are written in **ASN.1**, Abstract Syntax Notation One,
and almost always in its **Distinguished Encoding Rules**, DER. ASN.1 is a
schema language, a way of declaring that a certificate is a sequence of a
to-be-signed part, an algorithm and a signature, and that the to-be-signed
part is a sequence of a version, a serial number and so on. It says nothing
about bytes. Encoding rules turn the values into bytes, and DER is the set of
rules that gives every value exactly one encoding, which is what a signature
needs. ASN.1 was born in the telecommunications world, as CCITT recommendation
X.409 of 1984, for the X.400 electronic mail system. In 1988 it was split into
X.208 (the notation) and X.209 (the Basic Encoding Rules, BER), in the same
year that X.509 defined certificates for the X.500 directory. Since 1994 the
notation has been ITU-T X.680 and the encoding rules X.690, which defines BER,
the canonical CER, and DER; the current editions are from 2021, published
also as ISO/IEC 8824-1 and 8825-1. X.400 and X.500 mostly faded. Their
encoding did not: it is in every certificate, every private key file, OCSP,
S/MIME, Kerberos, LDAP, SNMP and the signalling of every 4G and 5G phone
network.

On a disk the same DER turns up in a confusing zoo of files: `.pem`, `.crt`,
`.cer`, `.der`, `.key`, `.csr`, `.p7b`, `.p12`, `.pfx`, `.jks`. Some are the
same bytes under different names, some are the same names over different
bytes, and a few hold private keys under a password protection that was weak
when it was designed. Figure 3.1 shows the history in one picture.

<figure class="mars-fig">
<svg viewBox="0 0 640 430" width="640" role="img" aria-label="Timeline from ASN.1's birth in 1984 to the OpenSSL infinite-loop certificate of 2022, with the file formats and the parser bugs" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="420" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1984</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">CCITT X.409: ASN.1 is born, for X.400 mail</text>
<text x="78" y="57" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="52" r="3.5"/>
<text x="108" y="57">X.208 notation, X.209 BER; X.509 certificates</text>
<text x="78" y="87" text-anchor="end" font-weight="bold">1991</text>
<circle cx="92" cy="82" r="3.5"/>
<text x="108" y="87">RSA Data Security publishes the PKCS series</text>
<text x="78" y="117" text-anchor="end" font-weight="bold">1993</text>
<circle cx="92" cy="112" r="3.5"/>
<text x="108" y="117">PEM, RFC 1421: BEGIN and END lines around Base64</text>
<text x="78" y="147" text-anchor="end" font-weight="bold">1994</text>
<circle cx="92" cy="142" r="3.5"/>
<text x="108" y="147">X.680 and X.690: BER, CER and DER as used today</text>
<text x="78" y="177" text-anchor="end" font-weight="bold">1998</text>
<circle cx="92" cy="172" r="3.5"/>
<text x="108" y="177">JKS key stores in Java 1.2; PKCS#7 as RFC 2315</text>
<text x="78" y="207" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="202" r="3.5"/>
<text x="108" y="207">PKCS#12 v1.0, from Microsoft's PFX</text>
<text x="78" y="237" text-anchor="end" font-weight="bold">2006</text>
<circle cx="92" cy="232" r="3.5"/>
<text x="108" y="237">Bleichenbacher's e = 3 forgery: a parser stops early</text>
<text x="78" y="267" text-anchor="end" font-weight="bold">2009</text>
<circle cx="92" cy="262" r="3.5"/>
<text x="108" y="267">null-prefix names; padded and overflowing OIDs</text>
<text x="78" y="297" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="292" r="3.5"/>
<text x="108" y="297">BERserk: the forgery returns inside length bytes</text>
<text x="78" y="327" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="322" r="3.5"/>
<text x="108" y="327">RFC 7468 pins down PEM; JWK, RFC 7517</text>
<text x="78" y="357" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="352" r="3.5"/>
<text x="108" y="357">CurveBall: Windows trusts curve parameters it is sent</text>
<text x="78" y="387" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="382" r="3.5"/>
<text x="108" y="387">CVE-2022-0778: one certificate loops OpenSSL forever</text>
<text x="108" y="412" font-size="13" opacity="0.7">formats above the 2006 line; parser failures below it</text>
</svg>
<figcaption>Figure 3.1. Forty years of ASN.1 in files and in failures. The formats were mostly settled by 1999; the bugs in reading them have not stopped.</figcaption>
</figure>

This chapter is about reading and writing those bytes safely. The rule it
arrives at is short: **parse strictly, or better, do not parse at all**. Where
you know what the bytes must be, build them yourself and compare. Where you
must parse, accept exactly one encoding of each value, refuse everything else,
and check that every byte has been accounted for.

!!! note "Life story: ASN.1"
    **Born:** 1984 as CCITT X.409, for the X.400 mail system; split in 1988
    into X.208 and X.209; ITU-T X.680 and X.690 since 1994, current editions
    2021 · **Purpose:** to describe data structures once, independently of
    machines and languages, and to encode them in standard ways ·
    **Helped:** X.509 certificates, PKCS key files, CMS and S/MIME, OCSP,
    Kerberos, LDAP, SNMP, and the radio signalling of 3G, 4G and 5G networks ·
    **Status:** everywhere, and famously hard to parse; new formats (JWK,
    COSE, Protocol Buffers) chose other encodings, but nothing has displaced
    it under certificates

## 3.2 Tag, length, value

*Level: beginner.*

Every DER value is written as three parts, one after the other: a **tag** that
says what kind of value it is, a **length** that says how many bytes the value
takes, and the **value** itself. If the value is a structure, such as a
SEQUENCE, its value bytes are just more tag-length-value records, one after
another, and those may hold more again. A certificate is a tree of these
records, from a few dozen to a few hundred of them, nested up to seven or
eight deep.

**The tag.** For every tag number up to 30, the tag is one byte, split into
three fields:

- bits 8 and 7 are the **class**: `00` universal (a type ASN.1 itself
  defines, such as INTEGER), `01` application, `10` context-specific (a
  numbered field inside one structure, written `[0]`, `[1]`, ...), `11`
  private;
- bit 6 is set if the value is **constructed**, that is, made of more TLV
  records, and clear if it is **primitive**, raw bytes;
- bits 5 to 1 are the **number**.

So `30` is binary `00 1 10000`: universal, constructed, number 16, which is
SEQUENCE. `02` is universal, primitive, number 2: INTEGER. `a0` is binary
`10 1 00000`: context-specific, constructed, number 0, which a certificate uses
for its version field. Tag numbers 31 and above use a longer form (the low five
bits all ones, then the number in base 128), which certificates never need.

| Tag | Type | Tag | Type |
|---|---|---|---|
| `01` | BOOLEAN | `0c` | UTF8String |
| `02` | INTEGER | `13` | PrintableString |
| `03` | BIT STRING | `16` | IA5String (ASCII) |
| `04` | OCTET STRING | `17` | UTCTime |
| `05` | NULL | `18` | GeneralizedTime |
| `06` | OBJECT IDENTIFIER | `30` | SEQUENCE (16, constructed) |
| `a0`, `a1`, ... | `[0]`, `[1]`, ... constructed | `31` | SET (17, constructed) |
| `80`, `81`, ... | `[0]`, `[1]`, ... primitive | | |

**Explicit and implicit tags.** A schema can give a field a context tag in two
ways. `[0] EXPLICIT INTEGER` wraps the whole INTEGER record inside a
constructed `a0` record: `a0 03 02 01 02` is the certificate version, the
INTEGER 2 inside `[0]`. `[2] IMPLICIT IA5String` *replaces* the tag:
a DNS name in a subjectAltName is `82 0b` followed by the eleven ASCII bytes,
and nothing in the bytes says it was an IA5String; only the schema knows. A
DER reader without the schema can always find the boundaries of every record,
but not always what a context-tagged value means.

**The length.** Lengths 0 to 127 take one byte. Longer values set the top bit
of the first length byte and put in its low seven bits the number of length
bytes that follow, big-endian. So a length of 13 is `0d`, a length of 200 is
`81 c8`, and the 1,387 bytes of a certificate's contents are `82 05 6b`, since
$\mathtt{0x056b} = 5 \cdot 256 + 107 = 1387$. The byte `80` alone means
"indefinite length, ended by two zero bytes": it exists in BER for streaming
and DER forbids it.

**INTEGER values** are two's complement, big-endian, in the fewest bytes that
hold the number *and its sign*. So 127 is `02 01 7f`, but 128 is
`02 02 00 80`: the byte `80` alone would have its top bit set and read as
$-128$. That spare zero byte explains a puzzle you will meet often: an RSA-4096
modulus has 4,096 bits but takes 513 bytes, because its top bit is always set.
A certificate serial number that looks like 16 random bytes is often 17 bytes
on the wire for the same reason.

**OBJECT IDENTIFIERs** name algorithms, attributes and extensions as paths in
one global tree: 1.2.840.113549.1.1.11 is `iso(1) member-body(2) us(840)
rsadsi(113549) pkcs(1) pkcs-1(1) sha256WithRSAEncryption(11)`. To encode one,
merge the first two arcs into one number $40X + Y$, then write each arc in base
128, most significant group first, with the top bit set on every byte except
the last of each arc. By hand, for 1.2.840.113549:

<div class="mars-steps" markdown>
1. The first two arcs: $40 \cdot 1 + 2 = 42$, one byte, `2a`.
2. $840 = 6 \cdot 128 + 72$: groups 6 and 72, written `86 48` (6 with the top
   bit set is `86`; 72 is `48`).
3. $113549 = 6 \cdot 128^2 + 119 \cdot 128 + 13$: groups 6, 119, 13, written
   `86 f7 0d`.
4. Then 1, 1 and 11 are `01 01 0b`, and the tag and length go in front:
   `06 09 2a 86 48 86 f7 0d 01 01 0b`.
</div>

A whole AlgorithmIdentifier, the OID and a NULL for "no parameters", is then a
SEQUENCE of fifteen bytes, `30 0d 06 09 ... 05 00`, and it sits in
billions of certificates. Figure 3.2 shows the tag byte and the nesting.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The tag byte 30 split into class, constructed bit and number; below, the AlgorithmIdentifier as a SEQUENCE box holding an OID box and a NULL box" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">the tag byte 30</text>
<rect x="160" y="12" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="180" y="33" text-anchor="middle">0</text>
<rect x="200" y="12" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="220" y="33" text-anchor="middle">0</text>
<rect x="240" y="12" width="40" height="30" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.3"/>
<text x="260" y="33" text-anchor="middle">1</text>
<rect x="280" y="12" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="33" text-anchor="middle">1</text>
<rect x="320" y="12" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="340" y="33" text-anchor="middle">0</text>
<rect x="360" y="12" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="380" y="33" text-anchor="middle">0</text>
<rect x="400" y="12" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="420" y="33" text-anchor="middle">0</text>
<rect x="440" y="12" width="40" height="30" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="460" y="33" text-anchor="middle">0</text>
<text x="200" y="62" text-anchor="middle" font-size="13">class: universal</text>
<text x="260" y="80" text-anchor="middle" font-size="13">constructed</text>
<text x="380" y="62" text-anchor="middle" font-size="13">number 16: SEQUENCE</text>
<text x="20" y="122" font-weight="bold">lengths</text>
<text x="160" y="122">0d = 13</text>
<text x="280" y="122">81 c8 = 200</text>
<text x="430" y="122">82 05 6b = 1,387</text>
<rect x="20" y="150" width="600" height="160" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="34" y="174" font-family="monospace">30 0d</text>
<text x="110" y="174">SEQUENCE, 13 bytes of value:</text>
<rect x="50" y="190" width="540" height="50" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1.2"/>
<text x="64" y="220" font-family="monospace">06 09 2a 86 48 86 f7 0d 01 01 0b</text>
<text x="420" y="220">OID, 9 bytes</text>
<rect x="50" y="250" width="540" height="44" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1.2"/>
<text x="64" y="277" font-family="monospace">05 00</text>
<text x="420" y="277">NULL, 0 bytes</text>
</svg>
<figcaption>Figure 3.2. The tag byte of a SEQUENCE, three lengths, and the AlgorithmIdentifier for sha256WithRSAEncryption as nested records. A constructed value is nothing but more records; its length counts all their bytes.</figcaption>
</figure>

### Code it: an encoder

Writing DER is easier than reading it, because the writer makes all the
choices. This encoder is enough for every structure in this chapter:

```python
# A DER encoder for the handful of types this chapter needs.
def tlv(tag, value):
    n = len(value)
    if n < 0x80:
        length = bytes([n])                          # short form
    else:
        count = (n.bit_length() + 7) // 8            # long form: 81 to 84, then n
        length = bytes([0x80 | count]) + n.to_bytes(count, "big")
    return bytes([tag]) + length + value

def integer(x):
    size = ((x if x >= 0 else ~x).bit_length() + 8) // 8   # room for the sign bit
    return tlv(0x02, x.to_bytes(size, "big", signed=True))

def oid(dotted):
    arcs = [int(a) for a in dotted.split(".")]
    body = b""
    for arc in [40 * arcs[0] + arcs[1]] + arcs[2:]:
        chunk = [arc & 0x7F]                         # last 7 bits, top bit clear
        while arc > 0x7F:
            arc >>= 7
            chunk.append(0x80 | arc & 0x7F)          # earlier groups, top bit set
        body += bytes(reversed(chunk))
    return tlv(0x06, body)

def seq(*items):
    return tlv(0x30, b"".join(items))

NULL = tlv(0x05, b"")

for x in (0, 5, 127, 128, 255, 256, 65537, -1, -128, -129):
    print(f"INTEGER {x:>6}: {integer(x).hex(' ')}")
print("OID 1.3.101.112:          ", oid("1.3.101.112").hex(" "))
print("OID 1.2.840.113549.1.1.11:", oid("1.2.840.113549.1.1.11").hex(" "))
print("AlgorithmIdentifier:      ", seq(oid("1.2.840.113549.1.1.11"), NULL).hex(" "))
print("header of 1,387 bytes:    ", tlv(0x30, bytes(1387))[:4].hex(" "))
```

```
INTEGER      0: 02 01 00
INTEGER      5: 02 01 05
INTEGER    127: 02 01 7f
INTEGER    128: 02 02 00 80
INTEGER    255: 02 02 00 ff
INTEGER    256: 02 02 01 00
INTEGER  65537: 02 03 01 00 01
INTEGER     -1: 02 01 ff
INTEGER   -128: 02 01 80
INTEGER   -129: 02 02 ff 7f
OID 1.3.101.112:           06 03 2b 65 70
OID 1.2.840.113549.1.1.11: 06 09 2a 86 48 86 f7 0d 01 01 0b
AlgorithmIdentifier:       30 0d 06 09 2a 86 48 86 f7 0d 01 01 0b 05 00
header of 1,387 bytes:     30 82 05 6b
```

The sizing line in `integer` is the whole of the sign rule. A non-negative
$x$ needs $\lfloor \mathrm{bits}(x)/8 \rfloor + 1$ bytes so that the top bit of
the first byte is clear; a negative $x$ needs the same count for its
complement $-x - 1$ (Python's `~x`), so that $-128$ fits in the single byte
`80` and $-129$ needs two. 65537, the usual RSA public exponent, is
`02 03 01 00 01`, a byte string you will learn to spot in hex dumps of RSA keys.
And 1.3.101.112, the identifier of Ed25519, is just `2b 65 70`: three bytes,
because the arcs after the first two are small.

What to do:

- Never hand-assemble DER by string concatenation in production code; use a
  builder that computes lengths (BoringSSL's CBB, Go's `cryptobyte`, Rust's
  `der` crate). The code above is the shape of such a builder.
- Learn the half-dozen byte patterns that recur (`30 82`, `02 01 00`,
  `06 09 2a 86 48 86 f7 0d`, `01 00 01`, `05 00`); they make a hex dump
  readable at a glance.

## 3.3 BER, DER and why one encoding

*Level: intermediate.*

The Basic Encoding Rules allow choices. A length can be written in more bytes
than it needs (`81 03` instead of `03`), or left indefinite (`80`, with
`00 00` at the end). A string can be split into pieces, each its own record
inside a constructed wrapper. BOOLEAN true can be any non-zero byte. The
elements of a SET can come in any order, and a field with a default value can
be written or left out. These choices were deliberate: a sender streaming a
large message does not know its length when it starts, and the 1980s cared
about saving a byte here and there.

For a signature, each choice is a hole. If a value has two encodings, it has
two hashes; if a reader accepts both, then a signed object can be re-encoded
into a different byte string that the same reader takes for the same thing,
and anything that identifies objects by their hash (a certificate
fingerprint, a revocation list, a blockchain's transaction ID) can be fooled.
Worse, two readers may accept *different* sets of encodings, and then the
signer, the verifier and the application are not reading the same document.

**DER** is BER with every choice removed (X.690 clauses 10 and 11):

- lengths are definite and in the fewest bytes: `0d`, never `81 0d` and never
  `80 ... 00 00`;
- strings are primitive, in one piece;
- BOOLEAN true is `ff` and nothing else;
- a field equal to its DEFAULT value is left out;
- the elements of a SET OF are sorted by their encodings.

The fewest-bytes rule for INTEGERs and for OID arcs is already a BER rule;
lax readers break it anyway, and a strict reader must check it. **CER**, the
Canonical Encoding Rules, is the other canonical form: it keeps indefinite
lengths and cuts strings into 1,000-byte pieces, for streaming. Almost nobody
uses it.

### Break it: five encodings of one number

The code reads `SEQUENCE { INTEGER 5 }` written five ways with a lax,
BER-style reader and with a strict DER reader, and prints the SHA-256 of each
byte string:

```python
# One value, five byte strings. A lax (BER-style) reader accepts all of them;
# a DER reader accepts one. Each has its own SHA-256, so each is a different
# "document" to anything that hashes or signs bytes.
import hashlib

def lax_length(buf, i):                    # returns (length or None, next offset)
    first = buf[i]
    if first < 0x80:
        return first, i + 1
    if first == 0x80:
        return None, i + 1                 # indefinite: ends at 00 00
    count = first & 0x7F
    return int.from_bytes(buf[i + 1:i + 1 + count], "big"), i + 1 + count

def strict_length(buf, i):
    first = buf[i]
    if first < 0x80:
        return first, i + 1
    count = first & 0x7F
    if first == 0x80 or count > 4:
        raise ValueError("indefinite or oversized length")
    n = int.from_bytes(buf[i + 1:i + 1 + count], "big")
    if buf[i + 1] == 0 or n < 0x80:
        raise ValueError("length not in fewest bytes")
    return n, i + 1 + count

def read_seq_of_int(buf, length_rule):     # SEQUENCE { INTEGER }; returns the integer
    assert buf[0] == 0x30
    n, i = length_rule(buf, 1)
    end = len(buf) - 2 if n is None else i + n
    if n is None and buf[end:] != b"\0\0":
        raise ValueError("no end-of-contents")
    assert buf[i] == 0x02
    m, j = length_rule(buf, i + 1)
    v = buf[j:j + m]
    if length_rule is strict_length and len(v) > 1 and v[0] == 0 and v[1] < 0x80:
        raise ValueError("INTEGER not in fewest bytes")
    if j + m != end:
        raise ValueError("bytes left over")
    return int.from_bytes(v, "big", signed=True)

forms = ["3003020105", "308103020105", "30820003020105",
         "30800201050000", "300402020005"]
for h in map(bytes.fromhex, forms):
    try:
        strict = read_seq_of_int(h, strict_length)
    except ValueError as e:
        strict = f"rejected ({e})"
    print(f"{h.hex():16} lax={read_seq_of_int(h, lax_length)}  strict={strict}"
          f"  sha256={hashlib.sha256(h).hexdigest()[:8]}")
```

```
3003020105       lax=5  strict=5  sha256=417c7763
308103020105     lax=5  strict=rejected (length not in fewest bytes)  sha256=149e5141
30820003020105   lax=5  strict=rejected (length not in fewest bytes)  sha256=2f7ef72a
30800201050000   lax=5  strict=rejected (indefinite or oversized length)  sha256=cffac252
300402020005     lax=5  strict=rejected (INTEGER not in fewest bytes)  sha256=b7bc4884
```

Five byte strings, five hashes, one number. The strict reader's three checks
(no indefinite length, lengths in the fewest bytes, integers in the fewest
bytes) are the ones that matter most, and the fourth, "no bytes left over",
is the one whose absence caused the 2006 forgery (§3.10).

**The cost in the real world.** In January 2015 OpenSSL 1.0.1k fixed
CVE-2014-8275: it had accepted certificates and signatures with non-DER
encodings in several fields, so a certificate's fingerprint could be changed
without touching its signature, which broke software that blacklisted
certificates by fingerprint. The fix made OpenSSL reject ECDSA signatures that
did not re-encode to the same bytes, and that change set off an alarm in
Bitcoin. Bitcoin's nodes verified signatures with OpenSSL, and if one node
accepted a non-DER signature and an updated node rejected it, the network
could split over a single transaction. Pieter Wuille's BIP 66 made strict DER a
consensus rule, in force from July 2015. Cryptanalysis
[Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md) tells the
related story of Bitcoin's transaction malleability, where re-encoding a
signature changed a transaction's ID.

### How long is a signature?

DER's integers also explain why ECDSA signatures do not have a fixed size. An
ECDSA signature is `SEQUENCE { INTEGER r, INTEGER s }`, and $r$ and $s$ are
close to uniform below the group order. Half the time an integer's top bit is
set and it gains a `00` byte; one time in 256 its top byte is zero and it
loses one. A short simulation counts the sizes for P-256:

```python
# How long is a DER-encoded P-256 ECDSA signature? r and s are close to uniform
# below the group order n, so simulate them and count.
import random
from collections import Counter

n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551

def der_int_len(x):                        # tag + length byte + value with sign room
    return 2 + (x.bit_length() + 8) // 8

random.seed(256)
sizes = Counter()
for _ in range(100000):
    r, s = random.randrange(1, n), random.randrange(1, n)
    sizes[2 + der_int_len(r) + der_int_len(s)] += 1
for size in sorted(sizes):
    print(f"{size} bytes: {sizes[size]:6,} of 100,000")
print("raw r || s, as JOSE and COSE send it: always 64 bytes")
```

```
68 bytes:      2 of 100,000
69 bytes:    168 of 100,000
70 bytes: 25,039 of 100,000
71 bytes: 49,644 of 100,000
72 bytes: 25,147 of 100,000
raw r || s, as JOSE and COSE send it: always 64 bytes
```

Seventy-one bytes is the usual size, 70 and 72 a quarter of the time each,
and shorter ones are rare but real. Code that allocates exactly 72 bytes for a
P-256 signature is fine; code that *expects* 72 bytes fails about three times
in four, and code that expects 71 fails about half the time. (`openssl dgst
-sign` on a P-256 key, run a few hundred times, gives the same spread, 69 to
72.) JSON Web Signatures, COSE and DNSSEC avoid the problem by sending $r$ and
$s$ raw, each padded to the size of the group order (§3.9).

### The other encoding rules

DER is not the only set of rules for ASN.1. The others turn up in places you
might not expect:

| Rules | Standard | Bytes | Where you meet them |
|---|---|---|---|
| BER | X.690 | TLV, several encodings per value | CMS and PKCS#12, built for streaming (RFC 5652 §2, RFC 7292 §4): `openssl cms -sign -stream` and NSS's `pk12util` write `30 80` there, while `openssl pkcs12` and `keytool` do not; LDAP (RFC 4511 §5.1), SNMP |
| CER | X.690 | canonical: indefinite lengths, strings in 1,000-byte pieces | rarely |
| DER | X.690 | canonical: definite lengths | X.509, key files, OCSP, Kerberos, CMS signed attributes, ECDSA signatures |
| PER: aligned, unaligned (UPER), canonical | X.691 | packed bits, no tags | 4G and 5G signalling: RRC unaligned, S1AP and NGAP aligned |
| OER, canonical OER (COER) | X.696 (2014) | whole bytes, lengths only where sizes vary | IEEE 1609.2 and ETSI TS 103 097 vehicle-to-vehicle (V2X) certificates |
| XER and E-XER; JER; GSER | X.693; X.697 (2017); RFC 3641 (2003) | XML; JSON; text | rarely; GSER in LDAP |

The pattern is the one this chapter keeps returning to. Where a structure is
signed, the rules are canonical (DER, COER, the signed attributes inside CMS);
where it is only carried, the looser rules survive. A reader of the loose
formats must still be careful, because the loose parts sometimes contain
signed parts.

!!! note "Life story: DER, the Distinguished Encoding Rules"
    **Born:** 1988 as a restriction of BER for the X.509 directory
    authentication framework; X.690 since 1994 · **Purpose:** one and only one
    encoding for each ASN.1 value, so that what is signed can be re-created
    and compared byte for byte · **Helped:** every X.509 certificate, CRL and
    OCSP response; PKCS#1, PKCS#8 and SubjectPublicKeyInfo key files;
    Bitcoin's signatures after BIP 66 (2015) · **Status:** current; its rules
    are simple, and the bugs come from readers that do not enforce them

What to do:

- Configure or choose libraries that reject BER where DER is required:
  certificates, keys, OCSP and signature values. Most modern ones do (Go's
  `crypto/x509`, BoringSSL, Rust's `x509-cert`).
- Never identify a signed object by a hash of bytes that a lax reader would
  also accept in another form; hash the canonical re-encoding, or reject
  non-canonical input first.
- Treat signature lengths as variable. Convert between DER and raw $r \Vert s$
  with a tested function, never with fixed offsets.

## 3.4 A DER reader that walks a real certificate

*Level: intermediate.*

Reading is where the danger is, so the reader in this section is strict on
purpose. It rejects indefinite lengths, lengths not written in the fewest
bytes, lengths that run past the end of the buffer or past the end of their
parent, integers with redundant leading bytes, booleans other than `00` and
`ff`, badly formed OIDs, and any byte left over after the outer value. It does
not know the certificate schema; it only knows DER, and prints the tree. It
also looks inside OCTET STRINGs and BIT STRINGs, because X.509 wraps more DER
inside them: each extension's value is an OCTET STRING holding DER, and an
ECDSA signature is a BIT STRING holding a DER SEQUENCE of two integers.

The certificate is **ISRG Root X2**, the elliptic-curve root of Let's Encrypt,
created on 4 September 2020 and valid until 17 September 2040. The Base64
below is copied from `/etc/ssl/certs/ISRG_Root_X2.pem` as shipped in Ubuntu
24.04's `ca-certificates` package; any system with the Mozilla root store has
the same 543 bytes, and their SHA-256 fingerprint is `69:72:9B:8E:...:14:70`.
It is a root, so it signs itself, and at 543 bytes it is small enough to print
whole.

```python
# A strict DER reader, walking ISRG Root X2 (Let's Encrypt's ECDSA root, 2020-2040).
# The base64 is /etc/ssl/certs/ISRG_Root_X2.pem from Ubuntu 24.04's ca-certificates.
import base64

PEM = """
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn"""
der = base64.b64decode("".join(PEM.split()), validate=True)

TAGS = {1: "BOOLEAN", 2: "INTEGER", 3: "BIT STRING", 4: "OCTET STRING", 5: "NULL",
        6: "OID", 12: "UTF8String", 19: "PrintableString", 22: "IA5String",
        23: "UTCTime", 24: "GeneralizedTime", 48: "SEQUENCE", 49: "SET"}
OIDS = {"1.2.840.10045.4.3.3": "ecdsa-with-SHA384", "2.5.4.6": "countryName",
        "2.5.4.10": "organizationName", "2.5.4.3": "commonName",
        "1.2.840.10045.2.1": "id-ecPublicKey", "1.3.132.0.34": "secp384r1 (P-384)",
        "2.5.29.15": "keyUsage", "2.5.29.19": "basicConstraints",
        "2.5.29.14": "subjectKeyIdentifier"}

class DERError(ValueError): pass

def header(buf, i):                           # one tag and length: (tag, value start, end)
    if i + 2 > len(buf):
        raise DERError(f"offset {i}: truncated header")
    tag, first = buf[i], buf[i + 1]
    if tag & 0x1F == 0x1F:
        raise DERError(f"offset {i}: high tag numbers not supported")
    i += 2
    if first < 0x80:                          # short form: the byte is the length
        n = first
    elif first == 0x80:
        raise DERError(f"offset {i - 2}: indefinite length is BER, not DER")
    else:                                     # long form: 1 to 4 length bytes follow
        count = first & 0x7F
        if count > 4 or i + count > len(buf):
            raise DERError(f"offset {i - 2}: bad length of length")
        n = int.from_bytes(buf[i:i + count], "big")
        if buf[i] == 0 or n < 0x80:
            raise DERError(f"offset {i - 2}: length not in fewest bytes")
        i += count
    if i + n > len(buf):
        raise DERError(f"offset {i}: value runs past the end")
    return tag, i, i + n

def oid(v):
    if not v or v[-1] & 0x80 or any(b == 0x80 and (k == 0 or not v[k - 1] & 0x80)
                                    for k, b in enumerate(v)):
        raise DERError("bad OID encoding")
    arcs, n = [], 0
    for b in v:
        n = n << 7 | b & 0x7F
        if not b & 0x80:
            arcs.append(n)
            n = 0
    first = min(arcs[0] // 40, 2)
    return ".".join(map(str, [first, arcs[0] - 40 * first] + arcs[1:]))

def show(tag, v):
    if tag == 1:
        if v not in (b"\x00", b"\xff"):
            raise DERError("BOOLEAN must be 00 or ff")
        return "TRUE" if v == b"\xff" else "FALSE"
    if tag == 2:
        if not v or (len(v) > 1 and (v[0], v[1] >> 7) in ((0, 0), (0xFF, 1))):
            raise DERError("INTEGER not in fewest bytes")
        x = int.from_bytes(v, "big", signed=True)
        if abs(x) < 2 ** 32:
            return str(x)
    if tag == 6:
        o = oid(v)
        return f"{o}  {OIDS.get(o, '')}"
    if tag in (12, 19, 22, 23, 24):
        return v.decode("utf-8" if tag == 12 else "ascii")
    return v.hex()[:40] + ("..." if len(v) > 20 else "")

def walk(buf, start, end, depth):
    i = start
    while i < end:
        tag, vs, ve = header(buf, i)
        if ve > end:
            raise DERError(f"offset {i}: child runs past its parent")
        name = TAGS.get(tag) or f"[{tag & 0x1F}]"
        line = f"{i:4} {'  ' * depth}{name} ({ve - vs})"
        if tag & 0x20:                        # constructed: the value is more TLVs
            print(line)
            walk(buf, vs, ve, depth + 1)
        elif tag in (3, 4) and inner_der(buf, vs + (tag == 3), ve):
            print(line + (", unused bits 0" if tag == 3 else "") + ", holding DER:")
            walk(buf, vs + (tag == 3), ve, depth + 1)
        else:
            print(line, show(tag, buf[vs:ve]))
        i = ve

def inner_der(buf, start, end):               # does this string hold one whole DER value?
    try:
        return start < end and header(buf, start)[2] == end and buf[start] in (0x30, 0x03, 0x04)
    except DERError:
        return False

tag, vs, ve = header(der, 0)
if ve != len(der):
    raise DERError("trailing bytes after the certificate")
walk(der, 0, len(der), 0)
print(len(der), "bytes, all read")
```

It prints the whole tree, with each record's offset in the file and its value
length in parentheses:

```
   0 SEQUENCE (539)
   4   SEQUENCE (417)
   8     [0] (3)
  10       INTEGER (1) 2
  13     INTEGER (16) 41d29dd172eaeea780c12c6ce92f8752
  31     SEQUENCE (10)
  33       OID (8) 1.2.840.10045.4.3.3  ecdsa-with-SHA384
  43     SEQUENCE (79)
  45       SET (11)
  47         SEQUENCE (9)
  49           OID (3) 2.5.4.6  countryName
  54           PrintableString (2) US
  58       SET (41)
  60         SEQUENCE (39)
  62           OID (3) 2.5.4.10  organizationName
  67           PrintableString (32) Internet Security Research Group
 101       SET (21)
 103         SEQUENCE (19)
 105           OID (3) 2.5.4.3  commonName
 110           PrintableString (12) ISRG Root X2
 124     SEQUENCE (30)
 126       UTCTime (13) 200904000000Z
 141       UTCTime (13) 400917160000Z
 156     SEQUENCE (79)
 158       SET (11)
 160         SEQUENCE (9)
 162           OID (3) 2.5.4.6  countryName
 167           PrintableString (2) US
 171       SET (41)
 173         SEQUENCE (39)
 175           OID (3) 2.5.4.10  organizationName
 180           PrintableString (32) Internet Security Research Group
 214       SET (21)
 216         SEQUENCE (19)
 218           OID (3) 2.5.4.3  commonName
 223           PrintableString (12) ISRG Root X2
 237     SEQUENCE (118)
 239       SEQUENCE (16)
 241         OID (7) 1.2.840.10045.2.1  id-ecPublicKey
 250         OID (5) 1.3.132.0.34  secp384r1 (P-384)
 257       BIT STRING (98) 0004cd9bd59f80830aec094af3164a3e5ccf77ac...
 357     [3] (66)
 359       SEQUENCE (64)
 361         SEQUENCE (14)
 363           OID (3) 2.5.29.15  keyUsage
 368           BOOLEAN (1) TRUE
 371           OCTET STRING (4), holding DER:
 373             BIT STRING (2) 0106
 377         SEQUENCE (15)
 379           OID (3) 2.5.29.19  basicConstraints
 384           BOOLEAN (1) TRUE
 387           OCTET STRING (5), holding DER:
 389             SEQUENCE (3)
 391               BOOLEAN (1) TRUE
 394         SEQUENCE (29)
 396           OID (3) 2.5.29.14  subjectKeyIdentifier
 401           OCTET STRING (22), holding DER:
 403             OCTET STRING (20) 7c4296aede4b483bfa92f89e8ccf6d8ba9723795
 425   SEQUENCE (10)
 427     OID (8) 1.2.840.10045.4.3.3  ecdsa-with-SHA384
 437   BIT STRING (104), unused bits 0, holding DER:
 440     SEQUENCE (101)
 442       INTEGER (48) 7b794e465084c24487461b4570ff5899def4fda4...
 492       INTEGER (49) 008bf5776cd4c865aae00b2cee149d2737a4f953...
543 bytes, all read
```

The offsets are the same ones `openssl asn1parse -in ISRG_Root_X2.pem -i`
prints (OpenSSL 3.0.13 gives `0:d=0 hl=4 l= 539 cons: SEQUENCE`, then
`4:d=1 hl=4 l= 417`, and so on down to `437:d=1 hl=2 l= 104 prim: BIT
STRING`), which is a good way to test a reader of your own. Figure 3.3 lays
the 543 bytes out to scale.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The 543 bytes of ISRG Root X2 to scale: a 4-byte header, the 421-byte tbsCertificate, the signature algorithm and the 106-byte signature; below, the tbsCertificate expanded into version, serial, algorithm, issuer, validity, subject, public key and extensions" fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold">the certificate, 543 bytes</text>
<rect x="20" y="36" width="4.4" height="34" fill="currentColor" opacity="0.6"/>
<rect x="24.4" y="36" width="465.2" height="34" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.3"/>
<text x="257" y="58" text-anchor="middle">tbsCertificate: bytes 4 to 424, the signed part</text>
<rect x="489.6" y="36" width="13.3" height="34" fill="currentColor" opacity="0.45" stroke="currentColor" stroke-width="1.3"/>
<rect x="502.9" y="36" width="117.1" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="561" y="58" text-anchor="middle">signature</text>
<text x="496" y="90" text-anchor="middle" font-size="12">algorithm</text>
<line x1="24.4" y1="70" x2="20" y2="130" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="489.6" y1="70" x2="620" y2="130" stroke="currentColor" stroke-dasharray="4 3"/>
<rect x="20" y="130" width="5.7" height="34" fill="currentColor" opacity="0.6"/>
<rect x="25.7" y="130" width="7.1" height="34" fill="currentColor" opacity="0.4" stroke="currentColor" stroke-width="1"/>
<rect x="32.8" y="130" width="25.7" height="34" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="58.5" y="130" width="17.1" height="34" fill="currentColor" opacity="0.4" stroke="currentColor" stroke-width="1"/>
<rect x="75.6" y="130" width="115.4" height="34" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="133" y="152" text-anchor="middle">issuer</text>
<rect x="191" y="130" width="45.6" height="34" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1"/>
<rect x="236.6" y="130" width="115.5" height="34" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="294" y="152" text-anchor="middle">subject</text>
<rect x="352.1" y="130" width="171" height="34" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1"/>
<text x="438" y="152" text-anchor="middle">public key (SPKI)</text>
<rect x="523.1" y="130" width="96.9" height="34" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="572" y="152" text-anchor="middle">extensions</text>
<line x1="29" y1="164" x2="29" y2="196" stroke="currentColor"/>
<text x="24" y="212" font-size="12">version 8</text>
<line x1="46" y1="164" x2="60" y2="226" stroke="currentColor"/>
<text x="44" y="242" font-size="12">serial 13</text>
<line x1="67" y1="164" x2="110" y2="196" stroke="currentColor"/>
<text x="100" y="212" font-size="12">algorithm 31</text>
<line x1="214" y1="164" x2="214" y2="196" stroke="currentColor"/>
<text x="214" y="212" font-size="12" text-anchor="middle">validity 124</text>
<text x="133" y="182" font-size="12" text-anchor="middle">43</text>
<text x="294" y="182" font-size="12" text-anchor="middle">156</text>
<text x="438" y="182" font-size="12" text-anchor="middle">237</text>
<text x="572" y="182" font-size="12" text-anchor="middle">357</text>
<text x="20" y="262" font-size="13">numbers are the offsets where each field starts; widths are to scale within each bar</text>
</svg>
<figcaption>Figure 3.3. ISRG Root X2, to scale. The signature covers exactly the bytes of the shaded tbsCertificate, header included; the algorithm identifier is written twice, once inside (offset 31) and once outside (offset 425), and RFC 5280 requires the two to match.</figcaption>
</figure>

### Reading the output

Here is the same certificate as a walk through its bytes. The meaning of each
field (why a root has a key usage of `keyCertSign` and `cRLSign`, what a
subject key identifier is for) belongs to Protocols
[§2.2](../protocols/02-Certificates-and-PKI.md#22-what-a-certificate-says);
what follows is how each one is written.

| Offset | Bytes | What it is |
|---|---|---|
| 0 | `30 82 02 1b` | the Certificate: SEQUENCE, long-form length `82` (two bytes follow), $\mathtt{0x021b} = 539$, so 543 bytes with the header |
| 4 | `30 82 01 a1` | tbsCertificate, 417 bytes of value: the part the signature covers (RFC 5280 §4.1.1.3), header included |
| 8 | `a0 03 02 01 02` | `[0] EXPLICIT` version; 2 means version 3. A version 1 certificate leaves the field out, because it is `DEFAULT v1` and DER omits defaults |
| 13 | `02 10 41 d2 ...` | serial number, 16 bytes. Its first byte `41` has the top bit clear, so no `00` is needed; RFC 5280 §4.1.2.2 says positive and at most 20 bytes |
| 31 | `30 0a 06 08 2a 86 48 ce 3d 04 03 03` | AlgorithmIdentifier: ecdsa-with-SHA384, 1.2.840.10045.4.3.3, with *no* NULL (RFC 5758 forbids parameters for ECDSA, while RSA's identifiers carry `05 00`) |
| 43 | `30 4f 31 0b 30 09 06 03 55 04 06 13 02 55 53 ...` | issuer Name: a SEQUENCE of SETs, each holding one attribute: countryName (2.5.4.6) as PrintableString `US`, then organizationName and commonName |
| 124 | `30 1e 17 0d 32 30 30 39 ...` | Validity: two UTCTimes, `200904000000Z` and `400917160000Z`. UTCTime has a two-digit year, read as 1950 to 2049; dates from 2050 must be GeneralizedTime (RFC 5280 §4.1.2.5) |
| 156 | `30 4f ...` | subject: the same bytes as the issuer, which is what makes it self-issued |
| 237 | `30 76 30 10 06 07 ... 06 05 2b 81 04 00 22 03 62 00 04 ...` | SubjectPublicKeyInfo: id-ecPublicKey with the named curve secp384r1, then a BIT STRING: `00` unused bits, `04` for an uncompressed point, and 48 bytes each of $x$ and $y$ |
| 357 | `a3 42 30 40 ...` | `[3] EXPLICIT` extensions: keyUsage and basicConstraints, both marked critical with `01 01 ff`, and a subject key identifier |
| 425 | `30 0a 06 08 ...` | signatureAlgorithm, repeated outside the signed part |
| 437 | `03 68 00 30 65 02 30 ... 02 31 00 8b ...` | signatureValue: a BIT STRING holding the DER signature. $r$ takes 48 bytes; $s$ starts with `8b`, so it needs a `00` and takes 49 |

The keyUsage value deserves a second look, because BIT STRINGs are the
oddest type in DER. Its contents `03 02 01 06` are a BIT STRING of two bytes:
the first byte, `01`, says that one bit at the end of the last byte is unused,
and the remaining byte `06` is binary `0000 0110`. Bits are numbered from the
left, starting at 0, so bits 5 (keyCertSign) and 6 (cRLSign) are set and bit 7
is the unused one. DER requires that trailing zero bits be removed, which is
why the unused count is 1 and not 0. A reader that gets the bit numbering
backwards will grant a key the wrong powers.

**The other root.** ISRG Root X1, Let's Encrypt's RSA root of 4 June 2015,
valid to 4 June 2035, has the same shape at 1,391 bytes. Its dump begins
`30 82 05 6b 30 82 03 53 a0 03 02 01 02 02 11 00 82 10 cf b0 ...`: a contents
length of 1,387, a tbsCertificate of 851 bytes, and a serial of 16 bytes that
needs a 17th because its first byte, `82`, has its top bit set. Its algorithm
identifier is `30 0d 06 09 2a 86 48 86 f7 0d 01 01 0b 05 00`,
sha256WithRSAEncryption with its NULL. Its public key is rsaEncryption
(1.2.840.113549.1.1.1) and a BIT STRING (`03 82 02 0f 00`) holding more DER:
the 4,096-bit modulus as a 513-byte INTEGER, and 65537. Its signature is
`03 82 02 01 00` followed by 512 bytes of RSA. Run the reader on it (the file
is `/etc/ssl/certs/ISRG_Root_X1.pem` on most Linux systems) and you will see
the RSA public key unfold inside the BIT STRING.

**"DER" twice.** DER is the encoding; a `.der` file, often called `.cer`, is
also called "DER" because it holds exactly these bytes and nothing else. PEM
(§3.6) is the same bytes in Base64 between two lines, and a certificate's
SHA-256 fingerprint is the hash of the DER bytes, never of the PEM text.

### The bytes that are signed

The signature at offset 437 covers bytes 4 to 424, the tbsCertificate with
its own tag and length. That is the reason for all of DER's strictness: the
verifier must hash *exactly* the bytes the CA hashed, and it gets them by
slicing the received certificate, not by re-encoding what it understood. If it
re-encoded instead, any difference between its encoder and the CA's would
break valid certificates; if it sliced but its parser accepted non-DER, two
parsers could read different certificates out of the same signed bytes. §3.12
checks this root's signature on itself, with SHA-384 over those 421 bytes and
the P-384 curve in pure Python.

What to do:

- Test your reader against `openssl asn1parse` on real files; the offsets and
  lengths must agree exactly.
- A reader must check that every child ends inside its parent and that the
  outer value ends at the end of the input. Most of the bugs in §3.10 and
  §3.11 are one of those two checks, missing.
- To find the signed bytes, slice them from the input by the offsets your
  reader found. Never rebuild them.

## 3.5 Object identifiers

*Level: intermediate.*

ASN.1 names things with object identifiers, and the tree of OIDs is one of
the few truly global registries in computing. The top arcs are 0 (ITU-T), 1
(ISO) and 2 (joint ISO/ITU-T). Under 1.2.840 sit American organizations (840
is the ISO country code of the United States), so RSA Data Security's arc is
1.2.840.113549 and the ANSI X9 arc, where ECDSA lives, is 1.2.840.10045.
Under 2.16.840.1.101.3.4 sits NIST's algorithm registry, and under 2.5.4 the
X.500 attribute types every certificate name uses. Anyone can get an arc of
their own (a private enterprise number under 1.3.6.1.4.1 from IANA costs
nothing), which is why there are millions.

The first-byte rule $40X + Y$ deserves a note. Under arcs 0 and 1, the second
arc is less than 40, so the first byte decodes uniquely. Under arc 2 the
second arc may be any size, so the merged number can exceed 80, and a decoder
must read it as $X = 2$, $Y = n - 80$. The OID 2.999, for example, encodes as
the single arc $1079$, two bytes `88 37`. The reader in §3.4 handles it with
`min(arcs[0] // 40, 2)`.

| OID | Bytes after `06 len` | Name | Defined in |
|---|---|---|---|
| 1.2.840.113549.1.1.1 | `2a 86 48 86 f7 0d 01 01 01` | rsaEncryption (an RSA public key) | RFC 8017 |
| 1.2.840.113549.1.1.11 | `2a 86 48 86 f7 0d 01 01 0b` | sha256WithRSAEncryption: [RSA](../../02-signatures/RSA.md) PKCS#1 v1.5 with SHA-256 | RFC 4055, RFC 8017 |
| 1.2.840.10045.2.1 | `2a 86 48 ce 3d 02 01` | id-ecPublicKey | RFC 5480 |
| 1.2.840.10045.3.1.7 | `2a 86 48 ce 3d 03 01 07` | prime256v1, P-256 | RFC 5480 |
| 1.3.132.0.34 | `2b 81 04 00 22` | secp384r1, P-384 | RFC 5480 |
| 1.2.840.10045.4.3.2 | `2a 86 48 ce 3d 04 03 02` | ecdsa-with-SHA256: [ECDSA](../../02-signatures/ECDSA.md) | RFC 5758 |
| 1.3.101.110 / .112 | `2b 65 6e` / `2b 65 70` | id-X25519 / id-Ed25519: [EdDSA](../../02-signatures/EdDSA.md) | RFC 8410 |
| 2.16.840.1.101.3.4.2.1 | `60 86 48 01 65 03 04 02 01` | SHA-256 (inside DigestInfo, §3.10) | NIST registry |
| 2.16.840.1.101.3.4.3.17 | `60 86 48 01 65 03 04 03 11` | id-ml-dsa-44: [ML-DSA](../../02-signatures/ML-DSA.md); OpenSSL names it from 3.5 (2025), 3.0 prints the number | NIST registry; RFC 9881 |
| 2.16.840.1.101.3.4.4.2 | `60 86 48 01 65 03 04 04 02` | id-alg-ml-kem-768 | NIST registry |
| 2.5.4.3 | `55 04 03` | commonName | X.520 |
| 2.5.29.17 / .19 | `55 1d 11` / `55 1d 13` | subjectAltName / basicConstraints | RFC 5280 |
| 1.2.840.113549.1.12.10.1.2 | `2a 86 48 86 f7 0d 01 0c 0a 01 02` | pkcs8ShroudedKeyBag (PKCS#12, §3.7) | RFC 7292 |

Two habits follow from the table. First, a hex dump is readable once you know
that `2a 86 48 86 f7 0d` is RSA's arc, `2a 86 48 ce 3d` is ANSI X9.62's and
`60 86 48 01 65 03 04` is NIST's. Second, an OID is compared as a whole byte
string, never by decoding it to a number and comparing numbers, and never by
prefix.

### Break it: OIDs that two parsers read differently

In 2009 Dan Kaminsky, Meredith Patterson and Len Sassaman ("PKI Layer Cake",
presented at Black Hat in July 2009 and published at Financial Cryptography
2010) went looking for places where a certificate authority's software and a
browser's software would read the same certificate request differently. OIDs
were one. The arc 3 can also be written `80 03`, a leading base-128 digit of
zero, which X.690 forbids but some decoders accepted; and an arc larger than
$2^{64}$ wraps around in a decoder that accumulates it in a 64-bit integer.
Either way, a CA's software could see an unknown attribute it did not need to
validate, while a browser saw commonName:

```python
# Two decoders read the same OID bytes. The lax one (a 64-bit accumulator, and no
# check for padding) is the kind Kaminsky, Patterson and Sassaman found in 2009.
def arcs_from(body, bits=None, strict=False):
    arcs, n, fresh = [], 0, True
    for b in body:
        if strict and fresh and b == 0x80:
            raise ValueError("arc padded with a leading 0x80")
        n = n << 7 | b & 0x7F
        if bits:
            n &= (1 << bits) - 1             # what a C uint64_t silently does
        fresh = not b & 0x80
        if fresh:
            arcs.append(n)
            n = 0
    if not fresh:
        raise ValueError("last byte has its top bit set")
    first = min(arcs[0] // 40, 2)
    return ".".join(map(str, [first, arcs[0] - 40 * first] + arcs[1:]))

def base128(x):
    out = [x & 0x7F]
    while x > 0x7F:
        x >>= 7
        out.append(0x80 | x & 0x7F)
    return bytes(reversed(out))

honest = bytes.fromhex("550403")                       # 2.5.4.3, commonName
padded = bytes.fromhex("55048003")                     # the 3 written as 80 03
huge = bytes.fromhex("5504") + base128(2 ** 64 + 3)    # 2.5.4.18446744073709551619
for name, body in (("honest", honest), ("padded", padded), ("huge", huge)):
    try:
        strict = arcs_from(body, strict=True)
    except ValueError as e:
        strict = f"rejected: {e}"
    print(f"{name:7} {body.hex():24} 64-bit: {arcs_from(body, bits=64):10}  strict: {strict}")
```

```
honest  550403                   64-bit: 2.5.4.3     strict: 2.5.4.3
padded  55048003                 64-bit: 2.5.4.3     strict: rejected: arc padded with a leading 0x80
huge    550482808080808080808003 64-bit: 2.5.4.3     strict: 2.5.4.18446744073709551619
```

The strict decoder treats the two attacks differently, and both answers are
right. The padded form is not valid DER, so it is rejected. The huge arc is
valid DER for a different, unknown OID, so it is decoded exactly, with
Python's unbounded integers, and it is not commonName. The bug was never the
big number; it was a decoder that silently produced a *different* number.
Comparing OIDs as byte strings, as the table above suggests, makes both tricks
harmless: `55 04 80 03` and `55 04 03` are simply not equal.

What to do:

- Compare OIDs as their encoded bytes against constants. If you must decode,
  reject padding and arcs that do not fit your integer type.
- Do not accept a certificate or request containing an attribute OID you do
  not recognize in a place where names are checked (the CA side of the
  PKI Layer Cake attack).

## 3.6 PEM and the key files

*Level: intermediate.*

**PEM** is named after Privacy-Enhanced Mail, an IETF standard for secure
e-mail (RFC 1421 to 1424, February 1993) that almost nobody used. One piece of
it survived: the way it wrapped binary data for a text channel, Base64 between
a `-----BEGIN` line and an `-----END` line. OpenSSL adopted the wrapping for
everything, and for twenty years PEM was defined mostly by what OpenSSL
accepted, until RFC 7468 (April 2015) wrote down the practice. Its rules
(§2 and §4): a label on the BEGIN line that matches the END line, standard
Base64 in lines of 64 characters (readers should accept other line lengths),
and no headers. Text before the BEGIN line is allowed and must be ignored,
which is why `openssl x509 -text` output can be fed back to OpenSSL.

| Label | What the DER inside is | Defined in |
|---|---|---|
| `CERTIFICATE` | an X.509 certificate | RFC 5280 |
| `X509 CRL` | a certificate revocation list | RFC 5280 |
| `CERTIFICATE REQUEST` | a PKCS#10 request (CSR) | RFC 2986 |
| `PKCS7`, `CMS` | a CMS ContentInfo, often a certs-only chain | RFC 2315, RFC 5652 |
| `PUBLIC KEY` | a SubjectPublicKeyInfo, any algorithm | RFC 5280 §4.1 |
| `PRIVATE KEY` | a PKCS#8 PrivateKeyInfo, any algorithm | RFC 5208, RFC 5958 |
| `ENCRYPTED PRIVATE KEY` | a PKCS#8 EncryptedPrivateKeyInfo | RFC 5208, RFC 8018 |
| `RSA PRIVATE KEY`, `RSA PUBLIC KEY` | PKCS#1 RSAPrivateKey, RSAPublicKey | RFC 8017 App. A |
| `EC PRIVATE KEY` | SEC1 ECPrivateKey | RFC 5915 |
| `OPENSSH PRIVATE KEY` | OpenSSH's own format, not DER | OpenSSH `PROTOCOL.key` |

One file can hold several PEM blocks. A server's chain file is the leaf
certificate first and then each intermediate, the order TLS sends them in
(RFC 8446 §4.4.2). PEM is a text wrapping and nothing else: `grep -v -- -----
leaf.crt | base64 -d` gives exactly the bytes of `leaf.der`, and the two have
the same fingerprint. The details of Base64 (padding, the canonical last
character, the URL-safe alphabet) are in [Chapter 2](02-Bytes-Encodings-and-Text.md).

### The key structures

Inside the PEM there are five structures worth knowing. Two are specific to
one algorithm and came first; two are generic wrappers that name the
algorithm with an OID; and one is the encrypted form of a wrapper. Figure 3.4
shows how they nest.

**PKCS#1 RSAPrivateKey** (RFC 8017 Appendix A.1.2) is a SEQUENCE of nine
INTEGERs: a version (0), $n$, $e$, $d$, $p$, $q$, $d \bmod (p-1)$,
$d \bmod (q-1)$ and $q^{-1} \bmod p$. The last five exist to make signing four
times faster with the Chinese remainder theorem, book 1
[§13.9](../../book/13-RSA.md#139-speed-the-chinese-remainder-theorem-and-its-danger),
and a key file that gets them wrong produces faulty signatures, which is a
security problem of its own (Cryptanalysis
[§13.12](../cryptanalysis/13-Attacks-on-RSA.md#1312-the-crt-fault-attack)).
**RSAPublicKey** is `SEQUENCE { n, e }`.

**SEC1 ECPrivateKey** (RFC 5915) is `SEQUENCE { INTEGER 1, OCTET STRING
privateKey, [0] parameters OPTIONAL, [1] publicKey OPTIONAL }`: the secret
scalar as a fixed-length byte string, the curve's OID, and the public point.

**SubjectPublicKeyInfo** (SPKI, RFC 5280 §4.1) is the public key half of
every certificate, and on its own the content of a `PUBLIC KEY` file:
`SEQUENCE { AlgorithmIdentifier, BIT STRING }`. For RSA the bit string holds
the DER of RSAPublicKey; for elliptic curves it holds the raw point
(`04 || x || y`); for Ed25519 and X25519 it holds the 32 raw key bytes.

**PKCS#8 PrivateKeyInfo** (RFC 5208, extended as OneAsymmetricKey in RFC 5958)
is `SEQUENCE { INTEGER 0, AlgorithmIdentifier, OCTET STRING privateKey,
[0] attributes OPTIONAL }`, where the OCTET STRING holds the algorithm's own
structure: an RSAPrivateKey, an ECPrivateKey, or for Ed25519 another OCTET
STRING with the 32-byte seed (RFC 8410 §7). PKCS#8 is the only form Ed25519
keys have, and OpenSSL's default for every key type since 3.0 (2021).

**EncryptedPrivateKeyInfo** (PKCS#8, with the encryption schemes of PKCS#5,
RFC 8018) is `SEQUENCE { AlgorithmIdentifier, OCTET STRING }`, where the
algorithm names a password-based scheme and the octet string is a PrivateKeyInfo
encrypted under it.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Nesting of key structures: PKCS#8 PrivateKeyInfo holds an OCTET STRING containing a PKCS#1 or SEC1 key or an Ed25519 seed; SubjectPublicKeyInfo holds a BIT STRING containing RSAPublicKey, an EC point or raw Ed25519 bytes; EncryptedPrivateKeyInfo holds a PBES2 identifier and the encrypted PKCS#8 structure" fill="currentColor" font-size="14">
<rect x="10" y="10" width="300" height="200" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="20" y="32" font-weight="bold">PRIVATE KEY (PKCS#8)</text>
<text x="20" y="56">INTEGER 0</text>
<rect x="20" y="66" width="280" height="28" fill="currentColor" opacity="0.12" stroke="currentColor"/>
<text x="30" y="85">AlgorithmIdentifier (OID)</text>
<rect x="20" y="104" width="280" height="96" fill="none" stroke="currentColor"/>
<text x="30" y="124">OCTET STRING holding one of:</text>
<text x="40" y="148" font-size="13">RSA PRIVATE KEY (PKCS#1): 9 INTEGERs</text>
<text x="40" y="170" font-size="13">EC PRIVATE KEY (SEC1): scalar, point</text>
<text x="40" y="192" font-size="13">Ed25519: OCTET STRING, 32-byte seed</text>
<rect x="330" y="10" width="300" height="200" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="32" font-weight="bold">PUBLIC KEY (SPKI)</text>
<rect x="340" y="66" width="280" height="28" fill="currentColor" opacity="0.12" stroke="currentColor"/>
<text x="350" y="85">AlgorithmIdentifier (OID, curve)</text>
<rect x="340" y="104" width="280" height="96" fill="none" stroke="currentColor"/>
<text x="350" y="124">BIT STRING holding one of:</text>
<text x="360" y="148" font-size="13">RSA PUBLIC KEY (PKCS#1): n, e</text>
<text x="360" y="170" font-size="13">EC point: 04, x, y</text>
<text x="360" y="192" font-size="13">Ed25519: 32 raw bytes</text>
<rect x="10" y="240" width="620" height="110" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="20" y="262" font-weight="bold">ENCRYPTED PRIVATE KEY (PKCS#8 with PBES2)</text>
<rect x="20" y="274" width="290" height="62" fill="currentColor" opacity="0.12" stroke="currentColor"/>
<text x="30" y="296" font-size="13">PBES2: PBKDF2 (salt, iterations,</text>
<text x="30" y="318" font-size="13">PRF) and the cipher with its IV</text>
<rect x="330" y="274" width="290" height="62" fill="none" stroke="currentColor"/>
<text x="340" y="296" font-size="13">OCTET STRING: the PRIVATE KEY</text>
<text x="340" y="318" font-size="13">structure above, encrypted</text>
<line x1="160" y1="210" x2="470" y2="272" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="20" y="372" font-size="13">a certificate carries the SPKI box unchanged, inside the part its issuer signs</text>
</svg>
<figcaption>Figure 3.4. The key structures. The generic wrappers (PKCS#8, SPKI) name the algorithm with an OID and carry the algorithm's own structure inside a string; the encrypted form wraps the whole PKCS#8 structure again.</figcaption>
</figure>

### Code it: key files from raw numbers

The code builds all of them from numbers you can check by hand: book 1's toy
RSA key ($p = 61$, $q = 53$, $e = 17$, $d = 2753$, from
[Chapter 13](../../book/13-RSA.md)), and the Ed25519 key printed as an example
in RFC 8410 §10.3. The encoder is the one from §3.2, cut down to positive
integers.

```python
# Key files from raw numbers: PKCS#1, PKCS#8 and SubjectPublicKeyInfo for book 1's
# toy RSA key, and the Ed25519 key that RFC 8410 section 10.3 prints.
import base64, textwrap

def tlv(tag, value):
    n = len(value)
    if n < 0x80:
        return bytes([tag, n]) + value
    count = (n.bit_length() + 7) // 8
    return bytes([tag, 0x80 | count]) + n.to_bytes(count, "big") + value

def integer(x):
    return tlv(0x02, x.to_bytes((x.bit_length() + 8) // 8, "big"))

seq = lambda *items: tlv(0x30, b"".join(items))
octets = lambda b: tlv(0x04, b)
bits = lambda b: tlv(0x03, b"\x00" + b)          # 0 unused bits
RSA_ALG = seq(tlv(0x06, bytes.fromhex("2a864886f70d010101")), tlv(0x05, b""))
ED25519_ALG = seq(tlv(0x06, bytes.fromhex("2b6570")))

def pem(label, der):
    body = "\n".join(textwrap.wrap(base64.b64encode(der).decode(), 64))
    return f"-----BEGIN {label}-----\n{body}\n-----END {label}-----"

p, q, e = 61, 53, 17                             # book 1, chapter 13
n, d = p * q, pow(e, -1, (p - 1) * (q - 1))
pkcs1 = seq(integer(0), integer(n), integer(e), integer(d), integer(p), integer(q),
            integer(d % (p - 1)), integer(d % (q - 1)), integer(pow(q, -1, p)))
pkcs8 = seq(integer(0), RSA_ALG, octets(pkcs1))
spki = seq(RSA_ALG, bits(seq(integer(n), integer(e))))
print("PKCS#1 RSAPrivateKey:", pkcs1.hex())
print(pem("RSA PRIVATE KEY", pkcs1))
print(pem("PRIVATE KEY", pkcs8))
print(pem("PUBLIC KEY", spki))

seed = bytes.fromhex("d4ee72dbf913584ad5b6d8f1f769f8ad3afe7c28cbf1d4fbe097a88f44755842")
pub = bytes.fromhex("19bf44096984cdfe8541bac167dc3b96c85086aa30b6b6cb0c5c38ad703166e1")
ed_priv = seq(integer(0), ED25519_ALG, octets(octets(seed)))
ed_pub = seq(ED25519_ALG, bits(pub))
print(pem("PRIVATE KEY", ed_priv))
print(pem("PUBLIC KEY", ed_pub))
print("prefixes:", ed_priv[:16].hex(), ed_pub[:12].hex())
print("matches RFC 8410:", base64.b64encode(ed_priv).decode() ==
      "MC4CAQAwBQYDK2VwBCIEINTuctv5E1hK1bbY8fdp+K06/nwoy/HU++CXqI9EdVhC")
```

```
PKCS#1 RSAPrivateKey: 301d02010002020ca102011102020ac102013d020135020135020131020126
-----BEGIN RSA PRIVATE KEY-----
MB0CAQACAgyhAgERAgIKwQIBPQIBNQIBNQIBMQIBJg==
-----END RSA PRIVATE KEY-----
-----BEGIN PRIVATE KEY-----
MDMCAQAwDQYJKoZIhvcNAQEBBQAEHzAdAgEAAgIMoQIBEQICCsECAT0CATUCATUC
ATECASY=
-----END PRIVATE KEY-----
-----BEGIN PUBLIC KEY-----
MBswDQYJKoZIhvcNAQEBBQADCgAwBwICDKECARE=
-----END PUBLIC KEY-----
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEINTuctv5E1hK1bbY8fdp+K06/nwoy/HU++CXqI9EdVhC
-----END PRIVATE KEY-----
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAGb9ECWmEzf6FQbrBZ9w7lshQhqowtrbLDFw4rXAxZuE=
-----END PUBLIC KEY-----
prefixes: 302e020100300506032b657004220420 302a300506032b6570032100
matches RFC 8410: True
```

Read the PKCS#1 hex as a list: `30 1d` (a SEQUENCE of 29 bytes), `02 01 00`
(version 0), `02 02 0c a1` ($n = 3233$), `02 01 11` ($e = 17$), `02 02 0a c1`
($d = 2753$), then $p = 61$, $q = 53$, $d \bmod 60 = 53$, $d \bmod 52 = 49$ and
$q^{-1} \bmod 61 = 38$. OpenSSL 3.0.13 accepts these files as real keys, which
is a good test of the encoder (the 12-bit key is of course worthless):

```
$ openssl rsa -in toy.pem -check -noout
RSA key ok
$ openssl pkey -in toy8.pem -text -noout
Private-Key: (12 bit, 2 primes)
modulus: 3233 (0xca1)
publicExponent: 17 (0x11)
privateExponent: 2753 (0xac1)
prime1: 61 (0x3d)
prime2: 53 (0x35)
exponent1: 53 (0x35)
exponent2: 49 (0x31)
coefficient: 38 (0x26)
$ openssl pkey -in ed.pem -pubout
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAGb9ECWmEzf6FQbrBZ9w7lshQhqowtrbLDFw4rXAxZuE=
-----END PUBLIC KEY-----
```

The last command derives the public key from the RFC's private key, and it is
exactly the SPKI the code built from RFC 8410's public key bytes. The two
Ed25519 prefixes are worth remembering: every Ed25519 PKCS#8 file is the 16
bytes `30 2e 02 01 00 30 05 06 03 2b 65 70 04 22 04 20` followed by the
32-byte seed, and every Ed25519 public key file is the 12 bytes
`30 2a 30 05 06 03 2b 65 70 03 21 00` followed by the key. Code that only
handles Ed25519 can check the prefix and slice, which is far safer than
parsing.

### Encrypted key files

A private key file at rest is usually protected by a password, and the
password step, not the cipher, is where old files are weak. Here is real
output from OpenSSL 3.0.13 (Ubuntu 24.04, October 2026) for a P-256
key saved two ways: with `openssl pkey -aes256`, and with `-traditional` for
the old format:

```
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
```

- **The traditional format** (`Proc-Type` and `DEK-Info`, headers from RFC 1421
  that RFC 7468 does not allow but OpenSSL still writes) derives the AES key
  with OpenSSL's `EVP_BytesToKey`: one pass of [MD5](../../07-hash/Retired.md)
  over the passphrase and the first 8 bytes of the IV as salt. One MD5 per
  guess is nothing; a single graphics card tries billions a second.
  Chapter 15 re-implements `EVP_BytesToKey` and
  shows why.
- **PKCS#8 with PBES2** names its key derivation in the file:
  [PBKDF2](../../08-kdf-password-hashing/PBKDF2.md) with HMAC-SHA-256, an
  8-byte salt and 2,048 iterations (`0800` in hex, OpenSSL's default), then
  AES-256-CBC. 2,048 is far below the 600,000 that OWASP recommends for
  PBKDF2-HMAC-SHA-256 for passwords. Ask for more with `openssl pkcs8 -topk8
  -v2 aes-256-cbc -iter 600000`, or use scrypt with `-scrypt` (RFC 7914 §7).
- **Neither format has a MAC.** A wrong passphrase shows up only as bad CBC
  padding or as garbage that fails to parse as DER, which is why tools report
  "bad decrypt" and nothing more.

**OpenSSH's format is different.** Since OpenSSH 7.8 (August 2018),
`ssh-keygen` writes `OPENSSH PRIVATE KEY` by default: PEM armor around a
binary format that is not DER (it starts with the bytes `openssh-key-v1` and a
zero), with the key encrypted by AES-256-CTR under a key from
[bcrypt_pbkdf](../../08-kdf-password-hashing/bcrypt.md), 16 rounds by default.
See Protocols [Chapter 6](../protocols/06-SSH.md) and the
[ssh-keygen card](../../tools/ssh-keygen.md).

!!! note "Life story: PEM armor"
    **Born:** February 1993, RFC 1421, as the wrapping for Privacy-Enhanced
    Mail · **Purpose:** to carry binary cryptographic objects through
    text-only channels such as e-mail, terminals and configuration files ·
    **Helped:** OpenSSL and almost every TLS server (`.pem`, `.crt`, `.key`
    files), ACME clients, Kubernetes secrets, cloud consoles; written down
    as practice in RFC 7468 (2015) · **Status:** the mail standard died within
    a few years; the armor is the most common way keys and certificates are
    stored and pasted

What to do:

- Write new private keys as PKCS#8. Encrypt them with PBES2 and a high
  iteration count or scrypt, or better, keep them in a key store or hardware
  that never writes them out (Chapter 11).
- When you read a PEM file, check the label is the one you expect before you
  parse the DER. A `PRIVATE KEY` where you expected a `PUBLIC KEY` is a leak
  in progress, not a format to be accepted.
- Decode Base64 strictly (`base64.b64decode(..., validate=True)` in Python)
  and refuse files with text inside the armor.

## 3.7 Chains and bundles: PKCS#7, CMS and PKCS#12

*Level: intermediate.*

**PKCS#7 and CMS.** RSA Data Security's PKCS#7 (version 1.5 published as
RFC 2315 in 1998) became the IETF's Cryptographic Message Syntax, CMS (RFC 5652,
2009), the format behind S/MIME e-mail, Windows Authenticode code signatures,
Apple's code signatures, timestamping and much else. Everything in it is a
**ContentInfo**: `SEQUENCE { OID contentType, [0] EXPLICIT content }`, where
the OID says whether the content is plain data, SignedData, EnvelopedData
(encrypted), and so on. A **SignedData** holds the digest algorithms, the
content (or nothing, for a detached signature), an optional `[0]` set of
certificates, an optional `[1]` set of CRLs, and the signer infos.

A `.p7b` or `.p7c` file uses the degenerate case: a SignedData with no
content and no signers, only certificates and perhaps CRLs (RFC 2315 §9, the
"certs-only" message of RFC 8551 §3.8). Nothing in it is signed and it never
holds a key; it is a way of shipping a chain, and Windows exports chains this
way. `openssl crl2pkcs7 -nocrl -certfile leaf.crt -certfile ca.crt` makes one,
and `keytool -importcert` reads them.

CMS has one trap that catches every first implementation. A signer can sign
**signed attributes** (the content type, the message digest, a signing time)
instead of the content itself. They sit in the SignerInfo as
`[0] IMPLICIT SET OF Attribute`, so on the wire their tag is `a0`. But the
signature covers their DER encoding *as a SET*, with the tag `31` (RFC 5652
§5.4). A verifier that hashes the bytes as they appear in the file, `a0` and
all, computes the wrong hash and rejects every valid signature; one that
re-encodes them must produce DER, sorted, or it rejects some. CMS is also one
of the places BER survives: a streamed SignedData may use indefinite lengths
(`30 80`) for the outer layers, while the signed attributes inside must be DER.

**PKCS#12.** A **PFX** ("Personal Information Exchange") file, `.p12` or
`.pfx`, carries a private key together with its certificate chain, under a
password. It began as Microsoft's PFX format of 1997; RSA Laboratories
published PKCS#12 version 1.0 in 1999, and version 1.1 is RFC 7292 (2014). It is
the format browsers, the macOS keychain, Windows and Java import and export
when a person moves "a certificate" from one machine to another, which almost
always means a key too. Its structure, from a file made with `openssl pkcs12
-export` (OpenSSL 3.0.13, a P-256 key and its certificate), is in Figure 3.5:

```
$ openssl asn1parse -inform DER -in demo.p12 -i
    0:d=0  hl=4 l=1020 cons: SEQUENCE
    4:d=1  hl=2 l=   1 prim:  INTEGER           :03
    7:d=1  hl=4 l= 946 cons:  SEQUENCE
   11:d=2  hl=2 l=   9 prim:   OBJECT            :pkcs7-data
   22:d=2  hl=4 l= 931 cons:   cont [ 0 ]
   26:d=3  hl=4 l= 927 prim:    OCTET STRING      [HEX DUMP]:3082039B3082025206092A86...
  957:d=1  hl=2 l=  65 cons:  SEQUENCE
  959:d=2  hl=2 l=  49 cons:   SEQUENCE
  961:d=3  hl=2 l=  13 cons:    SEQUENCE
  963:d=4  hl=2 l=   9 prim:     OBJECT            :sha256
  974:d=4  hl=2 l=   0 prim:     NULL
  976:d=3  hl=2 l=  32 prim:    OCTET STRING      [HEX DUMP]:4DBC63C77BB3E2DF...
 1010:d=2  hl=2 l=   8 prim:   OCTET STRING      [HEX DUMP]:823F1F76DE0F3C2A
 1020:d=2  hl=2 l=   2 prim:   INTEGER           :0800
```

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Nesting of a PKCS#12 file: the PFX holds version 3, a ContentInfo of type data whose OCTET STRING holds the AuthenticatedSafe, a sequence of two ContentInfos, one encrypted holding the certificate bag and one plain holding the shrouded key bag; and MacData with an HMAC, salt and iteration count" fill="currentColor" font-size="14">
<rect x="10" y="10" width="620" height="380" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="22" y="32" font-weight="bold">PFX (offset 0)</text>
<text x="200" y="32">version INTEGER 3 (offset 4)</text>
<rect x="22" y="44" width="596" height="252" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="34" y="66">authSafe: ContentInfo, type data (offset 7)</text>
<rect x="34" y="78" width="572" height="206" fill="currentColor" opacity="0.06" stroke="currentColor"/>
<text x="46" y="100">OCTET STRING holding the AuthenticatedSafe: SEQUENCE OF</text>
<rect x="46" y="112" width="270" height="160" fill="none" stroke="currentColor"/>
<text x="56" y="134">ContentInfo: encryptedData</text>
<text x="56" y="156" font-size="13">PBES2, PBKDF2-SHA256 x 2,048,</text>
<text x="56" y="176" font-size="13">AES-256-CBC</text>
<rect x="56" y="190" width="250" height="70" fill="currentColor" opacity="0.15" stroke="currentColor"/>
<text x="66" y="214" font-size="13">SafeContents (encrypted):</text>
<text x="66" y="236" font-size="13">certBag: the certificate</text>
<rect x="326" y="112" width="270" height="160" fill="none" stroke="currentColor"/>
<text x="336" y="134">ContentInfo: data</text>
<text x="336" y="156" font-size="13">SafeContents (not encrypted)</text>
<rect x="336" y="170" width="250" height="90" fill="currentColor" opacity="0.15" stroke="currentColor"/>
<text x="346" y="194" font-size="13">pkcs8ShroudedKeyBag:</text>
<text x="346" y="214" font-size="13">an EncryptedPrivateKeyInfo</text>
<text x="346" y="234" font-size="13">(PBES2), plus localKeyID</text>
<text x="346" y="252" font-size="13">and friendlyName attributes</text>
<rect x="22" y="306" width="596" height="72" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="34" y="328">MacData (offset 957): DigestInfo { sha256, 32-byte HMAC },</text>
<text x="34" y="350">salt (8 bytes), iterations 2,048: an HMAC over the AuthenticatedSafe bytes,</text>
<text x="34" y="370">keyed from the same password</text>
</svg>
<figcaption>Figure 3.5. A PKCS#12 file from OpenSSL 3.0. The key and the certificates sit in separately protected bags, and the whole is authenticated by an HMAC keyed from the password. Older files use the same nesting with weaker algorithms.</figcaption>
</figure>

The SafeBag types are `keyBag` (a plain PKCS#8 key), `pkcs8ShroudedKeyBag`
(an encrypted one), `certBag`, `crlBag`, `secretBag` and `safeContentsBag`.
Two bag attributes tie things together: a `friendlyName` gives the alias
tools show, and a `localKeyID` pairs a key with its certificate. The
`MacData` at the end is the one integrity check on the whole file, and it
contains a DigestInfo, the very structure §3.10 is about.

What protects the bags depends on who wrote the file and when. The same
commands on OpenSSL 3.0.13 printed, for a default file and for one written
with `-legacy`:

```
$ openssl pkcs12 -info -nokeys -in demo.p12 | grep -E 'MAC:|Enc|Keybag'
MAC: sha256, Iteration 2048
PKCS7 Encrypted data: PBES2, PBKDF2, AES-256-CBC, Iteration 2048, PRF hmacWithSHA256
Shrouded Keybag: PBES2, PBKDF2, AES-256-CBC, Iteration 2048, PRF hmacWithSHA256
$ openssl pkcs12 -info -nokeys -legacy -in legacy.p12 | grep -E 'MAC:|Enc|Keybag'
MAC: sha1, Iteration 2048
PKCS7 Encrypted data: pbeWithSHA1And40BitRC2-CBC, Iteration 2048
Shrouded Keybag: pbeWithSHA1And3-KeyTripleDES-CBC, Iteration 2048
```

The legacy file is what OpenSSL 1.x wrote by default: the certificates under
40-bit [RC2](../../04-symmetric-ciphers/Retired.md), the export-grade cipher
of the 1990s, and the key under triple DES, with keys from PKCS#12's own
key-derivation function (RFC 7292 Appendix B) over SHA-1. That KDF takes the
password as a BMPString, two bytes per character with two zero bytes at the
end, and a one-byte "ID" saying whether it is making a key (1), an IV (2) or a
MAC key (3). OpenSSL 3.0 (September 2021) moved the defaults to PBES2 with
PBKDF2 and AES-256-CBC and needs `-legacy` even to *read* RC2-40 files; Java's
`keytool` moved in JDK 16 (March 2021) and 11.0.12; Windows' PowerShell
`Export-PfxCertificate` still defaults to triple DES with SHA-1. The 40-bit
RC2 layer protects only the certificates, which are public anyway; the
password is still the real secret. With 2,048 iterations (10,000 in keytool's
PKCS#12) it is cheap to guess, and §3.8 measures how cheap.

**Since 2024.** RFC 9579 (2024) let the PKCS#12 MAC use PBMAC1, an HMAC
keyed by PBKDF2 (RFC 8018 §7.1) instead of the old KDF, and RFC 9879 (2025)
replaced it, chiefly to pass the password as UTF-8. OpenSSL writes it with
`pkcs12 -pbmac1_pbkdf2` from 3.4 (October 2024). Java reads and writes it from
JDK 26 (March 2026) and 25.0.5, opt-in.

!!! note "Life story: PKCS#12"
    **Born:** 1997 as Microsoft's PFX; PKCS#12 v1.0 from RSA
    Laboratories in 1999; v1.1 as RFC 7292 (2014) · **Purpose:** to move a
    private key and its certificates between programs and machines in one
    password-protected file · **Helped:** every browser's and operating
    system's certificate import and export, S/MIME users, Java (its default
    key store since JDK 9), client certificates on phones · **Status:**
    current; old files use 40-bit RC2 and triple DES under SHA-1, new ones
    PBES2 and AES, and PBMAC1 (RFC 9579, 2024) modernizes the MAC

What to do:

- Write PKCS#12 with PBES2, AES-256 and a high iteration count
  (`openssl pkcs12 -export -iter 600000` on OpenSSL 3.x sets both the
  encryption and the MAC iterations), and
  give it a long random password, sent separately from the file.
- If a partner can only read legacy files, make the legacy file for them,
  send it once, and delete it; do not keep your own keys in it.
- A `.p7b` is a chain, not a backup. A backup of a key is a `.p12` or a
  PKCS#8 file, and both are only as good as their password.

## 3.8 Java key stores, and telling files apart

*Level: intermediate.*

Java brought its own formats. **JKS**, the Java KeyStore, arrived with JDK 1.2
in 1998, and **JCEKS** a little later with the Java Cryptography Extension.
Both are Sun designs, specified only by the code in OpenJDK
(`JavaKeyStore.java` and `KeyProtector.java` in `sun.security.provider`, and
`JceKeyStore.java` in `com.sun.crypto.provider`). Neither uses ASN.1 for its
outer structure: a JKS file starts with the magic bytes `fe ed fe ed`, a
version (2) and an entry count, and JCEKS starts with `ce ce ce ce`. A file
dump shows it:

```
$ xxd demo.jks | head -1
00000000: feed feed 0000 0002 0000 0001 0000 0001  ................
```

JKS protects each private key with a home-made stream cipher: the keystream
is SHA-1 of the password and a 20-byte salt, then SHA-1 of the password and
the previous block, and so on, XORed with the PKCS#8 key; a SHA-1 of the
password and the plaintext key follows as a check. The certificates are stored
in the clear. At the end of the file is one more SHA-1, over the password
(two bytes per character), the ASCII words `Mighty Aphrodite` (the title of a 1995
Woody Allen film, fixed in the code) and the whole contents. JCEKS adds
secret keys, protected with `PBEWithMD5AndTripleDES`, another Sun design.

**Key store or trust store?** These are roles, not formats. A key store holds
your private keys, each with its chain (your certificate, then the CAs above
it), to prove who you are. A trust store holds only certificates you trust,
usually self-signed roots, to check other people. Java reads
`javax.net.ssl.keyStore` and `javax.net.ssl.trustStore` if they are set, else
`jssecacerts`, else `cacerts`, whose password is famously `changeit`;
`cacerts` is a password-less PKCS#12 file in OpenJDK since JDK 18, but Ubuntu
24.04 still ships it as JKS. OpenSSL's trust store is a PEM file or a
directory (`-CAfile`, `-CApath`).

JDK 9 (2017) made PKCS#12 the default key store type (JEP 229). Since then
`keytool` warns when it touches a JKS file, and converts one in place with
`keytool -importkeystore -srckeystore a.jks -destkeystore a.jks
-deststoretype pkcs12`, keeping the original as `a.jks.old`. JDK 26's
`keytool` says JKS and JCEKS "will be removed in a future release". The
[keytool card](../../tools/keytool.md) has the commands.

### Break it: one hash per guess

The integrity check at the end of a JKS file is also a perfect password
oracle: anyone holding the file can test a guess with one SHA-1 and no
interaction with anything. The code builds the tail of a store protected by a
four-digit PIN and searches for it, then measures what PBKDF2, as PKCS#12
files use it, costs per guess by comparison:

```python
# Break it: the integrity check at the end of every JKS file is one SHA-1 over
# the password (two bytes per character), the words "Mighty Aphrodite" and the
# file. Guessing the password costs one hash per guess.
import hashlib, time

def jks_tail(password, contents):
    pw = b"".join(ord(c).to_bytes(2, "big") for c in password)
    return hashlib.sha1(pw + b"Mighty Aphrodite" + contents).digest()

contents = bytes.fromhex("feedfeed0000000200000001") + bytes(900)  # a stand-in body
tail = jks_tail("4711", contents)          # a store protected by a four-digit PIN

start, tries = time.perf_counter(), 0
for guess in (f"{k:04d}" for k in range(10000)):
    tries += 1
    if jks_tail(guess, contents) == tail:
        break
spent = time.perf_counter() - start
print(f"JKS: found {guess!r} after {tries:,} guesses")

# Fix it: a PKCS#12 file today derives its keys with PBKDF2. Measure one guess at
# OpenSSL's default of 2,048 iterations and at OWASP's 600,000.
for iterations in (2048, 600000):
    t = time.perf_counter()
    hashlib.pbkdf2_hmac("sha256", b"4711", b"8-bytes!", iterations)
    each = time.perf_counter() - t
    print(f"PBKDF2-SHA256 x {iterations:>7,}: {each / (spent / tries):>9,.0f} times "
          f"the cost of a JKS guess")
```

One run printed (the ratios depend on the machine and will differ a little
from run to run):

```
JKS: found '4711' after 4,712 guesses
PBKDF2-SHA256 x   2,048:       223 times the cost of a JKS guess
PBKDF2-SHA256 x 600,000:    54,332 times the cost of a JKS guess
```

The search takes a few milliseconds. A real JKS password is longer than four
digits, but the comparison holds at any length: every guess against JKS costs
one SHA-1 over the file, so a GPU can try billions of passwords per second
against a stolen store, while each guess against a PKCS#12 file with 600,000
PBKDF2 iterations costs more than fifty thousand times as much. That factor
buys about sixteen bits of password strength ($2^{15.7} \approx 54{,}000$),
the same as three or four more random lowercase letters. It does not rescue a weak password;
it makes a merely decent one survive. The rule from
Chapter 13 applies here too: the only
protection that really holds is a long random password.

**Fix it.** Convert JKS and JCEKS stores to PKCS#12 with `keytool
-importkeystore`, set a high iteration count, give each store a random
password from a secret manager rather than `changeit`, and treat a key store
file as the private key it contains: a copy of it on a build server is a copy
of the key.

!!! note "Life story: JKS, the Java KeyStore"
    **Born:** 1998, JDK 1.2, Sun Microsystems · **Purpose:** to keep Java
    programs' private keys and trusted certificates in one password-protected
    file · **Helped:** two decades of Java servers, Android's early signing
    keys and Tomcat's TLS setup · **Retired:** JDK 9 (2017) made PKCS#12 the
    default; `keytool` warns on JKS, and JDK 26 announces its removal ·
    **Replaced by:** PKCS#12 with PBES2

### Telling files apart

The file extension proves nothing. RFC 5280 §4.2.2.1 says as much about a
file name in a URL (it is only a hint), and the same holds on disk. Here is
what the common extensions usually hold:

| Extension | Usually holds | Encoding |
|---|---|---|
| `.pem` | anything with a PEM label: certificates, chains, keys | PEM |
| `.crt` | a certificate or a chain | PEM, as RFC 7468 §5.3 asks; not always |
| `.cer` | one certificate | DER per RFC 2585 and Windows' `Export-Certificate`; PEM from many tools |
| `.der` | one certificate, sometimes a key | DER |
| `.key` | a private key: PKCS#8, PKCS#1 or SEC1, maybe encrypted | usually PEM |
| `.csr` | a PKCS#10 certificate request | usually PEM |
| `.p7b`, `.p7c` | a chain as certs-only PKCS#7, never a key | DER or PEM |
| `.p12`, `.pfx` | PKCS#12: a private key, its certificate and chain | DER (sometimes BER) |
| `.jks` | a Java KeyStore | JKS, or PKCS#12 under the old name |
| `.keystore` | whatever keytool wrote; `~/.keystore` is its default file | PKCS#12 since JDK 9, JKS before |

The first bytes do prove something. `-----BEGIN` is PEM, and its label says
what is inside; `30` is DER, and the next few records say which structure;
`fe ed fe ed` is JKS and `ce ce ce ce` JCEKS. The sniffer below looks no
further than the first four records:

```python
# What is in this file? Trust the first bytes, never the extension.
import base64, re

def peek(der):                       # tags and small values of the first few TLVs
    out, i = [], 0
    while i < len(der) and len(out) < 4:
        tag, n = der[i], der[i + 1]
        i += 2
        if n & 0x80:
            k = n & 0x7F
            n, i = int.from_bytes(der[i:i + k], "big"), i + k
        out.append((tag, der[i:i + n] if tag in (2, 6) else b""))
        if not tag & 0x20:           # step over primitives, into constructed values
            i += n
    return out

def sniff(data):
    if data[:4] == b"\xfe\xed\xfe\xed": return "JKS key store"
    if data[:4] == b"\xce\xce\xce\xce": return "JCEKS key store"
    if data.startswith(b"PuTTY-User-Key-File-"): return "PuTTY private key"
    m = re.match(rb"-----BEGIN ([A-Z0-9 ]+)-----\r?\n(.*?)-----END \1-----", data, re.S)
    if m:
        label = m.group(1).decode()
        if label == "OPENSSH PRIVATE KEY": return "PEM: OpenSSH key (not DER inside)"
        body = re.sub(rb"^[A-Za-z-]+: .*\r?\n", b"", m.group(2), flags=re.M)  # old headers
        return f"PEM '{label}' around: " + sniff(base64.b64decode(b"".join(body.split())))
    if data[:1] != b"\x30": return "unknown"
    t = peek(data)
    if t[1][0] == 0x30 and t[2][0] == 0xA0: return "DER X.509 certificate"
    if t[1] == (2, b"\x03"): return "DER PKCS#12 (PFX)"
    if t[1] == (2, b"\x00") and t[2][0] == 0x30: return "DER PKCS#8 private key"
    if t[1] == (2, b"\x00") and t[2][0] == 0x02: return "DER PKCS#1 RSA private key"
    if t[1] == (2, b"\x01") and t[2][0] == 0x04: return "DER SEC1 EC private key"
    if t[1][0] == 0x30 and t[2][0] == 0x06: return "DER SubjectPublicKeyInfo"
    if t[1][0] == 0x06: return "DER CMS / PKCS#7 ContentInfo"
    return "DER, unrecognized"

samples = {
    "ca.crt":  b"-----BEGIN CERTIFICATE-----\nMIICGzCCAaGgAwIBAgIQ\n-----END CERTIFICATE-----\n",
    "ed.key":  base64.b64decode("MC4CAQAwBQYDK2VwBCIEINTuctv5E1hK1bbY8fdp+K06/nwoy/HU++CXqI9EdVhC"),
    "toy.key": base64.b64decode("MB0CAQACAgyhAgERAgIKwQIBPQIBNQIBNQIBMQIBJg=="),
    "ed.pub":  base64.b64decode("MCowBQYDK2VwAyEAGb9ECWmEzf6FQbrBZ9w7lshQhqowtrbLDFw4rXAxZuE="),
    "a.cer":   bytes.fromhex("308203fc020103308203b206092a864886f70d010701"),
    "old.jks": bytes.fromhex("feedfeed00000002"),
    "id_ed25519": b"-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjE=\n-----END OPENSSH PRIVATE KEY-----\n",
}
for name, data in samples.items():
    print(f"{name:11} {sniff(data)}")
```

```
ca.crt      PEM 'CERTIFICATE' around: DER X.509 certificate
ed.key      DER PKCS#8 private key
toy.key     DER PKCS#1 RSA private key
ed.pub      DER SubjectPublicKeyInfo
a.cer       DER PKCS#12 (PFX)
old.jks     JKS key store
id_ed25519  PEM: OpenSSH key (not DER inside)
```

Every rule in `sniff` is a fact about the structures in §3.6 and §3.7: a
certificate is a SEQUENCE whose first child is a SEQUENCE whose first child
is the `[0]` version; PKCS#12 starts with INTEGER 3; PKCS#8 with INTEGER 0 and
then an AlgorithmIdentifier; PKCS#1 with INTEGER 0 and then the modulus; SEC1
with INTEGER 1 and then an OCTET STRING. Note the `a.cer`: a PKCS#12 file
under a certificate's name, exactly the kind of mislabeling the table warns
about. A sniffer like this is for routing a file to the right parser and for
error messages ("this is a private key, not a certificate"); it is not a
validator, and the strict parse that follows must still check everything.

What to do:

- Decide formats by content and expected label, never by extension.
- Reject a private key where a public key or certificate is expected, loudly:
  that file is in the wrong place.
- Inventory where JKS, JCEKS and legacy PKCS#12 files still live; they are
  usually on the oldest and least watched servers.

## 3.9 Without ASN.1: JWK and COSE keys

*Level: intermediate.*

The web and the Internet of Things chose other encodings for the same keys.
**JSON Web Key** (JWK, RFC 7517, May 2015), with its algorithms in JWA
(RFC 7518), writes a key as a JSON object: `kty` for the key type (`EC`,
`RSA`, `oct` for a symmetric key, `OKP` for Ed25519 and X25519 from RFC 8037),
then the parameters as base64url strings without padding: `crv`, `x`, `y`
for an elliptic-curve point, `n` and `e` for RSA, `d` for a private part.
JWKs are what OAuth and OpenID Connect servers publish at their `jwks_uri`
endpoints, what JWT headers point to, and what ACME clients send to Let's
Encrypt. **COSE** (CBOR Object Signing and Encryption, RFC 8152 in 2017,
replaced by RFC 9052 and RFC 9053 in 2022) does the same in CBOR (RFC 8949), a
binary JSON, with small integers for labels to save bytes: `1` is `kty`, and
for an `EC2` key (kty 2) `-1` is the curve, `-2` is $x$ and `-3` is $y$.
WebAuthn passkeys deliver their public keys as COSE keys (Protocols
[Chapter 13](../protocols/13-Passkeys-FIDO2-and-WebAuthn.md)).

The same P-384 key from ISRG Root X2, taken out of its SubjectPublicKeyInfo,
dressed both ways:

```python
# One public key, three dresses: the P-384 key of ISRG Root X2 (from its
# SubjectPublicKeyInfo, offset 260 in section 3.4) as a JWK and as a COSE_Key.
import base64, json

point = bytes.fromhex(
    "04cd9bd59f80830aec094af3164a3e5ccf77acde67050d1d07b6dc16fb5a8b14dbe27160"
    "c4ba459511898eea06dff72a161ca4b9c5c532e003e01e8218388bd745d80a6a6ee60077"
    "fb02517d22d80a6e9a5b77dff0fa41ec39dc75ca68070c1fea")
assert point[0] == 4 and len(point) == 97      # uncompressed: 04 || x || y
x, y = point[1:49], point[49:]

b64url = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
jwk = {"kty": "EC", "crv": "P-384", "x": b64url(x), "y": b64url(y)}
print(json.dumps(jwk, indent=1))

def cbor(v):                                   # just enough CBOR (RFC 8949)
    def head(major, n):
        if n < 24:
            return bytes([major << 5 | n])
        size = 1 if n < 256 else 2 if n < 65536 else 4
        return bytes([major << 5 | {1: 24, 2: 25, 4: 26}[size]]) + n.to_bytes(size, "big")
    if isinstance(v, int):
        return head(0, v) if v >= 0 else head(1, -1 - v)
    if isinstance(v, bytes):
        return head(2, len(v)) + v
    if isinstance(v, dict):
        return head(5, len(v)) + b"".join(cbor(k) + cbor(w) for k, w in v.items())
    raise TypeError(v)

# COSE labels (RFC 9052, 9053): 1 kty (2 = EC2), -1 crv (2 = P-384), -2 x, -3 y
cose = cbor({1: 2, -1: 2, -2: x, -3: y})
print("COSE_Key:", len(cose), "bytes:", cose[:8].hex(" "), "...")
print("SPKI DER: 118 + 2 bytes; JWK JSON:", len(json.dumps(jwk, separators=(",", ":"))), "bytes")

# The signature on the certificate, DER (as X.509 and WebAuthn's ES256 use it)
# and raw r || s (as JWS and COSE use it).
der_sig = bytes.fromhex(
    "306502307b794e465084c24487461b4570ff5899def4fda4d255a6202d74d634bc41a350"
    "5f012756b4be277506af122e75988dfc0231008bf5776cd4c865aae00b2cee149d2737a4"
    "f953a551e42983d7f890315b429f0af5feae0068e78c490fb66f5b5b15f2e7")

def der_to_raw(sig, size):
    assert sig[0] == 0x30 and sig[1] == len(sig) - 2      # short lengths only
    out, i = b"", 2
    for _ in range(2):
        assert sig[i] == 0x02
        n = sig[i + 1]
        v = sig[i + 2:i + 2 + n]
        if (len(v) > 1 and v[0] == 0 and v[1] < 0x80) or v[0] & 0x80:
            raise ValueError("not minimal DER, or negative")
        out += int.from_bytes(v, "big").to_bytes(size, "big")
        i += 2 + n
    if i != len(sig):
        raise ValueError("trailing bytes")
    return out

def raw_to_der(raw):
    half = len(raw) // 2
    def integer(b):
        b = b.lstrip(b"\0") or b"\0"
        if b[0] & 0x80:
            b = b"\0" + b
        return bytes([2, len(b)]) + b
    body = integer(raw[:half]) + integer(raw[half:])
    return bytes([0x30, len(body)]) + body

raw = der_to_raw(der_sig, 48)
print("DER signature:", len(der_sig), "bytes; raw r || s:", len(raw), "bytes")
print("round trip exact:", raw_to_der(raw) == der_sig)
```

```
{
 "kty": "EC",
 "crv": "P-384",
 "x": "zZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW-1qLFNvicWDEukWVEYmO6gbf9yoW",
 "y": "HKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9ItgKbppbd9_w-kHsOdx1ymgHDB_q"
}
COSE_Key: 107 bytes: a4 01 02 20 02 21 58 30 ...
SPKI DER: 118 + 2 bytes; JWK JSON: 168 bytes
DER signature: 103 bytes; raw r || s: 96 bytes
round trip exact: True
```

The COSE key starts `a4` (a CBOR map of four pairs), `01 02` (kty: EC2),
`20 02` (crv, label $-1$, written as major type 1 with value 0: P-384), and
`21 58 30` ($x$, label $-2$, a byte string whose length 48 follows in one
byte). JWK and COSE carry no OIDs and no nesting, and the curve is a short
name or a number from a registry. That makes them easier to parse and
harder to confuse, but not immune: a JWK parser must still check that `x` and
`y` have exactly the length the curve demands and that the point is on the
curve, and must never trust a key's `alg` field over the algorithm the
application expects (Protocols
[Chapter 14](../protocols/14-OAuth-OpenID-Connect-and-JWT.md) tells what
happened when JWT libraries did).

**Two signature formats.** The second half of the code converts the
certificate's signature between the two forms you will meet. X.509, CMS,
TLS and WebAuthn's ES256 signatures use DER's `SEQUENCE { r, s }`, of
variable length (here 103 bytes, because $s$ needed a `00`). JWS (RFC 7515)
and COSE use the raw concatenation $r \Vert s$, each padded to the size of the
group order: always 96 bytes for P-384, 64 for P-256. Converting between them
is a classic place for bugs: a converter that strips leading zeros it should
keep, or pads to the wrong width, produces signatures that verify half the
time. The converter above checks DER minimality, rejects negative values and
trailing bytes, and round-trips exactly.

What to do:

- When you accept JWKs, check `kty`, `crv` and the byte length of each
  coordinate, and validate the point, before using the key.
- Keep one tested converter for DER and raw signatures, and test it with $r$
  and $s$ whose top byte is zero and whose top bit is set.
- Compute key identifiers from canonical forms (the RFC 7638 thumbprint for
  JWK, which Protocols [§2.5](../protocols/02-Certificates-and-PKI.md#25-proving-you-own-a-name-domain-validation-and-acme)
  codes for ACME, or a hash of the DER SubjectPublicKeyInfo), never from the
  text as it arrived.

## 3.10 The signature that a parser forged

*Level: intermediate.*

An RSA signature under PKCS#1 v1.5 (book 1
[§13.8](../../book/13-RSA.md#138-signatures)) is $s = \mathrm{EM}^d \bmod n$,
where the encoded message EM is a $k$-byte block fully determined by the
message:

$$
\mathrm{EM} = \mathtt{00}\ \mathtt{01}\ \mathtt{FF} \cdots \mathtt{FF}\ \mathtt{00}\ \Vert\ \mathrm{DigestInfo}(H(m)).
$$

The DigestInfo is a little DER structure, `SEQUENCE { AlgorithmIdentifier,
OCTET STRING hash }`. For SHA-256 its first 19 bytes are always the same,
`30 31 30 0d 06 09 60 86 48 01 65 03 04 02 01 05 00 04 20` (RFC 8017 §9.2
lists them), followed by the 32-byte hash. A verifier computes
$s^e \bmod n$ and must decide whether the block it gets back is the right one.
There are two ways to do that. It can **parse** the block: skip `00 01`, skip
the `FF` bytes, expect `00`, read the DigestInfo as DER, pull out the hash,
compare. Or it can **encode and compare**: compute $H(m)$ itself, build the
whole expected block from it, and compare the two blocks byte for byte. RFC
8017 §8.2.2 specifies the second. In 2006 most libraries did the first.

### 2006: a parser that stopped reading

Bleichenbacher's observation at CRYPTO 2006 was that the parsing verifiers
read the DigestInfo, compared the hash, and never checked that the hash ended
at the end of the block. Anything after it was ignored. With $e = 3$ the
forger needs only a number whose cube *begins* with the right bytes: put
`00 01`, a few `FF`, `00`, the DigestInfo and the hash at the top, fill the
rest with whatever makes the arithmetic work, and take an integer cube root.
Cryptanalysis
[§13.10](../cryptanalysis/13-Attacks-on-RSA.md#1310-bleichenbachers-2006-signature-forgery)
does it against a real 3072-bit key, with Hal Finney's pencil-and-paper
formula. Here the subject is the reader that let it through, so the code
below skips the arithmetic and hands three verifiers the blocks themselves,
the values $s^3 \bmod n$ would produce.

OpenSSL fixed its verifier in 0.9.8c on 5 September 2006 (CVE-2006-4339);
Mozilla's NSS, GnuTLS and others followed within weeks. Several of the fixes
added the missing check ("the hash must end the block") and kept the parser.

### 2014: BERserk, the forgery inside the lengths

On 24 September 2014, the same day as the Shellshock bug in Bash, Mozilla
announced that NSS, the library under Firefox and, on several platforms,
Chrome, could be fooled by forged RSA signatures again (CVE-2014-1568). It was
found independently by Antoine Delignat-Lavaud of Inria and by the Advanced
Threat Research team at Intel Security, who named it **BERserk** after the
encoding rules it abused. NSS did check that the hash ended the block. But it
parsed the DigestInfo's lengths as BER, and loosely: a long-form length could
have many length bytes, and the decoder shifted each one into a fixed-size
integer, so the high-order bytes fell off the top unnoticed. A forger could
write a length field of a hundred bytes, all garbage except the last few, and
the decoder would read a small, correct-looking length. The garbage now sat
in the *middle* of the block, which suits the cube-root arithmetic even
better (the fixed bytes at the top and bottom can be matched separately), and
the attack worked against 1024-bit and 2048-bit keys with $e = 3$. A few roots
in Firefox's store, and an unknown number of intermediate CAs below older
ones, still had such keys, so forged certificates for any site were possible. Firefox 32.0.3, NSS 3.16.5 and 3.17.1,
and Chrome 37.0.2062.124 carried the fix, and NSS 3.17.1 switched its
verification to encode-and-compare. A second fix in NSS 3.17.3 (December 2014,
CVE-2014-1569) made its DER decoder reject lengths not in minimal form.
Figure 3.6 shows the forged block and the two ways to read it.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="A BERserk forged block: 00 01, FF bytes, 00, a SEQUENCE tag with a 104-byte length field made of 100 garbage bytes and 00 00 00 31, the algorithm identifier, the OCTET STRING header and the hash. A 32-bit reader keeps only the last four length bytes and reads 49; a DER reader rejects a length field longer than four bytes" fill="currentColor" font-size="14">
<rect x="20" y="40" width="40" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="40" y="62" text-anchor="middle" font-size="12">00 01</text>
<rect x="60" y="40" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="110" y="62" text-anchor="middle" font-size="13">FF x 98</text>
<rect x="160" y="40" width="24" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="172" y="62" text-anchor="middle" font-size="11">00</text>
<rect x="184" y="40" width="46" height="34" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.3"/>
<text x="207" y="62" text-anchor="middle" font-size="12">30 E8</text>
<rect x="230" y="40" width="150" height="34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 3"/>
<text x="305" y="62" text-anchor="middle" font-size="13">garbage x 100</text>
<rect x="380" y="40" width="74" height="34" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.3"/>
<text x="417" y="62" text-anchor="middle" font-size="11">00 00 00 31</text>
<rect x="454" y="40" width="56" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="482" y="62" text-anchor="middle" font-size="12">AlgId</text>
<rect x="510" y="40" width="36" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="528" y="62" text-anchor="middle" font-size="11">04 20</text>
<rect x="546" y="40" width="74" height="34" fill="currentColor" opacity="0.35" stroke="currentColor" stroke-width="1.3"/>
<text x="583" y="62" text-anchor="middle" font-size="12">hash</text>
<text x="20" y="26" font-weight="bold">a forged 256-byte block (widths not to scale)</text>
<line x1="230" y1="84" x2="454" y2="84" stroke="currentColor"/>
<line x1="230" y1="80" x2="230" y2="88" stroke="currentColor"/>
<line x1="454" y1="80" x2="454" y2="88" stroke="currentColor"/>
<text x="342" y="104" text-anchor="middle" font-size="13">104 length bytes, announced by E8 = 80 + 104</text>
<text x="20" y="146" font-weight="bold">32-bit reader:</text>
<text x="140" y="146">shifts every length byte into one register; the garbage</text>
<text x="140" y="168">overflows out of the top, 00 00 00 31 is left: length 49. Accept.</text>
<text x="20" y="206" font-weight="bold">DER reader:</text>
<text x="140" y="206">E8 asks for 104 length bytes; DER needs at most 4, and the</text>
<text x="140" y="228">first must not be zero. Reject before reading any garbage.</text>
</svg>
<figcaption>Figure 3.6. The BERserk block. The hash ends the block exactly, so the 2006 fix does not help; the forger's free bytes are inside a length field that a loose reader never really reads.</figcaption>
</figure>

### Break it, then fix it: four verifiers

The code puts a genuine block, a 2006-style forgery and a BERserk-style
forgery in front of four verifiers: the 2006 parser, the parser with the
2006 fix but loose 32-bit lengths, a strict DER parser, and encode-and-compare.

```python
# Three verifiers read the block that s^e mod n gives back for an RSA PKCS#1 v1.5
# signature (SHA-256, 2048-bit key: 256 bytes). Only the last one is safe.
import hashlib

K = 256
INFO = bytes.fromhex("3031300d060960864801650304020105000420")   # DigestInfo header
msg = b"Pay Mallory 1,000,000 dollars"
h = hashlib.sha256(msg).digest()

def length32(buf, i):                 # NSS-style: shift bytes into a 32-bit register
    first = buf[i]
    if first < 0x80:
        return first, i + 1
    n = 0
    for b in buf[i + 1:i + 1 + (first & 0x7F)]:
        n = (n << 8 | b) & 0xFFFFFFFF  # high bytes fall off the top, unnoticed
    return n, i + 1 + (first & 0x7F)

def length_der(buf, i):               # the fix: 1 to 4 length bytes, fewest possible
    first = buf[i]
    if first < 0x80:
        return first, i + 1
    count = first & 0x7F
    assert 1 <= count <= 4 and buf[i + 1] != 0
    n = int.from_bytes(buf[i + 1:i + 1 + count], "big")
    assert n >= 0x80
    return n, i + 1 + count

def parse_digestinfo(buf, i, length=length32):  # SEQUENCE { SEQUENCE { OID, NULL }, OCTET STRING }
    assert buf[i] == 0x30
    n, i = length(buf, i + 1)
    end = i + n
    assert buf[i:i + 15] == INFO[2:17]                 # sha256 AlgorithmIdentifier
    i += 15
    assert buf[i] == 0x04
    m, i = length(buf, i + 1)
    assert length is length32 or i + m == end          # strict: children fill the parent
    return buf[i:i + m], i + m

def skip_padding(block):
    assert block[:2] == b"\x00\x01"
    i = 2
    while block[i] == 0xFF:
        i += 1
    assert block[i] == 0 and i >= 10
    return i + 1

def verify_2006(block):               # parses, takes the hash, never looks further
    digest, _ = parse_digestinfo(block, skip_padding(block))
    return digest == h

def verify_2014(block):               # checks that the hash ends the block, but trusts lengths
    digest, end = parse_digestinfo(block, skip_padding(block))
    return digest == h and end == K

def verify_der(block):                # strict DER lengths, and nothing after the hash
    digest, end = parse_digestinfo(block, skip_padding(block), length_der)
    return digest == h and end == K

def verify_strict(block):             # RFC 8017 section 8.2.2: encode, then compare
    t = INFO + h
    return block == b"\x00\x01" + b"\xff" * (K - 3 - len(t)) + b"\x00" + t

def safely(f, block):
    try:
        return f(block)
    except (AssertionError, IndexError):
        return False

t = INFO + h
genuine = b"\x00\x01" + b"\xff" * (K - 3 - len(t)) + b"\x00" + t
prefix = b"\x00\x01" + b"\xff" * 8 + b"\x00" + t
forged_2006 = prefix + bytes(range(K - len(prefix)))      # garbage after the hash
garbage = bytes(range(100, 200))                           # 100 bytes, any values
info_2014 = (b"\x30\xe8" + garbage + b"\x00\x00\x00\x31" + INFO[2:17] + b"\x04\x20")
forged_2014 = b"\x00\x01" + b"\xff" * (K - 3 - len(info_2014) - 32) + b"\x00" + info_2014 + h

for name, block in (("genuine", genuine), ("2006 forgery", forged_2006),
                    ("BERserk forgery", forged_2014)):
    print(f"{name:15}", *(f"{f.__name__[7:]}={safely(f, block)!s:5}"
                           for f in (verify_2006, verify_2014, verify_der, verify_strict)))
print("the BERserk length field:", info_2014[:3].hex(), "... (104 length bytes)")
```

```
genuine         2006=True  2014=True  der=True  strict=True 
2006 forgery    2006=True  2014=False der=False strict=False
BERserk forgery 2006=True  2014=True  der=False strict=False
the BERserk length field: 30e864 ... (104 length bytes)
```

Read the table by columns. The 2006 parser accepts everything that starts
right. The "fixed" parser of 2006 to 2014 rejects garbage at the end but not
garbage inside a length. The strict DER parser rejects both, because
`length_der` refuses more than four length bytes, refuses a leading zero
length byte and refuses a long form for a length under 128, and because
`parse_digestinfo` then insists that the OCTET STRING end exactly where its
SEQUENCE ends and the block ends. And encode-and-compare rejects both without
reading a single length: it never parses the block at all.

That last point is the real fix. A strict parser is correct only as long as
every one of its checks is present and right, and the history above shows
how often one was missing. A comparison against bytes you built yourself has
no checks to forget. Two more defenses close the door entirely: public
exponents of 65537 (a 65537th root leaves no room for garbage, so even a
broken verifier is hard to exploit), and RSA-PSS or Ed25519, whose verifiers
have no DigestInfo to parse.

!!! note "Life story: BERserk"
    **Born:** 24 September 2014, found independently by Antoine
    Delignat-Lavaud (Inria) and Intel Security's Advanced Threat Research;
    CVE-2014-1568 · **Purpose (of the research):** to show that the 2006
    $e = 3$ forgery still worked against NSS by hiding the forger's garbage
    in over-long ASN.1 length fields · **Helped:** Firefox 32.0.3, NSS 3.16.5
    and 3.17.1, Chrome 37.0.2062.124; NSS moved to encode-and-compare, and
    3.17.3 (CVE-2014-1569) made its DER lengths strict · **Status:** fixed;
    the same class was found again in 2019 by Sze Yiu Chau and colleagues in
    several IPsec and embedded TLS libraries

What to do:

- Verify PKCS#1 v1.5 signatures by encoding the expected block and comparing,
  as RFC 8017 §8.2.2 says. Never parse the decrypted block.
- Refuse RSA keys with $e = 3$ in anything new; use $e = 65537$, and prefer
  PSS or Ed25519 for new signatures.
- If you must parse DER, parse it with a strict reader (at most four length
  bytes, minimal lengths, children fill their parents exactly, nothing left
  over), and test the reader with the two forgeries above.

## 3.11 Names, loops and the rest of the parser zoo

*Level: intermediate.*

The DigestInfo is one small structure. A certificate has a hundred, and each
has had its bugs. Three are worth knowing in detail, because each is a
different kind of mistake.

### 2009: the zero byte in the name

At Black Hat in Las Vegas in July 2009, Moxie Marlinspike and Dan Kaminsky,
working separately, showed the **null-prefix attack**. A certificate's names
are ASN.1 strings with explicit lengths, so they may contain a zero byte. A
certificate authority that validated domain names by e-mailing the owner of
the registered domain at the end of the name would happily issue for
`www.paypal.com\0.thoughtcrime.org` to whoever controlled
`thoughtcrime.org`. Browsers and libraries written in C then handed the name
to functions that treat a zero byte as the end of a string, and read it as
`www.paypal.com`. Marlinspike went further with `*\0.thoughtcrime.org`, which
some clients matched against any site at all. NSS fixed it in Firefox 3.5
(CVE-2009-2408); Microsoft fixed CryptoAPI in October 2009 (MS09-056, which
also fixed the overflowing OID arcs of §3.5); and the bug kept recurring:
Python's own `ssl` module mishandled zero bytes in subjectAltName until
August 2013 (CVE-2013-4238).

```python
# The null-prefix certificate of 2009. The CA checks who owns the registered
# domain at the end of the name; the browser compares names as C strings.
cn = b"www.paypal.com\x00.thoughtcrime.org"   # the bytes in the certificate

def ca_checks(name):                  # the CA mails the owner of the last two labels
    return b".".join(name.split(b".")[-2:]).decode()

def c_string(name):                   # strcmp() and friends stop at the first zero
    return name.split(b"\x00")[0].decode()

def strict_name(name):                # the fix: reject, never truncate
    if any(c not in b"abcdefghijklmnopqrstuvwxyz0123456789-." for c in name.lower()):
        raise ValueError(f"illegal byte in DNS name: {name!r}")
    return name.decode()

print("CA validates control of:", ca_checks(cn))
print("old browser sees:       ", c_string(cn), "->", c_string(cn) == "www.paypal.com")
try:
    strict_name(cn)
except ValueError as e:
    print("strict client:          ", e)
```

```
CA validates control of: thoughtcrime.org
old browser sees:        www.paypal.com -> True
strict client:           illegal byte in DNS name: b'www.paypal.com\x00.thoughtcrime.org'
```

The fix is a rule about types as much as about bytes. A DNS name in a
certificate is an IA5String limited to letters, digits, hyphens and dots
(RFC 5280 §4.2.1.6), and a reader that checks the character set rejects the
name before any comparison happens. The general lesson is that a length-counted
string must never be passed to code that finds the end by looking for a
terminator.

!!! note "Life story: the null-prefix certificate"
    **Born:** July 2009, Black Hat USA, Moxie Marlinspike and Dan Kaminsky
    independently; Kaminsky, Meredith Patterson and Len Sassaman's paper "PKI
    Layer Cake" gathered it with other parser disagreements ·
    **Purpose:** to show that a CA and a browser could read the same name
    differently, so that a CA-validated certificate for the attacker's domain
    became one for anyone's · **Helped:** fixes in NSS (Firefox 3.5,
    CVE-2009-2408), Windows CryptoAPI (MS09-056), and later Python
    (CVE-2013-4238); stricter name checks by CAs · **Status:** fixed in
    mainstream libraries; the pattern, a counted string read as a
    terminated one, still turns up

### 2022: the certificate that never finishes

On 15 March 2022 OpenSSL published CVE-2022-0778, reported by Tavis Ormandy
of Google: a certificate that made OpenSSL loop forever. Elliptic-curve keys
in a certificate can be given with **explicit parameters**, the curve's prime,
coefficients and generator written out instead of named by an OID, and a
point can be **compressed**, sent as $x$ and one bit of $y$. To decompress,
OpenSSL computes a square root modulo the prime with `BN_mod_sqrt`, an
implementation of the Tonelli-Shanks algorithm (the mathematics is in
Mathematics [Chapter 5](../mathematics/05-Square-Roots-Mod-p.md)). The
algorithm assumes the modulus is prime. With explicit parameters, the
attacker chooses the "prime", and for some composite values the loop that
searches for the order of an element never ends. The parsing happens before
any signature is checked, so any TLS client, any server that accepts client
certificates, and any CA that parses requests could be hung by a single
message. Versions 1.0.2, 1.1.1 and 3.0 were affected; the fixes were 1.0.2zd,
1.1.1n and 3.0.2, and the severity was rated high (CVSS 7.5).

Here is the loop, translated from OpenSSL's C into Python, before and after
the fix:

```python
# CVE-2022-0778: OpenSSL's BN_mod_sqrt (Tonelli-Shanks), translated line for line,
# before and after the fix of 15 March 2022. A certificate with explicit curve
# parameters made OpenSSL call it with a modulus p chosen by the attacker.
def jacobi(a, n):
    a, r = a % n, 1
    while a:
        while a % 2 == 0:
            a //= 2
            if n % 8 in (3, 5):
                r = -r
        a, n = n, a
        if a % 4 == 3 and n % 4 == 3:
            r = -r
        a %= n
    return r if n == 1 else 0

def mod_sqrt(a, p, fixed, budget=1_000_000):
    q, e = p - 1, 0
    while q % 2 == 0:
        q, e = q // 2, e + 1
    z = 2
    while jacobi(z, p) != -1:          # a non-residue (for a prime p)
        z += 1
    y, x = pow(z, q, p), pow(a, (q - 1) // 2, p)
    b, x = a * x * x % p, a * x % p
    while b != 1:
        if fixed:                      # 2022: try at most e - 1 squarings, then give up
            t = b
            for i in range(1, e):
                t = t * t % p
                if t == 1:
                    break
            else:
                raise ValueError("not a square, or p is not prime")
        else:                          # before: the exit test i == e is jumped over
            i, t = 1, b * b % p        # once e has fallen to 1
            while t != 1:
                i += 1
                if i == e:
                    raise ValueError("not a square")
                t = t * t % p
                budget -= 1
                if budget == 0:
                    return f"still looping after 1,000,000 squarings (e = {e}, i = {i:,})"
        t = pow(y, 1 << (e - i - 1), p)
        y, x, b, e = t * t % p, x * t % p, b * t * t % p, i
    return x

print("prime p = 41, a = 10:", mod_sqrt(10, 41, False), f"(check: 16 * 16 % 41 = {16 * 16 % 41})")
for fixed in (False, True):
    try:
        print("fixed" if fixed else "old  ", "p = 33, a = 10:", mod_sqrt(10, 33, fixed))
    except ValueError as err:
        print("fixed" if fixed else "old  ", "p = 33, a = 10: error:", err)
```

```
prime p = 41, a = 10: 16 (check: 16 * 16 % 41 = 10)
old   p = 33, a = 10: still looping after 1,000,000 squarings (e = 1, i = 1,000,001)
fixed p = 33, a = 10: error: not a square, or p is not prime
```

The old loop had an exit test, `i == e`, meant to catch inputs that are not
squares. Each round of Tonelli-Shanks lowers $e$, and once $e$ has fallen to
1 the counter $i$ starts at 1 and is already 2 when it is first tested, so the
test can never succeed; with a prime modulus that never matters, because the
inner loop always finds $t = 1$ in time. With $p = 33$ it never does, and the
loop spins. The fix bounds the loop by $e$ and reports "not a square, or $p$
is not prime" when it runs out.

The deeper fix is not to accept explicit parameters at all. RFC 5480 already
said that certificates for the Internet must name their curve
(`specifiedCurve` and `implicitCurve` must not be used), and explicit
parameters had caused trouble before: in January 2020 Windows' CryptoAPI
accepted certificates whose explicit parameters swapped in the attacker's own
generator, so that the attacker knew a "private key" for a real CA's public
key (CurveBall, CVE-2020-0601, reported by the NSA; Cryptanalysis
[§14.10](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md#1410-untrusted-generators-and-other-signature-failures)
tells it). OpenSSL has rejected explicit curves in its strict verification
mode since 1.1.1h (2020), and BoringSSL accepts explicit parameters only when
they spell out one of its built-in named curves.

!!! note "Life story: CVE-2022-0778"
    **Born:** 15 March 2022, OpenSSL security advisory; reported by Tavis
    Ormandy (Google) · **Purpose (of the report):** to show that a
    certificate with explicit curve parameters and a compressed point could
    put `BN_mod_sqrt` into an endless loop before any signature was checked ·
    **Helped:** OpenSSL 1.0.2zd, 1.1.1n and 3.0.2, and patches across Linux
    distributions, appliances and language runtimes that bundle OpenSSL;
    renewed pressure to drop explicit EC parameters · **Status:** fixed; a
    reminder that a parser's denial of service is a security bug

### The rest of the zoo

A short list of the others, each a different missing check:

- **CVE-2014-8275** (OpenSSL 1.0.1k, January 2015): non-DER encodings accepted
  in signatures and certificates, so a fingerprint could change (§3.3).
- **Frankencerts** (2014): Chad Brubaker and colleagues fed TLS libraries
  certificates stitched together from parts of real ones and found
  disagreements in every library; Protocols
  [§2.10](../protocols/02-Certificates-and-PKI.md#210-in-the-real-world) has
  the details.
- **CVE-2016-2108** (OpenSSL, May 2016): two smaller bugs combined so that a
  negative zero in an ASN.1 INTEGER could corrupt memory in OpenSSL's ASN.1
  encoder.
- **CVE-2021-3712** (OpenSSL 1.1.1l, August 2021): code that assumed ASN.1
  strings were stored with a terminating zero byte read past the end of
  buffers when given ones that were not, the null-prefix lesson inverted.
- **CVE-2022-3602 and CVE-2022-3786** (OpenSSL 3.0.7, November 2022): buffer
  overflows in the decoding of internationalized e-mail addresses (punycode)
  while checking name constraints; announced in advance as critical, rated
  high on release.

The defenses are the ones this chapter has been building, gathered in one
place.

<div class="mars-steps" markdown>
1. **Compare instead of parsing** wherever the expected bytes are known:
   signature blocks, algorithm identifiers, OIDs, fixed key prefixes.
2. **Accept one encoding.** DER only where DER is specified: minimal lengths,
   at most four length bytes, no indefinite lengths, minimal integers,
   `00` or `ff` booleans, padding-free OID arcs.
3. **Account for every byte.** Each child ends inside its parent, the
   children fill the parent exactly, and nothing follows the outer value.
4. **Check types, not just lengths.** Strings have character sets, a
   DNSName has letters, digits, hyphens and dots, and no counted string goes
   into code that looks for a terminator.
5. **Refuse options you do not need**: explicit curve parameters, $e = 3$,
   unknown critical extensions, BER inside signed structures.
6. **Bound all work** done on attacker-chosen numbers and structures: loop
   counts, nesting depth, sizes.
7. **Fuzz and differentially test** the parser against others
   (Chapter 8, Chapter 17),
   or better, use one that is already fuzzed and verified.
</div>

## 3.12 Going deeper

*Level: expert.*

**Checking the root's signature yourself.** §3.4 said that a signature covers
the bytes of the tbsCertificate, sliced from the file. The code below does
the whole check for ISRG Root X2 with nothing but `hashlib` and integer
arithmetic: SHA-384 over bytes 4 to 424, then ECDSA verification on P-384,
with the curve constants of SP 800-186. It then changes one byte of the
issuer name and checks again. The arithmetic is plain affine point addition,
fine for checking public data and far too slow and leaky for secrets
(Chapter 6 does it properly).

```python
# Check ISRG Root X2's signature on itself: SHA-384 over the exact tbsCertificate
# bytes, then ECDSA verification on P-384 (curve constants from SP 800-186).
import base64, hashlib

PEM = """
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn"""
der = base64.b64decode("".join(PEM.split()))

P = 2**384 - 2**128 - 2**96 + 2**32 - 1
N = int("ffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf"
        "581a0db248b0a77aecec196accc52973", 16)
B = int("b3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875a"
        "c656398d8a2ed19d2a85c8edd3ec2aef", 16)
G = (int("aa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a38"
         "5502f25dbf55296c3a545e3872760ab7", 16),
     int("3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c0"
         "0a60b1ce1d7e819d7a431d7c90ea0e5f", 16))

def add(p1, p2):                          # affine point addition, a = -3
    if p1 is None: return p2
    if p2 is None: return p1
    (x1, y1), (x2, y2) = p1, p2
    if x1 == x2 and (y1 + y2) % P == 0:
        return None
    if p1 == p2:
        m = (3 * x1 * x1 - 3) * pow(2 * y1, -1, P)
    else:
        m = (y2 - y1) * pow(x2 - x1, -1, P)
    x3 = (m * m - x1 - x2) % P
    return x3, (m * (x1 - x3) - y1) % P

def mul(k, pt):                           # double and add; fine for public data
    out = None
    while k:
        if k & 1: out = add(out, pt)
        pt, k = add(pt, pt), k >> 1
    return out

tbs = der[4:425]                          # offsets 4 to 424: the SEQUENCE at depth 1
point = der[260:357]                      # 04 || x || y, inside the BIT STRING at 257
Q = (int.from_bytes(point[1:49], "big"), int.from_bytes(point[49:], "big"))
sig = der[440:]                           # SEQUENCE { r, s } inside the last BIT STRING
r = int.from_bytes(sig[4:52], "big")
s = int.from_bytes(sig[54:], "big")
assert sig[2:4] == b"\x02\x30" and sig[52:54] == b"\x02\x31"

assert (Q[1] ** 2 - Q[0] ** 3 + 3 * Q[0] - B) % P == 0, "key not on the curve"
h = int.from_bytes(hashlib.sha384(tbs).digest(), "big")
w = pow(s, -1, N)
X = add(mul(h * w % N, G), mul(r * w % N, Q))
print("SHA-384 of tbsCertificate:", hashlib.sha384(tbs).hexdigest()[:32] + "...")
print("signature valid:", X is not None and X[0] % N == r)
bad = tbs[:108] + b"J" + tbs[109:]        # the I of the issuer's "ISRG Root X2"
h2 = int.from_bytes(hashlib.sha384(bad).digest(), "big")
X2 = add(mul(h2 * w % N, G), mul(r * w % N, Q))
print("after changing one byte:", X2 is not None and X2[0] % N == r)
```

```
SHA-384 of tbsCertificate: 8b04cf52924a57d8897c7fb00ad31050...
signature valid: True
after changing one byte: False
```

The offsets 4, 425, 260 and 440 come from the reader's output in §3.4, and the
`assert` lines check the INTEGER headers of $r$ (48 bytes) and $s$ (49, with
its `00`) rather than trusting them. The curve check on $Q$ matters: a
verifier that skips it is open to invalid-curve tricks.

**Parsers you can trust more.** Writing DER parsers by hand in C produced the
bugs of §3.10 and §3.11, so the modern answer is to stop. BoringSSL replaced
OpenSSL's template-driven ASN.1 code with small hand-written readers built on
a bounded byte-string type (`CBS`) and a builder (`CBB`); Go's
`golang.org/x/crypto/cryptobyte` copies the design, and its comments quote
X.690's clauses for every check. Rust's `der` crate and the `x509-parser`
and `x509-cert` crates bring memory safety. Microsoft's EverParse generates
parsers from a format description together with a machine-checked proof that
they accept exactly the specified format, and is used for message parsing in
Windows' Hyper-V. Generated parsers from ASN.1 compilers (asn1c, the
compilers behind 4G and 5G stacks) are only as safe as the generator, and
several have had memory-safety bugs of their own.

**Language-theoretic security.** The PKI Layer Cake paper grew into a wider
argument, made by Len Sassaman, Meredith Patterson, Sergey Bratus and others
under the name LangSec: treat every input format as a formal language, make
it as simple as possible, and recognize the whole input with a parser that
accepts exactly that language before acting on any of it. DER, with its
single encodings and explicit lengths, is a good format by that test; BER,
with its options, and the habit of parsing a little and acting on the
result, are bad ones. "Parse fully, then act" is the rule behind steps 2 to 4
of the list in §3.11.

**What DER still leaves open.** DER gives each *value* one encoding, but a
schema can still offer two values that mean the same thing. A name can be a
PrintableString or a UTF8String with the same characters; an RSA
AlgorithmIdentifier's parameters may be NULL or absent depending on which
RFC a CA followed; a SET OF must be sorted, and readers rarely check. Path
validation compares names after a normalization step (RFC 5280 §7.1, with
the string-preparation rules of RFC 4518) precisely because two encodings of
"the same" name are both valid DER. When you identify a certificate or a key,
hash the DER bytes; when you compare names, use the library's comparison and
never your own.

**Post-quantum sizes.** ML-DSA-44 public keys are 1,312 bytes and signatures
2,420, so in a post-quantum certificate every key and signature field needs a
two-byte length (an ML-DSA-44 public key starts `03 82 05 21 00`), and DER
readers with hard-coded size limits break. RFC 9881 (2025) defines the X.509 encodings; Post-quantum
[Chapter 9](../post-quantum/09-ML-DSA.md) has the algorithm and Protocols
[§2.11](../protocols/02-Certificates-and-PKI.md#211-going-deeper) what the
sizes do to TLS.

## Check yourself

??? question "1. Decode `02 02 00 80` and `02 01 80`. Why do they differ?"

    The first is the INTEGER 128; the second is $-128$. INTEGERs are two's
    complement, so `80` alone has its top bit set and is negative; the
    positive number 128 needs a leading `00`.

??? question "2. What are the three fields of the tag byte `a3`, and where in a certificate do you find it?"

    `a3` is binary `10 1 00011`: context-specific class, constructed,
    number 3. It is `[3] EXPLICIT`, the extensions field of a version 3
    tbsCertificate.

??? question "3. Encode the OID 1.2.840.10045 by hand."

    $40 \cdot 1 + 2 = 42$ is `2a`; $840 = 6 \cdot 128 + 72$ is `86 48`;
    $10045 = 78 \cdot 128 + 61$ is `ce 3d`. With tag and length:
    `06 05 2a 86 48 ce 3d`.

??? question "4. A reader accepts `30 81 03 02 01 05` as SEQUENCE { 5 }. Is it a valid BER encoding? Is it valid DER? Why does it matter?"

    It is valid BER (a long-form length is allowed) but not DER, which
    requires lengths in the fewest bytes. It matters because the byte string
    has a different hash from the DER form, so a reader that accepts it lets
    the same value appear as two different signed or fingerprinted objects.

??? question "5. A file named `server.cer` starts with the bytes `30 82 03 fc 02 01 03`. What is it?"

    A DER SEQUENCE whose first child is INTEGER 3: a PKCS#12 (PFX) file, a
    private key and certificates under a password, not a certificate. The
    extension is wrong, and the file should be handled as a secret.

??? question "6. Why do JSON Web Signatures and COSE send ECDSA signatures as raw r || s instead of DER?"

    The raw form has a fixed length (64 bytes for P-256, 96 for P-384) and
    exactly one encoding, with no parsing needed; DER has variable length
    (usually 70 to 72 bytes for P-256) and needs a parser, which is a place
    for bugs and for malleability if the parser is lax.

??? question "7. Why was 'check that the hash ends at the end of the block' not enough to stop forged signatures in NSS in 2014?"

    BERserk put the forger's free bytes inside an over-long length field of
    the DigestInfo rather than after the hash. NSS's decoder kept only the
    low-order bytes of the length, so the garbage was ignored, the hash still
    ended the block, and the end check passed.

??? question "8. A JKS file and a PKCS#12 file with 600,000 PBKDF2 iterations both use the password `Tr0ub4dor&3`. Which is easier to crack, and by roughly how much?"

    The JKS file: each guess costs one SHA-1 over the file, against 600,000
    iterations of HMAC-SHA-256 (1.2 million SHA-256 compressions) for the
    PKCS#12 file. The measurement in §3.8 put the factor at about 50,000,
    some sixteen bits of extra work. Both fall to a dictionary attack if the
    password is in the dictionary.

??? question "9. In CVE-2022-0778, why did OpenSSL compute a square root at all while parsing a certificate, and what single policy would have avoided the bug?"

    The certificate's EC public key (or the base point of its explicit
    curve) was compressed, and decompressing a point means solving
    $y^2 = x^3 + ax + b$ for $y$, a square root modulo $p$. With explicit
    parameters the attacker chose a composite $p$. Accepting only named
    curves, as RFC 5480 requires for PKIX, means $p$ is always a known prime.

??? question "10. A CMS verifier hashes the signed attributes exactly as they appear in the SignerInfo and rejects every valid signature. What is wrong?"

    The signed attributes are stored as `[0] IMPLICIT SET OF`, with the tag
    `a0`, but RFC 5652 §5.4 says the signature covers their DER encoding
    with the SET tag `31`. The verifier must replace the first byte with
    `31` (and the content must already be DER, sorted) before hashing.

## What you learned

- DER writes every value as tag, length and value, with one encoding per
  value: minimal lengths, minimal integers, `ff` for true, sorted sets.
  Signatures cover bytes, so that uniqueness is the point.
- A strict DER reader of eighty lines can walk a real certificate; the
  checks that matter are minimal encodings, children ending inside their
  parents, and nothing left over.
- Key files are a few nested structures: PKCS#1 and SEC1 for one algorithm,
  PKCS#8 and SubjectPublicKeyInfo as generic wrappers, PEM as a Base64 armor
  with a label. PKCS#7 carries chains; PKCS#12 and Java key stores carry
  keys under passwords, and the password step is where old files are weak.
- JWK and COSE carry the same keys in JSON and CBOR, and ECDSA signatures
  come in two forms, DER and raw $r \Vert s$, that must be converted with
  care.
- The famous parser bugs were each one missing check: bytes after the hash
  (2006), bytes inside a length (2014), a zero inside a name (2009), a loop
  with no bound on attacker-chosen numbers (2022). Encoding and comparing
  beats even a strict parser.

**Next:** [Chapter 4](04-Randomness-in-Practice.md), where the bytes come from
in the first place: the operating system's random number generator and the
ways systems have run out of randomness.

## Further reading

- ITU-T X.680 (notation) and X.690 (BER, CER and DER), 1994, current
  editions 2021; X.691 (PER), X.693 (XER), X.696 (OER, 2014), X.697 (JER,
  2017).
- RFC 5280, the Internet X.509 profile (2008), §4.1 and Appendix A; RFC 5912,
  its modules in the 2002 syntax (2010).
- [Let's Encrypt, "A Warm Welcome to ASN.1 and DER"](https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/)
  (Jacob Hoffman-Andrews, 2020): the best gentle introduction.
- RFC 1421, Privacy-Enhanced Mail (1993); RFC 7468, textual encodings of
  PKIX, PKCS and CMS structures (2015).
- RFC 8017, PKCS #1 v2.2 (2016), §8.2.2, §9.2 and Appendix A; RFC 5915, EC
  private keys (2010); RFC 5208 and RFC 5958, PKCS #8 and asymmetric key
  packages (2008, 2010); RFC 8410, Ed25519 and X25519 in X.509 (2018);
  RFC 5480, elliptic-curve keys in X.509 (2009); RFC 8018, PKCS #5 v2.1
  (2017); RFC 7914, scrypt (2016).
- RFC 2315, PKCS #7 v1.5 (1998); RFC 5652, CMS (2009), §5.4; RFC 8551,
  S/MIME 4.0 (2019); RFC 7292, PKCS #12 v1.1 (2014), Appendix B; RFC 9579
  (2024) and RFC 9879 (2025), PBMAC1 for PKCS #12.
- OpenJDK source: `JavaKeyStore.java` and `KeyProtector.java`
  (`sun.security.provider`), `JceKeyStore.java`; JEP 229, PKCS12 key stores
  by default (2017).
- RFC 7517, JSON Web Key (2015); RFC 7518, JWA (2015); RFC 8037, OKP keys
  (2017); RFC 7638, JWK thumbprints (2015); RFC 9052 and RFC 9053, COSE
  (2022); RFC 8949, CBOR (2020).
- SP 800-186, recommendations for discrete-logarithm-based cryptography:
  elliptic curve domain parameters (2023), for the P-384 constants of §3.12.
- Hal Finney, "Bleichenbacher's RSA signature forgery based on implementation
  error", OpenPGP mailing list (August 2006); OpenSSL advisory for
  CVE-2006-4339 (5 September 2006).
- Dan Kaminsky, Meredith L. Patterson and Len Sassaman, "PKI Layer Cake: New
  Collision Attacks Against the Global X.509 Infrastructure" (Black Hat 2009;
  Financial Cryptography 2010).
- Moxie Marlinspike, "More Tricks for Defeating SSL in Practice" (Black Hat
  USA and DEF CON 17, July 2009).
- Antoine Delignat-Lavaud, and Intel Security Advanced Threat Research,
  "BERserk" (September 2014); Mozilla Foundation Security Advisory 2014-73
  (CVE-2014-1568); Mozilla bug 1064636; CVE-2014-1569.
- Sze Yiu Chau et al., "Analyzing Semantic Correctness with Symbolic
  Execution: A Case Study on PKCS#1 v1.5 Signature Verification" (NDSS 2019).
- OpenSSL security advisories: CVE-2014-8275 (8 January 2015), CVE-2016-2108
  (3 May 2016), CVE-2021-3712 (24 August 2021), CVE-2022-0778 (15 March 2022),
  CVE-2022-3602 and CVE-2022-3786 (1 November 2022).
- Microsoft security bulletin MS09-056 (October 2009) and the CVE-2020-0601
  advisory (14 January 2020); Python issue for CVE-2013-4238 (August 2013).
- [BIP 66, Strict DER signatures](https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki)
  (Pieter Wuille, 2015).
- Chad Brubaker, Suman Jana, Baishakhi Ray, Sarfraz Khurshid and Vitaly
  Shmatikov, "Using Frankencerts for Automated Adversarial Testing of
  Certificate Validation in SSL/TLS Implementations" (IEEE S&P 2014).
- Tahina Ramananandro et al., "EverParse: Verified Secure Zero-Copy Parsers
  for Authenticated Message Formats" (USENIX Security 2019).
- Len Sassaman, Meredith L. Patterson, Sergey Bratus and Anna Shubina, "The
  Halting Problems of Network Stack Insecurity" (;login:, 2011), the LangSec
  argument.
- Reference cards: [openssl](../../tools/openssl.md),
  [keytool](../../tools/keytool.md), [ssh-keygen](../../tools/ssh-keygen.md);
  certificate fields and validation in Protocols
  [Chapter 2](../protocols/02-Certificates-and-PKI.md).
