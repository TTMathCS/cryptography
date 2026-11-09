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
    - where groups came from, and why every group is a group of permutations;
    - orders of elements, cyclic groups, and how many generators there are;
    - subgroups, cosets and Lagrange's theorem, with proof;
    - homomorphisms, isomorphisms and quotient groups, and why "the same
      group" can be easy in one disguise and hard in another;
    - why RSA and ElGamal are homomorphisms, and why that makes them malleable;
    - the structure of finite abelian groups, Sylow's theorems, and the units
      modulo an RSA modulus taken apart by hand and by machine;
    - the discrete logarithm, CDH and DDH problems, and when DDH fails;
    - the generic group model, Shoup's $\sqrt q$ lower bound, baby-step
      giant-step, and Pohlig-Hellman digit by digit;
    - small-subgroup attacks, safe-prime groups, cofactors, Curve25519's
      clamping and prime-order groups built on top of it;
    - group actions, the orbit-stabilizer theorem, and the "hard homogeneous
      spaces" behind isogeny cryptography.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (units modulo $n$,
    the CRT), [Chapter 4](04-Powers-and-Primitive-Roots.md) (orders and
    primitive roots) and, for §7.7, [Chapter 5](05-Square-Roots-Mod-p.md)
    (the Legendre symbol).

    **Levels:** §7.1 to §7.4 are for beginners, §7.5 to §7.9 are
    intermediate, §7.10 to §7.13 are expert.

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

### Every group is a group of permutations

Fix $a$ and look at the map $\lambda_a(x) = ax$. By cancellation it is
one-to-one, and it is onto ($a^{-1}y \mapsto y$), so it is a permutation of $G$;
and $\lambda_a \circ \lambda_b = \lambda_{ab}$, since $a(bx) = (ab)x$.

**Theorem (Cayley, 1854).** Every group $G$ is isomorphic to a group of
permutations of the set $G$, by $a \mapsto \lambda_a$.

*Proof.* The map respects the operation, as just shown, and it is one-to-one:
if $\lambda_a = \lambda_b$ then $a = \lambda_a(1) = \lambda_b(1) = b$.
$\blacksquare$

The row of $a$ in a group table *is* $\lambda_a$ written out. In Figure 7.1 the
row of 5 on the right reads 5, 1, 11, 7: it swaps 1 with 5 and 7 with 11. So a
group of order $n$ always sits inside $S_n$, and asking whether a block cipher's
permutations form a group (§7.9) is asking about a subset of $S_{2^{128}}$.

### Where groups came from

The idea is older than the word. In 1770 and 1771 Joseph-Louis Lagrange studied
why equations of degree up to 4 can be solved by radicals, by counting how many
values an expression in the roots takes when the roots are permuted; the count
always divided the number of permutations, the seed of his theorem. Paolo Ruffini
(1799) and Niels Henrik Abel (1824) then showed that the general quintic has no
such formula.

Évariste Galois found the reason. Between 1829 and 1832 he attached to each
equation the permutations of its roots that preserve every algebraic relation
among them, called them a *groupe*, and showed that the equation is solvable by
radicals exactly when this group breaks down through a chain of normal subgroups
with abelian steps. The Paris Academy turned his memoir down in 1831 as unclear.
On the night of 29 May 1832 he summarized his results in a letter to Auguste
Chevalier; he was shot in a duel the next morning and died on 31 May, aged 20.
Joseph Liouville published his papers in 1846.

Arthur Cayley's 1854 paper "On the theory of groups, as depending on the symbolic
equation $\theta^n = 1$" defined a group by its operation alone, wrote out the
first group tables and proved the theorem above. Camille Jordan's *Traité des
substitutions* (1870) and Ludwig Sylow's theorems (1872, §7.6) followed, and in
1882 Walther von Dyck and Heinrich Weber gave definitions close to ours.
Cryptography arrived a century later: Diffie and Hellman (1976) used the
multiplicative group modulo a prime, and in 1985 Neal Koblitz and Victor Miller
independently proposed elliptic-curve groups.

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

### Counting elements of each order

The same formula counts every order, not only the largest.

**Theorem.** In a cyclic group of order $n$, for each divisor $d$ of $n$ there
are exactly $\varphi(d)$ elements of order $d$, and no element has an order that
does not divide $n$.

*Proof.* Write the elements as $g^k$, $0 \le k < n$. By the formula above,
$g^k$ has order $d$ exactly when $\gcd(n, k) = n/d$, that is, when $k = (n/d)j$
with $0 \le j < d$ and $\gcd(j, d) = 1$. There are $\varphi(d)$ such $j$.
$\blacksquare$

Since every element has exactly one order, adding up over the divisors gives
Gauss's identity

$$\sum_{d \mid n} \varphi(d) = n.$$

*By hand*, modulo 13 with $g = 2$. The powers of 2 are 2, 4, 8, 3, 6, 12, 11, 9,
5, 10, 7, 1 for $k = 1, \dots, 12$. The order of $2^k$ is $12/\gcd(12, k)$:

| order $d$ | $\varphi(d)$ | elements |
| --- | --- | --- |
| 1 | 1 | 1 |
| 2 | 1 | 12 |
| 3 | 2 | 3, 9 |
| 4 | 2 | 5, 8 |
| 6 | 2 | 4, 10 |
| 12 | 4 | 2, 6, 7, 11 |

and $1 + 1 + 2 + 2 + 2 + 4 = 12$.

**How lucky is a random element?** The chance that a random element of a cyclic
group of order $n$ generates it is

$$\frac{\varphi(n)}{n} = \prod_{r \mid n} \left(1 - \frac1r\right),$$

over the distinct primes $r$ dividing $n$. For the units modulo a safe prime it
is just under one half; for $p = 8101$, with $p - 1 = 2^2 \cdot 3^4 \cdot 5^2$, it
is $\frac12 \cdot \frac23 \cdot \frac45 = \frac{4}{15}$, or 2,160 generators; in a
group of prime order it is everything but the identity. To test a candidate,
check $g^{n/r} \ne 1$ for each prime $r \mid n$: a proper divisor of $n$ divides
some $n/r$.

```python
# Uses generated() and mul13 from the listing above.
from collections import Counter
print(sorted(Counter(len(generated(a, mul13, 1)) for a in range(1, 13)).items()))

def is_generator(g, p, primes):          # primes: the prime factors of p - 1
    return all(pow(g, (p - 1) // r, p) != 1 for r in primes)

p = 8101                                 # p - 1 = 2^2 * 3^4 * 5^2
print(sum(is_generator(g, p, (2, 3, 5)) for g in range(1, p)))
```

It prints the pairs (order, how many) and the number of generators:

```text
[(1, 1), (2, 1), (3, 2), (4, 2), (6, 2), (12, 4)]
2160
```

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

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The squaring map on the twelve units modulo 13: the elements come in six pairs x and minus x, each pair goes to one square, giving the six squares 1, 4, 9, 3, 12, 10; the pair 1 and 12 is the kernel" fill="currentColor" font-size="14">
<text x="320" y="20" text-anchor="middle">x ↦ x² on (ℤ/13ℤ)*: twelve elements, six values</text>
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="20" y="40" width="90" height="36" rx="6" fill="currentColor" fill-opacity=".12"/>
<rect x="122" y="40" width="90" height="36" rx="6"/>
<rect x="224" y="40" width="90" height="36" rx="6"/>
<rect x="326" y="40" width="90" height="36" rx="6"/>
<rect x="428" y="40" width="90" height="36" rx="6"/>
<rect x="530" y="40" width="90" height="36" rx="6"/>
<path d="M65 76 L65 140"/><path d="M167 76 L167 140"/><path d="M269 76 L269 140"/>
<path d="M371 76 L371 140"/><path d="M473 76 L473 140"/><path d="M575 76 L575 140"/>
<circle cx="65" cy="160" r="18" fill="currentColor" fill-opacity=".12"/><circle cx="167" cy="160" r="18"/><circle cx="269" cy="160" r="18"/>
<circle cx="371" cy="160" r="18"/><circle cx="473" cy="160" r="18"/><circle cx="575" cy="160" r="18"/>
</g>
<g text-anchor="middle">
<text x="65" y="63">1, 12</text><text x="167" y="63">2, 11</text><text x="269" y="63">3, 10</text>
<text x="371" y="63">4, 9</text><text x="473" y="63">5, 8</text><text x="575" y="63">6, 7</text>
<text x="65" y="165">1</text><text x="167" y="165">4</text><text x="269" y="165">9</text>
<text x="371" y="165">3</text><text x="473" y="165">12</text><text x="575" y="165">10</text>
<text x="65" y="205" font-size="12">kernel {±1}</text>
<text x="370" y="212" font-size="12" fill-opacity=".7">each box is a coset x·{±1}; the circles are the image, the six squares</text>
</g>
</svg>
<figcaption>Figure 7.3. The first isomorphism theorem for the squaring map modulo 13. The elements sent to the same square form a coset of the kernel {1, 12}, so 12 = 2 · 6: the size of the group is the size of the kernel times the size of the image.</figcaption>
</figure>

### Normal subgroups and quotient groups

The cosets of a kernel can be multiplied. In Figure 7.3, any element of the box
{2, 11} times any element of {3, 10} lands in {6, 7}: $2 \cdot 3 = 6$, $2 \cdot
10 \equiv 7$, $11 \cdot 3 \equiv 7$, $11 \cdot 10 \equiv 6$. So the boxes form a
group themselves.

In general, if $H$ is a subgroup of an abelian group $G$, the cosets form the
**quotient group** $G/H$, with $(aH)(bH) = abH$, of order $|G|/|H|$. The rule
does not depend on the representatives: if $a' = ah$ and $b' = bh'$, then
$a'b'H = ab(hh')H = abH$. In a non-abelian group this works only when $gH = Hg$
for all $g$, for a **normal subgroup**; kernels are always normal, and $G/\ker f
\cong \operatorname{im} f$ is the full first isomorphism theorem. Three quotients
recur in this book: $\mathbb{Z}/n\mathbb{Z}$ itself, the integers modulo the
subgroup $n\mathbb{Z}$ (a residue class is a coset $a + n\mathbb{Z}$); the units
modulo $p$ by the squares, isomorphic to $\{\pm 1\}$ through the Legendre symbol;
and Curve25519's group by its subgroup of order 8, which Decaf and Ristretto
(§7.11) encode as a group of prime order.

### Encryption that is a homomorphism

**Textbook RSA** is the map $x \mapsto x^e$ on $(\mathbb{Z}/N\mathbb{Z})^*$, an
isomorphism of the group to itself with inverse $y \mapsto y^d$. **ElGamal** in
a group $G = \langle g \rangle$ of prime order $q$, with private
key $x$ and public key $h = g^x$, sends a message $m \in G$ with fresh
randomness $k$ as $(g^k, m h^k)$. Read it as a map from the product group $G
\times \mathbb{Z}/q\mathbb{Z}$ (message, randomness) to $G \times G$:

$$E(m, k) \cdot E(m', k') = (g^{k + k'},\; m m' h^{k + k'}) = E(m m', k + k').$$

With the message in the exponent, $(g^k, g^m h^k)$, the messages add instead.
That is a feature for voting and mix networks, developed in the *Advanced
protocols* book, [Chapter 12](../advanced/12-Homomorphic-Encryption.md), and a
danger everywhere else: anyone can turn a ciphertext into one of a related
message. This is **malleability**.

```python
import random
rng = random.Random(7)

# Textbook RSA: the decryptor refuses c itself, but decrypts c * r^e.
n, e = 47 * 59, 17
d = pow(e, -1, 46 * 58 // 2)                # inverse mod lambda(n) = lcm(46, 58) = 1334
m = 1234
c = pow(m, e, n)
r = 2
answer = pow(c * pow(r, e, n) % n, d, n)    # the "harmless" decryption: m * r
print(d, answer, answer * pow(r, -1, n) % n)

# Exponential ElGamal in the squares mod 2027 (order 1013): a sealed bid.
p, q, g = 2027, 1013, 4
x = rng.randrange(1, q)
h = pow(g, x, p)                            # the auctioneer's public key
k = rng.randrange(1, q)
bid = 350
c1, c2 = pow(g, k, p), pow(g, bid, p) * pow(h, k, p) % p
mine = (c1, c2 * g % p)                     # copy the ciphertext and add 1 to the bid
gm = mine[1] * pow(mine[0], q - x, p) % p   # the auctioneer decrypts: g^m
print(next(m for m in range(q) if pow(g, m, p) == gm))
```

It prints:

```text
157 2468 1234
351
```

The decryptor refuses $c$ but decrypts $c \cdot 2^e$, gets $2m = 2468$, and has
given away 1234 (George Davida's blinding attack, 1982). A rival bidder copies a
sealed bid of 350, multiplies by $g$, and bids exactly 351 without learning
either. Neither attack touches the hard problem.

**Fix it.** A homomorphic scheme can never meet IND-CCA2 (book 1's
[Chapter 17](../../book/17-Defining-Security.md)): the attacker asks for the
decryption of a transformed challenge. So where malleability is not wanted the
homomorphism is destroyed on purpose: OAEP padding for RSA, and for
Diffie-Hellman a KEM followed by authenticated encryption (HPKE, RFC 9180), the
Fujisaki-Okamoto transform, or Cramer-Shoup (1998). Where it is wanted, each
ciphertext carries a zero-knowledge proof that it was formed honestly.

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

### Sylow's theorems

Write $|G| = r^a m$ with the prime $r$ not dividing $m$. A subgroup of order
$r^a$ is a **Sylow $r$-subgroup**.

**Theorem (Sylow, 1872).** (1) Sylow $r$-subgroups exist. (2) Any two are
**conjugate**: $P' = gPg^{-1}$ for some $g$. (3) Their number $n_r$ divides $m$
and $n_r \equiv 1 \pmod r$.

Part 1 is a partial converse of Lagrange, true for the largest prime powers. It
gives **Cauchy's theorem** (1845): if $r$ divides $|G|$ there is an element of
order $r$ (a suitable power of any non-identity element of a Sylow
$r$-subgroup). Helmut Wielandt's 1959 proof of part 1 lets $G$ act on its subsets
of size $r^a$ (§7.12). In an abelian group $gPg^{-1} = P$, so the Sylow
$r$-subgroup is unique, the set of elements of $r$-power order, as above. In
$S_3$ there are three Sylow 2-subgroups, one per flip.

Part 3 can pin a group down by its order. For order 15, $n_3 \mid 5$ and $n_3
\equiv 1 \pmod 3$ force $n_3 = 1$, and likewise $n_5 = 1$; both Sylow subgroups
are normal and the group is $\mathbb{Z}/3 \times \mathbb{Z}/5 \cong
\mathbb{Z}/15$. Every group of order 15 is cyclic.

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

### Worked example: the units modulo an RSA modulus

Take $n = 1333 = 31 \cdot 43$, where $p - 1 = 30 = 2 \cdot 3 \cdot 5$ and $q - 1
= 42 = 2 \cdot 3 \cdot 7$. By hand:

<div class="mars-steps" markdown>
1. **CRT.** $(\mathbb{Z}/1333)^* \cong (\mathbb{Z}/31)^* \times (\mathbb{Z}/43)^*
   \cong \mathbb{Z}/30 \times \mathbb{Z}/42$, with $30 \cdot 42 = 1260$ elements.
2. **Prime pieces.** $\mathbb{Z}/30 \cong \mathbb{Z}/2 \times \mathbb{Z}/3 \times
   \mathbb{Z}/5$ and $\mathbb{Z}/42 \cong \mathbb{Z}/2 \times \mathbb{Z}/3 \times
   \mathbb{Z}/7$.
3. **Sylow subgroups.** Sorted by prime: $(\mathbb{Z}/2)^2$ (4 elements),
   $(\mathbb{Z}/3)^2$ (9), $\mathbb{Z}/5$ and $\mathbb{Z}/7$; $4 \cdot 9 \cdot 5
   \cdot 7 = 1260$.
4. **Invariant factors.** One piece of each prime gives $210$, the rest $6$: the
   group is $\mathbb{Z}/6 \times \mathbb{Z}/210$, not cyclic, with exponent
   $\lambda(1333) = \operatorname{lcm}(30, 42) = 210$.
5. **The largest order.** An element has order 210 when none of its four Sylow
   components is the identity: $3 \cdot 8 \cdot 4 \cdot 6 = 576$ elements.
6. **Square roots of 1.** They form the Sylow 2-subgroup, the pairs $(\pm 1, \pm
   1)$: besides $\pm 1$ they are $216 \leftrightarrow (-1, 1)$ and $1117
   \leftrightarrow (1, -1)$.
</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The units modulo 1333 split by the CRT into the units modulo 31, cyclic of order 30, and the units modulo 43, cyclic of order 42; these split into pieces of orders 2, 3, 5 and 2, 3, 7; sorted by prime they give the Sylow subgroups of orders 4, 9, 5 and 7, and regrouped they give Z/6 times Z/210, so lambda is 210" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="220" y="12" width="200" height="40" rx="6"/>
<rect x="60" y="82" width="200" height="40" rx="6"/>
<rect x="380" y="82" width="200" height="40" rx="6"/>
<path d="M290 52 L170 82"/><path d="M350 52 L470 82"/>
<rect x="50" y="152" width="56" height="34" rx="5"/><rect x="132" y="152" width="56" height="34" rx="5"/><rect x="214" y="152" width="56" height="34" rx="5"/>
<rect x="370" y="152" width="56" height="34" rx="5"/><rect x="452" y="152" width="56" height="34" rx="5"/><rect x="534" y="152" width="56" height="34" rx="5"/>
<path d="M120 122 L78 152"/><path d="M160 122 L160 152"/><path d="M200 122 L242 152"/>
<path d="M440 122 L398 152"/><path d="M480 122 L480 152"/><path d="M520 122 L562 152"/>
<rect x="40" y="226" width="270" height="56" rx="6" fill="currentColor" fill-opacity=".08"/>
<rect x="340" y="226" width="270" height="56" rx="6" fill="currentColor" fill-opacity=".08"/>
<path d="M175 186 L175 226" stroke-dasharray="4 3"/><path d="M475 186 L475 226" stroke-dasharray="4 3"/>
</g>
<g text-anchor="middle">
<text x="320" y="37">(ℤ/1333ℤ)*, 1260 elements</text>
<text x="160" y="107">(ℤ/31ℤ)* ≅ ℤ/30</text>
<text x="480" y="107">(ℤ/43ℤ)* ≅ ℤ/42</text>
<text x="300" y="72" font-size="12" fill-opacity=".7">CRT</text>
<text x="78" y="174">ℤ/2</text><text x="160" y="174">ℤ/3</text><text x="242" y="174">ℤ/5</text>
<text x="398" y="174">ℤ/2</text><text x="480" y="174">ℤ/3</text><text x="562" y="174">ℤ/7</text>
<text x="175" y="248">sorted by prime (Sylow):</text>
<text x="175" y="270" font-size="13">(ℤ/2)², (ℤ/3)², ℤ/5, ℤ/7</text>
<text x="475" y="248">regrouped (invariant factors):</text>
<text x="475" y="270" font-size="13">ℤ/6 × ℤ/210, so λ(n) = 210</text>
</g>
</svg>
<figcaption>Figure 7.4. The units modulo an RSA modulus, taken apart. The CRT splits the group into the two cyclic groups modulo the primes; each splits into pieces of prime order; the pieces can be sorted by prime (the Sylow subgroups) or regrouped into invariant factors, whose largest is Carmichael's λ(n).</figcaption>
</figure>

The machine agrees, and lists how many elements have each order:

```python
# Uses units() and order() from the listing above.
from collections import Counter

p, q = 31, 43                         # p - 1 = 2*3*5, q - 1 = 2*3*7
n = p * q
U = units(n)
print(len(U), len({(a % p, a % q) for a in U}))      # the CRT pairs are all different
lam = (p - 1) * (q - 1) // gcd(p - 1, q - 1)
counts = Counter(order(a, n) for a in U)
print("lambda", lam, "largest order", max(counts))
print(sorted(counts.items()))

def power_of(d, r):
    while d % r == 0:
        d //= r
    return d == 1

for r in (2, 3, 5, 7):                # Sylow r-subgroup: orders that are powers of r
    print("Sylow", r, sum(c for d, c in counts.items() if power_of(d, r)))
```

It prints:

```text
1260 1260
lambda 210 largest order 210
[(1, 1), (2, 3), (3, 8), (5, 4), (6, 24), (7, 6), (10, 12), (14, 18), (15, 32), (21, 48), (30, 96), (35, 24), (42, 144), (70, 72), (105, 192), (210, 576)]
Sylow 2 4
Sylow 3 9
Sylow 5 5
Sylow 7 7
```

Every count can be read off the Sylow pieces: order 14 needs a component of
order 2 (3 choices) and one of order 7 (6 choices), so 18 elements.

### Why small orders leak

In a group of *known* order, an element whose order $rs$ has a small prime factor
$r$ gives part of any exponent away: from $y^x$ one computes $(y^x)^s =
(y^s)^x$, one of only $r$ values, and reads off $x \bmod r$. §7.10 turns this
homomorphism onto a small group into an attack. RSA hides the order, so that
projection needs $\lambda(n)$, which is as hard as factoring. What the RSA group
leaks comes from homomorphisms computable without the order, and from elements
that look different on the $p$ side and the $q$ side:

- **Square roots of 1 factor $n$.** $216 \equiv -1 \pmod{31}$ and $\equiv 1
  \pmod{43}$, so $\gcd(215, 1333) = 43$. This is how knowing $d$ gives the
  factors ([Chapter 19](19-Complexity-and-Reductions.md)), and why square roots
  modulo $n$ are as hard as factoring ([Chapter 5](05-Square-Roots-Mod-p.md)).
- **A smooth $p - 1$ factors $n$.** Raising to the power 30 kills all of
  $(\mathbb{Z}/31)^*$ but not the 7-part of $(\mathbb{Z}/43)^*$ (2 has order 14
  modulo 43), so $\gcd(2^{30} - 1, 1333) = 31$. This is Pollard's $p - 1$ method
  (1974), in *Cryptanalysis*, [Chapter 11](../cryptanalysis/11-Factoring.md).
- **The Jacobi symbol is a public homomorphism** onto $\{\pm 1\}$, computed
  without the factors (Chapter 5). For odd $e$, $\left(\frac{m^e}{n}\right) =
  \left(\frac{m}{n}\right)$: a textbook RSA ciphertext shows one bit about its
  plaintext.

```python
# Uses n from the listing above.
roots = [a for a in range(1, n) if a * a % n == 1]
print(roots, [gcd(a - 1, n) for a in roots])
print(gcd(pow(2, 30, n) - 1, n))                      # 2^30 is 1 mod 31 but not mod 43

def jacobi(a, m):                                     # Chapter 5: no factors needed
    a, s = a % m, 1
    while a:
        while a % 2 == 0:
            a //= 2
            if m % 8 in (3, 5):
                s = -s
        a, m = m, a
        if a % 4 == 3 and m % 4 == 3:
            s = -s
        a %= m
    return s if m == 1 else 0

e = 11                                                # gcd(11, 210) = 1
print(all(jacobi(pow(m, e, n), n) == jacobi(m, n) for m in range(1, n) if gcd(m, n) == 1))
```

It prints:

```text
[1, 216, 1117, 1332] [1333, 43, 31, 1]
31
True
```

A random 1,024-bit prime has a large factor in $p - 1$ with overwhelming
probability, so the second leak does not happen by accident; Ronald Rivest and
Robert Silverman argued in 1999 that the old demand for "strong primes" is
unnecessary.

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
solves it in subexponential time (*Cryptanalysis*, [chapter 12](../cryptanalysis/12-Discrete-Logarithms.md)); on good elliptic
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
<figcaption>Figure 7.5. Baby-step giant-step. The table holds the first m powers; the giant steps move back from the unknown x by m at a time and must land in the table within m jumps. Time and memory are both about √q.</figcaption>
</figure>

Both time and memory are about $\sqrt q$. Pollard's rho method (1978) needs the
same time but almost no memory, and is what attackers actually run; it belongs
to *Cryptanalysis*, [chapter 12](../cryptanalysis/12-Discrete-Logarithms.md), with the index-calculus methods that beat
$\sqrt q$ in groups that are not generic.

### Pohlig-Hellman, digit by digit

Pohlig-Hellman, met in [Chapter 4](04-Powers-and-Primitive-Roots.md), is the
algorithm that shows Shoup's bound for composite orders is tight. In group
language it has two levels. Let $G = \langle g \rangle$ have order $n = \prod
r_i^{e_i}$ and $h = g^x$.

**Level 1: the Sylow pieces.** For each $r^e$ exactly dividing $n$, the map
$\pi(y) = y^{n/r^e}$ is a homomorphism onto the Sylow $r$-subgroup, cyclic of
order $r^e$ and generated by $g_1 = \pi(g)$. Then $h_1 = \pi(h) = g_1^x$
depends only on $x \bmod r^e$. Solve there for every $r$ and join with the CRT.

**Level 2: the digits.** Inside the Sylow subgroup there is a chain of subgroups
of orders $r, r^2, \dots, r^e$, and the bottom one is generated by $\gamma =
g_1^{r^{e-1}}$, of order $r$. Write $x \bmod r^e = d_0 + d_1 r + \dots +
d_{e-1} r^{e-1}$ in base $r$. Raising $h_1$ to the power $r^{e-1}$ kills
everything except the lowest digit:

$$h_1^{r^{e-1}} = g_1^{x r^{e-1}} = \gamma^{d_0},$$

since $g_1^{r^e} = 1$: a logarithm in a group of order $r$. Then strip off what
is known, $h_1 g_1^{-d_0} = g_1^{d_1 r + \dots}$, and raise to $r^{e-2}$ to get
$\gamma^{d_1}$, and so on. The total cost is about $\sum_i e_i (\sqrt{r_i} +
\log_2 n)$ group operations with baby-step giant-step for each digit: a group of
order $2^{255}$ falls in 255 tiny steps, while a 256-bit prime factor still costs
about $2^{128}$.

*By hand*, modulo $p = 73$, where $p - 1 = 72 = 2^3 \cdot 3^2$ and $g = 5$ is a
primitive root. Find $x$ with $5^x \equiv 67$.

<div class="mars-steps" markdown>
1. **The 2-part.** Project with the power $72/8 = 9$: $g_1 = 5^9 \equiv 10$ (of
   order 8) and $h_1 = 67^9 \equiv 27$. The bottom generator is $\gamma = 10^4
   \equiv 72 = -1$.
2. Digit $d_0$: $27^4 = (27^2)^2 \equiv 72^2 \equiv 1 = \gamma^0$, so $d_0 = 0$.
3. Digit $d_1$: nothing to strip, so raise 27 to $2^1$: $27^2 = 729 \equiv 72 =
   \gamma^1$, so $d_1 = 1$.
4. Digit $d_2$: strip $g_1^{2}$: $10^2 = 100 \equiv 27$, so $27 \cdot 27^{-1} =
   1 = \gamma^0$ and $d_2 = 0$. Hence $x \equiv 0 + 1 \cdot 2 + 0 \cdot 4 = 2
   \pmod 8$.
5. **The 3-part.** Project with the power $72/9 = 8$: $g_1 = 5^8 \equiv 2$ (of
   order 9, since $2^9 = 512 \equiv 1$) and $h_1 = 67^8 \equiv 32 = 2^5$. The
   bottom generator is $\gamma = 2^3 = 8$, with powers $1, 8, 64$.
6. Digit $d_0$: $32^3 = 2^{15} = 2^9 \cdot 2^6 \equiv 64 = \gamma^2$, so $d_0 =
   2$.
7. Digit $d_1$: strip $g_1^{2}$: $32 / 4 = 8 = \gamma^1$, so $d_1 = 1$. Hence $x
   \equiv 2 + 1 \cdot 3 = 5 \pmod 9$.
8. **CRT.** Among 5, 14, 23, 32, 41, 50 (the numbers $\equiv 5 \pmod 9$), the one
   $\equiv 2 \pmod 8$ is 50. So $x = 50$, and indeed $5^{50} \equiv 67 \pmod{73}$.
</div>

Five logarithms in groups of size 2 or 3 replaced one in a group of size 72.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The Pohlig-Hellman tree for p equal to 60,715,873: the logarithm modulo p minus 1 splits into four Sylow pieces of orders 32, 27, 7 and 10039; the piece of order 32 splits into five binary digits, the piece of order 27 into three ternary digits, the piece of order 7 is one digit and the piece of order 10039 is one baby-step giant-step search" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="200" y="12" width="240" height="40" rx="6"/>
<rect x="20" y="102" width="130" height="40" rx="6"/>
<rect x="180" y="102" width="130" height="40" rx="6"/>
<rect x="340" y="102" width="120" height="40" rx="6"/>
<rect x="490" y="102" width="130" height="40" rx="6" fill="currentColor" fill-opacity=".12"/>
<path d="M260 52 L85 102"/><path d="M300 52 L245 102"/><path d="M340 52 L400 102"/><path d="M380 52 L555 102"/>
<rect x="14" y="192" width="22" height="26" rx="3"/><rect x="42" y="192" width="22" height="26" rx="3"/><rect x="70" y="192" width="22" height="26" rx="3"/><rect x="98" y="192" width="22" height="26" rx="3"/><rect x="126" y="192" width="22" height="26" rx="3"/>
<path d="M85 142 L25 192"/><path d="M85 142 L53 192"/><path d="M85 142 L81 192"/><path d="M85 142 L109 192"/><path d="M85 142 L137 192"/>
<rect x="198" y="192" width="26" height="26" rx="3"/><rect x="232" y="192" width="26" height="26" rx="3"/><rect x="266" y="192" width="26" height="26" rx="3"/>
<path d="M245 142 L211 192"/><path d="M245 142 L245 192"/><path d="M245 142 L279 192"/>
<rect x="386" y="192" width="28" height="26" rx="3"/>
<path d="M400 142 L400 192"/>
<rect x="520" y="192" width="70" height="26" rx="3" fill="currentColor" fill-opacity=".12"/>
<path d="M555 142 L555 192"/>
</g>
<g text-anchor="middle">
<text x="320" y="37">x mod 60,715,872</text>
<text x="85" y="127">x mod 2⁵ = 22</text>
<text x="245" y="127">x mod 3³ = 22</text>
<text x="400" y="127">x mod 7 = 3</text>
<text x="555" y="127">x mod 10039</text>
<text x="25" y="210">0</text><text x="53" y="210">1</text><text x="81" y="210">1</text><text x="109" y="210">0</text><text x="137" y="210">1</text>
<text x="211" y="210">1</text><text x="245" y="210">1</text><text x="279" y="210">2</text>
<text x="400" y="210">3</text>
<text x="555" y="210">3895</text>
<text x="81" y="240" font-size="12" fill-opacity=".7">5 digits, order 2</text>
<text x="245" y="240" font-size="12" fill-opacity=".7">3 digits, order 3</text>
<text x="400" y="240" font-size="12" fill-opacity=".7">order 7</text>
<text x="555" y="240" font-size="12" fill-opacity=".7">≈ 200 steps</text>
<text x="320" y="288">level 1: project onto the Sylow subgroups · level 2: one base-r digit at a time</text>
</g>
</svg>
<figcaption>Figure 7.6. The Pohlig-Hellman tree for the listing below. The logarithm splits into one piece per Sylow subgroup, and each piece of order rᵉ into e digits, each a logarithm in a group of prime order r. The shaded leaf, the largest prime, sets the cost.</figcaption>
</figure>

The code runs the tree on a group of order $60{,}715{,}872 = 2^5 \cdot 3^3 \cdot 7
\cdot 10039$, with baby-step giant-step for every digit.

```python
# Uses bsgs() from the listing above.
def ph_prime_power(g, h, p, n, r, e):
    """x mod r^e from h = g^x, where g has order n: one base-r digit at a time."""
    g1 = pow(g, n // r**e, p)            # order r^e: project into the Sylow r-subgroup
    h1 = pow(h, n // r**e, p)
    gamma = pow(g1, r**(e - 1), p)       # order r: the bottom of the chain
    x, digits = 0, []
    for k in range(e):
        t = pow(h1 * pow(g1, -x, p) % p, r**(e - 1 - k), p)
        d = bsgs(gamma, t, p, r)         # one logarithm in a group of order r
        digits.append(d)
        x += d * r**k
    print("r=%d digits %s: x mod %d = %d" % (r, digits, r**e, x))
    return x

def pohlig_hellman(g, h, p, factors):
    n = p - 1
    x, M = 0, 1
    for r, e in factors.items():
        xr = ph_prime_power(g, h, p, n, r, e)
        x += M * ((xr - x) * pow(M, -1, r**e) % r**e)   # CRT, one modulus at a time
        M *= r**e
    return x

p = 60715873                    # p - 1 = 2^5 * 3^3 * 7 * 10039
g = 5
print(all(pow(g, (p - 1) // r, p) != 1 for r in (2, 3, 7, 10039)))   # g generates
secret = 31415926
x = pohlig_hellman(g, pow(g, secret, p), p, {2: 5, 3: 3, 7: 1, 10039: 1})
print(x, x == secret)
```

The trace:

```text
True
r=2 digits [0, 1, 1, 0, 1]: x mod 32 = 22
r=3 digits [1, 1, 2]: x mod 27 = 22
r=7 digits [3]: x mod 7 = 3
r=10039 digits [3895]: x mod 10039 = 3895
31415926 True
```

Check: $22 = 2 + 4 + 16$ and $22 = 1 + 3 + 2 \cdot 9$. The searches took about
240 steps, against about 15,600 for baby-step giant-step on the whole group: a
group is as strong as its largest prime-order piece and no stronger.

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
<figcaption>Figure 7.7. The small-subgroup attack. By the structure theorem, the group splits into one piece per prime factor of its order. An unchecked server answers questions about each small piece separately, and the CRT joins the answers into most of its secret.</figcaption>
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

### Safe-prime groups and cofactors in practice

RFC 7919 (Daniel Kahn Gillmor, 2016) defines the finite-field groups ffdhe2048
to ffdhe8192 for TLS, and every prime in it is a safe prime $p = 2q + 1$, derived
from the digits of $e$ so that nobody could have chosen it with a hidden
weakness. Every element then has order 1, 2, $q$ or $2q$ (§7.3), and validation
shrinks to checking $1 < Y < p - 1$, which in the RFC's words keeps the peer from
"forcing the local system into the 2-element subgroup". TLS 1.3 (RFC 8446)
repeats the check. A $Y$ of order $2q$ still passes, but it can leak at most
$x \bmod 2$. On a curve of order $h\ell$, the analogue is **cofactor
Diffie-Hellman**, SP 800-56A's "ECC CDH" primitive: compute $(hx)Y$, so any
small-order part of $Y$ dies and a small-order $Y$ gives the identity, which is
rejected. X25519's clamping (§7.11) builds the same $h = 8$ into the secret.

### On Mars: when the key cannot be ephemeral

The third fix is the one an interplanetary link takes away. A handshake between
Arcadia City and Earth costs a round trip of 6 to 44 minutes, so much traffic is
one-way: encrypted to the receiver's *long-term* key with a fresh key on the
sender's side only, as in HPKE (RFC 9180) and every store-and-forward system.
The receiver's $x$ then meets every incoming $Y$, and if it reveals anything
that depends on $Y^x$, even "could not decrypt" in an acknowledgement, it is the
careless server above. The delay barely slows the attacker, whose nine queries go
out in one batch. Such a receiver needs a prime-order group (or a cleared
cofactor) and validation of every value, with no exceptions.

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

## 7.12 Group actions

*Level: expert.*

So far a group has acted on itself. Often it moves the points of another set:
permutations rearrange positions, matrices move vectors, rotations turn a cube.
Diffie-Hellman can be read this way, and so can the isogeny protocols of
post-quantum cryptography.

An **action** of $G$ on a set $X$ gives a point $g \cdot x \in X$ for each $g \in
G$, $x \in X$, with $1 \cdot x = x$ and $g \cdot (h \cdot x) = (gh) \cdot x$. Each
$g$ then permutes $X$, so an action is a homomorphism from $G$ into the
permutations of $X$; Cayley's theorem is $G$ acting on itself. The **orbit** of
$x$ is $G \cdot x = \{g \cdot x\}$, everywhere $x$ can go; the **stabilizer**
$G_x = \{g : g \cdot x = x\}$ is a subgroup. Orbits split $X$ into disjoint
pieces, as cosets split a group.

**Theorem (orbit-stabilizer).** For finite $G$, $|G| = |G \cdot x| \cdot |G_x|$.

*Proof.* Send the coset $gG_x$ to $g \cdot x$. It does not matter which $g$ is
picked, since $(gs) \cdot x = g \cdot x$ for $s \in G_x$. The map is onto the
orbit, and one-to-one: $g \cdot x = g' \cdot x$ gives $g^{-1}g' \in G_x$, so
$gG_x = g'G_x$. Lagrange counts the cosets as $|G|/|G_x|$. $\blacksquare$

*By hand.* The rotations of a cube act on its 6 faces; every face can reach the
top, and the rotations keeping the top face on top are the 4 quarter turns about
the vertical axis (counting the zero turn). So there are $6 \cdot 4 = 24$
rotations, counted without listing them. $S_3$ on $\{0, 1, 2\}$: orbit 3,
stabilizer of 0 of size 2, and $3 \cdot 2 = 6$. The units modulo 13 acting on
$\mathbb{Z}/13$ by multiplication: two orbits, $\{0\}$ with stabilizer of size 12
and the 12 nonzero residues with trivial stabilizers. Counting orbits the same
way (Burnside's lemma: the number of orbits is the average number of fixed
points) proves Sylow's first theorem in Wielandt's proof.

### Diffie-Hellman as an action

Let $X$ be the $q - 1$ generators of a cyclic group of prime order $q$. Then
$(\mathbb{Z}/q\mathbb{Z})^*$ acts on $X$ by $a \cdot x = x^a$, since $(x^b)^a =
x^{ab}$. The action is **transitive** (one orbit) and **free** (trivial
stabilizers), so by orbit-stabilizer $|X| = |G|$. A set with such an action is a
**principal homogeneous space**. Diffie-Hellman needs nothing more: Alice
publishes $a \cdot x_0$, Bob $b \cdot x_0$, and since the group is commutative,
$a \cdot (b \cdot x_0) = (ab) \cdot x_0 = b \cdot (a \cdot x_0)$.

Finding $g$ with $g \cdot x = y$ is the **vectorization** problem (here the
discrete logarithm); finding $(ab) \cdot x_0$ from $a \cdot x_0$ and $b \cdot
x_0$ is **parallelization** (here CDH). Jean-Marc Couveignes wrote this down in
1997, called a free transitive action with both problems hard a **hard
homogeneous space**, and posted the note in 2006. That year Alexander Rostovtsev
and Anton Stolbunov proposed an instance with a class group acting on elliptic
curves by isogenies, and CSIDH (Wouter Castryck, Tanja Lange, Chloe Martindale,
Lorenz Panny and Joost Renes, 2018) made it fast enough to use.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Diffie-Hellman as a group action: from x0, Alice's a and Bob's b lead to a·x0 and b·x0; applying the other secret to each reaches the same point (ab)·x0" fill="currentColor" font-size="14">
<defs><marker id="ga-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="60" y="20" width="140" height="44" rx="6"/>
<rect x="440" y="20" width="140" height="44" rx="6"/>
<rect x="60" y="180" width="140" height="44" rx="6"/>
<rect x="440" y="180" width="140" height="44" rx="6" fill="currentColor" fill-opacity=".12"/>
<path d="M200 42 L436 42" marker-end="url(#ga-arr)"/>
<path d="M130 64 L130 176" marker-end="url(#ga-arr)"/>
<path d="M510 64 L510 176" marker-end="url(#ga-arr)"/>
<path d="M200 202 L436 202" marker-end="url(#ga-arr)"/>
</g>
<g text-anchor="middle">
<text x="130" y="47">x₀ (public)</text>
<text x="510" y="47">a · x₀ (Alice)</text>
<text x="130" y="207">b · x₀ (Bob)</text>
<text x="510" y="207">(ab) · x₀</text>
<text x="318" y="34">act by a</text>
<text x="318" y="194">act by a</text>
<text x="120" y="125" text-anchor="end">act by b</text>
<text x="522" y="125" text-anchor="start">act by b</text>
<text x="320" y="125" font-size="12" fill-opacity=".7">the square closes because ab = ba</text>
</g>
</svg>
<figcaption>Figure 7.8. Diffie-Hellman needs only a commutative group acting freely and transitively on a set: exponentiation gives the classical protocol, a class group acting on curves gives CSIDH.</figcaption>
</figure>

### A toy CSIDH-like action

The listing lets $\mathbb{Z}/419$ act on 419 "places" named by hash values, so a
name says nothing about where the place sits. Three step types, named 3, 5 and 7
after the small primes that label CSIDH's steps, each move a place a fixed
distance around the hidden cycle. A secret is a vector of exponents from $-3$ to
3, one per step type; the steps commute.

```python
import hashlib, random
from itertools import product

N = 419                                    # the order of the acting group Z/N
def name(t):                               # the public name of the place at position t
    return hashlib.sha256(b"place%d" % (t % N)).hexdigest()[:8]
where = {name(t): t for t in range(N)}     # the hidden positions, used only by step()

STEPS = {3: 112, 5: 287, 7: 31}            # step type l moves a place by STEPS[l]
def step(l, X, times=1):                   # anyone can take a step; only names are seen
    return name(where[X] + times * STEPS[l])

def act(secret, X):                        # secret: one exponent per step type
    for l, e in secret.items():
        X = step(l, X, e)
    return X

X0 = name(0)                               # the public starting place
rng = random.Random(5)
a = {l: rng.randrange(-3, 4) for l in STEPS}
b = {l: rng.randrange(-3, 4) for l in STEPS}
A, B = act(a, X0), act(b, X0)              # the public keys
print(a, A)
print(b, B)
print(act(a, B), act(b, A), act(a, B) == act(b, A))

orbit, todo = {X0}, [X0]                   # the orbit of X0 under all steps
while todo:
    X = todo.pop()
    for l in STEPS:
        Y = step(l, X)
        if Y not in orbit:
            orbit.add(Y)
            todo.append(Y)
keys = {act(dict(zip(STEPS, v)), X0) for v in product(range(-3, 4), repeat=3)}
print(len(orbit), len(keys), 7 ** 3)
```

It prints:

```text
{3: 1, 5: -1, 7: 2} 62cf6593
{3: -1, 5: 3, 7: 2} f9791614
30f8e90e 30f8e90e True
419 273 343
```

Alice and Bob reach the same place, 30f8e90e. The orbit of $X_0$ is all 419
places, so by orbit-stabilizer the stabilizer is trivial: the action is free and
transitive. But the $7^3 = 343$ exponent vectors reach only 273 places, because
different vectors name the same group element. CSIDH-512 has the same issue at
scale, with $11^{74} \approx 2^{256}$ vectors spread over a class group of about
that size; the group's structure was first computed in 2019 by Ward Beullens,
Thorsten Kleinjung and Frederik Vercauteren, for the signature scheme CSI-FiSh.

The toy is honest in one way: the attacker sees only names and takes steps, like
the generic algorithm of §7.8, and needs about $\sqrt N$ steps. It cheats in
another: `step()` reads a hidden table. In CSIDH nothing is hidden. A place is a
supersingular elliptic curve over $\mathbb{F}_p$, its name is one coefficient
$A$, and a step is an isogeny of small prime degree computed from $A$ alone;
nobody knows how to find a curve's position on the cycle. *Post-quantum
cryptography*, [Chapter 16](../post-quantum/16-Isogenies.md), builds the real
thing.

**Why this matters after Shor.** Shor's algorithm works because $k \mapsto g^k$
is a homomorphism whose hidden period a quantum computer can find
([Chapter 20](20-Quantum-Algorithms.md)). An action on a set with no group law
of its own offers no such homomorphism: recovering the secret becomes a **hidden
shift** problem, for which Greg Kuperberg's quantum algorithm (2003, published
2005) is subexponential, not polynomial. That is why CSIDH is a post-quantum
candidate. How large $p$ must be is still argued over; Chris Peikert, and
separately Xavier Bonnetain and André Schrottenloher, argued in 2020 that
CSIDH-512 falls short of the level first claimed for it.

## 7.13 Going deeper

*Level: expert.*

**Beyond Sylow.** Groups of prime-power order are astonishingly many: there are
49,487,365,422 of order $2^{10}$, over 99 percent of all groups of order up to
2,000 (Besche, Eick and O'Brien, 2001). Deployed cryptography uses none of
them; it lives in abelian groups.

**Models of generic computation.** Ueli Maurer's model (2005) replaces Shoup's
random labels by handles into a black box. The **algebraic group model** of Georg
Fuchsbauer, Eike Kiltz and Julian Loss (CRYPTO 2018) lets the adversary see the
representation but makes it explain every element it outputs as a combination of
those it was given; BLS signatures and the Groth16 proof system have been proved
secure in it. Alexander Dent showed in 2002 that, as with random oracles, some
schemes secure in the generic group model are insecure with every real group.

**Groups of unknown order.** Class groups of imaginary quadratic fields
(Johannes Buchmann and Hugh Williams, 1988) have an order nobody knows and need
no trusted party to forget $p$ and $q$. They returned in 2019 for verifiable delay
functions (Benjamin Wesolowski; Krzysztof Pietrzak), where $x^{2^T}$ takes $T$
sequential squarings because without the order there is no shortcut.

**Non-abelian groups.** Braid-group key exchange (Anshel, Anshel and Goldfeld,
1999; Ko and coauthors, 2000) rested on the conjugacy search problem, given $x$
and $gxg^{-1}$ find $g$, and fell to length-based attacks and to linear
representations. The non-abelian hidden subgroup problem is where the quantum
story continues: for the dihedral group it is tied to lattice problems (Oded
Regev, 2004), part of why lattices are believed to resist quantum computers.

## Check yourself

??? question "1. Find the order of 3 and of 10 in the units modulo 11."

    $3^1 = 3$, $3^2 = 9$, $3^3 = 27 \equiv 5$, $3^4 = 15 \equiv 4$, $3^5 = 12
    \equiv 1$: order 5. $10 = -1$, so $10^2 = 1$: order 2.

??? question "2. List all subgroups of $\mathbb{Z}/12\mathbb{Z}$ under addition."

    One for each divisor of 12: $\{0\}$, $\{0, 6\}$, $\{0, 4, 8\}$, $\{0, 3, 6,
    9\}$, $\{0, 2, 4, 6, 8, 10\}$ and the whole group.

??? question "3. A cyclic group has order 100. How many generators does it have, and how many elements of order 4?"

    Generators: $\varphi(100) = 40$. Elements of order 4: $\varphi(4) = 2$, since
    there is exactly one subgroup of order 4 and it is cyclic.

??? question "4. Show that $x \mapsto x^2$ is a homomorphism of an abelian group, and find its kernel in the units mod 15."

    $(xy)^2 = x^2y^2$ because the group is abelian. The kernel is the $x$ with
    $x^2 \equiv 1 \pmod{15}$: 1, 4, 11 and 14.

??? question "5. Write $(\mathbb{Z}/91\mathbb{Z})^*$, with $91 = 7 \cdot 13$, as a product of cyclic groups. What is its exponent, and which square root of 1 factors 91?"

    By the CRT it is $\mathbb{Z}/6 \times \mathbb{Z}/12$ (already in invariant
    form, since $6 \mid 12$), with $\varphi(91) = 72$ elements and exponent
    $\lambda(91) = \operatorname{lcm}(6, 12) = 12$. The square roots of 1 are
    $(\pm 1, \pm 1)$; the one that is $1$ mod 7 and $-1$ mod 13 is 64 ($64 = 9
    \cdot 7 + 1$ and $64 = 5 \cdot 13 - 1$), and $\gcd(63, 91) = 7$. The other,
    27, gives $\gcd(26, 91) = 13$.

??? question "6. A group has order $2^{255}$ and a discrete logarithm is wanted. Is it hard?"

    No. Pohlig-Hellman reduces it to 255 logarithms in a group of order 2, one
    per bit. A prime-power order with a small prime is as weak as smooth order.

??? question "7. A Diffie-Hellman group has order $n = 2^3 \cdot 3 \cdot 10007$. Roughly how many group operations does Pohlig-Hellman need, and what sets the cost?"

    Three digits of size 2, one of size 3, and one logarithm in the subgroup of
    order 10007, about $2\sqrt{10007} \approx 200$ steps with baby-step giant-step,
    plus a handful of exponentiations: a few hundred operations in all. The
    largest prime factor, 10007, sets the cost; the size of $n$ hardly matters.

??? question "8. You see an exponential ElGamal ciphertext $(c_1, c_2) = (g^k, g^m h^k)$ of a secret bid $m$. Without the key, make a ciphertext of the bid $m + 5$. What stops this in practice?"

    $(c_1, c_2 g^5)$, since $g^m h^k \cdot g^5 = g^{m+5} h^k$. Encryption is a
    homomorphism, so it is malleable. It is stopped by not using a homomorphic
    scheme where none is wanted (a KEM with authenticated encryption, OAEP for
    RSA, Cramer-Shoup) or, where it is wanted, by attaching a zero-knowledge proof
    that each ciphertext was formed honestly by its sender.

??? question "9. Why does clamping (a scalar that is a multiple of 8) stop the small-subgroup attack on Curve25519?"

    The small subgroup has order 8, so a multiple of 8 sends every element of
    it to the identity; the server's answer then carries no information about
    the secret's low bits.

??? question "10. The group $(\mathbb{Z}/q\mathbb{Z})^*$ acts on the $q - 1$ generators of a group of prime order $q$ by $a \cdot x = x^a$. What are the orbit and the stabilizer of a generator $x$, and why does that make Diffie-Hellman work?"

    Every generator is a power of $x$ with exponent prime to $q$, so the orbit is
    all $q - 1$ generators; $x^a = x$ only when $a = 1$, so the stabilizer is
    trivial, and $q - 1 = (q - 1) \cdot 1$ as orbit-stabilizer says. The action is
    free and transitive, and the group is commutative, so $a \cdot (b \cdot x) =
    b \cdot (a \cdot x)$: both sides of the exchange reach the same point.

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
  groups and input validation are the cures, and RFC 7919's safe-prime groups
  make the check as short as $1 < Y < p - 1$.
- Every group is a group of permutations (Cayley, 1854). A cyclic group of
  order $n$ has $\varphi(d)$ elements of each order $d \mid n$.
- RSA and ElGamal encryption are homomorphisms, hence malleable.
- The units modulo $pq$ are $(\mathbb{Z}/p)^* \times (\mathbb{Z}/q)^*$, with
  exponent $\lambda$; square roots of 1, a smooth $p - 1$ and the Jacobi symbol
  are what that structure leaks.
- Pohlig-Hellman solves one base-$r$ digit at a time in each Sylow subgroup.
- Orbit-stabilizer: $|G| = |\text{orbit}| \cdot |\text{stabilizer}|$.
  Diffie-Hellman and CSIDH are free transitive actions of commutative groups.

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
- Arthur Cayley, "On the Theory of Groups, as Depending on the Symbolic Equation
  θⁿ = 1", *Philosophical Magazine* 7 (1854).
- Ludwig Sylow, "Théorèmes sur les groupes de substitutions", *Mathematische
  Annalen* 5 (1872).
- Helmut Wielandt, "Ein Beweis für die Existenz der Sylowgruppen" (1959).
- Stephen Pohlig and Martin Hellman, "An Improved Algorithm for Computing
  Logarithms over GF(p) and Its Cryptographic Significance", *IEEE Transactions
  on Information Theory* 24 (1978).
- John Pollard, "Theorems on Factorization and Primality Testing", *Proceedings
  of the Cambridge Philosophical Society* 76 (1974).
- Ronald Rivest and Robert Silverman, "Are 'Strong' Primes Needed for RSA?"
  (1999), IACR ePrint 2001/007.
- Ronald Cramer and Victor Shoup, "A Practical Public Key Cryptosystem Provably
  Secure against Adaptive Chosen Ciphertext Attack", CRYPTO 1998.
- RFC 7919, Negotiated Finite Field Diffie-Hellman Ephemeral Parameters for
  Transport Layer Security (TLS) (2016); RFC 8446, TLS 1.3 (2018); RFC 9180,
  Hybrid Public Key Encryption (2022).
- Jean-Marc Couveignes, "Hard Homogeneous Spaces", IACR ePrint 2006/291 (written
  1997); Alexander Rostovtsev and Anton Stolbunov, "Public-Key Cryptosystem Based
  on Isogenies", IACR ePrint 2006/145.
- Wouter Castryck, Tanja Lange, Chloe Martindale, Lorenz Panny and Joost Renes,
  "CSIDH: An Efficient Post-Quantum Commutative Group Action", ASIACRYPT 2018.
- Ward Beullens, Thorsten Kleinjung and Frederik Vercauteren, "CSI-FiSh:
  Efficient Isogeny Based Signatures through Class Group Computations",
  ASIACRYPT 2019.
- Greg Kuperberg, "A Subexponential-Time Quantum Algorithm for the Dihedral
  Hidden Subgroup Problem", *SIAM Journal on Computing* 35 (2005).
- Chris Peikert, "He Gives C-Sieves on the CSIDH", EUROCRYPT 2020; Xavier
  Bonnetain and André Schrottenloher, "Quantum Security Analysis of CSIDH",
  EUROCRYPT 2020.
- Georg Fuchsbauer, Eike Kiltz and Julian Loss, "The Algebraic Group Model and
  Its Applications", CRYPTO 2018.
- Benjamin Wesolowski, "Efficient Verifiable Delay Functions", EUROCRYPT 2019.
- In *Post-quantum cryptography*: [Chapter 16](../post-quantum/16-Isogenies.md);
  in *Advanced protocols and privacy*: [Chapter
  12](../advanced/12-Homomorphic-Encryption.md); in *Cryptanalysis*: [Chapter
  12](../cryptanalysis/12-Discrete-Logarithms.md).
- In *The cryptography book*: [Chapter 12](../../book/12-Diffie-Hellman.md) and
  [Chapter 14](../../book/14-Discrete-Log-Systems.md).
