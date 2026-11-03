# Groups and finite fields

*The two structures under nearly every algorithm: groups (where Diffie-Hellman,
DSA and elliptic curves live) and finite fields (where AES, GCM and the curves
themselves do their arithmetic).*

You need [Modular arithmetic](Modular-Arithmetic.md) first.

## Groups

A **group** is a set with one operation, call it $\cdot$, that obeys four rules:

1. **Closure:** $a \cdot b$ is in the set.
2. **Associativity:** $(a \cdot b) \cdot c = a \cdot (b \cdot c)$.
3. **Identity:** there is an $e$ with $e \cdot a = a \cdot e = a$.
4. **Inverses:** each $a$ has an $a^{-1}$ with $a \cdot a^{-1} = e$.

If also $a \cdot b = b \cdot a$, the group is **abelian**, after the Norwegian
Niels Henrik Abel (1802 to 1829). Every group in this tutorial is abelian.

Three groups you will meet constantly:

| Group | Set | Operation | Identity | Used by |
|---|---|---|---|---|
| $\mathbb{Z}_n$ | $0, 1, \ldots, n-1$ | $+ \bmod n$ | 0 | shift ciphers, lattices |
| $\mathbb{Z}_p^*$ | $1, 2, \ldots, p-1$, $p$ prime | $\times \bmod p$ | 1 | Diffie-Hellman, DSA, ElGamal |
| $E(\mathbb{F}_p)$ | points on an elliptic curve | point addition | the point at infinity | X25519, ECDSA, Ed25519 |

Why does $\mathbb{Z}_p^*$ need $p$ prime? Because then every number from 1 to
$p - 1$ has a multiplicative inverse (its gcd with $p$ is 1). Mod 10, the
number 2 has no inverse, so $\{1, \ldots, 9\}$ under multiplication is not a
group.

The idea came out of algebra in the early 19th century: Lagrange's work on
equations (1771), Gauss on remainders (1801), and Évariste Galois, who used it
to show which equations can be solved by formulas. Galois wrote it down the
night before he was killed in a duel in 1832, aged 20.

## Order, generators and cyclic groups

Repeat the operation: $g, g^2, g^3, \ldots$. In a finite group you must
eventually come back to 1. The **order** of $g$ is the first $k > 0$ with
$g^k = 1$. If the powers of $g$ hit every element, $g$ is a **generator** and the
group is **cyclic**.

In $\mathbb{Z}_{23}^*$ (22 elements), the powers of 5 are

$$
1, 5, 2, 10, 4, 20, 8, 17, 16, 11, 9, 22, 18, 21, 13, 19, 3, 15, 6, 7, 12, 14
$$

and all 22 elements appear, so 5 is a generator.

```python
def order(g, p):                    # smallest k > 0 with g^k = 1 mod p
    k, x = 1, g % p
    while x != 1:
        x, k = x * g % p, k + 1
    return k

print([order(g, 23) for g in range(1, 23)])
# [1, 11, 11, 11, 22, 11, 22, 11, 11, 22, 22, 11, 11, 22, 22, 11, 22, 11, 22, 22, 22, 2]
```

Every order is 1, 2, 11 or 22, and those are exactly the divisors of 22. That
is **Lagrange's theorem**: in a group of $N$ elements, the order of every
element (and the size of every subgroup) divides $N$. Fermat's little theorem
is a special case: $a^{p-1} = 1$ because the order of $a$ divides $p - 1$.

## The discrete logarithm

Going forwards is easy: given $g$ and $k$, square and multiply gives $g^k$ in a
few hundred steps. Going back, given $g$ and $h = g^k$, find $k$: this is the
**discrete logarithm problem**, and in a well-chosen group nobody knows how to
do it fast.

```python
def dlog(g, h, p):                  # brute force: try every k
    x = 1
    for k in range(p):
        if x == h:
            return k
        x = x * g % p

print(dlog(5, 8, 23))   # 6, since 5^6 = 8 mod 23
```

With 22 elements that's instant. With $2^{256}$ elements (a 256-bit elliptic
curve) the best known attack, Pollard's rho, still needs about $2^{128}$ steps.
That gap between forwards and backwards is the whole of
[Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md):

$$
\text{Alice sends } g^a, \quad \text{Bob sends } g^b, \quad \text{both compute } (g^b)^a = (g^a)^b = g^{ab}.
$$

Eve sees $g^a$ and $g^b$ but needs $a$ or $b$ to get $g^{ab}$.

## Why the group's size must have a big prime factor

By Lagrange, subgroups have sizes dividing the group's size. If $N = p - 1$ has
only small factors, the **Pohlig-Hellman** method (1978) solves the discrete log
in each small subgroup and joins the pieces with the
[Chinese remainder theorem](Modular-Arithmetic.md#the-chinese-remainder-theorem).
So the hard part is only as hard as the **largest prime factor** of $N$.

That is why standards use a **safe prime** $p = 2q + 1$ with $q$ also prime, or
work in a subgroup of large prime order $q$ (DSA, Schnorr), and why curves are
chosen with a prime number of points, or a prime times a small cofactor such as
8 for Curve25519.

It also explains **small-subgroup attacks**: if Bob raises whatever Alice sends
to his secret power without checking it, Mallory can send an element of small
order and learn $b \bmod$ (that order). Repeat with different small orders and
CRT gives $b$. Checking inputs, or using groups with no small subgroups, stops it.

## Fields

A **field** has two operations, $+$ and $\times$, each behaving like a group (on
all elements for $+$, on all nonzero elements for $\times$), with the usual rule
$a(b + c) = ab + ac$. The rational and real numbers are fields. The ones
cryptography needs are **finite**:

**$\mathbb{F}_p$, the integers mod a prime $p$.** Add, subtract, multiply mod $p$,
and divide by multiplying by an inverse. Elliptic curves such as P-256 and
Curve25519 do their arithmetic in $\mathbb{F}_p$ with $p$ of about 256 bits.
The primes are picked to make reduction cheap: $2^{255} - 19$ for Curve25519.

**$\mathrm{GF}(2^n)$, binary fields.** Galois showed that a finite field of
$q$ elements exists exactly when $q$ is a prime power, and there is only one of
each size. For $q = 2^8 = 256$, the elements are bytes, read as polynomials with
bits as coefficients:

$$
\mathtt{57} = 01010111_2 = x^6 + x^4 + x^2 + x + 1 .
$$

- **Adding** is XOR (coefficients mod 2, so $1 + 1 = 0$).
- **Multiplying** is multiplying polynomials, then taking the remainder mod an
  irreducible polynomial. AES uses $x^8 + x^4 + x^3 + x + 1$, the byte `11b`.

```python
def gmul(a, b):                     # multiply in GF(2^8), AES's field
    r = 0
    while b:
        if b & 1:
            r ^= a
        a <<= 1
        if a & 0x100:
            a ^= 0x11b
        b >>= 1
    return r

print(hex(gmul(0x57, 0x83)))   # 0xc1, the worked example in FIPS 197
print(hex(gmul(0x53, 0xca)))   # 0x1: so 0xca is the inverse of 0x53
```

It's the same square-and-multiply idea as before, with XOR in place of addition.

**Where binary fields are used:**

- [AES](../04-symmetric-ciphers/AES.md): its S-box takes the inverse in
  $\mathrm{GF}(2^8)$ (that's where its nonlinearity comes from), and MixColumns
  multiplies by `02` and `03` in it.
- [AES-GCM](../05-modes-aead/AEAD.md): its authenticator GHASH multiplies in
  $\mathrm{GF}(2^{128})$.
- [Secret sharing](../11-advanced/Secret-Sharing.md) often works in
  $\mathrm{GF}(2^8)$ so each byte is shared separately.
- Error-correcting codes (Reed-Solomon in QR codes and CDs), and the
  [code-based KEMs](../01-key-exchange/Code-Based-KEMs.md).

## Rings and polynomials, for later

Post-quantum schemes use one more structure: a **ring**, like a field but
without division. [ML-KEM](../01-key-exchange/ML-KEM.md) works in

$$
R_q = \mathbb{Z}_q[x] / (x^{256} + 1), \qquad q = 3329,
$$

polynomials of degree below 256 with coefficients mod 3329, where $x^{256}$
wraps around to $-1$. [Lattices and LWE](Lattices-and-LWE.md) explains why.

## Try it

??? question "1. Is 2 a generator of $\mathbb{Z}_{11}^*$?"

    Powers of 2 mod 11: 2, 4, 8, 5, 10, 9, 7, 3, 6, 1. All ten appear, so yes.

??? question "2. In a group of 100 elements, can an element have order 30?"

    No: 30 doesn't divide 100, and Lagrange says every order divides the group size.
    The possible orders are 1, 2, 4, 5, 10, 20, 25, 50, 100.

??? question "3. Why is $p = 2q + 1$ with $q$ prime a good choice for Diffie-Hellman?"

    $p - 1 = 2q$, so the only subgroups have sizes 1, 2, $q$ and $2q$. Pohlig-Hellman
    gains nothing, and an element of small order (only 1 and $p - 1$ have order
    1 or 2) is easy to reject.

??? question "4. What is `03` × `01` + `02` × `01` in GF(2^8)?"

    `03` $\oplus$ `02` = `01`. Adding is XOR, so it's not 5.
