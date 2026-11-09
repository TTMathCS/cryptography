# 5. TLS in Practice: QUIC, DTLS and the Web

*The TLS of Chapters 3 and 4 runs over TCP, a reliable byte stream. Much of
today's encrypted traffic does not. Video calls, games and half the traffic of
the largest web sites run over UDP, in QUIC and DTLS, which reuse the TLS 1.3
handshake but protect packets that may be lost, duplicated or reordered. This
chapter follows TLS into those protocols, then into the places it is
configured and enforced: between the services of one company with mutual TLS,
in the browser with Strict Transport Security, and on a server you set up
yourself. You will derive QUIC's first packet keys and check them against RFC
9001, protect a whole QUIC packet with ChaCha20-Poly1305 and match the RFC's
21 bytes, stop SSL stripping with a preload list, authorize calls in a service
mesh and rotate its CA without an outage, compute certificate pins, build
0-RTT's anti-replay check, and price a handshake in minutes for a city on
Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - why QUIC moved TLS's job into the transport, and how it protects
      packets, headers and connection IDs;
    - QUIC's key schedule, header protection by hand, key updates, address
      validation and connection migration;
    - how QUIC recovers lost packets without ever reusing a nonce;
    - DTLS 1.3 for UDP applications such as WebRTC and IoT;
    - mutual TLS between services, SPIFFE identities, short-lived
      certificates and how a mesh rotates its CA;
    - SSL stripping, HSTS and preloading, and the rise and fall of
      certificate pinning;
    - how to configure and test a TLS server in 2026: groups, certificates,
      revocation after OCSP, session tickets and their forward-secrecy cost;
    - 0-RTT in QUIC and the anti-replay measures a server cluster needs;
    - what changes when a link takes minutes, not milliseconds.

    **You need:** [Chapter 3](03-TLS-1.3-Message-by-Message.md) (the handshake
    and key schedule) and [Chapter 2](02-Certificates-and-PKI.md)
    (certificates). Some idea of TCP and UDP helps; the
    [networks site](https://networks.akadian.ca/) explains them.

    **Levels:** §5.1 to §5.2 are for beginners, §5.3 to §5.11 are intermediate,
    §5.12 is expert.

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

### The QUIC key schedule

TLS 1.3's key schedule ([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.4) is
a ladder: an early secret from the pre-shared key, a handshake secret after the
key exchange, a master secret for the application traffic secrets. QUIC uses
these rungs and adds one of its own:

- **Initial** secrets come from the client's Destination Connection ID and a
  salt fixed per QUIC version, with the labels `client in` and `server in`.
  Everyone can compute them (§5.3).
- **0-RTT** keys come from TLS's `client_early_traffic_secret`, which depends
  only on the pre-shared key. Only the client sends with them.
- **Handshake** keys come from the handshake traffic secrets, after the
  (EC)DHE or hybrid exchange, and protect the certificate and Finished
  messages.
- **1-RTT** keys come from the application traffic secrets.

From each secret QUIC derives `quic key` (the AEAD key), `quic iv` (the nonce
base) and `quic hp` (the header-protection key). A fourth label, `quic ku`,
turns the current 1-RTT secret into the next, for key updates (§5.3). The `hp`
key is never updated: a receiver must remove the mask before it can even read
which keys a packet uses.

Keys are discarded in a fixed order. A client drops its Initial keys when it
first sends a Handshake packet, a server when it first processes one; Handshake
keys go when the handshake is confirmed, which for the client means receiving
HANDSHAKE_DONE. Since Initial keys are public, any packet still accepted under
them is one anyone could have forged.

<figure class="mars-fig">
<svg viewBox="0 0 640 370" width="640" role="img" aria-label="The QUIC key schedule: Initial secrets from the connection ID and a version salt; 0-RTT, Handshake and 1-RTT secrets from TLS 1.3's key schedule; each secret yields quic key, quic iv and quic hp; quic ku derives the next 1-RTT secret" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="currentColor" fill-opacity=".06">
<rect x="20" y="36" width="150" height="44" rx="4"/><rect x="380" y="36" width="240" height="44" rx="4"/>
<rect x="20" y="124" width="150" height="44" rx="4"/><rect x="380" y="124" width="240" height="44" rx="4" fill-opacity=".18"/>
<rect x="20" y="192" width="150" height="44" rx="4"/><rect x="380" y="192" width="240" height="44" rx="4"/>
<rect x="380" y="260" width="110" height="44" rx="4"/><rect x="510" y="260" width="110" height="44" rx="4"/>
</g>
<g stroke="currentColor" fill="none">
<rect x="200" y="36" width="150" height="44" rx="4"/><rect x="200" y="124" width="150" height="44" rx="4"/>
<rect x="200" y="192" width="150" height="44" rx="4"/><rect x="200" y="260" width="150" height="44" rx="4"/>
<path d="M170 58h24M350 58h24M170 146h24M350 146h24M170 214h24M350 214h24M350 282h24M490 282h14M275 168v18M275 236v18"/>
<path d="M20 96h600" stroke-dasharray="2 4"/>
</g>
<path d="M200 58l-8-4v8zM380 58l-8-4v8zM200 146l-8-4v8zM380 146l-8-4v8zM200 214l-8-4v8zM380 214l-8-4v8zM380 282l-8-4v8zM510 282l-8-4v8zM275 192l-4-8h8zM275 260l-4-8h8z"/>
<g text-anchor="middle">
<text x="95" y="22" font-weight="bold">input</text><text x="275" y="22" font-weight="bold">secret</text><text x="500" y="22" font-weight="bold">QUIC packet keys</text>
<text x="95" y="54">client's DCID</text><text x="275" y="54">initial_secret</text><text x="500" y="54">Initial keys</text>
<text x="95" y="142">PSK from a ticket</text><text x="275" y="142">early secret</text><text x="500" y="142">0-RTT keys (client only)</text>
<text x="95" y="210">(EC)DHE or hybrid</text><text x="275" y="210">handshake secret</text><text x="500" y="210">Handshake keys</text>
<text x="275" y="278">master secret</text><text x="435" y="278">1-RTT keys</text><text x="565" y="278">1-RTT keys</text>
<g font-size="11.5">
<text x="95" y="71">+ salt of QUIC version</text><text x="275" y="71">client in / server in</text><text x="500" y="71" fill-opacity=".7">anyone can compute them</text>
<text x="95" y="159">(resumption only)</text><text x="275" y="159">c e traffic</text><text x="500" y="159">no forward secrecy; replayable</text>
<text x="95" y="227">X25519MLKEM768 secret</text><text x="275" y="227">c hs / s hs traffic</text><text x="500" y="227">certificate, CertificateVerify, Finished</text>
<text x="275" y="295">c ap / s ap traffic_0</text><text x="435" y="295">key phase 0</text><text x="565" y="295">key phase 1</text>
<text x="500" y="322">"quic ku": next secret, same hp key</text>
</g>
<text x="320" y="352" font-size="12.5">each secret gives quic key (AEAD key), quic iv (nonce base), quic hp (header mask key)</text>
</g>
<text x="20" y="112" font-size="11.5" fill-opacity=".7">from TLS 1.3's key schedule (Chapter 3, §3.4)</text>
</svg>
<figcaption>Figure 5.2. The QUIC key schedule. Four kinds of packet keys, one per encryption level; only the Initial level is QUIC's own invention, and only it is computable by anyone.</figcaption>
</figure>

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
<figcaption>Figure 5.3. QUIC packet protection. The payload is sealed by the AEAD; then a sample of that ciphertext, encrypted under the header-protection key, masks the packet number and flags.</figcaption>
</figure>

### Header protection by hand

RFC 9001's Appendix A.2 follows one client Initial packet. Before protection,
its 22-byte header splits into these fields:

| Bytes | Hex | Field |
| --- | --- | --- |
| 0 | `c3` | flags |
| 1 to 4 | `00000001` | version (QUIC version 1) |
| 5 | `08` | Destination Connection ID length |
| 6 to 13 | `8394c8f03e515708` | Destination Connection ID |
| 14 | `00` | Source Connection ID length (empty) |
| 15 | `00` | token length (no token) |
| 16 to 17 | `449e` | length of the rest of the packet |
| 18 to 21 | `00000002` | packet number 2 |

The first byte, `0xc3`, is `1100 0011` in binary: a long header (1), the fixed
bit (1), packet type Initial (00), two reserved bits (00), and the packet
number length minus one (11, so the packet number takes 4 bytes). The length
field `0x449e` is a variable-length integer whose top two bits, `01`, say it
takes two bytes; the value is `0x049e` = 1,182 bytes, which is the 4-byte packet
number, 1,162 bytes of frames and the 16-byte AEAD tag.

The packet number starts at byte 18. The sample always starts four bytes after
that, at byte 22, whatever the packet number's real length, because the
receiver cannot learn the length before removing the mask. Here the number
takes four bytes, so the sample is the first 16 bytes of ciphertext:

$$\text{sample} = \texttt{d1b1c98dd7689fb8ec11d242b123dc9b}.$$

Encrypting the sample with AES-128 under the client's `hp` key
(`9f50449e04a0e810283a1e9933adedd2`, derived by the program above) gives a block
whose first five bytes are the mask, `43 7b 9a ec 36`. Now the two XORs, which
you can do on paper:

<div class="mars-steps" markdown>

1. **The first byte.** In a long header only the low four bits are masked, so
   use `0x43 AND 0x0f = 0x03`. Then `0xc3 XOR 0x03 = 0xc0`, or in binary
   `1100 0011 XOR 0000 0011 = 1100 0000`. The packet type stays readable; the
   reserved bits and the packet number length are hidden.
2. **The packet number.** `00 00 00 02 XOR 7b 9a ec 36 = 7b 9a ec 34`. Only
   the last byte had any bits set, and `0x02 XOR 0x36 = 0x34`.
3. **The result.** The protected header is
   `c000000001088394c8f03e5157080000449e7b9aec34`, exactly the value in the
   RFC.

</div>

The receiver finds the sample at the fixed offset, computes the same mask,
unmasks the first byte, reads the packet number length, and only then unmasks
that many bytes. In a short header the low *five* bits are masked, which also
hides the key phase bit (below). Header protection needs no authentication of
its own: the unprotected header is the AEAD's associated data, so a flipped
masked bit yields a wrong nonce or associated data, and the tag fails.

### Code it: one short-header packet, byte for byte

Appendix A.5 of RFC 9001 protects the smallest possible QUIC packet: a short
header, an empty connection ID, a 3-byte packet number and a single PING frame
(the byte `0x01`), with ChaCha20-Poly1305. ChaCha20 is short enough to write in
plain Python, so this time nothing is taken on trust: the program below derives
the keys, seals the payload with the AEAD of RFC 8439, computes the
header-protection mask and assembles the packet.

```python
# Protect one QUIC short-header packet (RFC 9001 Appendix A.5): derive the keys,
# seal a PING frame with ChaCha20-Poly1305, then apply header protection.
import hashlib, hmac, struct

def hkdf_expand_label(secret, label, length):
    full = b"tls13 " + label.encode()
    info = length.to_bytes(2, "big") + bytes([len(full)]) + full + b"\x00"
    return hmac.new(secret, info + b"\x01", hashlib.sha256).digest()[:length]

def chacha20_block(key, counter, nonce):
    def rotl(v, n):
        return ((v << n) & 0xffffffff) | (v >> (32 - n))
    def qr(s, a, b, c, d):
        s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 16)
        s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 12)
        s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 8)
        s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 7)
    init = (list(struct.unpack("<4I", b"expand 32-byte k")) + list(struct.unpack("<8I", key))
            + [counter] + list(struct.unpack("<3I", nonce)))
    s = init[:]
    for _ in range(10):
        qr(s, 0, 4, 8, 12); qr(s, 1, 5, 9, 13); qr(s, 2, 6, 10, 14); qr(s, 3, 7, 11, 15)
        qr(s, 0, 5, 10, 15); qr(s, 1, 6, 11, 12); qr(s, 2, 7, 8, 13); qr(s, 3, 4, 9, 14)
    return struct.pack("<16I", *[(x + y) & 0xffffffff for x, y in zip(s, init)])

def chacha20(key, counter, nonce, data):
    out = bytearray()
    for i in range(0, len(data), 64):
        block = chacha20_block(key, counter + i // 64, nonce)
        out += bytes(a ^ b for a, b in zip(data[i:i + 64], block))
    return bytes(out)

def poly1305(key, msg):
    r = int.from_bytes(key[:16], "little") & 0x0ffffffc0ffffffc0ffffffc0fffffff
    s, acc, p = int.from_bytes(key[16:], "little"), 0, (1 << 130) - 5
    for i in range(0, len(msg), 16):
        acc = (acc + int.from_bytes(msg[i:i + 16] + b"\x01", "little")) * r % p
    return ((acc + s) % (1 << 128)).to_bytes(16, "little")

def seal(key, nonce, aad, plaintext):              # AEAD_CHACHA20_POLY1305, RFC 8439
    otk = chacha20_block(key, 0, nonce)[:32]
    ct = chacha20(key, 1, nonce, plaintext)
    pad = lambda b: b + bytes(-len(b) % 16)
    mac = pad(aad) + pad(ct) + struct.pack("<QQ", len(aad), len(ct))
    return ct + poly1305(otk, mac)

secret = bytes.fromhex("9ac312a7f877468ebe69422748ad00a15443f18203a07d6060f688f30f21632b")
key = hkdf_expand_label(secret, "quic key", 32)
iv = hkdf_expand_label(secret, "quic iv", 12)
hp = hkdf_expand_label(secret, "quic hp", 32)
ku = hkdf_expand_label(secret, "quic ku", 32)     # the secret for the next key phase

pn = 654360564
header = bytes([0x42]) + (pn & 0xffffff).to_bytes(3, "big")   # short header, 3-byte packet number
nonce = bytes(a ^ b for a, b in zip(iv, pn.to_bytes(12, "big")))
payload = seal(key, nonce, header, b"\x01")                    # one PING frame

sample = payload[1:17]                 # sampling starts 4 bytes after the packet number begins
mask = chacha20(hp, int.from_bytes(sample[:4], "little"), sample[4:], bytes(5))
protected = bytes([header[0] ^ (mask[0] & 0x1f)]) + bytes(a ^ b for a, b in zip(header[1:], mask[1:]))
packet = protected + payload

print("iv     ", iv.hex())
print("ku     ", ku.hex())
print("nonce  ", nonce.hex())
print("sealed ", payload.hex())
print("mask   ", mask.hex())
print("packet ", packet.hex())
print("matches RFC 9001 A.5:", packet.hex() == "4cfe4189655e5cd55c41f69080575d7999c25a5bfb")
```

It prints:

```text
iv      e0459b3474bdd0e44a41c144
ku      1223504755036d556342ee9361d253421a826c9ecdf3c7148684b36b714881f9
nonce   e0459b3474bdd0e46d417eb0
sealed  655e5cd55c41f69080575d7999c25a5bfb
mask    aefefe7d03
packet  4cfe4189655e5cd55c41f69080575d7999c25a5bfb
matches RFC 9001 A.5: True
```

Every line agrees with the RFC. Check three details by hand. The
packet number 654,360,564 is `0x2700bff4`; only its low three bytes, `00bff4`,
go on the wire, and the nonce is the IV with the *whole* number XORed into its
last bytes: `4a41c144 XOR 2700bff4 = 6d417eb0`. The sealed payload is 17 bytes,
one byte of ciphertext and a 16-byte tag; since the sample must start four
bytes after the packet number begins and the number here is only three bytes,
the first ciphertext byte (`65`) is skipped and the sample is the tag. And with
ChaCha20 the mask is the encryption of five zero bytes, with the block counter
taken from the first four sample bytes and the nonce from the other twelve:
`0x42 XOR (0xae AND 0x1f) = 0x4c`, and `00bff4 XOR fefe7d = fe4189`. The 21 bytes are
the smallest possible QUIC packet.

### Key updates without a message

TLS over TCP changes keys with a KeyUpdate message
([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.6). QUIC has none. The short
header carries a **key phase bit**, hidden by header protection. To update, a
sender derives

$$\text{secret}_{n+1} = \text{HKDF-Expand-Label}(\text{secret}_n, \texttt{"quic ku"}, \texttt{""}, 32),$$

takes a new `quic key` and `quic iv` from it, flips the bit and sends. The
receiver sees the other phase, derives the same keys, and if the packet
decrypts, switches too. The `ku` line above is that next secret for the A.5
connection. An endpoint may not start another update until a packet in the
current phase has been acknowledged, so there is at most one update per round
trip; and a receiver should compute the next keys in advance, or the delay of
deriving them would show an observer which packets carried an update.

Updates exist because an AEAD key can only seal so much. RFC 9001 §6.6 sets a
**confidentiality limit** of $2^{23}$ packets per key for AES-GCM and an
**integrity limit** of $2^{52}$ forged packets (for ChaCha20-Poly1305, $2^{36}$
forgeries, and no practical confidentiality limit). A 1 Gbit/s transfer in
1,250-byte packets sends 100,000 packets a second, so it reaches
$2^{23} = 8{,}388{,}608$ packets after about 84 seconds and must update keys
every minute and a half. Section 5.10 shows why this rule matters on a link to
Mars.

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

### Lost packets and the keys

TCP resends lost *bytes* under the same sequence numbers. QUIC never sends the
same packet twice: its loss recovery (RFC 9002) puts the *frames* of a lost
packet into a new packet with a new, higher number. That decision keeps packet
protection safe. The nonce is the IV XORed with the packet number, so a reused
number would seal two plaintexts under one nonce, which for AES-GCM and
ChaCha20-Poly1305 leaks their XOR and enables forged tags. Packet numbers only
go up, and a connection closes rather than pass $2^{62} - 1$, so a
retransmission is never a nonce reuse. Each space (Initial, Handshake,
Application) has its own numbers and acknowledgements, since a packet sealed
with Handshake keys can only be acknowledged under Handshake keys.

Losses show up in ACK frames, which list ranges of received packet numbers.
RFC 9002 declares a packet lost if a packet sent at least **3
packets** later has been acknowledged, or if it was sent more than **9/8 of
the round-trip time** before one that has been acknowledged. If nothing at all
comes back, a **probe timeout** fires after

$$\text{PTO} = \text{smoothed\_rtt} + \max(4 \cdot \text{rttvar},\ 1\,\text{ms}) + \text{max\_ack\_delay},$$

and doubles on each expiry. Before any RTT has been measured, the estimate
starts at 333 ms with a variation of half that, so the very first Initial is
probed after $333 + 4 \times 166.5 = 999$ ms. Keep that number in mind for
§5.10.

**A worked example: decoding a short packet number.** To save bytes, a sender
puts only the low one to four bytes of the packet number on the wire, enough to
be unambiguous within the window of packets in flight. The receiver
reconstructs the full number as the one closest to the next number it expects.
RFC 9000's example: the highest packet received so far is `0xa82f30ea`, and a
new packet carries the 16-bit value `0x9b32`.

1. The next expected number is `0xa82f30ea + 1 = 0xa82f30eb`.
2. A 16-bit field covers a window of `0x10000`; half of it is `0x8000`.
3. Put the received bits into the expected number's high part:
   `(0xa82f30eb AND NOT 0xffff) OR 0x9b32 = 0xa82f9b32`.
4. Is that candidate more than half a window from the expected number?
   `0xa82f9b32 - 0xa82f30eb = 0x6a47`, which is less than `0x8000`, so no
   correction is needed. The packet number is `0xa82f9b32`.

Had the candidate been more than `0x8000` above or below, the receiver would
subtract or add `0x10000`. The number must come out exact, because it is part
of the nonce; a wrong guess is an AEAD failure. So a sender must encode enough
bytes to cover twice the range of its unacknowledged packets.

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
  same mechanism protects IPsec, and is coded in [Chapter 7](07-IPsec-and-IKEv2.md).
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

### A worked mesh: SPIFFE in Arcadia

Follow one call through a mesh built the SPIFFE way. The city's services form
one **trust domain**, `arcadia.mars`. A workload's **SPIFFE ID** is the scheme
`spiffe://`, the trust domain and a path; the form is kept strict (lowercase
trust domain, no port, user, query or fragment) so that IDs compare as plain
strings. On Kubernetes the usual path is `/ns/<namespace>/sa/<service
account>`.

The identity travels in an **X.509-SVID** (SPIFFE Verifiable Identity
Document), an ordinary certificate with rules on top: the SPIFFE ID must be the
*only* URI in the subjectAltName, and a leaf must say it is not a CA, must
allow `digitalSignature`, and must not allow signing certificates or
revocation lists. The trust domain's CA certificates form its **trust
bundle**, and peers are verified against that bundle and nothing else. Two
trust domains, say the city's and an Earth company's, **federate** by
exchanging bundles.

In **SPIRE**, the reference implementation, a central server holds the signing
key and an agent runs on every machine. Issuance rests on two kinds of
evidence:

<div class="mars-steps" markdown>

1. **Node attestation.** A starting agent proves to the server which machine
   it is on: with a TPM, a cloud provider's signed instance document, a
   Kubernetes token, or a one-time join token.
2. **Workload attestation.** When a process asks for its identity over the
   Workload API (a local Unix socket), the agent asks the kernel who is
   calling: process, user, container image, pod and service account. If they
   match a registration entry, the agent hands over an SVID, its private key
   and the trust bundle.
3. **Streaming renewals.** The Workload API pushes a new SVID before the old
   one expires, and a new bundle whenever the CAs change. Nothing restarts.

</div>

No secret sits in a configuration file: a process proves what it is by being
it. SPIRE's default lifetime for an X.509-SVID is one hour; Istio's built-in
CA issues 24-hour workload certificates by default. To revoke a compromised
workload, delete its registration entry and wait for its certificate to
expire: short lifetimes take the place of revocation, as they increasingly do
on the web (§5.8).

Now the call. The clinic app's proxy opens TLS 1.3 to the records service's
proxy. The server's flight carries a CertificateRequest along with its own
SVID; the client checks that SVID against the `arcadia.mars` bundle and
answers with its own SVID and a CertificateVerify
([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.5). Neither side checks a
host name; the name that matters is the SPIFFE ID, and the authorization code
above runs on it.

<figure class="mars-fig">
<svg viewBox="0 0 640 350" width="640" role="img" aria-label="A SPIFFE service mesh: the SPIRE server attests agents on two nodes, the agents give workloads their SVIDs over a local socket, the clinic app's proxy and the records service's proxy talk mutual TLS, and a game server with a valid SVID is refused by policy" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="currentColor" fill-opacity=".06">
<rect x="190" y="14" width="260" height="50" rx="5" fill-opacity=".12"/>
<rect x="40" y="132" width="220" height="32" rx="4"/><rect x="380" y="132" width="220" height="32" rx="4"/>
<rect x="160" y="190" width="100" height="64" rx="4"/><rect x="380" y="190" width="100" height="64" rx="4"/>
</g>
<g stroke="currentColor" fill="none">
<rect x="20" y="108" width="260" height="172" rx="6"/><rect x="360" y="108" width="260" height="172" rx="6"/>
<rect x="40" y="190" width="110" height="64" rx="4"/><rect x="490" y="190" width="110" height="64" rx="4"/>
<path d="M250 64L160 128M390 64L480 128M210 164v22M430 164v22M150 222h10M480 222h10"/>
<path d="M260 222h116" stroke-width="3"/>
<g stroke-dasharray="5 4"><rect x="180" y="296" width="200" height="34" rx="4"/><path d="M380 310L430 258"/></g>
</g>
<path d="M157 131l6-10 5 7zM483 131l-11-3 5-7zM210 190l-4-8h8zM430 190l-4-8h8zM380 222l-10-5v10zM432 255l-1 12-7-5z"/>
<g text-anchor="middle">
<text x="320" y="35" font-weight="bold">SPIRE server (mesh CA)</text>
<text x="150" y="153">SPIRE agent</text><text x="490" y="153">SPIRE agent</text>
<text x="95" y="214">clinic-app</text><text x="210" y="214">proxy</text><text x="430" y="214">proxy</text><text x="545" y="214">records</text>
<text x="320" y="210" font-size="12">mutual TLS 1.3</text><text x="280" y="318">game-server, ns/fun</text>
<g font-size="11.5">
<text x="320" y="54">trust domain arcadia.mars; trust bundle</text><text x="320" y="100">attest nodes; issue SVIDs</text>
<text x="95" y="232">ns/health</text><text x="210" y="232">SVID, 1 h</text><text x="430" y="232">SVID, 1 h</text><text x="545" y="232">ns/health</text>
<text x="320" y="242">both send SVIDs</text><text x="110" y="176">Workload API (Unix socket)</text>
<text x="500" y="306">valid SVID, same CA,</text><text x="500" y="322">refused by records' policy</text>
</g>
</g>
<g font-size="11.5" fill-opacity=".7"><text x="30" y="273">node 1 (attested by TPM)</text><text x="610" y="273" text-anchor="end">node 2 (attested by TPM)</text></g>
</svg>
<figcaption>Figure 5.4. A SPIFFE mesh. Identity comes from attestation (of the node, then of the process), travels in an X.509-SVID, and is checked twice: once by the chain against the trust bundle, once by policy against the exact SPIFFE ID.</figcaption>
</figure>

**Fix it: the prefix bug.** A tempting shortcut is to authorize by prefix:
"anything whose ID starts with `spiffe://arcadia.mars/ns/health` may read
records". It also admits `spiffe://arcadia.mars/ns/healthcheck-bot/sa/probe`,
a workload in a different namespace that someone happened to name with the
same first letters. Compare whole IDs, or whole path segments, never strings
that merely start the same way. The same mistake in host name matching
(`bank.example.attacker.example`) has fooled TLS clients for decades.

### Code it: rotating the mesh CA

Short-lived leaf certificates rotate themselves. The CA that signs them must
rotate too, and that is where meshes have outages: a peer that receives a
certificate from a CA it does not yet trust refuses the handshake. The program
below models thirty workloads, each renewing its one-hour SVID every thirty
minutes on its own schedule, while the CA changes from `CA-old` to `CA-new`.
Three orders of operations are tried: when every peer starts trusting the new
CA (`add_new`), when issuance switches to it (`switch`), and when the old CA is
removed from the bundle (`drop_old`).

```python
# Rotating a mesh CA without an outage. Thirty workloads hold certificates
# (X.509-SVIDs) that live 60 minutes and are renewed at half-life, each on its
# own schedule; a peer accepts a certificate only if its issuing CA is in the
# peer's trust bundle. Times in minutes.
TTL = 60

def bundle_at(t, add_new, drop_old):         # what every peer trusts at time t
    return ({"CA-old"} if t < drop_old else set()) | ({"CA-new"} if t >= add_new else set())

def rotate(add_new, switch, drop_old):
    failures = 0                             # workload-minutes with an untrusted SVID
    for offset in range(30):
        for t in range(offset, 600):
            issued = t - (t - offset) % (TTL // 2)
            ca = "CA-old" if issued < switch else "CA-new"
            failures += ca not in bundle_at(t, add_new, drop_old)
    return f"{failures} workload-minutes of failed handshakes"

print("switch issuer before peers trust it:", rotate(add_new=200, switch=120, drop_old=500))
print("drop old CA while its SVIDs live:   ", rotate(add_new=60, switch=120, drop_old=130))
print("add, wait, switch, wait a TTL, drop:", rotate(add_new=60, switch=120, drop_old=120 + TTL))
```

It prints:

```text
switch issuer before peers trust it: 1965 workload-minutes of failed handshakes
drop old CA while its SVIDs live:    190 workload-minutes of failed handshakes
add, wait, switch, wait a TTL, drop: 0 workload-minutes of failed handshakes
```

Check the first number by hand. Issuance switches at minute 120 but peers
trust the new CA only from minute 200. A workload whose first renewal after 120
falls at minute $r$ (120 to 149) is refused from $r$ to 200, so the thirty
lose $80 + 79 + \dots + 51 = 30 \times (80 + 51)/2 = 1{,}965$ minutes. The
safe order is the last line: publish the new CA in every bundle and wait until
all peers have it; switch issuance; keep the old CA for at least one full
certificate lifetime; then drop it. SPIRE prepares its next signing key and
publishes it in the bundle before signing with it, and web root programs
replace roots by the same three steps, with months for minutes
([Chapter 2](02-Certificates-and-PKI.md)).

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
<figcaption>Figure 5.5. SSL stripping attacks the plain first request; HSTS removes that request entirely.</figcaption>
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
set a pin to hold it hostage. Browsers removed it within four years, and
Certificate Transparency ([Chapter 2](02-Certificates-and-PKI.md)) took over
the job of catching misissued certificates. It is the clearest case in this
book of a security mechanism that worked as designed and was still withdrawn.

**What a pin is.** A pin is not a certificate. It is the SHA-256 hash of a
certificate's **SubjectPublicKeyInfo** (SPKI): the algorithm identifier and the
public key, DER-encoded. Hashing the key rather than the certificate means a
site can renew its certificate with the same key and keep its pins. A chain
passes if *any* key in it, leaf, intermediate or root, matches *any* pin. The
HPKP header looked like this:

```text
Public-Key-Pins: pin-sha256="<base64 hash of a current key>";
                 pin-sha256="<base64 hash of a backup key>";
                 max-age=5184000; includeSubDomains; report-uri="https://..."
```

RFC 7469 required at least one **backup pin**, a key not in the current chain,
so that a site losing its key had somewhere to go; and it suggested that
browsers cap `max-age` at 60 days (5,184,000 seconds). The program computes
pins the way a browser did, and the way Android and iOS still do:

```python
# An HPKP-style pin is the base64 SHA-256 of the SubjectPublicKeyInfo (SPKI), the
# same value Android's <pin digest="SHA-256"> and iOS's NSPinnedDomains use.
import base64, hashlib

def pin(spki_der):
    return base64.b64encode(hashlib.sha256(spki_der).digest()).decode()

# The example Ed25519 public key of RFC 8410, as DER: header + 32-byte key.
spki = base64.b64decode("MCowBQYDK2VwAyEAGb9ECWmEzf6FQbrBZ9w7lshQhqowtrbLDFw4rXAxZuE=")
print("SPKI   ", spki.hex())
print("pin    ", pin(spki))

backup = bytes.fromhex("302a300506032b6570032100") + hashlib.sha256(b"backup key").digest()
pins = {pin(spki), pin(backup)}
print("backup ", pin(backup))

def chain_ok(chain_spkis):              # accept if ANY key in the verified chain is pinned
    return any(pin(k) in pins for k in chain_spkis)

new_key = bytes.fromhex("302a300506032b6570032100") + hashlib.sha256(b"new key").digest()
print("site keeps its key:      ", chain_ok([spki]))
print("site moves to backup:    ", chain_ok([backup]))
print("site loses both keys:    ", chain_ok([new_key]), "(locked out for 60 days)")
```

It prints:

```text
SPKI    302a300506032b657003210019bf44096984cdfe8541bac167dc3b96c85086aa30b6b6cb0c5c38ad703166e1
pin     oekVYFTgT6yJmunydRMs3Ael28TqLCrTof/G4NJTaB8=
backup  f2kS2d24ok9dSDEZtiiF6bosER3GAv3DvtjEF1nZnJM=
site keeps its key:       True
site moves to backup:     True
site loses both keys:     False (locked out for 60 days)
```

The 44-byte SPKI is a 12-byte DER header (`302a 3005 0603 2b6570 0321 00`:
a sequence, the algorithm identifier for Ed25519, and a bit string) followed by
the 32-byte key. The last line is the whole problem in one output.

**Why it was withdrawn.** HPKP failed in three ways at once. *Self-inflicted
lockout:* a site that rotated keys without updating its pins was unreachable
for returning visitors until `max-age` ran out. In October 2016 Smashing Magazine renewed its
certificate with a new key that its pins did not cover and was unreachable for
most returning visitors for about four days, until it reissued a certificate
on the old key; there was no remedy a browser vendor could apply short of users
clearing their settings. *Hostile pinning:* an attacker who controlled a
site for an hour (a hijacked DNS account, a misissued certificate) could serve
a pin for keys only the attacker held, and the real owner would be locked out
of returning browsers for up to 60 days after recovering the site. *Almost no
use:* with such a downside, very few sites deployed it. Certificate
Transparency offered *detection* instead of prevention, for every
certificate, with no way for a site to hurt itself. Chrome made CT mandatory
for new certificates in April 2018. Chrome's team announced the plan to drop
HPKP in October 2017, deprecated it in Chrome 67 (May 2018) and removed it in
Chrome 72 (January 2019); Firefox removed it in version 72 (January 2020).
Expect-CT, a header that asked browsers to require CT for a site, became
pointless once CT was required everywhere and was deprecated in Chrome 107
(2022), the year its specification was published as RFC 9163.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Timeline of certificate pinning from 2011 to 2022: Chrome's built-in pins and DigiNotar, Certificate Transparency, HPKP, Android pin-sets, Chrome's plan to drop HPKP, CT required, removal from Chrome and Firefox, iOS pinning, Expect-CT deprecated" fill="currentColor" font-size="11.5">
<line x1="30" y1="140" x2="612" y2="140" stroke="currentColor" stroke-width="2"/>
<g stroke="currentColor"><line x1="40" y1="96" x2="40" y2="140"/><line x1="244" y1="96" x2="244" y2="140"/><line x1="346" y1="96" x2="346" y2="140"/><line x1="447" y1="96" x2="447" y2="140"/><line x1="600" y1="96" x2="600" y2="140"/>
<line x1="142" y1="140" x2="142" y2="176"/><line x1="295" y1="140" x2="295" y2="176"/><line x1="396" y1="140" x2="396" y2="176"/><line x1="498" y1="140" x2="498" y2="176"/></g>
<circle cx="40" cy="140" r="5"/><circle cx="142" cy="140" r="5"/><circle cx="244" cy="140" r="5"/><circle cx="295" cy="140" r="5"/><circle cx="346" cy="140" r="5"/><circle cx="396" cy="140" r="5"/><circle cx="447" cy="140" r="5"/><circle cx="498" cy="140" r="5"/><circle cx="600" cy="140" r="5"/>
<text x="30" y="52" font-weight="bold" font-size="13">2011</text><text x="30" y="68">Chrome pins Google;</text><text x="30" y="84">DigiNotar caught</text>
<text x="244" y="52" text-anchor="middle" font-weight="bold" font-size="13">2015</text><text x="244" y="68" text-anchor="middle">HPKP, RFC 7469:</text><text x="244" y="84" text-anchor="middle">any site can pin</text>
<text x="346" y="52" text-anchor="middle" font-weight="bold" font-size="13">2017</text><text x="346" y="68" text-anchor="middle">Chrome plans</text><text x="346" y="84" text-anchor="middle">to drop HPKP</text>
<text x="447" y="52" text-anchor="middle" font-weight="bold" font-size="13">2019</text><text x="447" y="68" text-anchor="middle">Chrome 72</text><text x="447" y="84" text-anchor="middle">removes HPKP</text>
<text x="612" y="52" text-anchor="end" font-weight="bold" font-size="13">2022</text><text x="612" y="68" text-anchor="end">Expect-CT</text><text x="612" y="84" text-anchor="end">deprecated</text>
<text x="142" y="194" text-anchor="middle" font-weight="bold" font-size="13">2013</text><text x="142" y="210" text-anchor="middle">CT, RFC 6962</text>
<text x="295" y="194" text-anchor="middle" font-weight="bold" font-size="13">2016</text><text x="295" y="210" text-anchor="middle">Android 7</text><text x="295" y="226" text-anchor="middle">pin-sets</text>
<text x="396" y="194" text-anchor="middle" font-weight="bold" font-size="13">2018</text><text x="396" y="210" text-anchor="middle">CT required;</text><text x="396" y="226" text-anchor="middle">HPKP deprecated</text>
<text x="498" y="194" text-anchor="middle" font-weight="bold" font-size="13">2020</text><text x="498" y="210" text-anchor="middle">Firefox drops it;</text><text x="498" y="226" text-anchor="middle">iOS 14 pins</text>
<text x="320" y="260" text-anchor="middle" font-size="12.5" fill-opacity=".7">browsers moved from prevention (pins) to detection (CT); apps kept pins</text>
</svg>
<figcaption>Figure 5.6. Certificate pinning, 2011 to 2022. Pins set by the browser vendor worked; pins set by any site through a header did not survive four years.</figcaption>
</figure>

**Pinning on phones today.** An app is different from a web site in the one way
that matters: the same company writes the client and runs the server, and it
can ship a fix with the next update. Android 7.0 (2016) added a declarative
**Network Security Configuration**, in which an app lists `<pin-set>` entries
of SPKI hashes for its domains with an `expiration` date, after which the pins
are ignored rather than locking anyone out. iOS 14 (2020) added the
`NSPinnedDomains` key, with SPKI hashes of allowed CA or leaf keys, to an app's
Info.plist; libraries such as OkHttp's `CertificatePinner` did the same in code
for years before. Both platforms' documentation now warns against pinning
unless you control the keys: when a CA changes its intermediates (Let's
Encrypt introduced new ones in 2024), apps pinned to the old one stop working
until users update. If you pin at all, pin keys you control, include an
offline backup key, set an expiry, and keep a way to turn pinning off
remotely. Pinning is also what makes interception boxes fail against some
apps, which is sometimes the point.

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

### Groups and key shares

The hybrid group `X25519MLKEM768` (code point `0x11EC`, RFC 10024, August
2026; [Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.10) costs 1,216 bytes
in the ClientHello and 1,120 in the ServerHello, against 32 for X25519. Over
TCP the ClientHello no longer fits one packet; in QUIC, whose first Initial is
padded to 1,200 bytes anyway, it spans two Initial packets.

A client sends key shares only for the groups it expects the server to pick,
usually the hybrid and X25519. A server that *prefers* a group the client sent
no share for must answer with a HelloRetryRequest, a full round trip
([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.7). Good servers choose
among the shares actually sent, in their own order of preference. In OpenSSL
3.5 syntax, `X25519MLKEM768:X25519:P-256` does that; listing `P-256` first
would force a retry on most browsers for nothing.

### Revocation after OCSP: stapling or short lives

"Turn on OCSP stapling" was standard advice for a decade. It has partly
expired ([Chapter 2](02-Certificates-and-PKI.md), §2.7): OCSP became optional
for public CAs in 2024, and Let's Encrypt removed OCSP URLs from its
certificates on 7 May 2025 and turned its responders off on 6 August 2025.
With its certificates there is nothing to staple, and nginx logs that
`ssl_stapling` is ignored. With a CA that still runs OCSP, stapling is
harmless, but browsers stopped live OCSP checks long ago and rely on
revocation lists they gather and push out themselves.

What replaces it for the operator is **short lifetimes**: ballot SC-081 lowers
the maximum to 200 days from March 2026 and 47 days by 2029, and Let's Encrypt
has offered 6-day certificates (160 hours) to anyone since 15 January 2026. For
a stolen key with no working revocation, the window is the lifetime: 398 days,
47 days, or 160 hours. With a 160-hour certificate renewed halfway, and a new
key each time, a theft at a random moment leaves on average $160 - 80/2 = 120$
hours.

Short lives make renewal a dependency: a 6-day certificate whose renewal fails
on Friday is an outage on Tuesday. Renew at a third to a half of the lifetime;
use **ACME Renewal Information** (ARI, RFC 9773, 2025), in which the CA tells
the client when to renew, so it can ask for early renewal before a mass
revocation; and monitor the certificate the server *actually serves*, from
outside.

### Session tickets and their forward-secrecy cost

Resumption ([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.8) is one line of
configuration with the largest hidden cost. A cluster usually issues
**stateless tickets**: the resumption state, including the PSK, encrypted
under a **session ticket encryption key** (STEK) shared by every server.
Whoever steals the STEK opens every ticket issued under it, and what that
gives depends on the version:

- **TLS 1.2 tickets** (RFC 5077, 2008) contain the session's *master secret*,
  and NewSessionTicket was sent unencrypted. With the STEK and a recording,
  the thief decrypts the *original* session and every resumption of it;
  ECDHE's forward secrecy is gone.
- **TLS 1.3 tickets** carry a PSK derived one-way from the resumption master
  secret, inside an encrypted NewSessionTicket. The original session stays
  safe; a `psk_ke` resumption (no fresh key exchange) is exposed; a
  `psk_dhe_ke` one exposes only its 0-RTT data. In every mode the thief can
  **impersonate the server** to any client holding a ticket, because in a
  resumed handshake the PSK is the only proof of who the server is.

**A worked example: the exposure window.** A service issues 2,000 tickets a
second, makes a new STEK every 24 hours and keeps each old one for seven days,
the longest ticket life TLS 1.3 allows. A thief who copies the key set holds
eight keys, covering eight days of tickets:

$$2{,}000 \times 86{,}400 \times 8 \approx 1.38 \text{ billion tickets}.$$

Rotate hourly and accept tickets for 24 hours, and the haul is
$2{,}000 \times 3{,}600 \times 25 = 180$ million, 7.7 times fewer, at the cost
of full handshakes for clients returning after a day. The 2016 study by
Springall, Durumeric and Halderman found STEKs reused for weeks or months,
sometimes because a server made one at start-up and kept it until reboot.

So: generate STEKs randomly, share them over an authenticated channel, keep
them only in memory, rotate at least daily and delete old ones on schedule;
prefer `psk_dhe_ke` (browsers send only that); keep ticket lifetimes to what
the service needs; and where full handshakes are affordable, issue no tickets.
Single-use tickets ([Chapter 3](03-TLS-1.3-Message-by-Message.md), §3.8) also limit what a stolen STEK is worth.

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

## 5.9 Early data in QUIC, and stopping replays

*Level: intermediate.*

[Chapter 3](03-TLS-1.3-Message-by-Message.md) (§3.8) showed why 0-RTT data can
be replayed and compared three server policies. This section is the operator's
side: how QUIC carries early data, what a cluster has to build to accept it
safely, and what the large services actually do.

### How QUIC sends 0-RTT

QUIC does not use TLS's early-data records. A server willing to take 0-RTT
puts an `early_data` extension in its NewSessionTicket with
`max_early_data_size` set to `0xffffffff`, a flag rather than a size; how much
the client may send is set by the flow-control limits in the server's
transport parameters. The client must *remember* those parameters, the
application protocol and, for HTTP/3, the server's SETTINGS. On the next
connection it sends its Initial and, often in the same UDP datagram, **0-RTT
packets** with their own keys (Figure 5.2) carrying the first request.

The server accepts by echoing `early_data` in EncryptedExtensions; 0-RTT and
1-RTT packets then share one packet number space. If it rejects (and it always
does after a HelloRetryRequest), it must not process any 0-RTT packet, and the
client resends everything as 1-RTT data and resets its streams, since every
remembered assumption may now be wrong. A returning client's 0-RTT answer is
also held to the 3x amplification limit (§5.3) unless the client presents a
**NEW_TOKEN** token from its previous connection; servers bind such tokens to
the client's address and give them short lives, since they too can be
replayed.

RFC 9001 is blunt about where the risk sits. QUIC's own frames are idempotent;
the danger is entirely in what the *application* does with early data, so
every application protocol on QUIC must say how it uses 0-RTT, and "disabling
0-RTT entirely is the most effective defense against replay attack."

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="0-RTT replay: an attacker copies a client's Initial and 0-RTT datagram and sends it to two more front-end servers; the first is accepted, the copy 3 seconds later is caught by the shared ClientHello record, the copy 30 seconds later fails the freshness check" fill="currentColor" font-size="13">
<rect x="20" y="118" width="120" height="54" rx="5" fill="currentColor" fill-opacity=".06" stroke="currentColor"/>
<text x="80" y="141" text-anchor="middle" font-weight="bold">client</text><text x="80" y="160" text-anchor="middle" font-size="11.5">ticket T1</text>
<rect x="400" y="30" width="220" height="56" rx="5" fill="none" stroke="currentColor"/>
<text x="510" y="52" text-anchor="middle" font-weight="bold">front end A</text><text x="510" y="72" text-anchor="middle" font-size="12">accept: fresh, not seen</text>
<rect x="400" y="138" width="220" height="56" rx="5" fill="currentColor" fill-opacity=".14" stroke="currentColor"/>
<text x="510" y="160" text-anchor="middle" font-weight="bold">front end B</text><text x="510" y="180" text-anchor="middle" font-size="12">reject 0-RTT: already seen</text>
<rect x="400" y="236" width="220" height="56" rx="5" fill="currentColor" fill-opacity=".14" stroke="currentColor"/>
<text x="510" y="258" text-anchor="middle" font-weight="bold">front end C</text><text x="510" y="278" text-anchor="middle" font-size="12">reject 0-RTT: outside window</text>
<line x1="140" y1="140" x2="394" y2="62" stroke="currentColor" stroke-width="2.5"/>
<polygon points="398,61 386,59 389,69"/>
<text x="250" y="80" text-anchor="middle" font-size="12" transform="rotate(-17 250 80)">Initial + 0-RTT "POST /pay"</text>
<rect x="170" y="196" width="160" height="44" rx="5" fill="none" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="250" y="216" text-anchor="middle">attacker</text><text x="250" y="232" text-anchor="middle" font-size="11.5">copies the datagram</text>
<g stroke="currentColor" stroke-dasharray="5 4">
<line x1="230" y1="114" x2="230" y2="194"/>
<line x1="330" y1="208" x2="394" y2="172"/>
<line x1="330" y1="228" x2="394" y2="260"/>
</g>
<polygon points="398,170 386,172 391,180"/><polygon points="398,262 391,253 386,262"/>
<text x="352" y="180" text-anchor="middle" font-size="11.5">+3 s</text>
<text x="352" y="262" text-anchor="middle" font-size="11.5">+30 s</text>
<text x="20" y="282" font-size="11.5" fill-opacity=".7">A, B and C share one record of</text>
<text x="20" y="298" font-size="11.5" fill-opacity=".7">ClientHellos seen in the window</text>
</svg>
<figcaption>Figure 5.7. Replaying 0-RTT. The freshness check (does the ticket age match the arrival time, within a window?) bounds how long the record must remember; the shared record catches copies inside the window.</figcaption>
</figure>

### Code it: a freshness check and a ClientHello record

RFC 8446 (§8.2 and §8.3) gives the two mechanisms a cluster can combine. The
**freshness check** uses the ticket's age: the client reports how long it has
held the ticket, the server knows when it issued it, and a ClientHello whose
claimed age does not match its arrival time is not fresh. To stop the age from
identifying the client across connections, it is sent as
`obfuscated_ticket_age` = (age in milliseconds + `ticket_age_add`) mod
$2^{32}$, where `ticket_age_add` is a random 32-bit number the server put in
that ticket. The **ClientHello record** remembers each ClientHello (its binder,
say) accepted within the window and refuses a second one. The window keeps the
record finite; the record catches copies within the window.

```python
# Anti-replay for 0-RTT (RFC 8446 sections 8.2 and 8.3): a freshness check on the
# ticket age plus a record of ClientHellos seen inside the window. Times in ms.
import hashlib

class Frontend:
    def __init__(self, window_ms, shared_store):
        self.window = window_ms
        self.seen = shared_store                # ClientHello binder -> arrival time

    def early_data(self, ticket, obfuscated_age, binder, now):
        client_age = (obfuscated_age - ticket["age_add"]) % 2**32
        expected = ticket["created"] + ticket["est_rtt"] + client_age
        if abs(now - expected) > self.window:
            return f"reject 0-RTT: off by {(now - expected) / 1000:+.1f} s"
        for b in [b for b, t in self.seen.items() if now - t > 2 * self.window]:
            del self.seen[b]                    # forget what can no longer be fresh
        if binder in self.seen:
            return "reject 0-RTT: ClientHello already seen"
        self.seen[binder] = now
        return "accept 0-RTT"

def client_hello(ticket, sent_at, one_way):
    age = sent_at - (ticket["created"] + one_way)          # measured on the client
    binder = hashlib.sha256(ticket["id"] + sent_at.to_bytes(8, "big")).hexdigest()[:16]
    return (age + ticket["age_add"]) % 2**32, binder

store = {}
a, b = Frontend(10_000, store), Frontend(10_000, store)    # two servers, one shared store
t = {"id": b"T1", "created": 0, "est_rtt": 80, "age_add": 0x9c3e11d5}
obf, binder = client_hello(t, 7_200_000, 40)               # two hours later, 40 ms one way
arrive = 7_200_000 + 40
print("Earth, honest client  ", a.early_data(t, obf, binder, arrive))
print("replay to server B    ", b.early_data(t, obf, binder, arrive + 3_000))
print("replay 30 s later     ", b.early_data(t, obf, binder, arrive + 30_000))

store.clear()
d0, d5 = 12 * 60_000, 12 * 60_000 + 20_000   # one-way light time when issued, and 5 days on
m = {"id": b"T2", "created": 0, "est_rtt": 2 * d0, "age_add": 0x51f0a2b7}
sent = 5 * 86_400_000
obf, binder = client_hello(m, sent, d0)
arrive = sent + d5
print("Mars, 10 s window     ", Frontend(10_000, store).early_data(m, obf, binder, arrive))
print("Mars, 60 s window     ", Frontend(60_000, store).early_data(m, obf, binder, arrive))
print("Mars replay, 20 s late", Frontend(60_000, store).early_data(m, obf, binder, arrive + 20_000))
print("Mars replay, 50 s late", Frontend(60_000, store).early_data(m, obf, binder, arrive + 50_000))
```

It prints:

```text
Earth, honest client   accept 0-RTT
replay to server B     reject 0-RTT: ClientHello already seen
replay 30 s later      reject 0-RTT: off by +30.0 s
Mars, 10 s window      reject 0-RTT: off by +20.0 s
Mars, 60 s window      accept 0-RTT
Mars replay, 20 s late reject 0-RTT: ClientHello already seen
Mars replay, 50 s late reject 0-RTT: off by +70.0 s
```

**The Earth case by hand.** The server issued the ticket at time 0 with an
estimated round trip of 80 ms and `ticket_age_add` = `0x9c3e11d5` =
2,621,313,493. The ticket reached the client 40 ms later, so two hours after
issue (7,200,000 ms) the client has held it for 7,199,960 ms and sends
7,199,960 + 2,621,313,493 = 2,628,513,453 (below $2^{32}$, so no wrap). The
server subtracts `ticket_age_add`, recovers 7,199,960, and expects the
ClientHello at $0 + 80 + 7{,}199{,}960 = 7{,}200{,}040$ ms, exactly when it
arrives. A copy three seconds later is inside the window but already in the
record; a copy 30 seconds later fails the age check. The Mars lines are
explained in §5.10.

**Sizing the record.** An entry is kept for twice the window, so the record
holds about rate × 2 × window entries: at 50,000 early-data handshakes a
second and a 10-second window, $50{,}000 \times 20 = 1{,}000{,}000$ entries, or
32 MB at 32 bytes each. RFC 8446 allows a Bloom filter, provided a false
positive only rejects the 0-RTT data. The hard part is *sharing*: one record
for front ends on every continent costs a cross-continent round trip, the very
thing 0-RTT was meant to save. So records are shared within a region, a copy
sent to another region may still be accepted, and the last defense has to
live in the application.

### What servers actually do

HTTP's rules are in RFC 8470 (2018). A front end that forwards early data adds
the header `Early-Data: 1`; an origin that will not risk a replay answers
**425 Too Early**, and the client repeats the request after the handshake.
Cloudflare's documentation says it takes 0-RTT only for `GET`, `HEAD` and
`OPTIONS`, never `POST` (at its 2017 launch it also refused query strings);
Akamai's basic setting allows only `GET` without query parameters. Many banks
and APIs turn 0-RTT off.

A safe `GET` is a convention, not a guarantee: a site whose `GET
/unsubscribe` changes state has made it replayable. The defenses stack: a
freshness window, a shared record within a region, early data only for
idempotent requests, and idempotency keys (a request ID the server remembers)
for anything that moves money or opens doors.

## 5.10 Mars: QUIC over light-minutes

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
security works per message, not per session ([Chapter 20](20-Designing-and-Verifying-Protocols.md)).
The cryptographic question is then which end-to-end guarantees survive the
gateways, and the answer, as in any split design, is: only those that are made
end to end, above the transport, in the message itself.

### What a light delay costs, in minutes

Arcadia City is 3 to 22 light-minutes from Earth, so every round trip in a
handshake costs 6 to 44 minutes. The program prices the round trips before the
first byte of a response at three distances, counts the Initial probes a
standard QUIC client would fire before any answer could return, and measures
how fast the delay itself drifts, taking both orbits as circles in one plane.

```python
# Mars to Earth: round trips before the first byte of a response, the minutes they
# cost, and how fast the light time itself drifts (circular, coplanar orbits).
import math

flights = {"TCP + TLS 1.2": 4, "TCP + TLS 1.3": 3, "QUIC, 1-RTT": 2,
           "QUIC, 1-RTT after Retry": 3, "QUIC, 0-RTT": 1}
print("handshake               one way:  3 min  12.5 min   22 min")
for name, trips in flights.items():
    print(f"{name:24s}" + "".join(f"{trips * 2 * d:9.0f}" for d in (3, 12.5, 22)) + "  min")

pto, sent_at, probes = 0.999, 0.0, 0     # first Initial probe timeout, in seconds (RFC 9002)
while sent_at + pto < 44 * 60:
    sent_at += pto; pto *= 2; probes += 1
print(f"Initial probes sent before a 44-minute round trip ends: {probes}")

AU_LIGHT_S, a_mars = 499.005, 1.5237           # light seconds per AU; Mars orbit in AU
w = 2 * math.pi * (1 / 365.256 - 1 / 686.98)   # angle between the planets, radians per day
def light_s(day):
    return AU_LIGHT_S * math.sqrt(1 + a_mars**2 - 2 * a_mars * math.cos(w * day))
drift = max(abs(light_s(d + 1) - light_s(d)) for d in range(780))
print(f"one-way light time: {light_s(0) / 60:.1f} to {light_s(390) / 60:.1f} min; "
      f"changes by up to {drift:.0f} s a day")
```

It prints:

```text
handshake               one way:  3 min  12.5 min   22 min
TCP + TLS 1.2                  24      100      176  min
TCP + TLS 1.3                  18       75      132  min
QUIC, 1-RTT                    12       50       88  min
QUIC, 1-RTT after Retry        18       75      132  min
QUIC, 0-RTT                     6       25       44  min
Initial probes sent before a 44-minute round trip ends: 11
one-way light time: 4.4 to 21.0 min; changes by up to 4 s a day
```

Read the table as the time from clicking a link in Arcadia to the first byte
from Earth. TCP and TLS 1.2 at the farthest point cost almost three hours;
QUIC with 0-RTT costs the bare light time of request and response, which no
protocol can beat. A Retry adds a whole round trip, so an Earth server should
not send Mars clients Retry packets when a NEW_TOKEN (§5.9) can spare them.
And with a starting estimate of 333 ms, a client would send eleven copies of
its Initial before the first possible reply. (Real orbits are ellipses, which
stretch the model's 4.4 to 21.0 light-minutes to about 3 to 22.)

### Tickets, clocks and key updates across the gap

The numbers make 0-RTT almost irresistible, and
[Chapter 3](03-TLS-1.3-Message-by-Message.md) (§3.11) set the rule: early data
only for requests that are safe to repeat. Three problems remain.

**Tickets expire in a week.** A resident who reads an Earth site every few days
resumes; one who visits monthly pays the full handshake, up to 88 minutes. The
seven-day cap cannot stretch, because it bounds how long a stolen ticket key
stays useful (§5.8).

**The freshness window drifts.** The freshness check assumes the round trip
measured at issue still holds at use. Between planets it does not: the light
time drifts by up to about 4 seconds a day, so after a week the expected
arrival is off by up to half a minute. In the program of §5.9 a ticket used
after five days arrived 20 seconds "late", failing a 10-second window and
passing a 60-second one, whose record is six times larger. The better fix:
planetary positions are known years ahead, so an Earth server can predict the
light time at arrival from an ephemeris and keep the window narrow.

**One key update per round trip.** QUIC may start a key update only after a
packet under the current keys has been acknowledged (§5.3), so a 44-minute
round trip allows one new key per 44 minutes, and AES-GCM's $2^{23}$-packet
limit caps the speed:

$$\frac{2^{23} \text{ packets}}{2{,}640 \text{ s}} \approx 3{,}178 \text{ packets/s} \approx 30.5 \text{ Mbit/s at 1,200 bytes per packet},$$

or about 224 Mbit/s at closest approach. Today's radio links to Mars carry a
few megabits a second, but NASA's Deep Space Optical Communications
experiment sent 267 Mbit/s by laser from about 31 million km in December 2023,
and such a link to Mars would exceed the limit. The cure: ChaCha20-Poly1305 on
the long hop, whose confidentiality limit is beyond any packet count, or
bundles with their own keys instead of one QUIC connection.

### Checking certificates without asking Earth

A browser in Arcadia can check an Earth server's certificate without any round
trip to Earth:

- **The chain** is checked against roots in its own store.
- **Certificate Transparency** proofs (SCTs embedded in the certificate) are
  signatures by logs whose keys the browser already has.
- **Revocation** arrives as compact lists in bulk updates, which travel to Mars
  as ordinary bundles; OCSP would have cost a 6-to-44-minute query. During the
  two weeks of solar conjunction the lists go stale, so a city policy might
  accept a list up to 30 days old and then warn.
- **Expiry** is compared with the local clock, which needs the city's
  authenticated time service ([Chapter 2](02-Certificates-and-PKI.md), §2.9).
  A clock two days slow accepts a 6-day certificate for two extra days.

The hard direction is the other one: a server in Arcadia renewing a 6-day
certificate from an Earth CA every few days, through ACME exchanges of several
round trips and none at all during conjunction. That is Chapter 2's argument
for a city CA under a name constraint, made stronger by every cut in Earth's
lifetimes.

## 5.11 In the real world

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
  now do with MLS ([Chapter 17](17-Group-Messaging-MLS.md)).
- **Encrypted Client Hello in service.** Chrome (version 117) and Firefox
  (version 119) turned ECH on by default in 2023, years before RFC 9849 and
  RFC 9848 were published in March 2026. Cloudflare enabled it broadly in late
  2024, and in November 2024 Russia's censor was reported to block connections
  carrying both Cloudflare's shared ECH name and the ECH extension. Operators
  need a front end holding the ECH private key, an HTTPS DNS record with the
  public configuration, and regular key rotation.
- **OCSP switched off.** Let's Encrypt's responders went dark on 6 August 2025
  without breaking browsers, which had stopped relying on them; the failures
  were in non-browser software that still insisted on an OCSP answer.
- **Pins that outlived their keys.** Apps that pinned a public CA's
  intermediate broke when the CA rotated intermediates, as Let's Encrypt did
  in 2024, and needed emergency updates.

## 5.12 Going deeper

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

**Forward-secure 0-RTT.** The 0-RTT keys depend only on the PSK, so they have
no forward secrecy and can be replayed. Felix Günther, Britta Hale, Tibor Jager
and Sebastian Lauer showed in 2017 how to get full forward secrecy for 0-RTT
with *puncturable* encryption, where the server's key is updated after each
decryption so that it can no longer open the same ciphertext; the cost was
large keys and slow operations. Nimrod Aviram, Kai Gellert and Tibor Jager
(2019) made the idea practical for session tickets with a puncturable
pseudorandom function: each ticket opens exactly once, giving forward
secrecy and replay protection without a shared record, at the price of server
state that grows with outstanding tickets.
Marc Fischlin and Felix Günther (2017) first treated 0-RTT replay formally.

**Header protection as a primitive.** QUIC's mask is a pseudorandom function
of 16 bytes of ciphertext, which works because AEAD output looks random and,
with unique packet numbers, never repeats. Antoine Delignat-Lavaud and others
(IEEE S&P 2021) gave the first security model for the whole record layer,
treating AEAD plus header protection as one authenticated encryption scheme
that hides part of its own nonce, proved QUIC's construction secure in that
model, and produced a verified implementation of it.

**Formal verification of implementations.** Microsoft's Project Everest
produced verified implementations of TLS 1.3's record layer and parts of QUIC's
packet protection (in F\*, compiled to C). Cloudflare's, Google's and Amazon's
QUIC stacks are tested with interoperability runners and fuzzers rather than
proofs.

## Check yourself

??? question "1. QUIC Initial packets are encrypted with keys anyone can compute. What is the point?"

    To stop middleboxes from parsing and depending on handshake contents
    (preventing ossification), and to make version changes effective by
    changing the salt. It provides no confidentiality against an eavesdropper.

??? question "2. Why do QUIC clients pad their first Initial packet to at least 1,200 bytes?"

    A server may send at most three times as many bytes as it has received
    from an unvalidated address. A large first packet gives the server room to
    send its handshake (including certificates) without exceeding that limit,
    while still preventing large amplification.

??? question "3. What does header protection hide, and why does it matter for connection migration?"

    The packet number and some flag bits. If packet numbers were visible, an
    observer could link a connection before and after the client changes
    networks, even with a new connection ID.

??? question "4. Why does DTLS need explicit sequence numbers when TLS does not?"

    Datagrams can be lost or reordered, so the receiver cannot count records
    implicitly; each record carries its epoch and sequence number, and a replay
    window detects duplicates.

??? question "5. A long-header packet arrives with first byte `0xcb`, and the first byte of the header-protection mask is `0x5a`. What is the real first byte, and how long is the packet number?"

    In a long header only the low four bits are masked: `0x5a AND 0x0f = 0x0a`,
    and `0xcb XOR 0x0a = 0xc1`, or `1100 0001`: long header, fixed bit, type
    Initial (00), reserved bits 00 as they must be, and length bits `01`, so
    the packet number takes 1 + 1 = 2 bytes. Only then can the receiver unmask
    the next two bytes.

??? question "6. In the service-mesh code, the game server's certificate verifies. Why is it refused?"

    Because the policy for the records service does not list the game
    server's SPIFFE ID. Authentication says who the caller is; authorization
    decides whether that identity may call this service.

??? question "7. A mesh is moving to a new CA. Why must the new CA be in every peer's trust bundle before issuance switches, and the old one stay until a full certificate lifetime after the switch?"

    A peer refuses a certificate whose issuer is not in its bundle. Switch
    first, and every renewed certificate is refused (1,965 workload-minutes in
    the program); drop the old CA too soon, and certificates it signed just
    before the switch are refused while still in use.

??? question "8. Why was HTTP Public Key Pinning removed, while Chrome's built-in pins for Google were not a problem?"

    HPKP let any site set pins, and mistakes (lost keys, wrong pins) or an
    attacker who briefly controlled the site could lock users out for months.
    Built-in pins are maintained by the browser vendor and fixed with an
    update.

??? question "9. A server stores the ClientHellos it accepts with 0-RTT. Why does it also need the ticket-age check, and why does the check need a wider window for clients on Mars?"

    Without it the store would have to keep every ClientHello forever; the age
    check rejects anything outside the window, so the store keeps only about
    two windows' worth. Between planets the light time drifts up to about 4
    seconds a day, so a ticket used days after issue arrives tens of seconds
    off the time predicted from the round trip at issue, and a 10-second
    window rejects honest clients. Widen the window (and the store), or predict
    the delay from planetary positions.

??? question "10. Name two QUIC mechanisms that would need retuning for a 25-minute round trip, and say why the cryptography itself needs no change."

    The handshake retransmission timer and the idle timeout (also congestion
    control and acknowledgement delays). The keys, AEAD and transcript binding
    do not depend on time; only the transport's assumptions about delay do.
    One limit does bite: QUIC allows one key update per round trip, so with
    AES-GCM's $2^{23}$-packet limit a 44-minute round trip caps a connection
    near 30 Mbit/s; ChaCha20-Poly1305 avoids the cap.

## What you learned

- QUIC runs TLS 1.3's handshake inside a UDP transport, protects packets and
  most of the header itself, and encrypts even its first packets to resist
  ossification.
- Address validation (the 3x limit, Retry tokens) and path challenges defend
  UDP against amplification and hijacking; connection IDs let connections
  migrate without being linked.
- DTLS 1.3 carries TLS over datagrams with explicit sequence numbers, a replay
  window and cookies; WebRTC uses it to key SRTP.
- QUIC derives Initial, 0-RTT, Handshake and 1-RTT keys from separate
  secrets, masks packet numbers with a sample of the ciphertext, updates keys
  with a hidden phase bit, and never reuses a packet number, so
  retransmission never reuses a nonce.
- Mutual TLS gives every service call an identity; authorization on that
  identity is the application's job. SPIFFE puts the identity in one URI SAN,
  attestation decides who gets it, short lifetimes replace revocation, and a
  CA rotation must add the new CA everywhere before using it.
- HSTS and its preload list defeat SSL stripping; pinning by headers (HPKP,
  2015 to 2019) was abandoned in favor of Certificate Transparency, and
  survives in mobile apps that can ship a fix.
- Good configuration (TLS 1.2 and 1.3 only, AEAD, hybrid groups chosen from the
  client's shares, short-lived automated certificates now that OCSP is fading,
  rotated ticket keys) prevents most real problems. A stolen ticket key exposes
  every ticket issued under it, so its lifetime is a security parameter.
- 0-RTT is safe only with a freshness window, a shared record of ClientHellos
  and an application that accepts only repeatable requests early.
- Over a Mars link round trips cost minutes, freshness windows drift, and one
  key update per round trip caps AES-GCM's throughput.

**Next:** [Chapter 6](06-SSH.md), the other great secure channel, which trusts
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
- RFC 8439, ChaCha20 and Poly1305 (2018); RFC 8446 §8 (0-RTT and
  anti-replay, 2018); RFC 8470, *Using Early Data in HTTP* (2018); RFC 5077,
  TLS session tickets (2008).
- RFC 9849, TLS Encrypted Client Hello, and RFC 9848, bootstrapping ECH with
  DNS service bindings (both March 2026); RFC 10024, hybrid key agreement for
  TLS 1.3 (August 2026); RFC 9773, ACME Renewal Information (2025); RFC 9163,
  Expect-CT (2022); RFC 8410, Ed25519 and X25519 keys in certificates (2018).
- SPIFFE, *X.509-SVID* and *SPIFFE ID* specifications; SPIRE documentation
  (spiffe.io).
- Drew Springall, Zakir Durumeric and J. Alex Halderman, "Measuring the
  security harm of TLS crypto shortcuts" (IMC 2016).
- Ivan Ristić, "Is HTTP Public Key Pinning dead?" (2016); Smashing Magazine,
  "Be afraid of HTTP Public Key Pinning (HPKP)" (October 2016); Android
  *Network Security Configuration* and Apple *Identity Pinning* developer
  documentation.
- Let's Encrypt, "Ending OCSP support in 2025" (December 2024) and "6-day and
  IP address certificates are generally available" (January 2026).
- Marc Fischlin and Felix Günther, "Replay attacks on zero round-trip time: the
  case of the TLS 1.3 handshake candidates" (EuroS&P 2017); Felix Günther,
  Britta Hale, Tibor Jager and Sebastian Lauer, "0-RTT key exchange with full
  forward secrecy" (Eurocrypt 2017); Nimrod Aviram, Kai Gellert and Tibor
  Jager, "Session resumption protocols and efficient forward security for TLS
  1.3 0-RTT" (Eurocrypt 2019).
- NASA JPL, Deep Space Optical Communications results (December 2023).
- Antoine Delignat-Lavaud and others, "A security model and fully verified
  implementation for the IETF QUIC record layer" (IEEE S&P 2021).
- Site pages: the [HTTPS guide](../../topics/HTTPS.md) (commands for
  certificates and testing), [openssl recipes](../../tools/openssl.md).
