# Blind signatures

*The signer signs a message it can't see, and can't later match the
signature to the request. Chaum's idea for digital cash, now used for
anonymous tokens on the web.*

**Status and standards:** see [Digital signatures](../algorithms/table.md#2-digital-signatures)
in the main table.

## What it is

David Chaum proposed blind signatures at CRYPTO '82 for "untraceable
payments". The bank signs your coin without seeing its serial number and
takes a dollar from your account. When a shop deposits the coin, the bank
checks its signature and refuses serials it has seen before, but can't tell
whose withdrawal the coin came from.

A scheme needs two things:

- **Blindness:** the signer can't link a finished signature to the session
  that made it.
- **One-more unforgeability:** $n$ signing sessions give the client at most $n$
  valid signatures.

RFC 9474 (October 2023, from the IRTF's CFRG) specifies the RSA version. The
result is an ordinary RSASSA-PSS signature, so any RSA-PSS verifier can
check it.

## The story

- **Who made it:** David Chaum, at CRYPTO '82, using RSA.
- **What for:** Untraceable electronic cash: the bank signs a coin without seeing it.
- **What it solved:** It let a bank check that money is real without being able to follow where each coin goes, privacy that paper cash has and card payments don't.
- **Where it stands:** Chaum's company DigiCash (1990) ran eCash with Mark Twain Bank in the US from 1995 but went bankrupt in 1998. The idea came back for privacy tokens: Apple's Private Access Tokens (2022) and Privacy Pass use RSA blind signatures, standardized in RFC 9474 (2023).
- **Incidents:** Blind signing means signing whatever the client sends. If the same RSA key is used to decrypt anything, a blind-signature request becomes a free decryption, so the key must be used for nothing else.

## How it works

The signer has an [RSA](RSA.md) key: public $(n, e)$, secret $d$.

1. **Blind** (client): encode the message as a number $m$ (RFC 9474 uses PSS
   with SHA-384), pick a random $r$ and send $m' = m \cdot r^e \bmod n$. With $r$
   random, $m'$ says nothing about $m$.
2. **BlindSign** (signer): return $s' = m'^d \bmod n$, after checking
   $s'^e = m'$ to catch faults.
3. **Finalize** (client): $s = s' \cdot r^{-1} \bmod n$. Since $(m \cdot r^e)^d = m^d \cdot r$, this
   is $m^d$, the plain RSA signature on $m$. Verify it before use.

Of RFC 9474's four variants, it advises the Randomized ones: they put 32
random bytes in front of the message, which protects clients from a
malicious signer. The Deterministic ones are for messages already random
enough.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 360" role="img" aria-labelledby="sk-c-blind-t"><title id="sk-c-blind-t">Three steps: the message is put in a random envelope, the signer signs the envelope without seeing inside, and removing the envelope leaves a normal signature on the message</title><defs><filter id="sk-c-blind-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-blind-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-blind-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-blind-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-blind-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="360" filter="url(#sk-c-blind-paper)"/><g filter="url(#sk-c-blind-pen)"><text x="30" y="44" class="h">Signing through an envelope</text><path class="p room" d="M30 100 L210 100 L210 200 L30 200Z"/><path class="p" d="M30 100 L120 150 L210 100"/><text x="120" y="230" text-anchor="middle" class="l">1 blind</text><text x="120" y="254" text-anchor="middle" class="s">the message goes in a</text><text x="120" y="272" text-anchor="middle" class="s">random envelope (× rᵉ)</text><path class="p " d="M214 150 L232 150" marker-end="url(#sk-c-blind-ah)"/><path class="p gold" d="M235 100 L415 100 L415 200 L235 200Z"/><path class="p" d="M235 100 L325 150 L415 100"/><path class="p red" d="M285 180 Q305 160 325 182 T365 178"/><text x="325" y="230" text-anchor="middle" class="l">2 sign</text><text x="325" y="254" text-anchor="middle" class="s">the signer signs the</text><text x="325" y="272" text-anchor="middle" class="s">envelope, seeing nothing</text><path class="p " d="M419 150 L437 150" marker-end="url(#sk-c-blind-ah)"/><path class="p room" d="M460 100 L600 100 L600 200 L460 200Z"/><text x="530" y="145" text-anchor="middle" class="s">m</text><path class="p red" d="M490 180 Q510 160 530 182 T570 178"/><text x="530" y="230" text-anchor="middle" class="l">3 unblind</text><text x="530" y="254" text-anchor="middle" class="s">remove the envelope (× r⁻¹):</text><text x="530" y="272" text-anchor="middle" class="s">a plain signature on m</text><text x="30" y="320" class="s">The signer can later check the signature, but cannot tell which signing it came from:</text><text x="30" y="340" class="s">the idea behind untraceable e-cash and private access tokens.</text></g></svg><figcaption>Sketched for this page. The envelope is David Chaum's own picture of the idea.</figcaption></figure>

## When to use it

- **Privacy Pass** (RFC 9576 to 9578, 2024): a client passes a check and
  gets a token for a website, which can verify it but can't link it to the
  check or to the client's other visits. Token type 2 is blind RSA with a
  2048-bit key, checked with the issuer's public key; type 1 is a VOPRF that
  needs the issuer's private key.
- **Apple's Private Access Tokens** (iOS 16 and macOS Ventura, 2022) are
  Privacy Pass tokens that replace CAPTCHAs. Apple checks the device and
  account, an issuer such as Cloudflare or Fastly signs the blinded token,
  and the site learns only that a genuine device passed. RFC 9474 also names
  iCloud Private Relay and Google One's VPN.
- **E-cash:** Chaum's company DigiCash ran ecash with a few banks from 1995
  until it went bankrupt in 1998. GNU Taler's exchange signs coins with RSA
  blind signatures today.

## Example (Python)

A toy: a 150-bit key from two [Mersenne primes](../10-math-foundations/Mersenne-Primes.md),
and a hash reduced mod $n$ in place of PSS. Real keys are 2048 bits or more.

```python
import hashlib, secrets

p, q = 2**61 - 1, 2**89 - 1                # toy key from two Mersenne primes
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))          # the signer's secret

msg = b"token 7f3a"
m = int.from_bytes(hashlib.sha256(msg).digest(), "big") % n

r = secrets.randbelow(n - 2) + 2           # client: random blinding factor
blinded = m * pow(r, e, n) % n             # this is all the signer sees

blind_sig = pow(blinded, d, n)             # signer: plain RSA on the blinded value

s = blind_sig * pow(r, -1, n) % n          # client: divide r back out
print(pow(s, e, n) == m, s == pow(m, d, n))   # True True
```

The second `True` shows the client holds exactly $m^d$, though the signer only
saw `blinded`.

## Security notes

- **Use the key for nothing else.** The signer raises any number it gets to
  $d$, so a key that also decrypts or signs anything else lets clients
  decrypt or sign whatever they like. RFC 9474 asks for one key per protocol
  and per variant.
- **The signer can't see what it signs,** so it decides by who is asking
  (an account, rate limits, device attestation). Verifiers check the message
  has the expected form.
- **Everyone must get the same public key.** A per-client key would identify
  the client later; Privacy Pass requires a consistency check (RFC 9576).
- **$r$ must come from a secure random generator.** A signer who can guess
  it can unblind the message.
- **Blind Schnorr** looks simple, but an attacker running a few hundred
  sessions at once gets one signature more than it asked for (the ROS
  attack, Benhamouda and others, 2021). Fuchsbauer, Plouviez and Seurin
  (2020) gave a fix, which Taler offers as "Clause Blind Schnorr". **Blind
  BLS** (Boldyreva, 2003) takes one round but needs pairings.
- A quantum computer running Shor's algorithm could forge tokens.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: an RSA blind signature with small numbers"

    The signer's RSA key from the [RSA](RSA.md#3-build-it-by-hand) example: $n = 3233$, $e = 17$, $d = 2753$. The
    user wants a signature on $m = 65$ without the signer seeing 65. Checked with Python:

    | Step | Who | Calculation | Value |
    |---|---|---|---|
    | Blinding factor | user | random $r = 7$ (shares no factor with $n$) | |
    | Blind | user | $m' = m \cdot r^e \bmod n = 65 \cdot 2369 \bmod 3233$ | $m' = 2034$ |
    | Sign | signer | $s' = m'^d \bmod n = 2034^{2753} \bmod 3233$ | $s' = 883$ |
    | Unblind | user | $s = s' \cdot r^{-1} \bmod n = 883 \cdot 462 \bmod 3233$ | $s = 588$ |
    | Check | anyone | $588^{17} \bmod 3233$ | 65: valid |

    The signer saw only 2034 and 883. The final signature 588 is exactly the ordinary RSA signature on 65,
    and the signer cannot link it to the session where it signed 2034.

??? abstract "The math, with formulas"

    **Why unblinding works:**

    $$
    \begin{aligned}
    s' &= (m \cdot r^e)^d = m^d \cdot r^{e d} = m^d \cdot r && \pmod{n} \\
    s &= s' \cdot r^{-1} = m^d && \pmod{n}
    \end{aligned}
    $$

    **Why the signer learns nothing.** For any message $m$ the signer might guess, there is exactly one $r$
    with $m \cdot r^e = m'$, and $r$ is uniformly random, so $m'$ is uniformly random too.

    **In practice (RFC 9474, RSABSSA).** The message is first encoded with PSS padding (and optionally a random
    prefix), so the signer is signing $\mathrm{encode}(m)$; the signer must use a key kept only for this purpose, since
    it will sign whatever value it is sent.

    **Other blind schemes.** Blind Schnorr and blind BLS work the same way with group elements. Privacy Pass
    tokens (RFC 9578) use RSA blind signatures or a VOPRF.

??? tip "Watch it step by step: signing a sealed envelope"

    <div class="mars-steps" markdown>

    1. The user has $m = 65$ and the signer's public key $(3233, 17)$.
    2. The user picks a secret $r = 7$ and computes $7^{17} \bmod 3233 = 2369$.
    3. The blinded message is $65 \cdot 2369 \bmod 3233 = 2034$; only this goes to the signer.
    4. The signer signs it: $2034^{2753} \bmod 3233 = 883$, and sends 883 back.
    5. The user divides out $r$: $883 \cdot 7^{-1} = 883 \cdot 462 \bmod 3233 = 588$.
    6. Anyone checks $588^{17} \bmod 3233 = 65$. The signer has never seen 65 or 588.

    </div>

??? info "The math underneath"

    - **RSA** ([RSA](RSA.md)) and its multiplicative property: $(a \cdot b)^d = a^d \cdot b^d \pmod{n}$.
    - **Modular inverses:** $r^{-1} \bmod n$ with the extended Euclidean algorithm.
    - **Uniform distributions:** why a random $r$ makes $m'$ carry no information about $m$.
    - **One-more unforgeability:** the security notion for blind signatures (a user who ran the protocol $k$
      times cannot produce $k + 1$ signatures).
    - Chaum's 1982 idea for untraceable digital cash, now used in Privacy Pass and anonymous credentials.

## See also

- [RSA](RSA.md): the signature underneath
- [Schnorr](Schnorr.md): the signature behind blind Schnorr

## References

- [Chaum, "Blind Signatures for Untraceable Payments" (CRYPTO '82)](https://doi.org/10.1007/978-1-4757-0602-4_18)
- [RFC 9474: RSA Blind Signatures](https://www.rfc-editor.org/rfc/rfc9474)
- [RFC 9576: Privacy Pass architecture](https://www.rfc-editor.org/rfc/rfc9576) / [RFC 9578: issuance protocols](https://www.rfc-editor.org/rfc/rfc9578)
- [Apple, "Replace CAPTCHAs with Private Access Tokens" (WWDC 2022)](https://developer.apple.com/videos/play/wwdc2022/10077/)
- [Dold, "The GNU Taler System" (PhD thesis, 2019)](https://taler.net/papers/thesis-dold-phd-2019.pdf)
- [Benhamouda et al., "On the (in)security of ROS" (2021)](https://eprint.iacr.org/2020/945) / [Fuchsbauer, Plouviez, Seurin, "Blind Schnorr Signatures and Signed ElGamal Encryption in the Algebraic Group Model" (Eurocrypt 2020)](https://eprint.iacr.org/2019/877)
- [Boldyreva, blind signatures from GDH groups (PKC 2003)](https://eprint.iacr.org/2002/118)

*Weaker sources:* DigiCash's bank years from [Wikipedia](https://en.wikipedia.org/wiki/DigiCash);
Taler's Clause Blind Schnorr option from [a Bern student thesis](https://taler.net/papers/cs-thesis.pdf).
