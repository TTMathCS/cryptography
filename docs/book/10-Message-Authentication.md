# 10. Message Authentication

*Encryption hides a message; it does not stop anyone from changing it. This
chapter starts by editing a message protected by a perfect one-time pad, then
builds the tools that catch such edits: MACs (HMAC, CMAC, Poly1305 and others)
and authenticated encryption (AES-GCM and ChaCha20-Poly1305), which today
protects almost every byte sent over the internet. Along the way you will forge
CBC-MAC, recover a Poly1305 key, and forge an AES-GCM message from one repeated
nonce, and see why the rule "never reuse a nonce" is absolute.*

!!! abstract "In this chapter"
    **You will learn:**

    - why encryption alone is malleable, and what a MAC must guarantee
    - HMAC, CMAC and Poly1305: three ways to build a MAC, from a hash, a block cipher and polynomial arithmetic
    - how to combine a cipher and a MAC (encrypt-then-MAC), and the padding-oracle attacks that came from the other orders
    - AEAD: the interface, how AES-GCM and ChaCha20-Poly1305 work, and exactly what a repeated nonce gives away
    - nonce-misuse resistance (SIV, AES-GCM-SIV) and key commitment

    **You need:** [Chapter 5](05-Stream-Ciphers.md) (stream ciphers and
    ChaCha20), [Chapter 7](07-AES.md) (AES and $\mathrm{GF}(2^8)$),
    [Chapter 8](08-Modes-of-Operation.md) (CBC and CTR) and
    [Chapter 9](09-Hash-Functions.md) (hashes and length extension).

    **Levels:** 10.1 and 10.2 are for beginners; 10.3 to 10.11 are
    intermediate; 10.12 is expert.

## 10.1 The problem: encryption is not integrity

People have needed to know that a message was genuine for as long as they have
needed to keep it secret, and often more. Seals on letters, signatures and
countersigns did the job for centuries. When banks began moving money by
telegraph in the nineteenth century, a forged telegram could empty an account,
so banks agreed on secret **test keys**: numbers computed from the amount, the
date and a private table, added to each transfer so the receiving bank could
check it. Detailed records of how those tables worked are scattered, but they
were the ancestor of what this chapter builds.

Mathematics caught up in 1974, when Edgar Gilbert, Jessie MacWilliams and Neil
Sloane at Bell Labs published "Codes Which Detect Deception", the first theory
of authentication with provable odds against a forger. Gustavus Simmons at
Sandia National Laboratories developed it further in the 1980s, partly for a
very concrete problem: seismic sensors placed to verify a nuclear test ban had
to report readings the host country could read but could not fake. In 1981
Mark Wegman and Larry Carter at IBM found how to make such codes fast (§10.5).

Here is why it matters. In [Chapter 4](04-Randomness-and-Perfect-Secrecy.md)
the one-time pad gave perfect secrecy: the ciphertext tells an attacker nothing
at all about the message. But look what an attacker can *do* to it:

```python
import os

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

key = os.urandom(32)                     # a perfect one-time pad: unbreakable secrecy
msg = b"pay Bob   $100.00 from Alice"
ct = xor(msg, key)

# The attacker can't read ct, but guesses its format and edits it in flight.
old, new = b"Bob   $100", b"Eve $90000"
evil = ct[:4] + xor(ct[4:14], xor(old, new)) + ct[14:]
print(xor(evil, key))                    # what the bank decrypts
# b'pay Eve $90000.00 from Alice'
```

XORing a value into the ciphertext XORs the same value into the plaintext. The
attacker never learned the key and never read anything; they knew the format
of a payment order and rewrote it. This is **malleability**, and every stream
cipher and CTR mode has it, since they are all "XOR with a keystream". CBC is
malleable in a different pattern ([Chapter 8](08-Modes-of-Operation.md)), and
textbook RSA in yet another ([Chapter 13](13-RSA.md)).

So we need a second tool, separate from secrecy: a short **tag** sent with the
message that only someone holding the key could have produced, and that stops
matching if anything changes.

## 10.2 What a MAC is

A **message authentication code** (MAC) is a pair of algorithms that share a
secret key $K$:

- $\mathrm{Tag}(K, m)$ returns a short tag $t$, typically 16 or 32 bytes;
- $\mathrm{Verify}(K, m, t)$ returns "valid" or "invalid".

The sender sends $(m, t)$. The receiver recomputes the tag and accepts only if
it matches. A MAC does not hide $m$; it vouches for it.

**What "secure" means.** Imagine the strongest reasonable attacker. They may ask
for tags on any messages they like, as many as they like, and see every answer.
They win if they then produce a valid tag for any message they did *not* ask
about. A MAC is secure if no efficient attacker wins with more than tiny
probability. The formal name is **existential unforgeability under chosen-message
attack** (EUF-CMA): "existential" because forging *any* message counts, even
gibberish, since the MAC cannot know what the application considers meaningful.

**Tag length is a hard limit.** With a $\tau$-bit tag, an attacker who simply
guesses succeeds with probability $2^{-\tau}$ per try. A 32-bit tag, as in 4G
and 5G radio, is forged once in about four billion attempts, which is fine only
when the protocol drops the connection long before that. For general use, tags
are 128 bits or more.

**What a MAC does not do.**

- **Replay.** A valid $(m, t)$ stays valid. Sending "pay Bob \$100" twice is
  not a forgery. Protocols add a sequence number or timestamp inside $m$.
- **Non-repudiation.** Both sides hold the key, so either could have made the
  tag. To convince a third party who wrote a message you need a digital
  signature ([Chapter 13](13-RSA.md)).

**Three wrong MACs.** It is worth seeing why the obvious ideas fail.

1. **A plain hash, $t = H(m)$.** There is no key: the attacker changes $m$ and
   computes the new hash themselves.
2. **Key first, $t = H(K \,\Vert\, m)$.** With SHA-256 or any Merkle-Damgård hash,
   this falls to length extension. [§9.7](09-Hash-Functions.md) did exactly this
   to forge `&role=admin`, and Flickr's API fell to it in 2009.
3. **Key last, $t = H(m \,\Vert\, K)$.** Length extension no longer works, but
   now any hash *collision* is a forgery: if $H(m) = H(m')$ with equal lengths,
   then the chaining values agree before the key goes in, so
   $H(m \,\Vert\, K) = H(m' \,\Vert\, K)$. A MAC built on MD5 this way died with MD5's
   collision resistance.

The fixes are the subject of the next three sections.

## 10.3 HMAC

*Level: intermediate.*

In 1996 Mihir Bellare, Ran Canetti and Hugo Krawczyk, then at UC San Diego
and IBM, published HMAC: a way to turn any hash into a MAC, with a proof. It
became RFC 2104 (1997) and FIPS 198 (2002), and it is now the most widely used
MAC there is: in TLS, SSH, IPsec, JSON Web Tokens (`HS256`), webhook
signatures, the six-digit codes of authenticator apps (TOTP), and inside HKDF
and PBKDF2 ([Chapter 11](11-Passwords-and-Key-Derivation.md)).

The idea: hash twice, with the key mixed in differently each time.

$$
\mathrm{HMAC}(K, m) = H\big( (K' \oplus \mathit{opad}) \,\Vert\, H( (K' \oplus \mathit{ipad}) \,\Vert\, m ) \big)
$$

- $K'$ is the key padded with zeros to the hash's block size (64 bytes for
  SHA-256), or, if the key is longer than a block, its hash, padded.
- $\mathit{ipad}$ is the byte `36` repeated, $\mathit{opad}$ the byte `5c` repeated. They
  make the inner and outer keys different.

The inner hash is the "key first" MAC from §10.2, which on its own is open to
length extension. The outer hash fixes that: it takes the inner digest as a
short, fixed-length message and hashes it under a second key. An attacker who
extends the inner hash gets a different inner digest, and has no way to compute
the outer hash of it.

**By hand: RFC 4231's test case 2.** Key "Jefe", message "what do ya want for
nothing?". "Jefe" is `4a 65 66 65`; padded to 64 bytes and XORed:

| Step | Value |
|---|---|
| Inner key $K' \oplus \mathit{ipad}$ | `7c535053 36363636 ... 36` (64 bytes) |
| Outer key $K' \oplus \mathit{opad}$ | `16393a39 5c5c5c5c ... 5c` |
| Inner hash: SHA-256(inner key, then message) | `a2e48586 3d27f9d8 64ac8d80 2432a1ed 477d8c4c 6f349d16 d4e7e917 c629cad7` |
| Tag: SHA-256(outer key, then inner hash) | `5bdcc146 bf60754e 6a042426 089575c7 5a003f08 9d273983 9dec58b9 64ec3843` |

Check the first bytes: $\mathtt{4a} \oplus \mathtt{36} = \mathtt{7c}$ and $\mathtt{4a} \oplus \mathtt{5c} = \mathtt{16}$.

**Code it.** HMAC is a few lines on top of a hash:

```python
import hashlib, hmac

def my_hmac(key, msg):
    if len(key) > 64:                    # SHA-256's block is 64 bytes
        key = hashlib.sha256(key).digest()
    key = key.ljust(64, b"\0")
    ipad = bytes(k ^ 0x36 for k in key)
    opad = bytes(k ^ 0x5c for k in key)
    inner = hashlib.sha256(ipad + msg).digest()
    return hashlib.sha256(opad + inner).digest()

tag = my_hmac(b"Jefe", b"what do ya want for nothing?")
print(tag.hex())
print(tag == hmac.new(b"Jefe", b"what do ya want for nothing?", hashlib.sha256).digest())
print(my_hmac(b"k" * 100, b"x") == hmac.new(b"k" * 100, b"x", hashlib.sha256).digest())
# 5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843
# True
# True
```

**Why it is secure.** Bellare, Canetti and Krawczyk proved HMAC secure if the
hash's compression function, keyed through its chaining input, behaves like a
pseudorandom function. In 2006 Bellare proved it again under a weaker
assumption, one that does not need collision resistance at all. That is why the
collapse of MD5 and SHA-1 in [Chapter 9](09-Hash-Functions.md) never turned
into practical forgeries of HMAC-MD5 or HMAC-SHA-1. (Use HMAC-SHA-256 anyway;
there is no reason to build on a broken hash.)

**Verify in constant time.** The receiver compares the tag it computed with the
one it received. An ordinary `==` stops at the first byte that differs, so a
wrong first byte is rejected a little faster than a wrong tenth byte. An
attacker who can time thousands of attempts learns the correct tag one byte at
a time, in about $256 \times 16$ tries instead of $2^{128}$. This broke the Xbox
360's boot check in 2007 and Google's Keyczar library in 2009. Python's
`hmac.compare_digest` takes the same time wherever the difference is; use it
for every tag comparison.

**Keys.** Use a random key at least as long as the hash output, 32 bytes for
HMAC-SHA-256. A password is not a key ([Chapter 11](11-Passwords-and-Key-Derivation.md)).

## 10.4 MACs from a block cipher: CBC-MAC and CMAC

*Level: intermediate.*

Smart cards, payment terminals and radio chips often have AES in hardware and
little room for anything else, so there is a long tradition of building MACs
from a block cipher. It began in banking: the US standards FIPS 113 (1985) and
ANSI X9.9 (1986) authenticated payment messages with DES in CBC mode.

**CBC-MAC.** Encrypt the message in CBC mode with a zero IV and keep only the
last block:

$$
C_0 = 0, \qquad C_i = E_K(C_{i-1} \oplus M_i), \qquad t = C_n.
$$

Bellare, Kilian and Rogaway proved in 1994 that this is secure **if every
message has the same length**. With mixed lengths it breaks with one tag. Let
$t$ be the tag of a one-block message $M$. Now ask the receiver to check the
two-block message $M \,\Vert\, (M \oplus t)$: the first block encrypts to $t$, the
second enters the cipher as $t \oplus M \oplus t = M$, which encrypts to $t$ again.
So the forged message has tag $t$, and nobody needed the key.

**CMAC.** The fix is to treat the last block specially, with a secret mask the
attacker cannot predict. John Black and Phillip Rogaway's XCBC (2000) did it
with three keys; Tetsu Iwata and Kaoru Kurosawa at Ibaraki University in Japan
cut it to one key with OMAC (2003), which NIST adopted as **CMAC** in SP 800-38B
(2005). From the one key, compute $L = E_K(0^{128})$ and two subkeys:

$$
K_1 = L \cdot x, \qquad K_2 = L \cdot x^2 \qquad \text{in } \mathrm{GF}(2^{128}),
$$

where "multiply by $x$" means shift left one bit and, if a 1 fell off the top,
XOR `87` into the last byte. This is the same kind of field arithmetic as
[AES's $\mathrm{GF}(2^8)$](07-AES.md), with 128-bit elements and the polynomial
$x^{128} + x^7 + x^2 + x + 1$. If the last block is full, XOR in $K_1$; if not, pad
it with `80 00 ...` and XOR in $K_2$. Then finish the CBC chain. The masked last
block no longer equals the chaining value a longer message would continue from,
so the splice above fails.

The code uses real AES from the `cryptography` package and checks two of RFC
4493's test vectors, then tries the splice on both MACs:

```python
# pip install cryptography
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def E(k, block):                         # one AES block encryption
    enc = Cipher(algorithms.AES(k), modes.ECB()).encryptor()
    return enc.update(block) + enc.finalize()

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def cbc_mac(k, m):                       # raw CBC-MAC over whole 16-byte blocks
    t = bytes(16)
    for i in range(0, len(m), 16):
        t = E(k, xor(t, m[i:i + 16]))
    return t

def dbl(b):                              # multiply by x in GF(2^128)
    n = int.from_bytes(b, "big") << 1
    if n >> 128:
        n ^= (1 << 128) | 0x87
    return n.to_bytes(16, "big")

def cmac(k, m):                          # RFC 4493
    k1 = dbl(E(k, bytes(16)))
    k2 = dbl(k1)
    if m and len(m) % 16 == 0:
        head, last = m[:-16], xor(m[-16:], k1)
    else:
        r = len(m) % 16
        head, last = m[:len(m) - r], xor(m[len(m) - r:] + b"\x80" + bytes(15 - r), k2)
    return E(k, xor(cbc_mac(k, head), last))

key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
print(cmac(key, b"").hex())                                          # RFC 4493 example 1
print(cmac(key, bytes.fromhex("6bc1bee22e409f96e93d7e117393172a")).hex())   # example 2

m = b"pay Bob $100.00!"                  # one block, tagged by the bank
t = cbc_mac(key, m)
print(cbc_mac(key, m + xor(m, t)) == t)  # True: a two-block forgery
t = cmac(key, m)
print(cmac(key, m + xor(m, t)) == t)     # False
```

```
bb1d6929e95937287fa37d129b756746
070a16b46b4d4144f79bdd9dd04a287c
True
False
```

**Where CMAC runs.** The 4G and 5G integrity algorithms 128-EIA2 and 128-NIA2
are AES-CMAC with a 32-bit tag. Smart-card secure channels (GlobalPlatform
SCP03), payment key blocks (ANSI X9.143) and IPsec (RFC 4494) use it too. A 128-bit
block cipher limits it: after about $2^{64}$ blocks, internal collisions appear,
so SP 800-38B advises at most $2^{48}$ messages per key. For anything that is not
tied to AES hardware, HMAC-SHA-256 has no such limit.

Full details: [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md).

## 10.5 Universal hashing: Wegman-Carter and Poly1305

*Level: intermediate.*

HMAC and CMAC run a full hash or cipher on every block. In 1981 Wegman and
Carter showed that much less is needed. Take a family of simple keyed functions
$h_r$ where two different messages rarely collide (a **universal hash**), and
hide its output with a one-time pad $s$:

$$
t = h_r(m) + s.
$$

If $r$ and $s$ are random and used for **one** message, then even an attacker
with unlimited computing power cannot forge with better odds than the
collision probability of the family. Security comes from counting, not from
assuming that some cipher is hard to break.

**A polynomial hash, by hand.** Work mod the prime $p = 101$. Split the message
into numbers below $p$, say $m = (3, 1, 4)$, and evaluate it as a polynomial at
the secret point $r$:

$$
h_r(m) = 3r^3 + 1 \cdot r^2 + 4r \bmod 101.
$$

With $r = 10$ and $s = 57$: $3000 + 100 + 40 = 3140$, and $3140 = 31 \times 101 + 9$, so
$h = 9$ and the tag is $t = 9 + 57 = 66$.

*Why a forger fails.* Suppose the attacker sees $(m, 66)$ and wants a valid tag
$t'$ for some other $m'$. The difference $h_r(m) - h_r(m')$ is a nonzero polynomial in
$r$ of degree at most 3, so it has at most 3 roots mod 101. Since $s$ hides
$h_r(m)$ completely, every value of $r$ is still equally likely after seeing one
tag, and the attacker's best guess is right for at most 3 of the 101. Their
chance is at most $3/101$, and checking all $101 \times 101$ keys confirms that the
best possible forgery succeeds with probability exactly $3/101$. With $p$ near
$2^{130}$ instead of 101, that becomes negligible.

*Why one key, one message.* Now the sender makes a mistake and tags a second
message $m_2 = (2, 7, 1)$ with the same $r$ and $s$: $h = 2000 + 700 + 10 = 2710 \equiv 84$,
tag $84 + 57 = 141 \equiv 40$. Subtracting the tags removes $s$:

$$
66 - 40 \equiv (3-2)r^3 + (1-7)r^2 + (4-1)r \pmod{101}, \quad\text{that is}\quad r^3 - 6r^2 + 3r \equiv 26.
$$

Trying all 101 values gives one solution, $r = 10$, and then $s = 66 - 9 = 57$. The
attacker has the whole key and can tag anything. Reusing the pad of a
Wegman-Carter MAC is as fatal as reusing a one-time pad.

**Poly1305.** Daniel J. Bernstein's Poly1305 (2005) is this idea at full size.
The prime is $p = 2^{130} - 5$, chosen so reduction is a shift and a multiply by 5.
The 32-byte one-time key is $(r, s)$, with 22 bits of $r$ forced to zero
("clamped") so the arithmetic fits fast 64-bit multiplies. Each 16-byte block,
with a `01` byte appended so that trailing zeros still count, becomes a number
$c_i$, and

$$
t = \big( (c_1 r^q + c_2 r^{q-1} + \cdots + c_q r) \bmod p + s \big) \bmod 2^{128}.
$$

A forgery attempt on a message of $L$ bytes succeeds with probability at most
about $8\lceil L/16 \rceil / 2^{106}$, which for ordinary messages is around $2^{-100}$. In
ChaCha20-Poly1305 the one-time key comes from the cipher: block 0 of ChaCha20's
keystream for each nonce. So "one key, one message" becomes "one nonce, one
message".

The first part of this program checks RFC 8439's test vector; the second makes
the mistake above at full size and recovers $(r, s)$ from two tags:

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
        print(poly1305(fake, m3) == poly1305(key, m3))
        break
# a8061dc1305136c6c22b8baf0c0127a9
# True
```

For one-block messages the two tags differ by $(c_1 - c_2) \cdot r \bmod p$, give or
take a multiple of $2^{128}$ lost in the last step, so a division and a few tries
give $r$, then $s$. This code is not constant-time, and RFC 8439 warns that
general big-number code leaks timing; it is for learning.

**GHASH**, inside AES-GCM, is the same idea in $\mathrm{GF}(2^{128})$, where adding is XOR.
**UMAC** (Black, Halevi, Krawczyk, Krovetz and Rogaway, 1999; RFC 4418) uses an
even faster hash called NH, and is one of OpenSSH's default MACs.

Full details: [Universal hash MACs](../06-mac/Universal-Hash-MACs.md).

## 10.6 More MACs: KMAC, keyed BLAKE2 and SipHash

*Level: intermediate.*

**KMAC.** HMAC's double hashing exists only because Merkle-Damgård hashes leak
their state. A sponge does not ([§9.9](09-Hash-Functions.md)), so for SHA-3 the
naive "key first" MAC is already safe. NIST's KMAC (SP 800-185, 2016) is that
idea, done carefully: cSHAKE with the key encoded and padded into its own block,
then the message, then the requested output length, so that every input is
separated unambiguously and a 32-byte tag is not a prefix of a 64-byte one. It
comes as KMAC128 and KMAC256 and also serves as a NIST key derivation function.
Python's `hashlib` has SHAKE but not cSHAKE, so there is no stdlib example; see
the [KMAC reference](../06-mac/KMAC.md).

**Keyed BLAKE2.** BLAKE2 takes a key as a parameter and RFC 7693 says no HMAC
wrapper is needed: `hashlib.blake2b(msg, key=k)` is a MAC. WireGuard uses keyed
BLAKE2s as its MAC.

**SipHash and hash flooding.** A hash table puts each entry in a bucket chosen
by a hash of its key. If an attacker can choose many keys that land in the same
bucket, every lookup turns into a long list search, and inserting $n$ keys costs
about $n^2$ steps. Scott Crosby and Dan Wallach described this in 2003. In
December 2011 Alexander Klink and Julian Wälde showed at the 28C3 conference in
Berlin that it still worked against PHP, Java, ASP.NET, Python and Ruby web
servers: one crafted form submission of a few hundred kilobytes could keep a
server busy for a minute. Seeded versions of the old fast hashes turned out not
to help, because their collisions did not depend on the seed.

The real fix is a keyed function that is a MAC, small enough for hash tables.
Jean-Philippe Aumasson and Daniel J. Bernstein designed **SipHash** in 2012: a
128-bit key, a 64-bit output, and rounds of add, rotate and XOR on four 64-bit
words. Python (since 3.4), Rust, Ruby, Perl and the Linux kernel use it, each
with a random key per process. The program below is SipHash-2-4 straight from
the paper; it prints the paper's test value.

```python
M = (1 << 64) - 1

def rotl(x, b):
    return (x << b | x >> (64 - b)) & M

def siphash(key, msg, c=2, d=4):
    k0 = int.from_bytes(key[:8], "little")
    k1 = int.from_bytes(key[8:], "little")
    v = [k0 ^ 0x736f6d6570736575, k1 ^ 0x646f72616e646f6d,
         k0 ^ 0x6c7967656e657261, k1 ^ 0x7465646279746573]

    def sipround():
        v[0] = (v[0] + v[1]) & M; v[1] = rotl(v[1], 13) ^ v[0]; v[0] = rotl(v[0], 32)
        v[2] = (v[2] + v[3]) & M; v[3] = rotl(v[3], 16) ^ v[2]
        v[0] = (v[0] + v[3]) & M; v[3] = rotl(v[3], 21) ^ v[0]
        v[2] = (v[2] + v[1]) & M; v[1] = rotl(v[1], 17) ^ v[2]; v[2] = rotl(v[2], 32)

    msg += bytes(7 - len(msg) % 8) + bytes([len(msg) % 256])
    for i in range(0, len(msg), 8):
        m = int.from_bytes(msg[i:i + 8], "little")
        v[3] ^= m
        for _ in range(c):
            sipround()
        v[0] ^= m
    v[2] ^= 0xff
    for _ in range(d):
        sipround()
    return v[0] ^ v[1] ^ v[2] ^ v[3]

print(format(siphash(bytes(range(16)), bytes(range(15))), "016x"))
# a129ca6149be45e5
```

The constants are the ASCII text "somepseudorandomlygeneratedbytes". A 64-bit
tag is too short for a general-purpose MAC; SipHash is for hash tables and
other short-lived checks.

## 10.7 Putting encryption and a MAC together

*Level: intermediate.*

Now combine a cipher with a MAC to get both secrecy and integrity. There are
three ways to order them, and in the 1990s each major protocol picked a
different one:

| Order | What is sent | Used by |
|---|---|---|
| **Encrypt-and-MAC** | $E(m)$ and $\mathrm{MAC}(m)$ | SSH |
| **MAC-then-encrypt** | $E(m \,\Vert\, \mathrm{MAC}(m))$ | SSL and TLS up to 1.2 |
| **Encrypt-then-MAC** | $c = E(m)$ and $\mathrm{MAC}(c)$ | IPsec ESP |

In 2000 Mihir Bellare and Chanathip Namprempre analyzed all three, and in 2001
Hugo Krawczyk asked directly "how secure is SSL?". The answer: only
**encrypt-then-MAC** is secure in general, for any secure cipher and any secure
MAC. Encrypt-and-MAC puts a tag of the *plaintext* in the open; a deterministic
MAC then shows when two messages are equal. MAC-then-encrypt makes the receiver
decrypt *before* it can check anything, so the decryption code handles data the
attacker chose, and any difference in how it fails becomes a leak.

That leak was found, again and again, in TLS:

- **Padding oracles (2002).** Serge Vaudenay showed that if a server using CBC
  ([Chapter 8](08-Modes-of-Operation.md)) reveals whether the *padding* of a
  tampered ciphertext was valid, an attacker can decrypt any block with about
  128 queries per byte. In MAC-then-encrypt the padding is checked before the
  MAC, so the server had to answer that question somehow.
- **Lucky Thirteen (2013).** Nadhem AlFardan and Kenny Paterson at Royal
  Holloway, London, measured that TLS servers took slightly longer to reject a
  record when the padding was valid, because they then computed a longer MAC.
  The timing difference was enough to recover plaintext.
- **POODLE (2014).** Bodo Möller, Thai Duong and Krzysztof Kotowicz at Google
  found that SSL 3.0's padding was not checked at all beyond its last byte,
  making the oracle easy. SSL 3.0 was retired soon after (RFC 7568).

The lesson is the same every time:
**check the tag first, on the ciphertext, and decrypt only if it is valid.**
RFC 7366 (2014) let TLS switch to encrypt-then-MAC, and TLS 1.3 removed the
question by allowing only AEAD ciphers (§10.8).

**Code it: encrypt-then-MAC.** AES in CTR mode, then HMAC-SHA-256 over the IV and
ciphertext, with separate keys:

```python
# pip install cryptography
import hashlib, hmac, os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def seal(enc_key, mac_key, msg):
    iv = os.urandom(16)
    e = Cipher(algorithms.AES(enc_key), modes.CTR(iv)).encryptor()
    ct = iv + e.update(msg) + e.finalize()
    return ct + hmac.new(mac_key, ct, hashlib.sha256).digest()      # MAC the ciphertext

def open_(enc_key, mac_key, box):
    ct, tag = box[:-32], box[-32:]
    if not hmac.compare_digest(tag, hmac.new(mac_key, ct, hashlib.sha256).digest()):
        raise ValueError("forged or damaged")                        # check before decrypting
    d = Cipher(algorithms.AES(enc_key), modes.CTR(ct[:16])).decryptor()
    return d.update(ct[16:]) + d.finalize()

ek, mk = os.urandom(32), os.urandom(32)  # two keys: never one key for both jobs
box = seal(ek, mk, b"pay Bob $100.00 from Alice")
print(open_(ek, mk, box))
evil = bytearray(box)
evil[20] ^= 0x01                         # flip one ciphertext bit
try:
    open_(ek, mk, bytes(evil))
except ValueError as err:
    print(err)
# b'pay Bob $100.00 from Alice'
# forged or damaged
```

This is a sound design, and Signal's message encryption is built this way (AES-CBC
with HMAC-SHA-256). But it has three parts to get right: the IV must be covered
by the MAC (it is, here), the two keys must be separate, and the comparison must
be constant-time. Doing all of that in one well-tested function is the job of
AEAD.

## 10.8 AEAD: authenticated encryption with associated data

*Level: intermediate.*

An **AEAD** does encryption and authentication in one algorithm, with one key,
behind an interface that is hard to misuse. David McGrew wrote the interface
down in RFC 5116 (2008):

- $\mathrm{Encrypt}(K, N, P, A)$ returns a ciphertext with a tag attached.
- $\mathrm{Decrypt}(K, N, C, A)$ returns the plaintext $P$, or **FAIL**, and never
  anything else.

Here $K$ is the secret key and $N$ a **nonce**: not secret, but it must never
repeat under the same key. $A$ is the **associated data**: information that must
be authenticated but stays readable, such as a packet header, a sequence number
or a file name. If anyone changes a single bit of $C$ or $A$, decryption fails.

Phillip Rogaway named the notion and, with Mihir Bellare, John Black and Ted
Krovetz, designed OCB in 2001, an AEAD that needs about one AES call per block.
Charanjit Jutla at IBM found a similar design (IAPM) at the same time. Both were
patented, so the IETF and the Wi-Fi industry used patent-free designs instead:
CCM (CTR mode plus CBC-MAC, 2002, for WPA2) and then GCM.

**AES-GCM.** McGrew and John Viega designed the Galois/Counter Mode in 2004;
NIST standardized it in SP 800-38D (2007). It is CTR-mode encryption plus a
Wegman-Carter MAC whose universal hash, GHASH, works in $\mathrm{GF}(2^{128})$:

$$
\begin{aligned}
H &= \mathrm{AES}_K(0^{128}) && \text{the hash key} \\
J_0 &= N \,\Vert\, 0^{31} \,\Vert\, 1 && \text{the first counter block, for a 96-bit nonce} \\
C_i &= P_i \oplus \mathrm{AES}_K(J_0 + i) && \text{CTR mode, } i = 1, 2, \ldots \\
S &= X_1 H^m \oplus X_2 H^{m-1} \oplus \cdots \oplus X_m H && X_i \text{: blocks of } A,\ C \text{ and the lengths} \\
T &= S \oplus \mathrm{AES}_K(J_0) && \text{the tag}
\end{aligned}
$$

GHASH is a polynomial evaluated at the secret point $H$, exactly like the toy in
§10.5, and $\mathrm{AES}_K(J_0)$ is the one-time pad. Modern CPUs have instructions for
AES rounds and for the carry-less multiplication GHASH needs, which makes GCM
very fast, and it is the most used cipher on the internet.

**ChaCha20-Poly1305.** On phones and small chips without AES instructions, AES
is slower and hard to make constant-time. Adam Langley at Google proposed in 2013
combining Bernstein's ChaCha20 ([Chapter 5](05-Stream-Ciphers.md)) with
Poly1305; it became RFC 7539 (2015), now RFC 8439. Block 0 of ChaCha20 for the
key and nonce gives the Poly1305 key, the following blocks encrypt, and Poly1305
covers the associated data, the ciphertext and both lengths. TLS 1.3, WireGuard,
OpenSSH and QUIC all offer it.

With a library, both look the same:

```python
# pip install cryptography
import os
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305

for cls in (AESGCM, ChaCha20Poly1305):
    aead = cls(os.urandom(32))
    nonce = os.urandom(12)               # 96 bits, never reused with this key
    header = b"to:bank msg#42"           # associated data: readable, but covered by the tag
    ct = aead.encrypt(nonce, b"pay Bob $100.00", header)
    print(cls.__name__, len(ct), aead.decrypt(nonce, ct, header))
    try:
        aead.decrypt(nonce, ct, b"to:bank msg#43")    # same ciphertext, changed header
    except InvalidTag:
        print("  changed header: rejected")
```

```
AESGCM 31 b'pay Bob $100.00'
  changed header: rejected
ChaCha20Poly1305 31 b'pay Bob $100.00'
  changed header: rejected
```

The 15-byte message became 31 bytes: the ciphertext is the same length as the
plaintext, plus a 16-byte tag. The nonce travels with it in the clear.

**Choosing nonces.** A counter is safest: TLS 1.3 XORs the record number into a
fixed per-connection IV, so nonces never repeat. Random 96-bit nonces are fine
for a limited number of messages: by the birthday bound
([§9.3](09-Hash-Functions.md)), SP 800-38D caps one GCM key at $2^{32}$ random
nonces, which keeps the chance of a repeat near $2^{-33}$.

## 10.9 Break it: one repeated nonce

*Level: intermediate.*

What happens if a nonce is used twice under the same key, through a bug, a
restored virtual machine snapshot, or two servers sharing a key and a counter?

**Secrecy goes first.** Both messages are XORed with the same keystream, so the
XOR of the two ciphertexts equals the XOR of the two plaintexts, the "two-time
pad" of [Chapter 5](05-Stream-Ciphers.md). Anyone who knows or guesses one
message reads the other.

**Then integrity.** The two tags use the same pad $\mathrm{AES}_K(J_0)$ and the same $H$.
For two one-block messages with no associated data, each tag is

$$
T = C \cdot H^2 \oplus L \cdot H \oplus \mathrm{AES}_K(J_0),
$$

where $L$ is the length block. XOR the two tags and both the pad and the
$L \cdot H$ term cancel:

$$
T_1 \oplus T_2 = (C_1 \oplus C_2) \cdot H^2 .
$$

Everything here except $H$ is public, so the attacker divides to get $H^2$,
takes the square root (in $\mathrm{GF}(2^{128})$ squaring is a linear map, and every
element has exactly one root, $x^{2^{127}}$), and then recovers the pad. With $H$
and the pad they can tag any ciphertext for that nonce. Antoine Joux pointed this
out in 2006 and called it the "forbidden attack". For longer messages the
equation is a higher-degree polynomial in $H$, which is still easy to solve.

The program below does it against the real AES-GCM in the `cryptography`
package. The only arithmetic it needs is multiplication in GCM's field.

```python
# pip install cryptography
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def gf_mul(x, y):                        # multiply in GF(2^128), GCM's bit order
    z = 0
    for i in range(127, -1, -1):
        if y >> i & 1:
            z ^= x
        x = x >> 1 ^ (0xe1 << 120 if x & 1 else 0)
    return z

def gf_pow(x, e):
    r = 1 << 127                         # the field's "1" in GCM's bit order
    while e:
        if e & 1:
            r = gf_mul(r, x)
        x, e = gf_mul(x, x), e >> 1
    return r

def gf_inv(x):
    return gf_pow(x, (1 << 128) - 2)

key, nonce = os.urandom(16), os.urandom(12)
gcm = AESGCM(key)
m1, m2 = b"pay alice $10.00", b"pay steve $99.00"      # 16 bytes each
out1, out2 = gcm.encrypt(nonce, m1, None), gcm.encrypt(nonce, m2, None)   # the mistake
num = lambda b: int.from_bytes(b, "big")
c1, t1, c2, t2 = num(out1[:16]), num(out1[16:]), num(out2[:16]), num(out2[16:])

# For a one-block message, tag = C*H^2 + L*H + AES_K(J0). Subtract the two tags:
h2 = gf_mul(t1 ^ t2, gf_inv(c1 ^ c2))    # H^2
h = gf_pow(h2, 1 << 127)                 # square root: squaring is linear here
L = 128                                  # the length block: 0 bits of AD, 128 of text
mask = t1 ^ gf_mul(c1, h2) ^ gf_mul(L, h)            # AES_K(J0)

c3 = c1 ^ num(m1) ^ num(b"pay mallory $999")         # flip the bits we want
t3 = gf_mul(c3, h2) ^ gf_mul(L, h) ^ mask
forged = c3.to_bytes(16, "big") + t3.to_bytes(16, "big")
print(gcm.decrypt(nonce, forged, None))
# b'pay mallory $999'
```

The library checked the tag and accepted it. In GCM the recovered $H$ is
worse than a one-message loss: $H$ depends only on the key, so from any one
valid message under any other nonce the attacker can compute that nonce's pad
too and forge there, until the key changes. In ChaCha20-Poly1305 a
repeated nonce gives away only that nonce's Poly1305 key (§10.5), which is bad
but contained.

**It happens.** In 2016 Hanno Böck, Aaron Zauner, Sean Devlin, Juraj
Somorovsky and Philipp Jovanovic scanned the internet and found 184 HTTPS
servers repeating GCM nonces, among them sites belonging to Visa, and
about 70,000 more that used random nonces and so risked it. In 2017 Mathy
Vanhoef at KU Leuven in Belgium published **KRACK**: by replaying one message
of the Wi-Fi WPA2 handshake, an attacker could make a device reinstall its key
and reset its nonce counter, forcing nonce reuse in CCMP and GCMP on billions of
devices until they were patched.

## 10.10 Surviving nonce misuse

*Level: intermediate.*

If nonces cannot be trusted, use a design that degrades gracefully.

**SIV.** Rogaway and Thomas Shrimpton (2006) proposed the **synthetic IV**:
compute a MAC of the associated data and the plaintext *first*, and use that
tag as the IV for CTR-mode encryption. Encrypting the same message twice with
the same nonce gives the same ciphertext, which reveals only that the two
messages were equal, and nothing else. AES-SIV is RFC 5297 (2008). The price is
two passes: encryption cannot start until the whole message has been read.

**AES-GCM-SIV.** Shay Gueron and Yehuda Lindell (2015, RFC 8452 in 2019)
applied the same idea with GCM's fast parts: each nonce derives its own keys,
POLYVAL (a little-endian twin of GHASH) runs over the data, and its masked
output is both the tag and the starting counter. It runs at nearly GCM's speed.

**Longer nonces.** XChaCha20-Poly1305 has a 192-bit nonce, so random nonces
never collide in practice; it is the usual choice in libsodium. AEGIS-256 has a
256-bit nonce.

**Key commitment.** One more property most AEADs lack: a GCM or
ChaCha20-Poly1305 ciphertext can be built to decrypt validly under *two
different keys*, to two different messages. In 2018 Yevgeniy Dodis, Paul
Grubbs, Thomas Ristenpart and Joanne Woodage used this ("invisible
salamanders") to send an abusive image through Facebook Messenger's encrypted
abuse-reporting system that showed one picture to the recipient and another to
the moderators. In 2021 Julia Len, Grubbs and Ristenpart used it to test many
password guesses with one ciphertext against servers that derived keys from
passwords. Where an attacker can choose keys, add a key commitment (for
example a hash of the key stored with the ciphertext) or use an AEAD designed
to commit.

## 10.11 In the real world

**What to use.**

| Situation | Use |
|---|---|
| Encrypting anything | an AEAD: AES-GCM with AES hardware, ChaCha20-Poly1305 without |
| Random nonces, many senders, VM snapshots | XChaCha20-Poly1305, AES-GCM-SIV or AEGIS-256 |
| A MAC alone, with a long-term key | HMAC-SHA-256 |
| A MAC on AES-only hardware | AES-CMAC |
| Hash tables with untrusted keys | SipHash (your language already does it) |
| Small sensors and chips | Ascon-AEAD128 (NIST SP 800-232, 2025) or AES-CCM |

**Where they run.** TLS 1.3 (RFC 8446) allows only AEADs: AES-128-GCM is
mandatory, and AES-256-GCM, ChaCha20-Poly1305 and two CCM suites are defined.
WireGuard uses ChaCha20-Poly1305 only. Wi-Fi WPA2 uses AES-CCM (CCMP) and WPA3
adds GCMP. SSH offers `chacha20-poly1305@openssh.com`, AES-GCM, and
encrypt-then-MAC versions of HMAC and UMAC. IPsec ESP uses AES-GCM. Around the
world the same patterns appear with national algorithms: the 3GPP integrity
algorithm 128-EIA3 uses China's ZUC stream cipher, and RFC 8998 (2021) defines
TLS 1.3 suites with China's SM4 block cipher in GCM and CCM modes.

**Competitions.** Daniel J. Bernstein organized the CAESAR competition (2013 to
2019) for new AEADs. Its final portfolio named Ascon (Austria) and ACORN
(Singapore) for small devices, AEGIS-128 (Singapore and Belgium) and OCB for
speed, and Deoxys-II and COLM for defense in depth. NIST's lightweight
competition then chose Ascon in 2023.

**Rules that hold everywhere.**

- Never reuse a nonce under one key. Use counters where you can.
- Never act on decrypted data before the tag is checked; an API that streams
  plaintext out before verifying loses the protection.
- Compare tags in constant time.
- Rekey before the limits: TLS 1.3 asks for a new key after about $2^{24.5}$ full
  records with AES-GCM.
- Short tags (32 or 64 bits) only where the protocol limits forgery attempts.

**Standards.** RFC 2104 and FIPS 198-1 (HMAC), SP 800-38B and RFC 4493 (CMAC),
SP 800-38D (GCM and GMAC), RFC 8439 (ChaCha20-Poly1305), RFC 5116 (the AEAD
interface), RFC 8452 (AES-GCM-SIV), SP 800-185 (KMAC). Status and parameters:
the [MAC table](../index.md#6-mac) and the
[modes and AEAD table](../index.md#5-cipher-modes-and-aead). Reference pages:
[HMAC](../06-mac/HMAC.md), [Block-cipher MACs](../06-mac/Block-Cipher-MACs.md),
[Universal hash MACs](../06-mac/Universal-Hash-MACs.md),
[KMAC](../06-mac/KMAC.md), [SipHash](../06-mac/SipHash.md) and
[AEAD](../05-modes-aead/AEAD.md).

## 10.12 Going deeper

*Level: expert.*

??? abstract "Why encrypt-then-MAC is secure: IND-CPA plus INT-CTXT"

    Bellare and Namprempre (ASIACRYPT 2000) defined two integrity notions. **INT-PTXT**: an attacker
    cannot make the receiver accept a ciphertext that decrypts to a plaintext never sent. **INT-CTXT**:
    an attacker cannot make the receiver accept *any* ciphertext never sent. The second is stronger.

    Their theorem: if a scheme is IND-CPA (secret under chosen-plaintext attack,
    [Chapter 17](17-Defining-Security.md)) and INT-CTXT, then it is **IND-CCA**, secret even when the
    attacker can submit ciphertexts for decryption. The proof is short: any decryption query the attacker
    makes is either a ciphertext it got from the encryption oracle (answer known) or a new one, which by
    INT-CTXT is rejected. So the decryption oracle is useless, and IND-CPA finishes the job.

    Encrypt-then-MAC with a strongly unforgeable MAC (one where even a new tag for an old message counts as
    a forgery) gives INT-CTXT directly, so it is IND-CCA for any IND-CPA cipher. MAC-then-encrypt gives only
    INT-PTXT in general; Krawczyk (CRYPTO 2001) showed it is secure with CTR or a stream cipher, but the
    padding oracles of §10.7 show how fragile that is in practice. An AEAD is required to meet both
    IND-CPA and INT-CTXT directly (Rogaway, 2002).

??? abstract "Generic forgeries on iterated MACs, and why HMAC stops at $2^{n/2}$"

    Any MAC that keeps an $n$-bit chaining value and processes the message block by block has a generic
    weakness found by Preneel and van Oorschot (CRYPTO 1995). Ask for tags on about $2^{n/2}$ messages that
    all end with the same block. By the birthday bound, two of them, $m$ and $m'$, collide in the internal
    state before the last block; you see this as equal tags. Then for any suffix $x$, $m \,\Vert\, x$ and
    $m' \,\Vert\, x$ have equal tags too, so one tag query gives a forgery.

    For HMAC-SHA-256 that needs about $2^{128}$ chosen messages under one key, which is why RFC 2104 quotes
    that bound. For CBC-MAC and CMAC with AES, the chaining value is 128 bits and the bound is $2^{64}$
    blocks, which is why SP 800-38B limits a key to $2^{48}$ messages. Wider-state designs and "beyond
    birthday bound" MACs (for example PMAC with tweakable block ciphers) exist for the cases where this
    matters.

??? abstract "Polynomial MACs: the exact bound, and short-tag attacks on GCM"

    For two different messages of at most $\ell$ blocks, $h_r(m) - h_r(m')$ is a nonzero polynomial of degree at
    most $\ell$ in $r$, with at most $\ell$ roots. With $r$ uniform in a field of size $q$, the collision
    probability is at most $\ell / q$. The family is **$\varepsilon$-almost-$\Delta$-universal** with
    $\varepsilon = \ell/q$: for any fixed difference $\delta$, $\Pr[h_r(m) - h_r(m') = \delta] \le \ell/q$. Adding a uniform pad
    $s$ turns this into a MAC where one forgery attempt succeeds with probability at most $\ell/q$, against an
    unbounded attacker. Replacing the truly random pad by $\mathrm{AES}_K(N)$ or ChaCha20 adds the PRF advantage of
    the cipher, plus a birthday term for AES since it is a permutation.

    For GCM, $q = 2^{128}$, but tags may be truncated to $\tau$ bits. Niels Ferguson (2005) showed that with
    short tags the polynomial's structure helps the forger: choose a forgery whose difference polynomial is
    *linear* over $\mathrm{GF}(2)$ in the bits of $H$ (using only blocks at positions $2^i$, since squaring
    is linear), so that many of the tag bits stay unchanged. Each successful forgery then reveals linear
    equations on $H$, and the next one is easier. For 32-bit tags on long messages, the first forgery takes
    about $2^{16}$ tries rather than $2^{32}$. That is why NIST is removing tags under 96 bits from SP 800-38D.

??? abstract "Multi-user security and why TLS 1.3 randomizes nonces"

    The bounds above are for one key. Real attackers face millions of users. Against a deterministic
    nonce such as a counter starting at 0, an attacker who precomputes AES of the first counter block under
    $2^k$ candidate keys can test them against all users at once, which costs a factor of the number of users
    in security. Bellare and Tackmann (CRYPTO 2016) analyzed this for TLS 1.3, whose record nonce is the
    sequence number XORed with a per-connection random IV derived from the handshake. That random mask makes
    each user's nonces unpredictable, restoring nearly single-user security. The same reasoning is why
    AES-256 is sometimes preferred for AEAD even where AES-128's single-key security would be enough.

??? abstract "Committing AEAD, and how to add it"

    An AEAD is **key-committing** if it is infeasible to find a ciphertext that decrypts validly under two
    keys. GCM fails because GHASH is linear: for any two keys $K_1, K_2$ and nonce, one can solve a linear
    system for a ciphertext block that makes both tags equal. ChaCha20-Poly1305 fails for a similar reason.

    Fixes: (1) append a commitment, such as $\mathrm{HMAC}(K, \text{"commit"} \,\Vert\, N)$, and check it before
    decrypting; (2) the "padding fix", prepend a block of zeros to the plaintext and check it on decryption,
    which gives commitment at about $2^{64}$ work for 128-bit blocks (Albertini, Duong, Gueron, Kölbl, Luykx
    and Schmieg, USENIX Security 2022); (3) use a design with a wide tag or an explicit commitment. Some
    newer specifications, such as RFC 10032's AEGIS, discuss their commitment level, and the IETF and NIST
    have work under way on committing modes.

## Check yourself

??? question "1. A message is encrypted with AES-CTR. An attacker knows it reads \"amount=0100\" at bytes 20 to 30. Without the key, how do they change it to \"amount=9100\"?"

    XOR $\mathtt{"0"} \oplus \mathtt{"9"} = \mathtt{0x30} \oplus \mathtt{0x39} = \mathtt{0x09}$ into ciphertext byte 27 (the first digit of the amount).
    CTR decryption XORs the same keystream back, and the plaintext digit becomes 9. A MAC over the
    ciphertext would catch it.

??? question "2. A MAC has 64-bit tags. An attacker can try 1,000 forgeries a second, forever. How long until one succeeds, on average?"

    About $2^{64}/1000 \approx 1.8 \times 10^{16}$ seconds, roughly 585 million years. With 32-bit tags it would be about
    50 days, which is why short tags need a protocol that cuts off repeated failures.

??? question "3. Why is $\mathrm{SHA3\text{-}256}(K \,\Vert\, m)$ a secure MAC while $\text{SHA-256}(K \,\Vert\, m)$ is not?"

    SHA-256 outputs its whole chaining state, so anyone can continue hashing from a tag (length extension).
    SHA3-256 outputs only part of the rate and never its 512 capacity bits, so the tag does not let anyone
    continue. KMAC formalizes this with careful encodings.

??? question "4. A server compares HMAC tags with `==` on Python byte strings. Is that a problem?"

    Yes in principle. Byte-string comparison can stop at the first difference, so the time depends on how
    many leading bytes are right, and over a network with enough samples that has been exploited. Use
    `hmac.compare_digest`. It costs nothing.

??? question "5. In the toy Wegman-Carter MAC of §10.5, with $p = 101$, $r = 10$, $s = 57$, compute the tag of $m = (1, 0, 0)$."

    $h = 1 \cdot 10^3 = 1000 = 9 \times 101 + 91$, so $h = 91$, and $t = 91 + 57 = 148 \equiv 47 \pmod{101}$.

??? question "6. Which order is this, and is it safe? The sender computes $t = \mathrm{HMAC}(K_2, m)$ and sends $\mathrm{AES\text{-}CBC}_{K_1}(m \,\Vert\, t)$."

    MAC-then-encrypt, as in TLS before 1.3. The receiver must decrypt and remove the padding before it can
    check the MAC, so any difference in how bad padding and bad MACs are handled (an error message, a
    timing difference) becomes a padding oracle, as in Vaudenay 2002, Lucky Thirteen and POODLE. It can be
    made safe with great care, but encrypt-then-MAC or an AEAD avoids the problem.

??? question "7. Two AES-GCM messages were sent with the same key and nonce. The plaintext of the first is known. What can an attacker do?"

    Read the second: XOR the two ciphertexts and the known plaintext. Recover $H$ from the two tags, and so
    forge any message under any nonce for that key (§10.9). The key must be thrown away.

??? question "8. A service encrypts with AES-GCM using random 96-bit nonces and sends $2^{40}$ messages under one key. Roughly what is the chance that some nonce repeated?"

    By the birthday bound, about $q^2 / 2^{97}$ with $q = 2^{40}$: $2^{80}/2^{97} = 2^{-17}$, about 1 in 131,000. That is far
    above NIST's $2^{-32}$ target, which is why random nonces are limited to $2^{32}$ messages per key. Use a
    counter, rekey, or switch to XChaCha20-Poly1305.

??? question "9. Why does Poly1305 append a `01` byte to each 16-byte block before turning it into a number?"

    Without it, a block and the same block with extra trailing zero bytes (in a short final block) would be
    the same number, so messages differing only in trailing zeros would get the same tag. The `01` marks
    where the block ends, and it also means no block is ever the number zero.

??? question "10. In the GCM attack of §10.9, why is the square root of $H^2$ unique, and why is it $x^{2^{127}}$?"

    In $\mathrm{GF}(2^{128})$, squaring is the Frobenius map, which is a bijection (and linear over $\mathrm{GF}(2)$), so each
    element has exactly one square root. Since every element satisfies $x^{2^{128}} = x$, the element
    $y = x^{2^{127}}$ satisfies $y^2 = x^{2^{128}} = x$.

## What you learned

- Encryption does not give integrity: XOR-based ciphers let an attacker edit
  plaintext without reading it. A MAC adds a tag only the key holder can make.
- HMAC hashes twice to defeat length extension and is secure even on hashes with
  broken collision resistance; CMAC fixes CBC-MAC for messages of any length;
  Wegman-Carter MACs such as Poly1305 and GHASH are fast and provably secure but
  need a fresh one-time key for every message.
- Compare tags in constant time. Never decrypt before verifying.
- Encrypt-then-MAC is the safe order; MAC-then-encrypt gave TLS a decade of
  padding oracles. AEAD (AES-GCM, ChaCha20-Poly1305) packages it correctly and
  authenticates headers as associated data.
- A repeated nonce breaks both secrecy and integrity; in GCM it reveals the hash
  key. Counters, AES-GCM-SIV or XChaCha20-Poly1305 prevent it.
- Most AEADs are not key-committing, which matters when an attacker can choose
  keys.

**Next:** [Chapter 11](11-Passwords-and-Key-Derivation.md) turns secrets that
are not proper keys, passwords and Diffie-Hellman outputs, into keys these
algorithms can use.

## Further reading

- Mihir Bellare, Ran Canetti and Hugo Krawczyk, "Keying Hash Functions for Message Authentication",
  CRYPTO '96; RFC 2104.
- Mark Wegman and Larry Carter, "New Hash Functions and Their Use in Authentication and Set Equality",
  *Journal of Computer and System Sciences* 22, 1981.
- Daniel J. Bernstein, "The Poly1305-AES message-authentication code", FSE 2005; RFC 8439.
- Mihir Bellare and Chanathip Namprempre, "Authenticated Encryption: Relations among Notions and Analysis
  of the Generic Composition Paradigm", ASIACRYPT 2000; Hugo Krawczyk, "The Order of Encryption and
  Authentication for Protecting Communications (or: How Secure Is SSL?)", CRYPTO 2001.
- Serge Vaudenay, "Security Flaws Induced by CBC Padding", EUROCRYPT 2002; AlFardan and Paterson,
  "Lucky Thirteen", IEEE S&P 2013.
- David McGrew and John Viega, "The Security and Performance of the Galois/Counter Mode", 2004;
  SP 800-38D; Antoine Joux, "Authentication Failures in NIST version of GCM", 2006.
- [Böck, Zauner, Devlin, Somorovsky and Jovanovic, "Nonce-Disrespecting Adversaries" (WOOT 2016)](https://eprint.iacr.org/2016/475);
  [Vanhoef and Piessens, "Key Reinstallation Attacks" (CCS 2017)](https://www.krackattacks.com/).
- Phillip Rogaway and Thomas Shrimpton, "A Provable-Security Treatment of the Key-Wrap Problem",
  EUROCRYPT 2006 (SIV); RFC 8452.
- Dodis, Grubbs, Ristenpart and Woodage, "Fast Message Franking: From Invisible Salamanders to
  Encryptment", CRYPTO 2018.
- David Wong, *Real-World Cryptography* (Manning, 2021), chapters 3 and 4, for a practitioner's view.
