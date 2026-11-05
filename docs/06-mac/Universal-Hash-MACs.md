# Universal hash MACs

*Poly1305 and UMAC: cheap arithmetic per block, a proven bound on
forgery, and a key or nonce that must never be used twice.*

**Status and standards:** see [MAC](../algorithms/table.md#6-mac) in the main table.

## What it is

HMAC and CMAC run a hash or a block cipher over every block. A universal
hash MAC does something cheaper per block, such as one multiply mod a
prime, and its security is proven by counting, not by assuming a cipher
is hard to break.

The idea is Wegman and Carter's (1981). Pick a hash function at random
from a family where two messages rarely collide, and add a one-time pad
to its output. Even an attacker with unlimited computing power then
forges with no better odds than the collision bound. In practice the pad
comes from a cipher run on a nonce:

$$
\mathit{tag} = h_r(m) + F_k(\mathit{nonce})
$$

The pad must be one-time. Use one pad on two messages and the two tags
are enough to solve for the hash key.

## The story

- **Who made it:** Mark Wegman and Larry Carter (IBM), 1981. Poly1305 is Bernstein's (2005); UMAC is from Black, Halevi, Krawczyk, Krovetz and Rogaway (1999).
- **What for:** The fastest MACs, with security proven by counting rather than assumed.
- **What it solved:** One multiplication per block instead of a hash or cipher call made authentication almost free.
- **Where it stands:** Poly1305 is recommended inside ChaCha20-Poly1305; GHASH is the MAC in GCM; UMAC is in SSH.
- **Incidents:** They are one-time: reusing the key or nonce lets an attacker solve for the key and forge, as in the GCM nonce-reuse cases.

## How it works

### Poly1305

Bernstein published Poly1305-AES at FSE 2005, with the pad
$s = \mathrm{AES}(k, \mathit{nonce})$. RFC 7539 (2015), now RFC 8439 (2018), pairs it with
ChaCha20: the first 32 bytes of ChaCha20's output for a message's nonce,
with block counter 0, are that message's one-time key.

- The key is $r \,\Vert\, s$, both little-endian. $r$ is "clamped": 22 of its bits
  are forced to zero so the arithmetic stays fast.
- Each 16-byte block, with a `0x01` byte appended, is a number $c$, and
  $\mathit{acc} = (\mathit{acc} + c) \cdot r \bmod (2^{130} - 5)$.
- $\mathit{tag} = (\mathit{acc} + s) \bmod 2^{128}$, as 16 little-endian bytes.

A forgery attempt on a $16n$-byte message succeeds with probability at
most $n/2^{102}$, even after $2^{64}$ genuine messages. A short message gets about
100-bit security, the ~100 in the main table; a 64 KB message, about 90.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 345" role="img" aria-labelledby="sk-c-poly-t"><title id="sk-c-poly-t">Poly1305 adds each message block into an accumulator and multiplies by r modulo 2 to the 130 minus 5, then adds s to make the tag</title><defs><filter id="sk-c-poly-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-poly-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-poly-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-poly-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-poly-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="345" filter="url(#sk-c-poly-paper)"/><g filter="url(#sk-c-poly-pen)"><text x="30" y="44" class="h">Poly1305: add a block, multiply by r</text><path class="p room" d="M40 90 L140 90 L140 130 L40 130Z"/><text x="90.0" y="116.0" text-anchor="middle" class="s">block 1</text><path class="p " d="M90 132 L90 168" marker-end="url(#sk-c-poly-ah)"/><circle cx="90" cy="182" r="13" class="p gold"/><text x="90" y="188" text-anchor="middle" class="s">+</text><path class="p " d="M104 182 L132 182" marker-end="url(#sk-c-poly-ah)"/><circle cx="144" cy="182" r="13" class="p rust"/><text x="144" y="188" text-anchor="middle" class="s">× r</text><path class="p " d="M158 182 L212 182" marker-end="url(#sk-c-poly-ah)"/><path class="p room" d="M180 90 L280 90 L280 130 L180 130Z"/><text x="230.0" y="116.0" text-anchor="middle" class="s">block 2</text><path class="p " d="M230 132 L230 168" marker-end="url(#sk-c-poly-ah)"/><circle cx="230" cy="182" r="13" class="p gold"/><text x="230" y="188" text-anchor="middle" class="s">+</text><path class="p " d="M244 182 L272 182" marker-end="url(#sk-c-poly-ah)"/><circle cx="284" cy="182" r="13" class="p rust"/><text x="284" y="188" text-anchor="middle" class="s">× r</text><path class="p " d="M298 182 L352 182" marker-end="url(#sk-c-poly-ah)"/><path class="p room" d="M320 90 L420 90 L420 130 L320 130Z"/><text x="370.0" y="116.0" text-anchor="middle" class="s">block 3</text><path class="p " d="M370 132 L370 168" marker-end="url(#sk-c-poly-ah)"/><circle cx="370" cy="182" r="13" class="p gold"/><text x="370" y="188" text-anchor="middle" class="s">+</text><path class="p " d="M384 182 L412 182" marker-end="url(#sk-c-poly-ah)"/><circle cx="424" cy="182" r="13" class="p rust"/><text x="424" y="188" text-anchor="middle" class="s">× r</text><path class="p " d="M438 182 L492 182" marker-end="url(#sk-c-poly-ah)"/><path class="p room" d="M460 90 L560 90 L560 130 L460 130Z"/><text x="510.0" y="116.0" text-anchor="middle" class="s">block 4</text><path class="p " d="M510 132 L510 168" marker-end="url(#sk-c-poly-ah)"/><circle cx="510" cy="182" r="13" class="p gold"/><text x="510" y="188" text-anchor="middle" class="s">+</text><path class="p " d="M524 182 L552 182" marker-end="url(#sk-c-poly-ah)"/><circle cx="564" cy="182" r="13" class="p rust"/><text x="564" y="188" text-anchor="middle" class="s">× r</text><path class="p " d="M582 196 L582 240" marker-end="url(#sk-c-poly-ah)"/><circle cx="582" cy="254" r="13" class="p gold"/><text x="582" y="260" text-anchor="middle" class="s">+ s</text><path class="p " d="M568 254 L520 254" marker-end="url(#sk-c-poly-ah)"/><path class="p room" d="M420 236 L518 236 L518 274 L420 274Z"/><text x="469.0" y="261.0" text-anchor="middle" class="s">tag</text><text x="40" y="240" class="s">all mod 2¹³⁰ − 5</text><text x="40" y="310" class="s">The tag is a polynomial in r, hidden by s. r and s are used for one message only:</text><text x="40" y="330" class="s">reuse them and two tags give away r.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

### UMAC

Black, Halevi, Krawczyk, Krovetz and Rogaway presented UMAC at CRYPTO
1999. RFC 4418 (2006) is the spec.

- $\mathit{tag} = \mathrm{UHASH}(K_1, M)$ XOR a pad that AES makes from the nonce.
- UHASH has three layers. NH hashes each 1024-byte chunk to 8 bytes: add
  key words to the 32-bit message words, multiply in pairs, sum $\bmod 2^{64}$.
  A polynomial hash $\bmod 2^{64} - 59$ follows ($2^{128} - 159$ past 16 MB), then an
  inner-product hash $\bmod 2^{36} - 5$ down to 32 bits.
- Each 32 bits of tag is another pass with its own keys, so UMAC-32 to
  UMAC-128 run one to four passes.
- A forgery attempt succeeds with probability at most $1/2^{30}$, $1/2^{60}$,
  $1/2^{90}$ or $1/2^{120}$ for 32, 64, 96 or 128-bit tags, as long as AES holds
  and the key tags at most $2^{64}$ messages.

NH is why it's fast: the RFC quotes about one cycle per byte on a
Pentium 4 for 64-bit tags.

## Where they're used

- **Poly1305,** almost always inside ChaCha20-Poly1305: TLS 1.3,
  OpenSSH's `chacha20-poly1305@openssh.com`, WireGuard. Adiantum also
  uses it in its hash for disk sectors.
- **UMAC** in OpenSSH: `umac-64@openssh.com` since 4.7 (2007) and
  `umac-128@openssh.com` since 6.2 (2013). Their encrypt-then-MAC forms
  head OpenSSH's default MAC list, used when the cipher isn't an AEAD,
  such as `aes128-ctr`.

## When to use it

- **Poly1305 through an AEAD,** ChaCha20-Poly1305 or XChaCha20-Poly1305.
  On its own only if every message gets a fresh key.
- **UMAC** where SSH picks it.
- **One long-term key and no nonce:** [HMAC](HMAC.md) instead.

## Example (Python)

Poly1305 is plain big-number arithmetic, so it runs as is. The first part
checks the RFC 8439 test vector. The second tags two messages with one key
and gets $r$ and $s$ back from the tags.

```python
import os

P = (1 << 130) - 5
CLAMP = 0x0ffffffc0ffffffc0ffffffc0fffffff

def poly1305(key, msg):                       # RFC 8439, Section 2.5.1
    r = int.from_bytes(key[:16], "little") & CLAMP
    s = int.from_bytes(key[16:], "little")
    a = 0
    for i in range(0, len(msg), 16):
        a = (a + int.from_bytes(msg[i:i + 16] + b"\x01", "little")) * r % P
    return ((a + s) % (1 << 128)).to_bytes(16, "little")

key = bytes.fromhex("85d6be7857556d337f4452fe42d506a8"
                    "0103808afb0db2fd4abff6af4149f51b")
print(poly1305(key, b"Cryptographic Forum Research Group").hex())
# a8061dc1305136c6c22b8baf0c0127a9 (RFC 8439, Section 2.5.2)

key = os.urandom(32)                          # the mistake: one key, two messages
m1, m2 = b"pay Bob $100.00!", b"pay Eve $100.00!"
t1 = int.from_bytes(poly1305(key, m1), "little")
t2 = int.from_bytes(poly1305(key, m2), "little")
c1 = int.from_bytes(m1 + b"\x01", "little")
c2 = int.from_bytes(m2 + b"\x01", "little")

for j in range(-5, 6):                        # the tag dropped the top bits of the sum
    r = (t1 - t2 + (j << 128)) * pow(c1 - c2, -1, P) % P
    if r & CLAMP == r:
        s = (t1 - c1 * r % P) % (1 << 128)
        fake = r.to_bytes(16, "little") + s.to_bytes(16, "little")
        m3 = b"pay Eve $999.00!"
        print(poly1305(fake, m3) == poly1305(key, m3))   # True
        break
```

For one-block messages the tags differ by $(c_1 - c_2) \cdot r \bmod p$, give or take
a multiple of $2^{128}$ that the last step dropped. Trying the few multiples
finds $r$, then $s$, and with both the attacker can tag anything. In
ChaCha20-Poly1305 a repeated nonce gives away exactly this.

In real code, PyCA `cryptography` (`pip install cryptography`) has
`Poly1305.generate_tag(key, data)` and `verify_tag`. Run with
cryptography 50.0.1 on Python 3.13, `generate_tag` gives the same RFC 8439
tag, and `verify_tag` raises `InvalidSignature` for a changed message.

## Security notes

- Never use a Poly1305 key twice. In ChaCha20-Poly1305 that means never
  repeat a nonce under one key.
- UMAC needs a fresh nonce per message too; RFC 4418 says to treat a
  message with a repeated nonce as forged.
- Short tags are weak: a 32-bit UMAC tag can be forged about once per
  billion tries. Poly1305's bound also shrinks as messages grow.
- This Python isn't constant-time. RFC 8439 warns that generic big-number
  code leaks timing.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Poly1305's RFC 8439 example, recomputed"

    RFC 8439 §2.5.2 authenticates "Cryptographic Forum Research Group" (34 bytes). Recomputed with Python's
    `cryptography`, matching the RFC:

    | Step | Value |
    |---|---|
    | One-time key (32 bytes) | `85d6be78…a806 · 0103808a…f51b` |
    | $r$ (first 16 bytes, clamped) | `806d5400e52447c036d555408bed685` |
    | $s$ (last 16 bytes) | `1bf54941aff6bf4afdb20dfb8a800301` |
    | Message in 16-byte blocks, each with a `01` byte added | 3 blocks (16 + 16 + 2 bytes) |
    | $\mathit{acc} = \sum_i \mathit{block}_i \cdot r^{4-i} \bmod (2^{130} - 5)$, then $+\, s \bmod 2^{128}$ | |
    | Tag | `a8061dc1305136c6c22b8baf0c0127a9` |

??? abstract "The math, with formulas"

    **Poly1305.** With $p = 2^{130} - 5$ (prime) and message blocks $c_1, \ldots, c_q$:

    $$
    \mathit{tag} = \big( (c_1 \cdot r^q + c_2 \cdot r^{q-1} + \cdots + c_q \cdot r) \bmod p + s \big) \bmod 2^{128}
    $$

    Clamping clears 22 bits of $r$ so the multiplications fit in fast 64-bit arithmetic.

    **Why it is secure (Carter–Wegman).** For two different messages, the difference of their polynomials has
    at most $q$ roots, so a random $r$ makes them collide with probability at most about $8q / 2^{106}$ (the clamped
    $r$ has 106 free bits). Adding the secret one-time $s$ hides the polynomial's value completely, like a one-time
    pad. The catch: $(r, s)$ must be fresh for every message. ChaCha20-Poly1305 derives them from block 0 of
    the keystream for each nonce.

    **GHASH** (in GCM) is the same idea in $\mathrm{GF}(2^{128})$, with addition as XOR and $H = \mathrm{AES}_K(0)$ as the point.

    **UMAC and VMAC** use NH: $\sum_i \big((m_{2i} + k_{2i}) \bmod 2^{32}\big) \cdot \big((m_{2i+1} + k_{2i+1}) \bmod 2^{32}\big) \bmod 2^{64}$, faster still on 64-bit CPUs.

??? tip "Watch it step by step: Poly1305 on a short message"

    <div class="mars-steps" markdown>

    1. Take a fresh 32-byte key: the first half (clamped) is $r$, the second half is $s$.
    2. Split the message into 16-byte blocks and add a `01` byte after each, so trailing zeros still count.
    3. Start with $\mathit{acc} = 0$. For each block: $\mathit{acc} = (\mathit{acc} + \mathit{block}) \cdot r \bmod (2^{130} - 5)$.
    4. After the last block, add $s$ and keep the low 128 bits.
    5. That is the tag, `a8061dc1…0127a9`. A different message gives a different polynomial, and with $r$
       secret its value is unpredictable.

    </div>

??? info "The math underneath"

    - **Polynomials over finite fields** and how many roots they can have.
    - **$\varepsilon$-almost-universal hash families** (Carter and Wegman, 1979; Wegman and Carter, 1981).
    - **Prime fields** like $2^{130} - 5$, chosen so reduction is a shift and a multiply by 5.
    - **One-time pads** for the final masking.
    - Used in [AEAD](../05-modes-aead/AEAD.md) (GCM, ChaCha20-Poly1305) and [Adiantum](../05-modes-aead/Disk-Encryption.md).

## See also

- [ChaCha20-Poly1305](../05-modes-aead/AEAD.md): where Poly1305 nearly always runs
- [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md): the cipher that makes the one-time key
- [Block-cipher MACs](Block-Cipher-MACs.md): GMAC, the same idea over $\mathrm{GF}(2^{128})$
- [HMAC](HMAC.md): the MAC for a long-term key with no nonce
- [Disk encryption](../05-modes-aead/Disk-Encryption.md): Adiantum, which hashes with NH and Poly1305
- [SSH](../protocols/SSH.md): the MACs OpenSSH offers

## References

- Wegman and Carter, "New Hash Functions and Their Use in Authentication and Set Equality" (Journal of Computer and System Sciences 22, 1981) / Carter and Wegman, "Universal Classes of Hash Functions" (JCSS 18, 1979)
- Bernstein, "The Poly1305-AES message-authentication code" (FSE 2005) / [Poly1305-AES page](https://cr.yp.to/mac.html)
- [RFC 8439: ChaCha20 and Poly1305 for IETF Protocols](https://www.rfc-editor.org/rfc/rfc8439) (Sections 2.5, 2.6, 4) / [RFC 7539](https://www.rfc-editor.org/rfc/rfc7539)
- Black, Halevi, Krawczyk, Krovetz and Rogaway, "UMAC: Fast and Secure Message Authentication" (CRYPTO 1999)
- [RFC 4418: UMAC](https://www.rfc-editor.org/rfc/rfc4418) (Sections 1, 5, 6.2, 6.3)
- [OpenSSH 4.7](https://www.openssh.com/txt/release-4.7) and [6.2](https://www.openssh.com/txt/release-6.2) release notes / ssh_config(5), `MACs`, in OpenSSH 10.5
- [PyCA `cryptography`: Poly1305](https://cryptography.io/en/latest/hazmat/primitives/mac/poly1305/)
