# ECIES (Elliptic Curve Integrated Encryption Scheme)

*How to encrypt to an elliptic-curve key: a one-time ECDH key, a KDF, then a
symmetric cipher and a MAC. Several standards, many options, and two
implementations rarely interoperate.*

**Status and standards:** see [Public-key encryption](../algorithms/table.md#3-public-key-encryption)
in the main table.

## What it is

ECIES is the elliptic-curve form of DHIES, which Abdalla, Bellare and Rogaway
published as DHAES in 1999 and analyzed at CT-RSA 2001. It fixes the problems
of [ElGamal](ElGamal.md): instead of multiplying the message by the
Diffie-Hellman secret, it hashes the secret into keys for a cipher and a MAC.
Messages can be any length, the overhead is one point plus a tag, and the MAC
stops chosen-ciphertext tampering.

It was standardized several times, each with its own menu:

| Standard | Year | Notes |
|---|---|---|
| SEC 1 | 2000, v2.0 2009 | **KDF:** X9.63 or NIST concatenation KDF<br>**Cipher:** XOR, 3DES-CBC, AES-CBC or AES-CTR<br>**MAC:** HMAC or CMAC |
| ANSI X9.63 | 2001 | US financial standard; defines the X9.63 KDF most profiles use |
| IEEE 1363a | 2004 | amendment to IEEE 1363-2000 |
| ISO/IEC 18033-2 | 2006 | split into ECIES-KEM plus a separate DEM (cipher and MAC) |

## The story

- **Who made it:** Michel Abdalla, Mihir Bellare and Phillip Rogaway (DHAES, 1999); Victor Shoup's work shaped the ISO version.
- **What for:** Encrypting a message of any length to someone's elliptic-curve public key, safely.
- **What it solved:** ElGamal's limits: it handles only short messages and can be tampered with. ECIES hashes the shared secret into keys for a cipher and a MAC, so it handles any length and rejects modified ciphertexts.
- **Where it stands:** Still used (Ethereum's network layer, many apps and smart cards), but each standard picked different parts, so versions rarely work together. New designs use [HPKE](HPKE.md).
- **Incidents:** Implementations that skipped point validation were open to invalid-curve attacks, as with ECDH. The many incompatible choices are the main reason HPKE was written.

## How it works

The recipient has a key pair $(d, Q = d \cdot G)$. To encrypt $M$ (SEC 1 form):

1. Pick a fresh ephemeral key $k$ and compute $R = k \cdot G$.
2. The shared secret $Z$ is the $x$ coordinate of $k \cdot Q$.
3. Run $Z$ through the KDF and split the output into an encryption key $\mathit{EK}$
   and a MAC key $\mathit{MK}$.
4. Encrypt $\mathit{EM} = \mathrm{ENC}(\mathit{EK}, M)$ and compute the tag $D = \mathrm{MAC}(\mathit{MK}, \mathit{EM})$.
5. Send $R \,\Vert\, \mathit{EM} \,\Vert\, D$.

The recipient computes $d \cdot R$, the same point, derives the same keys, checks
the tag and only then decrypts. Each key encrypts one message, so SEC 1 even
uses a zero IV for CBC and CTR. The extra bytes are one point (32 for
X25519, 33 or 65 for P-256) and a tag, where ElGamal doubles the message.

**Variants.** Every step is an option: KDF, cipher and MAC, plain or
cofactor Diffie-Hellman, compressed points or not, and whether $R$ goes into
the KDF. ISO 18033-2 hashes $R$ in by default. SEC 1 hashes only $Z$ (plus
optional shared info), which leaves what it calls benign malleability:
re-encoding $R$, say compressed instead of uncompressed, gives a second valid
ciphertext of the same message. Newer variants swap the cipher and MAC for
one AEAD such as AES-GCM. Two products that both "do ECIES" usually can't
read each other's messages.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 385" role="img" aria-labelledby="sk-c-ecies-t"><title id="sk-c-ecies-t">A fresh secret k gives the point R and, with the recipient's public key, a shared secret that a KDF splits into an encryption key and a MAC key; R, the encrypted message and the tag are sent</title><defs><filter id="sk-c-ecies-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-ecies-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-ecies-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-ecies-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-ecies-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="385" filter="url(#sk-c-ecies-paper)"/><g filter="url(#sk-c-ecies-pen)"><text x="30" y="44" class="h">One fresh key per message</text><path class="p gold" d="M30 90 L150 90 L150 134 L30 134Z"/><text x="90.0" y="118.0" text-anchor="middle" class="s">fresh k</text><path class="p " d="M152 112 L228 112" marker-end="url(#sk-c-ecies-ah)"/><path class="p room" d="M230 90 L330 90 L330 134 L230 134Z"/><text x="280.0" y="118.0" text-anchor="middle" class="s">R = k·G</text><path class="p " d="M90 136 L90 180" marker-end="url(#sk-c-ecies-ah)"/><path class="p room" d="M30 182 L150 182 L150 226 L30 226Z"/><text x="90.0" y="210.0" text-anchor="middle" class="s">k · Q</text><path class="p " d="M152 204 L228 204" marker-end="url(#sk-c-ecies-ah)"/><path class="p room" d="M230 182 L330 182 L330 226 L230 226Z"/><text x="280.0" y="210.0" text-anchor="middle" class="s">KDF</text><path class="p " d="M332 196 L400 170" marker-end="url(#sk-c-ecies-ah)"/><path class="p " d="M332 214 L400 240" marker-end="url(#sk-c-ecies-ah)"/><path class="p room" d="M402 150 L492 150 L492 190 L402 190Z"/><text x="447.0" y="176.0" text-anchor="middle" class="s">EK</text><path class="p room" d="M402 222 L492 222 L492 262 L402 262Z"/><text x="447.0" y="248.0" text-anchor="middle" class="s">MK</text><text x="500" y="176" class="s">encrypt</text><text x="500" y="248" class="s">tag</text><text x="30" y="290" class="l">sent:</text><path class="p gold" d="M100 270 L210 270 L210 310 L100 310Z"/><text x="155.0" y="296.0" text-anchor="middle" class="s">R</text><path class="p room" d="M210 270 L470 270 L470 310 L210 310Z"/><text x="340.0" y="296.0" text-anchor="middle" class="s">EM: encrypted message</text><path class="p rust" d="M470 270 L580 270 L580 310 L470 310Z"/><text x="525.0" y="296.0" text-anchor="middle" class="s">D: tag</text><text x="30" y="350" class="s">The recipient computes d · R, which is the same point as k · Q, rebuilds both keys,</text><text x="30" y="370" class="s">checks the tag, and only then decrypts.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## When to use it

- **New designs: use [HPKE](HPKE.md).** RFC 9180 was written because the
  ECIES variants don't interoperate, and some use outdated primitives, lack a
  chosen-ciphertext proof or have no test vectors.
- **Where a profile already fixes every option,** ECIES is fine:
    - **5G:** the phone encrypts its permanent subscriber ID to the home
      network's key, so it never crosses the air in the clear (the result is
      the SUCI). 3GPP TS 33.501 Annex C fixes Profile A (X25519) and Profile B
      (P-256 with compressed points), both with the X9.63 KDF over SHA-256,
      AES-128-CTR and HMAC-SHA-256 cut to 8 bytes.
    - **Ethereum:** the RLPx handshake between nodes encrypts its first two
      messages with ECIES on secp256k1 (NIST concatenation KDF, AES-128-CTR,
      HMAC-SHA-256).
    - **Apple platforms:** the Security framework has ECIES modes such as
      `eciesEncryptionCofactorVariableIVX963SHA256AESGCM`.
    - **Google Tink** still supports ECIES key types based on ISO 18033-2,
      but marks them no longer recommended and points to HPKE.

## Example (Python)

An ECIES-style scheme in the AEAD shape: X25519, HKDF-SHA256 with $R$ and
the recipient key in the info string, and AES-128-GCM. Needs PyCA
`cryptography` (`pip install cryptography`). Run with version 50.0.1 on
Python 3.13, it prints `53 b'hello'`.

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

def kdf(z, R, Q):
    return HKDF(algorithm=hashes.SHA256(), length=16, salt=None, info=R + Q).derive(z)

def encrypt(pub, m):
    e = X25519PrivateKey.generate()                    # fresh for every message
    R = e.public_key().public_bytes_raw()
    key = kdf(e.exchange(pub), R, pub.public_bytes_raw())
    return R + AESGCM(key).encrypt(bytes(12), m, None)  # one key, one message: zero nonce is fine

def decrypt(priv, c):
    R = c[:32]
    key = kdf(priv.exchange(X25519PublicKey.from_public_bytes(R)), R,
              priv.public_key().public_bytes_raw())
    return AESGCM(key).decrypt(bytes(12), c[32:], None)

d = X25519PrivateKey.generate()
c = encrypt(d.public_key(), b"hello")
print(len(c), decrypt(d, c))   # 53 b'hello': 32-byte R + 5 + 16-byte tag
```

Each line is a choice some standard pins down differently. The
[HPKE](HPKE.md) example does the same job in three lines.

## Security notes

- Validate $R$: check it is on the curve, or use X25519 or cofactor
  Diffie-Hellman. An invalid point can leak bits of the private key through
  small-subgroup attacks.
- Hash $R$ and the recipient key into the KDF, as ISO 18033-2 and HPKE do.
- Check the tag before decrypting, in constant time.
- No sender authentication: anyone with $Q$ can encrypt. Sign the message if
  the sender matters.
- A quantum computer breaks it like all elliptic-curve schemes; see the
  post-quantum part of [HPKE](HPKE.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: ECIES with a tiny curve"

    Bob's key from the [ECDH](../01-key-exchange/ECDH.md#going-deeper) example: curve $y^2 = x^3 + 2x + 2 \pmod{17}$,
    $G = (5, 1)$, private $b = 10$, public $Q_B = (7, 11)$. The KDF and MAC are real SHA-256 and HMAC, cut
    short to fit; checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Ephemeral key | Alice picks $a = 3$, $R = 3 \cdot G$ | $R = (10, 6)$ |
    | Shared point | $3 \cdot Q_B$ | $(13, 10)$ |
    | KDF | `SHA-256("13")`, first 6 bytes | `3fdb a35f04dc` |
    | Split | 2-byte stream key, 4-byte MAC key | `3fdb`, `a35f04dc` |
    | Encrypt `"Hi"` = `48 69` | XOR with `3f db` | `77 b2` |
    | Tag | `HMAC-SHA256(a35f04dc, 77b2)`, first 4 bytes | `7ea8cbf6` |
    | Send | $R$, ciphertext, tag | $(10, 6)$, `77b2`, `7ea8cbf6` |

    Bob computes $10 \cdot R = (13, 10)$, runs the same KDF, checks the tag, and XORs `77 b2` with `3f db` to get
    `48 69`, "Hi".

??? abstract "The math, with formulas"

    **Encrypt to $Q_B$:**

    $$
    \begin{aligned}
    & r \leftarrow \text{random}, \quad R = r \cdot G \\
    & Z = x\text{-coordinate of } r \cdot Q_B \\
    & (k_{\mathrm{enc}} \,\Vert\, k_{\mathrm{mac}}) = \mathrm{KDF}(Z, R, \text{shared info}) \\
    & c = \mathrm{Enc}(k_{\mathrm{enc}}, m), \quad t = \mathrm{MAC}(k_{\mathrm{mac}}, c \,\Vert\, \text{shared info}) \\
    & \text{send } (R, c, t)
    \end{aligned}
    $$

    **Decrypt:** $Z = x(b \cdot R)$; derive the same keys; check $t$ before decrypting.

    **Why it works:** $b \cdot R = b \cdot r \cdot G = r \cdot (b \cdot G) = r \cdot Q_B$, as in ECDH.

    **Why each piece is there.** The fresh $R$ makes every ciphertext different (no deterministic leaks). The
    KDF turns the structured point into uniform keys. The MAC (or an AEAD) stops the malleability of
    [ElGamal](ElGamal.md): a tampered $c$ fails the check. Checking that $R$ is on the curve stops
    invalid-curve attacks. SEC 1 offers XOR or a block cipher for $\mathrm{Enc}$; modern profiles use AES-GCM or
    ChaCha20-Poly1305, which is what [HPKE](HPKE.md) standardized.

??? tip "Watch it step by step: sealing \"Hi\" to Bob"

    <div class="mars-steps" markdown>

    1. Bob's public key is the point $(7, 11)$.
    2. Alice makes a one-time key $a = 3$ and the point $R = 3 \cdot G = (10, 6)$.
    3. She computes $3 \cdot (7, 11) = (13, 10)$; only she and Bob can get this point.
    4. SHA-256 of "13" gives the stream key `3fdb` and the MAC key `a35f04dc`.
    5. "Hi" (`48 69`) XOR `3f db` is `77 b2`; the HMAC tag is `7ea8cbf6`. She sends $R$, `77b2` and the tag.
    6. Bob computes $10 \cdot (10, 6) = (13, 10)$, derives the same keys, checks the tag and recovers "Hi".

    </div>

??? info "The math underneath"

    - **ECDH** and elliptic-curve arithmetic: [ECDH](../01-key-exchange/ECDH.md), [Elliptic curves](../10-math-foundations/Elliptic-Curves.md).
    - **Key derivation functions:** [HKDF](../08-kdf-password-hashing/HKDF.md) and the X9.63 KDF.
    - **Authenticated encryption:** encrypt-then-MAC, or an [AEAD](../05-modes-aead/AEAD.md).
    - **The KEM/DEM split** (Cramer and Shoup): a key-encapsulation part plus a data-encapsulation part, the
      design HPKE follows.
    - **Chosen-ciphertext security** (IND-CCA2): what the MAC buys, proven under the gap Diffie-Hellman
      assumption.

## See also

- [ElGamal](ElGamal.md): the unhashed scheme it replaced
- [HPKE](HPKE.md): the same idea as one spec, and its successor
- [ECDH](../01-key-exchange/ECDH.md): the key agreement inside
- [HKDF](../08-kdf-password-hashing/HKDF.md) / [HMAC](../06-mac/HMAC.md) / [AEAD](../05-modes-aead/AEAD.md): the symmetric parts

## References

- [SEC 1 v2.0: Elliptic Curve Cryptography (2009)](https://www.secg.org/sec1-v2.pdf), Section 5.1 and Appendix B.4.1
- [Shoup (ed.), ISO/IEC 18033-2 final committee draft (2004)](https://shoup.net/iso/std6.pdf), Clauses 9 and 10.2
- [Abdalla, Bellare, Rogaway, "DHAES" (ePrint 1999/007)](https://eprint.iacr.org/1999/007) / ["The Oracle Diffie-Hellman Assumptions and an Analysis of DHIES" (CT-RSA 2001)](https://doi.org/10.1007/3-540-45353-9_12)
- [RFC 9180, Section 1](https://www.rfc-editor.org/rfc/rfc9180#section-1): why HPKE replaced the ECIES variants
- [3GPP TS 33.501, Annex C](https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=3169)
- [devp2p RLPx specification](https://github.com/ethereum/devp2p/blob/master/rlpx.md)
- [Tink hybrid encryption](https://developers.google.com/tink/hybrid) / [Apple SecKeyAlgorithm](https://developer.apple.com/documentation/security/seckeyalgorithm)

*Weaker sources:* the 5G profile parameters, as quoted in excerpts of
TS 33.501 and in [Thales's ECIES-for-5G notes](https://thalesdocs.com/gphsm/luna/7/docs/network/Content/sdk/using/ecies_for_5G.htm).
