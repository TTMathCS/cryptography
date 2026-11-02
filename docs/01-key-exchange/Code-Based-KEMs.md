# Code-Based KEMs (HQC, Classic McEliece)

*Post-quantum key exchange built on error-correcting codes instead of
lattices. The fallback in case a lattice attack ever hurts ML-KEM.*

**Status and standards:** see [Key exchange](../index.md#1-key-exchange) in the
main table.

## What it is

An error-correcting code adds redundancy so a message survives flipped bits.
These KEMs flip bits on purpose. The private key is a shortcut for removing
the errors; without it you face decoding a random-looking code, a problem
attacked since 1962 that quantum computers only speed up by about a square
root.

- **Classic McEliece:** Robert McEliece's 1978 system with binary Goppa
  codes. Tiny ciphertexts, huge public keys. ISO published it in June 2026
  (ISO/IEC 18033-2 Amd 2); NIST held off and may adopt the ISO version later.
- **HQC** (Hamming Quasi-Cyclic, 2017): random quasi-cyclic codes. NIST
  picked it in March 2025 as the backup to [ML-KEM](ML-KEM.md), over the
  similar BIKE. A draft standard comes first; the final one is due in 2027.

| Parameter set | Security | Public key | Ciphertext |
|---|---|---|---|
| HQC-1 / 3 / 5 | category 1 / 3 / 5 | 2,241 / 4,514 / 7,237 B | 4,433 / 8,978 / 14,421 B |
| mceliece348864 | category 1 | 261,120 B | 96 B |
| mceliece460896 | category 3 | 524,160 B | 156 B |
| mceliece6688128 | category 5 | 1,044,992 B | 208 B |
| mceliece8192128 | category 5 | 1,357,824 B | 208 B |

All give a 32-byte shared secret; ML-KEM-768 is 1,184 + 1,088 bytes. ISO left
out mceliece348864, and the designers recommend the mceliece6 sizes.

## How it works

**Classic McEliece** (mceliece6688128):

- **Key generation:** pick a secret Goppa code of length 6,688 that corrects
  up to 128 errors. Publish a scrambled form of its parity-check matrix H:
  1,664 × 5,024 bits, the 1 MB key.
- **Encapsulate:** pick a random error vector e with exactly 128 ones. The
  ciphertext is the syndrome H·e, 1,664 bits. The shared secret is a hash of
  e and the ciphertext.
- **Decapsulate:** the secret code structure decodes the syndrome back to e.
  Without it, that is the syndrome decoding problem.

**HQC** works on bit vectors of length 17,669 (HQC-1), multiplied as
polynomials:

- **Key generation:** secret sparse vectors x, y. The public key is a random h
  and s = x + h·y.
- **Encrypt** m: pick sparse r₁, r₂, e; send u = r₁ + h·r₂ and
  v = encode(m) + s·r₂ + e.
- **Decrypt:** v − u·y = encode(m) + (x·r₂ − r₁·y + e). The bracket is
  sparse, so a fixed public code (Reed-Muller inside Reed-Solomon) strips it.

In HQC the code is public and the secret is y. A Fujisaki–Okamoto transform
makes it a KEM, as in ML-KEM.

## When to use it

- **HQC: not yet.** Wait for the NIST standard; the October 2026 spec changed
  the parameters again. Then run it next to ML-KEM for a second, non-lattice
  assumption.
- **Classic McEliece: for a public key sent once and used for years,** such as
  a VPN peer's static key. Rosenpass, a post-quantum add-on for WireGuard,
  pairs it with Kyber. A 1 MB key per TLS handshake is out of the question.
- **Always hybrid,** with X25519 or ML-KEM.

## Example (Python)

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing), with liboqs 0.16
(2026) or later for the `HQC-1` name. The HQC sizes in the table and in the
output are those of the August 2025 spec, which liboqs 0.16 implements.
liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

```python
import oqs

for name in ["HQC-1", "Classic-McEliece-6688128"]:
    with oqs.KeyEncapsulation(name) as receiver:
        public_key = receiver.generate_keypair()
        with oqs.KeyEncapsulation(name) as sender:
            ciphertext, secret = sender.encap_secret(public_key)
        print(name, len(public_key), len(ciphertext), receiver.decap_secret(ciphertext) == secret)

# HQC-1 2241 4433 True
# Classic-McEliece-6688128 1044992 208 True
```

## Security notes

- McEliece's 1978 parameters fell to better generic decoding in 2008; larger
  ones held. Attacks on the hidden Goppa structure have improved since 2024,
  and one 2026 estimate puts key recovery for every Classic McEliece set at
  2¹²⁷ to 2¹⁴⁵ operations: below the claimed levels, far from practical.
- On 1 October 2026 Germany's BSI advised against Classic McEliece in new
  developments for now. It says no practical attack exists on its
  recommended parameters.
- HQC's problems so far were in the details: timing attacks on rejection
  sampling (2022), a chosen-ciphertext flaw fixed in the August 2025 spec, and
  compiler-made secret-dependent branches (CVE-2025-52473).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: McEliece-style encryption with a 7-bit code"

    Classic McEliece uses a secret Goppa code of length 6,688 that fixes 128 errors. The same steps work
    with the Hamming code of length 7, which fixes 1 error (far too small to be secure). The parity-check
    matrix `H` has the 7 non-zero 3-bit columns:

    ```
         1 1 0 1 1 0 0
    H =  1 0 1 1 0 1 0
         0 1 1 1 0 0 1
    ```

    | Step | Calculation | Value |
    |---|---|---|
    | Secret error vector (weight 1) | the message is "position 3" | `e = 0010000` |
    | Ciphertext = syndrome | `H·e`: the 3rd column of `H` | `s = 011` |
    | Decode | which column of `H` equals `011`? | column 3 |
    | Shared secret | hash of `e` and `s` | |

    The same code also carries data: the message `1011` encodes to the codeword `1011010`; flip bit 3 to get
    `1001010`, whose syndrome is again `011`, so the receiver flips bit 3 back. In the real scheme `H` is
    hidden by a random change of basis and column shuffle, so it looks like a random matrix.

??? abstract "The math, with formulas"

    **Linear codes.** A code is the set of bit vectors `c` with `H·c = 0` (mod 2). If a received `y = c + e`,
    then `H·y = H·e`: the syndrome depends only on the error.

    **Classic McEliece (Niederreiter form).** Key generation picks a binary Goppa code given by a secret
    polynomial `g(x)` of degree `t` over GF(2^m) and `n` field elements; it publishes `H` in systematic form
    `[I | T]` (only `T` is stored). Encapsulation picks `e` with exactly `t` ones and sends `C = H·e`.
    Decapsulation uses the secret `g(x)` to decode (Berlekamp–Massey) and recover `e`; the key is a
    SHAKE256 hash of `e` and `C`.

    | | n | t | m | Public key | Ciphertext |
    |---|---|---|---|---|---|
    | mceliece348864 | 3,488 | 64 | 12 | 261,120 B | 96 B |
    | mceliece6688128 | 6,688 | 128 | 13 | 1,044,992 B | 208 B |

    **HQC** uses quasi-cyclic codes: vectors of length `n` multiplied as polynomials mod `xⁿ − 1`. With sparse
    secrets `x`, `y`: public `s = x + h·y`; ciphertext `u = r₁ + h·r₂`, `v = encode(m) + s·r₂ + e`; decryption
    computes `v − u·y = encode(m) + (x·r₂ − r₁·y + e)` and the public Reed-Muller/Reed-Solomon decoder removes
    the sparse bracket.

    **Why it is hard.** Decoding a random linear code (syndrome decoding) is NP-hard in general. The best
    attacks are information-set decoding (Prange 1962 and its successors), still exponential after 60 years,
    with only a square-root speed-up from Grover's algorithm on a quantum computer.

??? tip "Watch it step by step: hiding and finding one error"

    <div class="mars-steps" markdown>

    1. Bob's code is the Hamming code; its check matrix `H` has the 7 non-zero 3-bit columns.
    2. Alice picks a secret error: a 1 in position 3, `e = 0010000`.
    3. She sends only the syndrome `H·e = 011`, the 3rd column of `H`.
    4. Bob, who knows the code's structure, finds which column is `011`: column 3.
    5. He has `e`. Both hash `e` and `011` into the shared key.
    6. With a scrambled `H` of 6,688 columns and 128 errors, nobody without the secret Goppa code can do step 4.

    </div>

??? info "The math underneath"

    - **Linear algebra over GF(2):** bits, with XOR as addition.
    - **Finite fields GF(2^m)** and polynomials over them: Goppa codes are defined by a polynomial `g(x)`.
    - **Syndrome decoding** and **information-set decoding**: the hard problem and the best attack.
    - **Quasi-cyclic codes** (HQC, BIKE): smaller keys from cyclic structure, at the cost of a less-studied
      problem.
    - Compare the lattice KEMs [ML-KEM](ML-KEM.md) and [NTRU Prime](NTRU-Prime.md).

## See also

- [ML-KEM](ML-KEM.md): the lattice KEM these back up
- [NTRU Prime](NTRU-Prime.md): another post-quantum KEM, from lattices
- [Will quantum computers break all of this?](../FAQ.md)

## References

- [NIST IR 8545 (2025)](https://csrc.nist.gov/pubs/ir/8545/final)
- [HQC specification (12 Oct 2026)](https://pqc-hqc.org/doc/hqc_specifications_2026_10_12.pdf)
- [Classic McEliece team site](https://classic.mceliece.org/), with its NIST and ISO pages
- [ISO/IEC 18033-2:2006/Amd 2:2026](https://www.iso.org/standard/86890.html)
- [McEliece's 1978 paper](https://ipnpr.jpl.nasa.gov/progress_report2/42-44/44N.PDF)
- [BSI notice, 1 Oct 2026 (German)](https://www.bsi.bund.de/DE/Service-Navi/Presse/Alle-Meldungen-News/Meldungen/2026/Classic-McEliece_261001.html)
- [Saarinen, key-recovery cost estimates (2026)](https://eprint.iacr.org/2026/1786)
