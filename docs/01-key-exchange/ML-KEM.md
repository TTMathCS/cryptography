# ML-KEM (Kyber)

*The post-quantum way to agree on a key. One side locks a fresh random secret
to the other's public key; only the matching private key opens it.*

**Status and standards:** see [Key exchange](../algorithms/table.md#1-key-exchange) in the
main table.

## What it is

Every classical key exchange ([Diffie-Hellman](Diffie-Hellman.md),
[ECDH](ECDH.md)) and [RSA](../02-signatures/RSA.md) falls to Shor's algorithm on
a large quantum computer. ML-KEM is the replacement NIST standardized as
FIPS 203 in August 2024, from the Kyber design (2017). Its security rests on a
lattice problem, Module Learning With Errors, that no quantum algorithm is
known to solve.

**Why now:** nobody can break X25519 today, but an attacker can record traffic
now and decrypt it once the hardware exists ("harvest now, decrypt later").
That is why TLS and SSH have already switched it on, before the quantum
computers arrive.

| Parameter set | Security | Public key | Ciphertext | Shared secret |
|---|---|---|---|---|
| ML-KEM-512 | category 1 (~AES-128) | 800 B | 768 B | 32 B |
| ML-KEM-768 | category 3 (~AES-192) | 1,184 B | 1,088 B | 32 B |
| ML-KEM-1024 | category 5 (~AES-256) | 1,568 B | 1,568 B | 32 B |

For comparison, an X25519 public key is 32 bytes. ML-KEM-768 is the common
choice; NSA's CNSA 2.0 asks for ML-KEM-1024.

## The story

- **Who made it:** The CRYSTALS team (Joppe Bos, Léo Ducas, Eike Kiltz, Tancrède Lepoint, Vadim Lyubashevsky, John Schanck, Peter Schwabe, Gregor Seiler and Damien Stehlé) submitted Kyber to NIST in 2017. It rests on Oded Regev's Learning With Errors (2005) and on the module version of Langlois and Stehlé (2015).
- **What for:** A key exchange that a quantum computer can't break, small and fast enough to replace X25519 in everyday protocols.
- **What it solved:** "Harvest now, decrypt later": traffic recorded today could be read once a large quantum computer exists. NIST ran an open competition from 2016, picked Kyber in July 2022 and published FIPS 203 in August 2024.
- **Where it stands:** Recommended. Chrome turned on a Kyber hybrid in 2024 and switched to X25519MLKEM768 that November; OpenSSH 10.0 (2025) made the ML-KEM hybrid its default. It is deployed next to X25519, not instead of it, in case lattices hide a surprise.
- **Incidents:** **KyberSlash (2023 to 2024):** several implementations, the reference code among them, divided by a secret value, and division time depends on the value. Researchers recovered keys from the timing, and the code was patched. **April 2024:** Yilei Chen posted a quantum algorithm for LWE problems that would have threatened lattice schemes; within ten days a bug was found in it and the claim was withdrawn. No break of ML-KEM itself is known.

## How it works

A KEM (key encapsulation mechanism) works differently from a Diffie-Hellman
exchange:

1. The receiver publishes a public key.
2. The sender **encapsulates**: picks a random secret, locks it to that public
   key, and sends the ciphertext.
3. The receiver **decapsulates** with its private key and gets the same secret.

Inside, everything is polynomials with 256 coefficients modulo $q = 3329$,
arranged in small vectors and matrices (rank 2, 3 or 4 for the three sizes):

- **Key generation:** pick a matrix $\mathbf{A}$ from a seed, a small secret vector
  $\mathbf{s}$ and a small error $\mathbf{e}$. The public key is $\mathbf{t} = \mathbf{A} \mathbf{s} + \mathbf{e}$.
  Without the error, solving for $\mathbf{s}$ would be easy linear algebra; with it,
  that is the hard lattice problem.
- **Encapsulate:** encode a random message into the polynomial noise and
  encrypt it with $\mathbf{t}$. The shared secret is a hash of that message.
- **Decapsulate:** use $\mathbf{s}$ to strip the noise and recover the message, then
  re-encrypt it to check the ciphertext was honest. A forged ciphertext gives a
  random-looking secret instead of an error (the Fujisaki–Okamoto transform,
  which makes it safe against chosen-ciphertext attacks).

SHA-3 and SHAKE do all the hashing and sampling inside.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 395" role="img" aria-labelledby="sk-c-lattice-t"><title id="sk-c-lattice-t">A slanted grid of lattice points with one point pushed slightly off by a small error; in two dimensions the nearest grid point is obvious, in hundreds it is not</title><defs><filter id="sk-c-lattice-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-lattice-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-lattice-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-lattice-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-lattice-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="395" filter="url(#sk-c-lattice-paper)"/><g filter="url(#sk-c-lattice-pen)"><text x="30" y="44" class="h">Easy to see in two dimensions, lost in hundreds</text><circle cx="50" cy="240" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="68" cy="194" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="86" cy="148" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="104" cy="102" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="48" cy="364" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="66" cy="318" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="84" cy="272" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="102" cy="226" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="120" cy="180" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="138" cy="134" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="156" cy="88" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="100" cy="350" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="118" cy="304" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="136" cy="258" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="154" cy="212" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="172" cy="166" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="190" cy="120" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="208" cy="74" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="152" cy="336" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="170" cy="290" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="188" cy="244" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="206" cy="198" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="224" cy="152" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="242" cy="106" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="186" cy="368" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="204" cy="322" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="222" cy="276" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="240" cy="230" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="258" cy="184" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="276" cy="138" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="294" cy="92" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="238" cy="354" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="256" cy="308" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="274" cy="262" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="292" cy="216" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="310" cy="170" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="328" cy="124" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="346" cy="78" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="290" cy="340" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="308" cy="294" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="326" cy="248" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="344" cy="202" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="362" cy="156" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="380" cy="110" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="342" cy="326" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="360" cy="280" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="378" cy="234" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="396" cy="188" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="414" cy="142" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="394" cy="312" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="412" cy="266" r="3.5" class="p" style="fill:#3a2a1e"/><circle cx="362" cy="156" r="7" class="p gold"/><circle cx="377" cy="143" r="6" class="p red" style="fill:#a03a2a"/><path class="p dash" d="M362 156 L377 143"/><text x="382" y="130" text-anchor="middle" class="s" style="font-weight:600">As + e, published</text><text x="362" y="184" text-anchor="middle" class="s" style="font-weight:600">As</text><text x="470" y="120" class="s">The small error e moves</text><text x="470" y="140" class="s">the point off the grid.</text><text x="470" y="190" class="s">Here you can see the</text><text x="470" y="210" class="s">nearest grid point at once.</text><text x="470" y="260" class="s">In hundreds of dimensions</text><text x="470" y="280" class="s">finding it is the hard</text><text x="470" y="300" class="s">lattice problem, for</text><text x="470" y="320" class="s">quantum computers too.</text></g></svg><figcaption>Sketched for this page. Two dimensions stand in for hundreds.</figcaption></figure>

## When to use it

- **Hybrid, not alone:** pair ML-KEM with X25519 and combine both secrets, as
  TLS (`X25519MLKEM768`) and SSH (`mlkem768x25519-sha256`) do. The session
  stays safe unless *both* break.
- **Anything that must stay secret for years:** VPNs, backups, messaging.
  Signal's PQXDH adds ML-KEM-1024 to its X25519 handshake.
- **Budget for size:** a TLS ClientHello grows by about 1.2 KB.

## Example (Python)

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing). The standard
library has no ML-KEM. liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

```python
import oqs

with oqs.KeyEncapsulation("ML-KEM-768") as receiver:
    public_key = receiver.generate_keypair()

    with oqs.KeyEncapsulation("ML-KEM-768") as sender:
        ciphertext, secret_sender = sender.encap_secret(public_key)

    secret_receiver = receiver.decap_secret(ciphertext)

print(secret_sender == secret_receiver)   # True: 32 shared bytes, run them through HKDF
```

## Security notes

- Module lattices are younger than factoring and discrete log, which is the
  reason for hybrid mode and for the hash-based signature fallback (SLH-DSA).
- Decapsulation must run in constant time; timing leaks (KyberSlash, 2023)
  broke early implementations. Use a vetted library.
- Symmetric crypto carries over: AES-256 and SHA-256 only lose about half their
  strength to Grover's algorithm.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: the idea of ML-KEM with one number"

    ML-KEM works with polynomials of 256 coefficients in vectors of 2 to 4. The same idea fits in single
    numbers mod $q = 3329$ (ML-KEM's own modulus). This toy is not secure; it only shows why noise does not
    stop decryption. Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Public $a$, secret $s$, small error $e$ | $a = 1234$, $s = 2$, $e = 1$ | |
    | Public key | $t = a \cdot s + e = 2468 + 1$ | $t = 2469$ |
    | Sender: random small $r$, errors $e_1$, $e_2$; bit $m = 1$ | $r = 3$, $e_1 = -1$, $e_2 = 1$ | |
    | Ciphertext part 1 | $u = a \cdot r + e_1 = 3702 - 1 \bmod 3329$ | $u = 372$ |
    | Ciphertext part 2 | $v = t \cdot r + e_2 + m \cdot 1665 = 7407 + 1 + 1665 \bmod 3329$ | $v = 2415$ |
    | Receiver | $w = v - s \cdot u = 2415 - 744$ | $w = 1671$ |
    | Round | 1671 is 6 away from 1665 and 1658 away from 0 | $m = 1$ |

    The leftover $w - m \cdot 1665 = e \cdot r + e_2 - s \cdot e_1 = 3 + 1 + 2 = 6$ is small because every secret and error is
    small. Without $s$, $u$ and $v$ look like random numbers mod 3329.

??? abstract "The math, with formulas"

    **The ring.** Polynomials with 256 coefficients modulo $x^{256} + 1$ and modulo $q = 3329$. Multiplying by $x$
    shifts the coefficients and the top one comes back negated.

    **Key generation (FIPS 203, K-PKE).** From a seed, expand a $k \times k$ matrix $\mathbf{A}$ of random polynomials.
    Sample small $\mathbf{s}$ and $\mathbf{e}$ (coefficients from $-\eta$ to $\eta$). Publish $\mathbf{t} = \mathbf{A} \mathbf{s} + \mathbf{e}$.

    **Encryption** of a 32-byte message $m$: sample small $\mathbf{r}$, $\mathbf{e}_1$, $e_2$;
    $\mathbf{u} = \mathbf{A}^\mathsf{T} \mathbf{r} + \mathbf{e}_1$, $v = \mathbf{t}^\mathsf{T} \mathbf{r} + e_2 + \lceil q/2 \rceil \cdot m$ (each bit of $m$ becomes 0 or 1665 in one coefficient).
    Then compress: $\mathbf{u}$ to $d_u$ bits a coefficient, $v$ to $d_v$ bits.

    **Decryption:** $v - \mathbf{s}^\mathsf{T} \mathbf{u} = \mathbf{e}^\mathsf{T} \mathbf{r} + e_2 - \mathbf{s}^\mathsf{T} \mathbf{e}_1 + \lceil q/2 \rceil \cdot m$. Each coefficient is near 0 or near 1665;
    round to get $m$. Decryption fails only if the noise passes $q/4 \approx 832$: FIPS 203 puts the chance at about
    $2^{-139}$ for ML-KEM-512, $2^{-165}$ for ML-KEM-768 and $2^{-175}$ for ML-KEM-1024.

    | | $k$ | $\eta_1$ | $d_u$ | $d_v$ | Public key | Ciphertext | Security |
    |---|---|---|---|---|---|---|---|
    | ML-KEM-512 | 2 | 3 | 10 | 4 | 800 B | 768 B | category 1 (AES-128) |
    | ML-KEM-768 | 3 | 2 | 10 | 4 | 1,184 B | 1,088 B | category 3 (AES-192) |
    | ML-KEM-1024 | 4 | 2 | 11 | 5 | 1,568 B | 1,568 B | category 5 (AES-256) |

    **Fast multiplication (NTT).** $3329 = 13 \cdot 256 + 1$, so mod 3329 there is a 256th root of unity (17). The
    number-theoretic transform turns a polynomial product into 128 small products, like a Fourier transform.

    **Fujisaki–Okamoto.** Decapsulation re-encrypts the recovered $m$ and compares; on a mismatch it returns
    a pseudorandom key derived from a secret value $z$, so an attacker learns nothing from forged ciphertexts.

??? tip "Watch it step by step: one bit through the noise"

    <div class="mars-steps" markdown>

    1. Bob publishes $a = 1234$ and $t = 2469$. Only he knows $t = 1234 \cdot 2 + 1$.
    2. Alice wants to send the bit 1. She picks small $r = 3$, $e_1 = -1$, $e_2 = 1$.
    3. She sends $u = 1234 \cdot 3 - 1 \equiv 372$.
    4. She sends $v = 2469 \cdot 3 + 1 + 1665 \equiv 2415$ (the 1665 carries the bit).
    5. Bob computes $v - 2 \cdot u = 2415 - 744 = 1671$.
    6. 1671 is close to 1665 (the bit 1), far from 0 (the bit 0). Bob reads 1.
    7. In ML-KEM this happens for 256 bits at once; the 32-byte message is hashed into the shared key.

    </div>

??? info "The math underneath"

    - **Learning with errors (LWE)** and its module form (MLWE): solving $\mathbf{t} = \mathbf{A} \mathbf{s} + \mathbf{e}$ for small $\mathbf{s}$ is hard
      because of the small $\mathbf{e}$. See [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Lattices:** recovering $\mathbf{s}$ means finding a short vector in a lattice of dimension about $256 \cdot k$. The
      best attacks (BKZ lattice reduction, sieving) take time exponential in the dimension, on classical and
      quantum computers alike.
    - **Polynomial rings** $\mathbb{Z}_q[x]/(x^{256} + 1)$ and the **number-theoretic transform**, the integer cousin of
      the FFT.
    - **Centered binomial distribution:** the small coefficients are sums of coin flips, cheap to sample in
      constant time.
    - **SHA-3 and SHAKE** ([SHA-3](../07-hash/SHA-3.md)) expand the seed into $\mathbf{A}$ and derive the keys.

## See also

- [ECDH](ECDH.md): X25519, the classical half of the hybrid
- [NTRU Prime](NTRU-Prime.md) / [Code-based KEMs](Code-Based-KEMs.md): the other post-quantum KEMs
- [ML-DSA](../02-signatures/ML-DSA.md): the post-quantum signature from the same family
- [HKDF](../08-kdf-password-hashing/HKDF.md): what the shared secret goes through next
- [Hard problems](../10-math-foundations/Hard-Problems.md): Module-LWE and the other problems post-quantum schemes rest on
- [Will quantum computers break all of this?](../FAQ.md)

## References

- [FIPS 203: ML-KEM](https://csrc.nist.gov/pubs/fips/203/final)
- [RFC 10024: hybrid ML-KEM key agreement for TLS 1.3](https://www.rfc-editor.org/rfc/rfc10024) (2026) / [RFC 10042: hybrid ML-KEM key exchange for SSH](https://www.rfc-editor.org/rfc/rfc10042) (2026)
- [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography)
