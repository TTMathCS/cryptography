# 8. Modes of Operation

*AES encrypts exactly 16 bytes. Real data is a 3-byte answer, a 4 GB film, a disk
sector, a key, a 16-digit card number. A **mode of operation** says how to use a
block cipher on all of these, and the mode, far more than the cipher, decides
whether the result is safe. This chapter starts from the obvious mode and the
picture that shows what is wrong with it, builds CBC and CTR, then breaks CBC
twice, once by flipping bits and once with nothing but the receiver's complaints
about padding. It ends with three modes built for special jobs (disks, keys and
fixed formats) and with the lesson that leads into
[Chapter 10](10-Message-Authentication.md): hiding data is not enough.*

!!! abstract "In this chapter"
    **You will learn:**

    - why ECB leaks patterns, and what a secure mode must achieve instead;
    - how CBC and CTR work, with padding, IVs and nonces, and the rules for each;
    - how bit flipping and the padding oracle attack break CBC without the key;
    - how XTS encrypts disk sectors, how AES Key Wrap protects keys, and how
      FF1 encrypts a card number into another card number;
    - why every mode in this chapter needs a MAC, and why TLS 1.3 dropped them
      all for authenticated encryption.

    **You need:** [Chapter 7](07-AES.md) (AES as a block cipher),
    [Chapter 5](05-Stream-Ciphers.md) (keystreams and nonce reuse), and the
    birthday bound from [Chapter 4](04-Randomness-and-Perfect-Secrecy.md).

    **Levels:** §8.1 to §8.3 are for beginners, §8.4 to §8.10 are intermediate,
    §8.11 is expert.

## 8.1 The problem: one block to many

When the US published DES in 1977, it was a cipher for one 64-bit block. Banks
and government agencies needed to encrypt files, terminal sessions and wire
transfers, so in December 1980 the National Bureau of Standards published
FIPS 81, *DES Modes of Operation*, with four ways to do it: ECB, CBC, CFB and OFB.
The same four, plus counter mode (CTR), which Whitfield Diffie and Martin Hellman
had suggested in 1979, were carried over to AES in NIST SP 800-38A in 2001. Later
parts of the SP 800-38 series added modes for authentication, disks, key wrapping
and formatted data, several of which appear in this chapter.

The simplest idea is the one everybody tries first: cut the message into 16-byte
blocks and encrypt each one with the key. That is **ECB**, electronic codebook
mode, and it is the right place to start, because seeing exactly why it fails
tells you what every other mode must do.

All the code in this chapter uses the AES of [Chapter 7](07-AES.md), packed into
two functions `E(key, block)` and `D(key, block)` that compute each key's round
keys once. Open the box to see it, and run it before the other examples.

??? example "The AES used in this chapter's code"

    ```python
    from functools import lru_cache

    def xtime(a):
        a <<= 1
        return a ^ 0x11b if a & 0x100 else a

    def gmul(a, b):
        r = 0
        while b:
            if b & 1:
                r ^= a
            a, b = xtime(a), b >> 1
        return r

    def affine(b):
        r = 0x63
        for s in range(5):
            r ^= (b << s | b >> (8 - s)) & 0xff
        return r

    SBOX = [affine(next((y for y in range(1, 256) if gmul(a, y) == 1), 0)) for a in range(256)]
    INV = [SBOX.index(i) for i in range(256)]
    MUL = {m: [gmul(m, x) for x in range(256)] for m in (1, 2, 3, 9, 11, 13, 14)}

    @lru_cache(maxsize=None)
    def expand(key):                        # the round keys, computed once per key
        nk = len(key) // 4
        w = [list(key[4 * i:4 * i + 4]) for i in range(nk)]
        rcon = 1
        for i in range(nk, 4 * (nk + 7)):
            t = w[i - 1][:]
            if i % nk == 0:
                t = [SBOX[b] for b in t[1:] + t[:1]]
                t[0] ^= rcon
                rcon = xtime(rcon)
            elif nk > 6 and i % nk == 4:
                t = [SBOX[b] for b in t]
            w.append([a ^ b for a, b in zip(w[i - nk], t)])
        return [sum(w[4 * r:4 * r + 4], []) for r in range(nk + 7)]

    def mix(s, m):                          # MixColumns with matrix row m
        t = [MUL[x] for x in m]
        return [t[(-r) % 4][s[c]] ^ t[(1 - r) % 4][s[c + 1]] ^ t[(2 - r) % 4][s[c + 2]] ^ t[(3 - r) % 4][s[c + 3]]
                for c in range(0, 16, 4) for r in range(4)]

    def E(key, block):                      # AES encryption of one 16-byte block
        ks = expand(key)
        s = [a ^ b for a, b in zip(block, ks[0])]
        for r in range(1, len(ks)):
            s = [SBOX[s[(i + 4 * (i % 4)) % 16]] for i in range(16)]    # SubBytes and ShiftRows
            if r < len(ks) - 1:
                s = mix(s, (2, 3, 1, 1))
            s = [a ^ b for a, b in zip(s, ks[r])]
        return bytes(s)

    def D(key, block):                      # AES decryption of one 16-byte block
        ks = expand(key)
        s = list(block)
        for r in range(len(ks) - 1, 0, -1):
            s = [a ^ b for a, b in zip(s, ks[r])]
            if r < len(ks) - 1:
                s = mix(s, (14, 11, 13, 9))
            s = [INV[s[(i - 4 * (i % 4)) % 16]] for i in range(16)]    # undo ShiftRows and SubBytes
        return bytes(a ^ b for a, b in zip(s, ks[0]))

    def xor(a, b):
        return bytes(x ^ y for x, y in zip(a, b))

    print(E(bytes(range(16)), bytes.fromhex("00112233445566778899aabbccddeeff")).hex())
    # 69c4e0d86a7b0430d8cdb78070b4c55a, as in FIPS 197
    ```

## 8.2 ECB and the penguin

ECB encrypts each block on its own:

$$
C_i = E_K(P_i), \qquad P_i = D_K(C_i).
$$

It is simple, parallel, and needs nothing but the key. Its flaw is visible to the
naked eye. AES is a permutation, so for a fixed key, **equal plaintext blocks give
equal ciphertext blocks**. Whatever repeats in the data repeats in the ciphertext.

The famous demonstration is the "ECB penguin": a bitmap of Tux, the Linux mascot,
encrypted in ECB. Each run of same-colored pixels is a run of equal blocks, so
the encrypted image is a recolored penguin. Here is the same experiment in text.
Each character of a small picture becomes one 16-byte block, the picture is
encrypted, and each ciphertext block is drawn as a character chosen by its first
byte:

```python
picture = [
    "                    ",
    "       ######       ",
    "     ##########     ",
    "    ###  ##  ###    ",
    "    ###  ##  ###    ",
    "    ############    ",
    "   ####  ++  ####   ",
    "  ######++++######  ",
    "  ####........####  ",
    "  ###..........###  ",
    "   ##..........##   ",
    "     ++++  ++++     ",
]
key = b"YELLOW SUBMARINE"
data = b"".join(ch.encode() * 16 for row in picture for ch in row)   # one 16-byte block per pixel

def ecb(key, p):
    return b"".join(E(key, p[i:i + 16]) for i in range(0, len(p), 16))

def cbc(key, iv, p):                    # explained in section 8.4
    c = b""
    for i in range(0, len(p), 16):
        iv = E(key, xor(p[i:i + 16], iv))
        c += iv
    return c

def show(c):                            # draw each ciphertext block as one character
    marks = " .:-=+*%#@"
    for r in range(len(picture)):
        print("".join(marks[c[16 * (20 * r + i)] % 10] for i in range(20)))

show(ecb(key, data))
print()
show(cbc(key, bytes(16), data))
```

```
....................
.......######.......
.....##########.....
....###..##..###....
....###..##..###....
....############....
...####..--..####...
..######----######..
..####========####..
..###==========###..
...##==========##...
.....----..----.....

..*:-.@+@-. +=%%@#-.
#@==.*.%=+-@.@-%- #%
 @@++=  %.#..-*+-:=%
@ *@%  =+%%@ %#- *%=
+%# *#@=-%+#** %+ +%
 -#-*===#-*@@- =### 
=+%### %#+-#*%%.:@*@
=-= +%%%#+*#-* @* =.
-=-*=#=*+*=@:=  ::#+
-%==: %.::-@@+%#+:*.
# .%...=-:.+=:-#: :%
:#:--%:#%**.%.---#++
```

The ECB picture is perfectly encrypted, with AES and a secret key, and the penguin
is still there. Below it, CBC mode (§8.4) on the same data looks like noise.

ECB has hurt real systems. In 2013 Adobe lost a database of about 153 million
user records whose passwords were encrypted with triple DES in ECB mode. Nobody
needed the key: equal passwords had equal ciphertexts, so the most common
ciphertext was obviously "123456", and users' password hints, stored in the clear
next to them, gave away the rest. In 2020 researchers at the Citizen Lab found
that the Zoom video service encrypted meeting audio and video with AES in ECB mode
(CVE-2020-11500).

ECB is acceptable for exactly one job: encrypting a single block of random data,
such as one key. For anything else, never.

## 8.3 What a mode must achieve

ECB's failure points at the goal. An eavesdropper should learn nothing from the
ciphertexts beyond their lengths, even about which messages are equal, and even
if the eavesdropper can choose some of the plaintexts that get encrypted (as an
attacker who sends you email or makes your browser load a page can). This
requirement has a name, **IND-CPA**: ciphertexts are indistinguishable under a
chosen-plaintext attack. [Chapter 17](17-Defining-Security.md) states it exactly.

One consequence is unavoidable: **encryption must not be deterministic.**
Encrypting the same message twice under the same key must give different
ciphertexts, or the attacker could encrypt a guess and compare. So every secure
mode takes an extra input that changes every time:

- an **IV** (initialization vector), which must be unpredictable (CBC, CFB), or
- a **nonce**, which only has to be unique (CTR, OFB).

The IV or nonce is not secret. It travels with the ciphertext, usually in front
of it, which makes every ciphertext a little longer than its plaintext. That
detail matters later, for disks.

## 8.4 CBC: cipher block chaining

*Level: intermediate.* Four IBM engineers, William Ehrsam, Carl Meyer, John Smith
and Walter Tuchman, filed a patent on cipher block chaining in 1976, and it was
the most widely used mode for thirty years. Before encrypting each block, XOR it with
the previous ciphertext block; for the first block, XOR the IV:

$$
C_0 = \mathit{IV}, \qquad C_i = E_K(P_i \oplus C_{i-1}), \qquad P_i = D_K(C_i) \oplus C_{i-1}.
$$

Now each ciphertext block depends on its own plaintext block and on everything
before it, so equal blocks encrypt differently, and with a fresh random IV, so
does the same message sent twice.

**By hand, with real AES.** The 32-byte message `YELLOW SUBMARINEYELLOW SUBMARINE`
is the same block twice. With the all-zero AES-128 key and the IV `00 01 02 ... 0f`:

| Mode | Block 1 | Block 2 |
|---|---|---|
| ECB | `9f966ace ece847cd 3333bb0f d5306172` | `9f966ace ece847cd 3333bb0f d5306172` |
| CBC | `e73b6f01 735b3920 86885f75 3cd2eca6` | `7cb33a72 35464909 f9c9847c 0c7bd12d` |

In CBC, block 2 was encrypted as $E_K(P_2 \oplus C_1)$, and $C_1$ is
pseudorandom, so the repeat disappears. (Values computed with the code of this
chapter and checked against the `cryptography` library.)

<div class="mars-steps" markdown>

1. Split the message into 16-byte blocks and pad the last one.
2. XOR block 1 with a fresh random IV, then encrypt: that is $C_1$.
3. XOR block 2 with $C_1$, then encrypt: that is $C_2$.
4. Continue: each block is chained to all the blocks before it.
5. Send the IV and $C_1 C_2 \ldots$
6. To decrypt, decrypt $C_i$ and XOR with $C_{i-1}$. Every block can be decrypted on its own, in parallel; encryption can't be parallel.

</div>

### Padding

CBC encrypts whole blocks, so a message must be padded to a multiple of 16 bytes,
in a way the receiver can undo. The usual scheme, **PKCS#7**, adds $n$ bytes each
of value $n$, where $n$ is between 1 and 16. A 13-byte message gets `03 03 03`. A
message that already fills its last block gets a whole extra block of sixteen
`10`s, so that the receiver can always read the last byte and strip that many.
Remember the receiver's check, "is the padding valid?": it is the weak point in
§8.6.

### The IV must be unpredictable

A random IV is not just a nice-to-have. If an attacker can predict the IV of the
next message, it can choose that message so that $P \oplus \mathit{IV}$ equals the
input of an earlier block it wants to test, and see whether the ciphertexts match.
SSL 3.0 and TLS 1.0 used the last ciphertext block of one record as the IV of the
next, which is predictable. Cryptographers had described the danger years
earlier, and in 2011 Thai Duong and Juliano Rizzo's **BEAST** attack used it to recover browser
cookies from HTTPS. TLS 1.1 (2006) had already moved to a fresh IV per record, but
most servers still spoke TLS 1.0 when BEAST appeared.

## 8.5 CTR: a block cipher as a stream cipher

*Level: intermediate.* Counter mode does not encrypt the message with the block
cipher at all. It encrypts a **counter** and uses the result as a keystream,
exactly like the stream ciphers of [Chapter 5](05-Stream-Ciphers.md):

$$
C_i = P_i \oplus E_K(\mathit{nonce} \,\Vert\, i).
$$

Here the counter block is an 8-byte nonce followed by an 8-byte block number (one
common layout; others split the 16 bytes differently). Decryption is the same
operation.

```python
def ctr(key, nonce, data):              # nonce: 8 bytes; the block number fills the other 8
    out = b""
    for i in range(0, len(data), 16):
        out += xor(data[i:i + 16], E(key, nonce + (i // 16).to_bytes(8, "big")))
    return out

key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
nonce = bytes.fromhex("f0f1f2f3f4f5f6f7")
c = ctr(key, nonce, b"counter mode needs no padding at all")
print(len(c), ctr(key, nonce, c))       # 36 b'counter mode needs no padding at all'
```

CTR has a lot going for it:

- **No padding.** The last keystream block is simply cut short; the ciphertext is
  exactly as long as the plaintext (plus the nonce).
- **Parallel and random access** in both directions. Block 1,000,000 can be
  encrypted or decrypted without touching the others, and the keystream can be
  computed before the data arrives.
- **Only the forward cipher** is needed, so hardware can leave out decryption.
- **A clean proof.** If AES is a pseudorandom permutation, CTR is IND-CPA secure up
  to the birthday bound (§8.11).

And it inherits the one rule of stream ciphers: a counter block must **never**
repeat under one key, across all messages. If it does, two plaintexts are XORed
with the same keystream and $C \oplus C' = P \oplus P'$, the two-time pad of
[§5.8](05-Stream-Ciphers.md#58-break-it-nonce-reuse-and-malleability). With
random 64-bit nonces a repeat is expected after about $2^{32}$ messages. The KRACK
attack of 2017 forced exactly this repeat in WPA2, whose CCMP mode is CTR with a
MAC.

CTR is the encryption inside AES-GCM and AES-CCM, the authenticated modes of
[Chapter 10](10-Message-Authentication.md), and so it encrypts most of the
world's TLS traffic.

### CFB and OFB, briefly

The two remaining 1980 modes are rarely chosen today but still met in old
formats.

- **CFB** (cipher feedback): $C_i = P_i \oplus E_K(C_{i-1})$. The previous
  ciphertext is encrypted to make the next keystream block. It needs an
  unpredictable IV, decrypts in parallel, and resynchronizes by itself after a
  lost segment. OpenPGP uses a variant. The 8-bit version, CFB8, was at the heart
  of **Zerologon** (2020): Microsoft's Netlogon used AES-CFB8 with an all-zero IV,
  and for one key in 256 an all-zero plaintext encrypts to all zeros, so an
  attacker sending zeros logged in to a domain controller after about 256 tries.
- **OFB** (output feedback): encrypt the IV, then encrypt that, and so on, and use
  the chain as keystream. It is a stream cipher whose keystream does not depend on
  the data; a nonce must never repeat, and it can't be parallelized.

| Mode | Needs | Parallel encryption | Parallel decryption | Padding | A flipped ciphertext bit |
|---|---|---|---|---|---|
| ECB | nothing | yes | yes | yes | garbles its block |
| CBC | unpredictable IV | no | yes | yes | garbles its block, flips that bit in the next |
| CFB | unpredictable IV | no | yes | no | flips that bit, garbles the next block |
| OFB | unique nonce | no | no | no | flips that bit |
| CTR | unique nonce | yes | yes | no | flips that bit |

## 8.6 Break it: changing and reading CBC without the key

*Level: intermediate.* Every mode so far hides data. None of them notices if the
data was changed. The last column of the table above is the problem, and it turns
out to be worse than "the attacker can make garbage".

### Bit flipping

In CBC decryption, $P_i = D_K(C_i) \oplus C_{i-1}$. Flip a bit of $C_{i-1}$ and
the same bit of $P_i$ flips, exactly; block $i - 1$ turns to garbage. For the first
block, $C_0$ is the IV, and flipping IV bits changes the first plaintext block with
no garbage at all. An attacker who knows what a block says can make it say
something else of the same length:

```python
def pad(m):                             # PKCS#7: add n bytes of value n, 1 <= n <= 16
    n = 16 - len(m) % 16
    return m + bytes([n]) * n

def unpad(p):
    n = p[-1]
    if not 1 <= n <= 16 or p[-n:] != bytes([n]) * n:
        raise ValueError("bad padding")
    return p[:-n]

def cbc_decrypt(key, iv, c):
    p = b""
    for i in range(0, len(c), 16):
        p += xor(D(key, c[i:i + 16]), iv)
        iv = c[i:i + 16]
    return p

key = bytes.fromhex("8d2e60365f17c7df1040d7501b4a7b5a")   # the server's secret key
iv = bytes.fromhex("1f2e3d4c5b6a79881f2e3d4c5b6a7988")
c = cbc(key, iv, pad(b"role=user;id=007"))
print(len(c), unpad(cbc_decrypt(key, iv, c)))            # 32 b'role=user;id=007'

forged_iv = xor(iv, xor(b"role=user;id=007", b"role=root;id=007"))   # flip bits in the IV
print(unpad(cbc_decrypt(key, forged_iv, c)))             # b'role=root;id=007'
```

The server decrypts a valid-looking message that it never encrypted.

### The padding oracle attack

In 2002 Serge Vaudenay, at EPFL in Switzerland, showed something more alarming:
an attacker can **read** CBC ciphertext if the receiver merely reveals whether
the padding was valid, by a different error message, a different response time,
or anything else. Such a receiver is called a **padding oracle**.

The idea uses bit flipping as a probe. To decrypt a block $C$, the attacker sends
the two-block message $(F, C)$, where $F$ is a block it controls, posing as the
IV. The receiver computes $P' = D_K(C) \oplus F$ and checks the padding of $P'$.

- Try all 256 values of the last byte of $F$. For one of them (usually exactly
  one) the last byte of $P'$ comes out as `01`, which is valid padding. Then
  $D_K(C)$ ends in that byte XOR `01`.
- Now set the last byte of $F$ to make $P'$ end in `02`, and try all values of
  the second-to-last byte until the padding `02 02` is valid. That gives the next
  byte of $D_K(C)$.
- Continue to `10 10 ... 10`. After at most $16 \times 256 = 4096$ tries, the
  attacker knows all of $D_K(C)$, and XORing it with the real previous block gives
  the plaintext.

One subtlety: in the first step, a lucky $P'$ ending in `02 02` also passes. The
code checks for that by changing the second-to-last byte and asking again.

```python
queries = 0

def oracle(iv, c):                      # the server: decrypts, and says whether the padding was good
    global queries
    queries += 1
    try:
        unpad(cbc_decrypt(key, iv, c))
        return True
    except ValueError:
        return False

def attack(prev, block):                # recover one plaintext block from the oracle alone
    mid = bytearray(16)                 # becomes D(key, block), last byte first
    for i in range(15, -1, -1):
        n = 16 - i                      # aim for n padding bytes of value n
        f = bytearray(m ^ n for m in mid)
        for g in range(256):
            f[i] = g
            if oracle(bytes(f), block):
                if i == 15:             # rule out a lucky ...02 02 ending
                    f[14] ^= 1
                    if not oracle(bytes(f), block):
                        continue
                break
        mid[i] = g ^ n
    return xor(mid, prev)

secret = cbc(key, iv, pad(b"PIN=4417;user=jo;admin=no"))
blocks = [iv] + [secret[i:i + 16] for i in range(0, len(secret), 16)]
print(b"".join(attack(blocks[j - 1], blocks[j]) for j in range(1, len(blocks))), queries)
# b'PIN=4417;user=jo;admin=no\x07\x07\x07\x07\x07\x07\x07' 3484
```

Two blocks, 3,484 questions, no key. The attack keeps returning in new forms:

- **ASP.NET (2010).** Duong and Rizzo used error pages as the oracle to decrypt and
  forge the encrypted state of web applications built on Microsoft's framework,
  including downloading files from the server.
- **Lucky Thirteen (2013).** Nadhem AlFardan and Kenneth Paterson showed that TLS's
  CBC suites still leaked padding validity through tiny timing differences, even
  though TLS sends one alert for every error. (The 13 is the number of header
  bytes in the TLS MAC.)
- **POODLE (2014).** Bodo Möller, Thai Duong and Krzysztof Kotowicz at Google found
  that SSL 3.0 checks only the last padding byte; after forcing a browser down to
  SSL 3.0, an attacker read one cookie byte per 256 requests. SSL 3.0 was
  deprecated by RFC 7568 in 2015.

### The lesson

Both attacks feed the receiver a ciphertext it did not produce and watch what
happens. The cure is to make sure the receiver **never processes a forged
ciphertext at all**: compute a MAC over the IV and ciphertext with a separate key,
and check it first, before any decryption or padding check. This order, called
**encrypt-then-MAC**, was proved secure in general by Mihir Bellare and Chanathip
Namprempre in 2000; SSL and TLS up to 1.2 had used MAC-then-encrypt, and that is
why the padding oracles kept coming back. Better still is a single algorithm that
does both jobs: **authenticated encryption**. TLS 1.3 (RFC 8446, 2018) removed
CBC entirely and allows only authenticated modes. Those are the subject of
[Chapter 10](10-Message-Authentication.md).

## 8.7 Disks: XTS

*Level: intermediate.* A disk reads and writes fixed sectors, typically 512 or
4,096 bytes, by number. Disk encryption has to fit that exactly: a sector must
encrypt to the same size, any sector must decrypt on its own, and there is
nowhere to keep a fresh IV or a tag for each write. CBC with a random IV doesn't
fit, and ECB leaks patterns. What's left is a **tweakable block cipher**: a block
cipher with a third, public input, the **tweak**, that selects a different
permutation without changing the key. The sector number and the block's position
in the sector are the tweak.

Moses Liskov, Ronald Rivest and David Wagner defined tweakable block ciphers in
2002, and in 2004 Phillip Rogaway gave an efficient construction, **XEX**: mask
the block with a value derived from the tweak, encrypt, and mask again,

$$
C = E_{K}(P \oplus \Delta) \oplus \Delta .
$$

The IEEE standard for storage encryption, IEEE 1619-2007, built **XTS-AES** on it
("XEX-based tweaked codebook mode with ciphertext stealing"), and NIST approved it
in SP 800-38E (2010). For block $j$ of sector $i$, with two AES keys $K_1$ and
$K_2$:

$$
T_{i,j} = E_{K_2}(i) \otimes \alpha^{j}, \qquad C = E_{K_1}(P \oplus T_{i,j}) \oplus T_{i,j}.
$$

Multiplying by $\alpha$ is multiplication by $x$ in $\mathrm{GF}(2^{128})$, the
128-bit cousin of the xtime of [Chapter 7](07-AES.md): shift left one bit, and if a
bit falls off, XOR `87` into the low byte. (A short final block uses
**ciphertext stealing**, borrowing bytes from the previous block so nothing grows;
sectors are whole blocks, so disks rarely need it.)

```python
def double(t):                          # multiply by x in GF(2^128), in IEEE 1619's byte order
    n = int.from_bytes(t, "little") << 1
    if n >> 128:
        n ^= (1 << 128) | 0x87
    return n.to_bytes(16, "little")

def xts(k1, k2, sector, data):          # whole 16-byte blocks only (no ciphertext stealing)
    t = E(k2, sector.to_bytes(16, "little"))
    out = b""
    for i in range(0, len(data), 16):
        out += xor(E(k1, xor(data[i:i + 16], t)), t)
        t = double(t)
    return out

k1, k2 = bytes(range(16)), bytes(range(16, 32))
old = bytes(4096)                       # a 4 KiB sector of zeros
new = old[:1000] + b"!" + old[1001:]    # change byte 1000

a = xts(k1, k2, 7, old)
blocks = lambda s: [s[i:i + 16] for i in range(0, len(s), 16)]
print(len(set(blocks(a))))                                   # 256: equal blocks don't show
print(a == xts(k1, k2, 7, old), a == xts(k1, k2, 8, old))    # True False
b = xts(k1, k2, 7, new)
print([i for i, (x, y) in enumerate(zip(blocks(a), blocks(b))) if x != y])   # [62]
```

This matches the XTS in the `cryptography` library. The output shows both what
XTS gives and what it can't:

- 256 zero blocks give 256 different ciphertext blocks, and the same data in
  sector 8 looks unrelated to sector 7. No penguin.
- But it is still deterministic: writing the same data to the same sector gives
  the same ciphertext, and changing one byte changes only one 16-byte block
  (number 62). Someone who sees the disk twice learns which blocks changed.
- There is no integrity: a changed or replayed block decrypts to garbage or old
  data without complaint.

XTS is meant for a stolen, powered-off laptop, and there it does its job. It is
the mode of BitLocker (since Windows 10), FileVault, Linux's LUKS
(`aes-xts-plain64`) and Android's file-based encryption. For phones without AES
instructions, Google's **Adiantum** (2018) encrypts the whole sector as one wide
block with ChaCha12, AES and a hash, so one changed byte changes the whole sector.
The attacks that worked against disk encryption went around the mode:
cold-boot attacks (2008) read keys from a laptop's memory after a reboot, and in
2018 Carlo Meijer and Bernard van Gastel showed that several self-encrypting SSDs,
which BitLocker trusted by default, could be unlocked without the password. Full
details: [Disk encryption](../05-modes-aead/Disk-Encryption.md).

## 8.8 Keys: AES Key Wrap

*Level: intermediate.* To store or send a key, you encrypt it under another key,
a **key-encryption key** (KEK). Keys are short and random, so the mode needs no
nonce, but it does need integrity: a damaged or forged wrapped key must be
refused, not loaded as a different key. NIST published the **AES Key Wrap**
specification in 2001, written up as RFC 3394 (2002) and approved in SP 800-38F
(2012) as KW.

The key is cut into 8-byte halves $R_1, \ldots, R_n$, and a register $A$ starts
as the constant `A6A6A6A6A6A6A6A6`. Six passes over the halves each encrypt
$A \,\Vert\, R_i$, keep the top half (XORed with a step counter) as the new $A$ and
the bottom half as the new $R_i$. The output is $A \,\Vert\, R_1 \ldots R_n$, 8
bytes longer than the key. Unwrapping runs the steps backwards and checks that $A$
came back as `A6A6...`, a 64-bit integrity check.

```python
A6 = bytes.fromhex("a6a6a6a6a6a6a6a6")

def wrap(kek, key):                     # RFC 3394, section 2.2.1
    n = len(key) // 8
    a, r = A6, [key[i:i + 8] for i in range(0, len(key), 8)]
    for j in range(6):
        for i in range(n):
            b = E(kek, a + r[i])
            a, r[i] = xor(b[:8], (n * j + i + 1).to_bytes(8, "big")), b[8:]
    return a + b"".join(r)

def unwrap(kek, c):                     # the same steps backwards, then the check
    n = len(c) // 8 - 1
    a, r = c[:8], [c[i:i + 8] for i in range(8, len(c), 8)]
    for j in range(5, -1, -1):
        for i in range(n - 1, -1, -1):
            b = D(kek, xor(a, (n * j + i + 1).to_bytes(8, "big")) + r[i])
            a, r[i] = b[:8], b[8:]
    if a != A6:
        raise ValueError("integrity check failed")
    return b"".join(r)

kek = bytes.fromhex("000102030405060708090a0b0c0d0e0f")   # RFC 3394, section 4.1
w = wrap(kek, bytes.fromhex("00112233445566778899aabbccddeeff"))
print(w.hex())                          # 1fa68b0a8112b447aef34bd8fb5a7b829d3e862371d2cfe5
print(unwrap(kek, w).hex())             # 00112233445566778899aabbccddeeff
try:
    unwrap(kek, w[:-1] + bytes([w[-1] ^ 1]))
except ValueError as e:
    print(e)                            # integrity check failed
```

The output matches the RFC's test vector. One flipped bit anywhere and the
check fails, because every output bit depends on every input bit after six
passes. Key Wrap with Padding (KWP, RFC 5649) handles keys whose length is not a
multiple of 8 bytes, such as RSA private keys. You meet these modes in hardware
security modules, PKCS#11 tokens, cloud key managers and JSON Web Encryption
(`A128KW`). Phillip Rogaway and Thomas Shrimpton named the goal **deterministic
authenticated encryption** in 2006 and gave a mode with a proof, SIV (RFC 5297),
which a new design can use instead. Full details:
[Key wrap](../05-modes-aead/Key-Wrap.md).

## 8.9 Fixed formats: format-preserving encryption

*Level: intermediate.* AES turns 16 bytes into 16 random-looking bytes. A
database column that holds a 16-digit card number can't store that. Banks wanted
to encrypt card numbers and national ID numbers inside old systems without
changing every program that reads them, so they asked for **format-preserving
encryption** (FPE): nine digits in, nine digits out.

The answer is the Feistel network of [Chapter 6](06-Block-Ciphers.md), with
**addition modulo $10^m$** instead of XOR, and AES inside the round function.
NIST SP 800-38G (2016) approved two such methods. **FF1** is FFX by Mihir Bellare,
Phillip Rogaway and Terence Spies (2010). Split the digit string into halves
$A$ and $B$; each of ten rounds computes an AES-based MAC of $B$, the round number,
the length and a public **tweak**, reads it as a number $y$, and sets
$A \leftarrow (A + y) \bmod 10^m$, then swaps the halves.

```python
def prf(k, x):                          # CBC-MAC with AES over whole 16-byte blocks
    y = bytes(16)
    for i in range(0, len(x), 16):
        y = E(k, xor(y, x[i:i + 16]))
    return y

def ff1(k, t, x, dec=False):            # NIST SP 800-38G FF1, decimal digits only
    n = len(x)
    u, v = n // 2, n - n // 2
    a, b = x[:u], x[u:]
    nb = ((10 ** v - 1).bit_length() + 7) // 8
    d = 4 * ((nb + 3) // 4) + 4
    p = bytes([1, 2, 1, 0, 0, 10, 10, u % 256]) + n.to_bytes(4, "big") + len(t).to_bytes(4, "big")
    for i in (range(9, -1, -1) if dec else range(10)):
        m = v if i % 2 else u
        q = t + bytes((-len(t) - nb - 1) % 16) + bytes([i]) + int(a if dec else b).to_bytes(nb, "big")
        y = int.from_bytes(prf(k, p + q)[:d], "big")
        if dec:
            a, b = str((int(b) - y) % 10 ** m).zfill(m), a
        else:
            a, b = b, str((int(a) + y) % 10 ** m).zfill(m)
    return a + b

key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
print(ff1(key, b"", "0123456789"))     # 2433477484, NIST's FF1 sample 1

card = "4111111111111111"               # encrypt the middle six digits;
head, mid, tail = card[:6], card[6:12], card[12:]
tweak = (head + tail).encode()          # the visible digits are the tweak
enc = head + ff1(key, tweak, mid) + tail
print(enc, head + ff1(key, tweak, enc[6:12], dec=True) + tail == card)   # 4111116742331111 True
```

The first line reproduces NIST's published example. The second is the use the
standard describes: the bank identifier and the last four digits stay readable,
the middle six are encrypted, and the result still looks like a card number.

FPE's weak spot is the small domain. Six digits is only a million values, and
Feistel networks over small domains leak through the many encryptions an
attacker can collect. The second method, **FF3**, fell in 2017 to F. Betül Durak
and Serge Vaudenay; NIST patched it as FF3-1, and Tim Beyne broke that in 2021.
NIST's revision of SP 800-38G keeps only FF1 and requires at least a million
possible inputs. Like XTS and Key Wrap, FPE is deterministic: equal card numbers
encrypt alike under one tweak. Full details:
[Format-preserving encryption](../05-modes-aead/Format-Preserving.md).

## 8.10 In the real world

*Level: intermediate.*

| Mode | Standard | Use it for | Status |
|---|---|---|---|
| ECB | SP 800-38A | one block of random data | never for messages |
| CBC | SP 800-38A | old protocols and files only | legacy; needs encrypt-then-MAC |
| CFB, OFB | SP 800-38A | old formats (OpenPGP's CFB variant) | legacy |
| CTR | SP 800-38A | inside GCM, CCM and other constructions | fine with unique nonces, but add a MAC |
| XTS | SP 800-38E, IEEE 1619 | disk sectors | recommended for storage |
| KW, KWP | SP 800-38F, RFC 3394, RFC 5649 | wrapping keys | acceptable; SIV for new designs |
| FF1 | SP 800-38G | fixed-format fields | acceptable on at least $10^6$ values |
| GCM, CCM | SP 800-38D, SP 800-38C | everything else | recommended ([Chapter 10](10-Message-Authentication.md)) |

**What to use.** For messages, files and network traffic: an authenticated mode,
AES-GCM or ChaCha20-Poly1305, through a tested library. For disks: XTS, which your
operating system already uses. The modes of this chapter alone are building
blocks.

**How long a key lasts.** Every mode here wears out at the birthday bound of the
block size. With AES's 128-bit block, that is $2^{64}$ blocks, and standards
recommend changing keys long before (for GCM, NIST limits one key to $2^{32}$
messages with random nonces). With 64-bit blocks the bound is about 32 GiB,
which is how Sweet32 ([Chapter 6](06-Block-Ciphers.md)) read cookies from triple DES.

Full details: [Classic modes](../05-modes-aead/Classic-Modes.md) and
[AEAD](../05-modes-aead/AEAD.md).

## 8.11 Going deeper

*Level: expert.*

**ECB is not IND-CPA, in one line.** The attacker submits $m_0 = 0^{32}$ (two equal
blocks) and $m_1$ (two different blocks) and gets back the encryption of one of
them. Under ECB, the two halves of the ciphertext are equal exactly when it was
$m_0$. Advantage 1. The same attack works against any deterministic scheme, which
is the formal reason every mode needs an IV, a nonce or a tweak.

**The CTR proof.** Suppose $E_K$ were a truly random **function** $f$ from 128-bit
blocks to 128-bit blocks. Then as long as no counter value repeats, every keystream
block is independent and uniform, the ciphertext is a one-time pad, and the
attacker's advantage is 0. A real block cipher is a random-looking
**permutation**, not a function. The **PRP/PRF switching lemma** says that an
attacker making $q$ queries can tell a random permutation from a random function
with advantage at most $q^2 / 2^{129}$, the chance of seeing a collision that a
function would produce and a permutation never does. So for CTR with $\sigma$
blocks encrypted in total,

$$
\mathrm{Adv}^{\mathrm{ind\text{-}cpa}}_{\mathrm{CTR}} \le \mathrm{Adv}^{\mathrm{prp}}_{E} + \frac{\sigma^2}{2^{129}} .
$$

Bellare, Desai, Jokipii and Rogaway proved this, and a similar bound of about
$\sigma^2 / 2^{128}$ for CBC with random IVs, in 1997. The $\sigma^2$ term is the
birthday bound in exact form: at $\sigma = 2^{48}$ blocks (4 PiB) it is $2^{-33}$,
comfortable; at $2^{64}$ blocks the proof says nothing.

**Why CPA security is not enough.** All the attacks of §8.6 are
**chosen-ciphertext** attacks: the attacker submits ciphertexts and learns
something from the receiver's reaction. IND-CPA says nothing about them, and CBC,
CTR, CFB and OFB are all trivially insecure under IND-CCA, since any of them can
be bit-flipped. Bellare and Namprempre (2000) showed that encrypt-then-MAC with a
strongly unforgeable MAC turns any IND-CPA mode into an IND-CCA one, and that the
other two orders do not in general. Hugo Krawczyk (2001) showed that MAC-then-encrypt
happens to be safe with CTR or with CBC under particular conditions that TLS's
padding did not meet.

**Tweakable block ciphers in theory.** Liskov, Rivest and Wagner (2002) gave the
definition: a family $\tilde E_K(T, \cdot)$ of permutations, one for each tweak,
indistinguishable from independent random permutations even when the attacker
picks the tweaks. Rogaway's XEX meets it with masks $E_K(N) \otimes \alpha^j$, as long as the
tweaks stay in the range his proof allows. XTS computes the mask with a second
key (XEX uses one), so its key is twice as long as its security level:
XTS-AES-128 takes 256 key bits and gives 128-bit security.

**The order of a mode's limits.** SP 800-38E caps an XTS data unit at $2^{20}$
blocks; KW's check gives exactly $2^{-64}$ forgery probability per attempt; and
the known attacks on FF1 and FF3 need fewer encryptions the smaller the domain,
which is why NIST raised the minimum domain. Each mode's numbers come from the same few arguments:
collisions among block-cipher inputs, and the number of queries an attacker gets.

??? info "How ciphertext stealing works"

    For a message whose last block $P_n$ is short, encrypt block $n - 1$ normally
    to get $C'$. Take the first bytes of $C'$, as many as $P_n$ has, as the final
    ciphertext block $C_n$. Pad $P_n$ with the remaining bytes of $C'$ to a full
    block and encrypt it as block $n - 1$. The ciphertext is exactly as long as the
    plaintext, and decryption reverses the steps, recovering the stolen bytes from
    the decryption of block $n - 1$. SP 800-38A's addendum defines three variants
    for CBC, and XTS uses the same trick.

## Check yourself

??? question "1. A 13-byte message is padded with PKCS#7 for a 16-byte block. What bytes are added? And for a 32-byte message?"

    `03 03 03`. A 32-byte message already fills two blocks, so a whole block of
    sixteen `10` bytes is added: 48 bytes in all.

??? question "2. In CBC, one ciphertext block is damaged in transit. Which plaintext blocks are affected on decryption?"

    Two: the block itself decrypts to garbage, and the next block gets the same
    bits flipped as were damaged, since $P_{i+1} = D_K(C_{i+1}) \oplus C_i$. Every
    other block is fine.

??? question "3. Why can CBC decryption run in parallel but CBC encryption can't?"

    Encrypting block $i$ needs $C_{i-1}$, which is only known after block $i - 1$
    is encrypted. Decrypting needs $C_i$ and $C_{i-1}$, which are both in the
    ciphertext already.

??? question "4. A system encrypts with CTR mode and uses the message number, starting from 1 for every new session, as the nonce, with one long-term key. What goes wrong?"

    Every session reuses the nonces 1, 2, 3, ... under the same key, so message 1
    of every session has the same keystream. XORing two such ciphertexts gives the
    XOR of their plaintexts. The nonce must be unique for the key, across all
    sessions.

??? question "5. Why does flipping bits in the IV change the first CBC plaintext block cleanly, while flipping bits in $C_1$ garbles block 1?"

    $P_1 = D_K(C_1) \oplus \mathit{IV}$: the IV is only XORed in, so a flip passes
    straight through. Changing $C_1$ changes the input of $D_K$, and the block
    cipher turns any change into a random-looking block.

??? question "6. The padding oracle attack on one block needs at most how many queries, and on average about how many?"

    At most $16 \times 256 = 4096$ (plus a few checks). On average the right byte is
    found halfway through, about $16 \times 128 = 2048$ per block, consistent with
    3,484 for two blocks.

??? question "7. Why can't disk encryption use AES-GCM directly?"

    GCM needs a unique nonce per encryption and adds a 16-byte tag, so a sector
    would grow and would need somewhere to store a nonce that changes on every
    write. A sector has to stay exactly its size and be addressable by number.

??? question "8. An attacker can read an XTS-encrypted disk image every night. What can it learn, and what can it not?"

    It learns which 16-byte blocks changed between nights, and whether a block went
    back to an earlier value. It can't read the data, and equal blocks in different
    places don't look equal. It can also replace blocks with older versions
    without being detected.

??? question "9. FF1 encrypts four-digit PINs with no tweak. Why is that a bad idea, even if FF1 itself were perfect?"

    There are only 10,000 PINs, and FF1 is deterministic. An attacker who can get
    encryptions of chosen PINs builds the whole table in 10,000 queries, and even
    without that, equal PINs encrypt alike and frequency analysis applies. That is
    why NIST requires domains of at least a million values.

??? question "10. Use the CTR bound of §8.11 to find how many blocks one AES key can encrypt before the bound reaches $2^{-32}$."

    $\sigma^2 / 2^{129} = 2^{-32}$ gives $\sigma^2 = 2^{97}$, $\sigma = 2^{48.5}$
    blocks, about 6 PiB. In practice keys are changed far sooner.

## What you learned

- A mode turns a block cipher into a cipher for messages. ECB encrypts blocks
  independently and leaks every repeat, as the penguin shows.
- Secure encryption must be randomized: CBC needs an unpredictable IV, CTR a
  nonce that never repeats under the key.
- CTR makes a block cipher into a stream cipher: no padding, fully parallel, and
  catastrophic on nonce reuse. It is the encryption inside GCM.
- None of the classic modes detects tampering. Bit flipping changes CBC messages,
  and a padding oracle decrypts them in a few thousand queries; ASP.NET, Lucky
  Thirteen and POODLE were real cases.
- XTS encrypts disk sectors in place using tweaks, Key Wrap protects keys with a
  64-bit integrity check, and FF1 keeps formats; each is deterministic by design.
- The fix for tampering is a MAC checked before decryption, or better, an
  authenticated encryption mode, the subject of
  [Chapter 10](10-Message-Authentication.md).

**Next:** [Chapter 9](09-Hash-Functions.md) introduces hash functions, the other
building block that [Chapter 10](10-Message-Authentication.md) needs to make MACs.

## Further reading

- FIPS 81, DES Modes of Operation (1980, withdrawn 2005).
- NIST SP 800-38A, Recommendation for Block Cipher Modes of Operation (2001), and
  its addendum on ciphertext stealing (2010).
- Mihir Bellare, Anand Desai, Eron Jokipii and Phillip Rogaway, "A Concrete
  Security Treatment of Symmetric Encryption" (FOCS 1997).
- [Serge Vaudenay, "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002)](https://iacr.org/archive/eurocrypt2002/23320530/cbc02_e02d.pdf).
- Mihir Bellare and Chanathip Namprempre, "Authenticated Encryption: Relations
  among Notions and Analysis of the Generic Composition Paradigm" (ASIACRYPT 2000).
- Nadhem AlFardan and Kenneth Paterson, "Lucky Thirteen: Breaking the TLS and DTLS
  Record Protocols" (IEEE S&P 2013).
- Moses Liskov, Ronald Rivest and David Wagner, "Tweakable Block Ciphers" (CRYPTO
  2002); Phillip Rogaway, "Efficient Instantiations of Tweakable Blockciphers and
  Refinements to Modes OCB and PMAC" (ASIACRYPT 2004).
- NIST SP 800-38E (XTS-AES, 2010), SP 800-38F (key wrap, 2012), SP 800-38G
  (format-preserving encryption, 2016); RFC 3394 and RFC 5649.
- Paul Crowley and Eric Biggers, "Adiantum: length-preserving encryption for
  entry-level processors" (FSE 2019).
- Reference pages: [Classic modes](../05-modes-aead/Classic-Modes.md),
  [Disk encryption](../05-modes-aead/Disk-Encryption.md),
  [Key wrap](../05-modes-aead/Key-Wrap.md),
  [Format-preserving encryption](../05-modes-aead/Format-Preserving.md), and
  [AEAD](../05-modes-aead/AEAD.md).
