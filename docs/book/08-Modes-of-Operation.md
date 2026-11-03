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

Figure 8.1 shows where this chapter is going: forty-five years in which
the modes were standardized, used everywhere, and attacked, mostly at the point
where hiding data was mistaken for protecting it.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="Timeline of block cipher modes from the 1976 CBC patent to Zerologon in 2020" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="412" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" font-size="14" text-anchor="end" font-weight="bold">1976</text>
<circle cx="92" cy="22" r="3.5" fill="currentColor"/>
<text x="108" y="27" font-size="14" text-anchor="start">IBM engineers patent cipher block chaining</text>
<text x="78" y="53" font-size="14" text-anchor="end" font-weight="bold">1979</text>
<circle cx="92" cy="48" r="3.5" fill="currentColor"/>
<text x="108" y="53" font-size="14" text-anchor="start">Diffie and Hellman suggest counter mode</text>
<text x="78" y="79" font-size="14" text-anchor="end" font-weight="bold">1980</text>
<circle cx="92" cy="74" r="3.5" fill="currentColor"/>
<text x="108" y="79" font-size="14" text-anchor="start">FIPS 81: ECB, CBC, CFB, OFB for DES</text>
<text x="78" y="105" font-size="14" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="100" r="3.5" fill="currentColor"/>
<text x="108" y="105" font-size="14" text-anchor="start">SP 800-38A carries the modes (and CTR) to AES</text>
<text x="78" y="131" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2002</text>
<circle cx="92" cy="126" r="4.5" class="acc-fill"/>
<text x="108" y="131" font-size="14" text-anchor="start" class="acc-fill">Vaudenay's padding oracle; tweakable block ciphers</text>
<text x="78" y="157" font-size="14" text-anchor="end" font-weight="bold">2004</text>
<circle cx="92" cy="152" r="3.5" fill="currentColor"/>
<text x="108" y="157" font-size="14" text-anchor="start">Rogaway's XEX</text>
<text x="78" y="183" font-size="14" text-anchor="end" font-weight="bold">2007</text>
<circle cx="92" cy="178" r="3.5" fill="currentColor"/>
<text x="108" y="183" font-size="14" text-anchor="start">IEEE 1619: XTS-AES for disks</text>
<text x="78" y="209" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2010</text>
<circle cx="92" cy="204" r="4.5" class="acc-fill"/>
<text x="108" y="209" font-size="14" text-anchor="start" class="acc-fill">Padding oracle hits ASP.NET; FFX proposed</text>
<text x="78" y="235" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2011</text>
<circle cx="92" cy="230" r="4.5" class="acc-fill"/>
<text x="108" y="235" font-size="14" text-anchor="start" class="acc-fill">BEAST exploits predictable CBC IVs in TLS 1.0</text>
<text x="78" y="261" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2013</text>
<circle cx="92" cy="256" r="4.5" class="acc-fill"/>
<text x="108" y="261" font-size="14" text-anchor="start" class="acc-fill">Lucky Thirteen; Adobe's ECB password leak</text>
<text x="78" y="287" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2014</text>
<circle cx="92" cy="282" r="4.5" class="acc-fill"/>
<text x="108" y="287" font-size="14" text-anchor="start" class="acc-fill">POODLE ends SSL 3.0</text>
<text x="78" y="313" font-size="14" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="308" r="3.5" fill="currentColor"/>
<text x="108" y="313" font-size="14" text-anchor="start">SP 800-38G: format-preserving FF1 and FF3</text>
<text x="78" y="339" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2017</text>
<circle cx="92" cy="334" r="4.5" class="acc-fill"/>
<text x="108" y="339" font-size="14" text-anchor="start" class="acc-fill">FF3 broken (Durak, Vaudenay)</text>
<text x="78" y="365" font-size="14" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="360" r="3.5" fill="currentColor"/>
<text x="108" y="365" font-size="14" text-anchor="start">TLS 1.3 allows only authenticated encryption</text>
<text x="78" y="391" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2020</text>
<circle cx="92" cy="386" r="4.5" class="acc-fill"/>
<text x="108" y="391" font-size="14" text-anchor="start" class="acc-fill">Zerologon (CFB8); Zoom's ECB found</text>
</svg>
<figcaption>Figure 8.1. Forty-five years of modes. The accent rows are attacks; almost all of them hit modes that hide data but do not authenticate it.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 620 170" width="620" role="img" aria-label="ECB: each plaintext block is encrypted independently under the same key" fill="currentColor" font-size="13">
<rect x="70" y="14" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="32.5" font-size="13" text-anchor="middle">P1</text>
<line x1="110" y1="42" x2="110" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="110,66 107.3,59.6 112.7,59.6" fill="currentColor"/>
<rect x="82" y="66" width="56" height="32" rx="4" class="soft"/>
<rect x="82" y="66" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="86.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="110" y1="98" x2="110" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="110,120 107.3,113.6 112.7,113.6" fill="currentColor"/>
<rect x="70" y="120" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="138.6" font-size="13" text-anchor="middle">C1</text>
<rect x="270" y="14" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="310" y="32.5" font-size="13" text-anchor="middle">P2</text>
<line x1="310" y1="42" x2="310" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="310,66 307.3,59.6 312.7,59.6" fill="currentColor"/>
<rect x="282" y="66" width="56" height="32" rx="4" class="soft"/>
<rect x="282" y="66" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="310" y="86.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="310" y1="98" x2="310" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="310,120 307.3,113.6 312.7,113.6" fill="currentColor"/>
<rect x="270" y="120" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="310" y="138.6" font-size="13" text-anchor="middle">C2</text>
<rect x="470" y="14" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="510" y="32.5" font-size="13" text-anchor="middle">P3</text>
<line x1="510" y1="42" x2="510" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="510,66 507.3,59.6 512.7,59.6" fill="currentColor"/>
<rect x="482" y="66" width="56" height="32" rx="4" class="soft"/>
<rect x="482" y="66" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="510" y="86.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="510" y1="98" x2="510" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="510,120 507.3,113.6 512.7,113.6" fill="currentColor"/>
<rect x="470" y="120" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="510" y="138.6" font-size="13" text-anchor="middle">C3</text>
<text x="310" y="166" font-size="13" text-anchor="middle" class="acc-fill">equal P blocks give equal C blocks</text>
</svg>
<figcaption>Figure 8.2. Electronic codebook mode. It is parallel and simple, and it is a codebook: whatever repeats in the plaintext repeats in the ciphertext.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 700 200" width="700" role="img" aria-label="A picture encrypted block by block: ECB keeps the shape, CBC turns it into noise" fill="currentColor" font-size="13">
<text x="120" y="22" font-size="13" text-anchor="middle" font-weight="bold">the data (one block per pixel)</text>
<rect x="19" y="34" width="202" height="122" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="90" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="100" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="110" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="120" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="130" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="140" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="80" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="90" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="100" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="110" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="120" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="130" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="140" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="150" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="160" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="80" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="110" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="120" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="150" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="160" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="170" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="80" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="110" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="120" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="150" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="160" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="170" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="80" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="90" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="100" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="110" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="120" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="130" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="140" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="150" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="160" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="170" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="50" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="80" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="110" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="120" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="150" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="160" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="170" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="180" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="40" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="50" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="80" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="90" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="100" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="110" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="120" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="130" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="140" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="150" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="160" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="170" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="180" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="190" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="40" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="50" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="80" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="90" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="100" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="110" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="120" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="130" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="140" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="150" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="160" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="170" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="180" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="190" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="40" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="50" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="80" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="90" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="100" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="110" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="120" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="130" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="140" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="150" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="160" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="170" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="180" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="190" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="50" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="60" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="80" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="90" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="100" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="110" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="120" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="130" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="140" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="150" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="160" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="170" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="180" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="70" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="80" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="90" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="100" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="130" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="140" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="150" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="160" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<text x="350" y="22" font-size="13" text-anchor="middle" font-weight="bold">ECB</text>
<rect x="249" y="34" width="202" height="122" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="250" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="290" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="300" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="310" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="320" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="330" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="340" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="350" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="360" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="370" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="380" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="390" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="400" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="410" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="420" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="35" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="290" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="300" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="310" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="320" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="330" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="340" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="350" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="360" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="370" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="380" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="390" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="400" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="410" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="420" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="45" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="290" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="300" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="310" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="320" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="330" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="340" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="350" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="360" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="370" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="380" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="390" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="400" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="410" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="420" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="55" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="290" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="310" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="320" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="330" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="340" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="350" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="360" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="370" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="380" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="390" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="400" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="420" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="65" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="290" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="310" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="320" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="330" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="340" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="350" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="360" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="370" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="380" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="390" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="400" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="420" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="75" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="290" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="310" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="320" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="330" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="340" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="350" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="360" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="370" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="380" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="390" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="400" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="420" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="85" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="290" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="310" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="320" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="330" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="340" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="350" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="360" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="370" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="380" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="390" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="400" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="420" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="95" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="280" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="290" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="310" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="320" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="330" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="340" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="350" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="360" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="370" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="380" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="390" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="400" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="420" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="430" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="105" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="280" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="290" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="310" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="320" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="330" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="340" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="350" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="360" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="370" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="380" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="390" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="400" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="420" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="430" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="115" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="280" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="290" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="310" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="320" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="330" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="340" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="350" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="360" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="370" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="380" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="390" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="400" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="420" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="430" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="125" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="290" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="300" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="310" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="320" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="330" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="340" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="350" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="360" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="370" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="380" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="390" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.9"/>
<rect x="400" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="410" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.1"/>
<rect x="420" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="135" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="250" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="260" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="270" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="280" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="290" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="300" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="310" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="320" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="330" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="340" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="350" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="360" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="370" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="380" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="390" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.6"/>
<rect x="400" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="410" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="420" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="430" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<rect x="440" y="145" width="10" height="10" rx="0" class="acc-fill" fill-opacity="0.2"/>
<text x="580" y="22" font-size="13" text-anchor="middle" font-weight="bold">CBC</text>
<rect x="479" y="34" width="202" height="122" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<rect x="480" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="490" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="500" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="510" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="520" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="530" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="540" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="550" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="560" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="570" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="580" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="590" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="600" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="610" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="620" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="630" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="640" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="650" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="660" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="670" y="35" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="480" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="490" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="500" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="510" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="520" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="530" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="540" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="550" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="560" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="570" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="580" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="590" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="600" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="610" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="620" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="630" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="640" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="650" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="660" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="670" y="45" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="480" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="490" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="500" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="510" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="520" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="530" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="540" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="550" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="560" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="570" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="580" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="590" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="600" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="610" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="620" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="630" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="640" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="650" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="660" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="670" y="55" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="480" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="490" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="500" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="510" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="520" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="530" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="540" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="550" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="560" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="570" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="580" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="590" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="600" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="610" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="620" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="630" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="640" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="650" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="660" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="670" y="65" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="480" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="490" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="500" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="510" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="520" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="530" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="540" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="550" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="560" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="570" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="580" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="590" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="600" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="610" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="620" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="630" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="640" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="650" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="660" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="670" y="75" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="480" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="490" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="500" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="510" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="520" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="530" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="540" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="550" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="560" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="570" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="580" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="590" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="600" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="610" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="620" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="630" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="640" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="650" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="660" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="670" y="85" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="480" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="490" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="500" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="510" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="520" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="530" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="540" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="550" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="560" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="570" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="580" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="590" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="600" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="610" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="620" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="630" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="640" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="650" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="660" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="670" y="95" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="480" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="490" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="500" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="510" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="520" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="530" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="540" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="550" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="560" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="570" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="580" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="590" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="600" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="610" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="620" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="630" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="640" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="650" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="660" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="670" y="105" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="480" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="490" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="500" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="510" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="520" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="530" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="540" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="550" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="560" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="1"/>
<rect x="570" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="580" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="590" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="600" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="610" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="1"/>
<rect x="620" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="630" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="640" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="650" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="660" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="670" y="115" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="480" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="490" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="500" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="510" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="520" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="530" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="540" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="550" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="560" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="570" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="580" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="590" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="600" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="610" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="620" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="630" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="640" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="650" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="660" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="670" y="125" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="480" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="490" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="500" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="510" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="520" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="530" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="540" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="550" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="560" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="570" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="580" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.3"/>
<rect x="590" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="600" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="610" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="620" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="630" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="640" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="650" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="660" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="670" y="135" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="480" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="490" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="500" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="510" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="520" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="530" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="540" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="550" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="560" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="570" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<rect x="580" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.9"/>
<rect x="590" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="600" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.1"/>
<rect x="610" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="620" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="630" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.7"/>
<rect x="640" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.8"/>
<rect x="650" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.4"/>
<rect x="660" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.6"/>
<rect x="670" y="145" width="10" height="10" rx="0" fill="currentColor" fill-opacity="0.2"/>
<text x="350" y="185" font-size="13" text-anchor="middle">same key, same data: only the mode differs</text>
</svg>
<figcaption>Figure 8.3. The chapter's ECB experiment drawn as pixels: each square is one 16-byte block, shaded by the first byte of its ciphertext. ECB gives each distinct plaintext block one fixed shade, so the picture survives; CBC gives every block its own.</figcaption>
</figure>

ECB has hurt real systems. In 2013 Adobe lost a database of about 153 million
user records whose passwords were encrypted with triple DES in ECB mode. Nobody
needed the key: equal passwords had equal ciphertexts, so the most common
ciphertext was obviously "123456", and users' password hints, stored in the clear
next to them, gave away the rest. In 2020 researchers at the Citizen Lab found
that the Zoom video service encrypted meeting audio and video with AES in ECB mode
(CVE-2020-11500).

ECB is acceptable for exactly one job: encrypting a single block of random data,
such as one key. For anything else, never.

!!! note "Life story: ECB"
    **Born:** 1980, in FIPS 81, as the obvious way to use DES on more than one
    block · **Purpose:** encrypt each block on its own, with nothing to manage
    but the key · **Helped:** little beyond single keys and test vectors ·
    **Harmed:** the Adobe password leak (2013), Zoom's meeting encryption
    (2020), and many homemade systems · **Status:** never for messages; only
    for one block of random data

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

<figure class="mars-fig">
<svg viewBox="0 0 660 210" width="660" role="img" aria-label="CBC encryption: each plaintext block is XORed with the previous ciphertext block, the first with the IV, before encryption" fill="currentColor" font-size="13">
<rect x="20" y="92" width="60" height="28" rx="4" class="soft-acc"/>
<rect x="20" y="92" width="60" height="28" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="50" y="110.5" font-size="13" text-anchor="middle">IV</text>
<rect x="140" y="10" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="28.6" font-size="13" text-anchor="middle">P1</text>
<line x1="180" y1="38" x2="180" y2="97" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,97 177.3,90.6 182.7,90.6" fill="currentColor"/>
<circle cx="180" cy="106" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="171" y1="106" x2="189" y2="106" class="acc" stroke-width="1.4"/>
<line x1="180" y1="97" x2="180" y2="115" class="acc" stroke-width="1.4"/>
<line x1="80" y1="106" x2="171" y2="106" class="acc" stroke-width="1.4"/>
<polygon points="171,106 164.6,108.7 164.6,103.3" class="acc-fill"/>
<line x1="180" y1="115" x2="180" y2="128" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,128 177.3,121.6 182.7,121.6" fill="currentColor"/>
<rect x="152" y="128" width="56" height="32" rx="4" class="soft"/>
<rect x="152" y="128" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="148.6" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="180" y1="160" x2="180" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,172 177.3,165.6 182.7,165.6" fill="currentColor"/>
<rect x="140" y="172" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="190.6" font-size="13" text-anchor="middle">C1</text>
<rect x="320" y="10" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="28.6" font-size="13" text-anchor="middle">P2</text>
<line x1="360" y1="38" x2="360" y2="97" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,97 357.3,90.6 362.7,90.6" fill="currentColor"/>
<circle cx="360" cy="106" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="351" y1="106" x2="369" y2="106" class="acc" stroke-width="1.4"/>
<line x1="360" y1="97" x2="360" y2="115" class="acc" stroke-width="1.4"/>
<polyline points="220,186 270,186 270,106 351,106" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="351,106 344.6,108.7 344.6,103.3" class="acc-fill"/>
<line x1="360" y1="115" x2="360" y2="128" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,128 357.3,121.6 362.7,121.6" fill="currentColor"/>
<rect x="332" y="128" width="56" height="32" rx="4" class="soft"/>
<rect x="332" y="128" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="148.6" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="360" y1="160" x2="360" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,172 357.3,165.6 362.7,165.6" fill="currentColor"/>
<rect x="320" y="172" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="190.6" font-size="13" text-anchor="middle">C2</text>
<rect x="500" y="10" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="28.6" font-size="13" text-anchor="middle">P3</text>
<line x1="540" y1="38" x2="540" y2="97" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,97 537.3,90.6 542.7,90.6" fill="currentColor"/>
<circle cx="540" cy="106" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="531" y1="106" x2="549" y2="106" class="acc" stroke-width="1.4"/>
<line x1="540" y1="97" x2="540" y2="115" class="acc" stroke-width="1.4"/>
<polyline points="400,186 450,186 450,106 531,106" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="531,106 524.6,108.7 524.6,103.3" class="acc-fill"/>
<line x1="540" y1="115" x2="540" y2="128" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,128 537.3,121.6 542.7,121.6" fill="currentColor"/>
<rect x="512" y="128" width="56" height="32" rx="4" class="soft"/>
<rect x="512" y="128" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="148.6" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="540" y1="160" x2="540" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,172 537.3,165.6 542.7,165.6" fill="currentColor"/>
<rect x="500" y="172" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="190.6" font-size="13" text-anchor="middle">C3</text>
</svg>
<figcaption>Figure 8.4. CBC encryption. The chaining (accent) makes each ciphertext block depend on all the plaintext before it, so it cannot be parallelized.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 660 210" width="660" role="img" aria-label="CBC decryption: decrypt each block and XOR with the previous ciphertext block" fill="currentColor" font-size="13">
<rect x="20" y="92" width="60" height="28" rx="4" class="soft-acc"/>
<rect x="20" y="92" width="60" height="28" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="50" y="110.5" font-size="13" text-anchor="middle">IV</text>
<rect x="140" y="10" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="28.6" font-size="13" text-anchor="middle">C1</text>
<line x1="180" y1="38" x2="180" y2="50" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,50 177.3,43.6 182.7,43.6" fill="currentColor"/>
<rect x="152" y="50" width="56" height="32" rx="4" class="soft"/>
<rect x="152" y="50" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="70.5" font-size="13" text-anchor="middle" font-weight="bold">D_K</text>
<line x1="180" y1="82" x2="180" y2="135" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,135 177.3,128.6 182.7,128.6" fill="currentColor"/>
<circle cx="180" cy="144" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="171" y1="144" x2="189" y2="144" class="acc" stroke-width="1.4"/>
<line x1="180" y1="135" x2="180" y2="153" class="acc" stroke-width="1.4"/>
<line x1="180" y1="153" x2="180" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,172 177.3,165.6 182.7,165.6" fill="currentColor"/>
<rect x="140" y="172" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="190.6" font-size="13" text-anchor="middle">P1</text>
<polyline points="80,106 110,106 110,144 171,144" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="171,144 164.6,146.7 164.6,141.3" class="acc-fill"/>
<rect x="320" y="10" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="28.6" font-size="13" text-anchor="middle">C2</text>
<line x1="360" y1="38" x2="360" y2="50" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,50 357.3,43.6 362.7,43.6" fill="currentColor"/>
<rect x="332" y="50" width="56" height="32" rx="4" class="soft"/>
<rect x="332" y="50" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="70.5" font-size="13" text-anchor="middle" font-weight="bold">D_K</text>
<line x1="360" y1="82" x2="360" y2="135" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,135 357.3,128.6 362.7,128.6" fill="currentColor"/>
<circle cx="360" cy="144" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="351" y1="144" x2="369" y2="144" class="acc" stroke-width="1.4"/>
<line x1="360" y1="135" x2="360" y2="153" class="acc" stroke-width="1.4"/>
<line x1="360" y1="153" x2="360" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,172 357.3,165.6 362.7,165.6" fill="currentColor"/>
<rect x="320" y="172" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="190.6" font-size="13" text-anchor="middle">P2</text>
<polyline points="220,24 270,24 270,144 351,144" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="351,144 344.6,146.7 344.6,141.3" class="acc-fill"/>
<rect x="500" y="10" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="28.6" font-size="13" text-anchor="middle">C3</text>
<line x1="540" y1="38" x2="540" y2="50" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,50 537.3,43.6 542.7,43.6" fill="currentColor"/>
<rect x="512" y="50" width="56" height="32" rx="4" class="soft"/>
<rect x="512" y="50" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="70.5" font-size="13" text-anchor="middle" font-weight="bold">D_K</text>
<line x1="540" y1="82" x2="540" y2="135" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,135 537.3,128.6 542.7,128.6" fill="currentColor"/>
<circle cx="540" cy="144" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="531" y1="144" x2="549" y2="144" class="acc" stroke-width="1.4"/>
<line x1="540" y1="135" x2="540" y2="153" class="acc" stroke-width="1.4"/>
<line x1="540" y1="153" x2="540" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,172 537.3,165.6 542.7,165.6" fill="currentColor"/>
<rect x="500" y="172" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="190.6" font-size="13" text-anchor="middle">P3</text>
<polyline points="400,24 450,24 450,144 531,144" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="531,144 524.6,146.7 524.6,141.3" class="acc-fill"/>
</svg>
<figcaption>Figure 8.5. CBC decryption. Every block needs only two ciphertext blocks, so decryption runs in parallel. A change to C₁ garbles P₁ and flips exactly the same bits of P₂; this is what the attacks of §8.6 use.</figcaption>
</figure>

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

Two of the four engineers who patented CBC, Walter Tuchman and Carl Meyer, were
also on the IBM team that built DES, and the mode was meant from the start to go
with it. It became the default way to encrypt with a block cipher for thirty
years, in SSL and TLS, IPsec, SSH and countless file formats, and the attacks of
§8.6 are the story of its retirement.

!!! note "Life story: CBC"
    **Born:** 1976, patented by William Ehrsam, Carl Meyer, John Smith and
    Walter Tuchman at IBM; standardized in FIPS 81 (1980) · **Purpose:** hide
    repeated blocks by chaining each block to the one before · **Helped:** the
    standard mode of SSL and TLS, IPsec, SSH and file encryption for three
    decades · **Retired:** from TLS in version 1.3 (2018), after BEAST (2011),
    Lucky Thirteen (2013) and POODLE (2014) showed how it fails without
    authentication · **Replaced by:** authenticated modes such as AES-GCM and
    ChaCha20-Poly1305

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

<figure class="mars-fig">
<svg viewBox="0 0 660 210" width="660" role="img" aria-label="CTR: encrypt nonce and counter, XOR the result with the plaintext" fill="currentColor" font-size="13">
<rect x="70" y="10" width="140" height="28" rx="4" class="soft-acc"/>
<rect x="70" y="10" width="140" height="28" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="140" y="28.6" font-size="13" text-anchor="middle">nonce ‖ 0</text>
<line x1="140" y1="38" x2="140" y2="56" stroke="currentColor" stroke-width="1.4"/>
<polygon points="140,56 137.3,49.6 142.7,49.6" fill="currentColor"/>
<rect x="112" y="56" width="56" height="32" rx="4" class="soft"/>
<rect x="112" y="56" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="76.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="140" y1="88" x2="140" y2="126" stroke="currentColor" stroke-width="1.4"/>
<polygon points="140,126 137.3,119.6 142.7,119.6" fill="currentColor"/>
<circle cx="140" cy="135" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="131" y1="135" x2="149" y2="135" stroke="currentColor" stroke-width="1.4"/>
<line x1="140" y1="126" x2="140" y2="144" stroke="currentColor" stroke-width="1.4"/>
<rect x="40" y="121" width="50" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65" y="139.6" font-size="13" text-anchor="middle">P1</text>
<line x1="90" y1="135" x2="131" y2="135" stroke="currentColor" stroke-width="1.4"/>
<polygon points="131,135 124.6,137.7 124.6,132.3" fill="currentColor"/>
<line x1="140" y1="144" x2="140" y2="170" stroke="currentColor" stroke-width="1.4"/>
<polygon points="140,170 137.3,163.6 142.7,163.6" fill="currentColor"/>
<rect x="100" y="170" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="188.6" font-size="13" text-anchor="middle">C1</text>
<text x="152" y="112" font-size="12" text-anchor="start" fill-opacity="0.8">keystream</text>
<rect x="270" y="10" width="140" height="28" rx="4" class="soft-acc"/>
<rect x="270" y="10" width="140" height="28" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="340" y="28.6" font-size="13" text-anchor="middle">nonce ‖ 1</text>
<line x1="340" y1="38" x2="340" y2="56" stroke="currentColor" stroke-width="1.4"/>
<polygon points="340,56 337.3,49.6 342.7,49.6" fill="currentColor"/>
<rect x="312" y="56" width="56" height="32" rx="4" class="soft"/>
<rect x="312" y="56" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="340" y="76.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="340" y1="88" x2="340" y2="126" stroke="currentColor" stroke-width="1.4"/>
<polygon points="340,126 337.3,119.6 342.7,119.6" fill="currentColor"/>
<circle cx="340" cy="135" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="331" y1="135" x2="349" y2="135" stroke="currentColor" stroke-width="1.4"/>
<line x1="340" y1="126" x2="340" y2="144" stroke="currentColor" stroke-width="1.4"/>
<rect x="240" y="121" width="50" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="265" y="139.6" font-size="13" text-anchor="middle">P2</text>
<line x1="290" y1="135" x2="331" y2="135" stroke="currentColor" stroke-width="1.4"/>
<polygon points="331,135 324.6,137.7 324.6,132.3" fill="currentColor"/>
<line x1="340" y1="144" x2="340" y2="170" stroke="currentColor" stroke-width="1.4"/>
<polygon points="340,170 337.3,163.6 342.7,163.6" fill="currentColor"/>
<rect x="300" y="170" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="340" y="188.6" font-size="13" text-anchor="middle">C2</text>
<text x="352" y="112" font-size="12" text-anchor="start" fill-opacity="0.8">keystream</text>
<rect x="470" y="10" width="140" height="28" rx="4" class="soft-acc"/>
<rect x="470" y="10" width="140" height="28" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="540" y="28.6" font-size="13" text-anchor="middle">nonce ‖ 2</text>
<line x1="540" y1="38" x2="540" y2="56" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,56 537.3,49.6 542.7,49.6" fill="currentColor"/>
<rect x="512" y="56" width="56" height="32" rx="4" class="soft"/>
<rect x="512" y="56" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="76.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="540" y1="88" x2="540" y2="126" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,126 537.3,119.6 542.7,119.6" fill="currentColor"/>
<circle cx="540" cy="135" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="531" y1="135" x2="549" y2="135" stroke="currentColor" stroke-width="1.4"/>
<line x1="540" y1="126" x2="540" y2="144" stroke="currentColor" stroke-width="1.4"/>
<rect x="440" y="121" width="50" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="465" y="139.6" font-size="13" text-anchor="middle">P3</text>
<line x1="490" y1="135" x2="531" y2="135" stroke="currentColor" stroke-width="1.4"/>
<polygon points="531,135 524.6,137.7 524.6,132.3" fill="currentColor"/>
<line x1="540" y1="144" x2="540" y2="170" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,170 537.3,163.6 542.7,163.6" fill="currentColor"/>
<rect x="500" y="170" width="80" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="188.6" font-size="13" text-anchor="middle">C3</text>
<text x="552" y="112" font-size="12" text-anchor="start" fill-opacity="0.8">keystream</text>
</svg>
<figcaption>Figure 8.6. Counter mode. Each block's keystream depends only on the nonce and the block number, so any block can be computed alone and in parallel; a nonce-and-counter value used twice repeats keystream.</figcaption>
</figure>

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

!!! note "Life story: CTR"
    **Born:** 1979, suggested by Whitfield Diffie and Martin Hellman; left out
    of FIPS 81 and standardized only in SP 800-38A (2001) · **Purpose:** turn a
    block cipher into a parallel, random-access keystream generator ·
    **Helped:** the encryption layer of GCM and CCM, and so of TLS, WPA2 and
    WPA3, IPsec and SSH; Bellare and Rogaway's proofs made it the best
    understood mode · **Status:** current, inside authenticated modes

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

<figure class="mars-fig">
<svg viewBox="0 0 720 330" width="720" role="img" aria-label="CFB feeds back the ciphertext; OFB feeds back the cipher output" fill="currentColor" font-size="13">
<text x="30" y="84" font-size="15" text-anchor="start" font-weight="bold">CFB</text>
<rect x="90" y="26" width="50" height="26" rx="4" class="soft-acc"/>
<rect x="90" y="26" width="50" height="26" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="115" y="43.5" font-size="13" text-anchor="middle">IV</text>
<rect x="172" y="54" width="56" height="32" rx="4" class="soft"/>
<rect x="172" y="54" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="200" y="74.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="200" y1="86" x2="200" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="200,110 197.3,103.6 202.7,103.6" fill="currentColor"/>
<circle cx="200" cy="119" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="191" y1="119" x2="209" y2="119" stroke="currentColor" stroke-width="1.4"/>
<line x1="200" y1="110" x2="200" y2="128" stroke="currentColor" stroke-width="1.4"/>
<rect x="105" y="105" width="46" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="128" y="123.5" font-size="13" text-anchor="middle">P1</text>
<line x1="151" y1="119" x2="191" y2="119" stroke="currentColor" stroke-width="1.4"/>
<polygon points="191,119 184.6,121.7 184.6,116.3" fill="currentColor"/>
<line x1="200" y1="128" x2="200" y2="140" stroke="currentColor" stroke-width="1.4"/>
<polygon points="200,140 197.3,133.6 202.7,133.6" fill="currentColor"/>
<rect x="170" y="140" width="60" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="200" y="157.6" font-size="13" text-anchor="middle">C1</text>
<polyline points="140,39 200,39 200,54" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="200,54 197.3,47.6 202.7,47.6" class="acc-fill"/>
<polyline points="230,153 248,153 248,39 360,39 360,54" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="360,54 357.3,47.6 362.7,47.6" class="acc-fill"/>
<rect x="332" y="54" width="56" height="32" rx="4" class="soft"/>
<rect x="332" y="54" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="74.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="360" y1="86" x2="360" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,110 357.3,103.6 362.7,103.6" fill="currentColor"/>
<circle cx="360" cy="119" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="351" y1="119" x2="369" y2="119" stroke="currentColor" stroke-width="1.4"/>
<line x1="360" y1="110" x2="360" y2="128" stroke="currentColor" stroke-width="1.4"/>
<rect x="265" y="105" width="46" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="288" y="123.5" font-size="13" text-anchor="middle">P2</text>
<line x1="311" y1="119" x2="351" y2="119" stroke="currentColor" stroke-width="1.4"/>
<polygon points="351,119 344.6,121.7 344.6,116.3" fill="currentColor"/>
<line x1="360" y1="128" x2="360" y2="140" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,140 357.3,133.6 362.7,133.6" fill="currentColor"/>
<rect x="330" y="140" width="60" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="157.6" font-size="13" text-anchor="middle">C2</text>
<polyline points="390,153 408,153 408,39 520,39 520,54" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="520,54 517.3,47.6 522.7,47.6" class="acc-fill"/>
<rect x="492" y="54" width="56" height="32" rx="4" class="soft"/>
<rect x="492" y="54" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="74.5" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="520" y1="86" x2="520" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,110 517.3,103.6 522.7,103.6" fill="currentColor"/>
<circle cx="520" cy="119" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="511" y1="119" x2="529" y2="119" stroke="currentColor" stroke-width="1.4"/>
<line x1="520" y1="110" x2="520" y2="128" stroke="currentColor" stroke-width="1.4"/>
<rect x="425" y="105" width="46" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="448" y="123.5" font-size="13" text-anchor="middle">P3</text>
<line x1="471" y1="119" x2="511" y2="119" stroke="currentColor" stroke-width="1.4"/>
<polygon points="511,119 504.6,121.7 504.6,116.3" fill="currentColor"/>
<line x1="520" y1="128" x2="520" y2="140" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,140 517.3,133.6 522.7,133.6" fill="currentColor"/>
<rect x="490" y="140" width="60" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="157.6" font-size="13" text-anchor="middle">C3</text>
<text x="30" y="244" font-size="15" text-anchor="start" font-weight="bold">OFB</text>
<rect x="90" y="186" width="50" height="26" rx="4" class="soft-acc"/>
<rect x="90" y="186" width="50" height="26" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="115" y="203.6" font-size="13" text-anchor="middle">IV</text>
<rect x="172" y="214" width="56" height="32" rx="4" class="soft"/>
<rect x="172" y="214" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="200" y="234.6" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="200" y1="246" x2="200" y2="270" stroke="currentColor" stroke-width="1.4"/>
<polygon points="200,270 197.3,263.6 202.7,263.6" fill="currentColor"/>
<circle cx="200" cy="279" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="191" y1="279" x2="209" y2="279" stroke="currentColor" stroke-width="1.4"/>
<line x1="200" y1="270" x2="200" y2="288" stroke="currentColor" stroke-width="1.4"/>
<rect x="105" y="265" width="46" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="128" y="283.6" font-size="13" text-anchor="middle">P1</text>
<line x1="151" y1="279" x2="191" y2="279" stroke="currentColor" stroke-width="1.4"/>
<polygon points="191,279 184.6,281.7 184.6,276.3" fill="currentColor"/>
<line x1="200" y1="288" x2="200" y2="300" stroke="currentColor" stroke-width="1.4"/>
<polygon points="200,300 197.3,293.6 202.7,293.6" fill="currentColor"/>
<rect x="170" y="300" width="60" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="200" y="317.6" font-size="13" text-anchor="middle">C1</text>
<polyline points="140,199 200,199 200,214" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="200,214 197.3,207.6 202.7,207.6" class="acc-fill"/>
<polyline points="200,258 248,258 248,199 360,199 360,214" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="360,214 357.3,207.6 362.7,207.6" class="acc-fill"/>
<rect x="332" y="214" width="56" height="32" rx="4" class="soft"/>
<rect x="332" y="214" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="234.6" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="360" y1="246" x2="360" y2="270" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,270 357.3,263.6 362.7,263.6" fill="currentColor"/>
<circle cx="360" cy="279" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="351" y1="279" x2="369" y2="279" stroke="currentColor" stroke-width="1.4"/>
<line x1="360" y1="270" x2="360" y2="288" stroke="currentColor" stroke-width="1.4"/>
<rect x="265" y="265" width="46" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="288" y="283.6" font-size="13" text-anchor="middle">P2</text>
<line x1="311" y1="279" x2="351" y2="279" stroke="currentColor" stroke-width="1.4"/>
<polygon points="351,279 344.6,281.7 344.6,276.3" fill="currentColor"/>
<line x1="360" y1="288" x2="360" y2="300" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,300 357.3,293.6 362.7,293.6" fill="currentColor"/>
<rect x="330" y="300" width="60" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="317.6" font-size="13" text-anchor="middle">C2</text>
<polyline points="360,258 408,258 408,199 520,199 520,214" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="520,214 517.3,207.6 522.7,207.6" class="acc-fill"/>
<rect x="492" y="214" width="56" height="32" rx="4" class="soft"/>
<rect x="492" y="214" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="234.6" font-size="13" text-anchor="middle" font-weight="bold">E_K</text>
<line x1="520" y1="246" x2="520" y2="270" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,270 517.3,263.6 522.7,263.6" fill="currentColor"/>
<circle cx="520" cy="279" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="511" y1="279" x2="529" y2="279" stroke="currentColor" stroke-width="1.4"/>
<line x1="520" y1="270" x2="520" y2="288" stroke="currentColor" stroke-width="1.4"/>
<rect x="425" y="265" width="46" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="448" y="283.6" font-size="13" text-anchor="middle">P3</text>
<line x1="471" y1="279" x2="511" y2="279" stroke="currentColor" stroke-width="1.4"/>
<polygon points="511,279 504.6,281.7 504.6,276.3" fill="currentColor"/>
<line x1="520" y1="288" x2="520" y2="300" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,300 517.3,293.6 522.7,293.6" fill="currentColor"/>
<rect x="490" y="300" width="60" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="317.6" font-size="13" text-anchor="middle">C3</text>
<text x="712" y="70" font-size="12.5" text-anchor="end" class="acc-fill">ciphertext</text>
<text x="712" y="86" font-size="12.5" text-anchor="end" class="acc-fill">fed back</text>
<text x="712" y="230" font-size="12.5" text-anchor="end" class="acc-fill">cipher output</text>
<text x="712" y="246" font-size="12.5" text-anchor="end" class="acc-fill">fed back</text>
</svg>
<figcaption>Figure 8.7. The two feedback modes of 1980. In CFB (top) the keystream depends on earlier ciphertext, so it resynchronizes after an error; in OFB (bottom) it depends only on the IV and key, like a classic stream cipher.</figcaption>
</figure>

!!! note "Life story: CFB and OFB"
    **Born:** 1980, in FIPS 81, for terminals and serial links that sent one
    character at a time · **Purpose:** stream-like encryption with a block
    cipher; CFB also recovers by itself after a lost piece of data ·
    **Helped:** OpenPGP's CFB variant and older link encryptors · **Harmed:**
    Zerologon (2020), found by Tom Tervoort of Secura, broke Windows domain
    controllers through AES-CFB8 with a fixed zero IV · **Status:** legacy

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

<figure class="mars-fig">
<svg viewBox="0 0 680 230" width="680" role="img" aria-label="Bit flipping in CBC: XORing a difference into the IV changes the first plaintext block by exactly that difference" fill="currentColor" font-size="13">
<rect x="30" y="20" width="230" height="30" rx="4" class="soft-acc"/>
<rect x="30" y="20" width="230" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="145" y="39.5" font-size="13" text-anchor="middle">IV ⊕ ("user" ⊕ "root")</text>
<rect x="380" y="20" width="140" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="450" y="39.5" font-size="13" text-anchor="middle">C₁ (unchanged)</text>
<line x1="450" y1="50" x2="450" y2="70" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,70 447.3,63.6 452.7,63.6" fill="currentColor"/>
<rect x="422" y="70" width="56" height="32" rx="4" class="soft"/>
<rect x="422" y="70" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="450" y="90.5" font-size="13" text-anchor="middle" font-weight="bold">D_K</text>
<line x1="450" y1="102" x2="450" y2="141" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,141 447.3,134.6 452.7,134.6" fill="currentColor"/>
<polyline points="145,50 145,150 441,150" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="441,150 434.6,152.7 434.6,147.3" class="acc-fill"/>
<circle cx="450" cy="150" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="441" y1="150" x2="459" y2="150" class="acc" stroke-width="1.4"/>
<line x1="450" y1="141" x2="450" y2="159" class="acc" stroke-width="1.4"/>
<line x1="450" y1="159" x2="450" y2="180" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,180 447.3,173.6 452.7,173.6" fill="currentColor"/>
<text x="450" y="200" font-size="15" text-anchor="middle" font-weight="bold" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">role=root;id=007</text>
<text x="450" y="222" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">was role=user;id=007</text>
<text x="140" y="190" font-size="12.5" text-anchor="middle">the server's check of the</text>
<text x="140" y="206" font-size="12.5" text-anchor="middle">plaintext passes: nothing</text>
<text x="140" y="222" font-size="12.5" text-anchor="middle">tells it the IV was changed</text>
</svg>
<figcaption>Figure 8.8. The attack in the code: the attacker changes only the IV. Because the IV is XORed in after decryption, the change passes straight through into the plaintext, with no garbage at all.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 680 280" width="680" role="img" aria-label="Padding oracle: the attacker sends its own block F as the IV with a target block C and learns only whether the padding is valid" fill="currentColor" font-size="13">
<rect x="30" y="20" width="150" height="32" rx="4" class="soft-acc"/>
<rect x="30" y="20" width="150" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="105" y="40.5" font-size="13" text-anchor="middle">F (attacker's guess)</text>
<rect x="330" y="20" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="40.5" font-size="13" text-anchor="middle">C (target)</text>
<line x1="390" y1="52" x2="390" y2="70" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,70 387.3,63.6 392.7,63.6" fill="currentColor"/>
<rect x="362" y="70" width="56" height="32" rx="4" class="soft"/>
<rect x="362" y="70" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="90.5" font-size="13" text-anchor="middle" font-weight="bold">D_K</text>
<line x1="390" y1="102" x2="390" y2="131" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,131 387.3,124.6 392.7,124.6" fill="currentColor"/>
<text x="400" y="120" font-size="12.5" text-anchor="start" fill-opacity="0.85">D_K(C), unknown</text>
<polyline points="105,52 105,140 381,140" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="381,140 374.6,142.7 374.6,137.3" class="acc-fill"/>
<circle cx="390" cy="140" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="381" y1="140" x2="399" y2="140" class="acc" stroke-width="1.4"/>
<line x1="390" y1="131" x2="390" y2="149" class="acc" stroke-width="1.4"/>
<line x1="390" y1="149" x2="390" y2="170" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,170 387.3,163.6 392.7,163.6" fill="currentColor"/>
<rect x="220" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="231" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="242" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="253" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="264" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="275" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="286" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="297" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="308" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="319" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="330" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="341" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="352" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="363" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="374" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="385" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="396" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="407" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="418" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="429" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="440" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="451" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="462" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="473" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="484" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="495" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="506" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="517" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="528" y="172" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="539" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">?</text>
<rect x="550" y="172" width="22" height="26" rx="0" class="soft-acc"/>
<rect x="550" y="172" width="22" height="26" rx="0" fill="none" class="acc" stroke-width="1.4"/>
<text x="561" y="189.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<text x="210" y="190" font-size="13" text-anchor="end">P′ =</text>
<rect x="330" y="222" width="120" height="32" rx="4" class="soft"/>
<rect x="330" y="222" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="242.6" font-size="13" text-anchor="middle">padding valid?</text>
<line x1="390" y1="198" x2="390" y2="222" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,222 387.3,215.6 392.7,215.6" fill="currentColor"/>
<polyline points="330,238 105,238 105,56" fill="none" class="acc" stroke-width="1.4" stroke-dasharray="4 3"/>
<polygon points="105,56 107.7,62.4 102.3,62.4" class="acc-fill"/>
<text x="220" y="232" font-size="13" text-anchor="middle" class="acc-fill">yes / no</text>
<text x="470" y="236" font-size="12.5" text-anchor="start">yes: last byte of</text>
<text x="470" y="252" font-size="12.5" text-anchor="start" font-weight="bold">D_K(C) = F₁₅ ⊕ 01</text>
<text x="470" y="268" font-size="12.5" text-anchor="start">then aim for 02 02, …</text>
</svg>
<figcaption>Figure 8.9. One probe of the padding oracle attack. The attacker varies the last byte of F until the server accepts the padding; at that point it knows the last byte of D_K(C) without the key, and moves on to the next byte.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Oracle queries needed for each of the 32 plaintext bytes recovered, averaging about 109" fill="currentColor" font-size="13">
<line x1="68" y1="205" x2="640" y2="205" stroke="currentColor" stroke-width="1.4"/>
<line x1="68" y1="205" x2="68" y2="20" stroke="currentColor" stroke-width="1.4"/>
<line x1="63" y1="205" x2="68" y2="205" stroke="currentColor" stroke-width="1.4"/>
<text x="58" y="209" font-size="12.5" text-anchor="end">0</text>
<line x1="63" y1="163.4" x2="68" y2="163.4" stroke="currentColor" stroke-width="1.4"/>
<text x="58" y="167.4" font-size="12.5" text-anchor="end">64</text>
<line x1="63" y1="121.8" x2="68" y2="121.8" stroke="currentColor" stroke-width="1.4"/>
<text x="58" y="125.8" font-size="12.5" text-anchor="end">128</text>
<line x1="63" y1="80.2" x2="68" y2="80.2" stroke="currentColor" stroke-width="1.4"/>
<text x="58" y="84.2" font-size="12.5" text-anchor="end">192</text>
<line x1="63" y1="38.6" x2="68" y2="38.6" stroke="currentColor" stroke-width="1.4"/>
<text x="58" y="42.6" font-size="12.5" text-anchor="end">256</text>
<rect x="72" y="54.2" width="13" height="150.8" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="89.5" y="193.3" width="13" height="11.7" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="107" y="149.8" width="13" height="55.2" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="124.5" y="175.1" width="13" height="29.9" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="142" y="175.8" width="13" height="29.2" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="159.5" y="157.6" width="13" height="47.4" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="177" y="144.6" width="13" height="60.4" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="194.5" y="175.8" width="13" height="29.2" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="212" y="86" width="13" height="119" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="229.5" y="161.4" width="13" height="43.6" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="247" y="149.1" width="13" height="55.9" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="264.5" y="140" width="13" height="65" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="282" y="123.8" width="13" height="81.2" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="299.5" y="123.1" width="13" height="81.9" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="317" y="136.8" width="13" height="68.2" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="334.5" y="142.6" width="13" height="62.4" rx="1" fill="currentColor" fill-opacity="0.5"/>
<rect x="352" y="83.5" width="13" height="121.5" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="369.5" y="75" width="13" height="130" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="387" y="193.9" width="13" height="11.1" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="404.5" y="170.6" width="13" height="34.4" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="422" y="114" width="13" height="91" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="439.5" y="181.6" width="13" height="23.4" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="457" y="158.8" width="13" height="46.2" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="474.5" y="190.7" width="13" height="14.3" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="492" y="99" width="13" height="106" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="509.5" y="62" width="13" height="143" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="527" y="39.2" width="13" height="165.8" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="544.5" y="201.1" width="13" height="3.9" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="562" y="82.8" width="13" height="122.2" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="579.5" y="143.9" width="13" height="61.1" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="597" y="84.8" width="13" height="120.2" rx="1" class="acc-fill" fill-opacity="0.8"/>
<rect x="614.5" y="125.7" width="13" height="79.3" rx="1" class="acc-fill" fill-opacity="0.8"/>
<line x1="68" y1="121.8" x2="640" y2="121.8" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="646" y="117.8" font-size="12.5" text-anchor="start">about 128:</text>
<text x="646" y="133.8" font-size="12.5" text-anchor="start">random average</text>
<text x="210" y="224" font-size="12.5" text-anchor="middle">block 1 (last byte first)</text>
<text x="490" y="224" font-size="12.5" text-anchor="middle" class="acc-fill">block 2</text>
<text x="355" y="244" font-size="13" text-anchor="middle" font-weight="bold">3,484 queries in all; no key</text>
</svg>
<figcaption>Figure 8.10. The run of the padding oracle code: how many questions each recovered byte cost. Each byte needs at most 256 guesses and on average about half that.</figcaption>
</figure>

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

Vaudenay, a professor at EPFL in Lausanne, presented the attack at EUROCRYPT
2002 in Amsterdam. It was at first treated as a curiosity, because real
protocols seemed to hide padding errors. The next twelve years showed that
almost every way of hiding them leaked something: an error message, a log line,
a few microseconds. The final answer was to stop checking padding of
unauthenticated data at all.

!!! note "Life story: the padding oracle attack"
    **Born:** 2002, Serge Vaudenay at EPFL · **Purpose:** to show that one bit
    of feedback, "was the padding valid?", is enough to decrypt CBC without the
    key · **Helped:** to retire unauthenticated CBC: it struck ASP.NET (2010),
    TLS through Lucky Thirteen (2013) and SSL 3.0 through POODLE (2014), and it
    was a main reason TLS 1.3 kept only authenticated encryption · **Status:**
    still found in new software that decrypts before it authenticates

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

<figure class="mars-fig">
<svg viewBox="0 0 680 250" width="680" role="img" aria-label="XTS: the sector number is encrypted under K2 and multiplied by alpha to the j to make a mask T, XORed before and after encrypting under K1" fill="currentColor" font-size="13">
<rect x="20" y="20" width="130" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="39.5" font-size="13" text-anchor="middle">sector number i</text>
<line x1="150" y1="35" x2="180" y2="35" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,35 173.6,37.7 173.6,32.3" fill="currentColor"/>
<rect x="180" y="19" width="70" height="32" rx="4" class="soft"/>
<rect x="180" y="19" width="70" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="215" y="39.5" font-size="13" text-anchor="middle" font-weight="bold">E_K₂</text>
<line x1="250" y1="35" x2="290" y2="35" stroke="currentColor" stroke-width="1.4"/>
<polygon points="290,35 283.6,37.7 283.6,32.3" fill="currentColor"/>
<circle cx="300" cy="35" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="293.7" y1="28.7" x2="306.3" y2="41.3" class="acc" stroke-width="1.4"/>
<line x1="293.7" y1="41.3" x2="306.3" y2="28.7" class="acc" stroke-width="1.4"/>
<text x="300" y="72" font-size="14" text-anchor="middle" class="acc-fill">αʲ</text>
<line x1="300" y1="60" x2="300" y2="45" class="acc" stroke-width="1.4"/>
<polygon points="300,45 302.7,51.4 297.3,51.4" class="acc-fill"/>
<line x1="309" y1="35" x2="360" y2="35" class="acc" stroke-width="1.4"/>
<polygon points="360,35 353.6,37.7 353.6,32.3" class="acc-fill"/>
<rect x="360" y="20" width="120" height="30" rx="4" class="soft-acc"/>
<rect x="360" y="20" width="120" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="420" y="39.5" font-size="13" text-anchor="middle">mask T(i, j)</text>
<text x="560" y="32" font-size="12.5" text-anchor="middle">j: block number</text>
<text x="560" y="48" font-size="12.5" text-anchor="middle">within the sector</text>
<rect x="60" y="110" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="129.6" font-size="13" text-anchor="middle">Pⱼ</text>
<line x1="160" y1="125" x2="241" y2="125" stroke="currentColor" stroke-width="1.4"/>
<polygon points="241,125 234.6,127.7 234.6,122.3" fill="currentColor"/>
<circle cx="250" cy="125" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="241" y1="125" x2="259" y2="125" class="acc" stroke-width="1.4"/>
<line x1="250" y1="116" x2="250" y2="134" class="acc" stroke-width="1.4"/>
<line x1="259" y1="125" x2="300" y2="125" stroke="currentColor" stroke-width="1.4"/>
<polygon points="300,125 293.6,127.7 293.6,122.3" fill="currentColor"/>
<rect x="305" y="109" width="80" height="32" rx="4" class="soft"/>
<rect x="305" y="109" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="345" y="129.6" font-size="13" text-anchor="middle" font-weight="bold">E_K₁</text>
<line x1="385" y1="125" x2="441" y2="125" stroke="currentColor" stroke-width="1.4"/>
<polygon points="441,125 434.6,127.7 434.6,122.3" fill="currentColor"/>
<circle cx="450" cy="125" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="441" y1="125" x2="459" y2="125" class="acc" stroke-width="1.4"/>
<line x1="450" y1="116" x2="450" y2="134" class="acc" stroke-width="1.4"/>
<line x1="459" y1="125" x2="520" y2="125" stroke="currentColor" stroke-width="1.4"/>
<polygon points="520,125 513.6,127.7 513.6,122.3" fill="currentColor"/>
<rect x="520" y="110" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="570" y="129.6" font-size="13" text-anchor="middle">Cⱼ</text>
<polyline points="400,50 400,80 250,80 250,116" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="250,116 247.3,109.6 252.7,109.6" class="acc-fill"/>
<polyline points="450,50 450,116" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="450,116 447.3,109.6 452.7,109.6" class="acc-fill"/>
<text x="340" y="180" font-size="13" text-anchor="middle">same size in and out: no IV, no tag</text>
<text x="340" y="200" font-size="13" text-anchor="middle">every block of every sector gets its own mask</text>
<text x="340" y="236" font-size="12.5" text-anchor="middle" fill-opacity="0.85">multiplying by α: shift left one bit, XOR 87 if a bit falls off</text>
</svg>
<figcaption>Figure 8.11. XTS-AES for one 16-byte block of a disk sector. The mask, different for every position on the disk, is what stops the penguin; nothing stops someone who sees the disk twice from noticing which blocks changed.</figcaption>
</figure>

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

!!! note "Life story: XTS"
    **Born:** tweakable block ciphers defined in 2002 by Moses Liskov, Ronald
    Rivest and David Wagner; XEX by Phillip Rogaway (UC Davis) in 2004;
    XTS-AES in IEEE 1619-2007 and NIST SP 800-38E (2010) · **Purpose:**
    encrypt disk sectors in place, with no room for an IV or a tag ·
    **Helped:** BitLocker, FileVault, LUKS and Android's file-based encryption
    · **Status:** current and recommended for storage; it protects a lost
    device, not a disk an attacker can watch or change

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

<figure class="mars-fig">
<svg viewBox="0 0 680 260" width="680" role="img" aria-label="AES Key Wrap step: encrypt A with R_i, the top half XOR the step counter becomes the new A, the bottom half the new R_i; six passes" fill="currentColor" font-size="13">
<rect x="40" y="20" width="110" height="30" rx="4" class="soft-acc"/>
<rect x="40" y="20" width="110" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="95" y="39.5" font-size="13" text-anchor="middle">A</text>
<text x="95" y="66" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">starts A6A6A6A6A6A6A6A6</text>
<rect x="200" y="20" width="100" height="30" rx="4" class="soft"/>
<rect x="200" y="20" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="250" y="39.5" font-size="13" text-anchor="middle">R1</text>
<rect x="310" y="20" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="39.5" font-size="13" text-anchor="middle">R2</text>
<rect x="420" y="20" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="470" y="39.5" font-size="13" text-anchor="middle">R3</text>
<text x="530" y="40" font-size="12.5" text-anchor="start">… Rₙ (key, 8 bytes each)</text>
<polyline points="95,80 95,100 200,100 200,108" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="200,108 197.3,101.6 202.7,101.6" fill="currentColor"/>
<polyline points="250,50 250,108" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,108 247.3,101.6 252.7,101.6" fill="currentColor"/>
<rect x="150" y="108" width="160" height="34" rx="4" class="soft"/>
<rect x="150" y="108" width="160" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="230" y="129.6" font-size="13" text-anchor="middle" font-weight="bold">E_K(A ‖ Rᵢ)</text>
<line x1="190" y1="142" x2="190" y2="170" stroke="currentColor" stroke-width="1.4"/>
<polygon points="190,170 187.3,163.6 192.7,163.6" fill="currentColor"/>
<line x1="270" y1="142" x2="270" y2="196" stroke="currentColor" stroke-width="1.4"/>
<polygon points="270,196 267.3,189.6 272.7,189.6" fill="currentColor"/>
<text x="160" y="162" font-size="12.5" text-anchor="end">top</text>
<text x="282" y="162" font-size="12.5" text-anchor="start">bottom</text>
<circle cx="190" cy="179" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="181" y1="179" x2="199" y2="179" class="acc" stroke-width="1.4"/>
<line x1="190" y1="170" x2="190" y2="188" class="acc" stroke-width="1.4"/>
<line x1="120" y1="179" x2="181" y2="179" stroke="currentColor" stroke-width="1.4"/>
<polygon points="181,179 174.6,181.7 174.6,176.3" fill="currentColor"/>
<text x="115" y="184" font-size="12.5" text-anchor="end">step t</text>
<line x1="190" y1="188" x2="190" y2="210" stroke="currentColor" stroke-width="1.4"/>
<polygon points="190,210 187.3,203.6 192.7,203.6" fill="currentColor"/>
<rect x="140" y="210" width="100" height="30" rx="4" class="soft-acc"/>
<rect x="140" y="210" width="100" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="190" y="229.6" font-size="13" text-anchor="middle">new A</text>
<rect x="250" y="196" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="300" y="215.6" font-size="13" text-anchor="middle">new Rᵢ</text>
<text x="520" y="130" font-size="13" text-anchor="middle">repeat for i = 1 … n,</text>
<text x="520" y="150" font-size="13" text-anchor="middle">six times over: 6n steps</text>
<text x="520" y="190" font-size="13" text-anchor="middle">unwrap runs it backwards and</text>
<text x="520" y="210" font-size="13" text-anchor="middle">checks that A is A6A6… again:</text>
<text x="520" y="230" font-size="13" text-anchor="middle" class="acc-fill">a 64-bit integrity check</text>
</svg>
<figcaption>Figure 8.12. One step of AES Key Wrap (RFC 3394). Because A passes through every step, a change to any byte of the wrapped key scrambles A on unwrapping, and the check fails.</figcaption>
</figure>

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

!!! note "Life story: AES Key Wrap"
    **Born:** 2001, a NIST specification, published as RFC 3394 (2002) and
    approved in SP 800-38F (2012) · **Purpose:** encrypt keys under other keys,
    with integrity and no nonce · **Helped:** hardware security modules,
    PKCS#11 tokens, cloud key managers, CMS and JSON Web Encryption ·
    **Status:** acceptable and widely deployed; new designs can use SIV, which
    has a proof

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

<figure class="mars-fig">
<svg viewBox="0 0 660 260" width="660" role="img" aria-label="FF1: a Feistel network on decimal digit strings, with AES inside the round function and addition modulo 10 to the m" fill="currentColor" font-size="13">
<text x="330" y="18" font-size="13" text-anchor="middle">middle six digits of 4111111111111111, tweak = the visible digits</text>
<rect x="150" y="30" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="210" y="50.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">A = 111</text>
<rect x="390" y="30" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="450" y="50.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B = 111</text>
<line x1="210" y1="62" x2="210" y2="121" stroke="currentColor" stroke-width="1.4"/>
<text x="210" y="80" font-size="1" text-anchor="middle"></text>
<rect x="201" y="121" width="18" height="18" rx="2" class="soft-acc"/>
<rect x="201" y="121" width="18" height="18" rx="2" fill="none" class="acc" stroke-width="1.4"/>
<line x1="204" y1="130" x2="216" y2="130" class="acc" stroke-width="1.4"/>
<line x1="210" y1="124" x2="210" y2="136" class="acc" stroke-width="1.4"/>
<line x1="450" y1="62" x2="450" y2="180" stroke="currentColor" stroke-width="1.4"/>
<circle cx="450" cy="130" r="3" fill="currentColor"/>
<line x1="450" y1="130" x2="390" y2="130" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,130 396.4,127.3 396.4,132.7" fill="currentColor"/>
<rect x="240" y="110" width="150" height="40" rx="4" class="soft-acc"/>
<rect x="240" y="110" width="150" height="40" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="315" y="126.7" font-size="12" text-anchor="middle">AES-based</text>
<text x="315" y="141.7" font-size="12" text-anchor="middle">PRF(round, B, tweak)</text>
<line x1="240" y1="130" x2="219" y2="130" class="acc" stroke-width="1.4"/>
<polygon points="219,130 225.4,127.3 225.4,132.7" class="acc-fill"/>
<text x="178" y="116" font-size="12.5" text-anchor="end" class="acc-fill">+ y mod 10³</text>
<line x1="210" y1="139" x2="210" y2="180" stroke="currentColor" stroke-width="1.4"/>
<line x1="210" y1="180" x2="450" y2="215" stroke="currentColor" stroke-width="1.4"/>
<line x1="450" y1="180" x2="210" y2="215" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="235" font-size="13" text-anchor="middle">swap the halves; 10 rounds</text>
<text x="330" y="254" font-size="13" text-anchor="middle" font-weight="bold">result: 4111116742331111 (six digits in, six digits out)</text>
</svg>
<figcaption>Figure 8.13. One FF1 round on the card example. The round function is AES used as a MAC; its output, read as a number, is added to one half modulo 10³ so the half stays three decimal digits.</figcaption>
</figure>

FPE's weak spot is the small domain. Six digits is only a million values, and
Feistel networks over small domains leak through the many encryptions an
attacker can collect. The second method, **FF3**, fell in 2017 to F. Betül Durak
and Serge Vaudenay; NIST patched it as FF3-1, and Tim Beyne broke that in 2021.
NIST's revision of SP 800-38G keeps only FF1 and requires at least a million
possible inputs. Like XTS and Key Wrap, FPE is deterministic: equal card numbers
encrypt alike under one tweak. Full details:
[Format-preserving encryption](../05-modes-aead/Format-Preserving.md).

!!! note "Life story: format-preserving encryption (FF1 and FF3)"
    **Born:** FFX in 2010, by Mihir Bellare (UC San Diego), Phillip Rogaway (UC
    Davis) and Terence Spies (Voltage Security); FF1 and FF3 in NIST SP
    800-38G (2016) · **Purpose:** encrypt card and ID numbers into numbers of
    the same form, inside old systems · **Helped:** payment processors and
    databases that could not change their formats · **Broken:** FF3 in 2017
    (Durak and Vaudenay) and FF3-1 in 2021 (Beyne) · **Status:** FF1 current,
    on domains of at least a million values

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
