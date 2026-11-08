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
    - SRP, run against RFC 5054's test values, and what a stolen verifier gives
      an attacker;
    - OPAQUE and its oblivious PRF, and CPace;
    - why a counter works between Earth and Mars and a clock does not.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (offline and
    online guessing); HMAC and password hashing from Chapters
    [10](../../book/10-Message-Authentication.md) and
    [11](../../book/11-Passwords-and-Key-Derivation.md) of book 1, and
    Diffie-Hellman from [Chapter 12](../../book/12-Diffie-Hellman.md).

    **Levels:** §11.1 to §11.3 are for beginners, §11.4 to §11.10 are
    intermediate, §11.11 is expert.

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

Enrolment is a QR code. The server draws a random secret of 160 bits, stores it
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

**The secret is the weak point.** The server cannot hash the shared key the way
it hashes passwords, because it needs the key itself to compute codes. A
leaked table of secrets gives an attacker every user's codes forever. The most
famous case was the 2011 breach of RSA Security, whose SecurID tokens use a
proprietary time-based algorithm with a factory-installed seed: attackers stole
information about the seeds, the company replaced some 40 million tokens, and
the defense contractor Lockheed Martin reported an attempted intrusion that
used the stolen data. A smaller version happened in 2023: Google Authenticator
had begun syncing secrets to users' Google accounts that April, and in August
an attacker who took over an employee's Google account at the software company
Retool obtained that employee's codes along with it.

## 11.5 How codes are stolen

*Level: intermediate.*

A one-time code defeats an attacker who has only the password. It does not
defeat an attacker who can get the code too, and there are three common ways.

**SMS.** Many services send the code by text message rather than computing it
in an app. A text message is not cryptographically bound to the phone; it is
delivered to whatever SIM card the mobile operator says holds the number. In a
**SIM swap**, the attacker persuades or bribes an operator's employee to move
the victim's number to a new SIM, then receives every code. In August 2019 the
Twitter account of Twitter's own chief executive was taken over this way.
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
<figcaption>Figure 11.3. Real-time phishing. The code does its job, proving the user has the phone; it just proves it to the attacker.</figcaption>
</figure>

**Push fatigue.** Some services skip the code and send a push notification:
"Is this you signing in? Approve / Deny". An attacker with the password can
trigger dozens of these, at night, until the user taps Approve to make them
stop. In September 2022 an attacker got into Uber's internal systems this way,
after messaging the employee while posing as company IT. The fix is **number
matching**: the login page shows a two-digit number and the user must type it
into the app, which proves the user is looking at the login they are
approving. Microsoft made number matching mandatory in its Authenticator app in
May 2023.

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
implementation adds it. Worse, the salt $s$ is sent to anyone who starts a
login for user $I$, before any authentication. An attacker can collect the salt
in advance and precompute guesses for that user, so that the moment the
database is stolen the password falls. SRP also has a long history of
implementation mistakes, such as servers that accept $A = 0$ or $A = N$, which
makes the shared secret zero and lets anyone log in. The protocol was designed
in 1998 around integer groups, and its proof came much later and only for
variants.

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
exchange with their key pairs (in RFC 9807, a 3-message protocol in the style
of SIGMA from Chapter 1).

### Code it: the oblivious PRF

The program implements the OPRF on P-256 with a simplified hash-to-curve, and a
minimal envelope. It is the part of OPAQUE that does what SRP cannot.

```python
# The idea inside OPAQUE (RFC 9807): an oblivious PRF on P-256. The server holds
# a per-user key k and computes H(password)^k for the client without seeing the
# password. Simplified hash-to-curve and envelope; the structure is OPAQUE's.
import hashlib, hmac
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
b = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b
def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    if P == Q: l = (3 * P[0] * P[0] - 3) * pow(2 * P[1], -1, p) % p
    else:      l = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x = (l * l - P[0] - Q[0]) % p
    return (x, (l * (P[0] - x) - P[1]) % p)
def mul(k, P):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1": R = add(R, P)
    return R
def hash_to_curve(data):                         # try-and-increment (RFC 9380 does better)
    for ctr in range(256):
        x = int.from_bytes(hashlib.sha256(data + bytes([ctr])).digest(), "big") % p
        rhs = (x ** 3 - 3 * x + b) % p
        if pow(rhs, (p - 1) // 2, p) == 1:
            return (x, pow(rhs, (p + 1) // 4, p))
def enc(P): return P[0].to_bytes(32, "big") + P[1].to_bytes(32, "big")
rand = lambda label: int.from_bytes(hashlib.sha256(label).digest(), "big") % n

def oprf_client_blind(password, r):
    return mul(r, hash_to_curve(password))                    # sent: looks random
def oprf_server(k, blinded):
    return mul(k, blinded)
def oprf_client_finish(password, r, evaluated):
    unblinded = mul(pow(r, -1, n), evaluated)                 # = H(password)^k
    return hashlib.sha256(password + enc(unblinded)).digest() # randomized password

def seal(rwd, secret):                                        # the "envelope"
    stream = hashlib.sha256(rwd + b"enc").digest()
    ct = bytes(x ^ y for x, y in zip(secret, stream))
    return ct, hmac.new(rwd, ct, hashlib.sha256).digest()
def open_env(rwd, ct, tag):
    if not hmac.compare_digest(tag, hmac.new(rwd, ct, hashlib.sha256).digest()): return None
    return bytes(x ^ y for x, y in zip(ct, hashlib.sha256(rwd + b"enc").digest()))

# Registration: the server picks k for jim; the client makes a key pair and seals
# its private key under the OPRF output. The server stores k and the envelope.
k_jim = rand(b"server's OPRF key for jim")
client_private = hashlib.sha256(b"jim's login private key").digest()
r1 = rand(b"blind 1")
rwd = oprf_client_finish(b"red-dust-2026", r1, oprf_server(k_jim, oprf_client_blind(b"red-dust-2026", r1)))
record = (k_jim, seal(rwd, client_private))

# Login: blind with a fresh r, get the evaluation, open the envelope.
r2 = rand(b"blind 2")
m1, m2 = oprf_client_blind(b"red-dust-2026", r1), oprf_client_blind(b"red-dust-2026", r2)
print("two logins send unrelated values:", m1 != m2, "  server sees", enc(m2).hex()[:24] + "...")
rwd2 = oprf_client_finish(b"red-dust-2026", r2, oprf_server(record[0], m2))
print("right password opens the envelope:", open_env(rwd2, *record[1]) == client_private)
rwd3 = oprf_client_finish(b"red-dust-2025", r2, oprf_server(record[0], oprf_client_blind(b"red-dust-2025", r2)))
print("wrong password opens it:", open_env(rwd3, *record[1]) is not None)

# A thief with the whole record can still guess offline, but each user's k is
# different, so nothing can be computed before the theft.
for guess in [b"123456", b"password", b"red-dust-2026"]:
    trial = hashlib.sha256(guess + enc(mul(record[0], hash_to_curve(guess)))).digest()
    if open_env(trial, *record[1]) is not None:
        print("thief with the record found it offline:", guess.decode())
```

```text
two logins send unrelated values: True   server sees b3039f6afb8289c70bec833e...
right password opens the envelope: True
wrong password opens it: False
thief with the record found it offline: red-dust-2026
```

Look at what each party has. The server sees a different random-looking point
at every login and never sees the password or anything computed from it alone.
A wrong password gives a different randomized password, and the envelope
refuses to open. A thief who steals the whole record can still guess offline,
by evaluating the OPRF for each guess with the stolen $k$; no protocol can
prevent that, since the thief has everything the server had. But two things
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
<figcaption>Figure 11.4. Three ways to log in with a password. The PAKEs change what a phishing page or a server thief can do; none can stop guesses with a stolen record.</figcaption>
</figure>

Note one thing the figure shows that is easy to miss: a phishing page that
imitates a PAKE login gets no password at all, only a failed protocol run,
**if** the user types the password into the real client software. If the
phishing page simply shows a password box, the user types the password into
it, and the PAKE never runs. PAKEs protect passwords from servers and
networks, not from people who type them into the wrong place. That is why the
web never adopted them for logins in browsers, and why it moved to passkeys.

## 11.9 Mars: a counter, not a clock

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

## 11.10 In the real world

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
- **PAKEs in products.** SRP in Apple's keychain escrow and 1Password; OPAQUE in
  WhatsApp's backup encryption; Dragonfly in WPA3 and in some VPNs;
  password-based Wi-Fi and Bluetooth pairing use related ideas. In web login,
  PAKEs never took hold, for the reason in §11.8.

## 11.11 Going deeper

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

**Why SRP's $k$ and $u$.** The original SRP-3 set $B = v + g^b$, which allowed
a two-for-one guessing attack: an attacker posing as the server could test two
passwords per run. SRP-6 (2002) added the multiplier $k$ to remove it, and
SRP-6a made $k$ a hash of the group parameters. The scrambler $u$ must not be
known before $A$ is sent, or a client who knows only $v$ (a server thief) could
impersonate the user. These fixes are why "SRP" without a version number is
ambiguous.

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

??? question "2. What is dynamic truncation in HOTP?"
    The low four bits of the HMAC's last byte choose an offset; the four bytes
    there, with the top bit cleared, form a 31-bit number whose last six (or
    eight) decimal digits are the code.

??? question "3. Why must a TOTP server remember the last step it accepted?"
    Otherwise the same code could be used again within its window, by someone
    who saw it on a screen or intercepted it.

??? question "4. Why can't the server store TOTP secrets as hashes, the way it stores passwords?"
    It needs the secret itself to compute the expected code. A hash would not
    let it compute HMACs.

??? question "5. Name three ways one-time codes are stolen, and the defense against each."
    SIM swaps and SS7 interception (use an app or hardware token, not SMS);
    real-time phishing proxies (use origin-bound keys, Chapter 13); push
    fatigue (number matching).

??? question "6. Why does HMAC challenge-response with a password allow offline guessing?"
    The transcript contains a challenge and a value computed from the password
    and that challenge alone; an eavesdropper computes the same for each guess
    and compares.

??? question "7. What does an SRP server store, and what can a thief do with it?"
    The salt $s$ and verifier $v = g^x$. The thief can test guesses offline by
    computing $g^x$ for each; since $s$ is given to anyone who starts a login,
    the guesses can even be precomputed before the theft.

??? question "8. What does the OPRF in OPAQUE achieve that SRP's verifier does not?"
    The password-derived key depends on a per-user server secret $k$, so
    nothing can be precomputed before a theft, and $k$ can be kept in separate
    hardware. The server never sees the password or a value computed from it
    alone.

??? question "9. Why did PAKEs never replace passwords in web logins?"
    The browser shows a password box that any page can imitate; a user who
    types the password into a phishing page hands it over before any protocol
    runs. PAKEs protect against networks and servers, not misdirected typing.

??? question "10. Why does HOTP work between Earth and Mars when TOTP does not?"
    An HOTP code depends only on a counter and stays valid until used; a TOTP
    code expires after 30 seconds, much less than the light delay.

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
- RFC 9497 (OPRFs, 2023) and RFC 9807 (OPAQUE, 2025).
- Björn Haase and Benoît Labrique, "AuCPace: efficient verifier-based PAKE
  protocol tailored for the IIoT" (TCHES 2019), and the CPace Internet-Draft.
- WhatsApp, "Security of end-to-end encrypted backups" (2021).
