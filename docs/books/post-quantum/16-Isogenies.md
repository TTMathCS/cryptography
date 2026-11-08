# 16. Isogenies: SIKE's Fall and What Lived

*On 5 July 2022 NIST announced that SIKE, a key exchange built on maps between elliptic
curves, would go on to the fourth round of its process. It had the smallest keys and
ciphertexts of any post-quantum KEM, and eleven years of study behind it. On 30 July, Wouter
Castryck and Thomas Decru posted a paper that recovered SIKE's level-1 secret key in about ten
minutes on a single computer core. Within weeks, follow-up papers had broken every variant in
polynomial time. This chapter explains what an isogeny is, builds one by hand with Vélu's
formulas, walks the graph of supersingular curves in code, tells the SIKE story carefully, and
ends with the isogeny schemes that survived it, above all SQIsign, whose signatures are the
smallest of any post-quantum candidate.*

!!! abstract "In this chapter"
    **You will learn:**

    - what an isogeny is, and how Vélu's formulas compute one from its kernel;
    - supersingular isogeny graphs, and why walks on them look random;
    - how SIDH and SIKE built a Diffie-Hellman exchange from secret walks;
    - why the extra torsion points SIDH published were its undoing, and what Castryck and
      Decru, Maino and Martindale, and Robert did with them;
    - CSIDH, a slower isogeny scheme that survived;
    - SQIsign, the round 3 signature with signatures of a couple of hundred bytes.

    **You need:** [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (the families of hard
    problems) and elliptic curves as groups, from
    [Chapter 12 of the mathematics book](../mathematics/12-Elliptic-Curve-Group.md) (point
    addition) and
    [Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md) (point counts).

    **Levels:** §16.1 to §16.3 are for beginners, §16.4 to §16.6 are intermediate, §16.7 to
    §16.9 are expert.

## 16.1 The problem

*Level: beginner.*

Elliptic-curve cryptography (Chapter 1) works in the group of points on one curve, and Shor's
algorithm breaks it by finding discrete logarithms in that group. Isogeny-based cryptography
keeps elliptic curves but changes the question. Instead of working *on* one curve, it moves
*between* curves. The secret is a path from one curve to another; the public information is
where the path ends. Shor's algorithm needs a group with a hidden period, and the graph of
curves has no such structure in the obvious way, so no efficient quantum algorithm is known for
finding the path in general.

The appeal was size. Curves are described by a few field elements, so keys are tiny: SIKE's
level-1 public key was 330 bytes and its ciphertext 346 bytes, against 800 and 768 for
ML-KEM-512. The cost was speed: SIKE needed millions of processor cycles per operation, around a hundred
times more than Kyber.

## 16.2 Isogenies

*Level: beginner.*

An **isogeny** is a map $\varphi : E \to E'$ between two elliptic curves that is given by
rational functions (fractions of polynomials) in the coordinates and respects the group law:
$\varphi(P + Q) = \varphi(P) + \varphi(Q)$, with the point at infinity going to the point at
infinity. Every isogeny has a **kernel**, the finite set of points that go to infinity, and the
number of points in the kernel is its **degree** (for the separable isogenies used here).

Two facts drive everything:

- **A kernel determines its isogeny.** Given any finite subgroup $K$ of $E$, there is an
  isogeny with kernel exactly $K$, and it is unique up to an isomorphism of the target curve.
  Jacques Vélu gave explicit formulas for it in 1971.
- **Isogenous curves have the same number of points** over the base field (a theorem of Tate),
  even though they are different curves with different $j$-invariants. The **$j$-invariant**,
  $j = 1728 \cdot 4a^3 / (4a^3 + 27b^2)$ for $y^2 = x^3 + ax + b$, is what tells curves apart
  up to isomorphism.

<div class="mars-steps" markdown>

**Vélu's formulas for a kernel of order 2.** On $E: y^2 = x^3 + ax + b$, a point $(x_0, 0)$
has order 2, since its tangent is vertical.

1. Compute $t = 3x_0^2 + a$ and $w = x_0 t$.
2. The target curve is $E': y^2 = x^3 + (a - 5t)\,x + (b - 7w)$.
3. The map is $\varphi(x, y) = \left(x + \dfrac{t}{x - x_0},\; y\left(1 - \dfrac{t}{(x -
   x_0)^2}\right)\right)$, and $(x_0, 0)$ goes to infinity.
4. Over $\mathbb{F}_{101}$ with $a = 2$, $b = 68$: $x_0 = 3$ is a root, since $27 + 6 + 68 =
   101$. Then $t = 27 + 2 = 29$ and $w = 87$.
5. $E'$: $a' = 2 - 145 = -143 \equiv 59$ and $b' = 68 - 609 = -541 \equiv 65 \pmod{101}$.

</div>

Kernels of higher order use longer versions of the same formulas, summing over the points of
the kernel; the work grows with the kernel's size. That is why isogeny cryptography uses long
chains of small-degree isogenies: an isogeny of degree $2^{216}$ is computed as 216 steps of
degree 2 (or 108 of degree 4).

**Code it.** The 2-isogeny of the box above, checked against brute force: every image point
lies on $E'$, the map respects addition for all pairs of points, the two curves have the same
number of points, and the kernel is exactly $\{\infty, (3, 0)\}$.

```python
p = 101                                       # a small prime field

def on_curve(P, a, b):
    if P is None:
        return True                           # the point at infinity
    x, y = P
    return (y * y - (x ** 3 + a * x + b)) % p == 0

def add(P, Q, a):
    """Add two points on y^2 = x^3 + a x + b over F_p."""
    if P is None: return Q
    if Q is None: return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % p == 0:
        return None
    if P == Q:
        lam = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (lam * lam - x1 - x2) % p
    return (x3, (lam * (x1 - x3) - y1) % p)

def points(a, b):
    pts = [None]
    for x in range(p):
        for y in range(p):
            if (y * y - (x ** 3 + a * x + b)) % p == 0:
                pts.append((x, y))
    return pts

def j_invariant(a, b):
    return 1728 * 4 * a ** 3 * pow(4 * a ** 3 + 27 * b * b, -1, p) % p

# E: y^2 = x^3 + 2x + 68 has the point (3, 0) of order 2
a, b, x0 = 2, 68, 3
assert (x0 ** 3 + a * x0 + b) % p == 0

# Velu's formulas for a kernel of order 2 generated by (x0, 0)
t = (3 * x0 * x0 + a) % p
w = x0 * t % p
a2, b2 = (a - 5 * t) % p, (b - 7 * w) % p

def phi(P):
    if P is None or P[0] == x0:
        return None                           # the kernel goes to infinity
    x, y = P
    d = pow(x - x0, -1, p)
    return ((x + t * d) % p, y * (1 - t * d * d) % p)

E, E2 = points(a, b), points(a2, b2)
print(f"E : y^2 = x^3 + {a}x + {b}, j = {j_invariant(a, b)}, {len(E)} points")
print(f"E': y^2 = x^3 + {a2}x + {b2}, j = {j_invariant(a2, b2)}, {len(E2)} points")
print("every image lies on E':", all(on_curve(phi(P), a2, b2) for P in E))
print("phi(P + Q) = phi(P) + phi(Q) for all pairs:",
      all(phi(add(P, Q, a)) == add(phi(P), phi(Q), a2) for P in E for Q in E))
print("kernel:", [P for P in E if phi(P) is None])
```

It prints:

```
E : y^2 = x^3 + 2x + 68, j = 8, 114 points
E': y^2 = x^3 + 59x + 65, j = 29, 114 points
every image lies on E': True
phi(P + Q) = phi(P) + phi(Q) for all pairs: True
kernel: [None, (3, 0)]
```

Different $j$-invariants, so different curves; the same 114 points, as Tate's theorem says.
The 12,996 pairs checked are every pair of points on $E$.

## 16.3 Supersingular isogeny graphs

*Level: beginner.*

Fix a prime $\ell$ (usually 2 or 3) and look at all curves, up to isomorphism, together with
all isogenies of degree $\ell$ between them. That is a graph: curves are vertices, isogenies
are edges. Each curve has exactly $\ell + 1$ subgroups of order $\ell$ (over the algebraic
closure), so each vertex has $\ell + 1$ edges.

Isogeny cryptography uses **supersingular** curves, a special kind whose $j$-invariants all lie
in $\mathbb{F}_{p^2}$. There are about $p/12$ of them, and their $\ell$-isogeny graph is
connected and an excellent **expander**: a random walk of length about $\log p$ lands almost
uniformly anywhere in the graph (Pizer, 1990). A walk is easy to take but, given only its two
ends, hard to retrace: that is the hard problem, finding an isogeny between two given
supersingular curves.

Each edge can be found without computing an isogeny at all, using the **modular polynomial**
$\Phi_2(X, Y)$: two $j$-invariants are joined by a 2-isogeny exactly when $\Phi_2(j, j') =
0$. $\Phi_2$ is a fixed polynomial with integer coefficients, as large as $157{,}464{,}000{,}000{,}000$.

**Code it.** The whole 2-isogeny graph of supersingular curves for $p = 431$, found by
starting at $j = 1728$ (the curve $y^2 = x^3 + x$) and solving $\Phi_2(j, Y) = 0$ for each
new curve. Then a hash function in the style of Charles, Goren and Lauter (2009): the bits of
a message choose the walk, never stepping straight back.

```python
import hashlib
p = 431                                    # 431 = 2^4 * 3^3 - 1, a prime with p = 3 mod 4

# F_{p^2} = F_p[i] with i^2 = -1; an element is a pair (re, im)
def mul(u, v): return ((u[0]*v[0] - u[1]*v[1]) % p, (u[0]*v[1] + u[1]*v[0]) % p)
def addf(u, v): return ((u[0] + v[0]) % p, (u[1] + v[1]) % p)
def neg(u): return (-u[0] % p, -u[1] % p)
def c(n): return (n % p, 0)
ROOTS = {}                                 # square roots by table: fine for p = 431
for re in range(p):
    for im in range(p):
        ROOTS.setdefault(mul((re, im), (re, im)), (re, im))

def inv(u):
    n = pow((u[0]*u[0] + u[1]*u[1]) % p, -1, p)
    return (u[0] * n % p, -u[1] * n % p)

def phi2_coeffs(j):
    """Phi_2(j, Y) = Y^3 + c2 Y^2 + c1 Y + c0, the classical modular polynomial of level 2."""
    j2 = mul(j, j)
    c2 = addf(neg(j2), addf(mul(c(1488), j), c(-162000)))
    c1 = addf(mul(c(1488), j2), addf(mul(c(40773375), j), c(8748000000)))
    c0 = addf(mul(j2, j), addf(mul(c(-162000), j2), addf(mul(c(8748000000), j), c(-157464000000000))))
    return c2, c1, c0

def neighbours(j, known):
    """The three j-invariants 2-isogenous to j, given one of them (synthetic division)."""
    c2, c1, c0 = phi2_coeffs(j)
    b1 = addf(c2, known)                   # Y^3 + c2 Y^2 + c1 Y + c0 = (Y - known)(Y^2 + b1 Y + b0)
    b0 = addf(c1, mul(known, b1))
    disc = addf(mul(b1, b1), neg(mul(c(4), b0)))
    r = ROOTS[disc]
    half = inv(c(2))
    return [known, mul(addf(neg(b1), r), half), mul(addf(neg(b1), neg(r)), half)]

# start at j = 1728 (y^2 = x^3 + x); its neighbours are 1728 itself and 66^3 (twice)
start = c(1728)
graph = {start: [start, c(287496), c(287496)]}
todo = [c(287496)]
while todo:
    j = todo.pop()
    if j in graph:
        continue
    known = next(k for k, ns in graph.items() if j in ns)
    graph[j] = neighbours(j, known)
    todo += [n for n in graph[j] if n not in graph]

print("supersingular j-invariants over F_431^2:", len(graph))
print("each has 3 neighbours (with repeats):", all(len(ns) == 3 for ns in graph.values()))
print("in F_431 itself:", sum(1 for j in graph if j[1] == 0))

def walk(message):
    """Charles-Goren-Lauter style hash: each bit picks one of the two non-backtracking neighbours."""
    bits = "".join(f"{byte:08b}" for byte in hashlib.sha256(message).digest()[:4])
    prev, cur = None, c(287496)
    for bit in bits:
        options = sorted(n for n in graph[cur] if n != prev) or [prev]
        prev, cur = cur, options[int(bit) % len(options)]
    return cur

print("walk for 'Arcadia':", walk(b"Arcadia"))
print("walk for 'Arcadib':", walk(b"Arcadib"))
```

It prints:

```
supersingular j-invariants over F_431^2: 37
each has 3 neighbours (with repeats): True
in F_431 itself: 21
walk for 'Arcadia': (102, 0)
walk for 'Arcadib': (141, 42)
```

The count matches the formula $\lfloor p/12 \rfloor + 2 = 37$ for $p \equiv 11 \pmod{12}$.
Two messages differing in one letter end at unrelated curves after 32 steps. For a real prime
of 400 or more bits there are about $2^{430}$ curves, and the best known classical attack on
the path problem, a meet-in-the-middle or claw search, costs about $p^{1/4}$, roughly the
square root of the number of curves reachable in the walk; quantum search helps only a little.

!!! note "Life story: SIKE"
    **Born:** 2011, David Jao and Luca De Feo, "Towards Quantum-Resistant Cryptosystems from
    Supersingular Elliptic Curve Isogenies" (PQCrypto 2011), as SIDH; SIKE, the KEM version,
    was submitted to NIST in 2017 by a team led by Jao · **Purpose:** key exchange with the
    smallest keys of any post-quantum design · **Helped:** a decade of isogeny research,
    hardware implementations and the SQIsign line of work · **Broken:** 30 July 2022, by Wouter
    Castryck and Thomas Decru; within weeks, in polynomial time for every starting curve
    (Damien Robert) · **Status (Nov 2026):** abandoned; its own team agreed that it should not
    be used. NIST had announced it for the fourth round 25 days before the break.

## 16.4 SIDH and SIKE

*Level: intermediate.*

Diffie-Hellman needs two operations that commute: Alice's secret applied after Bob's gives the
same result as Bob's after Alice's. Isogenies from one curve do not obviously commute: Alice's
walk and Bob's walk lead to different places. SIDH (Supersingular Isogeny Diffie-Hellman) made
them meet with a clever use of torsion points.

Choose a prime $p = 2^{e_A} 3^{e_B} - 1$ (for SIKEp434, $p = 2^{216} 3^{137} - 1$) and a
starting supersingular curve $E_0$. Its group of points over $\mathbb{F}_{p^2}$ contains two
large subgroups: the points of order dividing $2^{e_A}$, with public generators $P_A, Q_A$, and
those of order dividing $3^{e_B}$, with generators $P_B, Q_B$.

- **Alice** picks a secret $a$ and computes the isogeny $\varphi_A : E_0 \to E_A$ whose kernel
  is generated by $P_A + aQ_A$: a walk of $e_A$ steps of degree 2. She publishes $E_A$ and the
  images $\varphi_A(P_B), \varphi_A(Q_B)$ of **Bob's** torsion basis.
- **Bob** does the same with degree 3 and publishes $E_B$, $\varphi_B(P_A)$, $\varphi_B(Q_A)$.
- **Alice** computes the isogeny from $E_B$ with kernel generated by $\varphi_B(P_A) +
  a\,\varphi_B(Q_A)$, reaching a curve $E_{AB}$. Bob does the mirror image and reaches
  $E_{BA}$.
- The two curves are isomorphic: both are $E_0$ divided by the subgroup generated by both
  kernels. The shared secret is their $j$-invariant.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="SIDH as a square: from E0, Alice's secret isogeny of degree 2 to the e_A goes right to E_A and Bob's of degree 3 to the e_B goes down to E_B; each then pushes the other's kernel forward and both reach the same curve E_AB at the far corner. Alice also publishes where her isogeny sends Bob's torsion points, the extra information that Castryck and Decru used." fill="currentColor" font-size="13">
<text x="90" y="55">E₀</text>
<text x="470" y="55">E_A</text>
<text x="90" y="225">E_B</text>
<text x="470" y="225">E_AB ≅ E_BA</text>
<line x1="120" y1="50" x2="455" y2="50" stroke="currentColor" stroke-width="2" marker-end="url(#ar16)"/>
<line x1="98" y1="65" x2="98" y2="205" stroke="currentColor" stroke-width="2" marker-end="url(#ar16)"/>
<line x1="125" y1="220" x2="455" y2="220" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ar16)"/>
<line x1="482" y1="65" x2="482" y2="205" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ar16)"/>
<text x="200" y="38">φ_A, degree 2^e_A (Alice's secret)</text>
<text x="20" y="140">φ_B,</text><text x="10" y="156">degree 3^e_B</text>
<text x="200" y="245" fill-opacity=".7">Alice, from Bob's public data</text>
<text x="492" y="140" fill-opacity=".7">Bob, from</text><text x="492" y="156" fill-opacity=".7">Alice's data</text>
<text x="200" y="90" class="acc-fill">published with E_A: φ_A(P_B), φ_A(Q_B)</text>
<text x="200" y="108" class="acc-fill">the torsion images the attack used</text>
<defs><marker id="ar16" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
</svg>
<figcaption>Figure 16.1. SIDH. Each party's secret is a long walk from E₀. To let the other finish the square, each publishes where its walk sends the other's torsion points. That extra information is what broke the scheme.</figcaption>
</figure>

SIKE wrapped SIDH as a KEM with the Fujisaki-Okamoto transform (Chapter 3), so that a static
key could not be probed by malformed public keys, a known danger since Galbraith, Petit, Shani
and Ti showed adaptive attacks on SIDH with reused keys in 2016. SIKEp434 had a 330-byte public
key and a 346-byte ciphertext.

Notice what Alice reveals: not just the curve $E_A$ at the end of her walk, but also the
values of her secret isogeny on a whole subgroup of $3^{e_B}$ points. For a decade nobody knew
how to exploit that, and many people had looked.

## 16.5 Break it: Castryck and Decru

*Level: intermediate.*

The attack does not walk the graph at all. It uses a theorem from 1997 by Ernst Kani about
curves of genus 2, which are the next step up from elliptic curves, and about products of two
elliptic curves, which are 2-dimensional objects called abelian surfaces.

Here is the idea in outline. Suppose you know an isogeny's degree $d$ and its values on a large
group of torsion points of order $N$. Kani's theorem says that if you can complete the picture
with a second, auxiliary isogeny of degree $c$ with $c + d = N$, then a certain isogeny of
dimension 2, from the product $E_0 \times E'$ to another product of two
curves, exists, and its kernel can be written down from the known torsion values. Whether such
a 2-dimensional isogeny "splits" into a product again reveals whether a guess about the secret
is right. Castryck and Decru used this test to recover Bob's secret one digit at a time, and
the torsion images published by SIDH were exactly the information the theorem needed.

Their paper, "An efficient key recovery attack on SIDH" (ePrint 2022/975, received 30 July 2022;
EUROCRYPT 2023), reports breaking SIKEp434, aimed at NIST level 1, in about ten minutes on a
single core, using the computer algebra system Magma. Their attack relied on the starting
curve having a known special structure, which SIKE's did. Within weeks:

- **Luciano Maino and Chloe Martindale** (ePrint 2022/1026, August 2022, with later coauthors)
  gave an attack that works for any starting curve, in subexponential time;
- **Damien Robert** (ePrint 2022/1038, August 2022) showed that by going to higher dimensions,
  up to 8, the attack runs in **polynomial time** for any starting curve.

So SIDH was not weakened but broken outright, at every security level, for every choice of
parameters that publishes torsion images of that kind. The SIKE team agreed that SIKE should
not be used. The attack was classical: it needed no quantum computer at all.

## 16.6 Fix it: what the community kept

*Level: intermediate.*

There were proposals to save SIDH by hiding the torsion information, such as masking the
torsion images (M-SIDH and MD-SIDH; Fouotsa, Moriya and Petit, EUROCRYPT 2023). They
appear to resist the attack, but at the price of much larger keys and much slower operations,
which took away SIDH's whole reason to exist.

The more lasting outcome was the reverse. The same higher-dimensional isogenies that broke SIDH
turned out to be a powerful *constructive* tool: they make it possible to compute and
represent isogenies of any degree efficiently, as long as you know enough torsion
information. That idea rebuilt the field in two years:

- **CSIDH** (Castryck, Lange, Martindale, Panny and Renes, ASIACRYPT 2018) was unaffected
  because it publishes no torsion images. It uses supersingular curves defined over
  $\mathbb{F}_p$, where a commutative group, the class group, acts on the curves. Commutativity
  gives a genuine non-interactive Diffie-Hellman: Alice computes $[a]E_0$, Bob $[b]E_0$, and
  both reach $[a][b]E_0 = [b][a]E_0$. Public keys are 64 bytes. Its drawbacks: it is slow (tens
  of milliseconds), and because it is a commutative group action, Kuperberg's quantum
  algorithm attacks it in subexponential time, so the right parameters for a given quantum
  security level have been debated since 2020 (Peikert; Bonnetain and Schrottenloher). It is
  used in research protocols, not in standards.
- **SQIsign** (§16.7) was rebuilt around the new tools and became much faster.
- Several new isogeny KEMs and encryption schemes based on 2-dimensional isogenies have been
  proposed since 2023. None has been standardized as of November 2026.

The lesson most often drawn: SIKE's assumption was not the plain "find a path between two
curves" problem but a variant with extra information, and the extra information was fatal. A
scheme should be judged by exactly what it publishes, not by the problem it was inspired by.
Ward Beullens's Rainbow attack (Chapter 15) taught the same lesson the same year.

## 16.7 SQIsign: the smallest signatures

*Level: expert.*

SQIsign (Luca De Feo, David Kohel, Antonin Leroux, Christophe Petit and Benjamin Wesolowski,
ASIACRYPT 2020) is an identification protocol turned into a signature with Fiat-Shamir:

- the public key is a supersingular curve $E_A$, linked to a starting curve $E_0$ by a secret
  isogeny the signer knows;
- the signer commits to a random walk to a curve $E_1$;
- the challenge (a hash of the message and $E_1$) defines an isogeny from $E_A$ to a curve
  $E_2$;
- the response is an isogeny from $E_1$ to $E_2$ that reveals nothing about the secret.

Producing that response is the hard part. It uses the **Deuring correspondence**, a dictionary
between supersingular curves and certain algebraic objects called maximal orders in a
quaternion algebra. Knowing the secret isogeny lets the signer translate everything into
quaternion arithmetic, find a suitable response there (the KLPT algorithm, Kohel, Lauter,
Petit and Tignol, 2014, and its successors), and translate back. An attacker without the secret
cannot make the translation.

The result is the most compact post-quantum signature known. In the round 2 submission of
NIST's on-ramp, SQIsign's level-1 public key was 65 bytes and its signature 148 bytes; public
key and signature together are smaller than an ML-DSA-44 public key alone. The round 3 update
(September 2026) changed the parameters, and its sizes differ somewhat; the current
specification is the reference. The costs: signing takes milliseconds rather than
microseconds, the mathematics is far deeper than any other candidate's, and implementations are
complex, with all the risk of side channels that brings. The 2D-isogeny versions (from 2024)
made verification fast enough for practical use.

## 16.8 In the real world

*Level: expert.*

As of November 2026 no isogeny scheme is standardized or widely deployed. SIKE had been
implemented in libraries and tested in TLS experiments, including a 2019 experiment by
Cloudflare and Google that combined it with X25519; those experiments ended with the break,
and because the KEMs had been hybrids with X25519, no traffic was put at risk.

That last point is the most practical lesson of the chapter. A hybrid combines a new
post-quantum KEM with a classical one so that breaking the combination requires breaking both
(Chapter 18). When SIKE fell in 2022, every deployment that had used it in a hybrid was still
protected by X25519. The migration rule of thumb "hybrid first" owes much of its force to
SIKE.

SQIsign is in round 3 of NIST's additional signatures process, and is being studied for uses
where every byte counts: certificate chains, blockchains, and constrained radio links.

**Mars.** The city's surface beacons, which broadcast a signed position and status message to
rovers every few seconds over a slow radio link, have about 300 bytes per frame for the whole
message. An ML-DSA signature does not fit at all; a UOV signature fits, but each beacon's
public key, 46 kilobytes even compressed, would have to be loaded into every rover; a SQIsign signature fits with
room to spare, and its public key is smaller than a line of text. The beacon network's
engineers have prototypes, and wait for NIST's decision before trusting it with navigation.

## 16.9 Going deeper

*Level: expert.*

- **Foundations.** Joseph Silverman, *The Arithmetic of Elliptic Curves*, 2nd edition
  (Springer, 2009), chapter III on isogenies; Luca De Feo, "Mathematics of Isogeny Based
  Cryptography" (lecture notes, 2017, arXiv:1711.04062).
- **SIDH.** Jao and De Feo (PQCrypto 2011); Galbraith, Petit, Shani and Ti, "On the Security of
  Supersingular Isogeny Cryptosystems" (ASIACRYPT 2016).
- **The break.** Castryck and Decru, "An Efficient Key Recovery Attack on SIDH" (EUROCRYPT 2023);
  Maino, Martindale, Panny, Pope and Wesolowski, "A Direct Key Recovery Attack on SIDH"
  (EUROCRYPT 2023); Robert, "Breaking SIDH in Polynomial Time" (EUROCRYPT 2023).
- **CSIDH and its quantum security.** Castryck, Lange, Martindale, Panny and Renes (ASIACRYPT
  2018); Peikert, "He Gives C-Sieves on the CSIDH" (EUROCRYPT 2020); Bonnetain and
  Schrottenloher (EUROCRYPT 2020).
- **SQIsign.** De Feo, Kohel, Leroux, Petit and Wesolowski (ASIACRYPT 2020), and the round 3
  specification.
- **Graphs.** Charles, Goren and Lauter, "Cryptographic Hash Functions from Expander Graphs"
  (*Journal of Cryptology*, 2009).

## Check yourself

??? question "1. What is an isogeny, and what determines it?"

    A map between elliptic curves given by rational functions that respects the group law. It
    is determined, up to isomorphism of the target, by its kernel, a finite subgroup.

??? question "2. In the Vélu example, what were the target curve and the two point counts?"

    $E': y^2 = x^3 + 59x + 65$ over $\mathbb{F}_{101}$; both curves have 114 points, though
    their $j$-invariants (8 and 29) differ.

??? question "3. How many supersingular $j$-invariants are there for $p = 431$, and how many 2-isogenies leave each?"

    37, each with 3 outgoing 2-isogenies (counting repeats).

??? question "4. What did SIDH publish besides the curve at the end of each walk?"

    The images of the other party's torsion basis under its secret isogeny, so that the
    other party could compute the second side of the square.

??? question "5. Whose theorem did Castryck and Decru use, and about what objects?"

    Ernst Kani's 1997 theorem about isogenies between products of elliptic curves (abelian
    surfaces) and curves of genus 2.

??? question "6. How long did their attack take on SIKEp434?"

    About ten minutes on a single core, as reported in their paper; and it needed no quantum
    computer.

??? question "7. Why did CSIDH survive the attack, and what is its main weakness?"

    It publishes no torsion images. Its commutative group action makes it vulnerable to
    Kuperberg's subexponential quantum algorithm, so its parameters for a given quantum
    security level are debated, and it is slow.

??? question "8. Give SQIsign's round 2 level-1 sizes."

    A 65-byte public key and a 148-byte signature.

??? question "9. Why did SIKE's break put no TLS traffic at risk?"

    The experiments that used it combined it with X25519 in a hybrid, so breaking SIKE alone
    did not reveal the shared keys.

## What you learned

- Isogenies are maps between elliptic curves fixed by their kernels; Vélu's formulas compute
  them, and isogenous curves share their point count.
- Supersingular isogeny graphs are expanders; finding a path between two given curves is the
  hard problem behind isogeny cryptography.
- SIDH and SIKE published torsion images to make their walks commute; Castryck and Decru
  turned that information into a key recovery in July 2022, and Robert made it polynomial
  time for every starting curve.
- CSIDH survived but is slow and has debated quantum security; SQIsign survived, was rebuilt
  with the same higher-dimensional tools, and has the smallest signatures in NIST's round 3.
- Hybrids protected every real deployment of SIKE; that is a lasting argument for them.

**Next:** [Chapter 17](17-Implementing-Post-Quantum-Safely.md), implementing post-quantum
cryptography safely: timing, faults, randomness and tests.

## Further reading

- Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH" (EUROCRYPT 2023;
  ePrint 2022/975).
- Damien Robert, "Breaking SIDH in Polynomial Time" (EUROCRYPT 2023; ePrint 2022/1038).
- Luca De Feo, "Mathematics of Isogeny Based Cryptography" (2017).
- Craig Costello, "Supersingular Isogeny Key Exchange for Beginners" (SAC 2019), which uses the
  prime 431 of this chapter's graph.
- Luca De Feo, David Kohel, Antonin Leroux, Christophe Petit and Benjamin Wesolowski, "SQISign:
  Compact Post-Quantum Signatures from Quaternions and Isogenies" (ASIACRYPT 2020).
- Wouter Castryck, Tanja Lange, Chloe Martindale, Lorenz Panny and Joost Renes, "CSIDH: An
  Efficient Post-Quantum Commutative Group Action" (ASIACRYPT 2018).
