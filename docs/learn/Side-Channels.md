# Side channels

*Attacks that never touch the math: they listen to time, power, sound, cache
and faults. Why "constant-time" code exists, and the incidents that made it
standard.*

A cipher can be perfectly sound and still give its key away through the
machine running it. A **side channel** is anything an attacker can measure
besides the inputs and outputs: how long an operation took, how much power the
chip drew, what was left in the CPU cache, even the sound of the computer.
The [security proofs](Security-Definitions.md) don't cover any of this.

## A short history

- **1943:** a Bell Telephone engineer noticed that the US Army's 131-B2
  teleprinter encryption device made spikes on an oscilloscope across the
  lab, and the plaintext could be read from them. This began the program
  later called **TEMPEST**: shielding against electromagnetic leaks. Wim van Eck
  showed in 1985 that a TV-set receiver could rebuild a computer screen's image
  from its emissions.
- **1996:** Paul Kocher, a 22-year-old consultant, showed that the time an RSA or
  Diffie-Hellman operation takes reveals the private exponent bit by bit. The
  same year Boneh, DeMillo and Lipton showed that a single **fault** in an
  RSA-CRT signature reveals a prime factor.
- **1998:** Kocher, Jaffe and Jun published **differential power analysis**:
  record the power draw of a smart card over a few hundred encryptions and use
  statistics to pull out the key. Almost every smart card of the time fell.
- **2003:** Brumley and Boneh extracted an OpenSSL server's RSA key **over a
  network** from response times.
- **2005:** Bernstein, and separately Osvik, Shamir and Tromer, recovered AES
  keys from **cache timing**: AES's table lookups take longer when the table
  entry isn't in cache.
- **2013:** Genkin, Shamir and Tromer recovered 4096-bit RSA keys from GnuPG by
  recording the **sound** of a laptop's voltage regulator with a microphone.
- **2014:** Yarom and Falkner's **Flush+Reload** read GnuPG's RSA key from another
  program sharing the same CPU, the basis of many later cloud attacks.
- **2018:** **Spectre** and **Meltdown** showed that the CPU's speculative execution
  leaks memory across security boundaries.
- **2019:** **Minerva** and **TPM-Fail** read ECDSA nonces' lengths from timing,
  in smart cards, crypto libraries and the TPM chips in PCs, and rebuilt the keys.
- **2022:** **Hertzbleed** showed that CPU frequency changes with the data being
  processed, so even "constant-time" code can leak timing from far away.

## Timing: the basic idea

Here's a password or MAC check written the obvious way:

```python
def check(tag, good):               # leaks: returns at the first wrong byte
    if len(tag) != len(good):
        return False
    for a, b in zip(tag, good):
        if a != b:
            return False
    return True
```

The more leading bytes are right, the longer it runs. An attacker tries all 256
values for the first byte, keeps the one that takes slightly longer, and moves
on: 256 tries per byte instead of $2^{256}$ in total. This broke the Xbox 360's
boot check in 2007 and Google's Keyczar library in 2009.

The fix compares every byte whatever happens:

```python
def check_ct(tag, good):            # same time whatever the bytes are
    if len(tag) != len(good):
        return False
    d = 0
    for a, b in zip(tag, good):
        d |= a ^ b
    return d == 0

import hmac
hmac.compare_digest(b"abc", b"abd")  # the standard library's version
```

(Python itself doesn't promise constant timing; real crypto code is written in
C, assembly or Rust with care. The idea is the same.)

## Square and multiply leaks its exponent

[Square and multiply](Modular-Arithmetic.md#fast-powers) does an extra
multiplication for each 1 bit of the exponent. Measure the time, or watch the
power trace, and you can read the bits: in a power trace, the 1 bits show as
visibly longer patterns. Kocher's 1996 attack was exactly this.

Defences:

- **Montgomery ladder:** always do one square and one multiply per bit,
  swapping which register gets which with a constant-time conditional swap. That's
  how [X25519](../01-key-exchange/ECDH.md) is computed.
- **Blinding:** randomise the input or exponent first, so each run is
  different. RSA libraries multiply the ciphertext by $r^e$ for a random $r$
  before decrypting and remove $r$ afterwards.
- **No secret-dependent branches or memory addresses**: the general rule of
  constant-time code.

## Cache: why AES tables are dangerous

Fast software AES looks up bytes in tables indexed by key XOR plaintext. Which
table line is fetched depends on the key, and a program sharing the CPU can tell
which lines were recently used by timing its own memory accesses. The defences:

- **AES instructions in hardware** (AES-NI on Intel and AMD since 2010, and Arm's
  crypto extensions), which take the same time for every input.
- **Bitsliced** software AES, which uses no lookups.
- Ciphers designed with no tables: [ChaCha20](../04-symmetric-ciphers/ChaCha.md)
  uses only add, rotate and XOR, one reason it was chosen for phones.

## Faults

Glitch the voltage, the clock, or shine a laser on the chip at the right moment,
and one computation goes wrong. The 1996 Bellcore attack on RSA-CRT: if the
signature $s$ is right mod $p$ but wrong mod $q$, then $\gcd(s^e - m, n) = p$. One
bad signature, one gcd, the key is gone. Software can cause faults too:
**Rowhammer** (2014) flips bits in memory by hammering neighboring rows.

Defences: verify every signature before releasing it, compute twice and compare,
and sensors in secure chips that wipe keys when the voltage or temperature look
wrong. Deterministic signatures like Ed25519 are more exposed to faults, so some
libraries add a little randomness back ("hedged" signatures).

## Power and electromagnetic analysis

**Simple power analysis** reads operations off a single trace. **Differential**
and **correlation** power analysis use many traces: guess one key byte, predict
an intermediate value (such as the S-box output) for each trace, and see which
guess correlates with the measured power. The right guess stands out. A few
hundred traces broke unprotected smart cards in 1998; today the same is done to
IoT devices with a $50 oscilloscope board.

The defence is **masking**: split every secret value into random shares, like
[secret sharing](../11-advanced/Secret-Sharing.md) inside the chip, so no single
point in the circuit depends on the secret. Post-quantum schemes like ML-KEM and
ML-DSA are harder to mask than AES, an active research area.

## Rules for writing crypto code

1. Use a well-reviewed library. Almost every side channel above was found in
   code written by experts.
2. No branch, loop bound, or memory index may depend on a secret.
3. Compare secrets with a constant-time function.
4. Check inputs (points on the curve, lengths, ranges) and fail the same way for
   every error, with no different messages, codes or timings.
5. Verify signatures before releasing them.
6. Assume physical access means physical attacks: protected hardware (HSMs,
   secure elements) for keys that matter.

## Try it

??? question "1. A server returns \"bad MAC\" in 2 ms but \"bad padding\" in 1 ms. What could go wrong?"

    It's a padding oracle by timing: the attacker learns whether padding was valid,
    which is all Vaudenay's and Lucky Thirteen's attacks need. Check the MAC first
    (encrypt-then-MAC) or make both paths take the same time with the same error.

??? question "2. Why is `if secret_bit: x = a else: x = b` a problem, and what replaces it?"

    The branch takes different paths, which shows up in timing and in the branch
    predictor. Replace it with arithmetic: `mask = -secret_bit` (all ones or zeros),
    then `x = (a & mask) | (b & ~mask)`.
