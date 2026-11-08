# 12. Kerberos

*Log in once in the morning, and for the rest of the day every file server,
printer, mail server and database you touch already knows who you are. That is
Kerberos, the single sign-on system inside every Windows domain and most
university and laboratory networks. It is the protocol of Chapter 1's
Needham-Schroeder story grown up: a trusted server that shares a key with
everyone, hands out tickets, and uses timestamps to keep old tickets from being
replayed. It uses no public-key cryptography at all in its core. In this
chapter you will turn a password into Kerberos keys and match RFC 8009's test
values, encrypt exactly as Kerberos does and match its sample ciphertexts, run
a whole login through all three exchanges, and then crack a service ticket
offline, the attack called Kerberoasting.*

!!! abstract "In this chapter"
    **You will learn:**

    - the problem Kerberos solves, and why a trusted third party is the answer
      without public keys;
    - the three exchanges (AS, TGS and AP) and what each party can read;
    - how a password becomes a key, and how Kerberos encrypts, checked against
      RFC 8009;
    - how Active Directory uses Kerberos, and why RC4 survived there until 2026;
    - PKINIT, FAST and SPAKE: getting the password off the wire;
    - pass-the-ticket, golden and silver tickets, Kerberoasting and AS-REP
      roasting, and which key each one needs;
    - what the light delay between Earth and Mars does to a protocol built on
      timestamps.

    **You need:** [Chapter 1](01-What-a-Protocol-Must-Do.md) (Needham-Schroeder,
    replay and timestamps) and [Chapter 11](11-One-Time-Codes-and-Password-Protocols.md)
    (offline guessing); AES and its modes from Chapters
    [7](../../book/07-AES.md) and [8](../../book/08-Modes-of-Operation.md) of
    book 1, and HMAC and PBKDF2 from Chapters
    [10](../../book/10-Message-Authentication.md) and
    [11](../../book/11-Passwords-and-Key-Derivation.md).

    **Levels:** §12.1 and §12.2 are for beginners, §12.3 to §12.10 are
    intermediate, §12.11 is expert.

## 12.1 The problem

*Level: beginner.*

In 1983 MIT started Project Athena with Digital Equipment Corporation and IBM:
thousands of workstations spread across a campus, any student able to sit at
any of them, and shared file servers, mail and printers behind them. The
network was an open Ethernet. Anyone could plug in a machine and read every
packet, and anyone with administrator rights on a workstation could make it
claim to be anyone.

The services needed to know who was asking. The obvious answers all fail:

- **Send the password to every service.** Every server then sees every
  password, and so does everyone listening on the wire.
- **Trust the workstation's word.** That was how the old Unix `rsh` and `rlogin`
  worked: the server believed the client machine's claim about the user. On a
  campus where students had full control of machines, that meant no
  authentication at all.
- **Give everyone a key pair.** In 1983 public-key operations were slow,
  patented and hard to manage, and there was no infrastructure of certificates
  (Chapter 2 tells how long that took).

The Athena team took the design Roger Needham and Michael Schroeder had
published in 1978 for exactly this case (Chapter 1): a **trusted third party**
that shares a secret key with every user and every service. When Alice wants to
talk to the file server, the trusted server makes up a fresh session key and
gives it to both of them, each copy locked under that party's own key. Alice
and the file server never needed to share anything in advance. They only need
to trust the server in the middle.

Steve Miller and Clifford Neuman designed the protocol; Jennifer Steiner,
Clifford Neuman and Jeffrey Schiller described it at the USENIX Winter
conference in 1988. They named it after Kerberos, the three-headed dog that
guards the entrance to Hades. Version 4 spread to other universities; version 5,
written by John Kohl and Clifford Neuman, became RFC 1510 in 1993 and was
revised as RFC 4120 in 2005, which is the version every system uses today.
Microsoft adopted Kerberos 5 as the default login protocol of Windows 2000's
Active Directory, and with that it became one of the most used authentication
protocols in the world.

Three words recur through the chapter:

- The **key distribution center (KDC)** is the trusted server. It holds a
  long-term key for every **principal**, a user or a service. It has two
  logical parts: the **authentication service (AS)**, which checks your
  password once, and the **ticket-granting service (TGS)**, which hands out
  tickets after that. In practice they are one program on one machine.
- A **realm** is the set of principals one KDC serves, written in capitals,
  such as `ATHENA.MIT.EDU` or `ARCADIA.MARS`. A principal's full name is
  `alice@ARCADIA.MARS` for a user, `HTTP/library.arcadia.mars@ARCADIA.MARS`
  for a web service.
- A **ticket** is a message from the KDC to a service, encrypted under the
  service's long-term key, saying "this is Alice, and here is the session key
  you will share with her". Alice carries it but cannot read it.

## 12.2 Three exchanges

*Level: beginner.*

A Kerberos login is three request-and-reply pairs (Figure 12.1).

<figure class="mars-fig">
<svg viewBox="0 0 640 390" width="640" role="img" aria-label="The three Kerberos exchanges: AS-REQ and AS-REP between client and authentication service give a TGT; TGS-REQ and TGS-REP give a service ticket; AP-REQ and AP-REP between client and service" fill="currentColor" font-size="13">
<rect x="20" y="20" width="120" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="80" y="45" text-anchor="middle">client (alice)</text>
<rect x="215" y="20" width="200" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="315" y="45" text-anchor="middle">KDC: AS and TGS</text>
<rect x="490" y="20" width="130" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="555" y="45" text-anchor="middle">library server</text>
<line x1="80" y1="60" x2="80" y2="300" stroke="currentColor" stroke-dasharray="4 4" opacity="0.5"/>
<line x1="315" y1="60" x2="315" y2="300" stroke="currentColor" stroke-dasharray="4 4" opacity="0.5"/>
<line x1="555" y1="60" x2="555" y2="300" stroke="currentColor" stroke-dasharray="4 4" opacity="0.5"/>
<text x="440" y="118" font-size="12" font-weight="bold">once a day</text>
<line x1="80" y1="100" x2="312" y2="100" stroke="currentColor" stroke-width="1.5"/><polygon points="312,100 300,95 300,105"/>
<text x="196" y="94" text-anchor="middle" font-size="12">1 AS-REQ: "alice", timestamp under K_alice</text>
<line x1="315" y1="128" x2="83" y2="128" stroke="currentColor" stroke-width="1.5"/><polygon points="83,128 95,123 95,133"/>
<text x="196" y="122" text-anchor="middle" font-size="12">2 AS-REP: TGT + {S1} under K_alice</text>
<text x="440" y="190" font-size="12" font-weight="bold">once per service</text>
<line x1="80" y1="172" x2="312" y2="172" stroke="currentColor" stroke-width="1.5"/><polygon points="312,172 300,167 300,177"/>
<text x="196" y="166" text-anchor="middle" font-size="12">3 TGS-REQ: TGT + authenticator under S1</text>
<line x1="315" y1="200" x2="83" y2="200" stroke="currentColor" stroke-width="1.5"/><polygon points="83,200 95,195 95,205"/>
<text x="196" y="194" text-anchor="middle" font-size="12">4 TGS-REP: ticket + {S2} under S1</text>
<text x="92" y="232" font-size="12" font-weight="bold">each connection</text>
<line x1="80" y1="244" x2="552" y2="244" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="552,244 540,239 540,249" class="acc-fill"/>
<text x="430" y="238" text-anchor="middle" font-size="12" class="acc-fill">5 AP-REQ: ticket + authenticator under S2</text>
<line x1="555" y1="272" x2="83" y2="272" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="83,272 95,267 95,277" class="acc-fill"/>
<text x="430" y="266" text-anchor="middle" font-size="12" class="acc-fill">6 AP-REP (optional): proof under S2</text>
<rect x="20" y="312" width="600" height="68" rx="6" class="soft" stroke="currentColor"/>
<text x="40" y="332" font-size="12.5">TGT = {alice, S1, end time} under K_krbtgt</text>
<text x="40" y="350" font-size="12.5">ticket = {alice, S2, end time} under K_library</text>
<text x="40" y="370" font-size="12.5">The service never talks to the KDC. The password is used only in step 1.</text>
</svg>
<figcaption>Figure 12.1. The three Kerberos exchanges. Curly braces mean "encrypted under". Alice carries the TGT and the ticket but cannot open either.</figcaption>
</figure>

**1-2, the authentication service exchange.** Alice's machine sends her name to
the AS. The AS looks up her long-term key $K_\text{alice}$, which was made
from her password, picks a fresh session key $S_1$, and sends back two things:

- a **ticket-granting ticket (TGT)**: her name, $S_1$ and an end time,
  encrypted under the key of a special principal called `krbtgt`, which only
  the KDC knows;
- a part for Alice: $S_1$ and the same end time, encrypted under
  $K_\text{alice}$.

Alice's machine turns her password into $K_\text{alice}$, opens its part, and
keeps $S_1$ and the TGT in a **credential cache**. Then it forgets the password.
If she typed the wrong password, the decryption fails its integrity check and
the login fails, without the AS ever having been told whether the password was
right. (This is the root of AS-REP roasting, §12.8, and the reason for
pre-authentication, below.)

**3-4, the ticket-granting exchange.** When Alice opens the library's web page,
her machine sends the TGS three things: the TGT, the name of the service it
wants, and an **authenticator**, her name and the current time encrypted under
$S_1$. The TGS opens the TGT with its own key, finds $S_1$ inside, opens the
authenticator with $S_1$, and checks that the names match and the time is
within a few minutes of its clock. It then makes a second session key $S_2$
and sends back a **service ticket**, $\{$alice, $S_2$, end time$\}$ under the
library's key, plus $S_2$ under $S_1$ for Alice. The KDC keeps no state about
Alice between steps 2 and 3: everything it needs to know comes back to it
inside the TGT.

**5-6, the client-server exchange.** Alice's machine sends the library the
service ticket and a fresh authenticator under $S_2$. The library opens the
ticket with its own long-term key, kept in a file called a **keytab**, finds
$S_2$, opens the authenticator, and checks the time. If Alice asked for mutual
authentication, the library answers with an AP-REP under $S_2$, which only the
real library could have produced. From here the two share $S_2$ and can use it
to protect the connection, though most applications today run TLS for that
and use Kerberos only to log in.

### What each party knows, by hand

It helps to tabulate who can open what, because every attack in §12.8 is a
failure of one row:

| Item | Encrypted under | Who can open it |
|---|---|---|
| pre-authentication timestamp | $K_\text{alice}$ | Alice, the KDC |
| TGT | $K_\text{krbtgt}$ | the KDC only |
| Alice's part of the AS-REP | $K_\text{alice}$ | Alice, the KDC |
| TGS authenticator | $S_1$ | Alice, the KDC |
| service ticket | $K_\text{library}$ | the library, the KDC |
| Alice's part of the TGS-REP | $S_1$ | Alice, the KDC |
| AP authenticator and AP-REP | $S_2$ | Alice, the library, the KDC |

Read down the right-hand column. The KDC can open everything: it knows every
key, which is what "trusted third party" means. Whoever steals the KDC's
database becomes the KDC. Read across the top three rows: everything Alice
does starts from $K_\text{alice}$, and $K_\text{alice}$ comes from her password.
And no row involves a key that lives only for this connection and is then
destroyed. Kerberos session keys are chosen by the KDC and sent encrypted under
long-term keys, so there is no forward secrecy: someone who records the traffic
and later steals the library's key can open the old tickets, read $S_2$, and
decrypt the old sessions.

### Pre-authentication

In the protocol as sketched, anyone can send "I am alice" and receive a reply
encrypted under $K_\text{alice}$, then try passwords against it at leisure.
Steven Bellovin and Michael Merritt pointed this out in "Limitations of the
Kerberos authentication system" (1990). Kerberos 5 added
**pre-authentication**: the AS first answers "pre-authentication required",
with the salt and iteration count to use, and the client resends its request
with `PA-ENC-TIMESTAMP`, the current time encrypted under $K_\text{alice}$. Only
then does the AS reply. This stops strangers from collecting replies for any
name they like. It does not stop someone who can watch the network, because
the encrypted timestamp is itself something to test guesses against. RFC 4120
says so plainly in section 1.6: Kerberos does not protect weak passwords from
offline guessing.

## 12.3 Keys from passwords

*Level: intermediate.*

Every Kerberos key belongs to an **encryption type** ("enctype"), a bundle of
cipher, integrity check and key derivation with a number and a name. The ones
in use today:

| Enctype | Number | Defined in | Key from password |
|---|---|---|---|
| `aes256-cts-hmac-sha1-96` | 18 | RFC 3962 (2005) | PBKDF2-HMAC-SHA-1, 4,096 rounds, then an AES step |
| `aes128-cts-hmac-sha1-96` | 17 | RFC 3962 | same, 128-bit |
| `aes128-cts-hmac-sha256-128` | 19 | RFC 8009 (2016) | PBKDF2-HMAC-SHA-256, 32,768 rounds, then HMAC |
| `aes256-cts-hmac-sha384-192` | 20 | RFC 8009 | PBKDF2-HMAC-SHA-384, 32,768 rounds, then HMAC |
| `arcfour-hmac` (RC4) | 23 | RFC 4757 (2006) | MD4 of the password, no salt |

The **salt** is the realm followed by the user's name, `ARCADIA.MARSalice`,
so the same password gives different keys in different realms and for
different users. RC4-HMAC, alone, has no salt at all: its key is the
**NT hash**, the MD4 of the password in UTF-16, which Windows had already been
storing for its older NTLM login protocol. Two users with the same password
have the same RC4 key, and a table of precomputed NT hashes works against
every Windows domain at once.

Each long-term key is then split by **key usage**. RFC 4120 numbers every place
a key is used: 1 for the pre-authentication timestamp, 2 for a ticket, 3 for
the AS-REP's encrypted part, 7 for the TGS authenticator, 8 for the TGS-REP's
encrypted part, 11 for the AP authenticator, and so on. From the base key and
the usage number, the enctype derives three keys: $K_e$ for encryption, $K_i$
for integrity and $K_c$ for checksums. So a value encrypted for one purpose can
never be passed off as a value for another, even under the same base key; an
attacker cannot take Alice's encrypted timestamp (usage 1) and present it as an
authenticator (usage 11). This is the domain separation rule of Chapter 1,
written into the key schedule.

For the RFC 8009 enctypes both steps use the SP 800-108 counter-mode KDF with
HMAC:

$$\begin{aligned}K = \mathrm{HMAC}\bigl(\text{key},\ &00000001 \,\|\, \text{label}\\ &\|\, 00 \,\|\, \text{length in bits}\bigr)\end{aligned}$$

truncated to the length wanted. The label is `kerberos` for string-to-key, and
the usage number followed by one byte, `99`, `AA` or `55`, for $K_c$, $K_e$ and
$K_i$.

### Code it: string-to-key and key usage

The program computes the two base keys of RFC 8009 Appendix A from the
password `password`, then the three usage-2 keys for the Appendix's 128-bit
base key, and finally the NT hash. MD4 is not in every Python's `hashlib`
(OpenSSL 3 dropped it), so the program writes it out from RFC 1320 and checks
it on the RFC's test string.

```python
# Kerberos long-term keys: from a password to the keys that encrypt tickets.
# RFC 8009 (AES with HMAC-SHA-2) and RFC 4757 (RC4-HMAC, the NT hash).
import hashlib, hmac, struct

def kdf(key, label, bits, h):                     # RFC 8009 section 3 (SP 800-108)
    msg = struct.pack(">I", 1) + label + b"\0" + struct.pack(">I", bits)
    return hmac.new(key, msg, h).digest()[:bits // 8]

ENCTYPES = {"aes128-cts-hmac-sha256-128": ("sha256", 16, 128),
            "aes256-cts-hmac-sha384-192": ("sha384", 32, 192)}

def string_to_key(password, salt, enctype, iterations=32768):
    h, n, _ = ENCTYPES[enctype]
    tkey = hashlib.pbkdf2_hmac(h, password, enctype.encode() + b"\0" + salt, iterations, n)
    return kdf(tkey, b"kerberos", n * 8, h)

def usage_keys(base, usage, enctype):             # one key set per message type
    h, n, mac_bits = ENCTYPES[enctype]
    u = struct.pack(">I", usage)
    return {"Kc": kdf(base, u + b"\x99", mac_bits, h),     # checksums
            "Ke": kdf(base, u + b"\xaa", n * 8, h),         # encryption
            "Ki": kdf(base, u + b"\x55", mac_bits, h)}      # integrity

salt = bytes.fromhex("10df9dd783e5bc8acea1730e74355f61") + b"ATHENA.MIT.EDUraeburn"
print("128-bit base key:", string_to_key(b"password", salt, "aes128-cts-hmac-sha256-128").hex())
print("256-bit base key:", string_to_key(b"password", salt, "aes256-cts-hmac-sha384-192").hex())
keys = usage_keys(bytes.fromhex("3705d96080c17728a0e800eab6e0d23c"), 2, "aes128-cts-hmac-sha256-128")
for name, value in keys.items():
    print(f"usage 2 {name}:", value.hex())

# RC4-HMAC's key is the NT hash: MD4 of the password in UTF-16LE, no salt.
def md4(msg):
    F = lambda x, y, z: (x & y) | (~x & z)
    G = lambda x, y, z: (x & y) | (x & z) | (y & z)
    Hf = lambda x, y, z: x ^ y ^ z
    rol = lambda x, s: ((x << s) | (x >> (32 - s))) & 0xFFFFFFFF
    n = len(msg)
    msg += b"\x80" + b"\0" * ((55 - n) % 64) + struct.pack("<Q", 8 * n)
    a, b, c, d = 0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476
    for i in range(0, len(msg), 64):
        X = struct.unpack("<16I", msg[i:i + 64])
        A, B, C, D = a, b, c, d
        for j in range(16):                       # round 1
            k, s = j, (3, 7, 11, 19)[j % 4]
            A, B, C, D = D, rol((A + F(B, C, D) + X[k]) & 0xFFFFFFFF, s), B, C
        for j in range(16):                       # round 2
            k, s = (j % 4) * 4 + j // 4, (3, 5, 9, 13)[j % 4]
            A, B, C, D = D, rol((A + G(B, C, D) + X[k] + 0x5A827999) & 0xFFFFFFFF, s), B, C
        for j in range(16):                       # round 3
            k, s = (0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15)[j], (3, 9, 11, 15)[j % 4]
            A, B, C, D = D, rol((A + Hf(B, C, D) + X[k] + 0x6ED9EBA1) & 0xFFFFFFFF, s), B, C
        a, b, c, d = [(v + w) & 0xFFFFFFFF for v, w in zip((a, b, c, d), (A, B, C, D))]
    return struct.pack("<4I", a, b, c, d)

nt_hash = lambda password: md4(password.encode("utf-16-le"))
print("MD4('abc') per RFC 1320:", md4(b"abc").hex())
print("NT hash of 'password':  ", nt_hash("password").hex())
```

```text
128-bit base key: 089bca48b105ea6ea77ca5d2f39dc5e7
256-bit base key: 45bd806dbf6a833a9cffc1c94589a222367a79bc21c413718906e9f578a78467
usage 2 Kc: b31a018a48f54776f403e9a396325dc3
usage 2 Ke: 9b197dd1e8c5609d6e67c3e37c62c72e
usage 2 Ki: 9fda0e56ab2d85e1569a688696c26a6c
MD4('abc') per RFC 1320: a448017aaf21d8525fc10ae87aa6729d
NT hash of 'password':   8846f7eaee8fb117ad06bdd830b7586c
```

Every value matches the RFC's appendix: the base keys `089bca48…` and
`45bd806d…`, and $K_c$ `b31a018a…`, $K_e$ `9b197dd1…` and $K_i$ `9fda0e56…`.
The NT hash of `password`, `8846f7ea…`, is one of the best-known strings in
security: it appears in every password-cracking tutorial, because millions of
Windows accounts have had it.

Real MIT Kerberos shows the same machinery. In a test realm on one machine
(MIT Kerberos 1.20.1), Alice ran `kinit` and then asked for one service ticket.
The KDC's log and `klist -e` showed:

```
AS_REQ (8 etypes {aes256-cts-hmac-sha1-96(18), aes128-cts-hmac-sha1-96(17), aes256-cts-hmac-sha384-192(20), ...})
  NEEDED_PREAUTH: alice@EXAMPLE.ORG for krbtgt/EXAMPLE.ORG@EXAMPLE.ORG
AS_REQ ... ISSUE: etypes {rep=aes256-cts-hmac-sha1-96(18), tkt=aes256-cts-hmac-sha1-96(18), ses=aes256-cts-hmac-sha1-96(18)}
TGS_REQ ... ISSUE: etypes {rep=aes256-cts-hmac-sha1-96(18), tkt=aes256-cts-hmac-sha1-96(18), ses=aes256-cts-hmac-sha1-96(18)}

10/30/26 16:12:26  10/31/26 16:12:26  krbtgt/EXAMPLE.ORG@EXAMPLE.ORG
	Etype (skey, tkt): aes256-cts-hmac-sha1-96, aes256-cts-hmac-sha1-96
10/30/26 16:12:26  10/31/26 16:12:26  HTTP/www.example.org@EXAMPLE.ORG
	Etype (skey, tkt): aes256-cts-hmac-sha1-96, aes256-cts-hmac-sha1-96
```

The first AS-REQ is refused with `NEEDED_PREAUTH`; the second, carrying the
encrypted timestamp, is answered. `rep` is the enctype of the reply to the
client, `tkt` the ticket's, `ses` the new session key's. Even though the realm
held SHA-384 keys, everything came out as SHA-1: the client's list of
preferences decides, and MIT's default list puts the SHA-1 pair first. The
`klist -kKe` command, which prints the keys in a keytab, showed Alice's SHA-384
key as `48b16d34…`; running string-to-key above on her password and salt gives
the same 32 bytes. Password and salt are all it takes.

## 12.4 How Kerberos encrypts

*Level: intermediate.*

Kerberos was designed before authenticated encryption existed as an idea, and
its framework (RFC 3961) shows its age in a useful way: it builds an
authenticated cipher out of parts, and each part is there for a reason.

- **A confounder.** Each message starts with 16 random bytes. Kerberos runs CBC
  with an all-zero IV, so the confounder plays the IV's role: two encryptions of
  the same ticket look unrelated.
- **CBC with ciphertext stealing (CTS).** Kerberos messages have arbitrary
  lengths, and padding would add a padding-oracle risk (book 1, Chapter 8).
  Ciphertext stealing pads the last block with zeros, encrypts, then swaps the
  last two ciphertext blocks and cuts the final one to the length of the
  plaintext. The output is exactly as long as the input.
- **An HMAC.** In the RFC 3962 enctypes, the HMAC-SHA-1 is computed over the
  plaintext, truncated to 96 bits and sent alongside the ciphertext
  (encrypt-and-MAC), so the receiver must decrypt before it can check. RFC 8009 switched to
  encrypt-then-MAC: HMAC-SHA-256 or -384 over the IV and the ciphertext,
  truncated to 128 or 192 bits, checked before anything is decrypted.

### Code it: RFC 8009 encryption

The standard library has no AES, so the program carries a short AES-128 (the
same cipher as book 1, Chapter 7, which also gives FIPS 197's test values). On top of it sit ciphertext stealing and the RFC 8009 encrypt and
decrypt functions. It runs the RFC's sample encryptions with plaintexts of 0, 6
and 21 bytes, using the $K_e$ and $K_i$ computed by the previous program.

```python
# RFC 8009 encryption: a random confounder, AES in CBC with ciphertext stealing
# (CS3), then HMAC over IV and ciphertext. Continue from above; AES-128 is
# written out because the standard library has none.
def xtime(a): return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1
SBOX, INV = [0] * 256, [0] * 256
p = q = 1
for _ in range(255):                                   # build the S-box from GF(2^8)
    p = p ^ (p << 1) ^ (0x1B if p & 0x80 else 0); p &= 0xFF
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xFF
    if q & 0x80: q ^= 0x09
    s = q ^ ((q << 1 | q >> 7) & 0xFF) ^ ((q << 2 | q >> 6) & 0xFF) ^ ((q << 3 | q >> 5) & 0xFF) ^ ((q << 4 | q >> 4) & 0xFF)
    SBOX[p] = s ^ 0x63
SBOX[0] = 0x63
for i, s in enumerate(SBOX): INV[s] = i

def expand(key):                                       # AES-128 key schedule
    w, rcon = [list(key[i:i + 4]) for i in range(0, 16, 4)], 1
    while len(w) < 44:
        t = w[-1][:]
        if len(w) % 4 == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]; t[0] ^= rcon; rcon = xtime(rcon)
        w.append([a ^ b for a, b in zip(w[-4], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(11)]

def mix(col, inverse=False):
    if inverse:                                        # InvMixColumns = MixColumns after a pre-step
        u, v = xtime(xtime(col[0] ^ col[2])), xtime(xtime(col[1] ^ col[3]))
        col = [col[0] ^ u, col[1] ^ v, col[2] ^ u, col[3] ^ v]
    t = col[0] ^ col[1] ^ col[2] ^ col[3]
    return [col[i] ^ t ^ xtime(col[i] ^ col[(i + 1) % 4]) for i in range(4)]

def aes(rk, block, decrypt=False):
    s = [a ^ b for a, b in zip(block, rk[10 if decrypt else 0])]
    for r in (range(9, -1, -1) if decrypt else range(1, 11)):
        if decrypt:
            s = [s[(i + 12 * (i % 4)) % 16] for i in range(16)]     # InvShiftRows
            s = [INV[b] for b in s]
            s = [a ^ b for a, b in zip(s, rk[r])]
            if r: s = sum((mix(s[c:c + 4], True) for c in range(0, 16, 4)), [])
        else:
            s = [SBOX[b] for b in s]
            s = [s[(i + 4 * (i % 4)) % 16] for i in range(16)]      # ShiftRows
            if r < 10: s = sum((mix(s[c:c + 4]) for c in range(0, 16, 4)), [])
            s = [a ^ b for a, b in zip(s, rk[r])]
    return bytes(s)

xor = lambda a, b: bytes(x ^ y for x, y in zip(a, b))

def cbc_cs3_encrypt(key, data, iv=bytes(16)):          # CBC, last two blocks swapped
    rk, blocks, prev = expand(key), [], iv
    padded = data + bytes(-len(data) % 16)
    for i in range(0, len(padded), 16):
        prev = aes(rk, xor(padded[i:i + 16], prev)); blocks.append(prev)
    if len(blocks) > 1:
        blocks[-2], blocks[-1] = blocks[-1], blocks[-2][:len(data) - 16 * (len(blocks) - 1)]
    return b"".join(blocks)

def cbc_cs3_decrypt(key, ct, iv=bytes(16)):
    rk, n = expand(key), (len(ct) + 15) // 16
    blocks = [ct[i:i + 16] for i in range(0, len(ct), 16)]
    if n > 1:                                          # undo the stealing first
        last_len = len(blocks[-1])
        d = aes(rk, blocks[-2], True)
        full_last = blocks[-1] + d[last_len:]
        tail = xor(d[:last_len], blocks[-1])
        blocks[-2], blocks[-1] = full_last, None
        prev, out = iv, []
        for blk in blocks[:-1]:
            out.append(xor(aes(rk, blk, True), prev)); prev = blk
        return b"".join(out) + tail
    return xor(aes(rk, ct, True), iv)

def krb_encrypt(keys, confounder, plaintext):
    c = cbc_cs3_encrypt(keys["Ke"], confounder + plaintext)
    return c + hmac.new(keys["Ki"], bytes(16) + c, "sha256").digest()[:16]

def krb_decrypt(keys, blob):
    c, tag = blob[:-16], blob[-16:]
    if not hmac.compare_digest(tag, hmac.new(keys["Ki"], bytes(16) + c, "sha256").digest()[:16]):
        return None                                    # checked before decrypting
    return cbc_cs3_decrypt(keys["Ke"], c)[16:]

rfc = [("", "7e5895eaf2672435bad817f545a37148",
        "ef85fb890bb8472f4dab20394dca781dad877eda39d50c870c0d5a0a8e48c718"),
       ("000102030405", "7bca285e2fd4130fb55b1a5c83bc5b24",
        "84d7f30754ed987bab0bf3506beb09cfb55402cef7e6877ce99e247e52d16ed4421dfdf8976c"),
       ("000102030405060708090a0b0c0d0e0f1011121314", "a7a4e29a4728ce10664fb64e49ad3fac",
        "720f73b18d9859cd6ccb4346115cd336c70f58edc0c4437c5573544c31c813bce1e6d072c1"
        "86b39a413c2f92ca9b8334a287ffcbfc")]
for pt, conf, want in rfc:
    got = krb_encrypt(keys, bytes.fromhex(conf), bytes.fromhex(pt))
    back = krb_decrypt(keys, got)
    print(f"{len(bytes.fromhex(pt)):>2}-byte plaintext: matches RFC 8009: {got.hex() == want}"
          f"  decrypts back: {back == bytes.fromhex(pt)}")
bad = bytearray(got); bad[3] ^= 1
print("one flipped bit:", krb_decrypt(keys, bytes(bad)))
```

```text
 0-byte plaintext: matches RFC 8009: True  decrypts back: True
 6-byte plaintext: matches RFC 8009: True  decrypts back: True
21-byte plaintext: matches RFC 8009: True  decrypts back: True
one flipped bit: None
```

All three match the RFC byte for byte, including the 6-byte case where the
16-byte confounder plus six bytes make 22, so the second block is stolen down
to six bytes and the ciphertext body is 22 bytes long. The last line flips one
bit of the ciphertext: the HMAC check fails and nothing is decrypted.

## 12.5 Code it: a whole login

*Level: intermediate.*

With keys and encryption in place, a Kerberos login is mostly bookkeeping. The
program below builds a realm `ARCADIA.MARS` with three principals: Alice, whose
key comes from her password; `krbtgt`, whose key is random; and the library's
web service, whose key is also random and sits in the library's keytab. It runs
the three exchanges with the real key usage numbers, then tests the service's
checks: a replayed authenticator and one presented after the ticket has
expired. Messages are JSON rather than the ASN.1 that real Kerberos uses; the
encryption is the RFC 8009 code above.

```python
# A whole Kerberos login: AS, TGS and AP exchanges with the real key usages of
# RFC 4120 section 7.5.1. Messages are JSON instead of ASN.1. Continue from above.
import json, os
E = "aes128-cts-hmac-sha256-128"
def seal(key, usage, obj):
    return krb_encrypt(usage_keys(key, usage, E), os.urandom(16), json.dumps(obj).encode()).hex()
def unseal(key, usage, blob):
    pt = krb_decrypt(usage_keys(key, usage, E), bytes.fromhex(blob))
    return None if pt is None else json.loads(pt)

REALM = "ARCADIA.MARS"
kdc_db = {"alice@" + REALM: string_to_key(b"Olympus-Mons-21", (REALM + "alice").encode(), E),
          "krbtgt/" + REALM: os.urandom(16),          # random: no password behind it
          "HTTP/library.arcadia.mars": os.urandom(16)}
service_keytab = kdc_db["HTTP/library.arcadia.mars"]
now, SKEW, LIFE = 1_794_200_400, 300, 10 * 3600

# 1. AS exchange: pre-authentication proves the password, the KDC returns a TGT.
alice_key = string_to_key(b"Olympus-Mons-21", (REALM + "alice").encode(), E)
as_req = {"cname": "alice", "padata": seal(alice_key, 1, {"patimestamp": now})}
ts = unseal(kdc_db["alice@" + REALM], 1, as_req["padata"])
assert ts and abs(ts["patimestamp"] - now) <= SKEW
tgs_session = os.urandom(16).hex()
tgt = seal(kdc_db["krbtgt/" + REALM], 2, {"cname": "alice", "key": tgs_session, "end": now + LIFE})
as_rep = {"ticket": tgt, "enc_part": seal(kdc_db["alice@" + REALM], 3, {"key": tgs_session, "end": now + LIFE})}
alice_tgs_key = bytes.fromhex(unseal(alice_key, 3, as_rep["enc_part"])["key"])
print("AS:  alice holds a TGT,", len(bytes.fromhex(tgt)), "bytes she cannot read")

# 2. TGS exchange: the TGT plus a fresh authenticator buys a service ticket.
tgs_req = {"ticket": tgt, "sname": "HTTP/library.arcadia.mars",
           "authenticator": seal(alice_tgs_key, 7, {"cname": "alice", "ctime": now + 60})}
t = unseal(kdc_db["krbtgt/" + REALM], 2, tgs_req["ticket"])
a = unseal(bytes.fromhex(t["key"]), 7, tgs_req["authenticator"])
assert a["cname"] == t["cname"] and abs(a["ctime"] - (now + 60)) <= SKEW
svc_session = os.urandom(16).hex()
st = seal(kdc_db[tgs_req["sname"]], 2, {"cname": t["cname"], "key": svc_session, "end": t["end"]})
tgs_rep = {"ticket": st, "enc_part": seal(bytes.fromhex(t["key"]), 8, {"key": svc_session})}
alice_svc_key = bytes.fromhex(unseal(alice_tgs_key, 8, tgs_rep["enc_part"])["key"])
print("TGS: alice holds a ticket for the library; the KDC never saw her password again")

# 3. AP exchange: the service opens the ticket with its own key; no call to the KDC.
replay_cache = set()
def ap_accept(ap_req, at):
    tk = unseal(service_keytab, 2, ap_req["ticket"])
    if tk is None: return "refused: not our ticket"
    au = unseal(bytes.fromhex(tk["key"]), 11, ap_req["authenticator"])
    if au is None or au["cname"] != tk["cname"]: return "refused: bad authenticator"
    if abs(au["ctime"] - at) > SKEW or at > tk["end"]: return "refused: clock or expiry"
    if (au["cname"], au["ctime"]) in replay_cache: return "refused: replay"
    replay_cache.add((au["cname"], au["ctime"]))
    return "welcome, " + tk["cname"]
ap_req = {"ticket": st, "authenticator": seal(alice_svc_key, 11, {"cname": "alice", "ctime": now + 90})}
print("AP:", ap_accept(ap_req, now + 91))
print("AP replayed:", ap_accept(ap_req, now + 95))
print("AP next day:", ap_accept({"ticket": st, "authenticator": seal(alice_svc_key, 11,
      {"cname": "alice", "ctime": now + LIFE + 60})}, now + LIFE + 60))

# A golden ticket: whoever has the krbtgt key can mint a TGT for any name.
golden_session = os.urandom(16)
golden = seal(kdc_db["krbtgt/" + REALM], 2, {"cname": "administrator", "key": golden_session.hex(),
                                              "end": now + 10 * 365 * 86400})
t = unseal(kdc_db["krbtgt/" + REALM], 2, golden)
print("KDC opens a forged TGT for:", t["cname"], " valid for", (t["end"] - now) // 86400, "days")
```

```text
AS:  alice holds a TGT, 112 bytes she cannot read
TGS: alice holds a ticket for the library; the KDC never saw her password again
AP: welcome, alice
AP replayed: refused: replay
AP next day: refused: clock or expiry
KDC opens a forged TGT for: administrator  valid for 3650 days
```

A few details deserve a closer look.

**The KDC is stateless.** Between the AS and TGS exchanges the KDC remembers
nothing. The TGT carries Alice's name, $S_1$ and the end time back to it,
encrypted under a key only it has. This is why one KDC can serve a hundred
thousand users, and why several KDCs for one realm need to share only their
database, not session state.

**The service is offline from the KDC.** The library never contacts the KDC.
It trusts whatever a valid ticket says, until the end time inside the ticket.
That makes the system fast and resilient, and it makes revocation impossible:
if Alice's account is disabled at 10:00, a ticket issued at 9:00 keeps working
at the library until it expires. Active Directory issues tickets for 10 hours,
renewable for up to 7 days, by default.

**Freshness by timestamp and memory.** The authenticator carries the client's
time. The service accepts it only within a window around its own clock (five
minutes by default) and remembers each authenticator it has accepted within
that window, in a **replay cache**, so that a copy captured off the wire is
refused. Both halves are needed. Without the window, the cache would grow
forever; without the cache, a replay within the window would work. This is the
Denning-Sacco fix from Chapter 1, and it puts a dependency on clocks into the
heart of the protocol: when a domain's clocks drift apart by more than five
minutes, logins fail with the well-known error `KRB_AP_ERR_SKEW`. Windows
domains run their own time service for this reason.

**Authorization travels in the ticket.** Kerberos says who you are, not what you
may do. Active Directory adds a **Privilege Attribute Certificate (PAC)** to
every ticket: the user's security identifier and group memberships, signed by
the KDC. A file server reads the groups from the PAC and checks them against
its access lists, again without asking anyone.

**The last two lines are a golden ticket.** Whoever holds the `krbtgt` key can
write a TGT saying anything: any name, any group in the PAC, any end time. The
KDC opens it, finds it well formed, and believes it, because the only proof a
TGT carries is that it was encrypted under the `krbtgt` key. §12.8 comes back
to this.

## 12.6 Kerberos in Active Directory

*Level: intermediate.*

Most of the world's Kerberos runs inside Windows domains, and a few features
specific to Active Directory explain most of its attacks.

**Every domain controller is a KDC.** Its database is the directory: every user
and every computer account has long-term keys in it, and the domain's `krbtgt`
account holds the key that encrypts all TGTs. Computer accounts have long
random passwords that the machine changes itself, every 30 days by default.
User accounts have whatever their users chose.

**Services are found by name.** A service is identified by a **service
principal name (SPN)**, such as `MSSQLSvc/db1.arcadia.mars:1433` or
`HTTP/intranet.arcadia.mars`, registered on the account the service runs as.
When the service runs as the machine's own account, its key is long and
random. When an administrator set up a database to run under an ordinary user
account called `svc-sql`, with a password typed by a person, the service's key
comes from that password. Any domain user can ask the KDC for a ticket to any
SPN; that is how Kerberos is supposed to work, since the KDC does not decide
access, the service does.

**Kerberos replaced NTLM, but NTLM never left.** NTLM is Microsoft's older
challenge-response protocol, based on the NT hash. Windows falls back to it when
Kerberos is not possible, for example when a server is reached by IP address
rather than by name. NTLM has the weaknesses of §11.6 and more (relay attacks
in particular). Microsoft announced in 2023 that it plans to disable NTLM by
default in future Windows versions, with new Kerberos features (IAKerb and a
local KDC on each machine) to cover the cases that still need it.

!!! note "Life story: RC4-HMAC in Kerberos"
    **Born:** 2000, with Windows 2000; documented as RFC 4757 in 2006 ·
    **Purpose:** let Windows accounts move from NTLM to Kerberos without
    changing their stored keys, by using the NT hash as the Kerberos key ·
    **Helped:** the switch to Kerberos across Windows networks ·
    **Weaknesses:** unsalted MD4 keys, RC4 itself (book 1, Chapter 5), and
    tickets that cost one MD4 per guess to attack · **Status:** marked
    Historic and "not to be used" by RFC 8429 (2018); AES has been available
    since Windows Server 2008, and November 2022 updates made AES the default
    for accounts with no stated preference. Microsoft's updates for
    CVE-2026-20833 have domain controllers assume AES only from April 2026,
    with no way back from July 2026 (as summarized from Microsoft's notices;
    the bulletins themselves could not be checked here). MIT Kerberos stopped
    issuing RC4 and triple-DES session keys by default in version 1.21 (2023).

## 12.7 Getting the password off the wire

*Level: intermediate.*

Three extensions attack the weakness at the root of the table in §12.2, that
everything starts from a password-derived key.

**PKINIT** (RFC 4556, 2006) replaces the password in the AS exchange with a
key pair and a certificate. The client signs its request; the KDC checks the
certificate and the signature, then runs a Diffie-Hellman exchange with the
client and encrypts the reply under the key it produces. Smart-card logon to
Windows is PKINIT, and so is Windows Hello for Business, where the key sits in
the computer's TPM chip. Because the reply key comes from Diffie-Hellman, a
recording of a PKINIT login cannot be attacked offline. RFC 8636 (2019) added
the ability to name hash functions other than SHA-1; an IETF draft from 2026
adds ML-KEM so that the key exchange survives quantum computers (see the
Post-quantum book).

PKINIT moves the trust to the certificates. In 2021 Will Schroeder and Lee
Christensen published "Certified Pre-Owned", a study of Active Directory
Certificate Services, Microsoft's certificate authority: misconfigured
certificate templates let ordinary users request certificates in another
user's name, and through PKINIT those certificates became TGTs for that user,
including domain administrators. The lesson from Chapter 2 holds here too: a
certificate authority is part of the login system.

**FAST** (Flexible Authentication Secure Tunneling, RFC 6113, 2011), which
Windows calls **Kerberos armoring**, wraps the AS exchange in a tunnel
protected by a key the client's machine already has, typically from its own
computer account's TGT. An eavesdropper sees only tunnel traffic, not the
encrypted timestamp, so it has nothing to guess against.

**SPAKE pre-authentication** (RFC 9588) uses a password-authenticated key
exchange of the kind met in Chapter 11 inside FAST, so that even the KDC side
of the exchange gives an active attacker only one guess per try. MIT Kerberos
has supported it since version 1.17.

## 12.8 Attacks: which key buys what

*Level: intermediate.*

Kerberos attacks in Windows domains have names, tools and a decade of incident
reports behind them. Each is a statement about one key from the table in §12.2.
None breaks AES or HMAC; they use keys that were stolen, derived from weak
passwords, or trusted more widely than anyone intended.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Map of Kerberos attacks by the key they need: a stolen ticket and session key gives pass-the-ticket; the user's key gives overpass-the-hash; a weak user password gives AS-REP roasting; a weak service password gives Kerberoasting; the service key gives a silver ticket; the krbtgt key gives a golden ticket" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">what the attacker has</text>
<text x="360" y="24" font-weight="bold">what it buys</text>
<rect x="20" y="38" width="290" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="34" y="63">a ticket and its session key (memory)</text>
<rect x="360" y="38" width="260" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="374" y="63">pass-the-ticket: be the user until expiry</text>
<rect x="20" y="88" width="290" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="34" y="113">the user's long-term key (NT hash, AES)</text>
<rect x="360" y="88" width="260" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="374" y="113">overpass-the-hash: fresh TGTs at will</text>
<rect x="20" y="138" width="290" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="34" y="163">any name with pre-authentication off</text>
<rect x="360" y="138" width="260" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="374" y="163">AS-REP roasting: guess that password</text>
<rect x="20" y="188" width="290" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="34" y="213">any domain account at all</text>
<rect x="360" y="188" width="260" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="374" y="213">Kerberoasting: guess service passwords</text>
<rect x="20" y="238" width="290" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="34" y="263">a service's key</text>
<rect x="360" y="238" width="260" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="374" y="263">silver ticket: anyone, to that service</text>
<rect x="20" y="288" width="290" height="40" rx="6" class="acc-fill" fill-opacity="0.3" stroke="currentColor"/>
<text x="34" y="313" font-weight="bold">the krbtgt key</text>
<rect x="360" y="288" width="260" height="40" rx="6" class="acc-fill" fill-opacity="0.3" stroke="currentColor"/>
<text x="374" y="313" font-weight="bold">golden ticket: anyone, anywhere</text>
<g stroke="currentColor" stroke-width="1.3">
<line x1="310" y1="58" x2="356" y2="58"/><line x1="310" y1="108" x2="356" y2="108"/>
<line x1="310" y1="158" x2="356" y2="158"/><line x1="310" y1="208" x2="356" y2="208"/>
<line x1="310" y1="258" x2="356" y2="258"/><line x1="310" y1="308" x2="356" y2="308"/>
</g>
</svg>
<figcaption>Figure 12.2. Kerberos attacks sorted by the key they need. Lower rows need more and give more; the bottom row is the whole domain.</figcaption>
</figure>

**Pass-the-ticket.** Tickets and their session keys sit in the memory of the
machine where the user logged in. An attacker with administrator rights on that
machine copies them out (the tool mimikatz, by Benjamin Delpy, made this a
one-line command in the 2010s) and loads them into a credential cache on
another machine. Until the tickets expire, the attacker is the user.

**Overpass-the-hash** (or pass-the-key). With the user's long-term key, from
memory or from a stolen domain database, the attacker does not need the
password: it can encrypt the pre-authentication timestamp itself and ask for
fresh TGTs. For RC4 accounts the key is the NT hash, which is why one stolen
NT hash was enough to log in as its owner anywhere in a domain.

**AS-REP roasting.** Active Directory lets an administrator switch off
pre-authentication for an account ("Do not require Kerberos
preauthentication"), usually for old software. Anyone can then ask the AS for
that account's AS-REP and take its encrypted part home to guess the password
offline. Will Schroeder's 2017 post "Roasting AS-REPs" made the attack
widely known.

**Kerberoasting.** Any domain user can ask for a service ticket to any SPN, and
the ticket is encrypted under the service account's key. If that account has a
human password, the ticket is a password hash ready to crack. Tim Medin
presented the attack at DerbyCon in 2014, and it remains one of the first
things a penetration tester tries in a Windows domain, because it needs no
privileges and makes no noise beyond a normal ticket request. The program
plays it out against RC4-HMAC tickets, encrypted exactly as RFC 4757 says, and
then against an AES ticket.

```python
# Kerberoasting: any user may ask for a ticket to any service, and the ticket is
# encrypted under the service account's key. If that key comes from a weak
# password, the ticket can be cracked offline. RC4-HMAC as in RFC 4757 section 4.
# Continue from above.
def rc4(key, data):
    S, j, out = list(range(256)), 0, bytearray()
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256; S[i], S[j] = S[j], S[i]
    i = j = 0
    for byte in data:
        i = (i + 1) % 256; j = (j + S[i]) % 256; S[i], S[j] = S[j], S[i]
        out.append(byte ^ S[(S[i] + S[j]) % 256])
    return bytes(out)

def rc4_hmac_encrypt(K, usage, confounder, data):
    K1 = hmac.new(K, struct.pack("<I", usage), "md5").digest()
    checksum = hmac.new(K1, confounder + data, "md5").digest()
    K3 = hmac.new(K1, checksum, "md5").digest()
    return checksum + rc4(K3, confounder + data)

def rc4_hmac_decrypt(K, usage, blob):
    K1 = hmac.new(K, struct.pack("<I", usage), "md5").digest()
    checksum, body = blob[:16], rc4(hmac.new(K1, blob[:16], "md5").digest(), blob[16:])
    return body[8:] if hmac.compare_digest(checksum, hmac.new(K1, body, "md5").digest()) else None

# The KDC issues alice a ticket for MSSQLSvc, whose account has a human password.
svc_password = "Summer2026!"
ticket_body = b'{"cname": "alice", "key": "' + os.urandom(16).hex().encode() + b'"}'
ticket = rc4_hmac_encrypt(nt_hash(svc_password), 2, os.urandom(8), ticket_body)
print("alice asked for MSSQLSvc/db1 and got", len(ticket), "bytes of ticket")

# Offline, at her own pace, she tries a word list against it.
words = ["Password1", "Welcome2026", "Spring2026!", "Summer2025!", "Summer2026!", "Autumn2026!"]
for n, guess in enumerate(words, 1):
    if rc4_hmac_decrypt(nt_hash(guess), 2, ticket) is not None:
        print(f"cracked after {n} guesses: {guess}")
        break

# The same attack against an AES ticket (RFC 8009) works too; it is only slower.
aes_key = string_to_key(svc_password.encode(), (REALM + "svc-sql").encode(), E)
aes_ticket = krb_encrypt(usage_keys(aes_key, 2, E), os.urandom(16), ticket_body)
for guess in words:
    k = string_to_key(guess.encode(), (REALM + "svc-sql").encode(), E)
    if krb_decrypt(usage_keys(k, 2, E), aes_ticket) is not None:
        print("AES ticket cracked too:", guess)
print("work per guess: RC4-HMAC 1 MD4;  AES-SHA1 4,096 PBKDF2 rounds;  AES-SHA2 32,768")
```

```text
alice asked for MSSQLSvc/db1 and got 85 bytes of ticket
cracked after 5 guesses: Summer2026!
AES ticket cracked too: Summer2026!
work per guess: RC4-HMAC 1 MD4;  AES-SHA1 4,096 PBKDF2 rounds;  AES-SHA2 32,768
```

The AES ticket falls to the same word list: AES only makes each guess slower,
4,096 or 32,768 rounds of PBKDF2 instead of a single MD4, a factor of several
thousand in guesses per second on the same graphics card. That buys a great deal against a mediocre password and
nothing against `Summer2026!`, which is near the top of every cracking word
list.

**Silver ticket.** With a service's key, the attacker writes its own service
tickets, for any user and any groups, without touching the KDC at all. The
service opens them with its keytab and believes them. Because no KDC is
involved, the domain controller's logs show nothing. Silver tickets are often
the next step after Kerberoasting: the cracked password gives the service key.

**Golden ticket.** With the `krbtgt` key, usually taken from a domain controller
with mimikatz's `DCSync` function, which asks a domain controller to replicate
account keys just as another domain controller would, the attacker writes TGTs
for any name with any PAC. Benjamin Delpy and Skip Duckwall presented golden
tickets at Black Hat USA in 2014. A golden ticket is the reason incident
responders reset the `krbtgt` password, twice, after a domain compromise: the
KDC keeps the previous key as well as the current one, so that tickets in
flight keep working, and only the second change removes the stolen key.

!!! note "Life story: MS14-068"
    **Born:** fixed 18 November 2014, an out-of-band Windows update for
    CVE-2014-6324 · **The flaw:** domain controllers accepted a PAC whose
    signature was not keyed at all, just an MD5 checksum that anyone could
    compute. Any domain user could ask for a ticket carrying a self-made PAC
    that listed the Domain Admins group, and the domain controller would sign
    it into a real service ticket · **Lesson:** the PAC's signature is the only
    thing between an ordinary user and the domain; a checksum is not a MAC
    (book 1, Chapter 10) · **Status:** fixed; Microsoft has since added more
    PAC and ticket signatures (updates from 2020 to 2023) so that more of the ticket is
    covered

### Fix it

The defenses follow the same table:

- **Long random keys for services.** Group managed service accounts let
  Windows choose and rotate a 240-byte password for a service account, which
  makes Kerberoasting hopeless. Where a human password must stay, it should be
  long and random, not a season and a year.
- **AES only.** Remove RC4 from `msDS-SupportedEncryptionTypes`, then from the
  domain. The 2026 updates do this for most domains.
- **Pre-authentication on every account,** and FAST armoring where the clients
  support it.
- **Protect the machines that hold keys.** Pass-the-ticket and golden tickets
  start with administrator rights on a workstation or a domain controller.
  Windows' Credential Guard keeps long-term keys in an isolated part of memory.
- **Reset `krbtgt` twice** after any suspected domain compromise, with enough
  time between the two changes for tickets to expire.
- **Watch for the shapes of the attacks:** a single account asking for tickets
  to many SPNs, or RC4 tickets in a domain that should have none.

## 12.9 Mars: a city's single sign-on

*Level: intermediate.*

Arcadia City runs one directory for its residents: a login at a library
terminal, the clinic's records, the greenhouse controls and the airlock logs
all use Kerberos in the realm `ARCADIA.MARS`. The interesting question is what
happens between Mars and Earth.

**Each planet needs its own KDC.** A login on Mars that had to reach a KDC on
Earth would wait 6 to 44 minutes for its first ticket, light time there and
back. Kerberos already has the answer, **cross-realm trust**: the KDCs of
`ARCADIA.MARS` and `EARTH.ORG` share an inter-realm key, stored as a principal
named `krbtgt/EARTH.ORG@ARCADIA.MARS`. A resident's Mars TGS issues a
**referral TGT** encrypted under that key, and the Earth KDC accepts it as
proof that Mars vouches for the resident (Figure 12.3). Every Earth service
ticket still needs one exchange with the Earth KDC, so the realms keep each
other's ticket requests to a minimum by giving out long-lived tickets for the
few Earth services residents use.

**The authenticator check confuses delay with skew.** A service checks that
the authenticator's time is within five minutes of its own clock. On one planet
that measures clock skew, because messages arrive in milliseconds. Between
planets it measures skew plus light time. An AP-REQ written on Mars at 12:00
and read on Earth at 12:14 is refused, however well both clocks agree. The
Mars-Earth link has to either widen the window to the largest light time
(about 22 minutes one way), which makes the replay cache hold far more entries
and gives a stolen authenticator a longer life, or replace the timestamp with
a challenge from the service, which costs a full round trip of up to 44
minutes. The city chose the first for delay-tolerant services such as mail
relays, with authenticators that also carry a sequence number, and keeps
interactive logins on each planet's own services.

**Revocation is slower than ever.** A Mars ticket for an Earth service, once
issued, works until it expires. If the resident's account is suspended on
Mars, Earth hears about it at least one light time later and has no way to
call the ticket back. Short lifetimes are the only lever, and every renewal
costs a round trip.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Cross-realm Kerberos between Mars and Earth: a resident gets a referral TGT from the Mars KDC under the inter-realm key, sends it across the 3 to 22 minute link to the Earth KDC, and receives a ticket for an Earth service" fill="currentColor" font-size="13">
<rect x="20" y="20" width="270" height="250" rx="8" class="soft" stroke="currentColor"/>
<text x="155" y="44" text-anchor="middle" font-weight="bold">ARCADIA.MARS</text>
<rect x="350" y="20" width="270" height="250" rx="8" class="soft" stroke="currentColor"/>
<text x="485" y="44" text-anchor="middle" font-weight="bold">EARTH.ORG</text>
<rect x="40" y="70" width="100" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="90" y="95" text-anchor="middle">resident</text>
<rect x="170" y="70" width="100" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="220" y="95" text-anchor="middle">Mars KDC</text>
<rect x="370" y="70" width="100" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="420" y="95" text-anchor="middle">Earth KDC</text>
<rect x="500" y="70" width="100" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="550" y="95" text-anchor="middle">archive</text>
<line x1="140" y1="122" x2="220" y2="122" stroke="currentColor"/><line x1="220" y1="112" x2="220" y2="140" stroke="currentColor"/>
<text x="155" y="160" text-anchor="middle" font-size="12">1 referral TGT, under the</text>
<text x="155" y="176" text-anchor="middle" font-size="12">shared inter-realm key</text>
<line x1="90" y1="112" x2="90" y2="200" stroke="currentColor"/>
<line x1="90" y1="200" x2="416" y2="200" stroke="currentColor" stroke-width="1.5" class="acc"/><polygon points="420,200 408,195 408,205" class="acc-fill"/>
<line x1="420" y1="200" x2="420" y2="112" stroke="currentColor" class="acc"/>
<text x="320" y="192" text-anchor="middle" font-size="12" class="acc-fill">2 TGS-REQ: 3 to 22 minutes</text>
<text x="485" y="160" text-anchor="middle" font-size="12">3 ticket for the archive,</text>
<text x="485" y="176" text-anchor="middle" font-size="12">under the archive's key</text>
<text x="155" y="240" text-anchor="middle" font-size="12">clocks agree, but light time</text>
<text x="155" y="256" text-anchor="middle" font-size="12">counts against the 5-minute window</text>
<text x="485" y="240" text-anchor="middle" font-size="12">no way to recall a ticket</text>
<text x="485" y="256" text-anchor="middle" font-size="12">before its end time</text>
</svg>
<figcaption>Figure 12.3. Cross-realm Kerberos between Mars and Earth. Each planet runs its own KDC; one shared key links the realms.</figcaption>
</figure>

## 12.10 In the real world

*Level: intermediate.*

On any machine with MIT Kerberos or Heimdal installed, and a realm to talk to,
these commands show everything in this chapter:

```
kinit alice                            # AS exchange: get a TGT
KRB5_TRACE=/dev/stderr kinit alice     # also shows salt, enctype, pre-auth steps
klist -e                               # tickets with session-key and ticket enctypes
kvno HTTP/www.example.org              # TGS exchange: get one service ticket
klist -kKe alice.keytab                # keys in a keytab, as hex (keep it secret)
kadmin.local -q 'getprinc alice'       # which enctypes the KDC holds for alice
```

A test realm needs only `kdb5_util create`, `kadmin.local` and `krb5kdc`,
pointed at your own files by the `KRB5_CONFIG` and `KRB5_KDC_PROFILE`
variables. On Windows, `klist` lists the current user's tickets with their
enctypes, and `klist purge` throws them away.

A short tour of where Kerberos runs:

- **Windows domains.** Every login to a domain-joined machine, every file
  share (SMB), every LDAP query to a domain controller. Entra ID, Microsoft's
  cloud directory, can also issue Kerberos tickets for on-premises resources
  to cloud-joined machines.
- **Universities and laboratories.** MIT, CERN and many national laboratories
  run MIT Kerberos realms, often with one-time codes or smart cards for the
  AS exchange.
- **Big-data clusters.** Hadoop's "secure mode" is Kerberos: every node and
  every service has a keytab.
- **Inside other protocols.** The GSS-API (RFC 2743, with RFC 4121 for
  Kerberos) carries Kerberos tickets inside HTTP (the `Negotiate` header), SSH,
  LDAP, SMB, NFS and email protocols, so that one login reaches them all.

What to check in a Kerberos deployment:

- `klist -e` shows `aes256-cts-hmac-sha1-96` or the SHA-2 enctypes, never
  `rc4-hmac` or `arcfour-hmac`.
- No account has pre-authentication disabled.
- Service accounts with SPNs have long random passwords or are managed
  service accounts.
- Clocks are synchronized, and the KDCs are the best-protected machines in
  the building.

## 12.11 Going deeper

*Level: expert.*

**Formal analysis.** Kerberos is one of the most analyzed protocols in the
literature. Giampaolo Bella and Lawrence Paulson verified Kerberos IV in the
Isabelle theorem prover in the late 1990s, including the guarantees that
depend on timestamps and session-key lifetimes. Frederick Butler, Iliano
Cervesato, Aaron Jaggard and Andre Scedrov analyzed Kerberos 5 in the 2000s
and, with Joe-Kai Tsay and Christopher Walstad, found a man-in-the-middle
attack on PKINIT as specified at the time (2006): the KDC's reply was not
bound to the client's request, so an attacker could make a client accept a
session key the attacker knew. The fix, which bound the reply to a checksum
of the request, went into the specification before it became RFC 4556.

**Kerberos 4's keys.** In 1997 Bryn Dole, Steven Lodin and Eugene Spafford
showed that Kerberos 4's session keys came from a random number generator
seeded with too little entropy, so they could be found by search. The protocol
was sound; its keys were not. The Cryptanalysis book tells this and other
random-number failures.

**Delegation.** A web front end often has to reach a database on the user's
behalf. Kerberos offers three ways, each a lesson in how much trust to hand
out. **Unconstrained delegation** sends the user's own TGT to the front end,
which can then act as the user anywhere. **Constrained delegation**, built on
Microsoft's S4U2Self and S4U2Proxy extensions, lets the KDC issue tickets to a
named list of services only. **Resource-based constrained delegation** puts the
list on the target service instead. Each has had its attacks: unconstrained
delegation hands any administrator of the front end every visitor's TGT, and
the "Bronze Bit" flaw (CVE-2020-17049, Jake Karnes, 2020) let a service flip
the "forwardable" flag in a ticket it could open with its own key, because
that flag was not covered by any signature the KDC checked. The fix added yet
another PAC signature, a pattern visible across this chapter: whatever field a
signature or MAC leaves out sooner or later becomes the attack.

**Forward secrecy.** Core Kerberos has none, as §12.2 showed. PKINIT gives it
for the AS exchange only; the tickets themselves are still encrypted under
long-term keys. RFC 4121's GSS-API layer lets client and server add a subkey of
their own to the AP exchange, but both choose it and send it under the
session key, so it adds no forward secrecy either. Protocols that need it run
TLS inside, with Kerberos only for authentication.

**What a post-quantum Kerberos would need.** Symmetric Kerberos is already
largely safe from quantum computers: AES-256 and HMAC-SHA-384 keep a wide
margin against Grover's algorithm (Post-quantum book). The exposed parts are
PKINIT, whose Diffie-Hellman and signatures fall to Shor's algorithm, and the
certificate authorities behind it. The 2026 draft adds ML-KEM to the PKINIT key
exchange and allows ML-DSA signatures, the same hybrid pattern as TLS in
Chapter 3.

## Check yourself

??? question "1. What problem does a trusted third party solve that a password sent to every server does not?"
    Each user and service shares a key only with the KDC; the KDC creates a
    fresh session key for each pair and gives it to both, so services never see
    passwords and nothing needs to be shared in advance between client and
    service.

??? question "2. Why can Alice not read her own TGT, and why does it not matter?"
    It is encrypted under the `krbtgt` key, which only the KDC has. She
    doesn't need to read it: she gets the session key $S_1$ separately, under
    her own key, and the TGT only has to be shown back to the KDC.

??? question "3. What does pre-authentication prevent, and what does it not prevent?"
    It stops anyone from asking the AS for a reply encrypted under any user's
    key without proving knowledge of that key first. It does not stop an
    eavesdropper from guessing the password offline from a captured encrypted
    timestamp.

??? question "4. Why does Kerberos derive separate keys for each key usage number?"
    So that a value encrypted for one purpose (for example a pre-authentication
    timestamp) cannot be accepted as another (an authenticator). It separates
    domains inside one long-term key.

??? question "5. Why does a Kerberos service need both a time window and a replay cache?"
    The window bounds how long an authenticator can be replayed and so how
    much the cache must remember; the cache refuses copies within the window.
    Either alone fails.

??? question "6. Why does Kerberos have no forward secrecy?"
    Session keys are chosen by the KDC and sent encrypted under long-term keys.
    Anyone who later learns the service's key can open recorded tickets,
    recover the session keys and decrypt the old traffic.

??? question "7. What is Kerberoasting, and why does AES not stop it?"
    Any user can request a service ticket encrypted under a service account's
    key; if that key comes from a weak password, the ticket can be cracked
    offline. AES only makes each guess slower; a guessable password is still
    guessed.

??? question "8. Compare a golden ticket and a silver ticket."
    A golden ticket is a TGT forged with the `krbtgt` key: it gets tickets for
    any service as anyone. A silver ticket is a service ticket forged with one
    service's key: it works only at that service, but never touches the KDC,
    so it leaves no trace there.

??? question "9. Why must the krbtgt password be reset twice after a compromise?"
    The KDC accepts tickets under both the current and the previous `krbtgt`
    key. After one reset, the stolen key is the "previous" one and still works;
    the second reset removes it.

??? question "10. Why does a five-minute authenticator window fail between Earth and Mars, even with perfect clocks?"
    The service compares the authenticator's time with its own clock on
    arrival, so light time (3 to 22 minutes) counts as if it were skew. The
    window must be widened, at the cost of a larger replay cache and longer
    replay exposure, or replaced by a challenge costing a round trip.

## What you learned

- Kerberos is a trusted third party built from symmetric keys: the KDC shares a
  long-term key with every user and service and hands out session keys inside
  tickets.
- A login is three exchanges: AS (password once, TGT), TGS (a ticket per
  service) and AP (ticket plus a fresh authenticator to the service).
- Passwords become keys with PBKDF2 and an SP 800-108 KDF (RFC 8009); RC4-HMAC
  used the unsalted NT hash. Each key usage gets its own derived keys.
- RFC 8009 encrypts with a confounder, AES-CBC with ciphertext stealing, and
  HMAC over the ciphertext; you matched its test vectors.
- Freshness comes from timestamps, a time window and a replay cache. The
  service never contacts the KDC, so tickets cannot be revoked before they
  expire.
- There is no forward secrecy, and offline guessing is possible against
  anything under a password-derived key. PKINIT, FAST and SPAKE address this.
- Attacks follow the keys: pass-the-ticket, overpass-the-hash, AS-REP
  roasting, Kerberoasting, silver and golden tickets. Long random service keys,
  AES only and protected domain controllers are the answers.
- Between planets, delay counts as skew, revocation is slower still, and each
  planet needs its own realm.

## Further reading

- RFC 4120, *The Kerberos Network Authentication Service (V5)*, 2005, sections
  1.6 (limitations), 3 (the exchanges) and 7.5.1 (key usage numbers); RFC 4121
  for the GSS-API mechanism.
- RFC 3961 (the encryption framework), RFC 3962 (AES with SHA-1) and RFC 8009
  (AES with SHA-2, with the test vectors used in this chapter).
- RFC 4757 (RC4-HMAC) and RFC 8429 (deprecating triple-DES and RC4).
- RFC 4556 and RFC 8636 (PKINIT), RFC 6113 (FAST), RFC 9588 (SPAKE
  pre-authentication).
- Jennifer G. Steiner, Clifford Neuman and Jeffrey I. Schiller, "Kerberos: an
  authentication service for open network systems", USENIX Winter Conference,
  1988.
- Steven M. Bellovin and Michael Merritt, "Limitations of the Kerberos
  authentication system", *ACM Computer Communication Review*, 1990.
- Bill Bryant and Theodore Ts'o, "Designing an Authentication System: a
  Dialogue in Four Scenes", MIT, 1988, revised 1997: Kerberos's design told as
  a play, still the gentlest introduction.
- Tim Medin, "Attacking Microsoft Kerberos: Kicking the Guard Dog of Hades",
  DerbyCon, 2014.
- Will Schroeder and Lee Christensen, "Certified Pre-Owned: Abusing Active
  Directory Certificate Services", SpecterOps, 2021.
- Iliano Cervesato, Aaron D. Jaggard, Andre Scedrov, Joe-Kai Tsay and
  Christopher Walstad, "Breaking and fixing public-key Kerberos", 2006.
- MIT Kerberos documentation, `doc/admin/enctypes.rst` and
  `doc/admin/spake.rst`.
