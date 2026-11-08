# 5. TLS in Practice: QUIC, DTLS and the Web

*The TLS of Chapters 3 and 4 runs over TCP, a reliable byte stream. Much of
today's encrypted traffic does not. Video calls, games and half the traffic of
the largest web sites run over UDP, in QUIC and DTLS, which reuse the TLS 1.3
handshake but protect packets that may be lost, duplicated or reordered. This
chapter follows TLS into those protocols, then into the places it is
configured and enforced: between the services of one company with mutual TLS,
in the browser with Strict Transport Security, and on a server you set up
yourself. You will derive QUIC's first packet keys and check them against RFC
9001, strip HTTPS from a first visit and stop it with a preload list, and write
the authorization check of a service mesh.*

!!! abstract "In this chapter"
    **You will learn:**

    - why QUIC moved TLS's job into the transport, and how it protects
      packets, headers and connection IDs;
    - QUIC's Initial keys, address validation, retry tokens and connection
      migration;
    - DTLS 1.3 for UDP applications such as WebRTC and IoT;
    - mutual TLS between services, and identities like SPIFFE;
    - HTTPS on the web: SSL stripping, HSTS and preloading, and why
      certificate pinning was mostly abandoned;
    - how to configure and test a TLS server, and what interception does;
    - what changes when a link takes minutes, not milliseconds.

    **You need:** [Chapter 3](03-TLS-1.3-Message-by-Message.md) (the handshake
    and key schedule) and [Chapter 2](02-Certificates-and-PKI.md)
    (certificates). Some idea of TCP and UDP helps; the
    [networks site](https://networks.akadian.ca/) explains them.

    **Levels:** §5.1 to §5.2 are for beginners, §5.3 to §5.10 are intermediate,
    §5.11 is expert.

## 5.1 The problem

*Level: beginner.*

TCP delivers bytes in order. If one packet is lost, every byte after it waits
until the lost one is resent, even bytes that belong to an unrelated image or
script on the same page. This is **head-of-line blocking**, and HTTP/2, which
sends many requests over one TCP connection, suffers from it badly on lossy
networks. TCP's handshake costs a round trip before TLS's handshake can even
start. And TCP lives in operating system kernels and in the firmware of
middleboxes, so changing it takes a decade.

In 2012 Jim Roskind at Google designed a replacement that runs over UDP, in
the application, where it could be changed with a browser update. Google
deployed it between Chrome and its own servers from 2013 and called it QUIC.
It had its own cryptographic handshake, "QUIC crypto", which pioneered 0-RTT
and influenced TLS 1.3. When the IETF standardized QUIC (2016 to 2021), it
replaced QUIC crypto with TLS 1.3 itself. The result, RFC 9000 and RFC 9001
(May 2021), with HTTP/3 on top (RFC 9114, June 2022), carries a large share of
the traffic to the biggest web services today.

QUIC's design starts from a lesson of Chapter 4: middleboxes that can read a
protocol's headers will come to depend on them, and then the protocol can never
change. TCP's headers are in the clear, and TCP ossified. So QUIC encrypts
almost everything, including most of its transport headers, and authenticates
the rest, so that the only things a middlebox can see are the few fields it
needs to route packets.

Datagram applications that are not web browsing, such as video calls, VPNs and
small sensors, have their own version of TLS for UDP: **DTLS**, the Datagram
TLS, first standardized in 2006 and updated to match TLS 1.3 as DTLS 1.3 (RFC
9147) in 2022.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Protocol stacks compared: HTTP/2 over TLS over TCP over IP, versus HTTP/3 over QUIC (which contains TLS 1.3) over UDP over IP" fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">HTTPS until 2021</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">HTTP/3</text>
<rect x="60" y="34" width="200" height="40" class="soft" stroke="currentColor"/><text x="160" y="59" text-anchor="middle">HTTP/2</text>
<rect x="60" y="74" width="200" height="40" class="soft-acc" stroke="currentColor"/><text x="160" y="99" text-anchor="middle">TLS 1.2 or 1.3 (records)</text>
<rect x="60" y="114" width="200" height="40" class="soft" stroke="currentColor"/><text x="160" y="139" text-anchor="middle">TCP (kernel; headers visible)</text>
<rect x="60" y="154" width="200" height="40" class="soft" stroke="currentColor"/><text x="160" y="179" text-anchor="middle">IP</text>
<rect x="380" y="34" width="200" height="40" class="soft" stroke="currentColor"/><text x="480" y="59" text-anchor="middle">HTTP/3</text>
<rect x="380" y="74" width="200" height="80" class="soft" stroke="currentColor"/>
<text x="480" y="96" text-anchor="middle">QUIC (in the application)</text>
<rect x="400" y="104" width="160" height="40" class="soft-acc" stroke="currentColor"/>
<text x="480" y="129" text-anchor="middle">TLS 1.3 handshake</text>
<rect x="380" y="154" width="200" height="40" class="soft" stroke="currentColor"/><text x="480" y="179" text-anchor="middle">UDP</text>
<rect x="380" y="194" width="200" height="40" class="soft" stroke="currentColor"/><text x="480" y="219" text-anchor="middle">IP</text>
<text x="160" y="222" text-anchor="middle" font-size="12.5">3 round trips with TLS 1.2, 2 with 1.3</text>
<text x="480" y="252" text-anchor="middle" font-size="12.5">1 round trip; 0 on resumption</text>
</svg>
<figcaption>Figure 5.1. HTTP/3 puts the transport and TLS 1.3's handshake together inside QUIC, over UDP. TLS records disappear; QUIC protects its own packets.</figcaption>
</figure>

## 5.2 How QUIC uses TLS

*Level: beginner.*

QUIC does not use TLS records at all. It takes only TLS 1.3's handshake and key
schedule, and does its own packet protection with the keys:

1. The TLS handshake messages (ClientHello, ServerHello, Certificate and so on)
   are carried in QUIC **CRYPTO frames**, which QUIC delivers reliably and in
   order like any other stream.
2. As TLS derives each traffic secret (the client and server handshake
   secrets, then the application secrets), it hands them to QUIC, which turns
   them into packet-protection keys with its own labels (`quic key`, `quic iv`,
   `quic hp`).
3. QUIC encrypts each packet's payload with the AEAD, using the packet number
   as part of the nonce, and then **protects the header** (§5.3).
4. QUIC has three separate **packet number spaces** with their own keys:
   Initial, Handshake and Application data (plus 0-RTT). A packet says which
   space it belongs to.

The handshake is still one round trip: the client's first datagram carries
QUIC's transport parameters and the TLS ClientHello together, and the server's
answer carries ServerHello and the encrypted rest. A returning client can send
0-RTT data with the same replay caveats as in [Chapter 3](03-TLS-1.3-Message-by-Message.md).

QUIC's own transport settings (flow-control limits, connection IDs, idle
timeout) travel in a TLS extension called `quic_transport_parameters`. Putting
them inside the TLS handshake means they are covered by the transcript and
authenticated by the Finished messages, so an attacker cannot change them. This
is Chapter 1's rule again: anything negotiated must be under the final MAC.

## 5.3 Packet protection in QUIC

*Level: intermediate.*

### Initial keys: obfuscation, not secrecy

The very first packet, the client's Initial, has to be encrypted *before* any
key exchange has happened. QUIC encrypts it anyway, with keys that anyone can
compute: HKDF with a fixed, public salt (one per QUIC version) and the
**Destination Connection ID**, a random value the client chooses and sends in
the clear in the same packet. The point is not secrecy. It is to stop
middleboxes from reading and depending on the contents of handshake packets,
and to make it obvious that any box that does is decrypting a protocol it was
never meant to touch. A new QUIC version changes the salt, and old boxes can no
longer parse it.

RFC 9001 Appendix A gives worked values. The program derives them:

```python
# QUIC Initial packet keys (RFC 9001 section 5.2), checked against Appendix A.
# Anyone who sees the first packet can compute these: they hide nothing from an
# eavesdropper, but they stop middleboxes from reading and "helpfully" editing.
import hashlib, hmac

def hkdf_extract(salt, ikm):
    return hmac.new(salt, ikm, hashlib.sha256).digest()

def hkdf_expand_label(secret, label, length):
    full = b"tls13 " + label.encode()
    info = length.to_bytes(2, "big") + bytes([len(full)]) + full + b"\x00"
    return hmac.new(secret, info + b"\x01", hashlib.sha256).digest()[:length]

initial_salt = bytes.fromhex("38762cf7f55934b34d179ae6a4c80cadccbb7f0a")   # QUIC version 1
dcid = bytes.fromhex("8394c8f03e515708")       # Destination Connection ID, chosen by the client

initial = hkdf_extract(initial_salt, dcid)
client = hkdf_expand_label(initial, "client in", 32)
server = hkdf_expand_label(initial, "server in", 32)
expected = {"client key": "1f369613dd76d5467730efcbe3b1a22d",
            "client iv": "fa044b2f42a3fd3b46fb255c",
            "client hp": "9f50449e04a0e810283a1e9933adedd2",
            "server key": "cf3a5331653c364c88f0f379b6067e37",
            "server iv": "0ac1493ca1905853b0bba03e",
            "server hp": "c206b8d9b9f0f37644430b490eeaa314"}
for side, secret in (("client", client), ("server", server)):
    for part, n in (("key", 16), ("iv", 12), ("hp", 16)):
        value = hkdf_expand_label(secret, "quic " + part, n).hex()
        name = side + " " + part
        print(f"{name:10s} {value}  matches RFC 9001: {value == expected[name]}")
```

```text
client key 1f369613dd76d5467730efcbe3b1a22d  matches RFC 9001: True
client iv  fa044b2f42a3fd3b46fb255c  matches RFC 9001: True
client hp  9f50449e04a0e810283a1e9933adedd2  matches RFC 9001: True
server key cf3a5331653c364c88f0f379b6067e37  matches RFC 9001: True
server iv  0ac1493ca1905853b0bba03e  matches RFC 9001: True
server hp  c206b8d9b9f0f37644430b490eeaa314  matches RFC 9001: True
```

(The short `hkdf_expand_label` here makes one HMAC block, enough for outputs up
to 32 bytes; Chapter 3's version handles any length.) Since an eavesdropper can
compute these keys too, the ClientHello inside, with its server name, is no
more private in QUIC than in TLS over TCP. Encrypted Client Hello works in QUIC
the same way.

### Header protection

After a packet's payload is encrypted, QUIC also encrypts part of its
**header**: the packet number and some flag bits. It takes a 16-byte sample of
the packet's ciphertext, encrypts it with the `hp` key (AES in a single-block
mode, or ChaCha20), and XORs the first five bytes of the result into the
flags and packet number. The receiver reverses it: sample the same ciphertext,
compute the same mask, XOR it away.

Why? Packet numbers in the clear would let observers link packets of one
connection across a change of network (§5.4) and count retransmissions, and
middleboxes would start to rely on them. With header protection, a middlebox
sees only the version (on long headers), the connection ID and the length.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A QUIC short-header packet: flags and packet number masked by header protection, connection ID visible, payload encrypted by the AEAD; a sample of the ciphertext feeds the mask" fill="currentColor" font-size="13.5">
<rect x="20" y="40" width="70" height="44" class="soft-acc" stroke="currentColor"/><text x="55" y="60" text-anchor="middle">flags</text><text x="55" y="76" text-anchor="middle" font-size="11.5">masked</text>
<rect x="90" y="40" width="150" height="44" class="soft" stroke="currentColor"/><text x="165" y="60" text-anchor="middle">connection ID</text><text x="165" y="76" text-anchor="middle" font-size="11.5">visible, changes on moves</text>
<rect x="240" y="40" width="90" height="44" class="soft-acc" stroke="currentColor"/><text x="285" y="60" text-anchor="middle">packet no.</text><text x="285" y="76" text-anchor="middle" font-size="11.5">masked</text>
<rect x="330" y="40" width="290" height="44" class="soft" stroke="currentColor"/><text x="475" y="60" text-anchor="middle">payload: frames, AEAD-encrypted</text><text x="475" y="76" text-anchor="middle" font-size="11.5">nonce = iv XOR packet number</text>
<rect x="360" y="120" width="120" height="30" rx="4" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><text x="420" y="140" text-anchor="middle">16-byte sample</text>
<line x1="420" y1="84" x2="420" y2="116" stroke="currentColor"/><polygon points="420,120 415,108 425,108"/>
<rect x="190" y="170" width="200" height="34" rx="4" class="soft" stroke="currentColor"/><text x="290" y="192" text-anchor="middle">encrypt sample with hp key</text>
<line x1="360" y1="150" x2="330" y2="166" stroke="currentColor"/><polygon points="326,170 334,159 340,166"/>
<line x1="230" y1="170" x2="70" y2="90" stroke="currentColor" class="acc"/><polygon points="66,88 78,90 72,98" class="acc-fill"/>
<line x1="270" y1="170" x2="280" y2="90" stroke="currentColor" class="acc"/><polygon points="281,86 284,99 275,98" class="acc-fill"/>
<text x="20" y="224" font-size="12.5">first 5 bytes of the result are XORed into the flags and packet number (the "mask")</text>
</svg>
<figcaption>Figure 5.2. QUIC packet protection. The payload is sealed by the AEAD; then a sample of that ciphertext, encrypted under the header-protection key, masks the packet number and flags.</figcaption>
</figure>

### Address validation and amplification

UDP has no handshake, so a QUIC server cannot tell whether a packet's source
address is genuine. An attacker could send small Initial packets with a
victim's address as the source, and the server would send its much larger
answer (with a certificate chain) to the victim: a **reflection and
amplification** attack. QUIC's rules:

- A server may send at most **three times** as many bytes to an unvalidated
  address as it has received from it. This is why browsers pad their first
  Initial packet to at least 1,200 bytes.
- A server under load can answer with a **Retry** packet containing a token
  (an encrypted, MACed record of the client's address and the time). The client
  must repeat its Initial with the token, which proves it can receive packets
  at that address. This is the cookie of TLS's HelloRetryRequest
  ([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.7) moved into the
  transport.
- A server can give a client a **NEW_TOKEN** for its next connection, so a
  returning client skips the Retry.

## 5.4 Connections that move

*Level: intermediate.*

A TCP connection is named by four numbers: two IP addresses and two ports. When
a phone walks out of Wi-Fi range and onto a mobile network, its address
changes and every TCP connection breaks. QUIC names connections by
**connection IDs**, chosen by each end, so a connection can **migrate** to a
new address and continue.

Two security problems follow, and QUIC answers both:

- **Linkability.** If the same connection ID appeared on the old and new
  networks, an observer watching both could tell that the same phone moved.
  So each end issues its peer a set of fresh connection IDs, and a migrating
  client switches to a new, unused one. Combined with header protection, the
  packets before and after a move share no visible fields.
- **Hijacking and request forgery.** An attacker could send packets that
  claim to come from a new address, to redirect traffic to a victim. Before
  sending much data to a new address, an endpoint does **path validation**: it
  sends a PATH_CHALLENGE frame with 8 random bytes, which must come back in a
  PATH_RESPONSE from that address. A nonce, as in Chapter 1.

QUIC also has **stateless reset**: a server that has lost a connection's state
(it restarted) can tell the client to stop by sending a packet that ends in a
16-byte token, which it gave the client earlier in an encrypted frame and can
recompute from the connection ID with a secret key. No one else can produce
the token, so an attacker cannot reset other people's connections.

## 5.5 DTLS: TLS for datagrams

*Level: intermediate.*

QUIC is a whole transport. Some applications want only security on top of
plain UDP: real-time media, where a late packet is useless and must not be
resent; VPNs that carry IP packets; small devices speaking CoAP. For them there
is **DTLS**: DTLS 1.0 (RFC 4347, 2006), 1.2 (RFC 6347, 2012) and 1.3 (RFC 9147,
2022), each mapping the matching TLS version onto datagrams. The handshake is
the same; the record layer must change:

- **Explicit sequence numbers and epochs.** TLS counts records implicitly; a
  lost datagram would desynchronize the count. DTLS records carry an **epoch**
  (which keys are in use) and a **sequence number**. In DTLS 1.3 the sequence
  number is encrypted, much like QUIC's header protection.
- **A replay window.** Datagrams arrive out of order, so the receiver keeps a
  sliding window of recently seen sequence numbers and drops duplicates. The
  same mechanism protects IPsec, and is coded in Chapter 7.
- **Retransmission of the handshake.** Handshake messages are numbered and
  resent on a timer if no answer comes; large ones are fragmented.
- **Cookies.** As in QUIC's Retry, a DTLS server answers a first ClientHello
  with a cookie before doing any expensive work, to avoid amplification.

**WebRTC**, the system browsers use for video calls, runs DTLS between the two
browsers to agree on keys, then protects the media with SRTP using keys
exported from DTLS (DTLS-SRTP, RFC 5764). The certificates are self-signed,
generated per browser; their fingerprints are exchanged through the signaling
server, so the call is only as authenticated as that server is honest, unless
the users compare something out of band.

## 5.6 Mutual TLS between services

*Level: intermediate.*

Inside a data center, the calls between services (the checkout service asking
the payment service, the clinic app asking the health records store) once
traveled unencrypted on the theory that the internal network was trusted. The
Snowden documents of 2013 showed traffic being collected on links between the
data centers of large companies, and companies began encrypting internal
traffic, then authenticating it, under the name **zero trust**: no network
location is trusted; every call proves who is calling.

The standard tool is **mutual TLS** (mTLS): both sides present certificates.
In a **service mesh** (Istio, Linkerd and others), a small proxy next to each
service handles TLS for it; an internal CA issues each workload a certificate
that lives for hours, renewed automatically; and authorization policy is
written in terms of the identity in the certificate. The open standard
**SPIFFE** (Secure Production Identity Framework for Everyone) puts that
identity in a URI in the subjectAltName, such as
`spiffe://arcadia.mars/ns/health/sa/clinic-app`.

The TLS library verifies the chain; deciding *what that identity may do* is the
application's job, and the place where mistakes happen:

```python
# Mutual TLS between services: who may call whom is decided from the URI in the
# peer certificate's subjectAltName (a SPIFFE ID), after the chain is verified.
POLICY = {   # callee -> callers allowed
    "spiffe://arcadia.mars/ns/health/sa/records": {
        "spiffe://arcadia.mars/ns/health/sa/clinic-app",
        "spiffe://arcadia.mars/ns/health/sa/backup"},
    "spiffe://arcadia.mars/ns/doors/sa/controller": {
        "spiffe://arcadia.mars/ns/doors/sa/badge-reader"},
}

def authorize(callee, peer_cert):
    if not peer_cert["chain_ok"]:
        return "reject: certificate chain does not verify to the mesh CA"
    if peer_cert["expires_in_hours"] <= 0:
        return "reject: expired"
    ids = [n for n in peer_cert["san_uris"] if n.startswith("spiffe://arcadia.mars/")]
    if len(ids) != 1:
        return "reject: need exactly one SPIFFE ID in this trust domain"
    return "allow" if ids[0] in POLICY.get(callee, set()) else "reject: " + ids[0] + " not allowed"

records = "spiffe://arcadia.mars/ns/health/sa/records"
clinic = {"chain_ok": True, "expires_in_hours": 11,
          "san_uris": ["spiffe://arcadia.mars/ns/health/sa/clinic-app"]}
game = {"chain_ok": True, "expires_in_hours": 11,
        "san_uris": ["spiffe://arcadia.mars/ns/fun/sa/game-server"]}
forged = {"chain_ok": False, "expires_in_hours": 11,
          "san_uris": ["spiffe://arcadia.mars/ns/health/sa/clinic-app"]}
for name, cert in (("clinic app", clinic), ("game server", game), ("forged cert", forged)):
    print(f"{name:12s} -> records: {authorize(records, cert)}")
```

```text
clinic app   -> records: allow
game server  -> records: reject: spiffe://arcadia.mars/ns/fun/sa/game-server not allowed
forged cert  -> records: reject: certificate chain does not verify to the mesh CA
```

The game server's certificate is perfectly valid. It is refused because of
*who* it is, which is the point of authenticating every call. Three rules
come out of real deployments: verify the chain against the mesh's own CA only
(not the public web roots, or any web certificate would be accepted); accept
exactly one identity per certificate and match it exactly; and keep lifetimes
short, because revocation inside a mesh is as unreliable as on the web.

## 5.7 HTTPS in the browser: stripping and Strict Transport Security

*Level: intermediate.*

Most people type `bank.example`, not `https://bank.example`. The browser starts
with plain HTTP, and the site redirects it to HTTPS. In February 2009 Moxie
Marlinspike released **sslstrip**, a tool that attacks that first plain
request. A man in the middle answers it itself, talks HTTPS to the bank on the
victim's behalf, and rewrites every `https://` link in the pages it relays to
`http://`. The victim sees the real site, without a padlock, and almost no one
notices. No certificate is forged; TLS is simply never used between the victim
and the attacker.

The answer is **HTTP Strict Transport Security** (HSTS, RFC 6797, 2012). A
site sends the header `Strict-Transport-Security: max-age=31536000` over
HTTPS; the browser remembers it for that many seconds, and from then on turns
every `http://` request to that host into `https://` *before sending anything*,
and refuses to let the user click through certificate warnings. The weak point
is the first visit, before the browser has seen the header. So browsers ship a
**preload list**, compiled by Chrome's team and used by all major browsers,
of hosts that must always use HTTPS; a site can ask to be added. Entire
top-level domains, such as `.app` and `.dev`, are on it.

```python
# SSL stripping (2009) and HTTP Strict Transport Security (RFC 6797).
# A user types "bank.example"; the browser starts with plain http://.
import time

hsts_store = {}                                     # host -> expiry time
PRELOAD = {"bank.example"}                          # shipped inside the browser

def browser_fetch(url, attacker_on_path, use_preload):
    scheme, host = url.split("://")
    now = time.time()
    if scheme == "http" and (host in hsts_store and hsts_store[host] > now
                             or use_preload and host in PRELOAD):
        scheme = "https"                            # upgraded before any packet is sent
    if scheme == "http" and attacker_on_path:
        # sslstrip: the attacker answers the plain request itself, talks HTTPS
        # to the bank, and rewrites every https:// link in pages to http://
        return "plain HTTP to attacker; password visible"
    if scheme == "http":
        follow = browser_fetch("https://" + host, attacker_on_path, use_preload)
        return "redirected (this first request was exposed), then " + follow
    hsts_store[host] = now + 31536000               # Strict-Transport-Security: max-age=31536000
    return "HTTPS with certificate check"

print("first visit, no attacker: ", browser_fetch("http://bank.example", False, False))
print("later visit, attacker:    ", browser_fetch("http://bank.example", True, False))
hsts_store.clear()
print("first visit, attacker:    ", browser_fetch("http://bank.example", True, False))
print("first visit, preload list:", browser_fetch("http://bank.example", True, True))
```

```text
first visit, no attacker:  redirected (this first request was exposed), then HTTPS with certificate check
later visit, attacker:     HTTPS with certificate check
first visit, attacker:     plain HTTP to attacker; password visible
first visit, preload list: HTTPS with certificate check
```

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="SSL stripping: the victim talks plain HTTP to the attacker, who talks HTTPS to the bank; with HSTS the browser upgrades to HTTPS before sending anything" fill="currentColor" font-size="13.5">
<text x="80" y="22" text-anchor="middle" font-weight="bold">victim</text>
<text x="320" y="22" text-anchor="middle" font-weight="bold" class="acc-fill">sslstrip</text>
<text x="560" y="22" text-anchor="middle" font-weight="bold">bank</text>
<line x1="110" y1="56" x2="286" y2="56" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="290,56 278,51 278,61"/>
<text x="200" y="48" text-anchor="middle">http:// (plain)</text>
<line x1="350" y1="56" x2="526" y2="56" stroke="currentColor" stroke-width="2.5"/>
<polygon points="530,56 518,51 518,61"/>
<text x="440" y="48" text-anchor="middle">https:// (TLS)</text>
<text x="320" y="88" text-anchor="middle" font-size="12.5">rewrites every https:// link in the pages to http://</text>
<text x="320" y="108" text-anchor="middle" font-size="12.5" class="acc-fill">victim sees the real site, without a padlock</text>
<line x1="20" y1="132" x2="620" y2="132" stroke="currentColor" stroke-dasharray="2 4"/>
<text x="80" y="160" text-anchor="middle" font-weight="bold">browser with HSTS</text>
<text x="80" y="180" text-anchor="middle" font-size="12.5">(or preload list)</text>
<line x1="150" y1="200" x2="526" y2="200" stroke="currentColor" stroke-width="2.5"/>
<polygon points="530,200 518,195 518,205"/>
<text x="340" y="192" text-anchor="middle">https:// from the first byte; certificate errors fatal</text>
<text x="320" y="236" text-anchor="middle" font-size="12.5">the attacker can only block the connection, not downgrade it</text>
</svg>
<figcaption>Figure 5.3. SSL stripping attacks the plain first request; HSTS removes that request entirely.</figcaption>
</figure>

Browsers have since gone further: Chrome, Firefox and Safari try HTTPS first
for typed addresses, offer HTTPS-only modes, block "mixed content" (scripts
loaded over HTTP on an HTTPS page), and mark plain HTTP pages "Not secure".
The DNS HTTPS record (RFC 9460) can also tell a browser to use HTTPS, and
which protocols and ECH keys to use, before it connects.

### Pinning, and why it was given up

HSTS says "use TLS". It does not say *which certificate*: any trusted CA can
still issue for the site. **Pinning** fixes the acceptable keys. Chrome pinned
Google's own keys from 2011 (which caught DigiNotar,
[Chapter 2](02-Certificates-and-PKI.md)). HTTP Public Key Pinning (HPKP, RFC
7469, 2015) let any site send pins in a header. It went badly: a site that
lost its pinned keys, or pinned the wrong ones, locked out its own visitors for
as long as the pin lasted, and an attacker who briefly controlled a site could
set a pin to hold it hostage. Chrome deprecated HPKP in 2018 and removed it in
2019. Certificate Transparency ([Chapter 2](02-Certificates-and-PKI.md)) took
over the job of catching misissued certificates. Mobile apps still pin, to
their own servers' keys, because an app update can fix a bad pin; pinning
is also what makes some apps fail behind interception boxes, which is often
the intent.

!!! note "Life story: HSTS"
    **Born:** 2009 drafts after sslstrip; RFC 6797 in November 2012 (Jeff
    Hodges, Collin Jackson, Adam Barth) · **Purpose:** make a browser use only
    HTTPS for a site, and refuse to bypass certificate errors · **Helped:** the
    preload list in every major browser; whole top-level domains forced to
    HTTPS · **Status:** current; one of the most effective lines of defense on
    the web for its size

!!! note "Life story: HTTP Public Key Pinning"
    **Born:** RFC 7469 (2015), after Chrome's built-in pins found DigiNotar
    · **Purpose:** let a site tell browsers which keys may appear in its
    chain · **Helped:** proved the risk of self-inflicted lockout; showed that
    detection (CT) scales better than prevention by pinning · **Retired:**
    deprecated in Chrome 2018, removed 2019 · **Replaced by:** Certificate
    Transparency and Expect-CT (itself retired once CT became mandatory)

## 5.8 Configuring and testing a server

*Level: intermediate.*

Most security problems with TLS today are configuration, not cryptography: an
expired certificate, a missing intermediate, an old protocol left on, a
certificate for the wrong name. A sound configuration in 2026 follows the
IETF's best current practice (RFC 9325, 2022) and Mozilla's published
server guidelines, and comes down to a few lines:

- **Protocols:** TLS 1.3 and TLS 1.2 only. TLS 1.0 and 1.1 are deprecated
  (RFC 8996); SSL is long dead.
- **TLS 1.2 suites:** only ECDHE key exchange with AEAD ciphers (AES-GCM,
  ChaCha20-Poly1305). No RSA key transport, no CBC, no 3DES, no RC4. TLS 1.3's
  suites need no configuring.
- **Groups:** `X25519MLKEM768`, `x25519`, `secp256r1`. Offering the hybrid
  first gives post-quantum key exchange to every client that supports it.
- **Certificate:** an ECDSA P-256 key is smaller and faster than RSA-2048;
  many sites serve both to support very old clients. Renew automatically with
  ACME and alert on expiry.
- **Session tickets:** rotate the ticket-encryption key at least daily, or
  disable tickets, so that one stolen key does not unlock weeks of resumed
  sessions ([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.12).
- **HSTS** with a long `max-age` once HTTPS works everywhere on the site, then
  preload.

To check what a server actually does, run a handshake with `openssl
s_client`. Against a test server in a container (OpenSSL 3.0, a self-signed
P-256 certificate) it printed, trimmed:

```text
$ openssl s_client -connect localhost:8443 -servername www.arcadia.example \
    -CAfile srv.crt -verify_hostname www.arcadia.example </dev/null
Peer signature type: ECDSA
Server Temp Key: X25519, 253 bits
SSL handshake has read 809 bytes and written 401 bytes
Verification: OK
Verified peername: www.arcadia.example
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Verify return code: 0 (ok)
```

`Server Temp Key` is the ephemeral key share (X25519); `Peer signature type`
the CertificateVerify algorithm; `Verified peername` the host name check. Adding
`-tls1_2` to the same command made the same server negotiate
`ECDHE-ECDSA-AES256-GCM-SHA384`, a TLS 1.2 suite in the TLS 1.2 naming style,
which shows that the server still allows TLS 1.2 (correct for now). Public
tools test everything at once: Qualys SSL Labs' server test online and the
`testssl.sh` script offline list protocols, suites, chain problems and known
vulnerabilities. Python's `ssl` module, used in the
[HTTPS guide](../../topics/HTTPS.md), gives the same answers from code.

### Interception

Many companies, schools and antivirus products inspect TLS traffic. They do it
by installing their own root certificate on every managed device and
re-signing each site's certificate on the fly, a man in the middle with the
user's (or the employer's) consent. Chapter 2 cited the 2017 study that found
most such products weakened the connections they intercepted. Some financial
companies went further and asked the IETF in 2017 for a way to decrypt TLS 1.3
passively; the working group declined, since a deliberate decryption mechanism
in the protocol is exactly what forward secrecy exists to prevent. ETSI then
published its own variant, "Enterprise Transport Security" (2018-2019), which
uses a static Diffie-Hellman key on the server so a third party holding that key
can decrypt recorded traffic. It is TLS 1.3 on the wire but without forward
secrecy, and browsers do not treat it differently, which is why critics called
it a backdoor in all but name.

## 5.9 Mars: QUIC over light-minutes

*Level: intermediate.*

Can Arcadia City's browsers simply use QUIC to reach Earth? Not as QUIC is
tuned today. QUIC was built for round trips of milliseconds to a second:

- **Handshake timers.** A client retransmits its Initial if nothing comes back
  in about a second, then backs off. Over a 25-minute round trip it would
  retransmit many times before the first answer could possibly arrive.
- **Idle timeout.** Connections close after tens of seconds to minutes of
  silence. A connection to Earth would always look idle.
- **Congestion control** and acknowledgement delays assume that loss and
  delay are signs of a congested path, and slow down. On an interplanetary
  link, long delay is normal and loss comes from radio, not congestion.
- **Address validation and path challenges** each cost a round trip.

None of this touches the cryptography: TLS 1.3's keys and QUIC's packet
protection work at any distance. What changes are the timers and the
assumptions, which are parameters. Researchers have run QUIC with very long
timers over simulated Earth-Moon and Earth-Mars delays, and the IETF formed a
working group in 2024 (named TIPTOP) to study IP and QUIC across interplanetary
links. A likely design for the city is a split: QUIC and TLS as usual inside
the city and inside Earth's networks, with **gateways** on each side and the
long hop carried by the Delay-Tolerant Networking bundle protocol, whose
security works per message, not per session (Chapter 20).
The cryptographic question is then which end-to-end guarantees survive the
gateways, and the answer, as in any split design, is: only those that are made
end to end, above the transport, in the message itself.

## 5.10 In the real world

*Level: intermediate.*

- **QUIC's share.** QUIC carries most of the traffic between Chrome and
  Google's services and a large share of the traffic to other large providers;
  a few networks block UDP port 443 and browsers fall back to TCP.
- **Middleboxes adapted, or were bypassed.** Because QUIC encrypts its
  transport headers, some enterprise firewalls block it to force traffic back
  to TCP where they can inspect it. QUIC's designers accepted that trade.
- **Expired certificates.** Configuration still causes the most visible TLS
  outages: certificates expiring at large services (several well-known cases
  each year), missing intermediates breaking older clients, and the 2021
  expiry of Let's Encrypt's old cross-signing root breaking devices that
  could not find another path ([Chapter 2](02-Certificates-and-PKI.md)).
- **WebRTC encryption.** Every WebRTC call is encrypted with DTLS-SRTP; but
  calls through a server that mixes streams (most group calls) are decrypted
  at that server unless the service adds its own end-to-end layer, as some
  now do with MLS (Chapter 17).

## 5.11 Going deeper

*Level: expert.*

**QUIC's security analysis.** QUIC's composition of TLS 1.3's handshake with
its own packet protection was analyzed by Benjamin Dowling, Felix Günther and
others (2020) and by Tamarin and ProVerif models, which confirmed the key
exchange inherits TLS 1.3's guarantees, with caveats about the unauthenticated
early packets and the stateless reset and Retry mechanisms. Header protection
was analyzed separately as a "partially authenticated" layer.

**QUIC version 2 and greasing.** RFC 9369 (2023) defines QUIC version 2,
identical to version 1 except for constants (including the Initial salt), so
that version negotiation keeps being exercised and middleboxes cannot hard-code
version 1. RFC 9287 greases the "fixed bit" of the header for the same reason.

**MASQUE and proxying.** HTTP/3 can carry UDP and IP packets inside QUIC
streams to a proxy (RFC 9298, RFC 9484), which is how Apple's iCloud Private
Relay and similar services work: two hops, each seeing only part of who is
talking to whom.

**DTLS connection IDs.** RFC 9146 adds connection IDs to DTLS 1.2 (and DTLS 1.3
has them natively) for IoT devices behind NATs whose addresses change; the
same linkability questions as QUIC's arise.

**Formal verification of implementations.** Microsoft's Project Everest
produced verified implementations of TLS 1.3's record layer and parts of QUIC's
packet protection (in F\*, compiled to C). Cloudflare's, Google's and Amazon's
QUIC stacks are tested with interoperability runners and fuzzers rather than
proofs.

## Check yourself

??? question "1. Which parts of TLS 1.3 does QUIC use, and which does it replace?"

    It uses the handshake messages, the key schedule and the traffic secrets.
    It replaces the record layer: handshake messages travel in CRYPTO frames,
    and QUIC protects its own packets with keys derived from the secrets.

??? question "2. QUIC Initial packets are encrypted with keys anyone can compute. What is the point?"

    To stop middleboxes from parsing and depending on handshake contents
    (preventing ossification), and to make version changes effective by
    changing the salt. It provides no confidentiality against an eavesdropper.

??? question "3. Why do QUIC clients pad their first Initial packet to at least 1,200 bytes?"

    A server may send at most three times as many bytes as it has received
    from an unvalidated address. A large first packet gives the server room to
    send its handshake (including certificates) without exceeding that limit,
    while still preventing large amplification.

??? question "4. What does header protection hide, and why does it matter for connection migration?"

    The packet number and some flag bits. If packet numbers were visible, an
    observer could link a connection before and after the client changes
    networks, even with a new connection ID.

??? question "5. How does a QUIC endpoint check that a peer really is at a new address?"

    Path validation: it sends a PATH_CHALLENGE with 8 random bytes to the new
    address and waits for a PATH_RESPONSE containing them.

??? question "6. Why does DTLS need explicit sequence numbers when TLS does not?"

    Datagrams can be lost or reordered, so the receiver cannot count records
    implicitly; each record carries its epoch and sequence number, and a replay
    window detects duplicates.

??? question "7. In the service-mesh code, the game server's certificate verifies. Why is it refused?"

    Because the policy for the records service does not list the game
    server's SPIFFE ID. Authentication says who the caller is; authorization
    decides whether that identity may call this service.

??? question "8. HSTS protects later visits. How is the first visit protected?"

    By the browser's built-in preload list (and, increasingly, by browsers
    trying HTTPS first for typed addresses and by DNS HTTPS records).

??? question "9. Why was HTTP Public Key Pinning removed, while Chrome's built-in pins for Google were not a problem?"

    HPKP let any site set pins, and mistakes (lost keys, wrong pins) or an
    attacker who briefly controlled the site could lock users out for months.
    Built-in pins are maintained by the browser vendor and fixed with an
    update.

??? question "10. Name two QUIC mechanisms that would need retuning for a 25-minute round trip, and say why the cryptography itself needs no change."

    The handshake retransmission timer and the idle timeout (also congestion
    control and acknowledgement delays). The keys, AEAD and transcript binding
    do not depend on time; only the transport's assumptions about delay do.

## What you learned

- QUIC runs TLS 1.3's handshake inside a UDP transport, protects packets and
  most of the header itself, and encrypts even its first packets to resist
  ossification.
- Address validation (the 3x limit, Retry tokens) and path challenges defend
  UDP against amplification and hijacking; connection IDs let connections
  migrate without being linked.
- DTLS 1.3 carries TLS over datagrams with explicit sequence numbers, a replay
  window and cookies; WebRTC uses it to key SRTP.
- Mutual TLS gives every service call an identity; authorization on that
  identity is the application's job.
- HSTS and its preload list defeat SSL stripping; pinning by headers was
  abandoned in favor of Certificate Transparency.
- Good configuration (TLS 1.2 and 1.3 only, AEAD, hybrid groups, automated
  certificates, rotated ticket keys) prevents most real problems.

**Next:** Chapter 6, the other great secure channel, which trusts
keys without any certificate authority at all.

## Further reading

- RFC 9000 (QUIC transport), RFC 9001 (using TLS to secure QUIC), RFC 9002
  (loss detection and congestion control), all May 2021; RFC 9114 (HTTP/3,
  2022); RFC 9369 (QUIC version 2, 2023).
- RFC 9147, DTLS 1.3 (2022); RFC 5764, DTLS-SRTP (2010).
- RFC 6797, HTTP Strict Transport Security (2012); RFC 7469, HPKP (2015); RFC
  9460, SVCB and HTTPS DNS records (2023).
- RFC 9325, *Recommendations for Secure Use of TLS and DTLS* (BCP 195, 2022);
  RFC 8996 (deprecating TLS 1.0 and 1.1).
- Adam Langley and others, "The QUIC transport protocol: design and
  Internet-scale deployment" (SIGCOMM 2017).
- Moxie Marlinspike, "New tricks for defeating SSL in practice" (Black Hat DC,
  2009): sslstrip.
- The SPIFFE specification (spiffe.io).
- Mozilla, *Server Side TLS* guidelines; Qualys SSL Labs, *SSL and TLS
  Deployment Best Practices*.
- Zakir Durumeric and others, "The security impact of HTTPS interception"
  (NDSS 2017).
- ETSI TS 103 523-3, *Enterprise Transport Security* (2019), and the IETF
  discussion that declined passive decryption in TLS 1.3 (2017).
- Site pages: the [HTTPS guide](../../topics/HTTPS.md) (commands for
  certificates and testing), [openssl recipes](../../tools/openssl.md).
