# Signal Protocol

*End-to-end encryption for chats. A one-time handshake against keys the
recipient left on the server, then ratchets that give every message its own
key and heal after a device is compromised.*

**Standard:** Signal's own specifications, not RFCs: X3DH (2016), PQXDH
(2023), the Double Ratchet (2016; revision 4 in 2025 adds the post-quantum
SPQR), XEdDSA (2016), Sesame (2017) and the ML-KEM Braid (2025).
**Implementations:** libsignal (Rust, used by the Signal apps). WhatsApp and
Google Messages (RCS) also use the Signal Protocol.

## One message, one algorithm per category

There's no command line that shows a Signal handshake, so here are the labels
libsignal passes to HKDF, from `rust/protocol/src/pqxdh.rs` and
`ratchet/keys.rs` (main branch, October 2026). Each one names a step:

```
WhisperText_X25519_SHA-256_CRYSTALS-KYBER-1024   PQXDH: first root key and chain key
WhisperRatchet                                   DH ratchet: next root key and chain key
WhisperMessageKeys                               message key -> AES key, HMAC key, IV
```

| Signal name | Category | Algorithm inside |
|---|---|---|
| identity, signed prekey, one-time prekey, ephemeral key | [Key exchange](../algorithms/table.md#1-key-exchange) | [X25519](../01-key-exchange/ECDH.md#x25519-and-x448): three or four DH results, hashed together |
| Kyber prekey (`CRYSTALS-KYBER-1024`) | [Key exchange](../algorithms/table.md#1-key-exchange) | Kyber-1024, the round-3 version of [ML-KEM](../01-key-exchange/ML-KEM.md)-1024 |
| SPQR | [Key exchange](../algorithms/table.md#1-key-exchange) | ML-KEM-768, sent in pieces alongside ordinary messages |
| prekey signatures | [Signature](../algorithms/table.md#2-digital-signatures) | XEdDSA: an [Ed25519](../02-signatures/EdDSA.md)-compatible signature made with the X25519 identity key |
| message body | [Cipher](../algorithms/table.md#4-symmetric-ciphers) | [AES-256](../04-symmetric-ciphers/AES.md) in [CBC](../05-modes-aead/Classic-Modes.md#cbc) mode with PKCS#7 padding |
| MAC | [MAC](../algorithms/table.md#6-mac) | [HMAC](../06-mac/HMAC.md)-SHA256 over the message, cut to 8 bytes on the wire |
| ratchet steps | [KDF](../algorithms/table.md#8-key-derivation-and-password-hashing) | [HKDF](../08-kdf-password-hashing/HKDF.md)-SHA256 for root keys, HMAC-SHA256 for chain keys |
| safety number | [Hash](../algorithms/table.md#7-hash-functions) | [SHA-512](../07-hash/SHA-2.md), iterated over each identity key |

**Why Kyber and not ML-KEM?** PQXDH shipped in September 2023, a year before
FIPS 203. libsignal's default `Kyber1024` key type still runs the round-3
Kyber code in libcrux. An `MLKEM1024` type exists but sits behind a build flag
that is off. The sizes match ML-KEM-1024; a few hashing steps inside differ.
SPQR, added in 2025, uses the final ML-KEM-768.

## How a message is sent

1. **Bob uploads keys** to the server: his identity key, a signed prekey that
   he rotates, a signed last-resort Kyber prekey, and batches of one-time
   X25519 and one-time Kyber prekeys.
2. **Alice fetches his bundle** and checks the XEdDSA signatures against his
   identity key. With a new ephemeral key she computes DH1 = DH(IK_A, SPK_B),
   DH2 = DH(EK_A, IK_B), DH3 = DH(EK_A, SPK_B) and, if a one-time prekey was
   left, DH4 = DH(EK_A, OPK_B). She encapsulates to the Kyber prekey and gets
   a shared secret SS and a ciphertext.
3. **HKDF** over 32 bytes of `0xFF`, the DH results and SS gives the first root
   key and chain key. Alice's first message carries her identity and ephemeral
   keys, the Kyber ciphertext and which prekeys she used. Bob repeats the math
   and deletes the one-time prekeys.
4. **DH ratchet.** Each time the conversation changes direction, the sender
   adds a new X25519 ratchet key. Its DH with the other side's latest ratchet
   key goes into HKDF with the root key. A stolen session state stops working
   once both sides have ratcheted.
5. **Symmetric ratchet.** Inside one direction the chain key moves per message:
   message key = HMAC-SHA256(chain key, `0x01`), next chain key =
   HMAC-SHA256(chain key, `0x02`). Used keys are deleted, so a later theft
   can't read earlier messages.
6. **SPQR**, the third ratchet, runs an ML-KEM-768 exchange in the background,
   split into erasure-coded chunks that ride on normal messages. Its message
   key goes in as the HKDF salt when the final message key is made. Signal
   calls the pair the Triple Ratchet.

**Several devices.** Each device has its own identity key. Sesame keeps a
session per pair of devices; when a message arrives on an older session, that
session becomes the active one, so both sides settle on one session each.

**Where it runs.** Signal, through libsignal. WhatsApp has used the Signal
Protocol since 2016; its white paper (version 9, February 2026) describes
Curve25519 keys, AES-256-CBC and HMAC-SHA256, and no post-quantum step.
Google Messages uses it for encrypted RCS chats between Messages users, with
the same 64-bit HMAC tag. Cross-platform RCS encryption (GSMA Universal
Profile 3.0, 2025) uses MLS (RFC 9420) instead.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 336" role="img" aria-labelledby="sk-c-ratchet-t"><title id="sk-c-ratchet-t">A row of chain keys, each made from the last with HMAC and byte 0x02; below each, a message key made with byte 0x01 and deleted after use</title><defs><filter id="sk-c-ratchet-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-ratchet-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-ratchet-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-ratchet-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-ratchet-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="336" filter="url(#sk-c-ratchet-paper)"/><g filter="url(#sk-c-ratchet-pen)"><text x="30" y="44" text-anchor="start" class="h">One step per message, and old keys are gone</text><path class="p room" d="M40 90 L150 90 L150 136 L40 136Z"/><text x="95.0" y="119.0" text-anchor="middle" class="s">chain key 0</text><path class="p " d="M152 113 L188 113" marker-end="url(#sk-c-ratchet-ah)"/><text x="170" y="104" text-anchor="middle" class="s">0x02</text><path class="p " d="M95 138 L95 186" marker-end="url(#sk-c-ratchet-ah)"/><text x="102" y="166" text-anchor="start" class="s">0x01</text><path class="p rust" d="M40 188 L150 188 L150 234 L40 234Z"/><text x="95.0" y="217.0" text-anchor="middle" class="s">message key 1</text><text x="95" y="256" text-anchor="middle" class="s">delete after use</text><path class="p gold" d="M190 90 L300 90 L300 136 L190 136Z"/><text x="245.0" y="119.0" text-anchor="middle" class="s">chain key 1</text><path class="p " d="M302 113 L338 113" marker-end="url(#sk-c-ratchet-ah)"/><text x="320" y="104" text-anchor="middle" class="s">0x02</text><path class="p " d="M245 138 L245 186" marker-end="url(#sk-c-ratchet-ah)"/><text x="252" y="166" text-anchor="start" class="s">0x01</text><path class="p rust" d="M190 188 L300 188 L300 234 L190 234Z"/><text x="245.0" y="217.0" text-anchor="middle" class="s">message key 2</text><text x="245" y="256" text-anchor="middle" class="s">delete after use</text><path class="p gold" d="M340 90 L450 90 L450 136 L340 136Z"/><text x="395.0" y="119.0" text-anchor="middle" class="s">chain key 2</text><path class="p " d="M452 113 L488 113" marker-end="url(#sk-c-ratchet-ah)"/><text x="470" y="104" text-anchor="middle" class="s">0x02</text><path class="p " d="M395 138 L395 186" marker-end="url(#sk-c-ratchet-ah)"/><text x="402" y="166" text-anchor="start" class="s">0x01</text><path class="p rust" d="M340 188 L450 188 L450 234 L340 234Z"/><text x="395.0" y="217.0" text-anchor="middle" class="s">message key 3</text><text x="395" y="256" text-anchor="middle" class="s">delete after use</text><path class="p gold" d="M490 90 L600 90 L600 136 L490 136Z"/><text x="545.0" y="119.0" text-anchor="middle" class="s">chain key 3</text><text x="30" y="300" text-anchor="start" class="s">Each arrow is HMAC-SHA256 of the chain key with one byte. Going forward is easy; going back would</text><text x="30" y="320" text-anchor="start" class="s">mean undoing HMAC, so a phone stolen today cannot read yesterday's messages.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange | X25519 for identity, prekeys and the DH ratchet | RFC 7748, X3DH and PQXDH specs | X3DH alone (message version 3, no Kyber): libsignal requires the Kyber part since June 2025 |
| Key exchange, post-quantum | Kyber-1024 prekeys (PQXDH), ML-KEM-768 (SPQR) | PQXDH spec (2023), ML-KEM Braid (2025), FIPS 203 | — |
| Signature | XEdDSA on signed and Kyber prekeys; messages themselves are not signed | XEdDSA spec (2016) | — |
| Cipher | AES-256-CBC + PKCS#7 for messages; sealed-sender envelopes use AES-256-CTR + HMAC or AES-256-GCM-SIV | Double Ratchet spec §7.2 | — |
| MAC | HMAC-SHA256, 8 bytes kept | RFC 2104 | — |
| Hash | SHA-256 (HKDF, HMAC), SHA-512 (XEdDSA, safety numbers) | FIPS 180-4 | — |
| KDF | HKDF-SHA256 with the `Whisper…` labels | RFC 5869 | — |

SPQR rolled out from October 2025, first allowing a fallback when the other
side didn't have it. In April 2026 libsignal made it required ("Force SPQR
v1"). Identity keys are still X25519, so a future quantum attacker could
impersonate someone in a new session, but couldn't read recorded messages.

## Seeing it on your machine

- **In the app:** open a chat, tap the contact's name, then *View safety
  number*. The 60 digits are two 30-digit halves, one per person, each from
  iterated SHA-512 over that person's identity key and ID. Scan each other's
  QR code to compare. The number changes when either identity key does, such
  as on a new phone set up without a transfer.
- **Python:** the symmetric ratchet with HMAC and HKDF from the standard
  library. Press Enter to use the chain key from libsignal's own test.

```python
import hashlib, hmac

def mac(k, m):
    return hmac.new(k, m, hashlib.sha256).digest()

def hkdf(ikm, info, n):
    prk, t, out = mac(bytes(32), ikm), b"", b""
    while len(out) < n:
        t = mac(prk, t + info + bytes([len(out) // 32 + 1]))
        out += t
    return out[:n]

ck = bytes.fromhex(input("chain key (hex): ") or
                   "8ab72d6f4cc5ac0d387eaf463378ddb28edd07385b1cb01250c715982e7ad48f")
for i in range(3):
    k = hkdf(mac(ck, b"\x01"), b"WhisperMessageKeys", 80)
    print(i, "aes", k[:32].hex()[:16], "mac", k[32:64].hex()[:16], "iv", k[64:].hex()[:16])
    ck = mac(ck, b"\x02")
```

```
0 aes bf51e9d75e0e3103 mac c6c77d6a73a35433 iv afa8207986b692a1
1 aes c4b01e32d64371af mac 331d9158bcff1735 iv a313b409a9113f7d
2 aes 5cd3776ee5f49622 mac ed2af285dc22960c iv fc737c1e34d66ce4
```

The aes and mac keys on line 0 match `test_chain_key_derivation` in
libsignal's `ratchet/keys.rs`, which doesn't list the IV.
In a live session the SPQR key replaces the zero salt, so real keys differ.

## See also

- [WireGuard](WireGuard.md): X25519 and no negotiation too, but for a tunnel
- [ML-KEM](../01-key-exchange/ML-KEM.md) / [EdDSA](../02-signatures/EdDSA.md) / [HKDF](../08-kdf-password-hashing/HKDF.md): the algorithms in depth
- [Classic modes](../05-modes-aead/Classic-Modes.md#encrypt-then-mac-or-mac-then-encrypt): why CBC needs a MAC on top
- [Zero-knowledge proofs](../11-advanced/Zero-Knowledge.md): the credentials behind Signal's private groups

## References

- [X3DH](https://signal.org/docs/specifications/x3dh/) (Marlinspike and Perrin, 2016) / [PQXDH](https://signal.org/docs/specifications/pqxdh/) (Kret and Schmidt, 2023, revision 3 2024)
- [The Double Ratchet Algorithm, revision 4 (2025)](https://signal.org/docs/specifications/doubleratchet/) / [ML-KEM Braid](https://signal.org/docs/specifications/mlkembraid/)
- [XEdDSA and VXEdDSA](https://signal.org/docs/specifications/xeddsa/) / [Sesame](https://signal.org/docs/specifications/sesame/)
- Signal blog: [Quantum Resistance and the Signal Protocol (Sep 2023)](https://signal.org/blog/pqxdh/) / [Signal Protocol and Post-Quantum Ratchets (Oct 2025)](https://signal.org/blog/spqr/)
- [libsignal](https://github.com/signalapp/libsignal) (`rust/protocol/src/pqxdh.rs`, `kem.rs`, `ratchet/keys.rs`, `fingerprint.rs`, `sealed_sender.rs`) / [SPQR](https://github.com/signalapp/SparsePostQuantumRatchet)
- [WhatsApp Encryption Overview, version 9 (Feb 2026)](https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf) / [Google, Messages End-to-End Encryption Overview, v1.2 (Feb 2022)](https://www.gstatic.com/messages/papers/messages_e2ee.pdf)
- [GSMA: RCS encryption based on MLS (Mar 2025)](https://www.gsma.com/newsroom/article/rcs-encryption-a-leap-towards-secure-and-interoperable-messaging/)
