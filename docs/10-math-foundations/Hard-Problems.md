# Hard Problems

*The math problems public-key cryptography rests on, the best known attack
on each, and which ones a quantum computer would break.*

**Status and standards:** see [Math foundations](../algorithms/table.md#10-math-foundations) in the main table.

## What it is

A public key is computed from a private key, and everyone can see it. The
scheme is safe only if getting the private key back means solving a
problem nobody can solve in reasonable time. None of these problems is
proven hard. They count as hard because people have attacked them for
decades, and key sizes are set from the best attack known today. Two
quantum algorithms matter: Shor's breaks the first three rows outright,
and Grover's only speeds up search.

| Problem | Used by | Best classical attack | Quantum effect |
|---|---|---|---|
| Factoring | [RSA](../02-signatures/RSA.md) | number field sieve, subexponential | Shor: broken |
| Discrete log mod $p$ | [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md), [DSA](../02-signatures/DSA.md) | number field sieve, subexponential | Shor: broken |
| Elliptic-curve discrete log | [ECDH](../01-key-exchange/ECDH.md), [ECDSA](../02-signatures/ECDSA.md), [EdDSA](../02-signatures/EdDSA.md) | Pollard rho, about $\sqrt{n}$ | Shor: broken, on a smaller machine than RSA-2048 needs |
| Module-LWE (lattices) | [ML-KEM](../01-key-exchange/ML-KEM.md), [ML-DSA](../02-signatures/ML-DSA.md) | lattice reduction with sieving | small gain in the exponent |
| Hash preimages | [SLH-DSA](../02-signatures/SLH-DSA.md), [LMS, XMSS](../02-signatures/Stateful-Hash-Signatures.md) | brute force, $2^n$ for an $n$-bit hash | Grover: $2^{n/2}$ |
| Decoding a random code | [Classic McEliece, HQC](../01-key-exchange/Code-Based-KEMs.md) | information-set decoding | Grover halves the exponent |
| SIDH isogenies | SIKE | Castryck–Decru (2022): minutes | broken classically |
| Multivariate (Rainbow) | Rainbow | Beullens (2022): a weekend on a laptop | broken classically |

## The story

- **Who made it:** Many hands across centuries: Fermat and Gauss on factoring; Diffie and Hellman (1976) on discrete logs as a basis for keys; Koblitz and Miller (1985) on curves; Ajtai (1996) and Regev (2005) on lattices; McEliece (1978) on codes. Peter Shor (1994) and Lov Grover (1996) gave the quantum algorithms.
- **What for:** Problems believed hard enough to build keys on.
- **What it solved:** Public-key cryptography needs a one-way trapdoor; each of these provides one.
- **Where it stands:** Factoring and discrete logs fall to Shor's algorithm, so the world is moving to lattices, hashes and codes.
- **Incidents:** Key sizes have followed the attacks: the number field sieve (Pollard, 1988 and after) made 512-bit RSA breakable by 1999. **2022:** SIKE, a NIST finalist based on isogenies, was broken by Castryck and Decru in about an hour on a laptop, and Ward Beullens broke Rainbow with a weekend's computing. Both showed new problems need years of study.

## How it works

### Factoring

RSA (1977) publishes $n = p \cdot q$ and keeps $p$ and $q$ secret; whoever factors $n$
has the private key. The best attack is the general number field sieve
(early 1990s), at about $\exp(1.923 \cdot (\ln n)^{1/3} \cdot (\ln \ln n)^{2/3})$
steps. That is subexponential, which is why RSA needs 3072 bits to match a
256-bit elliptic curve (SP 800-57).

RSA-250 (829 bits) fell in February 2020 to CADO-NFS, in about 2,700 CPU
core-years. In September 2026 two separate GPU ports of CADO-NFS went
further with the same algorithm: RSA-260 (862 bits) on the 3rd, and RSA-896
(896 bits) on the 19th on up to 2,048 GPUs. By the usual cost formula,
RSA-2048 is still more than a billion times harder than RSA-896.

### Discrete log modulo a prime

Diffie-Hellman (1976) and DSA (1991) publish $y = g^x \bmod p$ and keep $x$
secret. A number field sieve again does best, at about the cost of
factoring a number of the same size, so these groups need RSA-sized primes.
Most of the work depends only on $p$, so a prime shared by many servers is
one big target; that is how Logjam (2015) broke 512-bit export groups. The
record is a 795-bit prime (December 2019, about 3,100 core-years), computed
next to RSA-240 by the team that later did RSA-250.

### Elliptic-curve discrete log

ECC (Miller 1985, Koblitz 1987) does the same on the points of an elliptic
curve: the public key is $Q = d \cdot G$. On a good curve over a prime field
nothing like the number field sieve is known. The best attack is Pollard's
rho (1978), about $\sqrt{n}$ group operations for a group of $n$ elements, split
easily across machines. So a 256-bit curve gives about 128-bit security.
Published records sit around 112 to 114 bits: a 112-bit curve in 2009 on
over 200 PlayStation 3s, and a 114-bit BN curve in 2017 on 2,000 cores
over six months. Special curves can be far weaker; see
[Elliptic curves](Elliptic-Curves.md).

### Lattices

Learning with errors (Regev, 2005): given a random matrix $A$ and
$b = A \cdot s + e \bmod q$, where $e$ holds small random errors, find $s$. Without $e$,
Gaussian elimination solves it at once; the noise makes it hard. Regev
showed that solving random LWE instances would let a quantum computer
solve hard lattice problems in the worst case. Module-LWE swaps the numbers
for polynomials to shrink the keys: ML-KEM (FIPS 203) works in
$\mathbb{Z}_{3329}[X]/(X^{256} + 1)$, and ML-DSA (FIPS 204) adds the related Module-SIS
problem. FN-DSA and NTRU Prime use NTRU lattices instead. The best attacks
run lattice reduction (BKZ) with a sieve inside. A sieve in dimension $\beta$
costs about $2^{0.292\beta}$, or $2^{0.257\beta}$ on a quantum computer.

### Hash-based

These need nothing but a hash function. Lamport's one-time signature (1979)
reveals hash preimages, and Merkle's tree (1979) binds many one-time keys
to one public key. A forger has to find preimages or second preimages,
about $2^n$ work for an $n$-bit hash. They are the most conservative choice and
the largest: SLH-DSA (FIPS 205, 2024) is stateless, while LMS and XMSS
(SP 800-208, 2020) are smaller but must never reuse a one-time key.

### Codes

McEliece (1978) hides a binary Goppa code behind a random-looking matrix.
Encryption adds $t$ random bit errors that only the key holder can remove.
Everyone else has to decode a random linear code, which is NP-hard in
general. The best attack, information-set decoding (Prange, 1962), has
improved only slowly; the 1978 sizes are too small now, but the design has
held for nearly 50 years. The cost is big keys: 261 KB to 1.36 MB for
Classic McEliece. HQC uses quasi-cyclic codes for keys of a few KB, and
NIST picked it in March 2025 as a second KEM beside ML-KEM.

### SIDH isogenies, broken in 2022

An isogeny is a map between elliptic curves. SIDH (Jao and De Feo, 2011)
built key exchange from secret walks between supersingular curves, and
SIKE, based on it, entered NIST's fourth round in July 2022. The same
month Castryck and Decru used a 1997 theorem of Kani and the extra torsion
points SIDH must publish to recover keys: SIKEp434 in about ten minutes on
one core. Isogeny schemes that don't publish those points, such as CSIDH
and the signature SQIsign, are not affected. SQIsign is in the third round
of NIST's search for more signatures.

### Rainbow (multivariate), broken in 2022

The public key is a set of quadratic equations over a small field, and a
hidden structure lets the key holder solve them. Solving such systems in
general is NP-hard. Rainbow (Ding and Schmidt, 2005) stacked two layers of
Oil and Vinegar (UOV, 1999) and was a NIST finalist. In February 2022
Beullens recovered a level-1 Rainbow key in about 53 hours on a laptop,
and NIST passed it over. Single-layer UOV and MAYO are still in NIST's
third round.

### Shor and Grover

Shor's algorithm (1994) finds the period of a function. That gives
factors and discrete logs in any group, elliptic curves included, in
polynomial time, so bigger keys don't help. Recent estimates put RSA-2048
at under a million noisy qubits for under a week (Gidney, 2025) and a
256-bit elliptic-curve key at under half a million for minutes (Babbush et
al., 2026). No machine that size exists yet.

Grover's algorithm (1996) searches $N$ possibilities in about $\sqrt{N}$ steps, so
an $n$-bit key or hash preimage takes about $2^{n/2}$. The steps run one after
another, and $k$ machines gain only $\sqrt{k}$. NIST's post-quantum categories 1, 3
and 5 are defined by key search on AES-128, -192 and -256, so they already
count Grover. Against codes Grover roughly halves the exponent of
information-set decoding (Bernstein, 2010), the same square root it takes
off AES. Against lattices the quantum sieve gains less.

## Example (Python)

Pollard's rho, the best known attack on good elliptic curves, here on the
subgroup of prime order $q$ in the numbers mod $p = 2q + 1$. The walk mixes
three moves, tracks the exponents, and stops when a slow and a fast walker
land on the same number. Each 8 bits added to $q$ makes the walk about 16
times longer on average.

```python
from math import isqrt

def rho_log(g, h, p, q):
    # find x with g^x = h mod p; g has prime order q.
    # each point is g^a * h^b; the walk keeps a and b up to date
    def step(y, a, b):
        if y % 3 == 0: return y * y % p, 2 * a % q, 2 * b % q
        if y % 3 == 1: return y * g % p, (a + 1) % q, b
        return y * h % p, a, (b + 1) % q

    slow = fast = (h, 0, 1)
    steps = 0
    while True:
        slow = step(*slow)
        fast = step(*step(*fast))
        steps += 1
        if slow[0] == fast[0]: break
    # g^a h^b = g^A h^B, so x = (a - A) / (B - b) mod q
    (_, a, b), (_, A, B) = slow, fast
    if (B - b) % q == 0: return None, steps   # rare: retry from another start
    return (a - A) * pow(B - b, -1, q) % q, steps

x = 1000003                                   # the secret
for q in (1048571, 268435361, 68719476713):   # primes with 2q+1 prime
    p = 2 * q + 1                             # 4 has order q mod p
    found, steps = rho_log(4, pow(4, x, p), p, q)
    print(q.bit_length(), "bits:", found, "in", steps, "steps, sqrt(q) =", isqrt(q))
```

Output:

```
20 bits: 1000003 in 1320 steps, sqrt(q) = 1023
28 bits: 1000003 in 18085 steps, sqrt(q) = 16383
36 bits: 1000003 in 404974 steps, sqrt(q) = 262143
```

On a curve the walk is the same with point additions. At 256 bits it would
take about $2^{128}$ steps.

## Security notes

- A hard problem doesn't make a safe scheme. Reused ECDSA nonces and
  unchecked curve points have broken far more systems than any record
  computation.
- Traffic recorded today can be decrypted once Shor runs ("harvest now,
  decrypt later"). That's why key exchange moves first, usually as a hybrid
  of X25519 and [ML-KEM](../01-key-exchange/ML-KEM.md).
- SIDH lasted 11 years and Rainbow 17, and both fell late in NIST's
  process. NIST keeps backups built on different math: SLH-DSA (hashes)
  next to ML-DSA, and HQC (codes) next to ML-KEM.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: a tiny discrete log, solved by baby steps and giant steps"

    Find $x$ with $2^x \equiv 48 \pmod{101}$. Brute force would try up to 100 values. Baby-step giant-step tries
    about $2\sqrt{100} = 20$, with $m = 10$:

    Baby steps, $2^j \bmod 101$ for $j = 0 \ldots 9$: 1, 2, 4, 8, 16, 32, 64, 27, 54, 7.

    Giant steps multiply 48 by $2^{-10} \equiv 65 \pmod{101}$ until a baby step appears:

    | $i$ | $48 \cdot 65^i \bmod 101$ | In the baby table? |
    |---|---|---|
    | 0 | 48 | no |
    | 1 | 90 | no |
    | 2 | 93 | no |
    | 3 | 86 | no |
    | 4 | 35 | no |
    | 5 | 53 | no |
    | 6 | 11 | no |
    | 7 | 8 | yes, $8 = 2^3$ |

    So $48 \cdot 2^{-70} \equiv 2^3$, and **$x = 70 + 3 = 73$**. Check: $2^{73} \bmod 101 = 48$. For a 256-bit group the same
    method needs about $2^{128}$ steps and as much memory, which is why such groups are safe.

??? abstract "The math, with formulas"

    | Problem | Best classical attack | Cost |
    |---|---|---|
    | Factoring $n$ | general number field sieve | $L_n[1/3, 1.923] = \exp(1.923 (\ln n)^{1/3} (\ln \ln n)^{2/3})$ |
    | Discrete log mod $p$ | number field sieve | $L_p[1/3, 1.923]$ |
    | Elliptic-curve DLP, order $n$ | Pollard's rho | $\approx \sqrt{\pi n / 4}$ |
    | LWE, dimension $n$ | BKZ with block size $\beta$, sieving inside | $\approx 2^{0.292\beta}$ classical, $2^{0.257\beta}$ quantum |
    | Preimage of an $n$-bit hash | brute force / Grover | $2^n$ / $2^{n/2}$ |
    | Decoding a random linear code | information-set decoding | exponential in the error count |

    $L[\alpha, c]$ interpolates between polynomial ($\alpha = 0$) and exponential ($\alpha = 1$) time; $\alpha = 1/3$ is why RSA keys
    grow much faster than curve keys for the same security.

    **Baby-step giant-step:** write $x = i \cdot m + j$ with $m = \lceil \sqrt{n} \rceil$; store $g^j$, then test $y \cdot g^{-im}$.
    $O(\sqrt{n})$ time and memory. **Pollard's rho** gets the same time with almost no memory by walking a
    pseudorandom path until it loops (the birthday paradox).

??? tip "Watch it step by step: easy one way, hard the other"

    <div class="mars-steps" markdown>

    1. Forward: $2^{73} \bmod 101$ is a few squarings and multiplications. The answer is 48.
    2. Backward: "which power of 2 gives 48?" has no shortcut formula.
    3. Baby steps: write down $2^0$ to $2^9$.
    4. Giant steps: keep multiplying 48 by $2^{-10}$ and look each result up in the list.
    5. Step 7 finds $8 = 2^3$, so $x = 7 \cdot 10 + 3 = 73$.
    6. At real sizes the list would need $2^{128}$ entries: more than any computer can hold.

    </div>

??? info "The math underneath"

    - **One-way functions and trapdoors:** easy to compute, hard to invert, and (for RSA) easy again with a
      secret.
    - **Complexity:** none of these problems is proved hard. Factoring and discrete log are believed not to
      be NP-hard, and lattice problems have worst-case to average-case reductions (Ajtai 1996, Regev 2005).
    - **Generic group model:** Shoup (1997) proved any algorithm that treats the group as a black box needs
      about $\sqrt{n}$ steps, which is why curves without extra structure reach that bound.
    - **Quantum period finding:** Shor turns factoring and discrete logs into finding the period of
      $x \mapsto g^x$, solved by the quantum Fourier transform.

## See also

- [Elliptic curves](Elliptic-Curves.md): the groups behind the elliptic-curve discrete log
- [Miller-Rabin](Miller-Rabin-Primality-Test.md): how RSA and DH primes are found
- [ML-KEM](../01-key-exchange/ML-KEM.md) / [Code-based KEMs](../01-key-exchange/Code-Based-KEMs.md): post-quantum key exchange
- [Will quantum computers break all of this?](../FAQ.md#will-quantum-computers-break-all-of-this)

## References

- Shor (FOCS 1994) / Grover (STOC 1996)
- [RSA-250 announcement (February 2020)](https://caramba.loria.fr/rsa250.txt) / [RSA-240 and 795-bit discrete log announcement (2019)](https://caramba.loria.fr/dlp240-rsa240.txt) / [Boudot et al. (CRYPTO 2020)](https://eprint.iacr.org/2020/697)
- [NIST SP 800-57 Part 1 Rev. 5](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final), Table 2
- Adrian et al., "Imperfect Forward Secrecy" (CCS 2015)
- Pollard, "Monte Carlo methods for index computation (mod p)" (1978) / [Bos et al., 112-bit ECDLP (2009)](https://www.metzdowd.com/pipermail/cryptography/2009-July/015476.html) / Kusaka et al., 114-bit ECDLP (ICISC 2017)
- Regev (STOC 2005) / Becker, Ducas, Gama and Laarhoven (SODA 2016) / Chailloux and Loyer (ASIACRYPT 2021)
- [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) / [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) / [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) / [SP 800-208](https://csrc.nist.gov/pubs/sp/800/208/final)
- McEliece (DSN Progress Report 42-44, 1978) / Bernstein, "Grover vs. McEliece" (PQCrypto 2010) / [NIST IR 8545](https://csrc.nist.gov/pubs/ir/8545/final) (HQC, March 2025)
- [Castryck and Decru (ePrint 2022/975)](https://eprint.iacr.org/2022/975) / [Beullens (ePrint 2022/214)](https://eprint.iacr.org/2022/214) / [NIST IR 8413](https://csrc.nist.gov/pubs/ir/8413/upd1/final) (round 3 report, July 2022)
- [NIST, round 3 of the additional signatures](https://csrc.nist.gov/projects/pqc-dig-sig/round-3-additional-signatures)
- [Gidney (2025)](https://arxiv.org/abs/2505.15917) / [Babbush et al. (2026)](https://arxiv.org/abs/2603.28846)

*Weaker sources:* the September 2026 records come from the factorers' own
posts, [Weis, RSA-896](https://saweis.net/posts/rsa-896.html) and
[Cognition, RSA-260](https://cognition.com/blog/factoring-rsa-260); their
published factors do multiply to the challenge numbers.
