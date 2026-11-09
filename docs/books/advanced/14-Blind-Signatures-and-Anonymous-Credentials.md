# 14. Blind Signatures and Anonymous Credentials

*Most of the time a service does not need to know who you are. It needs to know
that you may: that you paid, that you are over eighteen, that you are a member,
that your phone is a real phone and not a bot farm. This chapter is about
proving that you may without saying who you are. It starts with David Chaum's
1982 idea of a signature on a sealed envelope, worked by hand with RSA numbers
small enough to check on paper, and follows it through digital cash, the
company that tried to sell it in the 1990s, and the tokens that quietly replace
CAPTCHAs on Apple's phones and computers today. Then it widens the toolkit: group
signatures with a manager who can unmask a signer, ring signatures with no
manager at all, the anonymous attestation built into TPM chips, credential
systems that reveal one attribute and hide the rest, and the salted-hash
selective disclosure now inside driver's licenses on phones and the European
identity wallet. You will issue and spend a blind coin, catch a double
spender, sign as one of four people without saying which, and build a credential
that tells a school a child is vaccinated without handing over a medical
record.*

!!! abstract "In this chapter"
    **You will learn:**

    - what "proving you may without saying who you are" means, and the two
      separate goals inside it: anonymity (the verifier does not learn who) and
      unlinkability (two uses cannot be tied together);
    - Chaum's blind RSA signature, by hand with $n = 3233$, why the signer
      learns nothing, and why the same key must never decrypt;
    - untraceable electronic cash: coins as blindly signed serial numbers, the
      online double-spending check, and the offline trick that reveals a
      cheater's identity only if a coin is spent twice;
    - the story of DigiCash (1989 to 1998) and why good cryptography did not
      save it;
    - RSA blind signatures as standardized in RFC 9474 (2023), Privacy Pass
      (RFC 9576 to RFC 9578, 2024) and Apple's Private Access Tokens (2022),
      and why blind Schnorr signatures fell to the ROS attack;
    - group signatures and the opening power of the group manager; ring
      signatures (Rivest, Shamir, Tauman 2001) coded in the style of Abe,
      Ohkubo and Suzuki (2002); linkable ring signatures and key images;
    - direct anonymous attestation in TPM chips;
    - anonymous credentials: Camenisch-Lysyanskaya, IBM's Idemix, Microsoft's
      U-Prove, BBS signatures, and how they differ from salted-hash selective
      disclosure (SD-JWT, RFC 9901, and the mobile driver's license of
      ISO/IEC 18013-5);
    - the European digital identity wallet, the argument over unlinkability,
      and zero-knowledge proofs of age.

    **You need:** RSA from book 1, [Chapter 13](../../book/13-RSA.md), and
    Schnorr groups from book 1, [Chapter 14](../../book/14-Discrete-Log-Systems.md).
    [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) of this book is the
    proof toolkit: Schnorr proofs, the OR-proof and Fiat-Shamir are used here
    and not taught again. Hash functions from book 1,
    [Chapter 9](../../book/09-Hash-Functions.md), for §14.10.

    **Levels:** §14.1, §14.2 and §14.4 are for beginners, §14.3 and §14.5 to
    §14.12 are intermediate, §14.13 is expert.

## 14.1 The problem

*Level: beginner.*

A bus ticket says nothing about who bought it. A cinema ticket, a coin, a
stamp, a cloakroom token: each one proves that someone paid, and none of them
records who. For most of history that was simply how paying and entering
worked. The record of a person's day, which buses they took, what they
bought, which doctor they saw, existed only in the memories of the people they
met.

Computers changed that without anyone deciding it should change. A payment
by card or app leaves a record with a name on it, at the bank, at the card
network, at the shop and often at an advertising company. A website that wants
to know whether a visitor is a person, not a script, asks them to log in or
solve a puzzle while it watches. A bar checking age looks at a card that also
shows a name, an address and a birth date, and a website checking age may ask
for a scan of that card and keep it. In each case the service needed one fact,
and the method handed over an identity.

In 1985 David Chaum, then at the Centre for Mathematics and Computer Science
(CWI) in Amsterdam, published a paper in *Communications of the ACM* with a
title that sets out this chapter: "Security without identification:
transaction systems to make Big Brother obsolete". Its argument was that the
choice between security and privacy is false. An organization does not need a
person's identity to be safe from fraud. It needs to know that the person is
entitled, and that the entitlement cannot be used twice or forged. Chaum
showed that cryptography could give organizations exactly that and nothing
more: payments that a bank can trust but cannot trace, credentials that an
issuer signs but cannot follow, and pseudonyms that a person can use with
different organizations without the organizations being able to link them.

The tool behind most of it was one Chaum had presented three years earlier at
the CRYPTO '82 conference: the **blind signature**. A signer signs a message
without seeing it. Later, anyone can check the signature, and the signer cannot
tell which of the many messages it signed this one was.

### Two goals, not one

"Anonymous" covers two different properties, and the tools in this chapter
offer different mixtures of them.

- **Anonymity.** The verifier does not learn who you are. A blind token, a ring
  signature and a selective-disclosure credential all give this.
- **Unlinkability.** Two uses cannot be tied together, even if neither
  reveals a name. A pseudonym is anonymous but linkable: every post under it
  can be collected into a profile, and one slip ties the profile to a person.
  Unlinkability is the stronger goal and the harder one, because anything that
  repeats, a key, a signature, a serial number, a hash, links.

A third property is often wanted together with these, and it pulls the other
way: **accountability**. A bank must catch someone who spends a coin twice; a
group must be able to unmask a member who abuses its signature; a website that
accepts anonymous tokens must be able to limit how many one person gets. Much of
this chapter is about how a protocol keeps people anonymous while honest and
makes them identifiable, or at least blockable, when they cheat.

### The tools

| Tool | Who signs or issues | What the verifier learns | Linkable? | Section |
|---|---|---|---|---|
| Blind signature | an issuer, blind | "the issuer signed this" | no | §14.2 to §14.5 |
| Group signature | a member | "some member signed" | no, but a manager can open | §14.6 |
| Ring signature | anyone, ad hoc | "one of these keys signed" | no (yes if linkable) | §14.7 |
| Direct anonymous attestation | a TPM chip | "a genuine chip signed" | chosen per verifier | §14.8 |
| Anonymous credential (CL, BBS) | an issuer, then the holder proves | chosen attributes only | no | §14.9 |
| Salted-hash disclosure (SD-JWT, mdoc) | an issuer | chosen attributes only | yes, unless used once | §14.10 |

The last column matters more than it seems. It is the difference between the
designs that real wallets ship today and the designs cryptographers wish they
shipped, and it is the subject of an argument still going on in Europe as this
chapter is written (§14.12). Figure 14.1 shows the forty years of work behind
the table.

<figure class="mars-fig">
<svg viewBox="0 0 640 450" width="640" role="img" aria-label="Timeline of blind signatures and anonymous credentials from 1982 to 2026" fill="currentColor" font-size="14">
<line x1="78" y1="10" x2="78" y2="440" stroke="currentColor" stroke-width="1.6"/>
<text x="64" y="27" text-anchor="end" font-weight="bold">1982</text>
<circle cx="78" cy="22" r="3.5"/>
<text x="92" y="27">Chaum presents blind signatures at CRYPTO '82</text>
<text x="64" y="49" text-anchor="end" font-weight="bold">1985</text>
<circle cx="78" cy="44" r="3.5"/>
<text x="92" y="49">"Security without identification"</text>
<text x="64" y="71" text-anchor="end" font-weight="bold">1988</text>
<circle cx="78" cy="66" r="3.5"/>
<text x="92" y="71">Chaum, Fiat, Naor: offline untraceable cash</text>
<text x="64" y="93" text-anchor="end" font-weight="bold">1989</text>
<circle cx="78" cy="88" r="3.5"/>
<text x="92" y="93">DigiCash founded in Amsterdam</text>
<text x="64" y="115" text-anchor="end" font-weight="bold">1991</text>
<circle cx="78" cy="110" r="3.5"/>
<text x="92" y="115">Chaum and van Heyst: group signatures</text>
<text x="64" y="137" text-anchor="end" font-weight="bold">1995</text>
<circle cx="78" cy="132" r="3.5"/>
<text x="92" y="137">Mark Twain Bank issues ecash in the US</text>
<text x="64" y="159" text-anchor="end" font-weight="bold">1998</text>
<circle cx="78" cy="154" r="3.5"/>
<text x="92" y="159">DigiCash files for bankruptcy</text>
<text x="64" y="181" text-anchor="end" font-weight="bold">2001</text>
<circle cx="78" cy="176" r="3.5"/>
<text x="92" y="181">Ring signatures; Camenisch-Lysyanskaya credentials</text>
<text x="64" y="203" text-anchor="end" font-weight="bold">2002</text>
<circle cx="78" cy="198" r="3.5"/>
<text x="92" y="203">IBM's Idemix; Abe-Ohkubo-Suzuki ring signatures</text>
<text x="64" y="225" text-anchor="end" font-weight="bold">2004</text>
<circle cx="78" cy="220" r="3.5"/>
<text x="92" y="225">Direct anonymous attestation; BBS; linkable rings</text>
<text x="64" y="247" text-anchor="end" font-weight="bold">2008</text>
<circle cx="78" cy="242" r="3.5"/>
<text x="92" y="247">Microsoft acquires U-Prove</text>
<text x="64" y="269" text-anchor="end" font-weight="bold">2017</text>
<circle cx="78" cy="264" r="3.5"/>
<text x="92" y="269">Privacy Pass browser extension</text>
<text x="64" y="291" text-anchor="end" font-weight="bold">2020</text>
<circle cx="78" cy="286" r="4.5"/>
<text x="92" y="291" font-weight="bold">ROS attack breaks concurrent blind Schnorr</text>
<text x="64" y="313" text-anchor="end" font-weight="bold">2021</text>
<circle cx="78" cy="308" r="3.5"/>
<text x="92" y="313">ISO/IEC 18013-5: driver's licenses on phones</text>
<text x="64" y="335" text-anchor="end" font-weight="bold">2022</text>
<circle cx="78" cy="330" r="3.5"/>
<text x="92" y="335">Apple's Private Access Tokens announced</text>
<text x="64" y="357" text-anchor="end" font-weight="bold">2023</text>
<circle cx="78" cy="352" r="3.5"/>
<text x="92" y="357">RFC 9474, RSA blind signatures</text>
<text x="64" y="379" text-anchor="end" font-weight="bold">2024</text>
<circle cx="78" cy="374" r="3.5"/>
<text x="92" y="379">Privacy Pass RFCs; eIDAS 2.0 regulation</text>
<text x="64" y="401" text-anchor="end" font-weight="bold">2025</text>
<circle cx="78" cy="396" r="3.5"/>
<text x="92" y="401">SD-JWT as RFC 9901; Google opens its ZK age proof</text>
<text x="64" y="423" text-anchor="end" font-weight="bold">2026</text>
<circle cx="78" cy="418" r="3.5"/>
<text x="92" y="423">EU identity wallets due by 24 December</text>
</svg>
<figcaption>Figure 14.1. Forty years from a sealed envelope to identity wallets. The bold entry marks the one attack in the list: a scheme believed secure for decades that fails when many sessions run at once.</figcaption>
</figure>

## 14.2 Blind RSA signatures by hand

*Level: beginner.*

Chaum explained his idea with an envelope. You write a message on a slip of
paper, put it into an envelope lined with carbon paper, and hand the sealed
envelope to a notary. The notary signs the outside. The carbon paper copies the
signature through onto your slip. At home you open the envelope, and you have
a slip signed by the notary, who never saw what it says. Later the notary is
shown a hundred signed slips and cannot say which envelope any of them came
from.

Nothing about this is a trick of the analogy. RSA makes it exact, because RSA
is multiplicative: the signature of a product is the product of the
signatures.

### RSA in one paragraph

An RSA key is a modulus $n = pq$, a public exponent $e$ and a private exponent
$d$ with $ed \equiv 1 \pmod{\varphi(n)}$. The signature on a message
representative $m$ (a number below $n$, made from the message by a hash) is
$s = m^d \bmod n$, and anyone checks $s^e \equiv m \pmod n$. Book 1's
[Chapter 13](../../book/13-RSA.md) explains why this works. The one property
needed here is

$$
(a \cdot b)^d = a^d \cdot b^d \pmod n.
$$

### The protocol

The user has a message representative $m$ and wants the signer's signature on
it without the signer seeing $m$.

<div class="mars-steps" markdown>

1. **Blind.** The user picks a random $r$ with $\gcd(r, n) = 1$ and sends
   $m' = m \cdot r^e \bmod n$.
2. **Sign.** The signer computes $s' = (m')^d \bmod n$, an ordinary RSA
   signature on the number it received, and sends it back.
3. **Unblind.** The user computes $s = s' \cdot r^{-1} \bmod n$.
4. **Verify.** Anyone checks $s^e \equiv m \pmod n$.

</div>

Why it is correct: $s' = (m r^e)^d = m^d \cdot r^{ed} = m^d \cdot r \pmod n$,
because $r^{ed} \equiv r$. Dividing by $r$ leaves $m^d$, which is exactly the
signature the signer would have produced on $m$ directly.

### By hand

Take the textbook key from book 1: $p = 61$, $q = 53$, so $n = 3233$ and
$\varphi(n) = 60 \cdot 52 = 3120$. With $e = 17$, the private exponent is
$d = 2753$, since $17 \cdot 2753 = 46801 = 15 \cdot 3120 + 1$.

The user's message representative is $m = 1234$ and the blinding factor is
$r = 7$.

**Blind.** First $r^e = 7^{17} \bmod 3233$, by repeated squaring:

| power | $7^1$ | $7^2$ | $7^4$ | $7^8$ | $7^{16}$ | $7^{17} = 7^{16} \cdot 7$ |
|---|---|---|---|---|---|---|
| value mod 3233 | 7 | 49 | 2401 | 362 | 1724 | 2369 |

(For example, $2401^2 = 5{,}764{,}801 = 1783 \cdot 3233 + 362$.) Then

$$
m' = 1234 \cdot 2369 \bmod 3233 = 2{,}923{,}346 \bmod 3233 = 714.
$$

The user sends 714. Nothing about 714 points to 1234: as $r$ runs over all the
allowed values, $m \cdot r^e$ runs over all of them too, so 714 is what any
message would look like with a suitable $r$.

**Sign.** The signer computes $714^{2753} \bmod 3233 = 885$. (That is eleven
squarings and four multiplications; a computer does it in microseconds.) It
can check its own work: $885^{17} \bmod 3233 = 714$.

**Unblind.** The inverse of 7 mod 3233 is 462, because
$7 \cdot 462 = 3234 = 3233 + 1$. Then

$$
s = 885 \cdot 462 \bmod 3233 = 408{,}870 \bmod 3233 = 1512.
$$

**Verify.** Again by squaring:

| power | $s^1$ | $s^2$ | $s^4$ | $s^8$ | $s^{16}$ | $s^{17}$ |
|---|---|---|---|---|---|---|
| value mod 3233 | 1512 | 413 | 2453 | 596 | 2819 | 1234 |

The result is 1234, the message. And $1234^{2753} \bmod 3233$ is also 1512: the
user holds exactly the signature the signer would have made with its eyes
open.

**What the signer saw.** The signer saw 714 and answered 885. Had the user
chosen $r = 10$, it would have seen 1070 and answered 2188; with $r = 19$, 2388
and 2864. Each of these unblinds to the same 1512. Turn it around: given any
session the signer remembers, $(m', s')$, and any valid signature $s$ that
later turns up, the value $r = s' \cdot s^{-1} \bmod n$ explains the pair
perfectly, since $m \cdot r^e = s^e \cdot (s')^e \cdot s^{-e} = (s')^e = m'$.
So every session is equally consistent with every signature. This is
**perfect blindness**: not hard to undo, but impossible, whatever computing
power the signer has.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Blind RSA message flow with n = 3233: the user sends 714, the signer returns 885, the user unblinds to 1512 and anyone verifies 1512 to the 17th equals 1234" fill="currentColor" font-size="14">
<rect x="20" y="10" width="190" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="115" y="29" text-anchor="middle" font-weight="bold">User</text>
<text x="115" y="46" text-anchor="middle">knows m = 1234</text>
<rect x="430" y="10" width="190" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="525" y="29" text-anchor="middle" font-weight="bold">Signer</text>
<text x="525" y="46" text-anchor="middle">n = 3233, d = 2753</text>
<line x1="115" y1="54" x2="115" y2="320" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="525" y1="54" x2="525" y2="320" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="125" y="84">picks r = 7, r^e = 2369</text>
<line x1="115" y1="120" x2="517" y2="120" stroke="currentColor" stroke-width="2"/>
<polygon points="525,120 515,115 515,125"/>
<text x="320" y="112" text-anchor="middle">1. m' = 1234 · 2369 mod 3233 = 714</text>
<text x="515" y="152" text-anchor="end">signs blind: 714^2753 = 885</text>
<line x1="525" y1="180" x2="123" y2="180" stroke="currentColor" stroke-width="2"/>
<polygon points="115,180 125,175 125,185"/>
<text x="320" y="172" text-anchor="middle">2. s' = 885</text>
<text x="125" y="214">3. unblind: s = 885 · 462 mod 3233 = 1512</text>
<text x="125" y="244">4. anyone checks 1512^17 mod 3233 = 1234</text>
<text x="320" y="290" text-anchor="middle" opacity="0.8">the signer saw 714 and 885; it never sees 1234 or 1512</text>
<text x="320" y="312" text-anchor="middle" opacity="0.8">with r = 10 it would have seen 1070 and 2188 instead</text>
</svg>
<figcaption>Figure 14.2. Blind RSA with the numbers worked above. The blinding factor r enters as r^e and leaves as r, because the signer's exponent d turns one into the other.</figcaption>
</figure>

### Code it

The same protocol for three coins, with the message hashed into $\mathbb{Z}_n$.
The last loop plays the signer trying to match its three sessions to the three
signatures it later sees, and finds that every matching works.

```python
import hashlib, math, random
random.seed(1983)                   # random is for the demo; real blinding factors use secrets

p, q, e = 61, 53, 17                # toy key; real RSA blind signatures use 2048 bits or more
n = p * q
d = pow(e, -1, (p - 1) * (q - 1))

def H(msg):                         # hash the message into Z_n (a stand-in for PSS encoding)
    return int.from_bytes(hashlib.sha256(msg).digest(), "big") % n

def blind(msg):                     # user: hide H(msg) behind a random r
    while True:
        r = random.randrange(2, n)
        if math.gcd(r, n) == 1:
            return H(msg) * pow(r, e, n) % n, r

def sign(x):                        # signer: an ordinary RSA operation on a number it cannot read
    return pow(x, d, n)

def unblind(s_blind, r):            # user: divide out r
    return s_blind * pow(r, -1, n) % n

def verify(msg, s):
    return pow(s, e, n) == H(msg)

coins = [b"serial 7f3a", b"serial 91c2", b"serial 0be5"]
seen, final = [], []
for c in coins:
    x, r = blind(c)
    sx = sign(x)
    s = unblind(sx, r)
    seen.append((x, sx))
    final.append(s)
    print(c.decode(), " H =", H(c), " signer saw", x, "->", sx, "  user holds", s, " valid:", verify(c, s))

# Can the signer tell which session produced which signature?  For every pairing
# there is a blinding factor r that explains it, so every pairing is equally possible.
for x, sx in seen:
    rs = [sx * pow(s, -1, n) % n for s in final]
    ok = [H(c) * pow(r, e, n) % n == x for c, r in zip(coins, rs)]
    print("session", x, "fits signatures", final, "with r =", rs, ok)
```

Output:

```
serial 7f3a  H = 202  signer saw 1598 -> 2700   user holds 3218  valid: True
serial 91c2  H = 2803  signer saw 1444 -> 784   user holds 278  valid: True
serial 0be5  H = 3135  signer saw 2140 -> 141   user holds 633  valid: True
session 1598 fits signatures [3218, 278, 633] with r = [3053, 754, 372] [True, True, True]
session 1444 fits signatures [3218, 278, 633] with r = [1672, 468, 2795] [True, True, True]
session 2140 fits signatures [3218, 278, 633] with r = [2577, 2245, 3080] [True, True, True]
```

Nine `True`s: each of the three sessions is consistent with each of the three
signatures. The signer's records are useless for tracing. With a 3233 modulus,
of course, anyone could also factor $n$ and forge; the point here is the
algebra, and real keys are 2048 bits or more.

### What the signer must not do

A blind signer is, by design, a machine that applies its private key to any
number it is handed. That is a dangerous machine to own.

**Break it.** Two ways to misuse it. First, if the same RSA key is also used to
decrypt, the signing service is a decryption service: an attacker takes an old
ciphertext $c = M^e$, blinds it as $c \cdot r^e$, and the signer's answer
$M \cdot r$ gives $M$ after dividing by $r$. Second, if the signer signs raw
numbers with no hash or encoding, two honest signatures multiply into a third,
because $m_1^d \cdot m_2^d = (m_1 m_2)^d$.

```python
import random
random.seed(7)                      # random is for the demo; real systems use secrets

p, q, e = 61, 53, 17
n = p * q
d = pow(e, -1, (p - 1) * (q - 1))
sign = lambda x: pow(x, d, n)       # the signer signs whatever number arrives

# Attack 1: the same key also decrypts.  Someone once sent the bank an encrypted PIN.
pin = 2718
c = pow(pin, e, n)                  # the ciphertext, sitting in an old log
r = random.randrange(2, n)
disguised = c * pow(r, e, n) % n    # looks like any other blinded coin
answer = sign(disguised)            # the bank "signs" it ...
print("recovered PIN:", answer * pow(r, -1, n) % n)   # ... and has decrypted it for us

# Attack 2: signing raw numbers, with no hash.  Two honest signatures make a third.
m1, m2 = 12, 25
s1, s2 = sign(m1), sign(m2)
forged = s1 * s2 % n
print("signature on", m1 * m2, "that the bank never made:", forged, pow(forged, e, n) == m1 * m2)
```

Output:

```
recovered PIN: 2718
signature on 300 that the bank never made: 3153 True
```

**Fix it.** Three rules, all written into RFC 9474 (§14.5). Use a key for blind
signing and nothing else. Verify only signatures on properly encoded message
representatives (a full-domain hash or RSA-PSS encoding), so that the product
of two valid representatives is almost never a valid representative. And
accept that blindness has a cost no encoding removes: the signer cannot know
what it signs, so each signature must be worth exactly one unit of whatever it
stands for, one coin, one token, one vote, and the signer must count
sessions. The security notion for blind signatures says precisely this: after
$\ell$ signing sessions, nobody can produce $\ell + 1$ valid signatures
(**one-more unforgeability**, §14.13).

!!! note "Life story: Chaum's blind signature"
    **Born:** 1982, David Chaum, "Blind Signatures for Untraceable Payments",
    CRYPTO '82 (proceedings 1983); US patent 4,759,063, filed 1983 and granted
    1988 · **Purpose:** a signer vouches for a message it never sees, so a
    bank can issue money it cannot trace · **Helped:** DigiCash's ecash
    (1990s), anonymous voting schemes, GNU Taler, and since 2022 Apple's
    Private Access Tokens and the publicly verifiable Privacy Pass tokens,
    standardized as RFC 9474 (2023) · **Status:** current; the patent expired
    in July 2005, and the RSA version is the one in production

## 14.3 Untraceable cash and the double spender

*Level: intermediate.*

A blind signature is half of a coin. The other half is a way to stop a coin,
which is only a string of bits, from being spent twice.

### Coins from blind signatures

Chaum's design has three parties: a bank, a payer (Alice) and a payee (a shop).
The bank has one RSA key per denomination, a key for 1 credit, another for 5,
another for 20, because a blind signer cannot see what it signs and so cannot
see an amount written inside. A coin worth 1 credit is a pair

$$
\text{coin} = (\text{serial},\ s), \qquad s^e \equiv H(\text{serial}) \pmod n,
$$

where the serial is a long random number Alice chose herself. Figure 14.3 shows
the three steps.

1. **Withdrawal.** Alice picks a serial, blinds $H(\text{serial})$ and sends it
   to the bank with her account details. The bank debits her account by 1
   credit and signs blind with its 1-credit key. Alice unblinds. The bank knows
   that Alice withdrew one coin; it does not know the serial or the signature.
2. **Payment.** Alice gives the coin to the shop. The shop checks the signature
   with the bank's public 1-credit key.
3. **Deposit.** The shop sends the coin to the bank. The bank checks the
   signature and looks the serial up in its list of spent serials. If it is
   new, the bank adds it to the list and credits the shop.

At deposit the bank sees the serial and the signature for the first time.
Blindness guarantees it cannot connect them to any withdrawal, so it learns
that someone paid this shop 1 credit, and not who. Note what is anonymous and
what is not: the payer is untraceable, but the shop is identified when it
deposits. Chaum presented this asymmetry as a feature: a shop's income stays
visible for taxes, while a person's spending stays private.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Electronic cash: the bank signs a blinded coin for Alice, Alice pays the shop, the shop deposits and the bank checks the serial against its spent list" fill="currentColor" font-size="14">
<rect x="230" y="12" width="180" height="58" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="36" text-anchor="middle" font-weight="bold">Bank</text>
<text x="320" y="56" text-anchor="middle">keys per denomination</text>
<rect x="20" y="226" width="170" height="58" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="250" text-anchor="middle" font-weight="bold">Alice</text>
<text x="105" y="270" text-anchor="middle">chooses serials</text>
<rect x="450" y="226" width="170" height="58" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="250" text-anchor="middle" font-weight="bold">Shop</text>
<text x="535" y="270" text-anchor="middle">checks signatures</text>
<line x1="300" y1="72" x2="168" y2="218" stroke="currentColor" stroke-width="2"/>
<polygon points="164,224 166,212 174,218"/>
<line x1="140" y1="222" x2="271" y2="78" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<polygon points="275,72 273,84 265,78"/>
<text x="20" y="120">1. withdraw:</text>
<text x="20" y="140">blinded H(serial) up,</text>
<text x="20" y="160">blind signature down,</text>
<text x="20" y="180">account debited</text>
<line x1="196" y1="255" x2="442" y2="255" stroke="currentColor" stroke-width="2"/>
<polygon points="450,255 440,250 440,260"/>
<text x="320" y="246" text-anchor="middle">2. pay: (serial, s)</text>
<line x1="510" y1="220" x2="414" y2="64" stroke="currentColor" stroke-width="2"/>
<polygon points="410,58 419,63 410,68"/>
<text x="462" y="120">3. deposit: (serial, s)</text>
<text x="462" y="140">bank checks s and</text>
<text x="462" y="160">the spent-serial list</text>
<text x="320" y="310" text-anchor="middle" opacity="0.8">the bank sees each serial once, at deposit, and cannot tie it to a withdrawal</text>
</svg>
<figcaption>Figure 14.3. Chaum's online electronic cash. The payer is anonymous, the payee is not, and the bank's list of spent serials is what stops a copied coin.</figcaption>
</figure>

### Code it: a coin spent twice

The bank keeps a set of spent serials. A coin copied and offered again is
refused at deposit, and a made-up coin fails the signature check. The key is
still a toy, though larger than in §14.2, so that guessing a valid signature
is not too easy.

```python
import hashlib, math, random
random.seed(1988)                   # random is for the demo; real coins use secrets

p, q, e = 10007, 10009, 17          # the bank's "1 credit" key (toy size; real: 2048+ bits)
n = p * q
d = pow(e, -1, (p - 1) * (q - 1))
H = lambda serial: int.from_bytes(hashlib.sha256(serial).digest(), "big") % n

accounts = {"Alice": 3}
spent = set()                       # the bank's list of serial numbers already deposited

def withdraw(name):                 # Alice and the bank, one blind signature per coin
    serial = random.getrandbits(64).to_bytes(8, "big")   # Alice picks it; the bank never sees it
    r = random.randrange(2, n)
    while math.gcd(r, n) != 1:
        r = random.randrange(2, n)
    blinded = H(serial) * pow(r, e, n) % n
    accounts[name] -= 1             # the bank debits Alice and signs the blinded number
    s = pow(blinded, d, n) * pow(r, -1, n) % n
    return serial, s

def deposit(shop, coin):            # the shop forwards the coin at once (online checking)
    serial, s = coin
    if pow(s, e, n) != H(serial):
        return shop + ": rejected, bad signature"
    if serial in spent:
        return shop + ": rejected, serial " + serial.hex() + " already spent"
    spent.add(serial)
    return shop + ": accepted, serial " + serial.hex()

coin = withdraw("Alice")
print("Alice's balance:", accounts["Alice"], " coin:", coin[0].hex(), coin[1])
print(deposit("bakery", coin))
print(deposit("bookshop", coin))    # Alice copies the bytes and tries again
fake = (b"\x00" * 8, 12345)
print(deposit("cafe", fake))        # a made-up coin
```

Output:

```
Alice's balance: 2  coin: 8c443250cffbf3f8 9833467
bakery: accepted, serial 8c443250cffbf3f8
bookshop: rejected, serial 8c443250cffbf3f8 already spent
cafe: rejected, bad signature
```

The bookshop is protected only because it asked the bank before handing over
the book. That is **online** cash: every payment needs a live connection to the
bank. The bank, notice, refuses the second coin but cannot say who copied it,
because the coin carries no identity. Online checking prevents double
spending; it does not punish it.

### Offline cash: an identity that appears only on the second spend

In 1988 Chaum, Amos Fiat and Moni Naor asked whether cash could work offline,
with the shop accepting a coin without calling the bank, and the bank catching
the cheat later. Their answer, presented at CRYPTO '88, hides the payer's
identity inside the coin in such a way that one spend reveals nothing and two
spends reveal everything.

The idea fits in a few lines. Let $u$ be Alice's account number. When she
makes a coin, she picks random numbers $a_1, \dots, a_k$ and forms $k$ pairs

$$
(a_i,\ a_i \oplus u), \qquad i = 1, \dots, k.
$$

Each half of a pair alone is a uniformly random string; together, a pair XORs to
$u$. The coin contains commitments (hashes) to all $2k$ halves, under the
bank's blind signature. At payment, the shop sends a random $k$-bit challenge,
and for each pair Alice opens the left half if the bit is 0 and the right half
if it is 1. The shop checks the opened halves against the commitments in the
coin and later deposits the coin with the challenge and the answers.

If Alice spends the coin once, the bank sees $k$ random-looking numbers. If she
spends it twice, at two shops with two independent challenges, then at any
position where the challenges differ, one shop holds $a_i$ and the other holds
$a_i \oplus u$. Their XOR is $u$. The two challenges agree everywhere with
probability $2^{-k}$, so with $k = 40$ a double spender escapes about once in a
trillion tries.

A worked pair, from the code below, with $u = 4217$:

| | binary | decimal |
|---|---|---|
| $a_0$, opened at the bakery | `1011001111001000` | 46024 |
| $a_0 \oplus u$, opened at the bookshop | `1010001110110001` | 41905 |
| XOR | `0001000001111001` | 4217 |

How does the bank know the hidden pairs really contain $u$, if it signs blind?
By **cut and choose**: at withdrawal, Alice prepares many candidate coins, the
bank picks most of them at random and asks her to open them fully, checks that
each one contains her account number, and signs the rest blind. A cheater who
prepared some bad candidates is caught unless the bank happens to pick only
the good ones. It works, and it is expensive, which is why Stefan Brands's
1993 scheme, which replaced cut and choose with a "restrictive" blind signature
that forces the right structure, was such an improvement.

```python
import random
random.seed(42)                     # random is for the demo; real coins use secrets

u = 4217                            # Alice's account number, hidden inside her coin
k = 8                               # pairs per coin (CFN used more; real designs use 40 or more)
a = [random.getrandbits(16) for _ in range(k)]
pairs = [(a_i, a_i ^ u) for a_i in a]   # each pair XORs to u; one half alone says nothing
# In the coin, the bank's blind signature covers hashes of every half
# (checked by cut and choose at withdrawal), so Alice cannot change them later.

def spend(challenge):               # the shop sends k random bits; Alice opens one half of each pair
    return [pair[bit] for pair, bit in zip(pairs, challenge)]

c1 = [random.getrandbits(1) for _ in range(k)]
c2 = [random.getrandbits(1) for _ in range(k)]
t1, t2 = spend(c1), spend(c2)
print("bakery challenge  ", c1)
print("bookshop challenge", c2)
for i in range(k):
    if c1[i] != c2[i]:              # one shop saw a_i, the other a_i XOR u
        print("pair", i, "opened both ways:", t1[i], "XOR", t2[i], "=", t1[i] ^ t2[i])
        break
print("an honest single spend reveals only random-looking halves:", t1)
```

Output:

```
bakery challenge   [1, 0, 1, 1, 1, 1, 0, 1]
bookshop challenge [0, 0, 0, 0, 0, 0, 1, 1]
pair 0 opened both ways: 46024 XOR 41905 = 4217
an honest single spend reveals only random-looking halves: [46024, 7296, 5662, 44463, 22033, 11976, 14628, 13249]
```

The pattern of this construction, honest behavior leaves only random shares and
cheating hands over two shares of the same secret, is the two-point version of
the secret sharing in [Chapter 2](02-Secret-Sharing.md), and it reappears in
§14.7 as the key image that links two ring signatures by the same key, and in
the Schnorr nonce reuse of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md),
where two answers to one commitment give away the key.

### Break it: the perfect crime

Untraceable money has an obvious downside, and in 1992 Sebastiaan von Solms and
David Naccache spelled it out in a paper titled "On blind signatures and perfect
crimes". A kidnapper demands a ransom in the form of blind signatures: he
publishes blinded values in a newspaper and has the bank sign them. The bank
cannot refuse without risking the hostage, and once the kidnapper unblinds, the
coins are untraceable forever. Nothing is physically handed over, so there is
no drop to watch and no marked banknotes. The same holds for extortion and,
critics argued, for money laundering.

**Fix it.** The answer proposed in the 1990s was **revocable anonymity**:
Markus Stadler, Jean-Marc Piveteau and Jan Camenisch's "fair blind signatures"
(EUROCRYPT '95) let a trustee, or a quorum of trustees, trace a coin or a
withdrawal when a court orders it. Anonymity then rests on the trustees'
honesty, a trade the group signatures of §14.6 make in the same way. Whether
that trade is acceptable is a policy question, not a mathematical one, and it is
the same question central banks face today when they study digital cash: most
designs offer privacy for small payments and traceability above some threshold.

## 14.4 DigiCash: the company that came too early

*Level: beginner.*

Chaum did not leave his idea in the journals. In 1989 he founded a company in
Amsterdam, DigiCash, to build and license electronic cash. Its product was
called **ecash**, and it worked much as §14.3 describes: software on a personal
computer withdrew blindly signed coins from a bank, paid them to shops over
the internet, and the shops deposited them online, with the bank checking a
list of spent serials.

The timing seemed perfect. The web arrived in the early 1990s, and nobody yet
knew how people would pay on it. In late 1994 DigiCash ran a public trial with
"CyberBucks", a play currency that thousands of people collected and spent at
the few dozen online shops that agreed to take it. On 23 October 1995 the Mark
Twain Bank of St. Louis, Missouri, began accepting applications for real ecash
accounts in US dollars, initially limited to 10,000 accounts: the first bank
to issue Chaum's money, and the only one in the United States. Banks in other
countries licensed the technology over the following years; Deutsche Bank,
Credit Suisse and Bank Austria are among those reported to have run trials, and
Australia's Advance Bank among those that issued it.

Then it stalled. Mark Twain's ecash attracted a few thousand customers (figures
reported at the time vary, and are around 5,000), far too few to interest
merchants, and merchants were too few to interest customers. Meanwhile a much
simpler answer to paying on the web had arrived: Netscape shipped SSL in 1995,
and people typed their credit card numbers into encrypted web forms. Cards came
with credit, fraud protection, and acceptance everywhere; privacy from the bank
was not something most shoppers were willing to pay for, or even noticed they
had lost. Banks, for their part, were not eager for a payment system whose
central feature was that they could not see their customers' spending.

The company had problems of its own. Accounts by former employees and
journalists describe a founder who guarded control tightly and deals that fell
through, among them, in a frequently retold story, an offer from Microsoft to
put ecash in every copy of Windows, said to have been rejected over its price.
The amounts quoted vary from telling to telling, and the story cannot be
confirmed from public records; treat it as legend with some basis. What is
documented is the end: DigiCash's Dutch operations were wound up in September
1998, and in November 1998 the company, by then based in California and down to
a handful of staff, filed for Chapter 11 bankruptcy protection. Mark Twain Bank
had been acquired by Mercantile Bancorporation in 1997, and its ecash service
closed in 1998. DigiCash's patents and technology passed to a successor company,
eCash Technologies, which was itself sold in 2002.

The patent on blind signatures expired in July 2005. Cryptographers held a
small party.

!!! note "Life story: DigiCash ecash"
    **Born:** 1989, DigiCash BV, Amsterdam, founded by David Chaum; CyberBucks
    trial in 1994; first real money at Mark Twain Bank, St. Louis, from 23
    October 1995 · **Purpose:** untraceable payments on the internet, using
    online blind-signature cash · **Helped:** proved that blind-signature cash
    could run in practice, and trained a generation of cryptographers in
    privacy engineering; the cypherpunks who watched it fail went on to build
    digital currencies with no bank at all · **Retired:** DigiCash filed for
    bankruptcy in November 1998 · **Replaced by:** card payments over SSL in
    practice; GNU Taler (2015 onward) as the direct heir of the design

The lesson most often drawn from DigiCash is not about cryptography. The
scheme was sound; the protocols were fast enough; the privacy was real. What
failed was the business: a two-sided market that never reached the size where
either side cared, a product whose main benefit went to the user while the
cost and risk fell on banks, and a world where the competing method was "type
your card number". Bitcoin, which arrived ten years later, kept the idea of
cash as bits and dropped the bank, and with it the blind signature; its coins
are traceable by design ([Chapter 18](18-Privacy-on-Ledgers.md)). GNU Taler,
started around 2015 by Christian Grothoff and colleagues, keeps Chaum's
original shape, a bank-like exchange that blindly signs coins, payer
anonymity and payee visibility, and has run in pilot deployments; it uses blind
RSA and a newer blind Schnorr variant designed to survive the attack of §14.5.

## 14.5 Blind signatures today: RFC 9474 and Privacy Pass

*Level: intermediate.*

For twenty years after DigiCash, blind signatures were mostly an academic
subject. They came back for a reason nobody in 1982 foresaw: CAPTCHAs.

### The CAPTCHA problem

A content delivery network (CDN) such as Cloudflare sits in front of millions
of websites and decides, for each visitor, whether it looks like a person or an
attack. Visitors who share an IP address with abusers, users of Tor
([Chapter 15](15-Anonymous-Communication.md)) and of privacy VPNs in
particular, were shown CAPTCHA puzzles again and again, one per website. The
CDN did not need to know who these people were. It needed to know that they had
recently shown themselves to be human, once.

In 2017 a team from Cloudflare and the University of Waterloo (Alex Davidson,
Ian Goldberg, Nick Sullivan, George Tankersley and Filippo Valsorda) released
**Privacy Pass**, a browser extension. Solve one CAPTCHA and the extension
receives a batch of blindly signed tokens; later, when another site behind the
CDN would have shown a puzzle, the extension spends a token instead. Because
the tokens were issued blind, spending one tells the CDN only that this
browser solved a puzzle at some point, not when or where. The first version
used a blinded oblivious pseudorandom function (VOPRF, the subject of
[Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)) rather than RSA:
cheaper, but the tokens can be checked only by the issuer, who holds the key.

The IETF turned the idea into a set of standards, published in June 2024:

- RFC 9576, the architecture: who the parties are and what each may learn;
- RFC 9577, an HTTP authentication scheme, `PrivateToken`, by which a website
  asks for a token and a client presents one;
- RFC 9578, the issuance protocols: token type 1, a VOPRF (privately
  verifiable, from RFC 9497), and token type 2, a **blind RSA signature**
  (publicly verifiable, from RFC 9474).

### Four parties, split knowledge

The architecture separates four roles, shown in Figure 14.4.

- The **client** (a phone or a browser) wants to visit a website without a
  puzzle.
- The **attester** knows something about the client, for instance that it is a
  genuine device in good standing, and vouches for it. It sees the client's
  identity but not which website the token is for.
- The **issuer** signs tokens blind, for clients the attester vouches for. It
  sees neither the client's identity nor the token it signs.
- The **origin** (the website) asks for a token and checks it. It sees the
  token but not who the client is.

No single party sees both "who" and "where". The privacy argument rests on the
attester and the issuer not colluding, which is a trust assumption, and the
RFCs say so.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Privacy Pass roles: the origin challenges the client, the attester vouches for the client, the issuer signs the blinded token, and the client redeems it at the origin" fill="currentColor" font-size="14">
<rect x="235" y="20" width="170" height="54" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="43" text-anchor="middle" font-weight="bold">Client</text>
<text x="320" y="62" text-anchor="middle">phone or browser</text>
<rect x="20" y="150" width="170" height="54" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="173" text-anchor="middle" font-weight="bold">Origin</text>
<text x="105" y="192" text-anchor="middle">the website</text>
<rect x="450" y="120" width="170" height="54" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="143" text-anchor="middle" font-weight="bold">Attester</text>
<text x="535" y="162" text-anchor="middle">e.g. the device maker</text>
<rect x="450" y="240" width="170" height="54" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="535" y="263" text-anchor="middle" font-weight="bold">Issuer</text>
<text x="535" y="282" text-anchor="middle">e.g. a CDN</text>
<line x1="105" y1="146" x2="232" y2="66" stroke="currentColor" stroke-width="1.5"/>
<polygon points="238,62 231,72 226,64"/>
<text x="70" y="96">1. challenge</text>
<line x1="405" y1="62" x2="500" y2="114" stroke="currentColor" stroke-width="1.5"/>
<polygon points="506,118 494,117 499,109"/>
<text x="470" y="82">2. attest</text>
<line x1="535" y1="176" x2="535" y2="234" stroke="currentColor" stroke-width="1.5"/>
<polygon points="535,240 530,230 540,230"/>
<text x="545" y="204">3. blinded</text>
<text x="545" y="222">request</text>
<line x1="448" y1="250" x2="340" y2="80" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<polygon points="337,74 346,81 338,86"/>
<text x="255" y="170">4. blind signature</text>
<line x1="265" y1="76" x2="160" y2="146" stroke="currentColor" stroke-width="1.5"/>
<polygon points="155,150 160,139 166,147"/>
<text x="215" y="118">5. token</text>
<text x="20" y="250">Origin: sees the token,</text>
<text x="20" y="270">not the client</text>
<text x="20" y="300">Attester: sees the client, not the origin</text>
<text x="20" y="320">Issuer: sees neither, signs blind</text>
</svg>
<figcaption>Figure 14.4. The Privacy Pass roles (RFC 9576). The blind signature is what keeps the issuer from linking the token it signed to the token the origin later sees.</figcaption>
</figure>

### Apple's Private Access Tokens

In June 2022, at its developer conference, Apple announced **Private Access
Tokens**, shipped that autumn in iOS 16 and macOS Ventura. Apple is the
attester: the device proves to Apple's servers that it is genuine hardware
signed in to an Apple account in good standing. Cloudflare and Fastly were the
launch issuers. A website behind either CDN that would have shown a CAPTCHA
sends a `PrivateToken` challenge; the device obtains a type 2 token, a blind
RSA signature, and presents it. The user sees nothing at all, which is the
point.

What each party learns follows the architecture. Apple learns that a device
asked for a token from a given issuer, not for which website. The CDN learns
that some Apple-attested device wants a token, not which device. The website
learns that a valid token arrived. Apple's design adds a rate limit: the
attester can count how many tokens a device requests per origin, without
learning the origin, using an extension the IETF calls rate-limited tokens.

### RFC 9474: blind RSA done carefully

RFC 9474, "RSA Blind Signatures" (October 2023, by Frank Denis, Frederic
Jacobs and Christopher Wood, published through the IRTF's Crypto Forum Research
Group), specifies exactly the protocol of §14.2 with the safeguards of its
Break it:

- **Encoding.** The message is encoded with RSA-PSS (EMSA-PSS) before blinding,
  so the final signature is an ordinary RSASSA-PSS signature that any RSA
  library can verify. The multiplicative forgery of §14.2 needs a product of
  two valid encodings to be a valid encoding, which PSS makes negligible.
- **Message randomization.** In the "Randomized" variants the client prepends
  32 random bytes to the message before encoding. This protects against a
  signer who could otherwise influence what message gets signed.
- **A dedicated key.** The RFC says the signing key must not be used for any
  other purpose: not decryption, not ordinary signing.
- **A check before answering.** The signer verifies its own blind signature
  before returning it, so a hardware fault cannot leak the key through a wrong
  answer (the Bellcore fault attack on RSA-CRT, in
  [Cryptanalysis, Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md)).

The RFC names four variants, such as `RSABSSA-SHA384-PSS-Randomized`, which
differ in whether the PSS salt is empty and whether the message is randomized.
Privacy Pass token type 2 uses a 2048-bit key. Why RSA, forty years on, when
everything else has moved to elliptic curves? Because RSA is the one widely
deployed scheme whose blind version is simple, has two messages, and is not
broken by concurrency. The next subsection shows what goes wrong with the
obvious elliptic-curve alternative.

### Break it: a different key for every user

Blindness hides the message from the issuer. It does not stop the issuer from
cheating in what it gives each client. If the issuer quietly hands every
client its own public key, then each token verifies under exactly one key, and
the key identifies the client.

```python
import hashlib, math, random
random.seed(2024)                   # random is for the demo; real tokens use secrets

def keygen(p, q, e=17):
    return p * q, e, pow(e, -1, (p - 1) * (q - 1))

H = lambda t, n: int.from_bytes(hashlib.sha256(t).digest(), "big") % n

def issue(key, token):              # one blind-sign round trip, as in RFC 9474
    n, e, d = key
    r = random.randrange(2, n)
    while math.gcd(r, n) != 1:
        r = random.randrange(2, n)
    blinded = H(token, n) * pow(r, e, n) % n
    return pow(blinded, d, n) * pow(r, -1, n) % n

# A dishonest issuer hands each client its own key, while claiming there is one key.
keys = {"Alice": keygen(10007, 10009), "Bob": keygen(10037, 10039)}
public = {who: k[:2] for who, k in keys.items()}

tokens = []
for who in ("Alice", "Bob"):
    t = random.getrandbits(64).to_bytes(8, "big")
    tokens.append((t, issue(keys[who], t)))
random.shuffle(tokens)              # later, two anonymous redemptions arrive in random order

for t, s in tokens:
    owner = [who for who, (n, e) in public.items() if pow(s, e, n) == H(t, n)]
    print("token", t.hex(), "verifies only under the key given to", owner)
```

Output:

```
token 2e84496e7857dd86 verifies only under the key given to ['Alice']
token 4dc2a627940eee3c verifies only under the key given to ['Bob']
```

**Fix it.** Clients must agree on the issuer's key. The Privacy Pass
architecture calls this **key consistency**: the client fetches the issuer's
key through a path the issuer cannot tailor per user (a shared cache, a
directory several clients compare, a transparency log in the style of
[Chapter 3](03-Commitments.md)'s key transparency), and the number of keys an
issuer may have at once is kept small. The same attack, and the same fix,
apply to every scheme in this chapter where an issuer publishes keys: an
"anonymity set" is only as large as the number of people who received the same
key. A related leak is metadata in the token itself; a token type with an
issuer-chosen expiry or a per-batch key can split users into small groups.
Partially blind signatures (§14.13) make any such public metadata explicit.

### Blind Schnorr signatures and the ROS attack

A Schnorr signature ([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)) can be
made blind just as RSA can. The signer, with secret $x$ and public $y = g^x$,
sends a commitment $R = g^k$. The user picks random $\alpha, \beta$, computes
$R' = R \cdot g^{\alpha} y^{\beta}$ and $c' = H(R', m)$, and sends the
challenge $c = c' + \beta$. The signer answers $s = k + c x$, and the user
outputs $(R', s' = s + \alpha)$. Then
$g^{s'} = g^{k + cx + \alpha} = R' \cdot y^{c'}$, a valid Schnorr signature on
$m$ that the signer has never seen. The scheme is elegant, small, and was
believed secure for decades, with proofs that covered a bounded number of
sessions.

The trouble is concurrency. Because the user chooses the challenges, a user who
opens $\ell$ sessions at once receives $\ell$ commitments before answering any
of them, and can choose the $\ell$ challenges as a clever function of all the
commitments. In 2002 David Wagner showed that the resulting problem, finding
challenges that satisfy a system of linear equations whose coefficients are
hash outputs, called **ROS** (random inhomogeneities in an overdetermined,
solvable system of linear equations), can be solved faster than expected with
his generalized birthday algorithm, though still in subexponential time. In
2020 Fabrice Benhamouda, Tancrède Lepoint, Julian Loss, Michele Orrù and
Mariana Raykova (published at EUROCRYPT 2021) solved it in polynomial time:
with $\ell$ larger than about $\log_2 q$ concurrent sessions, around 256 for a
256-bit group, a user can produce $\ell + 1$ valid signatures from $\ell$
sessions in seconds. One more coin than was paid for: exactly what one-more
unforgeability forbids. The attack also breaks blind variants of Okamoto-Schnorr
and several multi-signature and threshold schemes with the same shape, which is
why MuSig was replaced by MuSig2 and FROST takes care over its nonces
([Chapter 4](04-Threshold-Cryptography.md)).

The responses: limit the number of open sessions (a fragile operational rule);
use **Clause Blind Schnorr** (Georg Fuchsbauer, Antoine Plouviez and Yannick
Seurin, 2020), in which the signer sends two commitments and answers only one
of them chosen at random, which defeats the ROS strategy at about twice the
cost, and which GNU Taler adopted; or use RSA, whose two-message protocol gives
the user no challenge to choose. Chapter 6 lists the attack among the ways a
sigma protocol's guarantees, made for one conversation, fail when many
conversations run together.

!!! note "Life story: Privacy Pass"
    **Born:** 2017, a browser extension by Alex Davidson, Ian Goldberg, Nick
    Sullivan, George Tankersley and Filippo Valsorda (Cloudflare and the
    University of Waterloo; paper at PETS 2018); IETF standards RFC 9576,
    RFC 9577 and RFC 9578 in June 2024 · **Purpose:** let a client prove it
    passed a check (a CAPTCHA, a device attestation) without being tracked
    from site to site · **Helped:** Apple's Private Access Tokens (2022) with
    Cloudflare and Fastly as issuers; fewer CAPTCHAs for Tor and VPN users;
    the model for Google's Private State Tokens in Chrome · **Status:**
    current; type 1 tokens use an OPRF (RFC 9497), type 2 use RSA blind
    signatures (RFC 9474)

## 14.6 Group signatures: a manager who can open

*Level: intermediate.*

A blind signature hides a message from its signer. The next three tools hide
the signer from the verifier.

In 1991 David Chaum and Eugène van Heyst proposed **group signatures**
(EUROCRYPT '91). A group of people, the staff of a company, the members of a
club, the cars of a fleet, share one public key. Any member can sign on behalf
of the group. A verifier checks the signature against the group key and learns
"a member of this group signed", nothing more; two signatures by the same
member cannot be linked. But one party, the **group manager**, holds an opening
key that reveals which member produced any given signature. Chaum and van
Heyst's motivating example was a printer in a company that accepts jobs only
from employees, without logging who printed what, unless there is a reason to
look.

### How one is built

Every practical group signature follows one recipe, and it uses only the tools
of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md):

1. **Join.** The manager (as issuer) certifies each member's key: member $i$
   ends up with a secret $x_i$ and a certificate on it.
2. **Sign.** The member encrypts its identity under the manager's opening key,
   and attaches a zero-knowledge proof, made non-interactive with Fiat-Shamir
   and bound to the message, that says: "this ciphertext encrypts the identity
   of a certified member, and I know that member's secret."
3. **Verify.** Check the proof.
4. **Open.** The manager decrypts the ciphertext.

A small version works with the numbers of Chapter 6's airlock ($p = 59$,
$q = 29$, $g = 4$). The manager's opening key is $z = 10$, with public
$Z = 4^{10} \bmod 59 = 28$. Member Brandt's public key is $y = 35$ (his secret
is 12). To sign, Brandt picks $r = 3$ and encrypts his key with ElGamal:

$$
C = (g^r,\ y \cdot Z^r) = (4^3,\ 35 \cdot 28^3) = (5,\ 35 \cdot 4) = (5,\ 22) \pmod{59}.
$$

He then proves, as one OR over all the members, that for some $i$ the pair
$(5, 22 / y_i)$ is $(g^r, Z^r)$ (a Chaum-Pedersen proof that the ciphertext
holds $y_i$) and that he knows the discrete log of that $y_i$ (a Schnorr proof),
with the challenge derived by hashing the message. The verifier learns that
the ciphertext holds some member's key and that the signer owns it. Only the
manager can decrypt: $5^{10} = 4$, $4^{-1} = 15$, and $22 \cdot 15 = 330 \equiv
35 \pmod{59}$, which is Brandt.

This toy version costs a proof branch per member, like the airlock in Chapter
6. Real schemes make the size constant by replacing "one of these keys" with
"a key carrying the manager's certificate", proved about a hidden certificate.
The first practical constant-size scheme resisting colluding members was by
Giuseppe Ateniese, Jan Camenisch, Marc Joye and Gene Tsudik (CRYPTO 2000), in an
RSA group. Dan Boneh, Xavier Boyen and Hovav Shacham's "Short group signatures"
(CRYPTO 2004) brought the size down to a few hundred bytes with pairings
([Mathematics, Chapter 13](../mathematics/13-Counting-Points-and-Pairings.md)).
Its signature on the member's certificate is the ancestor of the BBS signatures
in §14.9.

### The opening power

The manager's power to unmask is the feature that makes group signatures
acceptable to institutions, and it is the property privacy advocates distrust.
A manager who opens every signature has turned an anonymous system into a
logged one that merely looks anonymous. Mihir Bellare, Daniele Micciancio and
Bogdan Warinschi (EUROCRYPT 2003) wrote down what a group signature must
guarantee: **full anonymity** (without the opening key, nobody can tell which
member signed, even with every member's secret key) and **full traceability**
(no coalition of members can produce a signature that opens to someone
outside the coalition, or that cannot be opened at all). Later work split the
manager in two, an issuer who admits members and an opener who unmasks them,
so that neither can frame a member alone, and added proofs that an opening is
correct, so that the opener cannot accuse the wrong person.

The design choices that follow are political as much as technical: who holds
the opening key, under what rules, with what record of each opening. One
answer is to split it among several parties with threshold decryption
([Chapter 4](04-Threshold-Cryptography.md)), so that opening needs a quorum.
Another is to drop opening entirely and keep only revocation, as Intel's EPID
(§14.8) does.

!!! note "Life story: group signatures"
    **Born:** 1991, David Chaum and Eugène van Heyst, EUROCRYPT '91 ·
    **Purpose:** any member signs for the group, anonymously, while a manager
    can identify the signer when needed · **Helped:** the constant-size
    scheme of Ateniese, Camenisch, Joye and Tsudik (2000), the short pairing
    scheme of Boneh, Boyen and Shacham (2004), direct anonymous attestation
    and Intel's EPID (§14.8), and anonymous credentials (§14.9) ·
    **Status:** current as a building block; ISO/IEC 20008 standardizes
    several anonymous-signature mechanisms of this family

## 14.7 Ring signatures: how to leak a secret

*Level: intermediate.*

A group signature needs a manager and a setup. In 2001 Ronald Rivest, Adi
Shamir and Yael Tauman asked what happens if there is neither. Their paper, at
ASIACRYPT 2001, was titled "How to leak a secret", and it opened with a
scenario: a member of the cabinet wants to leak a document to a journalist. The
journalist must be convinced the leak comes from a cabinet member, and nobody,
not the journalist, not the prime minister, not the other ministers, must be
able to tell which one. The leaker cannot ask the others to join a group, and
there is no manager to trust.

A **ring signature** solves it. The signer picks any set of public keys,
including their own, the cabinet's published keys, and signs with their own
secret key and the others' public keys only. The verifier learns "one of the
holders of these keys signed". The other people in the ring took no part and
need never know they were included. There is no opening: the anonymity is
unconditional. And there is no setup: rings are formed on the spot, from keys
that already exist for other reasons.

### The ring, Abe-Ohkubo-Suzuki style

Rivest, Shamir and Tauman built theirs from RSA and a symmetric cipher. A year
later Masayuki Abe, Miyako Ohkubo and Koutarou Suzuki (ASIACRYPT 2002) gave a
version for discrete-log keys that is easier to see, because it is the OR-proof
of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) bent into a circle.

Members $0, \dots, n-1$ have public keys $y_i = g^{x_i}$. The signature is a
starting challenge $c_0$ and responses $s_0, \dots, s_{n-1}$. To verify,
walk around the ring:

$$
R_i = g^{s_i} \cdot y_i^{-c_i}, \qquad c_{i+1} = H(\text{ring}, m, R_i),
$$

and accept if, after the last member, the chain returns to the start:
$c_n = c_0$. Each step is one Schnorr verification, $g^{s} = R \cdot y^{c}$
read backwards, and each challenge is the hash of the previous step's
commitment.

How does member $k$ close a circle of hashes? By starting just after itself.
It picks a random $\alpha$ and sets $c_{k+1} = H(\text{ring}, m, g^{\alpha})$.
Then, for every other member, it picks a random response $s_i$, computes $R_i$
from it, and hashes forward to the next challenge, all the way round until it
arrives back at its own position with a challenge $c_k$ it could not choose.
That is where the secret key comes in: it sets $s_k = \alpha + c_k x_k \bmod q$,
so that $g^{s_k} y_k^{-c_k} = g^{\alpha}$, which hashes to the $c_{k+1}$ it
started with. For the other members it faked each step by picking the response
first, the simulator of Chapter 6; only at its own position did it need the
key. Figure 14.5 shows the circle.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="A ring signature of four members as a circle of hashes; the signer, member 2, closes the ring with its secret key" fill="currentColor" font-size="14">
<rect x="250" y="16" width="140" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="38" text-anchor="middle" font-weight="bold">member 0</text>
<text x="320" y="56" text-anchor="middle">y = 21, faked</text>
<rect x="470" y="140" width="150" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="162" text-anchor="middle" font-weight="bold">member 1</text>
<text x="545" y="180" text-anchor="middle">y = 35, faked</text>
<rect x="250" y="262" width="140" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="3"/>
<text x="320" y="284" text-anchor="middle" font-weight="bold">member 2</text>
<text x="320" y="302" text-anchor="middle">y = 26, signer</text>
<rect x="20" y="140" width="150" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="162" text-anchor="middle" font-weight="bold">member 3</text>
<text x="95" y="180" text-anchor="middle">y = 12, faked</text>
<line x1="390" y1="50" x2="520" y2="134" stroke="currentColor" stroke-width="1.8"/>
<polygon points="526,138 514,137 519,128"/>
<text x="470" y="80">c₁ = 24</text>
<line x1="520" y1="194" x2="396" y2="270" stroke="currentColor" stroke-width="1.8"/>
<polygon points="390,274 396,264 401,272"/>
<text x="470" y="250">c₂ = 22</text>
<line x1="250" y1="276" x2="124" y2="196" stroke="currentColor" stroke-width="1.8"/>
<polygon points="118,192 130,193 125,201"/>
<text x="110" y="250">c₃ = 23</text>
<line x1="120" y1="136" x2="244" y2="58" stroke="currentColor" stroke-width="1.8"/>
<polygon points="250,54 244,64 239,56"/>
<text x="100" y="80">c₀ = c₄ = 17</text>
<text x="320" y="148" text-anchor="middle" font-size="13">each arrow: c(next) = H(ring, m, R)</text>
<text x="320" y="168" text-anchor="middle" font-size="13">with R = g^s · y^−c for that member</text>
<text x="320" y="188" text-anchor="middle" font-size="13">signer only: s₂ = α + c₂·x₂</text>
<text x="320" y="222" text-anchor="middle" font-size="13" opacity="0.8">nothing marks where the ring was closed</text>
</svg>
<figcaption>Figure 14.5. The ring signature computed below, with the challenges as they come out of the code. The signer started at its own position, went round faking the others, and closed the ring with its key.</figcaption>
</figure>

### By hand

Use Chapter 6's group again: $p = 59$, $q = 29$, $g = 4$. Four members have
secrets 5, 12, 23, 26 and public keys $y = 21, 35, 26, 12$. Member 2 (secret
23) signs the message "the safety audit was skipped". The code below produces
$c_0 = 17$ and $s = (12, 4, 21, 11)$, and the verifier's walk goes:

| member | incoming $c_i$ | $R_i = 4^{s_i} \cdot y_i^{-c_i} \bmod 59$ | $c_{i+1} = H(\dots)$ |
|---|---|---|---|
| 0 | 17 | $4^{12} \cdot 21^{-17} = 29$ | 24 |
| 1 | 24 | $4^{4} \cdot 35^{-24} = 25$ | 22 |
| 2 | 22 | $4^{21} \cdot 26^{-22} = 46$ | 23 |
| 3 | 23 | $4^{11} \cdot 12^{-23} = 36$ | 17 |

The last challenge is 17 again, so the ring closes. Two rows by hand, using
the fact that every $y_i$ is a power of 4 (exponents work mod 29):

- Member 0: $21 = 4^5$, so $R_0 = 4^{12 - 5 \cdot 17} = 4^{-73} = 4^{14}$
  (since $-73 + 87 = 14$), and $4^{14} \bmod 59 = 29$.
- Member 2: $26 = 4^{23}$, so $R_2 = 4^{21 - 23 \cdot 22} = 4^{-485} = 4^{8}$
  (since $-485 + 493 = 8$), and $4^8 \bmod 59 = 46$.

Member 2 is where the signer worked. It picked $\alpha = 8$, so $R_2 = 4^8 = 46$
was its real commitment, and when the challenge $c_2 = 22$ came round, it set
$s_2 = 8 + 22 \cdot 23 = 514 \equiv 21 \pmod{29}$. Members 0, 1 and 3 had their
responses chosen at random. A verifier sees four rows that all look alike.

### Code it

```python
import hashlib, random
random.seed(8)                      # random is for the demo; real keys and nonces use secrets

p, q, g = 59, 29, 4                 # order-29 subgroup of Z_59*; real rings use 256-bit curves
xs = [5, 12, 23, 26]                # four members' secret keys
ring = [pow(g, x, p) for x in xs]   # their public keys: [21, 35, 26, 12]

def H(ring, msg, R):                # the challenge hash, reduced mod q
    data = repr((ring, msg, R)).encode()
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

def ring_sign(msg, ring, k, x):     # member k signs with secret x
    n = len(ring)
    c, s = [0] * n, [0] * n
    alpha = random.randrange(1, q)
    c[(k + 1) % n] = H(ring, msg, pow(g, alpha, p))       # start just after the signer
    for j in range(1, n):
        i = (k + j) % n                                    # every other member: fake it
        s[i] = random.randrange(q)
        R = pow(g, s[i], p) * pow(ring[i], -c[i], p) % p
        c[(i + 1) % n] = H(ring, msg, R)
    s[k] = (alpha + c[k] * x) % q                          # close the ring with the secret
    return c[0], s

def ring_verify(msg, ring, sig):
    c0, s = sig
    c = c0
    for i in range(len(ring)):
        R = pow(g, s[i], p) * pow(ring[i], -c, p) % p
        print(f"  member {i}: c = {c:2}, R = 4^{s[i]} * {ring[i]}^-{c} mod 59 = {R:2}", end="")
        c = H(ring, msg, R)
        print(f", next c = {c}")
    return c == c0

msg = "the safety audit was skipped"
sig = ring_sign(msg, ring, 2, xs[2])
print("ring", ring, " signature: c0 =", sig[0], " s =", sig[1])
print("valid:", ring_verify(msg, ring, sig))
print("altered message valid:", ring_verify(msg + "!", ring, sig))
```

Output:

```
ring [21, 35, 26, 12]  signature: c0 = 17  s = [12, 4, 21, 11]
  member 0: c = 17, R = 4^12 * 21^-17 mod 59 = 29, next c = 24
  member 1: c = 24, R = 4^4 * 35^-24 mod 59 = 25, next c = 22
  member 2: c = 22, R = 4^21 * 26^-22 mod 59 = 46, next c = 23
  member 3: c = 23, R = 4^11 * 12^-23 mod 59 = 36, next c = 17
valid: True
  member 0: c = 17, R = 4^12 * 21^-17 mod 59 = 29, next c = 4
  member 1: c =  4, R = 4^4 * 35^-4 mod 59 = 29, next c = 4
  member 2: c =  4, R = 4^21 * 26^-4 mod 59 = 51, next c = 0
  member 3: c =  0, R = 4^11 * 12^-0 mod 59 = 53, next c = 24
altered message valid: False
```

The altered message changes the first hash, and the chain wanders off to 24
instead of returning to 17. In this toy group a forger who guesses wins with
probability 1/29; with a 256-bit group, $2^{-256}$. The signature has $n + 1$
numbers for a ring of $n$; logarithmic-size ring signatures exist (§14.13).

**Why it is anonymous.** Given the signature, each member's row could have
been the one where the ring was closed: for any $k$, the values are exactly
what member $k$ would have produced with suitable random choices. This holds
even against someone with unlimited computing power, and even if every
member's secret key later leaks. It is the witness indistinguishability of the
OR-proof, which is no accident: an AOS ring signature *is* a Fiat-Shamir OR-proof
of knowledge of one of $n$ discrete logs, with the challenges chained instead
of summed.

### Linkable ring signatures and key images

Unconditional anonymity has a cost in some settings: nobody can tell whether two
ring signatures came from the same person. That is fatal for money, where the
same coin must not be spent twice, and for voting, where one person must not
vote twice. Joseph Liu, Victor Wei and Duncan Wong (ACISP 2004) added a tag
that links two signatures by the same key without revealing which key it is.

The tag is the **key image**. Hash the signer's public key to a group element
$h_k = H_p(y_k)$ whose discrete log nobody knows, and publish $I = h_k^{x_k}$.
The same key always gives the same image; different keys give unrelated
images. The ring proof is extended so that, at every position, the step also
checks $h_i^{s_i} \cdot I^{-c_i}$: the signer proves that $I$ uses the same
secret as one of the ring's keys, without saying which (an OR of Chaum-Pedersen
equalities, Chapter 6 §6.5). In the toy group, if hashing member 2's key gave
$h = 7 = 4^9$, its image would be $7^{23} = 4^{207} = 4^{4} = 20 \pmod{59}$,
every time it signs.

A ledger keeps a list of key images already used. A second spend of the same
coin produces the same image and is refused, the same pattern as Chaum's
spent-serial list in §14.3, but without a bank. This is the mechanism inside
Monero: the CryptoNote design (2013) used Eiichiro Fujisaki and Koutarou
Suzuki's traceable ring signatures (2007); Monero moved to multilayered linkable
ring signatures (MLSAG) with its confidential transactions in 2017, and to the
more compact CLSAG in October 2020, with rings of 16 since 2022. How well such
rings hide a spender in practice, given that real spending patterns are not
random, is a separate and sobering story, told in
[Chapter 18](18-Privacy-on-Ledgers.md).

!!! note "Life story: ring signatures"
    **Born:** 2001, Ronald Rivest, Adi Shamir and Yael Tauman, "How to Leak a
    Secret", ASIACRYPT 2001; discrete-log form by Abe, Ohkubo and Suzuki
    (2002); linkable form by Liu, Wei and Wong (2004) · **Purpose:** prove
    that one of a set of key holders signed, with no setup, no manager and no
    way to open · **Helped:** whistleblowing designs, CryptoNote and Monero
    (key images against double spending), deniable authentication in
    messaging · **Status:** current; compact and logarithmic versions are
    active research, and lattice-based versions aim at post-quantum security

## 14.8 Direct anonymous attestation: a chip that proves it is genuine

*Level: intermediate.*

A Trusted Platform Module (TPM) is a small security chip in most business
laptops and, since Windows 11 required one in 2021, in nearly every new PC. It
holds keys that never leave it and can attest to what software booted. To do
that usefully it must prove it is a genuine TPM and not a software imitation,
and the obvious way, a unique **endorsement key** burned in at the factory with
the manufacturer's certificate, turns the chip into a permanent identifier.
Every website or service the TPM attests to could recognize the same machine.

The first answer, in the TPM 1.1 era, was a **Privacy CA**: the TPM shows its
endorsement key to a trusted certification authority, which issues
throwaway "attestation identity keys" that verifiers see instead. That moves
the problem rather than solving it. The Privacy CA sees every request and can
link everything, and it must be online and trusted by everyone.

Ernie Brickell (Intel), Jan Camenisch (IBM) and Liqun Chen (HP) removed it.
Their **direct anonymous attestation** (DAA, ACM CCS 2004) works like a
group signature with no opener:

- **Join.** The TPM generates a secret $f$ that never leaves the chip. An
  issuer (the manufacturer) checks the endorsement key once and signs $f$
  blind, using a Camenisch-Lysyanskaya signature (§14.9), so the issuer never
  learns $f$.
- **Sign.** Whenever the TPM attests, it proves in zero knowledge that it
  holds an issuer's signature on some secret $f$, and signs the attestation
  data with that proof, by Fiat-Shamir.
- **Pseudonyms by choice.** The TPM also outputs $N_V = \zeta^f$, where
  $\zeta$ is derived from a "basename" the verifier picks. A verifier that
  always uses the same basename sees the same pseudonym on every visit by the
  same TPM, and can count or block it; different verifiers, or random
  basenames, give unlinkable pseudonyms. It is the key image of §14.7,
  scoped per verifier.
- **Rogue chips.** If a TPM is broken open and its $f$ published, verifiers
  test each pseudonym against the list: $N_V = \zeta^{f_\text{rogue}}$?

The work is split between the slow chip and the fast host computer, with the
secret staying inside the chip. DAA entered the TPM 1.2 specification, in an
RSA-based form that was heavy for the hardware of the time and rarely used. TPM
2.0 (2014; ISO/IEC 11889 in 2015) replaced it with ECDAA on pairing-friendly
Barreto-Naehrig curves, with the chip providing a few primitive operations. In
2013 Tolga Acar, Lan Nguyen and Greg Zaverucha pointed out that one of those
primitives could be abused as a static Diffie-Hellman oracle, which lowers the
security margin of the curve in use, a reminder that an interface designed for
one protocol is an attack surface for everything else. The FIDO Alliance
defined ECDAA attestation for security keys, and it appeared in the first
version of WebAuthn, but it saw little use and later versions dropped it.
Intel's **EPID** (Enhanced Privacy ID, Brickell and Li, 2007), a DAA-like
scheme with revocation but no opener, provided remote attestation for SGX
enclaves until Intel moved SGX attestation to an ECDSA-based service.

!!! note "Life story: direct anonymous attestation"
    **Born:** 2004, Ernie Brickell, Jan Camenisch and Liqun Chen, ACM CCS 2004;
    in the TPM 1.2 specification, then as ECDAA in TPM 2.0 (2014) ·
    **Purpose:** a hardware chip proves it is genuine without becoming a
    tracking identifier, with verifier-chosen linkability · **Helped:**
    Intel's EPID in SGX attestation, FIDO ECDAA, ISO/IEC 20008 ·
    **Status:** standardized and present in hundreds of millions of TPMs,
    but little used; most attestation today still relies on per-device
    certificates and the vendor's own privacy promises

## 14.9 Anonymous credentials: Idemix, U-Prove and BBS

*Level: intermediate.*

A blind token says one thing: "the issuer signed this". A credential says
many: name, birth date, nationality, the classes on a driving license, the
expiry date. An **anonymous credential** lets the holder show any subset of
them, or a fact computed from them ("born before 2008"), while proving that
the issuer signed the whole set, and nothing more. Chaum sketched such a
system in his 1985 paper, with credentials issued to one pseudonym and shown
under another. Making it efficient took twenty years and two schools.

### Single-show: Brands and U-Prove

Stefan Brands, a student and later collaborator of Chaum's, built credentials
from restrictive blind signatures in the 1990s and set them out in his book
*Rethinking Public Key Infrastructures and Digital Certificates* (MIT Press,
2000). In his scheme the issuer blindly signs a token that commits to the
holder's attributes; at presentation, the holder reveals some attributes and
proves in zero knowledge that the hidden ones are the ones committed. The
token's public key and signature are revealed as they are, so a token shown
twice links the two showings. The remedy is to issue tokens in batches and use
each once. Brands's company, Credentica, sold the technology as **U-Prove**;
Microsoft bought it in March 2008 and in 2010 published the specification under
its Open Specification Promise with open-source code. It was tested in pilots
and never became a mass product.

### Multi-show: Camenisch-Lysyanskaya and Idemix

Jan Camenisch and Anna Lysyanskaya took the other road (EUROCRYPT 2001): a
credential that can be shown any number of times, with no two showings
linkable. The key is a signature scheme with two special properties, which
they built first from the strong RSA assumption (2002) and then from pairings
(CRYPTO 2004). The issuer can sign attributes it does not see (committed
values), and the holder can **re-randomize** the signature into a fresh-looking
one and prove, with a sigma protocol of the Okamoto kind
([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md) §6.5), that it is a
signature on attributes of which some are revealed and the rest are hidden.
Every presentation is a new zero-knowledge proof, so nothing repeats. The same
proof can carry predicates: that a hidden birth date is before a cut-off (a
range proof, [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)), that a
hidden attribute equals one in another credential, or that the credential is
not on a revocation list (cryptographic accumulators).

IBM's Zurich laboratory implemented the system as **Idemix** (Camenisch and Els
Van Herreweghen, ACM CCS 2002). It was piloted in the EU's ABC4Trust project
(2010 to 2015) alongside U-Prove, and it lives on as the anonymous identity
option of the Hyperledger Fabric blockchain platform. DAA (§14.8) is a CL
credential with one hidden attribute, the chip's secret.

### BBS signatures

The scheme with the best chance of wide deployment descends from the group
signature of Boneh, Boyen and Shacham (2004). In **BBS**, the issuer with secret
key $x$ and public key $w = g_2^x$ signs a vector of messages
$m_1, \dots, m_L$ by computing a random $e$ and

$$
A = \left(g_1 \cdot h_1^{m_1} \cdots h_L^{m_L}\right)^{1/(x + e)},
$$

and the signature is the pair $(A, e)$: one group element and one number,
whatever $L$ is. Verification is one pairing equation,
$e(A,\ w \cdot g_2^{e}) = e(g_1 h_1^{m_1} \cdots h_L^{m_L},\ g_2)$. To present,
the holder never sends $(A, e)$. It sends a randomized version of $A$ and a
zero-knowledge proof that it knows a valid signature on messages of which it
discloses some and hides the rest. Proof size grows with the number of hidden
messages, at 32 bytes each, and two presentations of the same credential
share nothing. An earlier variant, BBS+, added a random value to the signature
for its security proof; Stefano Tessaro and Chenzhi Zhu showed in 2023 that it
can be dropped, and the standard follows them.

The standard is an IRTF Crypto Forum Research Group draft,
**draft-irtf-cfrg-bbs-signatures**, which as of November 2026 is at revision
14 (29 October 2026), still an Internet-Draft intended as an Informational
RFC, on the BLS12-381 curve. Companion drafts add blind issuance and
per-verifier pseudonyms. The W3C's verifiable-credentials work uses BBS for
its unlinkable "data integrity" proofs.

Why, then, do the wallets of §14.12 not use BBS? Three practical reasons.
Pairing-friendly curves are not among the algorithms in FIPS 186-5 or in the
secure elements of phones, which do ECDSA on P-256 and keep the key inside the
chip; a credential whose key sits in ordinary memory can be copied. Standards
bodies and regulators move slowly toward schemes still in draft. And a
pairing-based scheme falls to a quantum computer (though the anonymity of past
presentations, which is statistical, does not).

!!! note "Life story: U-Prove"
    **Born:** 1990s, Stefan Brands's restrictive blind signatures; book in
    2000; commercialized by Credentica; bought by Microsoft in March 2008;
    specification opened in 2010 · **Purpose:** minimal-disclosure tokens:
    reveal chosen attributes, prove the rest, issuer cannot trace ·
    **Helped:** EU ABC4Trust pilots; the idea of single-use batches that
    today's wallets rely on (§14.10) · **Status:** dormant; the
    specification and code remain available

!!! note "Life story: Idemix"
    **Born:** 2002, IBM Research Zurich (Camenisch and Van Herreweghen),
    on Camenisch-Lysyanskaya signatures (2001, 2002, 2004) · **Purpose:**
    multi-show anonymous credentials with selective disclosure and
    predicates · **Helped:** direct anonymous attestation in TPMs, EU
    ABC4Trust pilots, Hyperledger Fabric's anonymous identities ·
    **Status:** current in niche use; its ideas carry on in BBS

!!! note "Life story: BBS signatures"
    **Born:** 2004, the group signature of Dan Boneh, Xavier Boyen and Hovav
    Shacham; BBS+ variants in 2006 and 2016; simplified by Tessaro and Zhu
    (2023) · **Purpose:** a short multi-message signature with efficient
    zero-knowledge presentations: selective disclosure, unlinkable ·
    **Helped:** W3C verifiable credentials with unlinkable proofs; the
    proposals for an unlinkable EU wallet · **Status:** IRTF CFRG draft
    (draft-irtf-cfrg-bbs-signatures, revision 14, October 2026), not yet an
    RFC

## 14.10 Selective disclosure with salted hashes: SD-JWT

*Level: intermediate.*

There is a much simpler way to let a holder reveal some attributes and hide
others, with no zero-knowledge proofs and no new signature schemes: have the
issuer sign hashes.

For each claim the issuer makes a random **salt** and forms a small JSON array
`[salt, name, value]`, called a **disclosure**. It signs a token that contains
not the claims but the hashes of the disclosures, and gives the holder the
token and all the disclosures. To show a claim, the holder sends the token and
that claim's disclosure; the verifier hashes the disclosure and looks for the
hash in the signed list. To hide a claim, the holder simply does not send its
disclosure, and the verifier sees only an opaque hash. The salt is what keeps
the hash opaque: without it, anyone could hash every possible value and compare.

This is **SD-JWT**, Selective Disclosure for JSON Web Tokens, by Daniel Fett,
Kristina Yasuda and Brian Campbell, published as RFC 9901 in November 2025 (a
Proposed Standard). JSON Web Tokens themselves are explained in
[Protocols, Chapter 14](../protocols/14-OAuth-OpenID-Connect-and-JWT.md). A
separate IETF draft, SD-JWT VC, profiles it for verifiable credentials.

### By hand: one claim

The code below makes the disclosure for `nationality`. With the salt it drew,
the JSON array is

```
["yffPDcS07m9hqDPoW50MfQ", "nationality", "NL"]
```

Base64url-encoded, that is the disclosure string
`WyJ5ZmZQRGNTMDdtOWhxRFBvVzUwTWZRIiwgIm5hdGlvbmFsaXR5IiwgIk5MIl0`. Its SHA-256
digest, base64url-encoded, is `fdnfXRmHFDAle7n7Mlw1huHDpIrWSOIu2YEDLeH5bVE`,
and that string is one of the six entries in the signed token's `_sd` list
(sorted, so position says nothing). A verifier given the disclosure decodes
it, sees nationality NL, hashes the string, finds the digest in `_sd`, and
knows the issuer signed it. For the other five entries it has only digests.
Figure 14.6 shows the whole presentation.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="An SD-JWT presentation: the issuer-signed token holds six digests; the holder sends two disclosures; the verifier matches two digests and learns nothing about the other four" fill="currentColor" font-size="14">
<rect x="20" y="16" width="300" height="250" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="170" y="38" text-anchor="middle" font-weight="bold">issuer-signed token</text>
<text x="40" y="66">iss: registry.example</text>
<text x="40" y="88">_sd_alg: sha-256</text>
<text x="40" y="110">_sd: [</text>
<rect x="60" y="120" width="200" height="22" rx="3" fill="currentColor" opacity="0.15"/>
<text x="70" y="136">A56CXryh…  hidden</text>
<rect x="60" y="146" width="200" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="70" y="162">fdnfXRmH…  shown</text>
<rect x="60" y="172" width="200" height="22" rx="3" fill="currentColor" opacity="0.15"/>
<text x="70" y="188">… 3 more hidden</text>
<rect x="60" y="198" width="200" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="70" y="214">… 1 more shown</text>
<text x="40" y="240">]   + issuer's signature</text>
<rect x="380" y="60" width="240" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="500" y="82" text-anchor="middle" font-weight="bold">disclosures sent</text>
<text x="390" y="104">[salt, "nationality", "NL"]</text>
<text x="390" y="122">[salt, "age_over_18", true]</text>
<line x1="378" y1="104" x2="266" y2="157" stroke="currentColor" stroke-width="1.5"/>
<polygon points="260,160 268,151 271,160"/>
<text x="330" y="190" opacity="0.9">SHA-256 of each</text>
<text x="330" y="208" opacity="0.9">must be in _sd</text>
<text x="20" y="292" opacity="0.8">verifier learns 2 claims; the other 4 are salted digests it cannot invert</text>
</svg>
<figcaption>Figure 14.6. What a verifier holds after an SD-JWT presentation. Every element of the token and its signature is the same in every presentation, which is why reuse links.</figcaption>
</figure>

### Code it

An issuer makes a six-claim credential; the holder shows two claims; the
verifier checks the signature, matches the digests and prints what it learned.
JSON and hashing are from the standard library; the signature is toy RSA in
place of the ES256 a real SD-JWT would use.

```python
import base64, hashlib, json, random
random.seed(9901)                   # random is for the demo; real salts come from secrets

def b64(b):                         # base64url without padding, as JWTs use
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def unb64(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

def digest(disclosure):             # SHA-256 of the disclosure string itself
    return b64(hashlib.sha256(disclosure.encode()).digest())

# The issuer's signing key: toy RSA (real SD-JWTs use ES256 or another JOSE algorithm).
P, Q, E = 1000003, 1000033, 65537
N, D = P * Q, pow(E, -1, (P - 1) * (Q - 1))
h = lambda data: int.from_bytes(hashlib.sha256(data).digest(), "big") % N

# --- Issuer ---------------------------------------------------------------
claims = {"given_name": "Ilse", "family_name": "Marek", "birthdate": "1990-07-14",
          "address": "Ring 4, Unit 112", "nationality": "NL", "age_over_18": True}
disclosures = {}
for name, value in claims.items():
    salt = b64(random.getrandbits(128).to_bytes(16, "big"))
    disclosures[name] = b64(json.dumps([salt, name, value]).encode())
payload = {"iss": "https://registry.example", "_sd_alg": "sha-256",
           "_sd": sorted(digest(x) for x in disclosures.values())}
body = b64(b'{"alg":"toy-RSA"}') + "." + b64(json.dumps(payload).encode())
sd_jwt = body + "." + b64(pow(h(body.encode()), D, N).to_bytes(8, "big"))
print("one disclosure:", disclosures["nationality"])
print("  decoded:     ", unb64(disclosures["nationality"]).decode())
print("  its digest:  ", digest(disclosures["nationality"]))

# --- Holder: reveal two claims out of six ---------------------------------
presentation = sd_jwt + "~" + disclosures["nationality"] + "~" + disclosures["age_over_18"] + "~"

# --- Verifier -------------------------------------------------------------
parts = presentation.split("~")
hdr, pl, sig = parts[0].split(".")
assert pow(int.from_bytes(unb64(sig), "big"), E, N) == h((hdr + "." + pl).encode()), "bad signature"
seen = json.loads(unb64(pl))
learned = {}
for disc in parts[1:]:
    if disc:
        assert digest(disc) in seen["_sd"], "disclosure not signed by the issuer"
        salt, name, value = json.loads(unb64(disc))
        learned[name] = value
print("verifier checks signature: ok")
print("verifier learned:", learned)
print("still hidden:", len(seen["_sd"]) - len(learned), "digests, e.g.", seen["_sd"][0][:16] + "...")

# A holder who lies about a value cannot make a matching digest.
salt, name, value = json.loads(unb64(disclosures["age_over_18"]))
forged = b64(json.dumps([salt, "nationality", "CA"]).encode())
print("forged disclosure accepted:", digest(forged) in seen["_sd"])
```

Output:

```
one disclosure: WyJ5ZmZQRGNTMDdtOWhxRFBvVzUwTWZRIiwgIm5hdGlvbmFsaXR5IiwgIk5MIl0
  decoded:      ["yffPDcS07m9hqDPoW50MfQ", "nationality", "NL"]
  its digest:   fdnfXRmHFDAle7n7Mlw1huHDpIrWSOIu2YEDLeH5bVE
verifier checks signature: ok
verifier learned: {'nationality': 'NL', 'age_over_18': True}
still hidden: 4 digests, e.g. A56CXryhpaZHkkVK...
forged disclosure accepted: False
```

The presentation format is the real one: the issuer-signed JWT, then each
disclosure, separated by `~`. Note that the issuer put `age_over_18` in as a
claim of its own. Salted hashing cannot compute "over 18" from a hidden birth
date at presentation time; the issuer must foresee the question and include
the answer. Real deployments issue `age_over_18`, `age_over_21` and so on for
this reason.

### Break it: hashes without salt

The salt looks like a detail. Leave it out and every hidden claim with a small
set of possible values can be recovered by trying them all.

```python
import datetime, hashlib, json

def digest(name, value):            # a careless design: hash the claim with no salt
    return hashlib.sha256(json.dumps([name, value]).encode()).hexdigest()

hidden = digest("birthdate", "1990-07-14")   # what every verifier sees in the signed token

day, tries = datetime.date(1940, 1, 1), 0
while True:                         # try every birthdate from 1940 on
    tries += 1
    if digest("birthdate", day.isoformat()) == hidden:
        print("hidden birthdate is", day, "found after", tries, "guesses")
        break
    day += datetime.timedelta(days=1)

for blood in ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]:
    if digest("blood_type", blood) == digest("blood_type", "AB-"):
        print("hidden blood type is", blood)
```

Output:

```
hidden birthdate is 1990-07-14 found after 18458 guesses
hidden blood type is AB-
```

**Fix it.** A fresh random salt of at least 128 bits per claim, as RFC 9901
requires, so the guesser must also guess the salt. The RFC adds two more
defenses worth knowing. **Decoy digests**: the issuer may add fake entries to
`_sd`, so the verifier cannot even count how many claims are hidden. **Key
binding**: the token names a public key of the holder (the `cnf` claim), and
each presentation ends with a short "key binding JWT" signed by that key over
the verifier's nonce, its identity and a hash of the presentation, so that a
verifier, or an eavesdropper, cannot replay the presentation somewhere else.

### What salted hashes cannot do

Everything in Figure 14.6 is fixed at issuance: the signature, every digest,
the holder's key in `cnf`. Two verifiers who receive presentations of the same
SD-JWT can compare those bytes and know they saw the same person, even if one
saw only "over 18" and the other saw only "nationality NL". The issuer, too,
recognizes every presentation of a credential it issued, if verifiers ever
share what they received with it. SD-JWT gives **selective disclosure** but
not **unlinkability**. The workaround, inherited from U-Prove, is to issue
many copies of each credential with fresh salts and fresh holder keys, and
use each copy once. It works against colluding verifiers; against a verifier
colluding with the issuer, who logged which batch went to whom, it works only
if the issuer does not keep those logs. The mobile driver's license of
§14.12 uses the same salted-digest design in a different encoding and has the
same property.

## 14.11 Mars: the clinic, the school and the swim club

*Level: intermediate.*

Arcadia City has one clinic, one school and, under the agricultural dome, one
swimming pool run by a volunteer club. The school's charter, like schools on
Earth, requires that every child be vaccinated against measles, polio and a few
other diseases before enrolling, because an outbreak in a sealed habitat cannot
be escaped. The swim club, after a scare in the first year, asks for the same
proof of measles immunity before a child may join a lesson.

The old way was a printed record from the clinic: the child's full immunization
history, with allergies, conditions, the clinician's notes and everything else
on the page. The school filed it. The club photographed it. In a settlement of
a few thousand people, a stack of children's medical records in a school office
and on a volunteer's phone is exactly the kind of data the settlement's charter
says should not exist.

The clinic now issues the child's record as an SD-JWT-style credential into the
family's wallet: one claim per field, each with its own salt. At enrollment,
the wallet discloses to the school the child's name (the school must match the
record to the pupil) and the three vaccine claims, and nothing else. The club
needs only measles, and gets only measles, with no name at all.

That is selective disclosure, and §14.10 already showed it works. The Mars
detail is linkability. If the family's wallet showed the same copy of the
credential to both, the school and the club could compare the signature and
the digests and learn that the anonymous child at the pool is the named pupil
Tomas. So the clinic issues the credential in a batch of one-time copies, each
with fresh salts and hence a fresh signature, and the wallet never shows a
copy twice.

```python
import base64, hashlib, json, random
random.seed(14)                     # random is for the demo; real salts come from secrets

b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
dig = lambda s: b64(hashlib.sha256(s.encode()).digest())
P, Q, E = 1000003, 1000033, 65537   # the clinic's toy RSA key; real wallets use ES256
N, D = P * Q, pow(E, -1, (P - 1) * (Q - 1))
sign = lambda s: pow(int.from_bytes(hashlib.sha256(s.encode()).digest(), "big") % N, D, N)

record = {"name": "Tomas Okafor-Lind", "born": "2069-03-02", "measles": "complete",
          "polio": "complete", "dtap": "complete", "allergy": "penicillin",
          "conditions": "asthma, mild", "clinician": "Dr. R. Haas"}

def issue():                        # one copy: fresh salts, so fresh digests and a fresh signature
    disc = {k: b64(json.dumps([b64(random.getrandbits(128).to_bytes(16, "big")), k, v]).encode())
            for k, v in record.items()}
    payload = json.dumps({"iss": "Arcadia City Clinic", "_sd": sorted(dig(d) for d in disc.values())})
    return payload, sign(payload), disc

def present(copy, names):           # what the verifier receives
    payload, sig, disc = copy
    return {"payload": payload, "sig": sig, "shown": [disc[k] for k in names]}

def fingerprint(p):                 # everything in a presentation except what was disclosed on purpose
    return {p["sig"]} | set(json.loads(p["payload"])["_sd"])

batch = [issue() for _ in range(3)]               # the clinic issues three one-time copies

school = present(batch[0], ["name", "measles", "polio", "dtap"])
club_reused = present(batch[0], ["measles"])      # the family reuses copy 0 at the swim club
club_fresh = present(batch[1], ["measles"])       # ... or uses copy 1, as the wallet should

for label, club in (("same copy  ", club_reused), ("fresh copy ", club_fresh)):
    common = fingerprint(school) & fingerprint(club)
    print(label, "school and club share", len(common), "values:",
          "LINKED, the club can learn the name" if common else "nothing to link")
print("the school saw", [json.loads(base64.urlsafe_b64decode(d + "=" * (-len(d) % 4)))[1:] for d in school["shown"]])
```

Output:

```
same copy   school and club share 9 values: LINKED, the club can learn the name
fresh copy  school and club share 0 values: nothing to link
the school saw [['name', 'Tomas Okafor-Lind'], ['measles', 'complete'], ['polio', 'complete'], ['dtap', 'complete']]
```

Nine shared values (the signature and eight digests) tie the reused copy
together; the fresh copy shares none. The allergy, the asthma and the
clinician never leave the wallet.

Three more decisions complete the design. **No call home.** The school and
the club check the clinic's signature against a public key the city publishes;
they never contact the clinic, so the clinic does not learn where the child's
record is shown, and nothing needs the 4-to-24-minute link to Earth, whose
health ministry the record never touches. **Holder binding.** Each copy names
a key held in the parent's wallet, and each presentation is signed with it over
the verifier's fresh nonce, so a screenshot of the club's screen cannot be
replayed elsewhere. **Short lives.** Copies expire after a school year, and
the clinic reissues a new batch when a booster is given; that replaces a
revocation list, which would itself be a place where presentations could be
correlated.

What the design still leaks: the school learns the name it already knew, and
the clinic, if it kept a log of which batch went to which family and later saw
a presentation, could recognize it. The council's privacy rule is that the
clinic does not keep batch logs. A stronger design, with a BBS credential and
a zero-knowledge proof that "all required vaccines are complete", would make
that rule unnecessary, and would let the club check measles without the clinic
having to foresee the question. Chapter 6's airlock asked a similar one-bit
question with an OR-proof; credentials are how the city asks it at scale.

## 14.12 In the real world: licenses, wallets and age checks

*Level: intermediate.*

### Driver's licenses on phones

ISO/IEC 18013-5, published in 2021, standardizes the **mobile driver's
license** (mDL) and its data format, the **mdoc**. The design is SD-JWT's in a
different encoding, and came first: the issuing authority signs a Mobile
Security Object that lists a salted digest of every data element (name,
portrait, birth date, license classes, and ready-made answers such as
`age_over_18` and `age_over_21`), together with a public key whose private
half lives in the phone's secure hardware. In person, the phone and a reader
connect over NFC or Bluetooth after a QR code or tap; the reader asks for
specific elements, the holder approves on screen, the phone releases those
elements with their salts, and it signs the session with its device key to
prove that the license is not a copied file. A later technical
specification, ISO/IEC TS 18013-7 (2024), adds presentation to websites.

Arizona was the first US state to put licenses in Apple Wallet, in March 2022;
other states and Google Wallet followed, and the US Transportation Security
Administration accepts mobile licenses at many airport checkpoints. Because
mdoc relies on salted digests and ECDSA, it has SD-JWT's limit: presentations
of one mdoc can be linked by anyone who compares them, which is why issuers are
moving to short-lived documents issued in batches.

!!! note "Life story: the mobile driver's license (ISO/IEC 18013-5)"
    **Born:** 2021, ISO/IEC JTC 1/SC 17; online presentation in ISO/IEC TS
    18013-7 (2024) · **Purpose:** a government license on a phone that
    reveals only the elements a reader asks for and the holder approves ·
    **Helped:** state licenses in Apple and Google wallets from 2022, airport
    identity checks, the mdoc format adopted by the EU wallet · **Status:**
    current and spreading; linkable across presentations unless documents are
    issued in single-use batches

!!! note "Life story: SD-JWT"
    **Born:** drafts from 2022 by Daniel Fett, Kristina Yasuda and Brian
    Campbell in the IETF OAuth working group; RFC 9901 in November 2025 ·
    **Purpose:** selective disclosure for JSON tokens with ordinary
    signatures, by signing salted digests of each claim · **Helped:** the
    SD-JWT VC credential format, the EU digital identity wallet · **Status:**
    a Proposed Standard; selective disclosure without unlinkability, so
    wallets issue it in batches

### The European digital identity wallet

Regulation (EU) 2024/1183, known as **eIDAS 2.0**, was adopted on 11 April 2024
and entered into force on 20 May 2024. It requires every member state to offer
its citizens at least one European Digital Identity Wallet, an app holding a
national identity credential and other attestations (diplomas, licenses,
prescriptions), by 24 December 2026, and it obliges many public bodies, and
later large platforms and regulated businesses, to accept it. The regulation's
text asks for privacy by design, including selective disclosure, and says the
wallet should support privacy-preserving techniques that ensure unlinkability
where identification is not needed.

The technical rules sit in the Commission's Architecture and Reference
Framework and in implementing acts adopted from late 2024. They chose the two
formats of this section, SD-JWT VC and ISO mdoc, both signed with ECDSA. The
choice was practical: those formats were standardized, and their keys can sit
in the secure elements of today's phones. It was also controversial. In 2024 a
group of cryptographers and privacy researchers sent the Commission formal
feedback arguing that salted-hash credentials do not meet the regulation's own
unlinkability goal, since an identity attestation shown to many relying
parties becomes a tracking identifier, and urged anonymous credentials such as
BBS, or zero-knowledge proofs over the existing formats. The framework's
answer so far has been batch issuance of one-time attestations, with
zero-knowledge methods named as future work. As the deadline approaches,
reports in autumn 2026 indicate that many member states will not have a full
wallet ready in time; the exact count varies by source and is changing month
by month.

!!! note "Life story: the EU digital identity wallet"
    **Born:** 2024, Regulation (EU) 2024/1183 (eIDAS 2.0), in force 20 May
    2024; implementing acts from late 2024 · **Purpose:** one wallet for
    identity and attested attributes, accepted across the EU, under the
    holder's control · **Helped:** large-scale pilots from 2023; the largest
    deployment of selective disclosure planned anywhere · **Status:** due in
    every member state by 24 December 2026; formats SD-JWT VC and mdoc;
    unlinkability by one-time batches, with zero-knowledge proofs under
    discussion

### Age checks by law

Between 2023 and 2025 age verification moved from an argument to an
obligation in several jurisdictions. Louisiana's law requiring adult websites
to verify age took effect in January 2023, using the state's digital license
app among other methods, and about two dozen US states passed similar laws
within two years. On 27 June 2025 the US Supreme Court upheld Texas's version
(HB 1181) in *Free Speech Coalition v. Paxton*, six votes to three, holding that
requiring adults to verify their age only incidentally burdens their speech.
In the United Kingdom, the Online Safety Act's requirement of "highly
effective" age assurance for pornography services and other content harmful to
children took effect on 25 July 2025; the age-verification industry's trade
association reported about five million extra checks a day in the first weeks,
and the use of VPNs rose sharply.
Australia barred children under 16 from holding accounts on major social
media platforms from 10 December 2025. The European Commission published a
blueprint for an age-verification app in July 2025, piloted in Denmark, France,
Greece, Italy and Spain, meant to work with the EU wallet.

Most of these laws allow any method that is effective, and the cheapest
methods are the worst for privacy: uploading a photograph of an identity
document, or a face scan, to a third-party verification company. Those
uploads accumulate. In October 2025 Discord disclosed that a breach at a
customer-support contractor had exposed the government ID images of about
70,000 users who had submitted them in age-related appeals, by Discord's own
count. The cryptographic alternative is the subject of this chapter: a
credential that answers "over 18?" and nothing else, unlinkably.

### Zero-knowledge age proofs over existing licenses

The obstacle to unlinkable age proofs is that the documents people hold are
mdocs and SD-JWTs signed with ECDSA, not BBS credentials. Matteo Frigo and
abhi shelat, at Google, proposed in 2024 to keep the documents and change the
presentation: the phone proves in zero knowledge that it holds an mdoc, signed
under a known issuer key with ECDSA, whose `age_over_18` element is true and
whose device key it controls, revealing neither the signature nor any digest.
Each proof is fresh, so presentations cannot be linked, and the issuer and the
secure hardware need not change at all. The cost moves to the prover, which
must prove an ECDSA verification and SHA-256 computations inside a
zero-knowledge circuit ([Chapter 7](07-SNARKs.md) and
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md) explain the machinery);
Google reports proofs in about a second on a phone. Google announced age
assurance with zero-knowledge proofs in Google Wallet in 2025 and released the
libraries as open source, under the name Longfellow ZK, on 3 July 2025, in
connection with a partnership with Germany's savings banks (Sparkassen) for EU
age checks. Whether such proofs become the norm in the EU wallet is one of the
open questions of 2027.

## 14.13 Going deeper

*Level: expert.*

**Defining blind signatures.** Two games, set out by David Pointcheval and
Jacques Stern (1996, 2000) and Ari Juels, Michael Luby and Rafail Ostrovsky
(1997). *Blindness*: a malicious signer runs two sessions with honest users on
messages of its choice, sees the two final signatures in random order, and must
not guess the order better than chance. *One-more unforgeability*: a user who
completes $\ell$ sessions cannot output $\ell + 1$ valid signatures on distinct
messages. Blind RSA with full-domain hashing was proved one-more unforgeable in
the random-oracle model by Mihir Bellare, Chanathip Namprempre, David
Pointcheval and Michael Semanko (2003), under the *one-more RSA inversion*
assumption: given $\ell$ calls to an $e$-th root oracle, nobody can find $e$-th
roots of $\ell + 1$ random targets. It is an interactive assumption, stronger
than plain RSA, and no better attack than factoring is known. Anna Lysyanskaya
(2023) analyzed the PSS-encoded scheme of RFC 9474 itself.

**Partially blind and two-move schemes.** Masayuki Abe and Eiichiro Fujisaki
(1996), then Abe and Tatsuaki Okamoto (2000), defined *partially blind*
signatures, where signer and user agree on public information, such as an
expiry date or a denomination, that the signature binds openly while the rest
stays blind; this replaces one key per denomination and makes metadata
explicit rather than hidden in key choice. Alexandra Boldyreva's blind BLS
(2003) is two-move like RSA and secure under concurrent sessions, assuming a
one-more version of computational Diffie-Hellman in a pairing group. After the
ROS attack, the open problem of efficient blind signatures from plain
prime-order groups, secure under concurrency and without pairings, drew a
burst of work; schemes now exist, at a few times the cost of Schnorr.

**Group signatures for dynamic groups.** Bellare, Shi and Zhang (2005)
extended the static definitions of §14.6 to members who join over time, with
*non-frameability*: not even the issuer and opener together can forge a
signature that opens to an honest member.

**Smaller rings.** AOS signatures grow linearly with the ring. Jens Groth and
Markulf Kohlweiss (EUROCRYPT 2015) gave "one-out-of-many" proofs of size
$O(\log n)$, on which later ledger designs build; Chapter 8's folding ideas
give a similar reduction.

**Credentials without pairings.** If the issuer is also the verifier, as when
a service checks the credentials it issued, a MAC can replace the signature.
Melissa Chase, Sarah Meiklejohn and Greg Zaverucha (ACM CCS 2014) built such
*keyed-verification anonymous credentials* in ordinary prime-order groups,
with Chapter 6's proofs. Signal's private group system (Chase, Trevor Perrin and
Zaverucha, ACM CCS 2020) uses them so that Signal's servers can enforce group
membership without learning who is in a group. Privacy Pass type 1 tokens are
the one-attribute version of the same idea.

**Revocation.** Revoking an unlinkable credential is harder than revoking a
certificate, since the verifier cannot look up an identifier. The options are
short lifetimes, cryptographic accumulators with a proof of non-membership
(Camenisch and Lysyanskaya, 2002), per-epoch tokens, and verifier-scoped
pseudonyms, as in DAA. Each leaks something different; status lists of the
kind SD-JWT deployments use leak the least only if fetched in bulk.

**After quantum computers.** RSA, discrete-log and pairing constructions all
fall to Shor's algorithm, though the perfect or statistical anonymity of past
blind signatures, ring signatures and BBS presentations survives: there is no
secret to compute that would unmask them. Salted-hash disclosure becomes
post-quantum simply by signing with ML-DSA
([Post-quantum, Chapter 9](../post-quantum/09-ML-DSA.md)). Lattice-based
blind signatures, ring signatures and anonymous credentials exist, at sizes of
tens of kilobytes or more, and shrinking them is an active research area.

## Check yourself

??? question "1. A signer receives the blinded value 714 from §14.2. Why can it learn nothing about the message, even with unlimited computing power?"

    For every possible message representative $m$ coprime to $n$, there is
    exactly one $r$ with $m \cdot r^e \equiv 714$, namely
    $r = (714 / m)^{d}$. Every message is equally consistent with what the
    signer saw, so no amount of computation can single one out.

??? question "2. With $n = 3233$, $e = 17$, blind $m = 100$ using $r = 2$. The signer returns $s' = 2782$. What is the signature?"

    $2^{17} \bmod 3233 = 1752$, so $m' = 100 \cdot 1752 \bmod 3233 = 618$.
    The inverse of 2 mod 3233 is 1617, so
    $s = 2782 \cdot 1617 \bmod 3233 = 1391$. Check: $100^{2753} \bmod 3233$
    is also 1391.

??? question "3. Why does a blind-signature bank need a separate key for each denomination?"

    It cannot see what it signs, so it cannot read an amount inside the coin.
    If one key signed every coin, a user could pay for a 1-credit withdrawal
    and blind a message that claims 100. Tying the value to the key means the
    signature itself says the value. Partially blind signatures (§14.13) are
    the other way out.

??? question "4. In the offline cash of §14.3, each coin has $k = 20$ pairs. What is the chance that a double spender escapes, and what does the online scheme lack that this one provides?"

    The two shops' challenges must agree in all 20 bits: probability
    $2^{-20}$, about one in a million. The online scheme stops the second
    spend but cannot identify the cheater, because the coin carries no
    identity; the offline scheme lets the second spend happen and then
    reveals who did it.

??? question "5. What does a group manager have that no party in a ring signature has, and why might a company prefer a group signature to a ring signature?"

    An opening key that reveals which member signed. A company may need
    accountability, for example to identify who approved a payment if fraud
    is suspected, while keeping day-to-day signatures anonymous. A ring
    signature can never be opened, which suits a whistleblower and not an
    auditor.

??? question "6. In the ring of §14.7, member 2's secret key leaks a year later. Can anyone now prove that member 2 signed the message?"

    No. For each member $k$, there are random choices that would have made
    member $k$ close the ring and produce exactly the same $c_0$ and $s$, so
    the signature is consistent with every member. Knowing a secret key does
    not change that: AOS anonymity is unconditional. (A linkable version
    would let the key holder recompute the key image and match it.)

??? question "7. Why does a key image $I = H_p(y)^x$ link two signatures by the same key, but not reveal which key it is?"

    It depends only on the key, so the same key always gives the same $I$.
    Telling which ring member it belongs to would mean deciding whether
    $\log_{H_p(y_i)} I = \log_g y_i$ for some $i$, a decisional
    Diffie-Hellman problem, believed hard; the attached proof shows equality
    for some member without saying which.

??? question "8. A wallet shows the same SD-JWT to a bar (only age_over_18) and to an airline (name and nationality). The two compare notes. What do they learn, and what would have prevented it?"

    Both presentations carry the same issuer signature and the same digests,
    so they can match them, and the bar learns the name and nationality of
    its customer. One-time copies with fresh salts and holder keys prevent
    the matching; an anonymous credential (BBS) or a zero-knowledge proof
    over the credential prevents it without batches.

??? question "9. In Privacy Pass, which party could identify the user if it colluded with the issuer, and what attack does key consistency prevent?"

    The attester, which knows the client's identity: with the issuer's help
    it could connect the client to a token. Key consistency prevents an
    issuer from giving each client a different public key, which would make
    every token identify its client, as the Break it in §14.5 shows.

??? question "10. Why does the ROS attack break blind Schnorr but not blind RSA, and what does an attacker with about 256 concurrent sessions in a 256-bit group obtain?"

    In blind Schnorr the user chooses the challenges after seeing all the
    signer's commitments, and can pick them as a solution of a linear system
    that combines the sessions; with more than about $\log_2 q$ sessions open,
    that system is solvable in polynomial time. Blind RSA has no commitment
    and no challenge: the user sends one number and gets its $d$-th root. The
    attacker obtains one more valid signature than the sessions it completed,
    breaking one-more unforgeability: one coin or token more than it paid for.

## What you learned

- Proving you may without saying who you are has two parts: anonymity and
  unlinkability, and the second is harder because anything that repeats
  links.
- A blind RSA signature multiplies the message by $r^e$ before signing and
  divides by $r$ after; the signer learns nothing, perfectly. Its key must
  never decrypt, and messages must be hashed or PSS-encoded.
- Blind signatures make untraceable cash: online, with a spent-serial list;
  offline, with an identity that two spends reveal. DigiCash proved it
  could work and failed as a business.
- RFC 9474 standardizes blind RSA; Privacy Pass (RFC 9576 to RFC 9578) and
  Apple's Private Access Tokens use it to replace CAPTCHAs, with the
  attester, issuer and origin each seeing only part of the picture. Blind
  Schnorr falls to the ROS attack under concurrency.
- Group signatures hide a member from verifiers but not from the manager;
  ring signatures need no manager and can never be opened; key images make
  them linkable, which is how Monero stops double spends. Direct anonymous
  attestation lets a TPM prove it is genuine with verifier-chosen
  linkability.
- Anonymous credentials (Idemix, U-Prove, BBS) reveal chosen attributes and
  can be unlinkable; salted-hash formats (SD-JWT, RFC 9901; mdoc, ISO/IEC
  18013-5) give selective disclosure with ordinary signatures but link
  unless used once.
- The EU wallet, mobile licenses and age-verification laws are where these
  choices are being made now; zero-knowledge proofs over existing ECDSA
  documents are a path to unlinkability without new issuers.

**Next:** [Chapter 15](15-Anonymous-Communication.md), on hiding not what you
show but who you talk to: mixes, onion routing and Tor.

## Further reading

- David Chaum, "Blind Signatures for Untraceable Payments", *Advances in
  Cryptology: Proceedings of CRYPTO '82* (Plenum, 1983).
- David Chaum, "Security without Identification: Transaction Systems to Make
  Big Brother Obsolete", *Communications of the ACM* 28 (1985).
- David Chaum, Amos Fiat and Moni Naor, "Untraceable Electronic Cash"
  (CRYPTO '88, published 1990).
- Sebastiaan von Solms and David Naccache, "On Blind Signatures and Perfect
  Crimes", *Computers & Security* 11 (1992).
- Markus Stadler, Jean-Marc Piveteau and Jan Camenisch, "Fair Blind
  Signatures" (EUROCRYPT '95).
- David Chaum and Eugène van Heyst, "Group Signatures" (EUROCRYPT '91).
- Mihir Bellare, Daniele Micciancio and Bogdan Warinschi, "Foundations of
  Group Signatures" (EUROCRYPT 2003).
- Ronald Rivest, Adi Shamir and Yael Tauman, "How to Leak a Secret"
  (ASIACRYPT 2001).
- Masayuki Abe, Miyako Ohkubo and Koutarou Suzuki, "1-out-of-n Signatures
  from a Variety of Keys" (ASIACRYPT 2002).
- Joseph Liu, Victor Wei and Duncan Wong, "Linkable Spontaneous Anonymous
  Group Signature for Ad Hoc Groups" (ACISP 2004).
- Ernie Brickell, Jan Camenisch and Liqun Chen, "Direct Anonymous
  Attestation" (ACM CCS 2004).
- Tolga Acar, Lan Nguyen and Greg Zaverucha, "A TPM Diffie-Hellman Oracle"
  (IACR ePrint 2013/667).
- Stefan Brands, *Rethinking Public Key Infrastructures and Digital
  Certificates: Building in Privacy* (MIT Press, 2000).
- Jan Camenisch and Anna Lysyanskaya, "An Efficient System for
  Non-transferable Anonymous Credentials with Optional Anonymity Revocation"
  (EUROCRYPT 2001); "Signature Schemes and Anonymous Credentials from Bilinear
  Maps" (CRYPTO 2004).
- Jan Camenisch and Els Van Herreweghen, "Design and Implementation of the
  idemix Anonymous Credential System" (ACM CCS 2002).
- Dan Boneh, Xavier Boyen and Hovav Shacham, "Short Group Signatures"
  (CRYPTO 2004).
- Stefano Tessaro and Chenzhi Zhu, "Revisiting BBS Signatures" (EUROCRYPT
  2023).
- draft-irtf-cfrg-bbs-signatures, "The BBS Signature Scheme", revision 14
  (IRTF CFRG, October 2026).
- Mihir Bellare, Chanathip Namprempre, David Pointcheval and Michael Semanko,
  "The One-More-RSA-Inversion Problems and the Security of Chaum's Blind
  Signature Scheme", *Journal of Cryptology* 16 (2003).
- Anna Lysyanskaya, "Security Analysis of RSA-BSSA" (PKC 2023).
- Fabrice Benhamouda, Tancrède Lepoint, Julian Loss, Michele Orrù and
  Mariana Raykova, "On the (in)Security of ROS" (EUROCRYPT 2021; ePrint
  2020).
- Georg Fuchsbauer, Antoine Plouviez and Yannick Seurin, "Blind Schnorr
  Signatures and Signed ElGamal Encryption in the Algebraic Group Model"
  (EUROCRYPT 2020).
- Alex Davidson, Ian Goldberg, Nick Sullivan, George Tankersley and Filippo
  Valsorda, "Privacy Pass: Bypassing Internet Challenges Anonymously" (PETS
  2018).
- RFC 9474, RSA Blind Signatures (2023); RFC 9576, The Privacy Pass
  Architecture (2024); RFC 9577, The Privacy Pass HTTP Authentication Scheme
  (2024); RFC 9578, Privacy Pass Issuance Protocols (2024).
- RFC 9901, Selective Disclosure for JSON Web Tokens (2025).
- ISO/IEC 18013-5:2021, Personal identification: ISO-compliant driving
  licence, Part 5: Mobile driving licence (mDL) application.
- Regulation (EU) 2024/1183 of 11 April 2024 (eIDAS 2.0), amending
  Regulation (EU) No 910/2014 as regards establishing the European Digital
  Identity Framework.
- Melissa Chase, Trevor Perrin and Greg Zaverucha, "The Signal Private Group
  System and Anonymous Credentials Supporting Efficient Verifiable
  Encryption" (ACM CCS 2020).
- Matteo Frigo and abhi shelat, "Anonymous Credentials from ECDSA" (IACR
  ePrint 2024/2010); Google, "Opening up 'Zero-Knowledge Proof' technology to
  promote privacy in age assurance" (3 July 2025).
- *Free Speech Coalition, Inc. v. Paxton*, 606 U.S. ___ (2025), decided 27
  June 2025.
- Book 1's overview: [Chapter 23](../../book/23-Advanced-Protocols.md); the
  proof toolkit: [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md).
