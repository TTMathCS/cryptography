# 17. Implementing Post-Quantum Safely

*A scheme can be secure on paper and broken in a product. Every post-quantum standard has
already had implementations that leaked keys: through the time a division took, through a
branch a compiler added on its own, through the power drawn while decoding, through a single
glitched instruction. This chapter collects those lessons. It shows the KyberSlash bug and its
fix in code, the "clangover" compiler problem, a fault attack that recovers a lattice signing
key from two signatures and the hedged signing that stops it, and then the defenses that
work: constant-time rules, masking, test vectors, formal verification and careful library
choice.*

!!! abstract "In this chapter"
    **You will learn:**

    - what "constant time" means in practice, and why compilers can undo it;
    - KyberSlash and clangover, two real timing leaks in ML-KEM code (2023-2024);
    - power analysis and masking for lattice schemes;
    - fault attacks, shown in code on deterministic lattice signing, and why FIPS 204 hedges;
    - decryption-failure and oracle attacks as implementation problems;
    - randomness, seeds and key formats;
    - known-answer tests, NIST's ACVP, and formally verified implementations;
    - how to choose a library, as of November 2026.

    **You need:** [Chapter 8](08-ML-KEM.md) (ML-KEM) and [Chapter 9](09-ML-DSA.md) (ML-DSA);
    the general theory of side channels is in Chapter 18 of
    [the cryptography book](../../book/18-Side-Channels.md).

    **Levels:** §17.1 to §17.3 are for beginners, §17.4 to §17.7 are intermediate, §17.8 and
    §17.9 are expert.

## 17.1 The problem

*Level: beginner.*

A cryptographic proof says: an attacker who sees only the inputs and outputs cannot learn the
key. Real attackers see more. They can time a server's responses over a network, measure the
power a smart card draws, listen to the electromagnetic field of a phone, or zap a chip with a
voltage spike or a laser to make it miscompute. Each of these is a **side channel** or a
**fault**, and none is covered by the proof.

Classical cryptography learned this over three decades: Kocher's timing attacks (1996), power
analysis (1999), the Bellcore fault attack on RSA (1997), cache attacks on AES (2005). The
post-quantum schemes arrive with that experience, but also with new code paths no one had
hardened before: polynomial arithmetic, rejection sampling, compression, error-correcting
decoders, and huge hash trees. They also tend to be bigger, so there is more code in which to
slip.

## 17.2 Constant time, really

*Level: beginner.*

The rule for software is simple to state. **No secret value may influence:**

- which instructions run (no branches on secrets);
- which memory addresses are read or written (no table lookups indexed by secrets);
- the operands of instructions whose time depends on their values (on many processors,
  division, and on some, multiplication).

Code written this way is called **constant-time**, though "secret-independent time" would be
more accurate. Post-quantum code uses the same tricks as classical code: arithmetic masks
instead of `if`, conditional moves, Barrett and Montgomery reduction instead of `%` and `/`
(Chapter 7), and full scans instead of indexed lookups.

The rule's weak point is that it is a property of the **machine code**, while programmers
write C, Rust or Go. A compiler is free to turn arithmetic into a branch if it thinks that is
faster, and it knows nothing about which values are secret. A processor is free to make an
instruction's timing depend on its operands. The two incidents below are one of each.

## 17.3 KyberSlash: a division by $q$

*Level: beginner.*

ML-KEM decryption ends by turning each coefficient $x$ of a noisy polynomial back into a bit:
is $x$ closer to 0 or to $q/2$? The reference code computed this as $\lfloor (2x + q/2) / q
\rfloor \bmod 2$ with a division by $q = 3329$. The value $x$ depends on the secret key. On
many processors, including the Arm Cortex-A7 of a Raspberry Pi 2 and the Cortex-M4 used in
embedded devices, integer division takes a time that depends on its operands.

In December 2023 and January 2024 researchers reported two such divisions in the reference
code and in many libraries derived from it: **KyberSlash1** in the message decoding of
decryption, and **KyberSlash2** in the compression of ciphertexts. The paper ("KyberSlash:
Exploiting secret-dependent division timings in Kyber implementations", Bernstein, Bhargavan,
Bhasin, Chattopadhyay, Chia, Kannwischer, Kiefer, Paiva, Ravi and Tamvada; ePrint 2024/1049)
recovered secret keys reliably within minutes for KyberSlash2 and within a few hours for
KyberSlash1, on both of those processors, by timing decapsulations of chosen ciphertexts.

The fix replaces the division by a multiplication and a shift. Since $80635 / 2^{28}$ is very
close to $1/3329$, multiplying by 80635 and shifting right by 28 bits gives the same quotient
for every input that can occur, and multiplication by a constant is constant-time on the
processors concerned.

**Code it.** The old decoding and the patched one, compared on every possible coefficient.

```python
q = 3329

def tomsg_bit_division(x):
    """Decode one coefficient to a bit, as the old reference code did: a division by q."""
    return (((x << 1) + q // 2) // q) & 1

def tomsg_bit_multiply(x):
    """The patched code: multiply by a constant and shift, no division instruction."""
    t = (x << 1) + 1665
    t = (t * 80635) >> 28
    return t & 1

same = all(tomsg_bit_division(x) == tomsg_bit_multiply(x) for x in range(q))
print("same bit for every coefficient 0..3328:", same)
print("80635 / 2^28 =", 80635 / 2**28, " 1/q =", 1 / q)
```

It prints:

```
same bit for every coefficient 0..3328: True
80635 / 2^28 = 0.00030038878321647644  1/q = 0.00030039050765995795
```

An exhaustive check like this is cheap for one coefficient's worth of inputs and is the right
way to validate any such replacement. The KyberSlash paper also presented a patched Valgrind
that flags variable-time instructions on secret data, run over more than a thousand
implementations in the SUPERCOP benchmarking suite; tools like it are now part of the test
suites of the main ML-KEM libraries.

## 17.4 Clangover: when the compiler adds a branch

*Level: intermediate.*

The opposite step of decryption, inside encapsulation and the re-encryption check of
decapsulation, turns each message bit into a coefficient: 0 for a 0 bit, $(q+1)/2 = 1665$ for a
1 bit. The reference code did this without a branch, with a mask:

```python
q = 3329

def frommsg_branch(bit):
    return (q + 1) // 2 if bit else 0          # a branch on a secret bit

def frommsg_mask(bit):
    mask = -bit & 0xFFFF                       # 0x0000 or 0xFFFF, with no branch in the source
    return mask & ((q + 1) // 2)

print([frommsg_branch(b) for b in (0, 1)], [frommsg_mask(b) for b in (0, 1)])
```

It prints:

```
[0, 1665] [0, 1665]
```

In June 2024 Antoon Purnal showed that Clang, versions 15 to 18 on x86 with several common
optimization settings, recognized the mask pattern in `poly_frommsg` and compiled it back into
a conditional branch, the very thing the source avoided. The branch depends on the message,
and during decapsulation the message is the secret decryption result. Combined with the
plaintext-checking oracle of Chapter 8 (does this ciphertext decrypt to the message I guessed?),
the timing of that branch leaked the key: his proof of concept, named **clangover**,
recovered an ML-KEM-512 secret key in 5 to 10 minutes on an Intel Core i7-13700H. It was
recorded as CVE-2024-37880 and fixed in the reference code (commit 9b8d306) by hiding the
value from the optimizer with a "value barrier", a small trick that stops the compiler from
reasoning about where the mask came from.

Two lessons follow. First, constant-time C is a hope, not a guarantee: the guarantee has to be
checked on the compiled binary, for each compiler version and each set of flags. Second, the
FO transform's re-encryption step, which exists to protect against chosen-ciphertext attacks,
is itself a place where a leak turns into a chosen-ciphertext attack. Every bit of the
decrypted message must be treated as secret.

## 17.5 Power, electromagnetic leaks and masking

*Level: intermediate.*

On a smart card or a microcontroller, an attacker who holds the device can measure its power
draw or electromagnetic emission while it works. The number-theoretic transform is a
particularly rich target: each butterfly multiplies a secret coefficient by a known constant,
and the Hamming weights of intermediate values leak into the traces. Single-trace attacks,
which recover an ML-KEM key or message from one measured decapsulation, were shown against
unprotected lattice code as early as 2017 (Primas, Pessl and Mangard, CHES 2017), with many
refinements since.

The standard defense is **masking**: split every secret value into random shares that sum to
it, $s = s_1 + s_2 \pmod q$, and compute on the shares separately so that no single
intermediate value depends on $s$. Linear steps such as the NTT and polynomial addition are
easy to mask, since they apply to each share. The hard parts are the non-linear steps: the
compression and decoding that round to bits, the comparison inside the FO transform, and the
sampling of noise. Each needs a dedicated masked "gadget" that converts between arithmetic
shares mod $q$ and Boolean shares of bits. First- and higher-order masked ML-KEM was shown by
Bos, Gourjon, Renes, Schneider and van Vredendaal (TCHES 2021), at a cost of a few times the
running time at first order and much more at higher orders.

ML-DSA adds its own difficulty: rejection sampling means the number of signing attempts depends
on the secret and the randomness, and the check $\|z\|_\infty < \gamma_1 - \beta$ must be done
without leaking which coefficient failed. Implementations must treat the values from rejected
attempts as secret, since they reveal information about the key.

Masking is for devices an attacker can hold. A server in a data center needs constant-time
code; a smart card, a hardware security module or a car's key fob needs both.

## 17.6 Break it: a fault in deterministic signing

*Level: intermediate.*

Deterministic signing was meant to be a safety feature. ECDSA famously leaks its key if the
same nonce is used twice, as happened to the Sony PlayStation 3 in 2010, so EdDSA and
deterministic ECDSA derive the nonce from the key and the message. Dilithium did the same with
its masking vector $y$: in deterministic mode, $y$ depends only on the key and the message.

Now add a fault. Ask the device to sign the same message twice, and glitch it the second time
so that the challenge $c$ comes out differently (for example, by corrupting one byte of the
input to the hash). Both signatures use the same $y$:

$$z_1 = y + c_1 s_1, \qquad z_2 = y + c_2 s_1 \quad\Longrightarrow\quad z_1 - z_2 = (c_1 -
c_2)\,s_1.$$

Everything on the left is public, $c_1 - c_2$ is public, and $s_1$ is the secret key. One
division in the polynomial ring, or a linear system, recovers it. Bruinderink and Pessl
described this and related fault attacks on deterministic lattice signatures (TCHES 2018).

**Code it.** A toy with ML-DSA's modulus in a ring of 16 coefficients: a normal signature and a
faulted one on the same message, then the key from the difference. The commitment and
rejection steps are left out; they change nothing in the algebra of the attack.

```python
import hashlib, random
q, n = 8380417, 16                      # ML-DSA's modulus, a small ring for the toy

def polymul(a, b):                      # multiply in Z_q[X]/(X^n + 1)
    r = [0] * n
    for i in range(n):
        for j in range(n):
            k, s = (i + j) % n, (1 if i + j < n else -1)
            r[k] = (r[k] + s * a[i] * b[j]) % q
    return r

def challenge(seed):                    # a sparse polynomial of +-1 entries from a hash
    h = hashlib.shake_256(seed).digest(2 * n)
    c = [0] * n
    for i in range(6):
        c[h[2 * i] % n] = 1 if h[2 * i + 1] & 1 else q - 1
    return c

def sign(s, msg, fault=False, rnd=b""):
    """Deterministic toy: y comes from the key and message only (and rnd, if any)."""
    y = list(hashlib.shake_256(bytes(str(s), "ascii") + msg + rnd).digest(3 * n))
    y = [int.from_bytes(bytes(y[3 * i:3 * i + 3]), "little") % (1 << 17) for i in range(n)]
    w = y[:]                            # stands in for the commitment A*y
    c = challenge(bytes(str(w), "ascii") + msg + (b"!" if fault else b""))   # a glitch changes c
    z = [(yi + ci) % q for yi, ci in zip(y, polymul(c, s))]
    return c, z

def solve(A, b):                        # Gaussian elimination mod q
    M = [row[:] + [bi] for row, bi in zip(A, b)]
    for col in range(n):
        piv = next(r for r in range(col, n) if M[r][col])
        M[col], M[piv] = M[piv], M[col]
        inv = pow(M[col][col], -1, q)
        M[col] = [v * inv % q for v in M[col]]
        for r in range(n):
            if r != col and M[r][col]:
                f = M[r][col]
                M[r] = [(x - f * y) % q for x, y in zip(M[r], M[col])]
    return [M[r][n] for r in range(n)]

rng = random.Random(17)
s = [rng.choice([q - 2, q - 1, 0, 1, 2]) for _ in range(n)]        # small secret key
msg = b"release the oxygen reserve"
c1, z1 = sign(s, msg)                   # a normal signature
c2, z2 = sign(s, msg, fault=True)       # the same message, signed during a glitch

# z1 - z2 = (c1 - c2) * s: a linear system for s
dc = [(a - b) % q for a, b in zip(c1, c2)]
A = [[0] * n for _ in range(n)]
for j in range(n):                      # column j of "multiply by dc" is dc * X^j
    e = [0] * n; e[j] = 1
    for i, v in enumerate(polymul(dc, e)):
        A[i][j] = v
recovered = solve(A, [(a - b) % q for a, b in zip(z1, z2)])
print("secret recovered from two signatures:", recovered == s)
```

It prints:

```
secret recovered from two signatures: True
```

## 17.7 Fix it: hedged signing

*Level: intermediate.*

FIPS 204 makes **hedged** signing the default. The masking vector is derived from the key, the
message *and* 32 fresh random bytes $rnd$. If the random generator works, two signatures of the
same message use unrelated $y$ values, and the difference trick gives nothing. If the random
generator fails completely and returns zeros, signing falls back to the deterministic variant,
which is still secure without faults. That is the meaning of "hedged": secure if either the
randomness or the absence of faults holds. FIPS 204 still allows a deterministic variant, with
$rnd$ set to 32 zero bytes, for cases where no randomness is available.

**Code it.** The same attack against hedged signing.

```python
# Uses sign() from the fault attack above.
import os

def sign_hedged(s, msg, fault=False):
    """FIPS 204's default: 32 fresh random bytes go into y as well."""
    return sign(s, msg, fault, rnd=os.urandom(32))

c1, z1 = sign_hedged(s, msg)
c2, z2 = sign_hedged(s, msg, fault=True)
dc = [(a - b) % q for a, b in zip(c1, c2)]
A = [[0] * n for _ in range(n)]
for j in range(n):
    e = [0] * n; e[j] = 1
    for i, v in enumerate(polymul(dc, e)):
        A[i][j] = v
guess = solve(A, [(a - b) % q for a, b in zip(z1, z2)])
print("secret recovered from two hedged signatures:", guess == s)
```

It prints:

```
secret recovered from two hedged signatures: False
```

Faults remain a threat in other places: skipping the rejection check can leak $y$ and then
$s_1$; corrupting the expansion of the public matrix or the secret vectors gives other
attacks; SLH-DSA has its own fault attack, on the tree roots it signs (Chapter 12). Hardware
countermeasures (sensors, redundant computation, checking a signature before releasing it)
are the usual answer; verifying each signature before releasing it costs one verification,
which for ML-DSA is several times cheaper than signing.

## 17.8 Failures, oracles and checks

*Level: expert.*

Several post-quantum attacks need no physical access at all, only a server that behaves
differently depending on a secret:

- **Plaintext-checking oracles.** Chapter 8 broke ML-KEM-512 with six crafted ciphertexts to a
  server that revealed whether decapsulation produced a given message. The FO transform's
  implicit rejection exists to stop exactly that, so any observable difference between a valid
  and an invalid ciphertext (an error code, a log line, a different running time) brings the
  attack back.
- **Decryption failures.** For BIKE and HQC, Chapter 14 showed how failure statistics can leak
  the key and why failure rates must be negligible; a decoder whose running time depends on
  how many errors it corrected (HQC's early Reed-Solomon decoder) gives the attacker those
  statistics directly.
- **Input checks.** FIPS 203 requires checks on encapsulation keys (every coefficient below $q$)
  and on decapsulation key material (the stored hash of the public key must match). Skipping
  them lets malformed keys through, and some attacks need exactly that.

**Randomness and seeds.** ML-KEM and ML-DSA draw all their secret randomness from 32-byte seeds
at key generation (and, for hedged ML-DSA, at signing). A weak or repeated random number
generator gives weak or repeated keys, exactly as for classical schemes; nothing in a
post-quantum standard protects against a broken generator. Storing the seed instead of the
expanded key, as the final FIPS 203 and 204 allow and as IETF key formats now encourage, has
two benefits: the stored secret is small (64 bytes for ML-KEM, 32 for ML-DSA), and the
expanded key can be checked for consistency each time it is regenerated.

**Known-answer tests.** The first defense against a wrong implementation is to compare its
outputs with someone else's. NIST's **Automated Cryptographic Validation Protocol** (ACVP)
publishes JSON test vectors for every approved algorithm, and its validation program (CAVP)
tests products against them; a FIPS 140-3 module must pass. This book's own code was held to
the same standard: the ML-KEM code of Chapter 8 matches all 180 ACVP vectors it was tested
against, ML-DSA (Chapter 9) all 615, and SLH-DSA (Chapter 12) all 1,248, including all 624
signature-generation tests. Test vectors catch wrong answers, but they say nothing about
timing, so they are necessary and far from sufficient.

**Formal verification.** The strongest assurance available in 2026 is a machine-checked proof
that the code computes the specification, is memory-safe, and is constant-time at the level of
the compiled or assembly code:

- **libcrux** (Cryspen) is a Rust library whose ML-KEM is verified for correctness and
  secret-independence with the hax toolchain and the F* proof assistant.
- **mlkem-native**, from the Post-Quantum Cryptography Alliance's PQ Code Package, proves its
  C code memory-safe and type-safe with the CBMC model checker, and proves its AArch64 and
  x86-64 assembly functionally correct, memory-safe and constant-time with the HOL Light
  theorem prover. It is integrated into **AWS-LC**, Amazon's cryptographic library, and has
  been adopted as the default ML-KEM in liboqs.
- Similar work covers parts of ML-DSA and SHA-3 in several libraries; coverage is growing
  quickly and should be checked library by library.

A proof is only as good as its model: the "constant-time" proofs assume a processor whose
instructions take secret-independent time on the instructions used, which is why KyberSlash's
division would have been ruled out by such a model, and why the model itself must be checked
against the hardware's documentation.

## 17.9 In the real world: choosing a library

*Level: expert.*

As of November 2026, a developer who needs ML-KEM or ML-DSA has mature choices, and the advice
is the same as for classical cryptography: do not write your own; use a maintained library that
the people who break things are looking at.

| library | language | post-quantum algorithms (Nov 2026) | notes |
|---|---|---|---|
| OpenSSL 3.5 and later | C | ML-KEM, ML-DSA, SLH-DSA; hybrid TLS groups | 3.5 (April 2025) was the first release with them |
| BoringSSL | C | ML-KEM, ML-DSA; X25519MLKEM768 in TLS | used in Chrome and Android |
| AWS-LC | C | ML-KEM (mlkem-native), ML-DSA | FIPS-validated builds |
| Go standard library | Go | ML-KEM (`crypto/mlkem`, Go 1.24) | X25519MLKEM768 on by default in `crypto/tls` |
| Java (JDK 24 and later) | Java | ML-KEM, ML-DSA (JEPs 496 and 497) | in the standard JCA providers |
| Bouncy Castle | Java, C# | the NIST standards and many candidates | broad coverage |
| liboqs (Open Quantum Safe) | C | standards plus many candidates | for prototyping and research |

*Table 17.1. Some widely used libraries with post-quantum support. Versions and features move
quickly; check each project's release notes.*

The questions to ask of any library: Does it implement the final FIPS 203, 204 and 205, not
the round 3 Kyber or Dilithium (Chapter 8 lists the differences)? Does it pass ACVP vectors,
and is any build FIPS-validated if you need that? Does its test suite check for variable-time
instructions, and does it have formal proofs for the parts you use? Is it maintained, with a
security contact and a record of fixing reports like KyberSlash quickly? And does it offer
the hybrid combinations your protocol needs (Chapter 18)?

**Mars.** Arcadia City's airlock controllers are small embedded processors, the kind on which
division is variable-time and an attacker standing at the door could, in principle, measure
power. The city's rule for them is the one this chapter argues for: a verified ML-KEM
implementation with masking, hedged ML-DSA for the controller's own messages, every signature
checked before it leaves the chip, and the ACVP vectors run on every new firmware build before
it is signed and shipped.

## 17.10 Going deeper

*Level: expert.*

- **Timing.** Bernstein and others, "KyberSlash: Exploiting secret-dependent division timings in
  Kyber implementations" (ePrint 2024/1049); Antoon Purnal, the clangover proof of concept
  (github.com/antoonpurnal/clangover) and CVE-2024-37880.
- **Power and masking.** Primas, Pessl and Mangard, "Single-Trace Side-Channel Attacks on
  Masked Lattice-Based Encryption" (CHES 2017); Bos, Gourjon, Renes, Schneider and van
  Vredendaal, "Masking Kyber: First- and Higher-Order Implementations" (TCHES 2021).
- **Faults.** Bruinderink and Pessl, "Differential Fault Attacks on Deterministic Lattice
  Signatures" (TCHES 2018).
- **Verification.** The mlkem-native and libcrux repositories and their proof documentation;
  Amazon Science, "Verifying and optimizing post-quantum cryptography at Amazon".
- **Validation.** NIST's ACVP server and its JSON test vectors (github.com/usnistgov/ACVP-Server).

## Check yourself

??? question "1. Name three things a secret must not influence in constant-time code."

    The instructions executed (branches), the memory addresses accessed, and the operands of
    instructions whose timing depends on their values, such as division on many processors.

??? question "2. What was KyberSlash, and how was it fixed?"

    Divisions by $q$ on secret-dependent values in ML-KEM decryption and compression, whose
    timing leaked the key on processors with variable-time division. The fix replaced each
    division by a multiplication by a constant and a shift.

??? question "3. How did the code check that the fix was correct?"

    By comparing the old and new decoding on all 3,329 possible coefficient values: they agree
    on every one.

??? question "4. What did clangover show?"

    That Clang (versions 15 to 18 on x86, with common flags) compiled ML-KEM's branch-free mask
    in poly_frommsg back into a secret-dependent branch, which leaked an ML-KEM-512 key in
    minutes through decapsulation timing.

??? question "5. What is masking, and which parts of ML-KEM are hard to mask?"

    Splitting each secret into random shares and computing on them separately. Linear parts
    (NTT, additions) are easy; non-linear parts (compression, decoding, the FO comparison,
    sampling) need special gadgets.

??? question "6. Why does a fault on deterministic signing reveal the key?"

    Both signatures share the same $y$, so the difference of the two responses is $(c_1 - c_2)
    s_1$, with $c_1 - c_2$ public; solving for $s_1$ is linear algebra.

??? question "7. What does FIPS 204's hedged signing add, and what happens if the random generator fails?"

    32 fresh random bytes in the derivation of $y$. If the generator fails, signing becomes
    the deterministic variant, which is still secure as long as there are no faults.

??? question "8. What do known-answer tests check, and what do they miss?"

    That outputs match the standard on given inputs. They say nothing about timing, power or
    faults.

??? question "9. What does mlkem-native prove, and with which tools?"

    Memory and type safety of its C code with CBMC; functional correctness, memory safety and
    constant-time behavior of its assembly with HOL Light.

## What you learned

- Post-quantum code has already leaked keys through timing (KyberSlash, clangover), and the
  leaks came from a processor and a compiler, not from the source code's intent.
- Constant-time must be checked on the binary; masking is needed where attackers hold the
  device.
- Deterministic lattice signing falls to a single fault; hedged signing, the FIPS 204 default,
  stops the simplest attacks.
- Oracles, decryption failures and missing input checks turn implementation slips into
  chosen-ciphertext attacks.
- Test vectors, tools for variable-time instructions and formal proofs together give the best
  assurance available; choose a maintained library that uses them.

**Next:** [Chapter 18](18-Hybrids-and-the-Migration.md), hybrids and the migration of the
Internet.

## Further reading

- Daniel J. Bernstein and others, "KyberSlash" (ePrint 2024/1049).
- Leon Groot Bruinderink and Peter Pessl, "Differential Fault Attacks on Deterministic Lattice
  Signatures" (TCHES 2018).
- Joppe W. Bos, Marc Gourjon, Joost Renes, Tobias Schneider and Christine van Vredendaal,
  "Masking Kyber: First- and Higher-Order Implementations" (TCHES 2021).
- NIST FIPS 203 and FIPS 204 (August 2024), the sections on implementation requirements.
- The PQ Code Package (Post-Quantum Cryptography Alliance) and its mlkem-native documentation.
