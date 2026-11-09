# 11. One-time codes and password protocols

*Every protocol so far has authenticated machines by their keys. People do not
have keys; they have passwords, which they choose badly, reuse, and type into
whatever page asks. This chapter is about the protocols that try to make
passwords and their companions safer. The six-digit code from an authenticator
app is the first: you will compute it from its definition and match the RFCs'
test values, then build the server side that checks it, and see why a code
that can be typed can also be phished. The second family never sends the
password at all. You will run SRP, the oldest such protocol in wide use,
against RFC 5054's published values, and the oblivious PRF inside OPAQUE, its
modern successor, which keeps even the server from learning the password.*

!!! abstract "In this chapter"
    **You will learn:**

    - why passwords fail, and what "something you have" adds;
    - hash chains, HOTP and TOTP, by computing them against the RFCs;
    - how a server verifies codes, and how codes are stolen: SIM swaps,
      real-time phishing and push fatigue;
    - password-authenticated key exchange (PAKE): balanced and augmented;
    - SRP, run against RFC 5054's test values, what a stolen verifier gives
      an attacker, and how SRP-3's two-for-one guess was fixed in SRP-6a;
    - OPAQUE and its oblivious PRF, worked by hand and then run byte for byte
      against RFC 9497 and RFC 9807; and CPace;
    - why a counter works between Earth and Mars and a clock does not, and how
      the city keeps its clocks.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (offline and
    online guessing); HMAC and password hashing from Chapters
    [10](../../book/10-Message-Authentication.md) and
    [11](../../book/11-Passwords-and-Key-Derivation.md) of book 1, and
    Diffie-Hellman from [Chapter 12](../../book/12-Diffie-Hellman.md).

    **Levels:** §11.1 to §11.3 are for beginners, §11.4 to §11.9 and §11.11
    to §11.12 are intermediate, §11.10 and §11.13 are expert.

## 11.1 The problem

*Level: beginner.*

A password has three weaknesses, and protocols can fix only some of them.

- **It is guessable.** People choose short, common passwords. A server that
  allows unlimited attempts can be guessed online; a stolen database of
  password hashes can be guessed offline, at billions of attempts per second
  for fast hashes.
- **It is reusable.** The same password opens many sites, so one breached site
  opens the rest ("credential stuffing").
- **It is transferable.** Whoever learns it, by phishing, by malware, or by
  reading it from a server that should not have kept it, can use it as easily
  as its owner.

Two lines of work answer them. The first adds a **second factor** that changes
every time, so a stolen value is worth little: the one-time code. The second
changes the **protocol**, so that the password is never sent, cannot be
checked offline from a transcript, and, in the best versions, is never known to
the server at all. Neither fixes the first weakness completely; a person who
types the code or the password into an attacker's page has still handed it
over. Only the origin-bound keys of Chapter 13 end that.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of one-time codes and password protocols from Lamport's hash chain in 1981 to OPAQUE as an RFC in 2025" fill="currentColor" font-size="13.5">
<line x1="92" y1="8" x2="92" y2="392" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1981</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Lamport's hash chain of one-time passwords</text>
<text x="78" y="57" text-anchor="end" font-weight="bold">1986</text>
<circle cx="92" cy="52" r="3.5"/>
<text x="108" y="57">SecurID time-based tokens</text>
<text x="78" y="87" text-anchor="end" font-weight="bold">1992</text>
<circle cx="92" cy="82" r="3.5"/>
<text x="108" y="87">EKE: the first password-authenticated key exchange</text>
<text x="78" y="117" text-anchor="end" font-weight="bold">1998</text>
<circle cx="92" cy="112" r="3.5"/>
<text x="108" y="117">SRP: the server stores a verifier, not the password</text>
<text x="78" y="147" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="142" r="3.5"/>
<text x="108" y="147">HOTP (RFC 4226)</text>
<text x="78" y="177" text-anchor="end" font-weight="bold">2011</text>
<circle cx="92" cy="172" r="3.5"/>
<text x="108" y="177">TOTP (RFC 6238); RSA's token seeds stolen</text>
<text x="78" y="207" text-anchor="end" font-weight="bold" class="acc-fill">2017</text>
<circle cx="92" cy="202" r="4.5" class="acc-fill"/>
<text x="108" y="207" class="acc-fill">SS7 interception empties bank accounts; Evilginx</text>
<text x="78" y="237" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="232" r="3.5"/>
<text x="108" y="237">OPAQUE proposed</text>
<text x="78" y="267" text-anchor="end" font-weight="bold" class="acc-fill">2019</text>
<circle cx="92" cy="262" r="4.5" class="acc-fill"/>
<text x="108" y="267" class="acc-fill">SIM swaps take over high-profile accounts</text>
<text x="78" y="297" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="292" r="3.5"/>
<text x="108" y="297">CFRG picks CPace and OPAQUE</text>
<text x="78" y="327" text-anchor="end" font-weight="bold" class="acc-fill">2022</text>
<circle cx="92" cy="322" r="4.5" class="acc-fill"/>
<text x="108" y="327" class="acc-fill">push fatigue breaches; mass OTP phishing</text>
<text x="78" y="357" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="352" r="3.5"/>
<text x="108" y="357">number matching enforced; OPRF standard (RFC 9497)</text>
<text x="78" y="387" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="382" r="3.5"/>
<text x="108" y="387">OPAQUE published (RFC 9807)</text>
</svg>
<figcaption>Figure 11.1. Two lines of work: codes that change every time, and protocols that never send the password.</figcaption>
</figure>

## 11.2 From hash chains to HOTP

*Level: beginner.*

The first one-time password scheme is Leslie Lamport's, from 1981. Pick a
secret $w$ and hash it $n$ times: $H^n(w)$. Give the server $H^n(w)$. To log
in the first time, send $H^{n-1}(w)$; the server hashes it once, compares with
what it stores, and replaces its stored value with the one you sent. Next time
you send $H^{n-2}(w)$, and so on. An eavesdropper who sees a password cannot
compute the next one, because that would mean inverting the hash. The server
stores nothing secret. Bellcore's **S/KEY** (Neil Haller, 1994) turned this
into a product, with codes printed on paper as short English words. Its
weakness was a **small $n$ attack**: an attacker who could pose as the server
asked for an earlier position in the chain and received a value from which all
later ones could be computed.

The whole scheme fits in a few lines. The program builds a chain of 100
values, logs in three times, shows that a replayed value is refused, and then
plays the small $n$ attack: a fake server that asks for position 50 can hash
forward to every later position, including the one the real server will ask
for next.

```python
# Lamport's hash chain (1981), the idea behind S/KEY: the server stores only the
# last value it accepted, and each login reveals the value one step earlier.
import hashlib
H = lambda x: hashlib.sha256(x).digest()[:8]       # 64 bits, as S/KEY used

def chain(seed, n):
    values = [seed]
    for _ in range(n):
        values.append(H(values[-1]))
    return values                                 # values[i] = H^i(seed)

seed, n = b"jim's secret seed", 100
c = chain(seed, n)
stored = c[n]                                      # the server keeps H^100(w)
for i in (99, 98, 97):
    sent = c[i]
    ok = H(sent) == stored
    print(f"login with H^{i}: {sent.hex()}  accepted: {ok}")
    if ok: stored = sent
print("replaying H^98:", H(c[98]) == stored)

# The small-n attack: a fake server asks for position 50 instead of 96.
stolen = c[50]
forged = stolen
for _ in range(96 - 50): forged = H(forged)
print("attacker builds H^96 from H^50:", forged == c[96], "-> next login accepted:", H(forged) == stored)
```

```text
login with H^99: c9b45fa4af3deb09  accepted: True
login with H^98: a886b9ff30562c7f  accepted: True
login with H^97: 82b24db21c3f20ad  accepted: True
replaying H^98: False
attacker builds H^96 from H^50: True -> next login accepted: True
```

The chain also runs out: after $n$ logins the user must pick a new seed and
register again, which is one reason the idea gave way to HOTP. Its good
property, a server that stores nothing secret, came back decades later in the
protocols of sections 11.7 and 11.8 and in passkeys (chapter 13).

**HOTP** (HMAC-based one-time password, RFC 4226, 2005) is simpler and became
the standard. Device and server share a secret key $K$ and a counter $C$:

$$\begin{aligned}T &= \mathrm{HMAC\text{-}SHA1}(K, C),\\ \mathrm{HOTP}(K, C) &= \mathrm{Truncate}(T) \bmod 10^6.\end{aligned}$$

**Dynamic truncation** turns the 20-byte HMAC into a number a person can type:
the low four bits of the last byte choose an offset, the four bytes at that
offset are read as a 31-bit integer (the top bit is cleared so it is the same
signed or unsigned), and the last six decimal digits are kept. Each time the
user presses the button, the device increments $C$ and shows a new code. The
server keeps its own copy of $C$ and accepts a code that matches one of the
next few counter values, in case the user pressed the button without logging
in.

**TOTP** (time-based, RFC 6238, 2011) replaces the counter with the clock:
$C = \lfloor t / 30 \rfloor$, the number of 30-second steps since 1970. No
button, no counter to keep in sync, only clocks that agree to within a step.
That is the code in every authenticator app.

### A worked example by hand

RFC 4226 section 5.4 walks through one truncation. Suppose the HMAC came out as
these 20 bytes:

```
byte:  00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19
value: 1f 86 98 69 0e 02 ca 16 61 85 50 ef 7f 19 da 8e 94 5b 55 5a
```

1. The last byte is `5a`. Its low four bits are `a`, so the offset is 10.
2. Bytes 10 to 13 are `50 ef 7f 19`. The first byte's top bit is already 0
   (`50` is below `80`), so clearing it changes nothing.
3. As a number, `0x50ef7f19` is 1,357,872,921.
4. Modulo $10^6$ that is **872921**, the six-digit code.

Two details matter. The offset can be at most 15, and $15 + 3 = 18$, so the
four bytes never run past the end of the 20-byte tag. And clearing the top bit
avoids a disagreement between languages that read four bytes as a signed number
and languages that read them as unsigned. The cost is a small bias: $2^{31}$ is
not a multiple of $10^6$, so the codes 000000 to 483647 come up very slightly
more often than the rest, about one part in 2,147. That bias is far too small
to help a guesser.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="HOTP dynamic truncation: the 20-byte HMAC, the low nibble of the last byte picks an offset, four bytes from there become a 31-bit number, the last six digits are the code" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">HMAC-SHA1(K, counter): 20 bytes</text>
<g>
<rect x="20" y="34" width="600" height="36" class="soft" stroke="currentColor"/>
<line x1="50" y1="34" x2="50" y2="70" stroke="currentColor" opacity="0.4"/><line x1="80" y1="34" x2="80" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="110" y1="34" x2="110" y2="70" stroke="currentColor" opacity="0.4"/><line x1="140" y1="34" x2="140" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="170" y1="34" x2="170" y2="70" stroke="currentColor" opacity="0.4"/><line x1="200" y1="34" x2="200" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="230" y1="34" x2="230" y2="70" stroke="currentColor" opacity="0.4"/><line x1="260" y1="34" x2="260" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="290" y1="34" x2="290" y2="70" stroke="currentColor" opacity="0.4"/><line x1="320" y1="34" x2="320" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="350" y1="34" x2="350" y2="70" stroke="currentColor" opacity="0.4"/><line x1="380" y1="34" x2="380" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="410" y1="34" x2="410" y2="70" stroke="currentColor" opacity="0.4"/><line x1="440" y1="34" x2="440" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="470" y1="34" x2="470" y2="70" stroke="currentColor" opacity="0.4"/><line x1="500" y1="34" x2="500" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="530" y1="34" x2="530" y2="70" stroke="currentColor" opacity="0.4"/><line x1="560" y1="34" x2="560" y2="70" stroke="currentColor" opacity="0.4"/>
<line x1="590" y1="34" x2="590" y2="70" stroke="currentColor" opacity="0.4"/>
</g>
<rect x="320" y="34" width="120" height="36" class="soft-acc" stroke="currentColor"/>
<rect x="590" y="34" width="30" height="36" class="acc-fill" fill-opacity="0.35" stroke="currentColor"/>
<text x="605" y="95" text-anchor="middle" font-size="12">last byte:</text>
<text x="605" y="111" text-anchor="middle" font-size="12">low 4 bits</text>
<text x="605" y="127" text-anchor="middle" font-size="12">= offset 10</text>
<path d="M600 135 C 560 170, 470 160, 400 78" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="380" y="24" text-anchor="middle" font-size="12" class="acc-fill">4 bytes at the offset</text>
<rect x="120" y="170" width="200" height="34" rx="5" class="soft" stroke="currentColor"/>
<text x="220" y="192" text-anchor="middle">31-bit number</text>
<line x1="320" y1="187" x2="390" y2="187" stroke="currentColor"/><polygon points="390,187 380,182 380,192"/>
<rect x="390" y="170" width="130" height="34" rx="5" class="soft-acc" stroke="currentColor"/>
<text x="455" y="192" text-anchor="middle" font-weight="bold">mod 10⁶</text>
<text x="320" y="236" text-anchor="middle" font-size="12.5">the code is the last six decimal digits: 755224 for the RFC's key and counter 0</text>
</svg>
<figcaption>Figure 11.2. Dynamic truncation. Which four bytes are used depends on the HMAC itself, so the attacker cannot predict which part of the tag the code reveals.</figcaption>
</figure>

## 11.3 Code it: HOTP and TOTP

*Level: beginner.*

Both RFCs publish test values for the key `12345678901234567890`. The program
computes HOTP for counters 0 to 9 and eight-digit TOTP for the six times that
RFC 6238 lists, from 1970 to the year 2603.

```python
# HOTP (RFC 4226) and TOTP (RFC 6238), checked against the RFCs' test values.
import hashlib, hmac, struct

def hotp(secret, counter, digits=6, alg=hashlib.sha1):
    mac = hmac.new(secret, struct.pack(">Q", counter), alg).digest()
    offset = mac[-1] & 0x0F                          # dynamic truncation
    code = int.from_bytes(mac[offset:offset + 4], "big") & 0x7FFFFFFF
    return str(code % 10 ** digits).zfill(digits)

def totp(secret, unix_time, step=30, digits=6, alg=hashlib.sha1):
    return hotp(secret, unix_time // step, digits, alg)  # the counter is the time slot

secret = b"12345678901234567890"                     # the RFCs' test key
print("HOTP counters 0-9:", [hotp(secret, c) for c in range(10)])
print("matches RFC 4226 Appendix D:", [hotp(secret, c) for c in range(10)] ==
      ["755224", "287082", "359152", "969429", "338314",
       "254676", "287922", "162583", "399871", "520489"])
for t, want in ((59, "94287082"), (1111111109, "07081804"), (1111111111, "14050471"),
                (1234567890, "89005924"), (2000000000, "69279037"), (20000000000, "65353130")):
    got = totp(secret, t, digits=8)
    print(f"TOTP at {t:>11}: {got}  RFC 6238: {want}  {'ok' if got == want else 'MISMATCH'}")
```

```text
HOTP counters 0-9: ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489']
matches RFC 4226 Appendix D: True
TOTP at          59: 94287082  RFC 6238: 94287082  ok
TOTP at  1111111109: 07081804  RFC 6238: 07081804  ok
TOTP at  1111111111: 14050471  RFC 6238: 14050471  ok
TOTP at  1234567890: 89005924  RFC 6238: 89005924  ok
TOTP at  2000000000: 69279037  RFC 6238: 69279037  ok
TOTP at 20000000000: 65353130  RFC 6238: 65353130  ok
```

Everything matches. Notice what was *not* needed: no clock synchronization
protocol, no network, no public-key cryptography. A code is a MAC of a counter,
cut short enough to type. That simplicity is why one-time codes spread to
almost every online service, and it also sets their limits, which the next two
sections examine.

Why SHA-1, when SHA-1 is broken? HOTP needs HMAC to behave as a pseudorandom
function under a secret key, not to resist collisions, and no known attack on
SHA-1 carries over to HMAC-SHA-1 used that way. RFC 6238 allows SHA-256 and
SHA-512, but most apps and servers still use SHA-1, and it is not the weak
point: a six-digit guess wins one time in a million whatever the hash.

## 11.4 The server's side

*Level: intermediate.*

Enrollment is a QR code. The server draws a random secret of 160 bits, stores it
with the account, and shows it once as a URI in the `otpauth://` format that
Google Authenticator introduced in 2010 and every app adopted. Verification
must deal with clock drift, with replay, and with guessing.

```python
# A TOTP server's side: the QR-code URI, a window for clock drift, refusing a
# code twice, and how rate limiting bounds guessing. Continue from above.
import base64, urllib.parse

key = hashlib.sha256(b"arcadia demo enrolment").digest()[:20]     # 160-bit secret
b32 = base64.b32encode(key).decode().rstrip("=")
uri = "otpauth://totp/" + urllib.parse.quote("Arcadia City:jim") + "?" + urllib.parse.urlencode(
    {"secret": b32, "issuer": "Arcadia City", "algorithm": "SHA1", "digits": 6, "period": 30})
print("QR code holds:", uri)

class Verifier:
    def __init__(self, key): self.key, self.last_slot = key, -1
    def check(self, code, now, window=1):
        slot = now // 30
        for s in range(slot - window, slot + window + 1):          # one slot either side
            if hmac.compare_digest(hotp(self.key, s), code):
                if s <= self.last_slot:
                    return "refused: code already used"
                self.last_slot = s
                return "accepted (slot %+d)" % (s - slot)
        return "refused: wrong code"

v, now = Verifier(key), 1_794_200_400
phone_code = totp(key, now - 25)                  # phone clock 25 seconds slow
print("phone shows", phone_code, "->", v.check(phone_code, now))
print("same code again    ->", v.check(phone_code, now + 5))
print("a guess            ->", v.check("123456", now + 10))

# Guessing: each try hits one of at most 3 valid codes out of a million.
for tries in (10, 1000, 100000):
    print(f"{tries:>6} guesses: chance of success about {1 - (1 - 3e-6) ** tries:.4%}")
```

```text
QR code holds: otpauth://totp/Arcadia%20City%3Ajim?secret=AEVQ45JS3QZZXETMPHK5SYLDLSJLBQQP&issuer=Arcadia+City&algorithm=SHA1&digits=6&period=30
phone shows 006529 -> accepted (slot -1)
same code again    -> refused: code already used
a guess            -> refused: wrong code
    10 guesses: chance of success about 0.0030%
  1000 guesses: chance of success about 0.2996%
100000 guesses: chance of success about 25.9182%
```

Three rules are visible:

- **A window.** Phones' clocks drift and people type slowly, so servers accept
  the previous and next step as well as the current one. RFC 6238 recommends
  at most one step back.
- **Once only.** A code that has been accepted must be refused for the rest of
  its window, or an attacker who sees it over a shoulder, or on a recorded
  screen, can use it within the next minute.
- **Few guesses.** With three valid codes in a million, guessing succeeds with
  probability about $3 \times 10^{-6}$ per try. A hundred thousand tries would
  give an attacker one chance in four, so servers must limit failures across
  sessions, not per session; NIST's guidelines (SP 800-63B-4, 2025) allow at
  most 100 consecutive failures before the account must be locked or slowed.

### The window, drawn

The window is easier to reason about with real numbers, and RFC 6238's own
test times are well chosen for it. Take the server's clock at
$t = 1{,}111{,}111{,}111$ seconds (18 March 2005, 01:58:31 UTC).

1. The current slot is $\lfloor 1{,}111{,}111{,}111 / 30 \rfloor$. Since
   $30 \times 37{,}037{,}037 = 1{,}111{,}111{,}110$, the slot is
   **37,037,037**, and it began one second ago.
2. With a window of one slot either side, the server computes codes for
   slots 37,037,036, 37,037,037 and 37,037,038: three HMACs, three six-digit
   values.
3. A phone whose clock is 25 seconds slow reads $1{,}111{,}111{,}086$. Its slot
   is $\lfloor 1{,}111{,}111{,}086 / 30 \rfloor = 37{,}037{,}036$, because
   $30 \times 37{,}037{,}036 = 1{,}111{,}111{,}080$. That is the previous slot,
   so the code is accepted as "slot $-1$", exactly what the program above
   printed for its own phone.
4. RFC 6238 lists $1{,}111{,}111{,}109$ and $1{,}111{,}111{,}111$ as separate
   test times for this reason: two seconds apart, they straddle the boundary at
   $1{,}111{,}111{,}110$ and give different codes (07081804 and 14050471 in
   the program's output).

So a code is accepted during three slots, 90 seconds of server time, and a
phone up to about 30 seconds off in either direction still works. RFC 6238
(section 6) suggests that the server record the drift it sees for each token
at each successful login and shift that token's window to match, which is how
hardware tokens with cheap crystals stay usable for years.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Five 30-second TOTP slots; the server accepts the current slot and one either side; a phone 25 seconds slow lands in the previous slot and is accepted" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">TOTP slots: C = floor(t / 30)</text>
<path d="M152 44v12M152 50H488M488 44v12" fill="none" stroke="currentColor" stroke-width="1.5"/>
<g stroke="currentColor">
<rect x="40" y="60" width="112" height="50" fill="none"/>
<rect x="152" y="60" width="112" height="50" fill-opacity=".12"/>
<rect x="264" y="60" width="112" height="50" fill-opacity=".28"/>
<rect x="376" y="60" width="112" height="50" fill-opacity=".12"/>
<rect x="488" y="60" width="112" height="50" fill="none"/>
</g>
<g text-anchor="middle">
<text x="320" y="42">accepted: the current slot and one either side</text>
<text x="96" y="90">…035</text><text x="208" y="90">…036</text>
<text x="320" y="90" font-weight="bold">…037 now</text>
<text x="432" y="90">…038</text><text x="544" y="90">…039</text>
<g font-size="11.5"><text x="152" y="128">…080</text><text x="264" y="128">…110</text>
<text x="376" y="128">…140</text><text x="488" y="128">…170</text></g>
<text x="268" y="168">server clock 1111111111</text>
<text x="175" y="204">phone, 25 s slow: 1111111086</text>
<text x="175" y="220" font-size="12" fill-opacity=".7">slot −1, accepted</text>
<text x="320" y="244" font-size="12.5">a code sent one way from Mars arrives 6 to 44 slots late</text>
</g>
<text x="40" y="128" font-size="11.5" fill-opacity=".7">t = 1111111…</text>
<path d="M268 140l-5 12h10zM175 176l-5 12h10z"/>
</svg>
<figcaption>Figure 11.3. The TOTP window around RFC 6238's test time 1111111111. Slot numbers are shortened to their last three digits (37037035 to 37037039) and times to theirs.</figcaption>
</figure>

**The secret is the weak point.** The server cannot hash the shared key the way
it hashes passwords, because it needs the key itself to compute codes. A
leaked table of secrets gives an attacker every user's codes forever. The
standard advice is to encrypt the table under a key kept in a hardware module
or a separate key service, and to decrypt one secret at a time when a code is
checked; how to keep such keys apart from the data they protect is the subject
of the Engineering book's chapter on
[hardware for keys](../engineering/11-Hardware-for-Keys.md).

The most famous leak was at a token vendor. RSA Security's SecurID tokens,
sold since 1986, compute their codes from the time and a secret **seed**
installed at the factory, and RSA kept a copy of every customer's seeds. In
early March 2011 a few RSA employees received an email titled "2011
Recruitment Plan" whose spreadsheet carried an unknown Adobe Flash exploit
(CVE-2011-0609). One employee opened it, and the attackers installed a variant
of the Poison Ivy remote-access tool and worked through the network. On 17
March RSA announced that information about SecurID had been taken; in late May
the defense contractor Lockheed Martin stopped an intrusion that used it; in
June RSA offered replacement tokens, and its parent EMC took a charge of
\$66.3 million in the second quarter of 2011. Some 40 million SecurID tokens
were in use. In 2021, when ten-year confidentiality agreements expired, former
staff told Wired that the intruders had reached the server RSA called the
"seed warehouse" and copied data from it, though some former executives say it
was never proven that a complete, usable list of seeds got out.

!!! note "Life story: the SecurID seed theft"
    **Born:** March 2011, from one phishing email and a Flash zero-day.
    **Purpose:** to steal token seeds as a step toward RSA's customers.
    **Helped:** an intrusion attempt at Lockheed Martin in May 2011; Wired later
    reported that the contractors Northrop Grumman and L-3 were targeted too.
    **Status:** closed by replacing tokens. Its lesson stands: a vendor that
    keeps its customers' secrets is one place to steal them all.

A smaller version happened in 2023: Google Authenticator had begun syncing
secrets to users' Google accounts that April, and in August an attacker who
took over an employee's Google account at the software company Retool obtained
that employee's codes along with it.

## 11.5 How codes are stolen

*Level: intermediate.*

A one-time code defeats an attacker who has only the password. It does not
defeat an attacker who can get the code too, and there are three common ways.

**SMS.** Many services send the code by text message rather than computing it
in an app. A text message is not cryptographically bound to the phone; it is
delivered to whatever SIM card the mobile operator says holds the number. In a
**SIM swap**, the attacker persuades or bribes an operator's employee to move
the victim's number to a new SIM, then receives every code. In August 2019 the
phone number of Twitter's own chief executive, Jack Dorsey, was moved this way,
and the attackers posted to his account through Twitter's tweet-by-text
service.
Messages can also be redirected inside the operators' signaling network, SS7,
which trusts any operator connected to it; in 2017 criminals used SS7 access to
intercept banking codes and empty accounts in Germany. NIST's guidelines have
classed SMS and voice codes as a "restricted" authenticator since 2017.

**Real-time phishing.** An authenticator app's code is safe from SIM swaps but
not from the person holding the phone. A phishing page that looks like the
real login asks for the password and then the code, and passes both to the
real site within the 30 seconds the code is valid. Toolkits such as Evilginx
(2017) automate this as a **reverse proxy**: the victim talks to the attacker's
server, which relays every page to and from the real site and keeps the
session cookie at the end. In 2022 a single campaign used such pages to collect
codes from thousands of employees of more than a hundred companies, starting
with the messaging provider Twilio. A typed code is not **phishing-resistant**,
and NIST no longer counts one as such.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A real-time phishing proxy: the victim enters password and code into a fake page; the proxy forwards them to the real site within seconds and keeps the session cookie" fill="currentColor" font-size="13.5">
<rect x="20" y="40" width="130" height="70" rx="6" class="soft" stroke="currentColor"/>
<text x="85" y="70" text-anchor="middle">victim</text>
<text x="85" y="90" text-anchor="middle" font-size="12">types into</text>
<text x="85" y="104" text-anchor="middle" font-size="12">login.arcadia-city.co</text>
<rect x="255" y="40" width="130" height="70" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="320" y="70" text-anchor="middle">attacker's proxy</text>
<text x="320" y="90" text-anchor="middle" font-size="12">relays every page</text>
<rect x="490" y="40" width="130" height="70" rx="6" class="soft" stroke="currentColor"/>
<text x="555" y="70" text-anchor="middle">real site</text>
<text x="555" y="90" text-anchor="middle" font-size="12">login.arcadia.mars</text>
<line x1="150" y1="60" x2="255" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="255,60 243,55 243,65"/>
<line x1="385" y1="60" x2="490" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="490,60 478,55 478,65"/>
<text x="202" y="52" text-anchor="middle" font-size="12">password, code</text>
<text x="437" y="52" text-anchor="middle" font-size="12">same, at once</text>
<line x1="490" y1="95" x2="385" y2="95" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="385,95 397,90 397,100" class="acc-fill"/>
<text x="437" y="125" text-anchor="middle" font-size="12" class="acc-fill">session cookie</text>
<text x="320" y="125" text-anchor="middle" font-size="12" class="acc-fill">kept by the attacker</text>
<rect x="20" y="170" width="600" height="96" rx="6" class="soft" stroke="currentColor"/>
<text x="40" y="194" font-weight="bold">what fails, and what would stop it</text>
<text x="40" y="218">the code is valid for whoever presents it within 30 seconds</text>
<text x="40" y="240">the user cannot reliably tell arcadia-city.co from arcadia.mars</text>
<text x="40" y="262" class="acc-fill">a key that signs only for the real origin (Chapter 13) cannot be relayed</text>
</svg>
<figcaption>Figure 11.4. Real-time phishing. The code does its job, proving the user has the phone; it just proves it to the attacker.</figcaption>
</figure>

**Push fatigue.** Some services skip the code and send a push notification:
"Is this you signing in? Approve / Deny". An attacker with the password can
trigger dozens of these, at night, until the user taps Approve to make them
stop. In September 2022 an attacker got into Uber's internal systems this way:
with a contractor's password, probably bought from a criminal market, the
attacker sent approval request after approval request and then messaged the
contractor on WhatsApp, posing as Uber's IT staff, to say the prompts would stop
once one was accepted. The fix is **number matching**: the login page shows a
two-digit number and the user must type it into the app, which proves the user
is looking at the login they are approving. Microsoft made number matching
mandatory in its Authenticator app in May 2023.

### SIM swaps and push fatigue, case by case

The record shows why the defenses moved from "add a code" to "bind the login
to something that cannot be talked out of a person".

- **January 2018.** The investor Michael Terpin lost cryptocurrency then worth
  about \$24 million after his number was moved to an attacker's SIM; he sued
  his carrier, AT&T. Cryptocurrency thefts became the typical SIM-swap crime,
  because the transfers cannot be reversed.
- **2021.** The FBI's Internet Crime Complaint Center received 1,611
  complaints about SIM swapping, with reported losses of more than \$68
  million, against about \$12 million in 2018 to 2020 together.
- **November 2023.** The US Federal Communications Commission adopted rules
  requiring mobile carriers to authenticate customers securely before moving a
  number to a new SIM or a new carrier, and to notify them when it happens.
- **9 January 2024.** The US Securities and Exchange Commission's X account
  falsely announced approval of bitcoin exchange-traded funds. The SEC said that the phone
  number linked to the account had been moved to another SIM, and that
  multi-factor login had been off since July 2023. One attacker had walked
  into a phone shop in Alabama with a fake identity card; he was sentenced to
  14 months in prison in 2025.

Push fatigue has a shorter record. In 2022 the group known as Lapsus\$ used it,
with bought passwords and calls to help desks, against several large
technology companies. At Cisco, an attacker who had found an employee's
password synced into a personal Google account called the employee for days,
posing as support staff, and sent push requests until one was approved (Cisco
detected it on 24 May 2022). Uber followed in September. Each case is the same
protocol failure: the approval message says
"someone is logging in" but not *which* login, so the user cannot tell the
attacker's attempt from their own. Number matching repairs exactly that
missing binding, and nothing else; it does not help against a phishing proxy,
where the user really is looking at the login, only on the wrong site.

### Why every typed code can be phished

Why can no code that a person reads and types resist phishing? A code proves
one thing: that whoever typed it had access to the secret $K$
(or the phone number) within the last minute or so. It says nothing about
*where* it is being typed. The value $\mathrm{HOTP}(K, C)$ contains no name
of the site, no hash of the TLS connection, nothing that the real server can
compare with what it sees. A proxy that receives the code can therefore
present it, unchanged, on its own connection to the real site, and the real
site has no way to tell. Like the bearer tokens of
[Chapter 14](14-OAuth-OpenID-Connect-and-JWT.md), the code is a **bearer**
credential: it authenticates whoever holds it, for as long as it is
valid. A shorter window does not help, because the proxy relays in
milliseconds, and a longer code does not either.

The fix is to bind the proof to the **origin**, the site's name as the browser
sees it, so that a proof made for `arcadia-city.co` is useless at
`arcadia.mars`. A person cannot be trusted to do that, so the computation moves
into the browser and an authenticator, and it becomes a signature. That is the
design of passkeys, and
[§13.5](13-Passkeys-FIDO2-and-WebAuthn.md#135-why-a-passkey-cannot-be-phished)
shows the check that a proxy cannot pass.

The scale is large. In July 2022 Microsoft described a campaign built on the
Evilginx2 toolkit that had attempted to target more than 10,000 organizations
since September 2021, proxying the real Office 365 login and using the stolen
session cookies for payment fraud, sometimes within minutes. A campaign
that Group-IB named **0ktapus**, reported in August 2022 and running since at
least that March, sent text messages to
employees of more than 130 organizations, linking to fake single sign-on pages
that asked for the password and then the code; Group-IB counted 9,931 stolen
credentials. Twilio was breached. Cloudflare's employees got the same messages
and some typed their passwords, but Cloudflare used hardware security keys, so
the passwords alone were useless.

## 11.6 Challenge-response and why the password should stay home

*Level: intermediate.*

A password sent over TLS is safe from eavesdroppers, but it reaches the server
in the clear, and the server then has it. A server that logs request bodies, or
is compromised, or is the attacker's phishing page, gets the password itself.
The ideal login protocol would prove knowledge of the password without
revealing it, and would leave nothing in a transcript that allows offline
guessing.

The obvious idea, challenge-response, does not achieve the second goal. If the
server sends a random challenge $c$ and the client answers
$\mathrm{HMAC}(\text{password}, c)$, an eavesdropper who records $c$ and the
answer can test password guesses offline: compute the HMAC for each guess and
compare. This is exactly the WPA2-Personal attack of
[Chapter 9](09-Wi-Fi-Security.md) and the IKEv2 pre-shared key attack of
[Chapter 7](07-IPsec-and-IKEv2.md). Any protocol in which the password is the
only secret and the transcript contains a value computed from it alone has
this flaw. Microsoft's NTLM and the MS-CHAPv2 of Chapter 9 are the classic
examples.

The solution is a **password-authenticated key exchange** (PAKE): a
Diffie-Hellman exchange in which the password is mixed in so that only someone
who knows it ends up with the same key. A transcript then contains only values
that look random, and the only way to test a guess is to run the protocol with
the real server, one guess per attempt. Steven Bellovin and Michael Merritt
introduced the first, **EKE** (Encrypted Key Exchange), in 1992. PAKEs come in
two kinds:

- **Balanced** PAKEs, where both sides know the password, such as Dragonfly,
  which WPA3 uses ([Chapter 9](09-Wi-Fi-Security.md)), and **CPace**.
- **Augmented** (or asymmetric) PAKEs, where the server stores only a
  **verifier** derived from the password, so a stolen server database does not
  let the thief log in directly, only guess. SRP and OPAQUE are augmented.

## 11.7 SRP

*Level: intermediate.*

Thomas Wu's **Secure Remote Password** protocol (NDSS 1998; RFC 2945 in 2000,
and RFC 5054 for TLS in 2007) became the most widely deployed augmented PAKE.
Apple uses it in the escrow service that lets iCloud Keychain be recovered,
1Password uses it to log users in, and many smaller systems use it to avoid
ever sending a password.

<div class="mars-steps" markdown>

1. **Registration.** The client picks a random salt $s$ and computes
   $x = H(s \,\|\, H(I \,\|\, \texttt{":"} \,\|\, P))$ from the user name $I$
   and password $P$, then the **verifier** $v = g^x \bmod N$ in a large
   prime-order group. It sends $I$, $s$ and $v$. The server stores them; it
   never sees $P$.
2. **Login, first message.** The client sends $I$ and $A = g^a$ for a random $a$.
3. **Server's reply.** The server sends $s$ and $B = k v + g^b$ for a random
   $b$, where $k$ is a fixed multiplier. The $kv$ term ties $B$ to the verifier.
4. **Both compute** $u = H(A \,\|\, B)$ and the shared secret. The client, who
   knows $x$, computes
   $$S = (B - k g^x)^{a + u x},$$
   and the server, who knows only $v$, computes $S = (A v^u)^b$. Both equal
   $g^{b(a + ux)}$.
5. **Confirmation.** Each sends a hash proving it has $S$.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="SRP-6a message flow: registration sends salt and verifier; login sends A, receives salt and B equal to k v plus g to the b, both compute u and S by different formulas, then exchange proofs" fill="currentColor" font-size="13">
<path d="M110 30V370M530 30V370" stroke="currentColor" stroke-opacity=".4"/>
<rect x="10" y="38" width="620" height="76" rx="6" fill-opacity=".07"/>
<g fill-opacity=".14" stroke="currentColor"><rect x="10" y="244" width="250" height="44" rx="6"/><rect x="380" y="244" width="250" height="44" rx="6"/></g>
<path d="M230 96H520M120 160H520M520 200H120M120 316H520M520 350H120" stroke="currentColor" stroke-width="1.5"/>
<path d="M520 96l-12-5v10zM520 160l-12-5v10zM120 200l12-5v10zM520 316l-12-5v10zM120 350l12-5v10z"/>
<g font-size="12" fill-opacity=".7"><text x="20" y="56">registration, once, over a protected channel</text><text x="20" y="140">login</text></g>
<text x="20" y="78">x = H(s ‖ H(I ‖ ":" ‖ P)),  v = gˣ</text>
<g text-anchor="middle">
<text x="110" y="22" font-weight="bold">client: knows P</text>
<text x="530" y="22" font-weight="bold">server: knows s, v</text>
<text x="375" y="90">I, s, v</text>
<text x="320" y="153">I, A = gᵃ</text>
<text x="320" y="193">s, B = k·v + gᵇ   (SRP-3: k = 1; SRP-6: k = 3; SRP-6a: k = H(N, g))</text>
<text x="320" y="230">both: u = H(A ‖ B)   (SRP-3: u from B alone)</text>
<text x="135" y="271">S = (B − k·gˣ)^(a + u·x)</text>
<text x="505" y="271">S = (A·vᵘ)^b</text>
<text x="320" y="271" font-size="12">= g^(b(a+ux))</text>
<text x="320" y="309">M1 = H(A, B, K): "I have S"</text>
<text x="320" y="343">M2 = H(A, M1, K): "so do I"</text>
<text x="320" y="374" font-size="12" fill-opacity=".7">K = H(S); the server must refuse A ≡ 0 (mod N), the client B ≡ 0</text>
</g>
</svg>
<figcaption>Figure 11.5. SRP, with the places where its versions differ. The client needs the password to remove the k·v term from B; the server needs only the verifier to compute the same S.</figcaption>
</figure>

### Code it: SRP-6a against RFC 5054

RFC 5054 publishes a complete run for user `alice` with password
`password123` in its 1024-bit group, including the "random" values $a$ and $b$,
so that implementations can be compared.

```python
# SRP-6a (RFC 5054): the server stores a verifier, never the password, and both
# sides reach the same secret. Every value checked against RFC 5054 Appendix B.
import hashlib
H = lambda *parts: hashlib.sha1(b"".join(parts)).digest()
num = lambda hexstr: int(hexstr.replace(" ", ""), 16)
N = num("EEAF0AB9 ADB38DD6 9C33F80A FA8FC5E8 60726187 75FF3C0B 9EA2314C"
        "9C256576 D674DF74 96EA81D3 383B4813 D692C6E0 E0D5D8E2 50B98BE4"
        "8E495C1D 6089DAD1 5DC7D7B4 6154D6B6 CE8EF4AD 69B15D49 82559B29"
        "7BCF1885 C529F566 660E57EC 68EDBC3C 05726CC0 2FD4CBF4 976EAA9A"
        "FD5138FE 8376435B 9FC61D2F C0EB06E3")       # the 1024-bit group of Appendix A
g = 2
pad = lambda n: n.to_bytes(128, "big")              # PAD() to the length of N
i2b = lambda n: n.to_bytes((n.bit_length() + 7) // 8, "big")
b2i = lambda b: int.from_bytes(b, "big")

I, P = b"alice", b"password123"
s = bytes.fromhex("BEB25379D1A8581EB5A727673A2441EE")
k = b2i(H(pad(N), pad(g)))

# Registration: the client sends (I, s, v). The server keeps v, not P.
x = b2i(H(s, H(I + b":" + P)))
v = pow(g, x, N)

# Login. The RFC's fixed "random" values, so the run can be compared:
a = num("60975527 035CF2AD 1989806F 0407210B C81EDC04 E2762A56 AFD529DD DA2D4393")
b = num("E487CB59 D31AC550 471E81F0 0F6928E0 1DDA08E9 74A004F4 9E61F5D1 05284D20")
A = pow(g, a, N)                                    # client -> server
B = (k * v + pow(g, b, N)) % N                      # server -> client (with s)
u = b2i(H(pad(A), pad(B)))

S_client = pow((B - k * pow(g, x, N)) % N, a + u * x, N)   # needs the password (x)
S_server = pow(A * pow(v, u, N) % N, b, N)                 # needs only the verifier
print("k matches:", k == num("7556AA04 5AEF2CDD 07ABAF0F 665C3E81 8913186F"))
print("x matches:", x == num("94B7555A ABE9127C C58CCF49 93DB6CF8 4D16C124"))
print("u matches:", u == num("CE38B959 3487DA98 554ED47D 70A7AE5F 462EF019"))
print("v starts", hex(v)[2:18], "  A starts", hex(A)[2:18], "  B starts", hex(B)[2:18])
premaster = num("B0DC82BA BCF30674 AE450C02 87745E79 90A3381F 63B387AA F271A10D"
                "233861E3 59B48220 F7C4693C 9AE12B0A 6F67809F 0876E2D0 13800D6C"
                "41BB59B6 D5979B5C 00A172B4 A2A5903A 0BDCAF8A 709585EB 2AFAFA8F"
                "3499B200 210DCC1F 10EB3394 3CD67FC8 8A2F39A4 BE5BEC4E C0A3212D"
                "C346D7E4 74B29EDE 8A469FFE CA686E5A")
print("client and server agree:", S_client == S_server, "  equals RFC premaster:", S_client == premaster)

# A stolen verifier still allows an offline dictionary attack, one guess at a time:
for guess in [b"123456", b"letmein", b"password", b"password123"]:
    if pow(g, b2i(H(s, H(I + b":" + guess))), N) == v:
        print("stolen verifier cracked with guess:", guess.decode())
```

```text
k matches: True
x matches: True
u matches: True
v starts 7e273de8696ffc4f   A starts 61d5e490f6f1b795   B starts bd0c61512c692c0c
client and server agree: True   equals RFC premaster: True
stolen verifier cracked with guess: password123
```

The multiplier $k$, the private value $x$, the scrambler $u$ and the final
premaster secret all match the RFC, and the two sides agree. The last lines
show SRP's limit. A thief who steals the server's database gets $s$ and $v$,
and can test password guesses offline by computing $g^x$ for each, exactly as
with a stolen password hash, and with no slow hashing unless the
implementation adds it. (RFC 5054's $x$ is a single SHA-1 of the salted
password; what a slow password hash costs an attacker, and how to choose its
parameters, is the subject of the Engineering book's
[chapter 13](../engineering/13-Passwords-on-the-Server.md#132-choosing-parameters-today),
which this chapter does not repeat.) Worse, the salt $s$ is sent to anyone who starts a
login for user $I$, before any authentication. An attacker can collect the salt
in advance and precompute guesses for that user, so that the moment the
database is stolen the password falls. SRP also has a long history of
implementation mistakes, such as servers that accept $A = 0$ or $A = N$, which
makes the shared secret zero and lets anyone log in. The protocol was designed
in 1998 around integer groups, and its proof came much later and only for
variants.

### SRP's versions, and what broke each

"SRP" names a family whose members differ by small formulas with large
consequences. Wu's first designs, SRP-1 and SRP-2, were worked out at
Stanford in 1997 and discussed on the Usenet group sci.crypt; the SRP home
page lists them only as earlier versions whose weaknesses the published
protocol addressed, and they were never standardized.

**SRP-3 (1998, RFC 2945 in 2000).** The version in Wu's NDSS paper, and the
one RFC 2945 specifies on the standards track. The server sends
$B = v + g^b$, with no multiplier, and the scrambler is the first 32 bits of
$\mathrm{SHA\text{-}1}(B)$, computed from $B$ alone. Two problems were found
in it, and Wu's 2002 revision fixed both.

The first is about **message order**. Because $u$ depends only on $B$, a
client that saw $B$ (and so $u$) before choosing $A$ could choose $A$ to cancel
the verifier. Someone who has stolen $v$ but not the password picks a random
$a$ and sends $A = g^a \cdot v^{-u}$. The server computes
$S = (A v^u)^b = g^{ab}$, and the thief computes the same value as
$(B - v)^a$, since $B - v = g^b$. The thief logs in with the verifier alone,
which an augmented PAKE promises cannot happen. SRP-3 avoids this only by
requiring that the client send $A$ first, a rule that is awkward for TLS,
where the server's key exchange message comes first.

The second is the **two-for-one guess**. A fake server, which wants to test
passwords against a real client, chooses two candidate passwords with
verifiers $v_1 = g^{x_1}$ and $v_2 = g^{x_2}$ and sends

$$B = v_1 + v_2 \bmod N.$$

If the client's password is the first candidate, the client computes
$B - v_1 = v_2 = g^{x_2}$, a value whose discrete logarithm the fake server
knows; so the fake server can compute the client's $S$ as
$A^{x_2} g^{u x_1 x_2}$ and compare it with the client's proof. If the
password is the second candidate, then $B - v_2 = g^{x_1}$ and the same trick
works the other way round. One run tests two passwords, breaking the promise
of one guess per online attempt.

**SRP-6 (2002).** Wu's submission to the IEEE P1363.2 working group fixed
both. The scrambler became $u = H(A \,\|\, B)$, so the messages can come in
either order, and the server's value became $B = 3v + g^b$: the fake server's
trick now gives $B - 3v_1 = 3 g^{x_2}$, and computing $S$ needs the discrete
logarithm of 3.

**SRP-6a (a revision of SRP-6; RFC 5054 in 2007).** An attacker who can pick
the group, for example with $g = 3$, knows the logarithm of 3 trivially.
SRP-6a made the multiplier a hash of the group,
$k = H(N \,\|\, \mathrm{PAD}(g))$. RFC 5054, which put SRP into TLS in November 2007, uses it,
and says what each value is for: $u$ stops a verifier thief from logging in,
$k$ stops the two-for-one guess by someone who can select the group. An
erratum later pointed out that the 2002 paper's SRP-6 uses $k = 3$ while the
RFC's "SRP-6" is really SRP-6a, a confusion that can break interoperability.

The program plays the fake server against an honest client, with SRP-3's
$B = v_1 + v_2$ and then SRP-6a's $B = k(v_1 + v_2)$, using $u = H(A \,\|\, B)$
in both cases because the attack does not depend on $u$.

```python
# Uses N, g, k, H, pad, b2i, s and I from the SRP listing above.
# SRP-3's two-for-one guess: a fake server sends B = v1 + v2 and tests two
# passwords against one client's proof. SRP-6a's multiplier k stops it.
import secrets
def x_of(pw): return b2i(H(s, H(I + b":" + pw)))
def client(pw, B, mult):                  # an honest client; returns A and its proof
    a = secrets.randbelow(N - 2) + 1
    A, x = pow(g, a, N), x_of(pw)
    u = b2i(H(pad(A), pad(B)))
    S = pow((B - mult * pow(g, x, N)) % N, a + u * x, N)
    return A, H(pad(S))
x1, x2 = x_of(b"letmein"), x_of(b"password123")         # the fake server's two guesses
for mult, name in ((1, "SRP-3, k = 1"), (k, "SRP-6a, k = H(N, g)")):
    B = mult * (pow(g, x1, N) + pow(g, x2, N)) % N
    for real in (b"letmein", b"password123", b"red-dust-2026"):
        A, proof = client(real, B, mult)
        u = b2i(H(pad(A), pad(B)))
        # If the password is guess 1, B - v1 = v2 = g^x2, so S = A^x2 * g^(u x1 x2); and vice versa.
        hits = [guess for guess, (xa, xb) in (("letmein", (x1, x2)), ("password123", (x2, x1)))
                if H(pad(pow(A, xb, N) * pow(g, u * xa * xb, N) % N)) == proof]
        print(f"{name:<20} client uses {real.decode():<14} fake server learns: {hits or 'nothing'}")
```

It prints:

```text
SRP-3, k = 1         client uses letmein        fake server learns: ['letmein']
SRP-3, k = 1         client uses password123    fake server learns: ['password123']
SRP-3, k = 1         client uses red-dust-2026  fake server learns: nothing
SRP-6a, k = H(N, g)  client uses letmein        fake server learns: nothing
SRP-6a, k = H(N, g)  client uses password123    fake server learns: nothing
SRP-6a, k = H(N, g)  client uses red-dust-2026  fake server learns: nothing
```

With $k = 1$ the fake server finds either candidate from a single run; with
SRP-6a's $k$ the trick fails for both.

!!! note "Life story: SRP-3's two-for-one guess"
    **Born:** 1998, with the published protocol's $B = v + g^b$; described by
    Wu in his 2002 SRP-6 paper.
    **Purpose:** to let an attacker who impersonates the server test two
    passwords per login instead of one.
    **Helped:** no recorded attack in the wild; it broke the property the
    protocol was designed to have.
    **Status:** fixed by SRP-6 and SRP-6a. RFC 2945 still describes SRP-3, so
    "SRP" without a version number is not a specification.

**What remains after 6a.** The versions fixed the algebra, not the structure:
the salt is still public, so precomputation is possible; $x$ is still one SHA-1;
SRP mixes addition and multiplication modulo $N$, so it has no direct elliptic
curve version; and implementations keep accepting $A \equiv 0$. In 2018
Matthew Green, reviewing the protocol for a general audience, argued that SRP
was a dated 1990s design and that newer protocols, OPAQUE among them, did
better. It remains in wide use: Apple's keychain escrow, 1Password, Proton's
login and the `USER_SRP_AUTH` flow of Amazon Cognito all run SRP.

## 11.8 OPAQUE and CPace

*Level: intermediate.*

**OPAQUE**, designed by Stanisław Jarecki, Hugo Krawczyk and Jiayu Xu
(EUROCRYPT 2018), fixes both of SRP's structural problems. Its core is an
**oblivious pseudorandom function** (OPRF): the server holds a secret key $k$
for each user, and the client obtains $F_k(\text{password}) = H(\text{password})^k$
without the server learning the password and without the client learning $k$.
The client **blinds** the hashed password with a random exponent $r$, sends
$H(\text{password})^r$, gets back $(H(\text{password})^r)^k$, and removes the
blinding by raising to $1/r$. The result, the **randomized password**, is a
strong key that only someone who knows the password *and* can talk to the
server can compute.

At registration, the client uses the randomized password to encrypt an
**envelope** holding its own long-term key pair, and the server stores $k$,
the envelope and the client's public key. At login, the client runs the OPRF,
opens the envelope, and then the two sides run an ordinary authenticated key
exchange with their key pairs. That is the design of the 2018 paper, and the
program below follows it. RFC 9807 keeps the idea but derives the key pair
instead of encrypting it, and authenticates the key exchange with three
Diffie-Hellman values (3DH) rather than signatures; §11.10 runs the standard
version.

### What each party has

Sections 11.9 and 11.10 open the OPRF and run OPAQUE in full against the RFCs'
test vectors; here is what those runs show. The server sees a different
random-looking point at every login and never sees the password or anything
computed from it alone. A wrong password gives a different randomized
password, and the envelope refuses to open. A thief who steals the whole
record can still guess offline, by evaluating the OPRF for each guess with the
stolen $k$, as the last lines of §11.10's program do; no protocol can prevent
that, since the thief has everything the server had. But two things
are now impossible that SRP allowed. Nothing can be **precomputed** before the
theft, because $k$ is secret until then and different for every user. And the
server's stored record is useless without the OPRF key, so the key can be kept
in a hardware security module separate from the database. WhatsApp's encrypted
backups (2021) use OPAQUE this way: the key that encrypts a user's backup is
released by a hardware vault only after an OPAQUE login with the user's
password, and the vault limits the number of attempts.

OPRFs were standardized as RFC 9497 (2023), and OPAQUE as RFC 9807 (July 2025),
both published by the IRTF's Crypto Forum Research Group, which had run a
selection in 2019 and 2020 and chose **OPAQUE** as its augmented PAKE and
**CPace** as its balanced one.

**CPace** (Björn Haase and Benoît Labrique, 2019) is the simplest balanced PAKE:
both sides hash the password, together with a session identifier and their
identities, to a point $G$ on an elliptic curve, then run plain Diffie-Hellman
with $G$ as the generator: $Y_a = y_a G$, $Y_b = y_b G$, $K = y_a Y_b = y_b
Y_a$. An attacker who does not know the password does not know $G$, and the
exchanged points reveal nothing about it. Unlike Dragonfly's hunting and
pecking ([Chapter 9](09-Wi-Fi-Security.md), §9.8), CPace requires a
constant-time hash-to-curve function from the start, which removes the timing
side channel by design.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="What a server stores and what a database thief can do: password hash, SRP verifier, OPAQUE record with a key kept apart" fill="currentColor" font-size="13">
<rect x="20" y="20" width="190" height="260" rx="6" class="soft" stroke="currentColor"/>
<text x="115" y="44" text-anchor="middle" font-weight="bold">password over TLS</text>
<text x="35" y="72">stores: salted hash</text>
<text x="35" y="98">sees at login:</text>
<text x="35" y="116" class="acc-fill">the password itself</text>
<text x="35" y="148">thief can:</text>
<text x="35" y="166">guess offline</text>
<text x="35" y="198">phishing page:</text>
<text x="35" y="216" class="acc-fill">gets the password</text>
<rect x="225" y="20" width="190" height="260" rx="6" class="soft" stroke="currentColor"/>
<text x="320" y="44" text-anchor="middle" font-weight="bold">SRP</text>
<text x="240" y="72">stores: salt s, verifier v</text>
<text x="240" y="98">sees at login:</text>
<text x="240" y="116">A, never the password</text>
<text x="240" y="148">thief can:</text>
<text x="240" y="166">guess offline, and</text>
<text x="240" y="184" class="acc-fill">precompute: s is public</text>
<text x="240" y="216">phishing page: gets</text>
<text x="240" y="234">one online guess</text>
<rect x="430" y="20" width="190" height="260" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="525" y="44" text-anchor="middle" font-weight="bold">OPAQUE</text>
<text x="445" y="72">stores: OPRF key k,</text>
<text x="445" y="90">envelope, public key</text>
<text x="445" y="116">sees: a blinded point</text>
<text x="445" y="148">thief can:</text>
<text x="445" y="166">guess offline only</text>
<text x="445" y="184">after the theft, and</text>
<text x="445" y="202">only with k (HSM-able)</text>
<text x="445" y="234">phishing page: gets</text>
<text x="445" y="252">one online guess</text>
</svg>
<figcaption>Figure 11.6. Three ways to log in with a password. The PAKEs change what a phishing page or a server thief can do; none can stop guesses with a stolen record.</figcaption>
</figure>

Note one thing the figure shows that is easy to miss: a phishing page that
imitates a PAKE login gets no password at all, only a failed protocol run,
**if** the user types the password into the real client software. If the
phishing page simply shows a password box, the user types the password into
it, and the PAKE never runs. PAKEs protect passwords from servers and
networks, not from people who type them into the wrong place. That is why the
web never adopted them for logins in browsers, and why it moved to passkeys.

## 11.9 The oblivious PRF, by hand and by the RFC

*Level: intermediate.*

This section opens the oblivious PRF twice: first in a group small enough to
compute by hand, then exactly as RFC 9497 specifies it on P-256, reproducing
the RFC's test vectors byte for byte.

### A worked example by hand

Take the numbers $1, 2, \dots, 22$ modulo the prime 23, and keep only the
squares: $\{1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18\}$. They form a group of 11
elements under multiplication modulo 23, and 11 is prime, so every element
except 1 generates the whole group and exponents can be reduced modulo 11.
(This is the same structure as the prime-order groups of book 1's
[Chapter 12](../../book/12-Diffie-Hellman.md), shrunk until the arithmetic
fits in a margin.) The steps are written multiplicatively, $P^r$, as in
§11.8; on an elliptic curve the same steps are written $r \cdot P$.

1. **Hash the password into the group.** Suppose the password hashes to the
   element $P = 9$. (Doing this safely is the hard part; it comes next.)
2. **Blind.** The client picks $r = 3$ and computes $M = 9^3 \bmod 23$:
   $9^2 = 81 = 3 \cdot 23 + 12$, so $9^2 \equiv 12$; then
   $9^3 \equiv 12 \cdot 9 = 108 = 4 \cdot 23 + 16$, so $M = 16$. The client
   sends 16.
3. **Evaluate.** The server's key is $k = 7$. It computes $Z = 16^7$:
   $16^2 = 256 \equiv 3$, $16^4 \equiv 9$, and
   $16^7 = 16^4 \cdot 16^2 \cdot 16 \equiv 9 \cdot 3 \cdot 16 = 432 \equiv 18$.
   It sends 18.
4. **Unblind.** The client needs $1/r$ modulo the group order 11, not
   modulo 23: $3 \cdot 4 = 12 \equiv 1 \pmod{11}$, so $1/r = 4$. Then
   $18^2 = 324 \equiv 2$ and $18^4 \equiv 4$. The result is **4**.
5. **Check.** Directly,
   $P^k = 9^7 = 9^4 \cdot 9^2 \cdot 9 \equiv 6 \cdot 12 \cdot 9 = 648 \equiv 4$.
   The blinding cancelled:
   $(9^{3 \cdot 7})^4 = 9^{7 \cdot 12} = 9^7 \cdot (9^{11})^{7} = 9^7$,
   because $9^{11} \equiv 1$.
6. **Log in again** with a fresh $r = 5$: $M = 9^5 \equiv 8$, the server
   returns $8^7 \equiv 12$, and $1/5 \equiv 9 \pmod{11}$ gives
   $12^9 \equiv 4$. The same result, from messages (8 and 12) that have
   nothing visible in common with the first login's (16 and 18).

Why does the server learn nothing? Because $r$ is uniform among
$1, \dots, 10$ and the group has prime order, $M = P^r$ is uniform among the
ten elements other than 1, *whatever $P$ is*. The hiding is perfect: even
unlimited computing power learns nothing about the password from $M$. The
client learns $P^k$ for its own $P$; recovering $k$ from it is a discrete
logarithm, eleven tries here and about $2^{128}$ operations on P-256.

The output is not $P^k$ itself but
$\mathrm{SHA\text{-}256}(\text{pw} \,\|\, P^k \,\|\, \texttt{"Finalize"})$
with length prefixes, which ties it to the password and turns it into uniform
bytes.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="OPRF blinding: the client hashes the password to P, sends r times P, the server multiplies by k, the client multiplies by one over r and hashes; toy numbers 9, 16, 18, 4 modulo 23" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="none">
<rect x="10" y="34" width="110" height="46" rx="6"/><rect x="140" y="34" width="110" height="46" rx="6"/>
<rect x="400" y="34" width="110" height="46" rx="6"/><rect x="530" y="34" width="100" height="46" rx="6"/>
<path d="M120 57h20M250 57h20M510 57h20"/>
<path d="M300 108L360 186M430 186L470 108" stroke-width="1.5"/>
</g>
<g fill-opacity=".22" stroke="currentColor"><rect x="270" y="34" width="110" height="46" rx="6"/><rect x="335" y="188" width="120" height="46" rx="6"/></g>
<path d="M140 57l-8-4v8zM270 57l-8-4v8zM530 57l-8-4v8zM360 186l-9.7-5.2 7.2-5.4zM470 108l-.6 11-8-4.1z"/>
<text x="20" y="22" font-weight="bold">client</text>
<text x="20" y="214" font-weight="bold">server</text>
<g text-anchor="middle">
<text x="65" y="62">password</text><text x="195" y="62">P = H(pw)</text>
<text x="325" y="62">M = r·P</text><text x="455" y="62">(1/r)·Z = k·P</text>
<text x="580" y="56">output =</text><text x="580" y="72" font-size="12">H(pw, k·P)</text>
<text x="395" y="216">Z = k·M</text>
<g font-size="12" fill-opacity=".7">
<text x="65" y="100">red-dust-2026</text><text x="195" y="100">9</text>
<text x="325" y="100">9³ = 16   (r = 3)</text><text x="455" y="100">18⁴ = 4   (1/r = 4)</text>
<text x="580" y="100">H(pw, 4)</text><text x="395" y="254">16⁷ = 18   (k = 7)</text>
</g></g>
<g font-size="12"><text x="20" y="250">sees only M and Z:</text><text x="20" y="266">16 and 18 at one login,</text><text x="20" y="282">8 and 12 at the next</text></g>
<text x="630" y="290" text-anchor="end" font-size="12" fill-opacity=".7">toy group: the 11 squares modulo 23; exponents modulo 11</text>
</svg>
<figcaption>Figure 11.7. Blinding in the oblivious PRF, with the hand-worked numbers under each step. The shaded values are the only ones that cross the network.</figcaption>
</figure>

### Hashing a password onto a curve

Step 1 hid a problem. The password has to become a point $P$ on the curve
whose discrete logarithm nobody knows. The obvious method, "hash to a number
$x$ and try $x$, $x+1$, … until $x^3 - 3x + b$ is a square", takes a number
of tries that depends on the password, so its timing leaks the password: the
Dragonblood attacks on WPA3's hunting and pecking
([Chapter 9](09-Wi-Fi-Security.md)) measured exactly that.

RFC 9380 (2023) fixed the method. For the suite `P256_XMD:SHA-256_SSWU_RO_`
that RFC 9497 uses:

1. **Expand.** `expand_message_xmd` turns the input and a tag into 96 bytes
   with a few SHA-256 calls.
2. **Make field elements.** Two 48-byte numbers, each reduced modulo $p$; the
   128 extra bits make the bias of the reduction negligible.
3. **Map.** Each number $u$ goes through the **simplified SWU** map: one
   candidate $x_1$, a second $x_2 = Z u^2 x_1$ with $Z = -10$, and one of the
   two always gives a square. No loop, nothing for a timer to measure.
4. **Add.** The two points are added. One map alone gives points whose
   distribution is detectably uneven; the sum of two independent ones is
   indistinguishable from a random point, which is what the proofs need.

The domain separation tag, `HashToGroup-OPRFV1-`, a mode byte (0 for the
plain OPRF) and `P256-SHA256`, gives each protocol and mode unrelated points.

### Code it: RFC 9497 on P-256, byte for byte

The program implements the curve, the hash to the curve, the RFC's key
derivation and its three OPRF functions, and checks them against test vectors
1 and 2 of RFC 9497 Appendix A.3.1, which fix the "random" blind.

```python
# The OPRF of RFC 9497 on P-256 (suite P256-SHA256, OPRF mode), with hash_to_curve
# from RFC 9380, checked byte for byte against RFC 9497 Appendix A.3.1.
import hashlib
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
A, B = p - 3, 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b
G = (0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296,
     0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5)

def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    if P == Q: l = (3 * P[0] * P[0] + A) * pow(2 * P[1], -1, p) % p
    else:      l = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x = (l * l - P[0] - Q[0]) % p
    return (x, (l * (P[0] - x) - P[1]) % p)

def mul(k, P):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1": R = add(R, P)
    return R

def compress(P):                                   # SEC1 compressed, 33 bytes
    return bytes([2 + (P[1] & 1)]) + P[0].to_bytes(32, "big")

def expand_xmd(msg, dst, length):                  # RFC 9380 section 5.3.1
    dst_prime = dst + bytes([len(dst)])
    b0 = hashlib.sha256(bytes(64) + msg + length.to_bytes(2, "big") + b"\0" + dst_prime).digest()
    bs = [hashlib.sha256(b0 + b"\1" + dst_prime).digest()]
    while len(bs) * 32 < length:
        prev = bytes(x ^ y for x, y in zip(b0, bs[-1]))
        bs.append(hashlib.sha256(prev + bytes([len(bs) + 1]) + dst_prime).digest())
    return b"".join(bs)[:length]

def hash_to_field(msg, dst, count, modulus):       # 48 bytes per element
    data = expand_xmd(msg, dst, 48 * count)
    return [int.from_bytes(data[48 * i:48 * i + 48], "big") % modulus for i in range(count)]

def sswu(u):                                       # simplified SWU, Z = -10
    Z = p - 10
    tv = (Z * Z * pow(u, 4, p) + Z * u * u) % p
    x1 = (-B * pow(A, -1, p) * (1 + pow(tv, -1, p))) % p if tv else B * pow(Z * A, -1, p) % p
    gx1 = (x1 ** 3 + A * x1 + B) % p
    if pow(gx1, (p - 1) // 2, p) == 1:
        x, y = x1, pow(gx1, (p + 1) // 4, p)
    else:
        x = Z * u * u * x1 % p
        y = pow((x ** 3 + A * x + B) % p, (p + 1) // 4, p)
    if u % 2 != y % 2: y = p - y                   # sign of y follows u
    return (x, y)

def hash_to_group(msg, dst):
    u0, u1 = hash_to_field(msg, dst, 2, p)
    return add(sswu(u0), sswu(u1))

ctx = b"OPRFV1-\x00-P256-SHA256"                   # mode 0 = OPRF
def derive_key(seed, info):
    data = seed + len(info).to_bytes(2, "big") + info + b"\0"
    return hash_to_field(data, b"DeriveKeyPair" + ctx, 1, n)[0]

def blind(inp, r):          return mul(r, hash_to_group(inp, b"HashToGroup-" + ctx))
def blind_evaluate(sk, M):  return mul(sk, M)
def finalize(inp, r, Z):
    N = compress(mul(pow(r, -1, n), Z))
    return hashlib.sha256(len(inp).to_bytes(2, "big") + inp + len(N).to_bytes(2, "big") + N + b"Finalize").digest()

sk = derive_key(bytes([0xa3]) * 32, b"test key")      # the RFC's server key
print("server key matches A.3.1:", hex(sk)[2:] == "159749d750713afe245d2d39ccfaae8381c53ce92d098a9375ee70739c7ac0bf")
r = 0x3338fa65ec36e0290022b48eb562889d89dbfa691d1cde91517fa222ed7ad364   # the RFC's blind
want = {b"\x00": ("03723a1e5c09b8b9c18d1dcbca29e8007e95f14f4732d9346d490ffc195110368d",
                  "030de02ffec47a1fd53efcdd1c6faf5bdc270912b8749e783c7ca75bb412958832",
                  "a0b34de5fa4c5b6da07e72af73cc507cceeb48981b97b7285fc375345fe495dd"),
        b"\x5a" * 17: ("03cc1df781f1c2240a64d1c297b3f3d16262ef5d4cf102734882675c26231b0838",
                        "03a0395fe3828f2476ffcd1f4fe540e5a8489322d398be3c4e5a869db7fcb7c52c",
                        "c748ca6dd327f0ce85f4ae3a8cd6d4d5390bbb804c9e12dcf94f853fece3dcce")}
for inp, (w_blinded, w_eval, w_out) in want.items():
    M = blind(inp, r)                              # client -> server: all the server sees
    Z = blind_evaluate(sk, M)                      # server -> client
    out = finalize(inp, r, Z)
    print(f"input {inp.hex()[:8]:<8} blinded {compress(M).hex()[:16]} evaluated {compress(Z).hex()[:16]}",
          "| all match:", (compress(M).hex(), compress(Z).hex(), out.hex()) == (w_blinded, w_eval, w_out))
print("output for input 00:", finalize(b"\x00", r, blind_evaluate(sk, blind(b"\x00", r))).hex())
```

It prints:

```text
server key matches A.3.1: True
input 00       blinded 03723a1e5c09b8b9 evaluated 030de02ffec47a1f | all match: True
input 5a5a5a5a blinded 03cc1df781f1c224 evaluated 03a0395fe3828f24 | all match: True
output for input 00: a0b34de5fa4c5b6da07e72af73cc507cceeb48981b97b7285fc375345fe495dd
```

Every value matches: the server key, the blinded and evaluated elements and
the 32-byte output. The server's whole job is one scalar multiplication; most
of the program is the careful conversion of bytes into a point.

Messages are 33-byte compressed points. A real server must check that each
point it receives is on the curve and is not the identity, as RFC 9497
requires; a point off the curve can leak bits of $k$ (book 1's
[Chapter 15](../../book/15-Elliptic-Curves.md) covers such invalid-curve
attacks).

### Verifiable and partially oblivious modes

In the plain OPRF the client cannot tell which key the server used, so a
server could tag users with different keys. RFC 9497's **verifiable** mode
(VOPRF) closes that gap: the server publishes $\mathit{pk} = k \cdot G$ and
attaches to each evaluation a short proof, of the Chaum-Pedersen kind, that the same $k$
connects $G$ to $\mathit{pk}$ and $M$ to $Z$, without revealing $k$. Privacy
Pass tokens (§11.13) use it. The **partially oblivious** mode (POPRF) adds a
public input that both sides see, such as a date or a purpose, so that one key
can serve many contexts whose outputs are unrelated.

OPAQUE uses the plain mode. Its per-user OPRF key is secret and different for
every user, so there is no public key to check against, and it does not need
one: if the server evaluates with the wrong key, the client's envelope check
fails and the login stops.

## 11.10 OPAQUE, message by message

*Level: expert.*

RFC 9807, *The OPAQUE Augmented Password-Authenticated Key Exchange (aPAKE)
Protocol*, by Daniel Bourdrez, Hugo Krawczyk, Kevin Lewi and Christopher Wood,
was published in July 2025 as an Informational RFC of the IRTF's Crypto Forum
Research Group. It keeps the idea of §11.8 with five changes: per-user OPRF
keys derived from one server seed; an "envelope" that encrypts nothing,
because the client's key pair is *derived* from the randomized password; a
slow key stretching function (KSF) such as Argon2id run on the client; a
key exchange authenticated by Diffie-Hellman (3DH) instead of signatures; and
masking, so that an attacker cannot tell a real user from a made-up name.

### Registration, traced

The server has a long-term key pair for the key exchange and its `oprf_seed`.
For the user with credential identifier `cid`, the OPRF key $k_u$ comes from
`DeriveKeyPair` applied to `Expand(oprf_seed, cid ‖ "OprfKey")`. On P-256,
registration is three messages:

<div class="mars-steps" markdown>

1. **RegistrationRequest (33 bytes).** $M = r \cdot H(\text{pw})$, as in §11.9.
2. **RegistrationResponse (66 bytes).** $Z = k_u \cdot M$ and the server's
   long-term public key. This step needs a channel the client already trusts,
   such as TLS: whoever substitutes the public key here is the "server" for
   good.
3. **The client's work.** It unblinds and finalizes to get the OPRF output $y$,
   stretches it, and extracts the **randomized password**
   $\mathit{rwd} = \mathrm{Extract}(\varnothing,\; y \,\|\, \mathrm{KSF}(y))$.
   With a random 32-byte nonce $n_e$ it expands $\mathit{rwd}$ into a masking
   key, an authentication key, an export key and a seed for its own key pair,
   and MACs $n_e$, the server's public key and the identities.
4. **RegistrationRecord (129 bytes).** Its public key (33), the masking key
   (32) and the envelope, $n_e$ and tag (64). The client keeps nothing but the
   password.

</div>

### Login, traced

<div class="mars-steps" markdown>

1. **KE1 (98 bytes).** A fresh blinded password $M' = r' \cdot H(\text{pw})$
   (33), a client nonce (32) and an ephemeral Diffie-Hellman public key (33).
2. **KE2 (259 bytes).** $Z' = k_u \cdot M'$ (33), a masking nonce (32), the
   server's public key and envelope (97) XORed with a pad from the masking key,
   a server nonce (32), an ephemeral public key (33) and a MAC (32) over the
   transcript.
3. **The client's work.** Unblind, recompute $\mathit{rwd}$, unmask, re-derive
   the key pair, check the tag (a wrong password fails here), run 3DH, check
   the server's MAC.
4. **KE3 (32 bytes).** The client's MAC, which the server checks before using
   the session key.

</div>

The **3DH** secret concatenates three Diffie-Hellman values: ephemeral with
ephemeral (forward secrecy), client ephemeral with server long-term (only the
real server can compute it), and client long-term with server ephemeral (only
someone who knew the password can). HKDF over these and a transcript, with
labels in the style of TLS 1.3 ([Chapter 3](03-TLS-1.3-Message-by-Message.md)),
gives the MAC keys and the session key.

<figure class="mars-fig">
<svg viewBox="0 0 640 430" width="640" role="img" aria-label="OPAQUE on P-256: registration in three messages of 33, 66 and 129 bytes; login in three messages KE1 of 98 bytes, KE2 of 259 bytes and KE3 of 32 bytes, with the client's work between them" fill="currentColor" font-size="13">
<path d="M80 30V420M560 30V420" stroke="currentColor" stroke-opacity=".4"/>
<rect x="6" y="36" width="628" height="160" rx="6" fill-opacity=".06"/>
<g fill-opacity=".16" stroke="currentColor"><rect x="90" y="112" width="460" height="42" rx="5"/><rect x="90" y="296" width="460" height="58" rx="5"/></g>
<path d="M90 72H550M550 102H90M90 178H550M90 244H550M550 284H90M90 380H550" stroke="currentColor" stroke-width="1.5"/>
<path d="M550 72l-12-5v10zM90 102l12-5v10zM550 178l-12-5v10zM550 244l-12-5v10zM90 284l12-5v10zM550 380l-12-5v10z"/>
<g font-size="12" fill-opacity=".7"><text x="14" y="52">registration (over a channel the client trusts)</text><text x="14" y="222">login</text></g>
<g text-anchor="middle">
<text x="80" y="22" font-weight="bold">client: pw</text>
<text x="560" y="22" font-weight="bold">server: oprf_seed, keys</text>
<text x="320" y="66">M = r·H(pw)   [33]</text>
<text x="320" y="96">Z = kᵤ·M, server public key   [66]</text>
<text x="320" y="172">client public key, masking key, nonce ‖ tag   [129]</text>
<text x="320" y="238">KE1: M′ = r′·H(pw), nonce, ephemeral key   [98]</text>
<text x="320" y="264">KE2: Z′ = kᵤ·M′, masked (server key ‖ envelope),</text>
<text x="320" y="278">nonce, ephemeral key, server MAC   [259]</text>
<text x="320" y="374">KE3: client MAC   [32]</text>
<g font-size="12">
<text x="320" y="130">rwd = Extract(y ‖ KSF(y)); from rwd and nonce: masking,</text>
<text x="320" y="146">auth and export keys, the client's key pair; tag = MAC(auth key, …)</text>
<text x="320" y="314">unblind → rwd → unmask → rebuild key pair → check tag</text>
<text x="320" y="330">3DH: eph·eph ‖ eph·server ‖ client·eph → HKDF over the transcript</text>
<text x="320" y="346">check the server's MAC</text>
<text x="80" y="410">session key, export key</text>
<text x="560" y="410">session key</text>
</g></g>
</svg>
<figcaption>Figure 11.8. OPAQUE-3DH on P-256 (RFC 9807), with message sizes in bytes. The server sees two blinded points and two MACs, never the password, the randomized password or the export key.</figcaption>
</figure>

### Code it: a whole OPAQUE run

RFC 9807's test vector C.1.5 fixes every input of a P-256 run, with the
password `CorrectHorseBatteryStaple`. Its KSF is the identity function, so it
can be checked without Argon2; a deployment would use Argon2id or scrypt. The
program builds on the OPRF listing and plays both sides.

```python
# Uses mul(), compress(), derive_key(), blind() and finalize() from the listing above.
# A whole OPAQUE-3DH run (RFC 9807) with the inputs of its test vector C.1.5.
import hmac
def decompress(b):
    x = int.from_bytes(b[1:], "big")
    y = pow((x ** 3 + A * x + B) % p, (p + 1) // 4, p)
    return (x, y if y % 2 == b[0] - 2 else p - y)
def hkdf_extract(salt, ikm): return hmac.new(salt, ikm, hashlib.sha256).digest()
def hkdf_expand(prk, info, length):
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest(); out += t; i += 1
    return out[:length]
def label(secret, name, context, length=32):
    name = b"OPAQUE-" + name
    info = length.to_bytes(2, "big") + bytes([len(name)]) + name + bytes([len(context)]) + context
    return hkdf_expand(secret, info, length)
def dh_keypair(seed):
    sk = derive_key(seed, b"OPAQUE-DeriveDiffieHellmanKeyPair")
    return sk, compress(mul(sk, G))
dh = lambda sk, pk: compress(mul(sk, decompress(pk)))
mac = lambda key, msg: hmac.new(key, msg, hashlib.sha256).digest()
xor = lambda a, b: bytes(x ^ y for x, y in zip(a, b))
h = bytes.fromhex
L2 = lambda b: len(b).to_bytes(2, "big") + b

# The test vector's inputs (its "random" values are fixed so runs can be compared).
oprf_seed = h("62f60b286d20ce4fd1d64809b0021dad6ed5d52a2c8cf27ae6582543a0a8dce2")
cred_id, password, context = b"1234", b"CorrectHorseBatteryStaple", b"OPAQUE-POC"
env_nonce = h("a921f2a014513bd8a90e477a629794e89fec12d12206dde662ebdcf65670e51f")
mask_nonce = h("38fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6d")
server_sk = int("c36139381df63bfc91c850db0b9cfbec7a62e86d80040a41aa7725bf0e79d5e5", 16)
server_pk = compress(mul(server_sk, G))
server_nonce = h("71cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1")
client_nonce = h("ab3d33bde0e93eda72392346a7a73051110674bbf6b1b7ffab8be4f91fdaeeb1")
c_eph_seed = h("633b875d74d1556d2a2789309972b06db21dfcc4f5ad51d7e74d783b7cfab8dc")
s_eph_seed = h("05a4f54206eef1ba2f615bc0aa285cb22f26d1153b5b40a1e85ff80da12f982f")
blind_reg = int("411bf1a62d119afe30df682b91a0a33d777972d4f2daa4b34ca527d597078153", 16)
blind_log = int("c497fddf6056d241e6cf9fb7ac37c384f49b357a221eb0a802c989b9942256c1", 16)

def server_oprf_key():                     # one per user, from a single server seed
    return derive_key(hkdf_expand(oprf_seed, cred_id + b"OprfKey", 32), b"OPAQUE-DeriveKeyPair")
def client_keys(rwd, nonce):               # what the envelope "holds": nothing secret
    auth_key = hkdf_expand(rwd, nonce + b"AuthKey", 32)
    export_key = hkdf_expand(rwd, nonce + b"ExportKey", 32)
    sk, pk = dh_keypair(hkdf_expand(rwd, nonce + b"PrivateKey", 32))
    return auth_key, export_key, sk, pk
def randomized_password(pw, blind_r, evaluated):
    y = finalize(pw, blind_r, evaluated)
    return hkdf_extract(b"", y + y)        # the KSF is the identity in the test vectors

# Registration: the server sees one blinded point and returns one evaluated point.
req = blind(password, blind_reg)
evaluated = mul(server_oprf_key(), req)
rwd = randomized_password(password, blind_reg, evaluated)
auth_key, export_key, client_sk, client_pk = client_keys(rwd, env_nonce)
envelope = env_nonce + mac(auth_key, env_nonce + server_pk + L2(server_pk) + L2(client_pk))
record = (client_pk, hkdf_expand(rwd, b"MaskingKey", 32), envelope)  # all the server keeps

# Login, KE1: a fresh blind, a nonce and an ephemeral key share.
c_eph_sk, c_eph_pk = dh_keypair(c_eph_seed)
ke1 = compress(blind(password, blind_log)) + client_nonce + c_eph_pk
# KE2: evaluate, mask (server key, envelope), ephemeral key share, MAC over the transcript.
cred_resp = compress(mul(server_oprf_key(), decompress(ke1[:33]))) + mask_nonce + xor(
    hkdf_expand(record[1], mask_nonce + b"CredentialResponsePad", 33 + 64), server_pk + record[2])
s_eph_sk, s_eph_pk = dh_keypair(s_eph_seed)
preamble = (b"OPAQUEv1-" + L2(context) + L2(record[0]) + ke1 + L2(server_pk) + cred_resp
            + server_nonce + s_eph_pk)
def keys(ikm):
    prk = hkdf_extract(b"", ikm)
    th = hashlib.sha256(preamble).digest()
    hs = label(prk, b"HandshakeSecret", th)
    return label(hs, b"ServerMAC", b""), label(hs, b"ClientMAC", b""), label(prk, b"SessionKey", th)
km2, km3, server_session = keys(dh(s_eph_sk, c_eph_pk) + dh(server_sk, c_eph_pk) + dh(s_eph_sk, record[0]))
server_mac = mac(km2, hashlib.sha256(preamble).digest())
ke2 = cred_resp + server_nonce + s_eph_pk + server_mac

# The client: unblind, unmask (server key, envelope), rebuild its key pair, check the tag.
def client_open(pw, ke2):
    rwd = randomized_password(pw, blind_log, decompress(ke2[:33]))
    pad = hkdf_expand(hkdf_expand(rwd, b"MaskingKey", 32), ke2[33:65] + b"CredentialResponsePad", 97)
    plain = xor(pad, ke2[65:162])
    spk, env = plain[:33], plain[33:]
    a_key, exp, sk, pk = client_keys(rwd, env[:32])
    ok = hmac.compare_digest(env[32:], mac(a_key, env[:32] + spk + L2(spk) + L2(pk)))
    return ok, spk, sk, exp
print("wrong password opens the envelope:", client_open(b"CorrectHorseBatteryStapler", ke2)[0])
ok, spk, my_sk, exp2 = client_open(password, ke2)
print("right password opens the envelope:", ok)
k2, k3, client_session = keys(dh(c_eph_sk, ke2[194:227]) + dh(c_eph_sk, spk) + dh(my_sk, ke2[194:227]))
print("server's MAC checks out:", hmac.compare_digest(ke2[227:], mac(k2, hashlib.sha256(preamble).digest())))
ke3 = mac(k3, hashlib.sha256(preamble + server_mac).digest())
print("server accepts KE3:", ke3 == mac(km3, hashlib.sha256(preamble + server_mac).digest()))
want = {"KE3": "e97cab4433aa39d598e76f13e768bba61c682947bdcf9936035e8a3a3ebfb66e",
        "session_key": "484ad345715ccce138ca49e4ea362c6183f0949aaaa1125dc3bc3f80876e7cd1",
        "export_key": "c3c9a1b0e33ac84dd83d0b7e8af6794e17e7a3caadff289fbd9dc769a853c64b"}
for name, got in (("KE3", ke3), ("session_key", client_session), ("export_key", exp2)):
    print(f"{name:<12}{got.hex()[:32]}...  RFC 9807 C.1.5: {got.hex() == want[name]}")
print("message sizes: KE1", len(ke1), " KE2", len(ke2), " KE3", len(ke3), "bytes")

# A thief with the record and the OPRF seed can still guess offline, one KSF per guess:
for guess in (b"123456", b"password", b"CorrectHorseBatteryStaple"):
    rwd_g = randomized_password(guess, 1, mul(server_oprf_key(), blind(guess, 1)))
    a_g, _, _, pk_g = client_keys(rwd_g, record[2][:32])
    if hmac.compare_digest(record[2][32:], mac(a_g, record[2][:32] + server_pk + L2(server_pk) + L2(pk_g))):
        print("thief with the record and the seed finds:", guess.decode())
```

It prints:

```text
wrong password opens the envelope: False
right password opens the envelope: True
server's MAC checks out: True
server accepts KE3: True
KE3         e97cab4433aa39d598e76f13e768bba6...  RFC 9807 C.1.5: True
session_key 484ad345715ccce138ca49e4ea362c61...  RFC 9807 C.1.5: True
export_key  c3c9a1b0e33ac84dd83d0b7e8af6794e...  RFC 9807 C.1.5: True
message sizes: KE1 98  KE2 259  KE3 32 bytes
thief with the record and the seed finds: CorrectHorseBatteryStaple
```

KE3, the session key and the export key match the RFC, and with a few more
comparisons the program also reproduces the registration record, KE1 and KE2
byte for byte. A real implementation adds point validation, constant-time
arithmetic and a real KSF.

### Why the server never sees the password

- **From registration:** one blinded point, uniform whatever the password, and
  a record that is random without the password *and* the OPRF key.
- **From each login:** another blinded point and a MAC. Each attempt tests one
  password, and rate limiting works as for ordinary logins (the Engineering
  book's
  [§13.9](../engineering/13-Passwords-on-the-Server.md#139-online-guessing-rate-limits-lockouts-and-credential-stuffing)
  covers limits and lockouts).
- **From its stolen database:** an offline attack that needs the OPRF seed,
  which can live in a hardware module, and runs the KSF for every guess. The
  KSF runs on the client, so the service can choose RFC 9807's recommended
  Argon2id with 2 GiB of memory without paying for it on its servers, the
  reverse of ordinary password hashing.
- **The export key:** never sent; the client can use it to encrypt data the
  server stores but cannot read.
- **Who has an account:** nothing. For an unknown name the server answers from
  a fake record, and masking makes the two answers look alike.

One thing OPAQUE cannot fix in a browser: the page that runs it comes from the
server, and a dishonest server can ship a page that posts the password. In a
browser OPAQUE protects against database thieves, logs and TLS-terminating
proxies, not against the service itself; signed native apps do better, and
the first large deployment, WhatsApp's backups (2021), was in an app.

## 11.11 Mars: a counter, not a clock

*Level: intermediate.*

An Arcadia resident logs in to a service on Earth. A TOTP code is valid for 30
seconds; the message carrying it takes 3 to 22 minutes to arrive. Every code
expires in transit. Widening the server's window to 45 minutes would accept
ninety codes at once, and make guessing ninety times easier. TOTP across the
gap is impossible.

HOTP, the counter version, works. The code depends only on the counter, not on
when it is used, so a code generated on Mars and checked on Earth an hour later
is still the next code in the sequence. The server's look-ahead window absorbs
codes that were generated but never sent. The price is that an HOTP code stays
valid until it is used, so it must be protected from theft in transit, which
the link's own encryption does.

PAKEs have the opposite problem: they are conversations. SRP needs two round
trips before the client knows it is talking to the right server; OPAQUE needs
three messages. Over a 44-minute round trip, a login would take more than an
hour. For the link to Earth, the city would use what Chapter 13 describes:
signatures by keys held on residents' devices, which can be checked whenever
they arrive. Inside the city, where delays are milliseconds, every protocol in
this chapter works as on Earth.

There is one subtler issue: TOTP assumes both sides count seconds since 1970 in
the same way. Clocks on Mars are synchronized to Earth's time standard, not to
the Martian day, precisely so that protocols like this, and the certificate and
DNSSEC validity periods of earlier chapters, keep working; the city's daily
schedule uses Mars time separately.

### Clocks in Arcadia

Inside the city, TOTP is only as good as the phones' clocks. Mars has no
satellite navigation system to hand out time, and a clock check with Earth
takes 6 to 44 minutes, but neither matters much. The city needs no round
trip: Earth broadcasts time one way, the one-way light time is known from the
planets' orbits to far better than a millisecond, and the city's own atomic
clocks hold the time between signals. (Even a naive NTP-style exchange, which
assumes equal delays both ways, would be off by only a fraction of a second.)

The clocks that matter are the cheap ones. A worked example: a phone
whose quartz crystal runs 20 parts per million fast gains
$20 \times 10^{-6} \times 86{,}400 = 1.73$ seconds a day. With a window of one
slot either side, codes keep working until the clock is about 30 seconds off,
which takes $30 / 1.73 \approx 17$ days. On the city's network the phone
corrects itself every few minutes and never gets near that. A rover crew out of
range for three weeks does get there, and their codes start failing on the way
home. The same arithmetic for better clocks, and for a drift only Mars has:

| Clock | Rate error | Time to drift 30 seconds |
| --- | --- | --- |
| uncorrected phone crystal | $2 \times 10^{-5}$, 1.73 s a day | about 17 days |
| temperature-compensated crystal | $10^{-6}$, 0.086 s a day | about 350 days |
| rubidium frequency standard | $10^{-11}$ | about 95,000 years |
| a Mars clock left unsteered against Earth's | 477 µs a day, on average | about 172 years |

The last line is relativity. Clocks on Mars run faster than clocks on Earth's
surface by 477 microseconds a day on average, varying by about 226
microseconds a day over the Martian year as Mars's distance from the Sun
changes, according to a 2025 calculation by Neil Ashby and Bijunath Patla of
NIST. For a 30-second window that is irrelevant, and the city steers its
clocks to Earth's time anyway. And a server that tracks each token's drift, as
RFC 6238 suggests, can follow a drifting rover phone as long as its crew logs
in more often than the drift takes to cross a slot.

### A window shifted by the light time

Could TOTP cross the gap if the server on Earth knew the delay? Suppose today's
one-way light time is $L = 751$ seconds (12 minutes 31 seconds). A server that
receives a code at time $t$ could check the slots around
$\lfloor (t - 751)/30 \rfloor$ instead of around $\lfloor t/30 \rfloor$. It
would still accept only three codes in a million, so guessing would be no
easier, and replay protection would work as before.

It fails for reasons outside cryptography. Traffic between the planets
travels as bundles in a delay-tolerant network (the Bundle Protocol,
RFC 9171), stored at relays until the next contact, an orbiter pass or a slot on a
large antenna, so a bundle can wait minutes or hours beyond the light time
and the shifted window misses. A typo costs a full round trip. And for about
two weeks every 26 months, when the Sun lies between the planets, there is no
link at all. The counter-based HOTP code, or better a signature that names
what it approves, survives all three.

## 11.12 In the real world

*Level: intermediate.*

- **What to deploy.** An authenticator app or hardware token with TOTP, with
  replay prevention and rate limiting across sessions, is far better than SMS.
  Where users can be phished, and that is everywhere, passkeys or security keys
  (Chapter 13) are better still. Push approvals need number matching.
- **Store the secrets well.** TOTP secrets are as sensitive as password hashes
  and more useful to a thief. Encrypt them at rest with a key held separately.
- **Recovery codes.** Most services give users ten single-use recovery codes
  when they enable two-factor login. They are passwords with a different name:
  store them as hashes.
- **The help desk is a factor too.** Many account takeovers bypass all of the
  above by calling support and asking for the second factor to be removed. The
  2023 attacks on casino operators in Las Vegas began with calls to IT help
  desks.
- **Lock the phone number.** Where SMS codes cannot be avoided, a carrier
  account PIN or port-out lock makes a SIM swap harder.
- **PAKEs in products.** SRP in Apple's keychain escrow, 1Password, Proton and
  Amazon Cognito; OPAQUE in WhatsApp's backup encryption, with open-source
  implementations such as Meta's `opaque-ke` in Rust and Cloudflare's in
  TypeScript; Dragonfly in WPA3 and in some VPNs; password-based Wi-Fi and
  Bluetooth pairing use related ideas. In web login, PAKEs never took hold, for
  the reason in §11.8 and the one at the end of §11.10.
- **New designs.** A system that must use passwords and controls its own
  client should use OPAQUE (RFC 9807) with Argon2id as its KSF, rather than
  SRP; a system that can avoid passwords should use passkeys.

## 11.13 Going deeper

*Level: expert.*

**What a PAKE proof says.** The standard security definition, from Bellare,
Pointcheval and Rogaway (EUROCRYPT 2000), says that an active attacker who runs
$q$ sessions should succeed with probability at most about $q/|D|$ for a
dictionary $D$, plus a negligible term: one guess per online attempt, and no
offline guessing at all from transcripts. Augmented PAKEs add that a stolen
server record requires an offline dictionary search, and OPAQUE's definition
(strong aPAKE) adds that the search cannot start before the theft. The proofs
are in the universal composability framework, which also covers users who
mistype a password into a different session.

**SRP's proofs, 25 years late.** SRP ran for two decades with no proof. In
2024 Dennis Dayanikli and Anja Lehmann (IEEE CSF 2024) gave the first, in the
universal composability framework, under a new assumption (additive
simultaneous Diffie-Hellman) and with a simulator given unusual extra power. A
2025 follow-up (IACR ePrint 2025/1869) argued that SRP is probably not
UC-secure in the usual sense and proved a game-based result instead. SRP-6a
has resisted attack, but it was never designed around a proof; OPAQUE was.

**Why 3DH and not signatures.** OPAQUE's key exchange authenticates both sides
by mixing their long-term keys into Diffie-Hellman values, which keeps the
client's key pair a plain one re-derived from the password and gives
**key-compromise impersonation** resistance: someone who steals the client's
private key can impersonate the client but still cannot impersonate the server
to the client, because the server's part of the secret needs the server's
private key. RFC 9807 allows other three-message key exchanges, such as SIGMA
with signatures (Chapter 1), in place of 3DH.

**OPRFs elsewhere.** The same blinded evaluation powers Privacy Pass (RFC 9576
and following, 2024), which issues anonymous tokens proving that a user passed a
check without linking later uses, and private set intersection, used by
password breach checkers to test whether a password appears in a leaked list
without revealing it.

**Post-quantum PAKEs.** All the PAKEs here rest on Diffie-Hellman. A quantum
computer that can compute discrete logarithms could recover the password from a
recorded transcript by testing guesses against the logarithms, turning online
guessing into offline guessing after the fact. Lattice-based PAKEs and OPAQUE
with post-quantum key exchanges are active research; none is standardized.
Book 5, *Post-quantum cryptography*, covers the building blocks.

## Check yourself

??? question "1. How does Lamport's hash chain let a server check a password without storing any secret?"
    The server stores $H^n(w)$. The user sends $H^{n-1}(w)$; the server hashes it
    once and compares, then stores the new value. Computing the next password
    would require inverting the hash.

??? question "2. A TOTP server's clock reads 1,111,111,111 and it accepts one slot either side. A phone 40 seconds slow shows its code. Is it accepted?"
    No. The server's slot is $\lfloor 1{,}111{,}111{,}111/30 \rfloor = 37{,}037{,}037$,
    so it accepts slots 37,037,036 to 37,037,038. The phone reads
    1,111,111,071, and $\lfloor 1{,}111{,}111{,}071/30 \rfloor = 37{,}037{,}035$
    (since $30 \times 37{,}037{,}035 = 1{,}111{,}111{,}050$), two slots back. A
    server that tracks each token's drift, as RFC 6238 suggests, would have
    moved this phone's window and accepted it.

??? question "3. Why can't the server store TOTP secrets as hashes, the way it stores passwords?"
    It needs the secret itself to compute the expected code. A hash would not
    let it compute HMACs. The secrets must be encrypted under a key kept
    elsewhere, and the 2011 SecurID theft shows what happens when one place
    holds many customers' secrets.

??? question "4. Name three ways one-time codes are stolen, and the defense against each."
    SIM swaps and SS7 interception (use an app or hardware token, not SMS);
    real-time phishing proxies (use origin-bound keys, Chapter 13); push
    fatigue (number matching).

??? question "5. Why does HMAC challenge-response with a password allow offline guessing?"
    The transcript contains a challenge and a value computed from the password
    and that challenge alone; an eavesdropper computes the same for each guess
    and compares.

??? question "6. What does an SRP server store, and what can a thief do with it?"
    The salt $s$ and verifier $v = g^x$. The thief can test guesses offline by
    computing $g^x$ for each; since $s$ is given to anyone who starts a login,
    the guesses can even be precomputed before the theft.

??? question "7. In SRP-3 a fake server sends $B = v_1 + v_2$ for two candidate passwords. Why can it test both in one run, and why does SRP-6a's $k$ stop it?"
    The client computes $(B - v)^{a+ux}$. If its password is the first
    candidate, $B - v_1 = v_2 = g^{x_2}$, whose logarithm the fake server
    knows, so it can compute $S = A^{x_2} g^{u x_1 x_2}$ and compare with the
    client's proof; symmetrically for the second. With
    $B = k(v_1 + v_2)$ the client's base becomes $k g^{x_2}$, and computing $S$
    needs the logarithm of $k$. SRP-6's $k = 3$ fails if the attacker chooses
    the group (say $g = 3$); SRP-6a's $k = H(N \,\|\, g)$ cannot be arranged.

??? question "8. In the toy OPRF modulo 23 (group order 11), the password hashes to 9, the server's key is 7 and the client blinds with $r = 5$. What crosses the network, and what does the client end up with?"
    The client sends $9^5 \equiv 8$; the server returns $8^7 \equiv 12$; the
    client raises 12 to $1/5 \equiv 9 \pmod{11}$ and gets $12^9 \equiv 4 = 9^7$.
    The server saw 8, which is uniformly distributed over the group whatever the
    password, so it learned nothing. Unlike an SRP verifier, the result depends
    on the server's secret key, so nothing can be precomputed before a theft.

??? question "9. Why did PAKEs never replace passwords in web logins?"
    The browser shows a password box that any page can imitate; a user who
    types the password into a phishing page hands it over before any protocol
    runs. And the page that would run the PAKE is itself served by the server,
    which could ship code that sends the password. PAKEs protect against
    networks and database thieves, not misdirected typing.

??? question "10. Why does HOTP work between Earth and Mars when TOTP does not, even with a window shifted by the known light time?"
    An HOTP code depends only on a counter and stays valid until used. A TOTP
    code is valid for about a minute; shifting the window by the day's light
    time would work only if delivery took exactly the light time, but traffic
    between the planets is stored and forwarded at relays for unpredictable
    minutes or hours, and stops entirely near solar conjunction.

## What you learned

- One-time codes are MACs of a counter (HOTP) or the time (TOTP), truncated to
  six digits; the RFCs' test values can be reproduced in a few lines.
- Servers need a small window, replay prevention, cross-session rate limits and
  well-protected secrets.
- Codes are stolen by SIM swap and SS7 (for SMS), by real-time phishing proxies
  (for every typed code) and by push fatigue (for approvals without number
  matching).
- PAKEs keep passwords off the network and transcripts: balanced ones
  (Dragonfly, CPace) share the password; augmented ones (SRP, OPAQUE) store a
  verifier.
- SRP's verifier allows precomputation because the salt is public; OPAQUE's
  oblivious PRF prevents it and keeps the password from the server entirely.
- SRP-3's $B = v + g^b$ let a fake server test two passwords per run; SRP-6a's
  $k = H(N, g)$ and $u = H(A, B)$ fixed that and the verifier-thief attack.
- A blinded OPRF input is uniform whatever the password; RFC 9497's vectors
  and a full RFC 9807 OPAQUE run fit in two short programs.
- On Mars, codes work inside the city on local clocks; across the gap,
  store-and-forward delays defeat any clock window.
- None of this stops a person typing a secret into the wrong page; that needs
  keys bound to the site's origin.

**Next:** [Chapter 12](12-Kerberos.md), the protocol that logs in a whole
organization at once.

## Further reading

- Leslie Lamport, "Password authentication with insecure communication",
  *Communications of the ACM* 24(11) (1981).
- RFC 1760 (S/KEY, 1995), RFC 4226 (HOTP, 2005), RFC 6238 (TOTP, 2011), RFC 6287
  (OCRA challenge-response, 2011).
- NIST SP 800-63B-4, *Digital identity guidelines: authentication and
  authenticator management* (2025).
- Steven M. Bellovin and Michael Merritt, "Encrypted key exchange:
  password-based protocols secure against dictionary attacks" (IEEE S&P 1992).
- Thomas Wu, "The secure remote password protocol" (NDSS 1998); RFC 2945 and
  RFC 5054.
- Mihir Bellare, David Pointcheval and Phillip Rogaway, "Authenticated key
  exchange secure against dictionary attacks" (EUROCRYPT 2000).
- Stanisław Jarecki, Hugo Krawczyk and Jiayu Xu, "OPAQUE: an asymmetric PAKE
  protocol secure against pre-computation attacks" (EUROCRYPT 2018).
- Thomas Wu, "SRP-6: improvements and refinements to the Secure Remote
  Password protocol", submission to IEEE P1363.2 (2002).
- Matthew Green, "Should you use SRP?", *A Few Thoughts on Cryptographic
  Engineering* (2018).
- Dennis Dayanikli and Anja Lehmann, "Provable security analysis of the Secure
  Remote Password protocol" (IEEE CSF 2024; IACR ePrint 2023/1457), and the
  follow-up IACR ePrint 2025/1869 (2025).
- RFC 9497 (OPRFs, 2023), RFC 9380 (hashing to elliptic curves, 2023) and
  RFC 9807 (OPAQUE, 2025).
- Andy Greenberg, "The full story of the stunning RSA hack can finally be
  told", *Wired* (May 2021).
- FBI IC3, public service announcement on SIM swapping (February 2022);
  Group-IB on 0ktapus (August 2022); Microsoft Security on AiTM phishing (July
  2022); Cisco Talos on the Cisco intrusion (August 2022).
- Neil Ashby and Bijunath Patla, "A comparative study of time on Mars with
  lunar and terrestrial clocks", *The Astronomical Journal* (2025).
- RFC 9171 (Bundle Protocol version 7, 2022).
- Björn Haase and Benoît Labrique, "AuCPace: efficient verifier-based PAKE
  protocol tailored for the IIoT" (TCHES 2019), and the CPace Internet-Draft.
- WhatsApp, "Security of end-to-end encrypted backups" (2021).
