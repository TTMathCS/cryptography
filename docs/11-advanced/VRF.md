# VRF (verifiable random function)

*A keyed hash that comes with a proof. Only the key holder can compute the
output, and anyone with the public key can check it. Proof-of-stake chains
use it to pick leaders, and key directories use it to hide usernames.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

A pseudorandom function `F(k, x)` looks random to anyone without the key
k, but nobody else can check that a value really is `F(k, x)`. Micali,
Rabin and Vadhan (FOCS 1999) added a public key: the key holder gives the
output β with a proof π, and anyone with the public key can check them.
RFC 9381 asks for three things:

- **Uniqueness:** each input has only one output that verifies, so the key
  holder can't pick a convenient one. ECDSA, by contrast, has a valid
  signature for every nonce.
- **Collision resistance:** nobody can find two inputs with the same output.
- **Pseudorandomness:** without the secret key or a proof, the output
  looks random.

"Full" uniqueness and collision resistance hold even for a key made to
cheat; "trusted" ones assume an honest key.

RFC 9381 (August 2023, from the IRTF's CFRG) defines two VRFs. RSA-FDH-VRF
uses SHA-256, SHA-384 or SHA-512, and its proof is as long as the modulus.
ECVRF runs on P-256 or edwards25519 with an 81- or 80-byte proof; it grew
out of the NSEC5 work (Papadopoulos et al., 2017). Its suites hash the
input onto the curve either by try-and-increment (TAI) or with the
RFC 9380 maps (SSWU for P-256, ELL2 for edwards25519).

## How it works

### RSA-FDH-VRF

The key is an RSA key `(n, e, d)` with n k bytes long.

1. **Prove:** hash the input to k − 1 bytes with MGF1,
   `m = MGF1(suite ‖ 0x01 ‖ k ‖ n ‖ α)` with k and n written out as bytes,
   so m is below n. Sign it: `π = m^d mod n`.
2. **Output:** `β = Hash(suite ‖ 0x02 ‖ π)`.
3. **Verify:** check `π^e mod n = m` with the public key, then compute β.

For a proper RSA key, m has exactly one e-th root mod n, so each input has
one π and one β. A bad n or e can break that, so RFC 9381 claims only the
trusted kinds of uniqueness and collision resistance here.

### ECVRF

The secret is x and the public key is `Y = x·B` (written additively).

1. **Prove:** hash to a point, `H = encode_to_curve(Y, α)`, and set
   `Γ = x·H`. With a deterministic nonce k (made as in RFC 6979 on P-256,
   or RFC 8032 on edwards25519), let c be the first 16 bytes of
   `Hash(suite ‖ 0x02 ‖ Y ‖ H ‖ Γ ‖ k·B ‖ k·H ‖ 0x00)` and
   `s = k + c·x mod q`. The proof is `π = Γ ‖ c ‖ s`.
2. **Output:** `β = Hash(suite ‖ 0x03 ‖ cofactor·Γ ‖ 0x00)`.
3. **Verify:** with `U = s·B − c·Y` and `V = s·H − c·Γ`, the same hash of
   `Y, H, Γ, U, V` must give back c.

The proof is a Chaum–Pedersen proof that Γ and Y share x, the one a
[VOPRF](OPRF.md) server sends. An OPRF computes the same kind of value, a
key times a hash of the input, but blind, for a client. ECVRF has full
uniqueness. The optional `validate_key`
check, which rejects small-order public keys, adds full collision
resistance and keeps outputs unpredictable even under a key made to cheat.

## When to use it

Use a VRF when one party has to produce a random-looking value that it
can't choose, and everyone else has to be able to check it.

- **Leader election.** In Algorand (Gilad et al., SOSP 2017) each user runs
  its VRF on a public seed and its role in the round. The output decides
  whether it sits on the committee, with odds that grow with its stake.
  Nobody knows who was picked until they send a message with the proof, so
  an attacker can't go after them in advance. Ouroboros Praos (David,
  Gaži, Kiayias and Russell, EUROCRYPT 2018), which Cardano runs, makes a
  stake pool the leader of a slot when its VRF output on the slot and an
  epoch nonce falls below a threshold set by its stake.
- **Key transparency.** A key directory keeps users in a Merkle tree. If
  the position were a plain hash of the name, a lookup proof would let
  anyone test guessed names offline. CONIKS (USENIX Security 2015) puts
  each user at `H(VUF(name))`, using a verifiable unpredictable function, a
  weaker relative of the VRF. Google's Key Transparency (archived in 2024)
  used a VRF, and the IETF's draft protocol uses `ECVRF-P256-SHA256-TAI`
  or `ECVRF-EDWARDS25519-SHA512-TAI`.
- **NSEC5.** DNSSEC's NSEC3 (RFC 5155) proves a name is missing with a
  signed record that covers its hash, and those hashes can be collected
  and cracked offline to list the zone. NSEC5 (Goldberg et al., NDSS 2015)
  uses a VRF instead, so only the nameserver holding the VRF key can
  compute them, at one public-key operation per negative answer. Its last
  draft (December 2018) expired without becoming a standard.

## Example (Python)

RSA-FDH-VRF-SHA256 as RFC 9381 section 4 writes it, with the 2048-bit test
key from the RFC's appendix A.1. The first line checks the RFC's β for the
empty input. The key is published, so it is only good for testing.

```python
import hashlib

# the RFC 9381 test key from appendix A.1: it is public, so it is only for testing
p = int("efb52a568fa3038fffb853e2183791c6bc81ceee86d20e8f9b6401dc79a8f1f6248d3a25fdb3f99245fce41667da038f59745b87cc1aed8b4a9c1d74e7d5c16c"
        "f7343f2b12f1b5055337369bf018fa07adc0d16f2164a516e80d2b4734f0c6563d6ee6d4a9e1a54e300cfe9ee679afc3d14a152dfb49b6cfb208bbf921f764af", 16)
q = int("ecbca5ee88bbc635d8263aaba84f6502fdb2b4998a40f7c149133d840b6b1bd9a972fe2a981c770272b78fda213f76a062dd865dd116d4c8980975ee9347fe0f"
        "500567e51d78dbee4a34e626051cf018d7feb72f19189525d4f70b6467d0cef514633ab08a9e7a9ec632064b7b5e3e82128fe563757a614092fc5cf624d10e1b", 16)
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))
k = (n.bit_length() + 7) // 8           # 256 bytes
suite = b"\x01"                         # RSA-FDH-VRF-SHA256

def mgf1(seed, length):                 # MGF1 with SHA-256 (RFC 8017)
    return b"".join(hashlib.sha256(seed + i.to_bytes(4, "big")).digest() for i in range((length + 31) // 32))[:length]

def encode(alpha):                      # the full-domain hash, k - 1 bytes so it is below n
    salt = k.to_bytes(4, "big") + n.to_bytes(k, "big")
    return int.from_bytes(mgf1(suite + b"\x01" + salt + alpha, k - 1), "big")

def prove(alpha):                       # pi is an RSA signature on the hash
    return pow(encode(alpha), d, n).to_bytes(k, "big")

def proof_to_hash(pi):                  # beta, the VRF output
    return hashlib.sha256(suite + b"\x02" + pi).hexdigest()

def verify(alpha, pi):                  # needs only (n, e); gives beta or None
    s = int.from_bytes(pi, "big")
    if s >= n or pow(s, e, n) != encode(alpha):
        return None
    return proof_to_hash(pi)

print(verify(b"", prove(b"")) == "79f0615d4677fb72571889453644013f1a31b08d222e3cee349d64ce1c41045a")   # True: the RFC's beta
pi = prove(b"slot 42")
print(prove(b"slot 42") == pi)          # True: one proof per input, so one output
print(verify(b"slot 42", pi)[:16])      # fefc0e369699926c: the start of beta
print(verify(b"slot 43", pi))           # None
```

## Security notes

- **The key holder sees every output first.** Pseudorandomness only holds
  for people without the key. If the holder can steer the input, it can
  try many and keep the best, so a lottery's input must come from
  something it can't influence, and its key must be fixed before that
  input is known.
- **RSA-FDH-VRF trusts the key.** Its guarantees assume a proper RSA key
  (RFC 8017). RFC 9381 gives unpredictability under a key made to cheat
  only to ECVRF with `validate_key`, and names Algorand and Ouroboros
  Praos as users that need it.
- **TAI leaks timing.** Try-and-increment runs longer for some inputs, so
  RFC 9381 says not to use the TAI suites when α is secret.
- **A proof doesn't hide the input.** With the public key and π, anyone can
  test guesses of α offline; β alone reveals nothing about α. Use β only
  after π verifies.
- A quantum computer could recover the secret key from the public key and
  compute every output. RFC 9381 has no post-quantum VRF.

## See also

- [OPRF](OPRF.md): the same kind of keyed hash, computed blind for a client
- [RSA](../02-signatures/RSA.md): the signature inside RSA-FDH-VRF
- [Zero-knowledge proofs](Zero-Knowledge.md): Schnorr-style proofs like the one in ECVRF
- [Commitments](Commitments.md): the other half of a key transparency leaf

## References

- [Micali, Rabin and Vadhan, "Verifiable Random Functions" (FOCS 1999)](https://doi.org/10.1109/SFFCS.1999.814584)
- [RFC 9381: Verifiable Random Functions](https://www.rfc-editor.org/rfc/rfc9381) / [RFC 9380: Hashing to Elliptic Curves](https://www.rfc-editor.org/rfc/rfc9380) / [RFC 8017: PKCS #1 v2.2](https://www.rfc-editor.org/rfc/rfc8017)
- [Goldberg et al., "NSEC5: Provably Preventing DNSSEC Zone Enumeration" (NDSS 2015)](https://eprint.iacr.org/2014/582) / [Papadopoulos et al., "Making NSEC5 Practical for DNSSEC" (2017)](https://eprint.iacr.org/2017/099)
- [draft-vcelak-nsec5](https://datatracker.ietf.org/doc/draft-vcelak-nsec5/) / [RFC 5155: NSEC3](https://www.rfc-editor.org/rfc/rfc5155)
- [Gilad et al., "Algorand: Scaling Byzantine Agreements for Cryptocurrencies" (SOSP 2017)](https://doi.org/10.1145/3132747.3132757)
- [David, Gaži, Kiayias and Russell, "Ouroboros Praos" (EUROCRYPT 2018)](https://eprint.iacr.org/2017/573)
- [Melara et al., "CONIKS: Bringing Key Transparency to End Users" (USENIX Security 2015)](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/melara)
- [Google Key Transparency (archived)](https://github.com/google/keytransparency) / [draft-ietf-keytrans-protocol](https://datatracker.ietf.org/doc/draft-ietf-keytrans-protocol/)

*Weaker sources:* Cardano's [CIP-0059 feature table](https://cips.cardano.org/cip/cip-0059/annex/feature-table)
for Cardano running Ouroboros Praos (since the Shelley upgrade in 2020).
