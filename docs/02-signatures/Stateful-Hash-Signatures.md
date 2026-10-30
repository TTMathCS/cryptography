# Stateful hash-based signatures (LMS, XMSS)

*Signatures from a hash function and a counter. Small and well understood,
but each key signs a fixed number of times and the signer must never lose
count.*

**Status and standards:** see [Digital signatures](../index.md#2-digital-signatures)
in the main table.

## What it is

These were the first post-quantum signatures NIST approved. Like
[SLH-DSA](SLH-DSA.md) they need only a hash function, but the signer keeps a
counter.

- **LMS**, from Leighton and Micali's 1995 patent, is RFC 8554 (2019).
  **HSS** stacks up to eight LMS trees.
- **XMSS**, by Buchmann, Dahmen and Hülsing (2011), is RFC 8391 (2018).
  **XMSS^MT** is its multi-tree form.

NIST SP 800-208 (2020) approves all four, with SHA-256 or SHAKE256 at 256 or
192 bits, but calls them "not suitable for general use" because the state is
hard to manage.

| Parameter set | Signatures per key | Signature |
|---|---|---|
| LMS SHA-256, h = 10, w = 8 | 1,024 | 1,452 B |
| LMS SHA-256, h = 20, w = 8 | about a million | 1,772 B |
| LMS SHA-256/192, h = 15, w = 4 | 32,768 | 1,620 B |
| `XMSS-SHA2_20_256` | about a million | 2,820 B |

Public keys are under 70 bytes. SLH-DSA needs no counter, but its smallest
signature is 7,856 bytes and it signs far more slowly.

## How it works

- **Lamport one-time signature** (1979): the secret key is 256 pairs of
  random strings, the public key their hashes. To sign, reveal one string per
  pair, picked by each bit of the message hash.
- **Winternitz chains** (Merkle credits Robert Winternitz, 1979) shrink this.
  Each secret is hashed 2^w − 1 times to make its public value. A digit `a`
  is signed by revealing the value after `a` hashes; the verifier hashes the
  rest of the way. A signed checksum stops anyone from raising a digit. LMS
  uses w = 1, 2, 4 or 8, XMSS uses 16.
- **A Merkle tree** puts 2^h one-time public keys under one root, which is
  the public key. A signature carries the leaf number, the one-time signature
  and the h sibling hashes up to the root.

The state is the next unused leaf; after 2^h signatures the key is spent.
Building a tall tree means computing every leaf, so HSS and XMSS^MT stack
smaller trees and make the lower ones as needed.

XMSS's proof leans less on the random-oracle model (SP 800-208, appendix C).
LMS is simpler, and the set CNSA 2.0 recommends is an LMS one.

## When to use it

- **Firmware and boot signing:** few signatures, made in an HSM, checked by
  every device for years. NSA's CNSA 2.0 (2022) picks LMS and XMSS for
  software and firmware signing, recommends LMS with SHA-256/192, and wants
  them used exclusively there by 2030. Caliptra, an open-source root of trust
  for data-centre chips, can check its firmware with LMS next to ECDSA P-384.
- **Tools:** OpenSSL 3.6 (2025) verifies LMS. RFC 9708 and RFC 9802 carry
  these signatures in CMS and X.509.
- **Not** for anything that signs often or from many machines. Use
  [ML-DSA](ML-DSA.md), or [SLH-DSA](SLH-DSA.md) to stay hash-only.

## Example (Python)

A Lamport key with the standard library. LMS and XMSS put 2^h keys like this,
with Winternitz chains, under one Merkle root.

```python
import hashlib, secrets

H = lambda b: hashlib.sha256(b).digest()

def bits(msg):                           # the 256 bits of the message hash
    d = int.from_bytes(H(msg), "big")
    return [d >> i & 1 for i in range(256)]

def keygen():                            # 256 pairs of secrets and their hashes
    sk = [(secrets.token_bytes(32), secrets.token_bytes(32)) for _ in range(256)]
    return sk, [(H(a), H(b)) for a, b in sk]

def sign(sk, msg):                       # reveal one secret of each pair
    return [pair[b] for pair, b in zip(sk, bits(msg))]

def verify(pk, msg, sig):
    return all(H(s) == pair[b] for s, pair, b in zip(sig, pk, bits(msg)))

sk, pk = keygen()
s1 = sign(sk, b"firmware v1")
print(verify(pk, b"firmware v1", s1), verify(pk, b"firmware v2", s1))   # True False

s2 = sign(sk, b"firmware v2")            # the same key, used again
print(sum(a != b for a, b in zip(s1, s2)))   # 132 pairs now fully known
```

After the reuse, a forger only needs a message whose hash matches the other
124 bits, about 2¹²⁴ tries. Each further reuse roughly halves the bits left.

## Security notes

- **Never reuse a leaf.** Two signatures from one one-time key make forgery
  "computationally feasible" (SP 800-208). Lamport wears down slowly, but
  Winternitz keys have no real security left after two (Bruinderink and
  Hülsing, 2016).
- **Reuse comes from ordinary things:** restoring a backup or VM snapshot, a
  second signer with a copy of the key, or a crash before the new counter
  reaches disk.
- So SP 800-208 allows key generation and signing only in hardware modules
  (FIPS 140 Level 3 or higher) that never export the private key. For backup
  it suggests separate keys, or HSS or XMSS^MT with lower trees in different
  modules.
- Only the hash has to hold. RFC 8391 rates the 256-bit sets at 128 bits
  against a quantum attacker.

## See also

- [SLH-DSA](SLH-DSA.md): the stateless hash-based signature
- [ML-DSA](ML-DSA.md): the general-purpose post-quantum signature
- [SHA-2](../07-hash/SHA-2.md): the hash underneath

## References

- [RFC 8554: LMS and HSS](https://www.rfc-editor.org/rfc/rfc8554) / [RFC 8391: XMSS](https://www.rfc-editor.org/rfc/rfc8391)
- [NIST SP 800-208: stateful hash-based signatures](https://csrc.nist.gov/pubs/sp/800/208/final)
- [Lamport, "Constructing Digital Signatures from a One Way Function" (1979)](https://www.microsoft.com/en-us/research/publication/constructing-digital-signatures-one-way-function/)
- [Merkle, "A Certified Digital Signature" (CRYPTO '89)](https://doi.org/10.1007/0-387-34805-0_21)
- [Buchmann, Dahmen, Hülsing, "XMSS" (PQCrypto 2011)](https://eprint.iacr.org/2011/484)
- [Bruinderink, Hülsing, "Oops, I did it again" (2016)](https://eprint.iacr.org/2016/1042)
- [RFC 9708: HSS/LMS in CMS](https://www.rfc-editor.org/rfc/rfc9708) / [RFC 9802: HSS and XMSS in X.509](https://www.rfc-editor.org/rfc/rfc9802)
- [Caliptra ROM specification](https://chipsalliance.github.io/caliptra-web/docs/1.2/firmware/rom_spec.html) / [OpenSSL 3.6 release notes](https://openssl-library.org/news/openssl-3.6-notes/)
- [NSA, CNSA 2.0 algorithms](https://media.defense.gov/2025/May/30/2003728741/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS.PDF)

*Weaker sources:* the CNSA 2.0 details as given in
[Wikipedia's copy of the NSA table](https://en.wikipedia.org/wiki/Commercial_National_Security_Algorithm_Suite)
and [atsec's summary](https://atsec.de/cnsa-2-0-and-quantum-resistant-encryption-algorithms/).
