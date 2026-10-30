# EdDSA (Ed25519 and Ed448)

*Schnorr signatures on Edwards curves, with the nonce hashed from the key and
the message. Ed25519 is the modern default for signatures: fast, small,
deterministic and hard to misuse.*

**Status and standards:** see [Digital signatures](../index.md#2-digital-signatures)
in the main table.

## What it is

EdDSA is a variant of [Schnorr](Schnorr.md)'s signature on twisted Edwards
curves. Ed25519 (Bernstein, Duif, Lange, Schwabe and Yang, 2011) runs it on
the Edwards form of Curve25519; Ed448 runs it on Hamburg's Ed448-Goldilocks
curve (2015). RFC 8032 (2017) specifies both, and FIPS 186-5 (February 2023)
approved them for US federal use next to ECDSA.

It does the same job as [ECDSA](ECDSA.md), sign with a private key and
verify with the public one, but fixes ECDSA's sharp edges. Ed25519 has been
`ssh-keygen`'s default key type since OpenSSH 9.5 (2023) and is in TLS 1.3,
DNSSEC and Git commit signing. Its key-exchange sibling on the same curve
family is [X25519](../01-key-exchange/ECDH.md).

| Property | Ed25519 | Ed448 | ECDSA P-256 | RSA-2048 |
|---|---|---|---|---|
| Signature size | 64 B | 114 B | ~70 B | 256 B |
| Public key size | 32 B | 57 B | 33 or 65 B | 256 B |
| Security level | ~128-bit | ~224-bit | ~128-bit | ~112-bit |
| Hash inside | SHA-512 | SHAKE256 | SHA-256, usually | SHA-256, usually |
| Deterministic | Yes | Yes | Only with RFC 6979 | PSS no, PKCS#1 v1.5 yes |
| Nonce-reuse risk | None | None | Yes | n/a |

## How it works

- A 32-byte private seed is hashed with SHA-512. The first half, with a few
  bits fixed, becomes the secret scalar `s`, and the public key is
  `A = s·B` for the curve's base point `B`. The second half is a secret
  prefix.
- **Sign** message `M`: derive the nonce `r = SHA-512(prefix ‖ M) mod ℓ`
  *deterministically*, compute `R = r·B`, then
  `S = (r + SHA-512(R ‖ A ‖ M)·s) mod ℓ`, where ℓ is the group order. The
  signature is `(R, S)`, 64 bytes.
- **Verify:** check `S·B = R + SHA-512(R ‖ A ‖ M)·A`. RFC 8032 writes this
  with both sides multiplied by the cofactor 8 and allows either form.

The main difference from ECDSA: the nonce is computed from the message,
never randomly generated, so the nonce-reuse attack that breaks DSA and
ECDSA can't happen. Edwards curves also have one addition formula with no
special cases, which makes constant-time code easier.

RFC 8032 defines five variants:

- **Ed25519** is the 2011 scheme unchanged.
- **Ed25519ctx** puts a prefix in front of both hashes: the string
  "SigEd25519 no Ed25519 collisions", a flag, and a context of up to 255
  bytes that the signer and verifier must agree on. The context keeps a
  signature made for one protocol from being accepted in another.
- **Ed25519ph** signs SHA-512(M) instead of M, so a huge message is read
  only once. Plain Ed25519 reads it twice, once for `r` and once for the
  challenge. The price: Ed25519 survives a SHA-512 collision, Ed25519ph
  doesn't. RFC 8032 says the prehash variants SHOULD NOT be used.
- **Ed448** uses SHAKE256 with 114 bytes of output and always has the
  prefix ("SigEd448"), so contexts are built in. **Ed448ph** is its
  prehash version.

One key pair may be used for Ed25519, Ed25519ctx and Ed25519ph; the
prefixes keep their signatures apart. FIPS 186-5 approves Ed25519 and Ed448
and the prehash versions, which it calls HashEdDSA, on the curves of
SP 800-186. Ed25519ctx is not in it.

## Strict and lax verification

RFC 8032 leaves room, and libraries use it differently:

- **S out of range.** If a verifier doesn't check `S < ℓ`, then
  `(R, S + ℓ)` also passes, giving a second valid signature on the same
  message. RFC 8032 requires the check (section 8.4), but some early code
  skipped it.
- **Cofactor.** The curve has 8 times as many points as the prime-order
  group. A public key or `R` with a small-order part can pass the check
  multiplied by 8 and fail the one without, and RFC 8032 allows both.
- **Encodings.** A y-coordinate written as a number ≥ p is accepted by some
  libraries and refused by others.

For one signer and one verifier this lets nobody forge. It matters when
many machines must agree on which signatures are valid, as in a
blockchain: a signature that one node accepts and another rejects splits
the network. Chalkias, Garillot and Nikolaenko tested popular libraries in
2020 and found that most didn't follow the standards' recommendations.

There are two clean answers:

- **Strict:** reject non-canonical encodings and small-order `A` and `R`,
  and require `S < ℓ`.
- **ZIP 215** (Henry de Valence, 2020; adopted by Zcash): `S` must be
  below ℓ, `A` and `R` may be non-canonical, and only the check multiplied
  by 8 may be used. Then single and batch verification always agree, since
  batch verification needs the cofactor anyway.

Pick one and write it down when validity is consensus-critical.

## When to use it

- **Default for new signatures:** SSH keys, software signing, tokens.
- When you need **deterministic, reproducible** signatures.
- **Ed448** when you want more margin than ~128 bits; RFC 8032 recommends
  Ed25519 otherwise.
- **Pure Ed25519**, not Ed25519ph, unless an API forces one-pass hashing.
  Contexts only if every signature scheme the protocol may use supports
  them (RFC 8032 section 8.3).
- For signatures only: to agree on a shared key, use
  [X25519](../01-key-exchange/ECDH.md); to encrypt, use an
  [AEAD](../05-modes-aead/AEAD.md).

## Example (Python)

Ed25519, Ed25519ctx and Ed25519ph from the standard library, checked
against RFC 8032's test vectors, then the `S + ℓ` trick against a verifier
with and without the range check. Based on RFC 8032 section 6; slow and
not constant time.

```python
from hashlib import sha512

p = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493    # the group order, ℓ
d = -121665 * pow(121666, -1, p) % p

def add(P, Q):                    # extended coordinates (X, Y, Z, T)
    A = (P[1] - P[0]) * (Q[1] - Q[0]) % p
    B = (P[1] + P[0]) * (Q[1] + Q[0]) % p
    C, D = 2 * P[3] * Q[3] * d % p, 2 * P[2] * Q[2] % p
    E, F, G, H = B - A, D - C, D + C, B + A
    return E * F, G * H, F * G, E * H

def mul(s, P):
    Q = (0, 1, 1, 0)
    while s:
        if s & 1: Q = add(Q, P)
        P, s = add(P, P), s >> 1
    return Q

def enc(P):
    zi = pow(P[2], p - 2, p)
    x, y = P[0] * zi % p, P[1] * zi % p
    return (y | (x & 1) << 255).to_bytes(32, "little")

def dec(b):                       # None if b is not a canonical point
    y = int.from_bytes(b, "little")
    sign, y = y >> 255, y & (1 << 255) - 1
    if y >= p: return None
    x2 = (y * y - 1) * pow(d * y * y + 1, -1, p) % p
    x = pow(x2, (p + 3) // 8, p)
    if (x * x - x2) % p: x = x * pow(2, (p - 1) // 4, p) % p
    if (x * x - x2) % p or (x == 0 and sign): return None
    if x & 1 != sign: x = p - x
    return x, y, 1, x * y % p

G = dec((4 * pow(5, -1, p) % p).to_bytes(32, "little"))
Hq = lambda b: int.from_bytes(sha512(b).digest(), "little") % L

def sign(seed, m, ctx=None, ph=0):        # ctx=None: plain Ed25519
    dom = b"" if ctx is None else b"SigEd25519 no Ed25519 collisions" + bytes([ph, len(ctx)]) + ctx
    h = sha512(seed).digest()
    s = int.from_bytes(h[:32], "little") & (1 << 254) - 8 | 1 << 254
    A = enc(mul(s, G))
    if ph: m = sha512(m).digest()
    r = Hq(dom + h[32:] + m)              # the nonce comes from the message
    R = enc(mul(r, G))
    return A, R + ((r + Hq(dom + R + A + m) * s) % L).to_bytes(32, "little")

def verify(A, m, sig, strict=True):       # plain Ed25519
    Ap, R, S = dec(A), dec(sig[:32]), int.from_bytes(sig[32:], "little")
    if Ap is None or R is None or (strict and S >= L): return False
    P, Q = mul(S, G), add(R, mul(Hq(sig[:32] + A + m), Ap))
    return (P[0] * Q[2] - Q[0] * P[2]) % p == 0 and (P[1] * Q[2] - Q[1] * P[2]) % p == 0

h = bytes.fromhex
A, sig = sign(h("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"), b"")
print(A.hex()[:16], sig.hex()[:16], verify(A, b"", sig))   # d75a980182b10ab7 e5564300c360ac72 True

seed = h("0305334e381af78f141cb666f6199f57bc3495335a256a95bd2a55bf546663f6")
print(sign(seed, h("f726936d19c800494e3fdaff20b276a8"), b"foo")[1].hex()[:16])   # 55a4cc2f70a54e04
seed = h("833fe62409237b9d62ec77587520911e9a759cec1d19755b7da901b96dca3d42")
print(sign(seed, b"abc", b"", 1)[1].hex()[:16])                                  # 98a70222f0b8121a

S = int.from_bytes(sig[32:], "little")                 # a second signature: S + L
sig2 = sig[:32] + (S + L).to_bytes(32, "little")
print(verify(A, b"", sig2, strict=False), verify(A, b"", sig2))   # True False
```

The first three lines match RFC 8032's TEST 1, the Ed25519ctx vector with
context "foo" and the Ed25519ph vector for "abc". The last line is the
malleability check from section 8.4: drop it and the same message gets a
second valid signature.

In real code, with PyCA `cryptography`:

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

priv = Ed25519PrivateKey.generate()
sig = priv.sign(b"message")                 # 64-byte signature
priv.public_key().verify(sig, b"message")   # raises if invalid
```

`Ed448PrivateKey` works the same way, with 114-byte signatures. PyCA has no
ctx or ph variants. This needs the library and wasn't run for this page.

## Security notes

- No random nonce, so no nonce-reuse footgun: its biggest practical
  advantage over [ECDSA](ECDSA.md).
- **Keep the public key with the secret.** A signing API that takes the
  public key as a separate argument leaks the key if it is ever called with
  the wrong one: same `r`, two different `S`, two equations. A public list
  of libraries with such an API, started in 2022, had 45 entries by 2023.
- **Faults.** Because the nonce is deterministic, a glitch during signing
  can yield two signatures with the same `r` and reveal the key (Romailler
  and Pelissier, 2017). Hardware open to fault attacks should add
  randomness to the nonce.
- **Choose a validation rule** where many nodes must agree (above).
- ~128-bit security for Ed25519 and ~224-bit for Ed448. NIST IR 8547
  deprecates EdDSA after 2030 and disallows it after 2035.
- Quantum computers break it like all ECC; see [ML-DSA](ML-DSA.md).

## See also

- [X25519](../01-key-exchange/ECDH.md): key exchange on the same curve family
- [Schnorr](Schnorr.md): the scheme EdDSA grew from
- [ECDSA](ECDSA.md): the curve signature scheme it improves on
- [Elliptic curves](../10-math-foundations/Elliptic-Curves.md): Edwards curves, cofactors and Curve448
- [Threshold signatures](../11-advanced/Threshold-Signatures.md): FROST, which ends in an ordinary Ed25519 signature
- [Cryptography FAQ](../FAQ.md): why randomness (and its absence here) matters

## References

- [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://www.rfc-editor.org/rfc/rfc8032) (Sections 4, 5, 6, 7.1–7.3, 8)
- [Bernstein, Duif, Lange, Schwabe and Yang, "High-speed high-security signatures" (CHES 2011)](https://ed25519.cr.yp.to/) / [Hamburg, "Ed448-Goldilocks, a new elliptic curve" (2015)](https://eprint.iacr.org/2015/625)
- [FIPS 186-5: Digital Signature Standard (February 2023)](https://csrc.nist.gov/pubs/fips/186-5/final) (Sections 7.3–7.8) / [NIST SP 800-186](https://csrc.nist.gov/pubs/sp/800/186/final) / [NIST IR 8547](https://csrc.nist.gov/pubs/ir/8547/final)
- [ZIP 215: Explicitly Defining and Modifying Ed25519 Validation Rules (2020)](https://zips.z.cash/zip-0215)
- [Chalkias, Garillot and Nikolaenko, "Taming the many EdDSAs" (SSR 2020)](https://eprint.iacr.org/2020/1244)
- Romailler and Pelissier, "Practical Fault Attack against the Ed25519 and EdDSA Signature Schemes" (FDTC 2017)
- [OpenSSH 9.5 release notes](https://www.openssh.com/txt/release-9.5) / [RFC 8080: Ed25519 and Ed448 for DNSSEC](https://www.rfc-editor.org/rfc/rfc8080) / [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [PyCA `cryptography`: Ed25519](https://cryptography.io/en/latest/hazmat/primitives/asymmetric/ed25519/)

*Weaker sources:* [MystenLabs, ed25519-unsafe-libs](https://github.com/MystenLabs/ed25519-unsafe-libs),
a GitHub list, for the 45 libraries with a separate public-key argument.
