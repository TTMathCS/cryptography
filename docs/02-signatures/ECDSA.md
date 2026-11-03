# ECDSA (Elliptic Curve Digital Signature Algorithm)

*[DSA](DSA.md) moved onto an elliptic curve. Same idea, far smaller keys — a
256-bit ECDSA key matches a 3072-bit [RSA](RSA.md) key.*

## What it is

ECDSA signs and verifies messages using elliptic-curve math. Its security rests
on the elliptic-curve discrete logarithm problem: given a base point $G$ and a
public point $Q = d \cdot G$, recovering the private scalar $d$ is infeasible. Because
that problem is harder per bit than factoring, ECDSA gets RSA-level security from
much smaller keys, which is why it's the common choice in TLS certificates,
Bitcoin, and SSH.

## The story

- **Who made it:** Scott Vanstone (University of Waterloo, Canada, co-founder of Certicom) proposed it in 1992 in response to NIST's call for comments on DSA. It became ANSI X9.62 in 1999 and joined FIPS 186-2 in 2000.
- **What for:** DSA on an elliptic curve, for small keys and fast signing.
- **What it solved:** A 256-bit ECDSA key gives the security of a 3072-bit DSA or RSA key, which fits smart cards, phones and blockchains.
- **Where it stands:** Widely used in TLS certificates, Bitcoin and Ethereum. Deterministic nonces (RFC 6979) are recommended. NIST IR 8547 deprecates it after 2030 and disallows it after 2035.
- **Incidents:** **Sony PS3 (2010):** the fail0verflow group showed at 27C3 that Sony signed every game with the same nonce, which gave away Sony's private key. **Android Bitcoin wallets (2013):** a broken random number generator repeated nonces, and coins were stolen. **CurveBall (CVE-2020-0601):** Windows accepted certificates with attacker-chosen curve parameters; the NSA reported it. **Minerva and TPM-Fail (2019):** timing leaked a few nonce bits, enough to rebuild keys from smart cards and TPMs. **Psychic signatures (2022):** Java 15 to 18 accepted the signature $r = s = 0$ for any message.

## How it works

Pick a standard curve with base point $G$ of prime order $n$.

- **Keys:** private $d$ random in $[1, n-1]$; public $Q = d \cdot G$.
- **Sign** message $m$ (with $z = \mathrm{Hash}(m)$): pick a fresh random $k$, compute
  $(x_1, y_1) = k \cdot G$, then $r = x_1 \bmod n$ and $s = k^{-1}(z + r \cdot d) \bmod n$. Signature $(r, s)$.
- **Verify:** with $w = s^{-1} \bmod n$, compute $(x_1, y_1) = (z \cdot w) \cdot G + (r \cdot w) \cdot Q$ and
  accept if $x_1 \equiv r \pmod{n}$.

## The k problem

Like [DSA](DSA.md), ECDSA's per-signature secret $k$ is the danger: reuse it for
two signatures, or use a biased generator, and the private key falls out of the
public signatures. This leaked the Sony PlayStation 3 key and has hit Bitcoin
wallets with weak randomness. RFC 6979 derives $k$ deterministically to remove
the risk — or use [Ed25519](EdDSA.md), which builds that in.

## Popular curves

- **secp256k1** — $y^2 = x^3 + 7$; used by Bitcoin and Ethereum.
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

- Never reuse or allow bias in $k$ — the single most important rule. Prefer
  deterministic ECDSA (RFC 6979).
- ~256-bit curves give ~128-bit security, comparable to AES-128.
- Vulnerable to quantum computers (Shor's algorithm) like all ECC — see
  [ML-DSA](ML-DSA.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: ECDSA on a tiny curve"

    The curve $y^2 = x^3 + 2x + 2 \pmod{17}$ with base point $G = (5, 1)$ of order $n = 19$ (the same toy curve as
    on [ECDH](../01-key-exchange/ECDH.md#going-deeper)). Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Private key | $d = 7$ | |
    | Public key | $Q = 7 \cdot G$ | $Q = (0, 6)$ |
    | Hash (made up) | $h = H(m)$ | $10$ |
    | Secret nonce | $k = 3$, $k \cdot G = (10, 6)$ | |
    | $r$ | x-coordinate of $k \cdot G$, mod 19 | $r = 10$ |
    | $s$ | $k^{-1} \cdot (h + r \cdot d) \bmod 19 = 13 \cdot 80 \bmod 19$ | $s = 14$ |
    | Verify: $w = s^{-1} \bmod 19$ | $14^{-1}$ | $w = 15$ |
    | $u_1 = h \cdot w$, $u_2 = r \cdot w$ (mod 19) | $150 \bmod 19$, $150 \bmod 19$ | $u_1 = 17$, $u_2 = 17$ |
    | $X = u_1 \cdot G + u_2 \cdot Q$ | $(6, 14) + (9, 16)$ | $X = (10, 6)$ |
    | Check | x-coordinate $10 \bmod 19 = r$ | valid |

??? abstract "The math, with formulas"

    **Signing:** pick $k$, compute $(x_1, y_1) = k \cdot G$, $r = x_1 \bmod n$, $s = k^{-1}(h + r \cdot d) \bmod n$. Retry if $r$ or $s$
    is 0.

    **Verifying:** $w = s^{-1} \bmod n$, $u_1 = h \cdot w$, $u_2 = r \cdot w$, $X = u_1 \cdot G + u_2 \cdot Q$, accept if $X_x \bmod n = r$.

    **Why it works.** $u_1 \cdot G + u_2 \cdot Q = (u_1 + u_2 \cdot d) \cdot G = s^{-1}(h + r \cdot d) \cdot G = k \cdot G$.

    **Malleability.** $(r, n - s)$ is also valid for the same message, because $-k \cdot G$ has the same
    x-coordinate. Bitcoin requires the "low-s" form to stop this.

    **The nonce.** As in DSA, a repeated $k$ gives $k = (h_1 - h_2)/(s_1 - s_2)$ and then
    $d = (s \cdot k - h)/r$. Sony's PlayStation 3 signed with a fixed $k$ and lost its key in 2010. RFC 6979
    makes $k$ from an HMAC of the key and the hash.

??? tip "Watch it step by step: sign and verify"

    <div class="mars-steps" markdown>

    1. Public: the curve, $G = (5, 1)$, $n = 19$, and the signer's $Q = 7 \cdot G = (0, 6)$. Secret: $d = 7$.
    2. The message hashes to 10. The signer picks $k = 3$ and computes $3 \cdot G = (10, 6)$, so $r = 10$.
    3. $s = 3^{-1} \cdot (10 + 10 \cdot 7) \bmod 19 = 13 \cdot 80 \bmod 19 = 14$. The signature is $(10, 14)$.
    4. The verifier computes $w = 14^{-1} \bmod 19 = 15$, $u_1 = 10 \cdot 15 \bmod 19 = 17$, $u_2 = 10 \cdot 15 \bmod 19 = 17$.
    5. $17 \cdot G = (6, 14)$ and $17 \cdot Q = (9, 16)$; adding them gives $(10, 6)$.
    6. Its x-coordinate is 10, equal to $r$: valid.

    </div>

??? info "The math underneath"

    - **Elliptic-curve point arithmetic** and scalar multiplication: [Elliptic curves](../10-math-foundations/Elliptic-Curves.md).
    - **Arithmetic mod the group order $n$**, separate from the field prime $p$.
    - **The elliptic-curve discrete log problem:** [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Hidden number problem:** lattice attacks recover $d$ from many signatures whose $k$ leaks a few bits
      (the Minerva and TPM-Fail timing attacks, 2019).
    - Compare [EdDSA](EdDSA.md), which fixes the nonce and malleability problems by design.

## See also

- [Ed25519](EdDSA.md) — modern EC signatures, deterministic $k$
- [X25519](../01-key-exchange/ECDH.md) — the key-exchange counterpart on a similar curve
- [DSA](DSA.md) — the finite-field ancestor

## References

- RFC 6979: Deterministic Usage of DSA and ECDSA
- [SEC 2: Recommended Elliptic Curve Domain Parameters](https://www.secg.org/sec2-v2.pdf)
