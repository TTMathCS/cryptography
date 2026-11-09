# 8. WireGuard and the Noise framework

*IPsec offers a menu, and TLS and SSH negotiate. WireGuard offers nothing to
choose: one key exchange, one cipher, one hash, fixed timers, and a handshake of
two messages. It is a VPN small enough to read in an afternoon, and it went
from one person's project to the Linux kernel, phones and most commercial VPNs
in five years. Its handshake is an instance of the Noise framework, a way of
writing key exchanges as short strings of tokens. In this chapter you will
build WireGuard's handshake from its primitives, byte for byte, and check its
constants against a real implementation; build a small Noise engine that runs
WireGuard's pattern and others; and try three attacks on the handshake, one of
which succeeds halfway. Then: cryptokey routing, how WireGuard stays silent to
scanners, post-quantum WireGuard, and why it could not work at all between Earth
and Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - why WireGuard was written, and what "cryptographically opinionated"
      means;
    - the Noise framework: handshake patterns, tokens, the chaining key and
      the handshake hash;
    - how to read the NN, NK, XX and IK patterns by hand, and what the Noise
      specification's tables say each message reveals and protects;
    - WireGuard's handshake (Noise_IKpsk2) message by message, by computing it;
    - data packets, timers and key rotation, and the rules that decide when a
      new handshake starts;
    - cryptokey routing: how public keys replace IP addresses as identities;
    - how mac1, mac2 and cookies defend against scanning and denial of
      service, with a cookie reply computed byte for byte;
    - what the handshake protects against, what a stolen key gives away, and
      what the Tamarin and CryptoVerif proofs cover;
    - post-quantum WireGuard and how Rosenpass feeds it a key, including what
      the 2026 attacks on Classic McEliece mean for it;
    - why WireGuard's timers fail across the Earth-Mars gap, worked out
      second by second, and what a delay-tolerant design would change.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (forward secrecy,
    key compromise impersonation, identity hiding) and
    [Chapter 7](07-IPsec-and-IKEv2.md) for comparison; X25519 from
    [Chapter 15 of book 1](../../book/15-Elliptic-Curves.md), ChaCha20 and
    Poly1305 from Chapters [5](../../book/05-Stream-Ciphers.md) and
    [10](../../book/10-Message-Authentication.md); for §8.9, a KEM as in
    [Chapter 3 of the Post-quantum book](../post-quantum/03-KEMs-and-Signatures.md).

    **Levels:** §8.1 to §8.3 are for beginners, §8.4 to §8.11 are
    intermediate, §8.12 is expert.

## 8.1 The problem

*Level: beginner.*

By the mid-2010s there were two kinds of VPN. IPsec (Chapter 7) was standard,
fast, built into every operating system, and so complicated that configuring
it was a specialist's job. OpenVPN, the popular alternative, ran a TLS
connection in a user-space program and carried packets inside it; it was
easier, but slow, and it brought along all of TLS's negotiation and all of
OpenSSL. Both had hundreds of thousands of lines of code between the network
and the keys.

Jason Donenfeld, a security researcher, began WireGuard in 2015 with the
opposite approach. Instead of supporting every option, it supports one: the
best choices of the day, fixed. Instead of a protocol that can be extended in
every direction, a protocol that is versioned as a whole: if a primitive ever
breaks, there will be a WireGuard v2, and everyone will upgrade. The Linux
implementation was about 4,000 lines of code. The paper describing it appeared
at NDSS in 2017. In August 2018 Linus Torvalds wrote on the kernel mailing
list that, compared to "the horrors that are OpenVPN and IPSec, it's a work of
art", and WireGuard entered Linux 5.6 in March 2020. Implementations for
Windows, macOS, iOS, Android and the BSDs followed, and most commercial VPN
services now use it.

The design choices are worth listing, because each removes a class of
problems that earlier chapters have shown:

- **No negotiation.** Every WireGuard peer uses Curve25519, ChaCha20-Poly1305,
  BLAKE2s and the same handshake. There is no downgrade attack (Chapter 4)
  because there is nothing to downgrade to.
- **No certificates.** Each peer is its public key, listed in the other's
  configuration. Distributing keys is someone else's problem, which is both a
  weakness and the reason products such as Tailscale exist.
- **One round trip.** Two messages, then data.
- **No state for strangers.** A packet from someone without the right keys gets
  no answer at all, and the responder stores nothing about it.
- **Fixed timers.** Keys are replaced every two minutes, and the constants are
  in the protocol, not the configuration.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Timeline of WireGuard and Noise from 2015 to 2023" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="332" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">WireGuard begun; Noise framework published</text>
<text x="78" y="62" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="57" r="3.5"/>
<text x="108" y="62">WhatsApp's client-server link uses Noise Pipes</text>
<text x="78" y="97" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="92" r="3.5"/>
<text x="108" y="97">NDSS paper; Tamarin proof of the handshake</text>
<text x="78" y="132" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="127" r="3.5"/>
<text x="108" y="132">Torvalds: "a work of art"; Noise revision 34</text>
<text x="78" y="167" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="162" r="3.5"/>
<text x="108" y="167">CryptoVerif proof; Cloudflare's BoringTun</text>
<text x="78" y="202" text-anchor="end" font-weight="bold" class="acc-fill">2020</text>
<circle cx="92" cy="197" r="4.5" class="acc-fill"/>
<text x="108" y="202" class="acc-fill">WireGuard 1.0 in Linux 5.6</text>
<text x="78" y="237" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="232" r="3.5"/>
<text x="108" y="237">WireGuardNT for Windows; Post-Quantum WireGuard paper</text>
<text x="78" y="272" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="267" r="3.5"/>
<text x="108" y="272">flawed FreeBSD port pulled days before release</text>
<text x="78" y="307" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="302" r="3.5"/>
<text x="108" y="307">Rosenpass: a post-quantum key for WireGuard's PSK slot</text>
</svg>
<figcaption>Figure 8.1. WireGuard and Noise, from first code to the Linux kernel and post-quantum add-ons.</figcaption>
</figure>

## 8.2 Noise: key exchanges as strings of tokens

*Level: beginner.*

Trevor Perrin, one of the designers of Signal's protocol
([Chapter 16](16-Signal-and-the-Double-Ratchet.md)), published the **Noise
Protocol Framework** in 2015. Noise starts from the observation that most
Diffie-Hellman key exchanges are built from the same few moves, and that once
those moves are fixed, a protocol can be described by which keys are sent and
which Diffie-Hellman results are mixed in, in what order.

Each party may have a long-term **static** key pair $s$ and a fresh
**ephemeral** key pair $e$ for each handshake. A handshake pattern is a list of
messages, each a list of **tokens**:

| Token | Meaning |
| --- | --- |
| `e` | send my ephemeral public key (in the clear) |
| `s` | send my static public key (encrypted, if a key exists yet) |
| `ee` | mix in DH(my ephemeral, your ephemeral) |
| `es` | mix in DH(initiator's ephemeral, responder's static) |
| `se` | mix in DH(initiator's static, responder's ephemeral) |
| `ss` | mix in DH(my static, your static) |
| `psk` | mix in a pre-shared symmetric key |

Patterns are named by two letters, one for how each side's static key is known:
**N** (no static key), **K** (Known to the other side in advance), **X**
(transmitted during the handshake), **I** (transmitted Immediately, in the
first message). So:

```text
NN:   -> e                    XX:   -> e                  IK:   <- s   (known in advance)
      <- e, ee                      <- e, ee, s, es             ...
                                    -> s, se                    -> e, es, s, ss
                                                                <- e, ee, se
```

**NN** is anonymous Diffie-Hellman. **XX** is mutual authentication where
neither knows the other in advance, in three messages: like TLS with client
certificates. **IK** is mutual authentication in one round trip, for when the
initiator already knows the responder's static key: exactly WireGuard's
situation, where every peer's key is in the configuration file.

Behind the tokens are two running values, the same for every pattern:

- The **chaining key** $ck$. Every DH result is mixed in with HKDF:
  $(ck, k) \leftarrow \mathrm{HKDF}(ck, \mathrm{DH}(\ldots))$, which also
  produces a fresh encryption key $k$. After the last token, $ck$ is split into
  the two transport keys. Because each step feeds the previous $ck$ forward, the
  final keys depend on *every* DH result, so the handshake is as strong as the
  strongest combination of keys an attacker does not have.
- The **handshake hash** $h$. Every byte sent, and the protocol's name and an
  optional **prologue**, are hashed in:
  $h \leftarrow \mathrm{HASH}(h \,\|\, \text{data})$. Every encryption during the
  handshake uses $h$ as its associated data, so any change to any earlier byte
  makes the next decryption fail. This is the transcript hash of Chapter 1,
  continuously checked rather than checked once at the end.

A full protocol name pins every choice:
`Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s` means pattern IK with a PSK token at
the end of message 2, Curve25519, ChaCha20-Poly1305 and BLAKE2s. The name is
the first thing hashed into $h$, so two parties with different names can never
complete a handshake.

The Noise specification lists for each pattern what each message's payload
achieves: whether it is encrypted to a forward-secret key, whether the sender
is authenticated, and whether that authentication resists key compromise
impersonation. Designers pick a pattern from the table instead of inventing a
protocol, and the patterns have been checked with automatic tools (§8.12).
Besides WireGuard, Noise is used by WhatsApp between its apps and its servers,
by the Lightning Network for Bitcoin (`Noise_XK`), by libp2p and the networks
built on it (`XX`), by I2P and by Slack's Nebula overlay network (`IX`).

### Four patterns worked by hand

Reading a pattern takes three rules. Lines before `...` are **pre-messages**:
keys one side knows before the handshake starts, which are hashed into $h$ at
the start but never sent. An arrow `->` is a message from initiator to
responder, `<-` the other way. Tokens are processed left to right, and after
the tokens each message carries a **payload**, encrypted with the current key
$k$ if any DH has been mixed in yet, and sent in the clear otherwise. With
X25519 keys of 32 bytes and a 16-byte authentication tag, the sizes of the
messages follow from the tokens alone. Here are four, with empty payloads.

**NN: `-> e`, `<- e, ee`.** Message 1 is the initiator's ephemeral key, 32
bytes, and nothing has been mixed in yet, so its payload goes out in the clear.
Message 2 is the responder's ephemeral key (32 bytes); `ee` mixes in
$\mathrm{DH}(e_i, e_r)$, and the empty payload is now encrypted, which costs a
16-byte tag: 48 bytes. The keys are secret from a passive eavesdropper and
die with the ephemeral keys, but nobody is authenticated: an attacker in the
middle can run one NN with each side.

**NK: `<- s`, `...`, `-> e, es`, `<- e, ee`.** The initiator knows the
responder's static key $S_r$ in advance (the pre-message). Message 1 sends
$E_i$ and mixes in $\mathrm{DH}(e_i, S_r)$, so its payload can already be
encrypted, to the responder only: 32 + 16 = 48 bytes. Message 2 sends $E_r$
and mixes in $\mathrm{DH}(e_r, E_i)$: 48 bytes. This is the shape of a
client that knows its server's key and can say something private in its very
first message. The price: on the responder's side, message 1 depends only on its
static key, so whoever later steals that key can decrypt a recorded message 1,
and anyone can replay it.

**XX: `-> e`, `<- e, ee, s, es`, `-> s, se`.** Nothing is known in advance.
Message 1 is a bare ephemeral key: 32 bytes. Message 2: $E_r$ (32), `ee`, the
responder's static key encrypted (48), `es`, payload (16): 96 bytes. Message
3: the initiator's encrypted static key (48), `se`, payload (16): 64 bytes.
One and a half round trips, and each side learns the other's static key.

**IK: `<- s`, `...`, `-> e, es, s, ss`, `<- e, ee, se`.** Message 1: 32 + 48
+ 16 = 96 bytes; message 2: 32 + 16 = 48. Add WireGuard's 12-byte timestamp
payload, its headers (8 and 12 bytes) and two 16-byte MACs, and 96 and 48
become 148 and 92.

The Noise specification (§7.7 of revision 34) grades every payload with two
numbers. The **source** level says how well the recipient knows who sent it:
0 for not at all, 1 for authenticated through `ss` (forgeable by anyone who has
stolen the *recipient's* static key, which is key compromise impersonation),
and 2 for authenticated through an ephemeral-static DH, which resists it. The
**destination** level says who can read it: 0 for anyone; 1 for
forward-secret but possibly an attacker; 2 for the right recipient only, but
without forward secrecy against its static key and open to replay; 3 and 4 for
"weak" forward secrecy, breakable by an active attacker who later steals a
static key; and 5 for strong forward secrecy to a known recipient:

| Pattern | Message | Source | Destination |
| --- | --- | --- | --- |
| NN | `-> e` | 0 | 0 |
| | `<- e, ee` | 0 | 1 |
| NK | `-> e, es` | 0 | 2 |
| | `<- e, ee` | 2 | 1 |
| | first transport message `->` | 0 | 5 |
| XX | `-> e` | 0 | 0 |
| | `<- e, ee, s, es` | 2 | 1 |
| | `-> s, se` | 2 | 5 |
| IK | `-> e, es, s, ss` | 1 | 2 |
| | `<- e, ee, se` | 2 | 4 |
| | first transport messages `->` and `<-` | 2 | 5 |

Read IK's first row with WireGuard in mind. Source 1 is the key compromise
impersonation that §8.8 carries out in code. Destination 2 means WireGuard's
first message could be replayed, which is why it carries a timestamp that must
be newer than the last.

A second table (§7.8) grades **identity hiding**: how well each static public
key is kept from observers. In NK the responder's key is never sent, but an
observer can test a candidate private key against a recording (level 3). In XX
the initiator's key goes, forward-secret, only to an authenticated responder
(level 8), while the responder's key goes to anyone who sends a message 1
(level 1). In IK the initiator's key is encrypted to the responder's static
key without forward secrecy (level 4), the weakness §8.8 returns to. IK
buys one round trip with the initiator's privacy.

Noise also has three **one-way** patterns, for a sender who gets no reply:
`N` (`<- s`, `...`, `-> e, es`), `K` (both static keys known, `-> e, es, ss`) and `X`
(`-> e, es, s, ss`). They are the first halves of NK, KK and IK. They
never pass destination level 2: forward secrecy needs a fresh contribution
from a recipient who never speaks. That limit returns in §8.10.

<figure class="mars-fig">
<svg viewBox="0 0 640 452" width="640" role="img" aria-label="Four Noise patterns as message ladders: NN, NK, XX and IK, with the tokens of each message, the payload security levels from the Noise specification, and the identity-hiding level of each static key" fill="currentColor" font-size="13">
<g fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".4"><rect x="10" y="8" width="300" height="210" rx="6"/><rect x="330" y="8" width="300" height="210" rx="6"/><rect x="10" y="230" width="300" height="210" rx="6"/><rect x="330" y="230" width="300" height="210" rx="6"/></g>
<path d="M50 40V188M270 40V188M50 86H266M270 126H54M370 40V188M590 40V188M370 86H586M590 126H374M50 262V410M270 262V410M50 308H266M270 348H54M50 388H266M370 262V410M590 262V410M370 308H586M590 348H374" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="270,86 259,81 259,91"/><polygon points="50,126 61,121 61,131"/><polygon points="590,86 579,81 579,91"/><polygon points="370,126 381,121 381,131"/><polygon points="270,308 259,303 259,313"/><polygon points="50,348 61,343 61,353"/><polygon points="270,388 259,383 259,393"/><polygon points="590,308 579,303 579,313"/><polygon points="370,348 381,343 381,353"/>
<g text-anchor="middle"><text x="160" y="32" font-weight="bold" font-size="15">NN</text><text x="50" y="32">I</text><text x="270" y="32">R</text><text x="480" y="32" font-weight="bold" font-size="15">NK</text><text x="370" y="32">I</text><text x="590" y="32">R</text><text x="160" y="254" font-weight="bold" font-size="15">XX</text><text x="50" y="254">I</text><text x="270" y="254">R</text><text x="480" y="254" font-weight="bold" font-size="15">IK</text><text x="370" y="254">I</text><text x="590" y="254">R</text></g>
<g text-anchor="middle" font-family="monospace"><text x="160" y="80">e</text><text x="160" y="120">e, ee</text><text x="480" y="80">e, es</text><text x="480" y="120">e, ee</text><text x="160" y="302">e</text><text x="160" y="342">e, ee, s, es</text><text x="160" y="382">s, se</text><text x="480" y="302">e, es, s, ss</text><text x="480" y="342">e, ee, se</text></g>
<g text-anchor="middle" font-size="12" fill-opacity=".7"><text x="160" y="101">source 0, destination 0</text><text x="160" y="141">source 0, destination 1</text><text x="480" y="58">R's static key known in advance</text><text x="480" y="101">source 0, destination 2</text><text x="480" y="141">source 2, destination 1</text><text x="160" y="323">source 0, destination 0</text><text x="160" y="363">source 2, destination 1</text><text x="160" y="403">source 2, destination 5</text><text x="480" y="280">R's static key known in advance</text><text x="480" y="323">source 1, destination 2</text><text x="480" y="363">source 2, destination 4</text></g>
<g text-anchor="middle" font-size="12"><text x="160" y="207">identity hiding: no static keys</text><text x="480" y="207">identity hiding: R 3</text><text x="160" y="429">identity hiding: I 8, R 1</text><text x="480" y="429">identity hiding: I 4, R 3</text></g>
</svg>
<figcaption>Figure 8.2. Four Noise patterns traced as message ladders. Under each message are the source and destination levels of its payload from the Noise specification's table; at the bottom, the identity-hiding level of the initiator's (I) and responder's (R) static key.</figcaption>
</figure>

## 8.3 The WireGuard handshake, by hand

*Level: beginner.*

The initiator (say, a laptop in an Arcadia habitat) knows the responder's (the
city gateway's) static public key from its configuration. Write the laptop's
keys as $s_i, e_i$ and the gateway's as $s_r, e_r$; capitals are public keys.

<div class="mars-steps" markdown>

1. **Start.** Both set $C = \mathrm{HASH}(\text{name})$ and

   $$
   H = \mathrm{HASH}(C \,\|\, \texttt{"WireGuard v1 zx2c4 Jason@zx2c4.com"}),
   $$

   then hash in the gateway's static public key $S_r$.
2. **Message 1, initiation (148 bytes): `e, es, s, ss` plus a timestamp.** The
   laptop sends a fresh $E_i$. It mixes in $\mathrm{DH}(e_i, S_r)$ and uses the
   resulting key to encrypt its own static key $S_i$, so an eavesdropper does not
   learn who is connecting. It then mixes in $\mathrm{DH}(s_i, S_r)$ and encrypts a
   12-byte **TAI64N timestamp**. Two MACs, `mac1` and `mac2`, close the message.
3. **The gateway checks** `mac1`, derives the same keys from its side, decrypts
   $S_i$, looks it up in its list of peers, decrypts the timestamp and checks
   that it is newer than any it has seen from that peer. A replayed initiation
   fails here.
4. **Message 2, response (92 bytes): `e, ee, se, psk`.** The gateway sends a
   fresh $E_r$, mixes in $\mathrm{DH}(e_r, E_i)$, $\mathrm{DH}(e_r, S_i)$ and the
   pre-shared key (32 zero bytes if none is set), and encrypts an empty message.
   Only someone who did the same four DHs with the same PSK can open it.
5. **Transport keys.** Both split $C$ into a sending and a receiving key.
6. **Key confirmation.** The gateway does not send data until it has received
   the laptop's first data packet, which proves the laptop has the keys. If the
   laptop has nothing to send, it sends an empty **keepalive**.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="The WireGuard handshake: initiation with tokens e, es, s, ss and a timestamp, response with tokens e, ee, se, psk, then data; the chaining key absorbs four Diffie-Hellman results and the PSK" fill="currentColor" font-size="13.5">
<text x="110" y="22" text-anchor="middle" font-weight="bold">laptop (initiator)</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">gateway (responder)</text>
<line x1="110" y1="56" x2="110" y2="252" stroke="currentColor"/>
<line x1="530" y1="32" x2="530" y2="252" stroke="currentColor"/>
<text x="110" y="50" text-anchor="middle" font-size="12.5">knows Sᵣ</text>
<line x1="110" y1="85" x2="526" y2="85" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,85 518,80 518,90"/>
<text x="320" y="77" text-anchor="middle">e, es, s, ss, {timestamp}, mac1, mac2</text>
<text x="320" y="103" text-anchor="middle" font-size="12.5">148 bytes</text>
<line x1="530" y1="145" x2="114" y2="145" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,145 122,140 122,150"/>
<text x="320" y="137" text-anchor="middle">e, ee, se, psk, {empty}, mac1, mac2</text>
<text x="320" y="163" text-anchor="middle" font-size="12.5">92 bytes</text>
<line x1="110" y1="200" x2="526" y2="200" stroke="currentColor" stroke-width="2.5" class="acc" stroke-dasharray="7 4"/>
<polygon points="530,200 518,195 518,205" class="acc-fill"/>
<text x="320" y="192" text-anchor="middle">first data packet (confirms the keys)</text>
<line x1="530" y1="235" x2="114" y2="235" stroke="currentColor" stroke-width="2.5" class="acc" stroke-dasharray="7 4"/>
<polygon points="110,235 122,230 122,240" class="acc-fill"/>
<text x="320" y="227" text-anchor="middle">data</text>
<g font-size="12.5">
<rect x="20" y="268" width="600" height="104" rx="6" class="soft" stroke="currentColor"/>
<text x="40" y="290" font-weight="bold">the chaining key C absorbs, in order:</text>
<text x="40" y="312">Eᵢ → DH(eᵢ, Sᵣ) → DH(sᵢ, Sᵣ) → Eᵣ → DH(eᵣ, Eᵢ) → DH(eᵣ, Sᵢ) → PSK → split into two keys</text>
<text x="40" y="334">the hash H absorbs every byte sent; each encryption uses H as associated data</text>
<text x="40" y="356" class="acc-fill">the transport keys depend on all four DH results and the PSK</text>
</g>
</svg>
<figcaption>Figure 8.3. WireGuard's handshake as Noise tokens. The initiator's identity is encrypted in message 1; the response proves the responder holds its static key.</figcaption>
</figure>

## 8.4 Code it: the whole handshake

*Level: intermediate.*

WireGuard's whitepaper (§5.4) specifies the handshake as a list of exact
computations, which makes it pleasant to implement. First the primitives:
X25519, BLAKE2s (which Python's `hashlib` provides), HMAC-BLAKE2s, an HKDF that
returns one, two or three outputs, and ChaCha20-Poly1305 written out in full.
Each is checked against its RFC's test vector.

```python
# WireGuard's primitives, from the whitepaper section 5.4: X25519, BLAKE2s,
# HMAC-BLAKE2s, its HKDF, and ChaCha20-Poly1305 (RFC 8439), each checked.
import hashlib, hmac, struct

P = 2**255 - 19
def x25519(k, u):                                  # RFC 7748 Montgomery ladder
    k = bytearray(k); k[0] &= 248; k[31] &= 127; k[31] |= 64
    k, x1 = int.from_bytes(k, "little"), int.from_bytes(u, "little") % P
    x2, z2, x3, z3, swap = 1, 0, x1, 1, 0
    for t in reversed(range(255)):
        b = (k >> t) & 1
        if swap ^ b: x2, x3, z2, z3 = x3, x2, z3, z2
        swap = b
        A, B, C, D = (x2 + z2) % P, (x2 - z2) % P, (x3 + z3) % P, (x3 - z3) % P
        DA, CB, AA, BB = D * A % P, C * B % P, A * A % P, B * B % P
        x3, z3 = (DA + CB) ** 2 % P, x1 * (DA - CB) ** 2 % P
        x2, z2 = AA * BB % P, (AA - BB) * (AA + 121665 * (AA - BB)) % P
    if swap: x2, z2 = x3, z3
    return (x2 * pow(z2, P - 2, P) % P).to_bytes(32, "little")
def dh_pub(priv): return x25519(priv, (9).to_bytes(32, "little"))

def rotl(v, n): return ((v << n) & 0xffffffff) | (v >> (32 - n))
def chacha_block(key, counter, nonce):             # RFC 8439: 32-bit counter, 96-bit nonce
    s = list(struct.unpack("<4I", b"expand 32-byte k") + struct.unpack("<8I", key) +
             (counter,) + struct.unpack("<3I", nonce))
    w = s[:]
    for _ in range(10):
        for a, b, c, d in ((0,4,8,12),(1,5,9,13),(2,6,10,14),(3,7,11,15),
                           (0,5,10,15),(1,6,11,12),(2,7,8,13),(3,4,9,14)):
            w[a] = (w[a] + w[b]) & 0xffffffff; w[d] = rotl(w[d] ^ w[a], 16)
            w[c] = (w[c] + w[d]) & 0xffffffff; w[b] = rotl(w[b] ^ w[c], 12)
            w[a] = (w[a] + w[b]) & 0xffffffff; w[d] = rotl(w[d] ^ w[a], 8)
            w[c] = (w[c] + w[d]) & 0xffffffff; w[b] = rotl(w[b] ^ w[c], 7)
    return struct.pack("<16I", *[(x + y) & 0xffffffff for x, y in zip(w, s)])
def chacha20(key, nonce, data, counter=1):
    return bytes(x ^ y for i in range(0, len(data), 64)
                 for x, y in zip(data[i:i + 64], chacha_block(key, counter + i // 64, nonce)))
def poly1305(key, msg):
    r = int.from_bytes(key[:16], "little") & 0x0ffffffc0ffffffc0ffffffc0fffffff
    acc, Pp = 0, (1 << 130) - 5
    for i in range(0, len(msg), 16):
        acc = (acc + int.from_bytes(msg[i:i + 16] + b"\x01", "little")) * r % Pp
    return ((acc + int.from_bytes(key[16:], "little")) % (1 << 128)).to_bytes(16, "little")
def pad16(b): return bytes(-len(b) % 16)
def _tag(key, nonce, aad, ct):
    otk = chacha_block(key, 0, nonce)[:32]
    return poly1305(otk, aad + pad16(aad) + ct + pad16(ct) +
                    struct.pack("<QQ", len(aad), len(ct)))
def aead_seal(key, nonce, plain, aad):
    ct = chacha20(key, nonce, plain)
    return ct + _tag(key, nonce, aad, ct)
def aead_open(key, nonce, sealed, aad):
    ct, tag = sealed[:-16], sealed[-16:]
    if not hmac.compare_digest(tag, _tag(key, nonce, aad, ct)):
        raise ValueError("authentication failed")
    return chacha20(key, nonce, ct)

# WireGuard's names (whitepaper 5.4): AEAD nonce = 32 zero bits + 64-bit counter.
def AEAD(k, n, plain, aad): return aead_seal(k, bytes(4) + struct.pack("<Q", n), plain, aad)
def AEAD_open(k, n, sealed, aad): return aead_open(k, bytes(4) + struct.pack("<Q", n), sealed, aad)
def HASH(b): return hashlib.blake2s(b).digest()
def MAC(key, b): return hashlib.blake2s(b, digest_size=16, key=key).digest()
def HMAC(key, b): return hmac.new(key, b, hashlib.blake2s).digest()
def KDF(n, key, inp):                              # HKDF with HMAC-BLAKE2s, n outputs
    t0, out, t = HMAC(key, inp), [], b""
    for i in range(1, n + 1):
        t = HMAC(t0, t + bytes([i])); out.append(t)
    return out

alice = bytes.fromhex("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
print("X25519 matches RFC 7748:", dh_pub(alice).hex() ==
      "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")
sunscreen = (b"Ladies and Gentlemen of the class of '99: If I could offer you only one "
             b"tip for the future, sunscreen would be it.")
sealed = aead_seal(bytes(range(0x80, 0xa0)), bytes.fromhex("070000004041424344454647"),
                   sunscreen, bytes.fromhex("50515253c0c1c2c3c4c5c6c7"))
print("ChaCha20-Poly1305 tag matches RFC 8439:", sealed[-16:].hex() == "1ae10b594f09e26a7e902ecbd0600691")
```

```text
X25519 matches RFC 7748: True
ChaCha20-Poly1305 tag matches RFC 8439: True
```

Now the handshake. Each line follows the whitepaper's notation: $C$ is the
chaining key, $H$ the hash, `KDF(n, ...)` returns $n$ keys. The initiator's
static key, the gateway's static key and the two ephemeral keys come from fixed
seeds so the run is repeatable.

```python
# The WireGuard handshake (Noise_IKpsk2), both sides, byte for byte as in the
# whitepaper section 5.4. Continue from the primitives above.
seed = lambda label: HASH(label.encode())            # fixed keys: repeatable run
CONSTRUCTION = b"Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s"
IDENTIFIER = b"WireGuard v1 zx2c4 Jason@zx2c4.com"
C0 = HASH(CONSTRUCTION)
H0 = HASH(C0 + IDENTIFIER)
print("C:", C0.hex()[:32], "...  H:", H0.hex()[:32], "...")

def tai64n(seconds, nanos):                          # 12-byte timestamp
    return struct.pack(">QI", 2**62 + seconds, nanos)

class Peer:
    def __init__(self, name, psk=bytes(32)):
        self.priv = seed(name + " static"); self.pub = dh_pub(self.priv); self.psk = psk

laptop, gateway = Peer("habitat laptop"), Peer("arcadia gateway")

def create_initiation(me, peer_pub, eph_priv, timestamp, sender=0x1234):
    C, H = C0, HASH(H0 + peer_pub)
    E_pub = dh_pub(eph_priv)
    C = KDF(1, C, E_pub)[0];                     H = HASH(H + E_pub)
    C, k = KDF(2, C, x25519(eph_priv, peer_pub))                   # es
    enc_static = AEAD(k, 0, me.pub, H);          H = HASH(H + enc_static)
    C, k = KDF(2, C, x25519(me.priv, peer_pub))                    # ss
    enc_time = AEAD(k, 0, timestamp, H);         H = HASH(H + enc_time)
    msg = (bytes([1, 0, 0, 0]) + struct.pack("<I", sender) + E_pub + enc_static + enc_time)
    msg += MAC(HASH(b"mac1----" + peer_pub), msg) + bytes(16)       # mac1, no mac2
    return msg, (C, H, eph_priv)

def consume_initiation(me, msg, known_peers, last_timestamp):
    if not hmac.compare_digest(msg[116:132], MAC(HASH(b"mac1----" + me.pub), msg[:116])):
        return None, "bad mac1: drop silently"
    C, H = C0, HASH(H0 + me.pub)
    E_pub, enc_static, enc_time = msg[8:40], msg[40:88], msg[88:116]
    C = KDF(1, C, E_pub)[0];                     H = HASH(H + E_pub)
    C, k = KDF(2, C, x25519(me.priv, E_pub))
    peer_pub = AEAD_open(k, 0, enc_static, H);   H = HASH(H + enc_static)
    if peer_pub not in known_peers:
        return None, "unknown static key: drop"
    C, k = KDF(2, C, x25519(me.priv, peer_pub))
    ts = AEAD_open(k, 0, enc_time, H);           H = HASH(H + enc_time)
    if ts <= last_timestamp.get(peer_pub, b""):
        return None, "timestamp not newer: replay, drop"
    last_timestamp[peer_pub] = ts
    return (C, H, E_pub, peer_pub), "accepted from " + known_peers[peer_pub]

def create_response(me, state, eph_priv, sender=0x5678, receiver=0x1234):
    C, H, E_init, peer_pub = state
    E_pub = dh_pub(eph_priv)
    C = KDF(1, C, E_pub)[0];                     H = HASH(H + E_pub)
    C = KDF(1, C, x25519(eph_priv, E_init))[0]                     # ee
    C = KDF(1, C, x25519(eph_priv, peer_pub))[0]                   # se
    C, tau, k = KDF(3, C, me.psk);               H = HASH(H + tau) # psk
    empty = AEAD(k, 0, b"", H);                  H = HASH(H + empty)
    msg = bytes([2, 0, 0, 0]) + struct.pack("<II", sender, receiver) + E_pub + empty
    msg += MAC(HASH(b"mac1----" + peer_pub), msg) + bytes(16)
    T_recv, T_send = KDF(2, C, b"")              # responder: second key sends
    return msg, (T_send, T_recv)

def consume_response(me, msg, state, peer_pub):
    C, H, eph_priv = state
    E_pub, empty = msg[12:44], msg[44:60]
    C = KDF(1, C, E_pub)[0];                     H = HASH(H + E_pub)
    C = KDF(1, C, x25519(eph_priv, E_pub))[0]
    C = KDF(1, C, x25519(me.priv, E_pub))[0]
    C, tau, k = KDF(3, C, me.psk);               H = HASH(H + tau)
    AEAD_open(k, 0, empty, H)                    # raises if any DH or the PSK differs
    T_send, T_recv = KDF(2, C, b"")
    return (T_send, T_recv)

peers, seen = {laptop.pub: "habitat laptop"}, {}
m1, st_i = create_initiation(laptop, gateway.pub, seed("eph i"), tai64n(1_794_200_400, 0))
st_r, verdict = consume_initiation(gateway, m1, peers, seen)
print("initiation:", len(m1), "bytes;", verdict)
m2, keys_r = create_response(gateway, st_r, seed("eph r"))
keys_i = consume_response(laptop, m2, st_i, gateway.pub)
print("response:  ", len(m2), "bytes; initiator opened the empty box")
print("laptop's sending key = gateway's receiving key:", keys_i[0] == keys_r[1])

# A data packet: type 4, receiver index, 64-bit counter, padded inner packet.
inner = b"ping from the habitat"
padded = inner + bytes(-len(inner) % 16)
data = bytes([4, 0, 0, 0]) + struct.pack("<IQ", 0x5678, 0) + AEAD(keys_i[0], 0, padded, b"")
print("data packet:", len(data), "bytes; gateway reads:",
      AEAD_open(keys_r[1], 0, data[16:], b"").rstrip(b"\0").decode())
```

```text
C: 60e26daef327efc02ec335e2a025d2d0 ...  H: 2211b361081ac566691243db458ad532 ...
initiation: 148 bytes; accepted from habitat laptop
response:   92 bytes; initiator opened the empty box
laptop's sending key = gateway's receiving key: True
data packet: 64 bytes; gateway reads: ping from the habitat
```

The first two values printed are constants of the protocol: every WireGuard
handshake in the world starts from them, and they match the values hard-coded
in Cloudflare's BoringTun implementation (`noise/handshake.rs`). The message
sizes are WireGuard's real ones. The data packet is 16 bytes of header (type,
receiver index, 64-bit counter), the inner packet padded to a multiple of 16,
and a 16-byte tag.

### Code it: a small Noise engine

The handshake above is written out by hand. The program below implements
Noise's rules once, for any pattern written as tokens, and runs the IKpsk2
pattern with WireGuard's identifier string as the prologue. It produces exactly
WireGuard's keys. Then it runs XX, the three-message pattern for peers that do
not know each other's keys.

```python
# A small Noise engine (the Noise specification, revision 34): any pattern
# written as tokens. Continue from the programs above.
PATTERNS = {
    "IKpsk2": (["<- s"], ["-> e es s ss", "<- e ee se psk"]),
    "XX":     ([],       ["-> e", "<- e ee s es", "-> s se"]),
}
class Handshake:
    def __init__(self, name, initiator, s, rs=None, psk=None, prologue=b"", eph=None):
        pattern = name.split("_")[1]
        pre, self.msgs = PATTERNS[pattern]
        self.h = HASH(name.encode()) if len(name) > 32 else name.encode().ljust(32, b"\0")
        self.ck, self.k, self.n = self.h, None, 0
        self.init, self.s, self.rs, self.psk, self.eph = initiator, s, rs, psk, eph
        self.has_psk, self.turn = "psk" in pattern, 0
        self.mix_hash(prologue)
        for line in pre:                                 # pre-messages: known keys
            self.mix_hash(rs if initiator else s.pub)
    def mix_hash(self, d): self.h = HASH(self.h + d)
    def mix_key(self, ikm): self.ck, self.k = KDF(2, self.ck, ikm); self.n = 0
    def mix_key_and_hash(self, ikm):
        self.ck, th, self.k = KDF(3, self.ck, ikm); self.mix_hash(th); self.n = 0
    def encrypt_and_hash(self, p):
        c = p if self.k is None else AEAD(self.k, self.n, p, self.h)
        self.n += self.k is not None; self.mix_hash(c); return c
    def decrypt_and_hash(self, c):
        p = c if self.k is None else AEAD_open(self.k, self.n, c, self.h)
        self.n += self.k is not None; self.mix_hash(c); return p
    def dh_token(self, t):
        mine, theirs = {"ee": ("e", "re"), "ss": ("s", "rs"),
                        "es": ("e", "rs") if self.init else ("s", "re"),
                        "se": ("s", "re") if self.init else ("e", "rs")}[t]
        priv = self.e_priv if mine == "e" else self.s.priv
        self.mix_key(x25519(priv, getattr(self, theirs)))
    def write(self, payload=b""):
        out = b""
        for t in self.msgs[self.turn][3:].split():
            if t == "e":
                self.e_priv = self.eph.pop(0); e = dh_pub(self.e_priv)
                out += e; self.mix_hash(e)
                if self.has_psk: self.mix_key(e)
            elif t == "s": out += self.encrypt_and_hash(self.s.pub)
            elif t == "psk": self.mix_key_and_hash(self.psk)
            else: self.dh_token(t)
        self.turn += 1
        return out + self.encrypt_and_hash(payload)
    def read(self, msg):
        for t in self.msgs[self.turn][3:].split():
            if t == "e":
                self.re, msg = msg[:32], msg[32:]; self.mix_hash(self.re)
                if self.has_psk: self.mix_key(self.re)
            elif t == "s":
                n = 48 if self.k else 32
                self.rs, msg = self.decrypt_and_hash(msg[:n]), msg[n:]
            elif t == "psk": self.mix_key_and_hash(self.psk)
            else: self.dh_token(t)
        self.turn += 1
        return self.decrypt_and_hash(msg)
    def split(self): return KDF(2, self.ck, b"")

# WireGuard is Noise IKpsk2 with its identifier as the prologue:
name = "Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s"
i = Handshake(name, True, laptop, rs=gateway.pub, psk=bytes(32), prologue=IDENTIFIER, eph=[seed("eph i")])
r = Handshake(name, False, gateway, psk=bytes(32), prologue=IDENTIFIER, eph=[seed("eph r")])
r.read(i.write(tai64n(1_794_200_400, 0)))
i.read(r.write())
print("generic Noise IKpsk2 gives WireGuard's keys:", i.split()[0] == keys_i[0])

# The same engine runs XX: neither side knows the other's key in advance.
name = "Noise_XX_25519_ChaChaPoly_BLAKE2s"
i = Handshake(name, True, laptop, eph=[seed("xx i")])
r = Handshake(name, False, gateway, eph=[seed("xx r")])
m = [i.write()]; r.read(m[0])
m.append(r.write()); i.read(m[1])
m.append(i.write()); r.read(m[2])
print("XX message sizes:", [len(x) for x in m])
print("each learned the other's static key:", i.rs == gateway.pub and r.rs == laptop.pub)
print("same transport keys:", i.split() == r.split())
```

```text
generic Noise IKpsk2 gives WireGuard's keys: True
XX message sizes: [32, 96, 64]
each learned the other's static key: True
same transport keys: True
```

The XX sizes are the 32, 96 and 64 bytes counted in §8.2. In XX the
*initiator's* identity is sent only after the responder has authenticated, so
it is hidden even from an active attacker; in IK it is readable by anyone who
ever holds the responder's private key. Picking a pattern is picking such
trade-offs from a table.

### Code it: NN, NK and a man in the middle

The same engine runs the other patterns of §8.2 once they are added to its
table. The program below checks the message sizes worked out by hand, then
puts Mallory in the middle: she answers the laptop's first message herself,
posing as the gateway.

```python
# Four patterns on the same engine, and a man in the middle.
# Continue from the programs above.
PATTERNS.update({
    "NN": ([],       ["-> e", "<- e ee"]),
    "NK": (["<- s"], ["-> e es", "<- e ee"]),
    "IK": (["<- s"], ["-> e es s ss", "<- e ee se"]),
})
def run(pattern, init_keys, resp_keys):
    name = "Noise_" + pattern + "_25519_ChaChaPoly_BLAKE2s"
    i = Handshake(name, True, laptop, eph=[seed(pattern + " i")], **init_keys)
    r = Handshake(name, False, gateway, eph=[seed(pattern + " r")], **resp_keys)
    sent = []
    for n in range(len(i.msgs)):
        a, b = (i, r) if n % 2 == 0 else (r, i)
        sent.append(a.write()); b.read(sent[-1])
    return i, r, sent

for pattern, ik in (("NN", {}), ("NK", {"rs": gateway.pub}),
                    ("XX", {}), ("IK", {"rs": gateway.pub})):
    i, r, sent = run(pattern, ik, {})
    print(pattern, "sizes:", [len(x) for x in sent], " keys agree:", i.split() == r.split())

# Mallory sits in the middle and runs one handshake with each side.
def mitm(pattern, ik):
    name = "Noise_" + pattern + "_25519_ChaChaPoly_BLAKE2s"
    mallory = Peer("mallory")
    i = Handshake(name, True, laptop, eph=[seed("mi")], **ik)
    m_r = Handshake(name, False, mallory, eph=[seed("m1")])     # poses as the gateway
    try:
        stolen = m_r.read(i.write(b"door code 4417"))
        i.read(m_r.write())
        return "handshake done; Mallory read " + repr(stolen)
    except ValueError:
        return "Mallory cannot read message 1: authentication failed"
print("NN with Mallory in the middle:", mitm("NN", {}))
print("NK with Mallory in the middle:", mitm("NK", {"rs": gateway.pub}))
```

It prints:

```text
NN sizes: [32, 48]  keys agree: True
NK sizes: [48, 48]  keys agree: True
XX sizes: [32, 96, 64]  keys agree: True
IK sizes: [96, 48]  keys agree: True
NN with Mallory in the middle: handshake done; Mallory read b'door code 4417'
NK with Mallory in the middle: Mallory cannot read message 1: authentication failed
```

The sizes are the ones counted by hand. The last two lines are the
difference between source level 0 and an authenticated responder. In NN,
Mallory completes a perfectly valid handshake with the laptop and reads
what it says; she would run a second NN with the real gateway and relay
between them, and neither end could tell. In NK, the laptop's first message is
encrypted under $\mathrm{DH}(e_i, S_r)$ and its handshake hash includes $S_r$;
Mallory has neither the gateway's private key nor any way to make the laptop
use her key instead, so the very first decryption fails. Nothing in NN is
broken: it does exactly what its table row says. The mistake would be choosing
it for a job that needs the row below.

## 8.5 Data packets, timers and rotation

*Level: intermediate.*

Every data packet carries the receiver's 32-bit index (so the receiver can find
the session without trying keys), a 64-bit counter used as the nonce, and the
encrypted inner packet. The receiver keeps a sliding window of recently seen
counters, like ESP's (Chapter 7), using the bit-shift-free algorithm of RFC
6479, so packets may arrive out of order but never twice.

WireGuard has no configuration options for its timers. The whitepaper fixes
them (§6.1):

| Constant | Value | Meaning |
| --- | --- | --- |
| Rekey-After-Time | 120 s | the initiator starts a new handshake when a session is this old |
| Reject-After-Time | 180 s | keys this old are never used again, in either direction |
| Rekey-After-Messages | $2^{60}$ | rekey after this many packets |
| Reject-After-Messages | $2^{64} - 2^{13} - 1$ | never send with a counter this high |
| Rekey-Timeout | 5 s | resend a handshake initiation that got no answer |
| Rekey-Attempt-Time | 90 s | give up on a handshake after this long |
| Keepalive-Timeout | 10 s | send a keepalive if data arrived but none was sent back |

A fresh handshake every two minutes means fresh ephemeral keys every two
minutes. A thief who steals both static private keys tomorrow cannot decrypt
today's traffic, because the ephemeral keys are gone; and a thief who copies
the session keys out of memory gets at most three minutes of traffic. No
other widely used VPN rotates keys that often by default.

WireGuard is also **stateless toward idle peers**. If no traffic flows, no
packets are sent: no keepalives, no liveness checks, nothing for an observer to
see. A peer can set `PersistentKeepalive` when it sits behind a NAT that would
otherwise forget its mapping.

**MTU.** WireGuard adds 32 bytes (16 of header, 16 of tag) to each packet, plus
the outer UDP and IP headers: 60 bytes over IPv4 and 80 over IPv6. On an
Ethernet link with 1,500-byte packets that leaves 1,420 bytes for the inner
packet, the default MTU of a WireGuard interface.

### Which side rekeys, and when

The rules that use the constants are in the whitepaper's §6 and the Linux
code (`timers.c`, `send.c`, `receive.c`), written so that two peers never
start competing handshakes on a schedule.

- **Only the initiator rekeys by age.** When the side that started the
  current session sends on a session older than 120 s, it sends a new
  initiation too. If it is only receiving, it rekeys when a packet arrives on
  a session older than
  $\text{Reject-After-Time} - \text{Keepalive-Timeout} - \text{Rekey-Timeout} =
  180 - 10 - 5 = 165$ s, so that a fresh session exists before the old one
  dies at 180 s. The responder never rekeys by age; if it has data after
  the session has expired, it starts a handshake and becomes the initiator.
- **Either side rekeys by count.** After $2^{60}$ messages on one session the
  sender starts a new handshake, whatever its role. At ten million packets a
  second that is over 3,000 years, so in practice the 120 s timer rules.
- **Three key slots.** Each peer holds a *previous*, a *current* and a *next*
  session. A responder puts new keys in *next* and promotes them only when
  the first data packet arrives under them (§8.3, step 6); the old keys become
  *previous* and still decrypt packets already in flight.
- **Retries replace, they do not repeat.** An initiation that gets no answer
  within Rekey-Timeout (5 s, plus up to a third of a second of random jitter so
  that many peers do not retry in step) is followed by a new one with a fresh
  ephemeral key, timestamp and sender index; the old one is forgotten. After Rekey-Attempt-Time the initiator gives up; the Linux code
  counts this as twenty attempts, the last sent 95 s after the first.
- **Dead peers and dead keys.** A peer that has sent data but heard nothing
  back, not even a keepalive, for Keepalive-Timeout + Rekey-Timeout = 15 s
  starts a new handshake: WireGuard notices a broken path without liveness
  messages of its own. If no new session has been made for
  $3 \times \text{Reject-After-Time} = 540$ s, every key, ephemeral and
  session, is wiped from memory.

Here is one busy laptop, worked through. At $t = 0$ it sends an initiation;
the gateway, a 40 ms round trip away, answers, and the laptop holds session 1 at
$t = 0.04$ s. The gateway moves it from *next* to *current* when the laptop's
first data packet lands at $t = 0.06$ s. At $t = 120.04$ s the laptop sends a
packet on a session that has just turned 120 s old, so a new initiation goes
with it; session 2 exists on both sides about 60 ms later. Late packets of
session 1, now *previous*, are accepted until it turns 180 s old. Session 2 is
replaced at about $t = 240$ s, session 3 at 360 s: a new X25519 exchange every
two minutes while traffic flows, and none when it stops.

<figure class="mars-fig">
<svg viewBox="0 0 640 244" width="640" role="img" aria-label="WireGuard timers on a time line from 0 to 540 seconds: each session sends for 120 seconds, is kept for receiving until 180 seconds, a new session starts at 120 seconds, unanswered handshakes are retried every 5 seconds twenty times, and all keys are wiped at 540 seconds without a new session" fill="currentColor" font-size="13">
<line x1="180" y1="4" x2="180" y2="86" stroke="currentColor" stroke-dasharray="4 3" stroke-opacity=".6"/>
<text x="184" y="14" font-size="12.5">120 s: the initiator rekeys when it next sends</text>
<line x1="225" y1="20" x2="225" y2="86" stroke="currentColor" stroke-dasharray="4 3" stroke-opacity=".6"/>
<text x="229" y="30" font-size="12.5">165 s: or when it receives, if still not rekeyed</text>
<line x1="240" y1="36" x2="240" y2="86" stroke="currentColor" stroke-dasharray="4 3" stroke-opacity=".6"/>
<text x="244" y="46" font-size="12.5">180 s: Reject-After-Time, keys refused</text>
<line x1="600" y1="4" x2="600" y2="196" stroke="currentColor" stroke-dasharray="4 3" stroke-opacity=".6"/>
<text x="596" y="70" text-anchor="end" font-size="12.5">540 s: everything</text>
<text x="596" y="86" text-anchor="end" font-size="12.5">wiped if no new</text>
<text x="596" y="102" text-anchor="end" font-size="12.5">session was made</text>
<rect x="60" y="60" width="120" height="24" fill="currentColor" fill-opacity=".28" stroke="currentColor"/>
<rect x="180" y="60" width="60" height="24" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="120" y="77" text-anchor="middle" font-size="12.5">session 1: sends</text>
<text x="210" y="77" text-anchor="middle" font-size="11.5">receives</text>
<rect x="180" y="100" width="120" height="24" fill="currentColor" fill-opacity=".28" stroke="currentColor"/>
<rect x="300" y="100" width="60" height="24" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="240" y="117" text-anchor="middle" font-size="12.5">session 2: sends</text>
<text x="330" y="117" text-anchor="middle" font-size="11.5">receives</text>
<rect x="300" y="140" width="120" height="24" fill="currentColor" fill-opacity=".28" stroke="currentColor"/>
<rect x="420" y="140" width="60" height="24" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="360" y="157" text-anchor="middle" font-size="12.5">session 3: sends</text>
<text x="450" y="157" text-anchor="middle" font-size="11.5">receives</text>
<path d="M60 174v16 M65 174v16 M70 174v16 M75 174v16 M80 174v16 M85 174v16 M90 174v16 M95 174v16 M100 174v16 M105 174v16 M110 174v16 M115 174v16 M120 174v16 M125 174v16 M130 174v16 M135 174v16 M140 174v16 M145 174v16 M150 174v16 M155 174v16" stroke="currentColor" stroke-width="1.5"/>
<text x="166" y="187" font-size="12.5">unanswered: a new initiation every 5 s, 20 tries, then give up</text>
<line x1="60" y1="210" x2="600" y2="210" stroke="currentColor"/>
<path d="M60 210v6 M120 210v6 M180 210v6 M240 210v6 M300 210v6 M360 210v6 M420 210v6 M480 210v6 M540 210v6 M600 210v6" stroke="currentColor"/>
<g text-anchor="middle" font-size="12"><text x="60" y="232">0 s</text><text x="120" y="232">60 s</text><text x="180" y="232">120 s</text><text x="240" y="232">180 s</text><text x="300" y="232">240 s</text><text x="360" y="232">300 s</text><text x="420" y="232">360 s</text><text x="480" y="232">420 s</text><text x="540" y="232">480 s</text><text x="600" y="232">540 s</text></g>
</svg>
<figcaption>Figure 8.4. A WireGuard peer's timers. Each session sends for two minutes and receives for one more, overlapping the next; an unanswered handshake is replaced every 5 seconds until the initiator gives up; with no new session, all keys are wiped after nine minutes.</figcaption>
</figure>

## 8.6 Cryptokey routing

*Level: intermediate.*

A WireGuard interface is configured with its own private key and a list of
peers. Each peer has a public key, optionally an endpoint (address and port),
and a list of **AllowedIPs**:

```text
[Interface]
PrivateKey = <the gateway's private key>
ListenPort = 51820

[Peer]                       # the habitat laptop
PublicKey  = <the laptop's public key>
AllowedIPs = 10.8.0.2/32

[Peer]                       # the Earth relay
PublicKey  = <the relay's public key>
AllowedIPs = 10.8.0.100/32, 192.168.0.0/16
Endpoint   = relay.example:51820
```

The list does two jobs at once. For **outgoing** packets it is a routing table:
a packet to 192.168.4.7 is encrypted for the Earth relay's public key. For
**incoming** packets it is an access list: a packet decrypted with the
laptop's session keys is accepted only if its inner source address is
10.8.0.2. Donenfeld calls this **cryptokey routing**. An inner IP address
becomes a statement about a public key, so a firewall rule that allows
10.8.0.2 really means "allows whoever holds the laptop's private key".

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Cryptokey routing: the same table maps destination addresses to public keys for outgoing packets and checks that incoming packets came from the key allowed to use their source address" fill="currentColor" font-size="13.5">
<rect x="180" y="20" width="280" height="110" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="42" text-anchor="middle" font-weight="bold">peer table on the gateway</text>
<text x="200" y="68">laptop key  →  10.8.0.2/32</text>
<text x="200" y="92">relay key   →  10.8.0.100/32,</text>
<text x="200" y="112">                     192.168.0.0/16</text>
<rect x="20" y="160" width="260" height="80" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="150" y="182" text-anchor="middle" font-weight="bold">sending</text>
<text x="150" y="204" text-anchor="middle" font-size="12.5">to 192.168.4.7: longest match</text>
<text x="150" y="224" text-anchor="middle" font-size="12.5">→ encrypt for the relay's key</text>
<rect x="360" y="160" width="260" height="80" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="490" y="182" text-anchor="middle" font-weight="bold">receiving</text>
<text x="490" y="204" text-anchor="middle" font-size="12.5">decrypted with the laptop's keys,</text>
<text x="490" y="224" text-anchor="middle" font-size="12.5">source must be 10.8.0.2, else drop</text>
<line x1="230" y1="130" x2="170" y2="160" stroke="currentColor" stroke-width="1.5"/>
<line x1="410" y1="130" x2="470" y2="160" stroke="currentColor" stroke-width="1.5"/>
</svg>
<figcaption>Figure 8.5. One table, two uses. Inner addresses are bound to public keys in both directions.</figcaption>
</figure>

**Roaming.** The endpoint is learned, not fixed. When the gateway receives an
authenticated packet from the laptop from a new address, it updates the
laptop's endpoint and sends replies there. A phone that moves from Wi-Fi to a
mobile network keeps its tunnel with no new handshake and no extension
protocol, which IPsec needed MOBIKE for.

**Key distribution is outside.** WireGuard does not say how the laptop learned
the gateway's key. For a few peers, an administrator copies keys by hand. For
thousands, a control plane does it: **Tailscale**, for example, runs a
coordination server that distributes public keys and addresses to all of an
organization's devices after they log in with a single sign-on account, and
helps them reach each other through NATs. The coordination server never sees
private keys or traffic, but it decides who trusts whom, which makes it the
most security-critical component of the system.

## 8.7 Silence, cookies and denial of service

*Level: intermediate.*

A handshake responder must do expensive work (X25519 operations) for anyone
who sends it an initiation. WireGuard limits that work in two layers.

**mac1.** Every handshake message ends with

$$\mathrm{mac1} = \mathrm{MAC}(\mathrm{HASH}(\texttt{"mac1----"} \,\|\, S_{\text{receiver}}),\ \text{message}),$$

a keyed BLAKE2s over the message under a key derived from the receiver's
*public* key. Anyone who knows the public key can compute it, so it is not
authentication. Its purpose is to make WireGuard **silent**: a port scanner
that does not know the gateway's public key cannot produce a valid mac1, and a
WireGuard endpoint answers an invalid mac1 with nothing at all. To the scanner,
UDP port 51820 looks closed. The program in §8.8 shows it.

**Cookies and mac2.** When a responder is under load, it stops processing
initiations that do not carry a valid **mac2**, and replies to them with a
64-byte **cookie reply** instead. The cookie is a MAC of the initiator's IP
address and port, under a secret that changes every two minutes, encrypted
with XChaCha20-Poly1305 under a key derived from the responder's public key,
with the triggering message's mac1 as associated data. The initiator decrypts
it and resends the initiation with $\mathrm{mac2} = \mathrm{MAC}(\text{cookie},\ \text{message})$.
Only an initiator that really receives packets at its claimed address can do
this, so the responder can rate-limit per address and forged source addresses
are useless. The cookie reply itself is smaller than the initiation, so it
cannot be used to amplify an attack, and binding it to mac1 means an attacker
cannot send cookie replies of its own to disrupt a real handshake.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Under load, the responder answers an initiation without a valid mac2 with a cookie reply; the initiator resends with mac2 computed from the cookie, and the responder then does the expensive handshake" fill="currentColor" font-size="13.5">
<text x="110" y="22" text-anchor="middle" font-weight="bold">initiator</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">responder under load</text>
<line x1="110" y1="32" x2="110" y2="290" stroke="currentColor"/>
<line x1="530" y1="32" x2="530" y2="290" stroke="currentColor"/>
<line x1="110" y1="65" x2="526" y2="65" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,65 518,60 518,70"/>
<text x="320" y="57" text-anchor="middle">initiation, mac1 valid, mac2 = zeros</text>
<line x1="530" y1="115" x2="114" y2="115" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="110,115 122,110 122,120" class="acc-fill"/>
<text x="320" y="107" text-anchor="middle">cookie reply (64 bytes, no X25519 work)</text>
<text x="320" y="135" text-anchor="middle" font-size="12.5">cookie = MAC(secret changing every 2 min, IP ‖ port)</text>
<line x1="110" y1="180" x2="526" y2="180" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,180 518,175 518,185"/>
<text x="320" y="172" text-anchor="middle">initiation again, mac2 = MAC(cookie, message)</text>
<rect x="400" y="200" width="225" height="40" rx="4" class="soft-acc"/>
<text x="512" y="216" text-anchor="middle" class="acc-fill" font-size="12.5">address proven: rate-limit</text>
<text x="512" y="232" text-anchor="middle" class="acc-fill" font-size="12.5">per IP, then do the handshake</text>
<line x1="530" y1="270" x2="114" y2="270" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,270 122,265 122,275"/>
<text x="320" y="262" text-anchor="middle">response</text>
</svg>
<figcaption>Figure 8.6. The cookie exchange. It costs one extra round trip, only when the responder is under attack.</figcaption>
</figure>

### Code it: a cookie reply, byte for byte

A responder decides it is **under load** from its own queue: in the Linux code,
when 512 or more handshake messages are waiting to be processed (an eighth of
the 4,096 it will queue), and for one second after the queue drops below
that. Under load it answers an initiation without a valid mac2 with a cookie
reply, and passes those with one through a rate limiter keyed by source
address. At any load it handles at most 50 initiations a second per peer.

The cookie is encrypted with **XChaCha20-Poly1305**, ChaCha20-Poly1305 with a
24-byte nonce. The first 16 bytes of the nonce and the key go through
**HChaCha20**, the ChaCha rounds without the final addition, to make a subkey;
the last 8 bytes become an ordinary nonce. A 24-byte nonce can be random for every
message without real risk of repeating, which suits a responder that keeps no
state. The construction is specified in an IRTF draft
(draft-irtf-cfrg-xchacha, last revised January 2020) that never became an
RFC; the program checks HChaCha20 and the AEAD against its test vectors, then
plays one round: the gateway under load, the laptop's initiation `m1` from
§8.4 arriving from 203.0.113.7, port 51820.

```python
# The cookie reply (whitepaper 5.4.7): HChaCha20 and XChaCha20-Poly1305 checked
# against draft-irtf-cfrg-xchacha-03, then one round of cookie, mac2 and checks.
# Continue from the programs above.
def hchacha20(key, nonce16):              # the ChaCha rounds without the final addition
    s = list(struct.unpack("<4I", b"expand 32-byte k") + struct.unpack("<8I", key) +
             struct.unpack("<4I", nonce16))
    for _ in range(10):
        for a, b, c, d in ((0,4,8,12),(1,5,9,13),(2,6,10,14),(3,7,11,15),
                           (0,5,10,15),(1,6,11,12),(2,7,8,13),(3,4,9,14)):
            s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 16)
            s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 12)
            s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 8)
            s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 7)
    return struct.pack("<8I", *(s[0:4] + s[12:16]))
def xaead(key, nonce24, plain, aad):
    return aead_seal(hchacha20(key, nonce24[:16]), bytes(4) + nonce24[16:], plain, aad)
def xaead_open(key, nonce24, sealed, aad):
    return aead_open(hchacha20(key, nonce24[:16]), bytes(4) + nonce24[16:], sealed, aad)

sub = hchacha20(bytes(range(32)), bytes.fromhex("000000090000004a0000000031415927"))
print("HChaCha20 matches the draft:", sub.hex() ==
      "82413b4227b27bfed30e42508a877d73a0f9e4d58a74a853c12ec41326d3ecdc")
t = xaead(bytes(range(0x80, 0xa0)), bytes(range(0x40, 0x58)), sunscreen,
          bytes.fromhex("50515253c0c1c2c3c4c5c6c7"))
print("XChaCha20-Poly1305 tag matches the draft:", t[-16:].hex() == "c0875924c1c7987947deafd8780acf49")

# The gateway is under load. The laptop's initiation m1 arrives from 203.0.113.7:51820.
secret = seed("gateway cookie secret, replaced every 120 s")
def cookie_for(ip, port):                 # MAC(secret, source IP || source port)
    return MAC(secret, bytes(map(int, ip.split("."))) + port.to_bytes(2, "big"))
def mac2_ok(msg, ip, port):
    return hmac.compare_digest(msg[132:148], MAC(cookie_for(ip, port), msg[:132]))
print("m1 with mac2 = zeros accepted under load:", mac2_ok(m1, "203.0.113.7", 51820))

nonce = seed("random nonce")[:24]         # random in real life; fixed for a repeatable run
key = HASH(b"cookie--" + gateway.pub)     # anyone who knows the gateway's public key
reply = (bytes([3, 0, 0, 0]) + m1[4:8] + nonce +
         xaead(key, nonce, cookie_for("203.0.113.7", 51820), m1[116:132]))
print("cookie reply:", len(reply), "bytes; no X25519 done by the gateway")

# The laptop opens it (the mac1 it sent is the associated data) and fills in mac2.
cookie = xaead_open(key, reply[8:32], reply[32:], m1[116:132])
m1b = m1[:132] + MAC(cookie, m1[:132])
print("resent initiation, mac2 valid from 203.0.113.7:", mac2_ok(m1b, "203.0.113.7", 51820))
print("same bytes with a forged source 198.51.100.9: ", mac2_ok(m1b, "198.51.100.9", 51820))

# An off-path attacker who never saw m1 forges a cookie reply with a wrong mac1.
fake = xaead(key, nonce, bytes(16), bytes(16))
try:
    xaead_open(key, nonce, fake, m1[116:132]); print("forged cookie accepted")
except ValueError:
    print("forged cookie reply: authentication failed, ignored")
```

It prints:

```text
HChaCha20 matches the draft: True
XChaCha20-Poly1305 tag matches the draft: True
m1 with mac2 = zeros accepted under load: False
cookie reply: 64 bytes; no X25519 done by the gateway
resent initiation, mac2 valid from 203.0.113.7: True
same bytes with a forged source 198.51.100.9:  False
forged cookie reply: authentication failed, ignored
```

Trace the bytes: 4 of type and zeros, the laptop's own 4-byte index (so it
can find its handshake), the 24-byte nonce, and the 16-byte cookie with its
16-byte tag. That is 64 bytes, less than half the initiation that triggered
it, so nobody can use the gateway to amplify a flood, and it cost one BLAKE2s
and one encryption, no X25519.

The gateway never stores the cookie; it recomputes it from the secret and the
source address. The laptop uses it as the mac2 key for up to 115 seconds (the
secret's 120-second life minus 5 seconds of margin). The same bytes from
another address fail, because that address has a different cookie: to pass, a
sender must really receive packets where it claims to be.

The associated data stops the last attack. Anyone can derive the cookie key
from the gateway's public key, so without it an attacker could feed the laptop
useless cookies and keep it from ever finishing a handshake under load. Bound
to the mac1 of the initiation it answers, a reply can only come from someone
who saw that initiation, and an attacker on the path could drop the packets
anyway.

## 8.8 Break it: what the handshake stops, and what a stolen key gives

*Level: intermediate.*

The program below tries three attacks against the gateway from §8.4. The first
replays the recorded initiation. The second is a scanner probing for
WireGuard. The third is an attacker who has stolen the **gateway's** private key
and tries to log in as the laptop.

```python
# Break it: three attacks on the handshake, and what stops each.
# Continue from the two programs above.

# 1. Replay a recorded initiation: the timestamp is not newer.
print("replayed initiation:", consume_initiation(gateway, m1, peers, seen)[1])

# 2. A scanner that does not know the gateway's public key cannot make mac1.
probe = bytearray(m1); probe[116:132] = bytes(16)
print("scanner's probe:    ", consume_initiation(gateway, bytes(probe), peers, seen)[1])

# 3. Someone steals the gateway's private key. They can forge an initiation
# "from the laptop", because the laptop's half of ss is DH(gateway priv, laptop pub).
def forged_initiation(stolen_gateway_priv, eph_priv, timestamp):
    C, H = C0, HASH(H0 + gateway.pub)
    E_pub = dh_pub(eph_priv)
    C = KDF(1, C, E_pub)[0];                 H = HASH(H + E_pub)
    C, k = KDF(2, C, x25519(eph_priv, gateway.pub))
    enc_static = AEAD(k, 0, laptop.pub, H);  H = HASH(H + enc_static)
    C, k = KDF(2, C, x25519(stolen_gateway_priv, laptop.pub))     # ss, from the other side
    enc_time = AEAD(k, 0, timestamp, H);     H = HASH(H + enc_time)
    msg = bytes([1, 0, 0, 0]) + struct.pack("<I", 0x9999) + E_pub + enc_static + enc_time
    return msg + MAC(HASH(b"mac1----" + gateway.pub), msg) + bytes(16)
fake = forged_initiation(gateway.priv, seed("attacker eph"), tai64n(1_794_200_500, 0))
st_fake, verdict = consume_initiation(gateway, fake, peers, seen)
print("forged initiation:  ", verdict)
m2_fake, keys_gw = create_response(gateway, st_fake, seed("eph r2"))
# The session keys need se = DH(gateway's ephemeral, laptop's static): the laptop's
# private key, which the attacker does not have. Its best guess fails:
E_r = m2_fake[12:44]
C = KDF(1, st_fake[0], E_r)[0]
C = KDF(1, C, x25519(seed("attacker eph"), E_r))[0]     # ee: the attacker can do this one
C = KDF(1, C, bytes(32))[0]                             # se: unknown, so a guess
guess = KDF(2, KDF(3, C, bytes(32))[0], b"")[0]
packet = AEAD(guess, 0, b"rm -rf /habitat/air".ljust(32, b"\0"), b"")
try:
    AEAD_open(keys_gw[1], 0, packet, b"")
    print("gateway accepted the attacker's data")
except ValueError:
    print("attacker's first data packet: authentication failed; no session")
```

```text
replayed initiation: timestamp not newer: replay, drop
scanner's probe:     bad mac1: drop silently
forged initiation:   accepted from habitat laptop
attacker's first data packet: authentication failed; no session
```

The first two are stopped as designed. The third shows a property Noise's
tables state openly: the payload of IK's first message is **vulnerable to key
compromise impersonation** (Chapter 1). The laptop's authentication in message 1
rests on $\mathrm{DH}(s_i, S_r)$, and anyone with the gateway's private key can
compute the same value as $\mathrm{DH}(s_r, S_i)$. So the gateway accepts the
forged initiation as coming from the laptop. It then fails, because the
session keys also depend on $\mathrm{DH}(e_r, S_i)$, which needs the laptop's
private key. The attacker's first data packet does not authenticate, and no
session is established. This is why key confirmation by the first data packet
(step 6 in §8.3) matters: without it, the gateway would have had a session
that looked authenticated.

The forged initiation is not harmless, though. It carries a timestamp, and the
gateway now rejects any initiation from the laptop with an older one. An
attacker with the gateway's key could send a timestamp from far in the future
and lock the real laptop out until its clock caught up. The same lockout
happens by accident if a machine's clock jumps forward and back, a known
operational issue that WireGuard's authors accept in exchange for a replay
defense that needs no state beyond one timestamp per peer.

**What a stolen static key reveals afterwards.** The initiator's static public
key is encrypted under $\mathrm{DH}(e_i, S_r)$. Anyone who records handshakes
and later obtains the responder's private key can decrypt every recorded
initiation and learn *who* connected and when, though not what they sent,
because the transport keys also depend on the ephemeral-ephemeral DH. Identity
hiding in WireGuard has no forward secrecy. For a VPN provider's server, which
holds one static key for millions of users, that is a real privacy
consideration.

### What the proofs cover, and what they leave out

WireGuard is small enough to model whole, and three analyses answer different
questions.

**Tamarin, symbolic (Donenfeld and Kevin Milner).** The model dates from 2017,
the report from 2018. It works in the symbolic model of
[Chapter 20](20-Designing-and-Verifying-Protocols.md#204-the-tools-and-what-they-proved):
the attacker owns the network but cannot break primitives, and may also learn
any combination of the static keys, ephemeral keys and PSK; for each
combination the prover checks secrecy of the session key and agreement on who
talked to whom. The session key
survives the theft of both static keys as long as the ephemeral keys were
erased (forward secrecy), and the theft of both ephemeral keys as long as the
static keys or the PSK stay secret, because $\mathrm{DH}(s_i, S_r)$ and the PSK
are mixed into the same chaining key.

**Computational, by hand (Dowling and Paterson, ACNS 2018).** A pen-and-paper
reduction proof. Its main finding was a definitional snag: because the first data packet serves as key confirmation, a
session key is used before the handshake is formally over, which breaks the
usual key-indistinguishability game. The authors proved a slightly modified
protocol, with an explicit key-confirmation message added, and argued that the
real one was sound in practice.

**CryptoVerif, computational and machine-checked (Benjamin Lipp, Bruno Blanchet
and Karthikeyan Bhargavan, EuroS&P 2019).** This took the protocol as it
is, transport messages included, and proved it with a tool that checks
game-based proofs mechanically. First the authors had to teach CryptoVerif that
X25519 does no public-key validation, so a few low-order points give
predictable shared secrets. The paper lists correctness, secrecy of messages, forward secrecy, mutual
authentication, session uniqueness, and resistance to key compromise
impersonation, identity mis-binding and replay, and it discusses the weak
identity hiding described above.

Noise as a whole has had the same treatment: Noise Explorer (§8.12), and
Guillaume Girol, Lucca Hirschi, Ralf
Sasse, Dennis Jackson, Cas Cremers and David Basin's "A Spectral Analysis of
Noise" (USENIX Security 2020) which ran Tamarin over the specification's
patterns under many compromise scenarios and found a finer grading than the
0-to-5 levels.

What none of them covers:

- **The clock.** The replay defense trusts the initiator's clock. A problem
  reported in August 2021, later CVE-2021-46873: an attacker who can set a
  victim's clock forward (easy with unauthenticated NTP) captures an
  initiation with a future timestamp and replays it later; the responder then
  rejects the real peer until that time passes, making its static key useless.
  The proofs treat the timestamp as a counter that only grows. The fix is
  operational: authenticated time, and new keys for a peer whose clock was
  abused.
- **Denial of service.** Cookies and mac2 are argued, not proved.
- **The code.** The FreeBSD port of §8.11 had the same protocol and serious
  bugs.

## 8.9 Post-quantum WireGuard

*Level: intermediate.*

Every DH in WireGuard's handshake is X25519, so a recorded handshake can be
decrypted by a future quantum computer. WireGuard has no post-quantum key
exchange of its own, and adding one would make it WireGuard v2. What it has is
the **PSK slot**: the `psk` token at the end of message 2 mixes a 32-byte
symmetric key into the chaining key. If the PSK is secret, a quantum attacker
who breaks every X25519 exchange still cannot compute the transport keys.

A PSK typed into two configuration files is a long-lived secret that is never
replaced, which is weak in other ways. Several projects therefore fill the slot
from a post-quantum exchange:

- **Post-Quantum WireGuard** (Andreas Hülsing, Kai-Chun Ning, Peter Schwabe,
  Florian Weber and Philip Zimmermann, IEEE S&P 2021) redesigned the handshake
  with KEMs instead of DH: Classic McEliece for static keys, whose public keys
  are large but are exchanged once in the configuration, and a lattice KEM for
  ephemeral keys, keeping each handshake message within one packet.
- **Rosenpass** (2023), building on that design, runs a post-quantum
  handshake of that kind *beside* an unmodified WireGuard, with Classic McEliece
  460896 for static keys and Kyber-512 for ephemeral ones (the round-3
  version of what NIST standardized as ML-KEM-512 in FIPS 203), and writes a
  new PSK into WireGuard every two minutes. Its protocol was checked with ProVerif.
- **Mullvad VPN** sets up a PSK with Classic McEliece and ML-KEM together
  through a short-lived connection to its server, then runs ordinary WireGuard
  with that PSK.

Because the PSK is only mixed in, the tunnel is never weaker than plain
WireGuard if the post-quantum part fails. The arrangement does nothing for
authentication, which is still X25519-based; as in the other protocols, that
can wait until a quantum computer actually exists, because impersonation has to
happen in real time.

### How Rosenpass feeds WireGuard

Rosenpass is a separate Rust program on both peers, with its own UDP port.
Each peer has a Classic McEliece key pair (mceliece460896) whose 524,160-byte
public key is copied to the other peer once, out of band. In the terms of §8.2
it is a post-quantum IK, with KEMs in place of Diffie-Hellman: you prove who
you are by opening a ciphertext sent to your static key.

<div class="mars-steps" markdown>

1. **InitHello**, initiator to responder: a fresh Kyber-512 public key (800
   bytes), a McEliece ciphertext encapsulated to the responder's static key
   (188 bytes), and the initiator's identity, encrypted.
2. **RespHello**, responder to initiator: a Kyber ciphertext to that ephemeral
   key (768 bytes), a McEliece ciphertext to the initiator's static key (188
   bytes), and the **biscuit**: the responder's whole handshake state, encrypted
   under a key only the responder knows, so that the responder itself keeps
   nothing.
3. **InitConf**, initiator to responder: the biscuit, returned, and proof that
   the initiator opened the ciphertext to its static key. The responder
   decrypts the biscuit, finishes the handshake, and checks a biscuit counter
   so that an old biscuit cannot be replayed.
4. **EmptyData**, responder to initiator: an acknowledgment, so the initiator
   stops retransmitting InitConf.

</div>

All three encapsulated keys and the transcript go into a chaining key, as in
Noise; the output shared key (`osk`) is derived under a WireGuard label, and
each daemon writes it into its interface as that peer's PSK, as
`wg set wg0 peer <key> preshared-key <file>` would. McEliece's large keys never
cross the network, so every message fits in one packet.

Three details show the care. At startup the PSK is set to a
*random* value, so WireGuard cannot bring up a tunnel before Rosenpass has a
key. If no new key is made in time (the reference implementation rekeys every
120 or 130 seconds, the roles offset so that they take turns, and expires a
key after 180), Rosenpass writes another random PSK and the tunnel stops: a
post-quantum VPN that quietly fell back to classical keys would fail in the
one way nobody notices. And the biscuit answers the clock problem of §8.8:
with no timestamp and no responder state until the initiator has proved
itself, there is nothing to disrupt, though WireGuard beside it keeps its own
timestamp. The protocol has a ProVerif analysis; a CryptoVerif proof is listed
as work in progress, and a cookie defense added in 2024 is still marked
experimental and off by default.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Rosenpass beside WireGuard: two Rosenpass daemons run a four-message post-quantum exchange on their own UDP port and each writes the resulting key into its WireGuard interface as the pre-shared key, which the WireGuard handshake mixes in last" fill="currentColor" font-size="13">
<g fill="currentColor" fill-opacity=".08" stroke="currentColor"><rect x="20" y="32" width="180" height="96" rx="6"/><rect x="440" y="32" width="180" height="96" rx="6"/></g>
<g fill="currentColor" fill-opacity=".2" stroke="currentColor"><rect x="20" y="196" width="180" height="70" rx="6"/><rect x="440" y="196" width="180" height="70" rx="6"/></g>
<path d="M110 128V190M530 128V190M200 222H434M440 244H206" fill="none" stroke="currentColor" stroke-width="2.2"/>
<path d="M200 48H434M440 72H206M200 96H434M440 120H206" fill="none" stroke="currentColor" stroke-width="1.3"/>
<polygon points="110,196 105,184 115,184"/><polygon points="530,196 525,184 535,184"/><polygon points="440,48 429,44 429,52"/><polygon points="200,72 211,68 211,76"/><polygon points="440,96 429,92 429,100"/><polygon points="200,120 211,116 211,124"/><polygon points="440,222 428,217 428,227"/><polygon points="200,244 212,239 212,249"/>
<g text-anchor="middle" font-weight="bold"><text x="110" y="20">laptop</text><text x="110" y="54">Rosenpass</text><text x="110" y="220">WireGuard</text><text x="530" y="20">gateway</text><text x="530" y="54">Rosenpass</text><text x="530" y="220">WireGuard</text></g>
<g text-anchor="middle" font-size="12"><text x="110" y="74">McEliece static key pair</text><text x="110" y="92">peer's 524,160-byte</text><text x="110" y="108">public key, set up once</text><text x="110" y="240">X25519 keys, PSK slot</text><text x="150" y="158">osk becomes</text><text x="150" y="173">the PSK</text><text x="530" y="74">McEliece static key pair</text><text x="530" y="92">peer's 524,160-byte</text><text x="530" y="108">public key, set up once</text><text x="530" y="240">X25519 keys, PSK slot</text><text x="570" y="158">osk becomes</text><text x="570" y="173">the PSK</text><text x="320" y="44" font-size="11.5">InitHello: Kyber pk, McEliece ct</text><text x="320" y="68" font-size="11.5">RespHello: 2 cts + biscuit</text><text x="320" y="92" font-size="11.5">InitConf: biscuit back</text><text x="320" y="116" font-size="11.5">EmptyData: done</text><text x="320" y="214">Noise_IKpsk2, UDP 51820</text><text x="320" y="262">psk mixed in after the four DHs</text></g>
<text x="320" y="144" text-anchor="middle" font-size="12" fill-opacity=".7">its own UDP port; every 2 minutes or so</text>
<rect x="20" y="284" width="600" height="46" rx="6" fill="none" stroke="currentColor" stroke-dasharray="5 3"/>
<g text-anchor="middle" font-size="12.5"><text x="320" y="303">no fresh key before it expires: Rosenpass writes a random PSK,</text><text x="320" y="321">so the tunnel stops instead of quietly losing its post-quantum layer</text></g>
</svg>
<figcaption>Figure 8.7. Rosenpass beside WireGuard. The post-quantum exchange runs on its own port; its output becomes WireGuard's pre-shared key, which the WireGuard handshake mixes in after its four Diffie-Hellman results. A missing key is replaced by a random one, so failure stops the tunnel.</figcaption>
</figure>

### Classic McEliece after 2026

Rosenpass chose Classic McEliece as the most conservative KEM available:
unbroken since 1978, with tiny ciphertexts. In 2026 that choice was shaken. As
the
[Post-quantum book's chapter 13](../post-quantum/13-Code-Based-Encryption-McEliece.md#1310-standards-and-the-attacks-of-2026)
tells, preprints found structure in Goppa-code public keys and estimated
key recovery below the claimed security levels, and in October 2026 Germany's
BSI advised against Classic McEliece in new designs. No full-size key has been
recovered, and the estimates are disputed.

What would a real break do? Rosenpass's authentication rests on McEliece
alone, so an attacker who could recover static private keys could impersonate
peers *within Rosenpass*. Its secrecy does not: the output key depends on all
three encapsulations, and the fresh Kyber exchange alone keeps a passive
recorder out. WireGuard's X25519 authentication still runs underneath. The
tunnel would lose only its protection against an attacker with a quantum
computer *and* a McEliece key recovery, acting in real time. Mullvad's design,
which pairs McEliece with ML-KEM, is in the same position. As of
November 2026 the Rosenpass project had not announced a change of algorithms;
its specification still names mceliece460896 and the round-3 Kyber-512. A
new design built today would follow BSI's advice and use ML-KEM or FrodoKEM for
the static keys too, at the cost of larger ciphertexts in every handshake.

## 8.10 Mars: the protocol that cannot stretch

*Level: intermediate.*

Chapter 7 found that IPsec could cross the gap to Mars with its timers
stretched to hours. WireGuard's timers cannot be stretched: they are constants
of the protocol. Follow a laptop in Arcadia trying to reach a gateway on Earth
at the closest approach, when Mars is about 54.6 million kilometers away and
light takes 182 seconds each way. The laptop stays quiet while it waits, and no
packet is lost; the times are those of the Linux rules in §8.5.

<div class="mars-steps" markdown>

1. **$t = 0$ to 95 s.** Every 5 seconds without an answer, a new initiation
   replaces the last: twenty in all, the last at $t = 95$ s. At $t = 100$ s
   the laptop gives up; the twentieth attempt's state stays in memory until
   the wipe at $100 + 540 = 640$ s.
2. **$t = 182$ to 277 s.** The initiations reach Earth, each with a newer
   timestamp, so the gateway answers every one and makes new keys each time,
   the last at $t = 277$ s.
3. **$t = 364$ to 459 s.** The responses reach Mars. The first nineteen name
   sender indices the laptop has already replaced, and are dropped. The
   twentieth, at $t = 459$ s, matches the attempt still on file: the laptop
   completes the handshake, holds keys, and sends a keepalive to confirm them.
4. **$t = 641$ s.** The keepalive reaches the gateway. The keys it was made
   with are $641 - 277 = 364$ seconds old, past Reject-After-Time, and it is
   refused. The laptop's own copy expired at $459 + 180 = 639$ s, before the
   gateway even saw it.

</div>

At the far side of the Sun, about 401 million kilometers and 1,338 seconds
each way, it fails a step earlier: the last response arrives at
$95 + 2 \times 1338 = 2771$ s, long after the attempt was wiped at 640 s, and
matches nothing.

Two limits are at work. A response must return before the next retry
replaces its attempt, so the first try succeeds only with a round trip under 5
seconds; beyond that only the twentieth attempt can, because its state is kept
until the wipe. And the gateway must see the first data packet within 180
seconds of making its keys, a round trip after it answered, so no handshake
survives a round trip of 180 seconds or more. Mars's shortest round trip, about six
minutes, is twice that limit; its longest, about 44 minutes, is fifteen times
it.

### Code it: the timers against the speed of light

The program below applies the same rules to links from a transatlantic cable
to the far side of Mars's orbit.

```python
# WireGuard's timers against the speed of light: a model of the Linux rules
# of section 8.5, with no packet loss and no new traffic while waiting.
C_KM_S = 299_792.458
links = [("transatlantic fiber", 0.035), ("geostationary satellite", 0.27),
         ("Earth-Moon", 384_400 / C_KM_S), ("Sun-Earth L2", 1_500_000 / C_KM_S),
         ("Mars, closest", 54.6e6 / C_KM_S), ("Mars, farthest", 401e6 / C_KM_S)]

def first_handshake(d):                     # d = one-way delay in seconds
    sends = [5 * k for k in range(20)]       # initiations; each replaces the last
    for k, t in enumerate(sends):
        back = t + 2 * d                     # the response reaches the initiator
        alive_until = sends[k + 1] if k + 1 < len(sends) else 100 + 540
        if back < alive_until:               # it answers the attempt still on file
            age = 2 * d                      # gateway's keys when the confirmation lands
            if age >= 180:
                return "laptop keyed at %.0f s; gateway's keys %.0f s old: refused" % (back, age)
            return "both keyed after %.2f s (attempt %d)" % (back + d, k + 1)
    return "every response arrived after its attempt was replaced or wiped"

for name, d in links:
    print("%-24s round trip %8.2f s: %s" % (name, 2 * d, first_handshake(d)))
```

It prints:

```text
transatlantic fiber      round trip     0.07 s: both keyed after 0.11 s (attempt 1)
geostationary satellite  round trip     0.54 s: both keyed after 0.81 s (attempt 1)
Earth-Moon               round trip     2.56 s: both keyed after 3.85 s (attempt 1)
Sun-Earth L2             round trip    10.01 s: both keyed after 110.01 s (attempt 20)
Mars, closest            round trip   364.25 s: laptop keyed at 459 s; gateway's keys 364 s old: refused
Mars, farthest           round trip  2675.18 s: every response arrived after its attempt was replaced or wiped
```

The Moon, at a 2.56-second round trip, fits inside the 5-second retry, so
WireGuard would serve a lunar base. A spacecraft at the Sun-Earth L2 point
gets a session only through the last-attempt loophole, after almost two
minutes, and every rekey would repeat the struggle while the old keys ran out.
For Mars the answer is no at any distance. Rosenpass has the same shape: its
retransmissions stop after 120 seconds and its keys expire after 180.

<figure class="mars-fig">
<svg viewBox="0 0 640 278" width="640" role="img" aria-label="Round-trip times on a logarithmic scale against WireGuard limits of 5 and 180 seconds: transatlantic, geostationary and Earth-Moon links finish on the first try, Sun-Earth L2 only on the last try, and both Mars distances fail" fill="currentColor" font-size="12">
<path d="M364.3 20V226M476.4 36V226" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="360.3" y="16" text-anchor="end">5 s: next try replaces the last</text><text x="480.4" y="32">180 s: keys refused</text>
<g fill-opacity=".22"><rect x="170" y="48" width="60.8" height="19"/><rect x="170" y="78" width="124.7" height="19"/><rect x="170" y="108" width="173.4" height="19"/><rect x="170" y="138" width="216.0" height="19"/></g><g fill-opacity=".5"><rect x="170" y="168" width="328.4" height="19"/><rect x="170" y="198" width="390.8" height="19"/></g>
<g text-anchor="end" font-size="12.5"><text x="162" y="62">transatlantic</text><text x="162" y="92">geostationary</text><text x="162" y="122">Earth-Moon</text><text x="162" y="152">Sun-Earth L2</text><text x="162" y="182">Mars, closest</text><text x="162" y="212">Mars, farthest</text></g>
<g text-anchor="end"><text x="634" y="62">0.07 s: first try</text><text x="634" y="92">0.54 s: first try</text><text x="634" y="122">2.56 s: first try</text><text x="634" y="152">10 s: 20th try</text></g><text x="504.4" y="182">364 s</text><text x="566.8" y="212">2,675 s</text><g font-weight="bold"><text x="176" y="182">fails</text><text x="176" y="212">fails</text></g>
<path d="M170 226H602M170.0 226v6M242.0 226v6M314.0 226v6M386.0 226v6M458.0 226v6M530.0 226v6M602.0 226v6" stroke="currentColor"/>
<g text-anchor="middle"><text x="170.0" y="247">0.01 s</text><text x="242.0" y="247">0.1 s</text><text x="314.0" y="247">1 s</text><text x="386.0" y="247">10 s</text><text x="458.0" y="247">100 s</text><text x="530.0" y="247">1000 s</text><text x="602.0" y="247">10000 s</text></g>
<text x="386" y="268" text-anchor="middle" fill-opacity=".7">round-trip time, logarithmic scale</text>
</svg>
<figcaption>Figure 8.8. Round-trip times against WireGuard's two limits, on a logarithmic scale. Earth links and the Moon finish on the first try; Sun-Earth L2 only on the twentieth; Mars, at either distance, is past the 180-second limit on key age.</figcaption>
</figure>

### What a delay-tolerant WireGuard would change

That is the price of being opinionated: the constants were chosen for a
planet where round trips take under a second, and keeping them out of the
configuration removed a class of mistakes there. Within Arcadia City,
WireGuard would be an excellent way to join the habitats' networks. For the
link to Earth, a design that keeps its good ideas would change these things:

- **No conversation before the first byte.** Use a one-way pattern (§8.2), such as
  `K` (`-> e, es, ss`) with both static keys configured. Every bundle carries
  its own ephemeral key and is decrypted on arrival.
- **Forward secrecy from a schedule, not a reply.** One-way patterns stop at
  destination level 2: whoever later steals the recipient's key reads old
  bundles. The fix is Signal's for offline recipients
  ([Chapter 16](16-Signal-and-the-Double-Ratchet.md#1611-mars-a-ratchet-across-20-minutes)):
  the gateway publishes in advance a series of signed medium-term keys, one
  per day; senders encrypt to the day's key, and the gateway deletes each when
  its day and the longest delivery delay are over. Forward secrecy comes in
  steps of days.
- **A ratchet instead of a rekey handshake.** Keys move forward by hashing,
  and fresh Diffie-Hellman values ride along whenever traffic flows the other
  way, as in the double ratchet.
- **Replay defense without a clock race.** A must-be-newer timestamp fails
  when bundles wait for hours and arrive out of order; counters with a wide
  window, plus the lifetime each bundle already carries in the Bundle Protocol
  (RFC 9171), do the job.
- **Timers from the contact plan.** Deep-space links open and close on a
  schedule known weeks ahead, and are cut for about two weeks around solar
  conjunction; key lifetimes must follow it, in hours or days.
- **Flood defense without cookies.** A cookie costs a round trip; a
  mac1-style filter still works one way, and the rest must come from
  authenticating the scheduled link itself.

Bundle Protocol Security (RFC 9172) already protects bundles with keys set up
in advance, and
[Chapter 20](20-Designing-and-Verifying-Protocols.md#207-delay-tolerant-networking-and-bpsec)
designs the Earth-Mars channel with it. The broader lesson is about where a
protocol puts its assumptions. TLS, SSH and IKE assume a conversation but let
the timeouts be configured. WireGuard hard-codes them. A future WireGuard for
space would have to be a different protocol with a different name, which is
exactly how WireGuard's versioning is meant to work.

## 8.11 In the real world

*Level: intermediate.*

- **Everywhere, quickly.** WireGuard is in the Linux kernel, in Windows (the
  WireGuardNT driver, 2021), in the official apps for macOS, iOS and Android
  (using the Go implementation, wireguard-go), and in the BSDs. Cloudflare's
  WARP uses BoringTun, its Rust implementation. Most commercial VPN services
  offer it, and several have made it their default.
- **The FreeBSD port.** In March 2021, days before FreeBSD 13.0 was released, an
  in-kernel WireGuard implementation commissioned by the firewall vendor
  Netgate was reviewed by Donenfeld, who found serious flaws, including missing
  checks that could be exploited remotely. It was removed from the release, and
  a rewritten implementation entered FreeBSD later. A protocol designed for
  simplicity still needs careful implementations.
- **Privacy for VPN providers.** WireGuard keeps each peer's last endpoint in
  memory and gives each user a fixed inner address, which is fine for a company
  network but awkward for a privacy VPN that promises not to keep logs.
  Providers built workarounds: NordVPN's NordLynx adds a layer of address
  translation on the server, and others assign addresses dynamically and wipe
  peer state after a short time.
- **Mesh networks.** Tailscale, Netbird and several Kubernetes network
  plugins build meshes of WireGuard tunnels between every pair of
  machines, which the protocol's small state makes cheap.
- **Configuration.** The configuration file is short, but its weak points are
  predictable: private keys left readable by all users, an `AllowedIPs` of
  `0.0.0.0/0` on a server peer (which lets that peer use any source address),
  and the PSK slot left empty where post-quantum protection was intended.

| | IPsec with IKEv2 | WireGuard |
| --- | --- | --- |
| Negotiation | proposals for every algorithm | none; versioned as a whole |
| Identities | certificates, PSK, EAP | static Curve25519 public keys |
| Handshake | 2 round trips | 1 round trip |
| Key rotation | about every hour by default | every 2 minutes |
| Silent to scanners | no: IKE answers on port 500 | yes |
| Roaming | MOBIKE extension | built in |
| Code size | hundreds of thousands of lines | about 4,000 lines in Linux |
| Standard | IETF RFCs | a whitepaper; no RFC |
| Post-quantum | ML-KEM in extra exchanges, or PPK | PSK slot filled by add-ons |
| Earth to Mars | possible with stretched timers | impossible |

## 8.12 Going deeper

*Level: expert.*

**Noise's security levels.** For each message payload of each pattern, the
Noise specification lists a source level (0: no authentication; 1: sender
authenticated, but vulnerable to KCI; 2: resistant to KCI) and a destination
level (0 to 5, from plaintext to encrypted to a forward-secret key with strong
assurance that only the intended recipient can decrypt). Nadim Kobeissi,
Georgio Nicolas and Karthikeyan Bhargavan's **Noise Explorer** (EuroS&P 2019)
generates ProVerif models for any pattern, and was used to check the tables
for dozens of patterns automatically. The tables are why WireGuard's KCI weakness in message 1 was known from
the start.

**Fallback and Noise Pipes.** An IK handshake fails if the initiator's cached
copy of the responder's static key is out of date. Noise Pipes, used by
WhatsApp, tries IK with a cached key and, if the responder cannot decrypt,
switches to an `XXfallback` handshake that reuses the initiator's ephemeral key,
so the attempt is not wasted. WireGuard has no fallback, because a peer with
the wrong key is a configuration error, not a cache miss.

**Why BLAKE2s, not SHA-256.** BLAKE2s works on 32-bit words and is fast on small
devices without SHA extensions; with ChaCha20, it gives WireGuard good speed on
phones and routers without any special hardware. The cost is a dependency on
primitives that, unlike AES and SHA-2, are not FIPS-approved, which keeps
WireGuard out of some government networks. Several vendors ship FIPS variants
of WireGuard-like tunnels that swap the primitives, which by WireGuard's own
rules makes them different protocols.

**The PSK position.** In `IKpsk2` the PSK enters at the end of message 2, after
all four DHs. Noise also allows `psk0` (at the start of message 1), which would
protect the initiator's identity against a quantum attacker as well. WireGuard
chose `psk2` so that message 1 can be processed, and the right peer and PSK
found, before the PSK is needed. A consequence is that a quantum attacker who
recovers the responder's private key from its public key can still decrypt the
initiator's identity from a recorded message 1, though not its traffic.

**A KEM-based Noise.** Noise's tokens assume Diffie-Hellman. Post-quantum KEMs
are not DH: one side encapsulates to the other's public key, and the result is
not symmetric. Proposals for **PQNoise** (Yawning Angel, Benjamin Dowling,
Andreas Hülsing, Peter Schwabe and Florian Weber, CCS 2022) add tokens such as
`ekem` and `skem` and re-derive the security tables. The difficulty that
appears is the one that drove PQ-WireGuard's design: a KEM ciphertext can only
be computed by the side that knows the recipient's public key, which changes
the order in which authentication can happen.

## Check yourself

??? question "1. What does WireGuard negotiate, and how will it ever change its algorithms?"
    Nothing. All peers use the same primitives and handshake. A change of
    algorithms would be a new protocol version with a different construction
    name and identifier string, which are hashed into every handshake, so old
    and new can never be confused or downgraded.

??? question "2. In Noise, what are the chaining key and the handshake hash, and what does each protect?"
    The chaining key absorbs every DH result (and PSK) through HKDF, so the
    final keys depend on all of them. The handshake hash absorbs the protocol
    name, prologue and every byte sent, and is the associated data of every
    handshake encryption, so any tampering makes the next decryption fail.

??? question "3. In Noise's tables, IK's first payload scores source 1, destination 2, and XX's third message scores 2, 5. What does each number mean here?"
    Source 1: the sender is authenticated through `ss`, so anyone who stole
    the recipient's static key can forge it (key compromise impersonation).
    Destination 2: the payload is readable only by the holder of the
    recipient's static key, but without forward secrecy against that key, and
    it can be replayed. XX's third message is authenticated through `se`,
    which resists KCI (source 2), and is encrypted with `ee` and `es` to an
    already authenticated responder (destination 5, strong forward secrecy).

??? question "4. How does a WireGuard responder detect a replayed initiation, and what does it need to store?"
    The initiation carries an encrypted TAI64N timestamp; the responder keeps
    the greatest timestamp seen for each peer and drops anything not newer. One
    timestamp per peer.

??? question "5. What is mac1 for, if anyone with the public key can compute it?"
    Silence and cheap filtering: a scanner that does not know the responder's
    public key cannot produce it, and WireGuard sends no reply to an invalid
    mac1, so the port looks closed. It is not authentication.

??? question "6. What does a cookie reply prove, and why is it bound to mac1?"
    That the initiator receives packets at the address and port it claims,
    letting the responder rate-limit per address. Binding it to mac1 stops an
    attacker from injecting cookie replies to disrupt someone else's handshake.

??? question "7. An attacker steals the responder's private key. What can it do with the first message, and why can it not finish?"
    It can forge an initiation that the responder accepts as from any known
    initiator, because $\mathrm{DH}(s_i, S_r) = \mathrm{DH}(s_r, S_i)$. It
    cannot derive the transport keys, which need $\mathrm{DH}(e_r, S_i)$ and so
    the initiator's private key, and its first data packet fails.

??? question "8. Why does identity hiding in WireGuard lack forward secrecy?"
    The initiator's static key is encrypted under a key from
    $\mathrm{DH}(e_i, S_r)$. Whoever later obtains the responder's static
    private key can recompute it from the recorded $E_i$ and decrypt the
    identity.

??? question "9. Rosenpass feeds WireGuard its PSK. What happens if Rosenpass stops producing keys, and what would a full break of Classic McEliece cost the tunnel?"
    If no fresh key arrives in time, Rosenpass overwrites the PSK with a random
    value and the tunnel stops: it fails closed rather than falling back to
    classical keys without anyone noticing. A McEliece break would let a
    quantum-capable attacker impersonate peers inside Rosenpass, whose
    authentication rests on McEliece alone, but the output key still depends on
    the fresh Kyber exchange, so recorded traffic stays safe while Kyber holds,
    and WireGuard's own X25519 authentication still protects against today's
    attackers.

??? question "10. At Mars's closest approach the laptop's twentieth initiation does get a response. Why does the handshake still fail, and what is the largest round trip any WireGuard handshake can survive?"
    The response to the last attempt arrives at $t = 459$ s and completes the
    laptop's side, but its confirming keepalive reaches the gateway at
    $t = 641$ s, when the gateway's keys (made at $t = 277$ s) are 364 s old,
    past Reject-After-Time. The gateway must see the confirmation within 180 s
    of answering, one round trip later, so no handshake survives a round trip
    of 180 s or more; anything over 5 s already depends on the last of the
    twenty attempts.

## What you learned

- WireGuard fixes its algorithms and timers, has no negotiation, and versions
  the protocol as a whole.
- Noise describes handshakes as token patterns over a chaining key and a
  handshake hash; WireGuard is `Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s` with an
  identifier prologue, in 148 and 92 bytes.
- NN, NK, XX and IK can be traced by hand: the tokens fix the message sizes,
  and the specification's tables grade each payload's authentication (source
  0 to 2) and confidentiality (destination 0 to 5) and each static key's
  identity hiding.
- Keys rotate every two minutes; only the initiator rekeys by age (120 s on
  send, 165 s on receive); keys are refused at 180 s; unanswered handshakes
  are replaced every 5 s; data packets carry a counter nonce and a receiver
  index; the first data packet confirms the keys.
- Cryptokey routing binds inner IP addresses to public keys for both sending
  and receiving; endpoints roam freely.
- mac1 makes WireGuard silent to scanners; under load, a 64-byte cookie reply
  (XChaCha20-Poly1305, bound to mac1) makes initiators prove their address
  through mac2 before any X25519 work is done.
- IK's first message is vulnerable to key compromise impersonation, but key
  confirmation stops the session; initiator identity hiding has no forward
  secrecy.
- Tamarin and CryptoVerif proofs cover secrecy and authentication; the clock
  (CVE-2021-46873), denial of service and the code lie outside them.
- Post-quantum protection comes through the PSK slot; Rosenpass fills it with
  a McEliece and Kyber exchange and fails closed, and the 2026 attacks on
  Classic McEliece weaken its authentication, not its secrecy.
- The fixed timers make WireGuard impossible across interplanetary delays: no
  handshake survives a round trip of 180 s, and Mars's is at least 364 s. A
  delay-tolerant design uses one-way patterns, scheduled keys, ratchets and
  counters instead.

**Next:** [Chapter 9](09-Wi-Fi-Security.md), the protocol that guards the
first hop: from WEP's failure to WPA3.

## Further reading

- Jason A. Donenfeld, "WireGuard: next generation kernel network tunnel"
  (NDSS 2017, revised 2020), especially §5 (protocol) and §6 (timers).
- Trevor Perrin, *The Noise Protocol Framework*, revision 34 (2018),
  noiseprotocol.org.
- Jason A. Donenfeld and Kevin Milner, "Formal verification of the WireGuard
  protocol" (Tamarin model 2017, report dated 2018).
- Benjamin Dowling and Kenneth G. Paterson, "A cryptographic analysis of the
  WireGuard protocol" (ACNS 2018).
- Benjamin Lipp, Bruno Blanchet and Karthikeyan Bhargavan, "A mechanised
  cryptographic proof of the WireGuard virtual private network protocol"
  (EuroS&P 2019).
- Nadim Kobeissi, Georgio Nicolas and Karthikeyan Bhargavan, "Noise Explorer:
  fully automated modeling and verification for arbitrary Noise protocols"
  (EuroS&P 2019).
- Andreas Hülsing, Kai-Chun Ning, Peter Schwabe, Florian Weber and Philip R.
  Zimmermann, "Post-quantum WireGuard" (IEEE S&P 2021).
- Yawning Angel, Benjamin Dowling, Andreas Hülsing, Peter Schwabe and Florian
  Weber, "Post quantum Noise" (CCS 2022).
- Guillaume Girol, Lucca Hirschi, Ralf Sasse, Dennis Jackson, Cas Cremers and
  David Basin, "A spectral analysis of Noise: a comprehensive, automated,
  formal analysis of Diffie-Hellman protocols" (USENIX Security 2020).
- The Rosenpass whitepaper (Karolin Varner, Benjamin Lipp, Wanja Zaeske, Lisa
  Schmidt and others; changelog through 2025) and its ProVerif models
  (rosenpass.eu).
- CVE-2021-46873, WireGuard's timestamp and the attacker-set clock (reported
  August 2021, published January 2023).
- Scott Arciszewski, "XChaCha: eXtended-nonce ChaCha and AEAD_XChaCha20_Poly1305",
  draft-irtf-cfrg-xchacha-03 (January 2020), with the HChaCha20 and AEAD test
  vectors used in §8.7.
- The WireGuard Linux sources, `drivers/net/wireguard/` (`messages.h` for the
  constants, `timers.c`, `send.c`, `receive.c`, `cookie.c`), for the rules in
  §8.5, §8.7 and §8.10.
- BSI, note on Classic McEliece (October 2026), and Chapter 13 of the
  Post-quantum book for the 2026 attacks.
- RFC 7748 (X25519), RFC 7693 (BLAKE2), RFC 8439 (ChaCha20-Poly1305), RFC 6479
  (anti-replay window), RFC 9171 and RFC 9172 (Bundle Protocol and BPSec, 2022),
  FIPS 203 (ML-KEM, 2024).
