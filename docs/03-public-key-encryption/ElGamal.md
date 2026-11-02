# ElGamal encryption

*Diffie-Hellman turned into public-key encryption: a one-time key share, and
the message multiplied by the shared secret. Simple and homomorphic, but
malleable, and the ciphertext is twice the size of the message.*

**Status and standards:** see [Public-key encryption](../index.md#3-public-key-encryption)
in the main table.

## What it is

Taher ElGamal presented the scheme at CRYPTO '84 and published it in 1985 in
IEEE Transactions on Information Theory, together with a signature scheme.
It works in any group where [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md)
is hard, and its security rests on the same problem.

Its main home was OpenPGP. RFC 4880 (2007) made DSA for signatures and
ElGamal for encryption the algorithms every implementation MUST support, and
GnuPG's default key was DSA with an ElGamal subkey until versions 1.4.10 and
2.0.13 switched to RSA in September 2009.

**RFC 9580** (July 2024) replaces RFC 4880 and retires it:

- ElGamal keys (algorithm 16) are deprecated and MUST NOT be generated, and
  implementations MUST NOT encrypt to them.
- Decrypting with an old key is still allowed but SHOULD come with a warning
  that the key is too weak for modern use.
- The reason given is the PKCS#1 v1.5 padding OpenPGP wraps around the
  session key, which NIST SP 800-131A deprecates. ElGamal signatures (the old
  type 20) are forbidden too.

## How it works

Take a group with generator `g` of prime order `q`, for example the squares
modulo a safe prime `p = 2q + 1`.

- **Keys:** a secret `x`; the public key is `h = gˣ`.
- **Encrypt** a group element `m`: pick a fresh random `k`, send
  `c₁ = gᵏ` and `c₂ = m·hᵏ`.
- **Decrypt:** `m = c₂ / c₁ˣ`, because `c₁ˣ = gˣᵏ = hᵏ`.

`c₁` is a Diffie-Hellman key share made for this one message, and `hᵏ` is the
shared secret, used as a mask. If the decisional Diffie-Hellman problem is
hard in the group, `m` stays hidden. Three things follow:

- **Double size.** Two group elements go out for one element of message: 512
  bytes in a 2048-bit group. The message has to be encoded into the group
  first, so in practice it only ever carried a session key.
- **Malleable.** Anyone can multiply `c₂` by `t`, and the receiver will
  decrypt `t·m`. So it is not secure against chosen-ciphertext attacks.
- **Homomorphic.** Multiplying two ciphertexts part by part gives an
  encryption of `m₁·m₂`, and `(c₁·gʳ, c₂·hʳ)` re-randomizes a ciphertext
  without changing the message.

**Exponential ElGamal** encrypts `gᵐ` instead of `m`. Now multiplying
ciphertexts adds the messages. Decryption ends with a discrete log, which is
only feasible when the result is small, like a vote count.

## When to use it

- **Not for new encryption.** Use [HPKE](HPKE.md). [ECIES](ECIES.md) shows
  what replaced ElGamal: hash the shared secret into a symmetric key instead
  of multiplying by it.
- **Old OpenPGP keys:** keep them only to read old messages. RFC 9580
  implementations won't encrypt new ones to them.
- **E-voting,** where the homomorphism is the point. Helios 2.0 used
  exponential ElGamal to elect the UCLouvain president in 2009: ballots are
  multiplied together, and trustees who share the key decrypt only the
  totals. ElectionGuard (spec 2.1, 2024) encrypts each choice as 0 or 1 with
  a variant of it in a 4096-bit group. Mix-nets use re-randomizing to shuffle
  encrypted ballots.

## Example (Python)

Textbook ElGamal over the RFC 3526 2048-bit group from the
[Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md) page: the malleability,
then a small exponential-ElGamal tally. A toy: no padding, not constant time.

```python
from secrets import randbelow

# RFC 3526 group 14: p = 2q + 1 is a 2048-bit safe prime, and g = 2 has order q
p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
q, g = (p - 1) // 2, 2

x = randbelow(q - 1) + 1               # private key
h = pow(g, x, p)                       # public key

def encrypt(m):                        # m must lie in the order-q subgroup
    k = randbelow(q - 1) + 1           # fresh for every message
    return pow(g, k, p), m * pow(h, k, p) % p

def decrypt(c1, c2):
    return c2 * pow(c1, -x, p) % p     # divide by c1^x = h^k

c1, c2 = encrypt(100)                  # 100 is a square, so it is in the subgroup
print(decrypt(c1, c2), decrypt(c1, c2 * 2 % p))   # 100 200: doubled without the key

votes = [1, 0, 1, 1, 0]                # exponential ElGamal: encrypt g^v
A = B = 1
for v in votes:
    c1, c2 = encrypt(pow(g, v, p))
    A, B = A * c1 % p, B * c2 % p      # multiplying ciphertexts adds the votes
t = decrypt(A, B)                      # g^3, decrypted without opening a ballot
print(next(n for n in range(len(votes) + 1) if pow(g, n, p) == t))   # 3
```

## Security notes

- Encode messages into the subgroup. In the group above, `c₂` reveals whether
  `m` is a square mod `p`.
- Never reuse `k`. Two messages under the same `k` share a mask, so knowing
  one gives the other.
- OpenPGP's PKCS#1 v1.5 padding is open to padding-oracle attacks
  (RFC 9580, Section 13.5).
- Libraries disagree on details such as the shape of the group and the size
  of `k`. De Feo, Poettering and Sorniotti (CCS 2021) showed that an OpenPGP
  key made by one library and used by another can leak plaintexts, and in
  some cases the secret key.
- Use groups of 2048 bits or more. A quantum computer breaks every size.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: ElGamal with small numbers"

    The group is the numbers mod `p = 23` with generator `g = 5`. Messages are numbers 1 to 22. Checked with
    Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Private key | `x = 6` | |
    | Public key | `h = 5⁶ mod 23` | `h = 8` |
    | Message, fresh random `k` | `m = 10`, `k = 3` | |
    | `c₁` | `gᵏ = 5³ mod 23 = 125 mod 23` | `c₁ = 10` |
    | Mask | `hᵏ = 8³ mod 23 = 512 mod 23` | `6` |
    | `c₂` | `m · hᵏ = 10 · 6 mod 23 = 60 mod 23` | `c₂ = 14` |
    | Decrypt: mask again | `c₁ˣ = 10⁶ mod 23` | `6` |
    | Remove it | `c₂ · 6⁻¹ = 14 · 4 mod 23 = 56 mod 23` | `m = 10` |

    **Multiplying ciphertexts multiplies messages.** `E(3)` with `k = 4` is `(4, 6)`. Multiplying it into
    `E(10)` part by part gives `(10·4, 14·6) mod 23 = (17, 15)`, which decrypts to `7 = 10 · 3 mod 23`.

??? abstract "The math, with formulas"

    **Encrypt:** `c₁ = gᵏ`, `c₂ = m · hᵏ` (mod `p`), with a fresh random `k`. **Decrypt:** `m = c₂ · (c₁ˣ)⁻¹`.

    **Why it works:** `c₁ˣ = (gᵏ)ˣ = (gˣ)ᵏ = hᵏ`, the same mask the sender used. It is Diffie-Hellman with a
    one-time key pair `(k, gᵏ)`, the shared secret used as a multiplicative mask.

    **Security.** Recovering `m` without `x` means computing `g^(xk)` from `gˣ` and `gᵏ` (the computational
    Diffie-Hellman problem). Not learning *anything* about `m` needs the decisional version, which holds only
    in a prime-order subgroup and with `m` encoded inside it; in the full group mod `p`, whether `m` is a
    square leaks.

    **Homomorphic and malleable.** `E(m₁)·E(m₂) = (g^(k₁+k₂), m₁m₂·h^(k₁+k₂)) = E(m₁m₂)`. Useful for voting and
    mix-nets (exponential ElGamal puts `m` in the exponent, `gᵐ`, to make it additive); dangerous elsewhere,
    since anyone can turn an encryption of `m` into one of `2m`. ECIES and HPKE avoid this with an AEAD.

??? tip "Watch it step by step: encrypt and decrypt 10"

    <div class="mars-steps" markdown>

    1. Bob's public key is `h = 5⁶ mod 23 = 8`; his private key `x = 6` stays secret.
    2. Alice picks a fresh `k = 3` and sends `c₁ = 5³ mod 23 = 10`.
    3. She computes the mask `8³ mod 23 = 6` and sends `c₂ = 10 · 6 mod 23 = 14`.
    4. Bob rebuilds the mask from `c₁`: `10⁶ mod 23 = 6`.
    5. He divides it out: `14 · 6⁻¹ = 14 · 4 mod 23 = 10`. That is Alice's message.

    </div>

??? info "The math underneath"

    - **Diffie-Hellman** and the CDH and DDH problems: [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md),
      [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Quadratic residues:** why the full group mod `p` leaks one bit, and why prime-order subgroups fix it.
    - **Homomorphic encryption:** ElGamal is multiplicatively homomorphic; see
      [Homomorphic encryption](../11-advanced/Homomorphic-Encryption.md).
    - **Probabilistic encryption:** the same message encrypts differently every time because of `k`.
    - **The elliptic-curve version**, where `c₂ = M + k·Q` for a message point `M`.

## See also

- [Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md): the key exchange underneath
- [ECIES](ECIES.md) / [HPKE](HPKE.md): the hashed, authenticated versions to use today
- [RSA](../02-signatures/RSA.md): the other classic public-key encryption, use OAEP
- [DSA](../02-signatures/DSA.md) / [Schnorr](../02-signatures/Schnorr.md): signatures from the same discrete-log family

## References

- [ElGamal, "A public key cryptosystem and a signature scheme based on discrete logarithms" (IEEE Trans. Inf. Theory, 1985)](https://doi.org/10.1109/TIT.1985.1057074)
- [RFC 9580: OpenPGP](https://www.rfc-editor.org/rfc/rfc9580) (Sections 9.1, 12.6, 12.8, 13.5) / [RFC 4880](https://www.rfc-editor.org/rfc/rfc4880)
- [GnuPG 2.0.13 announcement](https://lists.gnupg.org/pipermail/gnupg-announce/2009q3/000294.html) / [GnuPG 1.4.9 key generation menu](https://github.com/gpg/gnupg/blob/gnupg-1.4.9/g10/keygen.c)
- [Adida, de Marneffe, Pereira, Quisquater, "Electing a University President using Open-Audit Voting" (EVT/WOTE 2009)](https://www.usenix.org/legacy/event/evtwote09/tech/full_papers/adida-helios.pdf)
- [ElectionGuard Design Specification 2.1 (2024)](https://github.com/microsoft/electionguard/releases/download/v2.1/EG_Spec_2_1.pdf)
- [De Feo, Poettering, Sorniotti, "On the (in)security of ElGamal in OpenPGP" (CCS 2021)](https://eprint.iacr.org/2021/923)
