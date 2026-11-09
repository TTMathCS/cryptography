# 17. Implementing Post-Quantum Safely

*A scheme can be secure on paper and broken in a product. Every post-quantum standard has
already had implementations that leaked keys: through the time a division took, through a
branch a compiler added on its own, through the power drawn while decoding, through a single
glitched instruction. This chapter collects those lessons. It shows the KyberSlash bug and its
fix in code, the "clangover" compiler problem, a fault attack that recovers a lattice signing
key from two signatures and the hedged signing that stops it, a masked ML-KEM decoder checked
for leaks, and a constant-time implicit rejection, and then the defenses that work:
constant-time rules, masking, test vectors that reach the rare branches, formal verification,
careful library choice, and the budgets of the small chips where most attacks happen.*

!!! abstract "In this chapter"
    **You will learn:**

    - what "constant time" means in practice, why compilers can undo it, and how many
      measurements a small timing difference costs an attacker;
    - KyberSlash and clangover, two real timing leaks in ML-KEM code (2023-2024), and why
      implicit rejection did not stop them;
    - power analysis and masking for lattice schemes, with a masked decoder in code;
    - fault attacks, shown in code on deterministic lattice signing, and why FIPS 204 hedges;
    - decryption-failure and oracle attacks, and implicit rejection without branches;
    - ten years of post-quantum implementation breaks, with dates and sources;
    - known-answer tests, ACVP, the CCTV and Wycheproof edge cases, and verified code;
    - what ML-KEM and ML-DSA cost on a Cortex-M4, and how to choose a library.

    **You need:** [Chapter 8](08-ML-KEM.md) (ML-KEM) and [Chapter 9](09-ML-DSA.md) (ML-DSA);
    the general theory of side channels is in Chapter 18 of
    [the cryptography book](../../book/18-Side-Channels.md). General constant-time technique
    and masking are in [Engineering, Chapter 5](../engineering/05-Constant-Time-Programming.md)
    and [Engineering, Chapter 7](../engineering/07-Masking-and-Fault-Resistance.md); the
    attacker's view of timing, power and faults is
    [Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md). This
    chapter stays with what is particular to post-quantum code.

    **Levels:** §17.1 to §17.3 are for beginners; §17.4 to §17.7, §17.9, §17.10 and §17.12
    are intermediate; §17.8, §17.11, §17.13 and §17.14 are expert.

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

### Where decapsulation leaks

Walk once through ML-KEM decapsulation (Chapter 8, §8.9) and ask, at each step, what an
attacker could watch (Figure 17.1). Only the first step handles nothing but public data. From
the moment the secret $\mathbf{s}$ multiplies the ciphertext's $\mathbf{u}$, every value is
secret or derived from a secret: the noisy coefficients, the decoded message $m'$, the hash
that turns $m'$ into a key and re-encryption randomness, the re-encrypted $c'$, and the bit
that says whether $c' = c$.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="ML-KEM decapsulation in seven steps: unpack the ciphertext, decrypt, decode the message, hash it, re-encrypt, compare, and output the key or the rejection key; each step after the first handles secret values, and each is labeled with the attacks found against it" fill="currentColor" font-size="14">
<defs><marker id="ar171" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<g stroke="currentColor" fill="none" marker-end="url(#ar171)">
<line x1="150" y1="67" x2="173" y2="67"/>
<line x1="305" y1="67" x2="328" y2="67"/>
<line x1="460" y1="67" x2="483" y2="67"/>
<polyline points="552,104 552,134 85,134 85,166"/>
<line x1="200" y1="207" x2="228" y2="207"/>
<line x1="400" y1="207" x2="428" y2="207"/>
</g>
<rect fill="none" stroke="currentColor" x="20" y="30" width="130" height="74" rx="5"/>
<g fill="currentColor" fill-opacity=".08" stroke="currentColor">
<rect x="175" y="30" width="130" height="74" rx="5"/>
<rect x="330" y="30" width="130" height="74" rx="5"/>
<rect x="485" y="30" width="135" height="74" rx="5"/>
<rect x="20" y="170" width="180" height="74" rx="5"/>
<rect x="230" y="170" width="170" height="74" rx="5"/>
<rect x="430" y="170" width="190" height="74" rx="5"/>
</g>
<g font-weight="bold">
<text x="30" y="52">1. unpack c</text>
<text x="185" y="52">2. decrypt</text>
<text x="340" y="52">3. decode m′</text>
<text x="495" y="52">4. G(m′ ‖ h)</text>
<text x="30" y="192">5. re-encrypt m′</text>
<text x="240" y="192">6. compare c′ = c</text>
<text x="440" y="192">7. K′ or J(z ‖ c)</text>
</g>
<g font-size="12" fill-opacity=".7">
<text x="30" y="72">sizes, key checks</text>
<text x="30" y="90">(public data)</text>
<text x="185" y="72">NTT, s·u: power and</text>
<text x="185" y="90">EM, single trace</text>
<text x="340" y="72">KyberSlash1: division;</text>
<text x="340" y="90">skip faults</text>
<text x="495" y="72">secret hash input:</text>
<text x="495" y="90">masked SHA-3</text>
<text x="30" y="212">encode m′: clangover</text>
<text x="30" y="230">compress: KyberSlash2</text>
<text x="240" y="212">early exit, strcmp,</text>
<text x="240" y="230">leaky masked compare</text>
<text x="440" y="212">a branch on the result,</text>
<text x="440" y="230">an error code, a log line</text>
</g>
<g font-size="13">
<text x="20" y="276">Shaded steps handle values that depend on the secret key. Only the final key leaves,</text>
<text x="20" y="294">and the protocol's later behavior shows whether it matched: that one bit is public anyway.</text>
</g>
</svg>
<figcaption>Figure 17.1. Where ML-KEM decapsulation has leaked. Each step after the first handles values that depend on the secret key, and each has had its own published attack: power analysis of the NTT, a division in decoding, a compiler's branch in re-encoding, a leaky comparison.</figcaption>
</figure>

Two things about this picture surprise people. The first is how long the secret path is: the
Fujisaki-Okamoto transform, added to make ML-KEM safe against chosen ciphertexts, more than
doubles the code that touches secrets, because all of encryption runs again on the decrypted
message. The second is that the protocol leaks one bit whatever the code does: whether the
key matched. An attacker who sees the connection fail learns that bit, so it must carry no
information the attacker could not have computed alone. The rest of the chapter is, in a
sense, a commentary on this figure.

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

### How small a leak is too small?

A common objection is that a difference of a few dozen cycles cannot matter when a server's
response time varies by microseconds. The answer is statistics: averaging $n$ measurements
shrinks the noise by $\sqrt{n}$ but leaves the difference where it is (Figure 17.2).

<figure class="mars-fig">
<svg viewBox="0 0 640 318" width="640" role="img" aria-label="Two pairs of bell curves of decapsulation time. On the left, single measurements with spread 40 cycles and means 30 cycles apart overlap heavily. On the right, averages of 64 measurements have spread 5 cycles and are cleanly separated." fill="currentColor" font-size="14">
<g stroke="currentColor">
<line x1="10" y1="210" x2="280" y2="210"/>
<line x1="41.2" y1="210" x2="41.2" y2="215"/>
<line x1="93.1" y1="210" x2="93.1" y2="215"/>
<line x1="145.0" y1="210" x2="145.0" y2="215"/>
<line x1="196.9" y1="210" x2="196.9" y2="215"/>
<line x1="248.8" y1="210" x2="248.8" y2="215"/>
<line x1="340" y1="210" x2="610" y2="210"/>
<line x1="371.2" y1="210" x2="371.2" y2="215"/>
<line x1="423.1" y1="210" x2="423.1" y2="215"/>
<line x1="475.0" y1="210" x2="475.0" y2="215"/>
<line x1="526.9" y1="210" x2="526.9" y2="215"/>
<line x1="578.8" y1="210" x2="578.8" y2="215"/>
</g>
<g fill="currentColor" fill-opacity=".18" stroke="none">
<polygon points="10.0,206.6 21.3,203.1 32.5,196.9 43.8,187.0 55.0,172.6 66.2,153.4 77.5,130.3 88.8,105.8 100.0,83.5 111.2,67.1 122.5,60.1 133.8,63.9 145.0,77.6 156.2,98.6 167.5,122.8 178.8,146.6 190.0,167.2 201.3,183.1 212.5,194.3 223.7,201.5 235.0,205.7 246.2,208.0 257.5,209.1 268.8,209.6 280.0,209.9 280.0,210 10.0,210"/>
<polygon points="433.5,209.9 435.2,209.8 436.9,209.4 438.7,208.3 440.4,205.7 442.1,200.1 443.8,189.7 445.6,172.6 447.3,148.3 449.0,119.0 450.8,89.9 452.5,68.1 454.2,60.0 456.0,68.1 457.7,89.9 459.4,119.0 461.2,148.3 462.9,172.6 464.6,189.7 466.3,200.1 468.1,205.7 469.8,208.3 471.5,209.4 473.3,209.8 475.0,209.9 475.0,210 433.5,210"/>
</g>
<g fill="none" stroke="currentColor" stroke-width="1.6">
<polyline points="10.0,206.6 21.3,203.1 32.5,196.9 43.8,187.0 55.0,172.6 66.2,153.4 77.5,130.3 88.8,105.8 100.0,83.5 111.2,67.1 122.5,60.1 133.8,63.9 145.0,77.6 156.2,98.6 167.5,122.8 178.8,146.6 190.0,167.2 201.3,183.1 212.5,194.3 223.7,201.5 235.0,205.7 246.2,208.0 257.5,209.1 268.8,209.6 280.0,209.9"/>
<polyline points="433.5,209.9 435.2,209.8 436.9,209.4 438.7,208.3 440.4,205.7 442.1,200.1 443.8,189.7 445.6,172.6 447.3,148.3 449.0,119.0 450.8,89.9 452.5,68.1 454.2,60.0 456.0,68.1 457.7,89.9 459.4,119.0 461.2,148.3 462.9,172.6 464.6,189.7 466.3,200.1 468.1,205.7 469.8,208.3 471.5,209.4 473.3,209.8 475.0,209.9"/>
</g>
<g fill="currentColor" fill-opacity=".05" stroke="none">
<polygon points="10.0,209.7 21.3,209.2 32.5,208.1 43.8,205.9 55.0,201.9 66.2,195.0 77.5,184.1 88.8,168.6 100.0,148.3 111.2,124.7 122.5,100.4 133.8,79.0 145.0,64.6 156.2,60.0 167.5,66.2 178.8,81.9 190.0,104.0 201.3,128.5 212.5,151.7 223.7,171.3 235.0,186.1 246.2,196.3 257.5,202.7 268.8,206.4 280.0,208.3 280.0,210 10.0,210"/>
<polygon points="464.6,209.9 466.3,209.8 468.1,209.4 469.8,208.3 471.5,205.7 473.3,200.1 475.0,189.7 476.7,172.6 478.5,148.3 480.2,119.0 481.9,89.9 483.7,68.1 485.4,60.0 487.1,68.1 488.8,89.9 490.6,119.0 492.3,148.3 494.0,172.6 495.8,189.7 497.5,200.1 499.2,205.7 501.0,208.3 502.7,209.4 504.4,209.8 506.2,209.9 506.2,210 464.6,210"/>
</g>
<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3">
<polyline points="10.0,209.7 21.3,209.2 32.5,208.1 43.8,205.9 55.0,201.9 66.2,195.0 77.5,184.1 88.8,168.6 100.0,148.3 111.2,124.7 122.5,100.4 133.8,79.0 145.0,64.6 156.2,60.0 167.5,66.2 178.8,81.9 190.0,104.0 201.3,128.5 212.5,151.7 223.7,171.3 235.0,186.1 246.2,196.3 257.5,202.7 268.8,206.4 280.0,208.3"/>
<polyline points="464.6,209.9 466.3,209.8 468.1,209.4 469.8,208.3 471.5,205.7 473.3,200.1 475.0,189.7 476.7,172.6 478.5,148.3 480.2,119.0 481.9,89.9 483.7,68.1 485.4,60.0 487.1,68.1 488.8,89.9 490.6,119.0 492.3,148.3 494.0,172.6 495.8,189.7 497.5,200.1 499.2,205.7 501.0,208.3 502.7,209.4 504.4,209.8 506.2,209.9"/>
</g>
<rect fill="currentColor" fill-opacity=".18" stroke="currentColor" x="20" y="272" width="14" height="10"/>
<rect fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-dasharray="5 3" x="340" y="272" width="14" height="10"/>
<g font-weight="bold">
<text x="10" y="24">One measurement</text>
<text x="340" y="24">Average of 64 measurements</text>
</g>
<g fill-opacity=".7" font-size="12">
<text x="10" y="42">spread σ = 40 cycles, gap δ = 30</text>
<text x="340" y="42">spread σ/8 = 5 cycles, same gap</text>
</g>
<g font-size="12" text-anchor="middle">
<text x="41.2" y="230">950</text>
<text x="93.1" y="230">1000</text>
<text x="145.0" y="230">1050</text>
<text x="196.9" y="230">1100</text>
<text x="248.8" y="230">1150</text>
<text x="371.2" y="230">950</text>
<text x="423.1" y="230">1000</text>
<text x="475.0" y="230">1050</text>
<text x="526.9" y="230">1100</text>
<text x="578.8" y="230">1150</text>
</g>
<text text-anchor="middle" font-size="13" x="320" y="258">cycles per decapsulation (simulated shape)</text>
<g font-size="13">
<text x="40" y="282">secret coefficient makes the division short</text>
<text x="360" y="282">secret coefficient makes it long</text>
<text x="20" y="306">To tell the two apart with z standard errors of margin: n ≈ 2 (z σ / δ)², per class.</text>
</g>
</svg>
<figcaption>Figure 17.2. A timing leak, before and after averaging. One measurement cannot tell the two secret cases apart; the average of 64 can, because averaging divides the spread by 8 and leaves the 30-cycle gap alone. The shapes are illustrative, not measured.</figcaption>
</figure>

**By hand.** Suppose one secret case makes decapsulation $\delta = 30$ cycles slower than the
other, and one measurement has noise with standard deviation $\sigma = 40$ cycles. The
difference of two means of $n$ measurements has standard error $\sigma\sqrt{2/n}$. To see the
gap with a margin of $z = 4$ standard errors (a false alarm well under once in ten thousand
tries), we need

$$\delta \ge z\,\sigma\sqrt{2/n} \quad\Longleftrightarrow\quad n \ge 2\left(\frac{z\,\sigma}{\delta}\right)^2
= 2\left(\frac{4 \cdot 40}{30}\right)^2 \approx 57.$$

Fifty-seven measurements per case, on a machine the attacker shares. Across a local network,
where one round trip might jitter by $\sigma = 20$ microseconds, or 60,000 cycles at 3 GHz,
the formula gives $n = 2 (4 \cdot 60{,}000 / 30)^2 = 128{,}000{,}000$. That is a lot, but not
infinite: at a million decapsulations an hour it takes about five days, and remote timing
attacks on classical code (Brumley and Boneh on OpenSSL's RSA, 2003; Lucky Thirteen on TLS,
2013) worked at this kind of scale. The attacker, not the defender, decides how many
measurements to take, so the rule is "no leak", not "small leaks". The formula also says what
helps the attacker most: being close, since $n$ falls with the square of $\sigma$. That is why
the leaks in the next sections were shown on the processors themselves.

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

```text
same bit for every coefficient 0..3328: True
80635 / 2^28 = 0.00030038878321647644  1/q = 0.00030039050765995795
```

An exhaustive check like this is cheap for one coefficient's worth of inputs and is the right
way to validate any such replacement. The KyberSlash paper also presented a patched Valgrind
that flags variable-time instructions on secret data, run over more than a thousand
implementations in the SUPERCOP benchmarking suite; tools like it are now part of the test
suites of the main ML-KEM libraries.

### What the timing reveals

Why should one division matter, when decryption's answer is only a bit? Because the time
says more than the bit. On the Arm Cortex-M4, `UDIV` takes between 2 and 12 cycles and
finishes early depending on the leading zeros of its operands. The divisor is always $q$, so
the time follows the size of the dividend $2x + 1665$, which depends on the secret-derived
coefficient $x$. A simple model sorts the 3,329 values of $x$ into four classes by the bit
length of the dividend.

An attacker can then reuse the crafted ciphertexts of Chapter 8, §8.8, where each decrypted
coefficient was $x = b - a\,s$ for one secret coefficient $s$. Against full ML-KEM they were
useless, because implicit rejection hid the result. But the division happens *before* the
re-encryption check, and nothing hides its timing.

**Code it.** The four timing classes, and two crafted ciphertexts (with values decompression
can really produce) against the five possible secret coefficients $-2, \dots, 2$ of
ML-KEM-768.

```python
q = 3329

def decompress(y, d):                  # FIPS 203: round(q * y / 2^d)
    return (q * y + (1 << (d - 1))) >> d

def message_bit(x):                    # what decryption outputs for a coefficient x
    return ((2 * x + 1665) // q) & 1

def dividend_bits(x):                  # an early-terminating divider's time follows this
    return (2 * x + 1665).bit_length()

ranges = {}
for x in range(q):
    lo, hi = ranges.get(dividend_bits(x), (x, x))
    ranges[dividend_bits(x)] = (min(lo, x), max(hi, x))
for bits, (lo, hi) in sorted(ranges.items()):
    print("%d-bit dividend: x from %4d to %4d" % (bits, lo, hi))

# A crafted ciphertext: u has one coefficient decompress(y, 10), every v coefficient is
# decompress(z, 4), so each decrypted coefficient is x = b - a * s for a secret s in -2..2.
for y, z in ((10, 0), (1014, 0)):
    a, b = decompress(y, 10), decompress(z, 4)
    xs = [(b - a * s) % q for s in range(-2, 3)]
    print("a = %4d:" % a, "message bits", [message_bit(x) for x in xs],
          " dividend sizes", [dividend_bits(x) for x in xs])
```

It prints:

```text
11-bit dividend: x from    0 to  191
12-bit dividend: x from  192 to 1215
13-bit dividend: x from 1216 to 3263
14-bit dividend: x from 3264 to 3328
a =   33: message bits [0, 0, 0, 0, 0]  dividend sizes [11, 11, 11, 14, 13]
a = 3296: message bits [0, 0, 0, 0, 0]  dividend sizes [13, 14, 11, 11, 11]
```

For all five values of the secret coefficient, decryption gives the same message bit, so the
FO transform re-encrypts and rejects in exactly the same way: the protocol behaves
identically. The division sizes differ, and the two ciphertexts give five different pairs,
one for each $s$: $(11, 13)$ for $-2$, $(11, 14)$ for $-1$, $(11, 11)$ for $0$, $(14, 11)$
for $1$, $(13, 11)$ for $2$. A timing channel turned ciphertexts the KEM was designed to
reject into a partial decryption oracle.

The real attack is harder than the model. A decapsulation performs 256 such divisions and the
attacker sees only the total time, so the paper's attacks choose ciphertexts that make most
coefficients predictable, isolate one or a few secret coefficients, and repeat each
measurement until the statistics of §17.2 separate the cases. Whether a real division
instruction appeared at all depended on the compiler, the target and the flags, since
compilers often turn a division by a constant into a multiplication anyway; the fix wrote the
multiplication out by hand rather than trusting the optimizer.

### Disclosure and fallout

KyberSlash1 was found in late November 2023 by Franziskus Kiefer, Goutam Tamvada and
Karthikeyan Bhargavan of Cryspen, who were building a formally verified ML-KEM of their own
(§17.11). The reference code was patched on 1 December 2023, without the commit being labeled
a security fix; in mid-December Cryspen began telling affected projects directly. Prasanna
Ravi and Matthias Kannwischer then found KyberSlash2, patched in the reference code on 30
December 2023. The paper followed in June 2024 (ePrint 2024/1049) and appeared in TCHES 2025.

The list of affected code was long, because so much post-quantum software began as a copy of
the reference implementation: liboqs, pqm4, Botan, AWS-LC's Kyber code, Rust, JavaScript and
Go ports, Python wrappers. Libraries written independently without secret divisions, such as
BoringSSL's Kyber and Filippo Valsorda's Go `mlkem768`, were not affected. Patches arrived at
very different speeds, which made KyberSlash a good test of who was paying attention (§17.13).

!!! note "Life story: KyberSlash"
    **Born:** November and December 2023, found by Cryspen (KyberSlash1) and by Prasanna Ravi
    and Matthias Kannwischer (KyberSlash2); paper by Bernstein and nine coauthors, ePrint
    2024/1049 (June 2024), TCHES 2025 · **Purpose:** recover ML-KEM secret keys from the time
    taken by divisions by $q = 3329$ on secret-dependent values · **Helped:** a patched
    Valgrind that flags variable-time instructions on secrets, run over more than a thousand
    implementations in SUPERCOP; a sweep of the ecosystem's Kyber code; the habit of writing
    every constant division as a multiplication and a shift · **Status (Nov 2026):** fixed in
    the reference code and maintained libraries; a reason to distrust unmaintained copies of
    2023 code.

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

```text
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

### Checking the binary

Since the source cannot be trusted to say what the machine does, post-quantum projects check
the compiled code, with tools described in general in
[Engineering, Chapter 5](../engineering/05-Constant-Time-Programming.md#511-checking-the-code-taint-tracking):

- **Taint tracking with Valgrind.** The key and the randomness are marked as "undefined"
  memory, and Valgrind reports every branch and memory address computed from them. This is
  Adam Langley's ctgrind idea of 2010, packaged for post-quantum benchmarking as TIMECOP in
  SUPERCOP. It catches a branch like clangover's, since the message comes from the key; the
  KyberSlash authors extended it to flag divisions, which plain Valgrind does not consider
  dangerous.
- **Statistical testing** in the style of dudect, which times the compiled code millions of
  times on two classes of input. It finds leaks outside the taint model, but only those its
  inputs happen to trigger.
- **Proofs on the assembly**, described in §17.11.

None of these runs once. A leak can appear with a new compiler release, flag or target, so the
check belongs in continuous integration for every compiler and optimization level that ships.
Clangover appeared only with some Clang versions and flags: code that passed one year could
fail the next.

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

### Masking decryption by hand

Take one coefficient of ML-KEM decryption, $w = v - s\,u \bmod q$, with the secret
coefficient $s = 2$ and the ciphertext's $u = 1000$, $v = 2500$. Unmasked, $w = 2500 - 2000 =
500$, closer to 0 than to $q/2$, so the message bit is 0.

Masked, the device never holds $s = 2$. It holds a random share $s_0 = 1234$ and
$s_1 = 2 - 1234 \bmod 3329 = 2097$ (their sum is $3331 \equiv 2$). Multiplying by the public
$u$ and subtracting from the public $v$ are linear, so each share is processed alone, with
$v$ added to one share only:

$$w_0 = v - s_0 u = 2500 - 1{,}234{,}000 \equiv 2500 - 2270 = 230, \qquad
w_1 = -s_1 u = -2{,}097{,}000 \equiv -3059 \equiv 270 \pmod{3329}.$$

Check: $230 + 270 = 500$. With a fresh random $s_0$ each time, each share alone is a uniform
number between 0 and 3328 whatever the secret is (Figure 17.3).

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Masking one coefficient: the secret s = 2 is split into random shares 1234 and 2097; each share is multiplied and subtracted separately, giving 230 and 270; a gadget converts the arithmetic shares into Boolean shares of the message bit without ever adding them in the clear" fill="currentColor" font-size="14">
<defs><marker id="ar173" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<g stroke="currentColor" fill="none" marker-end="url(#ar173)">
<line x1="290" y1="50" x2="170" y2="84"/>
<line x1="350" y1="50" x2="470" y2="84"/>
<line x1="155" y1="120" x2="155" y2="154"/>
<line x1="485" y1="120" x2="485" y2="154"/>
<line x1="155" y1="190" x2="230" y2="224"/>
<line x1="485" y1="190" x2="410" y2="224"/>
<line x1="230" y1="270" x2="160" y2="304"/>
<line x1="410" y1="270" x2="480" y2="304"/>
</g>
<rect fill="currentColor" fill-opacity=".18" stroke="currentColor" x="250" y="16" width="140" height="34" rx="5"/>
<g fill="none" stroke="currentColor">
<rect x="60" y="86" width="190" height="34" rx="5"/>
<rect x="390" y="86" width="190" height="34" rx="5"/>
<rect x="60" y="156" width="190" height="34" rx="5"/>
<rect x="390" y="156" width="190" height="34" rx="5"/>
<rect x="60" y="306" width="190" height="34" rx="5"/>
<rect x="390" y="306" width="190" height="34" rx="5"/>
</g>
<rect fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="1.8" x="150" y="226" width="340" height="44" rx="5"/>
<g text-anchor="middle" font-weight="bold">
<text x="320" y="38">secret s = 2</text>
<text x="320" y="245">gadget: A2B conversion, masked decode</text>
</g>
<g text-anchor="middle">
<text x="155" y="108">share s₀ = 1234 (random)</text>
<text x="485" y="108">share s₁ = 2 − s₀ = 2097</text>
<text x="155" y="178">w₀ = v − s₀·u = 230</text>
<text x="485" y="178">w₁ = −s₁·u = 270</text>
<text x="155" y="328">bit share m₀ (random)</text>
<text x="485" y="328">bit share m₁ = m ⊕ m₀</text>
</g>
<text text-anchor="middle" font-size="12" fill-opacity=".7" x="320" y="262">58 masked ANDs per coefficient in the toy</text>
<g font-size="12" fill-opacity=".7" text-anchor="middle">
<text x="320" y="132">linear steps,</text>
<text x="320" y="148">share by share;</text>
<text x="320" y="164">u = 1000, v = 2500</text>
<text x="320" y="180">are public</text>
</g>
<g font-size="13">
<text x="20" y="370">Each share alone is a uniform number mod q; only their sum (230 + 270 = 500) means anything.</text>
<text x="20" y="388">The rounding to a bit is not linear, so it needs the gadget, and the gadget is where the cost is.</text>
</g>
</svg>
<figcaption>Figure 17.3. First-order masking of one ML-KEM coefficient, with the numbers of the example. The linear steps run on each share separately; the rounding to a bit is not linear, so it needs a gadget that converts arithmetic shares mod q into Boolean shares of the bit.</figcaption>
</figure>

Now the decoding: the bit is 1 when $832 \le w \le 2496$. Decoding each share and XORing the
results does not work, because rounding is not linear: the same $w = 500$ could have been
split as $1000 + 2829$, which decode to 1 and 0, XOR 1, wrong. Adding the shares first is
right but puts 500 in a register, which is what masking forbids. A **gadget** is needed: a
small algorithm from shares of $w$ to shares of the bit, with no intermediate value that
depends on $w$ alone.

The usual construction converts the arithmetic shares mod $q$ into **Boolean shares** (two
words whose XOR is the value) and compares with Boolean operations. XOR on shares is cheap;
AND mixes shares and is done with the ISW multiplication of
[Engineering, Chapter 7](../engineering/07-Masking-and-Fault-Resistance.md#77-masking-with-proofs-isw-and-threshold-implementations),
one fresh random word per AND. Addition is built from ANDs and XORs, like a ripple-carry
adder. With it, the gadget is:

<div class="mars-steps" markdown>

1. Give each arithmetic share a Boolean sharing with a fresh random word, and add the two
   with the masked adder: $y = w_0 + w_1$, between 0 and $2q - 2$, held only as shares.
2. Subtract $q$. The top bit of $y - q$ (in 14-bit two's complement) says whether $y < q$;
   use it, as shares, to select $y$ or $y - q$. The shares now hold $w$.
3. Subtract 832 and, separately, 2497; the two top bits say whether $w < 832$ and $w < 2497$.
4. One more masked AND computes "not below 832, and below 2497": shares of the bit.

</div>

**Code it.** A first-order masked decoder built from a masked AND, checked on all 3,329
inputs.

```python
import random
q, K = 3329, 14                        # ML-KEM's modulus; 14-bit Boolean words
WORD = (1 << K) - 1
rng = random.Random(2024)
wires = []                             # every intermediate value, as a probe would see it

def sec_and(a, b):
    """ISW multiplication of two 2-share Boolean words: (a0^a1) & (b0^b1)."""
    (a0, a1), (b0, b1) = a, b
    r = rng.getrandbits(K)
    p00, p01, p10, p11 = a0 & b0, a0 & b1, a1 & b0, a1 & b1
    z0 = p00 ^ r
    z1 = p11 ^ ((r ^ p01) ^ p10)       # the random word goes in first
    wires.extend([p00, p01, p10, p11, z0, z1])
    return z0, z1

def xor(a, b):
    return a[0] ^ b[0], a[1] ^ b[1]

def sec_add(a, b):
    """Boolean-masked addition mod 2^14: the carry loop, with a masked AND inside."""
    for _ in range(K):
        carry = sec_and(a, b)
        a = xor(a, b)
        b = ((carry[0] << 1) & WORD, (carry[1] << 1) & WORD)
    return a

def const(c):                          # a public constant, as two shares (c, 0)
    return c & WORD, 0

def top_bit(a):                        # bit 13 of each share: a sharing of the sign bit
    return (a[0] >> 13) & 1, (a[1] >> 13) & 1

def spread(bit):                       # a shared bit to a shared all-0s/all-1s word
    return bit[0] * WORD, bit[1] * WORD

def masked_decode(a0, a1, fresh=True):
    """Arithmetic shares a0 + a1 = x (mod q) in; Boolean shares of round(2x/q) mod 2 out."""
    r0, r1 = (rng.getrandbits(K), rng.getrandbits(K)) if fresh else (0, 0)
    y = sec_add((a0 ^ r0, r0), (a1 ^ r1, r1))          # y = a0 + a1, between 0 and 2q - 2
    t = sec_add(y, const(-q))                           # t = y - q
    below = spread(top_bit(t))                          # all ones if y < q
    x = xor(t, sec_and(xor(y, t), below))               # x = y if y < q else y - q
    lo = top_bit(sec_add(x, const(-832)))               # 1 if x < 832
    hi = top_bit(sec_add(x, const(-2497)))              # 1 if x < 2497
    return sec_and((lo[0] ^ 1, lo[1]), hi)              # (not lo) and hi

def decode(x):                         # the unmasked rule: 1 if 832 <= x <= 2496
    return ((2 * x + 1665) // q) & 1

ok = True
for x in range(q):
    a0 = rng.randrange(q)
    m = masked_decode(a0, (x - a0) % q)
    ok = ok and (m[0] ^ m[1]) == decode(x)
print("masked decode right for all 3329 values:", ok)
```

It prints:

```text
masked decode right for all 3329 values: True
```

Correct is not the same as safe. The second listing plays the attacker in the simplest
probing model: it records every intermediate value ("wire"), takes its Hamming weight, the
usual first approximation of power, and asks whether any single wire's average differs
between a coefficient that decodes to 0 and one that decodes to 1. The statistic is Welch's
$t$; the conventional alarm level is $|t| > 4.5$
([Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md#1713-testing-for-leakage-tvla-and-the-t-test)).

```python
# Uses masked_decode() from the listing above.
def hw(v):
    return bin(v).count("1")

def traces(x, runs, fresh=True):       # Hamming weight of every wire, run after run
    out = []
    for _ in range(runs):
        wires.clear()
        a0 = rng.randrange(q)
        masked_decode(a0, (x - a0) % q, fresh)
        out.append([hw(w) for w in wires])
    return out

def welch_t(xs, ys):
    n, m = len(xs), len(ys)
    mx, my = sum(xs) / n, sum(ys) / m
    vx = sum((v - mx) ** 2 for v in xs) / (n - 1)
    vy = sum((v - my) ** 2 for v in ys) / (m - 1)
    if vx + vy == 0:                   # no noise at all: any difference is certain
        return 0.0 if mx == my else float("inf")
    return (mx - my) / (vx / n + vy / m) ** 0.5

def worst_t(fresh):                    # message bit 0 (x = 0) against bit 1 (x = 1664)
    A, B = traces(0, 2000, fresh), traces(1664, 2000, fresh)
    return max(abs(welch_t([t[i] for t in A], [t[i] for t in B])) for i in range(len(A[0])))

wires.clear(); masked_decode(5, 7)
print("masked ANDs per coefficient:", len(wires) // 6)
print("largest |t| over 348 wires: %.2f" % worst_t(True))
print("same, without the two fresh random words: %.2f" % worst_t(False))
```

It prints:

```text
masked ANDs per coefficient: 58
largest |t| over 348 wires: 2.87
same, without the two fresh random words: 17.72
```

With fresh randomness no wire crosses the alarm level (a largest $|t|$ near 3 over 348 wires
is what chance gives). Leave out the two random words that start the conversion, a mistake
that saves two calls to the generator, and some wires carry the secret: $|t|$ passes 17. A
real evaluation measures power on hardware and also checks pairs of wires, but the test has
the same shape.

The count is the other lesson: 58 masked ANDs, each with a random word, to decode **one
coefficient** that unmasked code handles with a multiplication and a shift. Real
implementations add public constants without a full adder, use conversions designed for a
prime modulus, and bitslice so that one machine word carries one bit of many coefficients.
Even so, the masked decoding and comparison dominate the cost: Bos and coauthors reported
first-order masked Kyber at a few times the cost of the unmasked code, growing quickly with
the order.

### The masked comparison, and what breaks masked code

The last non-linear step is the comparison $c' = c$, with $c'$ in shares and $c$ public.
Bhasin, D'Anvers, Heinz, Pöppelmann and Van Beirendonck (TCHES 2021) showed that several
published masked comparisons revealed, through the values they unmasked, which coefficients
of $c'$ matched $c$, enough to bring back the chosen-ciphertext attacks of Chapter 8, and
proposed comparisons whose unmasked values do not depend on where a mismatch lies.

Masking also does not stop attacks that use the whole trace. Deep-learning attacks train a
neural network on traces from a device the attacker controls, then read message bits from the
target. Ngo, Dubrova, Guo and Johansson broke a first-order masked Saber, another lattice KEM
of the competition, on a Cortex-M4 this way (TCHES 2021), and Dubrova, Ngo and Gärtner
recovered message bits from Kyber masked up to the fifth order (ePrint 2022/1713, presented
at Real World Crypto 2023), going after the short instruction sequence that encodes each
message bit into a coefficient. A masking order is a statement about a model; the device must
be tested against the attacker. Masked implementations now add shuffling and other hiding on
top.

### Masking ML-DSA

ML-DSA adds its own difficulty: rejection sampling means the number of signing attempts depends
on the secret and the randomness, and the check $\|z\|_\infty < \gamma_1 - \beta$ must be done
without leaking which coefficient failed. Implementations must treat the values from rejected
attempts as secret, since they reveal information about the key; §17.9 lists published
attacks that used exactly those values.

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

```text
secret recovered from two signatures: True
```

### Other faults on lattice schemes

The two-signature attack is the cleanest fault attack, not the only one. The published ones
fall into a few patterns:

- **Cut a loop short.** Espitau, Fouque, Gérard and Tibouchi (SAC 2016) stopped the loop that
  generates $y$ early, leaving most of it zero, so that $z = y + c s_1$ is almost $c s_1$; a
  few such signatures and lattice reduction give the key. Defense: check loop counters, or
  check $y$, before releasing anything computed from it.
- **Skip the rejection test.** Rejection (Chapter 9, §9.3) is what stops signatures leaking
  $s_1$. Azevedo-Oliveira, Calle Viera, Cogliati and Goubin ("Finding a polytope", PKC 2025)
  showed that enough signatures from a weakened rejection test give the key in under half an
  hour on a desktop computer, and that physically disabling one of the tests gives two
  practical fault attacks.
- **Use the KEM's own check as an oracle.** Pessl and Prokop (TCHES 2021) skipped a single
  instruction in the decoding step of Kyber's decapsulation. Whether the shared key still came
  out right told them whether the skipped instruction had mattered, which depends on a secret
  value: the re-encryption check became the oracle. About 6,500 faulted decapsulations
  recovered a Kyber512 key in simulation, and they carried out the attack with clock glitches
  on a Cortex-M4. Delvaux's "Roulette" (TCHES 2022) made such attacks cheaper and more
  tolerant, and broke a masked Kyber with a low-cost ChipWhisperer board: masking does
  nothing against an attacker who learns from whether the computation still works.
- **Flip bits from software.** Islam, Mus, Singh, Schaumont and Sunar (IEEE EuroS&P 2022) used
  Rowhammer, which flips DRAM bits from an unprivileged process, to corrupt the stored $s_1$
  of a constant-time Dilithium, and located each flip by correcting the faulty signature.
  They recovered 1,851 of the 3,072 bits of $s_1$ at round 3 level 2, cutting the classical
  lattice attack from about $2^{141}$ to $2^{89}$. Hedged signing does not help, and the attack
  works on shared cloud servers.

Two defenses recur. **Verify before release**: checking a signature with the public key
catches faults that produce a wrong signature, for the cost of one verification. **Check
stored keys**: a hash of the expanded key, or regenerating it from its seed, catches corrupted
key material before use. Neither stops a fault whose only effect is on timing or success,
which is why the KEM attacks above also need hardware countermeasures.

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

```text
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

### Implicit rejection in constant time

Chapter 8 wrote implicit rejection with `==` and `if`, right for reading and wrong for
shipping. A real decapsulation computes both candidate keys every time, compares $c$ and $c'$
by reading every byte, turns the result into an all-ones or all-zeros mask, and selects with
bit operations (Figure 17.4).

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="Constant-time implicit rejection: decrypt the ciphertext, hash the message to get K prime and r prime, re-encrypt to c prime; compute the OR of all byte differences between c and c prime and turn it into a mask; always compute the rejection key J of z and c; select the output key with AND and OR under the mask, with no branch" fill="currentColor" font-size="14">
<defs><marker id="ar174" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<g stroke="currentColor" fill="none" marker-end="url(#ar174)">
<line x1="130" y1="40" x2="158" y2="40"/>
<line x1="290" y1="40" x2="318" y2="40"/>
<line x1="460" y1="40" x2="488" y2="40"/>
<polyline points="555,60 555,86 200,86 200,108"/>
<line x1="75" y1="60" x2="75" y2="108"/>
<line x1="155" y1="166" x2="250" y2="212"/>
<line x1="485" y1="166" x2="390" y2="212"/>
<line x1="320" y1="270" x2="320" y2="296"/>
<line x1="320" y1="60" x2="320" y2="212"/>
</g>
<rect fill="none" stroke="currentColor" x="20" y="20" width="110" height="40" rx="5"/>
<g fill="currentColor" fill-opacity=".08" stroke="currentColor">
<rect x="160" y="20" width="130" height="40" rx="5"/>
<rect x="320" y="20" width="140" height="40" rx="5"/>
<rect x="490" y="20" width="130" height="40" rx="5"/>
<rect x="350" y="110" width="270" height="56" rx="5"/>
</g>
<rect fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="1.8" x="20" y="110" width="270" height="56" rx="5"/>
<rect fill="none" stroke="currentColor" stroke-width="1.8" x="120" y="214" width="400" height="56" rx="5"/>
<g text-anchor="middle">
<text x="75" y="45">ciphertext c</text>
<text x="225" y="45">m′ = Decrypt(c)</text>
<text x="390" y="45">(K′, r′) = G(m′‖h)</text>
<text x="555" y="45">c′ = Encrypt(m′; r′)</text>
<text x="155" y="133">diff = OR of (cᵢ ⊕ c′ᵢ), every byte</text>
<text x="485" y="133">K̄ = J(z ‖ c), always computed</text>
<text x="320" y="237">K = (K′ AND mask) OR (K̄ AND NOT mask)</text>
<text x="320" y="314">output K: a valid key, or a random-looking one</text>
</g>
<g text-anchor="middle" font-size="12" fill-opacity=".7">
<text x="155" y="153">mask = 0xFF if diff = 0, else 0x00</text>
<text x="485" y="153">z is the secret stored in dk</text>
<text x="320" y="257">no branch: the same instructions run for every c</text>
</g>
<text font-size="12" x="326" y="196">K′</text>
<g font-size="13">
<text x="20" y="342">An honest c gives K = K′. A forged c gives J(z ‖ c), which the attacker cannot predict;</text>
<text x="20" y="360">both take the same time, and no error code says which one happened.</text>
</g>
</svg>
<figcaption>Figure 17.4. Implicit rejection without a branch. Both candidate keys are computed every time; the comparison reads every byte; the choice between them is made with a mask. The same instructions run, in the same order, for an honest and a forged ciphertext.</figcaption>
</figure>

**Code it.** Three ways to compare a 1,088-byte ML-KEM-768 ciphertext with its
re-encryption: stop at the first difference, stop at a zero byte as C's `strcmp` does, or read
everything. The number of bytes read stands in for the time.

```python
import hashlib, random
rng = random.Random(203)

def J(z, c):                           # FIPS 203's rejection key: SHAKE256(z || c), 32 bytes
    return hashlib.shake_256(z + c).digest(32)

def early_exit_equal(a, b):            # returns (equal?, bytes examined)
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            return False, i + 1
    return True, len(a)

def strcmp_equal(a, b):                # C's strcmp: stops at the first zero byte
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            return False, i + 1
        if x == 0:
            return True, i + 1
    return True, len(a)

def ct_equal_mask(a, b):               # 0xFF if equal, 0x00 if not; always reads every byte
    diff = 0
    for x, y in zip(a, b):
        diff |= x ^ y
    return ((diff - 1) >> 8) & 0xFF, len(a)

def ct_select(mask, good, bad):        # good where mask = 0xFF, bad where mask = 0x00
    return bytes((g & mask) | (b & ~mask & 0xFF) for g, b in zip(good, bad))

c_prime = bytes(rng.randrange(1, 256) for _ in range(1088))     # the re-encryption, ML-KEM-768 size
for pos in (0, 500, 1087):
    c = bytearray(c_prime); c[pos] ^= 1                         # a forged ciphertext
    print("differs at byte %4d: early exit reads %4d, constant time reads %4d"
          % (pos, early_exit_equal(c, c_prime)[1], ct_equal_mask(c, c_prime)[1]))

c_prime = bytearray(c_prime); c_prime[10] = 0                  # a zero byte early on
c = bytearray(c_prime); c[700] ^= 1                             # forged after the zero
print("strcmp says equal:", strcmp_equal(c, c_prime)[0], "| constant time says equal:",
      ct_equal_mask(c, c_prime)[0] == 0xFF)

z = bytes(rng.getrandbits(8) for _ in range(32))
K_prime = bytes(rng.getrandbits(8) for _ in range(32))
K = ct_select(ct_equal_mask(c, c_prime)[0], K_prime, J(z, bytes(c)))
print("forged ciphertext gets the rejection key:", K == J(z, bytes(c)))
```

It prints:

```text
differs at byte    0: early exit reads    1, constant time reads 1088
differs at byte  500: early exit reads  501, constant time reads 1088
differs at byte 1087: early exit reads 1088, constant time reads 1088
strcmp says equal: True | constant time says equal: False
forged ciphertext gets the rejection key: True
```

The early exit tells a timing attacker where the first difference lies. The `strcmp` version
is not even correct: it stops at the first zero byte of the re-encryption, so a forgery that
agrees with $c'$ up to that byte is accepted and gets $K'$, a key derived from the decrypted
message, instead of the rejection key. The expression `((diff - 1) >> 8) & 0xFF` is a
branch-free "is diff zero?": $0 - 1$ is all ones, while 1 to 255 minus one has no bits from 8
up. C code does the same in unsigned 32-bit arithmetic behind a value barrier, the lesson of
clangover. Python promises none of this about its own execution, so the code models the
instructions and is not a safe implementation
([Engineering, Chapter 5](../engineering/05-Constant-Time-Programming.md#59-why-python-cannot-be-constant-time-and-what-it-is-still-for)).

### Seeds, tests and proofs

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

**Formal verification.** (§17.11 goes into what each proof covers.) The strongest
assurance available in 2026 is a machine-checked proof
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

## 17.9 Case files: ten years of breaks

*Level: intermediate.*

Laid side by side, as in Figure 17.5 and Table 17.1, the incidents show a pattern: every
family that reached the late rounds of the NIST process had implementation attacks, the
attacks moved from the lab bench to remote and software-only settings, and the
countermeasures of one year were the targets of the next.

<figure class="mars-fig">
<svg viewBox="0 0 640 404" width="640" role="img" aria-label="Timeline of post-quantum implementation attacks from 2016 to 2026: loop-abort faults, single-trace power, deterministic-signature faults, HQC timing, FALCON Down, Kyber skip faults, deep learning on masked Saber, Hertzbleed on SIKE, HQC and BIKE rejection-sampling timing, Rowhammer and Roulette, fifth-order masked Kyber, KyberSlash, clangover, the polytope fault on Dilithium and rejected-signature power analysis on ML-DSA" fill="currentColor" font-size="14">
<line stroke="currentColor" x1="80" y1="18" x2="80" y2="370" stroke-opacity=".5"/>
<g fill="currentColor">
<circle cx="80" cy="25" r="4.5"/>
<circle cx="80" cy="53" r="4.5"/>
<circle cx="80" cy="81" r="4.5"/>
<circle cx="80" cy="109" r="4.5"/>
<circle cx="80" cy="137" r="4.5"/>
<circle cx="80" cy="201" r="4.5"/>
<circle cx="80" cy="283" r="4.5"/>
<circle cx="80" cy="311" r="4.5"/>
<circle cx="80" cy="339" r="4.5"/>
<circle cx="80" cy="367" r="4.5"/>
</g>
<g font-weight="bold">
<text x="20" y="30">2016</text>
<text x="20" y="58">2017</text>
<text x="20" y="86">2018</text>
<text x="20" y="114">2019</text>
<text x="20" y="142">2021</text>
<text x="20" y="206">2022</text>
<text x="20" y="288">2023</text>
<text x="20" y="316">2024</text>
<text x="20" y="344">2025</text>
<text x="20" y="372">2026</text>
</g>
<g font-size="13">
<text x="96" y="30">Loop-abort faults on lattice signatures (Espitau and others)</text>
<text x="96" y="58">Single-trace power attack on lattice decryption (Primas, Pessl, Mangard)</text>
<text x="96" y="86">Two-signature fault attack on deterministic Dilithium (Bruinderink, Pessl)</text>
<text x="96" y="114">HQC decoder timing (Paiva, Terada; Wafo-Tapa and others)</text>
<text x="96" y="142">FALCON Down: EM attack on Falcon signing</text>
<text x="96" y="160">One skipped instruction breaks Kyber decapsulation (Pessl, Prokop)</text>
<text x="96" y="178">Deep learning beats a masked Saber; masked comparisons leak</text>
<text x="96" y="206">Hertzbleed: SIKE keys from CPU frequency, remotely</text>
<text x="96" y="224">HQC and BIKE: timing of rejection sampling</text>
<text x="96" y="242">Rowhammer on Dilithium; Roulette faults on masked Kyber</text>
<text x="96" y="260">Fifth-order masked Kyber broken by deep learning</text>
<text x="96" y="288">KyberSlash1 and 2 found, reference code patched (Nov - Dec)</text>
<text x="96" y="316">Clangover: Clang turns Kyber's mask into a branch (June)</text>
<text x="96" y="344">Polytope fault attack on Dilithium's rejection check (PKC)</text>
<text x="96" y="372">ML-DSA keys from ~300 power traces of rejected attempts (DATE)</text>
</g>
</svg>
<figcaption>Figure 17.5. A decade of post-quantum implementation breaks, by year of publication. The early ones needed a probe on the chip; by 2022 some needed only a network connection or an unprivileged process.</figcaption>
</figure>

| year | target | channel | what it took | source |
|---|---|---|---|---|
| 2021 | Falcon signing | electromagnetic | "FALCON Down": key from EM traces of the floating-point multiplications | Karabulut and Aysu, DAC 2021 |
| 2022 | SIKE, constant-time code | remote timing through CPU frequency | full key in 36 hours (Cloudflare CIRCL) and 89 hours (Microsoft PQCrypto-SIDH), unoptimized | Wang and others, USENIX Security 2022 |
| 2022 | HQC and BIKE decapsulation | timing of rejection sampling | about 866,000 idealized timing queries for HQC-128 | Guo and others, TCHES 2022 |
| 2022 | Dilithium (round 3) | Rowhammer from software | 1,851 of 3,072 secret bits | Islam and others, EuroS&P 2022 |
| 2023 | ML-KEM reference code | division timing | key in minutes (KyberSlash2) to hours (KyberSlash1) | Bernstein and others, TCHES 2025 |
| 2024 | ML-KEM compiled by Clang 15-18 | a branch the compiler added | ML-KEM-512 key in 5 to 10 minutes | Purnal, CVE-2024-37880 |
| 2026 | ML-DSA, hedged signing | power, including rejected attempts | key from about 300 traces on a Cortex-M4 | Zhao and others, IEEE DATE 2026 |

*Table 17.1. A selection of the incidents of Figure 17.5, with the resources each needed, as
reported by the authors.*

**Hertzbleed: constant time is not constant time.** SIKE's implementations were carefully
constant-time: same instructions, same addresses, whatever the key. But modern Intel and AMD
processors change their clock frequency with the power they draw, and the power depends on
the data. Wang, Paccagnella, He, Shacham, Fletcher and Kohlbrenner found SIKE ciphertexts
that, for one guessed key bit, drove the computation into long runs of zero values (low power,
higher clock) or of random values, amplifying one bit into a difference measurable over a
network. Disabling frequency boost stops the leak at a large cost; Cloudflare and Microsoft
deployed software mitigations instead, at a decapsulation cost the authors put at about 5 and
11 percent. SIKE was broken mathematically six weeks later (Chapter 16), but the lesson
stands: a constant-time guarantee is about cycles, and a processor whose cycles change length
is outside the model.

!!! note "Life story: Hertzbleed"
    **Born:** made public 14 June 2022; paper by Yingchen Wang, Riccardo Paccagnella,
    Elizabeth Tang He, Hovav Shacham, Christopher Fletcher and David Kohlbrenner, USENIX
    Security 2022 · **Purpose:** turn power side channels into remote timing channels through
    dynamic voltage and frequency scaling, and extract SIKE keys from constant-time code ·
    **Helped:** CVE-2022-23823 and CVE-2022-24436; mitigations in CIRCL and PQCrypto-SIDH; a
    follow-up (IEEE S&P 2023) showing the effect beyond cryptography · **Status (Nov 2026):**
    SIKE is gone; frequency scaling is not, and any code whose power depends strongly on
    secrets can leak this way.

**Rejection sampling as a channel.** Two entries come from rejection sampling, which repeats
a step until a random value passes a test. In HQC and BIKE the sampler that makes a sparse
error vector during re-encryption took variable time, and its seed comes from the decrypted
message; Guo, Hlauschek, Johansson, Lahr, Nilsson and Schröder ("Don't Reject This", TCHES
2022) used that timing as an oracle about the decrypted message and recovered keys, in the
style of the failure attacks of Chapter 14. In ML-DSA every rejected signing attempt computes
values from the key before discarding them. Zhao, Cheng, Qiao, Liu and Zhou ("Rejection
Matters", IEEE DATE 2026) report key recovery from about 300 power traces of ML-DSA-44 on a
Cortex-M4 using rejected attempts too, and note that hedging does not help, since the attack
targets values computed from the key and a challenge recovered from the traces. FIPS 204
requires that sensitive intermediate values be destroyed when no longer needed; for a
rejected attempt they must also be computed without leaking.

Falcon's attacks all aimed at the floating-point Gaussian sampler (Chapter 10, §10.9), a
problem FN-DSA, the coming FIPS 206 (no public draft as of November 2026), inherits. What the
list does not show is as telling: no attack in it breaks the mathematics of ML-KEM or ML-DSA.
Every one used the gap between the specification and a piece of code on a processor, and every
one was fixed in code.

## 17.10 Testing post-quantum code

*Level: intermediate.*

Post-quantum code has more branches that random inputs almost never reach than classical
code, because of rejection sampling, variable-length XOF reads and many input checks, so its
tests come in layers, each catching what the one below misses (Figure 17.6). The general
practice of vectors, Wycheproof and differential fuzzing is in
[Engineering, Chapter 17](../engineering/17-Choosing-Testing-and-Verifying.md); this section
covers what is particular to ML-KEM and ML-DSA.

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="A test pyramid for post-quantum code: at the base, known-answer tests from NIST KAT files and ACVP vectors; above, edge-case vectors from CCTV and Wycheproof; above, accumulated hashes of many tests and differential fuzzing; above, constant-time checks on the binary; at the top, machine-checked proofs" fill="currentColor" font-size="14">
<g stroke="currentColor" fill="none">
<line x1="40" y1="330" x2="40" y2="40"/>
<polyline points="34,50 40,38 46,50"/>
<line x1="600" y1="40" x2="600" y2="330"/>
<polyline points="594,320 600,332 606,320"/>
</g>
<polygon fill="currentColor" fill-opacity=".30" stroke="currentColor" points="250,24 390,24 420,84 220,84"/>
<polygon fill="currentColor" fill-opacity=".22" stroke="currentColor" points="218,88 422,88 452,148 188,148"/>
<polygon fill="currentColor" fill-opacity=".15" stroke="currentColor" points="186,152 454,152 484,212 156,212"/>
<polygon fill="currentColor" fill-opacity=".09" stroke="currentColor" points="154,216 486,216 516,276 124,276"/>
<polygon fill="currentColor" fill-opacity=".04" stroke="currentColor" points="122,280 518,280 548,340 92,340"/>
<g text-anchor="middle" font-weight="bold">
<text x="320" y="50">proofs</text>
<text x="320" y="114">constant time on the binary</text>
<text x="320" y="178">accumulated, differential, fuzzing</text>
<text x="320" y="242">edge cases</text>
<text x="320" y="306">known answers</text>
</g>
<g text-anchor="middle" font-size="12">
<text x="320" y="70">CBMC, HOL Light, F*, EasyCrypt</text>
<text x="320" y="134">Valgrind and TIMECOP, dudect, per compiler</text>
<text x="320" y="198">10,000 and 1,000,000-test hashes, Cryptofuzz</text>
<text x="320" y="262">CCTV modulus, unlucky, strcmp; Wycheproof</text>
<text x="320" y="326">NIST KAT files, ACVP JSON vectors, every build</text>
</g>
<text font-size="13" x="20" y="362">up: stronger claims, fewer and costlier</text>
<text font-size="13" text-anchor="end" x="620" y="362">down: cheaper, run on every change</text>
</svg>
<figcaption>Figure 17.6. Layers of testing for a post-quantum implementation. The lower layers are cheap and run on every change; the upper ones make stronger claims and cost more. No layer replaces another: proofs say nothing about a parameter set nobody verified, and vectors say nothing about timing.</figcaption>
</figure>

**Known answers.** Every competition submission shipped `.rsp` known-answer files, made by
driving the algorithm's random calls from a deterministic AES-256 counter-mode generator. They
pin down round 3 Kyber and Dilithium, not FIPS 203 and 204 (Chapter 8, §8.11). For the
standards the reference is NIST's ACVP server. Its ML-KEM files cover key generation from the
seeds $d$ and $z$, encapsulation from a given $m$, decapsulation of valid and invalid
ciphertexts and, in later revisions, the key checks of FIPS 203 Section 7; its ML-DSA files
cover key generation, deterministic and hedged signing with and without contexts and
pre-hashing, and verification of good and bad signatures. FIPS 140-3 validation requires them.

**Edge cases.** In December 2023 Filippo Valsorda published the ML-KEM vectors of the C2SP
Community Cryptography Test Vectors (CCTV), aimed at the rare paths:

- **modulus**: encapsulation keys with one coefficient between $q = 3329$ and $4095$, at every
  position, each of which the modulus check of FIPS 203 must reject;
- **unlucky**: seeds for which SampleNTT must read more than 575 bytes of SHAKE128, by chance
  about once in $2^{38}$;
- **strcmp**: ciphertexts whose re-encryption has an early zero byte, so that a
  `strcmp`-style comparison accepts a forgery (§17.8); by chance about once in $2^{16}$;
- **accumulated**: the outputs of 10,000 (or 1,000,000) generated tests hashed into one
  value, reaching randomly reachable edge cases without hundreds of megabytes of files.

Project Wycheproof, now maintained under C2SP, added ML-KEM and ML-DSA files with malformed
keys, signatures and contexts; libraries such as Go's and OpenBSD's run them.

**Code it.** The modulus check against malformed encapsulation keys, and the size of an
exhaustive negative test for ML-KEM-768.

```python
import hashlib, math, random
q = 3329
rng = random.Random(7)

def byte_encode12(f):                  # 256 coefficients of 12 bits into 384 bytes
    bits = 0
    for i, a in enumerate(f):
        bits |= a << (12 * i)
    return bits.to_bytes(384, "little")

def byte_decode12(b):                  # FIPS 203's ByteDecode_12 reduces modulo q
    bits = int.from_bytes(b, "little")
    return [((bits >> (12 * i)) & 0xFFF) % q for i in range(256)]

def modulus_check(ek, k):              # FIPS 203, Section 7.2: decode, re-encode, compare
    t = ek[:384 * k]
    return all(byte_encode12(byte_decode12(t[384 * i:384 * i + 384])) == t[384 * i:384 * i + 384]
               for i in range(k))

k = 3                                  # ML-KEM-768
coeffs = [rng.randrange(q) for _ in range(256 * k)]
def make_ek(cs):
    return b"".join(byte_encode12(cs[256 * i:256 * i + 256]) for i in range(k)) + bytes(32)

print("honest key passes:", modulus_check(make_ek(coeffs), k))
for bad in (3329, 4095):
    cs = coeffs[:]; cs[700] = bad
    print("coefficient 700 set to", bad, "passes:", modulus_check(make_ek(cs), k))
print("keys in an exhaustive negative test:", (4096 - q) * 256 * k)
```

It prints:

```text
honest key passes: True
coefficient 700 set to 3329 passes: False
coefficient 700 set to 4095 passes: False
keys in an exhaustive negative test: 589056
```

ByteDecode$_{12}$ reduces each 12-bit value modulo $q$, so re-encoding changes the bytes of any
coefficient that was not reduced. There are $767 \times 768 = 589{,}056$ single bad
coefficients for an ML-KEM-768 key, which is why the CCTV files share most of their content.

**Code it.** Why unlucky vectors are needed: how many XOF bytes SampleNTT reads for one entry
of $\hat{\mathbf{A}}$, over random seeds, and the exact chance of needing more.

```python
import hashlib, math, random
q = 3329
rng = random.Random(7)

def sample_ntt_bytes(seed):            # how many XOF bytes SampleNTT reads for one entry of A
    stream = hashlib.shake_128(seed).digest(168 * 8)
    count, pos = 0, 0
    while count < 256:
        b0, b1, b2 = stream[pos:pos + 3]
        pos += 3
        d1, d2 = b0 + 256 * (b1 % 16), b1 // 16 + 16 * b2
        if d1 < q:
            count += 1
        if d2 < q and count < 256:
            count += 1
    return pos

reads = [sample_ntt_bytes(bytes(rng.getrandbits(8) for _ in range(32)) + bytes([0, 0]))
         for _ in range(20000)]
print("most bytes read in 20,000 tries:", max(reads))
print("tries that needed a 4th block (over 504 bytes):", sum(r > 504 for r in reads))

def tail(nbytes):                      # P(fewer than 256 accepted in the first nbytes)
    n, p = 2 * (nbytes // 3), q / 4096
    return sum(math.comb(n, i) * p**i * (1 - p)**(n - i) for i in range(256))
for nbytes in (504, 576, 704):
    print("P(more than %d bytes) = 2^%.1f" % (nbytes, math.log2(tail(nbytes))))
```

It prints:

```text
most bytes read in 20,000 tries: 528
tries that needed a 4th block (over 504 bytes): 148
P(more than 504 bytes) = 2^-6.9
P(more than 576 bytes) = 2^-38.1
P(more than 704 bytes) = 2^-130.1
```

Each three bytes give two 12-bit candidates, each accepted with probability $3329/4096
\approx 0.81$, and 256 must be accepted. Three SHAKE128 blocks (504 bytes) almost always
suffice, but about one matrix entry in 120 needs a fourth, so code that reads exactly three
blocks gets about one ML-KEM-768 key generation in fourteen wrong (the matrix has nine
entries), and ordinary tests catch it at once. The dangerous bugs live further out: code that
mishandles a fifth block (more than 672 bytes) fails too rarely for any random test to find,
yet an attacker can search for a seed that triggers it, because the matrix seed is in the
public key. The unlucky vectors are such seeds, found by brute force. CCTV's notes add that
code reading a fixed number of bytes needs at least 704 for a negligible failure rate, which
the last line confirms.

## 17.11 Verified implementations, in more depth

*Level: expert.*

"Formally verified" is a family of different claims, and a buyer needs to know which one is
on offer.

| project | language | what is proved | with what | where it runs (as of November 2026) |
|---|---|---|---|---|
| libcrux (Cryspen) | Rust, extracted to C | ML-KEM: functional correctness against an executable specification, panic freedom, secret independence; ML-DSA implemented too (check the state of its proofs) | hax, F* | Firefox's NSS (ML-KEM vendored from libcrux), OpenSSH's ML-KEM, Signal, among others listed by Cryspen |
| mlkem-native (PQ Code Package) | C and assembly | C: memory and type safety; AArch64 and x86-64 assembly: functional correctness, memory safety, constant time | CBMC; HOL Light with s2n-bignum | AWS-LC (in its FIPS validation cycle), liboqs (default ML-KEM since 2025) |
| Formosa libjade / Jasmin (Episode IV and V) | Jasmin, compiled to assembly | ML-KEM-768: functional equivalence to the specification and constant time; IND-CCA security and correctness of ML-KEM itself | Jasmin compiler, EasyCrypt | research and libjade |

*Table 17.2. Three lines of verification work on ML-KEM and what each proves. Each project's
claims are stated precisely, with their assumptions, in its own documentation.*

**Three questions to ask of a proof.** First, *of what*: the C source, the assembly, or the
binary? A proof about C trusts the compiler, which clangover shows is a real assumption; a
proof about assembly removes the compiler but must model the processor. Second, *against
what*: a specification the verifiers wrote, or a security theorem? libcrux proves its Rust
equivalent to an executable specification written in hax; the Formosa project proves in
EasyCrypt that ML-KEM as specified is IND-CCA secure under Module-LWE, with concrete bounds,
and that two Jasmin implementations of ML-KEM-768 are equivalent to it ("Formally Verifying
Kyber Episode V", CRYPTO 2024), a chain from assembly to a security theorem. Third, *in which
leakage model*: constant-time proofs assume that branches, memory addresses and a list of
variable-time instructions are the only leaks. None covers power, faults or Hertzbleed.

**How the tools differ.** CBMC, a bounded model checker for C, explores every path up to a
bound and proves the absence of out-of-bounds accesses and undefined overflow, plus stated
pre- and postconditions such as coefficient bounds; it is automatic but limited in arithmetic.
HOL Light is an interactive prover: a person writes the proof and the machine checks every
step, which is how mlkem-native's assembly (for example the NTT and its inverse) is proved to
compute what it claims for all inputs. hax translates Rust into F*, and a further tool,
Eurydice, extracts the C used by OpenSSH and NSS. Jasmin is a language close to assembly,
built for verified cryptographic code, whose compiler is proved in Coq to preserve meaning.

**Where the reference code went.** PQClean, which turned the competition's reference code
into portable C and from which pqm4, liboqs and several Rust crates took their code, announced
its retirement on 9 January 2026 and planned to make its repository read-only in July 2026,
pointing users to the PQ Code Package; in June 2026 the Rust security advisory database marked
the `pqcrypto` crates built on it as unmaintained. New projects should start from the
maintained, verified implementations above.

**What verification found.** Proof work also finds bugs: KyberSlash1 was found by the team
building libcrux (§17.3), and proofs of coefficient bounds turn every "this can't overflow"
comment into a checked fact. The cost is time: each verified algorithm is many person-years,
and each new parameter set, platform or optimization must be proved again.

## 17.12 Small devices: cycles, stack and code size

*Level: intermediate.*

Most physical attacks in this chapter were shown on one chip family, the Arm Cortex-M4: cheap,
everywhere (meters, door controllers, car modules, hardware wallets), and the platform of the
pqm4 project, which collects and benchmarks post-quantum code for it. The same chips set the
limits on what an implementation can afford, in time and above all in memory.

| operation (pqm4) | implementation | average cycles | peak stack (bytes) |
|---|---|---|---|
| ML-KEM-768 decapsulation | clean (portable C) | 1,387,984 | 14,480 |
| ML-KEM-768 decapsulation | m4fspeed | 707,827 | 6,452 |
| ML-KEM-768 decapsulation | m4fstack | 714,194 | 2,844 |
| ML-DSA-65 signing | clean | 12,359,056 | 79,624 |
| ML-DSA-65 signing | m4f | 6,193,171 | 68,872 |
| ML-DSA-65 signing | m4fstack | 24,421,526 | 6,616 |
| ML-DSA-65 verification | m4f | 2,415,944 | 9,888 |
| SPHINCS+-SHA2-128s signing | clean | 7,657,558,168 | 2,556 |
| SPHINCS+-SHA2-128s verification | clean | 7,471,794 | 1,968 |
| HQC-128 decapsulation | clean | 159,569,179 | 55,892 |

*Table 17.3. Selected pqm4 benchmarks on a Cortex-M4, from the project's published tables as
of November 2026. The SPHINCS+ set is the one that became SLH-DSA-SHA2-128s. Cycle counts do
not depend on the clock; divide by the clock rate for time.*

<figure class="mars-fig">
<svg viewBox="0 0 640 418" width="640" role="img" aria-label="Bar charts of pqm4 results: peak stack for ML-KEM-768 decapsulation is 14,480 bytes for clean, 6,452 for m4fspeed and 2,844 for m4fstack; for ML-DSA-65 signing 79,624, 68,872 and 6,616. Average cycles for ML-KEM-768 decapsulation are 1.39, 0.71 and 0.71 million; for ML-DSA-65 signing 12.36, 6.19 and 24.42 million" fill="currentColor" font-size="14">
<g fill="currentColor" fill-opacity=".35">
<rect x="170" y="55" width="68.8" height="14" rx="2"/>
<rect x="170" y="74" width="30.6" height="14" rx="2"/>
<rect x="170" y="93" width="13.5" height="14" rx="2"/>
<rect x="170" y="136" width="378.2" height="14" rx="2"/>
<rect x="170" y="155" width="327.1" height="14" rx="2"/>
<rect x="170" y="174" width="31.4" height="14" rx="2"/>
<rect x="170" y="253" width="21.1" height="14" rx="2"/>
<rect x="170" y="272" width="10.8" height="14" rx="2"/>
<rect x="170" y="291" width="10.9" height="14" rx="2"/>
<rect x="170" y="334" width="187.9" height="14" rx="2"/>
<rect x="170" y="353" width="94.1" height="14" rx="2"/>
<rect x="170" y="372" width="371.2" height="14" rx="2"/>
</g>
<g stroke="currentColor">
<line x1="170" y1="52" x2="170" y2="192"/>
<line x1="170" y1="250" x2="170" y2="390"/>
</g>
<g font-weight="bold">
<text x="20" y="22">Peak stack (bytes)</text>
<text x="20" y="220">Average cycles (millions)</text>
</g>
<g font-size="12" fill-opacity=".7">
<text x="20" y="48">ML-KEM-768 decaps</text>
<text x="20" y="129">ML-DSA-65 sign</text>
<text x="20" y="246">ML-KEM-768 decaps</text>
<text x="20" y="327">ML-DSA-65 sign</text>
<text x="20" y="404">pqm4 benchmark tables (Arm Cortex-M4), as of November 2026. ML-DSA signing time varies run to run.</text>
</g>
<g font-size="12" text-anchor="end">
<text x="160" y="66">clean</text>
<text x="160" y="85">m4fspeed</text>
<text x="160" y="104">m4fstack</text>
<text x="160" y="147">clean</text>
<text x="160" y="166">m4f</text>
<text x="160" y="185">m4fstack</text>
<text x="160" y="264">clean</text>
<text x="160" y="283">m4fspeed</text>
<text x="160" y="302">m4fstack</text>
<text x="160" y="345">clean</text>
<text x="160" y="364">m4f</text>
<text x="160" y="383">m4fstack</text>
</g>
<g font-size="12">
<text x="244.8" y="66">14,480</text>
<text x="206.6" y="85">6,452</text>
<text x="189.5" y="104">2,844</text>
<text x="554.2" y="147">79,624</text>
<text x="503.1" y="166">68,872</text>
<text x="207.4" y="185">6,616</text>
<text x="197.1" y="264">1.39</text>
<text x="186.8" y="283">0.71</text>
<text x="186.9" y="302">0.71</text>
<text x="363.9" y="345">12.36</text>
<text x="270.1" y="364">6.19</text>
<text x="547.2" y="383">24.42</text>
</g>
</svg>
<figcaption>Figure 17.7. The memory and time trade-off on a Cortex-M4. For ML-KEM the stack-optimized code costs almost nothing in speed; for ML-DSA signing it saves 62 KB of stack and costs four times the time, because it recomputes the large matrix and vectors instead of storing them.</figcaption>
</figure>

**By hand: what a door controller can afford.** Take a Cortex-M4 at 100 MHz, so a million
cycles is 10 milliseconds.

- ML-KEM-768 decapsulation (m4fspeed): $707{,}827 / 10^8 \approx 7.1$ ms.
- ML-DSA-65 verification (m4f): $2{,}415{,}944 / 10^8 \approx 24$ ms. Checking a signed
  command or firmware image is cheap.
- ML-DSA-65 signing (m4f): about 62 ms *on average*, but pqm4's 1,000 runs range from
  2,918,295 cycles (29 ms) to 26,008,621 (260 ms): the rejection loop of Chapter 9 makes
  signing time random. FIPS 204 gives an expected 5.1 attempts for ML-DSA-65 (observed rates
  are slightly higher, since that figure leaves out one check). With an acceptance chance
  near $1/5.1 \approx 0.2$, needing more than 20 attempts has probability about
  $0.8^{20} \approx 0.012$, one signature in 80. A controller with a deadline budgets for the
  tail, not the mean.
- SLH-DSA-SHA2-128s: signing $7.66 \times 10^9 / 10^8 \approx 77$ seconds, out of the question;
  verification 75 ms in under 2 KB of stack, which is why hash-based signatures suit firmware a
  chip only has to check.

**Memory is the harder limit.** Many microcontrollers have 64 KB of RAM or less, shared with
the application. Clean ML-DSA-65 signing needs 79,624 bytes of stack and cannot run there; the
m4fstack version needs 6,616 by generating $\hat{\mathbf{A}}$ and the vectors piece by piece
from their seeds, and pays in time (Figure 17.7). ML-KEM is easier: every parameter set decapsulates in
under 3.4 KB of stack in its stack-optimized version, with about 13 to 16 KB of code. Keccak
dominates: in pqm4's profile about 70 percent of an optimized ML-KEM-768 decapsulation is
hashing, so a SHA-3 accelerator gains more than further work on the arithmetic. And all these
figures are unprotected: masking multiplies the cost of the non-linear parts several times
(§17.5), needs a fast generator for fresh masks, and doubles the memory for every secret.
Storing an ML-KEM key as its 64-byte seed rather than its 2,400 expanded bytes helps both
memory and fault checking.

**Mars: updates that cannot wait for Earth.** Arcadia City's airlock and pressure-door
controllers are Cortex-M4-class chips, and part of their firmware comes from vendors on Earth.
With a one-way light delay of 3 to 22 minutes, a controller that asked an Earth server whether
a vendor's key had been revoked would wait 6 to 44 minutes, and during solar conjunction about
two weeks. So controllers do not trust vendors directly. The city's build system tests each
vendor image (ACVP vectors, the constant-time checks of this chapter), then signs it with the
city's own ML-DSA-65 key, held in a hardware security module in the city. A controller
verifies one signature against one public key fixed at installation: 24 ms, about 10 KB of
stack, no network. Its own signing is limited to status messages, with the protections of
§17.13, and its session keys come from a masked ML-KEM-768. The cosmic-ray faults of the
Martian surface
([Engineering, Chapter 7](../engineering/07-Masking-and-Fault-Resistance.md#712-mars-radiation-as-a-fault-injector))
add one rule: every key is stored as a seed with a hash, and checked before use.

## 17.13 In the real world: choosing a library

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
| liboqs (Open Quantum Safe) | C | standards plus many candidates | for prototyping and research; ML-KEM from mlkem-native |
| mlkem-native, mldsa-native (PQ Code Package) | C, assembly | ML-KEM; ML-DSA | proofs with CBMC and HOL Light (§17.11); meant to be embedded in other libraries |
| libcrux (Cryspen) | Rust, extracted C | ML-KEM, ML-DSA | verified with hax and F*; its ML-KEM is in NSS and OpenSSH |
| PQClean | C | many | retired in 2026; read-only, no fixes |

*Table 17.4. Some widely used libraries with post-quantum support. Versions and features move
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

## 17.14 Going deeper

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
- **Masked code against strong attackers.** Bhasin and others on masked comparisons (TCHES
  2021) and Dubrova, Ngo and Gärtner on fifth-order masked Kyber (ePrint 2022/1713): "masked
  to order $d$" is a claim about a model, to be tested against attackers using whole traces.
- **Beyond constant time.** Hertzbleed (USENIX Security 2022) and its follow-up (IEEE S&P
  2023); an open question is how proofs should model processors whose speed depends on data.
- **Machine-checked security.** Almeida and others, "Formally Verifying Kyber Episode V"
  (CRYPTO 2024), from verified code to a verified security theorem; the pqm4 tables
  (github.com/mupq/pqm4) for what all this costs on a Cortex-M4.

## Check yourself

??? question "1. Name three things a secret must not influence in constant-time code."

    The instructions executed (branches), the memory addresses accessed, and the operands of
    instructions whose timing depends on their values, such as division on many processors.

??? question "2. What was KyberSlash, and how was it fixed?"

    Divisions by $q$ on secret-dependent values in ML-KEM decryption and compression, whose
    timing leaked the key on processors with variable-time division. The fix replaced each
    division by a multiplication by a constant and a shift, checked on all 3,329 inputs.

??? question "3. What did clangover show?"

    That Clang (versions 15 to 18 on x86, with common flags) compiled ML-KEM's branch-free mask
    in poly_frommsg back into a secret-dependent branch, which leaked an ML-KEM-512 key in
    minutes through decapsulation timing. Constant time must be checked on the binary.

??? question "4. A timing difference is 30 cycles and the noise on one measurement is 40 cycles. Roughly how many measurements per case does an attacker need for a 4-standard-error margin?"

    $n \ge 2(z\sigma/\delta)^2 = 2(4 \cdot 40/30)^2 \approx 57$. With network jitter of 60,000
    cycles the same formula gives about 128 million, which is large but not out of reach.

??? question "5. What is masking, and which parts of ML-KEM are hard to mask?"

    Splitting each secret into random shares and computing on them separately. Linear parts
    (NTT, additions, multiplication by public values) are easy; non-linear parts (compression,
    decoding, the FO comparison, sampling, hashing) need gadgets that convert between
    arithmetic and Boolean shares.

??? question "6. The value w = 500 is shared as 1000 + 2829 mod 3329. Why can't each share be decoded to a bit separately?"

    Decoding is not linear. The share 1000 decodes to 1 and 2829 to 0, and their XOR is 1,
    but 500 decodes to 0. A masked decoder has to convert the shares and compare on Boolean
    shares without ever forming 500; the toy needed 58 masked ANDs for one coefficient.

??? question "7. Why does a fault on deterministic signing reveal the key, and what does hedged signing change?"

    Both signatures share the same $y$, so the difference of the two responses is $(c_1 - c_2)
    s_1$, with $c_1 - c_2$ public; solving for $s_1$ is linear algebra. FIPS 204's hedged
    signing mixes 32 fresh random bytes into $y$, so the two signatures share nothing, and if
    the generator fails, signing falls back to the deterministic variant.

??? question "8. Implicit rejection hides whether a ciphertext was valid. Why did it not protect against KyberSlash1?"

    The division sits in decoding, before the re-encryption check, and its time depends on the
    size of each decrypted coefficient, not only on the message bit. Crafted ciphertexts that
    all decrypt to the same message (so the protocol behaves identically) still give different
    division times for different secret coefficients.

??? question "9. What do the CCTV strcmp and unlucky vectors catch, and why would random tests miss them?"

    strcmp vectors catch a comparison that stops at a zero byte and so accepts a forged
    ciphertext; it occurs by chance about once in $2^{16}$. Unlucky vectors make SampleNTT read
    more than 575 bytes of SHAKE128, which happens by chance about once in $2^{38}$; an
    attacker can search for such seeds, because the matrix seed is in the public key.

??? question "10. On a Cortex-M4, pqm4's clean ML-DSA-65 signing needs 79,624 bytes of stack and the m4fstack version 6,616. What is traded, and when is it worth it?"

    The stack-optimized code regenerates the matrix and vectors from their seeds as it goes
    instead of storing them, and signs about four times slower than the speed-optimized m4f
    version (24.4 against 6.2 million cycles on average). It is worth it on chips with 64 KB of
    RAM or less, where the other versions cannot run at all.

## What you learned

- Post-quantum code has already leaked keys through timing (KyberSlash, clangover), and the
  leaks came from a processor and a compiler, not from the source code's intent.
- Constant-time must be checked on the binary; masking is needed where attackers hold the
  device.
- Deterministic lattice signing falls to a single fault; hedged signing, the FIPS 204 default,
  stops the simplest attacks.
- Oracles, decryption failures and missing input checks turn implementation slips into
  chosen-ciphertext attacks.
- A few cycles of difference are found by averaging; the attacker chooses how many
  measurements to take.
- KyberSlash's division leaked more than the message bit, so implicit rejection did not hide
  it: every value derived from the key is secret.
- A first-order masked decoder needs dozens of masked ANDs per coefficient and passes a
  leakage test only with its fresh randomness; masked code still fell to deep learning and
  faults.
- Implicit rejection computes both keys, compares every byte and selects with a mask.
- Every leading family had implementation breaks, some remote or software-only; none broke
  the mathematics of ML-KEM or ML-DSA.
- Test in layers (ACVP, CCTV and Wycheproof edge cases, constant-time checks, proofs), and
  budget for stack as well as cycles on small chips.
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
- Thomas Espitau, Pierre-Alain Fouque, Benoît Gérard and Mehdi Tibouchi, "Loop-Abort Faults on
  Lattice-Based Fiat-Shamir and Hash-and-Sign Signatures" (SAC 2016).
- Robert Primas, Peter Pessl and Stefan Mangard, "Single-Trace Side-Channel Attacks on Masked
  Lattice-Based Encryption" (CHES 2017).
- Peter Pessl and Lukas Prokop, "Fault Attacks on CCA-secure Lattice KEMs" (TCHES 2021).
- Shivam Bhasin, Jan-Pieter D'Anvers, Daniel Heinz, Thomas Pöppelmann and Michiel Van
  Beirendonck, "Attacking and Defending Masked Polynomial Comparison for Lattice-Based
  Cryptography" (TCHES 2021).
- Kalle Ngo, Elena Dubrova, Qian Guo and Thomas Johansson, "A Side-Channel Attack on a Masked
  IND-CCA Secure Saber KEM Implementation" (TCHES 2021).
- Yingchen Wang, Riccardo Paccagnella, Elizabeth Tang He, Hovav Shacham, Christopher W.
  Fletcher and David Kohlbrenner, "Hertzbleed: Turning Power Side-Channel Attacks Into Remote
  Timing Attacks on x86" (USENIX Security 2022).
- Qian Guo, Clemens Hlauschek, Thomas Johansson, Norman Lahr, Alexander Nilsson and Robin Leander
  Schröder, "Don't Reject This: Key-Recovery Timing Attacks Due to Rejection-Sampling in HQC
  and BIKE" (TCHES 2022).
- Jeroen Delvaux, "Roulette: A Diverse Family of Feasible Fault Attacks on Masked Kyber"
  (TCHES 2022).
- Saad Islam, Koksal Mus, Richa Singh, Patrick Schaumont and Berk Sunar, "Signature Correction
  Attack on Dilithium Signature Scheme" (IEEE EuroS&P 2022).
- Elena Dubrova, Kalle Ngo and Joel Gärtner, "Breaking a Fifth-Order Masked Implementation of
  CRYSTALS-Kyber by Copy-Paste" (ePrint 2022/1713; Real World Crypto 2023).
- José Bacelar Almeida and others, "Formally Verifying Kyber Episode V: Machine-Checked IND-CCA
  Security and Correctness of ML-KEM in EasyCrypt" (CRYPTO 2024; ePrint 2024/843).
- Paco Azevedo-Oliveira, Andersson Calle Viera, Benoît Cogliati and Louis Goubin, "Finding a
  polytope: A practical fault attack against Dilithium" (PKC 2025; ePrint 2025/195).
- Yuhan Zhao, Wei Cheng, Zehua Qiao, Yuejun Liu and Yongbin Zhou, "Rejection Matters: Efficient
  Non-Profiling Side-Channel Attack on ML-DSA via Exploiting Public Templates" (IEEE DATE 2026;
  ePrint 2026/056).
- Filippo Valsorda and contributors, C2SP Community Cryptography Test Vectors for ML-KEM
  (December 2023 onward), c2sp.org/CCTV/ML-KEM.
- Matthias J. Kannwischer and others, pqm4: post-quantum cryptography on Arm Cortex-M4,
  benchmark tables at github.com/mupq/pqm4.
- Thom Wiggers, "Retiring PQClean", pqc-forum post (9 January 2026).
