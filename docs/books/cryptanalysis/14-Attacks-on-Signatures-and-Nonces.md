# 14. Attacks on Signatures and Nonces

*DSA, ECDSA and Schnorr signatures are as strong as the discrete logarithm
problem under them, and nobody has broken that problem at real sizes. Yet
signing keys of this kind have been lost again and again: a games console's
master key, thousands of Bitcoin wallets, keys inside certified smart cards
and TPM chips. Each signature uses a secret number, the nonce, and every one
of those keys leaked through it. You will recover a private key from two
signatures by hand on a 19-point curve, find a repeated nonce in a log of
public signatures, build the lattice that turns a few leaked bits per
signature into the whole key, and break deterministic Ed25519 with one
simulated glitch. Then you will see why $(r, -s)$ is also a valid signature,
what that did to Bitcoin, and what a careful signer does today.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a DSA, ECDSA or Schnorr signature is one linear equation in two
      secrets, the key and the nonce, and why any knowledge of the nonce
      collapses it;
    - how two signatures with one nonce give the private key, by hand and in
      code, and how a related nonce is just as bad;
    - the PlayStation 3 break of 2010 and the repeated nonces harvested from
      the Bitcoin and Ethereum blockchains;
    - the hidden number problem of Boneh and Venkatesan, the lattice that
      solves it, and how to size the attack (signatures against leaked bits);
    - Minerva, TPM-Fail and LadderLeak, where timing gave away the length of
      a nonce, or less than one bit of it;
    - why deterministic nonces (RFC 6979, EdDSA) fix the generator problem and
      open the door to fault attacks, and how hedged signing closes it;
    - signature malleability, Bitcoin's transaction malleability and the
      BIP 62 and BIP 66 fixes;
    - how a backdoored random generator, Dual_EC_DRBG, is the nonce generator
      you cannot trust, and how RSA signatures fail differently.

    **You need:** DSA, Schnorr and the nonce in book 1
    [Chapter 14](../../book/14-Discrete-Log-Systems.md); ECDSA, EdDSA and
    curve arithmetic in book 1 [Chapter 15](../../book/15-Elliptic-Curves.md).
    Both chapters close with a short "Break it" on nonce reuse; this chapter
    starts there. Modular inverses, and for §14.6 the idea of a lattice
    ([Chapter 15](15-Lattices-as-a-Weapon.md) of this book has the full
    treatment). [Chapter 12](12-Discrete-Logarithms.md) explains why
    attacking the logarithm itself is hopeless at real sizes.

    **Levels:** §14.1, §14.2, §14.4, §14.5 and §14.10 are for beginners;
    §14.3, §14.7, §14.8, §14.9 and §14.11 are intermediate; §14.6 and §14.12
    are expert.

## 14.1 The problem

*Level: beginner.*

A signature scheme has one job: anyone with the public key can check that a
message came from the holder of the private key, and nobody else can make a
signature that checks. The discrete-logarithm family (DSA, its elliptic-curve
form ECDSA, Schnorr signatures and their descendant EdDSA) does this job with
small keys and short signatures, and it signs most of the internet: TLS
certificates, software updates, passkeys, SSH logins, and every Bitcoin and
Ethereum transaction.

Every one of these schemes needs a second secret on top of the private key:
a fresh number $k$ for each signature, called the **nonce** (in DSA papers
also the ephemeral key or per-message secret). Book 1 showed why in
[§14.5](../../book/14-Discrete-Log-Systems.md): the signing equation of DSA
and ECDSA is

$$
s \equiv k^{-1}\,(h + r\,d) \pmod n,
$$

where $d$ is the private key, $h$ the hash of the message, $n$ the order of
the group, and $r$ is computed from $kG$ (or $g^k$). Rearranged,
$s k - r d \equiv h \pmod n$. That is one linear equation in two unknowns,
$k$ and $d$. Its security rests on the attacker never having a second
equation in the same unknowns, and never knowing anything about $k$.

The nonce has to meet three conditions, and each one has failed in public:

- **Secret.** If $k$ is known for even one signature, $d = (sk - h)\,r^{-1}$.
  A weak random generator that lets an attacker guess $k$ is enough.
- **Unique.** If $k$ repeats across two signatures, subtracting the
  equations removes $d$, gives $k$, and then $d$. Anyone can spot the
  repeat, because the two signatures share the same $r$.
- **Uniform.** If $k$ is merely *biased*, say its top few bits are often
  zero or a timing measurement reveals its length, each signature gives a
  little information about $d$. Lattice reduction collects enough of these
  little pieces into the whole key. This is the hidden number problem.

None of these attacks touches the discrete logarithm. They would work
against an ideal group in which logarithms were impossible, which is why
they belong in a cryptanalysis book anyway: they are how these keys are
actually lost. Figure 14.1 shows the main events.

<figure class="mars-fig">
<svg viewBox="0 0 640 430" width="640" role="img" aria-label="Timeline of attacks on signature nonces from the hidden number problem in 1996 to Polynonce in 2023" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="420" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="29" text-anchor="end" font-weight="bold">1996</text>
<circle cx="92" cy="24" r="3.5"/>
<text x="108" y="29">Boneh and Venkatesan define the hidden number problem</text>
<text x="78" y="59" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="54" r="3.5"/>
<text x="108" y="59">Howgrave-Graham and Smart: lattices break DSA with partial nonces</text>
<text x="78" y="89" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="84" r="3.5"/>
<text x="108" y="89">Bleichenbacher: DSA's standard nonce generator is biased</text>
<text x="78" y="119" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="114" r="3.5"/>
<text x="108" y="119">fail0verflow: Sony's PS3 signs with one fixed nonce</text>
<text x="78" y="149" text-anchor="end" font-weight="bold">2011</text>
<circle cx="92" cy="144" r="3.5"/>
<text x="108" y="149">Ed25519: the nonce becomes a hash of key and message</text>
<text x="78" y="179" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="174" r="3.5"/>
<text x="108" y="179">Android Bitcoin wallets repeat nonces; RFC 6979 published</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Mt. Gox blames malleability; cache attack on OpenSSL ECDSA</text>
<text x="78" y="239" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="234" r="3.5"/>
<text x="108" y="239">Bitcoin enforces strict signature encoding (BIP 66)</text>
<text x="78" y="269" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="264" r="3.5"/>
<text x="108" y="269">One voltage glitch breaks Ed25519 on a microcontroller</text>
<text x="78" y="299" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="294" r="3.5"/>
<text x="108" y="299">Biased nonces on blockchains; Minerva and TPM-Fail</text>
<text x="78" y="329" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="324" r="3.5"/>
<text x="108" y="329">LadderLeak: less than one bit of nonce per signature</text>
<text x="78" y="359" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="354" r="3.5"/>
<text x="108" y="359">Ed25519 libraries that take the public key as an input</text>
<text x="78" y="389" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="384" r="3.5"/>
<text x="108" y="389">FIPS 186-5 adds EdDSA and deterministic ECDSA; Polynonce</text>
</svg>
<figcaption>Figure 14.1. Attacks on signature nonces, 1996 to 2023. The group and the hash were never the weak point; the nonce was.</figcaption>
</figure>

The fix took twenty years to settle, and it is not "use a better random
generator". It is to stop needing one: compute the nonce from the private
key and the message, as RFC 6979 and EdDSA do, and add fresh randomness
only as a second layer. §14.8 shows why even that needed a correction, and
§14.11 collects what a careful signer does.

One more property of signatures causes trouble that has nothing to do with
secrecy: **malleability**. For ECDSA, if $(r, s)$ is a valid signature then
so is $(r, n - s)$, which anyone can compute without the key. That forges
nothing new, but systems that used the signature bytes as an identifier,
Bitcoin first among them, were caught out. §14.9 tells that story.

## 14.2 One nonce, two signatures

*Level: beginner.*

Start with the idea, with no curve and no group, just the equation. A signer
holds a secret $d$. For each message it picks a secret $k$, publishes $r$
(a value computed from $k$ that hides it, since recovering $k$ from $r$ is a
discrete logarithm), and publishes

$$
s = k^{-1}(h + r d) \bmod n .
$$

Think of it as a balance with two hidden weights. From one signature you
know $s$, $h$ and $r$, but $k$ and $d$ are both unknown: for every guess of
$d$ there is a $k$ that makes the equation true, so the equation alone says
nothing about $d$. That is exactly what makes the signature safe. Now
suppose the signer uses the same $k$ for a second message $h'$. The second
signature has the same $r$, since $r$ depends only on $k$, and

$$
\begin{aligned}
s\,k &\equiv h + r d \\
s'k &\equiv h' + r d
\end{aligned}
\pmod n .
$$

Subtract: the $r d$ terms cancel, leaving $(s - s')\,k \equiv h - h'$, so

$$
k \equiv \frac{h - h'}{s - s'} \pmod n, \qquad d \equiv \frac{s k - h}{r} \pmod n .
$$

Two signatures, two equations, two unknowns. No discrete logarithm, no
search, and the arithmetic takes microseconds. The only condition is
$s \neq s'$, which holds whenever the messages differ.

Three things about this are worth fixing in mind early.

**The repeat is public.** Equal nonces give equal $r$ values, and $r$ is
printed in the signature. An attacker does not need to suspect a particular
signer: it can collect every signature it sees, index them by $r$, and wait
for a collision. That is exactly what people did with the Bitcoin
blockchain (§14.5).

**Known is as bad as repeated.** If the attacker learns one nonce by any
route, $d = (sk - h)/r$ from a single signature. A random generator whose
output can be guessed, such as the Debian OpenSSL generator of 2008, whose
output depended on little more than the process ID (at most 32,768 values),
or a backdoored one (§14.10), loses every key that signs with it, however
carefully the key itself was made.

**Related is as bad as repeated.** Suppose the second nonce is not equal to
the first but tied to it by a relation the attacker can guess, such as
$k' = k + 1$, or $k' = a k + b$ for known $a$ and $b$ (a counter, or a
weak generator whose successive outputs are linked). Then

$$
s k - r d \equiv h, \qquad s'(a k + b) - r' d \equiv h'
$$

is still two linear equations in $k$ and $d$, and still solvable. In 2023
researchers at Kudelski Security pushed this to its limit: if successive
nonces satisfy *any* polynomial recurrence of low degree with unknown
coefficients, a handful of signatures more than the degree gives a
polynomial in $d$ alone whose roots include the key ("Polynonce", §14.5).

### Schnorr and EdDSA are no different

Schnorr signatures compute $R = kG$, a challenge $e = H(R, \text{message})$
and $s = k + e d$. Two Schnorr signatures with the same $k$ give
$s - s' = (e - e')\,d$, so $d = (s - s')/(e - e')$, even more directly.
EdDSA is a Schnorr signature with a particular way of choosing $k$
(§14.8), and its key falls the same way if two signatures share $k$ but
have different challenges. The defense in EdDSA is that two different
messages cannot share a nonce; §14.8 shows the faults that make it happen
anyway.

DSA uses the same equation as ECDSA, with $r = (g^k \bmod p) \bmod q$. ElGamal
signatures ([§14.3 of book 1](../../book/14-Discrete-Log-Systems.md)) have the
same weakness and were known to have it from the start: Taher ElGamal's 1985
paper warns that $k$ must never be used twice.

### Why the nonce is there at all

It is fair to ask why the designers built a scheme that collapses this
easily. The nonce is what makes the signature zero-knowledge in spirit: the
signer proves it knows $d$ without showing it, by mixing $d$ with a fresh
random mask. A Schnorr signature is the Fiat-Shamir transform of an
identification protocol in which the prover commits to $kG$, receives a
challenge $e$, and answers $k + ed$. The answer $k + ed$ is uniformly
random *because* $k$ is, and that is the whole of its secrecy: it is a
one-time pad on $ed$ with key $k$. Reuse the pad, as with any one-time pad,
and the message leaks. Bias the pad and the message leaks partially. Every
attack in this chapter is a version of that sentence.

## 14.3 Nonce reuse by hand and in code

*Level: intermediate.*

Book 1 recovered a DSA key by hand in a group of order 11. Here the same
attack runs on an elliptic curve, the 19-point curve from
[§15.6 of book 1](../../book/15-Elliptic-Curves.md):

$$
E:\; y^2 = x^3 + 2x + 2 \text{ over } \mathbb{F}_{17}, \qquad G = (5, 1), \qquad n = 19 .
$$

The multiples of $G$ you need are $9G = (7, 6)$, $10G = (7, 11)$ and
$11G = (13, 10)$.

<div class="mars-steps" markdown>

1. The signer's private key is $d = 11$, so its public key is
   $Q = 11G = (13, 10)$.
2. It signs a message with hash $h_1 = 4$ using $k = 10$. Then $kG = (7, 11)$
   and $r = 7 \bmod 19 = 7$. The inverse of 10 mod 19 is 2 (since
   $10 \cdot 2 = 20 = 19 + 1$), so
   $s_1 = 2 \cdot (4 + 7 \cdot 11) \bmod 19 = 2 \cdot 81 \bmod 19 = 162 \bmod 19 = 10$.
   The signature is $(7, 10)$.
3. It signs a second message, $h_2 = 15$, with the same $k = 10$:
   $s_2 = 2 \cdot (15 + 77) \bmod 19 = 184 \bmod 19 = 13$. The signature is $(7, 13)$.
4. The attacker sees two signatures by $Q$ with $r = 7$. It computes
   $s_1 - s_2 = 10 - 13 = -3$ and $h_1 - h_2 = 4 - 15 = -11$, so
   $k = (-11)/(-3) = 11 \cdot 3^{-1} \bmod 19$. The inverse of 3 is 13
   (since $39 = 2 \cdot 19 + 1$), and $11 \cdot 13 = 143 = 7 \cdot 19 + 10$, so $k = 10$.
5. Then $d = (s_1 k - h_1) \cdot r^{-1} = (100 - 4) \cdot 7^{-1} \bmod 19$. Here
   $96 \bmod 19 = 1$ and $7^{-1} = 11$ (since $77 = 4 \cdot 19 + 1$), so
   $d = 11$.
6. Check: $11G = (13, 10) = Q$. The attacker now signs anything as this key.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Nonce reuse on the toy curve: two signatures with r equal to 7 give k equal to 10 and then the private key d equal to 11" fill="currentColor" font-size="14">
<rect x="10" y="20" width="190" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="105" y="43" text-anchor="middle">signature 1: h₁ = 4</text>
<text x="105" y="63" text-anchor="middle">(r, s₁) = (7, 10)</text>
<rect x="10" y="100" width="190" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="105" y="123" text-anchor="middle">signature 2: h₂ = 15</text>
<text x="105" y="143" text-anchor="middle">(r, s₂) = (7, 13)</text>
<text x="105" y="182" text-anchor="middle" font-style="italic">same r: visible to all</text>
<line x1="200" y1="48" x2="246" y2="80" stroke="currentColor" stroke-width="1.5"/>
<line x1="200" y1="128" x2="246" y2="96" stroke="currentColor" stroke-width="1.5"/>
<polygon points="254,88 244,91 248,81" />
<rect x="256" y="58" width="180" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="346" y="83" text-anchor="middle">k = (4 − 15) / (10 − 13)</text>
<text x="346" y="103" text-anchor="middle">= 11 · 13 mod 19 = 10</text>
<line x1="436" y1="88" x2="458" y2="88" stroke="currentColor" stroke-width="1.5"/>
<polygon points="466,88 458,92 458,84"/>
<rect x="468" y="58" width="162" height="60" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.6"/>
<text x="549" y="83" text-anchor="middle">d = (10·10 − 4) / 7</text>
<text x="549" y="103" text-anchor="middle">= 1 · 11 mod 19 = 11</text>
<text x="549" y="142" text-anchor="middle" font-weight="bold">private key</text>
<text x="320" y="214" text-anchor="middle" font-weight="bold">subtracting the two equations removes r·d; k falls out, then d</text>
<text x="320" y="236" text-anchor="middle">check: 11G = (13, 10) = Q</text>
</svg>
<figcaption>Figure 14.2. The hand example. The attacker never solves a discrete logarithm; it solves two linear equations mod 19.</figcaption>
</figure>

Notice what the attacker did *not* need: it never computed $k$ from $r$,
which is the hard problem. The curve only produced $r$; after that the
attack is arithmetic modulo $n$.

### Code it

The code below implements ECDSA signing on any short Weierstrass curve with
the nonce passed in, so that it can be misused on purpose. It repeats the
hand example, then works at full size on secp256k1, Bitcoin's curve. The
full-size part plays the attacker's real game: a public log of 200
signatures from 20 keys, in which one signer's generator got stuck once,
and a scanner that indexes signatures by $r$ the way blockchain scanners
do. The last part solves the related-nonce case $k_2 = 3k_1 + 5$.

```python
import hashlib, secrets

def make_curve(p, a, G, n):
    def add(P, Q):
        if P is None: return Q
        if Q is None: return P
        if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
        if P == Q: l = (3 * P[0] * P[0] + a) * pow(2 * P[1], -1, p) % p
        else:      l = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
        x = (l * l - P[0] - Q[0]) % p
        return x, (l * (P[0] - x) - P[1]) % p
    def mul(k, P=G):
        R = None
        while k:
            if k & 1: R = add(R, P)
            P, k = add(P, P), k >> 1
        return R
    def sign(h, d, k):                       # ECDSA with the nonce passed in, so we can misuse it
        r = mul(k)[0] % n
        return r, pow(k, -1, n) * (h + r * d) % n
    return mul, sign

def recover(n, h1, r1, s1, h2, s2):          # two signatures with the same r
    k = (h1 - h2) * pow(s1 - s2, -1, n) % n
    return (s1 * k - h1) * pow(r1, -1, n) % n

# The toy curve y^2 = x^3 + 2x + 2 over F_17, G = (5, 1) of order 19
mul, sign = make_curve(17, 2, (5, 1), 19)
r1, s1 = sign(4, 11, 10)
r2, s2 = sign(15, 11, 10)
print("toy:", (r1, s1), (r2, s2), "d =", recover(19, 4, r1, s1, 15, s2))

# secp256k1, Bitcoin's curve
P256K1 = 2**256 - 2**32 - 977
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G = (0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
     0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)
mul, sign = make_curve(P256K1, 0, G, N)
H = lambda m: int.from_bytes(hashlib.sha256(m).digest(), "big") % N

# A public log of 200 signatures by 20 keys. One signer's generator stuck once.
keys = [secrets.randbelow(N - 1) + 1 for _ in range(20)]
pub = {mul(d): i for i, d in enumerate(keys)}
log, stuck = [], secrets.randbelow(N - 1) + 1
for j in range(200):
    i = j % 20
    k = stuck if j in (37, 157) else secrets.randbelow(N - 1) + 1
    m = b"tx %d" % j
    log.append((mul(keys[i]), m) + sign(H(m), keys[i], k))

seen = {}                                    # what a blockchain scanner does: index by r
for Q, m, r, s in log:
    if r in seen and seen[r][0] == Q:
        _, m0, s0 = seen[r]
        d = recover(N, H(m0), r, s0, H(m), s)
        print("repeated r found; key recovered:", mul(d) == Q, "signer", pub[Q])
    seen[r] = (Q, m, s)

# Related, not equal: k2 = 3*k1 + 5. Two linear equations in k1 and d.
d, k1 = keys[0], secrets.randbelow(N - 1) + 1
r1, s1 = sign(H(b"a"), d, k1)
r2, s2 = sign(H(b"b"), d, (3 * k1 + 5) % N)
# s1*k1 - r1*d = h1 and 3*s2*k1 - r2*d = h2 - 5*s2: eliminate k1
h1, h2 = H(b"a"), H(b"b")
d_found = (3 * s2 * h1 - s1 * (h2 - 5 * s2)) * pow(s1 * r2 - 3 * s2 * r1, -1, N) % N
print("related nonces:", d_found == d)
```

```
toy: (7, 10) (7, 13) d = 11
repeated r found; key recovered: True signer 17
related nonces: True
```

The scan costs one dictionary lookup per signature, so it scales to the
whole Bitcoin blockchain (around a billion signatures by 2019) on one
machine. Real scanners also match repeated $r$ values across *different*
public keys: if two keys share a nonce, the attacker has two equations in
three unknowns ($k$, $d_1$, $d_2$), which is not enough on its own, but a
third signature by either key with the same $k$ closes the system, and in
practice a stuck generator repeats many times.

### What the attacker needs, precisely

For the record, here are the exact conditions, since the real cases in the
next two sections each meet them in a different way:

- the public key, to check a candidate $d$ (always available);
- the two message hashes $h_1, h_2$, which means the attacker must know
  what was signed. On a blockchain the signed transaction is public; for
  the PS3 the signed files were on every console; for a TLS server key the
  signed handshake data passes over the network;
- $s_1 \ne s_2 \pmod n$, which holds unless the messages hash to the same
  value.

If the hashes are unknown, the attack fails, which is why repeated nonces
in an encrypted protocol can stay harmless until someone finds a way to see
the signed data.

## 14.4 The PlayStation 3 key

*Level: beginner.*

Sony's PlayStation 3 went on sale in November 2006 with the most careful
security design any games console had shipped. The Cell processor could
seal one of its cores, a "synergistic processing element", away from the
rest of the machine, so that even code running at the highest privilege
level could not read what happened inside it. Every piece of software the
console loaded, from the boot loaders to the games, carried an ECDSA
signature made with keys only Sony held, and the console checked each
signature before running anything. For three years nobody ran unsigned
code on it in any useful way. The PS3 was the console that had not been
broken.

Part of the reason was that Sony let people in through a side door. The
original console had a feature called OtherOS that let owners install
Linux, in a sandbox that kept them away from the graphics hardware and the
games. Hobbyists had what they wanted, and the incentive to attack the rest
was small. In April 2010 Sony removed OtherOS with firmware update 3.21,
citing security concerns, after George Hotz had shown in January 2010 that
he could use a hardware glitch from inside Linux to gain access to the
hypervisor. Many of the people who had been content with Linux now had a
reason to break the console, and some of them were very good.

At the 27th Chaos Communication Congress in Berlin, on 29 December 2010,
three members of the group fail0verflow (who gave their names as bushing,
marcan and sven) gave a talk called "Console Hacking 2010: PS3 Epic Fail".
Most of the talk walked through the chain of trust and the places where it
was weaker than it looked. The centerpiece was one slide about ECDSA. The
signatures Sony's signing tools produced all had the same $r$. Sony had
implemented the equations correctly but used a *constant* where the
standard demanded a fresh random $k$. The talk illustrated the point with
the well-known xkcd strip in which a function documented as returning a
random number returns 4 every time, "chosen by fair dice roll".

With a constant nonce, the computation of §14.3 applies to any two signed
files. The files were on every console; their hashes were computable; the
public keys were inside the loaders. fail0verflow said they had computed
private keys this way and demonstrated running their own code, though they
did not publish keys, saying their goal was to restore Linux, not to enable
piracy. Within days, on 2 January 2011, George Hotz published a root
signing key, for the boot loader called metldr, computed the same way.
From that moment anyone could sign code that every PS3 would accept as
Sony's.

What made the break so severe was where the keys lived. A console checks
signatures with public keys that are fixed in its early boot code, some of
it in read-only memory or in a loader that the console never updates.
Sony could ship new firmware with new keys for later stages, but it could
not change the keys that consoles already in homes used to check the first
stages. Every console made up to that point would trust code signed with
the leaked keys forever. (The final step came in October 2012, when the
"lv0" keys, used deeper in the boot chain, also leaked; how they were
obtained has not been documented publicly.)

Sony responded in court. In January 2011 it sued Hotz and members of
fail0verflow in the United States under the Digital Millennium Copyright
Act, and obtained an order requiring Hotz to hand over computers and
remove the key from his site. The case with Hotz was settled in April
2011, with Hotz agreeing not to work on Sony products again. The same
month, Sony's PlayStation Network was breached and shut down for more than
three weeks, with data on about 77 million accounts exposed. Some groups
had announced protests against Sony over the lawsuits, but no public
evidence has tied the breach to the PS3 case, and it should not be read as
a consequence of it.

Two features of the PS3 story keep it in textbooks. First, it was the
extreme case of the nonce problem: not a weak generator, not a bias, but
a nonce of zero bits of entropy, and every signature ever made with it
equivalent to a printed copy of the key. In the language of §14.6, every
bit of every nonce was known. Second, the mistake survived a design that
was otherwise good, and that had been reviewed. The equations were
right. The code computed $r$ and $s$ exactly as the standard says, and any
test that checked signatures against the public key passed. Only a test
that looked at *two* signatures could have caught it. A signing
implementation is only correct if its nonces are, and nothing in the
output of a single signature shows that.

!!! note "Life story: the PS3 signing-key break"
    **Born:** 29 December 2010, fail0verflow (bushing, marcan, sven) at the
    27th Chaos Communication Congress in Berlin; a root key published by
    George Hotz on 2 January 2011 · **Purpose:** to show that Sony's ECDSA
    signatures all used one fixed nonce, so any two signed files gave the
    private key · **Helped:** made nonce reuse the textbook example of
    implementation failure; homebrew and unsigned code on every PS3 then
    sold; years of argument about console security and the law ·
    **Status:** permanent for the consoles of the time, since the boot-time
    public keys could not be replaced

## 14.5 Repeated nonces on the blockchain

*Level: beginner.*

A Bitcoin transaction moves coins by proving control of a key. To spend
coins sent to an address, the owner signs the new transaction with ECDSA on
secp256k1, and the signature, the public key and the signed transaction
are published in the blockchain for ever. From an attacker's point of view
this is the ideal data set for §14.3: hundreds of millions of signatures,
every signed message known, every public key known, and a key that is
worth money the moment it is found. Anyone who computes the private key
can spend the coins, and a transaction cannot be reversed.

The first public scan came early. In January 2013 Nils Schneider wrote
about scanning the blockchain for signatures that shared an $r$ value and
found that some did: a few keys had signed twice with the same nonce,
apparently through faulty wallet software. Others had looked before him,
and the coins on most of those keys were already gone. From then on the
blockchain was watched continuously. People ran scripts that indexed each
new signature by $r$, ready to spend from any key that slipped.

### Android, 2013

The largest single incident came in August 2013. Wallet apps on Android
began producing repeated nonces, the coins on those keys were swept within
hours, and the Bitcoin developers warned that every Android wallet's keys
were at risk. Google confirmed that Java's `SecureRandom` on Android had
not been seeded properly in some cases, so different signatures, even in
different apps, could get the same "random" $k$. Wallets were patched to
read the kernel's generator directly, and users had to move their coins to
new keys. [Chapter 18](18-Random-Numbers-Gone-Wrong.md) tells the full
story, with the generator bug itself; for this chapter it is the second
great example after the PS3, with the difference that the victims were
thousands of ordinary users rather than one company.

### Blockchain.info, 2014

In December 2014 a change to the random number code of Blockchain.info's
web wallet, then one of the most used wallets, produced signatures with
repeated $r$ values for a short period. A person known as "johoe", who ran
exactly the kind of daily scan described above, saw the repeats, computed
the keys and moved the coins out before thieves did, then returned them to
the company to refund its users. Reports of the amount differ: the first
press reports said 255 bitcoins, corrected to 267, and later reports
counting further returns gave several hundred more. That the keys could be
computed is not disputed; the exact sums are, and this book does not try
to settle them.

### Biased nonces and lattices, 2019

Repeated nonces are the easy case. In 2019 Joachim Breitner and Nadia
Heninger asked a harder question: are there signatures on the blockchain
whose nonces are not repeated but are *small* or *share bits* with each
other, so that the lattice method of §14.6 applies? They examined nearly a
billion signatures from Bitcoin, plus Ethereum and Ripple, and found
several kinds of weakness. Some keys had signed with 64-bit nonces on a
256-bit curve, which is 192 known bits per signature; two such
signatures are enough, as the code in §14.6 shows. Others had nonces that
shared a long prefix or suffix with other nonces, a pattern that looks
like a bug in how a buffer was filled. Their
paper reports hundreds of Bitcoin keys computed this way, and dozens of
Ethereum, Ripple, SSH and HTTPS keys from their scans of other data.
Most of the affected coins had been taken long before; their slides joke
that their own share was a fraction of a cent. The same work counted
repeated nonces at a much larger scale, millions of signatures from about
1,300 keys.

### Polynonce, 2023

In 2023 Marco Macchetti and colleagues at Kudelski Security published the
"Polynonce" attack. It assumes that successive nonces from one key satisfy
a polynomial recurrence $k_{i+1} = a_0 + a_1 k_i + a_2 k_i^2 + \cdots$ of
low degree with *unknown* coefficients, which covers a generator that is a
linear congruential generator or anything like it. Writing each $k_i$ in
terms of $d$ (as $k_i = (h_i + r_i d)/s_i$) and eliminating the unknown
coefficients turns $N$ consecutive signatures into one polynomial equation
in $d$ alone, whose roots can be found; the linear case needs four
signatures. They ran it over the Bitcoin blockchain and found keys whose
nonces followed such a pattern. The wallets were already empty: someone
had been there first. Secondary reports put the number of affected wallets
at several hundred; the authors' own write-ups emphasize that others had
already drained them, and that no keys fell to the variant they ran on
Ethereum.

### What the blockchain teaches

The blockchain made the cost of a bad nonce visible in money, and it made
the attack fully automatic. Several lessons came out of it and went into
the wallet software:

- **The attacker is a script, not a person.** Coins on a key that reuses a
  nonce are usually gone within minutes; johoe found keys because his scan
  ran every day, and he was not the only one.
- **A single bad signature is enough** when the attacker can see every
  signature the key has ever made. A key that signs once on a broken
  device is lost, even if all its other signatures were perfect.
- **Do not reuse keys.** Bitcoin wallets moved to fresh keys for every
  payment (hierarchical deterministic wallets), so a key typically signs
  once or twice in its life. That limits what any nonce flaw can expose.
- **Remove the generator.** Bitcoin Core now signs with RFC 6979
  deterministic nonces through its own library, libsecp256k1 (§14.8), and
  most wallets did the same.

!!! note "Life story: harvesting keys from repeated nonces"
    **Born:** blockchain scans by 2013 (Nils Schneider's write-up, January
    2013); systematic scanning and returning of funds by johoe in 2014;
    lattice scans by Breitner and Heninger (2019); Polynonce by Kudelski
    Security (2023) · **Purpose:** to find signatures whose nonces repeat,
    are small, or follow a pattern, and compute the keys from public data ·
    **Helped:** drove Bitcoin and Ethereum wallets to RFC 6979 and to
    single-use keys; gave researchers the largest public test of
    signature implementations · **Status:** scanners still run; new hits are
    rare and come from homemade or abandoned software

## 14.6 Partly known nonces: the hidden number problem

*Level: expert.*

A repeated nonce gives the attacker *all* the bits of a nonce difference.
What if it gets only a few bits of each nonce, and no repeats? Say a buggy
generator fills 31 random bytes instead of 32, so every nonce on a 256-bit
curve has its top 8 bits equal to zero. Each signature now carries 8 bits of
information about the key and no more; no one signature reveals anything
useful. The question is whether 8 bits from each of many signatures add up.
They do, and the tool that adds them is lattice reduction.

### The problem in one line

Write each signature's equation solved for the nonce:

$$
k_i \equiv s_i^{-1} r_i \, d + s_i^{-1} h_i \equiv t_i\, d + u_i \pmod n,
$$

with $t_i = r_i/s_i$ and $u_i = h_i/s_i$ known to anyone. The attacker
knows that every $k_i$ lies in a short interval, $0 \le k_i < B$ with
$B = 2^{\ell}$ much smaller than $n$. Find $d$.

This is the **hidden number problem** (HNP). Dan Boneh and Ramarathnam
Venkatesan introduced it at CRYPTO 1996 for a different purpose: to prove
that computing the top bits of a Diffie-Hellman secret is as hard as
computing all of it. Their form was: a secret $\alpha$ mod $p$ is hidden; an
oracle returns the most significant bits of $\alpha t_i \bmod p$ for random
known $t_i$; recover $\alpha$. They showed that about $\sqrt{\log p}$ bits
from each of about $2\sqrt{\log p}$ samples suffice, using lattice
reduction. A proof of hardness from one angle is an attack from the other,
and in 2001 Nick Howgrave-Graham and Nigel Smart turned it around: DSA
signatures whose nonces leak a few bits are samples of exactly this kind.
Phong Nguyen and Igor Shparlinski then proved how few bits suffice, first
for DSA (2002) and then for ECDSA (2003).

### Counting the information

Each signature with $\ell$-bit nonces tells the attacker that one specific
number mod $n$ falls in a set of $2^\ell$ values out of $n$: that is
$\log_2 n - \ell$ bits of information about $d$. The key has $\log_2 n$
bits. So at the very least

$$
m\,(\log_2 n - \ell) > \log_2 n
$$

signatures are needed. For 8 known bits on a 256-bit curve that is 33
signatures. In practice an attack needs more than the bound, by an amount
that depends on how good the lattice algorithm is; the code below uses 48.

### The lattice

Use the first signature to eliminate $d$. From $k_1 = t_1 d + u_1$ we get
$d = (k_1 - u_1)/t_1$, and substituting into the others,

$$
k_i \equiv A_i\, k_1 + C_i \pmod n, \qquad A_i = t_i / t_1, \quad C_i = u_i - A_i u_1, \qquad i = 2, \ldots, m .
$$

Every congruence says $k_i = A_i k_1 + C_i - c_i n$ for some integer $c_i$.
Now look at the integer combinations of these $m + 1$ rows:

$$
\begin{aligned}
\mathbf b_0 &= (1,\; A_2,\; A_3,\; \ldots,\; A_m,\; 0)\\
\mathbf b_i &= (0,\; \ldots,\; n,\; \ldots,\; 0) \quad (n \text{ in position } i,\ i = 2..m)\\
\mathbf b_{m+1} &= (0,\; C_2,\; C_3,\; \ldots,\; C_m,\; B)
\end{aligned}
$$

The combination $k_1 \mathbf b_0 + \mathbf b_{m+1} - \sum c_i \mathbf b_i$ is

$$
\mathbf v = (k_1,\; k_2,\; \ldots,\; k_m,\; B),
$$

a vector in the lattice whose every coordinate is at most $B$. The lattice
itself is big: its determinant is $n^{m-1} B$ (the matrix is triangular),
so a typical lattice vector of this dimension is about
$(n^{m-1}B)^{1/(m+1)}$ long. When $B$ is small enough, $\mathbf v$ is much
shorter than that, very likely the shortest vector in the lattice, and
lattice reduction finds it. The last coordinate $B$ (the "embedding") is
there to mark it: a reduced basis vector ending in $\pm B$ is $\pm\mathbf v$,
its first coordinate is $k_1$, and $d = (k_1 - u_1)/t_1$.

Comparing the two lengths with the Gaussian heuristic (the expected length
of the shortest vector in a random lattice of dimension $D$ is about
$\sqrt{D/(2\pi e)}\,\det^{1/D}$) gives, up to small factors, the condition
$B^m < n^{m-1}$, which is the information count above. LLL does not find
the shortest vector exactly, only one within a factor that in practice is
about $1.02^D$, so it needs a little more room than the count; BKZ, its
stronger relative, needs less.

One small trick gains a full bit per signature. The nonces lie in
$[0, B)$, but the lattice measures distance from zero, so a nonce near $B$
looks as long as a large one. Subtract $w = B/2$ from every nonce (replace
$u_i$ by $u_i - w$) and the unknowns lie in $[-B/2, B/2)$; set the
embedding to $B/2$ to match. The code does this for the full-size attack.
Without it, 48 signatures with 8 known bits were not enough in our runs;
with it, they work every time.

### By hand: three nonces below 16

Take a group of prime order $q = 1009$ (10 bits) and a secret $x = 345$.
Three signatures gave the pairs

$$
(t_1, u_1) = (244, 579), \quad (t_2, u_2) = (607, 463), \quad (t_3, u_3) = (558, 224),
$$

and the attacker knows every nonce is below $B = 16$, so 6 of the 10 bits
of each nonce are known (all zero). Three signatures give 18 bits about a
10-bit secret: enough, with room to spare.

<div class="mars-steps" markdown>

1. $t_1^{-1} \bmod 1009 = 856$ (check: $244 \cdot 856 = 208{,}864 = 207 \cdot 1009 + 1$).
2. $A_2 = 607 \cdot 856 \bmod 1009 = 966$ and $A_3 = 558 \cdot 856 \bmod 1009 = 391$.
3. $C_2 = 463 - 966 \cdot 579 \bmod 1009 = 135$ and $C_3 = 224 - 391 \cdot 579 \bmod 1009 = 860$.
4. The basis rows are $(1, 966, 391, 0)$, $(0, 1009, 0, 0)$, $(0, 0, 1009, 0)$
   and $(0, 135, 860, 16)$. The determinant is $1009^2 \cdot 16 \approx 1.6 \times 10^7$,
   whose fourth root is about 63.5.
5. LLL returns, as its first row, $(3, 6, 15, 16)$: length $\sqrt{526} \approx 22.9$,
   far below 63.5, and it ends in $B = 16$. So $k_1 = 3$, $k_2 = 6$, $k_3 = 15$.
6. Check it is in the lattice: $3 \cdot 966 + 135 = 3033 = 3 \cdot 1009 + 6$ and
   $3 \cdot 391 + 860 = 2033 = 2 \cdot 1009 + 15$, so the vector is
   $3\mathbf b_0 + \mathbf b_3 - 3\mathbf b_1 - 2\mathbf b_2$.
7. Then $x = (k_1 - u_1)\,t_1^{-1} = (3 - 579) \cdot 856 \bmod 1009 = 433 \cdot 856 \bmod 1009 = 345$.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The hand example lattice: four basis rows, the combination 3 b0 plus b3 minus 3 b1 minus 2 b2, and the short vector 3, 6, 15, 16 holding the three nonces" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">basis (rows)</text>
<text x="20" y="58">b₀ =</text><text x="120" y="58" text-anchor="end">1</text><text x="190" y="58" text-anchor="end">966</text><text x="260" y="58" text-anchor="end">391</text><text x="320" y="58" text-anchor="end">0</text>
<text x="20" y="88">b₁ =</text><text x="120" y="88" text-anchor="end">0</text><text x="190" y="88" text-anchor="end">1009</text><text x="260" y="88" text-anchor="end">0</text><text x="320" y="88" text-anchor="end">0</text>
<text x="20" y="118">b₂ =</text><text x="120" y="118" text-anchor="end">0</text><text x="190" y="118" text-anchor="end">0</text><text x="260" y="118" text-anchor="end">1009</text><text x="320" y="118" text-anchor="end">0</text>
<text x="20" y="148">b₃ =</text><text x="120" y="148" text-anchor="end">0</text><text x="190" y="148" text-anchor="end">135</text><text x="260" y="148" text-anchor="end">860</text><text x="320" y="148" text-anchor="end">16</text>
<line x1="70" y1="40" x2="70" y2="156" stroke="currentColor" stroke-width="1.3"/>
<line x1="330" y1="40" x2="330" y2="156" stroke="currentColor" stroke-width="1.3"/>
<text x="350" y="58">× 3</text>
<text x="350" y="88">× (−3)</text>
<text x="350" y="118">× (−2)</text>
<text x="350" y="148">× 1</text>
<line x1="420" y1="100" x2="470" y2="100" stroke="currentColor" stroke-width="1.5"/>
<polygon points="478,100 470,104 470,96"/>
<rect x="484" y="72" width="146" height="56" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.6"/>
<text x="557" y="97" text-anchor="middle" font-weight="bold">(3, 6, 15, 16)</text>
<text x="557" y="117" text-anchor="middle">length 22.9</text>
<text x="20" y="196">k₁ = 3, k₂ = 6, k₃ = 15: the three nonces, all below B = 16</text>
<text x="20" y="222">a typical vector of this lattice is about det^(1/4) ≈ 63.5 long; this one is far shorter</text>
<text x="20" y="248">the last coordinate, B = 16, marks it; LLL puts it first</text>
<text x="20" y="274" font-weight="bold">x = (3 − 579) · 856 mod 1009 = 345</text>
</svg>
<figcaption>Figure 14.3. The hidden number lattice for the hand example. The nonces were never in the data; they appear as the coordinates of an unusually short lattice vector.</figcaption>
</figure>

### Code it

The code has three parts: a textbook LLL with exact fractions (fine for
the small dimensions here; [The mathematics of cryptography](../mathematics/index.md)
explains LLL and BKZ properly, with faster code), the lattice of this
section, and an ECDSA signer on secp256k1 with a broken nonce generator. It
repeats the hand example, then attacks two cases at full size: 64-bit
nonces, the kind Breitner and Heninger found on the Bitcoin blockchain
(§14.5), and a generator that loses one byte, 8 known bits per nonce. The
second case takes about ten seconds.

```python
from fractions import Fraction
import hashlib, secrets

def lll(b):
    # Textbook LLL (delta = 3/4) with exact fractions, after Cohen's algorithm 2.6.3.
    b = [list(v) for v in b]
    n = len(b)
    dot = lambda u, v: sum(x * y for x, y in zip(u, v))
    mu = [[Fraction(0)] * n for _ in range(n)]
    bs, B = [], []                            # Gram-Schmidt vectors and their squared lengths
    for i in range(n):
        v = [Fraction(x) for x in b[i]]
        for j in range(i):
            mu[i][j] = dot(b[i], bs[j]) / B[j]
            v = [a - mu[i][j] * c for a, c in zip(v, bs[j])]
        bs.append(v)
        B.append(dot(v, v))

    def reduce(k, l):                         # make |mu[k][l]| <= 1/2
        c = round(mu[k][l])
        if c:
            b[k] = [x - c * y for x, y in zip(b[k], b[l])]
            for i in range(l):
                mu[k][i] -= c * mu[l][i]
            mu[k][l] -= c

    k = 1
    while k < n:
        reduce(k, k - 1)
        if B[k] < (Fraction(3, 4) - mu[k][k - 1] ** 2) * B[k - 1]:
            m = mu[k][k - 1]                  # swap b[k-1] and b[k], update in place
            Bnew = B[k] + m * m * B[k - 1]
            mu[k][k - 1] = m * B[k - 1] / Bnew
            B[k] = B[k - 1] * B[k] / Bnew
            B[k - 1] = Bnew
            b[k], b[k - 1] = b[k - 1], b[k]
            for j in range(k - 1):
                mu[k][j], mu[k - 1][j] = mu[k - 1][j], mu[k][j]
            for i in range(k + 1, n):
                t = mu[i][k]
                mu[i][k] = mu[i][k - 1] - m * t
                mu[i][k - 1] = t + mu[k][k - 1] * mu[i][k]
            k = max(k - 1, 1)
        else:
            for l in range(k - 2, -1, -1):
                reduce(k, l)
            k += 1
    return b

def hnp_basis(t, u, q, B, w=0):
    # Rows of the lattice for k_i = t_i*x + u_i (mod q) with w <= k_i < w + B.
    # Unknown x is eliminated with the first equation; w recenters the nonces.
    m = len(t)
    u = [(ui - w) % q for ui in u]
    inv = pow(t[0], -1, q)
    A = [t[i] * inv % q for i in range(1, m)]
    C = [(u[i] - A[i - 1] * u[0]) % q for i in range(1, m)]
    rows = [[1] + A + [0]]
    for i in range(1, m):
        rows.append([0] * i + [q] + [0] * (m - i))
    rows.append([0] + C + [B - w])            # B - w bounds |k_i - w|
    return rows

def hnp(t, u, q, B, w=0, check=None):
    for v in lll(hnp_basis(t, u, q, B, w)):
        if abs(v[-1]) == B - w:
            k1 = (v[0] if v[-1] > 0 else -v[0]) + w
            x = (k1 - u[0]) * pow(t[0], -1, q) % q
            if check is None or check(x): return x
    return None

# The hand example: q = 1009, three nonces below 16
t, u = [244, 607, 558], [579, 463, 224]
print(hnp_basis(t, u, 1009, 16))
print(lll(hnp_basis(t, u, 1009, 16))[0], "x =", hnp(t, u, 1009, 16))

# Full size: ECDSA on secp256k1 with a broken nonce generator
p, N = 2**256 - 2**32 - 977, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G = (0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
     0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)

def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    l = (3 * P[0] * P[0] * pow(2 * P[1], -1, p) if P == Q else (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p)) % p
    x = (l * l - P[0] - Q[0]) % p
    return x, (l * (P[0] - x) - P[1]) % p

def mul(k, P=G):
    R = None
    while k:
        if k & 1: R = add(R, P)
        P, k = add(P, P), k >> 1
    return R

def signatures(d, count, nonce_bits):
    out = []
    for i in range(count):
        h = int.from_bytes(hashlib.sha256(b"msg %d" % i).digest(), "big") % N
        k = secrets.randbits(nonce_bits) or 1         # the bug: too few random bits
        r = mul(k)[0] % N
        out.append((h, r, pow(k, -1, N) * (h + r * d) % N))
    return out

d = secrets.randbelow(N - 1) + 1
Q = mul(d)
for count, bits in ((2, 64), (48, 248)):
    sigs = signatures(d, count, bits)
    t = [r * pow(s, -1, N) % N for h, r, s in sigs]  # k = t*d + u (mod N)
    u = [h * pow(s, -1, N) % N for h, r, s in sigs]
    x = hnp(t, u, N, 2**bits, w=2**(bits - 1), check=lambda x: mul(x) == Q)
    print(count, "signatures,", 256 - bits, "bits known per nonce:", x == d)
```

```
[[1, 966, 391, 0], [0, 1009, 0, 0], [0, 0, 1009, 0], [0, 135, 860, 16]]
[3, 6, 15, 16] x = 345
2 signatures, 192 bits known per nonce: True
48 signatures, 8 bits known per nonce: True
```

The two full-size cases mark the range. With 192 known bits per nonce the
lattice has dimension 3 and the key falls from two signatures, instantly.
With 8 known bits the lattice has dimension 49, and the attack is still
cheap; stronger reduction (BKZ) and better embeddings bring the count
closer to the information bound of 33. Below about 2 bits per signature
the lattice approach runs out of room on 256-bit curves, because the short
vector stops being unusually short; the Fourier method of §14.12 takes over
there.

!!! note "Life story: the hidden number problem attack"
    **Born:** 1996, Dan Boneh and Ramarathnam Venkatesan (CRYPTO 1996), as a
    hardness result for Diffie-Hellman bits; turned against DSA by Nick
    Howgrave-Graham and Nigel Smart (2001), with bounds by Phong Nguyen and
    Igor Shparlinski (2002, 2003) · **Purpose:** to recover a secret from
    many linear congruences whose unknowns are each known to be small ·
    **Helped:** every partial-nonce attack since: cache and timing attacks on
    OpenSSL ECDSA, Minerva, TPM-Fail, the blockchain scans · **Status:**
    the standard tool; improved by BKZ, sieving and recentering, with the
    Fourier method for leaks below about two bits

## 14.7 Leaks in the wild: Minerva, TPM-Fail and LadderLeak

*Level: intermediate.*

Few programmers write `randbits(248)` by mistake. In real systems the
partial knowledge of nonces comes from two places: a generator that is
slightly biased, and an implementation that leaks something about each
nonce while it computes $kG$. Both have been found in standards, in
certified hardware and in the most used libraries.

Figure 14.4 places the cases of this section beside those of §14.3 to §14.6:
the less of each nonce the attacker knows, the more signatures it needs.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Bars showing how much of a 256-bit nonce the attacker knows in each case, from all of it in a repeat to less than one bit in LadderLeak" fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold">known part of each nonce (shaded), out of 256 bits</text>
<text x="20" y="58">repeated nonce</text>
<rect x="200" y="42" width="320" height="22" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>
<text x="530" y="58">2 sigs</text>
<text x="20" y="98">64-bit nonces</text>
<rect x="200" y="82" width="320" height="22" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="200" y="82" width="240" height="22" fill="currentColor" fill-opacity="0.35"/>
<text x="530" y="98">2 sigs</text>
<text x="20" y="138">one byte lost</text>
<rect x="200" y="122" width="320" height="22" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="200" y="122" width="10" height="22" fill="currentColor" fill-opacity="0.35"/>
<text x="530" y="138">≈ 33 to 50</text>
<text x="20" y="178">Minerva (length)</text>
<rect x="200" y="162" width="320" height="22" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="200" y="162" width="5" height="22" fill="currentColor" fill-opacity="0.35"/>
<text x="530" y="178">≈ 1,200+</text>
<text x="20" y="218">LadderLeak</text>
<rect x="200" y="202" width="320" height="22" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="200" y="202" width="1.5" height="22" fill="currentColor" fill-opacity="0.6"/>
<text x="530" y="218">very many</text>
<text x="20" y="258" font-style="italic">signatures needed (right) grow as the known part shrinks; a repeat is the limit where</text>
<text x="20" y="278" font-style="italic">every bit of the nonce difference is known</text>
</svg>
<figcaption>Figure 14.4. How much of each nonce the attacker knows, case by case. Minerva leaks a few bits on the fastest signatures only; LadderLeak leaks the top bit, and only with some probability.</figcaption>
</figure>

### A biased standard

The first came from the standard itself. The original DSA standard, FIPS
186 (1994), generated the nonce by taking a 160-bit pseudorandom number and
reducing it modulo the 160-bit prime $q$. Since $q$ is less than
$2^{160}$, the values below $2^{160} - q$ can arise in two ways and the
rest in only one, so small nonces come up more often. Around 2000 Daniel
Bleichenbacher showed that this bias, though it leaks no bits outright,
could be exploited with a Fourier-analysis method of his own and a very
large number of signatures; NIST changed the generation method in a 2001
change notice to FIPS 186-2. The current rule, in FIPS 186-4 and FIPS
186-5, is to generate 64 more bits than the group size before reducing, or
to draw candidates and reject those out of range.

The code computes how far "random $N$-bit number mod $q$" is from uniform,
for a made-up 160-bit $q$ near $1.25 \cdot 2^{159}$ (as DSA's often were) and for
two real curves, with and without the 64 extra bits.

```python
from fractions import Fraction
import math

def distance(bits, q):
    # Statistical distance from uniform of (random `bits`-bit number) mod q.
    # Values below 2^bits mod q come up a+1 times, the rest a times.
    a, b = divmod(2**bits, q)
    return Fraction(b * (q - b), q * 2**bits)

def log2(f):
    return round(math.log2(f), 1) if f else "-inf"

P256 = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
K256 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
q160 = 0xA0000000000000000000000000000000000000E3      # a made-up q just above 1.25 * 2^159
for name, q in (("160-bit q", q160), ("P-256 n", P256), ("secp256k1 n", K256)):
    N = q.bit_length()
    print(f"{name:12} mod of {N} bits: 2^{log2(distance(N, q))}   of {N + 64} bits: 2^{log2(distance(N + 64, q))}")

# How a 160-bit q skews k: small values are twice as likely
q = q160
small = 2**160 - q                                   # values below this appear twice
print("chance that k < 2^160 - q:", round(2 * small / 2**160, 3), "instead of", round(small / q, 3))
```

```
160-bit q    mod of 160 bits: 2^-2.7   of 224 bits: 2^-66.7
P-256 n      mod of 256 bits: 2^-32.0   of 320 bits: 2^-96.0
secp256k1 n  mod of 256 bits: 2^-127.7   of 320 bits: 2^-127.7
chance that k < 2^160 - q: 0.75 instead of 0.6
```

For the 160-bit $q$ the bias is enormous: three quarters of nonces land in
a range that should hold 60 percent of them. For P-256 the plain reduction
is off by $2^{-32}$, small but not negligible against an attacker with
billions of signatures and Bleichenbacher's method; the 64 extra bits push
it to $2^{-96}$. For secp256k1 the group order is so close to $2^{256}$ that
plain reduction is already within $2^{-128}$, and adding bits changes
nothing (the extra 64 bits happen to land the same way). The rule is
cheap, so standards apply it everywhere rather than reasoning curve by
curve.

### Timing the length of the nonce

The more common leak is timing. Computing $kG$ by double-and-add takes one
doubling per bit of $k$, starting at its top set bit. A nonce whose top
bits happen to be zero is shorter and is processed faster. One nonce in two
has a zero top bit, one in four two zero bits, one in 256 eight zero bits.
An attacker who can time signatures sorts them, keeps the fastest few
percent, assumes those nonces are short, and runs the lattice of §14.6 on
them. This is the HNP with the attacker choosing which samples to use.

Billy Bob Brumley and Nicola Tuveri showed in 2011 that this works across a
network: OpenSSL's Montgomery ladder for binary curves started its loop at
the top set bit of $k$, and by timing TLS handshakes from another machine
they recovered the private key of a server signing with ECDSA. OpenSSL
fixed the ladder to run a fixed number of steps. In 2014 Naomi Benger,
Joop van de Pol, Nigel Smart and Yuval Yarom used a cache attack
(Flush+Reload, which watches which memory lines another process touches)
on OpenSSL's ECDSA for secp256k1 and recovered keys from a few hundred
signatures by using the low bits of each nonce as well.

Minerva showed in 2019 that the length leak had not gone away. Jan Jančár,
Vladimír Sedláček, Petr Švenda and Marek Sýs of Masaryk University in Brno
found it first in a smart card built on an Atmel AT90SC chip, a product
certified under FIPS 140-2 and Common Criteria, and then in five
libraries: libgcrypt, wolfSSL, MatrixSSL, SunEC (the elliptic-curve code in
OpenJDK and Oracle Java) and Crypto++. Each computed $kG$ in time that
depended on the bit length of $k$. Their attack
refined the lattice step: instead of one fixed bound for every selected
signature, each signature got its own estimated length, so a signature
whose time suggests 6 zero bits and one suggesting 11 are both used at
their worth. Their paper reports full key recovery from about 500
signatures with simulated leakage, about 1,200 from a real library and
about 2,100 from the card. The libraries were patched; a card cannot be,
and it was certified.

!!! note "Life story: Minerva"
    **Born:** 2019, Jan Jančár, Vladimír Sedláček, Petr Švenda and Marek
    Sýs (Masaryk University, Brno); published at CHES 2020 as "Minerva: The
    curse of ECDSA nonces" · **Purpose:** to show that the time to compute
    $kG$ still revealed the bit length of the nonce in certified smart cards
    and in widely used libraries, and to tighten the lattice attack that
    uses it · **Helped:** patches to libgcrypt, wolfSSL, MatrixSSL, SunEC and
    Crypto++; a tool for testing implementations; better attacks on earlier
    data sets · **Status:** a standard test for any ECDSA implementation

TPM-Fail, published the same year by Daniel Moghimi, Berk Sunar, Thomas
Eisenbarth and Nadia Heninger, found the same kind of leak in trusted
platform modules, the chips that hold keys for disk encryption and remote
attestation. Intel's firmware TPM leaked the nonce length in its ECDSA and
ECSchnorr signing; a key fell after about 1,300 timed signatures, in
minutes for an attacker on the machine. A hardware TPM from
STMicroelectronics, certified at Common Criteria EAL 4+, leaked the same
way and fell after fewer than 40,000 signatures. They also attacked a
strongSwan VPN server whose certificate key was kept in the Intel firmware
TPM, timing about 45,000 authentication handshakes over the network.
Intel and STMicroelectronics issued fixes (CVE-2019-11090 and
CVE-2019-16863). The Minerva authors later recovered keys from the
TPM-Fail data with about 900 signatures instead of 40,000, which shows how
much of an attack's cost is in the lattice step, not the leak.

!!! note "Life story: TPM-Fail"
    **Born:** November 2019, Daniel Moghimi, Berk Sunar, Thomas Eisenbarth
    and Nadia Heninger; USENIX Security 2020 · **Purpose:** to show that
    TPM chips certified to protect keys leaked ECDSA nonce lengths through
    signing time · **Helped:** firmware updates for Intel's fTPM and a
    patched STMicroelectronics TPM; a remote attack on a VPN server that
    put timing leaks in hardware on the network threat list · **Status:**
    patched; certified hardware is now routinely tested for it

### Less than one bit

The lattice needs every selected nonce to have *some* bits known for
certain. What if the leak is a single bit, and that bit is wrong part of
the time? LadderLeak, by Diego Aranha, Felipe Rodrigues Novaes, Akira
Takahashi, Mehdi Tibouchi and Yuval Yarom (ACM CCS 2020), found exactly
that in OpenSSL. A cache-timing difference in the Montgomery ladder's first
steps revealed the most significant bit of the nonce, but only with a
probability below one: the attacker learned "probably 0" or "probably 1",
an amount of information less than one bit per signature.

Lattices cannot use such data, so the authors went back to Bleichenbacher's
Fourier method (§14.12), which treats bias as a statistical signal rather
than as known bits, and made it far more efficient. They recovered full
ECDSA keys on two curves OpenSSL supported, the binary curve sect163r1 and
NIST P-192, and showed how the same improvements cut the data needed for
leaks of slightly more than one bit. OpenSSL fixed the ladder. The curves
attacked are small by today's standards, but the lesson is general: there
is no amount of nonce leakage small enough to ignore.

!!! note "Life story: LadderLeak"
    **Born:** 2020, Diego Aranha, Felipe Rodrigues Novaes, Akira Takahashi,
    Mehdi Tibouchi and Yuval Yarom; ACM CCS 2020 · **Purpose:** to break
    ECDSA from a cache leak of the nonce's top bit that is right only part
    of the time, less than one bit per signature · **Helped:** a fix to
    OpenSSL's Montgomery ladder; a much faster Fourier-analysis attack on
    the hidden number problem that others now use · **Status:** the record
    for least leakage exploited in a practical key recovery, as of its
    publication

### Other routes to the same problem

The pattern is the same whatever the side channel; only the way the
attacker learns a bit changes. Keegan Ryan's "Return of the Hidden Number
Problem" (2019) found that many libraries leaked through a step after $kG$:
a conditional subtraction in the modular arithmetic of the signing
equation, which happened or not depending on the size of a value tied
linearly to the key, and so gave hidden-number samples of its own. Power and electromagnetic
measurements of smart cards give the same kind of data at closer range
([Chapter 17](17-Side-Channels-the-Attackers-View.md) treats them from
the attacker's side). And a weak generator need not be biased in the top
bits: the "shared prefix" nonces of §14.5 give the HNP with a different
known part. Wherever any bits of $k$ are known, likely, or related across
signatures, the key is a lattice reduction away.

## 14.8 Deterministic nonces and the fault attack

*Level: intermediate.*

After the PS3 and the Android wallets, the cryptographic community drew one
conclusion: signing should not depend on a random generator at all. Two
designs carry it out, and book 1 teaches both, so here is only what an
attacker needs to know about them.

**RFC 6979** (Thomas Pornin, August 2013) keeps ECDSA and DSA unchanged for
the verifier and changes only how the signer picks $k$. It seeds HMAC_DRBG,
the HMAC-based generator of SP 800-90A, with the private key and the hash of
the message, and draws candidates from it until one falls in $[1, n-1]$.
The same key and message always give the same $k$, and therefore the same
signature, which is harmless. Different messages give unrelated nonces,
since predicting one would mean predicting HMAC outputs under a secret
key. Rejection sampling makes $k$ exactly uniform, so the bias of §14.7
cannot arise. FIPS 186-5 (2023) approved this "deterministic ECDSA" for US
government use.

**EdDSA** (Bernstein, Duif, Lange, Schwabe and Yang, 2011; RFC 8032, 2017)
builds the idea into the scheme. The private seed is hashed into two
halves, a scalar $a$ and a secret prefix; the nonce is
$r = H(\text{prefix} \,\|\, M) \bmod L$, then $R = rB$,
$h = H(R \,\|\, A \,\|\, M) \bmod L$ and $S = r + h a \bmod L$, where $A = aB$
is the public key ([§15.7 of book 1](../../book/15-Elliptic-Curves.md)).
There is no random generator anywhere in signing.

Against the attacks of §14.3 to §14.5 these designs are complete: a fixed,
repeated or guessable nonce cannot happen unless the hash function breaks.
They do nothing against timing leaks (§14.7), since the nonce is still
computed into $kG$ and can still leak there; constant-time scalar
multiplication is a separate job. And they create one weakness of their
own.

### Signing the same message twice

With a deterministic nonce, signing the same message twice uses the same
nonce twice. That is fine when both computations are correct: the two
signatures are identical, and identical equations add nothing. But if an
attacker can make *one* of the two computations go wrong after the nonce
has been computed, it gets two *different* equations in the same nonce, the
situation of §14.2 delivered on request.

In Ed25519 the attacker can, for instance, disturb the computation of the
challenge $h$. The correct run gives $S = r + h a$; the faulted run, with
the same $r$, gives $S' = r + h' a$. Subtracting,

$$
a \equiv \frac{S - S'}{h - h'} \pmod L .
$$

The attacker needs $h'$. If the fault corrupts the $R$ that goes into the
hash and the signature carries the corrupted $R'$, then $h' = H(R' \| A \| M)$
can be computed from the faulty signature itself. If the fault corrupts
something the attacker cannot see, such as the copy of the message being
hashed, the attacker tries each plausible corruption (every single-bit
flip, say) and checks each candidate $a$ against the public key. Once $a$
is known, the attacker does not need the secret prefix: any nonce works for
signing, so it can sign anything.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Two Ed25519 signing runs on the same message: both compute the same nonce r and the same R; in the second a glitch changes the challenge hash, so S and S prime differ and their difference reveals the secret scalar a" fill="currentColor" font-size="14">
<text x="160" y="22" text-anchor="middle" font-weight="bold">run 1 (correct)</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">run 2 (glitched)</text>
<rect x="40" y="36" width="240" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="59" text-anchor="middle">r = H(prefix ‖ M), R = rB</text>
<rect x="360" y="36" width="240" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="480" y="59" text-anchor="middle">r = H(prefix ‖ M), R = rB</text>
<text x="320" y="59" text-anchor="middle" font-style="italic">same</text>
<rect x="40" y="96" width="240" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="119" text-anchor="middle">h = H(R ‖ A ‖ M)</text>
<rect x="360" y="96" width="240" height="36" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<text x="480" y="119" text-anchor="middle">h′ = H(R ‖ A ‖ M with a bit flipped)</text>
<text x="610" y="90" text-anchor="end" font-style="italic">glitch</text>
<rect x="40" y="156" width="240" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="179" text-anchor="middle">S = r + h·a</text>
<rect x="360" y="156" width="240" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="480" y="179" text-anchor="middle">S′ = r + h′·a</text>
<line x1="160" y1="72" x2="160" y2="90" stroke="currentColor" stroke-width="1.4"/><polygon points="160,96 156,88 164,88"/>
<line x1="160" y1="132" x2="160" y2="150" stroke="currentColor" stroke-width="1.4"/><polygon points="160,156 156,148 164,148"/>
<line x1="480" y1="72" x2="480" y2="90" stroke="currentColor" stroke-width="1.4"/><polygon points="480,96 476,88 484,88"/>
<line x1="480" y1="132" x2="480" y2="150" stroke="currentColor" stroke-width="1.4"/><polygon points="480,156 476,148 484,148"/>
<rect x="170" y="214" width="300" height="44" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="241" text-anchor="middle" font-weight="bold">a = (S − S′) / (h − h′) mod L</text>
<line x1="160" y1="192" x2="210" y2="210" stroke="currentColor" stroke-width="1.4"/>
<line x1="480" y1="192" x2="430" y2="210" stroke="currentColor" stroke-width="1.4"/>
</svg>
<figcaption>Figure 14.5. The fault attack on deterministic Ed25519. Both runs derive the same nonce from the same message; one glitch after that point turns two signatures into two equations in one nonce.</figcaption>
</figure>

### A glitch in practice

Faults are not hypothetical. A brief dip in a chip's supply voltage, a
pulse on its clock line, a laser flash on the die or an electromagnetic
pulse can make one instruction misbehave, and these are standard tools in
smart-card evaluation labs. In 2017 Yolan Romailler and Sylvain Pelissier
of Kudelski Security showed at the FDTC workshop that a single voltage
glitch on an Arduino Nano running an Ed25519 library was enough: they
glitched one signing of a message, signed it again correctly, and computed
the key with the formula above. The authors stressed that the weakness is
in the design, not the library: any deterministic scheme behaves this way.
In 2018 Christopher Ambrose, Joppe Bos, Björn Fay, Marc Joye, Manfred
Lochter and Bruce Murray analyzed differential fault attacks on
deterministic signatures in general, and Damian Poddebniak, Juraj
Somorovsky, Sebastian Schinzel, Manfred Lochter and Paul Rösler showed that
software attackers can cause the fault too, with Rowhammer, the trick of
flipping bits in one row of memory by hammering its neighbours.

Faults also happen by themselves. Cosmic rays flip bits in memory and
registers; on Earth this is rare enough to ignore in most software, but
devices in orbit or on the surface of Mars, outside the shelter of a thick
atmosphere and magnetic field, see far more of these single-event upsets.
A lander that signs its command acknowledgements with deterministic
Ed25519, and that retries a signature after a timeout, could hand its key
to anyone who records both replies. Spacecraft engineers already defend
against this with radiation-hardened parts and error-correcting memory;
the signing code can defend itself as well, as below.

### Code it

The code is a complete Ed25519 in plain Python, checked against the first
test vector of RFC 8032. Signing takes an optional `fault`, which corrupts
the copy of the message used in the challenge hash: the simulated glitch
flips bit 77. The attacker does not know which bit flipped, so it tries
all of them. Then it forges a signature on a new message, and finally
repeats the attack against hedged signing, where fresh random bytes enter
the nonce.

```python
import hashlib, secrets

# Ed25519 (RFC 8032) in plain Python, affine coordinates: slow, clear, not constant time.
p = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493
d = -121665 * pow(121666, -1, p) % p
By = 4 * pow(5, -1, p) % p
Bx = 15112221349535400772501151409588531511454012693041857206046113283949847762202
B = (Bx, By)

def add(P, Q):
    (x1, y1), (x2, y2) = P, Q
    t = d * x1 * x2 * y1 * y2 % p
    return ((x1 * y2 + x2 * y1) * pow(1 + t, -1, p) % p,
            (y1 * y2 + x1 * x2) * pow(1 - t, -1, p) % p)

def mul(k, P):
    R = (0, 1)                               # the neutral point
    while k:
        if k & 1: R = add(R, P)
        P, k = add(P, P), k >> 1
    return R

def enc(P):
    return (P[1] | (P[0] & 1) << 255).to_bytes(32, "little")

def Hint(*parts):
    return int.from_bytes(hashlib.sha512(b"".join(parts)).digest(), "little")

def keys(seed):
    h = hashlib.sha512(seed).digest()
    a = int.from_bytes(h[:32], "little")
    a = (a & (2**254 - 8)) | 2**254          # clamp
    return a, h[32:], enc(mul(a, B))

def sign(seed, M, fault=None, hedge=b""):
    a, prefix, A = keys(seed)
    r = Hint(prefix, hedge, M) % L           # the nonce: a hash of secret prefix and message
    R = enc(mul(r, B))
    Mh = fault(M) if fault else M            # a glitch may corrupt the copy hashed here
    h = Hint(R, A, Mh) % L
    return R + ((r + h * a) % L).to_bytes(32, "little")

def verify(A_pt, M, sig):
    S, h = int.from_bytes(sig[32:], "little"), Hint(sig[:32], enc(A_pt), M) % L
    hA = mul(h, A_pt)
    return S < L and enc(add(mul(S, B), (-hA[0] % p, hA[1]))) == sig[:32]

def flip(M, bit):                            # one bit of the message flipped
    b = bytearray(M); b[bit // 8] ^= 1 << (bit % 8); return bytes(b)

def attack(A, M, good, bad):
    # Same R in both signatures means the same nonce r. The attacker does not know
    # which bit the glitch hit, so it tries every single-bit flip of M.
    if good[:32] != bad[:32]: return None
    S1, S2 = int.from_bytes(good[32:], "little"), int.from_bytes(bad[32:], "little")
    h1 = Hint(good[:32], A, M) % L
    for bit in range(8 * len(M)):
        h2 = Hint(good[:32], A, flip(M, bit)) % L
        a = (S1 - S2) * pow(h1 - h2, -1, L) % L
        if enc(mul(a, B)) == A: return a
    return None

seed = bytes.fromhex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60")
a, prefix, A = keys(seed)
print(A.hex()[:16], sign(seed, b"").hex()[:16])          # RFC 8032 TEST 1

A_pt = mul(a, B)
M = b"open airlock 2"
good = sign(seed, M)
bad = sign(seed, M, fault=lambda m: flip(m, 77))         # the glitch: bit 77 flips
print(verify(A_pt, M, good), verify(A_pt, M, bad))      # a check before release would catch it
k = attack(A, M, good, bad)
print(k == a % L)                                        # the secret scalar
forged = Hint(b"attacker", b"nonce") % L                 # any nonce will do now
R = enc(mul(forged, B))
M2 = b"open airlock 1"
S = (forged + Hint(R, A, M2) % L * k) % L
print(verify(A_pt, M2, R + S.to_bytes(32, "little")))   # a message the device never signed

good = sign(seed, M, hedge=secrets.token_bytes(32))      # hedged: fresh randomness in r
bad = sign(seed, M, fault=lambda m: flip(m, 77), hedge=secrets.token_bytes(32))
print(attack(A, M, good, bad))                           # different R, no equation to solve
```

```
d75a980182b10ab7 e5564300c360ac72
True False
True
True
None
```

The second line is the start of the fix: the glitched signature does not
verify. Checking each signature against the public key before releasing it
catches this fault, because $S'B = R + h'A$ does not equal $R + hA$. It does
not catch every fault (a fault that corrupts the public key used in the
check, or one timed to hit both, is harder to rule out), and it doubles the
cost of signing, which is why hardware often recomputes and compares
instead. The last line is the stronger fix. With 32 fresh random bytes in
the nonce hash, the two runs get different nonces, so the two equations
have three unknowns and the attack has nothing to solve.

### Hedged signing

**Hedged** (or randomized deterministic) signing derives the nonce from the
private key, the message *and* fresh randomness. If the random generator is
good, signing the same message twice gives different nonces, which defeats
the fault attack. If the generator is broken, stuck or backdoored, the
nonce is still a secret hash of the key and the message, which defeats the
PS3, Android and Dual_EC failures. Neither failure alone loses the key.
RFC 6979 already allows extra input to its generator (section 3.6), and
work on hedged EdDSA and ECDSA formats has continued in the IETF's research
group (the CFRG). Signal's XEdDSA, BIP 340 Schnorr signatures in Bitcoin and
several libraries mix randomness into the nonce this way.

### The same algebra through an API

In 2022 Konstantinos Chalkias published a list of Ed25519 libraries, dozens
of them, whose signing function took the public key as a separate argument
instead of deriving it from the secret. A caller that passed the wrong
public key, by mistake or because an attacker controlled that argument,
got a signature computed with the right nonce (which depends only on the
prefix and the message) but a different challenge $h' = H(R \| A' \| M)$.
Two signatures of one message under two public keys are exactly the pair
of Figure 14.5, with $h'$ known to the attacker. The fix is to derive the
public key inside the signing function, or check it there.

!!! note "Life story: the fault attack on deterministic signatures"
    **Born:** 2017, Yolan Romailler and Sylvain Pelissier (Kudelski
    Security), FDTC 2017, one voltage glitch on Ed25519 on an Arduino Nano;
    generalized in 2018 by Ambrose, Bos, Fay, Joye, Lochter and Murray, and
    by Poddebniak, Somorovsky, Schinzel, Lochter and Rösler with Rowhammer ·
    **Purpose:** to show that a deterministic nonce turns one fault into
    two equations in one nonce, and so into the private key · **Helped:**
    hedged signing in libraries and drafts; verify-after-sign and
    redundant computation in hardware; the 2022 cleanup of Ed25519 APIs ·
    **Status:** the main reason to add randomness back into deterministic
    nonces on exposed hardware

## 14.9 Signature malleability

*Level: intermediate.*

Every attack so far stole a key. This one steals nothing, and it still cost
an exchange its excuse and Bitcoin two years of protocol work. A signature
scheme is **malleable** if, given a valid signature on a message, anyone can
compute a *different* valid signature on the same message without the key.

The standard security notion for signatures, existential unforgeability
(EUF-CMA), only promises that an attacker cannot sign a *new* message. A
second signature on an old message is not counted as a forgery. The
stronger notion, strong unforgeability (SUF-CMA), also forbids new
signatures on old messages. ECDSA as standardized meets the first and not
the second, for a simple geometric reason.

### Why $(r, -s)$ verifies

The value $r$ is the $x$-coordinate of $kG$. The point $-kG$ is the
reflection of $kG$ in the $x$-axis: the same $x$, the opposite $y$. So the
nonces $k$ and $n - k$ give the same $r$. If $(r, s)$ is the signature made
with $k$, the signature made with $n - k$ on the same message is
$(n-k)^{-1}(h + r d) = -s$, that is $(r, n - s)$. Anyone can compute it,
and it verifies, since verification only looks at the $x$-coordinate of
the recomputed point. On the toy curve of §14.3, the signature $(7, 10)$ on
$h = 4$ came from $k = 10$ and $10G = (7, 11)$; the twin $(7, 9)$ is what
$k = 9$ gives, with $9G = (7, 6)$.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The points 10G equal to 7, 11 and 9G equal to 7, 6 on the toy curve lie on the same vertical line x equal to 7, so both give r equal to 7 and both signatures 7, 10 and 7, 9 verify" fill="currentColor" font-size="14">
<line x1="60" y1="210" x2="380" y2="210" stroke="currentColor" stroke-width="1.2"/>
<line x1="60" y1="210" x2="60" y2="20" stroke="currentColor" stroke-width="1.2"/>
<text x="380" y="230" text-anchor="end">x</text>
<text x="48" y="30" text-anchor="end">y</text>
<line x1="60" y1="105" x2="380" y2="105" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 4" opacity="0.6"/>
<text x="70" y="98" font-size="12">y ↔ 17 − y</text>
<line x1="200" y1="210" x2="200" y2="24" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<text x="200" y="230" text-anchor="middle">x = 7</text>
<circle cx="200" cy="63" r="5"/>
<text x="212" y="60">10G = (7, 11)</text>
<circle cx="200" cy="146" r="5"/>
<text x="212" y="150">9G = −10G = (7, 6)</text>
<text x="420" y="40" font-weight="bold">same x, so same r = 7</text>
<text x="420" y="70">k = 10 gives (7, 10)</text>
<text x="420" y="94">k = 9 gives (7, 9)</text>
<text x="420" y="160">both verify for h = 4</text>
<text x="420" y="184">low-s rule keeps (7, 9)</text>
</svg>
<figcaption>Figure 14.6. Why ECDSA is malleable, on the toy curve. A point and its negative share an x-coordinate, so a signature and its twin with s replaced by n − s check against the same r.</figcaption>
</figure>

```python
# Malleability on the toy curve y^2 = x^3 + 2x + 2 over F_17, G = (5, 1), n = 19
p, a, n, G = 17, 2, 19, (5, 1)

def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    l = (3 * P[0] * P[0] + a) * pow(2 * P[1], -1, p) if P == Q else (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p)
    x = (l * l - P[0] - Q[0]) % p
    return x, (l % p * (P[0] - x) - P[1]) % p

def mul(k, P=G):
    R = None
    for _ in range(k % n): R = add(R, P)     # tiny group: repeated addition is fine
    return R

def verify(h, Q, r, s):
    if not (0 < r < n and 0 < s < n): return False
    w = pow(s, -1, n)
    X = add(mul(h * w % n), mul(r * w % n, Q))
    return X is not None and X[0] % n == r

Q = mul(11)                                  # public key of d = 11
r, s = 7, 10                                 # the signature on h = 4 from the hand example
print(Q, verify(4, Q, r, s), verify(4, Q, r, n - s))
print(mul(10), mul(9))                       # the two nonces behind them: same x
low = lambda r, s: (r, min(s, n - s))        # the low-s rule picks one of the pair
print(low(r, s), low(r, n - s))
```

```
(13, 10) True True
(7, 11) (7, 6)
(7, 9) (7, 9)
```

Encoding adds a second kind of malleability. ECDSA signatures are usually
sent as an ASN.1 DER structure, two integers in a sequence. A strict DER
parser accepts exactly one encoding of each pair; a lax one accepts extra
leading zero bytes, longer length fields and other variants, each a
different byte string carrying the same $(r, s)$. EdDSA has its own case:
$S$ and $S + L$ are equal mod $L$, so RFC 8032 requires verifiers to reject
$S \ge L$, the check in the code of §14.8; libraries that skipped it were
malleable.

### Bitcoin's transaction malleability

None of this matters if a signature is used only to decide "valid or not".
It matters when something *identifies* the signed data by hashing it with
the signature included, and Bitcoin did exactly that. A transaction's ID
was the hash of the whole transaction, signatures included. Anyone relaying
a transaction could replace $s$ by $n - s$, or re-encode the DER, and
broadcast a version with a different ID that spent the same coins to the
same place. Whichever version a miner included was the real one.

The money was always safe; the bookkeeping was not. Software that tracked
its own payments by transaction ID could conclude that a payment had
failed, because the ID it expected never appeared in a block, when the
payment had in fact gone through under another ID. On 7 February 2014 the
Mt. Gox exchange in Tokyo, then handling a large share of all Bitcoin
trading, halted withdrawals; on 10 February it blamed transaction
malleability, saying attackers had altered withdrawal transactions and
then claimed they had never arrived so as to be paid again. At the end of
February it filed for bankruptcy, with about 850,000 bitcoins missing
(about 200,000 were later found in an old wallet).

Christian Decker and Roger Wattenhofer of ETH Zurich checked the claim
against the blockchain. In a study posted that March and published at
ESORICS 2014 they found that malleated transactions had been rare before
Mt. Gox's announcement and became common only *after* it, as others tried
the trick on other exchanges. They estimated that at most 386 bitcoins
could have been taken from Mt. Gox by malleability, a tiny fraction of
what was missing. Malleability was real; it did not explain Mt. Gox.

!!! note "Life story: transaction malleability"
    **Born:** known to Bitcoin developers by 2011; famous in February 2014
    when Mt. Gox blamed it for halted withdrawals · **Purpose:** an
    attacker or relay alters a transaction's signature encoding, or flips
    $s$ to $n - s$, changing the transaction ID without changing what it
    does · **Helped:** BIP 62 (proposed, withdrawn), BIP 66 strict DER
    (enforced July 2015), the low-$s$ relay rule, and Segregated Witness
    (2017), which took signatures out of the transaction ID ·
    **Status:** fixed for SegWit transactions; Decker and Wattenhofer's
    study showed it explained at most 386 of Mt. Gox's missing bitcoins

### BIP 62, BIP 66 and the low-$s$ rule

Bitcoin's developers attacked the problem from several sides. **BIP 62**
(Pieter Wuille, 2014) listed every known source of malleability, including
non-canonical DER, high $s$ and several in the script language, and proposed
making each one invalid. It was never deployed as a whole and was withdrawn
once a deeper fix was ready. **BIP 66** took one piece of it: from July 2015
(block 363,725) every signature in a new block had to be strict DER. The
motivation was not only malleability. OpenSSL's DER parser, which Bitcoin
then used, accepted different non-standard encodings on different
platforms, and a change in OpenSSL (made public in January 2015) showed
that two nodes could disagree on whether a block was valid, a far worse
failure. The **low-$s$ rule** asks that $s \le n/2$, choosing one of each
pair $(r, s)$, $(r, n-s)$, as the last line of the code does; Bitcoin Core
has refused to relay high-$s$ transactions since 2015.

The deeper fix was **Segregated Witness** (BIP 141), activated in August
2017. It moved signatures out of the data that the transaction ID hashes,
so changing a signature no longer changes the ID. That is the general
lesson: if a design needs a unique identifier, it should hash the
*message*, never the signature, or use a signature scheme that is strongly
unforgeable and a strict encoding. Ed25519 with the $S < L$ check is
strongly unforgeable; ECDSA becomes so only with a low-$s$ rule and strict
DER, which is why Bitcoin's newer Schnorr signatures (BIP 340) fix both
by construction: a 64-byte fixed encoding and an $R$ with a fixed
$y$-coordinate parity.

## 14.10 Untrusted generators and other signature failures

*Level: beginner.*

### The nonce generator you cannot trust

Every attack in §14.3 to §14.7 assumed a generator that fails by accident.
Dual_EC_DRBG is the case where the generator may have been built to fail
for one party. It was one of four generators NIST standardized in 2006, in
the document that later became SP 800-90A, and it uses two elliptic-curve
points $P$ and $Q$ whose relation, if anyone knows it, lets that person
predict all future outputs from about 30 bytes of past output. Dan Shumow
and Niels Ferguson pointed out the possibility in 2007; documents published
in 2013 indicated that the NSA had promoted the generator; NIST told users
to stop using it in 2013 and removed it in the 2015 revision. For signatures the consequence is direct: if a
signer's nonces come from Dual_EC_DRBG and some earlier output of the same
generator was public (a TLS random value, say), the holder of the trapdoor
can compute the next nonce and, from one signature, the key, by §14.2's
first formula. No repeat, no bias and no lattice are needed, and nobody
else can detect the weakness from the signatures. Book 1
([§15.8](../../book/15-Elliptic-Curves.md)) shows the backdoor in one
equation; [Chapter 18](18-Random-Numbers-Gone-Wrong.md) tells the whole
story, with Juniper. Deterministic or hedged nonces make a signer immune to
this, whatever its generator.

### The Android wallets, once more

The Android `SecureRandom` failure of 2013 (§14.5) belongs here too, as the
accidental version of the same thing: the platform's generator, which every
app trusted, gave some apps the same output. It differs from Dual_EC in
who could exploit it (anyone watching the blockchain) and in how it was
found (by the thefts). [Chapter 18](18-Random-Numbers-Gone-Wrong.md) has
the details of the bug.

### RSA signatures fail differently

RSA signatures with PKCS#1 v1.5 padding have no nonce at all, and RSA-PSS
uses a random salt that is not secret, so a broken generator costs an RSA
signer nothing: the worst a bad salt does is make PSS behave like a
deterministic scheme. RSA signatures fail in other ways, which
[Chapter 13](13-Attacks-on-RSA.md) covers in full. Two are close relatives
of this chapter. Bleichenbacher's 2006 forgery used verifiers that parsed
the padding of $s^3 \bmod N$ carelessly, so that with exponent 3 an attacker
could forge signatures with a cube root and no key; it returned as BERserk
in 2014. And the RSA-CRT fault attack (Boneh, DeMillo and Lipton, 1997,
with Arjen Lenstra's one-signature version) is the RSA counterpart of
§14.8: one faulty signature computed with the Chinese remainder theorem
gives a factor of $N$ by one gcd, and the same fix, verifying before
release, stops it.

### Verifiers that accept too much

The other half of a signature system is the verifier, and verifiers have
failed in ways that need no key at all. In 2020 Windows' CryptoAPI accepted
ECDSA certificates whose curve parameters, including the generator, came
from the certificate itself, so an attacker could choose a generator for
which it knew the "private key" of a real public key (CurveBall,
CVE-2020-0601). In 2022 Neil Madden found that Java 15 to 18 accepted the
ECDSA signature $r = s = 0$ for any message under any key, because the new
verification code skipped the range check $0 < r, s < n$
(CVE-2022-21449, the "psychic signatures" bug). Book 1
[§15.6](../../book/15-Elliptic-Curves.md) shows both; the range check in
the verifier of §14.9's code is the line that was missing.

## 14.11 What a safe signing implementation does today

*Level: intermediate.*

Put together, the attacks of this chapter turn into a short list of
requirements. Each line names the attack it stops.

1. **Derive the nonce, and hedge it.** Compute $k$ from the private key and
   the message (RFC 6979 for ECDSA, the built-in rule for EdDSA), and on any
   device that an attacker can touch or that runs in a harsh environment,
   mix in fresh randomness as well. Stops: fixed nonces (PS3), broken or
   backdoored generators (Android, Dual_EC), and with the randomness, the
   fault attack of §14.8.
2. **Make the nonce exactly uniform.** Reduce from at least 64 extra bits or
   use rejection sampling, as FIPS 186-5 and RFC 6979 require; never take
   "a random number of the right size" mod $n$. Stops: Bleichenbacher's
   bias.
3. **Compute $kG$ in constant time.** A fixed number of ladder steps or
   window operations whatever the length of $k$, no secret-dependent table
   lookups or branches, and constant-time modular arithmetic for $s$ as
   well. Common techniques add a random multiple of $n$ to $k$ before the
   scalar multiplication (scalar blinding), or blind the key in the
   computation of $s$. Stops: Brumley and Tuveri, Minerva, TPM-Fail,
   LadderLeak, Ryan's modular-reduction leak.
4. **Verify before release, or compute twice.** On hardware, check each
   signature against the public key, or recompute and compare, before it
   leaves the device. Stops: the EdDSA fault and the RSA-CRT fault.
5. **Derive the public key inside the signer.** Never accept it as an
   argument. Stops: the 2022 Ed25519 API problem.
6. **Encode strictly and canonically.** Low $s$ for ECDSA where signatures
   might be used as identifiers, strict DER or fixed-length encodings, and
   $S < L$ for EdDSA. Better, never identify anything by its signature.
   Stops: malleability.
7. **Verify strictly.** Range checks on $r$ and $s$, named curves only,
   points checked to be on the curve and of the right order. Stops:
   psychic signatures, CurveBall, invalid-curve tricks.
8. **Limit what one key signs.** Separate keys for separate purposes, and
   single-use keys where the design allows it, as Bitcoin wallets do. A
   key that signs a few times gives a lattice attacker a few samples.

Most of this is already in good libraries; the list is mostly a reason to
use one. libsecp256k1, the Bitcoin library, was written with most of the
list in mind, and the major Ed25519 libraries cover most of it too, though
few hedge their nonces by default. Where an implementation has to be
written fresh, as on a small embedded device, these are the lines to test,
and the test for line 1 is the one Sony did not run: sign twice and compare
the $r$ values, and sign the same message twice and compare the outputs.

Two standards questions come up often. FIPS 186-5 (2023) approves ECDSA
with random nonces, ECDSA with RFC 6979 nonces, and EdDSA (Ed25519 and
Ed448), and no longer approves DSA for new signatures; FIPS 186-4 allowed
DSA and random-nonce ECDSA only. Hedged signing is compatible with
verification under all of them, since a verifier cannot tell how $k$ was
chosen. The post-quantum signatures that replace these schemes have their
own nonces and masks (ML-DSA uses rejection sampling with a hedged
default), and their implementations meet the same kinds of fault and
timing attacks; [Chapter 16](16-Breaking-Post-Quantum-Candidates.md)
touches on them.

## 14.12 Going deeper

*Level: expert.*

**Bleichenbacher's Fourier method.** When each nonce leaks only a bias,
not bits, the lattice has no short vector to find. Bleichenbacher measured
the bias of a distribution of $k$ mod $n$ by

$$
B_n(K) = \left| \mathbb{E}\!\left[ e^{2\pi i K / n} \right] \right|,
$$

which is 0 for uniform $K$ and grows with the bias (for nonces whose top
bit is always 0 it is about $2/\pi$). Given samples $k_i = t_i d + u_i$, a
candidate $w$ for $d$ gives values $u_i + t_i w$; the sum
$\sum_i e^{2\pi i (u_i + t_i w)/n}$ is large when $w = d$ and small
otherwise. Testing every $w$ is impossible, so the method first combines
samples (adding and subtracting them) until the $t_i$ are small, which
loses some bias at each step, and then finds the peak with a fast Fourier
transform over a small range of $w$, recovering the top bits of $d$ and
repeating. The cost is set by a trade-off between how many samples one
has, how much bias survives the combining, and the FFT size. The combining
step is a K-list sum problem of the kind Wagner's generalized birthday
algorithm solves; LadderLeak tuned it with a careful time, memory and data
trade-off, which is what made a sub-one-bit leak practical.

**Beyond LLL.** For leaks of 2 to 4 bits on 256-bit curves the lattice
becomes large and the target only slightly short. Martin Albrecht and
Nadia Heninger (EUROCRYPT 2021) recast the problem as bounded distance
decoding with a predicate: they enumerate or sieve many short vectors and
test each with a cheap check of the candidate key, which breaks what had
been called the "lattice barrier" and handles leaks below what plain BKZ
can. [Chapter 15](15-Lattices-as-a-Weapon.md) shows the hidden number
problem alongside the other uses of lattices as an attack tool.

**Proofs.** Boneh and Venkatesan's algorithm needed about
$\sqrt{\log n}$ known bits per sample. Nguyen and Shparlinski proved that,
for DSA and ECDSA, $O(\log \log n)$ known bits from each of $O(\log n)$
signatures suffice, under assumptions about how the multipliers $t_i$ are
distributed; for ECDSA they needed bounds on exponential sums over
elliptic curves to show that the values $r/s$ are spread out enough. These
are guarantees with constants no attacker uses; real attacks are tuned by
experiment.

**Nonces in multi-party signatures.** When several parties produce one
Schnorr signature, each contributes a nonce, and the danger moves from
"is my $k$ random" to "can the others choose theirs after seeing mine".
The ROS attack of Fabrice Benhamouda, Tancrède Lepoint, Julian Loss,
Michele Orrù and Mariana Raykova (EUROCRYPT 2021) solved the ROS problem
in polynomial time when enough sessions run concurrently, breaking
two-round multi-signatures and blind Schnorr signatures that let an
attacker open many sessions at once. MuSig2 and FROST answer by having
each signer commit to two nonces and combining them with a hash of all
commitments. A deterministic nonce is not safe in a multi-party protocol,
since another party can make the honest signer use one nonce with two
different challenges; MuSig-DN needed a zero-knowledge proof to make it
work.

**Why the equation is linear.** All the algebraic attacks here exploit
that $s$ is linear in $k$ and $d$. Signature schemes have been designed to
avoid it (hash-based signatures have no such equation at all, and lattice
signatures such as ML-DSA keep the linear form $z = y + cs$ but reject any
output that would leak the mask $y$), but within the
discrete-log family, the forking lemma proof of Schnorr's security (book 1,
[§14.10](../../book/14-Discrete-Log-Systems.md)) *depends* on the linearity:
the security proof rewinds the signer to get two equations in one nonce,
which is exactly the attack of §14.2 run inside a proof. The nonce attacks
and the proof of security are the same algebra seen from two sides.

## Check yourself

??? question "1. Two ECDSA signatures by the same key have the same $r$. What does an attacker need besides the two signatures to compute the private key?"

    The two message hashes $h_1$ and $h_2$ (so it must know what was
    signed), and the public key only to confirm the answer. Then
    $k = (h_1 - h_2)/(s_1 - s_2)$ and $d = (s_1 k - h_1)/r$ mod $n$. It never
    needs $k$ from $r$, which would be a discrete logarithm.

??? question "2. On the toy curve of §14.3, the same key ($d = 11$, $k = 10$, $r = 7$) signs $h_3 = 9$. What is $s_3$, and recover $k$ from signatures 1 and 3."

    $s_3 = 2 \cdot (9 + 77) \bmod 19 = 172 \bmod 19 = 1$. From signatures 1 and
    3: $k = (4 - 9)/(10 - 1) = -5 \cdot 9^{-1}$. The inverse of 9 mod 19 is
    17, and $-5 \cdot 17 = -85 \equiv 10 \pmod{19}$, so $k = 10$, as
    expected.

??? question "3. A Schnorr signer uses the same $k$ for two messages. Write the key in terms of the two signatures."

    $s_1 = k + e_1 d$ and $s_2 = k + e_2 d$, so $d = (s_1 - s_2)/(e_1 - e_2)
    \bmod n$, where $e_i = H(R, m_i)$ are computable from the public data.

??? question "4. A wallet's nonces are $k_1, k_1 + 1, k_1 + 2, \ldots$. Is this safer than repeating $k_1$?"

    No. Two signatures with $k_2 = k_1 + 1$ give $s_1 k_1 - r_1 d = h_1$ and
    $s_2 (k_1 + 1) - r_2 d = h_2$: two linear equations in $k_1$ and $d$,
    solved directly. Any known relation between nonces is as bad as a
    repeat; only the attacker's work to spot it differs (the $r$ values no
    longer match, so it must guess the relation).

??? question "5. Why did the PS3 key survive firmware updates?"

    The public keys that checked the earliest boot stages were fixed in
    code the console never updates (part of it in read-only memory or in a
    loader that cannot be replaced). Sony could change keys for later
    stages in new firmware, but every console already sold would keep
    trusting code signed with the leaked keys.

??? question "6. Each nonce on a 256-bit curve has its top 4 bits equal to zero. What is the information lower bound on the number of signatures, and what dimension is the lattice of §14.6 with 80 signatures?"

    Each signature gives 4 bits, so at least $256/4 = 64$ signatures, plus
    some margin. With 80 signatures the lattice has dimension $m + 1 = 81$
    (one coordinate per nonce, plus the embedding).

??? question "7. Why does an RFC 6979 signer resist the PS3 and Android failures but not Minerva?"

    PS3 and Android were failures of the random generator; RFC 6979 does
    not use one, and its nonce is a secret, uniform function of key and
    message. Minerva is a timing leak in computing $kG$; however $k$ was
    chosen, the scalar multiplication still took time that depended on its
    length. Only constant-time code fixes that.

??? question "8. In the fault attack on Ed25519, why does checking the signature before releasing it help, and why does hedging help more?"

    The faulty signature satisfies $S'B = R + h'A$, not $R + hA$, so it fails
    verification and is never released; the attacker gets only correct
    signatures, which add nothing. But verification can be skipped or
    faulted too. Hedging gives each run a fresh nonce, so even two released
    signatures of the same message, one faulty, have different nonces and
    give three unknowns in two equations.

??? question "9. Given a valid ECDSA signature $(r, s)$ on a Bitcoin transaction, what can a relay do without the key, why did that matter, and how did SegWit fix it?"

    It can broadcast $(r, n - s)$ (or a re-encoded DER), which is valid for
    the same transaction but changes its ID, because the ID hashed the
    signature. Software that tracked payments by ID could think a payment
    failed. SegWit moved signatures out of the hashed data, so the ID no
    longer depends on them.

??? question "10. A leak tells the attacker the top bit of each nonce, correctly 75 percent of the time. Why can the lattice method not use this directly, and what can?"

    The lattice needs every selected nonce to lie in the bounded interval;
    one wrong sample puts the target vector off the lattice's short
    region and the reduction fails. A probabilistic bit is a bias, which
    Bleichenbacher's Fourier method measures statistically over many
    samples, as LadderLeak did.

## What you learned

- A DSA, ECDSA or Schnorr signature is one linear equation in two secrets,
  the key and the nonce. Any second equation in the same nonce, or any
  knowledge of it, gives the key with arithmetic mod $n$.
- A repeated nonce shows itself as a repeated $r$, and scanners find it
  automatically. Sony's PS3 used one fixed nonce (2010); Bitcoin and
  Ethereum keys have been harvested from repeats, small nonces and nonce
  patterns since 2013.
- Partial knowledge is enough. The hidden number problem turns a few known
  bits per nonce into a short vector in a lattice of dimension about the
  number of signatures; LLL finds it, and recentering the nonces gains a
  bit per signature.
- Timing and cache leaks of the nonce's length or top bit broke certified
  cards and TPMs (Minerva, TPM-Fail, 2019) and OpenSSL with less than one
  bit (LadderLeak, 2020), the last through Bleichenbacher's Fourier method.
- Deterministic nonces (RFC 6979, EdDSA) remove the random generator and
  its failures, including a backdoored one like Dual_EC_DRBG, but turn a
  single fault into a key recovery. Hedged signing and verify-before-release
  close that gap.
- ECDSA is malleable: $(r, n - s)$ is valid whenever $(r, s)$ is. Bitcoin
  answered with strict DER (BIP 66), low $s$ and SegWit; the lesson is
  never to identify data by its signature.
- A safe signer today: derived and hedged nonces, exactly uniform, constant
  time, verified before release, strict encodings and strict verification.

**Next:** [Chapter 15](15-Lattices-as-a-Weapon.md) takes the lattice used
here and turns it on knapsacks, RSA through Coppersmith's method, and the
early lattice cryptosystems.

## Further reading

- Taher ElGamal, "A Public Key Cryptosystem and a Signature Scheme Based on
  Discrete Logarithms" (IEEE Transactions on Information Theory, 1985).
- Dan Boneh and Ramarathnam Venkatesan, "Hardness of Computing the Most
  Significant Bits of Secret Keys in Diffie-Hellman and Related Schemes"
  (CRYPTO 1996).
- Nick Howgrave-Graham and Nigel Smart, "Lattice Attacks on Digital
  Signature Schemes" (Designs, Codes and Cryptography, 2001).
- Phong Nguyen and Igor Shparlinski, "The Insecurity of the Digital
  Signature Algorithm with Partially Known Nonces" (Journal of Cryptology,
  2002) and "The Insecurity of the Elliptic Curve Digital Signature
  Algorithm with Partially Known Nonces" (Designs, Codes and Cryptography,
  2003).
- Daniel Bleichenbacher, "On the Generation of One-Time Keys in DL
  Signature Schemes" (presentation at the IEEE P1363 working group, 2000),
  the DSA bias and the Fourier method.
- fail0verflow (bushing, marcan, sven), "Console Hacking 2010: PS3 Epic
  Fail" (27th Chaos Communication Congress, Berlin, December 2010).
- Billy Bob Brumley and Nicola Tuveri, "Remote Timing Attacks Are Still
  Practical" (ESORICS 2011).
- Naomi Benger, Joop van de Pol, Nigel Smart and Yuval Yarom, "Ooh Aah...
  Just a Little Bit: A Small Amount of Side Channel Can Go a Long Way"
  (CHES 2014).
- Christian Decker and Roger Wattenhofer, "Bitcoin Transaction
  Malleability and MtGox" (ESORICS 2014).
- Joachim Breitner and Nadia Heninger, "Biased Nonce Sense: Lattice Attacks
  against Weak ECDSA Signatures in Cryptocurrencies" (Financial
  Cryptography 2019).
- Keegan Ryan, "Return of the Hidden Number Problem" (IACR Transactions on
  Cryptographic Hardware and Embedded Systems, 2019).
- Jan Jančár, Vladimír Sedláček, Petr Švenda and Marek Sýs, "Minerva: The
  Curse of ECDSA Nonces" (TCHES 2020, CHES 2020).
- Daniel Moghimi, Berk Sunar, Thomas Eisenbarth and Nadia Heninger,
  "TPM-FAIL: TPM meets Timing and Lattice Attacks" (USENIX Security 2020).
- Diego Aranha, Felipe Rodrigues Novaes, Akira Takahashi, Mehdi Tibouchi
  and Yuval Yarom, "LadderLeak: Breaking ECDSA with Less than One Bit of
  Nonce Leakage" (ACM CCS 2020).
- Martin Albrecht and Nadia Heninger, "On Bounded Distance Decoding with
  Predicate: Breaking the 'Lattice Barrier' for the Hidden Number Problem"
  (EUROCRYPT 2021).
- Yolan Romailler and Sylvain Pelissier, "Practical Fault Attack against
  the Ed25519 and EdDSA Signature Schemes" (FDTC 2017).
- Christopher Ambrose, Joppe Bos, Björn Fay, Marc Joye, Manfred Lochter and
  Bruce Murray, "Differential Attacks on Deterministic Signatures" (CT-RSA
  2018).
- Damian Poddebniak, Juraj Somorovsky, Sebastian Schinzel, Manfred Lochter
  and Paul Rösler, "Attacking Deterministic Signature Schemes using Fault
  Attacks" (IEEE EuroS&P 2018).
- Marco Macchetti, Nils Amiet and colleagues (Kudelski Security),
  "Polynonce: A Tale of a Novel ECDSA Attack and Bitcoin Tears" (2023) and
  the DEF CON 31 talk.
- Fabrice Benhamouda, Tancrède Lepoint, Julian Loss, Michele Orrù and
  Mariana Raykova, "On the (in)Security of ROS" (EUROCRYPT 2021).
- Daniel J. Bernstein, Niels Duif, Tanja Lange, Peter Schwabe and Bo-Yin
  Yang, "High-Speed High-Security Signatures" (CHES 2011), the Ed25519
  paper.
- Pieter Wuille, BIP 62 "Dealing with malleability" (2014) and BIP 66
  "Strict DER signatures" (2015); BIP 141 "Segregated Witness" (2015,
  activated 2017); BIP 340 "Schnorr Signatures for secp256k1" (2020).
- Standards: FIPS 186-4 (2013) and FIPS 186-5 (2023), the Digital
  Signature Standard; SP 800-90A (random bit generation; revision 1, 2015,
  without Dual_EC_DRBG); RFC 6979 (deterministic DSA and ECDSA, 2013);
  RFC 8032 (EdDSA, 2017).
