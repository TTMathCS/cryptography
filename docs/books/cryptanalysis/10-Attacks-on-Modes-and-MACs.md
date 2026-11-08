# 10. Attacks on Modes and Message Authentication

*AES has never been broken, yet for fifteen years attackers read HTTPS cookies
and forged web sessions protected by it. They attacked what was built around
the cipher: the padding, the IVs, the order of encryption and MAC, the
nonces, 64-bit blocks and compression. You will recover a byte through a padding oracle by hand and count what it
costs, see why SSL 3.0's padding made POODLE a 256-request game, turn a single
SHA-1 compression into a timing oracle, line up blocks for BEAST, read two
messages that shared a keystream, solve for GCM's hash key as the root of a
polynomial over $\mathrm{GF}(2^{128})$, count Sweet32's collisions and watch a
compressed length give away a secret. The chapter ends with the rule that would
have prevented most of it.*

!!! abstract "In this chapter"
    **You will learn:**

    - how one bit of feedback, "was the padding valid?", decrypts CBC, by hand,
      with the exact query count;
    - why POODLE costs 256 requests per byte and Vaudenay's attack only 128;
    - how Lucky Thirteen made one hash compression an oracle, and what
      "constant time" had to mean to stop it;
    - how BEAST used a predictable IV and a moving block boundary to guess a
      cookie one byte at a time;
    - why a repeated nonce in CTR mode is a two-time pad, and why in GCM it
      also hands over the authentication key, as a root of a polynomial;
    - how the birthday bound becomes an attack on 64-bit blocks (Sweet32);
    - how CRIME and BREACH read secrets from compressed lengths alone;
    - the cryptographic doom principle, what AEAD and misuse-resistant modes fix,
      and what they do not.

    **You need:** [Chapter 1](01-What-Cryptanalysis-Is.md) (attack models,
    especially chosen ciphertext) and [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)
    (the birthday bound). From book 1: CBC, CTR and padding in
    [Chapter 8](../../book/08-Modes-of-Operation.md), and MACs, GCM and AEAD in
    [Chapter 10](../../book/10-Message-Authentication.md). Both chapters close
    with a short "Break it"; this chapter starts where they stop. XOR, and for
    §10.7 a little algebra over finite fields.

    **Levels:** §10.1, §10.2 and §10.6 are for beginners; §10.3 to §10.5,
    §10.8, §10.10 and §10.11 are intermediate; §10.7, §10.9 and §10.12 are
    expert.

## 10.1 The problem

*Level: beginner.*

A block cipher encrypts one block. Nobody sends one block. A web page, a file
or a voice call is thousands of blocks long, so every real system wraps the
cipher in a **mode of operation** (CBC, CTR, GCM) that strings blocks
together, and usually in a **MAC** that detects tampering. The cipher is the
part that cryptographers test hardest. The wrapping is the part that
programmers write, and for most of the history of the web it was where the
breaks were.

Book 1 met the two simplest examples. In
[§8.6](../../book/08-Modes-of-Operation.md) flipping bits of a CBC
ciphertext changed the plaintext at will, and a server that said whether
padding was valid let an attacker read a message without the key. In
[§10.9](../../book/10-Message-Authentication.md) one repeated nonce in GCM gave
away the authentication key. Those sections show *that* the attacks work, with
complete programs. This chapter is about *why* they work, what they cost, how
each one was found, and what the people who fixed them learned.

The attacks share a shape. Each one gives the attacker a way to ask the
victim a question about a secret, one small question at a time:

- **An oracle.** The attacker sends a ciphertext it made and watches the
  reply: an error message, a closed connection, a few microseconds of delay.
  One bit per question is plenty.
- **A predictable or repeated value.** CBC needs an IV the attacker cannot
  predict; CTR and GCM need a nonce that never repeats. When the first is
  predictable, the attacker can test guesses (BEAST). When the second repeats,
  two messages share a keystream, and in GCM two tags share a mask.
- **A side effect before the check.** Compression shrinks repeated text, so
  the length of an encrypted message says whether attacker text matched a
  secret (CRIME, BREACH). Decrypting before checking the MAC lets the
  attacker probe the decryption code (Vaudenay, Lucky Thirteen, POODLE).
- **Too much data under one key.** A 64-bit block repeats after about $2^{32}$
  blocks, and each repeat leaks the XOR of two plaintext blocks (Sweet32).

None of these needs a weakness in the block cipher. They would work against
an ideal cipher, which is why they are attacks on *modes*. In the language of
[Chapter 1](01-What-Cryptanalysis-Is.md), most of them are **chosen-ciphertext**
or **blockwise-adaptive chosen-plaintext** attacks, made practical by the
web: a script on any page the victim visits can make the browser send
thousands of requests to another site, each carrying that site's cookies.

The history runs from 2002 to TLS 1.3 in 2018. Almost every attack was
described in principle years before it worked against real traffic, and each
fix left room for the next. Figure 10.1 shows the main events.

<figure class="mars-fig">
<svg viewBox="0 0 640 470" width="640" role="img" aria-label="Timeline of attacks on modes and MACs from Bellare and Namprempre in 2000 to AES-GCM-SIV in 2019" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="460" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="29" text-anchor="end" font-weight="bold">2000</text>
<circle cx="92" cy="24" r="3.5"/>
<text x="108" y="29">Bellare and Namprempre: only encrypt-then-MAC is safe in general</text>
<text x="78" y="59" text-anchor="end" font-weight="bold">2002</text>
<circle cx="92" cy="54" r="3.5"/>
<text x="108" y="59">Vaudenay's padding oracle; Kelsey on compression leaks</text>
<text x="78" y="89" text-anchor="end" font-weight="bold">2003</text>
<circle cx="92" cy="84" r="3.5"/>
<text x="108" y="89">Canvel et al. time the oracle and read IMAP passwords over TLS</text>
<text x="78" y="119" text-anchor="end" font-weight="bold">2004</text>
<circle cx="92" cy="114" r="3.5"/>
<text x="108" y="119">Bard and Möller: SSL's chained IVs are predictable</text>
<text x="78" y="149" text-anchor="end" font-weight="bold">2006</text>
<circle cx="92" cy="144" r="3.5"/>
<text x="108" y="149">Joux's "forbidden attack" on GCM; TLS 1.1 uses fresh IVs</text>
<text x="78" y="179" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="174" r="3.5"/>
<text x="108" y="179">Duong and Rizzo: padding oracles in ASP.NET</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2011</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">BEAST reads cookies through TLS 1.0's chained IVs</text>
<text x="78" y="239" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="234" r="3.5"/>
<text x="108" y="239">CRIME reads cookies through TLS and SPDY compression</text>
<text x="78" y="269" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="264" r="3.5"/>
<text x="108" y="269">Lucky Thirteen (timing); BREACH (HTTP compression)</text>
<text x="78" y="299" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="294" r="3.5"/>
<text x="108" y="299">POODLE ends SSL 3.0</text>
<text x="78" y="329" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="324" r="3.5"/>
<text x="108" y="329">Sweet32 (64-bit blocks); GCM nonce reuse found on live servers</text>
<text x="78" y="359" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="354" r="3.5"/>
<text x="108" y="359">TLS 1.3 allows only AEAD; Efail breaks encrypted email</text>
<text x="78" y="389" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="384" r="3.5"/>
<text x="108" y="389">AES-GCM-SIV published as RFC 8452</text>
<line x1="108" y1="412" x2="620" y2="412" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.5"/>
<text x="108" y="436">Most attacks were known in principle years before they</text>
<text x="108" y="456">worked on real traffic; each fix left room for the next.</text>
</svg>
<figcaption>Figure 10.1. Attacks on modes and MACs, 2000 to 2019. The cipher underneath (DES, triple DES, AES) was never the weak point.</figcaption>
</figure>

## 10.2 The padding oracle, by hand

*Level: beginner.*

In 2002 Serge Vaudenay, a professor at EPFL in Lausanne, presented a short
paper at EUROCRYPT in Amsterdam with a long title: "Security Flaws Induced by
CBC Padding: Applications to SSL, IPSEC, WTLS...". Its idea fits in a
sentence. If a receiver decrypts a CBC message and then tells the sender, in
any way at all, whether the padding was well formed, then anyone who can send
it messages can decrypt any ciphertext it would accept, without the key.

Book 1 ([§8.6](../../book/08-Modes-of-Operation.md)) gives the attack as a
complete program and recovers 32 bytes with 3,484 questions. Here we slow down
and do two bytes by pen and paper, then count exactly what the attack costs and
why.

### What the receiver does

Recall CBC decryption of one block and the PKCS#7 padding rule. With block
cipher $E_K$ and its inverse $D_K$, a block $C_i$ decrypts as

$$
P_i = D_K(C_i) \oplus C_{i-1},
$$

where $C_0$ is the IV. The last block of a message ends in $n$ bytes of value
$n$, for some $n$ between 1 and 16: `01`, or `02 02`, or `03 03 03`, and so on.
The receiver strips the padding and complains if it is not of that form.

The attacker wants $P_i$. It holds $C_{i-1}$ and $C_i$ because it recorded
them. What it lacks is $D_K(C_i)$, the block cipher's output before the XOR.
Call that block the **intermediate** $I = D_K(C_i)$. If the attacker learns
$I$, then $P_i = I \oplus C_{i-1}$ in one XOR.

The trick is to send the receiver a two-block message of its own: a block $F$
that it chooses freely, followed by the target block $C_i$. The receiver
treats $F$ as the IV (or as the previous ciphertext block) and computes

$$
P' = D_K(C_i) \oplus F = I \oplus F,
$$

then checks the padding of $P'$. The attacker controls $F$ completely, so it
controls $P'$ up to the unknown $I$. Every answer of the oracle is a statement
about $I \oplus F$.

### Two bytes by hand

Take a real-looking case. The target block's plaintext ends in the two ASCII
digits `1` and `7` (bytes `31 37`), the last two bytes of a PIN. The recorded
previous block $C_{i-1}$ ends in `6C C1`. So the intermediate ends in

$$
I_{14} = \mathtt{31} \oplus \mathtt{6C} = \mathtt{5D}, \qquad
I_{15} = \mathtt{37} \oplus \mathtt{C1} = \mathtt{F6}.
$$

The attacker does not know these values. It will find them. Bytes are
numbered 0 to 15 from the left, so byte 15 is the last.

<div class="mars-steps" markdown>

1. Pick any $F$, say with $F_{14} = \mathtt{A0}$, and try $F_{15} = \mathtt{00}, \mathtt{01}, \mathtt{02}, \ldots$ in turn. The receiver computes $P'_{15} = I_{15} \oplus F_{15} = \mathtt{F6} \oplus F_{15}$. For 247 values the last byte of $P'$ is not `01`, and (as we will see) not part of any longer valid padding, so the receiver rejects.
2. At $F_{15} = \mathtt{F7}$, query number 248, $P'_{15} = \mathtt{F6} \oplus \mathtt{F7} = \mathtt{01}$. That is valid padding. The receiver accepts the padding (and then fails on the MAC or the content, but that is a different answer).
3. Could the success be a lucky `02 02` instead? Here $P'_{14} = \mathtt{5D} \oplus \mathtt{A0} = \mathtt{FD}$, so no, but the attacker cannot see that. It changes $F_{14}$ to anything else and asks again (query 249). The padding is still valid, so the last byte alone was the padding: $P'_{15} = \mathtt{01}$.
4. Solve: $I_{15} = F_{15} \oplus \mathtt{01} = \mathtt{F7} \oplus \mathtt{01} = \mathtt{F6}$. The plaintext byte is $I_{15} \oplus C_{i-1,15} = \mathtt{F6} \oplus \mathtt{C1} = \mathtt{37}$, the digit `7`.
5. Next byte. Set $F_{15} = I_{15} \oplus \mathtt{02} = \mathtt{F4}$, which forces $P'_{15} = \mathtt{02}$. Now try $F_{14} = \mathtt{00}, \mathtt{01}, \ldots$. The padding is valid only when $P'_{14} = \mathtt{02}$ too, which happens at $F_{14} = \mathtt{5D} \oplus \mathtt{02} = \mathtt{5F}$, query 96 of this round.
6. Solve: $I_{14} = \mathtt{5F} \oplus \mathtt{02} = \mathtt{5D}$, and the plaintext byte is $\mathtt{5D} \oplus \mathtt{6C} = \mathtt{31}$, the digit `1`.

</div>

Two bytes cost $248 + 1 + 96 = 345$ questions. The attacker now knows the PIN
ends in `17`, and it continues the same way for bytes 13, 12, down to 0,
aiming each time for one more byte of padding: `03 03 03`, then
`04 04 04 04`. Figure 10.2 shows the moment of step 2.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="One successful padding oracle probe: the attacker's block F XORed with the unknown intermediate D_K(C) gives a plaintext ending in 01, which the receiver accepts" fill="currentColor" font-size="14">
<text x="20" y="40">attacker's F</text>
<rect x="190" y="20" width="300" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="340" y="41" text-anchor="middle" font-family="monospace">.. .. .. A0 F7</text>
<text x="505" y="41" font-size="13">chosen, sent</text>
<text x="20" y="100">I = D_K(C)</text>
<rect x="190" y="80" width="300" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<text x="340" y="101" text-anchor="middle" font-family="monospace">?? ?? ?? 5D F6</text>
<text x="505" y="101" font-size="13">unknown</text>
<line x1="340" y1="112" x2="340" y2="140" stroke="currentColor" stroke-width="1.4"/>
<circle cx="340" cy="152" r="11" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="329" y1="152" x2="351" y2="152" stroke="currentColor" stroke-width="1.4"/>
<line x1="340" y1="141" x2="340" y2="163" stroke="currentColor" stroke-width="1.4"/>
<line x1="180" y1="35" x2="160" y2="35" stroke="currentColor" stroke-width="1.4"/>
<line x1="160" y1="35" x2="160" y2="152" stroke="currentColor" stroke-width="1.4"/>
<line x1="160" y1="152" x2="327" y2="152" stroke="currentColor" stroke-width="1.4"/>
<line x1="340" y1="164" x2="340" y2="190" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="215">P' = I XOR F</text>
<rect x="190" y="195" width="300" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="340" y="216" text-anchor="middle" font-family="monospace">?? ?? ?? FD 01</text>
<rect x="430" y="197" width="56" height="26" rx="3" fill="currentColor" opacity="0.15"/>
<text x="505" y="216" font-size="13">ends in 01</text>
<text x="20" y="265" font-weight="bold">receiver: "padding OK"</text>
<text x="20" y="288" font-size="13">so I ends in F7 XOR 01 = F6, and the plaintext byte is F6 XOR C1 = 37, the digit 7</text>
</svg>
<figcaption>Figure 10.2. Step 2 of the hand example. The attacker never sees I or P'; it sees only the accept, and that one bit pins the last byte of I.</figcaption>
</figure>

### Why it is correct

The attack rests on two facts. First, XOR with a known value is a bijection,
so as $F_{15}$ runs through all 256 byte values, $P'_{15} = I_{15} \oplus F_{15}$
also runs through all 256 values, each exactly once. Exactly one of them is
`01`. Second, the padding check depends only on $P'$, and $P'$ depends on the
key only through the fixed block $I$. The attacker is solving the equation
$I_{15} \oplus F_{15} = \mathtt{01}$ for the unknown $I_{15}$, with the oracle
as a test of whether a candidate solves it.

For byte $j$ (counting the padding length $n = 16 - j$), the attacker already
knows $I_{j+1}, \ldots, I_{15}$ and sets
$F_k = I_k \oplus n$ for those positions, which makes them all equal $n$. Then
the padding is valid exactly when $P'_j = n$ as well, that is when
$F_j = I_j \oplus n$. The only exception is the last byte, where a valid
ending can be longer than one byte; step 3 rules that out.

### Counting the cost

How many questions does a byte cost on average? Suppose the attacker tries
the values in order and the right one, $v$, is equally likely to be any of the
256. If $v$ is the $k$-th value tried, the cost is $k$ queries, except that
after 255 failures the attacker knows the last value is right without asking.
So the expected cost is

$$
\frac{1}{256}\left(\sum_{k=1}^{255} k + 255\right)
= \frac{32640 + 255}{256} = \frac{32895}{256} \approx 128.5 .
$$

Roughly half the byte values, as for any search of an unsorted list. A
16-byte block costs about $16 \times 128.5 \approx 2056$ questions, against
$2^{128}$ for guessing it blind: asking about one byte at a time turns an
exponential search into a linear one, like a combination lock that clicks when
one wheel is right.

Why so many questions for 8 bits? An oracle that split the candidates in
half each time would finish a byte in 8. The padding oracle instead answers
"is $I_j$ exactly this value?", a needle test that eliminates one candidate per
question, so $k$ equally likely candidates cost about $k/2$ tests. That is why
knowing the alphabet helps so much. If the secret is a base64 cookie, only 64 values are possible for each
byte, and the attacker tries those first: about 32.5 questions a byte.

The false positive in step 3 can also be priced. When the attacker searches
for the last byte, valid paddings longer than one byte can also appear. The
guess that makes $P'_{15} = \mathtt{02}$ passes if $P'_{14}$ happens to be `02`,
probability $1/256$; the guess that gives `03` passes if two bytes happen to be
`03 03`, probability $1/256^2$; and so on. The expected number of extra
accepts is about $1/255$, and the attacker meets the extra one *before* the
real one about half the time. One check query per block removes the doubt.

```python
from fractions import Fraction

# Try candidate values in order. If the right value is the k-th tried, the
# search costs k queries, but after n - 1 failures the last one needs no query.
def expected_queries(n):
    return Fraction(sum(range(1, n)) + (n - 1), n)

print("any byte:      ", expected_queries(256), float(expected_queries(256)))
print("base64 byte:   ", expected_queries(64), float(expected_queries(64)))
print("16-byte block: ", round(16 * float(expected_queries(256))))

# Last byte only: chance that some guess other than the real one also gives
# valid padding (02 02, 03 03 03, ...), with the earlier bytes of P' random.
extra = sum(Fraction(1, 256 ** (n - 1)) for n in range(2, 17))
print("extra accept:  ", float(extra), "about 1 in", round(1 / float(extra)))
```

```
any byte:       32895/256 128.49609375
base64 byte:    2079/64 32.484375
16-byte block:  2056
extra accept:   0.00392156862745098 about 1 in 255
```

### Where the oracle came from

Vaudenay's paper was first seen as academic: TLS encrypted its alerts, so
the attacker could not read *which* error occurred, and a failed record ended
the session. Within a year both objections fell. In 2003
Brice Canvel, Alain Hiltgen, Serge Vaudenay and Martin Vuagnoux showed at
CRYPTO that OpenSSL answered faster when the padding was bad, because it
skipped the MAC computation, so the *time* to the alert was the oracle. And
the email program they attacked, Outlook Express, logged in to its IMAP server
over TLS with the same password every few minutes, so every new session
carried the same secret in the same place. They read the password. OpenSSL
responded by computing the MAC even when the padding was bad, which shrank the
timing gap but, as §10.4 shows, did not close it.

The attack then moved wherever CBC was used without authentication. In 2010
Juliano Rizzo and Thai Duong showed at Ekoparty in Buenos Aires that ASP.NET,
Microsoft's web framework, gave different errors for bad padding in the
encrypted state it handed to browsers. They decrypted that state and, worse,
ran the attack backwards to *encrypt* data of their choosing, which let them
download files such as the server's configuration; Microsoft shipped an
emergency patch (MS10-070). Since $P' = I \oplus F$ and $I$ can be learned for
any block, the attacker can set $F = I \oplus P'$ for any $P'$ it wants, block
by block from the end: a padding oracle is also an encryption oracle. In 2011
Tibor Jager and Juraj Somorovsky broke the W3C's XML Encryption the same way.

!!! note "Life story: the padding oracle attack"
    **Born:** EUROCRYPT 2002, Serge Vaudenay at EPFL; turned into a timing
    attack on TLS by Canvel, Hiltgen, Vaudenay and Vuagnoux (CRYPTO 2003) ·
    **Purpose:** to show that a one-bit answer about padding decrypts CBC at
    about 128 queries per byte, and can encrypt too · **Helped:** to retire
    MAC-then-encrypt and unauthenticated CBC; famous cases in ASP.NET (2010),
    XML Encryption (2011), Lucky Thirteen (2013) and POODLE (2014) · **Status:**
    still found every year in software that decrypts before it authenticates

Daniel Bleichenbacher had found the same kind of oracle in RSA encryption four
years earlier, in 1998: a server that says whether a decrypted RSA message had
valid PKCS#1 v1.5 padding lets an attacker decrypt with about a million
questions. That attack belongs to [Chapter 13](13-Attacks-on-RSA.md), but the
lesson is the same. **Any** observable difference in how a receiver handles a
malformed ciphertext is an oracle, and an oracle about decrypted data is
usually enough to read that data.

## 10.3 POODLE: SSL 3.0's loose padding

*Level: intermediate.*

SSL 3.0 was designed at Netscape in 1996 by Alan Freier, Philip Karlton and
Paul Kocher. Its CBC padding rule was looser than PKCS#7: the **last** byte
gives the number of padding bytes before it, that number must be less than the
block size, and the padding bytes themselves can be anything. The receiver
checks only the last byte. TLS 1.0, three years later, required every padding
byte to equal the length, but SSL 3.0 stayed in browsers and servers as a
fallback for old systems.

In October 2014 Bodo Möller, Thai Duong and Krzysztof Kotowicz of Google
published "This POODLE Bites: Exploiting the SSL 3.0 Fallback". POODLE stands
for **Padding Oracle On Downgraded Legacy Encryption**, and both halves of the
name matter.

### The downgrade

In 2014 almost no one chose SSL 3.0. But browsers had a habit, the
**downgrade dance**: if a TLS handshake failed, they retried with older
versions, down to SSL 3.0, because some broken servers choked on newer version
numbers. An attacker on the network path can make handshakes fail and so walk
the browser down to SSL 3.0 with any server that still accepts it. Most did.

### The oracle, by hand

Now the attacker needs SSL 3.0's padding to answer a question. In SSL 3.0 the
MAC covers the data but not the padding, the padding comes last, and the
receiver checks the MAC after stripping the padding. Suppose the attacker
arranges, by choosing the length of the request, that the padding fills a
whole block: the final block $C_n$ decrypts to fifteen arbitrary bytes and
then the length byte `0F` (15). Now it replaces $C_n$ with a copy of an
earlier block $C_i$ that holds a secret byte in its last position.

The receiver decrypts the new last block as $D_K(C_i) \oplus C_{n-1}$ and
reads only its last byte. If that byte is `0F`, it strips exactly sixteen
bytes, the right amount, finds the MAC where it should be and the MAC still
matches, because neither the data nor the MAC has changed; the request goes
through. If the byte is anything else, it strips the wrong amount and the MAC
fails. So the server accepts with probability $1/256$, and when it accepts,

$$
D_K(C_i)_{15} \oplus C_{n-1,15} = \mathtt{0F}.
$$

But the real plaintext of block $i$ is $P_{i,15} = D_K(C_i)_{15} \oplus C_{i-1,15}$,
so

$$
P_{i,15} = \mathtt{0F} \oplus C_{n-1,15} \oplus C_{i-1,15},
$$

and every term on the right is on the wire.

Take numbers. On the attempt that succeeds, the recorded blocks end in
$C_{n-1,15} = \mathtt{92}$ and $C_{i-1,15} = \mathtt{F6}$. Then
$P_{i,15} = \mathtt{0F} \oplus \mathtt{92} \oplus \mathtt{F6} = \mathtt{6B}$,
the letter `k`. On every failed attempt the server closes the connection, the
browser reconnects, and the script on the attacker's page sends the request
again. The new connection has new keys and new IVs, so the same secret byte
sits under fresh ciphertext and the attacker gets a fresh 1-in-256 chance.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="POODLE: the attacker copies the ciphertext block holding a cookie byte into the place of the final padding block" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">as sent by the browser</text>
<rect x="20" y="40" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="62" text-anchor="middle">C1 ... </text>
<rect x="140" y="40" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="195" y="62" text-anchor="middle">C(i-1)</text>
<rect x="260" y="40" width="110" height="34" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="260" y="40" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="62" text-anchor="middle">C(i)</text>
<rect x="380" y="40" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="435" y="62" text-anchor="middle">... C(n-1)</text>
<rect x="500" y="40" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="62" text-anchor="middle">C(n)</text>
<text x="315" y="96" text-anchor="middle" font-size="13">"...sid=k"</text>
<text x="555" y="96" text-anchor="middle" font-size="13">15 junk + 0F</text>
<text x="20" y="150" font-weight="bold">as forwarded by the attacker</text>
<rect x="20" y="162" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="184" text-anchor="middle">C1 ... </text>
<rect x="140" y="162" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="195" y="184" text-anchor="middle">C(i-1)</text>
<rect x="260" y="162" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="184" text-anchor="middle">C(i)</text>
<rect x="380" y="162" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="435" y="184" text-anchor="middle">... C(n-1)</text>
<rect x="500" y="162" width="110" height="34" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="500" y="162" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="184" text-anchor="middle">copy of C(i)</text>
<line x1="315" y1="104" x2="315" y2="125" stroke="currentColor" stroke-width="1.4"/>
<line x1="315" y1="125" x2="555" y2="125" stroke="currentColor" stroke-width="1.4"/>
<line x1="555" y1="125" x2="555" y2="156" stroke="currentColor" stroke-width="1.4"/>
<polygon points="555,160 551,151 559,151"/>
<text x="20" y="232" font-size="13">server reads only the last byte: D_K(C(i)) XOR C(n-1) ends in 0F with chance 1/256;</text>
<text x="20" y="252" font-size="13">then the cookie byte is 0F XOR (last byte of C(n-1)) XOR (last byte of C(i-1)).</text>
</svg>
<figcaption>Figure 10.3. POODLE's block swap. The request is shaped so that a cookie byte ends block i and the padding fills block n; one accepted request in 256 reveals the cookie byte.</figcaption>
</figure>

To read the next byte, the script makes the URL one byte longer and the body
one byte shorter. Every byte of the cookie moves one place to the right, the
next unknown byte becomes the last byte of a block, and the total length, and
with it the full block of padding, stays the same.

### Why POODLE needs 256 and Vaudenay 128

Both attacks hit one byte value in 256, but they differ in who chooses the
probe. Vaudenay's attacker sets $F_j$ itself and walks through the values
without repeating, so it is searching an unsorted list of 256 and finds the
answer after about 128 tries. POODLE's attacker cannot choose anything: each
connection hands it a fresh random value of $D_K(C_i)_{15} \oplus C_{n-1,15}$,
and it waits for that value to be `0F`. That is sampling *with* replacement, a
geometric distribution with success probability $p = 1/256$, whose mean is
$1/p = 256$. The tail is long: the chance that a byte needs more than $m$
requests is $(255/256)^m$.

```python
import math

p = 1 / 256
print("mean requests per byte:", 1 / p)
print("median:", math.ceil(math.log(0.5) / math.log(1 - p)))
for m in (500, 1000, 2000):
    print(f"P(more than {m} requests) = {(1 - p) ** m:.4f}")
print("16-byte cookie, expected requests:", round(16 / p))
```

```
mean requests per byte: 256.0
median: 178
P(more than 500 requests) = 0.1413
P(more than 1000 requests) = 0.0200
P(more than 2000 requests) = 0.0004
16-byte cookie, expected requests: 4096
```

A few thousand requests take a browser minutes at most.

### The aftermath

The fix was to stop using SSL 3.0. Browsers dropped the downgrade dance and
then SSL 3.0 itself within months, a signal value (the "fallback SCSV") let
servers detect a forced downgrade, and in June 2015 the IETF deprecated SSL
3.0. In December 2014 a second wave followed: some TLS implementations,
notably in F5 and A10 load balancers, had kept SSL 3.0's lax padding check for
TLS, so the attack worked with no downgrade at all. Craig Young found more in
2019 (Zombie POODLE and GOLDENDOODLE). Old padding code lingers.

!!! note "Life story: POODLE"
    **Born:** 14 October 2014, Bodo Möller, Thai Duong and Krzysztof Kotowicz
    at Google · **Purpose:** to show that SSL 3.0's unchecked padding plus the
    browser downgrade dance let a network attacker read cookies at 256
    requests per byte · **Helped:** to remove SSL 3.0 from every major browser
    within months and to end the downgrade dance; the TLS variant (December
    2014) exposed sloppy padding checks in load balancers · **Status:** SSL 3.0
    is gone; padding checks that look only at the last byte still turn up

## 10.4 Lucky Thirteen: an oracle made of time

*Level: intermediate.*

After 2003 every serious TLS implementation tried to make bad padding and a
bad MAC look the same: one alert, and the MAC computed in both cases. TLS 1.2
itself advised implementations that found bad padding to compute the MAC
anyway, as if the padding had been empty, and added that this "leaves a small
timing channel ... but it is not believed to be large enough to be
exploitable". In February 2013 Nadhem AlFardan and Kenneth Paterson at Royal
Holloway, University of London, showed that it was large enough. They called
the attack **Lucky Thirteen**, after the 13 bytes of record header that TLS
feeds into its MAC.

### Where the time goes

TLS with CBC uses **MAC-then-encrypt**. The sender computes
HMAC-SHA1 over a 13-byte header (8-byte sequence number, 1-byte type,
2-byte version, 2-byte length) and the data, appends the 20-byte MAC, pads,
and encrypts. The receiver decrypts, checks and removes the padding, and then
computes the MAC over what is left. The length of "what is left" depends on
the padding, and the time HMAC takes depends on that length, because SHA-1
works in 64-byte blocks.

SHA-1 hashes $\ell$ bytes with $\lceil (\ell + 9)/64 \rceil$ calls of its
compression function: the message, a `80` byte, zeros and an 8-byte length
must fill whole blocks. HMAC hashes twice. The inner hash covers a 64-byte key
block, the 13-byte header and the $L$ bytes of data; the outer hash covers a
64-byte key block and the 20-byte inner digest. So the total is

$$
N(L) = \left\lceil \frac{64 + 13 + L + 9}{64} \right\rceil + \left\lceil \frac{64 + 20 + 9}{64} \right\rceil .
$$

Take a ciphertext of four AES blocks (64 bytes) after the IV. The data
length is $L = 64 - 20 - (\text{padding bytes})$, and the code counts the
compression calls for each way the decrypted record can end:

```python
import math

def calls(data_len):                     # SHA-1 compression calls for HMAC-SHA1
    inner = math.ceil((64 + 13 + data_len + 9) / 64)   # key block, header, data
    outer = math.ceil((64 + 20 + 9) / 64)              # key block, inner digest
    return inner + outer

record = 64                              # four 16-byte blocks of plaintext
cases = [("ends 00          (1 padding byte)", 1),
         ("ends 01 01       (2 padding bytes)", 2),
         ("ends 02 02 02    (3 padding bytes)", 3),
         ("bad padding, MAC'd as if empty", 1)]
for name, pad in cases:
    L = record - 20 - pad
    print(f"{name}: L = {L}, {calls(L)} compression calls")
```

```
ends 00          (1 padding byte): L = 43, 5 compression calls
ends 01 01       (2 padding bytes): L = 42, 4 compression calls
ends 02 02 02    (3 padding bytes): L = 41, 4 compression calls
bad padding, MAC'd as if empty: L = 43, 5 compression calls
```

With a 64-byte record, the receiver runs **one fewer** SHA-1 compression when
the decrypted record ends in valid padding of two or more bytes. The most
likely such ending, by far, is `01 01`. One compression is a few hundred to a
thousand clock cycles, well under a microsecond, but a network attacker who
measures many attempts can see it. The attacker chooses the record length
to put this boundary (here 64 + 13 + 42 + 9 = 128 bytes, exactly two blocks)
where it wants.

### The attack

The rest is Vaudenay's method with a different question. The attacker takes a
target block $C_i$ and its predecessor, and sends four-block records whose
last block is $C_i$ and whose third block is $C_{i-1} \oplus \Delta$ for a
two-byte change $\Delta$ in the last two positions. The answer comes back fast
exactly when the decrypted block ends in `01 01`, which pins down the last
two bytes of the intermediate $D_K(C_i)$. With two bytes unknown there are
$2^{16}$ values of $\Delta$ to try, and the timing difference is small, so
each value must be tried several times to see it through network noise.

Each wrong guess makes the server drop the TLS session, so every question
needs a new session carrying the same secret, the multi-session setting of
2003 again. AlFardan and Paterson estimated about $2^{23}$ sessions to recover
a whole block, $2^{19}$ per byte for base64 plaintext, and $2^{13}$ per byte
when one byte of each block is already known. Against TLS this was a
demonstration on a quiet local network, not a threat over the open internet.
Against DTLS, which does not end a session on a bad record, it was much more
practical.

### The fix that is hard to write

What does it take for the receiver's time not to depend on the padding? The
MAC must be computed over a number of blocks that does not depend on the
secret padding length, and the code must find the received MAC inside the
record without a memory access pattern that depends on that length either.
The fix that went into OpenSSL 1.0.1d in February 2013, written by Adam
Langley and Emilia Käsper, does exactly that: it always runs the hash over the
maximum number of blocks the record could need, selects the real digest with
bit masks instead of branches, and copies the MAC out of the record with a
fixed sequence of reads. Langley described it at the time as some 500 lines of
subtle code for what had been a few lines.

The subtlety was real. In 2016 Juraj Somorovsky found that a faster version
of this code in OpenSSL's AES-NI path created a *new* padding oracle
(CVE-2016-2107). The same year Martin Albrecht and Kenneth Paterson showed
with "Lucky Microseconds" that Amazon's TLS library s2n, which added random
delays instead of writing constant-time code, still leaked. Random delays add
noise, and a bias survives any amount of independent noise if the attacker
can ask enough times.

!!! note "Life story: Lucky Thirteen"
    **Born:** February 2013, Nadhem AlFardan and Kenneth Paterson at Royal
    Holloway (IEEE Symposium on Security and Privacy 2013) · **Purpose:** to
    show that one SHA-1 compression of timing difference, left over from the
    2003 fix, is still a padding oracle in TLS and DTLS · **Helped:**
    constant-time CBC decryption in OpenSSL, NSS, GnuTLS and others; added
    weight to encrypt-then-MAC (RFC 7366, 2014) and to TLS 1.3's AEAD-only
    design · **Status:** fixed where the code is right; it returns whenever a
    new implementation gets it wrong (CVE-2016-2107, Lucky Microseconds)

## 10.5 BEAST: a predictable IV

*Level: intermediate.*

Padding oracles are chosen-ciphertext attacks: the attacker sends ciphertexts
and watches. BEAST is a chosen-*plaintext* attack: the attacker makes the
victim encrypt text of its choice and watches the ciphertext. CBC is meant to
be secure against that, provided each message starts from an IV the attacker
cannot predict. SSL 3.0 and TLS 1.0 broke the proviso.

### Chained IVs

In TLS 1.0 the IV of each record is the last ciphertext block of the record
before it. The
trouble is that the last ciphertext block was sent over the network a moment
ago, so the attacker knows the IV of the next record before it is
encrypted. Phillip Rogaway and others pointed out by 2002 that this lets a
chosen-plaintext attacker test guesses; Bodo Möller wrote it up for SSL and
TLS; and Gregory Bard showed in 2004 and 2006 that a **blockwise-adaptive**
attacker, one who chooses each block after seeing the previous ciphertext,
could use it. TLS 1.1 (April 2006) gave each record its own random IV, but in
2011 most browsers and servers still spoke TLS 1.0.

### One guess, checked

Suppose the attacker wants to know whether a past plaintext block $P_i$ equals
some guess $G$. It recorded $C_{i-1}$ and $C_i = E_K(C_{i-1} \oplus P_i)$. It
also sees $X$, the last ciphertext block on the wire, which will be the IV of
the next record. It now gets the victim to encrypt, as the first block of the
next record,

$$
P^* = X \oplus C_{i-1} \oplus G .
$$

The victim computes

$$
C^* = E_K(X \oplus P^*) = E_K(C_{i-1} \oplus G).
$$

Since $E_K$ is a permutation, $C^* = C_i$ exactly when $C_{i-1} \oplus G = C_{i-1} \oplus P_i$,
that is when $G = P_i$. The XOR with $X$ cancels the IV and the XOR with
$C_{i-1}$ recreates the conditions of the original encryption. Each guess
costs one chosen block and one look at the wire.

One check per guess is useless against a whole unknown 16-byte block, which
has $2^{128}$ possible values. The idea that made BEAST work is to make the
block mostly known.

### Moving the boundary

The attacker controls the length of the URL the browser requests. HTTP sends
the request line, then headers, then the cookie, in a predictable order. By
choosing the path length, the attacker can place the block boundary wherever
it wants. Pick it so that block $P_i$ ends with the first byte of the secret:

```
1\r\nCookie: sid=?
```

That is the last character of `HTTP/1.1`, a line break, the header name and
`sid=` (15 known bytes) followed by one unknown byte, the first character of
the session ID. Now there are only 256 possible values for the block, or 64 if
the ID is base64, and the attacker checks them one at a time with the trick
above. Say it learns `K`. It then shortens the path by one byte. Everything
after the path moves one place left, and the block becomes

```
\r\nCookie: sid=K?
```

with 15 known bytes again and the second character of the ID last. The secret
is read a byte at a time, each byte costing at most 256 guesses. This is the
same divide-and-conquer as the padding oracle, applied to chosen plaintext
instead of chosen ciphertext.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="BEAST: by shortening the URL one byte at a time, the attacker makes each block hold fifteen known bytes and one unknown cookie byte" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">path of length k</text>
<rect x="20" y="40" width="150" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95" y="62" text-anchor="middle" font-family="monospace">GET /aaaa...</text>
<rect x="180" y="40" width="300" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="318" y="62" text-anchor="middle" font-family="monospace">1 \r \n C o o k i e :   s i d =</text>
<rect x="450" y="42" width="28" height="30" fill="currentColor" opacity="0.15"/>
<text x="464" y="62" text-anchor="middle" font-family="monospace">?</text>
<rect x="490" y="40" width="130" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="62" text-anchor="middle" font-family="monospace">rest ...</text>
<text x="330" y="94" text-anchor="middle" font-size="13">block i: 15 known bytes, 1 unknown: 256 guesses</text>
<text x="20" y="138" font-weight="bold">path of length k - 1</text>
<rect x="20" y="150" width="150" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95" y="172" text-anchor="middle" font-family="monospace">GET /aaa...</text>
<rect x="180" y="150" width="300" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="318" y="172" text-anchor="middle" font-family="monospace">\r \n C o o k i e :   s i d = K</text>
<rect x="450" y="152" width="28" height="30" fill="currentColor" opacity="0.15"/>
<text x="464" y="172" text-anchor="middle" font-family="monospace">?</text>
<rect x="490" y="150" width="130" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="172" text-anchor="middle" font-family="monospace">rest ...</text>
<text x="330" y="204" text-anchor="middle" font-size="13">the known K moves in; the next unknown byte is last</text>
<text x="20" y="238" font-size="13">test a guess G: make the victim encrypt X XOR C(i-1) XOR G as the next first block; a match with C(i) means G is right</text>
</svg>
<figcaption>Figure 10.4. BEAST's moving boundary. Each byte of the cookie is pulled into a block whose other fifteen bytes the attacker already knows, so each byte is a search over 256 values, not the block over 2¹²⁸.</figcaption>
</figure>

### From idea to exploit

The attack needs a lot from the attacker. It must see the traffic, make the
browser send requests with chosen paths, and, hardest, inject a chosen block
at the start of a new record right after seeing the previous record's last
block. Ordinary JavaScript in 2011 could not do the last part with the needed
precision. Thai Duong and Juliano Rizzo presented **BEAST** (Browser Exploit
Against SSL/TLS) at Ekoparty in Buenos Aires in September 2011, and their
demonstration, which decrypted a PayPal session cookie, relied on a Java
applet and a same-origin weakness in Java to get that control. The cost in
requests matches the count in §10.2: up to 256 guesses per byte, about 128 on
average, fewer if the cookie's alphabet is known.

Fixes came from three directions. Browsers adopted **1/n-1 record
splitting**: send the first byte of each message in a record of its own and
the rest in a second record. The first record ends with a MAC the attacker
cannot predict, so the IV of the second record is no longer known in advance.
(An earlier countermeasure, sending an empty record first, broke some servers
and was often turned off.) Browsers and servers moved to TLS 1.1 and 1.2, with
their per-record IVs. And many server operators, told that CBC was the
problem, switched their preferred cipher to RC4, which has no IV at all. That
traded a fixed attack for a growing one: in 2013 AlFardan, Bernstein,
Paterson, Poettering and Schuldt showed that RC4's keystream biases also
reveal repeated plaintext such as cookies ([Chapter 8](08-Attacks-on-Stream-Ciphers.md)),
and RFC 7465 (2015) prohibited RC4 in TLS.

!!! note "Life story: BEAST"
    **Born:** September 2011, Thai Duong and Juliano Rizzo at Ekoparty, after
    warnings by Rogaway, Möller and Bard from 2002 to 2006 · **Purpose:** to
    show that TLS 1.0's chained IVs, plus a blockwise-adaptive attacker in the
    browser, read cookies one byte at a time · **Helped:** 1/n-1 record
    splitting in browsers, the move to TLS 1.1 and 1.2; also, by accident, a
    brief return of RC4 · **Status:** fixed by per-record random IVs; the idea
    of moving a boundary to isolate one secret byte is used in almost every
    later attack in this chapter

The general lesson is about what an IV promises. CBC's security proof
assumes an IV that is **unpredictable** to the attacker at the moment it
chooses the plaintext. A counter, a timestamp, or the last ciphertext block are
all unique, but none is unpredictable. CTR and GCM need the opposite promise,
a nonce that is merely **unique**, and break in a different way when that one
fails, as the next two sections show.

## 10.6 The two-time pad: nonce reuse in CTR

*Level: beginner.*

CTR mode turns a block cipher into a stream cipher. For a nonce $N$ it
encrypts the counter blocks $N \Vert 1, N \Vert 2, \ldots$ to make a
keystream $S$, and XORs it into the message:

$$
C = P \oplus S, \qquad S = E_K(N \Vert 1) \,\Vert\, E_K(N \Vert 2) \,\Vert \cdots
$$

The nonce does not need to be secret or unpredictable. It needs to be
**unique** under each key, and that is all. If it repeats, the keystream
repeats, and two messages are encrypted with the same pad:

$$
C_1 \oplus C_2 = (P_1 \oplus S) \oplus (P_2 \oplus S) = P_1 \oplus P_2 .
$$

The key has dropped out. What remains is the XOR of two plaintexts, which
is not encryption at all, because plaintexts are not random. Where the two messages agree, the XOR is zero. Where one is known, the
other can be read. Where neither is known, guessing a likely word in one
reveals a stretch of the other, a method called **crib dragging** that is as
old as the one-time pad: it is how the American Venona project read Soviet
messages whose pads had been used twice
([Chapter 3](03-Machines-and-the-War.md)).

### A message from Mars

Picture a habitat on Mars reporting to Earth over a radio link with a delay
of about 3 to 22 minutes each way. A handshake for fresh keys costs a round
trip of up to three quarters of an hour, so the link keeps one key for a long
time and uses a message counter as the CTR nonce. One night the radio's computer reboots, and its counter,
held only in memory, starts again at zero. The next message goes out under a
nonce that was used before.

```python
import hashlib

def keystream(key, nonce, n):            # a stand-in for AES-CTR: hash of key, nonce, counter
    out = b""
    ctr = 0
    while len(out) < n:
        out += hashlib.sha256(key + nonce + ctr.to_bytes(4, "big")).digest()
        ctr += 1
    return out[:n]

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

key, nonce = b"habitat radio key", b"\x00" * 12     # the counter restarted at zero
p1 = b"HAB-3 STATUS: O2 RESERVE 61 PERCENT, SCRUBBER B OFFLINE"
p2 = b"HAB-3 STATUS: CREW WELL, NEXT EVA ON SOL 214 AT 0900 LMST"
c1 = xor(p1, keystream(key, nonce, len(p1)))
c2 = xor(p2, keystream(key, nonce, len(p2)))

d = xor(c1, c2)                          # all an eavesdropper can compute
print(d == xor(p1, p2))                  # True: the keystream has cancelled
print(d[:16].hex())                      # zeros where the two messages agree
crib = b"OFFLINE"                        # a guess at one word of message 1
for pos in (40, 48):
    print(pos, xor(d[pos:pos + len(crib)], crib))
```

```
True
00000000000000000000000000000c60
40 b':65=;/S'
48 b'0900 LM'
```

The XOR of the ciphertexts starts with fourteen zero bytes: the two messages
begin the same way. A
guess that message 1 contains the word `OFFLINE` gives nonsense at position
40 and the readable `0900 LM` at position 48, which confirms the guess and
reveals part of message 2 at once. Each confirmed word extends both messages,
and a few rounds of guessing read them both.

Secrecy is not the only loss. If an attacker knows one plaintext, it knows the
keystream for that nonce, and it can encrypt any message of the same length
under it. CTR without a MAC is fully malleable anyway: flip a ciphertext bit
and the same plaintext bit flips. The fix for the habitat is simple to state:
keep the counter in storage that survives a reboot and write it *before* each
use, or use random nonces long enough never to collide (XChaCha20-Poly1305
takes 192 bits), or use a mode that survives a repeat (§10.11).

### It keeps happening

Reused keystreams are among the most repeated mistakes in cryptography. In
2005 Hongjun Wu showed that Microsoft Word and Excel encrypted every revision
of a protected document with the same RC4 keystream. WEP's 24-bit IV repeated
within hours on a busy network ([Chapter 8](08-Attacks-on-Stream-Ciphers.md)).
In 2017 Mathy Vanhoef's KRACK made WPA2 devices reset their nonce counters by
replaying a handshake message ([Chapter 19](19-Protocol-Breaks.md)). The mode
was never at fault; the promise it asks for was broken.

!!! note "Life story: the two-time pad"
    **Born:** as old as the one-time pad; exploited at scale by the US Army's
    Venona project from 1943 against reused Soviet pads · **Purpose (for the
    attacker):** turn two encryptions under one keystream into the XOR of two
    plaintexts, then read both by guessing · **Helped:** Venona; attacks on
    Office's RC4 (2005), WEP, and nonce resets in WPA2 (KRACK, 2017) ·
    **Status:** applies to every stream cipher and every counter-based mode,
    including CTR, GCM and ChaCha20-Poly1305, whenever a nonce repeats

## 10.7 The forbidden attack: GCM's key as a root

*Level: expert.*

GCM is CTR mode plus a MAC, and book 1 ([§10.9](../../book/10-Message-Authentication.md))
showed that a repeated nonce breaks the MAC too, for two one-block messages,
with a square root. Antoine Joux sent this observation to NIST in 2006 as a
public comment on the draft standard, under the title "Authentication Failures
in NIST version of GCM"; the name **forbidden attack** comes from the fact
that it uses something the standard forbids. Here is the general case, which
is a problem about roots of polynomials over $\mathrm{GF}(2^{128})$.

### The tag as a polynomial

GCM's tag for associated data $A$ and ciphertext $C$, under nonce $N$, is

$$
T = \mathrm{GHASH}_H(A, C) \oplus E_K(J_0), \qquad
\mathrm{GHASH}_H(X_1, \ldots, X_m) = X_1 H^m \oplus X_2 H^{m-1} \oplus \cdots \oplus X_m H .
$$

Here $H = E_K(0^{128})$ is the hash key, $J_0$ is the first counter block made
from $N$, and $X_1, \ldots, X_m$ are the 128-bit blocks of $A$, then of $C$
(each padded with zeros to a whole block), then one block holding the two
lengths. Addition is XOR and multiplication is in the field
$\mathrm{GF}(2^{128})$ defined by $x^{128} + x^7 + x^2 + x + 1$. Read with $H$
as a variable, GHASH is a polynomial with no constant term whose coefficients
are the message blocks.

Now suppose two messages, $(A, C)$ with blocks $X_j$ and tag $T$, and
$(A', C')$ with blocks $X'_j$ and tag $T'$, used the same nonce. They share
$J_0$, so they share the mask $E_K(J_0)$, and it cancels:

$$
T \oplus T' = \sum_j (X_j \oplus X'_j)\, H^{m-j+1}.
$$

(A shorter message is padded at the front with zero blocks.) Everything
except $H$ is known, so $H$ is a root of

$$
f(Y) = \sum_{j=1}^{m} (X_j \oplus X'_j)\, Y^{m-j+1} \;\oplus\; (T \oplus T').
$$

$f$ is not the zero polynomial when the two messages differ. A nonzero
polynomial of degree $d$ over a field has at most $d$ roots, so $H$ is one of
at most $m$ candidates, and finding the roots of a polynomial over a finite
field is easy, as we will see. For one-block messages with no associated data,
$f(Y) = (C \oplus C')\,Y^2 \oplus (T \oplus T')$, the length blocks being
equal, and the root is the square root from book 1.

### By hand in a small field

The field with 128-bit elements is too big for pencil, but the algebra is the
same in any field of characteristic 2. Take $\mathrm{GF}(2^4)$, 4-bit
elements, defined by $x^4 + x + 1$, so $x^4 = x + 1$. Write elements as bit
strings with the highest power on the left: `0110` is $x^2 + x$. Let a toy
GHASH use the secret $H = \mathtt{0110}$ and mask $M = \mathtt{1011}$, and let
a one-block message's tag be $T = C \cdot H^2 \oplus L \cdot H \oplus M$ with
the toy length block $L = \mathtt{0001}$. Then $H^2 = \mathtt{0111}$ and two
messages under one nonce give:

| | $C$ | $C \cdot H^2$ | $L \cdot H$ | $M$ | $T$ |
|---|---|---|---|---|---|
| message 1 | `0101` | `1000` | `0110` | `1011` | `0101` |
| message 2 | `1100` | `0010` | `0110` | `1011` | `1111` |

The attacker sees the two $C$ and the two $T$.

<div class="mars-steps" markdown>

1. XOR the tags: $T_1 \oplus T_2 = \mathtt{0101} \oplus \mathtt{1111} = \mathtt{1010}$. XOR the ciphertexts: $C_1 \oplus C_2 = \mathtt{1001}$. So $\mathtt{1001} \cdot H^2 = \mathtt{1010}$.
2. Invert $\mathtt{1001} = x^3 + 1$. Its inverse is $x$, `0010`, because $(x^3 + 1)\,x = x^4 + x = (x + 1) + x = 1$.
3. Multiply: $H^2 = \mathtt{1010} \cdot \mathtt{0010} = (x^3 + x)\,x = x^4 + x^2 = x^2 + x + 1 = \mathtt{0111}$.
4. Take the square root. Squaring is a bijection in characteristic 2, so there is exactly one; checking the squares shows $\mathtt{0110}^2 = (x^2 + x)^2 = x^4 + x^2 = x^2 + x + 1 = \mathtt{0111}$. So $H = \mathtt{0110}$.
5. Recover the mask: $M = T_1 \oplus C_1 H^2 \oplus L H = \mathtt{0101} \oplus \mathtt{1000} \oplus \mathtt{0110} = \mathtt{1011}$. With $H$ and $M$ the attacker can tag any ciphertext under this nonce.

</div>

Longer messages make longer polynomials, and then there can be more than one
candidate. Take two-block messages in the same toy field, with
$T = C_1 H^3 \oplus C_2 H^2 \oplus L H \oplus M$ and length block `0010`:
message 1 is $(\mathtt{0011}, \mathtt{1001})$ with tag `1110`, and message 2 is
$(\mathtt{1110}, \mathtt{0100})$ with tag `0110`. The difference polynomial is

$$
\mathtt{1101}\, Y^3 \oplus \mathtt{1101}\, Y^2 \oplus \mathtt{1000} = 0,
$$

and dividing by `1101` (whose inverse is `0100`) gives
$Y^3 + Y^2 + \mathtt{0110} = 0$. Trying all sixteen elements finds three roots:
`0110`, `1000` and `1111`. For `0110` we have $Y^3 = \mathtt{0001}$ and
$Y^2 = \mathtt{0111}$, and $\mathtt{0001} \oplus \mathtt{0111} \oplus \mathtt{0110} = 0$;
the other two check the same way. The attacker has three candidates for $H$
and cannot yet tell which is real. A third message under the same nonce,
$(\mathtt{0111}, \mathtt{0001})$ with tag `0111`, gives a second cubic, and
the only root the two cubics share is `0110`. In practice the attacker can
also simply try a forgery with each candidate: the receiver accepts only the
one made with the real $H$.

### Root finding over a finite field

In $\mathrm{GF}(2^{128})$ trying every element is out of the question, but
root finding is still cheap. First, every element $a$ of a field with
$q$ elements satisfies $a^q = a$, so

$$
Y^{q} - Y = \prod_{a \in \mathrm{GF}(q)} (Y - a).
$$

Hence $\gcd\big(f(Y),\, Y^{2^{128}} - Y\big)$ is the product of $(Y - r)$ over
the distinct roots $r$ of $f$ in the field: it throws away every factor of
$f$ that has no root. Computing it needs $Y^{2^{128}} \bmod f$, which is 128
squarings of a polynomial of degree less than $d$, each reduced modulo $f$:
about $128 d^2$ field multiplications, nothing for $d$ in the thousands.

Second, to split that product into its linear factors, the
**Cantor-Zassenhaus** method in characteristic 2 uses the trace map
$\mathrm{Tr}(y) = y + y^2 + y^4 + \cdots + y^{2^{127}}$, which sends every field
element to 0 or 1, each for exactly half the field. For a random $\delta$, the
polynomial $\gcd\big(g(Y), \mathrm{Tr}(\delta Y) \bmod g\big)$ collects the roots
$r$ with $\mathrm{Tr}(\delta r) = 0$, about half of them, and recursion splits
the rest. The expected cost is polynomial in $d$ and in 128.

With three messages under one nonce there is a shortcut. Each pair gives a
polynomial with root $H$, their other roots are unrelated, so their gcd is
almost always $Y - H$, and $H$ is its constant term.

First the field arithmetic. Book 1 multiplies in GCM's reflected bit order;
the block below uses the plain one, bit $i$ of an integer being the
coefficient of $x^i$, so the code is "multiply without carries, then reduce",
and reverses bits to convert. It checks itself against test case 2 of the
GCM specification (key and IV zero, one zero block), then checks the facts the
attack uses: squaring is linear, $a^{2^{127}}$ is the square root, and every
element is a root of $Y^{2^{128}} - Y$.

```python
import random

def mul(a, b):                           # GF(2^128): bit i holds the coefficient of x^i
    p = 0
    while b:
        if b & 1:
            p ^= a                       # adding is XOR: no carries
        a, b = a << 1, b >> 1
        if a >> 128:
            a ^= (1 << 128) | 0x87       # x^128 = x^7 + x^2 + x + 1
    return p

def power(a, e):
    r = 1
    while e:
        if e & 1:
            r = mul(r, a)
        a, e = mul(a, a), e >> 1
    return r

def rev(n):                              # GCM writes x^0 as the leftmost bit of a block
    return int(format(n, "0128b")[::-1], 2)

def block(h):
    return rev(int(h, 16))

# Test case 2 of the GCM specification: key 0, IV 0, one zero block of plaintext.
H = block("66e94bd4ef8a2c3b884cfa59ca342b2e")       # AES_K(0)
C = block("0388dace60b6a392f328c2b971b2fe78")       # the ciphertext block
L = block("00000000000000000000000000000080")       # lengths: no AD, 128 bits of text
S = mul(C, mul(H, H)) ^ mul(L, H)                   # GHASH = C*H^2 + L*H
tag, pad = block("ab6e47d42cec13bdf53a67b21257bddf"), block("58e2fccefa7e3061367f1d57a4e7455a")
print(S == tag ^ pad)                    # True: tag = GHASH + AES_K(J0)

a, b = random.getrandbits(128), random.getrandbits(128)
print(mul(a ^ b, a ^ b) == mul(a, a) ^ mul(b, b))  # squaring is linear
print(power(mul(a, a), 1 << 127) == a)              # and a^(2^127) undoes it
print(power(a, 1 << 128) == a)                      # every element is a root of X^(2^128) - X
```

```
True
True
True
True
```

Then the root finding. Two polynomials that share the root $H$ are planted,
each the product of $(Y + H)$ and a random quadratic (in characteristic 2,
$Y - H = Y + H$). The block counts the roots of the first in the field, by
the gcd with $Y^{2^{128}} + Y$, and then recovers $H$ from the gcd of the two:

```python
import random

def mul(a, b):                           # GF(2^128), as in the previous block
    p = 0
    while b:
        if b & 1:
            p ^= a
        a, b = a << 1, b >> 1
        if a >> 128:
            a ^= (1 << 128) | 0x87
    return p

def inv(a):                              # a^(2^128 - 2) = 1/a
    r, e = 1, (1 << 128) - 2
    while e:
        if e & 1:
            r = mul(r, a)
        a, e = mul(a, a), e >> 1
    return r

# Polynomials in Y over the field: lists of coefficients, constant term first.
def pmul(f, g):
    out = [0] * (len(f) + len(g) - 1)
    for i, a in enumerate(f):
        for j, b in enumerate(g):
            out[i + j] ^= mul(a, b)
    return out

def pmod(f, g):                          # remainder of f divided by g
    f = f[:]
    lead = inv(g[-1])
    while len(f) >= len(g):
        q = mul(f[-1], lead)
        for i in range(len(g)):
            f[len(f) - len(g) + i] ^= mul(q, g[i])
        while f and f[-1] == 0:
            f.pop()
    return f

def pgcd(f, g):
    while g:
        f, g = g, pmod(f, g)
    lead = inv(f[-1])
    return [mul(c, lead) for c in f]     # monic

rng = random.Random(2016)
H = rng.getrandbits(128)                 # the hash key the attacker wants
f1 = pmul([H, 1], [rng.getrandbits(128) for _ in range(3)])   # (Y + H) * random quadratic
f2 = pmul([H, 1], [rng.getrandbits(128) for _ in range(3)])   # another pair, same nonce

# How many roots does f1 have in the field? gcd(f1, Y^(2^128) + Y) has one factor per root.
y = [0, 1]
for _ in range(128):                     # square 128 times, reducing mod f1
    y = pmod(pmul(y, y), f1)
y += [0] * (2 - len(y))
y[1] ^= 1                                # Y^(2^128) + Y  (mod f1)
while y and y[-1] == 0:                  # it can even be 0: then every root of f1 is in the field
    y.pop()
print("roots of f1 in the field:", len(pgcd(f1, y)) - 1)

g = pgcd(f1, f2)                         # two equations that share the root H
print("degree of gcd(f1, f2):", len(g) - 1, " root is H:", g[0] == H)
```

```
roots of f1 in the field: 3
degree of gcd(f1, f2): 1  root is H: True
```

Here the random quadratic happened to split (about half do), so $f_1$ alone
leaves three candidates, as in the toy field; the second equation removes the
doubt.

### What the attacker gets

With $H$ in hand the attacker computes the mask for the repeated nonce,
$E_K(J_0) = T \oplus \mathrm{GHASH}_H(A, C)$, and can then produce a valid tag
for any $(A'', C'')$ under that nonce. Because CTR mode is malleable, it can
choose $C''$ to decrypt to anything it likes wherever it knows the plaintext.
Worse, $H$ depends only on the key, not the nonce. For **any** message it sees
under any other nonce, $T \oplus \mathrm{GHASH}_H(A, C)$ is that nonce's mask,
so it can forge messages under that nonce too. One repeat costs integrity for
the life of the key. What the attacker does not get is $K$ itself: fresh
nonces still encrypt securely, which is cold comfort.

In 2016 Hanno Böck, Aaron Zauner, Sean Devlin, Juraj Somorovsky and Philipp
Jovanovic scanned the internet for TLS servers using AES-GCM and looked at the
8-byte explicit nonce TLS 1.2 sends with each record. They found 184 servers
that repeated nonces, among them sites belonging to Visa, and about 70,000
that chose them at random, safe only for a limited number of records. Against
the repeaters they injected content of their choice into HTTPS pages with
valid tags. TLS 1.3 derives each record's nonce from the record number.

!!! note "Life story: the forbidden attack"
    **Born:** 2006, Antoine Joux's public comment to NIST on the draft GCM
    standard · **Purpose:** to show that one repeated nonce in GCM reveals the
    hash key $H$ as a root of a polynomial over $\mathrm{GF}(2^{128})$, and
    with it the power to forge · **Helped:** NIST's strict nonce rules in
    SP 800-38D; record-number nonces in TLS 1.3; the case for misuse-resistant
    modes (AES-GCM-SIV) · **Status:** demonstrated on live HTTPS servers by
    Böck and colleagues in 2016; works against every GCM deployment that
    repeats a nonce

## 10.8 Sweet32 and the birthday bound in modes

*Level: intermediate.*

The attacks so far needed a mistake: an oracle, a predictable IV, a repeated
nonce. Sweet32 needs none. It uses the mode exactly as specified and simply
waits.

[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md) derived the argument.
In CBC, each ciphertext block is a block cipher output on an input that looks
random. A block cipher is a permutation, so two outputs are equal only if the
inputs were: $C_i = C_j$ implies $P_i \oplus C_{i-1} = P_j \oplus C_{j-1}$, so

$$
P_i \oplus P_j = C_{i-1} \oplus C_{j-1},
$$

which anyone on the wire can compute. By the birthday bound, $D$ random
$b$-bit blocks contain about $D^2 / 2^{b+1}$ colliding pairs. For $b = 64$
that is one pair expected at $D = 2^{32}$ blocks, 32 GiB.

### Counting what the attacker gets

Not every collision is useful: the attacker needs one between a secret block
and a known block. If a fraction $s$ of blocks hold the secret (the cookie,
in every request) and a fraction $k$ are known, the expected number of useful
pairs is about

$$
(sD)(kD) \cdot 2^{-b} = s k \, \frac{D^2}{2^b}.
$$

With requests of 64 blocks of which two hold the cookie, $s = 1/32$ and
$k \approx 31/32$, so the useful collisions are about 6% of all collisions,
counting both orders. That is why the real attack needed far more than 32 GiB.
The code counts collisions in a toy run with 24-bit blocks, where the formula
can be checked directly, and then evaluates it for the amounts that matter:

```python
import math, random

# A toy cipher with 24-bit blocks: CBC outputs behave like random 24-bit values.
rng = random.Random(5)
b, D = 24, 2 ** 14
count, pairs = {}, 0
for _ in range(D):
    x = rng.getrandbits(b)
    pairs += count.get(x, 0)             # each earlier equal block makes one more pair
    count[x] = count.get(x, 0) + 1
print("toy, 2^14 blocks of 24 bits: pairs", pairs, "expected", round(D * (D - 1) / 2 ** (b + 1), 2))

def collisions(nbytes, block_bits):      # expected colliding pairs, D^2 / 2^(b+1)
    D = nbytes / (block_bits // 8)
    return D * D / 2 ** (block_bits + 1)

for label, nbytes in [("2^20 blocks (SP 800-67 limit)", 2 ** 23),
                      ("32 GiB", 32 * 2 ** 30),
                      ("785 GB (Sweet32)", 785e9)]:
    e = collisions(nbytes, 64)
    print(f"{label:30} 64-bit: {e:10.3g} pairs, P(any) = {1 - math.exp(-e):.3g}")
print(f"{'785 GB with a 128-bit block':30} {collisions(785e9, 128):.3g} pairs")
```

```
toy, 2^14 blocks of 24 bits: pairs 8 expected 8.0
2^20 blocks (SP 800-67 limit)  64-bit:   2.98e-08 pairs, P(any) = 2.98e-08
32 GiB                         64-bit:        0.5 pairs, P(any) = 0.393
785 GB (Sweet32)               64-bit:        261 pairs, P(any) = 1
785 GB with a 128-bit block    3.54e-18 pairs
```

At 785 GB a 64-bit block gives about 261 colliding pairs, enough for a
handful of useful ones; the same traffic with a 128-bit block gives a
collision with probability about $3.5 \times 10^{-18}$.

Karthikeyan Bhargavan and Gaëtan Leurent of Inria made this real in August
2016 and presented it at ACM CCS that October. JavaScript on a page the
attacker controls made the victim's browser send requests to a site over one
long HTTPS connection that used triple DES, each request carrying the same
secret cookie. After about 785 GB, gathered in under two days, they recovered
the cookie. They did the same against Blowfish, another 64-bit cipher, in
OpenVPN, where it was the default. Neither cipher had any weakness; an ideal
64-bit block cipher would have failed the same way.

In 2016 triple DES was still offered by most HTTPS servers and used on
roughly one connection in a hundred. Afterwards OpenSSL and the browsers
dropped it, and SP 800-67 (revision 2, 2017) limited a key to $2^{20}$ blocks,
a collision chance of about $3 \times 10^{-8}$. Triple DES was disallowed for
encryption after 2023.

!!! note "Life story: Sweet32"
    **Born:** August 2016, Karthikeyan Bhargavan and Gaëtan Leurent at Inria;
    ACM CCS 2016 · **Purpose:** to show that the birthday bound of 64-bit
    blocks, long dismissed as theoretical, is reached by one browser session in
    two days · **Helped:** the removal of triple DES and Blowfish from TLS and
    OpenVPN defaults; the $2^{20}$-block limit in SP 800-67 · **Status:** the
    cure is a 128-bit block; the same arithmetic sets the data limits of every
    mode, including AES-GCM's

### The same bound in MACs

The bound limits block-cipher MACs too. If two messages reach the same
$b$-bit internal state of CBC-MAC or CMAC, they keep equal tags under any
common suffix; Bart Preneel and Paul van Oorschot showed in 1995 that this
forges any iterated MAC after about $2^{b/2}$ messages, which is why
SP 800-38B allows at most $2^{48}$ messages per AES-CMAC key. Plain CBC-MAC on
messages of varying length is far cheaper to break: book 1's splice
([§10.4](../../book/10-Message-Authentication.md)), where the tag $t$ of $M$
is also the tag of $M \Vert (M \oplus t)$, costs one query. CMAC fixes it by
XORing a secret subkey into the last block, so no one can continue a chain
from a tag. A MAC's proof covers a stated set of messages and a stated number
of queries; the attacker looks first for where a system steps outside them.

## 10.9 Compression oracles: CRIME and BREACH

*Level: expert.*

Encryption hides content, not length: a GCM ciphertext is as long as its
plaintext plus a tag, and CBC only rounds up to a block. That stops being
harmless when data are **compressed before they are encrypted** and the
attacker can put its own text next to a secret, because then the length says
how much the two have in common. John Kelsey described the idea in 2002 in
"Compression and Information Leakage of Plaintext"; ten years later Juliano
Rizzo and Thai Duong turned it against the web.

### How compression leaks

DEFLATE, the algorithm inside zlib and gzip, first replaces every repeated
string with a short back-reference, "copy $\ell$ bytes from $d$ bytes back"
(the LZ77 step), and then Huffman-codes the result. If a request contains the
cookie `sessionid=7f3a9c` and the attacker can also put `sessionid=7` into the
URL, then the cookie's first eleven characters are a repeat of the URL text
and cost one back-reference. If the attacker puts `sessionid=4` instead, the
back-reference covers only `sessionid=` and the `7` in the cookie must be sent
as a literal. One literal more is usually about a byte more.

```python
import zlib

secret = "sessionid=7f3a9c"              # sent in every request; the attacker cannot see it

def request_length(guess):               # what the attacker sees: the encrypted length
    req = ("GET /search?q=" + guess + " HTTP/1.1\r\nHost: shop.example\r\n"
           "Cookie: " + secret + "\r\nAccept: text/html\r\n\r\n")
    return len(zlib.compress(req.encode(), 9))

hexdigits = "0123456789abcdef"
print([request_length("sessionid=" + g) for g in hexdigits])
print([request_length("sessionid=7" + g) for g in hexdigits])
```

```
[102, 102, 102, 102, 102, 102, 102, 101, 102, 102, 102, 102, 102, 102, 102, 102]
[102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 101]
```

The first line tries the sixteen hex digits after `sessionid=`: only `7`
gives 101 bytes. The second, with `7` known, tries the next digit: only `f`
is shorter. Figure 10.5 draws the first line.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Bar chart of compressed request length for sixteen guesses of the first secret character: fifteen guesses give 102 bytes and the right guess, 7, gives 101" fill="currentColor" font-size="14">
<line x1="60" y1="230" x2="620" y2="230" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="230" x2="60" y2="30" stroke="currentColor" stroke-width="1.4"/>
<line x1="55" y1="230" x2="60" y2="230" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="235" text-anchor="end" font-size="13">96</text>
<line x1="55" y1="170" x2="60" y2="170" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="175" text-anchor="end" font-size="13">98</text>
<line x1="55" y1="110" x2="60" y2="110" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="115" text-anchor="end" font-size="13">100</text>
<line x1="55" y1="50" x2="60" y2="50" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="55" text-anchor="end" font-size="13">102</text>
<rect x="72" y="50" width="24" height="180" opacity="0.3"/>
<text x="84" y="250" text-anchor="middle" font-family="monospace">0</text>
<rect x="106" y="50" width="24" height="180" opacity="0.3"/>
<text x="118" y="250" text-anchor="middle" font-family="monospace">1</text>
<rect x="140" y="50" width="24" height="180" opacity="0.3"/>
<text x="152" y="250" text-anchor="middle" font-family="monospace">2</text>
<rect x="174" y="50" width="24" height="180" opacity="0.3"/>
<text x="186" y="250" text-anchor="middle" font-family="monospace">3</text>
<rect x="208" y="50" width="24" height="180" opacity="0.3"/>
<text x="220" y="250" text-anchor="middle" font-family="monospace">4</text>
<rect x="242" y="50" width="24" height="180" opacity="0.3"/>
<text x="254" y="250" text-anchor="middle" font-family="monospace">5</text>
<rect x="276" y="50" width="24" height="180" opacity="0.3"/>
<text x="288" y="250" text-anchor="middle" font-family="monospace">6</text>
<rect x="310" y="80" width="24" height="150" opacity="0.85"/>
<text x="322" y="250" text-anchor="middle" font-family="monospace">7</text>
<rect x="344" y="50" width="24" height="180" opacity="0.3"/>
<text x="356" y="250" text-anchor="middle" font-family="monospace">8</text>
<rect x="378" y="50" width="24" height="180" opacity="0.3"/>
<text x="390" y="250" text-anchor="middle" font-family="monospace">9</text>
<rect x="412" y="50" width="24" height="180" opacity="0.3"/>
<text x="424" y="250" text-anchor="middle" font-family="monospace">a</text>
<rect x="446" y="50" width="24" height="180" opacity="0.3"/>
<text x="458" y="250" text-anchor="middle" font-family="monospace">b</text>
<rect x="480" y="50" width="24" height="180" opacity="0.3"/>
<text x="492" y="250" text-anchor="middle" font-family="monospace">c</text>
<rect x="514" y="50" width="24" height="180" opacity="0.3"/>
<text x="526" y="250" text-anchor="middle" font-family="monospace">d</text>
<rect x="548" y="50" width="24" height="180" opacity="0.3"/>
<text x="560" y="250" text-anchor="middle" font-family="monospace">e</text>
<rect x="582" y="50" width="24" height="180" opacity="0.3"/>
<text x="594" y="250" text-anchor="middle" font-family="monospace">f</text>
<text x="322" y="70" text-anchor="middle" font-size="13">101</text>
<text x="340" y="276" text-anchor="middle" font-size="13">guess for the first character after sessionid=</text>
<text x="70" y="22" font-size="13">compressed length in bytes (axis starts at 96)</text>
</svg>
<figcaption>Figure 10.5. The first line of the code's output. The guess that extends the repeat of the secret saves a literal, and the encrypted request is one byte shorter.</figcaption>
</figure>

The attacker never decrypts anything; it reads lengths off the wire, one
character at a time, the divide-and-conquer of BEAST and the padding oracle.
Real compressors are noisier than this example. A Huffman code can absorb a one-literal difference, or
make a wrong guess shorter by luck. The usual remedy, which the BREACH
authors called the **two-tries** method, is to send each guess twice, once as `sessionid=7{~` and once
as `sessionid={~7`, so that both requests contain the same characters and
differ only in whether the guess is in a position to match. Only a real match
makes the first shorter than the second.

### CRIME and BREACH

Rizzo and Duong presented **CRIME** (Compression Ratio Info-leak Made Easy) at
Ekoparty in September 2012. It targeted compression applied to whole requests
at the TLS layer, which some browsers and servers negotiated, and the header
compression of SPDY, Google's forerunner of HTTP/2. Both compressed the
cookie together with the URL the attacker's script chose. The fix was quick:
browsers turned off TLS compression and SPDY's header compression, and TLS 1.3
later removed compression from the protocol. HTTP/2's header compression,
HPACK, was designed with CRIME in mind: it only reuses whole header fields
that match exactly, so a partial guess earns nothing.

At Black Hat USA in August 2013 Angelo Prado, Neal Harris and Yoel Gluck showed
that the same leak lived one layer up, in **HTTP response compression**, which
almost every web server applies to HTML with gzip and which nobody could turn
off without making the web slower. They called it **BREACH**. The secret is
now in the response body, typically an anti-forgery (CSRF) token embedded in a
page, and the attacker's text is any part of the request that the page echoes
back, such as a search term. Their demonstration extracted tokens from
Outlook Web Access in well under a minute.

BREACH has no protocol-level fix, because it attacks the application's choice
to compress secrets alongside attacker-controlled text. The defenses are all
at the application level:

- **Do not compress responses that contain secrets and reflected input**, or
  separate the two into different responses.
- **Mask the secret per response.** Send $r \Vert (t \oplus r)$ with a fresh
  random $r$ instead of the token $t$. The token is recovered by XOR, but its
  bytes differ in every response, so nothing repeats for the compressor to find.
  Django and Ruby on Rails do this for their CSRF tokens.
- **Rate-limit and detect** the thousands of near-identical requests the attack
  needs. Random padding of the length only adds noise, and noise, as §10.4
  showed, is averaged away by more requests.

Later variants measured the length without sniffing the network: TIME (Tal
Be'ery and Amichai Shulman, 2013) through timing, HEIST (Mathy Vanhoef and Tom
Van Goethem, 2016) through browser APIs.

!!! note "Life story: CRIME"
    **Born:** September 2012, Juliano Rizzo and Thai Duong at Ekoparty,
    building on John Kelsey's 2002 paper · **Purpose:** to read cookies from
    the length of compressed, encrypted requests in TLS and SPDY ·
    **Helped:** to end TLS-level compression (gone from TLS 1.3) and to shape
    HTTP/2's HPACK · **Status:** fixed for headers; the idea lives on in BREACH
    and its successors

!!! note "Life story: BREACH"
    **Born:** August 2013, Angelo Prado, Neal Harris and Yoel Gluck at Black
    Hat USA · **Purpose:** to show that HTTP's gzip compression of response
    bodies leaks secrets such as CSRF tokens that sit next to reflected input
    · **Helped:** per-response masking of tokens in web frameworks; caution
    about compressing secrets · **Status:** not fixed in TLS or HTTP and cannot
    be; defended application by application

The point for this chapter is that **AEAD does not help**. It protects the
plaintext but not its length, and compression makes length a function of content. Every attack in §10.2 to
§10.8 was stopped by a better mode or a better use of one; compression oracles
only by not mixing secrets and attacker text before a length-revealing step.

## 10.10 The doom principle and encrypt-then-MAC

*Level: intermediate.*

Look back at §10.2 to §10.4. In each case the receiver decrypted a message,
did something with the result (checked padding, stripped bytes, computed a
MAC over a length that depended on them) and only then found out whether the
message was genuine. Every step in that gap was a place for the attacker's
chosen ciphertext to produce an observable difference. In December 2011 Moxie
Marlinspike gave the pattern a name in a blog post, "The Cryptographic Doom
Principle": if you have to perform any cryptographic operation before
verifying the MAC on a message you have received, it will somehow inevitably
lead to doom.

Theory had reached the same place more formally. In 2000 Mihir Bellare and
Chanathip Namprempre compared the three ways of combining a cipher and a MAC
(book 1, [§10.7](../../book/10-Message-Authentication.md)) and showed that
only **encrypt-then-MAC** is secure for every secure cipher and every secure
MAC. In 2001 Hugo Krawczyk showed that SSL's MAC-then-encrypt order was safe
for some ciphers (CTR, or CBC used in a particular way) but not in general.
The "particular way" was exactly what implementations got wrong for the next
thirteen years.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two receivers. MAC-then-encrypt decrypts and checks padding before checking the MAC, leaking at each step. Encrypt-then-MAC checks the MAC on the ciphertext first and rejects forgeries before decryption." fill="currentColor" font-size="14">
<text x="20" y="26" font-weight="bold">MAC-then-encrypt (SSL, TLS up to 1.2)</text>
<rect x="20" y="40" width="100" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="70" y="63" text-anchor="middle">ciphertext</text>
<rect x="150" y="40" width="100" height="36" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="150" y="40" width="100" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="200" y="63" text-anchor="middle">decrypt</text>
<rect x="280" y="40" width="110" height="36" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="280" y="40" width="110" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="335" y="63" text-anchor="middle">strip padding</text>
<rect x="420" y="40" width="100" height="36" rx="3" fill="currentColor" opacity="0.15"/>
<rect x="420" y="40" width="100" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="470" y="63" text-anchor="middle">check MAC</text>
<rect x="550" y="40" width="70" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="585" y="63" text-anchor="middle">use</text>
<line x1="120" y1="58" x2="146" y2="58" stroke="currentColor" stroke-width="1.4"/>
<line x1="250" y1="58" x2="276" y2="58" stroke="currentColor" stroke-width="1.4"/>
<line x1="390" y1="58" x2="416" y2="58" stroke="currentColor" stroke-width="1.4"/>
<line x1="520" y1="58" x2="546" y2="58" stroke="currentColor" stroke-width="1.4"/>
<text x="335" y="100" text-anchor="middle" font-size="13">shaded steps run on forged data: errors, timing, lengths leak</text>
<text x="20" y="150" font-weight="bold">Encrypt-then-MAC (IPsec ESP, RFC 7366, every AEAD)</text>
<rect x="20" y="164" width="100" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="70" y="187" text-anchor="middle">ciphertext</text>
<rect x="150" y="164" width="140" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="220" y="187" text-anchor="middle">check MAC first</text>
<rect x="320" y="164" width="100" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="370" y="187" text-anchor="middle">decrypt</text>
<rect x="450" y="164" width="70" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="485" y="187" text-anchor="middle">use</text>
<line x1="120" y1="182" x2="146" y2="182" stroke="currentColor" stroke-width="1.4"/>
<line x1="290" y1="182" x2="316" y2="182" stroke="currentColor" stroke-width="1.4"/>
<line x1="420" y1="182" x2="446" y2="182" stroke="currentColor" stroke-width="1.4"/>
<line x1="220" y1="200" x2="220" y2="222" stroke="currentColor" stroke-width="1.4"/>
<text x="220" y="240" text-anchor="middle" font-size="13">forged: reject, one constant-time answer</text>
</svg>
<figcaption>Figure 10.6. Where the oracles live. In MAC-then-encrypt the receiver runs decryption and padding code on whatever the attacker sends; in encrypt-then-MAC a forged ciphertext is rejected before any of that code runs.</figcaption>
</figure>

Padding was not the only casualty. SSH (**encrypt-and-MAC**) must decrypt
the first block of each packet to learn its length before it can find the
MAC. In 2009 Martin Albrecht, Kenneth Paterson and Gaurav Watson fed an SSH
server a target ciphertext block as the start of a packet and watched how many
bytes it waited for, reading 14 bits of the block with probability $2^{-14}$,
or 32 bits with probability $2^{-18}$. In 2018 the **Efail** team (Damian
Poddebniak, Juraj Somorovsky, Sebastian Schinzel, Jörg Schwenk and others)
showed that OpenPGP and S/MIME email, whose CFB and CBC encryption was either
unauthenticated or whose integrity check mail clients ignored, could be
modified so that a victim's own mail client decrypted a message and sent the
plaintext to the attacker inside an image URL.

What encrypt-then-MAC asks of an implementation is short:

1. MAC everything that will influence decryption: the IV or nonce, the
   ciphertext, the header, the length. Use a separate key.
2. On receipt, recompute the MAC and compare it with the received tag in
   constant time.
3. If it differs, reject with one fixed error, and do nothing else with the
   message. Only if it matches, decrypt.

For TLS 1.2 this order became available as an extension in 2014 (RFC 7366,
by Peter Gutmann). Most of the world went further and moved to AEAD.

## 10.11 What AEAD and misuse-resistant modes fix

*Level: intermediate.*

An AEAD (RFC 5116) is encrypt-then-MAC made into one primitive with one key
and one rule: decryption returns the plaintext or FAIL, and nothing else. TLS
1.3 (RFC 8446, 2018) allows nothing but AEADs. The attacks of this chapter
show what that buys:

| Attack | Cause | After AEAD |
|---|---|---|
| Padding oracle, POODLE, Lucky Thirteen | decrypting and parsing before authenticating | gone: no padding, and the tag is checked before any plaintext is released |
| BEAST | predictable CBC IV | gone: counter modes need unique nonces, not unpredictable ones |
| CTR two-time pad | repeated nonce | still fatal, and in GCM worse (§10.7) |
| Sweet32 | 64-bit block | gone with AES; GCM still has data limits per key |
| CBC-MAC splice | MAC used outside its proof | gone: the MAC is part of a proven mode |
| CRIME, BREACH | length of compressed data | **not fixed**: AEAD hides content, not length |

Two weak points remain, and both concern the user rather than the mode.

**Nonces.** GCM and ChaCha20-Poly1305 depend completely on unique nonces.
**Misuse-resistant** modes reduce what a repeat costs. Phillip Rogaway and
Thomas Shrimpton's **SIV** (2006) computes a MAC over the nonce, the
associated data and the plaintext first, then uses that tag as the CTR IV.
Encrypting the same message twice under the same nonce then gives the same
ciphertext, which reveals that the two were equal and nothing more; two
different messages get different IVs even under the same nonce, so there is
no shared keystream and no forbidden attack. **AES-GCM-SIV** (Shay Gueron,
Adam Langley and Yehuda Lindell; RFC 8452, 2019) builds the same structure
from GCM's fast parts and derives fresh keys for each nonce. The price is two
passes over the data, so encryption cannot stream. Book 1's
[§10.10](../../book/10-Message-Authentication.md) describes both constructions.

**Releasing plaintext early.** A streaming API that hands out decrypted bytes
before it has seen and checked the tag recreates MAC-then-decrypt by the back
door, and Efail was in part this mistake. An AEAD's guarantees hold only if
the caller waits for the tag.

### The lesson for protocol designers

The attacks in this chapter were not found by better mathematics against the
ciphers. They were found by reading specifications and asking the questions
of §10.1. Turned around, they become rules:

- **Authenticate before you act.** Verify the tag over everything,
  including headers and lengths, before decrypting, parsing or answering.
- **Give one answer for every failure**, in constant time. A different error,
  log line, delay or connection behavior is an oracle.
- **Know your mode's promise.** CBC needs unpredictable IVs; CTR and GCM need
  unique nonces. Make the promise structurally true (record counters, durable
  storage) rather than hoping for it, or choose a misuse-resistant mode.
- **Count the data.** Set and enforce a limit per key from the birthday bound:
  $2^{20}$ blocks for triple DES, and for AES-GCM the limits TLS 1.3 sets.
- **Do not compress secrets together with attacker-controlled text.**
- **Remove old options.** SSL 3.0 and TLS 1.0 stayed dangerous for years
  after their replacements, because they were still allowed.

## 10.12 Going deeper

*Level: expert.*

**Chosen-ciphertext security.** A padding oracle shows that CBC with padding
is not IND-CCA secure ([Chapter 1](01-What-Cryptanalysis-Is.md)), which was
always known; the surprise was how little of a decryption oracle suffices.
Paterson and others later defined security for the real TLS record layer, with
variable padding and length hiding, and the gap between that and the textbook
definitions is where these attacks lived; Paterson, Ristenpart and Shrimpton's
"Tag Size Does Matter" (2011) attacked TLS's truncated-MAC option there.

**Short GCM tags.** Niels Ferguson pointed out to NIST in 2005 that GCM with
short tags (32 or 64 bits) is weaker than its length suggests. Because squaring
is linear over $\mathrm{GF}(2)$, an attacker who changes only the blocks at
positions $2^i$ makes the error polynomial a *linear* function of the bits of
$H$, can force many bits of the tag difference to zero, and so forges far more
often than $2^{-t}$; each success reveals linear equations in the bits of $H$.
This is why SP 800-38D attaches strict limits to 32- and 64-bit tags.

**Weak keys and proofs.** Markku-Juhani Saarinen showed in 2012 that hash
keys $H$ in small multiplicative subgroups allow "cycling" forgeries (rare for
random $H$). The same year Tetsu Iwata, Keisuke Ohashi and Kazuhiko Minematsu
found GCM's original proof wrong for nonces that are not 96 bits long, and
repaired it with weaker bounds.

**Implementations.** Lucky Thirteen's fixes show that having no oracle is a
property of machine code, not of specifications.
[Chapter 17](17-Side-Channels-the-Attackers-View.md) treats timing attacks
from the attacker's side.

**Key commitment.** GCM does not bind a ciphertext to one key. Since GHASH is
linear in the ciphertext once $H$ is fixed, the forbidden attack's algebra
run constructively yields one ciphertext valid under many chosen keys: the
"partitioning oracles" of Julia Len, Paul Grubbs and Thomas Ristenpart (2021),
which test many password guesses at once (book 1,
[§10.10](../../book/10-Message-Authentication.md)).

**Nonce-misuse resistance, precisely.** Rogaway and Shrimpton require that a
repeated (nonce, associated data, message) triple leaks only equality. Security
under **release of unverified plaintext** (Andreeva and colleagues, 2014) asks
what leaks if plaintext escapes before the tag is checked; most modes, SIV
included, offer little there.

## Check yourself

??? question "1. Two messages were encrypted with AES-CTR under the same key and nonce. Why does the XOR of the ciphertexts not depend on the key?"

    Both are $P \oplus S$ with the same keystream $S$, and $S \oplus S = 0$, so
    $C_1 \oplus C_2 = P_1 \oplus P_2$. The key only ever entered through $S$.

??? question "2. In the hand example of §10.2 the previous block ends in `C1`. Suppose the oracle had accepted (with `01` padding) at $F_{15} = \mathtt{81}$. What is the plaintext byte?"

    $I_{15} = \mathtt{81} \oplus \mathtt{01} = \mathtt{80}$, and the plaintext
    byte is $\mathtt{80} \oplus \mathtt{C1} = \mathtt{41}$, the letter `A`.

??? question "3. Both POODLE and Vaudenay's attack wait for one byte value in 256. Why does POODLE need about 256 requests per byte and Vaudenay about 128?"

    Vaudenay's attacker chooses each probe and never repeats one: a search
    without replacement through 256 values, about 128 on average. POODLE's
    attacker gets a fresh random value per connection and cannot choose it:
    sampling with replacement, a geometric distribution with mean
    $1/p = 256$.

??? question "4. A TLS library defends against Lucky Thirteen by adding a random delay of up to a millisecond to every error. Why is that not enough?"

    The delay is independent of the padding, so it adds noise with the same
    distribution in both cases; the mean times still differ by one SHA-1
    compression. Averaging enough samples removes the noise. "Lucky
    Microseconds" (2016) did this against s2n. The fix is for the work done
    not to depend on the padding at all.

??? question "5. In TLS 1.0 the attacker sees the last ciphertext block $X$ before the next record is encrypted. Which first plaintext block tests the guess $G$ for an earlier block $P_i$, and why does TLS 1.1 stop this?"

    $P^* = X \oplus C_{i-1} \oplus G$. It encrypts to
    $E_K(C_{i-1} \oplus G)$, which equals $C_i$ exactly when $G = P_i$. TLS
    1.1 gives each record a fresh random IV, unknown when the attacker
    chooses $P^*$, so it cannot cancel it.

??? question "6. Two GCM messages under one nonce have one ciphertext block each but different associated data lengths. Does the forbidden attack still work?"

    Yes. The length blocks now differ, so the term $(L \oplus L')\,H$ stays in
    the difference, along with the associated data blocks. $H$ is still a root
    of a known nonzero polynomial, now of degree up to the number of blocks,
    and root finding gives a short list of candidates.

??? question "7. In the toy field $\mathrm{GF}(2^4)$ with $x^4 = x + 1$, two one-block messages under one nonce have $C_1 \oplus C_2 = \mathtt{0010}$ and $T_1 \oplus T_2 = \mathtt{0011}$. Find $H$."

    The inverse of $\mathtt{0010} = x$ is $x^3 + 1 = \mathtt{1001}$, since
    $x^4 + x = 1$. So $H^2 = (x + 1)(x^3 + 1) = x^4 + x^3 + x + 1 = x^3 = \mathtt{1000}$.
    The square root: $(x^3 + x)^2 = x^6 + x^2 = (x^3 + x^2) + x^2 = x^3$, so
    $H = \mathtt{1010}$.

??? question "8. Why does an AEAD not stop BREACH, and how does masking a CSRF token per response stop it?"

    An AEAD hides content but not length, and BREACH reads only lengths.
    Masking sends $r \Vert (t \oplus r)$ with a fresh random $r$, so the bytes
    of the token differ in every response and an attacker's guess cannot
    match them, while the server can still recover $t$.

??? question "9. Explain why a CBC padding oracle is also an encryption oracle."

    For any block $C$ the attacker can learn $I = D_K(C)$. To make a message
    decrypt to $P_1, \ldots, P_n$, pick a random last block $C_n$, learn
    $D_K(C_n)$ and set $C_{n-1} = D_K(C_n) \oplus P_n$; then learn
    $D_K(C_{n-1})$ and set $C_{n-2} = D_K(C_{n-1}) \oplus P_{n-1}$; and so on
    back to the IV. The receiver decrypts the result to exactly the chosen
    plaintext. This is how the 2010 ASP.NET attack forged encrypted state.

## What you learned

- Attacks on modes break the wrapping, not the cipher; they work against an
  ideal block cipher.
- A padding oracle answers a needle question about one byte of the
  decryption. It reads CBC at about 128 queries per byte, 256 when the probe
  is random as in POODLE, and it can encrypt as well as decrypt.
- Timing is an oracle too. Lucky Thirteen read TLS through one SHA-1
  compression; only code whose work does not depend on secrets stops it.
- BEAST used a predictable IV and a moving block boundary to turn a
  $2^{128}$ guess into sixteen guesses of one byte each.
- A repeated nonce makes CTR a two-time pad, and in GCM it also makes the hash
  key a root of a known polynomial over $\mathrm{GF}(2^{128})$, found with
  gcds and Cantor-Zassenhaus. One repeat costs integrity for the life of the key.
- The birthday bound turns 64-bit blocks into a 32 GiB budget (Sweet32), and
  bounds every block-cipher MAC.
- Compression before encryption makes the length a function of the secret
  (CRIME, BREACH), and no cipher can fix that.
- Authenticate before anything else: encrypt-then-MAC, or an AEAD. Prefer
  misuse-resistant modes such as AES-GCM-SIV where nonces cannot be
  guaranteed.

**Next:** [Chapter 11](11-Factoring.md) leaves secret-key cryptography and
turns to the problems under public keys, starting with factoring.

## Further reading

- Serge Vaudenay, "Security Flaws Induced by CBC Padding: Applications to SSL,
  IPSEC, WTLS..." (EUROCRYPT 2002).
- Brice Canvel, Alain Hiltgen, Serge Vaudenay and Martin Vuagnoux, "Password
  Interception in a SSL/TLS Channel" (CRYPTO 2003).
- Juliano Rizzo and Thai Duong, "Practical Padding Oracle Attacks" (USENIX
  WOOT 2010).
- Bodo Möller, Thai Duong and Krzysztof Kotowicz, "This POODLE Bites:
  Exploiting the SSL 3.0 Fallback" (Google, 2014).
- Nadhem AlFardan and Kenneth Paterson, "Lucky Thirteen: Breaking the TLS and
  DTLS Record Protocols" (IEEE Symposium on Security and Privacy 2013).
- Martin Albrecht and Kenneth Paterson, "Lucky Microseconds: A Timing Attack
  on Amazon's s2n Implementation of TLS" (EUROCRYPT 2016).
- Gregory Bard, "A Challenging but Feasible Blockwise-Adaptive
  Chosen-Plaintext Attack on SSL" (SECRYPT 2006).
- Thai Duong and Juliano Rizzo, "Here Come The ⊕ Ninjas" (the BEAST paper, 2011).
- Antoine Joux, "Authentication Failures in NIST version of GCM" (comment to
  NIST, 2006).
- Niels Ferguson, "Authentication Weaknesses in GCM" (comment to NIST, 2005).
- Hanno Böck, Aaron Zauner, Sean Devlin, Juraj Somorovsky and Philipp
  Jovanovic, "Nonce-Disrespecting Adversaries: Practical Forgery Attacks on
  GCM in TLS" (USENIX WOOT 2016).
- Karthikeyan Bhargavan and Gaëtan Leurent, "On the Practical (In-)Security
  of 64-bit Block Ciphers" (ACM CCS 2016).
- Bart Preneel and Paul van Oorschot, "MDx-MAC and Building Fast MACs from
  Hash Functions" (CRYPTO 1995).
- John Kelsey, "Compression and Information Leakage of Plaintext" (FSE 2002).
- Angelo Prado, Neal Harris and Yoel Gluck, "SSL, Gone in 30 Seconds: A BREACH
  Beyond CRIME" (Black Hat USA 2013).
- Mihir Bellare and Chanathip Namprempre, "Authenticated Encryption: Relations
  among Notions and Analysis of the Generic Composition Paradigm" (ASIACRYPT
  2000).
- Hugo Krawczyk, "The Order of Encryption and Authentication for Protecting
  Communications (or: How Secure Is SSL?)" (CRYPTO 2001).
- Martin Albrecht, Kenneth Paterson and Gaurav Watson, "Plaintext Recovery
  Attacks Against SSH" (IEEE Symposium on Security and Privacy 2009).
- Damian Poddebniak and others, "Efail: Breaking S/MIME and OpenPGP Email
  Encryption using Exfiltration Channels" (USENIX Security 2018).
- Moxie Marlinspike, "The Cryptographic Doom Principle" (blog post, 2011).
- Phillip Rogaway and Thomas Shrimpton, "Deterministic Authenticated
  Encryption" (EUROCRYPT 2006), the SIV paper.
- Standards: SP 800-38B (CMAC, 2005), SP 800-38D (GCM, 2007), SP 800-67
  revision 2 (triple DES, 2017), RFC 5116 (the AEAD interface, 2008),
  RFC 7465 (no RC4 in TLS, 2015), RFC 7366 (encrypt-then-MAC for TLS, 2014),
  RFC 8452 (AES-GCM-SIV, 2019).
