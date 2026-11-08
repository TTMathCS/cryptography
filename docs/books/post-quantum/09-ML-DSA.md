# 9. ML-DSA

*Every software update, every TLS certificate and every signed document rests on a
signature scheme, and today almost all of them use RSA or elliptic curves. ML-DSA, the
lattice scheme CRYSTALS-Dilithium standardized as FIPS 204 on 13 August 2024, is NIST's
main replacement. It is built like Schnorr's signature: commit, get a challenge, respond.
The difference is that a lattice response leaks the secret unless the signer sometimes
throws it away and tries again. This chapter builds ML-DSA completely. You will watch a
secret fall out of 20,000 signatures made without rejection and stay hidden with it, follow
the rounding and the "hints" that keep public keys and signatures small, run a full
implementation that matches all 615 of NIST's test vectors, count how often the signer
retries, and see why context strings and the pre-hash variant exist.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Fiat-Shamir with aborts turns a lattice identification scheme into a signature,
      and why the aborts are necessary;
    - ML-DSA's keys, its signing loop and its verification, step by step;
    - Power2Round, HighBits, LowBits and the hints that let the public key drop 13 bits
      per coefficient;
    - the three parameter sets and their sizes;
    - a complete implementation, checked against NIST's vectors;
    - hedged and deterministic signing, context strings, and HashML-DSA;
    - what the security proofs say, and where ML-DSA is used today.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (signatures and Fiat-Shamir),
    [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) (SIS and Module-LWE) and
    [Chapter 7](07-Rings-Modules-and-the-NTT.md) (the ring and the NTT). Chapter 8's
    sampling ideas recur here.

    **Levels:** §9.1 to §9.3 are for beginners, §9.4 to §9.9 are intermediate, §9.10 to
    §9.12 are expert.

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

```
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
<figcaption>Figure 9.1. The signing loop of ML-DSA. Each rejected try uses a fresh mask; the number of tries is random but small. The values from rejected tries must stay secret too, because they depend on the key.</figcaption>
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
$n = 256$ and $d = 13$ dropped bits. The sizes are checked by the code in §9.7.*

For comparison: an Ed25519 public key is 32 bytes and a signature 64 bytes; an RSA-2048
public key is 256 bytes plus the exponent, and a signature 256 bytes. ML-DSA-44's signature is
about 38 times an Ed25519 signature. Speed is a different story. On a laptop, optimized
ML-DSA signs and verifies in tens of microseconds, comparable to Ed25519 and much faster
than RSA signing. Size, not speed, is ML-DSA's cost.

The category 2 rating of ML-DSA-44 (not 1) reflects that its estimated attack cost sits
between the AES-128 and SHA-256 collision thresholds of Chapter 2.

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

```
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

```
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

```
valid signature verifies:       True
one byte of message changed:    False
same signature, other context:  False
one bit of signature flipped:   False
deterministic: two signatures equal: True
hedged: two signatures equal:        False  both verify: True
```

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

```
ML-DSA-44 average tries per signature over 200: 4.185
ML-DSA-65 average tries per signature over 200: 4.635
ML-DSA-87 average tries per signature over 200: 4.28
```

The averages come out near FIPS 204's expected values of 4.25, 5.1 and 3.85; 200 signatures
are too few to pin them down more closely, since the number of tries varies a lot from one
signature to the next. The variation matters in practice. A signer's time is not fixed, and
a real implementation must make sure that the number of tries, and the values computed in
rejected tries, reveal nothing about the key. The number of tries depends only on the
random masks and is safe to leak; the rejected values are not.

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

```
HashML-DSA signature verifies:           True
accepted as a pure ML-DSA signature:     False
pure signature accepted as HashML-DSA:   False
```

Which to use? Most guidance favors pure ML-DSA, with external $\mu$ where the message cannot
be brought to the signer. HashML-DSA's security also depends on the collision
resistance of the pre-hash, and having two signature types for one key invites confusion. The
IETF's specifications for ML-DSA in certificates use pure ML-DSA.

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
of the same message. The strict checks on the hint encoding in verification exist for that;
without them, two encodings of the same hint would both verify.

**Binding to the key.** $\mu$ includes $tr = H(\mathrm{pk})$, so a signature is valid only for the
key it was made with. That gives ML-DSA the "exclusive ownership" properties of Cremers and
others' BUFF framework (2021) that some older schemes lack, which prevents attacks where an
adversary finds a second key that accepts an existing signature.

**What changed from Dilithium.** The main changes in FIPS 204 are: hedged signing with a
32-byte $\mathit{rnd}$ as the default; a 64-byte $tr$; a challenge hash $\tilde c$ whose length
grows with the security level ($\lambda/4$ bytes); key generation that hashes in $k$ and
$\ell$, like ML-KEM's domain separator; and the context strings, domain-separation byte and
HashML-DSA of §9.8 and §9.9. As with ML-KEM, old Dilithium signatures do not verify under
ML-DSA.

**Side channels.** ML-DSA's arithmetic is integer-only and its sampling is rejection-based,
which makes constant-time code straightforward compared with Falcon (Chapter 10). The
dangerous values are the secret-dependent ones: $c\,\mathbf{s}_1$, $\mathbf{y}$ and the
low bits. Published power-analysis attacks recover keys from unprotected implementations
on microcontrollers; masked implementations exist but cost several times the plain one.
Chapter 17 returns to this.

## 9.11 In the real world

*Level: expert.*

**Where it runs.** OpenSSL 3.5 (April 2025) added ML-DSA alongside ML-KEM and SLH-DSA, , other major
libraries have followed, and several cloud key-management services offer it. NSA's CNSA 2.0 requires ML-DSA-87 for signatures on US national security
systems, with software and firmware signing among the first uses. Hardware roots of trust,
the chips that check a device's boot code, are among the earliest adopters, because a device
built today may still be in use when quantum computers arrive, and its boot key cannot be
changed after it ships.

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

## 9.12 Going deeper

*Level: expert.*

- **The design.** Ducas and others' TCHES 2018 paper explains every parameter choice; the
  round 3 specification documents the security estimates.
- **Fiat-Shamir with aborts in the QROM.** Kiltz, Lyubashevsky and Schaffner (2018), and later
  work by Devevey, Fallahpour, Passelègue and Stehlé (2023) on a gap in earlier proofs of
  aborting schemes and how to close it.
- **Relatives.** HAETAE (smaller signatures from a bimodal distribution) and Raccoon
  (designed to be easy to mask) were lattice entries in NIST's additional signature call;
  neither reached its second round. Chapter 15 covers the signatures still in that process,
  including HAWK, a lattice scheme.
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

??? question "2. What are the two problems ML-DSA's security rests on?"

    Module-LWE, for key recovery from $\mathbf{t} = \mathbf{A}\mathbf{s}_1 + \mathbf{s}_2$, and an SIS-type
    problem (SelfTargetMSIS in the proofs), for forging a short $\mathbf{z}$ that matches a
    hash.

??? question "3. What does Power2Round do to the public key, and what does the signer have to add in exchange?"

    It keeps only the top 10 bits $\mathbf{t}_1$ of each 23-bit coefficient, dropping 13 bits
    $\mathbf{t}_0$. The verifier's value is then off by $c\,\mathbf{t}_0$, and the signer adds
    hints telling it where that error crosses a HighBits boundary.

??? question "4. With 2γ₂ = 190,464, what are HighBits and LowBits of 400,000?"

    $400{,}000 = 2 \cdot 190{,}464 + 19{,}072$, so HighBits 2 and LowBits $19{,}072$.

??? question "5. Compute the size of an ML-DSA-44 signature from its parameters."

    $\tilde c$: 32 bytes. $\mathbf{z}$: $\ell = 4$ polynomials of 256 coefficients in 18 bits
    ($\gamma_1 = 2^{17}$), $4 \times 576 = 2{,}304$ bytes. Hints: $\omega + k = 84$ bytes. Total
    $2{,}420$.

??? question "6. Why does the default signing mode mix fresh randomness with the key, instead of using only randomness or only the key?"

    Only the key (deterministic) is open to fault attacks that compare a faulty and a correct
    signature of the same message. Only randomness fails if the random number generator is
    weak. Hedged signing $\rho'' = H(K \,\|\, \mathit{rnd} \,\|\, \mu)$ resists both.

??? question "7. What is a context string for?"

    To separate uses of one key: a signature made with context "firmware" does not verify
    with context "chat", so a signature cannot be moved from one application to another.

??? question "8. A signer signs with HashML-DSA. Can the signature be accepted by a pure ML-DSA verifier?"

    No. The formatted message starts with 1 for HashML-DSA and 0 for pure ML-DSA, so the
    hashed $\mu$ differs and verification fails.

??? question "9. What is external μ, and why is it useful?"

    The caller computes $\mu = H(tr \,\|\, M')$ next to the message and sends only those 64
    bytes to the signer, typically a hardware module. The result is an ordinary pure ML-DSA
    signature, so verifiers need nothing new.

??? question "10. Which values in ML-DSA signing must be kept secret even when a try is rejected?"

    The mask $\mathbf{y}$, the products $c\,\mathbf{s}_1$ and $c\,\mathbf{s}_2$, and the rejected
    candidate $\mathbf{z}$: all depend on the key. The number of tries itself depends only on
    the masks and may leak.

## What you learned

- ML-DSA is Fiat-Shamir with aborts over module lattices: commit $\mathbf{w} = \mathbf{A}\mathbf{y}$,
  challenge $c$, respond $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$, and reject unless $\mathbf{z}$ hides
  the secret.
- Without rejection, the edges of $\mathbf{z}$'s distribution reveal the secret.
- Power2Round shrinks the public key; HighBits, LowBits and at most $\omega$ hints let the
  verifier recompute the committed high bits.
- ML-DSA-44, -65 and -87 have signatures of 2,420, 3,309 and 4,627 bytes; signing takes about
  four tries on average.
- A complete implementation fits in about 270 lines and matches NIST's 615 test vectors.
- Signing is hedged by default; context strings separate applications; external $\mu$ and
  HashML-DSA handle large messages.
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
- NSA, *Commercial National Security Algorithm Suite 2.0* (CNSA 2.0) advisory and FAQ.
- The NIST ACVP-Server repository (github.com/usnistgov/ACVP-Server), FIPS 204 test files.
