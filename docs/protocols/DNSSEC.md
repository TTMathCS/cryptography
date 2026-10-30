# DNSSEC (DNS Security Extensions)

*Signatures on DNS answers, so a resolver can check that a record is the one
the zone's owner published. Nothing is encrypted. Each parent zone vouches for
its child's key with a hash, and the chain ends at one key every validator
already trusts: the root's.*

**Standard:** RFC 4033, 4034 and 4035 (March 2005), NSEC3 in RFC 5155 (2008),
together BCP 237 (RFC 9364, 2023); RSA/SHA-256 in RFC 5702 (2009), ECDSA in
RFC 6605 (2012), Ed25519 in RFC 8080 (2017). RFC 9904 (November 2025) replaced
RFC 8624 (2019) and moved the algorithm list into the IANA registries; RFC 9905
(November 2025) bars signing with SHA-1. **Implementations:** BIND 9, Knot DNS
and Knot Resolver, Unbound and NSD, PowerDNS, OpenDNSSEC, ldns.

## One lookup, one algorithm per category

With no outside DNS in the container, this is a stand-in: real output from BIND
9.18.39 on Ubuntu 24.04 in a container, Oct 2026. `dnssec-signzone` signed a
root zone with RSA/SHA-256 keys, like the real root, and `example.` with ECDSA
P-256 and NSEC3. One `named` serves both; a second, on port 5301, validates
from the stand-in root's DS. Signatures cut short:

```
$ dig @127.0.0.1 -p 5301 +dnssec www.example A
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
; EDNS: version: 0, flags: do; udp: 1232
www.example.  3440  IN  A       192.0.2.1
www.example.  3440  IN  RRSIG   A 13 2 3600 20261129151455 20261030151455 38668 example. q1Dfttvf…
$ dig @127.0.0.1 +dnssec +noall +answer example DNSKEY
example.      3600  IN  DNSKEY  257 3 13 lVduWlgKU4eYH52ACWq+Bmplqyztzc8/2DCo…
example.      3600  IN  DNSKEY  256 3 13 a7+92/o3s8e1Z0151ZqMUrRG4HN8nf/eN3re…
example.      3600  IN  RRSIG   DNSKEY 13 1 3600 20261129151455 20261030151455 6703 example. sFGJN4EV…
example.      3600  IN  RRSIG   DNSKEY 13 1 3600 20261129151455 20261030151455 38668 example. e2kli84g…
$ dig @127.0.0.1 +dnssec +noall +answer example DS
example.      86400 IN  DS      6703 13 2 A01A45C58FE6BD40C2E6880E82D0D536BCBE9641D97E33356EF587D4 6804CFEB
example.      86400 IN  RRSIG   DS 8 1 86400 20261129151455 20261030151455 2899 . qCVuxQFS…
```

| DNSSEC name | Category | Algorithm inside |
|---|---|---|
| `13` in DNSKEY and RRSIG | [Signature](../index.md#2-digital-signatures) | [ECDSA](../02-signatures/ECDSA.md) on P-256 with SHA-256; a 64-byte signature, r then s (RFC 6605 §4) |
| flags `257`, `256` | [Signature](../index.md#2-digital-signatures) | the key-signing key (KSK, tag 6703) signs the DNSKEY set; the zone-signing key (ZSK, tag 38668) signs the rest. Only the KSK's hash sits in the parent, so the ZSK can change without it (RFC 6781) |
| `8` in the DS's RRSIG | [Signature](../index.md#2-digital-signatures) | [RSA](../02-signatures/RSA.md) PKCS#1 v1.5 with SHA-256 (RFC 5702): the parent signs the DS with its own key |
| DS `6703 13 2` | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md) over the child's name and its KSK: key tag, algorithm, digest type 2, digest |
| NSEC3 `1 0 0 -` | [Hash](../index.md#7-hash-functions) | [SHA-1](../07-hash/Retired.md#sha-1) over owner names, no extra iterations, no salt (RFC 9276) |
| key tag `6703` | — | a 16-bit checksum of the DNSKEY (RFC 4034 Appendix B): a hint for finding the key, not a hash |
| none | [Cipher](../index.md#4-symmetric-ciphers) | nothing is encrypted; questions and answers cross the network in the clear |

**Why sign but not encrypt?** DNSSEC asks one thing: is this the record the
zone's owner published? DNS data is public, and a signature made once can be
served by any server or cache without the private key. Hiding queries is a
separate job, done between a device and its resolver by DNS over TLS (RFC
7858), HTTPS (RFC 8484) or QUIC (RFC 9250); such a resolver can still lie.

## How a lookup is validated

1. **Signing.** Each RRset (all records of one name and type) gets an RRSIG:
   algorithm, label count, original TTL, expiry and start, key tag, signer,
   and a signature over those fields plus the RRset in canonical form
   (RFC 4034 §3.1.8.1). Here they last 30 days; the zone is re-signed
   before they run out.
2. **Keys and delegation.** The resolver checks `www.example`'s RRSIG with
   the ZSK and the DNSKEY set's with the KSK. The parent's DS holds
   SHA-256(owner name in wire format | DNSKEY RDATA) (RFC 4034 §5.1.4), so the
   resolver hashes the KSK and compares. `delv +rtrace` lists the fetches:
   `www.example/A`, `example/DNSKEY`, `example/DS`, `./DNSKEY`.
3. **Trust anchor.** The root's DNSKEY set must match a root key the resolver
   ships with. Without `-a anchor.conf`, delv uses BIND's copy of the real
   root key and refuses the stand-in: `no valid signature found (DS)`.
4. **Denial.** NSEC names the next name and the types present, so anyone can
   list the zone; NSEC3 does it over hashed names. For `nope.example` delv
   showed one NSEC3, at `example.`'s hash `3MSEV9US…` pointing to `9KQNRPNE…`:
   `nope.example` (`4CS2E7I4…`) and `*.example` (`99JAHPQE…`) fall in between.
5. **Result.** Secure data gets the AD bit (RFC 4035 §3.2.3). With `www`'s
   address edited in the zone file and not re-signed, the resolver returned
   SERVFAIL, and only with `+cd` (checking disabled) `192.0.2.66` (RFC 4035
   §5.5). A zone with no DS is insecure and resolves as before. Most devices
   trust the AD bit from their resolver, so that hop must be trusted too.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Signature | ECDSAP256SHA256 (13) and RSASHA256 (8): MUST implement; ED25519 (15): RECOMMENDED; ECDSAP384SHA384 (14), ED448 (16): MAY | RFC 6605, RFC 5702, RFC 8080; levels in RFC 9904 | RSASHA1 (5), RSASHA1-NSEC3-SHA1 (7): MUST NOT sign (RFC 9905); RSASHA512 (10): NOT RECOMMENDED; RSAMD5 (1), DSA (3, 6), ECC-GOST (12): MUST NOT |
| Signature, post-quantum | ML-DSA-44 (18): number assigned, MAY | individual IETF draft (2026) | — |
| Hash (DS digest) | SHA-256 (2): MUST implement; SHA-384 (4): MAY | RFC 4509 (2006), RFC 6605 | SHA-1 (1): no new DS since RFC 8624, still validated; GOST R 34.11-94 (3) |
| Hash (NSEC3) | SHA-1 (1), the only one defined, with 0 extra iterations and no salt | RFC 5155, RFC 9276 (2022) | extra iterations (MUST be 0), salts (SHOULD NOT) |
| MAC | none in DNSSEC; zone transfers and updates use TSIG with HMAC-SHA256 | RFC 8945 (2020) | HMAC-MD5 (MUST NOT), HMAC-SHA1 (NOT RECOMMENDED) |
| Key exchange, cipher, KDF | none | — | — |

RFC 9904 copied RFC 8624's levels into new IANA registry columns, so a change
is a registry update, and a new algorithm can get a number at MAY. RFC 9905
then made zones signed only with algorithm 5 or 7 insecure to validators.

**Post-quantum.** A quantum computer could forge every signature above, but
only from the day it exists: there is no encrypted traffic to store and break
later. The hard part is size. ML-DSA-44 has a 2,420-byte signature and a
1,312-byte key, against 64 bytes each for P-256, and answers over the
1,232-byte UDP size above must go over TCP. In August 2026 IANA gave ML-DSA-44
number 18 at MAY, from an individual draft; it is not a standard. The Merkle
Tree Ladder (MTL) drafts sign a "ladder" of Merkle tree hashes with ML-DSA or
SLH-DSA, so each RRSIG carries only a short path up to it.

## The root key

KSK-2017 (key tag 20326) replaced the first root key, KSK-2010, on 11 October
2018. KSK-2024 (key tag 38696) has been in the root's DNSKEY set since 11
January 2025 and has signed it since 11 October 2026; ICANN reported on 15
October that the rollover went as planned. KSK-2017 is due to be revoked in
January 2027, when the REVOKE bit (flags 385) turns its tag into 20454. Both
are 2048-bit RSA (algorithm 8). Resolvers trust a new root key after RFC 5011's
30-day hold-down; a key fixed in a config file breaks, and BIND warns "static
entry for the root zone WILL FAIL after key rollover". ICANN has proposed
(February 2026) an ECDSA P-256 KSK from 2027.

## Seeing it on your machine

```
dnssec-keygen -a ECDSAP256SHA256 -f KSK example.     # KSK, flags 257; prints Kexample.+013+<tag>
dnssec-keygen -a ECDSAP256SHA256 example.            # ZSK, flags 256
dnssec-signzone -S -3 - -H 0 -o example. example.db  # NSEC3 1 0 0 -; DS in dsset-example.
ldns-nsec3-hash -t 0 nope.example.                   # NSEC3 hash of a name: 4cs2e7i4…
ldns-key2ds -n -2 /usr/share/dns/root.key            # DS of the root keys (apt install dns-root-data)
delv . DNSKEY                                        # validates the root key set itself
```

- **Python:** the key tag and DS of a DNSKEY record pasted on one line, or
  press Enter for KSK-2024 from `/usr/share/dns/root.key`.

```python
import base64, hashlib

rr = input("DNSKEY record: ").strip() or (". IN DNSKEY 257 3 8 "
    "AwEAAa96jeuknZlaeSrvyAJj6ZHv28hhOKkx3rLGXVaC6rXTsDc449/cidltpkyG"
    "wCJNnOAlFNKF2jBosZBU5eeHspaQWOmOElZsjICMQMC3aeHbGiShvZsx4wMYSjH8"
    "e7Vrhbu6irwCzVBApESjbUdpWWmEnhathWu1jo+siFUiRAAxm9qyJNg/wOZqqzL/"
    "dL/q8PkcRU5oUKEpUge71M3ej2/7CPqpdVwuMoTvoB+ZOT4YeGyxMvHmbrxlFzGO"
    "HOijtzN+u1TQNatX2XBuzZNQ1K+s2CXkPIZo7s6JgZyvaBevYtxPvYLw4z9mR7K2"
    "vaF18UYH9Z9GNUUeayffKC73PYc=")
f = rr.split(";")[0].replace("(", " ").replace(")", " ").split()
i = f.index("DNSKEY")
flags, proto, alg = int(f[i + 1]), int(f[i + 2]), int(f[i + 3])
key = base64.b64decode("".join(f[i + 4:]))
rdata = flags.to_bytes(2, "big") + bytes([proto, alg]) + key
name = f[0].lower()                         # wire format: length-prefixed labels, then 0
wire = b"".join(bytes([len(x)]) + x.encode() for x in name.split(".") if x) + b"\0"

acc = sum(b if n % 2 else b << 8 for n, b in enumerate(rdata))   # RFC 4034 Appendix B
tag = (acc + (acc >> 16)) & 0xFFFF
print("key tag ", tag, "(KSK)" if flags & 1 else "(ZSK)")
print("DS      ", name, "IN DS", tag, alg, 2, hashlib.sha256(wire + rdata).hexdigest().upper())
```

```
key tag  38696 (KSK)
DS       . IN DS 38696 8 2 683D2D0ACB8C9B712A1948B27F741219298D0A450D612C483AF444A4C0FB2B16
```

The DS matches `/usr/share/dns/root.ds`; KSK-2017 gives 20326, `E06D44B8…`.
The keys in RFC 4509 §2.3 and RFC 6605 §6.1 give the RFCs' own DS records
(60485 `D4B7D520…`, 55648 `B4C8C1FE…`); the stand-in's KSK gives 6703 above.

## See also

- [PKI](PKI.md): the other chain of trust; DANE (RFC 6698) pins a server's TLS key in a DNSSEC-signed TLSA record
- [TLS 1.3](TLS-1.3.md): what DNS over TLS and HTTPS run on, to hide the query rather than sign the answer
- [ECDSA](../02-signatures/ECDSA.md) / [RSA](../02-signatures/RSA.md) / [EdDSA](../02-signatures/EdDSA.md) / [ML-DSA](../02-signatures/ML-DSA.md): the signature algorithms in depth
- [VRF](../11-advanced/VRF.md) / [Secret sharing](../11-advanced/Secret-Sharing.md): NSEC5, a fix for NSEC3 zone listing; how the root KSK's backups are split

## References

- [RFC 4033: DNSSEC introduction](https://www.rfc-editor.org/rfc/rfc4033) / [RFC 4034: resource records](https://www.rfc-editor.org/rfc/rfc4034) (Sections 2.1.1, 3.1.8.1, 5.1.4, Appendix B) / [RFC 4035: protocol](https://www.rfc-editor.org/rfc/rfc4035) (Sections 3.2.3, 4.3, 5.5) / [RFC 9364: BCP 237](https://www.rfc-editor.org/rfc/rfc9364)
- [RFC 5155: NSEC3](https://www.rfc-editor.org/rfc/rfc5155) / [RFC 9276: NSEC3 parameters](https://www.rfc-editor.org/rfc/rfc9276) (Section 3.1) / [RFC 5702: RSA/SHA-2](https://www.rfc-editor.org/rfc/rfc5702) / [RFC 6605: ECDSA](https://www.rfc-editor.org/rfc/rfc6605) (Sections 4, 6.1) / [RFC 8080: Ed25519 and Ed448](https://www.rfc-editor.org/rfc/rfc8080) / [RFC 4509: SHA-256 DS](https://www.rfc-editor.org/rfc/rfc4509) (Section 2.3)
- [RFC 9904: algorithm recommendation process](https://www.rfc-editor.org/rfc/rfc9904) ([source](https://github.com/ietf-wg-dnsop/draft-ietf-dnsop-algorithm-update)) / [RFC 9905: deprecating SHA-1](https://www.rfc-editor.org/rfc/rfc9905) ([source](https://github.com/ietf-wg-dnsop/draft-ietf-dnsop-must-not-sha1)) / [RFC 8624](https://www.rfc-editor.org/rfc/rfc8624) (Section 3)
- [RFC 5011: trust anchor updates](https://www.rfc-editor.org/rfc/rfc5011) / [RFC 6781: operational practices](https://www.rfc-editor.org/rfc/rfc6781) / [RFC 7344: CDS](https://www.rfc-editor.org/rfc/rfc7344) / [RFC 8945: TSIG](https://www.rfc-editor.org/rfc/rfc8945) / [RFC 7858](https://www.rfc-editor.org/rfc/rfc7858), [RFC 8484](https://www.rfc-editor.org/rfc/rfc8484), [RFC 9250](https://www.rfc-editor.org/rfc/rfc9250): DNS over TLS, HTTPS, QUIC
- [draft-westerbaan-dnssec-mldsa](https://datatracker.ietf.org/doc/draft-westerbaan-dnssec-mldsa/) ([source](https://github.com/bwesterb/draft-westerbaan-dnssec-mldsa), "Codepoint assigned: 18!", 11 Aug 2026) / [draft-kaizer-dnsop-ml-dsa-mtl-dnssec](https://datatracker.ietf.org/doc/draft-kaizer-dnsop-ml-dsa-mtl-dnssec/) / [draft-fregly-dnsop-slh-dsa-mtl-dnssec](https://datatracker.ietf.org/doc/draft-fregly-dnsop-slh-dsa-mtl-dnssec/) / [Verisign MTL library](https://github.com/verisign/MTL) (`src/mtllib.h`)
- [IANA root trust anchors](https://data.iana.org/root-anchors/root-anchors.xml) / [BIND 9.18 `bind.keys`](https://github.com/isc-projects/bind9/blob/bind-9.18/bind.keys) / [IANA DNSSEC algorithm numbers](https://www.iana.org/assignments/dns-sec-alg-numbers/) / [ICANN: Root Zone KSK Rollover](https://www.icann.org/resources/pages/ksk-rollover-en) / [rollover completed (15 Oct 2026)](https://www.icann.org/en/announcements/details/icann-reports-root-zone-ksk-rollover-completed-as-planned-15-10-2026-en) / [first rollover completed (15 Oct 2018)](https://www.icann.org/en/announcements/details/first-root-ksk-rollover-successfully-completed-15-10-2018-en) / [KSK algorithm rollover proposal (Feb 2026)](https://itp.cdn.icann.org/en/files/domain-name-system-dns-engineering/proposal-for-root-zone-ksk-algorithm-rollover-03-02-2026-en.pdf)

*Weaker sources:* search-engine summaries of ICANN's announcements (2018 and
2026 rollovers, 2027 revocation, 2026 proposal), of Verisign and NOG reports
(KSK-2024 published 11 January 2025) and of RFC Editor dates for RFC 9364, 9904, 9905.
