# 9. Breaking Hash Functions

*A hash function has no key to find and no plaintext to read. Breaking one means
making it do something its designers promised it never would: give up an input
for a chosen output, or give the same output for two inputs. This chapter starts
from the generic prices of those breaks, then works through the structural
weaknesses of the Merkle-Damgård design that every hash from MD4 to SHA-2 shares,
and then the differential attacks that broke MD4, MD5 and SHA-1 outright. You will
forge an MD5 tag by length extension, build sixteen thousand messages with one
hash, herd any text you like onto a digest committed in advance, find a collision
in a toy hash by following a differential path with message modification, and
trace Wang Xiaoyun's real MD5 collision step by step through all 64 steps of both
blocks. The chapter ends with the attacks that reached the real world (the rogue
certificate authority, Flame, SHAttered, the PGP impersonation) and with why SHA-2,
SHA-3 and HMAC have held.*

!!! abstract "In this chapter"
    **You will learn:**

    - the three security goals of a hash and their generic prices, $2^n$ for
      preimages and $2^{n/2}$ for collisions, and how to measure a break against them;
    - length extension, coded on a real MD5 and checked against the standard library;
    - Joux multicollisions, Kelsey and Schneier's long-message second preimages,
      and Kelsey and Kohno's herding (the Nostradamus attack), each with numbers;
    - how a differential path and message modification work, done in full on a toy
      hash, and then what Dobbertin and Wang did to MD4 and MD5;
    - chosen-prefix collisions, the 2008 rogue certificate authority and the
      Flame malware's forged Microsoft certificate;
    - SHA-1's fall from Wang's $2^{69}$ in 2005 to SHAttered in 2017 and a
      chosen-prefix collision for about \$45,000 in 2020;
    - what these attacks need from a design, and why SHA-2, the sponge (SHA-3)
      and HMAC resist them.

    **You need:** book 1's [Chapter 9](../../book/09-Hash-Functions.md) (what a hash
    is, Merkle-Damgård, SHA-256, the sponge, and the short story of MD5 and SHA-1),
    the birthday bound from [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md),
    and the idea of an XOR difference from
    [Chapter 5](05-Differential-Cryptanalysis.md). Modular addition on 32-bit
    words, and a little probability.

    **Levels:** §9.1 to §9.3 are for beginners, §9.4 to §9.7 and §9.9 to §9.12
    are intermediate, §9.8 and §9.13 are expert.

## 9.1 The problem

*Level: beginner.*

On 30 December 2008, in a lecture hall in Berlin, a group of seven researchers
showed the audience of the Chaos Communication Congress a certificate. It said that
its owner was a certificate authority, it was signed by a real commercial authority
whose root every web browser trusted, and the researchers held its private key.
With it they could have issued a certificate for any web site in the world, and
every browser would have shown the padlock. They had not stolen anything and had
not broken RSA. They had broken MD5, the hash inside the signature. The authority
had signed the hash of an ordinary certificate that the researchers had asked for;
they had built that ordinary certificate so that its MD5 matched the MD5 of a
second, very different certificate, and a signature on one hash is a signature on
both.

That is the shape of almost every real hash break. A digital signature, a software
update, a Git commit, a file checksum or a timestamp does not protect the data
itself; it protects a short digest of the data, and trusts that no one can find
other data with the same digest. Book 1's [Chapter 9](../../book/09-Hash-Functions.md)
builds hash functions and tells in a few pages how MD5 and SHA-1 fell. This chapter
is the attacker's side: what exactly an attacker tries to do to a hash, what it
costs without any cleverness, which weaknesses the common design hands over for
free, and how the differential attacks of 2004 to 2020 actually worked.

**The three goals.** A hash $H$ maps inputs of any length to $n$-bit digests. The
attacker's goals, from hardest to easiest, are:

- **Preimage.** Given a digest $y$, find any $x$ with $H(x) = y$. This breaks a
  password file of plain hashes, or a commitment.
- **Second preimage.** Given an input $x$, find a different $x'$ with
  $H(x') = H(x)$. This forges a document that someone else already signed.
- **Collision.** Find any two different inputs $x \ne x'$ with $H(x) = H(x')$.
  The attacker controls both, so this is the easiest goal, and it is enough
  whenever the attacker gets to prepare the document that someone else will sign.

A collision gives you no control over *what* the two inputs say, at first sight.
The art of the attacks in this chapter is to turn random-looking colliding blocks
into two meaningful documents: two PDFs with different text, two certificates for
different names, two programs that behave differently. Figure 9.1 shows how the
attacks arrived over thirty years.

<figure class="mars-fig">
<svg viewBox="0 0 640 452" width="640" role="img" aria-label="Timeline of attacks on hash functions from MD4 in 1990 to the chosen-prefix SHA-1 collision in 2020" fill="currentColor" font-size="14">
<line x1="82" y1="10" x2="82" y2="444" stroke="currentColor" stroke-width="1.6"/>
<text x="68" y="27" text-anchor="end" font-weight="bold">1990</text>
<circle cx="82" cy="22" r="4" fill="currentColor"/>
<text x="98" y="27">Rivest's MD4; MD5 follows in 1991</text>
<text x="68" y="54" text-anchor="end" font-weight="bold">1993</text>
<circle cx="82" cy="49" r="4" fill="currentColor"/>
<text x="98" y="54">den Boer and Bosselaers: MD5 pseudo-collisions; NSA's SHA-0</text>
<text x="68" y="81" text-anchor="end" font-weight="bold">1995</text>
<circle cx="82" cy="76" r="4" fill="currentColor"/>
<text x="98" y="81">SHA-1 replaces SHA-0 with a one-bit rotation</text>
<text x="68" y="108" text-anchor="end" font-weight="bold">1996</text>
<circle cx="82" cy="103" r="4" fill="currentColor"/>
<text x="98" y="108">Dobbertin: MD4 collisions, MD5 compression collisions</text>
<text x="68" y="135" text-anchor="end" font-weight="bold">1998</text>
<circle cx="82" cy="130" r="4" fill="currentColor"/>
<text x="98" y="135">Chabaud and Joux: SHA-0 collisions in theory, 2⁶¹</text>
<text x="68" y="162" text-anchor="end" font-weight="bold">2004</text>
<circle cx="82" cy="157" r="4" fill="currentColor"/>
<text x="98" y="162">Joux: multicollisions. Wang's team: MD4 and MD5 collisions</text>
<text x="68" y="189" text-anchor="end" font-weight="bold">2005</text>
<circle cx="82" cy="184" r="4" fill="currentColor"/>
<text x="98" y="189">Wang, Yin, Yu: SHA-1 in 2⁶⁹. Kelsey, Schneier: second preimages</text>
<text x="68" y="216" text-anchor="end" font-weight="bold">2006</text>
<circle cx="82" cy="211" r="4" fill="currentColor"/>
<text x="98" y="216">Kelsey and Kohno: herding. Klima: MD5 collisions in a minute</text>
<text x="68" y="243" text-anchor="end" font-weight="bold">2007</text>
<circle cx="82" cy="238" r="4" fill="currentColor"/>
<text x="98" y="243">Stevens, Lenstra, de Weger: MD5 chosen-prefix collisions</text>
<text x="68" y="270" text-anchor="end" font-weight="bold">2008</text>
<circle cx="82" cy="265" r="4" fill="currentColor"/>
<text x="98" y="270">A rogue certificate authority from 200 PlayStation 3s</text>
<text x="68" y="297" text-anchor="end" font-weight="bold">2012</text>
<circle cx="82" cy="292" r="4" fill="currentColor"/>
<text x="98" y="297">Flame forges a Microsoft signature; Keccak wins SHA-3</text>
<text x="68" y="324" text-anchor="end" font-weight="bold">2015</text>
<circle cx="82" cy="319" r="4" fill="currentColor"/>
<text x="98" y="324">SHA-3 published (FIPS 202); a free-start SHA-1 collision</text>
<text x="68" y="351" text-anchor="end" font-weight="bold">2017</text>
<circle cx="82" cy="346" r="4" fill="currentColor"/>
<text x="98" y="351">SHAttered: the first SHA-1 collision, two PDFs</text>
<text x="68" y="378" text-anchor="end" font-weight="bold">2020</text>
<circle cx="82" cy="373" r="4" fill="currentColor"/>
<text x="98" y="378">SHA-1 is a Shambles: chosen prefixes, PGP keys</text>
<text x="68" y="405" text-anchor="end" font-weight="bold">2022</text>
<circle cx="82" cy="400" r="4" fill="currentColor"/>
<text x="98" y="405">NIST sets the end of SHA-1: 31 December 2030</text>
<text x="68" y="432" text-anchor="end" font-weight="bold">today</text>
<circle cx="82" cy="427" r="4" fill="currentColor"/>
<text x="98" y="432">SHA-2 and SHA-3: attacks on reduced rounds only</text>
</svg>
<figcaption>Figure 9.1. Thirty years of hash cryptanalysis. The structural attacks (multicollisions, second preimages, herding) came in 2004 to 2006 and apply to every Merkle-Damgård hash; the differential attacks broke MD4, MD5 and SHA-1 and never got close to SHA-2.</figcaption>
</figure>

**What counts as a break.** As with ciphers ([Chapter 1](01-What-Cryptanalysis-Is.md)),
a hash is "broken" when some attack beats the generic price of its goal. Wang's
2005 attack on SHA-1 was a break although nobody could afford to run it: it
promised a collision in about $2^{69}$ steps against the $2^{80}$ that the
160-bit digest is supposed to cost. Twelve years later, after the method had been
refined, a collision was found in $2^{63.1}$. The pattern repeats through this
chapter: a theoretical break first, a warning that is mostly ignored, and a
practical attack years later against systems that never moved.

**What breaking needs.** Hash attacks are offline and need no secrets, so the
attacker's costs are only time and memory. A collision attack also has a
*setting*: does it start from the hash's fixed initial value with the same prefix
for both messages (an **identical-prefix** collision), from two different prefixes
of the attacker's choice (a **chosen-prefix** collision, much more useful and
much harder), or from a starting state the attacker picks freely (a **free-start**
collision, which breaks the compression function but not the hash)? Each of these
settings will appear, and the difference between them is worth millions of dollars
of computing.

## 9.2 Generic prices on a short hash

*Level: beginner.*

The generic attacks treat the hash as a black box. They are the floor every clever
attack is measured against.

**Preimages cost $2^n$.** For a target $y$, try inputs $x_1, x_2, \dots$ until one
hashes to $y$. Each try succeeds with probability $2^{-n}$, so the expected number
of tries is $2^n$. A second preimage costs the same, since knowing $x$ helps a
black-box attacker not at all (except for long messages, which §9.5 exploits).

**Collisions cost about $2^{n/2}$.** Hash inputs and remember the outputs until two
match. After $q$ tries there are $q(q-1)/2$ pairs, each colliding with probability
$2^{-n}$, so the expected number of colliding pairs is about $q^2 / 2^{n+1}$, and
a collision becomes likely once $q \approx \sqrt{\pi/2} \cdot 2^{n/2} \approx 1.25
\cdot 2^{n/2}$. [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md) derives
this bound properly, with both directions, and shows Pollard's rho and parallel
collision search, which find collisions in the same time with almost no memory.
This chapter just uses the result.

The square root is the reason hash digests are twice as long as cipher keys. A
128-bit key resists search for $2^{128}$ steps, but a 128-bit hash gives only
$2^{64}$ against collisions, which large organizations could afford in the 2010s.
That is why SHA-256, with $2^{128}$ collision resistance, is paired with AES-128,
and why a 160-bit SHA-1 was meant to give $2^{80}$.

**Code it.** SHA-256 cut down to its first few bits is a hash you can attack
with a laptop. The same million or two of hash calls buys a preimage of a 20-bit
digest or a collision of a 40-bit one.

```python
import hashlib

def h(data, bits):                       # SHA-256 cut down to its first `bits` bits
    d = int.from_bytes(hashlib.sha256(data).digest(), "big")
    return d >> (256 - bits)

# A preimage of a 20-bit hash: try inputs until one hits the target.
target = h(b"the password is mars", 20)
tries = 0
while True:
    tries += 1
    if h(b"guess %d" % tries, 20) == target:
        break
print("20-bit preimage after", tries, "tries")

# A collision of a 40-bit hash: remember every output until one repeats.
seen = {}
i = 0
while True:
    i += 1
    x = b"msg %d" % i
    d = h(x, 40)
    if d in seen:
        break
    seen[d] = x
print("40-bit collision after", i, "tries:", seen[d], x, "%010x" % d)
```

```
20-bit preimage after 754729 tries
40-bit collision after 1965946 tries: b'msg 542861' b'msg 1965946' 03054b5df9
```

The preimage took $754{,}729 \approx 2^{19.5}$ tries against an expected $2^{20}$;
the collision took $1{,}965{,}946 \approx 2^{20.9}$ against an expected
$1.25 \cdot 2^{20} \approx 2^{20.3}$. Both are ordinary luck. Doubling the digest
length squares the price of a collision: 80 bits would need about a million times
this much work, and 160 bits a million million times that.

**How breaks are priced.** A collision attack on SHA-1 "in $2^{63}$" means about
$2^{63}$ evaluations of SHA-1's compression function, or work equal to that. The
unit hides a lot: a differential attack spends most of its time on partial
computations and condition checks, and it runs on GPUs in a way that a birthday
search may not. Papers therefore also report the real cost of a run, in CPU-years,
GPU-years or rented dollars, and the comparisons in this chapter use both.

**In the real world.** The generic collision attack alone has broken real
systems whenever a digest was cut short. A 64-bit truncated hash, as used for
deduplication or short identifiers, collides after about four billion inputs, a
few minutes on one machine. Book 1 tells how Sweet32 turned the same arithmetic
into an attack on 64-bit block ciphers. And the generic price is what remains for
the hashes nobody has broken: the best known collision attack on SHA-256 is still
the birthday search, at about $2^{128}$.

## 9.3 Length extension

*Level: beginner.*

The first weakness of Merkle-Damgård needs no cryptanalysis at all. A Merkle-Damgård
hash splits the padded message into blocks $m_1, \dots, m_\ell$ and runs

$$
h_0 = \mathit{IV}, \qquad h_i = f(h_{i-1}, m_i), \qquad H(M) = h_\ell .
$$

The digest *is* the final chaining value. Anyone who knows $H(M)$ and the length of
$M$ can therefore carry on hashing from where $M$ stopped, and compute
$H(M \,\Vert\, \mathit{pad}(M) \,\Vert\, X)$ for any $X$, without knowing $M$.
That is harmless for a plain checksum. It is fatal when someone builds a message
authentication code as $H(\mathit{key} \,\Vert\, \mathit{message})$, because the
attacker extends a genuine tag into a valid tag for a longer message the key holder
never saw.

Book 1 does this against SHA-256 ([§9.7](../../book/09-Hash-Functions.md)). Here
it is against MD5, the hash of most of the real cases, with MD5 written out so that
you can see the chaining value being loaded. The program first checks its MD5
against `hashlib`, then forges a tag.

**By hand: the glue.** MD5 pads a message of $L$ bytes with one `0x80` byte, then
zero bytes up to 56 mod 64, then the bit length $8L$ as a 64-bit little-endian
number. With a 14-byte secret and the 24-byte message
`file=report.pdf&user=jim`, $L = 38$, so the padding is `0x80`, 17 zero bytes, and
$8 \cdot 38 = 304 = \mathtt{0x130}$, written as the bytes `30 01 00 00 00 00 00 00`.
That brings the total to 64 bytes, one block. The attacker's extra text starts the
second block, and the final padding must count all $64 + 11 = 75$ bytes.

```python
import hashlib, math, os, struct

S = [7, 12, 17, 22] * 4 + [5, 9, 14, 20] * 4 + [4, 11, 16, 23] * 4 + [6, 10, 15, 21] * 4
K = [int(abs(math.sin(i + 1)) * 2**32) & 0xffffffff for i in range(64)]
IV = (0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476)

def rotl(x, s):
    return (x << s | x >> (32 - s)) & 0xffffffff

def compress(h, block):                  # MD5's compression function: 4 words + 64 bytes -> 4 words
    m = struct.unpack("<16I", block)
    a, b, c, d = h
    for i in range(64):
        if i < 16:   f, g = (b & c) | (~b & d), i
        elif i < 32: f, g = (d & b) | (~d & c), (5 * i + 1) % 16
        elif i < 48: f, g = b ^ c ^ d, (3 * i + 5) % 16
        else:        f, g = c ^ (b | ~d & 0xffffffff), 7 * i % 16
        a, b, c, d = d, (b + rotl((a + f + K[i] + m[g]) & 0xffffffff, S[i])) & 0xffffffff, b, c
    return tuple((x + y) & 0xffffffff for x, y in zip(h, (a, b, c, d)))

def pad(n):                              # the bytes MD5 appends to an n-byte message
    return b"\x80" + b"\x00" * ((55 - n) % 64) + struct.pack("<Q", 8 * n)

def md5(data, h=IV, done=0):             # hash `data`, starting from state h after `done` bytes
    data += pad(done + len(data))
    for i in range(0, len(data), 64):
        h = compress(h, data[i:i + 64])
    return struct.pack("<4I", *h)

print(md5(b"abc").hex() == hashlib.md5(b"abc").hexdigest())

# The server's "MAC": MD5(secret || message). The attacker never sees the secret.
secret = os.urandom(14)
msg = b"file=report.pdf&user=jim"
tag = hashlib.md5(secret + msg).digest()

# The attacker knows msg and tag, and guesses the secret is 14 bytes long.
extra = b"&user=admin"
glue = pad(14 + len(msg))
state = struct.unpack("<4I", tag)        # the tag IS the chaining value
forged = msg + glue + extra
forged_tag = md5(extra, state, 14 + len(msg) + len(glue))

print(forged)
print(hashlib.md5(secret + forged).digest() == forged_tag)
```

```
True
b'file=report.pdf&user=jim\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x000\x01\x00\x00\x00\x00\x00\x00&user=admin'
True
```

The `0` before `\x01` in the printout is the byte `0x30`, which Python shows as the
character it codes. The secret is random on every run, and the last line is `True`
every time: the server, hashing its secret and the forged message from scratch,
passes through exactly the chaining value that the attacker loaded from the tag.

**What the attacker needed.** Only the length of the secret, and even that can be
guessed: try every length from 1 to 64 and submit each forgery, or use the server's
answers as an oracle. The forged message carries the old padding as junk in the
middle. Whether that matters depends on the parser; a query-string parser that
keeps the last value of a repeated key, as many do, reads `user=admin`.

**In the real world.** In September 2009 Thai Duong and Juliano Rizzo showed that
Flickr's web API signed requests as the MD5 of a shared secret followed by the
request's parameters. Anyone who saw one signed request could append parameters
and sign the result, and so act with another application's authority. The same
mistake turned up in other APIs of the time. The attack is a property of the
structure, not of MD5: SHA-1 and SHA-256 extend in exactly the same way.

**Fix it.** Three fixes, all standard:

- **Use HMAC** (RFC 2104, FIPS 198-1). HMAC hashes the key, then the message, and
  then hashes that result again under the key, so the tag is not a chaining value
  of any computation the attacker can continue (§9.12).
- **Truncate the output.** SHA-512/256 and SHA-384 output only part of the final
  state, so the attacker cannot load it. A truncated digest of $d$ bits from a
  $w$-bit state leaves $w - d$ bits to guess.
- **Use a sponge.** SHA-3 and its relatives never output the capacity part of
  their state, so length extension is impossible by design (§9.11). KMAC (SP 800-185)
  is SHA-3's keyed mode, and $\text{SHA3}(\mathit{key} \,\Vert\, m)$ is a sound MAC.

!!! note "Life story: the length-extension attack"
    **Born:** a property of Merkle-Damgård, pointed out for secret-prefix MACs
    by the early 1990s (Gene Tsudik, 1992); one reason Bellare, Canetti and
    Krawczyk designed HMAC (1996) · **Purpose:**
    to forge $H(\mathit{key} \,\Vert\, m)$ tags without the key · **Helped:**
    the Flickr API forgery (Duong and Rizzo, 2009) and similar breaks of
    home-made API signatures; a standard exercise in every cryptography course
    · **Status:** works on MD5, SHA-1, SHA-256 and SHA-512 today; fixed by HMAC,
    by truncated SHA-2 outputs and by the sponge

## 9.4 Multicollisions

*Level: intermediate.*

A random function with $n$-bit outputs gives up a collision for $2^{n/2}$ work. How
much for a **$2^k$-way multicollision**, $2^k$ different inputs that all share one
output? For a random function the answer is about
$2^{n(2^k - 1)/2^k}$, close to $2^n$ for large $k$: getting many inputs to land on
the same point takes nearly as long as a preimage. In 2004 Antoine Joux, then at the
French government's information security agency (DCSSI), showed that for any Merkle-Damgård
hash the answer is only $k \cdot 2^{n/2}$. The attack is short enough to state in
two lines.

**The method.** From the initial value $h_0$, use a birthday search to find two
blocks $m_1 \neq m_1'$ with $f(h_0, m_1) = f(h_0, m_1') = h_1$. From $h_1$, find
$m_2 \neq m_2'$ with $f(h_1, m_2) = f(h_1, m_2') = h_2$. Repeat $k$ times. Every one
of the $2^k$ messages

$$
m_1^{(\prime)} \,\Vert\, m_2^{(\prime)} \,\Vert\, \cdots \,\Vert\, m_k^{(\prime)}
$$

that picks one block of each pair passes through $h_1, h_2, \dots, h_k$ and ends at
the same digest. Since all have the same length, the padding block is the same
too. The cost is $k$ birthday searches, $k \cdot 2^{n/2}$. Figure 9.2 shows the
chain.

<figure class="mars-fig">
<svg viewBox="0 0 640 170" width="640" role="img" aria-label="A Joux multicollision: a chain of chaining values h0 to h4, with two different message blocks between each neighboring pair, giving 16 messages with the same hash" fill="currentColor" font-size="14">
<circle cx="50" cy="80" r="22" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="50" y="85" text-anchor="middle">h₀</text>
<circle cx="190" cy="80" r="22" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="190" y="85" text-anchor="middle">h₁</text>
<circle cx="330" cy="80" r="22" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="330" y="85" text-anchor="middle">h₂</text>
<circle cx="470" cy="80" r="22" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="470" y="85" text-anchor="middle">h₃</text>
<circle cx="600" cy="80" r="22" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="600" y="85" text-anchor="middle">h₄</text>
<path d="M70 70 Q120 25 170 70" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M70 90 Q120 135 170 90" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="120" y="38" text-anchor="middle">m₁</text>
<text x="120" y="134" text-anchor="middle">m₁′</text>
<path d="M210 70 Q260 25 310 70" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M210 90 Q260 135 310 90" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="260" y="38" text-anchor="middle">m₂</text>
<text x="260" y="134" text-anchor="middle">m₂′</text>
<path d="M350 70 Q400 25 450 70" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M350 90 Q400 135 450 90" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="400" y="38" text-anchor="middle">m₃</text>
<text x="400" y="134" text-anchor="middle">m₃′</text>
<path d="M490 70 Q535 25 580 70" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M490 90 Q535 135 580 90" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="535" y="38" text-anchor="middle">m₄</text>
<text x="535" y="134" text-anchor="middle">m₄′</text>
<text x="320" y="162" text-anchor="middle" font-size="13">4 birthday searches; 2 × 2 × 2 × 2 = 16 paths, all ending at h₄</text>
</svg>
<figcaption>Figure 9.2. Joux's multicollision. Each step is one ordinary collision of the compression function from the previous chaining value. Because Merkle-Damgård only carries the chaining value forward, the choices at the steps are independent, and k collisions give 2ᵏ colliding messages.</figcaption>
</figure>

**Why it matters: concatenated hashes.** Joux's target was an old idea: if MD5 and
SHA-1 might each be weak, use $H_1(M) \,\Vert\, H_2(M)$ and hope for the strength
of both together, $2^{(n_1 + n_2)/2}$ against collisions. SSL 3.0 and TLS 1.0 and
1.1 combined MD5 and SHA-1 in this spirit in places. Joux's attack: build a
$2^{n_2/2}$-way multicollision for $H_1$ (cost $\frac{n_2}{2} 2^{n_1/2}$), then
hash all $2^{n_2/2}$ messages with $H_2$. By the birthday bound two of them
probably collide under $H_2$ too, and they already collide under $H_1$. The total
is about

$$
\tfrac{n_2}{2} \cdot 2^{n_1/2} + 2^{n_2/2},
$$

barely more than attacking the stronger of the two alone. The same trick gives
preimages of the concatenation at roughly the price of a preimage of the stronger
hash. Concatenation does not add security against a Merkle-Damgård attacker; it
only adds digest bits.

**Code it.** Two toy hashes with 24-bit chaining values, made from SHA-256 with
different tags so that they are unrelated. Their concatenation has 48 bits, and a
generic birthday search on it would take about $2^{24} \approx 16.8$ million
calls.

```python
import hashlib, itertools

N = 24                                   # chaining values of 24 bits: a toy, but a real MD hash

def f(tag, h, block):                    # a compression function made from SHA-256
    d = hashlib.sha256(tag + h.to_bytes(3, "big") + block).digest()
    return int.from_bytes(d[:3], "big")

def H(tag, blocks, h=0):                 # Merkle-Damgard over whole blocks (no padding, for clarity)
    for b in blocks:
        h = f(tag, h, b)
    return h

calls = 0

def collide(tag, h):                     # birthday search: two blocks that take h to the same value
    global calls
    seen, i = {}, 0
    while True:
        b = i.to_bytes(8, "big")
        v = f(tag, h, b)
        calls += 1
        if v in seen:
            return seen[v], b, v
        seen[v] = b
        i += 1

# Joux: k collisions in a row give 2**k messages with the same H1.
k, h, pairs = 14, 0, []
for _ in range(k):
    b0, b1, h = collide(b"one", h)
    pairs.append((b0, b1))
print("built", 2**k, "messages with H1 =", hex(h), "in", calls, "calls")

# Among them, look for two that also collide under a second hash H2.
seen = {}
for choice in itertools.product((0, 1), repeat=k):
    m = [pairs[i][c] for i, c in enumerate(choice)]
    v = H(b"two", m)
    if v in seen:
        break
    seen[v] = m
m1, m2 = seen[v], m
print("H1:", hex(H(b"one", m1)), hex(H(b"one", m2)))
print("H2:", hex(H(b"two", m1)), hex(H(b"two", m2)))
print("tried", len(seen) + 1, "of", 2**k, "messages")
```

```
built 16384 messages with H1 = 0xb3bc75 in 70922 calls
H1: 0xb3bc75 0xb3bc75
H2: 0x8372dc 0x8372dc
tried 4737 of 16384 messages
```

The fourteen collisions cost 70,922 calls, about $2^{12}$ each as the birthday
bound predicts. The second phase hashed 4,737 messages of 14 blocks, about 66,000
more calls. In all some 137,000 compression calls found a collision of the 48-bit
concatenation, 120 times fewer than the generic $2^{24}$; at real sizes the gap is
astronomically wider. For MD5 and SHA-1 concatenated ($n_1 = 128$, $n_2 = 160$) the
estimate is $80 \cdot 2^{64} + 2^{80} \approx 2^{80.6}$, not $2^{144}$, and with
Wang's attacks in place of the birthday searches it is much less.

**What it teaches.** Joux's paper did not break any deployed hash. It broke an
assumption: that a Merkle-Damgård hash behaves like a random function in every
respect except possibly collisions. Multicollisions are a statement about the
*iteration*, true whatever the compression function, and they became the tool for
the next two attacks.

!!! note "Life story: Joux multicollisions"
    **Born:** 2004, Antoine Joux, published at CRYPTO 2004 · **Purpose:** to show
    that iterated hashes give many-way collisions at the price of a few ordinary
    ones · **Helped:** killed the idea that concatenating hashes adds strength;
    led directly to long-message second preimages (2005) and herding (2006), and
    to the SHA-3 competition's demand for wider internal states · **Status:**
    applies to every Merkle-Damgård hash; blocked by a chaining value much wider
    than the digest (wide-pipe designs, SHA-512/256) and by sponges with a large
    capacity

## 9.5 Second preimages, herding and Nostradamus

*Level: intermediate.*

A second preimage should cost $2^n$. For short messages it does. But a long message
of $2^\ell$ blocks passes through $2^\ell$ chaining values, and an attacker who hits
*any* of them with a block of their own has a foothold: hash some prefix of their
own, find a block that takes it to the long message's chaining value $h_i$, and
then copy the long message from block $i+1$ on. Hitting one of $2^\ell$ targets
costs only $2^{n - \ell}$.

**Why it does not work directly, and Kelsey and Schneier's fix.** The copied tail
ends with the original padding, which encodes the original length. The forged
message has a different number of blocks before $h_i$, so its padding block is
different and the final digests disagree. This **Merkle-Damgård strengthening**,
putting the length in the last block, was what made the simple attack fail; it was
noted by Ralph Merkle and Ivan Damgård in 1989, and Richard Dean described fixed
points of Davies-Meyer compression functions as a way around it in his 1999 thesis.
In 2005 John Kelsey (NIST) and Bruce Schneier built a general way around it with
**expandable messages**: a set of messages, one of every length from $k$ to
$k + 2^k - 1$ blocks, that all end at the same chaining value.

An expandable message is a Joux chain with a twist. At step $j$, find a collision
between a 1-block message and a $(2^{j} + 1)$-block message, both starting from the
current chaining value; the long one is $2^j$ dummy blocks followed by a block found
by the birthday search. After $k$ steps, choosing the short or long option at each
step gives every length from $k$ to $k + 2^k - 1$, all ending at the same value. It
costs about $k \cdot 2^{n/2}$ plus the dummy blocks.

**The attack.** Build an expandable message ending at $\hat h$. Search for a block
$b$ with $f(\hat h, b) = h_i$ for some $i$ in the target's chain: $2^{n - \ell}$
tries. Pick the expandable message's length so that the forged prefix has exactly
$i - 1$ blocks, append $b$, and copy the rest. The forgery has the same length as
the original, the same padding, and the same digest. For a hash with $n$ bits and
a target of $2^\ell$ blocks the cost is about

$$
k \cdot 2^{n/2+1} + 2^{n - \ell}.
$$

For SHA-1 and a message of $2^{60}$ bytes ($2^{54}$ blocks), Kelsey and Schneier
gave about $2^{106}$ work instead of $2^{160}$. Nobody hashes $2^{60}$ bytes, and
the attack is not a practical threat. It is a clean proof that "$n$-bit second
preimage resistance" for a Merkle-Damgård hash quietly holds only for short
messages. That is why FIPS 202, in its comparison of security strengths, lists
SHA-256's second-preimage strength as $256 - L(M)$ bits, where $L(M)$ is the
base-2 logarithm of the message length in blocks.

### Herding: the Nostradamus attack

In 2006 John Kelsey and Tadayoshi Kohno asked a sharper question. Suppose someone
publishes a hash $y$ today, as a commitment to a prediction, and later reveals a
message that hashes to $y$. Can a cheat publish $y$ first and then make *any* later
prediction, with the actual outcome written in, hash to it? This is **herding**,
and they named the use of it the **Nostradamus attack**. It is harder than a
collision (the attacker must commit to $y$ before knowing the prefix) and easier
than a preimage (the attacker chooses $y$).

**The diamond structure.** Start with $2^k$ different chaining values, the leaves.
Pair them up and, for each pair $(h_a, h_b)$, find blocks $b_a, b_b$ with
$f(h_a, b_a) = f(h_b, b_b)$: a collision between two different starting points,
which costs about $2^{n/2}$ like any birthday search. That leaves $2^{k-1}$ values.
Pair those, and so on, until a single root remains after $k$ levels. Hash the root
with a final block to get $y$ and publish it. Figure 9.3 shows a small diamond.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A diamond structure for herding: eight leaf chaining values are merged pairwise in three levels to one root, which gives the committed digest; later a prefix is linked by one block to one of the leaves" fill="currentColor" font-size="14">
<rect x="10" y="118" width="96" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="58" y="136" text-anchor="middle" font-size="13">any prefix P</text>
<text x="58" y="152" text-anchor="middle" font-size="13">(chosen later)</text>
<line x1="106" y1="138" x2="210" y2="166" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4"/>
<text x="150" y="190" text-anchor="middle" font-size="12">link block:</text>
<text x="150" y="206" text-anchor="middle" font-size="12">2ⁿ⁻ᵏ tries</text>
<circle cx="220" cy="30" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="64" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="98" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="132" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="166" r="8" fill="currentColor" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="200" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="234" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="268" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="320" cy="47" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="320" cy="115" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="320" cy="183" r="8" fill="currentColor" stroke="currentColor" stroke-width="1.4"/>
<circle cx="320" cy="251" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="420" cy="81" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="420" cy="217" r="8" fill="currentColor" stroke="currentColor" stroke-width="1.4"/>
<circle cx="510" cy="149" r="9" fill="currentColor" stroke="currentColor" stroke-width="1.4"/>
<line x1="228" y1="30" x2="312" y2="47" stroke="currentColor" stroke-width="1.2"/>
<line x1="228" y1="64" x2="312" y2="47" stroke="currentColor" stroke-width="1.2"/>
<line x1="228" y1="98" x2="312" y2="115" stroke="currentColor" stroke-width="1.2"/>
<line x1="228" y1="132" x2="312" y2="115" stroke="currentColor" stroke-width="1.2"/>
<line x1="228" y1="166" x2="312" y2="183" stroke="currentColor" stroke-width="2.6"/>
<line x1="228" y1="200" x2="312" y2="183" stroke="currentColor" stroke-width="1.2"/>
<line x1="228" y1="234" x2="312" y2="251" stroke="currentColor" stroke-width="1.2"/>
<line x1="228" y1="268" x2="312" y2="251" stroke="currentColor" stroke-width="1.2"/>
<line x1="328" y1="47" x2="412" y2="81" stroke="currentColor" stroke-width="1.2"/>
<line x1="328" y1="115" x2="412" y2="81" stroke="currentColor" stroke-width="1.2"/>
<line x1="328" y1="183" x2="412" y2="217" stroke="currentColor" stroke-width="2.6"/>
<line x1="328" y1="251" x2="412" y2="217" stroke="currentColor" stroke-width="1.2"/>
<line x1="428" y1="81" x2="501" y2="149" stroke="currentColor" stroke-width="1.2"/>
<line x1="428" y1="217" x2="501" y2="149" stroke="currentColor" stroke-width="2.6"/>
<line x1="519" y1="149" x2="560" y2="149" stroke="currentColor" stroke-width="1.6"/>
<rect x="560" y="132" width="70" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="595" y="154" text-anchor="middle">y</text>
<text x="510" y="128" text-anchor="middle" font-size="12">root</text>
<text x="595" y="186" text-anchor="middle" font-size="12">published</text>
<text x="595" y="201" text-anchor="middle" font-size="12">first</text>
<text x="220" y="292" text-anchor="middle" font-size="12">2ᵏ leaves</text>
<text x="370" y="292" text-anchor="middle" font-size="12">each join: one birthday search</text>
</svg>
<figcaption>Figure 9.3. The diamond structure with k = 3. Each pair of chaining values is merged by a collision from two different starting points, so every leaf has a path of k blocks to the root. The attacker publishes y, later hashes any prefix and searches for one block that lands on any of the 2ᵏ leaves; the thick path then leads to y.</figcaption>
</figure>

**Herding.** Later, the attacker writes the real prediction $P$, hashes it to $h_P$,
and searches for a linking block $b$ with $f(h_P, b)$ equal to *any* of the $2^k$
leaves: $2^{n-k}$ tries. From that leaf the diamond's path leads to the root, and
the final block leads to $y$. The message is $P \,\Vert\, b \,\Vert\, (k \text{ diamond
blocks}) \,\Vert\, \text{final block}$.

Building the diamond naively costs $2^k$ birthday searches, $2^{k + n/2}$ in all.
Kelsey and Kohno build each level more cleverly, hashing about $2^{(n-k)/2}$
candidates from every node at once and matching across all of them, which brings
the diamond to about $2^{(n+k)/2 + 2}$. Balancing that against the linking cost
$2^{n-k}$ gives $k \approx n/3$ and a total near $2^{2n/3}$. For MD5 that is about
$2^{87}$, for SHA-1 about $2^{108}$ (or much less with differential collisions in
place of the birthday searches). Expensive, but far below the $2^n$ that a
commitment is supposed to cost.

**Code it.** A 24-bit toy with $k = 8$: a diamond of 256 leaves, built naively.
The prediction is written only after the digest is printed.

```python
import hashlib

def f(h, block):                         # toy 24-bit compression function
    d = hashlib.sha256(h.to_bytes(3, "big") + block).digest()
    return int.from_bytes(d[:3], "big")

def pair(h1, h2, salt):                  # find blocks b1, b2 with f(h1, b1) == f(h2, b2)
    table = {f(h1, b"%s a%d" % (salt, i)): b"%s a%d" % (salt, i) for i in range(4096)}
    i = 0
    while True:
        b2 = b"%s b%d" % (salt, i)
        v = f(h2, b2)
        if v in table:
            return table[v], b2, v
        i += 1

# Build the diamond: 2**k leaves, paired level by level down to one root.
k = 8
leaves = list(range(1000, 1000 + 2**k))  # any distinct starting values will do
level, step = leaves, {}                 # step[h] = (block, next h) on the way to the root
while len(level) > 1:
    nxt = []
    for j in range(0, len(level), 2):
        b1, b2, v = pair(level[j], level[j + 1], b"%d" % level[j])
        step[level[j]], step[level[j + 1]] = (b1, v), (b2, v)
        nxt.append(v)
    level = nxt
root = level[0]
print("commit to: %06x" % f(root, b"END"))

# Later: any prefix at all, then one linking block into a leaf, then the diamond path.
prefix = b"Prediction: a global dust storm will cover Mars in 2027."
h = f(0, prefix)
leafset, i = set(leaves), 0
while True:
    link = b"link %d" % i
    if f(h, link) in leafset:
        break
    i += 1
blocks, h = [prefix, link], f(h, link)
while h != root:
    b, h = step[h]
    blocks.append(b)
blocks.append(b"END")

h = 0
for b in blocks:
    h = f(h, b)
print("message hashes to: %06x after %d linking tries" % (h, i + 1))
```

```
commit to: 0b4057
message hashes to: 0b4057 after 46788 linking tries
```

The diamond took 255 birthday searches of about $2^{13}$ calls each, some two
million in all, and the linking search took 46,788 tries against an expected
$2^{24 - 8} = 65{,}536$. Change the prediction to anything else and the program
still lands on `0b4057`. A preimage of a 24-bit hash would have taken about 16.8
million tries *per prediction*; the diamond is built once and reused.

**The real Nostradamus.** In November 2007, a year before the US presidential
election, Marc Stevens, Arjen Lenstra and Benne de Weger published the MD5 hash of
a PDF that, they said, named the winner. They had in fact made twelve PDFs, one for
each plausible candidate, all with the same MD5, using the chosen-prefix collisions
of §9.8 rather than a diamond, and computed with a Sony PlayStation 3. The stunt
worked because chosen-prefix collisions, though not a herding attack, give the
same practical power over a small, known set of outcomes. Real commitment schemes
add a random value chosen after the commitment's structure is fixed, or simply use
a hash with no known collisions.

!!! note "Life story: long-message second preimages and herding"
    **Born:** 2005 (Kelsey and Schneier, EUROCRYPT 2005: expandable messages and
    second preimages for long messages) and 2006 (Kelsey and Kohno, EUROCRYPT
    2006: the diamond structure and the Nostradamus attack), both building on
    Joux · **Purpose:** to show that Merkle-Damgård's second-preimage and
    commitment security fall short of $2^n$ · **Helped:** shaped the SHA-3
    competition's requirements and the analysis of dithered and wide-pipe
    designs; the diamond structure reappears in many later generic attacks ·
    **Status:** theoretical against full-size hashes; no deployed system has
    been attacked this way

## 9.6 The differential path method

*Level: intermediate.*

The structural attacks treat the compression function as a black box and win only
by reusing it cleverly. The attacks that actually broke MD4, MD5 and SHA-1 opened
the box. They are differential cryptanalysis
([Chapter 5](05-Differential-Cryptanalysis.md)) turned on a compression function,
with one large advantage over attacking a cipher: there is no key. The attacker
knows every intermediate value and can choose the message words to steer them.

**The setting.** MD4, MD5 and SHA-1 all update a small state with one message word
per step. MD5, for example, has four 32-bit words and 64 steps; step $t$ computes
a new word

$$
Q_{t} = Q_{t-1} + \bigl( Q_{t-4} + F_t(Q_{t-1}, Q_{t-2}, Q_{t-3}) + K_t + W_t \bigr) \lll s_t ,
$$

where $W_t$ is one of the 16 message words, $F_t$ a bitwise Boolean function and
$\lll$ a rotation. Take two messages $M$ and $M'$ whose words differ by chosen
amounts. A **differential path** says, for every step, what the difference between
the two computations' state words will be. The attack wants a path whose final
difference is zero (a collision) or a small planned value that the next block can
cancel.

**Which difference.** Wang used **modular differences** $\delta X = X' - X \bmod 2^{32}$
for additions and **signed bit differences** (which bits flip, and in which
direction) for the Boolean functions and rotations. Modular differences pass
through additions with probability 1: if $\delta A = \alpha$ and $\delta B = \beta$,
then $\delta(A+B) = \alpha + \beta$ always. XOR differences, the natural choice for
ciphers, pass through modular additions only with some probability. Bit 31 is
special: adding $2^{31}$ flips the top bit and never carries, so a difference of
$2^{31}$ is the same in both views and survives additions with no conditions. Wang's
paths use it heavily.

**Conditions.** Where a difference meets a Boolean function, the outcome depends on
the other inputs. Take the "if" function of MD4's and MD5's first round,
$F(x, y, z) = (x \wedge y) \vee (\neg x \wedge z)$: bit $j$ of $x$ chooses between
bit $j$ of $y$ and of $z$. If $x$ has a difference in bit $j$:

- when $y_j = z_j$, the output does not change at all (the difference is
  **absorbed**);
- when $y_j \neq z_j$, the output bit flips (the difference **passes**).

If instead $y$ has the difference, it is absorbed when $x_j = 0$ and passes when
$x_j = 1$; for $z$ the other way round. Each of these is a **condition** on a
single state bit, holding for a random message with probability $1/2$. A path is
a list of differences plus a list of conditions, and a message pair follows the
path exactly when all conditions hold. With $c$ conditions, a random message
follows it with probability about $2^{-c}$.

**Message modification.** Here is the advantage. In the first 16 steps of MD4 or
MD5, the message words enter one per step in order. Rearranging the step equation,

$$
W_t = \bigl( (Q_t - Q_{t-1}) \ggg s_t \bigr) - Q_{t-4} - F_t(Q_{t-1}, Q_{t-2}, Q_{t-3}) - K_t ,
$$

so the attacker can choose *any* values for $Q_0, \dots, Q_{15}$ and compute the
message words that produce them. Choose the state words so that every first-round
condition holds, and the first round of the path holds with probability 1. That is
**single-message modification**. Only the conditions of the later rounds, where
the message words come back in a scrambled order and can no longer be set freely,
are left to chance. Wang went further, with **multi-message modification**: change
a first-round word in a way that fixes one second-round condition and repairs the
first-round conditions it disturbs. Later work added **tunnels** (Klima, 2006) and
**neutral bits** (Biham and Chen, 2004): changes to the message that provably
leave the conditions so far untouched, so that each trial of the last rounds is
nearly free.

### By hand: a local collision in a toy hash

The idea is easiest to see on a hash small enough to print. The toy has 16-bit
words, a state of four words, eight message words and 32 steps in four rounds of
eight. Step $t$ computes

$$
Q_t = \bigl( Q_{t-4} + F_r(Q_{t-1}, Q_{t-2}, Q_{t-3}) + W_{\sigma_r(t)} + K_r \bigr) \lll s_{t \bmod 4},
$$

with $s = (3, 5, 9, 13)$, round functions IF, MAJ, IF, MAJ, and each round using the
eight words in its own order $\sigma_r$. The output is the last four state words
plus the starting value, as in MD4. The generic collision price for its 64-bit
output is $2^{32}$.

Put a difference of $+1$ (bit 0) in word 2, which round 1 uses at step 2.

1. **Step 2.** The sum inside the rotation goes up by 1. If its bit 0 was 0, that
   is a clean flip of bit 0 with no carry; the rotation by $s_2 = 9$ moves it to
   bit 9. So $\delta Q_2 = +2^9$, under the condition "bit 9 of $Q_2$ is 0".
2. **Step 3.** $Q_2$ is the $x$ input of IF: absorbed if bit 9 of $Q_1$ equals bit 9
   of $Q_0$.
3. **Step 4.** $Q_2$ is the $y$ input: absorbed if bit 9 of $Q_3$ is 0.
4. **Step 5.** $Q_2$ is the $z$ input: absorbed if bit 9 of $Q_4$ is 1.
5. **Step 6.** $Q_2$ now enters as $Q_{t-4}$, inside the sum, adding $+2^9$. If
   word 6, which round 1 uses at step 6, carries a difference of $-2^9$, the two
   cancel exactly, with probability 1, before any rotation. The state differences
   are all zero again.

That five-step pattern, a disturbance and its correction with the difference
absorbed in between, is a **local collision**. It costs four conditions. The message
difference is $\delta W_2 = +1$, $\delta W_6 = -2^9$.

The words come back in rounds 2, 3 and 4. The orders $\sigma_r$ of the toy were
chosen so that word 2 is always used at a step $\equiv 2 \pmod 4$, rotation 9, and
word 6 exactly four steps later: at steps 10 and 14, 18 and 22, 26 and 30. So every
round holds one more local collision, of four conditions each (in the MAJ rounds a
difference on one input is absorbed when the other two inputs agree). Sixteen
conditions in all, so a random message gives a collision with probability about
$2^{-16}$, and message modification makes round 1 free, leaving $2^{-12}$.

| Steps | Round | What happens | Conditions |
|---|---|---|---|
| 2 to 6 | 1 (IF) | $+1$ in $W_2$ becomes $+2^9$ in $Q_2$, absorbed, cancelled by $-2^9$ in $W_6$ | 4, set by message modification |
| 10 to 14 | 2 (MAJ) | the same local collision | 4, by chance |
| 18 to 22 | 3 (IF) | the same | 4, by chance |
| 26 to 30 | 4 (MAJ) | the same, ending one step before the output | 4, by chance |

**Code it.** The program counts collisions among random messages, then among
messages built by message modification, then shows one colliding pair.

```python
import random

MASK = 0xffff
SHIFT = [3, 5, 9, 13]                    # rotation by step position, the same in every round
ORDER = [[0, 1, 2, 3, 4, 5, 6, 7],       # which message word each step uses, round by round
         [1, 4, 2, 7, 0, 5, 6, 3],
         [5, 0, 2, 4, 7, 3, 6, 1],
         [3, 7, 2, 0, 1, 4, 6, 5]]
IV = [0x0123, 0x4567, 0x89ab, 0xcdef]    # Q[-4], Q[-3], Q[-2], Q[-1]

def IF(x, y, z):  return (x & y) | (~x & z) & MASK
def MAJ(x, y, z): return (x & y) | (x & z) | (y & z)
FUN = [IF, MAJ, IF, MAJ]

def rotl(x, s): return (x << s | x >> (16 - s)) & MASK
def rotr(x, s): return rotl(x, 16 - s)

def states(m):                           # all 32 step values Q[0..31], after the 4 IV words
    q = IV[:]
    for t in range(32):
        r = t // 8
        k = 0x5a00 + 0x1111 * r          # a round constant
        s = rotl((q[-4] + FUN[r](q[-1], q[-2], q[-3]) + m[ORDER[r][t % 8]] + k) & MASK, SHIFT[t % 4])
        q.append(s)
    return q

def toy(m):                              # the compression function: last four Q plus the IV
    q = states(m)
    return tuple((a + b) & MASK for a, b in zip(q[-4:], IV))

# The message difference: +2**0 in word 2, and -2**9 in word 6 (2**0 rotated by 9).
def partner(m):
    m2 = m[:]
    m2[2] = (m2[2] + 1) & MASK
    m2[6] = (m2[6] - 2**9) & MASK
    return m2

# Plain trial: random messages.
random.seed(1)
hits, tries = 0, 2**18
for _ in range(tries):
    m = [random.getrandbits(16) for _ in range(8)]
    hits += toy(m) == toy(partner(m))
print("random messages:", hits, "collisions in", tries)

# Message modification: choose Q[0..7] to meet round 1's conditions, then solve for the words.
def bit(x): return x >> 9 & 1            # every condition sits on bit 9

def modified():
    q = [random.getrandbits(16) for _ in range(8)]
    q[1] = q[1] & ~(1 << 9) | bit(q[0]) << 9   # Q0 and Q1 agree on bit 9 (absorbed at step 3)
    q[2] &= ~(1 << 9)                          # Q2 bit 9 = 0 (no carry in the difference)
    q[3] &= ~(1 << 9)                          # Q3 bit 9 = 0 (absorbed at step 4)
    q[4] |= 1 << 9                             # Q4 bit 9 = 1 (absorbed at step 5)
    full, m = IV + q, [0] * 8
    for t in range(8):                         # in round 1 each word sets one Q: solve for it
        a, b, c, d = full[t], full[t + 3], full[t + 2], full[t + 1]
        m[t] = (rotr(full[t + 4], SHIFT[t % 4]) - a - IF(b, c, d) - 0x5a00) & MASK
    return m

hits, tries = 0, 2**16
for _ in range(tries):
    m = modified()
    if toy(m) == toy(partner(m)):
        hits += 1
        found = m
print("modified messages:", hits, "collisions in", tries)
print("pair:", " ".join("%04x" % w for w in found))
print("     ", " ".join("%04x" % w for w in partner(found)))
print("both hash to:", " ".join("%04x" % w for w in toy(found)))
q1, q2 = states(found), states(partner(found))
print("steps where Q differs:", [t for t in range(32) if q1[t + 4] != q2[t + 4]])
```

```
random messages: 8 collisions in 262144
modified messages: 20 collisions in 65536
pair: 341e 9ce6 44a9 98a6 7103 2bbb ae31 5b80
      341e 9ce6 44aa 98a6 7103 2bbb ac31 5b80
both hash to: 008a b6eb 3a75 cf10
steps where Q differs: [2, 10, 18, 26]
```

Random messages collided 8 times in $2^{18}$, a rate of $2^{-15}$; the path
predicts $2^{-16}$, and the extra hits come from other paths with the same message
difference (a carry that happens to be absorbed, for instance), which the attack
does not need to know about. Modified messages collided 20 times in $2^{16}$, a
rate of about $2^{-11.7}$ against the predicted $2^{-12}$. The last line is the
path itself: the two computations differ in exactly one state word per round and
agree everywhere else. The attack costs about $2^{12}$ toy compressions against
$2^{32}$ for a birthday search.

**What the toy leaves out.** Real paths are far harder to find than this one.
The toy was built so that the same local collision fits every round, which is
like designing a lock for its key. In MD5 the four rounds have different
rotations, the XOR function of round 3 never absorbs a difference, and the
message order does not line up. Wang's paths therefore are not repeated local
collisions. In the first round they let the difference spread widely, which costs
nothing because message modification pays for it, and they pick message
differences in bit 31 that pass through rounds 3 and 4 with almost no conditions.
§9.7 traces such a path through the real MD5.

!!! note "Life story: message modification"
    **Born:** 2004 to 2005, Wang Xiaoyun and her coauthors, in the papers breaking
    MD4, MD5, RIPEMD and SHA-1; refined by Klima's tunnels (2006), Biham and
    Chen's neutral bits (2004) and Joux and Peyrin's boomerangs (2007) ·
    **Purpose:** to make the conditions of a differential path hold by
    construction instead of by luck, since a hash has no key to hide the state
    · **Helped:** turned MD5 collisions from an hour on a supercomputer (2004)
    into under a minute on a notebook (2006); made SHAttered affordable · **Status:**
    the standard first step of every differential attack on a hash

## 9.7 How MD4 and MD5 were broken

*Level: intermediate.*

**Den Boer and Bosselaers, and Dobbertin.** The first cracks came within two years
of MD5's publication. In 1993 Bert den Boer and Antoon Bosselaers, at KU Leuven,
found **pseudo-collisions** of MD5's compression function: one message block and
two different chaining values, differing only in the top bit of each word, that
gave the same output. It did not break MD5, whose chaining value starts fixed, but
it showed that bit 31 differences slip through the function easily. In 1996 Hans
Dobbertin, at the German Federal Office for Information Security (BSI), broke MD4
outright: a collision in seconds on a PC, by a method that combined a difference
in a single message word with solving the step equations as a system, a bit at a
time, rather than by trial. The same year he found a collision of MD5's compression
function from a chosen starting value. Writing in RSA Laboratories' *CryptoBytes*
that summer, he advised that MD5 should no longer be used where collisions
mattered. MD5 had
another eight years of growing use ahead of it.

**August 2004.** At the CRYPTO conference in Santa Barbara, in the informal rump
session on the evening of 17 August, Wang Xiaoyun of Shandong University presented,
with Feng Dengguo, Lai Xuejia and Yu Hongbo, actual collisions for MD5, MD4,
HAVAL-128 and RIPEMD. The MD4 collisions could almost be found by hand; the MD5
collision had taken about an hour for its first block on an IBM P690
supercomputer and between fifteen seconds and five minutes for the second. The
method was not published in detail until EUROCRYPT 2005, and for months other
researchers worked backwards from the colliding pairs to understand it. Part of
what they learned is in the trace below.

**The two-block structure.** Wang's MD5 attack is a pair of differential paths, one
per message block. The message differences are in only three of the sixteen words:

$$
\delta W_4 = 2^{31}, \qquad \delta W_{11} = 2^{15}, \qquad \delta W_{14} = 2^{31}
$$

in the first block, and the same with $\delta W_{11} = -2^{15}$ in the second. The
first block's path does not end in a collision. It ends in a planned **near-
collision**, a chaining value difference of

$$
\delta h_1 = (2^{31},\; 2^{31} + 2^{25},\; 2^{31} + 2^{25},\; 2^{31} + 2^{25}).
$$

The second block's path starts from that difference and ends in the negative of
it in the state, so that the feed-forward, which adds the incoming chaining value
to the state, cancels it exactly. Why two blocks? Because no single-block path
from a zero difference to a zero difference was found with few enough conditions
in rounds 3 and 4. Two blocks double the work of the first round but give each
path a free start in round 1, where message modification is cheap.

**Code it.** Book 1 printed the classic colliding pair from Wang and Yu's 2005
paper and checked that the two MD5 digests agree. Here the same pair goes through
MD5's compression function step by step, with the new state word of each step
kept, so that you can see the path.

```python
import math, struct

S = [7, 12, 17, 22] * 4 + [5, 9, 14, 20] * 4 + [4, 11, 16, 23] * 4 + [6, 10, 15, 21] * 4
K = [int(abs(math.sin(i + 1)) * 2**32) & 0xffffffff for i in range(64)]
IV = (0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476)

def rotl(x, s):
    return (x << s | x >> (32 - s)) & 0xffffffff

def steps(h, block):                     # MD5's compression, keeping the new word of every step
    m = struct.unpack("<16I", block)
    a, b, c, d = h
    out = []
    for i in range(64):
        if i < 16:   f, g = (b & c) | (~b & d), i
        elif i < 32: f, g = (d & b) | (~d & c), (5 * i + 1) % 16
        elif i < 48: f, g = b ^ c ^ d, (3 * i + 5) % 16
        else:        f, g = c ^ (b | ~d & 0xffffffff), 7 * i % 16
        a, b, c, d = d, (b + rotl((a + f + K[i] + m[g]) & 0xffffffff, S[i])) & 0xffffffff, b, c
        out.append(b)
    return out, tuple((x + y) & 0xffffffff for x, y in zip(h, (a, b, c, d)))

a = bytes.fromhex(
    "d131dd02c5e6eec4693d9a0698aff95c2fcab58712467eab4004583eb8fb7f89"
    "55ad340609f4b30283e488832571415a085125e8f7cdc99fd91dbdf280373c5b"
    "d8823e3156348f5bae6dacd436c919c6dd53e2b487da03fd02396306d248cda0"
    "e99f33420f577ee8ce54b67080a80d1ec69821bcb6a8839396f9652b6ff72a70")
b = bytearray(a)
for i in (19, 45, 59, 83, 109, 123):
    b[i] ^= 0x80
b = bytes(b)

def sub(x, y): return (x - y) % 2**32    # modular difference, as Wang writes them

ha, hb = IV, IV
for n in (0, 1):
    blk_a, blk_b = a[64 * n:64 * n + 64], b[64 * n:64 * n + 64]
    wa, wb = struct.unpack("<16I", blk_a), struct.unpack("<16I", blk_b)
    print("block", n + 1, "word differences:", {i: hex(sub(wb[i], wa[i])) for i in range(16) if wa[i] != wb[i]})
    qa, ha = steps(ha, blk_a)
    qb, hb = steps(hb, blk_b)
    weights = [bin(x ^ y).count("1") for x, y in zip(qa, qb)]
    print("  bits that differ, step by step:", weights)
    print("  chaining value difference:", [hex(sub(y, x)) for x, y in zip(ha, hb)])
```

```
block 1 word differences: {4: '0x80000000', 11: '0x8000', 14: '0x80000000'}
  bits that differ, step by step: [0, 0, 0, 0, 17, 3, 21, 8, 6, 3, 2, 10, 3, 1, 3, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2]
  chaining value difference: ['0x80000000', '0x82000000', '0x82000000', '0x82000000']
block 2 word differences: {4: '0x80000000', 11: '0xffff8000', 14: '0x80000000'}
  bits that differ, step by step: [2, 3, 18, 8, 9, 5, 7, 8, 7, 2, 1, 9, 8, 1, 3, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 5]
  chaining value difference: ['0x0', '0x0', '0x0', '0x0']
```

The six flipped bytes of book 1's demo turn out to be exactly Wang's message
differences: the top bit of words 4 and 14, and bit 15 of word 11 (in the second
block, flipping bit 15 *off* is the difference $-2^{15} = \mathtt{0xffff8000}$).
After the first block the chaining value difference is $\delta h_1$, as planned;
$\mathtt{0x82000000} = 2^{31} + 2^{25}$. After the second it is zero. Figure 9.4
draws the two lists of bit counts.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Bar charts of how many bits differ between the two MD5 computations at each of the 64 steps, for both blocks of Wang's collision" fill="currentColor" font-size="14">
<text x="70" y="36" font-weight="bold">Block 1: a difference appears, then shrinks to one bit</text>
<line x1="70" y1="128" x2="614.0" y2="128" stroke="currentColor" stroke-width="1"/>
<text x="62" y="132" text-anchor="end" font-size="12">0</text>
<text x="62" y="92" text-anchor="end" font-size="12">10</text>
<text x="62" y="52" text-anchor="end" font-size="12">20</text>
<path d="M105,128v-68h6.5v68zM113.5,128v-12h6.5v12zM122,128v-84h6.5v84zM130.5,128v-32h6.5v32zM139,128v-24h6.5v24zM147.5,128v-12h6.5v12zM156,128v-8h6.5v8zM164.5,128v-40h6.5v40zM173,128v-12h6.5v12zM181.5,128v-4h6.5v4zM190,128v-12h6.5v12zM198.5,128v-8h6.5v8zM207,128v-4h6.5v4zM215.5,128v-4h6.5v4zM224,128v-8h6.5v8zM232.5,128v-4h6.5v4zM241,128v-4h6.5v4zM249.5,128v-4h6.5v4zM360,128v-4h6.5v4zM368.5,128v-4h6.5v4zM377,128v-4h6.5v4zM385.5,128v-4h6.5v4zM394,128v-4h6.5v4zM402.5,128v-4h6.5v4zM411,128v-4h6.5v4zM419.5,128v-4h6.5v4zM428,128v-4h6.5v4zM436.5,128v-4h6.5v4zM445,128v-4h6.5v4zM453.5,128v-4h6.5v4zM462,128v-4h6.5v4zM470.5,128v-4h6.5v4zM479,128v-4h6.5v4zM487.5,128v-4h6.5v4zM496,128v-4h6.5v4zM504.5,128v-4h6.5v4zM513,128v-4h6.5v4zM521.5,128v-4h6.5v4zM530,128v-4h6.5v4zM538.5,128v-4h6.5v4zM547,128v-4h6.5v4zM555.5,128v-4h6.5v4zM564,128v-4h6.5v4zM572.5,128v-4h6.5v4zM581,128v-4h6.5v4zM589.5,128v-8h6.5v8zM598,128v-8h6.5v8zM606.5,128v-8h6.5v8z" fill="currentColor" opacity="0.7"/>
<line x1="206.0" y1="42" x2="206.0" y2="132" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"/>
<line x1="342.0" y1="42" x2="342.0" y2="132" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"/>
<line x1="478.0" y1="42" x2="478.0" y2="132" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"/>
<text x="70" y="176" font-weight="bold">Block 2: the same path in reverse cancels it</text>
<line x1="70" y1="268" x2="614.0" y2="268" stroke="currentColor" stroke-width="1"/>
<text x="62" y="272" text-anchor="end" font-size="12">0</text>
<text x="62" y="232" text-anchor="end" font-size="12">10</text>
<text x="62" y="192" text-anchor="end" font-size="12">20</text>
<path d="M71,268v-8h6.5v8zM79.5,268v-12h6.5v12zM88,268v-72h6.5v72zM96.5,268v-32h6.5v32zM105,268v-36h6.5v36zM113.5,268v-20h6.5v20zM122,268v-28h6.5v28zM130.5,268v-32h6.5v32zM139,268v-28h6.5v28zM147.5,268v-8h6.5v8zM156,268v-4h6.5v4zM164.5,268v-36h6.5v36zM173,268v-32h6.5v32zM181.5,268v-4h6.5v4zM190,268v-12h6.5v12zM198.5,268v-8h6.5v8zM207,268v-4h6.5v4zM215.5,268v-4h6.5v4zM224,268v-8h6.5v8zM232.5,268v-4h6.5v4zM241,268v-4h6.5v4zM249.5,268v-4h6.5v4zM360,268v-4h6.5v4zM368.5,268v-4h6.5v4zM377,268v-4h6.5v4zM385.5,268v-4h6.5v4zM394,268v-4h6.5v4zM402.5,268v-4h6.5v4zM411,268v-4h6.5v4zM419.5,268v-4h6.5v4zM428,268v-4h6.5v4zM436.5,268v-4h6.5v4zM445,268v-4h6.5v4zM453.5,268v-4h6.5v4zM462,268v-4h6.5v4zM470.5,268v-4h6.5v4zM479,268v-4h6.5v4zM487.5,268v-4h6.5v4zM496,268v-4h6.5v4zM504.5,268v-4h6.5v4zM513,268v-4h6.5v4zM521.5,268v-4h6.5v4zM530,268v-4h6.5v4zM538.5,268v-4h6.5v4zM547,268v-4h6.5v4zM555.5,268v-4h6.5v4zM564,268v-4h6.5v4zM572.5,268v-4h6.5v4zM581,268v-4h6.5v4zM589.5,268v-8h6.5v8zM598,268v-8h6.5v8zM606.5,268v-20h6.5v20z" fill="currentColor" opacity="0.7"/>
<line x1="206.0" y1="182" x2="206.0" y2="272" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"/>
<line x1="342.0" y1="182" x2="342.0" y2="272" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"/>
<line x1="478.0" y1="182" x2="478.0" y2="272" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"/>
<text x="138.0" y="292" text-anchor="middle" font-size="12">round 1</text>
<text x="274.0" y="292" text-anchor="middle" font-size="12">round 2</text>
<text x="410.0" y="292" text-anchor="middle" font-size="12">round 3</text>
<text x="546.0" y="292" text-anchor="middle" font-size="12">round 4</text>
<text x="342.0" y="316" text-anchor="middle" font-size="12">step 0 to 63; bar height = bits that differ in the new state word</text>
<text x="22" y="200" font-size="12" transform="rotate(-90 22 200)" text-anchor="middle">bits</text>
</svg>
<figcaption>Figure 9.4. The real MD5 collision, traced by the code. In round 1 message modification lets the difference run wild; from step 22 to 33 the two computations agree completely; then a single difference in bit 31 rides through rounds 3 and 4, where it costs almost nothing. Block 1 ends with the planned difference in the chaining value; block 2 ends with none.</figcaption>
</figure>

**Reading the path.** Four stages are visible, and each one is a design decision.

- **Steps 0 to 21.** The first difference enters at step 4, where word 4 is used,
  and spreads to as many as 21 bits. This is the expensive-looking part, and it
  costs almost nothing: these are the steps where message modification sets every
  condition directly. The path is chosen so that by the end of round 1 and the
  start of round 2 the difference shrinks to nothing, with the later appearances of
  words 4, 11 and 14 placed to cancel what remains.
- **Steps 22 to 33.** No difference at all. Round 2's message order brings word 4
  back at step 23 and word 14 at step 25, each with its $2^{31}$, but the path
  leaves a bit-31 difference in $Q_{19}$ and $Q_{21}$ for them to meet inside the
  sum, and $2^{31} + 2^{31} = 0$.
- **Steps 34 to 60.** A single bit, bit 31, differs in each new state word. The
  difference comes back at step 34, where round 3 uses word 11, and its rotation
  there is 16: $2^{15}$ rotated by 16 is $2^{31}$. That is why the third message
  difference sits in bit 15. Round 3's XOR function passes a bit-31 difference with probability 1 and two bit-31
  differences cancel in it; additions pass it with probability 1 because bit 31
  never carries. This is why Wang chose $2^{31}$ for two of the three message
  differences: the difference rides through round 3 for free.
- **Steps 61 to 63.** Round 4's function $c \oplus (b \vee \neg d)$ does need
  conditions on bit 31, and the last steps grow a little difference. In block 1
  that becomes $\delta h_1$ after the feed-forward; in block 2 it becomes exactly
  $-\delta h_1$ and the feed-forward cancels it.

**The cost.** Each condition left after message modification halves the success
rate. Wang and Yu estimated the first block at about $2^{39}$ MD5 computations and
the second at about $2^{32}$, against $2^{64}$ for a birthday search. The 2004 hour on a supercomputer came down quickly: Vlastimil Klima's tunnels (2006)
found MD5 collisions in under a minute on a notebook, and Marc Stevens' HashClash
tools, which also search automatically for new paths, made it a matter of seconds.
The exact condition counts vary between papers and paths, so treat such figures
as orders of magnitude rather than a single agreed number.

**From a collision to two meaningful files.** Two random-looking 128-byte blocks
seem useless, but Merkle-Damgård helps the attacker: once two messages collide on
whole blocks, *any* common suffix keeps them colliding, and any common prefix of
whole blocks can come first, if the paths are recomputed from the prefix's chaining
value. So an attacker builds files of the form

$$
\mathit{prefix} \,\Vert\, C \,\Vert\, \mathit{suffix} \quad\text{and}\quad
\mathit{prefix} \,\Vert\, C' \,\Vert\, \mathit{suffix},
$$

where the suffix holds *both* intended contents and code that looks at a byte of
$C$ or $C'$ to decide which to show. Dan Kaminsky demonstrated this for programs
in 2004; Ondrej Mikle did the same; Magnus Daum and Stefan Lucks made two PostScript
letters with the same MD5 in 2005, one a recommendation and the other an order
granting a security clearance. In March 2005 Arjen Lenstra, Wang and Benne de Weger
built two X.509 certificates with the same MD5 and the same name but different
public keys. The colliding blocks sat inside the RSA moduli, which are random-
looking anyway. That was a warning shot. It did not yet let anyone forge a
certificate for a *different* name, because identical-prefix collisions need the
beginnings to be the same, and the name sits at the beginning. For that the
attackers needed chosen prefixes.

!!! note "Life story: Wang's MD5 collision attack"
    **Born:** shown on 17 August 2004 at the CRYPTO rump session by Wang Xiaoyun,
    Feng Dengguo, Lai Xuejia and Yu Hongbo; published as "How to Break MD5 and
    Other Hash Functions" (Wang and Yu, EUROCRYPT 2005); building on Dobbertin's
    MD4 attack (1996) and den Boer and Bosselaers (1993) · **Purpose:** collisions
    of the full MD5 from its real starting value, by a two-block differential path
    with message modification · **Helped:** ended MD5 for signatures; led to
    colliding programs, documents and certificates (2004 to 2005), to chosen-prefix
    collisions (2007) and to NIST's SHA-3 competition · **Status:** collisions now
    take seconds on a laptop; RFC 6151 (2011) records the end of MD5 for collision
    resistance

## 9.8 Chosen-prefix collisions: the rogue CA and Flame

*Level: expert.*

An identical-prefix collision makes two messages that start the same. A certificate
starts with the serial number, the issuer and the subject's name, so two colliding
certificates would carry the same name. A **chosen-prefix collision** removes the
restriction: given *any* two prefixes $P$ and $P'$, find suffixes $S$ and $S'$ with

$$
H(P \,\Vert\, S) = H(P' \,\Vert\, S').
$$

The two chaining values after the prefixes, $h$ and $h'$, now differ in a random
way, and no single differential path can start from a random difference.

**Stevens' method.** Marc Stevens, whose master's thesis at TU Eindhoven began the
work, published the answer with Arjen Lenstra and Benne de Weger at EUROCRYPT 2007. It works
in two phases (Figure 9.5).

1. **Birthday phase.** Pad both prefixes to the same length and append a few
   blocks' worth of free bits, different for each side. Run a birthday search over
   those bits, not for a full collision, but for a pair whose chaining value
   difference $\delta h$ falls in a special small set: differences that a series of
   near-collision blocks knows how to remove. Requiring, say, 64 bits of structure
   in $\delta h$ costs about $2^{32}$ trials per side, a generic birthday search on
   64 bits.
2. **Near-collision phase.** Each near-collision block is a differential path,
   like the ones of §9.7, that starts from the current $\delta h$ and ends with a
   difference that has fewer bits set. A family of such paths, built automatically
   by Stevens' tools for each step, removes the remaining bits a few at a time
   until $\delta h = 0$.

After that, any common suffix keeps the two messages colliding. The more structure
the birthday phase asks for, the fewer near-collision blocks are needed, and the two
phases can be traded against each other.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Structure of a chosen-prefix collision: two different prefixes, birthday bits, near-collision blocks and a common suffix, with the chaining-value difference shrinking to zero" fill="currentColor" font-size="14">
<rect x="10" y="30" width="170" height="34" fill="currentColor" opacity="0.18" stroke="currentColor"/>
<text x="95" y="52" text-anchor="middle">prefix P</text>
<rect x="10" y="100" width="170" height="34" fill="currentColor" opacity="0.18" stroke="currentColor"/>
<text x="95" y="122" text-anchor="middle">prefix P′ (different)</text>
<rect x="180" y="30" width="90" height="34" fill="none" stroke="currentColor"/>
<text x="225" y="52" text-anchor="middle">birthday</text>
<rect x="180" y="100" width="90" height="34" fill="none" stroke="currentColor"/>
<text x="225" y="122" text-anchor="middle">birthday</text>
<rect x="270" y="30" width="56" height="34" fill="none" stroke="currentColor"/>
<text x="298" y="52" text-anchor="middle">NC₁</text>
<rect x="326" y="30" width="56" height="34" fill="none" stroke="currentColor"/>
<text x="354" y="52" text-anchor="middle">NC₂</text>
<rect x="382" y="30" width="56" height="34" fill="none" stroke="currentColor"/>
<text x="410" y="52" text-anchor="middle">NC₃</text>
<rect x="270" y="100" width="56" height="34" fill="none" stroke="currentColor"/>
<text x="298" y="122" text-anchor="middle">NC₁′</text>
<rect x="326" y="100" width="56" height="34" fill="none" stroke="currentColor"/>
<text x="354" y="122" text-anchor="middle">NC₂′</text>
<rect x="382" y="100" width="56" height="34" fill="none" stroke="currentColor"/>
<text x="410" y="122" text-anchor="middle">NC₃′</text>
<rect x="438" y="30" width="190" height="34" fill="currentColor" opacity="0.08" stroke="currentColor"/>
<text x="533" y="52" text-anchor="middle">common suffix</text>
<rect x="438" y="100" width="190" height="34" fill="currentColor" opacity="0.08" stroke="currentColor"/>
<text x="533" y="122" text-anchor="middle">common suffix</text>
<text x="180" y="166" text-anchor="middle" font-size="13">δh random</text>
<text x="270" y="166" text-anchor="middle" font-size="13">δh special</text>
<text x="354" y="166" text-anchor="middle" font-size="13">fewer bits each block</text>
<text x="438" y="166" text-anchor="middle" font-size="13">δh = 0</text>
<line x1="180" y1="140" x2="180" y2="150" stroke="currentColor"/>
<line x1="270" y1="140" x2="270" y2="150" stroke="currentColor"/>
<line x1="438" y1="140" x2="438" y2="150" stroke="currentColor"/>
<text x="225" y="20" text-anchor="middle" font-size="12">generic search</text>
<text x="354" y="20" text-anchor="middle" font-size="12">differential paths</text>
<text x="320" y="200" text-anchor="middle" font-size="13">MD5, 2009: 3 near-collision blocks after a birthday search on 200 PlayStation 3s</text>
</svg>
<figcaption>Figure 9.5. A chosen-prefix collision. The prefixes differ arbitrarily, so the chaining values differ at random. A birthday search brings the difference into a form that near-collision blocks (NC) can remove, and each such block is a differential path that clears a few more bits. After the last one, the two computations agree and any common suffix keeps them together.</figcaption>
</figure>

**The 2007 certificates.** The first demonstration was a pair of X.509 certificates
for two different names, Arjen K. Lenstra and Marc Stevens, with the same MD5 and so
the same signature. The colliding blocks were hidden in the RSA moduli. The cost was
about $2^{50}$ MD5 computations, days on a cluster; identical-prefix collisions by
then took seconds.

**The rogue certificate authority, 2008.** To turn this into an attack on the web,
the certificate that the authority actually signs must be predictable *before* it
is issued: the attacker needs to know the prefix, including the serial number and
the validity dates that the authority fills in. Alexander Sotirov, Marc Stevens,
Jacob Appelbaum, Arjen Lenstra, David Molnar, Dag Arne Osvik and Benne de Weger found
that RapidSSL, a commercial certificate authority still signing with MD5, issued
serial numbers in sequence and set the validity start a fixed time after the
request. They watched the serial counter, predicted the value it would reach at a
chosen moment, computed a chosen-prefix collision between an ordinary web site
certificate with that serial number and a certificate saying "CA: true" for their
own key, and submitted the request at that moment. The collision had to fit in the
space of the web certificate's public key and be ready in time, so the 2009 paper
on it describes a faster variant with three near-collision blocks; the birthday
phase ran on a cluster of about 200 PlayStation 3 consoles at EPFL, taking a day or
two per attempt, and more than one attempt was needed before the serial number came
out as predicted.

They presented the result on 30 December 2008 at the 25th Chaos Communication
Congress in Berlin. The rogue certificate's validity had been set to expire in
August 2004, so that it could not be misused if it leaked. RapidSSL stopped issuing
MD5-signed certificates within days, and the browsers and authorities followed.

!!! note "Life story: chosen-prefix collisions and the rogue CA"
    **Born:** 2007, Marc Stevens, Arjen Lenstra and Benne de Weger (EUROCRYPT
    2007); improved in 2009 with Sotirov, Appelbaum, Molnar and Osvik (CRYPTO
    2009) · **Purpose:** collisions between two arbitrary chosen prefixes, so
    that the colliding documents can say different things from the first byte
    · **Helped:** colliding certificates for different names (2007); the twelve
    "Nostradamus" PDFs (2007); a working rogue certificate authority trusted by
    every browser (December 2008), which ended MD5 in the web's certificates ·
    **Status:** practical for MD5 since 2007 and for SHA-1 since 2020 (§9.9)

### Flame

In May 2012 Iran's national response team, Kaspersky Lab and the CrySyS Lab in
Budapest reported a large espionage tool, named Flame, found mainly on computers in
Iran and elsewhere in the Middle East. It spread inside a network by posing as
Windows Update, and its update packages carried a valid code-signing signature that
chained to Microsoft's root. On 3 June 2012 Microsoft published Security Advisory
2718704 and revoked three of its own intermediate certificates.

The signing certificate came from Microsoft's Terminal Server Licensing Service,
which issued certificates to customers' license servers automatically and still
signed them with MD5. Such certificates were not meant to sign code, and on Windows
Vista and later they would have been rejected because of an extension those
versions did not accept. A chosen-prefix collision turned one licensing certificate
into a code-signing certificate without that obstacle.

Marc Stevens ran his **counter-cryptanalysis** detector (§9.13) on the Flame
certificate and found the traces of near-collision blocks. The differential paths
did not match any published variant: it was a new chosen-prefix attack on MD5,
designed by someone outside the public research community. In 2015 Max Fillinger
and Stevens reconstructed it in detail. Who built Flame has never been officially
confirmed; press reports in 2012 attributed it to a US and Israeli program, and
the cost of the collision has only been estimated from the reconstruction. What
is not in doubt is the lesson: a state attacker had its own hash cryptanalysts,
and a forgotten service still signing with MD5 eight years after Wang was enough.

!!! note "Life story: the Flame collision"
    **Born:** before 2012, by unknown authors; found in May 2012 and analyzed by
    Stevens with counter-cryptanalysis; reconstructed by Fillinger and Stevens
    (2015) · **Purpose:** a code-signing certificate chaining to Microsoft, made
    by an MD5 chosen-prefix collision with a Terminal Server Licensing
    certificate · **Helped:** let the Flame espionage tool spread as a fake
    Windows Update · **Status:** the certificates were revoked on 3 June 2012
    (Security Advisory 2718704); the clearest proof that state agencies run
    collision attacks unknown to the public

## 9.9 SHA-1

*Level: intermediate.*

**SHA-0 and a one-bit change.** The NSA's Secure Hash Algorithm was published by
NIST in 1993 as FIPS 180 and replaced in 1995 by SHA-1 (FIPS 180-1), which differs
only in one rotation in the message expansion:

$$
W_t = (W_{t-3} \oplus W_{t-8} \oplus W_{t-14} \oplus W_{t-16}) \lll 1, \qquad 16 \le t < 80 .
$$

SHA-0 has no rotation. Both have a five-word, 160-bit state and 80 steps. In 1998
Florent Chabaud and Antoine Joux explained the change from the outside: they
attacked SHA-0 with collisions in about $2^{61}$, an attack the rotation blocks.

**Local collisions and disturbance vectors.** Chabaud and Joux's tool was the SHA
version of the local collision of §9.6. A bit flipped in $W_t$ disturbs the state;
corrections in $W_{t+1}, \dots, W_{t+5}$, at bit positions dictated by the step's
rotations, cancel it six steps later. The message expansion is linear over GF(2), so
the pattern of disturbances, one bit per step, must itself obey the expansion.
That is a strong constraint: there are only $2^{16}$ such patterns for one bit
position, and the attacker wants one with very few disturbances in the later steps,
where conditions are paid for by chance. The program below looks through all of them
for SHA-0, in a simplified form that ignores the shortcuts real attacks take in the
first and last steps.

```python
# Disturbance vectors for SHA-0: one bit per step, following the message expansion
# w[t] = w[t-3] ^ w[t-8] ^ w[t-14] ^ w[t-16]. The list covers steps -5 to 79: the
# five steps before 0 and the last five must be clear, so every local collision
# (a disturbance and five corrections) starts and ends inside the 80 steps.
found = []
for start in range(1, 2**16):
    w = [start >> i & 1 for i in range(16)]
    for t in range(16, 85):
        w.append(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16])
    if any(w[0:5]) or any(w[80:85]):
        continue
    late = sum(w[25:85])                 # steps 20 to 79: paid for by chance
    found.append((late, sum(w[5:85]), start))
found.sort()
print(len(found), "vectors fit")
for late, total, start in found[:3]:
    print("disturbances in steps 20-79:", late, "  in all:", total)
```

```
63 vectors fit
disturbances in steps 20-79: 19   in all: 27
disturbances in steps 20-79: 22   in all: 29
disturbances in steps 20-79: 22   in all: 36
```

Each late disturbance costs a few conditions, so even the best vector leaves a
probability far below $2^{-19}$; real analyses count the conditions bit by bit and
relax the end constraints. In SHA-1 the rotation makes a disturbance in one bit
spread to the neighboring bit, the vectors become patterns over all 32 bit positions,
and low-weight ones are rarer. That is what the one-bit change bought: SHA-0 fell
to an actual collision in 2004 (Biham, Chen, Joux, Carribault, Lemuet and Jalby,
about 80,000 CPU hours) and to Wang, Yu and Yin's $2^{39}$ attack in 2005, while
SHA-1 held out much longer.

**Wang, 2005.** In February 2005 Wang Xiaoyun, Yin Yiqun Lisa and Yu Hongbo
announced a collision attack on the full SHA-1 in about $2^{69}$, published at
CRYPTO 2005. It combined a carefully chosen disturbance vector with Wang's
techniques: a first block that leads to a near-collision and a second that removes
it, a non-linear differential path for the first steps found by hand (where a
linear one would need impossible conditions), and message modification. It was
$2^{11}$ times faster than the birthday bound and still too expensive to run. NIST
began advising a move to SHA-2, which most of the world made slowly.

**The cost falls.** The next twelve years were spent bringing the number down and
the attack within reach:

- 2008 to 2013: better paths and estimates; Stevens' 2013 paper put a full SHA-1
  collision at about $2^{61}$.
- October 2015: the **free-start collision** (Stevens, Karpman and Peyrin), a
  collision of SHA-1's compression function from a chosen starting value, found on
  64 GPUs in about ten days. It was not a hash collision, but it showed the
  method worked at full size and moved the timetable for browsers.
- **23 February 2017: SHAttered.** Stevens, Elie Bursztein, Pierre Karpman, Ange
  Albertini and Yarik Markov, from CWI Amsterdam and Google, published two PDF
  files with different visible contents and the same SHA-1. The computation took
  about $2^{63.1}$ SHA-1 computations: about 6,500 CPU-years for the first block
  and about 110 GPU-years for the second, on Google's infrastructure. It was an
  identical-prefix collision, laid out with the trick of §9.7: both PDFs share a
  prefix, the colliding blocks, and a suffix holding two images, and the
  colliding block decides which image is shown.
- **January 2020: SHA-1 is a Shambles.** Gaëtan Leurent of Inria and Thomas Peyrin
  of Nanyang Technological University had shown in 2019 how to extend Stevens'
  chosen-prefix method to SHA-1. In January 2020 they ran it: about $2^{63.4}$
  SHA-1 computations, two months on 900 rented GPUs, which they put at about
  \$45,000 at the GPU rental prices they expected (their own run cost more, because
  GPU prices were high at the time). The identical-prefix collision got cheaper in
  the same work, to about \$11,000.

**The PGP impersonation.** The Shambles authors used their collision on the PGP
web of trust, where users certify each other's keys with signatures. They made two
PGP keys with different user IDs whose certification requests collided under SHA-1:
a signature on the first, harmless key was also a valid signature on the second,
which carried a different name. Anyone who certified the first key had, without
knowing, vouched for the second. GnuPG had already changed, in version 2.2.18 of
November 2019, to reject SHA-1-based identity signatures made after 19 January 2019.

**After SHA-1.** Browsers stopped trusting SHA-1 certificates in early 2017. Git,
whose object names are SHA-1, switched in 2017 to SHA-1DC, a version of SHA-1 by
Stevens and Dan Shumow that detects the near-collision blocks of these attacks and
refuses them, and later added SHA-256 repositories. In December 2022 NIST announced
that SHA-1 must be phased out of all its remaining uses by 31 December 2030.

!!! note "Life story: SHAttered and the SHA-1 collisions"
    **Born:** 2005 (Wang, Yin and Yu's $2^{69}$ attack); 2015 (free-start
    collision); 23 February 2017 (SHAttered, Stevens, Bursztein, Karpman,
    Albertini and Markov, $2^{63.1}$); January 2020 (SHA-1 is a Shambles,
    Leurent and Peyrin, chosen prefix, about $2^{63.4}$) · **Purpose:** to turn a
    theoretical break into colliding files, and then into colliding identities ·
    **Helped:** two PDFs with one SHA-1 (2017); a PGP key impersonation (2020); the
    end of SHA-1 in certificates, Git's move to collision detection and SHA-256,
    and NIST's 2030 deadline · **Status:** chosen-prefix SHA-1 collisions cost tens
    of thousands of dollars and fall with GPU prices

## 9.10 What the attacks need, and why SHA-2 has held

*Level: intermediate.*

SHA-256 and SHA-512 were proposed in 2001 and standardized in 2002 (today in
FIPS 180-4) by the same agency, in the same Merkle-Damgård shape as SHA-1, with the same kind of
step function of additions, rotations and Boolean functions. Wang's methods were
turned on them at once, and twenty years later the best collision attacks reach
31 of SHA-256's 64 steps. Looking back over MD4, MD5 and SHA-1, the attacks needed
five things from the designer, and SHA-2 withholds most of them.

1. **Message words that enter alone and linearly.** Message modification works
   because, in the first round, one step's equation can be solved for one message
   word. SHA-2 also adds one expanded word per step, so the first 16 steps can
   still be controlled; that is where all its reduced-round attacks start.
2. **A weak message expansion.** MD4 and MD5 simply reuse the 16 words in new
   orders, and SHA-0 and SHA-1 expand them linearly, so a small message difference
   stays small and predictable through every round, and disturbance vectors can be
   found by linear algebra (§9.9). SHA-2's expansion
   $W_t = \sigma_1(W_{t-2}) + W_{t-7} + \sigma_0(W_{t-15}) + W_{t-16}$ mixes XOR
   inside $\sigma_0, \sigma_1$ with modular additions between them. A difference
   in one word spreads to many expanded words with many conditions, and there is no
   linear code to search.
3. **A small state updated slowly.** MD5 changes one 32-bit word per step, SHA-1
   one of five. SHA-2 updates two of its eight words per step (the $A$ and $E$
   registers), each through a function of several others, so a difference spreads
   twice as fast and a local collision needs nine steps and many more conditions.
4. **Boolean functions and rotations that let differences cancel cheaply.** The
   bit-31 trick of §9.7 and the XOR rounds that pass a difference for free are
   what made MD5's rounds 3 and 4 cheap. SHA-2's $\Sigma$ functions XOR three
   rotations of a word, so one flipped bit becomes three, and a sparse difference
   does not stay sparse.
5. **Few rounds for the diffusion.** MD4 had 48 steps, MD5 64, SHA-1 80 over a
   small state. SHA-256 has 64 steps, but each does more, and the security margin
   (the steps between the best attack and the full function) has stayed above
   half the steps.

**The record.** In 2013 Florian Mendel, Tomislav Nad and Martin Schläffer gave a
collision attack on 31 steps of SHA-256 and a practical semi-free-start collision on
38. In 2024 Li Yingxin, Liu Fukang and Wang Gaoli published, among other records,
the first practical colliding message pair for 31-step SHA-256. Preimage attacks
reach about 45 steps at a cost only slightly below brute force. None of this comes
near the full 64 steps, and SHA-256 is expected to stay sound for collisions and
preimages; its only structural weaknesses are the generic ones of §9.3 to §9.5,
length extension above all. These record counts change as papers appear; treat
them as the state of the art in 2024.

## 9.11 The sponge and SHA-3

*Level: intermediate.*

NIST opened the SHA-3 competition in November 2007, while SHA-1 was falling and
nobody could be sure that SHA-2 would not follow. Keccak, by Guido Bertoni, Joan
Daemen, Michaël Peeters and Gilles Van Assche, won in October 2012 and became FIPS 202
in August 2015. Its structure, the **sponge**, changes almost every attack in this
chapter.

**The sponge in one paragraph.** The state has $b = r + c$ bits (1,600 for Keccak),
split into the **rate** $r$ and the **capacity** $c$. Each message block of $r$
bits is XORed into the rate, then a fixed permutation $f$ scrambles the whole
state. To output, read $r$ bits of the rate, apply $f$, read again. The capacity is
never touched by input or output directly. SHA3-256 has $c = 512$ and $r = 1088$;
book 1's [Chapter 9](../../book/09-Hash-Functions.md) draws it.

**What changes.**

- **No length extension.** The digest is part of the rate after the last call to
  $f$. The capacity, $c$ bits, is never output, so an attacker who sees the digest
  cannot load the state and continue. $\text{SHA3}(\mathit{key} \,\Vert\, m)$ is a
  sound MAC, and KMAC is built on exactly that.
- **One generic bound for everything.** The sponge with a random permutation is
  indistinguishable from a random oracle up to about $2^{c/2}$ calls. So
  multicollisions, herding, long-message second preimages and the rest are all
  bounded by $2^{c/2}$, whatever the message length. Choosing $c = 2n$ for an
  $n$-bit digest makes that bound equal to the collision bound $2^{n/2}$, and
  pushes the generic structural attacks out of reach.
- **The weak point is the capacity.** The generic attack on a sponge is an
  **inner collision**: two messages that reach states with the same capacity part.
  After that, one more block fixes the rate part (XOR in the difference), the
  whole states agree, and every continuation collides. It costs $2^{c/2}$, the
  birthday bound on the capacity, whatever the output length.

**Code it.** A sponge with a 32-bit permutation, 16-bit rate, 16-bit capacity and
32-bit output. A birthday search on the output would take about $2^{16}$ tries;
an inner collision takes about $2^{8}$.

```python
MASK = 0xffff

def rotl(x, s): return (x << s | x >> (16 - s)) & MASK

def perm(r, c):                          # a 32-bit permutation on (rate, capacity), ARX style
    for i in range(12):
        r = (r + c) & MASK
        c = rotl(c, 7) ^ r
        r = rotl(r, 3) ^ (0x9e37 + i)
    return r, c

def sponge(blocks):                      # rate 16 bits, capacity 16 bits, 32-bit output
    r, c = 0, 0
    for m in blocks + [0x8000]:          # a fixed final padding block
        r, c = perm(r ^ m, c)
    out = r
    r, c = perm(r, c)                    # squeeze a second output block
    return out << 16 | r

# Inner collision: two first blocks that leave the same capacity half.
seen, m = {}, 0
while True:
    r, c = perm(m, 0)
    if c in seen:
        break
    seen[c] = (m, r)
    m += 1
m1, r1 = seen[c]
m2, r2 = m, r
print("inner collision after", m + 1, "blocks:", hex(m1), hex(m2))

# Fix the rate half with the next block, and the whole states agree from then on.
x = 0x1234
a, b = [m1, x], [m2, x ^ r1 ^ r2]
print(hex(sponge(a)), hex(sponge(b)))
print(hex(sponge(a + [7, 7])), hex(sponge(b + [7, 7])))
```

```
inner collision after 166 blocks: 0x61 0xa5
0xfd0e6abd 0xfd0e6abd
0x88e00d6b 0x88e00d6b
```

166 tries found two first blocks with the same capacity. The second blocks differ
by exactly the difference in the rate, so after XORing them in the two states are
identical, and from then on they collide on every output and every extension. That
is why a sponge's security is set by $c$, and why SHA3-256 spends 512 bits on it.
Figure 9.6 draws the two steps.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="An inner collision in a sponge: after one block the two states have the same capacity part and different rate parts; the next blocks differ by the rate difference so the full states become equal" fill="currentColor" font-size="14">
<text x="20" y="46">M</text>
<text x="20" y="136">M′</text>
<rect x="60" y="26" width="90" height="30" fill="none" stroke="currentColor"/>
<rect x="60" y="56" width="90" height="30" fill="currentColor" opacity="0.25" stroke="currentColor"/>
<text x="105" y="46" text-anchor="middle" font-size="12">rate r₁</text>
<text x="105" y="76" text-anchor="middle" font-size="12">capacity c</text>
<rect x="60" y="116" width="90" height="30" fill="none" stroke="currentColor"/>
<rect x="60" y="146" width="90" height="30" fill="currentColor" opacity="0.25" stroke="currentColor"/>
<text x="105" y="136" text-anchor="middle" font-size="12">rate r₂</text>
<text x="105" y="166" text-anchor="middle" font-size="12">capacity c</text>
<text x="105" y="196" text-anchor="middle" font-size="12">after block 1: same c</text>
<line x1="150" y1="41" x2="260" y2="41" stroke="currentColor" stroke-width="1.4"/>
<line x1="150" y1="131" x2="260" y2="131" stroke="currentColor" stroke-width="1.4"/>
<text x="205" y="32" text-anchor="middle" font-size="12">⊕ x</text>
<text x="205" y="122" text-anchor="middle" font-size="12">⊕ x ⊕ r₁ ⊕ r₂</text>
<rect x="260" y="26" width="90" height="30" fill="none" stroke="currentColor"/>
<rect x="260" y="56" width="90" height="30" fill="currentColor" opacity="0.25" stroke="currentColor"/>
<text x="305" y="46" text-anchor="middle" font-size="12">r₁ ⊕ x</text>
<text x="305" y="76" text-anchor="middle" font-size="12">c</text>
<rect x="260" y="116" width="90" height="30" fill="none" stroke="currentColor"/>
<rect x="260" y="146" width="90" height="30" fill="currentColor" opacity="0.25" stroke="currentColor"/>
<text x="305" y="136" text-anchor="middle" font-size="12">r₁ ⊕ x</text>
<text x="305" y="166" text-anchor="middle" font-size="12">c</text>
<text x="305" y="196" text-anchor="middle" font-size="12">whole states equal</text>
<line x1="350" y1="71" x2="440" y2="101" stroke="currentColor" stroke-width="1.4"/>
<line x1="350" y1="131" x2="440" y2="101" stroke="currentColor" stroke-width="1.4"/>
<rect x="440" y="86" width="60" height="30" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="470" y="106" text-anchor="middle">f</text>
<line x1="500" y1="101" x2="540" y2="101" stroke="currentColor" stroke-width="1.4"/>
<text x="545" y="96" font-size="12">same output,</text>
<text x="545" y="112" font-size="12">same future</text>
</svg>
<figcaption>Figure 9.6. An inner collision. A birthday search on the capacity (2^(c/2) tries) finds two first blocks that leave the same capacity; the second blocks cancel the rate difference, and the two states are identical from then on. The output length does not matter.</figcaption>
</figure>

**Attacks on Keccak itself.** The differential techniques of §9.6 to §9.9 have been
turned on Keccak's permutation since 2012, with modest results. Itai Dinur, Orr
Dunkelman and Adi Shamir found practical collisions for 4 of the 24 rounds of
Keccak-256 in 2012. Guo Jian, Song Ling, Liao Guohong and their coauthors pushed
actual collisions to 5 rounds of SHA3-224 and SHA3-256 and to 6 rounds of variants
with a smaller capacity, using algebraic tricks that linearize the first rounds
(their journal paper appeared in 2020). Preimage attacks reach only a few rounds;
distinguishers on the bare permutation (zero-sum structures, Boura, Canteaut and
De Cannière, 2011) reach all 24 rounds but at a cost near $2^{1575}$, with no effect
on the hash. The Keccak team's own "crunchy contest" offers prizes for reduced-round
collisions and preimages, and its results are the public scoreboard. The security
margin is about 19 of 24 rounds for collisions, the widest of any standard hash.

!!! note "Life story: the sponge"
    **Born:** 2007, Bertoni, Daemen, Peeters and Van Assche, as the mode of their
    RadioGatún and then Keccak designs; Keccak won the SHA-3 competition in October
    2012 and became FIPS 202 in August 2015 · **Purpose:** a hash mode with a
    single generic bound, $2^{c/2}$, and no Merkle-Damgård weaknesses · **Helped:**
    SHA-3, SHAKE and KMAC; many lightweight designs, including Ascon (SP 800-232)
    · **Status:** sound; the best collisions on Keccak reach 5 or 6 of 24 rounds

## 9.12 HMAC under broken hashes

*Level: intermediate.*

Collision attacks broke MD5 and SHA-1 as signature hashes. HMAC-MD5 and HMAC-SHA-1
went on protecting TLS, IPsec and SSH sessions for years afterward, and no practical
forgery of either was ever published. That is not luck.

**Why collisions do not help.** HMAC (RFC 2104, FIPS 198-1) computes

$$
\text{HMAC}_K(m) = H\bigl( (K \oplus \mathit{opad}) \,\Vert\, H\bigl( (K \oplus \mathit{ipad}) \,\Vert\, m \bigr) \bigr).
$$

The inner hash starts by absorbing a key block, so its chaining value after the
first block is a secret, random-looking value $h_K$ that the attacker does not
know. Every collision attack in this chapter computes its blocks *from* a known
chaining value: message modification needs the actual state words. Starting from
an unknown $h_K$, the attacker cannot run the path, and a collision computed from
MD5's standard IV is useless.

```python
import hashlib, hmac

a = bytes.fromhex(
    "d131dd02c5e6eec4693d9a0698aff95c2fcab58712467eab4004583eb8fb7f89"
    "55ad340609f4b30283e488832571415a085125e8f7cdc99fd91dbdf280373c5b"
    "d8823e3156348f5bae6dacd436c919c6dd53e2b487da03fd02396306d248cda0"
    "e99f33420f577ee8ce54b67080a80d1ec69821bcb6a8839396f9652b6ff72a70")
b = bytearray(a)
for i in (19, 45, 59, 83, 109, 123):
    b[i] ^= 0x80
b = bytes(b)

print("MD5 equal:     ", hashlib.md5(a).digest() == hashlib.md5(b).digest())
key = b"a key the attacker does not know"
print("HMAC-MD5 equal:", hmac.new(key, a, "md5").digest() == hmac.new(key, b, "md5").digest())

# The collision only works from MD5's fixed starting value. HMAC first hashes
# a key block, so the inner hash of `a` starts from a state no one planned for.
ipad = bytes(x ^ 0x36 for x in key.ljust(64, b"\0"))
print("from IV:       ", hashlib.md5(a).hexdigest())
print("after key:     ", hashlib.md5(ipad + a).hexdigest())
print("               ", hashlib.md5(ipad + b).hexdigest())
```

```
MD5 equal:      True
HMAC-MD5 equal: False
from IV:        79054025255fb1a26e4bc422aef54eb4
after key:      2de4363c310d4929108971787855cf3b
                9fdf155b22aaee9de08d4bd239bfbd9e
```

**What HMAC really needs.** In 1996 Mihir Bellare, Ran Canetti and Hugo Krawczyk
proved HMAC secure if the compression function is a pseudorandom function when
keyed through its chaining value and the hash is collision-resistant from a secret
starting value. MD5's collisions came from a known starting value, so they did not
touch the assumption. In 2006 Bellare dropped collision resistance altogether: HMAC
is a pseudorandom function as long as the compression function is one. That is a
much weaker demand than collision resistance, and neither MD5 nor SHA-1 has been
shown to fail it in a practical way.

**The attacks that do exist.** HMAC is not immune to differential attacks; they
just need many more queries, since the attacker must detect path-following pairs
through the MAC's outputs. HMAC-MD4 fell to key-recovery attacks (Contini and Yin,
2006; Fouque, Leurent and Nguyen, 2007). For HMAC-MD5, Wang Xiaoyun and her
coauthors gave a distinguisher in 2009 that needs about $2^{97}$ queries, and
related-key and reduced-round attacks exist. None is practical. HMAC-SHA-1 is still
allowed by NIST for MACs until SHA-1's end in 2030, though nobody should choose it
for a new design, and HMAC-SHA-256 has no known weakness.

**Insiders are different.** Someone who knows the key can of course run the
collision attack from $h_K$ and make two messages with the same HMAC. For a MAC
this does not matter, since a key holder can tag anything anyway. It matters when
HMAC is used as a commitment or a key derivation function shared between parties
who distrust each other, and a few protocols have been caught assuming otherwise.

## 9.13 Going deeper

*Level: expert.*

**Counter-cryptanalysis.** Marc Stevens' 2013 CRYPTO paper turned the attacks into a
defense. Any collision made with a known family of differential paths leaves traces:
the near-collision blocks must have particular message differences, and the
intermediate states must satisfy the path's conditions. Given *one* message, a
detector recomputes the hash and, at each block, checks whether the related message
(with the known message differences applied) would give a near-collision. If so,
the input is half of an attack. The check costs a few times the hash, has no false
positives worth the name, and catches unknown variants that reuse the same
disturbance vectors, which is how it found Flame's new MD5 attack. SHA-1DC in Git
and in GitHub's servers is this detector.

**Free-start, semi-free-start and real.** A **free-start** collision lets the
attacker pick the two starting chaining values (possibly different); a
**semi-free-start** collision picks one starting value used by both messages; a real
collision must start from the IV. Each step down is harder, and the 2015 SHA-1
free-start collision was a warning, not a break of the hash. By the
Merkle-Damgård proof, a hash is collision-resistant if its compression function is,
so a free-start collision removes the proof's support; the hash is broken only when
the attack reaches the IV.

**Neutral bits, boomerangs and the rebound attack.** Biham and Chen's **neutral
bits** (2004) are message bits whose flipping leaves the path's conditions up to
some step intact; a set of them gives many conforming messages for the price of one.
Joux and Peyrin's **boomerangs** (2007) combine local collisions that leave the
conditions untouched into larger neutral changes. For hashes built from AES-like
permutations, Mendel, Rechberger, Schläffer and Thomsen's **rebound attack** (2009)
uses the full degrees of freedom of the state in the middle rounds to satisfy the
expensive part of a truncated-differential path by matching S-box differences
directly, then pays for the outer rounds by chance; it hurt several SHA-3
candidates such as Grøstl's early versions.

**Preimage attacks.** Collisions fell; preimages did not. Meet-in-the-middle
preimage attacks split the compression function into two halves that depend on
different message words (**splice-and-cut**, **initial structures**) and match in
the middle. Yu Sasaki and Kazumaro Aoki found a preimage of the full MD5 in about
$2^{123.4}$ in 2009, and Gaëtan Leurent one of MD4 in about $2^{102}$ in 2008. These
are breaks by definition and irrelevant in practice: MD5 still resists preimages,
which is why old MD5 checksums of files that no attacker prepared still say
something.

**Quantum collision finding.** Brassard, Høyer and Tapp (1998) find collisions with
about $2^{n/3}$ quantum queries, but they need $2^{n/3}$ of quantum-accessible
memory. Daniel Bernstein argued in 2009 that, costed honestly, this is no better
than a classical parallel collision search with $2^{n/3}$ processors. Grover's
algorithm makes preimages cost about $2^{n/2}$ quantum steps that cannot be
parallelized well. A 256-bit hash keeps a comfortable margin against both, which is
why SHA-256 and SHA3-256 are the hashes inside the post-quantum signature standards.

**Hash-function design after the attacks.** The lessons show in every design since:
wide internal states (SHA-512/256, sponges with $c = 2n$), final transformations that
hide the chaining value, nonlinear message expansions, a security margin stated as
rounds attacked over rounds total, and, above all, agility. The systems that
suffered most from MD5 and SHA-1 were the ones that could not change their hash:
certificate chains, Git's object names, firmware signatures. A protocol that names
its hash, and can replace it, survives the next Wang.

## Check yourself

??? question "1. A hash has a 96-bit output. What does a generic preimage cost, and what does a generic collision cost?"

    A preimage costs about $2^{96}$ hash evaluations; a collision about
    $1.25 \cdot 2^{48}$, roughly 350 trillion. The collision is within reach of a
    large GPU cluster; the preimage is not.

??? question "2. A server tags messages as SHA-256(key ‖ message). Which of SHA-512/256, SHA3-256 and HMAC-SHA-256 would stop length extension if used instead, and why?"

    All three. SHA-512/256 outputs only 256 of its 512 state bits, so the attacker
    cannot load the state. SHA3-256 never outputs its capacity. HMAC wraps the inner
    hash in an outer keyed hash, so the tag is not a chaining value the attacker can
    continue.

??? question "3. In the MD5 length-extension example, why did the attacker need the length of the secret but not its value?"

    The padding inserted between the original message and the extra text encodes
    the total length of secret plus message, and the final padding must count every
    byte. The secret's value is already folded into the chaining value, which the
    tag hands over.

??? question "4. How much work does a 2^20-way Joux multicollision cost on a hash with 128-bit chaining values?"

    Twenty birthday searches of about $2^{64}$ each: $20 \cdot 2^{64} \approx 2^{68.3}$.
    For a random function a $2^{20}$-way multicollision would cost close to $2^{128}$.

??? question "5. Why does a second-preimage attack on a long message fail without expandable messages?"

    The forged message would reach the target chaining value after a different
    number of blocks. Merkle-Damgård strengthening puts the total length in the final
    padding block, so the copied tail's padding would not match and the digests
    would differ. An expandable message fixes the length of the forged prefix.

??? question "6. In the toy hash of §9.6, why is bit 9 where every condition sits?"

    The message difference is $+1$ in word 2, used at steps where the rotation is 9.
    The flipped bit 0 of the sum becomes bit 9 of the new state word, and every
    later absorption and the final cancellation by $-2^9$ in word 6 happen at that
    bit.

??? question "7. Why did Wang choose 2^31 for two of MD5's three message differences?"

    Adding $2^{31}$ flips bit 31 and never carries, so the difference passes through
    every modular addition with probability 1. Through the XOR round two bit-31
    differences cancel and one passes, again with no conditions. That makes rounds 3
    and 4, where message modification cannot help, almost free.

??? question "8. A certificate authority signs with MD5 but uses random serial numbers. Does that stop the 2008 rogue-CA attack?"

    It stops that attack as it was run, because the attacker must know the whole
    prefix of the certificate before the authority signs it, and a random serial
    number placed before the attacker's data is unpredictable. That is why random
    serial numbers became standard practice, and later a rule of the CA/Browser
    Forum. It does not make MD5 safe: the attacker still
    controls most of the content, and Flame shows that other fields can be
    exploited.

??? question "9. A sponge has a 256-bit output and a 128-bit capacity. What is the cost of a generic collision?"

    About $2^{64}$, from an inner collision on the 128-bit capacity, not the
    $2^{128}$ that the output length suggests. SHA-3 sets $c = 2n$ to avoid this.

??? question "10. HMAC-MD5 survived the MD5 collisions. Name two reasons."

    The inner hash starts from a secret chaining value that depends on the key, so
    the collision attacks, which need known state words, cannot be run by an
    outsider. And HMAC's security proof (Bellare, 2006) needs only that the
    compression function be a pseudorandom function, which the collision attacks
    do not contradict.

## What you learned

- A hash has three goals with generic prices $2^n$ (preimage and second preimage)
  and $2^{n/2}$ (collision); a break is any attack below them.
- Merkle-Damgård hands out three weaknesses whatever the compression function:
  length extension, Joux multicollisions, and the long-message second preimages and
  herding built on them. HMAC, truncation and the sponge are the fixes.
- Differential attacks on hashes follow a differential path with conditions on
  state bits; message modification satisfies the first round's conditions by
  solving for message words, so only the later rounds cost trials.
- Wang's two-block MD5 path uses $2^{31}$ differences that pass rounds 3 and 4 for
  free; you traced it through all 128 steps.
- Chosen-prefix collisions (a birthday phase, then near-collision blocks) made the
  rogue certificate authority (2008) and Flame's forged Microsoft certificate
  (2012) possible.
- SHA-1 went from $2^{69}$ on paper (2005) to SHAttered (2017, $2^{63.1}$) and a
  chosen-prefix collision for about \$45,000 (2020).
- SHA-2's nonlinear message expansion, faster-mixing steps and margin have kept
  attacks to 31 of 64 steps; the sponge's capacity removes length extension and
  bounds all generic attacks by $2^{c/2}$.

**Next:** [Chapter 10](10-Attacks-on-Modes-and-MACs.md), attacks on modes of
operation and message authentication codes: padding oracles, nonce reuse and the
rest of what goes wrong when good primitives are put together badly.

## Further reading

- Antoine Joux, "Multicollisions in Iterated Hash Functions. Application to
  Cascaded Constructions" (CRYPTO 2004).
- John Kelsey and Bruce Schneier, "Second Preimages on n-bit Hash Functions for
  Much Less than 2^n Work" (EUROCRYPT 2005).
- John Kelsey and Tadayoshi Kohno, "Herding Hash Functions and the Nostradamus
  Attack" (EUROCRYPT 2006).
- Hans Dobbertin, "Cryptanalysis of MD4", *Journal of Cryptology* 11 (1998;
  FSE 1996), and "The Status of MD5 After a Recent Attack", *CryptoBytes* 2 (1996).
- Bert den Boer and Antoon Bosselaers, "Collisions for the Compression Function of
  MD5" (EUROCRYPT 1993).
- Xiaoyun Wang, Xuejia Lai, Dengguo Feng, Hui Chen and Xiuyuan Yu, "Cryptanalysis of
  the Hash Functions MD4 and RIPEMD" (EUROCRYPT 2005); Xiaoyun Wang and Hongbo Yu,
  "How to Break MD5 and Other Hash Functions" (EUROCRYPT 2005).
- Xiaoyun Wang, Yiqun Lisa Yin and Hongbo Yu, "Finding Collisions in the Full
  SHA-1" (CRYPTO 2005); Wang, Yu and Yin, "Efficient Collision Search Attacks on
  SHA-0" (CRYPTO 2005).
- Florent Chabaud and Antoine Joux, "Differential Collisions in SHA-0" (CRYPTO 1998).
- Vlastimil Klima, "Tunnels in Hash Functions: MD5 Collisions Within a Minute"
  (IACR ePrint 2006/105).
- Marc Stevens, Arjen Lenstra and Benne de Weger, "Chosen-Prefix Collisions for MD5
  and Colliding X.509 Certificates for Different Identities" (EUROCRYPT 2007).
- Marc Stevens, Alexander Sotirov, Jacob Appelbaum, Arjen Lenstra, David Molnar,
  Dag Arne Osvik and Benne de Weger, "Short Chosen-Prefix Collisions for MD5 and the
  Creation of a Rogue CA Certificate" (CRYPTO 2009).
- Marc Stevens, "Counter-Cryptanalysis" (CRYPTO 2013); Max Fillinger and Marc
  Stevens, "Reverse-Engineering of the Cryptanalytic Attack Used in the Flame
  Super-Malware" (ASIACRYPT 2015).
- Marc Stevens, Pierre Karpman and Thomas Peyrin, "Freestart Collision for Full
  SHA-1" (EUROCRYPT 2016).
- [Marc Stevens, Elie Bursztein, Pierre Karpman, Ange Albertini and Yarik Markov,
  "The First Collision for Full SHA-1" (CRYPTO 2017)](https://shattered.io/).
- [Gaëtan Leurent and Thomas Peyrin, "SHA-1 is a Shambles: First Chosen-Prefix
  Collision on SHA-1 and Application to the PGP Web of Trust" (USENIX Security
  2020)](https://sha-mbles.github.io/); and "From Collisions to Chosen-Prefix
  Collisions: Application to Full SHA-1" (EUROCRYPT 2019).
- Florian Mendel, Tomislav Nad and Martin Schläffer, "Improving Local Collisions:
  New Attacks on Reduced SHA-256" (EUROCRYPT 2013); Yingxin Li, Fukang Liu and Gaoli
  Wang, "New Records in Collision Attacks on SHA-2" (EUROCRYPT 2024).
- Guido Bertoni, Joan Daemen, Michaël Peeters and Gilles Van Assche, "On the
  Indifferentiability of the Sponge Construction" (EUROCRYPT 2008); FIPS 202 (2015).
- Jian Guo, Guohong Liao, Guozhen Liu, Meicheng Liu, Kexin Qiao and Ling Song,
  "Practical Collision Attacks against Round-Reduced SHA-3", *Journal of
  Cryptology* 33 (2020).
- Mihir Bellare, Ran Canetti and Hugo Krawczyk, "Keying Hash Functions for Message
  Authentication" (CRYPTO 1996); Mihir Bellare, "New Proofs for NMAC and HMAC:
  Security without Collision-Resistance" (CRYPTO 2006); RFC 2104; FIPS 198-1.
- RFC 6151, updated security considerations for MD5 and HMAC-MD5 (2011); FIPS 180-4
  (the SHA-1 and SHA-2 standard).
- Thai Duong and Juliano Rizzo, "Flickr's API Signature Forgery Vulnerability"
  (2009).
