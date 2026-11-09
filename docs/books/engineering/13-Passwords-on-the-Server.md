# 13. Passwords on the Server

*Book 1 explains why passwords are stored with a slow, salted hash and how
PBKDF2, bcrypt, scrypt and Argon2 work. This chapter is about running one:
the decisions an operator makes on the day a login page goes live and for
the ten years after. You will choose parameters from today's guidance and
then measure what they cost on your own machine, read and write the encoded
hash strings that carry those parameters, add a pepper and decide where it
lives, upgrade a table of old MD5 hashes without asking anyone to reset,
check new passwords against a breach list without sending the password
anywhere, write the rules NIST now asks for, slow down guessing at the login
page, and build a password reset link that cannot be guessed, replayed or
stolen from the database.*

!!! abstract "In this chapter"
    **You will learn:**

    - how to pick Argon2id, scrypt, bcrypt or PBKDF2 parameters from RFC 9106
      and the OWASP cheat sheet, and why you must then measure them yourself;
    - how to plan login capacity and memory, and why a long password can be
      a denial of service;
    - how the PHC string format and the older `crypt` strings carry the
      algorithm, parameters and salt, and what bcrypt's 72-byte limit does
      in practice;
    - what a pepper adds, the two ways to apply one, and why it belongs in
      an HSM or a key management service;
    - how to wrap old MD5 or SHA-1 hashes inside a slow hash today and
      remove them for good at each user's next login, as Facebook described
      in 2014, and how "hash shucking" attacks a careless wrap;
    - how the Pwned Passwords range API checks a password against a breach
      list with k-anonymity;
    - what SP 800-63B requires: length over composition, no forced
      rotation, blocklists;
    - how rate limits and lockouts slow online guessing, and why credential
      stuffing gets around them;
    - why account recovery is the weak door, and how to build a reset token
      that is random, short-lived, single-use and hashed at rest.

    **You need:** book 1, [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md)
    (salts, stretching, PBKDF2, bcrypt, scrypt and Argon2; this chapter does not
    teach them again), [Chapter 2](02-Bytes-Encodings-and-Text.md) (Unicode
    normalization and PRECIS for passwords) and
    [Chapter 4](04-Randomness-in-Practice.md) (the `secrets` module). The
    protocols that keep the password off the server altogether are in
    [Protocols, Chapter 11](../protocols/11-One-Time-Codes-and-Password-Protocols.md)
    (one-time codes, SRP, OPAQUE) and
    [Protocols, Chapter 13](../protocols/13-Passkeys-FIDO2-and-WebAuthn.md) (passkeys).

    **Levels:** §13.1, §13.2 and §13.8 are for beginners; §13.3 to §13.7 and
    §13.9 to §13.11 are intermediate; §13.12 is expert.

## 13.1 The problem

*Level: beginner.*

A password store is a liability that a service takes on because it has to.
Nobody wants the job of keeping a hundred million secrets that people also
use at their bank. The service needs only one thing from the password: a
yes or no at login. Everything else it holds, and everything it does with
the password on the way in and out, is risk.

Book 1 tells how the industry learned to hold that risk. The CTSS password
file was printed as the message of the day in 1966; Unix added salt and a
deliberately slow function in 1979; RockYou kept 32 million passwords in
plain text in 2009; LinkedIn used unsalted SHA-1 in 2012; Adobe encrypted
instead of hashing in 2013; Ashley Madison used bcrypt correctly in 2015 and
lost the passwords anyway through a second, weaker copy. That history ends
in a short answer: store a slow, salted, memory-hard hash such as Argon2id
([§11.7](../../book/11-Passwords-and-Key-Derivation.md#117-argon2)), with
the parameters kept beside it, and compare in constant time. The 40-line
password store in [§11.8](../../book/11-Passwords-and-Key-Derivation.md#118-code-it-a-password-store)
does exactly that.

This chapter starts where §11.8 stops, because the algorithm is the easy part.
The breaches in [§11.9](../../book/11-Passwords-and-Key-Derivation.md#119-breaches-as-stories)
are mostly not failures of an algorithm. They are failures of operation:
parameters chosen once and never raised (LastPass), an old fast hash left
beside a new slow one (Ashley Madison), a password written to a log before it
was hashed (Facebook, 2019), a hash function fed more bytes than it reads
(Okta, 2024). And many of the accounts lost every year are lost with no
database breach at all, through the login page and the "forgot your password"
link.

So the question here is the operator's: **what does a server have to do,
around the hash, to keep passwords from becoming someone else's?** It does
five things, and Figure 13.1 puts them on one page.

1. **At sign-up**, it decides whether a password is acceptable (length, a
   breach list, nothing about symbols), prepares its text (Chapter 2), and
   stores a slow hash with a salt, parameters and perhaps a pepper.
2. **At login**, it limits how fast anyone can guess, checks the password in
   constant time, and, if the stored hash is out of date, replaces it with a
   current one while the password is in hand.
3. **At reset**, it proves the requester owns the account by some other
   channel, usually an emailed link, without making that link a second,
   weaker password.
4. **Over the years**, it raises the cost as hardware gets faster and moves
   old hashes onto new algorithms without locking anyone out.
5. **Everywhere else**, it keeps the password out of logs, crash dumps,
   analytics and error messages, where no hash protects it.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The server's password surface: sign-up, login and reset paths leading to a stored hash, with a pepper service beside it and logs and backups as places the password can leak" fill="currentColor" font-size="14">
<rect x="20" y="20" width="150" height="60" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95" y="45" text-anchor="middle" font-weight="bold">sign-up</text>
<text x="95" y="65" text-anchor="middle" font-size="12">length, breach list</text>
<rect x="20" y="130" width="150" height="60" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95" y="155" text-anchor="middle" font-weight="bold">login</text>
<text x="95" y="175" text-anchor="middle" font-size="12">rate limit, verify</text>
<rect x="20" y="240" width="150" height="60" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95" y="265" text-anchor="middle" font-weight="bold">reset</text>
<text x="95" y="285" text-anchor="middle" font-size="12">token by email</text>
<line x1="170" y1="50" x2="250" y2="140" stroke="currentColor" stroke-width="1.4"/>
<line x1="170" y1="160" x2="250" y2="160" stroke="currentColor" stroke-width="1.4"/>
<line x1="170" y1="270" x2="250" y2="180" stroke="currentColor" stroke-width="1.4"/>
<rect x="250" y="120" width="160" height="80" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="148" text-anchor="middle" font-weight="bold">slow hash</text>
<text x="330" y="168" text-anchor="middle" font-size="12">salt + parameters</text>
<text x="330" y="186" text-anchor="middle" font-size="12">rehash if out of date</text>
<line x1="410" y1="160" x2="470" y2="160" stroke="currentColor" stroke-width="1.4"/>
<rect x="470" y="130" width="150" height="60" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="545" y="155" text-anchor="middle" font-weight="bold">database</text>
<text x="545" y="175" text-anchor="middle" font-size="12">one string per user</text>
<rect x="250" y="20" width="160" height="60" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="330" y="45" text-anchor="middle" font-weight="bold">pepper service</text>
<text x="330" y="65" text-anchor="middle" font-size="12">HSM or KMS, §13.5</text>
<line x1="330" y1="80" x2="330" y2="120" stroke="currentColor" stroke-width="1.4"/>
<rect x="250" y="240" width="370" height="60" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="435" y="265" text-anchor="middle" font-weight="bold">where no hash protects it</text>
<text x="435" y="285" text-anchor="middle" font-size="12">request logs, crash dumps, analytics, error reports</text>
<text x="545" y="220" text-anchor="middle" font-size="12" opacity="0.7">backups copy this too</text>
</svg>
<figcaption>Figure 13.1. The server's password surface. Three doors lead to one stored string; a pepper can sit in a separate service; and the dashed box at the bottom is where passwords leak in plain text, before any hash has run.</figcaption>
</figure>

Two kinds of attacker matter, and they need different defenses. The
**offline** attacker has a copy of the database and guesses on their own
hardware, as fast as their money allows; only the cost of each hash, and a
pepper they do not have, slow them down. The **online** attacker has no copy
and guesses through your login page; rate limits, second factors and breach
checks slow them down, and the hash cost does nothing except load your
servers. Most of the decisions below are about one or the other, and a few
(the reset link above all) are about both.

Some of this work can be avoided. A passkey ([Protocols, Chapter 13](../protocols/13-Passkeys-FIDO2-and-WebAuthn.md))
gives the server a public key instead of a password, so there is nothing to
hash, leak or phish; an augmented PAKE such as OPAQUE
([Protocols, §11.8](../protocols/11-One-Time-Codes-and-Password-Protocols.md#118-opaque-and-cpace))
lets the server check a password it never sees. Both are worth deploying.
But almost every service that offers them still accepts passwords for some
users and still has a reset link, so this chapter's work does not go away.

## 13.2 Choosing parameters today

*Level: beginner.*

The first decision is which function and how much work. Two documents are the
usual starting points, and they do not agree, for good reasons.

**RFC 9106** (September 2021) is the Argon2 specification, written by the
algorithm's designers. Its §4 gives two "uniformly safe" defaults for
Argon2id, both with a 128-bit salt and a 256-bit tag:

- the **first recommended option**: $t = 1$ pass, $p = 4$ lanes, $m = 2^{21}$
  KiB, which is **2 GiB** of memory;
- the **second recommended option**, "if much less memory is available":
  $t = 3$, $p = 4$, $m = 2^{16}$ KiB, which is **64 MiB**.

It also gives a procedure for everyone else: pick Argon2id, pick 4 lanes,
work out the most memory one call can afford, work out the most time, then
raise $t$ until the time runs out (and if even $t = 1$ is too slow, lower the
memory). The RFC's own examples include "backend server authentication, which
takes 0.5 seconds on a 2 GHz CPU using 4 cores", with 4 GiB of memory.

Those numbers are aimed at the attacker's cost, not the defender's budget.
Two gigabytes per login is fine for unlocking a disk or a password manager
once a day. It is not fine for a web service that may see a hundred logins a
second: at a quarter of a second each, that is 25 hashes in flight at once,
50 GiB of memory for the login path alone.

**The OWASP Password Storage Cheat Sheet** is written for that web service.
As read in November 2026 (it is revised every year or two, so check it), it
says:

| Function | OWASP minimum | Notes |
| --- | --- | --- |
| Argon2id | $m$ = 19 MiB, $t$ = 2, $p$ = 1 | or the equal-cost trade-offs 46 MiB/$t$=1, 12 MiB/$t$=3, 9 MiB/$t$=4, 7 MiB/$t$=5 |
| scrypt | $N = 2^{17}$, $r$ = 8, $p$ = 1 (128 MiB) | or $2^{16}$/$p$=2, $2^{15}$/$p$=3, $2^{14}$/$p$=5, $2^{13}$/$p$=10 |
| bcrypt | cost 10 or more | legacy systems only; enforce the 72-byte limit (§13.4) |
| PBKDF2-HMAC-SHA256 | 600,000 iterations | when FIPS 140-3 validated code is required |
| PBKDF2-HMAC-SHA512 | 220,000 iterations | |
| PBKDF2-HMAC-SHA1 | 1,400,000 iterations | legacy only |

The OWASP rows are **floors**, chosen so that a modest server can afford them
for every login. The trade-off rows are designed to cost an attacker about
the same on a GPU: less memory, more passes. RFC 9106's options are more like
ceilings, chosen so that the attacker's cost is as high as a general-purpose
machine can push it. The useful reading is: start at or above the OWASP
floor, go as far toward RFC 9106 as your hardware and traffic allow, and never
below the floor.

The PBKDF2 numbers have a history worth knowing because they move. OWASP
recommended 310,000 iterations of PBKDF2-HMAC-SHA256 in 2021 and raised it to
600,000 in early 2023, after measuring how fast a current GPU computes it;
the SHA-1 and SHA-512 rows moved at the same time and again since. The rows
are tuned so that each costs an attacker about the same per guess, which is
why SHA-1, the fastest on a GPU, needs the most iterations. Django, which uses
PBKDF2 by default, raises its iteration count in every major release for the
same reason. Any number you copy into your code is a number someone will
have to raise.

**Which function.** For a new system the choice is short:

1. **Argon2id**, through a maintained library (libsodium's `crypto_pwhash`,
   the reference `libargon2` under bindings such as `argon2-cffi`, Go's
   `x/crypto/argon2`, Bouncy Castle, OpenSSL 3.2 and later). Do not write
   your own.
2. **scrypt** where Argon2id is not available. It is in OpenSSL and in
   Python's `hashlib`, which is why this chapter's code uses it.
3. **bcrypt** only where it is already deployed, at cost 10 or more, with the
   72-byte limit handled (§13.4).
4. **PBKDF2-HMAC-SHA256** where a FIPS 140-3 validated module is required.
   PBKDF2 is the one in SP 800-132 and in validated modules today. NIST has
   said it will revise SP 800-132 to add a memory-hard function, but until a
   revision is published the compliance answer is PBKDF2, with a very high
   iteration count to make up for its lack of memory-hardness.

The reference pages for each function are
[Argon2](../../08-kdf-password-hashing/Argon2.md),
[scrypt](../../08-kdf-password-hashing/scrypt.md),
[bcrypt](../../08-kdf-password-hashing/bcrypt.md) and
[PBKDF2](../../08-kdf-password-hashing/PBKDF2.md); the
[retired schemes](../../08-kdf-password-hashing/Retired.md) (DES-crypt,
MD5-crypt, PBKDF1) are what you will find in old tables and must upgrade
(§13.6).

**What the parameters buy.** It helps to remember the units. A GPU computes
about 160 billion MD5 hashes a second
([Cryptanalysis, §4.3](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md#43-the-price-of-a-key-search-1977-to-today)).
The same card manages on the order of a few hundred thousand bcrypt hashes a
second at the cost 5 that benchmarks use, and every step of cost halves that;
memory-hard functions at tens of megabytes run worse still on a GPU because
each guess needs its own block of memory. Each doubling of the defender's work
removes one bit from the attacker's progress, which is why the cost matters
most for the passwords in the middle of the distribution: the top hundred
("123456", "password") fall at any cost, and a random 20-character password
survives at any cost. The stretching is for everyone in between, which is most
people (book 1, [§11.13](../../book/11-Passwords-and-Key-Derivation.md#1113-going-deeper)).

**Salt and output length.** Use 16 random bytes of salt per password, from the
operating system's generator ([Chapter 4](04-Randomness-in-Practice.md)), and
32 bytes of output. A longer output does not slow the attacker, and with PBKDF2
it hands them a shortcut: asking PBKDF2 for more than one hash length makes the
defender do the full work several times while the attacker checks only the first
block (book 1, §11.13). Never derive the salt from the username: two services
with the same software would then share salts for every common username.

**What to do.**

1. Use Argon2id at or above OWASP's floor (19 MiB, $t = 2$, $p = 1$), and as
   much higher as your measurements in §13.3 allow; scrypt at $N = 2^{17}$,
   $r = 8$, $p = 1$ if Argon2id is not available.
2. If you need FIPS, use PBKDF2-HMAC-SHA256 at 600,000 iterations or more,
   and ask for exactly 32 bytes.
3. Store the parameters with every hash (§13.4), so you can raise them later
   without guessing what the old ones were.
4. Put a date in your calendar to recheck the OWASP numbers every year, and
   raise yours when they move.

## 13.3 Measuring cost on your own hardware

*Level: intermediate.*

Every published number assumes someone else's machine. A parameter that takes
50 milliseconds on a developer's laptop can take 300 on a small cloud
instance with a slower core and a busy neighbor, and the login page will tell
you only by being slow. RFC 9106's procedure, and OWASP's advice that
"calculating a hash should take less than one second", both end in the same
instruction: measure on the hardware that will run it.

The measurement has two parts. First, how long one hash takes on one core at
each candidate setting. Second, what that means for capacity: how many cores
and how much memory the login path needs at peak.

### Code it: calibration

The program below times scrypt at increasing $N$ (with $r = 8$, $p = 1$, the
OWASP shape) and stops at the largest $N$ under a budget, then times PBKDF2
once and scales, since its cost is linear in the iteration count. It takes the
best of three runs, because the first run of anything pays for cold caches and
page faults.

```python
import hashlib, os, time

PW, SALT = b"correct horse battery staple", os.urandom(16)

def best_of(fn, runs=3):
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        times.append(time.perf_counter() - t0)
    return min(times)

def scrypt_ms(ln):
    n = 2 ** ln
    return 1000 * best_of(lambda: hashlib.scrypt(PW, salt=SALT, n=n, r=8, p=1,
                                                 maxmem=256 * n * 8, dklen=32))

def calibrate_scrypt(budget_ms, max_mib=256):
    choice = None
    for ln in range(14, 30):
        mib = 128 * 2 ** ln * 8 // 2 ** 20
        if mib > max_mib:
            break
        ms = scrypt_ms(ln)
        print(f"  scrypt N=2^{ln}  {mib:4d} MiB  {ms:7.1f} ms")
        if ms > budget_ms:
            break
        choice = ln
    return choice

def calibrate_pbkdf2(budget_ms):
    probe = 100_000
    ms = 1000 * best_of(lambda: hashlib.pbkdf2_hmac("sha256", PW, SALT, probe))
    iters = int(probe * budget_ms / ms) // 10_000 * 10_000     # it scales linearly
    print(f"  PBKDF2-SHA256 {probe:,} iterations  {ms:.1f} ms")
    return iters

budget = 250                                    # milliseconds you can afford per login
print("scrypt: largest N within budget is 2^%d" % calibrate_scrypt(budget))
print("PBKDF2-HMAC-SHA256: %s iterations fit the budget" % format(calibrate_pbkdf2(budget), ","))
```

Example output, from one run on one core of a 2.1 GHz Intel Xeon cloud
virtual machine with Python 3.13 and OpenSSL 3.5 (your numbers will differ,
which is the point):

```
  scrypt N=2^14    16 MiB     29.8 ms
  scrypt N=2^15    32 MiB     68.0 ms
  scrypt N=2^16    64 MiB    130.4 ms
  scrypt N=2^17   128 MiB    291.8 ms
scrypt: largest N within budget is 2^16
  PBKDF2-SHA256 100,000 iterations  15.4 ms
PBKDF2-HMAC-SHA256: 1,620,000 iterations fit the budget
```

Three things to notice. scrypt's time doubles with $N$, as it should: twice
the memory, filled and then read back. Python refuses scrypt above 32 MiB
unless you pass `maxmem`, a guard against exactly the mistake of asking for
gigabytes by accident; the code raises it to twice what each call needs. And
on this machine OWASP's scrypt floor, $N = 2^{17}$, slightly overshoots a
250 ms budget. That is a real finding: either accept 300 ms, or move to the
equal-cost row $N = 2^{16}$, $p = 2$, or buy faster cores for the login
servers. A calibration that only ever confirms the published number has not
measured anything.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Bar chart of example hash times on one 2.1 GHz cloud core: PBKDF2 600,000 iterations 72 ms; scrypt N 2 to the 14 25 ms, 2 to the 15 57 ms, 2 to the 16 121 ms, 2 to the 17 304 ms, 2 to the 18 616 ms; a dashed line marks a 250 ms budget" fill="currentColor" font-size="14">
<text x="190" y="38" text-anchor="end">PBKDF2-SHA256 600k</text>
<rect x="200" y="24" width="47" height="20" fill="currentColor" opacity="0.35"/>
<text x="253" y="38" font-size="12">72 ms</text>
<text x="190" y="70" text-anchor="end">scrypt N=2^14, 16 MiB</text>
<rect x="200" y="56" width="16" height="20" fill="currentColor" opacity="0.35"/>
<text x="222" y="70" font-size="12">25 ms</text>
<text x="190" y="102" text-anchor="end">scrypt N=2^15, 32 MiB</text>
<rect x="200" y="88" width="37" height="20" fill="currentColor" opacity="0.35"/>
<text x="243" y="102" font-size="12">57 ms</text>
<text x="190" y="134" text-anchor="end">scrypt N=2^16, 64 MiB</text>
<rect x="200" y="120" width="79" height="20" fill="currentColor" opacity="0.35"/>
<text x="285" y="134" font-size="12">121 ms</text>
<text x="190" y="166" text-anchor="end">scrypt N=2^17, 128 MiB</text>
<rect x="200" y="152" width="198" height="20" fill="currentColor" opacity="0.6"/>
<text x="404" y="166" font-size="12">304 ms (OWASP floor)</text>
<text x="190" y="198" text-anchor="end">scrypt N=2^18, 256 MiB</text>
<rect x="200" y="184" width="400" height="20" fill="currentColor" opacity="0.35"/>
<text x="560" y="222" font-size="12" text-anchor="middle">616 ms</text>
<line x1="200" y1="14" x2="200" y2="210" stroke="currentColor" stroke-width="1.2"/>
<line x1="362" y1="14" x2="362" y2="230" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="362" y="250" text-anchor="middle" font-size="12">250 ms budget</text>
</svg>
<figcaption>Figure 13.2. Example costs measured on one core of a 2.1 GHz cloud machine (one run; yours will differ). Each step of scrypt's N doubles both time and memory. Here OWASP's scrypt floor just misses a 250 ms budget, which is the kind of fact only a measurement gives you.</figcaption>
</figure>

### Code it: capacity

One hash per login sounds cheap until a marketing email goes out and everyone
logs in at once. The numbers to plan with are simple. If each hash takes $T$
seconds of one core and logins arrive at $\lambda$ per second at peak, then on
average $\lambda T$ hashes are running at any moment (Little's law), and each
holds its memory $M$ for its whole run, so the login path needs about
$\lambda T M$ of memory and at least $\lambda T$ cores. Leave headroom: the
same machines also serve pages.

```python
import math

def plan(ms_per_hash, mib_per_hash, peak_logins_per_s, headroom=0.5):
    per_core = headroom * 1000 / ms_per_hash          # hashes a second, per core
    cores = math.ceil(peak_logins_per_s / per_core)
    in_flight = peak_logins_per_s * ms_per_hash / 1000
    return cores, in_flight * mib_per_hash

print("setting                    cores   memory at peak")
for name, ms, mib in [("PBKDF2-SHA256 600,000", 72, 0),
                      ("scrypt N=2^16 r=8 p=1", 121, 64),
                      ("scrypt N=2^17 r=8 p=1", 304, 128),
                      ("Argon2id 2 GiB (RFC 9106)", 1000, 2048)]:
    cores, mem = plan(ms, mib, peak_logins_per_s=50)
    print(f"{name:26} {cores:5d}   {mem:8.0f} MiB")
```

```
setting                    cores   memory at peak
PBKDF2-SHA256 600,000          8          0 MiB
scrypt N=2^16 r=8 p=1         13        387 MiB
scrypt N=2^17 r=8 p=1         31       1946 MiB
Argon2id 2 GiB (RFC 9106)    100     102400 MiB
```

The last row uses an assumed one second for a 2 GiB Argon2id hash on the same
core; measure it with your library before relying on it. The table makes the
trade-off concrete. At fifty logins a second, OWASP's scrypt floor costs about
thirty cores and two gigabytes; RFC 9106's first option would need a hundred
cores and a hundred gigabytes, which is why web services sit near the floor
and disk encryption sits near the ceiling. Some services move the hash onto
dedicated login machines so that a burst of logins cannot starve the rest of
the site, and put a queue in front of them with a short timeout.

### Break it: the password that is a denial of service

A slow hash is a weapon pointed at your own servers. Each login attempt, right
or wrong, costs the full hash, so an attacker who can send login requests can
spend your CPU at the price of a TCP connection. Rate limits (§13.9) are part
of the answer. The other part is the length of the input.

In September 2013 Django published a security release for exactly this. Its
password check had no upper limit on length, and its PBKDF2 code, written in
Python, recomputed the HMAC key from the password on every iteration. HMAC
hashes any key longer than a block (64 bytes for SHA-256) before using it, so a
one-megabyte password meant hashing a megabyte thousands of times. Django's
advisory said one such password took about a minute to check. A few requests
could hold every worker. The program below rebuilds the mistake next to the
standard library's PBKDF2, which hashes a long key once.

```python
import hashlib, hmac, time

def naive_pbkdf2(password, salt, iterations):
    # Break it: hmac.new(password, ...) inside the loop rehashes a long password every time.
    u = hmac.new(password, salt + b"\x00\x00\x00\x01", hashlib.sha256).digest()
    out = int.from_bytes(u, "big")
    for _ in range(iterations - 1):
        u = hmac.new(password, u, hashlib.sha256).digest()
        out ^= int.from_bytes(u, "big")
    return out.to_bytes(32, "big")

def ms(fn):
    t0 = time.perf_counter()
    fn()
    return 1000 * (time.perf_counter() - t0)

salt, n = b"0123456789abcdef", 2_000
for size in (16, 1_000_000):
    pw = b"x" * size
    assert naive_pbkdf2(pw, salt, 3) == hashlib.pbkdf2_hmac("sha256", pw, salt, 3)
    print(f"{size:>9,}-byte password: naive {ms(lambda: naive_pbkdf2(pw, salt, n)):8.1f} ms,"
          f" hashlib {ms(lambda: hashlib.pbkdf2_hmac('sha256', pw, salt, n)):6.1f} ms")
```

Example output from the same machine (timings vary from run to run):

```
       16-byte password: naive      2.8 ms, hashlib    0.3 ms
1,000,000-byte password: naive   1274.2 ms, hashlib    1.6 ms
```

The `assert` shows the two give the same answer; only the cost differs. At
2,000 iterations the naive version spends over a second on one megabyte; at
600,000 iterations it would spend several minutes.

**Fix it.** Two changes, and you want both. Use a library that prepares the key
once (the standard library, OpenSSL, any maintained Argon2 binding). And cap
the length of what you accept before any hashing happens. Django rejected
passwords over 4,096 bytes in its fixed releases. NIST asks you to allow at
least 64 characters (§13.8), so a cap anywhere from a few hundred characters to
a few kilobytes satisfies both: no human needs more, and a cap in bytes at the
web server stops a megabyte body before your code sees it.

!!! note "Life story: Django's long-password denial of service (CVE-2013-1443)"
    **Born:** Django's authentication framework, which made PBKDF2 the default
    hasher in Django 1.4 (2012) with no limit on password length ·
    **Purpose:** none; an unbounded input to a deliberately slow function ·
    **Helped:** the habit of capping password length in bytes before hashing,
    now in OWASP's guidance; awareness that slow hashes are a resource an
    attacker can spend · **Status:** fixed on 15 September 2013 in Django
    1.4.8, 1.5.4 and 1.6 beta 4

**What to do.**

1. Calibrate on the production hardware, at the production load, and keep the
   script: run it again when the hardware changes.
2. Plan capacity from $\lambda T$ cores and $\lambda T M$ memory at peak, with
   headroom; consider separate login workers with a queue and a timeout.
3. Cap password length in bytes before hashing (a few hundred characters to
   4 KiB), and never below 64 characters.
4. Rate-limit login attempts per account and per source (§13.9); a slow hash
   without a rate limit is a CPU you have lent to strangers.

## 13.4 The stored string

*Level: intermediate.*

A password hash is useless without its salt and parameters, and a hash whose
algorithm you cannot identify is a hash you cannot upgrade. So every serious
scheme stores them together, in one self-describing string, and the database
holds one column. Two families of string are in use.

**The `crypt` strings.** Unix `crypt(3)` began with DES and a two-character
salt in 1979. In 1994 Poul-Henning Kamp wrote an MD5-based replacement for
FreeBSD and marked its hashes with a prefix, `$1$`, so that one password file
could hold both kinds. That convention, later called the Modular Crypt Format,
spread: `$2a$`, `$2b$` and `$2y$` for bcrypt, `$5$` and `$6$` for the SHA-256
and SHA-512 crypt functions (2007), `$y$` for yescrypt, which most current
Linux distributions now write into `/etc/shadow`. Each scheme chose its own
layout after the prefix, and several use their own base-64 alphabet. They
work, but a parser has to know every one.

**The PHC string format.** The Password Hashing Competition (2013 to 2015),
which chose Argon2, also wrote down a stricter version of the same idea. Its
specification, now maintained as part of C2SP, defines one grammar:

```
$<id>[$v=<version>][$<param>=<value>(,<param>=<value>)*][$<salt>[$<hash>]]
```

The identifier is lowercase letters, digits and hyphens; parameters are
`name=value` pairs in an order the algorithm fixes; salt and hash are standard
Base64 with the `=` padding removed. The rule that matters most to an operator
is that the encoding is **deterministic**: for a given function, parameters,
salt and output there is exactly one correct string, so two libraries can
check each other's output byte for byte. The specification's own example is
an Argon2id hash of the password `hunter2`, made with the secret `pepper`:

```
$argon2id$v=19$m=65536,t=2,p=1$gZiV/M1gPc22ElAH/Jh1Hw$CWOrkoo7oJBQ/iyh7uJ0LO2aLEfrHwTWllSAxT0zRno
```

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The PHC string for Argon2id cut into parts: identifier argon2id, version 19, parameters m 65536 t 2 p 1, a 16-byte salt and a 32-byte hash" fill="currentColor" font-size="14">
<rect x="20" y="30" width="96" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="68" y="52" text-anchor="middle" font-family="monospace" font-size="13">$argon2id</text>
<rect x="122" y="30" width="56" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="150" y="52" text-anchor="middle" font-family="monospace" font-size="13">$v=19</text>
<rect x="184" y="30" width="156" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="262" y="52" text-anchor="middle" font-family="monospace" font-size="13">$m=65536,t=2,p=1</text>
<rect x="346" y="30" width="110" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="401" y="52" text-anchor="middle" font-family="monospace" font-size="13">$gZiV/M1g…</text>
<rect x="462" y="30" width="158" height="34" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="541" y="52" text-anchor="middle" font-family="monospace" font-size="13">$CWOrkoo7oJBQ…</text>
<text x="68" y="90" text-anchor="middle" font-size="12">algorithm</text>
<text x="150" y="90" text-anchor="middle" font-size="12">version</text>
<text x="150" y="106" text-anchor="middle" font-size="12">(0x13)</text>
<text x="262" y="90" text-anchor="middle" font-size="12">memory in KiB,</text>
<text x="262" y="106" text-anchor="middle" font-size="12">passes, lanes</text>
<text x="401" y="90" text-anchor="middle" font-size="12">salt, 16 bytes</text>
<text x="401" y="106" text-anchor="middle" font-size="12">22 characters</text>
<text x="541" y="90" text-anchor="middle" font-size="12">hash, 32 bytes</text>
<text x="541" y="106" text-anchor="middle" font-size="12">43 characters</text>
<line x1="20" y1="130" x2="456" y2="130" stroke="currentColor" stroke-width="1.2"/>
<text x="238" y="152" text-anchor="middle" font-size="12">everything needed to compute the hash again</text>
<line x1="462" y1="130" x2="620" y2="130" stroke="currentColor" stroke-width="1.2"/>
<text x="541" y="152" text-anchor="middle" font-size="12">what it must equal</text>
<text x="320" y="186" text-anchor="middle" font-size="12" opacity="0.7">a pepper, if any, is not in the string: that is the point of a pepper (§13.5)</text>
</svg>
<figcaption>Figure 13.3. Anatomy of a PHC string. The version, parameters and salt travel with the hash, so the verifier never needs to remember how a password was hashed, and an upgrade can tell old hashes from new ones by reading them.</figcaption>
</figure>

The version `v=19` is 0x13, Argon2 version 1.3, the one in RFC 9106 (the
earlier 1.0 was weakened by Alwen and Blocki's 2016 attack on Argon2i and
changed). Memory is in KiB, a classic source of mistakes: `m=65536` is 64 MiB,
and a library that takes bytes will turn 65,536 into 64 KiB without
complaint.

### Code it: reading the string and deciding to rehash

The parser below follows the PHC grammar, decodes the unpadded Base64, and
then does the job that matters day to day: decide whether a stored hash
matches today's policy. If it does not, the login code (§13.6) replaces it
while it holds the right password. The policy compares parameters exactly,
which is what libraries such as `argon2-cffi` do with `check_needs_rehash`:
any difference, up or down, means the string was made under some other
policy.

```python
import base64, re

PHC = re.compile(r"^\$([a-z0-9-]{1,32})(?:\$v=([0-9]+))?(?:\$([a-z0-9-]+=[a-zA-Z0-9/+.-]*(?:,[a-z0-9-]+=[a-zA-Z0-9/+.-]*)*))?"
                 r"(?:\$([a-zA-Z0-9/+.-]+)(?:\$([a-zA-Z0-9/+.-]+))?)?$")

def b64decode_nopad(s):
    if len(s) % 4 == 1:
        raise ValueError("impossible B64 length")
    return base64.b64decode(s + "=" * (-len(s) % 4), validate=True)

def parse_phc(s):
    m = PHC.match(s)
    if not m:
        raise ValueError("not a PHC string")
    alg, version, params, salt, digest = m.groups()
    p = dict(kv.split("=", 1) for kv in params.split(",")) if params else {}
    return {"alg": alg, "v": version, "params": p,
            "salt": b64decode_nopad(salt) if salt else None,
            "hash": b64decode_nopad(digest) if digest else None}

def parse_bcrypt(s):   # $2b$12$ + 22 salt chars + 31 hash chars, bcrypt's own base-64
    m = re.fullmatch(r"\$(2[abxy])\$(\d\d)\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})", s)
    if not m:
        raise ValueError("not a bcrypt string")
    return {"alg": "bcrypt", "v": m.group(1), "params": {"cost": m.group(2)}}

# Today's policy. Anything weaker gets rehashed at the next successful login.
POLICY = {"argon2id": {"m": 65536, "t": 2, "p": 1}, "scrypt": {"ln": 17, "r": 8, "p": 1}}

def needs_rehash(stored):
    rec = parse_bcrypt(stored) if stored.startswith("$2") else parse_phc(stored)
    if rec["alg"] not in POLICY:
        return f"{rec['alg']}: not today's algorithm"
    if rec["alg"] == "argon2id" and rec["v"] != "19":
        return "argon2id: old version"
    want = POLICY[rec["alg"]]
    have = {k: int(v) for k, v in rec["params"].items() if k in want}
    if have != want:
        return f"{rec['alg']}: parameters are not today's"
    return "ok"

example = "$argon2id$v=19$m=65536,t=2,p=1$gZiV/M1gPc22ElAH/Jh1Hw$CWOrkoo7oJBQ/iyh7uJ0LO2aLEfrHwTWllSAxT0zRno"
rec = parse_phc(example)
print(rec["alg"], rec["v"], rec["params"], len(rec["salt"]), "byte salt,", len(rec["hash"]), "byte hash")

for s in [example,
          "$argon2id$v=19$m=7168,t=5,p=1$c29tZXNhbHQxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAA",
          "$argon2i$v=19$m=65536,t=3,p=4$c29tZXNhbHQxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAA",
          "$scrypt$ln=16,r=8,p=1$c29tZXNhbHQxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAA",
          "$2b$12$abcdefghijklmnopqrstuutwZ1IOTtu3SsEBT5lI/LFncP31tIybm"]:
    print(f"{s[:30]:32s}{needs_rehash(s)}")
```

```
argon2id 19 {'m': '65536', 't': '2', 'p': '1'} 16 byte salt, 32 byte hash
$argon2id$v=19$m=65536,t=2,p=1  ok
$argon2id$v=19$m=7168,t=5,p=1$  argon2id: parameters are not today's
$argon2i$v=19$m=65536,t=3,p=4$  argon2i: not today's algorithm
$scrypt$ln=16,r=8,p=1$c29tZXNh  scrypt: parameters are not today's
$2b$12$abcdefghijklmnopqrstuut  bcrypt: not today's algorithm
```

The `$scrypt$ln=...` layout is not part of the PHC specification, which
standardizes only the grammar; it is the one the Python `passlib` library
uses, with `ln` the base-2 logarithm of $N$. The bcrypt string is book 1's
example from [§11.5](../../book/11-Passwords-and-Key-Derivation.md#115-bcrypt),
which the parser handles separately because bcrypt predates PHC and uses its
own alphabet and fixed widths. Strings you cannot parse at all should be an
alarm, not a login failure: they mean data was corrupted or written by code
you do not know about.

### bcrypt's letters and its 72 bytes

bcrypt's prefixes record bugs. The 1999 format was `$2$`; `$2a$` followed to
pin down that input is UTF-8 with the terminating zero byte included. In June 2011 a
sign-extension bug was found in `crypt_blowfish`, the implementation PHP and
many Linux systems used: bytes with the high bit set (most non-ASCII
characters) were mishandled, and some different passwords hashed alike
(CVE-2011-2483). The fix marked new, correct hashes `$2y$` and allowed known
buggy ones to be checked as `$2x$`. In 2014 OpenBSD found a different bug in
its own code: the password length was kept in an 8-bit counter, so passwords of
256 bytes or more wrapped around; fixed hashes were marked `$2b$`. A verifier
today should accept `$2a$`, `$2b$` and `$2y$` for checking, write only `$2b$`
(or `$2y$` where that is the local convention), and treat `$2x$` as a reason to
force a reset.

The 72-byte limit is not a bug but a design limit. bcrypt's key setup uses at
most 72 bytes of key, and most implementations silently ignore the rest. That
is harmless when the input is a human's password, since almost nobody types 72
characters, and harmful when it is anything else.

**Break it.** In 2024 Okta disclosed that a cache of successful logins was
keyed by bcrypt of the user ID, the username and the password, concatenated.
With a username of 52 characters or more, the password started beyond byte 72,
so the cache key no longer depended on it, and a login could succeed against
the cache with any password ([Chapter 2](02-Bytes-Encodings-and-Text.md#in-the-real-world)
tells the story with the dates). Here is the same shape, with a function that
does what bcrypt does to its input:

```python
import base64, hashlib, hmac

def bcrypt_sees(data):
    # What most bcrypt implementations actually hash: the first 72 bytes.
    return data[:72]

# Break it: a cache key built from user ID, username and password.
user_id = b"00u1a2b3c4d5e6f7g8h9"                              # 20 bytes
username = b"alexandra.konstantinopoulou@research.example-corp.com"  # 53 bytes
right = bcrypt_sees(user_id + username + b"the real password")
wrong = bcrypt_sees(user_id + username + b"anything at all")
print(len(user_id + username), "bytes before the password; same cache key:", right == wrong)

# Length is counted in bytes, not characters.
for pw in ["a" * 72, "é" * 40, "\U0001F511" * 20]:
    print(len(pw), "characters,", len(pw.encode()), "bytes")

# Fix it: pre-hash with a keyed hash, then encode so bcrypt gets 64 printable bytes.
PEPPER = bytes(32)            # in real life: from a secrets store or HSM, not the code
def prehash_for_bcrypt(password):
    mac = hmac.new(PEPPER, password.encode("utf-8"), hashlib.sha384).digest()
    return base64.b64encode(mac)          # 48 bytes -> 64 characters, no zero bytes

a = prehash_for_bcrypt("x" * 80 + "1")
b = prehash_for_bcrypt("x" * 80 + "2")
print(len(a), a == b, b"\x00" in a)
```

```
73 bytes before the password; same cache key: True
72 characters, 72 bytes
40 characters, 80 bytes
20 characters, 80 bytes
64 False False
```

The middle lines are the other trap: the limit is in **bytes**. Forty
characters of French with accents, or twenty emoji, already exceed it after
UTF-8 encoding (Chapter 2), so a "72-character limit" in a form is not a
72-byte limit.

**Fix it.** Three rules, in order of preference. Do not use bcrypt for
anything but a human's password; a cache key or a token wants HMAC, not a
password hash. Where bcrypt stores passwords, reject inputs over 72 bytes
(Python's `bcrypt` package raises `ValueError` from version 5.0) or pre-hash
them. And if you pre-hash, do it as OWASP now describes: an HMAC with a pepper
(`bcrypt(base64(HMAC-SHA-384(pepper, password)))`), encoded to Base64 so that
no zero byte reaches a C implementation that would stop there. An unkeyed
pre-hash such as `bcrypt(sha512(password))` opens the door to hash shucking
(§13.6).

!!! note "Life story: the PHC string format"
    **Born:** written down during and after the Password Hashing Competition
    (2013 to 2015) as a stricter, deterministic form of the `$id$` convention
    that began with Poul-Henning Kamp's MD5-crypt (`$1$`, 1994) · **Purpose:**
    one parsable string holding algorithm, version, parameters, salt and hash,
    with exactly one valid encoding · **Helped:** Argon2's reference code and
    nearly every Argon2 binding, so that hashes move between languages;
    rehash-on-login checks that read parameters instead of remembering them ·
    **Status:** in use; the specification moved from the competition's
    repository to C2SP (c2sp.org/phc-strings)

**What to do.**

1. Store one string per password, in the PHC format where your library
   supports it; never split salt, parameters and hash into columns that can
   drift apart.
2. Parse strictly, and treat an unparsable string as an incident.
3. With bcrypt, enforce 72 bytes (not characters) or pre-hash with a peppered
   HMAC and Base64; never feed it anything but a password.
4. Keep the column wide enough for tomorrow's algorithm: 255 characters is a
   common choice.

## 13.5 Peppers and where to keep them

*Level: intermediate.*

A salt is public and different for every password. A **pepper** is the
opposite: one secret key, shared by all the passwords, kept somewhere other
than the database. Its whole value is in that "somewhere other". The common
breach is a database copy, taken through SQL injection, a misplaced backup, an
exposed replica or an insider with read access. If the pepper is in a
different system, the attacker who has only the database cannot test a single
guess, however weak the password. If the pepper is in the same database, or in
a config file on the same disk that every backup includes, it adds nothing.

There are two ways to apply one, and they behave differently when the pepper
has to change.

- **Pepper before the hash**: compute `HMAC(pepper, password)` and feed that
  to Argon2id or scrypt. Argon2 even has a parameter for it: its optional
  secret input $K$, which is how the PHC example above was made. The pepper
  cannot be removed from a stored hash without the password, so changing it
  means waiting for each user's next login, or a reset.
- **Pepper after the hash**: compute the slow hash as usual and then either
  HMAC it with the pepper (OWASP's "post-hashing pepper") or encrypt it.
  Dropbox described the encrypted form in September 2016: SHA-512 of the
  password (to get under bcrypt's 72 bytes), then bcrypt with a per-user salt,
  then AES-256 under a key kept apart from the database. Encryption has one
  operational advantage: the pepper can be **rotated** in a batch job,
  decrypting with the old key and encrypting with the new, with no password
  needed.

Either way, the pepper must be identified. Store a key identifier in the hash
string, so that a rotation can proceed gradually, old hashes checked with the
old pepper and new ones written with the new, exactly like an algorithm
upgrade.

**Where it lives.** The strongest place is a device that will compute with the
key but never hand it out: a hardware security module, or a cloud key
management service that offers HMAC or encryption as an API call
([Chapter 11](11-Hardware-for-Keys.md)). The login server then sends the
password's slow hash, or the password's HMAC input, to the service and gets a
result back. An attacker who takes the database and even the login server's
disk has nothing to test against; one who takes over the running login server
can use the service while they are there, but cannot take the key away with
them, and the service's logs show the volume. Facebook's 2014 description of
its password hashing (§13.6) had exactly this layer: an HMAC computed by a
separate internal service holding the secret. The next best place is a secrets
manager that the login service reads at start-up, which keeps the pepper out
of the database and its backups but not out of the server's memory
([Chapter 12](12-Secrets-in-Operations.md)). The worst places are source code,
the database, and environment variables printed in crash reports.

### Code it: a pepper service with key identifiers

The class below stands in for an HSM: it computes HMACs under numbered keys and
never returns a key. Hashes record which key they used, so a rotation leaves old
hashes checkable and moves each user to the new key at their next login.

```python
import base64, hashlib, hmac, os

class PepperService:
    """Stands in for an HSM or KMS: it computes HMACs but never hands out a key."""
    def __init__(self):
        self._keys = {1: os.urandom(32)}
        self.current = 1
    def rotate(self):
        self.current += 1
        self._keys[self.current] = os.urandom(32)
    def mac(self, key_id, data):
        return hmac.new(self._keys[key_id], data, hashlib.sha256).digest()

peppers = PepperService()
LN, R, P = 14, 8, 1           # small for the demo; use your calibrated values

def b64(b):
    return base64.b64encode(b).decode().rstrip("=")

def unb64(s):
    return base64.b64decode(s + "=" * (-len(s) % 4))

def slow(data, salt, ln, r, p):
    return hashlib.scrypt(data, salt=salt, n=2**ln, r=r, p=p, maxmem=2**30, dklen=32)

def hash_password(password):
    k = peppers.current
    salt = os.urandom(16)
    peppered = peppers.mac(k, password.encode("utf-8"))      # pepper first
    digest = slow(peppered, salt, LN, R, P)                  # then the slow hash
    return f"$scrypt-hp$k={k},ln={LN},r={R},p={P}${b64(salt)}${b64(digest)}"

def verify(password, stored):
    _, alg, params, salt, digest = stored.split("$")
    p = {name: int(v) for name, v in (kv.split("=") for kv in params.split(","))}
    peppered = peppers.mac(p["k"], password.encode("utf-8"))
    again = slow(peppered, unb64(salt), p["ln"], p["r"], p["p"])
    ok = hmac.compare_digest(again, unb64(digest))
    stale = ok and (p["k"], p["ln"], p["r"], p["p"]) != (peppers.current, LN, R, P)
    return ok, stale

stored = hash_password("correct horse battery staple")
print(stored[:28])
print(verify("correct horse battery staple", stored))
peppers.rotate()                                   # a new pepper; old one kept for checking
ok, stale = verify("correct horse battery staple", stored)
print(ok, stale)
if ok and stale:
    stored = hash_password("correct horse battery staple")     # moved to pepper 2 at login
print(stored[:28], verify("correct horse battery staple", stored))
```

```
$scrypt-hp$k=1,ln=14,r=8,p=1
(True, False)
True True
$scrypt-hp$k=2,ln=14,r=8,p=1 (True, False)
```

The string's identifier `scrypt-hp` (for "HMAC pepper") is this program's own;
the point is that it is different from plain `scrypt`, so no verifier can
mistake a peppered hash for an unpeppered one.

**What a pepper does not do.** It does not help against the online attacker,
who goes through your login page and therefore through your pepper service. It
does not help if the attacker controls the login server for long enough to make
the service compute for them; it turns that attack from an offline one into an
online one, at the speed of your HSM, which is a large gain but not immunity. It
does not replace the slow hash: if the pepper leaks one day, the slow hash is
all that is left, so it must still be at full strength. And it adds a
dependency: if the pepper service is down, nobody can log in, and if the pepper
is lost, every password must be reset. Back it up as carefully as any root key
([Chapter 10](10-The-Life-of-a-Key.md)).

**What to do.**

1. Add a pepper if you can keep it outside the database and its backups;
   otherwise, do not bother pretending.
2. Prefer an HSM or KMS that computes HMAC or encryption without exporting
   the key; next, a secrets manager; never the code or the database.
3. Put a key identifier in every stored string so that rotation is gradual.
4. Keep the slow hash at full strength; the pepper is defense in depth.

## 13.6 Upgrading legacy hashes without a reset

*Level: intermediate.*

Sooner or later you inherit a table you would not have designed: unsalted MD5
from 2006, salted SHA-1 from 2011, PBKDF2 at 1,000 iterations from 2013. Two
upgrade paths exist, and the usual mistake is to use only the slow one.

**Rehash on login.** The stored string says what it is (§13.4). When a user
logs in with the right password, the server has the password in hand for a
moment, so it computes a current hash and replaces the old one. bcrypt's 1999
paper proposed exactly this, and every modern framework does it automatically
(Django's `check_password`, `argon2-cffi`'s `check_needs_rehash`, PHP's
`password_needs_rehash`). It costs nothing and needs no migration.

Its weakness is the users who do not log in. A dormant account keeps its old
hash forever, and a breach five years later exposes it at the old strength. That
is part of what happened to LastPass in 2022: new vaults used 100,100 PBKDF2
iterations, but older accounts had never been moved up from much lower counts,
and those were the easier ones to crack
([§11.9](../../book/11-Passwords-and-Key-Derivation.md#119-breaches-as-stories)).

**Wrap the old hash.** The second path does not need the password. A slow hash
can take *any* bytes as input, including an old hash. So a batch job can
replace every stored `md5(password)` with `slow(md5(password))` today, and at
login the server computes `md5` of what the user typed and then the slow hash
over it. No old hash stays at rest after the job runs. At the next login, the
server, holding the password, replaces the wrapped hash with a direct one,
peeling the onion.

Facebook described this approach in public at the Passwords conference in
Trondheim, Norway, in December 2014, in a talk by Alec Muffett. As the talk's
slide is usually reproduced, the stored value was built in layers that had
accumulated since the site's early days: an MD5 of the password, from the
original code; an HMAC-SHA1 of that with a per-user 20-byte salt; an HMAC
computed by a separate internal service holding a secret key; scrypt; and a
final hash to shorten the result for storage. Each time the scheme was
strengthened, a new layer went on the outside of every existing hash, so
nothing had to wait for users to log in. Facebook called it "the onion".

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="An onion of hash layers: md5 of the password inside, then an HMAC with a pepper, then scrypt with a salt, stored as onion-md5; at the next login it is replaced by a direct peppered scrypt hash" fill="currentColor" font-size="14">
<rect x="20" y="20" width="320" height="200" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="30" y="40" font-size="12">scrypt(salt, ·): slow, added by the batch job</text>
<rect x="40" y="55" width="280" height="145" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="75" font-size="12">HMAC(pepper, ·): stops shucking</text>
<rect x="60" y="90" width="240" height="90" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="180" y="125" text-anchor="middle" font-weight="bold">md5(password)</text>
<text x="180" y="150" text-anchor="middle" font-size="12">the 2006 hash, never</text>
<text x="180" y="166" text-anchor="middle" font-size="12">stored on its own again</text>
<line x1="340" y1="120" x2="400" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="400,115 410,120 400,125"/>
<text x="375" y="108" text-anchor="middle" font-size="12">next login</text>
<rect x="410" y="70" width="210" height="100" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515" y="100" text-anchor="middle" font-weight="bold">direct hash</text>
<text x="515" y="122" text-anchor="middle" font-size="12">scrypt(salt,</text>
<text x="515" y="140" text-anchor="middle" font-size="12">HMAC(pepper, password))</text>
<text x="515" y="196" text-anchor="middle" font-size="12" opacity="0.7">no MD5 left anywhere</text>
<text x="180" y="245" text-anchor="middle" font-size="12" opacity="0.7">day 1: every row wrapped, no password needed</text>
</svg>
<figcaption>Figure 13.4. Upgrading without a reset. A batch job wraps each old hash in a peppered slow hash on day one, so nothing weak is left at rest; each user's next login replaces the onion with a direct hash of the password.</figcaption>
</figure>

### Code it: wrap today, peel at login

```python
import base64, hashlib, hmac, os

PEPPER = os.urandom(32)          # stands in for the pepper service of the last section
LN = 14                          # small for the demo

def b64(b):
    return base64.b64encode(b).decode().rstrip("=")

def unb64(s):
    return base64.b64decode(s + "=" * (-len(s) % 4))

def scrypt(data, salt):
    return hashlib.scrypt(data, salt=salt, n=2**LN, r=8, p=1, maxmem=2**30, dklen=32)

def modern(password):            # what every account should end up with
    salt = os.urandom(16)
    inner = hmac.new(PEPPER, password.encode(), hashlib.sha256).digest()
    return f"$scrypt-hp$ln={LN}${b64(salt)}${b64(scrypt(inner, salt))}"

def wrap_md5(md5_hex):           # the batch job: needs only the old hash, not the password
    salt = os.urandom(16)
    inner = hmac.new(PEPPER, md5_hex.encode(), hashlib.sha256).digest()
    return f"$onion-md5$ln={LN}${b64(salt)}${b64(scrypt(inner, salt))}"

def check(password, stored):
    alg, params, salt, digest = stored.split("$")[1:]
    if alg == "onion-md5":       # rebuild the old hash first, then the layers on top
        password = hashlib.md5(password.encode()).hexdigest()
    inner = hmac.new(PEPPER, password.encode(), hashlib.sha256).digest()
    return hmac.compare_digest(scrypt(inner, unb64(salt)), unb64(digest))

def login(db, user, password):
    stored = db[user]
    if not check(password, stored):
        return "denied"
    if not stored.startswith("$scrypt-hp$"):
        db[user] = modern(password)          # peel the onion while we hold the password
        return "ok, upgraded"
    return "ok"

# 2006: the legacy table, unsalted MD5.
db = {"ana": hashlib.md5(b"tulip-garden-77").hexdigest(),
      "bo": hashlib.md5(b"123456").hexdigest()}
# Today: one batch job wraps every row. No MD5 is left at rest after it runs.
db = {user: wrap_md5(h) for user, h in db.items()}
print({u: s.split("$")[1] for u, s in db.items()})
print(login(db, "ana", "tulip-garden-77"))
print(login(db, "ana", "tulip-garden-77"))
print(login(db, "bo", "654321"))
print({u: s.split("$")[1] for u, s in db.items()})
```

```
{'ana': 'onion-md5', 'bo': 'onion-md5'}
ok, upgraded
ok
denied
{'ana': 'scrypt-hp', 'bo': 'onion-md5'}
```

Ana's first login rebuilds the MD5 inside the onion, checks it, and writes a
direct hash; her second login uses it. Bo's wrong guess changes nothing, and his
row stays wrapped until he logs in. Django documents the same pattern under the
heading "Password upgrading without requiring a login", with a hasher that
wraps old SHA-1 hashes in PBKDF2.

### Break it: hash shucking

The wrap above puts an HMAC with a pepper between the old hash and the slow
one. It is tempting to skip it, and OWASP's own cheat sheet shows the simple
form, `bcrypt(md5(password))`. The problem is that the inner value is no longer
a secret derived from one password; it is an **unsalted MD5**, and the world is
full of those. Billions of unsalted MD5 and SHA-1 hashes have leaked from other
sites, and people reuse passwords. An attacker holding your wrapped table can
skip guessing passwords entirely and feed *leaked hashes* straight into your
slow function: one slow hash per leaked hash per user, and a match tells them
the inner MD5, which they then crack at GPU speed or simply look up. The
cracking community calls this **hash shucking**; Sam Croley's 2020 DEF CON talk
gave it the name most people use.

```python
import hashlib, hmac, os

def slow(data, salt):
    return hashlib.scrypt(data, salt=salt, n=2**12, r=8, p=1, dklen=32)

# Break it: the wrap has no secret in it, so slow(md5(password)) is all there is.
salt = os.urandom(16)
row = (salt, slow(hashlib.md5(b"tulip-garden-77").hexdigest().encode(), salt))

# The attacker holds unsalted MD5 hashes leaked by other sites (no passwords needed).
other_leak = [hashlib.md5(f"someone-else-{i}".encode()).hexdigest() for i in range(300)]
other_leak.insert(137, hashlib.md5(b"tulip-garden-77").hexdigest())  # she reused it

tries = 0
for h in other_leak:
    tries += 1
    if hmac.compare_digest(slow(h.encode(), row[0]), row[1]):
        print(f"shucked after {tries} slow hashes: inner MD5 is {h}")
        break
# Now only MD5 stands between the attacker and the password: billions of guesses a second.

# Fix it: put a secret the attacker does not have between the old hash and the slow one.
PEPPER = os.urandom(32)
def wrap(md5_hex, salt):
    return slow(hmac.new(PEPPER, md5_hex.encode(), hashlib.sha256).digest(), salt)

row = (salt, wrap(hashlib.md5(b"tulip-garden-77").hexdigest(), salt))
hits = sum(hmac.compare_digest(slow(h.encode(), row[0]), row[1]) for h in other_leak)
print("matches without the pepper:", hits)
```

Example output (the MD5 is fixed; the count is too, since the reused hash is
at position 137 in the list):

```
shucked after 138 slow hashes: inner MD5 is 80d6b0906cdb720a22e12a27218743f0
matches without the pepper: 0
```

**Fix it.** Put something secret, or something unique to the user, between the
old hash and the slow one. A pepper does both jobs at once: HMAC with a key the
attacker lacks makes every leaked hash useless as input, which is the layer
Facebook's onion had. If you cannot hold a pepper, at least include the
per-user salt in the inner step, as Facebook's HMAC-SHA1 layer did, so that one
leaked hash list has to be recomputed for every user. And keep the onion a
transition, not a destination: the sooner each row is peeled to a direct hash,
the sooner no shuckable layer exists. The same reasoning applies to pre-hashing
for bcrypt (§13.4): `bcrypt(sha512(password))` is shuckable with leaked SHA-512
lists; `bcrypt(base64(HMAC(pepper, password)))` is not.

Facebook's onion has had one more critic. A 2025 paper by Thomas Rivasseau
argues that the very chaining of layers lowers the security of the result
compared with a single direct hash; whatever one makes of the argument, the
operational advice is the same, which is to peel the onion as users log in.

!!! note "Life story: Facebook's password onion"
    **Born:** grown in layers from Facebook's early MD5 storage; presented in
    public by Alec Muffett at the Passwords conference in Trondheim, Norway, in
    December 2014 · **Purpose:** strengthen every stored hash at once, without
    waiting for logins or forcing resets, by wrapping the existing value in new
    layers, one of them a keyed HMAC computed by a separate service · **Helped:**
    the "wrap, then rehash at login" pattern now in OWASP's guidance and Django's
    documentation; the idea of a remote pepper service · **Status:** the layer
    list is known from the talk's slides and secondhand accounts, not a written
    specification; Facebook's current internal scheme is not public

**What to do.**

1. Turn on rehash-on-login now, whatever else you do; it is free.
2. For a weak legacy table, wrap every row in a peppered slow hash in one
   batch job, mark wrapped rows with their own identifier, and peel them at
   login.
3. Never wrap an unsalted fast hash without a pepper or a per-user salt
   inside the slow function: that is shuckable.
4. Set a deadline. Rows still wrapped (or still at old parameters) after a
   year or two belong to dormant accounts: expire them and require a reset
   through the recovery flow (§13.10).

## 13.7 Breached-password checks with k-anonymity

*Level: intermediate.*

A slow hash protects a password that nobody has guessed yet. It does nothing
for a password that is already on an attacker's list, and a large share of
real passwords are: either because they are common ("123456" has led most
public counts since RockYou) or because their owner used them on a site that
was breached. The first thing an attacker tries, online or offline, is those
lists. So the cheapest defense with the largest effect is to refuse such
passwords when they are chosen, which SP 800-63B requires (§13.8).

That needs a list, and the list most services use is **Pwned Passwords**, run
by Troy Hunt as part of Have I Been Pwned. The first version, in August 2017,
was a download of 320 million SHA-1 hashes of passwords seen in breaches. The
download was the honest design, since you can check a password against a local
file without telling anyone, but a file of many gigabytes is not something
every service wants to keep fresh. An online API that took the password, or its
plain SHA-1, would be worse: the service would be sending users' passwords, or
a fast hash of them, to a third party.

The answer came in February 2018 with version 2, built with Junade Ali at
Cloudflare: a **range query** with **k-anonymity**. The client computes the
SHA-1 of the password, sends only the first five hexadecimal characters (20
bits) and receives every suffix in the database that starts with that prefix,
each with a count of how often it was seen. It then looks for its own suffix
locally. The service learns which of $16^5 = 1{,}048{,}576$ buckets the
password falls in, and nothing else. With 500 million hashes at launch,
Cloudflare put the average bucket at 478 entries; the database has grown
several times since, and a large addition in November 2025 alone increased the
average bucket by about half. The k in k-anonymity (Latanya Sweeney's 2002
term) is that bucket size: the queried password is one of at least that many
breached candidates, or none of them.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="k-anonymity range query: the client hashes the password with SHA-1, sends the first 5 hex characters, the server returns all suffixes in that range with counts, and the client compares locally" fill="currentColor" font-size="14">
<rect x="20" y="20" width="250" height="190" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="44" text-anchor="middle" font-weight="bold">your server</text>
<text x="40" y="74" font-size="12">SHA-1("password") =</text>
<text x="40" y="94" font-size="12" font-family="monospace">5BAA6 1E4C9B93F3F...</text>
<text x="40" y="128" font-size="12">look for 1E4C9B93F3F...</text>
<text x="40" y="146" font-size="12">in the returned list</text>
<text x="40" y="184" font-size="12" font-weight="bold">found: seen many times</text>
<rect x="370" y="20" width="250" height="190" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="495" y="44" text-anchor="middle" font-weight="bold">range service</text>
<text x="390" y="74" font-size="12">every hash with prefix 5BAA6:</text>
<text x="390" y="96" font-size="12" font-family="monospace">0018A45C4D1D...:1</text>
<text x="390" y="114" font-size="12" font-family="monospace">1E4C9B93F3F0...:many</text>
<text x="390" y="132" font-size="12" font-family="monospace">... hundreds more</text>
<text x="390" y="150" font-size="12" font-family="monospace">padding rows ...:0</text>
<text x="390" y="184" font-size="12">learns only "5BAA6"</text>
<line x1="270" y1="80" x2="362" y2="80" stroke="currentColor" stroke-width="1.4"/>
<polygon points="362,75 370,80 362,85"/>
<text x="318" y="70" text-anchor="middle" font-size="12" font-family="monospace">5BAA6</text>
<line x1="370" y1="130" x2="278" y2="130" stroke="currentColor" stroke-width="1.4"/>
<polygon points="278,125 270,130 278,135"/>
<text x="318" y="152" text-anchor="middle" font-size="12">suffixes</text>
</svg>
<figcaption>Figure 13.5. A range query. The password, and even its full hash, never leave your server; the service sees a 20-bit prefix shared by every breached password in the bucket. Padding rows hide the bucket's real size.</figcaption>
</figure>

### Code it: a range lookup on a local list

The program below plays both sides. The "server" files a local corpus by hash
prefix and answers range queries; the "client" sends a prefix and compares
suffixes at home. To keep the corpus small and the buckets realistic, it uses
three hex characters (4,096 buckets) over about 200,000 entries; the real
service uses five over a far larger list. The counts are made up.

```python
import hashlib, secrets
from collections import defaultdict

PREFIX = 3     # the real service uses 5 hex characters over far more hashes; see the text

def sha1_hex(password):
    return hashlib.sha1(password.encode("utf-8")).hexdigest().upper()

# The server side: a local breach corpus with toy counts, filed by hash prefix.
corpus = {"123456": 9000, "password": 7000, "qwerty": 3000, "iloveyou": 1500,
          "letmein": 900, "correct horse battery staple": 40}
corpus.update({f"leaked-{i}": 1 + i % 50 for i in range(200_000)})
ranges = defaultdict(list)
for pw, count in corpus.items():
    h = sha1_hex(pw)
    ranges[h[:PREFIX]].append(f"{h[PREFIX:]}:{count}")

def range_api(prefix, pad_to=100):
    """What the server returns for GET /range/<prefix>: suffixes and counts, padded."""
    lines = list(ranges.get(prefix, []))
    while len(lines) < pad_to:                      # fake rows with count 0
        lines.append(f"{secrets.token_hex(20).upper()[PREFIX:]}:0")
    secrets.SystemRandom().shuffle(lines)
    return "\n".join(lines)

# The client side: send 3 (or 5) hex characters, compare the rest at home.
def times_seen(password):
    h = sha1_hex(password)
    body = range_api(h[:PREFIX])                    # all the server ever learns is h[:PREFIX]
    for line in body.splitlines():
        suffix, count = line.split(":")
        if suffix == h[PREFIX:]:
            return int(count)
    return 0

print(sha1_hex("password"))
for pw in ["password", "letmein", "correct horse battery staple", "violet-ledger-orbit-91"]:
    print(f"{pw!r:32} prefix {sha1_hex(pw)[:PREFIX]}  seen {times_seen(pw)}")
sizes = [len(v) for v in ranges.values()]
print(len(ranges), "ranges,", min(sizes), "to", max(sizes), "real hashes each, mean",
      round(sum(sizes) / len(sizes)))
```

```
5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
'password'                       prefix 5BA  seen 7000
'letmein'                        prefix B7A  seen 900
'correct horse battery staple'   prefix ABF  seen 40
'violet-ledger-orbit-91'         prefix 316  seen 0
4096 ranges, 27 to 76 real hashes each, mean 49
```

The padding in `range_api` is the second privacy fix. In March 2020 Troy Hunt
added optional padding to the real API after a researcher, Matt Weir, pointed
out that an observer of encrypted traffic could guess the bucket from the size
of the response, since buckets differ in size. Clients that send the
`Add-Padding: true` header get each response filled out with fake suffixes
whose count is 0, so all responses look alike; a client must ignore zero-count
rows. Against the real service the client is the same twenty lines with an
HTTPS request in place of `range_api`: `GET https://api.pwnedpasswords.com/range/5BAA6`,
which returns lines of the form `SUFFIX:COUNT`.

**Using it well.** Check at sign-up and at password change, and refuse a match
with a message that says why ("this password has appeared in a data breach")
rather than a vague "too weak". Checking at login too is worth it: a user whose
current password has just appeared in a new breach can be asked to change it,
or to pass a second factor, before an attacker tries it (§13.9). Decide in
advance what happens if the service is unreachable: fail open at login (you do
not want an outside API to lock everyone out) but keep a local copy of the
most common few hundred thousand passwords so the worst ones are always
refused. Large services download the whole list and run the check locally,
which removes the third party altogether.

!!! note "Life story: Pwned Passwords"
    **Born:** August 2017, Troy Hunt, as a downloadable list of 320 million
    SHA-1 hashes; the k-anonymity range API on 22 February 2018 (version 2,
    about 500 million hashes), designed with Junade Ali at Cloudflare ·
    **Purpose:** let anyone check a password against breach corpora without
    disclosing it · **Helped:** blocklist checks in password managers,
    identity providers and many sign-up forms; response padding (2020); the
    code made open source with the .NET Foundation (2020), with breached
    passwords supplied by law enforcement, among them the FBI, from 2021 ·
    **Status:** in active use and still growing; the larger it grows, the
    larger each bucket and the stronger its anonymity

**What to do.**

1. Check new passwords against a breach list with a range query, or against
   a local copy of the list, and refuse matches with a clear message.
2. Ask for padded responses and ignore zero-count rows.
3. Recheck at login and step up (second factor, forced change) on a match.
4. Keep a local list of the most common passwords as a fallback when the
   service is unreachable.

## 13.8 The rules: SP 800-63B

*Level: beginner.*

For twenty years most password rules came from one appendix. NIST's
SP 800-63 of 2003, written largely by Bill Burr, estimated password strength
with entropy rules that counted character classes, and suggested regular
changes. The rules spread into nearly every corporate policy: at least eight
characters, one capital, one digit, one symbol, a new password every 90 days.
In August 2017 Burr told the *Wall Street Journal* that he regretted much of
it. The data had not been there in 2003; by 2017 it was, from leaked password
lists, and it showed that composition rules produce `Password1!` and that
forced changes produce `Password2!`. A 2010 study at the University of North
Carolina by Zhang, Monrose and Reiter, using the old passwords of thousands of
accounts that had been forced to change, could derive many new passwords from
the old ones in seconds offline and some in a handful of online guesses.

**SP 800-63B** (June 2017) turned the advice around, and the fourth revision of
NIST's digital identity guidelines, **SP 800-63B-4**, finalized in the summer of
2025, made more of it mandatory. In short, for passwords chosen by users:

- **Length is the rule.** At least 15 characters when the password is the only
  factor; at least 8 when it is one factor of several. Allow at least 64
  characters, and accept spaces and all printable characters, Unicode
  included (normalized as in [Chapter 2](02-Bytes-Encodings-and-Text.md#precis-usernames-and-passwords),
  with each code point counted as one character).
- **No composition rules.** Do not require mixtures of character types.
- **No forced rotation.** Do not require periodic changes; do require a change
  when there is evidence of compromise.
- **Blocklist.** Compare each new password with a list of known-compromised,
  commonly used and expected values (breach corpora, dictionary words, the
  service's name, the username) and refuse matches.
- **No hints and no knowledge-based questions** ("your first pet") as an
  authenticator or a recovery method (§13.10).
- **Let password managers work.** Allow paste, and offer to show the password
  while it is typed.
- **Check the whole password**; never truncate it silently (bcrypt's 72 bytes,
  §13.4).
- **Limit failed attempts** to at most 100 in a row on one account (§13.9).
- **Store it** salted and hashed with a function designed for passwords, and,
  as an additional layer, with a secret key kept separately (a pepper, §13.5).

Microsoft dropped password expiration from its Windows security baseline in
2019, calling it "an ancient and obsolete mitigation of very low value", and
the UK's NCSC had argued against forced changes since
2015. Many auditors' checklists lag behind; SP 800-63B is the document to show
them.

### Code it: a policy checker

```python
import unicodedata

BLOCKLIST = {"password", "123456", "qwerty", "iloveyou", "letmein", "passwordpassword",
             "123456789012345", "qwertyuiopasdfg"}        # in real life: millions of entries
SERVICE_WORDS = ["examplebank", "example bank"]

def prepare(password):
    # RFC 8265 OpaqueString in brief (Chapter 2): spaces to U+0020, then NFC.
    s = "".join(" " if unicodedata.category(c) == "Zs" else c for c in password)
    return unicodedata.normalize("NFC", s)

def check_new_password(password, username, second_factor=False):
    pw = prepare(password)
    problems = []
    minimum = 8 if second_factor else 15
    if len(pw) < minimum:                       # counted in characters, not bytes
        problems.append(f"shorter than {minimum} characters")
    if len(pw) > 256:
        problems.append("longer than 256 characters")   # a ceiling against abuse, far above 64
    low = pw.lower()
    if low in BLOCKLIST:
        problems.append("on the list of common or breached passwords")
    if len(set(low)) <= 2:
        problems.append("one or two characters repeated")
    if username.lower() in low or any(w in low for w in SERVICE_WORDS):
        problems.append("contains your username or the service's name")
    return problems or ["ok"]
    # No rule about capitals, digits or symbols, and no expiry date: SP 800-63B forbids both.

for pw, mfa in [("Tr0ub4dor&3", False), ("Tr0ub4dor&3", True), ("passwordpassword", False),
                ("aaaaaaaaaaaaaaaa", False), ("jsmith-examplebank-2026", False),
                ("violet ledger orbit harbor", False), ("ゆっくり歩く猫と犬の朝ごはんです", False)]:
    label = " (with a second factor)" if mfa else ""
    print(f"{pw!r}{label}: {'; '.join(check_new_password(pw, 'jsmith', mfa))}")
```

```
'Tr0ub4dor&3': shorter than 15 characters
'Tr0ub4dor&3' (with a second factor): ok
'passwordpassword': on the list of common or breached passwords
'aaaaaaaaaaaaaaaa': one or two characters repeated
'jsmith-examplebank-2026': contains your username or the service's name
'violet ledger orbit harbor': ok
'ゆっくり歩く猫と犬の朝ごはんです': ok
```

Notice what is not there: no rule about capitals, digits or symbols. The
famous `Tr0ub4dor&3` passes the eight-character rule for a user with a second
factor only because this toy blocklist is tiny; the real breach list (§13.7)
should catch it. The Japanese passphrase passes at 16 characters even though
it is 48 bytes, which is why length is counted after normalization in
characters, and why a bcrypt deployment would have to pre-hash it.

!!! note "Life story: SP 800-63B"
    **Born:** June 2017, as the authentication volume of NIST's third
    revision of its digital identity guidelines, replacing the 2003 rules
    attributed to Bill Burr · **Purpose:** password rules based on evidence
    from breached password sets: length, blocklists, no composition rules, no
    periodic changes, rate limits · **Helped:** Microsoft's 2019 baseline
    change, corporate policies dropping 90-day expiry, sign-up forms with
    breach checks · **Status:** superseded by SP 800-63B-4 (2025), which keeps
    the approach, raises the single-factor minimum to 15 characters and turns
    several recommendations into requirements

**What to do.**

1. Require 15 characters for password-only accounts (8 with a second
   factor); allow at least 64; accept any printable Unicode after
   normalization.
2. Drop composition rules and periodic expiry; force a change on evidence of
   compromise.
3. Refuse breached, common and context-specific passwords (§13.7).
4. Allow paste and a "show password" button, and never truncate.

## 13.9 Online guessing: rate limits, lockouts and credential stuffing

*Level: intermediate.*

Online guessing comes in three shapes, shown in Figure 13.6, and a control that
stops one may do nothing against another.

- **Brute force** against one account: many passwords, one username. A limit
  per account stops it.
- **Password spraying**: one or a few common passwords against many accounts,
  so that no account sees more than a failure or two. Limits per account never
  trigger; limits per source address help until the attacker spreads over
  many addresses. In January 2024 Microsoft disclosed that the group it calls
  Midnight Blizzard had used a password spray in late 2023 to get into a
  legacy test account without a second factor, and from there into corporate
  email.
- **Credential stuffing**: username and password pairs leaked from other
  sites, each tried once, from thousands of residential addresses rented
  through proxy networks. Each attempt looks like a user who typed their
  password correctly the first time, and for the share of users who reused the
  password, it is.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Three shapes of online guessing: brute force, many passwords against one account; spraying, one password against many accounts; stuffing, one leaked pair per account from many addresses" fill="currentColor" font-size="14">
<text x="105" y="24" text-anchor="middle" font-weight="bold">brute force</text>
<text x="320" y="24" text-anchor="middle" font-weight="bold">spraying</text>
<text x="535" y="24" text-anchor="middle" font-weight="bold">stuffing</text>
<rect x="75" y="150" width="60" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="170" text-anchor="middle" font-size="12">ana</text>
<line x1="40" y1="60" x2="95" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="80" y1="60" x2="100" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="130" y1="60" x2="110" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="170" y1="60" x2="115" y2="150" stroke="currentColor" stroke-width="1.2"/>
<text x="105" y="52" text-anchor="middle" font-size="12">pw1 pw2 pw3 pw4 ...</text>
<text x="105" y="205" text-anchor="middle" font-size="12">stopped per account</text>
<text x="320" y="52" text-anchor="middle" font-size="12">"Winter2026!"</text>
<line x1="320" y1="60" x2="250" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="60" x2="295" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="60" x2="345" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="60" x2="390" y2="150" stroke="currentColor" stroke-width="1.2"/>
<rect x="235" y="150" width="170" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="170" text-anchor="middle" font-size="12">u1  u2  u3  u4 ...</text>
<text x="320" y="205" text-anchor="middle" font-size="12">per source, until it spreads</text>
<text x="535" y="52" text-anchor="middle" font-size="12">ip1 ip2 ip3 ip4 ...</text>
<line x1="465" y1="60" x2="465" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="510" y1="60" x2="510" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="555" y1="60" x2="555" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="600" y1="60" x2="600" y2="150" stroke="currentColor" stroke-width="1.2"/>
<rect x="450" y="150" width="170" height="30" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="535" y="170" text-anchor="middle" font-size="12">u1:p1 u2:p2 u3:p3</text>
<text x="535" y="205" text-anchor="middle" font-size="12">counters see nothing</text>
</svg>
<figcaption>Figure 13.6. Three shapes of online guessing. Counting failures per account stops the first; counting per source slows the second; the third looks like ordinary users logging in, and needs second factors and breach checks instead.</figcaption>
</figure>

### Code it: what a limiter stops

The simulation below gives the server two common controls: a per-account
back-off (five free failures, then waits that double from one second to a
15-minute cap, and a hard stop at 100 failures, the SP 800-63B ceiling) and a
per-address token bucket of 30 attempts a minute. Each attacker goes as fast
as the limiter allows for one day.

```python
DAY = 24 * 3600

class Limiter:
    def __init__(self):
        self.fails = {}       # account -> consecutive failures
        self.wait_until = {}  # account -> time of next allowed try
        self.ip_tokens = {}   # ip -> (tokens, last time): 30 a minute, bursts of 30
    def earliest(self, ip, user, t):
        tokens, last = self.ip_tokens.get(ip, (30.0, t))
        tokens = min(30.0, tokens + (t - last) * 0.5)
        ip_ok = t if tokens >= 1 else t + (1 - tokens) / 0.5
        return max(ip_ok, self.wait_until.get(user, 0))
    def record(self, ip, user, t, ok):
        tokens, last = self.ip_tokens.get(ip, (30.0, t))
        self.ip_tokens[ip] = (min(30.0, tokens + (t - last) * 0.5) - 1, t)
        n = 0 if ok else self.fails.get(user, 0) + 1
        self.fails[user] = n
        if n >= 100:
            self.wait_until[user] = float("inf")          # disabled until a reset
        elif n > 5:
            self.wait_until[user] = t + min(2 ** (n - 6), 900)  # 1 s, 2 s, ... 15 min

def attack(attempts):
    """attempts: (ip, user, password_is_right). Each goes as soon as the limiter allows."""
    lim, t, tried, won = Limiter(), 0.0, 0, set()
    for ip, user, right in attempts:
        t = max(t, lim.earliest(ip, user, t))
        if t > DAY:
            break
        lim.record(ip, user, t, right)
        tried += 1
        if right:
            won.add(user)
    return tried, len(won)

brute = [("203.0.113.5", "ana", False)] * 1_000_000
spray = [("203.0.113.5", f"user{i}", i % 500 == 0) for i in range(20_000)]
stuff = [(f"ip{i}", f"user{i}", i % 100 == 0) for i in range(20_000)]   # one try per IP
for name, attempts in [("brute force, one account", brute),
                       ("spraying, one password", spray),
                       ("stuffing, leaked pairs", stuff)]:
    tried, won = attack(attempts)
    print(f"{name:26} {tried:6d} guesses in a day, {won:3d} accounts taken")
```

```
brute force, one account      100 guesses in a day,   0 accounts taken
spraying, one password      20000 guesses in a day,  40 accounts taken
stuffing, leaked pairs      20000 guesses in a day, 200 accounts taken
```

The limiter holds the brute-force attacker to 100 guesses, which, against any
password not in the top hundred, is nothing. Against the sprayer, who tries
one password per account, the per-account counter never fires, and only the
per-address bucket slows the attack to a day; here 1 account in 500 used the
sprayed password. Against stuffing, with one attempt per address, neither
counter fires at all, and the 1 percent of users who reused a leaked password
lose their accounts. (The shares of users are invented for the simulation;
real reuse rates vary from site to site.)

**Fix it: controls that see stuffing.** The defenses that work against stuffing
do not count failures on one key.

- **A second factor.** A correct password is no longer enough. Passkeys and
  security keys stop phishing as well ([Protocols, Chapter 13](../protocols/13-Passkeys-FIDO2-and-WebAuthn.md));
  one-time codes stop stuffing but not real-time phishing
  ([Protocols, Chapter 11](../protocols/11-One-Time-Codes-and-Password-Protocols.md)).
- **Breach checks at login** (§13.7): a correct password that is in a breach
  corpus is exactly what stuffing presents, so ask for a second factor or a
  change before letting it in.
- **Global signals**: the site-wide rate of failed logins, logins from new
  devices, many accounts from one device fingerprint, success rates far below
  normal. A stuffing run raises the failure rate of the whole site even when
  no single account or address looks odd.
- **Known-device tokens**: a long-lived cookie set after a successful login
  lets a returning device skip the strictest limits, so the limits can be
  tight for everyone else.

**Lockouts as a weapon.** A hard lockout after a few failures lets anyone lock
out anyone whose username they know, and a sprayer can lock out a whole
company. Prefer growing delays to locks, apply them per account *and* source
pair where you can, and let a locked user unlock through the recovery flow
rather than a call to support. Two smaller leaks to close at the same time:
answer "wrong username or password" in both cases, and make the time the same
by running a dummy hash for unknown usernames, or the response time tells the
attacker which accounts exist.

!!! note "Life story: the 23andMe credential stuffing (2023)"
    **Born:** April to September 2023, when attackers logged in to about
    14,000 23andMe accounts with passwords reused from other breaches, then
    used the DNA Relatives feature to reach data on about 6.9 million people ·
    **Purpose:** an attack that needed no flaw in 23andMe's password storage,
    only reuse and the absence of a required second factor · **Helped:**
    mandatory second factors at 23andMe (late 2023) and wider recognition
    that sharing features multiply one account's exposure; the UK Information
    Commissioner fined the company £2.31 million in June 2025, citing the lack
    of mandatory multi-factor authentication · **Status:** the company filed
    for bankruptcy in March 2025; the case is the standard example of
    stuffing at scale

**What to do.**

1. Limit per account with growing delays (and a ceiling of 100 failures),
   and per source with a token bucket.
2. Offer, and for valuable accounts require, a second factor; prefer
   passkeys.
3. Check passwords against breach lists at login and step up on a match.
4. Watch site-wide failure rates and new-device logins, not only counters.
5. Give the same answer, in the same time, for unknown users and wrong
   passwords.

## 13.10 Account recovery: the weak door

*Level: intermediate.*

Every protection in this chapter guards the front door. Recovery is a second
door into the same account, and an attacker will use whichever is weaker.

**Security questions** were the classic weak door. In September 2008 a
student, David Kernell, reset the password of Sarah Palin's Yahoo email account,
then the US vice-presidential candidate's, by answering its recovery
questions: her date of birth, her ZIP code and where she met her husband, all
of which were public. He was convicted in 2010. In 2015 Joseph Bonneau and
colleagues at Google published a study of hundreds of millions of recovery
answers: an attacker allowed one guess at the favorite food of an
English-speaking user was right 19.7 percent of the time ("pizza"), while the
users themselves forgot their own answers at high rates within months. Answers
that are easy to remember are easy to find, and answers that are hard to find
are forgotten. SP 800-63B forbids them.

**Phone and support channels** are weak doors too. In August 2012 attackers
took over the journalist Mat Honan's accounts by social engineering two
companies' support lines: one company told them the last four digits of his
card, and the other accepted those digits as proof of identity and reset his
cloud account, from which they wiped his devices. SIM swapping, persuading a
mobile carrier to move a number to a new card, does the same to recovery by
SMS.

**Email links** are what most services use, and they are as strong as two
things: the user's email account, and the token in the link. The first is
outside your control. The second is entirely inside it, and it is often built
badly: a token derived from the email address and the time, a token that
never expires, a token stored in plain text in the database (so a database
leak is a list of working reset links), or a link built from the request's
`Host` header, which an attacker can change so the victim's email carries
the token to the attacker's server (James Kettle described this "password
reset poisoning" in 2013).

### Break it and fix it: a reset token

```python
import hashlib, secrets

# Break it: a token anyone can recompute, kept in the clear, good forever.
def bad_token(email, now):
    return hashlib.md5(f"{email}{int(now)}".encode()).hexdigest()

issued_at = 1_700_000_123.4                       # the server's clock when the mail went out
emailed = bad_token("ana@example.com", issued_at)
# The attacker asked for Ana's reset themselves and knows the time to within ten minutes.
start = 1_700_000_000
for guess_time in range(start, start + 600):
    if bad_token("ana@example.com", guess_time) == emailed:
        print("token recomputed after", guess_time - start + 1, "guesses")
        break

# Fix it: random, single use, short-lived, and only a hash kept at rest.
TTL = 20 * 60
pending = {}                                       # sha256(token) -> (user, expiry)

def issue(user, now):
    token = secrets.token_urlsafe(32)              # 256 bits from the OS generator
    for h, (u, _) in list(pending.items()):        # one live token per user
        if u == user:
            del pending[h]
    pending[hashlib.sha256(token.encode()).hexdigest()] = (user, now + TTL)
    return token                                   # goes in the email, never in a log

def redeem(token, now):
    h = hashlib.sha256(token.encode()).hexdigest()
    entry = pending.pop(h, None)                   # popped: a second use finds nothing
    if entry is None or now > entry[1]:
        return None                                # one answer for unknown, used, expired
    return entry[0]                                # now set the new password, end all sessions

t = 1_700_000_000
tok = issue("ana", t)
print(redeem(tok, t + 60))                         # ana
print(redeem(tok, t + 61))                         # used already
late = issue("bo", t)
print(redeem(late, t + TTL + 1))                   # expired
print(redeem(secrets.token_urlsafe(32), t))        # never issued
keep = issue("cy", t)
print(list(pending.values()), keep in str(pending))  # the table holds no usable token
```

```
token recomputed after 124 guesses
ana
None
None
None
[('cy', 1700001200)] False
```

The broken token is a hash of things the attacker knows or can bound: the email
address and the second the request was made. The attacker requests a reset for
the victim, notes the time, and tries every second in a ten-minute window,
which is 600 hashes. The fixed token has the properties a reset token needs:

- **Unpredictable**: 32 bytes from `secrets` (256 bits; [Chapter 4](04-Randomness-in-Practice.md#44-in-python-secrets-not-random)
  explains why 128 bits is the floor).
- **Hashed at rest**: the table keeps SHA-256 of the token, so a stolen table
  contains no usable link. A fast hash is right here, unlike for passwords,
  because the token has full entropy; nobody can guess it to test against the
  hash. Looking it up by its hash also means the database index never compares
  a secret against attacker input.
- **Single use**: redeeming removes it, so a link read later from an email
  archive or a proxy log does nothing.
- **Short-lived**: 20 minutes here; OWASP suggests keeping it short, and an
  hour is a common upper bound.
- **One live token per user**, and **all of them revoked** when the password
  changes by any route.
- **One answer for every failure**: unknown, used and expired tokens look the
  same, as do reset requests for addresses with and without accounts ("if
  that address has an account, we have sent a link").

After a successful reset, end every session and every remembered device for
the account, notify the user at the old address, and if the account has a
second factor, require it too: a reset that bypasses the second factor makes
the factor optional for an attacker who has the user's email. Build the link
from a fixed, configured host name, never from the request. And rate-limit
reset requests per account and per source, since each sends an email the
attacker can make arrive at any hour.

!!! note "Life story: security questions"
    **Born:** with telephone banking and early web accounts, as a cheap
    fallback when a password was forgotten ("mother's maiden name") ·
    **Purpose:** recover an account through facts only the owner should know ·
    **Helped:** attackers more than owners: the Palin account reset (2008),
    and Bonneau and colleagues' 2015 study at Google, which found answers both
    guessable and forgettable · **Retired:** forbidden as authenticators and
    for recovery by SP 800-63B; still found on older sites ·
    **Replaced by:** recovery codes printed at enrollment, second registered
    devices and passkeys, and identity checks for accounts that warrant them

**What to do.**

1. Remove security questions. Offer recovery codes and a second registered
   device or passkey.
2. Build reset tokens from `secrets`, store only their hash, make them
   single-use and short-lived, and revoke them on any password change.
3. Give the same response for every failure, and build links from a fixed
   host name.
4. After a reset, end all sessions, notify the user, and still require the
   second factor.

## 13.11 When the hashes leak anyway

*Level: intermediate.*

Plan for the day the table is copied. The breaches of
[§11.9](../../book/11-Passwords-and-Key-Derivation.md#119-breaches-as-stories)
(RockYou, LinkedIn, Adobe, Ashley Madison, Yahoo, LastPass) show what a weak
store costs; this section is about what a good one still requires.

Dropbox is the example of a breach handled during an upgrade. Data taken in
2012 surfaced in 2016: about 68 million accounts, roughly half hashed with
bcrypt and half with salted SHA-1, the accounts the company had not yet moved
to bcrypt. Shortly before the data surfaced, Dropbox forced a reset for every
user who had not changed their password since mid-2012, which is why the
leak did less damage than its size suggests. The lesson is
§13.6's: a migration is not finished until the old hashes are gone.

The other recurring failure is the password that never reached the hash. In
May 2018 Twitter found that a bug had written passwords in plain text to an
internal log and asked all its users, then about 330 million, to consider
changing them; GitHub reported a similar logging bug the same month; in 2019
Facebook found hundreds of millions of passwords readable in internal logs and
was later fined 91 million euros in Ireland. No storage scheme helps when the
request body is logged before the hash runs. Mark password fields so that the
logging, tracing and error-reporting code redacts them, and test that it does
([Chapter 12](12-Secrets-in-Operations.md)).

When it happens:

1. Assume the hashes will be cracked at the rate their parameters allow, and
   work out from your own calibration how fast that is.
2. If a pepper was kept elsewhere and not taken, say so; it changes what
   users must do.
3. Force a reset for affected accounts at their next login, end their
   sessions and revoke their API tokens, starting with administrators.
4. Rotate the pepper if there is any chance it was exposed; with a pepper
   after the hash this is a batch job, and before the hash it means resets.
5. Tell users plainly to change the password anywhere else they used it,
   since that, not your site, is where stuffing will use it next.

## 13.12 Going deeper

*Level: expert.*

??? abstract "How private is a five-character prefix?"

    k-anonymity hides the password among the bucket's entries only if the
    attacker has no better guess about which one it is. They often do. Li,
    Pal, Ali, Sullivan, Chatterjee and Ristenpart (ACM CCS 2019) showed that a
    leaked prefix, combined with a model of how people choose passwords, can
    raise an online attacker's success many times over, since a few popular
    passwords dominate each bucket. They proposed **frequency-smoothing
    bucketization**, which spreads popular passwords across several buckets so
    that the prefix carries less information, and a variant of the range query
    keyed on username and password together. Google's Password Checkup (Thomas
    and others, USENIX Security 2019) goes further: the client sends a short
    prefix of a slow hash of the username and password, blinded with an
    elliptic-curve exponent, and the server returns its candidates blinded
    under its own key, so neither side learns more than whether there is a
    match. This is private set membership, built from the same commutative
    blinding as the OPRF in
    [Protocols, §11.8](../protocols/11-One-Time-Codes-and-Password-Protocols.md#118-opaque-and-cpace).

??? abstract "What a guess costs the attacker"

    The defender's parameters set a price per guess. If one hash costs $T$
    seconds on a core and $M$ bytes of memory, an attacker on general-purpose
    hardware pays roughly the same, while a memory-hard function keeps a GPU
    or ASIC from doing much better, because the cost that dominates is memory
    times time (book 1, [§11.13](../../book/11-Passwords-and-Key-Derivation.md#1113-going-deeper)).
    For a password drawn from a distribution in which the attacker needs $G$
    guesses on average, the cost to crack it is about $G \cdot c$, where $c$
    is the price of one guess on the attacker's best hardware. Doubling $T$
    doubles $c$ and adds one bit of effective strength to every password at
    once; a pepper the attacker lacks makes $c$ infinite; a breach list makes
    $G$ small for exactly the users the list contains. That is why the three
    controls are complementary, not alternatives.

??? abstract "Hashing on the client, server relief, and why the password should stay home"

    Hashing in the browser before sending does not protect the server's store:
    whatever the client sends becomes the password, and the server must still
    hash it slowly. Some designs split the work on purpose. Makwa, a Password
    Hashing Competition finalist by Thomas Pornin, supports **server relief**,
    letting the client do most of the slow computation so a busy server does
    less; it never caught on. The cleaner answer is to stop sending the
    password: an augmented PAKE such as OPAQUE does the slow hash on the
    client and gives the server something it cannot use to log in, nor test
    guesses against without the OPRF key, and passkeys remove the shared
    secret altogether
    ([Protocols, §11.6](../protocols/11-One-Time-Codes-and-Password-Protocols.md#116-challenge-response-and-why-the-password-should-stay-home)
    and [Protocols, §13.5](../protocols/13-Passkeys-FIDO2-and-WebAuthn.md#135-why-a-passkey-cannot-be-phished)).
    For services that keep passwords, this chapter's store is the floor;
    for new systems, those protocols are the ceiling worth aiming at.

## Check yourself

??? question "1. RFC 9106's first recommended option is Argon2id with 2 GiB of memory. Why does OWASP's floor ask for only 19 MiB, and which should a busy web service use?"

    RFC 9106 aims at the attacker's cost on a machine that can afford it,
    such as disk encryption, where one derivation a day is fine. A web service
    runs one hash per login at peak traffic, and the memory needed is about
    logins per second times seconds per hash times memory per hash (§13.3).
    OWASP's rows are floors a modest server can always afford. A busy web
    service should start at or above the OWASP floor and go as far toward
    RFC 9106 as its measured hardware and peak load allow.

??? question "2. Your calibration shows scrypt with N = 2^17 takes 300 ms on your login servers, over your 250 ms budget. Name three acceptable responses."

    Accept the 300 ms if capacity allows; switch to one of OWASP's
    equal-cost rows, such as $N = 2^{16}$, $r = 8$, $p = 2$; or give the login
    path faster or more cores (dedicated login workers). Going below the
    OWASP floor is not among them.

??? question "3. Why can a one-megabyte password take a minute to check with one PBKDF2 implementation and a millisecond with another, and what two fixes apply?"

    HMAC hashes any key longer than one block before use. An implementation
    that calls HMAC with the raw password on every iteration rehashes the
    megabyte thousands of times (Django, 2013); a good one prepares the key
    once. Fix: use a library that prepares the key once, and cap password
    length in bytes before hashing (a few hundred characters to 4 KiB, never
    below 64 characters).

??? question "4. What does `$argon2id$v=19$m=65536,t=2,p=1$...` tell a verifier, and what is easy to get wrong in it?"

    The algorithm (Argon2id), the version (19, which is 0x13, version 1.3),
    memory 65,536 KiB (64 MiB), 2 passes, 1 lane, then the salt and hash in
    unpadded Base64. The common mistake is the memory unit: `m` is in KiB, and
    passing the number to a library that expects bytes silently gives 64 KiB.

??? question "5. A colleague proposes caching successful logins under `bcrypt(user_id + username + password)`. What goes wrong, and what should the cache key be?"

    bcrypt reads only the first 72 bytes, so with a long enough user ID and
    username the password falls past the limit and every password gives the
    same key (Okta, 2024). A cache key should be an HMAC under a secret key
    over an unambiguous encoding of the fields; password hashes are only for
    passwords, and only within their input limits.

??? question "6. What does a pepper protect against, and what does it not? Where should it live?"

    It protects a stolen database (or backup) from offline guessing, since
    without the pepper no guess can be tested. It does nothing against online
    guessing, little against an attacker who controls the login server while
    they hold it, and nothing if it is stored with the data. It belongs in an
    HSM or KMS that computes with it without exporting it, or at least in a
    secrets manager outside the database and its backups, with a key
    identifier stored in each hash so it can be rotated.

??? question "7. You inherit 40 million unsalted MD5 hashes. Why is rehash-on-login not enough, and why is `bcrypt(md5(password))` a risky wrap?"

    Rehash-on-login never reaches dormant accounts, which keep their MD5
    hashes until a breach exposes them. Wrapping every row today removes the
    MD5 hashes at rest. But a wrap whose inner value is an unsalted MD5 can be
    "shucked": an attacker feeds MD5 hashes leaked from other sites straight
    into the slow function and, on a match, learns the inner MD5 and cracks it
    at GPU speed. Put a pepper (or at least a per-user salt) inside, for
    example `scrypt(salt, HMAC(pepper, md5))`, and peel to a direct hash at
    each login.

??? question "8. In a Pwned Passwords range query, what does the service learn, and why was padding added in 2020?"

    It learns the first five hex characters of the password's SHA-1, one of
    about a million buckets, each holding many breached hashes. Buckets differ
    in size, so an observer of the encrypted response could infer the bucket
    from its length; padding fills every response with fake zero-count rows so
    that sizes no longer give the prefix away.

??? question "9. Your site has per-account lockouts and per-IP rate limits, yet thousands of accounts are taken over in a week, each with one correct login. What is happening, and what helps?"

    Credential stuffing: leaked username and password pairs from other sites,
    one attempt each, from many addresses, so no counter fires. What helps is
    a second factor (passkeys best), breach checks at login with step-up,
    site-wide signals such as the global failure rate and new-device logins,
    and known-device tokens that let the limits be tighter for unknown
    devices.

??? question "10. List the properties of a safe password reset token and say why each matters."

    Unpredictable (from `secrets`, 256 bits), so it cannot be computed or
    guessed; hashed at rest, so a stolen table gives no working links;
    single-use, so a link read later does nothing; short-lived, to limit the
    window; one live token per user and all revoked on a password change; and
    the same response for every failure, so tokens and accounts cannot be
    probed. Around it: links from a fixed host name, sessions ended and the
    user notified after a reset, and the second factor still required.

## What you learned

- Choose Argon2id at or above OWASP's floor (19 MiB, $t = 2$, $p = 1$), up
  toward RFC 9106's options as hardware allows; scrypt at $N = 2^{17}$ if
  Argon2id is missing; bcrypt only where it already is; PBKDF2-HMAC-SHA256 at
  600,000 iterations or more when FIPS 140-3 is required. These numbers move:
  date them and recheck.
- Measure on your own hardware, plan cores and memory from peak logins times
  hash time (times memory), and cap password length in bytes, because a slow
  hash is a resource an attacker can spend.
- Store one self-describing string (PHC format where possible) so that every
  hash carries its algorithm, version, parameters and salt and can be
  upgraded. bcrypt reads only 72 bytes: enforce it or pre-hash with a
  peppered HMAC.
- A pepper protects a stolen database only if it lives elsewhere, ideally in
  an HSM or KMS; give it a key identifier so it can be rotated.
- Rehash on login, and for weak legacy tables wrap every row in a peppered
  slow hash at once (Facebook's onion, 2014), then peel it at login; an
  unpeppered wrap of an unsalted hash can be shucked with leaked hashes.
- Check passwords against breach lists with a k-anonymous range query, which
  reveals only a 20-bit prefix; ask for padding.
- SP 800-63B-4: 15 characters for password-only accounts, 8 with another
  factor, at least 64 allowed, no composition rules, no forced rotation, a
  blocklist, no security questions, at most 100 failures in a row.
- Per-account and per-source limits stop brute force and slow spraying, but
  credential stuffing needs second factors, breach checks at login and
  site-wide signals.
- Recovery is the weak door: no security questions; reset tokens random,
  hashed at rest, single-use, short-lived and revoked on change.
- Plan for the leak: the password in a log needs no cracking, and a
  migration is not done until the old hashes are gone.

**Next:** [Chapter 14](14-Encrypting-Application-Data.md) moves from secrets
the server checks to data it must be able to read back: field and record
encryption, envelope keys, and what searchable encryption leaks.

## Further reading

- Alex Biryukov, Daniel Dinu, Dmitry Khovratovich and Simon Josefsson,
  "Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work
  Applications", RFC 9106 (September 2021), §4 (parameter choice) and §7.4.
- OWASP, Password Storage Cheat Sheet (cheatsheetseries.owasp.org), as read in
  November 2026; and the Forgot Password and Credential Stuffing Prevention
  cheat sheets.
- C2SP, "PHC Strings" (c2sp.org/phc-strings), the Password Hashing
  Competition string format.
- NIST, SP 800-63B (June 2017) and SP 800-63B-4 (2025), Digital Identity
  Guidelines: Authentication and Authenticator Management; SP 800-132
  (PBKDF2).
- Django Software Foundation, "Security releases issued" (15 September 2013),
  CVE-2013-1443; Django documentation, "Password management in Django"
  (password upgrading without requiring a login).
- Solar Designer, crypt_blowfish 1.2 announcement (July 2011), CVE-2011-2483;
  OpenBSD bcrypt `$2b$` change (2014).
- Okta, security advisory on AD/LDAP delegated authentication (1 November
  2024).
- Devdatta Akhawe, "How Dropbox securely stores your passwords" (Dropbox
  Tech Blog, 21 September 2016).
- Alec Muffett, "Facebook: Password Hashing and Authentication", Passwords
  conference, Trondheim, December 2014 (slides); Thomas Rivasseau, "Hash
  chaining degrades security at Facebook" (arXiv 2510.12665, 2025).
- Sam Croley, "What the Shuck? Layered Hash Shucking" (DEF CON 28, 2020).
- Junade Ali, "Validating Leaked Passwords with k-Anonymity" (Cloudflare blog,
  21 February 2018); Troy Hunt, "I've Just Launched Pwned Passwords V2"
  (February 2018) and "Enhancing Pwned Passwords Privacy with Padding"
  (March 2020); Have I Been Pwned API documentation.
- Latanya Sweeney, "k-Anonymity: A Model for Protecting Privacy",
  *International Journal of Uncertainty, Fuzziness and Knowledge-Based
  Systems* 10(5), 2002.
- Lucy Li, Bijeeta Pal, Junade Ali, Nick Sullivan, Rahul Chatterjee and Thomas
  Ristenpart, "Protocols for Checking Compromised Credentials" (ACM CCS 2019).
- Kurt Thomas et al., "Protecting accounts from credential stuffing with
  password breach alerting" (USENIX Security 2019).
- Yinqian Zhang, Fabian Monrose and Michael K. Reiter, "The Security of
  Modern Password Expiration: An Algorithmic Framework and Empirical
  Analysis" (ACM CCS 2010).
- Robert McMillan, "The Man Who Wrote Those Password Rules Has a New Tip:
  N3v\$r M1^d!" (*Wall Street Journal*, 7 August 2017); Aaron Margosis,
  "Security baseline (DRAFT) for Windows 10 v1903 and Windows Server v1903"
  (Microsoft, April 2019); NCSC, "Password Guidance: Simplifying Your
  Approach" (2015).
- Microsoft Security Response Center, "Microsoft Actions Following Attack by
  Nation State Actor Midnight Blizzard" (19 January 2024).
- UK Information Commissioner's Office, penalty notice to 23andMe (June 2025);
  23andMe disclosures (October and December 2023).
- Joseph Bonneau, Elie Bursztein, Ilan Caron, Rob Jackson and Mike
  Williamson, "Secrets, Lies, and Account Recovery: Lessons from the Use of
  Personal Knowledge Questions at Google" (WWW 2015).
- Mat Honan, "How Apple and Amazon Security Flaws Led to My Epic Hacking"
  (*Wired*, August 2012).
- James Kettle, "Practical HTTP Host header attacks" (2013).
- Book 1, [Chapter 11](../../book/11-Passwords-and-Key-Derivation.md), and the
  [Passwords guide](../../topics/Passwords.md).
