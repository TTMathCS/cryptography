# Diffie-Hellman Key Exchange

*How two parties agree on a shared secret over a channel everyone can listen to —
the idea that started public-key cryptography.*

## What it is

Published in 1976 by Whitfield Diffie and Martin Hellman, this was the first
method letting two people who have never met derive a shared secret in the open,
with an eavesdropper unable to recover it. That shared secret then keys a fast
symmetric cipher like [AES](../04-symmetric-ciphers/AES.md). Its security rests on the discrete logarithm
problem.

The classic version below works over integers mod a prime. The modern, faster
version is the elliptic-curve form — see [X25519](ECDH.md), which has largely
replaced it.

## How it works

Both sides agree on public parameters: a large prime `p` and a generator `g`.

1. Alice picks secret `a`, sends `A = gᵃ mod p`. Bob picks secret `b`, sends `B = g^b mod p`.
2. Alice computes `Bᵃ mod p`, Bob computes `A^b mod p`.
3. Both equal `g^(ab) mod p` — the shared secret.

An eavesdropper sees `p, g, A, B` but can't get `g^(ab)` without solving the
discrete log to recover `a` or `b`.

## When to use it

- **Establishing a session key** before symmetric encryption — this is what the
  handshake in TLS, SSH, and VPNs does.
- **Use ephemeral keys (DHE/ECDHE) for forward secrecy** — a fresh key pair per
  session means a later key compromise can't decrypt past traffic.
- **Prefer [X25519](ECDH.md)** for new systems: smaller, faster, harder to
  misuse than classic mod-`p` DH.

## Example (Python)

```python
from secrets import randbelow

# RFC 3526 group 14: a 2048-bit safe prime
p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
g = 2

a = randbelow(p - 3) + 2             # Alice's secret
b = randbelow(p - 3) + 2             # Bob's secret
A, B = pow(g, a, p), pow(g, b, p)    # sent in the open

print(pow(B, a, p) == pow(A, b, p))  # True: both now hold g^(ab) mod p
# run the shared secret through HKDF before using it as a key
```

## Security notes

- **Plain DH has no authentication** — it's wide open to a man-in-the-middle who
  swaps the public values. Combine it with a signature
  ([Ed25519](../02-signatures/EdDSA.md)) or certificate.
- **Derive, don't use raw.** Feed `g^(ab)` through a KDF
  ([HKDF](../08-kdf-password-hashing/HKDF.md)) before it becomes a cipher key.
- Use ephemeral keys for forward secrecy; use ≥2048-bit `p` for classic DH.
- Quantum computers break the discrete log — see
  [ML-KEM](ML-KEM.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Diffie-Hellman with small numbers"

    The textbook example, with prime `p = 23` and generator `g = 5` (real groups use primes of 2,048 bits or
    more). Checked with Python's `pow`:

    | Step | Alice | Bob |
    |---|---|---|
    | Secret | `a = 6` | `b = 15` |
    | Public value | `A = 5⁶ mod 23 = 15625 mod 23 = 8` | `B = 5¹⁵ mod 23 = 19` |
    | Send | `8` to Bob | `19` to Alice |
    | Shared secret | `19⁶ mod 23 = 2` | `8¹⁵ mod 23 = 2` |

    Both get `2 = 5^(6·15) mod 23`. An eavesdropper sees `23, 5, 8, 19`; to find the 2 they must find `a` from
    `5ᵃ ≡ 8 (mod 23)`. Here they can try all 22 exponents; at 2,048 bits that is hopeless.

??? abstract "The math, with formulas"

    **Why both sides agree.** Powers multiply: `Bᵃ = (gᵇ)ᵃ = g^(ab) = (gᵃ)ᵇ = Aᵇ (mod p)`.

    **The group.** The numbers `1 … p−1` under multiplication mod `p` form a cyclic group of order `p − 1`; a
    generator `g` reaches every element. Real deployments use a **safe prime** `p = 2q + 1` (`q` prime) and a
    `g` of order `q`, so the group has no small subgroups an attacker could use (RFC 7919 groups, e.g.
    `ffdhe2048`).

    **Discrete logarithm.** Given `g`, `p` and `A = gᵃ mod p`, finding `a` is the discrete log problem. The
    best classical attack, the number field sieve, runs in time about
    `exp((64/9)^(1/3) · (ln p)^(1/3) · (ln ln p)^(2/3))`, which puts a 2,048-bit `p` near 112-bit security.

    **Checks the receiver must make.** Reject `A` unless `1 < A < p − 1`, and for a prime-order subgroup check
    `A^q ≡ 1 (mod p)`. A value like `1` or `p − 1` forces the shared secret into a tiny set.

??? tip "Watch it step by step: two strangers agree on 2"

    <div class="mars-steps" markdown>

    1. Everyone, including the eavesdropper Eve, knows `p = 23` and `g = 5`.
    2. Alice picks a secret `a = 6` and keeps it. Bob picks `b = 15` and keeps it.
    3. Alice computes `A = 5⁶ mod 23 = 8` and sends 8. Eve sees 8.
    4. Bob computes `B = 5¹⁵ mod 23 = 19` and sends 19. Eve sees 19.
    5. Alice raises Bob's 19 to her secret: `19⁶ mod 23 = 2`.
    6. Bob raises Alice's 8 to his secret: `8¹⁵ mod 23 = 2`.
    7. Both hold 2. Eve holds 8 and 19, and would need `a` or `b` to get 2.

    </div>

??? info "The math underneath"

    - **Modular exponentiation**, done quickly by square and multiply (see the step-by-step box on
      [RSA](../02-signatures/RSA.md#going-deeper)).
    - **Cyclic groups and generators:** why `gᵃ` can land on every element, and why the order of the group
      decides which attacks work (Pohlig–Hellman breaks groups whose order has only small factors).
    - **The discrete log problem** and its relatives (computational and decisional Diffie-Hellman): see
      [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Safe primes** are found with primality tests such as
      [Miller-Rabin](../10-math-foundations/Miller-Rabin-Primality-Test.md).
    - **Quantum computers:** Shor's algorithm solves discrete logs too, which is why
      [ML-KEM](ML-KEM.md) is joining DH in hybrids.

## See also

- [X25519](ECDH.md) — the modern elliptic-curve version
- [HKDF](../08-kdf-password-hashing/HKDF.md) — turning the shared secret into keys
- [AES](../04-symmetric-ciphers/AES.md) / [ChaCha20-Poly1305](../05-modes-aead/AEAD.md) — what the key feeds

## References

- Diffie, W.; Hellman, M. (1976). "New Directions in Cryptography"
- RFC 7748: Elliptic Curves for Security (X25519)
