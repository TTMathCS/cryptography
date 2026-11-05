# FN-DSA (Falcon)

*The most compact NIST post-quantum signature, and the hardest to implement.
Falcon, renamed FN-DSA, is still waiting for its standard.*

**Status and standards:** see [Digital signatures](../algorithms/table.md#2-digital-signatures)
in the main table.

## What it is

Falcon was submitted to NIST in 2017 by a team of ten, including Thomas
Pornin and Thomas Prest. NIST picked it in July 2022 (NIST IR 8413) for its
size: some protocols need a signature and its data in one network packet,
and ML-DSA's signatures don't fit. It will become FIPS 206 under the name
FN-DSA (FFT over NTRU-Lattice-Based Digital Signature Algorithm).

As of October 2026, FIPS 206 is not out, not even as a public draft. NIST
previewed the draft in September 2025 and revised the plan in September 2026.

| Parameter set | Security | Public key | Signature |
|---|---|---|---|
| FN-DSA-512 (Falcon-512) | category 1 | 897 B | 666 B |
| FN-DSA-1024 (Falcon-1024) | category 5 | 1,793 B | 1,280 B |
| [ML-DSA-44](ML-DSA.md), for comparison | category 2 | 1,312 B | 2,420 B |

Sizes are from the round-3 Falcon specification, with signatures padded to a
fixed length. Private keys are 1,281 and 2,305 bytes. There is no middle size:
the ring needs $n$ to be a power of two.

## The story

- **Who made it:** The Falcon team: Pierre-Alain Fouque, Jeffrey Hoffstein, Paul Kirchner, Vadim Lyubashevsky, Thomas Pornin, Thomas Prest, Thomas Ricosset, Gregor Seiler, William Whyte and Zhenfei Zhang (2017). It uses the hash-and-sign method of Gentry, Peikert and Vaikuntanathan (2008) on NTRU lattices.
- **What for:** The smallest lattice signature, for places where every byte counts.
- **What it solved:** ML-DSA's signatures are over 2 KB. Falcon-512's are about 666 bytes, so a signature and its public key fit together in one network packet.
- **Where it stands:** Still on the way: FIPS 206 was not out as of October 2026. Its hard part is sampling from a Gaussian distribution using floating-point arithmetic in constant time, which is very easy to get wrong.
- **Incidents:** In September 2019 the Falcon team found bugs in its own reference code that made signatures less random than intended, enough to leak the key; they were fixed. "FALCON Down" (2021) recovered keys from the electromagnetic leakage of an unprotected chip.

## How it works

Falcon is "hash-and-sign" over an NTRU lattice, after Gentry, Peikert and
Vaikuntanathan (2008). Everything is a polynomial modulo $x^n + 1$ ($n = 512$ or
$1024$) with coefficients modulo $q = 12{,}289$.

- **Key generation:** pick small random polynomials $f$ and $g$, then solve
  $f \cdot G - g \cdot F = q$ for $F$ and $G$. The public key is $h = g/f \bmod q$. The four small
  polynomials are a short basis of the lattice; $h$ only gives a long one.
- **Sign:** hash a random 40-byte salt and the message to a polynomial $c$. Use
  the short basis to find a lattice point close to $(c, 0)$. The difference is a
  short pair $(s_1, s_2)$ with $s_1 + s_2 \cdot h = c \bmod q$. The signature is the salt and
  a compressed $s_2$.
- **Verify:** compute $s_1 = c - s_2 \cdot h \bmod q$ and check that $(s_1, s_2)$ is short.

The lattice point must follow a discrete Gaussian distribution, drawn by a
"fast Fourier sampler" over a tree built from the private key. Otherwise each
signature leaks a little of the secret basis, which is how NTRUSign was
broken (Nguyen and Regev, 2006).

**Why it is hard to implement.** NIST's 2022 report named floating point as
its worry about Falcon. Verification is plain integer math; signing is not.

- Signing runs the FFT and the sampler on IEEE 754 doubles. Many
  microcontrollers have no FPU for doubles, and emulating them is slower.
- Floating point is hard to make constant time, and here it touches secrets.
  Electromagnetic traces of signing on an ARM Cortex-M4 were enough to recover
  the key (Karabulut and Aysu, 2021).
- Tiny rounding differences are dangerous. If the sampler runs twice on the
  same input and the results differ slightly, the two outputs can reveal the
  key (Lin, Tibouchi, Yu and Zhang, 2025). So NIST plans to allow only
  randomized signing.
- Testing needs exact answers. NIST's 2025 preview fixed the floating-point
  details (order of operations, no fused multiply-add) so implementations
  match known-answer tests. Its September 2026 plan switches to fixed-point
  numbers: 32.32 bits for key generation, 64.64 for signing.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 385" role="img" aria-labelledby="sk-c-bases-t"><title id="sk-c-bases-t">A lattice with two pairs of arrows that generate it: a short, nearly square pair kept secret, and a long, nearly parallel pair that is public</title><defs><filter id="sk-c-bases-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-bases-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-bases-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-bases-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-bases-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="385" filter="url(#sk-c-bases-paper)"/><g filter="url(#sk-c-bases-pen)"><text x="30" y="44" class="h">One lattice, two descriptions</text><circle cx="60" cy="326" r="3" class="p" style="fill:#3a2a1e"/><circle cx="74" cy="282" r="3" class="p" style="fill:#3a2a1e"/><circle cx="88" cy="238" r="3" class="p" style="fill:#3a2a1e"/><circle cx="102" cy="194" r="3" class="p" style="fill:#3a2a1e"/><circle cx="116" cy="150" r="3" class="p" style="fill:#3a2a1e"/><circle cx="130" cy="106" r="3" class="p" style="fill:#3a2a1e"/><circle cx="92" cy="360" r="3" class="p" style="fill:#3a2a1e"/><circle cx="106" cy="316" r="3" class="p" style="fill:#3a2a1e"/><circle cx="120" cy="272" r="3" class="p" style="fill:#3a2a1e"/><circle cx="134" cy="228" r="3" class="p" style="fill:#3a2a1e"/><circle cx="148" cy="184" r="3" class="p" style="fill:#3a2a1e"/><circle cx="162" cy="140" r="3" class="p" style="fill:#3a2a1e"/><circle cx="176" cy="96" r="3" class="p" style="fill:#3a2a1e"/><circle cx="138" cy="350" r="3" class="p" style="fill:#3a2a1e"/><circle cx="152" cy="306" r="3" class="p" style="fill:#3a2a1e"/><circle cx="166" cy="262" r="3" class="p" style="fill:#3a2a1e"/><circle cx="180" cy="218" r="3" class="p" style="fill:#3a2a1e"/><circle cx="194" cy="174" r="3" class="p" style="fill:#3a2a1e"/><circle cx="208" cy="130" r="3" class="p" style="fill:#3a2a1e"/><circle cx="222" cy="86" r="3" class="p" style="fill:#3a2a1e"/><circle cx="184" cy="340" r="3" class="p" style="fill:#3a2a1e"/><circle cx="198" cy="296" r="3" class="p" style="fill:#3a2a1e"/><circle cx="212" cy="252" r="3" class="p" style="fill:#3a2a1e"/><circle cx="226" cy="208" r="3" class="p" style="fill:#3a2a1e"/><circle cx="240" cy="164" r="3" class="p" style="fill:#3a2a1e"/><circle cx="254" cy="120" r="3" class="p" style="fill:#3a2a1e"/><circle cx="268" cy="76" r="3" class="p" style="fill:#3a2a1e"/><circle cx="230" cy="330" r="3" class="p" style="fill:#3a2a1e"/><circle cx="244" cy="286" r="3" class="p" style="fill:#3a2a1e"/><circle cx="258" cy="242" r="3" class="p" style="fill:#3a2a1e"/><circle cx="272" cy="198" r="3" class="p" style="fill:#3a2a1e"/><circle cx="286" cy="154" r="3" class="p" style="fill:#3a2a1e"/><circle cx="300" cy="110" r="3" class="p" style="fill:#3a2a1e"/><circle cx="262" cy="364" r="3" class="p" style="fill:#3a2a1e"/><circle cx="276" cy="320" r="3" class="p" style="fill:#3a2a1e"/><circle cx="290" cy="276" r="3" class="p" style="fill:#3a2a1e"/><circle cx="304" cy="232" r="3" class="p" style="fill:#3a2a1e"/><circle cx="318" cy="188" r="3" class="p" style="fill:#3a2a1e"/><circle cx="332" cy="144" r="3" class="p" style="fill:#3a2a1e"/><circle cx="346" cy="100" r="3" class="p" style="fill:#3a2a1e"/><circle cx="308" cy="354" r="3" class="p" style="fill:#3a2a1e"/><circle cx="322" cy="310" r="3" class="p" style="fill:#3a2a1e"/><circle cx="336" cy="266" r="3" class="p" style="fill:#3a2a1e"/><circle cx="350" cy="222" r="3" class="p" style="fill:#3a2a1e"/><circle cx="364" cy="178" r="3" class="p" style="fill:#3a2a1e"/><circle cx="378" cy="134" r="3" class="p" style="fill:#3a2a1e"/><circle cx="392" cy="90" r="3" class="p" style="fill:#3a2a1e"/><circle cx="354" cy="344" r="3" class="p" style="fill:#3a2a1e"/><circle cx="368" cy="300" r="3" class="p" style="fill:#3a2a1e"/><circle cx="382" cy="256" r="3" class="p" style="fill:#3a2a1e"/><circle cx="396" cy="212" r="3" class="p" style="fill:#3a2a1e"/><circle cx="410" cy="168" r="3" class="p" style="fill:#3a2a1e"/><circle cx="424" cy="124" r="3" class="p" style="fill:#3a2a1e"/><circle cx="438" cy="80" r="3" class="p" style="fill:#3a2a1e"/><circle cx="400" cy="334" r="3" class="p" style="fill:#3a2a1e"/><circle cx="414" cy="290" r="3" class="p" style="fill:#3a2a1e"/><circle cx="428" cy="246" r="3" class="p" style="fill:#3a2a1e"/><path class="p gold" d="M230 330 L276 320" marker-end="url(#sk-c-bases-ah)" style="stroke-width:3"/><path class="p gold" d="M230 330 L244 286" marker-end="url(#sk-c-bases-ah)" style="stroke-width:3"/><path class="p red" d="M230 330 L428 246" marker-end="url(#sk-c-bases-ah)"/><path class="p red" d="M230 330 L396 212" marker-end="url(#sk-c-bases-ah)"/><text x="460" y="120" class="s">gold: the short basis,</text><text x="460" y="140" class="s">the private key (f, g, F, G)</text><text x="460" y="190" class="s">red: a long, nearly parallel</text><text x="460" y="210" class="s">basis, all the public key h</text><text x="460" y="230" class="s">gives away</text><text x="460" y="280" class="s">Both make the same points.</text><text x="460" y="300" class="s">Only the short one makes it</text><text x="460" y="320" class="s">easy to find a nearby point.</text></g></svg><figcaption>Sketched for this page. Two dimensions stand in for 1,024.</figcaption></figure>

## When to use it

- **Not yet** where you need a FIPS standard. Use [ML-DSA](ML-DSA.md) now.
- **Once FIPS 206 is out:** where bytes matter most, such as certificate
  chains and DNSSEC.
- **Verify-only devices** are easy. Signing on a small device needs a
  vetted, constant-time library.

## Example (Python)

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing). liboqs ships
Falcon as submitted in round 3. FIPS 206 is set to change details (such as
hashing the public key into each signature), so these signatures won't
verify as FN-DSA. liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

```python
import oqs

message = b"release v2.1"

with oqs.Signature("Falcon-padded-512") as signer:
    public_key = signer.generate_keypair()
    signature = signer.sign(message)

with oqs.Signature("Falcon-padded-512") as verifier:
    print(len(public_key), len(signature), verifier.verify(message, signature, public_key))   # 897 666 True
```

## Security notes

- Security rests on the hardness of finding short vectors in NTRU lattices,
  studied since NTRU appeared in the mid-1990s.
- Use a vetted implementation that keeps secret floating-point work constant
  time on your CPU, or one that avoids the FPU entirely.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: hash-and-sign with a short answer"

    Falcon's signature is a short pair $(s_1, s_2)$ with $s_1 + s_2 \cdot h \equiv c \pmod{q}$, where $h$ is the public key and
    $c$ the hash of the message. With single numbers mod $q = 97$ (Falcon uses polynomials of 512 or 1,024
    coefficients mod 12,289), and $h = 40$, $c = 55$. Checked with Python:

    | Candidate $s_2$ | $s_1 = c - s_2 \cdot h \bmod 97$ (centered) | Size $s_1^2 + s_2^2$ | Valid? |
    |---|---|---|---|
    | $30$ | $19$ | 1,261 | equation holds, but too long |
    | $4$ | $-8$ | 80 | equation holds, short |
    | $-1$ | $-2$ | 5 | equation holds, the shortest |

    Check the best one: $-2 + (-1) \cdot 40 = -42 \equiv 55 \pmod{97}$. Any $s_2$ gives *some* $s_1$; the hard part is
    making both short. Here 97 choices can be tried by hand. In Falcon-512 the search space is about $12{,}289^{512}$,
    and only the holder of the secret short basis can find a short pair.

??? abstract "The math, with formulas"

    **The NTRU lattice.** With small secret polynomials $f$, $g$ and public $h = g \cdot f^{-1} \bmod q$ (in
    $\mathbb{Z}_q[x]/(x^n + 1)$), the pairs $(s_1, s_2)$ with $s_1 + s_2 \cdot h \equiv 0 \pmod{q}$ form a lattice. Its basis from $h$
    is long; the secret basis $\begin{bmatrix} g & -f \\ G & -F \end{bmatrix}$ with $f \cdot G - g \cdot F = q$ is short.

    **Signing (GPV, 2008):** $c = H(\mathit{salt} \,\Vert\, m)$. Find any $(t_1, t_2)$ with $t_1 + t_2 \cdot h = c$, then use the short
    basis and the fast Fourier sampler to find a lattice vector $v$ close to it, drawn from a discrete
    Gaussian. The signature is $s = t - v$, short and with $s_1 + s_2 \cdot h = c$.

    **Verifying:** recompute $c$, set $s_1 = c - s_2 \cdot h \bmod q$, accept if $\Vert (s_1, s_2) \Vert^2 \le \lfloor \beta^2 \rfloor$ (34,034,726 for
    Falcon-512, 70,265,242 for Falcon-1024).

    | | $n$ | $q$ | Public key | Signature | Category |
    |---|---|---|---|---|---|
    | FN-DSA-512 (Falcon-512) | 512 | 12,289 | 897 B | 666 B | 1 |
    | FN-DSA-1024 (Falcon-1024) | 1,024 | 12,289 | 1,793 B | 1,280 B | 5 |

    **Why the Gaussian.** If the sampler simply rounded, every signature would point slightly along the
    secret basis, and averaging many signatures would reveal its shape (the attack on NTRUSign). A
    Gaussian over the lattice coset is the same whichever basis drew it.

??? tip "Watch it step by step: why only the key holder can sign"

    <div class="mars-steps" markdown>

    1. Public: $q = 97$ and $h = 40$. The message hashes to $c = 55$.
    2. A forger can pick any $s_2$, say 30, and solve $s_1 = 55 - 30 \cdot 40 \bmod 97 = 19$. The equation holds.
    3. But $(19, 30)$ is long, and the verifier rejects any pair whose length is above the bound.
    4. The key holder's short basis leads straight to a short pair: $(-2, -1)$.
    5. The verifier checks $-2 + (-1) \cdot 40 = -42 \equiv 55 \pmod{97}$ and that the pair is short. Valid.
    6. With 512 coefficients mod 12,289, trying candidates is hopeless; finding a short pair without the
       basis is the hard lattice problem.

    </div>

??? info "The math underneath"

    - **Lattices and short bases:** a lattice has many bases; a short, nearly orthogonal one lets you find
      nearby lattice points (Babai's nearest-plane idea).
    - **The short integer solution (SIS) problem** over NTRU lattices: forging means finding a short vector;
      see [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Discrete Gaussian sampling** and the **FFT** over $\mathbb{Z}[x]/(x^n + 1)$ (Falcon's "fast Fourier sampling").
    - **The NTRU equation** $fG - gF = q$, solved with field norms and the extended Euclidean algorithm.
    - Compare [ML-DSA](ML-DSA.md) (Fiat–Shamir, larger, easier to implement) and
      [NTRU Prime](../01-key-exchange/NTRU-Prime.md).

## See also

- [ML-DSA](ML-DSA.md): the lattice signature to use today
- [SLH-DSA](SLH-DSA.md): the hash-based fallback
- [NTRU Prime](../01-key-exchange/NTRU-Prime.md): another NTRU lattice scheme,
  for key exchange

## References

- [Falcon site and round-3 specification](https://falcon-sign.info/)
- [NIST IR 8413: status report on round 3](https://nvlpubs.nist.gov/nistpubs/ir/2022/NIST.IR.8413-upd1.pdf)
- [Perlner, "FIPS 206 Status Update", NIST 6th PQC Standardization Conference (Sep 2025)](https://csrc.nist.gov/presentations/2025/fips-206-fn-dsa-falcon)
- [NIST FIPS 206 team, "New plan for FN-DSA", pqc-forum (Sep 2026)](https://groups.google.com/a/list.nist.gov/g/pqc-forum/c/7z-y5qp-W2Y)
- [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Lin, Tibouchi, Yu, Zhang, "Do Not Disturb a Sleeping Falcon" (Eurocrypt 2025)](https://eprint.iacr.org/2024/1709)
- [Karabulut, Aysu, "Falcon Down" (DAC 2021)](https://eprint.iacr.org/2021/772)

*Weaker sources:* [NIST news release, August 2024](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards) for the FN-DSA name and its expansion.
