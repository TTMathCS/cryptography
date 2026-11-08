# 4. Thirty Years of TLS Attacks

*TLS 1.3 is short because TLS 1.2 was long, and TLS 1.2 was long because
every version before it was attacked and patched rather than redesigned. This
chapter tells the story of those attacks, from SSL 2 in 1995 to the timing
attacks of the 2020s, grouped by the part of the protocol each one hit: the
key exchange, the record layer, the negotiation, the binding between
handshakes, and the code itself. For each, what happened, who found it, how
much it mattered and how it was fixed. You will run a downgrade attack and
stop it with a transcript MAC and a fallback signal, splice a request into a
victim's session the way the 2009 renegotiation attack did, and read secrets
out of a server's memory with a heartbeat that lies about its length.*

!!! abstract "In this chapter"
    **You will learn:**

    - how SSL and TLS evolved from 1995 to 2008, and what each version fixed;
    - the attacks on RSA key transport: Bleichenbacher's oracle (1998), ROBOT
      and DROWN;
    - the attacks on CBC and RC4 records: BEAST, Lucky Thirteen, POODLE and the
      RC4 biases, and compression leaks (CRIME and BREACH);
    - downgrades: export ciphers, FREAK, Logjam, the "downgrade dance" and
      SLOTH, and the defenses (transcript MACs, TLS_FALLBACK_SCSV, the 1.3
      sentinel);
    - handshake-binding failures: renegotiation (2009) and the triple
      handshake (2014);
    - implementation bugs: Heartbleed, goto fail and state-machine errors;
    - how each lesson became a deletion in TLS 1.3.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) and
    [Chapter 3](03-TLS-1.3-Message-by-Message.md); CBC mode and padding from
    [Chapter 8 of book 1](../../book/08-Modes-of-Operation.md); RSA from
    [Chapter 13](../../book/13-RSA.md). The inner workings of padding oracles,
    nonce reuse and compression oracles are taught in book 2,
    *Cryptanalysis* (chapter 10); this chapter tells what they did to TLS.

    **Levels:** §4.1 and §4.2 are for beginners, §4.3 to §4.10 are
    intermediate, §4.11 is expert.

## 4.1 The problem

*Level: beginner.*

In February 1995 Netscape shipped SSL 2.0 in its Navigator browser. It had been
designed in a few months by Kipp Hickman and had not been reviewed by any
outside cryptographer. Within a year its problems were public. It used the
same key for encryption and for the MAC. Its MAC used MD5 in an ad hoc way.
Under US export rules, versions sold abroad could use only 40-bit keys, and the
"export" option was in every copy. Most importantly, the list of cipher suites
the two sides exchanged at the start was not protected by anything: an attacker
could delete the strong suites from the client's offer and both sides would
settle on 40-bit encryption. In August 1995 a French student, Damien Doligez,
broke a 40-bit SSL session posted as a public challenge in eight days on idle
university computers. A month later Ian Goldberg and David Wagner, graduate
students at Berkeley, showed that it did not even take that long: Netscape's
random number generator was seeded from the time of day and process numbers,
so its keys could be guessed in seconds.

Netscape hired the cryptographer Paul Kocher to redesign it, working with
Netscape's Phil Karlton and Alan Freier. SSL 3.0 (1996) is the ancestor of
everything since: separate keys for each direction and each purpose, a MAC
over the whole handshake in the Finished messages, and a structure that could
grow. The IETF took it over and, with small changes, published it as TLS 1.0
in 1999 (RFC 2246). TLS 1.1 (2006) fixed one problem in CBC mode; TLS 1.2
(2008) replaced MD5 and SHA-1 in its internals with SHA-256 and added AEAD
cipher suites such as AES-GCM.

What did not happen, for twenty years, was removal. Each version kept the old
options for compatibility, and servers kept old versions for old clients.
Cryptographers kept finding that some combination of an old option, an old
version and a clever attacker broke the whole system. The attacks of 2011 to
2016 in particular came so fast that they acquired brand names, logos and web
sites. Under the names, they fall into five families, and each family taught
TLS 1.3 something to remove.

<figure class="mars-fig">
<svg viewBox="0 0 640 470" width="640" role="img" aria-label="Timeline of TLS attacks from SSL 2 in 1995 to Marvin in 2023" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="462" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold" class="acc-fill">1995</text>
<circle cx="92" cy="22" r="4.5" class="acc-fill"/>
<text x="108" y="27" class="acc-fill">SSL 2 downgrade; Netscape's guessable random numbers</text>
<text x="78" y="53" text-anchor="end" font-weight="bold" class="acc-fill">1998</text>
<circle cx="92" cy="48" r="4.5" class="acc-fill"/>
<text x="108" y="53" class="acc-fill">Bleichenbacher's "million message" attack on RSA</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">2002</text>
<circle cx="92" cy="74" r="3.5"/>
<text x="108" y="79">Vaudenay: padding oracles on CBC</text>
<text x="78" y="105" text-anchor="end" font-weight="bold" class="acc-fill">2009</text>
<circle cx="92" cy="100" r="4.5" class="acc-fill"/>
<text x="108" y="105" class="acc-fill">Renegotiation attack (Ray and Dispensa)</text>
<text x="78" y="131" text-anchor="end" font-weight="bold" class="acc-fill">2011</text>
<circle cx="92" cy="126" r="4.5" class="acc-fill"/>
<text x="108" y="131" class="acc-fill">BEAST: predictable CBC IVs in TLS 1.0</text>
<text x="78" y="157" text-anchor="end" font-weight="bold" class="acc-fill">2012</text>
<circle cx="92" cy="152" r="4.5" class="acc-fill"/>
<text x="108" y="157" class="acc-fill">CRIME: compression leaks cookies</text>
<text x="78" y="183" text-anchor="end" font-weight="bold" class="acc-fill">2013</text>
<circle cx="92" cy="178" r="4.5" class="acc-fill"/>
<text x="108" y="183" class="acc-fill">Lucky Thirteen; RC4 biases; BREACH</text>
<text x="78" y="209" text-anchor="end" font-weight="bold" class="acc-fill">2014</text>
<circle cx="92" cy="204" r="4.5" class="acc-fill"/>
<text x="108" y="209" class="acc-fill">Heartbleed; goto fail; triple handshake; POODLE</text>
<text x="78" y="235" text-anchor="end" font-weight="bold" class="acc-fill">2015</text>
<circle cx="92" cy="230" r="4.5" class="acc-fill"/>
<text x="108" y="235" class="acc-fill">FREAK; Logjam; SMACK; RC4 forbidden</text>
<text x="78" y="261" text-anchor="end" font-weight="bold" class="acc-fill">2016</text>
<circle cx="92" cy="256" r="4.5" class="acc-fill"/>
<text x="108" y="261" class="acc-fill">DROWN; SLOTH; Sweet32</text>
<text x="78" y="287" text-anchor="end" font-weight="bold" class="acc-fill">2017</text>
<circle cx="92" cy="282" r="4.5" class="acc-fill"/>
<text x="108" y="287" class="acc-fill">ROBOT: Bleichenbacher's oracle, 19 years on</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="308" r="3.5"/>
<text x="108" y="313">TLS 1.3 removes every feature attacked above</text>
<text x="78" y="339" text-anchor="end" font-weight="bold" class="acc-fill">2019</text>
<circle cx="92" cy="334" r="4.5" class="acc-fill"/>
<text x="108" y="339" class="acc-fill">Zombie POODLE and GOLDENDOODLE in old servers</text>
<text x="78" y="365" text-anchor="end" font-weight="bold" class="acc-fill">2020</text>
<circle cx="92" cy="360" r="4.5" class="acc-fill"/>
<text x="108" y="365" class="acc-fill">Raccoon: timing on TLS 1.2 Diffie-Hellman</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">TLS 1.0 and 1.1 formally deprecated (RFC 8996)</text>
<text x="78" y="417" text-anchor="end" font-weight="bold" class="acc-fill">2023</text>
<circle cx="92" cy="412" r="4.5" class="acc-fill"/>
<text x="108" y="417" class="acc-fill">Marvin: Bleichenbacher timing, 25 years on</text>
</svg>
<figcaption>Figure 4.1. The named attacks on SSL and TLS. Nearly all target options that TLS 1.3 removed.</figcaption>
</figure>

## 4.2 A map of the attacks

*Level: beginner.*

A TLS 1.2 connection had five places where things could go wrong, and each
attack in this chapter belongs to one of them.

| Family | What was attacked | Named attacks | Removed or fixed in 1.3 by |
| --- | --- | --- | --- |
| Key exchange | RSA key transport and its padding | Bleichenbacher, ROBOT, DROWN, Marvin | no RSA key transport at all |
| Record layer | CBC with MAC-then-encrypt; RC4; compression | BEAST, Lucky 13, POODLE, RC4 biases, CRIME | AEAD only; no compression |
| Negotiation | weak options both sides still allowed | SSL 2 downgrade, FREAK, Logjam, SLOTH, downgrade dance | signed transcript; named groups; sentinel |
| Handshake binding | handshakes not tied to each other | renegotiation, triple handshake | no renegotiation; keys bound to transcript |
| Implementation | bugs in code | Heartbleed, goto fail, SMACK, CCS injection | simpler state machine (but code is still code) |

Notice that only one attack in the table (the RC4 biases) is about a primitive
that was weak in itself. The rest attacked the way sound primitives were
combined, the options left lying around, or the code.

## 4.3 The key exchange: RSA and its padding

*Level: intermediate.*

In TLS 1.2's `RSA` key exchange, the client picks a 48-byte **premaster
secret**, encrypts it to the server's RSA public key with PKCS #1 v1.5 padding
([Chapter 13 of book 1](../../book/13-RSA.md)), and sends it. Everything
depends on that one ciphertext, and two things go wrong with it.

**No forward secrecy.** Anyone who records the connection and later gets the
server's private key decrypts the premaster secret and every key. Chapter 1
explained why that matters.

**A padding oracle.** In 1998 Daniel Bleichenbacher, at Bell Labs, showed that
if a server reveals, by any means, whether a ciphertext it received had valid
PKCS #1 v1.5 padding (the plaintext starts with bytes `00 02`), then an
attacker can decrypt any recorded RSA ciphertext by sending the server about a
million carefully modified versions of it and watching which are "valid". The
method, an adaptive chosen-ciphertext attack that narrows the plaintext's
range with each answer, is taught in book 2, *Cryptanalysis*. For TLS the
consequence was simple: a server that sent a different alert, or took a
different time, for bad padding than for a bad premaster secret, let an
attacker decrypt recorded sessions or sign with the server's key.

The fix in TLS was not to change RSA but to hide the oracle. TLS 1.0's RFC
told servers to treat bad padding exactly like a good padding with a wrong
secret: generate a random premaster secret, carry on, and let the handshake fail
at the Finished message. Getting implementations to behave *identically* in
both cases, down to timing, proved nearly impossible:

- **ROBOT** (Return Of Bleichenbacher's Oracle Threat, 2017). Hanno Böck,
  Juraj Somorovsky and Craig Young tested real servers and found that 27 of the
  top 100 web domains, including Facebook and PayPal, still had a distinguishable
  oracle, through different alerts, TCP resets or timeouts. They signed a
  message with Facebook's key to prove it.
- **DROWN** (2016). Nimrod Aviram and fifteen colleagues showed that a server
  that still accepted SSL 2 connections, even on another port or another
  machine sharing the same RSA key (a mail server, say), offered a
  Bleichenbacher-style oracle through SSL 2's export ciphers. That oracle could
  decrypt a *TLS* connection that used the same key. At disclosure about a
  third of HTTPS servers were vulnerable, and the attack cost under a day of
  rented computing.
- **Marvin** (2023). Hubert Kario showed that many RSA decryption libraries,
  well beyond TLS, still leaked padding validity through timing differences of
  microseconds, measurable over a network with enough samples.

!!! note "Life story: Bleichenbacher's attack"
    **Born:** 1998, Daniel Bleichenbacher (Bell Labs), CRYPTO 1998, "Chosen
    ciphertext attacks against protocols based on the RSA encryption standard
    PKCS #1" · **Purpose:** show that a server revealing PKCS #1 v1.5 padding
    validity lets anyone decrypt RSA ciphertexts · **Helped:** OAEP's
    adoption, TLS's "pretend it was fine" countermeasure, and finally the
    removal of RSA key transport in TLS 1.3 · **Status:** still found in new
    implementations; ROBOT (2017) and Marvin (2023) are its descendants

!!! note "Life story: DROWN"
    **Born:** March 2016, Nimrod Aviram, Sebastian Schinzel, Juraj Somorovsky,
    Nadia Heninger and others (USENIX Security 2016) · **Purpose:** decrypt
    modern TLS using an SSL 2 server that shares the RSA key · **Helped:**
    the final removal of SSL 2 everywhere; the rule that one key must not
    serve two protocols · **Status:** historic; SSL 2 is gone from public
    servers

## 4.4 The record layer: CBC, RC4 and compression

*Level: intermediate.*

TLS 1.2 and earlier protected records with **MAC-then-encrypt**: compute an
HMAC over the plaintext, append it, pad to the block size, and encrypt the
lot with CBC. The receiver decrypts, removes the padding, then checks the MAC.
Chapter 8 of book 1 explains why the order is backwards: the receiver touches
unauthenticated data (the padding) before it knows the record is genuine, and
anything it reveals about that padding is an oracle. Serge Vaudenay described
padding oracle attacks on CBC in 2002. TLS attacks on CBC kept arriving for
seventeen years.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Three ways to protect a record: MAC-then-encrypt, where the receiver checks padding before the MAC; encrypt-then-MAC, where the MAC is checked first; and AEAD, one step with no padding" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">MAC-then-encrypt (SSL, TLS 1.0-1.2 CBC)</text>
<rect x="20" y="34" width="140" height="30" class="soft" stroke="currentColor"/><text x="90" y="54" text-anchor="middle">plaintext</text>
<rect x="160" y="34" width="70" height="30" class="soft" stroke="currentColor"/><text x="195" y="54" text-anchor="middle">MAC</text>
<rect x="230" y="34" width="70" height="30" class="soft-acc" stroke="currentColor"/><text x="265" y="54" text-anchor="middle">padding</text>
<text x="310" y="54">→ CBC-encrypt all of it</text>
<text x="20" y="84" class="acc-fill">receiver: decrypt → check padding (unauthenticated!) → check MAC</text>
<text x="20" y="124" font-weight="bold">encrypt-then-MAC (RFC 7366, IPsec, SSH's etm modes)</text>
<rect x="20" y="134" width="210" height="30" class="soft" stroke="currentColor"/><text x="125" y="154" text-anchor="middle">CBC(plaintext + padding)</text>
<rect x="230" y="134" width="70" height="30" class="soft" stroke="currentColor"/><text x="265" y="154" text-anchor="middle">MAC</text>
<text x="20" y="184">receiver: check MAC first → only then decrypt and read padding</text>
<text x="20" y="218" font-weight="bold">AEAD (TLS 1.3: AES-GCM, ChaCha20-Poly1305)</text>
<text x="20" y="240">one keyed step encrypts and authenticates; no padding to check, nothing to leak</text>
</svg>
<figcaption>Figure 4.2. The order of MAC and encryption. Every CBC attack on TLS lived in the gap between "decrypt" and "check MAC" in the first row.</figcaption>
</figure>

**BEAST** (September 2011, Thai Duong and Juliano Rizzo). In TLS 1.0 the IV of
each CBC record was the last ciphertext block of the previous record, which the
attacker had already seen. An attacker who can choose part of the next
plaintext (by running JavaScript in the victim's browser that sends requests to
the target site) can test guesses about one block of an earlier record. By
lining up an unknown cookie so that only one byte at a time is unknown, the
attacker recovers it byte by byte. The weakness had been described by Phillip
Rogaway in 2002 and Gregory Bard in 2004 and fixed in TLS 1.1 (2006) with an
explicit random IV per record, but in 2011 most browsers and servers still
spoke only TLS 1.0. Browsers deployed a workaround ("1/n-1 record splitting":
send one byte in its own record first, so the next record's IV is
unpredictable) within months.

**Lucky Thirteen** (February 2013, Nadhem AlFardan and Kenneth Paterson). Even
with the TLS 1.0 countermeasure (compute the MAC anyway when padding is bad),
the time to compute the MAC depends on how many bytes of padding were removed,
because HMAC processes data in 64-byte blocks. The difference is tiny, but with
many repeated sessions it reveals plaintext. Fixing it required carefully
constant-time code in every library, and some fixes were themselves flawed.

**POODLE** (October 2014, Bodo Möller, Thai Duong and Krzysztof Kotowicz at
Google). SSL 3.0's CBC padding was not specified: the receiver checked only
the last byte (the length) and ignored the content of the padding bytes. So
an attacker who could move a block of secret ciphertext into the padding
position learned one byte whenever the record was accepted, on average once
every 256 tries. Nobody should have been using SSL 3.0 in 2014, but browsers
would *fall back* to it if a TLS connection failed, and the attacker could make
TLS connections fail (§4.5). POODLE ended SSL 3.0: browsers disabled it within
weeks, and RFC 7568 (2015) prohibited it. Variants that exploited servers
which checked TLS padding as loosely as SSL 3 (POODLE for TLS in late 2014,
Zombie POODLE and GOLDENDOODLE in 2019) kept appearing in old equipment.

**RC4.** The other common TLS 1.2 option was the stream cipher RC4, popular
precisely because it was immune to BEAST and Lucky Thirteen. But its keystream
has biases ([Chapter 5 of book 1](../../book/05-Stream-Ciphers.md)): some
bytes at fixed positions are more likely than others. In 2013 Nadhem AlFardan,
Daniel Bernstein, Kenneth Paterson, Bertram Poettering and Jacob Schuldt showed
that with the same secret (a cookie) encrypted in millions of connections, the
biases reveal it. In 2015 Mathy Vanhoef and Frank Piessens's "RC4 NOMORE"
brought a cookie recovery down to about 75 hours of traffic. RFC 7465
(February 2015) prohibited RC4 in TLS, and browsers removed it in 2016.

**Compression: CRIME and BREACH.** TLS 1.2 could compress records before
encrypting them. Compression makes output shorter when the input repeats
itself, and encryption hides content but not length. If an attacker can put
its own guess next to a secret in the same compressed record (again, via
requests from the victim's browser), the record is one byte shorter when the
guess matches part of the secret. **CRIME** (Rizzo and Duong, September 2012)
recovered session cookies this way from TLS-level compression; browsers
disabled TLS compression at once. **BREACH** (Angelo Prado, Neal Harris and
Yoel Gluck, August 2013) did the same through HTTP-level compression of page
bodies, which TLS cannot turn off and which remains a concern for any page that
reflects user input next to a secret. The method of the attack is in book 2,
*Cryptanalysis*, chapter 10.

The common cure came in two steps. Encrypt-then-MAC for TLS 1.2 (RFC 7366,
2014) let servers authenticate before touching padding. TLS 1.3 went further
and allowed only AEAD ciphers (AES-GCM, ChaCha20-Poly1305, AES-CCM), which
authenticate and encrypt in one step with no padding to check, and removed
compression altogether.

!!! note "Life story: POODLE"
    **Born:** October 2014, Bodo Möller, Thai Duong and Krzysztof Kotowicz
    (Google), "This POODLE bites: exploiting the SSL 3.0 fallback" ·
    **Purpose:** decrypt secrets from SSL 3.0's loosely checked CBC padding,
    reached by forcing a fallback · **Helped:** killed SSL 3.0 (RFC 7568,
    2015); led to TLS_FALLBACK_SCSV (RFC 7507) · **Status:** historic for
    SSL 3; its TLS variants still turn up in old devices

!!! note "Life story: RC4 in TLS"
    **Born:** 1987 (Ron Rivest's cipher), in SSL from 1995; leaked publicly in
    1994 · **Purpose:** a fast stream cipher, and in 2011-2013 the advice
    against BEAST and Lucky Thirteen · **Helped:** carried a large share of
    HTTPS traffic for years, and protected WEP and early WPA
    ([Chapter 9](09-Wi-Fi-Security.md)) · **Retired:** prohibited in TLS by
    RFC 7465 (February 2015); removed from browsers in 2016 · **Replaced
    by:** AES-GCM and ChaCha20-Poly1305

## 4.5 Negotiation and downgrade

*Level: intermediate.*

A protocol with options must negotiate, and an attacker who can edit the
negotiation can choose the weakest option both sides still accept. Chapter 1
named the defense: a MAC or signature at the end that covers the whole
negotiation, made with a key the attacker cannot influence. Every downgrade in
TLS history found a gap in that defense.

### Code it: a downgrade, and two defenses

The program first runs a negotiation where an attacker deletes the strong
suite from the client's offer, with and without a final MAC over the
transcript. Then it plays the **downgrade dance**: browsers of the 2000s, when
a TLS 1.2 connection failed, retried with TLS 1.1, then 1.0, then SSL 3.0,
because some broken servers rejected newer versions. An attacker who resets
connections can walk the browser down to SSL 3.0, which is how POODLE was
delivered. **TLS_FALLBACK_SCSV** (RFC 7507, 2015) is a special cipher-suite
value the client adds when it is retrying: a server that supports something
newer than the version offered knows the retry is not genuine and refuses.

```python
# Downgrades: an attacker deletes the strong options from a negotiation.
# Version 1 has no protection; version 2 MACs the transcript; version 3 adds the
# "fallback" signal for clients that retry with a lower version.
import hashlib, hmac

SERVER_SUITES = ["ECDHE-AES-GCM", "DHE-AES-CBC", "RSA-EXPORT-40"]

def server_pick(offer):
    return next(s for s in SERVER_SUITES if s in offer)

def handshake(offer, attacker, mac_transcript):
    seen_by_server = attacker(offer)
    choice = server_pick(seen_by_server)
    if mac_transcript:
        key = b"session key both sides derive"
        client_mac = hmac.new(key, repr(offer).encode(), hashlib.sha256).digest()
        server_mac = hmac.new(key, repr(seen_by_server).encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(client_mac, server_mac):
            return "aborted: transcripts differ"
    return "agreed on " + choice

strip = lambda offer: [s for s in offer if "EXPORT" in s]   # keep only the weakest
client_offer = ["ECDHE-AES-GCM", "RSA-EXPORT-40"]
print("no transcript MAC:  ", handshake(client_offer, strip, False))
print("with transcript MAC:", handshake(client_offer, strip, True))

# The "downgrade dance": a browser that retries with an older version when a
# handshake fails. The attacker just makes the first tries fail.
NAMES = {3: "TLS 1.2", 2: "TLS 1.1", 1: "TLS 1.0", 0: "SSL 3.0"}

def connect(versions, server_max, attacker_blocks, scsv):
    for v in versions:                                # try newest first
        fallback = scsv and v != versions[0]          # TLS_FALLBACK_SCSV on retries
        if v in attacker_blocks:
            continue                                  # connection reset by the attacker
        if fallback and v < server_max:
            return "server refuses: inappropriate_fallback"
        return "connected with " + NAMES[v]
    return "no connection"

for scsv in (False, True):
    print("SCSV" if scsv else "no SCSV", "->",
          connect([3, 2, 1, 0], server_max=3, attacker_blocks={3, 2, 1}, scsv=scsv))
```

```text
no transcript MAC:   agreed on RSA-EXPORT-40
with transcript MAC: aborted: transcripts differ
no SCSV -> connected with SSL 3.0
SCSV -> server refuses: inappropriate_fallback
```

The transcript MAC works because the MAC key comes from the key exchange and
the attacker cannot recompute it. The downgrade dance is outside the protocol
altogether: each retry is a separate, perfectly valid handshake, and no MAC can
see the previous attempt. The fallback signal carries that information across.

### Export ciphers: FREAK and Logjam

Under US rules until 2000, software sold abroad could use only 40-bit
symmetric keys and 512-bit RSA or Diffie-Hellman for key exchange. SSL and
TLS had **export cipher suites** for this. The rules were relaxed in January
2000. The suites stayed in code for fifteen more years, turned off in
browsers' offers but still accepted by many servers and, as it turned out,
by some clients.

**FREAK** (March 2015, Benjamin Beurdouche, Karthikeyan Bhargavan and
colleagues of the miTLS team). Several TLS clients, including OpenSSL's and
Apple's, would accept a server's temporary 512-bit `RSA_EXPORT` key even when
they had not offered an export suite: a state machine bug. A man in the middle
changes the client's offer to export RSA, receives a 512-bit key from a server
that still supported it, factors it (about seven hours and a hundred dollars on
rented cloud machines), and then can compute the Finished MACs and complete
both sides of the handshake. At disclosure, the servers that still accepted
export RSA included those of the NSA and FBI. Because servers generated the
512-bit key once and reused it for hours or days, one factorization opened many
connections.

**Logjam** (May 2015, David Adrian and thirteen co-authors, "Imperfect Forward
Secrecy"). The same trick for `DHE_EXPORT` and 512-bit Diffie-Hellman groups.
This time the flaw was in the protocol itself: in TLS 1.2 the server signs its
Diffie-Hellman parameters, but the signature does not say which cipher suite
they were for, so export parameters signed for an export suite look the same as
normal ones. Most servers used one of a few standard 512-bit primes. The number
field sieve's expensive first stage depends only on the prime, so after a week
of precomputation per prime, each individual connection's discrete log took
about a minute and a half. The paper also estimated that precomputation for a
common *1024-bit* prime was within reach of a national agency, and argued that
this could explain capabilities described in leaked documents; that part is an
inference, not a demonstration, and is still debated. The mathematics of the
precomputation is in book 2.

**SLOTH** (January 2016, Bhargavan and Gaëtan Leurent). TLS 1.2 still allowed
MD5 and SHA-1 in handshake signatures and in its transcript hashing. SLOTH
showed that transcript collisions, two different transcripts with the same
hash, could be found fast enough with MD5 to break client authentication and
weaken other parts of the handshake. TLS 1.3 allows only SHA-256 and SHA-384.

TLS 1.3 answered all of these by **naming its groups** (no server-chosen
primes), **signing the entire transcript** in CertificateVerify (so the
signature covers the cipher suite and every parameter), dropping export suites
and weak hashes entirely, and adding the **downgrade sentinel** in the server
random (Chapter 3, §3.3) to protect against a downgrade to TLS 1.2 itself.

!!! note "Life story: export cipher suites"
    **Born:** 1995, in SSL 2, to meet US export limits (40-bit symmetric keys,
    512-bit public keys) · **Purpose:** legal export of browsers and servers
    · **Helped:** let SSL ship worldwide in the 1990s · **Retired:** rules
    relaxed in January 2000; suites removed from libraries after FREAK and
    Logjam in 2015 · **Replaced by:** nothing; their fifteen-year afterlife is
    the standard argument against deliberately weakened cryptography

!!! note "Life story: Logjam"
    **Born:** May 2015, David Adrian, Karthikeyan Bhargavan, Zakir Durumeric,
    Pierrick Gaudry, Matthew Green, J. Alex Halderman, Nadia Heninger and
    others (CCS 2015) · **Purpose:** downgrade TLS to 512-bit export
    Diffie-Hellman and break it with number-field-sieve precomputation ·
    **Helped:** browsers rejected small groups; RFC 7919 named safe groups;
    TLS 1.3 signs the whole transcript · **Status:** historic for export DH;
    the warning about widely shared 1024-bit primes stands

## 4.6 Binding handshakes together

*Level: intermediate.*

TLS 1.2 allowed a connection to run a new handshake, a **renegotiation**,
inside an existing one, for example when a web server decided halfway through
that it wanted a client certificate. The new handshake was encrypted under the
old keys, but its keys and authentication were not tied to the old handshake in
any way. In August 2009 Marsh Ray and Steve Dispensa, of the authentication
company PhoneFactor, found what that allowed (Martin Rex found it
independently), and it went public in November 2009.

The attacker opens its own TLS connection to the server and sends the start of
an HTTP request, unfinished. Then, when the victim's client tries to connect,
the attacker forwards the victim's handshake *into its own connection*, where
the server sees it as a renegotiation. The victim completes a perfectly valid
handshake and sends its request with its cookie. The server's TLS layer hands
the application one byte stream: the attacker's prefix, then the victim's
request. The program below shows that stream at the HTTP level.

```python
# The 2009 renegotiation attack, at the level of bytes on a connection.
# The attacker opens a TLS session to the bank, sends a half-finished request,
# then lets the victim's handshake run *inside* that session as a renegotiation.
attacker_prefix = (b"POST /transfer?to=mallory&amount=1000 HTTP/1.1\r\n"
                   b"X-Ignore-This: ")                 # no line ending: swallows the next line
victim_request = (b"GET /account HTTP/1.1\r\n"
                  b"Cookie: session=alice-secret\r\n\r\n")

# What the bank's TLS layer hands to the web server: one byte stream,
# first from the attacker's handshake, then from Alice's renegotiated one.
stream = attacker_prefix + victim_request
request = stream.split(b"\r\n\r\n")[0].decode()
print(request)
print("--- the bank runs:", request.splitlines()[0], "with Alice's cookie")

# The fix (RFC 5746): each renegotiation handshake carries the Finished values
# of the previous handshake on this connection, so Alice's client, which has no
# previous handshake, says "none", and the server sees the mismatch.
def renegotiation_info(previous_finished):
    return previous_finished or b""

server_side_previous = b"finished-values-of-mallory-handshake"
alice_sends = renegotiation_info(None)
print("RFC 5746 check passes?", alice_sends == server_side_previous)
```

```text
POST /transfer?to=mallory&amount=1000 HTTP/1.1
X-Ignore-This: GET /account HTTP/1.1
Cookie: session=alice-secret
--- the bank runs: POST /transfer?to=mallory&amount=1000 HTTP/1.1 with Alice's cookie
RFC 5746 check passes? False
```

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Renegotiation attack sequence: the attacker opens a TLS session to the bank and sends a partial request, then forwards the victim's handshake inside it as a renegotiation; the bank sees one stream" fill="currentColor" font-size="13.5">
<text x="90" y="22" text-anchor="middle" font-weight="bold">Alice</text>
<text x="320" y="22" text-anchor="middle" font-weight="bold" class="acc-fill">Mallory</text>
<text x="550" y="22" text-anchor="middle" font-weight="bold">bank</text>
<line x1="90" y1="32" x2="90" y2="290" stroke="currentColor"/>
<line x1="320" y1="32" x2="320" y2="290" stroke="currentColor" class="acc"/>
<line x1="550" y1="32" x2="550" y2="290" stroke="currentColor"/>
<line x1="320" y1="60" x2="546" y2="60" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="550,60 538,55 538,65" class="acc-fill"/>
<text x="435" y="52" text-anchor="middle" class="acc-fill">1. handshake A (Mallory's own)</text>
<line x1="320" y1="100" x2="546" y2="100" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="550,100 538,95 538,105" class="acc-fill"/>
<text x="435" y="92" text-anchor="middle" class="acc-fill">2. "POST /transfer ... X-Ignore: "</text>
<line x1="90" y1="140" x2="316" y2="140" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,140 308,135 308,145"/>
<text x="205" y="132" text-anchor="middle">3. ClientHello (new)</text>
<line x1="320" y1="180" x2="546" y2="180" stroke="currentColor" stroke-width="1.5"/>
<polygon points="550,180 538,175 538,185"/>
<text x="435" y="172" text-anchor="middle">4. relayed inside A: renegotiation</text>
<line x1="90" y1="220" x2="546" y2="220" stroke="currentColor" stroke-width="1.5"/>
<polygon points="550,220 538,215 538,225"/>
<text x="320" y="212" text-anchor="middle">5. Alice: "GET /account, Cookie: alice" (Mallory can't read it)</text>
<rect x="400" y="240" width="230" height="44" rx="6" class="soft-acc"/>
<text x="515" y="258" text-anchor="middle">bank sees one stream:</text>
<text x="515" y="276" text-anchor="middle">Mallory's POST + Alice's cookie</text>
</svg>
<figcaption>Figure 4.3. The 2009 renegotiation attack. Mallory never decrypts anything; the bank glues her prefix to Alice's request because nothing tied Alice's handshake to the one before it.</figcaption>
</figure>

The server executes the attacker's request with the victim's cookie, because
the half-finished header line `X-Ignore-This:` swallowed the victim's request
line. The victim saw nothing wrong; it never knew a connection existed before
its handshake. This is identity misbinding (Chapter 1, §1.7) between two
handshakes: the server believed both belonged to the same peer.

The fix, RFC 5746 (February 2010), is the `renegotiation_info` extension:
every handshake carries the Finished values of the previous handshake on the
same connection (empty for the first). A client that thinks it is doing a first
handshake sends empty; the server, which knows there was a previous one, sees
the mismatch and aborts.

**The triple handshake** (2014, Karthikeyan Bhargavan, Antoine
Delignat-Lavaud, Cédric Fournet, Alfredo Pironti and Pierre-Yves Strub) showed
that even with RFC 5746, a malicious server could arrange for two different
connections (client to attacker, attacker to real server) to end up with the
*same* master secret and the same Finished values, by forwarding the client's
random values and choosing RSA or weak Diffie-Hellman parameters carefully. Then
a renegotiation or resumption on one connection could be carried over to the
other. The fix was the **extended master secret** (RFC 7627, 2015), which
computes the master secret from a hash of the whole handshake transcript rather
than just the two random values. In TLS 1.3 this is how every key is computed,
and renegotiation no longer exists.

!!! note "Life story: the renegotiation attack"
    **Born:** found August 2009 by Marsh Ray and Steve Dispensa (and Martin
    Rex), public November 2009 · **Purpose:** splice an attacker's request in
    front of a victim's in one TLS connection · **Helped:** RFC 5746 (2010);
    the general rule that every handshake must be bound to what came before ·
    **Status:** fixed; renegotiation removed in TLS 1.3

## 4.7 The code: Heartbleed and friends

*Level: intermediate.*

Some of the worst TLS failures had nothing to do with the protocol's design.

**Heartbleed** (April 2014). TLS has a small "heartbeat" extension (RFC 6520,
2012) for keeping connections alive: one side sends a message with a payload
and a two-byte length, and the other echoes the payload back. OpenSSL's code,
added on 31 December 2011 and released in March 2012, copied back as many
bytes as the *length field* said, without checking that the message really
contained that many. Ask for 64 KB while sending one byte, and the server
returns 64 KB of whatever sat next to the request in memory: other users'
requests and cookies, passwords, and sometimes the server's private key. Neel
Mehta of Google and a team at the Finnish company Codenomicon found it
independently. It was disclosed on 7 April 2014, when a large share of HTTPS
servers ran an affected OpenSSL; measurements by Zakir Durumeric and colleagues
put it at roughly a quarter to a half of the most popular sites at the time of
disclosure.

```python
# Heartbleed (2014) in miniature: a heartbeat echoes back as many bytes as the
# request *claims* to contain, without checking how many it really contains.
memory = bytearray(b"....HEARTBEAT-BUFFER...." +
                   b"user=alice&password=correct-horse;" +
                   b"-----BEGIN PRIVATE KEY----- MIIEvQIBADAN...;" +
                   b"cookie=session-7f3a9b...")
BUF = 4                                   # where incoming heartbeats are copied

def heartbeat(request, check_length):
    claimed = int.from_bytes(request[:2], "big")
    payload = request[2:]
    if check_length and claimed > len(payload):
        return b""                        # the fix: silently discard (RFC 6520 says so)
    memory[BUF:BUF + len(payload)] = payload
    return bytes(memory[BUF:BUF + claimed])

honest = (5).to_bytes(2, "big") + b"hello"
evil = (120).to_bytes(2, "big") + b"hi"   # claims 120 bytes, sends 2
print("honest:", heartbeat(honest, False))
print("evil:  ", heartbeat(evil, False))
print("fixed: ", heartbeat(evil, True))
```

```text
honest: b'hello'
evil:   b'hilloBEAT-BUFFER....user=alice&password=correct-horse;-----BEGIN PRIVATE KEY----- MIIEvQIBADAN...;cookie=session-7f3a9b.'
fixed:  b''
```

The leaked bytes start with "hillo": the first two bytes are the attacker's
"hi", the next three are left over from the honest "hello" before it. Real
memory leaks look like this, a mix of old and new data that happened to be
nearby. The fix was the two-line check in `check_length`. The aftermath was
large: hundreds of thousands of certificates were revoked and reissued (this
was the revocation wave of Chapter 2, §2.7), and the shock led to the Linux
Foundation's Core Infrastructure Initiative to fund critical open-source
projects, and to LibreSSL and BoringSSL, two forks of OpenSSL that removed
large amounts of old code.

Other code failures of the same years:

- **goto fail** (February 2014). In Apple's TLS code, a duplicated line
  `goto fail;` skipped the check of the server's signature on its key exchange,
  so any man in the middle could impersonate any server to iOS and macOS
  devices using ephemeral key exchange.
- **GnuTLS certificate checks** (March 2014). An error path returned "success"
  for some malformed certificates.
- **CCS injection** (June 2014, Masashi Kikuchi). OpenSSL accepted a
  ChangeCipherSpec message too early in the handshake, which made it use
  predictable keys.
- **SMACK** (2015, Benjamin Beurdouche and colleagues). Systematic testing of
  TLS libraries' state machines found that many accepted messages out of order
  or skipped required ones; FREAK was one result.

The lesson: the protocol state machine must be written so that it accepts only
the sequences the specification allows, and tested by tools that send every
other sequence. TLS 1.3's simpler state machine helps; it does not remove the
need.

!!! note "Life story: Heartbleed"
    **Born:** bug written December 2011, released in OpenSSL 1.0.1 in March
    2012; found by Neel Mehta (Google) and Codenomicon; disclosed 7 April 2014
    (CVE-2014-0160) · **Purpose:** none; a missing bounds check in the
    heartbeat extension · **Helped:** mass certificate reissuing; funding for
    open-source security; LibreSSL and BoringSSL · **Status:** fixed in
    OpenSSL 1.0.1g; still the best-known security bug in history

## 4.8 What TLS 1.3 learned

*Level: intermediate.*

Line up the attacks against the design of Chapter 3:

| Lesson | Attacks that taught it | TLS 1.3's answer |
| --- | --- | --- |
| Never expose a padding check on unauthenticated data | Bleichenbacher, Vaudenay, Lucky 13, POODLE | RSA key transport and CBC removed; AEAD only |
| Forward secrecy for everyone | key theft, recorded traffic | ephemeral (EC)DHE or PSK-with-DHE only |
| Remove weak options; don't just disable them | FREAK, Logjam, DROWN, RC4 | export suites, RC4, SHA-1/MD5 signatures, custom groups gone |
| Sign everything that was negotiated | Logjam, SSL 2 downgrade | CertificateVerify over the full transcript |
| Bind every key to the full transcript | triple handshake, renegotiation | key schedule uses transcript hashes; no renegotiation |
| Protect against downgrade to older versions | POODLE's fallback, downgrade dance | sentinel in ServerHello random; FALLBACK_SCSV |
| Don't compress secrets with attacker data | CRIME | no compression in TLS |
| Keep one key per protocol | DROWN, cross-protocol attacks | context strings in signatures; separate certificates advised |
| A smaller state machine is easier to get right | SMACK, CCS injection | fewer messages, fixed order |

Much of this was known in principle before. What changed between 2011 and 2016
was that attacks got good enough, and well enough publicized, that the cost of
keeping old options became visible. The working group's guiding sentence for
1.3 was to remove "anything that's not needed".

## 4.9 Mars: an archive of recorded traffic

*Level: intermediate.*

Arcadia City's link to Earth will carry decades of traffic. Suppose some of it
is recorded by a third party, as any traffic crossing other people's networks
can be. Which attacks in this chapter would still matter in 2060?

The ones that break **recorded** sessions. Bleichenbacher-style oracles and RSA
key transport would let anyone who later finds an oracle, or steals a key,
decrypt the archive. Weak Diffie-Hellman would let anyone who later invests in
precomputation decrypt it. Every session in the archive is only as safe as the
weakest key exchange it used, against attacks that may be found long after.

The answer is the design of Chapter 3, chosen deliberately: ephemeral key
exchange only, hybrid with ML-KEM so that a future quantum computer does not
open the archive, and no legacy versions or suites in any of the city's
servers, even "turned off". DROWN showed that a forgotten old service sharing a
key is enough. A new city has the rare chance to start with no legacy at all.

## 4.10 In the real world

*Level: intermediate.*

- **Patch speed.** BEAST was fixed in browsers within months; POODLE ended SSL
  3 within weeks; but servers trail. Scans of the Internet in 2016 still found
  servers supporting SSL 2, and ROBOT in 2017 found major sites vulnerable to a
  1998 attack. Enterprise and embedded systems trail most.
- **Branding.** Heartbleed was the first vulnerability with a logo and a web
  site. The names helped administrators know what to fix and press to report it,
  and also attracted criticism for hype. They stuck.
- **Researchers and the IETF.** Many of the 2014-2016 attacks came from a
  small number of teams (Inria's Prosecco team with Microsoft Research on the
  miTLS project, Royal Holloway's information security group, the University of
  Michigan's scanning team, Ruhr University Bochum, and Google). Several of the
  same people then worked on TLS 1.3's analysis. The design process changed
  because the attackers were invited in.
- **Raccoon** (2020, Robert Merget and colleagues). In TLS 1.2's
  Diffie-Hellman, the shared secret's leading zero bytes were stripped before
  hashing, so computing the key took slightly less time when the secret began
  with zeros. With precise timing, that leaked enough to recover a premaster
  secret under narrow conditions. TLS 1.3 keeps leading zeros, and was not
  affected.

## 4.11 Going deeper

*Level: expert.*

**Proofs for TLS 1.2.** For years TLS 1.2 could not be proved secure in a
standard key-exchange model, because the Finished messages were encrypted
under keys from the handshake itself. Tibor Jager, Florian Kohlar, Sven Schäge
and Jörg Schwenk (CRYPTO 2012) introduced the ACCE model to prove TLS-DHE
secure; Hugo Krawczyk, Kenneth Paterson and Hoeteck Wee (CRYPTO 2013) extended
proofs to RSA key transport and static DH under assumptions that the padding
oracle results show are delicate in practice. The proofs covered single
cipher suites, not the negotiation between them, which is exactly where FREAK
and Logjam lived.

**Cross-protocol attacks.** A key used in two protocols, or in two modes of
one protocol, can let an attacker use one as an oracle against the other.
Examples: DROWN (SSL 2 against TLS); a 2012 attack by Nikos Mavrogiannopoulos
and colleagues that made a client accept elliptic-curve parameters signed by
the server as if they were finite-field ones; and the general concern about
using one RSA key for both signing and decryption. TLS 1.3's context strings,
and the practice of separate keys per use, are the defenses.

**Proving the record layer.** Lucky Thirteen and its successors showed that
"constant time" is a property of compiled code on real hardware, not of an
algorithm. Formal tools that check constant-time behavior at the binary level
(ct-verif, and successors) and verified implementations (HACL\*, Fiat
Cryptography, used in Firefox and Chrome) grew partly from this lesson.

**Fuzzing and differential testing.** TLS-Attacker (Ruhr University Bochum),
tlsfuzzer (Hubert Kario) and state-machine learning tools (Joeri de Ruiter
and Erik Poll, 2015) now test libraries against hundreds of malformed
sequences. Most TLS bugs found after 2016 came from such tools rather than from
new cryptanalysis.

## Check yourself

??? question "1. What two weaknesses of SSL 2 let an attacker force 40-bit encryption?"

    The cipher suite negotiation was not covered by any MAC, so the attacker
    could delete strong suites from the client's offer; and export suites
    with 40-bit keys were present in every copy and accepted.

??? question "2. Why did TLS's defense against Bleichenbacher's attack keep failing in practice?"

    The defense requires the server to behave identically, including timing,
    alerts and connection handling, whether or not the padding was valid.
    Real implementations differed in small ways (different alerts, resets,
    microseconds of timing), and each difference is an oracle.

??? question "3. How could DROWN use an SSL 2 server to attack a TLS-only server?"

    If the two shared an RSA key (same certificate on two machines, or two
    services on one), the SSL 2 server's export-cipher weakness gave a padding
    oracle on that key, which decrypted the TLS connection's RSA-encrypted
    premaster secret.

??? question "4. BEAST was fixed in TLS 1.1 in 2006. Why did it matter in 2011?"

    Most browsers and servers still used TLS 1.0, whose CBC IV for each record
    was the previous record's last ciphertext block, which the attacker knew.

??? question "5. In the downgrade program, why does the transcript MAC stop the first attack but not the downgrade dance?"

    In the first attack, the client and server saw different offers in one
    handshake, so their MACs over the transcript differ. In the dance, each
    retry is a separate, honest handshake; the attacker only made the
    earlier attempts fail, which no MAC in the later handshake can see.

??? question "6. What does TLS_FALLBACK_SCSV tell the server, and when does the server act on it?"

    That the client is retrying with a lower version than it supports. If
    the server supports a higher version than the one offered, the retry must
    have been caused by interference, and it aborts with
    `inappropriate_fallback`.

??? question "7. Logjam's precomputation is done once per prime. Why did that make the attack practical against many servers?"

    Most servers used the same few standard 512-bit (and 1024-bit) primes. The
    expensive number field sieve stages depend only on the prime, so one
    week of precomputation made every connection using that prime breakable in
    about 90 seconds.

??? question "8. In the renegotiation program, what role does the line `X-Ignore-This:` play?"

    It has no line ending, so the victim's request line is appended to it as
    the header's value and ignored, while the victim's following `Cookie:`
    header becomes part of the attacker's request.

??? question "9. Why did the extended master secret (RFC 7627) fix the triple handshake?"

    It derives the master secret from a hash of the entire handshake
    transcript, not just the two random values and the premaster secret, so
    two connections with different transcripts (client to attacker, attacker
    to server) can no longer share a master secret.

??? question "10. Name three features attacked in this chapter that do not exist in TLS 1.3."

    Any three of: RSA key transport, CBC mode (MAC-then-encrypt), RC4,
    compression, renegotiation, export cipher suites, custom Diffie-Hellman
    groups, MD5 and SHA-1 in signatures.

## What you learned

- SSL and TLS were patched, not redesigned, for twenty years, and old options
  stayed. Most attacks exploited those options, not weak primitives.
- RSA key transport with PKCS #1 v1.5 gave padding oracles (Bleichenbacher,
  ROBOT, DROWN, Marvin) and no forward secrecy.
- MAC-then-encrypt CBC gave BEAST, Lucky Thirteen and POODLE; RC4's biases and
  compression's lengths leaked cookies.
- Downgrades came from unprotected negotiation, server-chosen parameters
  signed without context (Logjam), weak hashes (SLOTH) and the browser's own
  fallback retries; transcript MACs, FALLBACK_SCSV and the TLS 1.3 sentinel
  close them.
- Handshakes must be bound to each other and to the transcript
  (renegotiation, triple handshake).
- Code bugs (Heartbleed, goto fail) caused some of the largest failures; state
  machines and bounds must be tested systematically.
- TLS 1.3 is the list of these lessons turned into deletions.

**Next:** [Chapter 5](05-TLS-in-Practice.md), TLS as it runs in practice: over
UDP in QUIC, between services, and on a server you configure.

## Further reading

- Kipp Hickman, *The SSL Protocol* (Netscape, 1995); Alan Freier, Philip
  Karlton and Paul Kocher, *The SSL 3.0 Protocol* (1996), RFC 6101.
- Ian Goldberg and David Wagner, "Randomness and the Netscape browser", *Dr.
  Dobb's Journal* (January 1996).
- Daniel Bleichenbacher, "Chosen ciphertext attacks against protocols based on
  the RSA encryption standard PKCS #1" (CRYPTO 1998).
- Serge Vaudenay, "Security flaws induced by CBC padding" (EUROCRYPT 2002).
- Thai Duong and Juliano Rizzo, "Here come the XOR ninjas" (BEAST, 2011) and
  "The CRIME attack" (Ekoparty 2012).
- Nadhem AlFardan and Kenneth Paterson, "Lucky Thirteen: breaking the TLS and
  DTLS record protocols" (IEEE S&P 2013).
- Nadhem AlFardan, Daniel Bernstein, Kenneth Paterson, Bertram Poettering and
  Jacob Schuldt, "On the security of RC4 in TLS" (USENIX Security 2013); Mathy
  Vanhoef and Frank Piessens, "All your biases belong to us: breaking RC4 in WPA-TKIP and TLS"
  (USENIX Security 2015).
- Bodo Möller, Thai Duong and Krzysztof Kotowicz, "This POODLE bites:
  exploiting the SSL 3.0 fallback" (2014).
- Zakir Durumeric and others, "The matter of Heartbleed" (IMC 2014).
- Karthikeyan Bhargavan and others, "Triple handshakes and cookie cutters"
  (IEEE S&P 2014); Benjamin Beurdouche and others, "A messy state of the union:
  taming the composite state machines of TLS" (IEEE S&P 2015).
- David Adrian and others, "Imperfect forward secrecy: how Diffie-Hellman fails
  in practice" (CCS 2015).
- Karthikeyan Bhargavan and Gaëtan Leurent, "Transcript collision attacks:
  breaking authentication in TLS, IKE, and SSH" (NDSS 2016).
- Nimrod Aviram and others, "DROWN: breaking TLS using SSLv2" (USENIX Security
  2016).
- Hanno Böck, Juraj Somorovsky and Craig Young, "Return of Bleichenbacher's
  oracle threat (ROBOT)" (USENIX Security 2018).
- Robert Merget and others, "Raccoon attack: finding and exploiting
  most-significant-bit-oracles in TLS-DH(E)" (USENIX Security 2021).
- RFC 5746 (renegotiation indication), RFC 7366 (encrypt-then-MAC), RFC 7465
  (no RC4), RFC 7507 (fallback SCSV), RFC 7568 (no SSL 3), RFC 7627 (extended
  master secret), RFC 7919 (named DH groups), RFC 8996 (no TLS 1.0 and 1.1).
- Book 1, [Chapter 19](../../book/19-Protocols.md), §19.4, the short version
  of this chapter.
