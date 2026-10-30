# Homomorphic encryption

*Compute on data you can't read. The server adds or multiplies ciphertexts,
and only the key holder sees the answer. Adding is old and cheap; doing
anything at all became possible in 2009 and is still slow.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

Rivest, Adleman and Dertouzos asked in 1978 for "privacy homomorphisms":
encryption that lets a computer work on data it can't read. Textbook RSA
and ElGamal already multiply: the product of two ciphertexts decrypts to
the product of the messages.

- **Additive schemes** do one operation, as often as you like. In
  **Paillier** (EUROCRYPT '99), multiplying ciphertexts adds the messages;
  it rests on the decisional composite residuosity problem.
  **Exponential ElGamal** encrypts `gᵐ`, so multiplying adds, but
  decryption ends in a discrete log and only small totals come back (see
  [ElGamal](../03-public-key-encryption/ElGamal.md)). ISO/IEC 18033-6
  (2019) specifies both.
- **Fully homomorphic encryption (FHE)** adds and multiplies, so it can run
  any circuit. Gentry built the first scheme in 2009, from ideal lattices.
  The ones in use rest on learning with errors, mostly the ring version:
  - **BGV** (Brakerski, Gentry and Vaikuntanathan, 2011) and **BFV**
    (Brakerski, 2012; Fan and Vercauteren, 2012): exact arithmetic mod a
    plaintext modulus, with thousands of values packed in one ciphertext.
  - **CKKS** (Cheon, Kim, Kim and Song, ASIACRYPT 2017): approximate
    arithmetic on real numbers, for statistics and machine learning.
  - **TFHE** (Chillotti, Gama, Georgieva and Izabachène, ASIACRYPT 2016):
    a bit or a small integer per ciphertext, refreshed after every gate.

The HomomorphicEncryption.org group published a security standard in
November 2018. It specifies BGV and BFV, lists CKKS as an alternative, and
gives lattice parameters for 128, 192 and 256-bit security. ISO/IEC 28033
is still in draft: Parts 1 (general) and 2 (BGV, BFV) have been through DIS
ballots, and Parts 3 (CKKS) and 4 (CGGI, the TFHE scheme) went to the final
FDIS ballot in September 2026.

## How it works

### Paillier

Take primes p and q, `n = pq`, `λ = lcm(p − 1, q − 1)` and `μ = λ⁻¹ mod n`.

- **Encrypt:** `c = (n + 1)ᵐ · rⁿ mod n²`, with a fresh random r.
- **Decrypt:** `m = L(c^λ mod n²) · μ mod n`, where `L(u) = (u − 1) / n`.
- **Why it adds:** `(n + 1)ᵐ = 1 + m·n mod n²`, so exponents add when
  ciphertexts multiply. The random parts multiply into another `rⁿ`, which
  raising to λ wipes out. `c^k` encrypts `k·m`.

Two Paillier ciphertexts can't be multiplied together. A 2048-bit n gives
4096-bit ciphertexts.

### Lattice schemes and noise

An LWE ciphertext hides the message under small random noise (see
[lattices](../10-math-foundations/Hard-Problems.md#lattices)). Decryption
works while the noise stays under a bound. Adding ciphertexts adds their
noise; multiplying makes it much bigger, and after enough multiplications
it swamps the message.

- **Leveled:** pick parameters big enough for the circuit's multiplicative
  depth. BGV and CKKS move to a smaller modulus after each multiplication
  (CKKS calls it rescaling), which scales the noise down too. Many
  deployments work this way and never go further.
- **Bootstrapping:** Gentry's idea. The server runs the decryption circuit
  homomorphically, using an encryption of the secret key. Out comes a
  fresh, low-noise ciphertext of the same message, so the computation can
  go on forever. This assumes the scheme stays secure when it encrypts its
  own key ("circular security"), which nobody has proved.
- **TFHE** bootstraps after every gate, and can apply a small lookup table
  on the way. ISO/IEC 28033-4 is named after this: "look-up table
  evaluation".

### Real speeds

- Gentry and Halevi's 2011 implementation took 30 minutes per bootstrap at
  its largest setting, with a 2.3 GB public key.
- TFHE brought a bootstrapped gate under 0.1 seconds in 2016, and to 13 ms
  on one core in the 2019 journal version. A CPU does a plain gate in well
  under a nanosecond, so that is still over ten million times slower.
- At ring size 8192 the 2018 standard allows a 218-bit modulus for 128-bit
  security, so one BFV ciphertext is about 450 KB. It holds up to 8192
  packed values.

## When to use it

Use it when one side has the data, another does the computation, and the
data owner doesn't trust the other side with it. The server works blind:
it can't branch on the data or prove the result is right.

- **Sums and tallies:** Paillier or exponential ElGamal, as in e-voting.
  Threshold ECDSA (GG18, CGGMP) also uses Paillier, to multiply secret
  shares; see [Threshold signatures](Threshold-Signatures.md).
- **Private lookups:** Apple's Live Caller ID Lookup (iOS 18) sends the
  phone number encrypted under BFV, and the server answers without learning
  which number was asked.
- **Private search:** Enhanced Visual Search in Photos (2024) encrypts an
  8-bit embedding of a possible landmark. Apple's server scores it against
  its database under BFV and returns encrypted scores, through a
  third-party OHTTP relay that hides the device's IP address.
- **Private set intersection:** Chen, Laine and Rindal (CCS 2017) matched
  5,000 items against 16 million in 36 seconds online and 12.5 MB of
  traffic. Microsoft Edge's Password Monitor (2021) builds on that work and
  the SEAL library, with an [OPRF](OPRF.md) in front.

When several parties each hold part of the input, [multi-party
computation](MPC.md) is often faster. FHE needs only one round.

## Example (Python)

Paillier with the [Mersenne primes](../10-math-foundations/Mersenne-Primes.md)
2^61 − 1 and 2^89 − 1, so n has 150 bits. Real moduli are 2048 bits or
more, from random primes.

```python
import secrets
from math import lcm

p, q = 2**61 - 1, 2**89 - 1             # toy primes; a real n has 2048 bits or more
n, n2 = p * q, (p * q) ** 2
lam = lcm(p - 1, q - 1)                 # the private key
mu = pow(lam, -1, n)

def enc(m):
    r = secrets.randbelow(n - 1) + 1    # fresh r every time
    return pow(n + 1, m, n2) * pow(r, n, n2) % n2

def dec(c):
    return (pow(c, lam, n2) - 1) // n * mu % n

a, b = enc(20), enc(22)
print(dec(a * b % n2))                  # 42: multiplying ciphertexts adds the messages
print(dec(pow(a, 3, n2)))               # 60: a power multiplies by a known number
print(enc(20) == enc(20))               # False: same message, different ciphertext

votes = [enc(v) for v in (1, 0, 1, 1, 0, 1)]
total = 1
for c in votes:
    total = total * c % n2              # the tally runs on ciphertexts only
print(dec(total))                       # 4
```

## Security notes

- **Malleable by design.** Anyone can turn a ciphertext into a related
  one, so none of these can be CCA2-secure. Sign what parties submit, and
  never decrypt whatever anyone sends you.
- **No check on the result.** The server can run a different function or
  send back an old ciphertext. ISO/IEC 28033-1 leaves verifying the
  computation out of scope.
- **CKKS decryptions can leak the key.** Li and Micciancio (EUROCRYPT 2021)
  recovered the secret key from decrypted CKKS results in HEAAN, SEAL,
  HElib and PALISADE. Don't show CKKS outputs to the party that computed
  them unless noise is added first.
- **Fresh r in Paillier.** Two ciphertexts with the same r give
  `c₁ / c₂ = (n + 1)^(m₁ − m₂)`, so anyone can read the difference.
- **The output can leak the function** through its noise. If the function
  is secret, add fresh noise before sending the result back.
- Paillier and exponential ElGamal fall to Shor's algorithm. The lattice
  schemes are believed to resist quantum computers.

## See also

- [ElGamal](../03-public-key-encryption/ElGamal.md): exponential ElGamal and e-voting
- [Multi-party computation](MPC.md): when several parties hold the inputs
- [Threshold signatures](Threshold-Signatures.md): Paillier inside threshold ECDSA
- [Hard problems](../10-math-foundations/Hard-Problems.md): LWE, under every FHE scheme here

## References

- Rivest, Adleman and Dertouzos, "On Data Banks and Privacy Homomorphisms" (Foundations of Secure Computation, 1978)
- [Paillier, "Public-Key Cryptosystems Based on Composite Degree Residuosity Classes" (EUROCRYPT '99)](https://doi.org/10.1007/3-540-48910-X_16) / [ISO/IEC 18033-6:2019](https://www.iso.org/standard/67740.html)
- [Gentry, "Fully Homomorphic Encryption Using Ideal Lattices" (STOC 2009)](https://doi.org/10.1145/1536414.1536440) / [Gentry and Halevi (EUROCRYPT 2011)](https://eprint.iacr.org/2010/520)
- [Brakerski, Gentry and Vaikuntanathan (ITCS 2012)](https://eprint.iacr.org/2011/277) / [Brakerski (CRYPTO 2012)](https://eprint.iacr.org/2012/078) / [Fan and Vercauteren (2012)](https://eprint.iacr.org/2012/144)
- [Cheon, Kim, Kim and Song (ASIACRYPT 2017)](https://eprint.iacr.org/2016/421)
- [Chillotti et al. (ASIACRYPT 2016)](https://eprint.iacr.org/2016/870) / [TFHE (J. Cryptology, 2019)](https://eprint.iacr.org/2018/421)
- [Homomorphic Encryption Security Standard (November 2018)](https://homomorphicencryption.org/standard/)
- ISO/IEC 28033, fully homomorphic encryption: [Part 1](https://www.iso.org/standard/87638.html), [Part 2](https://www.iso.org/standard/87639.html), [Part 3](https://www.iso.org/standard/87640.html), [Part 4](https://www.iso.org/standard/87641.html)
- [Li and Micciancio, "On the Security of Homomorphic Encryption on Approximate Numbers" (EUROCRYPT 2021)](https://eprint.iacr.org/2020/1533)
- [Chen, Laine and Rindal, "Fast Private Set Intersection from Homomorphic Encryption" (CCS 2017)](https://eprint.iacr.org/2017/299)
- [Apple, "Combining Machine Learning and Homomorphic Encryption in the Apple Ecosystem" (2024)](https://machinelearning.apple.com/research/homomorphic-encryption) / [swift-homomorphic-encryption](https://github.com/apple/swift-homomorphic-encryption)

*Weaker sources:* the Swift.org post
[announcing Swift Homomorphic Encryption](https://www.swift.org/blog/announcing-swift-homomorphic-encryption/)
for Live Caller ID Lookup in iOS 18; Microsoft Research's
[Password Monitor post](https://www.microsoft.com/en-us/research/blog/password-monitor-safeguarding-passwords-in-microsoft-edge/)
(2021); the ISO/IEC 28033 stages from the Serbian standards institute's
copy of the ISO project data, since iso.org didn't load.
