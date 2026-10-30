# Secret sharing

*Split a secret into n shares so that any t of them rebuild it and fewer
than t tell you nothing. Shamir's 1979 scheme is still the one in use.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

Adi Shamir published "How to Share a Secret" in 1979, a two-page paper in
Communications of the ACM. George Blakley found a geometric scheme the same
year, but Shamir's is the one people use. You choose a threshold t and a
number of shares n. Any t shares give the secret back. Any t − 1 shares
give no information at all, and that doesn't rest on a hard problem: it
holds against unlimited computing power, quantum computers included.

The weak spot is the dealer. Whoever splits the secret can hand out bad
shares, and plain Shamir gives the holders no way to notice. Verifiable
secret sharing (VSS) adds public commitments so each holder can check its
own share:

- **Feldman** (FOCS 1987) publishes `g^aₖ` for each coefficient. It is
  simple, but `g^secret` is public, so the secret stays hidden only as long
  as discrete log is hard.
- **Pedersen** (CRYPTO '91) publishes `g^aₖ·h^bₖ`, with a second random
  polynomial and a second generator h whose log nobody knows. The
  commitments reveal nothing about the secret even to unlimited power; only
  their binding rests on discrete log.

Both are the base of distributed key generation, where every participant
deals a share of its own random secret and no one ever holds the whole key.

## How it works

Work mod a prime p that is larger than both the secret and n.

- **Split:** pick random `a₁ … aₜ₋₁` and let
  `f(x) = s + a₁x + … + aₜ₋₁xᵗ⁻¹ mod p`, so `f(0) = s`. Share i is
  `(i, f(i))` for i = 1 … n.
- **Rebuild:** t points fix a polynomial of degree t − 1, and Lagrange
  interpolation gives its value at 0 directly:
  `s = Σ yᵢ · Π(j≠i) xⱼ / (xⱼ − xᵢ) mod p`.
- **Why t − 1 shares say nothing:** for every possible secret there is
  exactly one polynomial through the t − 1 known points and `(0, guess)`.
  Every guess is equally likely.
- **Feldman's check:** shares are taken mod q, the prime order of a group
  with generator g. The dealer publishes `Cₖ = g^aₖ` (with `a₀ = s`), and
  holder i checks `g^f(i) = Π Cₖ^(iᵏ)`.

Byte strings are often shared one byte at a time over GF(256), the field AES
uses, so each share value is as long as the secret. SLIP-39 works this way.

## When to use it

Use it for a key that sits still: a wallet seed, a root key, a master key
in a safe. Shares go to different people or places, so one lost or stolen
share does no harm.

- **SLIP-39** (SatoshiLabs, 2017): wallet seed backups as 20- or 33-word
  shares over GF(256), in two levels: up to 16 groups, each split again
  among up to 16 members. Trezor offers it as Multi-share Backup.
- **HashiCorp Vault:** the unseal key, which decrypts Vault's root key, is
  split with Shamir. `vault operator init` makes 5 shares with a threshold
  of 3 unless told otherwise.
- **DNSSEC root:** the root zone KSK operator backs up the key that
  encrypts the KSK under a five-of-seven threshold scheme. Seven Recovery
  Key Share Holders keep their pieces in tamper-evident bags in different
  places. Using the KSK takes three of seven Crypto Officers. The practice
  statement doesn't name the algorithm.

If the key is used often, rebuilding it each time puts it back on one
machine. [Threshold signatures](Threshold-Signatures.md) sign with the
shares and never rebuild it.

## Example (Python)

3-of-5 sharing mod the [Mersenne prime](../10-math-foundations/Mersenne-Primes.md)
2^127 − 1. Every set of three shares gives the secret back; two give a
random number.

```python
import secrets
from itertools import combinations

p = 2**127 - 1                          # a Mersenne prime; the secret must be below p

def split(secret, t, n):
    a = [secret] + [secrets.randbelow(p) for _ in range(t - 1)]
    return [(x, sum(c * pow(x, k, p) for k, c in enumerate(a)) % p) for x in range(1, n + 1)]

def rebuild(shares):                    # Lagrange interpolation at x = 0
    s = 0
    for xi, yi in shares:
        num = den = 1
        for xj, _ in shares:
            if xj != xi:
                num, den = num * xj % p, den * (xj - xi) % p
        s = (s + yi * num * pow(den, -1, p)) % p
    return s

secret = int.from_bytes(b"open sesame", "big")
shares = split(secret, 3, 5)
print(all(rebuild(c) == secret for c in combinations(shares, 3)))   # True: all 10 triples work
print(rebuild(shares[:2]) == secret)                                 # False: two shares aren't enough
print(rebuild(shares[2:]).to_bytes(11, "big"))                       # b'open sesame'
```

## Security notes

- **Rebuilding is the risky moment.** The whole secret exists again on one
  machine. Do it offline and wipe it after.
- **Shares aren't authenticated.** A changed share gives a wrong secret and
  no error. Worse, the cheater knows how much it changed things, so once it
  sees the wrong result it can work out the real secret. Use VSS, or keep a
  check value as SLIP-39 does with its digest share.
- **Fresh coefficients every time,** from a secure random generator.
  Guessable ones leak the secret, and reusing them for a second secret
  leaks the difference between the two.
- **No share at x = 0,** since `f(0)` is the secret, and no two shares at
  the same x.
- **Shares never expire.** A holder who leaves keeps a working share. Split
  a new secret, or better, rotate the key itself.

## See also

- [Threshold signatures](Threshold-Signatures.md): sign with the shares, never rebuild the key
- [Zero-knowledge proofs](Zero-Knowledge.md): how key-generation participants prove they know what they dealt
- [Hard problems](../10-math-foundations/Hard-Problems.md): the discrete log behind Feldman and Pedersen

## References

- [Shamir, "How to Share a Secret" (CACM, 1979)](https://doi.org/10.1145/359168.359176) / Blakley, "Safeguarding Cryptographic Keys" (AFIPS NCC, 1979)
- [Feldman, "A Practical Scheme for Non-interactive Verifiable Secret Sharing" (FOCS 1987)](https://doi.org/10.1109/SFCS.1987.4)
- [Pedersen, "Non-Interactive and Information-Theoretic Secure Verifiable Secret Sharing" (CRYPTO '91)](https://doi.org/10.1007/3-540-46766-1_9)
- [SLIP-39: Shamir's Secret-Sharing for Mnemonic Codes](https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
- [Vault: seal and unseal](https://developer.hashicorp.com/vault/docs/concepts/seal) / [vault operator init](https://developer.hashicorp.com/vault/docs/commands/operator/init)
- [DNSSEC Practice Statement for the Root Zone KSK Operator (9th ed., October 2026)](https://www.iana.org/dnssec/procedures/ksk-operator/ksk-dps-20261007.html), sections 4.2.2 and 5.2

*Weaker sources:* Trezor's [Multi-share Backup guide](https://trezor.io/guides/backups-recovery/advanced-wallets/multi-share-backup-on-trezor)
for its use of SLIP-39.
