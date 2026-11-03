# 16. Certificates, PKI and Key Establishment

*Public-key cryptography solved the problem of sharing secret keys and replaced
it with a new one: making sure a public key belongs to who you think it does.
This chapter is about that problem. You will sign a toy certificate by hand,
build and validate a real certificate chain, see how certificate authorities
failed and how Certificate Transparency watches them now, and meet the other
answers: trust on first use, the web of trust, key transparency. Then the chapter
puts the pieces of Part III together: how two parties actually establish a key,
with authenticated Diffie-Hellman, with KEMs and HPKE, and with nothing but a
shared password.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a public key needs a binding to a name, and what a certificate is
    - the main fields of an X.509 certificate, and how a client validates a chain
    - how revocation works and why it mostly doesn't, and what short-lived certificates change
    - how DigiNotar and other CA failures happened, and how Certificate Transparency's Merkle trees catch misissuance
    - the other trust models: TOFU, web of trust, DANE, key transparency
    - how keys are established in practice: key transport, signed Diffie-Hellman, KEMs and HPKE, PAKEs

    **You need:** [Chapter 12](12-Diffie-Hellman.md) (Diffie-Hellman and the man in the middle),
    [Chapter 13](13-RSA.md) and [Chapter 15](15-Elliptic-Curves.md) (signatures), and
    [Chapter 9](09-Hash-Functions.md) (hashes, for Merkle trees).

    **Levels:** 16.1 to 16.3 are for beginners; 16.4 to 16.9 are intermediate; 16.11 is for experts.

## 16.1 The problem: whose key is this?

[Chapter 12](12-Diffie-Hellman.md) ended with a man in the middle. Mallory
replaced Alice's and Bob's public values with her own, and both ended up sharing
keys with her. The fix was for Bob to sign his value. But that only moves the
question: Alice now needs Bob's **signature-verification key**, and if Mallory
can replace that, she signs with her own key and nothing has changed.

Every public-key system has to answer this somehow. There are only a few ways to
do it:

1. **Meet, or use another channel.** Alice and Bob compare a short hash of the
   key (a **fingerprint**) in person or over the phone. Sound, but it does not
   scale to the web.
2. **Trust on first use.** Accept the key the first time, remember it, and
   complain loudly if it ever changes. This is SSH.
3. **Ask someone you already trust to vouch for it.** A **certificate** is a
   signed statement "this key belongs to this name". This is the web.
4. **Ask many people you partly trust.** PGP's web of trust.
5. **Make every key public and let owners check.** Certificate Transparency and
   key transparency.

In 1978 Loren Kohnfelder, an MIT undergraduate, proposed the third answer in his
bachelor's thesis, "Towards a Practical Public-Key Cryptosystem". Diffie and
Hellman had imagined a public directory, like a phone book, that everyone would
query. Kohnfelder pointed out that the directory would be a bottleneck and a
target, and that it was enough for the directory to *sign* each entry once. Each
signed entry, which he called a **certificate**, could then be passed around,
cached and checked offline by anyone holding the directory's public key.

The international standard came ten years later. The telecom standards body
CCITT (now the ITU-T) was designing X.500, a global directory of people and
organizations, and its authentication part, **X.509** (1988), defined
certificates binding public keys to X.500 names. The global directory was never
built, but X.509 certificates were adopted for the web when Netscape designed SSL
in 1994 and 1995, and they are still how every HTTPS connection proves who the
server is.

<figure class="mars-fig">
<svg viewBox="0 0 600 585" width="600" role="img" aria-label="Timeline of certificates, PKI and key establishment from 1978 to 2029">
<line x1="100" y1="10" x2="100" y2="577" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
<text x="86" y="22.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">1978</text>
<circle cx="100" cy="18" r="5" class="acc-fill"/>
<text x="114" y="22.5" font-size="13" text-anchor="start" fill="currentColor">Kohnfelder's thesis invents the certificate; Needham-</text>
<text x="114" y="41.5" font-size="13" text-anchor="start" fill="currentColor">Schroeder protocols</text>
<text x="86" y="69.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1979</text>
<circle cx="100" cy="65" r="4" fill="currentColor"/>
<text x="114" y="69.5" font-size="13" text-anchor="start" fill="currentColor">Merkle's hash tree</text>
<text x="86" y="97.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1988</text>
<circle cx="100" cy="93" r="4" fill="currentColor"/>
<text x="114" y="97.5" font-size="13" text-anchor="start" fill="currentColor">X.509 certificates, part of the X.500 directory</text>
<text x="86" y="125.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1991-92</text>
<circle cx="100" cy="121" r="4" fill="currentColor"/>
<text x="114" y="125.5" font-size="13" text-anchor="start" fill="currentColor">PGP and its web of trust; EKE, the first PAKE</text>
<text x="86" y="153.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">1995</text>
<circle cx="100" cy="149" r="5" class="acc-fill"/>
<text x="114" y="153.5" font-size="13" text-anchor="start" fill="currentColor">SSL brings X.509 to the web; SSH brings trust on first</text>
<text x="114" y="172.5" font-size="13" text-anchor="start" fill="currentColor">use; Lowe breaks Needham-Schroeder</text>
<text x="86" y="200.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1999</text>
<circle cx="100" cy="196" r="4" fill="currentColor"/>
<text x="114" y="200.5" font-size="13" text-anchor="start" fill="currentColor">OCSP for online revocation checks</text>
<text x="86" y="228.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2003</text>
<circle cx="100" cy="224" r="4" fill="currentColor"/>
<text x="114" y="228.5" font-size="13" text-anchor="start" fill="currentColor">SIGMA: sign-and-MAC authenticated Diffie-Hellman</text>
<text x="86" y="256.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2008</text>
<circle cx="100" cy="252" r="4" fill="currentColor"/>
<text x="114" y="256.5" font-size="13" text-anchor="start" fill="currentColor">Rogue CA made with an MD5 collision</text>
<text x="86" y="284.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">2011</text>
<circle cx="100" cy="280" r="5" class="acc-fill"/>
<text x="114" y="284.5" font-size="13" text-anchor="start" fill="currentColor">Comodo and DigiNotar breaches</text>
<text x="86" y="312.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2012</text>
<circle cx="100" cy="308" r="4" fill="currentColor"/>
<text x="114" y="312.5" font-size="13" text-anchor="start" fill="currentColor">CA/Browser Forum Baseline Requirements; DANE</text>
<text x="86" y="340.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2013</text>
<circle cx="100" cy="336" r="4" fill="currentColor"/>
<text x="114" y="340.5" font-size="13" text-anchor="start" fill="currentColor">Certificate Transparency, RFC 6962</text>
<text x="86" y="368.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2015</text>
<circle cx="100" cy="364" r="4" fill="currentColor"/>
<text x="114" y="368.5" font-size="13" text-anchor="start" fill="currentColor">Let's Encrypt issues free automated certificates</text>
<text x="86" y="396.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2017-18</text>
<circle cx="100" cy="392" r="4" fill="currentColor"/>
<text x="114" y="396.5" font-size="13" text-anchor="start" fill="currentColor">Symantec distrusted; Chrome requires CT; TLS 1.3</text>
<text x="86" y="424.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2019</text>
<circle cx="100" cy="420" r="4" fill="currentColor"/>
<text x="114" y="424.5" font-size="13" text-anchor="start" fill="currentColor">ACME standardized (RFC 8555)</text>
<text x="86" y="452.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2022</text>
<circle cx="100" cy="448" r="4" fill="currentColor"/>
<text x="114" y="452.5" font-size="13" text-anchor="start" fill="currentColor">HPKE (RFC 9180)</text>
<text x="86" y="480.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2023</text>
<circle cx="100" cy="476" r="4" fill="currentColor"/>
<text x="114" y="480.5" font-size="13" text-anchor="start" fill="currentColor">WhatsApp deploys key transparency</text>
<text x="86" y="508.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2025</text>
<circle cx="100" cy="504" r="4" fill="currentColor"/>
<text x="114" y="508.5" font-size="13" text-anchor="start" fill="currentColor">Let's Encrypt ends OCSP; ballot SC-081 shortens</text>
<text x="114" y="527.5" font-size="13" text-anchor="start" fill="currentColor">certificate lifetimes</text>
<text x="86" y="555.5" font-size="13" text-anchor="end" class="acc-fill" font-weight="bold">2029</text>
<circle cx="100" cy="551" r="5" class="acc-fill"/>
<text x="114" y="555.5" font-size="13" text-anchor="start" fill="currentColor">Public TLS certificates last at most 47 days</text>
</svg>
<figcaption>Figure 16.1. Fifty years of answering 'whose key is this?'. Highlighted: the invention, the arrival on the web, the breach that changed CA oversight, and today's short-lived certificates.</figcaption>
</figure>

!!! note "Life story: the X.509 certificate"
    **Born:** 1978 as an idea (Loren Kohnfelder's thesis); 1988 as a standard (ITU-T X.509) · **Purpose:** bind a
    public key to a name with a signature anyone can check offline · **Helped:** made the web's padlock possible
    from SSL (1995) on, plus code signing, S/MIME and smart-card logins · **Status:** current; version 3 (1996)
    with extensions is what everyone uses, ever shorter-lived

## 16.2 A certificate by hand

A certificate is a signature over three things: a **name**, a **public key**, and
**conditions** (dates, allowed uses). Use the toy RSA key of
[Chapter 13](13-RSA.md) as a certificate authority (CA): public $(n, e) = (3233, 17)$,
private $d = 2753$. Alice's key is the toy key $(55, 3)$ from the exercises there.

The CA writes down what it is vouching for, the "to be signed" part:

```
CN=alice.example; key=(55, 3); valid until 2027-12-31
```

<div class="mars-steps" markdown>

1. The CA hashes the statement with SHA-256 and reduces it mod 3233 (a toy; real RSA pads the full hash). The result is $h = 488$.
2. The CA signs: $s = 488^{2753} \bmod 3233 = 1281$. The certificate is the statement plus $s = 1281$.
3. Alice sends the certificate to Bob, who has the CA's public key $(3233, 17)$ built in.
4. Bob hashes the statement himself and gets 488. He checks the signature: $1281^{17} \bmod 3233 = 488$. They match.
5. Bob now believes $(55, 3)$ is Alice's key, because he trusts the CA to have checked before signing.
6. If Mallory swaps in her own key, $(77, 7)$, the statement hashes to 538 instead. She would need the CA's signature on 538, which needs $d$.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 660 270" width="660" role="img" aria-label="Toy certificate: the CA hashes the statement to 488 and signs it as 1281 with d; Bob hashes the statement himself and checks 1281 to the 17 equals 488">
<rect x="20" y="20" width="620" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="20" width="620" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="44.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">CN=alice.example; key=(55, 3); valid until 2027-12-31</text>
<text x="170" y="86" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">CA (signs once)</text>
<text x="490" y="86" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob (checks offline)</text>
<rect x="60" y="100" width="220" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="60" y="100" width="220" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="170" y="124.5" font-size="13" text-anchor="middle" fill="currentColor">SHA-256 mod 3233 → h = 488</text>
<rect x="60" y="160" width="220" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="60" y="160" width="220" height="40" rx="6" class="soft-acc acc" stroke-width="1.3" stroke-dasharray="5 4"/>
<text x="170" y="184.6" font-size="13" text-anchor="middle" fill="currentColor">s = 488^2753 mod 3233 = 1281</text>
<line x1="90" y1="60" x2="90" y2="90" stroke="currentColor" stroke-width="1.5"/>
<polygon points="90,98 86.4,90 93.6,90" fill="currentColor"/>
<line x1="170" y1="140" x2="170" y2="150" stroke="currentColor" stroke-width="1.5"/>
<polygon points="170,158 166.4,150 173.6,150" fill="currentColor"/>
<rect x="380" y="100" width="220" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="380" y="100" width="220" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="490" y="124.5" font-size="13" text-anchor="middle" fill="currentColor">hash it himself → 488</text>
<rect x="380" y="160" width="220" height="40" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="380" y="160" width="220" height="40" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="490" y="184.6" font-size="13" text-anchor="middle" fill="currentColor">1281^17 mod 3233 = 488</text>
<line x1="585" y1="60" x2="585" y2="90" stroke="currentColor" stroke-width="1.5"/>
<polygon points="585,98 581.4,90 588.6,90" fill="currentColor"/>
<line x1="280" y1="180" x2="370" y2="180" stroke="currentColor" stroke-width="1.5"/>
<polygon points="378,180 370,183.6 370,176.4" fill="currentColor"/>
<text x="329" y="172" font-size="12" text-anchor="middle" fill="currentColor">s = 1281</text>
<rect x="380" y="220" width="220" height="36" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="380" y="220" width="220" height="36" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="490" y="242.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">488 = 488: key accepted ✓</text>
<line x1="490" y1="200" x2="490" y2="210" stroke="currentColor" stroke-width="1.5"/>
<polygon points="490,218 486.4,210 493.6,210" fill="currentColor"/>
<text x="170" y="236" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">dashed: needs the CA's</text>
<text x="170" y="252" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">private d = 2753</text>
</svg>
<figcaption>Figure 16.2. The toy certificate of the steps above. The CA's private key is used once, when signing; anyone holding the CA's public key can check the result forever after.</figcaption>
</figure>

Three things to notice. Bob never contacted the CA: the check is offline. Bob's
trust in Alice's key is exactly as good as his trust in the CA's key and in the
CA's checking. And the certificate says nothing about whether Alice still holds
her private key, or still controls `alice.example`; it only says the CA believed
so when it signed.

## 16.3 X.509 certificates

A real certificate has the same three parts, encoded in ASN.1 DER
([formats appendix](../formats/ASN.1-DER.md)):

$$
\text{Certificate} = \big(\, \text{tbsCertificate},\ \text{signatureAlgorithm},\ \text{signatureValue} \,\big)
$$

and the CA signs the DER bytes of `tbsCertificate`. Its main fields:

<figure class="mars-fig">
<svg viewBox="0 0 600 360" width="600" role="img" aria-label="Structure of an X.509 certificate: the tbsCertificate holds version, serial, issuer, validity, subject, public key and extensions; then the signature algorithm and the signature value over the DER bytes of tbsCertificate">
<rect x="20" y="14" width="560" height="332" rx="8" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="34" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Certificate</text>
<rect x="40" y="46" width="520" height="214" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="66" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">tbsCertificate (the part that is signed)</text>
<rect x="56" y="78" width="236" height="30" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="56" y="78" width="236" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="174" y="97.5" font-size="13" text-anchor="middle" fill="currentColor">version 3</text>
<rect x="308" y="78" width="236" height="30" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="308" y="78" width="236" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="426" y="97.5" font-size="13" text-anchor="middle" fill="currentColor">serial number</text>
<rect x="56" y="116" width="236" height="30" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="56" y="116" width="236" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="174" y="135.6" font-size="13" text-anchor="middle" fill="currentColor">issuer</text>
<rect x="308" y="116" width="236" height="30" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="308" y="116" width="236" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="426" y="135.6" font-size="13" text-anchor="middle" fill="currentColor">validity</text>
<rect x="56" y="154" width="236" height="30" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="56" y="154" width="236" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="174" y="173.6" font-size="13" text-anchor="middle" fill="currentColor">subject</text>
<rect x="308" y="154" width="236" height="30" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="308" y="154" width="236" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="426" y="173.6" font-size="13" text-anchor="middle" fill="currentColor">subject public key info</text>
<rect x="56" y="194" width="488" height="54" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="56" y="194" width="488" height="54" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="300" y="217.1" font-size="13" text-anchor="middle" fill="currentColor">extensions: basic constraints, key usage, SAN,</text>
<text x="300" y="234" font-size="13" text-anchor="middle" fill="currentColor">key identifiers, CRL / OCSP pointers, SCTs</text>
<rect x="40" y="272" width="250" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="40" y="272" width="250" height="32" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="165" y="292.6" font-size="13" text-anchor="middle" fill="currentColor">signatureAlgorithm</text>
<rect x="310" y="272" width="250" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="310" y="272" width="250" height="32" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="435" y="292.6" font-size="13" text-anchor="middle" fill="currentColor">signatureValue</text>
<text x="300" y="330" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">the CA's signature covers the DER bytes of tbsCertificate</text>
</svg>
<figcaption>Figure 16.3. An X.509 v3 certificate. Everything a client relies on sits inside the signed part; the extensions (highlighted) carry most of the rules.</figcaption>
</figure>

| Field | What it holds |
|---|---|
| version | 3 for every modern certificate (v3 added extensions in 1996) |
| serial number | unique per CA; public CAs must include at least 64 random bits |
| issuer | the CA's name |
| validity | not before, not after |
| subject | the owner's name (for servers, mostly legacy) |
| subject public key info | the algorithm (RSA, EC with a named curve, Ed25519) and the key |
| **basic constraints** | is this a CA? if so, how many CAs may sit below it (`pathlen`) |
| **key usage**, **extended key usage** | what the key may do: sign certificates, sign handshakes, act as a TLS server, sign code |
| **subject alternative name** (SAN) | the DNS names or addresses the key is for; browsers match the host name here |
| authority and subject key identifiers | hashes of the issuer's and subject's keys, used to find the next certificate up |
| CRL distribution points, authority information access | where to check revocation and fetch the issuer's certificate |
| SCT list | proof that the certificate was logged in Certificate Transparency (§16.6) |

Full field-by-field details, with a real certificate decoded:
[X.509 reference](../formats/X.509.md).

### Chains

No browser holds every CA's key. It holds a few hundred **root** certificates in
its **trust store**, self-signed and kept offline by their owners. Roots sign
**intermediate** CA certificates, and intermediates sign the **leaf**
certificates that servers use. A server sends its leaf and intermediates; the
client supplies the root from its own store, since trust cannot come from the
wire.

Here is a three-level chain built with PyCA `cryptography` (needs
`pip install cryptography`), all on P-256:

```python
# pip install cryptography
import datetime
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

now = datetime.datetime.now(datetime.timezone.utc)
name = lambda cn: x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)])

def issue(subject, key, issuer, issuer_key, ca, days, san=None, pathlen=None):
    b = (x509.CertificateBuilder()
         .subject_name(name(subject)).issuer_name(name(issuer))
         .public_key(key.public_key()).serial_number(x509.random_serial_number())
         .not_valid_before(now - datetime.timedelta(hours=1))
         .not_valid_after(now + datetime.timedelta(days=days))
         .add_extension(x509.BasicConstraints(ca=ca, path_length=pathlen), critical=True)
         .add_extension(x509.KeyUsage(digital_signature=not ca, key_cert_sign=ca, crl_sign=ca,
                                      content_commitment=False, key_encipherment=False,
                                      data_encipherment=False, key_agreement=False,
                                      encipher_only=False, decipher_only=False), critical=True)
         .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
         .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(issuer_key.public_key()), critical=False))
    if san:
        b = (b.add_extension(x509.SubjectAlternativeName([x509.DNSName(san)]), critical=False)
              .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False))
    return b.sign(issuer_key, hashes.SHA256())

root_key, int_key, leaf_key = (ec.generate_private_key(ec.SECP256R1()) for _ in range(3))
root = issue("Demo Root", root_key, "Demo Root", root_key, True, 3650)
inter = issue("Demo Issuing CA", int_key, "Demo Root", root_key, True, 1825, pathlen=0)
leaf = issue("www.example.org", leaf_key, "Demo Issuing CA", int_key, False, 90, "www.example.org")
print(leaf.subject.rfc4514_string(), "issued by", leaf.issuer.rfc4514_string())
print(leaf.extensions.get_extension_for_class(x509.SubjectAlternativeName).value.get_values_for_type(x509.DNSName))
```

Output:

```
CN=www.example.org issued by CN=Demo Issuing CA
['www.example.org']
```

The root signs itself and has no path limit; the intermediate has `pathlen=0`,
so it may sign leaves but not further CAs; the leaf is `CA:FALSE`, may only sign
handshakes (`digital_signature`), and is for one name, for 90 days.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Certificate chain: the root in the client's trust store signs the intermediate, which signs the leaf; the server sends leaf and intermediate, the client supplies the root">
<rect x="20" y="20" width="250" height="260" rx="10" class="soft-acc acc" stroke-width="1.3" stroke-dasharray="5 4"/>
<text x="145" y="42" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">client's own trust store</text>
<rect x="45" y="110" width="200" height="60" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="45" y="110" width="200" height="60" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="145" y="136.1" font-size="13" text-anchor="middle" fill="currentColor">Demo Root</text>
<text x="145" y="153" font-size="13" text-anchor="middle" fill="currentColor">self-signed, offline</text>
<rect x="330" y="20" width="290" height="260" rx="10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<text x="475" y="42" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">sent by the server</text>
<rect x="375" y="70" width="200" height="60" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="375" y="70" width="200" height="60" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="475" y="96.1" font-size="13" text-anchor="middle" fill="currentColor">Demo Issuing CA</text>
<text x="475" y="113" font-size="13" text-anchor="middle" fill="currentColor">CA: true, pathlen 0</text>
<rect x="375" y="190" width="200" height="60" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="375" y="190" width="200" height="60" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="475" y="216.1" font-size="13" text-anchor="middle" fill="currentColor">www.example.org</text>
<text x="475" y="233" font-size="13" text-anchor="middle" fill="currentColor">CA: false, 90 days</text>
<line x1="245" y1="130" x2="365.2" y2="101.8" stroke="currentColor" stroke-width="1.5"/>
<polygon points="373,100 366,105.3 364.4,98.3" fill="currentColor"/>
<text x="310" y="100" font-size="12" text-anchor="middle" fill="currentColor">signs</text>
<line x1="475" y1="130" x2="475" y2="180" stroke="currentColor" stroke-width="1.5"/>
<polygon points="475,188 471.4,180 478.6,180" fill="currentColor"/>
<text x="485" y="165" font-size="12" text-anchor="start" fill="currentColor">signs</text>
<line x1="375" y1="220" x2="254.2" y2="163.4" class="acc" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="247,160 255.8,160.1 252.7,166.7" class="acc-fill"/>
<text x="300" y="226" font-size="12" text-anchor="middle" class="acc-fill">validate</text>
<text x="300" y="242" font-size="12" text-anchor="middle" class="acc-fill">upward</text>
</svg>
<figcaption>Figure 16.4. The three-level chain built in the code. Trust flows down by signatures; a client validates upward and must end at a root it already holds.</figcaption>
</figure>

## 16.4 Validating a chain

*Level: intermediate.* A client that receives a chain must check, for every
link, from the leaf up (RFC 5280 §6):

1. the **signature**, with the public key of the certificate above it;
2. the **dates**;
3. that the issuer name matches the subject above it;
4. for each CA certificate, that `CA:TRUE` is set, `keyCertSign` is allowed, and
   the path length and any name constraints are respected;
5. that the chain ends at a root in its **own** trust store;
6. for the leaf: that the host name it dialed is in the SAN, that the extended
   key usage allows a TLS server, and that it is not revoked;
7. that no critical extension it doesn't understand is present.

Each check is there because skipping it was once exploited. In 2002 Moxie
Marlinspike showed that Internet Explorer did not check basic constraints, so any
leaf certificate could act as a CA and sign certificates for any site. In 2009 he
and Dan Kaminsky showed that some clients read a name like
`www.paypal.com\0.thoughtcrime.org` as `www.paypal.com`, while the CA had
validated the domain at the end. Continuing the code above, with the library's
verifier:

```python
from cryptography.x509.verification import PolicyBuilder, Store, VerificationError

store = Store([root])                                    # the trust anchor the client already has
verifier = PolicyBuilder().store(store).build_server_verifier(x509.DNSName("www.example.org"))
chain = verifier.verify(leaf, [inter])                   # the server sends leaf + intermediate
print([c.subject.rfc4514_string() for c in chain])

try:
    PolicyBuilder().store(store).build_server_verifier(x509.DNSName("bank.example")).verify(leaf, [inter])
except VerificationError as err:
    print("rejected:", str(err).split(" (")[0])

rogue_key = ec.generate_private_key(ec.SECP256R1())     # a self-made "Demo Issuing CA"
fake = issue("www.example.org", leaf_key, "Demo Issuing CA", rogue_key, False, 90, "www.example.org")
try:
    verifier.verify(fake, [inter])
except VerificationError as err:
    print("rejected:", str(err).split(" (")[0])
```

Output:

```
['CN=www.example.org', 'CN=Demo Issuing CA', 'CN=Demo Root']
rejected: validation failed: leaf certificate has no matching subjectAltName
rejected: validation failed: candidates exhausted: signature does not match
```

The second certificate copies every name in the real one; only the signature
gives it away.

### Revocation

A certificate can need cancelling before it expires: the private key leaks, or
the CA finds it was misissued. There are three mechanisms, none fully
satisfactory:

- **Certificate revocation lists (CRLs):** the CA publishes a signed list of
  revoked serial numbers. They grew to megabytes, and clients often skipped them.
- **OCSP** (RFC 6960): the client asks the CA "is serial $X$ still good?". That
  adds a round trip, tells the CA every site the user visits, and clients usually
  **soft-fail**, carrying on if the CA doesn't answer, which an attacker who can
  block traffic arranges easily. OCSP stapling, where the server attaches a recent
  signed answer, fixes the privacy and speed but was never universal. Let's
  Encrypt, the largest CA, stopped running OCSP in 2025.
- **Browser-pushed lists:** Chrome's CRLSets and Firefox's CRLite ship compressed
  revocation data to the browser in its updates.

The current answer is to make revocation matter less. Under the CA/Browser
Forum's ballot SC-081 (2025), the maximum lifetime of a public TLS certificate
falls from 398 days to 200 days in March 2026, 100 in March 2027 and 47 in March
2029. Automated issuance (ACME, below) makes that practical. A stolen key or a
misissued certificate soon expires, revoked or not.

<figure class="mars-fig">
<svg viewBox="0 0 600 224" width="600" role="img" aria-label="Bar chart of the maximum lifetime of public TLS certificates: 39 months from 2015, 825 days from 2018, 398 days from 2020, then 200, 100 and 47 days in 2026, 2027 and 2029">
<text x="92" y="35" font-size="13" text-anchor="end" fill="currentColor">from 2015</text>
<rect x="100" y="19" width="380" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="486" y="35" font-size="13" text-anchor="start" fill="currentColor">39 months</text>
<text x="92" y="69" font-size="13" text-anchor="end" fill="currentColor">from 2018</text>
<rect x="100" y="53" width="264.3" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="370.3" y="69" font-size="13" text-anchor="start" fill="currentColor">825 days</text>
<text x="92" y="103" font-size="13" text-anchor="end" fill="currentColor">from 2020</text>
<rect x="100" y="87" width="127.5" height="22" rx="3" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="233.5" y="103" font-size="13" text-anchor="start" fill="currentColor">398 days</text>
<text x="92" y="137" font-size="13" text-anchor="end" fill="currentColor">Mar 2026</text>
<rect x="100" y="121" width="64.1" height="22" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="170.1" y="137" font-size="13" text-anchor="start" fill="currentColor">200 days</text>
<text x="92" y="171" font-size="13" text-anchor="end" fill="currentColor">Mar 2027</text>
<rect x="100" y="155" width="32" height="22" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="138" y="171" font-size="13" text-anchor="start" fill="currentColor">100 days</text>
<text x="92" y="205" font-size="13" text-anchor="end" fill="currentColor">Mar 2029</text>
<rect x="100" y="189" width="15.1" height="22" rx="3" class="soft-acc acc" stroke-width="1.3"/>
<text x="121.1" y="205" font-size="13" text-anchor="start" fill="currentColor">47 days</text>
</svg>
<figcaption>Figure 16.5. Maximum lifetime of a publicly trusted TLS certificate under the CA/Browser Forum rules. Highlighted: the steps of ballot SC-081.</figcaption>
</figure>

!!! note "Life story: revocation (CRLs and OCSP)"
    **Born:** CRLs with X.509 in 1988; OCSP in 1999 (RFC 2560) · **Purpose:** cancel a certificate before it
    expires · **Helped:** a place to announce bad certificates, used heavily after Heartbleed in 2014 · **Weakened:**
    lists too big, online checks slow, leaky and soft-failing; Let's Encrypt ended OCSP in 2025 · **Replaced by:**
    browser-pushed lists (CRLSets, CRLite) and certificates too short-lived to need revoking

## 16.5 Certificate authorities, and how they failed

*Level: intermediate.* The web's trust model is a few hundred root CAs, chosen by
browser and operating-system vendors (Mozilla, Apple, Microsoft, Google), each of
which may issue a certificate for **any** name. The CA/Browser Forum's Baseline
Requirements (since 2012) say how a CA must check that an applicant controls a
domain, and today most domain validation is automated through **ACME**
(RFC 8555, 2019): the CA asks the applicant to put a token at a URL on the domain
(`http-01`) or in its DNS (`dns-01`). Let's Encrypt, a non-profit that began
issuing free ACME certificates in late 2015, became the largest CA within a few
years and is a large part of why most web traffic is now encrypted.

The weakness is plain: the system is only as strong as the **weakest** CA, since
any of them can sign for any name. It has failed many times:

- **VeriSign (2001).** VeriSign issued two code-signing certificates in the name
  "Microsoft Corporation" to someone who was not Microsoft. Microsoft had to ship
  an update to distrust them.
- **The MD5 rogue CA (2008).** Alex Sotirov, Marc Stevens, Jacob Appelbaum, Arjen
  Lenstra, David Molnar, Dag Arne Osvik and Benne de Weger used about 200
  PlayStation 3 consoles to compute a chosen-prefix MD5 collision
  ([Chapter 9](09-Hash-Functions.md)): an innocent website certificate, which the
  CA RapidSSL signed, and a CA certificate with the same MD5 hash. The signature
  on one was valid for the other, so they held a working intermediate CA. MD5 was
  removed from certificate signing.
- **Comodo (March 2011).** An attacker compromised a reseller's account and
  obtained nine certificates, for sites including `mail.google.com`,
  `login.live.com`, `login.yahoo.com` and `addons.mozilla.org`. They were revoked
  within days.
- **DigiNotar (2011).** The worst case so far. In June and July 2011 an attacker
  broke into DigiNotar, a Dutch CA whose roots browsers trusted and which also
  issued certificates for the Dutch government. More than 500 fraudulent
  certificates were issued, including one for `*.google.com`. It was used to
  intercept the Gmail connections of an estimated 300,000 users, almost all in
  Iran. It was caught because Chrome had Google's own keys built in (**pinned**),
  and an Iranian user's Chrome refused the fake certificate; he posted the error
  online on 28 August. Every browser removed DigiNotar's roots, the Dutch
  government took over its operations, and the company was declared bankrupt in
  September 2011.
- **Flame (2012).** Espionage malware found in the Middle East was signed with a
  forged Microsoft code-signing certificate, made with a new chosen-prefix MD5
  collision against a Microsoft licensing CA that still used MD5.
- **Symantec (2017 to 2018).** After a series of misissuance incidents at
  Symantec's CA business, which then included the old VeriSign roots, Google and
  Mozilla phased out trust in all of its certificates. A CA that was too big to
  fail turned out not to be.

<figure class="mars-fig">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="DigiNotar: an attacker with a fraudulent certificate for star dot google dot com intercepts Iranian users' Gmail connections; Chrome, which pinned Google's keys, rejects the certificate">
<rect x="20" y="90" width="130" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="90" width="130" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="85" y="119.5" font-size="13" text-anchor="middle" fill="currentColor">user in Iran</text>
<rect x="260" y="90" width="140" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="260" y="90" width="140" height="50" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="330" y="119.5" font-size="13" text-anchor="middle" fill="currentColor">interceptor</text>
<rect x="510" y="90" width="130" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="510" y="90" width="130" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="575" y="119.5" font-size="13" text-anchor="middle" fill="currentColor">Gmail</text>
<line x1="158" y1="115" x2="250" y2="115" stroke="currentColor" stroke-width="1.5"/>
<polygon points="258,115 250,118.6 250,111.4" fill="currentColor"/>
<polygon points="150,115 158,111.4 158,118.6" fill="currentColor"/>
<line x1="408" y1="115" x2="500" y2="115" stroke="currentColor" stroke-width="1.5"/>
<polygon points="508,115 500,118.6 500,111.4" fill="currentColor"/>
<polygon points="400,115 408,111.4 408,118.6" fill="currentColor"/>
<rect x="230" y="14" width="200" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="230" y="14" width="200" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<text x="330" y="35.1" font-size="13" text-anchor="middle" fill="currentColor">fake *.google.com,</text>
<text x="330" y="52" font-size="13" text-anchor="middle" fill="currentColor">signed by DigiNotar</text>
<line x1="330" y1="64" x2="330" y2="80" stroke="currentColor" stroke-width="1.5"/>
<polygon points="330,88 326.4,80 333.6,80" fill="currentColor"/>
<rect x="20" y="170" width="300" height="60" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="170" width="300" height="60" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="170" y="196.1" font-size="13" text-anchor="middle" fill="currentColor">most browsers: valid signature</text>
<text x="170" y="213" font-size="13" text-anchor="middle" fill="currentColor">from a trusted root → accepted</text>
<rect x="340" y="170" width="300" height="60" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="340" y="170" width="300" height="60" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="490" y="196.1" font-size="13" text-anchor="middle" fill="currentColor">Chrome: key not one of Google's</text>
<text x="490" y="213" font-size="13" text-anchor="middle" fill="currentColor">pinned keys → error, 28 Aug 2011</text>
</svg>
<figcaption>Figure 16.6. How DigiNotar's fake certificate was used and how it was caught. The signature was perfectly valid; only a pinned key revealed the lie.</figcaption>
</figure>

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="MD5 rogue CA: an innocent website certificate request and a rogue CA certificate are built to have the same MD5 hash, so the CA's signature on one is valid for the other">
<rect x="20" y="20" width="220" height="56" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="20" width="220" height="56" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="130" y="44.1" font-size="13" text-anchor="middle" fill="currentColor">innocent website</text>
<text x="130" y="61" font-size="13" text-anchor="middle" fill="currentColor">certificate (sent to CA)</text>
<rect x="20" y="120" width="220" height="56" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="120" width="220" height="56" rx="6" class="soft-acc acc" stroke-width="1.3" stroke-dasharray="5 4"/>
<text x="130" y="144.1" font-size="13" text-anchor="middle" fill="currentColor">rogue CA certificate</text>
<text x="130" y="161" font-size="13" text-anchor="middle" fill="currentColor">(kept secret)</text>
<line x1="240" y1="48" x2="311" y2="86.2" stroke="currentColor" stroke-width="1.5"/>
<polygon points="318,90 309.2,89.4 312.7,83" fill="currentColor"/>
<line x1="240" y1="148" x2="311" y2="109.8" stroke="currentColor" stroke-width="1.5"/>
<polygon points="318,106 312.7,113 309.2,106.6" fill="currentColor"/>
<rect x="320" y="72" width="130" height="52" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="320" y="72" width="130" height="52" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="385" y="93.8" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">same MD5</text>
<text x="385" y="112" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">hash</text>
<line x1="450" y1="98" x2="500" y2="98" stroke="currentColor" stroke-width="1.5"/>
<polygon points="508,98 500,101.6 500,94.4" fill="currentColor"/>
<text x="479" y="88" font-size="11" text-anchor="middle" fill="currentColor">RapidSSL</text>
<rect x="510" y="72" width="110" height="52" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="510" y="72" width="110" height="52" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="565" y="94.1" font-size="13" text-anchor="middle" fill="currentColor">one</text>
<text x="565" y="111" font-size="13" text-anchor="middle" fill="currentColor">signature</text>
<text x="320" y="200" font-size="13" text-anchor="middle" class="acc-fill">the signature copied onto the rogue certificate verifies: a working CA</text>
</svg>
<figcaption>Figure 16.7. The 2008 rogue CA. A chosen-prefix MD5 collision let one legitimate signature stand for two different certificates.</figcaption>
</figure>

!!! note "Life story: DigiNotar"
    **Born:** 1998, a Dutch certificate authority trusted by every browser and by the Dutch government · **Purpose:**
    issue website and government certificates · **Breached:** June to July 2011; more than 500 fraudulent
    certificates · **Retired:** distrusted by every browser and bankrupt in September 2011 · **Legacy:** the push
    for Certificate Transparency

The lessons: CAs need to be watched, not just trusted; pinning helps the few
sites that can do it; and someone needs to see every certificate that is issued.

## 16.6 Certificate Transparency

*Level: intermediate.* After DigiNotar, Ben Laurie, Adam Langley and Emilia
Käsper at Google proposed that every publicly trusted certificate be recorded in
public, append-only **logs**, which anyone can read. A CA submits each
certificate before issuing it; the log returns a **signed certificate
timestamp** (SCT), a promise to include it; and the CA embeds the SCTs in the
certificate. Browsers refuse certificates without them (Chrome since April 2018,
and Safari and Firefox enforce it too). Domain owners, and services such as crt.sh,
monitor the logs for certificates they did not ask for. A rogue certificate can
still be issued, but it cannot be used secretly. The protocol is RFC 6962 (2013).

<figure class="mars-fig">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="Certificate Transparency flow: the CA submits a precertificate to logs, gets SCTs, embeds them; the browser checks SCTs; monitors read the logs and alert domain owners">
<rect x="20" y="30" width="120" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="30" width="120" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="80" y="59.9" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">CA</text>
<rect x="270" y="30" width="130" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="270" y="30" width="130" height="50" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="335" y="51.1" font-size="13" text-anchor="middle" fill="currentColor">public logs</text>
<text x="335" y="68" font-size="13" text-anchor="middle" fill="currentColor">(Merkle trees)</text>
<line x1="140" y1="46" x2="260" y2="46" stroke="currentColor" stroke-width="1.5"/>
<polygon points="268,46 260,49.6 260,42.4" fill="currentColor"/>
<text x="204" y="38" font-size="12" text-anchor="middle" fill="currentColor">1. precertificate</text>
<line x1="268" y1="66" x2="148" y2="66" class="acc" stroke-width="1.5"/>
<polygon points="140,66 148,62.4 148,69.6" class="acc-fill"/>
<text x="204" y="84" font-size="12" text-anchor="middle" class="acc-fill">2. SCT (promise)</text>
<rect x="20" y="150" width="140" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="150" width="140" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="90" y="171.1" font-size="13" text-anchor="middle" fill="currentColor">certificate</text>
<text x="90" y="188" font-size="13" text-anchor="middle" fill="currentColor">+ SCTs</text>
<line x1="80" y1="80" x2="80" y2="140" stroke="currentColor" stroke-width="1.5"/>
<polygon points="80,148 76.4,140 83.6,140" fill="currentColor"/>
<text x="88" y="120" font-size="12" text-anchor="start" fill="currentColor">3. issue</text>
<rect x="260" y="150" width="150" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="260" y="150" width="150" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="335" y="171.1" font-size="13" text-anchor="middle" fill="currentColor">browser</text>
<text x="335" y="188" font-size="13" text-anchor="middle" fill="currentColor">requires SCTs</text>
<line x1="160" y1="175" x2="250" y2="175" stroke="currentColor" stroke-width="1.5"/>
<polygon points="258,175 250,178.6 250,171.4" fill="currentColor"/>
<text x="209" y="167" font-size="12" text-anchor="middle" fill="currentColor">4. TLS</text>
<rect x="500" y="30" width="140" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="500" y="30" width="140" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="570" y="51.1" font-size="13" text-anchor="middle" fill="currentColor">monitors</text>
<text x="570" y="68" font-size="13" text-anchor="middle" fill="currentColor">(crt.sh, owners)</text>
<line x1="400" y1="55" x2="490" y2="55" stroke="currentColor" stroke-width="1.5"/>
<polygon points="498,55 490,58.6 490,51.4" fill="currentColor"/>
<text x="449" y="47" font-size="12" text-anchor="middle" fill="currentColor">read all</text>
<rect x="500" y="150" width="140" height="50" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="500" y="150" width="140" height="50" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="570" y="171.1" font-size="13" text-anchor="middle" fill="currentColor">domain owner</text>
<text x="570" y="188" font-size="13" text-anchor="middle" fill="currentColor">alerted</text>
<line x1="570" y1="80" x2="570" y2="140" stroke="currentColor" stroke-width="1.5"/>
<polygon points="570,148 566.4,140 573.6,140" fill="currentColor"/>
<text x="330" y="236" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">a rogue certificate can still be issued, but not used in secret</text>
</svg>
<figcaption>Figure 16.8. Certificate Transparency's moving parts. Every certificate a browser accepts has been promised to public logs that anyone can watch.</figcaption>
</figure>

The logs must be **verifiably** append-only: a log that showed different contents
to different people, or quietly removed an entry, must be caught. CT uses a
**Merkle tree** (Ralph Merkle, 1979, the same Merkle as in
[Chapter 12](12-Diffie-Hellman.md)). Each certificate is a leaf; each internal
node is the hash of its two children; the root hash commits to everything. The
log signs the root and the tree size, a **signed tree head**.

- An **inclusion proof** shows a certificate is in the tree: the sibling hashes
  along the path from its leaf to the root, about $\log_2 n$ of them. For a log of
  a billion certificates, 30 hashes, 960 bytes.
- A **consistency proof** shows a newer tree contains the older one unchanged,
  also with about $\log_2 n$ hashes. Monitors and browsers compare tree heads to
  catch a log that forks its history.

```python
import hashlib

H = lambda b: hashlib.sha256(b).digest()
leaf = lambda d: H(b"\x00" + d)                  # RFC 6962: leaves and nodes are hashed
node = lambda l, r: H(b"\x01" + l + r)           # with different prefixes

def split(n):                                    # largest power of 2 below n
    k = 1
    while k * 2 < n: k *= 2
    return k

def mth(D):                                      # Merkle tree hash of a list of entries
    if len(D) == 1: return leaf(D[0])
    k = split(len(D))
    return node(mth(D[:k]), mth(D[k:]))

def path(m, D):                                  # inclusion proof for entry m
    if len(D) == 1: return []
    k = split(len(D))
    if m < k: return path(m, D[:k]) + [mth(D[k:])]
    return path(m - k, D[k:]) + [mth(D[:k])]

def root_from(m, n, h, proof):                   # what a browser does with the proof
    if n == 1: return h
    k = split(n)
    if m < k: return node(root_from(m, k, h, proof[:-1]), proof[-1])
    return node(proof[-1], root_from(m - k, n - k, h, proof[:-1]))

log = [f"certificate {i}".encode() for i in range(7)]
root = mth(log)                                  # the log signs this, with the size, as its tree head
proof = path(4, log)
print(len(proof), root_from(4, 7, leaf(log[4]), proof) == root)                    # 3 True
print(root_from(4, 7, leaf(b"certificate X"), proof) == root)                      # False

test = [bytes.fromhex(x) for x in ("", "00", "10", "2021", "3031", "40414243",
        "5051525354555657", "606162636465666768696a6b6c6d6e6f")]
print(mth(test).hex()[:16])                      # 5dc9da79a70659a9: the reference 8-leaf root
```

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Merkle tree of 7 certificates; the inclusion proof for entry 4 is the leaf 5 hash, the leaf 6 hash and the hash of entries 0 to 3, highlighted">
<line x1="84" y1="186" x2="40" y2="224" stroke="currentColor" stroke-width="1.2"/>
<line x1="84" y1="186" x2="128" y2="224" stroke="currentColor" stroke-width="1.2"/>
<line x1="260" y1="186" x2="216" y2="224" stroke="currentColor" stroke-width="1.2"/>
<line x1="260" y1="186" x2="304" y2="224" stroke="currentColor" stroke-width="1.2"/>
<line x1="436" y1="186" x2="392" y2="224" stroke="currentColor" stroke-width="1.2"/>
<line x1="436" y1="186" x2="480" y2="224" stroke="currentColor" stroke-width="1.2"/>
<line x1="172" y1="116" x2="84" y2="154" stroke="currentColor" stroke-width="1.2"/>
<line x1="172" y1="116" x2="260" y2="154" stroke="currentColor" stroke-width="1.2"/>
<line x1="502" y1="116" x2="436" y2="154" stroke="currentColor" stroke-width="1.2"/>
<line x1="502" y1="116" x2="568" y2="224" stroke="currentColor" stroke-width="1.2"/>
<line x1="337" y1="46" x2="172" y2="84" stroke="currentColor" stroke-width="1.2"/>
<line x1="337" y1="46" x2="502" y2="84" stroke="currentColor" stroke-width="1.2"/>
<rect x="8" y="224" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="8" y="224" width="64" height="32" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="40" y="244.2" font-size="12" text-anchor="middle" fill="currentColor">cert 0</text>
<rect x="96" y="224" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="96" y="224" width="64" height="32" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="128" y="244.2" font-size="12" text-anchor="middle" fill="currentColor">cert 1</text>
<rect x="184" y="224" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="184" y="224" width="64" height="32" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="216" y="244.2" font-size="12" text-anchor="middle" fill="currentColor">cert 2</text>
<rect x="272" y="224" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="272" y="224" width="64" height="32" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="304" y="244.2" font-size="12" text-anchor="middle" fill="currentColor">cert 3</text>
<rect x="360" y="224" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="360" y="224" width="64" height="32" rx="6" class="acc" fill="none" stroke-width="1.3"/>
<text x="392" y="244.2" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">cert 4</text>
<rect x="448" y="224" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="448" y="224" width="64" height="32" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="480" y="244.2" font-size="12" text-anchor="middle" fill="currentColor">cert 5</text>
<rect x="536" y="224" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="536" y="224" width="64" height="32" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="568" y="244.2" font-size="12" text-anchor="middle" fill="currentColor">cert 6</text>
<rect x="52" y="154" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="52" y="154" width="64" height="32" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="84" y="174.2" font-size="12" text-anchor="middle" fill="currentColor">h(0,1)</text>
<rect x="228" y="154" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="228" y="154" width="64" height="32" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="260" y="174.2" font-size="12" text-anchor="middle" fill="currentColor">h(2,3)</text>
<rect x="404" y="154" width="64" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="404" y="154" width="64" height="32" rx="6" class="acc" fill="none" stroke-width="1.3"/>
<text x="436" y="174.2" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">h(4,5)</text>
<rect x="135" y="84" width="74" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="135" y="84" width="74" height="32" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="172" y="104.2" font-size="12" text-anchor="middle" fill="currentColor">h(0..3)</text>
<rect x="465" y="84" width="74" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="465" y="84" width="74" height="32" rx="6" class="acc" fill="none" stroke-width="1.3"/>
<text x="502" y="104.2" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">h(4..6)</text>
<rect x="297" y="14" width="80" height="32" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="297" y="14" width="80" height="32" rx="6" class="acc" fill="none" stroke-width="1.3"/>
<text x="337" y="34.2" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">root</text>
<text x="320" y="290" font-size="12" text-anchor="middle" fill="currentColor">proof for cert 4: 3 hashes (highlighted fills); bold outline = recomputed by the browser</text>
</svg>
<figcaption>Figure 16.9. The 7-entry log from the code, split as RFC 6962 does. To prove certificate 4 is in the log, the log sends three sibling hashes; the browser recomputes the outlined path and compares the root.</figcaption>
</figure>

The last line reproduces the 8-entry root used as a test vector by CT
implementations. The different prefixes for leaves (`00`) and nodes (`01`) stop
an attacker from presenting an internal node as if it were a certificate.

Certificate Transparency has caught real misissuance, including test certificates
for `google.com` that Symantec employees issued without permission in 2015, which
began the chain of events that ended Symantec's CA business.

!!! note "Life story: Certificate Transparency"
    **Born:** 2011 to 2013, Ben Laurie, Adam Langley and Emilia Käsper at Google; RFC 6962 (2013) · **Purpose:**
    make every publicly trusted certificate visible, so misissuance cannot stay secret · **Helped:** caught
    Symantec's unauthorized certificates (2015); required by Chrome since 2018 and by Safari and Firefox; billions of
    certificates logged · **Status:** current; its Merkle-tree idea now spreads to key transparency and Merkle Tree
    Certificates

## 16.7 Other ways to trust a key

*Level: intermediate.*

<figure class="mars-fig">
<svg viewBox="0 0 690 250" width="690" role="img" aria-label="Three trust models: a CA hierarchy, PGP's web of trust where users sign each other's keys, and SSH's trust on first use with a remembered key">
<text x="115" y="22" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">certificate authorities</text>
<rect x="75" y="40" width="80" height="30" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="75" y="40" width="80" height="30" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="115" y="59.2" font-size="12" text-anchor="middle" fill="currentColor">root CA</text>
<line x1="115" y1="70" x2="30" y2="120" stroke="currentColor" stroke-width="1.1"/>
<circle cx="30" cy="132" r="12" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="115" y1="70" x2="115" y2="120" stroke="currentColor" stroke-width="1.1"/>
<circle cx="115" cy="132" r="12" class="soft" stroke="currentColor" stroke-width="1.3"/>
<line x1="115" y1="70" x2="200" y2="120" stroke="currentColor" stroke-width="1.1"/>
<circle cx="200" cy="132" r="12" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="115" y="180" font-size="12" text-anchor="middle" fill="currentColor">one signer vouches</text>
<text x="115" y="196" font-size="12" text-anchor="middle" fill="currentColor">for everyone</text>
<text x="345" y="22" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">web of trust</text>
<line x1="300" y1="60" x2="390" y2="60" stroke="currentColor" stroke-width="1.1"/>
<line x1="300" y1="60" x2="345" y2="100" stroke="currentColor" stroke-width="1.1"/>
<line x1="390" y1="60" x2="345" y2="100" stroke="currentColor" stroke-width="1.1"/>
<line x1="345" y1="100" x2="290" y2="140" stroke="currentColor" stroke-width="1.1"/>
<line x1="345" y1="100" x2="400" y2="140" stroke="currentColor" stroke-width="1.1"/>
<line x1="290" y1="140" x2="400" y2="140" stroke="currentColor" stroke-width="1.1"/>
<line x1="390" y1="60" x2="400" y2="140" stroke="currentColor" stroke-width="1.1"/>
<circle cx="300" cy="60" r="12" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="390" cy="60" r="12" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="345" cy="100" r="12" class="soft-acc acc" stroke-width="1.3"/>
<circle cx="290" cy="140" r="12" class="soft" stroke="currentColor" stroke-width="1.3"/>
<circle cx="400" cy="140" r="12" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="345" y="180" font-size="12" text-anchor="middle" fill="currentColor">users sign each</text>
<text x="345" y="196" font-size="12" text-anchor="middle" fill="currentColor">other's keys</text>
<text x="575" y="22" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">trust on first use</text>
<circle cx="510" cy="90" r="14" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="510" y="95" font-size="11" text-anchor="middle" fill="currentColor">you</text>
<rect x="600" y="72" width="76" height="36" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="600" y="72" width="76" height="36" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="638" y="94.2" font-size="12" text-anchor="middle" fill="currentColor">server</text>
<line x1="526" y1="84" x2="590" y2="84" stroke="currentColor" stroke-width="1.5"/>
<polygon points="598,84 590,87.6 590,80.4" fill="currentColor"/>
<text x="562" y="76" font-size="11" text-anchor="middle" fill="currentColor">1st: remember</text>
<line x1="526" y1="100" x2="590" y2="100" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="598,100 590,103.6 590,96.4" fill="currentColor"/>
<text x="562" y="120" font-size="11" text-anchor="middle" fill="currentColor">later: same key?</text>
<text x="575" y="180" font-size="12" text-anchor="middle" fill="currentColor">no third party; first</text>
<text x="575" y="196" font-size="12" text-anchor="middle" fill="currentColor">contact must be safe</text>
<text x="345" y="236" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">how each one would have handled DigiNotar: CA trust failed; WoT and TOFU never asked the CA</text>
</svg>
<figcaption>Figure 16.10. Three answers to 'whose key is this?'. They trade convenience against how many parties you must trust.</figcaption>
</figure>

**Trust on first use (TOFU).** SSH, designed by Tatu Ylönen in 1995, shows a
server's key fingerprint the first time you connect, and stores the key in
`~/.ssh/known_hosts`. After that, a changed key produces a loud warning. TOFU
protects every connection except the first, needs no third party, and fails if
the first connection is attacked or if users click through the warning. Signal's
**safety numbers** are the same idea with an optional check: two users can compare
a number, or scan each other's QR code, to rule out a man in the middle. SSH
also supports its own simple certificates, signed by an organization's SSH CA.

Ylönen, a researcher at Helsinki University of Technology, wrote SSH in 1995 after
a password-sniffing attack on the university network, to replace telnet and rlogin,
which sent passwords in the clear. Trust on first use was the pragmatic answer to a
world with no PKI for servers, and it has lasted.

!!! note "Life story: trust on first use (SSH)"
    **Born:** 1995, Tatu Ylönen's SSH · **Purpose:** protect logins without any certificate authority · **Helped:**
    made encrypted remote administration universal; copied by Signal's safety numbers · **Status:** current, often
    alongside SSH certificates in large organizations

**The web of trust.** Phil Zimmermann's PGP (1991) let every user sign other
users' keys. If you trust Carol to check identities, and Carol signed Bob's key,
you can accept Bob's key; "key-signing parties" met to check IDs and sign keys in
bulk. It is decentralized and needs no CA, but it proved hard for ordinary users,
it publishes who knows whom, and the public keyservers were abused in 2019 by
attaching huge numbers of junk signatures to some people's keys until
software choked on importing them. See the [OpenPGP
reference](../protocols/OpenPGP.md).

!!! note "Life story: the web of trust"
    **Born:** 1991 to 1992, Phil Zimmermann's PGP · **Purpose:** let users vouch for each other's keys without any
    authority · **Helped:** secured email for activists, journalists and open-source developers, who still sign
    releases with OpenPGP keys · **Weakened:** too hard for most users; keyserver flooding in 2019 · **Status:**
    alive in niches; key transparency is its modern successor

**Pinning.** A client can carry the expected key (or a hash of it) for a site, as
Chrome did for Google, which is how DigiNotar was caught. HTTP Public Key Pinning
(RFC 7469, 2015) let any site ask browsers to pin, but a mistake could lock a site
out of its own users for months, and browsers removed it a few years later. Apps
still pin keys for their own servers.

!!! note "Life story: HTTP Public Key Pinning"
    **Born:** 2015, RFC 7469 · **Purpose:** let any site tell browsers which keys to expect · **Helped:** little;
    few sites dared use it · **Retired:** removed from Chrome in 2019, because a mistake or an attacker could lock a
    site out of its own users · **Replaced by:** Certificate Transparency

**DANE** (RFC 6698, 2012) publishes a server's key or certificate hash in DNS,
signed with DNSSEC ([DNSSEC reference](../protocols/DNSSEC.md)). It replaces "any
CA may vouch" with "whoever controls the domain's DNS zone vouches". It is used
for mail servers but not by browsers.

!!! note "Life story: DANE"
    **Born:** 2012, RFC 6698 · **Purpose:** let a domain's DNSSEC-signed zone vouch for its own keys · **Helped:**
    secures server-to-server email in several countries (RFC 7672) · **Status:** current for mail; browsers never
    adopted it

**Key transparency.** The CT idea applied to user keys: a messaging service
publishes every user's public key in a verifiable log, and each client checks
that the service shows everyone the same key for each user, including the user
themselves. CONIKS (2015) was the first academic design; WhatsApp deployed key
transparency in 2023, and Apple's iMessage Contact Key Verification does
something similar.

## 16.8 Establishing keys in practice

*Level: intermediate.* Parts II and III have built every component. Here is how
they are put together to give two parties a fresh shared key, which is what
almost every secure protocol starts with.

### Key transport

The client picks a random session key and encrypts it to the server's public key
(RSA, [Chapter 13](13-RSA.md)). This is how SSL and TLS up to 1.2 usually
worked. It has two weaknesses. Padding oracles (Bleichenbacher, ROBOT) attack the
encryption. And there is **no forward secrecy**: whoever later obtains the
server's private key, by theft or by court order, can decrypt every recorded
session. TLS 1.3 (2018) removed it.

<figure class="mars-fig">
<svg viewBox="0 0 660 230" width="660" role="img" aria-label="Forward secrecy compared: with RSA key transport a stolen server key decrypts every recorded session; with ephemeral Diffie-Hellman it only signed, so old sessions stay safe">
<text x="165" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">RSA key transport</text>
<text x="495" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">signed ephemeral DH</text>
<rect x="30" y="40" width="270" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="40" width="270" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="165" y="59.1" font-size="13" text-anchor="middle" fill="currentColor">session key encrypted</text>
<text x="165" y="76" font-size="13" text-anchor="middle" fill="currentColor">to the server's RSA key</text>
<rect x="30" y="110" width="270" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="110" width="270" height="46" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="165" y="137.6" font-size="13" text-anchor="middle" fill="currentColor">years later: RSA key stolen</text>
<rect x="30" y="170" width="270" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="30" y="170" width="270" height="46" rx="6" class="soft-acc acc" stroke-width="1.3"/>
<text x="165" y="197.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">every recorded session decrypted</text>
<line x1="165" y1="86" x2="165" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="165,108 161.4,100 168.6,100" fill="currentColor"/>
<line x1="165" y1="156" x2="165" y2="160" class="acc" stroke-width="1.5"/>
<polygon points="165,168 161.4,160 168.6,160" class="acc-fill"/>
<rect x="360" y="40" width="270" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="360" y="40" width="270" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="495" y="59.1" font-size="13" text-anchor="middle" fill="currentColor">session key from fresh gˣʸ;</text>
<text x="495" y="76" font-size="13" text-anchor="middle" fill="currentColor">RSA key only signs</text>
<rect x="360" y="110" width="270" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="360" y="110" width="270" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="495" y="137.6" font-size="13" text-anchor="middle" fill="currentColor">years later: RSA key stolen</text>
<rect x="360" y="170" width="270" height="46" rx="6" style="fill:var(--md-default-bg-color)"/>
<rect x="360" y="170" width="270" height="46" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="495" y="197.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">old sessions safe: x, y deleted</text>
<line x1="495" y1="86" x2="495" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="495,108 491.4,100 498.6,100" fill="currentColor"/>
<line x1="495" y1="156" x2="495" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="495,168 491.4,160 498.6,160" fill="currentColor"/>
<line x1="330" y1="30" x2="330" y2="220" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" stroke-opacity="0.5"/>
</svg>
<figcaption>Figure 16.11. Why TLS 1.3 dropped key transport. The difference only shows years later, when a long-term key leaks.</figcaption>
</figure>

!!! note "Life story: RSA key transport"
    **Born:** SSL 2.0 (1995) · **Purpose:** the client sends a random session key encrypted to the server's
    certificate key · **Helped:** carried most secure web traffic until the mid-2010s · **Retired:** removed from
    TLS 1.3 (2018), because it has no forward secrecy and kept enabling padding oracles · **Replaced by:** signed
    ephemeral Diffie-Hellman

### Signed (authenticated) Diffie-Hellman

Both sides send fresh Diffie-Hellman shares; the server (and optionally the
client) signs the handshake **transcript** with a key bound to its name by a
certificate; both derive keys from the shared secret and the transcript; and each
sends a MAC over the transcript (a "Finished" message) to confirm it holds the
same keys. This is the SIGMA design ("sign and MAC", Hugo Krawczyk, 2003), and it
is the TLS 1.3 handshake:

$$
\begin{aligned}
C \to S:& \quad \text{nonce}_C,\ g^x \\
S \to C:& \quad \text{nonce}_S,\ g^y,\ \text{Cert}_S,\ \mathrm{Sig}_S(\text{transcript}),\ \mathrm{MAC}_{k}(\text{transcript}) \\
C \to S:& \quad \mathrm{MAC}_{k'}(\text{transcript})
\end{aligned}
$$

<figure class="mars-fig">
<svg viewBox="0 0 600 334" width="600" role="img" aria-label="Sequence chart of the SIGMA-style TLS 1.3 handshake: client share, server share with certificate, signature and MAC, client MAC">
<rect x="78" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="130" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Client</text>
<line x1="130" y1="38" x2="130" y2="328" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="418" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="470" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Server</text>
<line x1="470" y1="38" x2="470" y2="328" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<line x1="130" y1="100" x2="462" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="470,100 462,103.6 462,96.4" fill="currentColor"/>
<text x="300" y="93" font-size="13" text-anchor="middle" fill="currentColor">nonce_C, gˣ</text>
<line x1="470" y1="160" x2="138" y2="160" class="acc" stroke-width="1.5"/>
<polygon points="130,160 138,156.4 138,163.6" class="acc-fill"/>
<text x="300" y="137" font-size="13" text-anchor="middle" fill="currentColor">nonce_S, gʸ, cert_S,</text>
<text x="300" y="153" font-size="13" text-anchor="middle" fill="currentColor">Sig_S(transcript), MAC_k(transcript)</text>
<rect x="59.1" y="178" width="141.8" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="59.1" y="178" width="141.8" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="130" y="195" font-size="13" text-anchor="middle" fill="currentColor">check cert chain,</text>
<text x="130" y="213" font-size="13" text-anchor="middle" fill="currentColor">signature and MAC</text>
<rect x="413.7" y="178" width="112.6" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="413.7" y="178" width="112.6" height="26" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="470" y="195" font-size="13" text-anchor="middle" fill="currentColor">keys from gˣʸ</text>
<line x1="130" y1="264" x2="462" y2="264" class="acc" stroke-width="1.5"/>
<polygon points="470,264 462,267.6 462,260.4" class="acc-fill"/>
<text x="300" y="257" font-size="13" text-anchor="middle" fill="currentColor">MAC_k′(transcript)</text>
<rect x="80" y="282" width="440" height="26" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="80" y="282" width="440" height="26" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="299" font-size="13" text-anchor="middle" fill="currentColor">both hold keys from HKDF(gˣʸ, transcript)</text>
</svg>
<figcaption>Figure 16.12. Signed Diffie-Hellman as TLS 1.3 does it: one and a half round trips, with the signature and both MACs covering everything said so far.</figcaption>
</figure>

with $k, k'$ derived by HKDF from $g^{xy}$ and the transcript. It gives
authentication from the certificate, forward secrecy from the fresh $x$ and $y$,
and agreement on everything that was said, so a man in the middle cannot
downgrade the choice of algorithms. [Chapter 19](19-Protocols.md) walks through
TLS 1.3 message by message.

!!! note "Life story: SIGMA"
    **Born:** 2003, Hugo Krawczyk (IBM) · **Purpose:** authenticated Diffie-Hellman with a proof, fixing the
    identity-binding gaps of station-to-station · **Helped:** the basis of IKEv2 in IPsec and of the TLS 1.3
    handshake · **Status:** current

### Key encapsulation (KEMs)

A **key encapsulation mechanism** is the modern abstraction for "send a fresh key
to a public key". It has three algorithms:

$$
\begin{aligned}
\mathrm{KeyGen}() &\to (pk, sk) \\
\mathrm{Encap}(pk) &\to (K, c) \qquad \text{a fresh random key } K \text{ and its encapsulation } c \\
\mathrm{Decap}(sk, c) &\to K
\end{aligned}
$$

The sender does not choose $K$; the KEM makes it. That small change makes KEMs
easier to design and prove than encryption, and it fits every family:

- **DHKEM:** $\mathrm{Encap}$ makes an ephemeral key pair $(e, g^e)$, sends
  $c = g^e$, and sets $K = \mathrm{KDF}(pk^e, c, pk)$. It is ElGamal done right
  ([Chapter 14](14-Discrete-Log-Systems.md)).
- **RSA-KEM:** encrypt a random $r < n$ and hash it ([Chapter 13](13-RSA.md)).
- **ML-KEM**, the post-quantum standard ([Chapter 21](21-Lattice-Cryptography.md)),
  is defined only as a KEM.

Because both ECDH and ML-KEM fit the same interface, a **hybrid KEM** runs both and
hashes the two keys together, so the result is safe if either one holds. That is
how SSH, Signal and TLS began adding post-quantum protection between 2022 and 2024.

### HPKE

**Hybrid Public Key Encryption** (RFC 9180, 2022, by Richard Barnes, Karthikeyan
Bhargavan, Benjamin Lipp and Christopher Wood) is the standard way to encrypt to a
public key today. It glues a KEM, a KDF and an AEAD
([Chapter 10](10-Message-Authentication.md)) together with a fixed key schedule
and test vectors, replacing the many incompatible ECIES variants. A suite is named
by three numbers; the common one is DHKEM(X25519), HKDF-SHA256 and AES-128-GCM.

```python
# pip install cryptography   (version 47 or later has HPKE)
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.hpke import AEAD, KDF, KEM, Suite

suite = Suite(KEM.X25519, KDF.HKDF_SHA256, AEAD.AES_128_GCM)     # RFC 9180 ids 0x0020, 0x0001, 0x0001

bob = x25519.X25519PrivateKey.generate()                          # Bob publishes bob.public_key()
ct = suite.encrypt(b"meet me at noon", bob.public_key(), info=b"chat v1")
print(len(ct), suite.decrypt(ct, bob, info=b"chat v1"))          # 63 b'meet me at noon'
```

<figure class="mars-fig">
<svg viewBox="0 0 620 120" width="620" role="img" aria-label="HPKE ciphertext layout from the example: 32 bytes encapsulated key, 15 bytes message, 16 bytes tag, 63 in total">
<rect x="20" y="30" width="294.6" height="44" rx="2" style="fill:var(--md-default-bg-color)"/>
<rect x="20" y="30" width="294.6" height="44" rx="2" class="soft-acc acc" stroke-width="1.3"/>
<text x="167.3" y="56.5" font-size="13" text-anchor="middle" fill="currentColor">enc: X25519 key, 32 B</text>
<rect x="314.6" y="30" width="138.1" height="44" rx="2" style="fill:var(--md-default-bg-color)"/>
<rect x="314.6" y="30" width="138.1" height="44" rx="2" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="383.7" y="56.5" font-size="13" text-anchor="middle" fill="currentColor">ciphertext, 15 B</text>
<rect x="452.7" y="30" width="147.3" height="44" rx="2" style="fill:var(--md-default-bg-color)"/>
<rect x="452.7" y="30" width="147.3" height="44" rx="2" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="526.3" y="56.5" font-size="13" text-anchor="middle" fill="currentColor">tag, 16 B</text>
<text x="310" y="20" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">63 bytes</text>
<text x="310" y="100" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">KEM output, then AEAD (AES-128-GCM) under the key the KEM made</text>
</svg>
<figcaption>Figure 16.13. The HPKE ciphertext of the example, byte by byte.</figcaption>
</figure>

The 63 bytes are 32 for the encapsulated X25519 key, 15 for the message and 16 for
the AEAD tag. The `info` string binds the ciphertext to its purpose. HPKE has
modes in which the sender also proves who they are (with a pre-shared key or a
static key pair); in the base mode used here, anyone with Bob's public key could
have sent the message. It is inside TLS Encrypted Client Hello (which hides the
name of the site you visit), the MLS group-messaging protocol (RFC 9420) and
Oblivious HTTP (RFC 9458), and post-quantum suites with ML-KEM are being added.
Details: [HPKE reference](../03-public-key-encryption/HPKE.md).

!!! note "Life story: KEMs and HPKE"
    **Born:** the KEM idea with Victor Shoup's work around 2001; HPKE as RFC 9180 in 2022 (Barnes, Bhargavan, Lipp,
    Wood) · **Purpose:** one well-specified way to encrypt to a public key, replacing many ECIES variants ·
    **Helped:** Encrypted Client Hello, MLS, Oblivious HTTP; the slot where ML-KEM drops in · **Status:** current

### Password-authenticated key exchange (PAKE)

Sometimes the only thing two parties share is a password: a Wi-Fi passphrase, a
PIN shown on a device, a login. The naive approach (hash the password, use it as a
key, or send it inside an encrypted channel) lets anyone who records one exchange
test password guesses offline, at billions per second. WPA2-Personal Wi-Fi is the
classic victim: capture one handshake and crack the passphrase at home.

A **PAKE** mixes the password into a Diffie-Hellman exchange so that a recorded
exchange is useless, and an active attacker gets exactly one guess per run, which
the other side can rate-limit. Steven Bellovin and Michael Merritt of AT&T Bell
Labs invented the idea with EKE in 1992; its patent, until 2011, kept PAKEs rare.
**SPAKE2** (Michel Abdalla and David Pointcheval, 2005; RFC 9382) masks each
Diffie-Hellman share with the password, using fixed group elements $M$ and $N$
whose discrete logs nobody knows:

$$
p_A = g^x M^w, \qquad p_B = g^y N^w, \qquad K = (p_B / N^w)^x = (p_A / M^w)^y = g^{xy} .
$$

<figure class="mars-fig">
<svg viewBox="0 0 600 292" width="600" role="img" aria-label="Sequence chart of SPAKE2: each side masks its Diffie-Hellman share with the password, strips the other's mask and gets g to the xy; an eavesdropper cannot test guesses">
<rect x="48" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<line x1="100" y1="38" x2="100" y2="286" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="248" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Eve</text>
<line x1="300" y1="38" x2="300" y2="286" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="448" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="500" y1="38" x2="500" y2="286" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="43.7" y="74" width="112.6" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="43.7" y="74" width="112.6" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="91" font-size="13" text-anchor="middle" fill="currentColor">password → w,</text>
<text x="100" y="109" font-size="13" text-anchor="middle" fill="currentColor">fresh x</text>
<rect x="443.7" y="74" width="112.6" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="443.7" y="74" width="112.6" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="91" font-size="13" text-anchor="middle" fill="currentColor">password → w,</text>
<text x="500" y="109" font-size="13" text-anchor="middle" fill="currentColor">fresh y</text>
<line x1="100" y1="160" x2="492" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="500,160 492,163.6 492,156.4" fill="currentColor"/>
<text x="300" y="153" font-size="13" text-anchor="middle" fill="currentColor">p_A = gˣ · Mʷ</text>
<line x1="500" y1="204" x2="108" y2="204" stroke="currentColor" stroke-width="1.5"/>
<polygon points="100,204 108,200.4 108,207.6" fill="currentColor"/>
<text x="300" y="197" font-size="13" text-anchor="middle" fill="currentColor">p_B = gʸ · Nʷ</text>
<rect x="36.4" y="222" width="127.2" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="36.4" y="222" width="127.2" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="239" font-size="13" text-anchor="middle" fill="currentColor">K = (p_B / Nʷ)ˣ</text>
<text x="100" y="257" font-size="13" text-anchor="middle" fill="currentColor">= gˣʸ</text>
<rect x="236.4" y="222" width="127.2" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="236.4" y="222" width="127.2" height="44" rx="5" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="300" y="239" font-size="13" text-anchor="middle" fill="currentColor">each guess w′</text>
<text x="300" y="257" font-size="13" text-anchor="middle" fill="currentColor">looks plausible</text>
<rect x="436.4" y="222" width="127.2" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="436.4" y="222" width="127.2" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="500" y="239" font-size="13" text-anchor="middle" fill="currentColor">K = (p_A / Mʷ)ʸ</text>
<text x="500" y="257" font-size="13" text-anchor="middle" fill="currentColor">= gˣʸ</text>
</svg>
<figcaption>Figure 16.14. SPAKE2. The password masks the shares; only someone who knows it can strip the mask, and a recording gives no way to test guesses offline.</figcaption>
</figure>

A toy over the 2048-bit group of Chapter 12 (no key confirmation, no input checks):

```python
import hashlib, secrets

p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
q, g = (p - 1) // 2, 2                  # q is prime, g = 2 has order q

def element(label):                     # a group element whose log nobody knows
    h = int.from_bytes(hashlib.shake_256(label).digest(256), "big")
    return pow(h, 2, p)

M, N = element(b"toy M"), element(b"toy N")

def w_from(password):                   # slow hash of the password
    k = hashlib.pbkdf2_hmac("sha256", password.encode(), b"alice|bob", 100_000)
    return int.from_bytes(k, "big") % q

def spake2(pw_a, pw_b):
    wa, wb = w_from(pw_a), w_from(pw_b)
    x, y = secrets.randbelow(q - 1) + 1, secrets.randbelow(q - 1) + 1
    pA = pow(g, x, p) * pow(M, wa, p) % p     # Alice -> Bob
    pB = pow(g, y, p) * pow(N, wb, p) % p     # Bob -> Alice
    Ka = pow(pB * pow(N, -wa, p) % p, x, p)   # Alice strips Bob's mask
    Kb = pow(pA * pow(M, -wb, p) % p, y, p)   # Bob strips Alice's mask
    key = lambda K, w: hashlib.sha256(f"{pA}|{pB}|{K}|{w}".encode()).digest()
    return key(Ka, wa) == key(Kb, wb)

print(spake2("purple tuba", "purple tuba"))   # True
print(spake2("purple tuba", "purple tube"))   # False
```

Eve, recording $p_A$ and $p_B$, can try a password guess $w'$, but every guess
gives a plausible-looking $g^{x}$ and $g^{y}$, and checking which guess gives the
right $g^{xy}$ would need a Diffie-Hellman solution. If $M$'s discrete log were
known, she could strip the mask for each guess, which is why $M$ and $N$ must come
from hashing, with nobody knowing their logs.

Where PAKEs run today: **WPA3-Personal** Wi-Fi uses SAE ("Dragonfly", Dan
Harkins), though its first version leaked password information through timing
(Dragonblood, Mathy Vanhoef and Eyal Ronen, 2019). Apple's iCloud Keychain and
1Password use SRP (Tom Wu, 1998). In 2020 the IRTF's Crypto Forum Research Group
picked **CPace** (balanced, for two devices sharing a password) and **OPAQUE**
(augmented, for client and server; the server never sees the password and a
stolen database still costs a slow hash per guess); WhatsApp's encrypted backups
use OPAQUE. Details: [PAKE reference](../01-key-exchange/PAKE.md).

!!! note "Life story: password-authenticated key exchange"
    **Born:** 1992, Steven Bellovin and Michael Merritt's EKE at AT&T Bell Labs · **Purpose:** turn a weak shared
    password into a strong key without allowing offline guessing · **Held back:** by patents until about 2011 ·
    **Helped:** SRP (1998) in Apple's iCloud Keychain, SAE in WPA3 Wi-Fi (2018), OPAQUE in WhatsApp backups ·
    **Status:** current; CPace and OPAQUE chosen by the IRTF in 2020

## 16.9 In the real world

| Setting | How keys are trusted | How the session key is made |
|---|---|---|
| HTTPS (TLS 1.3) | X.509 chain to a root in the browser; CT required | ECDHE (X25519, often hybrid with ML-KEM), server signs transcript |
| SSH | TOFU in `known_hosts`, or SSH certificates | ECDHE or hybrid KEM, server signs exchange hash |
| Signal, WhatsApp | safety numbers, key transparency | X3DH / PQXDH, then the double ratchet ([Chapter 19](19-Protocols.md)) |
| Email (S/MIME, OpenPGP) | X.509 or web of trust | key transport to each recipient's public key |
| Wi-Fi (WPA3-Personal) | the shared passphrase | SAE (a PAKE) |
| Software updates | a vendor key built into the device | none: signatures only |
| Encrypted Client Hello, MLS, OHTTP | keys published in DNS or by a service | HPKE |

**Standards:** RFC 5280 (X.509 profile), RFC 6960 (OCSP), RFC 6962 and RFC 9162
(Certificate Transparency), RFC 8555 (ACME), RFC 8446 (TLS 1.3), RFC 9180 (HPKE),
RFC 9382 (SPAKE2). Public CAs follow the CA/Browser Forum Baseline Requirements.

**Post-quantum.** Key establishment is moving first, through hybrid KEMs.
Certificates are harder: an ML-DSA signature is about 2.4 KB against 64 bytes for
ECDSA, and a handshake carries several. Proposals such as Merkle Tree
Certificates, where a CA signs one tree head for many certificates and the server
sends a short inclusion proof, reuse the CT idea to keep handshakes small. See
[Chapter 21](21-Lattice-Cryptography.md) and the [PKI
reference](../protocols/PKI.md).

## 16.10 Mistakes to avoid

- **Skipping validation.** Disabling certificate checks "for testing" and shipping
  it is among the most common bugs in mobile apps and scripts; in Python, never
  pass `verify=False` or an unverified SSL context to a client that talks to the
  internet.
- **Matching the wrong name.** Check the SAN against the host you meant to reach,
  not against a name the server tells you.
- **Rolling your own handshake.** Use TLS, Noise or HPKE. Hand-made protocols miss
  transcript binding, key confirmation or replay protection.
- **Treating a certificate as more than it is.** A valid certificate says a CA
  believed a key belonged to a domain; it does not say the site is honest.
- **Forgetting rotation.** Short-lived certificates need automation; manual
  renewal fails on a holiday.

## 16.11 Going deeper

*Level: expert.*

### Forty years of broken key-establishment protocols

In 1978 Roger Needham and Michael Schroeder published two key-establishment
protocols, one with a trusted server and symmetric keys (the ancestor of
Kerberos) and one with public keys. In 1995 Gavin Lowe, using a model checker,
found a man-in-the-middle attack on the public-key version that had gone
unnoticed for 17 years: if Alice starts a session with a malicious Mallory,
Mallory can reuse Alice's messages to impersonate Alice to Bob. The fix was to add

<figure class="mars-fig">
<svg viewBox="0 0 640 364" width="640" role="img" aria-label="Sequence chart of Lowe's attack on Needham-Schroeder: Alice talks to Mallory, who reuses her messages to convince Bob he is talking to Alice">
<rect x="48" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="100" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<line x1="100" y1="38" x2="100" y2="358" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="268" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Mallory</text>
<line x1="320" y1="38" x2="320" y2="358" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<rect x="488" y="8" width="104" height="30" rx="6" class="soft" stroke="currentColor" stroke-width="1.3"/>
<text x="540" y="28" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="540" y1="38" x2="540" y2="358" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.5"/>
<line x1="100" y1="100" x2="312" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,100 312,103.6 312,96.4" fill="currentColor"/>
<text x="210" y="93" font-size="13" text-anchor="middle" fill="currentColor">{N_A, A} for Mallory</text>
<line x1="320" y1="144" x2="532" y2="144" class="acc" stroke-width="1.5"/>
<polygon points="540,144 532,147.6 532,140.4" class="acc-fill"/>
<text x="430" y="137" font-size="13" text-anchor="middle" fill="currentColor">{N_A, A} for Bob  (posing as Alice)</text>
<line x1="540" y1="188" x2="108" y2="188" stroke="currentColor" stroke-width="1.5"/>
<polygon points="100,188 108,184.4 108,191.6" fill="currentColor"/>
<text x="320" y="181" font-size="13" text-anchor="middle" fill="currentColor">{N_A, N_B} for Alice  (relayed by Mallory)</text>
<line x1="100" y1="232" x2="312" y2="232" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,232 312,235.6 312,228.4" fill="currentColor"/>
<text x="210" y="225" font-size="13" text-anchor="middle" fill="currentColor">{N_B} for Mallory</text>
<line x1="320" y1="276" x2="532" y2="276" class="acc" stroke-width="1.5"/>
<polygon points="540,276 532,279.6 532,272.4" class="acc-fill"/>
<text x="430" y="269" font-size="13" text-anchor="middle" fill="currentColor">{N_B} for Bob</text>
<rect x="480" y="294" width="119.9" height="44" rx="5" style="fill:var(--md-default-bg-color)"/>
<rect x="480" y="294" width="119.9" height="44" rx="5" class="soft-acc" stroke="currentColor" stroke-width="1.3"/>
<text x="540" y="311" font-size="13" text-anchor="middle" fill="currentColor">believes he</text>
<text x="540" y="329" font-size="13" text-anchor="middle" fill="currentColor">talks to Alice</text>
</svg>
<figcaption>Figure 16.15. Lowe's 1995 attack. Bob's reply did not name Bob, so Alice could not see it was meant for a session with someone else; adding his name fixes it.</figcaption>
</figure>

Bob's name to one message. The episode began the use of formal tools (model
checkers such as ProVerif and Tamarin, and computational proofs) to analyze
protocols, which is now standard: TLS 1.3 was analyzed with both before it was
finished.

!!! note "Life story: the Needham-Schroeder protocols"
    **Born:** 1978, Roger Needham (Cambridge) and Michael Schroeder (Xerox PARC) · **Purpose:** key establishment through a
    trusted server, or with public keys · **Helped:** the symmetric version grew into Kerberos (MIT, 1980s), still
    used by Windows domains · **Broken:** the public-key version by Gavin Lowe in 1995 · **Fixed:** by adding one
    name (the Needham-Schroeder-Lowe protocol)

### Security models

Mihir Bellare and Phillip Rogaway (1993) gave the first formal definition of a
secure key exchange: an adversary who controls the network, can start sessions,
can learn some session keys and corrupt some parties, still cannot tell a fresh
session's key from random. Ran Canetti and Hugo Krawczyk (2001) and later the
"eCK" model refined what may be corrupted and when. Properties these models
capture include:

- **Forward secrecy:** later compromise of long-term keys does not expose past
  session keys.
- **Key-compromise impersonation (KCI) resistance:** stealing Alice's key lets the
  thief impersonate Alice, but should not let them impersonate *others to Alice*.
  HPKE's auth mode does not resist KCI, as RFC 9180 notes.
- **No unknown key-share:** Alice must not end up sharing a key with Bob while
  believing she shares it with Carol. Simon Blake-Wilson and Alfred Menezes (1999)
  showed such attacks on station-to-station when identities are not bound into
  the signed data; SIGMA binds them.

[Chapter 17](17-Defining-Security.md) treats such definitions in general.

### Signing the right thing

A signature on a Diffie-Hellman share alone is replayable; a signature over a
transcript that omits the negotiated algorithms allows downgrade. The 2015
Logjam attack ([Chapter 12](12-Diffie-Hellman.md)) worked because TLS 1.2's server
signature covered the Diffie-Hellman parameters but not the cipher suite, so a
man in the middle could make the client accept export-grade parameters. TLS 1.3
signs a hash of the entire transcript. In 2014 Apple's "goto fail" bug skipped the
signature check on the server's key exchange entirely, because one duplicated
line made the verification function return success early: the protocol was right,
and one line of code undid it.

### Certificate parsing

X.509 is an old, flexible format, and parsers have been a steady source of bugs:
null bytes in names (2009), confusion between DER and lax BER encodings, ASN.1
length overflows, and differences between libraries over what a valid certificate
is. Projects such as Frankencert (2014) generated millions of odd certificates and
found that different TLS libraries accepted and rejected different ones. Modern
verifiers (Go's crypto/x509, or PyCA's Rust verifier used in §16.4) are written
to the web PKI profile strictly and reject anything unusual.

## Check yourself

??? question "1. In the toy certificate of §16.2, the statement hashes to 488 and the signature is 1281. Verify it with the CA's public key $(3233, 17)$."

    $1281^{17} \bmod 3233 = 488$, which matches the hash, so the signature is valid.

??? question "2. Why doesn't a server send its root certificate, and what would be wrong with a client trusting a root that arrives in the handshake?"

    Trust has to start from something the client already has. A root sent by the server proves nothing: an
    attacker could send their own self-signed root just as easily. Clients take roots only from their own store.

??? question "3. An intermediate CA certificate has `pathlen:0`. What may it sign?"

    Leaf (end-entity) certificates only. It may not sign another CA certificate, so a compromise of a leaf
    it issued can't be turned into a new CA below it.

??? question "4. A CT log holds a billion certificates. How many hashes does an inclusion proof contain?"

    $\lceil \log_2 10^9 \rceil = 30$ hashes, 960 bytes with SHA-256.

??? question "5. Why did DigiNotar's fake `*.google.com` certificate get caught, when a fake certificate for a small site might not have been?"

    Chrome pinned Google's keys, so it rejected a valid-looking certificate whose key wasn't one of Google's,
    and showed an error. Without pinning (or, today, CT monitoring), a correctly signed rogue certificate looks
    exactly like a real one.

??? question "6. A server's RSA private key is stolen. Which recorded sessions can the thief decrypt if the server used RSA key transport? If it used ECDHE with an RSA signature?"

    With key transport: every recorded session, past and future, because each session key was encrypted to that
    RSA key. With ECDHE: none of the past sessions, because the RSA key only signed; the session keys came from
    ephemeral Diffie-Hellman values that were thrown away. The thief can impersonate the server in future
    connections until the certificate expires or is revoked.

??? question "7. What does trust on first use protect against, and what not?"

    It protects every connection after the first against a man in the middle, without any third party. It
    gives no protection if the attacker is present on the first connection, or if the user accepts a changed key
    without checking it.

??? question "8. In HPKE's base mode, what does Bob know about who sent a message?"

    Nothing: anyone with his public key could have created it. He knows only that whoever sent it chose the
    `info` context he expects. Authenticating the sender needs the auth or PSK modes, or a signature.

??? question "9. Why can an attacker crack a WPA2-Personal passphrase from one recorded handshake, but not a WPA3 (SAE) one?"

    In WPA2 the handshake keys are derived from the passphrase alone plus public values, so each guess can be
    checked against the recording offline. In a PAKE like SAE the password is mixed into a Diffie-Hellman
    exchange; checking a guess against a recording would require solving Diffie-Hellman, so each guess needs a
    live run with the real access point.

??? question "10. In SPAKE2, why must nobody know the discrete log of $M$?"

    If $M = g^m$ with $m$ known, then $p_A = g^{x + m w}$. An eavesdropper can strip the mask for any password
    guess $w'$, getting $g^{x + m(w - w')}$, and test guesses offline against the session key confirmation. With
    $M$ derived by hashing, nobody knows $m$.

## What you learned

- A public key is useful only when you know whose it is. Certificates, TOFU, the web
  of trust, DANE and transparency logs are the ways to know.
- An X.509 certificate is a CA's signature over a name, a key and conditions.
  Clients validate a chain up to a root in their own store, checking signatures,
  dates, CA constraints, names and usage.
- Revocation is weak in practice; short-lived, automatically renewed certificates
  are the current answer.
- Any CA can sign for any name, and CAs have failed (DigiNotar, Comodo, the MD5
  rogue CA). Certificate Transparency's Merkle-tree logs make every certificate
  public so misissuance is seen.
- Keys are established by signed Diffie-Hellman with transcript binding (TLS 1.3),
  by KEMs and HPKE for encrypting to a public key, and by PAKEs when only a
  password is shared.
- Forward secrecy comes from ephemeral keys; key transport never had it.
- Post-quantum key establishment moves first, through hybrid KEMs; certificates
  follow more slowly because of signature sizes.

**Next:** [Chapter 17](17-Defining-Security.md), what it means to prove any of this secure.

## Further reading

- L. Kohnfelder, "Towards a Practical Public-Key Cryptosystem", MIT bachelor's thesis, 1978.
- P. Gutmann, *Engineering Security* (draft book, 2014), on PKI's practical failures.
- B. Laurie, "Certificate Transparency", *Communications of the ACM* 57(10), 2014; RFC 6962 and RFC 9162.
- Fox-IT, "DigiNotar Certificate Authority Breach: Operation Black Tulip", 2011.
- M. Stevens et al., "Short Chosen-Prefix Collisions for MD5 and the Creation of a Rogue CA Certificate", CRYPTO 2009.
- H. Krawczyk, "SIGMA: The 'SIGn-and-MAc' Approach to Authenticated Diffie-Hellman", CRYPTO 2003.
- G. Lowe, "Breaking and Fixing the Needham-Schroeder Public-Key Protocol Using FDR", TACAS 1996.
- RFC 5280, RFC 8555, RFC 8446, RFC 9180, RFC 9382.
- David Wong, *Real-World Cryptography* (2021), chapters on key exchange and PKI.
- Reference pages: [PKI](../protocols/PKI.md), [X.509](../formats/X.509.md), [HPKE](../03-public-key-encryption/HPKE.md), [PAKE](../01-key-exchange/PAKE.md), [TLS 1.3](../protocols/TLS-1.3.md).
