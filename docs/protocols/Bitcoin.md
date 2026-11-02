# Bitcoin

*A public ledger of payments that every node checks for itself. Coins are
locked to public keys and spent with signatures, and blocks are chained by
SHA-256 proof of work. Nothing on the chain is encrypted: the crypto proves
who may spend and that history wasn't rewritten, to anyone who checks.*

**Standard:** Satoshi Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash
System" (whitepaper, 2008). No RFCs: the reference code sets the rules, and
changes come as BIPs: strict DER, BIP-66 (2015); SegWit, BIP-141/143 (2017);
Schnorr and Taproot, BIP-340 to 342 (2021); v2 encrypted transport, BIP-324
(2023); wallet keys, BIP-32 (2012) and BIP-39 (2013). **Implementations:**
Bitcoin Core (32.1, Oct 2026) with libsecp256k1 (0.8.0, Aug 2026); btcd (Go).

## One transaction, one algorithm per category

No `bitcoind` here, so this is BIP-143's worked example ("Native P2WPKH"),
trimmed: a transaction spending a pay-to-public-key (P2PK) and a SegWit v0
output, then a Taproot witness from BIP-341's test vectors. Python's `hashlib`
(3.13, Ubuntu 24.04 container, Oct 2026) gets the same HASH160 and sighash.

```
input 0  scriptSig  48 3045 0221 008b9d1d…dd30be 0220 40529b19…8ef3ed 01   # P2PK: DER ECDSA (r, s), SIGHASH_ALL
input 1  witness    3044 0220 3609e17b…1cc44a 0220 573a954c…7eebee 01      # P2WPKH: the same, then the key
                    025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357
         spends     0014 1d0f172a0ecb48aee1be1f2687d2963ae33f71a1        # version 0 + HASH160 of that key
         sighash    c37af31116d1b27caf68aae9e3ac82f1477929014d5b917657d0eb49478cb670
Taproot  witness    b4010dd48a617db0…83bfd6810f                         # BIP-340 Schnorr, 64 bytes
```

| Bitcoin name | Category | Algorithm inside |
|---|---|---|
| `OP_CHECKSIG`, legacy and SegWit v0 | [Signature](../index.md#2-digital-signatures) | [ECDSA](../02-signatures/ECDSA.md) on [secp256k1](../10-math-foundations/Elliptic-Curves.md#the-named-curves), DER-encoded, low S, plus a sighash byte |
| Taproot key path, tapscript | [Signature](../index.md#2-digital-signatures) | [Schnorr (BIP-340)](../02-signatures/Schnorr.md): 64-byte signatures, 32-byte x-only keys |
| txid, block hash, proof of work, Merkle root, legacy and v0 sighash | [Hash](../index.md#7-hash-functions) | SHA-256d: [SHA-256](../07-hash/SHA-2.md) applied twice |
| `TapSighash`, `TapLeaf`, `TapTweak` | [Hash](../index.md#7-hash-functions) | tagged hash: SHA-256(SHA-256(tag) ‖ SHA-256(tag) ‖ data) |
| HASH160 (P2PKH, P2SH, P2WPKH) | [Hash](../index.md#7-hash-functions) | [RIPEMD-160](../07-hash/Retired.md#ripemd-160) of SHA-256, 20 bytes |
| BIP-32 key tree | [KDF](../index.md#8-key-derivation-and-password-hashing) | [HMAC](../06-mac/HMAC.md)-SHA512; the master key is HMAC keyed with "Bitcoin seed" |
| BIP-39 seed phrase | [KDF](../index.md#8-key-derivation-and-password-hashing) | [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)-HMAC-SHA512, 2,048 iterations, salt "mnemonic" + passphrase |
| BIP-324 handshake | [Key exchange](../index.md#1-key-exchange) | [ECDH](../01-key-exchange/ECDH.md) on secp256k1 with 64-byte ElligatorSwift keys, then [HKDF](../08-kdf-password-hashing/HKDF.md)-SHA256 |
| BIP-324 packets | [Cipher](../index.md#5-cipher-modes-and-aead) | [ChaCha20-Poly1305](../05-modes-aead/AEAD.md#chacha20-poly1305); lengths with plain ChaCha20 |

**Why hash the key into the address?** A P2PKH or P2WPKH output holds 20
bytes, not a 33-byte key, and the key stays unseen until the coins move.
Taproot puts the 32-byte key in the output, so a key-path spend is a single
signature and every signature can be batch-verified. BIP-341 calls the hash's
protection "very weak at best": a spend shows the key before it is confirmed.

## How a transaction works

1. **Keys.** A random 256-bit secret, or one derived from a seed: a BIP-39
   phrase goes through PBKDF2, then BIP-32 HMAC-SHA512 steps down a path.
   Bitcoin Core skips BIP-39 and keeps BIP-32 keys in its descriptors.
2. **Address.** Core's default, P2WPKH, is version 0 plus HASH160 of the
   compressed key, in bech32 (`bc1q…`). Taproot's `bc1p…` (bech32m) holds
   Q = P + H_TapTweak(P ‖ root)·G, which also commits to an optional script
   tree. The checksums catch typos; they are codes, not hashes.
3. **Signing.** The sighash covers the transaction and, since BIP-143 and
   BIP-341, the amounts spent. Core signs ECDSA with RFC 6979 nonces, retrying
   until r fits in 32 bytes (since 0.17, 2018). For Schnorr it passes zeros as
   BIP-340's extra randomness, which the BIP allows but doesn't recommend.
4. **Broadcast.** Since 27.0 (April 2024) Core tries BIP-324 with each peer:
   ElligatorSwift ECDH, HKDF-SHA256, then ChaCha20-Poly1305, rekeyed every 224
   messages; the bytes look random. Nobody is authenticated: a man in the
   middle must stay active, and peers can compare session IDs.
5. **Mining.** The block header commits to the previous block and a Merkle
   root of the txids. Miners vary it until its SHA-256d is at most the target
   in `bits`, reset every 2,016 blocks to keep about ten minutes per block.
6. **Verification.** Every full node checks the work, every signature and
   that no coin is spent twice. libsecp256k1 signs in constant time and uses
   secp256k1's GLV endomorphism to speed up verification.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Signature | ECDSA secp256k1 (P2PKH, P2WPKH: Core's default), Schnorr (Taproot) | SEC 2, BIP-66, BIP-340 to 342 | non-DER signatures (invalid since block 363,725, 2015); high S (non-standard since Core 0.11.1, 2015); uncompressed keys in SegWit v0 (non-standard) |
| Signature, many signers | `OP_CHECKMULTISIG`; MuSig2 behind one Taproot key (Core signs since 31.0) | BIP-327, BIP-390 | — |
| Key exchange (P2P) | ECDH secp256k1 with ElligatorSwift; default since Core 27.0 | BIP-324 | v1 plaintext transport (still the fallback); BIP-151 (never deployed) |
| Cipher | ChaCha20-Poly1305 (P2P); AES-256-CBC for keys in an encrypted Core wallet | RFC 8439, BIP-324; Core `crypter.cpp` | — |
| MAC | Poly1305 inside the AEAD | RFC 8439 | — |
| Hash | SHA-256d (txid, wtxid, blocks, proof of work, Base58Check)<br>HASH160<br>SHA-256 (P2WSH)<br>tagged SHA-256 (Taproot) | FIPS 180-4, BIP-141, BIP-340 | — |
| KDF | **Wallet keys:** HMAC-SHA512 (BIP-32), PBKDF2-HMAC-SHA512 (BIP-39)<br>**Peer connections:** HKDF-SHA256 (BIP-324)<br>**Core wallet passphrase:** SHA-512 iterated ≥ 25,000 times, about 100 ms | BIP-32, BIP-39, RFC 5869 | — |

ECDSA accepts both s and n − s, so anyone could flip s and change a legacy
txid. Low S, a relay rule, keeps one; BIP-66 banned other encodings, and
SegWit leaves signatures out of the txid altogether.

## Post-quantum

Shor's algorithm on a large quantum computer would recover a private key from
its public key, breaking ECDSA and Schnorr alike; hashes face only Grover's
square-root speedup ([Hard problems](../10-math-foundations/Hard-Problems.md#shor-and-grover)).
Keys show in P2PK and Taproot outputs, in any address after its first spend
(so reuse exposes what is left) and under a published xpub. BIP-361 counts
"over 34%" of all bitcoin behind keys revealed on chain (1 March 2026). Two
proposals have numbers, both Draft in October 2026; Core 32.1 has neither:

- **BIP-360, Pay-to-Merkle-Root (P2MR)**, merged February 2026 (drafted in
  2024 as P2QRH): Taproot without the key path, SegWit version 2, `bc1z…`. It
  adds no signature (ML-DSA or SLH-DSA could come later as opcodes) and guards
  keys at rest ("long exposure"), not one seen in the mempool during a spend.
- **BIP-361, Post Quantum Migration and Legacy Signature Sunset**, merged April
  2026, waits for a post-quantum signature BIP. 160,000 blocks (about 3 years)
  after activation, payments to vulnerable outputs stop; 2 years later, ECDSA
  and Schnorr spends need a quantum-safe "rescue" proof, such as knowing the
  BIP-32 seed behind the key.

Freezing is the contested part: BIP-361 calls it "at most mildly confiscatory"
if rescue proofs cover most coins, but P2PK coins have none (it points to an
"Hourglass" proposal). Post-quantum signature drafts were closed unnumbered.

## Seeing it on your machine

```
bitcoin-cli getblockheader $(bitcoin-cli getblockhash 0) false   # the 80-byte genesis header, hex
bitcoin-cli -netinfo 1                                           # peers; v = 2 means BIP-324
bitcoin-cli getnewaddress "" bech32m                             # a Taproot address, bc1p…
bitcoin-cli decoderawtransaction <hex>                           # txid, hash (wtxid), txinwitness
```

- **Python:** checks a header's proof of work (Enter for the genesis block's),
  then turns the key the genesis block pays to into an address. RIPEMD-160 comes
  from OpenSSL, and some OpenSSL 3 builds leave it out (`ValueError`).

```python
import hashlib

GENESIS = ("01000000" + "00" * 32                    # version 1, no previous block
           + "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a"
           + "29ab5f49" + "ffff001d" + "1dac2b7c")    # time, bits, nonce (little-endian)
KEY = bytes.fromhex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61de"
                    "b649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f")

def sha256d(b):
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()

header = bytes.fromhex(input("80-byte header in hex: ").strip() or GENESIS)
bits = int.from_bytes(header[72:76], "little")
target = (bits & 0x7fffff) << 8 * ((bits >> 24) - 3)   # 3-byte mantissa, 1-byte exponent
h = sha256d(header)
print("block hash", h[::-1].hex())
print("target    ", f"{target:064x}")
print("proof of work ok:", int.from_bytes(h, "little") <= target)

h160 = hashlib.new("ripemd160", hashlib.sha256(KEY).digest()).digest()
n, addr = int.from_bytes(b"\0" + h160 + sha256d(b"\0" + h160)[:4], "big"), ""
while n:                                     # Base58 of version 0, HASH160, checksum
    n, r = divmod(n, 58)
    addr = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[r] + addr
print("HASH160   ", h160.hex(), "-> 1" + addr)   # the zero version byte is written "1"
```

```
block hash 000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f
target     00000000ffff0000000000000000000000000000000000000000000000000000
proof of work ok: True
HASH160    62e907b15cbf27d5425399ebf6f0fb50ebb88f18 -> 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
```

Bitcoin Core asserts this hash in `src/kernel/chainparams.cpp`; the address is
BIP-360's P2PKH example. The hash has 43 leading zero bits, the target 32.

## See also

- [Schnorr](../02-signatures/Schnorr.md) / [ECDSA](../02-signatures/ECDSA.md) / [Elliptic curves](../10-math-foundations/Elliptic-Curves.md#the-named-curves): BIP-340, the nonce problem and secp256k1 in depth
- [Retired random generators](../09-random/Retired.md#android-securerandom-2013): the 2013 Android bug that leaked Bitcoin keys through repeated ECDSA nonces
- [WireGuard](WireGuard.md): ChaCha20-Poly1305 and one fixed suite too, but with authenticated keys
- [SLH-DSA](../02-signatures/SLH-DSA.md) / [ML-DSA](../02-signatures/ML-DSA.md): the post-quantum signatures BIP-360 names

## References

- [Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System" (2008)](https://bitcoin.org/bitcoin.pdf) (Sections 2, 4 and 7)
- [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) / [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) / [BIP-66](https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki) / [BIP-146](https://github.com/bitcoin/bips/blob/master/bip-0146.mediawiki) / [BIP-141](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki) / [BIP-143](https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki) ("Native P2WPKH") / [BIP-173](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki) / [BIP-350](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki) / [BIP-9 deployments](https://github.com/bitcoin/bips/blob/master/bip-0009/assignments.mediawiki)
- [BIP-340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki) / [BIP-341](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki) (Deployment; [test vectors](https://github.com/bitcoin/bips/blob/master/bip-0341/wallet-test-vectors.json)) / [BIP-342](https://github.com/bitcoin/bips/blob/master/bip-0342.mediawiki) / [BIP-327: MuSig2](https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki)
- [BIP-324: v2 P2P transport](https://github.com/bitcoin/bips/blob/master/bip-0324.mediawiki) / [Chávez-Saab, Rodríguez-Henríquez and Tibouchi, "SwiftEC" (2022)](https://eprint.iacr.org/2022/759) / [RFC 8439](https://www.rfc-editor.org/rfc/rfc8439) / [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)
- [BIP-360: P2MR](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki) (Changelog) / [BIP-361](https://github.com/bitcoin/bips/blob/master/bip-0361.mediawiki) / [BIPs pull requests on "quantum"](https://github.com/bitcoin/bips/pulls?q=is%3Apr+quantum)
- [Bitcoin Core](https://github.com/bitcoin/bitcoin) (`src/kernel/chainparams.cpp`, `src/pow.cpp`, `src/key.cpp`, `src/script/sign.cpp`, `src/wallet/crypter.cpp`, `src/wallet/walletutil.cpp`, `doc/bips.md`) / release notes [0.17.0](https://github.com/bitcoin/bitcoin/blob/master/doc/release-notes/release-notes-0.17.0.md), [27.0](https://github.com/bitcoin/bitcoin/blob/master/doc/release-notes/release-notes-27.0.md), [32.1](https://github.com/bitcoin/bitcoin/blob/v32.1/doc/release-notes.md) / [libsecp256k1](https://github.com/bitcoin-core/secp256k1) (`README.md`, `CHANGELOG.md`) / [btcd](https://github.com/btcsuite/btcd)

*Weaker sources:* the whitepaper's text was read from a LaTeX transcription
(github.com/karask/satoshi-paper), as bitcoin.org was not reachable from here.
