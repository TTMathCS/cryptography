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
and then use its timing to cut a dictionary down to a single word. Then the
enterprise side, open networks, and what to configure today.*

!!! abstract "In this chapter"
    **You will learn:**

    - why WEP failed, by attacking it, and what WPA and TKIP patched;
    - WPA2's key hierarchy (PMK, PTK, GTK) and its 4-way handshake, by
      computing a real one;
    - why a WPA2-Personal handshake, or even one message, lets anyone test
      passwords offline;
    - KRACK: how a replayed handshake message forces nonce reuse;
    - WPA3-Personal's SAE (Dragonfly), and the Dragonblood side channels;
    - WPA2- and WPA3-Enterprise with 802.1X and EAP, and their weak points;
    - open networks with OWE, protected management frames, and newer attacks
      on frame handling and group keys.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (password
    protocols, offline guessing) and [Chapter 2](02-Certificates-and-PKI.md) for
    Enterprise; RC4 from [Chapter 5 of book 1](../../book/05-Stream-Ciphers.md),
    PBKDF2 from [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md) and
    elliptic curves from [Chapter 15](../../book/15-Elliptic-Curves.md).

    **Levels:** §9.1 to §9.4 are for beginners, §9.5 to §9.13 are
    intermediate, §9.14 is expert.

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
<text x="108" y="327">WPA3 3.0: hash-to-element, SAE-PK, transition disable</text>
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
  (§9.9) and is different for each user and session.
- The **pairwise transient key** (PTK) is derived fresh at every connection
  from the PMK, both MAC addresses and two random nonces. It splits into the
  **KCK** (to authenticate handshake messages), the **KEK** (to encrypt keys
  sent in the handshake) and the **TK** (the traffic key for CCMP).
- The **group temporal key** (GTK) encrypts broadcast and multicast frames.
  The access point chooses it and sends it to each device under its KEK. Every
  device on the network has the same GTK.
- The **integrity group temporal key** (IGTK) authenticates broadcast
  management frames when protected management frames are on (§9.10).

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

The fix was in implementations, not in the protocol's messages: never reinstall
a key that is already in use, and never reset a packet number. Cas Cremers,
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
<figcaption>Figure 9.4. SAE. The commit messages can cross in flight; neither side has to go first.</figcaption>
</figure>

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

The fixes came in layers. Implementations had already been told to run all 40
iterations regardless (the `rounds=40` in the program above), but some had not,
or leaked through memory access patterns. WPA3 version 3.0 (2020) added
**hash-to-element** (H2E), which maps the password to a point with a
constant-time function (the simplified SWU map of RFC 9380), and made it
mandatory on the 6 GHz band. Dragonblood also showed a **downgrade**: in
"transition mode", where an access point accepts both WPA2 and WPA3 so old
devices can still join, an attacker could set up a fake WPA2-only access point
with the same name, and a WPA3-capable device would connect to it with WPA2 and
hand over a crackable handshake. The answer is a **transition disable**
indication: once a device has seen WPA3 on a network, it refuses WPA2 for that
network from then on.

## 9.9 Enterprise: 802.1X and EAP

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

## 9.10 Open networks and management frames

*Level: intermediate.*

**Open networks.** A café's Wi-Fi with no password used to mean no encryption
at all: anyone nearby could read every unencrypted frame. **Opportunistic
Wireless Encryption** (OWE, RFC 8110, 2017), certified as **Wi-Fi Enhanced
Open**, adds an unauthenticated Diffie-Hellman exchange during association, so
each device gets its own PMK. It stops passive eavesdropping; it cannot stop an
attacker who runs a fake access point with the same name, since nothing is
authenticated. A transition mode lets old devices keep joining the same network
unencrypted.

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

## 9.11 Frames and groups: FragAttacks and AirSnitch

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

**Group keys.** Every device on a network holds the same GTK, so any of them can
forge broadcast frames that look as if they came from the access point. Many
networks rely on **client isolation** to stop users attacking each other, and
the **AirSnitch** attacks (NDSS 2026) showed how a malicious client can bypass
it on many access points, using the shared group key and the way traffic is
forwarded between clients. WPA3 and PMF alone do not prevent it; isolation must
be enforced properly in the access point.

The lesson of both is that a channel is only as secure as everything the
receiver does with a frame after the MIC checks.

## 9.12 Mars: radio in a city of domes

*Level: intermediate.*

Arcadia City is a place where almost everything is wireless: suits, rovers,
sensors in every wall, residents' tablets. None of it crosses the gap to Earth
directly, so Wi-Fi faces the same short-range threats it faces on Earth, with
two differences.

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

## 9.13 In the real world

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

## 9.14 Going deeper

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

??? question "2. Why did WEP's 24-bit IV lead to keystream reuse so quickly?"
    With $2^{24}$ values and random or reset-to-zero choices, a repeat is
    expected after about $\sqrt{2^{24}} = 4{,}096$ frames (the birthday bound).
    The same IV with the same key gives the same RC4 keystream.

??? question "3. What are the PMK, PTK and GTK, and which are unique to one device?"
    PMK: the long-term secret (from the passphrase, SAE or EAP); unique per
    device only with SAE or Enterprise. PTK: per connection, from the PMK,
    addresses and nonces; unique. GTK: the group key for broadcast, shared by
    all devices on the network.

??? question "4. Why can a WPA2-Personal passphrase be guessed offline from one handshake?"
    The PMK depends only on the passphrase and SSID, the nonces and addresses
    are sent in the clear, and message 2's MIC is a function of all of them. Each
    guess can be checked against the MIC without contacting the network.

??? question "5. What does a PMKID attack need, compared with the MIC attack?"
    Only the access point: the attacker begins to associate, receives message 1
    with a PMKID, and cracks it offline. No client has to connect.

??? question "6. In KRACK, why does reinstalling the same key break CCMP?"
    Installing a key resets its packet number, which is part of the nonce. The
    device then encrypts new frames with nonces already used under that key,
    reusing counter-mode keystream.

??? question "7. Why does an SAE recording not help a password guesser?"
    To test a guess, the attacker would need $\mathit{rand}$ or
    $\mathit{mask}$, which are protected by the elliptic curve discrete
    logarithm problem; the transcript has no value that is a function of the
    password alone. Each guess requires a live run of the protocol.

??? question "8. What did Dragonblood's timing attack measure, and how was it fixed?"
    The number of hunting-and-pecking iterations needed to find the password
    element, which depends on the password and MAC addresses; spoofing many MAC
    addresses filters a dictionary. Fixes: always run all iterations in constant
    time, and the hash-to-element method (H2E), mandatory on 6 GHz.

??? question "9. What is the main risk in PEAP with MS-CHAPv2, and what prevents it?"
    Devices that accept any server certificate connect to a fake access point
    and RADIUS server, which captures MS-CHAPv2 exchanges that can be cracked
    (one DES key). Pinning the server's CA and name on every device prevents it.

??? question "10. What do protected management frames protect against, and what does OWE not protect against?"
    PMF stops forged deauthentication and other management frames. OWE stops
    passive eavesdropping on open networks but not a fake access point with the
    same name, because nothing is authenticated.

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
- Enterprise Wi-Fi gives each user a PMK through EAP, and depends on devices
  checking the server's certificate.
- OWE encrypts open networks; PMF protects management frames; frame handling
  and shared group keys remain attack surfaces.

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
