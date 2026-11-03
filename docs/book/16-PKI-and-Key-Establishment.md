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

The last line reproduces the 8-entry root used as a test vector by CT
implementations. The different prefixes for leaves (`00`) and nodes (`01`) stop
an attacker from presenting an internal node as if it were a certificate.

Certificate Transparency has caught real misissuance, including test certificates
for `google.com` that Symantec employees issued without permission in 2015, which
began the chain of events that ended Symantec's CA business.

## 16.7 Other ways to trust a key

*Level: intermediate.*

**Trust on first use (TOFU).** SSH, designed by Tatu Ylönen in 1995, shows a
server's key fingerprint the first time you connect, and stores the key in
`~/.ssh/known_hosts`. After that, a changed key produces a loud warning. TOFU
protects every connection except the first, needs no third party, and fails if
the first connection is attacked or if users click through the warning. Signal's
**safety numbers** are the same idea with an optional check: two users can compare
a number, or scan each other's QR code, to rule out a man in the middle. SSH
also supports its own simple certificates, signed by an organization's SSH CA.

**The web of trust.** Phil Zimmermann's PGP (1991) let every user sign other
users' keys. If you trust Carol to check identities, and Carol signed Bob's key,
you can accept Bob's key; "key-signing parties" met to check IDs and sign keys in
bulk. It is decentralized and needs no CA, but it proved hard for ordinary users,
it publishes who knows whom, and the public keyservers were abused in 2019 by
attaching huge numbers of junk signatures to some people's keys until
software choked on importing them. See the [OpenPGP
reference](../protocols/OpenPGP.md).

**Pinning.** A client can carry the expected key (or a hash of it) for a site, as
Chrome did for Google, which is how DigiNotar was caught. HTTP Public Key Pinning
(RFC 7469, 2015) let any site ask browsers to pin, but a mistake could lock a site
out of its own users for months, and browsers removed it a few years later. Apps
still pin keys for their own servers.

**DANE** (RFC 6698, 2012) publishes a server's key or certificate hash in DNS,
signed with DNSSEC ([DNSSEC reference](../protocols/DNSSEC.md)). It replaces "any
CA may vouch" with "whoever controls the domain's DNS zone vouches". It is used
for mail servers but not by browsers.

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

with $k, k'$ derived by HKDF from $g^{xy}$ and the transcript. It gives
authentication from the certificate, forward secrecy from the fresh $x$ and $y$,
and agreement on everything that was said, so a man in the middle cannot
downgrade the choice of algorithms. [Chapter 19](19-Protocols.md) walks through
TLS 1.3 message by message.

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

The 63 bytes are 32 for the encapsulated X25519 key, 15 for the message and 16 for
the AEAD tag. The `info` string binds the ciphertext to its purpose. HPKE has
modes in which the sender also proves who they are (with a pre-shared key or a
static key pair); in the base mode used here, anyone with Bob's public key could
have sent the message. It is inside TLS Encrypted Client Hello (which hides the
name of the site you visit), the MLS group-messaging protocol (RFC 9420) and
Oblivious HTTP (RFC 9458), and post-quantum suites with ML-KEM are being added.
Details: [HPKE reference](../03-public-key-encryption/HPKE.md).

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
Bob's name to one message. The episode began the use of formal tools (model
checkers such as ProVerif and Tamarin, and computational proofs) to analyze
protocols, which is now standard: TLS 1.3 was analyzed with both before it was
finished.

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
