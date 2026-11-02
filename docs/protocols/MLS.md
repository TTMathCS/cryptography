# MLS (Messaging Layer Security)

*End-to-end encryption for groups of two to thousands. Each change to the
group starts a new epoch with a new shared secret, and a binary tree of key
pairs lets one member re-key everyone with about log n encryptions.*

**Standard:** RFC 9420 (July 2023); architecture in RFC 9750 (April 2025,
Informational); HPKE, RFC 9180 (2022); post-quantum suites in an IETF draft
(2026). **Implementations:** OpenMLS (Rust; Wire's core-crypto uses a fork),
mls-rs (Rust, AWS), MLSpp (C++, Cisco; under Discord's libdave), ts-mls
(TypeScript), Bouncy Castle (Java). Discord calls, Webex meetings and
cross-platform RCS chats run it.

## One message, one algorithm per category

There's no `mls` command, so this is real output from a short Rust program
using OpenMLS 0.9.2 (Rust 1.97, Ubuntu 24.04 in a container, Oct 2026). Alice
makes a group, adds Bob from his KeyPackage and sends him one message:

```
cipher suite 0x0001 MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519
  KEM DhKem25519, KDF HkdfSha256, AEAD Aes128Gcm, hash Sha2_256, signature ED25519
Bob's KeyPackage: 275 bytes, HPKE init key 32 bytes
Alice creates the group: epoch 0
Alice adds Bob: Commit (PrivateMessage) 683 bytes, Welcome 787 bytes, epoch 1
Bob joins from the Welcome: epoch 1, 2 members
epoch_authenticator  Alice c3f677a8b637a519…  Bob c3f677a8b637a519…
"hi Bob" sent as a PrivateMessage: 151 bytes
Bob reads: hi Bob
```

| MLS name | Category | Algorithm inside |
|---|---|---|
| `DHKEMX25519` | [Key exchange](../index.md#1-key-exchange) | [X25519](../01-key-exchange/ECDH.md#x25519-and-x448) as the KEM inside HPKE |
| HPKE base mode | [Public-key encryption](../index.md#3-public-key-encryption) | [HPKE](../03-public-key-encryption/HPKE.md) (`0x0020`, `0x0001`, `0x0001`): path secrets to tree nodes, the joiner secret to a new member's init key |
| `Ed25519` | [Signature](../index.md#2-digital-signatures) | [Ed25519](../02-signatures/EdDSA.md) signs KeyPackages, leaf nodes, GroupInfo and the content of every message |
| `AES128GCM` | [Cipher](../index.md#5-cipher-modes-and-aead) | [AES](../04-symmetric-ciphers/AES.md)-128 in [GCM](../05-modes-aead/AEAD.md#aes-gcm) for each PrivateMessage and inside HPKE |
| `SHA256` | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md) for the transcript hash, the tree hash and KeyPackage references |
| MAC | [MAC](../index.md#6-mac) | [HMAC](../06-mac/HMAC.md)-SHA256: a confirmation tag on every Commit, a membership tag on unencrypted messages |
| KDF | [KDF](../index.md#8-key-derivation-and-password-hashing) | [HKDF](../08-kdf-password-hashing/HKDF.md)-SHA256, every label prefixed `MLS 1.0 ` |

**Why one suite for the whole group?** The creator picks the best suite all
members' KeyPackages support (§11), and it never changes: it sits in the
GroupContext, which goes into every epoch's secrets. Moving to a new one, say
a post-quantum suite, takes a ReInit: a new group with the same members, tied
to the old by a resumption PSK. Every client must implement `0x0001` (§17.1);
Discord uses `0x0002` (P-256, ECDSA).

## How a group works

1. **KeyPackages.** Each client uploads signed, one-time KeyPackages: an HPKE
   init key plus its future leaf (encryption key, credential, signature key).
   Like Signal's prekeys, they let others add a client that is offline.
2. **Add and Welcome.** A group starts with one member at epoch 0. Alice adds
   Bob with a Commit holding an Add proposal. Bob's Welcome carries the
   joiner_secret, HPKE-encrypted to his init key, and the signed GroupInfo,
   encrypted under a key derived from that secret.
3. **The ratchet tree (TreeKEM).** Members are the leaves of a binary tree
   whose nodes hold HPKE key pairs; each member knows the private keys on its
   path to the root. A Commit's update path brings a fresh leaf key and new
   path secrets up to the root (each DeriveSecret of the last), each one
   HPKE-encrypted to the subtree beside it: log₂ n ciphertexts in a full tree
   instead of n − 1. The secret past the root is the commit_secret.
4. **Epochs and the key schedule** (§8). HKDF-Extract mixes the old
   init_secret with the commit_secret; ExpandWithLabel binds in the
   GroupContext (group ID, epoch, tree hash, transcript hash) to give the
   joiner_secret, then the epoch_secret. DeriveSecret turns that into the
   encryption, sender-data and exporter secrets, the confirmation and
   membership keys, the epoch_authenticator and the next init_secret.
5. **Per-message keys** (§9). The encryption_secret is split down a second
   tree of the same shape to each leaf, which runs two hash ratchets (handshake
   and application); step j gives one AEAD key and nonce. The sender's leaf
   and step are encrypted under a key from the sender_data_secret.
6. **Remove and update.** A Remove blanks the leaver's path, and the new path
   secrets go only to the remaining subtrees. A Commit with a fresh leaf key
   locks out whoever stole the old one (post-compromise security). Deleting
   old epoch secrets and used message keys gives forward secrecy.

**Servers.** MLS trusts an Authentication Service to vouch for credentials
and a Delivery Service only to deliver (§3, RFC 9750). The application must
pick one Commit per epoch (§14); Discord's server forwards the first valid one.

**Where it runs.** Discord's DAVE protocol (2024) puts every voice and video
call except Stage channels on MLS, and since March 2026 clients without it
can't join. Each sender's media key comes from MLS-Exporter, and frames use
AES-128-GCM with 8-byte tags. Webex's Zero-Trust meetings use MLS with
SFrame. RCS Universal Profile 3.0 (GSMA, March 2025) specifies MLS for
encrypted RCS across apps; iOS 26.5 and Google Messages switched it on in beta
in May 2026, with supported carriers.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key exchange (HPKE KEM) | **128-bit suites (1–3):** DHKEM(X25519) in 1 and 3, DHKEM(P-256) in 2<br>**256-bit suites (4–7):** X448, P-521, P-384 | RFC 9420 §17.1, RFC 9180, RFC 7748 | — |
| Key exchange, post-quantum | ML-KEM-768 + X25519 (X-Wing), ML-KEM-768 + P-256, ML-KEM-1024 + P-384, ML-KEM-768/1024 alone | draft-ietf-mls-pq-ciphersuites-06 (2026), FIPS 203 | — |
| Signature | **EdDSA:** Ed25519 (1, 3), Ed448 (4, 6)<br>**ECDSA:** P-256 (2), P-521 (5), P-384 (7) | RFC 8032, FIPS 186-5 | — |
| Signature, post-quantum | ML-DSA-44/65/87, in three of the draft suites | same draft, FIPS 204 | — |
| Cipher (AEAD) | AES-128-GCM (1, 2), ChaCha20-Poly1305 (3, 6), AES-256-GCM (4, 5, 7) | SP 800-38D, RFC 8439 | — |
| MAC | HMAC with the suite's hash for confirmation and membership tags; AEAD tags on all encrypted data | RFC 2104 | — |
| Hash | SHA-256 (1–3), SHA-512 (4–6), SHA-384 (7) | FIPS 180-4 | — |
| KDF | HKDF with the suite's hash, through ExpandWithLabel and DeriveSecret | RFC 5869, RFC 9420 §8 | — |

Only suite 1 is mandatory, and 15 GREASE values such as `0x0A0A` are
reserved so clients learn to skip unknown codes. The last column is empty:
MLS 1.0 (`mls10`) is the only version.

**Post-quantum.** Traffic recorded under any RFC 9420 suite could be read by
a future quantum computer. MLS only needs a KEM, so new suites drop in.
draft-ietf-mls-pq-ciphersuites (-06, July 2026) asks for 11: eight pair
ML-KEM or a hybrid with Ed25519 or ECDSA, giving "authenticity against
classical attacks only", and three sign with ML-DSA. The X25519 hybrid is
X-Wing, HPKE KEM `0x647A` (see [post-quantum HPKE](../03-public-key-encryption/HPKE.md#post-quantum-hpke)).
The code points are still "TBD"; OpenMLS 0.9 (August 2026) has the suites
behind a feature flag with provisional numbers, such as `0x004F`.

## Seeing it on your machine

There's no MLS command-line tool, but the interop test vectors are public:

```
git clone --depth 1 https://github.com/mlswg/mls-implementations
cd mls-implementations/test-vectors
ls                                                  # one JSON file per part of RFC 9420
python3 -m json.tool key-schedule.json | head -30   # suite 1, first epoch, every secret
```

- **In a Discord call:** the apps show the epoch_authenticator as a 30-digit
  code in groups of five. Everyone in the call should see the same digits, and
  they change when someone joins or leaves, which starts a new epoch.
- **Python:** the first epoch of that key schedule vector, with hashlib and
  hmac. Press Enter to use the vector's commit secret.

```python
import hashlib, hmac

def mac(k, m):
    return hmac.new(k, m, hashlib.sha256).digest()

def vec(b):                                    # length prefix, RFC 9420 §2.1.2
    return (bytes([len(b)]) if len(b) < 64 else (0x4000 | len(b)).to_bytes(2, "big")) + b

def expand(secret, label, context=b"", n=32):  # ExpandWithLabel (HKDF-Expand, n <= 32)
    info = n.to_bytes(2, "big") + vec(b"MLS 1.0 " + label) + vec(context)
    return mac(secret, info + b"\x01")[:n]

h = bytes.fromhex
commit = h(input("commit secret (hex): ") or
           "a22606222e350fd7f0937168fe7548fb06626ab143cba7611d641693b1447509")
init = group_id = h("a897b53575b4dd35fed4466e4e714bfa949eaa72e616a9c68a47b39cb7a60d2e")
psk = h("e871b247379522395689182736cb3d1e7b108d6ae934b802223975de8dc3f80b")
tree_hash = h("9769e302a99c457350a8e636009b12a2fee068664004606d6318eb3a1977d818")
transcript = h("5e57c9364dc71f0f71b19ffe561ab77257c490708a47e29f8f73f2b318201d2f")

# GroupContext: mls10, suite 0x0001, group ID, epoch 0, two hashes, no extensions
ctx = (h("00010001") + vec(group_id) + bytes(8) + vec(tree_hash)
       + vec(transcript) + vec(b""))
joiner = expand(mac(init, commit), b"joiner", ctx)    # HKDF-Extract is HMAC(salt, ikm)
member = mac(joiner, psk)
epoch = expand(member, b"epoch", ctx)
auth = expand(epoch, b"authentication")
print("joiner_secret      ", joiner.hex())
print("welcome_secret     ", expand(member, b"welcome").hex())
print("encryption_secret  ", expand(epoch, b"encryption").hex())
print("init_secret        ", expand(epoch, b"init").hex())
print("epoch_authenticator", auth.hex())
code = [int.from_bytes(auth[i:i + 5], "big") % 100000 for i in range(0, 30, 5)]
print("as a Discord code  ", " ".join(f"{c:05}" for c in code))
```

```
joiner_secret       4fb996ba26b29a70f3ce6c310151ce8701cb812d027f4d4bbf5cc4e9f884638d
welcome_secret      ddcd9ced2d264798f876cbd00a200cdc4d77311dfef96975257efb66b0ef2c4d
encryption_secret   01588615c93d02c83bda0b587473303b1637a92bf80783206d963f9197c40a13
init_secret         505be2ce2ff922aa11e0a03d76346dda2981f1d9edf5cf98ecfc8757f69b00c9
epoch_authenticator 7375d449cde2c5a856c13c8eb52c16bf9ef29eceef59b09d1f946bd1bac24643
as a Discord code   85837 52705 75734 54030 30527 66754
```

The first five lines match `key-schedule.json` (cipher suite 1, epoch 0). The
last applies the rule from Discord's DAVE spec: five bytes at a time,
big-endian, mod 100000.

## See also

- [Signal](Signal.md): the two-party ratchets RFC 9420 starts from; Google Messages uses Signal between Android phones
- [HPKE](../03-public-key-encryption/HPKE.md): the public-key encryption every tree update uses
- [TLS 1.3](TLS-1.3.md): a key schedule of labelled HKDF steps too, and the struct notation MLS borrows
- [HKDF](../08-kdf-password-hashing/HKDF.md) / [AEAD](../05-modes-aead/AEAD.md) / [EdDSA](../02-signatures/EdDSA.md): the algorithms in depth
- [ML-KEM](../01-key-exchange/ML-KEM.md) / [ML-DSA](../02-signatures/ML-DSA.md): what the post-quantum suites add

## References

- [RFC 9420: The Messaging Layer Security (MLS) Protocol](https://www.rfc-editor.org/rfc/rfc9420) (Sections 3, 5, 7–9, 11, 14, 17.1) / [source](https://github.com/mlswg/mls-protocol/blob/main/rfc9420.md)
- [RFC 9750: The MLS Architecture](https://www.rfc-editor.org/rfc/rfc9750) / [RFC 9180: HPKE](https://www.rfc-editor.org/rfc/rfc9180)
- [draft-ietf-mls-pq-ciphersuites](https://datatracker.ietf.org/doc/draft-ietf-mls-pq-ciphersuites/) / [source](https://github.com/mlswg/mls-pq-ciphersuites)
- [MLS interop test vectors](https://github.com/mlswg/mls-implementations/tree/main/test-vectors) (`key-schedule.json`) / [implementation list](https://github.com/mlswg/mls-implementations/blob/main/implementation_list.md)
- [OpenMLS](https://github.com/openmls/openmls) (`CHANGELOG.md`, `traits/src/types.rs`) / [mls-rs](https://github.com/awslabs/mls-rs) / [MLSpp](https://github.com/cisco/mlspp) / [Wire core-crypto](https://github.com/wireapp/core-crypto) (`Cargo.toml`)
- [Discord DAVE protocol, v1.1](https://github.com/discord/dave-protocol/blob/main/protocol.md) / [libdave](https://github.com/discord/libdave) / [Discord blog: every voice and video call is now end-to-end encrypted (2026)](https://discord.com/blog/every-voice-and-video-call-on-discord-is-now-end-to-end-encrypted)
- [GSMA: RCS encryption based on MLS (Mar 2025)](https://www.gsma.com/newsroom/article/rcs-encryption-a-leap-towards-secure-and-interoperable-messaging/) / [Google: E2EE RCS for Android and iPhone (May 2026)](https://blog.google/products-and-platforms/platforms/android/android-ios-end-to-end-encrypted-rcs-messaging) / [Webex: Zero-Trust end-to-end encryption](https://help.webex.com/en-us/article/5h5d8ab)

*Weaker sources:* search-engine summaries of pages that could not be opened here: the Discord blog (March 2026 cutoff), Google's blog and Apple's iOS 26.5 notes as reported by TidBITS and 9to5Mac (May 2026 beta), the Webex help article (MLS with SFrame), and the RFC Editor and Datatracker pages for the RFC 9420 and RFC 9750 dates.
