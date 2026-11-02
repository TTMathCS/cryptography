# IPsec (Internet Protocol Security)

*VPNs at the IP layer, for linking sites and for remote access. Two protocols
split the work: IKEv2 picks algorithms from both sides' lists, authenticates
the peers and derives keys, then ESP encrypts each packet with those keys,
usually inside the kernel.*

**Standard:** RFC 4301 (architecture) and RFC 4303 (ESP), both 2005; IKEv2 is
RFC 7296 (2014), an Internet Standard (STD 79). Which algorithms to implement:
RFC 8221 (ESP) and RFC 8247 (IKEv2), both 2017, updated by RFC 9395 (2023).
**Implementations:** strongSwan and Libreswan (IKE daemons), the Linux
kernel's XFRM layer for ESP, the VPN client built into Windows, and the IKEv2
client in macOS and iOS.

## One connection, one algorithm per category

Real output from `swanctl --list-sas` (strongSwan 5.9.13, Oct 2026, on Ubuntu
24.04 in a container). Two `charon` daemons ran in separate Linux network
namespaces joined by a virtual Ethernet pair, both with default proposals and
a pre-shared key, and three pings went through the tunnel:

```
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

The container's kernel has neither ESP nor AES-GCM built in, so ESP ran inside
charon through strongSwan's `kernel-libipsec` plugin, which by default wraps
ESP in UDP on port 4500 (hence `TUNNEL-in-UDP`). The negotiation is the same.

| IPsec name | Category | Algorithm inside |
|---|---|---|
| `ECP_256` (group 19) | [Key exchange](../index.md#1-key-exchange) | [ECDH on P-256](../01-key-exchange/ECDH.md#ecdh-on-the-nist-curves), a fresh key pair for each IKE SA |
| pre-shared key | [Signature](../index.md#2-digital-signatures) | none: each side proves it knows the shared secret with an [HMAC](../06-mac/HMAC.md) over the handshake; with certificates this is an [RSA](../02-signatures/RSA.md) or [ECDSA](../02-signatures/ECDSA.md) signature |
| `PRF_HMAC_SHA2_256` | [KDF](../index.md#8-key-derivation-and-password-hashing) | HMAC-SHA-256 as IKE's PRF, run as SKEYSEED and prf+: the same steps [HKDF](../08-kdf-password-hashing/HKDF.md) later named extract and expand |
| `AES_CBC-128` | [Cipher](../index.md#4-symmetric-ciphers) | [AES](../04-symmetric-ciphers/AES.md)-128 in [CBC](../05-modes-aead/Classic-Modes.md#cbc) mode for IKE's own messages after the first exchange |
| `HMAC_SHA2_256_128` | [MAC](../index.md#6-mac) | HMAC-SHA-256 cut to 16 bytes on each encrypted IKE message |
| `ESP:AES_GCM_16-128` | [Cipher](../index.md#5-cipher-modes-and-aead) | [AES-GCM](../05-modes-aead/AEAD.md#aes-gcm) with a 128-bit key and a 16-byte tag for every data packet, so ESP needs no separate MAC |
| (inside PRF and MAC) | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md) |

**Why AES-CBC and P-256 for IKE, but AES-GCM for ESP?** Both sides had the
same default lists, so the first entry won. strongSwan lists cipher-plus-HMAC
before AEAD for IKE, AEAD first for ESP, and the NIST curves before
Curve25519; 6.1.0 (September 2026) builds the same lists. The cipher order
fits the RFCs. RFC 8247 keeps AES-CBC as IKEv2's only MUST cipher, since
IKE sends only a few messages and many IKE stacks never added GCM. RFC 8221
makes AES-GCM a MUST for ESP, which carries all the traffic.

## How a connection works

1. **IKE_SA_INIT, in the clear.** The initiator sends its proposals, an ECDH
   key share and a nonce Ni; the responder picks one proposal and returns its
   own key share and Nr. Here: 972 bytes out, mostly the default proposals,
   and 280 back.
2. **Seven keys.** SKEYSEED = prf(Ni | Nr, g^ir), and
   prf+(SKEYSEED, Ni | Nr | SPIi | SPIr) is cut into SK_d (for later keys),
   SK_ai/SK_ar (MAC), SK_ei/SK_er (encryption) and SK_pi/SK_pr (for AUTH), one
   of each pair per direction (RFC 7296 §2.13–2.14).
3. **IKE_AUTH, encrypted.** Each side sends its identity and an AUTH value
   over its own first message, the peer's nonce and prf(SK_p, ID): a signature
   with a certificate, or prf(prf(PSK, "Key Pad for IKEv2"), …) with a
   pre-shared key. The same exchange sets up the first CHILD_SA: an ESP
   proposal and the subnets it carries.
4. **ESP keys.** KEYMAT = prf+(SK_d, Ni | Nr) (§2.17). AES-GCM takes 20 bytes
   per direction, a 16-byte key and a 4-byte salt (RFC 4106 §8.1), which is
   why charon logs "key size 160". Each direction has its own SPI.
5. **ESP packets** carry the SPI, a sequence number starting at 1 (replays
   are dropped), an 8-byte IV, the encrypted packet with padding, and a
   16-byte tag. `tcpdump` showed a ping as `ESP(spi=0xb9697120,seq=0x4),
   length 120`: 8 + 8 + 84 + 4 + 16 bytes.
6. **CREATE_CHILD_SA** replaces SAs before they expire. An IKE SA rekey always
   runs a new key exchange, SKEYSEED = prf(SK_d (old), g^ir (new) | Ni | Nr)
   (§2.18). A CHILD_SA rekey does so only if the ESP proposal lists a group
   (PFS); 5.9.13's default lists none, and since 6.0.2 (2025) the default
   lists the groups plus "none".

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange | **Elliptic curve:** P-256 (group 19), P-384, Curve25519 (31), Curve448<br>**Classic DH (MODP):** 2048-bit (group 14) and larger | RFC 5903, RFC 8031, RFC 3526; RFC 8247 makes group 14 a MUST and 19 a SHOULD | **Short MODP:** 768, 1024 and 1536-bit (groups 1, 2, 5)<br>**Unexplained seeds:** groups 22–24, whose seeds were never published |
| Key exchange, post-quantum | ML-KEM-768 or ML-KEM-1024 as an extra exchange after (EC)DH; a post-quantum pre-shared key (PPK) | RFC 9370 (2023), RFC 9242 (2022), IETF draft (ikev2-mlkem); RFC 8784 (2020) | — |
| Signature (IKE_AUTH) | RSA and RSASSA-PSS, ECDSA, Ed25519; PSK | RFC 7296, RFC 7427, RFC 8420; RFC 8247 makes RSA and PSK a MUST | DSS (SHOULD NOT); SHA-1 in signatures (MUST NOT) |
| Signature, post-quantum | ML-DSA, SLH-DSA | IETF draft (ikev2-pqc-auth) | — |
| Cipher, IKE | AES-CBC (MUST), AES-GCM and ChaCha20-Poly1305 (SHOULD) | RFC 8247, RFC 5282, RFC 7634 | 3DES (MAY), DES (MUST NOT) |
| Cipher, ESP | AES-GCM and AES-CBC (MUST), ChaCha20-Poly1305 (SHOULD), AES-CCM-8 (IoT); NULL for integrity-only ESP | RFC 8221, RFC 4106, RFC 3602, RFC 7634, RFC 4309 | 3DES (SHOULD NOT); DES and Blowfish (MUST NOT) |
| MAC | built into the AEAD; HMAC-SHA-256-128 (MUST), HMAC-SHA-512-256 (SHOULD), AES-XCBC-96 (IoT) | RFC 4868, RFC 8221, RFC 8247 | HMAC-SHA1-96 (MUST-), HMAC-MD5-96 (MUST NOT) |
| Hash | SHA-256, SHA-384, SHA-512 inside the PRF, HMAC and signatures | FIPS 180-4, RFC 7427 | SHA-1, MD5 |
| KDF | prf+ with PRF_HMAC_SHA2_256 (MUST) or PRF_HMAC_SHA2_512 (SHOULD+) | RFC 7296 §2.13, RFC 8247 | PRF_HMAC_SHA1 (MUST-), PRF_HMAC_MD5 (MUST NOT) |

MUST- means MUST for now, expected to drop later (RFC 8247 §1.1). RFC 9395
(2023) marked older algorithms DEPRECATED and moved IKEv1 (RFC 2409, 1998)
to Historic; strongSwan 6.1.0 turns IKEv1 off by default. NULL encryption
stays a MUST because integrity-only ESP crosses NAT, which AH can't.

## Post-quantum

Anyone who records IKE_SA_INIT and later breaks its ECDH exchange gets
SKEYSEED and every key below it. Two fixes exist:

- **A PPK (RFC 8784, 2020)**, an extra shared secret, is mixed by prf+ into
  SK_d, SK_pi and SK_pr, so all CHILD_SA keys depend on it. SK_ei and SK_er
  don't change, so IKE_AUTH, identities included, stays open to that attacker.
- **Extra key exchanges (RFC 9370, 2023)** follow IKE_SA_INIT in
  IKE_INTERMEDIATE messages (RFC 9242), each updating the keys with
  SKEYSEED(n) = prf(SK_d(n-1), SK(n) | Ni | Nr), so the result holds if any
  one exchange does. IKE fragmentation can't split IKE_SA_INIT, and an
  ML-KEM-768 key (1,184 bytes) on top of the 972-byte request above would
  go over a 1,500-byte MTU; IKE_INTERMEDIATE is encrypted and can be fragmented.

strongSwan 5.9.13 predates ML-KEM, and even 6.1.0 leaves it out of the
default proposal; you name it, as in `aes256gcm16-prfsha384-x25519-ke1_mlkem768`.
ML-KEM's code points (35, 36, 37 for ML-KEM-512, -768, -1024) come from
draft-ietf-ipsecme-ikev2-mlkem, approved by the IESG in July 2026 but not yet
an RFC. strongSwan supports it since 6.0 (via OpenSSL 3.5 since 6.0.2),
Libreswan since 5.4 (August 2026, ML-KEM-768), and Apple since iOS 26 and
macOS 26 as extra exchanges set in a configuration profile, next to PPKs
since iOS 18 and macOS 15. IKE_AUTH signatures are still classical; ML-DSA
for IKEv2 is a draft.

## Seeing it on your machine

With strongSwan installed and a connection named `demo` in `swanctl.conf`:

```
swanctl --list-algs                   # algorithms the loaded plugins offer
swanctl --list-conns                  # configured connections and rekey times
swanctl --initiate --child demo       # bring up the tunnel
swanctl --list-sas                    # negotiated IKE and ESP algorithms, SPIs, counters
swanctl --rekey --ike demo            # CREATE_CHILD_SA with a new key exchange
sudo ip xfrm state                    # kernel ESP SAs: SPI, algorithm, keys
sudo tcpdump -n esp or udp port 4500  # SPI and sequence number of each packet
```

- **Python:** SKEYSEED and prf+ with the standard library. Press Enter four
  times for the run above. The SPIs are on the `--list-sas` line; g^ir and the
  nonces come from charon's log with `ike = 4` in a `charon.filelog` section
  of `strongswan.conf` (it logs every key, so never on a real gateway).

```python
import hashlib, hmac

def prf(key, data):                     # PRF_HMAC_SHA2_256
    return hmac.new(key, data, hashlib.sha256).digest()

def prf_plus(key, seed, n):             # RFC 7296 section 2.13
    out, t, i = b"", b"", 1
    while len(out) < n:
        t = prf(key, t + seed + bytes([i]))
        out, i = out + t, i + 1
    return out[:n]

ni = bytes.fromhex(input("Ni: ") or
     "d5768aee3aee7ae047fbfd344ff7b95fc97c12878db1ed9b1eade85d7bb2be72")
nr = bytes.fromhex(input("Nr: ") or
     "26cd9a04530a0cd934d3e230f6c2a635e791229f10eb343545a5d1f8796c4310")
spis = bytes.fromhex(input("SPIi SPIr: ").replace(" ", "") or
       "ab2f5674aebd0a709c8ff1491c87f22e")
gir = bytes.fromhex(input("g^ir: ") or
      "824df0a445aec6e2f87f43b187ee7b013218114ed115f737e0751ea666a6342f")

skeyseed = prf(ni + nr, gir)            # section 2.14
print("SKEYSEED", skeyseed.hex())
sizes = {"SK_d": 32, "SK_ai": 32, "SK_ar": 32, "SK_ei": 16, "SK_er": 16,
         "SK_pi": 32, "SK_pr": 32}
keys = prf_plus(skeyseed, ni + nr + spis, sum(sizes.values()))
for name, size in sizes.items():
    print(f"{name:8}", keys[:size].hex())
    keys = keys[size:]
```

```
SKEYSEED 089713ac2b394ef3fbc5e745159bea5842f2134377d18e23b1ea80cd7a27b7fb
SK_d     ee79b21c44fdd36d0eb60451a90f931d03fc2a5219bda6aeb7ebe52cd1b4745d
SK_ai    ef6125d3ff9d7f43e62752ee30b641db4fc599000ff9bd46d5bf6c3905800c83
SK_ar    3410c7e9f7ec4f821934fddcbbc74659fa0aaf610874984126bc294ba8d2f430
SK_ei    d85bafc87c4594299458f490bcbc07d1
SK_er    119786f33ae5e511e209cb23be71d544
SK_pi    31f0880d29ca366cb69fde94122581edfbcc0da649346af18205056fb4c86e5a
SK_pr    33c5c666ff4827d0f73c7d685fee65b90b01b4c65ea860a65340848b8295e0eb
```

Every line matches what the initiator's charon logged as `SKEYSEED` and
`Sk_d secret` through `Sk_pr secret`. The key sizes follow the table above:
32 bytes for the PRF and HMAC-SHA-256 keys, 16 for AES-128.

## See also

- [WireGuard](WireGuard.md): the other common VPN, with one fixed suite and nothing to negotiate
- [TLS 1.3](TLS-1.3.md): also negotiates, and derives its keys with HKDF
- [SSH](SSH.md): a menu of algorithms too, but there the client's order decides
- [PKI](PKI.md) / [X.509](../formats/X.509.md): the certificates IKE_AUTH uses when there is no pre-shared key
- [HKDF](../08-kdf-password-hashing/HKDF.md) / [AEAD](../05-modes-aead/AEAD.md) / [ML-KEM](../01-key-exchange/ML-KEM.md): the algorithms in depth

## References

- [RFC 7296: IKEv2](https://www.rfc-editor.org/rfc/rfc7296) (Sections 1.2, 1.3, 2.13–2.18) / [RFC 4301: Security Architecture for IP](https://www.rfc-editor.org/rfc/rfc4301) / [RFC 4303: ESP](https://www.rfc-editor.org/rfc/rfc4303) / [RFC 1825](https://www.rfc-editor.org/rfc/rfc1825)
- [RFC 8247: IKEv2 algorithms](https://www.rfc-editor.org/rfc/rfc8247) / [RFC 8221: ESP and AH algorithms](https://www.rfc-editor.org/rfc/rfc8221) / [RFC 9395: deprecating IKEv1 and old algorithms](https://www.rfc-editor.org/rfc/rfc9395)
- [RFC 4106: AES-GCM in ESP](https://www.rfc-editor.org/rfc/rfc4106) / [RFC 7634: ChaCha20-Poly1305 for IKE and IPsec](https://www.rfc-editor.org/rfc/rfc7634) / [RFC 8031: Curve25519 and Curve448 for IKEv2](https://www.rfc-editor.org/rfc/rfc8031) / [RFC 7427: signature authentication](https://www.rfc-editor.org/rfc/rfc7427)
- [RFC 9242: IKE_INTERMEDIATE](https://www.rfc-editor.org/rfc/rfc9242) / [RFC 9370: multiple key exchanges](https://www.rfc-editor.org/rfc/rfc9370) / [RFC 8784: post-quantum PPK](https://www.rfc-editor.org/rfc/rfc8784) / [draft-ietf-ipsecme-ikev2-mlkem](https://datatracker.ietf.org/doc/draft-ietf-ipsecme-ikev2-mlkem/) / [draft-ietf-ipsecme-ikev2-pqc-auth](https://datatracker.ietf.org/doc/draft-ietf-ipsecme-ikev2-pqc-auth/)
- [strongSwan NEWS](https://github.com/strongswan/strongswan/blob/master/NEWS) (6.0.0, 6.0.2, 6.1.0) / [`proposal.c`](https://github.com/strongswan/strongswan/blob/6.1.0/src/libstrongswan/crypto/proposal/proposal.c) and [`vici_config.c`](https://github.com/strongswan/strongswan/blob/6.1.0/src/libcharon/plugins/vici/vici_config.c) (default proposals) / [`swanctl.opt`](https://github.com/strongswan/strongswan/blob/6.1.0/src/swanctl/swanctl.opt) (`keX_` prefix)
- [Libreswan CHANGES](https://github.com/libreswan/libreswan/blob/main/CHANGES) (v5.4)
- [Apple device management, VPN payload](https://github.com/apple/device-management/blob/release/mdm/profiles/com.apple.vpn.managed.yaml)

*Weaker sources:* search-engine summaries of the IETF Datatracker (IESG
approval of draft-ietf-ipsecme-ikev2-mlkem in July 2026; the pqc-auth draft).
