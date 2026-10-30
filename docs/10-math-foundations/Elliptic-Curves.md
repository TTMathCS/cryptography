# Elliptic Curves

*The groups under ECDH, ECDSA and EdDSA: how points add, the three ways to
write a curve, and the named curves people actually use.*

**Status and standards:** see [Math foundations](../index.md#10-math-foundations) in the main table.

## What it is

An elliptic curve over a prime field is the set of points (x, y), with x
and y taken mod p, that satisfy an equation such as y² = x³ + ax + b. One
extra point, the point at infinity O, acts as zero. Points can be added,
and with O they form a group. Adding a point G to itself d times gives d·G,
which is fast to compute. Getting d back from d·G is the elliptic-curve
discrete log problem (see [Hard problems](Hard-Problems.md)). A private
key is a number d, and the public key is d·G for a fixed base point G.

The number of points is within 2√p of p + 1. The base point generates a
subgroup of prime order n, and the point count divided by n is the
cofactor. Pollard's rho needs about √n steps, so a 256-bit curve gives
about 128-bit security.

## How it works

Draw the line through P and Q. It meets the curve in one more point; flip
that point over the x-axis and you have P + Q. For P + P use the tangent.
On y² = x³ + ax + b, with every division done mod p:

- slope m = (y₂ − y₁)/(x₂ − x₁), or m = (3x₁² + a)/(2y₁) when P = Q
- x₃ = m² − x₁ − x₂ and y₃ = m(x₁ − x₃) − y₁
- −(x, y) = (x, −y), and P + (−P) = O

Scalar multiplication walks through the bits of d: double for every bit,
add when the bit is 1. A 256-bit d takes 256 doublings and about 128
additions. Real code uses a ladder or fixed windows so the running time
doesn't depend on the bits.

Curves are written in one of three forms:

| Form | Equation | Used by | What it buys |
|---|---|---|---|
| Short Weierstrass | y² = x³ + ax + b | P-256, secp256k1, Brainpool | every curve (for p > 3) has this form; the formulas have special cases |
| Montgomery (1987) | By² = x³ + Ax² + x | Curve25519, Curve448 (X25519, X448) | the Montgomery ladder works on x alone, with the same steps for every bit |
| Twisted Edwards (2007, 2008) | ax² + y² = 1 + dx²y² | Ed25519, Ed448 | one addition formula with no exceptions when a is a square and d is not |

Montgomery and Edwards curves always have a point count divisible by 4, so
they come with a cofactor. Curve25519 and the Edwards curve under Ed25519
are the same group written two ways.

## The named curves

| Curve | Field prime | Equation | Cofactor | Where from |
|---|---|---|---|---|
| Curve25519 | 2^255 − 19 | Montgomery, A = 486662 | 8 | Bernstein (2006), RFC 7748 |
| Curve448 | 2^448 − 2^224 − 1 | Montgomery, A = 156326 | 4 | Hamburg (2015), RFC 7748 |
| P-256 / P-384 / P-521 | special shape; P-521 uses 2^521 − 1 | Weierstrass, a = −3 | 1 | NIST (1999), now SP 800-186 |
| P-192 / P-224 | special shape | Weierstrass, a = −3 | 1 | NIST (1999), now SP 800-186 |
| secp256k1 | 2^256 − 2^32 − 977 | y² = x³ + 7 | 1 | Certicom, SEC 2 (2000) |
| Brainpool | no special shape, 160 to 512 bits | Weierstrass | 1 | ECC Brainpool (2005), RFC 5639 |

**Curve25519 and Curve448.** A = 486662 is the smallest A, with A − 2
divisible by 4, that gives the curve cofactor 8 and its twist cofactor 4
(RFC 7748, appendix A), which leaves the designer little room to steer the
result. RFC 7748 (2016) defines X25519 and X448, and RFC 8032 (2017)
defines Ed25519 and Ed448. Curve448 gives about 224-bit security. SP 800-186
lists both curves, and FIPS 186-5 approves Ed25519 and Ed448.

**NIST P-curves.** FIPS 186-2 (2000) made them the federal curves, and
P-256 is still the usual curve for ECDSA in TLS certificates, smart cards
and FIPS modules. The special primes, such as the
[Mersenne prime](Mersenne-Primes.md) 2^521 − 1, make reduction fast.
NIST IR 8547 (final, October 2026) deprecates them after 2030 and
disallows them after 2035, with all other quantum-vulnerable public-key
algorithms. SP 800-186 keeps P-192 for legacy use only, such as checking
old signatures. P-224 is still allowed there, at NIST's 112-bit floor.

**The seeds.** Each P-curve's b was made by hashing a 160-bit seed with
SHA-1, and anyone can check that (the example does). The seeds came with no
explanation, so whoever chose them could have tried seed after seed until
a curve had a property they wanted. SafeCurves calls such curves
"manipulatable". No weakness has been found. In October 2026 a team at
Anthropic showed that the seeds of P-192 to P-521 come out of the C
library's `lrand48` generator, started from Unix timestamps in 1997 and
1998. P-256's seed is the 1,842nd 20-byte block of a run started at 16
August 1997, 01:52:34 UTC. Still open: why that block was taken (block 876
also gives a prime-order curve) and how the base points were chosen.

**secp256k1.** With a = 0 it has an extra fast map (the GLV endomorphism)
that speeds up scalar multiplication. Bitcoin uses it for ECDSA and, since
Taproot (2021), for Schnorr signatures (BIP 340); Ethereum uses it too.
SP 800-186 allows it only for blockchain uses. Its constants are small and
simple but were never fully explained; SafeCurves rates it "somewhat
rigid".

**Brainpool.** RFC 5639 (2010) came from Germany's BSI and secunet. Each
size has a random "r1" curve and an isomorphic "t1" version with a = −3.
The primes come from the digits of π and the coefficients from e. With no
special shape, the primes are slower to reduce. TLS can use the curves
(RFC 7027, RFC 8734), and SP 800-186 allows the 224-bit and larger ones for
interoperability.

## Why curve choice matters

- **Twist security.** A ladder that works on x alone will compute on the
  curve's twist when handed an x that isn't on the curve. If the twist's
  order has small factors, an attacker learns the key a piece at a time.
  SafeCurves puts the best attack on the twist at 2^124.3 for Curve25519,
  2^120.3 for P-256, 2^109.5 for secp256k1, 2^58.4 for P-224 and 2^44.5
  for brainpoolP256t1. SP 800-186 itself warns about P-224's twist. Code
  that checks every incoming point is safe from this.
- **Complete formulas.** Weierstrass addition has special cases (P = Q,
  P = −P, O). Code that branches on them leaks timing or gives wrong
  answers on rare inputs. Edwards curves have one formula for everything.
  Prime-order Weierstrass curves have complete formulas too (Renes, Costello
  and Batina, 2016), at some cost in speed.
- **No special structure.** A small embedding degree lets the MOV attack
  (1993) move the discrete log into a finite field, and a curve with
  exactly p points falls in polynomial time (Smart, 1999).
- **SafeCurves** (Bernstein and Lange) checks all of this plus rigidity.
  Curve25519 and Ed448-Goldilocks pass. The NIST curves, secp256k1 and
  Brainpool each fail at least one test. That doesn't make them broken; it
  makes safe code for them harder to write.

## Example (Python)

Point addition and double-and-add on a toy curve, then checks on P-256:
the generator is on the curve, n·G = O, b comes from the seed, and the
seed comes from `lrand48`.

```python
from hashlib import sha1

def add(P, Q):
    # None is the point at infinity, the group's zero
    if P is None: return Q
    if Q is None: return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % p == 0: return None    # P + (-P)
    if P == Q: m = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p
    else: m = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (m * m - x1 - x2) % p
    return x3, (m * (x1 - x3) - y1) % p

def mul(k, P):
    # double-and-add, one bit of k at a time
    R = None
    while k:
        if k & 1: R = add(R, P)
        P = add(P, P)
        k >>= 1
    return R

# toy curve y^2 = x^3 + 2x + 2 over F_17: 19 points counting infinity
p, a = 17, 2
G = (5, 1)
print([mul(k, G) for k in (1, 2, 3)])   # [(5, 1), (6, 3), (10, 6)]
print(mul(18, G), mul(19, G))           # (5, 16) None: 18G = -G, 19G = O

# P-256, constants from SP 800-186 section 3.2.1.3
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
a = p - 3
b = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b
G = (0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296,
     0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5)
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
seed = 0xc49d360886e704936a6678e1139d26b7819f7e90
x, y = G
print(y * y % p == (x**3 + a * x + b) % p, mul(n, G))   # True None

# b from the seed (SP 800-186 appendix C.3): c is the low 95 bits of
# SHA-1(seed) followed by SHA-1(seed + 1), and b*b*c = -27 mod p
H = lambda s: int.from_bytes(sha1(s.to_bytes(20, "big")).digest(), "big")
c = (H(seed) % 2**95) << 160 | H(seed + 1)
print(b * b * c % p == p - 27)                         # True

# the seed: lrand48 started from Unix time 871696354 (1997-08-16 01:52:34
# UTC), one byte (lrand48() >> 23) per call, 20-byte block number 1842
s, out = 871696354 << 16 | 0x330e, []
for _ in range(20 * 1842):
    s = (0x5deece66d * s + 0xb) % 2**48
    out.append(s >> 40)
print(bytes(out[-20:]).hex() == "%040x" % seed)        # True
```

This `add` is not constant time and checks nothing about its inputs. It is
for reading, not for keys.

## Security notes

- Check every point you receive: on the curve, not O, and in the right
  subgroup. X25519 is built so it doesn't need this; ECDH on Weierstrass
  curves does. In 2015 invalid points pulled server keys out of TLS built
  on two popular Java libraries.
- The cofactor lets a point carry a small extra part. Protocols that need a
  prime-order group on Curve25519 or Curve448 should use ristretto255 or
  decaf448 (RFC 9496).
- Use a library's constant-time scalar multiplication. Timing and cache
  leaks have recovered keys from real ECDSA code.
- Every curve here falls to Shor's algorithm, at any size.

## See also

- [Hard problems](Hard-Problems.md): the elliptic-curve discrete log and how it is attacked
- [ECDH](../01-key-exchange/ECDH.md) / [ECDSA](../02-signatures/ECDSA.md) / [EdDSA](../02-signatures/EdDSA.md) / [Schnorr](../02-signatures/Schnorr.md): what is built on these curves
- [Mersenne primes](Mersenne-Primes.md): the field of P-521

## References

- [NIST SP 800-186](https://csrc.nist.gov/pubs/sp/800/186/final) (February 2023): sections 3.2.1.1 to 3.2.1.3, Table 2, appendices C.3 and H
- [FIPS 186-5](https://csrc.nist.gov/pubs/fips/186-5/final) / [NIST IR 8547](https://csrc.nist.gov/pubs/ir/8547/final) (final, October 2026), Tables 2 and 4
- [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748) / [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032) / [RFC 9496](https://www.rfc-editor.org/rfc/rfc9496)
- [RFC 5639](https://www.rfc-editor.org/rfc/rfc5639) / [RFC 7027](https://www.rfc-editor.org/rfc/rfc7027) / [RFC 8734](https://www.rfc-editor.org/rfc/rfc8734)
- [SEC 2, version 2.0](https://www.secg.org/sec2-v2.pdf) / [BIP 340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [Bernstein, "Curve25519: new Diffie-Hellman speed records" (PKC 2006)](https://cr.yp.to/ecdh/curve25519-20060209.pdf) / [Hamburg, "Ed448-Goldilocks, a new elliptic curve" (2015)](https://eprint.iacr.org/2015/625)
- Montgomery (Mathematics of Computation, 1987) / Edwards (Bulletin of the AMS, 2007) / Bernstein and Lange, "Faster addition and doubling on elliptic curves" (ASIACRYPT 2007) / Bernstein, Birkner, Joye, Lange and Peters, "Twisted Edwards curves" (AFRICACRYPT 2008)
- [Renes, Costello and Batina, "Complete addition formulas for prime order elliptic curves" (EUROCRYPT 2016)](https://eprint.iacr.org/2015/1060)
- Jager, Schwenk and Somorovsky, "Practical Invalid Curve Attacks on TLS-ECDH" (ESORICS 2015)
- Menezes, Okamoto and Vanstone (IEEE Trans. Inf. Theory, 1993) / Smart (Journal of Cryptology, 1999)
- [Bernstein and Lange, SafeCurves](https://safecurves.cr.yp.to/) (twist, ladder, completeness and rigidity pages)

*Weaker sources:* [Anthropic Frontier Red Team, the origin of the NIST
curve seeds (October 2026)](https://www.anthropic.com/research/ecdsa-curve-origins),
a research blog post, for the `lrand48` timestamps and block numbers; the
example reproduces P-256's seed from them.
