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

## The story

- **Who made it:** Whitfield Diffie and Martin Hellman at Stanford, in "New Directions in Cryptography" (IEEE Transactions on Information Theory, November 1976). Ralph Merkle, then a Berkeley student, had the idea of a public key agreement first (his "puzzles", written in 1974 and published in 1978), and Hellman later asked that the method be called Diffie-Hellman-Merkle. At GCHQ in Britain, Malcolm Williamson had found the same exchange around 1974, but it stayed secret until 1997.
- **What for:** Letting two strangers agree on a key over a line that anyone can listen to.
- **What it solved:** Key distribution. Before 1976 every pair of users needed a key carried in advance by courier or sealed bag; banks and armies spent fortunes on it. After it, a key can be made on the spot.
- **Where it stands:** Still sound at 2048 bits and up, but slow and large next to [X25519](ECDH.md). TLS 1.3 kept only the named groups of RFC 7919. NIST IR 8547 deprecates it after 2030 and disallows it after 2035, because Shor's algorithm breaks it, and [ML-KEM](ML-KEM.md) takes its place.
- **Incidents:** **Logjam (2015):** Adrian and 13 others showed that TLS servers could be pushed down to 512-bit "export" groups and broken in minutes, and that a few fixed 1024-bit primes were shared by millions of servers, so one big precomputation (within reach of a nation) would break them all. **Raccoon (2020):** a timing leak from how TLS 1.2 stripped leading zero bytes off the shared secret. Both led browsers to drop finite-field DH in TLS.

## How it works

Both sides agree on public parameters: a large prime $p$ and a generator $g$.

1. Alice picks secret $a$, sends $A = g^a \bmod p$. Bob picks secret $b$, sends $B = g^b \bmod p$.
2. Alice computes $B^a \bmod p$, Bob computes $A^b \bmod p$.
3. Both equal $g^{ab} \bmod p$ — the shared secret.

An eavesdropper sees $p, g, A, B$ but can't get $g^{ab}$ without solving the
discrete log to recover $a$ or $b$.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 420" role="img" aria-labelledby="sk-c-dhtoy-t"><title id="sk-c-dhtoy-t">Alice with secret 6 and Bob with secret 15 exchange 8 and 19 modulo 23 and both compute the shared secret 2; an eavesdropper sees only 23, 5, 8 and 19</title><defs><filter id="sk-c-dhtoy-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-dhtoy-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-dhtoy-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-dhtoy-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-dhtoy-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="420" filter="url(#sk-c-dhtoy-paper)"/><g filter="url(#sk-c-dhtoy-pen)"><text x="30" y="44" class="h">Diffie-Hellman with tiny numbers</text><text x="320" y="80" text-anchor="middle" class="s">public: p = 23, g = 5</text><path class="p gold" d="M30 100 L200 100 L200 180 L30 180Z"/><text x="115.0" y="140.0" text-anchor="middle" class="s">Alice</text><text x="115.0" y="158.0" text-anchor="middle" class="s">secret a = 6</text><path class="p gold" d="M440 100 L610 100 L610 180 L440 180Z"/><text x="525.0" y="140.0" text-anchor="middle" class="s">Bob</text><text x="525.0" y="158.0" text-anchor="middle" class="s">secret b = 15</text><path class="p " d="M202 125 L438 125" marker-end="url(#sk-c-dhtoy-ah)"/><text x="320" y="117" text-anchor="middle" class="s">A = 5⁶ mod 23 = 8</text><path class="p " d="M438 160 L202 160" marker-end="url(#sk-c-dhtoy-ah)"/><text x="320" y="182" text-anchor="middle" class="s">B = 5¹⁵ mod 23 = 19</text><text x="30" y="230" class="s">Alice: 19⁶ mod 23 = 2</text><text x="440" y="230" class="s">Bob: 8¹⁵ mod 23 = 2</text><text x="320" y="270" text-anchor="middle" class="l">both now hold 2</text><path class="p rust" d="M220 300 L420 300 L420 350 L220 350Z"/><text x="320.0" y="331.0" text-anchor="middle" class="s">eavesdropper sees 23, 5, 8, 19</text><text x="30" y="385" class="s">Getting 6 back from 8 is the discrete log. With 23 it takes seconds by hand;</text><text x="30" y="405" class="s">with a 2,048-bit p nobody can do it.</text></g></svg><figcaption>Sketched for this page. Real groups use numbers hundreds of digits long.</figcaption></figure>

## When to use it

- **Establishing a session key** before symmetric encryption — this is what the
  handshake in TLS, SSH, and VPNs does.
- **Use ephemeral keys (DHE/ECDHE) for forward secrecy** — a fresh key pair per
  session means a later key compromise can't decrypt past traffic.
- **Prefer [X25519](ECDH.md)** for new systems: smaller, faster, harder to
  misuse than classic mod-$p$ DH.

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
- **Derive, don't use raw.** Feed $g^{ab}$ through a KDF
  ([HKDF](../08-kdf-password-hashing/HKDF.md)) before it becomes a cipher key.
- Use ephemeral keys for forward secrecy; use ≥2048-bit $p$ for classic DH.
- Quantum computers break the discrete log — see
  [ML-KEM](ML-KEM.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Diffie-Hellman with small numbers"

    The textbook example, with prime $p = 23$ and generator $g = 5$ (real groups use primes of 2,048 bits or
    more). Checked with Python's `pow`:

    | Step | Alice | Bob |
    |---|---|---|
    | Secret | $a = 6$ | $b = 15$ |
    | Public value | $A = 5^6 \bmod 23 = 15625 \bmod 23 = 8$ | $B = 5^{15} \bmod 23 = 19$ |
    | Send | 8 to Bob | 19 to Alice |
    | Shared secret | $19^6 \bmod 23 = 2$ | $8^{15} \bmod 23 = 2$ |

    Both get $2 = 5^{6 \cdot 15} \bmod 23$. An eavesdropper sees $23, 5, 8, 19$; to find the 2 they must find $a$ from
    $5^a \equiv 8 \pmod{23}$. Here they can try all 22 exponents; at 2,048 bits that is hopeless.

??? abstract "The math, with formulas"

    **Why both sides agree.** Powers multiply: $B^a = (g^b)^a = g^{ab} = (g^a)^b = A^b \pmod{p}$.

    **The group.** The numbers $1, \ldots, p-1$ under multiplication mod $p$ form a cyclic group of order $p - 1$; a
    generator $g$ reaches every element. Real deployments use a **safe prime** $p = 2q + 1$ ($q$ prime) and a
    $g$ of order $q$, so the group has no small subgroups an attacker could use (RFC 7919 groups, e.g.
    `ffdhe2048`).

    **Discrete logarithm.** Given $g$, $p$ and $A = g^a \bmod p$, finding $a$ is the discrete log problem. The
    best classical attack, the number field sieve, runs in time about
    $\exp\big((64/9)^{1/3} \cdot (\ln p)^{1/3} \cdot (\ln \ln p)^{2/3}\big)$, which puts a 2,048-bit $p$ near 112-bit security.

    **Checks the receiver must make.** Reject $A$ unless $1 < A < p - 1$, and for a prime-order subgroup check
    $A^q \equiv 1 \pmod{p}$. A value like $1$ or $p - 1$ forces the shared secret into a tiny set.

??? tip "Watch it step by step: two strangers agree on 2"

    <div class="mars-steps" markdown>

    1. Everyone, including the eavesdropper Eve, knows $p = 23$ and $g = 5$.
    2. Alice picks a secret $a = 6$ and keeps it. Bob picks $b = 15$ and keeps it.
    3. Alice computes $A = 5^6 \bmod 23 = 8$ and sends 8. Eve sees 8.
    4. Bob computes $B = 5^{15} \bmod 23 = 19$ and sends 19. Eve sees 19.
    5. Alice raises Bob's 19 to her secret: $19^6 \bmod 23 = 2$.
    6. Bob raises Alice's 8 to his secret: $8^{15} \bmod 23 = 2$.
    7. Both hold 2. Eve holds 8 and 19, and would need $a$ or $b$ to get 2.

    </div>

??? info "The math underneath"

    - **Modular exponentiation**, done quickly by square and multiply (see the step-by-step box on
      [RSA](../02-signatures/RSA.md#3-build-it-by-hand)).
    - **Cyclic groups and generators:** why $g^a$ can land on every element, and why the order of the group
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
