# 13. Identity-Based, Attribute-Based and Functional Encryption

*Ordinary public-key encryption needs the recipient's public key before anything
can be sent, and fetching and trusting that key is the job of a whole
infrastructure of certificates. This chapter follows a different idea: let the
recipient's name be the public key, and later, let a rule ("any medic on shift in
District 3") or even a function be the thing a key unlocks. You will sign with
Shamir's identity-based scheme of 1984, compute Jacobi symbols by hand, build
Clifford Cocks's identity-based encryption of 2001 and send a message bit by bit
to an e-mail address that has no key yet, see why the authority that issues the
keys can read everything, revoke one player out of eight in a broadcast scheme of
the kind that protected Blu-ray discs, share a secret down an access policy and
watch two colluding users break the naive version, and compute a weighted average
of encrypted marks without decrypting any single mark. The chapter ends at the
far frontier: functional encryption for any function and indistinguishability
obfuscation, which exist in theory and are nowhere near practical.*

!!! abstract "In this chapter"
    **You will learn:**

    - why certificates are a burden, and what Shamir proposed in 1984 instead;
    - how Shamir's identity-based signatures work, by hand and in code;
    - what the Jacobi symbol is, how to compute it without factoring, and why it
      says nothing about whether a number is a square;
    - how Cocks's identity-based encryption turns square roots modulo $pq$ into
      a cipher, worked with $N = 77$ and coded end to end;
    - how Boneh and Franklin's scheme uses a pairing to do the same far more
      efficiently, in outline;
    - why the private key generator can decrypt every message (key escrow), the
      ways people have tried to blunt that, and where identity-based encryption is
      deployed (RFC 5091, Voltage's e-mail encryption, MIKEY-SAKKE);
    - how broadcast encryption lets a publisher lock out one player among
      millions, and how the AACS key for HD DVD and Blu-ray leaked in 2007;
    - what attribute-based encryption is, why collusion is the attack it must stop,
      and how rarely it is deployed;
    - what functional encryption and indistinguishability obfuscation promise, how
      the first candidates were attacked, what Jain, Lin and Sahai proved in 2020,
      and which of these tools survive quantum computers.

    **You need:** RSA from book 1's [Chapter 13](../../book/13-RSA.md),
    discrete-log groups from [Chapter 14](../../book/14-Discrete-Log-Systems.md),
    and certificates from [Chapter 16](../../book/16-PKI-and-Key-Establishment.md).
    Shamir secret sharing and Lagrange interpolation come from
    [Chapter 2](02-Secret-Sharing.md). Quadratic residues are treated fully in the
    mathematics book's [Chapter 5](../mathematics/05-Square-Roots-Mod-p.md), and
    pairings in its [Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md);
    this chapter uses both and links there for the proofs. Book 1's
    [Chapter 23](../../book/23-Advanced-Protocols.md) is the short tour of advanced
    protocols that this book expands.

    **Levels:** §13.1 to §13.3 and §13.9 are for beginners; §13.4 to §13.8 and
    §13.10 to §13.12 are intermediate; §13.13 to §13.15 are expert.

## 13.1 The problem

*Level: beginner.*

Suppose Alice wants to send Bob an encrypted e-mail. With RSA or elliptic-curve
encryption she first needs Bob's public key. She has to find it, perhaps by
asking Bob, perhaps by looking in a directory, and then she has to believe that
the key she found really is Bob's and not one planted by an attacker. The usual
answer is a **certificate**: a statement, signed by an authority Alice already
trusts, that binds the name "bob@example.com" to a particular public key. The
protocols book's [Chapter 2](../protocols/02-Certificates-and-PKI.md) is about how
that system works on the web, and how often it has failed.

For e-mail the system has never worked well. Bob must have generated a key pair
before Alice writes, which most people never do. Alice must be able to fetch
Bob's certificate, which means a directory that answers for the whole world. And
Alice must check the certificate's chain and whether it has been revoked. If Bob
has not set any of this up, Alice cannot encrypt at all. The protocols book's
[Chapter 15](../protocols/index.md) tells the story of
OpenPGP and S/MIME, two serious attempts that most people never used.

In 1984 Adi Shamir, the S in RSA, asked a question that cuts through all of
this. What if Bob's public key were simply his name? Not a key that a directory
links to his name, but the name itself, or his e-mail address, or his phone
number. Then Alice needs nothing from Bob: she encrypts to the string
"bob@example.com" and sends. There is no certificate to fetch and no chain to
check, because there is nothing to bind: the key is the name.

Something must give, of course. If anyone can compute the public key from the
name, then the private key cannot be generated by Bob, because nobody could then
connect the two. Shamir's answer was a trusted **key generation center** that holds
a master secret. Bob proves to the center that he is Bob, in whatever way the
organization already uses to check identities, and the center computes Bob's
private key from its master secret and his name and gives it to him. Alice only
needs the center's public parameters, published once for everyone.

Shamir's paper, "Identity-Based Cryptosystems and Signature Schemes" (CRYPTO
'84), gave a working **identity-based signature** scheme built from RSA. For
encryption he gave none. He conjectured that identity-based encryption existed
and invited others to find it. Seventeen years passed. A few schemes appeared in
the late 1980s and 1990s, but they were either broken or needed the key center to
do an impractical amount of work for each user (Ueli Maurer and Yacov Yacobi's
1991 scheme, for example, had the center compute discrete logarithms in a group
chosen to make that just barely feasible). Then in 2001, within a few months,
two practical answers appeared from two directions. Dan Boneh and Matthew
Franklin used pairings on elliptic curves, and Clifford Cocks used quadratic
residues modulo a product of two primes. A Japanese team, Ryuichi Sakai, Kiyoshi
Ohgishi and Masao Kasahara, had already described a pairing-based identity-based
scheme in a Japanese symposium paper in January 2000, which was little known in
the West at the time.

Cocks was not a newcomer to public-key cryptography. As a young mathematician at
GCHQ, the British signals intelligence agency, he had invented in 1973 what was
in effect RSA, four years before Rivest, Shamir and Adleman, to make real an idea
of his colleague James Ellis called "non-secret encryption". The work stayed
classified until 1997. His identity-based scheme was published in the open, at a
conference on coding and cryptography in Cirencester in December 2001.

Once the idea of encrypting to a string existed, people asked for more. Why
encrypt to one name, rather than to a description of who may read: "any doctor in
the cardiology department", "any medic on shift in District 3"? That is
**attribute-based encryption**, introduced by Amit Sahai and Brent Waters in 2005.
And why stop at deciding who reads the whole message? A key might reveal only a
function of the message: the total of a column of salaries, but no single salary.
That is **functional encryption**, defined in general by Boneh, Sahai and Waters
in 2011. At the end of that road lies **indistinguishability obfuscation**, a
tool so strong that most of cryptography can be built from it, first proposed in
2013 and put on standard assumptions only in 2020.

Running beside this story is a more commercial one: **broadcast encryption**,
where a publisher encrypts one disc, or one satellite stream, so that millions of
licensed players can read it and a few revoked ones cannot. Its best-known
deployment, the AACS system for HD DVD and Blu-ray, became famous in 2007 when one
of its keys leaked and was posted across the internet faster than lawyers could
take it down.

Every scheme in this chapter pays for its convenience the same way: somebody
holds a master key that can make anyone's private key. That cost, **key
escrow**, is built into the idea, and we will meet it again in every section.
Figure 13.1 shows the whole story at a glance.

<figure class="mars-fig">
<svg viewBox="0 0 640 470" width="640" role="img" aria-label="Timeline from Cocks's secret 1973 public-key work to Cloudflare's 2023 use of attribute-based encryption" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="462" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1973</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Cocks invents RSA-style encryption at GCHQ (secret)</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1984</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">Shamir: identity-based signatures; asks for encryption</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">1993</text>
<circle cx="92" cy="74" r="3.5"/>
<text x="108" y="79">Fiat and Naor define broadcast encryption</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">2000</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">Sakai, Ohgishi, Kasahara: a pairing-based scheme</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="126" r="4.5"/>
<text x="108" y="131" font-weight="bold">Boneh-Franklin and Cocks: practical IBE</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="152" r="3.5"/>
<text x="108" y="157">Naor, Naor, Lotspiech: subset-cover revocation</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">2002</text>
<circle cx="92" cy="178" r="3.5"/>
<text x="108" y="183">Voltage Security founded; hierarchical IBE</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Sahai and Waters: fuzzy IBE, the start of ABE</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2007</text>
<circle cx="92" cy="230" r="4.5"/>
<text x="108" y="235" font-weight="bold">AACS processing key leaks; RFC 5091; CP-ABE</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="256" r="3.5"/>
<text x="108" y="261">Gentry, Peikert, Vaikuntanathan: IBE from lattices</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2011</text>
<circle cx="92" cy="282" r="3.5"/>
<text x="108" y="287">Boneh, Sahai, Waters define functional encryption</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="308" r="3.5"/>
<text x="108" y="313">MIKEY-SAKKE (RFC 6509) for UK government voice</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="334" r="4.5"/>
<text x="108" y="339" font-weight="bold">First candidate indistinguishability obfuscation</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="360" r="3.5"/>
<text x="108" y="365">Inner-product FE from DDH; attacks on multilinear maps</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">ETSI publishes two ABE specifications</text>
<text x="78" y="417" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="412" r="4.5"/>
<text x="108" y="417" font-weight="bold">Jain, Lin, Sahai: iO from well-founded assumptions</text>
<text x="78" y="443" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="438" r="3.5"/>
<text x="108" y="443">Cloudflare's Geo Key Manager v2 runs on ABE</text>
</svg>
<figcaption>Figure 13.1. Encrypting to names, policies and functions, from Cocks's secret work at GCHQ to attribute-based encryption in a content network. Bold marks the turning points.</figcaption>
</figure>

## 13.2 Shamir's identity-based signatures

*Level: beginner.*

Signatures are the easy half of Shamir's question, and his 1984 scheme shows what
"the name is the key" looks like in practice. It uses RSA arithmetic, so it is
worth recalling the one fact it needs: if $n = pq$ and $ed \equiv 1 \pmod{\varphi(n)}$,
then raising to the power $e$ and raising to the power $d$ undo each other modulo
$n$. Anyone can raise to $e$; only someone who knows the factors of $n$ can find
$d$ and raise to $d$.

### The scheme

- **Setup.** The key center picks primes $p$, $q$, computes $n = pq$, chooses a
  public exponent $e$ coprime to $(p-1)(q-1)$, and computes the secret
  $d = e^{-1} \bmod (p-1)(q-1)$. It publishes $n$, $e$ and a hash function $f$.
- **Identity.** Bob's identity is a number $I$ derived from his name by a public
  hash.
- **Extract.** After checking that the person in front of it really is Bob, the
  center gives him $g = I^d \bmod n$. This is an RSA signature on his name by the
  center, but it is kept secret: it is Bob's private key. Note $g^e = I$.
- **Sign** a message $m$. Bob picks a random $r$, computes $t = r^e \bmod n$, and
  $s = g \cdot r^{f(t, m)} \bmod n$. The signature is $(t, s)$.
- **Verify.** Anyone checks $s^e \equiv I \cdot t^{f(t, m)} \pmod n$, using only
  the public $n$, $e$, $f$ and Bob's name.

Why it works:

$$
s^e = g^e \cdot r^{e f(t,m)} = I \cdot (r^e)^{f(t,m)} = I \cdot t^{f(t,m)} \pmod n .
$$

Why a forger is stuck: to produce $s$ with $s^e = I \cdot t^{f(t,m)}$ for a fresh
$t$, a forger must take an $e$-th root modulo $n$, which is the RSA problem. The
random $r$ hides $g$: each signature multiplies $g$ by a fresh $r^{f}$, so
signatures do not reveal Bob's key. (If $r$ were reused for two messages, dividing
the two values of $s$ would give $r^{f_1 - f_2}$, and from there an attacker can
recover $g$; nonces matter here as they do in every Schnorr-like scheme, a story
told in [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md).)

### By hand

Take the classic textbook RSA numbers $p = 47$, $q = 59$, so $n = 2773$ and
$(p-1)(q-1) = 2668$. With $e = 17$, the secret is $d = 157$, since
$17 \cdot 157 = 2669 = 2668 + 1$.

1. **Identity.** Say Bob's name hashes to $I = 1234$.
2. **Extract.** The center computes $g = 1234^{157} \bmod 2773 = 726$. (Check:
   $726^{17} \bmod 2773 = 1234$.)
3. **Sign.** Bob picks $r = 5$. Then $t = 5^{17} \bmod 2773 = 508$. Suppose the hash
   of $t$ and the message is $f(t, m) = 7$. Then $5^7 = 78125 \equiv 481$, and
   $s = 726 \cdot 481 = 349206 \equiv 2581 \pmod{2773}$. The signature is $(508, 2581)$.
4. **Verify.** $2581^{17} \bmod 2773 = 1853$, and $1234 \cdot 508^{7} \bmod 2773 = 1853$.
   The two sides agree.

The verifier never saw a certificate. It used Bob's name, the hash and the
center's public numbers, nothing else.

### Code it

```python
# Shamir's identity-based signatures (1984), in a toy RSA group.
# Real systems use a modulus of 2048 bits or more; this one is 2773 = 47 * 59.
import hashlib

p, q = 47, 59                  # the key center's secret primes
n = p * q
e = 17                         # public, the same for everyone
d = pow(e, -1, (p - 1) * (q - 1))   # 157, the key center's secret

def H(*parts):                 # a hash, reduced to a number mod n
    data = "|".join(str(x) for x in parts).encode()
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % n

def identity(name):            # the public key is just the name, hashed
    return H("id", name)

def extract(name):             # the key center gives Bob I^d mod n
    return pow(identity(name), d, n)

def sign(g, message, r):
    t = pow(r, e, n)
    s = g * pow(r, H(t, message), n) % n
    return t, s

def verify(name, message, t, s):
    return pow(s, e, n) == identity(name) * pow(t, H(t, message), n) % n

g = extract("bob@arcadia.mars")
t, s = sign(g, "Dome 4 airlock inspected", r=5)
print("Bob's identity number:", identity("bob@arcadia.mars"), " key:", g)
print("signature:", (t, s))
print("valid for Bob:  ", verify("bob@arcadia.mars", "Dome 4 airlock inspected", t, s))
print("valid for Carol:", verify("carol@arcadia.mars", "Dome 4 airlock inspected", t, s))
print("altered message:", verify("bob@arcadia.mars", "Dome 4 airlock skipped", t, s))
```

```text
Bob's identity number: 1029  key: 883
signature: (508, 1051)
valid for Bob:   True
valid for Carol: False
altered message: False
```

The signature checks against Bob's name and fails against Carol's or against a
changed message. In a modulus this small, a random forgery would succeed with
probability about one in 2773; with a 2048-bit modulus the chance is nil. (A
real implementation would also pick $r$ with the `secrets` module, never a fixed
5.)

Notice what the center can do: it knows $d$, so it can compute $g$ for any name
and sign as anyone. That is acceptable inside one organization, where the center
is the organization, and unacceptable almost everywhere else. Hold that thought;
it returns in §13.6.

!!! note "Life story: Shamir's identity-based signatures"
    **Born:** 1984, Adi Shamir, "Identity-Based Cryptosystems and Signature
    Schemes" (CRYPTO '84) · **Purpose:** signatures that verify against a name,
    with no certificate, keys issued by a trusted center from an RSA trapdoor ·
    **Helped:** defined the identity-based setting and the open problem of
    identity-based encryption; the Fiat-Shamir (1986) and Guillou-Quisquater (1988)
    identification schemes work in the same identity-based model · **Status:**
    historical; identity-based signatures today use pairings (Cha and Cheon, 2003),
    ordinary elliptic curves (ECCSI, RFC 6507) or lattices, but Shamir's is still the clearest
    first example.

Why did encryption take seventeen more years? In Shamir's signature scheme, the
key center's trapdoor ($d$) turns a public value ($I$) into a secret one ($I^d$),
and the scheme only needs the secret to *produce* something checkable. For
encryption, Alice must turn Bob's name into something that locks a message so that
only $I^d$, or some other secret derived from $I$, unlocks it. With RSA, the
obvious attempt fails: every user would share the same modulus $n$, and anyone who
holds one key pair $(e, d)$ for $n$ can factor $n$ and compute everybody's keys.
A different trapdoor was needed. Cocks found one in square roots, the subject of
the next two sections.

## 13.3 Squares, square roots and the Jacobi symbol

*Level: beginner.*

A number $a$ is a **quadratic residue** (a square) modulo $n$ if $x^2 \equiv a \pmod n$
for some $x$. Modulo 7, the squares of $1, 2, \dots, 6$ are $1, 4, 2, 2, 4, 1$, so
the nonzero squares are $\{1, 2, 4\}$ and the non-squares are $\{3, 5, 6\}$.
Modulo 11, the nonzero squares are $\{1, 3, 4, 5, 9\}$. For a prime $p$, exactly
half of the nonzero numbers are squares.

### The Legendre symbol

For an odd prime $p$, the **Legendre symbol** $\left(\frac{a}{p}\right)$ is $+1$ if
$a$ is a nonzero square mod $p$, $-1$ if it is not, and $0$ if $p$ divides $a$.
Euler's criterion computes it with one exponentiation:

$$
\left(\frac{a}{p}\right) \equiv a^{(p-1)/2} \pmod p .
$$

For example, $3^{(7-1)/2} = 27 \equiv -1 \pmod 7$, so 3 is not a square mod 7, as the
list showed. Two facts matter in this chapter:

- The symbol is multiplicative: $\left(\frac{ab}{p}\right) = \left(\frac{a}{p}\right)\left(\frac{b}{p}\right)$.
- If $p \equiv 3 \pmod 4$, then $-1$ is **not** a square mod $p$, because
  $(-1)^{(p-1)/2} = -1$ when $(p-1)/2$ is odd. So for such a prime, exactly one of
  $a$ and $-a$ is a square.

Primes that are $3 \bmod 4$ have a second gift: square roots are easy. If $a$ is a
square mod $p$ and $p \equiv 3 \pmod 4$, then $x = a^{(p+1)/4}$ is a square root,
since $x^2 = a^{(p+1)/2} = a \cdot a^{(p-1)/2} = a \cdot 1$. The mathematics book's
[Chapter 5](../mathematics/05-Square-Roots-Mod-p.md) proves these facts and handles
the harder primes.

### The Jacobi symbol

Now let $N = pq$ be a product of two odd primes. The **Jacobi symbol** extends
the Legendre symbol by multiplying:

$$
\left(\frac{a}{N}\right) = \left(\frac{a}{p}\right)\left(\frac{a}{q}\right) .
$$

Here is the surprise that powers Cocks's scheme. The definition uses $p$ and $q$,
but the Jacobi symbol can be computed **without knowing them**, as fast as a
greatest common divisor, using three rules (Gauss's law of quadratic reciprocity
and its supplements), valid for odd positive $m, n$:

1. Reduce the top: $\left(\frac{a}{n}\right) = \left(\frac{a \bmod n}{n}\right)$.
2. Factors of two: $\left(\frac{2}{n}\right) = +1$ if $n \equiv 1, 7 \pmod 8$, and
   $-1$ if $n \equiv 3, 5 \pmod 8$.
3. Flip: $\left(\frac{m}{n}\right) = \left(\frac{n}{m}\right)$, except that the sign
   changes when both $m$ and $n$ are $3 \bmod 4$.

By hand, compute $\left(\frac{59}{77}\right)$, with no factoring:

- 59 and 77: $77 \equiv 1 \pmod 4$, so flip with no sign change:
  $\left(\frac{59}{77}\right) = \left(\frac{77}{59}\right) = \left(\frac{18}{59}\right)$.
- $18 = 2 \cdot 9$, and 9 is a square, so $\left(\frac{18}{59}\right) = \left(\frac{2}{59}\right)$.
- $59 \equiv 3 \pmod 8$, so $\left(\frac{2}{59}\right) = -1$.

So $\left(\frac{59}{77}\right) = -1$. Check with the factors $77 = 7 \cdot 11$:
$59 \equiv 3 \pmod 7$, a non-square ($-1$), and $59 \equiv 4 \pmod{11}$, a square
($+1$); the product is $-1$. The two methods agree.

### What the Jacobi symbol does not say

If $\left(\frac{a}{N}\right) = -1$, then $a$ is certainly not a square mod $N$: one of
its Legendre symbols is $-1$. But if $\left(\frac{a}{N}\right) = +1$, there are two
cases. Either both Legendre symbols are $+1$, and $a$ is a square mod $N$; or both
are $-1$, and $a$ is not a square mod either prime, though its Jacobi symbol is
$+1$. Mod 77, the number 15 is of the first kind ($15 \equiv 1 \pmod 7$ and
$15 \equiv 4 \pmod{11}$, both squares) and 6 is of the second ($6$ is a non-square
mod 7 and mod 11).

Telling the two kinds apart without the factors is the **quadratic residuosity
problem**. Nobody knows how to do it faster than factoring $N$. Shafi Goldwasser
and Silvio Micali built the first provably secure public-key encryption on it in
1982 (encrypting one bit as a square or a non-square of Jacobi symbol $+1$), and
Cocks's identity-based scheme rests on the same problem.

One more definition. A **Blum integer** is $N = pq$ with $p \equiv q \equiv 3 \pmod 4$,
named after Manuel Blum, who used them for coin flipping by telephone
([Chapter 3](03-Commitments.md)). Modulo a Blum integer, $-1$ has Jacobi symbol
$(-1)(-1) = +1$ but is not a square. So for every $a$ with Jacobi symbol $+1$,
exactly one of $a$ and $-a$ is a square mod $N$: if $a$ is a non-square mod both
primes, then $-a$ is a square mod both.

### Code it

```python
# The Jacobi symbol (a/n) for odd n > 0, computed like a gcd: no factoring needed.
def jacobi(a, n):
    assert n > 0 and n % 2 == 1
    a %= n
    result = 1
    while a != 0:
        while a % 2 == 0:              # pull out factors of 2
            a //= 2
            if n % 8 in (3, 5):        # (2/n) = -1 when n = 3 or 5 mod 8
                result = -result
        a, n = n, a                    # quadratic reciprocity: flip
        if a % 4 == 3 and n % 4 == 3:  # sign changes when both are 3 mod 4
            result = -result
        a %= n
    return result if n == 1 else 0     # 0 when gcd(a, n) > 1

N = 77                                  # 7 * 11, both 3 mod 4
squares = {x * x % N for x in range(N)}
print("(59/77) =", jacobi(59, N), "  (15/77) =", jacobi(15, N), "  (22/77) =", jacobi(22, N))
plus = [a for a in range(1, N) if jacobi(a, N) == 1]
print(len(plus), "numbers have symbol +1;",
      sum(a in squares for a in plus), "of them are squares mod 77")
print("-1 is a square mod 77?", (N - 1) in squares, "  its symbol:", jacobi(-1, N))
print("6 has symbol", jacobi(6, N), "but is it a square?", 6 in squares)
```

```text
(59/77) = -1   (15/77) = 1   (22/77) = 0
30 numbers have symbol +1; 15 of them are squares mod 77
-1 is a square mod 77? False   its symbol: 1
6 has symbol 1 but is it a square? False
```

Of the 60 numbers coprime to 77, thirty have Jacobi symbol $+1$ and exactly half of
those are squares. The symbol is 0 for 22 because 22 shares the factor 11 with 77:
in a real modulus of 2048 bits, stumbling on such a number by chance is as hard as
factoring. The loop runs in about as many steps as Euclid's algorithm, so it is
fast even for huge numbers.

## 13.4 Cocks's identity-based encryption

*Level: intermediate.*

Every identity-based encryption scheme has four algorithms:

- **Setup**, run once by the private key generator (PKG): make a master secret and
  publish public parameters.
- **Extract**, run by the PKG for each user: turn a name into that name's private
  key, using the master secret.
- **Encrypt**, run by anyone: lock a message to a name, using only the public
  parameters and the name.
- **Decrypt**, run by the user: unlock with the private key.

In Cocks's scheme the master secret is the factorization of a Blum integer
$N = pq$, the public parameter is $N$ itself, and the private key for a name is a
square root modulo $N$ that only someone who knows $p$ and $q$ can compute.

### Setup and Extract

The PKG picks primes $p \equiv q \equiv 3 \pmod 4$ and publishes $N = pq$ and a
hash function. A name, such as an e-mail address, is hashed to a number $a$ modulo
$N$ with Jacobi symbol $\left(\frac{a}{N}\right) = +1$: hash the name, and if the
symbol is not $+1$, hash it again with a counter until it is. Anyone can do this,
because the Jacobi symbol needs no factors.

By §13.3, exactly one of $a$ and $-a$ is a square mod $N$. The PKG computes

$$
r = a^{(N + 5 - p - q)/8} \bmod N ,
$$

and gives $r$ to the owner of the name. It satisfies $r^2 \equiv a$ or $r^2 \equiv -a$.

Why this exponent works: $N + 5 - p - q = (p - 1)(q - 1) + 4 = \varphi(N) + 4$.
Both $p - 1$ and $q - 1$ are $2 \bmod 4$, so their product is $4$ times an odd
number, which is $4 \bmod 8$; adding 4 makes it divisible by 8, so the exponent is
a whole number. Then

$$
r^2 = a^{(\varphi(N) + 4)/4} = a \cdot a^{\varphi(N)/4} .
$$

Modulo $p$, the factor $a^{\varphi(N)/4} = \left(a^{(p-1)/2}\right)^{(q-1)/2}$ is
the Legendre symbol $\left(\frac{a}{p}\right)$ raised to the odd power $(q-1)/2$,
which is just $\left(\frac{a}{p}\right)$. Modulo $q$ it is $\left(\frac{a}{q}\right)$.
Those two symbols are equal (their product is the Jacobi symbol, $+1$), call
their common value $\varepsilon$, and so $r^2 \equiv \varepsilon a$ modulo both primes,
hence modulo $N$. If $a$ is a square, $r^2 = a$; if not, $r^2 = -a$.

### Encrypt and Decrypt, one bit at a time

Cocks's scheme encrypts a single bit, written as $x = +1$ or $x = -1$. Assume for
now that the recipient's key satisfies $r^2 = a$.

- **Encrypt.** Pick a random $t$ with Jacobi symbol $\left(\frac{t}{N}\right) = x$,
  and send
  $$
  s = t + \frac{a}{t} \bmod N .
  $$
- **Decrypt.** Compute $\left(\frac{s + 2r}{N}\right)$. That is $x$.

Why: replace $a$ by $r^2$,

$$
s + 2r = t + 2r + \frac{r^2}{t} = \frac{t^2 + 2rt + r^2}{t} = \frac{(t + r)^2}{t} .
$$

A square has Jacobi symbol $+1$, and $\left(\frac{1/t}{N}\right) = \left(\frac{t}{N}\right)$,
so $\left(\frac{s + 2r}{N}\right) = \left(\frac{t}{N}\right) = x$.

The sender does not know whether the recipient holds a root of $a$ or of $-a$; only
the PKG, which knows the factors, can tell. So she covers both cases. With a second
random $t'$ of the same Jacobi symbol $x$ she also sends $s' = t' - a/t'$, and the
recipient whose key has $r^2 = -a$ decrypts with $\left(\frac{s' + 2r}{N}\right)$,
by the same algebra with $-a = r^2$. Each bit of the message costs two numbers
modulo $N$.

What does an eavesdropper face? She sees $s$, knows $a$ and $N$, and wants the
Jacobi symbol of the $t$ that was used. Knowing $s$, the equation $t^2 - st + a = 0$
has four roots $t$ modulo $N$, and they come in pairs $t$, $a/t$ of equal symbol;
deciding which symbol they have, without a square root of $a$, is as hard as the
quadratic residuosity problem. Cocks's paper proves that, with the identity hash
modeled as a random oracle.

### By hand, with $N = 77$

Use $p = 7$, $q = 11$, both $3 \bmod 4$. The exponent is $(77 + 5 - 7 - 11)/8 = 64/8 = 8$.

1. **Identity.** Suppose Bob's name hashes to $a = 15$. Its Jacobi symbol is $+1$
   (15 is a square mod 7 and mod 11, §13.3).
2. **Extract.** $15^2 = 225 \equiv 71$, $15^4 \equiv 71^2 = 5041 \equiv 36$,
   $15^8 \equiv 36^2 = 1296 \equiv 64$. So $r = 64$. Check: $64^2 = 4096 \equiv 15$.
   Bob's key is a root of $a$ itself.
3. **Encrypt the bit $x = -1$.** Alice picks $t = 3$, whose symbol is $-1$
   ($(3/7) = -1$, $(3/11) = +1$). Since $3 \cdot 26 = 78 \equiv 1$, $1/3 = 26$, and
   $a/t = 15 \cdot 26 = 390 \equiv 5$. So $s = 3 + 5 = 8$. For the other case she
   picks $t' = 5$ (symbol $-1$), with $1/5 = 31$ and $a/t' = 465 \equiv 3$, so
   $s' = 5 - 3 = 2$. The ciphertext is $(8, 2)$.
4. **Decrypt.** Bob's $r^2 = a$, so he uses $s = 8$: $s + 2r = 8 + 128 = 136 \equiv 59$.
   In §13.3 we computed $\left(\frac{59}{77}\right) = -1$ by reciprocity. The bit is $-1$.
   (And indeed $59 \equiv (3 + 64)^2 \cdot 26 \pmod{77}$, the square over $t$.)

Figure 13.2 shows who holds what.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Cocks IBE: the key generator publishes N = 77 and gives Bob r = 64; Alice encrypts to Bob's name using only N and sends (8, 2); Bob decrypts with the Jacobi symbol of s + 2r" fill="currentColor" font-size="14">
<rect x="220" y="14" width="200" height="76" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="38" text-anchor="middle" font-weight="bold">key generator (PKG)</text>
<text x="320" y="60" text-anchor="middle">secret: p = 7, q = 11</text>
<text x="320" y="80" text-anchor="middle">public: N = 77</text>
<rect x="20" y="200" width="200" height="96" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="224" text-anchor="middle" font-weight="bold">Alice</text>
<text x="120" y="246" text-anchor="middle">a = hash("bob...") = 15</text>
<text x="120" y="266" text-anchor="middle">bit −1: t = 3, t′ = 5</text>
<text x="120" y="286" text-anchor="middle">s = 8, s′ = 2</text>
<rect x="420" y="200" width="200" height="96" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="224" text-anchor="middle" font-weight="bold">Bob</text>
<text x="520" y="246" text-anchor="middle">key r = 64, r² = 15</text>
<text x="520" y="266" text-anchor="middle">s + 2r = 136 ≡ 59</text>
<text x="520" y="286" text-anchor="middle">(59 / 77) = −1</text>
<line x1="250" y1="90" x2="140" y2="194" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="136,198 139,188 146,194"/>
<text x="112" y="140" text-anchor="middle" font-size="13">N, published once</text>
<line x1="390" y1="90" x2="500" y2="194" stroke="currentColor" stroke-width="1.5"/>
<polygon points="504,198 494,194 501,188"/>
<text x="548" y="132" text-anchor="middle" font-size="13">r = 15⁸ mod 77,</text>
<text x="548" y="150" text-anchor="middle" font-size="13">once Bob proves his name</text>
<line x1="220" y1="248" x2="412" y2="248" stroke="currentColor" stroke-width="1.5"/>
<polygon points="418,248 409,243 409,253"/>
<text x="320" y="238" text-anchor="middle" font-size="13">ciphertext (8, 2)</text>
<text x="320" y="320" text-anchor="middle" font-size="13">Alice can encrypt before Bob has ever asked for his key</text>
</svg>
<figcaption>Figure 13.2. Cocks's scheme with N = 77. Alice needs only N and Bob's name; Bob's key is a square root that only the factors of N can produce.</figcaption>
</figure>

The arrows can happen in any order. Alice may send first, and Bob may ask the
PKG for his key a week later. That is the property certificates cannot give: you
can encrypt to someone who has not yet set anything up.

### Code it

The code runs the whole scheme with primes near one million, hashes names to
identity numbers, sends a 14-character message bit by bit, decrypts it with the
right key and with a wrong one, and then lets the PKG read a message to a user who
has never asked for a key.

```python
# Cocks identity-based encryption (2001), end to end, with small Blum primes.
# Real deployments would need p and q of 1024+ bits each; these are toys.
# random is fine for a demo; real keys and ciphertexts need the secrets module.
import hashlib, random
random.seed(13)

def jacobi(a, n):
    a %= n
    result = 1
    while a:
        while a % 2 == 0:
            a //= 2
            if n % 8 in (3, 5):
                result = -result
        a, n = n, a
        if a % 4 == 3 and n % 4 == 3:
            result = -result
        a %= n
    return result if n == 1 else 0

# Setup: the private key generator (PKG) picks two primes that are 3 mod 4.
p, q = 1000003, 1000039
N = p * q                      # published: the only public parameter

def identity_number(name):     # hash the name until its Jacobi symbol is +1
    counter = 0
    while True:
        h = hashlib.sha256(f"{name}|{counter}".encode()).digest()
        a = int.from_bytes(h, "big") % N
        if jacobi(a, N) == 1:
            return a
        counter += 1

def extract(name):             # PKG only: r with r^2 = a or r^2 = -a mod N
    a = identity_number(name)
    return pow(a, (N + 5 - p - q) // 8, N)

def random_t(sign):            # a random t whose Jacobi symbol is the bit's sign
    while True:
        t = random.randrange(2, N)
        if jacobi(t, N) == sign:
            return t

def encrypt_bit(name, bit):
    a = identity_number(name)
    x = 1 if bit == 0 else -1
    t1, t2 = random_t(x), random_t(x)
    s1 = (t1 + a * pow(t1, -1, N)) % N   # for the case r^2 = a
    s2 = (t2 - a * pow(t2, -1, N)) % N   # for the case r^2 = -a
    return s1, s2

def decrypt_bit(name, r, ct):
    a = identity_number(name)
    s = ct[0] if r * r % N == a else ct[1]
    return 0 if jacobi(s + 2 * r, N) == 1 else 1

def to_bits(text):
    return [(byte >> i) & 1 for byte in text.encode() for i in range(7, -1, -1)]

def from_bits(bits):
    return bytes(int("".join(map(str, bits[i:i + 8])), 2)
                 for i in range(0, len(bits), 8)).decode()

alice_writes = "Meet at Dome 4"
bits = to_bits(alice_writes)
ciphertext = [encrypt_bit("bob@arcadia.mars", b) for b in bits]   # no key needed
print("bits sent:", len(bits), " numbers sent:", 2 * len(ciphertext))

r_bob = extract("bob@arcadia.mars")           # Bob asks the PKG, later
a_bob = identity_number("bob@arcadia.mars")
print("r^2 = a?", r_bob * r_bob % N == a_bob, "  r^2 = -a?", r_bob * r_bob % N == N - a_bob)
print("Bob reads:  ", from_bits([decrypt_bit("bob@arcadia.mars", r_bob, c) for c in ciphertext]))

r_eve = extract("eve@arcadia.mars")           # a key for the wrong name
garbled = [decrypt_bit("bob@arcadia.mars", r_eve, c) for c in ciphertext]
print("Eve's key gets", sum(g == b for g, b in zip(garbled, bits)), "of", len(bits), "bits right")

# The PKG kept p and q, so it can make anyone's key, even for a name that has
# never asked for one. Here it reads mail to Carol, who has no key yet.
to_carol = [encrypt_bit("carol@arcadia.mars", b) for b in to_bits("Ore is low")]
r_pkg = extract("carol@arcadia.mars")
print("PKG reads:  ", from_bits([decrypt_bit("carol@arcadia.mars", r_pkg, c) for c in to_carol]))
```

```text
bits sent: 112  numbers sent: 224
r^2 = a? False   r^2 = -a? True
Bob reads:   Meet at Dome 4
Eve's key gets 59 of 112 bits right
PKG reads:   Ore is low
```

Bob's name happened to hash to a non-square, so his key is a root of $-a$ and he
decrypts with the second number of each pair; that is why the sender must always
send both. Eve's key for her own name gets 59 of 112 bits right, about what
coin-tossing would give. The last line is the price of the whole idea: the PKG
did not need Carol, her consent or any message from her to read her mail.

### The cost of one bit at a time

Cocks's scheme is elegant and slow on the wire. With a 2048-bit modulus, each
message bit becomes two 2048-bit numbers. Nobody encrypts a long message this way;
like every public-key scheme, it would encrypt a 128-bit key for AES, and even that
costs $128 \times 2 \times 2048$ bits, or 64 kilobytes. A Boneh-Franklin ciphertext
for the same key is a few hundred bits.

There is a second, subtler weakness. For the right identity, $s^2 - 4a = (t - a/t)^2$
is a perfect square, so its Jacobi symbol is always $+1$; for a wrong identity it
is $+1$ only half the time. An eavesdropper holding a few ciphertexts can therefore
test guesses about who they were sent to. Steven Galbraith pointed this out: the
scheme is not **anonymous**. Dan Boneh, Craig Gentry and Michael Hamburg (2007)
gave an anonymous variant without pairings that also has short ciphertexts, at the
cost of much slower encryption, and Giuseppe Ateniese and Paolo Gasti (2009) gave
an anonymous variant closer to Cocks's original.

!!! note "Life story: Cocks's identity-based encryption"
    **Born:** December 2001, Clifford Cocks, "An Identity Based Encryption Scheme
    Based on Quadratic Residues", 8th IMA International Conference on Cryptography
    and Coding, Cirencester (LNCS 2260); Cocks had invented RSA-style encryption
    in secret at GCHQ in 1973 · **Purpose:** encrypt to a name, with security
    resting on the quadratic residuosity problem and no pairings · **Helped:** the
    first identity-based encryption from a classic number-theory assumption; a
    teaching favorite; the basis of anonymous and space-efficient variants
    (Boneh-Gentry-Hamburg 2007, Ateniese-Gasti 2009) · **Status:** not used in
    practice, because every bit costs two numbers of modulus size; broken, like
    RSA, by a large quantum computer.

## 13.5 Boneh-Franklin: identity-based encryption with pairings

*Level: intermediate.*

Dan Boneh and Matthew Franklin presented their scheme at CRYPTO 2001 in August,
a few months before Cocks's talk, and it is the one that was deployed. Its engine
is a **bilinear pairing**, a map $\hat e$ that takes two points of an elliptic
curve group to an element of a finite field, with the property

$$
\hat e(aP, bQ) = \hat e(P, Q)^{ab}
$$

for all points $P, Q$ and whole numbers $a, b$. A pairing lets anyone multiply two
secret exponents "inside" a single equation without knowing either. The
mathematics book's [Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md)
explains where pairings come from, how they are computed and which curves
support them; here they are a black box. Python's standard library has no
pairing-friendly curves, and coding one from scratch would take a chapter of its
own, so this section stays on paper.

### The scheme

Let $P$ generate a group of prime order $q$ on a suitable curve, with a pairing
$\hat e$. Let $H_1$ hash strings to points of the group and $H_2$ hash field
elements to bit strings.

- **Setup.** The PKG picks a master secret $s$ modulo $q$ and publishes
  $P_{\text{pub}} = sP$.
- **Extract.** For a name ID, let $Q_{\text{ID}} = H_1(\text{ID})$, a point anyone
  can compute. Bob's private key is $d_{\text{ID}} = s\,Q_{\text{ID}}$.
- **Encrypt** $M$. Pick a random $r$, and send
  $$
  U = rP, \qquad V = M \oplus H_2\!\left(\hat e(Q_{\text{ID}}, P_{\text{pub}})^r\right).
  $$
- **Decrypt.** $M = V \oplus H_2\!\left(\hat e(d_{\text{ID}}, U)\right)$.

Why it works: both sides compute the same field element,

$$
\hat e(d_{\text{ID}}, U) = \hat e(s Q_{\text{ID}}, rP) = \hat e(Q_{\text{ID}}, P)^{sr}
= \hat e(Q_{\text{ID}}, sP)^{r} = \hat e(Q_{\text{ID}}, P_{\text{pub}})^r .
$$

Alice knows $r$ and the public $P_{\text{pub}}$; Bob knows $s Q_{\text{ID}}$ and the
transmitted $U$. Figure 13.3 shows the two routes to the same value. It is a
Diffie-Hellman key exchange in which the recipient's half is fixed in advance by
the PKG and his name.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Boneh-Franklin: Alice computes the pairing of Q_ID and sP raised to r; Bob computes the pairing of sQ_ID and rP; both equal the pairing of Q_ID and P raised to rs" fill="currentColor" font-size="14">
<rect x="200" y="16" width="240" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="38" text-anchor="middle" font-weight="bold">shared value</text>
<text x="320" y="58" text-anchor="middle">ê(Q_ID, P)^(rs)</text>
<rect x="16" y="130" width="250" height="84" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="141" y="154" text-anchor="middle" font-weight="bold">Alice (encrypts)</text>
<text x="141" y="176" text-anchor="middle">knows Q_ID = H₁(name), sP, r</text>
<text x="141" y="200" text-anchor="middle">computes ê(Q_ID, sP)^r</text>
<rect x="374" y="130" width="250" height="84" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="499" y="154" text-anchor="middle" font-weight="bold">Bob (decrypts)</text>
<text x="499" y="176" text-anchor="middle">knows d_ID = sQ_ID, U = rP</text>
<text x="499" y="200" text-anchor="middle">computes ê(sQ_ID, rP)</text>
<line x1="160" y1="128" x2="250" y2="72" stroke="currentColor" stroke-width="1.5"/>
<polygon points="255,69 245,70 250,78"/>
<line x1="480" y1="128" x2="390" y2="72" stroke="currentColor" stroke-width="1.5"/>
<polygon points="385,69 390,78 395,70"/>
<line x1="266" y1="172" x2="366" y2="172" stroke="currentColor" stroke-width="1.5"/>
<polygon points="372,172 363,167 363,177"/>
<text x="320" y="164" text-anchor="middle" font-size="13">U = rP, V</text>
<rect x="110" y="236" width="420" height="52" rx="6" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="320" y="257" text-anchor="middle">Eve sees Q_ID = hP, sP, rP: finding ê(P, P)^(hsr)</text>
<text x="320" y="278" text-anchor="middle">is the bilinear Diffie-Hellman problem</text>
</svg>
<figcaption>Figure 13.3. Boneh-Franklin in one picture. The pairing moves the secrets s and r into one exponent, so Alice and Bob each supply the half they know.</figcaption>
</figure>

### Why it is secure

An eavesdropper sees $P$, $P_{\text{pub}} = sP$, $U = rP$ and $Q_{\text{ID}}$, which is
$hP$ for some unknown $h$. To strip the mask she must compute
$\hat e(P, P)^{hsr}$ from $P$, $hP$, $sP$, $rP$. That is the **bilinear
Diffie-Hellman** (BDH) problem, and it is believed hard on well-chosen curves.
Boneh and Franklin proved the scheme above, which they called BasicIdent, secure
against eavesdroppers if BDH is hard, with $H_1$ and $H_2$ modeled as random
oracles, and even when the attacker can get private keys for any names other than
the one it attacks. That last clause matters: users of the same PKG must not be
able to pool their keys to read a stranger's mail.

BasicIdent is malleable, like any scheme that XORs a pad onto the message:
flipping a bit of $V$ flips the same bit of $M$. Their FullIdent version applies
the Fujisaki-Okamoto transform, which derives $r$ from a hash of the message and a
random seed and lets the decrypter recompute and check $U$, giving security against
chosen-ciphertext attacks. The same transform protects the post-quantum KEMs of the
post-quantum book.

The original paper used the Weil pairing on the supersingular curve
$y^2 = x^3 + 1$ over a prime field with $p \equiv 2 \pmod 3$. Such curves have
embedding degree 2, which means the pairing lands in $\mathbb{F}_{p^2}$, and the
field must be large enough that discrete logarithms there are hard. Improved
number field sieve attacks after 2015 raised the field sizes needed for every
pairing curve, a story the mathematics book's
[Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md) tells; modern
implementations use asymmetric pairings on curves such as BLS12-381.

### Relatives

- **Sakai-Kasahara.** Ryuichi Sakai and Masao Kasahara (2003) gave a scheme whose
  private key is $\frac{1}{s + H(\text{ID})}P$, with faster encryption (no pairing
  for the sender). It became **SAKKE**, standardized in RFC 6508 (2012).
- **Boneh-Boyen (BB1, 2004)** removed the random oracle from the proof, though only
  for an attacker who names its target in advance ("selective identity"). RFC 5091
  specifies both BF and BB1.
- **Waters (2005)** gave the first efficient scheme secure in the standard model
  against attackers that choose their target adaptively, and **Gentry (2006)** one
  with a tight proof.

!!! note "Life story: Boneh-Franklin identity-based encryption"
    **Born:** August 2001, Dan Boneh and Matthew Franklin, "Identity-Based
    Encryption from the Weil Pairing" (CRYPTO 2001; full version in *SIAM Journal
    on Computing*, 2003); independently close to Sakai, Ohgishi and Kasahara's
    January 2000 scheme · **Purpose:** practical encryption to a name, with short
    ciphertexts and a security proof · **Helped:** turned pairings from an attack
    tool into a building block; RFC 5091 (2007), IEEE 1363.3 (2013) and ISO/IEC
    18033-5; Voltage Security's e-mail and file encryption · **Status:** still the
    reference identity-based scheme; deployed in niche products; broken, like all
    pairing schemes, by a large quantum computer.

## 13.6 The key generator, and the key escrow it cannot avoid

*Level: intermediate.*

The PKG in every scheme so far holds a master secret from which it can compute any
user's private key. That is not a flaw in one scheme. It follows from the goal. If
the public key is a name that anyone can write down, then the private key is a
function of the name and of something only the PKG knows, and whoever knows that
something can compute it. The PKG is a permanent, silent recipient of every message
ever encrypted under its parameters. The Cocks code above showed it plainly: the
PKG read Carol's mail without ever talking to Carol.

Compare that with certificates. A certificate authority signs Bob's public key, but
Bob made the key pair, and the authority never sees his private key. A dishonest
authority can issue a false certificate and impersonate Bob to new correspondents,
an attack that leaves a signed artifact behind (which is what Certificate
Transparency catches). It cannot quietly read the mail sent to Bob's real key. A
dishonest PKG can, and leaves no trace.

The PKG has other jobs that certificate systems spread around.

- **Checking identity.** It must be sure who is asking before it hands out a
  private key, and it must deliver the key over a secure channel. Whatever checks
  an organization uses for passwords or badges become the checks for decryption
  keys.
- **Staying online.** Users who lose a device need their keys again, and new users
  need theirs, so the master secret lives on a server that must answer requests,
  which makes it the most valuable target in the organization.
- **Revocation.** A name cannot be revoked; "bob@example.com" is still a string
  after Bob's laptop is stolen. Boneh and Franklin suggested encrypting to
  "bob@example.com || 2026-11" so that keys expire monthly: senders need no
  revocation list, and the PKG simply stops issuing Bob's keys for future months.
  The same trick sends messages into the future: a message encrypted to
  "bob || 2027-01-01" cannot be read until the PKG releases that day's key.

### Break it: identities without a hash

Every scheme above hashes the name before using it. The hash is not decoration.
In Cocks's scheme, keys multiply: if $r_1^2 = \pm a_1$ and $r_2^2 = \pm a_2$, then
$(r_1 r_2)^2 = \pm a_1 a_2$. Suppose a careless PKG uses badge numbers directly as
identity numbers and issues a key for any badge number that is not yet taken. Eve
registers the badge number $4a$, where $a$ is Bob's badge. Its key $r'$ satisfies
$r'^2 = \pm 4a$, so $(r'/2)^2 = \pm a$: Eve now holds a key for Bob.

```python
# Break it: Cocks IBE with raw numbers as identities (no hash).
# Eve registers a new badge number 4a and turns its key into the key for a.
import random
random.seed(4)

def jacobi(a, n):
    a %= n
    result = 1
    while a:
        while a % 2 == 0:
            a //= 2
            if n % 8 in (3, 5):
                result = -result
        a, n = n, a
        if a % 4 == 3 and n % 4 == 3:
            result = -result
        a %= n
    return result if n == 1 else 0

p, q = 1000003, 1000039
N = p * q
issued = {}                                  # badge number -> holder

def extract(badge, holder):                  # PKG: one key per unused badge
    assert jacobi(badge, N) == 1 and badge not in issued
    issued[badge] = holder
    return pow(badge, (N + 5 - p - q) // 8, N)

def encrypt_bit(a, bit):
    x = 1 if bit == 0 else -1
    def t_with(sign):
        while True:
            t = random.randrange(2, N)
            if jacobi(t, N) == sign:
                return t
    t1, t2 = t_with(x), t_with(x)
    return (t1 + a * pow(t1, -1, N)) % N, (t2 - a * pow(t2, -1, N)) % N

def decrypt_bit(a, r, ct):
    s = ct[0] if r * r % N == a else ct[1]
    return 0 if jacobi(s + 2 * r, N) == 1 else 1

bob = next(b for b in range(1234567, N) if jacobi(b, N) == 1)
r_bob = extract(bob, "Bob")
secret = [1, 0, 1, 1, 0, 0, 1, 0]
ct = [encrypt_bit(bob, b) for b in secret]

r_new = extract(4 * bob, "Eve")              # looks like an ordinary new badge
r_eve = r_new * pow(2, -1, N) % N            # (r_new / 2)^2 = +-a
print("Bob's badge:", bob, "  Eve registered:", 4 * bob)
print("Eve's derived key works on Bob's mail:",
      [decrypt_bit(bob, r_eve, c) for c in ct] == secret)
```

```text
Bob's badge: 1234568   Eve registered: 4938272
Eve's derived key works on Bob's mail: True
```

**Fix it.** Hash every identity with a strong hash before it touches the algebra,
as Cocks's paper and every standard do. A hash scatters related names to unrelated
numbers, so no one can find a name whose number is $4a$ or $a \cdot b$ for a target
$a$. In Boneh-Franklin the same job is done by $H_1$, which maps names to curve
points with no known relation between them; the security proof depends on it.

### Blunting the escrow

Nothing removes the escrow while keeping the idea that a bare name is the whole
public key, but several designs spread it or limit it.

- **Split the PKG.** Boneh and Franklin's own paper shows how to share the master
  secret $s$ among $n$ servers with Shamir's scheme ([Chapter 2](02-Secret-Sharing.md)).
  Server $i$ holds $s_i$ and returns $s_i Q_{\text{ID}}$; the user combines any $t$
  of them with Lagrange coefficients to get $s Q_{\text{ID}}$, exactly as in the
  threshold BLS signatures of [Chapter 4](04-Threshold-Cryptography.md) (a BF private
  key *is* a BLS signature on the name). Reading mail then needs $t$ servers to
  collude.
- **Certificateless encryption.** Sattam Al-Riyami and Kenneth Paterson (2003)
  combine a PKG-issued partial key with a secret the user picks, so the PKG alone
  cannot decrypt. The price is that the user also has a public value that senders
  must obtain, though without a certificate. Craig Gentry's certificate-based
  encryption (2003) is a close cousin.
- **Accountable authority.** Vipul Goyal (2007) designed schemes in which a PKG
  that leaks or misuses a user's key can be caught, because the user's key is one
  of many possible keys and the user picked which one.
- **Short-lived keys.** Encrypting to name-plus-date limits how long a stolen
  user key is useful, though not what the PKG can read.

Whether escrow is a bug depends on who is asking. Inside a company or a government
department, the ability to read a departed employee's mail, or to comply with a
legal order, is often a requirement, and identity-based products were sold on
exactly that point. For a private person's messages, a third party able to read
everything is the opposite of what encryption is for. The British government's
choice of an identity-based protocol for secure voice made the argument public.

### In the real world: MIKEY-SAKKE

In 2012 the IETF published three RFCs written at CESG, the information assurance
arm of GCHQ: RFC 6507 (ECCSI, identity-based signatures), RFC 6508 (SAKKE,
Sakai-Kasahara key encryption) and RFC 6509 (MIKEY-SAKKE, which uses them to set
up keys for encrypted calls). Each user's private keys come from an organization's
key management server, which derives them from the user's identity and a time
period. The UK government's Secure Chorus programme built secure voice products on
it, and 3GPP adopted MIKEY-SAKKE for mission-critical push-to-talk among public
safety users.

In 2016 Steven Murdoch of University College London published "Insecure by
Design: Protocols for Encrypted Phone Calls", arguing that the key server's
ability to derive every user's keys amounted to built-in key escrow that would
allow undetected mass interception, and that the design lacked forward secrecy, so
a key compromised later would expose recorded calls. GCHQ replied that it did not
recognize the claims and that each organization runs its own key server, so there
is no single master key. Both statements can be true: the escrow is real, and it
sits with each organization rather than with one agency. Which of those is
acceptable is a policy question, and the protocol was designed so that the answer
is always "the organization can read its members' calls".

!!! note "Life story: MIKEY-SAKKE"
    **Born:** 2012, RFC 6507, 6508 and 6509 by Michael Groves of CESG (GCHQ),
    building on Sakai and Kasahara's 2003 identity-based scheme · **Purpose:**
    encrypted voice and video for government and enterprise, with keys derived from
    identities by the organization's key server · **Helped:** the UK Secure Chorus
    products; 3GPP mission-critical communications for police and emergency services
    · **Status:** in use; criticized since 2016 (Murdoch) for escrow by design and
    no forward secrecy, a trade the designers made on purpose.

## 13.7 Identity-based encryption in practice, and hierarchies

*Level: intermediate.*

### Standards

Identity-based encryption reached the standards bodies within six years of
Boneh and Franklin's paper. RFC 5091 (December 2007), by Xavier Boyen and Luther
Martin of Voltage Security, is titled "Identity-Based Cryptography Standard
(IBCS) #1" and specifies the BF and BB1 schemes on supersingular curves, down to
how to hash an e-mail address to a curve point. RFC 5408 (2009) describes the
surrounding architecture, including how a sender finds and fetches a PKG's public
parameters over HTTPS, and RFC 5409 (2009) puts BF and BB1 inside the
Cryptographic Message Syntax used by S/MIME. IEEE 1363.3 (2013) standardizes
identity-based schemes built on pairings, and ISO/IEC 18033-5 (2015) covers
identity-based ciphers; its 2021 amendment added SM9, the identity-based family of
the Chinese commercial cryptography standards.

Notice what RFC 5408 needed: a way to get the *PKG's* public parameters and to
trust them. Inside one company, that is one fixed value. Across the internet,
every organization runs its own PKG, and Alice writing to Bob at another company
must fetch and trust that company's parameters, which brings back much of the
machinery identity-based encryption was supposed to remove. The certificate
problem moves up one level rather than disappearing.

### In the real world: Voltage

Dan Boneh and three of his Stanford students, Matt Pauker, Guido Appenzeller and
Rishi Kacker, founded Voltage Security in 2002 to sell identity-based encryption.
Its main product, SecureMail, let an employee encrypt to any address. A recipient
with no software received a message with a link to a web reader, proved control of
the address (typically by a code sent to it), and received the key from the
company's key server. For a regulated business mailing customers who had never
installed anything, that was the selling point, and the built-in escrow was a
feature: the company could always recover and archive its own mail. HP announced
that it would buy Voltage in February 2015; the product line passed with HP's
software business to Micro Focus and then to OpenText, where Voltage SecureMail is
still sold.

Elsewhere, identity-based encryption stayed in niches. It appears in MIKEY-SAKKE
(§13.6) and in some sensor-network and vehicle-to-vehicle research systems, but
the mainstream went the other way: end-to-end messengers (the protocols book's
[Chapter 16](../protocols/index.md)) let each device make
its own keys and solve key distribution with a server directory plus key
transparency ([Chapter 3](03-Commitments.md)), which avoids escrow entirely.

### Hierarchical identity-based encryption

One PKG for a whole country, or a whole planet, would be a single point of
failure and an impossible workload. Jeremy Horwitz and Ben Lynn (EUROCRYPT 2002)
proposed a two-level hierarchy, and Craig Gentry and Alice Silverberg (ASIACRYPT
2002) gave **hierarchical IBE** (HIBE) of any depth. An identity becomes a path,
such as (mars, arcadia, clinic, bob). The root PKG gives "mars" a key; whoever
holds the key for "mars" can derive the key for (mars, arcadia), and so on down.
A sender still needs only the root's public parameters and the path.

The escrow becomes a chain: every ancestor can derive every descendant's key, so
the root can read everything below it. In Gentry and Silverberg's scheme the
ciphertext grows with the depth of the path; Boneh, Boyen and Goh (2005) made it
constant size.

HIBE turned out to be more useful as a tool than as a product. Ran Canetti, Shai
Halevi and Jonathan Katz used it in 2003 for **forward-secure encryption**: make
time periods the nodes of a tree, delete keys as periods pass, and a key stolen
today cannot decrypt last week's messages. In 2004 the same authors showed that any
IBE scheme can be turned into a public-key scheme secure against chosen-ciphertext
attacks without random oracles. Identity-based encryption is one of those ideas
whose side effects outgrew the original application.

## 13.8 Broadcast encryption and traitor tracing

*Level: intermediate.*

A film studio presses ten million copies of a disc. Every licensed player in the
world must be able to play it, except a few whose keys have been extracted by
pirates and published. The disc cannot be personalized, and the players cannot
phone home. A satellite TV operator has the same problem every month, with
subscribers who stopped paying. This is **broadcast encryption**: encrypt once so
that every receiver except a revoked set $R$ can decrypt.

Two obvious answers fail. If every player shares one key, revoking anyone means
replacing every player. If every player has its own key, each disc must carry the
content key encrypted separately for every good player, a header of millions of
entries. Amos Fiat and Moni Naor named the problem and gave the first nontrivial
schemes in 1993, secure against coalitions of up to a chosen number of revoked
users. The design that was deployed came in 2001 from Dalit Naor, Moni Naor and
Jeff Lotspiech (of IBM, which was building content protection), for **stateless
receivers**, devices that keep the keys they were born with and never update
them.

### The complete-subtree method

Put the $n$ players at the leaves of a binary tree and give every node of the tree
a key. Each player stores the keys of the nodes on the path from its leaf to the
root: $\log_2 n + 1$ keys. To revoke a set $R$, mark every node on the path from a
revoked leaf to the root as tainted. The **cover** consists of the untainted
nodes whose parent is tainted: their subtrees together contain every good player
and no revoked one. The disc carries the content key encrypted under each cover
node's key. A good player finds one cover node on its path and decrypts; a
revoked player has no key for any cover node.

By hand, with eight players numbered 0 to 7 (Figure 13.4). The nodes are numbered
as in a heap: the root is 1, the children of node $k$ are $2k$ and $2k+1$, and the
leaves 8 to 15 belong to players 0 to 7.

1. Player 5 sits at leaf 13 and holds the keys of nodes 13, 6, 3 and 1.
2. With no one revoked, the header is one entry: the content key under node 1.
3. Revoke player 5. The tainted path is 13, 6, 3, 1. The cover is the set of
   siblings along that path: 12 (player 4), 7 (players 6 and 7) and 2 (players 0
   to 3). The header has three entries.
4. Player 2 holds keys 10, 5, 2, 1; node 2 is in the header, so it decrypts.
   Player 5's keys 13, 6, 3, 1 match nothing.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="A binary tree with eight players at the leaves; player 5 is revoked, its path to the root is tainted, and the content key is encrypted under the keys of nodes 2, 7 and 12" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.3">
<line x1="320" y1="40" x2="160" y2="110"/>
<line x1="320" y1="40" x2="480" y2="110" stroke-dasharray="5 4"/>
<line x1="160" y1="110" x2="80" y2="180"/>
<line x1="160" y1="110" x2="240" y2="180"/>
<line x1="480" y1="110" x2="400" y2="180" stroke-dasharray="5 4"/>
<line x1="480" y1="110" x2="560" y2="180"/>
<line x1="80" y1="180" x2="40" y2="250"/>
<line x1="80" y1="180" x2="120" y2="250"/>
<line x1="240" y1="180" x2="200" y2="250"/>
<line x1="240" y1="180" x2="280" y2="250"/>
<line x1="400" y1="180" x2="360" y2="250"/>
<line x1="400" y1="180" x2="440" y2="250" stroke-dasharray="5 4"/>
<line x1="560" y1="180" x2="520" y2="250"/>
<line x1="560" y1="180" x2="600" y2="250"/>
</g>
<g fill="none" stroke="currentColor">
<circle cx="320" cy="40" r="16" stroke-width="1.3" stroke-dasharray="4 3"/>
<circle cx="160" cy="110" r="16" stroke-width="3.5"/>
<circle cx="480" cy="110" r="16" stroke-width="1.3" stroke-dasharray="4 3"/>
<circle cx="80" cy="180" r="16" stroke-width="1.3"/>
<circle cx="240" cy="180" r="16" stroke-width="1.3"/>
<circle cx="400" cy="180" r="16" stroke-width="1.3" stroke-dasharray="4 3"/>
<circle cx="560" cy="180" r="16" stroke-width="3.5"/>
<circle cx="40" cy="250" r="16" stroke-width="1.3"/>
<circle cx="120" cy="250" r="16" stroke-width="1.3"/>
<circle cx="200" cy="250" r="16" stroke-width="1.3"/>
<circle cx="280" cy="250" r="16" stroke-width="1.3"/>
<circle cx="360" cy="250" r="16" stroke-width="3.5"/>
<circle cx="440" cy="250" r="16" stroke-width="1.3" stroke-dasharray="4 3"/>
<circle cx="520" cy="250" r="16" stroke-width="1.3"/>
<circle cx="600" cy="250" r="16" stroke-width="1.3"/>
</g>
<g text-anchor="middle" font-size="13">
<text x="320" y="45">1</text><text x="160" y="115">2</text><text x="480" y="115">3</text>
<text x="80" y="185">4</text><text x="240" y="185">5</text><text x="400" y="185">6</text><text x="560" y="185">7</text>
<text x="40" y="255">8</text><text x="120" y="255">9</text><text x="200" y="255">10</text><text x="280" y="255">11</text>
<text x="360" y="255">12</text><text x="440" y="255">13</text><text x="520" y="255">14</text><text x="600" y="255">15</text>
<text x="40" y="288">P0</text><text x="120" y="288">P1</text><text x="200" y="288">P2</text><text x="280" y="288">P3</text>
<text x="360" y="288">P4</text><text x="440" y="288" font-weight="bold">P5 ✗</text><text x="520" y="288">P6</text><text x="600" y="288">P7</text>
</g>
<text x="320" y="318" text-anchor="middle" font-size="13">thick: header nodes 2, 7, 12 · dashed: tainted path of revoked P5</text>
</svg>
<figcaption>Figure 13.4. Complete-subtree revocation of player 5 out of eight. The three thick nodes cover every good player; player 5 holds keys only for the dashed nodes, none of which is used.</figcaption>
</figure>

Revoking $r$ players out of $n$ costs at most $r \log_2(n/r)$ header entries. For a
billion players and a thousand revoked, that is about $1000 \times 20 = 20{,}000$
entries of 16 bytes, a third of a megabyte on a disc that holds 25 gigabytes.

### Code it

```python
# Complete-subtree broadcast encryption (Naor, Naor and Lotspiech, 2001):
# eight players at the leaves of a binary tree, and player 5 revoked.
import hashlib, hmac

MASTER = b"licensing authority master secret (demo only)"
LEAVES = 8                                  # nodes 1..15; leaves 8..15

def node_key(node):                         # the authority derives every node key
    return hmac.new(MASTER, b"node %d" % node, hashlib.sha256).digest()

def path(player):                           # leaf up to root: 4 nodes
    node, nodes = LEAVES + player, []
    while node >= 1:
        nodes.append(node)
        node //= 2
    return nodes

def device_keys(player):                    # burned into the player at the factory
    return {node: node_key(node) for node in path(player)}

def cover(revoked):                         # roots of subtrees with no revoked leaf
    bad = {n for r in revoked for n in path(r)}
    return sorted(n for n in range(2, 2 * LEAVES)
                  if n not in bad and n // 2 in bad) if revoked else [1]

def wrap(key, data):                        # XOR with a hash-derived pad (toy cipher)
    pad = hashlib.sha256(b"wrap" + key).digest()
    return bytes(x ^ y for x, y in zip(data, pad))

def broadcast(content_key, revoked):        # the header on every disc
    return {node: wrap(node_key(node), content_key) for node in cover(revoked)}

def play(player, header):
    keys = device_keys(player)
    for node, blob in header.items():
        if node in keys:
            return wrap(keys[node], blob)
    return None

content_key = hashlib.sha256(b"title key for disc 1").digest()[:16]
print("player 5 holds keys for nodes", path(5))
print("no revocation, header nodes:", cover([]))
header = broadcast(content_key, revoked=[5])
print("revoke player 5, header nodes:", sorted(header))
for player in range(LEAVES):
    k = play(player, header)
    print(f"  player {player}:", "plays" if k == content_key else "locked out")
print("revoke players 1 and 5, header nodes:", cover([1, 5]))
```

```text
player 5 holds keys for nodes [13, 6, 3, 1]
no revocation, header nodes: [1]
revoke player 5, header nodes: [2, 7, 12]
  player 0: plays
  player 1: plays
  player 2: plays
  player 3: plays
  player 4: plays
  player 5: locked out
  player 6: plays
  player 7: plays
revoke players 1 and 5, header nodes: [5, 7, 8, 12]
```

Revoking two players gives four header entries, $2 \log_2(8/2) = 4$, as the bound
says. The "toy cipher" XORs the 16-byte key with a hash of the node key, which is
safe here only because each node key wraps one value; a real system uses AES key
wrapping.

### Subset difference

Complete subtree makes headers grow with $r \log n$. Naor, Naor and Lotspiech's
second method, **subset difference**, does better. Its subsets are "the leaves
under node $i$, minus the leaves under a node $j$ below $i$". Any set of $r$
revoked players can be excluded with at most $2r - 1$ such subsets, independent of
$n$. The catch is that there are far more subsets, and a player cannot store a key
for each one it belongs to. Instead the keys are derived from one another going
down the tree with a pseudorandom generator, as in the Goldreich-Goldwasser-Micali
construction, and each player stores about $\frac{1}{2}\log_2^2 n$ labels from which
it can compute the key of any subset it belongs to, and of no other. Dani Halevy
and Adi Shamir's layered version (2002) cut the storage further.

### Traitor tracing

Revocation needs to know *whom* to revoke. Pirates do not announce whose keys
they used; they sell a box, or a program, that plays discs. Benny Chor, Amos Fiat
and Moni Naor introduced **traitor tracing** in 1994: a scheme in which anyone
holding a pirate decoder built from the keys of a few traitors can identify at
least one traitor by treating the decoder as a black box. Subset-cover schemes
trace naturally: feed the pirate box headers that exclude larger and smaller parts
of the tree and watch when it stops playing, narrowing down to the leaves whose
keys it holds, then revoke them on the next disc. Pirates who publish content keys
instead of device keys need a different tool: AACS added variations of short
segments of the film, each decryptable only by some players, so that a leaked copy
reveals which player made it.

!!! note "Life story: subset-cover broadcast encryption"
    **Born:** 1993, Amos Fiat and Moni Naor, "Broadcast Encryption" (CRYPTO '93);
    the subset-cover framework with complete-subtree and subset-difference methods
    from Dalit Naor, Moni Naor and Jeff Lotspiech, "Revocation and Tracing Schemes
    for Stateless Receivers" (CRYPTO 2001); traitor tracing from Chor, Fiat and
    Naor (CRYPTO '94) · **Purpose:** encrypt once for millions of receivers while
    excluding any revoked few, with receivers that never update their keys ·
    **Helped:** the AACS content protection of HD DVD and Blu-ray (subset
    difference); CPRM for SD cards and other IBM-designed media protection ·
    **Status:** in use; the revocation mathematics held, while the systems around
    it fell to key extraction from players.

## 13.9 AACS and the 2007 key leak

*Level: beginner.*

The Advanced Access Content System (AACS) was designed by a consortium formed in
2004 by IBM, Intel, Microsoft, Panasonic, Sony, Toshiba, Walt Disney and Warner
Bros., and its licensing body is AACS LA. It protected both high-definition disc
formats of the mid-2000s, HD DVD and Blu-ray. Its predecessor on DVDs, CSS, had a
40-bit key and a single set of player keys whose exposure in 1999 broke the whole
system at once. AACS was designed to avoid both mistakes: it used AES-128
throughout, and it used the subset-difference method of §13.8 so that a player
whose keys leaked could be cut off from all future discs.

The keys form a ladder (Figure 13.5). Each licensed player holds a set of **device
keys** from the subset-difference tree. Each disc carries a **media key block**
(MKB), the broadcast-encryption header. A player that has not been revoked uses its
device keys and the MKB to compute a **processing key**, and from it the **media
key**. The media key, combined with the disc's **volume ID** (written in an area
that ordinary disc burners cannot write), gives the **volume unique key**, which
decrypts the **title keys**, which decrypt the film. Every key below the device
keys can be computed by any good player from the disc; that is how a disc plays.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="The AACS key ladder from device keys through the media key block, processing key, media key, volume unique key and title keys to the film, with the 2006 and 2007 leaks marked" fill="currentColor" font-size="14">
<g fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="20" y="14" width="260" height="38" rx="5"/>
<rect x="20" y="74" width="260" height="38" rx="5"/>
<rect x="20" y="134" width="260" height="38" rx="5" stroke-width="3"/>
<rect x="20" y="194" width="260" height="38" rx="5"/>
<rect x="20" y="254" width="260" height="38" rx="5"/>
<rect x="20" y="314" width="260" height="38" rx="5"/>
</g>
<g text-anchor="middle">
<text x="150" y="38">device keys (in the player)</text>
<text x="150" y="98">+ media key block (on disc)</text>
<text x="150" y="158" font-weight="bold">processing key</text>
<text x="150" y="218">media key Km</text>
<text x="150" y="278">+ volume ID: volume unique key</text>
<text x="150" y="338">title keys, then the film (AES-128)</text>
</g>
<g stroke="currentColor" stroke-width="1.5">
<line x1="150" y1="52" x2="150" y2="68"/><line x1="150" y1="112" x2="150" y2="128"/>
<line x1="150" y1="172" x2="150" y2="188"/><line x1="150" y1="232" x2="150" y2="248"/>
<line x1="150" y1="292" x2="150" y2="308"/>
</g>
<g>
<polygon points="150,74 145,66 155,66"/><polygon points="150,134 145,126 155,126"/>
<polygon points="150,194 145,186 155,186"/><polygon points="150,254 145,246 155,246"/>
<polygon points="150,314 145,306 155,306"/>
</g>
<line x1="290" y1="153" x2="318" y2="153" stroke="currentColor" stroke-width="1.5"/>
<text x="326" y="146" font-size="13">Feb 2007: one processing key posted;</text>
<text x="326" y="164" font-size="13">it opened every disc with that MKB</text>
<line x1="290" y1="303" x2="318" y2="303" stroke="currentColor" stroke-width="1.5"/>
<text x="326" y="296" font-size="13">Dec 2006 on: volume and title keys</text>
<text x="326" y="314" font-size="13">read from player memory, disc by disc</text>
<text x="326" y="38" font-size="13">revocable: a new MKB cuts a player off</text>
<text x="326" y="98" font-size="13">from future discs, never past ones</text>
</svg>
<figcaption>Figure 13.5. The AACS key ladder. Revocation works on the top rung; the leaks happened lower down, where any working player must hold the key in memory.</figcaption>
</figure>

### The leak

The weak point was not the tree. It was the personal computer. A software player
on a PC has to compute the processing key, the volume unique key and the title keys
in ordinary memory, where the owner of the PC can read them. In December 2006 a
programmer calling himself muslix64 released BackupHDDVD, a tool that decrypted HD
DVD films given their keys, which he had found in a software player's memory;
volume and title keys for individual films were soon posted online. That was a
disc-by-disc break.

On 11 February 2007 a user called arnezami posted on the Doom9 forum a
**processing key**, found the same way, by watching a software player's memory.
Because the discs released until then shared the same media key blocks, one
processing key gave the media key, and from there every key, for every HD DVD and
Blu-ray disc pressed so far. It was a 128-bit number, 32 hexadecimal digits that
began 09 F9.

AACS LA did what the design allowed. In April 2007 it revoked the device keys of
the software players involved (InterVideo's WinDVD and CyberLink's PowerDVD) by
issuing a new media key block for new discs, and those players had to be updated to
play them. It also sent legal notices under the US Digital Millennium Copyright
Act to web sites that published the processing key, treating the number itself as
a circumvention device.

What followed is remembered better than the cryptography. On 1 May 2007 the news
site Digg began removing stories and comments that contained the key. Its users
responded by posting the key in thousands of new stories until they filled the
front page. That evening Digg's founder Kevin Rose reversed the decision and posted
the key himself, writing that the site would rather go down fighting than bow to a
bigger company. Within a day the number had been printed on T-shirts, set to music,
encoded as colors and hidden in pictures, and a web search for it returned hundreds
of thousands of results. Lawyers can remove a document; they cannot remove a
number that people find amusing. (This book does not print it, because nothing in
the lesson needs it.)

The revocation worked as designed and changed little. Late in May 2007 a processing
key for the new media key block was posted too. Each round of revocation cost
honest owners a software update and cost the pirates days or weeks. Discs already
sold could never be re-keyed, so every film pressed before a revocation stayed open
forever. AACS's successor for Ultra HD Blu-ray, AACS 2.0 (2016), required PC players
to run inside Intel's SGX enclaves; when Intel dropped SGX from its consumer
processors in 2021, newer PCs reportedly lost the ability to play those discs at all.

The lesson for broadcast encryption is general. The scheme decides which devices
can derive the key; it cannot stop a device that can derive it from leaking it.
When the device belongs to the attacker, the keys inside it belong to the attacker
too, and the best a scheme can do is make every leak expensive to exploit and cheap
to revoke going forward.

!!! note "Life story: AACS"
    **Born:** 2004, the AACS consortium (IBM, Intel, Microsoft, Panasonic, Sony,
    Toshiba, Disney, Warner Bros.); first discs in 2006 · **Purpose:** protect HD DVD
    and Blu-ray films with AES-128 and subset-difference revocation of compromised
    players · **Helped:** the largest deployment of broadcast encryption with
    stateless receivers; revocation updates through new media key blocks ·
    **Status:** title keys read from player memory from December 2006, a processing
    key for all discs to date posted 11 February 2007, the Digg revolt on 1 May
    2007; AACS 2.0 followed for Ultra HD Blu-ray in 2016.

## 13.10 Attribute-based encryption

*Level: intermediate.*

An identity-based key opens messages sent to one exact string. In 2005 Amit
Sahai and Brent Waters asked what happens if the string is fuzzy. Their motivating
example was biometrics: a fingerprint read twice gives two slightly different sets
of features, and a key derived from one reading should open a message encrypted to
the other if they overlap enough. In **fuzzy identity-based encryption** a key for
a set of attributes $\omega$ decrypts a ciphertext made for a set $\omega'$ when the
two sets share at least $d$ elements. The construction shares the master secret
with a Shamir polynomial of degree $d - 1$ ([Chapter 2](02-Secret-Sharing.md)),
one share per attribute, with the shares kept in exponents of a pairing group. Any
$d$ matching attributes interpolate the secret in the exponent; fewer give nothing.

The paper's title was about identities, but the idea it opened was larger. Replace
"at least $d$ of these attributes" with any formula of ANDs, ORs and thresholds,
and you have **attribute-based encryption** (ABE), in two mirror-image forms.

- **Key-policy ABE** (Vipul Goyal, Omkant Pandey, Sahai and Waters, ACM CCS 2006).
  Each ciphertext is labeled with a set of attributes, and each key carries a
  policy. Example: log records are encrypted with labels such as "source:firewall",
  "date:2026-11-08", "severity:high"; an auditor gets a key for the policy
  "(source:firewall AND date:2026-11-08) OR severity:critical" and reads exactly
  the records it matches.
- **Ciphertext-policy ABE** (John Bethencourt, Sahai and Waters, IEEE Symposium on
  Security and Privacy 2007). Each key carries a set of attributes, and each
  ciphertext carries a policy chosen by the sender. This is the form most people
  mean by ABE: the person writing the message decides who may read it, by
  description, without knowing who those people are.

### How the policy is enforced

Both forms rest on the same skeleton: **share a secret down the policy**. Write the
policy as a tree. At an AND gate with $k$ children, split the value with a $k$-of-$k$
sharing; at an OR gate, give each child the whole value; at a $t$-of-$k$ threshold
gate, use a Shamir polynomial of degree $t - 1$. Each leaf of the tree is an
attribute and receives one share. A set of attributes satisfies the policy exactly
when its leaves' shares can be recombined, gate by gate, back to the root. (More
general policies use a **linear secret-sharing scheme**, a matrix whose rows are
assigned to attributes, as in Waters's 2011 construction; the tree is the special
case worth seeing first.)

In a real scheme the root secret $s$ masks the message as $M \cdot \hat e(g, g)^{\alpha s}$,
each leaf share $\lambda_i$ appears only as a group element tied to its attribute,
and a user's key components for the attributes she holds let her compute
$\hat e(g, g)^{r \lambda_i}$, where $r$ is a random number chosen for her alone when
her key was made. She recombines those values in the exponent to get
$\hat e(g, g)^{r s}$, and one more pairing with the rest of her key removes the $r$
and unmasks the message. The paper versions add the details that make this
provably secure; the shape is all we need.

### Break it: collusion

The random $r$ in each user's key is the whole point. Without it, ABE would be
easy, and broken. Suppose the authority simply gave every user one key per
attribute, and each leaf share were locked under that attribute's key. Then Chen,
a medic in District 1, and Dita, an engineer in District 3, neither of whom
satisfies "medic AND District 3", could pool their keys: Chen opens the medic leaf,
Dita opens the District 3 leaf, and together they rebuild the secret. **Collusion
resistance**, the requirement that no group of users can decrypt anything none of
them could decrypt alone, is the defining security property of ABE. The per-user
$r$ provides it: Chen's pieces carry $r_{\text{Chen}}$, Dita's carry
$r_{\text{Dita}}$, and interpolating a mixture produces a value that matches neither.
The code in §13.11 shows both the naive collapse and the effect of the blinding.

### What ABE costs

ABE ciphertexts grow with the size of the policy, roughly one or two group
elements per attribute in it, and decryption needs about one pairing per attribute
used. Revocation is as awkward as in identity-based encryption, and is usually
handled the same way, by attributes that carry dates. The authority that issues
attribute keys is a PKG with the same escrow: it can make a key with every
attribute. Melissa Chase (2007) and Allison Lewko and Brent Waters (2011) showed
how to split the job among several independent **attribute authorities**, each
vouching for its own attributes (a hospital for "role:medic", a city for
"district:3"), so that no single one holds everything.

### In the real world

ABE has standards. In August 2018 ETSI, the European telecommunications standards
body, published two specifications from its CYBER committee: TS 103 458,
high-level requirements for using ABE to protect personal data on IoT devices,
wireless networks, cloud and mobile services, and TS 103 532, "Attribute Based
Encryption for Attribute Based Access Control", which specifies trust models,
functions and protocols for both ciphertext-policy and key-policy ABE. ETSI
presented them as tools for the controlled sharing of personal data under the EU's
General Data Protection Regulation.

Deployments are rare. The best documented is at Cloudflare. Its Geo Key Manager
lets a customer say where in the world its TLS private keys may be held, for
example "only in data centers in the European Union". The first version (2017)
used identity-based broadcast encryption and identity-based revocation to
approximate this. The second, described in 2023 and published as the Portunus
system at USENIX ATC 2023, uses ciphertext-policy ABE directly: each server
receives an ABE key for its attributes (region, country, security level), and each
customer key is encrypted under a policy, so a server outside the policy simply
cannot decrypt it. The implementation, of a scheme by Junichi Tomida, Yuto
Kawahara and Ryo Nishimaki (2020), is in Cloudflare's open-source CIRCL library.

Most organizations that need attribute-based access control get it more simply: a
key server checks a user's attributes when she asks for a file's key, and
logs the request. That online check is easier to revoke, easier to audit and
needs no pairings. ABE earns its place where the reader must decrypt with no
server to ask: offline, across organizations, or, as on Mars, across a light delay.

!!! note "Life story: ciphertext-policy attribute-based encryption"
    **Born:** 2005, Amit Sahai and Brent Waters, "Fuzzy Identity-Based Encryption"
    (EUROCRYPT 2005); key-policy ABE by Goyal, Pandey, Sahai and Waters (CCS 2006);
    ciphertext-policy ABE by Bethencourt, Sahai and Waters (IEEE S&P 2007) ·
    **Purpose:** encrypt to a policy over attributes, so that the sender need not
    know who the readers are, with collusion resistance · **Helped:** ETSI TS 103 458
    and TS 103 532 (2018); Cloudflare's Geo Key Manager v2 (2023); hundreds of
    research systems for health records and cloud storage · **Status:** mature
    theory, rare deployment; pairing-based schemes are not post-quantum, and lattice
    versions are larger and slower.

## 13.11 Mars: any medic on shift in District 3

*Level: intermediate.*

Arcadia City's clinic network receives a transfer note from an Earth hospital:
a returning worker with a heart condition is on the next shuttle, and whoever
receives her in District 3 tonight needs her history. The Earth hospital does not
know who will be on shift, the roster changes every few hours, and the question
"who is on duty?" takes between 6 and 44 minutes to ask and answer across the
light delay. It should not have to ask. It encrypts the note to a description:

$$
(\text{role:medic} \ \text{OR} \ \text{role:physician}) \ \text{AND} \
\text{district:3} \ \text{AND} \ \text{shift:2026-11-08-night}.
$$

The keys come from the city's health office on Mars, which acts as the attribute
authority: when a medic signs in for a shift, her badge receives an attribute key
for that night's shift attribute, alongside the long-lived keys for her role and
district. Two choices follow from the setting.

- **The authority lives on Mars.** Keys must be issued in seconds when a shift
  starts, which an authority on Earth cannot do. The escrow sits with the city's
  health office, which already holds the records; to limit it further, the master
  key can be split among the district wardens as in [Chapter 2](02-Secret-Sharing.md),
  so that issuing keys needs several of them.
- **Revocation is by date.** The shift attribute names its night. A medic who leaves
  the service keeps her role key for a while, but her shift keys stop being issued,
  and every note is encrypted to a specific night. Nothing needs to be broadcast.

### By hand: sharing the secret down the policy

Work modulo the prime 97 with the secret $s = 42$. The root is an AND of three
children, so it uses a polynomial of degree 2 with $f(0) = 42$, say
$f(x) = 42 + 5x + 11x^2 \bmod 97$:

- child 1 (the OR gate): $f(1) = 58$; an OR passes the value down, so both
  "role:medic" and "role:physician" get 58;
- child 2, "district:3": $f(2) = 42 + 10 + 44 = 96$;
- child 3, "shift:2026-11-08-night": $f(3) = 42 + 15 + 99 = 156 \equiv 59$.

Amara, a medic in District 3 on tonight's shift, has the shares at $x = 1, 2, 3$.
The Lagrange weights at 0 for the points 1, 2, 3 are $\lambda_1 = 3$, $\lambda_2 = -3$,
$\lambda_3 = 1$, and

$$
3 \cdot 58 - 3 \cdot 96 + 59 = -55 \equiv 42 \pmod{97}.
$$

Chen, a medic in District 1, has only the shares at $x = 1$ and $x = 3$: two points
on a polynomial of degree 2, which fit every possible secret equally well. Figure
13.6 shows the tree.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Policy tree: an AND gate over an OR of medic and physician, district 3, and tonight's shift, with the Shamir shares 58, 96 and 59 of the secret 42 mod 97" fill="currentColor" font-size="14">
<rect x="230" y="14" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="36" text-anchor="middle" font-weight="bold">AND (3 of 3)</text>
<text x="320" y="56" text-anchor="middle" font-size="13">s = 42, f(x) = 42 + 5x + 11x²</text>
<rect x="40" y="120" width="160" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="142" text-anchor="middle" font-weight="bold">OR (1 of 2)</text>
<text x="120" y="162" text-anchor="middle" font-size="13">f(1) = 58</text>
<rect x="240" y="120" width="160" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="142" text-anchor="middle">district:3</text>
<text x="320" y="162" text-anchor="middle" font-size="13">f(2) = 96</text>
<rect x="440" y="120" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="142" text-anchor="middle">shift:2026-11-08-night</text>
<text x="530" y="162" text-anchor="middle" font-size="13">f(3) = 59</text>
<rect x="16" y="226" width="120" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="76" y="246" text-anchor="middle">role:medic</text>
<text x="76" y="263" text-anchor="middle" font-size="13">58</text>
<rect x="150" y="226" width="130" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="246" text-anchor="middle">role:physician</text>
<text x="215" y="263" text-anchor="middle" font-size="13">58</text>
<g stroke="currentColor" stroke-width="1.4">
<line x1="280" y1="64" x2="130" y2="120"/>
<line x1="320" y1="64" x2="320" y2="120"/>
<line x1="360" y1="64" x2="520" y2="120"/>
<line x1="100" y1="170" x2="80" y2="226"/>
<line x1="140" y1="170" x2="205" y2="226"/>
</g>
<text x="300" y="236" font-size="13">Amara (medic, 3, tonight): 1, 2, 3</text>
<text x="300" y="256" font-size="13">→ 3·58 − 3·96 + 59 ≡ 42</text>
<text x="300" y="280" font-size="13">Chen (medic, 1, tonight): 1, 3 only</text>
</svg>
<figcaption>Figure 13.6. The Mars policy as a sharing tree mod 97. An AND gate splits the secret with a polynomial; an OR gate copies its value to each child. A user rebuilds the root only if her attributes reach it.</figcaption>
</figure>

### Code it: the policy, and collusion

The code below shares a secret down the same policy (in a larger prime field),
checks five staff members, lets two of them pool naive attribute keys, and then
repeats the pooling with per-user blinding, the effect that real ABE gets from its
pairing group. There are no pairings here: the numbers are in the clear, so this is
the access structure of ABE, not ABE itself.

```python
# The policy skeleton of ciphertext-policy ABE, without pairings:
# share a secret down a policy tree, then see who can rebuild it.
# A gate is (t, [children]): t = 1 is OR, t = len(children) is AND.
# random is for the demo; real keys come from the secrets module.
import random
random.seed(3)
Q = 2**61 - 1                              # a prime; real ABE works in a pairing group

POLICY = (3, [(1, ["role:medic", "role:physician"]),
              "district:3",
              "shift:2026-11-08-night"])

def share(node, secret, out):              # Shamir at every gate, x = 1, 2, 3, ...
    if isinstance(node, str):
        out.append((node, secret))
        return [len(out) - 1]
    t, kids = node
    coeffs = [secret] + [random.randrange(Q) for _ in range(t - 1)]
    tree = []
    for i, kid in enumerate(kids, start=1):
        value = sum(c * pow(i, k, Q) for k, c in enumerate(coeffs)) % Q
        tree.append((i, share(kid, value, out)))
    return tree

def rebuild(node, tree, get):              # get(leaf index) -> share or None
    if isinstance(node, str):
        return get(tree[0])
    t, kids = node
    got = []
    for (i, sub), kid in zip(tree, kids):
        v = rebuild(kid, sub, get)
        if v is not None:
            got.append((i, v))
    if len(got) < t:
        return None
    got = got[:t]
    total = 0
    for i, v in got:                       # Lagrange interpolation at 0
        lam = 1
        for j, _ in got:
            if j != i:
                lam = lam * j % Q * pow(j - i, -1, Q) % Q
        total = (total + lam * v) % Q
    return total

secret = random.randrange(Q)               # stands in for the message key
leaves = []
tree = share(POLICY, secret, leaves)

staff = {"Amara": {"role:medic", "district:3", "shift:2026-11-08-night"},
         "Bo":    {"role:physician", "district:3", "shift:2026-11-08-night"},
         "Chen":  {"role:medic", "district:1", "shift:2026-11-08-night"},
         "Dita":  {"role:engineer", "district:3", "shift:2026-11-08-night"},
         "Ezra":  {"role:medic", "district:3", "shift:2026-11-07-night"}}

for name, attrs in staff.items():          # naive: a key per attribute opens that leaf
    got = rebuild(POLICY, tree, lambda k: leaves[k][1] if leaves[k][0] in attrs else None)
    print(f"{name:6}", "decrypts" if got == secret else "cannot")

pooled = staff["Chen"] | staff["Dita"]
got = rebuild(POLICY, tree, lambda k: leaves[k][1] if leaves[k][0] in pooled else None)
print("Chen + Dita pooled:", "decrypt (collusion!)" if got == secret else "cannot")

# The real schemes give each user a secret random r, and a key that only ever
# yields r * share (inside a pairing group). One user rebuilds r * secret; two
# users' pieces carry different r's and rebuild nothing useful.
r = {"Chen": random.randrange(1, Q), "Dita": random.randrange(1, Q)}
owner = {"role:medic": "Chen", "district:3": "Dita", "shift:2026-11-08-night": "Chen"}
mixed = rebuild(POLICY, tree, lambda k: r[owner[leaves[k][0]]] * leaves[k][1] % Q
                if leaves[k][0] in owner else None)
print("blinded pool equals r_Chen*s or r_Dita*s?",
      mixed in (r["Chen"] * secret % Q, r["Dita"] * secret % Q))
```

```text
Amara  decrypts
Bo     decrypts
Chen   cannot
Dita   cannot
Ezra   cannot
Chen + Dita pooled: decrypt (collusion!)
blinded pool equals r_Chen*s or r_Dita*s? False
```

Amara and Bo read the note; Chen is in the wrong district, Dita has the wrong role,
and Ezra's shift attribute is for last night. The naive pooling succeeds, which is
why no real scheme hands out bare attribute keys. With per-user blinding the pooled
pieces rebuild neither $r_{\text{Chen}} s$ nor $r_{\text{Dita}} s$, and the final
step of decryption, which needs exactly $r s$ for the $r$ inside one user's key,
fails. In a real scheme the blinded values live in a pairing group where nobody,
including the colluders, can divide out an $r$.

## 13.12 Functional encryption

*Level: intermediate.*

Identity-based and attribute-based encryption still work all or nothing: a key
either opens the whole message or none of it. In 2011 Dan Boneh, Amit Sahai and
Brent Waters (and, independently, Adam O'Neill in 2010) wrote down the general
form. In **functional encryption** the authority holds a master key, and for any
function $f$ in some allowed class it can issue a key $sk_f$. Anyone holding $sk_f$
and an encryption of $x$ learns $f(x)$, and nothing else about $x$. A hospital
could hand a researcher a key that computes the average blood pressure in an
encrypted record set, and the researcher would see the average and no single
reading.

The earlier schemes are special cases. Identity-based encryption is functional
encryption for the functions $f_{\text{ID}}(\text{id}, m) = m$ if $\text{id} = \text{ID}$
and nothing otherwise. Attribute-based encryption is the same with a policy test
in place of the equality (with the difference that ABE does not try to hide the
attributes or the policy themselves).

One rule shapes everything that follows: a user holding keys for $f_1, \dots, f_k$
learns $f_1(x), \dots, f_k(x)$, and the scheme must ensure that is *all* the
keys reveal, even pooled. A scheme that leaks more under collusion fails. A scheme
that leaks exactly that much may still leak a great deal, if the authority hands
out the wrong set of functions.

### Inner products: the practical case

For general functions, functional encryption needs the heavy machinery of §13.13.
For one useful class, **inner products**, there are schemes simple enough to do by
hand. The ciphertext encrypts a vector $x = (x_1, \dots, x_n)$; a key for a vector
$y$ reveals $\langle x, y \rangle = x_1 y_1 + \dots + x_n y_n$. That covers weighted
sums, averages, totals of chosen columns, and the scoring step of a linear
classifier. Michel Abdalla, Florian Bourse, Angelo De Caro and David Pointcheval
gave the scheme below in 2015, secure if the decisional Diffie-Hellman problem is
hard in the group.

Work in a group of prime order $q$ with generator $g$.

- **Setup.** Pick a master key $s = (s_1, \dots, s_n)$ at random mod $q$; publish
  $h_i = g^{s_i}$.
- **KeyGen** for $y$: $sk_y = \langle s, y \rangle \bmod q$. A key is one number.
- **Encrypt** $x$: pick random $r$; send $c_0 = g^r$ and $c_i = h_i^r \, g^{x_i}$.
- **Decrypt** with $y$ and $sk_y$: compute
  $$
  \frac{\prod_i c_i^{y_i}}{c_0^{sk_y}} = \frac{g^{r\langle s, y\rangle} \, g^{\langle x, y\rangle}}{g^{r \langle s, y \rangle}} = g^{\langle x, y \rangle},
  $$
  then find the small number $\langle x, y \rangle$ from $g^{\langle x, y \rangle}$
  by trying $0, 1, 2, \dots$ (or by baby-step giant-step). The result must be small
  enough to search; that limits the scheme to bounded values.

Each $c_i$ is an ElGamal-style encryption of $g^{x_i}$ under its own key $s_i$, all
sharing one $r$. The key $\langle s, y\rangle$ unlocks exactly the combination
$\prod c_i^{y_i}$ and no single $c_i$.

### By hand, in the group mod 47

Use the order-23 subgroup of the numbers mod 47, generated by $g = 2$. Take
$n = 3$ and the master key $s = (5, 9, 14)$, so $h = (2^5, 2^9, 2^{14}) = (32, 42, 28)$.

1. **Encrypt** $x = (3, 1, 2)$, three quiz marks, with $r = 7$: $c_0 = 2^7 = 128 \equiv 34$.
   Then $h_i^7 = (7, 36, 17)$ and $g^{x_i} = (8, 2, 4)$, so $c = (56, 72, 68) \equiv (9, 25, 21)$.
2. **KeyGen** for the weights $y = (2, 1, 1)$: $sk_y = 2 \cdot 5 + 9 + 14 = 33 \equiv 10 \pmod{23}$.
3. **Decrypt.** $9^2 \cdot 25 \cdot 21 \equiv 34 \cdot 25 \cdot 21 \equiv 4 \cdot 21 \equiv 37$.
   And $c_0^{10} = 34^{10} = 2^{70} = 2^{70 \bmod 23} = 2^1 = 2$. So the result is
   $37 / 2 = 37 \cdot 24 = 888 \equiv 42 \pmod{47}$.
4. **Small log.** The powers of 2 mod 47 run $1, 2, 4, 8, 16, 32, 17, 34, 21, 42$, so
   $42 = 2^9$, and the weighted total is 9. Indeed $2 \cdot 3 + 1 + 2 = 9$.

### Code it

```python
# Inner-product functional encryption from DDH
# (Abdalla, Bourse, De Caro and Pointcheval, PKC 2015), in a small group.
# The squares mod p = 2039 form a group of prime order q = 1019, generated by 4.
# Real systems use a 256-bit elliptic curve group. random is for the demo only.
import random
random.seed(2015)
p, q, g = 2039, 1019, 4

def setup(n):
    s = [random.randrange(q) for _ in range(n)]        # master secret key
    h = [pow(g, si, p) for si in s]                    # master public key
    return s, h

def keygen(s, y):                                      # one number per vector y
    return sum(si * yi for si, yi in zip(s, y)) % q

def encrypt(h, x):
    r = random.randrange(1, q)
    return pow(g, r, p), [pow(hi, r, p) * pow(g, xi, p) % p for hi, xi in zip(h, x)]

def small_log(target, bound):                          # brute force: fine for small results
    value = 1
    for k in range(bound + 1):
        if value == target:
            return k
        value = value * g % p
    raise ValueError("inner product out of range")

def decrypt(ct, y, sk_y, bound=500):
    c0, c = ct
    num = 1
    for ci, yi in zip(c, y):
        num = num * pow(ci, yi, p) % p
    return small_log(num * pow(pow(c0, sk_y, p), -1, p) % p, bound)

s, h = setup(4)
scores = [7, 9, 4, 8]                  # one student's four lab marks, encrypted
ct = encrypt(h, scores)
weights = [1, 2, 2, 3]                 # the registrar's key: the weighted total
sk = keygen(s, weights)
print("ciphertext:", ct)
print("weighted total:", decrypt(ct, weights, sk), " check:", sum(a * b for a, b in zip(scores, weights)))

# Break it: keys are linear in y. Two harmless keys subtract to a third.
k_all = keygen(s, [1, 1, 1, 1])        # the sum of all four marks
k_three = keygen(s, [1, 1, 1, 0])      # the sum of the first three
k_last = (k_all - k_three) % q         # = keygen(s, [0, 0, 0, 1])
print("lab 4 alone, from two sum keys:", decrypt(ct, [0, 0, 0, 1], k_last))
```

```text
ciphertext: (744, [1920, 466, 1838, 1848])
weighted total: 57  check: 57
lab 4 alone, from two sum keys: 8
```

### Break it: the keys you hand out

The last two lines are not an attack on the scheme. A user holding the keys for
"sum of all four" and "sum of the first three" could subtract the two *answers* and
get lab 4 anyway; key subtraction only makes it convenient. The scheme promises to
reveal $\langle x, y \rangle$ for every $y$ whose key you hold, and every linear
combination of those follows. Once a user holds keys for $n$ independent vectors, she
can solve for $x$ entirely. The real security question for an inner-product
deployment is therefore the authority's policy: which vectors does it sign, and
does their span contain a vector that singles out one person? The cryptography
cannot answer that; the key-issuing policy must, as in the differencing attacks of
[Chapter 19](19-Differential-Privacy.md).

Inner-product functional encryption has been built from DDH, from Paillier's
assumption and from learning with errors (Shweta Agrawal, Benoît Libert and Damien
Stehlé, 2016), with full rather than selective security. The European FENTEC
research project (2018 to 2021) produced open-source libraries for it and
experiments with encrypted machine-learning inference. It remains a research tool
more than a product.

!!! note "Life story: inner-product functional encryption"
    **Born:** 2015, Michel Abdalla, Florian Bourse, Angelo De Caro and David
    Pointcheval, "Simple Functional Encryption Schemes for Inner Products" (PKC
    2015), after the general definitions of Boneh, Sahai and Waters (TCC 2011) ·
    **Purpose:** keys that reveal a chosen weighted sum of an encrypted vector and
    nothing else · **Helped:** adaptive and lattice-based versions (Agrawal, Libert
    and Stehlé, CRYPTO 2016); multi-client and decentralized variants; research
    libraries and encrypted-inference prototypes · **Status:** the one practical
    corner of functional encryption; DDH versions are not post-quantum, LWE versions
    are.

## 13.13 Indistinguishability obfuscation: the far frontier

*Level: expert.*

Functional encryption for *every* efficiently computable function, with many keys,
turned out to be equivalent in power to a tool with a stranger name.

**Obfuscation** means rewriting a program so that it computes the same function but
its code reveals nothing beyond what running it would. The strong version, where
the obfuscated code is no more useful than a sealed black box, was shown impossible
in general by Boaz Barak, Oded Goldreich, Russell Impagliazzo, Steven Rudich, Amit
Sahai, Salil Vadhan and Ke Yang in 2001: they built programs whose every
implementation leaks a secret that the black box hides. In the same paper they
defined a weaker goal that escapes their argument. An **indistinguishability
obfuscator** (iO) takes a circuit and outputs an equivalent one, such that for any
two circuits of the same size that compute the *same* function, nobody can tell
which one an obfuscation came from.

That looks almost useless: it only hides the difference between programs that
already behave identically. It is in fact extraordinarily strong. Shafi Goldwasser
and Guy Rothblum (2007) showed iO is the best possible obfuscation: whatever any
obfuscator hides, iO hides too. Sahai and Waters (2014) showed how to use it, with
a technique of "punctured programs", to build public-key encryption, short
signatures, deniable encryption and much more from iO and a one-way function. With
iO, a public key can simply be an obfuscated program that contains a secret key and
encrypts with it.

### The 2013 candidate and the attacks

In 2013 Sanjam Garg, Craig Gentry, Shai Halevi, Mariana Raykova, Amit Sahai and
Brent Waters gave the first candidate construction of iO, and from it functional
encryption for all circuits (FOCS 2013). It turned the circuit into a matrix
branching program, randomized the matrices with Joe Kilian's technique, and hid
them inside a **graded encoding** or multilinear map, a generalization of pairings
to many groups that Garg, Gentry and Halevi had proposed months earlier using
lattice-style noisy encodings. Unlike pairings, these maps had no clean hardness
assumption behind them, only the hope that their many-step algebra resisted attack.

The hope was tested at once. Jung Hee Cheon, Kyoohyung Han, Changmin Lee, Hansol
Ryu and Damien Stehlé (2015) broke the Coron-Lepoint-Tibouchi multilinear map
completely when encodings of zero were available, recovering its secret parameters
with "zeroizing" attacks. Eric Miles, Amit Sahai and Mark Zhandry (2016) gave
"annihilation" attacks on several iO candidates over the Garg-Gentry-Halevi maps.
For several years each repair was followed by a new attack, and early
implementations reportedly needed hours and gigabytes to obfuscate functions of only
a handful of input bits. It was not clear that iO existed at all.

### Jain, Lin and Sahai

In August 2020 Aayush Jain, Huijia Lin and Amit Sahai posted "Indistinguishability
Obfuscation from Well-Founded Assumptions" (STOC 2021). It builds iO from the
subexponential hardness of four assumptions that had each been studied on their own
for years: learning with errors, the decisional Diffie-Hellman-style assumption
SXDH on pairing groups, learning parity with noise over large prime fields, and the
existence of pseudorandom generators of polynomial stretch computable in constant
depth (in $\mathsf{NC}^0$). A follow-up (EUROCRYPT 2022) removed learning with
errors from the list. For the first time, iO rested on assumptions that cryptographers
were prepared to call standard, and with it functional encryption for all circuits
and the long list of applications that follow from iO.

It is a theorem, not a tool. The construction goes from a weak, specially built
functional encryption scheme, through a chain of bootstrapping and amplification
steps, to iO, and each step multiplies the cost by large polynomial factors. No one
has implemented it, and rough estimates of the size of even a tiny obfuscated
circuit are far beyond any computer. It also uses pairings, so a quantum computer
would break it. What changed in 2020 is the question cryptographers ask: no longer
whether iO exists, but whether it can ever be made efficient, and from post-quantum
assumptions.

!!! note "Life story: indistinguishability obfuscation"
    **Born:** defined 2001 (Barak, Goldreich, Impagliazzo, Rudich, Sahai, Vadhan and
    Yang, CRYPTO 2001); first candidate 2013 (Garg, Gentry, Halevi, Raykova, Sahai
    and Waters, FOCS 2013) · **Purpose:** hide everything about a program except its
    input-output behavior, as far as is possible at all · **Helped:** functional
    encryption for all circuits, deniable encryption, and dozens of constructions
    via punctured programs (Sahai and Waters, 2014); Jain, Lin and Sahai put it on
    well-founded assumptions (2020/2021) · **Status:** candidates over multilinear
    maps were attacked repeatedly from 2015; the 2020 construction is sound but
    wildly impractical and not post-quantum.

## 13.14 After quantum computers

*Level: expert.*

A large quantum computer running Shor's algorithm factors $N$ and computes discrete
logarithms in elliptic-curve and finite-field groups. That breaks Cocks's scheme,
Boneh-Franklin, Sakai-Kasahara, every pairing-based ABE scheme, the DDH
inner-product scheme of §13.12, and the Jain-Lin-Sahai construction. The
post-quantum book's [Chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md)
measures how far away that computer is.

Two families survive.

- **Symmetric broadcast encryption.** The subset-cover schemes of §13.8 use only a
  block cipher and a pseudorandom generator. A quantum computer's Grover search only
  halves their effective key length, so AES-128 drops to about 64-bit security
  against a quantum attacker and AES-256 remains comfortable. AACS's tree, if not
  its players, is already post-quantum.
- **Lattices.** In 2008 Craig Gentry, Chris Peikert and Vinod Vaikuntanathan (GPV)
  showed how to use a short basis of a lattice as a trapdoor for sampling short
  preimages without leaking the basis, the technique the post-quantum book explains
  in its [Chapter 10](../post-quantum/10-NTRU-Falcon-and-FN-DSA.md), where it becomes
  the Falcon signature. The same paper gave the first lattice IBE. Hash the identity
  to a vector $u$; Bob's private key is a short vector $e$ with $Ae = u \pmod q$, which
  only the trapdoor holder can sample; and Alice encrypts with a variant of Regev's
  learning-with-errors scheme in which $u$ plays the role of the public key. Bob's
  key is, quite literally, a GPV signature on his name. Léo Ducas, Vadim Lyubashevsky
  and Thomas Prest (2014) made it efficient over NTRU lattices.

The rest followed on lattices: identity-based encryption without random oracles
(Agrawal, Boneh and Boyen, 2010), hierarchical IBE with "bonsai trees" (Cash,
Hofheinz, Kiltz and Peikert, 2010), attribute-based encryption for any circuit
(Gorbunov, Vaikuntanathan and Wee, 2013; Boneh and seven coauthors, 2014, with short
keys), and inner-product functional encryption from LWE (2016). The underlying
problems are those of the post-quantum book's
[Chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md). The price is
size: public parameters and ciphertexts are many times larger than their pairing
counterparts, and lattice ABE for rich policies has not been deployed.

Indistinguishability obfuscation is the open case. Lattice-based candidates exist,
but they rest on new "circular security" assumptions, some of which have been shown
false in the forms first proposed. No construction from standard post-quantum
assumptions is widely accepted.

## 13.15 Going deeper

*Level: expert.*

**Identity-based encryption implies signatures.** Moni Naor observed that any IBE
scheme gives a signature scheme: treat the message as an identity, and the PKG's
private key for that "identity" is the signature. To verify, encrypt a random value
to the message and check that the signature decrypts it. A Boneh-Franklin private
key is exactly a BLS signature on the name.

**Anonymity and searchable encryption.** An IBE scheme whose ciphertexts hide the
recipient's identity (Boneh-Franklin does; Cocks's does not) gives public-key
encryption with keyword search: Dan Boneh, Giovanni Di Crescenzo, Rafail Ostrovsky
and Giuseppe Persiano (2004) encrypt keywords to themselves as identities, and a
mail server holding the "key" for the keyword "urgent" can test for it without
reading anything else.

**Hiding the policy.** ABE hides the message but not the policy or the attributes.
Predicate encryption (Jonathan Katz, Amit Sahai and Brent Waters, 2008) hides the
attributes in the ciphertext too, for inner-product predicates, which cover
conjunctions, disjunctions and polynomial evaluations.

**Removing the escrow.** **Registration-based encryption** (Sanjam Garg, Mohammad
Hajiabadi, Mohammad Mahmoody and Ahmadreza Rahimi, 2018) replaces the PKG by a key
curator with no secret at all: users generate their own keys and register them, the
curator compresses all registered keys into short public parameters, and senders
encrypt to names as in IBE. The curator can be audited because it holds nothing to
leak. Efficient versions remain an active topic.

**Witness encryption.** Garg, Gentry, Sahai and Waters (2013) also defined
encryption to a puzzle: anyone who knows a solution (a witness) to a given NP
statement can decrypt. It sits between IBE and iO and, like iO, has no efficient
construction from standard assumptions.

**Proxy re-encryption.** Matt Blaze, Gerrit Bleumer and Martin Strauss (1998)
proposed letting a proxy convert a ciphertext for Alice into one for Bob without
seeing the message; identity-based and attribute-based versions are among the
proposed answers to ABE's revocation problem.

## Check yourself

??? question "1. Alice wants to send Bob an encrypted message under identity-based encryption, but Bob has never set anything up. What does Alice need, and what does Bob need later?"

    Alice needs only the PKG's public parameters and Bob's identity string (such
    as his e-mail address). Bob later proves his identity to the PKG and receives his
    private key, with which he decrypts. Nothing has to be fetched from Bob or
    checked in a certificate.

??? question "2. Compute the Jacobi symbol (6/77) using only the reciprocity rules. Is 6 a square mod 77?"

    $\left(\frac{6}{77}\right) = \left(\frac{2}{77}\right)\left(\frac{3}{77}\right)$.
    Since $77 \equiv 5 \pmod 8$, $\left(\frac{2}{77}\right) = -1$. For
    $\left(\frac{3}{77}\right)$, $77 \equiv 1 \pmod 4$, so flip with no sign change:
    $\left(\frac{77}{3}\right) = \left(\frac{2}{3}\right) = -1$, since $3 \equiv 3 \pmod 8$.
    The symbol is $(-1)(-1) = +1$. But 6 is not a square mod 77: it is a non-square
    mod 7 and mod 11. The symbol $+1$ does not decide squareness.

??? question "3. In Cocks's scheme with N = 77, a user's identity number is a = 6. Compute the private key r = a⁸ mod 77 and say which of the two ciphertext numbers the user decrypts with."

    $6^2 = 36$, $6^4 = 1296 \equiv 64$, $6^8 \equiv 64^2 = 4096 \equiv 15$. So $r = 15$,
    and $r^2 = 225 \equiv 71 \equiv -6$. The key is a square root of $-a$, so the user
    decrypts with $s' = t' - a/t'$.

??? question "4. Bob's key is r = 64 for a = 15 (N = 77, r² = a). He receives s = 27. What bit was sent?"

    $s + 2r = 27 + 128 = 155 \equiv 1 \pmod{77}$, whose Jacobi symbol is $+1$, so the bit
    is $+1$. (The sender used $t = 4$: $1/4 = 58$, $a/t = 15 \cdot 58 = 870 \equiv 23$,
    $s = 27$; and 4 is a square, symbol $+1$.)

??? question "5. Why does a Cocks sender always send two numbers per bit, when the recipient uses only one?"

    The recipient's key is a square root of $a$ or of $-a$, depending on whether $a$
    is a square mod $N$. Deciding that is the quadratic residuosity problem, which
    the sender cannot solve without the factors. So she prepares one number for each
    case, and the recipient, who knows whether $r^2 = a$ or $-a$, picks the right one.

??? question "6. In the eight-player complete-subtree scheme, players 0 and 7 are revoked. Which nodes form the header?"

    Player 0's path is 8, 4, 2, 1 and player 7's is 15, 7, 3, 1. The untainted nodes
    with a tainted parent are 9 (child of 4), 5 (child of 2), 6 (child of 3) and 14
    (child of 7). Four entries, matching $r \log_2(n/r) = 2 \log_2 4 = 4$.

??? question "7. AACS could revoke the software players whose keys leaked. Why did the February 2007 processing key still matter after revocation?"

    Revocation only changes the media key block on discs pressed afterward. Every
    disc already sold carried the old media key block, for which the leaked
    processing key yields the media key, so all of them stayed decryptable forever.
    And the next software player that held a processing key in memory could leak the
    next one, as happened in May 2007.

??? question "8. For the Mars transfer note, would you use key-policy or ciphertext-policy ABE? Why?"

    Ciphertext-policy. The sender, the Earth hospital, decides who may read
    ("medic or physician, District 3, tonight's shift") and does not know who those
    people are. Keys describe the readers' attributes, issued by the authority on
    Mars. Key-policy ABE would put the rule in the keys, chosen by the authority
    in advance, with ciphertexts merely labeled.

??? question "9. An authority issues inner-product keys for y = (1, 1, 0), (0, 1, 1) and (1, 0, 1) for three-entry encrypted records. What can a holder of all three learn?"

    Everything. The three vectors are linearly independent, so from
    $x_1 + x_2$, $x_2 + x_3$ and $x_1 + x_3$ she solves for each $x_i$ (for example
    $x_1 = \frac{1}{2}[(x_1 + x_2) + (x_1 + x_3) - (x_2 + x_3)]$). The scheme kept its
    promise; the key policy did not.

??? question "10. Jain, Lin and Sahai built iO from well-founded assumptions. Why is it not post-quantum, and why is nobody using it?"

    One of its assumptions, SXDH, lives in pairing groups, where discrete logarithms
    fall to Shor's algorithm. And the construction passes through several
    bootstrapping steps that each multiply the cost by large polynomial factors, so an
    obfuscated program of any useful size would be astronomically large; it has never
    been implemented.

## What you learned

- Identity-based encryption makes a name the public key. A private key generator
  holds a master secret and issues each user's key, so senders need no certificates
  and can encrypt to users who have not set anything up.
- Shamir's 1984 identity-based signatures come from an RSA trapdoor; encryption
  waited until 2001, when Boneh and Franklin (pairings) and Cocks (quadratic
  residues) solved it.
- The Jacobi symbol is computable without factoring, but a symbol of $+1$ does not
  say whether a number is a square mod $N$. Cocks's scheme turns that gap into a
  cipher, one bit and two big numbers at a time.
- The PKG can always decrypt everything. That escrow is built into the idea; it can
  be split (threshold PKG), limited (certificateless, dated identities) or accepted
  as a feature (Voltage, MIKEY-SAKKE), never removed while a bare name is the key.
- Identities must be hashed: in Cocks's scheme, raw numbers let one key be turned
  into another.
- Broadcast encryption revokes devices with symmetric keys on a tree:
  complete-subtree headers grow as $r \log(n/r)$, subset-difference headers as $2r - 1$.
  AACS used it well, and still leaked in 2007 because PC players held keys in memory.
- Attribute-based encryption shares a secret down an access policy; its defining
  requirement is collusion resistance, which per-user randomness in a pairing group
  provides. ETSI standardized it in 2018; Cloudflare runs it; few others do.
- Functional encryption reveals $f(x)$ and nothing else. Inner products are
  practical; the danger lies in which keys the authority issues.
- Indistinguishability obfuscation gives functional encryption for every function.
  Candidates from 2013 were attacked; Jain, Lin and Sahai put it on well-founded
  assumptions in 2020; it remains impractical and not post-quantum. Lattices, via
  GPV trapdoors, carry identity-based and attribute-based encryption past quantum
  computers.

**Next:** [Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md), where the
question changes from "who may read?" to "how can I prove I am allowed, without
saying who I am?"

## Further reading

- Adi Shamir, "Identity-Based Cryptosystems and Signature Schemes" (CRYPTO 1984).
- Shafi Goldwasser and Silvio Micali, "Probabilistic Encryption and How to Play
  Mental Poker Keeping Secret All Partial Information" (STOC 1982).
- Clifford Cocks, "An Identity Based Encryption Scheme Based on Quadratic
  Residues", Cryptography and Coding, LNCS 2260 (2001).
- Dan Boneh and Matthew Franklin, "Identity-Based Encryption from the Weil Pairing"
  (CRYPTO 2001; *SIAM Journal on Computing* 32, 2003).
- Ryuichi Sakai, Kiyoshi Ohgishi and Masao Kasahara, "Cryptosystems Based on
  Pairing" (SCIS 2000).
- Dan Boneh, Craig Gentry and Michael Hamburg, "Space-Efficient Identity Based
  Encryption Without Pairings" (FOCS 2007).
- Craig Gentry and Alice Silverberg, "Hierarchical ID-Based Cryptography"
  (ASIACRYPT 2002); Dan Boneh, Xavier Boyen and Eu-Jin Goh, "Hierarchical Identity
  Based Encryption with Constant Size Ciphertext" (EUROCRYPT 2005).
- Brent Waters, "Efficient Identity-Based Encryption Without Random Oracles"
  (EUROCRYPT 2005).
- Sattam Al-Riyami and Kenneth Paterson, "Certificateless Public Key Cryptography"
  (ASIACRYPT 2003).
- RFC 5091 (2007), RFC 5408 and RFC 5409 (2009); RFC 6507, RFC 6508 and RFC 6509
  (2012); IEEE 1363.3 (2013); ISO/IEC 18033-5 (2015, amended 2021).
- Steven Murdoch, "Insecure by Design: Protocols for Encrypted Phone Calls",
  *IEEE Computer* (2016).
- Amos Fiat and Moni Naor, "Broadcast Encryption" (CRYPTO 1993); Benny Chor, Amos
  Fiat and Moni Naor, "Tracing Traitors" (CRYPTO 1994).
- Dalit Naor, Moni Naor and Jeff Lotspiech, "Revocation and Tracing Schemes for
  Stateless Receivers" (CRYPTO 2001).
- AACS LA, *Advanced Access Content System: Introduction and Common Cryptographic
  Elements* (specification, 2006 onward); Edward Felten's posts on the AACS keys at
  *Freedom to Tinker* (2007).
- Amit Sahai and Brent Waters, "Fuzzy Identity-Based Encryption" (EUROCRYPT 2005).
- Vipul Goyal, Omkant Pandey, Amit Sahai and Brent Waters, "Attribute-Based
  Encryption for Fine-Grained Access Control of Encrypted Data" (ACM CCS 2006).
- John Bethencourt, Amit Sahai and Brent Waters, "Ciphertext-Policy Attribute-Based
  Encryption" (IEEE S&P 2007); Brent Waters, "Ciphertext-Policy Attribute-Based
  Encryption: An Expressive, Efficient, and Provably Secure Realization" (PKC 2011).
- Allison Lewko and Brent Waters, "Decentralizing Attribute-Based Encryption"
  (EUROCRYPT 2011).
- ETSI TS 103 458 and ETSI TS 103 532 (2018).
- Watson Ladd, Tanya Verma, Marloes Venema, Armando Faz-Hernández, Brendan
  McMillion, Avani Wildani and Nick Sullivan, "Portunus: Re-imagining Access Control
  in Distributed Systems" (USENIX ATC 2023).
- Dan Boneh, Amit Sahai and Brent Waters, "Functional Encryption: Definitions and
  Challenges" (TCC 2011).
- Michel Abdalla, Florian Bourse, Angelo De Caro and David Pointcheval, "Simple
  Functional Encryption Schemes for Inner Products" (PKC 2015).
- Shweta Agrawal, Benoît Libert and Damien Stehlé, "Fully Secure Functional
  Encryption for Inner Products, from Standard Assumptions" (CRYPTO 2016).
- Boaz Barak, Oded Goldreich, Russell Impagliazzo, Steven Rudich, Amit Sahai, Salil
  Vadhan and Ke Yang, "On the (Im)possibility of Obfuscating Programs" (CRYPTO 2001).
- Sanjam Garg, Craig Gentry, Shai Halevi, Mariana Raykova, Amit Sahai and Brent
  Waters, "Candidate Indistinguishability Obfuscation and Functional Encryption for
  All Circuits" (FOCS 2013).
- Amit Sahai and Brent Waters, "How to Use Indistinguishability Obfuscation:
  Deniable Encryption, and More" (STOC 2014).
- Jung Hee Cheon, Kyoohyung Han, Changmin Lee, Hansol Ryu and Damien Stehlé,
  "Cryptanalysis of the Multilinear Map over the Integers" (EUROCRYPT 2015); Eric
  Miles, Amit Sahai and Mark Zhandry, "Annihilation Attacks for Multilinear Maps"
  (CRYPTO 2016).
- Aayush Jain, Huijia Lin and Amit Sahai, "Indistinguishability Obfuscation from
  Well-Founded Assumptions" (STOC 2021; IACR ePrint 2020/1003).
- Craig Gentry, Chris Peikert and Vinod Vaikuntanathan, "Trapdoors for Hard Lattices
  and New Cryptographic Constructions" (STOC 2008); Shweta Agrawal, Dan Boneh and
  Xavier Boyen, "Efficient Lattice (H)IBE in the Standard Model" (EUROCRYPT 2010).
- Léo Ducas, Vadim Lyubashevsky and Thomas Prest, "Efficient Identity-Based
  Encryption over NTRU Lattices" (ASIACRYPT 2014).
- Sanjam Garg, Mohammad Hajiabadi, Mohammad Mahmoody and Ahmadreza Rahimi,
  "Registration-Based Encryption: Removing Private-Key Generator from IBE" (TCC 2018).
