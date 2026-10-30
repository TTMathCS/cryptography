# Threshold signatures

*Any t of n key holders sign together and the key is never rebuilt. Out
comes one ordinary signature under one public key.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

[Secret sharing](Secret-Sharing.md) protects a key at rest, but the key
comes back together every time it's used. A threshold scheme keeps it split:
each signer works only with its share, and any t of them produce a
signature that checks under the group's single public key. A verifier
can't tell it from a normal signature, and a thief needs t shares, not one.

- **FROST** (Komlo and Goldberg, SAC 2020) for Schnorr signatures. RFC 9591
  (June 2024, from the IRTF's CFRG) defines it for ristretto255, Ed25519,
  Ed448, P-256 and secp256k1. The Ed25519 and Ed448 versions produce
  signatures any RFC 8032 verifier accepts.
- **Threshold ECDSA**, because so much already verifies ECDSA. Two
  well-known protocols are GG18 (Gennaro and Goldfeder, CCS 2018) and CGGMP
  (Canetti, Gennaro, Goldfeder, Makriyannis and Peled, CCS 2020). There is
  no RFC.
- **BLS** (Boneh, Lynn and Shacham, ASIACRYPT 2001), on pairing-friendly
  curves. Its CFRG draft reached -07 in July 2026 and is still a draft.

NIST's call for threshold schemes (NIST IR 8214C) became final in January
2026. It asks for threshold signing, decryption, key generation and more,
for NIST-specified primitives (Class N) and others such as zero-knowledge
proofs and FHE (Class S). Teams presented previews through 2026; no
standard has come out of it yet.

## How it works

### FROST

The shares `xᵢ` of a Schnorr key x come from a trusted dealer (RFC 9591,
Appendix C) or from distributed key generation, where each participant
deals shares of its own random secret, with Feldman commitments and a
Schnorr proof that it knows the secret. Signing by a set S of t or more:

1. **Round 1:** each signer i picks two nonces `dᵢ, eᵢ` and publishes
   `Dᵢ = g^dᵢ` and `Eᵢ = g^eᵢ`. This can be done ahead of time.
2. **Round 2:** the coordinator sends the message m and the list B of
   commitments. Each signer computes binding factors `ρⱼ = H(P, m, B, j)`,
   the group commitment `R = Π Dⱼ·Eⱼ^ρⱼ`, the challenge `c = H(R, P, m)`,
   and its share `zᵢ = dᵢ + eᵢ·ρᵢ + λᵢ·xᵢ·c`, where `λᵢ` is its Lagrange
   coefficient for S.
3. **Aggregate:** `z = Σ zᵢ`. Then `(R, z)` is a plain Schnorr signature:
   `g^z = R·P^c`.

The second nonce and ρ are FROST's main idea. With one nonce each, an
attacker running many sessions at once can choose its nonces after seeing
the others' and forge (Drijvers et al., 2019, on two-round
multi-signatures). ρ ties every nonce to one message and one commitment list.

### Threshold ECDSA

ECDSA's `s = k⁻¹·(H(m) + r·x)` multiplies two secrets. Shares add but
don't multiply, so the signers must turn shares of two values into shares
of their product. GG18 and CGGMP do it with Paillier encryption and
zero-knowledge proofs that each party's numbers are in range. That means
more rounds and far more code than FROST. CGGMP also refreshes shares and
names the cheater when a run fails.

### BLS

A BLS signature is `σ = x·H(m)`, a curve point, checked with a pairing:
`e(g, σ) = e(P, H(m))`. It is deterministic and linear, so threshold BLS
needs no extra rounds: each signer sends `xᵢ·H(m)`, and anyone with t of
them combines them with Lagrange coefficients into the σ the whole key
would give (Boldyreva, PKC 2003).

BLS signatures from different keys also add into one point. Ethereum's
beacon chain (since 1 December 2020) uses the draft's -04
proof-of-possession suite on BLS12-381: 48-byte public keys, 96-byte
signatures. Votes on the same data are added and checked once against the
sum of the keys. The CFRG drafts put BLS12-381 at about 126 bits, a little
under 128.

## When to use it

- **Custody and "MPC wallets":** custodians and wallet makers keep coin
  keys as threshold ECDSA shares on separate machines, because Ethereum
  accounts and pre-Taproot Bitcoin outputs verify ECDSA.
- **Zcash:** ZIP 312 (a draft wallet spec) adapts FROST to shielded spends,
  re-randomized so signatures can't be linked. They verify as ordinary
  spend authorization signatures.
- **Ethereum validators:** BLS aggregation in consensus. Distributed
  validators split one validator's key with threshold BLS across several
  nodes, so a few can fail or misbehave.
- **Anything new:** FROST over Ed25519 or ristretto255, the only one of the
  three with an RFC.

## Example (Python)

The shape of FROST in the 2048-bit group from
[Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md): a dealer makes 2-of-3
shares, signers 1 and 3 sign, and the result checks as a plain Schnorr
signature under P. The hashing is made up for the demo; RFC 9591 fixes the
encodings for each ciphersuite, and real code uses an audited library.

```python
import hashlib, secrets
from math import prod

p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
g, q = 2, (p - 1) // 2                  # RFC 3526 group 14; 2 has prime order q

def H(*xs):                             # toy encoding, not RFC 9591's
    return int.from_bytes(hashlib.sha256(repr(xs).encode()).digest(), "big") % q

# trusted dealer: a random line through (0, x) gives 2-of-3 shares
x, a = secrets.randbelow(q), secrets.randbelow(q)
share = {i: (x + a * i) % q for i in (1, 2, 3)}
P = pow(g, x, p)                        # the group's public key
del x                                   # from here on nobody holds x

m, S = b"pay 5 to carol", (1, 3)        # signers 1 and 3 sign

# round 1: each signer picks two nonces and publishes g^d, g^e
nonce = {i: (secrets.randbelow(q), secrets.randbelow(q)) for i in S}
comm = {i: (pow(g, d, p), pow(g, e, p)) for i, (d, e) in nonce.items()}

# round 2: binding factors tie each nonce to this message and this set of commitments
rho = {i: H(P, m, sorted(comm.items()), i) for i in S}
R = 1
for i in S:
    R = R * comm[i][0] * pow(comm[i][1], rho[i], p) % p
c = H(R, P, m)
lam = {i: prod(j * pow(j - i, -1, q) for j in S if j != i) % q for i in S}   # Lagrange at 0
z = {i: (nonce[i][0] + nonce[i][1] * rho[i] + lam[i] * share[i] * c) % q for i in S}

s = sum(z.values()) % q                 # the coordinator adds the shares
print(pow(g, s, p) == R * pow(P, c, p) % p)   # True: a plain Schnorr check on (R, s)
```

## Security notes

- **Never reuse a nonce pair.** RFC 9591 makes each signer delete its
  nonces after one signing. A few signings with the same pair give away
  the share by plain algebra, as with [Schnorr](../02-signatures/Schnorr.md).
- **FROST isn't robust.** One silent signer stops the run. A bad `zᵢ` can
  be traced, a refusal can't; ROAST wraps FROST to try other subsets.
- **Threshold ECDSA is easy to get wrong.** In 2023 Makriyannis, Yomtov and
  Galansky showed key-extraction attacks on several popular implementations:
  one corrupt party could get the whole key, with one attack needing a
  single signature. Use a current protocol with every proof in place, from
  audited code.
- **Rogue keys.** Adding BLS public keys lets an attacker pick a key that
  cancels yours. The draft's three schemes block it with distinct messages,
  the key in the message, or proofs of possession (Ethereum checks one at
  deposit).
- **A trusted dealer sees the key.** Prefer distributed key generation.
- None of these survive a quantum computer running Shor's algorithm.

## See also

- [Secret sharing](Secret-Sharing.md): the shares underneath
- [Schnorr](../02-signatures/Schnorr.md) / [EdDSA](../02-signatures/EdDSA.md): what FROST produces
- [ECDSA](../02-signatures/ECDSA.md): what threshold ECDSA produces
- [Zero-knowledge proofs](Zero-Knowledge.md): the proofs inside key generation and threshold ECDSA

## References

- [Komlo and Goldberg, "FROST" (SAC 2020)](https://eprint.iacr.org/2020/852) / [RFC 9591: FROST](https://www.rfc-editor.org/rfc/rfc9591)
- [Drijvers et al., "On the Security of Two-Round Multi-Signatures" (IEEE S&P 2019)](https://eprint.iacr.org/2018/417)
- [Gennaro and Goldfeder (CCS 2018)](https://eprint.iacr.org/2019/114) / [Canetti et al. (CCS 2020)](https://eprint.iacr.org/2021/060)
- [Makriyannis, Yomtov and Galansky, "Practical Key-Extraction Attacks in Leading MPC Wallets" (2023)](https://eprint.iacr.org/2023/1234)
- Boneh, Lynn and Shacham, "Short Signatures from the Weil Pairing" (ASIACRYPT 2001) / [Boldyreva (PKC 2003)](https://eprint.iacr.org/2002/118)
- [draft-irtf-cfrg-bls-signature](https://datatracker.ietf.org/doc/draft-irtf-cfrg-bls-signature/) / [draft-irtf-cfrg-pairing-friendly-curves](https://datatracker.ietf.org/doc/draft-irtf-cfrg-pairing-friendly-curves/) (BLS12-381 security)
- [Ethereum consensus specs, phase 0](https://github.com/ethereum/consensus-specs/blob/master/specs/phase0/beacon-chain.md) / [distributed validator specs](https://github.com/ethereum/distributed-validator-specs)
- [ZIP 312: FROST for Spend Authorization Multisignatures](https://zips.z.cash/zip-0312)
- [NIST IR 8214C](https://csrc.nist.gov/pubs/ir/8214/c/final) / [NIST threshold cryptography project](https://csrc.nist.gov/projects/threshold-cryptography)
