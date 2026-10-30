# ECDH (elliptic-curve Diffie-Hellman)

*Diffie-Hellman on an elliptic curve: each side multiplies the other's
public point by its own secret, and both land on the same point. X25519 is
the modern default; the NIST and Brainpool curves are what FIPS modules and
older standards use.*

**Status and standards:** see [Key exchange](../index.md#1-key-exchange) in
the main table.

## What it is

ECDH is [Diffie-Hellman](Diffie-Hellman.md) with the points of an elliptic
curve in place of numbers mod p. Two parties each generate a key pair, swap
public keys, and independently compute the same shared secret. An
eavesdropper who sees both public keys still can't recover it. Koblitz and
Miller proposed curves for this independently in 1985, and the keys are
small: a 32-byte X25519 key does the work of a 3072-bit finite-field group.

It does one thing, key agreement. For signatures on the same curves see
[EdDSA](../02-signatures/EdDSA.md) and [ECDSA](../02-signatures/ECDSA.md).
ECDH, mostly X25519, is the workhorse of TLS 1.3, SSH, WireGuard, Signal
and age.

| Member | Curve | Public key | Shared secret | Security (bits) | Spec | Check incoming keys |
|---|---|---|---|---|---|---|
| X25519 | Curve25519, Montgomery, p = 2²⁵⁵ − 19 | 32 B | 32 B | ~128 | RFC 7748 | no; reject an all-zero result |
| X448 | Curve448, Montgomery, p = 2⁴⁴⁸ − 2²²⁴ − 1 | 56 B | 56 B | ~224 | RFC 7748 | no; reject an all-zero result |
| ECDH P-256 / P-384 / P-521 | NIST, short Weierstrass | 65 / 97 / 133 B | 32 / 48 / 66 B | 128 / 192 / 256 | SP 800-56A | yes, always |
| ECDH Brainpool | brainpoolP256r1 / P384r1 / P512r1 | 65 / 97 / 129 B | 32 / 48 / 64 B | 128 / 192 / 256 | RFC 5639 | yes, always |

Weierstrass public keys are counted uncompressed (0x04, x, y), the form
TLS 1.3 uses.

## How it works

Every member does the same thing. Each side has a private scalar `d` and a
public point `Q = d·G`, the base point `G` added to itself `d` times. Alice
computes `d_A · Q_B`, Bob computes `d_B · Q_A`, and both equal
`d_A · d_B · G`. Security rests on the elliptic-curve discrete log problem:
recovering `d` from `Q` is infeasible. The
[Elliptic curves](../10-math-foundations/Elliptic-Curves.md) page has the
point arithmetic, the curve shapes and where each curve came from.

The result is uniform-looking but not a finished key: always run it
through a KDF before use.

### X25519 and X448

Curve25519 (Bernstein, 2006) is a Montgomery curve where the whole
computation uses only the x-coordinate, called u in RFC 7748. The Montgomery
ladder does the same steps for every key bit, which makes the code simple
and constant-time.

- **Keys** are 32 random bytes. X25519 "clamps" them: clear the low 3 bits
  (a multiple of the cofactor 8), clear bit 255, set bit 254.
- **Any 32 bytes are a public key.** A value that is not on the curve lies
  on its twist, and Curve25519 was chosen so the twist is safe too. So
  there is no validation step to forget.
- **Small-order points.** A peer can send one of a few points of order
  dividing 8, and then the result is all zeros whatever your key. RFC 7748
  lets you check for that; TLS 1.3 requires it.
- **X448** is the same on Hamburg's Curve448 (2015): 56-byte keys, ~224-bit
  security, clamping clears 2 low bits and sets bit 447. RFC 7748 offers it
  as a hedge against future attacks on elliptic curves.

TLS 1.3 has both as `x25519` and `x448`; SSH has `curve25519-sha256` and
`curve448-sha512` (RFC 8731).

### ECDH on the NIST curves

NIST SP 800-56A (2006, now Rev. 3 from 2018) defines the ECDH schemes that
FIPS modules may use. The public key is a point (x, y); TLS 1.3 sends it
uncompressed, and the shared secret is the x-coordinate of the result.

Here the receiver must check every incoming point: not the point at
infinity, both coordinates in [0, p − 1], and on the curve. The P-curves
have cofactor 1, so that covers the subgroup check too (SP 800-56A section
5.6.2.3; TLS 1.3 section 4.2.8.2). Skipping it opens the **invalid-curve
attack**. The addition formulas never use the curve's constant b, so a
point that isn't on P-256 is still on some other curve y² = x³ − 3x + b′,
which may have a small subgroup. A server that multiplies such a point by
its static key leaks the key modulo that small order. Enough such points
and the Chinese remainder theorem give the whole key (Biehl, Meyer and
Müller, 2000).

- In 2015 Jager, Schwenk and Somorovsky pulled TLS server keys out of two
  popular Java libraries this way.
- In 2018 Biham and Neumann showed that Bluetooth pairing authenticated
  only the x-coordinates and many chips didn't check the points. Setting
  both y-coordinates to 0 let a man in the middle learn the key in half of
  the pairings between two such devices (CVE-2018-5383).

Fresh keys per session (ECDHE) limit the damage, since each private key is
used once, but check the point anyway.

### Brainpool

RFC 5639 (2010), from Germany's BSI and secunet: curves from 160 to 512
bits whose primes come from the digits of π and coefficients from e, an
answer to the NIST curves' unexplained seeds. Each size has a random
"r1" curve and a twisted "t1" version. ECDH works exactly as on the
P-curves, with the same checks, but runs slower because the primes have no
special shape. TLS 1.2 has them through RFC 7027; TLS 1.3 dropped those code
points, and RFC 8734 (2020) adds new ones for the 256, 384 and 512-bit
curves.

## When to use it

- **X25519 by default** for key agreement in any new protocol or
  application.
- **With ephemeral keys for forward secrecy:** generate a fresh pair per
  session so a later key compromise can't decrypt past traffic. This is the
  "ECDHE" in TLS cipher suites.
- **Paired with a signature:** ECDH agrees on a key but doesn't prove who
  you're talking to. Combine it with [Ed25519](../02-signatures/EdDSA.md) or
  a certificate to stop a man in the middle.
- **In hybrid post-quantum exchanges:** TLS and SSH now pair X25519 with
  ML-KEM so the secret stays safe against a future quantum attacker. See
  [ML-KEM](ML-KEM.md).
- **P-256 or P-384** when FIPS 140 validation or a standard requires it.
  SP 800-56A Rev. 3 doesn't include X25519 or X448. In January 2026 NIST
  said it will update SP 800-56A to approve x-coordinate-only ECC key
  agreement and to match the curves in SP 800-186, which lists Curve25519
  and Curve448.
- **X448** for a larger margin; **Brainpool** only where a profile asks
  for it.

## Example (Python)

X25519 and X448 from the standard library: one Montgomery ladder, checked
against the RFC 7748 test vectors. The last line feeds in the point u = 0,
which has order 2. Python's big integers make no timing promises, so this
is for reading only.

```python
def ladder(k, u, p, a24, bits):
    # Montgomery ladder, RFC 7748 section 5: works on u (= x) alone
    x2, z2, x3, z3, swap = 1, 0, u, 1, 0
    for t in reversed(range(bits)):
        b = k >> t & 1
        if swap ^ b: x2, x3, z2, z3 = x3, x2, z3, z2
        swap = b
        A, B, C, D = x2 + z2, x2 - z2, x3 + z3, x3 - z3
        AA, BB, DA, CB = A * A, B * B, D * A, C * B
        E = AA - BB
        x3, z3 = (DA + CB) ** 2 % p, u * (DA - CB) ** 2 % p
        x2, z2 = AA * BB % p, E * (AA + a24 * E) % p
    if swap: x2, z2 = x3, z3
    return x2 * pow(z2, p - 2, p) % p

def x25519(k, u):
    k = int.from_bytes(k, "little") & (1 << 254) - 8 | 1 << 254    # clamp
    u = int.from_bytes(u, "little") & (1 << 255) - 1
    return ladder(k, u, 2**255 - 19, 121665, 255).to_bytes(32, "little")

def x448(k, u):
    k = int.from_bytes(k, "little") & -4 | 1 << 447
    return ladder(k, int.from_bytes(u, "little"), 2**448 - 2**224 - 1, 39081, 448).to_bytes(56, "little")

h = bytes.fromhex                                      # RFC 7748 section 6.1
a = h("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
b = h("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb")
A, B = x25519(a, b"\x09" + bytes(31)), x25519(b, b"\x09" + bytes(31))
print(A.hex()[:16], B.hex()[:16])                      # 8520f0098930a754 de9edb7d7b7dc1b4
print(x25519(a, B) == x25519(b, A), x25519(a, B).hex()[:16])   # True 4a5d9d5ba4ce2de1

a = h("9a8f4925d1519f5775cf46b04b5800d4ee9ee8bae8bc5565d498c28d"   # section 6.2
      "d9c9baf574a9419744897391006382a6f127ab1d9ac2d8c0a598726b")
b = h("1c306a7ac2a0e2e0990b294470cba339e6453772b075811d8fad0d1d"
      "6927c120bb5ee8972b0d3e21374c9c921b09d1b0366f10b65173992d")
A, B = x448(a, b"\x05" + bytes(55)), x448(b, b"\x05" + bytes(55))
print(x448(a, B) == x448(b, A), x448(a, B).hex()[:16])          # True 07fff4181ac6cc95

print(x25519(a[:32], bytes(32)) == bytes(32))          # True: a low-order point gives all zeros
```

In real code, with PyCA `cryptography`:

```python
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

alice = X25519PrivateKey.generate()
bob = X25519PrivateKey.generate()

# Each side computes the same raw secret from its own private key + peer's public key.
alice_secret = alice.exchange(bob.public_key())
bob_secret = bob.exchange(alice.public_key())
assert alice_secret == bob_secret

# Never use the raw secret directly: derive a key from it first.
session_key = HKDF(algorithm=hashes.SHA256(), length=32,
                   salt=None, info=b"handshake v1").derive(alice_secret)
```

`X448PrivateKey` works the same way. For P-256 it is
`ec.generate_private_key(ec.SECP256R1())` and
`key.exchange(ec.ECDH(), peer_public_key)`. Needs
`pip install cryptography`. Run with version 50.0.1 on Python 3.13, the
`assert` passes and nothing is printed. The X448 and P-256 versions agree
too, on 56 and 32 bytes.

## Security notes

- **Derive, don't use raw.** Feed the exchange output through
  [HKDF](../08-kdf-password-hashing/HKDF.md) before it becomes a cipher key,
  and put both public keys into the derivation: several X25519 public keys
  give the same shared secret, so the secret alone doesn't prove which key
  the peer used.
- **Authenticate the public keys.** Plain ECDH has no identity; without
  signatures or certificates it's open to a man in the middle.
- **Check NIST and Brainpool points** on arrival, every time. X25519 and
  X448 need only the all-zero check.
- **~128-bit security** for X25519, on par with Ed25519 and AES-128. RFC 7748
  puts it slightly under, which it calls acceptable.
- **Use a constant-time library.** Timing and cache leaks have pulled keys
  out of real elliptic-curve code.
- Quantum computers break it like all ECC: pair it with a post-quantum KEM
  if long-term secrecy matters. NIST IR 8547 deprecates ECDH after 2030 and
  disallows it after 2035.

## See also

- [Elliptic curves](../10-math-foundations/Elliptic-Curves.md): the curve math, the named curves and twist security
- [Diffie-Hellman](Diffie-Hellman.md): the finite-field version
- [EdDSA](../02-signatures/EdDSA.md) / [ECDSA](../02-signatures/ECDSA.md): signatures on the same curves
- [ML-KEM](ML-KEM.md): the post-quantum half of the hybrid
- [ECIES](../03-public-key-encryption/ECIES.md) / [HPKE](../03-public-key-encryption/HPKE.md): public-key encryption built on ECDH
- [HKDF](../08-kdf-password-hashing/HKDF.md): what the shared secret goes through next

## References

- [RFC 7748: Elliptic Curves for Security](https://www.rfc-editor.org/rfc/rfc7748) (Sections 5, 6, 7)
- [Bernstein, "Curve25519: new Diffie-Hellman speed records" (PKC 2006)](https://cr.yp.to/ecdh/curve25519-20060209.pdf) / [Hamburg, "Ed448-Goldilocks, a new elliptic curve" (2015)](https://eprint.iacr.org/2015/625)
- Miller, "Use of Elliptic Curves in Cryptography" (CRYPTO '85) / Koblitz, "Elliptic Curve Cryptosystems" (Mathematics of Computation, 1987)
- [NIST SP 800-56A Rev. 3 (2018)](https://csrc.nist.gov/pubs/sp/800/56/a/r3/final) (Sections 5.6.2.3, 5.7.1.2) / [NIST to revise key-establishment recommendations (January 2026)](https://csrc.nist.gov/news/2026/nist-to-revise-key-establishment-recommendations) / [NIST SP 800-186](https://csrc.nist.gov/pubs/sp/800/186/final)
- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446) (Sections 4.2.8.2, 7.4.2) / [RFC 8422: ECC in TLS 1.2](https://www.rfc-editor.org/rfc/rfc8422) / [RFC 8731: curve25519-sha256 in SSH](https://www.rfc-editor.org/rfc/rfc8731)
- [RFC 5639: Brainpool curves](https://www.rfc-editor.org/rfc/rfc5639) / [RFC 7027](https://www.rfc-editor.org/rfc/rfc7027) / [RFC 8734](https://www.rfc-editor.org/rfc/rfc8734)
- Biehl, Meyer and Müller, "Differential Fault Attacks on Elliptic Curve Cryptosystems" (CRYPTO 2000) / Antipa, Brown, Menezes, Struik and Vanstone, "Validation of Elliptic Curve Public Keys" (PKC 2003)
- Jager, Schwenk and Somorovsky, "Practical Invalid Curve Attacks on TLS-ECDH" (ESORICS 2015) / [Biham and Neumann, "Breaking the Bluetooth Pairing: The Fixed Coordinate Invalid Curve Attack" (SAC 2019)](https://eprint.iacr.org/2019/1043)
- [NIST IR 8547](https://csrc.nist.gov/pubs/ir/8547/final)
- [PyCA `cryptography`: X25519](https://cryptography.io/en/latest/hazmat/primitives/asymmetric/x25519/)
