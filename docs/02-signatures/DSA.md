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

Everyone shares three domain parameters: a large prime $p$, a prime $q$ dividing
$p - 1$, and a generator $g$ of order $q$.

- **Keys:** private $x$ is random in $[1, q-1]$; public $y = g^x \bmod p$.
- **Sign** message $m$: pick a fresh random $k$, then
  $r = (g^k \bmod p) \bmod q$ and $s = k^{-1} (H(m) + x \cdot r) \bmod q$. The signature is $(r, s)$.
- **Verify:** with $w = s^{-1} \bmod q$, check that
  $(g^{H(m) \cdot w} \cdot y^{r \cdot w} \bmod p) \bmod q = r$.

## The k problem

The per-signature secret $k$ is DSA's sharp edge. If $k$ is ever **reused** for
two messages, or even slightly **predictable**, anyone can solve for the private
key $x$ from the public signatures. Sony's PlayStation 3 signing key leaked
this way in 2010, through the same mistake in [ECDSA](ECDSA.md): a fixed $k$.
Modern practice derives $k$ deterministically from the
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

- Reusing or biasing $k$ leaks the private key — the single most important rule.
- Parameters should be 2048-bit $p$ with 256-bit $q$ if you must use DSA at all;
  the old 1024/160 sizes are too small now.
- DSA signs a hash, so the hash matters too — use SHA-256, not SHA-1.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: DSA with small numbers"

    Domain parameters $p = 23$, $q = 11$ (11 divides 22) and $g = 4$, which has order 11 mod 23. Real DSA used
    $p$ of 2,048 bits and $q$ of 224 or 256 bits. Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Private key | $x = 3$ | |
    | Public key | $y = g^x \bmod p = 4^3 \bmod 23$ | $y = 18$ |
    | Hash of the message | $H(m)$ (made up for the example) | $7$ |
    | Secret per-signature $k$ | $k = 5$ | |
    | $r$ | $(g^k \bmod p) \bmod q = (4^5 \bmod 23) \bmod 11 = 12 \bmod 11$ | $r = 1$ |
    | $s$ | $k^{-1} \cdot (H + x \cdot r) \bmod q = 9 \cdot (7 + 3) \bmod 11$ | $s = 2$ |
    | Verify: $w = s^{-1} \bmod q$ | $2^{-1} \bmod 11$ | $w = 6$ |
    | $u_1 = H \cdot w$, $u_2 = r \cdot w$ (mod $q$) | $42 \bmod 11$, $6 \bmod 11$ | $u_1 = 9$, $u_2 = 6$ |
    | $v = (g^{u_1} \cdot y^{u_2} \bmod p) \bmod q$ | $(13 \cdot 8 \bmod 23) \bmod 11 = 12 \bmod 11$ | $v = 1 = r$: valid |

??? abstract "The math, with formulas"

    **Signing:** $r = (g^k \bmod p) \bmod q$, $s = k^{-1}(H(m) + x \cdot r) \bmod q$.

    **Verifying:** $w = s^{-1}$, $u_1 = H(m) \cdot w$, $u_2 = r \cdot w$ (all mod $q$), accept if $(g^{u_1} \cdot y^{u_2} \bmod p) \bmod q = r$.

    **Why it works.** From $s = k^{-1}(H + xr)$: $k = s^{-1}(H + xr) = u_1 + x \cdot u_2 \pmod{q}$. So
    $g^{u_1} \cdot y^{u_2} = g^{u_1} \cdot g^{x u_2} = g^{u_1 + x u_2} = g^k \pmod{p}$, and its value mod $q$ is $r$.

    **Why $k$ must stay secret and unique.** If the same $k$ signs two hashes $H_1$, $H_2$:
    $s_1 - s_2 = k^{-1}(H_1 - H_2)$, so $k = (H_1 - H_2)/(s_1 - s_2)$ and then $x = (s \cdot k - H)/r$. Even a few biased bits of
    $k$ over many signatures leak $x$ through lattice attacks. RFC 6979 derives $k$ from the key and the
    message to avoid this.

??? tip "Watch it step by step: sign and verify"

    <div class="mars-steps" markdown>

    1. Public: $p = 23$, $q = 11$, $g = 4$, and the signer's $y = 18$. Secret: $x = 3$.
    2. The message hashes to 7. The signer picks a fresh secret $k = 5$.
    3. $r = (4^5 \bmod 23) \bmod 11 = 12 \bmod 11 = 1$.
    4. $s = 5^{-1} \cdot (7 + 3 \cdot 1) \bmod 11 = 9 \cdot 10 \bmod 11 = 2$. The signature is $(1, 2)$.
    5. The verifier computes $w = 2^{-1} = 6$, $u_1 = 7 \cdot 6 \bmod 11 = 9$, $u_2 = 1 \cdot 6 = 6$.
    6. $4^9 \cdot 18^6 \bmod 23 = 13 \cdot 8 \bmod 23 = 12$, and $12 \bmod 11 = 1$.
    7. That equals $r$, so the signature is valid.

    </div>

??? info "The math underneath"

    - **Subgroups of prime order** inside the numbers mod $p$, and Lagrange's theorem ($q$ must divide $p - 1$).
    - **Modular inverses** with the extended Euclidean algorithm.
    - **The discrete log problem:** see [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Lattice attacks on biased nonces** (the hidden number problem): why $k$ needs full randomness or
      RFC 6979.
    - DSA was withdrawn from FIPS 186-5 for new signatures; [ECDSA](ECDSA.md) and [EdDSA](EdDSA.md) use the
      same equations on elliptic curves.

## See also

- [ECDSA](ECDSA.md) — the same scheme on elliptic curves, smaller keys
- [Ed25519](EdDSA.md) — modern replacement, deterministic $k$
- [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md) — shares the discrete-log foundation

## References

- FIPS 186-5: Digital Signature Standard (DSS) — withdraws DSA for signing
- RFC 6979: Deterministic Usage of DSA and ECDSA
