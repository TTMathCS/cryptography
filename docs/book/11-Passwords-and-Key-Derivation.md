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

<figure class="mars-fig">
<svg viewBox="0 0 560 438" width="560" role="img" aria-label="Timeline of password storage and key derivation from 1966 to 2024">
<line x1="78" y1="12" x2="78" y2="426" stroke="currentColor" stroke-width="2"/>
<circle cx="78" cy="20" r="5" class="acc-fill"/>
<text x="64" y="25" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1966</text>
<text x="94" y="25" font-size="14" fill="currentColor">CTSS shows every password as the message of the day</text>
<circle cx="78" cy="48" r="5" fill="currentColor"/>
<text x="64" y="53" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1968</text>
<text x="94" y="53" font-size="14" fill="currentColor">Wilkes describes Cambridge&#x27;s one-way password storage</text>
<circle cx="78" cy="76" r="5" fill="currentColor"/>
<text x="64" y="81" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1979</text>
<text x="94" y="81" font-size="14" fill="currentColor">Morris and Thompson: Unix crypt, with salt</text>
<circle cx="78" cy="104" r="5" fill="currentColor"/>
<text x="64" y="109" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1980</text>
<text x="94" y="109" font-size="14" fill="currentColor">Hellman: trading memory for time in tables</text>
<circle cx="78" cy="132" r="5" fill="currentColor"/>
<text x="64" y="137" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">1999</text>
<text x="94" y="137" font-size="14" fill="currentColor">bcrypt (Provos, Mazières); PBKDF2 (Kaliski)</text>
<circle cx="78" cy="160" r="5" fill="currentColor"/>
<text x="64" y="165" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2003</text>
<text x="94" y="165" font-size="14" fill="currentColor">Oechslin&#x27;s rainbow tables</text>
<circle cx="78" cy="188" r="5" class="acc-fill"/>
<text x="64" y="193" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2009</text>
<text x="94" y="193" font-size="14" fill="currentColor">scrypt (Percival); RockYou leaks 32 million</text>
<circle cx="78" cy="216" r="5" fill="currentColor"/>
<text x="64" y="221" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2010</text>
<text x="94" y="221" font-size="14" fill="currentColor">HKDF (Krawczyk)</text>
<circle cx="78" cy="244" r="5" class="acc-fill"/>
<text x="64" y="249" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2012</text>
<text x="94" y="249" font-size="14" fill="currentColor">LinkedIn: unsalted SHA-1</text>
<circle cx="78" cy="272" r="5" class="acc-fill"/>
<text x="64" y="277" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2013</text>
<text x="94" y="277" font-size="14" fill="currentColor">Adobe: passwords under one 3DES key</text>
<circle cx="78" cy="300" r="5" fill="currentColor"/>
<text x="64" y="305" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2015</text>
<text x="94" y="305" font-size="14" fill="currentColor">Argon2 wins the PHC; Ashley Madison</text>
<circle cx="78" cy="328" r="5" class="acc-fill"/>
<text x="64" y="333" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2016</text>
<text x="94" y="333" font-size="14" fill="currentColor">Yahoo&#x27;s 3 billion accounts disclosed</text>
<circle cx="78" cy="356" r="5" fill="currentColor"/>
<text x="64" y="361" font-size="14" text-anchor="end" font-weight="bold" fill="currentColor">2021</text>
<text x="94" y="361" font-size="14" fill="currentColor">Argon2 becomes RFC 9106</text>
<circle cx="78" cy="384" r="5" class="acc-fill"/>
<text x="64" y="389" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2022</text>
<text x="94" y="389" font-size="14" fill="currentColor">LastPass vaults stolen</text>
<circle cx="78" cy="412" r="5" class="acc-fill"/>
<text x="64" y="417" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2024</text>
<text x="94" y="417" font-size="14" fill="currentColor">Okta&#x27;s bcrypt 72-byte bug</text>
</svg>
<figcaption>Figure 11.1. Sixty years of storing passwords. Accent years are leaks and failures; nearly every design in this chapter answers one of them.</figcaption>
</figure>

Here is the attacker's position, then and now. They steal the database
(through an SQL injection, a lost backup, an insider) and take it home. There,
with no rate limits and no one watching, they can make as many guesses as their
hardware allows. This is an **offline attack**, and it is what password storage
must defend against. (An **online attack**, guessing at the login page, is slowed
by lockouts and rate limits instead.)

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Online attack: guesses go through the login page with rate limits. Offline attack: the stolen database is copied to the attacker&#x27;s own hardware, with no limits">
<text x="10" y="22" font-size="15" font-weight="bold" fill="currentColor">Online</text>
<rect x="10" y="36" width="130" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="75" y="65.9" font-size="14" text-anchor="middle" fill="currentColor">attacker</text>
<polyline points="140,61 224,61" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="230,61 223.1,65 223.1,57" fill="currentColor"/>
<text x="185" y="52" font-size="13" text-anchor="middle" fill="currentColor">guess</text>
<rect x="230" y="36" width="170" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="315" y="58" font-size="14" text-anchor="middle" fill="currentColor">login page</text>
<text x="315" y="75" font-size="12" text-anchor="middle" fill="currentColor">rate limits, lockouts</text>
<polyline points="400,61 464,61" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="470,61 463.1,65 463.1,57" fill="currentColor"/>
<rect x="470" y="36" width="160" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="65.9" font-size="14" text-anchor="middle" fill="currentColor">server + database</text>
<text x="320" y="110" font-size="13" text-anchor="middle" font-style="italic" fill="currentColor">a few guesses a second, and someone is watching</text>
<line x1="10" y1="128" x2="630" y2="128" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.4"/>
<text x="10" y="152" font-size="15" font-weight="bold" class="acc-fill">Offline</text>
<rect x="470" y="166" width="160" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="195.9" font-size="14" text-anchor="middle" fill="currentColor">server + database</text>
<polyline points="470,191 336,191" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="330,191 336.9,187 336.9,195" class="acc-fill"/>
<text x="400" y="182" font-size="13" text-anchor="middle" class="acc-fill">stolen copy</text>
<rect x="130" y="166" width="200" height="50" rx="4" class="soft-acc acc" stroke="currentColor" stroke-width="1.5"/>
<text x="230" y="188" font-size="14" text-anchor="middle" fill="currentColor">attacker&#x27;s own rig</text>
<text x="230" y="205" font-size="12" text-anchor="middle" fill="currentColor">GPUs, no limits</text>
<text x="320" y="240" font-size="13" text-anchor="middle" font-style="italic" class="acc-fill">billions of guesses a second, for as long as they like</text>
</svg>
<figcaption>Figure 11.2. The two attacks. Online guessing goes through the server, which can slow it down. Offline guessing starts after a database is stolen; the only defense left is how much each guess costs.</figcaption>
</figure>

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

!!! note "Life story: precomputed tables and rainbow tables"
    **Born:** 1980, Martin Hellman's time-memory trade-off at Stanford; rainbow tables in 2003,
    by Philippe Oechslin at EPFL in Lausanne · **Purpose:** to crack hashes of a fixed function
    faster than brute force, by doing the work once and storing a compressed table · **Helped
    attackers:** free tools such as Ophcrack cracked Windows LAN Manager password hashes in
    minutes, and tables for unsalted MD5 and SHA-1 were traded online · **Defeated by:** salts,
    which make every user's hash a different function · **Status:** obsolete against salted
    hashes; still useful against systems that never salted.

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

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Table: without salt, Bob and Carol with the same password have the same hash; with salt, their stored hashes differ">
<text x="10" y="22" font-size="15" font-weight="bold" fill="currentColor">No salt</text>
<text x="330" y="22" font-size="15" font-weight="bold" fill="currentColor">With a random salt each</text>
<text x="10" y="63" font-size="14" fill="currentColor">alice</text>
<rect x="70" y="44" width="230" height="30" rx="3" class="soft"/>
<text x="80" y="64" font-size="13" font-family="monospace" fill="currentColor">a941a4c4fd0c01cd…</text>
<text x="330" y="63" font-size="14" fill="currentColor">alice</text>
<rect x="390" y="44" width="240" height="30" rx="3" class="soft"/>
<text x="400" y="64" font-size="13" fill="currentColor">salt₁, H(salt₁ ‖ sunshine)</text>
<text x="10" y="107" font-size="14" fill="currentColor">bob</text>
<rect x="70" y="88" width="230" height="30" rx="3" class="soft-acc"/>
<text x="80" y="108" font-size="13" font-family="monospace" fill="currentColor">8d969eef6ecad3c2…</text>
<text x="330" y="107" font-size="14" fill="currentColor">bob</text>
<rect x="390" y="88" width="240" height="30" rx="3" class="soft"/>
<text x="400" y="108" font-size="13" fill="currentColor">salt₂, H(salt₂ ‖ 123456)</text>
<text x="10" y="151" font-size="14" fill="currentColor">carol</text>
<rect x="70" y="132" width="230" height="30" rx="3" class="soft-acc"/>
<text x="80" y="152" font-size="13" font-family="monospace" fill="currentColor">8d969eef6ecad3c2…</text>
<text x="330" y="151" font-size="14" fill="currentColor">carol</text>
<rect x="390" y="132" width="240" height="30" rx="3" class="soft"/>
<text x="400" y="152" font-size="13" fill="currentColor">salt₃, H(salt₃ ‖ 123456)</text>
<text x="10" y="190" font-size="13" class="acc-fill">bob = carol: crack one, get both;</text>
<text x="10" y="208" font-size="13" class="acc-fill">one precomputed table cracks every site</text>
<text x="330" y="190" font-size="13" fill="currentColor">every row different: each account</text>
<text x="330" y="208" font-size="13" fill="currentColor">must be attacked on its own</text>
</svg>
<figcaption>Figure 11.3. What a salt changes. Left: the real SHA-256 values from §11.2, where Bob's and Carol's rows match. Right: with a random salt per user, equal passwords no longer look equal and no precomputed table applies.</figcaption>
</figure>

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

Morris and Thompson worked at Bell Labs in New Jersey, and their scheme, the
Unix `crypt` function of Version 7 Unix (1979), did three things at once: it
stored a one-way function of the password, it added a 12-bit salt, and it made
the function slow on purpose by running DES 25 times with the password as the
key. The paper also described cracking real Unix password files, and found that
a large share of users picked short or dictionary passwords. Almost a decade
later the Morris worm of 1988, written by Robert Morris's son, spread partly by
guessing passwords against exactly these hashes.

!!! note "Life story: Unix crypt and the salt"
    **Born:** 1979, Robert Morris and Ken Thompson at Bell Labs, for Version 7 Unix · **Purpose:**
    keep a stolen password file from giving the passwords away · **Helped:** introduced the
    salt and deliberate slowness, the two ideas every later scheme kept; Unix and Linux used it
    for twenty years · **Retired:** passwords limited to 8 characters, a 12-bit salt and 25 DES
    runs became far too weak as hardware grew · **Replaced by:** MD5-crypt (1994), sha512crypt
    (2007), bcrypt and today yescrypt

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

<figure class="mars-fig">
<svg viewBox="0 0 680 146" width="680" role="img" aria-label="Bar chart on a log scale of cracking time: 21 seconds, 145 days, and 3,500 years">
<text x="270" y="32" font-size="14" text-anchor="end" fill="currentColor">8 lowercase letters, SHA-256</text>
<rect x="280" y="16" width="30" height="22" rx="2" class="soft"/>
<rect x="280" y="16" width="30" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="318" y="32" font-size="13" fill="currentColor">21 seconds</text>
<text x="270" y="66" font-size="14" text-anchor="end" fill="currentColor">same, PBKDF2 × 600,000</text>
<rect x="280" y="50" width="161.3" height="22" rx="2" class="soft-acc"/>
<rect x="280" y="50" width="161.3" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="449.3" y="66" font-size="13" font-weight="bold" fill="currentColor">145 days</text>
<text x="270" y="100" font-size="14" text-anchor="end" fill="currentColor">4 Diceware words, PBKDF2 × 600,000</text>
<rect x="280" y="84" width="250.9" height="22" rx="2" class="soft-acc"/>
<rect x="280" y="84" width="250.9" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="538.9" y="100" font-size="13" font-weight="bold" fill="currentColor">3,500 years (average)</text>
<line x1="280" y1="10" x2="280" y2="112" stroke="currentColor" stroke-width="1.5"/>
<line x1="280" y1="112" x2="530" y2="112" stroke="currentColor" stroke-width="1"/>
<line x1="280" y1="112" x2="280" y2="117" stroke="currentColor" stroke-width="1"/>
<text x="280" y="131" font-size="12" text-anchor="middle" fill="currentColor">1 s</text>
<line x1="360.8" y1="112" x2="360.8" y2="117" stroke="currentColor" stroke-width="1"/>
<text x="360.8" y="131" font-size="12" text-anchor="middle" fill="currentColor">1 hour</text>
<line x1="450.4" y1="112" x2="450.4" y2="117" stroke="currentColor" stroke-width="1"/>
<text x="450.4" y="131" font-size="12" text-anchor="middle" fill="currentColor">1 year</text>
<line x1="518.6" y1="112" x2="518.6" y2="117" stroke="currentColor" stroke-width="1"/>
<text x="518.6" y="131" font-size="12" text-anchor="middle" fill="currentColor">1,000 years</text>
</svg>
<figcaption>Figure 11.4. What stretching buys, on a rig doing 10¹⁰ SHA-256 hashes a second (log scale). Times for the letters are to try every password; for the Diceware words, the average. Stretching multiplies the cost of every guess but cannot rescue a password from a short list.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 660 230" width="660" role="img" aria-label="PBKDF2: HMAC keyed with the password is applied to salt and block index, then repeatedly to its own output; all outputs are XORed together">
<rect x="10" y="20" width="140" height="34" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="80" y="41.9" font-size="14" text-anchor="middle" fill="currentColor">S ‖ INT(i)</text>
<rect x="30" y="80" width="110" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="104.5" font-size="13" text-anchor="middle" font-weight="bold" fill="currentColor">HMAC(P, ·)</text>
<polyline points="85,120 85,140" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="85,146 81,139.1 89,139.1" fill="currentColor"/>
<text x="85" y="162" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">U₁</text>
<polyline points="85,168 85,182" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="85,188 81,181.1 89,181.1" class="acc-fill"/>
<polyline points="95,162 180,162 180,64 235,64 235,72" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="235,78 231,71.1 239,71.1" fill="currentColor"/>
<rect x="180" y="80" width="110" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="235" y="104.5" font-size="13" text-anchor="middle" font-weight="bold" fill="currentColor">HMAC(P, ·)</text>
<polyline points="235,120 235,140" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="235,146 231,139.1 239,139.1" fill="currentColor"/>
<text x="235" y="162" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">U₂</text>
<polyline points="235,168 235,182" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="235,188 231,181.1 239,181.1" class="acc-fill"/>
<polyline points="245,162 330,162 330,64 385,64 385,72" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="385,78 381,71.1 389,71.1" fill="currentColor"/>
<rect x="330" y="80" width="110" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="385" y="104.5" font-size="13" text-anchor="middle" font-weight="bold" fill="currentColor">HMAC(P, ·)</text>
<polyline points="385,120 385,140" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="385,146 381,139.1 389,139.1" fill="currentColor"/>
<text x="385" y="162" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">U₃</text>
<polyline points="385,168 385,182" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="385,188 381,181.1 389,181.1" class="acc-fill"/>
<polyline points="395,162 480,162 480,64 565,64 565,72" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="565,78 561,71.1 569,71.1" fill="currentColor"/>
<rect x="510" y="80" width="110" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="565" y="104.5" font-size="13" text-anchor="middle" font-weight="bold" fill="currentColor">HMAC(P, ·)</text>
<polyline points="565,120 565,140" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="565,146 561,139.1 569,139.1" fill="currentColor"/>
<text x="565" y="162" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">U_c</text>
<polyline points="565,168 565,182" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="565,188 561,181.1 569,181.1" class="acc-fill"/>
<polyline points="80,54 83.8,72.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="85,78 79.7,72 87.5,70.4" fill="currentColor"/>
<text x="470" y="100" font-size="18" text-anchor="middle" fill="currentColor">…</text>
<line x1="85" y1="196" x2="565" y2="196" stroke="currentColor" class="acc" stroke-width="2"/>
<circle cx="85" cy="196" r="9" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="76" y1="196" x2="94" y2="196" stroke="currentColor" class="acc" stroke-width="1.5"/>
<line x1="85" y1="187" x2="85" y2="205" stroke="currentColor" class="acc" stroke-width="1.5"/>
<circle cx="235" cy="196" r="9" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="226" y1="196" x2="244" y2="196" stroke="currentColor" class="acc" stroke-width="1.5"/>
<line x1="235" y1="187" x2="235" y2="205" stroke="currentColor" class="acc" stroke-width="1.5"/>
<circle cx="385" cy="196" r="9" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="376" y1="196" x2="394" y2="196" stroke="currentColor" class="acc" stroke-width="1.5"/>
<line x1="385" y1="187" x2="385" y2="205" stroke="currentColor" class="acc" stroke-width="1.5"/>
<circle cx="565" cy="196" r="9" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="556" y1="196" x2="574" y2="196" stroke="currentColor" class="acc" stroke-width="1.5"/>
<line x1="565" y1="187" x2="565" y2="205" stroke="currentColor" class="acc" stroke-width="1.5"/>
<polyline points="565,196 594,196" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="600,196 593.1,200 593.1,192" class="acc-fill"/>
<text x="612" y="201" font-size="16" font-weight="bold" class="acc-fill">Tᵢ</text>
<text x="330" y="226" font-size="13" text-anchor="middle" fill="currentColor">c HMAC calls per output block; every one is needed</text>
</svg>
<figcaption>Figure 11.5. PBKDF2. HMAC keyed with the password P runs c times in a chain, each call fed the previous output, and all c outputs are XORed into one block Tᵢ. An attacker cannot skip ahead: the last link needs all the others.</figcaption>
</figure>

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

!!! note "Life story: PBKDF2"
    **Born:** 1999, Burt Kaliski at RSA Laboratories, in PKCS #5 v2.0; RFC 2898 (2000), now
    RFC 8018 · **Purpose:** turn a password into a key of any length by repeating HMAC, replacing
    PBKDF1, whose output was limited to one hash length · **Helped:** WPA2 Wi-Fi, encrypted key
    files, BIP-39 seed phrases, iOS backups and every FIPS-bound system that needs a password
    hash · **Status:** current and still NIST-approved, but costs only time, so GPUs crack it far
    more cheaply than memory-hard functions.

## 11.5 bcrypt

*Level: intermediate.*

In 1999 Niels Provos and David Mazières published bcrypt for OpenBSD, at the
USENIX conference, in a paper titled "A Future-Adaptable Password Scheme". The
title was the point. It
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

<figure class="mars-fig">
<svg viewBox="0 0 560 170" width="560" role="img" aria-label="The bcrypt string split into version 2b, cost 12, a 22-character salt and a 31-character hash">
<rect x="14" y="10" width="58" height="34" rx="3" class="soft"/>
<rect x="14" y="10" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="43" y="33" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">$2b$</text>
<text x="43" y="64" font-size="13" text-anchor="middle" fill="currentColor">version 2b</text>
<rect x="120" y="10" width="48" height="34" rx="3" class="soft-acc"/>
<rect x="120" y="10" width="48" height="34" rx="3" fill="none" class="acc" stroke="currentColor" stroke-width="1"/>
<text x="144" y="33" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">12$</text>
<text x="144" y="64" font-size="13" text-anchor="middle" class="acc-fill">cost 2¹²</text>
<rect x="214" y="10" width="238" height="34" rx="3" class="soft"/>
<rect x="214" y="10" width="238" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="333" y="33" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">abcdefghijklmnopqrstuu</text>
<text x="333" y="64" font-size="13" text-anchor="middle" fill="currentColor">salt: 22 characters</text>
<rect x="10" y="92" width="328" height="34" rx="3" class="soft"/>
<rect x="10" y="92" width="328" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="174" y="115" font-size="16" text-anchor="middle" font-family="monospace" fill="currentColor">twZ1IOTtu3SsEBT5lI/LFncP31tIybm</text>
<text x="174" y="146" font-size="13" text-anchor="middle" fill="currentColor">hash: 31 characters</text>
</svg>
<figcaption>Figure 11.6. Anatomy of the bcrypt hash above, cut into its four parts. Everything the server needs to check a password later, the version, the cost and the salt, travels in the same string as the hash itself.</figcaption>
</figure>

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

!!! note "Life story: bcrypt"
    **Born:** 1999, Niels Provos and David Mazières, for OpenBSD, built on the slow key setup of
    Bruce Schneier's Blowfish (1993) · **Purpose:** a password hash whose cost can be raised as
    computers get faster · **Helped:** the default in OpenBSD, Ruby on Rails and PHP's
    `password_hash`; the Ashley Madison hashes held because of it · **Status:** still acceptable at
    cost 10 or more; Argon2id is preferred for new systems, and the 72-byte limit must be handled.

## 11.6 Memory-hardness and scrypt

*Level: intermediate.*

Why do graphics cards and custom chips win against PBKDF2? A chip area that
computes SHA-256 is small and cheap, so an attacker can put thousands on one
chip. Memory is different: a megabyte of RAM costs about the same wherever it is,
and cannot be shrunk by clever design. So the defense is to make each guess
**need a lot of memory**, and to make sure an attacker who uses less memory pays
heavily in extra time. A function with that property is **memory-hard**.

<figure class="mars-fig">
<svg viewBox="0 0 660 230" width="660" role="img" aria-label="Left: a chip packed with thousands of tiny hashing cores. Right: the same chip area when each guess needs a large block of memory, only a few cores fit">
<text x="160" y="20" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">fast hash or PBKDF2</text>
<rect x="20" y="32" width="280" height="160" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="28" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="40" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="55" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="70" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="85" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="100" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="115" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="130" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="145" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="160" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="28" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="44" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="60" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="76" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="92" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="108" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="124" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="140" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="156" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="172" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="188" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="204" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="220" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="236" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="252" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="268" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<rect x="284" y="175" width="11" height="10" rx="1" class="soft-acc"/>
<text x="160" y="214" font-size="13" text-anchor="middle" fill="currentColor">thousands of tiny cores, one guess each</text>
<text x="500" y="20" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">memory-hard function</text>
<rect x="360" y="32" width="280" height="160" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="370" y="42" width="18" height="38" rx="1" class="soft-acc"/>
<rect x="394" y="42" width="236" height="38" rx="2" class="soft"/>
<rect x="394" y="42" width="236" height="38" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="512" y="66" font-size="13" text-anchor="middle" fill="currentColor">memory for one guess</text>
<rect x="370" y="92" width="18" height="38" rx="1" class="soft-acc"/>
<rect x="394" y="92" width="236" height="38" rx="2" class="soft"/>
<rect x="394" y="92" width="236" height="38" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="512" y="116" font-size="13" text-anchor="middle" fill="currentColor">memory for one guess</text>
<rect x="370" y="142" width="18" height="38" rx="1" class="soft-acc"/>
<rect x="394" y="142" width="236" height="38" rx="2" class="soft"/>
<rect x="394" y="142" width="236" height="38" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="512" y="166" font-size="13" text-anchor="middle" fill="currentColor">memory for one guess</text>
<text x="500" y="214" font-size="13" text-anchor="middle" fill="currentColor">few guesses at once: memory fills the chip</text>
</svg>
<figcaption>Figure 11.7. Why memory-hardness works (schematic). A hashing core is tiny, so attack hardware packs thousands of them; RAM cannot be shrunk the same way. If each guess needs its own large block of memory, the attacker's chip runs only a few guesses at a time.</figcaption>
</figure>

Colin Percival, then the security officer of the FreeBSD project, designed
**scrypt** in 2009 for his Tarsnap online backup service, the
first memory-hard password function in wide use; it became RFC 7914 in 2016. Its
core, ROMix, has two phases:

1. **Fill:** start from a block $X$ derived from the password and salt (by
   PBKDF2). Store $V_0 = X$, mix, store $V_1$, mix, and so on, $N$ times.
2. **Read back:** $N$ times, read the current $X$ as a number $j$, fetch $V_j$, and
   set $X = \mathrm{mix}(X \oplus V_j)$.

<figure class="mars-fig">
<svg viewBox="0 0 660 220" width="660" role="img" aria-label="ROMix: the fill phase writes a chain of table entries V0 to V(N-1); the read phase jumps to entries chosen by the current data">
<text x="10" y="22" font-size="15" font-weight="bold" fill="currentColor">1. Fill</text>
<rect x="30" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="58" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">V0</text>
<polyline points="86,52 100,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="106,52 99.1,56 99.1,48" fill="currentColor"/>
<rect x="106" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="134" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">V1</text>
<polyline points="162,52 176,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="182,52 175.1,56 175.1,48" fill="currentColor"/>
<rect x="182" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="210" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">V2</text>
<polyline points="238,52 252,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="258,52 251.1,56 251.1,48" fill="currentColor"/>
<rect x="258" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="286" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">V3</text>
<polyline points="314,52 328,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="334,52 327.1,56 327.1,48" fill="currentColor"/>
<rect x="334" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="362" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">V4</text>
<polyline points="390,52 404,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="410,52 403.1,56 403.1,48" fill="currentColor"/>
<rect x="410" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="438" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">V5</text>
<polyline points="466,52 480,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="486,52 479.1,56 479.1,48" fill="currentColor"/>
<rect x="486" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="514" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">…</text>
<polyline points="542,52 556,52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="562,52 555.1,56 555.1,48" fill="currentColor"/>
<rect x="562" y="36" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="590" y="56.9" font-size="14" text-anchor="middle" fill="currentColor">V_N−1</text>
<text x="110" y="22" font-size="13" font-style="italic" fill="currentColor">each entry is mix(previous), so the table is built in order</text>
<text x="10" y="124" font-size="15" font-weight="bold" fill="currentColor">2. Read back</text>
<rect x="30" y="150" width="70" height="34" rx="4" fill="none" class="acc" stroke="currentColor" stroke-width="1.5"/>
<text x="65" y="172.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">X</text>
<text x="140" y="160" font-size="13" class="acc-fill">j = X mod N</text>
<polyline points="65,150 280.3,74" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="286,72 280.8,78.1 278.1,70.5" class="acc-fill"/>
<polyline points="75,150 59.3,77.9" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="5 4"/>
<polygon points="58,72 63.4,77.9 55.6,79.6" class="acc-fill"/>
<polyline points="85,150 432.1,73.3" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="5 4"/>
<polygon points="438,72 432.1,77.4 430.4,69.6" class="acc-fill"/>
<text x="330" y="205" font-size="13" text-anchor="middle" fill="currentColor">X = mix(X ⊕ V_j), N times: the next place to read is unknown until now</text>
</svg>
<figcaption>Figure 11.8. scrypt's ROMix. Phase 1 fills a table of N entries, each made from the one before. Phase 2 reads it back at places chosen by the running value X, so which entries will be needed is not known in advance, and the whole table must be kept (or recomputed at a price).</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 680 156" width="680" role="img" aria-label="Bar chart of work against memory: 4096 slots 8192 mixes; 1024 slots 14358; 256 slots 39022; 64 slots 137118">
<text x="150" y="32" font-size="14" text-anchor="end" fill="currentColor">4,096 slots kept</text>
<rect x="160" y="16" width="15.8" height="22" rx="2" class="soft"/>
<rect x="160" y="16" width="15.8" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="183.8" y="32" font-size="13" fill="currentColor">8,192 mixes   (product 33.6 M)</text>
<text x="150" y="66" font-size="14" text-anchor="end" fill="currentColor">1,024 slots kept</text>
<rect x="160" y="50" width="27.7" height="22" rx="2" class="soft-acc"/>
<rect x="160" y="50" width="27.7" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="195.7" y="66" font-size="13" font-weight="bold" fill="currentColor">14,358 mixes   (product 14.7 M)</text>
<text x="150" y="100" font-size="14" text-anchor="end" fill="currentColor">256 slots kept</text>
<rect x="160" y="84" width="75.3" height="22" rx="2" class="soft-acc"/>
<rect x="160" y="84" width="75.3" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="243.3" y="100" font-size="13" font-weight="bold" fill="currentColor">39,022 mixes   (product 10.0 M)</text>
<text x="150" y="134" font-size="14" text-anchor="end" fill="currentColor">64 slots kept</text>
<rect x="160" y="118" width="264.4" height="22" rx="2" class="soft-acc"/>
<rect x="160" y="118" width="264.4" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="432.4" y="134" font-size="13" font-weight="bold" fill="currentColor">137,118 mixes   (product 8.8 M)</text>
<line x1="160" y1="10" x2="160" y2="146" stroke="currentColor" stroke-width="1.5"/>
</svg>
<figcaption>Figure 11.9. The ROMix trade-off from the program above, with n = 4,096. Throwing memory away is paid for in extra mixing. The product of memory and work, roughly the attacker's hardware cost, falls from 33.6 million to about 8.8 million and then levels off near n²/2 ≈ 8.4 million.</figcaption>
</figure>

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

!!! note "Life story: scrypt"
    **Born:** 2009, Colin Percival, presented at BSDCan; RFC 7914 (2016) · **Purpose:** make each
    password guess cost memory, not just time, so that custom hardware gains little · **Helped:**
    Tarsnap, the `age` encryption tool, many cryptocurrency wallets, and through yescrypt the
    password files of most Linux distributions · **Status:** current; safe at large memory
    settings, as Litecoin's small ones showed.

## 11.7 Argon2

*Level: intermediate.*

By 2013 there were several competing ideas and no agreed standard, so
Jean-Philippe Aumasson organized the open **Password Hashing Competition**
(2013 to 2015), on the model of the AES and SHA-3 contests. Entries came from
around the world. In July 2015 the panel chose **Argon2**, by Alex Biryukov,
Daniel Dinu and Dmitry Khovratovich of the University of Luxembourg (Biryukov
and Khovratovich were already known for the 2009 related-key attacks on
AES-192 and AES-256), and gave
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

<figure class="mars-fig">
<svg viewBox="0 0 660 270" width="660" role="img" aria-label="Argon2 memory: p lanes of 1 KiB blocks; each new block is G of the previous block in its lane and one earlier reference block, possibly in another lane">
<text x="60" y="52" font-size="13" text-anchor="end" fill="currentColor">lane 0</text>
<rect x="70" y="30" width="50" height="34" rx="3" class="soft"/>
<rect x="70" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="126" y="30" width="50" height="34" rx="3" class="soft"/>
<rect x="126" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="182" y="30" width="50" height="34" rx="3" class="soft"/>
<rect x="182" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="238" y="30" width="50" height="34" rx="3" class="soft"/>
<rect x="238" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="294" y="30" width="50" height="34" rx="3" class="soft"/>
<rect x="294" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="350" y="30" width="50" height="34" rx="3" class="soft"/>
<rect x="350" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="406" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="462" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="518" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="574" y="30" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<text x="60" y="96" font-size="13" text-anchor="end" fill="currentColor">lane 1</text>
<rect x="70" y="74" width="50" height="34" rx="3" class="soft"/>
<rect x="70" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="126" y="74" width="50" height="34" rx="3" class="soft"/>
<rect x="126" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="182" y="74" width="50" height="34" rx="3" class="soft"/>
<rect x="182" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="238" y="74" width="50" height="34" rx="3" class="soft"/>
<rect x="238" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="294" y="74" width="50" height="34" rx="3" class="soft"/>
<rect x="294" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="350" y="74" width="50" height="34" rx="3" class="soft"/>
<rect x="350" y="74" width="50" height="34" rx="3" fill="none" class="acc" stroke="currentColor" stroke-width="1"/>
<rect x="406" y="74" width="50" height="34" rx="3" class="soft-acc"/>
<rect x="406" y="74" width="50" height="34" rx="3" fill="none" class="acc" stroke="currentColor" stroke-width="2"/>
<text x="431" y="96" font-size="12" text-anchor="middle" font-weight="bold" fill="currentColor">B[i][j]</text>
<rect x="462" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="518" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="574" y="74" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<text x="60" y="140" font-size="13" text-anchor="end" fill="currentColor">lane 2</text>
<rect x="70" y="118" width="50" height="34" rx="3" class="soft"/>
<rect x="70" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="126" y="118" width="50" height="34" rx="3" class="soft"/>
<rect x="126" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="182" y="118" width="50" height="34" rx="3" class="soft"/>
<rect x="182" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="238" y="118" width="50" height="34" rx="3" class="soft"/>
<rect x="238" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="294" y="118" width="50" height="34" rx="3" class="soft"/>
<rect x="294" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="350" y="118" width="50" height="34" rx="3" class="soft"/>
<rect x="350" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="406" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="462" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="518" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="574" y="118" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<text x="60" y="184" font-size="13" text-anchor="end" fill="currentColor">lane 3</text>
<rect x="70" y="162" width="50" height="34" rx="3" class="soft"/>
<rect x="70" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="126" y="162" width="50" height="34" rx="3" class="soft"/>
<rect x="126" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="182" y="162" width="50" height="34" rx="3" class="soft"/>
<rect x="182" y="162" width="50" height="34" rx="3" fill="none" class="acc" stroke="currentColor" stroke-width="1"/>
<rect x="238" y="162" width="50" height="34" rx="3" class="soft"/>
<rect x="238" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="294" y="162" width="50" height="34" rx="3" class="soft"/>
<rect x="294" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="350" y="162" width="50" height="34" rx="3" class="soft"/>
<rect x="350" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="406" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="462" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="518" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="574" y="162" width="50" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<polyline points="400,91 400,91" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="406,91 399.1,95 399.1,87" class="acc-fill"/>
<polyline points="207,162 237,132 425,108.7" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="5 4"/>
<polygon points="431,108 424.6,112.8 423.6,104.9" class="acc-fill"/>
<text x="182" y="218" font-size="13" class="acc-fill">↑ B[l][z]: an earlier block, chosen by the index</text>
<text x="70" y="256" font-size="13" fill="currentColor">filled so far</text>
<rect x="160" y="244" width="30" height="16" rx="2" class="soft"/>
<text x="230" y="256" font-size="13" fill="currentColor">not yet</text>
<rect x="290" y="244" width="30" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<text x="360" y="256" font-size="13" fill="currentColor">t passes over all of it</text>
</svg>
<figcaption>Figure 11.10. Argon2's memory, schematic, with p = 4 lanes. Each new 1 KiB block is the compression G of the previous block in its lane and one earlier block chosen by an index. Argon2i picks that index from a counter, Argon2d from the data, and Argon2id from the counter first, then the data.</figcaption>
</figure>

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

!!! note "Life story: Argon2"
    **Born:** 2015, Alex Biryukov, Daniel Dinu and Dmitry Khovratovich at the University of
    Luxembourg, winner of the Password Hashing Competition (2013 to 2015); RFC 9106 (2021) ·
    **Purpose:** a memory-hard password hash with tunable time, memory and parallelism, and a
    variant safe against cache-timing leaks · **Helped:** the first choice of OWASP and RFC 9106;
    used by password managers, libsodium and many web frameworks · **Status:** current. Argon2i
    was weakened by Alwen and Blocki's 2016 attack and fixed in version 1.3; Argon2id is the
    default.

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

<figure class="mars-fig">
<svg viewBox="0 0 680 180" width="680" role="img" aria-label="Bar chart on a log scale of accounts in four breaches: RockYou 32 million, LinkedIn 117 million, Adobe 153 million, Yahoo 3 billion">
<text x="250" y="32" font-size="14" text-anchor="end" fill="currentColor">RockYou, 2009: plain text</text>
<rect x="260" y="16" width="134.2" height="22" rx="2" class="soft"/>
<rect x="260" y="16" width="134.2" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="402.2" y="32" font-size="13" fill="currentColor">32 million</text>
<text x="250" y="66" font-size="14" text-anchor="end" fill="currentColor">LinkedIn, 2012: SHA-1, no salt</text>
<rect x="260" y="50" width="184.4" height="22" rx="2" class="soft"/>
<rect x="260" y="50" width="184.4" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="452.4" y="66" font-size="13" fill="currentColor">117 million</text>
<text x="250" y="100" font-size="14" text-anchor="end" fill="currentColor">Adobe, 2013: 3DES-ECB, one key</text>
<rect x="260" y="84" width="194.8" height="22" rx="2" class="soft"/>
<rect x="260" y="84" width="194.8" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="462.8" y="100" font-size="13" fill="currentColor">153 million</text>
<text x="250" y="134" font-size="14" text-anchor="end" fill="currentColor">Yahoo, 2013: MD5</text>
<rect x="260" y="118" width="310" height="22" rx="2" class="soft-acc"/>
<rect x="260" y="118" width="310" height="22" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1.2"/>
<text x="578" y="134" font-size="13" font-weight="bold" fill="currentColor">3 billion</text>
<line x1="260" y1="10" x2="260" y2="146" stroke="currentColor" stroke-width="1.5"/>
<line x1="260" y1="146" x2="570" y2="146" stroke="currentColor" stroke-width="1"/>
<line x1="260" y1="146" x2="260" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="260" y="165" font-size="12" text-anchor="middle" fill="currentColor">1 M</text>
<line x1="349.2" y1="146" x2="349.2" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="349.2" y="165" font-size="12" text-anchor="middle" fill="currentColor">10 M</text>
<line x1="438.3" y1="146" x2="438.3" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="438.3" y="165" font-size="12" text-anchor="middle" fill="currentColor">100 M</text>
<line x1="527.5" y1="146" x2="527.5" y2="151" stroke="currentColor" stroke-width="1"/>
<text x="527.5" y="165" font-size="12" text-anchor="middle" fill="currentColor">1 B</text>
</svg>
<figcaption>Figure 11.11. Accounts exposed in four of the breaches below (log scale), with how each stored its passwords. None used a slow, salted hash for all its copies of the password.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 640 232" width="640" role="img" aria-label="Illustration of Adobe&#x27;s leak: identical ciphertext blocks for identical passwords, with plain-text hints beside them">
<text x="10" y="20" font-size="13" font-weight="bold" fill="currentColor">user</text>
<text x="130" y="20" font-size="13" font-weight="bold" fill="currentColor">encrypted password (ECB, one key)</text>
<text x="460" y="20" font-size="13" font-weight="bold" fill="currentColor">hint (plain text)</text>
<text x="10" y="52" font-size="13" fill="currentColor">user 1</text>
<rect x="130" y="35" width="150" height="26" rx="2" class="soft-acc"/>
<rect x="130" y="35" width="150" height="26" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1"/>
<text x="205" y="53" font-size="13" text-anchor="middle" fill="currentColor">block X</text>
<rect x="290" y="35" width="150" height="26" rx="2" class="soft"/>
<text x="365" y="53" font-size="13" text-anchor="middle" fill-opacity="0.6" fill="currentColor">rest</text>
<text x="460" y="52" font-size="13" class="acc-fill">one to six</text>
<text x="10" y="86" font-size="13" fill="currentColor">user 2</text>
<rect x="130" y="69" width="150" height="26" rx="2" class="soft-acc"/>
<rect x="130" y="69" width="150" height="26" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1"/>
<text x="205" y="87" font-size="13" text-anchor="middle" fill="currentColor">block X</text>
<rect x="290" y="69" width="150" height="26" rx="2" class="soft"/>
<text x="365" y="87" font-size="13" text-anchor="middle" fill-opacity="0.6" fill="currentColor">rest</text>
<text x="460" y="86" font-size="13" class="acc-fill">1-6</text>
<text x="10" y="120" font-size="13" fill="currentColor">user 3</text>
<rect x="130" y="103" width="150" height="26" rx="2" class="soft-acc"/>
<rect x="130" y="103" width="150" height="26" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1"/>
<text x="205" y="121" font-size="13" text-anchor="middle" fill="currentColor">block X</text>
<rect x="290" y="103" width="150" height="26" rx="2" class="soft"/>
<text x="365" y="121" font-size="13" text-anchor="middle" fill-opacity="0.6" fill="currentColor">rest</text>
<text x="460" y="120" font-size="13" fill="currentColor">(none)</text>
<text x="10" y="154" font-size="13" fill="currentColor">user 4</text>
<rect x="130" y="137" width="150" height="26" rx="2" class="soft"/>
<rect x="130" y="137" width="150" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="205" y="155" font-size="13" text-anchor="middle" fill="currentColor">block Y</text>
<rect x="290" y="137" width="150" height="26" rx="2" class="soft"/>
<text x="365" y="155" font-size="13" text-anchor="middle" fill-opacity="0.6" fill="currentColor">rest</text>
<text x="460" y="154" font-size="13" fill="currentColor">(none)</text>
<text x="10" y="188" font-size="13" fill="currentColor">user 5</text>
<rect x="130" y="171" width="150" height="26" rx="2" class="soft-acc"/>
<rect x="130" y="171" width="150" height="26" rx="2" fill="none" class="acc" stroke="currentColor" stroke-width="1"/>
<text x="205" y="189" font-size="13" text-anchor="middle" fill="currentColor">block X</text>
<rect x="290" y="171" width="150" height="26" rx="2" class="soft"/>
<text x="365" y="189" font-size="13" text-anchor="middle" fill-opacity="0.6" fill="currentColor">rest</text>
<text x="460" y="188" font-size="13" fill="currentColor">…</text>
<text x="10" y="226" font-size="13" fill="currentColor">Thousands of rows share block X; their hints together give the password away.</text>
</svg>
<figcaption>Figure 11.12. How Adobe's leak gave passwords away (illustration, not real rows). ECB under one key turns equal passwords into equal ciphertext blocks, so users group themselves, and the hints of a group are read together. No one needed to break 3DES.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 680 264" width="680" role="img" aria-label="HKDF: extract computes PRK as HMAC of salt and input keying material; expand chains HMAC under PRK with info and a counter to produce output blocks">
<text x="10" y="22" font-size="15" font-weight="bold" fill="currentColor">Extract</text>
<rect x="10" y="34" width="120" height="34" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="55.9" font-size="14" text-anchor="middle" fill="currentColor">salt</text>
<rect x="150" y="34" width="160" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="230" y="55.9" font-size="14" text-anchor="middle" fill="currentColor">IKM (lumpy secret)</text>
<polyline points="70,68 70,80 215,80 215,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="215,92 211,85.1 219,85.1" fill="currentColor"/>
<polyline points="230,68 230,86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="230,92 226,85.1 234,85.1" fill="currentColor"/>
<rect x="170" y="92" width="110" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="225" y="114.9" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">HMAC</text>
<polyline points="280,110 344,110" fill="none" class="acc" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<polygon points="350,110 343.1,114 343.1,106" class="acc-fill"/>
<rect x="350" y="92" width="110" height="36" rx="4" class="soft-acc acc" stroke="currentColor" stroke-width="1.5"/>
<text x="405" y="115.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">PRK</text>
<text x="480" y="108" font-size="13" class="acc-fill">one uniform key</text>
<text x="480" y="124" font-size="12" fill="currentColor">(test case 1: 07770936…)</text>
<text x="10" y="162" font-size="15" font-weight="bold" fill="currentColor">Expand</text>
<rect x="30" y="172" width="160" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="192.6" font-size="13" text-anchor="middle" fill="currentColor">info ‖ 01</text>
<text x="110" y="230" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">T(1)</text>
<polyline points="110,204 110,210" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="110,216 106,209.1 114,209.1" fill="currentColor"/>
<polyline points="140,226 230,226 230,188 244,188" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="5 4"/>
<polygon points="250,188 243.1,192 243.1,184" fill="currentColor"/>
<rect x="250" y="172" width="160" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="330" y="192.6" font-size="13" text-anchor="middle" fill="currentColor">T(1) ‖ info ‖ 02</text>
<text x="330" y="230" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">T(2)</text>
<polyline points="330,204 330,210" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="330,216 326,209.1 334,209.1" fill="currentColor"/>
<polyline points="360,226 450,226 450,188 464,188" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="5 4"/>
<polygon points="470,188 463.1,192 463.1,184" fill="currentColor"/>
<rect x="470" y="172" width="160" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="192.6" font-size="13" text-anchor="middle" fill="currentColor">T(2) ‖ info ‖ 03</text>
<text x="550" y="230" font-size="14" text-anchor="middle" font-weight="bold" fill="currentColor">T(3)</text>
<polyline points="550,204 550,210" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="550,216 546,209.1 554,209.1" fill="currentColor"/>
<text x="610" y="258" font-size="13" text-anchor="end" class="acc-fill">OKM = T(1) ‖ T(2) ‖ …</text>
<text x="560" y="158" font-size="13" text-anchor="middle" class="acc-fill">each box: HMAC(PRK, ·)</text>
</svg>
<figcaption>Figure 11.13. HKDF's two steps. Extract concentrates whatever entropy the input has into one pseudorandom key, PRK. Expand chains HMAC under PRK, each call fed the previous block, the info label and a counter, until there are enough bytes.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 620 200" width="620" role="img" aria-label="One shared secret goes through HKDF with two different info labels and gives two unrelated keys">
<rect x="10" y="80" width="150" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="104.9" font-size="14" text-anchor="middle" fill="currentColor">shared secret</text>
<polyline points="160,100 214,100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="220,100 213.1,104 213.1,96" fill="currentColor"/>
<rect x="220" y="80" width="90" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="265" y="105.2" font-size="15" text-anchor="middle" font-weight="bold" fill="currentColor">HKDF</text>
<polyline points="310,92 340,92 340,40 364,40" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="370,40 363.1,44 363.1,36" class="acc-fill"/>
<polyline points="310,108 340,108 340,160 364,160" fill="none" class="acc" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<polygon points="370,160 363.1,164 363.1,156" class="acc-fill"/>
<text x="380" y="26" font-size="13" class="acc-fill">info = &quot;myapp v1 client-to-server&quot;</text>
<rect x="370" y="34" width="240" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="55.9" font-size="14" text-anchor="middle" font-family="monospace" fill="currentColor">5d74c39c8fa7351f…</text>
<text x="380" y="146" font-size="13" class="acc-fill">info = &quot;myapp v1 server-to-client&quot;</text>
<rect x="370" y="154" width="240" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="175.9" font-size="14" text-anchor="middle" font-family="monospace" fill="currentColor">0ae210f3d6a5bd17…</text>
</svg>
<figcaption>Figure 11.14. Domain separation, with the values printed by the program above. The same secret and two labels give two keys that look unrelated, so the two directions of traffic never share a key.</figcaption>
</figure>

**Where it runs.** TLS 1.3 builds its whole key schedule from HKDF-Extract and a
labeled HKDF-Expand ("tls13 c hs traffic", "tls13 key" and so on; see
[Chapter 19](19-Protocols.md)). Signal, HPKE, MLS and the Noise protocols use
it; WireGuard uses it with BLAKE2s in place of SHA-256. In real code use a
library version, such as `HKDF` in the `cryptography` package.

**Never on passwords.** HKDF is fast by design. Running a password through it
gives a key that can be guessed at billions of tries per second. Passwords go
through a password hash first (§11.4 to §11.7); its output can then go through
HKDF to make several keys.

!!! note "Life story: HKDF"
    **Born:** 2010, Hugo Krawczyk at IBM, presented at CRYPTO 2010; RFC 5869 · **Purpose:** one
    clean, proven way to turn a shared secret into separate keys, replacing the many home-made
    KDFs of earlier protocols · **Helped:** TLS 1.3's whole key schedule, Signal, HPKE, MLS, the
    Noise protocols and WireGuard · **Status:** current; the common mistake is using it on
    passwords, where it is far too fast.

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

!!! note "Life story: the NIST and ANSI KDFs"
    **Born:** ANSI X9.63 (2001) from the banking world; the one-step KDF in SP 800-56A (2006), now
    SP 800-56C; KBKDF in SP 800-108 (2009) · **Purpose:** approved, testable ways to derive keys
    in US federal and banking systems · **Helped:** smart cards, Kerberos, JSON Web Encryption,
    ECIES and 5G subscriber privacy · **Status:** current and approved; HKDF is accepted as an
    instance of SP 800-56C's two-step method.

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
