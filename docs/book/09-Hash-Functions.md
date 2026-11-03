# 9. Hash Functions

*A hash function turns any amount of data into a short fingerprint that nobody
can fake. It has no key and hides nothing, yet signatures, software updates,
Git, Bitcoin, password storage and every MAC in the next chapter lean on it.
This chapter says exactly what "nobody can fake" means, works out why a 256-bit
hash gives only 128 bits of collision security, builds SHA-256 and SHA-3 in a
few dozen lines of Python, forges a message with the length-extension attack,
and tells how MD5 and SHA-1 fell.*

!!! abstract "In this chapter"
    **You will learn:**

    - the three jobs of a hash (preimage, second-preimage and collision resistance) and what each one costs to break by brute force
    - the birthday bound, by hand and in code, and why it halves a hash's collision strength
    - how Merkle-Damgård hashes such as SHA-256 work, and the length-extension attack that comes with them
    - the story of MD5 and SHA-1: Wang Xiaoyun's attacks, the rogue certificate authority, Flame and SHAttered
    - the sponge construction behind SHA-3, and where BLAKE2 and BLAKE3 fit

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (binary, XOR,
    arithmetic mod $2^{32}$) and [Chapter 4](04-Randomness-and-Perfect-Secrecy.md)
    (probability). [Chapter 6](06-Block-Ciphers.md) helps for §9.4.

    **Levels:** 9.1 to 9.3 are for beginners; 9.4 to 9.10 are intermediate;
    9.12 is expert.

## 9.1 The problem: a fingerprint for data

You download a 4 GB operating system image from a mirror you have never heard
of. The project's own web site publishes one line next to the link:

```
b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

You run `sha256sum` on what you downloaded, get the same 64 hex digits, and
trust the 4 GB. That trust rests on one claim: nobody, not even the mirror's
owner, can make a different file with the same fingerprint.

The idea of hashing is older than this use of it. Around 1953 Hans Peter Luhn,
an engineer at IBM, described scattering records into numbered buckets by
"hashing" their keys, so that a lookup checks one bucket instead of the whole
file. Those hash functions only had to spread data evenly. Nobody was trying
to fool them.

Public-key cryptography changed that. When Diffie and Hellman proposed digital
signatures in 1976 (see [Chapter 12](12-Diffie-Hellman.md)), it was clear at
once that signing a whole document with slow public-key arithmetic was
impractical. Sign a short digest of it instead. But then the digest has to be
as hard to fake as the signature. In 1978 Michael Rabin proposed a digest built
from DES, and the next year Gideon Yuval, in a short paper titled "How to
Swindle Rabin", showed how a swindler could exploit any digest that was too
short. His trick, the birthday attack, is §9.3, and it still sets the size of
every hash in use. In 1979 Ralph Merkle's Stanford thesis described how to hash
long messages by chaining a fixed-size function, and his tree of hashes; ten
years later he and Ivan Damgård, in Aarhus, Denmark, each proved the chaining
method safe. That design, Merkle-Damgård, carried MD5, SHA-1 and SHA-2.

So a cryptographic hash is a public function $H$, with no key, that takes any
input and gives a fixed-size output (the **digest**), and that no one can
steer. The next section makes "no one can steer" precise.

## 9.2 What a hash must do

Think of a 256-bit hash as a machine that gives every possible file a 64-digit
hex label. There are far more files than labels, so different files *must*
share labels somewhere. The point is that nobody can *find* two that do.
That splits into three separate jobs, from hardest to break to easiest:

| Property | The attacker is given | and must find | Brute-force cost for $n$ bits |
|---|---|---|---|
| **Preimage resistance** (one-way) | a digest $y$ | any $x$ with $H(x) = y$ | $2^n$ |
| **Second-preimage resistance** | a message $x$ | some $x' \neq x$ with $H(x') = H(x)$ | $2^n$ |
| **Collision resistance** | nothing | any pair $x \neq x'$ with $H(x) = H(x')$ | $2^{n/2}$ |

Each job matches a use:

- **Preimage:** a server stores $H(\text{password})$; a thief who steals the
  digest should not get the password back. (Passwords break this anyway, for a
  different reason: [Chapter 11](11-Passwords-and-Key-Derivation.md).)
- **Second preimage:** the download above. The file is already out there, and
  the attacker needs a malicious file that matches *it*.
- **Collision:** signatures. If the attacker writes both documents, a harmless
  one and a harmful one with the same digest, they get the harmless one signed
  and the signature covers the harmful one too.

A collision finder needs no particular target, so it is the easiest attack, and
collision resistance is the first property to fall. MD5 and SHA-1 lost it long
before anyone came close to a preimage.

A good hash also shows the **avalanche effect**: change one input bit and about
half the output bits flip, with no pattern.

```python
import hashlib

a = hashlib.sha256(b"abc").digest()
b = hashlib.sha256(b"abd").digest()
print(hashlib.sha256(b"abd").hexdigest())
print(bin(int.from_bytes(a, "big") ^ int.from_bytes(b, "big")).count("1"), "of 256 bits differ")
# a52d159f262b2c6ddb724a61840befc36eb30c88877a4030b65cbe86298449c9
# 122 of 256 bits differ
```

SHA-256 of "abc" begins `ba7816bf`; of "abd", `a52d159f`. Nothing about one
tells you anything about the other.

### Brute force, at a size you can watch

With a real 256-bit hash brute force is hopeless, so cut SHA-256 down to its
first 24 bits and attack that. A preimage search tries inputs until one hits a
fixed target; a collision search remembers every output and stops at the first
repeat:

```python
import hashlib

def tiny(data, bits=24):                 # the first 24 bits of SHA-256: a toy hash
    return int.from_bytes(hashlib.sha256(data).digest(), "big") >> (256 - bits)

target = tiny(b"hello")                  # preimage: find any input with this output
n = 0
while tiny(str(n).encode()) != target:
    n += 1
print("preimage:", n, "after", n + 1, "tries")

seen = {}                                # collision: any two inputs that match
n = 0
while tiny(str(n).encode()) not in seen:
    seen[tiny(str(n).encode())] = n
    n += 1
print("collision:", seen[tiny(str(n).encode())], n, "after", n + 1, "tries")
```

```
preimage: 18635305 after 18635306 tries
collision: 4163 8864 after 8865 tries
```

The preimage took about 18.6 million tries, close to $2^{24} = 16{,}777{,}216$,
and about a quarter of a minute. The collision took 8,865, close to
$2^{12} = 4{,}096$ times a small constant. Same hash, a factor of two thousand
apart. That gap is the birthday bound.

## 9.3 The birthday bound

How many people must be in a room before two of them probably share a
birthday? Not 183. Twenty-three.

The reason is that the question is about *pairs*, and 23 people make
$\binom{23}{2} = 253$ pairs. Work it out by computing the chance that all
birthdays are different. The first person can have any day, the second must
avoid one day, the third two days, and so on:

$$
P(\text{no match}) = \frac{365}{365} \cdot \frac{364}{365} \cdot \frac{363}{365} \cdots \frac{343}{365} \approx 0.493
$$

So the chance of some shared birthday is about $0.507$. The same argument with
$N$ possible values and $q$ samples gives, using $1 - x \approx e^{-x}$,

$$
P(\text{collision}) \approx 1 - e^{-q(q-1)/2N} \approx 1 - e^{-q^2/2N}.
$$

Setting this to $\tfrac12$ gives $q \approx \sqrt{2 \ln 2 \cdot N} \approx 1.18\sqrt{N}$. For an
$n$-bit hash, $N = 2^n$ and

$$
q \approx 1.18 \cdot 2^{n/2}.
$$

For the 24-bit toy hash that is $1.18 \times 2^{12} \approx 4{,}823$ tries; the run
above needed 8,865, a little unlucky but the right size. For real hashes:

| Hash | Output | Collision after about | Status |
|---|---|---|---|
| MD5 | 128 bits | $2^{64}$ | broken far below this (§9.8) |
| SHA-1 | 160 bits | $2^{80}$ | broken far below this (§9.8) |
| SHA-256, SHA3-256 | 256 bits | $2^{128}$ | out of reach |
| SHA-512 | 512 bits | $2^{256}$ | out of reach |

This is why hashes are twice the size of keys. A 128-bit security level, the
same as [AES-128](07-AES.md), needs a 256-bit digest.

**Yuval's swindle.** Here is the 1979 attack in story form. A swindler wants
you to sign a contract that pays them \$1,000, and then claim you signed one
that pays \$100,000. They write both contracts with 32 places where the wording
can change without changing the meaning: a comma or none, "the said" or "this",
one space or two. That gives $2^{32}$ versions of each. With a 64-bit digest,
the birthday bound says that among $2^{32}$ fair versions and $2^{32}$ unfair
ones, a fair and an unfair version probably share a digest. You sign the fair
one; the signature also fits the unfair one. No weakness in the hash is
needed, only a digest too short to stand $2^{n/2}$ work.

## 9.4 Building a hash: Merkle-Damgård

*Level: intermediate.*

It is hard to design a function that takes inputs of any length. It is much
easier to design a **compression function** $f$ that takes two fixed-size
inputs, a chaining value $h$ (256 bits for SHA-256) and a message block $m$
(512 bits), and returns a new 256-bit chaining value. Merkle and Damgård's
construction runs it over the message one block at a time:

1. **Pad** the message to a whole number of blocks. Append a `1` bit, then
   zeros, then the message length in bits as a 64-bit number. Putting the
   length last is called **Merkle-Damgård strengthening**.
2. Start from a fixed **initial value** $h_0$.
3. For each block, $h_i = f(h_{i-1}, m_i)$.
4. The last chaining value is the digest.

**Padding "abc" by hand.** "abc" is the three bytes `61 62 63`, which is 24
bits. Add the byte `80` (a `1` bit and seven zeros), then zeros up to byte 56,
then the length 24 = `0x18` in the last 8 bytes:

```
61626380 00000000 00000000 00000000 00000000 00000000 00000000 00000000
00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000018
```

That is one 64-byte block, so SHA-256("abc") is a single call of $f$.

**Why it is safe.** Suppose someone finds two different messages $M \neq M'$
with the same digest. Walk both chains backwards from the end. Either the last
blocks differ (the lengths are in them, so different lengths always give
different last blocks), and then $f(h, m) = f(h', m')$ with different inputs is
a collision of $f$; or the last blocks and chaining values are equal, and you
step back one block and repeat. Since $M \neq M'$, at some step the inputs
differ and the outputs match. So **a collision in the hash gives a collision in
$f$**: if $f$ is collision-resistant, so is the hash. That proof is the whole
reason everyone used this design for twenty years, and it puts all the work into
designing $f$.

**Where $f$ comes from.** MD5, SHA-1 and SHA-2 all build $f$ from a special
block cipher $E$ in the **Davies-Meyer** form

$$
f(h, m) = E_m(h) + h,
$$

where the message block is the cipher's *key* and the chaining value is
encrypted. The final "$+\,h$" (the feed-forward) matters: without it, anyone
could decrypt backwards from a chosen output, and preimages would be easy. In
SHA-256, $E$ is 64 rounds on eight 32-bit words, and "+" is word-wise addition
mod $2^{32}$.

The digest of a Merkle-Damgård hash is its entire final state. Keep that fact in
mind; it causes the attack in §9.7.

## 9.5 Inside SHA-256

*Level: intermediate.*

SHA-2 was designed at the NSA and published by NIST in 2001 (finalized in FIPS
180-2, 2002), with digest sizes chosen to match the key sizes of the new AES. The family has SHA-224,
SHA-256, SHA-384, SHA-512 and the truncated SHA-512/224 and SHA-512/256; the
current standard is FIPS 180-4. SHA-256 works on 32-bit words, SHA-512 on
64-bit words with 80 rounds and 1,024-bit blocks.

**Constants with nothing up the sleeve.** The eight starting words are the first
32 bits of the fractional parts of the square roots of the first eight primes.
For example, $\sqrt{2} = 1.41421356\ldots$, and $0.41421356\ldots \times 2^{32} = 1{,}779{,}033{,}703.95$,
which in hex is `6a09e667`, the first word of SHA-256's start state. The 64
round constants $K_t$ come the same way from the cube roots of the first 64
primes: $\sqrt[3]{2}$ gives $K_0 = \mathtt{428a2f98}$. Constants from a public recipe
show the designers had no room to hide a weakness in them.

**One round.** The state is eight words $a, b, c, d, e, f, g, h$. Each round
mixes in one word $W_t$ of the expanded message and one constant $K_t$, using
four small functions ($\ggg$ is rotate right):

$$
\begin{aligned}
\Sigma_1(e) &= (e \ggg 6) \oplus (e \ggg 11) \oplus (e \ggg 25) & \mathrm{Ch}(e,f,g) &= (e \land f) \oplus (\lnot e \land g) \\
\Sigma_0(a) &= (a \ggg 2) \oplus (a \ggg 13) \oplus (a \ggg 22) & \mathrm{Maj}(a,b,c) &= (a \land b) \oplus (a \land c) \oplus (b \land c)
\end{aligned}
$$

$$
T_1 = h + \Sigma_1(e) + \mathrm{Ch}(e,f,g) + K_t + W_t, \qquad T_2 = \Sigma_0(a) + \mathrm{Maj}(a,b,c)
$$

Then every word shifts one place down the line, with two new values entering:
the new $a$ is $T_1 + T_2$ and the new $e$ is $d + T_1$. "Ch" (choose) uses the
bits of $e$ to pick bits from $f$ or $g$; "Maj" (majority) takes the majority
vote of three bits. These are the non-linear parts. Additions mod $2^{32}$ mix
carries across bits, and the rotations spread every bit sideways.

**The first round of "abc", by hand.** With the padded block from §9.4,
$W_0 = \mathtt{61626380}$ and $K_0 = \mathtt{428a2f98}$. Starting from the
square-root constants:

| Value | Result |
|---|---|
| $\Sigma_1(e)$, $e = \mathtt{510e527f}$ | `3587272b` |
| $\mathrm{Ch}(e, f, g)$ | `1f85c98c` |
| $\Sigma_0(a)$, $a = \mathtt{6a09e667}$ | `ce20b47e` |
| $\mathrm{Maj}(a, b, c)$ | `3a6fe667` |
| $T_1 = h + \Sigma_1 + \mathrm{Ch} + K_0 + W_0$ | `54da50e8` |
| $T_2 = \Sigma_0 + \mathrm{Maj}$ | `08909ae5` |
| new $a = T_1 + T_2$ | `5d6aebcd` |
| new $e = d + T_1$ | `fa2a4622` |

<div class="mars-steps" markdown>

1. Pad "abc" into one 64-byte block: `61626380`, zeros, and the length `00000018`.
2. Load the start words $a = \mathtt{6a09e667}, \ldots, h = \mathtt{5be0cd19}$ (square roots of 2, 3, 5, ..., 19).
3. Compute $T_1 = h + \Sigma_1(e) + \mathrm{Ch}(e,f,g) + K_0 + W_0 = \mathtt{54da50e8}$.
4. Compute $T_2 = \Sigma_0(a) + \mathrm{Maj}(a,b,c) = \mathtt{08909ae5}$.
5. Shift the words along: new $a = T_1 + T_2 = \mathtt{5d6aebcd}$, new $e = d + T_1 = \mathtt{fa2a4622}$.
6. Run 63 more rounds, with $W_{16}, \ldots, W_{63}$ made from the earlier words.
7. Add the start words back (the Davies-Meyer feed-forward): `ba7816bf...f20015ad`.

</div>

**The message schedule.** The block gives only 16 words, $W_0$ to $W_{15}$. The
other 48 are made from earlier ones, so every message bit reaches many rounds:

$$
W_t = \sigma_1(W_{t-2}) + W_{t-7} + \sigma_0(W_{t-15}) + W_{t-16}, \qquad t = 16, \ldots, 63,
$$

with $\sigma_0(x) = (x \ggg 7) \oplus (x \ggg 18) \oplus (x \gg 3)$ and
$\sigma_1(x) = (x \ggg 17) \oplus (x \ggg 19) \oplus (x \gg 10)$, where $\gg$ is a plain shift.
This schedule is the part SHA-1 had too little of, and it is a large reason
SHA-2 has held.

## 9.6 Code it

*Level: intermediate.*

Everything above fits in one short program. It computes the constants from the
primes rather than copying 72 hex numbers, and it lets you start from any state,
which §9.7 needs.

```python
import hashlib

def primes(n):                          # the first n primes
    ps, k = [], 2
    while len(ps) < n:
        if all(k % p for p in ps):
            ps.append(k)
        k += 1
    return ps

def frac_root(p, r):                    # first 32 bits of the fraction of p^(1/r)
    x = int(p ** (1 / r) * 2**32)       # close guess, then fix it exactly
    while (x + 1) ** r <= p << (32 * r):
        x += 1
    while x ** r > p << (32 * r):
        x -= 1
    return x & 0xffffffff

H0 = [frac_root(p, 2) for p in primes(8)]
K = [frac_root(p, 3) for p in primes(64)]
M32 = 0xffffffff

def rotr(x, n):
    return (x >> n | x << (32 - n)) & M32

def pad(n):                             # padding for an n-byte message
    return b"\x80" + bytes((55 - n) % 64) + (8 * n).to_bytes(8, "big")

def compress(h, block):
    w = [int.from_bytes(block[i:i + 4], "big") for i in range(0, 64, 4)]
    for t in range(16, 64):
        s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ w[t - 15] >> 3
        s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ w[t - 2] >> 10
        w.append((w[t - 16] + s0 + w[t - 7] + s1) & M32)
    a, b, c, d, e, f, g, hh = h
    for t in range(64):
        t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + (e & f ^ ~e & g) + K[t] + w[t]
        t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c)
        a, b, c, d, e, f, g, hh = (t1 + t2) & M32, a, b, c, (d + t1) & M32, e, f, g
    return [(x + y) & M32 for x, y in zip(h, [a, b, c, d, e, f, g, hh])]

def sha256(msg, h=H0, done=0):          # done: bytes already hashed into h
    data = msg + pad(done + len(msg))
    for i in range(0, len(data), 64):
        h = compress(h, data[i:i + 64])
    return b"".join(x.to_bytes(4, "big") for x in h)

print(hex(H0[0]), hex(K[0]), hex(K[63]))
print(sha256(b"abc").hex())
for m in (b"", b"abc", b"a" * 55, b"a" * 56, b"a" * 1000):
    assert sha256(m) == hashlib.sha256(m).digest()
print("matches hashlib")
```

```
0x6a09e667 0x428a2f98 0xc67178f2
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
matches hashlib
```

The test lengths 55 and 56 matter: 55 bytes is the longest message whose padding
fits in one block, and 56 bytes spills the length into a second block, the
classic place for padding bugs. This code is for learning. It is slow and it is
not written to resist timing attacks; real programs call `hashlib.sha256`.

## 9.7 Break it: length extension

*Level: intermediate.*

A tempting way to authenticate a message with a secret key is to hash them
together: $\mathit{tag} = \text{SHA-256}(\mathit{key} \,\Vert\, \mathit{message})$. Only someone with the key can
compute the tag, so it seems to prove the message is genuine.

It does not, and §9.4 already shows why. The digest *is* the full chaining
value after the last block. An attacker who knows the tag can load it as the
starting state and keep hashing. They do not know the key, but they don't need
it: they only need its *length*, to work out what padding the server's hash
appended. The result is a valid tag for

$$
\mathit{key} \,\Vert\, \mathit{message} \,\Vert\, \mathit{padding} \,\Vert\, \mathit{extra}
$$

for any $\mathit{extra}$ the attacker likes. Add this below the program from §9.6:

```python
import os

secret = os.urandom(16)                  # the server's key; the attacker never sees it
msg = b"user=alice&role=user"
tag = hashlib.sha256(secret + msg).digest()        # the "MAC" the server hands out

# The attacker knows msg, tag and the key length (16), nothing else.
extra = b"&role=admin"
glue = pad(16 + len(msg))                # the padding the server's hash added
h = [int.from_bytes(tag[i:i + 4], "big") for i in range(0, 32, 4)]
forged_msg = msg + glue + extra
forged_tag = sha256(extra, h, 16 + len(msg) + len(glue))

print(forged_msg)
print(hashlib.sha256(secret + forged_msg).digest() == forged_tag)
```

After the three lines from §9.6, it prints:

```
b'user=alice&role=user\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01 &role=admin'
True
```

The forged message carries some binary junk in the middle (the old padding),
but many parsers skip it, and if the server reads the last `role=` it now says
`admin`. The key length is rarely secret; an attacker can also just try each
plausible length. In 2009 Thai Duong and Juliano Rizzo forged requests to
Flickr's API this way, because Flickr signed calls with MD5(secret + data).

**The fixes.** Use a real MAC, [HMAC](10-Message-Authentication.md), which
hashes twice so the outer hash hides the inner state. Or use a hash whose
output is not its whole state: SHA-512/256 and SHA-384 cut the output short,
and SHA-3 (§9.9) never outputs its hidden part at all.

## 9.8 How MD5 and SHA-1 fell

*Level: intermediate.*

**MD4 and MD5.** Ron Rivest at MIT designed MD4 in 1990 for the fast 32-bit
processors of the day, and MD5 in 1991 as a more careful version (RFC 1321,
1992). Their shape, a Davies-Meyer compression function with rounds of
add, rotate, XOR and a non-linear bit function, became the template for SHA-0,
SHA-1 and SHA-2. Through the 1990s MD5 was everywhere: file checksums,
certificates, Unix passwords, HMAC in TLS and IPsec.

Warnings came early. Hans Dobbertin in Germany found collisions in MD4 in 1996,
and in the same year collisions of MD5's compression function with a chosen
starting value. Experts began advising a move away from MD5, but it was so
widely deployed that little changed.

**Wang Xiaoyun.** In August 2004, at the CRYPTO conference's informal evening
session, Wang Xiaoyun of Shandong University in China, with Feng Dengguo, Lai
Xuejia and Yu Hongbo, showed real collisions for MD5, MD4, HAVAL-128 and the
original RIPEMD. Her method was **differential cryptanalysis** turned on hash
functions: pick a small difference between two message blocks, and a path of
differences through the rounds that cancels by the end, so that both blocks give
the same output. Each step of the path holds only with some probability, but
she found ways to choose the message words so that the early steps hold by
construction ("message modification"), leaving only the late ones to chance.
Within two years, a laptop found MD5
collisions in seconds. Here is one, from Wang and Yu's 2005 paper: two 128-byte
inputs that differ in six bits.

```python
import hashlib

a = bytes.fromhex(
    "d131dd02c5e6eec4693d9a0698aff95c2fcab58712467eab4004583eb8fb7f89"
    "55ad340609f4b30283e488832571415a085125e8f7cdc99fd91dbdf280373c5b"
    "d8823e3156348f5bae6dacd436c919c6dd53e2b487da03fd02396306d248cda0"
    "e99f33420f577ee8ce54b67080a80d1ec69821bcb6a8839396f9652b6ff72a70")
b = bytearray(a)
for i in (19, 45, 59, 83, 109, 123):     # flip the top bit of six bytes
    b[i] ^= 0x80
b = bytes(b)

print(hashlib.md5(a).hexdigest())
print(hashlib.md5(b).hexdigest())
tail = b"any ending you like, as long as both get the same one"
print(hashlib.md5(a + tail).digest() == hashlib.md5(b + tail).digest())
print(hashlib.sha256(a).digest() == hashlib.sha256(b).digest())
```

```
79054025255fb1a26e4bc422aef54eb4
79054025255fb1a26e4bc422aef54eb4
True
False
```

The third line is Merkle-Damgård working against the defender: once two inputs
collide on whole blocks, the chaining values are equal, so **any common ending
keeps them colliding**. A file format can put a colliding block early and then
let later content branch on it, which is how researchers built pairs of PDFs,
programs and certificates with the same MD5.

**Chosen prefixes, and a rogue authority.** Wang's collisions start from the
same prefix. Marc Stevens, Arjen Lenstra and Benne de Weger (CWI Amsterdam,
EPFL and TU Eindhoven) went further in 2007 with **chosen-prefix collisions**:
start from two *different* chosen beginnings and find endings that make them
collide. In December 2008 Stevens, Alexander Sotirov, Jacob Appelbaum and
others used about 200 PlayStation 3 consoles to compute one that turned an
ordinary web certificate, signed with MD5 by a commercial certificate
authority, into a certificate for their own authority that browsers trusted.
They dated it to have expired years earlier, so it could do no harm, but
it showed that a criminal could have done the same. Certificate authorities stopped signing with MD5.

**Flame.** In May 2012 researchers found Flame, espionage malware aimed mostly
at computers in Iran and the Middle East. It spread through Windows Update
using a forged code-signing certificate that chained up to Microsoft. Stevens
analyzed it and found an MD5 chosen-prefix collision made with a *new* variant
of the attack, unknown to the public: someone with large resources had their
own hash cryptanalysts. Microsoft revoked the certificates involved (Security
Advisory 2718704). MD5 had been "broken" for eight years, but a forgotten
licensing service still signed with it.

**SHA-1.** The NSA's SHA-0 appeared in 1993 (FIPS 180), and in 1995 it was
replaced by SHA-1 (FIPS 180-1), which differs by a single one-bit rotation in
the message schedule. The NSA gave no reason. In 1998 Florent Chabaud and
Antoine Joux in France found a collision attack on SHA-0 that the rotation
stops, so the change was clearly a fix. SHA-1's 160 bits promised $2^{80}$
collision security. In February 2005 Wang, Yin Yiqun and Yu Hongbo announced an
attack in about $2^{69}$, and NIST began urging a move to SHA-2. It took twelve
more years for the attack to be run:

- **SHAttered, February 2017.** Stevens, Elie Bursztein, Pierre Karpman, Ange
  Albertini and Yarik Markov (CWI and Google) published two different PDF files
  with the same SHA-1. It cost about $2^{63.1}$ SHA-1 computations, about 6,500
  CPU years and 100 GPU years, roughly 120,000 times faster than the birthday
  bound.
- **SHA-1 is a Shambles, January 2020.** Gaëtan Leurent (Inria, France) and
  Thomas Peyrin (NTU, Singapore) made a chosen-prefix collision for about
  US\$45,000 of rented GPU time, and used it to build two PGP keys with
  different names whose certification signatures collide.

Browsers stopped accepting SHA-1 certificates in early 2017. Git, whose object
names are SHA-1, switched in 2017 to a version of SHA-1 by Stevens and Dan
Shumow that detects the tell-tale patterns of these attacks (counter-
cryptanalysis), and added SHA-256 repositories in 2020. NIST plans to stop
allowing SHA-1 entirely by the end of 2030.

**The lesson.** Collisions broke both hashes. Preimages never fell: the best
known preimage attack on MD5 still costs about $2^{123.4}$. That is why HMAC-MD5
and HMAC-SHA-1, which need something closer to preimage resistance, were never
practically broken, even though nobody should pick them today. And each hash
had years of public warnings before the attacks became cheap. Systems that had
planned a way to change hash functions moved easily; the rest were caught out.

## 9.9 A different design: the sponge and SHA-3

*Level: intermediate.*

By 2005 the attacks on MD5 and SHA-1 had all used the same family of
techniques, and SHA-2 belonged to the same family. Nobody had broken it, but if
a new idea broke SHA-2 there would be nothing to fall back on. NIST answered as
it had for AES: an open, worldwide competition. It was announced in November
2007; 64 designs were submitted, 51 were accepted to the first round, and in
December 2010 five finalists remained: BLAKE (Switzerland and the UK), Grøstl
(Denmark and Austria), JH (Hongjun Wu, Singapore), Keccak (Belgium and Italy)
and Skein (a team including Bruce Schneier and Niels Ferguson). On 2 October 2012 NIST chose
**Keccak**, by Guido Bertoni, Joan Daemen (a co-designer of AES), Michaël
Peeters and Gilles Van Assche. NIST wrote that it was chosen partly because it
is so unlike SHA-2. It became FIPS 202 in 2015.

**The sponge.** Keccak is not Merkle-Damgård. It keeps a 1,600-bit state and
one fixed **permutation** $f$ (a reversible scramble with no key, Keccak-f[1600]).
The state is split in two: the **rate** $r$, the part data goes in and out of,
and the **capacity** $c = 1600 - r$, which is never touched directly.

- **Absorb:** XOR the next $r$ bits of the padded message into the rate part,
  then apply $f$ to the whole state. Repeat until the message is used up.
- **Squeeze:** output the rate part; if more output is needed, apply $f$ and
  output again.

The capacity is the hidden reserve. An attacker sees only rate bits and never
learns the full state, so length extension does not work, and the generic
security of a sponge is $c/2$ bits. SHA3-256 uses $c = 512$ and
$r = 1088$ bits (136 bytes), giving 128-bit collision and 256-bit preimage
security, matching SHA-256.

**Inside Keccak-f.** The state is a $5 \times 5$ grid of 64-bit "lanes", and each of
24 rounds runs five steps, each simple: $\theta$ XORs every bit with the parity
of two nearby columns, $\rho$ rotates each lane by a fixed amount, $\pi$ moves the
lanes to new positions, $\chi$ is the only non-linear step,
$A[x] \mathrel{\oplus}= (\lnot A[x+1]) \land A[x+2]$ along each row, and $\iota$ XORs a round
constant into one lane so the rounds differ. There are no additions, only XOR,
AND, NOT and rotations, which makes it cheap in hardware and easy to protect
against timing attacks.

<div class="mars-steps" markdown>

1. Start with 1,600 bits of zeros: the first 1,088 bits are the rate, the last 512 the capacity.
2. Pad "abc" to a 136-byte block: `61 62 63 06 00 ... 00 80`. The `06` marks this as SHA-3, not SHAKE.
3. XOR the block into the rate part. The capacity is untouched.
4. Scramble the whole state with 24 rounds of $\theta, \rho, \pi, \chi, \iota$.
5. Read out the first 32 bytes: `3a985da7...11431532`. That is SHA3-256("abc").
6. Need more output? Scramble again and read again. That is how SHAKE gives any length.

</div>

**Code it.** The whole of SHA-3 is short enough to write out. Even the round
constants come from a seven-bit shift register rather than a table:

```python
import hashlib

M64 = (1 << 64) - 1

def rotl(x, n):
    return (x << n | x >> (64 - n)) & M64

RC, r = [], 1                            # round constants from a tiny LFSR
for _ in range(24):
    c = 0
    for j in range(7):
        if r & 1:
            c |= 1 << (2 ** j - 1)
        r = (r << 1) ^ (0x171 if r & 0x80 else 0)
    RC.append(c)

ROT, x, y = [[0] * 5 for _ in range(5)], 1, 0    # rho offsets, walked by pi
for t in range(24):
    ROT[x][y] = (t + 1) * (t + 2) // 2 % 64
    x, y = y, (2 * x + 3 * y) % 5

def keccak_f(A):                         # A[x][y]: 25 lanes of 64 bits
    for rc in RC:
        C = [A[x][0] ^ A[x][1] ^ A[x][2] ^ A[x][3] ^ A[x][4] for x in range(5)]
        D = [C[x - 1] ^ rotl(C[(x + 1) % 5], 1) for x in range(5)]       # theta
        B = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                B[y][(2 * x + 3 * y) % 5] = rotl(A[x][y] ^ D[x], ROT[x][y])  # rho, pi
        A = [[B[x][y] ^ (~B[(x + 1) % 5][y] & B[(x + 2) % 5][y]) for y in range(5)]
             for x in range(5)]                                           # chi
        A[0][0] ^= rc                                                     # iota
    return A

def sponge(msg, rate, suffix, outlen):
    msg += bytes([suffix]) + bytes(-(len(msg) + 1) % rate)
    msg = msg[:-1] + bytes([msg[-1] | 0x80])                 # pad10*1
    A = [[0] * 5 for _ in range(5)]
    for i in range(0, len(msg), rate):                       # absorb
        for k in range(rate // 8):
            A[k % 5][k // 5] ^= int.from_bytes(msg[i + 8 * k:i + 8 * k + 8], "little")
        A = keccak_f(A)
    out = b""
    while len(out) < outlen:                                 # squeeze
        out += b"".join(A[k % 5][k // 5].to_bytes(8, "little") for k in range(rate // 8))
        A = keccak_f(A)
    return out[:outlen]

sha3_256 = lambda m: sponge(m, 136, 0x06, 32)
shake128 = lambda m, n: sponge(m, 168, 0x1f, n)

print(sha3_256(b"abc").hex())
print(sha3_256(b"abc") == hashlib.sha3_256(b"abc").digest())
print(shake128(b"abc", 300) == hashlib.shake_128(b"abc").digest(300))
```

```
3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532
True
True
```

**SHAKE.** The same sponge with a different domain byte (`1f`) and no fixed
length is an **extendable-output function** (XOF): SHAKE128 and SHAKE256 give
as many bytes as you ask for. The post-quantum standards ML-KEM and ML-DSA
([Chapter 21](21-Lattice-Cryptography.md)) use SHAKE to expand short seeds into
large matrices, which is now SHA-3's biggest job.

**The 2013 row.** In 2013 NIST proposed lowering the capacity of the standard
versions to speed them up. Coming months after the Snowden documents suggested the
NSA had planted a back door in a NIST random number generator (Dual_EC_DRBG), the proposal
met strong objections, even though the Keccak team said the change was sound.
NIST kept the original capacities. Trust in how standards are made turned out to
matter as much as the mathematics.

**Keccak-256 is not SHA3-256.** Ethereum adopted Keccak before FIPS 202 added
its domain byte, so Ethereum's "Keccak-256" uses suffix `01` and gives different
digests. Check which one a system means.

## 9.10 BLAKE2, BLAKE3 and hashes around the world

*Level: intermediate.*

**BLAKE2.** The finalist BLAKE, by Jean-Philippe Aumasson, Luca Henzen, Willi
Meier and Raphael Phan, lost to Keccak but impressed everyone with its speed
and safety margin. In December 2012 Aumasson, Samuel Neves, Zooko
Wilcox-O'Hearn and Christian Winnerlein released BLAKE2, with fewer rounds and
useful features built in: a key (making it a MAC on its own), a salt, a
personalization string and tree hashing. Its mixing function G is ChaCha's
quarter-round with message words added ([Chapter 5](05-Stream-Ciphers.md)).
BLAKE2b (64-bit words, up to 64-byte output) and BLAKE2s (32-bit words, up to
32 bytes) are in RFC 7693 and in Python's `hashlib`:

```python
import hashlib

print(hashlib.blake2b(b"abc", digest_size=32).hexdigest())
print(hashlib.blake2b(b"abc").hexdigest()[:64])
print(hashlib.blake2b(b"abc", key=b"secret").hexdigest()[:32])
# bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319
# ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1
# 204c828c56fbe6dfe80f110efd16649b
```

The 32-byte digest is *not* the first half of the 64-byte one: the output
length goes into the starting state, so each length is a separate function. A
SHA-2 truncation does not work that way. BLAKE2 runs inside Argon2
([Chapter 11](11-Passwords-and-Key-Derivation.md)), WireGuard, the Linux random
number generator and libsodium.

**BLAKE3** (Jack O'Connor, Aumasson, Neves and Wilcox-O'Hearn, January 2020)
cuts BLAKE2s to 7 rounds and arranges the input as a Merkle tree of 1 KiB
chunks, so all the cores of a machine can hash one file at once. It is one
function for hashing, MACs, key derivation and long output. It has no RFC or
NIST standard, and its 7 rounds are the thinnest margin of the hashes here; its
designers base that choice on years of attacks on BLAKE and BLAKE2 that never
got close.

**National hashes.** Several countries standardize their own. China's SM3
(published by the State Cryptography Administration in 2010) is a 256-bit
Merkle-Damgård design in the SHA-2 style and is required in Chinese commercial
cryptography. Russia's Streebog (GOST R 34.11-2012, described in RFC 6986) has
256 and 512-bit versions built on an AES-like block cipher. Both are in the
international standard ISO/IEC 10118-3. Whirlpool (2000), by Vincent Rijmen of
Belgium and Paulo Barreto of Brazil, was chosen by the European NESSIE project.
RIPEMD-160 (1996), from a European research project, lives on in every Bitcoin
address. Public analysis of the national standards is thinner than for SHA-2
and SHA-3, simply because fewer people have studied them.

## 9.11 In the real world

**Where you meet hashes.**

- **Inside signatures.** Every RSA, ECDSA or Ed25519 signature signs a hash of
  the message ([Chapter 13](13-RSA.md), [Chapter 15](15-Elliptic-Curves.md)).
  A collision in the hash is a forgery of the signature.
- **Content addressing.** Git names every file and commit by its hash; so do
  IPFS and many backup tools. Change a byte and the name changes.
- **Merkle trees.** Hash the data in pairs, then the pairs of hashes, up to one
  root. One root vouches for millions of items, and proving one item needs only
  $\log_2$ of them. Bitcoin blocks, Certificate Transparency logs (RFC 6962)
  and BLAKE3 work this way. Hash-based signatures in
  [Chapter 22](22-Hash-and-Code-Based.md) are built from them too.
- **Building blocks.** HMAC and every MAC in [Chapter 10](10-Message-Authentication.md),
  HKDF and password hashing in [Chapter 11](11-Passwords-and-Key-Derivation.md),
  random generators, and proof-of-work all run on hashes.

**What to choose.**

| Need | Use |
|---|---|
| General hashing | SHA-256 (fast everywhere, hardware instructions on many CPUs) |
| Long-term or high-margin | SHA-384, SHA-512 or SHA3-256/512 |
| Variable-length output | SHAKE128 or SHAKE256 |
| Fast software hashing, keyed hashing | BLAKE2b or BLAKE3 |
| A key and a message | HMAC or KMAC, never a bare hash ([Chapter 10](10-Message-Authentication.md)) |
| Passwords | never a bare hash: Argon2id, scrypt ([Chapter 11](11-Passwords-and-Key-Derivation.md)) |
| Never for new work | MD5, SHA-1, MD4 |

**Standards.** FIPS 180-4 (SHA-1 and SHA-2), FIPS 202 (SHA-3 and SHAKE),
SP 800-185 (cSHAKE, KMAC, TupleHash), RFC 6234 (SHA-2 in C with test vectors),
RFC 7693 (BLAKE2). NIST has decided to revise FIPS 180-4 to remove SHA-1. The
full list with status is in the [hash functions table](../index.md#7-hash-functions),
and the reference pages hold every parameter:
[SHA-2](../07-hash/SHA-2.md), [SHA-3](../07-hash/SHA-3.md),
[BLAKE](../07-hash/BLAKE.md) and [retired hashes](../07-hash/Retired.md).

**Quantum computers.** Grover's algorithm ([Chapter 20](20-Quantum-Computers.md))
finds a preimage in about $2^{n/2}$ quantum steps, so SHA-256 keeps about 128 bits
of preimage security, which is enough. Quantum collision search is no better than
classical in practice. Hashes are the part of cryptography quantum computers
hurt least.

## 9.12 Going deeper

*Level: expert.*

??? abstract "The random oracle model, and what it promises"

    Many proofs (RSA-OAEP, Fiat-Shamir signatures) model the hash as a **random oracle**: a box that
    answers each new question with independent random bits. No real function is one; Canetti, Goldreich and
    Halevi showed in 1998 that there are (contrived) schemes secure with a random oracle and insecure with any
    real hash. Such a proof is still strong evidence, and attacks that exploit the gap have never hit a natural
    scheme. A Merkle-Damgård hash is visibly *not* a random oracle: length extension lets you predict
    $H(M \,\Vert\, \mathit{pad} \,\Vert\, X)$ from $H(M)$, which a random oracle never allows.

    **Indifferentiability** (Maurer, Renner and Holenstein, 2004) makes "behaves like a random oracle"
    precise for constructions. Coron, Dodis, Malinaud and Puniya (2005) showed plain Merkle-Damgård fails it
    and fixes such as chopping the output or a different last call pass it. The sponge with a random
    permutation is indifferentiable from a random oracle up to about $2^{c/2}$ queries (Bertoni, Daemen, Peeters
    and Van Assche, 2008). That is where the "$c/2$ bits of security" in §9.9 comes from.

??? abstract "Joux multicollisions: why concatenating hashes doesn't help"

    A natural idea is to combine two hashes: $H_1(M) \,\Vert\, H_2(M)$, with $n$ bits each, hoping for
    $2^n$ collision security. Antoine Joux showed in 2004 that for Merkle-Damgård hashes this fails.

    Find a collision on the first block: two choices $m_1, m_1'$ that lead to the same chaining value, at
    cost $2^{n/2}$. From there find another pair $m_2, m_2'$, and so on. After $k$ steps you have $2^k$
    different messages (choose either block at each step) that all collide, for only $k \cdot 2^{n/2}$ work.

    Now take $k = n/2$: $2^{n/2}$ messages that collide under $H_1$. Among them, by the birthday bound, two
    probably collide under $H_2$ as well. Total cost about $\frac{n}{2} \cdot 2^{n/2}$, barely more than breaking
    $H_1$ alone. For two 128-bit hashes that is about $64 \cdot 2^{64} = 2^{70}$, not $2^{128}$.

    The same idea leads to **second preimages for long messages** (Kelsey and Schneier, 2005: a $2^k$-block
    message gives a second preimage in about $2^{n-k}$ work) and **herding** (Kelsey and Kohno, 2006: commit to
    a digest first, then make any chosen prefix hash to it). They are why "$2^n$ second-preimage resistance" for
    Merkle-Damgård quietly assumes short messages, and they are part of why the SHA-3 competition wanted a new
    structure.

??? abstract "How differential attacks on MD5 and SHA-1 work"

    Write the compression function as $f(h, m)$. A differential attack looks for message pairs
    $m' = m \oplus \Delta$ such that the internal differences follow a planned path and vanish at the end:
    $f(h, m) = f(h, m')$. For MD5, Wang used a two-block attack: the first block pair produces a small,
    chosen difference in the chaining value, and the second cancels it.

    Each round of the path holds with some probability $p_t$, and the total is about $\prod_t p_t$. **Message
    modification** fixes the first 16 rounds, where each message word enters directly, by solving for the
    words that satisfy every condition. Later techniques (tunnels, Klima 2006; neutral bits, Biham and Chen
    2004; boomerangs) extend this into rounds 17 to 24 or so. What remains is paid for by trial.

    SHA-1's linear message expansion means that a difference in the message spreads in a predictable way, so
    attackers search for **local collisions** (a disturbance and its corrections over six steps) arranged by
    a low-weight codeword of the expansion. SHA-2's schedule is non-linear (the $\sigma$ functions mix
    additions and shifts) and the state is larger, which is why the best collision attacks on SHA-256
    reach 31 of 64 steps, with no practical attack on the full function.

    **Chosen-prefix** collisions need more work, because the starting difference is arbitrary. Stevens
    used a **birthday search** to bring the chaining-value difference into a form that a sequence of
    near-collision blocks can cancel. For MD5 that made chosen prefixes far costlier than identical ones; for
    SHA-1, by 2020, the chosen-prefix attack cost about $2^{63.4}$ against $2^{63.1}$ for the 2017
    identical-prefix collision, so the gap had almost closed.

??? abstract "Security margins, and the best attacks today"

    | Hash | Rounds | Best attacks on reduced rounds (approximate) |
    |---|---|---|
    | SHA-256 | 64 | practical collisions on 31 steps; preimages on about 45 with near-brute-force cost |
    | SHA-512 | 80 | collisions on about 28 steps |
    | SHA3-256 | 24 | practical collisions on 6 rounds |

    These are attacks on weakened versions; none threatens the full functions. The ratio of attacked rounds
    to full rounds is the **security margin**, and it is how cryptographers compare designs that no one can
    break. Exact figures move as papers appear; treat the table as orders of magnitude.

??? abstract "Generic attacks with less memory: Pollard's rho and parallel collision search"

    The birthday search in §9.2 stores every output, which for $2^{64}$ outputs is impossible. **Floyd's
    cycle-finding**, as in Pollard's rho, walks $x_{i+1} = H(x_i)$; the sequence must eventually repeat
    because the outputs are finite, and the point where two different inputs map to the same next value
    is a collision. It needs $O(2^{n/2})$ time and constant memory.

    Van Oorschot and Wiener (1994) made it parallel with **distinguished points**: many machines walk
    independent chains and report only outputs whose first bits are zero. When two chains hit the same
    distinguished point, they merged somewhere, and replaying them finds the collision. With $m$ machines the
    time drops to about $2^{n/2}/m$. This is the method behind real estimates of what a brute-force
    collision costs, and it is why the birthday bound, not memory, is the true limit.

## Check yourself

??? question "1. SHA-384 has a 384-bit output. What is the brute-force cost of a preimage, a second preimage and a collision?"

    $2^{384}$, $2^{384}$ and $2^{192}$. Collisions cost the square root because of the birthday bound.

??? question "2. A system gives each object a random 64-bit ID. About how many objects can it create before a repeated ID becomes a 50% risk?"

    $1.18 \cdot 2^{32} \approx 5.1$ billion. Random IDs need twice as many bits as the number of items you
    might ever have, in powers of two. That is why UUIDs carry 122 random bits.

??? question "3. Which property does each of these need: (a) storing a hash of a file to detect later tampering by someone else, (b) a certificate authority signing hashes of certificate requests that customers write, (c) committing to a guess by publishing its hash?"

    (a) Second-preimage resistance: the file exists, and an attacker needs another with the same hash.
    (b) Collision resistance: the customer writes the request, so they could prepare two colliding ones,
    exactly the 2008 rogue CA attack. (c) Preimage resistance, so nobody learns the guess, and collision
    resistance, so you cannot later open it two ways. (A guess from a small set also needs a random value
    mixed in, or anyone can hash every possible guess.)

??? question "4. A web site gives out download links of the form `?file=report.pdf&sig=SHA256(secret || \"file=report.pdf\")`. What can an attacker do?"

    Length extension. Knowing the signature and guessing the secret's length, they can compute a valid
    signature for `file=report.pdf` + padding + `&file=../../etc/passwd` or any other ending, without the
    secret. The fix is HMAC ([Chapter 10](10-Message-Authentication.md)).

??? question "5. Is SHA-512/256 open to length extension? Is SHA3-256?"

    No to both. SHA-512/256 outputs only 256 of its 512 state bits, so the attacker cannot restart from the
    digest (they would have to guess the other 256 bits). SHA3-256 never outputs its 512 capacity bits.

??? question "6. MD5 collisions take seconds. Why is HMAC-MD5 still not practically forgeable, and why should you still not choose it?"

    HMAC's security rests on the compression function behaving like a pseudorandom function with a secret
    key, which is closer to preimage resistance than to collision resistance, and no attack has turned MD5's
    collisions into HMAC forgeries. But a broken hash leaves no margin, auditors and standards reject it,
    and SHA-256 costs almost nothing more.

??? question "7. Find a collision in the first 32 bits of SHA-256 by computer. How many tries did it take, and how does that compare with the birthday estimate?"

    ```python
    import hashlib

    seen, n = {}, 0
    while True:
        h = hashlib.sha256(str(n).encode()).digest()[:4]    # first 32 bits
        if h in seen:
            break
        seen[h] = n
        n += 1
    print(seen[h], n, h.hex())
    # 69235 95303 c11eb5e6
    ```

    The strings "69235" and "95303" share the first 32 bits `c11eb5e6`, found after 95,304 tries. The estimate
    $1.18 \cdot 2^{16} \approx 77{,}000$ is the 50% point, so this run was a little unlucky, as with the 24-bit example.

??? question "8. A sponge has a 1,600-bit state. If you want 256-bit collision security, what capacity do you need, and what rate is left?"

    Two limits apply: the capacity gives at most $c/2$ bits, and an $n$-bit output gives at most $n/2$ bits
    by the birthday bound. So you need $c \ge 512$ and an output of at least 512 bits. A capacity of 512
    leaves a rate of $1600 - 512 = 1088$ bits. FIPS 202's SHA3-512 is more cautious: it uses $c = 1024$ (to
    give 512-bit preimage resistance too), which leaves a rate of only 576 bits and makes it slower.

??? question "9. You concatenate MD5 and SHA-1 for a 288-bit digest, as SSL 3.0 and TLS 1.0 did in places. Using Joux's result, roughly how much work is a collision?"

    Build $2^{80}$ MD5 multicollisions with 80 MD5 collisions (seconds each), then birthday-search among them
    for a SHA-1 collision, about $2^{80}$ SHA-1 work by brute force, or much less using SHA-1's own weaknesses.
    So the pair is about as strong as SHA-1 alone, far below the $2^{144}$ the length suggests.

??? question "10. Why does SHA-256 add the start state back after the 64 rounds (the feed-forward)? What would go wrong without it?"

    Without it the compression function is $E_m(h)$, a block cipher with the message as key. Anyone can pick
    any target output $y$ and any block $m$ and compute $h = E_m^{-1}(y)$, so they can run the chain backwards
    and find preimages easily for a chosen chaining value, which turns into meet-in-the-middle preimages of
    the whole hash in about $2^{n/2}$ work. With $f(h, m) = E_m(h) + h$, inverting needs both $h$ and the
    output to match, and that is as hard as a generic preimage.

## What you learned

- A hash has no key; its strength is that nobody can find preimages, second
  preimages or collisions. Collisions are the easiest, at $2^{n/2}$ by the
  birthday bound, so a 128-bit security level needs a 256-bit digest.
- Merkle-Damgård chains a compression function; a collision of the hash gives a
  collision of the compression function. Its digest is its full state, which
  causes length extension: never use $H(\mathit{key} \,\Vert\, m)$ as a MAC.
- MD5 and SHA-1 fell to differential collision attacks (Wang, 2004 and 2005),
  then in practice: the rogue CA (2008), Flame (2012), SHAttered (2017).
  Preimages held. Collisions are enough to forge signatures.
- SHA-2 is the everyday choice and has held for 25 years. SHA-3 is a sponge,
  unrelated in design, with no length extension and with SHAKE for any output
  length. BLAKE2 and BLAKE3 are fast alternatives without NIST status.
- Hashes are the base layer for signatures, MACs, key derivation, password
  storage, Merkle trees and post-quantum schemes.

**Next:** [Chapter 10](10-Message-Authentication.md) adds a key to the hash and
asks how to stop an attacker from changing encrypted messages.

## Further reading

- Bart Preneel, "Analysis and Design of Cryptographic Hash Functions" (PhD thesis, KU Leuven, 1993): the
  classic survey of the field before MD5 fell.
- Ralph Merkle, "One Way Hash Functions and DES", and Ivan Damgård, "A Design Principle for Hash
  Functions", both CRYPTO '89.
- Gideon Yuval, "How to Swindle Rabin", *Cryptologia* 3(3), 1979.
- Xiaoyun Wang and Hongbo Yu, "How to Break MD5 and Other Hash Functions", EUROCRYPT 2005; Wang, Yin and
  Yu, "Finding Collisions in the Full SHA-1", CRYPTO 2005.
- [Stevens, Bursztein, Karpman, Albertini and Markov, "The first collision for full SHA-1" (CRYPTO 2017)](https://eprint.iacr.org/2017/190);
  [Leurent and Peyrin, "SHA-1 is a Shambles" (USENIX Security 2020)](https://sha-mbles.github.io/).
- Antoine Joux, "Multicollisions in Iterated Hash Functions", CRYPTO 2004.
- [The Keccak team's site](https://keccak.team/keccak.html), including "Cryptographic Sponge Functions";
  FIPS 202; FIPS 180-4.
- [NIST IR 7896, the third-round report of the SHA-3 competition (2012)](https://nvlpubs.nist.gov/nistpubs/ir/2012/NIST.IR.7896.pdf).
- RFC 7693 (BLAKE2) and [the BLAKE3 paper](https://github.com/BLAKE3-team/BLAKE3-specs/blob/master/blake3.pdf).
- Jean-Philippe Aumasson, *Serious Cryptography* (2nd ed., No Starch, 2024), chapter 6, for a second
  explanation from one of BLAKE's designers.
- Appendix: [the history of the internet era](../history/08-Internet-Era.md), which places these breaks among
  the other events of the time.
