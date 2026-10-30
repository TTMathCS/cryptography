# WireGuard

*A VPN that shows up as a network interface. One round trip turns two public
keys from a config file into fresh session keys. There is a single fixed set
of algorithms, so nothing is negotiated.*

**Standard:** Donenfeld, "WireGuard: Next Generation Kernel Network Tunnel"
(NDSS 2017, revised 2020), built on Trevor Perrin's Noise framework.
**Implementations:** Linux kernel (since 5.6, March 2020), wireguard-go
(userspace Go, inside the macOS and iOS apps), WireGuardNT (Windows kernel,
2021), BoringTun (Rust, Cloudflare). Tailscale runs on wireguard-go, and
Mullvad's VPN is built on WireGuard.

## One connection, one algorithm per category

`wg` isn't on a stock Mac, so here is the name the whitepaper (§5.4) gives
the whole suite, with the version string that gets hashed in right after it:

```
Construction  Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s
Identifier    WireGuard v1 zx2c4 Jason@zx2c4.com
```

| WireGuard name | Category | Algorithm inside |
|---|---|---|
| `IK` | [Key exchange](../index.md#1-key-exchange) | Noise IK pattern: the initiator already knows the responder's static key; four Diffie-Hellman results per handshake |
| `25519` | [Key exchange](../index.md#1-key-exchange) | [X25519](../01-key-exchange/ECDH.md#x25519-and-x448) for static and ephemeral keys |
| `psk2` | [Key exchange](../index.md#1-key-exchange) | optional 32-byte pre-shared key, mixed in after the second message (32 zero bytes when unused) |
| none | [Signature](../index.md#2-digital-signatures) | no signatures: each side pins the other's public key, and only its owner can finish the DH |
| `ChaChaPoly` | [Cipher](../index.md#5-cipher-modes-and-aead) | [ChaCha20-Poly1305](../05-modes-aead/AEAD.md#chacha20-poly1305) for handshake fields and every data packet, with a 64-bit counter as nonce |
| cookie reply | [Cipher](../index.md#5-cipher-modes-and-aead) | XChaCha20-Poly1305 with a random 24-byte nonce (see [ChaCha](../04-symmetric-ciphers/ChaCha.md)) |
| `BLAKE2s` | [Hash](../index.md#7-hash-functions) | [BLAKE2s](../07-hash/BLAKE.md#blake2)-256 for the running handshake hash |
| `mac1`, `mac2` | [MAC](../index.md#6-mac) | keyed BLAKE2s with 16-byte tags on handshake messages; data packets rely on Poly1305 |
| KDF | [KDF](../index.md#8-key-derivation-and-password-hashing) | [HKDF](../08-kdf-password-hashing/HKDF.md) built on HMAC-BLAKE2s |

**Why nothing is negotiated.** The whitepaper calls WireGuard
"cryptographically opinionated": no cipher agility, no protocol agility, and if
a primitive breaks, every endpoint updates. Asked on the netdev list in 2018
how that upgrade would work, Donenfeld answered that the protocol is strictly
versioned instead. The construction and identifier strings above are hashed
into the first step, every message starts with a type byte, and three reserved
bytes wait for later. A version 2 would change the strings and add message
types. With no menu of algorithms, there is nothing to downgrade.

## How a connection works

1. **Keys first.** Each peer has an X25519 key pair (`wg genkey`) and lists
   the other side's 44-character base64 public key in its config, much like
   `known_hosts` in [SSH](SSH.md) but set before the first packet.
2. **Initiation (148 bytes).** The initiator sends a fresh ephemeral key, its
   static key encrypted under DH(ephemeral, responder static), and an
   encrypted TAI64N timestamp. The responder drops any initiation whose
   timestamp isn't newer than the last one from that peer, which stops
   replays.
3. **Response (92 bytes).** The responder sends its own ephemeral key and an
   empty AEAD message. Opening it proves both sides did the same four DHs and
   mixed in the same PSK.
4. **Data.** Both sides derive one sending and one receiving key. The
   responder waits for the first data packet before it sends anything, which
   confirms the key. Each packet is zero-padded and sealed with
   ChaCha20-Poly1305 under a counter nonce.
5. **Rotation.** The initiator starts a new handshake once the session is 2
   minutes old (Rekey-After-Time, 120 s) or has sent 2⁶⁰ messages. After
   180 s (Reject-After-Time) the old keys are refused. New ephemeral keys each
   time give forward secrecy: a key stolen later can't open older traffic.

**Silence and cookies.** Every handshake message carries `mac1`, keyed with a
hash of the responder's public key. A wrong `mac1` gets no reply at all, so
scanners can't even tell the port is open. A responder under load skips the
X25519 work and sends a 64-byte cookie reply instead: a MAC of the sender's
IP address and port under a secret that changes every two minutes, encrypted
with XChaCha20-Poly1305 and tied to the `mac1` that caused it. The initiator
resends with `mac2`, a MAC under that cookie, which proves it owns the address
so the responder can rate-limit per IP.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange | X25519, Noise IK pattern | RFC 7748, Noise framework | — |
| Key exchange, post-quantum | optional 256-bit PSK; Rosenpass or a VPN provider can fill it from a post-quantum KEM | whitepaper §5.2 | — |
| Signature | none: static public keys pinned in the config | — | — |
| Cipher (AEAD) | ChaCha20-Poly1305 for data and handshake; XChaCha20-Poly1305 for cookies | RFC 7539 (now RFC 8439), IRTF XChaCha draft | — |
| MAC | Poly1305 inside the AEAD; keyed BLAKE2s for `mac1` and `mac2` | RFC 8439, RFC 7693 | — |
| Hash | BLAKE2s-256 | RFC 7693 | — |
| KDF | HKDF with HMAC-BLAKE2s | RFC 5869 | — |

The last column is empty on purpose: WireGuard v1 is the only version so far.

## Post-quantum

X25519 falls to a large quantum computer, and WireGuard has no post-quantum
KEM of its own. The PSK is the hedge. Mixed into the key schedule, a 256-bit
shared secret keeps recorded traffic safe even if X25519 breaks later, and the
whitepaper suggests it for exactly that. A PSK typed into two configs never
changes, though, so tools now refresh it from a post-quantum exchange:

- **Rosenpass** runs its own handshake beside WireGuard, with Classic McEliece
  460896 for static keys and ML-KEM-512 (Kyber-512 in older versions) for
  ephemeral ones, and hands WireGuard a new PSK every two minutes. Its
  protocol comes with a ProVerif analysis.
- **Mullvad** sets up the PSK with Classic McEliece 460896 and ML-KEM-1024
  together, through a short-lived peer on the relay. `wg show` then lists
  `preshared key: (hidden)` for the peer.

Because the PSK is only added to the mix, the tunnel is never weaker than
plain WireGuard if the post-quantum part fails.

## Seeing it on your machine

`wg` comes with wireguard-tools. Where it is installed:

```
wg genkey | tee private.key | wg pubkey > public.key   # X25519 key pair, base64
wg genpsk                                              # random 32-byte pre-shared key
sudo wg show                                           # peers, endpoints, last handshake, bytes
sudo wg show wg0 latest-handshakes                     # refreshes about every 2 minutes under traffic
```

- **Python:** every handshake starts from the same two hashes, then mixes in
  the responder's public key. Paste a `PublicKey =` line's value from a
  `[Peer]` section, or press Enter for Alice's key from RFC 7748.

```python
import base64, hashlib

def h(b):
    return hashlib.blake2s(b).digest()

pub = base64.b64decode(input("peer public key: ").strip() or
                       "hSDwCYkwp1R0i33ctD73Wg2/Og0mOBr066SpjqqbTmo=")
c = h(b"Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s")
hh = h(c + b"WireGuard v1 zx2c4 Jason@zx2c4.com")
print("C        ", c.hex())
print("H        ", hh.hex())
print("H + peer ", h(hh + pub).hex())
print("mac1 key ", h(b"mac1----" + pub).hex())
```

With the sample key it prints:

```
C         60e26daef327efc02ec335e2a025d2d016eb4206f87277f52d38d1988b78cd36
H         2211b361081ac566691243db458ad5322d9c6c662293e8b70ee19c65ba079ef3
H + peer  e7a5e4b40a7a5675887ad11042ccfc1112ed3507384bca39896693cfab32bdc6
mac1 key  0ec72453412f9befa2f799ea837d0b88429321711dd01f9025163123bd1905be
```

The first two values match the constants hard-coded in BoringTun
(`noise/handshake.rs`). Change one character of either string and every value
changes, which is how a future version would keep its handshakes apart.

## See also

- [SSH](SSH.md): pinned keys too, but with algorithm lists the client orders
- [TLS 1.3](TLS-1.3.md): one round trip as well, with certificates and a menu of suites
- [ECDH](../01-key-exchange/ECDH.md) / [BLAKE2](../07-hash/BLAKE.md) / [AEAD](../05-modes-aead/AEAD.md): the algorithms in depth
- [Code-based KEMs](../01-key-exchange/Code-Based-KEMs.md): Classic McEliece, which Rosenpass and Mullvad use

## References

- [Donenfeld, "WireGuard: Next Generation Kernel Network Tunnel" (NDSS 2017, rev. 2020)](https://www.wireguard.com/papers/wireguard.pdf) (Sections 5 and 6)
- [WireGuard protocol page](https://www.wireguard.com/protocol/) / [Noise Protocol Framework](https://noiseprotocol.org/noise.html)
- [Donenfeld on versioning, netdev list (13 Aug 2018)](https://lists.openwall.net/netdev/2018/08/13/110)
- [WireGuard 1.0.0 in Linux 5.6 (Mar 2020)](https://lists.zx2c4.com/pipermail/wireguard/2020-March/005206.html) / [WireGuardNT announcement (Aug 2021)](https://lists.zx2c4.com/pipermail/wireguard/2021-August/006887.html)
- [wireguard-go](https://git.zx2c4.com/wireguard-go/) / [BoringTun](https://github.com/cloudflare/boringtun) / [Tailscale, "How Tailscale works" (2020)](https://tailscale.com/blog/how-tailscale-works)
- [Rosenpass](https://github.com/rosenpass/rosenpass) / [Mullvad: quantum-resistant tunnels](https://mullvad.net/en/help/quantum-resistant-tunnels-with-wireguard)
- [RFC 7748: X25519](https://www.rfc-editor.org/rfc/rfc7748) / [RFC 7693: BLAKE2](https://www.rfc-editor.org/rfc/rfc7693) / [RFC 8439: ChaCha20-Poly1305](https://www.rfc-editor.org/rfc/rfc8439)
