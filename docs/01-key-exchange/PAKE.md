# PAKE (Password-Authenticated Key Exchange)

*Two sides that share only a password end up with a strong key. Someone who
records the exchange, or pretends to be the other side, can't test password
guesses offline.*

**Status and standards:** see [Key exchange](../algorithms/table.md#1-key-exchange) in the
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

## The story

- **Who made it:** Steven Bellovin and Michael Merritt at AT&T Bell Labs, with EKE in 1992. Then Tom Wu's SRP (Stanford, 1998), Dan Harkins' Dragonfly (2008, the SAE of WPA3), Abdalla and Pointcheval's SPAKE2 (2005), OPAQUE by Jarecki, Krawczyk and Xu (2018) and CPace by Haase and Labrique (2019).
- **What for:** Logging in with a password without giving anyone a way to test guesses offline.
- **What it solved:** With an ordinary handshake, a recorded exchange or a stolen password hash can be attacked at home at billions of guesses a second. A PAKE makes every guess cost one live conversation with the real server.
- **Where it stands:** EKE's patent (until 2011) kept PAKEs out of use for two decades. Today SAE secures WPA3 Wi-Fi, SRP runs in Apple's iCloud Keychain and in 1Password, and in 2020 the IRTF's CFRG chose CPace and OPAQUE as its recommended designs.
- **Incidents:** **Dragonblood (2019):** Mathy Vanhoef and Eyal Ronen showed that WPA3's SAE leaked password information through timing and cache side channels, and that WPA3 networks could be downgraded to WPA2. The Wi-Fi Alliance tightened the rules. WhatsApp's end-to-end encrypted backups (2021) use OPAQUE.

## How it works

**SPAKE2** is Diffie-Hellman with the password as a mask. $w$ is a slow hash of
the password; $M$ and $N$ are fixed group elements whose logs nobody knows.

1. Alice sends $p_A = g^x \cdot M^w$. Bob sends $p_B = g^y \cdot N^w$.
2. Alice strips the mask: $(p_B / N^w)^x = g^{xy}$. Bob gets the same from $p_A$.
3. Both hash the transcript $(\text{names}, p_A, p_B, g^{xy}, w)$ into the key and confirm
   it with a MAC.

Every guess of $w$ leaves $p_A$ and $p_B$ looking equally random, so a recording is
useless, and a fake Bob gets one guess per run.

**CPace** and **SAE** hash the password (plus a session ID, or for SAE both
MAC addresses) onto a group element and run Diffie-Hellman with that element
as the generator.

**OPAQUE** uses an OPRF (RFC 9497): the client gets $F(k, \text{password})$ for a
server key $k$, and the server never sees the password. That output, stretched
with Argon2id, rebuilds the client's private key for an authenticated
Diffie-Hellman with the server. A stolen database still costs one Argon2id per
guess, and nothing could be precomputed.

**SRP** stores a salt and $v = g^x$, where $x$ is a hash of the salt and password.
The salt goes out before login, so guesses can be precomputed.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 360" role="img" aria-labelledby="sk-c-pake-t"><title id="sk-c-pake-t">Alice and Bob each send a Diffie-Hellman value masked by the password; someone recording cannot test password guesses against it</title><defs><filter id="sk-c-pake-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-pake-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-pake-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-pake-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-pake-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="360" filter="url(#sk-c-pake-paper)"/><g filter="url(#sk-c-pake-pen)"><text x="30" y="44" class="h">The password is a mask, not a message</text><path class="p gold" d="M30 100 L180 100 L180 160 L30 160Z"/><text x="105.0" y="130.0" text-anchor="middle" class="s">Alice</text><text x="105.0" y="148.0" text-anchor="middle" class="s">knows the password</text><path class="p gold" d="M460 100 L610 100 L610 160 L460 160Z"/><text x="535.0" y="130.0" text-anchor="middle" class="s">Bob</text><text x="535.0" y="148.0" text-anchor="middle" class="s">knows the password</text><path class="p " d="M182 120 L456 120" marker-end="url(#sk-c-pake-ah)"/><text x="320" y="112" text-anchor="middle" class="s">gˣ masked by the password</text><path class="p " d="M456 145 L182 145" marker-end="url(#sk-c-pake-ah)"/><text x="320" y="170" text-anchor="middle" class="s">gʸ masked by the password</text><path class="p rust" d="M200 220 L440 220 L440 280 L200 280Z"/><text x="320.0" y="250.0" text-anchor="middle" class="s">someone recording</text><text x="320.0" y="268.0" text-anchor="middle" class="s">tries guess after guess</text><text x="30" y="320" class="s">Every guess unmasks to a value that looks just as random as the right one, so the</text><text x="30" y="340" class="s">recording gives nothing to check guesses against. A fake Bob gets one guess per try.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

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
- Check every received group element and never reuse $x$ or $y$ (RFC 9382).
- SRP leaks the salt and has no TLS 1.3 version.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: SPAKE2 with small numbers"

    The group is the numbers mod $p = 23$ with generator $g = 5$. The fixed elements are $M = 7$ and $N = 11$
    (in real SPAKE2 nobody knows their logarithms). The password hashes to $w = 4$. Checked with Python:

    | Step | Alice | Bob |
    |---|---|---|
    | Secret | $x = 6$ | $y = 15$ |
    | DH value | $g^x = 5^6 \bmod 23 = 8$ | $g^y = 5^{15} \bmod 23 = 19$ |
    | Mask | $M^w = 7^4 \bmod 23 = 9$ | $N^w = 11^4 \bmod 23 = 13$ |
    | Send | $p_A = 8 \cdot 9 \bmod 23 = 3$ | $p_B = 19 \cdot 13 \bmod 23 = 17$ |
    | Unmask | $p_B / N^w = 17 \cdot 13^{-1} = 17 \cdot 16 \bmod 23 = 19$ | $p_A / M^w = 3 \cdot 9^{-1} = 3 \cdot 18 \bmod 23 = 8$ |
    | Shared value | $19^6 \bmod 23 = 2$ | $8^{15} \bmod 23 = 2$ |

    An attacker who recorded 3 and 17 and tries password guesses $w = 1, 2, 3, 5$ with Alice's side would get
    9, 1, 18, 13: all look equally plausible, and only an online try against Bob tells right from wrong.

??? abstract "The math, with formulas"

    **SPAKE2 (RFC 9382).** In a prime-order group with generator $G$, fixed $M$, $N$, and $w$ from a slow
    password hash:

    $$
    \begin{aligned}
    &\text{Alice: } p_A = x \cdot G + w \cdot M && \text{Bob: } p_B = y \cdot G + w \cdot N \\
    &\text{Alice: } K = x \cdot (p_B - w \cdot N) = xy \cdot G && \text{Bob: } K = y \cdot (p_A - w \cdot M) = xy \cdot G \\
    &\mathit{key} = \mathrm{Hash}(A, B, p_A, p_B, K, w)
    \end{aligned}
    $$

    (Written additively, as on elliptic curves; the sample uses multiplication mod 23.)

    **Why a recording is useless.** For each guess $w'$, $p_A - w' \cdot M$ is some valid group element, so every
    guess gives a consistent-looking transcript. Checking a guess needs the key confirmation, which needs a
    live run.

    **Why $M$ and $N$ must have unknown logs.** If $M = m \cdot G$ with $m$ known, an attacker posing as Bob can compute
    $p_A - w' \cdot M = x \cdot G + (w - w') \cdot m \cdot G$ and test guesses offline. RFC 9382 makes $M$ and $N$ by hashing a fixed
    string to the curve.

    **CPace** (draft-irtf-cfrg-cpace) maps $H(\text{password}, \text{session id})$ to a point $G'$ and runs plain Diffie-Hellman with $G'$.
    **OPAQUE (RFC 9807)** stores only an OPRF-protected envelope on the server, so the server never sees the
    password and a stolen database cannot be attacked with precomputation.

??? tip "Watch it step by step: a password-masked handshake"

    <div class="mars-steps" markdown>

    1. Alice and Bob both know the password, which hashes to $w = 4$. Everyone knows $g = 5$, $M = 7$, $N = 11$.
    2. Alice picks secret $x = 6$: $5^6 = 8$, masked with $7^4 = 9$, sends $8 \cdot 9 \bmod 23 = 3$.
    3. Bob picks secret $y = 15$: $5^{15} = 19$, masked with $11^4 = 13$, sends $19 \cdot 13 \bmod 23 = 17$.
    4. Alice removes Bob's mask with her copy of $w$: $17 / 13 = 19$, then $19^6 \bmod 23 = 2$.
    5. Bob removes Alice's mask: $3 / 9 = 8$, then $8^{15} \bmod 23 = 2$.
    6. Both hold 2 and prove it to each other with a MAC. With a wrong password the values differ and the MAC
       fails, giving an attacker one guess per attempt.

    </div>

??? info "The math underneath"

    - **Diffie-Hellman** ([Diffie-Hellman](Diffie-Hellman.md), [ECDH](ECDH.md)) and the discrete log
      problem.
    - **Hashing to a curve** (RFC 9380): turning a password or string into a group element with no known log.
    - **Oblivious PRFs** (RFC 9497) for OPAQUE: the server evaluates $F(k, \text{password})$ on a blinded input.
    - **Slow password hashing** ([Argon2](../08-kdf-password-hashing/Argon2.md), [scrypt](../08-kdf-password-hashing/scrypt.md))
      so each online or stolen-database guess costs real work.
    - **Inverses mod $p$** (extended Euclid), used to remove the mask.

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
