# Secret sharing

*Split a secret into $n$ shares so that any $t$ of them rebuild it and fewer
than $t$ tell you nothing. Shamir's 1979 scheme is still the one in use.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

Adi Shamir published "How to Share a Secret" in 1979, a two-page paper in
Communications of the ACM. George Blakley found a geometric scheme the same
year, but Shamir's is the one people use. You choose a threshold $t$ and a
number of shares $n$. Any $t$ shares give the secret back. Any $t - 1$ shares
give no information at all, and that doesn't rest on a hard problem: it
holds against unlimited computing power, quantum computers included.

The weak spot is the dealer. Whoever splits the secret can hand out bad
shares, and plain Shamir gives the holders no way to notice. Verifiable
secret sharing (VSS) adds public commitments so each holder can check its
own share:

- **Feldman** (FOCS 1987) publishes $g^{a_k}$ for each coefficient. It is
  simple, but $g^{\text{secret}}$ is public, so the secret stays hidden only as long
  as discrete log is hard.
- **Pedersen** (CRYPTO '91) publishes $g^{a_k} \cdot h^{b_k}$, with a second random
  polynomial and a second generator $h$ whose log nobody knows. The
  commitments reveal nothing about the secret even to unlimited power; only
  their binding rests on discrete log.

Both are the base of distributed key generation, where every participant
deals a share of its own random secret and no one ever holds the whole key.

## The story

- **Who made it:** Adi Shamir and George Blakley, independently, in 1979.
- **What for:** Splitting a secret so that any $t$ of $n$ people can rebuild it and fewer learn nothing.
- **What it solved:** Backing up a key without trusting any single person or place with it.
- **Where it stands:** In use: DNSSEC's root key has seven Recovery Key Share Holders around the world, any five of whom can help rebuild it; hardware wallets offer Shamir backups (SLIP-39).
- **Incidents:** None in the scheme; failures come from bad randomness or a dishonest dealer.

## How it works

Work mod a prime $p$ that is larger than both the secret and $n$.

- **Split:** pick random $a_1, \ldots, a_{t-1}$ and let
  $f(x) = s + a_1 x + \cdots + a_{t-1} x^{t-1} \bmod p$, so $f(0) = s$. Share $i$ is
  $(i, f(i))$ for $i = 1, \ldots, n$.
- **Rebuild:** $t$ points fix a polynomial of degree $t - 1$, and Lagrange
  interpolation gives its value at 0 directly:
  $s = \sum_i y_i \cdot \prod_{j \ne i} x_j / (x_j - x_i) \bmod p$.
- **Why $t - 1$ shares say nothing:** for every possible secret there is
  exactly one polynomial through the $t - 1$ known points and $(0, \text{guess})$.
  Every guess is equally likely.
- **Feldman's check:** shares are taken mod $q$, the prime order of a group
  with generator $g$. The dealer publishes $C_k = g^{a_k}$ (with $a_0 = s$), and
  holder $i$ checks $g^{f(i)} = \prod_k C_k^{i^k}$.

Byte strings are often shared one byte at a time over $\mathrm{GF}(256)$, the field AES
uses, so each share value is as long as the secret. SLIP-39 works this way.

## When to use it

Use it for a key that sits still: a wallet seed, a root key, a master key
in a safe. Shares go to different people or places, so one lost or stolen
share does no harm.

- **SLIP-39** (SatoshiLabs, 2017): wallet seed backups as 20- or 33-word
  shares over $\mathrm{GF}(256)$, in two levels: up to 16 groups, each split again
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
$2^{127} - 1$. Every set of three shares gives the secret back; two give a
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
- **No share at $x = 0$,** since $f(0)$ is the secret, and no two shares at
  the same $x$.
- **Shares never expire.** A holder who leaves keeps a working share. Split
  a new secret, or better, rotate the key itself.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: 2-of-3 sharing mod 17"

    Secret $s = 13$. For a threshold of 2 the polynomial is a line: pick one random coefficient, here 10, so
    $f(x) = 13 + 10x \bmod 17$. Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Share 1 | $f(1) = 23 \bmod 17$ | (1, 6) |
    | Share 2 | $f(2) = 33 \bmod 17$ | (2, 16) |
    | Share 3 | $f(3) = 43 \bmod 17$ | (3, 9) |
    | Rebuild from 1 and 3: $\lambda_1$ | $3 / (3 - 1) = 3 \cdot 2^{-1} = 3 \cdot 9 \bmod 17$ | 10 |
    | $\lambda_3$ | $1 / (1 - 3) = -2^{-1} = -9 \bmod 17$ | 8 |
    | Secret | $6 \cdot 10 + 9 \cdot 8 = 132 \bmod 17$ | **13** |

    $2^{-1} \bmod 17 = 9$ because $2 \cdot 9 = 18 \equiv 1$. The other pairs work too: shares 1 and 2 use $\lambda = 2, 16$, and
    shares 2 and 3 use $\lambda = 3, 15$; both give 13. One share alone says nothing: through (1, 6) there is a line
    for every possible secret, (0, 0) with slope 6, (0, 1) with slope 5, and so on.

??? abstract "The math, with formulas"

    Over a prime field $\mathbb{F}_p$, with threshold $t$ and shares at $x = 1, \ldots, n$:

    $$
    \begin{aligned}
    f(x) &= s + a_1 x + a_2 x^2 + \cdots + a_{t-1} x^{t-1} \pmod{p}, \qquad \text{share } i = (i, f(i)) \\
    \lambda_i &= \prod_{j \in S,\, j \ne i} \frac{x_j}{x_j - x_i} \pmod{p} \\
    s &= f(0) = \sum_{i \in S} \lambda_i \cdot y_i \pmod{p}
    \end{aligned}
    $$

    - **Lagrange coefficients** depend only on which shares are used, not on their values. So they can be
      worked out before the shares arrive.
    - **Perfect secrecy:** for $t - 1$ shares and any guess $g$, exactly one polynomial of degree $t - 1$ passes
      through them and $(0, g)$. Every secret is equally likely.
    - **Feldman check:** with $C_k = g^{a_k}$ (and $C_0 = g^s$), holder $i$ checks $g^{f(i)} = \prod_k C_k^{i^k}$.
    - **Linear:** adding two sharings point by point gives a sharing of the sum. Distributed key generation
      and threshold signatures rest on this.

??? tip "Watch it step by step: split 13, then rebuild it"

    <div class="mars-steps" markdown>

    1. The secret 13 is the height of a line where it crosses $x = 0$.
    2. A random slope, 10, fixes the line $f(x) = 13 + 10x \bmod 17$.
    3. Hand out three points on it: (1, 6), (2, 16), (3, 9).
    4. Holders 1 and 3 meet. Their Lagrange weights at $x = 0$ are 10 and 8.
    5. $6 \cdot 10 + 9 \cdot 8 = 132$, and $132 \bmod 17 = 13$. The secret is back.
    6. Holder 1 alone has one point. Any line through it could be the right one.

    </div>

??? info "The math underneath"

    - **Polynomials over a finite field:** a nonzero polynomial of degree $d$ has at most $d$ roots, so $t$ points
      fix a polynomial of degree $t - 1$, and only one.
    - **Modular inverses:** each division in $\lambda_i$ is a multiplication by an inverse mod $p$, found with extended
      Euclid or $a^{p-2}$. That is why $p$ must be prime.
    - **Reed–Solomon codes:** a list of Shamir shares is a Reed–Solomon codeword (McEliece and Sarwate,
      1981), so error-correcting decoders can rebuild the secret even when some shares are wrong.
    - **Discrete log** keeps Feldman's commitments from giving away the coefficients: see
      [hard problems](../10-math-foundations/Hard-Problems.md).
    - Used in: [threshold signatures](Threshold-Signatures.md) and [multi-party computation](MPC.md).

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
