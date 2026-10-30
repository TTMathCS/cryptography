# Universal hash MACs

*Poly1305 and UMAC: cheap arithmetic per block, a proven bound on
forgery, and a key or nonce that must never be used twice.*

**Status and standards:** see [MAC](../index.md#6-mac) in the main table.

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

```
tag = h_r(m) + F_k(nonce)
```

The pad must be one-time. Use one pad on two messages and the two tags
are enough to solve for the hash key.

## How it works

### Poly1305

Bernstein published Poly1305-AES at FSE 2005, with the pad
s = AES(k, nonce). RFC 7539 (2015), now RFC 8439 (2018), pairs it with
ChaCha20: the first 32 bytes of ChaCha20's output for a message's nonce,
with block counter 0, are that message's one-time key.

- The key is r ‖ s, both little-endian. r is "clamped": 22 of its bits
  are forced to zero so the arithmetic stays fast.
- Each 16-byte block, with a 0x01 byte appended, is a number c, and
  acc = (acc + c) · r mod 2¹³⁰ − 5.
- tag = (acc + s) mod 2¹²⁸, as 16 little-endian bytes.

A forgery attempt on a 16n-byte message succeeds with probability at
most n/2¹⁰², even after 2⁶⁴ genuine messages. A short message gets about
100-bit security, the ~100 in the main table; a 64 KB message, about 90.

### UMAC

Black, Halevi, Krawczyk, Krovetz and Rogaway presented UMAC at CRYPTO
1999. RFC 4418 (2006) is the spec.

- tag = UHASH(K1, M) XOR a pad that AES makes from the nonce.
- UHASH has three layers. NH hashes each 1024-byte chunk to 8 bytes: add
  key words to the 32-bit message words, multiply in pairs, sum mod 2⁶⁴.
  A polynomial hash mod 2⁶⁴ − 59 follows (2¹²⁸ − 159 past 16 MB), then an
  inner-product hash mod 2³⁶ − 5 down to 32 bits.
- Each 32 bits of tag is another pass with its own keys, so UMAC-32 to
  UMAC-128 run one to four passes.
- A forgery attempt succeeds with probability at most 1/2³⁰, 1/2⁶⁰,
  1/2⁹⁰ or 1/2¹²⁰ for 32, 64, 96 or 128-bit tags, as long as AES holds
  and the key tags at most 2⁶⁴ messages.

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
and gets r and s back from the tags.

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

For one-block messages the tags differ by (c1 − c2)·r mod p, give or take
a multiple of 2¹²⁸ that the last step dropped. Trying the few multiples
finds r, then s, and with both the attacker can tag anything. In
ChaCha20-Poly1305 a repeated nonce gives away exactly this.

In real code, PyCA `cryptography` has `Poly1305.generate_tag(key, data)`
and `verify_tag`. They need the library and weren't run for this page.

## Security notes

- Never use a Poly1305 key twice. In ChaCha20-Poly1305 that means never
  repeat a nonce under one key.
- UMAC needs a fresh nonce per message too; RFC 4418 says to treat a
  message with a repeated nonce as forged.
- Short tags are weak: a 32-bit UMAC tag can be forged about once per
  billion tries. Poly1305's bound also shrinks as messages grow.
- This Python isn't constant-time. RFC 8439 warns that generic big-number
  code leaks timing.

## See also

- [ChaCha20-Poly1305](../05-modes-aead/AEAD.md): where Poly1305 nearly always runs
- [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md): the cipher that makes the one-time key
- [Block-cipher MACs](Block-Cipher-MACs.md): GMAC, the same idea over GF(2¹²⁸)
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
