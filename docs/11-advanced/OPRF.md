# OPRF (oblivious pseudorandom function)

*The client learns F(k, x) for a key only the server holds, and the server
learns nothing about x. A small two-party trick under OPAQUE, Privacy Pass
and password breach checks.*

**Status and standards:** see [Advanced primitives](../index.md#11-advanced-primitives) in the main table.

## What it is

A pseudorandom function `F(k, x)` looks random to anyone without the key
k. In an oblivious PRF two parties compute it together: the server holds
k, the client holds x, and only the client gets the output. The server
sees neither x nor the output, and the client learns nothing about k
beyond the outputs it asked for. Freedman, Ishai, Pinkas and Reingold
defined OPRFs at TCC 2005, for keyword search. The version in use is
Jarecki, Kiayias and Krawczyk's 2HashDH (ASIACRYPT 2014):

`F(k, x) = H(x, H'(x)ᵏ)`, where H' hashes onto a group of prime order.

RFC 9497 (December 2023, from the IRTF's CFRG) defines three modes:

- **OPRF** (mode 0x00): the protocol above.
- **VOPRF** (0x01): verifiable. The server publishes `pkS = Gᵏ` and proves
  with each answer that it used that same k, so it can't give one client
  its own key to recognize it later.
- **POPRF** (0x02): partially oblivious. Both sides also know a public
  input `info`, such as a date or a token type, and it changes the output.
  The design is from Tyagi et al. (EUROCRYPT 2022).

The suites are ristretto255-SHA512, decaf448-SHAKE256, P256-SHA256,
P384-SHA384 and P521-SHA512. The 256-bit groups give 128-bit security,
minus a little for heavy use (see Security notes).

## How it works

In a group of prime order q with generator G (the RFC writes the group
additively; this page writes it multiplicatively):

1. **Blind:** the client picks a random r and sends `B = H'(x)ʳ`.
2. **Evaluate:** the server sends back `Z = Bᵏ`.
3. **Finalize:** the client computes `N = Z^(r⁻¹ mod q) = H'(x)ᵏ` and
   outputs `H(x, N)`. The RFC hashes length-prefixed x and N with the
   label "Finalize".

B is a uniformly random group element whatever x is, so the server learns
nothing about x even with unlimited computing power. RFC 9497 calls this
unconditional input secrecy. The other half, that a client can't work out
outputs it didn't ask for, rests on the one-more gap computational
Diffie-Hellman assumption.

- **VOPRF** adds a proof that `log_G(pkS) = log_B(Z)`: a Chaum–Pedersen
  DLEQ proof, made non-interactive with Fiat–Shamir. One proof can cover a
  whole batch of answers.
- **POPRF** hashes `info` to a scalar m and uses the key `t = k + m`: the
  server returns `B^(1/t)`, and the client checks the proof against
  `pkS·Gᵐ`. One public key covers every value of `info`. Its security
  rests on a one-more gap strong Diffie-Hellman inversion assumption.

## When to use it

Use it when a server must help turn a client's secret into a strong value,
and must not see the secret.

- **OPAQUE** (RFC 9807, July 2025): the client runs the OPRF on its
  password, under a per-client key the server derives from its
  `oprf_seed` and the client's credential identifier. The output,
  stretched with Argon2id or scrypt, opens the envelope that holds the
  client's key. The server never sees the password, and a stolen database
  gives nothing to precompute against. See [PAKE](../01-key-exchange/PAKE.md).
  WhatsApp's end-to-end encrypted backups build on OPAQUE.
- **Privacy Pass** (RFC 9578, June 2024): token type 0x0001 is
  VOPRF(P-384, SHA-384). The issuer evaluates a blinded token, and later
  only the issuer, with its private key, can check it. The proof ties
  each answer to the issuer's published key. Type 0x0002 is
  [blind RSA](../02-signatures/Blind-Signatures.md), which anyone can check.
- **Password breach checks:** Apple's Password Monitoring hashes the
  password to a P-256 point and blinds it with a random β, and the server
  multiplies it by its secret α. The server also returns the bucket of
  leaked passwords whose SHA-256 starts with the same 15 bits, already
  multiplied by α. The device compares on its own side, so Apple sees only
  the 15-bit prefix. Microsoft Edge's Password Monitor (2021) runs the
  credential through an OPRF too, so a client can't run a dictionary
  attack on the breach list, then looks it up with
  [homomorphic encryption](Homomorphic-Encryption.md).
- **Private set intersection:** the server sends `F(k, y)` for each y in
  its set, the client gets `F(k, x)` for each of its own, and the client
  compares.

## Example (Python)

The three steps over the RFC 3526 2048-bit group from
[Diffie-Hellman](../01-key-exchange/Diffie-Hellman.md). Squaring a hash
mod p lands in the subgroup of order q, which stands in for H'. RFC 9497
uses elliptic-curve groups and hashes onto them with hash-to-curve
(RFC 9380); this toy has no domain separation and isn't constant-time.

```python
import hashlib, secrets

p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
q = (p - 1) // 2                        # RFC 3526 group 14; the squares mod p form a group of prime order q

def hash_to_group(x):                   # toy: hash, then square into the order-q group
    return pow(int.from_bytes(hashlib.shake_256(b"toy H2G" + x).digest(256), "big"), 2, p)

def finalize(x, N):                     # F(k, x) = H(x, H'(x)^k)
    return hashlib.sha256(x + N.to_bytes(256, "big")).hexdigest()

k = secrets.randbelow(q - 1) + 1        # the server's key

def oprf(x):
    r = secrets.randbelow(q - 1) + 1
    B = pow(hash_to_group(x), r, p)     # client blinds; this is all the server sees
    Z = pow(B, k, p)                    # server raises to k
    N = pow(Z, pow(r, -1, q), p)        # client unblinds with r⁻¹ mod q
    return B, finalize(x, N)

B1, y1 = oprf(b"hunter2")
B2, y2 = oprf(b"hunter2")
print(y1 == y2, B1 != B2)               # True True: same output, unrelated requests
print(y1 == finalize(b"hunter2", pow(hash_to_group(b"hunter2"), k, p)))   # True: it is F(k, x)
print(oprf(b"hunter3")[1] == y1)        # False
```

## Security notes

- **Each answer is a static Diffie-Hellman sample.** With Q evaluations,
  the best attacks (Brown and Gallant, 2004; Cheon, 2006) cut security by
  about `log₂(Q) / 2` bits, so a million queries cost about 10. RFC 9497
  says to rate-limit clients and rotate keys, or pick decaf448, P-384 or
  P-521 when 128 bits isn't enough.
- **Hash onto the group properly.** If `H'(x)` were `G^h(x)` with h known,
  one answer would let the client work out `F(k, x)` for every x. Use the
  RFC 9380 maps, and reject the identity element as the RFC does.
- **Plain OPRF mode proves nothing.** A server could use a different key
  for each client and tell them apart later. Use VOPRF or POPRF when that
  matters, and make sure everyone gets the same public key.
- **Online guesses still need a limit.** The server answers anyone, so it
  must rate-limit; an OPRF only stops offline guessing by those without k.
  Whoever steals k can guess offline again, which is why OPAQUE also
  stretches the output with a slow hash.
- A quantum computer could recover k from the public key or past answers.
  Blinding hides x perfectly, so the requests themselves stay private.

## See also

- [PAKE](../01-key-exchange/PAKE.md): OPAQUE, the best-known user of an OPRF
- [Blind signatures](../02-signatures/Blind-Signatures.md): the other Privacy Pass token
- [Zero-knowledge proofs](Zero-Knowledge.md): the kind of proof behind VOPRF
- [Multi-party computation](MPC.md): an OPRF is a two-party computation of one function

## References

- [Freedman, Ishai, Pinkas and Reingold, "Keyword Search and Oblivious Pseudorandom Functions" (TCC 2005)](https://doi.org/10.1007/978-3-540-30576-7_17)
- [Jarecki, Kiayias and Krawczyk, "Round-Optimal Password-Protected Secret Sharing and T-PAKE in the Password-Only Model" (ASIACRYPT 2014)](https://doi.org/10.1007/978-3-662-45608-8_13)
- [Tyagi et al., "A Fast and Simple Partially Oblivious PRF, with Applications" (EUROCRYPT 2022)](https://eprint.iacr.org/2021/864)
- [RFC 9497: OPRFs Using Prime-Order Groups](https://www.rfc-editor.org/rfc/rfc9497) / [RFC 9380: Hashing to Elliptic Curves](https://www.rfc-editor.org/rfc/rfc9380) / [RFC 3526: MODP groups](https://www.rfc-editor.org/rfc/rfc3526)
- [RFC 9807: OPAQUE](https://www.rfc-editor.org/rfc/rfc9807) / [RFC 9578: Privacy Pass issuance protocols](https://www.rfc-editor.org/rfc/rfc9578)
- [Davies et al., "Security Analysis of the WhatsApp End-to-End Encrypted Backup Protocol" (CRYPTO 2023)](https://eprint.iacr.org/2023/843)
- [Apple Platform Security: Password Monitoring](https://support.apple.com/guide/security/sec78e79fc3b/web)

*Weaker sources:* Microsoft Research's
[Password Monitor post](https://www.microsoft.com/en-us/research/blog/password-monitor-safeguarding-passwords-in-microsoft-edge/)
(2021) for Edge's OPRF step.
