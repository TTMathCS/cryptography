# Schnorr signatures

*The simplest signature built on discrete logs. A patent kept it out of the
big standards for years; it came back as EdDSA and, in 2021, in Bitcoin.*

**Status and standards:** see [Digital signatures](../index.md#2-digital-signatures)
in the main table.

## What it is

Claus-Peter Schnorr presented the scheme at CRYPTO '89, aimed at smart cards,
where signing had to be cheap. It works in a group of prime order, first a
subgroup of the integers mod p and now usually an elliptic curve, the same
setting as [DSA](DSA.md) and [ECDSA](ECDSA.md). The difference is the signing
equation: Schnorr's is linear and needs no modular inverse. That makes it
simpler, easier to prove secure, and easy to combine across signers.

Schnorr patented it (US 4,995,082, granted 1991). NIST's DSA, proposed later
that year, used an ElGamal-style equation instead, and ECDSA copied DSA, so
the widely deployed standards went that way. Schnorr came back twice:

- [Ed25519](EdDSA.md) (2011): RFC 8032 describes EdDSA as a variant of
  Schnorr's scheme on Edwards curves, with a nonce derived from the message.
- **BIP-340** (2020): Schnorr on Bitcoin's secp256k1 curve, with 32-byte
  keys (x coordinate only) and 64-byte signatures, against 33 and up to 72
  bytes for Bitcoin's ECDSA. The Taproot soft fork switched it on at block
  709,632 in November 2021.

## How it works

Take a group with generator `G` of prime order `n`, and a hash `H`.

- **Keys:** a secret number `x`; the public key is `P = x·G`.
- **Sign** message `m`: pick a fresh secret nonce `k`, compute `R = k·G` and
  `e = H(R ‖ P ‖ m)`, then `s = k + e·x mod n`. The signature is `(R, s)`.
- **Verify:** check `s·G = R + e·P`.

Schnorr's original signature was `(e, s)` with a short `e`. BIP-340 sends `R`
instead, so a node can check many signatures at once (batch verification),
and it hashes `P` into `e`, which blocks related-key tricks. It also fixes
the y coordinates of `P` and `R` to be even, and:

- **Tagged hashes:** SHA-256 with a tag such as `BIP0340/challenge` in
  front, so a hash from one context can't be reused in another.
- **Nonce:** `k` is hashed from the secret key, the message and 32 bytes of
  fresh randomness. A bad random generator can't leak the key, and the
  randomness still helps against fault and side-channel attacks.

Because `s` is linear, signatures add up: two signers who add their nonces and
keys get one signature valid for `P₁ + P₂`. Done naively this is insecure (one
signer can choose a key that cancels the other's), so real protocols are used:
MuSig2 (BIP-327) for n-of-n, and FROST (RFC 9591) for k-of-n threshold
signing. Either way the result is one ordinary signature under one key.

## When to use it

- **Bitcoin:** Taproot outputs (BIP-341) sign with BIP-340, and MuSig2 or
  FROST let a group sign as one key.
- **Everywhere else**, use [Ed25519](EdDSA.md): the standardized Schnorr
  variant, in RFC 8032, FIPS 186-5 and most major libraries.

## Example (Python)

BIP-340 sign and verify with the standard library, checked against the
BIP's test vector 0. It is not constant time, so use it to learn; real code
uses libsecp256k1.

```python
from hashlib import sha256

p = 2**256 - 2**32 - 977
n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G = (0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
     0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)

def add(P, Q):
    if P is None or Q is None: return P or Q
    if P[0] == Q[0] and P[1] != Q[1]: return None
    if P == Q: l = 3 * P[0] * P[0] * pow(2 * P[1], -1, p)
    else: l = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p)
    x = (l * l - P[0] - Q[0]) % p
    return x, (l * (P[0] - x) - P[1]) % p

def mul(k, P):
    R = None
    while k:
        if k & 1: R = add(R, P)
        P, k = add(P, P), k >> 1
    return R

def H(tag, data):
    t = sha256(tag.encode()).digest()
    return int.from_bytes(sha256(t + t + data).digest(), "big")

b32 = lambda x: x.to_bytes(32, "big")

def sign(d, m, aux):
    P = mul(d, G)
    if P[1] % 2: d = n - d
    k = H("BIP0340/nonce", b32(d ^ H("BIP0340/aux", aux)) + b32(P[0]) + m) % n
    R = mul(k, G)
    if R[1] % 2: k = n - k
    e = H("BIP0340/challenge", b32(R[0]) + b32(P[0]) + m) % n
    return b32(R[0]) + b32((k + e * d) % n)

def verify(x, m, sig):
    r, s = int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")
    c = (x**3 + 7) % p
    y = pow(c, (p + 1) // 4, p)
    if x >= p or r >= p or s >= n or y * y % p != c: return False
    e = H("BIP0340/challenge", sig[:32] + b32(x) + m) % n
    R = add(mul(s, G), mul(n - e, (x, y if y % 2 == 0 else p - y)))
    return R is not None and R[1] % 2 == 0 and R[0] == r

d, m = 3, bytes(32)                         # BIP-340 test vector 0
sig = sign(d, m, bytes(32))
x = mul(d, G)[0]
print(sig.hex()[:16], verify(x, m, sig), verify(x, b"other", sig))   # e907831f80848d10 True False
```

## Security notes

- Never reuse a nonce. Two signatures with the same `k` give
  `s₁ − s₂ = (e₁ − e₂)·x`, which reveals `x`. BIP-340's nonce derivation
  takes care of this.
- Keep each key to one scheme. If a BIP-340 key also signs with RFC 6979
  ECDSA and both derive nonces the same way, a nonce can repeat.
- Unlike ECDSA, it has a clean proof: forging is as hard as discrete log, in
  the random-oracle model.
- A quantum computer breaks it like all elliptic-curve schemes; see
  [ML-DSA](ML-DSA.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: a Schnorr signature with small numbers"

    The subgroup of order `q = 11` in the numbers mod `p = 23`, generated by `g = 4`. The hash value is made up;
    the rest is checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Private key | `x = 3` | |
    | Public key | `y = 4³ mod 23` | `y = 18` |
    | Nonce | `k = 5`, `R = 4⁵ mod 23` | `R = 12` |
    | Challenge | `e = H(R ‖ y ‖ m) mod 11`, say | `e = 6` |
    | Response | `s = k + e·x mod q = 5 + 18 mod 11` | `s = 1` |
    | Verify | `gˢ = 4¹ = 4`; `R·yᵉ = 12 · 18⁶ = 12 · 8 = 96 mod 23 = 4` | equal: valid |

??? abstract "The math, with formulas"

    **Sign:** `R = gᵏ`, `e = H(R ‖ y ‖ m)`, `s = k + e·x mod q`. **Verify:** `gˢ = R · yᵉ`.

    **Why it works:** `gˢ = g^(k + e·x) = gᵏ · (gˣ)ᵉ = R · yᵉ`.

    **Where it comes from.** It is the Fiat–Shamir transform of an interactive proof that you know `x`:
    commit to `R`, receive a random challenge `e`, answer `s`. Replacing the verifier's challenge by a hash
    makes it a signature, and the proof is sound in the random-oracle model.

    **Linearity, and why it matters.** Responses add up: two signers with keys `x₁`, `x₂` and nonces `k₁`, `k₂`
    can produce one signature for the key `y₁·y₂` with `s = s₁ + s₂`. MuSig2 (BIP-327) and FROST (RFC 9591)
    build multi-signatures and threshold signatures this way. Bitcoin's BIP-340 Schnorr uses x-only public
    keys on secp256k1 and `e = H_tag(R.x ‖ P.x ‖ m)`.

??? tip "Watch it step by step: prove you know x without showing it"

    <div class="mars-steps" markdown>

    1. Public: `p = 23`, `g = 4` of order 11, and the signer's `y = 18`. Secret: `x = 3`.
    2. The signer commits to a fresh secret `k = 5` by publishing `R = 4⁵ mod 23 = 12`.
    3. The hash of `R`, the key and the message gives the challenge `e = 6`.
    4. The signer answers `s = 5 + 6·3 mod 11 = 1`. The signature is `(R, s) = (12, 1)`.
    5. The verifier computes `4¹ = 4` and `12 · 18⁶ mod 23 = 12 · 8 mod 23 = 4`.
    6. They match. Without `x`, finding an `s` that matches a hash-chosen `e` is as hard as the discrete log.

    </div>

??? info "The math underneath"

    - **Zero-knowledge proofs of knowledge** (Schnorr's identification protocol, 1989) and the
      **Fiat–Shamir transform** (1986).
    - **The forking lemma** (Pointcheval and Stern, 1996): the security proof that rewinds the signer.
    - **Prime-order groups:** subgroups mod `p`, or elliptic curves like secp256k1 and Ed25519's.
    - **The discrete log problem:** [Hard problems](../10-math-foundations/Hard-Problems.md).
    - Its descendants: [EdDSA](EdDSA.md) and the threshold schemes on [MPC](../11-advanced/MPC.md).

## See also

- [Ed25519](EdDSA.md): the Schnorr variant to use outside Bitcoin
- [ECDSA](ECDSA.md): Bitcoin's signature before Taproot, still used by older
  outputs
- [DSA](DSA.md): the scheme NIST picked in 1991 instead
- [Threshold signatures](../11-advanced/Threshold-Signatures.md): FROST, t-of-n
  signing that ends in one Schnorr signature

## References

- [Schnorr, "Efficient Identification and Signatures for Smart Cards" (CRYPTO '89)](https://doi.org/10.1007/0-387-34805-0_22)
- [BIP-340: Schnorr Signatures for secp256k1](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki) / [test vectors](https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv)
- [BIP-341: Taproot](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki) / [BIP-327: MuSig2](https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki)
- [RFC 8032: EdDSA](https://www.rfc-editor.org/rfc/rfc8032) / [RFC 9591: FROST](https://www.rfc-editor.org/rfc/rfc9591)
- [US patent 4,995,082](https://patents.google.com/patent/US4995082A/en)
