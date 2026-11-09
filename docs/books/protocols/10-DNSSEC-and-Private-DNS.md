# 10. DNSSEC and private DNS

*Before a browser opens a TLS connection, before SSH checks a host key, before
a mail server looks for a recipient, something has to turn a name into an
address. That something is the Domain Name System, and for most of its life it
has trusted whatever answer arrived first. This chapter covers the two
separate fixes. DNSSEC signs the answers, so a resolver can check that a record
is the one the zone's owner published; you will verify a real signature from
an RFC, build a chain of trust from a trust anchor down to a name, hash and then
un-hash NSEC3 records, compute the root zone's own key fingerprint, and publish
the DANE record that lets a mail server prove its key without a CA. Private
DNS encrypts the questions, so the network in between cannot read or change
them; you will build a DNS-over-HTTPS request byte for byte. In between: cache
poisoning, the Kaminsky attack, the key ceremonies that guard the root, and why
signed data suits a city twenty light-minutes from its nearest root server.*

!!! abstract "In this chapter"
    **You will learn:**

    - how DNS resolution works, and why answers could be forged: cache
      poisoning, the Kaminsky attack, and hijacking;
    - DNSSEC's records (DNSKEY, RRSIG, DS) and the chain of trust from the root,
      by verifying real signatures;
    - how to compute a key tag and a DS digest, by hand and in code;
    - how DNSSEC proves that a name does *not* exist, with NSEC and NSEC3, and
      how that leaks the zone's contents (RFC 5155's example zone cracked);
    - how validation fails in practice, and the KeyTrap denial of service;
    - the root key, its ceremonies, and key and algorithm rollovers;
    - DANE and other uses of signed DNS, with DANE for mail and MTA-STS;
    - DNS over TLS, HTTPS and QUIC, Oblivious DoH, and what each hides from whom.

    **You need:** [Chapter 2](02-Certificates-and-PKI.md) (chains of trust) and
    [Chapter 3](03-TLS-1.3-Message-by-Message.md) for the encrypted transports;
    ECDSA and RSA signatures from Chapters
    [13](../../book/13-RSA.md) and [15](../../book/15-Elliptic-Curves.md) of book 1.

    **Levels:** §10.1 to §10.3 are for beginners, §10.4 to §10.13 are
    intermediate, §10.14 is expert.

## 10.1 The problem

*Level: beginner.*

Paul Mockapetris designed the Domain Name System in 1983 to replace a single
file of host names that every machine on the ARPANET downloaded. DNS is a
distributed database: the **root** knows who runs each top-level domain such as
`mars.` or `com.`, those know who runs each name below them, and so on. Each
zone's data is served by its **authoritative** servers. Your device asks a
**recursive resolver** (run by your Internet provider, your company, or a
public service), which walks down from the root, caches what it learns, and
returns the answer.

The protocol sends questions and answers in single UDP packets, in the clear,
with no authentication. A resolver accepts an answer if it arrives from the
right address, to the right port, with the same 16-bit **query ID** as the
question. Everything else is trust. That made three attacks possible:

- **On-path tampering.** Anyone between you and your resolver, or between the
  resolver and an authoritative server, can read the questions and change the
  answers. National firewalls do this at scale, injecting false answers for
  blocked names.
- **Off-path cache poisoning.** An attacker who is not on the path can still
  send forged answers to a resolver and hope one matches before the real answer
  arrives. A successful forgery is cached and served to every user of that
  resolver until it expires.
- **Hijacking above DNS.** An attacker who takes over a domain's registrar
  account, or announces the authoritative servers' addresses with false
  routes, controls the answers at the source.

Every security protocol in this book that starts from a name depends on DNS.
TLS limits the damage, because a forged address leads to a server that cannot
present a valid certificate for the name. But not everything is TLS, and
certificate authorities themselves use DNS to check who controls a domain
(Chapter 2), so a poisoned resolver at a CA can lead to a misissued
certificate.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of DNS security from 1983 to the root key rollover in 2026" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="392" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1983</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">DNS designed by Paul Mockapetris</text>
<text x="78" y="57" text-anchor="end" font-weight="bold" class="acc-fill">1997</text>
<circle cx="92" cy="52" r="4.5" class="acc-fill"/>
<text x="108" y="57" class="acc-fill">cache poisoning used to redirect InterNIC</text>
<text x="78" y="87" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="82" r="3.5"/>
<text x="108" y="87">first DNSSEC design (RFC 2535); too heavy to deploy</text>
<text x="78" y="117" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="112" r="3.5"/>
<text x="108" y="117">DNSSEC redesigned with DS records (RFC 4033 to 4035)</text>
<text x="78" y="147" text-anchor="end" font-weight="bold" class="acc-fill">2008</text>
<circle cx="92" cy="142" r="4.5" class="acc-fill"/>
<text x="108" y="147" class="acc-fill">Kaminsky's attack; NSEC3 (RFC 5155)</text>
<text x="78" y="177" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="172" r="3.5"/>
<text x="108" y="177">the root zone is signed (15 July)</text>
<text x="78" y="207" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="202" r="3.5"/>
<text x="108" y="207">DNS over TLS (RFC 7858)</text>
<text x="78" y="237" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="232" r="3.5"/>
<text x="108" y="237">first root key rollover; DNS over HTTPS (RFC 8484)</text>
<text x="78" y="267" text-anchor="end" font-weight="bold" class="acc-fill">2019</text>
<circle cx="92" cy="262" r="4.5" class="acc-fill"/>
<text x="108" y="267" class="acc-fill">Sea Turtle: state hijacking through registrars</text>
<text x="78" y="297" text-anchor="end" font-weight="bold" class="acc-fill">2020</text>
<circle cx="92" cy="292" r="4.5" class="acc-fill"/>
<text x="108" y="297" class="acc-fill">SAD DNS revives off-path poisoning</text>
<text x="78" y="327" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="322" r="3.5"/>
<text x="108" y="327">DNS over QUIC (RFC 9250); Oblivious DoH (RFC 9230)</text>
<text x="78" y="357" text-anchor="end" font-weight="bold" class="acc-fill">2024</text>
<circle cx="92" cy="352" r="4.5" class="acc-fill"/>
<text x="108" y="357" class="acc-fill">KeyTrap: one packet stalls a validating resolver</text>
<text x="78" y="387" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="382" r="3.5"/>
<text x="108" y="387">second root key rollover, to KSK-2024 (11 October)</text>
</svg>
<figcaption>Figure 10.1. Forty years of DNS security. Signing came slowly; encrypting the questions came later still.</figcaption>
</figure>

## 10.2 Cache poisoning and the Kaminsky attack

*Level: beginner.*

In July 1997 Eugene Kashpureff poisoned resolvers around the Internet so that
visitors to the InterNIC, then the registry for `.com`, landed on his own
alternative registry's site. His trick exploited resolvers that cached extra
records included in an answer, even for names the question had not asked
about. Resolvers were fixed to accept only records "in bailiwick", relevant to
the question, and to check the query ID. Poisoning then looked hard: an
off-path attacker had to guess a 16-bit ID, and could only try while a real
query for that name was outstanding, which happened once per cache lifetime.

In 2008 Dan Kaminsky showed how to make every attempt count. Instead of racing
for `www.bank.example`, the attacker asks the resolver for names that do not
exist and so are never cached: `aaa1.bank.example`, `aaa2.bank.example`, and
so on. Each question starts a new race. The forged answers say nothing about
`aaa1`; they carry a referral: "the name server for `bank.example` is
`ns.attacker.example`, at this address". The record is in bailiwick, so a
resolver that accepts one forged answer hands the attacker the whole domain.

### Break it: how many races?

```python
# Cache poisoning: an off-path attacker must guess the query's 16-bit ID
# (and, after 2008, its source port) before the real answer arrives.
import random
rng = random.Random(2008)
def race(id_bits, port_bits, forged_per_race):
    """One race: the resolver sends one query; the attacker sprays forged answers."""
    secret = rng.getrandbits(id_bits + port_bits)
    return any(rng.getrandbits(id_bits + port_bits) == secret for _ in range(forged_per_race))
# Kaminsky (2008): ask for random names (aaa1.bank.example, aaa2...), so every race
# is a fresh chance; a win plants a forged NS record for the whole bank.example.
for label, id_bits, port_bits in (("ID only, 8-bit toy", 8, 0), ("ID only, 16-bit", 16, 0)):
    races = 1
    while not race(id_bits, port_bits, 100):
        races += 1
    print(f"{label:22s} poisoned after {races} races of 100 forged answers")
for bits, name in ((16, "ID only"), (32, "ID + random port")):
    print(f"{name:22s} expected races: about {2**bits // 100:,}")
```

```text
ID only, 8-bit toy     poisoned after 2 races of 100 forged answers
ID only, 16-bit        poisoned after 741 races of 100 forged answers
ID only                expected races: about 655
ID + random port       expected races: about 42,949,672
```

With only the 16-bit ID, an attacker sending a hundred forgeries per race wins
after a few hundred races, seconds of work. The emergency fix, released by
nearly every DNS vendor on the same day in July 2008, was to **randomize the
source port** of each query as well, adding about 16 more bits to guess. That
raised the cost by a factor of tens of thousands, but did not end the race. In
2020 Keyu Man, Zhiyun Qian and their colleagues showed **SAD DNS**: a side
channel in the way operating systems rate-limit ICMP error messages let an
off-path attacker discover which port a resolver was using, removing most of
the added randomness again.

Port randomization, random capitalization of the query name (the "0x20" trick,
since servers echo the name exactly), and other defenses all make guessing
harder. None makes forgery impossible, because the answer carries no proof of
where it came from. Only a signature does that.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="The Kaminsky attack: the attacker makes the resolver ask for a random name, then floods it with forged answers that carry a false referral; if one matches the ID and port before the real answer, the whole domain is poisoned" fill="currentColor" font-size="13.5">
<rect x="20" y="110" width="140" height="60" rx="6" class="soft" stroke="currentColor"/>
<text x="90" y="137" text-anchor="middle">attacker</text>
<text x="90" y="155" text-anchor="middle" font-size="12">off the path</text>
<rect x="250" y="110" width="140" height="60" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="137" text-anchor="middle">resolver</text>
<text x="320" y="155" text-anchor="middle" font-size="12">cache</text>
<rect x="480" y="110" width="140" height="60" rx="6" class="soft" stroke="currentColor"/>
<text x="550" y="130" text-anchor="middle">bank.example's</text>
<text x="550" y="148" text-anchor="middle">real server</text>
<line x1="160" y1="122" x2="250" y2="122" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,122 238,117 238,127"/>
<text x="205" y="105" text-anchor="middle" font-size="12">1. aaa7.bank.example?</text>
<line x1="390" y1="122" x2="480" y2="122" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,122 468,117 468,127"/>
<text x="435" y="105" text-anchor="middle" font-size="12">2. query, ID, port</text>
<line x1="160" y1="158" x2="250" y2="158" stroke="currentColor" class="acc" stroke-width="2.5"/>
<polygon points="250,158 238,153 238,163" class="acc-fill"/>
<text x="205" y="200" text-anchor="middle" font-size="12" class="acc-fill">3. 100 forged answers,</text>
<text x="205" y="216" text-anchor="middle" font-size="12" class="acc-fill">guessed ID and port, with</text>
<text x="205" y="232" text-anchor="middle" font-size="12" class="acc-fill">"NS for bank.example = evil"</text>
<line x1="480" y1="158" x2="390" y2="158" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="390,158 402,153 402,163"/>
<text x="435" y="200" text-anchor="middle" font-size="12">4. real answer:</text>
<text x="435" y="216" text-anchor="middle" font-size="12">"no such name"</text>
<text x="320" y="270" text-anchor="middle" font-size="12.5">whichever arrives first with the right ID and port wins; a loss costs one more name</text>
</svg>
<figcaption>Figure 10.2. The Kaminsky attack. Asking for names that cannot be cached turns one race per day into unlimited races.</figcaption>
</figure>

## 10.3 DNSSEC: signatures on answers

*Level: beginner.*

DNSSEC's first design (RFC 2065, 1997, and RFC 2535, 1999) was so awkward to
operate that it was rewritten; the version in use today, RFC 4033 to 4035
(2005), adds four record types:

- **DNSKEY** holds a zone's public keys. Most zones have two: a **key-signing
  key** (KSK, flags 257) that signs only the DNSKEY set, and a **zone-signing
  key** (ZSK, flags 256) that signs everything else. The split lets the ZSK be
  changed often without involving the parent.
- **RRSIG** is a signature over one **RRset**, all the records of one name and
  type, with the signing key's tag, the algorithm, and an inception and
  expiration time. Signatures expire, typically after a few weeks, so the zone
  must be re-signed regularly.
- **DS** (delegation signer), published in the **parent** zone, is a hash of the
  child's KSK. It is how a parent vouches for a child: `mars.` signs a DS that
  says "the key of `arcadia.mars.` hashes to this".
- **NSEC** and **NSEC3** prove that a name or type does not exist (§10.5).

A validating resolver checks a chain of signatures up to a key it already
trusts, the **trust anchor**, which in practice is the root zone's KSK, built
into resolver software. For `www.arcadia.mars` it checks: the A record's RRSIG
under the city's ZSK; the city's DNSKEY set under its KSK; the KSK against the
DS in `mars.`; that DS's RRSIG under `mars.`'s ZSK; and so on up to the root,
whose DNSKEY set must be signed by the trust anchor. If every link holds, the
answer is **secure** and the resolver sets the **AD** (authenticated data) bit
in its reply. If any link fails, the answer is **bogus** and the resolver
returns SERVFAIL rather than a forgery. A zone with no DS in its parent is
**insecure**: it resolves as before, unprotected.

<figure class="mars-fig">
<svg viewBox="0 0 640 430" width="640" role="img" aria-label="DNSSEC chain of trust: the trust anchor matches the root KSK, which signs the root DNSKEY set; the root ZSK signs the DS for mars., which hashes the mars. KSK, and so on down to the RRSIG on the A record for www.arcadia.mars" fill="currentColor" font-size="13">
<rect x="20" y="20" width="180" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="110" y="45" text-anchor="middle" font-weight="bold">trust anchor</text>
<text x="215" y="45" font-size="12">built into the resolver</text>
<g>
<rect x="20" y="85" width="600" height="90" rx="6" class="soft" stroke="currentColor"/>
<text x="35" y="105" font-weight="bold">.  (root)</text>
<text x="40" y="128">DNSKEY: KSK, ZSK</text><text x="40" y="150">RRSIG(DNSKEY) by KSK</text>
<text x="340" y="128">DS for mars. = hash(mars. KSK)</text><text x="340" y="150">RRSIG(DS) by root ZSK</text>
</g>
<g>
<rect x="20" y="200" width="600" height="90" rx="6" class="soft" stroke="currentColor"/>
<text x="35" y="220" font-weight="bold">mars.</text>
<text x="40" y="243">DNSKEY: KSK, ZSK</text><text x="40" y="265">RRSIG(DNSKEY) by KSK</text>
<text x="340" y="243">DS for arcadia.mars. = hash(KSK)</text><text x="340" y="265">RRSIG(DS) by mars. ZSK</text>
</g>
<g>
<rect x="20" y="315" width="600" height="90" rx="6" class="soft" stroke="currentColor"/>
<text x="35" y="335" font-weight="bold">arcadia.mars.</text>
<text x="40" y="358">DNSKEY: KSK, ZSK</text><text x="40" y="380">RRSIG(DNSKEY) by KSK</text>
<text x="340" y="358" class="acc-fill">www A 10.20.0.5</text><text x="340" y="380" class="acc-fill">RRSIG(A) by ZSK</text>
</g>
<line x1="110" y1="60" x2="110" y2="85" stroke="currentColor" class="acc" stroke-width="2"/>
<line x1="420" y1="160" x2="110" y2="228" stroke="currentColor" class="acc" stroke-width="2"/>
<line x1="420" y1="275" x2="110" y2="343" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="320" y="425" text-anchor="middle" font-size="12.5">each accent line: "this key is the one the level above vouched for"</text>
</svg>
<figcaption>Figure 10.3. The chain of trust. Each parent signs a hash of its child's KSK; each KSK signs its own zone's keys; each ZSK signs the data.</figcaption>
</figure>

Two design choices stand out. First, **nothing is encrypted**: DNS data is
public, and DNSSEC answers only "is this the record the owner published?" Second,
**signatures are made in advance**, not per query, so any server or cache can
hand them out without holding a private key, and a signed zone can be copied
anywhere. That is the opposite of TLS, which authenticates a live connection,
and it is why DNSSEC suits delayed and disconnected networks (§10.12).

### By hand: a key tag and a DS digest

Every DS and every RRSIG names its key by a **key tag**, a 16-bit number
computed from the DNSKEY's RDATA (RFC 4034 Appendix B): add up the RDATA as
16-bit big-endian words, fold the carry above bit 16 back in once, and keep the
low 16 bits:

$$
\begin{aligned}
A &= \textstyle\sum_i w_i, \\
\text{tag} &= \left(A + \left\lfloor A / 2^{16} \right\rfloor\right) \bmod 2^{16}.
\end{aligned}
$$

Take a toy DNSKEY whose key is only four bytes long. Its RDATA is `01 01`
(flags 257: a zone key with the "secure entry point" bit, a KSK), `03` (the
protocol field, always 3), `0D` (algorithm 13, ECDSA P-256 with SHA-256), then
the key bytes `AB CD EF 12`:

| Word | Hex | Decimal |
| --- | --- | ---: |
| flags | `0101` | 257 |
| protocol, algorithm | `030D` | 781 |
| key, first half | `ABCD` | 43,981 |
| key, second half | `EF12` | 61,202 |
| sum $A$ | `19EED` | 106,221 |

The sum overflows by one carry: `0x9EED + 0x1 = 0x9EEE`, so the tag is
**40,686**. A key tag is an end-around-carry checksum, like an IP header's:
cheap, good enough for quick lookup, and trivial to aim, since the last two
bytes of a key can make the tag anything. §10.6 shows what an attacker does
with that.

The binding between parent and child is the **DS digest**, not the tag: a
hash of the child's owner name in wire form followed by the same DNSKEY RDATA:

$$
\text{DS digest} = \text{SHA-256}\big(\text{owner name} \,\|\, \text{DNSKEY RDATA}\big).
$$

For `arcadia.mars.` the owner name is fourteen bytes, each label preceded by
its length and the whole ended by a zero: `07` `a r c a d i a` `04` `m a r s`
`00`. The DS RDATA is then 36 bytes: key tag (2), algorithm (1), digest type
(1; type 2 is SHA-256) and digest (32). SHA-1 DS records
(type 1) linger in old zones; RFC 8624 (2019) forbade creating new ones, and
RFC 9905 (2025) repeats it. §10.7 runs these steps on RFC 4034's own example
and on the root zone's keys.

## 10.4 Code it: verifying real signatures

*Level: intermediate.*

RFC 6605, which added ECDSA to DNSSEC in 2012, prints an example zone: a P-256
KSK for `example.net`, its DS record, and a signed A record for
`www.example.net`. The program below takes those bytes exactly as printed and
checks everything: that the private key matches the public key, that the key
tag and DS digest come out as the RFC says, and that the RRSIG is a valid
ECDSA signature over the record. The data to be signed is the RRSIG's own
fields (type covered, algorithm, number of labels, original TTL, expiration,
inception, key tag, signer name) followed by the RRset in **canonical form**:
lowercase names, records sorted, each with its owner, type, class, TTL and data
(RFC 4034 §3.1.8.1).

```python
# Verify a real DNSSEC signature: RFC 6605's example, ECDSA P-256 (algorithm 13).
# Key tag, DS record and RRSIG, all from the bytes printed in the RFC.
import base64, hashlib, struct, calendar, time

p = 2**256 - 2**224 + 2**192 + 2**96 - 1
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
G = (0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296,
     0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5)
def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    if P == Q: l = (3 * P[0] * P[0] - 3) * pow(2 * P[1], -1, p) % p
    else:      l = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x = (l * l - P[0] - Q[0]) % p
    return (x, (l * (P[0] - x) - P[1]) % p)
def mul(k, P):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1": R = add(R, P)
    return R
def ecdsa_verify(pub, digest, sig):
    r, s = int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")
    if not (0 < r < n and 0 < s < n): return False
    w, e = pow(s, -1, n), int.from_bytes(digest, "big")
    X = add(mul(e * w % n, G), mul(r * w % n, pub))
    return X is not None and X[0] % n == r

def wire(name):                           # canonical wire form: lowercase labels
    return b"".join(bytes([len(l)]) + l.lower().encode() for l in name.split(".") if l) + b"\0"
def key_tag(rdata):                       # RFC 4034 Appendix B
    acc = sum(b if i % 2 else b << 8 for i, b in enumerate(rdata))
    return (acc + (acc >> 16)) & 0xffff
def ts(s): return calendar.timegm(time.strptime(s, "%Y%m%d%H%M%S"))

# From RFC 6605 section 6.1:
key_b64 = ("GojIhhXUN/u4v54ZQqGSnyhWJwaubCvTmeexv7bR6edb"
           "krSqQpF64cYbcB7wNcP+e+MAnLr+Wi9xMWyQLc8NAA==")
dnskey = struct.pack(">HBB", 257, 3, 13) + base64.b64decode(key_b64)
pub = (int.from_bytes(dnskey[4:36], "big"), int.from_bytes(dnskey[36:], "big"))
priv = int.from_bytes(base64.b64decode("GU6SnQ/Ou+xC5RumuIUIuJZteXT2z0O/ok1s38Et6mQ="), "big")
print("public key = private key x G:", mul(priv, G) == pub)
tag = key_tag(dnskey)
ds = hashlib.sha256(wire("example.net.") + dnskey).hexdigest()
print("key tag:", tag, "  DS digest:", ds[:24] + "...")
print("DS matches the RFC:", ds == "b4c8c1fe2e7477127b27115656ad6256f424625bf5c1e2770ce6d6e37df61d17")

def rrsig_data(type_covered, labels, ttl, expire, incept, tag, signer, owner, rdatas):
    head = struct.pack(">HBBIIIH", type_covered, 13, labels, ttl, ts(expire), ts(incept), tag)
    head += wire(signer)
    rrs = sorted(rdatas)                  # canonical order of the RRset
    return head + b"".join(wire(owner) + struct.pack(">HHIH", type_covered, 1, ttl, len(r)) + r
                           for r in rrs)
A = 1
signed = rrsig_data(A, 3, 3600, "20100909100439", "20100812100439", 55648, "example.net.",
                    "www.example.net.", [bytes([192, 0, 2, 1])])
sig = base64.b64decode("qx6wLYqmh+l9oCKTN6qIc+bw6ya+KJ8oMz0YP107epXA"
                       "yGmt+3SNruPFKG7tZoLBLlUzGGus7ZwmwWep666VCw==")
print("RRSIG on www.example.net A 192.0.2.1 valid:",
      ecdsa_verify(pub, hashlib.sha256(signed).digest(), sig))
forged = rrsig_data(A, 3, 3600, "20100909100439", "20100812100439", 55648, "example.net.",
                    "www.example.net.", [bytes([203, 0, 113, 66])])
print("same signature on A 203.0.113.66 valid:",
      ecdsa_verify(pub, hashlib.sha256(forged).digest(), sig))
```

```text
public key = private key x G: True
key tag: 55648   DS digest: b4c8c1fe2e7477127b271156...
DS matches the RFC: True
RRSIG on www.example.net A 192.0.2.1 valid: True
same signature on A 203.0.113.66 valid: False
```

The signature was made in 2010 with a random nonce by the RFC's authors; this
program has never seen their software, and the signature checks. Changing the
address by one byte makes it fail.

Now a whole chain. The next program signs a zone `arcadia.mars.` with its own
KSK and ZSK, puts a DS for it into a stand-in parent zone `mars.` (whose KSK
plays the role of the trust anchor), and validates an answer the way a resolver
does, link by link.

```python
# Uses wire(), key_tag(), rrsig_data(), mul() and ecdsa_verify() from the listing above.
# Sign a small zone with a KSK and a ZSK, publish a DS in the parent, and
# validate down the chain from a trust anchor.
def ecdsa_sign(priv, digest):             # deterministic nonce for a repeatable run;
    k = int.from_bytes(hashlib.sha256(priv.to_bytes(32, "big") + digest).digest(), "big") % n
    r = mul(k, G)[0] % n                  # real signers use RFC 6979 or a fresh random k
    s = pow(k, -1, n) * (int.from_bytes(digest, "big") + r * priv) % n
    return r.to_bytes(32, "big") + s.to_bytes(32, "big")
DNSKEY, DS, INCEPT, EXPIRE = 48, 43, "20261101000000", "20261201000000"

class Zone:
    def __init__(self, name, seed):
        self.name, self.records = name, {}
        self.ksk = int.from_bytes(hashlib.sha256(seed + b" KSK").digest(), "big") % n
        self.zsk = int.from_bytes(hashlib.sha256(seed + b" ZSK").digest(), "big") % n
        self.ksk_rd, self.zsk_rd = self.dnskey(257, self.ksk), self.dnskey(256, self.zsk)
        self.records[(name, DNSKEY)] = [self.ksk_rd, self.zsk_rd]
    def dnskey(self, flags, priv):
        P = mul(priv, G)
        return struct.pack(">HBB", flags, 3, 13) + P[0].to_bytes(32, "big") + P[1].to_bytes(32, "big")
    def ds_for(self, child):              # DS RDATA: key tag, algorithm, digest type 2, SHA-256
        return (struct.pack(">HBB", key_tag(child.ksk_rd), 13, 2) +
                hashlib.sha256(wire(child.name) + child.ksk_rd).digest())
    def sign(self, owner, rtype):
        key, kd = (self.ksk, self.ksk_rd) if rtype == DNSKEY else (self.zsk, self.zsk_rd)
        labels = len([l for l in owner.split(".") if l])
        data = rrsig_data(rtype, labels, 3600, EXPIRE, INCEPT, key_tag(kd), self.name,
                          owner, self.records[(owner, rtype)])
        return (key_tag(kd), ecdsa_sign(key, hashlib.sha256(data).digest()))

mars = Zone("mars.", b"stand-in parent zone")
city = Zone("arcadia.mars.", b"arcadia city zone")
city.records[("www.arcadia.mars.", A)] = [bytes([10, 20, 0, 5])]
mars.records[("arcadia.mars.", DS)] = [mars.ds_for(city)]
sigs = {(z.name, owner, t): z.sign(owner, t)
        for z in (mars, city) for (owner, t) in z.records}

def check(zone_name, owner, rtype, rdatas, keys):
    tag, sig = sigs[(zone_name, owner, rtype)]
    labels = len([l for l in owner.split(".") if l])
    data = rrsig_data(rtype, labels, 3600, EXPIRE, INCEPT, tag, zone_name, owner, rdatas)
    for k in keys:
        if key_tag(k) == tag:
            P = (int.from_bytes(k[4:36], "big"), int.from_bytes(k[36:], "big"))
            if ecdsa_verify(P, hashlib.sha256(data).digest(), sig): return True
    return False
def validate(answer, trust_anchor):
    mars_keys = mars.records[("mars.", DNSKEY)]
    city_keys = city.records[("arcadia.mars.", DNSKEY)]
    ds = mars.records[("arcadia.mars.", DS)]
    ksk = [k for k in city_keys if key_tag(k) == int.from_bytes(ds[0][:2], "big")][0]
    steps = [
        ("mars. DNSKEY", check("mars.", "mars.", DNSKEY, mars_keys, [trust_anchor])),
        ("arcadia.mars. DS", check("mars.", "arcadia.mars.", DS, ds, mars_keys)),
        ("KSK matches DS", hashlib.sha256(wire("arcadia.mars.") + ksk).digest() == ds[0][4:]),
        ("arcadia.mars. DNSKEY", check("arcadia.mars.", "arcadia.mars.", DNSKEY, city_keys, [ksk])),
        ("www A", check("arcadia.mars.", "www.arcadia.mars.", A, answer, city_keys))]
    for what, ok in steps:
        if not ok: return "bogus at " + what + ": SERVFAIL"
    return "secure (AD bit set): " + ".".join(str(b) for b in answer[0])

anchor = mars.ksk_rd                      # the validator's configured trust anchor
print("genuine answer: ", validate([bytes([10, 20, 0, 5])], anchor))
print("spoofed answer: ", validate([bytes([10, 66, 6, 6])], anchor))
print("wrong anchor:   ", validate([bytes([10, 20, 0, 5])], city.zsk_rd))
```

```text
genuine answer:  secure (AD bit set): 10.20.0.5
spoofed answer:  bogus at www A: SERVFAIL
wrong anchor:    bogus at mars. DNSKEY: SERVFAIL
```

A forged address fails at the last link, and a resolver configured with the
wrong anchor fails at the first. What the program does not show is just as
important: if the attacker could remove the DS record from the parent's answer,
the child would look **insecure** rather than bogus, and an unsigned forgery
would be accepted. DNSSEC prevents that by requiring the parent to *prove* that
there is no DS, with a signed denial, which is the subject of the next section.

## 10.5 Proving that a name does not exist

*Level: intermediate.*

Signatures are made in advance, so a server cannot sign "there is no
`nope.arcadia.mars`" when someone asks; it does not know which names will be
asked about. DNSSEC's answer is to sign the **gaps**. Sort the zone's names in
canonical order, and for each name publish an **NSEC** record that names the
*next* name and lists the record types the current one has:

```text
mail.arcadia.mars.  NSEC  vpn.arcadia.mars.  A AAAA RRSIG NSEC
```

A query for `nope.arcadia.mars` gets this signed record in reply: `nope` sorts
between `mail` and `vpn`, so it does not exist. The same record also proves
that `mail` has no MX record, since MX is not in its type list.

The flaw is plain: by following the chain from the first name to the next and
the next, anyone can list every name in the zone, which is called **zone
walking**. Some zone owners did not mind; others, notably top-level domain
registries bound by privacy rules, refused to deploy DNSSEC until it was fixed.

**NSEC3** (RFC 5155, 2008) hashes the names first. Each name is replaced by the
SHA-1 hash of its wire form plus a salt, iterated some number of times and
written in base32. The NSEC3 records then chain the *hashes* in sorted order,
and a denial says "the hash of the name you asked for falls between these two
hashes". An observer collects hashes, not names. But the hash is unkeyed, so
anyone can hash candidate names and compare: zone walking becomes a dictionary
attack, and ordinary host names fall quickly.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="NSEC versus NSEC3: NSEC records chain the zone's names in order, revealing them; NSEC3 records chain hashes of the names, which a dictionary can still reverse" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">NSEC: chain of names</text>
<rect x="20" y="34" width="110" height="34" rx="5" class="soft" stroke="currentColor"/><text x="75" y="56" text-anchor="middle">arcadia.mars</text>
<rect x="165" y="34" width="80" height="34" rx="5" class="soft" stroke="currentColor"/><text x="205" y="56" text-anchor="middle">mail</text>
<rect x="280" y="34" width="80" height="34" rx="5" class="soft" stroke="currentColor"/><text x="320" y="56" text-anchor="middle">vpn</text>
<rect x="395" y="34" width="80" height="34" rx="5" class="soft" stroke="currentColor"/><text x="435" y="56" text-anchor="middle">www</text>
<line x1="130" y1="51" x2="165" y2="51" stroke="currentColor"/><polygon points="165,51 155,46 155,56"/>
<line x1="245" y1="51" x2="280" y2="51" stroke="currentColor"/><polygon points="280,51 270,46 270,56"/>
<line x1="360" y1="51" x2="395" y2="51" stroke="currentColor"/><polygon points="395,51 385,46 385,56"/>
<text x="490" y="56" font-size="12.5" class="acc-fill">walk: every name</text>
<text x="20" y="112" font-weight="bold">NSEC3: chain of hashes</text>
<rect x="20" y="124" width="110" height="34" rx="5" class="soft" stroke="currentColor"/><text x="75" y="146" text-anchor="middle">0p9mhave…</text>
<rect x="165" y="124" width="110" height="34" rx="5" class="soft" stroke="currentColor"/><text x="220" y="146" text-anchor="middle">2t7b4g4v…</text>
<rect x="310" y="124" width="110" height="34" rx="5" class="soft" stroke="currentColor"/><text x="365" y="146" text-anchor="middle">35mthgpg…</text>
<line x1="130" y1="141" x2="165" y2="141" stroke="currentColor"/><polygon points="165,141 155,136 155,146"/>
<line x1="275" y1="141" x2="310" y2="141" stroke="currentColor"/><polygon points="310,141 300,136 300,146"/>
<text x="435" y="146" font-size="12.5">walk: every hash</text>
<rect x="20" y="186" width="600" height="44" rx="5" class="soft-acc" stroke="currentColor"/>
<text x="320" y="205" text-anchor="middle" class="acc-fill">then hash a dictionary offline: SHA-1(name ‖ salt), iterated</text>
<text x="320" y="222" text-anchor="middle" class="acc-fill">common names are recovered; only unguessable ones stay hidden</text>
</svg>
<figcaption>Figure 10.4. Two ways to sign a gap. NSEC3 turns zone walking into an offline dictionary attack, which is slower but still works.</figcaption>
</figure>

### Code it: NSEC3 hashes, and reversing them

```python
# NSEC3 (RFC 5155): owner names are hashed, so "nothing exists between these two
# hashes" does not list the names. Check the hash, then reverse it with a dictionary.
import base64, hashlib
def wire(name):
    return b"".join(bytes([len(l)]) + l.lower().encode() for l in name.split(".") if l) + b"\0"
B32HEX = str.maketrans("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", "0123456789ABCDEFGHIJKLMNOPQRSTUV")
def nsec3_hash(name, salt=b"", iterations=0):
    h = hashlib.sha1(wire(name) + salt).digest()
    for _ in range(iterations):
        h = hashlib.sha1(h + salt).digest()
    return base64.b32encode(h).decode().translate(B32HEX).lower()

# RFC 5155 Appendix A: salt aabbccdd, 12 extra iterations.
salt = bytes.fromhex("aabbccdd")
print("H(example)     =", nsec3_hash("example", salt, 12))
print("H(ns1.example) =", nsec3_hash("ns1.example", salt, 12))
# The BIND run in this chapter (no salt, no extra iterations, as RFC 9276 asks):
print("H(example), BIND run      =", nsec3_hash("example")[:8], "...")
print("H(nope.example), BIND run =", nsec3_hash("nope.example")[:8], "...")

# Zone enumeration: collect hashes from denial answers, then hash a dictionary.
zone = ["www", "mail", "vpn", "hr-payroll", "habitat-7-airlock", "ns1"]
collected = {nsec3_hash(w + ".arcadia.mars") for w in zone}       # what an attacker gathers
guesses = ["www", "mail", "ftp", "vpn", "dev", "ns1", "ns2", "hr-payroll", "test"]
found = [g for g in guesses if nsec3_hash(g + ".arcadia.mars") in collected]
print("names recovered from hashes:", found, f"({len(found)} of {len(zone)})")
```

```text
H(example)     = 0p9mhaveqvm6t7vbl5lop2u3t2rp3tom
H(ns1.example) = 2t7b4g4vsa5smi47k61mv5bv1a22bojr
H(example), BIND run      = 3msev9us ...
H(nope.example), BIND run = 4cs2e7i4 ...
names recovered from hashes: ['www', 'mail', 'vpn', 'ns1', 'hr-payroll'] (5 of 6)
```

The program reproduces the hashes listed in RFC 5155's example zone (salt
`aabbccdd`, 12 extra iterations) and the two hashes from a zone signed with BIND
9.18 in October 2026 (no salt, no extra iterations), then recovers five of six
names of a zone from their hashes with a nine-word dictionary. Only the name no
one would guess survives.

### The RFC's whole zone: a hashed ring and a denial

The hash is defined recursively, with $H$ the SHA-1 function, $x$ the owner
name in wire form, $s$ the salt and $k$ the number of extra iterations:

$$
\begin{aligned}
IH(s, x, 0) &= H(x \,\|\, s), \\
IH(s, x, k) &= H\big(IH(s, x, k-1) \,\|\, s\big),
\end{aligned}
$$

written in base32 with the "extended hex" alphabet, digits first, so that
sorting the text sorts the hashes. Twelve iterations mean 13 SHA-1 calls per
name. RFC 5155's Appendix A is a complete signed zone, `example.`, and its
Appendix B shows the server's answers. The program hashes every name that gets
an NSEC3 record, sorts the hashes into the ring the records form (the last
points back to the first), and builds the proof for the RFC's first question,
`a.c.x.w.example`, which does not exist.

```python
# Uses nsec3_hash() from the listing above.
# RFC 5155 Appendix A: the whole example zone. Hash every name that gets an NSEC3
# record, sort the hashes into a ring, then answer the RFC's query a.c.x.w.example.
salt, its = bytes.fromhex("aabbccdd"), 12
names = ["example", "a.example", "ai.example", "ns1.example", "ns2.example", "w.example",
         "*.w.example", "x.w.example", "y.w.example", "x.y.w.example", "xx.example",
         "2t7b4g4vsa5smi47k61mv5bv1a22bojr.example"]
owner = {nsec3_hash(n, salt, its): n for n in names}
ring = sorted(owner)
for i, h in enumerate(ring):
    print(f"{h[:8]}  ({owner[h]:>14.14s})  next {ring[(i + 1) % len(ring)][:8]}")
rfc = "0p9mhave 35mthgpg gjeqe526 2t7b4g4v q04jkcev k8udemvp r53bq7cc b4um86eg ji6neoae 2vptu5ti t644ebqk"
print("all 11 listed hashes match RFC 5155:",
      [nsec3_hash(n, salt, its)[:8] for n in names[:11]] == rfc.split())

def covering(h):                          # the NSEC3 record whose gap contains h
    for i, a in enumerate(ring):
        b = ring[(i + 1) % len(ring)]
        if (a < h < b) or (b < a and (h > a or h < b)):   # last record wraps around
            return a
def closest_encloser_proof(qname):
    labels = qname.split(".")
    for i in range(1, len(labels)):
        ce = ".".join(labels[i:])                     # longest ancestor that exists
        if nsec3_hash(ce, salt, its) in owner:
            nc = ".".join(labels[i - 1:])            # the "next closer" name
            return [("matches closest encloser", ce, nsec3_hash(ce, salt, its)),
                    ("covers next closer", nc, covering(nsec3_hash(nc, salt, its))),
                    ("covers wildcard", "*." + ce, covering(nsec3_hash("*." + ce, salt, its)))]
for why, name, rec in closest_encloser_proof("a.c.x.w.example"):
    print(f"{why:25s} {name:16s} -> record {rec[:8]}")
```

It prints the ring, the check against the RFC's table, and the proof:

```text
0p9mhave  (       example)  next 2t7b4g4v
2t7b4g4v  (   ns1.example)  next 2vptu5ti
2vptu5ti  ( x.y.w.example)  next 35mthgpg
35mthgpg  (     a.example)  next b4um86eg
b4um86eg  (   x.w.example)  next gjeqe526
gjeqe526  (    ai.example)  next ji6neoae
ji6neoae  (   y.w.example)  next k8udemvp
k8udemvp  (     w.example)  next kohar7mb
kohar7mb  (2t7b4g4vsa5smi)  next q04jkcev
q04jkcev  (   ns2.example)  next r53bq7cc
r53bq7cc  (   *.w.example)  next t644ebqk
t644ebqk  (    xx.example)  next 0p9mhave
all 11 listed hashes match RFC 5155: True
matches closest encloser  x.w.example      -> record b4um86eg
covers next closer        c.x.w.example    -> record 0p9mhave
covers wildcard           *.x.w.example    -> record 35mthgpg
```

Hashing destroys the order that let one NSEC record do everything, so an NSEC3
denial needs three facts. The **closest encloser**, the longest ancestor that
exists: `x.w.example`, whose hash owns a record. The **next closer name**, one
label longer: `c.x.w.example` hashes into the gap after `0p9mhave`, so nothing
exists on that branch. And the **wildcard** at the closest encloser:
`*.x.w.example` falls in the gap after `35mthgpg`, so no wildcard could have
answered. These are exactly the three records of the RFC's Appendix B.1, each
with its own RRSIG.

The records read `NSEC3 1 1 12 aabbccdd`: SHA-1, flags 1, 12 iterations, the
salt. Flag 1 is **opt-out**: a record may skip unsigned delegations, which is
why `c.example` has no hash in the ring. Opt-out spares registries like `.com`
millions of records, at the price that an attacker can slip a fake unsigned
delegation into an opt-out gap.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="The NSEC3 ring of the RFC 5155 example zone, with the three records that prove a.c.x.w.example does not exist marked" fill="currentColor" font-size="13">
<circle cx="250" cy="215" r="150" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="250" cy="65" r="6"/>
<text x="250" y="37" text-anchor="middle" font-weight="bold">0p9mhave</text>
<text x="250" y="52" text-anchor="middle" font-size="12" fill-opacity=".7">example</text>
<circle cx="325" cy="85" r="4" fill-opacity=".6"/>
<text x="333" y="69" text-anchor="start">2t7b4g4v</text>
<text x="333" y="84" text-anchor="start" font-size="12" fill-opacity=".7">ns1</text>
<circle cx="380" cy="140" r="4" fill-opacity=".6"/>
<text x="394" y="130" text-anchor="start">2vptu5ti</text>
<text x="394" y="145" text-anchor="start" font-size="12" fill-opacity=".7">x.y.w</text>
<circle cx="400" cy="215" r="6"/>
<text x="416" y="213" text-anchor="start" font-weight="bold">35mthgpg</text>
<text x="416" y="228" text-anchor="start" font-size="12" fill-opacity=".7">a</text>
<circle cx="380" cy="290" r="6"/>
<text x="394" y="296" text-anchor="start" font-weight="bold">b4um86eg</text>
<text x="394" y="311" text-anchor="start" font-size="12" fill-opacity=".7">x.w</text>
<circle cx="325" cy="345" r="4" fill-opacity=".6"/>
<text x="333" y="357" text-anchor="start">gjeqe526</text>
<text x="333" y="372" text-anchor="start" font-size="12" fill-opacity=".7">ai</text>
<circle cx="250" cy="365" r="4" fill-opacity=".6"/>
<text x="250" y="393" text-anchor="middle">ji6neoae</text>
<text x="250" y="408" text-anchor="middle" font-size="12" fill-opacity=".7">y.w</text>
<circle cx="175" cy="345" r="4" fill-opacity=".6"/>
<text x="167" y="357" text-anchor="end">k8udemvp</text>
<text x="167" y="372" text-anchor="end" font-size="12" fill-opacity=".7">w</text>
<circle cx="120" cy="290" r="4" fill-opacity=".6"/>
<text x="106" y="296" text-anchor="end">kohar7mb</text>
<text x="106" y="311" text-anchor="end" font-size="12" fill-opacity=".7">2t7b4g4v…</text>
<circle cx="100" cy="215" r="4" fill-opacity=".6"/>
<text x="84" y="213" text-anchor="end">q04jkcev</text>
<text x="84" y="228" text-anchor="end" font-size="12" fill-opacity=".7">ns2</text>
<circle cx="120" cy="140" r="4" fill-opacity=".6"/>
<text x="106" y="130" text-anchor="end">r53bq7cc</text>
<text x="106" y="145" text-anchor="end" font-size="12" fill-opacity=".7">*.w</text>
<circle cx="175" cy="85" r="4" fill-opacity=".6"/>
<text x="167" y="69" text-anchor="end">t644ebqk</text>
<text x="167" y="84" text-anchor="end" font-size="12" fill-opacity=".7">xx</text>
<line x1="286" y1="82" x2="292" y2="59" stroke="currentColor" stroke-width="2.5"/>
<text x="283" y="95" text-anchor="end" font-size="12">0va5bpr2 = H(c.x.w)</text>
<line x1="383" y1="251" x2="406" y2="257" stroke="currentColor" stroke-width="2.5"/>
<text x="374" y="252" text-anchor="end" font-size="12">92pqneeg = H(*.x.w)</text>
<text x="470" y="40" font-weight="bold">question: a.c.x.w.example</text>
<rect x="462" y="56" width="170" height="168" rx="6" fill="currentColor" fill-opacity=".07" stroke="currentColor"/>
<text x="472" y="80">1. b4um86eg matches</text>
<text x="486" y="97" font-size="12" fill-opacity=".7">closest encloser x.w</text>
<text x="472" y="138">2. 0p9mhave covers</text>
<text x="486" y="155" font-size="12" fill-opacity=".7">next closer c.x.w</text>
<text x="472" y="196">3. 35mthgpg covers</text>
<text x="486" y="213" font-size="12" fill-opacity=".7">wildcard *.x.w</text>
</svg>
<figcaption>Figure 10.5. The NSEC3 ring of RFC 5155's example zone, salt aabbccdd, 12 extra iterations, with the name behind each hash in grey. Each record names the next hash clockwise; three of them prove that a.c.x.w.example does not exist.</figcaption>
</figure>

### Walking and cracking the example zone

Collecting the hashes is the online half: each denial hands out neighboring
hashes, and since the parameters are public, the attacker can pick query names
that land in unseen gaps. The offline half is a dictionary, run
here against the RFC's zone: every label of one or two letters or digits and a
few common words, under `example` and then under each name found.

```python
# Uses nsec3_hash(), owner, salt and its from the listing above.
# Zone walking, then an offline dictionary: guess every label of one or two
# characters, plus a few common words, below each name already recovered.
import itertools, string
chars = string.ascii_lowercase + string.digits
labels = ["*", "ns1", "ns2", "www", "mail"] + list(chars) + \
         ["".join(p) for p in itertools.product(chars, repeat=2)]
found, todo, sha1_calls = {}, ["example"], 0
while todo:
    parent = todo.pop()
    for lab in labels:
        name = lab + "." + parent
        sha1_calls += its + 1
        if nsec3_hash(name, salt, its) in owner and name not in found.values():
            found[nsec3_hash(name, salt, its)] = name
            if lab != "*":
                todo.append(name)
print("recovered:", sorted(found.values(), key=len))
print("hidden:", [owner[h] for h in owner if h not in found and owner[h] != "example"])
guesses = sha1_calls // (its + 1)
print(f"{guesses:,} guesses: {sha1_calls:,} SHA-1 calls at 12 iterations, "
      f"{guesses:,} at RFC 9276's 0")
```

```text
recovered: ['a.example', 'w.example', 'ai.example', 'xx.example', 'ns1.example', 'ns2.example', '*.w.example', 'x.w.example', 'y.w.example', 'x.y.w.example']
hidden: ['2t7b4g4vsa5smi47k61mv5bv1a22bojr.example']
13,370 guesses: 173,810 SHA-1 calls at 12 iterations, 13,370 at RFC 9276's 0
```

Ten of the eleven names fall to 13,370 guesses, a fraction of a second in
Python; only the label that is itself a random-looking string survives. NSEC3
protects names the way a password hash protects passwords: only the ones
nobody would guess. Twelve iterations made the work thirteen times larger, but
a graphics card computes billions of SHA-1 hashes a second, and password
crackers such as hashcat have a mode for NSEC3.

### Why RFC 9276 asks for no salt and no extra iterations

Iterations slow the attacker, but they slow the zone's servers and every
validating resolver by the same factor, online and for every negative answer,
so a high count became a denial-of-service lever. The salt was meant to stop
precomputed tables, but the owner name already contains the zone's name, so a
table never carries from one zone to another; and a published salt that
changes only when the whole chain is rebuilt and re-signed adds nothing during
an attack.

RFC 9276 (2022, BCP 236), by Wes Hardaker and Viktor Dukhovni, draws the
conclusion: prefer plain NSEC; if NSEC3 is needed, use zero extra iterations
and an empty salt (`NSEC3PARAM 1 0 0 -`), and skip opt-out in small zones.
Validators may treat higher counts as insecure or fail them; at publication,
"insecure above 100, fail above 500" caused no notable trouble.

Two newer ideas go further. **Compact denial of existence**, first deployed by
Cloudflare as "black lies", has an online signer answer every non-existent
name with a freshly signed NSEC record that covers only that name, so nothing
can be walked; it requires the signing key on the server. **NSEC5** (Sharon
Goldberg and colleagues, 2015) replaces the hash with a verifiable random
function, so that only the zone's server can compute the hash of a name, but
any resolver can verify it.

## 10.6 When validation fails

*Level: intermediate.*

DNSSEC's failure mode is strict: a bogus answer becomes no answer at all. That
protects users from forgeries and punishes them for operators' mistakes, and
operators make mistakes. Signatures expire if a signing job stops running. A
new key is published in the zone but the parent's DS still points to the old
one. A zone is moved to a new provider that does not sign it while the DS
remains. Each makes the domain disappear for everyone behind a validating
resolver, and only for them, which makes the failure confusing to diagnose.

Two well-known cases: in January 2012, customers of Comcast, an early large
validating resolver operator in the United States, could not reach `nasa.gov`
because of a signing error at NASA; Comcast had to add a temporary exception.
In September 2021, the messaging company Slack turned on DNSSEC for its domain,
hit an interaction between its DNS provider's handling of wildcard records and
validating resolvers, and was unreachable for part of its users for about a
day after it rolled back, because the DS record stayed in caches. Operators
call such episodes **DNSSEC outages**, and they are the main reason many large
domains still do not sign.

**KeyTrap** (2024) showed the opposite danger: validation itself as an attack
surface. Elias Heftrig, Haya Schulmann, Niklas Vogel and Michael Waidner noticed
that the standards told resolvers to try every key that might match a
signature, and every signature that might cover a record, to be robust against
misconfiguration. An attacker's zone with many keys sharing one key tag and
many signatures for one record made a resolver perform millions of signature
checks to answer a single query, stalling it for many hours on some
implementations (CVE-2023-50387). Every major resolver was patched in February
2024 to cap the work per query. The lesson echoes the NSEC3 iteration problem:
a protocol that lets the sender choose how much work the receiver does needs
limits.

**The last mile.** A validating resolver sets the AD bit, but most devices do
not validate themselves; they believe the bit, which arrives over the same
unauthenticated path as the answer. DNSSEC therefore protects the hop from
the authoritative servers to the resolver, and the user is protected only if
the hop from resolver to device is also protected. That is one more reason for
the encrypted transports of §10.11.

### Code it: keys that share a tag

The program makes five P-256 keys with tag 20326, KSK-2017's tag, by choosing
each key's last two bytes to make up the checksum, then counts a validator's
work under the old rules.

```python
# KeyTrap's raw material: many different keys with the same 16-bit key tag,
# and the work an old-style validator does with them.
import hashlib, struct
def key_tag(rdata):                                # RFC 4034 Appendix B
    acc = sum(b if i % 2 else b << 8 for i, b in enumerate(rdata))
    return (acc + (acc >> 16)) & 0xffff
def colliding_key(target, seed):
    """A P-256 DNSKEY RDATA (flags 256, algorithm 13) whose tag is target."""
    body = hashlib.sha256(seed).digest() + hashlib.sha256(seed + b"2").digest()[:30]
    rd = struct.pack(">HBB", 256, 3, 13) + body + b"\0\0"
    fix = (target - key_tag(rd)) % 0xffff          # the last 16-bit word closes the gap
    return rd[:-2] + struct.pack(">H", fix)
keys = [colliding_key(20326, bytes([i])) for i in range(5)]
print("five different keys:", len(set(keys)) == 5, " tags:", [key_tag(k) for k in keys])
# Every key with the right tag is tried against every signature over the RRset.
for k, s in ((1, 1), (100, 100), (400, 200)):
    size = k * 80 + s * 105                        # bytes: DNSKEY and RRSIG records, P-256
    print(f"{k:4d} keys x {s:4d} signatures = {k * s:6,d} checks, about {size:6,d} bytes")
```

```text
five different keys: True  tags: [20326, 20326, 20326, 20326, 20326]
   1 keys x    1 signatures =      1 checks, about    185 bytes
 100 keys x  100 signatures = 10,000 checks, about 18,500 bytes
 400 keys x  200 signatures = 80,000 checks, about 53,000 bytes
```

Every key with the tag is tried against every signature, and none verifies:
$k \cdot s$ checks. Four hundred keys and two
hundred signatures fit in one 53-kilobyte answer, inside the 64-kilobyte limit
of DNS over TCP, and cost 80,000 verifications; retries against the zone's
other servers multiplied that. The researchers measured stalls of 170
seconds to 16 hours from a single response. The
fixes cap the key and signature combinations tried per answer, and Unbound
1.19.1 also suspends such a validation and serves other clients meanwhile.

A sibling disclosed the same day, CVE-2023-50868, floods a resolver with
random names in an NSEC3 zone, so that building closest encloser proofs
(§10.5) with high iteration counts exhausts the CPU.

!!! note "Life story: KeyTrap"
    **Born:** found in 2023 by Elias Heftrig, Haya Schulmann, Niklas Vogel and
    Michael Waidner at the ATHENE center in Darmstadt; disclosed on 13
    February 2024 as CVE-2023-50387, after coordinated work with resolver
    vendors · **Purpose:** show that DNSSEC's tolerance rules (try every key,
    try every signature) let one answer stall a validating resolver ·
    **Helped:** every major validating resolver add limits on validation
    work; by the researchers' account the rules it abused dated back to 1999
    · **Status:** patched in February 2024; key tags are now treated as
    hints, and work per query is capped

## 10.7 The root key

*Level: intermediate.*

Every validation ends at the root zone's KSK, so its private key is among the
most carefully guarded secrets on the Internet. It lives in hardware security
modules in two facilities in the United States, in Culpeper, Virginia and El
Segundo, California. It is used only in **key ceremonies**, held several times
a year and streamed online, where staff and a rotating group of volunteer
**trusted community representatives** from around the world each bring part of
what is needed to activate the modules: smart cards held by the volunteers
open them, and no one person can do it alone. In each ceremony the KSK signs
the root's DNSKEY set for the coming quarter, including the ZSKs that Verisign,
the root zone maintainer, uses daily. Backup copies of the key are encrypted,
and a further group of recovery shareholders holds pieces of the key needed to
rebuild the system if both facilities were lost, using secret sharing. How
those shares are split, and why a quorum of them can rebuild the key while any
smaller group learns nothing, is told in [Advanced protocols, §2.9](../advanced/02-Secret-Sharing.md#29-the-dns-root-keys-recovery-shares).

### Code it: the root's own fingerprint

The root KSK in use since October 2026 is KSK-2024, named for the year it was
generated; it replaced KSK-2017. IANA publishes their DS records as the trust
anchors resolvers ship with. The program checks the method on the example in
RFC 4034 §5.4 (an RSA/SHA-1 key with a SHA-1 DS), then computes both root
keys' tags and DS digests from the public keys alone, and sets each one's RFC
5011 REVOKE flag, which §10.8 explains.

```python
# Key tags and DS digests from the public key alone: RFC 4034's own example,
# then the root zone's two key-signing keys, KSK-2017 and KSK-2024.
import base64, hashlib, struct
def wire(name):                           # owner name in wire form, lowercase
    return b"".join(bytes([len(l)]) + l.lower().encode() for l in name.split(".") if l) + b"\0"
def key_tag(rdata):                       # RFC 4034 Appendix B
    acc = sum(b if i % 2 else b << 8 for i, b in enumerate(rdata))
    return (acc + (acc >> 16)) & 0xffff
def dnskey(flags, alg, b64):              # DNSKEY RDATA: flags, protocol 3, algorithm, key
    return struct.pack(">HBB", flags, 3, alg) + base64.b64decode(b64)
def ds(owner, rdata, digest="sha256"):
    return hashlib.new(digest, wire(owner) + rdata).hexdigest().upper()

# RFC 4034 section 5.4: a zone key (flags 256), RSA/SHA-1 (5), DS digest type 1 (SHA-1).
ex = dnskey(256, 5, "AQOeiiR0GOMYkDshWoSKz9XzfwJr1AYtsmx3TGkJaNXVbfi/2pHm822aJ5iI9BMzNXxeYCmZ"
                    "DRD99WYwYqUSdjMmmAphXdvxegXd/M5+X7OrzKBaMbCVdFLUUh6DhweJBjEVv5f2wwjM9Xzc"
                    "nOf+EPbtG9DMBmADjFDc2w/rljwvFw==")
print("RFC 4034 example: tag", key_tag(ex), " DS", ds("dskey.example.com.", ex, "sha1"))
print("  matches the RFC:", ds("dskey.example.com.", ex, "sha1") ==
      "2BB183AF5F22588179A53B0A98631FAD1A292118")

roots = {
 "KSK-2017": ("AwEAAaz/tAm8yTn4Mfeh5eyI96WSVexTBAvkMgJzkKTOiW1vkIbzxeF3+/4RgWOq"
              "7HrxRixHlFlExOLAJr5emLvN7SWXgnLh4+B5xQlNVz8Og8kvArMtNROxVQuCaSnI"
              "DdD5LKyWbRd2n9WGe2R8PzgCmr3EgVLrjyBxWezF0jLHwVN8efS3rCj/EWgvIWgb"
              "9tarpVUDK/b58Da+sqqls3eNbuv7pr+eoZG+SrDK6nWeL3c6H5Apxz7LjVc1uTId"
              "sIXxuOLYA4/ilBmSVIzuDWfdRUfhHdY6+cn8HFRm+2hM8AnXGXws9555KrUB5qih"
              "ylGa8subX2Nn6UwNR1AkUTV74bU=",
              "E06D44B80B8F1D39A95C0B0D7C65D08458E880409BBC683457104237C7F8EC8D"),
 "KSK-2024": ("AwEAAa96jeuknZlaeSrvyAJj6ZHv28hhOKkx3rLGXVaC6rXTsDc449/cidltpkyG"
              "wCJNnOAlFNKF2jBosZBU5eeHspaQWOmOElZsjICMQMC3aeHbGiShvZsx4wMYSjH8"
              "e7Vrhbu6irwCzVBApESjbUdpWWmEnhathWu1jo+siFUiRAAxm9qyJNg/wOZqqzL/"
              "dL/q8PkcRU5oUKEpUge71M3ej2/7CPqpdVwuMoTvoB+ZOT4YeGyxMvHmbrxlFzGO"
              "HOijtzN+u1TQNatX2XBuzZNQ1K+s2CXkPIZo7s6JgZyvaBevYtxPvYLw4z9mR7K2"
              "vaF18UYH9Z9GNUUeayffKC73PYc=",
              "683D2D0ACB8C9B712A1948B27F741219298D0A450D612C483AF444A4C0FB2B16")}
for name, (key, published) in roots.items():
    rd = dnskey(257, 8, key)                       # flags 257 = zone key + SEP, RSA/SHA-256
    raw = base64.b64decode(key)                    # RFC 3110: exponent length, exponent, modulus
    bits, e = (len(raw) - 1 - raw[0]) * 8, int.from_bytes(raw[1:1 + raw[0]], "big")
    revoked = dnskey(257 | 0x80, 8, key)           # RFC 5011 REVOKE bit set: flags 385
    print(f"{name}: RSA-{bits}, e = {e}, tag {key_tag(rd)}, "
          f"DS matches IANA: {ds('.', rd) == published}, revoked tag {key_tag(revoked)}")
print("KSK-2024 DS:", ds(".", dnskey(257, 8, roots["KSK-2024"][0])))
```

```text
RFC 4034 example: tag 60485  DS 2BB183AF5F22588179A53B0A98631FAD1A292118
  matches the RFC: True
KSK-2017: RSA-2048, e = 65537, tag 20326, DS matches IANA: True, revoked tag 20454
KSK-2024: RSA-2048, e = 65537, tag 38696, DS matches IANA: True, revoked tag 38824
KSK-2024 DS: 683D2D0ACB8C9B712A1948B27F741219298D0A450D612C483AF444A4C0FB2B16
```

Both root keys are 2048-bit RSA with exponent 65537, packed as RFC 3110
describes. Every validating resolver on Earth holds the 32 bytes on the last
line, or the key itself.

## 10.8 Rolling keys and algorithms

*Level: intermediate.*

Keys change as routine, after a compromise, and when the algorithm itself must
go. Any answer may sit in a cache for its TTL, so every rollover obeys one
rule: no resolver may ever hold a signature it cannot match to a key it
has, or a DS that matches no published key. RFC 6781 (2012) and RFC 7583
(2015) give the timelines.

### Three kinds of rollover

**A ZSK rollover** stays inside the zone. With **pre-publish**, the new ZSK
joins the DNSKEY set first; once cached copies of the old set have expired,
signing switches to the new key; once old signatures have expired from caches,
the old key goes.

**A KSK rollover** involves the parent, because the DS must change. With
**double-DS**, the parent publishes a DS for the new KSK beside the old one
before the keys switch; with **double-KSK**, the child publishes both keys and
signs its DNSKEY set with both before the DS changes. CDS and CDNSKEY records
(§10.13) let the parent pick up the change by itself.

**The root's KSK** has no parent. Its anchors live in resolver configurations,
and RFC 5011 (2007) updates them. A validator that sees a new KSK in the root's
DNSKEY set, signed by a key it trusts, starts a 30-day **add hold-down**; if
the key is still there and validly signed when the timer ends, it becomes a
trust anchor. To retire a key, the zone publishes it with the **REVOKE** bit
(0x0080) set, signed by itself. The flags are part of the RDATA, so revoking
changes the tag by 128, as §10.7 shows: KSK-2017 is 20326 in service and 20454
revoked. A validator that misses the process, such as a device restored from
an old image, needs a software update instead.

### 2018: the first root rollover

KSK-2010, tag 19036, signed the root from 15 July 2010. Its successor KSK-2017
was published in the root zone on 11 July 2017, to sign from 11 October 2017.
But RFC 8145 (2017) had just given resolvers a way to report their trust
anchors to the root, and in September 2017 an analysis of those reports by
Duane Wessels at Verisign showed a few percent of reporting resolvers still
trusting only KSK-2010. On 27 September 2017 ICANN postponed the roll. It
happened a year later, on 11 October 2018, with only a handful of small
problems. KSK-2010 was revoked on 11 January 2019 and
removed on 22 March 2019. The episode also produced RFC 8509 (2018), the root
KSK **sentinel**, which measures from the user's side which keys a resolver
trusts.

!!! note "Life story: KSK-2017"
    **Born:** generated in 2016 at the Culpeper key management facility and
    published in the root zone on 11 July 2017; key tag 20326, RSA-2048 ·
    **Purpose:** the second trust anchor of the DNS, signing the root's DNSKEY
    set · **Helped:** sign the root from 11 October 2018 to 11 October 2026;
    its postponed rollover showed how to change a key that billions of
    lookups depend on · **Retired:** replaced as signer on 11 October 2026;
    revocation planned for January 2027 · **Replaced by:** KSK-2024, tag 38696

### 2024 to 2026: KSK-2024

KSK-2024 was generated in April
2024 and published in the root's DNSKEY set on 11 January 2025, giving RFC 5011
validators twenty-one months, not three, to pick it up. ICANN reported in July
2026 that more than 95 percent of resolvers reporting their trust anchors had
adopted it; sentinel measurements from end users' side gave lower figures. On
11 October 2026 KSK-2024 began signing. ICANN's reports afterwards described no
widespread disruption; isolated failures were reported from validators whose
built-in anchors held only KSK-2017. KSK-2017 is to be revoked in January
2027 and then removed.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Timeline of the root KSKs: KSK-2010 signing 2010 to 2018, KSK-2017 2018 to 2026, KSK-2024 from October 2026, and a proposed ECDSA key" fill="currentColor" font-size="13">
<line x1="40" y1="300" x2="600" y2="300" stroke="currentColor" stroke-width="1.2"/>
<line x1="40" y1="296" x2="40" y2="304" stroke="currentColor"/>
<text x="40" y="322" text-anchor="middle" font-size="12">2010</text>
<line x1="152" y1="296" x2="152" y2="304" stroke="currentColor"/>
<text x="152" y="322" text-anchor="middle" font-size="12">2014</text>
<line x1="264" y1="296" x2="264" y2="304" stroke="currentColor"/>
<text x="264" y="322" text-anchor="middle" font-size="12">2018</text>
<line x1="376" y1="296" x2="376" y2="304" stroke="currentColor"/>
<text x="376" y="322" text-anchor="middle" font-size="12">2022</text>
<line x1="488" y1="296" x2="488" y2="304" stroke="currentColor"/>
<text x="488" y="322" text-anchor="middle" font-size="12">2026</text>
<line x1="600" y1="296" x2="600" y2="304" stroke="currentColor"/>
<text x="600" y="322" text-anchor="middle" font-size="12">2030</text>
<text x="40" y="46" font-weight="bold">KSK-2010</text>
<text x="118" y="46" font-size="12" fill-opacity=".7">tag 19036, RSA-2048</text>
<rect x="55" y="52" width="231" height="16" rx="3" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<line x1="293" y1="48" x2="293" y2="72" stroke="currentColor" stroke-width="3"/>
<text x="40" y="106" font-weight="bold">KSK-2017</text>
<text x="118" y="106" font-size="12" fill-opacity=".7">tag 20326, RSA-2048</text>
<circle cx="230" cy="120" r="4"/>
<line x1="251" y1="120" x2="286" y2="120" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/>
<rect x="286" y="112" width="224" height="16" rx="3" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<line x1="517" y1="108" x2="517" y2="132" stroke="currentColor" stroke-width="3"/>
<text x="40" y="166" font-weight="bold">KSK-2024</text>
<text x="118" y="166" font-size="12" fill-opacity=".7">tag 38696, RSA-2048</text>
<circle cx="440" cy="180" r="4"/>
<line x1="461" y1="180" x2="510" y2="180" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/>
<rect x="510" y="172" width="90" height="16" rx="3" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>
<text x="300" y="65" font-size="11.5">revoked Jan 2019, removed Mar 2019</text>
<text x="230" y="146" font-size="11.5">published Jul 2017; roll postponed a year, done 11 Oct 2018</text>
<text x="523" y="124" font-size="11.5">revoke Jan 2027</text>
<text x="600" y="206" text-anchor="end" font-size="11.5">generated Apr 2024; published 11 Jan 2025; signing from 11 Oct 2026</text>
<text x="40" y="236" font-weight="bold">next: ECDSA P-256</text>
<text x="180" y="236" font-size="12" fill-opacity=".7">proposed by ICANN in February 2026</text>
<rect x="516" y="242" width="84" height="16" rx="3" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="600" y="276" text-anchor="end" font-size="11.5">new key from 2027; RSA KSK retired around 2030</text>
<circle cx="48" cy="352" r="4"/><text x="58" y="356" font-size="12">generated</text>
<line x1="135" y1="352" x2="170" y2="352" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/><text x="176" y="356" font-size="12">published, not signing</text>
<rect x="320" y="345" width="34" height="14" rx="3" fill="currentColor" fill-opacity=".3" stroke="currentColor"/><text x="360" y="356" font-size="12">signs the root DNSKEY set</text>
<line x1="540" y1="342" x2="540" y2="362" stroke="currentColor" stroke-width="3"/><text x="548" y="356" font-size="12">revoked</text>
</svg>
<figcaption>Figure 10.6. Three root keys and a fourth proposed. Each new key sits published but idle long enough for validators to learn it, then signs; the old one is revoked a quarter later.</figcaption>
</figure>

### Algorithm rollovers

Changing algorithm is harder, because RFC 4035 requires every RRset to be
signed with each algorithm in the zone's DNSKEY set, and a validator that sees
an algorithm in the keys but not in the signatures may suspect a stripped
signature. The safe order runs backwards: add signatures with the new
algorithm everywhere and let them reach the caches; publish the new keys;
change the DS; remove the old keys; remove the old signatures. For weeks every
answer carries two sets of signatures.

DNSSEC's algorithms have moved three times: from **RSA/SHA-1** (algorithms 5
and 7) to **RSA/SHA-256** (8, RFC 5702, 2009, the root's algorithm since 2010),
then **ECDSA P-256** (13, RFC 6605, 2012), whose 64-byte signatures keep
answers small, and **Ed25519** (15, RFC 8080, 2017). Gaëtan Leurent and Thomas
Peyrin's chosen-prefix collision (2020) made SHA-1 signatures over data an
attacker can influence unsafe. RFC 8624 (2019) had advised against signing
with RSA/SHA-1; RFC 9905 (November 2025) says MUST NOT, and tells validators to treat zones signed only with algorithms 5 or 7 as
insecure rather than bogus, so they keep resolving, unprotected. RFC 9904
moved the list of recommended algorithms into IANA's registries.

The root is next. In February 2026 ICANN proposed rolling the root KSK from
RSA to ECDSA P-256 with double signing, the new key generated in 2027 and the
RSA key retired around 2030; ICANN's Security and Stability Advisory Committee
endorsed the plan while asking whether it could be faster (SAC133). A
post-quantum root, if one comes, would follow the same path with much larger
answers (§10.13).

## 10.9 What signed DNS makes possible

*Level: intermediate.*

Once DNS answers can be trusted, DNS can carry keys.

- **DANE** (DNS-based Authentication of Named Entities, RFC 6698, 2012) puts a
  hash of a server's TLS certificate or public key in a **TLSA** record. A
  client that validates DNSSEC can check the server's key against it, either
  in addition to the CA system or instead of it. Browsers never adopted DANE,
  partly because many networks and devices could not deliver DNSSEC records
  reliably. Email did: RFC 7672 (2015) uses DANE to tell sending mail servers
  that a receiving server supports TLS and which key it uses, which defeats the
  STARTTLS stripping attacks of [Chapter 15](15-Email-OpenPGP-and-SMIME.md);
  §10.10 works through it.
- **SSHFP** records hold SSH host key fingerprints
  ([Chapter 6](06-SSH.md), §6.5).
- **CAA** records (RFC 8659) tell certificate authorities which of them may
  issue for a domain (Chapter 2). They do not need DNSSEC, but a CA that
  validates them can trust them more.
- **HTTPS and SVCB** records (RFC 9460, 2023) tell a browser, before it
  connects, which protocols a site supports and the public key for **Encrypted
  Client Hello** ([Chapter 5](05-TLS-in-Practice.md)). Without DNSSEC or an
  encrypted path to the resolver, an attacker can strip them.

None of this replaces DNSSEC's weakest link, which is above DNS: whoever
controls a domain's **registrar account** can change its name servers and its
DS record. In the **Sea Turtle** campaign, disclosed by Cisco Talos in 2019, a
state-sponsored group compromised registrars and registries to redirect the
domains of government agencies and companies in the Middle East and North
Africa, then obtained valid certificates for them. DNSSEC was no obstacle,
because the attackers changed the records at the source. Registrar locks and
strong authentication on registrar accounts are as important as signatures.

## 10.10 DANE for mail, worked through

*Level: intermediate.*

Mail between servers is where DANE took hold, because mail had a problem the
web did not. A sending mail server (an MTA, mail transfer agent) looks up the
recipient domain's MX records, connects to port 25, and upgrades to TLS if the
server offers STARTTLS (RFC 3207). The offer travels in plaintext, so an
attacker on the path can delete it and the sender delivers in the clear: a
**STARTTLS downgrade**. And even with TLS, the sender has nothing to check the
certificate against: the MX name came from DNS that may be forged, mail servers
share no list of CAs, and no user can click through a warning. So most
MTAs accepted any certificate. A 2015 study of mail arriving at Gmail by Zakir
Durumeric and colleagues found networks in several countries stripping the
STARTTLS offer from a large share of messages.

### How a sending server uses DANE

RFC 7672 (2015), by Viktor Dukhovni and Wes Hardaker, makes signed DNS both the
signal and the key. For mail to `user@arcadia.mars`, a validating sender:

<div class="mars-steps" markdown>

1. Looks up the MX records of `arcadia.mars`. The answer must be **secure**; an
   insecure MX could be forged, so DANE does not apply.
2. Looks up TLSA records at `_25._tcp.mx.arcadia.mars` (port 25, TCP) for the
   chosen host. If a secure, usable record exists, TLS is now **mandatory**.
3. Requires STARTTLS. If the offer is missing or the handshake fails, it
   defers the message and retries later; it never falls back to plaintext.
4. Compares the server's certificate with the TLSA records, and delivers only
   if one matches.

</div>

Step 2 defeats the downgrade: an attacker can delete a STARTTLS offer but not
a signed TLSA record, whose absence must itself be proven (§10.5).

A TLSA record has a **usage**, a **selector**, a **matching type** and the data.
Usages PKIX-TA (0) and PKIX-EE (1) constrain the CA system; DANE-TA (2) and
DANE-EE (3) replace it with a trust anchor or a server key named in DNS. The
selector picks the full certificate (0) or its public key (1), and the
matching type the item itself (0), SHA-256 (1) or SHA-512 (2). RFC
7672 recommends **3 1 1**, with "2 0 1" as second choice, and tells mail
servers not to publish the PKIX usages at all. Under DANE-EE the certificate's
names and expiry are ignored; the binding lasts as long as the TLSA record's
signature.

### Code it: a TLSA record from a public key

A "3 1 1" record is the SHA-256 of the DER-encoded SubjectPublicKeyInfo, the
same bytes that sit inside the certificate: for P-256, a fixed 26-byte header
naming the algorithm and curve, then the 65-byte point. The program computes
the record and runs the sender's comparison in three cases.

```python
# DANE for mail (RFC 7672): the TLSA record "3 1 1" is the SHA-256 of the server's
# SubjectPublicKeyInfo. Compute it from a P-256 public key, then check two servers.
import base64, hashlib
SPKI_P256 = bytes.fromhex("3059301306072a8648ce3d020106082a8648ce3d030107034200")  # DER header
def spki(xy):                             # uncompressed point: 04 || X || Y
    return SPKI_P256 + b"\x04" + xy
def tlsa(usage, selector, mtype, der):
    assert (usage, selector) == (3, 1)    # DANE-EE, public key only
    return f"{usage} {selector} {mtype} " + {1: hashlib.sha256, 2: hashlib.sha512}[mtype](der).hexdigest()

# The public key of RFC 6605's example, used here as the mail server's key.
key = base64.b64decode("GojIhhXUN/u4v54ZQqGSnyhWJwaubCvTmeexv7bR6edb"
                       "krSqQpF64cYbcB7wNcP+e+MAnLr+Wi9xMWyQLc8NAA==")
der = spki(key)
print(len(der), "bytes of SPKI;", base64.b64encode(der).decode()[:36] + "...")
record = tlsa(3, 1, 1, der)
print("_25._tcp.mx.arcadia.mars. IN TLSA")
print("   ", record)

def dane_check(tlsa_rrset, presented_spki):
    """A sending MTA's check after STARTTLS: any record matching is enough."""
    for r in tlsa_rrset:
        u, s, m, data = r.split()
        if data == tlsa(int(u), int(s), int(m), presented_spki).split()[3]:
            return "authenticated: deliver"
    return "no match: defer delivery, do not fall back to plaintext"
renewed = spki(hashlib.sha512(b"a new key made at renewal").digest())   # stand-in X, Y
print("same key, new certificate: ", dane_check([record], der))
print("new key, record not updated:", dane_check([record], renewed))
print("next key published first:   ", dane_check([record, tlsa(3, 1, 1, renewed)], renewed))
```

```text
91 bytes of SPKI; MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
_25._tcp.mx.arcadia.mars. IN TLSA
    3 1 1 4cebf02cf648a32441326ee9556100a8949cc9715c83c90a32da145d72157c42
same key, new certificate:  authenticated: deliver
new key, record not updated: no match: defer delivery, do not fall back to plaintext
next key published first:    authenticated: deliver
```

For a real server, the same digest comes from
`openssl x509 -in cert.pem -noout -pubkey | openssl pkey -pubin -outform DER | openssl dgst -sha256`.

The three checks are the operational story of DANE for mail. Selector 1 hashes
only the key, so a renewed certificate with the same key still matches. A
renewal that quietly makes a new key, as some ACME clients did by default,
breaks the match, and DANE senders defer mail to that host until the record is
fixed; deferred mail is retried for days, so nothing is lost, but nothing
arrives. The fix is §10.8's rollover rule: publish the *next* key's record first.

### MTA-STS: the same promise without DNSSEC

Providers whose domains were not signed wrote **MTA-STS** (RFC 8461, 2018). A
domain publishes a TXT record at `_mta-sts.arcadia.mars` with a policy
identifier (`v=STSv1; id=20261109`) and serves a policy over HTTPS at
`https://mta-sts.arcadia.mars/.well-known/mta-sts.txt`:

```text
version: STSv1
mode: enforce
mx: mx.arcadia.mars
max_age: 1209600
```

A sender fetches the policy, checking the web server's certificate against the
usual CAs, and caches it for `max_age` seconds, here two weeks. In `enforce`
mode it delivers only to listed MX hosts, over TLS, with a certificate valid
for the host's name; `testing` mode only reports.
**TLS-RPT** (RFC 8460, 2018) names an address, in a TXT record at
`_smtp._tls`, to which senders mail daily JSON reports of failures; DANE
senders use it too.

The difference is the anchor. DANE trusts the DNS root and works from the first
message, but needs signed zones and a validating sender. MTA-STS needs only a
web server, but trusts every CA that could issue for the domain and works by
**trust on first use**: an attacker who blocks the first policy fetch can still
downgrade, and the TXT record itself is unprotected. Gmail adopted MTA-STS in 2019 and
has relied on it rather than DANE; Exchange Online added DANE for outgoing mail
in 2022 and, as an option, for incoming mail in October 2024; Postfix has had
DANE since version 2.11 (2014). A domain can publish both.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two ways for a sending mail server to require TLS: the DANE checks and the MTA-STS checks, step by step" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">DANE for SMTP (RFC 7672): trust from the DNS root</text>
<rect x="20" y="36" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".06" stroke="currentColor"/>
<text x="89" y="59" text-anchor="middle">MX for the domain?</text>
<text x="89" y="78" text-anchor="middle" font-size="12" fill-opacity=".75">must be secure</text>
<line x1="158" y1="63" x2="174" y2="63" stroke="currentColor" stroke-width="1.5"/>
<polygon points="174,63 167,59 167,67"/>
<rect x="174" y="36" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".06" stroke="currentColor"/>
<text x="243" y="59" text-anchor="middle">TLSA _25._tcp.mx?</text>
<text x="243" y="78" text-anchor="middle" font-size="12" fill-opacity=".75">secure: TLS required</text>
<line x1="312" y1="63" x2="328" y2="63" stroke="currentColor" stroke-width="1.5"/>
<polygon points="328,63 321,59 321,67"/>
<rect x="328" y="36" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".06" stroke="currentColor"/>
<text x="397" y="59" text-anchor="middle">STARTTLS offered?</text>
<text x="397" y="78" text-anchor="middle" font-size="12" fill-opacity=".75">no: defer delivery</text>
<line x1="466" y1="63" x2="482" y2="63" stroke="currentColor" stroke-width="1.5"/>
<polygon points="482,63 475,59 475,67"/>
<rect x="482" y="36" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".14" stroke="currentColor"/>
<text x="551" y="59" text-anchor="middle">SHA-256(SPKI)</text>
<text x="551" y="78" text-anchor="middle" font-size="12" fill-opacity=".75">= TLSA data? deliver</text>
<text x="20" y="134" font-weight="bold">MTA-STS (RFC 8461): trust from the CAs and the first fetch</text>
<rect x="20" y="146" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".06" stroke="currentColor"/>
<text x="89" y="169" text-anchor="middle">TXT _mta-sts?</text>
<text x="89" y="188" text-anchor="middle" font-size="12" fill-opacity=".75">policy id</text>
<line x1="158" y1="173" x2="174" y2="173" stroke="currentColor" stroke-width="1.5"/>
<polygon points="174,173 167,169 167,177"/>
<rect x="174" y="146" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".06" stroke="currentColor"/>
<text x="243" y="169" text-anchor="middle">HTTPS GET policy</text>
<text x="243" y="188" text-anchor="middle" font-size="12" fill-opacity=".75">CA-checked, cached</text>
<line x1="312" y1="173" x2="328" y2="173" stroke="currentColor" stroke-width="1.5"/>
<polygon points="328,173 321,169 321,177"/>
<rect x="328" y="146" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".06" stroke="currentColor"/>
<text x="397" y="169" text-anchor="middle">MX in policy list?</text>
<text x="397" y="188" text-anchor="middle" font-size="12" fill-opacity=".75">STARTTLS required</text>
<line x1="466" y1="173" x2="482" y2="173" stroke="currentColor" stroke-width="1.5"/>
<polygon points="482,173 475,169 475,177"/>
<rect x="482" y="146" width="138" height="54" rx="6" fill="currentColor" fill-opacity=".14" stroke="currentColor"/>
<text x="551" y="169" text-anchor="middle">certificate valid</text>
<text x="551" y="188" text-anchor="middle" font-size="12" fill-opacity=".75">for MX name? deliver</text>
<text x="320" y="236" text-anchor="middle" font-size="12.5">a promised check that fails: defer and retry; report it with TLS-RPT (RFC 8460)</text>
</svg>
<figcaption>Figure 10.7. Two ways to stop STARTTLS stripping. DANE anchors the promise and the key in signed DNS; MTA-STS anchors the promise in a cached web policy and the key in the CA system.</figcaption>
</figure>

For a city on Mars the choice is easy. Fetching Arcadia City's MTA-STS policy
from Earth takes three round trips (TCP, TLS, the request), over two hours at
the far end, again whenever the cache expires. TLSA records travel inside the
signed zone like any other record.

## 10.11 Private DNS: encrypting the questions

*Level: intermediate.*

DNSSEC does nothing for privacy: the question "what is the address of
`clinic.example`?" crosses the network in the clear, and anyone on the path can
read it, log it or block it. Three standards encrypt the path between a device
and its resolver:

- **DNS over TLS** (DoT, RFC 7858, 2016) runs DNS inside TLS on port 853.
  Android has offered it as "Private DNS" since Android 9 (2018), in the two
  profiles of RFC 8310: **opportunistic**, which encrypts when it can and
  falls back to plain DNS (stopping only a passive listener), and
  **strict**, where the user names a resolver whose certificate is checked
  and failure means no answer.
- **DNS over HTTPS** (DoH, RFC 8484, 2018) sends DNS messages as HTTPS requests,
  on port 443, where they look like any other web traffic and are hard to block
  without blocking the web. Browsers adopted it first: Firefox turned it on by
  default for users in the United States in 2020.
- **DNS over QUIC** (DoQ, RFC 9250, 2022) uses QUIC
  ([Chapter 5](05-TLS-in-Practice.md)) for lower latency and no head-of-line
  blocking.

A device learns its resolver's address by DHCP or router advertisement, in
the clear. **DDR** (RFC 9462, 2023) lets it ask that resolver, with an SVCB
query, which encrypted endpoints it offers, accepting them only if their
certificates also cover the original address; **DNR** (RFC 9463, 2023) puts
the encrypted resolver's name into DHCP itself.

### Code it: a DoH request

A DoH query is an ordinary DNS message, the same bytes that would go in a UDP
packet, base64url-encoded into a URL (for GET) or sent as the request body (for
POST). RFC 8484 gives an example for `www.example.com`.

```python
# DNS over HTTPS (RFC 8484): the query is an ordinary DNS message, base64url-encoded
# into a GET request. Build the RFC's own example and compare.
import base64, struct
def dns_query(name, qtype=1, qid=0, rd=True):
    header = struct.pack(">HHHHHH", qid, 0x0100 if rd else 0, 1, 0, 0, 0)
    qname = b"".join(bytes([len(l)]) + l.encode() for l in name.split(".") if l) + b"\0"
    return header + qname + struct.pack(">HH", qtype, 1)            # type A, class IN
msg = dns_query("www.example.com")
param = base64.urlsafe_b64encode(msg).decode().rstrip("=")
print(len(msg), "bytes:", msg.hex())
print("GET /dns-query?dns=" + param)
print("matches RFC 8484 section 4.1.1:", param == "AAABAAABAAAAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQAB")
```

```text
33 bytes: 00000100000100000000000003777777076578616d706c6503636f6d0000010001
GET /dns-query?dns=AAABAAABAAAAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQAB
matches RFC 8484 section 4.1.1: True
```

The query ID is zero, as RFC 8484 recommends, because HTTPS already matches
requests to responses and a fixed ID makes identical queries cacheable by HTTP
caches. Twelve bytes of header, the name as length-prefixed labels, type A,
class IN: thirty-three bytes in all, inside TLS.

Encryption hides the bytes but not their number, and a query's length depends
mostly on the name. RFC 7830 (2016) adds an EDNS(0) **padding** option, and
RFC 8467 (2018) gives the policy: pad queries to a multiple of 128 bytes and
responses to a multiple of 468, so that the three queries for
`www.example.com` (33 bytes), `clinic.example` (32) and a 49-byte name all
travel as 128.

**Who sees what.** Encryption moves the trust; it does not remove it. With DoH,
the network operator no longer sees the questions, but the resolver sees all of
them, along with the user's IP address. When browsers began sending everyone's
queries to a few large public resolvers, critics pointed out that this
concentrated the Internet's browsing history in fewer hands, and bypassed
networks' own filtering, for better (censorship) or worse (corporate security
policies and parental controls). Browsers now respect enterprise policies and a
"canary domain" that networks can use to ask them not to use DoH.

**Oblivious DoH** (ODoH, RFC 9230, 2022) splits the trust. The device encrypts
its query with HPKE to the resolver's public key and sends it through a
**proxy**. The proxy sees the user's address but not the query; the resolver sees
the query but not the address. Unless the two collude, no one sees both. The
same idea, applied to HTTP generally, is **Oblivious HTTP** (RFC 9458, 2024),
and Apple's iCloud Private Relay uses a related two-hop design.

A run of ODoH: the resolver, here called the **target**, publishes an HPKE
public key and cipher suite (X25519, HKDF-SHA256 and AES-128-GCM, for example).
The client seals its DNS message to that key and POSTs it to the **proxy**,
naming the target in the URL, as `application/oblivious-dns-message`. The
proxy forwards it over its own TLS connection; the target opens it, resolves
the name, and seals the answer under a key derived from the same HPKE exchange
and a fresh nonce, so only that client can read it. The proxy holds no keys.
RFC 9230 is an Experimental RFC by engineers from Apple, Cloudflare and Fastly;
Cloudflare's resolver has accepted ODoH since late 2020.

### What each one hides, and from whom

| | Network on the path | Resolver | Proves the answer? |
| --- | --- | --- | --- |
| Plain DNS | reads and can change everything | question and address | no |
| DoT | sees DNS on port 853, not what | question and address | no |
| DoH | sees HTTPS to the resolver | question and address | no |
| ODoH | sees HTTPS to the proxy | proxy: address; target: question | no |
| DNSSEC alone | reads everything | everything | yes, if validated |

Three leaks sit outside the table. The device next connects to the address it
got, and the TLS Server Name Indication names the site unless it uses Encrypted
Client Hello ([Chapter 3](03-TLS-1.3-Message-by-Message.md)). The resolver
still asks authoritative servers in the clear, usually without the user's
address (unless it passes part of it on as EDNS Client Subnet, RFC 7871). And
the resolver, the one party every row trusts, can keep logs; the standards say
nothing about retention.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Who sees DNS queries: with plain DNS everyone on the path; with DoH only the resolver; with Oblivious DoH the proxy sees the address but not the query and the resolver sees the query but not the address" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">plain DNS</text>
<rect x="20" y="32" width="110" height="36" rx="5" class="soft" stroke="currentColor"/><text x="75" y="55" text-anchor="middle">device</text>
<rect x="250" y="32" width="120" height="36" rx="5" class="soft-acc" stroke="currentColor"/><text x="310" y="55" text-anchor="middle">network, Wi-Fi</text>
<rect x="490" y="32" width="130" height="36" rx="5" class="soft-acc" stroke="currentColor"/><text x="555" y="55" text-anchor="middle">resolver</text>
<line x1="130" y1="50" x2="250" y2="50" stroke="currentColor"/><line x1="370" y1="50" x2="490" y2="50" stroke="currentColor"/>
<text x="320" y="88" text-anchor="middle" font-size="12.5" class="acc-fill">shaded: sees who asked what, and can change the answer</text>
<text x="20" y="122" font-weight="bold">DNS over HTTPS</text>
<rect x="20" y="132" width="110" height="36" rx="5" class="soft" stroke="currentColor"/><text x="75" y="155" text-anchor="middle">device</text>
<rect x="250" y="132" width="120" height="36" rx="5" class="soft" stroke="currentColor"/><text x="310" y="155" text-anchor="middle">network, Wi-Fi</text>
<rect x="490" y="132" width="130" height="36" rx="5" class="soft-acc" stroke="currentColor"/><text x="555" y="155" text-anchor="middle">resolver</text>
<line x1="130" y1="150" x2="490" y2="150" stroke="currentColor" stroke-width="3" stroke-dasharray="8 4"/>
<text x="20" y="212" font-weight="bold">Oblivious DoH</text>
<rect x="20" y="222" width="110" height="36" rx="5" class="soft" stroke="currentColor"/><text x="75" y="245" text-anchor="middle">device</text>
<rect x="250" y="222" width="120" height="36" rx="5" class="soft" stroke="currentColor"/><text x="310" y="238" text-anchor="middle">proxy</text><text x="310" y="253" text-anchor="middle" font-size="11.5">address, not query</text>
<rect x="490" y="222" width="130" height="36" rx="5" class="soft" stroke="currentColor"/><text x="555" y="238" text-anchor="middle">resolver</text><text x="555" y="253" text-anchor="middle" font-size="11.5">query, not address</text>
<line x1="130" y1="240" x2="250" y2="240" stroke="currentColor" stroke-width="3" stroke-dasharray="8 4"/>
<line x1="370" y1="240" x2="490" y2="240" stroke="currentColor" stroke-width="3" stroke-dasharray="8 4"/>
<text x="320" y="288" text-anchor="middle" font-size="12.5">dashed: encrypted. Private DNS hides questions; only DNSSEC proves answers.</text>
</svg>
<figcaption>Figure 10.8. Three ways to ask a question. Each step moves who can see the question; none of them proves the answer is genuine.</figcaption>
</figure>

The two halves of this chapter answer different questions and are needed
together. An encrypted channel to a resolver that lies, or that was itself
poisoned, delivers a forged answer privately. A signed answer delivered in the
clear tells everyone on the path what you asked. Encrypted transport to a
validating resolver protects both, as long as the resolver itself can be
trusted; a device that validates DNSSEC itself trusts nobody.

## 10.12 Mars: signed data travels well

*Level: intermediate.*

A resolver in Arcadia City asking a root server on Earth would wait 6 to 44
minutes for each answer, and a full resolution of a new name can take several
round trips. Plain DNS across the gap is hopeless. But DNSSEC's design is an
unusually good fit for delay, because what it protects is **data**, not a
**conversation**.

A signed zone is a file of records and signatures, valid for weeks, that
anyone can copy and anyone can check. The city's resolver can hold a complete
copy of the root zone, as RFC 8806 (2020) describes for resolvers on Earth,
and copies of the zones its residents need, refreshed by the store-and-forward
link of [Chapter 7](07-IPsec-and-IKEv2.md), §7.10. It validates every record
against the root KSK it already trusts, exactly as if it had fetched it live.
A record copied a day ago, carried across the gap and checked against a
signature, is as trustworthy as one fetched a second ago, as long as the
signature has not expired. An attacker who tampers with the copy in transit
produces a bogus zone that the city refuses.

The weak point is time. Signatures carry inception and expiration times, and a
validator must know the current time; a city whose clocks drifted, or whose
link failed for longer than the signatures' lifetime, would find whole zones
going bogus. The city's own names would live in a zone signed in the city, with
keys whose DS sits in the parent zone on Earth, so that residents keep
resolving local names even when Earth is behind the Sun.

### Code it: a habitat resolver across a blackout

A cold lookup of `www.example.com` needs a round trip per level (root,
`com.`, `example.com.`): 18 minutes at the closest, over two hours at the
farthest. A local signed copy costs nothing and is as trustworthy, until its
signatures expire. The program sets zones the city mirrors, with the signature
lifetimes their owners chose, against a two-week conjunction blackout.

```python
# A habitat resolver in Arcadia City mirrors signed zones from Earth. How long does
# each stay valid when the link goes quiet at solar conjunction?
blackout = 14                                      # days with no link (illustrative)
zones = {                                          # signature lifetime, re-signing interval (days)
    "news.example (Earth)":              (7, 3),
    "bank.example (Earth)":              (14, 7),
    "mars. (TLD, run from Earth)":       (30, 7),
    "shop.example (Earth, signed long)": (45, 7),
    "arcadia.mars. (signed in the city)": (None, None)}
for zone, (life, resign) in zones.items():
    if life is None:
        print(f"{zone:36s} re-signed locally: never expires")
        continue
    left = life - resign                           # worst case: last copy signed resign days ago
    verdict = "stays secure" if left > blackout else f"bogus from day {left}"
    print(f"{zone:36s} {left:2d} days of signatures left: {verdict}")
```

```text
news.example (Earth)                  4 days of signatures left: bogus from day 4
bank.example (Earth)                  7 days of signatures left: bogus from day 7
mars. (TLD, run from Earth)          23 days of signatures left: stays secure
shop.example (Earth, signed long)    38 days of signatures left: stays secure
arcadia.mars. (signed in the city)   re-signed locally: never expires
```

Survival depends only on the owner's choices. The remedy is a request, not a
protocol: before each conjunction the city asks the zones it depends on for
signatures that outlast the blackout, and signs its own zones locally.
Serving stale data (RFC 8767, 2020) does not help: it relaxes TTLs, not
signature expiry, and a validator that accepted expired signatures would
accept replayed old records.

Three more details matter on Mars. **Clocks**: validators allow only a small
skew, so the city needs a time source an attacker on the link cannot spoof.
**Trust anchors**: RFC 5011's hold-down is just data in the root zone, so the city learned KSK-2024 like any Earth resolver; for a compromised
root key it keeps IANA's signed `root-anchors.xml` on file.
**Privacy**: residents query the city's resolvers over DoT or DoH locally, and
only zone copies cross the gap, so Earth's networks learn which zones the city
mirrors, never which names a resident looked up.

## 10.13 In the real world

*Level: intermediate.*

- **Uneven deployment.** Nearly all top-level domains are signed, and the root
  has been since 2010. Below them, signing is common in some country domains,
  where registries encouraged it with discounts, and rare among large `.com`
  sites. Validation is more widespread than signing: many large resolvers,
  including the major public ones, validate by default, while many Internet
  providers still do not.
- **Algorithms.** Most signed zones use ECDSA P-256 (algorithm 13) or RSA with
  SHA-256 (8). Ed25519 (15) is recommended but less widely supported by
  registrars. SHA-1 signing algorithms are forbidden for new signatures since
  RFC 9905 (2025), and validators now treat zones signed only with them as
  insecure (§10.8).
- **Automation.** Most DNSSEC outages are DS records left pointing at old keys.
  CDS and CDNSKEY records (RFC 7344, RFC 8078) let a child publish the DS it
  wants, signed, so the parent can update itself, and many registries now do.
- **Post-quantum.** A quantum computer could forge DNSSEC signatures only from
  the day it exists; there is no recorded traffic to decrypt later, so DNSSEC is
  less urgent than key exchange. The obstacle is size: an ML-DSA-44 signature is
  2,420 bytes and its key 1,312, against 64 each for P-256, and DNS answers over
  about 1,232 bytes must fall back to TCP. In 2026 an individual Internet-Draft
  by engineers at Cloudflare and Google specified ML-DSA-44 for DNSSEC; reports
  say that IANA allocated it algorithm number 18 and that Cloudflare's public
  resolver began validating it, but as of November 2026 it is an experiment,
  not a standard. **Merkle Tree Ladder** mode,
  proposed by Verisign, signs a whole batch of records at once and gives each
  RRSIG only a short authentication path, keeping answers small.
- **What to do as a domain owner.** Sign with algorithm 13, let your DNS host
  automate re-signing and key rollovers, use CDS where your registry supports it,
  monitor signature expiry, and lock your registrar account with strong
  authentication. As a network operator: run a validating resolver, and offer
  DoT or DoH to your users.

## 10.14 Going deeper

*Level: expert.*

**Why the DS record.** The 1999 design had parents sign their children's keys
directly, so every change of a child's key required the parent to re-sign,
which top-level domains with millions of children could not do. The 2005
redesign put a hash of the child's key in a record the parent owns and signs on
its own schedule. It is a small change with large operational effects: a child
can roll its ZSK any time, and its KSK with one DS update.

**Key tags are not identifiers.** The 16-bit key tag is a checksum to speed up
key lookup; collisions are expected and, as KeyTrap showed, can be manufactured.
Validators must treat a tag as a hint and must cap the number of keys and
signatures they try.

**Multi-signer and algorithm rollovers.** A zone served by two DNS providers,
each signing with its own keys, needs each provider's DNSKEYs in the other's
DNSKEY set (RFC 8901). An algorithm rollover must sign every RRset with both
algorithms for a while (§10.8), because RFC 4035 requires a zone to sign each
RRset with every algorithm in its DNSKEY set. Validators, as RFC 6840 (2013)
clarified, need only one valid path, so a validator that understands only one
of the two algorithms still validates. The zone-side rule is what makes that
safe: whichever algorithm a validator supports, every answer carries a
signature it can check, so a missing signature is always a sign of tampering
rather than of a half-finished rollover.

**Formal and empirical studies.** Measurement papers have repeatedly found
large fractions of signed domains with broken or weak configurations, such as
expired signatures, short RSA keys and DS mismatches, and resolvers that
accepted them. Taejoong Chung and colleagues (IMC 2017) showed that
many registrars made DNSSEC hard or impossible for customers to deploy, which
explains much of the low adoption among `.com` names.

**DNS as a covert channel.** Even encrypted DNS leaks through sizes and timing,
and plain DNS is used by malware to tunnel data out of networks in query names.
Padding (RFC 7830 and RFC 8467, coded in §10.11) reduces the first leak;
detecting tunnels in the second means watching for long, high-entropy query
names and unusual volumes to one domain, which is how most networks look for
them.

## Check yourself

??? question "1. What does an off-path attacker need to guess to poison a resolver's cache, and what did Kaminsky change?"
    The query's 16-bit ID (and, after 2008, the source port) before the real
    answer arrives. Kaminsky made each attempt a fresh race by querying
    non-existent names and putting the poison in a referral, so failed races
    cost nothing.

??? question "2. What is the difference between secure, insecure and bogus?"
    Secure: a full chain of valid signatures to the trust anchor. Insecure: a
    proven absence of DS at some delegation, so the zone is unsigned and
    resolves without protection. Bogus: a chain that should exist fails; the
    resolver returns SERVFAIL.

??? question "3. Compute the key tag of the DNSKEY RDATA 01 00 03 0D 12 34 (flags 256, protocol 3, algorithm 13, a two-byte toy key). What is it once the REVOKE bit is set?"
    The words are 0x0100 = 256, 0x030D = 781 and 0x1234 = 4,660. Their sum is
    5,697, below $2^{16}$, so there is no carry to fold in: the tag is 5,697.
    The REVOKE bit (0x0080) turns the flags word into 0x0180 = 384, adding 128:
    the revoked key's tag is 5,825. This is why a revoked root key shows up
    under a new tag.

??? question "4. In RFC 5155's example zone, a resolver asks for a.c.x.w.example. Which three facts must the NSEC3 records prove?"
    That the closest encloser x.w.example exists (a record owned by its
    hash, b4um86eg...); that the next closer name c.x.w.example does not (a
    record whose gap covers its hash, 0p9mhave...); and that there is no
    wildcard *.x.w.example (the record at 35mthgpg... covers its hash).

??? question "5. Iterations and salt were meant to slow down zone walking. Why does RFC 9276 ask for zero extra iterations and no salt?"
    Iterations slow servers and validators as much as the attacker, online
    and for every negative answer, which made high counts a denial-of-service
    lever. The salt adds nothing: the zone name is already hashed in, so
    tables never carry between zones, and the salt is public and rarely
    changes.

??? question "6. What did KeyTrap exploit, and why was it easy to set up?"
    The rule to try every matching key with every signature: many keys
    sharing one tag and many signatures forced tens of thousands of checks
    per answer. Easy, because the tag is a 16-bit checksum that the last two
    bytes of a key can set to anything.

??? question "7. A mail server publishes _25._tcp.mx.example. TLSA 3 1 1 followed by a hash. What is hashed, what in the certificate is ignored, and what breaks at renewal?"
    The SHA-256 of the DER-encoded SubjectPublicKeyInfo. The certificate's
    names and expiry are ignored. A renewal that keeps the key still matches;
    one that makes a new key does not, and DANE senders defer mail until a
    record for it appears, so the next key's record goes in first.

??? question "8. Where do DANE and MTA-STS each get their trust, and what can an attacker do against MTA-STS that it cannot do against DANE?"
    DANE gets the "use TLS" signal and the key from DNSSEC. MTA-STS gets the
    signal from a cached HTTPS policy and checks the key with the CA system.
    An attacker who blocks the first policy fetch can still strip STARTTLS,
    and any CA that misissues for the MX name can impersonate it.

??? question "9. What does DNS over HTTPS hide, and from whom? What does Oblivious DoH add, and what does neither do?"
    DoH hides questions from the network between device and resolver; the
    resolver still sees the question and the address. ODoH relays a question
    encrypted to the resolver through a proxy, which sees the address but not
    the question. Neither proves the answer; only DNSSEC does.

??? question "10. A habitat resolver mirrors signed zones from Earth. Why does a two-week blackout at solar conjunction make some zones bogus, and what can be done?"
    Validation needs unexpired signatures, and each owner chooses their
    lifetime; a copy with a few days left goes bogus mid-blackout. The city
    asks for signatures that outlast the blackout and signs its own zones
    locally.

## What you learned

- DNS trusts the first plausible answer; cache poisoning, Kaminsky's attack and
  SAD DNS show that guessing defenses only raise the cost.
- DNSSEC signs RRsets in advance with ZSKs, signs the keys with a KSK, and
  links each zone to its parent with a DS record, up to the root's trust anchor.
- A key tag is a 16-bit checksum, a hint; the DS digest binds parent to child.
- Denial of existence uses NSEC (zone walking) or NSEC3 (a dictionary attack);
  RFC 9276 asks for no salt and no extra iterations; compact denial and NSEC5
  go further.
- Strict validation turns operator mistakes into outages, and generous
  validation rules allowed KeyTrap; registrar compromise bypasses DNSSEC
  entirely.
- The root KSK is guarded by ceremonies and rolled through RFC 5011; KSK-2024
  has signed the root since 11 October 2026, and an ECDSA root is planned.
- DANE for mail ("3 1 1" TLSA records) stops STARTTLS stripping; MTA-STS does
  it without DNSSEC, trusting CAs and the first policy fetch.
- DoT, DoH and DoQ encrypt the questions; ODoH splits who sees the asker and
  the question; only DNSSEC proves the answer.
- On Mars, signed zone copies replace 44-minute round trips, limited by
  signature lifetimes and a trusted clock.

**Next:** [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md), proving who
you are with a code from your phone, and with passwords that are never sent.

## Further reading

- RFC 1034 and RFC 1035 (DNS, 1987); RFC 4033, RFC 4034 and RFC 4035 (DNSSEC,
  2005); RFC 5155 (NSEC3), RFC 9276 (NSEC3 parameters); RFC 3110, RFC 5702,
  RFC 6605 (ECDSA), RFC 8080 (EdDSA); RFC 6840; RFC 5011 (trust anchor
  updates), RFC 8145 (anchor telemetry), RFC 8509 (sentinel); RFC 6781 and
  RFC 7583 (operations and rollover timing); RFC 9364 (BCP 237); RFC 8624,
  RFC 9904 and RFC 9905 (algorithms, deprecating SHA-1, 2025).
- RFC 6698 (DANE), RFC 7671, RFC 7672 (DANE for SMTP), RFC 3207 (STARTTLS),
  RFC 8461 (MTA-STS), RFC 8460 (TLS reporting), RFC 9460 (SVCB and HTTPS
  records), RFC 8806 (local root), RFC 8767 (serving stale data).
- RFC 7858 (DNS over TLS), RFC 8310, RFC 8484 (DNS over HTTPS), RFC 9250 (DNS
  over QUIC), RFC 9230 (Oblivious DoH), RFC 9458 (Oblivious HTTP); RFC 7830
  and RFC 8467 (padding); RFC 9462 and RFC 9463 (resolver discovery); RFC 7871.
- Dan Kaminsky, "Black ops 2008: it's the end of the cache as we know it"
  (Black Hat 2008).
- Keyu Man, Zhiyun Qian et al., "DNS cache poisoning attack reloaded:
  revolutions with side channels" (CCS 2020).
- Sharon Goldberg, Moni Naor, Dimitrios Papadopoulos, Leonid Reyzin, Sachin
  Vasant and Asaf Ziv, "NSEC5: provably preventing DNSSEC zone enumeration"
  (NDSS 2015).
- Taejoong Chung et al., "Understanding the role of registrars in DNSSEC
  deployment" (IMC 2017).
- Elias Heftrig, Haya Schulmann, Niklas Vogel and Michael Waidner, "The KeyTrap
  denial-of-service algorithmic complexity attacks on DNS" (2024).
- Zakir Durumeric et al., "Neither snow nor rain nor MITM...: an empirical
  analysis of email delivery security" (IMC 2015).
- Gaëtan Leurent and Thomas Peyrin, "SHA-1 is a shambles: first chosen-prefix
  collision on SHA-1 and application to the PGP web of trust" (USENIX Security
  2020).
- ICANN, "Proposal for root zone KSK algorithm rollover" (February 2026), and
  SSAC, SAC133, comments on the proposed root KSK algorithm rollover (2026).
- Microsoft Exchange Team, "Announcing general availability of inbound SMTP
  DANE with DNSSEC for Exchange Online" (October 2024).
- Cisco Talos, "DNS hijacking abuses trust in core Internet service" (Sea
  Turtle, April 2019).
- ICANN's root KSK rollover pages and ceremony archives, including the 2018
  rollover's postponement notice (27 September 2017) and the KSK-2024
  guidance (2026), and IANA's `root-anchors.xml`.
