# 7. IPsec and IKEv2

*TLS and SSH protect one connection that an application opens. IPsec protects
packets: every packet between two machines, or between two whole networks,
whatever program sent it. It is what joins a branch office to its head office,
what the VPN client built into Windows, macOS and iOS speaks, and what most
cloud providers offer when you link your network to theirs. This chapter takes
IPsec apart into its two halves. IKEv2 agrees on keys: you will run a whole
exchange, derive its seven keys, compute both sides' authentication values, and
reproduce the key schedule of a real strongSwan connection byte for byte. ESP
then carries the packets: you will build its anti-replay window and its NAT
detection. Then the history that gave IPsec its reputation for complexity,
the attacks on IKEv1 and on weak pre-shared keys, a backdoor in a firewall's
random number generator, and the post-quantum extensions.*

!!! abstract "In this chapter"
    **You will learn:**

    - why IPsec exists, and its parts: security associations, ESP and AH,
      transport and tunnel mode, and the key exchange IKE;
    - IKEv2's two exchanges, its key schedule (SKEYSEED and prf+) and its
      authentication, by computing them;
    - ESP's packet format, its sequence numbers and anti-replay window;
    - how IPsec crosses NAT and firewalls;
    - how peers authenticate: pre-shared keys, certificates and EAP, and why a
      weak pre-shared key can be cracked offline;
    - the history of IKEv1 and the attacks on it, the Juniper Dual EC
      incident, and the case against encryption without integrity;
    - post-quantum IKEv2 and what a link to Mars does to it.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (SIGMA, forward
    secrecy) and [Chapter 2](02-Certificates-and-PKI.md) for certificates;
    HMAC and AES-GCM from Chapters
    [10](../../book/10-Message-Authentication.md) and
    [8](../../book/08-Modes-of-Operation.md) of book 1.

    **Levels:** §7.1 to §7.3 are for beginners, §7.4 to §7.11 are
    intermediate, §7.12 is expert.

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
# the initiator's AUTH, and can then test passwords offline. Continue from above.
words = ["password", "arcadia", "mars2026", "letmein", "olympus", "gateway1",
         "arcadia2026", "redplanet"] + ["guess%05d" % i for i in range(20000)]
weak_psk = b"arcadia2026"

# The attacker runs its own X25519 with the victim, so it knows SK_ei and SK_pi
# and can decrypt IKE_AUTH. The victim, using the weak PSK, sends:
evil = seed("attacker x25519")
msg2_evil = spi_i + spi_r + b"SA:aes256gcm16-prfsha256-x25519" + x25519(evil, G) + n_r
k_evil = ike_keys(n_i, n_r, x25519(evil, KE_i))
captured = auth(weak_psk, msg1, n_r, k_evil["SK_pi"], ID_i)

for tries, w in enumerate(words, 1):                  # offline: no more packets needed
    if auth(w.encode(), msg1, n_r, k_evil["SK_pi"], ID_i) == captured:
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

The document that assigns ML-KEM its IKEv2 numbers was approved by the IESG in
July 2026. strongSwan has supported ML-KEM since version 6.0 (December 2024),
Libreswan since 5.4 (August 2026), and Apple's IKEv2 client since iOS 26 and
macOS 26, set up through a configuration profile. None of them uses it by
default yet. Authentication is still classical everywhere; ML-DSA for IKEv2 is
a draft. As in TLS and SSH, signatures can wait, because a forged signature
must be forged *during* the exchange, not years later.

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
the far side of the Sun nearly an hour and a half. Worse, IKE's timers assume
Earth. strongSwan, by default, retransmits a request after 4 seconds, then
waits 1.8 times longer each time, and gives up after five retransmissions,
about 165 seconds in all. Across the gap every exchange would fail long
before the answer arrived. Liveness checks (dead peer detection) would declare
the peer dead, and rekeys, which by default happen every hour for child SAs,
would collide with the delay.

With timers stretched to hours, IKE would work: nothing in its cryptography
depends on time. But the deeper mismatch is that IKE is a conversation, and a
conversation is the wrong shape for a 44-minute round trip. Space agencies
already have the right shape: the **Bundle Protocol** of delay-tolerant
networking carries data in self-contained bundles stored and forwarded hop by
hop, and **Bundle Protocol Security** (BPSec, RFC 9172, 2022) protects each
bundle with integrity and confidentiality blocks, using keys set up in advance
rather than negotiated in flight. The city's gateway would use IPsec on its own
local links, and bundles, with long-lived keys rotated on a schedule, across
the gap. Chapter 20 returns to
designing protocols for delay.

## 7.11 In the real world

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

## 7.12 Going deeper

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

??? question "5. Why must the anti-replay check come after the integrity check?"
    Otherwise an attacker could send forged packets with high sequence numbers,
    slide the window forward, and make the receiver reject the real packets as
    too old.

??? question "6. Why can an active attacker crack a weak IKEv2 pre-shared key, but a passive one cannot?"
    IKE_AUTH is encrypted under keys from the Diffie-Hellman exchange. A
    passive attacker does not have them. An active attacker who answers the
    initiator itself shares a Diffie-Hellman secret with it, decrypts IKE_AUTH,
    and gets an AUTH value that depends only on the PSK and known data.

??? question "7. How does IPsec detect and cross a NAT?"
    Each side sends a hash of its SPIs, address and port in IKE_SA_INIT; a
    mismatch with what the peer sees means a NAT rewrote them. Both then move
    to UDP port 4500, wrap ESP in UDP, and send keepalives to keep the NAT's
    mapping alive.

??? question "8. How did the Juniper backdoor let someone decrypt VPN traffic without touching the VPN?"
    The Dual EC random number generator's point Q was replaced by one whose
    secret relation the attacker knew. Raw generator output appeared in IKE
    nonces, which let the attacker predict the rest of the output, including
    the Diffie-Hellman private keys, and so compute the session keys from a
    recorded exchange.

??? question "9. Why does post-quantum IKEv2 put ML-KEM in a separate IKE_INTERMEDIATE exchange?"
    An ML-KEM key share would push IKE_SA_INIT over typical packet sizes, and
    IKE_SA_INIT cannot use IKE's own fragmentation because no keys exist yet.
    IKE_INTERMEDIATE is encrypted and can be fragmented, and the extra
    exchange's secret is mixed into the keys.

??? question "10. Which part of IPsec works unchanged across the Earth to Mars gap, and which does not?"
    ESP works: each packet is processed on its own, whatever its delay. IKE
    does not with normal settings: it needs two round trips to start, and its
    retransmission, liveness and rekey timers are set for seconds, not hours.

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
- Post-quantum IKEv2 adds ML-KEM as an extra exchange in IKE_INTERMEDIATE, or
  a pre-shared PPK.

**Next:** [Chapter 8](08-WireGuard-and-Noise.md), a VPN with no negotiation at
all.

## Further reading

- RFC 4301 (security architecture), RFC 4303 (ESP), RFC 7296 (IKEv2), RFC 3948
  (UDP encapsulation), RFC 4555 (MOBIKE), RFC 7383 (fragmentation), RFC 8229
  and RFC 9329 (TCP encapsulation), RFC 4106 (AES-GCM in ESP), RFC 8750
  (implicit IV), RFC 8221 and RFC 8247 (algorithm requirements), RFC 9395
  (deprecating IKEv1).
- RFC 8784 (post-quantum PPK), RFC 9242 (IKE_INTERMEDIATE), RFC 9370 (multiple
  key exchanges).
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
- RFC 9172, Bundle Protocol Security (2022).
- The strongSwan documentation, especially the pages on `swanctl.conf` and
  proposals.
