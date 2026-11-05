# HKDF (HMAC-based Key Derivation)

*Turns a strong but lumpy secret, such as a Diffie-Hellman output, into as many
clean keys as you need. Fast on purpose: the input is already unguessable.*

**Status and standards:** see [Key derivation and password hashing](../algorithms/table.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

A key exchange gives both sides a shared secret, but that secret isn't a key
yet: an [X25519](../01-key-exchange/ECDH.md) output is a curve point coordinate
with structure, not 32 uniform random bytes, and one secret has to feed several
keys (one per direction, plus IVs). HKDF, from Hugo Krawczyk (2010, RFC 5869),
is the standard fix. It is built entirely on [HMAC](../06-mac/HMAC.md).

It runs in TLS 1.3's key schedule, Signal, HPKE, MLS, and (with BLAKE2s in
place of SHA-256) WireGuard.

Don't use it for passwords. A password is guessable, and HKDF is fast, so every
guess is cheap. Use [Argon2](Argon2.md) or [scrypt](scrypt.md) for those.

## The story

- **Who made it:** Hugo Krawczyk (IBM), at CRYPTO 2010; RFC 5869 (2010).
- **What for:** Turning a shared secret into clean, separate keys.
- **What it solved:** Every protocol had its own ad hoc KDF, and some were weak. HKDF splits the job in two, extract the randomness and then expand it, and proves each step.
- **Where it stands:** Recommended: in TLS 1.3, Signal, HPKE, MLS and WireGuard.
- **Incidents:** None in HKDF. The common mistake is using it on passwords, where it is far too fast.

## How it works

Two steps:

1. **Extract:** $\mathit{PRK} = \mathrm{HMAC}(\mathit{salt}, \mathit{input})$. This concentrates whatever entropy
   the input has into one uniform key. The salt is optional (zeros by default)
   but helps when you have one.
2. **Expand:** chain HMAC with that key until there are enough bytes:
   $T_1 = \mathrm{HMAC}(\mathit{PRK}, \mathit{info} \,\Vert\, 1)$, $T_2 = \mathrm{HMAC}(\mathit{PRK}, T_1 \,\Vert\, \mathit{info} \,\Vert\, 2)$, and so on. The
   output is $T_1 \,\Vert\, T_2 \,\Vert\, \ldots$, cut to length.

The `info` string names what the key is for (`"client write key"`,
`"app v1 session"`). Same secret plus different `info` gives unrelated keys.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 405" role="img" aria-labelledby="sk-c-hkdf-t"><title id="sk-c-hkdf-t">HKDF first condenses the input into a pseudorandom key with HMAC, then chains HMAC calls with an info label and a counter to make as many output blocks as needed</title><defs><filter id="sk-c-hkdf-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-hkdf-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-hkdf-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-hkdf-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-hkdf-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="405" filter="url(#sk-c-hkdf-paper)"/><g filter="url(#sk-c-hkdf-pen)"><text x="30" y="44" class="h">Extract, then expand</text><path class="p room" d="M30 90 L170 90 L170 134 L30 134Z"/><text x="100.0" y="118.0" text-anchor="middle" class="s">input key material</text><path class="p soft" d="M30 150 L170 150 L170 186 L30 186Z"/><text x="100.0" y="174.0" text-anchor="middle" class="s">salt (optional)</text><path class="p " d="M172 130 L228 130" marker-end="url(#sk-c-hkdf-ah)"/><path class="p gold" d="M230 106 L340 106 L340 156 L230 156Z"/><text x="285.0" y="131.0" text-anchor="middle" class="s">HMAC</text><text x="285.0" y="149.0" text-anchor="middle" class="s">extract</text><path class="p " d="M342 130 L398 130" marker-end="url(#sk-c-hkdf-ah)"/><path class="p rust" d="M400 110 L510 110 L510 152 L400 152Z"/><text x="455.0" y="137.0" text-anchor="middle" class="s">PRK</text><path class="p gold" d="M60 240 L190 240 L190 290 L60 290Z"/><text x="125.0" y="265.0" text-anchor="middle" class="s">HMAC(PRK, …)</text><text x="125.0" y="283.0" text-anchor="middle" class="s">… ‖ info ‖ 1</text><path class="p " d="M125 292 L125 320" marker-end="url(#sk-c-hkdf-ah)"/><path class="p room" d="M85 322 L165 322 L165 356 L85 356Z"/><text x="125.0" y="345.0" text-anchor="middle" class="s">T1</text><path class="p dash" d="M167 339 L240 265" marker-end="url(#sk-c-hkdf-ah)"/><path class="p gold" d="M250 240 L380 240 L380 290 L250 290Z"/><text x="315.0" y="265.0" text-anchor="middle" class="s">HMAC(PRK, …)</text><text x="315.0" y="283.0" text-anchor="middle" class="s">… ‖ info ‖ 2</text><path class="p " d="M315 292 L315 320" marker-end="url(#sk-c-hkdf-ah)"/><path class="p room" d="M275 322 L355 322 L355 356 L275 356Z"/><text x="315.0" y="345.0" text-anchor="middle" class="s">T2</text><path class="p dash" d="M357 339 L430 265" marker-end="url(#sk-c-hkdf-ah)"/><path class="p gold" d="M440 240 L570 240 L570 290 L440 290Z"/><text x="505.0" y="265.0" text-anchor="middle" class="s">HMAC(PRK, …)</text><text x="505.0" y="283.0" text-anchor="middle" class="s">… ‖ info ‖ 3</text><path class="p " d="M505 292 L505 320" marker-end="url(#sk-c-hkdf-ah)"/><path class="p room" d="M465 322 L545 322 L545 356 L465 356Z"/><text x="505.0" y="345.0" text-anchor="middle" class="s">T3</text><path class="p dash" d="M455 154 L455 200 L120 200 L120 236" marker-end="url(#sk-c-hkdf-ah)"/><text x="30" y="390" class="s">Different info strings (“client write key”, “server write key”) give unrelated keys from one secret.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## When to use it

- **After any key exchange:** DH, ECDH, ML-KEM, before the secret touches a
  cipher.
- **Splitting one master key** into separate keys for encryption, MAC, and each
  direction.
- **Not for passwords**, and not as a hash.

## Example (Python)

HKDF is small enough to write with the standard library. This matches test
case 1 of RFC 5869:

```python
import hmac, hashlib

def hkdf(ikm, salt, info, n):
    prk = hmac.new(salt or bytes(32), ikm, hashlib.sha256).digest()   # extract
    out, t, i = b"", b"", 1
    while len(out) < n:                                              # expand
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out += t
        i += 1
    return out[:n]

okm = hkdf(bytes([0x0b] * 22), bytes(range(13)), bytes(range(0xf0, 0xfa)), 42)
print(okm.hex())
# 3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865
```

In real code use a library version, such as `HKDF` from PyCA `cryptography`
(`cryptography.hazmat.primitives.kdf.hkdf`).

## Security notes

- Never feed a raw DH or X25519 output straight into a cipher; run it through
  HKDF first.
- Give every derived key its own `info` label so one secret never produces the
  same key for two jobs.
- Output is limited to 255 hash lengths (8,160 bytes for SHA-256), far more
  than anyone needs.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: RFC 5869 test case 1, recomputed"

    HKDF-SHA-256 with a 22-byte input key, a 13-byte salt, a 10-byte `info` and 42 bytes of output.
    Recomputed with Python's `hmac`, matching the RFC:

    | Step | Calculation | Value |
    |---|---|---|
    | Input key material | `0b` × 22 | |
    | Salt, info | `00 01 … 0c`, `f0 f1 … f9` | |
    | Extract | $\mathit{PRK} = \mathrm{HMAC}(\mathit{salt}, \mathit{IKM})$ | `077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5` |
    | Expand block 1 | $T(1) = \mathrm{HMAC}(\mathit{PRK}, \mathit{info} \,\Vert\, \mathtt{01})$ | first 32 bytes |
    | Expand block 2 | $T(2) = \mathrm{HMAC}(\mathit{PRK}, T(1) \,\Vert\, \mathit{info} \,\Vert\, \mathtt{02})$ | next 10 bytes used |
    | Output (42 bytes) | $T(1) \,\Vert\, T(2)$, cut to 42 | `3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865` |

??? abstract "The math, with formulas"

    **Extract:** $\mathit{PRK} = \text{HMAC-Hash}(\mathit{salt}, \mathit{IKM})$. It concentrates whatever entropy the input has (a DH shared
    secret, a password-stretching output) into one uniform key of the hash's length. With no salt, the salt
    is a string of zeros.

    **Expand:**

    $$
    \begin{aligned}
    T(0) &= \text{empty} \\
    T(i) &= \text{HMAC-Hash}(\mathit{PRK},\, T(i-1) \,\Vert\, \mathit{info} \,\Vert\, i) && i \text{ as one byte, } 1 \ldots 255 \\
    \mathit{OKM} &= \text{first } L \text{ bytes of } T(1) \,\Vert\, T(2) \,\Vert\, \cdots
    \end{aligned}
    $$

    At most $255 \times \mathit{HashLen}$ bytes (8,160 for SHA-256). Different `info` strings give independent keys from
    the same PRK: TLS 1.3 derives its handshake and traffic keys this way with labels like `"tls13 key"`.

    **Why two steps.** Extract is a randomness extractor (proved for HMAC by Krawczyk, 2010); Expand is a PRF in
    counter-and-feedback mode. When the input is already a uniform key, Extract can be skipped.

??? tip "Watch it step by step: one secret, many keys"

    <div class="mars-steps" markdown>

    1. Start with a shared secret that is not uniformly random, such as an ECDH output.
    2. Extract: HMAC it under a salt to get a 32-byte pseudorandom key, `PRK = 077709…b3e5`.
    3. Expand: HMAC $\mathit{PRK}$ with `info` and the byte `01` for the first 32 bytes.
    4. HMAC again with the previous block, `info` and `02` for the next 32.
    5. Cut to the length needed: 42 bytes, `3cb25f…5865`.
    6. Run Expand again with another `info` (say "server key") for a second, independent key.

    </div>

??? info "The math underneath"

    - **HMAC as a PRF:** [HMAC](../06-mac/HMAC.md).
    - **Randomness extractors** and the leftover hash lemma: turning a high-entropy but non-uniform secret
      into a uniform key.
    - **Computational extractors** (Krawczyk's HKDF paper, CRYPTO 2010).
    - **Domain separation** with `info` labels.
    - Where it is used: [TLS 1.3](../protocols/TLS-1.3.md), [HPKE](../03-public-key-encryption/HPKE.md),
      Signal, [WireGuard](../protocols/WireGuard.md).

## See also

- [HMAC](../06-mac/HMAC.md): the only building block HKDF uses
- [TLS 1.3](../protocols/TLS-1.3.md): the key schedule is HKDF all the way down
- [NIST KDFs](NIST-KDFs.md): KBKDF, the one-step KDF and the X9.63 KDF
- [Argon2](Argon2.md): the slow function for passwords

## References

- [RFC 5869: HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [Krawczyk, "Cryptographic Extraction and Key Derivation: The HKDF Scheme" (2010)](https://eprint.iacr.org/2010/264)
- [NIST SP 800-56C Rev. 2 (2020)](https://csrc.nist.gov/pubs/sp/800/56/c/r2/final): the same extract-then-expand idea in NIST form (the two-step KDF, Section 5)
