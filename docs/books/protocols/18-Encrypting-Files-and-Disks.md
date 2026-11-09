# 18. Encrypting files and disks

*Everything so far protected data in motion. Most data spends its life at
rest: on a laptop's drive, a phone's flash, a backup disk, a USB stick in a
bag. Protecting it looks easier, since there is no one to negotiate with and
no network attacker in the middle, but it has its own hard parts. A disk
must be readable at any sector without decrypting the rest, and a sector has
no spare bytes for a nonce or a tag. The key must be available every time
the machine starts, yet never to the thief who carries the machine away. And
the most effective attacks read the key from memory or from the chip that
guards it, not from the ciphertext. This chapter covers both jobs. For
files, you will decrypt a real `age` file and write the format yourself,
chunked AEAD and all. For disks, you will code XTS and match IEEE 1619's
test vector, then use it to show what disk encryption does not protect:
snapshots, rollbacks and flipped bits, and code Adiantum, the wide-block
mode built for cheap phones. Then the keys: LUKS's key check and
anti-forensic splitter, BitLocker's recovery password, Apple's and
Android's key hierarchies, a TPM policy computed byte by byte, cold boots
and evil maids.*

!!! abstract "In this chapter"
    **You will learn:**

    - why encrypting a file and encrypting a disk are different problems;
    - age's design: one file key, a stanza per recipient, a MAC'd header and
      chunked ChaCha20-Poly1305, coded and checked against a real file;
    - what a file format without signatures can and cannot prove;
    - why disks need length-preserving, tweakable encryption, and how XTS
      works, coded and checked against IEEE 1619;
    - what XTS leaks and allows: snapshots, rollback, malleability;
    - age's post-quantum recipient (2025);
    - wide-block modes and authenticated storage; Adiantum, coded and
      checked against a published test vector;
    - how LUKS, BitLocker and FileVault store and unlock the volume key;
    - the key hierarchies of Apple's FileVault and Android's file-based
      encryption;
    - how a TPM policy binds a disk key to PCRs, what breaks it, and how a
      signed policy survives a firmware update;
    - TPMs, secure enclaves and their attacks; cold boot and evil maid;
    - what is different about data at rest on Mars.

    **You need:** [Chapter 15](15-Email-OpenPGP-and-SMIME.md) (OpenPGP, the
    older way to encrypt files) and [Chapter 17](17-Group-Messaging-MLS.md)
    (HPKE and ChaCha20-Poly1305); block ciphers, modes of operation and
    password hashing from Chapters [6](../../book/06-Block-Ciphers.md),
    [8](../../book/08-Modes-of-Operation.md) and
    [11](../../book/11-Passwords-and-Key-Derivation.md) of book 1. PCRs and
    measured boot are introduced in the Engineering book's
    [chapter 11](../engineering/11-Hardware-for-Keys.md), which §18.8 builds
    on.

    **Levels:** §18.1 and §18.2 are for beginners, §18.3 to §18.11 are
    intermediate, §18.12 is expert.

## 18.1 Two different jobs

*Level: beginner.*

**Encrypting a file** is like sending a message to your future self or to
someone else. The output can be longer than the input, so there is room for
a random nonce, an authentication tag, and a header saying who can open it.
The whole file is usually read from start to end. The tools are the ones
from earlier chapters: a fresh symmetric key, an AEAD mode, and that key
encrypted to each reader's public key or under a passphrase. OpenPGP
(Chapter 15) does this, and so does **age**, a modern format designed to do
only this.

**Encrypting a disk** is a different shape of problem. The operating system
reads and writes **sectors**, 512 or 4,096 bytes each, in any order, millions
of times a second. The encryption layer sits underneath the file system and
must turn each plaintext sector into exactly one ciphertext sector of the
same size, because the file system above has already decided where
everything goes. No room for a nonce, no room for a tag. So disk encryption
is **length-preserving** and deterministic for a given sector and content,
and it cannot detect tampering. The question becomes: what is the best
possible encryption under those rules?

Both share the last problem: **where the key lives.** A file's key can be
derived from a passphrase each time; a disk's key must be ready at boot,
which leads to TPMs, recovery keys and a whole family of attacks on the
machine rather than the cipher.

## 18.2 age: one file key, many recipients

*Level: beginner.*

In 2019 Filippo Valsorda and Ben Cartwright-Cox designed **age** ("actually
good encryption") as a deliberate opposite of OpenPGP for files: one fixed
set of algorithms, no options, no signatures, no keyrings, small keys that
fit in a command line. The format is a specification at C2SP (the Community
Cryptography Specification Project), with interoperable implementations in
Go, Rust and TypeScript.

An age file has a text header and a binary payload:

```text
age-encryption.org/v1
-> X25519 BqfSW+FITH+ktu2/aWNLMQTJaQGrodG6cg6Wk36ycmM
xW4BIPG4nyiDA1QFidwa49P29Mo0MPhee2/rG9HNinM
--- 49lK941JRylxEx1Qu/QgXaL9LVc90eYzGPamJHtVehc
(16-byte nonce)(payload in 64 KiB chunks, each with a 16-byte tag)
```

That is real output from age 1.1.1 encrypting a 12-byte file to one X25519
key. Line 1 names the version, which fixes every algorithm. Lines 2 and 3 are
a **stanza**: the recipient type, its arguments, and a body. Line 4 is a MAC
over everything above it.

To encrypt, age:

1. picks a random 16-byte **file key**;
2. for each recipient writes a stanza wrapping the file key. For an X25519
   recipient (an `age1…` key), it makes an ephemeral X25519 key, computes a
   Diffie-Hellman with the recipient, derives a wrap key with HKDF-SHA-256
   (salt: both public keys; info: `age-encryption.org/v1/X25519`), and seals
   the file key with ChaCha20-Poly1305 under an all-zero nonce, safe because
   each wrap key is used once. For a passphrase, an `scrypt` stanza holds a
   salt and the work factor, and must be the only stanza;
3. computes HMAC-SHA-256 over the header with a key derived from the file
   key, so that any change to any stanza is detected by every recipient;
4. picks a 16-byte nonce, derives the payload key with HKDF from the file key
   and that nonce, and encrypts the data in 64 KiB chunks with
   ChaCha20-Poly1305. Each chunk's 12-byte nonce is an 11-byte counter and a
   final byte that is 1 only for the last chunk.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The layout of an age file: a text header with the version line, one stanza per recipient each wrapping the same file key, a MAC line; then a 16-byte nonce and the payload in 64 KiB chunks, each with a tag, the last chunk marked with a final flag" fill="currentColor" font-size="12.5">
<rect x="20" y="20" width="290" height="30" rx="5" class="soft" stroke="currentColor"/><text x="34" y="40">age-encryption.org/v1</text>
<rect x="20" y="56" width="290" height="44" rx="5" class="soft-acc" stroke="currentColor"/><text x="34" y="75">-&gt; X25519 (ephemeral key)</text><text x="34" y="92" font-size="11.5">file key, sealed for Alice</text>
<rect x="20" y="106" width="290" height="44" rx="5" class="soft-acc" stroke="currentColor"/><text x="34" y="125">-&gt; X25519 (ephemeral key)</text><text x="34" y="142" font-size="11.5">file key, sealed for Bob</text>
<rect x="20" y="156" width="290" height="30" rx="5" class="soft" stroke="currentColor"/><text x="34" y="176">--- HMAC of everything above</text>
<rect x="330" y="20" width="290" height="166" rx="6" stroke="currentColor" fill="none"/>
<text x="346" y="44" font-size="12">file key (16 random bytes)</text>
<text x="346" y="66" font-size="12">→ HKDF "header" → MAC key</text>
<text x="346" y="88" font-size="12">→ HKDF(nonce, "payload") → payload key</text>
<text x="346" y="120" font-size="12">wrap key = HKDF(DH(e, R), E ‖ R,</text>
<text x="346" y="138" font-size="12">  "age-encryption.org/v1/X25519")</text>
<text x="346" y="170" font-size="11.5">Each recipient unwraps the same file key.</text>
<rect x="20" y="206" width="70" height="40" rx="4" class="soft" stroke="currentColor"/><text x="55" y="231" text-anchor="middle" font-size="11.5">nonce</text>
<rect x="96" y="206" width="170" height="40" rx="4" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/><text x="181" y="225" text-anchor="middle" font-size="11.5">chunk 0 + tag</text><text x="181" y="240" text-anchor="middle" font-size="10.5">nonce 00…00 ‖ 00</text>
<rect x="272" y="206" width="170" height="40" rx="4" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/><text x="357" y="225" text-anchor="middle" font-size="11.5">chunk 1 + tag</text><text x="357" y="240" text-anchor="middle" font-size="10.5">nonce 00…01 ‖ 00</text>
<rect x="448" y="206" width="172" height="40" rx="4" class="acc-fill" fill-opacity="0.45" stroke="currentColor"/><text x="534" y="225" text-anchor="middle" font-size="11.5">last chunk + tag</text><text x="534" y="240" text-anchor="middle" font-size="10.5">nonce 00…02 ‖ 01</text>
<text x="320" y="264" text-anchor="middle" font-size="11.5">64 KiB chunks: random access, streaming, and truncation is caught by the final flag</text>
</svg>
<figcaption>Figure 18.1. An age file. The header says who can open it; the payload is the STREAM construction, chunked AEAD with a counter and a last-chunk flag.</figcaption>
</figure>

The chunk layout is the **STREAM** construction of Hoang, Reyhanitabar,
Rogaway and Vizár (CRYPTO 2015), the same idea as OpenPGP's SEIPD v2 in
Chapter 15. Each chunk is authenticated before any of its plaintext is
released, chunks cannot be reordered (the counter), and the file cannot be
cut short at a chunk boundary (the final flag). And since every chunk's
nonce is computable, a reader can seek to any chunk and decrypt only that
one: useful for large backups.

### A worked example by hand

Our program below encrypts 149,770 bytes. That is two full chunks of
65,536 bytes and a last chunk of 18,698. Their nonces are

```text
chunk 0:  00 00 00 00 00 00 00 00 00 00 00 | 00
chunk 1:  00 00 00 00 00 00 00 00 00 00 01 | 00
chunk 2:  00 00 00 00 00 00 00 00 00 00 02 | 01    <- the last one
```

and the payload is 16 (nonce) + 149,770 + 3 × 16 (tags) = 149,834 bytes. If
an attacker removes chunk 2, the reader treats chunk 1 as last, tries the
nonce `…01 | 01`, and the tag fails. If an attacker removes 1,000 bytes from
the end, the last tag fails. Overhead for a large file: 16 bytes per 64 KiB,
0.024 percent.

### Code it: an age file, both ways

The program first decrypts a real file, made by `age -p -a` (version 1.1.1)
with a passphrase that age generated, checking the scrypt stanza's tag, the
header MAC and the payload tag. Then it writes the format itself: a file to
two X25519 recipients, which Bob decrypts, and three attacks that fail.

```python
# age (age-encryption.org/v1): decrypt a real passphrase-encrypted file made by
# age 1.1.1, then encrypt and decrypt to an X25519 key, with every tag checked.
import base64, hashlib, hmac, random, struct

P = 2**255 - 19
def x25519(k, u=(9).to_bytes(32, "little")):           # RFC 7748
    k = bytearray(k); k[0] &= 248; k[31] = (k[31] & 127) | 64
    k, x1 = int.from_bytes(k, "little"), int.from_bytes(u, "little") & (2**255 - 1)
    x2, z2, x3, z3, swap = 1, 0, x1, 1, 0
    for t in range(254, -1, -1):
        bit = (k >> t) & 1
        if swap ^ bit: x2, x3, z2, z3 = x3, x2, z3, z2
        swap = bit
        A, B, C, D = x2 + z2, x2 - z2, x3 + z3, x3 - z3
        AA, BB, DA, CB = A * A, B * B, D * A, C * B
        x3, z3 = (DA + CB) ** 2 % P, x1 * (DA - CB) ** 2 % P
        x2, z2 = AA * BB % P, (AA - BB) * (AA + 121665 * (AA - BB)) % P
    if swap: x2, z2 = x3, z3
    return (x2 * pow(z2, P - 2, P) % P).to_bytes(32, "little")

def chacha20_block(key, counter, nonce):                # RFC 8439
    def rotl(v, c): return ((v << c) & 0xffffffff) | (v >> (32 - c))
    init = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574, *struct.unpack("<8I", key),
            counter, *struct.unpack("<3I", nonce)]
    s = init[:]
    for _ in range(10):
        for a, b, c, d in [(0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15),
                           (0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14)]:
            s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 16)
            s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 12)
            s[a] = (s[a] + s[b]) & 0xffffffff; s[d] = rotl(s[d] ^ s[a], 8)
            s[c] = (s[c] + s[d]) & 0xffffffff; s[b] = rotl(s[b] ^ s[c], 7)
    return struct.pack("<16I", *[(x + y) & 0xffffffff for x, y in zip(s, init)])
def chacha20(key, counter, nonce, data):
    stream = b"".join(chacha20_block(key, counter + i, nonce) for i in range(len(data) // 64 + 1))
    return bytes(a ^ b for a, b in zip(data, stream))
def poly1305(key, msg):
    r = int.from_bytes(key[:16], "little") & 0x0ffffffc0ffffffc0ffffffc0fffffff
    acc = 0
    for i in range(0, len(msg), 16):
        acc = (acc + int.from_bytes(msg[i:i + 16] + b"\x01", "little")) * r % (2**130 - 5)
    return ((acc + int.from_bytes(key[16:], "little")) % 2**128).to_bytes(16, "little")
def tag(key, nonce, ct):                                # no associated data in age
    return poly1305(chacha20_block(key, 0, nonce)[:32], ct + bytes(-len(ct) % 16) + struct.pack("<QQ", 0, len(ct)))
def seal(key, nonce, pt):
    ct = chacha20(key, 1, nonce, pt); return ct + tag(key, nonce, ct)
def unseal(key, nonce, data):
    ct = data[:-16]
    if not hmac.compare_digest(data[-16:], tag(key, nonce, ct)): raise ValueError("bad tag")
    return chacha20(key, 1, nonce, ct)

def hkdf(ikm, salt, info):                              # HKDF-SHA-256, 32 bytes
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    return hmac.new(prk, info + b"\x01", hashlib.sha256).digest()
b64 = lambda b: base64.b64encode(b).rstrip(b"=")
unb64 = lambda s: base64.b64decode(s + b"=" * (-len(s) % 4))
CHUNK = 64 * 1024

def encrypt(recipients, data, rnd):
    file_key, header = rnd(16), b"age-encryption.org/v1\n"
    for R in recipients:                                # one X25519 stanza per recipient
        e = rnd(32); E = x25519(e)
        wrap = hkdf(x25519(e, R), E + R, b"age-encryption.org/v1/X25519")
        header += b"-> X25519 " + b64(E) + b"\n" + b64(seal(wrap, bytes(12), file_key)) + b"\n"
    header += b"---"
    mac = hmac.new(hkdf(file_key, b"", b"header"), header, hashlib.sha256).digest()
    nonce = rnd(16); key = hkdf(file_key, nonce, b"payload")
    chunks = [data[i:i + CHUNK] for i in range(0, len(data), CHUNK)] or [b""]
    body = b"".join(seal(key, i.to_bytes(11, "big") + bytes([i == len(chunks) - 1]), c)
                    for i, c in enumerate(chunks))
    return header + b" " + b64(mac) + b"\n" + nonce + body

def decrypt(f, identity=None, passphrase=None):
    head, _, rest = f.partition(b"\n--- ")
    lines, file_key = head.split(b"\n")[1:], None
    for arg, body in zip(lines[0::2], lines[1::2]):     # try each stanza
        kind, *args = arg.split()[1:]
        if kind == b"X25519" and identity:
            E = unb64(args[0]); R = x25519(identity)
            wrap = hkdf(x25519(identity, E), E + R, b"age-encryption.org/v1/X25519")
        elif kind == b"scrypt" and passphrase:
            wrap = hashlib.scrypt(passphrase, salt=b"age-encryption.org/v1/scrypt" + unb64(args[0]),
                                  n=1 << int(args[1]), r=8, p=1, maxmem=1 << 30, dklen=32)
        else: continue
        try: file_key = unseal(wrap, bytes(12), unb64(body)); break
        except ValueError: pass
    if file_key is None: raise ValueError("no identity matched")
    mac, rest = unb64(rest[:43]), rest[44:]
    if not hmac.compare_digest(mac, hmac.new(hkdf(file_key, b"", b"header"), head + b"\n---",
                                             hashlib.sha256).digest()):
        raise ValueError("header MAC failed")
    key, rest, out, i = hkdf(file_key, rest[:16], b"payload"), rest[16:], b"", 0
    while True:
        last = len(rest) <= CHUNK + 16
        out += unseal(key, i.to_bytes(11, "big") + bytes([last]), rest[:CHUNK + 16])
        rest, i = rest[CHUNK + 16:], i + 1
        if last: return out

# 1. A real file from age 1.1.1 ("age -p -a"), with the passphrase age generated
real = base64.b64decode(
    "YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IHNjcnlwdCBPVXd0SHN1QUJrQWt6UWFUR0dORUZRIDE4CmF4RFVD"
    "RjZ6RitLcjVEVy9ocWFiUDg0VXp2MGZra0RPNFNFYXlZVG5nakUKLS0tIE92RVRQU3dkZ1lPYUk2d09QUFN1"
    "Uy9DTzd3M21xNVVEL0pkWm93RmdmZ2cKje/+t5X2ISS/66xJQSZAtHWkoYOJdZQKdl3RHC1hhYUnJs3lVgns"
    "tLy+mv8=")
print(real[:64].decode().replace("\n", " | "), "...")
print("decrypts to:", decrypt(real, passphrase=b"hedgehog-spy-eye-call-forum-maid-elite-impact-curious-urban"))

# 2. Our own file: 150,000 bytes of rover telemetry to two X25519 keys
rng = random.Random(2019)
rnd = lambda n: bytes(rng.getrandbits(8) for _ in range(n))
alice, bob = rnd(32), rnd(32)
data = bytes(range(256)) * 585 + b"END OF LOG"
f = encrypt([x25519(alice), x25519(bob)], data, rnd)
print("file:", len(f), "bytes;", f.count(b"-> X25519"), "stanzas; 3 chunks")
print("Bob reads it:", decrypt(f, identity=bob) == data)
try: decrypt(f[:-1000], identity=bob)
except ValueError as e: print("cut short:", e)
try: decrypt(f[:-(len(data) % CHUNK + 16)], identity=bob)
except ValueError as e: print("last chunk removed:", e)
swapped = f.replace(f.split(b"\n")[3], b"-> X25519 " + b64(x25519(rnd(32))), 1)
try: decrypt(swapped, identity=alice)
except ValueError as e: print("Bob's stanza altered, Alice decrypts:", e)
```

```text
age-encryption.org/v1 | -> scrypt OUwtHsuABkAkzQaTGGNEFQ 18 | axDUCF ...
decrypts to: b'Hello, age!\n'
file: 150100 bytes; 2 stanzas; 3 chunks
Bob reads it: True
cut short: bad tag
last chunk removed: bad tag
Bob's stanza altered, Alice decrypts: header MAC failed
```

The passphrase file takes about a second to open, by design: scrypt with
$N = 2^{18}$ and $r = 8$ uses 256 MiB of memory per guess. The last line is
the header MAC at work. Changing Bob's stanza does not stop Alice from
unwrapping the file key, but the header she then checks is not the one the
sender MAC'd.

### The post-quantum recipient (2025)

An X25519 stanza has a weakness that matters more for files than for
messages: **harvest now, decrypt later**. Shor's algorithm on a large
quantum computer would recover the file key from the stanza's ephemeral
key, and a backup may sit in storage for twenty years.

age v1.3.0, released on 27 December 2025, the sixth anniversary of the
first beta, added a native hybrid recipient (`age-keygen -pq`). The
identity is still 32 random bytes; the recipient is an ML-KEM-768
encapsulation key of 1,184 bytes plus a 32-byte X25519 key, so an
`age1pq1…` string is about 2,000 characters long. The stanza, shortened:

```text
-> mlkem768x25519 U7E10Aon27j1oDrH7fP3B++SPROSnDVvQpBemzOM+Zcs…   (1,120 bytes)
c/k+TjhBA6Je1DF8rxZhe2Jm8CN0zbkV9rre6nA8g98                       (sealed file key)
```

The wrapping is HPKE (RFC 9180) in base mode with the MLKEM768-X25519
hybrid KEM (also known as X-Wing), HKDF-SHA-256 and ChaCha20-Poly1305, info
string `age-encryption.org/mlkem768x25519`. The argument is the 1,120-byte
encapsulation (a 1,088-byte ML-KEM ciphertext and a 32-byte X25519 share);
the body is the sealed file key, and a reader must check that it is
exactly 32 bytes, against **partitioning oracle** attacks (Julia Len, Paul
Grubbs and Thomas Ristenpart, 2021), whose crafted multi-key ciphertexts
are long. The hybrid
holds while either half holds ([Post-quantum chapter
8](../post-quantum/08-ML-KEM.md) covers ML-KEM).

Nothing else changed: the version line, header MAC and payload are as
before, so moving an archive to post-quantum recipients means re-wrapping a
16-byte file key, not re-encrypting data. One rule is new: the age tool
will not mix post-quantum and classic recipients in one file, since a
quantum attacker would simply open the X25519 stanza, the same reasoning
that keeps an `scrypt` stanza alone. `age-plugin-pq` brings the type to
older versions, and the release also added P-256 "tagged" recipients for
hardware tokens. [Post-quantum chapter
18](../post-quantum/18-Hybrids-and-the-Migration.md) follows the same
migration across other protocols.

!!! note "Life story: age"
    **Born:** 2019, designed by Filippo Valsorda and Ben Cartwright-Cox;
    version 1.0.0 of the Go tool in 2021 · **Purpose:** simple, modern file
    encryption with small keys, explicitly without OpenPGP's options,
    keyrings, web of trust and signatures · **Grew by:** new stanza types
    only, never new algorithms for old ones: SSH keys, hardware-key plugins
    (YubiKey, Apple's Secure Enclave, TPM), and in December 2025 (v1.3.0) a
    native post-quantum recipient, HPKE with ML-KEM-768 plus X25519 ·
    **Status:** widely
    used for secrets in software deployments (SOPS, passage) and backups;
    the format has not changed in an incompatible way since 2019

## 18.3 What a file format without signatures means

*Level: intermediate.*

age deliberately does not sign. That has consequences worth stating
plainly.

- **Anyone can encrypt to you.** Your `age1…` key is public. A file that
  decrypts cleanly proves only that someone had your public key, not who.
- **Recipients can forge for each other.** A file encrypted to Alice and Bob
  gives both the same file key. Bob can write a new file under that key, or
  change the payload and recompute the header MAC, and Alice cannot tell.
  This is inherent to any multi-recipient format with a shared symmetric
  key, OpenPGP included, unless the sender signs.
- **A passphrase stanza is different.** age requires an `scrypt` stanza to be
  the only one, so that a successful decryption means whoever made the file
  knew the passphrase. That is a weak form of authentication, which mixing
  in public-key stanzas would destroy.

If you need to know who wrote a file, sign it separately (with minisign,
signify, SSH signatures or Sigstore), and sign the ciphertext or the
plaintext depending on what the verifier will see; Chapter 15's discussion
of sign-and-encrypt applies.

## 18.4 Why disks are different

*Level: intermediate.*

Suppose we encrypt each disk sector with AES in some mode. What can we use?

- **ECB** (each 16-byte block encrypted alone) leaks equal blocks everywhere,
  the famous penguin of book 1 Chapter 8.
- **CBC with the sector number as IV** hides equal blocks across sectors,
  but the IV is predictable. Markku-Juhani Saarinen showed in 2004 that an
  attacker who can get a chosen file written to an encrypted Linux disk can
  "watermark" it and later detect its presence. Linux's fix was ESSIV:
  encrypt the sector number under a hash of the key to get the IV. Still,
  CBC lets an attacker flip bits in one block at the cost of garbling the
  previous one, the malleability EFAIL exploited (Chapter 15).
- **Counter mode** is a disaster for a disk: rewriting a sector reuses the
  same keystream, and XOR of the two ciphertexts gives the XOR of the two
  plaintexts.

What we want is a **tweakable block cipher**, a notion introduced by Moses
Liskov, Ronald Rivest and David Wagner (CRYPTO 2002): a block cipher with an
extra public input, the **tweak**, such that each tweak gives what looks like
an independent permutation. Use the sector number and the block's position
in the sector as the tweak, and every 16-byte slot on the disk gets its own
permutation. Equal plaintexts in different places look unrelated.

Phillip Rogaway's **XEX** construction (ASIACRYPT 2004) builds one from AES
cheaply. **XTS** ("XEX-based tweaked codebook mode with ciphertext stealing")
is XEX with two keys, standardized as IEEE 1619 in 2007 and NIST SP 800-38E in
2010. For sector number $s$ and block $j$ of the sector:

$$
\begin{aligned}
T_j &= E_{K_2}(s) \cdot \alpha^j,\\
C_j &= E_{K_1}(P_j \oplus T_j) \oplus T_j,
\end{aligned}
$$

where $\alpha^j$ means multiplying $j$ times by $x$ in the field
$GF(2^{128})$ (book 1 Chapter 7's arithmetic, in a bigger field). One AES call
per sector makes the first tweak; each later tweak is a shift and a
conditional XOR. Ciphertext stealing handles a last block shorter than 16
bytes, which never happens with whole sectors.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="XTS: the sector number is encrypted under key 2 to make the first tweak; each block's tweak is the previous one multiplied by alpha; each plaintext block is XORed with its tweak, encrypted under key 1, and XORed with the tweak again" fill="currentColor" font-size="12.5">
<rect x="20" y="20" width="110" height="34" rx="5" class="soft" stroke="currentColor"/><text x="75" y="42" text-anchor="middle">sector s</text>
<line x1="75" y1="56" x2="75" y2="74" stroke="currentColor"/><polygon points="75,78 70,68 80,68"/>
<rect x="30" y="80" width="90" height="30" rx="5" stroke="currentColor" fill="none"/><text x="75" y="100" text-anchor="middle">AES K₂</text>
<line x1="122" y1="95" x2="160" y2="95" stroke="currentColor"/>
<text x="168" y="100" class="acc-fill">T₀</text>
<line x1="190" y1="95" x2="300" y2="95" stroke="currentColor" class="acc"/><text x="245" y="88" text-anchor="middle" font-size="11.5">· α</text>
<text x="308" y="100" class="acc-fill">T₁</text>
<line x1="330" y1="95" x2="440" y2="95" stroke="currentColor" class="acc"/><text x="385" y="88" text-anchor="middle" font-size="11.5">· α</text>
<text x="448" y="100" class="acc-fill">T₂ …</text>
<g>
<rect x="150" y="130" width="60" height="28" rx="4" class="soft" stroke="currentColor"/><text x="180" y="149" text-anchor="middle">P₀</text>
<circle cx="180" cy="176" r="9" fill="none" stroke="currentColor"/><text x="180" y="181" text-anchor="middle">+</text>
<rect x="140" y="194" width="80" height="26" rx="4" stroke="currentColor" fill="none"/><text x="180" y="212" text-anchor="middle" font-size="12">AES K₁</text>
<circle cx="180" cy="236" r="9" fill="none" stroke="currentColor"/><text x="180" y="241" text-anchor="middle">+</text>
<text x="180" y="264" text-anchor="middle">C₀</text>
<line x1="180" y1="158" x2="180" y2="167" stroke="currentColor"/><line x1="180" y1="185" x2="180" y2="194" stroke="currentColor"/><line x1="180" y1="220" x2="180" y2="227" stroke="currentColor"/>
<path d="M172 104 L172 120 L150 120 L150 176 L171 176" fill="none" stroke="currentColor" class="acc"/>
<path d="M150 176 L150 236 L171 236" fill="none" stroke="currentColor" class="acc"/>
</g>
<g>
<rect x="290" y="130" width="60" height="28" rx="4" class="soft" stroke="currentColor"/><text x="320" y="149" text-anchor="middle">P₁</text>
<circle cx="320" cy="176" r="9" fill="none" stroke="currentColor"/><text x="320" y="181" text-anchor="middle">+</text>
<rect x="280" y="194" width="80" height="26" rx="4" stroke="currentColor" fill="none"/><text x="320" y="212" text-anchor="middle" font-size="12">AES K₁</text>
<circle cx="320" cy="236" r="9" fill="none" stroke="currentColor"/><text x="320" y="241" text-anchor="middle">+</text>
<text x="320" y="264" text-anchor="middle">C₁</text>
<line x1="320" y1="158" x2="320" y2="167" stroke="currentColor"/><line x1="320" y1="185" x2="320" y2="194" stroke="currentColor"/><line x1="320" y1="220" x2="320" y2="227" stroke="currentColor"/>
<path d="M312 104 L312 120 L290 120 L290 176 L311 176" fill="none" stroke="currentColor" class="acc"/>
<path d="M290 176 L290 236 L311 236" fill="none" stroke="currentColor" class="acc"/>
</g>
<text x="440" y="150" font-size="12">tweak in, AES, tweak out</text>
<text x="440" y="170" font-size="12">for every 16-byte block;</text>
<text x="440" y="190" font-size="12">same size in and out,</text>
<text x="440" y="210" font-size="12">no IV stored, no tag</text>
</svg>
<figcaption>Figure 18.2. XTS. The tweak makes every 16-byte slot of the disk a different permutation; nothing else is added.</figcaption>
</figure>

### A worked example by hand: multiplying by α

The tweak is 16 bytes read as a little-endian number. Multiplying by $\alpha$
(by $x$) shifts it left one bit; if a bit falls off the top (bit 127, the high
bit of byte 15), the field's polynomial $x^{128} + x^7 + x^2 + x + 1$ brings
it back as 0x87 XORed into byte 0. So

```text
T   = 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 80
T·α = 02 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   shift: byte 0 doubles, byte 15's top bit falls off
    ^ 87                                                 and comes back as 0x87 in byte 0
    = 85 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

### Code it: XTS-AES

The program reuses compact AES from Chapter 15 (extended to 256-bit keys,
which §18.5 needs), writes XTS, and checks
IEEE 1619's test vector 2 (key 1 = 11…11, key 2 = 22…22, sector number
0x3333333333, plaintext 44…44). Then it plays attacker against an encrypted
habitat configuration file.

```python
# XTS-AES (IEEE 1619, NIST SP 800-38E), the mode under BitLocker, FileVault and
# LUKS: each 16-byte block is encrypted with a tweak made from the sector number.
# AES first, the compact textbook version of Chapter 15, here for 128- and 256-bit keys.
def xtime(a): return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1
SBOX, INV = [0] * 256, [0] * 256
p = q = 1
for _ in range(255):
    p = (p ^ (p << 1) ^ (0x1B if p & 0x80 else 0)) & 0xFF
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xFF
    if q & 0x80: q ^= 0x09
    SBOX[p] = q ^ ((q << 1 | q >> 7) & 0xFF) ^ ((q << 2 | q >> 6) & 0xFF) ^ ((q << 3 | q >> 5) & 0xFF) ^ ((q << 4 | q >> 4) & 0xFF) ^ 0x63
SBOX[0] = 0x63
for i, s in enumerate(SBOX): INV[s] = i

def expand(key):                                       # 11 round keys, or 15 for AES-256
    nk = len(key) // 4
    w, rcon = [list(key[i:i + 4]) for i in range(0, len(key), 4)], 1
    while len(w) < 4 * (nk + 7):
        t = w[-1][:]
        if len(w) % nk == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]; t[0] ^= rcon; rcon = xtime(rcon)
        elif nk == 8 and len(w) % nk == 4:
            t = [SBOX[b] for b in t]
        w.append([a ^ b for a, b in zip(w[-nk], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(nk + 7)]
def mix(c, inverse=False):
    if inverse:
        u, v = xtime(xtime(c[0] ^ c[2])), xtime(xtime(c[1] ^ c[3]))
        c = [c[0] ^ u, c[1] ^ v, c[2] ^ u, c[3] ^ v]
    t = c[0] ^ c[1] ^ c[2] ^ c[3]
    return [c[i] ^ t ^ xtime(c[i] ^ c[(i + 1) % 4]) for i in range(4)]
def aes(rk, block, decrypt=False):
    n = len(rk) - 1                                    # 10 rounds, or 14
    s = [a ^ b for a, b in zip(block, rk[n if decrypt else 0])]
    for r in (range(n - 1, -1, -1) if decrypt else range(1, n + 1)):
        if decrypt:
            s = [INV[s[(i + 12 * (i % 4)) % 16]] for i in range(16)]
            s = [a ^ b for a, b in zip(s, rk[r])]
            if r: s = sum((mix(s[c:c + 4], True) for c in range(0, 16, 4)), [])
        else:
            s = [SBOX[s[(i + 4 * (i % 4)) % 16]] for i in range(16)]
            if r < n: s = sum((mix(s[c:c + 4]) for c in range(0, 16, 4)), [])
            s = [a ^ b for a, b in zip(s, rk[r])]
    return bytes(s)
xor = lambda a, b: bytes(x ^ y for x, y in zip(a, b))

def times_alpha(t):                                    # multiply by x in GF(2^128), little-endian
    v = int.from_bytes(t, "little") << 1
    return ((v ^ 0x87) if v >> 128 else v).to_bytes(17, "little")[:16]
def xts(k1, k2, sector, data, decrypt=False):
    rk1, T = expand(k1), aes(expand(k2), sector.to_bytes(16, "little"))
    out = b""
    for i in range(0, len(data), 16):
        out += xor(aes(rk1, xor(data[i:i + 16], T), decrypt), T)
        T = times_alpha(T)
    return out

# IEEE 1619 test vector 2: Key1 = 11..11, Key2 = 22..22, sector 0x3333333333
c = xts(b"\x11" * 16, b"\x22" * 16, 0x3333333333, b"\x44" * 32)
print("IEEE 1619 vector 2:", c.hex() == "c454185e6a16936e39334038acef838bfb186fff7480adc4289382ecd6d394f0")

k1, k2 = bytes(range(16)), bytes(range(16, 32))
SECTOR = 512
config = b"airlock_B=OPEN  ".ljust(SECTOR, b" ")           # during maintenance
disk = {7: xts(k1, k2, 7, config), 8: xts(k1, k2, 8, config)}
print("same plaintext, sectors 7 and 8, same ciphertext?", disk[7] == disk[8])

old = disk[7]                                               # an attacker's earlier snapshot
config2 = b"airlock_B=LOCKED".ljust(SECTOR, b" ")
disk[7] = xts(k1, k2, 7, config2)
changed = [i // 16 for i in range(0, SECTOR, 16) if old[i:i + 16] != disk[7][i:i + 16]]
print("comparing two snapshots shows which 16-byte blocks changed:", changed)

# No integrity: the attacker writes the old block back, and it decrypts cleanly
disk[7] = old[:16] + disk[7][16:]
print("after a rollback of block 0, the habitat reads:", xts(k1, k2, 7, disk[7], True)[:16])
# A flipped bit garbles one 16-byte block and nothing else
flipped = bytes([disk[7][0] ^ 1]) + disk[7][1:]
p = xts(k1, k2, 7, flipped, True)
print("one bit flipped:", p[:16].hex(), "| rest intact:", p[16:] == config2[16:])
```

```text
IEEE 1619 vector 2: True
same plaintext, sectors 7 and 8, same ciphertext? False
comparing two snapshots shows which 16-byte blocks changed: [0]
after a rollback of block 0, the habitat reads: b'airlock_B=OPEN  '
one bit flipped: 9aabfad3f12603b2df057e4ea82d0b5f | rest intact: True
```

(IEEE 1619's vector 1 uses two all-zero keys; OpenSSL 3 refuses that, since
SP 800-38E requires the two halves of an XTS key to differ.)

## 18.5 Break it: what XTS does not protect

*Level: intermediate.*

The program's last three lines are the whole story of what a length-
preserving, unauthenticated mode allows.

**Snapshots leak.** XTS is deterministic per 16-byte slot. An attacker who
copies the disk twice, as a cloud provider, a backup service or a border
agent who images a laptop on two trips can, sees exactly which 16-byte blocks
changed between the copies. That reveals patterns of activity, which files
grew, and sometimes more.

**Rollback.** An old ciphertext block decrypts perfectly in its old place.
An attacker with write access can restore any block, sector or file to an
earlier version, and the system cannot notice. Our program reopened an
airlock that the configuration had locked.

**Malleability, in 16-byte units.** A flipped ciphertext bit turns its
16-byte plaintext block into random bytes and leaves everything else
untouched. Unlike CBC, the attacker cannot choose the result, but random
garbage in the right place can be enough. In January 2025 Microsoft fixed
**CrashXTS** (CVE-2025-21210), found by Maxim Suhanov: by randomizing chosen
blocks of a BitLocker-encrypted registry, an attacker could disable the
encryption of the crash-dump path, so that the next crash wrote memory, keys
included, to disk in plain text.

### Fix it

There are two directions, and both cost something.

- **Wide-block encryption.** If each sector is encrypted as one big block,
  any change anywhere in the sector randomizes the whole sector, so
  snapshots reveal only "this sector changed" and targeted garbling becomes
  impossible. Google's **Adiantum** (Paul Crowley and Eric Biggers, 2018)
  does this with XChaCha12, one AES call and a fast hash, and was built for
  cheap Android phones without AES instructions (it is coded below);
  **HCTR2** (2021) is the AES-based equivalent that Linux uses for
  encrypted file names.
- **Authenticated storage.** Store a nonce and a tag per block somewhere
  else. Linux's dm-integrity can sit under dm-crypt to give AEAD per sector,
  at a cost in space and speed; ZFS's native encryption stores each block's
  nonce and AES-GCM tag in the block pointer, and its Merkle tree of
  checksums detects rollback of individual blocks. File-level encryption on
  phones (Android's file-based encryption, Apple's Data Protection) encrypts
  each file with its own key and has room for metadata.

Rollback of the whole disk to an earlier image is beyond any of these: it
needs a monotonic counter in hardware the attacker cannot reset.

### Narrow blocks and wide blocks

XTS is a **narrow-block** mode: it scrambles 16 bytes at a time, while
the disk writes 4,096-byte sectors. A **wide-block** mode makes the sector
the block, so any input change changes every output bit with probability
one half. The trade:

- **Snapshots:** narrow shows which 16-byte blocks changed, wide only
  which sectors.
- **Aim:** narrow lets an attacker garble 16 chosen bytes and keep the
  rest, as CrashXTS did; wide garbles the whole sector. Neither *detects*
  the change.
- **Cost:** narrow is one pass, ideal for the AES engines in SSD
  controllers; wide needs two, since no output bit is known until every
  input bit is read.

XTS survives because the usual threat is a laptop stolen once, and
because AES-XTS is in silicon everywhere. Wide-block modes appear where
there is no AES hardware (Adiantum) or where data is short and patterned,
like file names: under Linux's default AES-CBC with ciphertext stealing,
two names in a directory that share 16 leading bytes share a ciphertext
block. **HCTR2** (Paul Crowley,
Nathan Huckleberry and Eric Biggers, 2021), built from AES in a counter
mode called XCTR and the POLYVAL hash of AES-GCM-SIV, fixes that; it is in
Linux 6.0 (2022), and Android 14 prefers it for file names where supported.

### Adiantum: hash, encrypt, hash

The problem Adiantum solved was a billion cheap phones. Android 6.0 (2015)
required new devices to encrypt their storage, except devices whose AES ran
slower than 50 MiB/s. Entry-level phones of the late 2010s, many running
Android Go on ARM Cortex-A7 cores without the ARMv8 Cryptography
Extensions, fell under that exemption and shipped unencrypted: the people
least able to replace a lost phone had the least protection. Paul
Crowley and Eric Biggers of Google designed **Adiantum** for them (paper
2018; announced February 2019; in Linux 5.0 and Android 9). On a Cortex-A7
it decrypts 4,096-byte sectors at 10.6 cycles per byte, more than five
times faster than AES-256-XTS. Since Android 10 every new device must
encrypt, and Adiantum is how the slow ones do it.

The construction is the **HBSH** pattern (hash, block cipher, stream cipher,
hash) of Figure 18.3. Split the sector into $P_L$, everything but the last
16 bytes, and $P_R$, the last 16 bytes. With $\boxplus$ and $\boxminus$
meaning addition and subtraction of 16-byte little-endian numbers modulo
$2^{128}$, and $T$ the 32-byte tweak:

$$
\begin{aligned}
P_M &= P_R \boxplus H(T, P_L)\\
C_M &= \mathrm{AES\text{-}256}_{K_E}(P_M)\\
C_L &= P_L \oplus \mathrm{XChaCha12}_{K_S}(\text{nonce } C_M \,\|\, 1)\\
C_R &= C_M \boxminus H(T, C_L)
\end{aligned}
$$

and the ciphertext is $C_L \,\|\, C_R$, as long as the input. The hash is
$H(T, L) = \mathrm{Poly1305}_{K_T}(|L| \,\|\, T) \boxplus
\mathrm{NHPoly1305}_{K_N}(L)$, "Poly1305" meaning only its polynomial
modulo $2^{130} - 5$, without the final mask. Decryption runs the picture
upward.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Adiantum's hash, block cipher, stream cipher, hash structure. The left part of the sector is hashed with the tweak and added to the right 16 bytes; the sum is encrypted with one AES-256 call; the result is the nonce of an XChaCha12 keystream that encrypts the left part; the hash of the encrypted left part is subtracted from the AES output to give the right 16 bytes of ciphertext." fill="currentColor" font-size="13">
<g stroke="currentColor">
<rect x="40" y="20" width="320" height="32" rx="5" fill-opacity=".12"/>
<rect x="460" y="20" width="120" height="32" rx="5" fill-opacity=".12"/>
<line x1="200" y1="52" x2="200" y2="205"/>
<line x1="520" y1="52" x2="520" y2="77"/>
<line x1="200" y1="88" x2="258" y2="88"/>
<rect x="260" y="72" width="150" height="32" rx="5" fill="none"/>
<line x1="410" y1="88" x2="506" y2="88"/>
<circle cx="520" cy="88" r="11" fill="none"/>
<line x1="520" y1="99" x2="520" y2="134"/>
<rect x="455" y="138" width="130" height="34" rx="5" fill-opacity=".25"/>
<line x1="520" y1="172" x2="520" y2="262"/>
<line x1="520" y1="220" x2="432" y2="220"/>
<rect x="250" y="204" width="178" height="32" rx="5" fill-opacity=".12"/>
<line x1="250" y1="220" x2="214" y2="220"/>
<circle cx="200" cy="220" r="11" fill="none"/>
<line x1="200" y1="231" x2="200" y2="330"/>
<line x1="200" y1="283" x2="258" y2="283"/>
<rect x="260" y="267" width="150" height="32" rx="5" fill="none"/>
<line x1="410" y1="283" x2="506" y2="283"/>
<circle cx="520" cy="283" r="11" fill="none"/>
<line x1="520" y1="294" x2="520" y2="330"/>
<rect x="40" y="332" width="320" height="32" rx="5" fill-opacity=".35"/>
<rect x="460" y="332" width="120" height="32" rx="5" fill-opacity=".35"/>
</g>
<polygon points="509,88 498,83 498,93"/>
<polygon points="520,137 515,126 525,126"/>
<polygon points="429,220 440,215 440,225"/>
<polygon points="211,220 222,215 222,225"/>
<polygon points="509,283 498,278 498,288"/>
<g text-anchor="middle">
<text x="200" y="41">P_L: all but the last 16 bytes</text>
<text x="520" y="41">P_R (16 bytes)</text>
<text x="335" y="93">H(T, P_L)</text>
<text x="520" y="93">+</text>
<text x="520" y="160">AES-256</text>
<text x="339" y="225">XChaCha12(C_M ‖ 1)</text>
<text x="200" y="225">⊕</text>
<text x="335" y="288">H(T, C_L)</text>
<text x="520" y="288">−</text>
<text x="200" y="353">C_L</text>
<text x="520" y="353">C_R</text>
</g>
<text x="545" y="93" font-size="11.5">mod 2¹²⁸</text>
<text x="530" y="122" font-size="12">P_M</text>
<text x="530" y="192" font-size="12">C_M</text>
</svg>
<figcaption>Figure 18.3. Adiantum's HBSH structure. One AES call on 16 bytes; the rest of the sector is a stream cipher whose nonce depends on every input bit, through the hash.</figcaption>
</figure>

Why is this wide-block? A flipped bit of $P_L$ changes $H(T, P_L)$, so
$P_M$, so AES gives an unrelated $C_M$, a new nonce, a new keystream and a
new $C_L$; $C_R$ depends on both. The proof needs the hash to be
**ε-almost-Δ-universal**: for two different inputs, the chance over the key
that their hashes differ by any given $\delta$ is a tiny $\epsilon$. Then
different sectors almost never give AES the same $P_M$, and the stream
cipher never reuses a nonce. Crowley and Biggers prove Adiantum a tweakable
strong pseudorandom permutation if XChaCha12 and AES-256 are secure, with a
birthday-style loss negligible at any number of sectors a phone will
write.

Speed comes from where the work goes. AES, slow in software, touches 16
bytes per sector. XChaCha12 (12 rounds instead of 20; the best published
attacks reach 7) does the bulk with additions, rotations and XORs. The
hash does the rest, and NH, from the UMAC message authentication code
(John Black, Shai Halevi, Hugo Krawczyk, Ted Krovetz and Phillip Rogaway,
CRYPTO 1999), costs half a 32-bit multiplication per byte. The 32-byte
tweak has room for a file's 16-byte nonce and an 8-byte block number, so
Linux's fscrypt can let all files under one master key share one Adiantum
key (`DIRECT_KEY`).

### A worked example by hand: one step of NH

NH reads 16 bytes of message as four 32-bit words $m_0, m_1, m_2, m_3$
and adds key words to them, modulo $2^{32}$, before multiplying:

$$
s \mathrel{+}= (m_0 + k_0)(m_2 + k_2) + (m_1 + k_1)(m_3 + k_3),
$$

with the products taken as full 64-bit numbers and the sum kept modulo
$2^{64}$. Take $m = (1, 2, 3, 4)$ and key words $k = (10, 20, 30, 40)$:

```text
(1 + 10) × (3 + 30)  =  11 × 33  =   363
(2 + 20) × (4 + 40)  =  22 × 44  =   968
                         sum     = 1,331
```

The additions wrap: if $m_0 = 2^{32} - 5$, then $m_0 + k_0 = 5$. For each
next 16 bytes the key slides along by four words. Adiantum runs four such
sums side by side, each with the key shifted by another four words, and
keeps the four 64-bit results: 32 bytes per 1,024-byte chunk. For one sum,
two different chunks collide for at most a $2^{-32}$ fraction of keys; the
four shifted sums bring that to about $2^{-128}$. Poly1305's polynomial
then combines the chunk outputs. Hence NH's 1,072 bytes of key: 1,024 for a
chunk, plus 48 for the three shifts.

### Code it: Adiantum

The program takes AES from the XTS listing, now with a 256-bit key, builds
XChaCha12, NH, Poly1305's polynomial and the HBSH structure, checks the
31-byte test vector from Google's reference code (lengths need not be
multiples of 16), and compares XTS and Adiantum on a 4,096-byte habitat
sector.

```python
# Uses expand(), aes(), xor() and xts() from the XTS listing above.
# Adiantum (Crowley and Biggers, 2018): XChaCha12, AES-256, NH and Poly1305.
import struct
M32, M128 = 2**32 - 1, 2**128

def chacha_rounds(s, n):
    def rotl(v, c): return ((v << c) & M32) | (v >> (32 - c))
    for _ in range(n // 2):
        for a, b, c, d in [(0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15),
                           (0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14)]:
            s[a] = (s[a] + s[b]) & M32; s[d] = rotl(s[d] ^ s[a], 16)
            s[c] = (s[c] + s[d]) & M32; s[b] = rotl(s[b] ^ s[c], 12)
            s[a] = (s[a] + s[b]) & M32; s[d] = rotl(s[d] ^ s[a], 8)
            s[c] = (s[c] + s[d]) & M32; s[b] = rotl(s[b] ^ s[c], 7)
    return s
SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]
def xchacha12(key, nonce, n):                      # 32-byte key, 24-byte nonce, n bytes
    s = SIGMA + list(struct.unpack("<8I", key) + struct.unpack("<4I", nonce[:16]))
    s = chacha_rounds(s, 12)
    sub, out = s[:4] + s[12:], b""                 # HChaCha12 makes a subkey
    for ctr in range((n + 63) // 64):
        init = SIGMA + sub + [ctr, 0] + list(struct.unpack("<2I", nonce[16:]))
        s = chacha_rounds(init[:], 12)
        out += struct.pack("<16I", *[(x + y) & M32 for x, y in zip(s, init)])
    return out[:n]

def poly(r, data):                                 # Poly1305's polynomial, no final "+ s"
    r, h = int.from_bytes(r, "little") & 0x0ffffffc0ffffffc0ffffffc0fffffff, 0
    for i in range(0, len(data), 16):
        h = (h + int.from_bytes(data[i:i + 16], "little") + M128) * r % (2**130 - 5)
    return h % M128
def nh(k, chunk):                                  # 4 passes, 16-byte units, 64-bit sums
    sums = [0, 0, 0, 0]
    for u in range(len(chunk) // 16):
        m = struct.unpack_from("<4I", chunk, 16 * u)
        for p in range(4):
            k0, k1, k2, k3 = k[4 * u + 4 * p: 4 * u + 4 * p + 4]
            sums[p] += ((m[0] + k0) & M32) * ((m[2] + k2) & M32)
            sums[p] += ((m[1] + k1) & M32) * ((m[3] + k3) & M32)
    return b"".join((x % 2**64).to_bytes(8, "little") for x in sums)
def hash_tl(keys, tweak, left):                    # H(T, L) = Poly1305(len, T) + NHPoly1305(L)
    _, kt, kp, kn = keys
    head = (8 * len(left)).to_bytes(16, "little") + tweak
    left += bytes(-len(left) % 16)
    nhs = b"".join(nh(kn, left[i:i + 1024]) for i in range(0, len(left), 1024))
    return (poly(kt, head) + poly(kp, nhs)) % M128

def subkeys(K):                                    # 1,136 bytes of XChaCha12 keystream
    d = xchacha12(K, b"\x01" + bytes(23), 1136)
    return expand(d[:32]), d[32:48], d[48:64], struct.unpack("<268I", d[64:])
def adiantum(K, tweak, x, decrypt=False):
    keys, L, R = subkeys(K), x[:-16], x[-16:]
    M = ((int.from_bytes(R, "little") + hash_tl(keys, tweak, L)) % M128).to_bytes(16, "little")
    C = aes(keys[0], M, True) if decrypt else aes(keys[0], M)    # the one AES call
    CM = M if decrypt else C                       # the stream's nonce is the ciphertext side
    L2 = xor(L, xchacha12(K, CM + b"\x01" + bytes(7), len(L)))
    return L2 + ((int.from_bytes(C, "little") - hash_tl(keys, tweak, L2)) % M128).to_bytes(16, "little")

K = bytes.fromhex("362b5797f85dcd995f1a5a441d920f27cc16d72b856399d3ba96a1dbd26068da")
T = bytes.fromhex("ef5869b12c5e9a4724c1b169e112938f433d6d00db5ed8d9129afed9ff2daac4")
P = bytes.fromhex("5ea8681985981223260accdb0a04b9df4db3487bb0e3c819435a4606942df2")
C = adiantum(K, T, P)
print("test vector, 31 bytes:", C.hex() == "c7c6f1738fc4ff4a39be78be8d28c8894663e70c7d87e84ec9187bbe186050",
      "| decrypts:", adiantum(K, T, C, True) == P)

# A 4,096-byte habitat sector, tweak = sector number 7
sector = b"airlock_B=LOCKED".ljust(4096, b" ")
flip = lambda b: bytes([b[0] ^ 1]) + b[1:]
blocks = lambda a, b: sum(a[i:i + 16] != b[i:i + 16] for i in range(0, len(a), 16))
tw = (7).to_bytes(32, "little")
k1, k2 = bytes(range(16)), bytes(range(16, 32))
print("one plaintext bit flipped, ciphertext blocks that change: XTS",
      blocks(xts(k1, k2, 7, sector), xts(k1, k2, 7, flip(sector))), "of 256, Adiantum",
      blocks(adiantum(K, tw, sector), adiantum(K, tw, flip(sector))), "of 256")
c = adiantum(K, tw, sector)
print("one ciphertext bit flipped, plaintext blocks garbled: Adiantum",
      blocks(adiantum(K, tw, flip(c), True), sector), "of 256")
```

It prints (after the XTS listing's lines):

```text
test vector, 31 bytes: True | decrypts: True
one plaintext bit flipped, ciphertext blocks that change: XTS 1 of 256, Adiantum 256 of 256
one ciphertext bit flipped, plaintext blocks garbled: Adiantum 256 of 256
```

The last line is the blunt edge of a wide-block mode: a flipped bit no
longer garbles one chosen field of the habitat's configuration while the
rest still parses; the whole sector turns to noise. That is still not
integrity, and Adiantum still allows rollback; those need the
authenticated storage of the list above.

## 18.6 One key, many locks

*Level: intermediate.*

A disk is encrypted under a random **volume key** (LUKS) or **full-volume
encryption key** (BitLocker), drawn once and normally never changed, since
changing it means re-encrypting the whole disk. Everything the user deals
with, passphrases, PINs, TPMs, recovery keys, only **unlocks** that key. Each
unlock method has its own encrypted copy of it.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="One volume key, many locks: a passphrase through Argon2id, a TPM that unseals a secret only if the measured boot is unchanged, and a recovery key, each unlock their own encrypted copy of the volume key, which encrypts every sector with AES-XTS" fill="currentColor" font-size="12.5">
<rect x="20" y="20" width="160" height="40" rx="6" class="soft" stroke="currentColor"/><text x="100" y="45" text-anchor="middle">passphrase</text>
<rect x="20" y="100" width="160" height="40" rx="6" class="soft" stroke="currentColor"/><text x="100" y="118" text-anchor="middle">TPM</text><text x="100" y="133" text-anchor="middle" font-size="11">if boot unchanged</text>
<rect x="20" y="180" width="160" height="40" rx="6" class="soft" stroke="currentColor"/><text x="100" y="198" text-anchor="middle">recovery key</text><text x="100" y="213" text-anchor="middle" font-size="11">128 bits, printed</text>
<line x1="182" y1="40" x2="226" y2="40" stroke="currentColor"/><polygon points="230,40 218,35 218,45"/>
<line x1="182" y1="120" x2="226" y2="120" stroke="currentColor"/><polygon points="230,120 218,115 218,125"/>
<line x1="182" y1="200" x2="226" y2="200" stroke="currentColor"/><polygon points="230,200 218,195 218,205"/>
<rect x="232" y="20" width="150" height="40" rx="6" stroke="currentColor" fill="none"/><text x="307" y="38" text-anchor="middle" font-size="12">keyslot 0</text><text x="307" y="53" text-anchor="middle" font-size="11">Argon2id → unwrap</text>
<rect x="232" y="100" width="150" height="40" rx="6" stroke="currentColor" fill="none"/><text x="307" y="118" text-anchor="middle" font-size="12">keyslot 1</text><text x="307" y="133" text-anchor="middle" font-size="11">sealed secret → unwrap</text>
<rect x="232" y="180" width="150" height="40" rx="6" stroke="currentColor" fill="none"/><text x="307" y="198" text-anchor="middle" font-size="12">keyslot 2</text><text x="307" y="213" text-anchor="middle" font-size="11">KDF → unwrap</text>
<line x1="384" y1="40" x2="430" y2="110" stroke="currentColor"/><line x1="384" y1="120" x2="428" y2="120" stroke="currentColor"/><line x1="384" y1="200" x2="430" y2="130" stroke="currentColor"/>
<rect x="432" y="96" width="188" height="48" rx="6" class="soft-acc" stroke="currentColor"/><text x="526" y="116" text-anchor="middle">volume key</text><text x="526" y="133" text-anchor="middle" font-size="11">random, never changes</text>
<line x1="526" y1="146" x2="526" y2="186" stroke="currentColor" stroke-width="1.5"/><polygon points="526,190 521,178 531,178"/>
<rect x="432" y="192" width="188" height="40" rx="6" class="acc-fill" fill-opacity="0.25" stroke="currentColor"/><text x="526" y="217" text-anchor="middle">every sector, AES-XTS</text>
<text x="320" y="264" text-anchor="middle" font-size="12">Changing a passphrase rewrites one keyslot; anyone who once held the volume key keeps access.</text>
</svg>
<figcaption>Figure 18.4. The key hierarchy of full-disk encryption. LUKS calls the copies keyslots, BitLocker key protectors.</figcaption>
</figure>

**LUKS** (Linux Unified Key Setup, Clemens Fruhwirth 2005; LUKS2 by Milan
Brož 2018) stores the header in the clear at the start of the partition:
cipher name, up to 32 keyslots, and a **digest** of the volume key so that a
correct key can be recognized. Each keyslot runs the passphrase through
Argon2id (the default since 2021; earlier PBKDF2) with a cost tuned to about
two seconds on the machine that created it, and uses the result to decrypt
the keyslot's area. What it decrypts is not the volume key itself but the
key passed through the **anti-forensic splitter**: 4,000 stripes, chained by
hashing, all needed to recover the key. The point is erasure. Flash and hard
drives remap worn sectors and keep old copies; a 64-byte key could survive
deletion in a remapped sector, but a 256,000-byte blob where every bit
matters will almost certainly lose some bits when overwritten.

**BitLocker** (Windows, since Vista, 2007) wraps its full-volume key under a
volume master key with AES-CCM, and the volume master key once per protector:
TPM, TPM+PIN, a startup key on USB, a password, and a **recovery password**
of 48 digits. **FileVault 2** (macOS, since 2011) wraps its volume key with
AES key wrap; on Macs with Apple silicon or the T2 chip, the Secure Enclave
holds the key hierarchy and the internal SSD is always encrypted, with
FileVault adding the user's password to the chain.

### Code it: the key check, the splitter and a recovery password

The program checks a volume key against the PBKDF2 digest of a real LUKS2
header made by cryptsetup 2.7.0, splits that key into 4,000 stripes and
merges it back, shows that one flipped bit destroys it, and builds a
BitLocker-style recovery password: eight groups of six digits, each eleven
times a 16-bit number, so the groups encode 128 bits and catch typing
mistakes.

```python
# How full-disk encryption stores its one key: LUKS's key digest and
# anti-forensic splitter, and the shape of a BitLocker recovery password.
import base64, hashlib, random

# 1. The key check: a real LUKS2 header (cryptsetup 2.7.0 defaults, a test volume)
salt = base64.b64decode("mzpv4vABctbMLBpoPxV4UHzLyXwlJVlsMKLSicKipww=")
stored = base64.b64decode("t2xTAwhBzQdNnMDSHiF0GmlM2xnwVzo7TEZ6suZTMRc=")
vk = bytes.fromhex("6932903efa0fadf02ac4423267568bd0e4265051f9f9d516efd1d2d9b66fe270"
                   "97134dfbfe5901071f13c76bd82050f00cbf91fae128bc8a4ca14dc1d9f3e30c")
print("volume key matches the header digest:",
      hashlib.pbkdf2_hmac("sha256", vk, salt, 231575, 32) == stored)

# 2. The anti-forensic splitter: the key spread over 4,000 stripes
def diffuse(d):                                  # LUKS spec: hash each 32-byte block with its index
    return b"".join(hashlib.sha256(i.to_bytes(4, "big") + d[j:j + 32]).digest()[:len(d[j:j + 32])]
                    for i, j in enumerate(range(0, len(d), 32)))
def xor(a, b): return bytes(x ^ y for x, y in zip(a, b))
def af_split(key, stripes, rnd):
    d, out = bytes(len(key)), []
    for _ in range(stripes - 1):
        s = rnd(len(key)); out.append(s); d = diffuse(xor(d, s))
    return b"".join(out) + xor(d, key)
def af_merge(material, n, stripes):
    d = bytes(n)
    for i in range(stripes - 1):
        d = diffuse(xor(d, material[i * n:(i + 1) * n]))
    return xor(d, material[(stripes - 1) * n:])

rng = random.Random(2005)
rnd = lambda n: bytes(rng.getrandbits(8) for _ in range(n))
material = af_split(vk, 4000, rnd)
print("split into", len(material), "bytes; merged back:", af_merge(material, 64, 4000) == vk)
damaged = material[:100000] + bytes([material[100000] ^ 1]) + material[100001:]
print("one bit of the 256,000 bytes flipped; key recovered:", af_merge(damaged, 64, 4000) == vk)

# 3. A BitLocker recovery password: 8 groups of 6 digits, each 11 x a 16-bit value
key128 = rnd(16)
groups = [11 * int.from_bytes(key128[i:i + 2], "little") for i in range(0, 16, 2)]
password = "-".join(f"{g:06}" for g in groups)
print("recovery password:", password)
def check(pw):
    gs = [int(g) for g in pw.split("-")]
    return len(gs) == 8 and all(g % 11 == 0 and g < 11 * 65536 for g in gs)
typo = password[:3] + str((int(password[3]) + 1) % 10) + password[4:]
print("valid:", check(password), "| one digit mistyped:", check(typo))
```

```text
volume key matches the header digest: True
split into 256000 bytes; merged back: True
one bit of the 256,000 bytes flipped; key recovered: False
recovery password: 645106-408452-197538-034617-715033-064977-623645-011935
valid: True | one digit mistyped: False
```

The digest check uses no passphrase at all: whoever has the volume key can
open the disk, for example with `cryptsetup open --volume-key-file`. That is
why changing a passphrase does not lock out someone who once saw the volume
key, and why after a suspected compromise the volume must be
**re-encrypted** (`cryptsetup reencrypt`), not just given a new passphrase.

## 18.7 Keys in hardware

*Level: intermediate.*

A passphrase at every boot is secure but unpopular. Most encrypted laptops
instead unlock automatically with a **Trusted Platform Module** (TPM), a
small security chip (or a firmware module inside the main processor).

**Measured boot.** As the machine starts, each stage hashes the next before
running it, and extends the hash into the TPM's **platform configuration
registers** (PCRs): $PCR \leftarrow H(PCR \,\|\, \text{measurement})$. The
firmware, the Secure Boot state, the boot loader and its configuration all
leave their mark. The disk key, or a secret that unlocks it, is **sealed**:
the TPM releases it only if the PCRs hold exactly the values they had when it
was sealed. A modified boot loader produces different PCRs and the TPM
refuses.

That protects against a thief who boots the stolen laptop from a USB stick,
but note what it does *not* require: anything from the user. A TPM-only
machine decrypts its disk for anyone who switches it on and lets Windows
boot to the login screen. Every attack in the next list works on that
window.

- **TPM bus sniffing.** A discrete TPM chip talks to the processor over a
  slow bus, and in TPM-only BitLocker the key crosses it in the clear. Denis
  Andzakovic showed in 2019 that a cheap FPGA on the bus reads it; in 2024 a
  demonstration did it with a Raspberry Pi Pico in under a minute. Firmware
  TPMs inside the processor, or TPM+PIN, defeat it. The Engineering book's
  [§11.9](../engineering/11-Hardware-for-Keys.md) tells both attacks in
  full, with TPM parameter encryption, the fix that came later.
- **Downgrade of the boot chain.** In "bitpixie" (CVE-2023-21563) an old,
  still-trusted Windows boot manager could be booted over the network and
  made to leave key material in memory after a soft reboot. The bug was
  fixed in 2023, but the old signed boot manager stayed bootable until
  Microsoft could revoke the certificate that signed it, a slow process
  because revocation also breaks old recovery media.
- **Self-encrypting drives.** Some SSDs encrypt internally and offered
  BitLocker a way to skip software encryption.

!!! note "Life story: self-encrypting drives and BitLocker"
    **Born:** the 2000s, the TCG Opal standard for drives that encrypt
    everything with an internal key, unlocked by the host at boot ·
    **Purpose:** full-disk encryption at no cost in speed or CPU ·
    **Broken:** in 2018 Carlo Meijer and Bernard van Gastel (Radboud
    University) reverse-engineered the firmware of drives from Crucial and
    Samsung and found that on several models the data could be read without
    the password: the password was checked but not used to derive the key,
    or a master password was blank ("Self-encrypting deception", IEEE S&P
    2019) · **Response:** Microsoft's advisory ADV180028 told users to force
    software encryption; Windows later stopped trusting drive encryption by
    default · **Status:** a reminder that a key check is not a key
    derivation, and that encryption you cannot inspect is a promise, not a
    mechanism

**Phones** went further. Apple's Secure Enclave and Android's hardware-backed
keystores (Titan M, StrongBox) combine the user's passcode with a key fused
into the chip, and limit guesses in hardware with growing delays. A six-digit
passcode is weak against a laptop's offline attack, but strong when every
guess must go through the chip and the chip enforces the delays.

### Apple: Data Protection and FileVault

Apple describes its design in the *Apple Platform Security* guide (here
the January 2026 edition, updated in March 2026). On an iPhone the
hierarchy has four levels, all managed by the Secure Enclave (Figure 18.5).

1. **The hardware UID**, a 256-bit AES key fused into each Secure Enclave,
   usable but unreadable; what it wraps opens only on that chip.
2. **The passcode key**, "tangled" with the UID by a derivation that uses
   the UID-keyed AES engine at every step, tuned to about 80 milliseconds,
   so guesses must run on the device, which adds growing delays.
3. **Class keys.** Each file has a **Data Protection class**. Class A,
   *Complete Protection*: the key is discarded about ten seconds after the
   device locks. Class B, *Protected Unless Open*: an asymmetric key
   agreement lets files be written while locked. Class C, *Protected Until
   First User Authentication*, the default: the key stays in memory from
   the first unlock until restart. Class D, *No Protection*: UID only.
4. **Per-file keys.** APFS gives each file (or extent) its own 256-bit key,
   wrapped with its class key by AES key wrap (RFC 3394) and kept in the
   file's metadata, which a file system key encrypts. The AES engine
   between flash and memory encrypts with AES-XTS; the application
   processor never holds the per-file key in the clear.

A Mac with Apple silicon uses a hybrid of this. The data volume has a
**volume key** wrapped by a **key encryption key** (KEK). With FileVault
off, the KEK is protected by the UID alone: the SSD is encrypted and useless
outside its Mac, but the Mac opens it for anyone. Turning FileVault on adds
the user's password to the KEK: one key re-wrapped, nothing re-encrypted.
Class C on the Mac uses that volume key rather than per-file keys,
"effectively re-creating the security model of FileVault for user data" in
Apple's words, and class D does not exist. Recovery is a 24-character key,
escrow to iCloud, or an institutional key: who holds it is §18.11's
question.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Apple's key hierarchies. On iPhone, the hardware UID and the passcode make a passcode key; it protects four class keys, A to D; each class key wraps per-file keys; the AES engine encrypts flash with AES-XTS. On a Mac with Apple silicon, the password and the hardware UID protect a key encryption key, which wraps the volume key that encrypts the whole data volume." fill="currentColor" font-size="12.5">
<g stroke="currentColor">
<rect x="20" y="30" width="135" height="40" rx="5" fill-opacity=".35"/>
<rect x="165" y="30" width="135" height="40" rx="5" fill-opacity=".12"/>
<line x1="87" y1="70" x2="150" y2="92"/>
<line x1="232" y1="70" x2="170" y2="92"/>
<rect x="60" y="94" width="200" height="38" rx="5" fill="none"/>
<line x1="160" y1="132" x2="160" y2="150"/>
<rect x="20" y="152" width="62" height="40" rx="4" fill-opacity=".25"/>
<rect x="89" y="152" width="62" height="40" rx="4" fill-opacity=".25"/>
<rect x="158" y="152" width="62" height="40" rx="4" fill-opacity=".25"/>
<rect x="227" y="152" width="62" height="40" rx="4" fill="none" stroke-dasharray="4 3"/>
<line x1="160" y1="214" x2="160" y2="230"/>
<rect x="40" y="236" width="240" height="36" rx="5" fill="none"/>
<line x1="160" y1="272" x2="160" y2="286"/>
<rect x="40" y="290" width="240" height="30" rx="5" fill-opacity=".12"/>
<line x1="330" y1="30" x2="330" y2="320" stroke-dasharray="2 4" stroke-opacity=".5"/>
<rect x="355" y="30" width="125" height="40" rx="5" fill-opacity=".12"/>
<rect x="495" y="30" width="125" height="40" rx="5" fill-opacity=".35"/>
<line x1="417" y1="70" x2="480" y2="98" stroke-dasharray="4 3"/>
<line x1="557" y1="70" x2="500" y2="98"/>
<rect x="400" y="100" width="180" height="38" rx="5" fill="none"/>
<line x1="490" y1="138" x2="490" y2="160"/>
<rect x="400" y="166" width="180" height="38" rx="5" fill-opacity=".25"/>
<line x1="490" y1="204" x2="490" y2="226"/>
<rect x="400" y="232" width="180" height="34" rx="5" fill-opacity=".12"/>
</g>
<polygon points="160,234 155,224 165,224"/>
<polygon points="160,290 155,280 165,280"/>
<polygon points="490,164 485,154 495,154"/>
<polygon points="490,230 485,220 495,220"/>
<g text-anchor="middle">
<text x="160" y="18" font-weight="bold">iPhone, iPad: Data Protection</text>
<text x="490" y="18" font-weight="bold">Mac with Apple silicon</text>
<text x="87" y="48">hardware UID</text>
<text x="87" y="63" font-size="11">fused, unreadable</text>
<text x="232" y="55">passcode</text>
<text x="160" y="111">passcode key</text>
<text x="160" y="126" font-size="11">tangled with UID, ~80 ms a guess</text>
<text x="51" y="177">A</text>
<text x="120" y="177">B</text>
<text x="189" y="177">C</text>
<text x="258" y="177">D</text>
<text x="160" y="210" font-size="11.5">class keys</text>
<text x="160" y="252">per-file keys, AES key wrap</text>
<text x="160" y="266" font-size="11">in metadata under the file system key</text>
<text x="160" y="310">AES engine: AES-XTS to flash</text>
<text x="417" y="48">user password</text>
<text x="417" y="63" font-size="11">if FileVault on</text>
<text x="557" y="48">hardware UID</text>
<text x="557" y="63" font-size="11">always</text>
<text x="490" y="117">key encryption key</text>
<text x="490" y="132" font-size="11">re-wrapped when FileVault changes</text>
<text x="490" y="183">volume key</text>
<text x="490" y="198" font-size="11">class C uses it for user data</text>
<text x="490" y="254">data volume, AES-XTS</text>
<text x="490" y="292" font-size="11.5">all in the Secure Enclave;</text>
<text x="490" y="308" font-size="11.5">the CPU never sees the keys</text>
</g>
</svg>
<figcaption>Figure 18.5. Apple's key hierarchies, after the Apple Platform Security guide (January 2026). Everything below the top row is a wrapped key; the UID never leaves the chip.</figcaption>
</figure>

### Android: file-based encryption

Android documents its design on source.android.com (as of November 2026)
and Linux documents fscrypt. Android 7.0 (2016) introduced
**file-based encryption** (FBE), devices launching with Android 10 must use
it, and Android 13 dropped full-disk encryption. The reason was an alarm
clock: a fully encrypted phone that rebooted overnight sat at a password
prompt with nothing running. FBE splits each user's storage in two:
**Device Encrypted (DE)** storage, available at boot ("Direct Boot") for the
alarm, accessibility and the like, and **Credential Encrypted (CE)**
storage, the default, available only after the first unlock.

Figure 18.6 draws the keys. The DE master key is wrapped by a key in
**KeyMint** (Keymaster before Android 12), the keystore in the trusted
execution environment, and released at boot without user input, like
Apple's class D. The CE master key is wrapped under a secret derived from
the user's **synthetic password**, a random value that never changes,
which is itself protected by the lock-screen credential through scrypt and
a hardware check that delays wrong guesses: **Weaver** on phones with a
secure element, such as Pixel's Titan chips, or Gatekeeper in the TEE.
Changing the PIN re-wraps the synthetic password; the CE key stays.

Below the master keys, fscrypt gives each file a random 16-byte nonce. With
the version 2 policies that are the default on devices launched with
Android 11 or later, the file's key is

```text
file key = HKDF-SHA512(ikm = master key, no salt,
                       info = "fscrypt\0" || 0x02 || nonce)
```

where 0x02 marks a per-file key. Contents use AES-256-XTS or Adiantum; names
AES-256-CBC with ciphertext stealing, or HCTR2. With **hardware-wrapped
keys** (Android 11), contents keys are usable only inside the storage
controller's inline encryption engine. And because file sizes, permissions,
directory layout and timestamps are not contents, **metadata encryption**,
required on devices launching with Android 11 or later, adds
`dm-default-key` underneath: every block FBE has not encrypted is encrypted
under a metadata key that KeyMint releases only to software that passes
Verified Boot.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Android's file-based encryption key hierarchy. The lock screen credential, through scrypt and Weaver or Gatekeeper, protects the synthetic password, which unwraps the Credential Encrypted master key. KeyMint in the TEE unwraps the Device Encrypted master key at boot and the metadata key bound to Verified Boot. Each master key derives per-file keys with HKDF-SHA512 from a file nonce; the metadata key encrypts all remaining blocks with dm-default-key." fill="currentColor" font-size="12.5">
<g stroke="currentColor">
<rect x="20" y="20" width="190" height="40" rx="5" fill-opacity=".12"/>
<line x1="115" y1="60" x2="115" y2="78"/>
<rect x="20" y="84" width="190" height="40" rx="5" fill="none"/>
<line x1="115" y1="124" x2="115" y2="142"/>
<rect x="20" y="148" width="190" height="36" rx="5" fill="none"/>
<rect x="250" y="20" width="370" height="40" rx="5" fill-opacity=".35"/>
<line x1="115" y1="184" x2="115" y2="206"/>
<line x1="330" y1="60" x2="330" y2="206"/>
<line x1="530" y1="60" x2="530" y2="206"/>
<rect x="30" y="212" width="170" height="38" rx="5" fill-opacity=".25"/>
<rect x="245" y="212" width="170" height="38" rx="5" fill-opacity=".25"/>
<rect x="445" y="212" width="175" height="38" rx="5" fill-opacity=".25"/>
<line x1="115" y1="250" x2="200" y2="270"/>
<line x1="330" y1="250" x2="250" y2="270"/>
<rect x="30" y="272" width="385" height="44" rx="5" fill="none"/>
<line x1="532" y1="250" x2="532" y2="270"/>
<rect x="445" y="276" width="175" height="40" rx="5" fill-opacity=".12"/>
</g>
<polygon points="115,82 110,72 120,72"/>
<polygon points="115,146 110,136 120,136"/>
<polygon points="115,210 110,200 120,200"/>
<polygon points="330,210 325,200 335,200"/>
<polygon points="530,210 525,200 535,200"/>
<polygon points="532,274 527,264 537,264"/>
<g text-anchor="middle">
<text x="115" y="38">lock screen credential</text>
<text x="115" y="53" font-size="11">PIN, pattern, password</text>
<text x="115" y="102">scrypt + Weaver</text>
<text x="115" y="117" font-size="11">or Gatekeeper: throttled</text>
<text x="115" y="171">synthetic password</text>
<text x="435" y="38">KeyMint in the TEE (or StrongBox)</text>
<text x="435" y="53" font-size="11">keys never leave; bound to Verified Boot</text>
<text x="115" y="229">CE master key</text>
<text x="115" y="244" font-size="11">after first unlock</text>
<text x="330" y="229">DE master key</text>
<text x="330" y="244" font-size="11">at boot (Direct Boot)</text>
<text x="532" y="229">metadata key</text>
<text x="532" y="244" font-size="11">at boot</text>
<text x="222" y="290">per-file key = HKDF-SHA512(master, "fscrypt\0" ‖ 2 ‖ nonce)</text>
<text x="222" y="307" font-size="11">contents AES-256-XTS or Adiantum; names CBC-CTS or HCTR2</text>
<text x="532" y="293">dm-default-key</text>
<text x="532" y="308" font-size="11">every other block</text>
</g>
</svg>
<figcaption>Figure 18.6. Android's file-based encryption, after the AOSP documentation and Linux's fscrypt (as of November 2026). The user's credential reaches only the CE key; the TEE releases the other two at boot.</figcaption>
</figure>

Both designs reach the same shape: per-file keys under class or storage
keys, under a hardware-throttled passcode, split by whether data is needed
before the first unlock. A phone unlocked once since boot holds the class
C or CE keys in memory, which is where commercial extraction tools work;
a freshly rebooted one holds almost nothing. So iOS 18.1
(October 2024) restarts an iPhone left locked for 72 hours, and a Google
Play services update brought a three-day restart to Android in April 2025:
a reboot is a key erasure.

## 18.8 Sealing the key to the boot, worked through

*Level: intermediate.*

The Engineering book's [chapter 11](../engineering/11-Hardware-for-Keys.md)
explains PCRs, event logs, quotes and sealing. This section follows one
disk key through them: which PCRs BitLocker uses, the exact bytes of the
policy, what everyday events break it, and how a signed policy lets a rover
on Mars take new firmware with no one on Earth in the loop.

### Which registers, and why those

With UEFI and Secure Boot, BitLocker seals to **PCR 7** and **PCR 11** by
default. PCR 7 records the Secure Boot policy: whether it is on, the PK,
KEK, db and dbx variables (platform key, key-exchange keys, allowed and
revoked signers), and which db certificate approved each boot component.
PCR 11 is Windows' "BitLocker access control" register. Without Secure
Boot, BitLocker uses PCRs 0, 2, 4 and 11: firmware code, option ROMs and
the boot manager themselves.

A firmware update changes PCR 0 but usually not PCR 7, since the same
keys still sign the same boot manager. PCR 7 means "unlock for anything
Secure Boot would run" and survives updates; PCR 0 means "only this exact
firmware" and locks the user out after every update.

### A worked example by hand: the policy digest

The program below uses short stand-in strings for the events (real
events are UEFI variables and certificates). PCR 7 starts at zero:

```text
digest = SHA-256("SecureBoot=1")             = f66490b9 a9b3119d ...
PCR 7  = SHA-256(00 x 32 || f66490b9 ...)     = 442b3af2 c83655d0 ...
digest = SHA-256("PK,KEK,db,dbx as shipped") = ca98c6e1 2e241ff8 ...
PCR 7  = SHA-256(442b3af2 ... || ca98c6e1 ...) = d6370e01 22841880 ...
```

and after the third event (the db entry that approved the boot manager),
PCR 7 is `41c53a35…`; PCR 11, after one event, is `964edef6…`. The policy
that guards the key is itself a hash chain, built one policy command at a
time from 32 zero bytes. `TPM2_PolicyPCR` contributes

```text
SHA-256( 00 x 32                          the policy so far
      || 00 00 01 7F                       TPM_CC_PolicyPCR
      || 00 00 00 01  00 0B  03  80 08 00  1 bank, SHA-256, bitmap: PCR 7, 11
      || SHA-256(PCR 7 || PCR 11) )        d52631b4 8b2ed9cc ...
  = dac175d1 3b19620e ...
```

In the bitmap, byte 0 bit 7 is PCR 7 and byte 1 bit 3 is PCR 11, hence
`80 08 00`. For TPM plus PIN, `TPM2_PolicyAuthValue` extends once more
with its own command code: SHA-256(`dac175d1…` ‖ `00 00 01 6B`) =
`636a54a6…`, the sealed object's **authPolicy**: not the rule "PCR 7
must equal 41c53a35…" but the hash of a computation only those values
reproduce.

At boot, the boot manager opens a policy session and sends the same
commands. `TPM2_PolicyPCR` reads the TPM's *own* PCRs; the caller names
registers, never values. `TPM2_PolicyAuthValue` requires the right
authorization on the unseal, checked under the TPM's dictionary-attack
lockout, and `TPM2_Unseal` releases the secret only if the session digest
equals the authPolicy. Linux's `systemd-cryptenroll --tpm2-with-pin`
builds this shape; a BitLocker TPM+PIN protector likewise makes the PIN
part of the authorization checked inside the TPM.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="From measurements to an unsealed key. PCR 7 starts at zero and is extended three times, by the Secure Boot state, the key databases and the db entry that approved the boot manager; PCR 11 is extended once. The digest of PCR 7 and PCR 11 goes into PolicyPCR, then PolicyAuthValue; the result is compared with the sealed object's authPolicy, and only on a match is the volume key released." fill="currentColor" font-size="12.5">
<g stroke="currentColor">
<rect x="75" y="32" width="90" height="28" rx="4" fill="none"/>
<rect x="215" y="32" width="90" height="28" rx="4" fill="none"/>
<rect x="355" y="32" width="90" height="28" rx="4" fill="none"/>
<rect x="495" y="32" width="90" height="28" rx="4" fill-opacity=".25"/>
<line x1="165" y1="46" x2="211" y2="46"/>
<line x1="305" y1="46" x2="351" y2="46"/>
<line x1="445" y1="46" x2="491" y2="46"/>
<rect x="75" y="97" width="90" height="28" rx="4" fill="none"/>
<rect x="495" y="97" width="90" height="28" rx="4" fill-opacity=".25"/>
<line x1="165" y1="111" x2="491" y2="111"/>
<line x1="585" y1="46" x2="610" y2="46"/>
<line x1="585" y1="111" x2="610" y2="111"/>
<line x1="610" y1="46" x2="610" y2="158"/>
<rect x="300" y="164" width="320" height="30" rx="5" fill="none"/>
<line x1="460" y1="194" x2="460" y2="208"/>
<rect x="190" y="214" width="430" height="30" rx="5" fill-opacity=".12"/>
<line x1="405" y1="244" x2="405" y2="258"/>
<rect x="190" y="264" width="430" height="30" rx="5" fill-opacity=".12"/>
<line x1="190" y1="279" x2="150" y2="279"/>
<rect x="20" y="214" width="130" height="80" rx="5" fill-opacity=".35"/>
<line x1="85" y1="294" x2="85" y2="306"/>
</g>
<polygon points="214,46 204,41 204,51"/>
<polygon points="354,46 344,41 344,51"/>
<polygon points="494,46 484,41 484,51"/>
<polygon points="494,111 484,106 484,116"/>
<polygon points="610,162 605,152 615,152"/>
<polygon points="460,212 455,202 465,202"/>
<polygon points="405,262 400,252 410,252"/>
<polygon points="85,310 80,300 90,300"/>
<g text-anchor="middle">
<text x="120" y="51" font-family="monospace" font-size="11.5">00…00</text>
<text x="260" y="51" font-family="monospace" font-size="11.5">442b3af2…</text>
<text x="400" y="51" font-family="monospace" font-size="11.5">d6370e01…</text>
<text x="540" y="51" font-family="monospace" font-size="11.5">41c53a35…</text>
<text x="190" y="24" font-size="11">SecureBoot=1</text>
<text x="330" y="24" font-size="11">PK, KEK, db, dbx</text>
<text x="470" y="24" font-size="11">db entry used</text>
<text x="120" y="116" font-family="monospace" font-size="11.5">00…00</text>
<text x="540" y="116" font-family="monospace" font-size="11.5">964edef6…</text>
<text x="330" y="104" font-size="11">boot manager (BitLocker access control)</text>
<text x="460" y="184">pcrDigest = SHA-256(PCR 7 ‖ PCR 11)</text>
<text x="405" y="234">PolicyPCR: SHA-256(0³² ‖ 0000017F ‖ selection ‖ pcrDigest)</text>
<text x="405" y="284">PolicyAuthValue: SHA-256(· ‖ 0000016B) = 636a54a6…</text>
<text x="85" y="238">equal to the</text>
<text x="85" y="254">sealed authPolicy?</text>
<text x="85" y="276" font-size="11.5">and PIN right?</text>
<text x="85" y="324">volume key</text>
</g>
<text x="20" y="49">PCR 7</text>
<text x="20" y="114">PCR 11</text>
</svg>
<figcaption>Figure 18.7. From measurements to a released key, with the program's numbers. The TPM computes every box itself from its own registers; the caller only names which PCRs to use.</figcaption>
</figure>

### Code it: seal, break, cap and sign

The program seals a key to PCRs 7 and 11 with a PIN, reproduces the
worked example, changes one thing at a time, then signs rover policies
with a toy RSA key built from two Mersenne primes (anyone could factor
it).

```python
# TPM 2.0 sealing: PCR extends, PolicyPCR + PolicyAuthValue (TPM plus PIN),
# capping PCR 11, and a signed policy (PolicyAuthorize) for firmware updates.
import hashlib, hmac, struct
H = lambda b: hashlib.sha256(b).digest()
CC_POLICY_PCR, CC_POLICY_AUTH_VALUE, CC_POLICY_AUTHORIZE = 0x17F, 0x16B, 0x16A

def boot(events):                                 # every PCR starts at 32 zero bytes
    pcr = {i: bytes(32) for i in range(24)}
    for i, data in events:
        pcr[i] = H(pcr[i] + H(data))              # extend: new = H(old || digest)
    return pcr
def selection(pcrs):                              # TPML_PCR_SELECTION, SHA-256 bank
    bitmap = bytearray(3)
    for i in pcrs: bitmap[i // 8] |= 1 << (i % 8)
    return struct.pack(">IHB", 1, 0x000B, 3) + bytes(bitmap)
def policy_pcr(digest, pcr, pcrs):
    values = H(b"".join(pcr[i] for i in sorted(pcrs)))
    return H(digest + struct.pack(">I", CC_POLICY_PCR) + selection(pcrs) + values)
def policy_auth_value(digest):
    return H(digest + struct.pack(">I", CC_POLICY_AUTH_VALUE))

PCRS = (7, 11)
GOOD = [(7, b"SecureBoot=1"), (7, b"PK,KEK,db,dbx as shipped"), (7, b"db entry: Windows PCA 2011"),
        (11, b"boot manager: BitLocker access control")]
pcr = boot(GOOD)
print("PCR 7 =", pcr[7].hex()[:16] + "...", "| PCR 11 =", pcr[11].hex()[:16] + "...")

sealed = {"policy": policy_auth_value(policy_pcr(bytes(32), pcr, PCRS)),
          "auth": H(b"482916"), "secret": b"volume master key"}   # auth: from the PIN
print("policy digest:", sealed["policy"].hex()[:16] + "...")

def unseal(pcr, pin):                             # a policy session replays the steps
    session = policy_auth_value(policy_pcr(bytes(32), pcr, PCRS))
    if not hmac.compare_digest(session, sealed["policy"]): return "TPM_RC_POLICY_FAIL"
    if not hmac.compare_digest(H(pin), sealed["auth"]): return "TPM_RC_AUTH_FAIL"
    return sealed["secret"]

print(f"{'good boot, right PIN:':36}", unseal(pcr, b"482916"))
print(f"{'good boot, wrong PIN:':36}", unseal(pcr, b"000000"))
for name, i, event in [("Secure Boot turned off:", 0, (7, b"SecureBoot=0")),
                       ("dbx revocation update:", 1, (7, b"PK,KEK,db,dbx + new revocations")),
                       ("boot manager signed by a 2023 CA:", 2, (7, b"db entry: Windows UEFI CA 2023"))]:
    events = GOOD[:]; events[i] = event
    print(f"{name:36}", unseal(boot(events), b"482916"))
capped = boot(GOOD + [(11, b"cap: unseal done")])
print(f"{'PCR 11 capped after unsealing:':36}", unseal(capped, b"482916"))

# Signed policy: any PCR policy the mission key signed; toy RSA, Mersenne primes
p, q, e = 2**521 - 1, 2**607 - 1, 65537
n, d = p * q, pow(e, -1, (p - 1) * (q - 1))
sign = lambda m: pow(int.from_bytes(H(m), "big"), d, n)
verify = lambda m, s: pow(s, e, n) == int.from_bytes(H(m), "big")
key_name = struct.pack(">H", 0x000B) + H(b"TPMT_PUBLIC of the mission key" + n.to_bytes(141, "big"))
ref = b"rover-7 disk"
rover = {"policy": H(H(bytes(32) + struct.pack(">I", CC_POLICY_AUTHORIZE) + key_name) + ref),
         "secret": b"rover volume key"}
def unseal_signed(pcr, approved, signature):
    session = policy_pcr(bytes(32), pcr, (0, 7))
    if session != approved or not verify(approved + ref, signature): return "TPM_RC_POLICY_FAIL"
    session = H(H(bytes(32) + struct.pack(">I", CC_POLICY_AUTHORIZE) + key_name) + ref)
    return rover["secret"] if session == rover["policy"] else "TPM_RC_POLICY_FAIL"

fw1 = boot([(0, b"rover firmware 4.1"), (7, b"SecureBoot=1")])
fw2 = boot([(0, b"rover firmware 4.2"), (7, b"SecureBoot=1")])
bad = boot([(0, b"rover firmware 4.2 + implant"), (7, b"SecureBoot=1")])
a1 = policy_pcr(bytes(32), fw1, (0, 7)); s1 = sign(a1 + ref)       # signed on Earth
a2 = policy_pcr(bytes(32), fw2, (0, 7)); s2 = sign(a2 + ref)       # uplinked with 4.2
print(f"{'firmware 4.1, its signed policy:':36}", unseal_signed(fw1, a1, s1))
print(f"{'firmware 4.2, new policy, no reseal:':36}", unseal_signed(fw2, a2, s2))
print(f"{'implanted firmware, 4.2 policy:':36}", unseal_signed(bad, a2, s2))
print(f"{'thief reflashes old 4.1:':36}", unseal_signed(fw1, a1, s1))
```

It prints:

```text
PCR 7 = 41c53a3536758833... | PCR 11 = 964edef69ac58ed5...
policy digest: 636a54a6fd25ef9c...
good boot, right PIN:                b'volume master key'
good boot, wrong PIN:                TPM_RC_AUTH_FAIL
Secure Boot turned off:              TPM_RC_POLICY_FAIL
dbx revocation update:               TPM_RC_POLICY_FAIL
boot manager signed by a 2023 CA:    TPM_RC_POLICY_FAIL
PCR 11 capped after unsealing:       TPM_RC_POLICY_FAIL
firmware 4.1, its signed policy:     b'rover volume key'
firmware 4.2, new policy, no reseal: b'rover volume key'
implanted firmware, 4.2 policy:      TPM_RC_POLICY_FAIL
thief reflashes old 4.1:             b'rover volume key'
```

### What breaks a seal

Each failure in the output happens to real machines.

- **Secure Boot turned off** changes PCR 7, and the user meets the 48-digit
  recovery prompt; an attacker who disables Secure Boot to boot a tool gets
  nothing.
- **A dbx update** changes PCR 7 too; Microsoft's revocations after the
  BlackLotus bootkit (CVE-2023-24932) came with warnings about BitLocker
  recovery. Windows tries to reseal around such changes (for a firmware
  update it suspends BitLocker for one restart, leaving the key readable on
  disk for that boot); where that fails, the recovery screen appears.
- **A boot manager approved by a different certificate** changes PCR 7.
  Microsoft's 2011 Secure Boot certificates expire between June and
  October 2026, and the move to the 2023 ones is such a change; Microsoft's
  transition guidance covers machines that ask for their recovery key.
- **Capping.** After unsealing, the boot manager extends PCR 11 so that
  nothing running later can unseal again. The bitpixie attack of §18.7 went
  around it, booting an old boot manager that unsealed legitimately and left
  the key in memory.

### Signed policies: firmware updates on a rover

Arcadia City's rovers keep survey data on a disk whose key is sealed in
the rover's TPM to PCR 0, the firmware itself, so that modified firmware
reads nothing. But firmware is signed on Earth and uplinked, and an exact
PCR 0 seal breaks at the first update. On Earth a technician would type
the recovery key; a rover on a traverse has none, and asking Earth costs a
round trip of 6 to 44 minutes, or weeks during solar conjunction.

`TPM2_PolicyAuthorize` turns the problem around. The key is sealed not to
PCR values but to a **signing key**: its authPolicy is

$$
\mathrm{SHA\text{-}256}\big(\mathrm{SHA\text{-}256}(0^{32} \,\|\, \texttt{0000016A} \,\|\, \text{keyName}) \,\|\, \text{policyRef}\big),
$$

where keyName is the hash of the mission's public key and policyRef a
label (`rover-7 disk`). At boot the rover runs `TPM2_PolicyPCR`, getting a
digest $D$ of its current PCRs, and presents the mission's signature over
$D$ and the label; the TPM checks both, then replaces the session digest
with the value above. Mission control signs the PCR policy of each
firmware release and uplinks it with the image, so the rover installs 4.2
and unseals with no reseal and no round trip, while implanted firmware has
no signed policy.

### Break it: every signed policy stays valid

The last line of the output is the flaw: a signature never expires, so every
policy ever signed still opens the disk. A thief who reflashes genuine
firmware 4.1, with a hole that 4.2 fixed, unseals with 4.1's signed policy.
The fix is a version that cannot roll back: add `TPM2_PolicyNV` to the
signed policies, comparing a monotonic counter in the TPM's nonvolatile
memory with a minimum that each security update raises, or change the
signing key when old releases must die. It is certificate revocation
([Chapter 2](02-Certificates-and-PKI.md)) again, in a chip, and on Mars the
counter needs no message from Earth.

## 18.9 Cold boot and evil maid

*Level: intermediate.*

Two attacks define what disk encryption cannot do.

**Cold boot.** The volume key must sit in RAM while the disk is in use.
DRAM does not lose its contents instantly when power is cut: the charge in
each cell fades over seconds, and over minutes if the chips are cold.

!!! note "Life story: the cold boot attack"
    **Born:** February 2008, "Lest We Remember: Cold Boot Attacks on
    Encryption Keys", J. Alex Halderman, Seth Schoen, Nadia Heninger,
    William Clarkson, William Paul, Joseph Calandrino, Ariel Feldman, Jacob
    Appelbaum and Edward Felten (USENIX Security 2008) · **What it did:**
    cut power to running laptops, rebooted into a tiny program or moved the
    chilled memory (sprayed with an inverted can of compressed air) to
    another machine, dumped it, and found the disk keys of BitLocker,
    FileVault, dm-crypt and TrueCrypt; an algorithm used the redundancy of
    the AES key schedule to repair bits that had decayed · **Revived:** in
    2018 F-Secure researchers showed that the memory-clearing defenses added
    since could be switched off on many laptops · **Status:** mitigated, not
    solved: memory encryption in recent processors, shutting down instead of
    sleeping, and pre-boot PINs (a TPM-only boot puts the key back in RAM
    without asking anyone)

**Evil maid.** Joanna Rutkowska named it in 2009 and demonstrated it against
TrueCrypt: the attacker gets the laptop for a few minutes while the owner is
away from the hotel room, modifies the unencrypted boot code to record the
passphrase, and returns. The owner boots, types the passphrase, and later the
attacker collects it. Measured boot and Secure Boot are the defense; an
attacker with more time can replace the whole laptop with an identical one
that phones home the passphrase, which no disk encryption stops.

The pattern: full-disk encryption protects a **powered-off** device against
a thief who takes it once. It does little against someone who gets the
machine while it runs or sleeps, or who can tamper with it and give it back.

## 18.10 Mars: data at rest in a cold, distant place

*Level: intermediate.*

Arcadia City's laptops, rover computers and habitat servers hold medical
records, mission data and private files. Three things differ from Earth.

**The cold helps the cold boot.** Halderman's team chilled memory to about
−50 °C to keep its contents for minutes. A Martian night outside the habitat
reaches −80 °C. A rover computer or a laptop left in an unheated airlock is a
pre-chilled target: a thief who cuts its power and removes the memory has
far longer than on Earth. Mars rules: shut down, never sleep, devices that
leave the habitat; memory encryption enabled where the processor has it;
TPM+PIN, not TPM alone.

**Radiation flips bits.** Outside Earth's magnetic field, energetic particles
flip bits in memory and storage far more often. XTS turns one flipped
ciphertext bit into 64 or so wrong bits across a 16-byte block (the
program's last line), so error-correcting codes must be applied **after**
encryption, on the ciphertext, which is what drive firmware does anyway, and
memory holding keys should be ECC memory. A flipped bit in a LUKS header's
keyslot area is worse: the anti-forensic splitter that makes erasure
reliable also makes one bad bit fatal. Keep header backups
(`cryptsetup luksHeaderBackup`) on separate media.

**Recovery without Earth.** On Earth, a forgotten BitLocker PIN is solved by
the recovery key stored in the user's Microsoft account. From Mars that
account is a light round trip away, and unreachable during conjunction.
Recovery keys must be held on Mars, and not by any one person: split each
with Shamir's secret sharing ([book 1 Chapter 23](../../book/23-Advanced-Protocols.md)) among three of five crew
officers, so that any three can recover a disk and no two can read one
alone.

Better still, routine events should never need a recovery key. Sealing
to policies signed by the mission key, with a counter against downgrades
(§18.8), lets an update signed on Earth take effect on Mars without a round
trip, and keeps the shares for real emergencies: a dead TPM, a corrupted
header, a forgotten PIN.

Long-lived archives on Mars face the post-quantum question differently than
messages do. The data path is symmetric: AES-256-XTS loses at most half its
key length to Grover's algorithm, which still leaves 128 bits. Only the
public-key parts matter, such as age recipients and escrow keys, and those
can move to ML-KEM hybrids (age's post-quantum stanza) without
re-encrypting any data, by re-wrapping the file key.

## 18.11 In the real world

*Level: intermediate.*

| | Data cipher | Unlocks | Passphrase KDF |
|---|---|---|---|
| LUKS2 (cryptsetup defaults) | AES-256-XTS, 4,096-byte sectors | passphrase, TPM2, FIDO2, PKCS#11 | Argon2id |
| BitLocker | XTS-AES-128 (default), XTS-AES-256 | TPM, TPM+PIN, USB key, password, 48-digit recovery | salted SHA-256, 2<sup>20</sup> rounds |
| FileVault (Apple silicon) | AES-XTS in the storage controller | user password with the Secure Enclave | in the Secure Enclave |
| Android (file-based) | AES-256-XTS, or Adiantum | lock screen credential with the keystore | in hardware |
| age (files) | ChaCha20-Poly1305 | X25519, ML-KEM-768 + X25519, SSH keys, scrypt | scrypt |

**Defaults that encrypt.** Windows 11 (24H2 and later) turns on device
encryption on most new installs once the user signs in with a Microsoft or
work account, TPM-only, and stores the recovery password in that account.
Phones have encrypted by default for years. That is a large gain for stolen
devices, and it moves the question to who else holds the recovery key: here,
the account provider.

**Encrypted backups.** A disk is only as private as its backups. Apple's
Advanced Data Protection (2022) end-to-end encrypts most iCloud data, keys
held only on the user's devices; in February 2025 Apple withdrew it for new
users in the United Kingdom after the government served it with a
technical capability notice. WhatsApp's encrypted backups (2021) use a
hardware security module to limit guesses at a short PIN.

**TrueCrypt.** The most popular open-source disk encryption of the 2000s
ended abruptly in May 2014 when its anonymous developers replaced the
website with a notice that it "is not secure" and told users to switch to
BitLocker. An independent audit (the Open Crypto Audit Project, 2014-2015)
found no back door; its fork VeraCrypt continues.

## 18.12 Going deeper

*Level: expert.*

**What is the best length-preserving encryption?** For a fixed-size block
with no nonce, the strongest achievable notion is a **tweakable strong
pseudorandom permutation** on the whole sector: any change to any bit of the
input gives an unrelated output. XTS is weaker: it is a tweakable
permutation on 16-byte pieces. Wide-block constructions (EME, CMC by Halevi
and Rogaway; HCTR2; Adiantum's hash-encrypt-hash with a stream cipher in the
middle) achieve the strong notion at roughly the cost of two passes. They
still leak equality of whole sectors at the same address, the unavoidable
minimum for deterministic encryption.

**Deniable encryption.** VeraCrypt's hidden volumes put a second encrypted
volume inside the free space of the first, so that a user forced to reveal a
passphrase can reveal the outer one. Snapshots of the disk over time defeat
it: writes to the hidden volume change "free space" that should not change,
exactly the XTS leak of §18.5.

**Erasure is hard.** Deleting a file on an SSD does not erase its blocks;
wear-leveling keeps old copies. **Crypto-erase**, destroying the key so that
all ciphertext becomes unreadable, is the reliable way to wipe a drive, and
the reason the anti-forensic splitter exists. Apple's Data Protection and
Android's file-based encryption give each file its own key so that deleting
the key deletes the file, even from flash.

**Key commitment for files.** A multi-recipient file encrypted with a
non-committing AEAD (GCM, ChaCha20-Poly1305) can in principle be built to
decrypt to different contents under different file keys. age's header MAC
commits the header to the file key, which closes this for the header; how
far that protects the payload is a question research on committing AEAD
continues to study.

## Check yourself

??? question "1. Why can disk encryption not simply use an AEAD mode like GCM?"
    A sector must encrypt to a sector of the same size, at the same address,
    so there is no room for a nonce or a tag; and reusing a GCM nonce for a
    rewritten sector would be catastrophic.

??? question "2. How does age's payload format catch a file cut short at a chunk boundary?"
    Each chunk nonce ends with a flag that is 1 only for the last chunk. A
    truncated file's new last chunk was encrypted with flag 0, so decrypting
    it with flag 1 fails.

??? question "3. Can a recipient of a two-recipient age file forge a file to the other recipient?"
    Yes. Both learn the file key, so either can write new content and a new
    header MAC. Only a signature can show who wrote a file.

??? question "4. What does comparing two snapshots of an XTS disk reveal, and what does a wide-block mode reveal instead?"
    Under XTS, which 16-byte blocks changed, since unchanged blocks at the
    same position encrypt identically. Under a wide-block mode such as
    Adiantum, only which sectors changed.

??? question "5. On an Android phone that has just rebooted and not yet been unlocked, which data can apps read, and why?"
    Only Device Encrypted (DE) storage, whose key KeyMint releases at boot.
    The Credential Encrypted (CE) key is wrapped under the synthetic
    password, which needs the user's credential.

??? question "6. Why does a new LUKS passphrase not lock out someone who once had the volume key?"
    The passphrase only wraps a copy of the volume key, which is unchanged.
    Only re-encrypting the volume with a new volume key does that.

??? question "7. Adiantum calls AES once per 4,096-byte sector. How does a single flipped plaintext bit still change every ciphertext byte?"
    The bit changes $P_M$ (through the hash, or directly), so the AES output
    $C_M$ changes; $C_M$ is the nonce of the keystream that encrypts the left
    part, and $C_R$ depends on $C_M$ and the new left part.

??? question "8. Why is TPM-only unlocking weaker than TPM+PIN?"
    The disk is decrypted without anything from the user, so the key is in
    RAM and on the TPM bus for anyone who powers the device on: cold boot,
    bus sniffing and boot-chain attacks all work.

??? question "9. A BitLocker key is sealed to PCRs 7 and 11. Why does turning off Secure Boot trigger recovery, and why can an attacker not just tell the TPM the old PCR values?"
    Secure Boot's state is measured into PCR 7, so the policy digest no
    longer matches. And `TPM2_PolicyPCR` reads the TPM's own registers,
    which can only be extended, never set; the caller names which PCRs, not
    their values.

??? question "10. A rover's disk key is sealed with TPM2_PolicyAuthorize to policies signed on Earth. What does that gain on Mars, and what must be added so a thief cannot boot old signed firmware?"
    Updates take effect without resealing, a recovery key or a 6- to
    44-minute round trip. But every signed policy stays valid, so old
    firmware still unseals; a monotonic TPM counter checked with
    `TPM2_PolicyNV` and raised by each security update stops that.

## What you learned

- Files can carry a nonce, tags and a header; disks need same-size,
  per-sector encryption with no room for either.
- age encrypts a random file key to each recipient (X25519 with HKDF and
  ChaCha20-Poly1305, or scrypt), MACs the header and encrypts the payload in
  STREAM chunks. You decrypted a real file and wrote your own.
- Without signatures, a file proves nothing about its author, and
  recipients can forge for each other.
- XTS is a tweakable mode: each 16-byte slot of the disk gets its own
  permutation. You matched IEEE 1619's vector and saw it leak changes, allow
  rollback and garble blocks without detection.
- Wide-block modes and authenticated storage address those limits at a cost.
  Adiantum makes a sector one block with one AES call; you matched its test
  vector and saw one flipped bit change all 256 blocks.
- age's post-quantum recipient (December 2025) wraps the same file key
  with HPKE, ML-KEM-768 and X25519.
- A random volume key never changes; passphrases, TPMs and recovery keys only
  unlock copies of it. You checked a LUKS digest, split a key into 4,000
  stripes and built a recovery password.
- Apple and Android give each file its own key under class or storage
  keys, under a hardware-throttled passcode.
- A TPM policy is a hash chain; you computed one byte by byte, broke it,
  and signed policies for a rover, which need a counter against
  downgrades.
- TPMs, self-encrypting drives, cold boot and evil maid show that the key's
  home decides the security. On Mars the cold, the radiation and the
  distance from Earth each change the rules.

## Further reading

- age specification, c2sp.org/age, and Filippo Valsorda's design notes.
- Viet Tung Hoang, Reza Reyhanitabar, Phillip Rogaway and Damian Vizár,
  "Online Authenticated-Encryption and its Nonce-Reuse
  Misuse-Resistance", CRYPTO 2015 (STREAM).
- IEEE 1619, *Standard for Cryptographic Protection of Data on Block-Oriented
  Storage Devices*; NIST SP 800-38E, 2010.
- Moses Liskov, Ronald Rivest and David Wagner, "Tweakable Block Ciphers",
  CRYPTO 2002; Phillip Rogaway, "Efficient Instantiations of Tweakable
  Blockciphers and Refinements to Modes OCB and PMAC", ASIACRYPT 2004.
- Paul Crowley and Eric Biggers, "Adiantum: length-preserving encryption for
  entry-level processors", IACR ToSC 2018.
- Clemens Fruhwirth, *LUKS On-Disk Format Specification*, and Milan Brož,
  *LUKS2 On-Disk Format Specification*.
- J. Alex Halderman et al., "Lest We Remember: Cold Boot Attacks on
  Encryption Keys", USENIX Security 2008.
- Carlo Meijer and Bernard van Gastel, "Self-encrypting deception: weaknesses
  in the encryption of solid state drives", IEEE S&P 2019.
- Apple, *Apple Platform Security*, January 2026 edition (updated March
  2026): Data Protection and FileVault.
- Android Open Source Project, "File-based encryption" and "Metadata
  encryption", source.android.com (as of November 2026); Linux kernel,
  *Filesystem-level encryption (fscrypt)*.
- age v1.3.0 release notes (27 December 2025) and the C2SP age
  specification (post-quantum and tagged recipients).
- Julia Len, Paul Grubbs and Thomas Ristenpart, "Partitioning Oracle
  Attacks", USENIX Security 2021.
- John Black, Shai Halevi, Hugo Krawczyk, Ted Krovetz and Phillip Rogaway,
  "UMAC: Fast and Secure Message Authentication", CRYPTO 1999 (NH).
- Paul Crowley, Nathan Huckleberry and Eric Biggers, "Length-preserving
  encryption with HCTR2", IACR ePrint 2021/1441.
- Adiantum test vectors: github.com/google/adiantum (also in Linux's
  crypto/testmgr.h).
- Trusted Computing Group, *TPM 2.0 Library*, Part 3: Commands;
  Microsoft's BitLocker documentation on PCR validation profiles.
- Microsoft, "When Secure Boot certificates expire on Windows devices"
  (KB5079373, 2026) and KB5025885 (BlackLotus, CVE-2023-24932).
