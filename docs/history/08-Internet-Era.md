# The internet era

*From 1994 to the mid-2020s: encryption for every web page and login, an
open competition that chose AES, hash functions that broke, famous bugs,
the Snowden revelations, free certificates for everyone, and end-to-end
encryption for billions of messages.*

When the web took off in the mid-1990s, almost nothing on it was
encrypted. Thirty years later almost everything is. Getting there took
new protocols, new ciphers and hashes chosen in public competitions, and
a long series of painful lessons: most real-world breaks came not from
the mathematics but from protocol design, implementation bugs and bad
randomness. This page tells that story. The quantum part of it, which
overlaps the last decade here, is on the [last page](10-Quantum-and-Post-Quantum.md).

| When | What |
|---|---|
| 1995 | SSL 2.0 in Netscape Navigator; Tatu Ylönen writes SSH |
| 1996 | SSL 3.0 |
| 1997–2001 | the AES competition; Rijndael becomes AES |
| 1998 | Bleichenbacher's "million message" attack on RSA encryption |
| 1999 | TLS 1.0; OpenSSH |
| 2004–2005 | MD5 collisions; a theoretical attack on SHA-1 |
| 2004–2016 | Off-the-Record messaging, then the Signal protocol |
| 2008 | the Debian OpenSSL bug; a rogue certificate authority made with MD5 |
| 2008–2009 | Bitcoin |
| 2011 | DigiNotar hacked; fake Google certificates used in Iran |
| 2012 | SHA-3 chosen (Keccak) |
| 2013 | the Snowden documents; the Dual_EC_DRBG backdoor, all but confirmed |
| 2014 | Heartbleed; POODLE |
| 2015 | Let's Encrypt issues its first certificates; Logjam and FREAK |
| 2016 | WhatsApp turns on end-to-end encryption for a billion users |
| 2017 | SHAttered: the first SHA-1 collision |
| 2018 | TLS 1.3; Spectre and Meltdown |

## Encrypting the web

### SSL at Netscape

In 1994 Netscape, the company behind the first popular commercial web
browser, wanted people to type credit-card numbers into web pages. Its
engineers, Kipp Hickman among them, designed the *Secure Sockets Layer*;
the cryptographer Taher Elgamal, Netscape's chief scientist from 1995, is
often called its father. Version 1.0 was never released.
SSL 2.0 shipped in Netscape Navigator in 1995 and had serious flaws: it
used the same key for encryption and integrity, and an attacker could
quietly downgrade a connection to weaker ciphers. SSL 3.0, redesigned in
1996 by Paul Kocher with Netscape's Phil Karlton and Alan Freier, fixed
most of them.

Its basic plan survives today. The browser and server exchange random
values, the server proves its identity with a certificate, the two agree
on a session key using public-key cryptography (at first usually by the
browser encrypting a random secret to the server's [RSA](../02-signatures/RSA.md)
key), and from then on everything is encrypted with a fast
[symmetric cipher](../04-symmetric-ciphers/AES.md) and protected with a
[MAC](../06-mac/HMAC.md).

### From SSL to TLS 1.3

The Internet Engineering Task Force took over the protocol and renamed it
*Transport Layer Security*: TLS 1.0 in 1999 (RFC 2246), 1.1 in 2006, 1.2 in
2008. Each version patched attacks found against the last. Two of the most
important came from cryptographers studying the details:

- **Bleichenbacher (1998).** Daniel Bleichenbacher showed that a server
  which reveals, even indirectly, whether an RSA-encrypted message had
  valid padding lets an attacker decrypt a session by sending about a
  million carefully altered messages. The fix was to hide the error,
  which was hard to get right; the same attack came back in 2017 as ROBOT
  against many big websites.
- **Padding oracles (2002).** Serge Vaudenay showed the same kind of leak
  in the way CBC mode was padded. It returned as Lucky Thirteen (2013),
  which used tiny timing differences, and POODLE (2014), which finished
  off SSL 3.0.

Export rules left their own damage. The 40-bit and 512-bit "export grade"
options of the 1990s (see the [crypto wars](07-Public-Key.md#the-crypto-wars))
stayed in many servers long after the rules changed. In 2015 the FREAK
and Logjam attacks tricked browsers and servers into using them, and
Logjam's authors estimated that a nation-state could break the most
common 1024-bit Diffie–Hellman groups.

TLS 1.3, published in August 2018 as RFC 8446 after four years of open
design with academic analysts checking each draft, cut out everything that
had caused trouble: RSA key transport, CBC mode, compression, static
Diffie–Hellman, renegotiation. Every full handshake now uses ephemeral
Diffie–Hellman, so recorded traffic stays safe even if the server's key is
later stolen (*forward secrecy*), and the handshake takes one round trip
instead of two. The [TLS 1.3 page](../protocols/TLS-1.3.md) shows what it
runs today.

### SSH

In 1995 a password-sniffing attack on the network of the Helsinki
University of Technology prompted a researcher there, Tatu Ylönen, to
write a secure replacement for the old remote-login tools, which sent
passwords in the clear. He released *SSH* (Secure Shell) as free software
that July, and it spread to tens of thousands of users within months.
When later versions became commercial, the OpenBSD project built a free
version, **OpenSSH**, released in 1999. The IETF published the SSH-2
protocol as RFCs 4251–4254 in 2006. The [SSH page](../protocols/SSH.md)
covers the protocol and its keys.

### Certificates and the trust problem

TLS depends on certificate authorities (CAs): companies that browsers
trust to vouch that a key belongs to a domain. That trust was abused more
than once. In 2011 an attacker broke into DigiNotar, a Dutch CA, and
issued fake certificates including one for `*.google.com`, which was used
to intercept Gmail users in Iran. Browsers removed DigiNotar, and the
company went bankrupt within weeks. Google's answer was *Certificate
Transparency* (RFC 6962, 2013): every certificate must be logged in
public, append-only logs, so a fake one can be spotted. Browsers now
require it. The [PKI page](../protocols/PKI.md) explains how the system
fits together.

### Let's Encrypt and HTTPS everywhere

In 2015 roughly half of web page loads were still unencrypted, partly
because certificates cost money and were tedious to install. The Internet
Security Research Group, a non-profit founded by people from Mozilla, the
EFF and the University of Michigan, launched **Let's Encrypt**: free,
automatically renewed certificates. It issued its first certificate in
September 2015, opened to the public that December, and standardized its
issuing protocol, ACME, as RFC 8555 in 2019. Within a few years it was the
largest CA in the world. In 2018 Chrome began labelling every plain-HTTP
page "Not secure". Today the large majority of web traffic is encrypted.

## AES: a cipher chosen in public

### The competition

By the mid-1990s DES was clearly finished, and Triple DES was slow. In
January 1997 NIST announced that it would choose the *Advanced Encryption
Standard* by open competition, a deliberate break with the closed process
behind DES. Any team in the world could submit a cipher with a 128-bit
block and keys of 128, 192 and 256 bits; every submission would be
published; anyone could attack them.

Fifteen candidates from twelve countries were presented in August 1998.
In August 1999 NIST named five finalists: MARS (IBM), RC6 (RSA
Laboratories), Rijndael (Joan Daemen and Vincent Rijmen, from Belgium),
Serpent (Ross Anderson, Eli Biham and Lars Knudsen) and Twofish (Bruce
Schneier's team). After three public conferences and years of analysis,
NIST chose **Rijndael** on 2 October 2000. It was fast in software and
hardware alike, simple to analyse, and had a comfortable security margin.
FIPS 197 was published on 26 November 2001.

In 2003 NSA approved AES for classified information, up to Top Secret
with 192- or 256-bit keys. Twenty-five years on, the best attacks on the
full cipher are barely faster than brute force. The open process worked
so well that NIST has used it for several major choices since,
including SHA-3 and the post-quantum algorithms. The [AES page](../04-symmetric-ciphers/AES.md)
explains how the cipher works.

### Stream ciphers and AEAD

The 2000s also brought new designs for speed. Europe's eSTREAM project
(2004–2008) picked a portfolio of stream ciphers, including Daniel J.
Bernstein's Salsa20; his ChaCha variant (2008), paired with the Poly1305
MAC, became the cipher Google used for phones without AES hardware, an
OpenSSH option from 2014 and a TLS standard (RFC 7905) in 2016. At the
same time, protocol designers
learned that encryption and integrity should come in one package, an
*authenticated encryption* mode such as AES-GCM (2004). See
[ChaCha](../04-symmetric-ciphers/ChaCha.md) and [AEAD](../05-modes-aead/AEAD.md).

## Hash functions break

### MD5 and SHA-1

A hash function turns any input into a short fingerprint, and it must be
infeasible to find two inputs with the same fingerprint (a *collision*).
Ron Rivest's MD5 (1992) and NSA's SHA-1 (1995) were the workhorses of the
1990s, used for signatures, certificates, software downloads and
passwords.

The *birthday paradox* sets the limit for any hash: with an *n*-bit output,
a collision is expected after about 2^(*n*/2) tries, not 2^*n*. In a room of 23
people, two probably share a birthday. This program finds collisions in a
deliberately short hash, cut down from SHA-256.

```python
import hashlib

def short_hash(data, bits):
    # the first `bits` bits of SHA-256: a deliberately tiny hash
    return int.from_bytes(hashlib.sha256(data).digest(), "big") >> (256 - bits)

for bits in (16, 24, 32, 40):
    seen = {}
    n = 0
    while True:
        h = short_hash(n.to_bytes(8, "big"), bits)
        if h in seen:
            break
        seen[h] = n
        n += 1
    print(f"{bits}-bit hash: inputs {seen[h]} and {n} collide after {n + 1:,} tries;",
          f"2^{bits // 2} = {2 ** (bits // 2):,}")
```

Output:

```
16-bit hash: inputs 296 and 310 collide after 311 tries; 2^8 = 256
24-bit hash: inputs 5506 and 7967 collide after 7,968 tries; 2^12 = 4,096
32-bit hash: inputs 50799 and 58968 collide after 58,969 tries; 2^16 = 65,536
40-bit hash: inputs 98759 and 1179000 collide after 1,179,001 tries; 2^20 = 1,048,576
```

So a 128-bit hash like MD5 can never offer more than about 2⁶⁴ collision
resistance, and SHA-1's 160 bits give 2⁸⁰. Cryptanalysis cut far below
those numbers.

- **MD5.** Hans Dobbertin found collisions in its compression function in
  1996. In August 2004 Wang Xiaoyun of Shandong University and her
  colleagues announced full MD5 collisions, found in hours. In December
  2008 a team led by Marc Stevens, Alexander Sotirov and Jacob Appelbaum
  used a cluster of about 200 PlayStation 3 consoles to make an MD5
  collision between an ordinary certificate and a rogue CA certificate
  that browsers would have trusted. In 2012 the Flame espionage malware
  turned out to have used a new MD5 collision to forge a Microsoft
  code-signing certificate.
- **SHA-1.** In February 2005 Wang's team showed how to find SHA-1
  collisions in about 2⁶⁹ operations, far below 2⁸⁰. NIST told agencies to
  move to SHA-2. The first actual collision, *SHAttered*, came on
  23 February 2017 from CWI Amsterdam and Google: two different PDF files
  with the same SHA-1, after about 2⁶³ computations. In 2020 Gaëtan
  Leurent and Thomas Peyrin made a chosen-prefix collision with about two
  months of rented graphics cards, costing them about $75,000; they
  estimated $45,000 at cheaper rental prices.

The details of both breaks, and where the old hashes linger, are on the
[retired hashes page](../07-hash/Retired.md).

### SHA-2 and SHA-3

NSA's SHA-2 family (2001) shares SHA-1's general design but is much
stronger, and no practical attack is known; [SHA-256](../07-hash/SHA-2.md)
is now the default nearly everywhere. Worried that an attack on SHA-1 might
carry over, NIST ran another open competition from 2007. It drew 64
entries and in October 2012 chose **Keccak**, by Guido Bertoni, Joan
Daemen, Michaël Peeters and Gilles Van Assche, which works in a completely
different way. It became [SHA-3](../07-hash/SHA-3.md) in 2015. A finalist,
BLAKE, lives on as [BLAKE2 and BLAKE3](../07-hash/BLAKE.md).

### Passwords

Storing passwords safely turned out to be its own problem. Robert Morris
and Ken Thompson's 1979 paper on Unix passwords had already introduced a
random *salt* and a deliberately slow hash. Many websites ignored both:
in 2012 about 6.5 million LinkedIn password hashes, unsalted SHA-1, were
posted online and largely cracked within days. The fixes are functions
designed to be slow and memory-hungry, from [bcrypt](../08-kdf-password-hashing/bcrypt.md)
(1999) and [PBKDF2](../08-kdf-password-hashing/PBKDF2.md) (2000) to
[scrypt](../08-kdf-password-hashing/scrypt.md) (2009) and
[Argon2](../08-kdf-password-hashing/Argon2.md), which won the open
Password Hashing Competition in 2015.

## Famous bugs

The mathematics held up far better than the code around it.

### Debian's OpenSSL, 2006–2008

In 2006 a Debian developer removed two lines from Debian's copy of OpenSSL
because a memory-checking tool complained about them. They turned out to
be the lines that mixed unpredictable data into the random number
generator. For two years, every SSH key, TLS key and certificate request
made on Debian and Ubuntu systems came from a generator whose only
unpredictable input was the process ID, a number below 32,768. Luciano
Bello found it in May 2008. Every affected key had to be thrown away. The
[retired random generators page](../09-random/Retired.md#debian-openssl-2008)
has the details.

```python
import hashlib

# Debian's OpenSSL, 2006-2008: the only unpredictable input to key
# generation was the process ID, a number from 1 to 32,767.
def make_key(pid):
    return hashlib.sha256(b"debian" + pid.to_bytes(2, "big")).hexdigest()[:16]

victim = make_key(23456)            # a key made on some server
print("victim's key:", victim)

# The attacker makes every possible key and looks for a match
table = {make_key(pid): pid for pid in range(1, 32768)}
print(len(table), "possible keys; this one came from PID", table[victim])
```

Output:

```
victim's key: a48c5de1c2de00fc
32767 possible keys; this one came from PID 23456
```

### Shared primes, 2012

In 2012 two teams, one led by Arjen Lenstra and one by Nadia Heninger,
collected millions of RSA public keys from the internet and found that
tens of thousands of them shared a prime factor with some other key.
Most came from routers and other small devices that generated keys right
after booting, before their random generators had gathered any
unpredictability. Two keys that share a prime can both be factored at
once with Euclid's 2,300-year-old algorithm for the greatest common
divisor.

```python
from math import gcd

# Three primes (all Mersenne primes, so anyone can check them)
p = 2 ** 127 - 1
q1 = 2 ** 89 - 1
q2 = 2 ** 107 - 1

# Two devices made RSA keys with a bad random generator and picked the same p
n1, n2 = p * q1, p * q2
print(n1.bit_length(), n2.bit_length(), "bit moduli")

g = gcd(n1, n2)                     # Euclid's algorithm: instant, no factoring needed
print(g == p, n1 // g == q1, n2 // g == q2)
```

Output:

```
216 234 bit moduli
True True True
```

Both stories are about the same thing: cryptography needs good
randomness, and computers are not naturally random. See the
[OS random number generator](../09-random/OS-RNG.md) page.

### Heartbleed, 2014

On 7 April 2014 OpenSSL disclosed a bug in its implementation of the TLS
"heartbeat" extension, found independently by Neel Mehta of Google and
by the Finnish firm Codenomicon. A client could send a heartbeat claiming
to contain, say, 64 kilobytes of data while actually sending one byte,
and the server would reply with 64 kilobytes of whatever happened to be
in its memory: passwords, session cookies, even private keys. The bug
had been in OpenSSL for two years. Estimates of how many secure web
servers were affected range from Netcraft's 17% to 24–55% of the most
popular HTTPS sites in Durumeric and colleagues' measurements. Heartbleed, one of the first bugs
with its own name and logo, showed how much of the internet rested on one
under-funded open-source library. Funding followed, and so did forks:
Google's BoringSSL and OpenBSD's LibreSSL.

Other famous failures of the decade include Apple's "goto fail" bug
(2014), in which one duplicated line of code skipped the check of the
server's key-exchange signature, so an attacker could pose as a site with
its real certificate but without its private key, and the 2010 discovery that Sony's PlayStation 3 signed its software
with [ECDSA](../02-signatures/ECDSA.md) using the same random number every
time, which revealed its private key.

## Snowden and Dual_EC_DRBG

### A backdoored random number generator

In 2006 NIST published a standard, SP 800-90, with four ways to generate
random numbers. One of them, *Dual_EC_DRBG*, pushed by NSA, was strange:
it was far slower than the others and used two
elliptic-curve points whose origin was never explained. In 2007 Dan
Shumow and Niels Ferguson of Microsoft pointed out that anyone who knew a
secret relationship between the two points could predict its output from
a small sample, which is to say, it could hide a backdoor. Most experts
assumed nobody would use it.

### The documents

In June 2013 Edward Snowden, a contractor for NSA, gave journalists a vast
archive of classified documents. They described programs that collected
internet and phone data on a huge scale, often by tapping the links
between companies' data centres, where traffic travelled unencrypted. In
September 2013 *The New York Times*, *The Guardian* and *ProPublica*
reported on NSA's decryption program, Bullrun, and on a budget request
for a related "SIGINT Enabling Project" to "insert vulnerabilities into
commercial encryption systems". The *Times* said the documents appeared to
confirm the Dual_EC backdoor; NSA has never acknowledged it.

The consequences:

- NIST withdrew Dual_EC_DRBG in 2014 and reviewed how it worked with NSA.
- Reuters reported that RSA Security had made Dual_EC the default in its
  widely used BSAFE library under a $10 million contract with NSA, which
  RSA denied knowingly weakening.
- In December 2015 Juniper Networks found unauthorized code in its
  firewalls. Juniper's products used Dual_EC with a point Q of its own,
  never explained; the intruders, years earlier, had replaced that Q with
  one of their choosing, turning the generator into their own backdoor.
- Tech companies encrypted the links between their data centres, turned on
  forward secrecy, and accelerated HTTPS. The IETF declared that
  "pervasive monitoring is an attack" (RFC 7258, 2014).

The episode is the modern version of the [DES S-box](06-Shannon-to-DES.md#two-suspicions)
suspicion, except that this time the suspicion was almost certainly
right, though never officially confirmed. It is why new
standards now explain where every constant comes from. The full technical
story is on the [retired random generators page](../09-random/Retired.md#dual_ec_drbg).

## End-to-end encryption

### From OTR to Signal

TLS protects data on its way to a server, but the server can read it. For
messaging, cryptographers wanted *end-to-end* encryption: only the people
in the conversation hold the keys. In 2004 Nikita Borisov, Ian Goldberg and
Eric Brewer designed *Off-the-Record* messaging (OTR), with forward
secrecy and deniability for instant messages.

Moxie Marlinspike and Stuart Anderson released the TextSecure app in 2010.
In 2013 Marlinspike and Trevor Perrin designed the ratchet now called the
*Double Ratchet*, which updates the keys with every message so that a key
stolen today exposes neither past messages nor, after a few more
messages, future ones. The phone apps merged as **Signal** in 2014–2015, and
the protocol was licensed to others. WhatsApp completed its switch to the
Signal protocol in April 2016, giving end-to-end encryption to more than
a billion people at once. Facebook Messenger, Google Messages and Skype
followed in some form, and in 2023 the IETF published Messaging Layer
Security (MLS) for large groups. See the [Signal](../protocols/Signal.md)
and [MLS](../protocols/MLS.md) pages.

### The second crypto war

Strong encryption on phones and in messaging revived the argument from the
1990s. In 2014 Apple, and soon Google, began encrypting phones by
default with keys they couldn't recover. In 2016, after the San Bernardino shooting,
the FBI obtained a court order demanding that Apple write software to
unlock the attacker's iPhone; Apple refused, and the FBI dropped the case
after a third party got into the phone. A 2015 paper by fifteen leading
security experts, "Keys Under Doormats", argued that any built-in access
for governments would weaken security for everyone. Laws in Britain and
Australia since have given governments powers to demand technical help,
and in February 2025 Apple withdrew its strongest iCloud encryption for
new users in the UK, reportedly in response to a secret government order
to build a way in. The argument is still
open.

## Money and other new uses

Cryptography also found uses no one had planned for. David Chaum's [blind
signatures](../02-signatures/Blind-Signatures.md) (1982) led to his DigiCash
company in the 1990s, anonymous electronic cash that failed commercially.
In October 2008 someone using the name Satoshi Nakamoto published a paper
describing **Bitcoin**, and the network started in January 2009. It
combines [SHA-256](../07-hash/SHA-2.md), [ECDSA](../02-signatures/ECDSA.md)
signatures on the curve secp256k1 and a public ledger kept honest by
proof of work; the [Bitcoin page](../protocols/Bitcoin.md) has the details.

Ideas from academic theory reached practice too: [zero-knowledge
proofs](../11-advanced/Zero-Knowledge.md) (Goldwasser, Micali and Rackoff,
1985) in cryptocurrencies, [secret sharing](../11-advanced/Secret-Sharing.md)
(Shamir, 1979) in key backup, [secure multiparty
computation](../11-advanced/MPC.md) (Yao, 1982) and Craig Gentry's first
fully [homomorphic encryption](../11-advanced/Homomorphic-Encryption.md)
scheme (2009), which can compute on data without decrypting it.

## Can these be broken today?

The algorithms chosen in public in this era still stand. What broke was
everything around them: old versions, short hashes, bad randomness and
plain bugs.

| What | Broken today? | The attack in plain words |
|---|---|---|
| SSL 2.0 and 3.0 | yes | Padding oracles (POODLE, 2014) and weak export options. Servers and browsers have removed them. |
| TLS 1.0 and 1.1 | retired | No single fatal break, but they depend on MD5 and SHA-1 and CBC padding. RFC 8996 (2021) deprecated both. |
| TLS 1.2 set up well, and TLS 1.3 | no | No practical attack on the protocol itself. TLS 1.3 removed the options the old attacks used. |
| RSA encryption with PKCS #1 v1.5 padding | where the server leaks | A server that reveals bad padding is a Bleichenbacher oracle: about a million altered messages decrypt a session (ROBOT, 2017). |
| AES | no | The best attack on the full cipher is only about four times faster than trying every key. |
| AES-GCM, ChaCha20-Poly1305 | no, if nonces never repeat | Reuse a nonce and the keystream and the authentication key leak, as on the [AEAD page](../05-modes-aead/AEAD.md). |
| MD5 | yes, in seconds | Collisions on a laptop; chosen-prefix collisions forged a CA certificate in 2008 and Flame's code-signing certificate in 2012. |
| SHA-1 | yes, with money | A first collision in 2017 (SHAttered); a chosen-prefix collision in 2020 that cost about $45,000 of rented GPUs. |
| SHA-2, SHA-3 | no | No practical attack on either. |
| Unsalted fast password hashes | yes | Graphics cards try billions of guesses a second, and one table of guesses works for every account. |
| Debian's broken OpenSSL keys | yes, instantly | Only 32,767 keys of each type existed. List them all and look the key up, as the program above does. |
| RSA keys that share a prime | yes, instantly | One greatest-common-divisor step between two keys splits both. |
| Dual_EC_DRBG | for whoever holds the secret | With the hidden number behind the two points, about 32 bytes of output predict everything after. Without it, no attack is known. |

## What the internet era left behind

- **Encryption by default** for web traffic, messaging and phones.
- **Open competitions** (AES, SHA-3, password hashing, and later
  post-quantum) as the way to choose algorithms.
- **Protocols analysed with proofs**, as TLS 1.3 was during its design and
  Signal soon after, instead of patched after each attack.
- **The lesson that implementation is where things break**: padding
  oracles, Heartbleed, bad randomness, nonce reuse.
- **Distrust of unexplained constants**, after Dual_EC.
- **A new threat on the horizon**: quantum computers, and the
  [race to replace](10-Quantum-and-Post-Quantum.md) the public-key
  algorithms this whole era was built on.

## See also

- [TLS 1.3](../protocols/TLS-1.3.md), [SSH](../protocols/SSH.md),
  [Signal](../protocols/Signal.md), [PKI](../protocols/PKI.md): the protocols
  as they run today
- [Retired hashes](../07-hash/Retired.md) and
  [retired random generators](../09-random/Retired.md): the failures in
  detail
- [Hardware and engineering](09-Hardware-and-Engineering.md): the chips,
  side channels and cracking machines of the same years

## References

- Kipp E. B. Hickman, "The SSL Protocol" (Netscape, 1995) / A. Freier, P. Karlton and P. Kocher, RFC 6101, *The Secure Sockets Layer (SSL) Protocol Version 3.0* (historic, 2011) / T. Dierks and C. Allen, RFC 2246, *TLS 1.0* (1999) / E. Rescorla, RFC 8446, *TLS 1.3* (2018)
- Daniel Bleichenbacher, "Chosen Ciphertext Attacks Against Protocols Based on the RSA Encryption Standard PKCS #1" (CRYPTO '98) / Serge Vaudenay, "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002) / Böck, Somorovsky and Young, "Return Of Bleichenbacher's Oracle Threat (ROBOT)" (USENIX Security 2018) / Adrian et al., "Imperfect Forward Secrecy: How Diffie-Hellman Fails in Practice" (CCS 2015)
- [RFC 8996: Deprecating TLS 1.0 and TLS 1.1](https://www.rfc-editor.org/rfc/rfc8996) (2021) / Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger, "Biclique Cryptanalysis of the Full AES" (ASIACRYPT 2011)
- Tatu Ylönen, "SSH: Secure Login Connections over the Internet" (USENIX Security 1996) / RFC 4251–4254 (2006)
- B. Laurie, A. Langley and E. Kasper, RFC 6962, *Certificate Transparency* (2013) / Fox-IT, *DigiNotar Certificate Authority Breach "Operation Black Tulip"* (2011) / Aas et al., "Let's Encrypt: An Automated Certificate Authority to Encrypt the Entire Web" (CCS 2019) / RFC 8555, *ACME* (2019)
- NIST, *Report on the Development of the Advanced Encryption Standard (AES)* (October 2000) / FIPS 197 (2001) / Joan Daemen and Vincent Rijmen, *The Design of Rijndael* (Springer, 2002) / CNSS Policy No. 15 (2003)
- Wang Xiaoyun and Yu Hongbo, "How to Break MD5 and Other Hash Functions" (EUROCRYPT 2005) / Wang, Yin and Yu, "Finding Collisions in the Full SHA-1" (CRYPTO 2005) / Stevens et al., "Short Chosen-Prefix Collisions for MD5 and the Creation of a Rogue CA Certificate" (CRYPTO 2009) / Stevens et al., "The First Collision for Full SHA-1" (CRYPTO 2017) / Leurent and Peyrin, "SHA-1 Is a Shambles" (USENIX Security 2020)
- NIST, *Third-Round Report of the SHA-3 Cryptographic Hash Algorithm Competition* (NIST IR 7896, 2012) / FIPS 202 (2015) / Robert Morris and Ken Thompson, "Password Security: A Case History", *Communications of the ACM* 22, no. 11 (1979)
- Debian Security Advisory DSA-1571-1 (13 May 2008) / Heninger, Durumeric, Wustrow and Halderman, "Mining Your Ps and Qs" (USENIX Security 2012) / Lenstra et al., "Ron Was Wrong, Whit Is Right" (IACR ePrint 2012/064) / OpenSSL Security Advisory, CVE-2014-0160 (7 April 2014) / Durumeric et al., "The Matter of Heartbleed" (IMC 2014)
- Dan Shumow and Niels Ferguson, "On the Possibility of a Back Door in the NIST SP800-90 Dual Ec Prng" (CRYPTO 2007 rump session) / Checkoway et al., "On the Practical Exploitability of Dual EC in TLS Implementations" (USENIX Security 2014) / Checkoway et al., "A Systematic Analysis of the Juniper Dual EC Incident" (CCS 2016) / S. Farrell and H. Tschofenig, RFC 7258 (2014)
- Borisov, Goldberg and Brewer, "Off-the-Record Communication, or, Why Not To Use PGP" (WPES 2004) / Trevor Perrin and Moxie Marlinspike, *The Double Ratchet Algorithm* (Signal, 2016) / Cohn-Gordon et al., "A Formal Security Analysis of the Signal Messaging Protocol" (EuroS&P 2017) / RFC 9420, *MLS* (2023)
- Abelson et al., "Keys Under Doormats: Mandating Insecurity by Requiring Government Access to All Data and Communications" (MIT CSAIL Technical Report, July 2015)
- Satoshi Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System" (2008) / David Chaum, "Blind Signatures for Untraceable Payments" (CRYPTO '82) / Craig Gentry, "Fully Homomorphic Encryption Using Ideal Lattices" (STOC 2009)

*Weaker sources:* news reports for the share of servers hit by Heartbleed, the LinkedIn breach numbers, the Reuters report on RSA's $10 million contract, WhatsApp's April 2016 announcement and the FBI–Apple case; search summaries of reporting on Apple's February 2025 withdrawal of Advanced Data Protection in the UK and the still-unsettled legal challenge; HTTPS share figures from browser telemetry as reported in the press.
