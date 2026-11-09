# 2. Bytes, Encodings and Text

*Every cryptographic function takes bytes and gives back bytes. Nothing else
in a program is bytes: numbers, names, passwords and lists of fields must be
turned into bytes before they are hashed, signed or encrypted, and the result
turned back into text to be carried. Each translation is a place where two
different things can become the same bytes, or one thing two different byte
strings. This chapter goes through them in order: integers and byte order;
hex, Base64, Base32, Base58Check and Bech32, built from scratch and checked
against the standard library and the official test vectors; Unicode, UTF-8,
normalization and PRECIS; and canonical encoding, where you will forge a
signed payment by moving three characters between fields, then make that
impossible with a length-prefixed encoder and with TupleHash.*

!!! abstract "In this chapter"
    **You will learn:**

    - byte order and fixed widths, and how a dropped leading zero became the
      Raccoon attack on TLS;
    - hex, Base64, base64url, Base32, percent-encoding and quoted-printable,
      and why decoders must be strict;
    - Base58Check and Bech32/Bech32m, and why a checksum is not authentication;
    - UTF-8, NFC and NFKC, PRECIS (RFC 8264, RFC 8265) for usernames and
      passwords, and lookalikes;
    - why signing a concatenation is a bug, and how length prefixes and
      TupleHash (SP 800-185) fix it.

    **You need:** [Chapter 1](01-What-Cryptographic-Engineering-Is.md) (the
    layers where cryptography fails), hash functions and MACs from book 1
    ([Chapter 9](../../book/09-Hash-Functions.md) and
    [Chapter 10](../../book/10-Message-Authentication.md)), and Python's `bytes`
    type.

    **Levels:** §2.1 to §2.4 are for beginners, §2.5 to §2.10 are intermediate,
    §2.11 is expert.

## 2.1 The problem

*Level: beginner.*

In October 2000 Microsoft published bulletin MS00-078 for its web server, IIS.
The server had a careful check against directory traversal: before it served a
file, it looked at the requested path and refused anything containing `../`,
the sequence that climbs out of the web folder and into the rest of the disk.
Attackers sent `..%c0%af..` instead. `%c0%af` is two bytes, `c0 af`, and an
over-generous UTF-8 decoder turned those two bytes into the character `/`.
The traversal check ran on the raw string and saw no slash; the file system
ran after the decoder and saw one. With a path like
`/scripts/..%c0%af../winnt/system32/cmd.exe` anyone could run commands on the
server. Eleven months later the Nimda worm used the same hole to spread.

Nothing cryptographic was broken there, but the shape of the bug is the one
this chapter is about. A check looked at one representation of a value, the
thing that acted on it looked at another, and the translation between them
was not one-to-one. Cryptographic code is full of such translations, because
the primitives see only bytes: an **integer** must become bytes in some order
and width; **bytes** must often become **text** to travel through email, JSON, a URL or a QR code; **text**
must become bytes, though one visible word can be written with different
characters; and a **structure** must become one byte string before it is
signed.

A signature or a MAC is a promise about bytes. If two different meanings can
produce the same bytes, the promise covers both, and an attacker gets to pick.
If one meaning can produce two different byte strings, comparisons fail,
blocklists miss, and two accounts can share a name. Figure 2.1 shows the
chain from what you mean to what the primitive sees.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="From meaning to bytes: a payment becomes fields, then text, then bytes, then goes into a MAC; each step can lose information or add ambiguity" fill="currentColor" font-size="14">
<rect x="20" y="16" width="250" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="35" text-anchor="middle" font-weight="bold">What you mean</text>
<text x="145" y="52" text-anchor="middle" font-size="12">pay 5 to account 77</text>
<rect x="20" y="86" width="250" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="105" text-anchor="middle" font-weight="bold">Structure</text>
<text x="145" y="122" text-anchor="middle" font-size="12">fields: to, amount, memo</text>
<rect x="20" y="156" width="250" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="175" text-anchor="middle" font-weight="bold">Text and numbers</text>
<text x="145" y="192" text-anchor="middle" font-size="12">Unicode strings, integers</text>
<rect x="20" y="226" width="250" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="245" text-anchor="middle" font-weight="bold">Bytes</text>
<text x="145" y="262" text-anchor="middle" font-size="12">UTF-8, fixed-width integers</text>
<rect x="20" y="290" width="250" height="40" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="20" y="290" width="250" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="315" text-anchor="middle" font-weight="bold">HMAC, signature, cipher</text>
<line x1="145" y1="60" x2="145" y2="80" stroke="currentColor" stroke-width="1.4"/>
<polygon points="145,86 141,78 149,78" fill="currentColor"/>
<line x1="145" y1="130" x2="145" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="145,156 141,148 149,148" fill="currentColor"/>
<line x1="145" y1="200" x2="145" y2="220" stroke="currentColor" stroke-width="1.4"/>
<polygon points="145,226 141,218 149,218" fill="currentColor"/>
<line x1="145" y1="270" x2="145" y2="284" stroke="currentColor" stroke-width="1.4"/>
<polygon points="145,290 141,282 149,282" fill="currentColor"/>
<line x1="160" y1="73" x2="300" y2="73" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="310" y="70" font-size="13">Which fields does the tag cover?</text>
<text x="310" y="86" font-size="12" opacity="0.8">sign what you mean (§2.9)</text>
<line x1="160" y1="143" x2="300" y2="143" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="310" y="140" font-size="13">Where does one field end?</text>
<text x="310" y="156" font-size="12" opacity="0.8">lengths, not concatenation (§2.9, §2.10)</text>
<line x1="160" y1="213" x2="300" y2="213" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="310" y="210" font-size="13">Which bytes for this text or number?</text>
<text x="310" y="226" font-size="12" opacity="0.8">byte order, UTF-8, normalization (§2.2, §2.7, §2.8)</text>
<line x1="160" y1="280" x2="300" y2="280" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="310" y="277" font-size="13">The primitive sees only these bytes</text>
<text x="310" y="293" font-size="12" opacity="0.8">then out as hex, Base64, Bech32 (§2.3 to §2.6)</text>
</svg>
<figcaption>Figure 2.1. From meaning to bytes. Each arrow is a translation that must be exact and one-to-one; a MAC or a signature only vouches for the bytes at the bottom.</figcaption>
</figure>

### Encoding is not encryption

The first translation people meet is the one from bytes to text, and it is
also the most misunderstood. **Encoding** writes the same bytes in another
alphabet so that they survive a channel that only carries text. Anyone can
decode it, and no key is involved. **Encryption** needs a key to undo.
**Hashing** cannot be undone at all; it can only be recomputed and compared.
The three are often used together (a ciphertext or a digest is binary, so it
is written in hex or Base64 to be printed, stored in JSON or put in a URL), and
the security always comes from the encryption or the hash, never from the
encoding.

| | Encoding | Encryption | Hashing |
|---|---|---|---|
| Purpose | carry bytes through a text-only channel | keep the content secret | a short fingerprint of the content |
| Needs a key? | no | yes | no (a MAC adds one) |
| Can it be undone? | yes, by anyone | only with the key | no, only recomputed and compared |
| Size | grows: hex $\times 2$, Base64 $\times 4/3$ | about the same, plus a nonce and a tag | fixed, such as 32 bytes for SHA-256 |
| Example | `Qnl0ZXM=` | AES-GCM output | a SHA-256 digest |

Base64 is a costume, not a lock, and it gets mistaken for one all the time.
HTTP Basic authentication (RFC 7617) sends `user:password` in Base64 on every
request: inside TLS that is fine, in a log file it is the password.
Kubernetes stores its Secret objects as Base64, and its documentation warns
that by default they sit unencrypted in etcd. A signed JSON Web Token's
payload is readable by anyone who holds it.

### Code it

```python
import base64, hashlib

header = "Authorization: Basic amltOnNlY3JldA=="     # seen in a proxy log
creds = base64.b64decode(header.split()[-1])
print(creds)                                          # no key needed

token = b"jim:secret"
print(hashlib.sha256(token).hexdigest()[:32])         # hashing: a fingerprint, cannot be undone
print(base64.b64encode(hashlib.sha256(token).digest()).decode())   # the same digest, Base64
```

```
b'jim:secret'
c05f8593ce3afe7b15faed8f3b08de85
wF+Fk846/nsV+u2POwjehQfNtk56ObgC+6igK+QTmPY=
```

The last two lines are the same 32-byte digest written two ways. Writing it in
Base64 instead of hex makes it shorter, not stronger.

!!! note "Life story: the IIS Unicode traversal"
    **Born:** found in 2000 in Microsoft IIS 4.0 and 5.0; bulletin MS00-078,
    17 October 2000 · **Purpose:** none intended: a path check ran before the
    UTF-8 decoder, so the overlong form `%c0%af` of `/` slipped past it ·
    **Helped:** attackers run commands on unpatched servers; the Nimda worm
    (September 2001) used it, with the double-decoding bug MS01-026, to spread
    · **Status:** fixed; the lesson, decode and normalize first and check
    last, is in every secure-coding guide

**What to do:**

- Treat every encoding as public. If a value must be secret, encrypt it; if it
  must be unforgeable, MAC or sign it; then encode the result.
- Write down, for each value you hash, sign or encrypt, the exact bytes it
  becomes: byte order, width, character encoding and normalization.
- Check a value in the same form that the code acting on it will use: decode
  and normalize first, validate after.

## 2.2 Integers and byte order

*Level: beginner.*

A computer stores a 32-bit integer in four bytes, and there are two common
orders for them. **Big-endian** puts the most significant byte first, the way
we write numbers: `0x0A0B0C0D` is stored as `0a 0b 0c 0d`. **Little-endian**
puts the least significant byte first: `0d 0c 0b 0a`. Internet protocols use
big-endian, so it is also called **network byte order**; x86 and almost all
Arm processors run little-endian. Danny Cohen borrowed the names from
*Gulliver's Travels* in a 1980 note, "On Holy Wars and a Plea for Peace",
about the Lilliputians who went to war over which end of an egg to break.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The integer 0x0A0B0C0D stored big-endian as 0a 0b 0c 0d and little-endian as 0d 0c 0b 0a" fill="currentColor" font-size="14">
<text x="20" y="30" font-weight="bold">The number 0x0A0B0C0D</text>
<text x="20" y="72">big-endian</text>
<text x="20" y="90" font-size="12" opacity="0.8">network order</text>
<rect x="150" y="52" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="220" y="52" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="290" y="52" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="360" y="52" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="150" y="52" width="70" height="40" fill="currentColor" opacity="0.15"/>
<text x="185" y="77" text-anchor="middle" font-family="monospace">0a</text>
<text x="255" y="77" text-anchor="middle" font-family="monospace">0b</text>
<text x="325" y="77" text-anchor="middle" font-family="monospace">0c</text>
<text x="395" y="77" text-anchor="middle" font-family="monospace">0d</text>
<text x="20" y="142">little-endian</text>
<text x="20" y="160" font-size="12" opacity="0.8">x86, Arm</text>
<rect x="150" y="122" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="220" y="122" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="290" y="122" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="360" y="122" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="360" y="122" width="70" height="40" fill="currentColor" opacity="0.15"/>
<text x="185" y="147" text-anchor="middle" font-family="monospace">0d</text>
<text x="255" y="147" text-anchor="middle" font-family="monospace">0c</text>
<text x="325" y="147" text-anchor="middle" font-family="monospace">0b</text>
<text x="395" y="147" text-anchor="middle" font-family="monospace">0a</text>
<text x="185" y="186" text-anchor="middle" font-size="12">address 0</text>
<text x="395" y="186" text-anchor="middle" font-size="12">address 3</text>
<line x1="230" y1="182" x2="350" y2="182" stroke="currentColor" stroke-width="1"/>
<polygon points="358,182 350,178 350,186" fill="currentColor"/>
<text x="450" y="77" font-size="13">most significant byte first</text>
<text x="450" y="147" font-size="13">least significant byte first</text>
</svg>
<figcaption>Figure 2.2. Byte order. The shaded box holds the most significant byte, 0a. The same four bytes read in the other order give 0x0D0C0B0A, a different number.</figcaption>
</figure>

Cryptographic standards pick one order, and you must follow it exactly.
SHA-256 reads big-endian 32-bit words; ChaCha20, Poly1305, BLAKE2 and SHA-3 are
little-endian inside. X25519 (RFC 7748) writes public keys as 32 little-endian
bytes, while SEC 1 points in X.509 and TLS are big-endian. RSA's PKCS #1
converts with I2OSP and OS2IP, big-endian and with a fixed output length.

### Code it

Python's `int.to_bytes`, `int.from_bytes` and the `struct` module do the
conversions. In `struct` format strings, `>` means big-endian, `<` little-endian,
`I` a 4-byte unsigned integer and `i` a signed one.

```python
import struct

n = 0x0A0B0C0D
print(n.to_bytes(4, "big").hex(" "))       # network order: most significant byte first
print(n.to_bytes(4, "little").hex(" "))    # x86 and Arm order: least significant first
print(struct.pack(">I", n) == n.to_bytes(4, "big"))
print(struct.unpack("<I", bytes.fromhex("0d0c0b0a"))[0] == n)

# The same four bytes read the wrong way give a different number entirely.
wrong = int.from_bytes(n.to_bytes(4, "big"), "little")
print(hex(wrong))

# Signed and unsigned are a second choice: 0xFFFFFFFF is 4294967295 or -1.
b = b"\xff\xff\xff\xff"
print(struct.unpack(">I", b)[0], struct.unpack(">i", b)[0])
```

```
0a 0b 0c 0d
0d 0c 0b 0a
True
True
0xd0c0b0a
4294967295 -1
```

Bitcoin gives a famous real case. Its block headers store every integer
little-endian, and the block's identifier is the double SHA-256 of the
80-byte header. But block explorers and Bitcoin's own interfaces show hashes
with the bytes reversed, as if the 32-byte digest were a little-endian number.
That is why block hashes are shown with leading zeros (the proof of work makes
the *last* bytes of the digest zero) and why code that copies a hash from a
web page into a raw structure must reverse it first. The first block's header
is public, so you can check this yourself:

```python
import hashlib, struct

# Bitcoin's first block header, 80 bytes, every integer little-endian.
merkle_shown = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
header = (struct.pack("<I", 1)                      # version
          + bytes(32)                               # previous block: none
          + bytes.fromhex(merkle_shown)[::-1]       # stored reversed from how it is shown
          + struct.pack("<III", 1231006505, 0x1d00ffff, 2083236893))  # time, target, nonce
h = hashlib.sha256(hashlib.sha256(header).digest()).digest()
print(len(header))
print(h.hex())          # the bytes as SHA-256 produced them
print(h[::-1].hex())    # the same 32 bytes as explorers show them
```

```
80
6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000
000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f
```

The second line of output, read backwards, is the famous genesis block hash
`000000000019d6...`. The time field, 1231006505, is 3 January 2009 at 18:15:05
UTC.

### Break it: the leading zero that goes missing

Byte order is the first choice; width is the second, and it causes more harm.
A number has one value but many byte strings: 5 is `05`, `00 05`, `00 00 00 05`.
A 256-bit secret that happens to start with a zero byte (one time in 256) has
a *minimal* encoding of 31 bytes. Code that serializes it with "as many bytes
as the number needs", or with `hex(n)`, which also drops leading zeros, then
feeds a different byte string to the next step than the code on the other
side, and the two sides disagree once in 256 runs. That is a bug that survives
testing.

```python
import hashlib

def minimal(n):                     # the bug: as few bytes as the number needs
    return n.to_bytes((n.bit_length() + 7) // 8, "big")

def fixed(n, size=32):              # the fix: always the field's full width
    return n.to_bytes(size, "big")

secret = bytes.fromhex("00" + "11" * 31)   # a 32-byte secret that starts with a zero byte
n = int.from_bytes(secret, "big")
print(len(minimal(n)), len(fixed(n)))
print(len(hex(n)) - 2)                     # hex() drops leading zeros too: 62 digits, not 64
print(hashlib.sha256(minimal(n)).digest() == hashlib.sha256(secret).digest())
print(hashlib.sha256(fixed(n)).digest() == hashlib.sha256(secret).digest())

# How often does it bite? Count over 100,000 pseudorandom 32-byte values.
short = sum(hashlib.sha256(str(i).encode()).digest()[0] == 0 for i in range(100000))
print(short, "of 100000 lose at least one byte")
```

```
31 32
62
False
True
377 of 100000 lose at least one byte
```

The expected count is $100000/256 \approx 391$; 377 is that, give or take
chance.

The worse case is when the protocol *requires* the minimal form. TLS 1.2 and
earlier, for finite-field Diffie-Hellman, say that the shared secret has its
leading zero bytes stripped before it is fed to the key derivation (RFC 5246
§8.1.2). The secret is then used as an HMAC key, and HMAC first hashes any key
longer than the hash's block; for some group sizes one byte less means one
compression-function call less, so the derivation runs measurably faster when
the secret starts with a zero byte. In September 2020 Robert Merget and colleagues published
the **Raccoon** attack, which uses that timing difference, over many
connections with the same server key, to learn whether the top byte of each
secret is zero and then solve for the whole secret as a lattice problem
(USENIX Security 2021). It needs a server that reuses its Diffie-Hellman key
and is hard to run, but it is a pure encoding bug: the leak is the length of a
byte string. TLS 1.3 pads the secret to the
full width of the group (RFC 8446 §7.4.1). The timing side of this story
belongs to [Chapter 5](05-Constant-Time-Programming.md).

!!! note "Life story: the Raccoon attack"
    **Born:** September 2020, Robert Merget, Marcus Brinkmann, Nimrod Aviram,
    Juraj Somorovsky, Johannes Mittmann and Jörg Schwenk; paper at USENIX
    Security 2021 · **Purpose:** to show that stripping leading zeros from the
    TLS 1.2 Diffie-Hellman secret leaks timing that, over many handshakes,
    reveals the secret · **Helped:** OpenSSL (CVE-2020-1968), F5 and Microsoft
    shipped fixes; one more reason to drop finite-field DH suites · **Status:** of little practical danger; the
    standard example of an encoding choice that leaks

### Variable-length integers

Formats that care about size use **variable-length integers** (varints).
Protocol Buffers and WebAssembly use LEB128: seven bits per byte, low bits
first, with the top bit of each byte saying "more follows". Bitcoin uses its
own CompactSize; ASN.1 DER has its own length rules
([Chapter 3](03-ASN1-DER-and-Key-Files.md)). Every varint scheme has the
same trap: unless the decoder insists on the shortest form, the same number
has several encodings, and bytes that were meant to be unique are not. In
LEB128, 300 is `ac 02`, but `ac 82 80 00` also decodes to 300 in a lax reader,
because the extra bytes carry only zero bits.

A strict reader re-encodes what it read and compares. That trick, "decode,
re-encode, compare with the input", is the cheapest way to make any decoder
canonical, and it appears again for Base64 and for DER.

**What to do:**

- Give every integer in a signed or hashed structure a fixed width and a fixed
  byte order, written in the format's specification.
- Never serialize a secret or a key with `hex(n)`, `str(n)` or a minimal-length
  conversion. Use `n.to_bytes(size, "big")` with the field's full size.
- Make decoders reject non-minimal varints and lengths, or re-encode and
  compare.
- When a test vector fails, try the other byte order before anything else.

## 2.3 Hex, Base64 and base64url

*Level: beginner.*

These three encodings, and Base32 in the next section, are defined together in
RFC 4648 (2006). They all work the same way: take the input as a stream of
bits, cut it into groups of $b$ bits, and write each group as one character
from an alphabet of $2^b$ characters. Hex uses 4 bits per character, Base32
uses 5, Base64 uses 6. The size grows by a factor of $8/b$: 2 for hex, 1.6 for
Base32, $4/3$ for Base64. Since $8/b$ need not be a whole number, the last group
may be short; it is filled with zero bits, and padding characters `=` bring the
output to a whole block (2 hex characters per byte; 8 Base32 characters per 5
bytes; 4 Base64 characters per 3 bytes).

### Hex (Base16)

Each byte becomes two characters, one per 4-bit half: `0x42` is `42`. Hex is
the easiest to read and the longest, double the size; hashes, keys and
fingerprints are usually printed in it. `4D61` and `4d61` decode alike, so
compare decoded bytes, never strings.

### Base64 by hand

Base64 takes 3 bytes (24 bits) at a time and writes them as 4 characters of 6
bits each, from the alphabet `A-Z a-z 0-9 + /` (in that order, so `A` is 0 and
`/` is 63). Here are the five bytes of the word `Bytes`:

<figure class="mars-fig">
<svg viewBox="0 0 640 190" width="640" role="img" aria-label="The bytes of Bytes regrouped from five 8-bit bytes into seven 6-bit groups and written as Qnl0ZXM=" fill="currentColor" font-size="14">
<text x="20" y="30" font-size="13">bytes</text>
<text x="20" y="96" font-size="13">6-bit</text>
<text x="20" y="160" font-size="13">characters</text>
<text x="128" y="20" text-anchor="middle" font-family="monospace" font-size="13">B 0x42</text>
<text x="204" y="20" text-anchor="middle" font-family="monospace" font-size="13">y 0x79</text>
<text x="280" y="20" text-anchor="middle" font-family="monospace" font-size="13">t 0x74</text>
<text x="380" y="20" text-anchor="middle" font-family="monospace" font-size="13">e 0x65</text>
<text x="456" y="20" text-anchor="middle" font-family="monospace" font-size="13">s 0x73</text>
<rect x="92" y="30" width="72" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="168" y="30" width="72" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="244" y="30" width="72" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="344" y="30" width="72" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="420" y="30" width="72" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="128" y="48" text-anchor="middle" font-family="monospace" font-size="12">01000010</text>
<text x="204" y="48" text-anchor="middle" font-family="monospace" font-size="12">01111001</text>
<text x="280" y="48" text-anchor="middle" font-family="monospace" font-size="12">01110100</text>
<text x="380" y="48" text-anchor="middle" font-family="monospace" font-size="12">01100101</text>
<text x="456" y="48" text-anchor="middle" font-family="monospace" font-size="12">01110011</text>
<rect x="92" y="80" width="54" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="148" y="80" width="54" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="204" y="80" width="54" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="260" y="80" width="54" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="344" y="80" width="54" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="400" y="80" width="54" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="456" y="80" width="54" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
<rect x="494" y="80" width="16" height="26" fill="currentColor" opacity="0.2"/>
<text x="119" y="98" text-anchor="middle" font-family="monospace" font-size="12">010000</text>
<text x="175" y="98" text-anchor="middle" font-family="monospace" font-size="12">100111</text>
<text x="231" y="98" text-anchor="middle" font-family="monospace" font-size="12">100101</text>
<text x="287" y="98" text-anchor="middle" font-family="monospace" font-size="12">110100</text>
<text x="371" y="98" text-anchor="middle" font-family="monospace" font-size="12">011001</text>
<text x="427" y="98" text-anchor="middle" font-family="monospace" font-size="12">010111</text>
<text x="483" y="98" text-anchor="middle" font-family="monospace" font-size="12">001100</text>
<text x="119" y="160" text-anchor="middle" font-family="monospace">Q</text>
<text x="175" y="160" text-anchor="middle" font-family="monospace">n</text>
<text x="231" y="160" text-anchor="middle" font-family="monospace">l</text>
<text x="287" y="160" text-anchor="middle" font-family="monospace">0</text>
<text x="371" y="160" text-anchor="middle" font-family="monospace">Z</text>
<text x="427" y="160" text-anchor="middle" font-family="monospace">X</text>
<text x="483" y="160" text-anchor="middle" font-family="monospace">M</text>
<text x="539" y="160" text-anchor="middle" font-family="monospace">=</text>
<text x="119" y="130" text-anchor="middle" font-size="11" opacity="0.8">16</text>
<text x="175" y="130" text-anchor="middle" font-size="11" opacity="0.8">39</text>
<text x="231" y="130" text-anchor="middle" font-size="11" opacity="0.8">37</text>
<text x="287" y="130" text-anchor="middle" font-size="11" opacity="0.8">52</text>
<text x="371" y="130" text-anchor="middle" font-size="11" opacity="0.8">25</text>
<text x="427" y="130" text-anchor="middle" font-size="11" opacity="0.8">23</text>
<text x="483" y="130" text-anchor="middle" font-size="11" opacity="0.8">12</text>
<text x="539" y="130" text-anchor="middle" font-size="11" opacity="0.8">pad</text>
<text x="530" y="98" font-size="11">2 zero bits</text>
<text x="530" y="110" font-size="11">added</text>
</svg>
<figcaption>Figure 2.3. Base64 by hand. Three bytes become four characters; the last two bytes become three characters plus one <code>=</code>, and the shaded two bits are zero filler that carries no data.</figcaption>
</figure>

The first three bytes `42 79 74` are 24 bits, which split into the 6-bit
values 16, 39, 37, 52: `Q`, `n`, `l`, `0`. The last two bytes `65 73` are 16
bits; two zero bits make 18, which split into 25, 23, 12: `Z`, `X`, `M`, and
one `=` takes the place of the missing fourth character. One leftover byte
would give two characters and `==`. That is why Base64 output is always a
multiple of 4 characters, and why the shaded bits matter later: they are
supposed to be zero, and a decoder that does not check them accepts more than
one string for the same bytes.

Long Base64 text is broken into lines: at most 76 characters in email
(RFC 2045 §6.8), 64 in PEM files (RFC 7468 §2). The line breaks are not data.

### base64url

`+` and `/` mean something in URLs and file names, so **base64url** swaps them
for `-` and `_` (RFC 4648 §5). The two bytes `fb ff` are `+/8=` in Base64 and
`-_8=` in base64url. JWT and the rest of JOSE use base64url with the `=`
padding left off (RFC 7515 §2), so a decoder must add it back. Mixing the two
alphabets is a classic bug: a `+` in a URL query can turn into a space, and a
`/` breaks a path.

### Code it: one encoder for hex, Base32 and Base64

Since all three cut bits into equal groups, one function covers them. It is
checked against the standard library on 300 random inputs:

```python
import base64, os

HEX = "0123456789ABCDEF"
B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
B64URL = B64[:62] + "-_"

def encode_bits(data, alphabet, bits, pad=True):
    """Cut the bytes into groups of `bits` bits, most significant first."""
    acc = nbits = 0
    out = []
    for byte in data:
        acc = acc << 8 | byte
        nbits += 8
        while nbits >= bits:
            nbits -= bits
            out.append(alphabet[acc >> nbits & (1 << bits) - 1])
    if nbits:                                    # leftover bits, filled with zeros
        out.append(alphabet[acc << (bits - nbits) & (1 << bits) - 1])
    block = {4: 2, 5: 8, 6: 4}[bits]             # characters per whole number of bytes
    if pad:
        out += "=" * (-len(out) % block)
    return "".join(out)

for n in range(300):                             # check against the standard library
    m = os.urandom(n % 40)
    assert encode_bits(m, HEX, 4) == base64.b16encode(m).decode()
    assert encode_bits(m, B32, 5) == base64.b32encode(m).decode()
    assert encode_bits(m, B64, 6) == base64.b64encode(m).decode()
    assert encode_bits(m, B64URL, 6) == base64.urlsafe_b64encode(m).decode()

m = b"Bytes"
print(encode_bits(m, HEX, 4), encode_bits(m, B32, 5), encode_bits(m, B64, 6))
print(encode_bits(bytes([0xfb, 0xff]), B64, 6), encode_bits(bytes([0xfb, 0xff]), B64URL, 6))
```

```
4279746573 IJ4XIZLT Qnl0ZXM=
+/8= -_8=
```

### Break it: the forgiving decoder

Encoding is the easy half. The decoder is where security lives, because it
faces input that someone else chose. Python's default Base64 decoder is
forgiving in two ways:

```python
import base64

print(base64.b64decode("Qnl0ZXM="))          # the canonical encoding of b"Bytes"
print(base64.b64decode("Qnl0ZXN="))          # last character changed: same bytes
print(base64.b64decode("Qnl0ZXP="))          # and again
print(base64.b64decode("Qn<l0>ZX\nM="))      # junk skipped without a word
try:
    base64.b64decode("Qn<l0>ZX\nM=", validate=True)
except ValueError as e:
    print("validate=True:", e)
print(base64.b64decode("Qnl0ZXN=", validate=True))   # but validate does not check the spare bits
```

```
b'Bytes'
b'Bytes'
b'Bytes'
b'Bytes'
validate=True: Only base64 data is allowed
b'Bytes'
```

`M`, `N` and `P` differ only in the two spare bits that Figure 2.3 shaded, so
all three strings decode to `Bytes`. RFC 4648 §3.5 allows decoders to reject
such non-canonical input but does not require it, and most do not; even
Python's `binascii.a2b_base64(..., strict_mode=True)` (Python 3.11 and later)
rejects junk and bad padding but still accepts `Qnl0ZXN=`. And by default
`b64decode` silently throws away characters outside the alphabet.

Each of these turns into a bug when a system compares or filters encoded
strings instead of decoded bytes:

- A service that keeps a list of revoked tokens as strings can be passed a
  token with its last character changed: the string is not on the list, and
  the signature still verifies, because the signature covers decoded bytes.
  The same goes for de-duplicating signatures, nonces or keys by their text.
- A filter that scans encoded text for a forbidden value can be passed the
  value with junk characters inside; the filter does not match, and the
  forgiving decoder downstream removes the junk.

### Fix it: a strict decoder

A strict decoder accepts exactly one string for each byte string: the length
is a multiple of 4, `=` appears only at the end and at most twice, every other
character is in the alphabet, and the spare bits are zero.

```python
import base64, os

ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
VALUE = {c: i for i, c in enumerate(ALPHA)}

def b64decode_strict(text):
    if len(text) % 4:
        raise ValueError("length is not a multiple of 4")
    out = bytearray()
    for i in range(0, len(text), 4):
        group = text[i:i + 4]
        pad = len(group) - len(group.rstrip("="))
        if pad > 2 or (pad and i + 4 != len(text)) or "=" in group.rstrip("="):
            raise ValueError("misplaced padding")
        n = 0
        for c in group[:4 - pad]:
            if c not in VALUE:
                raise ValueError("character outside the alphabet: %r" % c)
            n = n << 6 | VALUE[c]
        n <<= 6 * pad                         # now 24 bits, the spare ones at the bottom
        if n & ((1 << 8 * pad) - 1):
            raise ValueError("non-zero padding bits (not canonical)")
        out += (n >> 8 * pad).to_bytes(3 - pad, "big")
    return bytes(out)

for n in range(200):                          # agrees with the library on good input
    m = os.urandom(n % 50)
    assert b64decode_strict(base64.b64encode(m).decode()) == m
for bad in ["Qnl0ZXN=", "Qnl0ZX!M", "Qnl0ZXM", "Qn=0ZXM="]:
    try:
        b64decode_strict(bad)
    except ValueError as e:
        print(bad, "->", e)
```

```
Qnl0ZXN= -> non-zero padding bits (not canonical)
Qnl0ZX!M -> character outside the alphabet: '!'
Qnl0ZXM -> length is not a multiple of 4
Qn=0ZXM= -> misplaced padding
```

If you must accept line breaks (PEM, email), remove exactly the line breaks
you expect before decoding strictly, rather than letting the decoder skip
whatever it likes. A shorter route to the same strictness, when the library
decoder is forgiving: decode, re-encode, and reject the input unless the
result equals it.

### Decoding secrets in constant time

A Base64 decoder usually looks each character up in a table, and the address
of the lookup depends on the character. When the text is a private key, that
lookup is indexed by secret data and can leak through the CPU cache. In 2021
Florian Sieck, Sebastian Berndt, Jan Wichelmann and Thomas Eisenbarth showed
such attacks on the PEM key loading of several libraries, including OpenSSL,
inside SGX enclaves ("Util::Lookup", ACM CCS 2021). libsodium's Base64
functions were already constant-time; the technique (comparisons and masks
instead of a table) is in [Chapter 5](05-Constant-Time-Programming.md).

!!! note "Life story: Base64"
    **Born:** February 1987 as the "printable encoding" of Privacy Enhanced
    Mail (RFC 989); named base64 in MIME (RFC 1341, 1992, then RFC 2045, 1996);
    collected with Base16 and Base32 in RFC 3548 (2003) and RFC 4648 (2006) ·
    **Purpose:** to carry binary data through email systems that only passed
    printable 7-bit text · **Helped:** email attachments, PEM key and
    certificate files, data URLs, HTTP Basic authentication, JSON fields
    holding keys and ciphertexts, and (as base64url) every JWT ·
    **Status:** everywhere; its weak points are lenient decoders, two
    alphabets that get mixed up, and the belief that it hides anything

**What to do:**

- Pick one alphabet per field (Base64 or base64url), with or without padding,
  and say which in the specification.
- Decode strictly: reject characters outside the alphabet, misplaced padding
  and non-zero spare bits, or re-encode and compare.
- Compare, de-duplicate and revoke on decoded bytes, never on encoded strings.
- For private keys, use a library that decodes key files in constant time.

## 2.4 Base32, percent-encoding and the rest

*Level: beginner.*

### Base32

Base32 takes 5 bytes (40 bits) at a time and writes 8 characters of 5 bits,
using the capitals `A-Z` and the digits `2-7` (RFC 4648 §6). It has no lower
case and leaves out `0`, `1`, `8` and `9`, so that a person reading it aloud
or typing it cannot confuse a digit with `O`, `I` or `B`. It grows data by
60%. Authenticator apps take their TOTP secrets in Base32: the `secret=` in an
`otpauth://` link, the thing a QR code carries when you set up two-factor
login (the codes themselves are in
[Protocols, Chapter 11](../protocols/11-One-Time-Codes-and-Password-Protocols.md)).

Relatives: **base32hex** (RFC 4648 §7) uses `0-9 A-V`, so encoded strings sort
like the bytes (DNSSEC's NSEC3 uses it); Crockford's Base32 drops `I`, `L`,
`O` and `U`; z-base-32 reorders the alphabet for readability. They are not
interchangeable.

Tor's version 3 onion addresses are a neat example of Base32 with a built-in
check. The 56 characters before `.onion` are the Base32 of 35 bytes: the
service's 32-byte Ed25519 public key, a 2-byte checksum, and a version byte
3. The checksum is the first two bytes of SHA3-256 of the string
`.onion checksum`, the key and the version. You can verify a published
address, here DuckDuckGo's:

```python
import base64, hashlib

# A Tor v3 onion address is Base32 of: public key (32) | checksum (2) | version (1).
onion = "duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad"
raw = base64.b32decode(onion.upper())
pub, check, version = raw[:32], raw[32:34], raw[34]
expect = hashlib.sha3_256(b".onion checksum" + pub + bytes([version])).digest()[:2]
print(len(onion), len(raw), version, check.hex(), expect.hex())
print(base64.b32hexencode(b"Bytes"))      # the sort-preserving alphabet 0-9 A-V
```

```
56 35 3 9164 9164
b'89SN8PBJ'
```

A 2-byte checksum misses a typo about once in $2^{16}$, and like every checksum
in this chapter it is no defense against a deliberate substitute. What
protects an onion address is that the name *is* the key, so the service's
signature can be checked against it.

### Percent-encoding

In a web address, any byte that is not a letter, a digit or one of `- . _ ~`
can be written as `%` and two hex digits (RFC 3986 §2.1): a space is `%20`,
`&` is `%26`, `/` is `%2F`. HTML forms also write a space as `+` (the
`application/x-www-form-urlencoded` rules). Text is first turned into UTF-8,
then each byte is encoded.

```python
import urllib.parse, quopri

v = "Bytes & keys/100%?"
once = urllib.parse.quote(v, safe="")
twice = urllib.parse.quote(once, safe="")
print(once)
print(twice)                                   # %25 is the percent sign itself
print(urllib.parse.unquote(twice))             # one decode is not enough
print(urllib.parse.quote_plus("a b+c"))        # HTML forms: space becomes +
print(quopri.encodestring("Café = good".encode()))
```

```
Bytes%20%26%20keys%2F100%25%3F
Bytes%2520%2526%2520keys%252F100%2525%253F
Bytes%20%26%20keys%2F100%25%3F
a+b%2Bc
b'Caf=C3=A9 =3D good'
```

Encoding twice gives text that still "works" in tests but means something else
on the other side, and *decoding* twice is worse. In May 2001 Microsoft's
bulletin MS01-026 fixed a second IIS traversal: the server decoded the path,
ran its security check, and then decoded it again, so `..%255c` became
`..%5c` at the check and `..\` at the file system. The rule is the one from
§2.1: decode exactly once, in one place, then check.

A URL that carries a token, a key or a reset code has it percent-encoded,
which hides nothing: the value is in browser history, proxy logs, server logs
and `Referer` headers. Put secrets in headers or request bodies, not in URLs.

### Quoted-printable

Email's other text encoding (RFC 2045 §6.7) keeps ASCII readable and writes
other bytes as `=` and two hex digits, as the last line above shows: `é` is
`=C3=A9` and `=` itself is `=3D`. It suits mostly-English text; Base64 is used
for binary attachments. A signed email must be signed after its transfer
encoding is fixed, or a server that re-encodes it breaks the signature.

### One message, many encodings

Real output from GNU coreutils 9.4 and Python 3.13. The message is the five
bytes of `Bytes`:

```
$ printf 'Bytes' | od -An -tx1          # the bytes
 42 79 74 65 73
$ printf 'Bytes' | basenc --base16      # hex (Base16)
4279746573
$ printf 'Bytes' | base32               # Base32
IJ4XIZLT
$ printf 'Bytes' | base64               # Base64
Qnl0ZXM=
$ echo Qnl0ZXM | base64 -d              # padding missing: coreutils refuses
Bytesbase64: invalid input
```

The same five bytes in Base58, Bitcoin's alphabet (next section), are
`8Vz9P6i`. For a 32-byte key or digest the encodings compare like this:

| Encoding | Alphabet | Bits per character | Size of 32 bytes | Padding | Standard |
|---|---|---|---|---|---|
| Hex (Base16) | `0-9 A-F` (16) | 4 | 64 characters | none | RFC 4648 §8 |
| Base32 | `A-Z 2-7` (32) | 5 | 56 characters with `=` padding | `=` to a multiple of 8 | RFC 4648 §6 |
| base32hex | `0-9 A-V` (32) | 5 | 56 characters with `=` padding | as Base32 | RFC 4648 §7 |
| Base58 | 58 characters: no `0 O I l` | about 5.86 | 43 or 44 characters | none | Bitcoin Core `base58.cpp` |
| Base64 | `A-Z a-z 0-9 + /` (64) | 6 | 44 characters | `=` to a multiple of 4 | RFC 4648 §4 |
| base64url | `A-Z a-z 0-9 - _` (64) | 6 | 43 characters, padding usually left off | optional | RFC 4648 §5 |
| Bech32 | 32 characters: no `1 b i o` | 5 | 52 characters, plus prefix and 6 check characters | none | BIP 173, BIP 350 |
| Percent-encoding | `%` and two hex digits for each unsafe byte | 8 for safe bytes | up to 96 characters | none | RFC 3986 §2.1 |

**What to do:**

- Use Base32 where people type or read values aloud, base64url in URLs and file
  names, hex where people compare values by eye, and Base64 elsewhere.
- Decode percent-encoding exactly once, then validate.
- Keep secrets out of URLs: encoding them does not protect them.

## 2.5 Encodings that catch typos: Base58Check

*Level: intermediate.*

Every encoding so far assumes the channel is a machine. When a person copies a
value by hand, reads it over the phone or pastes it into a wallet, mistakes
happen, and for a payment address a mistake can lose the money for good.
Bitcoin's two address formats are the best-studied answers: Base58Check from
2009 and Bech32 from 2017.

### Base58

Satoshi Nakamoto's Bitcoin software of 2009 introduced **Base58**. It treats
the whole input as one big number and writes it in base 58, with an alphabet
that drops `0`, `O`, `I` and `l` (they look alike) and `+` and `/` (so that a
double-click selects the whole string). Because a big number has no leading
zeros, each leading zero byte is written as a `1`, the alphabet's zero digit.
A 32-byte value takes $\lceil 256 / \log_2 58 \rceil = \lceil 43.7 \rceil = 44$
characters at most, and 43 when the number is small enough.

Since 58 is not a power of two, every output character depends on every input
byte, and encoding is quadratic in the length. There is no standard document;
the reference is Bitcoin Core's `src/base58.cpp`.

### Base58Check

**Base58Check** adds two things before encoding: a **version byte** in front
(0x00 for a pay-to-public-key-hash address starting with `1`, 0x05 for a
pay-to-script-hash address starting with `3`, 0x80 for a private key in Wallet
Import Format), and a 4-byte **checksum** at the end, the first 4 bytes of
SHA-256 applied twice to everything before it. A random typo then slips
through with probability $2^{-32}$.

The address paid by Bitcoin's first block, `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`,
is a real example you can take apart:

```python
import hashlib

ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"   # no 0 O I l

def b58encode(data):
    n = int.from_bytes(data, "big")
    out = ""
    while n:
        n, r = divmod(n, 58)
        out = ALPHABET[r] + out
    zeros = len(data) - len(data.lstrip(b"\0"))
    return "1" * zeros + out               # each leading zero byte becomes a '1'

def b58decode(s):
    n = 0
    for c in s:
        n = n * 58 + ALPHABET.index(c)    # ValueError on 0, O, I, l and anything else
    zeros = len(s) - len(s.lstrip("1"))
    return b"\0" * zeros + n.to_bytes((n.bit_length() + 7) // 8, "big")

def dsha(b):
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()

def check_encode(version, payload):
    body = bytes([version]) + payload
    return b58encode(body + dsha(body)[:4])

def check_decode(s):
    raw = b58decode(s)
    body, check = raw[:-4], raw[-4:]
    if dsha(body)[:4] != check:
        raise ValueError("checksum mismatch")
    return body[0], body[1:]

genesis = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"   # paid by Bitcoin's first block, 2009
raw = b58decode(genesis)
print(raw.hex())
print("stored checksum", raw[-4:].hex(), "computed", dsha(raw[:-4])[:4].hex())
version, h160 = check_decode(genesis)
print(version, h160.hex(), check_encode(version, h160) == genesis)

typo = genesis[:10] + "f" + genesis[11:]           # one character mistyped
try:
    check_decode(typo)
except ValueError as e:
    print(typo, "->", e)

# Where the 20 bytes come from: RIPEMD-160 of SHA-256 of the block's public key.
pk = bytes.fromhex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6"
                   "49f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f")
try:
    print(hashlib.new("ripemd160", hashlib.sha256(pk).digest()).digest() == h160)
except ValueError:
    print("this Python's OpenSSL has no RIPEMD-160")
```

```
0062e907b15cbf27d5425399ebf6f0fb50ebb88f18c29b7d93
stored checksum c29b7d93 computed c29b7d93
0 62e907b15cbf27d5425399ebf6f0fb50ebb88f18 True
1A1zP1eP5Qfefi2DMPTfTL5SLmv7DivfNa -> checksum mismatch
True
```

The 25 decoded bytes are the version 0x00, the 20-byte hash of the public key,
and the checksum `c29b7d93`, which matches. The address starts with `1`
because the version byte is zero. The last line rebuilds the 20 bytes from the
public key in the first block; some OpenSSL 3 builds leave RIPEMD-160 out, and
then the block prints a note instead.

### Break it: a checksum is not a signature

The checksum catches mistakes, not attackers: anyone can compute it, so a
substitute address has a valid checksum too. That is exactly what
**clipboard hijackers** exploit. Malware such as CryptoShuffler, described by
Kaspersky in 2017, watches the clipboard and, when it sees something shaped
like a wallet address, replaces it with the attacker's. The pasted address is
well-formed and passes every check, and the money goes to the attacker. The
only defense is to confirm the address over a second channel, or to get it
inside something signed (a payment request signed by the payee, or a hardware
wallet that shows the address on its own screen). The same holds for every
checksum in this chapter, from Tor's 2 bytes to Bech32's 30 bits:
**integrity against accidents needs a checksum; integrity against people needs
a MAC or a signature.**

!!! note "Life story: Base58Check"
    **Born:** January 2009, in Satoshi Nakamoto's original Bitcoin software ·
    **Purpose:** compact addresses with no lookalike characters, a version
    byte, and a 32-bit checksum against typing errors · **Helped:** every
    Bitcoin address until 2017, private-key export (WIF), and many other coins
    and systems (IPFS identifiers, Ripple, Flickr's short URLs used a Base58
    too) · **Status:** still accepted everywhere; replaced for new Bitcoin
    address types by Bech32, which is shorter in QR codes, faster, and has
    guaranteed error detection

**What to do:**

- Decode Base58Check strictly and reject any address whose checksum or version
  byte is wrong.
- For a value an attacker might swap, confirm it on a second channel or carry
  it inside a signature: a checksum stops accidents only.

## 2.6 Bech32 and Bech32m

*Level: intermediate.*

When Bitcoin added segregated witness ("segwit") in 2017 it needed a new
address type, and Pieter Wuille and Greg Maxwell took the chance to design the
encoding from first principles. BIP 173 (assigned 20 March 2017) lists what
was wrong with Base58Check: mixed case is awkward to read aloud and to type on
a phone; QR codes cannot use their compact alphanumeric mode for it; the
double SHA-256 is slow and gives no *guarantee* of catching anything; and
decoding is quadratic. **Bech32** fixes each one:

- 32 characters, all lower case (`qpzry9x8gf2tvdw0s3jn54khce6mua7l`, without
  `1`, `b`, `i` and `o`), one per 5-bit group, ordered so that lookalike
  characters tend to differ in one bit.
- A **human-readable part** (`bc` for Bitcoin, `tb` for testnet) and the
  separator `1`, the last `1` in the string.
- A 6-character checksum from a **BCH code**, an error-detecting code over
  the 32-element field: it is *guaranteed* to detect any error that changes up
  to 4 characters, and fails to detect larger errors with probability below
  1 in $10^9$ (BIP 173's figure; the limit for many errors is $2^{-30}$).
- Upper case is allowed only as a whole (for QR codes), never mixed.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The parts of the Bech32 address bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4: human-readable part, separator, witness version, program and checksum" fill="currentColor" font-size="14">
<text x="20" y="22" font-weight="bold" font-size="13">human-readable part</text>
<text x="20" y="38" font-size="12" opacity="0.8">"bc": Bitcoin mainnet</text>
<text x="266" y="22" text-anchor="middle" font-weight="bold" font-size="13">witness program</text>
<text x="266" y="38" text-anchor="middle" font-size="12" opacity="0.8">32 characters x 5 bits = 20 bytes</text>
<line x1="49" y1="44" x2="49" y2="56" stroke="currentColor" stroke-width="1"/>
<line x1="266" y1="44" x2="266" y2="56" stroke="currentColor" stroke-width="1"/>
<text x="40" y="76" font-family="monospace" font-size="15">bc</text>
<text x="74" y="76" font-family="monospace" font-size="15">1</text>
<text x="98" y="76" font-family="monospace" font-size="15">q</text>
<text x="122" y="76" font-family="monospace" font-size="15" textLength="288">w508d6qejxtdg4y5r3zarvary0c5xw7k</text>
<text x="430" y="76" font-family="monospace" font-size="15" textLength="54">v8f3t4</text>
<line x1="40" y1="84" x2="58" y2="84" stroke="currentColor" stroke-width="1.6"/>
<line x1="74" y1="84" x2="83" y2="84" stroke="currentColor" stroke-width="1.6"/>
<line x1="98" y1="84" x2="107" y2="84" stroke="currentColor" stroke-width="1.6"/>
<line x1="122" y1="84" x2="410" y2="84" stroke="currentColor" stroke-width="1.6"/>
<line x1="430" y1="84" x2="484" y2="84" stroke="currentColor" stroke-width="1.6"/>
<line x1="78" y1="88" x2="78" y2="158" stroke="currentColor" stroke-width="1"/>
<line x1="102" y1="88" x2="102" y2="108" stroke="currentColor" stroke-width="1"/>
<line x1="457" y1="88" x2="457" y2="108" stroke="currentColor" stroke-width="1"/>
<text x="96" y="126" font-weight="bold" font-size="13">witness version</text>
<text x="96" y="142" font-size="12" opacity="0.8">q = 0, so Bech32 (v1 and later: Bech32m)</text>
<text x="20" y="176" font-weight="bold" font-size="13">separator</text>
<text x="20" y="192" font-size="12" opacity="0.8">the last "1" in the string</text>
<text x="620" y="126" text-anchor="end" font-weight="bold" font-size="13">checksum</text>
<text x="620" y="142" text-anchor="end" font-size="12" opacity="0.8">6 characters, 30 bits, BCH code</text>
</svg>
<figcaption>Figure 2.4. A Bech32 address taken apart (BIP 173's mainnet example). The checksum covers the human-readable part as well as the data, so "bc" cannot be swapped for "tb" without detection.</figcaption>
</figure>

The checksum is computed by `polymod`, which treats the characters as the
coefficients of a polynomial over the field with 32 elements and returns its
remainder modulo a fixed generator polynomial of degree 6; §2.11 explains why
that guarantees detection. The human-readable part goes in first, expanded so
that its high bits, a zero and then its low bits are all checksummed. A valid
string is one whose `polymod` equals a fixed constant: 1 for Bech32.

### Code it: Bech32 and Bech32m, checked against the BIPs

The code below follows BIP 173 and checks itself against every generic test
vector in BIP 173 and BIP 350, copied exactly: 14 valid strings and 26 invalid
ones, each invalid for a different reason (characters out of range, a string
over 90 characters, no separator, an empty human-readable part, a bad
character, a checksum too short, a checksum computed over the upper-case form).
Then it decodes whole segwit addresses and checks BIP 350's 8 valid addresses,
with the scriptPubKey each must turn into, and its 15 invalid ones.

```python
CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
BECH32, BECH32M = 1, 0x2bc830a3            # the constant XORed in at the end

def polymod(values):                        # the BCH checksum, as written in BIP 173
    chk = 1
    for v in values:
        top = chk >> 25
        chk = (chk & 0x1ffffff) << 5 ^ v
        for i in range(5):
            if top >> i & 1:
                chk ^= GEN[i]
    return chk

def hrp_expand(hrp):                        # high bits, a zero, then low bits
    return [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]

def encode(hrp, data, const):
    pm = polymod(hrp_expand(hrp) + data + [0] * 6) ^ const
    check = [pm >> 5 * (5 - i) & 31 for i in range(6)]
    return hrp + "1" + "".join(CHARSET[d] for d in data + check)

def decode(s):
    """Return (hrp, data, kind) or raise ValueError."""
    if any(ord(c) < 33 or ord(c) > 126 for c in s):
        raise ValueError("character out of range")
    if s.lower() != s and s.upper() != s:
        raise ValueError("mixed case")
    s = s.lower()
    pos = s.rfind("1")                      # the last 1 is the separator
    if pos < 1 or pos + 7 > len(s) or len(s) > 90:
        raise ValueError("bad separator position or length")
    if any(c not in CHARSET for c in s[pos + 1:]):
        raise ValueError("invalid data character")
    hrp, data = s[:pos], [CHARSET.find(c) for c in s[pos + 1:]]
    kind = {BECH32: "bech32", BECH32M: "bech32m"}.get(polymod(hrp_expand(hrp) + data))
    if kind is None:
        raise ValueError("bad checksum")
    return hrp, data[:-6], kind

# BIP 173 and BIP 350 test vectors, copied exactly
valid = {"bech32": ["A12UEL5L", "a12uel5l",
    "an83characterlonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1tt5tgs",
    "abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw",
    "11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8247j",
    "split1checkupstagehandshakeupstreamerranterredcaperred2y9e3w", "?1ezyfcl"],
  "bech32m": ["A1LQFN3A", "a1lqfn3a",
    "an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11sg7hg6",
    "abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx",
    "11llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllludsr8",
    "split1checkupstagehandshakeupstreamerranterredcaperredlc445v", "?1v759aa"]}
invalid = ["\x201nwldj5", "\x7f1axkwrx", "\x801eym55h",
    "an84characterslonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1569pvx",
    "pzry9x0s0muk", "1pzry9x0s0muk", "x1b4n0q5v", "li1dgmt3", "de1lg7wt\xff",
    "A1G7SGD8", "10a06t8", "1qzzfhee",
    "\x201xj0phk", "\x7f1g6xzxy", "\x801vctc34",
    "an84characterslonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11d6pts4",
    "qyrz8wqd2c9m", "1qyrz8wqd2c9m", "y1b0jsk6g", "lt1igcx5c0", "in1muywd", "mm1crxm3i",
    "au1s5cgom", "M1VUXWEZ", "16plkw9", "1p2gdwpf"]
for kind, strings in valid.items():
    assert all(decode(s)[2] == kind for s in strings)
rejected = 0
for s in invalid:
    try:
        decode(s)
    except ValueError:
        rejected += 1
print("valid:", sum(map(len, valid.values())), "rejected:", rejected, "of", len(invalid))

# Segwit addresses on top: BIP 173's rules plus BIP 350's version check
def convertbits(data, frm, to, pad):        # regroup bits, as in encode_bits of §2.3
    acc = bits = 0
    out = []
    for v in data:
        acc, bits = acc << frm | v, bits + frm
        while bits >= to:
            bits -= to
            out.append(acc >> bits & (1 << to) - 1)
    if pad and bits:
        out.append(acc << (to - bits) & (1 << to) - 1)
    elif not pad and (bits >= frm or acc & (1 << bits) - 1):
        raise ValueError("bad padding")
    return out

def segwit_decode(hrp, addr):
    got, data, kind = decode(addr)
    if got != hrp or not data:
        raise ValueError("wrong network or empty")
    ver, prog = data[0], bytes(convertbits(data[1:], 5, 8, False))
    if ver > 16 or not 2 <= len(prog) <= 40 or (ver == 0 and len(prog) not in (20, 32)):
        raise ValueError("bad version or program length")
    if (ver == 0) != (kind == "bech32"):    # BIP 350: v0 is Bech32, v1 and later Bech32m
        raise ValueError("wrong checksum for this version")
    return ver, prog

def script_pubkey(ver, prog):               # OP_0 is 0x00, OP_1..OP_16 are 0x51..0x60
    return bytes([ver + 0x50 if ver else 0, len(prog)]) + prog

good = {   # BIP 350 valid segwit addresses and their scriptPubKeys
 "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4": "0014751e76e8199196d454941c45d1b3a323f1433bd6",
 "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7":
     "00201863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262",
 "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y":
     "5128751e76e8199196d454941c45d1b3a323f1433bd6751e76e8199196d454941c45d1b3a323f1433bd6",
 "BC1SW50QGDZ25J": "6002751e",
 "bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs": "5210751e76e8199196d454941c45d1b3a323",
 "tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy":
     "0020000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433",
 "tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c":
     "5120000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433",
 "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0":
     "512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"}
for addr, spk in good.items():
    net = "tb" if addr.lower().startswith("tb") else "bc"
    assert script_pubkey(*segwit_decode(net, addr)).hex() == spk
bad = [   # BIP 350 invalid segwit addresses
 "tc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq5zuyut",
 "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd",
 "tb1z0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqglt7rf",
 "BC1S0XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ54WELL",
 "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh",
 "tb1q0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq24jc47",
 "bc1p38j9r5y49hruaue7wxjce0updqjuyyx0kh56v8s25huc6995vvpql3jow4",
 "BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R",
 "bc1pw5dgrnzv",
 "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v8n0nx0muaewav253zgeav",
 "BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P",
 "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47Zagq",
 "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v07qwwzcrf",
 "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vpggkg4j",
 "bc1gmk9yu"]
rejected = 0
for addr in bad:
    for net in ("bc", "tb"):
        try:
            segwit_decode(net, addr)
            break
        except ValueError:
            pass
    else:
        rejected += 1
print("good:", len(good), "rejected:", rejected, "of", len(bad))

# The q-insertion weakness (explained below): take a string ending in p, insert qq.
for const in (BECH32, BECH32M):
    s = next(t for t in (encode("bc", [0] * 5 + [k], const) for k in range(32)) if t.endswith("p"))
    t = s[:-1] + "qqp"
    try:
        print(t, "accepted as", decode(t)[2])
    except ValueError as e:
        print(t, "rejected:", e)
```

```
valid: 14 rejected: 26 of 26
good: 8 rejected: 15 of 15
bc1qqqqq399cqjqqp accepted as bech32
bc1qqqqq6q7ek8qqp rejected: bad checksum
```

(In the BIPs, three invalid strings begin with the byte 0x20, 0x7F or 0x80, and
one ends with 0xFF; they appear above as `\x20`, `\x7f`, `\x80` and `\xff`.)

### Bech32m: the weakness found after deployment

In 2019 a surprising property of Bech32 came to light: **if the last character
is `p`, inserting or deleting any number of `q` characters just before it does
not change the checksum's validity** (BIP 350's words, almost exactly). The
reason is short (§2.11): a string ending in `p` leaves the checksum's internal
state at zero just before the final character, and `q`, the value 0, keeps it
at zero. A random string ends in `p` one time in 32 and a random inserted
character is `q` one time in 32, so the error "insert one character before the
last" goes undetected with probability $2^{-10}$ instead of $2^{-30}$. The last
two lines of output above show it: the Bech32 string with `qq` inserted is
still accepted, and the Bech32m one is not.

Version 0 segwit addresses were safe, because they may only be 42 or 62
characters long and an insertion changes the length. But later versions,
starting with Taproot's version 1, may use other program lengths. BIP 350
(Pieter Wuille, assigned 16 December 2020) defines **Bech32m**, which changes
one thing: the final constant becomes `0x2bc830a3` instead of 1. Of all
$2^{30}-1$ possible constants, it was the one that kept every substitution
guarantee and did best on insertions, deletions and swaps after an exhaustive
search (BIP 350 gives the selection). Version 0 addresses stay Bech32;
version 1 and later must be Bech32m, and a decoder must check that the
checksum kind matches the version, or a Bech32m address mutated into a valid
Bech32 one could be accepted.

In the address vectors of the code above, the last valid address,
`bc1p0xlx...`, is a Taproot address whose program is the x-coordinate `79be667e...16f81798` of secp256k1's generator point. The
invalid ones include five where the checksum is the wrong kind for the version,
which is the check that BIP 350 added, and two where the leftover bits after
regrouping are not zero, the same canonical-padding rule as Base64's spare bits.

BIP 173 also warns that a BCH code can *correct* errors, but a wallet that
silently corrects a mistyped address may turn it into a different valid one.
At most, point to where the error probably is.

!!! note "Life story: Bech32 and Bech32m"
    **Born:** BIP 173 by Pieter Wuille and Greg Maxwell, assigned 20 March
    2017, for segwit, which activated on Bitcoin in August 2017; Bech32m in
    BIP 350 by Pieter Wuille, assigned 16 December 2020 · **Purpose:** short,
    single-case addresses that fit QR codes' alphanumeric mode, with a
    checksum guaranteed to catch up to 4 wrong characters · **Helped:** all
    native segwit addresses (`bc1q...`) and, as Bech32m, Taproot addresses
    (`bc1p...`) after Taproot activated in November 2021; Lightning invoices
    and many other systems reuse the format · **Status:** in use; the
    `q`-insertion weakness, found in 2019, was fixed for new address versions
    by Bech32m, and BIP 173 now carries a note recommending Bech32 only for
    version 0

**What to do:**

- Use a checksummed encoding (Bech32m for new designs) where people copy
  values by hand, and reject anything that fails it.
- Never correct errors silently; report that the value is wrong.
- Check the human-readable prefix and the version, and match the checksum kind
  to the version.

## 2.7 Text is not bytes: Unicode and UTF-8

*Level: intermediate.*

Unicode gives every character a number, its **code point**, written `U+` and
hex: `A` is U+0041, `é` is U+00E9, `€` is U+20AC, and the emoji 😀 is U+1F600.
Code points run up to U+10FFFF. Before text can be hashed, signed or encrypted
it must become bytes, and the usual choice is **UTF-8** (RFC 3629): ASCII stays
one byte, and other characters take two to four. The first byte says how many
follow; every following byte starts with the bits `10`.

| Code points | Bytes | Bit pattern |
|---|---|---|
| U+0000 to U+007F | 1 | `0xxxxxxx` |
| U+0080 to U+07FF | 2 | `110xxxxx 10xxxxxx` |
| U+0800 to U+FFFF | 3 | `1110xxxx 10xxxxxx 10xxxxxx` |
| U+10000 to U+10FFFF | 4 | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |

The pattern leaves room for cheating. The slash, U+002F, is one byte, `2f`.
But the two-byte pattern can hold it too: `110 00000` and `10 101111`, which is
`c0 af`. That is an **overlong encoding**, and RFC 3629 forbids it: each code
point has exactly one valid UTF-8 form, the shortest. A decoder that skips
that check is the IIS bug of §2.1. Two other rules matter: the values
U+D800 to U+DFFF are **surrogates**, reserved for UTF-16, and are not
characters, so they must not appear in UTF-8; and nothing above U+10FFFF is
allowed.

### Code it: a decoder that refuses

```python
def utf8_decode(b):
    out, i = [], 0
    while i < len(b):
        lead = b[i]
        if lead < 0x80:
            n, cp, low = 0, lead, 0                 # 1 byte: 0xxxxxxx
        elif 0xC0 <= lead < 0xE0:
            n, cp, low = 1, lead & 0x1F, 0x80       # 2 bytes: 110xxxxx 10xxxxxx
        elif 0xE0 <= lead < 0xF0:
            n, cp, low = 2, lead & 0x0F, 0x800      # 3 bytes
        elif 0xF0 <= lead < 0xF8:
            n, cp, low = 3, lead & 0x07, 0x10000    # 4 bytes
        else:
            raise ValueError("bad lead byte at %d" % i)
        tail = b[i + 1:i + 1 + n]
        if len(tail) < n or any(t & 0xC0 != 0x80 for t in tail):
            raise ValueError("truncated or bad continuation at %d" % i)
        for t in tail:
            cp = cp << 6 | t & 0x3F
        if cp < low:
            raise ValueError("overlong encoding at %d" % i)
        if 0xD800 <= cp <= 0xDFFF or cp > 0x10FFFF:
            raise ValueError("not a Unicode scalar value at %d" % i)
        out.append(chr(cp))
        i += 1 + n
    return "".join(out)

def lax_decode(b):                  # trusts the lead byte and never checks the minimum
    out, i = [], 0
    while i < len(b):
        if b[i] < 0x80:
            out.append(chr(b[i]))
            i += 1
        else:
            out.append(chr((b[i] & 0x1F) << 6 | b[i + 1] & 0x3F))
            i += 2
    return "".join(out)

import random
for _ in range(20000):              # agree with Python on every scalar value we try
    cp = random.choice([random.randrange(0xD800), random.randrange(0xE000, 0x110000)])
    assert utf8_decode(chr(cp).encode("utf-8")) == chr(cp)
for s in "Aé€😀":
    print(s, "U+%04X" % ord(s), s.encode("utf-8").hex(" "))

attack = bytes.fromhex("2e 2e c0 af 2e 2e")    # ..%c0%af.. from the IIS attack
print(lax_decode(attack))
for decoder in (utf8_decode, lambda b: b.decode("utf-8")):
    try:
        decoder(attack)
    except ValueError as e:
        print("rejected:", e)
```

```
A U+0041 41
é U+00E9 c3 a9
€ U+20AC e2 82 ac
😀 U+1F600 f0 9f 98 80
../..
rejected: overlong encoding at 2
rejected: 'utf-8' codec can't decode byte 0xc0 in position 2: invalid start byte
```

Python's decoder is strict, as is Rust's `String::from_utf8`; Go and Java
replace bad bytes with U+FFFD by default, which at least never yields an
overlong `/`. The trouble is code that is lax: hand-written decoders in C, "modified
UTF-8" (Java's serialization format, which writes U+0000 as `c0 80` on purpose),
and the `errors="ignore"` or `errors="replace"` options, which turn invalid
bytes into nothing or into U+FFFD. Ignoring errors is a filter-bypass tool:
`ad\xffmin` becomes `admin` after the check that looked for `admin`.

Three smaller traps: an invisible **byte order mark** (`ef bb bf`) changes a
hash; so do **line endings** (`\n` against `\r\n`), which is why OpenPGP's
cleartext signatures canonicalize them; and a **null byte** ends a string for
C but not for Python or Java, which is how a certificate for
`www.bank.com\0.attacker.com` fooled browsers in 2009
([Chapter 3](03-ASN1-DER-and-Key-Files.md)).

!!! note "Life story: UTF-8"
    **Born:** designed by Ken Thompson with Rob Pike on 2 September 1992, as
    Pike tells it on a placemat in a New Jersey diner, and running in Plan 9
    within days; RFC 2044 (1996), RFC 2279 (1998), RFC 3629 (2003), which
    capped it at U+10FFFF and four bytes · **Purpose:** to carry all of Unicode
    while keeping ASCII unchanged and never putting an ASCII byte inside a
    longer character · **Helped:** became the encoding of the web (well over
    90% of pages), of JSON (RFC 8259 requires it between systems), of most
    Unix systems and of most protocols · **Status:** the default; its security
    lessons are to reject overlongs, surrogates and truncated sequences, and to
    decode once

**What to do:**

- Encode text as UTF-8 before hashing, signing or encrypting, and say so in
  the format.
- Decode with a strict decoder and treat a decoding error as a rejection,
  never as something to ignore or replace.
- Strip or reject byte order marks, and fix line endings, before hashing text.

## 2.8 Same text, different bytes: normalization, PRECIS and lookalikes

*Level: intermediate.*

Strict UTF-8 gives each code point one byte form. It does not give each
*visible word* one form, because Unicode often has several code-point
sequences for the same text. `é` can be the single code point U+00E9, or `e`
followed by U+0301 COMBINING ACUTE ACCENT. They look identical, they are
different strings, and they hash differently. Unicode's answer is
**normalization** (Unicode Standard Annex #15), in four forms:

| Form | What it does | Example |
|---|---|---|
| NFD | decompose: `é` becomes `e` + U+0301 | `café` with 5 code points |
| NFC | decompose, then recompose | `café` with 4 code points; the usual storage form |
| NFKD | as NFD, and also replace *compatibility* characters | `ﬁ` (one ligature) becomes `f` `i` |
| NFKC | as NFC, plus the compatibility replacements | fullwidth `ＪＩＭ` becomes `JIM`, `x²` becomes `x2` |

NFC only merges sequences that are truly the same character. NFKC also folds
characters that are "the same for most purposes" but not identical: ligatures,
fullwidth and halfwidth forms, superscripts, Roman numerals, the Ångström sign.
That makes NFKC useful for identifiers and dangerous for passwords and for
text whose exact form matters.

```python
import unicodedata as ud, hashlib, stringprep

a, b = "caf\u00e9", "cafe\u0301"                 # precomposed é; e plus a combining accent
print(a, b, a == b)
print(a.encode().hex(" "), "|", b.encode().hex(" "))
print(hashlib.sha256(a.encode()).hexdigest()[:16], hashlib.sha256(b.encode()).hexdigest()[:16])
print(ud.normalize("NFC", b) == a, ud.normalize("NFD", a) == b)

for s in ["\ufb01le", "\u2168", "\uff2a\uff29\uff2d", "x\u00b2"]:
    print(repr(s), "NFC:", repr(ud.normalize("NFC", s)), "NFKC:", repr(ud.normalize("NFKC", s)))
print(ud.normalize("NFC", "\u212b") == "\u00c5")    # the Angstrom sign becomes the letter

# Spotify, 2013: a canonical_username() in the style of XMPP nodeprep (RFC 3920)
def canonical(name):
    name = "".join("" if stringprep.in_table_b1(c) else stringprep.map_table_b2(c) for c in name)
    return ud.normalize("NFKC", name)             # case-fold, then NFKC with today's tables

u = "\u1d2e\u1d35\u1d33\u1d2e\u1d35\u1d3f\u1d30"
print(u, "->", canonical(u), "->", canonical(canonical(u)))
print(all(stringprep.in_table_a1(c) for c in u))  # unassigned in Unicode 3.2
```

```
café café False
63 61 66 c3 a9 | 63 61 66 65 cc 81
850f7dc43910ff89 81ef060bcd98adc7
True True
'ﬁle' NFC: 'ﬁle' NFKC: 'file'
'Ⅸ' NFC: 'Ⅸ' NFKC: 'IX'
'ＪＩＭ' NFC: 'ＪＩＭ' NFKC: 'JIM'
'x²' NFC: 'x²' NFKC: 'x2'
True
ᴮᴵᴳᴮᴵᴿᴰ -> BIGBIRD -> bigbird
True
```

The two words on the first line of output look the same on this page as well;
the second line shows that they are different bytes.

### Break it: the username that changed twice

The last lines replay a real account takeover. In 2013 Spotify let people
register with Unicode usernames and compared them through a
`canonical_username()` function built on XMPP's *nodeprep* rules, which
case-fold and then apply NFKC. The name `ᴮᴵᴳᴮᴵᴿᴰ` (modifier letters, not
ordinary capitals) is not `bigbird`, so registering it was allowed. But its
canonical form was `BIGBIRD`, in capitals, because the case-folding table
dated from Unicode 3.2, where these modifier letters did not exist, while NFKC
came from a newer Unicode that turns them into capitals *after* the case-fold.
The attacker registered `ᴮᴵᴳᴮᴵᴿᴰ` and asked for a password reset; the name
was canonicalized once when the link was made and again when it was used, and
the second pass turned `BIGBIRD` into `bigbird`, the victim's account. The
function was not **idempotent**. A correct stringprep would have refused the
name, which is made of characters unassigned in Unicode 3.2 (the last line).

!!! note "Life story: the Spotify ᴮᴵᴳᴮᴵᴿᴰ takeover"
    **Born:** reported to Spotify in 2013; described in its engineering blog
    post "Creative usernames and Spotify account hijacking" in June 2013 ·
    **Purpose:** none intended: a canonicalization function that was not
    idempotent, because two of its steps used different Unicode versions ·
    **Helped:** attackers could take over accounts by registering a
    lookalike name and resetting its password; it became the standard example
    of why string preparation must be stable · **Status:** fixed by Spotify;
    PRECIS (RFC 8264) requires profiles to be applied until the result is
    stable and to reject strings that do not settle

### PRECIS: usernames and passwords

The IETF's first framework for this, stringprep (RFC 3454, 2002), was tied to
Unicode 3.2 and could not follow new versions, as Spotify found. It was
replaced by **PRECIS**, the Preparation, Enforcement and Comparison of
Internationalized Strings: the framework in RFC 8264 and the profiles for
usernames and passwords in RFC 8265 (both October 2017, by Peter Saint-Andre
and Alexey Melnikov). PRECIS works from Unicode properties, so it carries
forward to new versions. The two profiles that matter here:

- **UsernameCaseMapped** maps fullwidth and halfwidth characters to their
  ordinary forms, maps to lower case, applies NFC, then checks every code
  point against the *IdentifierClass*: letters, digits and printable ASCII;
  no spaces, symbols or compatibility characters such as `ᴮ`. (An application
  may allow spaces between separately prepared parts of a name.)
- **OpaqueString**, for passwords, maps every kind of space to an ordinary
  space and applies NFC. Nothing else: case is kept, width is kept, and the
  *FreeformClass* allows almost any printable character. The point is that a
  password typed as `é` on one keyboard and `e` + accent on another becomes
  the same bytes, and nothing more is merged, so nothing is lost.

RFC 8264 §7 also writes the Spotify lesson into the rules: apply the profile,
and if applying it again changes the string, keep applying it; reject the
string if it is still changing after three more rounds.

Python has no PRECIS module (the third-party `precis-i18n` package implements
it fully). Here is a simplified sketch, enough to see what each rule does; a
real implementation uses the exact derived property tables of RFC 8264 and
the bidirectional rule of RFC 5893.

```python
import unicodedata as ud

def width_map(s):            # fullwidth and halfwidth forms to their ordinary forms
    out = []
    for c in s:
        d = ud.decomposition(c)
        out.append(chr(int(d.split()[1], 16)) if d.startswith(("<wide>", "<narrow>")) else c)
    return "".join(out)

def identifier_ok(c):        # a rough IdentifierClass test (RFC 8264 §4.2)
    if 0x21 <= ord(c) <= 0x7E:
        return True
    if ud.category(c) not in ("Ll", "Lu", "Lo", "Lm", "Nd", "Mn", "Mc"):
        return False         # spaces, symbols, punctuation, controls, unassigned
    return not ud.decomposition(c).startswith("<")   # compatibility forms are disallowed

def username_casemapped(s):  # RFC 8265 §3.3, simplified
    for _ in range(4):       # apply until stable; RFC 8264 §7 allows three extra rounds
        t = ud.normalize("NFC", width_map(s).lower())
        if t == s:
            break
        s = t
    else:
        raise ValueError("does not stabilize")
    if not s or not all(identifier_ok(c) for c in s):
        raise ValueError("not allowed in a username")
    return s

def opaque_string(s):        # RFC 8265 §4.2, simplified: for passwords
    s = "".join(" " if ud.category(c) == "Zs" else c for c in s)   # any space to U+0020
    s = ud.normalize("NFC", s)                    # no case mapping, no width mapping
    if not s or any(ud.category(c) in ("Cc", "Cn") for c in s):
        raise ValueError("not allowed in a password")
    return s

for name in ["Jim", "\uff2a\uff29\uff2d", "cafe\u0301",
             "\u1d2e\u1d35\u1d33\u1d2e\u1d35\u1d3f\u1d30", "jim smith", "p\u0430ypal"]:
    try:
        print(repr(name), "->", repr(username_casemapped(name)))
    except ValueError as e:
        print(repr(name), "->", e)

typed_mac = "Gr\u00fc\u00dfe\u00a0aus K\u00f6ln"       # precomposed, no-break space
typed_other = "Gru\u0308\u00dfe aus Ko\u0308ln"         # combining marks, plain space
print(typed_mac == typed_other, opaque_string(typed_mac) == opaque_string(typed_other))
print(opaque_string("Secret") == opaque_string("secret"))   # passwords keep their case
```

```
'Jim' -> 'jim'
'ＪＩＭ' -> 'jim'
'café' -> 'café'
'ᴮᴵᴳᴮᴵᴿᴰ' -> not allowed in a username
'jim smith' -> not allowed in a username
'pаypal' -> 'pаypal'
False True
False
```

Apply the password profile *before* the password hash, both at registration
and at login, or a user whose keyboard changes will be locked out; the
hashing itself is in [Chapter 13](13-Passwords-on-the-Server.md). Note also
what PRECIS let through: `pаypal` with a Cyrillic `а`.

### Lookalikes: two strings, one appearance

Normalization merges different encodings of the *same* character. It never
merges different characters that merely look alike, and Unicode has thousands
of those: Latin `a` (U+0061) and Cyrillic `а` (U+0430), Latin `o`, Greek `ο` and
Cyrillic `о`, the digit `0` and the letter `O`. Evgeniy Gabrilovich and Alex
Gontmakher named the **homograph attack** in 2002 with a lookalike
`microsoft.com`; in 2005 a lookalike `paypal.com` worked in most browsers
other than Internet Explorer; and in April 2017 Xudong Zheng registered a
domain written entirely in Cyrillic, `аррӏе.com`, which Chrome and Firefox
displayed exactly like `apple.com`. Under the hood it is the punycode name
`xn--80ak6aa92e.com`:

```python
import unicodedata as ud

def scripts(label):                       # the script of each letter, from its name
    return {ud.name(c).split()[0] for c in label if c.isalpha()}

for host in ["apple.com", "\u0430\u0440\u0440\u04cf\u0435.com", "p\u0430ypal.com"]:
    label = host.split(".")[0]
    print(host, host.encode("idna").decode(), sorted(scripts(label)))
print(ud.normalize("NFKC", "\u0430") == "a")   # normalization never maps Cyrillic to Latin
```

```
apple.com apple.com ['LATIN']
аррӏе.com xn--80ak6aa92e.com ['CYRILLIC']
pаypal.com xn--pypal-4ve.com ['CYRILLIC', 'LATIN']
False
```

The first two names look the same and are different byte strings, different
domains and could have different certificates; the encoding is doing its job
perfectly. Browsers now show the punycode form when a label mixes scripts,
and Chrome also when it is written entirely in a script that only imitates
Latin letters (Chrome 58, April 2017); Firefox at first left such whole-script
lookalikes to a user setting, `network.IDN_show_punycode`. The general tools are
in Unicode Technical Standard #39: a "skeleton" that maps confusable
characters to a common form, and mixed-script detection like the one above.
Use them to warn or reject at registration.

The same trick works on source code: **Trojan Source** (Nicholas Boucher and
Ross Anderson, November 2021, CVE-2021-42574) uses bidirectional control
characters so that a reviewer reads one program and the compiler builds
another.

**What to do:**

- Normalize text to NFC before hashing, signing or comparing it, and do it on
  both sides.
- Prepare usernames with PRECIS UsernameCaseMapped (or a stricter rule of your
  own) and passwords with OpaqueString, through a maintained library, and
  store the prepared form.
- Make every canonicalization idempotent: check that applying it twice gives
  the same result, and reject what does not settle.
- Reject or flag mixed-script names at registration; never treat "looks the
  same" as "is the same".

## 2.9 Canonical encoding: when two messages are one

*Level: intermediate.*

A MAC or a signature authenticates a byte string. The application cares about
a *meaning*: pay this much to that account. The step between them, turning
fields into one byte string, is called **serialization**, and for anything
that is signed or MACed it must be **injective**: two different field lists
must never give the same bytes. Niels Ferguson and Bruce Schneier called the
rule the **Horton principle** (*Practical Cryptography*, 2003), after
Dr. Seuss's elephant who "meant what he said, and said what he meant".

### Break it: moving characters between fields

A payment service lets a merchant send an invoice that the customer approves
in an app. The app shows the account, the amount and a memo, and sends the
three fields with an HMAC tag computed over their concatenation. The attacker
writes the invoice: 5 to `acct-77`, memo `00 thanks for lunch`.

```python
import hmac, hashlib, secrets

KEY = secrets.token_bytes(32)

def sign_bad(fields):                         # the payment service's first version
    return hmac.new(KEY, "".join(fields).encode(), hashlib.sha256).hexdigest()

approved = ["acct-77", "5", "00 thanks for lunch"]    # what the customer saw and approved
tag = sign_bad(approved)
forged = ["acct-77", "500", " thanks for lunch"]      # what the attacker submits
print("".join(approved) == "".join(forged))
print(hmac.compare_digest(tag, sign_bad(forged)))

# A separator does not fix it when fields may contain the separator.
print("|".join(["acct-77", "5|00", "x"]) == "|".join(["acct-77", "5", "00|x"]))
```

```
True
True
True
```

The customer approved 5; the server accepts 500 with the same tag. The HMAC
is perfect. The serialization threw away the boundaries between fields, so
`["acct-77", "5", "00 thanks for lunch"]` and `["acct-77", "500", " thanks for lunch"]`
are, as far as the MAC can tell, the same message. A separator character
helps only if no field can contain it, which means escaping, and escaping is
one more encoding that must itself be strict.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two different field lists concatenate to the same bytes; with a length before each field they give different bytes" fill="currentColor" font-size="14">
<text x="20" y="26" font-weight="bold">Concatenation</text>
<rect x="20" y="38" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="58" text-anchor="middle" font-family="monospace" font-size="13">acct-77</text>
<rect x="100" y="38" width="30" height="30" fill="currentColor" opacity="0.18"/>
<rect x="100" y="38" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="58" text-anchor="middle" font-family="monospace" font-size="13">5</text>
<rect x="130" y="38" width="190" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="225" y="58" text-anchor="middle" font-family="monospace" font-size="13">00 thanks for lunch</text>
<rect x="20" y="78" width="80" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="98" text-anchor="middle" font-family="monospace" font-size="13">acct-77</text>
<rect x="100" y="78" width="50" height="30" fill="currentColor" opacity="0.18"/>
<rect x="100" y="78" width="50" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125" y="98" text-anchor="middle" font-family="monospace" font-size="13">500</text>
<rect x="150" y="78" width="170" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="235" y="98" text-anchor="middle" font-family="monospace" font-size="13"> thanks for lunch</text>
<line x1="330" y1="73" x2="372" y2="73" stroke="currentColor" stroke-width="1.4"/>
<polygon points="380,73 372,69 372,77" fill="currentColor"/>
<text x="390" y="68" font-family="monospace" font-size="13">acct-77500 thanks for lunch</text>
<text x="390" y="88" font-size="12" opacity="0.8">one byte string, one tag, two meanings</text>
<text x="20" y="150" font-weight="bold">Length before each field</text>
<text x="20" y="180" font-family="monospace" font-size="13">3 | 7 acct-77 | 1 5 | 19 00 thanks for lunch</text>
<text x="20" y="210" font-family="monospace" font-size="13">3 | 7 acct-77 | 3 500 | 17  thanks for lunch</text>
<line x1="420" y1="195" x2="452" y2="195" stroke="currentColor" stroke-width="1.4"/>
<polygon points="460,195 452,191 452,199" fill="currentColor"/>
<text x="470" y="190" font-size="13">different bytes,</text>
<text x="470" y="207" font-size="13">different tags</text>
<text x="20" y="238" font-size="12" opacity="0.8">field count first, then each field's length; a decoder can split it only one way</text>
</svg>
<figcaption>Figure 2.5. Concatenation forgets where fields end, so two field lists give the same bytes. A count and a length per field make the encoding injective.</figcaption>
</figure>

### Fix it: a length-prefixed encoding

Put the number of fields first, and before each field its length in a fixed
width. Then the bytes can be split only one way, so different field lists give
different bytes. Add a label naming the message type and version, so a tag
made for one kind of message cannot be replayed as another (this is called
**domain separation**).

```python
import hmac, hashlib, secrets, struct, json

KEY = secrets.token_bytes(32)

def encode_fields(fields):            # field count, then each field's length and bytes
    out = struct.pack(">I", len(fields))
    for f in fields:
        b = f.encode("utf-8")
        out += struct.pack(">I", len(b)) + b
    return out

def decode_fields(data):              # the inverse, which refuses anything left over
    (count,) = struct.unpack_from(">I", data, 0)
    pos, fields = 4, []
    for _ in range(count):
        (n,) = struct.unpack_from(">I", data, pos)
        if pos + 4 + n > len(data):
            raise ValueError("field runs past the end")
        fields.append(data[pos + 4:pos + 4 + n].decode("utf-8"))
        pos += 4 + n
    if pos != len(data):
        raise ValueError("trailing bytes")
    return fields

def sign_good(fields):
    return hmac.new(KEY, b"payment-v1\0" + encode_fields(fields), hashlib.sha256).digest()

approved = ["acct-77", "5", "00 thanks for lunch"]
forged = ["acct-77", "500", " thanks for lunch"]
print(encode_fields(approved).hex(" "))
print(encode_fields(approved) == encode_fields(forged))
print(hmac.compare_digest(sign_good(approved), sign_good(forged)))
print(decode_fields(encode_fields(approved)) == approved)

# JSON is not a canonical encoding: duplicate keys, and the last one wins in Python.
print(json.loads('{"to": "acct-77", "amount": 5, "amount": 500}'))
```

```
00 00 00 03 00 00 00 07 61 63 63 74 2d 37 37 00 00 00 01 35 00 00 00 13 30 30 20 74 68 61 6e 6b 73 20 66 6f 72 20 6c 75 6e 63 68
False
False
True
{'to': 'acct-77', 'amount': 500}
```

The decoder exists to prove the encoding is injective: if every byte string
decodes to at most one field list, no two lists share an encoding. The fix
costs four bytes per field.

### In the real world

**Amazon Web Services, 2008.** AWS Signature Version 1 authenticated a request
by an HMAC over its parameter names and values, sorted without regard to case
and concatenated with nothing in between. So `?a=bc` and `?ab=c` had the same
signature. Colin Percival reported it and published the details in December
2008, when Amazon moved to Signature Version 2, which signs a canonical query
string with `=` and `&` between percent-encoded names and values.

**Android's "Master Key" bug, 2013.** An Android app is a ZIP archive whose
entries are signed. ZIP allows two entries with the same name. The signature
checker, written in Java, verified one copy; the installer, in C, extracted
the other. Two parsers read one byte string as two different things.

**XML signature wrapping.** XML Signature signs one element of a document,
found by reference. Moving the signed element elsewhere and putting a forged
one where the application looks keeps the signature valid. Michael McIntosh and
Paula Austel described these rewriting attacks in 2005; in 2012 Juraj Somorovsky
and colleagues ("On Breaking SAML", USENIX Security) found 11 of 14 SAML
frameworks vulnerable, letting attackers log in as anyone. SAML itself is in
[Protocols, Chapter 14](../protocols/14-OAuth-OpenID-Connect-and-JWT.md).

**JSON.** RFC 8259 says object names *should* be unique, and leaves
duplicates to the parser. Python keeps the last value (above), some parsers
keep the first, some reject the document; a gateway and a back end can
disagree about one signed byte string. Bishop Fox's 2021 survey of 49 JSON
parsers found many such differences.

**Bitcoin malleability.** Bitcoin's ECDSA signatures were DER, and early nodes
accepted BER-style variants of the same signature. Anyone could re-encode a
transaction's signature, changing its identifier without invalidating it,
and Mt. Gox blamed this "malleability" when it halted withdrawals in February
2014. BIP 66 (2015) made strict DER mandatory. DER itself is [Chapter 3](03-ASN1-DER-and-Key-Files.md).

**Okta, 2024.** A cache key was the bcrypt hash of the user ID, username and
password, concatenated. bcrypt reads only 72 bytes, so with usernames of 52
characters or more the password fell outside the hashed part and a cached
login could succeed with any password (advisory of 1 November 2024; see
[Chapter 13](13-Passwords-on-the-Server.md)).

!!! note "Life story: the Android Master Key bug"
    **Born:** found by Jeff Forristal at Bluebox Security, reported to Google
    in February 2013, announced in July 2013, CVE-2013-4787 · **Purpose:**
    none intended: the signature verifier and the installer chose different
    entries when a ZIP held two files with the same name · **Helped:**
    attackers could change any signed app, system apps included, without
    breaking its signature, on Android versions back to 1.6 · **Status:**
    fixed in 2013; the lesson, verify exactly the bytes you then use, led to
    APK Signature Scheme v2 (Android 7.0, 2016), which signs the whole file

**What to do:**

- Never sign, MAC or hash a plain concatenation of variable-length fields.
  Give each field a fixed width or a length prefix, and put a field count and
  a message-type label in front.
- Write the decoder for your encoding and check that encode and decode are
  inverses; reject trailing bytes.
- Verify the bytes you will use, with the parser that will use them. If two
  parsers are involved, make one of them produce the bytes the other reads.
- Reject JSON with duplicate keys before checking a signature over it, or
  better, sign bytes rather than a re-serialized object.

## 2.10 TupleHash and other standard answers

*Level: intermediate.*

A standard means that two implementations agree byte for byte. NIST's
SP 800-185 (December 2016, by John Kelsey, Shu-jen Chang and Ray Perlner)
defines four functions built on SHA-3's Keccak: cSHAKE, KMAC, TupleHash and
ParallelHash. **TupleHash** is exactly the answer to §2.9: it hashes a *list*
of byte strings, and "the hash of a tuple" is unambiguous by construction.

Its encoding has three pieces:

- `left_encode(n)` writes the number of bytes needed for $n$, then $n$ in
  big-endian; `right_encode(n)` puts the count at the end. Both are
  self-delimiting.
- `encode_string(S)` is `left_encode` of the bit length of $S$, then $S$.
- TupleHash feeds `encode_string` of every element, then `right_encode` of the
  output length $L$ in bits, into cSHAKE with the function name
  `"TupleHash"` and a **customization string** $S$ chosen by the application.

$$\mathrm{TupleHash}(X, L, S) = \mathrm{cSHAKE}\big(\mathrm{encode\_string}(X_1) \,\|\, \cdots \,\|\, \mathrm{encode\_string}(X_n) \,\|\, \mathrm{right\_encode}(L),\; L,\; \texttt{"TupleHash"},\; S\big)$$

Putting $L$ inside the input means that a 256-bit and a 512-bit TupleHash of
the same tuple are unrelated, rather than one being a prefix of the other. The
customization string separates domains: `"payment-v1"` and `"login-v1"` give
unrelated hashes of the same tuple. TupleHash128 and TupleHash256 differ in the
Keccak capacity (cSHAKE128 or cSHAKE256), and TupleHashXOF variants give output
of any length. KMAC, the keyed member of the family, is on the
[KMAC page](../../06-mac/KMAC.md).

The encoding part can be checked against the worked sample that NIST
publishes for TupleHash, which prints the encoded elements and the bytes
absorbed:

```python
def left_encode(n):                  # length of the number in bytes, then the number
    b = n.to_bytes(max(1, (n.bit_length() + 7) // 8), "big")
    return bytes([len(b)]) + b

def right_encode(n):                 # the same, with the length at the end
    b = n.to_bytes(max(1, (n.bit_length() + 7) // 8), "big")
    return b + bytes([len(b)])

def encode_string(s):                # bit length of s, then s
    return left_encode(8 * len(s)) + s

def tuple_encoding(items, L):       # what TupleHash feeds to cSHAKE
    return b"".join(encode_string(x) for x in items) + right_encode(L)

X = [bytes.fromhex("000102"), bytes.fromhex("101112131415")]   # NIST's sample tuple
print(encode_string(X[0]).hex(" "), "|", encode_string(X[1]).hex(" "))
print(encode_string(b"TupleHash").hex(" "), "|", encode_string(b"").hex(" "))
print(tuple_encoding(X, 256).hex(" "))

approved = [b"acct-77", b"5", b"00 thanks for lunch"]
forged = [b"acct-77", b"500", b" thanks for lunch"]
print(tuple_encoding(approved, 256) == tuple_encoding(forged, 256))
print(tuple_encoding([b"ab", b"c"], 256).hex(" "))
print(tuple_encoding([b"a", b"bc"], 256).hex(" "))
```

```
01 18 00 01 02 | 01 30 10 11 12 13 14 15
01 48 54 75 70 6c 65 48 61 73 68 | 01 00
01 18 00 01 02 01 30 10 11 12 13 14 15 01 00 02
False
01 10 61 62 01 08 63 01 00 02
01 08 61 01 10 62 63 01 00 02
```

The first three lines match NIST's sample byte for byte (its encoded
elements, name and customization, and the data absorbed after the prefix). The last two show `("ab", "c")` and `("a", "bc")` becoming different
inputs. Python's `hashlib` has SHAKE but not cSHAKE, whose padding differs, so
the final step needs a Keccak permutation; written out in Python (about 40
lines, following FIPS 202) and run on these inputs, it reproduces NIST's
outputs for the first three 128-bit samples, beginning `c5d8786c1afb9b82`,
`75cdb20ff4db1154` and `e60f202c89a2631e`.

TupleHash is not the only standard answer. **TLS 1.3** writes every
structure in its presentation language with a fixed-width length before each
variable-length field (RFC 8446 §3), so its transcript hash is unambiguous.
**DER** gives ASN.1 one encoding per value ([Chapter 3](03-ASN1-DER-and-Key-Files.md)).
**Deterministic CBOR** (RFC 8949 §4.2) and the **JSON Canonicalization
Scheme** (RFC 8785, 2020) fix one byte form for those formats. Protocol
Buffers promise no canonical form, so sign the bytes you send, not a message
re-serialized on the other side. HKDF's `info` label does for keys what
TupleHash's $S$ does for hashes ([Chapter 10](10-The-Life-of-a-Key.md)).

!!! note "Life story: SP 800-185 and TupleHash"
    **Born:** December 2016, NIST SP 800-185, "SHA-3 Derived Functions:
    cSHAKE, KMAC, TupleHash and ParallelHash", by John Kelsey, Shu-jen Chang
    and Ray Perlner · **Purpose:** customizable SHA-3 functions with domain
    separation built in, a MAC without HMAC's nesting, an unambiguous hash of
    a list, and a parallel hash for long inputs · **Helped:** KMAC is an
    approved option in NIST's key-derivation standards; TupleHash gives
    designers a named, tested answer to field ambiguity · **Status:** current;
    less deployed than HMAC, but the reference for hashing structured data

### Common mistakes

- **Treating Base64 as protection.** `jim:secret` in HTTP Basic is
  `amltOnNlY3JldA==`, readable by anyone on the path; it is safe only inside
  TLS.
- **Thinking a JWT is secret.** A signed JWT's payload is base64url text that
  anyone can decode; only JWE, an encrypted JWT, hides it.
- **Mixing Base64 and base64url.** A `+` in a URL can turn into a space, and a
  `/` breaks a path.
- **Hashing text, not bytes.** Agree on UTF-8, normalization, case and line
  endings first, or the same text gives different digests.
- **Double encoding.** `%2520` and Base64 of Base64 "work" in tests and fail on
  the other side; decoding twice reopens the IIS traversal.
- **Signing concatenations.** Use TupleHash, or length prefixes and a label.

## 2.11 Going deeper

*Level: expert.*

**Why Bech32 catches four errors.** Read the data characters $v_1, \dots, v_n$
(after the expanded human-readable part) as coefficients of a polynomial over
$\mathrm{GF}(32)$, with a leading 1:
$V(x) = x^n + v_1 x^{n-1} + \cdots + v_n$. `polymod` computes
$V(x) \bmod g(x)$ for a fixed degree-6 generator $g$, the `GEN` table holding
$g$ multiplied by 1, 2, 4, 8 and 16 in $\mathrm{GF}(32)$, five bits per
coefficient, so that $g(x) = x^6 + 29x^5 + 22x^4 + 20x^3 + 21x^2 + 29x + 18$
is `GEN[0]` read in 5-bit groups; a string is valid when the
remainder equals the constant $c$ (1 for Bech32). An error adds some
$E(x) = \sum e_i x^i$ to $V$, and goes undetected exactly when $g$ divides $E$.
A BCH code chooses $g$ so that its roots, in an extension field (here
$\mathrm{GF}(1024)$), include enough consecutive powers of one element; the
BCH bound then says every nonzero multiple of $g$ shorter than the code length
has at least five nonzero coefficients. An error touching at most four
characters cannot be such a multiple, so it is always caught, within the
lengths BIP 173 checked (up to 89 characters).

**Why `q` before a final `p` is invisible.** `polymod` is a running remainder:
reading value $v$ maps the state $r$ to $r \cdot x + v \bmod g$. If the last
character is `p` (value 1) and the final state is $c = 1$, the state before it
satisfied $r x + 1 = 1$, so $r x \equiv 0$, and since $g(0) \ne 0$, $x$ is
invertible modulo $g$ and $r = 0$. Reading `q` (value 0) maps 0 to 0, so any
number of `q`s can be inserted or removed there. With Bech32m's constant
$c = \texttt{0x2bc830a3}$ the state before the final `p` is
$r = (c - 1)x^{-1} \ne 0$. Inserting one `q` changes the final state from
$r x + 1$ to $r x^2 + 1$, and these are equal only if $r x (x - 1) \equiv 0$;
both $x$ and $x - 1$ are invertible modulo $g$ (since $g(0) = 18$ and
$g(1) = 4$ are not zero), so that would need $r = 0$.

**Injective, prefix-free and canonical.** An encoding $e$ from structured
values to bytes is *injective* if $e(a) = e(b)$ implies $a = b$; that is the
property a signature needs, since it then binds one value. It is
*prefix-free* if no encoding is a prefix of another; then any sequence of
encodings is again injective, which is why `encode_string` can be
concatenated safely while raw strings cannot. Length-first encodings are
prefix-free by construction. It is *canonical* if, in addition, the decoder
accepts only $e(a)$ for each $a$, never a second string; strict Base64, minimal
varints, strict UTF-8 and DER are canonical, while BER, lax Base64 and JSON are
not. Security proofs of signing structured data assume at least
injectivity; TupleHash's encoding is injective and prefix-free, and its
customization string separates every $(N, S)$ from every other.

## Check yourself

??? question "1. Is Base64 a kind of encryption? What does it protect against?"

    No: there is no key and anyone can decode it. It only lets bytes pass
    through channels that carry text.

??? question "2. Encode the two bytes `00 ff` in hex, Base64 and base64url by hand."

    Hex: `00ff`. The 16 bits `00000000 11111111` plus two zero bits split into
    `000000 001111 111100`, the values 0, 15, 60: `AP8=` in Base64, and also
    `AP8=` in base64url (or `AP8` without padding), since neither `+` nor `/`
    appears.

??? question "3. A 256-bit secret is serialized with `hex(n)[2:]` and decoded with `bytes.fromhex`. What goes wrong, and how often?"

    `hex` drops leading zeros. When the top 4 bits are zero (1 time in 16) the
    string is shorter, so `bytes.fromhex` fails on an odd length or returns
    fewer bytes. Use `n.to_bytes(32, "big")`.

??? question "4. Why do `Qnl0ZXM=` and `Qnl0ZXN=` decode to the same bytes, and why does it matter?"

    The last character carries two spare bits that the decoder ignores; `M`
    and `N` differ only there. A revocation list or duplicate check that
    compares encoded strings can be bypassed with the second form while the
    signature over the decoded bytes still verifies.

??? question "5. A Base58Check address passes its checksum. Can you be sure it is the address the payee gave you?"

    No. The checksum is unkeyed, so malware that swaps the address computes a
    valid checksum for its own. Confirm it on a second channel.

??? question "6. Why did Bech32's `q`-insertion weakness not affect version 0 segwit addresses?"

    Version 0 addresses must be 42 or 62 characters (20- or 32-byte
    programs), so an inserted or deleted `q` gives a length the decoder
    rejects.

??? question "7. Why should a password be normalized with NFC but not with NFKC or case folding?"

    NFC only merges different encodings of the same characters, so it makes
    keyboards agree without losing anything. NFKC and case folding merge
    distinct characters (`²` and `2`, `S` and `s`), which shrinks the password
    space and can make two different passwords equal. PRECIS OpaqueString
    uses NFC plus space mapping only.

??? question "8. A name passes PRECIS UsernameCaseMapped. Can it still be a lookalike of another user's name?"

    Yes. PRECIS does not merge confusables: `pаypal` with a Cyrillic `а`
    passes. Use the UTS #39 skeleton or mixed-script detection at
    registration.

??? question "9. An API signs `method + path + body`. Find two requests with the same signature."

    `("GET", "/a", "bc")` and `("GET", "/ab", "c")` concatenate to the same
    string. Fix: length-prefix each field (or use TupleHash) and add a label
    such as `"request-v1"`.

??? question "10. Show that TupleHash's encoding of `("ab", "c")` and `("a", "bc")` differ, and say what property guarantees this for all tuples."

    `encode_string("ab")` is `01 10 61 62` and `encode_string("c")` is
    `01 08 63`, against `01 08 61` and `01 10 62 63`. In general
    `encode_string` is prefix-free, so a concatenation of encodings can be
    split in only one way, and the whole encoding is injective.

## What you learned

- Cryptographic functions see only bytes. Every translation into bytes, from
  integers, text or structures, must be exact and one-to-one, or a MAC or
  signature covers more than one meaning.
- Integers need a fixed byte order and a fixed width; a dropped leading zero
  is a bug once in 256 runs, and in TLS 1.2 it was the Raccoon side channel.
- Hex, Base32 and Base64 regroup bits; Base58 and Bech32 add checksums against
  typing errors. None hides anything, and decoders must be strict, since
  lenient ones accept several strings per value.
- Checksums stop accidents, not attackers; Bech32m repaired Bech32's
  insertion weakness.
- UTF-8 must be decoded strictly; text must be normalized (NFC) before it is
  compared or hashed; PRECIS prepares usernames and passwords; lookalikes
  need a separate defense.
- Concatenation without lengths lets an attacker move bytes between fields;
  length prefixes, a label or TupleHash make the encoding injective.

**Next:** [Chapter 3](03-ASN1-DER-and-Key-Files.md), the binary encoding under
every certificate and key file, and the parser bugs that came with it.

## Further reading

- RFC 4648, The Base16, Base32, and Base64 Data Encodings (Simon Josefsson,
  2006), §3.5 on canonical encoding; RFC 2045, MIME Part One (1996), §6.7
  and §6.8; RFC 7468, Textual Encodings of PKIX, PKCS, and CMS Structures
  (2015); RFC 989, the first printable encoding (1987).
- RFC 3986, URI Generic Syntax (2005); RFC 7617, HTTP Basic authentication
  (2015); RFC 7515, JSON Web Signature (2015).
- [BIP 173: Base32 address format for native v0-16 witness outputs](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki)
  (Pieter Wuille and Greg Maxwell, 2017) and
  [BIP 350: Bech32m format for v1+ witness addresses](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki)
  (Pieter Wuille, 2020); Bitcoin Core `src/base58.cpp`.
- Tor Project, Rendezvous Specification version 3 (onion addresses).
- RFC 3629, UTF-8 (François Yergeau, 2003); Rob Pike, "UTF-8 history" (2003);
  Unicode UAX #15 (Normalization Forms), UTS #39 (Security Mechanisms) and
  UTR #36 (Security Considerations).
- RFC 8264 (PRECIS framework) and RFC 8265 (usernames and passwords), Peter
  Saint-Andre and Alexey Melnikov, 2017; RFC 3454, stringprep (2002).
- Spotify Engineering, "Creative usernames and Spotify account hijacking"
  (June 2013).
- Evgeniy Gabrilovich and Alex Gontmakher, "The Homograph Attack",
  *Communications of the ACM* 45 (2002); Xudong Zheng, "Phishing with
  Unicode Domains" (April 2017).
- Nicholas Boucher and Ross Anderson, "Trojan Source: Invisible
  Vulnerabilities" (2021; USENIX Security 2023).
- Microsoft Security Bulletins MS00-078 (October 2000) and MS01-026 (May 2001).
- Robert Merget et al., "Raccoon Attack: Finding and Exploiting
  Most-Significant-Bit-Oracles in TLS-DH(E)", USENIX Security 2021.
- Florian Sieck, Sebastian Berndt, Jan Wichelmann and Thomas Eisenbarth,
  "Util::Lookup: Exploiting Key Decoding in Cryptographic Libraries", ACM CCS
  2021.
- Niels Ferguson and Bruce Schneier, *Practical Cryptography* (Wiley, 2003),
  the Horton principle.
- Colin Percival, "AWS signature version 1 is insecure" (December 2008).
- Jeff Forristal, "Android: One Root to Own Them All", Black Hat USA 2013
  (CVE-2013-4787).
- Juraj Somorovsky et al., "On Breaking SAML: Be Whoever You Want to Be",
  USENIX Security 2012; Michael McIntosh and Paula Austel, "XML Signature
  Element Wrapping Attacks and Countermeasures" (2005).
- Jake Miller (Bishop Fox), "An Exploration of JSON Interoperability
  Vulnerabilities" (2021); RFC 8259, JSON (2017); RFC 8785, JSON
  Canonicalization Scheme (2020); RFC 8949, CBOR (2020), §4.2.
- Okta, security advisory on AD/LDAP delegated authentication and bcrypt
  cache keys (1 November 2024).
- NIST SP 800-185, SHA-3 Derived Functions: cSHAKE, KMAC, TupleHash and
  ParallelHash (2016), with NIST's TupleHash sample values; FIPS 202, SHA-3
  (2015).
- Danny Cohen, "On Holy Wars and a Plea for Peace", IEN 137 (1980).
- Reference pages: [KMAC, TupleHash and ParallelHash](../../06-mac/KMAC.md),
  [JWT](../../protocols/JWT.md), [TOTP](../../protocols/TOTP.md),
  [Bitcoin](../../protocols/Bitcoin.md).
