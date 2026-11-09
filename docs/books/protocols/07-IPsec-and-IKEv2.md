# 7. IPsec and IKEv2

*TLS and SSH protect one connection that an application opens. IPsec protects
packets: every packet between two machines, or between two whole networks,
whatever program sent it. It is what joins a branch office to its head office,
what the VPN client built into Windows, macOS and iOS speaks, and what most
cloud providers offer when you link your network to theirs. This chapter takes
IPsec apart into its two halves. IKEv2 agrees on keys: you will run a whole
exchange, reproduce the key schedule of a real strongSwan connection byte for
byte, and build a binary message and its AUTH payload by hand. ESP then
carries the packets: you will encrypt one with AES-GCM and build its
anti-replay window, and see what rekeying does when both gateways start at
once or sit a 44-minute round trip apart. Then the history that gave IPsec its reputation for complexity,
the attacks on IKEv1 and on weak pre-shared keys, a backdoor in a firewall's
random number generator, and the post-quantum extensions.*

!!! abstract "In this chapter"
    **You will learn:**

    - why IPsec exists, and its parts: security associations, ESP and AH,
      transport and tunnel mode, and the key exchange IKE;
    - IKEv2's two exchanges, its key schedule (SKEYSEED and prf+) and its
      authentication, by computing them;
    - ESP's packet format, its AES-GCM nonce, sequence numbers and
      anti-replay window, and how a gateway cluster can repeat a nonce;
    - the bytes of an IKEv2 message and its AUTH payload, how traffic
      selectors are narrowed, and how SAs are rekeyed, including the rule
      that settles a collision;
    - how IPsec crosses NAT and firewalls;
    - how peers authenticate: pre-shared keys, certificates and EAP, and why a
      weak pre-shared key can be cracked offline;
    - the history of IKEv1 and the attacks on it, the Juniper Dual EC
      incident, and the case against encryption without integrity;
    - post-quantum IKEv2 with IKE_INTERMEDIATE, and what a 44-minute round
      trip does to IKE's timers.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (SIGMA, forward
    secrecy) and [Chapter 2](02-Certificates-and-PKI.md) for certificates;
    HMAC and AES-GCM from Chapters
    [10](../../book/10-Message-Authentication.md) and
    [8](../../book/08-Modes-of-Operation.md) of book 1.

    **Levels:** §7.1 to §7.3 are for beginners, §7.4 to §7.13 are
    intermediate, §7.14 is expert.

## 7.1 The problem

*Level: beginner.*

The Internet Protocol was designed to move packets, not to protect them. An IP
packet carries a source address, a destination address and some data, and any
router on the way can read the data, change it, or invent new packets with any
source address it likes. In the early 1990s, as companies began joining their
offices over the Internet instead of over leased lines, the obvious question
was whether security could be added to IP itself, once, so that every
application on top would be protected without being changed.

The first answer was **swIPe**, written by John Ioannidis and Matt Blaze in
1993: it wrapped IP packets in an encrypted, authenticated IP packet. The IETF
took the idea up, and in August 1995 published the first IPsec standards, RFCs
1825 to 1829, written mostly by Randall Atkinson. Those defined how to protect
packets, but not how two machines should agree on keys. That part took three
more years and produced **IKE**, the Internet Key Exchange (RFCs 2407 to 2409,
1998), one of the most complicated protocols the IETF has ever published. It
combined two earlier designs, Hilarie Orman's Oakley and the NSA-designed
ISAKMP framework, and offered eight ways to run its first phase.

In 1999 Niels Ferguson and Bruce Schneier published "A Cryptographic
Evaluation of IPsec". Their verdict was that IPsec was better than any other IP
security protocol available, but that its complexity was itself a security
problem: they could not tell whether it was secure, and they doubted anyone
could. They recommended removing options, removing transport mode and AH, and
simplifying IKE. The IETF answered with **IKEv2** (RFC 4306, December 2005;
the current text is RFC 7296, 2014), designed mostly by Charlie Kaufman with
Radia Perlman, Paul Hoffman and others. IKEv2 reduced the dance to two
exchanges of four messages. IPsec's packet formats were revised at the same
time (RFCs 4301 to 4303, 2005).

IPsec is therefore two protocols with very different jobs:

- **IKE** runs between the two machines once in a while, in UDP packets on port
  500. It negotiates algorithms, authenticates the peers and derives keys. It is
  a normal program, such as strongSwan or Libreswan, running on each side.
- **ESP**, the Encapsulating Security Payload, protects every packet, using the
  keys IKE left behind. It usually runs inside the operating system's kernel,
  where packets are routed.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of IPsec from swIPe in 1993 to post-quantum IKEv2 in 2023 to 2026" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="392" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1993</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">swIPe: Ioannidis and Blaze wrap IP in IP</text>
<text x="78" y="57" text-anchor="end" font-weight="bold">1995</text>
<circle cx="92" cy="52" r="3.5"/>
<text x="108" y="57">first IPsec RFCs (1825 to 1829), no key exchange</text>
<text x="78" y="87" text-anchor="end" font-weight="bold">1998</text>
<circle cx="92" cy="82" r="3.5"/>
<text x="108" y="87">IKEv1 (RFC 2409): Oakley plus ISAKMP</text>
<text x="78" y="117" text-anchor="end" font-weight="bold" class="acc-fill">1999</text>
<circle cx="92" cy="112" r="4.5" class="acc-fill"/>
<text x="108" y="117" class="acc-fill">Ferguson and Schneier: too complex to evaluate</text>
<text x="78" y="147" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="142" r="3.5"/>
<text x="108" y="147">IKEv2 (RFC 4306); ESP revised (RFC 4303); NAT traversal</text>
<text x="78" y="177" text-anchor="end" font-weight="bold" class="acc-fill">2007</text>
<circle cx="92" cy="172" r="4.5" class="acc-fill"/>
<text x="108" y="177" class="acc-fill">encryption-only ESP broken in practice</text>
<text x="78" y="207" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="202" r="3.5"/>
<text x="108" y="207">RFC 7296, IKEv2 an Internet Standard</text>
<text x="78" y="237" text-anchor="end" font-weight="bold" class="acc-fill">2015</text>
<circle cx="92" cy="232" r="4.5" class="acc-fill"/>
<text x="108" y="237" class="acc-fill">Juniper's Dual EC backdoor; Logjam and 1024-bit groups</text>
<text x="78" y="267" text-anchor="end" font-weight="bold" class="acc-fill">2016</text>
<circle cx="92" cy="262" r="4.5" class="acc-fill"/>
<text x="108" y="267" class="acc-fill">BENIGNCERTAIN leaks VPN keys from Cisco PIX</text>
<text x="78" y="297" text-anchor="end" font-weight="bold" class="acc-fill">2018</text>
<circle cx="92" cy="292" r="4.5" class="acc-fill"/>
<text x="108" y="297" class="acc-fill">key reuse attacks on IKEv1 and IKEv2</text>
<text x="78" y="327" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="322" r="3.5"/>
<text x="108" y="327">post-quantum pre-shared keys (RFC 8784)</text>
<text x="78" y="357" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="352" r="3.5"/>
<text x="108" y="357">multiple key exchanges (RFC 9370); IKEv1 made Historic</text>
<text x="78" y="387" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="382" r="3.5"/>
<text x="108" y="387">ML-KEM for IKEv2 approved by the IESG</text>
</svg>
<figcaption>Figure 7.1. Thirty years of IPsec. Accent marks the attacks and critiques that shaped it.</figcaption>
</figure>

## 7.2 The pieces

*Level: beginner.*

IPsec has its own vocabulary, and most of the confusion around it comes from
the words.

**Security association (SA).** A one-way agreement: "packets from A to B are
protected with this algorithm and this key". Each SA is named by a 32-bit
**Security Parameter Index** (SPI) chosen by the receiver, and carried in every
packet so the receiver can find the right key. A two-way tunnel needs two ESP
SAs. IKE has its own SA too, the **IKE SA**, which protects IKE's messages;
the ESP SAs it creates are called **child SAs**.

**Two databases.** The **Security Policy Database** (SPD) says which traffic
must be protected, which may pass in the clear and which is dropped, for
example "everything from 10.1.0.0/24 to 10.2.0.0/24 goes through IPsec". The
**Security Association Database** (SAD) holds the keys of the SAs currently
in use. When a packet leaves, the kernel looks it up in the SPD, finds or asks
IKE for an SA, and encrypts it.

**ESP and AH.** ESP encrypts and authenticates. AH, the Authentication Header,
only authenticates, but it also covers parts of the outer IP header. AH cannot
pass through NAT, because NAT changes the very addresses it protects, and ESP
with a null cipher does everything useful that AH did. RFC 8221 (2017) lets
implementations omit AH, and modern deployments use ESP only.

**Transport and tunnel mode.** In **transport mode**, ESP is inserted between
the IP header and the data, which protects the data between two hosts but
leaves the real addresses visible. In **tunnel mode**, the whole original
packet, header included, is encrypted and wrapped in a new IP packet between
two gateways. Tunnel mode is what a site-to-site VPN uses: an eavesdropper on
the Internet sees only that the two gateways are talking, not which machines
behind them are.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Packet layouts: an ordinary IP packet, the same packet in ESP transport mode, and in ESP tunnel mode with a new outer IP header" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">original packet</text>
<rect x="20" y="32" width="90" height="36" class="soft" stroke="currentColor"/><text x="65" y="55" text-anchor="middle">IP header</text>
<rect x="110" y="32" width="70" height="36" class="soft" stroke="currentColor"/><text x="145" y="55" text-anchor="middle">TCP</text>
<rect x="180" y="32" width="200" height="36" class="soft" stroke="currentColor"/><text x="280" y="55" text-anchor="middle">data</text>
<text x="20" y="102" font-weight="bold">transport mode (host to host)</text>
<rect x="20" y="112" width="90" height="36" class="soft" stroke="currentColor"/><text x="65" y="135" text-anchor="middle">IP header</text>
<rect x="110" y="112" width="80" height="36" class="soft" stroke="currentColor"/><text x="150" y="128" text-anchor="middle" font-size="12">ESP: SPI,</text><text x="150" y="142" text-anchor="middle" font-size="12">seq, IV</text>
<rect x="190" y="112" width="70" height="36" class="soft-acc" stroke="currentColor"/><text x="225" y="135" text-anchor="middle">TCP</text>
<rect x="260" y="112" width="200" height="36" class="soft-acc" stroke="currentColor"/><text x="360" y="135" text-anchor="middle">data</text>
<rect x="460" y="112" width="60" height="36" class="soft-acc" stroke="currentColor"/><text x="490" y="135" text-anchor="middle" font-size="12">trailer</text>
<rect x="520" y="112" width="60" height="36" class="soft" stroke="currentColor"/><text x="550" y="135" text-anchor="middle" font-size="12">tag</text>
<text x="20" y="182" font-weight="bold">tunnel mode (gateway to gateway)</text>
<rect x="20" y="192" width="80" height="36" class="soft" stroke="currentColor"/><text x="60" y="208" text-anchor="middle" font-size="12">new IP</text><text x="60" y="222" text-anchor="middle" font-size="12">header</text>
<rect x="100" y="192" width="70" height="36" class="soft" stroke="currentColor"/><text x="135" y="208" text-anchor="middle" font-size="12">ESP: SPI,</text><text x="135" y="222" text-anchor="middle" font-size="12">seq, IV</text>
<rect x="170" y="192" width="80" height="36" class="soft-acc" stroke="currentColor"/><text x="210" y="215" text-anchor="middle" font-size="12">IP header</text>
<rect x="250" y="192" width="55" height="36" class="soft-acc" stroke="currentColor"/><text x="277" y="215" text-anchor="middle">TCP</text>
<rect x="305" y="192" width="175" height="36" class="soft-acc" stroke="currentColor"/><text x="392" y="215" text-anchor="middle">data</text>
<rect x="480" y="192" width="60" height="36" class="soft-acc" stroke="currentColor"/><text x="510" y="215" text-anchor="middle" font-size="12">trailer</text>
<rect x="540" y="192" width="60" height="36" class="soft" stroke="currentColor"/><text x="570" y="215" text-anchor="middle" font-size="12">tag</text>
<text x="20" y="258" font-size="12.5">shaded: encrypted. The tag covers the ESP header and everything encrypted, never the outer IP header.</text>
</svg>
<figcaption>Figure 7.2. ESP in its two modes. Tunnel mode hides the original addresses inside the encryption; transport mode does not.</figcaption>
</figure>

## 7.3 IKEv2, by hand

*Level: beginner.*

An IKEv2 connection begins with two exchanges, each a request and a response.

<div class="mars-steps" markdown>

1. **IKE_SA_INIT (in the clear).** The initiator sends its SPI for the new IKE
   SA, a list of **proposals** (sets of algorithms it accepts), a Diffie-Hellman
   key share $KE_i$ and a random nonce $N_i$. The responder picks one proposal
   and returns its own SPI, key share $KE_r$ and nonce $N_r$.
2. **Keys.** Both compute the shared secret $g^{ir}$ and from it a seed:

   $$
   \mathrm{SKEYSEED} = \mathrm{prf}(N_i \,\|\, N_r,\; g^{ir}),
   $$

   then stretch the seed with **prf+**, a counter-mode expansion, into seven
   keys:

   $$
   \{SK_d, SK_{ai}, SK_{ar}, SK_{ei}, SK_{er}, SK_{pi}, SK_{pr}\} =
   \mathrm{prf{+}}(\mathrm{SKEYSEED},\; N_i \,\|\, N_r \,\|\, SPI_i \,\|\, SPI_r).
   $$

   $SK_d$ will derive the child SAs' keys; $SK_a$ and $SK_e$ (one per
   direction) protect IKE's own later messages; $SK_p$ goes into
   authentication. This is the extract-then-expand pattern that HKDF later
   named, ten years before HKDF.
3. **IKE_AUTH (encrypted with $SK_e$, authenticated with $SK_a$).** Each side
   sends its identity and an **AUTH** value: a signature, or a MAC with a
   pre-shared key, over three things: *its own first message*, *the peer's
   nonce*, and $\mathrm{prf}(SK_p, \text{its identity})$. The same exchange
   carries a proposal for the first child SA and the traffic it should cover.
4. **Child SA keys.** The ESP keys are
   $\mathrm{prf{+}}(SK_d,\; N_i \,\|\, N_r)$, cut into one key per direction.

</div>

Four messages, two round trips, and the tunnel is up. Every later operation,
such as a new child SA, a rekey or a liveness check, is another request and
response protected by the IKE SA.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="IKEv2 as a message sequence: IKE_SA_INIT request and response in the clear, key derivation, IKE_AUTH request and response encrypted, then ESP traffic" fill="currentColor" font-size="13.5">
<text x="110" y="22" text-anchor="middle" font-weight="bold">initiator</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">responder</text>
<line x1="110" y1="32" x2="110" y2="365" stroke="currentColor"/>
<line x1="530" y1="32" x2="530" y2="365" stroke="currentColor"/>
<line x1="110" y1="65" x2="526" y2="65" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,65 518,60 518,70"/>
<text x="320" y="57" text-anchor="middle">IKE_SA_INIT: SA proposals, KEᵢ, Nᵢ</text>
<line x1="530" y1="105" x2="114" y2="105" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,105 122,100 122,110"/>
<text x="320" y="97" text-anchor="middle">SA chosen, KEᵣ, Nᵣ</text>
<rect x="150" y="120" width="340" height="40" rx="4" class="soft-acc"/>
<text x="320" y="137" text-anchor="middle" class="acc-fill" font-size="12.5">SKEYSEED = prf(Nᵢ‖Nᵣ, gⁱʳ)</text>
<text x="320" y="153" text-anchor="middle" class="acc-fill" font-size="12.5">prf+ → SK_d, SK_a, SK_e, SK_p</text>
<line x1="110" y1="195" x2="526" y2="195" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="530,195 518,190 518,200" class="acc-fill"/>
<text x="320" y="187" text-anchor="middle">IKE_AUTH: {IDᵢ, AUTH, child SA proposal, TSᵢ, TSᵣ}</text>
<line x1="530" y1="240" x2="114" y2="240" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="110,240 122,235 122,245" class="acc-fill"/>
<text x="320" y="232" text-anchor="middle">{IDᵣ, AUTH, child SA chosen, TSᵢ, TSᵣ}</text>
<rect x="150" y="255" width="340" height="24" rx="4" class="soft-acc"/>
<text x="320" y="272" text-anchor="middle" class="acc-fill" font-size="12.5">ESP keys = prf+(SK_d, Nᵢ‖Nᵣ)</text>
<line x1="110" y1="310" x2="526" y2="310" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 4"/>
<line x1="114" y1="340" x2="530" y2="340" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 4"/>
<text x="320" y="302" text-anchor="middle">ESP packets, SPI chosen by the responder</text>
<text x="320" y="332" text-anchor="middle">ESP packets, SPI chosen by the initiator</text>
<text x="20" y="390" font-size="12.5">{ }: encrypted and authenticated with SK_e and SK_a   TS: traffic selectors (which subnets)</text>
</svg>
<figcaption>Figure 7.3. IKEv2's first two exchanges. The identities travel encrypted, so a passive eavesdropper does not learn who is connecting.</figcaption>
</figure>

The AUTH value is Chapter 1's SIGMA, and not by coincidence: Hugo Krawczyk
designed SIGMA ("SIGn-and-MAc") for IKE, and both IKEv1's signature mode and
IKEv2 follow it. Each side signs its own first message, which contains its key
share, and the peer's nonce, which proves the signature is fresh. The MAC under
$SK_p$ over its identity binds the identity to the keys of *this* exchange,
which is what stops the identity misbinding attack of Chapter 1: an attacker
cannot pass off someone else's signed exchange as its own, because the
identity is MACed with a key only the real participants have.

### Code it: one IKEv2 exchange

The program below runs both sides with X25519 (RFC 8031), the PRF
`PRF_HMAC_SHA2_256` and AES-256-GCM for IKE's own messages, and authenticates
with a pre-shared key. With an AEAD cipher there are no separate MAC keys, so
$SK_{ai}$ and $SK_{ar}$ are empty (RFC 5282), and each $SK_e$ is a 32-byte key
plus a 4-byte salt. The messages are stand-ins with the right contents rather
than the real binary format, which adds headers and payload types but no new
ideas.

```python
# One IKEv2 exchange (RFC 7296) with X25519 (RFC 8031) and a pre-shared key:
# IKE_SA_INIT, the seven keys, both AUTH values, and the first ESP keys.
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
        A, B = (x2 + z2) % P, (x2 - z2) % P
        C, D = (x3 + z3) % P, (x3 - z3) % P
        DA, CB, AA, BB = D * A % P, C * B % P, A * A % P, B * B % P
        x3, z3 = (DA + CB) ** 2 % P, x1 * (DA - CB) ** 2 % P
        x2, z2 = AA * BB % P, (AA - BB) * (AA + 121665 * (AA - BB)) % P
    if swap: x2, z2 = x3, z3
    return (x2 * pow(z2, P - 2, P) % P).to_bytes(32, "little")
G = (9).to_bytes(32, "little")
alice = bytes.fromhex("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
print("X25519 matches RFC 7748:", x25519(alice, G).hex() ==
      "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")

def prf(key, data): return hmac.new(key, data, hashlib.sha256).digest()   # PRF_HMAC_SHA2_256
def prf_plus(key, seed, n):                         # RFC 7296 section 2.13
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = prf(key, t + seed + bytes([i])); out += t; i += 1
    return out[:n]
seed = lambda label: hashlib.sha256(label.encode()).digest()   # fixed values: repeatable

# IKE_SA_INIT: SPIs, nonces and key shares travel in the clear.
spi_i, spi_r = seed("SPIi")[:8], seed("SPIr")[:8]
n_i, n_r = seed("Ni"), seed("Nr")
a, b = seed("initiator x25519"), seed("responder x25519")
KE_i, KE_r = x25519(a, G), x25519(b, G)
# (A real message is a header and typed payloads; this stand-in keeps every value.)
msg1 = spi_i + bytes(8) + b"SA:aes256gcm16-prfsha256-x25519" + KE_i + n_i
msg2 = spi_i + spi_r + b"SA:aes256gcm16-prfsha256-x25519" + KE_r + n_r

def ike_keys(n_i, n_r, g_ir):
    skeyseed = prf(n_i + n_r, g_ir)                 # section 2.14
    names = ["SK_d", "SK_ai", "SK_ar", "SK_ei", "SK_er", "SK_pi", "SK_pr"]
    sizes = [32, 0, 0, 36, 36, 32, 32]              # AES-256-GCM: no MAC keys; key + 4-byte salt
    stream, keys = prf_plus(skeyseed, n_i + n_r + spi_i + spi_r, sum(sizes)), {}
    for name, size in zip(names, sizes):
        keys[name], stream = stream[:size], stream[size:]
    return keys
k_init = ike_keys(n_i, n_r, x25519(a, KE_r))
k_resp = ike_keys(n_i, n_r, x25519(b, KE_i))
print("both sides have the same seven keys:", k_init == k_resp)

# IKE_AUTH (encrypted with SK_ei / SK_er): identities and AUTH (section 2.15).
PSK = b"correct horse battery staple, Arcadia gateway 1"
def auth(psk, own_msg, peer_nonce, sk_p, id_payload):
    signed_octets = own_msg + peer_nonce + prf(sk_p, id_payload)
    return prf(prf(psk, b"Key Pad for IKEv2"), signed_octets)
ID_i = bytes([2, 0, 0, 0]) + b"gw1.arcadia.mars"     # ID type 2 = FQDN
ID_r = bytes([2, 0, 0, 0]) + b"gw.earth-relay.example"
AUTH_i = auth(PSK, msg1, n_r, k_init["SK_pi"], ID_i)
AUTH_r = auth(PSK, msg2, n_i, k_resp["SK_pr"], ID_r)
print("responder checks AUTH_i:", hmac.compare_digest(AUTH_i, auth(PSK, msg1, n_r, k_resp["SK_pi"], ID_i)))
print("initiator checks AUTH_r:", hmac.compare_digest(AUTH_r, auth(PSK, msg2, n_i, k_init["SK_pr"], ID_r)))

# The first CHILD_SA: ESP keys from SK_d (section 2.17), 36 bytes per direction.
keymat = prf_plus(k_init["SK_d"], n_i + n_r, 72)
print("ESP key initiator->responder:", keymat[:32].hex()[:32] + "...", "salt", keymat[32:36].hex())
print("ESP key responder->initiator:", keymat[36:68].hex()[:32] + "...", "salt", keymat[68:72].hex())
```

```text
X25519 matches RFC 7748: True
both sides have the same seven keys: True
responder checks AUTH_i: True
initiator checks AUTH_r: True
ESP key initiator->responder: 54f8ede03d30314df81e096e1833960c... salt ea3b5055
ESP key responder->initiator: 236179d3fa2299b7b695e6641615df0f... salt c47f8614
```

The AUTH computation for a pre-shared key is

$$\mathrm{AUTH} = \mathrm{prf}\bigl(\mathrm{prf}(\text{PSK}, \texttt{"Key Pad for IKEv2"}),\;
\text{own first message} \,\|\, \text{peer's nonce} \,\|\, \mathrm{prf}(SK_p, \mathrm{ID})\bigr).$$

With a certificate, the same octets are signed with the private key instead.
§7.11 builds these octets from a real binary message and computes the AUTH
payload byte by byte.

### Code it: a real connection

The previous version of this page on the site ran two strongSwan 5.9.13 daemons
in separate Linux network namespaces with a pre-shared key and the default
proposals, which chose P-256 for the key exchange, AES-128-CBC with
HMAC-SHA-256 for IKE, and AES-GCM for ESP. `swanctl --list-sas` showed:

```text
demo: #1, ESTABLISHED, IKEv2, ab2f5674aebd0a70_i* 9c8ff1491c87f22e_r
  local  'left' @ 198.51.100.1[4500]
  remote 'right' @ 198.51.100.2[4500]
  AES_CBC-128/HMAC_SHA2_256_128/PRF_HMAC_SHA2_256/ECP_256
  established 9s ago, rekeying in 14003s
  demo: #1, reqid 1, INSTALLED, TUNNEL-in-UDP, ESP:AES_GCM_16-128
    installed 9s ago, rekeying in 3409s, expires in 3951s
    in  cb4d73cf,    252 bytes,     3 packets,     0s ago
    out b9697120,    252 bytes,     3 packets,     0s ago
    local  10.1.0.0/24
    remote 10.2.0.0/24
```

With charon's key logging turned on (the `ike = 4` level, which writes every
secret to the log and must never be used on a real gateway), the nonces and
the shared secret can be read off and fed to the same key schedule. The SPIs
are on the first line above.

```python
# The same key schedule on a real run: values logged by strongSwan 5.9.13
# (two charon daemons, Oct 2026), PRF_HMAC_SHA2_256, AES-128-CBC with HMAC-SHA-256.
import hashlib, hmac
def prf(key, data): return hmac.new(key, data, hashlib.sha256).digest()
def prf_plus(key, seed, n):
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = prf(key, t + seed + bytes([i])); out += t; i += 1
    return out[:n]
ni = bytes.fromhex("d5768aee3aee7ae047fbfd344ff7b95fc97c12878db1ed9b1eade85d7bb2be72")
nr = bytes.fromhex("26cd9a04530a0cd934d3e230f6c2a635e791229f10eb343545a5d1f8796c4310")
spis = bytes.fromhex("ab2f5674aebd0a70" "9c8ff1491c87f22e")
gir = bytes.fromhex("824df0a445aec6e2f87f43b187ee7b013218114ed115f737e0751ea666a6342f")
skeyseed = prf(ni + nr, gir)
print("SKEYSEED", skeyseed.hex())
sizes = {"SK_d": 32, "SK_ai": 32, "SK_ar": 32, "SK_ei": 16, "SK_er": 16, "SK_pi": 32, "SK_pr": 32}
keys = prf_plus(skeyseed, ni + nr + spis, sum(sizes.values()))
for name, size in sizes.items():
    print(f"{name:8}", keys[:size].hex()); keys = keys[size:]
```

```text
SKEYSEED 089713ac2b394ef3fbc5e745159bea5842f2134377d18e23b1ea80cd7a27b7fb
SK_d     ee79b21c44fdd36d0eb60451a90f931d03fc2a5219bda6aeb7ebe52cd1b4745d
SK_ai    ef6125d3ff9d7f43e62752ee30b641db4fc599000ff9bd46d5bf6c3905800c83
SK_ar    3410c7e9f7ec4f821934fddcbbc74659fa0aaf610874984126bc294ba8d2f430
SK_ei    d85bafc87c4594299458f490bcbc07d1
SK_er    119786f33ae5e511e209cb23be71d544
SK_pi    31f0880d29ca366cb69fde94122581edfbcc0da649346af18205056fb4c86e5a
SK_pr    33c5c666ff4827d0f73c7d685fee65b90b01b4c65ea860a65340848b8295e0eb
```

Every line matches what the initiator's daemon logged as `SKEYSEED` and
`Sk_d secret` through `Sk_pr secret`. With HMAC-SHA-256 as the integrity
algorithm, the $SK_a$ keys are 32 bytes; with AES-128-CBC, the $SK_e$ keys are
16. Line two of the output above also shows the lifetimes: the IKE SA is
rekeyed every four hours or so, the child SA about every hour, with some
random jitter so that the two sides do not both start a rekey at the same
moment.

## 7.4 ESP packets

*Level: intermediate.*

An ESP packet (RFC 4303) has a small header and a trailer:

| Field | Size |
| --- | --- |
| SPI | 4 bytes, chosen by the receiver |
| sequence number | 4 bytes, starting at 1 |
| IV | 8 bytes for AES-GCM and ChaCha20-Poly1305 |
| encrypted payload | the inner packet (tunnel mode) or its data (transport mode) |
| padding, pad length, next header | encrypted with the payload |
| integrity check value | 16 bytes for AES-GCM |

The tcpdump line for one ping in the strongSwan tunnel above was
`ESP(spi=0xb9697120,seq=0x4), length 120`: 8 bytes of SPI and sequence number,
an 8-byte IV, the 84-byte inner packet, 4 bytes of padding and trailer, and the
16-byte tag. The overhead was 36 bytes on an 84-byte packet, plus the outer IP
and UDP headers.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="A 120-byte ESP packet drawn to scale: 8 bytes of SPI and sequence number, an 8-byte IV, the 84-byte encrypted ping, 4 bytes of padding and trailer, and a 16-byte tag" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">one ping inside ESP: 120 bytes, to scale</text>
<rect x="20" y="50" width="40" height="50" class="soft" stroke="currentColor"/><text x="40" y="44" text-anchor="middle" font-size="12">SPI+seq</text><text x="40" y="120" text-anchor="middle">8</text>
<rect x="60" y="50" width="40" height="50" class="soft" stroke="currentColor"/><text x="80" y="80" text-anchor="middle" font-size="12">IV</text><text x="80" y="120" text-anchor="middle">8</text>
<rect x="100" y="50" width="420" height="50" class="soft-acc" stroke="currentColor"/><text x="310" y="80" text-anchor="middle">encrypted inner packet (the ping)</text><text x="310" y="120" text-anchor="middle">84</text>
<rect x="520" y="50" width="20" height="50" class="soft-acc" stroke="currentColor"/><text x="530" y="44" text-anchor="middle" font-size="12">pad</text><text x="530" y="120" text-anchor="middle">4</text>
<rect x="540" y="50" width="80" height="50" class="soft" stroke="currentColor"/><text x="580" y="80" text-anchor="middle">tag</text><text x="580" y="120" text-anchor="middle">16</text>
<line x1="100" y1="145" x2="540" y2="145" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="320" y="162" text-anchor="middle" font-size="12.5" class="acc-fill">AES-GCM encrypts these</text>
<line x1="20" y1="180" x2="540" y2="180" stroke="currentColor" stroke-width="2"/>
<text x="320" y="198" text-anchor="middle" font-size="12.5">the tag authenticates all of these</text>
</svg>
<figcaption>Figure 7.4. A real ESP packet from the strongSwan run, drawn to scale. The SPI and sequence number are authenticated but not encrypted, because the receiver needs them to find the key and to check for replays.</figcaption>
</figure>

**The nonce.** AES-GCM in ESP (RFC 4106) uses a 12-byte nonce made of a
4-byte **salt**, which comes from the key material and never changes, and the
8-byte IV sent in each packet. The IV must never repeat under one key, and the
simplest way to guarantee that is to use the sequence number as the IV, which
is what most implementations do. RFC 8750 (2020) goes one step further and
lets the sender omit the IV from the packet altogether, since the receiver can
rebuild it from the sequence number; it saves 8 bytes per packet, which
matters on small sensor networks.

**Sequence numbers.** The 32-bit sequence number starts at 1 and goes up by
one for each packet; it must never wrap, so an SA has to be replaced before
about four billion packets. At ten gigabits per second that takes about an
hour and a half with full-size packets and under five minutes with the
smallest, so RFC 4304 added **extended sequence numbers**
(ESN): 64 bits, of which only the low 32 travel in the packet, while the high
32 are tracked by both ends and included in the integrity check.

**Anti-replay.** Packets on the Internet can arrive out of order, so the
receiver cannot simply insist on increasing numbers. It keeps a **window**: the
highest number seen so far and a bitmap of which of the numbers just below it
have arrived. A packet newer than the top slides the window; one inside the
window is accepted once; one below the window is dropped. The check must come
*after* the integrity check, or an attacker could slide the window forward
with forged packets and make the receiver drop real ones.

### Code it: the anti-replay window

```python
# ESP's anti-replay window (RFC 4303 section 3.4.3): accept each sequence number
# once, allow some reordering, drop anything older than the window.
class ReplayWindow:
    def __init__(self, size=64):
        self.size, self.top, self.bits = size, 0, 0     # bit i set = (top - i) seen
    def check_and_update(self, seq):                    # call only after the tag checks
        if seq == 0:
            return "drop (0 is never sent)"
        if seq > self.top:                              # new highest: slide the window
            shift = seq - self.top
            self.bits = ((self.bits << shift) | 1) & ((1 << self.size) - 1)
            self.top = seq
            return "accept"
        offset = self.top - seq
        if offset >= self.size:
            return "drop (too old)"
        if self.bits >> offset & 1:
            return "drop (replay)"
        self.bits |= 1 << offset
        return "accept (late, inside window)"

w = ReplayWindow()
for seq in [1, 2, 3, 5, 4, 5, 200, 150, 137, 136, 3]:
    print(f"seq {seq:3d}: {w.check_and_update(seq)}")
```

```text
seq   1: accept
seq   2: accept
seq   3: accept
seq   5: accept
seq   4: accept (late, inside window)
seq   5: drop (replay)
seq 200: accept
seq 150: accept (late, inside window)
seq 137: accept (late, inside window)
seq 136: drop (too old)
seq   3: drop (too old)
```

Packet 4 arrived after 5 and was still accepted. Packet 136 was dropped even
though it was never seen, because it fell more than 64 places behind the top;
that is the price of a fixed window. Fast links with many parallel paths
reorder more, and Linux allows windows of thousands of packets.

### By hand: the AES-GCM nonce and what the tag covers

Take the ping from the strongSwan run, SPI `b9697120`, sequence number 4, and
encrypt it with AES-128-GCM under an example key and the example salt
`cafebabe` (in a real SA both are cut from the child SA's keying material,
key first, then four salt bytes).

<div class="mars-steps" markdown>

1. **IV**: the sequence number as 8 bytes, `00 00 00 00 00 00 00 04`, sent in
   the clear.
2. **Nonce**: salt then IV, `ca fe ba be 00 00 00 00 00 00 00 04`. GCM adds a
   4-byte block counter; block 1 masks the tag, blocks 2 onward make the
   keystream.
3. **Plaintext**: the 84-byte inner packet, then the trailer, which must end
   on a 4-byte boundary. 84 + 2 = 86, so two padding bytes are needed, and by
   default they count up from 1. The trailer is `01 02 02 04`: padding, pad
   length 2, next header 4 (IPv4). That makes 88 bytes.
4. **Additional data**: SPI and sequence number, `b9 69 71 20 00 00 00 04`.
   With extended sequence numbers it is 12 bytes, SPI, high half, low half,
   which is how the high half is authenticated without being sent.
5. **Tag**: GHASH over the additional data, the ciphertext and their lengths,
   masked with counter block 1; 16 bytes.

</div>

The IV is not in the additional data and need not be: changing it changes
the nonce, and the tag check fails.

### Code it: an ESP packet with AES-GCM

The program has AES-128 (book 1's [Chapter 6](../../book/06-Block-Ciphers.md))
and GCM in a few dozen lines, checks them against test case 2 of McGrew and
Viega's GCM specification, and builds the packet of Figure 7.4: a ping from
10.1.0.23 to 10.2.0.9, checksums left at zero.

```python
# One ESP packet with AES-128-GCM (RFC 4106), from a small pure-Python AES and GCM.
# AES and GCM are checked first against test case 2 of the GCM specification.
def xt(a): return ((a << 1) ^ 0x11B) & 0xFF if a & 0x80 else a << 1
def mul(a, b):
    r = 0
    while b:
        if b & 1: r ^= a
        a, b = xt(a), b >> 1
    return r
SBOX = []
for x in range(256):
    inv = next((y for y in range(1, 256) if mul(x, y) == 1), 0)
    s = inv
    for k in range(1, 5): s ^= ((inv << k) | (inv >> (8 - k))) & 0xFF
    SBOX.append(s ^ 0x63)
def aes128(key, block):
    w, rc = [list(key[i:i + 4]) for i in range(0, 16, 4)], 1
    for i in range(4, 44):
        t = list(w[i - 1])
        if i % 4 == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]; t[0] ^= rc; rc = xt(rc)
        w.append([a ^ b for a, b in zip(w[i - 4], t)])
    s = [b ^ k for b, k in zip(block, sum(w[:4], []))]
    for r in range(1, 11):
        s = [SBOX[b] for b in s]
        s = [s[(i + 4 * (i % 4)) % 16] for i in range(16)]           # ShiftRows
        if r < 10:                                                   # MixColumns
            s = [mul(s[4 * (i // 4) + (i + k) % 4], m) for i in range(16) for k, m in
                 enumerate((2, 3, 1, 1))]
            s = [s[4 * i] ^ s[4 * i + 1] ^ s[4 * i + 2] ^ s[4 * i + 3] for i in range(16)]
        s = [b ^ k for b, k in zip(s, sum(w[4 * r:4 * r + 4], []))]
    return bytes(s)
def gf128(x, y):                                     # multiply in GCM's field
    z, R = 0, 0xE1 << 120
    for i in range(127, -1, -1):
        if y >> i & 1: z ^= x
        x = (x >> 1) ^ R if x & 1 else x >> 1
    return z
def gcm(key, nonce, plain, aad):
    h = int.from_bytes(aes128(key, bytes(16)), "big")
    ctr = lambda i: aes128(key, nonce + i.to_bytes(4, "big"))
    ct = b"".join(bytes(a ^ b for a, b in zip(plain[j:j + 16], ctr(2 + j // 16)))
                  for j in range(0, len(plain), 16))
    pad = lambda d: d + bytes(-len(d) % 16)
    data, y = pad(aad) + pad(ct) + (8 * len(aad)).to_bytes(8, "big") + (8 * len(ct)).to_bytes(8, "big"), 0
    for j in range(0, len(data), 16):
        y = gf128(y ^ int.from_bytes(data[j:j + 16], "big"), h)
    return ct, bytes(a ^ b for a, b in zip(y.to_bytes(16, "big"), ctr(1)))
ct, tag = gcm(bytes(16), bytes(12), bytes(16), b"")
print("GCM test case 2:", ct.hex() == "0388dace60b6a392f328c2b971b2fe78" and
      tag.hex() == "ab6e47d42cec13bdf53a67b21257bddf")

# The ESP packet: SPI and sequence number from the strongSwan run; an example key
# and salt (in a real SA, 16 key bytes then 4 salt bytes cut from KEYMAT).
key, salt = bytes.fromhex("feffe9928665731c6d6a8f9467308308"), bytes.fromhex("cafebabe")
spi, seq = 0xB9697120, 4
inner = bytes.fromhex("4500005400004000400100000a0100170a020009") + bytes([8, 0]) + bytes(62)
trailer = bytes([1, 2]) + bytes([2, 4])              # padding 1, 2; pad length 2; next header 4 (IPv4)
header = spi.to_bytes(4, "big") + seq.to_bytes(4, "big")
iv = seq.to_bytes(8, "big")                          # the sequence number doubles as the IV
nonce = salt + iv
ct, tag = gcm(key, nonce, inner + trailer, header)   # AAD = SPI | sequence number
packet = header + iv + ct + tag
print("nonce:", nonce.hex(), " AAD:", header.hex())
print("ESP packet:", len(packet), "bytes =", len(header), "+", len(iv), "+", len(ct), "+", len(tag))
print("first 24 bytes:", packet[:24].hex(" ", 4))
```

It prints:

```text
GCM test case 2: True
nonce: cafebabe0000000000000004  AAD: b969712000000004
ESP packet: 120 bytes = 8 + 8 + 88 + 16
first 24 bytes: b9697120 00000004 00000000 00000004 4b726e8b 89b895e0
```

The length is the 120 bytes tcpdump reported. The sequence number appears
twice in the first 16 bytes, in the header and as the IV, which is the waste
RFC 8750's implicit IV removes. Neither copy is secret; the nonce only has to
be *unique*.

### Break it: one sequence number, two packets

Uniqueness is easy for one gateway, hard for two sharing an SA. In a
**high-availability pair** the active gateway copies its SA state to a standby
that takes over if it fails, with no new IKE exchange. The copies are made
every so often, so after a failover the standby's counter is behind, and it
resends sequence numbers, and so nonces, already used.

```python
# Uses gcm(), key, salt, spi, header, inner, trailer and packet from the listing above.
# Break it: a standby gateway takes over the SA from a stale copy of its state
# and sends sequence number 4 again, so the same nonce encrypts a new packet.
secret = (bytes.fromhex("4500005400004000400600000a0100170a020009") +
          b"login ops / password dust-storm-7 / site=arcadia-west / ...".ljust(64, b"."))
ct2, tag2 = gcm(key, salt + (4).to_bytes(8, "big"), secret + trailer, header)
ct1 = packet[16:-16]                                 # the earlier packet's ciphertext
known = inner + trailer                              # an eavesdropper guesses a ping
leak = bytes(a ^ b ^ c for a, b, c in zip(ct1, ct2, known))
print("recovered:", leak[20:84].decode())
```

It prints:

```text
recovered: login ops / password dust-storm-7 / site=arcadia-west / ........
```

Two ciphertexts under one nonce XOR to the XOR of the plaintexts, so one
guessable packet gives away the other. The receiver drops the second packet as
a replay, but an eavesdropper has already seen both. Two tags under one nonce
also reveal GCM's hash key, the "forbidden attack" of
[Cryptanalysis §10.7](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md#107-the-forbidden-attack-gcms-key-as-a-root).

**Fix it.** RFC 6311 (2011) has the newly active member and its peer each skip
their ESP counters forward by a large number after a failover, and
resynchronize IKE's message IDs in the same exchange; skipping is safe because
IPsec always let a sender skip counter values. The general rule is RFC 4106's:
the IV must not repeat under one key, and anything that copies state, a
cluster, a virtual machine snapshot, a restored backup, can make it repeat.

## 7.5 Crossing NAT and firewalls

*Level: intermediate.*

IPsec was designed for an Internet in which each machine had its own address.
By the time it was deployed, most homes and offices sat behind **network
address translation** (NAT), where a router rewrites private addresses such as
10.1.0.23 into one public address and changes port numbers to tell its users
apart. ESP has no port numbers, so a NAT cannot tell whose ESP packet is whose;
and a NAT that changes addresses in transport mode would break the TCP
checksums inside.

The fix, **NAT traversal** (RFCs 3947 and 3948, 2005), has two parts. First,
each side detects whether there is a NAT between them. In IKE_SA_INIT each side
sends a hash of the address and port it believes it is using, and compares the
peer's hash with what it actually sees.

```python
# NAT detection (RFC 7296 section 2.23): each side hashes the addresses it
# believes it is using; a mismatch means a NAT rewrote them on the way.
import hashlib, ipaddress, struct
def nat_hash(spi_i, spi_r, ip, port):
    return hashlib.sha1(spi_i + spi_r + ipaddress.ip_address(ip).packed +
                        struct.pack(">H", port)).digest()
spi_i, spi_r = bytes.fromhex("ab2f5674aebd0a70"), bytes(8)       # SPIr is zero in IKE_SA_INIT
# The habitat laptop sits behind the city's NAT; it sends its own view.
sent = nat_hash(spi_i, spi_r, "10.1.0.23", 500)
# The gateway sees the packet arrive from the NAT's public address and port.
seen = nat_hash(spi_i, spi_r, "203.0.113.40", 61002)
print("NAT_DETECTION_SOURCE_IP:", sent.hex())
print("hash of what arrived:   ", seen.hex())
print("NAT between us:", sent != seen, "-> move to UDP port 4500, send keepalives")
```

```text
NAT_DETECTION_SOURCE_IP: 4a7d98bb542abcf7bb07596ff0929feff8b45865
hash of what arrived:    2869094a7153a9e633d3be09925aa027342cb261
NAT between us: True -> move to UDP port 4500, send keepalives
```

Second, when a NAT is found, both sides move IKE to UDP port 4500 and wrap
every ESP packet in a UDP header on the same port, so the NAT can track it like
any other UDP flow. The client also sends a small **keepalive** packet every
20 seconds or so, because a NAT forgets idle mappings. This was the
`TUNNEL-in-UDP` in the strongSwan output.

Two more extensions deal with hostile networks:

- **IKE fragmentation** (RFC 7383, 2014). IKE_AUTH messages carry certificate
  chains and can exceed the path's packet size. Many networks drop IP
  fragments, so IKE splits its own messages into encrypted pieces instead.
  IKE_SA_INIT cannot be fragmented this way, because it is sent before there
  are keys, which matters for post-quantum key shares (§7.9).
- **IKE and ESP over TCP** (RFC 8229, 2017, updated by RFC 9329). Hotel and
  airport networks often block all UDP except DNS. The client can then run
  IKE and ESP inside one TCP connection, if necessary on port 443 inside TLS,
  so that it looks like web traffic. It is slower, since lost TCP segments hold
  up every packet behind them, and is used only as a last resort.

A third, **MOBIKE** (RFC 4555, 2006), lets a phone keep its IKE SA when it moves
from Wi-Fi to a mobile network and its address changes. The client tells the
gateway its new address over the existing SA, and the tunnel continues without
a new key exchange. This is why the IKEv2 VPN on a phone survives walking out
of the house.

## 7.6 Who are you? Authentication

*Level: intermediate.*

IKEv2 offers three ways for peers to prove who they are, and they can be mixed:
the gateway can use a certificate while the client uses something else.

**Pre-shared keys (PSK).** Both ends know the same secret. This is simple for
two gateways configured by the same administrator, and a disaster when the
"key" is a password. The AUTH value is a MAC computed from the PSK and the
exchange, so anyone who obtains one AUTH value, and knows the rest of the
exchange, can test candidate passwords against it without sending another
packet. A passive eavesdropper cannot do this, because IKE_AUTH is encrypted.
But an **active** attacker can: it answers the victim's IKE_SA_INIT itself,
completes the Diffie-Hellman exchange with the victim, so it can decrypt
IKE_AUTH, and receives the victim's AUTH value. The initiator always sends its
AUTH first, before it has seen any proof from the responder.

### Break it: cracking a weak pre-shared key offline

```python
# Break it: an attacker who answers IKE_SA_INIT in the responder's place gets
# the initiator's AUTH, and can then test passwords offline. The key schedule
# and AUTH are those of the first listing in section 7.3.
import hashlib, hmac
def prf(key, data): return hmac.new(key, data, hashlib.sha256).digest()
def prf_plus(key, seed, n):
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = prf(key, t + seed + bytes([i])); out += t; i += 1
    return out[:n]
def auth(psk, own_msg, peer_nonce, sk_p, id_payload):
    return prf(prf(psk, b"Key Pad for IKEv2"), own_msg + peer_nonce + prf(sk_p, id_payload))

# The victim sends Alice's key share from RFC 7748's X25519 example; the attacker
# answers with Bob's, so both hold that example's shared secret.
KE_i = bytes.fromhex("8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")
g_ir = bytes.fromhex("4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742")
spi_i, spi_r = bytes.fromhex("ab2f5674aebd0a70"), bytes.fromhex("5eed5eed5eed5eed")
n_i, n_r = hashlib.sha256(b"Ni").digest(), hashlib.sha256(b"Nr").digest()
msg1 = spi_i + bytes(8) + b"SA:aes256gcm16-prfsha256-x25519" + KE_i + n_i
stream = prf_plus(prf(n_i + n_r, g_ir), n_i + n_r + spi_i + spi_r, 168)
SK_pi = stream[104:136]                 # after SK_d (32), no SK_a, SK_ei and SK_er (36 each)
ID_i = bytes([2, 0, 0, 0]) + b"gw1.arcadia.mars"
weak_psk = b"arcadia2026"
captured = auth(weak_psk, msg1, n_r, SK_pi, ID_i)    # decrypted from the victim's IKE_AUTH

words = ["password", "arcadia", "mars2026", "letmein", "olympus", "gateway1",
         "arcadia2026", "redplanet"] + ["guess%05d" % i for i in range(20000)]
for tries, w in enumerate(words, 1):                  # offline: no more packets needed
    if auth(w.encode(), msg1, n_r, SK_pi, ID_i) == captured:
        print("PSK found after", tries, "guesses:", w)
        break
print("the same attack on a random 32-byte PSK: 2^256 guesses")
```

```text
PSK found after 7 guesses: arcadia2026
the same attack on a random 32-byte PSK: 2^256 guesses
```

The attack needs one connection attempt and then no further contact. Nothing
about the Diffie-Hellman group or the cipher helps, because the attacker took
part in the exchange. The only defense is a PSK with real entropy: 32 random
bytes, not a phrase. Remote-access VPNs with one PSK shared among all
employees, sometimes called a "group password", are worse still: any employee
who knows it can impersonate the gateway to the others.

**Certificates.** Each side signs the AUTH octets with a private key and sends
its certificate, and the peer checks the chain against a trusted CA
(Chapter 2). Since RFC 7427 (2015), IKEv2 can use any signature algorithm,
including RSA-PSS, ECDSA and Ed25519 (RFC 8420), and name its hash. For
site-to-site tunnels, organizations usually run their own CA; public web CAs
are not used, because the identities in IPsec are not web names.

**EAP.** For remote access, the user rarely has a certificate. IKEv2 can carry
the **Extensible Authentication Protocol** inside IKE_AUTH: the gateway proves
itself with a certificate, and the user then answers an EAP method, such as
EAP-MSCHAPv2 (a password, common with Windows servers), EAP-TLS (a client
certificate) or a one-time code. The EAP method produces a key that goes into
the final AUTH value, so the result is bound to the IKE SA. This is how the
built-in VPN clients of Windows, macOS and iOS log users in. RFC 6467 and the
"secure password" methods offer password authentication that resists the
offline attack above, but they are rarely deployed.

## 7.7 IKEv1, and why it was retired

*Level: intermediate.*

IKEv1 ran in two phases. **Phase 1** set up the IKE SA in either **main mode**
(six messages, identities encrypted) or **aggressive mode** (three messages,
identities in the clear). Each mode came in four authentication variants: a
pre-shared key, signatures, and two variants of public-key *encryption* in
which each side encrypted its nonce with the other's RSA key. **Phase 2**
("quick mode") then set up the ESP SAs, three more messages. Eight variants of
phase 1 times the options of ISAKMP's payload framework made a protocol that
was hard to implement, hard to configure and hard to analyze, which was
Ferguson and Schneier's point.

Three of its weaknesses became attacks:

- **Aggressive mode with a PSK** sends a hash keyed with the PSK in the
  responder's *first* reply, in the clear. Anyone who sends one aggressive-mode
  request with a plausible identity gets a value to crack offline, without
  even being in the path; the attack is the one above, but passive and
  unauthenticated. Tools such as `ike-scan` and `psk-crack` automated it in the
  early 2000s, and VPN gateways that allowed aggressive mode were broken by
  password guessing for two decades.
- **Bleichenbacher oracles in the encryption modes.** In 2018 Dennis Felsch,
  Martin Grothe, Jörg Schwenk, Adam Czubak and Marcin Szymanek showed that the
  RSA-encrypted nonce modes of IKEv1 in Cisco, Huawei, Clavister and ZyXEL
  devices leaked PKCS #1 v1.5 padding errors (Chapter 4's Bleichenbacher
  attack). Worse, the same RSA key was usually used for IKEv1 encryption and for
  IKEv2 *signatures*, so the oracle could be used to forge an IKEv2 signature
  and impersonate the gateway. Key reuse across protocol versions undid the
  newer protocol's security. They also showed offline dictionary attacks on
  PSKs in IKEv1 main mode and IKEv2.
- **Weak groups by default.** IKEv1 deployments long defaulted to Oakley group
  2, a 1024-bit Diffie-Hellman group, or even group 1 (768 bits). See §7.8.

RFC 9395 (2023) moved IKEv1 to Historic status. strongSwan 6.1 turns it off by
default. It is still found in old site-to-site configurations, usually because
the other end was never upgraded.

## 7.8 Attacks and incidents

*Level: intermediate.*

**Encryption without integrity.** The early IPsec standards allowed ESP with
encryption only, on the argument that integrity could come from elsewhere,
such as AH or the inner protocol. Kenneth Paterson and Arnold Yau (2006), and
then Jean Paul Degabriele and Paterson (2007), showed that this was fatal in
practice: by flipping bits in a CBC-encrypted tunnel-mode packet so that the
inner IP header became invalid in a chosen way, an attacker made the receiving
gateway send back an ICMP error message *containing the decrypted inner
packet*, or route the decrypted packet somewhere else. They recovered plaintext
from the Linux kernel's IPsec. In 2010 they showed attacks on some
MAC-then-encrypt configurations too. RFC 8221 now requires that ESP without
integrity never be used, and AEAD ciphers make the question disappear.

**Logjam and 1024-bit groups** (2015). David Adrian and thirteen co-authors
showed that breaking discrete logarithms for one 1024-bit prime takes a huge
precomputation, but after that each individual exchange is cheap, and that
most IPsec VPNs used the *same* standard 1024-bit prime, Oakley group 2. They
estimated that one precomputation for that prime, within reach of a national
agency, would allow passive decryption of connections to about two-thirds of
the IPsec VPN servers they measured, and pointed out that this fits leaked NSA documents describing
large-scale VPN decryption. Whether it is how those documents' results were
obtained is unknown. RFC 8247 makes the 2048-bit group 14 and the elliptic
curve group 19 the minimum.

**Juniper's Dual EC** (2015). In December 2015 Juniper announced that
"unauthorized code" had been found in ScreenOS, the software of its NetScreen
firewalls. One part was a backdoor password. The other was more subtle: a
single constant in the random number generator had been changed. ScreenOS used
the Dual EC generator, which is secure only if nobody knows the hidden
relation between its two elliptic-curve points; whoever chooses the second
point, Q, can predict the output from a small sample of it ([Chapter 4 of book
1](../../book/04-Randomness-and-Perfect-Secrecy.md) tells the Dual EC story). Juniper had chosen its own Q, and in 2012 someone with access to
Juniper's source code replaced it with one of their own. Stephen Checkoway and
colleagues (CCS 2016) worked out the rest: because of a separate coding error,
the generator's raw Dual EC output was exposed, and IKE sent enough of it in
the clear, in its nonces, for the holder of the new Q's secret to recover the
Diffie-Hellman private keys and decrypt the VPN traffic passively. Who changed
the constant has never been officially stated.

**BENIGNCERTAIN** (2016). Among the NSA tools published by a group called the
Shadow Brokers in August 2016 was one that sent a crafted IKEv1 packet to Cisco
PIX firewalls and got back a chunk of memory containing the VPN's private keys
and configuration. Cisco found the same flaw in IOS (CVE-2016-6415). Nothing in
IKE's cryptography was broken; a parsing bug handed over the keys.

**Cisco's fragment reassembly** (2016). In February 2016 Cisco fixed
CVE-2016-1287, found by David Barksdale, Jordan Gruskovnjak and Alex Wheeler
of Exodus Intelligence: a heap overflow in the ASA firewalls' reassembly of
fragmented IKE messages, reachable by one crafted UDP packet on any ASA that
terminated IKEv1 or IKEv2 VPNs, before any authentication. Cisco scored it
10.0, and it won that year's Pwnie Award for the best server-side bug.
Microsoft's fix for CVE-2022-34721 (September 2022, scored 9.8) told the same
story for the Windows IKE protocol extensions.

**The gateways themselves.** Since 2019, the VPN gateways at the edge of
corporate networks, both IPsec and TLS-based, have been among the most
exploited devices on the Internet, appearing every year in the lists of
routinely exploited vulnerabilities published by CISA and its partners. The
pattern is the one BENIGNCERTAIN showed: a complex parser exposed to the whole
Internet, running with full privileges on a box that holds every key. The
protocol is rarely the weak point.

!!! note "Life story: Juniper's Dual EC constant"
    **Born:** 2008, when ScreenOS 6.2 added Dual EC with Juniper's own point
    Q; replaced by an unknown party in 2012 · **Purpose:** for its new owner,
    passive decryption of VPN traffic through predictable IKE nonces and
    Diffie-Hellman keys · **Helped:** the clearest proof that a "kleptographic"
    backdoor in a random number generator can be used by whoever holds the
    key, not only by its designer · **Status:** removed in ScreenOS updates in
    December 2015; the perpetrator is unknown

!!! note "Life story: IKEv1"
    **Born:** November 1998, RFC 2409, from Oakley and ISAKMP · **Purpose:**
    authenticated key exchange for IPsec · **Helped:** two decades of
    site-to-site VPNs, and the SIGMA design that IKEv2 and TLS 1.3 inherited ·
    **Retired:** RFC 9395 moved it to Historic in 2023 · **Replaced by:**
    IKEv2

## 7.9 Post-quantum IKEv2

*Level: intermediate.*

An attacker who records IKE_SA_INIT and later breaks its Diffie-Hellman
exchange with a quantum computer gets SKEYSEED, and from it every key of the
IKE SA and every child SA below it. VPN traffic between offices is a natural
target for harvest-now-decrypt-later, so IPsec has two answers.

**Post-quantum pre-shared keys** (RFC 8784, 2020) are a stopgap that needs no new
cryptography: an extra 256-bit secret, the PPK, configured on both ends and
mixed into $SK_d$, $SK_{pi}$ and $SK_{pr}$. All child SA keys then depend on it,
so a quantum attacker who breaks the Diffie-Hellman cannot read the traffic.
The IKE_AUTH messages themselves, including identities, are still encrypted
under keys that do not depend on the PPK.

**Multiple key exchanges** (RFC 9370, 2023) let IKE_SA_INIT be followed by up
to seven additional key exchanges, each in an **IKE_INTERMEDIATE** message
(RFC 9242, 2022), and each updating the keys:

$$\mathrm{SKEYSEED}_n = \mathrm{prf}(SK_{d,\,n-1},\; SK(n) \,\|\, N_i \,\|\, N_r),$$

where $SK(n)$ is the shared secret of the $n$th exchange. The result is secure if
*any one* of the exchanges is. The design solves a packet-size problem: an
ML-KEM-768 encapsulation key is 1,184 bytes, and added to an IKE_SA_INIT that is
already several hundred bytes, it would exceed a typical 1,500-byte packet.
IKE_SA_INIT cannot be fragmented, but IKE_INTERMEDIATE is encrypted and can be.
The usual configuration therefore runs X25519 or P-256 in IKE_SA_INIT and
ML-KEM-768 in one IKE_INTERMEDIATE exchange, at the cost of one more round
trip. In strongSwan it is written as an extra key exchange in the proposal,
such as `aes256gcm16-prfsha384-x25519-ke1_mlkem768`.

The document that assigns ML-KEM its IKEv2 numbers,
draft-ietf-ipsecme-ikev2-mlkem, was approved by the IESG on 7 July 2026 and,
as of November 2026, is in the RFC Editor's queue without an RFC number. It
gives ML-KEM-512, -768 and -1024 the numbers 35, 36 and 37, and allows
ML-KEM-512 (an 800-byte key, a 768-byte ciphertext) in IKE_SA_INIT itself;
the larger sets belong in IKE_INTERMEDIATE unless IKE runs over TCP or the
path carries large packets. strongSwan has supported ML-KEM since version 6.0
(December 2024), Libreswan since 5.4 (August 2026), and Apple's IKEv2 client
since iOS 26 and macOS 26, set up through a configuration profile. None of
them uses it by default yet. Authentication is still classical everywhere;
ML-DSA for IKEv2 is a draft. As in TLS and SSH, signatures can wait, because a
forged signature must be forged *during* the exchange, not years later.

### IKE_INTERMEDIATE, step by step

<div class="mars-steps" markdown>

1. **IKE_SA_INIT** with X25519, as in §7.3, proposing ML-KEM-768 as
   "additional key exchange 1" (transform type 6; RFC 9370 defines types 6
   to 12). Its keys are generation 0.
2. **IKE_INTERMEDIATE** (exchange type 43, message ID 1), encrypted with
   generation 0: a 1,184-byte encapsulation key one way, a 1,088-byte
   ciphertext back, and a shared 32-byte secret $SK(1)$.
3. **Key update**: $\mathrm{SKEYSEED}(1) = \mathrm{prf}(SK_d, SK(1) \| N_i \| N_r)$,
   then prf+ as before gives generation 1, which depends on both exchanges.
4. **IKE_AUTH** (message ID 2), encrypted with generation 1, with one more
   piece in each AUTH.

</div>

The AUTH of §7.3 covers only the first message, but now messages were
exchanged in between, protected only by classical keys and from peers not yet
authenticated. RFC 9242 appends a summary of them:

$$
\begin{aligned}
\text{InitiatorSignedOctets} &= \text{RealMessage1} \,\|\, N_r \,\|\, \mathrm{prf}(SK_{pi}, ID_i') \,\|\, \text{IntAuth},\\
\text{IntAuth} &= \text{IntAuth}_{i} \,\|\, \text{IntAuth}_{r} \,\|\, \text{IKE\_AUTH message ID}.
\end{aligned}
$$

$\text{IntAuth}_i$ is the PRF, under $SK_{pi}$, of the initiator's
intermediate message: its header and the Encrypted payload's header, then the
inner payloads in the clear, so the result does not depend on how the message
was fragmented. $\text{IntAuth}_r$ is the same for the responder under
$SK_{pr}$. The keys are those that protected the round, generation 0 for the
first; with several rounds the values chain. The message ID at the end is 2,
the IKE_AUTH that follows one intermediate round.

Since generation 1 is keyed with the old $SK_d$, every later key, ESP keys
included, depends on both secrets. Dependence is not yet security: if X25519
falls, $SK_d$ is known, and the new keys are HMAC under a *known* key
of a secret message, safe only under the "dual PRF" assumption that TLS 1.3's
hybrid key schedule also makes. The cost is one more round trip and about
2,300 bytes; across the Mars link of §7.10, one more round trip is up to 44
minutes.

## 7.10 Mars: a VPN across the light-time gap

*Level: intermediate.*

Could Arcadia City join its network to an Earth office with an IPsec tunnel?
The **packets** are no problem. ESP is stateless per packet: each one carries
its SPI and sequence number and can be checked on its own, so a packet that
takes 20 minutes to arrive is decrypted exactly like one that took 20
milliseconds. The anti-replay window does not care about delay either, only
about reordering.

**IKE** is the problem. Bringing up a tunnel takes two round trips; at the
average distance of about 12.5 light-minutes that is about 50 minutes, and at
the far side of the Sun nearly an hour and a half. Worse, IKE's retransmission
timers, liveness checks and rekey schedules all assume Earth, and across the
gap every exchange would fail long before its answer arrived.

### Retransmission timers against a 44-minute round trip

IKE is reliable over UDP because the sender of a request retransmits it,
bit for bit, until the answer comes or it gives up, and the responder answers
a retransmission by replaying its stored response (RFC 7296 §2.1). The gaps
must grow exponentially; the RFC suggests at least a dozen retransmissions
over at least several minutes, not long enough for one Mars answer.

```python
# IKE's retransmission timers against the Earth-Mars round trip (6 to 44 min).
def schedule(timeout, base, tries):        # send times, and when it gives up
    sent, t = [], 0.0
    for k in range(tries + 1):
        sent.append(t); t += timeout * base ** k
    return sent, t
sent, give_up = schedule(4.0, 1.8, 5)      # strongSwan's defaults
print("default: sends at", [round(x) for x in sent], "s, gives up at", round(give_up), "s")
sent, give_up = schedule(2700.0, 1.2, 3)   # first wait longer than 44 minutes
print("Mars:    sends at", [round(x / 60) for x in sent], "min, gives up at",
      round(give_up / 3600, 1), "h")
for one_way in (3, 12.5, 22):              # a rekey plus deleting the old SA
    print(f"one way {one_way:4} min: two exchanges take {4 * one_way:3.0f} min")
```

It prints:

```text
default: sends at [0, 4, 11, 24, 47, 89] s, gives up at 165 s
Mars:    sends at [0, 45, 99, 164] min, gives up at 4.0 h
one way    3 min: two exchanges take  12 min
one way 12.5 min: two exchanges take  50 min
one way   22 min: two exchanges take  88 min
```

The default sends six copies in 90 seconds and gives up at 165 seconds; the
earliest a Mars answer can come back is six minutes (Figure 7.5). The Mars
setting (strongSwan's `retransmit_timeout`, `retransmit_base` and
`retransmit_tries`) waits 45 minutes before its first retransmission: a lost
packet costs most of an hour, but the link is not filled with copies of a
request whose answer is already on its way.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Time line from 0 to 48 minutes: the default retransmissions all fall in the first 90 seconds and give up at 2.75 minutes, while Mars answers arrive at 6, 25 and 44 minutes; the Mars setting retransmits first at 45 minutes" fill="currentColor" font-size="13">
<text x="80" y="26" font-weight="bold">default timers: six sends in 90 s, then give up</text>
<rect x="80" y="36" width="17" height="22" fill-opacity=".6"/>
<text x="110" y="53" font-size="18" text-anchor="middle">×</text>
<text x="124" y="53" font-size="12">gives up at 2.75 min</text>
<text x="80" y="88" font-weight="bold">the first answer arrives</text>
<rect x="80" y="98" width="484" height="22" fill-opacity=".12"/>
<circle cx="146" cy="109" r="5"/><text x="146" y="138" text-anchor="middle" font-size="12">6 min (near)</text>
<circle cx="355" cy="109" r="5"/><text x="355" y="138" text-anchor="middle" font-size="12">25 min (average)</text>
<circle cx="564" cy="109" r="5"/><text x="564" y="138" text-anchor="middle" font-size="12">44 min (far)</text>
<text x="80" y="166" font-weight="bold">Mars setting: wait 45 min before the first retransmission</text>
<line x1="80" y1="176" x2="80" y2="198" stroke="currentColor" stroke-width="2"/>
<line x1="80" y1="187" x2="575" y2="187" stroke="currentColor" stroke-dasharray="5 4" stroke-opacity=".6"/>
<line x1="575" y1="176" x2="575" y2="198" stroke="currentColor" stroke-width="2"/>
<line x1="80" y1="214" x2="608" y2="214" stroke="currentColor"/>
<text x="80" y="234" text-anchor="middle" font-size="12">0</text><text x="344" y="234" text-anchor="middle" font-size="12">24</text><text x="608" y="234" text-anchor="middle" font-size="12">48 min</text>
</svg>
<figcaption>Figure 7.5. One IKE request across the gap. With Earth's default timers the initiator has given up long before even the nearest answer can arrive. Times are minutes after the request is sent.</figcaption>
</figure>

### Liveness, windows and rekeys

**Liveness.** A gateway that has heard nothing for a while sends an empty
INFORMATIONAL request, and declares the peer dead, deleting every SA, if the
request goes unanswered through the retransmission schedule. RFC 7296 notes
that "dead peer detection" really detects live peers. A check after 30 seconds
of silence, a common setting, would declare a Mars peer dead before its first
answer. On this link the check should be off or set to hours; any fresh,
authenticated ESP packet already proves the peer alive. And unless a peer
raises its window with SET_WINDOW_SIZE, only one request may be outstanding at
a time: about 32 exchanges a day in each direction at 44 minutes each.

**Rekeys.** The last lines of the program are a child SA rekey: a
CREATE_CHILD_SA exchange, then a Delete of the old SA (§7.12), four one-way
trips, 88 minutes at the far side. strongSwan's defaults rekey a child SA
after about an hour and expire it six minutes later, so the old SA would
expire in the middle of its own replacement. The fix is long lifetimes with
wide margins, say a day with the rekey three hours early; daily slices are
still forward secret if each rekey runs a new Diffie-Hellman exchange.
RFC 7296 notes that the end with the shorter lifetime always starts the rekey; giving it to the city's gateway avoids the collisions of
§7.12, which on a 22-minute link happen whenever both rekeys start within 22
minutes of each other.

### A conversation is the wrong shape

With timers stretched to hours, IKE would work: nothing in its cryptography
depends on time. But the deeper mismatch is that IKE is a conversation, and a
conversation is the wrong shape for a 44-minute round trip. Space agencies
already have the right shape: the **Bundle Protocol** of delay-tolerant
networking carries data in self-contained bundles stored and forwarded hop by
hop, and **Bundle Protocol Security** (BPSec, RFC 9172, 2022) protects each
bundle with integrity and confidentiality blocks, using keys set up in advance
rather than negotiated in flight. The city's gateway would use IPsec on its own
local links, and bundles, with long-lived keys rotated on a schedule, across
the gap. [Chapter 20](20-Designing-and-Verifying-Protocols.md) returns to
designing protocols for delay.

## 7.11 IKEv2 on the wire: the AUTH payload, byte by byte

*Level: intermediate.*

§7.3 ran IKEv2 on stand-in messages. Real ones are binary, and the binary
matters, because AUTH covers the first message exactly as sent, every byte.

### The message

Every IKE message starts with a 28-byte header: the initiator's and
responder's SPIs (8 bytes each), the type of the first payload, the version,
the exchange type (34 IKE_SA_INIT, 35 IKE_AUTH, 36 CREATE_CHILD_SA,
37 INFORMATIONAL, 43 IKE_INTERMEDIATE), flags, a message ID and the length.
Payloads follow as a chain, each with a 4-byte header: the type of the *next*
payload, a critical bit, and a length. The SA payload holds proposals made of
8-byte transforms, each a type (1 encryption, 2 PRF, 3 integrity, 4 key
exchange) and an ID: AES-GCM with a 16-byte tag is encryption 20 with the
attribute `80 0e 00 80` (key length 128), PRF_HMAC_SHA2_256 is PRF 5, and
Curve25519 is method 31. A real initiator also sends NAT detection
notifications (§7.5); they change which bytes are signed, not how.

### Code it: message 1, the keys and the AUTH payload

The initiator's key share is Alice's public key from RFC 7748's X25519
example and $g^{ir}$ is that example's shared secret, which the first program
in §7.3 reproduced. The nonces are 16 bytes, the shortest RFC 7296 allows.

```python
# IKE_SA_INIT on the wire, then SKEYSEED, prf+ and the initiator's AUTH (RFC 7296).
import hashlib, hmac, struct

def prf(key, data): return hmac.new(key, data, hashlib.sha256).digest()  # PRF_HMAC_SHA2_256
def payload(next_type, body):                       # generic payload header: 4 bytes
    return struct.pack(">BBH", next_type, 0, 4 + len(body)) + body
def transform(last, ttype, tid, attr=b""):
    return struct.pack(">BBHBBH", 0 if last else 3, 0, 8 + len(attr), ttype, 0, tid) + attr

# One proposal: AES-128-GCM (20, key length 128), HMAC-SHA-256 (5), Curve25519 (31).
tfs = (transform(False, 1, 20, struct.pack(">HH", 0x800E, 128)) +
       transform(False, 2, 5) + transform(True, 4, 31))
proposal = struct.pack(">BBHBBBB", 0, 0, 8 + len(tfs), 1, 1, 0, 3) + tfs  # #1, IKE, no SPI
KE_i = bytes.fromhex("8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")
g_ir = bytes.fromhex("4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742")
n_i, n_r = bytes(range(16)), bytes(range(16, 32))   # 16 bytes: the shortest nonce allowed
spi_i, spi_r = bytes.fromhex("1122334455667788"), bytes.fromhex("99aabbccddeeff00")

body = (payload(34, proposal) +                                  # SA, next is KE (34)
        payload(40, struct.pack(">HH", 31, 0) + KE_i) +           # KE, next is Nonce (40)
        payload(0, n_i))                                          # Nonce, last
hdr = spi_i + bytes(8) + struct.pack(">BBBBII", 33, 0x20, 34, 0x08, 0, 28 + len(body))
msg1 = hdr + body                     # next payload SA (33), version 2.0, IKE_SA_INIT (34), I flag
print("IKE header:", hdr.hex(" "))
print(f"message 1: {len(msg1)} bytes = header 28 + SA {4 + len(proposal)} + KE 40 + Nonce 20")

skeyseed = prf(n_i + n_r, g_ir)
print("SKEYSEED:", skeyseed.hex())
S, T, stream = n_i + n_r + spi_i + spi_r, b"", b""
for i in range(1, 6):                 # 136 bytes of keys need five 32-byte blocks
    T = prf(skeyseed, T + S + bytes([i])); stream += T
    print(f"T{i}:", T.hex())
keys, pos = {}, 0
for name, size in [("SK_d", 32), ("SK_ai", 0), ("SK_ar", 0), ("SK_ei", 20),
                   ("SK_er", 20), ("SK_pi", 32), ("SK_pr", 32)]:
    keys[name], pos = stream[pos:pos + size], pos + size
print("SK_pi:", keys["SK_pi"].hex())

ID_i = bytes([2, 0, 0, 0]) + b"gw1.arcadia.mars"     # IDi' = type FQDN, 3 reserved, name
maced_id = prf(keys["SK_pi"], ID_i)
signed = msg1 + n_r + maced_id
print("signed octets:", len(msg1), "+", len(n_r), "+", len(maced_id), "=", len(signed), "bytes")
pad_key = prf(b"correct horse battery staple, Arcadia gateway 1", b"Key Pad for IKEv2")
AUTH = prf(pad_key, signed)
print("AUTH payload:", payload(33, bytes([2, 0, 0, 0]) + AUTH).hex(" ", 4))
```

It prints:

```text
IKE header: 11 22 33 44 55 66 77 88 00 00 00 00 00 00 00 00 21 20 22 08 00 00 00 00 00 00 00 80
message 1: 128 bytes = header 28 + SA 40 + KE 40 + Nonce 20
SKEYSEED: b0ef915c48b15e3292a474783a59ffbd7a8f06b05e1a6efe90e23b46ffeaef91
T1: 49876a9056991195e7059c7db5010ccb9717522341156c4f88b8dfb3f64e8676
T2: 75a07ddd8bbade07478363f6c76df7eb049c1539b7d1c1e2371daa7fc4ec83fa
T3: bddda3dac54fe7678ee4a51ee98114e5eb1d15f8060c32279f4cb2941035c7c1
T4: f7cb3d3cc52602978655a8b99ea6d26c7790126dd67e65e609018159b18ca7a6
T5: 01f470e7571bbc1406bc3b10758353356fdece4dbb41622005a717a935d8f9cb
SK_pi: 8ee4a51ee98114e5eb1d15f8060c32279f4cb2941035c7c1f7cb3d3cc5260297
signed octets: 128 + 16 + 32 = 176 bytes
AUTH payload: 21000028 02000000 8b72d688 0004608d 3b6cc726 f9c93e52 d4fc6d57 5af12cac ba029660 41b566ec
```

### By hand: what the program did

**The header.** SPIs `11 22 ... 88` and eight zeros; `21` = 33, SA next;
`20`, version 2.0; `22` = 34, IKE_SA_INIT; `08`, the initiator flag; message
ID 0; length `80` = 128. The SA payload is 4 + 8 (proposal) + 12 (encryption
with its attribute) + 8 + 8 = 40 bytes, KE 4 + 4 + 32 = 40, Nonce 4 + 16 = 20.

**SKEYSEED** is HMAC-SHA-256 keyed with the nonces, the 32 bytes
`00 01 ... 1f`, over $g^{ir}$. HMAC pads the key to 64 bytes and XORs it with
`0x36`, so the inner hash starts `36 37 34 35 32 33 30 31` and continues with
32 bytes of `36`; the outer hash starts `5c 5d 5e 5f`. The *nonces* are the
key and the secret is the message, so HMAC works as an extractor with a public
key, the move HKDF-Extract makes with its salt. Result: `b0ef915c ... ffeaef91`.

**prf+.** With $S = N_i \| N_r \| SPI_i \| SPI_r$ (48 bytes) and $K$ =
SKEYSEED,

$$
T_1 = \mathrm{prf}(K,\; S \,\|\, \texttt{01}),\qquad
T_2 = \mathrm{prf}(K,\; T_1 \,\|\, S \,\|\, \texttt{02}),\ \dots
$$

The one-byte counter allows at most 255 blocks. The keys need 136 bytes:
$SK_d$ 32; $SK_{ai}$, $SK_{ar}$ none, since AES-GCM authenticates itself;
$SK_{ei}$, $SK_{er}$ 20 each (key and salt); $SK_{pi}$, $SK_{pr}$ 32 each.
Five blocks make 160 bytes, and the cuts ignore block boundaries
(Figure 7.6): $SK_{pi}$ is the last 24 bytes of $T_3$, `8ee4a51e ... 1035c7c1`,
then the first 8 of $T_4$, `f7cb3d3c c5260297`, exactly the program's SK_pi.

<figure class="mars-fig">
<svg viewBox="0 0 640 215" width="640" role="img" aria-label="Five 32-byte prf+ blocks T1 to T5 laid over the keys cut from them: SK_d fills T1, SK_ei and SK_er share T2 and spill into T3, SK_pi spans T3 and T4, SK_pr spans T4 and T5, and the last 24 bytes are unused" fill="currentColor" font-size="13">
<text x="320" y="20" text-anchor="middle">T(i) = prf(SKEYSEED, T(i−1) ‖ S ‖ i),   S = Ni ‖ Nr ‖ SPIi ‖ SPIr</text>
<rect x="40" y="36" width="112" height="36" fill-opacity=".12" stroke="currentColor"/><text x="96" y="59" text-anchor="middle">T1</text>
<rect x="152" y="36" width="112" height="36" fill-opacity=".12" stroke="currentColor"/><text x="208" y="59" text-anchor="middle">T2</text>
<rect x="264" y="36" width="112" height="36" fill-opacity=".12" stroke="currentColor"/><text x="320" y="59" text-anchor="middle">T3</text>
<rect x="376" y="36" width="112" height="36" fill-opacity=".12" stroke="currentColor"/><text x="432" y="59" text-anchor="middle">T4</text>
<rect x="488" y="36" width="112" height="36" fill-opacity=".12" stroke="currentColor"/><text x="544" y="59" text-anchor="middle">T5</text>
<line x1="152" y1="72" x2="152" y2="150" stroke="currentColor" stroke-dasharray="3 3" stroke-opacity=".6"/>
<line x1="264" y1="72" x2="264" y2="150" stroke="currentColor" stroke-dasharray="3 3" stroke-opacity=".6"/>
<line x1="376" y1="72" x2="376" y2="150" stroke="currentColor" stroke-dasharray="3 3" stroke-opacity=".6"/>
<line x1="488" y1="72" x2="488" y2="150" stroke="currentColor" stroke-dasharray="3 3" stroke-opacity=".6"/>
<rect x="40" y="110" width="112" height="36" fill-opacity=".3" stroke="currentColor"/><text x="96" y="133" text-anchor="middle">SK_d</text>
<rect x="152" y="110" width="70" height="36" fill-opacity=".2" stroke="currentColor"/><text x="187" y="133" text-anchor="middle">SK_ei</text>
<rect x="222" y="110" width="70" height="36" fill-opacity=".2" stroke="currentColor"/><text x="257" y="133" text-anchor="middle">SK_er</text>
<rect x="292" y="110" width="112" height="36" fill-opacity=".3" stroke="currentColor"/><text x="348" y="133" text-anchor="middle">SK_pi</text>
<rect x="404" y="110" width="112" height="36" fill-opacity=".2" stroke="currentColor"/><text x="460" y="133" text-anchor="middle">SK_pr</text>
<rect x="516" y="110" width="84" height="36" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><text x="558" y="133" text-anchor="middle" fill-opacity=".7">unused</text>
<text x="40" y="168" text-anchor="middle" font-size="12">0</text>
<text x="152" y="168" text-anchor="middle" font-size="12">32</text>
<text x="222" y="168" text-anchor="middle" font-size="12">52</text>
<text x="292" y="168" text-anchor="middle" font-size="12">72</text>
<text x="404" y="168" text-anchor="middle" font-size="12">104</text>
<text x="516" y="168" text-anchor="middle" font-size="12">136</text>
<text x="600" y="168" text-anchor="middle" font-size="12">160</text>
<text x="320" y="200" text-anchor="middle" font-size="12.5">byte offsets; SK_ai and SK_ar are empty with AES-GCM</text>
</svg>
<figcaption>Figure 7.6. prf+ makes one stream and the keys are cut from it in a fixed order, with AES-128-GCM for IKE and HMAC-SHA-256 as the PRF. Only SK_d happens to fill a block exactly.</figcaption>
</figure>

**AUTH** covers three pieces (Figure 7.7): RealMessage1, the 128 bytes from
the first byte of the initiator's SPI to the last byte of the nonce (without
the four zero bytes that precede IKE on port 4500); the responder's nonce,
16 bytes, value only; and $\mathrm{prf}(SK_{pi}, ID_i')$, where $ID_i'$ is
the ID payload without its header: type 2 (a domain name), three zero bytes,
and `gw1.arcadia.mars`. That is 128 + 16 + 32 = 176 bytes. The PSK is first
padded, $\mathrm{prf}(\text{PSK}, \texttt{"Key Pad for IKEv2"})$ with the
17 characters and no terminating zero, so a gateway can store this value
instead of the PSK; AUTH is the PRF of it over the 176 bytes.

The AUTH payload is `21 00 00 28` (next payload 33, the child SA's proposal;
length 40), `02 00 00 00` (method 2, "shared key message integrity code", and
three reserved bytes), then the 32-byte MAC. With a certificate the method is
1 (RSA), 9 to 11 (ECDSA), or 14 (RFC 7427's "digital signature"), and the
data is a signature over the same 176 bytes.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The initiator's signed octets: 128 bytes of message 1, the 16-byte responder nonce, and a 32-byte MAC of the identity under SK_pi, fed into a PRF keyed with the padded pre-shared key to give the 32-byte AUTH value" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">InitiatorSignedOctets, 176 bytes</text>
<rect x="20" y="36" width="320" height="44" fill-opacity=".12" stroke="currentColor"/>
<text x="180" y="55" text-anchor="middle">RealMessage1: 128 bytes</text>
<text x="180" y="71" text-anchor="middle" font-size="12">header, SA, KE, Ni as sent</text>
<rect x="340" y="36" width="60" height="44" fill-opacity=".3" stroke="currentColor"/>
<text x="370" y="55" text-anchor="middle">Nr</text>
<text x="370" y="71" text-anchor="middle" font-size="12">16</text>
<rect x="400" y="36" width="140" height="44" fill-opacity=".2" stroke="currentColor"/>
<text x="470" y="55" text-anchor="middle">prf(SK_pi, IDi′)</text>
<text x="470" y="71" text-anchor="middle" font-size="12">32</text>
<rect x="360" y="122" width="270" height="40" rx="4" fill="none" stroke="currentColor"/>
<text x="495" y="140" text-anchor="middle" font-size="12">IDi′ = 02 00 00 00 ‖ gw1.arcadia.mars</text>
<text x="495" y="155" text-anchor="middle" font-size="12">(20 bytes; no payload header)</text>
<line x1="470" y1="122" x2="470" y2="86" stroke="currentColor" stroke-width="1.5"/>
<polygon points="470,80 465,91 475,91"/>
<line x1="280" y1="80" x2="280" y2="194" stroke="currentColor" stroke-width="1.5"/>
<polygon points="280,200 275,189 285,189"/>
<rect x="20" y="200" width="400" height="40" rx="4" fill-opacity=".12" stroke="currentColor"/>
<text x="220" y="225" text-anchor="middle">prf( prf(PSK, "Key Pad for IKEv2"), octets )</text>
<line x1="420" y1="220" x2="474" y2="220" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,220 469,215 469,225"/>
<rect x="480" y="200" width="140" height="40" rx="4" fill-opacity=".3" stroke="currentColor"/>
<text x="550" y="225" text-anchor="middle">AUTH, 32 bytes</text>
<text x="20" y="272" font-size="12.5">with a certificate: the same 176 bytes are signed with the private key (method 1, 9 to 11, or 14)</text>
</svg>
<figcaption>Figure 7.7. What the initiator's AUTH covers. Neither the responder's nonce nor the MACed identity is sent in IKE_AUTH; each side rebuilds them from what it already holds.</figcaption>
</figure>

**What the responder checks.** It holds message 1 as it arrived, chose $N_r$,
derived the same $SK_{pi}$, and reads $ID_i'$ from IKE_AUTH; it rebuilds the
176 bytes and compares MACs. If an attacker had deleted the strongest proposal
from message 1, the two copies of message 1 would differ and the check would
fail: IKEv2's downgrade protection comes free with covering the whole
message, and implementations must keep the exact bytes, not a parsed copy.
The responder's AUTH mirrors this with RealMessage2, $N_i$ and
$\mathrm{prf}(SK_{pr}, ID_r')$.

## 7.12 Child SAs: traffic selectors, rekeying and collisions

*Level: intermediate.*

An IKE SA lives for hours; the child SAs under it come and go, each with its
own traffic, its own keys and its own rekeys.

### Traffic selectors, narrowed

A request that creates a child SA carries two traffic selector payloads, TSi
for the initiator's side and TSr for the responder's; each selector is an
address range, a port range and a protocol (0 for any). The responder may
accept them, refuse with TS_UNACCEPTABLE, or **narrow** them to what its
policy allows, never widen them. When a packet caused the request, the
initiator lists that packet's exact addresses, ports and protocol first, and a
responder that narrows must keep that first choice.

A laptop at 10.1.0.23 calls the Earth office's SIP server, 10.2.0.9 on TCP
port 5060. Its gateway asks for 10.1.0.0/16 to 10.2.0.0/16, the call first;
the Earth gateway allows only 10.1.0.0/24 to 10.2.0.0/24. By hand, intersect:
the call's selectors lie inside the policy and survive; the /16 ranges shrink
to the /24s. A request for 10.3.0.0/16 would get TS_UNACCEPTABLE. The program
continues the one in §7.11: it narrows the selectors, plays out a rekey
collision, and derives the surviving SA's keys from the IKE SA's $SK_d$.

```python
# Uses prf() and keys from the listing above.
# Traffic selector narrowing (RFC 7296 section 2.9): each selector is an address
# range, a port range and a protocol (0 = any). The responder keeps what its
# policy allows, and must keep the initiator's first, packet-specific choice.
import ipaddress
def sel(net, ports=(0, 65535), proto=0):
    n = ipaddress.ip_network(net)
    return (int(n[0]), int(n[-1]), ports, proto)
def meet(a, b):                                       # intersection of two selectors
    lo, hi = max(a[0], b[0]), min(a[1], b[1])
    plo, phi = max(a[2][0], b[2][0]), min(a[2][1], b[2][1])
    if lo > hi or plo > phi or (a[3] and b[3] and a[3] != b[3]):
        return None
    return (lo, hi, (plo, phi), a[3] or b[3])
def show(s):
    if s is None: return "TS_UNACCEPTABLE"
    a, b = ipaddress.ip_address(s[0]), ipaddress.ip_address(s[1])
    return f"{a}-{b} ports {s[2][0]}-{s[2][1]} proto {s[3] or 'any'}"
# The habitat laptop 10.1.0.23 opened SIP (TCP 5060) to 10.2.0.9 and asked for more:
TSi = [sel("10.1.0.23/32", (40001, 40001), 6), sel("10.1.0.0/16")]
TSr = [sel("10.2.0.9/32", (5060, 5060), 6), sel("10.2.0.0/16")]
policy_i, policy_r = sel("10.1.0.0/24"), sel("10.2.0.0/24")   # what the gateway allows
for name, ts, pol in (("TSi", TSi, policy_i), ("TSr", TSr, policy_r)):
    print(name, "first choice kept:", show(meet(ts[0], pol)))
    print(name, "narrowed to:      ", show(meet(ts[1], pol)))
print("TSr for 10.3.0.0/16:", show(meet(sel("10.3.0.0/16"), policy_r)))

# Rekeying a child SA with a fresh exchange (section 2.17): new nonces, new secret.
SK_d = keys["SK_d"]                                     # from the IKE SA above
def keymat(sk_d, g_new, n_i, n_r, n):
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = prf(sk_d, t + g_new + n_i + n_r + bytes([i])); out += t; i += 1
    return out[:n]
# Both gateways start a rekey of the same child SA at once: four fresh nonces.
# A sends 16-byte nonces, B sends 32-byte ones; both lengths are allowed.
A_req, B_resp = bytes.fromhex("5c" * 16), bytes.fromhex("a0" * 32)   # exchange 1: A asks
B_req, A_resp = bytes.fromhex("3e" * 32), bytes.fromhex("71" * 16)   # exchange 2: B asks
low = min(A_req, B_resp, B_req, A_resp)               # bytes compare octet by octet
loser = "exchange 1 (started by A)" if low in (A_req, B_resp) else "exchange 2 (started by B)"
print("lowest nonce:", low.hex()[:16] + "...", "-> redundant:", loser)
print("compared as integers, the lowest would be:", min((A_req, B_resp, B_req, A_resp),
      key=lambda n: int.from_bytes(n, "big")).hex()[:16] + "...")
g_new = bytes.fromhex("7e" * 32)                       # stand-in for the new X25519 secret
k = keymat(SK_d, g_new, A_req, B_resp, 40)
print("surviving SA keys: A->B", k[:20].hex()[:16] + "...", " B->A", k[20:40].hex()[:16] + "...")
```

It prints:

```text
TSi first choice kept: 10.1.0.23-10.1.0.23 ports 40001-40001 proto 6
TSi narrowed to:       10.1.0.0-10.1.0.255 ports 0-65535 proto any
TSr first choice kept: 10.2.0.9-10.2.0.9 ports 5060-5060 proto 6
TSr narrowed to:       10.2.0.0-10.2.0.255 ports 0-65535 proto any
TSr for 10.3.0.0/16: TS_UNACCEPTABLE
lowest nonce: 3e3e3e3e3e3e3e3e... -> redundant: exchange 2 (started by B)
compared as integers, the lowest would be: 5c5c5c5c5c5c5c5c...
surviving SA keys: A->B cda9a194638e85a3...  B->A 87f6fa9320b95e37...
```

Narrowing lets differently configured gateways connect instead of failing.
Rekeying has the opposite rule: a replacement SA must not be narrower than the
one it replaces.

### Rekeying, step by step

A child SA is rekeyed with a CREATE_CHILD_SA exchange inside the IKE SA:

$$
\begin{aligned}
&\text{request:}\quad \text{HDR},\ \text{SK}\{\,\text{N(REKEY\_SA)},\ \text{SA},\ N_i,\ [KE_i],\ TS_i,\ TS_r\,\}\\
&\text{response:}\quad \text{HDR},\ \text{SK}\{\,\text{SA},\ N_r,\ [KE_r],\ TS_i,\ TS_r\,\}
\end{aligned}
$$

REKEY_SA names the SPI being replaced, and the nonces are fresh. The optional
key shares decide forward secrecy: with them,
$\mathrm{KEYMAT} = \mathrm{prf{+}}(SK_d,\; g^{ir}_{\text{new}} \| N_i \| N_r)$;
without them, $\mathrm{KEYMAT} = \mathrm{prf{+}}(SK_d,\; N_i \| N_r)$, and
whoever later learns $SK_d$ can compute those keys from recorded nonces
(§7.13). Keys are cut initiator-to-responder first, encryption key before
integrity key (with AES-GCM, key then salt).

The IKE SA is rekeyed the same way, without selectors and always with a new
key exchange:
$\mathrm{SKEYSEED} = \mathrm{prf}(SK_d^{\text{old}},\; g^{ir}_{\text{new}} \| N_i \| N_r)$,
then prf+ with the new SPIs; it inherits every child SA. No AUTH is computed,
so a rekey is not a new authentication.

The responder installs the new SA before answering, so it can receive on it
at once; the initiator sends on it when the answer arrives, then deletes the
old one. Until then both SAs carry packets.

### When both sides rekey at once

Two gateways with the same lifetimes may each send a CREATE_CHILD_SA request
before receiving the other's, and each answers: now there are three SA pairs,
the old one and two new. RFC 7296 §2.8.1 picks the redundant one with no
further message: the SA from the exchange holding the lowest of the four
nonces is closed by the gateway that started that exchange, and the gateway
that started the other deletes the old SA.

"Lowest" means octet by octet, as in a dictionary, a nonce that runs out first
being the lower. With nonces of different lengths (each side picks its own,
16 to 256 bytes) that is not numeric order. Python's comparison of `bytes` is
exactly the RFC's rule. In the program A sends 16-byte nonces and B 32-byte
ones; `3e...`, in B's exchange, is lowest, so B closes its new SA and A deletes
the old one (Figure 7.8). As integers, A's short `5c...` is smallest. A
gateway comparing that way would close the *other* new SA: both new SAs would
be deleted, each side would wait for the other to delete the old one, and the
tunnel would run on the old SA until it expired.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Two gateways A and B both send rekey requests that cross, both answer, three SA pairs exist, and the exchange containing the lowest nonce, B's, gives up its new SA while A deletes the old SA" fill="currentColor" font-size="13">
<defs><marker id="ah78" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="110" y="22" text-anchor="middle" font-weight="bold">gateway A</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">gateway B</text>
<line x1="110" y1="32" x2="110" y2="250" stroke="currentColor"/>
<line x1="530" y1="32" x2="530" y2="250" stroke="currentColor"/>
<line x1="110" y1="60" x2="528" y2="126" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah78)"/>
<line x1="530" y1="60" x2="112" y2="126" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah78)"/>
<text x="118" y="52" font-size="12.5">req 1: REKEY_SA, Ni = 5c5c… (16 bytes)</text>
<text x="522" y="52" font-size="12.5" text-anchor="end">req 2: REKEY_SA, Ni = 3e3e… (32 bytes)</text>
<line x1="110" y1="150" x2="528" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah78)"/>
<line x1="530" y1="150" x2="112" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#ah78)"/>
<text x="118" y="146" font-size="12.5">resp 2: Nr = 7171…</text>
<text x="522" y="146" font-size="12.5" text-anchor="end">resp 1: Nr = a0a0…</text>
<rect x="60" y="214" width="520" height="30" rx="4" fill-opacity=".12"/>
<text x="320" y="234" text-anchor="middle" font-size="12.5">three SA pairs now: the old one, one from exchange 1, one from exchange 2</text>
<text x="320" y="272" text-anchor="middle">lowest of the four nonces, octet by octet: 3e3e…, in exchange 2</text>
<text x="110" y="304" text-anchor="middle" font-weight="bold">A deletes the old SA</text>
<text x="530" y="304" text-anchor="middle" font-weight="bold">B deletes the SA of exchange 2</text>
<text x="320" y="324" text-anchor="middle" font-size="12" fill-opacity=".7">the SA from exchange 1 carries the traffic from now on</text>
</svg>
<figcaption>Figure 7.8. A rekey collision and RFC 7296's rule for it. Neither gateway needs another message to agree on which new SA survives.</figcaption>
</figure>

Most collisions never happen, because implementations jitter their rekey
times; strongSwan moves each rekey up to a few minutes earlier at random. Two
requests must cross in flight, which on Earth means timers firing within tens
of milliseconds. On the Mars link the window is the one-way delay, which is
why §7.10 gives one gateway the shorter lifetime. Colliding rekeys of the
IKE SA itself follow the same rule, with the child SAs moved to the surviving
IKE SA.

## 7.13 In the real world

*Level: intermediate.*

- **Where IPsec runs.** Site-to-site VPNs between offices, data centers and
  cloud networks are overwhelmingly IPsec, because every router and firewall
  speaks it and the cloud providers' VPN gateways offer nothing else; they
  still accept IKEv1 for old peers. Remote-access VPNs are split between IKEv2
  (built into Windows, macOS, iOS and Android) and TLS-based products, and
  WireGuard ([Chapter 8](08-WireGuard-and-Noise.md)) is taking a growing share
  of both.
- **Mobile networks.** IPsec carries signaling and user traffic inside mobile
  operators' networks, and every phone that makes calls over Wi-Fi ("Wi-Fi
  calling") runs IKEv2 with EAP-AKA, which authenticates with the SIM card, to
  reach the operator's gateway. It is one of the largest IKEv2 deployments.
- **Proposals by habit.** The strongSwan run above chose AES-CBC for IKE and
  P-256 rather than Curve25519, because both ends used default lists that put
  those first; RFC 8247 still makes AES-CBC the only mandatory IKE cipher, since
  IKE sends few messages and many stacks never added GCM. A configuration
  written today should name its proposals: AES-GCM or ChaCha20-Poly1305,
  PRF_HMAC_SHA2_256 or 384, Curve25519 or P-256 (or group 14 at least), plus
  ML-KEM-768 as an additional exchange where both ends support it.
- **PFS for child SAs.** By default, a child SA rekey in many products derives
  new keys from $SK_d$ without a new Diffie-Hellman exchange, so a key leak at
  one point exposes later child SAs too, until the next IKE SA rekey. Listing a
  group in the ESP proposal turns on a fresh exchange for every rekey.
  strongSwan has listed groups in its default ESP proposal since 6.0.2.
- **Configuration is the hard part.** Mismatched proposals, traffic selectors
  that do not quite agree, NAT surprises and MTU problems cause far more
  failed tunnels than any attack. Tools that print the negotiated proposal,
  such as `swanctl --list-sas`, are the first thing to look at.

## 7.14 Going deeper

*Level: expert.*

**Formal analysis.** Cas Cremers (ESORICS 2011) analyzed IKEv1 and IKEv2 with
the Scyther tool and found authentication weaknesses in several modes, such as
reflection attacks, in which a party's own message is returned to it, and
identity misbinding in some variants. Most needed unusual configurations; the
analysis showed how each property depended on details such as whether
identities were inside the MAC. The SIGMA paper itself (Krawczyk, CRYPTO 2003)
is the proof sketch behind IKEv2's design.

**The anti-replay window and multiple cores.** A gateway that encrypts on many
cores in parallel must hand out sequence numbers without repeating one, and a
receiver on many cores must update one window. RFC 6479 (2012) describes a
window implementation without bit shifting, using a ring of words that can be
cleared lazily. At 100 gigabits per second, packets for one SA arrive faster
than one core can process them; modern designs open several child SAs with the
same traffic selectors, one per core (RFC 9611, 2024).

**Traffic flow confidentiality.** Even in tunnel mode, packet sizes and timing
reveal what kind of traffic flows. ESP allows padding and dummy packets ("next
header 59"), and RFC 9347 (2023) defines IP traffic flow security, which packs
inner packets into fixed-size, fixed-rate outer packets. The cost is constant
bandwidth whether or not anything is being sent, which only a few military and
diplomatic links pay.

**Labeled IPsec and group keys.** Some systems attach security labels to SAs
so that the kernel can enforce mandatory access control across the network.
Multicast traffic, which has many receivers, needs a **group** key that
cannot come from a two-party exchange; GDOI (RFC 6407) and the newer
G-IKEv2 extension distribute such keys from a key server, giving up forward
secrecy and sender authentication within the group.

**Why not just use TLS?** A VPN could encapsulate packets in a TLS connection,
and many commercial products do. The problems are TCP over TCP (a lost segment
in the outer connection stalls every inner connection) and that TLS is a
user-space protocol, so packets go up and down between kernel and program. DTLS
fixes the first, and kernel TLS the second. IPsec's division of labor, a
negotiation daemon in user space and a stateless packet transform in the
kernel, is the same one that WireGuard adopted in a much smaller form.

## Check yourself

??? question "1. What is a security association, and why does a two-way tunnel need two of them?"
    An SA is a one-way agreement on algorithm and keys, named by an SPI that
    the receiver chose. Traffic in each direction has its own SA, its own SPI
    and its own keys, so a tunnel needs one for each direction (and IKE has its
    own SA as well).

??? question "2. What does tunnel mode hide that transport mode does not?"
    The original IP header: the real source and destination addresses of the
    machines behind the gateways. In tunnel mode, only the gateways' addresses
    are visible.

??? question "3. Write SKEYSEED and say what each of the seven keys is for."
    $\mathrm{SKEYSEED} = \mathrm{prf}(N_i \| N_r, g^{ir})$; prf+ of it over
    $N_i \| N_r \| SPI_i \| SPI_r$ gives $SK_d$ (derives child SA keys),
    $SK_{ai}$ and $SK_{ar}$ (integrity of IKE messages), $SK_{ei}$ and
    $SK_{er}$ (encryption of IKE messages), $SK_{pi}$ and $SK_{pr}$ (used in
    the AUTH values).

??? question "4. What three things does an IKEv2 AUTH value cover, and why each?"
    The sender's own first message (which contains its key share, so the key
    exchange is authenticated), the peer's nonce (freshness, so it cannot be
    replayed), and prf($SK_p$, own identity) (binds the identity to this
    exchange's keys, preventing misbinding).

??? question "5. A responder allows only 10.1.0.0/24 to 10.2.0.0/24 and is offered TSi = (10.1.0.23, TCP 40001), (10.1.0.0/16) and TSr = (10.2.0.9, TCP 5060), (10.2.0.0/16). What comes back?"
    TSi narrowed to 10.1.0.0 to 10.1.0.255 and TSr to 10.2.0.0 to 10.2.0.255;
    the first, packet-specific selectors lie inside and must be kept, since
    they describe the packet that caused the request.

??? question "6. Why can an active attacker crack a weak IKEv2 pre-shared key, but a passive one cannot?"
    IKE_AUTH is encrypted under keys from the Diffie-Hellman exchange. A
    passive attacker does not have them. An active attacker who answers the
    initiator itself shares a Diffie-Hellman secret with it, decrypts IKE_AUTH,
    and gets an AUTH value that depends only on the PSK and known data.

??? question "7. Why may ESP use the sequence number as the AES-GCM IV, and how can a pair of gateways turn that into nonce reuse?"
    The nonce is the SA's salt followed by the IV, and it only has to be
    unique under the key, which a counter that never wraps guarantees. A standby gateway
    that takes over from a stale copy of the SA resends sequence numbers, and
    so nonces, the failed gateway already used, leaking the XOR of the
    plaintexts. RFC 6311 has both ends skip their counters far ahead.

??? question "8. How did the Juniper backdoor let someone decrypt VPN traffic without touching the VPN?"
    The Dual EC random number generator's point Q was replaced by one whose
    secret relation the attacker knew. Raw generator output appeared in IKE
    nonces, which let the attacker predict the rest of the output, including
    the Diffie-Hellman private keys, and so compute the session keys from a
    recorded exchange.

??? question "9. In a rekey collision, A's exchange used nonces 5c5c... (16 bytes) and a0a0... (32 bytes), B's 3e3e... (32) and 7171... (16). Who closes what, and what if one side compared nonces as integers?"
    Octet by octet, 3e3e... in B's exchange is lowest: B closes its new SA
    and A deletes the old one. As integers, the short 5c5c... is smallest,
    so that side would close the other new SA; both new SAs would go, and
    the tunnel would run on the old SA until it expired.

??? question "10. Arcadia's gateway connects to Earth, 22 light-minutes away, with X25519 in IKE_SA_INIT and ML-KEM-768 in IKE_INTERMEDIATE. How long until the tunnel carries traffic, and why does it never get there with default timers?"
    Three exchanges, IKE_SA_INIT, IKE_INTERMEDIATE and IKE_AUTH, are three
    round trips of 44 minutes: 132 minutes. Default timers retransmit for
    about 165 seconds and then give up, long before the first answer arrives
    after 44 minutes, so the first exchange already fails. ESP itself would
    be fine; it is IKE's conversation and its timers that need stretching to
    hours.

## What you learned

- IPsec is two protocols: IKE negotiates, authenticates and derives keys, and
  ESP protects each packet in transport or tunnel mode.
- IKEv2 takes two exchanges. SKEYSEED comes from the nonces and the
  Diffie-Hellman secret, prf+ expands it into seven keys, and each side's AUTH
  is a SIGMA-style signature or MAC over its own first message, the peer's
  nonce and its MACed identity.
- ESP uses the sequence number for replay protection and, usually, as the
  AES-GCM IV; NAT traversal wraps it in UDP.
- Pre-shared keys that are passwords can be cracked offline after one
  connection attempt; IKEv1's aggressive mode made it passive.
- The worst IPsec failures came from complexity and from around the protocol:
  encryption without integrity, 1024-bit groups, a backdoored random number
  generator and parser bugs in gateways.
- On the wire, AUTH covers the exact bytes of the first message, the peer's
  nonce and a MAC of the identity; prf+ chains HMAC blocks with a one-byte
  counter, and keys are cut from the stream across block boundaries.
- ESP with AES-GCM uses salt and IV as the nonce and SPI and sequence number
  as additional data; anything that copies SA state can repeat a nonce.
- Responders narrow traffic selectors; child SA rekeys are forward secret
  only with a fresh key exchange; collisions are settled by the lowest nonce,
  octet by octet.
- Post-quantum IKEv2 adds ML-KEM in IKE_INTERMEDIATE, which IntAuth folds
  into AUTH, or a pre-shared PPK.
- Across the Earth-Mars gap ESP works unchanged, but IKE's timers must be
  stretched from seconds to hours.

**Next:** [Chapter 8](08-WireGuard-and-Noise.md), a VPN with no negotiation at
all.

## Further reading

- RFC 4301 (security architecture), RFC 4303 (ESP), RFC 7296 (IKEv2), RFC 3948
  (UDP encapsulation), RFC 4555 (MOBIKE), RFC 7383 (fragmentation), RFC 8229
  and RFC 9329 (TCP encapsulation), RFC 4106 (AES-GCM in ESP), RFC 8750
  (implicit IV), RFC 8221 and RFC 8247 (algorithm requirements), RFC 9395
  (deprecating IKEv1).
- RFC 8784 (post-quantum PPK), RFC 9242 (IKE_INTERMEDIATE), RFC 9370 (multiple
  key exchanges); draft-ietf-ipsecme-ikev2-mlkem, ML-KEM in IKEv2 (approved
  by the IESG in July 2026; in the RFC Editor's queue as of November 2026).
- RFC 5282 (AEAD ciphers for IKEv2's own messages), RFC 7427 (signature
  authentication), RFC 7748 (X25519, whose example keys §7.11 uses), RFC 6311
  (counter synchronization for high-availability clusters, 2011).
- David McGrew and John Viega, "The Galois/Counter Mode of Operation (GCM)"
  (submitted to NIST, 2004; revised 2005); SP 800-38D (2007).
- Niels Ferguson and Bruce Schneier, "A cryptographic evaluation of IPsec"
  (1999).
- Hugo Krawczyk, "SIGMA: the 'SIGn-and-MAc' approach to authenticated
  Diffie-Hellman and its use in the IKE protocols" (CRYPTO 2003).
- Kenneth Paterson and Arnold Yau, "Cryptography in theory and practice: the
  case of encryption in IPsec" (EUROCRYPT 2006); Jean Paul Degabriele and
  Kenneth Paterson, "Attacking the IPsec standards in encryption-only
  configurations" (IEEE S&P 2007).
- Cas Cremers, "Key exchange in IPsec revisited: formal analysis of IKEv1 and
  IKEv2" (ESORICS 2011).
- David Adrian et al., "Imperfect forward secrecy: how Diffie-Hellman fails in
  practice" (CCS 2015).
- Stephen Checkoway et al., "A systematic analysis of the Juniper Dual EC
  incident" (CCS 2016).
- Dennis Felsch, Martin Grothe, Jörg Schwenk, Adam Czubak and Marcin
  Szymanek, "The dangers of key reuse: practical attacks on IPsec IKE" (USENIX
  Security 2018).
- Cisco Security Advisory cisco-sa-20160210-asa-ike, "Cisco ASA Software IKEv1
  and IKEv2 Buffer Overflow Vulnerability" (CVE-2016-1287, February 2016).
- RFC 9172, Bundle Protocol Security (2022).
- The strongSwan documentation, especially the pages on `swanctl.conf`,
  proposals, and the retransmission settings in `strongswan.conf`.
