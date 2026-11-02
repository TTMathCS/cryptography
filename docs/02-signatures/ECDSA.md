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

Correct ECDSA needs curve point arithmetic, so use a vetted library, here
PyCA `cryptography` (`pip install cryptography`):

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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: ECDSA on a tiny curve"

    The curve `y² = x³ + 2x + 2 (mod 17)` with base point `G = (5, 1)` of order `n = 19` (the same toy curve as
    on [ECDH](../01-key-exchange/ECDH.md#going-deeper)). Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Private key | `d = 7` | |
    | Public key | `Q = 7·G` | `Q = (0, 6)` |
    | Hash (made up) | `h = H(m)` | `10` |
    | Secret nonce | `k = 3`, `k·G = (10, 6)` | |
    | `r` | x-coordinate of `k·G`, mod 19 | `r = 10` |
    | `s` | `k⁻¹·(h + r·d) mod 19 = 13 · 80 mod 19` | `s = 14` |
    | Verify: `w = s⁻¹ mod 19` | `14⁻¹` | `w = 15` |
    | `u₁ = h·w`, `u₂ = r·w` (mod 19) | `150 mod 19`, `150 mod 19` | `u₁ = 17`, `u₂ = 17` |
    | `X = u₁·G + u₂·Q` | `(6, 14) + (9, 16)` | `X = (10, 6)` |
    | Check | x-coordinate `10 mod 19 = r` | valid |

??? abstract "The math, with formulas"

    **Signing:** pick `k`, compute `(x₁, y₁) = k·G`, `r = x₁ mod n`, `s = k⁻¹(h + r·d) mod n`. Retry if `r` or `s`
    is 0.

    **Verifying:** `w = s⁻¹ mod n`, `u₁ = h·w`, `u₂ = r·w`, `X = u₁·G + u₂·Q`, accept if `X.x mod n = r`.

    **Why it works.** `u₁·G + u₂·Q = (u₁ + u₂·d)·G = s⁻¹(h + r·d)·G = k·G`.

    **Malleability.** `(r, n − s)` is also valid for the same message, because `−k·G` has the same
    x-coordinate. Bitcoin requires the "low-s" form to stop this.

    **The nonce.** As in DSA, a repeated `k` gives `k = (h₁ − h₂)/(s₁ − s₂)` and then
    `d = (s·k − h)/r`. Sony's PlayStation 3 signed with a fixed `k` and lost its key in 2010. RFC 6979
    makes `k` from an HMAC of the key and the hash.

??? tip "Watch it step by step: sign and verify"

    <div class="mars-steps" markdown>

    1. Public: the curve, `G = (5, 1)`, `n = 19`, and the signer's `Q = 7·G = (0, 6)`. Secret: `d = 7`.
    2. The message hashes to 10. The signer picks `k = 3` and computes `3·G = (10, 6)`, so `r = 10`.
    3. `s = 3⁻¹ · (10 + 10·7) mod 19 = 13 · 80 mod 19 = 14`. The signature is `(10, 14)`.
    4. The verifier computes `w = 14⁻¹ mod 19 = 15`, `u₁ = 10·15 mod 19 = 17`, `u₂ = 10·15 mod 19 = 17`.
    5. `17·G = (6, 14)` and `17·Q = (9, 16)`; adding them gives `(10, 6)`.
    6. Its x-coordinate is 10, equal to `r`: valid.

    </div>

??? info "The math underneath"

    - **Elliptic-curve point arithmetic** and scalar multiplication: [Elliptic curves](../10-math-foundations/Elliptic-Curves.md).
    - **Arithmetic mod the group order `n`**, separate from the field prime `p`.
    - **The elliptic-curve discrete log problem:** [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Hidden number problem:** lattice attacks recover `d` from many signatures whose `k` leaks a few bits
      (the Minerva and TPM-Fail timing attacks, 2019).
    - Compare [EdDSA](EdDSA.md), which fixes the nonce and malleability problems by design.

## See also

- [Ed25519](EdDSA.md) — modern EC signatures, deterministic `k`
- [X25519](../01-key-exchange/ECDH.md) — the key-exchange counterpart on a similar curve
- [DSA](DSA.md) — the finite-field ancestor

## References

- RFC 6979: Deterministic Usage of DSA and ECDSA
- [SEC 2: Recommended Elliptic Curve Domain Parameters](https://www.secg.org/sec2-v2.pdf)
