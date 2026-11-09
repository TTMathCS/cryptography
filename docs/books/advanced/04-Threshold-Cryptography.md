# 4. Threshold Cryptography and Shared Randomness

*A key held by one person is a key that one person can lose, sell or be forced to
use. This chapter splits keys so that they are used without ever being put back
together: any $t$ of $n$ holders decrypt a message or sign a document, and fewer
learn nothing. You will decrypt with shared ElGamal keys and sign with shared RSA
keys, generate a key that nobody ever knew, sign a Schnorr signature with two of
three shares and check it with the ordinary verifier, forge a joint signature
through a rogue key and then block the forgery, and see why threshold ECDSA, the
version everyone wanted, became the one that kept breaking. The second half turns
the same tools to randomness: verifiable random functions, public beacons run by a
dozen organizations at once, and a housing lottery on Mars that nobody can rig.*

!!! abstract "In this chapter"
    **You will learn:**

    - how threshold decryption and threshold signing work, and why the linear
      schemes (ElGamal, Schnorr, BLS) split easily while RSA and ECDSA do not;
    - how Shoup's threshold RSA gets around an unknown $\varphi(n)$;
    - how distributed key generation makes a key nobody ever held, how an attacker
      can bias Pedersen's version, and how Gennaro, Jarecki, Krawczyk and Rabin
      fixed it;
    - how FROST (RFC 9591) signs in two rounds and why each signer commits to two
      nonces;
    - what a rogue-key attack is, and how MuSig and MuSig2 stop it;
    - why threshold ECDSA needs homomorphic encryption and zero-knowledge proofs,
      and how the TSSHOCK and BitForge attacks of 2023 pulled whole keys out of
      wallets that skipped them;
    - what verifiable random functions (RFC 9381) and randomness beacons are, how
      drand and Algorand use them, and how to run a lottery that nobody can bias.

    **You need:** [Chapter 2](02-Secret-Sharing.md) (Shamir sharing, Lagrange
    interpolation, Feldman and Pedersen verifiable sharing), Schnorr signatures
    from book 1, [Chapter 14](../../book/14-Discrete-Log-Systems.md), and RSA from
    [Chapter 13](../../book/13-RSA.md). The proofs that partial results are correct
    are Chaum-Pedersen proofs, taught in
    [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md); here they are used, not
    re-derived. Book 1's [Chapter 23](../../book/23-Advanced-Protocols.md) gives a
    one-section summary of this whole chapter.

    **Levels:** §4.1 and §4.2 are for beginners; §4.3 to §4.7 and §4.9 to §4.12 are
    intermediate; §4.8 and §4.13 are expert.

## 4.1 The problem

*Level: beginner.*

In 1987 Yvo Desmedt asked a question that sounds like office politics. A company
receives a message encrypted to "the company". Who decrypts it? If one manager
holds the private key, then the company's secrets are as safe as that manager's
honesty, health and laptop. If every manager holds a copy, the company has as many
weak points as managers. What the company wants is a rule, such as "any three of
the five directors together", and cryptography that enforces the rule by itself.
Desmedt called this **group-oriented cryptography**. Two years later, with Yair
Frankel, he gave the first working answer for ElGamal decryption, and the field
took the name **threshold cryptography**.

Secret sharing, the subject of [Chapter 2](02-Secret-Sharing.md), solves half the
problem. Adi Shamir's scheme of 1979 splits a key $x$ into shares $x_1, \dots, x_n$
so that any $t$ of them rebuild $x$ and fewer reveal nothing. That protects the key
in storage. But to use the key, someone collects $t$ shares and rebuilds it, and at
that moment the key exists, whole, in one computer's memory. A thief who controls
that computer at that moment gets everything. A key that is rebuilt every day is
not really split.

Threshold cryptography asks for more: the holders compute **with** their shares.
Each one does a small calculation on its own share, sends the result, and anyone
can combine $t$ results into the decrypted message or the signature. The key itself
is never rebuilt, not even for an instant. From the outside, nothing looks unusual:
the public key is one ordinary public key, and the signature is one ordinary
signature that any standard verifier accepts. The verifier cannot even tell that a
group made it.

This turns out to be easy for some schemes and very hard for others, and the
difference is a single word: **linear**. Shamir shares combine by a weighted sum,
$x = \sum \lambda_i x_i$, where the $\lambda_i$ are the Lagrange coefficients of
[Chapter 2](02-Secret-Sharing.md). If the private operation uses $x$ only in a
linear way, each holder can apply it to its own share and the results combine by
the same weights. ElGamal decryption raises a number to the power $x$; Schnorr
signing adds $c \cdot x$ to a nonce; BLS signing multiplies a point by $x$. All
three are linear in $x$, and all three split cleanly. RSA works modulo
$\varphi(n)$, a number nobody may know, so the weights cannot be computed.
ECDSA multiplies the key by the inverse of a secret nonce, and products of secrets
are not linear at all. Both can be done, but the cost and the history of mistakes
are very different, and this chapter tells both.

There is a second, quieter problem in the same family: **shared randomness**. A
lottery, a jury draw, the choice of which validator writes the next block of a
ledger: each needs a random number that nobody could predict and nobody could
steer. If one party draws it, everyone else must trust that party. If each party
contributes a piece, the last one to speak can often look at the others and decide
whether to speak at all. The tools that solve this are the same as for threshold
signatures: a signature that is **unique** (only one valid signature exists for a
given key and message) is a random-looking number that its signer could not have
chosen. Spread the key across many holders and you have a public coin that nobody
controls. The second half of the chapter builds one, and §4.11 uses it to allocate
new homes in Arcadia City.

Figure 4.1 shows the forty years of ideas this chapter covers.

<figure class="mars-fig">
<svg viewBox="0 0 640 466" width="640" role="img" aria-label="Timeline of threshold cryptography from secret sharing in 1979 to NIST's call for threshold schemes in 2026" fill="currentColor" font-size="14">
<line x1="72" y1="10" x2="72" y2="456" stroke="currentColor" stroke-width="1.6"/>
<text x="60" y="27" text-anchor="end" font-weight="bold">1979</text>
<circle cx="72" cy="22" r="3.5"/>
<text x="86" y="27">Shamir and Blakley: secret sharing</text>
<text x="60" y="53" text-anchor="end" font-weight="bold">1987</text>
<circle cx="72" cy="48" r="3.5"/>
<text x="86" y="53">Desmedt: group-oriented cryptography</text>
<text x="60" y="79" text-anchor="end" font-weight="bold">1989</text>
<circle cx="72" cy="74" r="3.5"/>
<text x="86" y="79">Desmedt and Frankel: threshold ElGamal decryption</text>
<text x="60" y="105" text-anchor="end" font-weight="bold">1991</text>
<circle cx="72" cy="100" r="3.5"/>
<text x="86" y="105">Pedersen: distributed key generation without a dealer</text>
<text x="60" y="131" text-anchor="end" font-weight="bold">1996</text>
<circle cx="72" cy="126" r="3.5"/>
<text x="86" y="131">Gennaro, Jarecki, Krawczyk, Rabin: threshold DSS</text>
<text x="60" y="157" text-anchor="end" font-weight="bold">1999</text>
<circle cx="72" cy="152" r="3.5"/>
<text x="86" y="157">GJKR fix Pedersen's DKG; Micali, Rabin, Vadhan: VRFs</text>
<text x="60" y="183" text-anchor="end" font-weight="bold">2000</text>
<circle cx="72" cy="178" r="3.5"/>
<text x="86" y="183">Shoup: practical threshold RSA</text>
<text x="60" y="209" text-anchor="end" font-weight="bold">2001</text>
<circle cx="72" cy="204" r="3.5"/>
<text x="86" y="209">Boneh, Lynn, Shacham: BLS signatures</text>
<text x="60" y="235" text-anchor="end" font-weight="bold">2017</text>
<circle cx="72" cy="230" r="3.5"/>
<text x="86" y="235">Algorand: committees chosen by VRF sortition</text>
<text x="60" y="261" text-anchor="end" font-weight="bold">2018</text>
<circle cx="72" cy="256" r="3.5"/>
<text x="86" y="261">GG18 threshold ECDSA; MuSig</text>
<text x="60" y="287" text-anchor="end" font-weight="bold">2019</text>
<circle cx="72" cy="282" r="3.5"/>
<text x="86" y="287">League of Entropy launches drand; two-round attacks</text>
<text x="60" y="313" text-anchor="end" font-weight="bold">2020</text>
<circle cx="72" cy="308" r="3.5"/>
<text x="86" y="313">FROST; Ethereum's beacon chain aggregates BLS</text>
<text x="60" y="339" text-anchor="end" font-weight="bold">2021</text>
<circle cx="72" cy="334" r="3.5"/>
<text x="86" y="339">MuSig2; Bitcoin's Taproot activates</text>
<text x="60" y="365" text-anchor="end" font-weight="bold">2023</text>
<circle cx="72" cy="360" r="5"/>
<text x="86" y="365" font-weight="bold">TSSHOCK and BitForge break threshold ECDSA wallets</text>
<text x="60" y="391" text-anchor="end" font-weight="bold">2023</text>
<circle cx="72" cy="386" r="3.5"/>
<text x="86" y="391">RFC 9381 (VRFs); NIST's threshold call drafted</text>
<text x="60" y="417" text-anchor="end" font-weight="bold">2024</text>
<circle cx="72" cy="412" r="3.5"/>
<text x="86" y="417">RFC 9591 standardizes FROST</text>
<text x="60" y="443" text-anchor="end" font-weight="bold">2026</text>
<circle cx="72" cy="438" r="3.5"/>
<text x="86" y="443">NIST publishes its first call for threshold schemes</text>
</svg>
<figcaption>Figure 4.1. Threshold cryptography from secret sharing to standards. The linear schemes (ElGamal, Schnorr, BLS) reached practice first; threshold ECDSA came last and broke most often.</figcaption>
</figure>

A word on the threat model, because it decides everything that follows. A
**semi-honest** holder follows the protocol but tries to learn more than it should
from what it sees. A **malicious** holder sends whatever helps it: wrong shares,
wrong partial results, results timed to depend on what others sent. The schemes in
this chapter aim to be secure against up to $t - 1$ malicious holders, and each
one says what happens when someone misbehaves. Some can detect a bad partial result
and carry on with others (**robust**); some can name the cheater but must restart
(**identifiable abort**); some can only stop. [Chapter 1](01-Computing-With-Secrets.md)
explains these models in general; here they become concrete.

## 4.2 Threshold decryption with ElGamal

*Level: beginner.*

### The idea

ElGamal encryption, from book 1's [Chapter 14](../../book/14-Discrete-Log-Systems.md),
works in a group of prime order $q$ with generator $g$. The private key is $x$, the
public key is $y = g^x$. To encrypt a message $m$ (a group element), pick a random
$r$ and send

$$
c_1 = g^r, \qquad c_2 = m \cdot y^r .
$$

To decrypt, compute $K = c_1^x = g^{rx} = y^r$ and divide: $m = c_2 / K$.

The only step that uses $x$ is $c_1^x$. Suppose $x$ has been split with Shamir's
scheme, so that for any set $S$ of $t$ holders,

$$
x = \sum_{i \in S} \lambda_i x_i \pmod q ,
$$

with Lagrange coefficients $\lambda_i = \prod_{j \in S, j \ne i} \frac{j}{j - i}$
computed mod $q$. Each holder computes its **partial decryption** $d_i = c_1^{x_i}$
and publishes it. Then

$$
\prod_{i \in S} d_i^{\lambda_i} = \prod_{i \in S} c_1^{\lambda_i x_i}
= c_1^{\sum \lambda_i x_i} = c_1^{x} = K .
$$

The sum that would rebuild $x$ happens **in the exponent**, where nobody can see
it. Nobody computes $x$; the combiner computes $K$ directly. This trick,
interpolation in the exponent, is the engine of the whole chapter.

### By hand: 2 of 3, mod 47

We use the group of order $q = 23$ inside the numbers mod $p = 47$. Since
$47 = 2 \cdot 23 + 1$, the squares mod 47 form a group of prime order 23, and
$g = 2$ is a square ($2 \equiv 7^2 = 49$), so it generates that group. Every
example in this chapter uses this group by hand; real systems use 256-bit elliptic
curves.

1. **Key and shares.** The dealer picks $x = 9$ and the line $f(i) = 9 + 4i \bmod 23$.
   The shares are $x_1 = 13$, $x_2 = 17$, $x_3 = 21$. The public key is
   $y = 2^9 \bmod 47 = 512 - 470 = 42$.
2. **Encrypt.** The message is $m = 3$ (a square: $2^{19} \equiv 3$). With $r = 5$:
   $c_1 = 2^5 = 32$, and $y^r = 42^5 \bmod 47 = 24$, so $c_2 = 3 \cdot 24 = 72 \equiv 25$.
   The ciphertext is $(32, 25)$.
3. **Partial decryptions.** Holders 2 and 3 decrypt. Holder 2 sends
   $d_2 = 32^{17} \bmod 47 = 18$; holder 3 sends $d_3 = 32^{21} \bmod 47 = 14$.
4. **Weights.** For $S = \{2, 3\}$: $\lambda_2 = \frac{3}{3 - 2} = 3$ and
   $\lambda_3 = \frac{2}{2 - 3} = -2 \equiv 21 \pmod{23}$. (Check: $3 \cdot 17 - 2 \cdot 21 = 9 = x$.)
5. **Combine.** $K = 18^3 \cdot 14^{21} \bmod 47 = 4 \cdot 6 = 24$. That is $y^r$, as it
   should be.
6. **Recover.** $K^{-1} = 2$ (since $24 \cdot 2 = 48 \equiv 1$), and
   $m = 25 \cdot 2 = 50 \equiv 3$.

Holders 2 and 3 never told each other their shares, and the number 9 was never
written down after the dealer threw it away. Figure 4.2 shows the flow.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Threshold ElGamal decryption: the ciphertext goes to holders 2 and 3, each returns a partial decryption, the combiner multiplies them with Lagrange weights and recovers the message" fill="currentColor" font-size="14">
<rect x="20" y="120" width="130" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="143" text-anchor="middle" font-weight="bold">ciphertext</text>
<text x="85" y="164" text-anchor="middle">(c₁, c₂) = (32, 25)</text>
<rect x="250" y="30" width="150" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="54" text-anchor="middle" font-weight="bold">holder 2, x₂ = 17</text>
<text x="325" y="77" text-anchor="middle">d₂ = 32¹⁷ = 18</text>
<rect x="250" y="204" width="150" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="228" text-anchor="middle" font-weight="bold">holder 3, x₃ = 21</text>
<text x="325" y="251" text-anchor="middle">d₃ = 32²¹ = 14</text>
<rect x="250" y="122" width="150" height="52" rx="6" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<text x="325" y="145" text-anchor="middle" opacity="0.7">holder 1, x₁ = 13</text>
<text x="325" y="164" text-anchor="middle" opacity="0.7">not needed</text>
<line x1="150" y1="135" x2="244" y2="66" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,62 241,64 246,71"/>
<line x1="150" y1="160" x2="244" y2="230" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,234 246,225 241,232"/>
<rect x="462" y="110" width="168" height="76" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="546" y="133" text-anchor="middle" font-weight="bold">combiner</text>
<text x="546" y="155" text-anchor="middle">K = 18³ · 14²¹ = 24</text>
<text x="546" y="176" text-anchor="middle">m = 25 / 24 = 3</text>
<line x1="400" y1="61" x2="456" y2="122" stroke="currentColor" stroke-width="1.5"/>
<polygon points="462,128 458,119 452,125"/>
<line x1="400" y1="235" x2="456" y2="174" stroke="currentColor" stroke-width="1.5"/>
<polygon points="462,168 452,171 458,177"/>
<text x="440" y="74" text-anchor="middle" font-size="13">weight 3</text>
<text x="440" y="232" text-anchor="middle" font-size="13">weight 21</text>
</svg>
<figcaption>Figure 4.2. Threshold ElGamal decryption with the numbers of the hand example. Each holder raises c₁ to its own share; the combiner weights the results and gets K = c₁ˣ without anyone knowing x = 9.</figcaption>
</figure>

### Code it

The code repeats the hand example, then runs a 3-of-5 decryption in a 127-bit
group, a toy size chosen so the numbers print on one line. Real deployments use
256-bit elliptic curves. The module `random` is fine for a demonstration; real
keys and nonces come from `secrets`.

```python
import random
random.seed(4)                          # random is for the demo; real keys come from secrets

def lagrange_at_0(i, S, q):             # the weight of share i when the set S rebuilds f(0)
    num = den = 1
    for j in S:
        if j != i:
            num, den = num * j % q, den * (j - i) % q
    return num * pow(den, -1, q) % q

def share(secret, t, n, q):             # Shamir: a random polynomial of degree t - 1 through (0, secret)
    coef = [secret] + [random.randrange(q) for _ in range(t - 1)]
    return {i: sum(a * i**k for k, a in enumerate(coef)) % q for i in range(1, n + 1)}

def decrypt(c1, c2, partials, p, q):    # combine partial decryptions c1^{x_i} in the exponent
    K = 1
    for i, d in partials.items():
        K = K * pow(d, lagrange_at_0(i, partials, q), p) % p
    return c2 * pow(K, -1, p) % p

# the hand example: p = 47, q = 23, g = 2, x = 9, shares 13, 17, 21
p, q, g = 47, 23, 2
x_sh = {1: 13, 2: 17, 3: 21}
y = pow(g, 9, p)
c1, c2 = pow(g, 5, p), 3 * pow(y, 5, p) % p
partials = {i: pow(c1, x_sh[i], p) for i in (2, 3)}
print("hand:", (c1, c2), partials, decrypt(c1, c2, partials, p, q))

# a 127-bit safe prime: toy size (real systems use 256-bit elliptic curves)
p = 2**127 - 2721
q, g = (p - 1) // 2, 4
x = random.randrange(1, q)
x_sh = share(x, 3, 5, q)               # 3 of 5 trustees
y = pow(g, x, p)
del x                                   # the dealer forgets the key
m = pow(123456789, 2, p)                # a message encoded as a square, so it lies in the group
r = random.randrange(1, q)
c1, c2 = pow(g, r, p), m * pow(y, r, p) % p
for S in [(1, 2, 3), (2, 4, 5), (1, 3, 5)]:
    partials = {i: pow(c1, x_sh[i], p) for i in S}
    print(S, decrypt(c1, c2, partials, p, q) == m)
partials = {i: pow(c1, x_sh[i], p) for i in (1, 2)}
print("two trustees:", decrypt(c1, c2, partials, p, q) == m)
```

```text
hand: (32, 25) {2: 18, 3: 14} 3
(1, 2, 3) True
(2, 4, 5) True
(1, 3, 5) True
two trustees: False
```

Any three of the five trustees decrypt; two get a wrong answer that tells them
nothing. The number $p = 2^{127} - 2721$ was chosen because both $p$ and
$(p - 1)/2$ are prime, so the squares mod $p$ form a group of prime order, the
same structure as the mod-47 example at a size where discrete logarithms are no
longer a pencil exercise (though still far too small for real use).

### Break it: a holder who lies

The combiner above trusts every $d_i$. A malicious holder can send a random number
instead, and the combined $K$ is then wrong in a way nobody can detect from the
output alone: the "message" that comes out is garbage, and nobody knows whose fault
it is. Worse, in a voting system ([Chapter 16](16-Electronic-Voting.md)) a wrong
tally could look plausible.

The fix is to make each partial result checkable. Every holder's **verification
key** $Y_i = g^{x_i}$ is published at setup; with Feldman's commitments from
[Chapter 2](02-Secret-Sharing.md), anyone can compute it from the public
commitments. A correct partial decryption satisfies

$$
\log_g Y_i = \log_{c_1} d_i = x_i ,
$$

two discrete logarithms that are equal. The holder attaches a **Chaum-Pedersen
proof** of exactly that statement: a three-move proof, made non-interactive with a
hash, that convinces anyone the two exponents are the same without revealing
$x_i$. [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) builds this proof from
the Schnorr proof and codes it; §4.9 and §4.11 below use it as a black box. With
the proofs, the combiner throws away bad partial results and uses any $t$ good
ones, so the scheme is robust: up to $t - 1$ liars cannot stop it or corrupt it,
provided at least $t$ honest holders answer.

### Where it is used

Threshold ElGamal is the decryption step of most verifiable voting systems:
Helios, ElectionGuard and the systems of [Chapter 16](16-Electronic-Voting.md)
encrypt every ballot to a key held by several trustees, add the ballots
homomorphically, and have the trustees jointly decrypt only the final tally. No
single trustee can decrypt an individual ballot. The same pattern guards escrowed
data, and it is how the threshold beacon of §4.11 is built, with a twist that
makes the output a signature rather than a plaintext.

!!! note "Life story: threshold ElGamal decryption"
    **Born:** 1989, Yvo Desmedt and Yair Frankel, "Threshold cryptosystems"
    (CRYPTO '89), after Desmedt's 1987 proposal of group-oriented cryptography ·
    **Purpose:** let any $t$ of $n$ holders decrypt without rebuilding the key ·
    **Helped:** verifiable elections (Helios, ElectionGuard), key escrow with
    several custodians, threshold coin tossing (Cachin, Kursawe and Shoup, 2000) ·
    **Status:** current; the textbook example of interpolation in the exponent

## 4.3 Threshold RSA

*Level: intermediate.*

### Why RSA resists

An RSA signature on a message representative $x$ is $x^d \bmod n$, where
$de \equiv 1$ modulo $\varphi(n)$ or the smaller $\lambda(n)$ (book 1,
[Chapter 13](../../book/13-RSA.md)). Splitting $d$ looks easy: share it with
Shamir's scheme, let each holder compute $x^{d_i}$, and combine in the exponent as
in §4.2. The trouble is the Lagrange weights. The shares live modulo $\varphi(n)$,
so the weights $\lambda_i = \prod j/(j - i)$ must be computed modulo $\varphi(n)$,
which means dividing by $j - i$ modulo a number that must stay secret, because
knowing $\varphi(n)$ is the same as knowing the factors of $n$. Worse, $\varphi(n)$
is even, so $2 = j - i$ for neighboring holders has no inverse at all.

Early answers in the late 1980s and 1990s (Colin Boyd; Desmedt and Frankel;
Frankel, Gemmell, MacKenzie and Yung; Gennaro, Jarecki, Krawczyk and Rabin) worked
around this with extra rounds of interaction, restrictions on the group of
holders, or proofs that were heavy to run. In 2000 Victor Shoup, then at IBM's
Zurich laboratory, published a scheme that needs no interaction between holders at
all: each one sends a single number with a proof, and anyone combines. It became
the standard reference for threshold RSA.

### Shoup's scheme

Shoup's trick has three parts.

- **Safe primes.** The modulus is $n = pq$ with $p = 2p' + 1$ and $q = 2q' + 1$,
  where $p'$ and $q'$ are prime. Then the squares mod $n$ form a cyclic group of
  order $m = p'q'$, a number with no small factors. The dealer computes
  $d = e^{-1} \bmod m$ and shares $d$ with a polynomial $f$ of degree $t - 1$
  modulo $m$: $s_i = f(i)$.
- **Clear the denominators.** With $\ell$ holders, let $\Delta = \ell!$. For a set
  $S$ of $t$ holders, the scaled weights
  $$
  \lambda^S_{0,j} = \Delta \prod_{j' \in S,\, j' \ne j} \frac{0 - j'}{j - j'}
  $$
  are **ordinary integers**, because $\ell!$ is divisible by every product of the
  differences. They satisfy $\sum_{j \in S} \lambda^S_{0,j} s_j \equiv \Delta d \pmod m$
  without anyone needing to know $m$.
- **Fix the extra factor at the end.** Holder $i$ sends the signature share
  $x_i = x^{2 \Delta s_i} \bmod n$. The combiner computes
  $$
  w = \prod_{j \in S} x_j^{2 \lambda^S_{0,j}} = x^{4 \Delta^2 d} ,
  $$
  so $w^e = x^{4\Delta^2}$. That is not yet a signature, since the exponent should
  be 1. But $e$ is a prime larger than $\ell$, so $\gcd(e, 4\Delta^2) = 1$, and the
  extended Euclidean algorithm gives integers $a, b$ with $a \cdot 4\Delta^2 + b e = 1$.
  Then $y = w^a x^b$ satisfies
  $$
  y^e = (w^e)^a \, x^{be} = x^{4\Delta^2 a + be} = x .
  $$

The factors of 2 put every value into the group of squares, whose order $m$ is the
modulus the shares were made with. The factor $\Delta$ makes the weights integers.
The final Euclid step, which uses only public numbers, removes the leftover power.

### By hand: 2 of 3 with n = 253

Take $p' = 5$ and $q' = 11$, so $p = 11$, $q = 23$, $n = 253$ and $m = 55$. With three
holders, $e$ must be a prime larger than 3; take $e = 7$. Then $d = 8$, since
$7 \cdot 8 = 56 \equiv 1 \pmod{55}$. The dealer shares $d$ with
$f(X) = 8 + 13X \bmod 55$, so $s_1 = 21$, $s_2 = 34$, $s_3 = 47$. Here $\Delta = 3! = 6$.

The message representative is $x = 101$ (in practice a hash of the message).

1. **Shares.** Holder 1 sends $x_1 = 101^{2 \cdot 6 \cdot 21} = 101^{252} \bmod 253 = 202$.
   Holder 3 sends $x_3 = 101^{564} \bmod 253 = 16$.
2. **Integer weights for $S = \{1, 3\}$.** $\lambda_{0,1} = 6 \cdot \frac{-3}{1 - 3} = 9$
   and $\lambda_{0,3} = 6 \cdot \frac{-1}{3 - 1} = -3$. Check:
   $9 \cdot 21 - 3 \cdot 47 = 48 = 6 \cdot 8 = \Delta d$.
3. **Combine.** $w = 202^{18} \cdot 16^{-6} \bmod 253 = 75 \cdot 75 \bmod 253 = 59$.
   Indeed $59^7 \equiv 170 \equiv 101^{144} = x^{4\Delta^2}$.
4. **Euclid.** $4\Delta^2 = 144$, and $2 \cdot 144 - 41 \cdot 7 = 1$, so $a = 2$, $b = -41$.
5. **Signature.** $y = 59^2 \cdot 101^{-41} \bmod 253 = 192 \cdot 39 \bmod 253 = 151$.
6. **Verify.** $151^7 \bmod 253 = 101$. It is an ordinary RSA signature.

In fact $151 = 101^{63} \bmod 253$, where $63 = 7^{-1} \bmod \lambda(253) = 110$: exactly the
signature a single holder of the whole key would have produced. RSA signatures
(with a deterministic encoding) are unique, so every set of holders arrives at the
same number.

### Code it

```python
import hashlib, random
from math import factorial
random.seed(2000)                       # random is for the demo; real keys come from secrets

def egcd(a, b):                         # returns (g, u, v) with u*a + v*b = g
    if b == 0:
        return a, 1, 0
    g, u, v = egcd(b, a % b)
    return g, v, u - (a // b) * v

def deal(pp, qq, e, t, n_players):      # Shoup's dealer: p = 2p'+1, q = 2q'+1, shares of d mod m = p'q'
    n, m = (2 * pp + 1) * (2 * qq + 1), pp * qq
    d = pow(e, -1, m)
    coef = [d] + [random.randrange(m) for _ in range(t - 1)]
    return n, {i: sum(a * i**k for k, a in enumerate(coef)) % m for i in range(1, n_players + 1)}

def sign_share(x, s_i, n, delta):       # each player's share: x^(2 * delta * s_i) mod n
    return pow(x, 2 * delta * s_i, n)

def combine(x, parts, n, e, delta):     # integer Lagrange weights (times delta), then the Bezout step
    w = 1
    for i, x_i in parts.items():
        lam = delta
        for j in parts:
            if j != i:
                lam = lam * (0 - j) // (i - j)   # exact: delta = l! clears every denominator
        w = w * pow(x_i, 2 * lam, n) % n
    g, a, b = egcd(4 * delta * delta, e)          # a * 4 delta^2 + b * e = 1
    return pow(w, a, n) * pow(x, b, n) % n

# the hand example: p' = 5, q' = 11, n = 253, e = 7, d = 8, f(X) = 8 + 13X mod 55
n, e, delta, x = 253, 7, factorial(3), 101
s = {1: 21, 2: 34, 3: 47}
parts = {i: sign_share(x, s[i], n, delta) for i in (1, 3)}
y = combine(x, parts, n, e, delta)
print("hand:", parts, y, pow(y, e, n) == x)

# 3 of 5 with p' = 1019, q' = 1031 (toy size: real moduli have 2048 bits or more)
e = 65537
n, s = deal(1019, 1031, e, 3, 5)
delta = factorial(5)
x = int.from_bytes(hashlib.sha256(b"open the north airlock").digest(), "big") % n
for S in [(1, 2, 3), (2, 4, 5)]:
    y = combine(x, {i: sign_share(x, s[i], n, delta) for i in S}, n, e, delta)
    print(S, y, pow(y, e, n) == x)
```

```text
hand: {1: 202, 3: 16} 151 True
(1, 2, 3) 2365373 True
(2, 4, 5) 2365373 True
```

Two different groups of three signed and got the same signature, 2365373, which
verifies with the plain RSA check $y^e \equiv x$. Python's `pow` with a negative
exponent computes a modular inverse (Python 3.8 and later), which is why
$16^{-6}$ and $101^{-41}$ need no special code.

### What the scheme still needs

**A proof with each share.** As with ElGamal, a wrong $x_i$ spoils the result.
Shoup's paper has each holder prove, with a Chaum-Pedersen style proof in the
group of squares mod $n$, that $\log_{x^{4\Delta}} x_i^2 = \log_v v_i$, where $v$ is
a public square and $v_i = v^{s_i}$ is holder $i$'s published verification key. The
combiner discards shares whose proofs fail, which makes the scheme robust with an
honest majority.

**A dealer, or an expensive alternative.** Shoup's dealer knows $p$ and $q$ and
therefore the whole key. Generating an RSA modulus jointly, so that nobody learns
its factors, is possible (Dan Boneh and Matthew Franklin showed how in 1997) but
slow: the parties must test random shared candidates for primality without seeing
them, and most candidates fail. Doing it with safe primes is slower still, which is
one reason later work (Damgård and Koprowski, 2001, among others) relaxed the
safe-prime requirement.

**Why it is rare in practice.** Threshold RSA works and has been implemented in
libraries and research systems, but the expensive key generation
and 2048-bit or larger operations lost out, once Schnorr-type signatures became
standard, to the threshold schemes of §4.5 and §4.7, whose keys can be generated
jointly in a few rounds.

!!! note "Life story: Shoup's threshold RSA"
    **Born:** 2000, Victor Shoup, "Practical Threshold Signatures" (EUROCRYPT
    2000), after a decade of interactive schemes · **Purpose:** threshold RSA
    signatures with no interaction between holders, robust against a minority of
    cheaters, provably secure in the random oracle model · **Helped:** the standard
    reference design for threshold RSA in research and in open-source threshold
    libraries; its $\Delta = \ell!$ trick reappears wherever shares live modulo a
    secret number · **Status:** current but niche; most new threshold systems
    choose Schnorr, EdDSA or BLS keys instead

## 4.4 Distributed key generation

*Level: intermediate.*

### The dealer problem

Every scheme so far starts with a dealer who picks $x$, computes the shares and
then forgets $x$. "Forgets" is doing a lot of work in that sentence. The dealer
could keep a copy; its machine could be compromised during the few seconds when the
key existed; a court could later demand it. For a key that is supposed to belong to
a group, a trusted dealer is a single point of failure placed exactly where the
scheme was meant to remove one.

**Distributed key generation** (DKG) removes the dealer. The holders run a protocol
at the end of which each holds a share $x_j$ of a key $x$, everyone knows the public
key $y = g^x$, and nobody, at any point, knew $x$.

### Pedersen's protocol

In 1991 Torben Pedersen, then at Aarhus University, proposed the obvious idea and
made it work: **every holder is a dealer**. Each deals a Feldman-verifiable sharing
of its own random secret, and the group's key is the sum of all the secrets.

<div class="mars-steps" markdown>

1. Each holder $i$ picks a random polynomial
   $f_i(X) = a_{i0} + a_{i1} X + \dots + a_{i,t-1} X^{t-1}$ mod $q$ and broadcasts the
   Feldman commitments $A_{ik} = g^{a_{ik}}$.
2. Holder $i$ sends each holder $j$, privately, the share $s_{ij} = f_i(j)$.
3. Holder $j$ checks every share it received:
   $g^{s_{ij}} = \prod_k A_{ik}^{\,j^k}$. If a check fails, $j$ broadcasts a complaint
   against $i$, and $i$ must answer by publishing $s_{ij}$; a holder that fails to
   answer, or answers with a share that still fails, is disqualified.
4. The holders that remain form the set QUAL. Each holder's share of the key is
   $x_j = \sum_{i \in \text{QUAL}} s_{ij}$, and the public key is
   $y = \prod_{i \in \text{QUAL}} A_{i0}$.

</div>

The key is $x = \sum_{i \in \text{QUAL}} a_{i0}$, the sum of everyone's constant terms.
It is shared by the polynomial $F = \sum f_i$, since $x_j = F(j)$ and $F(0) = x$. Each
holder knows one term of the sum and nobody knows the total. As long as one holder
in QUAL chose its $a_{i0}$ honestly at random, $x$ is unknown to all.

### By hand: three holders, threshold 2, mod 47

Same group as before ($p = 47$, $q = 23$, $g = 2$). The three holders pick lines:

| Holder | Polynomial mod 23 | Commitments $g^{a_{i0}}, g^{a_{i1}}$ | Sends to 1, 2, 3 |
|---|---|---|---|
| 1 | $3 + 5X$ | $2^3 = 8$, $2^5 = 32$ | 8, 13, 18 |
| 2 | $10 + 2X$ | $2^{10} = 37$, $2^2 = 4$ | 12, 14, 16 |
| 3 | $7 + 11X$ | $2^7 = 34$, $2^{11} = 27$ | 18, 6, 17 |

Holder 2 checks the share 13 it got from holder 1: $2^{13} \bmod 47 = 14$, and
$A_{10} \cdot A_{11}^2 = 8 \cdot 32^2 = 8 \cdot 37 = 296 \equiv 14$. The share fits the
commitments. Every other check passes the same way.

Each holder adds the column of shares it received:

- $x_1 = 8 + 12 + 18 = 38 \equiv 15$,
- $x_2 = 13 + 14 + 6 = 33 \equiv 10$,
- $x_3 = 18 + 16 + 17 = 51 \equiv 5$.

The public key is $y = 8 \cdot 37 \cdot 34 \bmod 47 = 6$. The secret behind it is
$3 + 10 + 7 = 20$, and indeed $2^{20} \bmod 47 = 6$, but nobody in the protocol ever
added those three numbers. The shares lie on the line $F(X) = 20 + 18X \bmod 23$
(check: $F(1) = 38 \equiv 15$), the sum of the three lines. Each holder also learns
the others' **verification keys** $Y_j = g^{x_j}$, computable from the public
commitments: $Y_1 = 2^{15} = 9$, $Y_2 = 2^{10} = 37$, $Y_3 = 2^5 = 32$. These shares
are used to sign in §4.5. Figure 4.3 shows the pattern.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Pedersen distributed key generation: a three by three grid of shares, each row dealt by one holder, each column summed by one holder into its key share" fill="currentColor" font-size="14">
<text x="320" y="22" text-anchor="middle" font-weight="bold">each row is one dealer's line; each column is one holder's sum</text>
<text x="200" y="58" text-anchor="middle">to holder 1</text>
<text x="320" y="58" text-anchor="middle">to holder 2</text>
<text x="440" y="58" text-anchor="middle">to holder 3</text>
<text x="80" y="98" text-anchor="middle">1: 3 + 5X</text>
<text x="80" y="148" text-anchor="middle">2: 10 + 2X</text>
<text x="80" y="198" text-anchor="middle">3: 7 + 11X</text>
<rect x="165" y="75" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="200" y="98" text-anchor="middle">8</text>
<rect x="285" y="75" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="98" text-anchor="middle">13</text>
<rect x="405" y="75" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="440" y="98" text-anchor="middle">18</text>
<rect x="165" y="125" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="200" y="148" text-anchor="middle">12</text>
<rect x="285" y="125" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="148" text-anchor="middle">14</text>
<rect x="405" y="125" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="440" y="148" text-anchor="middle">16</text>
<rect x="165" y="175" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="200" y="198" text-anchor="middle">18</text>
<rect x="285" y="175" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="198" text-anchor="middle">6</text>
<rect x="405" y="175" width="70" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="440" y="198" text-anchor="middle">17</text>
<line x1="150" y1="226" x2="490" y2="226" stroke="currentColor" stroke-width="1.5"/>
<text x="200" y="252" text-anchor="middle" font-weight="bold">x₁ = 15</text>
<text x="320" y="252" text-anchor="middle" font-weight="bold">x₂ = 10</text>
<text x="440" y="252" text-anchor="middle" font-weight="bold">x₃ = 5</text>
<text x="565" y="98" text-anchor="middle">g³ = 8</text>
<text x="565" y="148" text-anchor="middle">g¹⁰ = 37</text>
<text x="565" y="198" text-anchor="middle">g⁷ = 34</text>
<text x="565" y="252" text-anchor="middle" font-weight="bold">y = 6</text>
<text x="320" y="286" text-anchor="middle" font-size="13">the key 3 + 10 + 7 = 20 is never added up by anyone; only y = 8 · 37 · 34 = 6 is</text>
</svg>
<figcaption>Figure 4.3. Pedersen's distributed key generation with the hand-example numbers (all sums mod 23, products mod 47). The right column shows each dealer's public commitment to its constant term; their product is the group key.</figcaption>
</figure>

### Break it: biasing the key

Pedersen's protocol looks airtight, and for a decade it was used as if it were. In
1999 Rosario Gennaro, Stanisław Jarecki, Hugo Krawczyk and Tal Rabin pointed out a
flaw: **the key is not uniformly random**, because a cheater can choose between
keys.

The problem is timing. The commitments $A_{i0}$, and so the candidate public key,
are visible in the first round. Disqualification happens later. Suppose Mallory
controls two of the holders, and she waits until the honest holders have broadcast
their commitments (in a real network the last to speak always can; such a player
is called **rushing**). She now knows two candidate public keys: one with her
second holder's contribution and one without it. If she likes the first, she plays
honestly. If she prefers the second, her second holder sends a bad share to an
honest holder, ignores the complaint, and gets itself disqualified. Either way the
protocol completes normally, and the key is the one Mallory picked.

She cannot choose the key outright, but she can choose one bit of it, or any
property she can test, with probability $3/4$ instead of $1/2$. The code makes her
want an even public key.

```python
import random
random.seed(1999)                       # random is for the demo; real keys come from secrets
p = 2**127 - 2721                       # toy-size safe prime; q = (p - 1) / 2 is prime too
q, g = (p - 1) // 2, 4

def run(rig):
    # parties 1 and 2 are honest; Mallory runs parties 3 and 4 and speaks last
    A = {i: pow(g, random.randrange(q), p) for i in (1, 2, 3, 4)}   # each g^{a_i0}
    keep = A[1] * A[2] * A[3] % p                                    # key without party 4
    both = keep * A[4] % p                                           # key with party 4
    if not rig:
        return both
    # Mallory wants an even public key. If including party 4 gives one, she plays fair;
    # if not, party 4 sends a bad share, an honest party complains, and party 4 is disqualified.
    return both if both % 2 == 0 else keep

for rig in (False, True):
    even = sum(run(rig) % 2 == 0 for _ in range(20000))
    print("rigged" if rig else "honest", even / 20000)
```

```text
honest 0.4993
rigged 0.7465
```

A quarter of a bit of bias sounds harmless, and for some uses it is: Gennaro,
Jarecki, Krawczyk and Rabin showed in 2003 that Pedersen's DKG is still good enough
for threshold Schnorr signatures, whose security proof can absorb the bias. But a
security proof that assumes a uniformly random key no longer applies, and the
attack generalizes: with more corrupted holders Mallory gets more choices. For a
key whose outputs are meant to be random, such as the beacon of §4.11, any
steering is unacceptable.

### Fix it: commit first, reveal later

The 1999 paper's protocol (often called **GJKR**) splits the work into two phases
so that the key is settled before anything about it can be seen.

1. **Phase 1, hidden.** Each holder deals its secret with **Pedersen's verifiable
   secret sharing** ([Chapter 2](02-Secret-Sharing.md)), whose commitments
   $C_{ik} = g^{a_{ik}} h^{b_{ik}}$ use a second generator $h$ with unknown
   $\log_g h$. These commitments are perfectly hiding: they reveal nothing about
   $a_{i0}$, so nothing about the eventual key. Complaints are handled as before,
   and QUAL is fixed at the end of this phase.
2. **Phase 2, revealed.** Only now does each holder in QUAL publish the Feldman
   values $A_{ik} = g^{a_{ik}}$, which the others check against the shares they
   already hold. If a holder in QUAL refuses or publishes wrong values, it is not
   dropped. Its sharing was already verified in phase 1, so the honest holders
   pool their shares of its polynomial, rebuild its $a_{i0}$ in public, and
   include it anyway.

By the time anyone could compute a candidate public key, the set of contributions
is final and none can be withdrawn. The cost is one more round and double the
commitments. GJKR proved the resulting key uniformly random as long as fewer than
half the holders are corrupt.

### Practical details

Real DKGs add a few more pieces. Each dealer attaches a **proof of knowledge** of
its $a_{i0}$ (a Schnorr proof, [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)),
so that nobody can choose $A_{i0}$ as a function of others' commitments, a rogue
key of the kind §4.6 attacks; Komlo and Goldberg's FROST paper does exactly this.
Every share index must be checked to be nonzero and distinct, because a share at
$X = 0$ is the secret itself; in 2021 Trail of Bits found threshold libraries that
did not check, a bug told in the mathematics book's
[Chapter 11](../mathematics/11-Polynomials-at-Work.md). The private channels of
step 2 need authenticated encryption, and the broadcast of step 1 must really be a
broadcast: if Mallory can send different commitments to different holders, the
checks prove nothing. Many real deployments run DKG on top of a consensus protocol
or a public bulletin board for exactly this reason. Finally, shares can be
refreshed later without changing the key (proactive refresh, Chapter 2), so that a
thief must steal $t$ shares within one refresh period.

!!! note "Life story: distributed key generation"
    **Born:** 1991, Torben Pedersen, "A threshold cryptosystem without a trusted
    party" (EUROCRYPT '91); repaired in 1999 by Gennaro, Jarecki, Krawczyk and Rabin,
    "Secure distributed key generation for discrete-log based cryptosystems"
    (EUROCRYPT '99; *Journal of Cryptology*, 2007) · **Purpose:** a shared key that
    nobody ever held, without a dealer · **Helped:** threshold signing services,
    the League of Entropy's beacon, Ethereum distributed validators, FROST
    deployments · **Status:** current; Pedersen's version is still used where its
    bias does not matter, GJKR-style two-phase versions where it does

## 4.5 Threshold Schnorr and FROST

*Level: intermediate.*

### Schnorr splits cleanly

A Schnorr signature (book 1, [Chapter 14](../../book/14-Discrete-Log-Systems.md))
on a message $m$ under the key $Y = g^x$ is a pair $(R, z)$ with

$$
R = g^k, \qquad c = H(R, Y, m), \qquad z = k + c\,x \pmod q ,
$$

and anyone checks $g^z = R \cdot Y^c$. Everything that touches $x$ is linear. So if
each signer $i$ in a set $S$ picks its own nonce $k_i$ and publishes $R_i = g^{k_i}$,
the group commitment is $R = \prod R_i$, and each signer answers

$$
z_i = k_i + c\,\lambda_i x_i \pmod q .
$$

The sum is $\sum z_i = \sum k_i + c \sum \lambda_i x_i = k + c\,x$, an ordinary
Schnorr answer for the nonce $k = \sum k_i$ and the key $x$. Nobody knows $k$ or $x$.
Book 1's [Chapter 23](../../book/23-Advanced-Protocols.md) works this simple version
by hand. It is correct, and it is insecure, for a reason that took the field until
2019 to pin down.

### Break it: nonces chosen too late

Somebody has to publish their $R_i$ last. In a single signing session that matters
little. But signing services run many sessions at once, and an attacker who
controls one signer can open, say, 100 sessions with the honest signers, collect all
their $R_i$ values, and only then choose its own. Each session's challenge
$c = H(R, Y, m)$ depends on the attacker's choice. With enough sessions the attacker
can pick its nonces and messages so that a combination of the honest signers'
answers, $\sum_s \alpha_s z^{(s)}$, is a valid answer for a message nobody agreed to
sign. Finding the right combination is an instance of what is called the **ROS
problem** (Random inhomogeneities in an Overdetermined Solvable system of linear
equations). Manu Drijvers and colleagues showed in 2019, using David Wagner's
generalized birthday algorithm, that it was practical against several two-round
multisignature and threshold schemes then in use; Fabrice Benhamouda, Tancrède Lepoint, Julian Loss, Michele Orrù and
Mariana Raykova showed in 2021 that ROS can be solved in polynomial time once
there are more sessions than the bit length of $q$. The mechanics belong to the
cryptanalysis book's
[Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md); the lesson
here is that a signer must never let its nonce be combined with values chosen
after it.

The classical cure is an extra round: every signer first publishes a hash
commitment to $R_i$ ([Chapter 3](03-Commitments.md)), and only after all commitments
are in does anyone reveal. That works and costs a round trip, which for signers
spread across data centers, or across planets, is the expensive part.

### FROST: two nonces and a binding factor

Chelsea Komlo and Ian Goldberg, at the University of Waterloo, published **FROST**
(Flexible Round-Optimized Schnorr Threshold signatures) in 2020. It keeps two
rounds, and the first can be done ahead of time, before the message is known.

<div class="mars-steps" markdown>

1. **Round 1 (preprocessing).** Each signer $i$ picks two secret nonces $d_i, e_i$
   and publishes the commitments $D_i = g^{d_i}$ and $E_i = g^{e_i}$. A signer can
   publish a whole batch of such pairs in advance, each to be used once.
2. **Round 2 (signing).** The coordinator chooses the signing set $S$ and sends
   each signer the message $m$ and the list $B$ of everyone's $(i, D_i, E_i)$.
   Each signer computes, for every $j \in S$, the **binding factor**
   $\rho_j = H(Y, m, B, j)$, then
   $$
   R = \prod_{j \in S} D_j \, E_j^{\rho_j}, \qquad c = H(R, Y, m),
   $$
   and answers $z_i = d_i + e_i \rho_i + \lambda_i x_i c \pmod q$, then deletes
   $d_i$ and $e_i$.
3. **Aggregate.** The coordinator checks each answer against the signer's
   verification key, $g^{z_i} = D_i E_i^{\rho_i} Y_i^{\lambda_i c}$, and outputs
   $(R, z)$ with $z = \sum z_i$.

</div>

Why does a second nonce help? Each signer's effective nonce is
$k_i = d_i + e_i \rho_i$, and $\rho_i$ is a hash of the message and of **every**
commitment in the list. The attacker in the ROS attack needed to adjust its
contribution to $R$ after seeing the honest ones while the honest signers'
effective nonces stayed fixed. In FROST, any change the attacker makes to its own
$D, E$ or to the message changes every $\rho_j$, and so changes every honest
signer's effective nonce in a way the attacker cannot predict. The linear system
the attacker wanted to solve keeps moving under its feet. Komlo and Goldberg proved
FROST secure under the discrete-logarithm assumption in the random oracle model;
later work by Bellare, Crites, Komlo, Maller, Tessaro and Zhu (2022) gave tighter
proofs.

### By hand: holders 1 and 2 sign with their DKG shares

We reuse the shares made by the DKG in §4.4: $x_1 = 15$, $x_2 = 10$, public key
$Y = 6$, verification keys $Y_1 = 9$ and $Y_2 = 37$. The hashes are replaced by small
stand-in values so the arithmetic stays visible; the code does it with real hashes.

1. **Weights for $S = \{1, 2\}$.** $\lambda_1 = \frac{2}{2 - 1} = 2$,
   $\lambda_2 = \frac{1}{1 - 2} = -1 \equiv 22$. Check: $2 \cdot 15 - 10 = 20$, the key
   nobody knows.
2. **Round 1.** Holder 1 picks $d_1 = 6$, $e_1 = 15$ and publishes $D_1 = 2^6 = 17$,
   $E_1 = 2^{15} = 9$. Holder 2 picks $d_2 = 12$, $e_2 = 4$ and publishes
   $D_2 = 2^{12} = 7$, $E_2 = 2^4 = 16$.
3. **Binding factors.** Say $\rho_1 = 3$ and $\rho_2 = 7$.
4. **Group commitment.** $R_1 = D_1 E_1^{3} = 17 \cdot 24 = 408 \equiv 32$ and
   $R_2 = D_2 E_2^{7} = 7 \cdot 32 = 224 \equiv 36$, so $R = 32 \cdot 36 \bmod 47 = 24$.
5. **Challenge.** Say $c = 10$.
6. **Answers.** $z_1 = 6 + 15 \cdot 3 + 2 \cdot 15 \cdot 10 = 351 \equiv 6$ and
   $z_2 = 12 + 4 \cdot 7 + 22 \cdot 10 \cdot 10 = 2240 \equiv 9 \pmod{23}$.
7. **Check holder 1's answer.** $g^{z_1} = 2^6 = 17$, and
   $R_1 \cdot Y_1^{\lambda_1 c} = 32 \cdot 9^{20} = 32 \cdot 2 = 64 \equiv 17$. Good.
8. **Signature.** $z = 6 + 9 = 15$, so the signature is $(R, z) = (24, 15)$.
9. **Verify as ordinary Schnorr.** $g^{15} = 9$, and $R \cdot Y^c = 24 \cdot 6^{10} = 24 \cdot 18 = 432 \equiv 9$.

The verifier saw one key, $Y = 6$, and one signature. Figure 4.4 shows the messages.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="FROST message flow between holder 1, the coordinator and holder 2, with the numbers of the hand example" fill="currentColor" font-size="14">
<rect x="20" y="10" width="140" height="32" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="31" text-anchor="middle" font-weight="bold">holder 1</text>
<rect x="250" y="10" width="140" height="32" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="31" text-anchor="middle" font-weight="bold">coordinator</text>
<rect x="480" y="10" width="140" height="32" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="31" text-anchor="middle" font-weight="bold">holder 2</text>
<line x1="90" y1="42" x2="90" y2="370" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="320" y1="42" x2="320" y2="370" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="550" y1="42" x2="550" y2="370" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="90" y1="80" x2="312" y2="80" stroke="currentColor" stroke-width="1.6"/>
<polygon points="320,80 311,76 311,84"/>
<text x="205" y="72" text-anchor="middle" font-size="13">round 1: D₁ = 17, E₁ = 9</text>
<line x1="550" y1="112" x2="328" y2="112" stroke="currentColor" stroke-width="1.6"/>
<polygon points="320,112 329,108 329,116"/>
<text x="435" y="104" text-anchor="middle" font-size="13">D₂ = 7, E₂ = 16</text>
<text x="320" y="146" text-anchor="middle" font-size="13" font-style="italic">(can happen long before the message)</text>
<line x1="320" y1="182" x2="98" y2="182" stroke="currentColor" stroke-width="1.6"/>
<polygon points="90,182 99,178 99,186"/>
<text x="205" y="174" text-anchor="middle" font-size="13">m and the list B</text>
<line x1="320" y1="182" x2="542" y2="182" stroke="currentColor" stroke-width="1.6"/>
<polygon points="550,182 541,178 541,186"/>
<text x="435" y="174" text-anchor="middle" font-size="13">m and the list B</text>
<text x="90" y="214" text-anchor="middle" font-size="13">ρ, R = 24, c = 10</text>
<text x="550" y="214" text-anchor="middle" font-size="13">ρ, R = 24, c = 10</text>
<line x1="90" y1="250" x2="312" y2="250" stroke="currentColor" stroke-width="2.4"/>
<polygon points="320,250 311,246 311,254"/>
<text x="205" y="242" text-anchor="middle" font-size="13">round 2: z₁ = 6</text>
<line x1="550" y1="282" x2="328" y2="282" stroke="currentColor" stroke-width="2.4"/>
<polygon points="320,282 329,278 329,286"/>
<text x="435" y="274" text-anchor="middle" font-size="13">z₂ = 9</text>
<rect x="215" y="306" width="210" height="52" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="328" text-anchor="middle" font-size="13">check each zᵢ, add them</text>
<text x="320" y="348" text-anchor="middle" font-size="13" font-weight="bold">signature (24, 15)</text>
</svg>
<figcaption>Figure 4.4. FROST with the hand-example numbers. Round 1 can be done in advance; the binding factors ρ computed in round 2 tie each signer's nonces to this message and this list of commitments.</figcaption>
</figure>

### Code it: a key from DKG, a signature from two of three

The code runs a full Pedersen DKG (with the Feldman checks of §4.4), then FROST
signing by holders 1 and 3, with real hash-derived binding factors and challenge,
and finally checks the result with a `schnorr_verify` function that knows nothing
about shares. The group is the 127-bit toy group; RFC 9591 runs on Ed25519,
ristretto255, Ed448, P-256 or secp256k1.

```python
import hashlib, random
random.seed(9591)                       # random is for the demo; real nonces come from secrets
p = 2**127 - 2721                       # toy-size safe prime; real FROST uses Ed25519 or ristretto255
q, g = (p - 1) // 2, 4
T, N = 2, 3                             # 2 of 3

def H(tag, *parts):                     # hash to a number mod q, with a label per use
    data = tag.encode() + repr(parts).encode()
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

def lagrange_at_0(i, S):
    num = den = 1
    for j in S:
        if j != i:
            num, den = num * j % q, den * (j - i) % q
    return num * pow(den, -1, q) % q

def schnorr_verify(Y, msg, R, z):       # the ordinary Schnorr check: knows nothing about shares
    return pow(g, z, p) == R * pow(Y, H("chal", R, Y, msg), p) % p

# distributed key generation: every party deals Feldman shares of its own secret
poly = {i: [random.randrange(q) for _ in range(T)] for i in range(1, N + 1)}
commit = {i: [pow(g, a, p) for a in poly[i]] for i in poly}          # broadcast
sent = {(i, j): sum(a * j**k for k, a in enumerate(poly[i])) % q for i in poly for j in poly}
for (i, j), s in sent.items():          # party j checks the share it got from party i
    assert pow(g, s, p) == commit[i][0] * pow(commit[i][1], j, p) % p
x = {j: sum(sent[i, j] for i in poly) % q for j in poly}               # j's share of the key
Y = 1
for i in poly:
    Y = Y * commit[i][0] % p            # the group key: nobody knows its secret
Yi = {j: pow(g, x[j], p) for j in x}    # public verification shares

# FROST signing by parties 1 and 3
msg, S = "release 40 tonnes of water to District 2", (1, 3)
nonces = {i: (random.randrange(1, q), random.randrange(1, q)) for i in S}          # round 1
B = tuple((i, pow(g, d, p), pow(g, e, p)) for i, (d, e) in sorted(nonces.items()))
rho = {i: H("rho", Y, msg, B, i) for i in S}
R = 1
for i, D, E in B:
    R = R * D * pow(E, rho[i], p) % p
c = H("chal", R, Y, msg)
z = {}
for i in S:                                                                        # round 2
    d, e = nonces.pop(i)                # use once, then forget
    z[i] = (d + e * rho[i] + lagrange_at_0(i, S) * x[i] * c) % q
for i, D, E in B:                       # the coordinator checks each share before adding
    assert pow(g, z[i], p) == D * pow(E, rho[i], p) * pow(Yi[i], lagrange_at_0(i, S) * c, p) % p
sig = (R, sum(z.values()) % q)
print("signature verifies:", schnorr_verify(Y, msg, *sig))
print("other message:", schnorr_verify(Y, "release 400 tonnes", *sig))
```

```text
signature verifies: True
other message: False
```

### What FROST does not do

**It does not tolerate a silent signer.** If one member of $S$ never answers in
round 2, the signature cannot be finished, and the coordinator must start again
with a different set. A wrong $z_i$ is caught by the per-signer check and its
sender identified, but a refusal looks the same as a network failure. Tim Ruffing,
Viktoria Ronge, Elliott Jin, Jonas Schneider-Bensch and Dominique Schröder's
**ROAST** (2022) wraps FROST to keep trying different subsets concurrently, so that
an honest set eventually finishes even if some signers stall forever.

**It does not specify key generation.** RFC 9591 describes a trusted-dealer setup
in an appendix and leaves distributed key generation to other documents; in
practice a Pedersen-style DKG with proofs of knowledge, as in the code, is common.

**It does not forgive nonce reuse.** If a signer answers two different signing
requests with the same pair $(d_i, e_i)$, the binding factors and challenges
differ, and a few such answers give linear equations from which its share $x_i$
falls out. RFC 9591 generates nonces from fresh randomness mixed with the secret
share and requires each pair to be deleted after one use. The general mechanics of
nonce reuse are in the cryptanalysis book's
[Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md).

### In the real world

RFC 9591, *The Flexible Round-Optimized Schnorr Threshold (FROST) Protocol for
Two-Round Schnorr Signatures*, by Deirdre Connolly, Chelsea Komlo, Ian Goldberg and
Christopher Wood, was published by the IRTF's Crypto Forum Research Group in June
2024. Its Ed25519 and Ed448 ciphersuites produce signatures that any RFC 8032
verifier accepts, so a FROST group can sign software updates, certificates or
transactions for systems that have never heard of threshold signatures. The
Zcash Foundation maintains an implementation, and Zcash's ZIP 312 (a draft at the
time of writing) adapts FROST to shielded spends. Several Bitcoin wallet projects
use or are standardizing FROST over secp256k1 for Taproot keys. For the general
case, the reference page
[Threshold signatures](../../11-advanced/Threshold-Signatures.md) keeps a short
current list.

!!! note "Life story: FROST"
    **Born:** 2020, Chelsea Komlo and Ian Goldberg, University of Waterloo
    ("FROST: Flexible Round-Optimized Schnorr Threshold Signatures", SAC 2020) ·
    **Purpose:** threshold Schnorr signatures in two rounds, the first done in
    advance, secure against concurrent sessions where single-nonce schemes fall to
    the ROS attack · **Helped:** RFC 9591 (June 2024) with five ciphersuites;
    threshold wallets, Zcash (ZIP 312), signing services whose output any
    Ed25519 verifier accepts · **Status:** current; the default choice for new
    threshold signing

## 4.6 Multisignatures, rogue keys and MuSig2

*Level: intermediate.*

### Many keys, one signature

A threshold signature has one key split into shares. A **multisignature** starts
from the other end: $n$ people each have their own ordinary key pair, and they want
one compact signature that proves all of them signed. Bitcoin had multisignatures
from its early years in a clumsy form: a script listing all the public keys and requiring
that many separate signatures, all stored on the ledger and visible to everyone.
Schnorr signatures suggest something better: add the keys into one aggregate key,
add the signatures into one signature, and put on the ledger a single key and a
single signature that look like everyone else's.

The naive version is the threshold scheme of §4.5 with all weights equal to 1. Each
signer $i$ has $X_i = g^{x_i}$. The aggregate key is $X = \prod X_i$, the signers
publish $R_i$, $R = \prod R_i$, $c = H(R, X, m)$, $z_i = k_i + c\,x_i$, and $z = \sum z_i$
verifies against $X$. It works. It is also broken, in a way that has nothing to do
with nonces.

### Break it: the rogue key

Alice publishes her key $X_A$. Mallory, who will "co-sign" with her, publishes her
own key only afterwards, and she chooses it as

$$
X_M = g^{m} \cdot X_A^{-1}
$$

for an $m$ she knows. She does not know the discrete logarithm of $X_M$, but she
does not need it: the aggregate key is $X_A X_M = g^{m}$, whose secret she holds
outright. Mallory can now sign anything "on behalf of Alice and Mallory", alone.

By hand in the mod-47 group: Alice's key is $X_A = 2^7 = 34$. Mallory takes $m = 5$
and publishes $X_M = 2^5 \cdot 34^{-1} = 32 \cdot 18 = 576 \equiv 12$. The aggregate is
$34 \cdot 12 = 408 \equiv 32 = 2^5$. Mallory signs with the secret 5. Figure 4.5 draws
the cancellation.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Rogue-key attack: Mallory's published key is g to the m divided by Alice's key, so the product of the two keys is g to the m, which Mallory controls" fill="currentColor" font-size="14">
<rect x="20" y="40" width="170" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="64" text-anchor="middle" font-weight="bold">Alice publishes</text>
<text x="105" y="86" text-anchor="middle">X_A = g⁷ = 34</text>
<rect x="20" y="150" width="170" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="174" text-anchor="middle" font-weight="bold">Mallory publishes</text>
<text x="105" y="196" text-anchor="middle">X_M = g⁵ / X_A = 12</text>
<line x1="190" y1="70" x2="300" y2="115" stroke="currentColor" stroke-width="1.5"/>
<polygon points="306,118 299,110 296,118"/>
<line x1="190" y1="180" x2="300" y2="135" stroke="currentColor" stroke-width="1.5"/>
<polygon points="306,132 296,132 299,140"/>
<rect x="306" y="95" width="150" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="381" y="119" text-anchor="middle" font-weight="bold">naive aggregate</text>
<text x="381" y="141" text-anchor="middle">34 · 12 = 32 = g⁵</text>
<line x1="456" y1="125" x2="494" y2="125" stroke="currentColor" stroke-width="1.5"/>
<polygon points="502,125 493,121 493,129"/>
<rect x="502" y="85" width="128" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="566" y="111" text-anchor="middle" font-weight="bold">Mallory</text>
<text x="566" y="133" text-anchor="middle">knows 5:</text>
<text x="566" y="153" text-anchor="middle">signs alone</text>
<text x="320" y="236" text-anchor="middle" font-size="13">MuSig weights each key by a hash of all keys: 34⁴ · 12¹⁰ = 21, no longer g⁵</text>
</svg>
<figcaption>Figure 4.5. The rogue-key attack in the mod-47 group. Because Mallory chose her key after seeing Alice's, the two cancel in the product. Hash-derived weights (MuSig) make the cancellation impossible to arrange.</figcaption>
</figure>

### Fix it: three ways

**Proof of possession.** Make every signer prove, when registering a key, that it
knows the secret: typically by signing its own public key. Mallory cannot sign
under $X_M$, so her rogue key is rejected. Thomas Ristenpart and Scott Yilek
analyzed this defense in 2007; Ethereum's validators use it for BLS keys (§4.7). It
needs a registration step that every verifier trusts.

**Key-dependent challenges.** Mihir Bellare and Gregory Neven (2006) gave each
signer its own challenge $c_i = H(L, X_i, R, m)$, where $L$ is the list of all keys,
so that $z = \sum (k_i + c_i x_i)$ and verification checks
$g^z = R \prod X_i^{c_i}$. Secure in the plain public-key model, with no
registration, but the verifier needs every individual key: there is no single
aggregate key that looks like an ordinary one.

**MuSig key aggregation.** Gregory Maxwell, Andrew Poelstra, Yannick Seurin and
Pieter Wuille (2018) combined the two ideas: weight each key by a hash of the
whole list,

$$
a_i = H(L, X_i), \qquad X = \prod_i X_i^{a_i},
$$

and let each signer answer $z_i = k_i + c\,a_i x_i$. The aggregate $X$ is an
ordinary public key, and a verifier who sees only $X$ cannot tell it from a
single-signer key. Mallory's trick now fails: to cancel Alice's key she would need
$X_M^{a_M} = g^m X_A^{-a_A}$, but $a_M$ is a hash of a list that contains $X_M$
itself, so every candidate $X_M$ comes with a new, unpredictable exponent. In the
mod-47 example with stand-in weights $a_A = 4$ and $a_M = 10$, the aggregate is
$34^4 \cdot 12^{10} = 32 \cdot 8 = 256 \equiv 21$, not $2^5$, and Mallory knows no
secret for it.

### MuSig2: two rounds, one in advance

Key aggregation fixes rogue keys, not nonces. The original MuSig proposal had a
two-round variant that fell to the concurrent-session attack of §4.5 (Drijvers and
others, 2019), and the version kept was three rounds: commit to $R_i$, reveal,
answer. Jonas Nick, Tim Ruffing and Yannick Seurin's **MuSig2** (2021) applies the
same idea as FROST: each signer publishes two nonce points $R_{i,1} = g^{r_{i,1}}$,
$R_{i,2} = g^{r_{i,2}}$ in the first round, which can happen before the message is
known. Then

$$
R_1 = \prod_i R_{i,1}, \quad R_2 = \prod_i R_{i,2}, \quad
b = H(X, R_1, R_2, m), \quad R = R_1 R_2^{\,b},
$$

and each signer answers $z_i = r_{i,1} + b\,r_{i,2} + c\,a_i x_i$ with
$c = H(R, X, m)$. The coefficient $b$, a hash of everything, plays the role of
FROST's binding factor. In practice the first round is folded into the previous
signing session, so signing feels like a single round.

### Code it: the forgery, the fix, and an honest MuSig2 signature

```python
import hashlib, random
random.seed(327)                        # random is for the demo; real keys come from secrets
p = 2**127 - 2721                       # toy-size safe prime; Bitcoin uses secp256k1
q, g = (p - 1) // 2, 4

def H(tag, *parts):
    return int.from_bytes(hashlib.sha256(tag.encode() + repr(parts).encode()).digest(), "big") % q

def verify(X, msg, R, s):               # ordinary Schnorr verification
    return pow(g, s, p) == R * pow(X, H("chal", R, X, msg), p) % p

alice = random.randrange(1, q)
XA = pow(g, alice, p)                   # Alice publishes her key first

# Break it: naive aggregation X = XA * XM
m = random.randrange(1, q)
XM = pow(g, m, p) * pow(XA, -1, p) % p  # Mallory's "key": she knows no discrete log for it
X = XA * XM % p                         # ... but X = g^m, and m is hers
msg = "Alice and Mallory agree: Mallory gets apartment 7"
k = random.randrange(1, q)
R = pow(g, k, p)
s = (k + H("chal", R, X, msg) * m) % q  # Mallory signs alone
print("naive joint key, forged:", verify(X, msg, R, s))

# Fix it: MuSig key aggregation, X = XA^aA * XM^aM with aI = H(L, XI)
def agg(keys):
    L = tuple(sorted(keys))
    a = {K: H("coef", L, K) for K in keys}
    X = 1
    for K in keys:
        X = X * pow(K, a[K], p) % p
    return X, a
X, a = agg([XA, XM])
c = H("chal", R, X, msg)
print("MuSig key, same trick:", verify(X, msg, R, (k + c * m) % q))

# MuSig2 signing by Alice and an honest Bob: two nonces each
bob = random.randrange(1, q)
XB = pow(g, bob, p)
X, a = agg([XA, XB])
msg = "Alice and Bob agree"
r = {who: (random.randrange(1, q), random.randrange(1, q)) for who in "AB"}
pts = {who: (pow(g, r1, p), pow(g, r2, p)) for who, (r1, r2) in r.items()}   # round 1, published
R1 = pts["A"][0] * pts["B"][0] % p
R2 = pts["A"][1] * pts["B"][1] % p
b = H("noncecoef", X, R1, R2, msg)
R = R1 * pow(R2, b, p) % p
c = H("chal", R, X, msg)
sA = (r["A"][0] + b * r["A"][1] + c * a[XA] * alice) % q                     # round 2
sB = (r["B"][0] + b * r["B"][1] + c * a[XB] * bob) % q
print("MuSig2 signature:", verify(X, msg, R, (sA + sB) % q))
```

```text
naive joint key, forged: True
MuSig key, same trick: False
MuSig2 signature: True
```

### In the real world

Bitcoin's Taproot upgrade (BIP-340, BIP-341 and BIP-342) activated at block 709,632
on 14 November 2021 and brought Schnorr signatures to Bitcoin. A Taproot output can
be spent with one key, and that key can be a MuSig2 aggregate: on the ledger a
2-of-2 or 5-of-5 spend looks exactly like an ordinary one-person payment, which is
cheaper and reveals less. BIP-327 (2023), by Jonas Nick, Tim Ruffing and Elliott
Jin, specifies MuSig2 for BIP-340 keys, and the secp256k1 library used by Bitcoin
Core added a MuSig2 module in 2024. Lightning Network implementations use MuSig2 for
"simple Taproot channels". How Bitcoin's transactions and scripts work is the
protocols book's [Chapter 19](../protocols/index.md).

A multisignature is $n$-of-$n$; it does not give "any 3 of 5" on its own. For that
you need either a threshold scheme (§4.5) or a script that offers several
aggregate keys, one per allowed subset, hidden in a Taproot tree.

!!! note "Life story: MuSig2"
    **Born:** 2021, Jonas Nick, Tim Ruffing and Yannick Seurin ("MuSig2: Simple
    Two-Round Schnorr Multi-Signatures", CRYPTO 2021), after MuSig (Maxwell,
    Poelstra, Seurin and Wuille, 2018) and the 2019 attacks on two-round schemes ·
    **Purpose:** one ordinary-looking Schnorr key and signature for $n$ signers,
    safe against rogue keys and concurrent sessions, with one round done in
    advance · **Helped:** Taproot multisignature wallets, Lightning channels,
    BIP-327 (2023) · **Status:** current

## 4.7 BLS: signatures that add up

*Level: intermediate.*

Dan Boneh, Ben Lynn and Hovav Shacham's signature of 2001 is the most linear
signature of all. On a pairing-friendly curve, the signature on $m$ under the key
$Y = g^x$ is $\sigma = H(m)^x$ (written $x \cdot H(m)$ in additive notation): a hash
of the message, mapped to the curve, raised to the secret. There is no nonce. To
verify, one checks a **pairing** equation, $e(g, \sigma) = e(Y, H(m))$. What a
pairing is, why it exists on special curves and how the check works is the
mathematics book's [Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md);
the standard library has no pairings, so this section uses BLS without coding it.

Three properties follow, and each one matters here.

- **Threshold BLS needs no rounds.** Holder $i$ sends $\sigma_i = H(m)^{x_i}$, and anyone
  combines $t$ of them: $\sigma = \prod \sigma_i^{\lambda_i}$. It is §4.2's
  interpolation in the exponent again, with no nonces to coordinate. Each partial
  signature can be checked on its own with $e(g, \sigma_i) = e(Y_i, H(m))$. Alexandra
  Boldyreva analyzed this scheme in 2003.
- **BLS signatures are unique.** For a given key and message exactly one valid
  $\sigma$ exists, so every set of $t$ holders produces the same signature. That makes
  the signature itself a random-looking number that nobody could choose, the basis
  of the drand beacon in §4.10.
- **Signatures aggregate.** Signatures by different keys on different messages
  multiply into one, $\sigma = \prod \sigma_i$, checked with
  $e(g, \sigma) = \prod e(Y_i, H(m_i))$. When all sign the same message, the check
  collapses to one pairing against the product of the keys, and the rogue-key attack
  of §4.6 returns in its original form; the mathematics chapter works it in code.
  The defenses are the same: proofs of possession, distinct messages, or MuSig-style
  hash weights (Boneh, Drijvers and Neven, 2018).

The cost is speed (a pairing is many times slower than a Schnorr verification) and
a less settled standard: the IRTF's draft-irtf-cfrg-bls-signature is still an
Internet-Draft, though it is what deployed systems implement.

**In the real world.** Ethereum's beacon chain, launched on 1 December 2020, uses
BLS on the curve BLS12-381 with proofs of possession checked when a validator
deposits: public keys are 48 bytes, signatures 96. Every epoch, every active
validator (about a million of them by 2024, a number that keeps changing) attests
to the chain, and their signatures on the same data
are aggregated so that a block carries one signature per committee instead of one
per validator. "Distributed validators" split one validator's key with threshold
BLS across several machines run by different operators, so one crashed or hacked
machine neither stops the validator nor can make it sign twice. Chia, Filecoin and
the Internet Computer also use BLS signatures, and drand (§4.10) uses threshold BLS
for its beacon.

!!! note "Life story: BLS signatures"
    **Born:** 2001, Dan Boneh, Ben Lynn and Hovav Shacham, "Short Signatures from
    the Weil Pairing" (ASIACRYPT 2001); threshold version analyzed by Boldyreva
    (PKC 2003) · **Purpose:** short, deterministic, unique signatures that
    aggregate and split without interaction · **Helped:** Ethereum's consensus
    (since December 2020), distributed validators, drand, Filecoin, Chia ·
    **Status:** current; IETF specification still a draft; not post-quantum

## 4.8 Threshold ECDSA and how it broke

*Level: expert.*

### Why everyone wanted it

Most of the money in cryptocurrencies sits behind ECDSA keys: Bitcoin before
Taproot, Ethereum accounts, and most other chains. A custodian holding billions for
customers wants those keys never to exist in one place, and the chains will not
change their signature scheme to suit it. So from about 2017 a whole industry of
"MPC wallets" grew up around **threshold ECDSA**.

### Why it is hard

An ECDSA signature (book 1, [Chapter 15](../../book/15-Elliptic-Curves.md)) is
$(r, s)$ with

$$
R = k \cdot G, \qquad r = R_x \bmod q, \qquad s = k^{-1}\,(h + r\,x) \bmod q .
$$

Two secrets are multiplied, $k^{-1}$ and $x$, and one of them is inverted. Shamir
shares add, but the product of two shared values is not the sum of products of
shares, and the inverse of a sum is not the sum of inverses. The parties need a
sub-protocol that turns shares of $a$ and $b$ into shares of $ab$.

The usual tool is called **multiplicative-to-additive** conversion (MtA). Alice
holds $a$, Bob holds $b$, and they want $\alpha + \beta = ab$ with Alice learning only
$\alpha$ and Bob only $\beta$. Alice sends $\mathrm{Enc}(a)$ under her own **Paillier**
key, an additively homomorphic encryption ([Chapter 12](12-Homomorphic-Encryption.md)).
Bob picks a random $\beta$ and computes, using the homomorphism,
$\mathrm{Enc}(a)^b \cdot \mathrm{Enc}(-\beta) = \mathrm{Enc}(ab - \beta)$, and sends it
back. Alice decrypts $\alpha = ab - \beta$. With MtA between every pair of signers,
shares of $k$ and $x$ become shares of $k \gamma$ and $k x$ for a random mask
$\gamma$, from which the parties assemble $R$ and $s$ without anyone learning $k$.

That is the semi-honest picture. Against a malicious party, every message needs a
**zero-knowledge proof**: that Alice's Paillier modulus $N$ is well formed (a product
of two large primes, no small factors), that the values she encrypted are in the
right range, that Bob's answer was computed honestly, that auxiliary parameters
used by the range proofs (the "ring-Pedersen" or $h_1, h_2, \tilde N$ setup) are what
they claim. Leave out a proof, or weaken one, and the arithmetic still produces
valid signatures, every test passes, and a malicious co-signer can quietly read bits
of the honest parties' shares out of the replies.

### The protocols

Philip MacKenzie and Michael Reiter gave two-party DSA in 2001. Yehuda Lindell's
fast two-party ECDSA (CRYPTO 2017, "Lindell17") and Rosario Gennaro and Steven
Goldfeder's $t$-of-$n$ protocol (CCS 2018, "GG18") made it practical; Gennaro and
Goldfeder's 2020 revision ("GG20") moved most of the work before the message is
known and added identifiable abort. Doerner, Kondi, Lee and shelat (2018 and 2019)
built versions on oblivious transfer instead of Paillier. Canetti, Gennaro,
Goldfeder, Makriyannis and Peled (CCS 2020, "CGGMP") gave a protocol proven secure
in the universal-composability model, with key refresh and identifiable abort, and
with every proof spelled out. Implementations of GG18 and GG20, often based on the
open-source tss-lib written for Binance, spread through the industry.

### Break it: the 2023 key extractions

The papers had specified their proofs. The implementations had not always kept
them. In 2021 Dmytro Tymokhanov and Omer Shlomovits ("Alpha-Rays") showed that a
missing range check in GG18/GG20 implementations let one party extract the others'
shares. Two larger disclosures followed in August 2023, both at Black Hat USA.

**TSSHOCK** (Verichains) targeted the proof that the auxiliary range-proof
parameters are well formed, called `dlnproof` in the libraries. That proof is a
Schnorr-style proof with one-bit challenges, sound only if repeated many times
(128 is typical). Verichains found three ways implementations weakened it: an
ambiguous encoding of the values hashed for the Fiat-Shamir challenge, which let
an attacker reshuffle them ("α-shuffle"); a larger challenge space used without the
group-order condition that makes it sound ("c-split"); and simply too few
repetitions ("c-guess"). With a forged proof accepted, one malicious party could
recover the full private key from the honest parties' replies.

**BitForge** (Fireblocks, disclosed on 9 August 2023) found that GG18 and GG20
implementations did not prove that a party's Paillier modulus $N$ has no small
prime factors. An attacker who uses $N$ with many small factors learns the honest
party's share modulo each small factor from its MtA replies, and rebuilds it with
the Chinese remainder theorem: against the most exposed implementations,
Fireblocks reported, 16 signatures sufficed (CVE-2023-33241). A related flaw in Lindell17 implementations'
abort handling leaked the key over a few hundred signing attempts (CVE-2023-33242).
Fireblocks counted more than fifteen affected wallets, blockchains and libraries;
the vendors it named had patched before publication, and no theft through these flaws has been publicly confirmed.
The paper version is Makriyannis, Yomtov and Galansky (2023).

How likely is it to guess a one-bit challenge? The code shows why "c-guess" works:
a cheater who cannot answer both possible challenges guesses each one in advance.

```python
import random
random.seed(2023)                       # random is for the demo

def cheater_passes(rounds):
    # A prover who lacks the secret can prepare an answer for one challenge bit per round,
    # not both. It guesses the bit in advance; one wrong guess and the proof fails.
    return all(random.getrandbits(1) == random.getrandbits(1) for _ in range(rounds))

trials = 200000
for rounds in (1, 2, 4, 8, 16, 128):
    wins = sum(cheater_passes(rounds) for _ in range(trials))
    print(f"{rounds:3d} rounds: cheater passed {wins:6d} of {trials} times, expected {trials / 2**rounds:9.1f}")
```

```text
  1 rounds: cheater passed 100177 of 200000 times, expected  100000.0
  2 rounds: cheater passed  50061 of 200000 times, expected   50000.0
  4 rounds: cheater passed  12603 of 200000 times, expected   12500.0
  8 rounds: cheater passed    812 of 200000 times, expected     781.2
 16 rounds: cheater passed      0 of 200000 times, expected       3.1
128 rounds: cheater passed      0 of 200000 times, expected       0.0
```

A cheater who can retry offline, because the challenge comes from a hash it can
recompute (Fiat-Shamir, [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)), needs
about $2^{r}$ attempts for $r$ rounds: trivial for 16, impossible for 128. The
attacks did not break the mathematics; they found where code stopped short of it.

### Fix it

Use a protocol with complete proofs (CGGMP or its successors), implemented by a
library that has been audited against it, and check every parameter received from
another party: modulus size and structure, ranges, encodings. Better still, where
the target system accepts Schnorr or EdDSA signatures, use FROST: two rounds, no
Paillier, no range proofs. Bitcoin's move to Schnorr signatures in 2021 was partly
about making such schemes possible.

!!! note "Life story: threshold ECDSA (GG18, GG20, CGGMP)"
    **Born:** 2001 (MacKenzie and Reiter, two parties); 2018, Gennaro and Goldfeder
    (GG18, CCS 2018), revised as GG20; CGGMP at CCS 2020 · **Purpose:** threshold
    signatures for the ECDSA keys that guard most cryptocurrency · **Helped:**
    "MPC wallet" custody across the industry, via libraries such as tss-lib ·
    **Status:** in wide use, with a record of implementation flaws (Alpha-Rays 2021,
    TSSHOCK and BitForge 2023); CGGMP-style protocols with all proofs are the
    current recommendation

!!! note "Life story: TSSHOCK"
    **Born:** found by Verichains in audits of open-source threshold ECDSA
    libraries, reported to vendors before publication, presented at Black Hat
    USA on 10 August 2023 · **Purpose:** to show that weakened `dlnproof` checks (α-shuffle,
    c-split, c-guess) let one co-signer extract the whole key · **Helped:** patches
    across several libraries and wallets; a lesson that a proof's iteration count
    and encoding are part of its security · **Status:** fixed in maintained
    libraries; unpatched forks may remain

!!! note "Life story: BitForge"
    **Born:** found by the Fireblocks cryptography research team in May 2023,
    disclosed on 9 August 2023 (CVE-2023-33241 for GG18/GG20, CVE-2023-33242 for
    Lindell17) · **Purpose:** to show that a missing proof about the Paillier
    modulus lets one party read another's key share out of normal signing
    sessions · **Helped:** fixes across more than fifteen affected wallets and libraries; wider
    adoption of the CGGMP proofs · **Status:** patched by the named vendors before
    disclosure

## 4.9 Verifiable random functions

*Level: intermediate.*

### Randomness one party can prove

Turn now from keys to coins. Suppose one party must produce a random-looking
number that everyone can check and that it could not have chosen: a lottery
operator, or a ledger participant claiming it won the right to write the next block.
A keyed hash $H(k, \alpha)$ is random-looking, but nobody without $k$ can check it.
A signature can be checked, but ECDSA and Schnorr signatures use a nonce, so a
signer can produce many valid signatures on the same input and publish the one it
likes.

Silvio Micali, Michael Rabin and Salil Vadhan defined the missing tool in 1999: a
**verifiable random function** (VRF). The key holder computes, from its secret key
and an input $\alpha$, an output $\beta$ and a proof $\pi$; anyone with the public key
checks $\pi$ and gets $\beta$. It must have:

- **uniqueness:** for each key and input, only one $\beta$ can pass verification, so
  the holder has nothing to choose;
- **pseudorandomness:** without the secret key, $\beta$ is indistinguishable from
  random, even after seeing outputs for other inputs.

RFC 9381 (August 2023) standardizes two: RSA-FDH-VRF, a deterministic RSA signature
whose hash is the output, and ECVRF on P-256 or edwards25519. ECVRF has the
structure of threshold ElGamal decryption: hash the input to a group element $h$,
publish $\Gamma = h^x$, prove with a Chaum-Pedersen proof that
$\log_h \Gamma = \log_g Y$, and output $\beta = \mathrm{Hash}(\Gamma)$.

### By hand: one VRF output, mod 47

Secret $x = 13$, public key $Y = 2^{13} = 14$. The input hashes to the group element
$h = 9$ (a stand-in; RFC 9380 defines real hashing to curves).

1. **Value.** $\Gamma = 9^{13} \bmod 47 = 27$.
2. **Proof.** Nonce $k = 8$: $U = 2^8 = 21$, $V = 9^8 = 32$. The challenge is a hash of
   $(Y, h, \Gamma, U, V)$; say $c = 6$. Response $s = 8 + 6 \cdot 13 = 86 \equiv 17$. The proof
   is $(\Gamma, c, s) = (27, 6, 17)$.
3. **Verify.** Rebuild $U' = 2^{17} \cdot 14^{-6} = 36 \cdot 28 \equiv 21$ and
   $V' = 9^{17} \cdot 27^{-6} = 4 \cdot 8 = 32$. Both match, so the same hash gives the
   same $c$, and the output is $\mathrm{Hash}(27)$.
4. **Cheat.** Claim $\Gamma = 12$ instead: $V' = 9^{17} \cdot 12^{-6} \equiv 28 \ne 32$, the
   hash changes, and the proof fails.

Since $\Gamma$ is fixed by $x$ and $h$, and the proof ties it to the same $x$ as $Y$, there
is one possible output. The full threshold version is coded in §4.11.

### Code it: a hash-only check

A VRF needs public-key machinery for arbitrary inputs. For a fixed sequence of
inputs (draw 1, draw 2, ...) a **hash chain**, Leslie Lamport's 1981 idea for
one-time passwords, already gives unique, checkable, unpredictable values with
nothing but SHA-256. The holder publishes the end of the chain once; each draw
reveals the previous link, which anyone checks by hashing forward.

```python
import hashlib
N = 1000                                # number of draws the chain can serve
seed = b"warden office seed, kept offline"     # demo value; a real seed comes from secrets

def h(v):
    return hashlib.sha256(v).digest()

chain = [seed]
for _ in range(N):
    chain.append(h(chain[-1]))
anchor = chain[-1]                      # published once, before any draw

def reveal(i):                          # the value for draw i walks back down the chain
    return chain[N - i]

def check(i, value):                    # anyone: hash it i times and you must reach the anchor
    for _ in range(i):
        value = h(value)
    return value == anchor

v3 = reveal(3)
print(v3.hex()[:16], check(3, v3), check(3, h(v3)), check(2, h(v3)))
```

```text
57ea47ed41be40ee True False True
```

Draw 3's value checks; a different value does not; and hashing it once gives draw
2's value, so revealing a link exposes only the past. The limits are the point:
inputs must be the counter, the chain runs out, and its holder knows every future
value. That last limit applies to every VRF, and it is the rule to remember: **the
key holder sees its output first**. Uniqueness stops it from choosing among
outputs, but if it can influence the input $\alpha$, or choose its key after learning
$\alpha$, it can still shop. A fair lottery fixes the key first and takes the input
from somewhere the holder cannot steer.

!!! note "Life story: verifiable random functions"
    **Born:** 1999, Silvio Micali, Michael Rabin and Salil Vadhan (FOCS 1999) ·
    **Purpose:** a keyed random function whose outputs come with proofs, unique for
    each input · **Helped:** Algorand and Cardano leader election, key transparency
    directories (CONIKS, [Chapter 3](03-Commitments.md)), the NSEC5 proposal for
    DNSSEC · **Status:** current; RFC 9381 (August 2023); see the
    [VRF reference page](../../11-advanced/VRF.md)

## 4.10 Randomness beacons: drand and Algorand

*Level: intermediate.*

### A public coin nobody owns

A **randomness beacon** publishes a fresh random value at regular intervals for
anyone to use. Michael Rabin proposed the idea in 1983. NIST has run one since 2013,
signed values every 60 seconds, but users must trust NIST not to know or choose
them in advance. A commit-and-reveal protocol among many parties
([Chapter 3](03-Commitments.md)) removes the single authority but suffers from the
**last revealer**: whoever opens last sees the result and can refuse to open, which
gives a choice of two outcomes, the same quarter-bit of bias as the DKG attack of
§4.4. Ethereum's RANDAO, which mixes values revealed by block proposers, accepts this
bias by design.

Threshold signatures remove it. Give a group of $n$ organizations a threshold BLS
key made by DKG. For round $r$, each signs the round number, any $t$ partial
signatures combine into $\sigma_r = H(r)^x$, and the round's randomness is
$\mathrm{SHA\text{-}256}(\sigma_r)$. Because BLS signatures are unique, no member and no
set of members can choose among outputs; withholding a partial signature changes
nothing as long as $t$ others answer; and the value is unpredictable unless $t$
members collude. Anyone checks it with one pairing against the group's long-lived
public key.

### drand and the League of Entropy

**drand** began as a research project at EPFL's DEDIS laboratory. On 17 June 2019
Cloudflare, EPFL, Kudelski Security, Protocol Labs and the University of Chile
announced the **League of Entropy**, independent organizations each running a drand
node, and in August 2020 they launched the production network, with a new value
every 30 seconds. In that network each signature also covers the previous one
("chained"). In 2023 the League added networks whose rounds are **unchained**,
signing only the round number: the current one, quicknet, started on 23 August
2023, produces a value every 3 seconds and uses 48-byte signatures. Unchained
rounds make **timelock encryption** possible: encrypt a message now to "round
$r$", using the round number as an identity in identity-based encryption
([Chapter 13](13-Identity-Attribute-and-Functional-Encryption.md)), and it becomes
decryptable when the League publishes $\sigma_r$, and not before. Filecoin uses drand
to elect block producers. The League's membership has grown to about twenty
organizations; the exact number changes as members join.

!!! note "Life story: drand and the League of Entropy"
    **Born:** drand at EPFL's DEDIS laboratory; League of Entropy announced
    17 June 2019 by Cloudflare, EPFL, Kudelski Security, Protocol Labs and the
    University of Chile; production network August 2020 · **Purpose:** public,
    verifiable, unbiasable randomness from threshold BLS signatures, with no
    single trusted source · **Helped:** Filecoin leader election, timelock
    encryption (2023), lotteries and audits that need a public coin ·
    **Status:** running; 3-second unchained "quicknet" since August 2023

### Algorand's sortition

Algorand, designed by Silvio Micali with Yossi Gilad, Rotem Hemo, Georgios
Vlachos and Nickolai Zeldovich (SOSP 2017), uses VRFs to pick committees without a
beacon run by a few. In each step every user evaluates its own VRF on the round's
public seed and the role, $(\beta, \pi) = \mathrm{VRF}_{sk}(\text{seed} \Vert \text{role})$.
Treating $\beta$ as a number in $[0, 1)$, a user with $w$ units of stake out of $W$ is
selected as $j$ "sub-users", where $j$ is found by placing $\beta$ in the intervals
of a binomial distribution with $w$ trials and success probability $\tau / W$ for
an expected committee size $\tau$. More stake means more chances, and splitting
stake across accounts gains nothing.

The clever part is **privacy of selection**. Nobody but the user knows it was chosen
until it speaks, and then it attaches $\pi$ so everyone can check. An attacker who
wants to knock committee members offline does not know whom to attack until they
have already sent their message, and members are replaced at every step. The seed
for each round is itself derived with a VRF by the previous round's block proposer.
Algorand's main network launched in June 2019; Cardano's Ouroboros Praos uses VRFs
for slot leaders in a similar way.

!!! note "Life story: Algorand's sortition"
    **Born:** 2017, Yossi Gilad, Rotem Hemo, Silvio Micali, Georgios Vlachos and
    Nickolai Zeldovich ("Algorand: Scaling Byzantine Agreements for
    Cryptocurrencies", SOSP 2017) · **Purpose:** choose small random committees,
    weighted by stake, in secret until they act · **Helped:** Algorand's network
    (since June 2019) and the use of VRFs in proof-of-stake designs ·
    **Status:** running; consensus theory is in
    [Chapter 17](17-Consensus-and-Smart-Contracts.md)

## 4.11 Mars: a housing lottery nobody can rig

*Level: intermediate.*

Arcadia City finishes a new residential ring: forty apartments, two hundred
eligible families. The council has promised a lottery. Everyone remembers the
water-ration draw two years earlier, run on the council's own computer, and the
rumor that a councilor's cousin won a place too easily. This time nobody wants to
trust the council, the software vendor on Earth, or any single warden.

The design uses only this chapter's tools.

<div class="mars-steps" markdown>

1. **A key nobody holds.** Five lottery wardens, chosen by lot for this one job
   and separate from the six who hold the city's master key in
   [chapter 2](02-Secret-Sharing.md), run a DKG (§4.4, the GJKR
   version) for a 3-of-5 key, and publish the group key and each warden's
   verification key. This happens once, months before any draw.
2. **Fix everything before the coin.** The council publishes the final list of
   eligible families and its SHA-256 fingerprint, together with the round number
   that will decide the draw: say round 500, due next Thursday at noon.
3. **Toss the coin.** At the appointed time each warden publishes a partial value
   $h_r^{x_i}$, where $h_r$ is the round number hashed into the group, with a
   Chaum-Pedersen proof against its verification key. Any three good partial values
   combine into the unique $h_r^{x}$, and $\beta = \mathrm{SHA\text{-}256}(h_r^{x})$.
4. **Rank.** Each family's place is set by hashing $\beta$, the list fingerprint
   and the family's name together with SHA-256, and sorting. The forty lowest get
   apartments.
5. **Audit.** Anyone, on Mars or on Earth 4 to 24 light-minutes away, can recheck
   every proof and the ranking from the published data.

</div>

This is a threshold VRF: the DDH-based coin of Cachin, Kursawe and Shoup (2000),
which needs no pairings because each partial value carries its own proof. With
pairings, the wardens could run threshold BLS as drand does; they could also simply
use the League of Entropy's round for next Thursday, since Earth's beacon is just
as unbiasable from Mars, only twenty minutes late.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The housing lottery pipeline: the list and the round number are fixed first, three of five wardens publish partial values with proofs, these combine into the unique beacon value, which ranks the families" fill="currentColor" font-size="14">
<rect x="10" y="40" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="75" y="64" text-anchor="middle" font-weight="bold">fixed first</text>
<text x="75" y="84" text-anchor="middle" font-size="13">family list hash</text>
<text x="75" y="101" text-anchor="middle" font-size="13">round 500</text>
<rect x="175" y="20" width="120" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="235" y="42" text-anchor="middle" font-weight="bold">wardens</text>
<text x="235" y="64" text-anchor="middle" font-size="13">1: h^x₁ + proof</text>
<text x="235" y="84" text-anchor="middle" font-size="13">3: h^x₃ + proof</text>
<text x="235" y="104" text-anchor="middle" font-size="13">5: h^x₅ + proof</text>
<text x="235" y="122" text-anchor="middle" font-size="12" opacity="0.7">2 cheats, 4 offline</text>
<rect x="330" y="40" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="395" y="64" text-anchor="middle" font-weight="bold">combine</text>
<text x="395" y="84" text-anchor="middle" font-size="13">unique h^x</text>
<text x="395" y="101" text-anchor="middle" font-size="13">β = SHA-256(h^x)</text>
<rect x="495" y="40" width="135" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="562" y="64" text-anchor="middle" font-weight="bold">rank families</text>
<text x="562" y="84" text-anchor="middle" font-size="13">by SHA-256 of</text>
<text x="562" y="101" text-anchor="middle" font-size="13">β, list, name</text>
<line x1="140" y1="75" x2="168" y2="75" stroke="currentColor" stroke-width="1.5"/>
<polygon points="175,75 166,71 166,79"/>
<line x1="295" y1="75" x2="323" y2="75" stroke="currentColor" stroke-width="1.5"/>
<polygon points="330,75 321,71 321,79"/>
<line x1="460" y1="75" x2="488" y2="75" stroke="currentColor" stroke-width="1.5"/>
<polygon points="495,75 486,71 486,79"/>
<text x="320" y="170" text-anchor="middle" font-size="13">any 3 honest wardens give the same β; 2 colluding wardens cannot predict it;</text>
<text x="320" y="192" text-anchor="middle" font-size="13">nobody can change the list or the round after β could be known</text>
</svg>
<figcaption>Figure 4.6. Arcadia City's housing lottery. The order of events is the security: list and round first, then the coin, then the ranking, all published.</figcaption>
</figure>

```python
import hashlib, random
random.seed(2093)                       # random is for the demo; real keys come from secrets
p = 2**127 - 2721                       # toy-size safe prime
q, g = (p - 1) // 2, 4

def sha(*parts):
    return int.from_bytes(hashlib.sha256(repr(parts).encode()).digest(), "big")

def lagrange_at_0(i, S):
    num = den = 1
    for j in S:
        if j != i:
            num, den = num * j % q, den * (j - i) % q
    return num * pow(den, -1, q) % q

# setup (in reality a DKG, section 4.4): five wardens, any three can produce a round
coef = [random.randrange(q) for _ in range(3)]
x = {i: sum(a * i**k for k, a in enumerate(coef)) % q for i in range(1, 6)}
Yi = {i: pow(g, x[i], p) for i in x}    # published verification keys

def h_round(r):                         # the round number hashed into the group
    return pow(sha("round", r) % p, 2, p)

def partial(i, r, cheat=False):         # warden i's share h^{x_i} with a Chaum-Pedersen proof
    h = h_round(r)
    sig = pow(h, x[i], p) * (g if cheat else 1) % p
    k = sha("k", x[i], r) % q
    c = sha(Yi[i], h, sig, pow(g, k, p), pow(h, k, p)) % q
    return sig, c, (k + c * x[i]) % q

def check(i, r, part):
    sig, c, s = part
    h = h_round(r)
    U = pow(g, s, p) * pow(Yi[i], -c, p) % p
    V = pow(h, s, p) * pow(sig, -c, p) % p
    return sha(Yi[i], h, sig, U, V) % q == c

def beacon(r, parts):                   # combine any 3 good partials into the unique value h^x
    good = {i: s for i, s in parts.items() if check(i, r, s)}
    S = sorted(good)[:3]
    v = 1
    for i in S:
        v = v * pow(good[i][0], lagrange_at_0(i, S), p) % p
    return hashlib.sha256(v.to_bytes(16, "big")).hexdigest(), S

ROUND = 500                             # fixed and announced with the list, before anyone can know it
families = ["Okafor", "Lindqvist", "Tanaka", "Moreau", "Haddad", "Novak", "Reyes", "Sato"]
list_hash = hashlib.sha256("\n".join(families).encode()).hexdigest()
print("list fingerprint:", list_hash[:16])

parts = {i: partial(i, ROUND, cheat=(i == 2)) for i in (1, 2, 3, 5)}   # warden 2 cheats, 4 is offline
beta, used = beacon(ROUND, parts)
print("warden 2 caught:", not check(2, ROUND, parts[2]), "| used:", used, "| beta:", beta[:16])
beta2, used2 = beacon(ROUND, {i: partial(i, ROUND) for i in (2, 4, 5)})
print("other wardens, same beta:", beta2 == beta, used2)

order = sorted(families, key=lambda f: hashlib.sha256((beta + list_hash + f).encode()).hexdigest())
print("first three homes:", order[:3])
```

```text
list fingerprint: 8b6d5b2e00a18c9f
warden 2 caught: True | used: [1, 3, 5] | beta: 47bbe428e246d453
other wardens, same beta: True [2, 4, 5]
first three homes: ['Novak', 'Lindqvist', 'Moreau']
```

Warden 2's altered value fails its proof and is dropped; warden 4's absence does
not matter; a different set of three wardens produces exactly the same $\beta$. What
could still go wrong is all outside the cryptography: a list edited after the draw
(the published fingerprint prevents it), a round number chosen after the fact (it
was announced in advance), or three wardens colluding to learn $\beta$ early and lobby
for a different round (they cannot change the round, but a beacon is only as
unpredictable as its threshold is honest). The audit trail fits on one page, and
the families can check it themselves.

## 4.12 In the real world

*Level: intermediate.*

| Scheme | Signing or decrypting | Key generation | Standard | Where you meet it |
|---|---|---|---|---|
| Threshold ElGamal | one message per holder, with a proof | DKG | none (textbook) | verifiable voting, beacons |
| Shoup threshold RSA | one message per holder, with a proof | dealer, or slow joint generation | none | research systems, libraries |
| FROST | two rounds, one in advance | DKG or dealer | RFC 9591 (2024) | threshold wallets, Zcash (ZIP 312, draft) |
| MuSig2 | two rounds, one in advance | each signer's own key | BIP-327 | Bitcoin Taproot, Lightning |
| Threshold BLS | one message per holder | DKG | draft-irtf-cfrg-bls-signature | Ethereum distributed validators, drand |
| Threshold ECDSA | several rounds with ZK proofs | DKG plus Paillier setup | none | "MPC wallet" custody |
| VRF (ECVRF, RSA-FDH-VRF) | one party, with a proof | ordinary key | RFC 9381 (2023) | Algorand, Cardano, key transparency |

**NIST's threshold project.** NIST began studying threshold cryptography with
NIST IR 8214, *Threshold Schemes for Cryptographic Primitives* (March 2019), and set
out its plans in NIST IR 8214A, *NIST Roadmap Toward Criteria for Threshold Schemes
for Cryptographic Primitives* (July 2020). A draft report on threshold EdDSA and
Schnorr signatures, NIST IR 8214B, appeared in August 2022 and was still a draft
at the time of writing. The call itself is NIST IR 8214C, *NIST First Call for
Multi-Party Threshold Schemes*: an initial draft in January 2023, a second draft in
March 2025, and the final version on 20 January 2026. It asks for threshold
versions of signing, decryption and key generation, both for primitives NIST already
standardizes and, in a second category, for other privacy-enhancing tools such as
zero-knowledge proofs and fully homomorphic encryption. Through 2026 teams have
presented previews of planned submissions in public talks; no threshold standard
has come out of the process yet, and this is not a competition with a single
winner.

**Quantum computers.** Everything in this chapter except secret sharing and the hash
chain rests on discrete logarithms or factoring, and falls to Shor's algorithm.
Threshold versions of the new lattice signatures are much harder, because ML-DSA
rejects and retries signatures whose values would leak the key, and a group cannot
easily decide to reject without revealing why; the post-quantum book's
[Chapter 9](../post-quantum/09-ML-DSA.md) explains the obstacle. Research schemes
exist (§4.13), and the NIST call invites them.

**The rule.** Threshold protocols fail mostly in implementation: skipped proofs,
reused nonces, unchecked share indices, unauthenticated broadcasts. Use a protocol
with a published security proof, a library audited against that protocol, and
keep each holder's share on separate hardware run by separate people, or the
threshold is only on paper.

## 4.13 Going deeper

*Level: expert.*

**Static and adaptive corruption.** Most proofs in this chapter assume the attacker
picks which holders to corrupt before the protocol starts. An adaptive attacker
watches and then corrupts the holders that look most useful. Proving security
against adaptive corruption is much harder, because a simulator must be able to
explain any holder's past messages consistently once it is corrupted; for FROST and
for DKG this has been an active research topic since about 2021.

**Proactive security.** Amir Herzberg, Stanisław Jarecki, Hugo Krawczyk and Moti
Yung (1995) showed how holders can re-randomize their shares periodically: each
deals a sharing of zero and everyone adds it. The key stays the same, old shares
become useless, and an attacker must collect $t$ shares within one period. CGGMP
builds this into threshold ECDSA.

**Asynchronous networks.** Pedersen's and GJKR's DKG assume messages arrive within
known time bounds, so a missing message can be blamed. Over the open internet, or
between Mars and Earth, that bound may not hold. Kokoris-Kogias, Malkhi and
Spiegelman (CCS 2020) gave a practical asynchronous DKG, which needs the tools of
Byzantine agreement ([Chapter 17](17-Consensus-and-Smart-Contracts.md)).

**Why linear schemes split.** If the secret operation is a homomorphism in the
key, $F_{x + x'}(m) = F_x(m) \cdot F_{x'}(m)$, then Lagrange interpolation works on
outputs as it works on shares. ElGamal decryption, BLS signing, the DDH VRF and the
Schnorr response are all of this form; RSA is too, but over a group of secret
order, which is what Shoup's $\Delta$ repairs; ECDSA's $k^{-1}$ is not. Recognizing
the homomorphism is the first step in deciding whether any new scheme can be
thresholdized cheaply.

**Bias without a threshold.** Another answer to the last-revealer problem is to
make the result slow to compute: hash the revealed values through a **verifiable
delay function** (Boneh, Bonneau, Bünz and Fisch, 2018), which takes a fixed,
long sequential time to evaluate but is quick to check. By the time anyone knows
the outcome, it is too late to withhold.

**Threshold lattice signatures.** Rafaël del Pino, Shuichi Katsumata, Mary Maller,
Fabrice Mouhartem, Thomas Prest and Markku-Juhani Saarinen's **Threshold Raccoon**
(EUROCRYPT 2024) gives practical threshold signatures from lattice assumptions by
designing the signature for thresholds from the start, with masking noise that can
be added up across signers instead of rejection sampling.

## Check yourself

??? question "1. A company keeps its signing key split into Shamir shares and rebuilds it each morning to sign the day's releases. What does a threshold signature scheme improve?"

    The key never exists in one place. With rebuilding, an attacker who controls
    the rebuilding machine at the right moment gets the whole key; with threshold
    signing, it must compromise $t$ holders.

??? question "2. In the threshold ElGamal example of §4.2, holders 1 and 3 decrypt instead. Find their Lagrange weights mod 23 and check that they rebuild $x = 9$ from $x_1 = 13$, $x_3 = 21$."

    $\lambda_1 = 3/(3 - 1) = 3 \cdot 2^{-1} = 3 \cdot 12 = 36 \equiv 13$ and
    $\lambda_3 = 1/(1 - 3) = -12 \equiv 11$. Then $13 \cdot 13 + 11 \cdot 21 = 169 + 231 = 400 \equiv 9 \pmod{23}$.

??? question "3. In the mod-47 group, Alice's key is $X_A = 8$. Which key should Mallory publish so that the naive aggregate is $g^4 = 16$?"

    $X_M = 16 \cdot 8^{-1}$. Since $8 \cdot 6 = 48 \equiv 1$, $8^{-1} = 6$, and
    $X_M = 96 \equiv 2$. Then $8 \cdot 2 = 16 = 2^4$, and Mallory signs alone with the
    secret 4.

??? question "4. Why is threshold BLS non-interactive while threshold Schnorr needs a round of nonce commitments?"

    A BLS signature $H(m)^x$ has no nonce, so each holder's partial signature
    depends only on its share and the message, and they combine directly. A Schnorr
    signature contains a nonce commitment $R$ that must be the same for all signers
    and fixed before the challenge, which requires a round of exchanging $R_i$.

??? question "5. In Shoup's threshold RSA, why must the public exponent $e$ be a prime larger than the number of holders $\ell$?"

    The last step needs $a \cdot 4\Delta^2 + b e = 1$, which requires
    $\gcd(e, 4\Delta^2) = 1$. Every prime factor of $4\Delta^2 = 4(\ell!)^2$ is at most
    $\ell$, so a prime $e > \ell$ shares none of them.

??? question "6. In Pedersen's DKG, Mallory controls three holders and can speak last. Among how many public keys can she choose, and with what probability can she make it even?"

    Each of her three contributions can be kept or dropped (by getting that holder
    disqualified), so she chooses among up to $2^3 = 8$ keys. Each is even with
    probability about $1/2$, so she fails only if all eight are odd: success about
    $1 - 2^{-8} \approx 0.996$.

??? question "7. FROST signers publish two nonce commitments $D_i, E_i$. What would go wrong with one, and what does the binding factor change?"

    With one nonce, an attacker running many concurrent sessions sees the honest
    $R_i$ values and then picks its own so that a combination of honest answers
    forges a signature on a new message (the ROS attack). The binding factor
    $\rho_i = H(Y, m, B, i)$ makes each honest signer's effective nonce
    $d_i + e_i \rho_i$ depend on the message and on every commitment, so any change
    by the attacker changes all the honest nonces unpredictably.

??? question "8. In the multiplicative-to-additive step of threshold ECDSA, why must Bob check that Alice's Paillier modulus has no small prime factors?"

    Bob's reply is computed modulo Alice's $N$. If $N$ has a small factor $f$, the
    reply reduced modulo $f$ depends on Bob's secret modulo $f$, and Alice learns it.
    With many small factors she learns his share modulo each, and the Chinese
    remainder theorem gives the whole share. This is BitForge.

??? question "9. A lottery operator uses an RFC 9381 VRF on the input 'draw of 3 March'. The output is unique. Why might the draw still be unfair?"

    Uniqueness only stops the operator from choosing among outputs for one input.
    If it can choose the input (or the date, the wording, or its key) after
    computing outputs privately, it can try many and pick a favorable one. The
    input and the key must be fixed before the operator can evaluate the VRF, or
    the randomness must come from a beacon it does not control.

??? question "10. In the hash chain of §4.9, why are values revealed from the end of the chain toward the seed, and not the other way?"

    Hashing is easy forward and hard backward. Revealing link $N - i$ lets anyone
    check it by hashing forward to the anchor, and lets them compute earlier draws'
    values, but not later ones, which lie backward along the chain. Revealing in
    the other order would let anyone compute all future values by hashing.

## What you learned

- Threshold cryptography lets any $t$ of $n$ holders decrypt or sign without the
  key ever being rebuilt; the result is an ordinary ciphertext or signature.
- Linear schemes split by interpolation in the exponent: ElGamal, Schnorr and BLS
  easily, RSA with Shoup's $\Delta = \ell!$ trick, ECDSA only with homomorphic
  encryption and many zero-knowledge proofs.
- Distributed key generation removes the dealer. Pedersen's version lets a cheater
  bias the key; GJKR fixes it by settling the participants before revealing
  anything about the key.
- Schnorr signers must not let their nonces be combined with values chosen later:
  FROST (RFC 9591) and MuSig2 use two nonces and a hash-derived binding factor.
- Adding public keys invites rogue keys; proofs of possession or MuSig's
  hash weights stop them.
- Threshold ECDSA's 2023 failures (TSSHOCK, BitForge) came from skipped or weakened
  proofs in implementations, not from broken mathematics.
- Unique signatures make randomness that nobody can steer: VRFs (RFC 9381) for one
  key holder, threshold BLS beacons such as drand for a group, and the same tools
  allocate homes in a lottery that every family can audit.

**Next:** [Chapter 5](05-Zero-Knowledge-Proofs.md), where the proofs used here as
black boxes become the subject: how to convince someone of a fact while telling them
nothing else.

## Further reading

- Adi Shamir, "How to Share a Secret", *Communications of the ACM* 22 (1979).
- Yvo Desmedt, "Society and Group Oriented Cryptography: A New Concept"
  (CRYPTO 1987); Yvo Desmedt and Yair Frankel, "Threshold Cryptosystems"
  (CRYPTO 1989).
- Torben Pedersen, "A Threshold Cryptosystem without a Trusted Party"
  (EUROCRYPT 1991).
- Rosario Gennaro, Stanisław Jarecki, Hugo Krawczyk and Tal Rabin, "Secure
  Distributed Key Generation for Discrete-Log Based Cryptosystems" (EUROCRYPT 1999;
  *Journal of Cryptology* 20, 2007), and "Secure Applications of Pedersen's
  Distributed Key Generation Protocol" (CT-RSA 2003).
- Victor Shoup, "Practical Threshold Signatures" (EUROCRYPT 2000).
- Dan Boneh and Matthew Franklin, "Efficient Generation of Shared RSA Keys"
  (CRYPTO 1997).
- Amir Herzberg, Stanisław Jarecki, Hugo Krawczyk and Moti Yung, "Proactive Secret
  Sharing, or: How to Cope with Perpetual Leakage" (CRYPTO 1995).
- Christian Cachin, Klaus Kursawe and Victor Shoup, "Random Oracles in
  Constantinople: Practical Asynchronous Byzantine Agreement Using Cryptography"
  (PODC 2000; *Journal of Cryptology*, 2005).
- Chelsea Komlo and Ian Goldberg, "FROST: Flexible Round-Optimized Schnorr Threshold
  Signatures" (SAC 2020); RFC 9591 (2024).
- Manu Drijvers, Kasra Edalatnejad, Bryan Ford, Eike Kiltz, Julian Loss, Gregory
  Neven and Igors Stepanovs, "On the Security of Two-Round Multi-Signatures"
  (IEEE S&P 2019).
- Fabrice Benhamouda, Tancrède Lepoint, Julian Loss, Michele Orrù and Mariana
  Raykova, "On the (in)Security of ROS" (EUROCRYPT 2021).
- Tim Ruffing, Viktoria Ronge, Elliott Jin, Jonas Schneider-Bensch and Dominique
  Schröder, "ROAST: Robust Asynchronous Schnorr Threshold Signatures" (CCS 2022).
- Mihir Bellare and Gregory Neven, "Multi-Signatures in the Plain Public-Key Model
  and a General Forking Lemma" (CCS 2006).
- Gregory Maxwell, Andrew Poelstra, Yannick Seurin and Pieter Wuille, "Simple
  Schnorr Multi-Signatures with Applications to Bitcoin" (2018; *Designs, Codes and
  Cryptography*, 2019).
- Jonas Nick, Tim Ruffing and Yannick Seurin, "MuSig2: Simple Two-Round Schnorr
  Multi-Signatures" (CRYPTO 2021); BIP-327 (2023); BIP-340 and BIP-341 (Taproot).
- Thomas Ristenpart and Scott Yilek, "The Power of Proofs-of-Possession"
  (EUROCRYPT 2007).
- Dan Boneh, Ben Lynn and Hovav Shacham, "Short Signatures from the Weil Pairing"
  (ASIACRYPT 2001); Alexandra Boldyreva, "Threshold Signatures, Multisignatures and
  Blind Signatures Based on the Gap-Diffie-Hellman-Group Signature Scheme"
  (PKC 2003); Dan Boneh, Manu Drijvers and Gregory Neven, "Compact Multi-Signatures
  for Smaller Blockchains" (ASIACRYPT 2018).
- Rosario Gennaro and Steven Goldfeder, "Fast Multiparty Threshold ECDSA with Fast
  Trustless Setup" (CCS 2018) and "One Round Threshold ECDSA with Identifiable
  Abort" (2020); Yehuda Lindell, "Fast Secure Two-Party ECDSA Signing"
  (CRYPTO 2017).
- Ran Canetti, Rosario Gennaro, Steven Goldfeder, Nikolaos Makriyannis and Udi
  Peled, "UC Non-Interactive, Proactive, Threshold ECDSA with Identifiable Aborts"
  (CCS 2020).
- Nikolaos Makriyannis, Oren Yomtov and Arik Galansky, "Practical Key-Extraction
  Attacks in Leading MPC Wallets" (2023), the BitForge paper.
- Verichains, "TSSHOCK: Breaking MPC Wallets and Digital Custodians" (Black Hat USA
  2023).
- Silvio Micali, Michael Rabin and Salil Vadhan, "Verifiable Random Functions"
  (FOCS 1999); RFC 9381 (2023).
- Yossi Gilad, Rotem Hemo, Silvio Micali, Georgios Vlachos and Nickolai Zeldovich,
  "Algorand: Scaling Byzantine Agreements for Cryptocurrencies" (SOSP 2017).
- Eleftherios Kokoris-Kogias, Dahlia Malkhi and Alexander Spiegelman,
  "Asynchronous Distributed Key Generation for Computationally-Secure Randomness,
  Consensus, and Threshold Signatures" (CCS 2020).
- Dan Boneh, Joseph Bonneau, Benedikt Bünz and Ben Fisch, "Verifiable Delay
  Functions" (CRYPTO 2018).
- Rafaël del Pino, Shuichi Katsumata, Mary Maller, Fabrice Mouhartem, Thomas Prest
  and Markku-Juhani Saarinen, "Threshold Raccoon: Practical Threshold Signatures
  from Standard Lattice Assumptions" (EUROCRYPT 2024).
- NIST IR 8214 (2019), NIST IR 8214A (2020), NIST IR 8214C (2026).
- The League of Entropy and drand documentation (drand.love), and the reference
  pages [Threshold signatures](../../11-advanced/Threshold-Signatures.md),
  [VRF](../../11-advanced/VRF.md) and [Secret sharing](../../11-advanced/Secret-Sharing.md).
