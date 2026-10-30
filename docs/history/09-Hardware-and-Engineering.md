# Hardware and engineering

*From the 1940s to today: secure telephones and the first leaky
machines, chips built to hold keys, cryptography inside the processor,
side channels that let keys escape anyway, machines built to crack
ciphers, security keys that stop phishing, and quantum key distribution.*

Cryptography is mathematics, but it always runs on something: a rotor
machine, a smart card, a phone, a server. The previous pages were mostly
about algorithms. This one is about the machines, and about a recurring
discovery: a perfectly sound cipher can leak its key through the time it
takes, the power it draws, the sound it makes or the way a processor
guesses ahead. It is also about the hardware built to attack ciphers,
which has decided more than once how long a key needs to be.

| When | What |
|---|---|
| 1943 | SIGSALY, digital voice encryption with one-time key records; Bell Labs notices a cipher machine leaking |
| 1972 | the Atalla box, an early hardware security module for bank PINs |
| 1974–1979 | the smart card: Moreno's patent, Bull's microprocessor card |
| 1985 | Wim van Eck reads a computer screen from its radio emissions |
| 1991 | the GSM SIM card |
| 1996–1999 | Kocher's timing attack and differential power analysis |
| 1998 | Deep Crack finds a DES key in 56 hours |
| 1998–2008 | GSM's COMP128 and the MIFARE Classic transport card broken |
| 2004–2015 | TrustZone, TPMs, Apple's Secure Enclave, Intel SGX |
| 2010 | AES instructions arrive in mainstream Intel processors |
| 2013 | the first Bitcoin mining ASICs |
| 2014–2022 | U2F security keys, FIDO2 and passkeys |
| 1984–2017 | quantum key distribution: BB84, then a satellite link |
| 2018 | Spectre and Meltdown |

## From machines to electronics

### SIGSALY

The first digital voice encryption was built by Bell Labs for the US Army
and went into service in 1943, linking Washington and London. *SIGSALY*
turned speech into numbers with a vocoder, then added a random key to the
numbers, the key coming from phonograph records made in matched pairs and
used once, a [one-time pad](04-Telegraph-Age.md#vernam-and-the-one-time-pad)
on vinyl. Each terminal filled a large room and needed a team to run it.
Claude Shannon was consulted on its encryption, and Alan Turing studied
it on his 1943 visit to Bell Labs.

### The first side channel

In 1943 a Bell Labs engineer testing the 131-B2, a teleprinter encryption
mixer used by the US Army and Navy, noticed that every time the machine
stepped, a spike appeared on an oscilloscope across the lab. With some
work, the spikes revealed the *plaintext* being encrypted. The machine was
leaking through its electromagnetic emissions. The problem was rediscovered
by the CIA in 1951 and became the classified subject later code-named
TEMPEST: shielding equipment so it doesn't broadcast what it is doing.
NSA's own account of it, "TEMPEST: A Signal Problem", was declassified in
2007.

Outside the secret world, the Dutch researcher Wim van Eck showed in 1985
that the picture on an ordinary computer screen could be reconstructed
from its radio emissions with a modified television set, a few metres or
more away.

### Machines for the Cold War

NSA designed the encryption equipment used by the US government and its
allies, from the KW-26 teleprinter encryptor of the late 1950s, which
read its daily key from a punched card, to the STU-III secure telephone
of 1987, whose key lived in a plastic "crypto ignition key". By the 1970s
encryption had moved from rotors to transistors and then to chips, which
made the same ideas cheap enough for banks and, eventually, everyone.

## Keys in hardware

### Hardware security modules

A key stored on an ordinary computer can be copied by anyone who gets
control of it. A *hardware security module* (HSM) is a tamper-resistant
box that holds keys and does the cryptography itself, so the keys never
leave it. Mohamed Atalla's company built one of the first, the "Atalla
box", in the early 1970s, to check the PINs typed at cash machines; it is
often called the first HSM. IBM's 4758 coprocessor (1997) was the first
device certified to the highest level of the US government's FIPS 140-1
standard, which sets requirements for such modules (now FIPS 140-3).

HSMs now sit behind banks' payment networks, certificate authorities,
cloud key services and the internet's [DNSSEC](../protocols/DNSSEC.md)
root, whose keys are handled in filmed public ceremonies.

### Smart cards

The French inventor Roland Moreno patented a memory card in 1974, and in
1977 Michel Ugon at Bull designed a card with its own microprocessor,
which could keep a key inside and compute with it. France put chips in its
bank cards in the 1980s and 1990s. The GSM mobile phone system (1991)
gave every subscriber a *SIM*, a smart card holding a secret key shared
with the network. The international EMV standard (from the mid-1990s, by
Europay, Mastercard and Visa) made chip cards the norm for payments;
Britain switched to "chip and PIN" in the mid-2000s.

Small chips meant small ciphers, and some were weak. In 1998 Marc
Briceno, Ian Goldberg and David Wagner broke COMP128, the algorithm many
SIM cards used to prove their identity, and could clone the cards. GSM's
voice ciphers A5/2 and A5/1 fell in the following decade. In 2007–2008
researchers in Germany and the Netherlands reverse-engineered the
Crypto-1 cipher of the MIFARE Classic, the contactless card used by
transport systems such as London's Oyster and the Dutch OV-chipkaart, and
broke it. Each case was a secret, home-made cipher that failed once it
was examined, a lesson [Kerckhoffs](04-Telegraph-Age.md#kerckhoffss-rules)
would have recognised.

### TPMs and secure enclaves

From the 2000s, keys moved into chips inside ordinary computers and
phones.

- **TPMs.** The Trusted Computing Group (formed 2003) specified the
  *Trusted Platform Module*, a small chip on the motherboard that stores
  keys and records what software booted. TPM 2.0 appeared in 2014, and
  Windows 11 (2021) requires it. It is what lets BitLocker unlock a disk
  only if the machine hasn't been tampered with; see
  [disk encryption](../protocols/Disk-Encryption.md). In 2017 the ROCA
  flaw showed that RSA keys generated by a widely used Infineon library
  could be factored, affecting TPMs, security tokens and about 750,000
  Estonian ID cards.
- **Secure enclaves.** ARM's TrustZone (2004) split a processor into a
  normal world and a secure one. Apple's Secure Enclave (iPhone 5s, 2013)
  is a separate processor that holds fingerprint and face data and the
  keys that encrypt the phone. Intel's SGX (2015) let ordinary programs
  run code in protected memory, but a long series of attacks such as
  Foreshadow (2018) broke its promises, and Intel dropped it from its
  consumer processors. Cloud providers now offer whole encrypted virtual
  machines instead (AMD SEV, Intel TDX).

## Cryptography inside the processor

Running AES in software takes table lookups, which are slow and, as the
next section shows, leaky. In 2008 Intel announced *AES-NI*, six processor
instructions that perform AES rounds directly, and they shipped in its
Westmere processors in 2010, with a carry-less multiply instruction that
speeds up AES-GCM. AMD followed in 2011. ARM's 64-bit architecture added
AES and SHA instructions, and SHA-256 instructions reached Intel and AMD
chips in 2016–2017.

The effect was large. AES went from tens of cycles per byte to around one,
fast enough that encrypting everything stopped costing anything
noticeable, and the hardware runs in constant time, closing a whole class
of attacks. On phones without such instructions, Google switched to
[ChaCha20-Poly1305](../04-symmetric-ciphers/ChaCha.md), which is fast in
plain software.

Processors also gained random number generators. Intel's RDRAND (2012)
draws on electrical noise inside the chip. After the Snowden documents,
the Linux kernel's developers declined to rely on it alone and kept mixing
it with other sources, a caution that looked wise in 2019 when a bug in
some AMD processors made RDRAND return the same value every time. See the
[OS random number generator](../09-random/OS-RNG.md) page.

## Side channels

### Timing

In 1996 Paul Kocher, then a young independent consultant, showed that the time a
device took to do an RSA or Diffie–Hellman private-key operation depended
on the bits of the key, and that by timing many operations an attacker
could recover the key bit by bit. In 2003 David Brumley and Dan Boneh made
it work across a network against a real OpenSSL server. The fixes are
*blinding* (randomizing the input so timings tell nothing) and
*constant-time* code, which does the same operations in the same order
whatever the secret.

The same idea works on anything that stops early. This program checks a
secret code one character at a time and returns at the first mismatch,
the way a naive password or MAC comparison does. The attacker never sees
the secret, only how long each check takes, and the longest-running guess
is always the one with one more character right.

```python
import hmac, string

SECRET = "K7QX2M"                   # the server's secret code

def leaky_check(guess):
    # Compares one character at a time and stops at the first mismatch.
    # `steps` stands in for the time the check takes.
    steps = 0
    for a, b in zip(guess, SECRET):
        steps += 1
        if a != b:
            return False, steps
    return len(guess) == len(SECRET), steps

# The attacker never sees SECRET, only how long each check takes
known = ""
for position in range(len(SECRET)):
    timings = {}
    for ch in string.ascii_uppercase + string.digits:
        guess = (known + ch).ljust(len(SECRET), "-")
        ok, steps = leaky_check(guess)
        timings[ch] = (steps, ok)           # how long it took, and whether it worked
    known += max(timings, key=timings.get)  # the slowest guess got one more right
    print(known)

print(leaky_check(known)[0], "after", 36 * len(SECRET), "guesses instead of", f"{36 ** 6:,}")
print(hmac.compare_digest(known, SECRET))  # the fix: a comparison that takes the same time
```

Output:

```
K
K7
K7Q
K7QX
K7QX2
K7QX2M
True after 216 guesses instead of 2,176,782,336
True
```

216 guesses instead of two billion. Real timing differences are tiny and
noisy, so a real attack repeats each guess many times, but the principle is
exactly this. Python's `hmac.compare_digest` exists for this reason.

### Power, faults and sound

- **Power analysis.** In 1998 Kocher, Joshua Jaffe and Benjamin Jun showed
  that the power a smart card draws while computing reveals its key. A
  single trace can show the pattern of an RSA exponent (*simple power
  analysis*); averaging thousands of traces with statistics pulls out
  even well-hidden key bits (*differential power analysis*). Every
  payment card chip since has had to defend against it, usually by
  *masking*: splitting secrets into random shares that are never combined
  in one place.
- **Faults.** In 1997 Dan Boneh, Richard DeMillo and Richard Lipton
  showed that a single computing error during an RSA signature (made with
  the common Chinese Remainder shortcut) reveals the private key. Attackers
  can cause such errors with voltage glitches, lasers, or, as the 2014
  *Rowhammer* discovery showed, by hammering rows of ordinary memory until
  neighbouring bits flip.
- **Caches.** In 2005 Daniel J. Bernstein, and separately Dag Arne Osvik,
  Adi Shamir and Eran Tromer, showed that AES's table lookups leave traces
  in the processor cache that another program on the same machine can
  measure. That is one reason hardware AES and table-free software became
  standard.
- **Sound.** In 2013 Daniel Genkin, Shamir and Tromer extracted 4096-bit
  RSA keys from a laptop by recording the faint high-pitched noise its
  electronics made while decrypting.

### Spectre and Meltdown

Modern processors guess which way a program will go and run ahead
*speculatively*, undoing the work if they guessed wrong. On 3 January 2018
researchers disclosed that the undoing is incomplete: speculative work
leaves traces in the cache that can be measured, as in the cache attacks
above. *Meltdown* let ordinary programs read kernel memory; *Spectre* let
one program, or a web page's JavaScript, trick another into leaking its
secrets. They were found independently by Jann Horn of Google's Project
Zero, by Paul Kocher, and by teams at Graz University of Technology and
elsewhere. Almost every high-performance processor of the previous two
decades was affected by Spectre, and fixing it took changes to operating systems, browsers,
compilers and chip designs. Later variants kept coming, such as GoFetch
(2024), which broke constant-time cryptography on Apple's M-series chips
through a feature that prefetches memory.

The lesson of the side-channel era: a cipher's security proof covers the
mathematics, not the machine. Implementations now have to be designed,
and tested, to leak nothing through time, power or memory access.

## Machines that crack

### Deep Crack

The Electronic Frontier Foundation built *Deep Crack* in 1998 to settle an
argument. The US government still claimed that 56-bit [DES](06-Shannon-to-DES.md#des)
was secure enough for export, and that cracking it would need a
government budget. Working with Paul Kocher's company, Cryptography
Research, and Advanced Wireless Technologies, the EFF built a machine of
1,856 custom chips on 29 circuit boards for less than $250,000. It tested
about 90 billion keys a second and in July 1998 found the key to RSA's DES
Challenge in 56 hours. In January 1999, with help from distributed.net's
volunteers, it did it in 22 hours and 15 minutes.

The EFF also published the full design as a book, *Cracking DES*, printed
in a form that could be scanned back into a computer, because printed
books, unlike software, could legally be exported. Later machines made
the point cheaper still: COPACOBANA (2006), built by German universities
from 120 off-the-shelf programmable chips for about €10,000, searched the
DES key space in about a week.

### Graphics cards and passwords

From the late 2000s, graphics processors, built to do thousands of simple
calculations at once for games, turned out to be ideal for trying password
guesses. Tools such as hashcat made this routine. In 2012 the researcher
Jeremi Gosney showed a cluster of 25 graphics cards trying about 350
billion guesses a second against Windows' fast password hash, enough to try
every 8-character password in a few hours. This is why fast hashes like
MD5 or SHA-256 are wrong for passwords and slow, memory-hard ones like
[Argon2](../08-kdf-password-hashing/Argon2.md) and
[scrypt](../08-kdf-password-hashing/scrypt.md) are right. The
[FAQ](../FAQ.md#does-precomputing-password-hashes-work-yes-if-they-arent-salted)
explains why salting stops precomputed tables.

### Bitcoin's machines

Bitcoin's proof of work is a race to compute double SHA-256 hashes. Miners
moved from ordinary processors (2009) to graphics cards (2010), to
programmable chips (2011), and from 2013 to *ASICs*, chips that do nothing
but Bitcoin hashing. By the mid-2020s the network as a whole computed more
than 5 × 10²⁰ hashes a second. At that rate it performs 2⁸⁰ hashes, the
old security level of 80-bit keys and SHA-1's design strength, in under
an hour. Hardware built for one narrow job keeps showing how fast
yesterday's security margins disappear. See [Bitcoin](../protocols/Bitcoin.md).

## Security keys and passkeys

Passwords are easy to steal by phishing: a fake login page simply asks for
them. One-time codes from tokens like RSA's SecurID (1980s) and phone apps
using the HOTP (2005) and [TOTP](../protocols/TOTP.md) (2011) standards
helped, but a fake site can ask for the code too. In 2011 attackers broke
into RSA itself and stole data about its tokens' seeds, which was then used
against at least one defence contractor.

The fix was to let the device check the website. Yubico released its first
YubiKey in 2008, and Google and Yubico developed *U2F*, standardized by
the FIDO Alliance in 2014: a small key that signs a challenge with a
private key it never reveals, bound to the real website's name, so a
look-alike site gets a useless answer. FIDO2, with the W3C's WebAuthn
standard (2019), extended it to logins without passwords, and in 2022
Apple, Google and Microsoft committed to *passkeys*, the same credentials
kept in phones and synced between devices. Google reported in 2018 that
after it required security keys for its staff, none of their work
accounts had been phished. See [FIDO2 and passkeys](../protocols/FIDO2.md).

## Quantum key distribution

### BB84

In the late 1960s Stephen Wiesner, a graduate student at Columbia, had the
idea of using quantum physics to make banknotes impossible to copy. His
paper was rejected and only published in 1983, but it inspired Charles
Bennett of IBM and Gilles Brassard of the University of Montreal. In 1984
they described **BB84**, a way to agree on a key whose security rests on
physics instead of mathematics.

Alice sends single photons, each polarized in one of two *bases*:
straight (vertical or horizontal) or diagonal. Bob measures each photon in
a basis he picks at random. When his basis matches hers he reads her bit
correctly; when it doesn't, his result is a coin flip. Afterwards they
compare, in public, only which bases they used, and keep the bits where
the bases matched. An eavesdropper can't copy a photon (quantum physics
forbids it) and doesn't know the right basis either, so by measuring she
disturbs about a quarter of the bits Alice and Bob keep. They check a
sample: a high error rate means someone is listening.

```python
import random

rng = random.Random(1984)           # fixed seed so the run repeats

def bb84(n, eve=False):
    alice_bits = [rng.randint(0, 1) for _ in range(n)]
    alice_bases = [rng.choice("+x") for _ in range(n)]   # + straight, x diagonal
    photons = list(zip(alice_bits, alice_bases))

    if eve:                         # Eve measures each photon in a random basis
        resent = []
        for bit, basis in photons:  # and sends on what she saw
            guess = rng.choice("+x")
            seen = bit if guess == basis else rng.randint(0, 1)
            resent.append((seen, guess))
        photons = resent

    bob_bases = [rng.choice("+x") for _ in range(n)]
    bob_bits = [bit if basis == b else rng.randint(0, 1)    # wrong basis: a coin flip
                for (bit, basis), b in zip(photons, bob_bases)]

    # In public, they compare bases (never bits) and keep the matching ones
    keep = [i for i in range(n) if alice_bases[i] == bob_bases[i]]
    errors = sum(alice_bits[i] != bob_bits[i] for i in keep)
    return len(keep), errors

for eve in (False, True):
    kept, errors = bb84(2000, eve)
    print("Eve listening:" if eve else "No Eve:      ", kept, "bits kept,",
          errors, f"errors ({errors / kept:.0%})")
```

Output:

```
No Eve:       1011 bits kept, 0 errors (0%)
Eve listening: 996 bits kept, 256 errors (26%)
```

### From a table top to a satellite

Bennett, Brassard and colleagues sent the first quantum key across 32
centimetres of open air at IBM in 1989. Artur Ekert proposed a version
based on entangled photons in 1991. Companies such as ID Quantique, founded
in Geneva in 2001, sold fibre systems; Geneva used one in 2007 to send
election results. China built a 2,000-kilometre fibre link between Beijing
and Shanghai, with trusted relay stations along the way, and in 2016
launched the satellite *Micius*, which in 2017 helped set up a key for a
video call between Beijing and Vienna.

### Why agencies prefer post-quantum algorithms

QKD has real limits. It needs special hardware and dedicated fibre or line
of sight. Photons get lost, so links reach only about a hundred kilometres
without relays, and each relay must be trusted. It still needs an
authenticated classical channel, which means ordinary cryptography or a
pre-shared key, so it doesn't remove the need for the algorithms it is
meant to replace. And the hardware has been attacked: in 2010 researchers
in Norway blinded the detectors of commercial QKD systems with bright light
and took control of the key without raising the error rate.

For these reasons NSA does not recommend QKD for US national security
systems, Britain's National Cyber Security Centre does not endorse it for
government use, and in January 2024 the French, German, Dutch and Swedish
security agencies published a joint position recommending
post-quantum cryptography first. That story is on the last page of this
section.

## Engineering the software

The bugs on the [internet era](08-Internet-Era.md#famous-bugs) page pushed
the people who write cryptographic code to change how they work.

- **Libraries with safer interfaces.** Eric Young and Tim Hudson's SSLeay
  (1995) became OpenSSL in 1998, and for years nearly everyone used it,
  with all its sharp edges. Daniel J. Bernstein, Tanja Lange and Peter
  Schwabe's NaCl library (from 2008) and its descendant libsodium (2013)
  offered a handful of hard-to-misuse functions: "encrypt this", "sign
  this", with the dangerous choices made for you. After Heartbleed,
  Google started BoringSSL and OpenBSD started LibreSSL, and the Linux
  Foundation funded audits of critical projects.
- **Constant-time code** as a requirement, checked by tools, not hoped
  for.
- **Testing against known attacks.** Google's Project Wycheproof (2016)
  published thousands of test cases built from past attacks and found bugs
  in many major libraries; continuous fuzzing (OSS-Fuzz, 2016) runs
  random inputs against them around the clock.
- **Formal verification.** Machine-checked proofs of correctness reached
  production: the HACL* library's verified code ships in Firefox, and MIT's
  Fiat Cryptography generates the elliptic-curve arithmetic used in
  Chrome's BoringSSL. Amazon proved properties of its TLS library s2n.
- **Certification**, through FIPS 140 for government use and the
  international Common Criteria, slow and expensive but often required.

## What this era left behind

- **Keys in hardware** wherever possible: HSMs, smart cards, TPMs, secure
  enclaves, security keys.
- **Speed for free**, from AES and SHA instructions in every processor.
- **Side channels as a first-class threat**, and the rule that crypto code
  must not branch or look up memory based on secrets.
- **Cracking hardware as the measure of key length**: Deep Crack for DES,
  GPUs for passwords, ASICs for hashes.
- **Phishing-resistant login**, by binding credentials to the real site.
- **Quantum key distribution**, an elegant idea that agencies treat as a
  niche tool, while post-quantum algorithms do the main job.

## See also

- [Internet era](08-Internet-Era.md): the protocols and bugs of the same
  years
- [FIDO2 and passkeys](../protocols/FIDO2.md), [TOTP](../protocols/TOTP.md),
  [disk encryption](../protocols/Disk-Encryption.md): hardware-backed
  security in use today
- [AES](../04-symmetric-ciphers/AES.md),
  [OS random number generators](../09-random/OS-RNG.md): the parts that
  moved into the processor

## References

- NSA, "TEMPEST: A Signal Problem", *Cryptologic Spectrum* 2, no. 3 (1972; declassified 2007) / Wim van Eck, "Electromagnetic Radiation from Video Display Units: An Eavesdropping Risk?", *Computers & Security* 4 (1985), pp. 269–286
- Patrick D. Weadon, *SIGSALY: The Start of the Digital Revolution* (NSA Center for Cryptologic History) / J. V. Boone and R. R. Peterson, *SIGSALY: The Start of the Digital Revolution* (NSA, 2000)
- Paul C. Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS, and Other Systems" (CRYPTO '96) / Kocher, Jaffe and Jun, "Differential Power Analysis" (CRYPTO '99) / David Brumley and Dan Boneh, "Remote Timing Attacks Are Practical" (USENIX Security 2003)
- Dan Boneh, Richard A. DeMillo and Richard J. Lipton, "On the Importance of Checking Cryptographic Protocols for Faults" (EUROCRYPT '97) / Yoongu Kim et al., "Flipping Bits in Memory Without Accessing Them" (ISCA 2014)
- Daniel J. Bernstein, "Cache-timing attacks on AES" (2005) / Dag Arne Osvik, Adi Shamir and Eran Tromer, "Cache Attacks and Countermeasures: the Case of AES" (CT-RSA 2006) / Daniel Genkin, Adi Shamir and Eran Tromer, "RSA Key Extraction via Low-Bandwidth Acoustic Cryptanalysis" (CRYPTO 2014)
- Paul Kocher et al., "Spectre Attacks: Exploiting Speculative Execution" (IEEE S&P 2019) / Moritz Lipp et al., "Meltdown: Reading Kernel Memory from User Space" (USENIX Security 2018) / Boru Chen et al., "GoFetch: Breaking Constant-Time Cryptographic Implementations Using Data Memory-Dependent Prefetchers" (USENIX Security 2024)
- Electronic Frontier Foundation, *Cracking DES: Secrets of Encryption Research, Wiretap Politics and Chip Design* (O'Reilly, 1998) / Sandeep Kumar et al., "Breaking Ciphers with COPACOBANA" (CHES 2006)
- Shay Gueron, *Intel Advanced Encryption Standard (AES) New Instructions Set* (Intel white paper, 2010)
- Matúš Nemec et al., "The Return of Coppersmith's Attack: Practical Factorization of Widely Used RSA Moduli" (ROCA, CCS 2017) / Flavio D. Garcia et al., "Dismantling MIFARE Classic" (ESORICS 2008) / Karsten Nohl et al., "Reverse-Engineering a Cryptographic RFID Tag" (USENIX Security 2008)
- W3C, *Web Authentication: An API for accessing Public Key Credentials, Level 1* (Recommendation, March 2019) / FIDO Alliance, U2F and CTAP specifications
- Stephen Wiesner, "Conjugate Coding", *SIGACT News* 15, no. 1 (1983) / Charles H. Bennett and Gilles Brassard, "Quantum Cryptography: Public Key Distribution and Coin Tossing" (Bangalore, 1984) / Bennett et al., "Experimental Quantum Cryptography", *Journal of Cryptology* 5 (1992) / Artur K. Ekert, "Quantum Cryptography Based on Bell's Theorem", *Physical Review Letters* 67 (1991) / Lydersen et al., "Hacking Commercial Quantum Cryptography Systems by Tailored Bright Illumination", *Nature Photonics* 4 (2010)
- ANSSI, BSI, NLNCSA and Swedish Armed Forces, *Position Paper on Quantum Key Distribution* (January 2024)

*Weaker sources:* search summaries and encyclopedia articles for the Atalla box (1972, "first HSM"), IBM 4758's FIPS rating, the SIM, EMV and chip-and-PIN dates, COPACOBANA's price and speed, Gosney's 2012 cluster, Bitcoin's hash rate, Micius and the Beijing–Shanghai link; Brian Krebs's 2018 report of Google's statement on security keys; the NSA and NCSC positions on QKD as quoted in a 2022 BSI workshop presentation; the AMD RDRAND bug (2019) and SGX's removal from consumer chips from news reports.
