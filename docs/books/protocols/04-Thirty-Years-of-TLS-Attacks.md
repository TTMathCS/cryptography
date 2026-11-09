# 4. Thirty Years of TLS Attacks

*TLS 1.3 is short because TLS 1.2 was long, and TLS 1.2 was long because
every version before it was attacked and patched rather than redesigned. This
chapter tells the story of those attacks, from SSL 2 in 1995 to the timing
attacks of the 2020s, grouped by the part of the protocol each one hit: the
key exchange, the record layer, the negotiation, the binding between
handshakes, and the code itself. For each, what happened, who found it, how
much it mattered and how it was fixed. You will run a downgrade attack and
stop it with a transcript MAC and a fallback signal, run Bleichenbacher's
oracle to the end against a toy RSA key, read a cookie through compression and
a block cipher, splice a request into a victim's session the way the 2009
renegotiation attack did, give two connections one master secret as the
triple handshake did, and read secrets out of a server's memory with a
heartbeat that lies about its length.*

!!! abstract "In this chapter"
    **You will learn:**

    - how SSL and TLS evolved from 1995 to 2008, and what each version fixed;
    - the attacks on RSA key transport: Bleichenbacher's oracle (1998), run
      to the end on a toy key, and its returns: ROBOT, DROWN, CAT and Marvin;
    - the attacks on CBC and RC4 records: BEAST, Lucky Thirteen and POODLE
      worked by hand, the RC4 biases in numbers, and compression leaks (CRIME
      and BREACH);
    - downgrades: export ciphers, FREAK, Logjam, the "downgrade dance" and
      SLOTH, and the defenses (transcript MACs, TLS_FALLBACK_SCSV, the 1.3
      sentinel);
    - handshake-binding failures: renegotiation (2009) and the triple
      handshake (2014);
    - implementation bugs: Heartbleed byte by byte, goto fail and
      state-machine errors;
    - how each lesson became a deletion in TLS 1.3, and what has broken since:
      Raccoon (2020), ALPACA (2021) and Opossum (2025);
    - what a light delay does and does not do to these attacks on a Mars link.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) and
    [Chapter 3](03-TLS-1.3-Message-by-Message.md); CBC mode and padding from
    [Chapter 8 of book 1](../../book/08-Modes-of-Operation.md); RSA from
    [Chapter 13](../../book/13-RSA.md). The inner workings of padding oracles,
    nonce reuse and compression oracles are taught in book 2,
    *Cryptanalysis* (chapter 10); this chapter tells what they did to TLS.

    **Levels:** §4.1 and §4.2 are for beginners, §4.3 to §4.12 are
    intermediate, §4.13 is expert.

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
<svg viewBox="0 0 640 496" width="640" role="img" aria-label="Timeline of TLS attacks from SSL 2 in 1995 to Opossum in 2025" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="488" stroke="currentColor" stroke-width="1.6"/>
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
<text x="108" y="339" class="acc-fill">Zombie POODLE, GOLDENDOODLE; CAT: cache-timing RSA oracles</text>
<text x="78" y="365" text-anchor="end" font-weight="bold" class="acc-fill">2020</text>
<circle cx="92" cy="360" r="4.5" class="acc-fill"/>
<text x="108" y="365" class="acc-fill">Raccoon: timing on TLS 1.2 Diffie-Hellman</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">ALPACA cross-protocol attack; RFC 8996 retires TLS 1.0, 1.1</text>
<text x="78" y="417" text-anchor="end" font-weight="bold" class="acc-fill">2023</text>
<circle cx="92" cy="412" r="4.5" class="acc-fill"/>
<text x="108" y="417" class="acc-fill">Marvin: Bleichenbacher timing, 25 years on</text>
<text x="78" y="443" text-anchor="end" font-weight="bold" class="acc-fill">2025</text>
<circle cx="92" cy="438" r="4.5" class="acc-fill"/>
<text x="108" y="443" class="acc-fill">Opossum: opportunistic TLS knocked out of step</text>
</svg>
<figcaption>Figure 4.1. The named attacks on SSL and TLS, 1995 to 2025. Nearly all target options that TLS 1.3 removed; the newest target the seams between TLS and the application above it.</figcaption>
</figure>

## 4.2 A map of the attacks

*Level: beginner.*

A TLS 1.2 connection had five places where things could go wrong, and each
attack in this chapter belongs to one of them. A sixth family, found after
TLS 1.3 was finished, lives at the edge where TLS meets the application that
uses it.

| Family | What was attacked | Named attacks | Removed or fixed in 1.3 by |
| --- | --- | --- | --- |
| Key exchange | RSA key transport and its padding | Bleichenbacher, ROBOT, DROWN, Marvin | no RSA key transport at all |
| Record layer | CBC with MAC-then-encrypt; RC4; compression | BEAST, Lucky 13, POODLE, RC4 biases, CRIME | AEAD only; no compression |
| Negotiation | weak options both sides still allowed | SSL 2 downgrade, FREAK, Logjam, SLOTH, downgrade dance | signed transcript; named groups; sentinel |
| Handshake binding | handshakes not tied to each other | renegotiation, triple handshake | no renegotiation; keys bound to transcript |
| Implementation | bugs in code | Heartbleed, goto fail, SMACK, CCS injection | simpler state machine (but code is still code) |
| Application binding | which service a connection is for | ALPACA, Opossum | not in TLS itself: ALPN and SNI checks, no STARTTLS |

Notice that only one attack in the table (the RC4 biases) is about a primitive
that was weak in itself. The rest attacked the way sound primitives were
combined, the options left lying around, or the code.

Most record-layer and key-exchange attacks also share one shape. The attacker
cannot read the secret, but it can ask a question about it many times and get
a one-bit answer: was the padding valid, did the MAC take longer, was the
record a byte shorter. One answer is worth almost nothing; thousands or
millions are worth the secret. So these attacks need the victim to repeat
something, and the web, where a script on one page makes a browser send
endless requests to another site, was fertile ground. Book 2,
[*Cryptanalysis*, chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md),
teaches that method in general; this chapter follows it through TLS.

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
range with each answer, is taught in book 2,
[*Cryptanalysis*, §13.8](../cryptanalysis/13-Attacks-on-RSA.md#138-bleichenbachers-million-message-attack),
with a toy worked by hand. For TLS the
consequence was simple: a server that sent a different alert, or took a
different time, for bad padding than for a bad premaster secret, let an
attacker decrypt recorded sessions or sign with the server's key.

### What a TLS server checks

Figure 4.2 shows the block a TLS 1.2 client encrypts with a 2048-bit key and
the four checks a server can make on it, in order. Any difference in what the
server does after a check fails, whether an alert, a closed connection, a
pause or a cache footprint, is a separate oracle.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The 256-byte PKCS #1 v1.5 block of a TLS 1.2 RSA key exchange: bytes 00 02, 205 nonzero padding bytes, a 00 separator, then the 48-byte premaster secret starting with the version 03 03; four checks a server can make are numbered under the fields" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">the block the client encrypts with a 2048-bit RSA key (256 bytes)</text>
<rect x="20" y="36" width="36" height="40" fill="currentColor" fill-opacity=".18" stroke="currentColor"/>
<text x="38" y="61" text-anchor="middle" font-family="monospace">00</text>
<rect x="56" y="36" width="36" height="40" fill="currentColor" fill-opacity=".18" stroke="currentColor"/>
<text x="74" y="61" text-anchor="middle" font-family="monospace">02</text>
<rect x="92" y="36" width="250" height="40" fill="none" stroke="currentColor"/>
<text x="217" y="55" text-anchor="middle">PS: 205 random nonzero bytes</text>
<text x="217" y="70" text-anchor="middle" fill-opacity=".7">(at least 8 required)</text>
<rect x="342" y="36" width="36" height="40" fill="currentColor" fill-opacity=".18" stroke="currentColor"/>
<text x="360" y="61" text-anchor="middle" font-family="monospace">00</text>
<rect x="378" y="36" width="60" height="40" fill="currentColor" fill-opacity=".18" stroke="currentColor"/>
<text x="408" y="61" text-anchor="middle" font-family="monospace">03 03</text>
<rect x="438" y="36" width="182" height="40" fill="none" stroke="currentColor"/>
<text x="529" y="61" text-anchor="middle">46 random bytes</text>
<line x1="378" y1="88" x2="620" y2="88" stroke="currentColor"/>
<text x="499" y="104" text-anchor="middle">premaster secret, 48 bytes</text>
<text x="20" y="136" font-weight="bold">checks a server can make, and the oracle each one leaks</text>
<text x="20" y="160">1. starts 00 02: the "strong" oracle; one random block in 30,000 to 65,000 passes</text>
<text x="20" y="182">2. eight nonzero bytes before the first 00: a little rarer</text>
<text x="20" y="204">3. the 00 exactly 49 bytes from the end: hundreds of times rarer again</text>
<text x="20" y="226">4. version bytes match the ClientHello: rarer still (Klíma, Pokorný, Rosa 2003)</text>
</svg>
<figcaption>Figure 4.2. The PKCS #1 v1.5 block inside a TLS 1.2 RSA key exchange. The safe server runs all four checks and answers identically whatever fails; each check whose failure can be told apart is an oracle, and the earlier the check, the faster the attack.</figcaption>
</figure>

The stricter the check that leaks, the rarer a "yes" and the more queries the
attack needs; the ROBOT paper calls an oracle that leaks only check 1
*strong* and the others *weak*. A weak oracle slows the attack, sometimes a
hundredfold. Only an identical answer stops it.

### Code it: the oracle, run to the end

Book 2 works the first step by hand. The program below runs the whole attack
against a toy 80-bit RSA key with a strong oracle and prints how the
candidates shrink. The "premaster secret" is `03 03 be ef`; the attacker has
only the ciphertext and the server's yes or no.

```python
# Bleichenbacher's attack on a toy 80-bit RSA key (k = 10 bytes), run to the end.
# The server answers one bit: does the decrypted block start with 00 02?
p, q, e = 1035678869431, 934279463941, 65537
n = p * q
d = pow(e, -1, (p - 1) * (q - 1))
k = 10                                   # bytes in the modulus
B = 2 ** (8 * (k - 2))

# The client's block: 00 02, three nonzero padding bytes, 00, then a 4-byte
# "premaster secret" that starts with the version 03 03 (TLS's is 48 bytes).
block = bytes([0, 2, 0x5A, 0xC3, 0x17, 0, 3, 3, 0xBE, 0xEF])
c = pow(int.from_bytes(block, "big"), e, n)   # recorded off the wire

queries = 0
def oracle(x):                           # the leaky server
    global queries
    queries += 1
    return pow(x, d, n).to_bytes(k, "big")[:2] == b"\x00\x02"

def ceil(a, b):
    return -(-a // b)

def narrow(M, s):                        # keep the m with 2B <= m*s - r*n < 3B
    out = []
    for a, b in M:
        for r in range(ceil(a * s - 3 * B + 1, n), (b * s - 2 * B) // n + 1):
            lo, hi = max(a, ceil(2 * B + r * n, s)), min(b, (3 * B - 1 + r * n) // s)
            if lo <= hi:
                out.append((lo, hi))
    return out

M, s, rnd = [(2 * B, 3 * B - 1)], ceil(n, 3 * B), 0
while True:
    if len(M) > 1 or rnd == 0:           # search upwards for the next "yes"
        while not oracle(c * pow(s, e, n) % n):
            s += 1
    else:                                # one interval: jump to a likely s
        a, b = M[0]
        r = ceil(2 * (b * s - 2 * B), n)
        found = False
        while not found:
            for s2 in range(ceil(2 * B + r * n, b), (3 * B + r * n) // a + 1):
                if oracle(c * pow(s2, e, n) % n):
                    s, found = s2, True
                    break
            r += 1
    M, rnd = narrow(M, s), rnd + 1
    width = sum(b - a + 1 for a, b in M)
    if rnd == 1 or len(M) == 1 and M[0][0] == M[0][1] or rnd % 10 == 0:
        print(f"round {rnd:2}: s = {s:<22} queries {queries:6}  candidates 2^{width.bit_length() - 1}")
    if len(M) == 1 and M[0][0] == M[0][1]:
        break
print("recovered:", M[0][0].to_bytes(k, "big").hex(" "))
```

It prints:

```text
round  1: s = 22279                  queries   4795  candidates 2^49
round 10: s = 72581733               queries   5143  candidates 2^35
round 20: s = 76949601429            queries   6221  candidates 2^27
round 30: s = 78799008747543         queries   7371  candidates 2^17
round 40: s = 80690187581296737      queries   8523  candidates 2^7
round 48: s = 20656688021465957385   queries   9444  candidates 2^0
recovered: 00 02 5a c3 17 00 03 03 be ef
```

Before any query the plaintext is one of $B = 2^{64}$ values, anything that
starts `00 02`. The first "yes" costs 4,795 queries, since a random multiplier
gives a conforming block only about once in $n/B \approx 52{,}000$ tries, and
it cuts the candidates to $2^{49}$. After that each round costs about a
hundred queries and halves what is left. A 2048-bit key has the same shape: a
first search that dominates, then about two thousand halving rounds, from tens
of thousands of queries to about a million in all for a strong oracle; hence
the name "million message attack".

The attacker gets the whole block, not just the secret. Started instead from a
padded hash of a message of its own, the same loop computes that value to the
power $d$: a signature under the server's key. That is how ROBOT, below, signed a message
with Facebook's key without ever touching Facebook's private key file.

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

### The returns, in numbers

Each return of the oracle came through a different channel, and each was
fixed by closing that channel rather than the cause. In 2003 Vlastimil Klíma,
Ondřej Pokorný and Tomáš Rosa found an oracle in servers that reacted
differently to wrong version bytes (check 4 in Figure 4.2), and TLS 1.1 and
1.2 spelled out ever more exactly how a server must prepare its random
substitute secret *before* decrypting.

ROBOT, disclosed on 12 December 2017, found the oracle in products from F5,
Citrix, Radware, Cisco, Erlang, Bouncy Castle and wolfSSL; press reports put
it at about 2.8 percent of the top million HTTPS sites. Most were load
balancers and accelerators terminating TLS in their own firmware, far from
the libraries fixed years before. The team's advice was to turn off every
`TLS_RSA_*` suite, and many large sites did.

In February 2019 Eyal Ronen, Robert Gillham, Daniel Genkin, Adi Shamir, David
Wong and Yuval Yarom published "The 9 Lives of Bleichenbacher's CAT". An
attacker running unprivileged code on the server's machine (a cloud
neighbor, say) watched the CPU cache
([*Cryptanalysis*, §17.4](../cryptanalysis/17-Side-Channels-the-Attackers-View.md#174-cache-attacks-primeprobe-and-flushreload)),
and seven of nine libraries leaked: OpenSSL, Amazon's s2n, Mbed TLS, Apple's
CoreTLS, Mozilla's NSS, wolfSSL and GnuTLS. Only BearSSL and BoringSSL did not.
The new point was speed. To impersonate a server live, the attacker must finish
before the browser gives up, about 30 seconds; by spreading the queries over
five servers sharing one certificate, the team recovered a 2048-bit plaintext
inside that window.

Marvin (Hubert Kario of Red Hat, September 2023) found timing leaks in
OpenSSL, GnuTLS, NSS, pyca/cryptography and M2Crypto, some in code that merely
*called* the library and branched on its error. OpenSSL 3.2 (November 2023)
answered with implicit rejection: on bad padding, return a pseudorandom
"message" derived from the key and ciphertext, so the caller has nothing to
branch on. Kario's own conclusion was that PKCS #1 v1.5 decryption cannot be
made safe in general-purpose code.

An alert in 1998, a version check in 2003, resets in 2017, cache lines in
2019, microseconds in 2023: every fix closed one channel and the next paper
found another. The fix that held was TLS 1.3's: no RSA key transport, so no
padded secret to ask about.

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

!!! note "Life story: ROBOT"
    **Born:** 12 December 2017, Hanno Böck, Juraj Somorovsky and Craig Young
    (USENIX Security 2018) · **Purpose:** show that Bleichenbacher's oracle was
    still live, nineteen years on, in load balancers and on 27 of the top 100
    domains · **Helped:** patches from F5, Citrix and others; sites turned off
    `TLS_RSA_*` suites altogether · **Status:** gone with RSA key transport;
    its successors (CAT 2019, Marvin 2023) moved to side channels

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
<figcaption>Figure 4.3. The order of MAC and encryption. Every CBC attack on TLS lived in the gap between "decrypt" and "check MAC" in the first row.</figcaption>
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
Section 4.8 puts numbers on how fast the attacks improved.

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
[*Cryptanalysis*, §10.9](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#109-compression-oracles-crime-and-breach);
§4.8 below runs CRIME through a TLS record, where the attacker sees lengths
only in whole cipher blocks.

The common cure came in two steps. Encrypt-then-MAC for TLS 1.2 (RFC 7366,
2014) let servers authenticate before touching padding. TLS 1.3 went further
and allowed only AEAD ciphers (AES-GCM, ChaCha20-Poly1305, AES-CCM), which
authenticate and encrypt in one step with no padding to check, and removed
compression altogether.

### BEAST by hand

Book 2 ([§10.5](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#105-beast-a-predictable-iv))
shows how BEAST lines up a cookie so a block holds fifteen known bytes and one
unknown. Here is one guess checked with real numbers, on 4-byte blocks so the
XORs fit on a line.

The attacker has recorded two ciphertext blocks from earlier in the
connection: $C_{i-1} =$ `3a 91 0c e7` and the target $C_i$, the encryption of
$C_{i-1} \oplus P_i$. It has lined up the cookie so that $P_i$ is `id=` plus
one unknown character. The last block on the wire is $X =$ `5d 22 f0 18`, and
in TLS 1.0 that will be the IV of the next record. To test the guess `id=K`
(`69 64 3d 4b`), the attacker has the victim's browser send, as the first
block of the next record,

$$
P^* = X \oplus C_{i-1} \oplus G
= \mathtt{67\ b3\ fc\ ff} \oplus \mathtt{69\ 64\ 3d\ 4b}
= \mathtt{0e\ d7\ c1\ b4}.
$$

The browser's CBC computes $E_K(X \oplus P^*) = E_K(\mathtt{53\ f5\ 31\ ac})$.
The original encryption computed $E_K(C_{i-1} \oplus P_i)$, and if
$P_i$ really is `id=K`, then $C_{i-1} \oplus P_i$ is also `53 f5 31 ac`. Same
input, same key, same output: the new ciphertext block equals $C_i$, and the
attacker knows the guess was right. The guess `id=J` gives `0e d7 c1 b5`, a
cipher input of `53 f5 31 ad`, and an unrelated output. Figure 4.4 draws the
cancellation.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="BEAST's check of one guess: the attacker's chosen block is X xor C(i-1) xor G; the victim's CBC adds X again, so the block cipher sees C(i-1) xor G, the same input as the original encryption exactly when G equals the secret block" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">earlier, the victim encrypted the secret block</text>
<rect x="20" y="36" width="170" height="30" fill="none" stroke="currentColor"/>
<text x="105" y="56" text-anchor="middle" font-family="monospace">C(i-1) 3a 91 0c e7</text>
<text x="205" y="56">XOR</text>
<rect x="240" y="36" width="170" height="30" fill="none" stroke="currentColor"/>
<text x="325" y="56" text-anchor="middle" font-family="monospace">P(i) "id=?"</text>
<text x="425" y="56">→ E →</text>
<rect x="475" y="36" width="145" height="30" fill="currentColor" fill-opacity=".18" stroke="currentColor"/>
<text x="547" y="56" text-anchor="middle" font-family="monospace">C(i)</text>
<text x="20" y="104" font-weight="bold">now the attacker makes the browser send P* = X ⊕ C(i-1) ⊕ G</text>
<rect x="20" y="116" width="170" height="30" fill="none" stroke="currentColor"/>
<text x="105" y="136" text-anchor="middle" font-family="monospace">IV = X 5d 22 f0 18</text>
<text x="205" y="136">XOR</text>
<rect x="240" y="116" width="170" height="30" fill="none" stroke="currentColor"/>
<text x="325" y="136" text-anchor="middle" font-family="monospace">P* 0e d7 c1 b4</text>
<text x="425" y="136">→ E →</text>
<rect x="475" y="116" width="145" height="30" fill="currentColor" fill-opacity=".18" stroke="currentColor"/>
<text x="547" y="136" text-anchor="middle" font-family="monospace">C*</text>
<text x="20" y="180">X cancels: the cipher's input is C(i-1) ⊕ G = 53 f5 31 ac for G = "id=K"</text>
<text x="20" y="202">and C(i-1) ⊕ P(i) is also 53 f5 31 ac exactly when P(i) = "id=K"</text>
<text x="20" y="228" font-weight="bold">C* = C(i) means the guess is right; one guess costs one request</text>
</svg>
<figcaption>Figure 4.4. One BEAST guess with 4-byte toy blocks. Because TLS 1.0 announced the next IV before the attacker chose the next plaintext, the attacker could cancel it and replay the conditions of an old encryption.</figcaption>
</figure>

A base64 cookie character has 64 possible values, so 32 guesses on average,
and a 16-character cookie falls in about 500 requests. The hard part was never
the arithmetic but the control: the chosen block had to start a record right
after the attacker saw the previous one end, and in 2011 that took a Java
applet and a same-origin bug, not ordinary JavaScript.

### Lucky Thirteen by hand

Lucky Thirteen's name is a piece of arithmetic, and it is worth doing once.
TLS's MAC covers a 13-byte header (8-byte sequence number, 1-byte type,
2-byte version, 2-byte length) followed by the record's data. HMAC-SHA1 runs
SHA-1 twice; SHA-1 eats 64-byte blocks and must fit, after the message, one
`80` byte and an 8-byte length, so $\ell$ bytes cost
$\lceil (\ell + 9)/64 \rceil$ compression-function calls. The inner hash
covers a 64-byte key block plus the header plus the data, the outer hash a
64-byte key block plus the 20-byte inner digest (two calls, always).

Take a record whose decrypted body is four AES blocks, 64 bytes: data, a
20-byte MAC, then padding. Count by hand:

| Last bytes of the decrypted body | Data length $L$ | Inner hash input $64 + 13 + L$ | Calls, inner + outer |
| --- | --- | --- | --- |
| `.. 00` (one padding byte) | $64 - 20 - 1 = 43$ | 120, plus 9 = 129 → 3 blocks | 3 + 2 = 5 |
| `.. 01 01` (two padding bytes) | $64 - 20 - 2 = 42$ | 119, plus 9 = 128 → 2 blocks | 2 + 2 = 4 |
| bad padding, MAC'd as if none was removed | 43 or 44 | 120 or 121 → 3 blocks | 5 |

In the fast row $13 + L + 9$ is exactly 64: the 13-byte header puts the
boundary at 42 bytes of data, two padding bytes in a 64-byte record, so any
valid padding of two or more bytes is fast, and `01 01` is by far the likeliest.
Hence the name: thirteen, usually unlucky, was the attacker's luck.
One compression is a few hundred to a thousand clock cycles.

The attack, which book 2 runs in full
([§10.4](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#104-lucky-thirteen-an-oracle-made-of-time)),
replaces the last block of a record with a target block and changes the last
two bytes of the block before it; a fast reply means the result ended in
`01 01`. What made it expensive in TLS is the protocol around it: every wrong
guess draws a `bad_record_mac` alert and TLS tears the session down, so each
of the $2^{16}$ two-byte guesses, repeated to beat network noise, costs a
fresh session carrying the same secret. AlFardan and Paterson estimated
$2^{23}$ sessions per block, $2^{19}$ per byte for base64 plaintext, measured
on a quiet local network. DTLS drops a bad record and carries on, and there
they demonstrated full plaintext recovery. The fixes proved hard to get
right: OpenSSL 1.0.1d's constant-time MAC code (February 2013) later had a
faster variant that reopened a padding oracle (CVE-2016-2107), and Amazon's
s2n, which used random delays instead, still leaked ("Lucky Microseconds").

### POODLE's odds

POODLE's oracle answers "yes" with probability exactly 1 in 256. SSL 3.0's
receiver checks only the last padding byte (the length), then the MAC over
what remains. The attacker sizes the request so that the record ends in a
whole block of padding, fifteen bytes of anything and the length byte `0f`,
and replaces that last ciphertext block with a copy of the block it wants to
read, $C_i$. The server decrypts it as $D_K(C_i) \oplus C_{n-1}$; the MAC and
data are untouched, so the record is accepted exactly when that ends in `0f`,
one time in 256. Then

$$
P_i[15] = \mathtt{0f} \oplus C_{n-1}[15] \oplus C_{i-1}[15].
$$

Say $C_{n-1}$ ends in `9c` and $C_{i-1}$ ends in `d8`. Then
$P_i[15] =$ `0f` ⊕ `9c` ⊕ `d8` = `4b`, the letter `K`. A rejected record ends
the connection, the script sends the request again under fresh keys, and the
next try is an independent 1-in-256 chance.

The tries per byte are geometric with mean 256; the chance of success within
256 tries is $1 - (255/256)^{256} \approx 63$ percent, within 1,000 about 98
percent. Lengthening the path by one byte (BEAST's trick again) pulls the next
byte into place, so a 16-byte cookie costs about $16 \times 256 = 4{,}096$
requests, minutes of a background script. An oracle that leaks through
acceptance rather than microseconds needs no statistics at all.

When POODLE was disclosed on 14 October 2014, SSL Pulse had found SSL 3.0
enabled on about 98 percent of popular sites; a month later the share was
reported at 61 percent, and Firefox and Chrome had turned SSL 3.0 off by
January 2015. Its TLS form, against servers that checked TLS padding as
loosely (some F5 and A10 load balancers, December 2014), needed no downgrade
and lasted longer; Craig Young's Zombie POODLE and GOLDENDOODLE (2019) found
related oracles in devices such as Citrix's NetScaler.

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
connections. At disclosure, 3 March 2015, scans found 36.7 percent of HTTPS
servers with browser-trusted certificates accepting export RSA; a week later,
6.5 percent. The quoted factoring cost was about 7.5 hours and $104 of Amazon
cloud time per key.

**Logjam** (May 2015, David Adrian and thirteen co-authors, "Imperfect Forward
Secrecy"). The same trick for `DHE_EXPORT` and 512-bit Diffie-Hellman groups.
This time the flaw was in the protocol itself: in TLS 1.2 the server signs its
Diffie-Hellman parameters, but the signature does not say which cipher suite
they were for, so export parameters signed for an export suite look the same as
normal ones. Most servers used one of a few standard 512-bit primes. The number
field sieve's expensive first stage depends only on the prime, so after a week
of precomputation per prime, each individual connection's discrete log took
about a minute. At disclosure, 20 May 2015, export Diffie-Hellman was
accepted by 8.4 percent of the top million HTTPS sites and 3.4 percent of all
browser-trusted HTTPS servers, more than 90 percent of them using one of just
two 512-bit primes. A minute is longer than many clients wait for a
handshake, so the live attack suited patient clients. The paper also estimated that precomputation for a
common *1024-bit* prime was within reach of a national agency, and argued that
this could explain capabilities described in leaked documents; that part is an
inference, not a demonstration, and is still debated. The mathematics of the
precomputation is in book 2.

**SLOTH** (January 2016, Bhargavan and Gaëtan Leurent). TLS 1.2 still allowed
MD5 and SHA-1 in handshake signatures and in its transcript hashing. SLOTH
showed that transcript collisions, two different transcripts with the same
hash, could be found fast enough with MD5 to break client authentication and
weaken other parts of the handshake. TLS 1.3 allows only SHA-256 and SHA-384.

Client impersonation shows how a hash collision becomes a protocol break. In
TLS 1.2 client authentication the client signs a hash of the handshake so far.
A man in the middle runs two handshakes at once, with the client and with the
real server, and picks its own messages so that the two different transcripts
have the same MD5 hash; the client's signature on one is then valid on the
other, and the attacker logs in as the client. It needs a *chosen-prefix*
collision, found while the handshake waits: about $2^{39}$ MD5 computations,
an hour per connection on a 48-core workstation in the authors' demonstration.
Both sides had to accept RSA-MD5 signatures, a TLS 1.2 option that Java's TLS
library and Akamai's servers still honored. As with Logjam, a negotiation is
only as strong as the weakest algorithm both ends will still agree to.

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
<figcaption>Figure 4.5. The 2009 renegotiation attack. Mallory never decrypts anything; the bank glues her prefix to Alice's request because nothing tied Alice's handshake to the one before it.</figcaption>
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

### The triple handshake, step by step

The attack needs a client, Alice, who can be persuaded to connect to a server
the attacker runs, Mallory's site, and who also holds a client certificate
for the bank. It takes three handshakes, which gave it its name (Figure 4.6).

<div class="mars-steps" markdown>

1. **Full handshake.** Alice connects to Mallory, and Mallory to the bank, passing Alice's client random and the bank's server random across and choosing RSA key exchange on both sides. Mallory decrypts Alice's premaster secret and re-encrypts the same value to the bank. Same randoms, same premaster secret: same master secret and keys. Only the Finished messages differ, because the transcripts hold different certificates.
2. **Resumption.** Alice resumes with Mallory, and Mallory relays the abbreviated handshake to the bank. It holds only the hellos and the Finished messages, computed from the shared master secret, so now the Finished values match too.
3. **Renegotiation.** Mallory sends the bank a request of its own; the bank asks for a client certificate and renegotiates; Mallory relays that handshake to Alice, who authenticates with her certificate. RFC 5746 compares the previous Finished values, which step 2 made identical, so the check passes, and the bank attributes Mallory's request to Alice.

</div>

The program shows the root of the problem in step 1: the TLS 1.2 PRF computes
the master secret from the premaster secret and the two randoms only, so two
handshakes that saw different certificates still end with the same secret.
The extended master secret hashes the whole transcript into it instead.

```python
# The triple handshake's first step: two TLS 1.2 connections, Alice-Mallory and
# Mallory-bank, that end with the same master secret. Mallory relays Alice's
# random, the bank's random and Alice's premaster secret (re-encrypted to the bank).
import hashlib, hmac, os

def prf(secret, label, seed, n=48):          # the TLS 1.2 PRF, P_SHA256 (RFC 5246, section 5)
    out, a = b"", label + seed
    while len(out) < n:
        a = hmac.new(secret, a, hashlib.sha256).digest()
        out += hmac.new(secret, a + label + seed, hashlib.sha256).digest()
    return out[:n]

client_random, server_random = os.urandom(32), os.urandom(32)
premaster = b"\x03\x03" + os.urandom(46)     # chosen by Alice, decrypted by Mallory

# The messages each side saw differ: Alice saw Mallory's certificate, the bank its own.
transcript_alice = client_random + server_random + b"Certificate: mallory.example"
transcript_bank = client_random + server_random + b"Certificate: bank.example"

def master_secret(transcript, extended):
    if extended:                              # RFC 7627: hash of the whole handshake
        return prf(premaster, b"extended master secret", hashlib.sha256(transcript).digest())
    return prf(premaster, b"master secret", client_random + server_random)

for extended in (False, True):
    ms_a = master_secret(transcript_alice, extended)
    ms_b = master_secret(transcript_bank, extended)
    print("extended master secret" if extended else "original derivation   ",
          "-> same master secret on both connections:", ms_a == ms_b)
```

It prints:

```text
original derivation    -> same master secret on both connections: True
extended master secret -> same master secret on both connections: False
```

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The triple handshake: in handshake 1 Mallory relays randoms and the premaster secret so both connections share a master secret; in handshake 2, a resumption, both connections get identical Finished values; in handshake 3, a renegotiation with Alice's client certificate, the RFC 5746 check passes on both sides" fill="currentColor" font-size="13">
<text x="90" y="20" text-anchor="middle" font-weight="bold">Alice</text>
<text x="320" y="20" text-anchor="middle" font-weight="bold">Mallory</text>
<text x="550" y="20" text-anchor="middle" font-weight="bold">bank</text>
<line x1="90" y1="28" x2="90" y2="320" stroke="currentColor"/>
<line x1="320" y1="28" x2="320" y2="320" stroke="currentColor"/>
<line x1="550" y1="28" x2="550" y2="320" stroke="currentColor"/>
<rect x="20" y="36" width="600" height="84" fill="currentColor" fill-opacity=".06"/>
<text x="26" y="52" font-weight="bold">1 full</text>
<line x1="90" y1="66" x2="546" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="550,66 538,61 538,71"/>
<text x="205" y="60" text-anchor="middle">client random cr</text>
<text x="435" y="60" text-anchor="middle">same cr</text>
<line x1="550" y1="88" x2="94" y2="88" stroke="currentColor" stroke-width="1.4"/>
<polygon points="90,88 102,83 102,93"/>
<text x="435" y="82" text-anchor="middle">server random sr</text>
<text x="205" y="82" text-anchor="middle">same sr</text>
<text x="320" y="110" text-anchor="middle">same premaster secret both ways → same master secret; Finished differ</text>
<rect x="20" y="128" width="600" height="72" fill="currentColor" fill-opacity=".12"/>
<text x="26" y="144" font-weight="bold">2 resume</text>
<line x1="90" y1="162" x2="546" y2="162" stroke="currentColor" stroke-width="1.4"/>
<polygon points="550,162 538,157 538,167"/>
<text x="320" y="156" text-anchor="middle">abbreviated handshake relayed</text>
<text x="320" y="190" text-anchor="middle">same keys and now the same Finished values on both connections</text>
<rect x="20" y="208" width="600" height="104" fill="currentColor" fill-opacity=".2"/>
<text x="26" y="224" font-weight="bold">3 renegotiate</text>
<line x1="320" y1="240" x2="546" y2="240" stroke="currentColor" stroke-width="1.4"/>
<polygon points="550,240 538,235 538,245"/>
<text x="435" y="234" text-anchor="middle">Mallory's request</text>
<line x1="90" y1="270" x2="546" y2="270" stroke="currentColor" stroke-width="1.4"/>
<polygon points="550,270 538,265 538,275"/>
<text x="320" y="264" text-anchor="middle">Alice's client certificate, relayed; RFC 5746 check passes</text>
<text x="320" y="300" text-anchor="middle" font-weight="bold">bank: the request came from Alice</text>
</svg>
<figcaption>Figure 4.6. The triple handshake. Each step is a legal TLS 1.2 handshake; the attack lives in what step 1 failed to bind (the master secret to the certificates) and what step 3 trusted (equal Finished values as proof of one peer).</figcaption>
</figure>

The browsers' first fix, in 2014, was blunter: refuse a renegotiation in which
the server's certificate changes. RFC 7627 followed in September 2015, and
TLS 1.3 made the lesson structural: its key schedule (Chapter 3,
[§3.4](03-TLS-1.3-Message-by-Message.md#34-the-key-schedule)) hashes the
transcript into every secret, including the one a resumption starts from, and
there is no renegotiation for a step 3.

!!! note "Life story: the triple handshake"
    **Born:** early 2014, Karthikeyan Bhargavan, Antoine Delignat-Lavaud,
    Cédric Fournet, Alfredo Pironti and Pierre-Yves Strub (Inria and Microsoft
    Research, IEEE S&P 2014) · **Purpose:** show that RFC 5746 did not bind
    resumed and renegotiated sessions to the identities of the first ·
    **Helped:** the extended master secret (RFC 7627, 2015); browsers refusing
    certificate changes on renegotiation; TLS 1.3's transcript-bound key
    schedule · **Status:** fixed; found with the miTLS verified implementation
    work, an early win for formal methods in TLS

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

### Heartbleed's bytes

The whole attack fits in one TLS record of eight bytes. Read it field by
field:

| Bytes | Field | Meaning |
| --- | --- | --- |
| `18` | record content type | 24, heartbeat (RFC 6520) |
| `03 02` | record version | TLS 1.1 (any version the server speaks) |
| `00 03` | record length | three bytes of heartbeat message follow |
| `01` | heartbeat type | 1, request |
| `ff ff` | payload length | 65,535 bytes, claimed |
| (none) | payload and padding | nothing actually sent |

A correct heartbeat message is at least 19 bytes long: one byte of type, two
of length, the payload, and at least 16 bytes of random padding. This one is
three bytes long and claims a payload of 65,535. RFC 6520 already said what to
do: if the payload length is too large for the record, discard the message
silently. Vulnerable OpenSSL instead built a reply of
$1 + 2 + 65{,}535 + 16 = 65{,}554$ bytes, copying 65,535 bytes from where the
payload should have been, all of it from the heap beyond the three-byte
message, and sent it back across several records (one carries at most 16,384
bytes). The request could be sent mid-handshake or inside an encrypted
session and left no trace in ordinary logs, so an attacker could repeat it
thousands of times, collecting a different 64 KB of memory each time.

Netcraft counted about 17 percent of trusted secure web servers exposed,
around half a million; Durumeric and colleagues put 24 to 55 percent of the
top million HTTPS sites at risk at disclosure and 11 percent still vulnerable
two days later. Whether anyone exploited it before April 2014 was never
settled, but the Canada Revenue Agency lost about 900 social insurance numbers
to an attacker in the days after disclosure, before it patched.

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

## 4.8 Length and bias: compression and RC4 up close

*Level: intermediate.*

The attacks in this section need no oracle in the receiver. They read the
ciphertext as it goes past and use two facts encryption never hid: how long a
record is, and, for RC4, which byte values are slightly more likely. Both need
the same secret encrypted again and again, and the browser supplies it,
attaching the same cookie to every request a script asks it to send.

### Code it: CRIME through a block cipher

Book 2 shows the compression leak with exact lengths. A CBC record rounds the
compressed request, its 20-byte MAC and at least one padding byte up to whole
16-byte blocks, so a one-byte saving usually changes nothing on the wire.
CRIME's answer was to pad: add filler characters that appear nowhere else,
one at a time, until the request sits at a block edge where the right guess
stays inside and every wrong guess spills into one more block.

```python
# CRIME against TLS compression with a CBC cipher: the attacker sees only the
# record length, rounded up to 16-byte blocks, so it pads its guesses until a
# one-byte saving shows as a whole block.
import zlib

COOKIE = "sid=9b1d4e60"                      # the secret the browser sends every time
FILLER = "#$%&()*+,-./:;<>@[]^_`{|}~!"         # characters that appear nowhere else

def record_length(path):                     # what the attacker sees on the wire
    req = ("GET /" + path + " HTTP/1.1\r\nHost: bank.example\r\n"
           "Cookie: " + COOKIE + "\r\n\r\n").encode()
    body = zlib.compress(req, 9)
    mac_and_pad = 20 + 1                     # HMAC-SHA1 and at least one padding byte
    return 16 * -(-(len(body) + mac_and_pad) // 16)

def next_char(known, alphabet="0123456789abcdef"):
    for f in range(len(FILLER)):             # grow the filler one byte at a time
        pad = FILLER[:f]
        sizes = {g: record_length(pad + "?" + known + g) for g in alphabet}
        smallest = min(sizes.values())
        winners = [g for g in alphabet if sizes[g] == smallest]
        if len(winners) == 1:                # one guess is a block shorter: found
            return winners[0], f, len(alphabet) * (f + 1)
    return None, None, None

known, total = "sid=", 0
while len(known) < len(COOKIE):
    g, f, cost = next_char(known)
    total += cost
    if g is None:
        print("lost at", known); break
    known += g
    print(f"{known:14} filler {f:2} bytes, {cost:3} requests")
print("cookie:", known, "after", total, "requests")
```

It prints:

```text
sid=9          filler  4 bytes,  80 requests
sid=9b         filler  4 bytes,  80 requests
sid=9b1        filler  4 bytes,  80 requests
sid=9b1d       filler  4 bytes,  80 requests
sid=9b1d4      filler  4 bytes,  80 requests
sid=9b1d4e     filler  4 bytes,  80 requests
sid=9b1d4e6    filler  4 bytes,  80 requests
sid=9b1d4e60   filler  4 bytes,  80 requests
cookie: sid=9b1d4e60 after 640 requests
```

Eight hex characters cost 640 requests, a moment's work for a script. Real
compressors also produce ties: with this program's cookie changed to end in
`e`, the last character cannot be found, because `e` and a line break also
follow `bank.example` and the compressor finds a match of the same cost
whichever guess is right. That is why CRIME and BREACH used book 2's *two
tries* method, sending each guess in two arrangements and comparing them.

CRIME needed TLS-level compression (or SPDY's header compression), which some
browsers negotiated in 2012. Warned in advance, Chrome and Firefox had turned
both off by the September 2012 talk, and HTTP/2's HPACK was later designed so
that a partial match earns nothing. BREACH (August 2013) moved the leak into
gzip-compressed HTTP response bodies, where a page that echoes a search term
next to an anti-forgery token is an oracle; no TLS setting can fix that, and
the defenses live in the application
([*Cryptanalysis*, §10.9](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#109-compression-oracles-crime-and-breach)).
TLS 1.3's AEAD hides content perfectly and length not at all; its optional
record padding can hide length, and few applications use it.

!!! note "Life story: CRIME and BREACH"
    **Born:** CRIME, September 2012, Juliano Rizzo and Thai Duong (Ekoparty);
    BREACH, August 2013, Angelo Prado, Neal Harris and Yoel Gluck (Black Hat
    USA), after John Kelsey's 2002 paper on compression leaks · **Purpose:**
    read cookies and tokens from the lengths of compressed, encrypted data ·
    **Helped:** the end of TLS compression (absent from TLS 1.3); HPACK in
    HTTP/2; per-response masking of tokens in web frameworks · **Status:**
    CRIME fixed; BREACH defended site by site

### RC4: how fast the biases became an attack

The cryptanalysis is in book 2
([*Cryptanalysis*, §8.10](../cryptanalysis/08-Attacks-on-Stream-Ciphers.md#810-rc4-in-tls-from-biases-to-plaintext));
here is what it meant for a cookie. TLS spends the first 36 bytes of each
direction's RC4 keystream on the Finished message (a 4-byte header, 12 bytes
of verify data and a 20-byte HMAC-SHA1 tag), so the HTTP request starts at
byte 37, past the strongest bias: the second byte, zero twice as often as it
should be, encrypts part of Finished. The attacker works with weaker biases,
and the cost is set by how many encryptions of the cookie it can collect per
second.

In March 2013 AlFardan, Bernstein, Paterson, Poettering and Schuldt gave two
attacks. One used the single-byte biases of the first 256 keystream positions
and needed $2^{24}$ to $2^{32}$ sessions, each a new connection, with the
cookie placed early in the request. The other used biases between consecutive
bytes, the Fluhrer-McGrew biases, which hold at every position, so it could
work inside one long connection; it needed about $13 \times 2^{30}$
encryptions of the cookie. Do the division by hand: at the 1,700 requests per
second a browser could be driven to send, that is
$13 \times 2^{30} / 1{,}700 \approx 8.2$ million seconds, about 2,300 hours,
or three months. At that point about half of all TLS connections used RC4,
many because servers had switched to it in 2011 to avoid BEAST.

In 2015 Vanhoef and Piessens's RC4 NOMORE added Mantin's ABSAB bias (a pair
of bytes tends to repeat after a short gap) and tested candidate cookies
against the server in order of likelihood. They needed $9 \times 2^{27}$ encryptions and drove the browser to
about 4,450 requests per second: $9 \times 2^{27} / 4{,}450 \approx 271{,}000$
seconds, 75 hours, with a 94 percent chance of recovering a 16-character
cookie, and 52 hours in one test on real devices. Three months had become three
days in two years, and the authors' advice was to stop using RC4, not to tune
it. The IETF had already published RFC 7465 in February 2015, and the major
browsers turned RC4 off in early 2016.

## 4.9 What TLS 1.3 learned

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
| Bind the connection to its application, not only its name | ALPACA, Opossum (§4.10) | outside TLS 1.3 itself: strict ALPN and SNI checks |

Much of this was known in principle before. What changed between 2011 and 2016
was that attacks got good enough, and well enough publicized, that the cost of
keeping old options became visible. The working group's guiding sentence for
1.3 was to remove "anything that's not needed".

## 4.10 After TLS 1.3: Raccoon, ALPACA and Opossum

*Level: intermediate.*

TLS 1.3 was published as RFC 8446 in August 2018. The attacks found since then
fall into two groups: old TLS 1.2 options still running on servers that kept
them for old clients, and the places where TLS meets the application that
uses it, which no version of TLS had specified.

### Raccoon: a leading zero

In TLS 1.2's Diffie-Hellman, the premaster secret is $Z = g^{ab} \bmod p$ with
its leading zero bytes stripped (RFC 5246, §8.1.2), and it becomes the key of
the HMAC inside the PRF. HMAC uses a key of up to one hash block as it is and
hashes a longer one first, so the time to derive the master secret can depend
on the length of $Z$, which is one byte short about once in 256 handshakes.
Work the worst case by hand. In a 1032-bit group, $Z$ is normally 129 bytes.
With SHA-384, whose block is 128 bytes, a 129-byte key is hashed first,
$\lceil (129 + 17)/128 \rceil = 2$ compression calls (SHA-384 appends a `80`
byte and a 16-byte length), while the same $Z$ with a zero top byte, 128 bytes,
is used directly: no calls. Two compressions are easy to time. With common
group sizes the step falls less conveniently and the leak is smaller.

The attack needs a server that reuses its secret $b$: static `DH` suites, or
`DHE` servers that cache their "ephemeral" key for speed. The attacker records
the victim's $g^a$, then sends the server $g^a \cdot g^{r_i}$ for random $r_i$
of its own. The server computes $Z \cdot (g^b)^{r_i}$, the attacker knows the
multiplier, and each fast handshake says that $Z$ times a known number has
its top byte zero. Enough of those form a *hidden number problem*, which
lattice reduction solves
([*Cryptanalysis*, §15.8](../cryptanalysis/15-Lattices-as-a-Weapon.md#158-the-hidden-number-problem)),
and $Z$ decrypts the recorded session.

Robert Merget and five colleagues published Raccoon on 9 September 2020. Their
scans found about a third of the top 100,000 sites supporting `DHE`, and about
one in ten of those reusing keys. OpenSSL rated it low severity
(CVE-2020-1968) and stopped reusing DH secrets, and Mozilla disabled Firefox's
`DHE` suites (CVE-2020-12413). TLS 1.3 pads the shared secret to the group's
full length (RFC 8446, §7.4.1) and never reuses key shares, so it was not
affected.

!!! note "Life story: Raccoon"
    **Born:** 9 September 2020, Robert Merget, Marcus Brinkmann, Nimrod Aviram,
    Juraj Somorovsky, Johannes Mittmann and Jörg Schwenk (USENIX Security
    2021) ·
    **Purpose:** show that stripping leading zeros from a reused
    Diffie-Hellman secret leaks its top bits through timing · **Helped:**
    OpenSSL and others stopped reusing DH keys; one more argument for retiring
    TLS 1.2 `DHE` · **Status:** narrow in practice; impossible in TLS 1.3

### ALPACA: the right name, the wrong service

A TLS certificate names a host, not a service. If `www.bank.example` and
`ftp.bank.example` share a certificate, or a wildcard covers both, a TLS
connection to either authenticates as the other. ALPACA (Application Layer
Protocol Confusion; Marcus Brinkmann and seven colleagues, USENIX Security
2021) made that an attack. A man in the middle redirects a browser's HTTPS
connection to the TLS port of the bank's FTP, SMTP, IMAP or POP3 server. TLS
completes normally; the server reads the HTTP request as unknown commands, and
some servers echo part of it back or upload and download files on its
instructions. The browser takes whatever returns as the bank's page, and the
authors showed cookie theft and cross-site scripting. Their scans found about
1.4 million web servers whose certificates also covered an application server,
and about 114,000 attackable through one that behaved exploitably.

The fix is to name the application and check it. ALPN (RFC 7301), the
extension browsers already use to choose HTTP/2, names the protocol in the
ClientHello; a server that rejects a foreign ALPN token or SNI name closes the
hole, as the paper proposed. For operators it is the old DROWN advice in a new
place: one key or certificate should not serve two protocols that might be
confused.

!!! note "Life story: ALPACA"
    **Born:** 2021, Marcus Brinkmann, Christian Dresen, Robert Merget,
    Damian Poddebniak, Jens Müller, Juraj Somorovsky, Jörg Schwenk and
    Sebastian Schinzel (USENIX Security 2021), after cross-protocol ideas going
    back to Jochen Topf (2001) · **Purpose:** show that TLS authenticates a
    name, not a protocol, so HTTPS can be redirected to an FTP or mail server
    with the same certificate · **Helped:** strict ALPN and SNI checks in
    servers; separate certificates per service · **Status:** mitigated where
    servers check; the class of attack is open

### Opossum: out of step

Opossum (2025; Robert Merget and colleagues from the Technology Innovation
Institute, Ruhr University Bochum and Paderborn University; USENIX Security
2026) found a sharper version of the same seam. Many protocols start TLS
either *implicitly*, on a dedicated port, or *opportunistically*, on the plain
port after an upgrade request (STARTTLS in mail, the rare HTTP
`Upgrade: TLS/1.0` of RFC 2817). A man in the middle who sends the client's
implicit-TLS connection to the opportunistic port, injecting the plaintext
upgrade request itself, leaves the server one response ahead: the client then
receives the answer to a request the attacker chose as the answer to its own.
The authors found more than three million servers offering both modes, though
the HTTP form needs RFC 2817 support, which is rare. Apache's HTTP server fixed
its RFC 2817 upgrade support (CVE-2025-49812), Cyrus IMAP made implicit TLS
its default, and the advice is short: offer implicit TLS only.

Neither attack breaks any cryptography. TLS delivered what it promised, an
authenticated, confidential byte stream to a named host; the applications
assumed it also said which program was reading, and where in the
conversation.

## 4.11 Mars: an archive of recorded traffic

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

### Adaptive attacks across a light delay

Does the distance protect the city? Look again at the Bleichenbacher program
in §4.3. Its queries come in rounds, each depending on the answer to the one
before; queries inside a round can go in parallel, rounds cannot. The toy took
48 rounds, a 2048-bit key about two thousand. An attacker on Earth querying an
oracle in Arcadia City waits one round trip per round, 6 to 44 minutes:
$2{,}000 \times 6 = 12{,}000$ minutes, about 8 days, at closest approach, and
$2{,}000 \times 44 = 88{,}000$ minutes, about 61 days, at the far side of the
orbit. Slow, but nothing to a patient adversary holding a recording. The delay
does not protect the archive.

It changes the live attacks, and not in the city's favor. CAT's 30-second
race, Logjam's minute of discrete logarithm and SLOTH's hour of collision
search were all limited by how long a client waits for a handshake. A client
on the Mars link must wait at least a round trip, so its timeouts run to tens
of minutes, and a man in the middle near either end gets that time for free.
The safe position is TLS 1.3's: no weak option for the extra time to exploit.
Timing attacks such as Lucky Thirteen and Raccoon run the other way:
interplanetary jitter swamps microseconds, so the timing threat to a city
server comes from inside the city's own network.

## 4.12 In the real world

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
- **Today's configuration.** A server that offers TLS 1.3, plus TLS 1.2 only
  with ECDHE, AEAD suites, the extended master secret, secure renegotiation
  and no compression, is out of reach of the protocol attacks here. What
  remains belongs to the application (BREACH, ALPACA, Opossum) and to the
  code (Heartbleed's kind). Chapter 5,
  [§5.8](05-TLS-in-Practice.md#58-configuring-and-testing-a-server), shows how to
  set that up and test it.

## 4.13 Going deeper

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
    alerts, connection handling and cache use, whether or not the padding was
    valid. Real implementations differed in small ways (different alerts,
    resets, timeouts, cache lines, microseconds), and each difference is an
    oracle: ROBOT, CAT and Marvin each found a new one.

??? question "3. In the toy Bleichenbacher run, 4,795 of the 9,444 queries went into the first round. Why, and what would a stricter server check change?"

    Before the first "yes" the attacker can only try multipliers in turn, and
    a random block starts `00 02` about once in $n/B \approx 52{,}000$ tries;
    after it, about a hundred queries halve the interval each round. A leak
    that fires only after stricter checks says "yes" far more rarely, so every
    search takes longer, but the attack still works.

??? question "4. How could DROWN use an SSL 2 server to attack a TLS-only server?"

    If the two shared an RSA key (same certificate on two machines, or two
    services on one), the SSL 2 server's export-cipher weakness gave a padding
    oracle on that key, which decrypted the TLS connection's RSA-encrypted
    premaster secret.

??? question "5. In Lucky Thirteen's 64-byte record with HMAC-SHA1, why is a body ending `01 01` faster to check than one ending `00`?"

    With two padding bytes the data is $64 - 20 - 2 = 42$ bytes, and the inner
    hash input after the 64-byte key block is $13 + 42 = 55$ bytes, which with
    SHA-1's 9 bytes of padding and length fills exactly one block: 2 inner
    calls, 4 in all. With one padding byte the data is 43 bytes, 56 + 9 = 65
    spills into another block: 5 calls. The difference is one SHA-1
    compression.

??? question "6. POODLE's oracle succeeds with probability 1/256 per request. About how many requests recover a 16-byte cookie, and how likely is one byte within 256 tries?"

    The tries per byte are geometric with mean 256, so about
    $16 \times 256 = 4{,}096$ requests on average. The chance of success within
    256 tries is $1 - (255/256)^{256} \approx 63$ percent.

??? question "7. In the downgrade program, why does the transcript MAC stop the first attack but not the downgrade dance?"

    In the first attack, the client and server saw different offers in one
    handshake, so their MACs over the transcript differ. In the dance, each
    retry is a separate, honest handshake; the attacker only made the
    earlier attempts fail, which no MAC in the later handshake can see.
    TLS_FALLBACK_SCSV carries the missing fact, "this is a retry", into the
    later handshake.

??? question "8. In the CRIME program, why does the attacker add filler characters, and why must they be characters that appear nowhere else?"

    With a CBC cipher lengths show only in whole 16-byte blocks, so a one-byte
    saving is invisible unless the request sits at a block edge; filler moves
    it there. Filler that compressed against the request would change the
    length for reasons unrelated to the guess.

??? question "9. Why did the extended master secret (RFC 7627) fix the triple handshake, as the program shows?"

    It derives the master secret from a hash of the entire handshake
    transcript, not just the two random values and the premaster secret, so
    two connections that saw different certificates (client to attacker,
    attacker to server) can no longer share a master secret, and the
    resumption in step 2 no longer gives them equal Finished values.

??? question "10. Why does the Earth-Mars delay barely slow an attack on a recorded session but help a live downgrade?"

    An attack on a recording can take as long as it likes; the delay only
    stretches each adaptive round to a round trip, 8 to 61 days for two
    thousand rounds. A live attack must finish before the client gives up, and
    a Mars-link client waits tens of minutes, which an attacker near one end
    gets for free.

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
- Oracle attacks cost one big search, then a round per bit: a toy 80-bit key
  fell to 9,444 queries in 48 rounds. Only an identical answer stops them.
- Lucky Thirteen is arithmetic ($13 + 42 + 9 = 64$); POODLE was 1 in 256 per
  request; RC4 attacks fell from three months to three days, 2013 to 2015.
- Since TLS 1.3, attacks hit leftover TLS 1.2 options (Raccoon) and the seam
  with the application (ALPACA, Opossum).

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
- Vlastimil Klíma, Ondřej Pokorný and Tomáš Rosa, "Attacking RSA-based
  sessions in SSL/TLS" (CHES 2003).
- Marsh Ray and Steve Dispensa, "Renegotiating TLS" (PhoneFactor, November
  2009).
- Angelo Prado, Neal Harris and Yoel Gluck, "SSL, gone in 30 seconds: a
  BREACH beyond CRIME" (Black Hat USA 2013).
- Martin Albrecht and Kenneth Paterson, "Lucky Microseconds: a timing attack
  on Amazon's s2n implementation of TLS" (EUROCRYPT 2016).
- Eyal Ronen, Robert Gillham, Daniel Genkin, Adi Shamir, David Wong and Yuval
  Yarom, "The 9 lives of Bleichenbacher's CAT: new cache attacks on TLS
  implementations" (IEEE S&P 2019).
- Craig Young, "Zombie POODLE and GOLDENDOODLE" (Black Hat Asia 2019).
- Robert Merget, Marcus Brinkmann, Nimrod Aviram, Juraj Somorovsky, Johannes
  Mittmann and Jörg Schwenk, "Raccoon attack: finding and exploiting
  most-significant-bit-oracles in TLS-DH(E)" (USENIX Security 2021).
- Marcus Brinkmann and others, "ALPACA: application layer protocol confusion,
  analyzing and mitigating cracks in TLS authentication" (USENIX Security
  2021).
- Hubert Kario, "Everlasting ROBOT: the Marvin attack" (2023, IACR ePrint
  2023/1442).
- Robert Merget and others, "Opossum attack: application layer
  desynchronization using opportunistic TLS" (2025, IACR ePrint 2025/1260;
  USENIX Security 2026).
- RFC 2246 (TLS 1.0, 1999), RFC 5246 (TLS 1.2, 2008), RFC 6520 (heartbeat,
  2012), RFC 7301 (ALPN, 2014), RFC 8446 (TLS 1.3, 2018).
- RFC 5746 (renegotiation indication), RFC 7366 (encrypt-then-MAC), RFC 7465
  (no RC4), RFC 7507 (fallback SCSV), RFC 7568 (no SSL 3), RFC 7627 (extended
  master secret), RFC 7919 (named DH groups), RFC 8996 (no TLS 1.0 and 1.1).
- Book 1, [Chapter 19](../../book/19-Protocols.md), §19.4, the short version
  of this chapter.
