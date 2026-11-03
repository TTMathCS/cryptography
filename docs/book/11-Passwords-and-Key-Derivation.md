# 11. Passwords and Key Derivation

*Every algorithm so far assumed a key: 128 or 256 bits, uniformly random, known
only to the right people. Real systems rarely start with one. They start with a
password a person can remember, or with a Diffie-Hellman result that is secret
but not uniform. This chapter turns both into keys. For passwords it builds up,
one failure at a time, from storing them in plain text to Argon2, and tells the
breaches that taught each lesson. For strong secrets it builds HKDF and the
NIST key derivation functions.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a stolen password database is a guessing problem, and how salts and slow hashes change its economics
    - PBKDF2, bcrypt, scrypt and Argon2: how each works, what it defends against, and what parameters to use
    - what memory-hardness means and why it beats GPUs and custom chips, with a time-memory trade-off you can run
    - the breaches (RockYou, LinkedIn, Adobe, Ashley Madison, LastPass) and what each one teaches
    - HKDF and the NIST KDFs: extracting a key from a Diffie-Hellman secret and splitting one key into many

    **You need:** [Chapter 4](04-Randomness-and-Perfect-Secrecy.md) (entropy),
    [Chapter 9](09-Hash-Functions.md) (hash functions) and
    [Chapter 10](10-Message-Authentication.md) (HMAC).

    **Levels:** 11.1 to 11.4 are for beginners; 11.5 to 11.12 are
    intermediate; 11.13 is expert.

## 11.1 The problem: storing passwords

The first computers shared by many people needed a way to tell users apart, and
the password was the obvious one. MIT's Compatible Time-Sharing System (CTSS),
in the early 1960s, kept every user's password in a file on disk. According to
Tom Van Vleck, who worked on the system, one day in 1966 two administrators were
editing two files at once, the system's message of the day and the password
file, and a mix-up in the editor's temporary files put the password file in
place of the message. Everyone who logged in that day saw every password.

The fix came from Cambridge, England. For the Titan time-sharing system in the
late 1960s, Roger Needham and Mike Guy stored not the password but the result of
a **one-way function** of it. To log in, the system applied the function to what
you typed and compared. A stolen file would show only the function's outputs.
Maurice Wilkes described the idea in his 1968 book *Time-Sharing Computer
Systems*. A decade later Robert Morris and Ken Thompson built it into Unix, and
their 1979 paper "Password Security: A Case History" set out most of what this
chapter covers: users pick guessable passwords, so the function must be slow,
and each password should be mixed with a random **salt**.

Here is the attacker's position, then and now. They steal the database
(through an SQL injection, a lost backup, an insider) and take it home. There,
with no rate limits and no one watching, they can make as many guesses as their
hardware allows. This is an **offline attack**, and it is what password storage
must defend against. (An **online attack**, guessing at the login page, is slowed
by lockouts and rate limits instead.)

The defender cannot stop the guessing. What they control is **how much each
guess costs**. Every idea in this chapter is a way to raise that cost.

## 11.2 First try: hash the password

The natural first step is the one Needham and Guy took: store
$H(\mathit{password})$ with a cryptographic hash like SHA-256. It is one-way
([Chapter 9](09-Hash-Functions.md)), so the database should not reveal the
passwords.

It doesn't, directly. But one-way means it is hard to invert *for random
inputs*, and passwords are not random. Year after year, leaked lists show
"123456" and "password" at the top. A 256-bit key has $2^{256}$ possible values;
the passwords people actually pick come from a space of perhaps $10^{10}$ to
$10^{12}$ likely candidates. The attacker doesn't invert the hash; they hash every
likely password and look for matches:

```python
import hashlib

def h(p):
    return hashlib.sha256(p.encode()).hexdigest()

leaked = {"alice": h("sunshine"), "bob": h("123456"),
          "carol": h("123456"), "dave": h("Tr0ub4dor&3")}

for user, digest in leaked.items():
    print(f"{user:6} {digest[:16]}...")

words = ["123456", "password", "qwerty", "sunshine", "iloveyou", "dragon"]
table = {h(w): w for w in words}         # computed once, reused on every leak
for user, digest in leaked.items():
    print(user, "->", table.get(digest, "not found"))
```

```
alice  a941a4c4fd0c01cd...
bob    8d969eef6ecad3c2...
carol  8d969eef6ecad3c2...
dave   48486e1514e84234...
alice -> sunshine
bob -> 123456
carol -> 123456
dave -> not found
```

Two problems show at once:

1. **Equal passwords give equal hashes.** Bob and Carol's rows match, so cracking
   one cracks both, and the most common hashes in a leak are obviously the most
   common passwords.
2. **The table works on every leak.** The attacker hashes a list of a billion
   common passwords once and reuses it forever, against every site that stored
   plain SHA-256. Martin Hellman showed in 1980 how to trade memory for time in
   such tables, and Philippe Oechslin's **rainbow tables** (2003) made them
   compact enough to download: tables covering every short password for an
   unsalted hash were traded online for years.

Dave's password survived only because it wasn't in this tiny list. Against a
real list of billions of leaked passwords and generated variations, and at
billions of SHA-256 guesses per second on a graphics card, few human-chosen
passwords last long.

## 11.3 Salt

A **salt** is a random value, different for each user, stored next to the hash
and mixed in: store $(\mathit{salt}, H(\mathit{salt} \,\Vert\, \mathit{password}))$. It is not secret.

```python
import hashlib, os

def store(password):
    salt = os.urandom(16)
    return salt, hashlib.sha256(salt + password.encode()).digest()

bob, carol = store("123456"), store("123456")
print(bob[1] == carol[1])                # False: same password, different hashes

words = ["123456", "password", "qwerty", "sunshine", "iloveyou", "dragon"]
salt, digest = bob                       # the attacker must redo the list for each salt
print([w for w in words if hashlib.sha256(salt + w.encode()).digest() == digest])
# False
# ['123456']
```

Salt fixes both problems from §11.2. Equal passwords now look different, and a
precomputed table is useless: it would need a separate table for every possible
salt, and with 128-bit salts there are $2^{128}$ of them. The attacker must attack
each user on their own.

What salt does **not** do is slow down an attack on one user. Bob's password
still fell to the six-word list instantly. With a million users, the attacker
pays a million times more in total, but a weak password on any one account
costs them as little as before. That needs a different idea.

Morris and Thompson's Unix salt was 12 bits, 4,096 values; it stopped the
precomputed tables of 1979 but is far too small today. Modern salts are 16
bytes from a secure random source.

## 11.4 Make each guess slow: key stretching and PBKDF2

The defender checks a password once per login. The attacker checks it billions
of times. So make the function slow on purpose: if it takes the server a tenth
of a second, nobody minds at login, but the attacker's billions of guesses each
take that long too. This is **key stretching**.

**The arithmetic.** Suppose a password is 8 random lowercase letters: $26^8 \approx 2.09 \times 10^{11}$
choices, about 37.6 bits. Take, as a round illustrative figure, a cracking rig
that computes $10^{10}$ SHA-256 hashes per second.

- Stored with one SHA-256: trying every password takes $2.09 \times 10^{11} / 10^{10} \approx 21$ seconds.
- Stored with a function that costs 600,000 hash-function calls per guess: the
  rig manages about 16,700 guesses a second, and trying them all takes about
  $1.25 \times 10^7$ seconds, around 145 days.

Stretching by a factor $c$ adds $\log_2 c$ bits of work to every guess: 600,000 is
about $2^{19.2}$. It cannot add what the password lacks. A password from a list of a
thousand common ones is found in a second either way.

**PBKDF2.** The first widely standardized stretching function is PBKDF2,
from Burt Kaliski at RSA Laboratories, in PKCS #5 v2.0 (1999) and RFC 2898
(2000, now RFC 8018). NIST approves it in SP 800-132. It repeats HMAC, with the
password as the HMAC key, and XORs the results together so no step can be
skipped:

$$
\begin{aligned}
U_1 &= \mathrm{HMAC}(P,\; S \,\Vert\, \mathrm{INT}(i)), \qquad U_j = \mathrm{HMAC}(P,\; U_{j-1}) \quad (j = 2, \ldots, c) \\
T_i &= U_1 \oplus U_2 \oplus \cdots \oplus U_c, \qquad \mathit{DK} = T_1 \,\Vert\, T_2 \,\Vert\, \cdots
\end{aligned}
$$

$P$ is the password, $S$ the salt, $c$ the iteration count and $i$ the block number
as 4 bytes. Here it is from `hmac`, checked against RFC 6070's test vector and
Python's built-in version:

```python
import hashlib, hmac

def pbkdf2(password, salt, iterations, length):
    out, block = b"", 1
    while len(out) < length:
        u = hmac.new(password, salt + block.to_bytes(4, "big"), hashlib.sha1).digest()
        t = int.from_bytes(u, "big")
        for _ in range(iterations - 1):
            u = hmac.new(password, u, hashlib.sha1).digest()
            t ^= int.from_bytes(u, "big")
        out += t.to_bytes(len(u), "big")
        block += 1
    return out[:length]

print(pbkdf2(b"password", b"salt", 4096, 20).hex())          # RFC 6070
print(pbkdf2(b"password", b"salt", 4096, 20) == hashlib.pbkdf2_hmac("sha1", b"password", b"salt", 4096))
psk = hashlib.pbkdf2_hmac("sha1", b"password", b"IEEE", 4096, 32)   # Wi-Fi: SSID is the salt
print(psk.hex())
# 4b007901b765489abead49d926f721d065a429c1
# True
# f42c6fc52df0ebef9ebb4b90b38a5f902e83fe1b135a70e23aed762e9710a12e
```

The last line is how WPA2-Personal Wi-Fi turns a passphrase into its 256-bit
key: PBKDF2-HMAC-SHA-1 with 4,096 iterations and the network name as the salt
(the value printed is the test vector from IEEE 802.11i for passphrase
"password" and network "IEEE"). An attacker who records one handshake can test
passphrases offline at the cost of 4,096 iterations each, which is why a weak
Wi-Fi password falls quickly. PBKDF2 also protects encrypted key files (PKCS #8
and #12), Bitcoin seed phrases (BIP-39, 2,048 iterations of HMAC-SHA-512) and
many FIPS-bound systems.

**Its weakness.** PBKDF2 costs only *time*. Each guess needs a few hundred bytes
of memory, so a graphics card with thousands of small cores runs thousands of
guesses side by side, and custom chips do even better. The defender pays for one
CPU core; the attacker pays far less per guess. The rest of this chapter is about
closing that gap. OWASP's 2023 guidance asks for at least 600,000 iterations
with HMAC-SHA-256 if PBKDF2 must be used.

## 11.5 bcrypt

*Level: intermediate.*

In 1999 Niels Provos and David Mazières published bcrypt for OpenBSD. It
introduced the idea every later design kept: a **cost parameter** stored with the
hash, so the work can be raised as computers get faster, and old hashes can be
upgraded the next time each user logs in.

bcrypt is built on Bruce Schneier's Blowfish cipher, whose key setup is
unusually slow: it rewrites 4 KiB of tables (initialized from the digits of $\pi$)
with 521 Blowfish encryptions. bcrypt's "expensive key setup" runs it
$2^{\mathit{cost}}$ times, alternately keyed with the password and the salt, then encrypts the
text `OrpheanBeholderScryDoubt` 64 times with the resulting tables. A stored
hash is one 60-character string:

```
$2b$12$abcdefghijklmnopqrstuutwZ1IOTtu3SsEBT5lI/LFncP31tIybm
```

`2b` is the version, `12` the cost ($2^{12} = 4{,}096$ rounds of the slow loop), then 22
characters of salt and 31 of hash in bcrypt's own base-64 alphabet. (This one is
the password "password" with a fixed, readable salt, made with Python's `bcrypt`
package so you can reproduce it.) At cost 4 the same inputs give
`$2b$04$abcdefghijklmnopqrstuughE8Ev8uGFaUgY2cNEySvxngrb/Jzdm`, with 256 times
less work.

**Two traps.**

- **The 72-byte limit.** bcrypt uses at most 72 bytes of the password and many
  implementations silently ignore the rest. In 2024 Okta disclosed that its
  authentication cache keyed entries by bcrypt of user ID, username and password
  together; with a username long enough, the password fell past byte 72, and
  some logins succeeded with any password. Newer libraries refuse long inputs:
  Python's `bcrypt` 5.0 raises `ValueError`. To allow long passwords, hash them
  first with SHA-256 and base64-encode the digest (a raw digest can contain a
  zero byte, which some implementations treat as the end).
- **Version bugs.** In 2011 a sign-extension bug was found in a widely used C
  implementation that weakened some passwords with non-ASCII characters; the
  `$2y$` and `$2b$` prefixes mark fixed versions.

bcrypt is still acceptable at cost 10 or more. Its 4 KiB of tables fit in a CPU
cache and slow GPUs somewhat, but it is not memory-hard in the sense of the next
section, and FPGAs crack it well.

## 11.6 Memory-hardness and scrypt

*Level: intermediate.*

Why do graphics cards and custom chips win against PBKDF2? A chip area that
computes SHA-256 is small and cheap, so an attacker can put thousands on one
chip. Memory is different: a megabyte of RAM costs about the same wherever it is,
and cannot be shrunk by clever design. So the defense is to make each guess
**need a lot of memory**, and to make sure an attacker who uses less memory pays
heavily in extra time. A function with that property is **memory-hard**.

Colin Percival designed **scrypt** in 2009 for his Tarsnap backup service, the
first memory-hard password function in wide use; it became RFC 7914 in 2016. Its
core, ROMix, has two phases:

1. **Fill:** start from a block $X$ derived from the password and salt (by
   PBKDF2). Store $V_0 = X$, mix, store $V_1$, mix, and so on, $N$ times.
2. **Read back:** $N$ times, read the current $X$ as a number $j$, fetch $V_j$, and
   set $X = \mathrm{mix}(X \oplus V_j)$.

The places read in phase 2 depend on data not known until that moment, so the
whole table has to be kept. An attacker can store only every $k$-th entry and
recompute the missing ones on demand, but each read then costs about $k/2$ extra
mixes. Here is ROMix in miniature, with SHA-256 standing in for scrypt's
Salsa20/8 mixing, run with full memory and with three-quarters, 15/16 and 63/64 of
it thrown away:

```python
import hashlib

calls = 0
def mix(x):                              # stands in for scrypt's Salsa20/8 BlockMix
    global calls
    calls += 1
    return hashlib.sha256(x).digest()

def romix(x, n, keep=1):                 # keep every keep-th table slot only
    table = {}
    for i in range(n):                   # fill the table
        if i % keep == 0:
            table[i] = x
        x = mix(x)
    for _ in range(n):                   # read it back at places the data picks
        j = int.from_bytes(x[:4], "little") % n
        v = table[j - j % keep]
        for _ in range(j % keep):        # rebuild a slot we threw away
            v = mix(v)
        x = mix(bytes(a ^ b for a, b in zip(x, v)))
    return x

n = 4096
for keep in (1, 4, 16, 64):
    calls = 0
    out = romix(b"password+salt".ljust(32, b"\0"), n, keep)
    print(f"memory {n // keep:5d} slots   work {calls:7d} mixes   {out.hex()[:16]}")
```

```
memory  4096 slots   work    8192 mixes   0008087c9501812d
memory  1024 slots   work   14358 mixes   0008087c9501812d
memory   256 slots   work   39022 mixes   0008087c9501812d
memory    64 slots   work  137118 mixes   0008087c9501812d
```

Every run gives the same answer; only the cost changes. Cutting memory 64 times
multiplied the work almost 17 times. The product of memory and time, which is
roughly what an attacker's hardware costs, fell from $4096 \times 8192 \approx 3.4 \times 10^7$ to
about $8.8 \times 10^6$ and then stops falling: it settles near $n^2/2$, which is
$8.4 \times 10^6$ here. Trading memory for time gives the attacker at most a small
constant factor. Alwen, Chen, Pietrzak, Reyzin and Tessaro proved in 2017 that,
in an idealized model, no strategy does fundamentally better.

**Parameters.** scrypt takes $N$ (the number of table entries, a power of 2),
$r$ (block size: each entry is $128r$ bytes) and $p$ (independent lanes). Memory is
$128 \cdot N \cdot r$ bytes: with $N = 2^{17}$ and $r = 8$, OWASP's floor, that is 128 MiB per
guess. RFC 7914's test vectors, recomputed with Python's built-in `hashlib.scrypt`:

| Password, salt | $N, r, p$ | First 32 of 64 output bytes |
|---|---|---|
| "", "" | 16, 1, 1 | `77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442` |
| "password", "NaCl" | 1024, 8, 16 | `fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b373162` |

**A warning from Litecoin.** Litecoin (2011) used scrypt as its proof of work,
but with only 128 KiB of memory per hash so that ordinary computers could mine.
Custom scrypt mining chips appeared by 2014. Memory-hardness is only as strong as
the memory parameter.

**yescrypt**, Alexander Peslyak's (Solar Designer's) extension of scrypt, is now
the default for `/etc/shadow` in Debian, Fedora, Ubuntu and others.

## 11.7 Argon2

*Level: intermediate.*

By 2013 there were several competing ideas and no agreed standard, so
Jean-Philippe Aumasson organized the open **Password Hashing Competition**
(2013 to 2015), on the model of the AES and SHA-3 contests. Entries came from
around the world. In July 2015 the panel chose **Argon2**, by Alex Biryukov,
Daniel Dinu and Dmitry Khovratovich of the University of Luxembourg, and gave
special recognition to Catena (Germany), Lyra2 (Brazil), Makwa and yescrypt.
Argon2 became RFC 9106 in 2021.

**How it works.** Argon2 fills $m$ KiB of memory with 1 KiB blocks. The first
blocks come from a BLAKE2b hash of every input: password, salt, parameters, and an
optional secret key and associated data. Each later block is a compression of
the previous block and one earlier block chosen by an index:

$$
B[i][j] = G\big(B[i][j-1],\; B[l][z]\big),
$$

where $G$ is built from BLAKE2b's round with a multiplication added to every
addition, so hardware can't skip the expensive part. It makes $t$ passes over
memory, and $p$ lanes run in parallel. The final blocks of the lanes are XORed and
hashed to the output.

**The three variants** differ in how the earlier block $B[l][z]$ is chosen:

| Variant | Chosen by | Strength | Weakness |
|---|---|---|---|
| Argon2d | the data (like scrypt) | best against trade-off attacks | access pattern leaks through cache timing |
| Argon2i | a counter, independent of the password | no timing leak | more open to trade-off attacks |
| **Argon2id** | counter for the first half pass, data after | both, mostly | the recommended default |

In 2016 Joël Alwen and Jeremiah Blocki showed that Argon2i could be computed
with noticeably less memory than intended. The designers strengthened it in
version 1.3 (the `v=19` in stored hashes), and Argon2id became the recommended
form.

**Parameters.** RFC 9106 suggests $t = 1$, $p = 4$, $m = 2$ GiB if the server
can afford it, or $t = 3$, $p = 4$, $m = 64$ MiB when memory is tight. OWASP's floor
is $m = 19$ MiB, $t = 2$, $p = 1$. Tune so a hash takes a noticeable fraction of a second
on your own server.

The reference code is in C; in Python you reach it through the `argon2-cffi`
package:

```python
# pip install argon2-cffi
from argon2 import PasswordHasher
from argon2.low_level import Type, hash_secret_raw

ph = PasswordHasher()                    # Argon2id, t=3, m=64 MiB, p=4
stored = ph.hash("correct horse battery staple")
print(stored[:30])                       # the rest is salt and hash, new every run
print(ph.verify(stored, "correct horse battery staple"))     # raises if wrong

for pw in (b"password", b"passwore"):    # fixed salt, to compare outputs
    tag = hash_secret_raw(pw, b"somesalt", time_cost=2, memory_cost=65536,
                          parallelism=1, hash_len=32, type=Type.ID)
    print(tag.hex())
```

```
$argon2id$v=19$m=65536,t=3,p=4
True
09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7
a667a63020b973d48ad5afb94b08b995e7caed73865baae4390ff516a5167ce1
```

The stored string carries the variant, version, parameters and salt, so the
server can raise the cost later; `ph.check_needs_rehash(stored)` says when a
hash was made with older settings. One changed letter in the password gives an
unrelated tag, and every guess must fill and reread 64 MiB.

## 11.8 Code it: a password store

*Level: intermediate.*

Everything above comes together in two functions. This version uses scrypt
because it is in Python's standard library; with `argon2-cffi` installed,
`PasswordHasher` does the same job in fewer lines.

```python
import base64, hashlib, hmac, os

N, R, P = 2**17, 8, 1                    # 128 MiB a hash; raise N over the years

def b64(b):
    return base64.b64encode(b).decode()

def hash_password(password):
    salt = os.urandom(16)
    key = hashlib.scrypt(password.encode(), salt=salt, n=N, r=R, p=P, maxmem=2**28, dklen=32)
    return f"scrypt${N}${R}${P}${b64(salt)}${b64(key)}"

def check_password(password, stored):
    _, n, r, p, salt, key = stored.split("$")
    n, r, p = int(n), int(r), int(p)
    again = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt),
                           n=n, r=r, p=p, maxmem=2**28, dklen=32)
    ok = hmac.compare_digest(again, base64.b64decode(key))
    return ok, ok and (n, r, p) != (N, R, P)     # (right password?, rehash now?)

stored = hash_password("correct horse battery staple")
print(stored[:17])
print(check_password("correct horse battery staple", stored))
print(check_password("correct horse battery stapler", stored))
# scrypt$131072$8$1
# (True, False)
# (False, False)
```

The choices that matter:

- **A fresh random salt per password**, from `os.urandom`, stored in the string.
- **Parameters stored with the hash**, so they can rise later. When a user logs
  in with old parameters and the right password, hash it again with the new ones
  (the second value returned).
- **Constant-time comparison** with `hmac.compare_digest` ([§10.3](10-Message-Authentication.md)).
- **`maxmem`** raised: Python refuses scrypt above 32 MiB by default.

Two more defenses sit outside the hash. A **pepper** is a secret key, kept out
of the database (in a configuration secret or a hardware security module), mixed
in with HMAC before or after hashing; a database thief without the pepper cannot
test any guess at all. **Rate limiting** and lockouts slow online guessing at the
login page.

## 11.9 Breaches as stories

Every rule above was learned from a leak. A few of the largest:

**RockYou (December 2009).** A social-gaming company stored 32 million
passwords in plain text. An attacker took them through an SQL injection flaw
and they were posted online. The "rockyou" list became the starting dictionary
of every password cracker and, for researchers, the first large view of what
people actually choose. "123456" was at the top.

**LinkedIn (June 2012).** About 6.5 million password hashes appeared on a Russian
forum: plain SHA-1, no salt. Most were cracked within days. In 2016 it emerged
that the breach had been much larger, with about 117 million accounts. Lesson:
§11.2 and §11.3.

**Adobe (October 2013).** Adobe lost about 153 million user records, with
passwords *encrypted* under one 3DES key in ECB mode ([Chapter 8](08-Modes-of-Operation.md)),
not hashed, and with each user's password hint in plain text. Equal passwords
gave equal ciphertexts, so a block shared by thousands of accounts, together with
their hints ("one to six", "1-6"), gave the password away without breaking 3DES
at all. Lesson: passwords must be hashed with a salt, never encrypted with one
key.

**Ashley Madison (2015).** The dating site's leaked database used bcrypt at cost
12, which is correct, and those hashes held. But a group called CynoSure Prime
noticed that for about 15 million accounts the site had also stored an MD5-based
login token derived from the lowercased username and password. They cracked about
11 million passwords through the tokens and then fixed the case using the bcrypt
hash. Lesson: one weak copy of the password undoes a strong one.

**Yahoo (2013, disclosed 2016).** A breach of all of Yahoo's roughly 3 billion
accounts included passwords hashed with MD5. Lesson: fast hashes are no
protection at that scale.

**LastPass (2022).** Attackers stole encrypted backups of customers' password
vaults. Each vault was encrypted with a key derived by PBKDF2 from the user's
master password. New accounts used 100,100 iterations, but many older accounts
had never been upgraded and used far fewer, some as low as 1 or 5,000, and
weak master passwords became crackable offline. Lesson: parameters must be
raised for *existing* users, not only new ones.

Not every incident is a hash failure. In 2019 Facebook found that hundreds of
millions of passwords had been written in plain text into internal log files.
The best hash does nothing for a password logged before it was hashed.

**What changed.** Password managers and passkeys (public-key logins, see
[Chapter 16](16-PKI-and-Key-Establishment.md)) reduce how many passwords people
must remember. NIST's digital identity guidance, SP 800-63B, tells services to
drop forced periodic changes and composition rules, to allow long passwords,
and to check new passwords against lists of breached ones, because those rules
pushed users toward predictable patterns.

## 11.10 Keys from strong secrets: HKDF

*Level: intermediate.*

The second half of the chapter has the opposite problem. After a Diffie-Hellman
exchange ([Chapter 12](12-Diffie-Hellman.md)) both sides share a secret that is
**unguessable**, so no slow hash is needed. But it is not yet a key:

- It is **not uniform.** An X25519 output is a coordinate of a point on a curve,
  with structure: some bit patterns are more likely than others.
- **One secret must make several keys:** one for each direction of traffic, one
  for encryption and one for MAC, IVs, and new keys for the next stage. Using the
  same key for two jobs links their security in ways nobody analyzed.

A **key derivation function** (KDF) does this job. Before 2010 almost every
protocol had its own, some fine and some weak. Hugo Krawczyk, one of HMAC's
designers, published **HKDF** at CRYPTO 2010 (RFC 5869) with a clean split into
two steps, each with a proof:

1. **Extract:** $\mathit{PRK} = \mathrm{HMAC}(\mathit{salt}, \mathit{IKM})$. This concentrates the entropy of the
   input keying material, however lumpy, into one uniform pseudorandom key. The
   salt is optional (a string of zeros if absent) but helps.
2. **Expand:** chain HMAC under $\mathit{PRK}$ until there are enough bytes:

$$
T(0) = \text{empty}, \qquad T(i) = \mathrm{HMAC}\big(\mathit{PRK},\; T(i-1) \,\Vert\, \mathit{info} \,\Vert\, i\big), \qquad \mathit{OKM} = T(1) \,\Vert\, T(2) \,\Vert\, \cdots
$$

cut to the length needed (at most $255$ hash lengths, 8,160 bytes for SHA-256).

The **info** string names the key's purpose. Different info strings give
independent keys from the same secret. This is **domain separation**, and it is
the main tool for keeping keys apart.

```python
import hashlib, hmac

def hkdf(ikm, salt, info, n):
    prk = hmac.new(salt or bytes(32), ikm, hashlib.sha256).digest()   # extract
    out, t, i = b"", b"", 1
    while len(out) < n:                                              # expand
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out += t
        i += 1
    return out[:n]

okm = hkdf(bytes([0x0b] * 22), bytes(range(13)), bytes(range(0xf0, 0xfa)), 42)
print(okm.hex())                         # RFC 5869, test case 1

shared = bytes(range(32))                # stand-in for a Diffie-Hellman output
k_c2s = hkdf(shared, b"", b"myapp v1 client-to-server", 32)
k_s2c = hkdf(shared, b"", b"myapp v1 server-to-client", 32)
print(k_c2s.hex()[:16], k_s2c.hex()[:16])
# 3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865
# 5d74c39c8fa7351f 0ae210f3d6a5bd17
```

In RFC 5869's test case 1 the extract step gives
$\mathit{PRK} = \mathtt{077709362c2e32df\ldots 7c2b3e5}$; two expand blocks give the 42 bytes printed.
The second part shows domain separation: one shared secret, two labels, two
unrelated keys, so the client and server never encrypt with the same key.

**Where it runs.** TLS 1.3 builds its whole key schedule from HKDF-Extract and a
labeled HKDF-Expand ("tls13 c hs traffic", "tls13 key" and so on; see
[Chapter 19](19-Protocols.md)). Signal, HPKE, MLS and the Noise protocols use
it; WireGuard uses it with BLAKE2s in place of SHA-256. In real code use a
library version, such as `HKDF` in the `cryptography` package.

**Never on passwords.** HKDF is fast by design. Running a password through it
gives a key that can be guessed at billions of tries per second. Passwords go
through a password hash first (§11.4 to §11.7); its output can then go through
HKDF to make several keys.

## 11.11 The NIST KDFs

*Level: intermediate.*

NIST and the banking standards body ANSI defined their own KDFs before HKDF,
and you meet them wherever a FIPS profile or an older specification names them.
All are fast, and all are for strong secrets only.

- **KBKDF** (SP 800-108, 2009; Rev. 1, 2022) derives keys from a key you already
  have. In counter mode each output block is
  $\mathrm{PRF}(K_{\mathrm{IN}},\; [i] \,\Vert\, \mathit{Label} \,\Vert\, \mathtt{00} \,\Vert\, \mathit{Context} \,\Vert\, [L])$, with HMAC, CMAC or
  KMAC as the PRF. Including the output length $L$ means a 32-byte key is not a
  prefix of a 64-byte one.
- **The one-step KDF** (SP 800-56C, once called the "concatenation KDF") turns a
  key-exchange secret $Z$ into keys: $K(i) = H(i \,\Vert\, Z \,\Vert\, \mathit{FixedInfo})$.
- **The ANSI X9.63 KDF** is the same with the counter after $Z$, used with
  elliptic-curve encryption (ECIES) and in 5G's subscriber-identity protection.

SP 800-56C also defines a two-step extract-then-expand method, and HKDF counts as
an instance of it, so a FIPS module can offer HKDF. Here are KBKDF as Kerberos
uses it and the one-step KDF as JSON Web Encryption uses it, each matching its
RFC's published test value:

```python
import base64, hashlib, hmac

def kbkdf(key, label, context, n):           # SP 800-108 counter mode, HMAC-SHA-256
    fixed = label + b"\0" + context + (8 * n).to_bytes(4, "big")
    out, i = b"", 1
    while len(out) < n:
        out += hmac.new(key, i.to_bytes(4, "big") + fixed, hashlib.sha256).digest()
        i += 1
    return out[:n]

def onestep(z, info, n):                      # SP 800-56C one-step KDF with SHA-256
    out, i = b"", 1
    while len(out) < n:
        out += hashlib.sha256(i.to_bytes(4, "big") + z + info).digest()
        i += 1
    return out[:n]

# RFC 8009 (Kerberos with AES and SHA-2): the checksum key Kc for key usage 2
base = bytes.fromhex("3705d96080c17728a0e800eab6e0d23c")
print(kbkdf(base, bytes.fromhex("0000000299"), b"", 16).hex())

# RFC 7518 (JSON Web Algorithms): ECDH-ES with "A128GCM", "Alice", "Bob"
z = bytes([158, 86, 217, 29, 129, 113, 53, 211, 114, 131, 66, 131, 191, 132, 38, 156,
           251, 49, 110, 163, 218, 128, 106, 72, 246, 218, 167, 121, 140, 254, 144, 196])
lv = lambda s: len(s).to_bytes(4, "big") + s  # length, then the bytes
info = lv(b"A128GCM") + lv(b"Alice") + lv(b"Bob") + (128).to_bytes(4, "big")
print(base64.urlsafe_b64encode(onestep(z, info, 16)).rstrip(b"=").decode())
# b31a018a48f54776f403e9a396325dc3
# VqqN6vgjbSBcIijNcacQGg
```

The second value is the content key in RFC 7518's Appendix C, written in base64url
as JWE does. For a new design, HKDF is the simple choice: every library has it
and NIST accepts it. Full details: [NIST KDFs](../08-kdf-password-hashing/NIST-KDFs.md).

## 11.12 In the real world

**What to use.**

| Job | Use | Settings |
|---|---|---|
| Storing passwords | Argon2id | $m \ge 19$ MiB, $t \ge 2$, $p = 1$ (OWASP floor); RFC 9106: 64 MiB, $t = 3$, $p = 4$ |
| Argon2 not available | scrypt | $N \ge 2^{17}$, $r = 8$, $p = 1$ |
| Existing systems | bcrypt | cost $\ge 10$; watch the 72-byte limit |
| FIPS required | PBKDF2-HMAC-SHA-256 | $\ge 600{,}000$ iterations |
| Encrypting a file with a passphrase | scrypt or Argon2id, then an AEAD | as above, or more |
| Keys from a DH or KEM secret | HKDF | a distinct info label per key |
| A FIPS profile names it | KBKDF, one-step KDF, X9.63 | as the profile says |

Salts are 16 random bytes per password. Store the parameters with every hash and
raise them over time.

**Where they run.** Linux `/etc/shadow` uses yescrypt (`$y$`) on most current
distributions, older systems sha512crypt (`$6$`). Django defaults to PBKDF2, and
Rails and many PHP sites use bcrypt. Bitwarden and 1Password derive vault keys
with PBKDF2 or Argon2id. The `age` file encryption tool uses scrypt for
passphrases, and OpenSSH protects private keys with `bcrypt_pbkdf`. TLS 1.3,
Signal and WireGuard use HKDF. Windows still stores the NT hash, a single
unsalted MD4 of the password, which is why it falls so easily
([retired hashes](../07-hash/Retired.md)).

**Standards.** RFC 9106 (Argon2), RFC 7914 (scrypt), RFC 8018 and SP 800-132
(PBKDF2), RFC 5869 (HKDF), SP 800-108 and SP 800-56C (NIST KDFs), SP 800-63B
(password policy). NIST has decided to revise SP 800-132 to approve a
memory-hard function. Status and parameters: the
[key derivation and password hashing table](../index.md#8-key-derivation-and-password-hashing).
Reference pages: [Argon2](../08-kdf-password-hashing/Argon2.md),
[scrypt](../08-kdf-password-hashing/scrypt.md),
[bcrypt](../08-kdf-password-hashing/bcrypt.md),
[PBKDF2](../08-kdf-password-hashing/PBKDF2.md),
[HKDF](../08-kdf-password-hashing/HKDF.md) and
[retired password hashes](../08-kdf-password-hashing/Retired.md) (DES-crypt,
MD5-crypt, PBKDF1).

**Better than passwords.** The strongest fix is to stop sending passwords to
servers at all. A **PAKE** (password-authenticated key exchange, such as OPAQUE)
lets a client prove it knows a password without the server ever seeing it, and
passkeys replace the password with a key pair. Both are in
[Chapter 16](16-PKI-and-Key-Establishment.md).

## 11.13 Going deeper

*Level: expert.*

??? abstract "How much is a password worth? Entropy, and why the guess order matters"

    If a password is chosen uniformly from $N$ possibilities, its entropy is $\log_2 N$ bits and an attacker
    needs $N/2$ guesses on average. Eight random lowercase letters give $\log_2 26^8 \approx 37.6$ bits; ten random
    letters and digits $\log_2 62^{10} \approx 59.5$; five words from the 7,776-word Diceware list
    $\log_2 7776^5 \approx 64.6$.

    Human passwords are not uniform, and Shannon entropy is the wrong measure for them. What matters is
    **guessing work**: if the attacker tries candidates in order of probability $p_1 \ge p_2 \ge \cdots$, the
    chance of success after $k$ guesses is $\sum_{i \le k} p_i$. Joseph Bonneau's 2012 study of 70 million Yahoo
    passwords found that they give fewer than 10 bits of security against an online attacker who tries the
    most common passwords on many accounts, and only about 20 bits against an optimal offline attacker. Stretching adds a fixed number of bits on top
    ($\log_2$ of the cost ratio), which helps against the middle of the distribution but not the most common
    passwords.

??? abstract "Measuring memory-hardness: cumulative memory complexity"

    An attacker's real cost is chip area times time. For a computation that uses $M_i$ memory at step $i$,
    the **cumulative memory complexity** is $\mathrm{CMC} = \sum_i M_i$, the area under the memory curve (Alwen and
    Serbinenko, STOC 2015). Parallel attackers are allowed, since that is what hardware does.

    For scrypt's ROMix with $N$ blocks, the honest computation has $\mathrm{CMC} \approx N^2$ blocks $\times$ steps, and
    Alwen, Chen, Pietrzak, Reyzin and Tessaro (EUROCRYPT 2017) proved that in the random-oracle model every
    strategy, parallel or not, has $\mathrm{CMC} = \Omega(N^2)$. The trade-off in §11.6 is a special case: keeping
    $N/k$ blocks costs about $N + N k/2$ steps, product about $N^2/2$ for large $k$.

    **Data-independent** functions (Argon2i, Balloon hashing) cannot reach this. Their memory access graph
    is fixed in advance, and Alwen and Blocki (CRYPTO 2016) showed that any such graph has a "depth-robust"
    weakness: an attacker can pebble it with CMC about $N^2 / \log N$ or less, below the honest cost. For
    Argon2i v1.2 their attack reduced the cost by large factors at realistic sizes. Argon2id's hybrid design
    keeps data-dependent access for most of the computation while removing the timing leak from the first
    part, where it matters most.

??? abstract "Why the extract step: randomness extractors and the leftover hash lemma"

    A source has **min-entropy** $k$ if no single value has probability above $2^{-k}$. A Diffie-Hellman value
    in a 256-bit group may have close to 256 bits of min-entropy without being uniform. An **extractor** maps
    such a source, with a random seed (the salt), to output that is close to uniform.

    The **leftover hash lemma** (Impagliazzo, Levin and Luby, 1989) says a universal hash family is a good
    extractor: from a source with min-entropy $k$, it gives $m$ bits within statistical distance
    $2^{-(k-m)/2}$ of uniform. So you lose about twice the security level in bits. Krawczyk's HKDF paper
    analyzes HMAC as a *computational* extractor, which avoids that loss under assumptions about the
    compression function. Expand is then a PRF
    in feedback mode, secure if HMAC is a PRF. When the input is already a uniform key, Extract can be
    skipped, which is what TLS 1.3's HKDF-Expand-Label calls do for later stages.

??? abstract "PBKDF2's output-length trap, and other parameter mistakes"

    PBKDF2 computes each output block $T_i$ separately, each with the full $c$ iterations. If you ask for 64
    bytes from HMAC-SHA-1 (20-byte blocks), the defender computes 4 blocks, but an attacker checking a guess
    needs only the first, which they can compare against the first 20 bytes of the stored value. The defender
    pays 4 times, the attacker once. A 2013 analysis of 1Password's older vault format found exactly this. Ask for at most one
    hash length, then use HKDF if you need more.

    Other recurring mistakes: a fixed or per-site salt (it stops none of the per-user work), salts from a
    weak random generator, iteration counts chosen in 2010 and never raised, Argon2 with memory set in
    bytes instead of KiB, and comparing hashes with `==`. The `crypt` string formats (`$2b$`, `$argon2id$`,
    `$y$`) exist so that the algorithm and its parameters always travel with the hash.

??? abstract "Password-based encryption, and why it is not the same as storage"

    Storing a password hash only lets you *check* a password. Encrypting a file or a vault with a password
    needs a *key*: derive it with a password hash (scrypt, Argon2id) from the password and a random salt
    stored with the file, then encrypt with an AEAD ([Chapter 10](10-Message-Authentication.md)). Here the
    attacker who steals the file has the same offline position as one who steals a database, so the same
    parameters apply, usually higher, since only one person ever waits for the derivation.

    One subtle risk: most AEADs are not key-committing (§10.10), so a server that tries a client-supplied
    ciphertext against keys derived from many passwords can be tricked into testing many guesses at once
    (partitioning oracle attacks, 2021). Use a committing construction where keys come from passwords and an
    attacker controls ciphertexts.

## Check yourself

??? question "1. Why is a salt not secret, and what exactly does it stop?"

    It only has to be unique, not unknown. It stops precomputed tables (one table for all users) and hides
    which users share a password, so an attacker must work on each account separately. It does not slow
    down an attack on a single account.

??? question "2. A site stores SHA-256(password) with no salt. An attacker has a list of the 10 million most common passwords. How many hash computations does it take to check every one of the site's million users against the list?"

    10 million: hash each candidate once and look every user's hash up in a table. With per-user salts it
    would take 10 million $\times$ 1 million $= 10^{13}$.

??? question "3. Your server can afford 0.25 s per login. PBKDF2-HMAC-SHA-256 at 600,000 iterations takes 0.16 s on it. What should you do with the spare time, and what should you do next year?"

    Raise the iteration count by about $0.25/0.16 \approx 1.56$ times, to about 940,000. Next year measure again and
    raise it, and rehash each user's password with the new count at their next successful login. Better
    still, move to Argon2id or scrypt.

??? question "4. A WPA2 network's name is \"HomeNet\" and its passphrase is one of 10 million common words. An attacker records a handshake. How much PBKDF2 work does trying them all take?"

    $10^7 \times 4{,}096 \approx 4.1 \times 10^{10}$ HMAC-SHA-1 iterations (each about two SHA-1 compressions), which
    modern cracking hardware gets through quickly. The SSID salt only stops tables shared across differently named
    networks; common names like "linksys" have precomputed tables anyway.

??? question "5. What goes wrong if you store bcrypt(password + username) and allow 100-character usernames?"

    bcrypt uses only the first 72 bytes. If the username comes first and is long enough, the password is
    partly or completely ignored, so any password logs in. If the password comes first, a long password
    loses the username. This is the Okta 2024 bug. Hash each input separately or pre-hash and encode.

??? question "6. In the ROMix demo of §11.6, keeping every 16th slot cost 39,022 mixes. Estimate it from the formula: the fill costs $n$, and each of $n$ reads costs one mix plus an average of $(k-1)/2$ rebuilds."

    $n + n(1 + 7.5) = 4096 \times 9.5 = 38{,}912$, close to the measured 39,022 (the reads are random, so the actual
    count wobbles).

??? question "7. Why is HKDF wrong for passwords but right for a Diffie-Hellman secret?"

    HKDF makes each guess cost two or three HMAC calls, which is fine when the input has 128 or more bits
    of entropy (nobody can guess it) and useless when it has 30 (a password). A password needs a slow,
    memory-hard function; a DH output only needs extracting and expanding.

??? question "8. Two services derive keys with HKDF from the same shared secret, both with info = \"key\". What is the risk, and the fix?"

    They get the same key, so a message encrypted for one is valid for the other, and a weakness in one
    exposes the other. Give every key a unique info label, naming the protocol, its version and the key's
    purpose, as TLS 1.3 does with "tls13 ..." labels.

??? question "9. Adobe encrypted passwords with 3DES-ECB under one key. Name two things wrong besides using 3DES."

    Encryption is reversible: anyone who gets the key gets every password. And ECB with one key and no salt
    gives equal ciphertexts for equal passwords (and equal first blocks for passwords sharing their first
    8 characters), which together with the plaintext hints revealed passwords without breaking the cipher.

??? question "10. The Diceware password \"correct horse battery staple\" style uses 4 random words from 7,776. How many bits is that, and how long would an offline attack at 16,700 guesses per second (PBKDF2 at 600,000 iterations on the illustrative rig) take on average?"

    $\log_2 7776^4 \approx 51.7$ bits, $7776^4 \approx 3.66 \times 10^{15}$ choices. On average half are tried: $1.83 \times 10^{15} / 16{,}700 \approx 1.1 \times 10^{11}$
    seconds, about 3,500 years. That assumes the attacker knows the scheme and the word list, which is the
    right assumption.

## What you learned

- Password storage defends against offline guessing. The defender cannot stop
  the guesses, only make each one expensive.
- Salts stop shared tables and hide shared passwords; slow functions make each
  guess cost; memory-hard functions make that cost real on GPUs and custom chips.
- PBKDF2 is slow but not memory-hard, bcrypt is better and has a 72-byte limit,
  scrypt was the first memory-hard design, and Argon2id is today's first choice.
- Every rule came from a breach: plain text (RockYou), unsalted SHA-1
  (LinkedIn), encryption instead of hashing (Adobe), a weak second copy (Ashley
  Madison), parameters never raised (LastPass).
- Strong secrets need a different tool: HKDF extracts a uniform key from a
  Diffie-Hellman output and expands it into many keys separated by labels. NIST's
  KBKDF and one-step KDF do the same job in FIPS settings.
- Never run a password through a fast KDF, and never use one key for two jobs.

**Next:** Part III begins with [Chapter 12](12-Diffie-Hellman.md): how two
strangers can agree on a shared secret in public, which is exactly the secret
HKDF turns into keys.

## Further reading

- Robert Morris and Ken Thompson, "Password Security: A Case History", *Communications of the ACM* 22(11),
  1979.
- Niels Provos and David Mazières, "A Future-Adaptable Password Scheme", USENIX 1999 (bcrypt).
- Colin Percival, "Stronger Key Derivation via Sequential Memory-Hard Functions", BSDCan 2009; RFC 7914.
- Alex Biryukov, Daniel Dinu and Dmitry Khovratovich, "Argon2: New Generation of Memory-Hard Functions
  for Password Hashing and Other Applications", EuroS&P 2016; RFC 9106.
- Joël Alwen and Jeremiah Blocki, "Efficiently Computing Data-Independent Memory-Hard Functions",
  CRYPTO 2016.
- Philippe Oechslin, "Making a Faster Cryptanalytic Time-Memory Trade-Off", CRYPTO 2003.
- Joseph Bonneau, "The Science of Guessing: Analyzing an Anonymized Corpus of 70 Million Passwords",
  IEEE S&P 2012.
- Hugo Krawczyk, "Cryptographic Extraction and Key Derivation: The HKDF Scheme", CRYPTO 2010; RFC 5869.
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- SP 800-63B (digital identity: authentication), SP 800-132 (PBKDF2), SP 800-108 and SP 800-56C (KDFs).
