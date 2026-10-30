# NTRU Prime (sntrup761)

*A lattice KEM that strips out the extra structure most lattice schemes keep
for speed. Paired with X25519, it was the first post-quantum key exchange
OpenSSH turned on by default.*

**Status and standards:** see [Key exchange](../index.md#1-key-exchange) in the
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

## How it works

Everything is a polynomial modulo x⁷⁶¹ − x − 1 with coefficients modulo
4591. Both numbers are prime. Unlike the x²⁵⁶ + 1 ring in ML-KEM, this ring
has no special symmetries (automorphisms), and modulo 4591 the polynomial
doesn't factor, so the ring is a field.

- **Key generation:** pick small polynomials f and g (coefficients −1, 0 or
  1). The public key is h = g / (3f).
- **Encapsulate:** pick a random small r with exactly 286 nonzero
  coefficients. The ciphertext is h·r with each coefficient rounded to a
  multiple of 3. That rounding is the noise, so no separate error term is
  needed. The shared secret is a hash of r and the ciphertext.
- **Decapsulate:** multiply the ciphertext by 3f. The result is small, so
  reducing it mod 3 leaves g·r, and dividing by g gives r. Then re-encrypt
  to check the ciphertext, as ML-KEM does.

Decryption never fails, which rules out the decryption-failure attacks some
other lattice KEMs suffered.

SSH runs it next to X25519 and hashes both secrets together (RFC 9941):
`K = SHA-512(sntrup761 secret ‖ X25519 secret)`.

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
