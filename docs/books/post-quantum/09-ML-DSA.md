# 9. ML-DSA

*Every software update, every TLS certificate and every signed document rests on a
signature scheme, and today almost all of them use RSA or elliptic curves. ML-DSA, the
lattice scheme CRYSTALS-Dilithium standardized as FIPS 204 on 13 August 2024, is NIST's
main replacement. It is built like Schnorr's signature: commit, get a challenge, respond.
The difference is that a lattice response leaks the secret unless the signer sometimes
throws it away and tries again. This chapter builds ML-DSA completely. You will watch a
secret fall out of 20,000 signatures made without rejection and stay hidden with it, follow
the rounding and the "hints" that keep public keys and signatures small, run a full
implementation that matches all 615 of NIST's test vectors, work out from the parameters
how often the signer retries (and why the official figures were a little low), see why
context strings, external $\mu$ and the pre-hash variant exist, follow the security proof
step by step, and forge a signature with half a stolen key.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Fiat-Shamir with aborts turns a lattice identification scheme into a signature,
      and why the aborts are necessary;
    - ML-DSA's keys, its signing loop and its verification, step by step;
    - Power2Round, HighBits, LowBits and the hints that let the public key drop 13 bits
      per coefficient;
    - why rejection makes every kept signature independent of the key, exactly;
    - how MakeHint and UseHint work, on a modulus small enough to check every case;
    - the three parameter sets, their sizes and speeds, and where the expected number of
      tries per signature comes from;
    - a complete implementation, checked against NIST's vectors;
    - hedged and deterministic signing, and why a fault that leaks only $\mathbf{s}_1$ is
      already a full break;
    - context strings, external $\mu$ and HashML-DSA, and when to use which;
    - the security proof in outline, from chosen-message forgery down to Module-SIS;
    - what changed from round-3 Dilithium to FIPS 204, and where ML-DSA is deployed as of
      November 2026.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (signatures and Fiat-Shamir),
    [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) (SIS and Module-LWE) and
    [Chapter 7](07-Rings-Modules-and-the-NTT.md) (the ring and the NTT). Chapter 8's
    sampling ideas recur here.

    **Levels:** §9.1 to §9.3 are for beginners, §9.4 to §9.9 are intermediate, §9.10 to
    §9.13 are expert. The lattice and LWE background is in the Mathematics book,
    [Chapter 14](../mathematics/14-Lattices.md) and
    [Chapter 15](../mathematics/15-Learning-with-Errors.md).

## 9.1 The problem

*Level: beginner.*

A signature must be checkable by anyone with the public key, impossible to forge without
the private key, and practical: small enough for certificates and fast enough for servers
that sign thousands of handshakes a second. Shor's algorithm breaks RSA and ECDSA, so a
forger with a quantum computer could sign malware as a trusted vendor or impersonate any
website. Unlike encryption, signatures are not at risk from "harvest now, decrypt later":
a signature only has to resist forgery while it is being relied on. But the systems that
check signatures, from phone firmware to the chips in cars, are built years before they are
retired, so the switch has to start long before a quantum computer exists.

NIST's competition chose three signature schemes in July 2022: Dilithium as the primary
choice, Falcon for cases that need smaller signatures (Chapter 10), and SPHINCS+ as a
conservative hash-based backup (Chapter 12). Dilithium became FIPS 204, ML-DSA, on
13 August 2024, alongside FIPS 203 and FIPS 205.

!!! note "Life story: Dilithium, now ML-DSA"
    **Born:** 2017, the CRYSTALS team (Léo Ducas, Eike Kiltz, Tancrède Lepoint, Vadim
    Lyubashevsky, Peter Schwabe, Gregor Seiler and Damien Stehlé), "CRYSTALS-Dilithium: A
    Lattice-Based Digital Signature Scheme" (TCHES 2018), building on Lyubashevsky's
    Fiat-Shamir with aborts (2009, 2012) and Bai and Galbraith's key compression (2014) ·
    **Purpose:** a general-purpose post-quantum signature with simple, constant-time
    arithmetic and no floating point · **Helped:** NSA's CNSA 2.0 suite (which names ML-DSA-87),
    early post-quantum certificates and code signing, hardware roots of trust ·
    **Status:** standardized as FIPS 204 (ML-DSA) on 13 August 2024; NIST's default
    post-quantum signature as of November 2026.

## 9.2 From identification to signature

*Level: beginner.*

Recall Schnorr's identification protocol from Chapter 3. The prover knows $x$ with public
$X = g^x$. It sends a commitment $W = g^y$ for random $y$, receives a random challenge $c$,
and replies $z = y + cx$. The verifier checks $g^z = W \cdot X^c$. Making the challenge a hash
of the commitment and the message (Fiat-Shamir) gives a signature.

The lattice version replaces exponentiation with multiplication by a public matrix. The
secret is a short vector $\mathbf{s}_1$ (with a second short vector $\mathbf{s}_2$ as noise), and
the public key is $\mathbf{t} = \mathbf{A}\mathbf{s}_1 + \mathbf{s}_2$, a Module-LWE sample.

1. **Commit.** Pick a random $\mathbf{y}$ with coefficients up to $\gamma_1$ (much larger than
   the secret's) and compute $\mathbf{w} = \mathbf{A}\mathbf{y}$.
2. **Challenge.** $c$ is a hash of the message and (the high part of) $\mathbf{w}$, turned into a
   sparse polynomial with $\tau$ coefficients equal to $\pm 1$ and the rest zero.
3. **Respond.** $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$.
4. **Verify.** $\mathbf{A}\mathbf{z} - c\,\mathbf{t} = \mathbf{A}\mathbf{y} - c\,\mathbf{s}_2 = \mathbf{w} -
   c\,\mathbf{s}_2$, which is close to $\mathbf{w}$ because $c\,\mathbf{s}_2$ is small. The verifier
   rounds away the small difference, recomputes the hash and compares. It also checks that
   $\mathbf{z}$ is short: without that, anyone could solve $\mathbf{A}\mathbf{z} \approx \mathbf{w} +
   c\mathbf{t}$ by linear algebra.

Forging means producing a short $\mathbf{z}$ that satisfies a linear equation chosen by a hash,
which is an SIS-type problem (Chapter 5). Recovering the key from the public key is
Module-LWE. ML-DSA's security rests on both.

## 9.3 Why the signer must abort

*Level: beginner.*

In Schnorr's scheme $y$ is uniform modulo the group order, so $z = y + cx$ is also uniform
and says nothing about $x$. In a lattice, $\mathbf{y}$ must be *short*, so it cannot be uniform
over everything; it is uniform over a box. And a box shifted by $c\,\mathbf{s}_1$ is a different
box. Each coefficient of $\mathbf{z}$ is uniform on an interval whose ends depend on the secret.
Collect enough signatures and the ends of the intervals give the secret away.

**Break it.** A one-dimensional picture: eight secret numbers between $-2$ and $2$, masks
uniform in $[-1000, 1000]$, challenge $c = \pm 1$, and $z_i = y_i + c\,s_i$. The attacker knows
$c$ (it is part of every signature, as a hash), computes $c\,z_i = c\,y_i + s_i$, and takes the
largest value seen. Without rejection that is $1000 + s_i$.

```python
# Why ML-DSA rejects: a one-dimensional picture of z = y + c*s.
import random
random.seed(2026)
GAMMA, BETA = 1000, 2                 # mask range and the largest possible |c*s|
secret = [random.randint(-2, 2) for _ in range(8)]

def sign_once(reject):
    while True:
        c = random.choice((-1, 1))                       # the challenge, public
        y = [random.randint(-GAMMA, GAMMA) for _ in secret]
        z = [yi + c * si for yi, si in zip(y, secret)]
        if not reject or max(abs(x) for x in z) <= GAMMA - BETA:
            return c, z

for reject in (False, True):
    sigs = [sign_once(reject) for _ in range(20000)]
    # c*z = c*y + s, and c*y ranges over [-GAMMA, GAMMA]: its top end gives s away
    guess = [max(c * z[i] for c, z in sigs) - GAMMA for i in range(len(secret))]
    print("rejection" if reject else "no rejection", "-> attacker's guess:", guess)
print("the secret was:                   ", secret)
```

It prints:

```text
no rejection -> attacker's guess: [-2, 0, 2, 2, -2, -1, 2, 2]
rejection -> attacker's guess: [-2, -2, -2, -2, -2, -2, -2, -2]
the secret was:                    [-2, 0, 2, 2, -2, -1, 2, 2]
```

Without rejection, the attacker reads the secret exactly. **Fix it**: the signer throws away
any $\mathbf{z}$ that falls outside the smaller box $[-(\gamma - \beta), \gamma - \beta]$, where
$\beta$ is the largest $c\,s_i$ can be, and starts again with a new mask. Every surviving
$\mathbf{z}$ is then uniform on the smaller box, whatever the secret is, and the attacker's
guesses all come out the same, carrying no information.

This is Lyubashevsky's **Fiat-Shamir with aborts** (ASIACRYPT 2009, refined in "Lattice
Signatures without Trapdoors", EUROCRYPT 2012). The cost is that signing is a loop: the
signer may need several tries, and the number of tries is random. ML-DSA checks a second
condition as well (§9.4), so that the low bits used in verification also hide $\mathbf{s}_2$.

### Why the kept values say nothing, exactly

The attack above is statistical, and so is its failure: "all guesses came out the same" is
evidence, not proof. The proof is short enough to do by hand on a toy. Take masks $y$
uniform on the nine integers $[-4, 4]$ ($\gamma = 4$) and a secret contribution
$c\,s \in \{-1, 0, +1\}$ ($\beta = 1$).

<div class="mars-steps" markdown>

**Rejection by hand** ($\gamma = 4$, $\beta = 1$).

1. If $c\,s = +1$, then $z = y + 1$ is uniform on $\{-3, -2, \dots, 5\}$, nine values with
   probability $1/9$ each.
2. If $c\,s = -1$, then $z$ is uniform on $\{-5, -4, \dots, 3\}$.
3. The two lists share seven values, $-3$ to $3$. A single $z = 5$ proves that $c\,s = +1$; a
   single $z = -5$ proves that $c\,s = -1$. The **statistical distance** between the two
   distributions, the most any test can gain from one sample, is $2/9$.
4. Now keep $z$ only if $|z| \le \gamma - \beta = 3$. In both cases exactly seven values of
   $y$ survive, one for each $z \in \{-3, \dots, 3\}$, so each kept $z$ has probability
   $1/7$, whatever $c\,s$ was. The distance is 0.
5. The price: a try is kept with probability $7/9$, so a signer needs $9/7 \approx 1.29$
   tries on average for this one coefficient.

</div>

The argument does not depend on the toy numbers. For any shift $v$ with $|v| \le \beta$,
every target value $z$ in $[-(\gamma - \beta), \gamma - \beta]$ is hit by exactly one mask,
$y = z - v$, and that mask lies inside $[-\gamma, \gamma]$. So each kept value has probability
$1/(2\gamma + 1)$ before normalizing, the same for every $v$, and the kept distribution is
uniform on the small box. That is why the bound $\beta = \tau\eta$ matters: the challenge
has $\tau$ coefficients of $\pm 1$ and the secret's coefficients are at most $\eta$, so no
coefficient of $c\,\mathbf{s}_1$ can exceed $\tau\eta$ in size. If it could, the argument would
fail at the edges.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Three bars showing the range of z = y + c s for c s equal to minus 1, 0 and plus 1, with masks from minus 4 to 4. The bars are shifted copies; the shaded middle band from minus 3 to 3 lies inside all three, and only values in it are kept." fill="currentColor" font-size="14">
<rect x="216" y="30" width="288" height="140" fill="currentColor" fill-opacity=".12"/>
<text x="360" y="22" text-anchor="middle">kept: |z| ≤ γ − β = 3</text>
<text x="20" y="57">c·s = −1</text>
<rect x="120" y="42" width="384" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="20" y="97">c·s = 0</text>
<rect x="168" y="82" width="384" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="20" y="137">c·s = +1</text>
<rect x="216" y="122" width="384" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/>
<line x1="120" y1="180" x2="600" y2="180" stroke="currentColor"/>
<g stroke="currentColor">
<line x1="120" y1="176" x2="120" y2="184"/><line x1="168" y1="176" x2="168" y2="184"/><line x1="216" y1="176" x2="216" y2="184"/><line x1="264" y1="176" x2="264" y2="184"/><line x1="312" y1="176" x2="312" y2="184"/><line x1="360" y1="176" x2="360" y2="184"/><line x1="408" y1="176" x2="408" y2="184"/><line x1="456" y1="176" x2="456" y2="184"/><line x1="504" y1="176" x2="504" y2="184"/><line x1="552" y1="176" x2="552" y2="184"/><line x1="600" y1="176" x2="600" y2="184"/>
</g>
<g text-anchor="middle" font-size="13">
<text x="120" y="200">−5</text><text x="168" y="200">−4</text><text x="216" y="200">−3</text><text x="264" y="200">−2</text><text x="312" y="200">−1</text><text x="360" y="200">0</text><text x="408" y="200">1</text><text x="456" y="200">2</text><text x="504" y="200">3</text><text x="552" y="200">4</text><text x="600" y="200">5</text>
</g>
</svg>
<figcaption>Figure 9.1. Rejection on a toy with masks in [−4, 4] and |c·s| ≤ 1. Without rejection the three ranges differ at their ends, and an end value names the secret. The shaded band lies inside every range, so a kept z is uniform on it, whatever the secret.</figcaption>
</figure>

At ML-DSA-44's sizes ($\gamma_1 = 2^{17}$, $\beta = 78$) the same count keeps a single
coefficient with probability about $1 - \beta/\gamma_1 \approx 0.9994$, but $\mathbf{z}$ has
$256\ell = 1{,}024$ coefficients and all must pass, so only about 54 percent of tries survive
this first check: $(1 - \beta/\gamma_1)^{256\ell} \approx e^{-256\ell\beta/\gamma_1}$. That
exponential is the whole story of the loop count, and §9.6 finishes it.

Lyubashevsky's 2012 scheme and BLISS (2013) used Gaussian masks, which give smaller
signatures, but Gaussian sampling is hard to make constant-time and BLISS implementations
fell to cache-timing attacks on exactly that step. Dilithium chose uniform masks and the
plain box test above.

One more consequence matters for implementers. The argument covers *kept* values only. A
rejected $\mathbf{z}$ is more likely to sit at the end of the range the secret pushes it
towards, so rejected candidates, and anything computed from them, must never leave the
signer. The proof in §9.10 leans on this: it can simulate the signatures the signer
outputs, but not the ones it throws away.

## 9.4 The scheme

*Level: intermediate.*

All arithmetic is in $R_q = \mathbb{Z}_q[X]/(X^{256}+1)$ with $q = 8{,}380{,}417$. The matrix
$\mathbf{A}$ is $k \times \ell$.

**Key generation** from a 32-byte seed $\xi$:

1. Expand $(\rho, \rho', K) = H(\xi \,\|\, k \,\|\, \ell)$, using SHAKE256: 32, 64 and 32 bytes.
2. $\hat{\mathbf{A}} = \mathrm{ExpandA}(\rho)$, sampled directly in NTT form; $\mathbf{s}_1 \in
   R_q^\ell$, $\mathbf{s}_2 \in R_q^k$ with coefficients in $[-\eta, \eta]$, from $\rho'$.
3. $\mathbf{t} = \mathbf{A}\mathbf{s}_1 + \mathbf{s}_2$, split as $\mathbf{t} = \mathbf{t}_1 \cdot 2^{13} +
   \mathbf{t}_0$ (Power2Round).
4. Public key: $\rho$ and $\mathbf{t}_1$. Private key: $\rho$, $K$, $tr = H(\mathrm{pk})$ (64 bytes),
   $\mathbf{s}_1$, $\mathbf{s}_2$, $\mathbf{t}_0$.

**Signing** a formatted message $M'$:

1. $\mu = H(tr \,\|\, M')$, 64 bytes. Binding the public key into $\mu$ means a signature is
   tied to one key.
2. $\rho'' = H(K \,\|\, \mathit{rnd} \,\|\, \mu)$, where $\mathit{rnd}$ is 32 fresh random bytes (hedged
   signing) or 32 zero bytes (deterministic signing).
3. Loop, with a counter $\kappa$:
    1. $\mathbf{y} = \mathrm{ExpandMask}(\rho'', \kappa)$, coefficients in $(-\gamma_1, \gamma_1]$.
    2. $\mathbf{w} = \mathbf{A}\mathbf{y}$, and $\mathbf{w}_1 = \mathrm{HighBits}(\mathbf{w})$.
    3. $\tilde c = H(\mu \,\|\, \mathrm{w1Encode}(\mathbf{w}_1))$, $\lambda/4$ bytes;
       $c = \mathrm{SampleInBall}(\tilde c)$.
    4. $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$.
    5. **Reject** if $\|\mathbf{z}\|_\infty \ge \gamma_1 - \beta$, or if
       $\|\mathrm{LowBits}(\mathbf{w} - c\,\mathbf{s}_2)\|_\infty \ge \gamma_2 - \beta$.
    6. Compute the hint $\mathbf{h}$ that lets the verifier recover $\mathbf{w}_1$ without
       $\mathbf{t}_0$; **reject** if $\|c\,\mathbf{t}_0\|_\infty \ge \gamma_2$ or $\mathbf{h}$ has more than
       $\omega$ ones.
4. The signature is $(\tilde c, \mathbf{z}, \mathbf{h})$.

**Verification:** check that $\mathbf{z}$ is short and the hint well formed; compute
$\mathbf{w}' = \mathbf{A}\mathbf{z} - c\,\mathbf{t}_1 2^{13}$; recover $\mathbf{w}_1' = \mathrm{UseHint}(\mathbf{h},
\mathbf{w}')$; accept if $H(\mu \,\|\, \mathrm{w1Encode}(\mathbf{w}_1')) = \tilde c$.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="The ML-DSA signing loop: sample mask y, compute w = Ay and its high bits, hash to a challenge c, compute z = y + c s1, check bounds and hints, and either output the signature or loop back with a new mask" fill="currentColor" font-size="13">
<rect x="20" y="20" width="170" height="34" rx="4" fill="none" stroke="currentColor"/><text x="32" y="42">y = ExpandMask(ρ″, κ)</text>
<rect x="230" y="20" width="170" height="34" rx="4" fill="none" stroke="currentColor"/><text x="242" y="42">w = Ay, w₁ = HighBits</text>
<rect x="440" y="20" width="180" height="34" rx="4" fill="none" stroke="currentColor"/><text x="450" y="42">c̃ = H(μ ‖ w₁), c from c̃</text>
<g stroke="currentColor"><line x1="190" y1="37" x2="230" y2="37"/><line x1="400" y1="37" x2="440" y2="37"/><line x1="530" y1="54" x2="530" y2="84"/></g>
<rect x="440" y="84" width="180" height="34" rx="4" fill="none" stroke="currentColor"/><text x="470" y="106">z = y + c s₁</text>
<line x1="530" y1="118" x2="530" y2="148" stroke="currentColor"/>
<rect x="380" y="148" width="240" height="50" rx="4" class="acc" fill="none" stroke-width="1.8"/>
<text x="392" y="168" class="acc-fill">‖z‖∞ &lt; γ₁ − β ?  low bits small ?</text>
<text x="392" y="188" class="acc-fill">‖c t₀‖∞ &lt; γ₂ ?  hints ≤ ω ?</text>
<line x1="380" y1="173" x2="105" y2="173" stroke="currentColor"/><line x1="105" y1="173" x2="105" y2="54" stroke="currentColor"/>
<text x="150" y="166">any no: κ ← κ + ℓ, try again</text>
<line x1="500" y1="198" x2="500" y2="232" stroke="currentColor"/>
<rect x="380" y="232" width="240" height="34" rx="4" fill="none" stroke="currentColor"/><text x="392" y="254">all yes: output (c̃, z, h)</text>
<text x="20" y="232" fill-opacity=".7">On average 4.25, 5.1 and 3.85 tries</text>
<text x="20" y="252" fill-opacity=".7">for ML-DSA-44, -65 and -87 (FIPS 204).</text>
</svg>
<figcaption>Figure 9.2. The signing loop of ML-DSA. Each rejected try uses a fresh mask; the number of tries is random but small. The values from rejected tries must stay secret too, because they depend on the key.</figcaption>
</figure>

## 9.5 Rounding and hints

*Level: intermediate.*

The public key $\mathbf{t}$ has $256k$ coefficients of 23 bits each. ML-DSA publishes only the
top 10 bits of each, $\mathbf{t}_1$, and keeps the low 13 bits $\mathbf{t}_0$ in the private key.
That shrinks the public key by more than half (for ML-DSA-44, from 2,976 to 1,312 bytes) but
leaves the verifier with a problem: it computes $\mathbf{A}\mathbf{z} - c\,\mathbf{t}_1 2^{13}$, which
differs from what the signer had by the unknown $c\,\mathbf{t}_0$. The signer fixes this with a
**hint**.

ML-DSA splits each number $r$ modulo $q$ in two ways.

- **Power2Round** splits $r = r_1 \cdot 2^{13} + r_0$ with $r_0 \in (-2^{12}, 2^{12}]$. It is used
  once, for $\mathbf{t}$.
- **Decompose** splits $r = r_1 \cdot 2\gamma_2 + r_0$ with $r_0 \in (-\gamma_2, \gamma_2]$, with a
  small correction at the top end so that $r_1$ stays in range. HighBits returns $r_1$,
  LowBits returns $r_0$. For ML-DSA-44, $2\gamma_2 = 190{,}464$ and $r_1$ takes 44 values; for
  the other two sets $2\gamma_2 = 523{,}776$ and $r_1$ takes 16 values.

The signature's hash covers only HighBits of $\mathbf{w}$. Adding a small number to $r$ usually
leaves its high bits alone, unless $r$ is close to a boundary between two blocks. The
hint is one bit per coefficient saying "the small error pushed this coefficient across a
boundary", and in which direction the verifier should correct it is told by the sign of
its own low bits.

<div class="mars-steps" markdown>

**A hint by hand** (ML-DSA-44, $2\gamma_2 = 190{,}464$).

1. Say the verifier's value of one coefficient is $r = 1{,}000{,}000$, and the signer's was
   $r + 50{,}000 = 1{,}050{,}000$. (The difference stands for $c\,t_0$ and is exaggerated
   to make the example easy to follow.)
2. Decompose $1{,}000{,}000 = 5 \cdot 190{,}464 + 47{,}680$: high bits 5, low bits $47{,}680$.
3. Decompose $1{,}050{,}000 = 6 \cdot 190{,}464 - 92{,}784$: high bits 6.
4. They differ, so the signer sets the hint bit to 1 (MakeHint).
5. The verifier runs UseHint: hint 1 and low bits $47{,}680 > 0$, so it takes $5 + 1 = 6$, the
   signer's high bits. Had its low bits been negative, it would have taken $5 - 1$.

</div>

The signer can compute the hints because it knows $\mathbf{t}_0$. The rejection condition
$\|c\,\mathbf{t}_0\|_\infty < \gamma_2$ guarantees that one step up or down is always enough, and
$\omega$ caps the number of hints so the signature has a fixed size. The hint is stored as a
list of positions: at most $\omega$ bytes of positions plus $k$ bytes of counts.

### The whole chain on a toy modulus

The example above starts in the middle. Here is the whole chain, signer to verifier, on a
modulus small enough to draw: $q = 97$ and $2\gamma_2 = 16$, so $q - 1 = 96$ is six blocks of
16 and HighBits takes the values 0 to 5. LowBits lies in $(-8, 8]$, so block $j$ holds the
numbers from $16j - 7$ to $16j + 8$. Take $\beta = 2$.

<div class="mars-steps" markdown>

**The hint by hand** ($q = 97$, $\gamma_2 = 8$, $\beta = 2$).

1. The signer's commitment coefficient is $w = 37 = 2 \cdot 16 + 5$: HighBits 2, LowBits 5.
   This 2 is what goes into the hash.
2. The verifier will not see $w$. It will see $w - c\,s_2 + c\,t_0$ (§9.5's opening). Say
   $c\,s_2 = 1$ and $c\,t_0 = 6$.
3. **The signer's second check.** $w - c\,s_2 = 36$ has LowBits 4, and $|4| < \gamma_2 -
   \beta = 6$, so the try is kept. The check guarantees that subtracting anything up to $\beta$
   in size cannot move a number out of its block, so HighBits$(36) = $ HighBits$(37) = 2$.
   The hash can be recomputed from $w - c\,s_2$, which the verifier is one step away from.
4. **MakeHint.** The verifier's number is $36 + 6 = 42 = 3 \cdot 16 - 6$: HighBits 3, LowBits
   $-6$. It has crossed the boundary between 40 and 41. The signer knows $t_0$, compares
   HighBits$(42) = 3$ with HighBits$(36) = 2$, finds them different and sets the hint bit to 1.
5. **UseHint.** The verifier has 42 and the hint 1. Its LowBits $-6$ are negative, so the true
   value lies below, and it takes $3 - 1 = 2$. It hashes the 2, as the signer did.

</div>

Two rules make UseHint safe. The error $c\,t_0$ must be at most $\gamma_2$, half a block, so
it crosses at most one boundary; that is the signer's check $\|c\,\mathbf{t}_0\|_\infty <
\gamma_2$. And the direction comes free: a value pushed up into the next block lands in its
lower half, with negative LowBits, so negative LowBits mean "step down".

The top of the range needs care. Numbers from 89 to 96 are $-8$ to $-1$ modulo 97, close to
0, so Decompose puts them in block 0 with negative low bits: 93 becomes HighBits 0, LowBits
$-4$. This is the "small correction at the top end", the line `if r - r0 == Q - 1` in §9.7,
and the reason UseHint counts modulo the number of blocks.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A number line from 0 to 96 for the toy modulus 97, cut into blocks of 16 labeled with their high bits 0 to 5, and a final short piece from 89 to 96 that also belongs to block 0. The signer's value 36 lies in block 2; adding c t0 = 6 moves it to 42 in block 3, across the boundary at 40.5; the hint tells the verifier to step back to block 2." fill="currentColor" font-size="14">
<rect x="40" y="70" width="52" height="40" fill="currentColor" fill-opacity=".12"/>
<rect x="557" y="70" width="46" height="40" fill="currentColor" fill-opacity=".12"/>
<rect x="40" y="70" width="563" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<g stroke="currentColor" stroke-width="1.4">
<line x1="92" y1="70" x2="92" y2="110"/><line x1="185" y1="70" x2="185" y2="110"/><line x1="278" y1="70" x2="278" y2="110"/><line x1="371" y1="70" x2="371" y2="110"/><line x1="464" y1="70" x2="464" y2="110"/><line x1="557" y1="70" x2="557" y2="110"/>
</g>
<g text-anchor="middle" font-size="15">
<text x="66" y="96">0</text><text x="138" y="96">1</text><text x="231" y="96">2</text><text x="324" y="96">3</text><text x="417" y="96">4</text><text x="510" y="96">5</text><text x="580" y="96">0</text>
</g>
<g text-anchor="middle" font-size="12">
<text x="40" y="128">0</text><text x="92" y="128">8|9</text><text x="185" y="128">24|25</text><text x="278" y="128">40|41</text><text x="371" y="128">56|57</text><text x="464" y="128">72|73</text><text x="557" y="128">88|89</text><text x="603" y="128">96</text>
</g>
<text x="40" y="30">HighBits per block (2γ₂ = 16); LowBits run from −7 to 8 inside each block</text>
<circle cx="249" cy="60" r="4"/><text x="249" y="52" text-anchor="middle" font-size="13">36</text>
<circle cx="284" cy="60" r="4"/><text x="290" y="52" font-size="13">42</text>
<line x1="253" y1="60" x2="278" y2="60" stroke="currentColor" stroke-width="1.6"/>
<path d="M276 56 L284 60 L276 64 Z"/>
<text x="40" y="160">signer: w − c s₂ = 36, HighBits 2 (hashed)</text>
<text x="40" y="182">verifier: 36 + c t₀ = 42, HighBits 3, LowBits −6, so the hint bit is 1</text>
<text x="40" y="204">UseHint: hint 1 and LowBits ≤ 0, so step down: 3 − 1 = 2, the signer's value</text>
</svg>
<figcaption>Figure 9.3. HighBits and the hint on the toy modulus q = 97. A small error can carry a value across one block boundary; one hint bit says that it did, and the sign of the verifier's low bits says which way to step back. The shaded ends are both block 0 because 89 to 96 are small negative numbers modulo 97.</figcaption>
</figure>

**Code it.** Decompose, MakeHint and UseHint on the toy, run on the example and then on
every value of $r$ and every error $z$ up to a bound.

```python
# Decompose, MakeHint and UseHint on a toy modulus, checked on every case.
q, gamma2 = 97, 8                         # q - 1 = 96 = 6 blocks of 2*gamma2 = 16
M = (q - 1) // (2 * gamma2)               # high bits take the values 0 .. M-1

def mod_pm(r, m):
    r %= m
    return r - m if r > m // 2 else r

def decompose(r):
    r0 = mod_pm(r, 2 * gamma2)
    if r - r0 == q - 1:                   # the top sliver wraps around to block 0
        return 0, r0 - 1
    return (r - r0) // (2 * gamma2), r0

def high(r):  return decompose(r % q)[0]

def make_hint(z, r):  return int(high(r) != high(r + z))

def use_hint(h, r):
    r1, r0 = decompose(r % q)
    if h == 0:
        return r1
    return (r1 + 1) % M if r0 > 0 else (r1 - 1) % M

for r in (37, 42, 93, 95):
    print("r =", r, " (HighBits, LowBits) =", decompose(r))
print("signer: w - c*s2 = 36, high bits", high(36), "; verifier sees 36 + c*t0 = 42, high bits", high(42))
print("hint =", make_hint(-6, 42), "; UseHint(1, 42) =", use_hint(1, 42))

for bound in (gamma2, gamma2 + 1, 12):
    wrong = sum(use_hint(make_hint(z, r), r) != high(r + z)
                for r in range(q) for z in range(-bound, bound + 1))
    print(f"|z| <= {bound}: UseHint wrong in {wrong} of {q * (2 * bound + 1)} cases")
```

It prints:

```text
r = 37  (HighBits, LowBits) = (2, 5)
r = 42  (HighBits, LowBits) = (3, -6)
r = 93  (HighBits, LowBits) = (0, -4)
r = 95  (HighBits, LowBits) = (0, -2)
signer: w - c*s2 = 36, high bits 2 ; verifier sees 36 + c*t0 = 42, high bits 3
hint = 1 ; UseHint(1, 42) = 2
|z| <= 8: UseHint wrong in 0 of 1649 cases
|z| <= 9: UseHint wrong in 11 of 1843 cases
|z| <= 12: UseHint wrong in 116 of 2425 cases
```

Up to $\gamma_2$ the hint is never wrong, over all 1,649 cases; one unit beyond, it starts to
fail. That is FIPS 204's lemma about hints in miniature. The real functions have the same
shape, with blocks of 190,464 or 523,776, and each rejection condition that protects them
adds a little to the number of tries, as §9.6 shows.

§9.7 counts the hints in real signatures.

## 9.6 Parameters and sizes

*Level: intermediate.*

| | ML-DSA-44 | ML-DSA-65 | ML-DSA-87 |
|---|---|---|---|
| NIST category | 2 | 3 | 5 |
| $(k, \ell)$ | $(4, 4)$ | $(6, 5)$ | $(8, 7)$ |
| $\eta$ | 2 | 4 | 2 |
| $\tau$ (nonzero in $c$) | 39 | 49 | 60 |
| $\beta = \tau\eta$ | 78 | 196 | 120 |
| $\gamma_1$ | $2^{17}$ | $2^{19}$ | $2^{19}$ |
| $\gamma_2$ | $(q-1)/88$ | $(q-1)/32$ | $(q-1)/32$ |
| $\omega$ (max hints) | 80 | 55 | 75 |
| $\tilde c$ length | 32 B | 48 B | 64 B |
| public key | 1,312 B | 1,952 B | 2,592 B |
| private key | 2,560 B | 4,032 B | 4,896 B |
| signature | 2,420 B | 3,309 B | 4,627 B |
| expected tries | 4.25 | 5.1 | 3.85 |

*Table 9.1. ML-DSA parameter sets (FIPS 204, Tables 1 and 2). All use $q = 8{,}380{,}417$,
$n = 256$ and $d = 13$ dropped bits. The sizes are checked by the code in §9.7. The expected
tries are FIPS 204's; counting every rejection check gives about 4.36, 5.14 and 3.91 (below).*

For comparison: an Ed25519 public key is 32 bytes and a signature 64 bytes; an RSA-2048
public key is 256 bytes plus the exponent, and a signature 256 bytes. ML-DSA-44's signature is
about 38 times an Ed25519 signature. Speed is a different story. On a laptop, optimized
ML-DSA signs in about a tenth of a millisecond and verifies in less (Table 9.2 below),
comparable to Ed25519 and much faster than RSA signing. Size, not speed, is ML-DSA's cost.

The category 2 rating of ML-DSA-44 (not 1) reflects that its estimated attack cost reaches
the SHA-256 collision threshold of Chapter 2, though not the AES-192 key search of category 3.

The sizes follow from the parameters: the public key is $32 + 320k$ bytes; the private key is
128 bytes of seeds and $tr$, the secret polynomials at 3 or 4 bits per coefficient, and
$\mathbf{t}_0$ at 416 bytes per polynomial ($128 + 11 \cdot 128 + 6 \cdot 416 = 4{,}032$ for
ML-DSA-65). In practice the private key is often stored as the 32-byte seed $\xi$ and
expanded when needed; RFC 9881 allows the seed, the expanded key, or both.

### Where the loop count comes from

The last row of Table 9.1 can be worked out by hand. A try survives the first check if every
coefficient of $\mathbf{z}$ stays below $\gamma_1 - \beta$; §9.3 showed each one does with
probability about $1 - \beta/\gamma_1$. The second check asks every coefficient of
LowBits$(\mathbf{w} - c\,\mathbf{s}_2)$ to stay below $\gamma_2 - \beta$, and those low bits behave
like uniform numbers in $(-\gamma_2, \gamma_2]$, so each passes with probability about
$1 - \beta/\gamma_2$. With $256\ell$ coefficients of the first kind and $256k$ of the second,

$$\Pr[\text{try kept}] \approx \left(1 - \frac{\beta}{\gamma_1}\right)^{256\ell}
\left(1 - \frac{\beta}{\gamma_2}\right)^{256k} \approx
\exp\!\left(-256\,\beta\left(\frac{\ell}{\gamma_1} + \frac{k}{\gamma_2}\right)\right),$$

and the expected number of tries is the reciprocal, because the tries are independent and the
count is geometric. This is equation (5) of the Dilithium specification, and it is where
FIPS 204's figures come from.

<div class="mars-steps" markdown>

**ML-DSA-44 by hand** ($\beta = 78$, $\ell = k = 4$, $\gamma_1 = 131{,}072$, $\gamma_2 = 95{,}232$).

1. $\ell/\gamma_1 = 4/131{,}072 = 3.052 \times 10^{-5}$ and $k/\gamma_2 = 4/95{,}232 = 4.200 \times 10^{-5}$.
2. Their sum is $7.252 \times 10^{-5}$; times $256 \cdot 78 = 19{,}968$ it is $1.448$.
3. $e^{1.448} = 4.25$ tries on average, and a try is kept with probability $1/4.25 = 0.235$.
4. The chance that a signature needs more than 10 tries is $(1 - 0.235)^{10} = 0.069$, about
   one signature in fourteen; more than 30 tries, $0.765^{30} = 0.0003$.

</div>

Two more checks come after the hint is computed, $\|c\,\mathbf{t}_0\|_\infty < \gamma_2$ and at
most $\omega$ hints, and the formula ignores both. The first almost never fails ($c\,\mathbf{t}_0$
would have to be more than six standard deviations out). The second fails more often: each
coefficient of ML-DSA-44 needs a hint with probability about 6 percent (63 hints in 1,024
coefficients on average, as §9.7 counts), and the limit $\omega = 80$ is only about two
standard deviations above that. In October 2026 Kris Kwiatkowski published a complete
accounting of all four checks (ePrint 2026/2456), after Hanno Becker and others noticed on
NIST's pqc-forum that measured loop counts ran slightly above FIPS 204's figures. The corrected
expectations are 4.36, 5.14 and 3.91 tries, and the paper reports that NIST's errata for
FIPS 204 already carry them.

**Code it.** The exponential formula, the exact count for the two box checks, and the hint
limit added with a normal approximation for $c\,\mathbf{t}_0$; the last column is the loop cap
discussed below.

```python
# Expected trips through ML-DSA's signing loop, worked out from the parameters alone.
import math
Q = 8380417
#                     k  l  tau eta gamma1    gamma2          omega
SETS = {"ML-DSA-44": (4, 4, 39, 2, 1 << 17, (Q - 1) // 88, 80),
        "ML-DSA-65": (6, 5, 49, 4, 1 << 19, (Q - 1) // 32, 55),
        "ML-DSA-87": (8, 7, 60, 2, 1 << 19, (Q - 1) // 32, 75)}

def binom_tail(n, p, limit):              # P(more than `limit` of n coins with bias p)
    term, total = (1 - p) ** n, 0.0
    for i in range(n):
        if i > limit:
            total += term
        term *= (n - i) / (i + 1) * p / (1 - p)
    return total

print("            FIPS formula   both checks, exact   with hint limit   hints   cap")
for name, (k, l, tau, eta, g1, g2, omega) in SETS.items():
    beta = tau * eta
    approx = math.exp(256 * beta * (l / g1 + k / g2))           # the formula behind FIPS 204
    p_z = ((2 * (g1 - beta) - 1) / (2 * g1)) ** (256 * l)       # all |z| < gamma1 - beta
    p_low = ((2 * (g2 - beta) - 1) / (2 * g2)) ** (256 * k)     # all |LowBits| < gamma2 - beta
    # c*t0 is a sum of tau values +-t0, with t0 nearly uniform on (-2^12, 2^12]: about normal
    sd = math.sqrt(tau * ((1 << 13) ** 2 - 1) / 12)
    a = beta / sd
    pdf = math.exp(-a * a / 2) / math.sqrt(2 * math.pi)
    excess = 2 * sd * pdf - 2 * beta * 0.5 * math.erfc(a / math.sqrt(2))  # E[max(0, |e| - beta)]
    p_hint = excess / (2 * (g2 - beta))                         # chance one coefficient needs a hint
    full = 1 / (p_z * p_low * (1 - binom_tail(256 * k, p_hint, omega)))
    cap = math.ceil(256 * math.log(2) / -math.log(1 - 1 / full))
    print(f"{name}     {approx:5.2f}            {1 / (p_z * p_low):5.2f}"
          f"               {full:5.2f}         {256 * k * p_hint:5.1f}   {cap}")
print("cap from the FIPS 204 value for ML-DSA-65:",
      math.ceil(256 * math.log(2) / -math.log(1 - 1 / 5.1)))
```

It prints:

```text
            FIPS formula   both checks, exact   with hint limit   hints   cap
ML-DSA-44      4.25             4.30                4.36          63.0   681
ML-DSA-65      5.09             5.12                5.14          38.2   820
ML-DSA-87      3.85             3.87                3.90          56.7   600
cap from the FIPS 204 value for ML-DSA-65: 814
```

The model lands on the corrected figures (3.90 against 3.91 for ML-DSA-87, where the normal
approximation is a little rough), and its predicted 63 hints per try for ML-DSA-44 matches what
real signatures carry. The hint reasoning is the one from the toy: a coefficient needs a hint
when $c\,t_0$ pushes the verifier's value out of its block, and since the kept low bits lie
within $\gamma_2 - \beta$ of the center, that happens with probability about
$\mathrm{E}[\max(0, |c\,t_0| - \beta)] / (2(\gamma_2 - \beta))$.

**The loop cap.** An unbounded loop is awkward for hardware and real-time code, so FIPS 204
lets an implementation stop after a fixed number of tries and report an error, if the limit
makes that cryptographically rare. The figure it gives is 814: with ML-DSA-65's 5.1 expected
tries, 814 failures in a row have probability below $2^{-256}$. With the corrected 5.14 the
same calculation gives about 820. Real signers never come near either; the cap turns a bug, or
a fault that makes every try fail, into an error instead of a hang.

### Sizes and speeds

Figure 9.4 puts the sizes next to the schemes they replace and the alternatives.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Bar chart of public key plus signature bytes: Ed25519 32 plus 64; RSA-2048 256 plus 256; Falcon-512 897 plus 666; ML-DSA-44 1,312 plus 2,420; ML-DSA-65 1,952 plus 3,309; ML-DSA-87 2,592 plus 4,627; SLH-DSA-128s 32 plus 7,856." fill="currentColor" font-size="14">
<text x="20" y="24">Bytes on the wire: public key (dark) + signature (light)</text>
<g text-anchor="end">
<text x="140" y="59">Ed25519</text><text x="140" y="94">RSA-2048</text><text x="140" y="129">Falcon-512</text><text x="140" y="164">ML-DSA-44</text><text x="140" y="199">ML-DSA-65</text><text x="140" y="234">ML-DSA-87</text><text x="140" y="269">SLH-DSA-128s</text>
</g>
<rect x="150" y="44" width="1.8" height="20" fill-opacity=".85"/><rect x="151.8" y="44" width="3.5" height="20" fill-opacity=".3"/>
<rect x="150" y="79" width="14.1" height="20" fill-opacity=".85"/><rect x="164.1" y="79" width="14.1" height="20" fill-opacity=".3"/>
<rect x="150" y="114" width="49.3" height="20" fill-opacity=".85"/><rect x="199.3" y="114" width="36.6" height="20" fill-opacity=".3"/>
<rect x="150" y="149" width="72.2" height="20" fill-opacity=".85"/><rect x="222.2" y="149" width="133.1" height="20" fill-opacity=".3"/>
<rect x="150" y="184" width="107.4" height="20" fill-opacity=".85"/><rect x="257.4" y="184" width="182.0" height="20" fill-opacity=".3"/>
<rect x="150" y="219" width="142.6" height="20" fill-opacity=".85"/><rect x="292.6" y="219" width="254.5" height="20" fill-opacity=".3"/>
<rect x="150" y="254" width="1.8" height="20" fill-opacity=".85"/><rect x="151.8" y="254" width="432.1" height="20" fill-opacity=".3"/>
<g font-size="13">
<text x="162" y="59">96</text><text x="186" y="94">512</text><text x="244" y="129">1,563</text><text x="363" y="164">3,732</text><text x="447" y="199">5,261</text><text x="555" y="234">7,219</text><text x="590" y="269">7,888</text>
</g>
<line x1="150" y1="285" x2="590" y2="285" stroke="currentColor"/>
<g stroke="currentColor"><line x1="150" y1="285" x2="150" y2="291"/><line x1="260" y1="285" x2="260" y2="291"/><line x1="370" y1="285" x2="370" y2="291"/><line x1="480" y1="285" x2="480" y2="291"/><line x1="590" y1="285" x2="590" y2="291"/></g>
<g text-anchor="middle" font-size="12"><text x="150" y="306">0</text><text x="260" y="306">2,000</text><text x="370" y="306">4,000</text><text x="480" y="306">6,000</text><text x="590" y="306">8,000</text></g>
<text x="20" y="324" fill-opacity=".7">RSA-2048 counts the modulus only; Falcon-512 and SLH-DSA-SHA2-128s are from Chapters 10 and 12.</text>
</svg>
<figcaption>Figure 9.4. Public key plus signature for one signer. ML-DSA-44 costs about 39 times Ed25519's 96 bytes; Falcon is less than half of ML-DSA-44; the hash-based SLH-DSA puts almost everything in the signature.</figcaption>
</figure>

Speed is where ML-DSA shines. The Dilithium team's round 3 measurements, on one core of an
Intel Core i7-6600U (Skylake) with the AVX2 implementation, were as follows; the
arithmetic is the same in ML-DSA, and the FIPS 204 changes add only a few hashes.

| Skylake cycles (AVX2) | key generation | signing (average) | verification |
|---|---|---|---|
| Dilithium2 (ML-DSA-44) | 124,031 | 333,013 | 118,412 |
| Dilithium3 (ML-DSA-65) | 256,403 | 529,106 | 179,424 |
| Dilithium5 (ML-DSA-87) | 298,050 | 642,192 | 279,936 |

*Table 9.2. Round 3 Dilithium speeds from the CRYSTALS team's published benchmarks. The
portable C reference code is two to five times slower.*

At 3 GHz, 333,013 cycles is about 0.11 milliseconds, so one core signs about nine thousand
ML-DSA-44 messages a second and verifies about twenty-five thousand. That is in the same
range as Ed25519 and far faster than RSA-2048 signing, which takes a few million cycles.
Signing is the variable one: the average hides the loop, and a signature that needs ten
tries takes more than twice the average, so Sebastien Riou and colleagues (ePrint 2026/1333)
argue that benchmarks should report the spread on standard inputs, not a bare average.
Verification has no loop.

## 9.7 The complete code

*Level: intermediate.*

ML-DSA in full, following FIPS 204's algorithms: about 270 lines, more than ML-KEM because of
the rounding, the hints and the bit packing. As in Chapter 8, it is exact, slow and not
constant-time: for reading and checking, never for real keys.

```python
"""ML-DSA (FIPS 204) in plain Python, standard library only. For learning, not for use."""
import hashlib

Q, N, D = 8380417, 256, 13
#                 k  l  eta tau  lambda  gamma1     gamma2          omega
PARAMS = {"ML-DSA-44": (4, 4, 2, 39, 128, 1 << 17, (Q - 1) // 88, 80),
          "ML-DSA-65": (6, 5, 4, 49, 192, 1 << 19, (Q - 1) // 32, 55),
          "ML-DSA-87": (8, 7, 2, 60, 256, 1 << 19, (Q - 1) // 32, 75)}

def H(b, n):  return hashlib.shake_256(b).digest(n)
def G(b, n):  return hashlib.shake_128(b).digest(n)

def mod_pm(r, m):                         # the representative of r mod m in (-m/2, m/2]
    r %= m
    return r - m if r > m // 2 else r

# --- bit packing (Algorithms 16 to 21) ---
def pack(w, bits):                        # each value in `bits` bits, least significant first
    x = 0
    for i, a in enumerate(w):
        x |= a << (i * bits)
    return x.to_bytes(len(w) * bits // 8, "little")

def unpack(b, bits, count=N):
    x = int.from_bytes(b, "little")
    return [(x >> (i * bits)) & ((1 << bits) - 1) for i in range(count)]

def bit_pack(w, a, b):                    # values in [-a, b], stored as b - w
    return pack([b - x for x in w], (a + b).bit_length())

def bit_unpack(v, a, b):
    return [b - x for x in unpack(v, (a + b).bit_length())]

# --- the NTT (Algorithms 41 and 42) ---
def brv8(i):
    return int(format(i, "08b")[::-1], 2)

ZETAS = [pow(1753, brv8(i), Q) for i in range(256)]

def ntt(w):
    w, m, length = list(w), 0, 128
    while length >= 1:
        for start in range(0, N, 2 * length):
            m += 1
            z = ZETAS[m]
            for j in range(start, start + length):
                t = z * w[j + length] % Q
                w[j + length] = (w[j] - t) % Q
                w[j] = (w[j] + t) % Q
        length //= 2
    return w

def ntt_inv(w):
    w, m, length = list(w), 256, 1
    while length < N:
        for start in range(0, N, 2 * length):
            m -= 1
            z = Q - ZETAS[m]
            for j in range(start, start + length):
                t = w[j]
                w[j] = (t + w[j + length]) % Q
                w[j + length] = z * (t - w[j + length]) % Q
        length *= 2
    return [x * 8347681 % Q for x in w]       # 8347681 = 256^-1 mod q

def pmul(a, b):  return [x * y % Q for x, y in zip(a, b)]   # product in NTT form
def padd(a, b):  return [(x + y) % Q for x, y in zip(a, b)]
def psub(a, b):  return [(x - y) % Q for x, y in zip(a, b)]

def mat_vec(A, v_hat):                    # A in NTT form times a vector in NTT form
    out = []
    for row in A:
        acc = [0] * N
        for a, v in zip(row, v_hat):
            acc = padd(acc, pmul(a, v))
        out.append(ntt_inv(acc))
    return out

# --- sampling (Algorithms 29 to 34) ---
def rej_ntt_poly(seed):                   # uniform mod q, from SHAKE128
    out, j, a = G(seed, 894), 0, []
    while len(a) < N:
        if j + 3 > len(out):
            out = G(seed, 2 * len(out))
        z = out[j] + 256 * out[j + 1] + 65536 * (out[j + 2] & 127)
        j += 3
        if z < Q:
            a.append(z)
    return a

def rej_bounded_poly(seed, eta):          # coefficients in [-eta, eta], from SHAKE256
    out, j, a = H(seed, 512), 0, []
    while len(a) < N:
        if j >= len(out):
            out = H(seed, 2 * len(out))
        for b in (out[j] & 15, out[j] >> 4):
            if len(a) < N:
                if eta == 2 and b < 15:
                    a.append((2 - b % 5) % Q)
                elif eta == 4 and b < 9:
                    a.append((4 - b) % Q)
        j += 1
    return a

def expand_a(rho, k, l):
    return [[rej_ntt_poly(rho + bytes([s, r])) for s in range(l)] for r in range(k)]

def expand_s(rho1, k, l, eta):
    s = [rej_bounded_poly(rho1 + r.to_bytes(2, "little"), eta) for r in range(l + k)]
    return s[:l], s[l:]

def expand_mask(rho2, kappa, l, gamma1):
    c = 1 + (gamma1 - 1).bit_length()
    return [[x % Q for x in bit_unpack(H(rho2 + (kappa + r).to_bytes(2, "little"), 32 * c),
                                       gamma1 - 1, gamma1)] for r in range(l)]

def sample_in_ball(seed, tau):            # tau coefficients of +-1, the rest 0
    out = H(seed, 8 + 4 * N)
    signs, j, c = int.from_bytes(out[:8], "little"), 8, [0] * N
    for i in range(N - tau, N):
        while out[j] > i:
            j += 1
        c[i], c[out[j]] = c[out[j]], (Q - 1 if (signs >> (i + tau - N)) & 1 else 1)
        j += 1
    return c

# --- rounding (Algorithms 35 to 40) ---
def power2round(r):
    r0 = mod_pm(r, 1 << D)
    return (r - r0) >> D, r0

def decompose(r, gamma2):
    r0 = mod_pm(r, 2 * gamma2)
    if r - r0 == Q - 1:
        return 0, r0 - 1
    return (r - r0) // (2 * gamma2), r0

def high_bits(r, g2):  return decompose(r, g2)[0]
def low_bits(r, g2):   return decompose(r, g2)[1]

def make_hint(z, r, g2):
    return int(high_bits(r, g2) != high_bits((r + z) % Q, g2))

def use_hint(h, r, g2):
    m = (Q - 1) // (2 * g2)
    r1, r0 = decompose(r, g2)
    if h and r0 > 0:
        return (r1 + 1) % m
    if h:
        return (r1 - 1) % m
    return r1

def inf_norm(vec):
    return max(abs(mod_pm(x, Q)) for p in vec for x in p)

def w1_encode(w1, g2):
    bits = ((Q - 1) // (2 * g2) - 1).bit_length()
    return b"".join(pack(p, bits) for p in w1)

# --- encodings (Algorithms 22 to 28) ---
def hint_pack(h, omega, k):
    y, idx = bytearray(omega + k), 0
    for i in range(k):
        for j in range(N):
            if h[i][j]:
                y[idx] = j
                idx += 1
        y[omega + i] = idx
    return bytes(y)

def hint_unpack(y, omega, k):
    h, idx = [[0] * N for _ in range(k)], 0
    for i in range(k):
        if y[omega + i] < idx or y[omega + i] > omega:
            return None
        first = idx
        while idx < y[omega + i]:
            if idx > first and y[idx - 1] >= y[idx]:
                return None
            h[i][y[idx]] = 1
            idx += 1
    if any(y[idx:omega]):
        return None
    return h

def sk_decode(sk, k, l, eta):
    rho, K, tr, pos = sk[:32], sk[32:64], sk[64:128], 128
    w = (2 * eta).bit_length() * 32
    s = []
    for _ in range(l + k):
        s.append([x % Q for x in bit_unpack(sk[pos:pos + w], eta, eta)])
        pos += w
    t0 = [[x % Q for x in bit_unpack(sk[pos + 416 * i:pos + 416 * (i + 1)], (1 << 12) - 1, 1 << 12)]
          for i in range(k)]
    return rho, K, tr, s[:l], s[l:], t0

# --- ML-DSA (Algorithms 6 to 8: the internal functions) ---
def keygen(params, xi):
    k, l, eta, tau, lam, g1, g2, omega = PARAMS[params]
    seeds = H(xi + bytes([k, l]), 128)
    rho, rho1, K = seeds[:32], seeds[32:96], seeds[96:]
    A = expand_a(rho, k, l)
    s1, s2 = expand_s(rho1, k, l, eta)
    t = [padd(x, e) for x, e in zip(mat_vec(A, [ntt(p) for p in s1]), s2)]
    t1 = [[power2round(x)[0] for x in p] for p in t]
    t0 = [[power2round(x)[1] for x in p] for p in t]
    pk = rho + b"".join(pack(p, 10) for p in t1)
    tr = H(pk, 64)
    sk = (rho + K + tr + b"".join(bit_pack([mod_pm(x, Q) for x in p], eta, eta) for p in s1 + s2)
          + b"".join(bit_pack(p, (1 << 12) - 1, 1 << 12) for p in t0))
    return pk, sk

def sign_internal(params, sk, m_prime, rnd, mu=None):
    k, l, eta, tau, lam, g1, g2, omega = PARAMS[params]
    beta = tau * eta
    rho, K, tr, s1, s2, t0 = sk_decode(sk, k, l, eta)
    s1h, s2h, t0h = [ntt(p) for p in s1], [ntt(p) for p in s2], [ntt(p) for p in t0]
    A = expand_a(rho, k, l)
    if mu is None:
        mu = H(tr + m_prime, 64)
    rho2 = H(K + rnd + mu, 64)
    kappa = 0
    while True:
        y = expand_mask(rho2, kappa, l, g1)
        kappa += l
        w = mat_vec(A, [ntt(p) for p in y])
        w1 = [[high_bits(x, g2) for x in p] for p in w]
        c_tilde = H(mu + w1_encode(w1, g2), lam // 4)
        ch = ntt(sample_in_ball(c_tilde, tau))
        cs1 = [ntt_inv(pmul(ch, p)) for p in s1h]
        cs2 = [ntt_inv(pmul(ch, p)) for p in s2h]
        z = [padd(a, b) for a, b in zip(y, cs1)]
        r = [psub(a, b) for a, b in zip(w, cs2)]
        if inf_norm(z) >= g1 - beta or max(abs(low_bits(x, g2)) for p in r for x in p) >= g2 - beta:
            continue                                          # reject: would leak s1 or s2
        ct0 = [ntt_inv(pmul(ch, p)) for p in t0h]
        h = [[make_hint((Q - a) % Q, (b + a) % Q, g2) for a, b in zip(pc, pr)]
             for pc, pr in zip(ct0, r)]
        if inf_norm(ct0) >= g2 or sum(map(sum, h)) > omega:
            continue
        return (c_tilde + b"".join(bit_pack([mod_pm(x, Q) for x in p], g1 - 1, g1) for p in z)
                + hint_pack(h, omega, k))

def verify_internal(params, pk, m_prime, sig, mu=None):
    k, l, eta, tau, lam, g1, g2, omega = PARAMS[params]
    beta, zlen = tau * eta, 32 * (1 + (g1 - 1).bit_length())
    if len(pk) != 32 + 320 * k or len(sig) != lam // 4 + l * zlen + omega + k:
        return False
    rho, t1 = pk[:32], [unpack(pk[32 + 320 * i:32 + 320 * (i + 1)], 10) for i in range(k)]
    c_tilde, pos = sig[:lam // 4], lam // 4
    z = [[x % Q for x in bit_unpack(sig[pos + zlen * i:pos + zlen * (i + 1)], g1 - 1, g1)]
         for i in range(l)]
    h = hint_unpack(sig[pos + zlen * l:], omega, k)
    if h is None or inf_norm(z) >= g1 - beta:
        return False
    A = expand_a(rho, k, l)
    if mu is None:
        mu = H(H(pk, 64) + m_prime, 64)
    ch = ntt(sample_in_ball(c_tilde, tau))
    Az = mat_vec(A, [ntt(p) for p in z])
    ct1 = [ntt_inv(pmul(ch, ntt([(x << D) % Q for x in p]))) for p in t1]
    w_approx = [psub(a, b) for a, b in zip(Az, ct1)]
    w1 = [[use_hint(hb, x, g2) for hb, x in zip(ph, p)] for ph, p in zip(h, w_approx)]
    return c_tilde == H(mu + w1_encode(w1, g2), lam // 4)

# --- the external interface (Algorithms 2 and 3): pure ML-DSA with a context string ---
def sign(params, sk, msg, ctx=b"", rnd=bytes(32)):
    assert len(ctx) <= 255
    return sign_internal(params, sk, bytes([0, len(ctx)]) + ctx + msg, rnd)

def verify(params, pk, msg, sig, ctx=b""):
    return len(ctx) <= 255 and verify_internal(params, pk, bytes([0, len(ctx)]) + ctx + msg, sig)
```

NIST's ACVP server publishes 75 key-generation, 360 signing and 180 verification tests for
FIPS 204, covering deterministic and hedged signing, the pure and pre-hash forms, contexts,
the internal interface and an "external $\mu$" mode. This code reproduces all 615: every key
and signature byte for byte, and every verification verdict, including the signatures
built to be rejected. The listing below checks one key-generation vector per parameter set
(by hash) and then signs a message with each.

```python
# Uses keygen() and sign() from the listing above.
# One NIST ACVP key-generation vector per parameter set, compared by SHA3-256 hash,
# then a deterministic signature on a fixed message.
import hashlib
VECTORS = [
    ("ML-DSA-44",
     "7194B13C95231010AFD2C909992BD2003BA6F437C3886BDBE3F6B867A14BA161",
     "d8d9aa0403ddc91a7f2ab668fea9e85f59a6f519beb9499ffc937d6ed76442e3",
     "0772f7ccc3674b859c9ed70da44b3559cec44bbdf75b8ea31e04a23fa6871b24"),
    ("ML-DSA-65",
     "A991FD42B071D49C48AE3E75C647459E0DAAD1E1BA356A04801912D3294BCFF8",
     "0083e4d4f562780dd5ef685c88db5afcdac44d1b4be5e4253d0de771100316f3",
     "9a6fe5796bc8b61c6eb274cc5905b3d3ce21693c9e7fd32db79b1cff49e93717"),
    ("ML-DSA-87",
     "A16F5B0796703E2D1A0140A35CBF36EFABE70E752BA59B6A9A0E9C4B05302F73",
     "9df39232077a88b3b36c0d4b37d2d369f942baaaa436cf5486a1f09d45d7ce0b",
     "c41388f22cf3bc0ce79eb5fccfafeee5ec31e3d4321a8befe7f230d6c4841cf0"),
]
for name, seed, pk_hash, sk_hash in VECTORS:
    pk, sk = keygen(name, bytes.fromhex(seed))
    ok = (hashlib.sha3_256(pk).hexdigest() == pk_hash and
          hashlib.sha3_256(sk).hexdigest() == sk_hash)
    sig = sign(name, sk, b"Arcadia City, firmware 4.2")
    print(f"{name}: pk {len(pk)} B, sk {len(sk)} B, signature {len(sig)} B, matches NIST: {ok}")
```

It prints:

```text
ML-DSA-44: pk 1312 B, sk 2560 B, signature 2420 B, matches NIST: True
ML-DSA-65: pk 1952 B, sk 4032 B, signature 3309 B, matches NIST: True
ML-DSA-87: pk 2592 B, sk 4896 B, signature 4627 B, matches NIST: True
```

The sizes agree with Table 9.1.

**Code it.** Back to the hints of §9.5: how many does a real signature carry, and could it do
without them?

```python
# Uses sign() and verify() from the listing above.
# How many hints does a signature carry, and what happens without them?
import hashlib
P = "ML-DSA-44"
k, l, eta, tau, lam, g1, g2, omega = PARAMS[P]
pk, sk = keygen(P, hashlib.sha3_256(b"hint demo").digest())
counts, still_ok = [], 0
for i in range(30):
    msg = b"report %d" % i
    sig = sign(P, sk, msg)
    hint_part = sig[-(omega + k):]
    counts.append(hint_part[-1])                 # the last count byte = total hints
    no_hints = sig[:-(omega + k)] + bytes(omega + k)
    still_ok += verify(P, pk, msg, no_hints)
print("hints per signature: min", min(counts), " max", max(counts),
      " average", round(sum(counts) / len(counts), 1), " (limit omega =", omega, "of", k * 256, ")")
print("signatures that still verify with the hints removed:", still_ok, "of 30")
```

It prints:

```text
hints per signature: min 50  max 76  average 63.2  (limit omega = 80 of 1024 )
signatures that still verify with the hints removed: 0 of 30
```

About six percent of coefficients need a hint, and every signature fails without them. The
hints cost 84 bytes of an ML-DSA-44 signature and save 1,664 bytes of public key.


## 9.8 Using it: contexts, hedging and the loop

*Level: intermediate.*

FIPS 204's external signing function formats the message as

$$M' = 0 \,\|\, |\mathit{ctx}| \,\|\, \mathit{ctx} \,\|\, M,$$

where $\mathit{ctx}$ is a **context string** of up to 255 bytes, empty by default. An
application can put its own name there, so that a signature made for one purpose is never
valid for another, even under the same key. The leading 0 byte says "pure ML-DSA"; HashML-DSA
(§9.9) uses 1.

**Hedged or deterministic.** With $\mathit{rnd}$ = 32 fresh random bytes (the default in FIPS
204, called hedged) the mask depends on both the key and fresh randomness, so two
signatures of the same message differ. With $\mathit{rnd}$ = 32 zero bytes (deterministic) they
are identical. Both are secure if implemented correctly. Hedged signing is preferred because
deterministic signing is easier to attack with faults: if an attacker can disturb one of two
signings of the same message, the difference between the faulty and correct signatures can
reveal the key (Bruinderink and Pessl, 2018). Mixing in randomness defeats that, and mixing
in the key still protects against a bad random number generator.

```python
# Uses keygen(), sign() and verify() from the listing above.
import hashlib
P = "ML-DSA-65"
pk, sk = keygen(P, hashlib.sha3_256(b"Arcadia City update key").digest())
msg = b"firmware 4.2 for the air plant, district 3"
sig = sign(P, sk, msg, ctx=b"firmware")
print("valid signature verifies:      ", verify(P, pk, msg, sig, ctx=b"firmware"))
print("one byte of message changed:   ", verify(P, pk, msg[:-1] + b"4", sig, ctx=b"firmware"))
print("same signature, other context: ", verify(P, pk, msg, sig, ctx=b"chat"))
bad = bytearray(sig); bad[500] ^= 1
print("one bit of signature flipped:  ", verify(P, pk, msg, bytes(bad), ctx=b"firmware"))
det1, det2 = sign(P, sk, msg), sign(P, sk, msg)
hed1 = sign(P, sk, msg, rnd=hashlib.sha3_256(b"fresh randomness 1").digest())
hed2 = sign(P, sk, msg, rnd=hashlib.sha3_256(b"fresh randomness 2").digest())
print("deterministic: two signatures equal:", det1 == det2)
print("hedged: two signatures equal:       ", hed1 == hed2,
      " both verify:", verify(P, pk, msg, hed1) and verify(P, pk, msg, hed2))
```

It prints:

```text
valid signature verifies:       True
one byte of message changed:    False
same signature, other context:  False
one bit of signature flipped:   False
deterministic: two signatures equal: True
hedged: two signatures equal:        False  both verify: True
```

### Deterministic, hedged, and what a fault buys

FIPS 204 makes hedged signing the default and permits the deterministic variant.
Deterministic signing has two honest uses: platforms with no trustworthy randomness, and
known-answer testing (NIST's ACVP vectors cover both modes, supplying $\mathit{rnd}$ as an
input for hedged ones). Everywhere else, hedge. The reason is the fault attack, which [Chapter 17](17-Implementing-Post-Quantum-Safely.md)
carries out in full (§17.6 and §17.7) and the Cryptanalysis book places among the nonce
failures of every Schnorr-like scheme
([Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md); its
[Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md) has the attacker's view
of side channels). In brief: in deterministic mode the same message gives the same mask
$\mathbf{y}$; a glitch that changes $c$ on a second signing yields $\mathbf{z}_1 - \mathbf{z}_2 = (c_1 -
c_2)\,\mathbf{s}_1$, and $\mathbf{s}_1$ falls out of one linear solve.

A natural hope is that half the key is not enough: the attacker lacks $\mathbf{s}_2$ and
$\mathbf{t}_0$. The hope is false. From the public key,

$$\mathbf{A}\mathbf{s}_1 - \mathbf{t}_1 \cdot 2^{13} = \mathbf{t} - \mathbf{s}_2 - \mathbf{t}_1 \cdot 2^{13}
= \mathbf{t}_0 - \mathbf{s}_2,$$

so anyone holding $\mathbf{s}_1$ knows the small vector $\mathbf{t}_0 - \mathbf{s}_2$, and that is all a
signer needs. Choose $\mathbf{y}$, compute $\mathbf{w} = \mathbf{A}\mathbf{y}$, hash its high bits to get
$c$, set $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$; the verifier will compute $\mathbf{A}\mathbf{z} -
c\,\mathbf{t}_1 2^{13} = \mathbf{w} + c(\mathbf{t}_0 - \mathbf{s}_2)$, which the forger can compute
too, and the hints from there back to HighBits$(\mathbf{w})$ follow directly.

**Break it.** A forger with $\mathbf{s}_1$ and the public key, nothing else.

```python
# Uses keygen(), sk_decode(), verify() and the helpers from the listing above.
# A fault attack that recovers only s1 is enough: sign with s1 and the public key alone.
import hashlib, random

def forge(params, pk, s1, msg, ctx=b""):
    k, l, eta, tau, lam, g1, g2, omega = PARAMS[params]
    rho, t1 = pk[:32], [unpack(pk[32 + 320 * i:32 + 320 * (i + 1)], 10) for i in range(k)]
    A = expand_a(rho, k, l)
    mu = H(H(pk, 64) + bytes([0, len(ctx)]) + ctx + msg, 64)
    rng = random.Random(1)
    while True:
        y = [[rng.randrange(-g1 + 1, g1 + 1) % Q for _ in range(N)] for _ in range(l)]
        w = mat_vec(A, [ntt(p) for p in y])
        c_tilde = H(mu + w1_encode([[high_bits(x, g2) for x in p] for p in w], g2), lam // 4)
        ch = ntt(sample_in_ball(c_tilde, tau))
        z = [padd(a, ntt_inv(pmul(ch, ntt(s)))) for a, s in zip(y, s1)]
        if inf_norm(z) >= g1 - tau * eta:
            continue                      # z must still pass the verifier's size check
        # the verifier's value, A z - c t1 2^13, and hints from it back to HighBits(w)
        ct1 = [ntt_inv(pmul(ch, ntt([(x << D) % Q for x in p]))) for p in t1]
        w_v = [psub(a, b) for a, b in zip(mat_vec(A, [ntt(p) for p in z]), ct1)]
        diff = [psub(a, b) for a, b in zip(w, w_v)]
        h = [[make_hint(d, b, g2) for d, b in zip(pd, pv)] for pd, pv in zip(diff, w_v)]
        if inf_norm(diff) >= g2 or sum(map(sum, h)) > omega:
            continue
        return (c_tilde + b"".join(bit_pack([mod_pm(x, Q) for x in p], g1 - 1, g1) for p in z)
                + hint_pack(h, omega, k))

P = "ML-DSA-44"
pk, sk = keygen(P, hashlib.sha3_256(b"air plant controller").digest())
s1 = sk_decode(sk, *PARAMS[P][:3])[3]           # what the fault attack recovered
fake = forge(P, pk, s1, b"open all airlocks")
print("forged with s1 only, verifies:", verify(P, pk, b"open all airlocks", fake))
```

It prints:

```text
forged with s1 only, verifies: True
```

So any leak of $\mathbf{s}_1$, by a fault, by power analysis of $c\,\mathbf{s}_1$, or by a bug
that publishes a rejected $\mathbf{z}$, is a total break.

**Fix it.** Hedged signing removes the repeated $\mathbf{y}$ the attack needs. It does not stop
every fault (a glitch that skips the rejection check releases a $\mathbf{z}$ carrying the
key's imprint), so careful signers also verify each signature before releasing it, at about a
third of the cost of signing.

**Mars.** Faults are not only an attacker's tool. Mars has no global magnetic field and a
thin atmosphere, so cosmic rays flip bits in electronics far more often than on Earth's
surface. A deterministic signer in Arcadia City that re-signs a status report after a dropped
link, and suffers one bit flip in the challenge, has handed its key to anyone who reads both
signatures. Arcadia's signers therefore run hedged, verify before
release, and never retransmit by re-signing: they resend the stored signature.

**The loop.** Each try costs a matrix-vector product and several NTTs. The listing counts
tries over 200 signatures per parameter set.

```python
# Uses sign_internal() from the listing above.
# Count the trips through the signing loop: kappa grows by l on each try.
import hashlib
counts = {}
real_expand_mask = expand_mask
def counting_expand_mask(rho2, kappa, l, gamma1):
    counts[NAME] += 1
    return real_expand_mask(rho2, kappa, l, gamma1)
expand_mask = counting_expand_mask
for NAME in PARAMS:
    counts[NAME] = 0
    pk, sk = keygen(NAME, hashlib.sha3_256(NAME.encode()).digest())
    for i in range(200):
        sign_internal(NAME, sk, b"message %d" % i, bytes(32))
    print(NAME, "average tries per signature over 200:", counts[NAME] / 200)
```

It prints:

```text
ML-DSA-44 average tries per signature over 200: 4.185
ML-DSA-65 average tries per signature over 200: 4.635
ML-DSA-87 average tries per signature over 200: 4.28
```

The averages come out near the expected values of §9.6; 200 signatures are too few to pin
them down more closely, since the count varies a lot from one signature to the next. The
number of tries depends only on the random masks and is safe to leak; the values computed in
rejected tries are not.

## 9.9 HashML-DSA and pre-hashing

*Level: intermediate.*

Pure ML-DSA reads the whole message twice in a sense: $\mu = H(tr \,\|\, M')$ must be computed
before the loop starts, so the message must be available when signing begins. That is a
problem for a hardware security module signing a 2-gigabyte disk image sent over a slow
link. FIPS 204 offers two answers.

**External $\mu$.** The caller computes $\mu = H(tr \,\|\, M')$ itself, where the message is,
and sends only the 64 bytes of $\mu$ to the signer. The signature is exactly the pure ML-DSA
signature, so verifiers need nothing new. NIST's test vectors include this mode, and the
code above supports it through the `mu` argument.

**HashML-DSA.** The message is first hashed with an approved hash function, and the signer
signs

$$M' = 1 \,\|\, |\mathit{ctx}| \,\|\, \mathit{ctx} \,\|\, \mathrm{OID}(\mathrm{PH}) \,\|\, \mathrm{PH}(M),$$

with the hash function's object identifier included so that a digest from one hash cannot be
passed off as a digest from another. The leading 1 makes HashML-DSA signatures and pure
signatures different objects: neither verifies as the other.

```python
# Uses sign_internal() and verify_internal() from the listing above.
# HashML-DSA: sign a SHA-512 digest of the message, marked with SHA-512's object identifier.
import hashlib
SHA512_OID = bytes.fromhex("0609608648016503040203")      # DER for 2.16.840.1.101.3.4.2.3

def hash_sign(params, sk, msg, ctx=b"", rnd=bytes(32)):
    m_prime = bytes([1, len(ctx)]) + ctx + SHA512_OID + hashlib.sha512(msg).digest()
    return sign_internal(params, sk, m_prime, rnd)

def hash_verify(params, pk, msg, sig, ctx=b""):
    m_prime = bytes([1, len(ctx)]) + ctx + SHA512_OID + hashlib.sha512(msg).digest()
    return verify_internal(params, pk, m_prime, sig)

P = "ML-DSA-87"
pk, sk = keygen(P, hashlib.sha3_256(b"ground station").digest())
image = bytes(range(256)) * 4000                          # a 1 MB "firmware image"
sig = hash_sign(P, sk, image)
print("HashML-DSA signature verifies:          ", hash_verify(P, pk, image, sig))
print("accepted as a pure ML-DSA signature:    ", verify(P, pk, image, sig))
pure = sign(P, sk, image)
print("pure signature accepted as HashML-DSA:  ", hash_verify(P, pk, image, pure))
```

It prints:

```text
HashML-DSA signature verifies:           True
accepted as a pure ML-DSA signature:     False
pure signature accepted as HashML-DSA:   False
```

### External μ in practice

External $\mu$ splits pure ML-DSA at its first line. Everything before $\mu$ needs only
public data: the public key (for $tr$), the context string and the message. Everything
after needs the private key but only 64 bytes of input. So the expensive, message-sized
work can run wherever the message is, and the small, secret work wherever the key is.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="External mu flow. On the host, next to the large message, tr = H(pk), M prime = 0, length of ctx, ctx, M, and mu = H(tr, M prime) are computed. Only the 64-byte mu goes to the signing module, which holds the private key and runs the signing loop. The signature comes back and any ordinary ML-DSA verifier checks it against pk, M and ctx." fill="currentColor" font-size="14">
<rect x="20" y="20" width="260" height="150" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="34" y="44">Host, next to the message M</text>
<text x="34" y="74" font-size="13">tr = H(pk), 64 bytes (public)</text>
<text x="34" y="98" font-size="13">M′ = 0 ‖ len(ctx) ‖ ctx ‖ M</text>
<text x="34" y="122" font-size="13">μ = H(tr ‖ M′), 64 bytes</text>
<text x="34" y="152" font-size="13" fill-opacity=".7">reads all of M; no secrets</text>
<rect x="380" y="20" width="240" height="150" rx="6" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.6"/>
<text x="394" y="44">Signing module (holds sk)</text>
<text x="394" y="74" font-size="13">ρ″ = H(K ‖ rnd ‖ μ)</text>
<text x="394" y="98" font-size="13">loop: y, w, c̃, z, checks, h</text>
<text x="394" y="122" font-size="13">output σ = (c̃, z, h)</text>
<text x="394" y="152" font-size="13" fill-opacity=".7">never sees M</text>
<line x1="280" y1="70" x2="372" y2="70" stroke="currentColor" stroke-width="1.6"/><path d="M370 65 L380 70 L370 75 Z"/>
<text x="330" y="60" text-anchor="middle" font-size="13">μ (64 B)</text>
<line x1="380" y1="125" x2="288" y2="125" stroke="currentColor" stroke-width="1.6"/><path d="M290 120 L280 125 L290 130 Z"/>
<text x="330" y="145" text-anchor="middle" font-size="13">σ</text>
<rect x="150" y="210" width="340" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="236" text-anchor="middle">Any verifier: ordinary ML-DSA.Verify</text>
<text x="320" y="258" text-anchor="middle" font-size="13">(pk, M, σ, ctx), nothing new to support</text>
<line x1="150" y1="170" x2="190" y2="208" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="500" y1="170" x2="450" y2="208" stroke="currentColor" stroke-dasharray="4 3"/>
</svg>
<figcaption>Figure 9.5. External μ. The host does the message-sized hashing with public data only; the module holding the key receives 64 bytes and returns an ordinary pure ML-DSA signature. Because tr = H(pk) is inside μ, a μ computed for the wrong key yields a signature that fails.</figcaption>
</figure>

**Code it.** The host and the module, played by the same program: the signature from
external $\mu$ is byte for byte the one the module would have made from the whole message.

```python
# Uses keygen(), sign_internal(), sign() and verify() from the listing above.
# External mu: the host hashes the message, the signing module sees only 64 bytes.
import hashlib
P = "ML-DSA-65"
pk, sk = keygen(P, hashlib.sha3_256(b"Arcadia ground station HSM").digest())
image = bytes(range(256)) * 4000                     # the 1 MB update, on the host
ctx = b"door-locks"

# On the host, next to the image: tr = H(pk), M' = 0 || len(ctx) || ctx || M, mu = H(tr || M')
tr = H(pk, 64)
m_prime = bytes([0, len(ctx)]) + ctx + image
mu = H(tr + m_prime, 64)
print("bytes sent to the signing module:", len(mu))

# In the module: Algorithm 7 started from mu (deterministic here, so it can be compared)
sig = sign_internal(P, sk, b"", bytes(32), mu=mu)
print("same as signing the whole image inside: ", sig == sign(P, sk, image, ctx=ctx))
print("an ordinary verifier accepts it:         ", verify(P, pk, image, sig, ctx=ctx))

# mu binds the key: a mu computed with another key's tr gives a signature that fails
other_pk, _ = keygen(P, hashlib.sha3_256(b"some other key").digest())
bad_mu = H(H(other_pk, 64) + m_prime, 64)
print("mu built with the wrong public key:      ",
      verify(P, pk, image, sign_internal(P, sk, b"", bytes(32), mu=bad_mu), ctx=ctx))
```

It prints:

```text
bytes sent to the signing module: 64
same as signing the whole image inside:  True
an ordinary verifier accepts it:          True
mu built with the wrong public key:       False
```

This is not a hypothetical interface. When AWS added ML-DSA keys to its Key Management
Service in June 2025, it added a message type called `EXTERNAL_MU` to the signing call, for
exactly this reason. Two cautions apply. The module signs whatever 64 bytes it is given, so
the host is trusted to compute $\mu$ from the right message, as a classical HSM trusts a
caller that sends a digest. And the module cannot enforce a context-string policy, because
the context went into $\mu$ before it arrived.

### Which to use

Most guidance, NIST's and the IETF's, comes down to a short list.

1. **Pure ML-DSA, empty context string,** for anything that follows an existing protocol
   specification. RFC 9881 (X.509, October 2025) and RFC 9882 (CMS, October 2025) use pure
   ML-DSA only; the TLS draft (draft-ietf-tls-mldsa) requires the empty context. A context
   string is for your own protocol, documented and the same at both ends.
2. **External $\mu$** when the message is large or far from the key: HSMs, cloud key
   services, smart cards. Verifiers need nothing new.
3. **HashML-DSA** only when an interface fixes the input as a digest made elsewhere and the
   verifier, too, works from the digest: some legacy signing APIs and document formats are
   built that way. The pre-hash must match the parameter set's strength (FIPS 204 asks for
   at least $\lambda$ bits of collision and second-preimage resistance, so SHA-256 is enough
   for ML-DSA-44 but SHA-512 or SHAKE256 is needed for ML-DSA-87), and the verifier must
   be told which hash was used.

Pure signing is preferred less for strength than to avoid confusion: the domain-separation
byte stops one kind of signature verifying as the other, but a key should still be used in
one mode only.

## 9.10 Security

*Level: expert.*

**What is proven.** Kiltz, Lyubashevsky and Schaffner (EUROCRYPT 2018) proved that Dilithium
is existentially unforgeable under chosen-message attack in the quantum random oracle model,
assuming Module-LWE and a variant called SelfTargetMSIS. The second is the problem of
finding a short $\mathbf{z}$ (and small $c$) with $H(\mu \,\|\, \mathrm{HighBits}(\mathbf{A}\mathbf{z} -
c\,\mathbf{t})) = c$: forgery in its plainest form. It is not reducible to plain MSIS in the
quantum setting without losses, so the concrete parameters are chosen against the best known
attacks on both problems, using the estimator of Chapter 6. FIPS 204 also claims strong
unforgeability: given signatures, an attacker cannot make a different valid signature even
of the same message.

**Binding to the key.** $\mu$ includes $tr = H(\mathrm{pk})$, so a signature is valid only for the
key it was made with. That gives ML-DSA the "exclusive ownership" properties of Cremers and
others' BUFF framework (2021) that some older schemes lack, which prevents attacks where an
adversary finds a second key that accepts an existing signature.

### The proof in outline

A security proof is a chain of reductions: anyone who could forge could also solve a
better-studied lattice problem. [Chapter 3](03-KEMs-and-Signatures.md) explained the quantum
random oracle model the proof lives in, and the Mathematics book's
[Chapter 19](../mathematics/19-Complexity-and-Reductions.md) explains reductions. ML-DSA's
chain has four links (Figure 9.6).

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="The ML-DSA proof chain as five boxes from top to bottom: a forger with chosen messages and quantum hash access; a forger with no signing oracle; a forger against a random public key; a SelfTargetMSIS solver; a Module-SIS solver. The arrows are labeled: simulate signatures and program the hash; Module-LWE; the same problem; forking or measure-and-reprogram, with a loss." fill="currentColor" font-size="14">
<rect x="20" y="20" width="290" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="34" y="47">Forger: chosen messages, quantum H</text>
<rect x="20" y="100" width="290" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="34" y="127">Forger with no signing oracle</text>
<rect x="20" y="180" width="290" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="34" y="207">Forger against a random (A, t)</text>
<rect x="20" y="260" width="290" height="44" rx="5" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.6"/>
<text x="34" y="287">SelfTargetMSIS solver</text>
<rect x="20" y="330" width="290" height="44" rx="5" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.6"/>
<text x="34" y="357">Module-SIS solver</text>
<g stroke="currentColor" stroke-width="1.6">
<line x1="165" y1="64" x2="165" y2="92"/><line x1="165" y1="144" x2="165" y2="172"/><line x1="165" y1="224" x2="165" y2="252"/><line x1="165" y1="304" x2="165" y2="322"/>
</g>
<path d="M160 90 L165 100 L170 90 Z"/><path d="M160 170 L165 180 L170 170 Z"/><path d="M160 250 L165 260 L170 250 Z"/><path d="M160 320 L165 330 L170 320 Z"/>
<g font-size="13">
<text x="330" y="76">1. simulate signatures without the key:</text>
<text x="330" y="94" fill-opacity=".7">z uniform in the box, program H</text>
<text x="330" y="156">2. replace t = As₁ + s₂ by uniform t:</text>
<text x="330" y="174" fill-opacity=".7">costs the Module-LWE advantage</text>
<text x="330" y="236">3. a forgery is a short (z, c, u)</text>
<text x="330" y="254" fill-opacity=".7">that hashes to c: the same problem</text>
<text x="330" y="306">4. fork (ROM) or measure-and-reprogram</text>
<text x="330" y="324" fill-opacity=".7">(QROM): loose; parameters assume equal</text>
<text x="330" y="342" fill-opacity=".7">hardness and are set by known attacks</text>
</g>
</svg>
<figcaption>Figure 9.6. The chain of reductions behind ML-DSA. Links 1 to 3 are tight in the quantum random oracle model (Kiltz, Lyubashevsky and Schaffner, 2018, with the gap closed in 2023). Link 4 loses a lot, which is why the parameters are chosen from attacks rather than from the proof.</figcaption>
</figure>

**1. Remove the signing oracle.** The attacker may ask for signatures on messages of its
choice, and the reduction, which has no private key, must fake them perfectly. Here §9.3 pays
off: a kept $\mathbf{z}$ is uniform on the small box, whatever the key. So the simulator picks $\mathbf{z}$ uniform on that box and $c$ at random,
computes the commitment backwards from the public key as
$\mathbf{w}_1 = \mathrm{HighBits}(\mathbf{A}\mathbf{z} - c\,\mathbf{t})$, and then *programs* the random
oracle so that $H(\mu \,\|\, \mathbf{w}_1)$ returns this $c$. This honest-verifier
zero-knowledge step needs three things: kept transcripts independent of the key (rejection),
recomputed high bits that match the real ones (the second check, as in the toy of §9.5), and
a programmed input the attacker has not already queried ($\mathbf{w}_1$ has plenty of entropy
from the mask). The analysis treats $\mathbf{t}_0$ as public; keeping it secret is a margin.

In the QROM, programming is the delicate step, because a quantum attacker may have queried
$H$ on a superposition including the programmed point; Grilo, Hövelmanns, Hülsing and Majenz
(ASIACRYPT 2021) gave a general, tight lemma for this "adaptive reprogramming".

**2. Make the key random.** The public key $\mathbf{t} = \mathbf{A}\mathbf{s}_1 + \mathbf{s}_2$ is a
Module-LWE sample (Mathematics book, [Chapter 15](../mathematics/15-Learning-with-Errors.md)).
If the attacker forged noticeably more often against real keys than against a uniformly random
$\mathbf{t}$, it would be a Module-LWE distinguisher. So from here on the key is random and has
no secret behind it at all.

**3. Read the forgery as a lattice solution.** A valid forgery $(\tilde c, \mathbf{z}, \mathbf{h})$
against a random key gives a short $\mathbf{z}$, a sparse $c$ and a small rounding term
$\mathbf{u}$ with

$$H\big(\mu \,\|\, [\mathbf{A} \mid \mathbf{t} \mid \mathbf{I}]\cdot(\mathbf{z}, -c, \mathbf{u})\big) = c,$$

after the high bits are taken. A short vector whose image under a random matrix hashes to part
of itself is exactly **SelfTargetMSIS**. Together the first three steps are tight: success
$\varepsilon$ for the forger gives success about $\varepsilon$, minus the Module-LWE advantage,
for the solver. That quantum tightness was the main result of the 2018 paper.

**4. From SelfTargetMSIS to plain Module-SIS.** Classically, the forking lemma rewinds the
solver to the moment it asked for $c$, answers differently, and hopes for a second solution
with the same commitment; the two subtract to a short vector in the kernel of
$[\mathbf{A} \mid \mathbf{t} \mid \mathbf{I}]$, a Module-SIS solution. Success drops to roughly
its square divided by the number of hash queries. A quantum attacker cannot simply be rewound,
but the measure-and-reprogram technique of Don, Fehr, Majenz and Schaffner (CRYPTO 2019) and
Liu and Zhandry's work the same year give a quantum version, losing a factor around the square
of the number of queries. No attack on SelfTargetMSIS beats attacking Module-SIS directly, so
parameters treat the two as equally hard and are estimated with the lattice estimator
([Chapter 6](06-Lattice-Reduction-and-the-Estimator.md)).

**The 2023 gap.** In 2023 two groups found a subtle error that affected proofs of every
Fiat-Shamir with aborts scheme, Dilithium included. Manuel Barbosa, Gilles Barthe and eight
co-authors hit it while formalizing the 2018 proof in the EasyCrypt proof assistant; Julien
Devevey, Pouria Fallahpour, Alain Passelègue and Damien Stehlé found it independently. Both
papers appeared at CRYPTO 2023. The real signer also queries the hash on the commitments of
its rejected tries, and whether a try is rejected depends on the answer; the earlier
simulations missed how that skews the hash outputs. The fixes show that rejected tries can be
simulated too, give new proofs in both models, and confirm Dilithium's claimed security
levels; Barbosa and colleagues also machine-checked the classical proof. Rejected values,
again, are not harmless leftovers.

**Strong unforgeability** also needs each signature to have exactly one valid encoding, so
HintBitUnpack rejects positions out of order, decreasing counts and nonzero padding. The
draft of FIPS 204 omitted one of these checks by accident; Mike Hamburg pointed it out, and
the final standard restored it.

**Side channels.** ML-DSA's arithmetic is integer-only and its sampling is rejection-based,
which makes constant-time code straightforward compared with Falcon (Chapter 10). The
dangerous values are the secret-dependent ones: $c\,\mathbf{s}_1$, $\mathbf{y}$ and the
low bits. Published power-analysis attacks recover keys from unprotected implementations
on microcontrollers; masked implementations exist but cost several times the plain one.
Chapter 17 returns to this, and the Cryptanalysis book's
[Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md) shows the attacks from
the other side. The number of tries is the one value that may leak: it depends only on the
masks, which are fresh for every signature.

## 9.11 From Dilithium to FIPS 204

*Level: expert.*

Dilithium was submitted in November 2017 and frozen as specification version 3.1 in February
2021. NIST selected it in July 2022, published a draft FIPS 204 on 24 August 2023, received
comments from 37 commenters and published the final standard on 13 August 2024. The changes
are small in code and large in consequence: no two of the three versions interoperate.

| What | Dilithium round 3.1 | FIPS 204 | Why |
|---|---|---|---|
| $tr = H(\mathrm{pk})$ | 32 bytes | 64 bytes (draft) | stronger BUFF properties |
| $\tilde c$ | 32 bytes for all sets | $\lambda/4$: 32, 48, 64 bytes (draft) | stronger BUFF properties at levels 3 and 5 |
| signing randomness | deterministic by default; randomized mode used a random $\rho'$ | hedged by default, $\rho'' = H(K \,\|\, \mathit{rnd} \,\|\, \mu)$ (draft) | resist faults and bad RNGs (§9.8) |
| SampleInBall | first 256 bits of $\tilde c$ | all of $\tilde c$ (final) | cleaner; requested by commenters |
| ExpandMask | SHAKE output read at an offset | read from the start (final) | the offset was unnecessary |
| HintBitUnpack | full checks in the reference code | a check missing in the draft, restored (final) | strong unforgeability |
| key generation | $H(\xi)$ | $H(\xi \,\|\, k \,\|\, \ell)$ (final) | one seed cannot give related keys for two sets |
| message | $M$ | $0 \,\|\, |\mathit{ctx}| \,\|\, \mathit{ctx} \,\|\, M$, and HashML-DSA with 1 (final) | contexts; pure and pre-hash kept apart |
| loop | unbounded | a cap of at least 814 tries allowed (final) | hardware and real-time code |
| symmetric primitive | SHAKE, or AES in the "-AES" variant | SHAKE only | one design |

*Table 9.3. From Dilithium to ML-DSA. "Draft" marks a change made in the August 2023 draft,
"final" one made between the draft and the August 2024 standard (from NIST's FIPS 204 status
talk, 2024, and the standard itself).*

The parameters $q$, $n$, $d$, $k$, $\ell$, $\eta$, $\tau$, $\gamma_1$, $\gamma_2$ and $\omega$
did not change, and neither did the public-key size. The longer $tr$ added 32 bytes to every
private key (Dilithium2's 2,528 became 2,560), and the longer $\tilde c$ added 16 bytes to
ML-DSA-65 signatures (3,293 became 3,309) and 32 bytes to ML-DSA-87's (4,595 became 4,627).
NIST also recorded what it declined to change: commenters asked to replace SHAKE with SHA-2 or
with a DRBG inside the samplers, to swap the order of $tr$ and $M$ in $\mu$, and to lengthen
the 32-byte seed, and NIST kept the design as it was in each case.

The practical lesson is about test vectors. Libraries implemented round-3 Dilithium and then
the August 2023 draft before the final standard, and both kinds of signature fail under
FIPS 204. Passing
Dilithium's old known-answer tests proves nothing about ML-DSA; the NIST ACVP vectors of §9.7
are the reference, and certificates must use the RFC 9881 identifiers, never the experimental
ones assigned to Dilithium.

## 9.12 In the real world

*Level: expert.*

**Where it runs.** As of November 2026, ML-DSA is in most general-purpose cryptographic
libraries and is moving into protocols and hardware.

- **Libraries.** OpenSSL 3.5 (April 2025) added ML-DSA alongside ML-KEM and SLH-DSA; Java's
  JDK 24 (March 2025, JEP 497) added it to the standard library; BoringSSL, AWS-LC and
  Bouncy Castle carry it, among others.
- **Cloud keys.** AWS KMS added ML-DSA keys in June 2025, with the external-$\mu$ interface of
  §9.9, and AWS Private CA added ML-DSA certificates in November 2025.
- **Standards for formats.** RFC 9881 (X.509 certificates and CRLs) and RFC 9882 (CMS) were
  published in October 2025, RFC 9964 (JOSE and COSE) in 2026. TLS 1.3 signature codepoints
  are in draft-ietf-tls-mldsa (revision 05, July 2026), and composite ML-DSA, paired with a
  classical signature, has its own LAMPS and TLS drafts. Chapter 18 follows these into the
  Web PKI.
- **Hardware security modules.** The large HSM vendors ship firmware with ML-DSA whose
  algorithm implementations have passed NIST's CAVP testing, and module-level FIPS 140-3
  validations that include them have started to arrive (Thales, for example, announced a
  Level 3 validation for its post-quantum Luna T-Series HSM in July 2026). A buyer should
  check that the module's certificate names ML-DSA and the firmware version in use.
- **Policy.** NSA's CNSA 2.0 requires ML-DSA-87 for signatures on US national security
  systems, with software and firmware signing among the first uses.

Hardware roots of trust, the chips that check a device's boot code, are among the earliest
adopters, because a device built today may still be in use when quantum computers arrive,
and its boot key cannot be changed after it ships.

**Where size hurts.** A TLS handshake carries several signatures and public keys: the
server's certificate and its issuer's, the handshake signature, and signed certificate
timestamps. Replacing each with ML-DSA adds roughly 10 to 15 kilobytes to the handshake,
which measurably slows connections on poor networks. That is why web certificates are moving
more slowly than key exchange, why Falcon (Chapter 10) matters, and why proposals like Merkle
Tree Certificates aim to remove most of those signatures. Chapter 18 tells that story; the
Protocols book has the details.

**Mars.** Arcadia City's machines take software updates from Earth. Each update is signed
once at the ground station with ML-DSA-87 and checked by every controller that installs it,
from the air plant to the door locks. The 4,627-byte signature is nothing next to the image
it protects, verification takes a fraction of a second even on a small controller, and the
signing key lives in a ground-station security module that receives only $\mu$, computed
beside the image, as in §9.9. The context string names the device class, so a signature on
door-lock firmware is no use to anyone trying to install it on the air plant.

## 9.13 Going deeper

*Level: expert.*

- **The design.** Ducas and others' TCHES 2018 paper explains every parameter choice; the
  round 3 specification documents the security estimates.
- **Fiat-Shamir with aborts in the QROM.** Kiltz, Lyubashevsky and Schaffner (2018), then the
  two CRYPTO 2023 papers that found and closed the gap (Barbosa and others, with a
  machine-checked proof; Devevey and others).
- **Relatives.** HAETAE (smaller signatures from a bimodal distribution) and Raccoon
  (designed to be easy to mask) were lattice entries in NIST's additional signature call;
  neither reached its second round. HAWK, a lattice scheme closer to Falcon, reached round 3
  and was withdrawn by its team in July 2026; Chapter 15 tells that story. BLISS (2013) shows
  the Gaussian road ML-DSA did not take.
- **Threshold ML-DSA.** Splitting a key among several signers is much harder than for
  Schnorr, because of the rejection loop; this is an active research area as of November 2026.
- **Fault and side-channel attacks.** Bruinderink and Pessl (TCHES 2018) on faults in
  deterministic lattice signatures; Ravi and others on power analysis of Dilithium; Migliore
  and others on masking it.

## Check yourself

??? question "1. Why must z = y + c·s₁ be rejected sometimes, when Schnorr's z = y + cx never is?"

    Schnorr's $y$ is uniform over the whole group, so $z$ is uniform too. ML-DSA's $\mathbf{y}$
    must be short, so it is uniform only over a box, and $\mathbf{z}$ is uniform over a box
    shifted by $c\,\mathbf{s}_1$. Its edges reveal the secret. Rejecting anything outside a
    smaller box makes the distribution of $\mathbf{z}$ independent of the secret.

??? question "2. In the security proof, how does the reduction answer signing queries without the private key?"

    It picks $\mathbf{z}$ uniform on the small box and $c$ at random, computes
    $\mathbf{w}_1 = \mathrm{HighBits}(\mathbf{A}\mathbf{z} - c\,\mathbf{t})$, and programs the random
    oracle so that $H(\mu \,\|\, \mathbf{w}_1) = c$. This works because kept $\mathbf{z}$ is
    independent of the key. Then Module-LWE makes the key look random, and a forgery becomes a
    SelfTargetMSIS solution.

??? question "3. What does Power2Round do to the public key, and what does the signer have to add in exchange?"

    It keeps only the top 10 bits $\mathbf{t}_1$ of each 23-bit coefficient, dropping 13 bits
    $\mathbf{t}_0$. The verifier's value is then off by $c\,\mathbf{t}_0$, and the signer adds
    hints telling it where that error crosses a HighBits boundary.

??? question "4. On the toy modulus q = 97 with 2γ₂ = 16, the verifier holds r = 58 and a hint bit 1. Which high bits does it hash?"

    $58 = 4 \cdot 16 - 6$, so HighBits 4 and LowBits $-6$. The hint says a boundary was crossed,
    and negative low bits mean the value came up from the block below, so UseHint returns
    $4 - 1 = 3$.

??? question "5. Compute the size of an ML-DSA-44 signature from its parameters."

    $\tilde c$: 32 bytes. $\mathbf{z}$: $\ell = 4$ polynomials of 256 coefficients in 18 bits
    ($\gamma_1 = 2^{17}$), $4 \times 576 = 2{,}304$ bytes. Hints: $\omega + k = 84$ bytes. Total
    $2{,}420$.

??? question "6. Why does the default signing mode mix fresh randomness with the key, instead of using only randomness or only the key?"

    Only the key (deterministic) is open to fault attacks that compare a faulty and a correct
    signature of the same message. Only randomness fails if the random number generator is
    weak. Hedged signing $\rho'' = H(K \,\|\, \mathit{rnd} \,\|\, \mu)$ resists both.

??? question "7. Where does ML-DSA-44's figure of 4.25 expected tries come from, and why is the true figure slightly higher?"

    Each of the $256\ell$ coefficients of $\mathbf{z}$ passes with probability about
    $1 - \beta/\gamma_1$ and each of the $256k$ low-bit coefficients with about
    $1 - \beta/\gamma_2$, so a try is kept with probability about
    $\exp(-256\beta(\ell/\gamma_1 + k/\gamma_2)) = e^{-1.448}$, and the expected count is
    $e^{1.448} = 4.25$. The formula leaves out the checks made after the hint is computed; the
    limit of $\omega = 80$ hints fails in a few percent of tries, which raises the expectation to
    about 4.36.

??? question "8. A signer signs with HashML-DSA. Can the signature be accepted by a pure ML-DSA verifier?"

    No. The formatted message starts with 1 for HashML-DSA and 0 for pure ML-DSA, so the
    hashed $\mu$ differs and verification fails.

??? question "9. What is external μ, and why is it useful?"

    The caller computes $\mu = H(tr \,\|\, M')$ next to the message and sends only those 64
    bytes to the signer, typically a hardware module. The result is an ordinary pure ML-DSA
    signature, so verifiers need nothing new.

??? question "10. Which values in ML-DSA signing must be kept secret even when a try is rejected?"

    The mask $\mathbf{y}$, the products $c\,\mathbf{s}_1$ and $c\,\mathbf{s}_2$, and the rejected
    candidate $\mathbf{z}$: all depend on the key, and a leak of $\mathbf{s}_1$ alone is enough
    to forge (§9.8). The number of tries itself depends only on the masks and may leak.

## What you learned

- ML-DSA is Fiat-Shamir with aborts over module lattices: commit $\mathbf{w} = \mathbf{A}\mathbf{y}$,
  challenge $c$, respond $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$, and reject unless $\mathbf{z}$ hides
  the secret.
- Without rejection, the edges of $\mathbf{z}$'s distribution reveal the secret. With it, every
  kept value of $\mathbf{z}$ has exactly the same probability whatever the key; rejected values
  must never leave the signer.
- MakeHint and UseHint are exact as long as the error stays within $\gamma_2$: one bit says a
  block boundary was crossed and the verifier's own low bits say which way.
- Power2Round shrinks the public key; HighBits, LowBits and at most $\omega$ hints let the
  verifier recompute the committed high bits.
- ML-DSA-44, -65 and -87 have signatures of 2,420, 3,309 and 4,627 bytes. The expected number
  of tries is about $\exp(256\beta(\ell/\gamma_1 + k/\gamma_2))$: 4.25, 5.1 and 3.85 in FIPS 204,
  about 4.36, 5.14 and 3.91 once the hint limit is counted; a loop cap must be at least 814.
- A complete implementation fits in about 270 lines and matches NIST's 615 test vectors.
- A fault that reveals only $\mathbf{s}_1$ is a full break, which is why signing is hedged and
  signatures are best verified before release.
- Use pure ML-DSA with an empty context for standard protocols, external $\mu$ when the message
  is far from the key, and HashML-DSA only when an interface forces a digest.
- FIPS 204 changed $tr$, $\tilde c$, the default randomness, SampleInBall, ExpandMask, key
  generation and message formatting, so round-3 Dilithium does not interoperate with ML-DSA.
- Security rests on Module-LWE and SelfTargetMSIS in the QROM; side channels and size are the
  practical challenges.

**Next:** [Chapter 10](10-NTRU-Falcon-and-FN-DSA.md), NTRU, Falcon and FN-DSA, where a lattice with a trapdoor gives much
smaller signatures at the price of harder arithmetic.

## Further reading

- NIST, FIPS 204, *Module-Lattice-Based Digital Signature Standard* (13 August 2024).
- Léo Ducas, Eike Kiltz, Tancrède Lepoint, Vadim Lyubashevsky, Peter Schwabe, Gregor Seiler and
  Damien Stehlé, "CRYSTALS-Dilithium: A Lattice-Based Digital Signature Scheme" (TCHES 2018).
- Vadim Lyubashevsky, "Fiat-Shamir with Aborts: Applications to Lattice and Factoring-Based
  Signatures" (ASIACRYPT 2009) and "Lattice Signatures without Trapdoors" (EUROCRYPT 2012).
- Shi Bai and Steven D. Galbraith, "An Improved Compression Technique for Signatures Based on
  Learning with Errors" (CT-RSA 2014).
- Eike Kiltz, Vadim Lyubashevsky and Christian Schaffner, "A Concrete Treatment of Fiat-Shamir
  Signatures in the Quantum Random-Oracle Model" (EUROCRYPT 2018).
- Cas Cremers, Samed Düzlü, Rune Fiedler, Marc Fischlin and Christian Janson, "BUFFing
  signature schemes beyond unforgeability and the case of post-quantum signatures" (IEEE S&P
  2021).
- Leon Groot Bruinderink and Peter Pessl, "Differential Fault Attacks on Deterministic Lattice
  Signatures" (TCHES 2018).
- Léo Ducas, Alain Durmus, Tancrède Lepoint and Vadim Lyubashevsky, "Lattice Signatures and
  Bimodal Gaussians" (BLISS, CRYPTO 2013); Leon Groot Bruinderink, Andreas Hülsing, Tanja Lange
  and Yuval Yarom, "Flush, Gauss, and Reload" (CHES 2016).
- CRYSTALS-Dilithium, *Algorithm Specifications and Supporting Documentation*, version 3.1
  (8 February 2021), with equation (5) for the expected repetitions and the round 3
  benchmarks.
- Jelle Don, Serge Fehr, Christian Majenz and Christian Schaffner, "Security of the Fiat-Shamir
  Transformation in the Quantum Random-Oracle Model" (CRYPTO 2019); Qipeng Liu and Mark
  Zhandry, "Revisiting Post-Quantum Fiat-Shamir" (CRYPTO 2019).
- Alex B. Grilo, Kathrin Hövelmanns, Andreas Hülsing and Christian Majenz, "Tight Adaptive
  Reprogramming in the QROM" (ASIACRYPT 2021).
- Manuel Barbosa, Gilles Barthe, Christian Doczkal, Jelle Don, Serge Fehr, Benjamin Grégoire,
  Yu-Hsuan Huang, Andreas Hülsing, Yi Lee and Xiaodi Wu, "Fixing and Mechanizing the Security
  Proof of Fiat-Shamir with Aborts and Dilithium" (CRYPTO 2023; ePrint 2023/246).
- Julien Devevey, Pouria Fallahpour, Alain Passelègue and Damien Stehlé, "A Detailed Analysis
  of Fiat-Shamir with Aborts" (CRYPTO 2023; ePrint 2023/245).
- Ray Perlner, "FIPS 204 Status Update" (NIST presentation, 2024): the
  changes from the draft to the final standard.
- Kris Kwiatkowski, "On the Expected Number of Iterations in ML-DSA Signing: A Complete
  Accounting of the Rejection Conditions" (ePrint 2026/2456, October 2026).
- Sebastien Riou, Jong-Yeon Park, Liga Anwar, Axel Poschmann and Michael Hutter, "Apples,
  Oranges, and Signatures: Pitfalls and Methodology in ML-DSA Benchmarking" (ePrint 2026/1333,
  2026).
- RFC 9881, *Algorithm Identifiers for ML-DSA* in X.509 (October 2025); RFC 9882, *Use of
  ML-DSA in CMS* (October 2025); RFC 9964, *ML-DSA for JOSE and COSE* (2026);
  draft-ietf-tls-mldsa-05, *Use of ML-DSA in TLS 1.3* (July 2026).
- AWS, "AWS KMS adds support for post-quantum ML-DSA digital signatures" (June 2025).
- NSA, *Commercial National Security Algorithm Suite 2.0* (CNSA 2.0) advisory and FAQ.
- The NIST ACVP-Server repository (github.com/usnistgov/ACVP-Server), FIPS 204 test files.
