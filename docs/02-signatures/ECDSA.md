# ECDSA (Elliptic Curve Digital Signature Algorithm)

*[DSA](DSA.md) moved onto an elliptic curve. Same idea, far smaller keys — a
256-bit ECDSA key matches a 3072-bit [RSA](RSA.md) key.*

## What it is

ECDSA signs and verifies messages using elliptic-curve math. Its security rests
on the elliptic-curve discrete logarithm problem: given a base point `G` and a
public point `Q = d·G`, recovering the private scalar `d` is infeasible. Because
that problem is harder per bit than factoring, ECDSA gets RSA-level security from
much smaller keys, which is why it's the common choice in TLS certificates,
Bitcoin, and SSH.

## How it works

Pick a standard curve with base point `G` of prime order `n`.

- **Keys:** private `d` random in `[1, n−1]`; public `Q = d·G`.
- **Sign** message `m` (with `z = Hash(m)`): pick a fresh random `k`, compute
  `(x₁, y₁) = k·G`, then `r = x₁ mod n` and `s = k⁻¹(z + r·d) mod n`. Signature `(r, s)`.
- **Verify:** with `w = s⁻¹ mod n`, compute `(x₁, y₁) = (z·w)·G + (r·w)·Q` and
  accept if `x₁ ≡ r (mod n)`.

## The k problem

Like [DSA](DSA.md), ECDSA's per-signature secret `k` is the danger: reuse it for
two signatures, or use a biased generator, and the private key falls out of the
public signatures. This leaked the Sony PlayStation 3 key and has hit Bitcoin
wallets with weak randomness. RFC 6979 derives `k` deterministically to remove
the risk — or use [Ed25519](EdDSA.md), which builds that in.

## Popular curves

- **secp256k1** — `y² = x³ + 7`; used by Bitcoin and Ethereum.
- **secp256r1 / P-256** — NIST curve; the TLS default for ECDSA.

## When to use it

- **Smaller-key signatures** where RSA would be heavy — TLS, code signing, blockchains.
- **Prefer [Ed25519](EdDSA.md) for new designs** — same security, faster, and
  no nonce footgun.
- Pair with [X25519](../01-key-exchange/ECDH.md) (key exchange) for a full modern handshake.

## Example (Python)

Correct ECDSA needs curve point arithmetic, so use a vetted library:

```python
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes

priv = ec.generate_private_key(ec.SECP256R1())
sig = priv.sign(b"message", ec.ECDSA(hashes.SHA256()))
priv.public_key().verify(sig, b"message", ec.ECDSA(hashes.SHA256()))  # raises if invalid
```

## Security notes

- Never reuse or allow bias in `k` — the single most important rule. Prefer
  deterministic ECDSA (RFC 6979).
- ~256-bit curves give ~128-bit security, comparable to AES-128.
- Vulnerable to quantum computers (Shor's algorithm) like all ECC — see
  [ML-DSA](ML-DSA.md).

## See also

- [Ed25519](EdDSA.md) — modern EC signatures, deterministic `k`
- [X25519](../01-key-exchange/ECDH.md) — the key-exchange counterpart on a similar curve
- [DSA](DSA.md) — the finite-field ancestor

## References

- RFC 6979: Deterministic Usage of DSA and ECDSA
- [SEC 2: Recommended Elliptic Curve Domain Parameters](https://www.secg.org/sec2-v2.pdf)
