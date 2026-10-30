# PAKE (Password-Authenticated Key Exchange)

*Two sides that share only a password end up with a strong key. Someone who
records the exchange, or pretends to be the other side, can't test password
guesses offline.*

**Status and standards:** see [Key exchange](../index.md#1-key-exchange) in the
main table.

## What it is

A password is guessable. WPA2-Personal shows the risk: capture one handshake
and crack the Wi-Fi password at home. A PAKE mixes the password into the key
exchange itself, so each guess needs a live run against the real other side,
and rate limiting stops that. The idea dates to EKE (Bellovin and Merritt,
1992).

- **Balanced:** both sides hold the password, or the same value derived from
  it: two devices, or Wi-Fi. A stolen copy lets the thief pose as either side.
- **Augmented (aPAKE):** a client and a server. The server stores a verifier
  that a thief can't log in with; they still have to crack it offline.

| Protocol | Kind | Standard | Notes |
|---|---|---|---|
| SAE / Dragonfly | balanced | RFC 7664 (2015), IEEE 802.11 | WPA3-Personal Wi-Fi |
| SPAKE2 | balanced | RFC 9382 (2023) | Magic Wormhole; SPAKE2+ (RFC 9383) is an augmented variant |
| CPace | balanced | CFRG draft, now with the RFC Editor | CFRG's balanced pick (2020) |
| OPAQUE | augmented | RFC 9807 (2025) | CFRG's augmented pick (2020) |
| SRP | augmented | RFC 2945 (2000), RFC 5054 (2007) | Apple's iCloud Keychain escrow, old TLS-SRP |

## How it works

**SPAKE2** is Diffie-Hellman with the password as a mask. w is a slow hash of
the password; M and N are fixed group elements whose logs nobody knows.

1. Alice sends pA = gˣ·Mʷ. Bob sends pB = gʸ·Nʷ.
2. Alice strips the mask: (pB / Nʷ)ˣ = gˣʸ. Bob gets the same from pA.
3. Both hash the transcript (names, pA, pB, gˣʸ, w) into the key and confirm
   it with a MAC.

Every guess of w leaves pA and pB looking equally random, so a recording is
useless, and a fake Bob gets one guess per run.

**CPace** and **SAE** hash the password (plus a session ID, or for SAE both
MAC addresses) onto a group element and run Diffie-Hellman with that element
as the generator.

**OPAQUE** uses an OPRF (RFC 9497): the client gets F(k, password) for a
server key k, and the server never sees the password. That output, stretched
with Argon2id, rebuilds the client's private key for an authenticated
Diffie-Hellman with the server. A stolen database still costs one Argon2id per
guess, and nothing could be precomputed.

**SRP** stores a salt and v = gˣ, where x is a hash of the salt and password.
The salt goes out before login, so guesses can be precomputed.

## When to use it

- **Wi-Fi:** WPA3-Personal (SAE), with hash-to-element (H2E) on.
- **Pairing devices with a PIN:** CPace or SPAKE2.
- **Logins the server shouldn't see:** OPAQUE. Most sites send the password
  over TLS and store an [Argon2](../08-kdf-password-hashing/Argon2.md) hash,
  which is fine if you trust the server.
- **SRP:** only in old systems.

## Example (Python)

The standard library and PyCA `cryptography` have no PAKE. This toy SPAKE2
over the RFC 3526 2048-bit group shows the masking trick only: no key
confirmation, no input checks, not constant-time.

```python
import hashlib, secrets

p = int("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
        "4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
        "98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
        "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", 16)
q, g = (p - 1) // 2, 2                  # q is prime, g = 2 has order q

def element(label):                     # a group element whose log nobody knows
    h = int.from_bytes(hashlib.shake_256(label).digest(256), "big")
    return pow(h, 2, p)

M, N = element(b"toy M"), element(b"toy N")

def w_from(password):                   # slow hash of the password
    k = hashlib.pbkdf2_hmac("sha256", password.encode(), b"alice|bob", 100_000)
    return int.from_bytes(k, "big") % q

def spake2(pw_a, pw_b):
    wa, wb = w_from(pw_a), w_from(pw_b)
    x, y = secrets.randbelow(q - 1) + 1, secrets.randbelow(q - 1) + 1
    pA = pow(g, x, p) * pow(M, wa, p) % p     # Alice -> Bob
    pB = pow(g, y, p) * pow(N, wb, p) % p     # Bob -> Alice
    Ka = pow(pB * pow(N, -wa, p) % p, x, p)   # Alice strips Bob's mask
    Kb = pow(pA * pow(M, -wb, p) % p, y, p)   # Bob strips Alice's mask
    key = lambda K, w: hashlib.sha256(f"{pA}|{pB}|{K}|{w}".encode()).digest()
    return key(Ka, wa) == key(Kb, wb)

print(spake2("purple tuba", "purple tuba"))   # True
print(spake2("purple tuba", "purple tube"))   # False
```

For real use, take a reviewed implementation of the RFC, such as `opaque-ke`
(Rust, audited by NCC Group in 2021).

## Security notes

- A PAKE stops offline guessing, not online guessing. Limit failed attempts.
- Dragonblood (Vanhoef and Ronen, 2019) used timing and cache leaks in SAE's
  "hunting and pecking" loop to brute-force WPA3 passwords, and pushed clients
  down to WPA2 in transition mode. H2E replaces the loop, but hostapd still
  leaves it off by default (`sae_pwe`).
- Check every received group element and never reuse x or y (RFC 9382).
- SRP leaks the salt and has no TLS 1.3 version.

## See also

- [Diffie-Hellman](Diffie-Hellman.md) / [ECDH](ECDH.md): the exchange a PAKE builds on
- [Argon2](../08-kdf-password-hashing/Argon2.md): the slow hash on the password side
- [OPRF](../11-advanced/OPRF.md): the oblivious PRF inside OPAQUE
- [Protocols](../protocols/index.md): WPA3 next to SSH, TLS and the rest

## References

- [RFC 7664: Dragonfly](https://www.rfc-editor.org/rfc/rfc7664)
- [RFC 9382: SPAKE2](https://www.rfc-editor.org/rfc/rfc9382) / [RFC 9383: SPAKE2+](https://www.rfc-editor.org/rfc/rfc9383)
- [draft-irtf-cfrg-cpace](https://datatracker.ietf.org/doc/draft-irtf-cfrg-cpace/)
- [RFC 9807: OPAQUE](https://www.rfc-editor.org/rfc/rfc9807)
- [RFC 2945: SRP](https://www.rfc-editor.org/rfc/rfc2945) / [RFC 5054: SRP for TLS](https://www.rfc-editor.org/rfc/rfc5054)
- [CFRG PAKE selection](https://github.com/cfrg/pake-selection)
- [Vanhoef and Ronen, Dragonblood](https://wpa3.mathyvanhoef.com/)
- [Apple Platform Security: escrow security for iCloud Keychain](https://support.apple.com/guide/security/escrow-security-for-icloud-keychain-sec3e341e75d/web)
