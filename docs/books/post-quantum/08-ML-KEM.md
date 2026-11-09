# 8. ML-KEM

*ML-KEM is the post-quantum algorithm most people already use without knowing it. Since
late 2024 it has protected a growing share of web traffic inside hybrid TLS handshakes, and
since 2025 it has been the default key exchange of OpenSSH. It is the Module-LWE scheme
CRYSTALS-Kyber, standardized by NIST as FIPS 203 on 13 August 2024 with a few careful
changes. This chapter builds it completely: the inner encryption scheme K-PKE and why it
decrypts correctly, the compression that makes it small, the sampling that makes its
randomness reproducible, and the Fujisaki-Okamoto wrapper that makes it safe against active
attackers. You will pack coefficients into bytes and compress them by hand, run a full
implementation in about 160 lines of Python that matches NIST's official test vectors, check
one of those vectors yourself, compute the famous $2^{-139}$ failure probability from the
actual noise distributions, recover a whole secret key from six chosen ciphertexts when the
wrapper is left off, and watch the wrapper turn the same attack into noise.*

!!! abstract "In this chapter"
    **You will learn:**

    - the three algorithms of ML-KEM and the encryption scheme K-PKE inside them;
    - why K-PKE decrypts correctly, and how much room its noise leaves;
    - how ByteEncode packs coefficients into bytes, and how compression rounds them, with
      the exact error bound;
    - the parameter sets, and the sizes of keys and ciphertexts computed from them;
    - how the matrix and the secrets are sampled from short seeds;
    - a complete implementation, checked against NIST's ACVP test vectors, and how to
      check a vector yourself;
    - where the failure probabilities $2^{-139}$, $2^{-165}$ and $2^{-175}$ come from;
    - how a chosen-ciphertext attack recovers a K-PKE secret key, and how the
      Fujisaki-Okamoto transform with implicit rejection stops it;
    - why the rejection key needs its own secret $z$;
    - the input checks FIPS 203 requires, and the seed format for private keys;
    - what changed between Kyber and FIPS 203, where decapsulation has leaked in practice,
      and where ML-KEM runs today.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (KEMs and the Fujisaki-Okamoto
    transform), [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) (Module-LWE) and
    [Chapter 7](07-Rings-Modules-and-the-NTT.md) (the ring and the NTT).

    **Levels:** §8.1 to §8.4 are for beginners, §8.5 to §8.10 are intermediate, §8.11 to
    §8.13 are expert.

## 8.1 The problem

*Level: beginner.*

Two computers that have never met want a shared secret key, and the only channel between
them is public. Since the 1970s the answer has been Diffie-Hellman, and since the 2010s
mostly its elliptic-curve form X25519. Shor's algorithm breaks both. The replacement must do
the same job, fit in the same messages, and run as fast, on every phone and server, while
resting on a problem a quantum computer is not known to solve.

ML-KEM is NIST's answer. It is a key encapsulation mechanism (Chapter 3): the receiver
publishes an encapsulation key; the sender runs Encaps on it and gets a 32-byte shared
secret and a ciphertext; the receiver runs Decaps on the ciphertext with its private
decapsulation key and gets the same 32 bytes. In TLS the browser generates a fresh key pair
for every connection, so a key pair lives only for one handshake.

The path to the standard was long and public. Kyber was submitted to NIST's competition in
November 2017 by a team from the CRYSTALS project ("Cryptographic Suite for Algebraic
Lattices"). It survived three rounds of analysis, was selected on 5 July 2022 (NIST IR 8413),
appeared as the draft FIPS 203 on 24 August 2023, and became the final FIPS 203,
*Module-Lattice-Based Key-Encapsulation Mechanism Standard*, on 13 August 2024. The
companion guidance on using KEMs, SP 800-227, was finalized in September 2025.

!!! note "Life story: Kyber, now ML-KEM"
    **Born:** 2017, the CRYSTALS team (Roberto Avanzi, Joppe Bos, Léo Ducas, Eike Kiltz,
    Tancrède Lepoint, Vadim Lyubashevsky, John M. Schanck, Peter Schwabe, Gregor Seiler and
    Damien Stehlé), submitted to NIST's post-quantum competition; described in "CRYSTALS --
    Kyber: a CCA-secure module-lattice-based KEM" (EuroS&P 2018) · **Purpose:** a fast,
    small key exchange whose security rests on Module-LWE · **Helped:** hybrid key exchange in
    Chrome, Firefox and Cloudflare, OpenSSH's default since version 10.0 (2025),
    Signal's PQXDH and Apple's iMessage PQ3 (both built on Kyber before the final standard) ·
    **Status:** standardized as FIPS 203 (ML-KEM) on 13 August 2024; the most widely deployed
    post-quantum algorithm as of November 2026.

## 8.2 The plan in one picture

*Level: beginner.*

ML-KEM has two layers. Inside is **K-PKE**, a public-key encryption scheme that encrypts a
32-byte message. It is secure against passive attackers (IND-CPA) but, as §8.8 shows, falls
to an attacker who can send it ciphertexts of their choice. Outside is the
**Fujisaki-Okamoto transform** of Chapter 3, which turns K-PKE into a KEM that is secure
against chosen-ciphertext attacks (IND-CCA2).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="ML-KEM structure: Encaps picks a random m, derives K and r from m and the hash of ek, encrypts m with K-PKE using randomness r; Decaps decrypts to m', re-derives K' and r', re-encrypts and compares, returning K' on a match or a rejection key J(z, c) otherwise" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">Encaps(ek)</text>
<rect x="20" y="34" width="130" height="30" rx="4" fill="none" stroke="currentColor"/><text x="32" y="54">m ← 32 random B</text>
<rect x="185" y="34" width="170" height="30" rx="4" fill="none" stroke="currentColor"/><text x="195" y="54">(K, r) = G(m ‖ H(ek))</text>
<rect x="390" y="34" width="230" height="30" rx="4" fill="none" stroke="currentColor"/><text x="400" y="54">c = K-PKE.Encrypt(ek, m; r)</text>
<g stroke="currentColor"><line x1="150" y1="49" x2="185" y2="49"/><line x1="355" y1="49" x2="390" y2="49"/></g>
<text x="400" y="86">output K, send c</text>
<line x1="20" y1="104" x2="620" y2="104" class="soft" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="20" y="130" font-weight="bold">Decaps(dk, c)</text>
<rect x="20" y="142" width="200" height="30" rx="4" fill="none" stroke="currentColor"/><text x="30" y="162">m′ = K-PKE.Decrypt(dk, c)</text>
<rect x="250" y="142" width="170" height="30" rx="4" fill="none" stroke="currentColor"/><text x="258" y="162">(K′, r′) = G(m′ ‖ h)</text>
<rect x="440" y="142" width="180" height="30" rx="4" fill="none" stroke="currentColor"/><text x="448" y="162">c′ = Encrypt(ek, m′; r′)</text>
<g stroke="currentColor"><line x1="220" y1="157" x2="250" y2="157"/><line x1="420" y1="157" x2="440" y2="157"/><line x1="530" y1="172" x2="530" y2="200"/></g>
<rect x="440" y="200" width="180" height="30" rx="4" class="acc" fill="none" stroke-width="1.8"/><text x="474" y="220" class="acc-fill">c′ = c ?</text>
<line x1="470" y1="230" x2="400" y2="262" stroke="currentColor"/><line x1="590" y1="230" x2="600" y2="262" stroke="currentColor"/>
<text x="300" y="282">yes: output K′</text>
<text x="470" y="282" class="acc-fill">no: output J(z ‖ c)</text>
<text x="20" y="222" fill-opacity=".7">h = H(ek) and z are stored</text>
<text x="20" y="240" fill-opacity=".7">inside dk</text>
</svg>
<figcaption>Figure 8.1. ML-KEM as FIPS 203 defines it. Every bit of randomness in the ciphertext comes from m, so the receiver can recompute the ciphertext and check it. A ciphertext that fails the check gets a key derived from the secret z and the ciphertext itself, which looks random and tells the sender nothing.</figcaption>
</figure>

The trick that makes the outer layer work is that the sender's randomness $r$ is not drawn
freshly but derived from the message $m$. So once the receiver has decrypted $m$, it can
redo the sender's entire computation and check that the ciphertext it received is exactly
the one an honest sender would have produced. A forged or modified ciphertext fails that
check. What happens then, "implicit rejection", is the subject of §8.9.

## 8.3 K-PKE: encryption from Module-LWE

*Level: beginner.*

Everything lives in the ring $R_q = \mathbb{Z}_{3329}[X]/(X^{256}+1)$ of Chapter 7, in vectors
of length $k$ ($k = 2, 3, 4$ for the three parameter sets).

**Key generation.** Choose a random $k \times k$ matrix $\mathbf{A}$, and small vectors
$\mathbf{s}$ and $\mathbf{e}$ (coefficients in $\{-\eta_1, \dots, \eta_1\}$). Publish

$$\mathbf{t} = \mathbf{A}\mathbf{s} + \mathbf{e}.$$

The encryption key is $\mathbf{t}$ and the seed of $\mathbf{A}$; the secret is $\mathbf{s}$.
By Module-LWE, $\mathbf{t}$ looks uniformly random.

**Encryption** of a 256-bit message $m$. Choose fresh small $\mathbf{y}$, $\mathbf{e}_1$ and
$e_2$ (the standard calls the first one $\mathbf{y}$; papers often write $\mathbf{r}$). Turn each
message bit into $0$ or $\lceil q/2 \rfloor = 1665$, giving a polynomial $\mu$. Compute

$$\mathbf{u} = \mathbf{A}^T \mathbf{y} + \mathbf{e}_1, \qquad v = \mathbf{t}^T \mathbf{y} + e_2 + \mu.$$

The pair $(\mathbf{u}, v)$ is again a Module-LWE sample, now with secret $\mathbf{y}$, plus the
message hidden in $v$.

**Decryption.** Compute $w = v - \mathbf{s}^T \mathbf{u}$ and round each coefficient: values
near $q/2$ give 1, values near 0 give 0.

Why it works, in one line of algebra:

$$w = \mathbf{t}^T\mathbf{y} + e_2 + \mu - \mathbf{s}^T(\mathbf{A}^T\mathbf{y} + \mathbf{e}_1)
   = \mu + \underbrace{\mathbf{e}^T\mathbf{y} + e_2 - \mathbf{s}^T\mathbf{e}_1}_{\text{noise}},$$

because $\mathbf{t}^T\mathbf{y} = \mathbf{s}^T\mathbf{A}^T\mathbf{y} + \mathbf{e}^T\mathbf{y}$ and the big
terms cancel. Everything left over is a sum of products of small things. Each noise
coefficient is a sum of about $2 \cdot 256 \cdot k$ products of numbers no bigger than 3, so
it is typically a few dozen, and decryption works as long as every coefficient stays below
$q/4 \approx 832$ in size.

<div class="mars-steps" markdown>

**K-PKE with one coefficient.** Take $q = 3329$, $k = 1$, $n = 1$ (plain numbers), $A = 1000$,
$s = 2$, $e = -1$.

1. Key: $t = 1000 \cdot 2 - 1 = 1999$.
2. Encrypt bit 1 with $y = -1$, $e_1 = 1$, $e_2 = 2$: $u = 1000 \cdot (-1) + 1 = -999 \equiv
   2330$, and $v = 1999 \cdot (-1) + 2 + 1665 = -332 \equiv 2997$.
3. Decrypt: $w = 2997 - 2 \cdot 2330 = -1663 \equiv 1666$.
4. 1666 is near $q/2 = 1664.5$, so the bit is 1. The noise is $1666 - 1665 = 1$, which is
   $e\,y + e_2 - s\,e_1 = 1 + 2 - 2 = 1$, as the algebra says.

</div>

In the real scheme $n = 256$ and the products are ring products, but the cancellation is the
same, coefficient by coefficient.

## 8.4 Compression, parameter sets and sizes

*Level: beginner.*

The ciphertext $(\mathbf{u}, v)$ has $256(k+1)$ coefficients of 12 bits each. Most of those
bits are noise anyway, so K-PKE throws the low ones away. **Compression** to $d$ bits maps
$x \in \mathbb{Z}_q$ to $\lceil (2^d/q)\,x \rfloor \bmod 2^d$, and decompression maps $y$ back
to $\lceil (q/2^d)\,y \rfloor$. The round trip moves $x$ by at most about $q/2^{d+1}$: about
1.6 for $d = 10$, 104 for $d = 4$. That extra error simply joins the noise. Compressing
$\mathbf{u}$ to $d_u$ bits and $v$ to $d_v$ bits cuts the ciphertext by a fifth to a third,
as the sizes below show. (In FIPS 203 the public key $\mathbf{t}$ is not compressed; its
coefficients are sent in 12 bits.) Before compression can be worked by hand, it helps to
see how any list of coefficients becomes bytes.

### Packing coefficients into bytes

Everything ML-KEM stores or sends is a list of 256 numbers of $d$ bits each, for some $d$
from 1 to 12, followed in the encapsulation key by the 32-byte seed $\rho$. FIPS 203 turns
such a list into bytes with a single rule, **ByteEncode**$_d$ (Algorithm 5): write the
numbers one after another as a long string of bits, least significant bit first, and cut the
string into bytes, again least significant bit first. Said another way, form the integer
$\sum_i f_i\, 2^{d i}$ and write it out in little-endian order. 256 numbers of $d$ bits are
$256d$ bits, which is $32d$ bytes, and that is why every size in this chapter is a multiple
of 32.

<div class="mars-steps" markdown>

**ByteEncode by hand.** Three small cases, each the start of a longer list.

1. $d = 4$, coefficients 1, 2, 3, 15. Two fit in a byte, the first in the low half. Byte 0
   is $1 + 16 \cdot 2 = 33$ = `21` in hex; byte 1 is $3 + 16 \cdot 15 = 243$ = `F3`.
2. $d = 12$, coefficients 3328 and 1. Two coefficients fill three bytes. The 24-bit integer
   is $3328 + 4096 \cdot 1 = 7424$ = `001D00` in hex, written low byte first: `00 1D 00`.
3. $d = 10$, coefficients 1000, 1, 2, 1023. Four fill five bytes; the integer is
   $1000 + 1 \cdot 2^{10} + 2 \cdot 2^{20} + 1023 \cdot 2^{30}$. Byte 0 is $1000 \bmod 256 =
   232$. Byte 1 holds the top two bits of 1000 ($1000 \gg 8 = 3$) and the 1 at bit 2: $3 + 4 =
   7$. Byte 2 holds the 2 at bit 5: 32. Byte 3 holds the low two bits of 1023 at bits 6 and 7:
   192. Byte 4 holds the remaining eight bits of 1023: 255. The bytes are `E8 07 20 C0 FF`,
   which is what `byte_encode` in §8.6 produces.

</div>

**ByteDecode**$_d$ reverses the rule. For $d < 12$ every pattern of $d$ bits is a legal value.
For $d = 12$ it is not: a 12-bit field holds 0 to 4,095, but coefficients mod $q$ stop at
3,328, so ByteDecode$_{12}$ reduces each field modulo $q$. The 767 field values from 3,329 to
4,095 are therefore not canonical: a key containing one decodes to a different key than its
bytes say. That single line of the standard is the reason for the modulus check of §8.10.

The bit order matters more than it looks. A library that packs the most significant bit
first produces keys and ciphertexts of the right length that interoperate with nobody, and
the mistake is invisible in a round-trip test against itself. Only a comparison with
someone else's bytes, such as the test vectors of §8.6, catches it.

### Compression by hand

$\mathrm{Compress}_d$ spreads $2^d$ points evenly around the circle $\mathbb{Z}_q$ and
replaces $x$ by the index of the nearest one; $\mathrm{Decompress}_d$ turns the index back
into that point. Because $q = 3329$ is not a power of two, the points are not at whole
numbers, and both directions round.

<div class="mars-steps" markdown>

**Compress and Decompress of $x = 1000$.**

1. $d = 10$: $2^{10} \cdot 1000 / 3329 = 1{,}024{,}000 / 3329 = 307.6$, which rounds to 308.
   Back: $308 \cdot 3329 / 1024 = 1{,}025{,}332 / 1024 = 1001.3$, which rounds to 1001. The
   error is $+1$.
2. $d = 4$: $16{,}000 / 3329 = 4.81$, which rounds to 5. Back: $5 \cdot 3329/16 = 16{,}645/16 =
   1040.3$, so 1040. The error is $+40$.
3. $d = 1$: $2000/3329 = 0.60$, which rounds to 1. Back: $3329/2 = 1664.5$, so 1665. The
   error is $+665$. This is how decryption reads a message bit: $\mathrm{Compress}_1$ asks
   whether $x$ is nearer $q/2$ than 0.
4. A value near the top, $x = 3300$ with $d = 4$: $52{,}800/3329 = 15.86$ rounds to 16, and
   $16 \bmod 16 = 0$. Back: 0. The error is $0 - 3300 \equiv 29 \pmod q$. The "mod $2^d$"
   wraps the top point to zero, which is right: 3300 is $-29$ modulo $q$, and 0 is the
   nearest point.

</div>

**The bound.** The points $\mathrm{Decompress}_d(y)$ are $q/2^d$ apart (about 208 for
$d = 4$), so rounding to the nearest moves $x$ by at most half that spacing, plus a fraction
from rounding the point itself to an integer. FIPS 203 (Section 4.2.1) states the result as

$$\bigl|\,\mathrm{Decompress}_d(\mathrm{Compress}_d(x)) - x \bmod^{\pm} q\,\bigr| \le
\left\lceil \frac{q}{2^{d+1}} \right\rfloor,$$

where $\bmod^{\pm}$ means the representative between $-q/2$ and $q/2$. For $d = 4$ the bound
is $\lceil 104.03 \rfloor = 104$. A bound that small is easy to check on every input.

**Code it.** Compression by hand, then the worst error and the mean square error for every
$x$ and every $d$ that ML-KEM uses.

```python
# Compress and Decompress with q = 3329, by hand and then for every x.
Q = 3329
def compress(x, d):    return ((x << d) + Q // 2) // Q % (1 << d)
def decompress(y, d):  return (y * Q + (1 << (d - 1))) >> d
def centered(x):       return (x + Q // 2) % Q - Q // 2     # into -1664..1664

for x in (1000, 3300):
    for d in (10, 4, 1):
        y = compress(x, d)
        back = decompress(y, d)
        print(f"x = {x}, d = {d:2}: Compress = {y:4}, Decompress = {back:4}, "
              f"error = {centered(back - x):4}")

print(" d  worst error  bound  mean square error")
for d in (1, 4, 5, 10, 11):
    errs = [centered(decompress(compress(x, d), d) - x) for x in range(Q)]
    worst = max(abs(e) for e in errs)
    print(f"{d:2}  {worst:10}  {round(Q / 2 ** (d + 1)):5}  {sum(e * e for e in errs) / Q:17.1f}")
```

It prints:

```text
x = 1000, d = 10: Compress =  308, Decompress = 1001, error =    1
x = 1000, d =  4: Compress =    5, Decompress = 1040, error =   40
x = 1000, d =  1: Compress =    1, Decompress = 1665, error =  665
x = 3300, d = 10: Compress = 1015, Decompress = 3300, error =    0
x = 3300, d =  4: Compress =    0, Decompress =    0, error =   29
x = 3300, d =  1: Compress =    0, Decompress =    0, error =   29
 d  worst error  bound  mean square error
 1         832    832           230880.1
 4         104    104             3607.7
 5          52     52              902.0
10           2      2                0.9
11           1      1                0.4
```

The worst error meets the bound exactly for every $d$. The last column matters as much: it
is the variance that compression adds to each coefficient, and §8.7 feeds it straight into
the failure probability. The two compressions are treated very differently. Each coefficient
of $\mathbf{u}$ is multiplied by a secret coefficient during decryption and summed $256k$
times, so its error is amplified, and $\mathbf{u}$ keeps 10 or 11 bits (variance 0.9 or 0.4).
The error on $v$ enters only once, so $v$ can be squeezed to 4 or 5 bits even though that adds
a variance of 3,608 or 902, the largest single term in the noise.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Compression with d equal to 4: sixteen evenly spaced points on the range 0 to 3328, and below them a sawtooth showing the error of compressing and decompressing every x, between minus 104 and plus 104" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">The 16 values Decompress₄ can return</text>
<line x1="60" y1="60" x2="620" y2="60" stroke="currentColor"/>
<g fill-opacity=".85"><circle cx="60.0" cy="60" r="3.5"/><circle cx="95.0" cy="60" r="3.5"/><circle cx="130.0" cy="60" r="3.5"/><circle cx="165.0" cy="60" r="3.5"/><circle cx="200.0" cy="60" r="3.5"/><circle cx="234.9" cy="60" r="3.5"/><circle cx="269.9" cy="60" r="3.5"/><circle cx="304.9" cy="60" r="3.5"/><circle cx="340.1" cy="60" r="3.5"/><circle cx="375.1" cy="60" r="3.5"/><circle cx="410.1" cy="60" r="3.5"/><circle cx="445.1" cy="60" r="3.5"/><circle cx="480.0" cy="60" r="3.5"/><circle cx="515.0" cy="60" r="3.5"/><circle cx="550.0" cy="60" r="3.5"/><circle cx="585.0" cy="60" r="3.5"/></g>
<text x="52" y="82">0</text><text x="318" y="82">1665</text><text x="596" y="82">3328</text>
<line x1="228.2" y1="40" x2="228.2" y2="56" stroke="currentColor"/>
<path d="M228.2 40 Q 232 32 234.9 52" fill="none" stroke="currentColor"/>
<text x="170" y="36" fill-opacity=".7">1000 → 1040</text>
<line x1="615.1" y1="44" x2="615.1" y2="56" stroke="currentColor"/>
<text x="470" y="36" fill-opacity=".7">3300 wraps to 0</text>
<text x="20" y="112" font-weight="bold">Error Decompress₄(Compress₄(x)) − x, for every x</text>
<line x1="60" y1="190" x2="620" y2="190" stroke="currentColor" stroke-opacity=".4" stroke-dasharray="4 4"/>
<line x1="60" y1="130" x2="620" y2="130" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="2 4"/>
<line x1="60" y1="250" x2="620" y2="250" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="2 4"/>
<text x="14" y="134">+104</text><text x="40" y="194">0</text><text x="18" y="254">−104</text>
<g stroke="currentColor" stroke-width="1.6">
<line x1="60.0" y1="190.0" x2="77.5" y2="250.0"/>
<line x1="77.7" y1="130.6" x2="112.5" y2="250.0"/>
<line x1="112.7" y1="130.6" x2="147.5" y2="250.0"/>
<line x1="147.6" y1="130.6" x2="182.5" y2="250.0"/>
<line x1="182.6" y1="130.6" x2="217.5" y2="250.0"/>
<line x1="217.6" y1="130.6" x2="252.4" y2="250.0"/>
<line x1="252.6" y1="130.6" x2="287.4" y2="250.0"/>
<line x1="287.6" y1="130.6" x2="322.4" y2="250.0"/>
<line x1="322.6" y1="130.0" x2="357.4" y2="249.4"/>
<line x1="357.6" y1="130.0" x2="392.4" y2="249.4"/>
<line x1="392.6" y1="130.0" x2="427.4" y2="249.4"/>
<line x1="427.6" y1="130.0" x2="462.4" y2="249.4"/>
<line x1="462.5" y1="130.0" x2="497.4" y2="249.4"/>
<line x1="497.5" y1="130.0" x2="532.4" y2="249.4"/>
<line x1="532.5" y1="130.0" x2="567.3" y2="249.4"/>
<line x1="567.5" y1="130.0" x2="602.3" y2="249.4"/>
<line x1="602.5" y1="130.0" x2="619.8" y2="189.4"/>
</g>
<text x="250" y="284" fill-opacity=".7">x from 0 to 3328</text>
</svg>
<figcaption>Figure 8.2. Compression to 4 bits, as used for $v$ in ML-KEM-512 and ML-KEM-768. Each $x$ is moved to the nearest of 16 points spaced about 208 apart, so the error is a sawtooth that never leaves $\pm 104 = \lceil q/32 \rfloor$. The last stretch, from 3225 up, wraps around to the point 0. With $d = 10$ the same picture has 1,024 points and an error of at most 2.</figcaption>
</figure>

### The parameter sets

The three sets differ only in the module rank $k$, the noise widths $\eta_1$ and $\eta_2$, and
the compression widths. A larger $k$ makes the lattice bigger and the attacks harder
(Chapter 6), and it also makes the noise sums longer. ML-KEM-512 has the shortest sums, so it
can use the wider $\eta_1 = 3$ for its secrets, adding hardness where its small $k$ leaves the
least, and still decrypt reliably. ML-KEM-1024 has the longest, so it keeps an extra bit in
each compressed coefficient.

| | ML-KEM-512 | ML-KEM-768 | ML-KEM-1024 |
|---|---|---|---|
| NIST category | 1 | 3 | 5 |
| $k$ | 2 | 3 | 4 |
| $\eta_1$, $\eta_2$ | 3, 2 | 2, 2 | 2, 2 |
| $d_u$, $d_v$ | 10, 4 | 10, 4 | 11, 5 |
| encapsulation key | 800 B | 1,184 B | 1,568 B |
| decapsulation key | 1,632 B | 2,400 B | 3,168 B |
| ciphertext | 768 B | 1,088 B | 1,568 B |
| shared secret | 32 B | 32 B | 32 B |

*Table 8.1. ML-KEM parameter sets (FIPS 203, Tables 2 and 3). All use $n = 256$ and
$q = 3329$. The sizes are checked by running the code in §8.6.*

### The sizes, computed

The formulas behind the sizes are short. The encapsulation key is $k$ polynomials of 12-bit
coefficients plus the 32-byte seed: $384k + 32$ bytes. The ciphertext is $k$ polynomials of
$d_u$ bits and one of $d_v$ bits: $32(d_u k + d_v)$ bytes. The decapsulation key holds the
secret $\hat{\mathbf{s}}$ (384$k$ bytes), a full copy of the encapsulation key, its hash
$H(\mathrm{ek})$ and the 32-byte rejection secret $z$: $768k + 96$ bytes.

Worked for all three sets:

| | ML-KEM-512 ($k = 2$) | ML-KEM-768 ($k = 3$) | ML-KEM-1024 ($k = 4$) |
|---|---|---|---|
| ek $= 384k + 32$ | $768 + 32 = 800$ | $1152 + 32 = 1184$ | $1536 + 32 = 1568$ |
| ciphertext $= 32(d_u k + d_v)$ | $32(20 + 4) = 768$ | $32(30 + 4) = 1088$ | $32(44 + 5) = 1568$ |
| uncompressed, $384(k+1)$ | 1,152 | 1,536 | 1,920 |
| saved by compression | 33% | 29% | 18% |
| dk $= 768k + 96$ | $1536 + 96 = 1632$ | $2304 + 96 = 2400$ | $3072 + 96 = 3168$ |
| dk as a seed $(d, z)$ | 64 | 64 | 64 |

*Table 8.2. Sizes in bytes, from the formulas. ML-KEM-1024 spends an extra bit on every
coefficient of the ciphertext, so compression saves less there.*

Two things stand out. The ciphertext is never larger than the key, and for ML-KEM-1024 the
two are equal by coincidence ($44 + 5 = 49$ and $4 \cdot 12 + 1 = 49$, counted in units of 32
bytes). And the private key, though it is the largest object, never has to travel: it can be
stored as 64 bytes and expanded when needed (§8.10).

<figure class="mars-fig">
<svg viewBox="0 0 640 312" width="640" role="img" aria-label="Bar chart of key and ciphertext sizes in bytes: X25519 32 and 32, RSA-2048 256 and 256, ML-KEM-512 800 and 768, ML-KEM-768 1184 and 1088, the X25519MLKEM768 TLS key shares 1216 and 1120, ML-KEM-1024 1568 and 1568" fill="currentColor" font-size="13">
<rect x="170" y="14" width="14" height="10" fill-opacity=".8"/><text x="190" y="24">public or encapsulation key</text>
<rect x="390" y="14" width="14" height="10" fill-opacity=".3"/><text x="410" y="24">ciphertext or reply share</text>
<g>
<text x="20" y="62">X25519</text>
<rect x="170" y="50" width="8.6" height="12" fill-opacity=".8"/><text x="184" y="61">32</text>
<rect x="170" y="64" width="8.6" height="12" fill-opacity=".3"/><text x="184" y="75">32</text>
<text x="20" y="104">RSA-2048</text>
<rect x="170" y="92" width="68.6" height="12" fill-opacity=".8"/><text x="245" y="103">256</text>
<rect x="170" y="106" width="68.6" height="12" fill-opacity=".3"/><text x="245" y="117">256</text>
<text x="20" y="146">ML-KEM-512</text>
<rect x="170" y="134" width="214.3" height="12" fill-opacity=".8"/><text x="391" y="145">800</text>
<rect x="170" y="148" width="205.7" height="12" fill-opacity=".3"/><text x="382" y="159">768</text>
<text x="20" y="188">ML-KEM-768</text>
<rect x="170" y="176" width="317.2" height="12" fill-opacity=".8"/><text x="494" y="187">1,184</text>
<rect x="170" y="190" width="291.4" height="12" fill-opacity=".3"/><text x="468" y="201">1,088</text>
<text x="20" y="230">X25519MLKEM768</text>
<rect x="170" y="218" width="325.7" height="12" fill-opacity=".8"/><text x="502" y="229">1,216</text>
<rect x="170" y="232" width="300" height="12" fill-opacity=".3"/><text x="476" y="243">1,120</text>
<text x="20" y="272">ML-KEM-1024</text>
<rect x="170" y="260" width="420" height="12" fill-opacity=".8"/><text x="596" y="271">1,568</text>
<rect x="170" y="274" width="420" height="12" fill-opacity=".3"/><text x="596" y="285">1,568</text>
</g>
<line x1="170" y1="40" x2="170" y2="292" stroke="currentColor"/>
<text x="170" y="306" fill-opacity=".7">bytes, same scale for every bar</text>
</svg>
<figcaption>Figure 8.3. What each side sends. The X25519MLKEM768 row is the hybrid TLS key share: the ML-KEM-768 key or ciphertext with 32 bytes of X25519 added. RSA-2048 is shown by its 256-byte modulus. Classic McEliece (Chapter 13) would need a bar about 166 times as long as the longest one here for its 261,120-byte smallest public key.</figcaption>
</figure>

For comparison, an X25519 public key is 32 bytes. ML-KEM-768's 1,184 bytes are about 37
times as big. Together with the X25519 share they push the TLS ClientHello past the size of
one typical network packet, and when Chrome first turned the hybrid on in 2024 some old
middleboxes that assumed a one-packet ClientHello broke (the site tldr.fail collected the
cases). Most networks coped, the broken boxes were fixed, and the hybrid X25519MLKEM768 is
now the default. ML-KEM-768 is the set most deployments choose: it is what Chrome, Firefox,
Cloudflare and OpenSSH use.

## 8.5 Randomness from seeds

*Level: intermediate.*

ML-KEM uses very little true randomness: 64 bytes for a key pair ($d$ and $z$) and 32 for an
encapsulation ($m$). Everything else is expanded from those seeds with SHA-3 functions,
which FIPS 203 names:

- $H$ = SHA3-256, $G$ = SHA3-512 (output split into two 32-byte halves), $J$ = SHAKE256
  with 32 bytes of output.
- $\mathrm{PRF}_\eta(s, b)$ = SHAKE256$(s \,\|\, b)$ with $64\eta$ bytes of output, used for the
  small polynomials.
- An XOF, SHAKE128, used to expand the matrix.

**The matrix.** Entry $\hat{A}[i][j]$ is produced by SampleNTT from SHAKE128$(\rho \,\|\, j \,\|\,
i)$: read the output three bytes at a time as two 12-bit numbers, keep each number below
$q$, and stop after 256. About 81 percent of candidates are kept ($3329/4096$), so on average
about 158 three-byte groups are read. The result is a uniformly random polynomial, already
in NTT form (Chapter 7), and since $\rho$ is in the public key, everyone gets the same
$\hat{\mathbf{A}}$. The loop has no fixed bound: in principle it could need any number of bytes.
The code in §8.6 starts with 840 bytes and asks for more in the rare case they run out.

**The small polynomials.** SamplePolyCBD turns $64\eta$ bytes into 256 coefficients from the
centered binomial distribution: for each coefficient, add $\eta$ bits, subtract $\eta$ more.
The result lies in $\{-\eta, \dots, \eta\}$ with the binomial shape, needs no tables and no
rejection, and takes the same time for every input, which matters for side channels
(Chapter 17).

**Key generation** derives $(\rho, \sigma) = G(d \,\|\, k)$. The byte $k$ was added in the final
standard so that the same seed $d$ gives unrelated keys at different security levels. The
secret and error vectors come from $\mathrm{PRF}_{\eta_1}(\sigma, 0), \mathrm{PRF}_{\eta_1}(\sigma,
1), \dots$ with a counter byte that never repeats.

Because everything is derived, the whole key pair can be stored as the 64-byte seed
$(d, z)$ and regenerated when needed. §8.10 returns to that.

### Following the bytes

Figure 8.4 traces key generation from the two random seeds to the two keys, with the names of
FIPS 203's algorithms. ML-KEM.KeyGen (Algorithm 19) draws $d$ and $z$ and hands them to
`ML-KEM.KeyGen_internal` (Algorithm 16), which calls K-PKE.KeyGen (Algorithm 13) on $d$ and then
appends the copy of ek, its hash and $z$.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="ML-KEM key generation data flow: d goes through G(d, k) to give rho and sigma; rho is expanded by SampleNTT into the matrix A-hat; sigma through PRF and the centered binomial sampler gives s and e, transformed by the NTT; t-hat equals A-hat times s-hat plus e-hat; ek is t-hat encoded in 12 bits followed by rho; dk is s-hat encoded, then ek, H(ek) and z" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor">
<rect x="20" y="20" width="130" height="30" rx="4"/>
<rect x="175" y="20" width="95" height="30" rx="4"/>
<rect x="295" y="20" width="50" height="30" rx="4"/>
<rect x="370" y="20" width="150" height="30" rx="4"/>
<rect x="545" y="20" width="75" height="30" rx="4"/>
<rect x="175" y="80" width="95" height="30" rx="4"/>
<rect x="295" y="80" width="185" height="30" rx="4"/>
<rect x="505" y="80" width="115" height="30" rx="4"/>
<rect x="430" y="140" width="190" height="30" rx="4"/>
<rect x="330" y="200" width="290" height="30" rx="4" stroke-width="1.8"/>
<rect x="20" y="260" width="130" height="30" rx="4"/>
<rect x="190" y="260" width="430" height="30" rx="4" stroke-width="1.8"/>
<line x1="150" y1="35" x2="175" y2="35"/><line x1="270" y1="35" x2="295" y2="35"/>
<line x1="345" y1="35" x2="370" y2="35"/><line x1="520" y1="35" x2="545" y2="35"/>
<line x1="222" y1="50" x2="222" y2="80"/>
<line x1="270" y1="95" x2="295" y2="95"/><line x1="480" y1="95" x2="505" y2="95"/>
<path d="M620 35 H632 V155 H620"/>
<line x1="562" y1="110" x2="562" y2="140"/>
<line x1="525" y1="170" x2="525" y2="200"/>
<line x1="475" y1="230" x2="475" y2="260"/>
<line x1="150" y1="275" x2="190" y2="275"/>
</g>
<text x="28" y="40">d: 32 random B</text>
<text x="190" y="40">G(d ‖ k)</text>
<text x="314" y="40">ρ</text>
<text x="380" y="40">SampleNTT(ρ‖j‖i)</text>
<text x="556" y="40">Â, k×k</text>
<text x="215" y="100">σ</text>
<text x="303" y="100">PRF(σ, N), SamplePolyCBD</text>
<text x="515" y="100">NTT: ŝ, ê</text>
<text x="452" y="160">t̂ = Â ∘ ŝ + ê</text>
<text x="340" y="220">ek = ByteEncode₁₂(t̂) ‖ ρ</text>
<text x="540" y="220" fill-opacity=".7">384k + 32 B</text>
<text x="30" y="280">z: 32 random B</text>
<text x="198" y="280">dk = ByteEncode₁₂(ŝ) ‖ ek ‖ H(ek) ‖ z</text>
<text x="525" y="280" fill-opacity=".7">768k + 96 B</text>
<text x="20" y="160" fill-opacity=".7">public: ρ, Â, t̂, ek</text>
<text x="20" y="180" fill-opacity=".7">secret: d, σ, ŝ, ê, z</text>
<text x="20" y="318" fill-opacity=".7">Only d and z are random: the pair (d, z) is the whole private key.</text>
</svg>
<figcaption>Figure 8.4. ML-KEM key generation, byte by byte. The matrix comes from the public seed $\rho$, the secret and error vectors from the secret seed $\sigma$ with a counter $N$, and the key byte $k$ inside $G$ separates the three parameter sets. The error $\hat{\mathbf{e}}$ is used once and thrown away; it is not part of either key.</figcaption>
</figure>

Encapsulation (Algorithms 17 and 20) follows the same pattern with one random input. It draws
$m$, computes $(K, r) = G(m \,\|\, H(\mathrm{ek}))$, and K-PKE.Encrypt (Algorithm 14) uses
$r$ as the seed for $\mathbf{y}$, $\mathbf{e}_1$ and $e_2$, with counters $0$ to $2k$, while
the matrix is rebuilt from the $\rho$ at the end of ek. Decapsulation (Algorithms 18 and 21)
has no random input at all. Every algorithm with randomness is split in the same way: an
outer function that draws the random bytes, and an "internal" function that takes them as
arguments and is fully deterministic. The internal functions are what test vectors exercise
(§8.6). FIPS 203 does not let applications feed them randomness of their own choosing; apart
from testing, and from expanding a stored seed (§8.10), the random bytes must come from an
approved generator (SP 800-90A, SP 800-90B and SP 800-90C) at the security strength of the
parameter set: 128, 192 or 256 bits.

## 8.6 The complete code

*Level: intermediate.*

Here is ML-KEM in full, following FIPS 203's algorithm numbers. It is written for reading:
each function is one algorithm of the standard, and nothing is optimized. It is slow (a key
generation, encapsulation and decapsulation take tens of milliseconds) and it is not
constant-time, so it must never protect anything real. But it is exact: it gives the same
bytes as any correct implementation.

```python
"""ML-KEM (FIPS 203) in plain Python, standard library only. For learning, not for use."""
import hashlib

Q, N = 3329, 256
PARAMS = {"ML-KEM-512": (2, 3, 2, 10, 4), "ML-KEM-768": (3, 2, 2, 10, 4),
          "ML-KEM-1024": (4, 2, 2, 11, 5)}           # k, eta1, eta2, du, dv

def bitrev7(i):
    return int(format(i, "07b")[::-1], 2)

ZETAS = [pow(17, bitrev7(i), Q) for i in range(128)]
GAMMAS = [pow(17, 2 * bitrev7(i) + 1, Q) for i in range(128)]

# --- hashes (Section 4.1) ---
def G(b):  return hashlib.sha3_512(b).digest()
def H(b):  return hashlib.sha3_256(b).digest()
def J(b):  return hashlib.shake_256(b).digest(32)
def PRF(eta, s, b):  return hashlib.shake_256(s + bytes([b])).digest(64 * eta)

# --- encoding (Algorithms 3 to 6) ---
def byte_encode(f, d):
    bits = 0
    for i, a in enumerate(f):
        bits |= (a % (1 << d)) << (i * d)
    return bits.to_bytes(32 * d, "little")

def byte_decode(b, d):
    bits, m = int.from_bytes(b, "little"), (1 << d) if d < 12 else Q
    return [((bits >> (i * d)) & ((1 << d) - 1)) % m for i in range(N)]

def compress(x, d):    return ((x << d) + Q // 2) // Q % (1 << d)
def decompress(y, d):  return (y * Q + (1 << (d - 1))) >> d

# --- sampling (Algorithms 7 and 8) ---
def sample_ntt(seed):
    xof, j, a = hashlib.shake_128(seed).digest(840), 0, []
    while len(a) < N:
        if j + 3 > len(xof):                        # rare: squeeze more output
            xof = hashlib.shake_128(seed).digest(2 * len(xof))
        c0, c1, c2 = xof[j], xof[j + 1], xof[j + 2]
        j += 3
        d1, d2 = c0 + 256 * (c1 % 16), c1 // 16 + 16 * c2
        if d1 < Q: a.append(d1)
        if d2 < Q and len(a) < N: a.append(d2)
    return a

def sample_cbd(b, eta):
    bits = int.from_bytes(b, "little")
    f = []
    for i in range(N):
        x = sum((bits >> (2 * i * eta + j)) & 1 for j in range(eta))
        y = sum((bits >> (2 * i * eta + eta + j)) & 1 for j in range(eta))
        f.append((x - y) % Q)
    return f

# --- the number-theoretic transform (Algorithms 9 to 12) ---
def ntt(f):
    f, i, length = list(f), 1, 128
    while length >= 2:
        for start in range(0, N, 2 * length):
            z = ZETAS[i]; i += 1
            for j in range(start, start + length):
                t = z * f[j + length] % Q
                f[j + length] = (f[j] - t) % Q
                f[j] = (f[j] + t) % Q
        length //= 2
    return f

def ntt_inv(f):
    f, i, length = list(f), 127, 2
    while length <= 128:
        for start in range(0, N, 2 * length):
            z = ZETAS[i]; i -= 1
            for j in range(start, start + length):
                t = f[j]
                f[j] = (t + f[j + length]) % Q
                f[j + length] = z * (f[j + length] - t) % Q
        length *= 2
    return [x * 3303 % Q for x in f]                # 3303 = 128^-1 mod q

def multiply_ntts(f, g):
    h = []
    for i in range(128):
        a0, a1, b0, b1 = f[2 * i], f[2 * i + 1], g[2 * i], g[2 * i + 1]
        h += [(a0 * b0 + a1 * b1 * GAMMAS[i]) % Q, (a0 * b1 + a1 * b0) % Q]
    return h

def add(f, g):  return [(a + b) % Q for a, b in zip(f, g)]
def sub(f, g):  return [(a - b) % Q for a, b in zip(f, g)]

# --- K-PKE (Algorithms 13 to 15) ---
def matrix(rho, k, transpose=False):
    return [[sample_ntt(rho + bytes([j, i] if not transpose else [i, j]))
             for j in range(k)] for i in range(k)]

def pke_keygen(d, k, eta1):
    rho, sigma = G(d + bytes([k]))[:32], G(d + bytes([k]))[32:]
    A = matrix(rho, k)
    s = [ntt(sample_cbd(PRF(eta1, sigma, i), eta1)) for i in range(k)]
    e = [ntt(sample_cbd(PRF(eta1, sigma, k + i), eta1)) for i in range(k)]
    t = [e[i] for i in range(k)]
    for i in range(k):
        for j in range(k):
            t[i] = add(t[i], multiply_ntts(A[i][j], s[j]))
    ek = b"".join(byte_encode(x, 12) for x in t) + rho
    dk = b"".join(byte_encode(x, 12) for x in s)
    return ek, dk

def pke_encrypt(ek, m, r, k, eta1, eta2, du, dv):
    t = [byte_decode(ek[384 * i:384 * (i + 1)], 12) for i in range(k)]
    rho = ek[384 * k:]
    AT = matrix(rho, k, transpose=True)
    y = [ntt(sample_cbd(PRF(eta1, r, i), eta1)) for i in range(k)]
    e1 = [sample_cbd(PRF(eta2, r, k + i), eta2) for i in range(k)]
    e2 = sample_cbd(PRF(eta2, r, 2 * k), eta2)
    u = []
    for i in range(k):
        acc = [0] * N
        for j in range(k):
            acc = add(acc, multiply_ntts(AT[i][j], y[j]))
        u.append(add(ntt_inv(acc), e1[i]))
    mu = [decompress(b, 1) for b in byte_decode(m, 1)]
    acc = [0] * N
    for j in range(k):
        acc = add(acc, multiply_ntts(t[j], y[j]))
    v = add(add(ntt_inv(acc), e2), mu)
    c1 = b"".join(byte_encode([compress(x, du) for x in p], du) for p in u)
    return c1 + byte_encode([compress(x, dv) for x in v], dv)

def pke_decrypt(dk, c, k, du, dv):
    u = [[decompress(x, du) for x in byte_decode(c[32 * du * i:32 * du * (i + 1)], du)]
         for i in range(k)]
    v = [decompress(x, dv) for x in byte_decode(c[32 * du * k:], dv)]
    s = [byte_decode(dk[384 * i:384 * (i + 1)], 12) for i in range(k)]
    acc = [0] * N
    for i in range(k):
        acc = add(acc, multiply_ntts(s[i], ntt(u[i])))
    w = sub(v, ntt_inv(acc))
    return byte_encode([compress(x, 1) for x in w], 1)

# --- ML-KEM (Algorithms 16 to 18), with seeds passed in for testing ---
def keygen(params, d, z):
    k, eta1, _, _, _ = PARAMS[params]
    ek, dk_pke = pke_keygen(d, k, eta1)
    return ek, dk_pke + ek + H(ek) + z

def encaps(params, ek, m):
    k, eta1, eta2, du, dv = PARAMS[params]
    K, r = G(m + H(ek))[:32], G(m + H(ek))[32:]
    return K, pke_encrypt(ek, m, r, k, eta1, eta2, du, dv)

def decaps(params, dk, c):
    k, eta1, eta2, du, dv = PARAMS[params]
    dk_pke, ek = dk[:384 * k], dk[384 * k:768 * k + 32]
    h, z = dk[768 * k + 32:768 * k + 64], dk[768 * k + 64:]
    m2 = pke_decrypt(dk_pke, c, k, du, dv)
    K2, r2 = G(m2 + h)[:32], G(m2 + h)[32:]
    K_bar = J(z + c)
    c2 = pke_encrypt(ek, m2, r2, k, eta1, eta2, du, dv)
    return K2 if c2 == c else K_bar                 # constant time in real code
```

How do we know it is right? NIST's Cryptographic Algorithm Validation Program publishes test
files for FIPS 203 through its ACVP server project: 75 key-generation tests, 105
encapsulation and decapsulation tests, and 60 tests of the key checks of §8.10. This code
reproduces all 180 key-generation, encapsulation and decapsulation results byte for byte, and
with the checks of §8.10 it gives the expected verdict on all 60 key-check tests.
The listing below checks one key-generation vector per parameter set. To keep the page short
it compares SHA3-256 hashes of the expected keys rather than the keys themselves, which are
up to 3,168 bytes long.

```python
# Uses keygen() from the listing above.
# One NIST ACVP key-generation vector per parameter set (seeds d and z, and the
# SHA3-256 hashes of the expected ek and dk, to keep the page short).
import hashlib
VECTORS = [
    ("ML-KEM-512",
     "47B893474672BA92E4B12EE44FB32953AF8E8503B5FB471D1614FB8A021A660A",
     "1F8CB39E9E30BC458A0DC5408884B1187FB217018DF760FA57317703B844A0A9",
     "3a389831056ed8fd81476869245782689c84b3ce90fe6a9e78d0a380fd6a1573",
     "c26aff5b9f97b5b9ca824755d053a1b1aece2b965af6bfbd527b77ea22538468"),
    ("ML-KEM-768",
     "E582B7D75E6C80B05AE392A1FC9F7153B12390FD99930368CC67A768BAEBC8A0",
     "1CDACB8740C0B87C4A379575F187B367CBFA3B300BF591B109F79816E9CBE8F0",
     "81e66ef5a7a221619f6a64039cc369843e10df5c859f6959cc3fd8e5272330fd",
     "be81068c104cd6cf8efd800b294f4a15bb8a8050993fd54a2cc428841ef6ca44"),
    ("ML-KEM-1024",
     "F3A706FAF090C03DB506863AB0B20BD8A1627956318E88C67EB875E8E7266009",
     "35D2BC43DD1CC879F765BF2A0C5E297889DDE910E57E2BB0EAE417B90AB7A275",
     "9370fe5b05ddc92c939f62cbde4c0fea36f45cd20c5748cf3ac891a4c2604496",
     "b8c683c71564ff8e2391c57b68c3a1ff186734b13e31d2a075b65307c8b80888"),
]
for name, d, z, ek_hash, dk_hash in VECTORS:
    ek, dk = keygen(name, bytes.fromhex(d), bytes.fromhex(z))
    ok = (hashlib.sha3_256(ek).hexdigest() == ek_hash and
          hashlib.sha3_256(dk).hexdigest() == dk_hash)
    K, c = encaps(name, ek, bytes(32))
    print(f"{name}: ek {len(ek)} B, dk {len(dk)} B, ciphertext {len(c)} B, "
          f"matches NIST: {ok}")
```

It prints:

```text
ML-KEM-512: ek 800 B, dk 1632 B, ciphertext 768 B, matches NIST: True
ML-KEM-768: ek 1184 B, dk 2400 B, ciphertext 1088 B, matches NIST: True
ML-KEM-1024: ek 1568 B, dk 3168 B, ciphertext 1568 B, matches NIST: True
```

The sizes agree with Table 8.1. A test against official vectors is the first thing any
implementation must pass, and it catches most mistakes: a swapped index in the matrix, a
missing domain-separation byte or a wrong rounding constant each change every output byte.
It does not catch everything. Bugs that appear only for rare inputs, or that leak through
timing, pass every vector, which is why the C2SP project publishes extra "accumulated" and
edge-case tests and why §8.9 and Chapter 17 matter.

### Checking a vector yourself

The round 3 Kyber submission shipped its known-answer tests the old NIST way: files such as
`PQCkemKAT_1632.rsp`, where each test gives a 48-byte seed for NIST's AES-based random
generator, and the keys, ciphertext and shared secret that come out if every random byte is
drawn from it in exactly the reference code's order. To use them you had to reimplement that
generator and call it in the same order, and a mismatch told you only that something,
somewhere, was different.

The ACVP files for FIPS 203 cut the generator out. They exercise the internal functions of
§8.5 and give their random inputs directly: $d$ and $z$ for key generation, $m$ for
encapsulation. Each algorithm has a folder in the ACVP-Server repository
(`gen-val/json-files/ML-KEM-keyGen-FIPS203` and `ML-KEM-encapDecap-FIPS203`) with three
files: `prompt.json` (the inputs a lab sends to a product under test), `expectedResults.json`
(the answers) and `internalProjection.json` (both together, the easiest to use). The tests
come in groups:

```json
{"vsId": 42, "algorithm": "ML-KEM", "mode": "encapDecap", "revision": "FIPS203",
 "testGroups": [
  {"tgId": 1, "testType": "AFT", "parameterSet": "ML-KEM-512", "function": "encapsulation",
   "tests": [
    {"tcId": 1, "ek": "17E5129B2029F328...", "m": "DCACFE4DE1C115DA...",
     "c": "1C3204A5A2C03107...", "k": "2D74374B55D29AA5...", "dk": "C9096F060A1C4C97..."}]}]}
```

An "AFT" group (algorithm functional test) gives inputs and expects the outputs to be
computed and compared. A "VAL" group gives a case to judge: a decapsulation, whose
ciphertext may have been modified, or a key to put through the checks of §8.10, with the
expected verdict in `testPassed`. Each test carries a `reason`, and the reasons are a short
lesson in themselves: "modified ciphertext" (the expected key is the rejection key
$J(z \,\|\, c)$), "modified H" (the hash inside a decapsulation key was changed), and, for
encapsulation keys with a coefficient of $q$ or more, "noisy linear system values too large".

**Code it.** Test case 1 checked by hand. The 800-byte key is given in base64 to keep it
short; the expected ciphertext is again given by its SHA3-256 hash.

```python
# Uses encaps() from the listing above.
# ACVP ML-KEM-encapDecap-FIPS203, test group 1 (ML-KEM-512, encapsulation), tcId 1.
import base64, hashlib
ek = base64.b64decode("""
F+USmyAp8ygZh9ZiRyW2TFHPjco1YjcrrLeuFfqfL/arR2WbfTBbYfVfVxMV/2mqSeE4gQAxmmUO
hsWbowJMPeyD1KqrZhxFL2y2qNJjjBM8WZBFMpzMj2d9JGg98RRu4ccxjDdjpHrP+BoDknubrFpJ
3ChcTuIExNctuxyX/lPGIuYhM4Zp/PrB4wo28Kl2m7srpAh4fuYpzsOD8pqqq9RuIhM/M5wI4puC
xPqvD2duHCsEN3l13Do7JGSI7dFjbFirzWW4GYtvqKhHXvVB2vNLWtudsFidiVi2KoiTDuscDDUr
Hle8eILInvoxhFeBPytVuWiB5/dcPclzV2geVFU64JkJWsOLNMABmZUmAsSBwPHPdLVQznxPbFh2
r/B23ZIZQts3fhdJ8DBvd0Q6LwWNeFhUx+MrZ/Sby5ml4YqrYHxkm4krTafMevMVVxSfArGUYPtJ
5QUaclGt4Ag83BsLDKljMiDCs8Uy+iy8DcbP/NRFXgAF0GyvxyfHeDdctnrEYbNiemU8hDuurvhm
x/Z3RiYv9tdlNiVciQRaFyy/qhI9bso+VvySL0N6FPeNGttUs+VOjdUwRQuFAOFaVMl0ccsmq0Nz
lEgCgrprenhsKIV7rzh3JbtDQrTDq+TL+QYSsEyL3BWZwtTGa4CxoZQUQAQKQqq+A+HMsLQZB4C2
YDu2nsGZsGOCa+qlRHyIQnxr16BuQWSkkLlVFSl5uPW8lBdZivAbzDcVdxieF3UWW5YQufda7qJ3
AYscLAQ5ERW281Ov7suqGKpAAduU/NxfRupSDpg2vFpFdrWMWfw/dWNJRtjMGxCBzpOrqFZjBBaT
MvoxbUumdaCGrYeTeWNRHkoYReo4aJtWThEpVnIJjPAdXUurAzgSESimgrBI5qoxuDxl/4YeEjAQ
Qzo8dgeuXpDEOAZ/Y3tErfh5jNCYDsg72utNQnqPjYjFGeUlQvB3NKZFoqW9TWUhpLZKlqEPNQAn
gBabNeNfAcp0/mIHuLR168B5ZHzBCuw8KWg+Bx2HuCq73W02njJuR1Ml7Vrn7SMrN/STiMBqdA1C
EgQ=""")
m = bytes.fromhex("DCACFE4DE1C115DA106ACD1EEFEAFDC7F0F4E5707453EE2D6B0D69D34CC0EF4A")
expected_k = "2D74374B55D29AA585E144A29BA4F0A96537A73B4F176C5527075F66E38E8858"
expected_c_hash = "469862ade9e35df4c40cbddfe3594c43a059808b6790c7710cc28fe564c148ca"

K, c = encaps("ML-KEM-512", ek, m)
print("key length:", len(ek), " ciphertext length:", len(c))
print("ciphertext starts:", c[:8].hex().upper())
print("ciphertext matches:", hashlib.sha3_256(c).hexdigest() == expected_c_hash)
print("shared secret matches:", K.hex().upper() == expected_k)
```

It prints:

```text
key length: 800  ciphertext length: 768
ciphertext starts: 1C3204A5A2C03107
ciphertext matches: True
shared secret matches: True
```

The first bytes of the ciphertext can be compared with the excerpt above by eye. To run
every test, load `internalProjection.json` with Python's `json` module, loop over the groups,
pick the function by `function` and the parameter set by `parameterSet`, and compare. That
loop is twenty lines, and it is the loop behind the counts at the start of this section.

Passing ACVP is also what NIST's validation program asks of a product: the CAVP tests an
implementation against freshly generated vectors of this form before it can be listed as
validated for FIPS 203, and a FIPS 140-3 module must use validated algorithms. A failure in a
single group tells you a lot. If every key-generation test fails but encapsulation passes,
look at $G(d \,\|\, k)$, the counters that feed the PRF, or the order in which dk is assembled; if only the decapsulation tests marked
"modified ciphertext" fail, the rejection path is wrong; if all three parameter sets fail
the same way, look at the encodings.

## 8.7 How often does decryption fail?

*Level: intermediate.*

K-PKE decrypts correctly only if every one of the 256 noise coefficients stays below
$q/4$. The noise is random, so there is a small chance it does not. The listing below
encrypts 200 random messages under 200 random ML-KEM-512 keys (seeds fixed so the run can
be repeated), and measures the noise in every coefficient: $w$ minus the clean value
$1665 \cdot m_i$, centered around zero.

```python
# Uses pke_keygen(), pke_encrypt() from the listing above.
# How close does decryption come to failing? Measure the noise w - m*q/2.
import hashlib
def seed(*parts):          # fixed seeds, so the run can be repeated
    return hashlib.sha3_256(repr(parts).encode()).digest()
k, eta1, eta2, du, dv = PARAMS["ML-KEM-512"]
worst, total, big = 0, 0, 0
for trial in range(200):
    ek, dk = pke_keygen(seed(trial, 'd'), k, eta1)
    m = seed(trial, 'm')
    c = pke_encrypt(ek, m, seed(trial, 'r'), k, eta1, eta2, du, dv)
    u = [[decompress(x, du) for x in byte_decode(c[32*du*i:32*du*(i+1)], du)] for i in range(k)]
    v = [decompress(x, dv) for x in byte_decode(c[32*du*k:], dv)]
    s = [byte_decode(dk[384*i:384*(i+1)], 12) for i in range(k)]
    acc = [0] * N
    for i in range(k):
        acc = add(acc, multiply_ntts(s[i], ntt(u[i])))
    w = sub(v, ntt_inv(acc))
    bits = byte_decode(m, 1)
    for wi, b in zip(w, bits):
        noise = (wi - b * 1665 + Q // 2) % Q - Q // 2   # centered
        worst = max(worst, abs(noise)); total += 1
        big += abs(noise) > 400
print("coefficients checked:", total)
print("largest noise seen:", worst, " decryption fails only past 832")
print("coefficients with noise above 400:", big)
```

It prints:

```text
coefficients checked: 51200
largest noise seen: 285  decryption fails only past 832
coefficients with noise above 400: 0
```

In 51,200 coefficients the largest noise seen is about a third of the margin. That is
typical: the noise is a sum of many small independent-looking terms, and a coefficient past
832 is far out in its tail. FIPS 203 lists the decryption failure rates of the three
parameter sets as $2^{-138.8}$, $2^{-164.8}$ and $2^{-174.8}$ per decapsulation. A random test
cannot get anywhere near those numbers: at a million trials a second, seeing one failure of
ML-KEM-512 would take about $10^{28}$ years. They come from computation, and the computation
is small enough to redo.

### Computing $2^{-139}$

Write out one coefficient of the noise, including the two compression errors $\Delta_u$ and
$\Delta_v$ of §8.4:

$$\text{noise} = \sum_{256k \text{ terms}} e_i\, y_j \;+\; e_2 \;+\; \Delta_v \;-\;
\sum_{256k \text{ terms}} s_i\,(e_{1,j} + \Delta_{u,j}).$$

Each term is a product of two small random numbers, and each sum has $256k$ terms because a
coefficient of a ring product in $R_q$ collects one product from every pair of coefficients
(with a sign from $X^{256} = -1$), across $k$ components. The method of the Kyber designers'
scripts makes one assumption: that all these products are independent. Then the law of the
noise is a convolution, which can be computed exactly:

1. Tabulate the small laws: the centered binomial law of each $\eta$, and the law of the
   rounding error $\Delta_d$ over all $q$ inputs, as in the code of §8.4.
2. Form the law of one product, $e \cdot y$, and of $s \cdot (e_1 + \Delta_u)$, by running over
   all pairs of values.
3. Add $256k$ independent copies of each. Doubling is cheap (a law plus itself), so $256k$
   copies take about ten doublings; values with probability below $2^{-300}$ are dropped to
   keep the tables short.
4. Add $e_2 + \Delta_v$, and sum the probability of every value with $|x| > q/4$, that is
   $|x| \ge 833$.
5. A decapsulation fails if any of the 256 coefficients fails, so multiply by 256. This
   union bound is slightly pessimistic.

Before the code, the variance by hand, for ML-KEM-768. A centered binomial with $\eta = 2$
has variance $\eta/2 = 1$, so each $e_i y_j$ has variance $1 \cdot 1 = 1$, and $768$ of them give
768. Each $s_i(e_{1,j} + \Delta_{u,j})$ has variance $1 \cdot (1 + 0.92) = 1.92$ (the 0.92 is
the $d = 10$ row of §8.4), and $768$ of them give 1,478. Then $e_2$ adds 1 and $\Delta_v$ adds
3,608. The total is about 5,855, a standard deviation of about 76.5, and the failure
threshold 833 sits about 10.9 standard deviations out.

**Code it.** The whole computation, with a normal approximation of the same variance next to
it.

```python
# Uses compress(), decompress() and PARAMS from the listing above.
# The noise law of one coefficient, computed exactly from its parts (the method of the
# Kyber designers' scripts), and the failure probability that follows from it.
from math import comb, log2, erfc, sqrt

def cbd(eta):                      # centered binomial: {value: probability}
    return {a - eta: comb(2 * eta, a) / 4 ** eta for a in range(2 * eta + 1)}

def rounding(d):                   # error of Decompress(Compress(x)), x uniform mod q
    law = {}
    for x in range(Q):
        err = (decompress(compress(x, d), d) - x + Q // 2) % Q - Q // 2
        law[err] = law.get(err, 0) + 1 / Q
    return law

def law_add(A, B):                 # law of a + b, dropping values below 2^-300
    C = {}
    for a, pa in A.items():
        for b, pb in B.items():
            C[a + b] = C.get(a + b, 0) + pa * pb
    return {x: p for x, p in C.items() if p > 2 ** -300}

def law_mul(A, B):                 # law of a * b
    C = {}
    for a, pa in A.items():
        for b, pb in B.items():
            C[a * b] = C.get(a * b, 0) + pa * pb
    return C

def law_sum(A, n):                 # law of a sum of n independent copies (square and add)
    R, P = {0: 1.0}, A
    while n:
        if n & 1:
            R = law_add(R, P)
        P, n = law_add(P, P), n >> 1
    return R

print("set           variance   normal approx.   exact law")
for name in ("ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"):
    k, eta1, eta2, du, dv = PARAMS[name]
    ey = law_mul(cbd(eta1), cbd(eta1))                          # e_i * y_j
    se = law_mul(cbd(eta1), law_add(cbd(eta2), rounding(du)))   # s_i * (e1_j + error of u)
    noise = law_add(law_sum(ey, 256 * k), law_sum(se, 256 * k))
    noise = law_add(noise, law_add(cbd(eta2), rounding(dv)))    # + e2 + error of v
    var = sum(x * x * p for x, p in noise.items())
    exact = 256 * sum(p for x, p in noise.items() if abs(x) > Q // 4)
    normal = 256 * erfc((Q // 4 + 1) / sqrt(2 * var))
    print(f"{name:12} {var:9.0f}   2^{log2(normal):7.1f}       2^{log2(exact):6.1f}")
```

It prints (in about three seconds):

```text
set           variance   normal approx.   exact law
ML-KEM-512        6238   2^  -76.0       2^-139.1
ML-KEM-768        5854   2^  -81.3       2^-165.2
ML-KEM-1024       3345   2^ -145.8       2^-175.2
```

The exact laws give $2^{-139.1}$, $2^{-165.2}$ and $2^{-175.2}$, within half a bit of the
published $2^{-138.8}$, $2^{-164.8}$ and $2^{-174.8}$; the small gap comes from modeling details
that this listing does not try to reproduce, and half a bit is a factor of 1.4 on a number
near $10^{-42}$.

The middle column is the surprise. A normal distribution with the same variance puts the
failure rate of ML-KEM-512 at $2^{-76}$, wrong by 63 bits. The reason is the largest term:
$\Delta_v$ has variance 3,608 but can never exceed 104 in size. It widens the middle of the
distribution and does nothing for the tail. To fail, the other terms, with a standard
deviation of about 51, must reach $833 - 104 = 729$ on their own, more than 14 standard
deviations, and that is where $2^{-139}$ comes from. Bounded terms and normal approximations
do not mix, which is why the designers computed the law exactly.

The independence assumption is the weak point of the method. Coefficients of ring products
are not independent, and that dependency was studied after the competition began (D'Anvers,
Vercauteren and Verbauwhede, 2019). It matters most for schemes that combine many bits
through an error-correcting code; ML-KEM decodes each bit on its own, and its published
rates are estimates computed this way, not proven bounds.

### Why failures must be this rare

Why make failure so rare, when one failed handshake in a billion would be harmless? For
honest use, $2^{-139}$ is beyond any meaning: if every person on Earth ran 10,000 ML-KEM-512
handshakes a day, about $2^{55}$ a year, the expected number of failures in a year would be
about $2^{-84}$.

The real reason is the attacker. Failures are a weakness, not just a nuisance. If an
attacker can find ciphertexts that fail more often than usual and observe the failures, each
failure leaks information about the secret key, because it says that $\mathbf{s}$ lines up
unusually well with the error in that ciphertext. Attacks of this kind ("decryption failure
attacks", for example D'Anvers, Guo, Johansson, Nilsson, Vercauteren and Verbauwhede, 2019)
need a failure probability that is not negligible. The FO transform limits what the attacker
can do: the noise in an honest ciphertext comes from $G(m \,\|\, H(\mathrm{ek}))$, so the only
way to look for weak ciphertexts is to try many messages $m$ and keep those whose noise
happens to be large, which costs a hash per try ("failure boosting"). D'Anvers, Rossi and
Virdia (EUROCRYPT 2020) showed that once one failure is found, later ones get cheaper. Even
so, at $2^{-139}$ and with the $2^{64}$ decapsulation queries per key that NIST's call allowed
an attacker, the expected number of failures an attacker ever sees is essentially zero, and
these attacks stay far out of reach.

## 8.8 Break it: K-PKE alone

*Level: intermediate.*

K-PKE is secure against an attacker who only watches. Suppose instead someone built a
service on K-PKE alone: it holds a key pair, decrypts whatever ciphertexts it receives, and
acts on the result in a way the sender can see (it replies, uses the message as a key, or
just reports whether it was well formed). That is a decryption oracle, and K-PKE gives its
key away to one.

The attack writes its own ciphertext. Decryption computes $w = v - \mathbf{s}^T\mathbf{u}$. Set
$\mathbf{u}$ to zero except for the constant $a$ in component $j$, and set every coefficient of
$v$ to the same value $b$. Then

$$w_i = b - a \, s_{j,i}$$

for every $i$: each coefficient of the secret is multiplied by a number the attacker chose,
shifted by another, and rounded to one bit. With three well-chosen pairs $(a, b)$, the seven
possible values $-3, \dots, 3$ of a coefficient give seven different patterns of three bits.
Three ciphertexts per component reveal all 256 coefficients of that component at once.

```python
# Uses pke_keygen() and pke_decrypt() from the listing above.
# Break it: K-PKE alone, with a server that decrypts whatever it is sent.
import hashlib
k, eta1, eta2, du, dv = PARAMS["ML-KEM-512"]
ek, dk = pke_keygen(hashlib.sha3_256(b"victim").digest(), k, eta1)

def server_decrypts(c):                  # the oracle: returns the decrypted message
    return pke_decrypt(dk, c, k, du, dv)

def crafted(j, y, z):
    """u = the constant decompress(y) in component j, zero elsewhere; every v coefficient = decompress(z)."""
    u = [[0] * N for _ in range(k)]
    u[j][0] = y
    c1 = b"".join(byte_encode(p, du) for p in u)
    return c1 + byte_encode([z] * N, dv)

# Three chosen ciphertexts per component. Decryption computes w = v - a*s_j, and each
# coefficient of s_j in -3..3 gives its own pattern of three bits.
QUERIES = [(2, 12), (109, 1), (214, 2)]   # (y, z): a = decompress(y, 10), b = decompress(z, 4)
def bit(x):
    return compress(x % Q, 1)
TABLE = {}
for s in range(-eta1, eta1 + 1):
    pattern = tuple(bit(decompress(z, dv) - decompress(y, du) * s) for y, z in QUERIES)
    TABLE[pattern] = s
print("patterns distinct:", len(TABLE) == 2 * eta1 + 1)

recovered, sent = [], 0
for j in range(k):
    answers = []
    for y, z in QUERIES:
        answers.append(byte_decode(server_decrypts(crafted(j, y, z)), 1)); sent += 1
    recovered.append([TABLE[tuple(a[i] for a in answers)] % Q for i in range(N)])

true_s = [ntt_inv(byte_decode(dk[384 * i:384 * (i + 1)], 12)) for i in range(k)]
print("ciphertexts sent:", sent)
print("whole secret recovered:", recovered == true_s)
```

It prints:

```text
patterns distinct: True
ciphertexts sent: 6
whole secret recovered: True
```

Six ciphertexts, and the whole ML-KEM-512 secret is gone. The attacker does not need $a$ and
$b$ to be exact: the pairs were chosen from values that decompression can produce (the
attacker sends compressed coefficients $y$ and $z$), and the table built from them takes care
of the rest. Nothing about this needs a quantum computer or a lattice reduction. The
weakness is structural: K-PKE's decryption is a linear function of the secret followed by
rounding, and a linear function answers whatever question you ask it.

Weaker oracles fall too. If the service reveals only whether the decrypted message equals a
guess (a "plaintext-checking" oracle), key recovery takes a few thousand ciphertexts instead
of six. Qin, Cheng, Zhang, Pan, Hu and Ding (ASIACRYPT 2021) give such attacks for many lattice KEMs, and
side channels often provide exactly that kind of one-bit oracle (Chapter 17).

## 8.9 Fix it: the Fujisaki-Okamoto transform

*Level: intermediate.*

The fix is the wrapper of §8.2. Decapsulation decrypts, re-derives the randomness from the
decrypted message, re-encrypts, and compares. An attacker who writes $(\mathbf{u}, v)$ by hand
cannot make it equal to an honest encryption of anything, because an honest ciphertext's
noise comes from $G(m \,\|\, H(\mathrm{ek}))$, a hash the attacker cannot steer. So the
comparison fails, and decapsulation returns $\bar K = J(z \,\|\, c)$, a hash of a 32-byte secret
$z$ and the ciphertext itself.

**Fix it.** The same six crafted ciphertexts, sent to full ML-KEM decapsulation.

```python
# Uses crafted() from the listing above.
# Fix it: the same six crafted ciphertexts, sent to full ML-KEM decapsulation.
d, z = hashlib.sha3_256(b"victim").digest(), hashlib.sha3_256(b"victim z").digest()
ek, dk = keygen("ML-KEM-512", d, z)
answers = []
for j in range(k):
    for y, zz in QUERIES:
        c = crafted(j, y, zz)
        K = decaps("ML-KEM-512", dk, c)
        answers.append(K == J(z + c))
print("crafted ciphertexts rejected:", sum(answers), "of", len(answers))
print("each answer is J(z || c): a hash of the attacker's own bytes and a secret")
```

It prints:

```text
crafted ciphertexts rejected: 6 of 6
each answer is J(z || c): a hash of the attacker's own bytes and a secret
```

Every crafted ciphertext was rejected, and each answer is a value the attacker could not
have predicted and that does not depend on $\mathbf{s}$ at all. The attack learns nothing.

Two design choices here are worth seeing clearly.

**Implicit, not explicit, rejection.** Decaps could return an error instead of
$J(z \,\|\, c)$. ML-KEM does not, so that a rejected ciphertext produces a key that looks
like any other: the protocol fails later, when the two sides' keys disagree, in the same way
as any other mismatch. An explicit error is a one-bit signal ("your ciphertext was
malformed"), and one-bit signals are what attacks are built from. The security proofs in the
quantum random oracle model (Chapter 3) are also cleanest for implicit rejection.

**The comparison must be constant-time.** The check $c' = c$ compares 768 to 1,568 bytes. A
comparison that stops at the first differing byte, or the C function `strcmp`, which stops
at a zero byte, takes time that depends on where the difference is, and leaks it. The
choice between $K'$ and $\bar K$ must also be made without a branch. Real code computes a
mask from the full comparison and selects with bit operations. The C2SP project publishes
"strcmp" test vectors that catch the zero-byte mistake; the Python here, which uses `==` and
`if`, would fail a timing test and is for reading only.

Each piece of the decapsulation key now has a job. $\hat{\mathbf{s}}$ decrypts. The copy of
$\mathrm{ek}$ re-encrypts. $h = H(\mathrm{ek})$ saves rehashing a kilobyte on every call. $z$
makes the rejection key unpredictable.

**Check it.** Bit flips are rejected, and the rejection key is deterministic:

```python
# Uses keygen(), encaps() and decaps() from the listing above.
import os
ek, dk = keygen("ML-KEM-768", os.urandom(32), os.urandom(32))
K, c = encaps("ML-KEM-768", ek, os.urandom(32))
print("honest ciphertext, same key:   ", decaps("ML-KEM-768", dk, c) == K)
bad = bytearray(c); bad[100] ^= 1                     # flip one bit
K1 = decaps("ML-KEM-768", dk, bytes(bad))
K2 = decaps("ML-KEM-768", dk, bytes(bad))
print("one bit flipped, same key:      ", K1 == K)
print("same bad ciphertext twice, same:", K1 == K2)
print("rejection key is J(z || c):     ", K1 == J(dk[-32:] + bytes(bad)))
```

It prints:

```text
honest ciphertext, same key:    True
one bit flipped, same key:       False
same bad ciphertext twice, same: True
rejection key is J(z || c):      True
```

### Why the rejection key needs its own secret

Implicit rejection only means something if nobody but the key holder can compute the
rejection key. Suppose a library, to save storing 32 bytes, returned $J(c)$ instead of
$J(z \,\|\, c)$. Every rejected ciphertext would then get a key the attacker can compute too,
and the first time the protocol uses the key in a way the attacker can see, rejection
becomes visible. The listing below has a server that confirms its key with a MAC, as TLS
does with its Finished message, and an attacker who checks the MAC against $J(c)$.

```python
# Uses keygen(), encaps(), decaps() and J() from the listing above.
# Does the attacker learn that a ciphertext was rejected? With J(c), yes; with J(z || c), no.
import hmac, hashlib
d, z = hashlib.sha3_256(b"server d").digest(), hashlib.sha3_256(b"server z").digest()
ek, dk = keygen("ML-KEM-768", d, z)
K, c = encaps("ML-KEM-768", ek, hashlib.sha3_256(b"message").digest())
bad = bytes([c[0] ^ 1]) + c[1:]                       # one bit flipped

def server_tag(c, careless):
    K = decaps("ML-KEM-768", dk, c)
    if careless and K == J(z + c):                    # careless variant: J(c), no secret
        K = J(c)
    return hmac.new(K, b"server finished", hashlib.sha256).digest()

def looks_rejected(c, tag):                           # the attacker's test
    return tag == hmac.new(J(c), b"server finished", hashlib.sha256).digest()

for careless in (True, False):
    name = "J(c)     " if careless else "J(z || c)"
    print(f"rejection key {name}: honest c looks rejected:",
          looks_rejected(c, server_tag(c, careless)),
          " modified c looks rejected:", looks_rejected(bad, server_tag(bad, careless)))
```

It prints:

```text
rejection key J(c)     : honest c looks rejected: False  modified c looks rejected: True
rejection key J(z || c): honest c looks rejected: False  modified c looks rejected: False
```

With $J(c)$ the server's answer says "rejected" as clearly as an error code would. With
$J(z \,\|\, c)$ a rejected ciphertext gives a tag the attacker cannot tell from the tag of any
other key it did not know.

Is that signal dangerous by itself? Against a perfect implementation, not very: every
ciphertext the attacker has modified is rejected anyway, so learning "rejected" teaches
little. The reasons for $z$ are elsewhere:

- **The proof.** The security proofs for FO with implicit rejection in the quantum random
  oracle model (Chapter 3) work by answering decapsulation queries without the secret key,
  with values that look like a random function of $c$. The real scheme matches that
  simulation only if its rejection key is also a random-looking function of $c$, which
  needs a secret: $J(z \,\|\, c)$ with $J$ modeled as a random oracle is exactly that.
- **Defense in depth.** Real attacks on decapsulation combine small leaks. A decryption
  failure (§8.7), a fault that corrupts the decrypted message, or a timing difference inside
  re-encryption (§8.12) each turn into key recovery only if the attacker can tell a good
  decapsulation from a bad one. An unpredictable rejection key removes one of the easiest
  ways to tell.
- **No error path.** Decaps always returns 32 bytes and never fails, so there is no error
  code to branch on, log, or return early from, and nothing for a caller to mishandle.

FIPS 203 makes $z$ a separate 32 random bytes drawn at key generation, stored at the end of
dk, and part of the 64-byte seed. It is used only to compute the rejection key and never meets
$\hat{\mathbf{s}}$. That is also why a stolen copy of $z$ alone is harmless: it lets an
attacker predict rejection keys, which is the weakness above, but not decrypt anything.

## 8.10 Input checks and key formats

*Level: intermediate.*

FIPS 203 (Section 7) requires checks on inputs that come from outside.

**The encapsulation key.** Each 12-bit field must be below $q$. A 12-bit field can hold up to
4,095, and decoding reduces it modulo $q$, so a key with a field of 4,095 silently behaves as
a key with 766: the sender would encapsulate to a different key than the one it was shown.
The **modulus check** decodes and re-encodes the key and requires the same bytes back. The
**type check** requires the right length.

**The decapsulation key** contains its own copy of the encapsulation key and its hash. The
**hash check** recomputes $H(\mathrm{ek})$ and compares it with the stored $h$, catching a
corrupted or tampered key file. The ciphertext gets a length check.

```python
# Uses keygen() and encaps() from the listing above.
# The input checks of FIPS 203, Section 7.
def ek_ok(ek, k):
    if len(ek) != 384 * k + 32:                       # type check
        return False
    for i in range(k):                                # modulus check
        part = ek[384 * i:384 * (i + 1)]
        if byte_encode(byte_decode(part, 12), 12) != part:
            return False
    return True

def dk_ok(dk, k):
    if len(dk) != 768 * k + 96:                       # type check
        return False
    return H(dk[384 * k:768 * k + 32]) == dk[768 * k + 32:768 * k + 64]   # hash check

ek, dk = keygen("ML-KEM-768", bytes(32), bytes(32))
print("honest ek passes:", ek_ok(ek, 3), " honest dk passes:", dk_ok(dk, 3))
bad = bytearray(ek)
bad[0], bad[1] = 0xFF, bad[1] | 0x0F                  # first coefficient = 4095 > q
print("ek with a coefficient of 4095 passes:", ek_ok(bytes(bad), 3))
print("  that coefficient silently becomes:", byte_decode(bytes(bad[:384]), 12)[0])
bad = bytearray(dk); bad[1200] ^= 1                   # corrupt the copy of ek inside dk
print("dk with a corrupted ek copy passes:", dk_ok(bytes(bad), 3))
```

It prints:

```text
honest ek passes: True  honest dk passes: True
ek with a coefficient of 4095 passes: False
  that coefficient silently becomes: 766
dk with a corrupted ek copy passes: False
```

Where the encapsulation key was just generated by the same program, the check finds
nothing; it exists for keys that arrive from outside.

### Why each check exists

**The modulus check** protects the meaning of a key's bytes. Without it, the 767 spare values
of each 12-bit field (§8.4) give every key many byte strings that decode to the same
polynomials. The sender hashes the bytes it was given into $H(\mathrm{ek})$, which goes into
$G(m \,\|\, H(\mathrm{ek}))$ and so into the shared secret; an implementation that reduced and
re-encoded the key before hashing would derive a different secret from the same ciphertext.
Two honest implementations that disagree about a key's identity are a protocol bug waiting to
happen, and a key whose bytes do not mean what they say breaks any protocol that identifies
keys by their hash, as certificate systems and key transparency logs do. The check costs one
decode and one encode, nothing next to the matrix expansion that follows. ACVP tests it with
keys whose fields hold 3,329 or more, under the reason "noisy linear system values too large",
since $\mathbf{t} = \mathbf{A}\mathbf{s} + \mathbf{e}$ is a noisy linear system.

**The hash check** protects a decapsulation key that was stored or moved. FIPS 203 lists it,
together with length checks on the key and the ciphertext, as the input checking for
decapsulation. It catches a corrupted or
swapped copy of ek inside dk, which would otherwise make every re-encryption fail and every
decapsulation return a rejection key, silently. It does not cover $\hat{\mathbf{s}}$ or $z$:
the stored hash says nothing about them.

**When to check.** The encapsulation key check belongs where a key enters from outside: a TLS
server checks the client's key share, a messaging app checks a contact's published key. For a
link to Mars it belongs at the habitat end, on arrival: a key received from Earth that turns
out malformed costs a full round trip, 6 to 44 minutes, to replace, so it should be rejected
the moment it arrives and not when the first report is due.

### Seeds and expanded keys

A decapsulation key is 1,632 to 3,168 bytes, but everything in it can be regenerated from the
64 bytes $(d, z)$. FIPS 203 allows the seed to be kept as the private key and expanded with
`ML-KEM.KeyGen_internal` when needed. RFC 9935 (2026), which defines how ML-KEM keys appear in
X.509 certificates and private-key files, gives the private key three forms: the 64-byte seed
$d \,\|\, z$ (66 bytes with its DER tag and length), the expanded key of FIPS 203, or both
together. It recommends the seed.

The seed has four advantages. It is small. It cannot be internally inconsistent, because
every part of the expanded key is computed from it. It binds the private key to exactly one
public key; an expanded key whose parts were mixed from different key pairs can behave in
strange ways, and the binding analyses listed in §8.13 found weaker properties for expanded
keys for this reason. And it can be checked: an implementation that
receives both forms must regenerate the expanded key from the seed and compare. The expanded
form is faster to load, which matters only for a server that decapsulates many times with one
long-lived key.

**Code it.** The hash check of FIPS 203 against a seed comparison, on a key with one bit
flipped in $\hat{\mathbf{s}}$, as a stray bit flip in storage might do.

```python
# Uses keygen(), encaps(), decaps() and dk_ok() from the listings above.
# A bit flip in the secret part of an expanded key: the hash check misses it.
seed = bytes(range(64))                               # d = seed[:32], z = seed[32:]
ek, dk = keygen("ML-KEM-768", seed[:32], seed[32:])
flipped = bytearray(dk); flipped[5] ^= 0x04; flipped = bytes(flipped)

def matches_seed(dk, seed):
    return keygen("ML-KEM-768", seed[:32], seed[32:])[1] == dk

K, c = encaps("ML-KEM-768", ek, bytes(32))
print("seed:", len(seed), "bytes;  expanded key:", len(dk), "bytes")
print("flipped key passes the hash check: ", dk_ok(flipped, 3))
print("flipped key matches its seed:      ", matches_seed(flipped, seed))
print("flipped key still decapsulates to K:", decaps("ML-KEM-768", flipped, c) == K)
```

It prints:

```text
seed: 64 bytes;  expanded key: 2400 bytes
flipped key passes the hash check:  True
flipped key matches its seed:       False
flipped key still decapsulates to K: False
```

The flipped key passes the standard's check and then fails at its one job: it decrypts the
honest ciphertext wrongly, the re-encryption differs, and decapsulation returns a rejection
key, with no error anywhere. Both ends simply derive different keys. A device that keeps
only the seed and expands it at each start cannot end up in this state. Arcadia City's
controllers, on a planet whose thin atmosphere lets more cosmic rays reach the ground and the
memory chips on it, keep the 64-byte seed in their secure element and regenerate the expanded
key at boot.

## 8.11 What changed from Kyber to FIPS 203

*Level: expert.*

FIPS 203 is not the round 3 Kyber specification under a new name. The changes are small,
each was argued in public, and each breaks compatibility, so old Kyber code does not
interoperate with ML-KEM:

1. **No pre-hash of $m$.** Kyber computed $m \leftarrow H(m)$ first, to avoid sending raw
   random-number-generator output. FIPS 203 drops it and requires an approved generator
   instead.
2. **The shared secret comes straight from $G$.** Kyber derived its key as
   $\mathrm{KDF}(\bar K \,\|\, H(c))$, mixing in the ciphertext. ML-KEM outputs $K$ from
   $G(m \,\|\, H(\mathrm{ek}))$ directly. The rejection key changed from
   $\mathrm{KDF}(z \,\|\, H(c))$ to $J(z \,\|\, c)$.
3. **Input checks** (§8.10) became mandatory.
4. **Domain separation in key generation.** The final standard (not the August 2023 draft)
   computes $G(d \,\|\, k)$ instead of $G(d)$.
5. **Matrix indices.** The August 2023 draft had swapped the indices of $\hat{A}$ against the
   Kyber code by mistake; the final standard restored the original order. Test suites call
   this "the $\hat A$ fix", and some vectors published between the two versions target the
   draft with the fix applied.

This chapter's code reproduces the final vectors. With step 4 undone, the same code
reproduces C2SP's accumulated test hash for the draft version of ML-KEM-512 (10,000 random
tests hashed into one value), which is a useful check that the two versions are understood
correctly.

**Security level.** Changes 1 and 2 do not weaken the scheme; the proofs were redone for the
new form. The parameter sets are unchanged from round 3. ML-KEM-512's category 1 claim was
debated during the competition (Chapter 6 shows the estimator's numbers, which put it above
the category 1 threshold under the standard cost model); NIST kept it, and FIPS 203
recommends ML-KEM-768 as the default parameter set.

### The two versions side by side

| step | round 3 Kyber (specification 3.02) | ML-KEM (FIPS 203) |
|---|---|---|
| key generation seeds | $(\rho, \sigma) = G(d)$ | $(\rho, \sigma) = G(d \,\|\, k)$ |
| random message | $m \leftarrow H(m)$ | $m$ used as drawn |
| key and coins | $(\bar K, r) = G(m \,\|\, H(\mathrm{pk}))$ | $(K, r) = G(m \,\|\, H(\mathrm{ek}))$ |
| shared secret | $K = \mathrm{KDF}(\bar K \,\|\, H(c))$ | $K$, with no further step |
| on rejection | $\mathrm{KDF}(z \,\|\, H(c))$ | $J(z \,\|\, c)$ |
| input checks | none required | type, modulus and hash checks |

*Table 8.3. Encapsulation and decapsulation in round 3 Kyber and in ML-KEM. KDF in Kyber is
SHAKE256 with 32 bytes of output, the same function as ML-KEM's $J$.*

Each change has a reason. **The pre-hash of $m$** was there so that raw output of a system
random number generator would never be sent, even in encrypted form; FIPS 203 requires an
approved generator instead, which makes the extra hash redundant. **The hash of the
ciphertext** in the key cost a pass of SHA3-256 over 768 to 1,568 bytes in both encapsulation
and decapsulation; the IND-CCA proofs do not need it, because the re-encryption check already
ties a valid ciphertext to its message. The consequence is that ML-KEM's key is not a hash of
the ciphertext. With an honestly generated key the re-encryption check still makes the
ciphertext the only one that yields that key, and protocols such as X-Wing (Chapter 18) rely
on this when they leave the ML-KEM ciphertext out of their final hash. Where keys may be built
by an attacker, the binding analyses of §8.13 show the limits, and a protocol that needs the
key bound to the ciphertext should hash the ciphertext into its own transcript, as TLS does
anyway.

**The key byte in $G(d \,\|\, k)$** came late, between the draft and the final standard, after
public comments. Without it, a seed $d$ used at two security levels gives the same $\rho$,
so the ML-KEM-512 matrix would be the top-left corner of the ML-KEM-768 matrix, and the two
secret vectors would be read from the same SHAKE256 streams. Nobody had an attack from that
relation, but a key that is secretly related to another key is a bad thing to leave lying
around, and one byte removes it.

## 8.12 In the real world

*Level: expert.*

**Deployment, as of November 2026.** Google Chrome turned on the hybrid X25519Kyber768 by
default on desktop with Chrome 124 in April 2024 and moved to the standardized X25519MLKEM768
with Chrome 131 in November 2024. Firefox, Go's `crypto/tls`, OpenSSL 3.5 (April 2025) and
Apple's iOS 26 and macOS 26 (September 2025) followed, each offering X25519MLKEM768 by
default, and in 2026 the IETF published the TLS groups as RFC 10024. Cloudflare reported that
about 52 percent of the human-generated traffic to its network used post-quantum key agreement
by early December 2025, and over 65 percent on 7 April 2026; Cloudflare Radar publishes the
current figure. OpenSSH 10.0, released in April 2025, made the hybrid `mlkem768x25519-sha256`
its default key exchange. Signal (PQXDH, 2023) and Apple's iMessage (PQ3, 2024) adopted Kyber
before the standard was final. In almost every case ML-KEM runs as half of a hybrid with
X25519, and the support on the server side, outside the large platforms, lags far behind the
browsers. How the hybrids are combined and how an organization plans its own move are the
subject of [Chapter 18](18-Hybrids-and-the-Migration.md); the message-level details of each
protocol are in the Protocols book.

**Mars.** Arcadia City's link to Earth is the case where a KEM's shape helps most. A signal
takes between about 3 and 22 minutes to cross, depending on where the planets are, so every
round trip costs up to three quarters of an hour. Interactive handshakes are painful; a KEM
does not need one. Earth's ground stations publish ML-KEM-1024 encapsulation keys, signed
in advance, and a habitat controller encapsulates to the current key, encrypts its report
under the shared secret, and sends ciphertext and report in one transmission. The station
decapsulates when the message arrives. The same one-way pattern is how HPKE (RFC 9180)
works on Earth, and the post-quantum versions of HPKE being specified at the IETF use ML-KEM
in the same way.

### Side channels in decapsulation

Decapsulation is the one place where the long-term secret meets bytes the attacker chose,
and almost every step of it has leaked in some implementation. Figure 8.5 marks where.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="ML-KEM decapsulation with known leaks marked: the NTT product with the secret (power and EM), Compress to message bits (KyberSlash1 division), hashing m prime (power and EM on re-encryption), re-encryption (clangover branch and KyberSlash2 division), the comparison (timing), and the final selection (branch)" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor">
<rect x="20" y="30" width="40" height="30" rx="4"/>
<rect x="80" y="30" width="200" height="30" rx="4"/>
<rect x="300" y="30" width="150" height="30" rx="4"/>
<rect x="470" y="30" width="150" height="30" rx="4"/>
<rect x="80" y="150" width="230" height="30" rx="4"/>
<rect x="340" y="150" width="110" height="30" rx="4" stroke-width="1.8"/>
<rect x="470" y="150" width="150" height="30" rx="4"/>
<line x1="60" y1="45" x2="80" y2="45"/><line x1="280" y1="45" x2="300" y2="45"/>
<line x1="450" y1="45" x2="470" y2="45"/>
<path d="M545 60 V118 H195 V150"/>
<line x1="310" y1="165" x2="340" y2="165"/><line x1="450" y1="165" x2="470" y2="165"/>
</g>
<text x="31" y="50">c</text>
<text x="88" y="50">w = v − NTT⁻¹(ŝ ∘ NTT(u))</text>
<text x="312" y="50">m′ = Compress₁(w)</text>
<text x="480" y="50">(K′, r′) = G(m′ ‖ h)</text>
<text x="90" y="170">c′ = K-PKE.Encrypt(ek, m′; r′)</text>
<text x="368" y="170">c′ = c ?</text>
<text x="480" y="170">K′ or J(z ‖ c)</text>
<g font-size="12" fill-opacity=".75">
<text x="80" y="80">1 power/EM on the NTT</text>
<text x="300" y="80">2 KyberSlash1: ÷ q</text>
<text x="470" y="80">3 power/EM on hashing m′</text>
<text x="80" y="200">4 clangover: branch on m′</text>
<text x="80" y="216">4 KyberSlash2: ÷ q in Compress</text>
<text x="340" y="200">5 timing of</text>
<text x="340" y="216">the compare</text>
<text x="470" y="200">6 a branch on the</text>
<text x="470" y="216">result of 5</text>
</g>
<text x="20" y="262" fill-opacity=".7">Each leak answers one question: did my ciphertext decrypt to the m′ I expected?</text>
<text x="20" y="282" fill-opacity=".7">That is a plaintext-checking oracle, and §8.8 turns such oracles into the key.</text>
</svg>
<figcaption>Figure 8.5. ML-KEM decapsulation and where it has leaked. 1: single-trace power and electromagnetic attacks on the NTT (from 2017). 2 and 4: the KyberSlash divisions (2023-24). 3: the "curse of re-encryption" (2021-22). 4: the clangover compiler branch (2024). 5: a comparison that stops early (FrodoKEM, 2020). 6: selecting the key with an <code>if</code>. Everything after step 2 handles the secret $m'$.</figcaption>
</figure>

The leaks in the figure, briefly, in the order a decapsulation meets them:

- **KyberSlash** (December 2023 to January 2024). The reference code turned each coefficient
  into a message bit (step 2), and compressed the re-encrypted ciphertext (step 4), with a
  division by $q$, which takes data-dependent time on many processors. Timing decapsulations
  of chosen ciphertexts recovered keys. The fix replaced each division with a multiplication
  and a shift.
- **The curse of re-encryption** (Ueno, Xagawa, Tanaka, Ito, Takahashi and Homma, TCHES
  2022). Re-encryption hashes the secret $m'$ and expands it with SHAKE (step 3). Power or
  electromagnetic traces of that hashing reveal whether $m'$ equals a value the attacker
  guessed, which is all a plaintext-checking attack needs. It worked against Kyber and most
  other round 3 KEMs, including some masked software implementations.
- **Clangover** (June 2024, CVE-2024-37880). Some versions of the Clang compiler turned the
  branch-free code that maps message bits to 0 or 1665 (step 4) back into a branch, and the
  branch's timing leaked $m'$.
- **The comparison** (step 5). Guo, Johansson and Nilsson (CRYPTO 2020) showed that
  FrodoKEM's reference code compared $c'$ with $c$ in time that depended on where they first
  differed, and recovered the secret key with about $2^{30}$ decapsulation calls. The
  comparison never touches the secret key directly, yet it must be constant-time. Every
  ML-KEM implementation inherits the lesson.

What ties these together is the attack of §8.8. Each leak tells the attacker whether a
crafted ciphertext decrypted to a message it predicted, and a few thousand such answers give
up the key, FO transform or not. So $m'$, and everything computed from it, is as secret as
$\hat{\mathbf{s}}$ itself. The general techniques, constant-time code checked on the compiled
binary, masking for devices an attacker can hold, and formally verified implementations, are
the subject of [Chapter 17](17-Implementing-Post-Quantum-Safely.md), which also runs the
KyberSlash and clangover code side by side with their fixes (§17.3 and §17.4). Those bugs sat
in code that had been read by many experts for years, which is the strongest argument for the
verified implementations of §17.8.

## 8.13 Going deeper

*Level: expert.*

- **The proofs.** Hofheinz, Hövelmanns and Kiltz (TCC 2017) give the modular analysis of the
  FO variants. For ML-KEM's exact form in the quantum random oracle model, see Bindel,
  Hamburg, Hövelmanns, Hülsing and Persichetti (TCC 2019) and later work on "FO with
  implicit rejection", and the discussions of the FIPS 203 changes on NIST's pqc-forum.
- **Binding.** Does a ciphertext commit to its key and its public key? Cremers, Dax and
  Medinger, "Keeping Up with the KEMs" (CCS 2024), define binding properties and show that
  ML-KEM's are weaker when private keys are stored expanded, one more reason for seed
  format. Schmieg's work on "unbindable Kemmy Schmidt" shows the gap concretely.
- **Failure probability.** The scripts that compute $2^{-139}$ and its siblings are in the
  pq-crystals `security-estimates` repository (`Kyber_failure.py`), and the listing of §8.7
  follows their method. D'Anvers, Rossi and Virdia (EUROCRYPT 2020) study how much a first
  failure helps find the next, and D'Anvers, Vercauteren and Verbauwhede (2019) the effect of
  dependencies between coefficients.
- **Decapsulation leaks.** Ueno and others, "Curse of Re-encryption" (TCHES 2022), and Guo,
  Johansson and Nilsson (CRYPTO 2020) are the two papers to read for §8.12; Chapter 17 has the
  rest.
- **Formal verification.** libcrux's ML-KEM (in Firefox's NSS and other projects) is verified
  in F\* and hax; mlkem-native is verified with CBMC and HOL-Light. Both are good code to read
  after this chapter.
- **Masking.** Protecting ML-KEM against power analysis needs masked arithmetic and a masked
  comparison; Chapter 17 covers it.

## Check yourself

??? question "1. In K-PKE, write w = v − sᵀu in terms of the message and the noise terms."

    $w = \mu + \mathbf{e}^T\mathbf{y} + e_2 - \mathbf{s}^T\mathbf{e}_1$, plus the compression errors of
    $\mathbf{u}$ and $v$. The terms $\mathbf{s}^T\mathbf{A}^T\mathbf{y}$ cancel.

??? question "2. Compute the encapsulation key, decapsulation key and ciphertext sizes of ML-KEM-1024."

    With $k = 4$, $d_u = 11$, $d_v = 5$: ek $= 384 \cdot 4 + 32 = 1{,}568$ bytes; dk $= 768 \cdot 4 +
    96 = 3{,}168$ bytes ($\hat{\mathbf{s}}$, a copy of ek, $H(\mathrm{ek})$ and $z$); ciphertext
    $= 32(11 \cdot 4 + 5) = 32 \cdot 49 = 1{,}568$ bytes.

??? question "3. Compress x = 2000 to 4 bits and back. What is the error, and what bound does FIPS 203 promise?"

    $16 \cdot 2000 / 3329 = 9.61$, which rounds to 10. Back: $10 \cdot 3329 / 16 = 2080.6$, so
    2081. The error is $+81$, inside the bound $\lceil 3329/32 \rfloor = 104$.

??? question "4. Why does Encaps derive its randomness r from m instead of drawing it fresh?"

    So that Decaps, after decrypting $m$, can recompute the exact ciphertext and reject
    anything an honest sender could not have produced. That re-encryption check is what
    turns IND-CPA K-PKE into an IND-CCA2 KEM.

??? question "5. In the attack of §8.8, what does a ciphertext with u = (a, 0) and v = (b, ..., b) reveal?"

    For each $i$, one bit: the rounding of $b - a\,s_{0,i}$. That is one bit about each of the
    256 coefficients of $s_0$ at once. Three such ciphertexts with different $(a, b)$ pin down
    every coefficient.

??? question "6. Why is the rejection key J(z ‖ c) and not J(c)?"

    With $J(c)$ anyone could compute the rejection key, so a server that later uses its key
    visibly (a MAC, a Finished message) would reveal that it rejected, which is explicit
    rejection by another name. The secret $z$ makes rejection keys unpredictable, which is
    also what the QROM proofs of implicit rejection need.

??? question "7. A normal approximation puts ML-KEM-512's failure rate near 2^-76, but the exact computation gives about 2^-139. Why the difference?"

    The largest noise term, the compression error of $v$, has variance 3,608 but is never
    larger than 104. It widens the distribution without reaching its tail, so the other
    terms (standard deviation about 51) must reach $833 - 104 = 729$ alone, more than 14
    standard deviations. A normal law with the same total variance badly overstates the tail.

??? question "8. A library compares c′ and c with memcmp() and selects the key with an if. What goes wrong?"

    Both take time that depends on secret data: `memcmp` stops at the first differing byte
    and the `if` is a branch on the comparison. Either can tell an attacker whether a crafted
    ciphertext decrypted to the message it predicted, a plaintext-checking oracle that
    recovers the key (Guo, Johansson and Nilsson did this to FrodoKEM in 2020). (`strcmp` is
    worse still: it stops at a zero byte, so some modified ciphertexts compare equal.)

??? question "9. An encapsulation key has a 12-bit field holding 3500. What does the modulus check do, and why does it matter?"

    Decoding gives $3500 \bmod 3329 = 171$, re-encoding gives a different field, so the check
    rejects the key. Without the check, the key's bytes would not mean what they say:
    implementations that hash the raw bytes and ones that reduce first would derive different
    shared secrets, and keys identified by their hash would become ambiguous.

??? question "10. Name three differences between round 3 Kyber and FIPS 203 ML-KEM."

    Any three of: no hashing of $m$ before use; $K$ output directly from
    $G(m \,\|\, H(\mathrm{ek}))$ with no KDF over the ciphertext; rejection key $J(z \,\|\, c)$;
    mandatory input checks; $G(d \,\|\, k)$ in key generation, so that one seed gives unrelated
    keys at different levels.

## What you learned

- ML-KEM is K-PKE, a Module-LWE encryption scheme, inside the Fujisaki-Okamoto transform
  with implicit rejection; FIPS 203 has been final since 13 August 2024.
- K-PKE decrypts because the large terms cancel and only small noise remains; the noise
  stays below $q/4$ except with probability about $2^{-139}$ or less, a figure that comes
  from convolving the exact laws of every noise term, not from a normal approximation.
- ByteEncode packs 256 coefficients of $d$ bits into $32d$ bytes, least significant bit
  first; ByteDecode$_{12}$ reduces mod $q$, which is why keys need a modulus check.
- Compression to $d$ bits moves a coefficient by at most $\lceil q/2^{d+1} \rfloor$ (104 for
  $d = 4$, 2 for $d = 10$); ML-KEM-768 has a 1,184-byte key and a 1,088-byte ciphertext,
  from $384k + 32$ and $32(d_u k + d_v)$.
- The matrix and all secrets come from short seeds through SHA-3 and SHAKE.
- A full implementation fits in about 160 lines and must match NIST's ACVP vectors byte for
  byte; the vectors give the internal seeds $d$, $z$ and $m$ directly.
- K-PKE alone loses its key to six chosen ciphertexts; re-encryption and implicit rejection
  stop the attack.
- The rejection key needs the secret $z$, or rejection becomes visible.
- FIPS 203 requires modulus, hash and length checks, and allows 64-byte seed private keys,
  the form RFC 9935 recommends; the hash check does not catch damage to $\hat{\mathbf{s}}$, a
  seed comparison does.
- Every step of decapsulation after the first has leaked in some implementation (KyberSlash,
  clangover, power analysis of re-encryption, a variable-time compare); each leak is a
  plaintext-checking oracle.
- ML-KEM-768 in hybrid with X25519 is the default in major browsers and OpenSSH.

**Next:** [Chapter 9](09-ML-DSA.md), the lattice signature standard.

## Further reading

- NIST, FIPS 203, *Module-Lattice-Based Key-Encapsulation Mechanism Standard* (13 August
  2024).
- NIST, SP 800-227, *Recommendations for Key-Encapsulation Mechanisms* (September 2025).
- NIST IR 8413, *Status Report on the Third Round of the NIST Post-Quantum Cryptography
  Standardization Process* (July 2022).
- Joppe Bos, Léo Ducas, Eike Kiltz, Tancrède Lepoint, Vadim Lyubashevsky, John M. Schanck,
  Peter Schwabe, Gregor Seiler and Damien Stehlé, "CRYSTALS -- Kyber: a CCA-secure
  module-lattice-based KEM" (IEEE EuroS&P 2018).
- Roberto Avanzi and others, *CRYSTALS-Kyber Algorithm Specifications and Supporting
  Documentation*, version 3.02 (2021).
- Dennis Hofheinz, Kathrin Hövelmanns and Eike Kiltz, "A Modular Analysis of the
  Fujisaki-Okamoto Transformation" (TCC 2017).
- Jan-Pieter D'Anvers, Qian Guo, Thomas Johansson, Alexander Nilsson, Frederik Vercauteren and
  Ingrid Verbauwhede, "Decryption Failure Attacks on IND-CCA Secure Lattice-Based Schemes"
  (PKC 2019).
- Daniel J. Bernstein and others, "KyberSlash: Exploiting secret-dependent division timings
  in Kyber implementations" (2024).
- Cas Cremers, Alexander Dax and Niklas Medinger, "Keeping Up with the KEMs: Stronger Security
  Notions for KEMs and Automated Analysis of KEM-based Protocols" (ACM CCS 2024).
- The NIST ACVP-Server repository (github.com/usnistgov/ACVP-Server), FIPS 203 test files,
  and the C2SP CCTV repository (github.com/C2SP/CCTV), ML-KEM edge-case and accumulated
  vectors.
- NIST, ACVP-Server JSON test files `ML-KEM-keyGen-FIPS203` and `ML-KEM-encapDecap-FIPS203`
  (2024), the source of the vectors in §8.6.
- IETF, RFC 9935, *Internet X.509 Public Key Infrastructure: Algorithm Identifiers for the
  Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM)* (2026).
- IETF, RFC 10024, *Post-Quantum Traditional (PQ/T) Hybrid Key Agreement Mechanisms for
  TLS 1.3* (2026).
- The pq-crystals `security-estimates` repository (github.com/pq-crystals/security-estimates),
  `Kyber_failure.py`, the failure-probability method of §8.7.
- Jan-Pieter D'Anvers, Frederik Vercauteren and Ingrid Verbauwhede, "The impact of error
  dependencies on Ring/Mod-LWE/LWR based schemes" (PQCrypto 2019).
- Jan-Pieter D'Anvers, Mélissa Rossi and Fernando Virdia, "(One) Failure Is Not an Option:
  Bootstrapping the Search for Failures in Lattice-Based Encryption Schemes" (EUROCRYPT 2020).
- Qian Guo, Thomas Johansson and Alexander Nilsson, "A key-recovery timing attack on
  post-quantum primitives using the Fujisaki-Okamoto transformation and its application on
  FrodoKEM" (CRYPTO 2020).
- Rei Ueno, Keita Xagawa, Yutaro Tanaka, Akira Ito, Junko Takahashi and Naofumi Homma, "Curse
  of Re-encryption: A Generic Power/EM Analysis on Post-Quantum KEMs" (TCHES 2022).
- Antoon Purnal, "clangover" proof of concept and CVE-2024-37880 (2024).
