# 13. Attacks on RSA

*Nobody has ever broken RSA by solving the problem it rests on, except by
factoring numbers that were too small. Yet RSA has been broken in practice
again and again: two people shared a modulus, one message went to three
people, a private exponent was chosen small for speed, a server answered
"bad padding" a little differently from "bad key", a verifier stopped reading
too early, a chip flipped one bit. This chapter does each of these attacks by
hand on small numbers and then in code: you will decrypt without a key by
Euclid's algorithm, by the Chinese remainder theorem, by a polynomial gcd and
by continued fractions; find small roots of polynomials with a lattice; narrow
a plaintext down through a padding oracle; forge a signature with a cube root;
and factor a 2048-bit key from one faulty signature. The lesson at the end is
the one the whole history teaches: the RSA function held, and the ways it was
used did not.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a shared modulus gives away messages to outsiders and the factors to
      insiders, by Euclid's algorithm;
    - how the Chinese remainder theorem turns three encryptions with $e = 3$
      into an ordinary cube root (Håstad's broadcast attack);
    - how two related messages fall to a polynomial gcd (Franklin-Reiter);
    - how continued fractions expose a private exponent below $N^{0.25}$
      (Wiener), and what Boneh and Durfee's $N^{0.292}$ means;
    - the idea of Coppersmith's method, with a tiny lattice worked through, and
      its uses: stereotyped messages, partial key exposure, factoring with known
      high bits;
    - how Bleichenbacher's padding oracle narrows a plaintext down, why it came
      back as ROBOT and DROWN, and how Manger did the same to OAEP;
    - how a sloppy verifier lets anyone forge $e = 3$ signatures with a cube root;
    - how one faulty RSA-CRT signature factors the key, and the one-line fix;
    - what modern practice does about all of it: OAEP, PSS, RSA-KEM, and
      moving away from RSA.

    **You need:** RSA itself, its padding and its CRT speed-up from book 1,
    [Chapter 13](../../book/13-RSA.md), which ends with short versions of some
    of these attacks; this chapter starts where it stops. Modular arithmetic and
    inverses from book 1 [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md).
    The padding oracle idea from [Chapter 10](10-Attacks-on-Modes-and-MACs.md)
    helps in §13.8. Factoring itself is [Chapter 11](11-Factoring.md).

    **Levels:** §13.1 to §13.3 are for beginners; §13.4, §13.5, §13.9, §13.10,
    §13.12 and §13.13 are intermediate; §13.6 to §13.8, §13.11 and §13.14 are
    expert.

## 13.1 The problem

*Level: beginner.*

RSA, in the form book 1 builds it ([Chapter 13](../../book/13-RSA.md)), is
three lines. Pick two large primes $p$ and $q$ and set $N = pq$. Pick a public
exponent $e$ and compute the private exponent $d$ with
$ed \equiv 1 \pmod{\varphi(N)}$. Encrypt with $c = m^e \bmod N$, decrypt with
$m = c^d \bmod N$; sign with $s = m^d \bmod N$ and verify with
$s^e \bmod N = m$. The public key is $(N, e)$, the private key is $d$, or
equivalently $p$ and $q$.

The attacker's first idea is to factor $N$. That is a real attack and has its
own chapter ([Chapter 11](11-Factoring.md)): numbers of 512 bits fall in hours,
the public record is RSA-250, 829 bits, in 2020, and 2048-bit keys are far out
of reach of every known classical method. This chapter is about everything
else. None of the attacks here factors a properly made 2048-bit modulus by
brute mathematics. Each one finds a place where the people who used RSA gave
the attacker more than $(N, e)$ and one ciphertext: two exponents on one
modulus, three ciphertexts of one message, a small $d$, a predictable message,
a few known bits of $p$, a server that answers questions, a verifier that
stops reading early, a chip that makes a mistake.

That list is the RSA attacker's whole method. RSA is a **trapdoor
permutation**: a function easy to compute, hard to invert without $d$. It is
not an encryption scheme. It is deterministic, so the same message always
gives the same ciphertext. It is **malleable**: since
$(m_1 m_2)^e = m_1^e m_2^e$, anyone can multiply a ciphertext by $s^e$ and
get the encryption of $sm$ without knowing $m$. It has algebraic structure
everywhere: ciphertexts are polynomial values, and polynomials can be
combined, divided and reduced. Small numbers stay small: if $m^e < N$ the
"mod" never happens. Every attack in this chapter uses one of these
properties, and every fix (padding, randomization, large $d$, careful error
handling, checking one's own results) takes one of them away.

The history runs in that order. In 1983, six years after RSA was published,
Gus Simmons showed that a shared modulus leaks messages. Johan Håstad showed in
1985 that a small exponent plus a broadcast leaks them too. Michael Wiener
broke small private exponents in 1990. In 1996 two very different results
appeared: Don Coppersmith at IBM showed how to find small roots of
polynomials modulo $N$, which turned "partly known" into "known" for messages
and keys, and Dan Boneh, Richard DeMillo and Richard Lipton at Bellcore showed
that a single hardware fault could factor a key. In 1998 Daniel Bleichenbacher
at Bell Labs decrypted SSL's key exchange through its error messages; versions
of that attack returned in 2003, 2012, 2016, 2017 and 2023. In 2006 he showed
that sloppy signature verification let anyone forge signatures with a pencil
and a cube root. Dan Boneh's survey "Twenty Years of Attacks on the RSA
Cryptosystem" (1999) collected the first wave; Figure 13.1 shows the whole of
it.

<figure class="mars-fig">
<svg viewBox="0 0 640 480" width="640" role="img" aria-label="Timeline of attacks on RSA from Simmons's common modulus attack in 1983 to the Marvin timing attack in 2023" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="470" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="29" text-anchor="end" font-weight="bold">1983</text>
<circle cx="92" cy="24" r="3.5"/>
<text x="108" y="29">Simmons: a shared modulus leaks messages</text>
<text x="78" y="59" text-anchor="end" font-weight="bold">1985</text>
<circle cx="92" cy="54" r="3.5"/>
<text x="108" y="59">Håstad: one message, many keys, small e</text>
<text x="78" y="89" text-anchor="end" font-weight="bold">1990</text>
<circle cx="92" cy="84" r="3.5"/>
<text x="108" y="89">Wiener: small d by continued fractions</text>
<text x="78" y="119" text-anchor="end" font-weight="bold">1996</text>
<circle cx="92" cy="114" r="3.5"/>
<text x="108" y="119">Coppersmith's small roots; Franklin-Reiter; Bellcore faults</text>
<text x="78" y="149" text-anchor="end" font-weight="bold">1998</text>
<circle cx="92" cy="144" r="3.5"/>
<text x="108" y="149">Bleichenbacher's million messages; OAEP in PKCS #1 v2.0</text>
<text x="78" y="179" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="174" r="3.5"/>
<text x="108" y="179">Boneh and Durfee: d below N^0.292</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Manger: a padding oracle for OAEP</text>
<text x="78" y="239" text-anchor="end" font-weight="bold">2006</text>
<circle cx="92" cy="234" r="3.5"/>
<text x="108" y="239">Bleichenbacher: e = 3 signatures forged by a cube root</text>
<text x="78" y="269" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="264" r="3.5"/>
<text x="108" y="269">Shared primes across the Internet (chapter 18)</text>
<text x="78" y="299" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="294" r="3.5"/>
<text x="108" y="299">BERserk: the 2006 forgery in Firefox's NSS</text>
<text x="78" y="329" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="324" r="3.5"/>
<text x="108" y="329">DROWN: SSLv2 as an oracle against TLS</text>
<text x="78" y="359" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="354" r="3.5"/>
<text x="108" y="359">ROBOT: Bleichenbacher returns; ROCA (chapter 18)</text>
<text x="78" y="389" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="384" r="3.5"/>
<text x="108" y="389">TLS 1.3 drops RSA key transport</text>
<text x="78" y="419" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="414" r="3.5"/>
<text x="108" y="419">Faulty signatures still found on live TLS servers</text>
<text x="78" y="449" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="444" r="3.5"/>
<text x="108" y="449">Marvin: the 1998 oracle, measured in nanoseconds</text>
</svg>
<figcaption>Figure 13.1. Forty years of attacks on RSA. None of them solves the RSA problem for a properly made key; each uses something extra the attacker was given.</figcaption>
</figure>

Two famous attacks on RSA keys are not in this chapter, because they are
stories about random numbers rather than about RSA. In 2012 two teams, Nadia
Heninger, Zakir Durumeric, Eric Wustrow and Alex Halderman in "Mining Your Ps
and Qs", and Arjen Lenstra's team in "Ron was wrong, Whit is right", collected
millions of RSA public keys from the Internet and found tens of thousands that
shared a prime factor with another key. If $N_1 = pq_1$ and $N_2 = pq_2$, then
$\gcd(N_1, N_2) = p$, one Euclid's algorithm away; with Daniel Bernstein's batch
gcd, millions of keys can be checked against each other in hours. The keys came
mostly from routers and firewalls that generated them at first boot, before
they had gathered any randomness. That story, with the batch gcd coded, is in
[Chapter 18](18-Random-Numbers-Gone-Wrong.md).

Keep the roles straight as you read. **Beginner** attacks need only
arithmetic: Euclid, inverses, the Chinese remainder theorem, a cube root.
**Intermediate** ones use polynomials and continued fractions. **Expert**
ones use lattices and a careful analysis of what a one-bit answer is worth. All
of them are done on numbers small enough to check by hand, and then on real
sizes in Python.

## 13.2 One modulus, two keys

*Level: beginner.*

Imagine an organization that wants to save work. Making an RSA key means
finding two large primes, which in 1983 took real time on real machines. A
central office makes one modulus $N = pq$ and hands every member their own
pair $(e_i, d_i)$, all with the same $N$. Each member keeps their $d_i$ secret.
It looks as if nothing is shared that matters: Alice cannot read Bob's mail
without Bob's $d$.

Gus Simmons of Sandia National Laboratories showed in 1983 that this is wrong
twice over. An outsider who sees one message sent to two members reads it.
And any one member can read everybody's mail.

**The outsider's attack.** A message $m$ goes to Alice and to Bob, so the
attacker sees

$$
c_1 = m^{e_1} \bmod N, \qquad c_2 = m^{e_2} \bmod N .
$$

If $\gcd(e_1, e_2) = 1$, which is the usual case since exponents are
typically odd primes or 65537, the extended Euclidean algorithm finds integers
$a$ and $b$ with $a e_1 + b e_2 = 1$. One of them is negative. Then

$$
c_1^{a} c_2^{b} \equiv m^{a e_1} m^{b e_2} = m^{a e_1 + b e_2} = m^1 \pmod N .
$$

A negative power means a power of the inverse, $c^{-k} = (c^{-1})^k$, and
$c^{-1} \bmod N$ exists unless $c$ shares a factor with $N$, which would hand
over the factorization anyway. No key was touched.

**By hand.** Take the toy modulus of book 1: $p = 61$, $q = 53$,
$N = 3233$, $\varphi(N) = 3120$. Alice has $e_1 = 7$, Bob $e_2 = 11$; both are
coprime to 3120. The message is $m = 65$.

<div class="mars-steps" markdown>

1. The two ciphertexts: $c_1 = 65^7 \bmod 3233 = 1317$ and $c_2 = 65^{11} \bmod 3233 = 2811$.
2. Euclid on the exponents: $11 = 1 \cdot 7 + 4$, $7 = 1 \cdot 4 + 3$, $4 = 1 \cdot 3 + 1$. Working back, $1 = 4 - 3 = 4 - (7 - 4) = 2 \cdot 4 - 7 = 2(11 - 7) - 7 = 2 \cdot 11 - 3 \cdot 7$. So $a = -3$, $b = 2$.
3. The inverse of $c_1$: $1317^{-1} \bmod 3233 = 2418$ (check: $1317 \cdot 2418 = 3{,}184{,}506 = 985 \cdot 3233 + 1$).
4. Combine: $2418^3 \bmod 3233 = 3077$ and $2811^2 \bmod 3233 = 269$, and $3077 \cdot 269 \bmod 3233 = 65$.

</div>

The message is back. The attacker needed two ciphertexts, two public
exponents, and four lines of arithmetic.

**The insider's attack.** The second problem is worse. Bob knows his own $e_2$
and $d_2$, so he knows a multiple of $\varphi(N)$: $k = e_2 d_2 - 1$. John
DeLaurentis pointed out in 1984 that this is enough to factor $N$, with a
method that also proves a basic fact of RSA: **knowing $d$ is as good as
knowing $p$ and $q$**.

Write $k = 2^s t$ with $t$ odd. For any $g$ coprime to $N$, $g^k \equiv 1$
because $k$ is a multiple of $\varphi(N)$. Start from $x = g^t$ and square
repeatedly; somewhere in the chain $x, x^2, x^4, \ldots, x^{2^s} = 1$ the
value becomes 1. The value just before it, call it $y$, is a square root of 1
modulo $N$. Modulo a prime, the only square roots of 1 are $\pm 1$, but modulo
$N = pq$ there are four: $\pm 1$, and two others that are $+1$ modulo one prime
and $-1$ modulo the other. If $y$ is one of the other two, then $y - 1$ is a
multiple of exactly one of $p$ and $q$, and $\gcd(y - 1, N)$ is a factor. For a
random $g$ this happens with probability at least one half, so a few tries
suffice.

**By hand.** Bob's $e = 7$ has $d = 1783$ (since $7 \cdot 1783 = 12{,}481 = 4 \cdot 3120 + 1$).
Then $k = 12{,}480 = 2^6 \cdot 195$, so $t = 195$ and $s = 6$.

- $g = 2$: $2^{195} \bmod 3233 = 1719$, then $1719^2 \bmod 3233 = 3232 = -1$,
  then 1. The square root of 1 that appeared is $-1$: no luck.
- $g = 3$: $3^{195} \bmod 3233 = 182$, $182^2 \bmod 3233 = 794$,
  $794^2 \bmod 3233 = 1$. Now $794$ is a square root of 1 that is neither 1
  nor $3232$, and $\gcd(793, 3233) = 61$, $\gcd(795, 3233) = 53$.

Bob has factored the shared modulus, and with $p$ and $q$ he computes every
other member's $d_i$ from their public $e_i$.

**Code it.** The block below uses two Mersenne primes, $2^{521} - 1$ and
$2^{607} - 1$, so it needs no prime search; a real key must use random primes.
It recovers a message sent to two members, then lets Bob factor the modulus:

```python
from math import gcd

p, q = 2**521 - 1, 2**607 - 1        # two famous primes, so no prime search is needed
n = p * q                            # (never build a real key this way)
phi = (p - 1) * (q - 1)
e1, e2 = 65537, 257                  # Alice's and Bob's exponents, one shared modulus

m = int.from_bytes(b"Meet at the old mill gate at 06:00", "big")
c1, c2 = pow(m, e1, n), pow(m, e2, n)   # the same message, sent to both

def egcd(a, b):                      # returns (g, x, y) with a*x + b*y = g
    if b == 0:
        return a, 1, 0
    g, x, y = egcd(b, a % b)
    return g, y, x - (a // b) * y

g, a, b = egcd(e1, e2)
print(g, a, b)
recovered = pow(c1, a, n) * pow(c2, b, n) % n   # Python 3.8+ handles negative powers
print(recovered.to_bytes(34, "big"))

# Bob, an insider, factors n from his own key pair
def factor_from_key(n, e, d):
    t, s = e * d - 1, 0              # e*d - 1 = 2^s * t with t odd
    while t % 2 == 0:
        t, s = t // 2, s + 1
    for base in range(2, 100):
        x = pow(base, t, n)
        for _ in range(s):
            y = x * x % n
            if y == 1 and x not in (1, n - 1):   # a square root of 1 that is not +-1
                return gcd(x - 1, n), base
            x = y

d2 = pow(e2, -1, phi)
f, base = factor_from_key(n, e2, d2)
print("base", base, "gives a factor:", f in (p, q))
```

It prints:

```
1 -128 32641
b'Meet at the old mill gate at 06:00'
base 5 gives a factor: True
```

Check the first line: $65537 \cdot (-128) + 257 \cdot 32641 = -8{,}388{,}736 + 8{,}388{,}737 = 1$.

**Fix it.** Every key gets its own modulus. There is no safe way to share one.
The insider attack also explains a rule that looks like bureaucracy: when a
private key leaks, the modulus is dead too. Choosing a new $e$ and $d$ for the
same $N$ does nothing, because whoever had the old $d$ can factor $N$.

**In the real world.** Shared moduli were proposed in the early 1980s for
exactly the reason given, to save key-generation work in networks, and
Simmons's paper ("A 'Weak' Privacy Protocol Using the RSA Crypto Algorithm",
*Cryptologia*, 1983) killed the idea before it spread. The attack is still a
staple of security competitions, and it reappears whenever a system copies a
key template between devices or "rotates" a key by changing only the exponent.
The insider attack shows something broader that the next sections rely on:
facts about $d$ are facts about $p$ and $q$. Alexander May proved in 2004 that
computing $d$ from $(N, e)$ is deterministically equivalent to factoring $N$.

!!! note "Life story: the common modulus attack"
    **Born:** 1983, Gustavus Simmons of Sandia National Laboratories
    (outsider version); 1984, John DeLaurentis (an insider factors the
    modulus) · **Purpose:** to show that one RSA modulus cannot safely carry
    more than one key pair · **Helped:** to establish that every key has its
    own $N$, and that knowing $d$ is equivalent to factoring (proved
    deterministically by May in 2004) · **Status:** a textbook example; still
    found in homemade systems

## 13.3 One message, many keys: Håstad's broadcast attack

*Level: beginner.*

The second cheap shortcut is a small public exponent. Encryption costs one
squaring per bit of $e$ after the first, plus one multiplication per further
1 bit, so $e = 3$ costs two multiplications and $e = 65537$ costs seventeen. In the 1980s and 1990s many
systems chose $e = 3$, and with it a risk: if $m^3 < N$, the ciphertext is
simply $m^3$, and an ordinary cube root decrypts it (book 1, §13.6). That
needs a short message. Johan Håstad, then a graduate student at MIT, showed in
1985 that it is not needed at all if the same message goes to several people.

A mission control on Earth makes the scenario concrete. It sends the same
command, "seal all domes, new key 7741-QZ", to three settlements on Mars. Each
settlement has its own RSA key, all with $e = 3$, and the moduli $N_1, N_2,
N_3$ are different. The command takes up to 24 minutes to arrive, and anyone
with a dish hears all three transmissions:

$$
c_1 = m^3 \bmod N_1, \qquad c_2 = m^3 \bmod N_2, \qquad c_3 = m^3 \bmod N_3 .
$$

**The method.** The moduli are almost certainly pairwise coprime (if two
shared a factor, a gcd would factor both). The **Chinese remainder theorem**
says that for pairwise coprime moduli there is exactly one number $x$ below
$N_1 N_2 N_3$ with $x \equiv c_i \pmod{N_i}$ for all three, and it gives a
formula for it. The number $m^3$ is such a number. And since $m < N_i$ for each
$i$, $m^3 < N_1 N_2 N_3$. So $x = m^3$ exactly, as an integer, with no "mod" left
anywhere, and $m = \sqrt[3]{x}$.

The formula: with $M = N_1 N_2 N_3$ and $M_i = M / N_i$,

$$
x = \sum_{i=1}^{3} c_i \, M_i \, (M_i^{-1} \bmod N_i) \;\bmod M .
$$

Each term is $c_i$ modulo $N_i$ (because $M_i M_i^{-1} \equiv 1$ there) and 0
modulo the other two moduli (because $M_i$ contains them). By hand it is
easier to join the congruences two at a time, which is what the steps below do.

**By hand.** Moduli whose primes are all $2 \bmod 3$ make $e = 3$ valid:
$N_1 = 5 \cdot 11 = 55$, $N_2 = 17 \cdot 23 = 391$, $N_3 = 29 \cdot 41 = 1189$.
The message is $m = 42$, and $m^3 = 74{,}088$.

<div class="mars-steps" markdown>

1. The ciphertexts: $74{,}088 \bmod 55 = 3$, $74{,}088 \bmod 391 = 189$, $74{,}088 \bmod 1189 = 370$. The attacker has only $(3, 189, 370)$ and the moduli.
2. Join the first two. Write $x = 3 + 55t$ and require $3 + 55t \equiv 189 \pmod{391}$, so $55t \equiv 186$. The inverse of 55 modulo 391 is 64 ($55 \cdot 64 = 3520 = 9 \cdot 391 + 1$), so $t = 186 \cdot 64 \bmod 391 = 174$ and $x = 3 + 55 \cdot 174 = 9573$. Check: $9573 \bmod 55 = 3$, $9573 \bmod 391 = 189$.
3. Join the third. Now $x = 9573 + 21{,}505u$ (since $55 \cdot 391 = 21{,}505$), and we need $x \equiv 370 \pmod{1189}$. Reduce: $9573 \bmod 1189 = 61$ and $21{,}505 \bmod 1189 = 103$, so $103u \equiv 309$. The inverse of 103 modulo 1189 is 658 ($103 \cdot 658 = 67{,}774 = 57 \cdot 1189 + 1$), so $u = 309 \cdot 658 \bmod 1189 = 3$.
4. So $x = 9573 + 3 \cdot 21{,}505 = 74{,}088$, which is below $55 \cdot 391 \cdot 1189 = 25{,}569{,}445$.
5. The cube root: $\sqrt[3]{74{,}088} = 42$.

</div>

Figure 13.2 shows the shape of it. No modulus was factored and no key was
used. The three ciphertexts were each "too reduced" to reveal $m^3$, but
together they pin it down completely.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Håstad's broadcast attack: three residues of m cubed modulo 55, 391 and 1189 are joined by the Chinese remainder theorem into 74088, which is smaller than the product of the moduli, so its integer cube root 42 is the message" fill="currentColor" font-size="14">
<rect x="20" y="30" width="170" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="57" text-anchor="middle">c₁ = 3 mod 55</text>
<rect x="20" y="100" width="170" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="127" text-anchor="middle">c₂ = 189 mod 391</text>
<rect x="20" y="170" width="170" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="197" text-anchor="middle">c₃ = 370 mod 1189</text>
<line x1="190" y1="52" x2="262" y2="112" stroke="currentColor" stroke-width="1.4"/>
<line x1="190" y1="122" x2="262" y2="122" stroke="currentColor" stroke-width="1.4"/>
<line x1="190" y1="192" x2="262" y2="132" stroke="currentColor" stroke-width="1.4"/>
<rect x="262" y="96" width="110" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="317" y="118" text-anchor="middle" font-weight="bold">CRT</text>
<text x="317" y="138" text-anchor="middle" font-size="12">join</text>
<line x1="372" y1="122" x2="410" y2="122" stroke="currentColor" stroke-width="1.4"/>
<polygon points="410,117 420,122 410,127"/>
<rect x="420" y="96" width="200" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="118" text-anchor="middle">x = 74,088</text>
<text x="520" y="138" text-anchor="middle" font-size="12">mod 25,569,445</text>
<line x1="520" y1="148" x2="520" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="515,190 520,200 525,190"/>
<rect x="440" y="200" width="160" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="520" y="225" text-anchor="middle" font-weight="bold">∛x = 42 = m</text>
<text x="20" y="268" font-size="13">Why it works: m &lt; each Nᵢ, so m³ &lt; N₁N₂N₃, and the</text>
<text x="20" y="288" font-size="13">unique CRT answer below N₁N₂N₃ is m³ itself, not a residue of it.</text>
</svg>
<figcaption>Figure 13.2. Håstad's broadcast attack on the hand example. Each ciphertext alone is a residue; joined, they are the integer m³.</figcaption>
</figure>

**Code it.** The code joins the residues with the formula, takes an exact
integer cube root by binary search (floating point would lose the low digits
of a 1500-bit number), checks the hand example, and then breaks the broadcast
to three settlements with 1024-bit moduli:

```python
import random
from math import prod

def probably_prime(n):               # Fermat test to a few bases; fine for a demonstration
    return n > 3 and all(pow(a, n - 1, n) == 1 for a in (2, 3, 5, 7, 11))

def prime_for_e3(bits):              # p % 3 == 2, so that 3 has an inverse mod p - 1
    while True:
        p = random.getrandbits(bits) | (1 << (bits - 1)) | 1
        if p % 3 == 2 and probably_prime(p):
            return p

def crt(residues, moduli):           # the x mod prod(moduli) with x = r_i mod n_i
    M = prod(moduli)
    x = 0
    for r, n in zip(residues, moduli):
        Mi = M // n
        x += r * Mi * pow(Mi, -1, n)
    return x % M

def icbrt(x):                        # largest s with s**3 <= x
    lo, hi = 0, 1 << (x.bit_length() // 3 + 2)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if mid ** 3 <= x:
            lo = mid
        else:
            hi = mid - 1
    return lo

print(crt([3, 189, 370], [55, 391, 1189]), icbrt(74088))   # the hand example

random.seed(3)
ns = [prime_for_e3(512) * prime_for_e3(512) for _ in range(3)]   # three settlements
m = int.from_bytes(b"Dust storm: seal all domes, new key 7741-QZ", "big")
cs = [pow(m, 3, n) for n in ns]                                  # what the attacker hears
cube = crt(cs, ns)
print(cube == m ** 3)
print(icbrt(cube).to_bytes(43, "big"))
```

It prints:

```
74088 42
True
b'Dust storm: seal all domes, new key 7741-QZ'
```

The message here is 343 bits, so $m^3$ has 1027 bits, more than any of the
three moduli (1023 and 1024 bits): a single ciphertext really is reduced, and the plain cube
root of book 1 would fail on it. Three ciphertexts are needed, and three are
enough. In general $e$ ciphertexts of the same message under exponent $e$
are enough, which is why $e = 65537$ makes this version of the attack useless:
nobody sends a message to 65,537 people with the bare RSA function.

**What Håstad actually proved.** Real systems seldom send exactly the same
number; they add a recipient's identifier or a timestamp, so recipient $i$ gets
$m_i = a_i m + b_i$ with known $a_i, b_i$. Håstad's 1985 paper, and its
journal version "Solving Simultaneous Modular Equations of Low Degree" (1988),
handled this: the attacker has polynomial equations $(a_i x + b_i)^e - c_i
\equiv 0 \pmod{N_i}$ with a common small root $x = m$, joins them by the
Chinese remainder theorem into one polynomial equation modulo $N_1 \cdots N_k$,
and finds the small root with a lattice. His bound needed about $e(e+1)/2$
recipients; with Coppersmith's method of §13.6 it drops to $e$. So "add the
recipient's name to the message" is not a fix. Any **known, fixed** padding
is not a fix.

**Fix it.** Randomized padding is the fix. With OAEP each encryption pads the
message with fresh random bits before the RSA function, so the three
settlements receive the RSA images of three unrelated numbers, and there is
no common root to find. A larger exponent ($e = 65537$, required by FIPS 186-5
as the minimum) is a second line of defense, not the first.

!!! note "Life story: Håstad's broadcast attack"
    **Born:** 1985, Johan Håstad, then a graduate student at MIT (CRYPTO '85;
    journal version 1988) · **Purpose:** to show that a low public exponent
    plus one message sent to several people, even with known per-recipient
    changes, gives the message away without any key · **Helped:** to retire
    unpadded and deterministically padded RSA with $e = 3$; strengthened by
    Coppersmith's method to $e$ recipients · **Status:** harmless against
    randomized padding; the reason FIPS 186-5 requires $e \ge 65537$

## 13.4 Related messages: Franklin and Reiter

*Level: intermediate.*

A broadcast is one message to many keys. The opposite case is many messages
to one key, where the messages are related in a way the attacker knows. A
sender encrypts an order and then the corrected order, which differs by one
digit; a protocol encrypts a counter and then the counter plus one; a sender
retries a message with a new sequence number. In 1995 Matthew Franklin and
Michael Reiter showed that with $e = 3$ two such ciphertexts give both
messages away, and with Don Coppersmith and Jacques Patarin they generalized it
the next year to any small $e$ and any known polynomial relation.

**The idea.** Suppose $m_2 = m_1 + r$ with $r$ known, and the attacker sees
$c_1 = m_1^e$ and $c_2 = m_2^e$ modulo $N$. Then the unknown $m_1$ is a root of
two polynomials modulo $N$:

$$
g_1(x) = x^e - c_1, \qquad g_2(x) = (x + r)^e - c_2 .
$$

Both are divisible by $x - m_1$. In general they have no other common factor,
so their greatest common divisor is exactly $x - m_1$, and Euclid's algorithm
for polynomials, run with coefficients modulo $N$, finds it. Euclid needs to
divide by leading coefficients; modulo a composite $N$ that fails only when a
leading coefficient shares a factor with $N$, which would factor $N$ anyway.
No root-finding modulo $N$ is needed, and that matters, because finding roots of
polynomials modulo $N$ is as hard as factoring $N$. The gcd does the work.

**By hand.** For $e = 3$ and $m_2 = m_1 + r$ the gcd has a closed form. Expand
$c_2 = m_1^3 + 3m_1^2 r + 3m_1 r^2 + r^3$ and compare two combinations:

$$
c_2 + 2c_1 - r^3 = 3m_1(m_1^2 + m_1 r + r^2), \qquad
c_2 - c_1 + 2r^3 = 3r(m_1^2 + m_1 r + r^2),
$$

so

$$
m_1 = \frac{r\,(c_2 + 2c_1 - r^3)}{c_2 - c_1 + 2r^3} \pmod N .
$$

Take $N = 47 \cdot 59 = 2773$ (both primes are $2 \bmod 3$, so $e = 3$ is
valid), $m_1 = 1000$ and $r = 7$.

<div class="mars-steps" markdown>

1. The ciphertexts: $c_1 = 1000^3 \bmod 2773 = 740$, $c_2 = 1007^3 \bmod 2773 = 1185$.
2. The numerator: $c_2 + 2c_1 - r^3 = 1185 + 1480 - 343 = 2322$, times $r = 7$ gives $16{,}254 \equiv 2389 \pmod{2773}$.
3. The denominator: $c_2 - c_1 + 2r^3 = 1185 - 740 + 686 = 1131$. Its inverse modulo 2773 is 2366 ($1131 \cdot 2366 = 2{,}675{,}946 = 965 \cdot 2773 + 1$).
4. The message: $2389 \cdot 2366 = 5{,}652{,}374 \equiv 1000 \pmod{2773}$.

</div>

The polynomial view of the same example starts with
$g_1 = x^3 - 740$ and $g_2 = x^3 + 21x^2 + 147x - 842$. The first Euclid step
subtracts: $g_2 - g_1 = 21x^2 + 147x - 102$, a quadratic with $x = 1000$
as a root modulo 2773. Two more division steps leave a linear polynomial, and
that is $x - 1000$ up to a constant factor.

**Code it.** The code does the general version: polynomial gcd modulo $N$ for
any exponent. It uses $e = 7$ to show nothing depends on $e = 3$, and two
orders that differ by one in their last byte:

```python
import random

def probably_prime(n):
    return n > 3 and all(pow(a, n - 1, n) == 1 for a in (2, 3, 5, 7, 11))

def prime_for_e(bits, e):            # p with gcd(e, p - 1) == 1 (e prime)
    while True:
        p = random.getrandbits(bits) | (1 << (bits - 1)) | 1
        if (p - 1) % e and probably_prime(p):
            return p

# polynomials are lists of coefficients mod n, lowest degree first
def trim(f):
    while f and f[-1] == 0:
        f.pop()
    return f

def poly_mod(f, g, n):               # remainder of f divided by g, mod n
    f = f[:]
    inv = pow(g[-1], -1, n)          # fails only if we have stumbled on a factor of n
    while len(f) >= len(g):
        q = f[-1] * inv % n
        shift = len(f) - len(g)
        for i, c in enumerate(g):
            f[shift + i] = (f[shift + i] - q * c) % n
        trim(f)
    return f

def poly_gcd(f, g, n):
    while g:
        f, g = g, poly_mod(f, g, n)
    inv = pow(f[-1], -1, n)
    return [c * inv % n for c in f]  # made monic

def poly_pow_linear(a, b, e, n):     # (a*x + b)^e, by the binomial theorem
    from math import comb
    return [comb(e, i) * pow(a, i, n) * pow(b, e - i, n) % n for i in range(e + 1)]

random.seed(4)
e = 7
n = prime_for_e(512, e) * prime_for_e(512, e)
m1 = int.from_bytes(b"Order 41: release payment batch.", "big")
m2 = m1 + 1                          # the next order differs by one in the last byte
c1, c2 = pow(m1, e, n), pow(m2, e, n)

g1 = poly_pow_linear(1, 0, e, n); g1[0] = (g1[0] - c1) % n   # x^e - c1
g2 = poly_pow_linear(1, 1, e, n); g2[0] = (g2[0] - c2) % n   # (x + 1)^e - c2
h = poly_gcd(g1, g2, n)
print(len(h) - 1)                    # degree 1: h = x - m1
print((-h[0] % n).to_bytes(32, "big"))
```

It prints:

```
1
b'Order 41: release payment batch.'
```

The relation can be any polynomial $m_2 = f(m_1)$ the attacker knows, not just
a shift: an affine change $am_1 + b$ works the same way. The cost is the cost
of a gcd of two polynomials of degree $e$: a moment for $e = 3$, quadratic in
$e$ with the schoolbook division above, and nearly linear in $e$ with fast
polynomial arithmetic. For $e = 65537$ the attack is slow but not out of reach,
so a large $e$ is not the defense.

**Coppersmith's short-pad attack.** A designer might reply: then add a few
random bits to each message. Coppersmith showed in 1996 that this fails if the
random padding is short. Two encryptions of the same $m$ with pads $r_1$ and
$r_2$ are related by an unknown but small shift $\delta = r_2 - r_1$. A
resultant eliminates $m$ and leaves a polynomial in $\delta$ alone, whose small
root Coppersmith's method of §13.6 finds; then Franklin-Reiter recovers $m$. For
$e = 3$ the pad must be longer than about a ninth of the modulus ($1/e^2$ of
its bits) to stop this. Real padding, OAEP, uses hundreds of random bits and
a hash-based mixing that makes the relation between two padded messages
unknowable.

**Fix it.** Randomized padding again, long enough and mixed through the whole
block. This attack is one reason the RSA function is never applied to raw
messages, however they are related.

!!! note "Life story: the Franklin-Reiter related-message attack"
    **Born:** 1995, Matthew Franklin and Michael Reiter (CRYPTO '95 rump
    session, for $e = 3$); generalized with Don Coppersmith and Jacques Patarin
    at EUROCRYPT '96 · **Purpose:** to show that two messages with a known
    polynomial relation, encrypted under one key with small $e$, both fall to a
    polynomial gcd · **Helped:** with Coppersmith's short-pad attack, to make
    long randomized padding a requirement · **Status:** a standard tool; useless
    against OAEP

## 13.5 Wiener's attack: a private exponent too small

*Level: intermediate.*

Decryption and signing cost one modular multiplication for every bit of $d$,
and $d$ is normally as long as $N$. For a smart card in 1990, signing with a
512-bit $d$ took seconds. A tempting shortcut: choose a small $d$ first, say
128 bits, and compute $e = d^{-1} \bmod \varphi(N)$, which will be large. The
card signs four times faster, and the verifier, a big computer, does not mind
a large $e$. Michael Wiener of Bell-Northern Research in Ottawa showed in 1990
that this gives the key away when $d < \tfrac13 N^{1/4}$.

**Why a small $d$ leaks.** The key equation is $ed = 1 + k\varphi(N)$ for some
integer $k$, and $\varphi(N) = N - (p + q) + 1$, which is close to $N$:
$N - \varphi(N) = p + q - 1 < 3\sqrt N$ when $q < p < 2q$. Divide the key
equation by $dN$ and rearrange:

$$
\left| \frac{e}{N} - \frac{k}{d} \right|
= \frac{|ed - kN|}{dN}
= \frac{|1 - k(p + q - 1)|}{dN}
< \frac{3k\sqrt N}{dN} = \frac{3k}{d\sqrt N}.
$$

Since $e < \varphi(N)$, also $k < d$. If $d < \tfrac13 N^{1/4}$, then
$3k < N^{1/4}$, and

$$
\left| \frac{e}{N} - \frac{k}{d} \right| < \frac{1}{d N^{1/4}} < \frac{1}{3d^2} < \frac{1}{2d^2}.
$$

So the public fraction $e/N$ and the secret fraction $k/d$ are extremely close,
closer than $1/(2d^2)$. A theorem from the eighteenth century, due to Legendre,
says that a fraction this close to a number must be one of its **continued
fraction convergents**. The convergents are the best rational approximations,
computed by Euclid's algorithm, and there are only about $\log N$ of them. Try
each one as $k/d$: from a guess for $k$ and $d$, compute
$\varphi = (ed - 1)/k$, then $p + q = N - \varphi + 1$, then check whether
$p$ and $q$ come out as integers, as roots of $z^2 - (p + q)z + N = 0$.

**Continued fractions in one paragraph.** Euclid's algorithm on $e$ and $N$
produces quotients $a_0, a_1, a_2, \ldots$ with

$$
\frac{e}{N} = a_0 + \cfrac{1}{a_1 + \cfrac{1}{a_2 + \cfrac{1}{\ddots}}} ,
$$

written $[a_0; a_1, a_2, \ldots]$. Cutting it off after $a_i$ gives the
convergent $h_i / k_i$, computed by the recurrence
$h_i = a_i h_{i-1} + h_{i-2}$ and $k_i = a_i k_{i-1} + k_{i-2}$, starting from
$h_{-1} = 1, h_{-2} = 0, k_{-1} = 0, k_{-2} = 1$. The convergents alternate
above and below $e/N$ and close in on it fast.

**By hand.** The public key is $N = 90{,}581$, $e = 17{,}993$. Here
$\tfrac13 N^{1/4} \approx 5.8$, so a private exponent up to 5 is in range.

<div class="mars-steps" markdown>

1. Euclid on $17{,}993 / 90{,}581$: $17{,}993 = 0 \cdot 90{,}581 + 17{,}993$; $90{,}581 = 5 \cdot 17{,}993 + 616$; $17{,}993 = 29 \cdot 616 + 129$; $616 = 4 \cdot 129 + 100$; $129 = 1 \cdot 100 + 29$; $100 = 3 \cdot 29 + 13$; $29 = 2 \cdot 13 + 3$; $13 = 4 \cdot 3 + 1$; $3 = 3 \cdot 1$. So $e/N = [0; 5, 29, 4, 1, 3, 2, 4, 3]$.
2. The convergents: $0/1$, $1/5$, $29/146$, $117/589$, $146/735$, and so on.
3. The first, $0/1$, has $k = 0$: skip it.
4. The second: $k = 1$, $d = 5$. Then $\varphi = (17{,}993 \cdot 5 - 1)/1 = 89{,}964$, and $p + q = 90{,}581 - 89{,}964 + 1 = 618$.
5. Test: $(p - q)^2 = (p + q)^2 - 4N = 381{,}924 - 362{,}324 = 19{,}600 = 140^2$. A perfect square, so $p = (618 + 140)/2 = 379$ and $q = (618 - 140)/2 = 239$, and indeed $379 \cdot 239 = 90{,}581$.

</div>

The private exponent is 5 and the modulus is factored, from the public key
alone, at the second convergent. Figure 13.3 shows why the search is so
short.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The convergents of e over N for the hand example: 0, then one fifth, then 29 over 146, closing in on e over N from alternating sides; the secret k over d equals one fifth and is within 1 over 2d squared of e over N" fill="currentColor" font-size="14">
<line x1="40" y1="90" x2="600" y2="90" stroke="currentColor" stroke-width="1.4"/>
<line x1="40" y1="82" x2="40" y2="98" stroke="currentColor" stroke-width="1.4"/>
<text x="40" y="120" text-anchor="middle">0/1</text>
<text x="40" y="70" text-anchor="middle" font-size="12">0</text>
<line x1="560" y1="82" x2="560" y2="98" stroke="currentColor" stroke-width="1.4"/>
<text x="560" y="70" text-anchor="middle" font-size="12">0.2</text>
<circle cx="560" cy="90" r="6"/>
<text x="560" y="120" text-anchor="middle" font-weight="bold">1/5 = k/d</text>
<line x1="556" y1="40" x2="556" y2="98" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="548" y="34" text-anchor="end">e/N = 0.198640…</text>
<text x="40" y="160" font-size="13">Convergents of e/N = [0; 5, 29, 4, 1, 3, 2, 4, 3]:</text>
<text x="40" y="182" font-size="13">0/1 (below), 1/5 (above), 29/146 (below), 117/589 (above), … each one far closer.</text>
<text x="40" y="208" font-size="13">Wiener: if d &lt; ⅓N^¼, then |e/N − k/d| &lt; 1/(2d²), so k/d is one of these.</text>
<text x="40" y="232" font-size="13">Here |e/N − 1/5| ≈ 0.00136 &lt; 1/50 = 0.02: the second convergent is the key.</text>
</svg>
<figcaption>Figure 13.3. Wiener's attack on the hand example. The secret fraction k/d is so close to the public e/N that it must appear among the few convergents of e/N.</figcaption>
</figure>

**Code it.** The convergents come from Euclid's algorithm with the
recurrence above. The code runs the hand example, then makes a 2048-bit key
with private exponents of 500, 508 and 516 bits. The bound
$\tfrac13 N^{1/4}$ is about $2^{510.4}$ here, so the first two should fall and
the third should not:

```python
import random
from math import gcd, isqrt

def probably_prime(n):
    return n > 3 and all(pow(a, n - 1, n) == 1 for a in (2, 3, 5, 7, 11))

def prime(bits):
    while True:
        p = random.getrandbits(bits) | (3 << (bits - 2)) | 1   # top two bits set
        if probably_prime(p):
            return p

def convergents(a, b):               # the convergents h/k of the fraction a/b
    h0, h1, k0, k1 = 0, 1, 1, 0
    while b:
        x = a // b
        a, b = b, a - x * b
        h0, h1 = h1, x * h1 + h0
        k0, k1 = k1, x * k1 + k0
        yield h1, k1

def wiener(e, n):
    for i, (k, d) in enumerate(convergents(e, n)):
        if k == 0 or (e * d - 1) % k:
            continue
        phi = (e * d - 1) // k
        s = n - phi + 1              # would be p + q
        disc = s * s - 4 * n         # would be (p - q)^2
        if disc >= 0 and isqrt(disc) ** 2 == disc:
            r = isqrt(disc)
            return d, (s + r) // 2, (s - r) // 2, i

print(wiener(17993, 90581))          # the hand example

random.seed(1990)
p, q = prime(1024), prime(1024)
n, phi = p * q, (p - 1) * (q - 1)

def small_d(bits):                   # a "fast" private exponent of the given size
    while True:
        d = random.getrandbits(bits) | (1 << (bits - 1)) | 1
        if gcd(d, phi) == 1:
            return d

for bits in (500, 508, 516):
    d = small_d(bits)
    e = pow(d, -1, phi)
    found = wiener(e, n)
    if found:
        print(bits, "bits: d found at convergent", found[3], found[0] == d)
    else:
        print(bits, "bits: no convergent works")
```

It prints:

```
(5, 379, 239, 1)
500 bits: d found at convergent 267 True
508 bits: d found at convergent 299 True
516 bits: no convergent works
```

The convergents are numbered from 0, so the hand example's key is convergent 1,
the second. For the 2048-bit key, a few hundred convergents, each tested with
one square root, take a fraction of a second. Just past the bound the method
stops dead: it is a cliff, not a slope.

**Beyond the quarter: Boneh and Durfee.** Is $N^{1/4}$ the true limit?
Eric Verheul and Henk van Tilborg showed in 1997 that Wiener's method extends a
few bits past it by guessing extra information, at exponential cost in the
extra bits. The real step came from lattices. Dan Boneh and Glenn Durfee
(EUROCRYPT 1999) wrote the key equation modulo $e$:

$$
ed = 1 + k\left(N + 1 - (p + q)\right)
\quad\Longrightarrow\quad
k\,(A + s) + 1 \equiv 0 \pmod e, \qquad A = N + 1,\; s = -(p + q).
$$

This is a polynomial $f(x, y) = x(A + y) + 1$ modulo $e$ with a small root
$(x, y) = (k, s)$: $|k| < d < N^\delta$ and $|s| < 3\sqrt N$. They called it
the **small inverse problem** and attacked it with a two-variable version of
Coppersmith's lattice method (§13.6). A first lattice reaches
$d < N^{0.284}$; a cleverer sublattice reaches

$$
d < N^{1 - 1/\sqrt 2} \approx N^{0.292}.
$$

For a 2048-bit modulus that is $d$ up to about 598 bits, against Wiener's 510.
Two cautions. The two-variable method is **heuristic**: it needs the
polynomials found by the lattice to be algebraically independent, which is not
proved, though it holds in practice. And Boneh and Durfee conjectured that the
true bound is $N^{0.5}$; nobody has proved or reached it. Section 13.14 returns
to this.

**Fix it.** Do not choose $d$; choose $e$ (65537) and let $d$ be whatever it
is, about the size of $N$. FIPS 186-5 makes it a rule: $d$ must exceed
$2^{n/2}$ for an $n$-bit modulus. For speed, use the CRT exponents
$d_p = d \bmod (p - 1)$ and $d_q = d \bmod (q - 1)$, which give a fourfold speed-up
with a full-size $d$ (book 1, §13.9). Wiener himself suggested making $d_p$ and
$d_q$ small instead of $d$; that is safer, but not free either: there are
attacks in time about the square root of the smaller CRT exponent, so they
must still be well over 100 bits, and lattice attacks on small CRT exponents
with unbalanced primes followed in the 2000s.

!!! note "Life story: Wiener's attack"
    **Born:** 1990, Michael Wiener of Bell-Northern Research, Ottawa (IEEE
    Transactions on Information Theory; presented at EUROCRYPT '89) ·
    **Purpose:** to show that a private exponent below $\tfrac13 N^{1/4}$,
    chosen to make signing fast on weak devices, is found from the public key
    by continued fractions · **Helped:** to end small-$d$ designs; extended by
    Boneh and Durfee (1999) to $N^{0.292}$ with lattices · **Status:** the
    reason FIPS 186-5 requires $d > 2^{n/2}$

## 13.6 Coppersmith's method: small roots through lattices

*Level: expert.*

Every attack so far turned into a polynomial with the secret as a root:
$x^3 - c$ in §13.3, $x^e - c_1$ and $(x + r)^e - c_2$ in §13.4,
$x(A + y) + 1$ in Boneh and Durfee's version of §13.5. Finding a root of a
polynomial modulo a prime is easy. Finding a root modulo a composite $N$ is,
in general, as hard as factoring $N$: even $x^2 - a \equiv 0 \pmod N$, a
square root, is. But in 1996 Don Coppersmith of IBM's Thomas J. Watson
Research Center proved something surprising: **small** roots are easy. If $f$
is a monic polynomial of degree $\delta$ and $f(x_0) \equiv 0 \pmod N$ with
$|x_0| < N^{1/\delta}$, then $x_0$ can be found in time polynomial in $\log N$
and $\delta$, without factoring $N$.

For $e = 3$ that means: a message whose unknown part is smaller than a third of
the bits of $N$ falls. It also means much more, as the next section shows.
Here is the idea, in Nick Howgrave-Graham's simpler form of 1997.

**Step 1: a root modulo $N$ that is also a root over the integers.** Suppose
$g(x) = \sum_i g_i x^i$ has $g(x_0) \equiv 0 \pmod N$, and $|x_0| < X$. Then

$$
|g(x_0)| \le \sum_i |g_i|\, |x_0|^i < \sum_i |g_i|\, X^i .
$$

If the right side is smaller than $N$, then $g(x_0)$ is a multiple of $N$
smaller than $N$ in absolute value, so it is $0$. A root modulo $N$ of a
polynomial with **small coefficients** is a root over the integers, and roots
over the integers are easy to find: Newton's method, or factoring the
polynomial over the rationals. (Howgrave-Graham's lemma states the condition
with the Euclidean length of the coefficient vector of $g(xX)$: below
$N/\sqrt{\omega}$ for a polynomial with $\omega$ terms.)

**Step 2: many polynomials with the same root.** The given $f$ has huge
coefficients, as large as $N$. But $f$ is not the only polynomial that vanishes
at $x_0$ modulo $N$. So does $N$ itself, and $Nx$, $Nx^2$, $xf(x)$, $f(x)^2$
modulo $N^2$, and every integer combination of them. The aim is to find a
combination with small coefficients.

**Step 3: a lattice.** Write each polynomial $g(xX)$ as the vector of its
coefficients. Integer combinations of the polynomials are integer combinations
of the vectors: a **lattice**. A short vector in this lattice is a polynomial
whose coefficients, weighted by powers of $X$, are small, which is exactly the
condition of step 1. The **LLL algorithm** of Arjen Lenstra, Hendrik Lenstra
and László Lovász (1982) finds, in polynomial time, a vector at most
$2^{(\omega - 1)/4}$ times longer than $\det(L)^{1/\omega}$ in a lattice $L$ of
dimension $\omega$. If the basis is triangular, its determinant is the product of
the diagonal, and the condition "$\det(L)^{1/\omega}$ is small compared with
$N$" becomes a condition on $X$. How LLL works, with full code, belongs to the
Mathematics book ([its index](../mathematics/index.md)); here it is a black box
that returns a shorter basis. [Chapter 15](15-Lattices-as-a-Weapon.md) of this
book uses lattices as weapons more widely.

Figure 13.4 puts the three steps together.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Coppersmith's method as a pipeline: a polynomial with a small root mod N, plus shifted multiples, forms a lattice; LLL finds a short vector, which is a polynomial with small coefficients; that polynomial has the same root over the integers, found by ordinary means" fill="currentColor" font-size="14">
<rect x="20" y="20" width="180" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="45" text-anchor="middle">f(x₀) ≡ 0 mod N</text>
<text x="110" y="67" text-anchor="middle" font-size="12">|x₀| &lt; X, coefficients ≈ N</text>
<line x1="200" y1="55" x2="240" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="240,50 250,55 240,60"/>
<rect x="250" y="20" width="160" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="45" text-anchor="middle">N, Nx, …, f, xf, …</text>
<text x="330" y="67" text-anchor="middle" font-size="12">all vanish at x₀ mod N</text>
<line x1="410" y1="55" x2="450" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,50 460,55 450,60"/>
<rect x="460" y="20" width="160" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="45" text-anchor="middle">lattice of</text>
<text x="540" y="67" text-anchor="middle">coefficients of g(xX)</text>
<line x1="540" y1="90" x2="540" y2="130" stroke="currentColor" stroke-width="1.4"/>
<polygon points="535,130 540,140 545,130"/>
<rect x="460" y="140" width="160" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="540" y="168" text-anchor="middle" font-weight="bold">LLL</text>
<text x="540" y="190" text-anchor="middle" font-size="12">a short vector</text>
<line x1="460" y1="175" x2="420" y2="175" stroke="currentColor" stroke-width="1.4"/>
<polygon points="420,170 410,175 420,180"/>
<rect x="250" y="140" width="160" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="165" text-anchor="middle">g with small</text>
<text x="330" y="187" text-anchor="middle">coefficients</text>
<line x1="250" y1="175" x2="210" y2="175" stroke="currentColor" stroke-width="1.4"/>
<polygon points="210,170 200,175 210,180"/>
<rect x="20" y="140" width="180" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="165" text-anchor="middle">|g(x₀)| &lt; N, so</text>
<text x="110" y="187" text-anchor="middle">g(x₀) = 0 over ℤ</text>
<text x="20" y="250" font-size="13">The root survives every step: it is a root of each basis polynomial mod N,</text>
<text x="20" y="272" font-size="13">so of every lattice vector; smallness turns "≡ 0 mod N" into "= 0".</text>
</svg>
<figcaption>Figure 13.4. Coppersmith's method in Howgrave-Graham's form. The hard problem, a root modulo N, becomes an easy one, a root over the integers, once a combination with small coefficients is found.</figcaption>
</figure>

**A tiny example by hand.** Take $N = 10{,}001$ and

$$
f(x) = x^2 + 7307x + 759 .
$$

It has a root $x_0 = 4$ modulo $N$: $16 + 29{,}228 + 759 = 30{,}003 = 3N$.
Suppose we know only that $|x_0| \le X = 5$. The coefficients of $f$ are large,
so $f$ itself fails step 1: $|f(x_0)|$ can be thousands of times $N$. Build the
lattice from $N$, $Nx$ and $f$, written as coefficient vectors of $g(xX)$
(constant, $x$, $x^2$ columns):

$$
\begin{pmatrix}
N & 0 & 0\\
0 & NX & 0\\
759 & 7307X & X^2
\end{pmatrix}
=
\begin{pmatrix}
10001 & 0 & 0\\
0 & 50005 & 0\\
759 & 36535 & 25
\end{pmatrix}.
$$

The determinant is $N^2 X^3 = 10{,}001^2 \cdot 125$, so $\det^{1/3}$ is about
$2300$, comfortably below $N$. LLL returns as its first vector
$(268, 185, -650)$, which is $g(xX)$ for

$$
g(x) = -26x^2 + 37x + 268 .
$$

Check where it came from: $g = -26f + 19Nx + 2N$, since
$-26 \cdot 7307 + 19 \cdot 10{,}001 = 37$ and $-26 \cdot 759 + 2 \cdot 10{,}001 = 268$.
So $g(4) \equiv 0 \pmod N$ like $f$. And for $|x| \le 5$,
$|g(x)| \le 268 + 37 \cdot 5 + 26 \cdot 25 = 1103 < 10{,}001$. Step 1 applies:
$g(4) = 0$ over the integers. Indeed $-416 + 148 + 268 = 0$. Solving
$-26x^2 + 37x + 268 = 0$ by the quadratic formula gives discriminant
$37^2 + 4 \cdot 26 \cdot 268 = 29{,}241 = 171^2$, so
$x = (-37 \pm 171)/(-52)$, which is $4$ or $-134/52$. The integer root is
$x_0 = 4$. The code in §13.7 runs this example through LLL and prints the same
vector.

**How far it reaches.** With only $N x^i$ for $i < \delta$ and $f$ itself, the
lattice has dimension $\delta + 1$ and determinant $N^\delta X^{\delta(\delta+1)/2}$,
and the condition works out to about $X < N^{2/(\delta(\delta + 1))}$: $N^{1/3}$ for
a quadratic, $N^{1/6}$ for a cubic. Coppersmith's full construction adds the
polynomials $N^{m-j} x^i f(x)^j$, which vanish modulo $N^m$, for a growing
parameter $m$. The lattice gets larger, the determinant grows more slowly than
the modulus $N^m$, and the bound climbs towards $N^{1/\delta}$. Reaching it
exactly needs lattices of dimension around $\log N$; in practice a few dozen
dimensions get most of the way.

**Two variables, and an unknown modulus.** Coppersmith's second 1996 paper
found small roots of two-variable polynomials over the integers, and used it to
factor $N$ when half the bits of $p$ are known. Howgrave-Graham recast that too:
if $p$ is an unknown divisor of $N$ with $p \ge N^{\beta}$, a small root of
$f(x) \equiv 0 \pmod p$ can be found without knowing $p$, by building the
lattice from $N^{m-j} x^i f(x)^j$, which vanish modulo $p^m$. Alexander May
gave the general bound in 2003: roots up to $N^{\beta^2/\delta}$. For
$\beta = 1/2$ and $\delta = 1$ that is $N^{1/4}$, half the bits of $p$.
Two-variable modular problems, like Boneh-Durfee's, use the same machinery but
are only heuristic.

## 13.7 Coppersmith at work

*Level: expert.*

**Stereotyped messages.** A device sends "Your one-time code is: " followed by
eight random characters, encrypted with $e = 3$ and no randomized padding. The
attacker knows the fixed text $A$ (shifted into place) and the ciphertext
$c$, and wants the unknown $x$ in

$$
(A + x)^3 - c \equiv 0 \pmod N, \qquad 0 \le x < 2^{64}.
$$

That is a monic cubic with a small root. Coppersmith's bound for a cubic is
$N^{1/3}$: up to a third of the bits of the block may be unknown. Real
"stereotyped" messages were common in 1990s designs: fixed headers, dates,
"the key for today is". The code below uses the smallest lattice, $N$, $Nx$,
$Nx^2$ and $f$, which reaches about $N^{1/6}$; for a 512-bit $N$ that is about
85 bits, enough for 64.

**Factoring with known high bits.** Suppose a leak gives the attacker the high
bits of $p$: a side channel during key generation, a damaged memory dump, a
key generator that puts a fixed pattern in the top. Write the known part as
$\tilde p$, so $p = \tilde p + x_0$ with $x_0$ small. Then $f(x) = \tilde p + x$
has the root $x_0$ modulo $p$, an unknown divisor of $N$ of size $N^{1/2}$.
May's bound with $\beta = 1/2$, $\delta = 1$ says roots up to $N^{1/4}$ can be
found: **knowing the top half of $p$ factors $N$**. The code uses the smallest
lattice for this, $N$, $f$ and $xf$, whose determinant $NX^3$ must stay below
about $p^3 \approx N^{3/2}$, so it reaches $X \approx N^{1/6}$, a third of
$p$'s bits. Larger lattices close the gap to a half.

**Partial key exposure.** Dan Boneh, Glenn Durfee and Yair Frankel showed in
1998 that for a small public exponent, the low quarter of the bits of $d$ is
enough to recover all of $d$. The key equation $ed = 1 + k(N - p - q + 1)$
taken modulo $2^{n/4}$, with $k < e$ tried one by one, gives $p$ modulo
$2^{n/4}$; that is a quarter of $N$'s bits, half of $p$'s, known in the low
positions, and the same lattice method factors $N$. Known **high** bits of $d$
help even more directly: for small $e$, the top half of $d$ can be computed
from the public key alone, since $d \approx (1 + k(N + 1))/e$ for the right
$k < e$, so the secret really lives in the bottom half. These results are why
side-channel attacks on RSA aim to leak only a fraction of the key bits and
leave the rest to a lattice ([Chapter 17](17-Side-Channels-the-Attackers-View.md)).

**Code it.** The block reduces lattices with a short LLL (a black box, slow
but fine in dimension 3 and 4), turns the short vectors back into
polynomials, and finds their common root over the rationals with a gcd. It
runs the hand example of §13.6, the stereotyped message, and the factoring
with known high bits:

```python
import random
from fractions import Fraction

def lll(rows, delta=Fraction(3, 4)):
    # Lenstra-Lenstra-Lovasz basis reduction, used here as a black box
    # (the Mathematics book explains it); slow but fine for small lattices
    B = [list(r) for r in rows]
    n = len(B)
    dot = lambda u, v: sum(x * y for x, y in zip(u, v))
    def gram_schmidt():
        Bs, mu = [], [[Fraction(0)] * n for _ in range(n)]
        for i in range(n):
            v = [Fraction(x) for x in B[i]]
            for j in range(i):
                mu[i][j] = dot(B[i], Bs[j]) / dot(Bs[j], Bs[j])
                v = [x - mu[i][j] * y for x, y in zip(v, Bs[j])]
            Bs.append(v)
        return Bs, mu
    Bs, mu = gram_schmidt()
    k = 1
    while k < n:
        for j in range(k - 1, -1, -1):
            c = round(mu[k][j])
            if c:
                B[k] = [x - c * y for x, y in zip(B[k], B[j])]
                Bs, mu = gram_schmidt()
        if dot(Bs[k], Bs[k]) >= (delta - mu[k][k - 1] ** 2) * dot(Bs[k - 1], Bs[k - 1]):
            k += 1
        else:
            B[k], B[k - 1] = B[k - 1], B[k]
            Bs, mu = gram_schmidt()
            k = max(k - 1, 1)
    return B

def small_root(polys, X):
    # polys: integer polynomials (lowest degree first) that all vanish at x0 mod
    # the same number; returns the polynomials of the reduced basis, as plain
    # integer polynomials g with g(x0) = 0 over the integers if |x0| < X is small enough
    size = max(len(f) for f in polys)
    rows = [[(f[i] if i < len(f) else 0) * X**i for i in range(size)] for f in polys]
    return [[r[i] // X**i for i in range(size)] for r in lll(rows)]

def rational_gcd(f, g):              # gcd of two polynomials over the rationals
    f, g = [Fraction(c) for c in f], [Fraction(c) for c in g]
    while any(g):
        while g and g[-1] == 0:
            g.pop()
        while len(f) >= len(g):
            c, s = f[-1] / g[-1], len(f) - len(g)
            f = [x - c * g[i - s] if i >= s else x for i, x in enumerate(f)]
            while f and f[-1] == 0:
                f.pop()
        f, g = g, f
    return [c / f[-1] for c in f]

# 1. The hand example of section 13.6: f(x) = x^2 + 7307x + 759 mod 10001
N = 10001
print(small_root([[N], [0, N], [759, 7307, 1]], 5)[0])

# 2. A stereotyped message, e = 3, a 512-bit modulus
def probably_prime(n):
    return n > 3 and all(pow(a, n - 1, n) == 1 for a in (2, 3, 5, 7, 11))

def prime_for_e3(bits):
    while True:
        p = random.getrandbits(bits) | (3 << (bits - 2)) | 1
        if p % 3 == 2 and probably_prime(p):
            return p

random.seed(13)
p, q = prime_for_e3(256), prime_for_e3(256)
N = p * q
A = int.from_bytes(b"Your one-time code is: ", "big") << 64   # the known part
code = int.from_bytes(b"Q7#kd2!z", "big")                       # 64 unknown bits
c = pow(A + code, 3, N)
f = [(A**3 - c) % N, 3 * A * A % N, 3 * A % N, 1]              # (A + x)^3 - c
g = small_root([[N], [0, N], [0, 0, N], f], 2**64)
x0 = -rational_gcd(g[0], g[1])[0]
print(int(x0).to_bytes(8, "big"))

# 3. Factoring with the high bits of p known
random.seed(5)
p, q = prime_for_e3(256), prime_for_e3(256)
N = p * q
known = p >> 80 << 80                # a leak gave away all but the low 80 bits of p
g = small_root([[N], [known, 1], [0, known, 1]], 2**80)        # N, f, x*f
x0 = -rational_gcd(g[0], g[1])[0]
print(N % (known + x0) == 0)
```

It prints:

```
[268, 37, -26]
b'Q7#kd2!z'
True
```

The first line is the hand example's $g(x) = 268 + 37x - 26x^2$, lowest degree
first. The second is the eight unknown characters. Note that the whole message,
"Your one-time code is: Q7#kd2!z", is 31 bytes, 247 bits, so its cube is far
larger than $N$: the plain cube root of book 1 fails, and Coppersmith's method
does not care. The third line says $\tilde p + x_0$ divides $N$: the 512-bit
modulus is factored from 176 known bits of $p$.

**In the real world.** In 2013 Daniel Bernstein, Yun-An Chang, Chen-Mou
Cheng, Li-Ping Chou, Nadia Heninger, Tanja Lange and Nicko van Someren
examined over two million RSA keys from Taiwan's national "Citizen Digital
Certificate" smart cards. The cards' faulty random number generator produced
primes with repeating patterns; a batch gcd factored many keys, and
Coppersmith's method with the patterns as "known bits" factored more. Their
paper's title is "Factoring RSA keys from certified smart cards: Coppersmith in
the wild"; in all they factored 184 keys.

The most famous use is **ROCA** (the "Return of Coppersmith's Attack"),
published by Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek
Matyáš of Masaryk University at ACM CCS 2017. Infineon's RSA library, used in
smart cards, TPM chips and the Estonian ID card, made primes of the special form
$p = kM + (65537^a \bmod M)$, where $M$ is a product of small primes. The
structure leaves far fewer unknown bits than a random prime. Guessing $a$
(there are few enough choices) turns the rest into a small root of a linear
polynomial modulo the unknown $p$, exactly the known-high-bits problem above,
and Howgrave-Graham's lattice finds it. A fingerprint test on the public key
tells instantly whether a key is affected. The researchers estimated the work
for a 2048-bit key at about 140 CPU-years in the worst case, expensive for one key but
affordable for a valuable one, and Estonia suspended the certificates of about
750,000 ID cards. The full story of ROCA, as a story about how keys are
generated, is in [Chapter 18](18-Random-Numbers-Gone-Wrong.md).

!!! note "Life story: Coppersmith's method"
    **Born:** EUROCRYPT 1996, Don Coppersmith of IBM (two papers: a small root
    of a univariate modular equation, and of a bivariate integer equation,
    with factoring from half the bits of $p$); simplified by Nick
    Howgrave-Graham in 1997 and generalized by Alexander May · **Purpose:** to
    find roots below $N^{1/\delta}$ of a degree-$\delta$ polynomial modulo $N$ (or
    modulo an unknown factor of $N$) without factoring · **Helped:** to break
    stereotyped messages, short pads, partial key exposure and small private
    exponents (Boneh-Durfee); to factor the Taiwanese smart-card keys (2013)
    and the ROCA keys (2017) · **Status:** the standard finishing tool of RSA
    cryptanalysis; harmless against randomized padding and properly generated
    keys

## 13.8 Bleichenbacher's million-message attack

*Level: expert.*

In SSL and TLS before version 1.3, the browser chose a random 48-byte
premaster secret, padded it with PKCS #1 v1.5 and encrypted it with the
server's RSA key. The padded block of $k$ bytes (the length of $N$) is

$$
\mathtt{00} \,\Vert\, \mathtt{02} \,\Vert\, \text{PS (at least 8 nonzero random bytes)} \,\Vert\, \mathtt{00} \,\Vert\, \text{message}.
$$

A server that receives a ciphertext decrypts it and checks the format. Daniel
Bleichenbacher of Bell Labs noticed in 1998 that SSL servers sent a different
alert when the format was wrong than when something later failed. That made the
server a **padding oracle**: anyone could send it a number $c'$ and learn one
bit, whether $c'^d \bmod N$ starts with `00 02`. [Chapter 10](10-Attacks-on-Modes-and-MACs.md)
did the same to CBC with a symmetric key; this is the public-key version, and
the arithmetic is different.

**Turning one bit into the plaintext.** Let $B = 2^{8(k-2)}$. A block starts
with `00 02` exactly when $2B \le m < 3B$. RSA is malleable, so the attacker
can send $c' = c \cdot s^e \bmod N$ for any $s$ it likes, and the server
decrypts that to $ms \bmod N$. A "yes" means

$$
2B \le ms - rN \le 3B - 1 \quad\text{for some integer } r,
\qquad\text{so}\qquad
\frac{2B + rN}{s} \le m \le \frac{3B - 1 + rN}{s}.
$$

Each yes confines $m$ to a few short intervals, one for each possible $r$.
The attacker keeps a set of intervals, starting from $[2B, 3B - 1]$, and
intersects it with every new constraint:

<div class="mars-steps" markdown>

1. **Blinding.** If $c$ itself is not conforming, multiply by random $s_0^e$ until it is. (In TLS the target is a real handshake, so it already conforms and $s_0 = 1$.)
2. **First search.** Try $s = \lceil N/3B \rceil, \lceil N/3B \rceil + 1, \ldots$ until the oracle says yes. Smaller $s$ cannot work: $ms$ would still be below $N$ and not in the band.
3. **Narrow.** For every $r$ from $\lceil (as - 3B + 1)/N \rceil$ to $\lfloor (bs - 2B)/N \rfloor$, replace $[a, b]$ by $\left[\max\!\left(a, \lceil (2B + rN)/s \rceil\right), \min\!\left(b, \lfloor (3B - 1 + rN)/s \rfloor\right)\right]$.
4. **Later searches.** With several intervals, keep trying $s$ upwards. With one interval $[a, b]$, choose $r \ge 2(bs - 2B)/N$ and try $s$ between $(2B + rN)/b$ and $(3B + rN)/a$. This roughly doubles $s$ each round and halves the interval.
5. **Stop** when the interval is a single number; that is $m$ (divided by $s_0$ if blinding was used).

</div>

**By hand, on a toy.** Real blocks have hundreds of bytes. Shrink the idea to
**hex digits**: $N = 1009 \cdot 1013 = 1{,}022{,}117$, which is `F98A5` in hex,
five digits. A block "conforms" when it starts `0 2`, that is, lies between
`02000` and `02FFF`. So $B = 16^3 = 4096$, $2B = 8192$, $3B = 12{,}288$. The
secret is $m =$ `02A5C` $= 10{,}844$.

- **First search.** $\lceil N/3B \rceil = \lceil 1{,}022{,}117 / 12{,}288 \rceil = 84$.
  The oracle says no for $s = 84, 85, \ldots, 377$ and yes at $s_1 = 378$,
  after 295 queries: $10{,}844 \cdot 378 = 4{,}099{,}032 = 4N + 10{,}564$, and
  $10{,}564$ is `02944`. The attacker sees only "yes".
- **Narrow.** $r$ runs from $\lceil (8192 \cdot 378 - 12{,}287)/N \rceil = \lceil 3.02 \rceil = 4$
  to $\lfloor (12{,}287 \cdot 378 - 8192)/N \rfloor = \lfloor 4.54 \rfloor = 4$:
  only $r = 4$. The new interval is from
  $\lceil (8192 + 4N)/378 \rceil = \lceil 4{,}096{,}660/378 \rceil = \lceil 10{,}837.7 \rceil = 10{,}838$
  to $\lfloor (12{,}287 + 4N)/378 \rfloor = \lfloor 4{,}100{,}755/378 \rfloor = \lfloor 10{,}848.6 \rfloor = 10{,}848$.
  One "yes" cut 4096 candidates to 11.
- **Halving.** The next rounds find yes at $s = 1132$ (interval
  $[10{,}843, 10{,}846]$), $s = 2546$ ($[10{,}843, 10{,}844]$) and $s = 5185$
  (the single value $10{,}844$), with 10 more queries in all. The attacker has
  `02A5C` after 305 queries, and never saw the key.

Figure 13.5 draws the narrowing. The block below checks the first search and
the first narrowing step; it is not a full attack program, only the hand
arithmetic:

```python
# The toy of section 13.8: blocks of five hex digits, "conforming" means 0x02xxx
n, B = 1009 * 1013, 16**3
m = 0x02A5C                          # the secret; the code below only uses it inside the oracle

def oracle(s):                       # the server: does s*m mod n start with 0 2?
    return 2 * B <= s * m % n < 3 * B

def ceil_div(a, b):
    return -(-a // b)

s, queries = ceil_div(n, 3 * B), 0   # step 2: the smallest useful multiplier
while True:
    queries += 1
    if oracle(s):
        break
    s += 1
print("s1 =", s, "after", queries, "queries")

a, b = 2 * B, 3 * B - 1              # step 3: what that one yes says about m
for r in range(ceil_div(a * s - 3 * B + 1, n), (b * s - 2 * B) // n + 1):
    lo = max(a, ceil_div(2 * B + r * n, s))
    hi = min(b, (3 * B - 1 + r * n) // s)
    print("r =", r, "-> m in", [lo, hi], [hex(lo), hex(hi)])
```

It prints:

```
s1 = 378 after 295 queries
r = 4 -> m in [10838, 10848] ['0x2a56', '0x2a60']
```

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The toy Bleichenbacher attack: the candidate interval for m shrinks from 8192 to 12287, to 10838 to 10848 after the first yes at s equals 378, then to 10843 to 10846, 10843 to 10844, and finally 10844, after 305 queries in total" fill="currentColor" font-size="14">
<text x="20" y="30" font-weight="bold">candidates for m</text>
<text x="620" y="30" text-anchor="end" font-weight="bold">queries so far</text>
<rect x="20" y="45" width="420" height="22" rx="2" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/>
<text x="450" y="61">[8192, 12287]</text>
<text x="620" y="61" text-anchor="end">0</text>
<rect x="20" y="85" width="200" height="22" rx="2" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/>
<text x="230" y="101">s = 378: [10838, 10848]</text>
<text x="620" y="101" text-anchor="end">295</text>
<rect x="20" y="125" width="90" height="22" rx="2" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/>
<text x="120" y="141">s = 1132: [10843, 10846]</text>
<text x="620" y="141" text-anchor="end">300</text>
<rect x="20" y="165" width="45" height="22" rx="2" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/>
<text x="75" y="181">s = 2546: [10843, 10844]</text>
<text x="620" y="181" text-anchor="end">304</text>
<rect x="20" y="205" width="12" height="22" rx="2" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>
<text x="42" y="221">s = 5185: m = 10844 = 0x02A5C</text>
<text x="620" y="221" text-anchor="end">305</text>
<text x="20" y="258" font-size="13">Bar lengths are on a logarithmic scale: 4096, 11, 4, 2 and 1 candidates.</text>
</svg>
<figcaption>Figure 13.5. The toy attack's intervals. Almost all the queries go into finding the first "yes"; after that each yes about halves what is left.</figcaption>
</figure>

**The real cost.** With a 1024-bit key, $N/B$ is about $2^{16}$, so a random
$s$ gives a conforming block with probability around $2^{-16}$, and lower when
the server also checks the eight nonzero bytes and the `00` separator.
Bleichenbacher estimated that about $2^{20}$ chosen ciphertexts, roughly a
million, decrypt one message, hence the name. As in the toy, the first search
dominates. The stricter the server's checks, the rarer a yes and the slower
the attack; but strictness does not close the oracle, only an identical answer
does. Bardou and colleagues (CRYPTO 2012) refined the algorithm, with
"trimmers" that find small multipliers for the first interval, and cut the
median to thousands of queries for permissive oracles, enough to extract keys
from hardware tokens in minutes.

**Decryption is also signing.** The oracle computes $c^d$ for the attacker's
$c$. Choose $c$ to be a padded hash of a message of your choice, and the same
attack produces $(\text{that})^d$: a valid signature under the server's key. A
server that uses one RSA key for both decryption and signing is a signing
oracle too, which is how ROBOT, below, signed a message with a famous website's
key.

**Fix it.** TLS 1.0 (1999) already told servers what to do: on any padding
error, continue the handshake with a random premaster secret, so that the
failure shows up only later, as a failed Finished message, identical to any
other. Getting every code path, every alert and every timing to match turned
out to be the hard part, as the next section shows. The lasting fix is not to
use PKCS #1 v1.5 encryption at all.

!!! note "Life story: Bleichenbacher's million-message attack"
    **Born:** CRYPTO 1998, Daniel Bleichenbacher of Bell Labs · **Purpose:** to
    show that a server revealing whether a PKCS #1 v1.5 block is well formed
    decrypts any ciphertext, about a million queries for 1024-bit keys ·
    **Helped:** to bring OAEP into PKCS #1 v2.0 (1998), the TLS
    countermeasure (1999), and eventually the removal of RSA key transport
    from TLS 1.3 (2018) · **Status:** rediscovered in new places almost every
    few years (§13.9); the reason PKCS #1 v1.5 encryption is avoided

## 13.9 The oracle returns: ROBOT, DROWN and Marvin

*Level: intermediate.*

The countermeasure works only if the server behaves the same in every case,
and servers have many ways to differ: an alert, a closed connection, a
timeout, a timing difference, a cache footprint. Each decade found new ones.
In 2003 Vlastimil Klíma, Ondřej Pokorný and Tomáš Rosa showed that a check of
the two TLS version bytes inside the premaster secret gave a new oracle. In
2012 Tibor Jager, Sebastian Schinzel and Juraj Somorovsky broke XML Encryption
the same way, and Romain Bardou's team broke hardware security tokens.

**DROWN (2016).** Nimrod Aviram and fourteen co-authors showed that SSL 2.0,
long disabled in browsers, still endangered TLS. SSL 2.0 is a Bleichenbacher
oracle by design, especially with its 40-bit "export" ciphers, and many
servers that no longer used it for anything still accepted it, or shared their
RSA key with another server that did, such as a mail server using the same
certificate. The attacker records about 1,000 TLS handshakes that use RSA key
transport, finds one whose ciphertext can be adapted into a valid SSL 2.0 key
exchange, and runs the oracle against the SSL 2.0 server: about 40,000
connections and $2^{50}$ computation, under eight hours and a few hundred
dollars of cloud computing in the authors' estimate. With an old OpenSSL bug
("special DROWN") it took under a minute. At disclosure in March 2016, about a
third of HTTPS servers were vulnerable, most of them through key reuse. The
protocol side of the story is in [Chapter 19](19-Protocol-Breaks.md).

**ROBOT (2017).** Hanno Böck, Juraj Somorovsky and Craig Young went back to
basics in December 2017 with the "Return Of Bleichenbacher's Oracle Threat".
They scanned for servers that answered malformed RSA ciphertexts differently,
by alert type, by connection reset, by timeout, and found the oracle in
products from F5, Citrix, Radware, Cisco and others, and on many of the most
visited sites, including Facebook and PayPal. To prove the point without
decrypting anyone's traffic, they used Facebook's oracle to sign a message
with the private key of facebook.com's certificate.

**Marvin (2023).** Hubert Kario of Red Hat showed that the remaining
differences are often only timing: nanoseconds of extra work when a padding
check fails, measurable with enough repetitions over a network. He found it in
many libraries. His conclusion, "the Marvin Attack", is that PKCS #1 v1.5
decryption cannot be made reliably safe in general-purpose code. OpenSSL's
answer was **implicit rejection** (version 3.2, 2023): on a padding error,
return a pseudorandom message derived from the ciphertext and the key,
so that the caller cannot tell an error happened. In between, the "9 Lives of
Bleichenbacher's CAT" (2019) found the oracle again through CPU cache
side channels in library code.

!!! note "Life story: DROWN"
    **Born:** 1 March 2016, Nimrod Aviram, Sebastian Schinzel, Juraj
    Somorovsky, Nadia Heninger and colleagues (USENIX Security 2016) ·
    **Purpose:** to show that SSL 2.0 support anywhere, even on another server
    sharing the key, turns into a Bleichenbacher oracle against modern TLS ·
    **Helped:** to purge SSL 2.0 and export ciphers from servers, and to make
    "never share a key across protocols" a rule · **Status:** fixed where
    patched; the lesson about key reuse is permanent

!!! note "Life story: ROBOT"
    **Born:** 12 December 2017, Hanno Böck, Juraj Somorovsky and Craig Young
    (USENIX Security 2018) · **Purpose:** to show that Bleichenbacher's 1998
    oracle was still live in major TLS products and websites nineteen years
    later · **Helped:** patches from many vendors; pushed sites to disable RSA
    key transport entirely · **Status:** RSA key transport is gone from TLS
    1.3; the oracle still appears wherever PKCS #1 v1.5 decryption survives

## 13.10 Bleichenbacher's 2006 signature forgery

*Level: intermediate.*

A PKCS #1 v1.5 signature on a message is $s = \text{EM}^d \bmod N$, where the
encoded block EM is fully determined by the message:

$$
\text{EM} = \mathtt{00} \,\Vert\, \mathtt{01} \,\Vert\, \mathtt{FF} \cdots \mathtt{FF} \,\Vert\, \mathtt{00} \,\Vert\, \text{DigestInfo} \,\Vert\, H(\text{message}),
$$

with as many `FF` bytes as it takes to fill $k$ bytes. DigestInfo is a short
fixed ASN.1 header naming the hash. The verifier computes $s^e \bmod N$ and
checks the block. At the CRYPTO 2006 rump session Bleichenbacher pointed out
that many verifiers checked it the wrong way: they **parsed** it, skipping
`00 01`, then the `FF` bytes up to the `00`, then reading DigestInfo and the
hash, and never checked that the hash ended exactly at the end of the block.
Whatever followed the hash was ignored. With $e = 3$, that is fatal.

**By hand, in decimal first.** Can you find a whole number whose cube starts
with the digits 1998? Take the cube root of the largest number with that
start and enough digits, and round down. With 13 digits:
$\sqrt[3]{1{,}998{,}999{,}999{,}999} = 12{,}597.1\ldots$, and
$12{,}597^3 = 1{,}998{,}947{,}500{,}173$. It starts with 1998. With only 10 digits
it fails: $\sqrt[3]{1{,}998{,}999{,}999} = 1259.7\ldots$ gives
$1259^3 = 1{,}995{,}616{,}979$. Rounding a cube root changes the cube by about
$3s^2$, which is about two thirds of the digits; so the free digits at the end
must be at least twice as many as the fixed digits at the start.

The forger does exactly this in binary. The fixed part is
`00 01 FF … FF 00 DigestInfo H(message)`; the rest of the block is free
"garbage" that the sloppy verifier never reads. If the fixed part is at most
about a third of the block, an integer cube root of
"prefix followed by all ones" is a signature whose cube starts with the prefix.
And since $s^3$ is smaller than $N$, the modulus never enters: the forger does
not even need to look at the key, only at its length.

**Hal Finney's version.** Writing the attack up for the OpenPGP mailing list
in August 2006, Hal Finney gave an exact formula for a 3072-bit key and SHA-1.
Let $D$ be the 36 bytes `00 DigestInfo H` read as a number, and $N' = 2^{288} - D$,
with the message chosen so that 3 divides $N'$. Then

$$
\left(2^{1019} - \frac{N' \cdot 2^{34}}{3}\right)^3
= 2^{3057} - N' \cdot 2^{2072} + \frac{N'^2 \cdot 2^{1087}}{3} - \cdots,
$$

and the first two terms are the block `00 01`, then 87 bytes of `FF`, then
$D$, while the remaining terms are smaller than $2^{2072}$, garbage in the
last 259 bytes. A pencil, some patience, and no key. Figure 13.6 shows the
layout of a forgery against a 3072-bit key with SHA-256.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Byte layout of a genuine and a forged PKCS 1 version 1.5 signature block for a 3072-bit key: the genuine block has 330 FF bytes and ends with the hash; the forged block has only 8 FF bytes, the DigestInfo and hash, then 322 bytes of garbage that a sloppy verifier ignores" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">genuine block, 384 bytes</text>
<rect x="20" y="40" width="40" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="40" y="62" text-anchor="middle" font-size="12">00 01</text>
<rect x="60" y="40" width="420" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="270" y="62" text-anchor="middle">FF × 330</text>
<rect x="480" y="40" width="20" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="490" y="62" text-anchor="middle" font-size="11">00</text>
<rect x="500" y="40" width="120" height="34" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.3"/>
<text x="560" y="62" text-anchor="middle" font-size="12">Info + hash</text>
<text x="20" y="118" font-weight="bold">forged block, 384 bytes</text>
<rect x="20" y="130" width="40" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="40" y="152" text-anchor="middle" font-size="12">00 01</text>
<rect x="60" y="130" width="40" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="80" y="152" text-anchor="middle" font-size="12">FF×8</text>
<rect x="100" y="130" width="20" height="34" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="110" y="152" text-anchor="middle" font-size="11">00</text>
<rect x="120" y="130" width="120" height="34" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.3"/>
<text x="180" y="152" text-anchor="middle" font-size="12">Info + hash</text>
<rect x="240" y="130" width="380" height="34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 3"/>
<text x="430" y="152" text-anchor="middle">garbage × 322 (never read)</text>
<text x="20" y="200" font-size="13">The forger picks the first 62 bytes and takes an integer cube root; the cube's</text>
<text x="20" y="220" font-size="13">tail is whatever it is. A strict verifier compares all 384 bytes and rejects it.</text>
</svg>
<figcaption>Figure 13.6. A genuine block and a forged one (widths not to scale). The sloppy verifier reads the same fields in both and stops after the hash.</figcaption>
</figure>

**Code it.** The code makes a real 3072-bit key with $e = 3$, forges a
signature for a message without using the private key, and shows that a
sloppy verifier accepts it and a strict one, which rebuilds the expected block
and compares it whole, rejects it:

```python
import hashlib, random

def probably_prime(n):
    return n > 3 and all(pow(a, n - 1, n) == 1 for a in (2, 3, 5, 7, 11))

def prime3(bits):                     # p % 3 == 2, so e = 3 is a valid exponent
    while True:
        p = random.getrandbits(bits) | (1 << (bits - 1)) | 1
        if p % 3 == 2 and probably_prime(p):
            return p

def icbrt(x):                         # largest s with s**3 <= x
    lo, hi = 0, 1 << (x.bit_length() // 3 + 2)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if mid ** 3 <= x: lo = mid
        else: hi = mid - 1
    return lo

SHA256_INFO = bytes.fromhex("3031300d060960864801650304020105000420")
K = 384                               # a 3072-bit key: blocks of 384 bytes

def sloppy_verify(n, sig, msg):       # the 2006 bug: it never checks what follows the hash
    block = pow(sig, 3, n).to_bytes(K, "big")
    if block[:2] != b"\x00\x01": return False
    i = 2
    while block[i] == 0xFF: i += 1
    if block[i] != 0 or i < 10: return False
    i += 1
    if block[i:i + 19] != SHA256_INFO: return False
    return block[i + 19:i + 51] == hashlib.sha256(msg).digest()

def strict_verify(n, sig, msg):       # rebuild the whole block and compare (RFC 8017)
    t = SHA256_INFO + hashlib.sha256(msg).digest()
    want = b"\x00\x01" + b"\xff" * (K - 3 - len(t)) + b"\x00" + t
    return pow(sig, 3, n).to_bytes(K, "big") == want

random.seed(2006)
n = prime3(1536) * prime3(1536)       # the victim's key; the forger never uses its factors
msg = b"Pay Mallory 1,000,000 dollars"
prefix = b"\x00\x01" + b"\xff" * 8 + b"\x00" + SHA256_INFO + hashlib.sha256(msg).digest()
g = 8 * (K - len(prefix))             # bits left over for garbage
sig = icbrt(((int.from_bytes(prefix, "big") + 1) << g) - 1)
print(len(prefix), "byte prefix,", g // 8, "bytes of garbage")
print("sloppy verifier:", sloppy_verify(n, sig, msg))
print("strict verifier:", strict_verify(n, sig, msg))
```

It prints:

```
62 byte prefix, 322 bytes of garbage
sloppy verifier: True
strict verifier: False
```

**In the real world.** The bug was everywhere in 2006: OpenSSL fixed it in
September (CVE-2006-4339), and Mozilla's NSS, GnuTLS and others followed. It
came back in 2014 as **BERserk**, found independently by Antoine
Delignat-Lavaud and by Intel's security research team: NSS, the library of
Firefox and then Chrome, parsed the ASN.1 lengths so loosely that garbage
could hide *inside* the DigestInfo, and forged certificates for any website
were possible for keys with $e = 3$. In 2019 Sze Yiu Chau and colleagues found
variants in several IPsec and embedded TLS libraries with symbolic execution.
Variants with garbage in the middle need less free space, so they work for
2048-bit keys and sometimes for larger $e$.

**Fix it.** RFC 8017 says how: build the expected block from the hash and
compare it byte for byte, never parse the signed block. A large exponent
($e = 65537$) makes the cube-root trick useless, because a 65537th root leaves
no room for garbage. PSS signatures, verified as RFC 8017 specifies, have no
such loose format to exploit.

!!! note "Life story: Bleichenbacher's e = 3 signature forgery"
    **Born:** August 2006, Daniel Bleichenbacher at the CRYPTO rump session;
    written up by Hal Finney · **Purpose:** to show that a verifier which parses
    a PKCS #1 v1.5 block instead of comparing it lets anyone forge $e = 3$
    signatures with an integer cube root · **Helped:** to fix OpenSSL, NSS and
    many others (2006), and BERserk (2014); to make "encode, then compare" the
    rule · **Status:** still found in new parsers; harmless for strict
    verifiers and $e = 65537$

## 13.11 Manger's attack on OAEP

*Level: expert.*

OAEP was the answer to the 1998 attack: a hash-based, randomized padding
with a security proof. In 2001 James Manger of Telstra in Australia showed that
an implementation of OAEP, as PKCS #1 v2.0 then specified it, could still
leak, and leak more per query than v1.5 did.

OAEP decoding starts by checking that the decrypted number fits in $k - 1$
bytes, that is, that its first byte is `00`; then it unmasks the seed and the
data block and checks a hash. If an attacker can tell "first byte not zero"
from "hash check failed", by an error code or by timing, the server answers
the question: **is $ms \bmod N$ below $B = 2^{8(k-1)}$?** That oracle is
better than Bleichenbacher's. A "yes" is likely (since $N$ is less than $256B$)
and each answer splits the interval in two:

<div class="mars-steps" markdown>

1. Try $f_1 = 2, 4, 8, \ldots$ until $f_1 m \ge B$ (answer "no"). Then $m$ lies in $[B/f_1,\ 2B/f_1)$.
2. Start from $f_2 = \lfloor (N + B)/B \rfloor \cdot f_1/2$ and add $f_1/2$ until $f_2 m \bmod N < B$ (answer "yes"). Then $f_2 m$ lies in $[N, N + B)$, so $m$ lies in $[N/f_2,\ (N + B)/f_2)$.
3. Binary search: each further query chooses $f$ so that $fm$ straddles a boundary $iN + B$, and the answer halves the interval.

</div>

On the hex toy of §13.8 ($N =$ `F98A5`, now with $B = 16^4 = 65{,}536$ and the
same $m = 10{,}844$): $2m$ and $4m$ are below $B$, $8m = 86{,}752$ is not, so
$m \in [8192, 16{,}384)$ after 3 queries. Step 2 starts at
$f_2 = \lfloor 1{,}087{,}653 / 65{,}536 \rfloor \cdot 4 = 64$ and steps by 4;
the first "yes" is $f_2 = 96$, since $96m = 1{,}041{,}024 = N + 18{,}907$. Now
$m \in [\lceil N/96 \rceil, \lfloor (N + B)/96 \rfloor] = [10{,}648, 11{,}329]$,
after 12 queries. Ten halvings later only $10{,}844$ is left: 22 queries,
against 305 for Bleichenbacher's oracle on the same toy. For a 1024-bit key
Manger's attack needs about $\log_2 N$, a little over a thousand queries.

The OAEP proof was not wrong. It assumes the decryption either returns the
message or a single "reject", and an implementation that rejects in two
distinguishable ways is not the scheme the proof is about. PKCS #1 v2.1 (2002)
and RFC 8017 tell implementers to make every decryption error look the same,
including in time.

!!! note "Life story: Manger's attack"
    **Born:** CRYPTO 2001, James Manger of Telstra · **Purpose:** to show that
    distinguishable errors in OAEP decoding give an oracle that decrypts in
    about $\log_2 N$ queries · **Helped:** to rewrite the OAEP decoding rules
    in PKCS #1 v2.1 so that all errors are identical · **Status:** OAEP stands;
    implementations must keep its errors indistinguishable, including in timing

## 13.12 The CRT fault attack

*Level: intermediate.*

Almost every RSA implementation signs with the Chinese remainder theorem: it
computes $s_p = m^{d_p} \bmod p$ and $s_q = m^{d_q} \bmod q$ with half-size
numbers and joins them, three to four times faster than one full
exponentiation (book 1, §13.9). In September 1996 Dan Boneh, Richard DeMillo
and Richard Lipton of Bellcore announced that if a fault, a glitch in voltage,
a cosmic ray, a bug, corrupts one half, the faulty signature factors the key.

**Why.** Suppose $s_q$ is right and $s_p$ is wrong. The joined $s'$ is then
correct modulo $q$ and wrong modulo $p$. So $s'^e \equiv m \pmod q$ but not
modulo $p$, and

$$
\gcd(s'^e - m,\ N) = q .
$$

Bellcore's version compared a correct and a faulty signature of the same
message, $\gcd(s - s', N) = q$. Arjen Lenstra noted within weeks that one
faulty signature and the message are enough, as above.

**By hand.** Use book 1's key: $p = 61$, $q = 53$, $N = 3233$, $e = 17$,
$d = 2753$. The CRT exponents are $d_p = 2753 \bmod 60 = 53$ and
$d_q = 2753 \bmod 52 = 49$, and $q^{-1} \bmod p = 38$. Sign $m = 1000$.

<div class="mars-steps" markdown>

1. The halves: $m \bmod 61 = 24$ and $24^{53} \bmod 61 = 23$; $m \bmod 53 = 46$ and $46^{49} \bmod 53 = 36$.
2. Join (Garner's formula): $h = 38 \cdot (23 - 36) \bmod 61 = 55$, $s = 36 + 55 \cdot 53 = 2951$. Check: $2951^{17} \bmod 3233 = 1000$.
3. A fault flips the lowest bit of $s_p$: $23$ becomes $22$. Then $h' = 38 \cdot (22 - 36) \bmod 61 = 17$ and $s' = 36 + 17 \cdot 53 = 937$.
4. The attacker checks: $937^{17} \bmod 3233 = 2802 \ne 1000$, a bad signature. But $2802 - 1000 = 1802 = 34 \cdot 53$, and $\gcd(1802, 3233) = 53$.

</div>

**Code it.** A 2048-bit key, a simulated one-bit fault in a random position
of $s_p$, both gcds, and the fix:

```python
import hashlib, random
from math import gcd

def probably_prime(n):
    return n > 3 and all(pow(a, n - 1, n) == 1 for a in (2, 3, 5, 7, 11))

def prime(bits):
    while True:
        p = random.getrandbits(bits) | (3 << (bits - 2)) | 1
        if probably_prime(p):
            return p

random.seed(1996)
p, q = prime(1024), prime(1024)
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))
dp, dq, qinv = d % (p - 1), d % (q - 1), pow(q, -1, p)

def sign_crt(m, glitch=False):
    sp = pow(m, dp, p)               # the half mod p
    sq = pow(m, dq, q)               # the half mod q
    if glitch:
        sp ^= 1 << random.randrange(1024)   # one bit of sp flips in a register
    h = qinv * (sp - sq) % p         # Garner's recombination
    return sq + h * q

def sign_checked(m):                 # the fix: verify before letting the signature out
    s = sign_crt(m, glitch=True)
    if pow(s, e, n) != m:
        raise RuntimeError("fault detected, signature withheld")
    return s

# a deterministic padded hash, standing in for PKCS #1 v1.5
m = int.from_bytes(hashlib.sha256(b"firmware 4.2 for the router").digest() * 8, "big") % n
good, bad = sign_crt(m), sign_crt(m, glitch=True)
print(pow(good, e, n) == m, pow(bad, e, n) == m)
f = gcd(pow(bad, e, n) - m, n)       # Lenstra: one bad signature and the message
print(f == q, n // f == p)
print(gcd(good - bad, n) == q)       # Boneh-DeMillo-Lipton: a good and a bad one
try:
    sign_checked(m)
except RuntimeError as err:
    print(err)
```

It prints:

```
True False
True True
True
fault detected, signature withheld
```

**In the real world.** Faults need not be induced. In 2015 Florian Weimer of
Red Hat scanned TLS servers and found some that sent faulty RSA-CRT
signatures, from hardware errors and buggy accelerators, and leaked their keys
to anyone who connected. George Sullivan, Jackson Sippe, Nadia Heninger and
Eric Wustrow showed in 2022 that such signatures could still be collected
passively. In 2023 Keegan Ryan, Kaiwen He, George Sullivan and Nadia Heninger
did the same for SSH, where the signed value is not known to an observer, and
used a lattice (the partial-knowledge idea of §13.7) to recover 189 RSA host
keys from faulty signatures in years of scan data. Deliberate faults, by
voltage, clock or laser, are the attacker's tool against smart cards
([Chapter 17](17-Side-Channels-the-Attackers-View.md)).

**Fix it.** Verify every signature with the public key before releasing it:
one exponentiation with $e = 65537$, a few percent of the cost of signing.
Smart cards add fault sensors and redundant computation. Randomized padding
(PSS) also blocks Lenstra's one-signature version, because the attacker does
not know the padded value $m$; but with partial knowledge of it the lattice
methods return, as the SSH case shows, so the check is still needed.

!!! note "Life story: the Bellcore fault attack"
    **Born:** September 1996, Dan Boneh, Richard DeMillo and Richard Lipton at
    Bellcore (EUROCRYPT 1997); Arjen Lenstra's one-signature version, 1996 ·
    **Purpose:** to show that one computational error in RSA-CRT signing
    factors the modulus · **Helped:** to make "verify before you release"
    standard in libraries and smart cards, and to found the field of fault
    attacks · **Status:** still finds keys on the Internet (2015, 2022, 2023)
    wherever the check is missing

## 13.13 The lesson: RSA is not broken, its uses are

*Level: intermediate.*

Look back at the chapter. Not one attack inverted the RSA function on a
properly made key with a random message. Each needed something extra:

| Attack | What the attacker was given | What stops it |
|---|---|---|
| Common modulus (§13.2) | two keys on one $N$ | one modulus per key |
| Håstad (§13.3) | one message, $e$ keys, small $e$ | randomized padding; $e = 65537$ |
| Franklin-Reiter (§13.4) | two related messages | randomized padding |
| Wiener, Boneh-Durfee (§13.5) | a small $d$ | full-size $d$; CRT for speed |
| Coppersmith (§13.6, §13.7) | a mostly known message or key | randomized padding; good key generation |
| Bleichenbacher 1998 (§13.8, §13.9) | a padding oracle | OAEP, or no RSA encryption at all |
| Bleichenbacher 2006 (§13.10) | a sloppy verifier, $e = 3$ | encode and compare; $e = 65537$; PSS |
| Manger (§13.11) | distinguishable OAEP errors | identical errors and timing |
| CRT fault (§13.12) | one wrong signature | verify before release |

The left column is about how RSA was used; the right column is modern
practice. In standards form:

- **Encryption: OAEP**, as specified in RFC 8017 and allowed for key transport
  in SP 800-56B, with constant-time decoding and a single error. PKCS #1 v1.5
  encryption is kept only for compatibility, and NIST stopped allowing it for
  key transport after 2023.
- **Signatures: PSS**, randomized and with a tight security proof, or PKCS #1
  v1.5 signatures verified by encoding and comparing. FIPS 186-5 (2023) allows
  both, with moduli of at least 2048 bits, $65537 \le e < 2^{256}$, and
  $d > 2^{n/2}$.
- **Better still, a KEM.** RSA-KEM (Victor Shoup, 2001) needs no padding at
  all: pick a random $r < N$, send $r^e \bmod N$, and derive the key as
  $\text{KDF}(r)$. There is no format to check and so no oracle; any $r$ is
  valid. Its proof needs only the RSA assumption and a random-oracle KDF.
  SP 800-56B's "RSASVE" scheme is this construction.
- **Key generation** as FIPS 186-5 specifies, from a good random generator,
  with independent primes that are far apart, and a fresh modulus per key.
- **One key, one job.** ROBOT signed with a decryption key; DROWN attacked TLS
  through an SSL 2.0 server holding the same key.
- **Implementations** that verify their own signatures, run in constant time,
  and reject invalid ciphertexts implicitly.

**And the move away from RSA.** TLS 1.3 (RFC 8446, 2018) removed RSA key
transport entirely. The reasons were Bleichenbacher's oracles and the lack of
forward secrecy: anyone who later obtains the server's RSA key can decrypt
every recorded session. Key exchange is now ephemeral Diffie-Hellman, usually
on elliptic curves, and RSA survives only as a signature, which TLS 1.3
requires to be PSS in the handshake. Most new systems sign with ECDSA or
Ed25519, which are smaller and faster. And quantum computers running Shor's
algorithm would factor $N$ at any size ([Chapter 11](11-Factoring.md)), so the
long-term replacements are the lattice schemes ML-KEM and ML-DSA. RSA will
remain in certificates, code signing and old systems for years, and every
attack in this chapter will keep turning up wherever it is used carelessly.

## 13.14 Going deeper

*Level: expert.*

**How far small private exponents can go.** Boneh and Durfee's $N^{0.292}$ has
stood since 1999. Mathias Herrmann and Alexander May (2010) reached the same
bound with a simpler lattice through "unravelled linearization", and
experiments sometimes do a little better than the theory. Whether the true
limit is $N^{0.5}$, as Boneh and Durfee conjectured, is open. For small CRT
exponents, Bleichenbacher and May (2006) and later Takayasu, Lu and Peng
(2017) gave lattice attacks when $d_p$ and $d_q$ are both very small, up to
about $N^{0.122}$.

**The general small-roots theorem.** May's form: if $b \ge N^\beta$ is an
unknown divisor of $N$ and $f$ is monic of degree $\delta$, every root
$|x_0| \le N^{\beta^2/\delta}$ of $f(x) \equiv 0 \pmod b$ is found in
polynomial time. Coppersmith's two theorems are the cases $\beta = 1$ and
$(\beta, \delta) = (1/2, 1)$. Multivariate versions are heuristic but used
everywhere, from Boneh-Durfee to partial key exposure with unknown blocks of
bits in the middle of the key.

**The oracles, measured.** Bardou and colleagues classified
Bleichenbacher oracles by which checks the server makes (the `00` separator,
the minimum padding length, the exact message length) and showed the query
count ranges from thousands to tens of millions accordingly. ROBOT's
contribution was a scanner that recognized oracles by any observable
difference, including timeouts and TCP resets. Marvin moved the measurement to
statistics over timing.

**Is breaking RSA as hard as factoring?** Not known. Factoring breaks RSA; the
converse is open. Dan Boneh and Ramarathnam Venkatesan (EUROCRYPT 1998)
showed that for small $e$, an "algebraic" reduction from factoring to
breaking RSA would itself yield a factoring algorithm, a hint that low-exponent
RSA might be easier than factoring. Divesh Aggarwal and Ueli Maurer
(EUROCRYPT 2009) showed that in a model where the attacker may only do ring
operations on $\mathbb{Z}_N$, breaking RSA is as hard as factoring. Computing
$d$, as §13.2 noted, is equivalent to factoring.

**What the padding proofs say.** OAEP's original 1994 proof had a gap,
found by Victor Shoup in 2001; Eiichiro Fujisaki, Tatsuaki Okamoto, David
Pointcheval and Jacques Stern repaired it for RSA specifically, in the random
oracle model. PSS has a tight proof (Bellare and Rogaway, 1996; Coron, 2002).
None of these proofs covers implementation behavior: Manger's attack and
Marvin live entirely outside them.

**Faults on randomized signatures.** Jean-Sébastien Coron, Antoine Joux, Ilya
Kizhvatov, David Naccache and Pascal Paillier (CHES 2009) used Coppersmith's
method to apply the fault attack to signatures whose padded message is only
partly known, the idea the 2023 SSH attack scaled up.

## Check yourself

??? question "1. Alice and Bob share N = 3233, with e₁ = 7 and e₂ = 11. Why does an outsider need the gcd of the exponents to be 1?"

    The attack needs $a e_1 + b e_2 = 1$ to get $m^1$. If
    $\gcd(e_1, e_2) = g > 1$, the best combination gives $m^g$, and the
    attacker is left with taking a $g$-th root modulo $N$, which is RSA
    decryption again (easy only if $m^g < N$).

??? question "2. With the toy key of §13.2, an insider tries g = 5. What happens?"

    $5^{195} \bmod 3233 = 2256$, $2256^2 \bmod 3233 = 794$ and
    $794^2 \bmod 3233 = 1$. The square root of 1 found is 794 again, and
    $\gcd(793, 3233) = 61$ factors the modulus.

??? question "3. Håstad's attack with e = 3 is run on ciphertexts from only two recipients. Why does it fail in general, and when does it still work?"

    The CRT gives $m^3$ modulo $N_1 N_2$ only. If $m^3 \ge N_1 N_2$ the result
    is a residue, not the integer cube, and the cube root is wrong. It still
    works if $m^3 < N_1 N_2$, that is, if $m$ is shorter than about two thirds
    of a modulus.

??? question "4. Two orders, m and m + 7, are encrypted with e = 3 under N = 2773, giving 740 and 1185. Recover m."

    By the closed form of §13.4: numerator
    $7(1185 + 1480 - 343) = 16{,}254 \equiv 2389$, denominator
    $1185 - 740 + 686 = 1131$, whose inverse is 2366;
    $2389 \cdot 2366 \equiv 1000 \pmod{2773}$. So $m = 1000$.

??? question "5. Compute the continued fraction of 17/60 and its convergents."

    $17/60 = [0; 3, 1, 1, 8]$, since $60 = 3 \cdot 17 + 9$,
    $17 = 1 \cdot 9 + 8$, $9 = 1 \cdot 8 + 1$, $8 = 8 \cdot 1$. The
    convergents are $0/1, 1/3, 1/4, 2/7, 17/60$.

??? question "6. A 4096-bit modulus has d of 1100 bits. Is Wiener's attack a threat? Boneh-Durfee's?"

    Wiener needs $d < \tfrac13 N^{1/4}$, about 1022 bits: no. Boneh-Durfee
    reaches about $0.292 \cdot 4096 \approx 1196$ bits: yes, heuristically.
    FIPS 186-5 would require $d > 2^{2048}$ anyway.

??? question "7. In Coppersmith's method, why does it help that the lattice's polynomials vanish modulo N^m instead of N?"

    The integer-root condition becomes $|g(x_0)| < N^m$, a much larger target,
    while the determinant of the larger lattice grows more slowly than $N^m$.
    The ratio improves with $m$, and the bound on $X$ rises towards
    $N^{1/\delta}$.

??? question "8. In the hex toy of §13.8 the first yes came at s = 378. Show that it confines m to [10838, 10848]."

    A yes means $8192 \le 378m - 1{,}022{,}117r \le 12{,}287$. With
    $m \in [8192, 12{,}287]$ only $r = 4$ is possible, and then
    $4{,}096{,}660 \le 378m \le 4{,}100{,}755$, so
    $10{,}837.7 \le m \le 10{,}848.6$.

??? question "9. Why does a decryption oracle for RSA also let the attacker sign messages?"

    Decryption and signing are the same operation, $x \mapsto x^d \bmod N$.
    If the attacker can get $x^d$ for any $x$ it chooses (as Bleichenbacher's
    attack provides, query by query), it chooses $x$ = the padded hash of its
    message and obtains a valid signature. Hence one key, one job.

??? question "10. A library verifies each RSA-CRT signature before releasing it. Name a fault this check does not catch."

    A fault that corrupts the message or its hash *before* signing: the
    library correctly signs the wrong value, the check passes, and the
    signature is valid for that wrong value. It does not factor the key, but
    it shows the check protects the key, not the meaning. Faults in the check
    itself (skipping it with a glitch) are the other classic answer, which is
    why smart cards add redundancy.

## What you learned

- RSA itself was never inverted on a properly made key; every attack in this
  chapter used something extra the attacker was given.
- A shared modulus leaks messages by Euclid's algorithm and leaks the factors
  to any key holder; knowing $d$ is equivalent to factoring.
- With small $e$, the Chinese remainder theorem turns a broadcast into a cube
  root (Håstad), and a polynomial gcd turns related messages into plaintexts
  (Franklin-Reiter).
- A private exponent below $\tfrac13 N^{1/4}$ is a convergent of $e/N$
  (Wiener); lattices push this to $N^{0.292}$ (Boneh-Durfee).
- Coppersmith's method finds small roots modulo $N$ by turning them into
  roots over the integers with a lattice: stereotyped messages, short pads,
  partial key exposure, half of $p$, ROCA.
- A server that leaks one bit about padding decrypts for the attacker:
  Bleichenbacher (1998), DROWN, ROBOT, Marvin; Manger did the same to OAEP
  with fewer queries.
- A verifier that parses instead of comparing accepts $e = 3$ forgeries made
  with an integer cube root.
- One faulty RSA-CRT signature factors the key; verify before release.
- Modern practice: OAEP or RSA-KEM, PSS, $e = 65537$, full-size $d$,
  identical errors, one key per job, and increasingly no RSA at all.

**Next:** [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md) turns to
signatures built on discrete logarithms, where the weak point is the nonce.

## Further reading

- Dan Boneh, "Twenty Years of Attacks on the RSA Cryptosystem" (*Notices of
  the AMS*, 1999). The survey this chapter follows in its first half.
- Gustavus Simmons, "A 'Weak' Privacy Protocol Using the RSA Crypto
  Algorithm" (*Cryptologia*, 1983); John DeLaurentis, "A Further Weakness in
  the Common Modulus Protocol for the RSA Cryptoalgorithm" (*Cryptologia*,
  1984).
- Alexander May, "Computing the RSA Secret Key Is Deterministic Polynomial
  Time Equivalent to Factoring" (CRYPTO 2004).
- Johan Håstad, "On Using RSA with Low Exponent in a Public Key Network"
  (CRYPTO '85) and "Solving Simultaneous Modular Equations of Low Degree"
  (*SIAM Journal on Computing*, 1988).
- Don Coppersmith, Matthew Franklin, Jacques Patarin and Michael Reiter,
  "Low-Exponent RSA with Related Messages" (EUROCRYPT 1996).
- Michael Wiener, "Cryptanalysis of Short RSA Secret Exponents" (*IEEE
  Transactions on Information Theory*, 1990).
- Dan Boneh and Glenn Durfee, "Cryptanalysis of RSA with Private Key d Less
  than N^0.292" (EUROCRYPT 1999).
- Don Coppersmith, "Small Solutions to Polynomial Equations, and Low Exponent
  RSA Vulnerabilities" (*Journal of Cryptology*, 1997), collecting the two
  EUROCRYPT 1996 papers.
- Nick Howgrave-Graham, "Finding Small Roots of Univariate Modular Equations
  Revisited" (IMA Cryptography and Coding, 1997).
- Alexander May, "Using LLL-Reduction for Solving RSA and Factorization
  Problems" (in *The LLL Algorithm*, Springer, 2010). A readable survey.
- Dan Boneh, Glenn Durfee and Yair Frankel, "An Attack on RSA Given a Small
  Fraction of the Private Key Bits" (ASIACRYPT 1998).
- Daniel Bernstein and others, "Factoring RSA Keys from Certified Smart Cards:
  Coppersmith in the Wild" (ASIACRYPT 2013).
- Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek Matyáš, "The
  Return of Coppersmith's Attack: Practical Factorization of Widely Used RSA
  Moduli" (ACM CCS 2017).
- Daniel Bleichenbacher, "Chosen Ciphertext Attacks Against Protocols Based
  on the RSA Encryption Standard PKCS #1" (CRYPTO 1998).
- Romain Bardou, Riccardo Focardi, Yusuke Kawamoto, Lorenzo Simionato, Graham
  Steel and Joe-Kai Tsay, "Efficient Padding Oracle Attacks on Cryptographic
  Hardware" (CRYPTO 2012).
- Nimrod Aviram and others, "DROWN: Breaking TLS Using SSLv2" (USENIX
  Security 2016).
- Hanno Böck, Juraj Somorovsky and Craig Young, "Return Of Bleichenbacher's
  Oracle Threat (ROBOT)" (USENIX Security 2018).
- Hubert Kario, "Everlasting ROBOT: the Marvin Attack" (ESORICS 2023).
- Hal Finney, "Bleichenbacher's RSA signature forgery based on implementation
  error" (OpenPGP mailing list, August 2006).
- Sze Yiu Chau and others, "Analyzing Semantic Correctness with Symbolic
  Execution: A Case Study on PKCS#1 v1.5 Signature Verification" (NDSS 2019).
- James Manger, "A Chosen Ciphertext Attack on RSA Optimal Asymmetric
  Encryption Padding (OAEP) as Standardized in PKCS #1 v2.0" (CRYPTO 2001).
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of
  Checking Cryptographic Protocols for Faults" (EUROCRYPT 1997).
- George Sullivan, Jackson Sippe, Nadia Heninger and Eric Wustrow, "Open to a
  Fault: On the Passive Compromise of TLS Keys via Transient Errors" (USENIX
  Security 2022); Keegan Ryan, Kaiwen He, George Sullivan and Nadia Heninger,
  "Passive SSH Key Compromise via Lattices" (ACM CCS 2023).
- Victor Shoup, "OAEP Reconsidered" (CRYPTO 2001), and his RSA-KEM proposal
  for ISO (2001).
- Standards: RFC 8017 (PKCS #1 v2.2, 2016), FIPS 186-5 (2023),
  SP 800-56B (RSA key establishment), RFC 8446 (TLS 1.3, 2018).
