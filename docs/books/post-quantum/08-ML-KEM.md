# 8. ML-KEM

*ML-KEM is the post-quantum algorithm most people already use without knowing it. Since
late 2024 it has protected a growing share of web traffic inside hybrid TLS handshakes, and
since 2025 it has been the default key exchange of OpenSSH. It is the Module-LWE scheme
CRYSTALS-Kyber, standardized by NIST as FIPS 203 on 13 August 2024 with a few careful
changes. This chapter builds it completely: the inner encryption scheme K-PKE and why it
decrypts correctly, the compression that makes it small, the sampling that makes its
randomness reproducible, and the Fujisaki-Okamoto wrapper that makes it safe against active
attackers. You will run a full implementation in about 160 lines of Python that matches
NIST's official test vectors, measure how far decryption stays from failing, recover a whole
secret key from six chosen ciphertexts when the wrapper is left off, and watch the wrapper
turn the same attack into noise.*

!!! abstract "In this chapter"
    **You will learn:**

    - the three algorithms of ML-KEM and the encryption scheme K-PKE inside them;
    - why K-PKE decrypts correctly, and how much room its noise leaves;
    - compression, the parameter sets, and the sizes of keys and ciphertexts;
    - how the matrix and the secrets are sampled from short seeds;
    - a complete implementation, checked against NIST's test vectors;
    - how a chosen-ciphertext attack recovers a K-PKE secret key, and how the
      Fujisaki-Okamoto transform with implicit rejection stops it;
    - the input checks FIPS 203 requires, and the seed format for private keys;
    - what changed between Kyber and FIPS 203, and where ML-KEM runs today.

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
$\mathbf{u}$ to $d_u$ bits and $v$ to $d_v$ bits cuts the ciphertext by more than a
half. (In FIPS 203 the public key $\mathbf{t}$ is not compressed; its coefficients are sent
in 12 bits.)

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

The formulas behind the sizes are short. The encapsulation key is $k$ polynomials of 12-bit
coefficients plus the 32-byte seed: $384k + 32$ bytes. The ciphertext is $32(d_u k + d_v)$
bytes. The decapsulation key holds the secret $\hat{\mathbf{s}}$ (384$k$ bytes), a full copy of
the encapsulation key, its hash $H(\mathrm{ek})$ and the 32-byte rejection secret $z$:
$768k + 96$ bytes.

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
files for FIPS 203 through its ACVP server project: 75 key-generation tests and 105
encapsulation and decapsulation tests. This code reproduces all 180 of them byte for byte.
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

```
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

```
coefficients checked: 51200
largest noise seen: 285  decryption fails only past 832
coefficients with noise above 400: 0
```

In 51,200 coefficients the largest noise seen is about a third of the margin. That is
typical: the noise is a sum of many small independent-looking terms, so it is close to a
normal distribution, and a coefficient past 832 is many standard deviations out. The Kyber
designers computed the exact distribution by convolving the distributions of every term,
including the compression errors, and found failure probabilities per decapsulation of about
$2^{-139}$, $2^{-164}$ and $2^{-174}$ for the three parameter sets. A random test cannot get
anywhere near those numbers. They come from computation, and the designers published the
scripts that compute them.

Why make failure so rare, when one failed handshake in a billion would be harmless? Because
failures are a weakness, not just a nuisance. If an attacker can find ciphertexts that fail
more often than usual and observe the failures, each failure leaks information about the
secret key. Attacks of this kind ("decryption failure attacks", for example D'Anvers, Guo,
Johansson, Nilsson, Vercauteren and Verbauwhede, 2019) need a failure probability that is
not negligible. With $2^{-139}$ and the FO transform, which stops the attacker from choosing
the noise, they are far out of reach.

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

```
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

```
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

```
honest ciphertext, same key:    True
one bit flipped, same key:       False
same bad ciphertext twice, same: True
rejection key is J(z || c):      True
```

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

```
honest ek passes: True  honest dk passes: True
ek with a coefficient of 4095 passes: False
  that coefficient silently becomes: 766
dk with a corrupted ek copy passes: False
```

Where the encapsulation key was just generated by the same program, the check finds
nothing; it exists for keys that arrive from outside.

**Seed format.** A decapsulation key is 1,632 to 3,168 bytes, but everything in it can be
regenerated from the 64 bytes $(d, z)$. FIPS 203 allows the seed to be kept as the private
key, and the IETF formats for ML-KEM private keys allow a seed form, an expanded form, or
both. The seed is smaller, cannot be internally inconsistent, and binds the private key to
exactly one public key. The expanded form is faster to load.

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

## 8.12 In the real world

*Level: expert.*

**Deployment.** Google Chrome turned on the hybrid X25519Kyber768 by default in 2024 and
moved to the standardized X25519MLKEM768 with Chrome 131 in November 2024. Cloudflare reported
in its year review that about 52 percent of human-generated traffic to its network used
post-quantum key agreement by early December 2025 (figures for 2026 not checked here).
OpenSSH 10.0, released in April 2025, made the hybrid `mlkem768x25519-sha256` its default key
exchange. Signal (PQXDH, 2023) and Apple's iMessage (PQ3, 2024) adopted Kyber before the
standard was final. The protocol details of each hybrid are in the Protocols book.

**KyberSlash.** In late 2023 and early 2024, researchers found that the reference
implementation and several libraries divided a secret-dependent value by $q$ in the
compression step. On many processors, division takes a variable number of cycles, and
experiments recovered secret keys from timing. The fix replaced each division with a
multiplication and a shift, as in Chapter 7's Barrett reduction. The bug was in code that
had been read by many experts for years, which is the strongest argument for the verified
implementations of §7.8.

**Mars.** Arcadia City's link to Earth is the case where a KEM's shape helps most. A signal
takes between about 3 and 22 minutes to cross, depending on where the planets are, so every
round trip costs up to three quarters of an hour. Interactive handshakes are painful; a KEM
does not need one. Earth's ground stations publish ML-KEM-1024 encapsulation keys, signed
in advance, and a habitat controller encapsulates to the current key, encrypts its report
under the shared secret, and sends ciphertext and report in one transmission. The station
decapsulates when the message arrives. The same one-way pattern is how HPKE (RFC 9180)
works on Earth, and the post-quantum versions of HPKE being specified at the IETF use ML-KEM
in the same way.

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
  Kyber repository; D'Anvers and others study how much a few failures help an attacker.
- **Formal verification.** libcrux's ML-KEM (in Firefox's NSS and other projects) is verified
  in F\* and hax; mlkem-native is verified with CBMC and HOL-Light. Both are good code to read
  after this chapter.
- **Masking.** Protecting ML-KEM against power analysis needs masked arithmetic and a masked
  comparison; Chapter 17 covers it.

## Check yourself

??? question "1. In K-PKE, write w = v − sᵀu in terms of the message and the noise terms."

    $w = \mu + \mathbf{e}^T\mathbf{y} + e_2 - \mathbf{s}^T\mathbf{e}_1$, plus the compression errors of
    $\mathbf{u}$ and $v$. The terms $\mathbf{s}^T\mathbf{A}^T\mathbf{y}$ cancel.

??? question "2. Compute the ciphertext size of ML-KEM-1024 from its parameters."

    $32(d_u k + d_v) = 32(11 \cdot 4 + 5) = 32 \cdot 49 = 1{,}568$ bytes.

??? question "3. Why is the decapsulation key 768k + 96 bytes?"

    $384k$ for $\hat{\mathbf{s}}$, $384k + 32$ for the copy of $\mathrm{ek}$, 32 for $H(\mathrm{ek})$
    and 32 for $z$: $768k + 96$.

??? question "4. Why does Encaps derive its randomness r from m instead of drawing it fresh?"

    So that Decaps, after decrypting $m$, can recompute the exact ciphertext and reject
    anything an honest sender could not have produced. That re-encryption check is what
    turns IND-CPA K-PKE into an IND-CCA2 KEM.

??? question "5. In the attack of §8.8, what does a ciphertext with u = (a, 0) and v = (b, ..., b) reveal?"

    For each $i$, one bit: the rounding of $b - a\,s_{0,i}$. That is one bit about each of the
    256 coefficients of $s_0$ at once. Three such ciphertexts with different $(a, b)$ pin down
    every coefficient.

??? question "6. Why does ML-KEM return J(z ‖ c) instead of an error on a bad ciphertext?"

    To avoid giving the attacker an explicit signal. The rejection key looks random, depends
    on a secret $z$, and makes a bad ciphertext behave like any key mismatch. It also fits
    the cleanest security proofs.

??? question "7. A library compares c′ and c with strcmp(). What goes wrong?"

    `strcmp` stops at the first zero byte, so two ciphertexts that agree up to a zero byte
    compare equal, and some modified ciphertexts are accepted. It also runs in variable
    time. C2SP's "strcmp" vectors test for it.

??? question "8. An encapsulation key has a 12-bit field holding 3500. What does the modulus check do, and why does it matter?"

    Decoding gives $3500 \bmod 3329 = 171$, re-encoding gives a different field, so the check
    rejects the key. Without the check, the sender would encapsulate to a different key than
    the one it was given, and two parties could disagree about which key was used.

??? question "9. Name two differences between round 3 Kyber and FIPS 203 ML-KEM."

    Any two of: no hashing of $m$ before use; $K$ output directly from $G(m \,\|\, H(\mathrm{ek}))$
    with no KDF over the ciphertext; rejection key $J(z \,\|\, c)$; mandatory input checks;
    $G(d \,\|\, k)$ in key generation.

??? question "10. Why is a KEM a good fit for a link with a 20-minute delay?"

    The sender needs only the receiver's published encapsulation key, so a key can be
    established and data sent in one transmission, with no round trip.

## What you learned

- ML-KEM is K-PKE, a Module-LWE encryption scheme, inside the Fujisaki-Okamoto transform
  with implicit rejection; FIPS 203 has been final since 13 August 2024.
- K-PKE decrypts because the large terms cancel and only small noise remains; the noise
  stays below $q/4$ except with probability about $2^{-139}$ or less.
- Compression drops low bits of the ciphertext; ML-KEM-768 has a 1,184-byte key and a
  1,088-byte ciphertext.
- The matrix and all secrets come from short seeds through SHA-3 and SHAKE.
- A full implementation fits in about 160 lines and must match NIST's vectors byte for byte.
- K-PKE alone loses its key to six chosen ciphertexts; re-encryption and implicit rejection
  stop the attack.
- FIPS 203 requires modulus, hash and length checks, and allows 64-byte seed private keys.
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
