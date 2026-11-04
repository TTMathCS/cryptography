# NTRU Prime (sntrup761)

*A lattice KEM that strips out the extra structure most lattice schemes keep
for speed. Paired with X25519, it was the first post-quantum key exchange
OpenSSH turned on by default.*

**Status and standards:** see [Key exchange](../algorithms/table.md#1-key-exchange) in the
main table.

## What it is

NTRU Prime is a variant of the NTRU lattice scheme from Daniel J. Bernstein,
Chitchanok Chuengsatiansup, Tanja Lange and Christine van Vredendaal (2016).
The team's argument: lattice attacks keep improving, so remove every piece of
structure an attacker might use, even at a small cost in speed. Its main KEM
is Streamlined NTRU Prime, and sntrup761 is the size SSH uses.

It reached round 3 of the NIST competition as an alternate, but NIST stopped
there in 2022 (NIST IR 8413) and standardized [ML-KEM](ML-KEM.md) instead. So
there is no FIPS for it. Its real home is SSH: RFC 9941 (April 2026) defines
`sntrup761x25519-sha512`.

| | Public key | Ciphertext | Shared secret |
|---|---|---|---|
| sntrup761 | 1,158 B | 1,039 B | 32 B |
| ML-KEM-768, for comparison | 1,184 B | 1,088 B | 32 B |

With the X25519 half added, SSH sends 1,190 bytes one way and 1,071 back.

**In OpenSSH:**

| Release | What changed |
|---|---|
| 8.0 (Apr 2019) | experimental `sntrup4591761x25519-sha512@tinyssh.org`, off |
| 8.5 (Mar 2021) | replaced by `sntrup761x25519-sha512@openssh.com`, still off |
| 9.0 (Apr 2022) | the default, against "capture now, decrypt later" |
| 9.9 (Sep 2024) | IANA name `sntrup761x25519-sha512`; ML-KEM hybrid added |
| 10.0 (Apr 2025) | `mlkem768x25519-sha256` takes over; sntrup761 is second |

## The story

- **Who made it:** NTRU itself came from Jeffrey Hoffstein, Jill Pipher and Joseph Silverman at Brown University (first shown in 1996, published in 1998), and was patented until 2017. NTRU Prime is the 2016 redesign by Bernstein, Chuengsatiansup, Lange and van Vredendaal.
- **What for:** A lattice key exchange that leaves attackers as little structure as possible.
- **What it solved:** From 2014, attacks on lattices with a lot of algebraic structure (the cyclotomic rings many schemes use) kept getting better. NTRU Prime moved to a ring with fewer such shortcuts, giving up a little speed.
- **Where it stands:** Not a NIST standard: it stopped as an alternate in round 3 (2022). Its home is SSH. OpenSSH added sntrup761x25519 in 8.5 (2021) and made it the default in 9.0 (2022), the first post-quantum default in a major protocol. It is now being replaced there by the ML-KEM hybrid.
- **Incidents:** No break. Its designers argued publicly with NIST about how lattice security was being estimated during the competition, which pushed NIST to explain its numbers in more detail.

## How it works

Everything is a polynomial modulo $x^{761} - x - 1$ with coefficients modulo
4591. Both numbers are prime. Unlike the $x^{256} + 1$ ring in ML-KEM, this ring
has no special symmetries (automorphisms), and modulo 4591 the polynomial
doesn't factor, so the ring is a field.

- **Key generation:** pick small polynomials $f$ and $g$ (coefficients $-1$, $0$ or
  $1$). The public key is $h = g / (3f)$.
- **Encapsulate:** pick a random small $r$ with exactly 286 nonzero
  coefficients. The ciphertext is $h \cdot r$ with each coefficient rounded to a
  multiple of 3. That rounding is the noise, so no separate error term is
  needed. The shared secret is a hash of $r$ and the ciphertext.
- **Decapsulate:** multiply the ciphertext by $3f$. The result is small, so
  reducing it mod 3 leaves $g \cdot r$, and dividing by $g$ gives $r$. Then re-encrypt
  to check the ciphertext, as ML-KEM does.

Decryption never fails, which rules out the decryption-failure attacks some
other lattice KEMs suffered.

SSH runs it next to X25519 and hashes both secrets together (RFC 9941):
$K = \text{SHA-512}(\text{sntrup761 secret} \,\Vert\, \text{X25519 secret})$.

## When to use it

- **SSH:** nothing to do. An OpenSSH 10 client picks ML-KEM when the server
  has it (9.9 or later); servers on 9.0 to 9.8 get sntrup761 under its
  `@openssh.com` name. Check with `ssh -Q kex | grep sntrup`.
- **Outside SSH:** TLS and most other protocols chose ML-KEM, and FIPS rules
  only allow ML-KEM, so use that.

## Example (Python)

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing). The standard
library has no NTRU Prime. liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

```python
import oqs

with oqs.KeyEncapsulation("sntrup761") as receiver:
    public_key = receiver.generate_keypair()

    with oqs.KeyEncapsulation("sntrup761") as sender:
        ciphertext, secret_sender = sender.encap_secret(public_key)

    secret_receiver = receiver.decap_secret(ciphertext)

print(len(public_key), len(ciphertext), secret_sender == secret_receiver)   # 1158 1039 True
```

## Security notes

- Always hybrid. OpenSSH 9.0 paired it with X25519 as a backstop against any
  weakness in NTRU Prime, so the session is never weaker than X25519 alone.
- Since 2022 it has drawn less public analysis than ML-KEM. No practical
  attack on sntrup761 is known.
- Use a vetted, constant-time implementation. OpenSSH's code comes from
  SUPERCOP, and liboqs now uses that same code.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: NTRU with tiny polynomials"

    The classic NTRU textbook example (Hoffstein, Pipher and Silverman), with polynomials of 7 coefficients
    modulo $x^7 - 1$, small modulus $p = 3$ and big modulus $q = 41$. Streamlined NTRU Prime uses the same idea
    in a different ring (below). Coefficients are listed from $x^0$ up; checked with Python:

    | Step | Value |
    |---|---|
    | Secret $f$ | $[-1, 0, 1, 1, -1, 0, 1] = -1 + x^2 + x^3 - x^4 + x^6$ |
    | Secret $g$ | $[0, -1, -1, 0, 1, 0, 1] = -x - x^2 + x^4 + x^6$ |
    | $f^{-1} \bmod 41$ | $[37, 2, 40, 21, 31, 26, 8]$ |
    | $f^{-1} \bmod 3$ | $[1, 1, 1, 1, 0, -1, 1]$ |
    | Public key $h = 3 \cdot f^{-1} \cdot g \bmod 41$ | $[8, 37, 24, 32, 6, 38, 19]$ |
    | Message $m$, random $r$ | $m = [1, 0, 0, -1, 1, 0, -1]$, $r = [-1, 1, 0, 0, 0, -1, 1]$ |
    | Ciphertext $e = r \cdot h + m \bmod 41$ | $[25, 4, 39, 0, 5, 20, 30]$ |
    | $a = f \cdot e \bmod 41$, centered | $[4, -2, -4, 4, -8, 4, 2]$ (all small) |
    | $m = f^{-1} \cdot a \bmod 3$ | $[1, 0, 0, -1, 1, 0, -1]$, the message |

??? abstract "The math, with formulas"

    **Why decryption works.** $f \cdot e = f \cdot r \cdot h + f \cdot m = 3 \cdot r \cdot g + f \cdot m \pmod{q}$. Every polynomial on the right has
    small coefficients, so the true integer result is smaller than $q/2$ and reducing mod $q$ changes nothing.
    Reducing that mod 3 kills $3 \cdot r \cdot g$, leaving $f \cdot m$; multiplying by $f^{-1} \bmod 3$ gives $m$.

    **Streamlined NTRU Prime (sntrup761)** changes three things:

    - The ring is $\mathbb{Z}_q[x]/(x^{761} - x - 1)$ with $q = 4591$. The polynomial is irreducible mod $q$, so the ring is
      a field: every non-zero element has an inverse, and there are no extra symmetries to exploit.
    - The public key is $h = g / (3f)$. Encapsulation picks $r$ with exactly 286 coefficients $\pm 1$ and sends
      $c = \mathrm{Round}(h \cdot r)$, each coefficient rounded to a multiple of 3. The rounding is the error term.
    - Decapsulation computes $3f \cdot c \bmod q$, which is $g \cdot r$ plus small noise; reduce mod 3, divide by $g \bmod 3$ to
      get $r$, then re-encrypt to check, and hash $r$ into the key. The parameters are chosen so it never
      fails.

    | | Ring degree $p$ | $q$ | weight $w$ | Public key | Ciphertext | Shared secret |
    |---|---|---|---|---|---|---|
    | sntrup761 | 761 | 4591 | 286 | 1,158 B | 1,039 B | 32 B |

??? tip "Watch it step by step: NTRU decryption"

    <div class="mars-steps" markdown>

    1. Bob's secrets are the small polynomials $f$ and $g$; his public key is $h = 3 \cdot f^{-1} \cdot g \bmod 41$.
    2. Alice hides $m = [1, 0, 0, -1, 1, 0, -1]$ with a random small $r$: $e = r \cdot h + m = [25, 4, 39, 0, 5, 20, 30]$.
    3. To anyone else, $e$ looks like 7 random numbers mod 41.
    4. Bob multiplies by $f$: $f \cdot e = 3 \cdot r \cdot g + f \cdot m$, which comes out as the small $[4, -2, -4, 4, -8, 4, 2]$.
    5. He reduces mod 3: the $3 \cdot r \cdot g$ part vanishes, leaving $f \cdot m \bmod 3$.
    6. He multiplies by $f^{-1} \bmod 3$ and gets $[1, 0, 0, -1, 1, 0, -1]$: Alice's message.

    </div>

??? info "The math underneath"

    - **Polynomial rings and inverses:** inverting $f$ mod a prime uses the extended Euclidean algorithm for
      polynomials.
    - **Lattices:** the NTRU lattice is built from $h$; the secret $(f, g)$ is an unusually short vector in it.
      Finding it is the shortest-vector problem: see [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Irreducible polynomials and fields:** why $x^{761} - x - 1$ was chosen over $x^n + 1$ (no subfields, no
      automorphisms, a hedge against algebraic attacks).
    - **Rounding as noise** ("learning with rounding") instead of adding random errors.
    - Compare [ML-KEM](ML-KEM.md), which uses module lattices and noise added on purpose.

## See also

- [ML-KEM](ML-KEM.md): the NIST KEM that took over as the default
- [ECDH](ECDH.md): X25519, the classical half of the hybrid
- [SSH](../protocols/SSH.md): how the key exchange gets picked
- [Code-based KEMs](Code-Based-KEMs.md): post-quantum KEMs that don't use lattices

## References

- [RFC 9941: sntrup761x25519-sha512 for SSH](https://www.rfc-editor.org/rfc/rfc9941)
- [Bernstein, Chuengsatiansup, Lange, van Vredendaal, "NTRU Prime: reducing attack surface at low cost" (2016)](https://eprint.iacr.org/2016/461)
- [NTRU Prime site and round-3 specification](https://ntruprime.cr.yp.to/)
- [OpenSSH 9.0 release notes](https://www.openssh.com/txt/release-9.0) / [OpenSSH post-quantum page](https://www.openssh.com/pq.html)
- [NIST IR 8413: status report on round 3](https://nvlpubs.nist.gov/nistpubs/ir/2022/NIST.IR.8413.pdf)
