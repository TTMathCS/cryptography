# DSA (Digital Signature Algorithm)

*A discrete-log signature scheme from the 1990s. Important to understand, but
deprecated — new systems should sign with [Ed25519](EdDSA.md) or
[ECDSA](ECDSA.md).*

## What it is

DSA is a U.S. federal standard for digital signatures, proposed by NIST in 1991.
It signs and verifies but cannot encrypt. Its security rests on the discrete
logarithm problem — the same hard problem behind [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md).

**Status:** FIPS 186-5 (2023) withdrew DSA for signing. It survives in old
protocols and keys, so it's worth recognizing, but don't choose it for anything
new. [ECDSA](ECDSA.md) is the elliptic-curve version of the same idea with much
smaller keys, and [Ed25519](EdDSA.md) improves on both.

## How it works

Everyone shares three domain parameters: a large prime `p`, a prime `q` dividing
`p − 1`, and a generator `g` of order `q`.

- **Keys:** private `x` is random in `[1, q−1]`; public `y = g^x mod p`.
- **Sign** message `m`: pick a fresh random `k`, then
  `r = (g^k mod p) mod q` and `s = k⁻¹ (H(m) + x·r) mod q`. The signature is `(r, s)`.
- **Verify:** with `w = s⁻¹ mod q`, check that
  `(g^(H(m)·w) · y^(r·w) mod p) mod q == r`.

## The k problem

The per-signature secret `k` is DSA's sharp edge. If `k` is ever **reused** for
two messages, or even slightly **predictable**, anyone can solve for the private
key `x` from the public signatures. Sony's PlayStation 3 signing key leaked
this way in 2010, through the same mistake in [ECDSA](ECDSA.md): a fixed `k`.
Modern practice derives `k` deterministically from the
message and key (RFC 6979), and [Ed25519](EdDSA.md) bakes that in by design —
see [Why does randomness matter](../FAQ.md).

## When to use it

- **New systems: don't.** Use [Ed25519](EdDSA.md) (preferred) or
  [ECDSA](ECDSA.md).
- **Legacy interop only** — verifying old signatures or reading existing keys.

## Example (Python)

Core sign/verify, assuming the domain parameters and keys already exist. Prime
generation lives in the [Miller-Rabin](../10-math-foundations/Miller-Rabin-Primality-Test.md) page.

```python
from hashlib import sha256
from secrets import randbelow

def sign(msg, p, q, g, x):
    h = int.from_bytes(sha256(msg).digest(), "big") % q
    while True:
        k = 1 + randbelow(q - 1)            # MUST be fresh and unpredictable
        r = pow(g, k, p) % q
        s = pow(k, -1, q) * (h + x * r) % q
        if r and s:
            return r, s

def verify(msg, sig, p, q, g, y):
    r, s = sig
    if not (0 < r < q and 0 < s < q):
        return False
    h = int.from_bytes(sha256(msg).digest(), "big") % q
    w = pow(s, -1, q)
    u1, u2 = h * w % q, r * w % q
    return (pow(g, u1, p) * pow(y, u2, p) % p) % q == r
```

## Security notes

- Reusing or biasing `k` leaks the private key — the single most important rule.
- Parameters should be 2048-bit `p` with 256-bit `q` if you must use DSA at all;
  the old 1024/160 sizes are too small now.
- DSA signs a hash, so the hash matters too — use SHA-256, not SHA-1.

## See also

- [ECDSA](ECDSA.md) — the same scheme on elliptic curves, smaller keys
- [Ed25519](EdDSA.md) — modern replacement, deterministic `k`
- [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md) — shares the discrete-log foundation

## References

- FIPS 186-5: Digital Signature Standard (DSS) — withdraws DSA for signing
- RFC 6979: Deterministic Usage of DSA and ECDSA
