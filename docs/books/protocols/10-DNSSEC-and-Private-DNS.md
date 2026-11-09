# 10. DNSSEC and private DNS

*Before a browser opens a TLS connection, before SSH checks a host key, before
a mail server looks for a recipient, something has to turn a name into an
address. That something is the Domain Name System, and for most of its life it
has trusted whatever answer arrived first. This chapter covers the two
separate fixes. DNSSEC signs the answers, so a resolver can check that a record
is the one the zone's owner published; you will verify a real signature from
an RFC, build a chain of trust from a trust anchor down to a name, hash and then
un-hash NSEC3 records, and compute the root zone's own key fingerprint. Private
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
    - how DNSSEC proves that a name does *not* exist, with NSEC and NSEC3, and
      how that leaks the zone's contents;
    - how validation fails in practice, and the KeyTrap denial of service;
    - the root key, its ceremonies and its rollovers;
    - DANE and other uses of signed DNS;
    - DNS over TLS, HTTPS and QUIC, Oblivious DoH, and what each hides from whom.

    **You need:** [Chapter 2](02-Certificates-and-PKI.md) (chains of trust) and
    [Chapter 3](03-TLS-1.3-Message-by-Message.md) for the encrypted transports;
    ECDSA and RSA signatures from Chapters
    [13](../../book/13-RSA.md) and [15](../../book/15-Elliptic-Curves.md) of book 1.

    **Levels:** §10.1 to §10.3 are for beginners, §10.4 to §10.11 are
    intermediate, §10.12 is expert.

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
and it is why DNSSEC suits delayed and disconnected networks (§10.10).

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
# Sign a small zone with a KSK and a ZSK, publish a DS in the parent, and
# validate down the chain from a trust anchor. Continue from above.
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

Iterations and salts were meant to slow the dictionary down. They slow down
the zone's own servers and every validating resolver by the same factor, which
made high iteration counts a denial-of-service lever. RFC 9276 (2022) now asks
for **zero** extra iterations and no salt, admitting that NSEC3 gives only
modest protection against enumeration. Two newer ideas go further. **Compact
denial of existence**, first deployed by Cloudflare as "black lies", has an
online signer answer every non-existent name with a freshly signed NSEC record
that covers only that name, so nothing can be walked; it requires the signing
key on the server. **NSEC5** (Sharon Goldberg and colleagues, 2015) replaces the
hash with a verifiable random function, so that only the zone's server can
compute the hash of a name, but any resolver can verify it.

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
the encrypted transports of §10.9.

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
rebuild the system if both facilities were lost, using secret sharing.

### Code it: the root's own fingerprint

The root KSK in use since October 2026 is called KSK-2024, after the year it was
generated. IANA publishes its DS record as the trust anchor that resolvers ship
with. The program below computes its key tag and DS digest from the public key.

```python
# The root of DNSSEC: key tag and DS of the root zone's key-signing key KSK-2024,
# compared with the trust anchor IANA publishes (root-anchors.xml). Continue from above.
ksk2024 = base64.b64decode(
    "AwEAAa96jeuknZlaeSrvyAJj6ZHv28hhOKkx3rLGXVaC6rXTsDc449/cidltpkyG"
    "wCJNnOAlFNKF2jBosZBU5eeHspaQWOmOElZsjICMQMC3aeHbGiShvZsx4wMYSjH8"
    "e7Vrhbu6irwCzVBApESjbUdpWWmEnhathWu1jo+siFUiRAAxm9qyJNg/wOZqqzL/"
    "dL/q8PkcRU5oUKEpUge71M3ej2/7CPqpdVwuMoTvoB+ZOT4YeGyxMvHmbrxlFzGO"
    "HOijtzN+u1TQNatX2XBuzZNQ1K+s2CXkPIZo7s6JgZyvaBevYtxPvYLw4z9mR7K2"
    "vaF18UYH9Z9GNUUeayffKC73PYc=")
rdata = struct.pack(">HBB", 257, 3, 8) + ksk2024          # flags 257 (KSK), RSA/SHA-256
print("modulus:", (len(ksk2024) - 1 - ksk2024[0]) * 8, "bits; exponent:",
      int.from_bytes(ksk2024[1:1 + ksk2024[0]], "big"))
print("key tag:", key_tag(rdata))
print("DS digest:", hashlib.sha256(wire(".") + rdata).hexdigest().upper())
print("matches IANA:", hashlib.sha256(wire(".") + rdata).hexdigest().upper() ==
      "683D2D0ACB8C9B712A1948B27F741219298D0A450D612C483AF444A4C0FB2B16")
```

```text
modulus: 2048 bits; exponent: 65537
key tag: 38696
DS digest: 683D2D0ACB8C9B712A1948B27F741219298D0A450D612C483AF444A4C0FB2B16
matches IANA: True
```

**Rollovers.** Replacing the root KSK means every validating resolver in the
world must learn the new key. RFC 5011 (2007) lets a resolver accept a new key
automatically if it appears, signed by the old one, for 30 days. The first
rollover, from KSK-2010 to KSK-2017, was planned for October 2017 and postponed
by a year when telemetry from resolvers (RFC 8145) showed that a noticeable
number had not picked up the new key; it happened on 11 October 2018 with
little disruption. KSK-2024 was published in the root zone in January 2025 and
began signing on 11 October 2026; ICANN reported that it went as planned.
KSK-2017 is to be revoked in January 2027. Both are 2048-bit RSA keys, and ICANN
has proposed moving the root to ECDSA P-256, an algorithm rollover that is
harder than a key rollover because old resolvers that do not support the new
algorithm treat the root as insecure.

## 10.8 What signed DNS makes possible

*Level: intermediate.*

Once DNS answers can be trusted, DNS can carry keys.

- **DANE** (DNS-based Authentication of Named Entities, RFC 6698, 2012) puts a
  hash of a server's TLS certificate or public key in a **TLSA** record. A
  client that validates DNSSEC can check the server's key against it, either
  in addition to the CA system or instead of it. Browsers never adopted DANE,
  partly because many networks and devices could not deliver DNSSEC records
  reliably. Email did: RFC 7672 (2015) uses DANE to tell sending mail servers
  that a receiving server supports TLS and which key it uses, which defeats the
  STARTTLS stripping attacks of [Chapter 15](15-Email-OpenPGP-and-SMIME.md).
  Several large mail providers support it.
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

## 10.9 Private DNS: encrypting the questions

*Level: intermediate.*

DNSSEC does nothing for privacy: the question "what is the address of
`clinic.example`?" crosses the network in the clear, and anyone on the path can
read it, log it or block it. Three standards encrypt the path between a device
and its resolver:

- **DNS over TLS** (DoT, RFC 7858, 2016) runs DNS inside TLS on port 853.
  Android calls it "Private DNS".
- **DNS over HTTPS** (DoH, RFC 8484, 2018) sends DNS messages as HTTPS requests,
  on port 443, where they look like any other web traffic and are hard to block
  without blocking the web. Browsers adopted it first: Firefox turned it on by
  default for users in the United States in 2020.
- **DNS over QUIC** (DoQ, RFC 9250, 2022) uses QUIC
  ([Chapter 5](05-TLS-in-Practice.md)) for lower latency and no head-of-line
  blocking.

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
<figcaption>Figure 10.5. Three ways to ask a question. Each step moves who can see the question; none of them proves the answer is genuine.</figcaption>
</figure>

The two halves of this chapter answer different questions and are needed
together. An encrypted channel to a resolver that lies, or that was itself
poisoned, delivers a forged answer privately. A signed answer delivered in the
clear tells everyone on the path what you asked. Encrypted transport to a
validating resolver protects both, as long as the resolver itself can be
trusted; a device that validates DNSSEC itself trusts nobody.

## 10.10 Mars: signed data travels well

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

## 10.11 In the real world

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
  insecure.
- **Automation.** Most DNSSEC outages are DS records left pointing at old keys.
  CDS and CDNSKEY records (RFC 7344, RFC 8078) let a child publish the DS it
  wants, signed, so the parent can update itself, and many registries now do.
- **Post-quantum.** A quantum computer could forge DNSSEC signatures only from
  the day it exists; there is no recorded traffic to decrypt later, so DNSSEC is
  less urgent than key exchange. The obstacle is size: an ML-DSA-44 signature is
  2,420 bytes and its key 1,312, against 64 each for P-256, and DNS answers over
  about 1,232 bytes must fall back to TCP. In August 2026 IANA assigned ML-DSA-44
  an algorithm number from an individual draft. **Merkle Tree Ladder** mode,
  proposed by Verisign, signs a whole batch of records at once and gives each
  RRSIG only a short authentication path, keeping answers small.
- **What to do as a domain owner.** Sign with algorithm 13, let your DNS host
  automate re-signing and key rollovers, use CDS where your registry supports it,
  monitor signature expiry, and lock your registrar account with strong
  authentication. As a network operator: run a validating resolver, and offer
  DoT or DoH to your users.

## 10.12 Going deeper

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
algorithms for a while, because RFC 4035 requires a validator to find a valid
signature for each algorithm listed in the DS. The rules follow from a
downgrade argument: if signatures with one algorithm could be dropped, an
attacker could strip the stronger one.

**Formal and empirical studies.** Measurement papers have repeatedly found
large fractions of signed domains with broken or weak configurations, such as
expired signatures, short RSA keys and DS mismatches, and resolvers that
accepted them. Taejoong Chung and colleagues (IMC 2017) showed that
many registrars made DNSSEC hard or impossible for customers to deploy, which
explains much of the low adoption among `.com` names.

**DNS as a covert channel.** Even encrypted DNS leaks through sizes and timing,
and plain DNS is used by malware to tunnel data out of networks in query names.
Padding (RFC 7830 and RFC 8467) pads encrypted DNS messages to fixed block
sizes to reduce the first leak.

## Check yourself

??? question "1. What does an off-path attacker need to guess to poison a resolver's cache, and what did Kaminsky change?"
    The query's 16-bit ID (and, after 2008, the source port) before the real
    answer arrives. Kaminsky made each attempt a fresh race by querying
    non-existent names and putting the poison in a referral, so failed races
    cost nothing.

??? question "2. Name DNSSEC's three main record types and what each signs or holds."
    DNSKEY: a zone's public keys (KSK and ZSK). RRSIG: a signature over one
    RRset by one key. DS: in the parent, a hash of the child's KSK, signed by
    the parent.

??? question "3. Why do most zones have both a KSK and a ZSK?"
    Only the KSK's hash is in the parent's DS. The ZSK, which signs the zone's
    data, can be replaced often without contacting the parent; the KSK signs
    only the DNSKEY set and changes rarely.

??? question "4. What is the difference between secure, insecure and bogus?"
    Secure: a full chain of valid signatures to the trust anchor. Insecure: a
    proven absence of DS at some delegation, so the zone is unsigned and
    resolves without protection. Bogus: a chain that should exist fails; the
    resolver returns SERVFAIL.

??? question "5. How does NSEC prove that a name does not exist, and what does it leak?"
    It signs a record naming the next existing name in canonical order; a name
    between the two does not exist. Following the chain lists every name in the
    zone.

??? question "6. Why does NSEC3 only slow zone walking down?"
    The hash is unkeyed: anyone can hash candidate names, with the published
    salt and iterations, and compare them with the collected hashes. Common
    names are recovered by a dictionary.

??? question "7. What did KeyTrap exploit?"
    The rule that resolvers should try every matching key and signature: an
    attacker's zone with many keys sharing a key tag and many signatures forced
    millions of signature checks for one query.

??? question "8. What does DNS over HTTPS hide, and from whom? What does it not do?"
    It hides queries and answers from the network between the device and the
    resolver. The resolver still sees everything, and it does not prove the
    answers are genuine; only DNSSEC does.

??? question "9. How does Oblivious DoH split trust?"
    The query is encrypted to the resolver and sent through a proxy. The proxy
    sees the client's address but not the query; the resolver sees the query
    but not the address. They must collude to link the two.

??? question "10. Why is DNSSEC well suited to a city with a long delay to Earth?"
    It protects data, not a session: signed zones can be copied across the gap
    in advance and validated locally against the root key, with no live round
    trips. The constraint is time, since signatures expire.

## What you learned

- DNS trusts the first plausible answer; cache poisoning, Kaminsky's attack and
  SAD DNS show that guessing defenses only raise the cost.
- DNSSEC signs RRsets in advance with ZSKs, signs the keys with a KSK, and
  links each zone to its parent with a DS record, up to the root's trust anchor.
- Denial of existence uses NSEC (which allows zone walking) or NSEC3 (which
  turns it into a dictionary attack); compact denial and NSEC5 go further.
- Strict validation turns operator mistakes into outages, and generous
  validation rules allowed KeyTrap; registrar compromise bypasses DNSSEC
  entirely.
- The root KSK is guarded by ceremonies and rolled over through RFC 5011; KSK-2024
  has signed the root since October 2026.
- DoT, DoH and DoQ encrypt the questions; ODoH splits who sees the asker and
  the question; only DNSSEC proves the answer.

**Next:** [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md), proving who
you are with a code from your phone, and with passwords that are never sent.

## Further reading

- RFC 1034 and RFC 1035 (DNS, 1987); RFC 4033, RFC 4034 and RFC 4035 (DNSSEC,
  2005); RFC 5155 (NSEC3), RFC 9276 (NSEC3 parameters); RFC 6605 (ECDSA), RFC 8080
  (EdDSA); RFC 5011 (trust anchor updates); RFC 6781 (operational practices);
  RFC 9364 (BCP 237); RFC 9904 and RFC 9905 (algorithm process, deprecating
  SHA-1).
- RFC 6698 (DANE), RFC 7672 (DANE for SMTP), RFC 9460 (SVCB and HTTPS records),
  RFC 8806 (local root).
- RFC 7858 (DNS over TLS), RFC 8484 (DNS over HTTPS), RFC 9250 (DNS over QUIC),
  RFC 9230 (Oblivious DoH), RFC 9458 (Oblivious HTTP).
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
- Cisco Talos, "DNS hijacking abuses trust in core Internet service" (Sea
  Turtle, April 2019).
- ICANN's root KSK rollover pages and ceremony archives, and IANA's
  `root-anchors.xml`.
