# 16. Isogenies: SIKE's Fall and What Lived

*On 5 July 2022 NIST announced that SIKE, a key exchange built on maps between elliptic
curves, would go on to the fourth round of its process. It had the smallest keys and
ciphertexts of any post-quantum KEM, and eleven years of study behind it. On 30 July, Wouter
Castryck and Thomas Decru posted a paper that recovered SIKE's level-1 secret key in about an
hour on a single computer core, and in about ten minutes in the revised version. Within two
weeks, follow-up papers had broken every variant in polynomial time. This chapter explains what
an isogeny is, builds one by hand with Vélu's formulas, walks the graph of supersingular curves
in code, runs a complete toy SIDH exchange, tells the SIKE story carefully and shows exactly
which published numbers broke it. It ends with the isogeny schemes that survived: CSIDH, run
here on a curve over a field of 419 elements, and SQIsign, whose signatures are the smallest of
any post-quantum candidate.*

!!! abstract "In this chapter"
    **You will learn:**

    - what an isogeny is, and how Vélu's formulas compute one from its kernel;
    - supersingular isogeny graphs, why walks on them look random, and the four hard problems
      that isogeny schemes rest on;
    - how SIDH and SIKE built a Diffie-Hellman exchange from secret walks, with a toy exchange
      in code over $p = 2^8 \cdot 3^5 - 1$;
    - why the extra torsion points SIDH published were its undoing, how Kani's theorem turns
      them into a key recovery, and what Castryck and Decru, Maino and Martindale, and Robert
      did with them, day by day;
    - SQIsign, the round 3 signature: what a signature proves, why it is about 200 bytes, and
      how its sizes changed in September 2026;
    - CSIDH, a slower isogeny scheme that survived, as a group action you can run on 27 curves.

    **You need:** [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (the families of hard
    problems) and elliptic curves as groups, from
    [Chapter 12 of the mathematics book](../mathematics/12-Elliptic-Curve-Group.md) (point
    addition) and
    [Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md) (point counts and
    pairings). The attacker's side of the SIKE break is in
    [Chapter 16 of the cryptanalysis book](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md).

    **Levels:** §16.1 to §16.3 are for beginners, §16.4 to §16.6 and §16.8 are intermediate,
    §16.7, §16.9 and §16.10 are expert. The subsection on Kani's theorem in §16.5 is expert.

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

The idea is older than the post-quantum rush. Jean-Marc Couveignes described a Diffie-Hellman
exchange built from a group acting on curves in a 1997 seminar talk; his write-up, "Hard
Homogeneous Spaces", only appeared in 2006, the same year Alexander Rostovtsev and Anton
Stolbunov independently proposed the same kind of scheme on ordinary curves. Also in 2006, Denis
Charles, Eyal Goren and Kristin Lauter built a hash function from walks on supersingular
curves (§16.3). David Jao and Luca De Feo turned supersingular walks into a fast key exchange
in 2011, and that line led to SIKE. The commutative line was revived as CSIDH in 2018 (§16.8),
and the signature line produced SQIsign in 2020 (§16.7). Three branches from one idea; one of
them fell, and how it fell is the story of this chapter.

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

For a kernel $\{\infty, Q, -Q\}$ of order 3, with $Q = (x_Q, y_Q)$, the same recipe uses
$g = 3x_Q^2 + a$, $v = 2g$, $u = 4y_Q^2$ and $w = u + x_Q v$; the target is again
$y^2 = x^3 + (a - 5v)x + (b - 7w)$, and the map adds $v/(x - x_Q) + u/(x - x_Q)^2$ to the
$x$-coordinate. The toy SIDH program in §16.4 uses exactly these two cases, degree 2 and
degree 3, and nothing else.

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

```text
E : y^2 = x^3 + 2x + 68, j = 8, 114 points
E': y^2 = x^3 + 59x + 65, j = 29, 114 points
every image lies on E': True
phi(P + Q) = phi(P) + phi(Q) for all pairs: True
kernel: [None, (3, 0)]
```

Different $j$-invariants, so different curves; the same 114 points, as Tate's theorem says.
The 12,996 pairs checked are every pair of points on $E$.

Every isogeny $\varphi$ of degree $d$ also has a **dual** $\hat\varphi : E' \to E$, going back,
with $\hat\varphi \circ \varphi = [d]$, multiplication by $d$. Duals matter twice later: a
walk that steps straight back along an edge has composed an isogeny with its dual, and Kani's
theorem in §16.5 is written with duals.

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

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A walk in the 2-isogeny graph seen from its start: each curve has three neighbors, one of which is the curve just left, so each step offers two choices. The tree of non-backtracking walks doubles at every level; message bits 1, 0, 1 pick one path through it. Far from the start the branches meet again, because the graph has only about p over 12 vertices." fill="currentColor" font-size="13">
<circle cx="60" cy="150" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="60" y="185" text-anchor="middle">start</text>
<line x1="69" y1="146" x2="171" y2="88" stroke="currentColor" stroke-width="3"/>
<line x1="69" y1="154" x2="171" y2="212" stroke="currentColor" stroke-opacity=".5"/>
<text x="112" y="104" text-anchor="middle" font-size="12">1</text>
<text x="112" y="206" text-anchor="middle" font-size="12" fill-opacity=".7">0</text>
<circle cx="180" cy="85" r="7"/>
<circle cx="180" cy="215" r="7" fill-opacity=".5"/>
<line x1="187" y1="82" x2="293" y2="48" stroke="currentColor" stroke-opacity=".5"/>
<line x1="187" y1="88" x2="293" y2="122" stroke="currentColor" stroke-width="3"/>
<line x1="187" y1="212" x2="293" y2="178" stroke="currentColor" stroke-opacity=".5"/>
<line x1="187" y1="218" x2="293" y2="252" stroke="currentColor" stroke-opacity=".5"/>
<text x="240" y="58" text-anchor="middle" font-size="12" fill-opacity=".7">1</text>
<text x="240" y="121" text-anchor="middle" font-size="12">0</text>
<circle cx="300" cy="45" r="6" fill-opacity=".5"/>
<circle cx="300" cy="125" r="6"/>
<circle cx="300" cy="175" r="6" fill-opacity=".5"/>
<circle cx="300" cy="255" r="6" fill-opacity=".5"/>
<line x1="306" y1="45" x2="404" y2="30" stroke="currentColor" stroke-opacity=".4"/>
<line x1="306" y1="45" x2="404" y2="62" stroke="currentColor" stroke-opacity=".4"/>
<line x1="306" y1="125" x2="404" y2="104" stroke="currentColor" stroke-width="3"/>
<line x1="306" y1="125" x2="404" y2="136" stroke="currentColor" stroke-opacity=".4"/>
<line x1="306" y1="175" x2="404" y2="166" stroke="currentColor" stroke-opacity=".4"/>
<line x1="306" y1="175" x2="404" y2="196" stroke="currentColor" stroke-opacity=".4"/>
<line x1="306" y1="255" x2="404" y2="236" stroke="currentColor" stroke-opacity=".4"/>
<line x1="306" y1="255" x2="404" y2="270" stroke="currentColor" stroke-opacity=".4"/>
<text x="356" y="106" text-anchor="middle" font-size="12">1</text>
<circle cx="410" cy="30" r="5" fill-opacity=".4"/>
<circle cx="410" cy="62" r="5" fill-opacity=".4"/>
<circle cx="410" cy="104" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
<circle cx="410" cy="136" r="5" fill-opacity=".4"/>
<circle cx="410" cy="166" r="5" fill-opacity=".4"/>
<circle cx="410" cy="196" r="5" fill-opacity=".4"/>
<circle cx="410" cy="236" r="5" fill-opacity=".4"/>
<circle cx="410" cy="270" r="5" fill-opacity=".4"/>
<text x="425" y="100">end of the walk</text>
<text x="425" y="118" font-size="12" fill-opacity=".7">for the bits 1, 0, 1</text>
<text x="440" y="190" font-size="12">level k has 2ᵏ curves,</text>
<text x="440" y="207" font-size="12">until 2ᵏ passes about p/12:</text>
<text x="440" y="224" font-size="12">then the branches meet again</text>
<text x="440" y="241" font-size="12">and the walk's end is close</text>
<text x="440" y="258" font-size="12">to uniform (an expander)</text>
</svg>
<figcaption>Figure 16.1. A walk in the 2-isogeny graph, seen from its start. Each curve has three neighbors, one of them the curve just left, so each step without backtracking offers two choices and one bit picks between them. Retracing the walk from its two ends is the path problem.</figcaption>
</figure>

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

```text
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

### Four hard problems, not one

"Isogeny-based" names a family, and the family rests on several problems that are easy to
confuse. Most of this chapter's story turns on the differences between them.

1. **The path problem.** Given two supersingular curves, find any isogeny between them. The
   best classical algorithms took about $p^{1/2}$ steps for decades, by generic collision
   search; for curves defined over $\mathbb{F}_p$, as in CSIDH, Delfs and Galbraith (2016)
   showed about $p^{1/4}$. In July 2026 Benjamin Wesolowski posted a heuristic algorithm
   using about $p^{1/3}$ time *and* $p^{1/3}$ memory (§16.7 tells what it did to SQIsign). No
   quantum algorithm gives more than a modest speedup.
2. **The endomorphism ring problem.** Given one curve, find its ring of endomorphisms (its
   isogenies to itself). It is equivalent to the path problem: Eisenträger, Hallgren, Lauter,
   Morrison and Petit showed it under heuristics in 2018, and Wesolowski proved it in 2021,
   assuming the generalized Riemann hypothesis.
   SQIsign rests on this one.
3. **SIDH's problem.** Given two curves, the degree of a secret isogeny between them (a
   known power of 2 or 3, about $\sqrt{p}$), *and* its values on a large group of torsion
   points, find the isogeny. Because the degree is fixed, a meet in the middle from both ends
   costs about $p^{1/4}$, which is why SIKEp434 used a 434-bit prime for a 128-bit target.
   This problem fell in 2022 in polynomial time.
4. **The group action problem.** Given $E$ and $[\mathfrak{a}]E$, where a commutative group
   acts on a set of curves, find $\mathfrak{a}$. This is CSIDH's problem. It is at least as
   easy as the path problem, and Kuperberg's quantum algorithm solves it in subexponential time.

A break of problem 3 says nothing about problems 1 and 2, which is why SQIsign and CSIDH
survived SIKE. The SQIsign specification makes the point in a footnote: SIDH "relied on an
easier variant of the fundamental isogeny problems".

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
<figcaption>Figure 16.2. SIDH. Each party's secret is a long walk from E₀. To let the other finish the square, each publishes where its walk sends the other's torsion points. That extra information is what broke the scheme.</figcaption>
</figure>

SIKE wrapped SIDH as a KEM with the Fujisaki-Okamoto transform (Chapter 3), so that a static
key could not be probed by malformed public keys, a known danger since Galbraith, Petit, Shani
and Ti showed adaptive attacks on SIDH with reused keys in 2016. SIKEp434 had a 330-byte public
key and a 346-byte ciphertext.

Notice what Alice reveals: not just the curve $E_A$ at the end of her walk, but also the
values of her secret isogeny on a whole subgroup of $3^{e_B}$ points. For a decade nobody knew
how to exploit that, and many people had looked.

### Why the square closes

The claim that $E_{AB}$ and $E_{BA}$ are isomorphic deserves one line of proof, because it
also shows why the torsion images cannot simply be left out. Write $K_A = \langle P_A +
aQ_A\rangle$ and $K_B = \langle P_B + bQ_B\rangle$. Alice's second isogeny has kernel
$\varphi_B(K_A)$, so her composite $E_0 \to E_B \to E_{AB}$ has kernel $K_A + K_B$. Bob's
composite $E_0 \to E_A \to E_{BA}$ has kernel $K_B + K_A$, the same subgroup of order
$2^{e_A} 3^{e_B}$. A kernel determines its isogeny up to isomorphism of the target (§16.2),
so the targets have the same $j$-invariant. Without $\varphi_B(P_A)$ and $\varphi_B(Q_A)$,
Alice would have no way to name the subgroup $\varphi_B(K_A)$ on Bob's curve: she knows $a$,
but not where Bob's secret walk sent her basis.

### A toy SIDH exchange in code

The prime $p = 2^8 \cdot 3^5 - 1 = 62{,}207$ has the SIKE shape, and $p \equiv 3 \pmod 4$.
That makes $E_0 : y^2 = x^3 + x$ supersingular, with $p + 1$ points over $\mathbb{F}_p$ and
$(p+1)^2$ over $\mathbb{F}_{p^2}$, arranged as $\mathbb{Z}/(p+1) \times \mathbb{Z}/(p+1)$. So
all points of order $2^8$ and $3^5$ are defined over $\mathbb{F}_{p^2}$: multiply a random
point by $(p+1)/2^8$ and it lands in the $2^8$-torsion. Two such points form a basis when their
multiples of order 2 differ (for the 3-torsion: when the multiple of order 3 of the second is
not a multiple of the first's).

A walk of $e$ steps with kernel $\langle R \rangle$, $R$ of order $\ell^e$, goes like this: the
point $[\ell^{e-1}]R$ has order $\ell$, so take the $\ell$-isogeny with that kernel by Vélu's
formulas, push $R$ (and any points to be published) through it, and repeat with $e - 1$. Each
step shortens $R$'s order by one factor of $\ell$, and after $e$ steps $R$ has become the
point at infinity.

**Code it.** A complete SIDH exchange: Vélu's formulas for degrees 2 and 3 over
$\mathbb{F}_{p^2}$, torsion bases from random points, Alice's walk of 8 steps and Bob's of 5,
the published torsion images, and the shared $j$-invariant.

```python
import random
eA, eB = 8, 5
p = 2**eA * 3**eB - 1                     # 62207, a prime with p = 3 mod 4

# F_{p^2} = F_p[i], i^2 = -1; elements are pairs (re, im)
def fadd(u, v): return ((u[0] + v[0]) % p, (u[1] + v[1]) % p)
def fsub(u, v): return ((u[0] - v[0]) % p, (u[1] - v[1]) % p)
def fmul(u, v): return ((u[0]*v[0] - u[1]*v[1]) % p, (u[0]*v[1] + u[1]*v[0]) % p)
def finv(u):
    n = pow(u[0]*u[0] + u[1]*u[1], -1, p)
    return (u[0] * n % p, -u[1] * n % p)
def k(n): return (n % p, 0)

def fsqrt(u):
    """A square root in F_{p^2}, or None (uses p = 3 mod 4)."""
    a0, a1 = u
    n = pow(a0*a0 + a1*a1, (p + 1) // 4, p)          # square root of the norm
    for s in (n, -n):
        x0sq = (a0 + s) * pow(2, -1, p) % p
        x0 = pow(x0sq, (p + 1) // 4, p)
        if x0 * x0 % p == x0sq and x0:
            r = (x0, a1 * pow(2 * x0, -1, p) % p)
            if fmul(r, r) == (a0 % p, a1 % p): return r
    r = (0, pow(-a0 % p, (p + 1) // 4, p))            # u = a0 with -a0 a square
    return r if fmul(r, r) == (a0 % p, a1 % p) else None

# points on y^2 = x^3 + a x + b over F_{p^2}; None is the point at infinity
def add(P, Q, a):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and fadd(P[1], Q[1]) == (0, 0): return None
    if P == Q: lam = fmul(fadd(fmul(k(3), fmul(P[0], P[0])), a), finv(fmul(k(2), P[1])))
    else: lam = fmul(fsub(Q[1], P[1]), finv(fsub(Q[0], P[0])))
    x = fsub(fsub(fmul(lam, lam), P[0]), Q[0])
    return (x, fsub(fmul(lam, fsub(P[0], x)), P[1]))

def mul(n, P, a):
    R = None
    while n:
        if n & 1: R = add(R, P, a)
        P, n = add(P, P, a), n >> 1
    return R

def velu(a, b, K, ell, pts):
    """Isogeny of degree ell (2 or 3) with kernel <K>: new curve and images of pts."""
    xQ, yQ = K
    gx = fadd(fmul(k(3), fmul(xQ, xQ)), a)
    v = gx if ell == 2 else fmul(k(2), gx)
    u = fmul(k(4), fmul(yQ, yQ))
    w = fadd(u, fmul(xQ, v))
    a2, b2 = fsub(a, fmul(k(5), v)), fsub(b, fmul(k(7), w))
    def phi(P):
        if P is None or P[0] == xQ: return None
        x, y = P
        d = finv(fsub(x, xQ)); d2 = fmul(d, d)
        X = fadd(x, fadd(fmul(v, d), fmul(u, d2)))
        Y = fsub(y, fadd(fmul(fmul(k(2), fmul(u, y)), fmul(d2, d)),
                         fmul(fsub(fmul(v, fsub(y, yQ)), fmul(gx, fmul(k(-2), yQ))), d2)))
        return (X, Y)
    return a2, b2, [phi(P) for P in pts]

def walk(a, b, R, ell, e, pts):
    """Isogeny of degree ell^e with kernel <R>, as e steps of degree ell."""
    for i in range(e):
        K = mul(ell ** (e - 1 - i), R, a)               # a point of order ell
        a, b, imgs = velu(a, b, K, ell, [R] + pts)
        R, pts = imgs[0], imgs[1:]
    return a, b, pts

def j_inv(a, b):
    a3 = fmul(k(4), fmul(a, fmul(a, a)))
    return fmul(fmul(k(1728), a3), finv(fadd(a3, fmul(k(27), fmul(b, b)))))

def basis(a, b, ell, e, rng):
    """Two independent points of order ell^e (random points times the cofactor)."""
    pts = []
    while len(pts) < 2:
        x = (rng.randrange(p), rng.randrange(p))
        y = fsqrt(fadd(fmul(x, fmul(x, x)), fadd(fmul(a, x), b)))
        if y is None: continue
        P = mul((p + 1) // ell**e, (x, y), a)
        T = mul(ell ** (e - 1), P, a)
        if T is None: continue                            # order too small
        if pts and any(mul(m, mul(ell ** (e - 1), pts[0], a), a) == T for m in range(ell)):
            continue                                      # not independent of the first
        pts.append(P)
    return pts

rng = random.Random(2022)
a0, b0 = k(1), k(0)                                       # E0: y^2 = x^3 + x, j = 1728
PA, QA = basis(a0, b0, 2, eA, rng)
PB, QB = basis(a0, b0, 3, eB, rng)

sA = rng.randrange(2**eA)                                 # Alice's secret
sB = rng.randrange(3**eB)                                 # Bob's secret
aA, bA, (pPB, pQB) = walk(a0, b0, add(PA, mul(sA, QA, a0), a0), 2, eA, [PB, QB])
aB, bB, (pPA, pQA) = walk(a0, b0, add(PB, mul(sB, QB, a0), a0), 3, eB, [PA, QA])
print("p =", p, "= 2^%d * 3^%d - 1" % (eA, eB))
print("Alice publishes E_A: a =", aA, "b =", bA)
print("   and phi_A(P_B) =", pPB)
print("Bob publishes   E_B: a =", aB, "b =", bB)
print("   and phi_B(P_A) =", pPA)
a1, b1, _ = walk(aB, bB, add(pPA, mul(sA, pQA, aB), aB), 2, eA, [])
a2, b2, _ = walk(aA, bA, add(pPB, mul(sB, pQB, aA), aA), 3, eB, [])
print("Alice's shared j:", j_inv(a1, b1))
print("Bob's shared j:  ", j_inv(a2, b2))
```

It prints:

```text
p = 62207 = 2^8 * 3^5 - 1
Alice publishes E_A: a = (41621, 11542) b = (26554, 60673)
   and phi_A(P_B) = ((8857, 24416), (7089, 55047))
Bob publishes   E_B: a = (4198, 6142) b = (8563, 1725)
   and phi_B(P_A) = ((21602, 5366), (50670, 33331))
Alice's shared j: (42873, 23610)
Bob's shared j:   (42873, 23610)
```

The two $j$-invariants agree, though Alice and Bob reached their final curves by different
walks and their final Weierstrass equations differ. (Run with other secrets, every pair agrees;
128 pairs were tried while writing this chapter.) The toy is insecure for a dull reason: Alice
has only 256 secrets and an attacker can try them all. Its interesting weakness is the one
SIKE shared. Each public key carries two points of order $3^5$ on $E_A$ (one is shown above);
Bob's carries two of order $2^8$. Section 16.5 shows that those extra points are more than
enough to recover the walk without trying anything.

The images leak information in a way any student of pairings can see at once. The Weil pairing
of [Chapter 13 of the mathematics book](../mathematics/13-Counting-Points-and-Pairings.md)
satisfies $e_N(\varphi(P), \varphi(Q)) = e_N(P, Q)^{\deg \varphi}$, so the published images
confirm the secret isogeny's degree. That was by design; the protocol needed the degree to be
public. What nobody could see for eleven years was how to get from "the degree and the values
on the torsion" to "the isogeny itself".

### What SIKE added on top

SIKE (Supersingular Isogeny Key Encapsulation) was the engineering around SIDH that went to
NIST in November 2017. Its main choices:

- **Montgomery curves and $x$-only arithmetic.** Curves $By^2 = x^3 + Ax^2 + x$, with points
  handled by their $x$-coordinates alone (in projective form, to avoid inversions), so that a
  public key is three $x$-coordinates on the curve rather than two full points and a curve
  equation. In SIKE's final version the starting curve was $y^2 = x^3 + 6x^2 + x$, a curve
  2-isogenous to the $y^2 = x^3 + x$ of the toy and, like it, with a known endomorphism ring.
- **Steps of degree 4 and 3.** Alice's walk went in steps of degree 4 (two steps of degree 2
  at once), Bob's in steps of degree 3.
- **Optimal strategies.** A walk of $e$ steps needs, at step $i$, a point of order $\ell$,
  which is $[\ell^{e-1-i}]R$. Recomputing it from scratch costs $O(e^2)$ multiplications; De
  Feo, Jao and Plût (2014) showed how to save intermediate multiples and reach $O(e \log e)$,
  choosing which ones to keep with a small dynamic program.
- **Key compression.** An optional mode shrank public keys further, at a large cost in speed.
- **The FO transform**, as above, so that a key could be used more than once.

None of this touched the published torsion images. They were part of the public key in every
variant, because without them the exchange cannot finish.

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
EUROCRYPT 2023), broke SIKEp434, aimed at NIST level 1, on a single core with the computer
algebra system Magma: in about an hour in the preliminary version (62 minutes in the run they
reported) and in about ten minutes in the revised version. Their attack relied on the starting
curve having a known special structure, which SIKE's did. Within weeks:

- **Luciano Maino and Chloe Martindale** (ePrint 2022/1026, August 2022, with later coauthors)
  gave an attack that works for any starting curve, in subexponential time;
- **Damien Robert** (ePrint 2022/1038, August 2022) showed that by going to higher dimensions,
  up to 8, the attack runs in **polynomial time** for any starting curve.

So SIDH was not weakened but broken outright, at every security level, for every choice of
parameters that publishes torsion images of that kind. The SIKE team agreed that SIKE should
not be used. The attack was classical: it needed no quantum computer at all.

### The month SIKE fell

The dates are worth setting down in order, because the speed was part of the shock.

- **5 July 2022.** NIST names its first four standards and sends four KEMs to a fourth round:
  BIKE, Classic McEliece, HQC and SIKE. SIKE is the only isogeny scheme left.
- **30 July 2022.** Castryck and Decru, of KU Leuven, post "An efficient key recovery attack
  on SIDH (preliminary version)". Their Magma code, appended to the paper, breaks Microsoft's
  two prize challenges, \$IKEp182 and \$IKEp217, in about 4 and 6 minutes, and SIKEp434 in
  about 62 minutes, each on one core of an Intel Xeon E5-2630v2, a processor from 2013. The
  higher levels follow in hours: about 20 hours 37 minutes for SIKEp751, the category 5 set.
  The \$IKEp217 challenge carried a \$50,000 prize; Microsoft had set the challenges up in 2021
  to measure the cost of the best known attacks.
- **First days of August.** The press reports a post-quantum candidate "cracked in an hour on
  a PC". Within days, independent implementations appear, among them one in the free system
  SageMath by Giacomo Pope, Rémy Oudompheng and others, which let anyone rerun the break.
- **8 August.** Maino and Martindale post an attack that needs no special starting curve,
  closing the most obvious escape: choose a random $E_0$ whose endomorphisms nobody knows.
- **10 August.** Robert posts "Breaking SIDH in polynomial time": with isogenies between
  abelian varieties of dimension 4 or 8, any starting curve, any parameters, polynomial time.
- **Soon after.** The SIKE team states that SIKE is insecure and should not be used. The
  revised Castryck-Decru paper, with faster code, reports about ten minutes for SIKEp434.
- **April 2023.** All three papers appear at EUROCRYPT 2023.
- **March 2025.** NIST closes the fourth round with HQC (NIST IR 8545); SIKE is long gone.

Eleven years of study ended in eleven days, from the first paper to the polynomial-time one.
Nothing in the story depended on quantum computers, on large clusters, or on implementation
mistakes. It was mathematics: a 1997 theorem from a neighboring field, read by people who
knew both fields.

### Why the torsion points were the weakness

*Level: expert.*

Start with a counting question. How much information do the torsion images carry about the
secret isogeny? The answer is a short argument that every reader can check.

**Interpolation.** Suppose $\varphi$ and $\varphi'$ are two isogenies $E \to E'$ of the same
degree $d$, and they agree on every point of $E[N]$, the $N$-torsion. Then $\psi = \varphi -
\varphi'$ sends all of $E[N]$ to infinity. The degree is a positive definite quadratic form on
isogenies, so by the Cauchy-Schwarz inequality $\deg \psi \le (\sqrt d + \sqrt d)^2 = 4d$. But
an isogeny that kills all of $E[N]$ factors through multiplication by $N$, which has degree
$N^2$; so either $\psi = 0$ or $\deg \psi \ge N^2$. Hence:

$$N^2 > 4d \quad\Longrightarrow\quad \text{the values on } E[N] \text{ determine the isogeny.}$$

<div class="mars-steps" markdown>

**The numbers, for SIKEp434 and for the toy.**

1. SIKEp434, attacking Bob: $d = 3^{137}$ and $\log_2 d = 137 \times 1.585 = 217.1$, so
   $4d \approx 2^{219.1}$. The images are on $E[2^{216}]$, so $N^2 = 2^{432}$.
2. $2^{432} > 2^{219.1}$ by a factor of about $2^{213}$: the published points pin down Bob's
   secret many times over.
3. The toy of §16.4, attacking Bob: $d = 3^5 = 243$, $4d = 972$, and $N^2 = (2^8)^2 = 65{,}536$.
4. The toy, attacking Alice: $d = 2^8 = 256$, $4d = 1{,}024$, and $N^2 = (3^5)^2 = 59{,}049$.
5. In every case the inequality holds with room to spare. It has to: SIDH needs the two
   torsion groups to be about the same size, $2^{e_A} \approx 3^{e_B}$, so $N^2 \approx d^2$,
   far above $4d$.

</div>

So the information was always there; what was missing was an efficient way to use it. In
dimension 1, knowing an isogeny's values on points does not tell you how to compute it
elsewhere. Kani's theorem supplies the missing machine.

**Kani's diamond.** Take the secret $\varphi : E \to E'$ of degree $d$, and an isogeny
$\gamma : E \to C$ of degree $c$ that the attacker builds himself, with $\gcd(c, d) = 1$ and
$c + d = N$. Complete the square: $\varphi' : C \to D$ is the isogeny with kernel
$\gamma(\ker \varphi)$, and $\gamma' : E' \to D$ the one with kernel $\varphi(\ker \gamma)$, so
that $\varphi' \circ \gamma = \gamma' \circ \varphi$. Now form a 2-by-2 matrix of isogenies,
an isogeny between products of curves:

$$F = \begin{pmatrix} \hat\gamma & \hat\varphi \\ -\varphi' & \gamma' \end{pmatrix} : C
\times E' \longrightarrow E \times D, \qquad \tilde F = \begin{pmatrix} \gamma &
-\hat\varphi' \\ \varphi & \hat\gamma' \end{pmatrix}.$$

Multiply them out. The top-left entry of $F \tilde F$ is $\hat\gamma\gamma +
\hat\varphi\varphi = c + d = N$; the bottom-right is $\varphi'\hat\varphi' +
\gamma'\hat\gamma' = d + c = N$; the off-diagonal entries are $\gamma'\varphi -
\varphi'\gamma = 0$ and its dual. So $F \tilde F = [N]$, and $F$ is an isogeny of surfaces
whose kernel is a subgroup of the $N$-torsion of $C \times E'$. Which subgroup? For $P \in
E[N]$,

$$F(\gamma(P), \varphi(P)) = (\hat\gamma\gamma P + \hat\varphi\varphi P,\; -\varphi'\gamma P
+ \gamma'\varphi P) = ([N]P, 0) = (0, 0),$$

and a count of sizes shows there is nothing else:

$$\ker F = \{(\gamma(P), \varphi(P)) : P \in E[N]\}.$$

That is the whole trick. To write down $\ker F$ the attacker needs $\gamma$ on $E[N]$, which
he can compute because he built $\gamma$, and $\varphi$ on $E[N]$, **which SIDH published**.
With $N = 2^a$, the isogeny $F$ is a chain of $a$ steps of degree $(2, 2)$, computed with
formulas going back to Friedrich Richelot in 1837. Each step is cheap; the chain is
polynomial. And once $F$ is in hand, so is its entry $\hat\varphi$, which evaluates the
secret isogeny anywhere.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Kani's diamond. Top left E, top right E prime, bottom left C, bottom right D. The secret phi of degree d goes from E to E prime; the attacker's gamma of degree c goes from E down to C; phi prime goes from C to D and gamma prime from E prime to D. Below, a box: the 2-dimensional isogeny F from C times E prime to E times D has kernel the pairs gamma of P and phi of P for P in the N-torsion, with N equal to c plus d. Gamma on E[N] is known to the attacker; phi on E[N] is what SIDH published." fill="currentColor" font-size="14">
<defs><marker id="ar16k" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="80" y="45" font-weight="bold">E</text>
<text x="440" y="45" font-weight="bold">E′</text>
<text x="80" y="185" font-weight="bold">C</text>
<text x="440" y="185" font-weight="bold">D</text>
<line x1="100" y1="40" x2="430" y2="40" stroke="currentColor" stroke-width="2.5" marker-end="url(#ar16k)"/>
<text x="265" y="28" text-anchor="middle">φ, degree d (the secret)</text>
<line x1="85" y1="55" x2="85" y2="165" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#ar16k)"/>
<text x="95" y="100" font-size="13">γ, degree c</text>
<text x="95" y="117" font-size="12" fill-opacity=".7">(attacker's)</text>
<line x1="100" y1="180" x2="430" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar16k)"/>
<text x="265" y="170" text-anchor="middle" font-size="13" fill-opacity=".8">φ′, degree d</text>
<line x1="447" y1="55" x2="447" y2="165" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar16k)"/>
<text x="458" y="105" font-size="13" fill-opacity=".8">γ′, degree c</text>
<text x="265" y="110" text-anchor="middle" font-size="13" fill-opacity=".7">φ′ ∘ γ = γ′ ∘ φ</text>
<rect x="40" y="215" width="560" height="100" rx="6" fill="currentColor" fill-opacity=".08" stroke="currentColor"/>
<text x="320" y="240" text-anchor="middle">F : C × E′ → E × D, an (N, N)-isogeny with N = c + d</text>
<text x="320" y="265" text-anchor="middle" font-weight="bold">ker F = { (γ(P), φ(P)) : P in E[N] }</text>
<text x="190" y="295" text-anchor="middle" font-size="13">γ on E[N]: the attacker computes it</text>
<text x="460" y="295" text-anchor="middle" font-size="13">φ on E[N]: SIDH published it</text>
</svg>
<figcaption>Figure 16.3. Kani's diamond. An isogeny of degree d and one of degree c out of the same curve, with c + d = N, combine into a 2-dimensional isogeny F whose kernel is made of their values on the N-torsion. In SIDH the secret's values on the 2-power torsion were public, so the attacker could write down F and compute it.</figcaption>
</figure>

**Making the degrees fit.** Two obstacles remain, and the three papers handled them in turn.

- *The auxiliary isogeny.* The attacker needs $\gamma$ of degree exactly $c = N - d$. SIKE's
  starting curve made that easy. On $y^2 = x^3 + x$ the map $\iota(x, y) = (-x, iy)$ is an
  endomorphism with $\iota^2 = -1$, and $u + v\iota$ has degree $u^2 + v^2$; SIKE's curve
  was 2-isogenous to this one. With a few such tricks, Castryck and Decru could build $\gamma$
  for the degrees they needed. Maino and Martindale removed the need for known endomorphisms,
  at subexponential cost.
- *The size.* For SIKEp434, $3^{137} \approx 2^{217.1}$ is larger than $2^{216}$, so $c = 2^{216}
  - 3^{137}$ is negative. The attacker first guesses a few of Bob's steps of degree 3, which
  leaves an unknown isogeny of smaller degree $3^{137 - \beta}$, and uses a $2^a$ with $a \le
  216$ that exceeds it. Kani's theorem then becomes a test: with a correct guess, the chain of
  $(2,2)$-steps ends at a product of two elliptic curves, $E \times D$; with a wrong guess it
  generically ends at the Jacobian of a genus-2 curve, which does not split. Three guesses per
  step, one run of the test each, 137 steps: that was the original attack.

Robert's polynomial-time version replaced $\gamma$ by something that needs no endomorphisms at
all. By Lagrange's four-square theorem, $c = a_1^2 + a_2^2 + a_3^2 + a_4^2$ for some integers.
The 4-by-4 integer matrix of quaternion multiplication by $a_1 + a_2 i + a_3 j + a_4 k$
satisfies $\alpha^{\mathsf T}\alpha = c \cdot I$, and it acts on $E^4$ (four copies of the curve)
using only additions of points. Kani's construction then runs in dimension 8 instead of 2, for
any starting curve. The same idea gives the general statement now used throughout the field:
an isogeny of any degree is efficiently computable from its values on a large enough torsion
group of smooth order, whatever the curves. The attacker's side of all this, with the cost of each guess, is in
[Chapter 16 of the cryptanalysis book](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md).

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
  used in research protocols, not in standards. Section 16.8 runs it on a toy.
- **SQIsign** (§16.7) was rebuilt around the new tools and became much faster.
- Several new isogeny KEMs and encryption schemes based on 2-dimensional isogenies have been
  proposed since 2023. None has been standardized as of November 2026.

The lesson most often drawn: SIKE's assumption was not the plain "find a path between two
curves" problem but a variant with extra information, and the extra information was fatal. A
scheme should be judged by exactly what it publishes, not by the problem it was inspired by.
Ward Beullens's Rainbow attack (Chapter 15) taught the same lesson the same year.

There is a second, quieter lesson. The interpolation inequality of §16.5, $N^2 > 4d$, is
elementary; a good student could have written it down in 2011. What was missing was a way to
*use* the overdetermined information, and that came from a 1997 paper on genus-2 curves whose
author had no interest in cryptography. Cryptographers now read the abelian-varieties
literature closely, and several groups have gone back over other isogeny assumptions with
"what if we go up a dimension?" in mind. So far the path problem and the endomorphism ring
problem have held; the July 2026 algorithm for the path problem (§16.7) lowered its cost
without breaking it.

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
key and signature together are smaller than an ML-DSA-44 public key alone. The round 3
specification (version 3.0, 1 September 2026) raised them to 83 and 200 bytes, for reasons told
below. The costs: signing takes milliseconds rather than microseconds, the mathematics is far
deeper than any other candidate's, and implementations are complex, with all the risk of side
channels that brings. The 2D-isogeny versions (from 2024) made verification fast enough for
practical use.

### What a signature proves

A Fiat-Shamir signature is a proof of knowledge made non-interactive (Chapter 3). For SQIsign,
the knowledge is the **endomorphism ring** of the public curve: $\mathrm{End}(E_{pk})$, all the
isogenies from $E_{pk}$ to itself. The signer knows it because she made $E_{pk}$ by a secret
walk $\varphi_{sk}$ from $E_0$, whose ring is public; a path plus one known ring gives the
other ring in polynomial time. Anyone else faces the endomorphism ring problem, problem 2 of
§16.3, equivalent to the path problem.

The protocol behind the signature (Figure 16.4) runs in three moves:

1. **Commit.** The signer takes a fresh random walk $\varphi_{com} : E_0 \to E_{com}$, so she
   knows $\mathrm{End}(E_{com})$, and sends $E_{com}$.
2. **Challenge.** The verifier picks a random isogeny $\varphi_{chl} : E_{pk} \to E_{chl}$. In
   the signature, the challenge is a hash of the public key, $E_{com}$ and the message.
3. **Respond.** Knowing $\mathrm{End}(E_{pk})$ and $\varphi_{chl}$, the signer computes
   $\mathrm{End}(E_{chl})$; knowing both $\mathrm{End}(E_{com})$ and $\mathrm{End}(E_{chl})$, she
   finds an isogeny $\varphi_{rsp} : E_{com} \to E_{chl}$ of a prescribed shape, translating
   between quaternion ideals and isogenies. The verifier checks that $\varphi_{rsp}$ really
   goes from $E_{com}$ to $E_{chl}$.

The specification points out a trap in this outline. A cheater could build $E_{com}$ by walking
*from the public key*, $\varphi_{cheat} : E_{pk} \to E_{com}$, and answer any challenge with
$\varphi_{chl} \circ \hat\varphi_{cheat}$, a perfectly valid isogeny from $E_{com}$ to
$E_{chl}$ that needs no secret at all. The fix is to forbid responses that contain the
challenge as a piece: in the round 3 version, the challenge is a walk of $\lambda$ steps of
degree 2 (128 steps at level I) and the response must have *odd* degree, so the two can share
no factor. With that rule, a valid response proves knowledge of a nontrivial endomorphism of
$E_{pk}$, and computing even one such endomorphism is as hard as computing the whole ring
(Page and Wesolowski, 2024). The resulting security proof is tight under standard heuristics.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="SQIsign's identification protocol. From the public starting curve E0, a secret isogeny phi_sk goes to the public key E_pk and a secret isogeny phi_com goes to the commitment E_com. A public challenge isogeny phi_chl, derived from a hash of the message, goes from E_pk to E_chl. The response phi_rsp, which the signer computes with her secret, goes from E_com to E_chl and is the signature." fill="currentColor" font-size="14">
<defs><marker id="ar16s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="320" y="40" text-anchor="middle" font-weight="bold">E₀</text>
<text x="320" y="58" text-anchor="middle" font-size="12" fill-opacity=".7">public, End(E₀) known</text>
<line x1="300" y1="65" x2="125" y2="185" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#ar16s)"/>
<line x1="340" y1="65" x2="515" y2="185" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#ar16s)"/>
<text x="205" y="118" text-anchor="end" font-size="13">φ_sk (secret key)</text>
<text x="440" y="118" font-size="13">φ_com (secret, fresh)</text>
<text x="100" y="205" text-anchor="middle" font-weight="bold">E_pk</text>
<text x="100" y="223" text-anchor="middle" font-size="12" fill-opacity=".7">public key</text>
<text x="540" y="205" text-anchor="middle" font-weight="bold">E_com</text>
<text x="540" y="223" text-anchor="middle" font-size="12" fill-opacity=".7">commitment</text>
<text x="320" y="270" text-anchor="middle" font-weight="bold">E_chl</text>
<line x1="125" y1="215" x2="295" y2="260" stroke="currentColor" stroke-width="2" marker-end="url(#ar16s)"/>
<line x1="515" y1="215" x2="345" y2="260" stroke="currentColor" stroke-width="3" marker-end="url(#ar16s)"/>
<text x="30" y="250" font-size="13">φ_chl = hash(pk, E_com, m)</text>
<text x="610" y="250" text-anchor="end" font-size="13">φ_rsp: the signature</text>
<text x="320" y="160" text-anchor="middle" font-size="12" fill-opacity=".7">dashed: known only to the signer</text>
<text x="320" y="177" text-anchor="middle" font-size="12" fill-opacity=".7">solid: public, checked by the verifier</text>
</svg>
<figcaption>Figure 16.4. SQIsign's identification protocol. The signer walks secretly to her public key and, for each signature, to a fresh commitment; the hash of the message fixes a challenge walk; the response joins the commitment to the challenge curve, which only someone who knows End(E_pk) can do. The response must not contain the challenge as a piece.</figcaption>
</figure>

The response reveals a fresh isogeny between two curves, not anything about $\varphi_{sk}$.
Showing that it leaks nothing (the zero-knowledge part) was the weak point of the first
versions, where responses came from an ad hoc distribution. Since the round 2 version, the
response is drawn uniformly from all isogenies of bounded degree between the two curves, a
distribution that can be simulated, and key generation picks a uniformly random curve, so key
recovery is as hard as the worst case of the endomorphism ring problem.

### Why the signature is so small

A SQIsign signature is a description of one isogeny, and since 2024 the description is by
**interpolation**: a curve and the images of a basis of torsion points, which by the $N^2 > 4d$
argument of §16.5 pin the isogeny down, and which a verifier turns into the isogeny with a
chain of 2-dimensional steps. The tool that broke SIDH became SQIsign's encoding. The irony is
exact: SQIsign publishes torsion images of the response, which is harmless because the response
is a fresh public object, not the secret.

<div class="mars-steps" markdown>

**Counting the bytes of a round 3 signature at level I.**

1. The prime is $p = 3 \cdot 2^{324} - 1$, of 326 bits, so an element of $\mathbb{F}_p$ takes
   $\lceil 326/8 \rceil = 41$ bytes and an element of $\mathbb{F}_{p^2}$ takes 82.
2. **Public key:** the Montgomery coefficient $A$ of $E_{pk}$, one $\mathbb{F}_{p^2}$ element,
   plus one byte of hints that help the verifier find a torsion basis: $82 + 1 = 83$ bytes.
3. **Signature:** an auxiliary curve, one $\mathbb{F}_{p^2}$ element (82 bytes); the four
   entries of a 2-by-2 matrix that says where the response sends a fixed torsion basis, 25
   bytes each (100 bytes); the challenge as an integer of $\lambda/8 = 16$ bytes; and 2 bytes of hints.
4. Total: $82 + 100 + 16 + 2 = 200$ bytes. The specification's table gives 83 and 200.
5. The same count at level V, where $p = 17 \cdot 2^{664} - 1$ takes 84 bytes per
   $\mathbb{F}_p$ element: public key $1 + 168 = 169$, signature $2 + 168 + 4 \cdot 51 + 32 =
   406$.

</div>

Compare ML-DSA-44, where the public key is a vector of polynomials and the signature another
vector plus a hint: thousands of coefficients, each a few bits. SQIsign's objects are curves,
and a curve is one field element.

### From 2020 to round 3

SQIsign has been rebuilt more than once, and the sizes in older papers are not today's.

- **2020, the original.** KLPT-based responses represented as long chains of small isogenies;
  signing took seconds in the first implementation.
- **June 2023, round 1 of NIST's additional signatures.** Level I: 64-byte public key,
  782-byte secret key, 177-byte signature, with signing in billions of cycles.
- **2024, the 2-dimensional versions.** SQIsignHD (Dartois, Leroux, Robert and Wesolowski,
  EUROCRYPT 2024) represented the response by interpolation, the idea of the SIDH attacks.
  SQIsign2D-West (Basso and others, ASIACRYPT 2024) and its relatives turned it into a
  practical scheme.
- **February 2025, round 2.** Level I: 65 / 353 / 148 bytes. Signing nearly 20 times faster
  than round 1, at about 103 million cycles, and verification more than 6 times faster, at
  about 5.1 million.
- **14 May 2026.** NIST advances nine candidates to round 3 (NIST IR 8610), SQIsign among
  them; HAWK's team withdrew on 29 July, leaving eight.
- **20 July 2026.** Wesolowski posts "The supersingular isogeny problem in time and memory
  $p^{1/3+o(1)}$" (ePrint 2026/1486), a heuristic algorithm improving the decades-old
  $p^{1/2}$ bound for the problem SQIsign rests on.
- **1 September 2026, the round 3 specification (version 3.0).** Level I: 83 / 270 / 200
  bytes, with $p = 3 \cdot 2^{324} - 1$ instead of round 2's $p = 5 \cdot 2^{248} - 1$. Signing
  takes about 94 million cycles (27.6 ms) and verification about 12 million (3.6 ms) on an
  Intel Core i7-13700K. Quaternion arithmetic was rewritten in fixed precision, floating point
  dropped, and the response changed to odd degree.

The new attack is the reason for the larger prime. It needs as much memory as time, and the
SQIsign team priced it with a time-memory trade-off ($t^2 w \approx p$, against $t^2 \approx p$
for older methods) rather than assuming free memory. Its specification calls the new
parameters "a middle-of-the-road approach" and says plainly that the concrete security is "in
flux". An independent cost analysis (Mamah, ePrint 2026/1821, August 2026) expects the new
algorithm to improve on the state of the art only at level I, because its memory demands
cancel the gain at higher levels. As of November 2026 SQIsign's sizes may move again before
NIST decides.

<figure class="mars-fig">
<svg viewBox="0 0 640 385" width="640" role="img" aria-label="Bar chart on a logarithmic scale of public key plus signature, or public key plus ciphertext, in bytes, for the smallest parameter set of each scheme. Signatures: SQIsign round 2, 213; SQIsign round 3, 283; Falcon-512, 1,563; MAYO_1, 1,920; ML-DSA-44, 3,732; SLH-DSA-SHA2-128s, 7,888; UOV-Ip with compressed key, 46,726. KEMs: CSIDH-512, 128; SIKEp434, 676; ML-KEM-512, 1,568." fill="currentColor" font-size="14">
<line x1="230" y1="62" x2="230" y2="352" stroke="currentColor" stroke-opacity=".25"/>
<text x="230" y="372" text-anchor="middle" font-size="12" fill-opacity=".7">100</text>
<line x1="360" y1="62" x2="360" y2="352" stroke="currentColor" stroke-opacity=".25"/>
<text x="360" y="372" text-anchor="middle" font-size="12" fill-opacity=".7">1,000</text>
<line x1="490" y1="62" x2="490" y2="352" stroke="currentColor" stroke-opacity=".25"/>
<text x="490" y="372" text-anchor="middle" font-size="12" fill-opacity=".7">10,000</text>
<line x1="620" y1="62" x2="620" y2="352" stroke="currentColor" stroke-opacity=".25"/>
<text x="636" y="372" text-anchor="end" font-size="12" fill-opacity=".7">100,000</text>
<text x="10" y="54" font-weight="bold">Signatures: public key + signature</text>
<text x="222" y="79" text-anchor="end" font-size="13">SQIsign NIST-I, round 2</text>
<rect x="230" y="66" width="43" height="17" fill-opacity=".85"/>
<text x="279" y="79" font-size="12">213</text>
<text x="222" y="105" text-anchor="end" font-size="13">SQIsign NIST-I, round 3</text>
<rect x="230" y="92" width="59" height="17" fill-opacity=".85"/>
<text x="295" y="105" font-size="12">283</text>
<text x="222" y="131" text-anchor="end" font-size="13">Falcon-512</text>
<rect x="230" y="118" width="155" height="17" fill-opacity=".35"/>
<text x="391" y="131" font-size="12">1,563</text>
<text x="222" y="157" text-anchor="end" font-size="13">MAYO_1</text>
<rect x="230" y="144" width="167" height="17" fill-opacity=".35"/>
<text x="403" y="157" font-size="12">1,920</text>
<text x="222" y="183" text-anchor="end" font-size="13">ML-DSA-44</text>
<rect x="230" y="170" width="204" height="17" fill-opacity=".35"/>
<text x="440" y="183" font-size="12">3,732</text>
<text x="222" y="209" text-anchor="end" font-size="13">SLH-DSA-SHA2-128s</text>
<rect x="230" y="196" width="247" height="17" fill-opacity=".35"/>
<text x="483" y="209" font-size="12">7,888</text>
<text x="222" y="235" text-anchor="end" font-size="13">UOV-Ip, compressed key</text>
<rect x="230" y="222" width="347" height="17" fill-opacity=".35"/>
<text x="583" y="235" font-size="12">46,726</text>
<text x="10" y="262" font-weight="bold">KEMs: public key + ciphertext</text>
<text x="222" y="287" text-anchor="end" font-size="13">CSIDH-512 (two public keys)</text>
<rect x="230" y="274" width="14" height="17" fill-opacity=".85"/>
<text x="250" y="287" font-size="12">128</text>
<text x="222" y="313" text-anchor="end" font-size="13">SIKEp434 (broken 2022)</text>
<rect x="230" y="300" width="108" height="17" fill-opacity=".85"/>
<text x="344" y="313" font-size="12">676</text>
<text x="222" y="339" text-anchor="end" font-size="13">ML-KEM-512</text>
<rect x="230" y="326" width="155" height="17" fill-opacity=".35"/>
<text x="391" y="339" font-size="12">1,568</text>
</svg>
<figcaption>Figure 16.5. What travels, in bytes, for the smallest parameter set of each scheme (log scale; isogeny schemes dark). SQIsign's round 3 parameters cost it 70 bytes and it still leads by a factor of five. CSIDH-512's quantum security is disputed (§16.8), and SIKE is broken: small is not the same as safe.</figcaption>
</figure>

!!! note "Life story: SQIsign"
    **Born:** 2020, Luca De Feo, David Kohel, Antonin Leroux, Christophe Petit and Benjamin
    Wesolowski (ASIACRYPT 2020), from the KLPT algorithm of 2014 and the Deuring
    correspondence · **Purpose:** the shortest post-quantum signatures, by proving knowledge of
    a curve's endomorphism ring · **Helped:** made the endomorphism ring problem a mainstream
    assumption; turned the SIDH attack's higher-dimensional isogenies into a construction tool ·
    **Status (Nov 2026):** round 3 candidate in NIST's additional signatures, with a 36-author
    team; version 3.0 of 1 September 2026 enlarged its parameters after Wesolowski's own
    $p^{1/3}$ algorithm; signing is not yet constant time.

## 16.8 CSIDH: a group action in code

*Level: intermediate.*

SIDH needed torsion images because its walks do not commute. CSIDH (pronounced "seaside")
avoids them by using a smaller, more structured world where the steps do commute. Take a
prime $p = 4 \ell_1 \ell_2 \cdots \ell_n - 1$, with the $\ell_i$ small odd primes, and look
only at supersingular curves *defined over* $\mathbb{F}_p$, written in Montgomery form $y^2 =
x^3 + Ax^2 + x$. Every such curve has $p + 1$ points over $\mathbb{F}_p$, so for each $\ell_i$
it has exactly one subgroup of order $\ell_i$ whose points have coordinates in $\mathbb{F}_p$.
The isogeny with that kernel is a step called $\mathfrak{l}_i$. The step "the other way",
$\mathfrak{l}_i^{-1}$, uses the order-$\ell_i$ subgroup whose points have $x$ in
$\mathbb{F}_p$ but $y$ outside it, the points of the quadratic twist.

The steps form a commutative group, the **class group**, and it *acts* on the curves: any
sequence of steps can be reordered without changing the end. A secret key is a vector of
exponents $(e_1, \ldots, e_n)$, meaning "take $e_i$ steps of type $\mathfrak{l}_i$ (backwards
if $e_i < 0$)"; the public key is the end curve, one number $A$. Then

$$[\mathfrak{a}][\mathfrak{b}]E_0 = [\mathfrak{b}][\mathfrak{a}]E_0,$$

and Diffie-Hellman works exactly as with numbers: Alice publishes $[\mathfrak{a}]E_0$, Bob
publishes $[\mathfrak{b}]E_0$, and each applies his own secret to the other's curve. No
torsion points are published, so there is nothing for Kani's theorem to work on.

The real parameter set, CSIDH-512, uses 74 primes: the 73 smallest odd primes and 587, giving a
511-bit $p$. Exponents run from $-5$ to $5$, so there are $11^{74} \approx 2^{256}$ secret
vectors. A public key is one element of $\mathbb{F}_p$, 64 bytes. The smallest CSIDH has
$p = 4 \cdot 3 \cdot 5 \cdot 7 - 1 = 419$, the example of the original paper, and fits on a
page.

<div class="mars-steps" markdown>

**One step by hand: $\mathfrak{l}_3$ on $E_0 : y^2 = x^3 + x$ over $\mathbb{F}_{419}$.**

1. A point of order 3 on $y^2 = x^3 + Ax^2 + x$ has $3x^4 + 4Ax^3 + 6x^2 - 1 = 0$. With $A =
   0$ this is a quadratic in $u = x^2$: $3u^2 + 6u - 1 = 0$.
2. Its root in $\mathbb{F}_{419}$ that is a square is $u = 259$: check $3 \cdot 259^2 + 6 \cdot
   259 - 1 = 3 \cdot 41 + 297 - 1 = 419 \equiv 0$, since $259^2 = 67{,}081 = 160 \cdot 419 +
   41$ and $6 \cdot 259 = 1{,}554 = 3 \cdot 419 + 297$.
3. So $x = \pm 178$ ($178^2 = 31{,}684 = 75 \cdot 419 + 259$). For $x = 178$, $x^3 + x$ is a
   square in $\mathbb{F}_{419}$: the point has $y$ in the field, and its subgroup is the
   kernel of $\mathfrak{l}_3$. For $x = -178 = 241$, $y$ lies outside: that is
   $\mathfrak{l}_3^{-1}$.
4. Vélu's formulas in Montgomery form, for a kernel $\{\infty, \pm K\}$ of order 3: the new
   coefficient is $B = x_K^2\,(A - 6(x_K - 1/x_K))$. With $A = 0$ this is $B = 6x_K(1 - x_K^2)$.
5. $x_K = 178$: $6 \cdot 178 = 1{,}068 \equiv 230$ and $1 - 259 = -258 \equiv 161$, so $B = 230
   \cdot 161 = 37{,}030 = 88 \cdot 419 + 158$. **$\mathfrak{l}_3$ sends $A = 0$ to $A = 158$.**
6. $x_K = 241$ gives $B = -158 \equiv 261$: $\mathfrak{l}_3^{-1}$ sends $A = 0$ to $A = 261$.

</div>

**Code it.** The class group action for $p = 419$: walk around with each kind of step until it
returns to $A = 0$, then a key exchange with exponents from $-2$ to $2$. A step backwards is
done on the twist: $[\mathfrak{l}^{-1}]E_A$ is the twist of $[\mathfrak{l}]E_{-A}$, and the
twist of $E_A$ is $E_{-A}$.

```python
import random
ells = [3, 5, 7]
p = 4 * 3 * 5 * 7 - 1                     # 419, prime; p + 1 = 4 * 3 * 5 * 7

def is_square(n): return pow(n % p, (p - 1) // 2, p) in (0, 1)

# points on the Montgomery curve y^2 = x^3 + A x^2 + x over F_p; None is infinity
def add(P, Q, A):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    if P == Q: lam = (3 * P[0]**2 + 2 * A * P[0] + 1) * pow(2 * P[1], -1, p) % p
    else: lam = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x = (lam * lam - A - P[0] - Q[0]) % p
    return (x, (lam * (P[0] - x) - P[1]) % p)

def mul(n, P, A):
    R = None
    while n:
        if n & 1: R = add(R, P, A)
        P, n = add(P, P, A), n >> 1
    return R

def act_one(A, ell, rng):
    """[l]E_A for the ideal l = (ell, pi - 1): an ell-isogeny with an F_p-rational kernel."""
    while True:
        x = rng.randrange(1, p)
        rhs = (x**3 + A * x * x + x) % p
        if not is_square(rhs): continue
        y = pow(rhs, (p + 1) // 4, p)
        K = mul((p + 1) // ell, (x, y), A)               # a point of order ell, or infinity
        if K is not None: break
    pi, sigma, Q = 1, 0, K                               # the Montgomery form of Velu's formulas
    for _ in range((ell - 1) // 2):
        pi, sigma = pi * Q[0] % p, (sigma + Q[0] - pow(Q[0], -1, p)) % p
        Q = add(Q, K, A)
    return pi * pi * (A - 6 * sigma) % p

def act(A, exps, rng):
    """Apply l_1^e_1 ... l_n^e_n; a negative exponent works on the quadratic twist, E_{-A}."""
    for ell, e in zip(ells, exps):
        for _ in range(abs(e)):
            A = act_one(A, ell, rng) if e > 0 else -act_one(-A % p, ell, rng) % p
    return A

rng = random.Random(419)
for ell in ells:                          # follow one kind of step until it comes back
    cycle, A = [0], act_one(0, ell, rng)
    while A != 0:
        cycle.append(A)
        A = act_one(A, ell, rng)
    print(f"l_{ell}-cycle from A = 0 ({len(cycle)} curves):", cycle)

alice = [rng.randrange(-2, 3) for _ in ells]     # exponents in [-2, 2]
bob = [rng.randrange(-2, 3) for _ in ells]
A_pub, B_pub = act(0, alice, rng), act(0, bob, rng)
print("Alice's secret", alice, "public A =", A_pub)
print("Bob's secret  ", bob, "public B =", B_pub)
print("Alice computes", act(B_pub, alice, rng), "  Bob computes", act(A_pub, bob, rng))
```

It prints:

```text
l_3-cycle from A = 0 (27 curves): [0, 158, 410, 368, 404, 75, 144, 191, 174, 413, 379, 124, 199, 390, 29, 220, 295, 40, 6, 245, 228, 275, 344, 15, 51, 9, 261]
l_5-cycle from A = 0 (9 curves): [0, 199, 51, 413, 275, 144, 6, 368, 220]
l_7-cycle from A = 0 (27 curves): [0, 75, 379, 220, 228, 9, 368, 174, 390, 6, 15, 158, 144, 124, 295, 275, 261, 404, 413, 29, 245, 51, 410, 191, 199, 40, 344]
Alice's secret [-2, 1, 0] public A = 379
Bob's secret   [-1, 2, 1] public B = 158
Alice computes 124   Bob computes 124
```

The last line is the check that the action commutes: Alice applied $(-2, 1, 0)$ after Bob's
$(-1, 2, 1)$, Bob the other way round, and both reached $A = 124$. The first line agrees with the hand computation: $\mathfrak{l}_3$ sends 0 to 158, and
the last curve before the cycle closes, the one $\mathfrak{l}_3^{-1}$ reaches from 0, is 261.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="The 27 supersingular Montgomery curves over F_419 drawn on a circle in the order the step l_3 visits them, starting at A equal 0 and going clockwise through 158, 410, 368 and so on, ending at 261. A dashed chord shows that the step l_5 jumps from 0 to 199, twelve places around, and another shows that l_7 jumps from 0 to 75, five places around." fill="currentColor" font-size="13">
<defs><marker id="ar16c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<circle cx="230" cy="200" r="140" fill="none" stroke="currentColor" stroke-opacity=".5"/>
<circle cx="230" cy="60" r="5"/>
<text x="230" y="44" text-anchor="middle" font-size="11" font-weight="bold">0</text>
<circle cx="262" cy="64" r="3.5"/>
<text x="267" y="48" text-anchor="middle" font-size="11">158</text>
<circle cx="293" cy="75" r="3.5"/>
<text x="302" y="61" text-anchor="middle" font-size="11" fill-opacity=".75">410</text>
<circle cx="320" cy="93" r="3.5"/>
<text x="333" y="81" text-anchor="middle" font-size="11" fill-opacity=".75">368</text>
<circle cx="342" cy="116" r="3.5"/>
<text x="358" y="108" text-anchor="middle" font-size="11" fill-opacity=".75">404</text>
<circle cx="359" cy="145" r="3.5"/>
<text x="377" y="141" text-anchor="middle" font-size="11">75</text>
<circle cx="368" cy="176" r="3.5"/>
<text x="388" y="176" text-anchor="middle" font-size="11" fill-opacity=".75">144</text>
<circle cx="370" cy="208" r="3.5"/>
<text x="390" y="213" text-anchor="middle" font-size="11" fill-opacity=".75">191</text>
<circle cx="364" cy="240" r="3.5"/>
<text x="383" y="250" text-anchor="middle" font-size="11" fill-opacity=".75">174</text>
<circle cx="351" cy="270" r="3.5"/>
<text x="369" y="284" text-anchor="middle" font-size="11" fill-opacity=".75">413</text>
<circle cx="332" cy="296" r="3.5"/>
<text x="346" y="314" text-anchor="middle" font-size="11" fill-opacity=".75">379</text>
<circle cx="307" cy="317" r="3.5"/>
<text x="318" y="338" text-anchor="middle" font-size="11" fill-opacity=".75">124</text>
<circle cx="278" cy="332" r="3.5"/>
<text x="285" y="354" text-anchor="middle" font-size="11">199</text>
<circle cx="246" cy="339" r="3.5"/>
<text x="249" y="363" text-anchor="middle" font-size="11" fill-opacity=".75">390</text>
<circle cx="214" cy="339" r="3.5"/>
<text x="211" y="363" text-anchor="middle" font-size="11" fill-opacity=".75">29</text>
<circle cx="182" cy="332" r="3.5"/>
<text x="175" y="354" text-anchor="middle" font-size="11" fill-opacity=".75">220</text>
<circle cx="153" cy="317" r="3.5"/>
<text x="142" y="338" text-anchor="middle" font-size="11" fill-opacity=".75">295</text>
<circle cx="128" cy="296" r="3.5"/>
<text x="114" y="314" text-anchor="middle" font-size="11" fill-opacity=".75">40</text>
<circle cx="109" cy="270" r="3.5"/>
<text x="91" y="284" text-anchor="middle" font-size="11" fill-opacity=".75">6</text>
<circle cx="96" cy="240" r="3.5"/>
<text x="77" y="250" text-anchor="middle" font-size="11" fill-opacity=".75">245</text>
<circle cx="90" cy="208" r="3.5"/>
<text x="70" y="213" text-anchor="middle" font-size="11" fill-opacity=".75">228</text>
<circle cx="92" cy="176" r="3.5"/>
<text x="72" y="176" text-anchor="middle" font-size="11" fill-opacity=".75">275</text>
<circle cx="101" cy="145" r="3.5"/>
<text x="83" y="141" text-anchor="middle" font-size="11" fill-opacity=".75">344</text>
<circle cx="118" cy="116" r="3.5"/>
<text x="102" y="108" text-anchor="middle" font-size="11" fill-opacity=".75">15</text>
<circle cx="140" cy="93" r="3.5"/>
<text x="127" y="81" text-anchor="middle" font-size="11" fill-opacity=".75">51</text>
<circle cx="167" cy="75" r="3.5"/>
<text x="158" y="61" text-anchor="middle" font-size="11" fill-opacity=".75">9</text>
<circle cx="198" cy="64" r="3.5"/>
<text x="193" y="48" text-anchor="middle" font-size="11" fill-opacity=".75">261</text>
<line x1="231" y1="66" x2="275" y2="324" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#ar16c)"/>
<line x1="234" y1="64" x2="352" y2="141" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 3" marker-end="url(#ar16c)"/>
<text x="430" y="70" font-weight="bold">The class group of p = 419</text>
<text x="430" y="95" font-size="12">circle: one step of l₃ each,</text>
<text x="430" y="111" font-size="12">clockwise; 27 steps close it</text>
<text x="430" y="139" font-size="12">dashed: l₅ = 12 steps of l₃</text>
<text x="430" y="155" font-size="12">(0 → 199)</text>
<text x="430" y="183" font-size="12">dotted: l₇ = 5 steps of l₃</text>
<text x="430" y="199" font-size="12">(0 → 75)</text>
<text x="430" y="227" font-size="12">Every secret is a number of</text>
<text x="430" y="243" font-size="12">places around one ring, so</text>
<text x="430" y="259" font-size="12">any two secrets commute.</text>
<text x="430" y="287" font-size="12" fill-opacity=".7">Real CSIDH-512: roughly 2²⁵⁶</text>
<text x="430" y="303" font-size="12" fill-opacity=".7">curves, 74 kinds of step.</text>
</svg>
<figcaption>Figure 16.6. CSIDH's action on the 27 supersingular Montgomery curves over F₄₁₉, from the program's output. The step l₃ visits them all in one cycle; l₅ and l₇ are jumps around the same cycle, which is why the order of steps never matters.</figcaption>
</figure>

The output says more than "it works". The $\mathfrak{l}_3$-cycle passes through all 27
curves, so the class group here is cyclic of order 27 and $\mathfrak{l}_3$ generates it. The
$\mathfrak{l}_5$-cycle has 9 curves, and its second curve, 199, sits 12 places along the
$\mathfrak{l}_3$-cycle: $\mathfrak{l}_5 = \mathfrak{l}_3^{12}$, and $12 \cdot 9 = 108 = 4 \cdot
27$, consistent with a cycle of length 9. Likewise $\mathfrak{l}_7 = \mathfrak{l}_3^{5}$, since
75 sits 5 places along. Every secret is therefore a single number modulo 27 in disguise.

That observation is the whole security problem in miniature. If you know the group's
structure (here, that $\mathfrak{l}_5 = \mathfrak{l}_3^{12}$ and $\mathfrak{l}_7 =
\mathfrak{l}_3^5$), a public key reduces to a discrete logarithm in a cyclic group, and a
quantum computer solves the hidden-shift version of that problem with Kuperberg's algorithm in
subexponential time. For CSIDH-512 the group structure is known: Ward Beullens, Thorsten
Kleinjung and Frederik Vercauteren computed it in 2019, which gave the signature scheme
CSI-FiSh and also made every CSIDH-512 key a well-defined number.

**The quantum debate.** Kuperberg's algorithm needs about $2^{O(\sqrt{\log N})}$ queries for a
group of size $N$, and each query is a quantum evaluation of the group action, which is
expensive. How these two costs multiply decides the parameters. The original paper claimed
NIST level 1 for CSIDH-512. Chris Peikert, and separately Xavier Bonnetain and André
Schrottenloher (both EUROCRYPT 2020), argued that it falls short; later estimates ("The SQALE
of CSIDH", Chávez-Saab, Chi-Domínguez, Jaques and Rodríguez-Henríquez, 2022) put level 1 at a
prime of at least about 2,000 bits, with slower operations to match. As of November 2026 there
is no agreement, which is one reason CSIDH stays a research scheme.

**Constant time.** A naive implementation takes a different number of steps for each secret
exponent, and leaks it through timing. CTIDH (Banegas and others, CHES 2021) groups the
primes into batches and hides which prime in a batch is used, giving constant-time CSIDH-style
key exchange faster than earlier constant-time implementations.

**Where it fits.** CSIDH's one feature no lattice scheme offers is a **non-interactive** key
exchange: two parties who know each other's public keys share a key without sending anything.
Arcadia City's links to Earth make that tempting. A one-way light delay of 3 to 22 minutes
means a key agreement that needs a reply costs a 6- to 44-minute round trip. With a KEM like
ML-KEM the round trip can be avoided too, since the sender encapsulates to the receiver's
known public key and sends the ciphertext with the first message; what a KEM cannot do is let
*both* sides hold the key before any message is sent, for example to authenticate a scheduled
burst of telemetry that arrives while its sender is out of contact. For that, CSIDH-style
static keys are the only post-quantum candidate, and their quantum sizing is still argued. The
city's engineers use ML-KEM with keys sent ahead in the previous day's traffic instead.

## 16.9 In the real world

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
where every byte counts: certificate chains, blockchains, and constrained radio links. Its
team lists the open problems plainly: signing is complex, the submitted implementations do not
yet run in constant time (the field, curve, pairing and isogeny arithmetic does, the full
signing procedure does not), and the parameters were revised in September 2026 after a new
attack. Verification is simpler and about eight times faster than signing, which suits uses
where a few signers serve many verifiers. Internet-Drafts already describe how SQIsign keys
and signatures would be carried in COSE, the signing format used by small devices.

**Mars.** The city's surface beacons, which broadcast a signed position and status message to
rovers every few seconds over a slow radio link, have about 300 bytes per frame for the whole
message. An ML-DSA signature does not fit at all; a UOV signature fits, but each beacon's
public key, 46 kilobytes even compressed, would have to be loaded into every rover; a SQIsign
signature fits with room to spare: at the round 3 sizes, 200 bytes of signature leave 100 for
the message, and the 83-byte public key is smaller than a line of text. The trade is on the
beacon's side: a 28-millisecond signature every few seconds is affordable on a beacon's
processor, and rovers verify in under 4 milliseconds. The beacon network's engineers have
prototypes, and wait for NIST's decision before trusting it with navigation, all the more
since the September 2026 size change showed the parameters can still move.

## 16.10 Going deeper

*Level: expert.*

- **Foundations.** Joseph Silverman, *The Arithmetic of Elliptic Curves*, 2nd edition
  (Springer, 2009), chapter III on isogenies; Luca De Feo, "Mathematics of Isogeny Based
  Cryptography" (lecture notes, 2017, arXiv:1711.04062).
- **SIDH.** Jao and De Feo (PQCrypto 2011); Galbraith, Petit, Shani and Ti, "On the Security of
  Supersingular Isogeny Cryptosystems" (ASIACRYPT 2016); De Feo, Jao and Plût on optimal
  strategies (*Journal of Mathematical Cryptology*, 2014).
- **The break.** Castryck and Decru, "An Efficient Key Recovery Attack on SIDH" (EUROCRYPT 2023);
  Maino, Martindale, Panny, Pope and Wesolowski, "A Direct Key Recovery Attack on SIDH"
  (EUROCRYPT 2023); Robert, "Breaking SIDH in Polynomial Time" (EUROCRYPT 2023). Kani's
  original theorem is in Ernst Kani, "The number of curves of genus two with elliptic
  differentials" (*Journal für die reine und angewandte Mathematik*, 1997).
- **Higher dimensions as a tool.** Dartois, Leroux, Robert and Wesolowski, "SQIsignHD"
  (EUROCRYPT 2024); Basso and others, "SQIsign2D-West" (ASIACRYPT 2024). Robert's later
  surveys explain how "an isogeny is determined by its values on enough torsion" became a
  standard way to represent isogenies.
- **CSIDH and its quantum security.** Castryck, Lange, Martindale, Panny and Renes (ASIACRYPT
  2018); Peikert, "He Gives C-Sieves on the CSIDH" (EUROCRYPT 2020); Bonnetain and
  Schrottenloher (EUROCRYPT 2020); "The SQALE of CSIDH" (2022) for sizing; CTIDH (CHES 2021)
  for constant time; CSI-FiSh (ASIACRYPT 2019) for signatures from the computed class group.
- **SQIsign.** De Feo, Kohel, Leroux, Petit and Wesolowski (ASIACRYPT 2020), and the round 3
  specification, version 3.0 (1 September 2026), whose chapter 8 surveys every known attack.
  For the July 2026 algorithm: Wesolowski, ePrint 2026/1486, and its cost analysis by Mamah,
  ePrint 2026/1821.
- **Graphs.** Charles, Goren and Lauter, "Cryptographic Hash Functions from Expander Graphs"
  (*Journal of Cryptology*, 2009).
- **Open questions.** Is there a polynomial-time quantum algorithm for the endomorphism ring
  problem? Can SQIsign's signing be made constant time without losing its speed? Can a KEM be
  built from 2-dimensional isogenies that beats ML-KEM on size without SIDH's leak? All three
  are open as of November 2026.

## Check yourself

??? question "1. What is an isogeny, and what determines it?"

    A map between elliptic curves given by rational functions that respects the group law. It
    is determined, up to isomorphism of the target, by its kernel, a finite subgroup.

??? question "2. In the Vélu example, what were the target curve and the two point counts?"

    $E': y^2 = x^3 + 59x + 65$ over $\mathbb{F}_{101}$; both curves have 114 points, though
    their $j$-invariants (8 and 29) differ.

??? question "3. What did SIDH publish besides the curve at the end of each walk, and why could it not leave that out?"

    The images of the other party's torsion basis under its secret isogeny. Without them the
    other party cannot name the pushed-forward kernel $\varphi_B(K_A)$ on the other curve, so
    the square of Figure 16.2 cannot be closed.

??? question "4. Why did SIKE's break put no TLS traffic at risk?"

    The experiments that used it combined it with X25519 in a hybrid, so breaking SIKE alone
    did not reveal the shared keys.

??? question "5. How long did the Castryck-Decru attack take on SIKEp434, and on what?"

    About an hour (62 minutes) on one core of a 2013 Xeon in the preliminary version of 30 July
    2022, and about ten minutes in the revised version; Magma code, no quantum computer.

??? question "6. In the toy CSIDH over $\mathbb{F}_{419}$, where does $\mathfrak{l}_3$ send $A = 0$, and where does $\mathfrak{l}_3^{-1}$ send it?"

    The order-3 point with $x = 178$ has $y$ in $\mathbb{F}_{419}$, and $B = 6x(1 - x^2) = 158$.
    The twist point $x = -178 = 241$ gives $-158 \equiv 261$. In the program's cycle, 158 comes
    right after 0 and 261 right before it.

??? question "7. Why did CSIDH survive the attack, and what is its main weakness?"

    It publishes no torsion images. Its commutative group action makes it vulnerable to
    Kuperberg's subexponential quantum algorithm, so its parameters for a given quantum
    security level are debated, and it is slow.

??? question "8. Show that SIKEp434's published points determine Bob's secret isogeny."

    Two isogenies of degree $d$ that agree on $E[N]$ differ by an isogeny of degree at most
    $4d$ that kills $E[N]$, which forces it to be zero when $N^2 > 4d$. Here $N^2 = 2^{432}$ and
    $4d = 4 \cdot 3^{137} \approx 2^{219}$.

??? question "9. In Kani's construction, what is the kernel of $F$, and which part did SIDH hand to the attacker?"

    $\ker F = \{(\gamma(P), \varphi(P)) : P \in E[N]\}$ with $N = c + d$. The attacker computes
    $\gamma$ on $E[N]$ himself; the values of the secret $\varphi$ on $E[N]$ were the published
    torsion images.

??? question "10. What does a SQIsign signature prove, and where do the 200 bytes of a round 3 level-I signature go?"

    Knowledge of the endomorphism ring of the public curve, through a response isogeny from
    the commitment curve to the challenge curve that does not contain the challenge. The bytes:
    one $\mathbb{F}_{p^2}$ element for a curve (82), four 25-byte integers describing the
    response on a torsion basis (100), a 16-byte challenge and 2 bytes of hints.

## What you learned

- Isogenies are maps between elliptic curves fixed by their kernels; Vélu's formulas compute
  them, and isogenous curves share their point count.
- Supersingular isogeny graphs are expanders; finding a path between two given curves is the
  hard problem behind isogeny cryptography, and it is not the same problem as SIDH's, which
  added a known degree and torsion images.
- SIDH and SIKE published torsion images to make their walks commute; a toy exchange over
  $p = 2^8 \cdot 3^5 - 1$ runs in a hundred lines of Python.
- Those images determine the secret whenever $N^2 > 4d$, and Kani's 1997 theorem turns them
  into the kernel of a computable 2-dimensional isogeny. Castryck and Decru broke SIKEp434 on
  one core in July 2022; Robert made the attack polynomial for every starting curve eleven
  days later.
- CSIDH survived because it publishes only a curve; its class group action commutes, as the
  27-curve toy over $\mathbb{F}_{419}$ shows, but its quantum security is still argued.
- SQIsign proves knowledge of an endomorphism ring; it uses the attack's own tool to encode
  responses, and its round 3 sizes (83-byte keys, 200-byte signatures at level I, September
  2026) grew after Wesolowski's July 2026 algorithm.
- Hybrids protected every real deployment of SIKE; that is a lasting argument for them.

**Next:** [Chapter 17](17-Implementing-Post-Quantum-Safely.md), implementing post-quantum
cryptography safely: timing, faults, randomness and tests.

## Further reading

- Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH" (EUROCRYPT 2023;
  ePrint 2022/975, preliminary version 30 July 2022).
- Luciano Maino and Chloe Martindale, "An Attack on SIDH with Arbitrary Starting Curve" (ePrint
  2022/1026, 2022); with Lorenz Panny, Giacomo Pope and Benjamin Wesolowski, "A Direct Key
  Recovery Attack on SIDH" (EUROCRYPT 2023).
- Damien Robert, "Breaking SIDH in Polynomial Time" (EUROCRYPT 2023; ePrint 2022/1038).
- Ernst Kani, "The Number of Curves of Genus Two with Elliptic Differentials" (*Journal für die
  reine und angewandte Mathematik* 485, 1997).
- Luca De Feo, "Mathematics of Isogeny Based Cryptography" (2017).
- Craig Costello, "Supersingular Isogeny Key Exchange for Beginners" (SAC 2019), which uses the
  prime 431 of this chapter's graph.
- Luca De Feo, David Jao and Jérôme Plût, "Towards Quantum-Resistant Cryptosystems from
  Supersingular Elliptic Curve Isogenies" (*Journal of Mathematical Cryptology*, 2014).
- Jean-Marc Couveignes, "Hard Homogeneous Spaces" (ePrint 2006/291); Alexander Rostovtsev and
  Anton Stolbunov, "Public-Key Cryptosystem Based on Isogenies" (ePrint 2006/145).
- Luca De Feo, David Kohel, Antonin Leroux, Christophe Petit and Benjamin Wesolowski, "SQISign:
  Compact Post-Quantum Signatures from Quaternions and Isogenies" (ASIACRYPT 2020).
- Pierrick Dartois, Antonin Leroux, Damien Robert and Benjamin Wesolowski, "SQIsignHD: New
  Dimensions in Cryptography" (EUROCRYPT 2024).
- Andrea Basso, Pierrick Dartois, Luca De Feo, Antonin Leroux, Luciano Maino, Giacomo Pope,
  Damien Robert and Benjamin Wesolowski, "SQIsign2D-West: The Fast, the Small, and the Safer"
  (ASIACRYPT 2024).
- The SQIsign team, "SQIsign: Algorithm Specifications and Supporting Documentation", version
  3.0 (1 September 2026), round 3 submission to NIST's additional signatures process.
- Benjamin Wesolowski, "The Supersingular Isogeny Path and Endomorphism Ring Problems Are
  Equivalent" (FOCS 2021); "The Supersingular Isogeny Problem in Time and Memory
  $p^{1/3+o(1)}$" (ePrint 2026/1486).
- Maher Mamah, "Complexity Analysis and Security Implications of the New Isogeny-Path
  Algorithm" (ePrint 2026/1821, 2026).
- Wouter Castryck, Tanja Lange, Chloe Martindale, Lorenz Panny and Joost Renes, "CSIDH: An
  Efficient Post-Quantum Commutative Group Action" (ASIACRYPT 2018).
- Ward Beullens, Thorsten Kleinjung and Frederik Vercauteren, "CSI-FiSh: Efficient Isogeny
  Based Signatures through Class Group Computations" (ASIACRYPT 2019).
- Chris Peikert, "He Gives C-Sieves on the CSIDH" (EUROCRYPT 2020); Xavier Bonnetain and André
  Schrottenloher, "Quantum Security Analysis of CSIDH" (EUROCRYPT 2020).
- Gustavo Banegas and others, "CTIDH: Faster Constant-Time CSIDH" (CHES 2021).
- NIST IR 8610, status report on the second round of the additional digital signature
  schemes (May 2026).
