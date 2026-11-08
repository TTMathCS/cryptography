# 7. Groups

*Diffie-Hellman, DSA, elliptic curves, pairings and even the security of a
block cipher's key schedule are statements about groups. A group is the simplest
structure in algebra worth having: a set with one operation that can be undone.
This chapter defines groups with many examples, proves Lagrange's theorem (the
one fact about groups used most in cryptography), and builds the vocabulary of
cyclic groups, cosets, homomorphisms and isomorphisms. Then it states the three
problems on which half of public-key cryptography rests, the discrete logarithm
and the computational and decisional Diffie-Hellman problems, proves Shoup's
lower bound on how hard they are in a "generic" group, and shows the attacks
that follow when a protocol forgets which group it is in: small subgroups and
cofactors.*

!!! abstract "In this chapter"
    **You will learn:**

    - the group axioms, with examples from clocks, permutations, matrices and
      curve points, and how to check them by machine;
    - orders of elements, cyclic groups and generators;
    - subgroups, cosets and Lagrange's theorem, with proof;
    - homomorphisms and isomorphisms, and why "the same group" can be easy in
      one disguise and hard in another;
    - the structure of finite abelian groups, and of the units modulo $n$;
    - the discrete logarithm, CDH and DDH problems, and when DDH fails;
    - the generic group model, Shoup's $\sqrt q$ lower bound, and the
      baby-step giant-step algorithm that meets it;
    - small-subgroup attacks, cofactors, Curve25519's clamping and prime-order
      groups built on top of it.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (units modulo $n$,
    the CRT), [Chapter 4](04-Powers-and-Primitive-Roots.md) (orders and
    primitive roots) and, for §7.7, [Chapter 5](05-Square-Roots-Mod-p.md)
    (the Legendre symbol).

    **Levels:** §7.1 to §7.4 are for beginners, §7.5 to §7.9 are
    intermediate, §7.10 and §7.11 are expert.

## 7.1 The problem

*Level: beginner.*

Two habitats in Arcadia City want a shared key and have only a public radio
link. In Chapter 4 they used Diffie-Hellman: a public prime $p$ and base $g$;
one picks a secret $a$ and sends $g^a$, the other picks $b$ and sends $g^b$, and
both compute $g^{ab}$. The eavesdropper sees $g^a$ and $g^b$.

What made that work had nothing to do with integers as such. It used only that
there is an operation (multiplication mod $p$), that repeating it is fast
(square and multiply), that the order of repetitions does not matter ($(g^a)^b
= (g^b)^a$), and that undoing the repetition, finding $a$ from $g^a$, is hard.
Exactly the same protocol runs with points on an elliptic curve, with "adding
points" as the operation, and it is then about ten times shorter for the same
security (Chapter 12).

To say once and for all what the protocol needs, and to reason about every
setting at once, we need the abstract idea: a **group**. It also tells us what
can go wrong. In Chapter 4 we saw Pohlig-Hellman break a discrete logarithm
whose group had only small prime factors in its order; in Chapter 5 we saw the
Legendre symbol leak a bit of every exponent. Both are facts about the group's
*subgroups*. By the end of this chapter you will see them as two cases of one
lesson: work in a group of prime order, and check that what you received is in
it.

## 7.2 The axioms

*Level: beginner.*

A **group** is a set $G$ with an operation $\cdot$ that takes two elements and
gives a third, such that:

1. **Closure.** If $a, b \in G$ then $a \cdot b \in G$.
2. **Associativity.** $(a \cdot b) \cdot c = a \cdot (b \cdot c)$ for all $a, b, c$.
3. **Identity.** There is an $e \in G$ with $e \cdot a = a \cdot e = a$ for all $a$.
4. **Inverses.** For each $a$ there is an $a^{-1}$ with $a \cdot a^{-1} = a^{-1}
   \cdot a = e$.

If also $a \cdot b = b \cdot a$ for all $a, b$, the group is **abelian** (after
Niels Henrik Abel), or commutative. The number of elements is the **order** of
the group, written $|G|$.

Two notations are used. In **multiplicative** notation the operation is written
$ab$, the identity 1, and repeating $a$ $k$ times is $a^k$. In **additive**
notation (used only for abelian groups) it is $a + b$, the identity 0, the
inverse $-a$, and repetition $ka$. Elliptic-curve papers write $aP$ for "add the
point $P$ to itself $a$ times", while finite-field papers write $g^a$ for the same
idea. They are the same operation in different clothes.

### Examples

- **The integers under addition**, $(\mathbb{Z}, +)$. Identity 0, inverse $-a$.
  Infinite and abelian. The positive integers are not a group (no inverses), nor
  are the integers under multiplication (2 has no inverse).
- **A clock**, $\mathbb{Z}/12\mathbb{Z}$ under addition mod 12. Identity 0, the
  inverse of 5 is 7. Every $\mathbb{Z}/n\mathbb{Z}$ is a group under addition,
  of order $n$.
- **The units modulo $n$**, $(\mathbb{Z}/n\mathbb{Z})^*$ under multiplication
  (Chapter 3): the residues coprime to $n$, of order $\varphi(n)$. All of
  $\mathbb{Z}/12\mathbb{Z}$ under multiplication is not a group, since 0, 2, 3, 4
  and others have no inverse; the units $\{1, 5, 7, 11\}$ are.
- **Permutations.** All rearrangements of $n$ objects, combined by doing one
  after another, form the **symmetric group** $S_n$ of order $n!$. It is not
  abelian for $n \ge 3$. Every block cipher with a fixed key is a permutation of
  its blocks, so each key picks one element of $S_{2^{128}}$.
- **Invertible matrices** over a field, under matrix multiplication: the
  **general linear group** $GL_n$. Not abelian for $n \ge 2$. The Hill cipher
  and AES's MixColumns live here (Chapter 9).
- **Points on an elliptic curve** with the chord-and-tangent addition
  (Chapter 12). Abelian. The group behind ECDH, ECDSA and Ed25519.
- **The Rubik's cube.** The moves, combined by doing one after the other, form a
  group of order 43,252,003,274,489,856,000. It is a good picture of a group in
  which "undo" is easy if you remember the moves and hard if you only see the
  result.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two small group tables: addition modulo 4, and multiplication of the units 1, 5, 7, 11 modulo 12, in which every element is its own inverse" fill="currentColor" font-size="13">
<text x="150" y="20" text-anchor="middle">+ mod 4</text>
<text x="470" y="20" text-anchor="middle">× mod 12 on the units</text>
<g stroke="currentColor" stroke-width="1" fill="none">
<rect x="50" y="35" width="200" height="200"/><line x1="90" y1="35" x2="90" y2="235"/><line x1="50" y1="75" x2="250" y2="75"/>
<rect x="370" y="35" width="200" height="200"/><line x1="410" y1="35" x2="410" y2="235"/><line x1="370" y1="75" x2="570" y2="75"/>
</g>
<g text-anchor="middle">
<text x="70" y="60">+</text><text x="110" y="60">0</text><text x="150" y="60">1</text><text x="190" y="60">2</text><text x="230" y="60">3</text>
<text x="70" y="100">0</text><text x="110" y="100" class="acc-fill">0</text><text x="150" y="100">1</text><text x="190" y="100">2</text><text x="230" y="100">3</text>
<text x="70" y="140">1</text><text x="110" y="140">1</text><text x="150" y="140">2</text><text x="190" y="140">3</text><text x="230" y="140" class="acc-fill">0</text>
<text x="70" y="180">2</text><text x="110" y="180">2</text><text x="150" y="180">3</text><text x="190" y="180" class="acc-fill">0</text><text x="230" y="180">1</text>
<text x="70" y="220">3</text><text x="110" y="220">3</text><text x="150" y="220" class="acc-fill">0</text><text x="190" y="220">1</text><text x="230" y="220">2</text>
<text x="390" y="60">×</text><text x="430" y="60">1</text><text x="470" y="60">5</text><text x="510" y="60">7</text><text x="550" y="60">11</text>
<text x="390" y="100">1</text><text x="430" y="100" class="acc-fill">1</text><text x="470" y="100">5</text><text x="510" y="100">7</text><text x="550" y="100">11</text>
<text x="390" y="140">5</text><text x="430" y="140">5</text><text x="470" y="140" class="acc-fill">1</text><text x="510" y="140">11</text><text x="550" y="140">7</text>
<text x="390" y="180">7</text><text x="430" y="180">7</text><text x="470" y="180">11</text><text x="510" y="180" class="acc-fill">1</text><text x="550" y="180">5</text>
<text x="390" y="220">11</text><text x="430" y="220">11</text><text x="470" y="220">7</text><text x="510" y="220">5</text><text x="550" y="220" class="acc-fill">1</text>
</g>
</svg>
<figcaption>Figure 7.1. Two groups of order 4. In each table every row and every column holds every element once (a Latin square); the highlighted cells mark the identity. They are not the same group: in the left one, 1 needs four steps to come back to 0; in the right one, every element squared is 1.</figcaption>
</figure>

### Code it

A computer can check the axioms for a small finite set by trying every
combination.

```python
from itertools import product

def is_group(elements, op, identity=None):
    els = list(elements)
    S = set(els)
    if any(op(a, b) not in S for a, b in product(els, els)):
        return "not closed"
    if any(op(op(a, b), c) != op(a, op(b, c)) for a, b, c in product(els, els, els)):
        return "not associative"
    ids = [e for e in els if all(op(e, a) == a == op(a, e) for a in els)]
    if not ids:
        return "no identity"
    e = ids[0]
    if any(all(op(a, b) != e for b in els) for a in els):
        return "missing inverse"
    return "group, identity %r" % (e,)

print(is_group(range(12), lambda a, b: (a + b) % 12))
print(is_group(range(12), lambda a, b: a * b % 12))
print(is_group([1, 5, 7, 11], lambda a, b: a * b % 12))
print(is_group(range(1, 13), lambda a, b: a * b % 13))
```

```text
group, identity 0
missing inverse
group, identity 1
group, identity 1
```

Permutations are tuples here: `s[i]` is where position `i` goes.

```python
from itertools import permutations

def compose(s, t):
    """(s o t)(i) = s(t(i)): first t, then s."""
    return tuple(s[t[i]] for i in range(len(t)))

S3 = list(permutations(range(3)))
print(is_group(S3, compose))
r, f = (1, 2, 0), (1, 0, 2)          # a rotation and a flip of a triangle
print(compose(r, f), compose(f, r))
```

```text
group, identity (0, 1, 2)
(2, 1, 0) (0, 2, 1)
```

Rotate-then-flip differs from flip-then-rotate: $S_3$, the six symmetries of a
triangle, is the smallest group that is not abelian.

### First consequences

Three facts follow from the axioms alone, and are used constantly.

**The identity is unique.** If $e$ and $e'$ are both identities, $e = ee' = e'$.

**Inverses are unique.** If $b$ and $c$ are both inverses of $a$, then $b = b(ac)
= (ba)c = c$.

**Cancellation.** If $ab = ac$ then $b = c$ (multiply on the left by $a^{-1}$).
So in a finite group, multiplying every element by a fixed $a$ just shuffles the
elements: each appears exactly once. That is why each row of a group table is a
rearrangement of the group, as in Figure 7.1, and it is the heart of the proof of
Lagrange's theorem below. Note also $(ab)^{-1} = b^{-1}a^{-1}$: to undo "put on
socks, then shoes", take off the shoes first.

## 7.3 Orders and cyclic groups

*Level: beginner.*

In a finite group, the powers $a, a^2, a^3, \dots$ must eventually repeat; if
$a^i = a^j$ with $i < j$ then $a^{j-i} = 1$. The smallest $k \ge 1$ with $a^k = 1$
is the **order** of $a$, written $\operatorname{ord}(a)$. The powers $1, a, a^2,
\dots, a^{k-1}$ are all different, and they form a group, the **cyclic subgroup
generated by $a$**, written $\langle a \rangle$. Its order is the order of $a$:
the same word for two ideas that agree.

A group is **cyclic** if some element generates all of it: $G = \langle g
\rangle$. Then $g$ is a **generator**. Examples: $\mathbb{Z}/n\mathbb{Z}$ under
addition is cyclic, generated by 1 (and by any $a$ coprime to $n$). The units
modulo a prime $p$ form a cyclic group of order $p - 1$, generated by any
primitive root (Chapter 4). A group of prime order is always cyclic, and every
element except 1 generates it (proof below).

### Code it

```python
def generated(g, op, e):
    """The cyclic subgroup <g>: e, g, g*g, ... until it returns to e."""
    out, x = [e], g
    while x != e:
        out.append(x)
        x = op(x, g)
    return out

mul13 = lambda a, b: a * b % 13
for g in (2, 3, 5, 12):
    H = generated(g, mul13, 1)
    print(g, len(H), H)
```

```text
2 12 [1, 2, 4, 8, 3, 6, 12, 11, 9, 5, 10, 7]
3 3 [1, 3, 9]
5 4 [1, 5, 12, 8]
12 2 [1, 12]
```

Modulo 13, 2 generates everything, 3 generates a subgroup of order 3, 5 one of
order 4, and $12 = -1$ one of order 2. Every order divides 12. That is no
accident.

### Cyclic groups are all alike

Every cyclic group of order $n$ "is" $\mathbb{Z}/n\mathbb{Z}$: if $G = \langle g
\rangle$ has order $n$, the map $k \mapsto g^k$ matches $\mathbb{Z}/n\mathbb{Z}$
with $G$ one-to-one, and turns addition of exponents into multiplication: $g^{j +
k} = g^j g^k$. So as abstract groups, the units modulo 13, the twelfth roots of
unity in the complex plane, and the hours on a clock are the same group.

This is the most important "but" in public-key cryptography. As abstract
groups, $\langle g \rangle$ modulo a large prime and $\mathbb{Z}/q\mathbb{Z}$ are
identical. In $\mathbb{Z}/q\mathbb{Z}$ the discrete logarithm is trivial (the
"logarithm" of $k$ is $k$). In $\langle g \rangle$ it is believed hard. The
difference is not in the group but in how its elements are *written down*: going
from the name $g^k$ back to the name $k$ is the hard direction of the
isomorphism. A group for cryptography is a group *together with a
representation* in which the isomorphism to $\mathbb{Z}/q\mathbb{Z}$ is hard to
compute.

**The orders of powers.** If $\operatorname{ord}(g) = n$ then $\operatorname{ord}(g^k)
= n / \gcd(n, k)$. (Proof: $(g^k)^m = 1$ exactly when $n \mid km$, that is, when
$n/\gcd(n, k)$ divides $m$.) So a cyclic group of order $n$ has exactly
$\varphi(n)$ generators, the $g^k$ with $\gcd(k, n) = 1$; modulo 13 there are
$\varphi(12) = 4$ primitive roots, 2, 6, 7 and 11.

## 7.4 Subgroups, cosets and Lagrange's theorem

*Level: beginner.*

A **subgroup** of $G$ is a subset $H$ that is itself a group under the same
operation. For a finite nonempty subset, closure is enough: if $H$ is closed,
then for $a \in H$ the powers of $a$ stay in $H$, and since $a^{\operatorname{ord}(a)}
= 1$, both 1 and $a^{-1} = a^{\operatorname{ord}(a) - 1}$ are in $H$.

Examples: the even numbers in $\mathbb{Z}$; $\{0, 4, 8\}$ in $\mathbb{Z}/12
\mathbb{Z}$; the squares modulo $p$ (Chapter 5), which form the subgroup of
index 2 in the units; the three rotations in $S_3$; the cyclic subgroup
$\langle a \rangle$ of any element.

### Cosets

Given a subgroup $H$ and an element $g$, the **coset** $gH$ is $\{gh : h \in
H\}$, "$H$ shifted by $g$".

**Lemma.** The cosets of $H$ split $G$ into disjoint pieces, all the same size
as $H$.

*Proof.* Every $g$ is in its own coset, since $g = g \cdot 1$. Each coset has
$|H|$ elements, because $h \mapsto gh$ is one-to-one by cancellation. Two cosets
are either equal or disjoint: if $x \in g_1 H \cap g_2 H$, then $x = g_1 h_1 = g_2
h_2$, so $g_1 = g_2 h_2 h_1^{-1} \in g_2 H$, and then $g_1 H \subseteq g_2 H$ (as
$g_1 h = g_2 (h_2 h_1^{-1} h)$), and by symmetry the two are equal.
$\blacksquare$

```python
def cosets(G, H, op):
    seen, out = set(), []
    for g in G:
        if g not in seen:
            C = sorted({op(g, h) for h in H})
            out.append(C)
            seen.update(C)
    return out

G = list(range(1, 13))
H = generated(3, mul13, 1)
for C in cosets(G, H, mul13):
    print(C)
```

```text
[1, 3, 9]
[2, 5, 6]
[4, 10, 12]
[7, 8, 11]
```

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="The twelve units modulo 13 split into four cosets of the subgroup 1, 3, 9: rows 1 3 9, 2 5 6, 4 10 12, 7 8 11, each of size three" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="40" y="30" width="560" height="160" rx="10"/>
<rect x="60" y="45" width="520" height="30" rx="6" class="acc"/>
<rect x="60" y="80" width="520" height="30" rx="6"/>
<rect x="60" y="115" width="520" height="30" rx="6"/>
<rect x="60" y="150" width="520" height="30" rx="6"/>
</g>
<g text-anchor="middle">
<text x="130" y="65" class="acc-fill">H = 1H</text><text x="300" y="65" class="acc-fill">1</text><text x="400" y="65" class="acc-fill">3</text><text x="500" y="65" class="acc-fill">9</text>
<text x="130" y="100">2H</text><text x="300" y="100">2</text><text x="400" y="100">6</text><text x="500" y="100">5</text>
<text x="130" y="135">4H</text><text x="300" y="135">4</text><text x="400" y="135">12</text><text x="500" y="135">10</text>
<text x="130" y="170">7H</text><text x="300" y="170">7</text><text x="400" y="170">8</text><text x="500" y="170">11</text>
</g>
<text x="320" y="20" text-anchor="middle">(ℤ/13ℤ)*, twelve units, split by H = ⟨3⟩</text>
</svg>
<figcaption>Figure 7.2. Cosets of H = ⟨3⟩ = {1, 3, 9} in the units modulo 13. Each row is H multiplied by one element. The rows do not overlap and have the same size, so 3 divides 12: Lagrange's theorem in one picture.</figcaption>
</figure>

### Lagrange's theorem

**Theorem (Lagrange).** If $H$ is a subgroup of a finite group $G$, then $|H|$
divides $|G|$.

*Proof.* By the lemma, $G$ is a disjoint union of cosets, each of size $|H|$.
If there are $m$ of them, $|G| = m|H|$. $\blacksquare$

The number $m = |G|/|H|$ is the **index** of $H$. Three corollaries carry most of
the weight in this book:

1. **The order of every element divides $|G|$**, since it is the order of the
   subgroup the element generates.
2. **$a^{|G|} = 1$ for every $a \in G$.** For the units modulo $n$ this is
   Euler's theorem $a^{\varphi(n)} \equiv 1$, and for $n = p$ prime it is Fermat's
   little theorem: Chapter 4's theorems are special cases.
3. **A group of prime order $q$ is cyclic, and every element other than 1
   generates it**, because the order of such an element divides $q$ and is not 1.

The third corollary is why cryptographers love prime-order groups. There are no
subgroups to hide in except $\{1\}$ and the whole group, so every non-identity
element is as good as any other.

The converse of Lagrange is false: a group of order $n$ need not have a subgroup
of every order dividing $n$ (the 12 even permutations of four objects have no
subgroup of order 6). For cyclic groups it is true, and there is exactly one
subgroup of each order $d \mid n$, namely $\langle g^{n/d} \rangle$.

!!! note "Life story: Lagrange's theorem"
    **Born:** 1771, in Joseph-Louis Lagrange's study of how many values a
    polynomial in the roots of an equation can take under permutations, long
    before groups had a name; Évariste Galois named groups around 1830, Arthur
    Cayley gave the abstract definition in 1854, and Camille Jordan proved the
    theorem in its modern form · **Purpose:** the size of a part divides the
    size of the whole · **Helped:** Fermat's and Euler's theorems, the
    correctness of RSA, the Pohlig-Hellman algorithm, and every cofactor
    calculation on elliptic curves · **Status:** the first theorem of every
    algebra course

## 7.5 Homomorphisms and isomorphisms

*Level: intermediate.*

A **homomorphism** from a group $G$ to a group $K$ is a map $f$ that respects the
operation: $f(ab) = f(a)f(b)$. It then sends the identity to the identity and
inverses to inverses. Its **kernel** is the set of elements sent to the identity,
and its **image** is the set of values. An **isomorphism** is a homomorphism that
is one-to-one and onto; then $G$ and $K$ are **isomorphic**, written $G \cong K$:
the same group with different names.

Examples cryptographers use:

- **Exponentiation.** For $g$ of order $n$, $f(k) = g^k$ from $(\mathbb{Z}/n
  \mathbb{Z}, +)$ to $\langle g \rangle$ is an isomorphism. Its inverse is the
  discrete logarithm.
- **The CRT.** $x \mapsto (x \bmod 3, x \bmod 5)$ is an isomorphism from
  $\mathbb{Z}/15\mathbb{Z}$ to $\mathbb{Z}/3\mathbb{Z} \times \mathbb{Z}/5
  \mathbb{Z}$, and for units it gives $(\mathbb{Z}/pq\mathbb{Z})^* \cong
  (\mathbb{Z}/p\mathbb{Z})^* \times (\mathbb{Z}/q\mathbb{Z})^*$ (Chapter 3).
- **The Legendre symbol.** $a \mapsto \left(\frac{a}{p}\right)$ is a
  homomorphism from the units mod $p$ to $\{+1, -1\}$, with the squares as its
  kernel (Chapter 5).
- **RSA.** $x \mapsto x^e \bmod N$ is a homomorphism of the units, since $(xy)^e
  = x^e y^e$. That is RSA's famous malleability: anyone can multiply two
  ciphertexts to get the encryption of the product. Unpadded RSA signatures can
  be forged this way, which is one reason RSA is always used with padding
  (*The cryptography book*, Chapter 13).
- **The determinant**, from invertible matrices to nonzero numbers, since
  $\det(AB) = \det A \det B$.

```python
# The CRT map Z/15 -> Z/3 x Z/5 is an isomorphism of additive groups.
phi = {x: (x % 3, x % 5) for x in range(15)}
print(len(set(phi.values())) == 15)
print(all(phi[(x + y) % 15] == ((phi[x][0] + phi[y][0]) % 3, (phi[x][1] + phi[y][1]) % 5)
          for x in range(15) for y in range(15)))
# The exponential map x -> 2^x is a homomorphism from Z/12 (addition) to (Z/13)^* (multiplication).
print(all(pow(2, (x + y) % 12, 13) == pow(2, x, 13) * pow(2, y, 13) % 13
          for x in range(12) for y in range(12)))
```

```text
True
True
True
```

**The first isomorphism theorem**, in the form needed here: if $f: G \to K$ is
a homomorphism of finite groups, then $|G| = |\ker f| \cdot |\operatorname{im}
f|$. (The cosets of the kernel are exactly the sets on which $f$ is constant, one
for each value.) For example, the squaring map on the units modulo an odd prime
has kernel $\{\pm 1\}$, so its image, the squares, has $(p-1)/2$ elements:
Chapter 5's count in one line.

**Homomorphisms leak.** A homomorphism from a cryptographic group onto a small
group computes some property of every element for free. The Legendre symbol is
the standard example: it maps the units mod $p$ onto $\{\pm 1\}$ and reveals
whether a discrete logarithm is even. Pohlig-Hellman (Chapter 4) is a systematic
use of the homomorphisms $x \mapsto x^{(p-1)/r}$ onto the subgroups of small
prime order $r$. A group of prime order $q$ has no nontrivial homomorphism onto
any smaller group, since the kernel would be a subgroup of size other than 1 and
$q$. Once again: prime order is safe.

## 7.6 The structure of finite abelian groups

*Level: intermediate.*

Which abelian groups are there? The answer is complete and simple.

**Theorem (Kronecker, 1870; Frobenius and Stickelberger, 1878).** Every finite
abelian group is isomorphic to a product of cyclic groups,

$$G \cong \mathbb{Z}/n_1\mathbb{Z} \times \mathbb{Z}/n_2\mathbb{Z} \times \dots
\times \mathbb{Z}/n_r\mathbb{Z}, \qquad n_1 \mid n_2 \mid \dots \mid n_r,$$

and the numbers $n_i$ (the **invariant factors**) are determined by $G$.

The largest, $n_r$, is the **exponent** of $G$: the smallest $m$ with $a^m = 1$
for every $a$, and also the largest order of any element. The group is cyclic
exactly when $r = 1$. By the CRT, each $\mathbb{Z}/n\mathbb{Z}$ also splits into
cyclic groups of prime-power order, so another form of the theorem says $G$ is a
product of cyclic groups of prime-power orders.

We will not prove it here (it is a careful induction; see Further reading), but
we will use it, mostly through this consequence:

**Every finite abelian group is the product of its Sylow subgroups**, one for
each prime $r$ dividing $|G|$: the elements whose order is a power of $r$. This
is exactly the splitting used by Pohlig-Hellman, and exactly the splitting an
attacker uses in §7.10.

### The units modulo $n$

Gauss found the structure of $(\mathbb{Z}/n\mathbb{Z})^*$. By the CRT it is the
product of the groups for the prime powers in $n$, and:

- for an odd prime $p$, $(\mathbb{Z}/p^k\mathbb{Z})^*$ is cyclic of order
  $p^{k-1}(p-1)$;
- $(\mathbb{Z}/2\mathbb{Z})^*$ and $(\mathbb{Z}/4\mathbb{Z})^*$ are cyclic, but for
  $k \ge 3$, $(\mathbb{Z}/2^k\mathbb{Z})^* \cong \mathbb{Z}/2\mathbb{Z} \times
  \mathbb{Z}/2^{k-2}\mathbb{Z}$, generated by $-1$ and $5$.

So $(\mathbb{Z}/n\mathbb{Z})^*$ is cyclic, that is, primitive roots exist, exactly
when $n$ is 1, 2, 4, $p^k$ or $2p^k$. The exponent of the group is Carmichael's
$\lambda(n)$ from Chapter 4.

```python
from math import gcd

def units(n):
    return [a for a in range(1, n) if gcd(a, n) == 1]

def order(a, n):
    x, k = a % n, 1
    while x != 1:
        x, k = x * a % n, k + 1
    return k

for n in (8, 15, 16, 21, 24):
    U = units(n)
    print(n, len(U), sorted(set(order(a, n) for a in U)), max(order(a, n) for a in U))
```

```text
8 4 [1, 2] 2
15 8 [1, 2, 4] 4
16 8 [1, 2, 4] 4
21 12 [1, 2, 3, 6] 6
24 8 [1, 2] 2
```

Read the last column as the exponent. The units mod 8 have four elements but no
element of order 4: $(\mathbb{Z}/8\mathbb{Z})^* \cong \mathbb{Z}/2 \times
\mathbb{Z}/2$, the right-hand group of Figure 7.1 in another disguise. Mod 15
there are 8 units and exponent 4, so $\mathbb{Z}/2 \times \mathbb{Z}/4$. Mod 21,
$\mathbb{Z}/2 \times \mathbb{Z}/6$. Mod 24, three copies of $\mathbb{Z}/2$.

**Why RSA cares.** The units modulo $N = pq$ are never cyclic, since both
$p - 1$ and $q - 1$ are even. Their exponent $\lambda(N) =
\operatorname{lcm}(p-1, q-1)$ is what RSA decryption really needs ($ed \equiv 1
\pmod{\lambda(N)}$, Chapter 4), and knowing the group's order $\varphi(N)$, or
its exponent, is as hard as factoring $N$. RSA is a group of *unknown order*;
Diffie-Hellman uses groups of *known* order. That difference is why RSA can have
a trapdoor and Diffie-Hellman cannot.

## 7.7 The discrete logarithm and Diffie-Hellman problems

*Level: intermediate.*

Fix a cyclic group $G = \langle g \rangle$ of order $q$, usually prime. Three
problems, from hardest to easiest:

- **Discrete logarithm (DL).** Given $h = g^x$, find $x$.
- **Computational Diffie-Hellman (CDH).** Given $g^a$ and $g^b$, find $g^{ab}$.
- **Decisional Diffie-Hellman (DDH).** Given $g^a$, $g^b$ and $Z$, decide whether
  $Z = g^{ab}$ or $Z$ is a random group element.

If you can solve DL, you can solve CDH (find $a$, then compute $(g^b)^a$). If you
can solve CDH, you can solve DDH (compute $g^{ab}$ and compare). So DDH is the
strongest *assumption*: assuming it is hard is assuming the most. Diffie and
Hellman's 1976 paper needs CDH for the eavesdropper not to learn the key; but to
use $g^{ab}$ as a key, protocols need that it *looks random*, which is DDH (or,
with a hash function in between, CDH in the random-oracle model).

For the groups used in practice, the best known way to solve CDH is to solve DL.
Ueli Maurer and Stefan Wolf proved in the 1990s that for many groups, CDH and DL
are equivalent, under conditions on the group order. DDH is different: there
are groups where it is easy while CDH still seems hard.

### Where DDH fails

The units modulo a prime $p$, generated by a primitive root, are the textbook
case. The Legendre symbol of $g^x$ is $(-1)^x$, so from $A = g^a$ and $B = g^b$
anyone learns whether $a$ and $b$ are even, hence whether $ab$ is even, hence the
Legendre symbol that $g^{ab}$ must have. A random $Z$ has the right symbol only
half the time.

```python
import random
# Safe prime p = 2q + 1; the squares form the subgroup of prime order q.
p = 2027                        # q = 1013 is prime
q = (p - 1) // 2
g = 4                           # a square, so of order q

def legendre(a):
    s = pow(a, (p - 1) // 2, p)
    return -1 if s == p - 1 else s

rng = random.Random(3)
# In the full group with a generator, DDH fails: the Legendre symbol leaks parity.
G = 2                           # a primitive root mod 2027
hits = 0
for _ in range(1000):
    a, b = rng.randrange(p - 1), rng.randrange(p - 1)
    real = rng.random() < 0.5
    Z = pow(G, a * b, p) if real else pow(G, rng.randrange(p - 1), p)
    A, B = pow(G, a, p), pow(G, b, p)
    guess = (legendre(Z) == 1) == (legendre(A) == 1 or legendre(B) == 1)
    hits += guess == real
print(order(2, p) == p - 1, hits)
print(all(legendre(pow(g, x, p)) == 1 for x in range(q)))
```

```text
True 758
True
```

The distinguisher is right 758 times in 1,000, against 500 for guessing: it
always accepts a real triple, and rejects a random one half the time, for 75
percent. In the subgroup of squares, of prime order $q = 1013$, every element has
Legendre symbol $+1$ (the last line), and the leak is gone. This is why DSA,
Diffie-Hellman in TLS, and every DDH-based proof use a prime-order subgroup,
typically the squares modulo a **safe prime** $p = 2q + 1$.

DDH is also easy in groups with a **pairing** (Chapter 13): a map $e$ with
$e(g^a, g^b) = e(g, g)^{ab}$ turns the DDH question into checking $e(g^a, g^b) =
e(g, Z)$. On such curves CDH is believed hard and DDH is easy, and protocols
built on them use that deliberately.

## 7.8 The generic group model and Shoup's bound

*Level: intermediate.*

How hard can the discrete logarithm be? It depends on the representation:
in $(\mathbb{Z}/q\mathbb{Z}, +)$ it is free; modulo a prime, index calculus
solves it in subexponential time (*Cryptanalysis*, chapter 12); on good elliptic
curves nothing better than about $\sqrt q$ operations is known. Victor Shoup
(1997), building on Vasilii Nechaev (1994), proved that $\sqrt q$ is the best
possible for any algorithm that does not look at the representation.

A **generic algorithm** sees group elements only as random labels (an "oracle"
gives a fresh random string for each element) and can only ask the oracle to
multiply two labeled elements or invert one. It cannot, for example, look at the
digits of a residue mod $p$ the way index calculus does.

**Theorem (Shoup, 1997).** Let $G$ be cyclic of prime order $q$. A generic
algorithm that makes $m$ group operations finds $x$ from $g^x$, for random $x$,
with probability at most about $m^2 / q$.

*Proof sketch.* Every label the algorithm has seen is of the form $g^{a + bx}$ for
known integers $a, b$, since it started with $g$ and $g^x$ and can only multiply
and invert. Run the algorithm with $x$ left as an unknown symbol, keeping each
label's polynomial $a + bX$. The algorithm learns something only if two
different polynomials happen to name the same element, that is, $a + bx \equiv a'
+ b'x \pmod q$ for the secret $x$; otherwise all it sees is fresh random labels,
which it could have generated itself. For each pair, this is a linear equation
in $x$, true for at most one value of $x$ out of $q$. There are at most $m^2/2$
pairs, so the chance of any collision is at most $m^2 / (2q)$. Without a
collision, the algorithm can do no better than guess $x$, with probability $1/q$.
$\blacksquare$

So succeeding with probability $1/2$ needs about $\sqrt{q/2}$ operations. For a
256-bit group order that is about $2^{128}$, which is why a 256-bit elliptic curve
is said to have **128-bit security**. If $q$ is composite, the same argument
applies to its largest prime factor $r$, and the bound becomes $\sqrt r$: the
group is only as strong as its largest prime-order piece (Pohlig-Hellman shows
this is tight).

The bound is an existence statement about a model. Real groups are not generic:
in $(\mathbb{Z}/p\mathbb{Z})^*$ the representation helps the attacker
enormously. Elliptic curves are the closest thing known to generic groups, which
is the main reason they are used.

### Baby-step giant-step

Daniel Shanks's algorithm (1971) meets Shoup's bound. Let $m = \lceil \sqrt q
\rceil$ and write the unknown $x = im + j$ with $0 \le i, j < m$. Then $g^x = h$
becomes $g^j = h \cdot (g^{-m})^i$. Compute and store the **baby steps** $g^j$
for every $j$, then walk the **giant steps** $h, hg^{-m}, hg^{-2m}, \dots$ until
one lands in the table.

```python
from math import isqrt

def bsgs(g, h, p, q):
    """Find x in [0, q) with g^x = h mod p, where g has order q. About 2*sqrt(q) steps."""
    m = isqrt(q) + 1
    baby = {}
    x = 1
    for j in range(m):                       # baby steps: g^j
        baby.setdefault(x, j)
        x = x * g % p
    giant = pow(g, -m, p)                    # g^(-m)
    y = h
    for i in range(m):                       # giant steps: h * g^(-im)
        if y in baby:
            return i * m + baby[y]
        y = y * giant % p
    return None

p = 1_000_003
g = 2
q = order(g, p)
print(q, bsgs(g, pow(g, 777777, p), p, q))
```

```text
1000002 777777
```

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Baby-step giant-step on a line from 0 to q: baby steps fill the first stretch of length m one by one, giant steps jump back from x by m at a time until they land inside the baby-step stretch" fill="currentColor" font-size="13">
<line x1="30" y1="110" x2="610" y2="110" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="135" text-anchor="middle">0</text><text x="610" y="135" text-anchor="middle">q</text>
<g class="soft-acc"><rect x="30" y="98" width="70" height="24"/></g>
<g class="acc-fill">
<circle cx="37" cy="110" r="3"/><circle cx="44" cy="110" r="3"/><circle cx="51" cy="110" r="3"/><circle cx="58" cy="110" r="3"/><circle cx="65" cy="110" r="3"/><circle cx="72" cy="110" r="3"/><circle cx="79" cy="110" r="3"/><circle cx="86" cy="110" r="3"/><circle cx="93" cy="110" r="3"/>
</g>
<text x="65" y="160" text-anchor="middle" class="acc-fill">baby steps g^j, 0 ≤ j &lt; m</text>
<text x="65" y="178" text-anchor="middle" class="acc-fill" font-size="12">stored in a table</text>
<circle cx="450" cy="110" r="5"/>
<text x="450" y="90" text-anchor="middle">x</text>
<g stroke="currentColor" stroke-width="1.2" fill="none">
<path d="M450 104 Q 415 60 380 104"/><path d="M380 104 Q 345 60 310 104"/><path d="M310 104 Q 275 60 240 104"/><path d="M240 104 Q 205 60 170 104"/><path d="M170 104 Q 135 60 100 104"/><path d="M100 104 Q 85 75 72 104" class="acc"/>
</g>
<text x="290" y="45" text-anchor="middle">giant steps: h · g^(−m), h · g^(−2m), …</text>
<text x="410" y="178" text-anchor="middle" font-size="12">at most m jumps until one lands among the baby steps: x = im + j</text>
</svg>
<figcaption>Figure 7.3. Baby-step giant-step. The table holds the first m powers; the giant steps move back from the unknown x by m at a time and must land in the table within m jumps. Time and memory are both about √q.</figcaption>
</figure>

Both time and memory are about $\sqrt q$. Pollard's rho method (1978) needs the
same time but almost no memory, and is what attackers actually run; it belongs
to *Cryptanalysis*, chapter 12, with the index-calculus methods that beat
$\sqrt q$ in groups that are not generic.

## 7.9 Where groups hide in symmetric cryptography

*Level: intermediate.*

Groups are not only for public keys. A block cipher with key $k$ is a
permutation $E_k$ of its block space, an element of a huge symmetric group. If the
set of all $E_k$ were closed under composition, encrypting twice with two keys
would equal encrypting once with a third key, and double encryption would add
nothing. Worse, the meet-in-the-middle and cycle attacks of Burton Kaliski,
Ronald Rivest and Alan Sherman (1988) would apply.

Was DES a group? It was a real question for fifteen years. Keith Campbell and
Michael Wiener settled it in 1992: they found cycles in DES's behavior that
show the permutations generated by DES form a group of order at least $10^{2499}$,
far more than the $2^{56}$ keys. So DES is not closed under composition, and triple
DES (three encryptions with two or three keys) really is stronger than DES.
Their method is a nice use of Lagrange: the order of the group generated must be
divisible by the lengths of all the cycles they found.

Groups also explain why the counter in CTR mode must not repeat (the map
"add 1 mod $2^{128}$" generates a cyclic group of order $2^{128}$, and its orbit
is the whole space), and why linear feedback shift registers have periods that
divide the order of a matrix group (Chapter 9).

## 7.10 Break it: small subgroups

*Level: expert.*

Diffie-Hellman in a group whose order has small factors invites the following
attack, published by Chae Hoon Lim and Pil Joong Lee (CRYPTO 1997).

A server has a long-term secret $x$. A client sends a value $Y$, and the server
computes $K = Y^x$ and uses it, for example to authenticate its reply with a key
derived from $K$. The server is supposed to receive $Y = g^y$ in the subgroup of
prime order $q$, but does not check.

The attacker picks an element $Y_r$ of small prime order $r$ (one exists for each
prime $r$ dividing $p - 1$, by the structure of cyclic groups) and sends it. The
server's $K = Y_r^x$ lies in the tiny subgroup $\langle Y_r \rangle$, so it is one
of only $r$ values, and $K = Y_r^{x \bmod r}$. The attacker tries all $r$
possibilities against the server's reply and learns $x \bmod r$. Repeat for
every small prime factor and combine with the CRT.

```python
# Small-subgroup attack on a careless Diffie-Hellman server.
p = 2 * 3 * 5 * 7 * 11 * 13 * 17 * 19 * 23 * 1019 + 1   # p - 1 is smooth except 1019
assert all(pow(a, p - 1, p) == 1 for a in (2, 3, 5))      # a quick Fermat check
secret = random.Random(9).randrange(p - 1)

def server(Y):                       # returns Y^secret, e.g. as a MAC key it then uses
    return pow(Y, secret, p)

def element_of_order(r):
    for h in range(2, p):
        y = pow(h, (p - 1) // r, p)
        if y != 1:
            return y

residues, moduli = [], []
for r in (2, 3, 5, 7, 11, 13, 17, 19, 23):
    y = element_of_order(r)
    k = server(y)
    x = next(x for x in range(r) if pow(y, x, p) == k)   # at most r tries
    residues.append(x)
    moduli.append(r)

def crt(rs, ms):
    x, M = 0, 1
    for r, m in zip(rs, ms):
        x += M * ((r - x) * pow(M, -1, m) % m)
        M *= m
    return x, M

x, M = crt(residues, moduli)
print(p, M, secret % M == x)
```

```text
227331634531 223092870 True
```

With nine queries and at most 100 guesses, the attacker knows the server's
secret modulo 223,092,870, about 28 of its 38 bits; the remaining factor 1019
falls to a baby-step giant-step search of 32 steps. In a real 2,048-bit group
whose $p - 1$ has many factors below, say, $2^{40}$, the same method learns
hundreds of bits.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="The small-subgroup attack: the group of order p minus 1 splits into small pieces of orders 2, 3, 5 and so on up to 23 and one larger piece of order 1019; the attacker queries each small piece separately and joins the answers with the Chinese remainder theorem" fill="currentColor" font-size="13">
<text x="320" y="22" text-anchor="middle">(ℤ/pℤ)* ≅ ℤ/2 × ℤ/3 × ℤ/5 × … × ℤ/23 × ℤ/1019</text>
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="30" y="40" width="36" height="40" rx="4" class="acc"/><rect x="72" y="40" width="40" height="40" rx="4" class="acc"/><rect x="118" y="40" width="44" height="40" rx="4" class="acc"/>
<rect x="168" y="40" width="48" height="40" rx="4" class="acc"/><rect x="222" y="40" width="52" height="40" rx="4" class="acc"/><rect x="280" y="40" width="56" height="40" rx="4" class="acc"/>
<rect x="342" y="40" width="60" height="40" rx="4" class="acc"/><rect x="408" y="40" width="64" height="40" rx="4" class="acc"/><rect x="478" y="40" width="68" height="40" rx="4" class="acc"/>
<rect x="552" y="40" width="70" height="40" rx="4"/>
<path d="M320 120 L320 150"/>
<rect x="210" y="155" width="220" height="44" rx="6"/>
</g>
<g text-anchor="middle" class="acc-fill">
<text x="48" y="65">2</text><text x="92" y="65">3</text><text x="140" y="65">5</text><text x="192" y="65">7</text><text x="248" y="65">11</text><text x="308" y="65">13</text><text x="372" y="65">17</text><text x="440" y="65">19</text><text x="512" y="65">23</text>
</g>
<text x="587" y="65" text-anchor="middle">1019</text>
<text x="290" y="108" text-anchor="middle" class="acc-fill">send Y of order r, read x mod r from the reply: at most r guesses each</text>
<text x="320" y="182" text-anchor="middle">CRT: x mod 223,092,870</text>
<text x="587" y="102" text-anchor="middle" font-size="12">√1019 steps</text>
</svg>
<figcaption>Figure 7.4. The small-subgroup attack. By the structure theorem, the group splits into one piece per prime factor of its order. An unchecked server answers questions about each small piece separately, and the CRT joins the answers into most of its secret.</figcaption>
</figure>

**Fix it.** Three defenses, used in combination:

1. **Use a prime-order group.** Work in the subgroup of order $q$ modulo a safe
   prime $p = 2q + 1$; the only other subgroups have orders 1 and 2.
2. **Validate inputs.** Check that $1 < Y < p - 1$ and $Y^q \equiv 1 \pmod p$
   before using it. NIST SP 800-56A requires this check for finite-field
   Diffie-Hellman.
3. **Use ephemeral keys.** If the server's $x$ is fresh for every connection,
   learning it modulo $r$ is worthless.

In 2017 Luke Valenta, David Adrian, Antonio Sanso and colleagues measured
Diffie-Hellman on the Internet (NDSS 2017) and found many servers using groups
from RFC 5114, whose $p - 1$ has small factors, without the validation, and some
that reused exponents, making them open to exactly this attack.

## 7.11 Break it: cofactors

*Level: expert.*

Elliptic curves are rarely of prime order. Curve25519 has $8\ell$ points, where
$\ell = 2^{252} + 27742317777372353535851937790883648493$ is prime. The 8 is the
**cofactor**. The group is $\mathbb{Z}/8\mathbb{Z} \times \mathbb{Z}/\ell
\mathbb{Z}$ (it is cyclic, since 8 and $\ell$ are coprime), so it has a subgroup of
order 8 and points of order 1, 2, 4 and 8. A small-subgroup attack on the 8 can
leak the three lowest bits of a secret scalar. Ed25519 (the Edwards form of the
same curve) has the same cofactor, and Ed448 has cofactor 4.

Daniel Bernstein's design (2006) removes the leak without any check: every
secret scalar is **clamped**, its three lowest bits set to 0, so it is a multiple
of 8 and kills the small part of whatever point it multiplies. Here is the same
idea in a multiplicative group of order $8q$:

```python
# Cofactor clearing: a group of order 8*q, as on Curve25519.
q = 1013
p = 8 * q * 9 + 1          # 72937, prime; we use its subgroup of order 8*q
assert all(pow(a, p - 1, p) == 1 for a in (2, 3, 5, 7))
n = 8 * q
h = pow(5, (p - 1) // n, p)          # 5 is a primitive root mod p
print(order(h, p) == n)
low = pow(h, q, p)                       # an element of order 8: the "small" part
print(order(low, p))
k = random.Random(4).randrange(1, q)
clamped = 8 * k                          # secret scalar is a multiple of 8
print(pow(low, clamped, p))              # the small-order part is killed: always 1
```

```text
True
8
1
```

An unclamped secret $k$ would answer a query with `low` by revealing $k \bmod 8$;
the clamped one always answers 1.

**Where cofactors still bite.** Clamping fixes Diffie-Hellman, but protocols that
need *one* canonical name for each element can still go wrong, because $P$ and
$P + T$, for $T$ of small order, behave the same after clamping but are different
points. In 2017 the Monero project disclosed a bug in the CryptoNote protocol
on which it was built: a "key image" meant to mark a coin as spent could be
varied by adding a point of small order, so the same coin could be spent several
times. It was fixed by checking that key images lie in the prime-order subgroup
(multiply by $\ell$ and check for the identity), but not before it was exploited
in at least one other CryptoNote currency. Ed25519 signature verification has a
related wrinkle: implementations disagree on whether to multiply the verification
equation by 8, so a few signatures verify in one library and fail in another,
which matters for consensus systems.

**Fix it: prime-order groups on top.** Mike Hamburg's Decaf (2015) and the
Ristretto design (Henry de Valence, Jack Grigg, Hamburg, Isis Lovecruft, George
Tankersley and Filippo Valsorda wrote the standard) build a group of prime order $\ell$ from Curve25519 by giving each
coset of the small subgroup one canonical encoding. Protocols then see a
prime-order group, as the theory of this chapter wants. Ristretto255 and Decaf448
are specified in RFC 9496 (2023).

!!! note "Life story: the cofactor"
    **Born:** with elliptic curves of composite order; Curve25519 (2006) chose
    cofactor 8 so that the curve could have fast and safe Montgomery and Edwards
    forms, which a prime-order curve cannot have · **Purpose:** buy speed and
    complete formulas at the price of a small subgroup · **Helped:** X25519 and
    Ed25519 became two of the most widely deployed curves, in TLS, SSH, Signal
    and WireGuard · **Status:** safe for Diffie-Hellman with clamping;
    a recurring trap in more complex protocols; Ristretto hides it

## Check yourself

??? question "1. Is the set $\{1, 2, 3, 4\}$ under multiplication mod 5 a group? Under multiplication mod 6, is $\{1, 2, 3, 4, 5\}$?"

    Mod 5, yes: it is the units modulo a prime. Mod 6, no: $2 \cdot 3 = 6 \equiv 0$
    is not in the set, and 2 has no inverse.

??? question "2. Find the order of 3 and of 10 in the units modulo 11."

    $3^1 = 3$, $3^2 = 9$, $3^3 = 27 \equiv 5$, $3^4 = 15 \equiv 4$, $3^5 = 12
    \equiv 1$: order 5. $10 = -1$, so $10^2 = 1$: order 2.

??? question "3. List all subgroups of $\mathbb{Z}/12\mathbb{Z}$ under addition."

    One for each divisor of 12: $\{0\}$, $\{0, 6\}$, $\{0, 4, 8\}$, $\{0, 3, 6,
    9\}$, $\{0, 2, 4, 6, 8, 10\}$ and the whole group.

??? question "4. Use Lagrange's theorem to show that a group of order 35 has no element of order 6."

    The order of an element divides 35, and 6 does not divide 35.

??? question "5. How many generators does a cyclic group of order 100 have?"

    $\varphi(100) = 40$.

??? question "6. Show that $x \mapsto x^2$ is a homomorphism of an abelian group, and find its kernel in the units mod 15."

    $(xy)^2 = x^2y^2$ because the group is abelian. The kernel is the $x$ with
    $x^2 \equiv 1 \pmod{15}$: 1, 4, 11 and 14.

??? question "7. Why does the Legendre symbol not leak anything in the subgroup of squares modulo a safe prime?"

    Every element of that subgroup is a square, so its Legendre symbol is always
    $+1$: the symbol is constant and carries no information.

??? question "8. A group has order $2^{255}$ and a discrete logarithm is wanted. Is it hard?"

    No. Pohlig-Hellman reduces it to 255 logarithms in a group of order 2, one
    per bit. A prime-power order with a small prime is as weak as smooth order.

??? question "9. With baby-step giant-step on a group of order $2^{80}$, roughly how much memory is needed?"

    About $2^{40}$ table entries, a trillion; with, say, 16 bytes each, about 18
    terabytes. That is why attackers prefer Pollard's rho.

??? question "10. Why does clamping (a scalar that is a multiple of 8) stop the small-subgroup attack on Curve25519?"

    The small subgroup has order 8, so a multiple of 8 sends every element of
    it to the identity; the server's answer then carries no information about
    the secret's low bits.

## What you learned

- A group is a set with an associative operation, an identity and inverses.
  Clocks, units mod $n$, permutations, matrices and curve points are all groups.
- The order of an element is the size of the cyclic subgroup it generates.
  Lagrange: subgroup sizes divide the group size, so $a^{|G|} = 1$; Fermat and
  Euler are special cases.
- A group of prime order is cyclic, has no proper subgroups, and every
  non-identity element generates it.
- All cyclic groups of order $n$ are isomorphic; cryptography lives in the
  representation, where the isomorphism with $\mathbb{Z}/n\mathbb{Z}$ is the
  discrete logarithm.
- Finite abelian groups are products of cyclic groups; the units mod $n$ are
  cyclic only for $n = 1, 2, 4, p^k, 2p^k$; RSA works in a group of unknown order.
- DL is at least as hard as CDH, which is at least as hard as DDH. DDH fails in
  the full group mod $p$ and in pairing groups.
- Generic algorithms need about $\sqrt q$ operations (Shoup); baby-step
  giant-step reaches that bound.
- Small subgroups leak secrets; cofactors must be cleared or hidden. Prime-order
  groups and input validation are the cures.

**Next:** [Chapter 8](08-Rings-Fields-and-Polynomials.md), which adds a second
operation and builds the finite fields used by AES, GCM and every elliptic curve.

## Further reading

- Joseph Gallian, *Contemporary Abstract Algebra*, 10th edition (CRC Press,
  2021), chapters 2 to 11: groups with many examples.
- I. N. Herstein, *Topics in Algebra*, 2nd edition (Wiley, 1975), chapter 2,
  including the structure theorem for finite abelian groups.
- Steven Galbraith, *Mathematics of Public Key Cryptography* (Cambridge, 2012),
  chapters 2, 13 and 21, free online from the author.
- Whitfield Diffie and Martin Hellman, "New Directions in Cryptography", *IEEE
  Transactions on Information Theory* 22 (1976).
- Dan Boneh, "The Decision Diffie-Hellman Problem", ANTS-III (1998).
- Victor Shoup, "Lower Bounds for Discrete Logarithms and Related Problems",
  EUROCRYPT 1997.
- Ueli Maurer and Stefan Wolf, "The Diffie-Hellman Protocol", *Designs, Codes and
  Cryptography* 19 (2000).
- Chae Hoon Lim and Pil Joong Lee, "A Key Recovery Attack on Discrete Log-based
  Schemes Using a Prime Order Subgroup", CRYPTO 1997.
- Keith Campbell and Michael Wiener, "DES Is Not a Group", CRYPTO 1992.
- Luke Valenta and others, "Measuring Small Subgroup Attacks Against
  Diffie-Hellman", NDSS 2017.
- Daniel Bernstein, "Curve25519: New Diffie-Hellman Speed Records", PKC 2006.
- RFC 9496, The ristretto255 and decaf448 Groups (2023).
- In *The cryptography book*: [Chapter 12](../../book/12-Diffie-Hellman.md) and
  [Chapter 14](../../book/14-Discrete-Log-Systems.md).
